/* ================= wordprob 主逻辑（场景插画/题面大字渲染 / 点选答题 / 教学 / 推进）
   玩法（SPEC-BATCH13 §2 r13）：场景插画（数字不入画）+ 题面大字逐词（3-4 句情景叙述）
   + 语音读题（queue 拼接整句 = 模板段 clip wor_tpl2_* + 数词 clip wor_n_1..35；
   模板段 clip 缺失由整句 TTS 兜底），点选 4 选 1 数字大卡（答案+干扰三元组）。
   不灰化：答错晃动可重点；sayW force = miss===2（不灰化款定版）；
   首错不 pulse 正确卡，miss≥2 才 breathe（正向选择款——发光落正确卡，语义同向）；
   救援=重读题面+正确卡 breathe（§0.21）；错答 clip 播放期救援让路（wrongChainUntil 契约 I）。
   验收钩子：window.WP = { get currentLevel, get quiz(){kind,tpl,form,nums,warm,options,answerIdx,
   answer,mid,step,miss}, tapAnswer(i), async autoSolve(), get tutorial, get rescues } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/教学不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援不可收） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流 + 豁免恰一次——不灰化款（miss 无上限）
   必须 === 2（batch9/sortsize 定版）：豁免只在每题 miss 首达 2 时发一次，防豁免变每错必播 */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 题面=queue 拼接 clip（§0.23）：全部段 clip 在场走 queue 单通道；缺任一段走整句 TTS 兜底
   （模板段 wor_tpl2_* 由父会话二次合成后 rebuild，此前正常游玩由 TTS 兜底不阻断） */
function sayQ(parts, fullText) {
  if (KIDS.voice.clips && parts.every(p => KIDS.voice.clips[p.key])) {
    KIDS.voice.queue(parts.map(p => p.key));
  } else {
    KIDS.voice.say(fullText);
  }
}

const stageEl = $id('stage'), sceneEl = $id('scene'), chipEl = $id('prompt-chip'),
      answersEl = $id('answers'), ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let qTimer = null;                              // 开场/教学交接 qTimer 接力（§0.6）
let rescueCount = 0;                            // 救援触发计数（验收钩子可观测）
let wrongChainUntil = 0;                        /* 错答 clip 播放窗（契约 I）：sayW 起播设
                                                   now+WRONG_CHAIN_WIN，救援 interval 让路（防
                                                   重读题面切断错答提示），startLevel 重置 */

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => answersEl.querySelector('.opt[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
/* 题面读音单元序列（与题面文字一一对应；queue 段间自动 0.15s 停顿）
   r13 变槽数：seg1 + 数词1 + seg2 + 数词2 + seg3 +（数词3 + seg4）+（数词4 + seg5）
   ——槽序=各模板自然语序（candy2=[a,c,b]），与 speechOf 全文拼接一致 */
function quizParts(q) {
  const segs = TPLS[q.tpl].segs;
  const parts = [];
  for (let i = 0; i < segs.length; i++) {
    parts.push({ key: segs[i], text: TPL_VOICE[segs[i]] });
    if (i < q.nums.length) parts.push({ key: 'wor_n_' + q.nums[i], text: numCn(q.nums[i]) });
  }
  return parts;
}
const qSpeech = q => speechOf(q);               // 题面全文（game-data 定义，读题兜底/aria 共用）
/* 题面大字逐词：文字段 + 数字大字（数字不入插画，在题面高亮呈现 §0.19） */
function renderPrompt(q) {
  const segs = TPLS[q.tpl].segs;
  let html = '';
  for (let i = 0; i < segs.length; i++) {
    html += '<span class="seg">' + TPL_VOICE[segs[i]] + '</span>';
    if (i < q.nums.length) html += '<b class="num">' + q.nums[i] + '</b>';
  }
  chipEl.innerHTML = html;
  chipEl.setAttribute('aria-label', '题目：' + qSpeech(q));
}
function optBtn(t, i) {
  const b = document.createElement('button');
  b.className = 'opt';
  b.dataset.i = i;
  b.textContent = t;
  b.setAttribute('aria-label', '选 ' + t);
  return b;
}
function renderStep() {                          // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                          // 章节点（1 基，生成关循环章画到当前章）
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
function speakQuiz(q) { if (q) sayQ(quizParts(q), qSpeech(q)); }
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  sceneEl.innerHTML = SCENES[TPLS[q.tpl].scene];   // 场景插画（模板对应一幅）
  renderPrompt(q);
  answersEl.innerHTML = '';
  q.options.forEach((v, i) => answersEl.appendChild(optBtn(v, i)));
  renderStep();
  /* 换题读题 sayR 级不受 flat 门（不识字孩子依赖听题；同 batch12 审查 m7 口径） */
  if (!VERIFY && !state.demo && !state.quiet) sayQ(quizParts(q), qSpeech(q));
}
/* 开场顺序链（§0.5/§0.6）：lead（hint 或教学交接 turn）→ 题面 5 段。
   全 clip 在场=queue 单通道顺序播；缺模板段（合成前）=lead clip + qTimer 1.8s 接力整句 TTS，
   两分支皆单通道禁叠音（§0.6 允许 queue 或 qTimer ≥1.8s 接力） */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const lead = turn ? VOICE.turn : VOICE.hint;
  const parts = quizParts(q);
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  if (KIDS.voice.clips && parts.every(p => KIDS.voice.clips[p.key])) {
    KIDS.voice.queue([lead.key].concat(parts.map(p => p.key)));   // 单通道：lead+题面 6 段全 key
  } else {
    KIDS.voice.play(lead.key, lead.text);
    qTimer = setTimeout(() => {
      qTimer = null;
      sayQ(parts, qSpeech(q));
    }, 1800);
  }
}

/* ================= 答题主路径（真实点击 / WP.tapAnswer / autoSolve / 教学演示共用） ================= */
async function uiPick(i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;  /* locked 带 demo 豁免（教学演示，审查 M1——对齐 grid uiCell） */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗口内重玩会重建 cur（M3） */
  const r = engTap(cur, i);
  if (r === null) return false;
  const el = optEl(i);
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                        /* 仅正确推进重置救援钟（§0.7a） */
    if (state.tut === 'help') {                  // 教学"独"：首次答对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    if (el) {
      el.classList.remove('breathe', 'wrong');
      el.classList.add('right');
      const m = document.createElement('span');
      m.className = 'mark';
      m.innerHTML = ICONS.check;
      el.appendChild(m);
    }
    sfx('coin');
    await wait(880 * SPEED);
    if (cur !== run) return r;                   /* 演出窗内重玩已重建关卡：丢弃旧续体 */
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                       // 答错：晃动不灰掉可重点（不灰化款 SPEC §2）
    if (el) { el.classList.remove('wrong', 'breathe'); void el.offsetWidth; el.classList.add('wrong'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);   /* flat<3 每错必播 / flat≥3 节流+豁免恰一次（===2） */
    wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;          /* 错答 clip 播放窗起播（契约 I）：救援让路 */
    if (q.miss >= 2) {                           /* 首错不 pulse：连错 2 次才高亮正确卡 */
      const ok = optEl(q.answerIdx);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    if (state.tut === 'help') pointHelpNext();
    state.locked = true;                            /* 晃动窗防重入：快速连点一次错只记一次 miss（审查 m3，照 column） */
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
  }
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4，CHAPTERS[i].hint=第 i+1 章预告——家族 F 契约表）；
     生成关预告实算下一关难度章 GEN_HINTS[genLevel(f+1).dch-1]（家族 F——禁 (ci+1)%4 取模：
     取模与 seeded 随机 dch 仅 1/4 相符，r13 审查 M1/试玩 P2-1 实锤，grid 为正确范本） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
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
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                             // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);                // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  wrongChainUntil = 0;                           /* 错答 clip 窗重置（契约 I：startLevel 清窗） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  /* verify 页恒走 openingSpeak（stub 记录开场链供断言，教学链由 verify 单元直驱） */
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.wordprob && sv.wordprob.tutSeen);
  if (VERIFY) { openingSpeak(); return; }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5） */
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
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
function pointHelpNext() {                        // 教学"帮"：指向当前题正确答案卡
  const q = cur && cur.quizzes[cur.step];
  if (q) pointGhostAt(optEl(q.answerIdx));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点出正确答案卡（locked 吞输入，demo 参数豁免）→
   重发同关 → 帮=指向正确卡；独=首次答对放手。
   save.wordprob.tutSeen 记住演示已放过（§0.6） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  pointGhostAt(optEl(q.answerIdx));
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiPick(q.answerIdx, true);  // demo 通道豁免 locked（演示吞真实输入）
  window.__wpDemoR = demoR;                       /* 演示生效证据（审查 M2：三道门禁曾放行 no-op） */
  await wait(1000 * SPEED);                      // 答对演出窗口
  const sv = KIDS._save() || {};                 // verify 单元直驱时 _save()=null 空档防御（batch12 m3）
  sv.wordprob = sv.wordprob || {};
  sv.wordprob.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来算一算"在重发后的题面上说（照 batch5-12） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链（§0.6）：turn clip 先播（题面不抢拍），qTimer ≥1.8s 后接力题面
     （题面 queue 需模板 clip 全在场；qTimer 接力对 TTS 兜底态同样单通道不叠音；
     先清开场链遗留 qTimer，防双接力） */
  sayR(VOICE.turn.key, VOICE.turn.text);
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
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
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=pop+hop 轻反馈不静默（§0.16） */
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
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 对齐重玩门/题面防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整句重读（queue 拼接） */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo) { sfx('pop'); return; }   /* 吞输入期点题面卡也轻叮（审查 m1，§0.16 主视觉区） */
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const o = e.target.closest('.opt');
  if (o) {                                       // 答案卡：主答路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiPick(Number(o.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return;  // 题面卡走自己的 handler
  /* 空白/探索点击（含插画区）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期点插画/空白轻叮（batch12 m4） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（重读题面+正确卡 breathe 循环 §0.21）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   /* 契约 K：面板/演出层在场不救援 */
  if (Date.now() < wrongChainUntil) return;      /* 错答 clip 播放窗让路（契约 I）——窗后照常救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];             /* 救援=重读题面（§0.7a）+ 答案视觉线索（§0.21） */
    if (q) {
      speakQuiz(q);
      const ok = optEl(q.answerIdx);             // 正确卡 breathe 持续循环在屏，静音也能看见答案线索
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    } else sayR(VOICE.hint.key, VOICE.hint.text);
    rescueCount++;
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
  KIDS.init({ game: 'wordprob', title: '应用题剧场' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（batch12 m6：lim%5==0 时不跳章） */ });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用 §0.8） ================= */
window.WP = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind, tpl: q.tpl, form: q.form, nums: q.nums.slice(), warm: !!q.warm,   /* SPEC §2 r13 钩子契约 */
             options: q.options.slice(), answerIdx: q.answerIdx, answer: q.answer,
             mid: (MID_OF[q.form] ? MID_OF[q.form](q.nums) : null),
             step: cur.step, miss: q.miss };
  },
  tapAnswer(i) { return uiPick(i); },
  async autoSolve() {                            // UI 路径自动答完当前关（逐题点正确卡）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 30) {    // 5 题每题 1 tap，guard 30 余量
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiPick(q.answerIdx);
      taps++;
      if (r === false || r === null) break;      // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
