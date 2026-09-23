/* ================= math 主逻辑（UI / 地图动画 / 计数辅助 / 教学）
   冒险地图：小兔子沿山路每答对 1 题前进一站，5 题到山顶点亮星星
   计数辅助：章 1-2 苹果点数（减法划掉减数）、章 3-4 数轴 0-20 高亮起点；答错自动亮起（不代答）
   验收钩子：window.MATH = { get currentLevel, get quiz(), pick(i), countAid(), autoSolve() } */
const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 冒烟动画提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3，用户反馈"太频繁"）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };

const answersEl = $id('answers'), aidEl = $id('aid'), bunEl = $id('bun'),
      mapwrapEl = $id('mapwrap'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), countBtn = $id('btn-count');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', tutStep: 0 };
let lastAct = Date.now();
let helpTimer = null, helpRedemo = false;
let ghostReason = null;
let aidAuto = false;         // 辅助是否因答错自动亮起（首次按钮点击不关闭，教玩观察 P2）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const ansEl = i => answersEl.querySelector('.ans[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  countBtn.innerHTML = ICONS.count + '<span>数一数</span>';
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  bunEl.innerHTML = KIDS.assets.rabbit('normal', 56);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  STOPS.forEach((s, k) => {                      // 6 站：起点 + 5 题站（山顶=星）
    const d = document.createElement('div');
    d.className = 'stop' + (k === 5 ? ' summit' : '');
    d.style.left = s.x + '%';
    d.style.top = (s.y / 62 * 100) + '%';
    if (k === 5) d.innerHTML = ICONS.star;
    mapwrapEl.appendChild(d);
  });
}

/* ================= 渲染 ================= */
function moveBun() {                             // 兔子站到"当前进度"站点
  const s = STOPS[Math.min(cur.step, 5)];
  bunEl.style.left = s.x + '%';
  bunEl.style.top = (s.y / 62 * 100) + '%';
}
function hopBun() { bunEl.classList.remove('hop'); void bunEl.offsetWidth; bunEl.classList.add('hop'); }
function renderStops() {
  mapwrapEl.querySelectorAll('.stop').forEach((d, k) => {
    d.classList.toggle('done', k <= cur.step);
    d.classList.toggle('goal', k === cur.step + 1 && !cur.done);
  });
}
function renderStep() {                          // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < 5; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                          // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const ch = cur.ch, sv = KIDS._save() || { levels: {} }; // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  $id('quiz-text').innerHTML = q.text + ' = <span id="qm">?</span>';
  answersEl.innerHTML = '';
  q.items.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'ans';
    b.dataset.i = i;
    b.textContent = v;
    b.setAttribute('aria-label', '选 ' + v);
    answersEl.appendChild(b);
  });
  closeAid();
  renderStep(); renderStops(); moveBun();
}

/* ================= 计数辅助（数一数） ================= */
/* 苹果点数（章 1-2）：加法两组苹果；减法 a 个中前 b 个划掉，数剩下的 */
function appleAidHtml(q) {
  let cells = '';
  const one = (cls, delay) => '<span class="appl' + (cls || '') + '" style="animation-delay:' + delay + 'ms">' + ICONS.apple + '</span>';
  if (q.op === '+') {
    for (let k = 0; k < q.a; k++) cells += one('', k * 70);
    cells += '</div><span class="a-plus">+</span><div class="a-group">';
    for (let k = 0; k < q.b; k++) cells += one('', (q.a + k) * 70);
    return '<div class="aid-title">数一数</div><div class="a-row"><div class="a-group">' + cells + '</div></div>';
  }
  for (let k = 0; k < q.a; k++) cells += one(k < q.b ? ' crossed' : '', k * 70);
  return '<div class="aid-title">数一数</div><div class="a-row">' + cells + '</div>';
}
/* 数轴 0-20（章 3-4 与教学演示）：高亮起点 a + 方向弧（不标终点=不代答） */
function numLineSvg(q) {
  const X = i => 20 + 21 * i;
  let ticks = '';
  for (let i = 0; i <= 20; i++) {
    const x = X(i), major = i % 5 === 0;
    ticks += '<line x1="' + x + '" y1="44" x2="' + x + '" y2="' + (major ? 56 : 50) + '" stroke="' + INK + '" stroke-width="' + (major ? 2.5 : 1.6) + '"/>';
    if (major) ticks += '<text x="' + x + '" y="70" font-size="12" font-weight="700" text-anchor="middle" fill="#8A7B6C">' + i + '</text>';
  }
  const segs = q.op === '++' ? [q.b, q.c] : [q.op === '-' ? -q.b : q.b];
  let from = q.a, arcs = '';
  segs.forEach(seg => {
    const to = from + seg, x1 = X(from), x2 = X(to), mx = (x1 + x2) / 2;
    arcs += '<path d="M ' + x1 + ' 38 Q ' + mx + ' 8 ' + x2 + ' 38" stroke="#8A9BAE" stroke-width="2.5" stroke-dasharray="5 5" fill="none" marker-end="url(#nl-arw)"/>' +
      '<text x="' + mx + '" y="15" font-size="13" font-weight="700" text-anchor="middle" fill="#8A9BAE">' + (seg > 0 ? '+' : '') + seg + '</text>';
    from = to;
  });
  return '<div class="aid-title">从橙色圆点开始数</div><svg class="numline" viewBox="0 0 460 76" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><marker id="nl-arw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">' +
    '<path d="M0 0 L10 5 L0 10 z" fill="#8A9BAE"/></marker></defs>' +
    '<line x1="14" y1="44" x2="446" y2="44" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' + ticks +
    '<circle class="nl-ring" cx="' + X(q.a) + '" cy="44" r="11" fill="none" stroke="#E8975A" stroke-width="3"/>' +
    '<circle class="nl-start" cx="' + X(q.a) + '" cy="44" r="7.5" fill="#E8975A" stroke="#FFF" stroke-width="2.5"/>' +
    arcs + '</svg>';
}
function openAid(forceKind) {
  if (!cur || cur.done) return;
  const q = cur.quizzes[cur.step];
  const kind = forceKind || CHAPTERS[(cur.ch - 1) % 4 + 1].kind;   // M1：难度章号循环取材
  aidEl.className = kind === 'line' ? 'open line' : 'open';
  aidEl.innerHTML = kind === 'line' ? numLineSvg(q) : appleAidHtml(q);
}
function closeAid() { aidEl.className = ''; aidEl.innerHTML = ''; aidAuto = false; }
function aidState() {
  const open = aidEl.classList.contains('open');
  return { open: open, kind: open ? (aidEl.classList.contains('line') ? 'line' : 'apple') : null };
}
function countAidToggle(force) {                 // 钩子与按钮共用：无参=切换
  const open = aidEl.classList.contains('open');
  if (force == null && open && aidAuto) {        // 答错自动亮起的辅助：首次按钮点击不关闭（孩子会把救援自己按没）
    aidAuto = false;
    return aidState();
  }
  const want = force == null ? !open : !!force;
  if (want !== open) { if (want) openAid(); else closeAid(); }
  return aidState();
}
/* 数轴逐格跳跃动画（仅教学演示"看"用——演示允许完整解法；平时辅助不代答） */
async function jumpDemo(q, perMs) {
  const svg = aidEl.querySelector('svg.numline');
  if (!svg) return;
  let j = svg.querySelector('.jumper');
  if (!j) {
    const NS = 'http://www.w3.org/2000/svg';
    j = document.createElementNS(NS, 'circle');
    j.setAttribute('class', 'jumper');
    j.setAttribute('r', '8');
    j.setAttribute('fill', '#E8975A');
    j.setAttribute('stroke', '#FFF');
    j.setAttribute('stroke-width', '3');
    svg.appendChild(j);
  }
  const end = q.op === '+' ? q.a + q.b : q.op === '-' ? q.a - q.b : q.a + q.b + q.c;
  let pos = q.a;
  j.setAttribute('cx', 20 + 21 * pos);
  j.setAttribute('cy', 34);
  j.style.opacity = '1';
  sfx('pop');
  while (pos !== end) {                          // 一格一格数（配 pop 音），数到答案
    pos += end > pos ? 1 : -1;
    await wait(perMs || 250 * SPEED);
    j.setAttribute('cx', 20 + 21 * pos);
    j.setAttribute('cy', pos === end ? 40 : 30);
    sfx('pop');
  }
  await wait(420 * SPEED);
  j.style.opacity = '0';
}

/* ================= 幽灵手指（教学"帮"指向数一数按钮） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function scheduleHelpGhost(delay) {              // "帮"：高亮数一数按钮（SPEC §2）
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    ghost.toEl(countBtn);
    ghost.show('tut');
    countBtn.classList.remove('pulse'); void countBtn.offsetWidth; countBtn.classList.add('pulse');
  }, delay == null ? 600 : delay);
}

/* ================= 答题主路径（真实点击 / MATH.pick / autoSolve 共用） ================= */
async function uiPick(i, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  const r = engPick(cur, i);
  if (r === 'again' || r === null) return false;
  lastAct = Date.now();
  const el = ansEl(i);
  if (r === 'right' || r === 'done') {
    if (state.tut === 'help') {                  // 教学"独"：首次答对 → 强化反馈，放手独立完成
      state.tut = 'solo';
      ghost.hide();
      rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
    }
    state.locked = true;
    el.classList.add('right');
    const qm = $id('qm');
    if (qm) { qm.textContent = q.answer; qm.classList.add('ok'); }
    sfx('ok');
    hopBun();
    closeAid();
    renderStep(); renderStops(); moveBun();
    await wait(r === 'done' ? 820 * SPEED : 780 * SPEED);
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                       // 答错：晃动 + 灰掉该按钮 + 正确项高亮 + 辅助自动亮起（不代答，可重点其它）
    el.classList.add('shake', 'wrong');
    const ok = ansEl(q.answerIdx);
    if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    sfx('fail');
    openAid();
    aidAuto = true;
    sayP('mat_hint', VOICE.hint.text);
    if (state.tut === 'help') scheduleHelpGhost(900);
    await wait(430 * SPEED);
  }
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[ci % 4];
}
function winFlow() {
  state.won = true; state.locked = true;
  clearTimeout(helpTimer);
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
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint() });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint() });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                             // 进入今日解锁范围内第一个未通关的关
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur.flat);
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', tutStep: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const fresh = flat === 0 && !sv.levels['1-0'] && !(sv.math && sv.math.tutSeen);
  if (fresh) { tutorialWatch(); return; }
  sayP('mat_hint', VOICE.hint.text);
}

/* ================= 教学：看-帮-独（仅关 1-0 首次；save.math.tutSeen 记住演示已放过）
   看=自动答一题（数轴逐格跳跃动画）→ 重发同一关 → 帮=高亮数一数按钮 → 独=孩子首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP('mat_tut_watch', VOICE.watch.text);
  await wait(650 * SPEED);
  const q = cur.quizzes[0];
  openAid('line');
  await wait(650 * SPEED);
  await jumpDemo(q);
  await wait(350 * SPEED);
  const el = ansEl(q.answerIdx);
  ghost.toEl(el); ghost.show('tut');
  el.classList.add('pulse');
  await wait(850 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  el.classList.remove('pulse');
  state.demo = false; state.locked = false;
  await uiPick(q.answerIdx, true);
  await wait(350 * SPEED);
  const sv = KIDS._save();
  sv.math = sv.math || {};
  sv.math.tutSeen = true;
  KIDS.store.persist();
  sayP('mat_tut_turn', VOICE.turn.text);
  await wait(500 * SPEED);
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', tutStep: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  scheduleHelpGhost(700);
}

/* ================= 底栏交互 ================= */
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
  sayP('mat_hint', VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
countBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || cur.done) return;
  lastAct = Date.now();
  sfx('click');
  countAidToggle();
  if (state.tut === 'help') ghost.hide();        // 孩子已发现工具，收起手指
});
answersEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.ans');
  if (!el) return;
  e.preventDefault();
  uiPick(Number(el.dataset.i));
});

/* ================= 无操作看护：20s 轻声提示目标 / 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayP('mat_hint', VOICE.hint.text);
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    scheduleHelpGhost(0);
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'math', title: '算术小勇士' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(0) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式） ================= */
window.MATH = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, lv: cur.lv, step: cur.step,
      retries: cur.retries, done: cur.done, won: state.won } : null;
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    return { a: q.a, b: q.b, c: q.c, op: q.op, text: q.text + ' = ?',
      answer: q.answer, items: q.items.slice(), answerIdx: q.answerIdx,
      step: cur.step, wrong: (q.wrong || []).slice() };
  },
  pick(i) { return uiPick(i); },
  countAid() { return countAidToggle(); },
  async autoSolve() {                            // UI 路径自动答完当前关（走真实 pick 流程）
    let n = 0;
    while (cur && !cur.done && n++ < 30) {
      const q = cur.quizzes[cur.step];
      await uiPick(q.answerIdx);
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; }
};
