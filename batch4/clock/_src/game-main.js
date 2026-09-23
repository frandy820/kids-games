/* ================= clock 主逻辑（钟面渲染 / 章 3 拖拨分针 / 教学 / 推进）
   章 1-2 认时间：钟面大图 + 3 个数字时间大按钮；章 3 拨针：数字时间卡 + 拖分针（5 分钟吸附，时针联动）
   章 4 经过时间：两钟面 + 时长 3 选 1；答错晃动+灰掉（零惩罚）
   验收钩子：window.CLK = { get currentLevel, get quiz(), pick(i), setDial(mins), autoSolve() } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援语音不受 flat 门限制（7 岁半玩家评估 P1：flat≥3 静置 20s 零救援——常规提示保持 sayP 防语音过频回潮） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };

const zoneEl = $id('clock-zone'), answersEl = $id('answers'), chipEl = $id('prompt-chip'),
      readoutEl = $id('dial-readout'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'
let helpTimer = null;
let dragSt = null;                              // 章 3 拖拨状态 {id, card, mins}

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => answersEl.querySelector('.opt[data-i="' + i + '"]');
const clockCardEl = () => zoneEl.querySelector('.clock-card');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 钟面 SVG（内嵌，时针短粗/分针长细，12 短刻度+4 长刻度） ================= */
function clockSvg(clockMin, o) {
  o = o || {};
  let ticks = '';
  for (let i = 0; i < 12; i++) {                // 4 长刻度（12/3/6/9）+ 8 短刻度
    const a = i * 30 * Math.PI / 180, long = i % 3 === 0;
    const r1 = long ? 66 : 73, sin = Math.sin(a), cos = Math.cos(a);
    ticks += '<line x1="' + (100 + sin * r1).toFixed(1) + '" y1="' + (100 - cos * r1).toFixed(1) +
      '" x2="' + (100 + sin * 82).toFixed(1) + '" y2="' + (100 - cos * 82).toFixed(1) +
      '" stroke="' + INK + '" stroke-width="' + (long ? 4 : 2.5) + '" stroke-linecap="round"' +
      (long ? '' : ' opacity=".55"') + '/>';
  }
  let nums = '';
  for (let n = 1; n <= 12; n++) {               // 章 1-2 显示 / 章 3-4 淡显
    const a = n * 30 * Math.PI / 180;
    nums += '<text x="' + (100 + Math.sin(a) * 54).toFixed(1) + '" y="' + (100 - Math.cos(a) * 54 + 6).toFixed(1) +
      '" font-size="16" font-weight="700" text-anchor="middle" fill="' + INK + '"' +
      (o.dim ? ' opacity=".55"' : '') + '>' + n + '</text>';
  }
  const ring = o.drag ? '<circle class="dialring" cx="100" cy="100" r="97" fill="none" stroke="#E8975A" ' +
    'stroke-width="4" stroke-dasharray="6 10" stroke-linecap="round"/>' : '';
  return '<svg class="clock" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    ring + '<circle cx="100" cy="100" r="90" fill="#FFF9EE" stroke="' + INK + '" stroke-width="5"/>' +
    ticks + nums +
    '<g class="hands">' +
    '<line class="clk-h" x1="100" y1="114" x2="100" y2="52" stroke="' + INK + '" stroke-width="9" stroke-linecap="round" transform="rotate(' + angleHour(clockMin).toFixed(2) + ' 100 100)"/>' +
    '<line class="clk-m" x1="100" y1="120" x2="100" y2="28" stroke="#C77A42" stroke-width="6" stroke-linecap="round" transform="rotate(' + angleMin(clockMin).toFixed(2) + ' 100 100)"/>' +
    '</g><circle cx="100" cy="100" r="7" fill="' + INK + '"/><circle cx="100" cy="100" r="2.8" fill="#FFF9EE"/></svg>';
}
const clockCard = (m, o, cap) => '<div class="clock-card' + (o.drag ? ' drag' : '') + (o.small ? ' small' : '') + '">' +
  clockSvg(m, o) + (cap ? '<div class="clock-cap">' + cap + '</div>' : '') + '</div>';
/* 直驱指针角度（拖拨实时/判定吸附共用；设置 attribute 不走 CSS 过渡，几何可同步断言） */
function setHands(card, clockMin) {
  if (!card) return;
  const h = card.querySelector('.clk-h'), m = card.querySelector('.clk-m');
  if (h) h.setAttribute('transform', 'rotate(' + angleHour(clockMin).toFixed(2) + ' 100 100)');
  if (m) m.setAttribute('transform', 'rotate(' + angleMin(clockMin).toFixed(2) + ' 100 100)');
}

/* ================= 渲染 ================= */
function optBtn(t, i) {
  const b = document.createElement('button');
  b.className = 'opt';
  b.dataset.i = i;
  b.textContent = t;
  b.setAttribute('aria-label', '选 ' + t);
  return b;
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  answersEl.innerHTML = '';
  chipEl.className = '';
  chipEl.innerHTML = '';
  readoutEl.className = '';
  readoutEl.textContent = '';
  if (q.type === 'elapsed') {                   // 章 4：两个钟面 + 时长 3 选 1
    zoneEl.innerHTML = clockCard(q.clockMin, { dim: true, small: true }, '开始') +
      clockCard(q.endMin, { dim: true, small: true }, '结束');
    chipEl.className = 'show elapsed';
    chipEl.innerHTML = ICONS.elapsed + '<span class="big">过了多久？</span>';
    q.items.forEach((t, i) => answersEl.appendChild(optBtn(t, i)));
  } else if (q.type === 'dial') {               // 章 3：目标数字时间 + 可拖拨钟面
    const base = Math.floor(q.clockMin / 60) * 60;   // 初始长针归 12，时针在本小时
    zoneEl.innerHTML = clockCard(base, { dim: true, drag: true });
    chipEl.className = 'show';
    chipEl.innerHTML = ICONS.dial + '<span class="big">' + fmtClock(q.clockMin) + '</span>';
    readoutEl.className = 'show';
    readoutEl.textContent = fmtClock(base);
  } else {                                      // 章 1-2：钟面 + 数字时间 3 选 1
    zoneEl.innerHTML = clockCard(q.clockMin, { dim: cur.dch >= 3 });
    q.items.forEach((t, i) => answersEl.appendChild(optBtn(t, i)));
  }
  renderStep();
  layoutStage();
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

/* ================= 尺寸（双 viewport 均保钟面 ≥200、答案按钮 ≥96×96） ================= */
function layoutStage() {
  if (!cur) return;
  const st = $id('stage').getBoundingClientRect();
  const root = document.documentElement.style;
  const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || { type: 'read' };
  if (q.type === 'elapsed') {
    const c4 = Math.max(200, Math.min(Math.floor(st.width * 0.42), Math.floor(st.height - 215), 270));
    root.setProperty('--clk4', c4 + 'px');
  } else {
    const c = Math.max(200, Math.min(Math.floor(st.width * 0.55), Math.floor(st.height - 205), 330));
    root.setProperty('--clk', c + 'px');
  }
}
window.addEventListener('resize', () => { if (cur) layoutStage(); });

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
  if (el.classList.contains('opt') || el.classList.contains('clock-card')) {
    el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  }
  setTimeout(() => ghost.press(), 800);
}

/* ================= 答题主路径（真实点击 / CLK.pick / autoSolve 共用；read/elapsed 题） ================= */
async function uiPick(i, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.type === 'dial') return false;
  const r = engPick(cur, i);
  if (r === null || r === 'again') return r;
  lastAct = Date.now();
  const el = optEl(i);
  if (r === 'right' || r === 'done') {
    if (state.tut === 'help') {                 // 教学"独"：首次答对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    if (el) {
      el.classList.add('right');
      const m = document.createElement('span');
      m.className = 'mark';
      m.innerHTML = ICONS.check;
      el.appendChild(m);
    }
    sfx('coin');
    await wait(880 * SPEED);
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                      // 答错：晃动+灰掉（零惩罚，可重点其它）；首错只轻提示，连错 2 次才高亮正确项（给再想一次的机会）
    q._miss = (q._miss || 0) + 1;
    if (el) el.classList.add('wrong');
    const ok = optEl(q.answer);
    if (ok && q._miss >= 2) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    sfx('fail');
    sayP(VOICE.hint.key, VOICE.hint.text);
    await wait(520 * SPEED);
  }
  return r;
}

/* ================= 拨针主路径（章 3：拖拨松手 / CLK.setDial / autoSolve 共用） ================= */
async function uiDial(mins) {
  if (!cur || state.locked || state.won || state.demo) return 'locked';
  const q = cur.quizzes[cur.step];
  if (!q || q.type !== 'dial') return 'not-dial';
  const r = engDial(cur, mins);
  if (r === null || r === 'bad') return r;
  lastAct = Date.now();
  const card = clockCardEl();
  if (r === 'right' || r === 'done') {
    if (state.tut === 'help') {
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    setHands(card, q.clockMin);                 // 吸附归位到正确时间（时针含分针联动分量）
    if (card) card.classList.add('ok');
    readoutEl.textContent = fmtClock(q.clockMin);
    readoutEl.classList.add('ok');
    sfx('coin');
    await wait(880 * SPEED);
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                      // 松手不在目标刻度：指针轻微摆动重试（零惩罚）
    if (card) { card.classList.remove('wob'); void card.offsetWidth; card.classList.add('wob'); }
    sfx('fail');
    sayP(VOICE.hint.key, VOICE.hint.text);
    await wait(300 * SPEED);
  }
  return r;
}

/* ================= 章 3 拖拨：pointer capture + 角度吸附最近 5 分钟刻度 ================= */
function applyDrag(e) {
  const svg = dragSt.card.querySelector('svg.clock');
  if (!svg) return;
  const r = svg.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const dx = e.clientX - cx, dy = e.clientY - cy;
  let ang = Math.atan2(dx, -dy) * 180 / Math.PI;   // 12 点方向为 0，顺时针为正
  if (ang < 0) ang += 360;
  const snap = Math.round(ang / 30) * 5 % 60;      // 吸附最近 5 分钟刻度（30 度=5 分钟）
  dragSt.mins = snap;
  const q = cur.quizzes[cur.step];
  setHands(dragSt.card, Math.floor(q.clockMin / 60) * 60 + snap);  // 时针联动：h + min/60
  readoutEl.textContent = fmtClock(Math.floor(q.clockMin / 60) * 60 + snap);
}
zoneEl.addEventListener('pointerdown', e => {
  if (!cur || state.locked || state.won || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.type !== 'dial') return;
  const card = e.target.closest('.clock-card.drag');
  if (!card) return;
  e.preventDefault();
  try { card.setPointerCapture(e.pointerId); } catch (err) {}
  dragSt = { id: e.pointerId, card: card, mins: null };
  lastAct = Date.now();
  applyDrag(e);
});
zoneEl.addEventListener('pointermove', e => {
  if (!dragSt || e.pointerId !== dragSt.id) return;
  e.preventDefault();
  applyDrag(e);
});
zoneEl.addEventListener('pointerup', e => {
  if (!dragSt || e.pointerId !== dragSt.id) return;
  const mins = dragSt.mins;
  dragSt = null;
  if (mins == null) return;
  uiDial(mins);                                 // 松手判定
});
zoneEl.addEventListener('pointercancel', e => {
  if (dragSt && e.pointerId === dragSt.id) dragSt = null;
});

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 反方审查 M1：GEN 文案指"明天"的难度章=下一章（dch=(ch)%4+1），原 ci%4 指向刚打完的章 */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
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
  clearTimeout(helpTimer);
  ghost.hide();
  dragSt = null;
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.clock && sv.clock.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  const freshDial = flat === 10 && cur.dch === 3 && !sv.levels['3-0'] && !(sv.clock && sv.clock.dialSeen);
  if (freshDial) { dialDemo(); return; }        // 章 3 首进：看阶段演示拖针动画一次
  sayP(VOICE.hint.key, VOICE.hint.text);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const el = optEl(q.answer);
  pointGhostAt(el, 'tut');
  await wait(1500 * SPEED);
  ghost.press();
  await wait(400 * SPEED);
  el.classList.remove('pulse');
  state.demo = false;                           // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  await uiPick(q.answer, true);
  const sv = KIDS._save();
  sv.clock = sv.clock || {};
  sv.clock.tutSeen = true;
  KIDS.store.persist();
  sayP(VOICE.turn.key, VOICE.turn.text);
  await wait(500 * SPEED);
  ghost.hide();
  cur = genLevel(0);                            // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  setTimeout(() => { if (state.tut === 'help') pointGhostAt(optEl(cur.quizzes[0].answer), 'tut'); }, 600);
}
/* 章 3 教学看阶段：长针从 12 点扫到目标刻度（逐 5 分钟步进） */
async function dialDemo() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(600 * SPEED);
  const q = cur.quizzes[0];
  const card = clockCardEl();
  pointGhostAt(card, 'tut');
  await wait(1000 * SPEED);
  const target = q.clockMin % 60;
  sfx('pop');
  /* 反方审查 m6：目标=整点(0 分)时原循环零次（演示空转）——拨满一圈回到 12 点 */
  const end = target === 0 ? 60 : target;
  for (let m = 5; m <= end; m += 5) {           // 演示拖针动画（真实吸附节奏）
    await wait(120 * SPEED);
    setHands(card, Math.floor(q.clockMin / 60) * 60 + (m % 60));
    readoutEl.textContent = fmtClock(Math.floor(q.clockMin / 60) * 60 + (m % 60));
    sfx('pop');
  }
  await wait(500 * SPEED);
  const sv = KIDS._save();
  sv.clock = sv.clock || {};
  sv.clock.dialSeen = true;
  KIDS.store.persist();
  sayP(VOICE.turn.key, VOICE.turn.text);
  await wait(400 * SPEED);
  ghost.hide();
  cur = genLevel(cur.flat);                     // 同关重来（确定性一致），进入"帮"
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  setTimeout(() => { if (state.tut === 'help') pointGhostAt(clockCardEl(), 'tut'); }, 600);
}

/* ================= 底栏交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  sayP(VOICE.hint.key, VOICE.hint.text);
});
answersEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.opt');
  if (!el) return;
  e.preventDefault();
  uiPick(Number(el.dataset.i));
});

/* ================= 无操作看护：20s 轻声提示目标 / 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayR(VOICE.hint.key, VOICE.hint.text);      // 救援语音不受 flat 门（评估 P1）
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    const q = cur.quizzes[cur.step];
    if (!q) return;
    pointGhostAt(q.type === 'dial' ? clockCardEl() : optEl(q.answer), 'tut');
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'clock', title: '时间小管家' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });   /* 明日首解锁关=今日上限（M1：原硬编码 0 恒指章 1） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.CLK = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won } : null;
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const out = { type: q.type, clockMin: q.clockMin, items: q.items.slice(), answer: q.answer, step: cur.step };
    if (q.type === 'elapsed') { out.endMin = q.endMin; out.dur = q.dur; }
    if (q.type === 'dial') out.targetMin = q.clockMin % 60;
    return out;
  },
  pick(i) { return uiPick(i); },
  setDial(mins) { return uiDial(mins); },       // 章 3 直驱拨针判定（verify/测试用）
  async autoSolve() {                           // UI 路径自动答完当前关（走真实 pick/dial 流程）
    let n = 0;
    while (cur && !cur.done && n++ < 30) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.type === 'dial') await uiDial(q.clockMin % 60);
      else await uiPick(q.answer);
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; }
};
