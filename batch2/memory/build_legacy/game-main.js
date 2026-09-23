/* ================= memory 主逻辑 =================
   玩法：翻两张 → 同图案配对收走（coin 音+缩小淡出）；不同 → 停 900ms 看清后盖回（失误计数）
   全部配对 = 过关（星级按失误次数）；5 关 = 1 章
   验收钩子：window.MEM = { currentLevel, cards(), flip(i), autoSolve() }
   verify=1：stub 全部发声 API，引擎直驱 25 关 + 2 个单元，不写档不弹层 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3，第一批用户反馈"太频繁"）；core 章/日/休息语音不受影响 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };

const boardEl = $id('board'), stageEl = $id('stage'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');

let cur = null;                       // 当前关模型（makeLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', tutStep: 0 };
let lastAct = Date.now();
let judgeTimer = null, judgePromise = null;
let ghostReason = null;               // 'tut' | 'scaffold'
let scaffoldActive = false, scaffoldRedemo = false, tutRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 78);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
function buildBoard() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = 'repeat(' + cur.grid.c + ', var(--card))';
  cur.cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.i = i;
    b.setAttribute('aria-label', '第' + (i + 1) + '张牌');
    b.innerHTML = '<div class="card-inner"><div class="face back">' + CARD_BACK + '</div>' +
      '<div class="face front">' + PATTERNS[c.pattern].svg + '</div></div>';
    boardEl.appendChild(b);
  });
  layoutBoard();
}
function cardEl(i) { return boardEl.querySelector('.card[data-i="' + i + '"]'); }
function renderCard(i) {
  const el = cardEl(i), c = cur.cards[i];
  if (!el) return;
  el.classList.toggle('up', c.state === 'up' || c.state === 'gone');
  el.classList.toggle('gone', c.state === 'gone');
}
/* 卡尺寸按 stage 实时算：min(宽/高约束)，clamp [96,168]，间距 16 —— 双 viewport 均 ≥96 */
function layoutBoard() {
  const availW = stageEl.clientWidth - 20, availH = stageEl.clientHeight - 20;
  const g = 16;
  const w = Math.floor((availW - (cur.grid.c - 1) * g) / cur.grid.c);
  const h = Math.floor((availH - (cur.grid.r - 1) * g) / cur.grid.r);
  const size = Math.max(96, Math.min(Math.min(w, h), 168));
  document.documentElement.style.setProperty('--card', size + 'px');
  document.documentElement.style.setProperty('--gap', g + 'px');
}
window.addEventListener('resize', () => { if (cur) layoutBoard(); });

function renderTray() { // 顶栏配对进度盘：本关图案小图标，配对收走后点亮
  const tray = $id('pairs-tray');
  tray.innerHTML = '';
  const order = [];
  cur.cards.forEach(c => { if (order.indexOf(c.pattern) < 0) order.push(c.pattern); });
  order.forEach(p => {
    const d = document.createElement('div');
    d.className = 'mini' + (cur.donePats.indexOf(p) >= 0 ? ' on' : '');
    d.innerHTML = PATTERNS[p].svg;
    tray.appendChild(d);
  });
}
function renderDots() { // 章节点（ch 1 基；无限生成章只画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const ch = Math.floor(cur.flat / CH_LEN) + 1, sv = KIDS._save();
  for (let c = 0; c < ch; c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[(c + 1) + '-' + l]);
    i.className = done ? 'done' : (c === ch - 1 ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 幽灵手指（教学"帮" + 3 连失误支架共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhost(i, reason) {
  if (VERIFY) return;
  const el = cardEl(i);
  if (!el) return;
  ghost.toEl(el); ghost.show(reason);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}

/* ================= 翻牌主路径（真实点击 / MEM.flip / autoSolve 共用） ================= */
function tapCard(i) {
  if (!cur || state.locked || state.won || state.demo) return false;
  if (!engFlip(cur, i)) return false;
  lastAct = Date.now();
  hideScaffold();
  renderCard(i);
  sfx('pop');
  if (state.tut === 'help' && state.tutStep === 0) { // 教学"帮"：孩子翻了第一张 → 指向它的配对
    state.tutStep = 1;
    setTimeout(() => { if (state.tut === 'help') pointGhost(engPartner(cur, i), 'tut'); }, 550);
  }
  const ups = engUps(cur);
  if (ups.length === 2) {
    state.locked = true;
    const a = ups[0].id, b = ups[1].id;
    const isMatch = ups[0].pattern === ups[1].pattern;
    if (!isMatch) { cardEl(a).classList.add('miss'); cardEl(b).classList.add('miss'); }
    judgePromise = new Promise(res => {
      judgeTimer = setTimeout(() => { resolveJudge(a, b); res(); }, isMatch ? 420 : 900); // 失误停 900ms 让孩子看清
    });
  }
  return true;
}
function resolveJudge(a, b) {
  const r = engJudge(cur);
  [a, b].forEach(i => { const el = cardEl(i); if (el) el.classList.remove('miss'); renderCard(i); });
  state.locked = false;
  judgePromise = null;
  if (r === 'match') {
    renderTray();
    sfx('coin');
    if (state.tut === 'help') { // 教学"独"：首次配对成功 → 强化反馈，放手独立完成
      state.tut = 'solo';
      ghost.hide();
      sfx('ok');
      hopRabbit();
    }
    if (engWon(cur)) { winFlow(); return; }
  } else {
    sfx('fail'); // 柔和低音，不惊吓
    if (cur.streak >= 3) maybeScaffold(); // 连续 3 次失误 → 支架
    else if (state.tut === 'help') setTimeout(() => { if (state.tut === 'help' && engUps(cur).length === 0) pointGhost(tutTarget(), 'tut'); }, 700);
  }
}

/* ================= 支架：3 连失误 + 场上有已知配对（翻过又盖回） ================= */
function maybeScaffold() {
  const kp = engKnownPair(cur);
  if (!kp) return;
  scaffoldActive = true;
  scaffoldRedemo = false;
  pointGhost(kp.cards[0].id, 'scaffold');
  sayP('mem_hint', '找到一样的两张');
}
function hideScaffold() {
  if (ghostReason === 'scaffold') ghost.hide();
  scaffoldActive = false;
}

/* ================= 教学：看-帮-独（仅关 1-0 首次，save.mem.tutSeen 记住演示已放过） ================= */
function tutTarget() { // "帮"阶段指向：有牌朝上→其配对；否则第一张盖着的牌
  const ups = engUps(cur);
  if (ups.length === 1) return engPartner(cur, ups[0].id);
  for (let i = 0; i < cur.cards.length; i++) if (cur.cards[i].state === 'down') return i;
  return 0;
}
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP('mem_tut_watch', '看！翻一翻，找到一样的两张');
  await wait(700);
  const i = 0, j = engPartner(cur, 0); // 确定性关卡：演示对 = 第 0 张与它的配对
  engFlip(cur, i); engFlip(cur, j);
  renderCard(i); renderCard(j);
  sfx('pop');
  await wait(1100);
  engJudge(cur);
  renderCard(i); renderCard(j);
  renderTray();
  sfx('coin');
  await wait(850);
  const sv = KIDS._save();
  sv.mem = sv.mem || {};
  sv.mem.tutSeen = true;
  KIDS.store.persist();
  sayP('mem_tut_turn', '现在你来试一试');
  await wait(600);
  /* 重新发同一关（确定性布局一致——孩子刚看过的对还在原位），进入"帮" */
  const flat = cur.flat;
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'help', tutStep: 0 };
  tutRedemo = false;
  buildBoard(); renderTray(); renderDots();
  lastAct = Date.now();
  setTimeout(() => { if (state.tut === 'help') pointGhost(tutTarget(), 'tut'); }, 700);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
const HINTS = { 1: '更多张牌的配对哦', 2: '四四方方的大牌阵来啦', 3: '牌更多啦，看谁记得住' };
const GEN_HINTS = ['更多图案的大牌阵哦', '更大的翻牌挑战哦', '图案更多的牌阵哦', '超强记忆力挑战哦'];
function nextHint(ci) {
  if (ci == null) ci = Math.floor(KIDS.calendar.limit(Infinity) / CH_LEN);
  if (ci >= 4) return '明天有' + GEN_HINTS[(ci - 4) % GEN_HINTS.length];
  return HINTS[ci] || '有新的关卡哦';
}
function winFlow() {
  state.won = true; state.locked = true;
  clearTimeout(judgeTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  KIDS.ui.celebrate(stars).then(() => {
    const ci = Math.floor(cur.flat / CH_LEN), ch = ci + 1, lv = cur.flat % CH_LEN;
    const pr = KIDS.level.pass(ch, lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity); // 关卡无限：日历不设内容上限（每日新关+家长加关由 core 控制）
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: ch, stars: stars5, nextHint: nextHint(ci + 1) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() { // 进入今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur.flat); // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  clearTimeout(judgeTimer);
  judgePromise = null;
  ghost.hide();
  scaffoldActive = false;
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', tutStep: 0 };
  tutRedemo = false;
  lastAct = Date.now();
  buildBoard(); renderTray(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const fresh = flat === 0 && !sv.levels['1-0'] && !(sv.mem && sv.mem.tutSeen);
  if (fresh) { tutorialWatch(); return; }
  sayP('mem_hint', '找到一样的两张');
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
  sayP('mem_hint', '找到一样的两张');
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
boardEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.card');
  if (!el) return;
  e.preventDefault();
  tapCard(Number(el.dataset.i));
});

/* ================= 无操作看护：20s 轻声提示目标 / 支架与教学 5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayP('mem_hint', '找到一样的两张');
    lastAct = Date.now();
    return;
  }
  if (idle > 5000) {
    if (scaffoldActive && !scaffoldRedemo) { // 支架重演示一次
      scaffoldRedemo = true;
      const kp = engKnownPair(cur);
      if (kp) pointGhost(kp.cards[0].id, 'scaffold');
    } else if (state.tut === 'help' && !tutRedemo && ghostReason !== 'tut') { // 教学"帮"重演示一次
      tutRedemo = true;
      pointGhost(tutTarget(), 'tut');
    }
  }
}, 1000);

/* ================= ?verify=1 自检 =================
   ① 25 关（静态 20 + 生成关 20-24 抽查）结构校验：确定性 / 图案恰好成对 / 网格合法
   ② autoSolve 完美序列引擎直驱跑通（步数=牌数、0 失误、3 星）
   ③ 单元：星级映射（含永不 0 星）/ 已知配对（翻过又盖回 → 支架依据）
   ④ 布局抽查：4×5 最密网格下首卡 ≥96、无横向溢出 */
function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {};
  let npass = 0, total = 0;
  const strip = L => ({ grid: L.grid, pairs: L.pairs, cards: L.cards.map(c => [c.id, c.pattern]) });
  for (let flat = 0; flat < 25; flat++) {
    total++;
    const L1 = makeLevel(flat), L2 = makeLevel(flat);
    const det = JSON.stringify(strip(L1)) === JSON.stringify(strip(L2));
    const counts = {};
    L1.cards.forEach(c => { counts[c.pattern] = (counts[c.pattern] || 0) + 1; });
    const paired = Object.keys(counts).length === L1.pairs && Object.keys(counts).every(k => counts[k] === 2);
    const gridOk = L1.cards.length === L1.grid.r * L1.grid.c && (L1.grid.r * L1.grid.c) % 2 === 0 &&
      [2, 3, 4].indexOf(L1.grid.r) >= 0 && [3, 4, 5].indexOf(L1.grid.c) >= 0;
    const seq = perfectSequence(L1); // autoSolve：完美记忆策略引擎直驱
    seq.forEach(i => { engFlip(L1, i); engJudge(L1); });
    const solved = engWon(L1);
    const stepsOk = seq.length === L1.cards.length && seq.length % 2 === 0;
    const ok = det && paired && gridOk && solved && stepsOk && L1.misses === 0;
    if (ok) npass++;
    const rec = { pairs: L1.pairs, grid: L1.grid.r + 'x' + L1.grid.c, deterministic: det, paired, gridOk, solved, steps: seq.length, misses: L1.misses, ok };
    if (flat < 20) levels[keyOf(flat)] = rec; else gen[flat] = Object.assign({ key: keyOf(flat) }, rec);
  }
  /* 单元 1：星级映射（pairs=6：≤9 错 3 星 / ≤15 错 2 星 / 更多 1 星，永不 0） */
  total++;
  const starCase = m => engStars({ pairs: 6, misses: m });
  const starsOk = starCase(0) === 3 && starCase(9) === 3 && starCase(10) === 2 &&
    starCase(15) === 2 && starCase(16) === 1 && starCase(99) === 1 &&
    [starCase(0), starCase(9), starCase(10), starCase(15), starCase(16), starCase(99)].every(s => s >= 1);
  if (starsOk) npass++;
  units.stars = { ok: starsOk, map: { 0: starCase(0), 9: starCase(9), 10: starCase(10), 15: starCase(15), 16: starCase(16), 99: starCase(99) } };
  /* 单元 2：失误盖回 → 图案进 seen → 已知配对可查（支架依据）；未见过的图案不返回 */
  total++;
  const L = makeLevel(0);
  const i0 = 0, i1 = L.cards.findIndex((c, i) => i > 0 && c.pattern !== L.cards[0].pattern);
  engFlip(L, i0); engFlip(L, i1);
  const judge = engJudge(L);
  const coveredBack = judge === 'miss' && L.cards[i0].state === 'down' && L.cards[i1].state === 'down';
  const kp = engKnownPair(L);
  const kpOk = !!kp && kp.cards.length === 2 && kp.cards.every(c => c.state === 'down') &&
    L.seen.indexOf(kp.pattern) >= 0;
  const unseenOk = L.seen.length === 2; // 只见过翻过的两种图案
  const scaffoldOk = coveredBack && kpOk && unseenOk;
  if (scaffoldOk) npass++;
  units.knownPair = { missCoveredBack: coveredBack, knownPairFound: kpOk, seenCount: L.seen.length, ok: scaffoldOk };
  /* 布局抽查：以 4×5 最密网格（flat=11）实建 DOM 量卡尺寸 */
  cur = makeLevel(11);
  buildBoard(); renderTray();
  const c0 = boardEl.querySelector('.card');
  const r0 = c0.getBoundingClientRect();
  const de = document.documentElement;
  const layout = {
    overflowX: de.scrollWidth - window.innerWidth,
    cardW: Math.round(r0.width), cardH: Math.round(r0.height),
    cards: cur.cards.length
  };
  const layoutOk = layout.overflowX <= 0 && layout.cardW >= 96 && layout.cardH >= 96 && layout.cards === 20;
  const out = { game: 'memory', total, pass: npass, layoutOk, layout, levels, gen, units };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

/* ================= 启动 ================= */
buildStatic();
if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function() {};
  KIDS.audio.sfx = function() {};
  KIDS.speak = function() {};
  KIDS.voice.play = function() {};
  KIDS.voice.queue = function() {};
  runVerify();
} else {
  KIDS.init({ game: 'memory', title: '记忆翻牌配对' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：先收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(null) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子 ================= */
async function autoSolveExec(seq) {
  for (let k = 0; k < seq.length; k++) {
    if (state.won) break;
    tapCard(seq[k]);
    if (judgePromise) await judgePromise;
    else await wait(140);
  }
}
window.MEM = {
  get currentLevel() {
    return cur ? {
      flat: cur.flat,
      ch: Math.floor(cur.flat / CH_LEN) + 1,   // 章号 1 基
      lv: cur.flat % CH_LEN,
      grid: cur.grid, pairs: cur.pairs, misses: cur.misses, matched: cur.matched
    } : null;
  },
  get cards() { return cur ? cur.cards.map(c => ({ id: c.id, pattern: c.pattern, state: c.state })) : []; },
  flip(i) { return tapCard(i); },
  async autoSolve(exec) {
    const seq = perfectSequence(cur);
    if (exec) await autoSolveExec(seq);
    return seq;
  },
  get tutorial() { return state.tut; }
};
