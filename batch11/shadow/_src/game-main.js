/* ================= shadow 主逻辑（r8：多物连解 / 旋转遮蔽 / 重叠拆解）
   玩法：题面 = 3-4 个彩色 emoji 一排（当前目标橙圈高亮；overlap 题 = 两个剪影叠成一团），
   下方 3-5 张黑色剪影卡（同款 emoji CSS filter 生成；r8 全卡随机旋转 0/90/180/270，
   ch3+ 灌木遮蔽只露 30% 轮廓）。点对 = 剪影点亮回彩色 → 消显（.gone 定格）→ 题面下一目标
   高亮 + 播新目标题面句（sha_q_* 逐物复用）；本题全部连对 = 最后一物飞到题面配对换题。
   点错 = 晃动（干扰卡灰掉排除法保底；未来目标卡只晃不灰——接下来还要连，连错零惩罚），
   首错不 pulse，miss≥2 当前应点卡 breathe。救援 = 重读题面 + 应点卡 breathe 循环（§0.21）。
   开场/交接语音走顺序链（chainsum 定版形态）：play(sha_help) 后 2000ms 接力题面
   （qTimer 接力，禁双通道叠音）。语音窗估计=estMs n*345+600 家族定版（game-data 定义，
   注释/verify/build 四处同步；r8 时长模型用）。
   验收钩子：window.SH = { get currentLevel, get quiz(){mode,target,name,targets,options,rot,
   veil,answerIdx,phase,picked,step,miss,dead}, tapCard(i), async autoSolve(), get tutorial }
   （getter 返回拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force=q._miss===2 豁免恰一次
   （r8 multi 干扰只 1 张可灰但"未来目标卡"错点也计 miss——miss 无上限，===2 恰一次仍真值） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const stageEl = $id('stage'), boardEl = $id('board'), chipEl = $id('prompt-chip'),
      ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'
let qTimer = null;                              // 开场/教学链 clip→题面 的接力定时器

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');
/* 当前目标 id（multi=targets[phase] / overlap=pair[phase]）——读题/题面/救援共用 */
const curTarget = q => q.mode === 'overlap' ? q.pair[q._phase] : q.targets[q._phase];

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：连对成功=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（读题 sayR 级不受 flat 门）
   multi=当前目标句（连对换物即换句，sha_q_* 逐物 clip 复用）；overlap=叠影双选句（sha_q_pair）；
   重入先清接力定时器（防旧题残留切断新题面） */
function speakQuiz(q) {
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  if (q.mode === 'overlap') {
    KIDS.voice.play('sha_q_pair', pairSpeech(q));
  } else {
    const t = curTarget(q);
    KIDS.voice.play('sha_q_' + t, quizSpeech({ t: t }));
  }
}

/* ================= 开场顺序链（§0.5/§0.6，chainsum 定版形态：quiet 标志防渲染插播）
   play(sha_help) 后 2000ms 接力题面（hint clip ~1.6s，留白 2s 防叠音；禁 play 直接切断题面） */
function openingSpeak() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }   /* 防上一关接力残留切断本关 */
  sayR(VOICE.hint.key, VOICE.hint.text);
  qTimer = setTimeout(() => {
    qTimer = null;
    speakQuiz(cur.quizzes[cur.step]);
  }, 2000);
}

/* ================= 渲染 ================= */
function renderChip(q) {                        // 题面行：多物一排 / 重叠叠影团（零文字标签 §0.19）
  chipEl.classList.remove('paired');
  if (q.mode === 'overlap') {
    chipEl.innerHTML = '<span class="ovl-wrap">' +
      '<span class="ovl-g g1">' + emojiOf(q.pair[0]) + '</span>' +
      '<span class="ovl-g g2">' + emojiOf(q.pair[1]) + '</span></span>' +
      '<span class="t-shadow" aria-hidden="true"></span>';
    chipEl.setAttribute('aria-label', pairSpeech(q) + '，点我再听一遍');
    return;
  }
  let row = '<span class="t-row">';
  q.targets.forEach((tg, k) => {
    row += '<span class="t-item" data-k="' + k + '"><span class="t-glyph">' + emojiOf(tg) + '</span></span>';
  });
  chipEl.innerHTML = row + '</span><span class="t-shadow" aria-hidden="true"></span>';
  chipEl.setAttribute('aria-label', quizSpeech({ t: q.targets[q._phase] }) + '，点我再听一遍');
  updateChipPhase(q);
}
function updateChipPhase(q) {                   // multi：连对项 .hit 定格 / 当前项 .cur 橙圈跳动
  if (q.mode !== 'multi') return;
  const items = chipEl.querySelectorAll('.t-item');
  Array.prototype.forEach.call(items, (it, k) => {
    it.classList.toggle('hit', k < q._phase);
    it.classList.toggle('cur', k === q._phase && !q._answered);
  });
}
function renderBoard(q) {                       // 剪影卡：emoji 剪影 + 旋转 --rot + 灌木遮蔽层
  boardEl.innerHTML = '';
  q.options.forEach((id, i) => {
    const b = document.createElement('button');
    b.className = 'card pop' + (q._dim[i] ? ' dim' : '') + (q._pick[i] ? ' gone' : '');
    b.dataset.i = i;
    b.dataset.sid = id;                         // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', nameOf(id) + '的影子');
    b.style.setProperty('--rot', (q.rot[i] || 0) + 'deg');
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="gwrap"><span class="glyph">' + emojiOf(id) + '</span></span>' +
      (q.veil[i] ? '<span class="veil" aria-hidden="true">' + ICONS.bush + '</span>' : '');
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);  /* 开场/换题读题；demo 门防演示收尾叠播；quiet=开场/教学交接改顺序链 */
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
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 点亮消显配对（§0.11：CSS transition，时长随 SPEED）
   连对一步：源卡 .lit 点亮回彩色 → .gone 消显定格（同步前缀供验收窗内读 DOM）→ 题面
   对应项 .hit；本题最后一物：克隆飞行体 fixed 从源卡矩形到题面矩形 → 题面 .paired 亮绿 */
function flyCard(el, id) {
  const dur = 430 * SPEED;
  const to = chipEl.getBoundingClientRect();
  if (!el) return dur;
  const from = el.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'fly';
  fly.textContent = emojiOf(id);
  fly.style.left = from.left + 'px';
  fly.style.top = from.top + 'px';
  fly.style.width = from.width + 'px';
  fly.style.height = from.height + 'px';
  fly.style.transitionDuration = dur + 'ms';
  document.body.appendChild(fly);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  const k = Math.min(to.width, to.height) / Math.max(from.width, from.height) * 1.15;
  requestAnimationFrame(() => {
    fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + k.toFixed(3) + ')';
  });
  setTimeout(() => fly.remove(), dur + 90);     // transition 结束后移除飞行体
  return dur;
}

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el, reason) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show(reason);
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：当前题当前目标的剪影卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(wantOf(q)), 'tut');
}

/* ================= 剪影卡点选主路径（真实点击 / SH.tapCard / autoSolve 共用） ================= */
async function uiTapCard(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked）。
     吞输入期轻反馈（§0.22）：真实点击被 locked/demo/won 吞时 sfx('pop') 轻叮，返回值/状态不变 */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    sfx('pop');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';            /* 已灰/已消显卡：早退零惩罚不计数（§0.7 防御层） */
  const el = cardEl(i);

  if (r === 'wrong') {                          /* 答错：晃动；干扰卡灰掉（排除法保底）/未来目标卡不灰 */
    if (el) {
      el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig');
      if (q._dim[i]) el.classList.add('dim');   /* 渲染即引擎：灰化由引擎 _dim 驱动（未来目标卡不灰） */
    }
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss === 2);  /* flat<3 每错必播 / flat≥3 10s 节流+豁免恰一次 */
    if (q._miss >= 2) {                         /* 首错不 pulse：连错 2 次才高亮当前应点剪影 */
      const ok = cardEl(wantOf(q));
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    await wait(480 * SPEED);
    return r;
  }

  /* ---- 连对一步：剪影点亮回彩色（同步前缀）→ 停半拍 → 消显/本题完成则飞行配对 → 推进 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  const finished = q._answered;                 /* engTap 已推进 _phase（连对+1）/置 _answered（本题完成） */
  const hitId = q.options[i];
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  await wait(620 * SPEED);                      /* 点亮停半拍（看清彩色回来） */
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  if (finished) {
    chipEl.classList.add('paired');             // 题面亮绿（同步前缀，供验收窗内读 DOM）
    flyCard(el, hitId);                         /* 本题最后一物：飞到题面旁配对 */
    await wait(430 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (cur.done) winFlow();
    else renderQuiz();
    return r;
  }
  /* 连对但本题未完：消显定格 + 题面下一目标高亮 + 播新目标题面句（连解节奏） */
  if (el) { el.classList.add('gone'); el.classList.remove('lit'); }
  if (q.mode === 'overlap') {                   /* overlap 第一选：题面叠影对应物点亮 + 卡 .sel 定格 */
    const gs = chipEl.querySelectorAll('.ovl-g');
    Array.prototype.forEach.call(gs, g => { if (g.textContent === emojiOf(hitId)) g.classList.add('hit'); });
    if (el) el.classList.add('sel');
    if (el) el.classList.remove('gone');        /* 双选第一张不消显（等第二张一起完成） */
  } else {
    updateChipPhase(q);                         /* multi：连对项 hit 定格 / 下一目标 cur 高亮 */
  }
  if (!state.demo && !state.quiet) speakQuiz(q);  /* 新目标题面句（demo 门防演示叠播；quiet=教学交接链） */
  await wait(700 * SPEED);                      /* 消显+高亮移动演出窗 */
  if (cur !== run) return r;
  state.locked = false;
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = Math.max(0, (flat == null ? cur.flat : flat) | 0);
  /* 预告=接下来首个新关（f+1）的难度章文案：静态段取其所属章 CHAPTERS 章末预告；
     生成关（家族契约 F）禁"章索引加一取模"字面——须实算 genLevel(f+1).dch 取 GEN_HINTS */
  /* r7 审查 M1 同型坑：静态章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4 口径），
     禁 floor((f+1)/CH_LEN)+1 off-by-one 式（章末关恒多进一章） */
  if (f + 1 < STATIC_LEVELS) return CHAPTERS[Math.floor(f / CH_LEN) + 1].hint;
  return GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：dayEnd 预告传 nextHint(lim-1) */
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
function startLevel(flat) {
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  /* verify 页恒走 openingSpeak（stub 记录开场链供断言，教学由真实页自测覆盖） */
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.sha && sv.sha.tutSeen);
  if (VERIFY) { openingSpeak(); return; }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；hint 不得切断题面） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点出当前目标剪影（点亮+消显演示一步连解，locked 吞输入）→帮=指向当前应点剪影；
   独=首次答对放手。演示"看"只演示一步连对（连解机制本身），其余由孩子完成 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = wantOf(q);
  pointGhostAt(cardEl(idx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapCard(idx, true);                    // demo 通道豁免 locked（演示吞真实输入）
  await wait(1000 * SPEED);                      // 点亮+消显演出窗口
  const sv = KIDS._save() || {};                 // verify 页 _save()=null 时空档（教学链单元直调）
  sv.sha = sv.sha || {};
  sv.sha.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来连一连"在重发后的题面上说（照 batch5-10） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链：turn clip 播完再读题面——题面为整句 clip/TTS，qTimer 2000ms 接力（§0.6，禁双通道叠音） */
  sayR(VOICE.turn.key, VOICE.turn.text);
  qTimer = setTimeout(() => {
    qTimer = null;
    if (state.tut === 'help') speakQuiz(cur.quizzes[cur.step]);
  }, 2000);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) {   /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默（试玩 P2①） */
    sfx('pop');
    hopRabbit();
    return;
  }
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20：教学/演出/通关期重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查 m5：对齐重玩门/题面卡防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整段重读 */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（点题卡=儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (p) {                                       // 剪影卡：主答路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮（演出窗真实点击可感知） */
    uiTapCard(Number(p.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return;  // 题面卡走自己的 handler
  /* 空白/探索点击（含已灰卡 pointer-events:none 落穿）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22，试玩 P2①） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（重读题面+当前应点剪影 breathe 循环 §0.21）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援=重读题面（§0.7a，非通用催促句） */
    if (q) speakQuiz(q); else sayR(VOICE.hint.key, VOICE.hint.text);
    if (q) {                                    /* 视觉重现（§0.21）：当前应点剪影 breathe 循环在屏 */
      const ok = cardEl(wantOf(q));
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
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
  KIDS.init({ game: 'shadow', title: '影子配对' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：启动分支同口径 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.SH = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, retries: cur.retries, done: cur.done, won: state.won };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const t = curTarget(q);
    return { mode: q.mode, target: t, name: nameOf(t),          /* r8 钩子契约（SPEC §1-r8） */
             targets: (q.targets || q.pair).slice(),
             options: q.options.slice(), rot: q.rot.slice(), veil: q.veil.slice(),
             answerIdx: wantOf(q), phase: q._phase,
             picked: q._pick.map((v, i) => v ? i : -1).filter(i => i >= 0),
             step: cur.step, miss: q._miss || 0,
             dead: q._dim.map((v, i) => v ? i : -1).filter(i => i >= 0) };   /* 灰化卡下标 */
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                           // UI 路径自动点完当前关（逐连对步点当前应点卡）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 60) {   // 最重关 16 决策步，guard 60 余量
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapCard(wantOf(q));
      taps++;
      if (r === false || r === null) break;     // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
