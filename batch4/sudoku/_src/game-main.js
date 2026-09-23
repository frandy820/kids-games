/* ================= sudoku 主逻辑 =================
   玩法：点空格选中 → 底部动物大按钮填入；再点已填格=清除；
   冲突=该格+冲突源格红框轻晃 1s（可改，零惩罚）；填满且无冲突=过关。
   提示每关 3 次（唯一确定格+动物 pulse）；星级首次提示豁免：0-1 次=3★ / 2-3 次=2★ / 冲突多=1★。
   验收钩子：window.SUD = { currentLevel, board(拷贝), solution(拷贝), fill, hint, autoSolve }
   verify=1：stub 全部发声 API，引擎直驱 40 关 + 5 单元 + 布局，不写档不弹层 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援语音不受 flat 门限制（7 岁半玩家评估 P1：flat≥3 静置 20s 零救援——常规提示保持 sayP 防语音过频回潮） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };

const boardEl = $id('board'), stageEl = $id('stage'), animalsEl = $id('animals'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hintBtn = $id('btn-hint'), lampsEl = $id('hint-lamps');

let cur = null;                       // 当前关模型（makeLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let ghostReason = null, tutRedemo = false;
let conflictTimer = null;
let lastFill = null;                            // 最近一次填入 {i,t}：双击清除保护（评估 P2 连点误清）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hintBtn.innerHTML = ICONS.lamp;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 78);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
function cellEl(i) { return boardEl.querySelector('.cell[data-i="' + i + '"]'); }
function abtnEl(v) { return animalsEl.querySelector('.abtn[data-a="' + v + '"]'); }

function buildBoard() {
  boardEl.innerHTML = '';
  boardEl.style.setProperty('--cols', cur.n);
  const n = cur.n;
  for (let i = 0; i < n * n; i++) {
    const r = (i / n) | 0, c = i % n;
    const b = document.createElement('button');
    b.className = 'cell';
    b.dataset.i = i;
    if (c > 0 && c % cur.boxC === 0) b.classList.add('bl');  /* 宫左边界 */
    if (r > 0 && r % cur.boxR === 0) b.classList.add('bt');  /* 宫上边界 */
    if (((r / cur.boxR | 0) + (c / cur.boxC | 0)) % 2) b.classList.add('bx1'); /* 宫棋盘交替底 */
    boardEl.appendChild(b);
  }
  layoutBoard();
  for (let i = 0; i < n * n; i++) renderCell(i);
  renderSel();
}
function renderCell(i) {
  const el = cellEl(i), v = cur.cells[i];
  if (!el) return;
  el.classList.toggle('given', cur.given[i]);
  el.classList.toggle('byuser', !cur.given[i] && v >= 0);
  el.innerHTML = v >= 0 ? ANIMALS[v].svg : '<div class="ph">' + ICONS.paw + '</div>';
}
function renderSel() {
  boardEl.querySelectorAll('.cell.sel').forEach(e => e.classList.remove('sel'));
  if (cur && cur.sel >= 0) { const el = cellEl(cur.sel); if (el) el.classList.add('sel'); }
}
function renderAnimals() {
  animalsEl.innerHTML = '';
  for (let v = 0; v < cur.n; v++) {
    const b = document.createElement('button');
    b.className = 'abtn';
    b.dataset.a = v;
    b.setAttribute('aria-label', ANIMALS[v].name);
    b.innerHTML = ANIMALS[v].svg;
    animalsEl.appendChild(b);
  }
  layoutBoard();
}
function renderLamps() {
  lampsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('i');
    if (cur && i < cur.hintsUsed) d.className = 'off';
    lampsEl.appendChild(d);
  }
  hintBtn.classList.toggle('spent', !!cur && cur.hintsUsed >= cur.hints);
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
/* 尺寸按 stage/animals 实时算：4×4 下限 72、6×6 下限 64（视觉=命中外扩）、动物 ≥64 */
function layoutBoard() {
  if (!cur) return;
  const availW = stageEl.clientWidth - 30, availH = stageEl.clientHeight - 30;
  const g = 10;
  const minC = cur.n === 4 ? 72 : 64, maxC = cur.n === 4 ? 150 : 108;
  const w = Math.floor((availW - (cur.n - 1) * g) / cur.n);
  const h = Math.floor((availH - (cur.n - 1) * g) / cur.n);
  const size = Math.max(minC, Math.min(Math.min(w, h), maxC));
  document.documentElement.style.setProperty('--cell', size + 'px');
  const aw = Math.floor((animalsEl.clientWidth - 32 - (cur.n - 1) * 16) / cur.n);
  document.documentElement.style.setProperty('--abtn', Math.max(64, Math.min(aw, 104)) + 'px');
}
window.addEventListener('resize', () => { if (cur) layoutBoard(); });

/* ================= 幽灵手指（教学"帮"） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhost(target, reason) {
  if (VERIFY) return;
  const el = cellEl(target.cell), ab = abtnEl(target.animal);
  if (!el) return;
  ghost.toEl(el); ghost.show(reason);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  if (ab) { ab.classList.remove('pulse'); void ab.offsetWidth; ab.classList.add('pulse'); }
  setTimeout(() => { ghost.press(); }, 800);
}
function clearPulse() {
  boardEl.querySelectorAll('.cell.pulse').forEach(e => e.classList.remove('pulse'));
  animalsEl.querySelectorAll('.abtn.pulse').forEach(e => e.classList.remove('pulse'));
}

/* ================= 冲突标记（红框轻晃 1s，可改零惩罚） ================= */
function markConflict(ids) {
  clearTimeout(conflictTimer);
  boardEl.querySelectorAll('.cell.conflict').forEach(e => e.classList.remove('conflict'));
  ids.forEach(i => { const el = cellEl(i); if (el) el.classList.add('conflict'); });
  conflictTimer = setTimeout(() => {
    boardEl.querySelectorAll('.cell.conflict').forEach(e => e.classList.remove('conflict'));
  }, 1000);
}

/* ================= 填入主路径（真实点击 / SUD.fill / autoSolve 共用） ================= */
function doFill(i, v) {
  if (!cur || cur.won || state.locked || state.demo) return false;
  if (!cur.given[i] && cur.cells[i] < 0 && v >= 0 && v < cur.n) {
    cur.cells[i] = v;
    lastFill = { i: i, t: Date.now() };
    renderCell(i);
    const conf = engConflictsAt(cur, i);
    if (conf.length) {
      cur.wrongs++;
      markConflict([i].concat(conf));
      sfx('fail');
      sayP('sud_hint', '每行每列都不能重复哦');
    } else {
      sfx('pop');
      if (state.tut === 'help') { // 教学"独"：首次正确填入 → 强化反馈，放手独立完成
        state.tut = 'solo';
        ghost.hide();
        clearPulse();
        sfx('ok');
        hopRabbit();
      }
    }
    if (engWon(cur)) winFlow();
    return true;
  }
  return false;
}
function tapCell(i) {
  if (!cur || state.locked || state.won || state.demo) return false;
  lastAct = Date.now();
  if (cur.given[i]) { // 给定格不可改：轻摆示意
    const el = cellEl(i);
    if (el) { el.classList.remove('fixedwig'); void el.offsetWidth; el.classList.add('fixedwig'); }
    return false;
  }
  if (cur.cells[i] >= 0) { // 再点已填格=清除（可改零惩罚）；填入后 250ms 内的连点忽略（防手滑瞬间清掉）
    if (lastFill && lastFill.i === i && Date.now() - lastFill.t < 250) return false;
    cur.cells[i] = -1;
    if (cur.sel === i) cur.sel = -1;
    renderCell(i); renderSel();
    sfx('click');
    return true;
  }
  cur.sel = (cur.sel === i) ? -1 : i;
  renderSel();
  sfx('click');
  return true;
}
function tapAnimal(v) {
  if (!cur || state.locked || state.won || state.demo) return false;
  if (cur.sel < 0) { // 无选中点动物：轻晃示意先选格子（评估 P2 静默无反馈）
    const el = abtnEl(v);
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
    sfx('click');
    return false;
  }
  lastAct = Date.now();
  const i = cur.sel;
  cur.sel = -1;
  renderSel();
  return doFill(i, v);
}

/* ================= 提示（每关 3 次） ================= */
function engHelpTarget(L) { // 不计次的"可确定格"（教学"帮"与提示共用判定）
  const N = L.n * L.n;
  for (let i = 0; i < N; i++) {
    if (L.cells[i] >= 0) continue;
    const cands = engCandidatesGivens(L, i);
    if (cands.length === 1) return { cell: i, animal: cands[0] };
  }
  for (let i = 0; i < N; i++) if (L.cells[i] < 0) return { cell: i, animal: L.sol[i] };
  return null;
}
function doHint() {
  if (VERIFY || !cur || state.locked || state.won || state.demo) return null;
  const h = engHint(cur);
  if (!h) return null;
  cur.hintsUsed++;
  lastAct = Date.now();
  renderLamps();
  clearPulse();
  pointGhost(h, 'hint');
  sayP('sud_hint', '每行每列都不能重复哦');
  return h;
}

/* ================= 教学：看-帮-独（仅关 1-0 首次，save.sud.tutSeen 记住演示已放过） =================
   看 = 自动填 1 格，含冲突演示：先放错（晃一下）再放对 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP('sud_tut_watch', '看！每行每列都要不一样');
  await wait(700);
  let i0 = -1;
  for (let i = 0; i < cur.cells.length; i++) if (cur.cells[i] < 0) { i0 = i; break; }
  /* 找一个必冲突的错误动物（演示红框晃动） */
  let wrongV = -1;
  for (let v = 0; v < cur.n && wrongV < 0; v++) {
    if (v === cur.sol[i0]) continue;
    cur.cells[i0] = v;
    if (engConflictsAt(cur, i0).length) wrongV = v;
  }
  if (wrongV < 0) wrongV = (cur.sol[i0] + 1) % cur.n;
  cur.cells[i0] = wrongV;
  renderCell(i0);
  markConflict([i0].concat(engConflictsAt(cur, i0)));
  sfx('fail');
  await wait(1500);
  cur.cells[i0] = -1;
  renderCell(i0);
  await wait(400);
  cur.cells[i0] = cur.sol[i0];
  renderCell(i0);
  sfx('coin');
  await wait(900);
  const sv = KIDS._save();
  sv.sud = sv.sud || {};
  sv.sud.tutSeen = true;
  KIDS.store.persist();
  sayP('sud_tut_turn', '你来填一填');
  await wait(600);
  /* 重新发同一关（确定性布局一致），进入"帮" */
  const flat = cur.flat;
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  tutRedemo = false;
  buildBoard(); renderLamps(); renderDots();
  lastAct = Date.now();
  setTimeout(() => { if (state.tut === 'help') pointGhost(engHelpTarget(cur), 'tut'); }, 700);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
const HINTS = { 1: '洞更多的四方格来啦', 2: '六方格大棋盘来啦', 3: '洞更多的六方格哦', 4: '新的数独挑战哦' };
function nextHint(ci) {
  /* 参数=下一章号（1 基）；反方审查 M1/m5：null 分支原少 +1（指向刚打完的章），GEN 文案按下一章实际规格取（原 (ci-4)%4 与 4×4/6×6 交替错位） */
  if (ci == null) ci = Math.floor(KIDS.calendar.limit(Infinity) / CH_LEN) + 1;
  if (ci >= 5) {
    const s = specOf((ci - 1) * CH_LEN);        // 下一章首关规格（生成关 4×4/6×6 交替）
    return (s.n === 6 ? '六方格大棋盘' : '四方格小棋盘') + (s.holes >= 11 ? '，洞洞更多哦' : '的新挑战哦');
  }
  return HINTS[ci] || '有新的关卡哦';
}
function winFlow() {
  state.won = true; state.locked = true; cur.won = true;
  ghost.hide();
  /* 评估 P2：首次提示不扣星（第一次用提示=学玩法，豁免 1 次）——星级按有效次数 hintsUsed-1 计 */
  const stars = engStars(Math.max(0, cur.hintsUsed - 1), cur.wrongs);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档（反方审查 M2，对齐 clock/times）
  KIDS.ui.celebrate(stars).then(() => {
    const ci = Math.floor(cur.flat / CH_LEN), ch = ci + 1, lv = cur.flat % CH_LEN;
    const pr = KIDS.level.pass(ch, lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity); // 关卡无限：日历不设内容上限
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
  ghost.hide();
  clearTimeout(conflictTimer);
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  tutRedemo = false;
  lastAct = Date.now();
  buildBoard(); renderAnimals(); renderLamps();
  if (VERIFY) return;
  renderDots();
  const sv = KIDS._save();
  const fresh = flat === 0 && !sv.levels['1-0'] && !(sv.sud && sv.sud.tutSeen);
  if (fresh) { tutorialWatch(); return; }
  sayP('sud_hint', '每行每列都不能重复哦');
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
  sayP('sud_hint', '每行每列都不能重复哦');
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
hintBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  doHint();
});
boardEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.cell');
  if (!el) return;
  e.preventDefault();
  tapCell(Number(el.dataset.i));
});
animalsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.abtn');
  if (!el) return;
  e.preventDefault();
  tapAnimal(Number(el.dataset.a));
});

/* ================= 无操作看护：20s 轻声提示目标 / 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayR('sud_hint', '每行每列都不能重复哦');    // 救援语音不受 flat 门（评估 P1）
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !tutRedemo && ghostReason !== 'tut') {
    tutRedemo = true;
    pointGhost(engHelpTarget(cur), 'tut');
  }
}, 1000);

/* ================= ?verify=1 自检 =================
   ① 40 关（静态 20 + 生成 20）全量：确定性 / 唯一解（求解器计数==1）/ 完整解约束
     （模板+同构变换有效）/ 挖洞数在 SPEC 区间 / autoSolve 引擎直驱通关
   ② 单元：写死模板本身合法 / 宫边界（2×2、2×3 同宫冲突、跨宫不冲突、行/列冲突）
   ③ 单元：提示=唯一确定格且动物=解值、3 次用尽返回 null、星级映射（永不 0 星）
   ④ 单元：冲突填入→可清除（零惩罚路径）
   ⑤ 布局：4×4 格 ≥72px、6×6 格 ≥64px（命中外扩=格本体 ≥64）、动物按钮 ≥64px、无横向溢出 */
function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {};
  let npass = 0, total = 0;
  const strip = L => JSON.stringify({ n: L.n, holes: L.holes, cells: L.cells, given: L.given, sol: L.sol });
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = makeLevel(flat), L2 = makeLevel(flat);
    const det = strip(L1) === strip(L2);
    const cfg = SIZES[L1.n];
    const unique = countSolutions(L1.cells, cfg, 2) === 1;
    const solutionValid = validateFull(L1.sol, cfg).ok;
    const holeMin = L1.n === 4 ? 5 : 9, holeMax = L1.n === 4 ? 7 : 12;
    const holesInRange = L1.holes >= holeMin && L1.holes <= holeMax;
    const givensMatch = L1.given.every((g, i) => g === (L1.cells[i] >= 0));
    const solMatch = L1.cells.every((v, i) => v < 0 || v === L1.sol[i]);
    const autoSolved = engAutoFill(L2);
    const ok = det && unique && solutionValid && holesInRange && givensMatch && solMatch && autoSolved;
    if (ok) npass++;
    const rec = {
      n: L1.n, holes: L1.holes, deterministic: det, unique: unique,
      solutionValid: solutionValid, holesInRange: holesInRange, autoSolved: autoSolved, ok: ok
    };
    if (flat < 20) levels[keyOf(flat)] = rec;
    else gen[flat] = Object.assign({ key: keyOf(flat) }, rec);
  }
  /* 单元 1：写死模板本身合法（4 个全验） */
  total++;
  let tplOk = true;
  [TEMPLATES[4][0], TEMPLATES[4][1]].forEach(t => { if (!validateFull(t, SIZES[4]).ok) tplOk = false; });
  [TEMPLATES[6][0], TEMPLATES[6][1]].forEach(t => { if (!validateFull(t, SIZES[6]).ok) tplOk = false; });
  if (tplOk) npass++;
  units.templates = { ok: tplOk, checked: 4 };
  /* 单元 2：宫/行/列约束边界（同宫异行异列=冲突；跨宫异行异列=不冲突；同行/同列=冲突） */
  total++;
  const mk = n => ({ n: n, boxR: SIZES[n].boxR, boxC: SIZES[n].boxC, cells: new Array(n * n).fill(-1), sol: new Array(n * n).fill(0) });
  const pairConf = (n, a, b) => { const L = mk(n); L.cells[a] = 0; L.cells[b] = 0; return engConflictsAt(L, a).length > 0; };
  const b6 = mk(6);
  const boxChecks = {
    '4x4 same-box diff-row-col': pairConf(4, 0, 5) === true,        /* r0c0 vs r1c1 同宫 */
    '4x4 cross-box no-conflict': pairConf(4, 0, 6) === false,       /* r0c0 vs r1c2 跨宫 */
    '6x6 same-box diff-row-col': pairConf(6, 0, 8) === true,        /* r0c0 vs r1c2 同宫 */
    '6x6 cross-box no-conflict': pairConf(6, 0, 9) === false && pairConf(6, 0, 14) === false, /* r1c3 / r2c2 跨宫 */
    'same-row conflict': pairConf(6, 0, 1) === true,
    'same-col conflict': pairConf(6, 0, 6) === true
  };
  const boxOk = Object.keys(boxChecks).every(k => boxChecks[k]);
  if (boxOk) npass++;
  units.boxBoundary = { ok: boxOk, checks: boxChecks, probe: b6.n };
  /* 单元 3：提示与星级 */
  total++;
  const HL = makeLevel(2);
  const h0 = engHint(HL);
  let singleOk = !!h0 && h0.animal === HL.sol[h0.cell] && HL.cells[h0.cell] < 0;
  let allSingleMatch = true;
  for (let i = 0; i < HL.cells.length; i++) {
    if (HL.cells[i] >= 0) continue;
    const cands = engCandidatesGivens(HL, i);
    if (cands.length === 1 && cands[0] !== HL.sol[i]) allSingleMatch = false; /* 唯一候选必=解值 */
  }
  HL.hintsUsed = 3;
  const hintExhausted = engHint(HL) === null;
  const starMap = { h0w0: engStars(0, 0), h1: engStars(1, 0), h2: engStars(2, 0), h3: engStars(3, 0), w6: engStars(0, 6), h2w5: engStars(2, 5) };
  /* 评估 P2 修：winFlow 星级按有效次数（首次豁免）——1 次提示=3 星、2 次=2 星、3 次=2 星 */
  const freeMap = { f1: engStars(Math.max(0, 1 - 1), 0), f2: engStars(Math.max(0, 2 - 1), 0), f3: engStars(Math.max(0, 3 - 1), 0) };
  const starsOk = starMap.h0w0 === 3 && starMap.h1 === 2 && starMap.h2 === 2 && starMap.h3 === 1 &&
    starMap.w6 === 1 && starMap.h2w5 === 2 &&
    freeMap.f1 === 3 && freeMap.f2 === 2 && freeMap.f3 === 2 &&
    Object.keys(starMap).every(k => starMap[k] >= 1 && starMap[k] <= 3);
  const hintOk = singleOk && allSingleMatch && hintExhausted && starsOk;
  if (hintOk) npass++;
  units.hintStars = { ok: hintOk, singleOk: singleOk, allSingleMatch: allSingleMatch, hintExhausted: hintExhausted, starMap: starMap };
  /* 单元 4：冲突填入 → 清除（零惩罚可改路径） */
  total++;
  const CL = makeLevel(1);
  let ci = -1;
  for (let i = 0; i < CL.cells.length; i++) if (!CL.given[i]) { ci = i; break; }
  let cw = -1;
  for (let v = 0; v < CL.n && cw < 0; v++) {
    if (v === CL.sol[ci]) continue;
    CL.cells[ci] = v;
    if (engConflictsAt(CL, ci).length) cw = v;
  }
  const wrongHasConflict = cw >= 0 && engConflictsAt(CL, ci).length > 0 && !engWon(CL);
  CL.cells[ci] = -1;
  const clearedOk = engConflictsAt(CL, ci).length === 0;
  for (let i = 0; i < CL.cells.length; i++) if (CL.cells[i] < 0) CL.cells[i] = CL.sol[i]; /* 补齐其余空格 */
  const fixedOk = !engAnyConflict(CL) && CL.cells.every(v => v >= 0) && engWon(CL); /* 填满且无冲突=必胜 */
  const conflictPathOk = wrongHasConflict && clearedOk && fixedOk;
  if (conflictPathOk) npass++;
  units.conflictPath = { ok: conflictPathOk, wrongHasConflict: wrongHasConflict, clearedOk: clearedOk, fixedOk: fixedOk };
  /* ⑤ 布局：实建 4×4 与 6×6 量尺寸 */
  const measure = () => {
    const cr = boardEl.querySelector('.cell').getBoundingClientRect();
    const ar = animalsEl.querySelector('.abtn').getBoundingClientRect();
    const de = document.documentElement;
    return {
      overflowX: de.scrollWidth - de.clientWidth,
      cellW: Math.round(cr.width), cellH: Math.round(cr.height),
      abtnW: Math.round(ar.width), abtnH: Math.round(ar.height)
    };
  };
  cur = makeLevel(0); buildBoard(); renderAnimals(); renderLamps();
  const four = measure();
  cur = makeLevel(10); buildBoard(); renderAnimals(); renderLamps();
  const six = measure();
  const layout = { four: four, six: six };
  const layoutOk = four.overflowX <= 0 && six.overflowX <= 0 &&
    four.cellW >= 72 && four.cellH >= 72 &&
    six.cellW >= 64 && six.cellH >= 64 &&
    four.abtnW >= 64 && four.abtnH >= 64 && six.abtnW >= 64 && six.abtnH >= 64;
  const out = { game: 'sudoku', total: total, pass: npass, layoutOk: layoutOk, layout: layout, levels: levels, gen: gen, units: units };
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
  KIDS.init({ game: 'sudoku', title: '数独小动物' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：先收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(null) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（全部返回拷贝非活引用） ================= */
window.SUD = {
  get currentLevel() {
    return cur ? {
      flat: cur.flat,
      ch: Math.floor(cur.flat / CH_LEN) + 1,   // 章号 1 基
      lv: cur.flat % CH_LEN,
      n: cur.n, holes: cur.holes, hintsUsed: cur.hintsUsed, wrongs: cur.wrongs, won: cur.won
    } : null;
  },
  get board() { // 拷贝：格值/给定标记（tangram 实证坑——不返回活引用）
    return cur ? { n: cur.n, cells: cur.cells.slice(), given: cur.given.slice(), sel: cur.sel } : null;
  },
  get solution() { return cur ? cur.sol.slice() : null; },
  fill(i, v) { return doFill(i, v); },
  clear(i) {
    if (!cur || cur.won || state.locked || state.demo || cur.given[i] || cur.cells[i] < 0) return false;
    cur.cells[i] = -1;
    if (cur.sel === i) cur.sel = -1;
    renderCell(i); renderSel();
    return true;
  },
  hint() { return doHint(); },
  async autoSolve() {
    if (!cur || cur.won) return false;
    for (let i = 0; i < cur.cells.length; i++) {
      if (cur.given[i] || cur.cells[i] >= 0) continue;
      doFill(i, cur.sol[i]);
      if (!VERIFY) await wait(60);
      if (cur.won) break;
    }
    return !!cur && cur.won;
  },
  get tutorial() { return state.tut; }
};
