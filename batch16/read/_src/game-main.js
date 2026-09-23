/* ================= read 主逻辑（短文卡渲染 / 点选选项卡 / 听读 / 教学 / 救援 / 推进）
   玩法（SPEC §1）：短文卡（2-3 句，可点「听读」逐句朗读——rd_s_ 预合成 clip 174 句全族，
   T46 拆段；缺 clip 回退 TTS）+ 问句条 + 3 选项卡。点对=短文卡打勾收起+下一题；点错=晃动零惩罚可重点+
   短文关键句高亮一下（提示回看哪里）。
   救援 14s（§0.21）：题句重读+正确选项卡 breathe。
   §0.7a 口径：点选项卡=主交互（点对重置救援钟/错点不重置）；听读/点句跟读/重听题面
   =主动学习动作重置；点兔子/空白=探索不重置。
   §0.26 晃动窗防重入 + 身份守卫（const run=cur，await 后 cur!==run 丢弃旧续体）。
   验收钩子：window.RD = { get currentLevel, get quiz, tapOption(i), hearPassage(),
   start(flat), async autoSolve(), get tutorial, get rescues }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3 播）；救援/开场/读题/教学不受 flat 门（§0.5） */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播 / flat≥3 10s 节流+豁免恰一次（§0.5，不灰化款 miss===2） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 题句=queue 拼接（§0.23）：段 clip 全在场走 queue；缺任一段整句 TTS 兜底 */
function sayParts(segs, fullText) {
  if (KIDS.voice.clips && segs.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(segs);
  else KIDS.voice.say(fullText);
}
/* 答对确认语音：ch1/2/4=选项词 clip+rd_right 两段 queue；ch3 无词 clip 只播 rd_right */
function confirmSpeak(q, idx) {
  const segs = q.optKeys[idx] ? [q.optKeys[idx], VOICE.right.key] : [VOICE.right.key];
  const full = q.optKeys[idx] ? q.options[idx] + '，' + VOICE.right.text : VOICE.right.text;
  sayParts(segs, full);
}

const stageEl = $id('stage'), tipEl = $id('tip'), tipIcoEl = $id('tip-ico'), tipTextEl = $id('tip-text'),
      pcardEl = $id('pcard'), passageEl = $id('passage'), pcheckEl = $id('pc-check'),
      cardsEl = $id('cards'), ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, hearing: false };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重听题面 3s 节流
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardsEl.querySelector('.card[data-i="' + i + '"]');
const sentEl = i => passageEl.querySelector('.psent[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearBreathe();
  pcardEl.classList.remove('ok');
  tipIcoEl.innerHTML = ICONS.lens;
  tipTextEl.textContent = q.question;
  passageEl.innerHTML = '';
  q.sents.forEach((s, i) => {
    const sp = document.createElement('button');
    sp.className = 'psent';
    sp.dataset.i = i;
    sp.setAttribute('aria-label', '第' + (i + 1) + '句');
    sp.textContent = s;
    passageEl.appendChild(sp);
  });
  cardsEl.innerHTML = '';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card' + (q.optKeys[i] ? '' : ' plain');
    b.dataset.i = i;
    b.setAttribute('aria-label', '选项' + (i + 1) + '：' + o);
    b.innerHTML = (q._optIds ? '<span class="c-ico">' + optIcon(q.dch, q._optIds[i]) + '</span>' : '') +
      '<span class="nm">' + o + '</span>';
    cardsEl.appendChild(b);
  });
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) sayParts(q.askSegs, q.question.replace('？', ''));   /* 换题读题句 */
}
function renderStep() {                         // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                         // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 视觉反馈小件 ================= */
function clearBreathe() {
  cardsEl.querySelectorAll('.breathe').forEach(e => e.classList.remove('breathe'));
  passageEl.querySelectorAll('.breathe').forEach(e => e.classList.remove('breathe'));
}
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
const wigCard = i => replayAnim(cardEl(i), 'wig');
const hopCard = i => replayAnim(cardEl(i), 'hop');
const nudgeCard = i => replayAnim(cardEl(i), 'nudge');
const flashSent = i => replayAnim(sentEl(i), 'flash');
const setReading = i => {
  passageEl.querySelectorAll('.reading').forEach(e => e.classList.remove('reading'));
  if (i >= 0) { const el = sentEl(i); if (el) el.classList.add('reading'); }
};
const dimCard = (i, on) => { const el = cardEl(i); if (el) el.classList.toggle('dim', !!on); };
function pulseKeyLine(q) {                      /* 短文关键句高亮一下（错点回看提示，§1） */
  replayAnim(sentEl(q.keyLine), 'flash');
}
function pulseAnswer(q) {                       /* miss≥2 才高亮正确卡（§0.7 首错不 pulse） */
  replayAnim(cardEl(q.answer), 'pulse');
}
function okPassage() {                          /* 点对：短文卡打勾收起（绿框+勾角标） */
  pcardEl.classList.add('ok');
  pcheckEl.innerHTML = ICONS.check;
}

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el) {
  if (VERIFY || !el) return;
  clearBreathe();                               /* 指新目标前清全部旧 breathe（家族 P1-3 教训） */
  ghost.toEl(el);
  ghost.show();
  replayAnim(el, 'pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"指向：短文关键句 breathe——教孩子"回看哪一句"（本款的认知脚手架） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const el = sentEl(q.keyLine);
  if (el) el.classList.add('breathe');
  pointGhostAt(el);
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 点选选项卡主路径（真实点击 / RD 钩子 / autoSolve / 教学演示共用）
   demo=true 仅教学"看"演示通道（豁免 locked 门，batch5 M1 教训） ================= */
async function uiTapOption(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); nudgeCard(i); }    /* 吞输入+轻叮+卡圈轻闪（§0.22 主答案同规） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  state.hearing = false;                         /* 中断朗读中（孩子点选项=新意图优先） */
  const run = cur;                              /* 身份守卫：演出窗内重玩会重建 cur */
  const r = engTapOption(cur, i);
  if (r === false) return false;
  if (r === 'wrong') {                          /* 错点：晃动零惩罚可重点+关键句高亮一下 */
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss === 2);   /* miss 首达 2 豁免恰一次（§0.5） */
    wigCard(i);
    pulseKeyLine(q);
    if (q._miss >= 2) pulseAnswer(q);           /* 首错不 pulse 正确项（§0.7） */
    state.locked = true;                        /* 晃动窗防重入（§0.26：连点只记一次 miss） */
    await wait(1000 * SPEED);              /* b16 试玩 P2-1：错点防重入窗 560→1000ms（150ms×5 连击不重复记 miss） */
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') scheduleHelpGhost(300);
    return r;                                   /* 错点不重置救援钟（§0.7a） */
  }
  /* ---- 点对：短文卡打勾收起+选项卡跳+确认语音 → 推进（点对重置救援钟 §0.7a） ---- */
  lastAct = Date.now();
  if (state.tut === 'help') {                   /* 教学"独"：首次答对放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  clearBreathe();
  okPassage();
  hopCard(i);
  sfx('coin');
  confirmSpeak(q, i);
  state.locked = true;
  await wait(2100 * SPEED);                     /* 确认语音 ≤2 段 ≈1.8s，播完再进下一题 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz();
  return r;
}

/* ================= 听读通道（正文朗读=rd_s_ 预合成 clip，T46；缺 clip 回退 TTS）
   「我读给你听」clip → 逐句 play(sentKey)+当前句高亮；主动学习动作：重置救援钟（每句持续刷新）；
   点选项/点句/重听题面均中断朗读（新意图优先） ================= */
async function hearPassage(demo) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) { sfx('pop'); return false; }
  state.hearing = false;                        /* 重入：上一次朗读循环自然退出 */
  await wait(20 * SPEED);
  const run = cur;
  state.hearing = true;
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  lastAct = Date.now();                         /* 主动学习动作重置救援钟（§0.7a） */
  KIDS.voice.play(VOICE.listen.key, VOICE.listen.text);
  await wait(700 * SPEED);
  for (let k = 0; k < q.sents.length; k++) {
    if (!state.hearing || cur !== run) { setReading(-1); return false; }
    lastAct = Date.now();                       /* 朗读持续=持续学习，钟不空转 */
    setReading(k);
    KIDS.voice.play(q.sentKeys[k], q.sents[k]); /* 正文句=rd_s_ 预合成 clip（T46），缺 clip 回退 TTS */
    await wait((q.sents[k].length * 300 + 600) * SPEED);
    if (demo && k === 0) break;                 /* b16 试玩 P3-1：教学演示听读只读首句（watch 25.8s→~14s） */
  }
  setReading(-1);
  state.hearing = false;
  lastAct = Date.now();                          /* 朗读完成=学习动作收尾，救援钟从此起算 */
  return true;
}

/* ================= 重听通道：题句（§0.7a 主动学习重置）/ 点句跟读 ================= */
function replayAsk(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  lastAct = Date.now();
  state.hearing = false;                        /* 中断朗读（新意图优先） */
  replayAnim(tipEl, 'flash');
  sayParts(q.askSegs, q.question.replace('？', ''));
  return true;
}
function sentTap(i) {                           /* 点短文句=跟读该句（rd_s_ clip，主动学习重置） */
  const q = cur && cur.quizzes[cur.step];
  if (!q || i < 0 || i >= q.sents.length) return false;
  if (state.locked || state.demo || state.won) { sfx('pop'); flashSent(i); return false; }
  lastAct = Date.now();
  state.hearing = false;                        /* 中断朗读循环 */
  setReading(i);
  flashSent(i);
  KIDS.voice.play(q.sentKeys[i], q.sents[i]);   /* 正文句=rd_s_ 预合成 clip（T46），缺 clip 回退 TTS */
  return true;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（不带"明天："前缀，core 模板自带） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  state.hearing = false;
  clearTimeout(helpTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                            // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);               // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 题句段，queue 单通道顺序播 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key].concat(q.askSegs));
}
function startLevel(flat) {
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, hearing: false };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.read && sv.read.tutSeen);
  if (VERIFY) { openingSpeak(); return; }       // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.read.tutSeen）
   看=演示读文（听读逐句+当前句高亮）→指问题（读题句）→错误选项卡划暗（排除可视化）
   →幽灵手指点正确卡（demo 通道真实点选，返回值存 window.__rdDemoR §0.27）
   →重发同关 → 帮=幽灵手指指短文关键句；独=放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(1000 * SPEED);
  await hearPassage(true);                      /* 演示"读文"：听读逐句+高亮（demo 通道） */
  const q = cur.quizzes[0];
  replayAnim(tipEl, 'flash');                   /* 指"问题"：问句条闪+读题句 */
  sayParts(q.askSegs, q.question.replace('？', ''));
  await wait(2200 * SPEED);
  q.options.forEach((o, i) => {                 /* 排除：错误选项卡划暗 */
    if (i !== q.answer) dimCard(i, true);
  });
  await wait(900 * SPEED);
  pointGhostAt(cardEl(q.answer));
  await wait(880 * SPEED);
  ghost.press();
  await wait(300 * SPEED);
  const demoR = await uiTapOption(q.answer, true);   // demo 通道豁免 locked 门（演示吞输入）
  window.__rdDemoR = demoR;                     /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                      // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.read = sv.read || {};
    sv.read.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                            // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true, hearing: false };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                           // 交接顺序链：turn clip → 题句（§0.6 单通道）
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 pop+hop 不静默 */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {  // 听读：读短文（主动学习重置救援钟 §0.7a）
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.22 吞输入轻叮 */
  hearPassage();
});
tipEl.addEventListener('pointerdown', e => {    // 点题面=重听题句（主动学习重置）
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 吞输入期轻叮 */
  replayAsk(false);
});
passageEl.addEventListener('pointerdown', e => {  // 点短文句=跟读（主动学习重置）
  const el = e.target.closest('.psent');
  if (!el) return;
  e.preventDefault();
  sentTap(Number(el.dataset.i));
});
cardsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.card');
  if (!el) return;
  e.preventDefault();
  uiTapOption(Number(el.dataset.i));
});
stageEl.addEventListener('pointerdown', e => {  /* 点舞台空白（非按钮/非题面卡）：10s 节流轻提示（§0.16）
                                                     b16 审查 S5：#tip 是 div，须显式排除否则首击重听被 hint 劫持 */
  if (e.target.closest('button, #tip')) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }  /* 吞输入期轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.21：题句重读+正确选项卡 breathe）
   / 教学"帮"5s 重演示一次。救援钟只被点对/听读/点句跟读/重听题面重置
   （§0.7a：错点/空白/兔子不重置）；朗读期间钟由 hearPassage 每句刷新 ================= */
function rescueAct(q) {
  rescueCount++;
  sayParts(q.askSegs, q.question.replace('？', ''));   /* 题句重读 */
  clearBreathe();
  const cEl = cardEl(q.answer);
  if (cEl) cEl.classList.add('breathe');        /* 正确选项卡 breathe */
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo || state.hearing) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                   /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueAct(q);
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'read', title: '阅读小侦探' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);               /* 收尾后停留今日最后一关（家族 b14 修复对齐，b15 审查 M3） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.RD = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, misses: cur.misses, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                  /* SPEC §1 契约字段 + 测试辅助字段（全拷贝） */
      passage: q.passage.slice(), keyLine: q.keyLine, question: q.question.slice(),
      options: q.options.slice(), optKeys: q.optKeys.slice(),
      askKey: q.askKey, askSegs: q.askSegs.slice(), dch: q.dch,
      sents: q.sents.slice(), sentKeys: q.sentKeys.slice(), answer: q.answer, step: cur.step,
      miss: q._miss, solved: q.solved
    };
  },
  tapOption(i) { return uiTapOption(i); },
  hearPassage() { return hearPassage(); },
  start(flat) {                                /* 测试钩子：跳关（教学看演期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                          /* UI 路径自动通关：逐题点正确选项卡 */
    const run = cur;                           // 身份守卫：winFlow 延迟 proceed 换关即中止
    let taps = 0, guard = 0;
    while (cur && cur === run && !cur.done && guard++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const r = await uiTapOption(q.answer);
      taps++;
      if (r === false) break;
    }
    return { done: !!(cur && cur.done && cur === run), taps: taps };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
