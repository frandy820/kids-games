/* ================= memgrid 主逻辑（两态闪现流程 / 网格渲染 / 点选判定 / 教学 / 救援 / 推进）
   玩法：每题 k 格闪亮（章 4 起 2s，其余 2.5s）→ 熄灭 → 孩子点出刚才亮过的 k 格。
   两态：phase='show'（闪现期点格零响应=吞输入）→ phase='input'（开放）；
   HUD 指令条"记住亮起来的格子"→"点出刚才亮过的"+ x/k 计数。
   点对=亮起；点错=晃动+sayW 计错（不灭不锁，零惩罚修正）；k 格全亮=题完成。
   救援钟 7a：14s 静置 → 重闪一次 cells 0.8s（视觉救援比语音更贴题）+ 播 mg_q
   ——SPEC §0.7a 允许变体（重播题面提示），README 注明；错点/空白/兔子点击不重置。
   验收钩子：window.MEMG = { currentLevel, quiz, tapCell(i), autoSolve(), skipShow(), replay(), rescues, tutorial }
   skipShow()：测试快进——show 期直跳 input（不亮格）；verify 页另有 SPEED=0.12 提速全部闪现计时 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内闪现/演出计时提速（防总时长爆炸）
const LEAD = 1200;                             // 常规题：mg_q 播响 → 闪现开始的等待
const LEAD_CHAIN = 1900;                       // 顺序链（开场 hint+q / 教学 turn+q）：≥1.8s 接力（§0.6）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/重播不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force=miss≥2 豁免（连错 2 次恰是
   pulse 支架已亮、真卡住时刻，语音与高亮同步——batch8 试玩 P1② 定版形态） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const gridEl = $id('grid'), tipEl = $id('tip'), tipTextEl = $id('tip-text'),
      tipCountEl = $id('tip-count'), stageEl = $id('stage'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白/探索点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 听按钮重播 3s 节流
let helpRedemo = false;
let leadT = null, showT = null, reflashT = null; // 闪现前导/闪现/救援重闪计时器
let rescueCount = 0;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellEl = i => gridEl.querySelector('.cell[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
function clearShowTimers() {
  clearTimeout(leadT); clearTimeout(showT); clearTimeout(reflashT);
  leadT = showT = reflashT = null;
}

/* ================= 渲染 ================= */
function renderGrid() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = 'repeat(' + q.N + ', var(--cell))';
  for (let i = 0; i < q.N * q.N; i++) {
    const b = document.createElement('button');
    b.className = 'cell';
    b.dataset.i = i;
    b.setAttribute('aria-label', '格子' + (i + 1));
    gridEl.appendChild(b);
  }
  layoutGrid();
}
/* 格尺寸按 stage 实时算：min(宽/高约束) clamp [64,158]，间距 12 —— 双 viewport 均 ≥64 */
function layoutGrid() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const availW = stageEl.clientWidth - 16;
  const availH = stageEl.clientHeight - 84;     // 减指令条+间距
  const g = 12;
  const w = Math.floor((availW - (q.N - 1) * g) / q.N);
  const h = Math.floor((availH - (q.N - 1) * g) / q.N);
  const size = Math.max(64, Math.min(Math.min(w, h), 158));
  document.documentElement.style.setProperty('--cell', size + 'px');
  document.documentElement.style.setProperty('--gap', g + 'px');
}
window.addEventListener('resize', () => { if (cur) layoutGrid(); });

/* HUD 两态指令条：show=记住亮起来的格子 / input=点出刚才亮过的 + x/k 计数 */
function renderTip() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.phase === 'input') {
    tipEl.className = 'input count';
    tipTextEl.textContent = TIP_INPUT;
    tipCountEl.textContent = q.picked.length + '/' + q.k;
  } else {
    tipEl.className = 'show';
    tipTextEl.textContent = TIP_SHOW;
  }
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
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderGrid();
  renderTip();
  renderStep();
  if (!state.demo && !state.quiet) {            // 常规换题：mg_q → 闪现（quiet=开场/教学交接走顺序链）
    qSpeak(q);
    scheduleShow(LEAD);
  }
}

/* ================= 幽灵手指（教学"帮"与演示共用） ================= */
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
  el.classList.remove('pulse'); void el.offsetWidth;
  el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：第一枚未点中的记忆格（仅 input 期——show 期指向=泄底） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.phase !== 'input') return;
  const t = q.cells.find(c => q.picked.indexOf(c) < 0);
  if (t != null) pointGhostAt(cellEl(t));
}
/* miss≥2 支架：pulse 一枚未点中的记忆格（首错不 pulse §0.7） */
function pulseHintCell(q) {
  const t = q.cells.find(c => q.picked.indexOf(c) < 0);
  if (t == null) return;
  const el = cellEl(t);
  if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
}

/* ================= 闪现序列（两态核心） =================
   scheduleShow(delay)：delay 后 cells 齐亮（.lit）→ q.show ms 后熄灭 → phase='input'；
   身份守卫 cur!==run 丢弃旧关续体（演出窗内重玩会重建 cur） */
function qSpeak(q) { if (q) KIDS.voice.play(VOICE.q.key, VOICE.q.text); }
function scheduleShow(delay) {
  clearTimeout(leadT); clearTimeout(showT);
  const run = cur;
  leadT = setTimeout(() => {
    if (cur !== run || state.won) return;
    const q = cur.quizzes[cur.step];
    if (!q || q.solved) return;
    q.cells.forEach(c => { const el = cellEl(c); if (el) el.classList.add('lit'); });
    sfx('pop');
    showT = setTimeout(() => {
      if (cur !== run) return;
      finishShow();
    }, q.show * SPEED);
  }, delay * SPEED);
}
function finishShow() {                         // 熄灭 → 开放输入（verify/skipShow 同口）
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return;
  q.cells.forEach(c => { const el = cellEl(c); if (el) el.classList.remove('lit'); });
  engToInput(cur);
  renderTip();
  if (state.tut === 'help') pointHelpNext();    // 教学"帮"：格子可见后再指（不泄底）
}
/* 测试快进（公开钩子）：show 期直跳 input，不亮格不吞点击 */
function skipShowExec() {
  if (!cur || cur.done || state.won) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.phase !== 'show') return false;
  clearTimeout(leadT); clearTimeout(showT);
  q.cells.forEach(c => { const el = cellEl(c); if (el) el.classList.remove('lit'); });
  engToInput(cur);
  renderTip();
  if (state.tut === 'help') pointHelpNext();
  return true;
}
/* 轮询等闪现期结束（autoSolve/教学用；真实等待，不猜时长） */
async function waitPhaseInput(q) {
  const span = (LEAD_CHAIN + q.show) * SPEED + 4500;
  const t0 = Date.now();
  while (Date.now() - t0 < span) {
    if (!cur || cur.done || q.phase === 'input') return true;
    await wait(50);
  }
  return !!(cur && q.phase === 'input');
}

/* ================= 点格主路径（真实点击 / MEMG.tapCell / autoSolve 共用） ================= */
async function uiPick(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked 门，照 batch6/7/8） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || i < 0) return false;
  const run = cur;                              /* 演出窗口内点重玩会重建 cur——身份守卫防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'show') { sfx('pop'); return false; }  /* 闪现期吞输入+轻叮（试玩 P1③：空窗零反馈让孩子以为是坏的）；返回值不变 */
  const el = cellEl(i);

  if (r === 'wrong') {                          /* 点错：晃动零惩罚（不灭不锁可修正）；首错不 pulse */
    if (el) { el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); }
    sfx('fail');
    sayW(VOICE.wrong.key, wrongText(q), q.miss === 2);   /* flat<3 每错必播 / flat≥3 节流+豁免恰一次（格子不灰化 miss 无上限，===2 防豁免变每错必播） */
    if (q.miss >= 2) pulseHintCell(q);          /* 连错 2 次才 pulse 一枚未点中的记忆格 */
    await wait(420 * SPEED);
    return 'wrong';
  }
  if (r === 'again') return 'again';            /* 重复点已对/已错格：早退零惩罚不计数 */

  /* ---- 点对：亮起（绿色描边+勾） ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次点对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  renderTip();                                  /* x/k 计数更新 */
  if (el) {
    el.classList.remove('pulse', 'lit');
    el.classList.add('on');
    const m = document.createElement('span');
    m.className = 'mark';
    m.innerHTML = ICONS.check;
    el.appendChild(m);
  }
  if (q.solved) {                               /* k 格全亮=题完成：短演出后换题/通关 */
    sfx('coin');
    state.locked = true;
    if (r === 'done') hopRabbit();
    await wait(950 * SPEED);
    if (cur !== run) return r;                  /* 演出窗内重玩已重建关卡，丢弃旧续体 */
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {
    sfx('pop');
  }
  return r;
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
  clearShowTimers();
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
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
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
  clearShowTimers();
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.memg && sv.memg.tutSeen);
  if (VERIFY) {                                 /* verify 页 stub 记录开场链（autoplay 断言） */
    state.quiet = false;                        /* 后续换题照常排闪现（quiz0 已在 quiet=true 下渲染，flat0 停 show 供两态断言） */
    if (!freshTut) openingSpeak();
    return;
  }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5：hint 不 _stop 切断题面） */
}
function openingSpeak() {                        /* 顺序链：hint → mg_q → 闪现（LEAD_CHAIN 接力 §0.6） */
  const q = cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([VOICE.hint.key, VOICE.q.key]);
  scheduleShow(LEAD_CHAIN);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=真实闪现一次（locked 吞输入）→ 幽灵手指演示点亮第一枚记忆格 →
   重发同关（确定性关卡，cells 一致）；帮=input 期指向第一枚记忆格；独=首次点对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);      /* 教学 opening 用 sayR 不受 flat 门（§0.6） */
  scheduleShow(600);                            /* watch 语音响起即闪现（边听边看） */
  const q = cur.quizzes[0];
  await waitPhaseInput(q);                      /* 真实等闪现期结束（2500ms），不猜时长 */
  pointGhostAt(cellEl(q.cells[0]));
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示一次点亮
  state.locked = false;                         /* 时序锚点（审查 m6）：吞输入依赖 uiPick 演示格
     全程无 await 且正确路径同步重设 locked=true——禁在其间插入 await */
  state.quiet = true;                           // 演示点亮的反馈不插播语音
  await uiPick(q.cells[0], true);
  const sv = KIDS._save();
  sv.memg = sv.memg || {};
  sv.memg.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，cells 一致），"你来点一点"在重发后的题面上说（照 batch5-8） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  const q0 = cur.quizzes[0];                    // 交接顺序链：turn → 题面（§0.6 禁双通道叠音）
  KIDS.voice.queue([VOICE.turn.key, VOICE.q.key]);
  scheduleShow(LEAD_CHAIN);                     // finishShow 时 tut=help → 幽灵手指指向（不泄底）
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重播（听按钮）：sayR 不受 flat 门；3s 节流防连点轰炸（force=测试钩子直通） */
function replaySpeech(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  qSpeak(q);                                    // 重播题面指令 mg_q
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* §0.20：教学/演出期点兔子不打断 */
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 对齐重玩门 */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  replaySpeech(false);
});
gridEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.cell');
  if (el) { e.preventDefault(); uiPick(Number(el.dataset.i)); return; }   /* show 期 uiPick 自吞 */
  e.preventDefault();                           /* 点舞台空白：10s 节流轻提示（§0.16，不重置救援钟） */
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（5.5 岁等待极限 15s 内）/ 教学"帮"5s 重演示一次
   救援=重闪一次 cells 0.8s（视觉救援，不吞输入）+ 播 mg_q（SPEC §0.7a 允许变体，README 注明）；
   只有本看护与正确推进写 lastAct——错点/空白/兔子点击不重置 */
function rescueAct(q) {
  rescueCount++;
  sayR(VOICE.q.key, VOICE.q.text);
  q.cells.forEach(c => { const el = cellEl(c); if (el) el.classList.add('reflash'); });
  clearTimeout(reflashT);
  reflashT = setTimeout(() => {
    q.cells.forEach(c => { const el = cellEl(c); if (el) el.classList.remove('reflash'); });
  }, 1200);                                     /* 救援重闪 0.8→1.2s（试玩 P1③：走神孩子 0.8s 看不过来） */
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.phase !== 'input') return;        /* 闪现期/换题过渡窗不救援（计时器在推进） */
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
  KIDS.init({ game: 'memgrid', title: '记忆矩阵' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.MEMG = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
             solved: !!q.solved };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { N: q.N, k: q.k, cells: q.cells.slice(), phase: q.phase,
             picked: q.picked.slice(), miss: q.miss, step: cur.step };
  },
  tapCell(i) { return uiPick(i); },
  skipShow() { return skipShowExec(); },        /* 测试快进：show 期直跳 input（不亮格） */
  replay() { return replaySpeech(true); },      /* 测试钩子：无视节流直通重播 */
  async autoSolve() {                           // UI 路径自动答完当前关（真实等闪现期→逐格点 cells）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.phase !== 'input') { await waitPhaseInput(q); continue; }
      const c = q.cells.find(x => q.picked.indexOf(x) < 0);
      if (c == null) break;
      const r = await uiPick(c);
      if (r === false || r === null || r === 'wrong') break;
      taps++;
      await wait(60);
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get rescues() { return rescueCount; },        /* 救援触发计数（自测用） */
  get tutorial() { return state.tut; }
};
