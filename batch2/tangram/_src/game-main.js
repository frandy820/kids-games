/* ================= tangram 主逻辑 =================
   玩法：拖动=移动（解除已就位）；无位移短按（<8px）=旋转 45°；
   落手就近吸附（质心距<0.6 且旋转等价，咔哒音）；全部就位=过关（星级按多余操作数）
   验收钩子：window.TAN = { currentLevel, pieces(), rotate(i), place(i,x,y), autoSolve() }
   verify=1：stub 全部发声 API，模板结构校验 + 吸附单元 + autoSolve 直驱，不写档不弹层 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3，第一批用户反馈"太频繁"）；core 章/日/休息语音不受影响 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };

const svgEl = $id('board'), stageEl = $id('stage'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');
const SVGNS = 'http://www.w3.org/2000/svg';

/* ---------- 内嵌图标（与第一批风格一致：圆润 2.5px 描边） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="34" height="34"><polygon points="8,26 22,8 36,26" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/><polygon points="14,26 22,15 30,26" fill="#F2B8C6" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  replay: '<svg viewBox="0 0 44 44" width="44" height="44"><path d="M22 8a14 14 0 1 1-12.2 7.1" fill="none" stroke="#4A3B2E" stroke-width="3.6" stroke-linecap="round"/><path d="M6 6l4.5 10L21 12z" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 48 56" width="64" height="76"><path d="M20 6a7 7 0 0 1 14 0v20l7.5 2.6c4 1.4 6.5 5.2 6.5 9.2V44c0 6.6-5.4 12-12 12H22c-4 0-7.7-2-9.9-5.4L4.6 39.5c-1.8-2.9-.9-6.7 2-8.5 2.5-1.6 5.8-1.1 7.8 1L18 35z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.5" stroke-linejoin="round"/></svg>'
};

let cur = null;                       // 当前关模型（makeLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', tutStep: 0 };
let lastAct = Date.now();
let ghostReason = null;
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
/* 每关一次全量建 DOM：托盘带 + 目标虚线槽(slot) + 块(piece)
   块 g transform = translate(x,y) rotate(r*45°)（顶点 0=锚点，与引擎数学一致） */
function buildBoard() {
  svgEl.setAttribute('viewBox', [cur.view.x, cur.view.y, cur.view.w, cur.view.h].join(' '));
  svgEl.innerHTML = '';
  const band = document.createElementNS(SVGNS, 'rect');
  band.setAttribute('class', 'trayband');
  band.setAttribute('x', cur.view.x + 0.35);
  band.setAttribute('y', cur.trayTop);
  band.setAttribute('width', cur.view.w - 0.7);
  band.setAttribute('height', cur.view.y + cur.view.h - cur.trayTop - 0.5);
  band.setAttribute('rx', 0.4);
  svgEl.appendChild(band);

  const gSlots = document.createElementNS(SVGNS, 'g');
  svgEl.appendChild(gSlots);
  const gPieces = document.createElementNS(SVGNS, 'g');
  svgEl.appendChild(gPieces);

  cur.pieces.forEach(p => {
    const sol = document.createElementNS(SVGNS, 'polygon');
    sol.setAttribute('class', 'slot');
    sol.setAttribute('points', SHAPES[p.t].map(v => v[0] + ',' + v[1]).join(' '));
    sol.setAttribute('transform', 'translate(' + p.sol.x + ',' + p.sol.y + ') rotate(' + p.sol.r * 45 + ')');
    sol.setAttribute('data-slot', p.i);
    gSlots.appendChild(sol);

    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('class', 'piece');
    g.setAttribute('data-piece', p.i);
    g.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ') rotate(' + p.r * 45 + ')');
    const poly = document.createElementNS(SVGNS, 'polygon');
    poly.setAttribute('points', SHAPES[p.t].map(v => v[0] + ',' + v[1]).join(' '));
    poly.setAttribute('fill', PIECE_COL[p.t]);
    g.appendChild(poly);
    /* M5：透明命中外扩（小三角形裸尺寸不足 64px 触摸目标）。用几何外扩矩形而非 stroke 加宽
       （CSS stroke-width 数字=px 非用户单位，且 getBoundingClientRect 不含 stroke——实测两坑） */
    let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
    SHAPES[p.t].forEach(v => {
      if (v[0] < mnx) mnx = v[0]; if (v[0] > mxx) mxx = v[0];
      if (v[1] < mny) mny = v[1]; if (v[1] > mxy) mxy = v[1];
    });
    const HM = 0.55;                  // 每侧外扩 0.55 单位（≥64px 由 verify 布局断言把关）
    const hit = document.createElementNS(SVGNS, 'polygon');
    hit.setAttribute('points', (mnx - HM) + ',' + (mny - HM) + ' ' + (mxx + HM) + ',' + (mny - HM) + ' ' +
      (mxx + HM) + ',' + (mxy + HM) + ' ' + (mnx - HM) + ',' + (mxy + HM));
    hit.setAttribute('class', 'hit');
    g.appendChild(hit);
    gPieces.appendChild(g);
  });
  renderAll();
}
function pieceEl(i) { return svgEl.querySelector('.piece[data-piece="' + i + '"]'); }
function slotEl(i) { return svgEl.querySelector('.slot[data-slot="' + i + '"]'); }
function renderPiece(i) {
  const p = cur.pieces[i], el = pieceEl(i);
  if (!el) return;
  el.setAttribute('transform', 'translate(' + p.x + ',' + p.y + ') rotate(' + p.r * 45 + ')');
  el.classList.toggle('placed', p.placed);
}
function renderAll() { cur.pieces.forEach(p => renderPiece(p.i)); renderProg(); }
/* 教玩观察 P1：点转绕锚点顶点旋转可把块甩出视区（出屏后点不到=自救困难），转完拉回。
   纯数学算终态 bbox，不量 DOM——.piece 有 transition:transform .28s，getBoundingClientRect
   量到的是过渡中途位置；也不用引擎 clampIntoView（vertsOf 锚点约定与渲染 transform 差 -R(v0)） */
function clampPieceIntoView(i) {
  if (!cur) return;
  const p = cur.pieces[i];
  const rad = p.r * Math.PI / 4, cs = Math.cos(rad), sn = Math.sin(rad);
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;              // SHAPES 局部 bbox
  SHAPES[p.t].forEach(v => {
    if (v[0] < a) a = v[0]; if (v[0] > c) c = v[0];
    if (v[1] < b) b = v[1]; if (v[1] > d) d = v[1];
  });
  const HM = 0.55, M = 0.1;                               // 命中外扩（buildBoard 同值）+ 视区边距
  const pts = SHAPES[p.t].concat([[a - HM, b - HM], [c + HM, b - HM], [c + HM, d + HM], [a - HM, d + HM]]);
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  pts.forEach(v => {
    const x = v[0] * cs - v[1] * sn, y = v[0] * sn + v[1] * cs;   // 渲染约定：world = R(v) + (p.x,p.y)
    if (x < mnx) mnx = x; if (x > mxx) mxx = x;
    if (y < mny) mny = y; if (y > mxy) mxy = y;
  });
  let dx = 0, dy = 0;
  if (mnx + p.x < cur.view.x + M) dx = cur.view.x + M - (mnx + p.x);
  else if (mxx + p.x > cur.view.x + cur.view.w - M) dx = cur.view.x + cur.view.w - M - (mxx + p.x);
  if (mny + p.y < cur.view.y + M) dy = cur.view.y + M - (mny + p.y);
  else if (mxy + p.y > cur.view.y + cur.view.h - M) dy = cur.view.y + cur.view.h - M - (mxy + p.y);
  if (dx || dy) { p.x += dx; p.y += dy; renderPiece(i); }
}
function renderProg() { // 顶栏就位进度：本关每块小形状，就位点亮
  const tray = $id('prog');
  tray.innerHTML = '';
  cur.pieces.forEach(p => {
    const d = document.createElement('div');
    d.className = 'mini' + (p.placed ? ' on' : '');
    const mx = Math.max.apply(null, SHAPES[p.t].map(v => v[0]));
    const my = Math.max.apply(null, SHAPES[p.t].map(v => v[1]));
    const myn = Math.min.apply(null, SHAPES[p.t].map(v => v[1]));
    d.innerHTML = '<svg viewBox="' + [-0.2, myn - 0.2, mx + 0.4, my - myn + 0.4].join(' ') + '" width="30" height="30">' +
      '<polygon points="' + SHAPES[p.t].map(v => v[0] + ',' + v[1]).join(' ') + '" fill="' + PIECE_COL[p.t] + '" stroke="#4A3B2E" stroke-width=".12"/></svg>';
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

/* ================= 幽灵手指（教学"帮"共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhost(i, reason) {
  if (VERIFY) return;
  const el = pieceEl(i);
  if (!el) return;
  ghost.toEl(el); ghost.show(reason);
  /* 教玩观察 P2：pulse 原先只 remove 不 add（高亮从未出现）；SVG 元素无 offsetWidth，用 getBoundingClientRect 触发重排 */
  el.classList.remove('pulse'); el.getBoundingClientRect(); el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}

/* ================= 指针交互：拖动 / 短按点转 ================= */
let drag = null;   // {i, offX, offY, sx, sy, moved}
function toUnit(e) {
  const pt = svgEl.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const m = svgEl.getScreenCTM();
  if (!m) return null;
  const p = pt.matrixTransform(m.inverse());
  return [p.x, p.y];
}
svgEl.addEventListener('pointerdown', e => {
  if (!cur || state.locked || state.won || state.demo) return;
  const g = e.target.closest('.piece');
  if (!g) return;
  e.preventDefault();
  const i = Number(g.getAttribute('data-piece'));
  const p = cur.pieces[i];
  if (p.placed) { p.placed = false; renderPiece(i); renderProg(); }   // 拿起已就位块=重新开始摆（教玩观察 P2：进度盘同步熄灭）
  const u = toUnit(e);
  if (!u) return;
  lastAct = Date.now();
  hideScaffold();
  try { svgEl.setPointerCapture(e.pointerId); } catch (err) {}  // 拖出 SVG 边界仍收 move/up
  svgEl.appendChild(g);                                   // 提到最上层
  g.classList.add('dragging');
  drag = { i, offX: u[0] - p.x, offY: u[1] - p.y, sx: e.clientX, sy: e.clientY, moved: false };
  if (ghostReason === 'tut') { const s = slotEl(i); if (s) ghost.toEl(s); }   // 教玩观察 P2：块被抓走后手指改指目标轮廓槽（原指空托盘位）
  sfx('click');
});
svgEl.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = cur.pieces[drag.i], u = toUnit(e);
  if (!u) return;
  if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
  if (!drag.moved) return;                                // 未超阈值不动（阈值内=点转）
  p.x = u[0] - drag.offX; p.y = u[1] - drag.offY;
  renderPiece(drag.i);
});
function endDrag(e) {
  if (!drag) return;
  const { i, moved } = drag;
  const g = pieceEl(i);
  if (g) g.classList.remove('dragging');
  drag = null;
  const p = cur.pieces[i];
  if (!moved) {                                            // 短按=旋转 45°
    engRotate(cur, i);
    renderPiece(i);
    clampPieceIntoView(i);   // 教玩观察 P1：点转绕锚点顶点可把块甩出视区（出屏后点不到=自救困难），转完按渲染 bbox 拉回
    sfx('pop');
    trySnap(i);
    return;
  }
  engDrag(cur, i, p.x, p.y);                              // 计一次拖放操作
  trySnap(i);
}
svgEl.addEventListener('pointerup', endDrag);
svgEl.addEventListener('pointercancel', endDrag);

/* 落手吸附尝试：成就位（ok 音+落位动画）；不成就轻微摆动提示（无惩罚，可重放） */
function trySnap(i) {
  const p = cur.pieces[i];
  const ok = engDrop(cur, i);
  renderPiece(i);
  if (cur.swapped) {                 // 同型互换：两块虚线槽随解位对调重画（同型外观相同，视觉无感）
    cur.swapped.forEach(k => {
      const q = cur.pieces[k], s = slotEl(k);
      if (s) s.setAttribute('transform', 'translate(' + q.sol.x + ',' + q.sol.y + ') rotate(' + q.sol.r * 45 + ')');
    });
    cur.swapped = null;
  }
  if (ok) {
    sfx('ok');
    renderProg();
    hopRabbit();
    if (state.tut === 'help') { state.tut = 'solo'; ghost.hide(); }
    if (engWon(cur)) winFlow();
  } else {
    const el = pieceEl(i);
    if (el) { el.classList.remove('wrongflash'); void el.offsetWidth; el.classList.add('wrongflash'); }
  }
}

/* ================= 闲置看护：25s 高亮未就位块的目标虚线（提示不代做） ================= */
function hideScaffold() {
  if (scaffoldActive) svgEl.querySelectorAll('.slot.hintpulse').forEach(s => s.classList.remove('hintpulse'));
  scaffoldActive = false;
}
function maybeScaffold() {
  const p = cur.pieces.find(q => !q.placed);
  if (!p) return;
  scaffoldActive = true;
  scaffoldRedemo = false;
  slotEl(p.i).classList.add('hintpulse');
  sayP('tan_hint', '转一转，放到一样的形状里');
}

/* ================= 教学：看-帮-独（仅关 1-0 首次，save.tan.tutSeen 记住演示已放过） ================= */
function tutTarget() { return (cur.pieces.find(q => !q.placed) || cur.pieces[0]).i; }
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP('tan_tut_watch', '看！把图形放到虚线里');
  await wait(700);
  const p = cur.pieces[0];                                 // 确定性关卡：演示块 0
  const el = pieceEl(0);
  el.classList.add('demo');
  /* 教玩观察 P2：先演示"点一下转 45°"手势（过关必需动作，原先只能靠试错发现）。
     直改 r 不走 engRotate——演示动作不计入孩子步数（不影响星级） */
  ghost.toEl(el); ghost.show('tut');
  await wait(700);
  ghost.press();
  p.r = (p.r + 1) % 8; renderPiece(0); sfx('pop');
  await wait(800);
  ghost.hide();
  engPlace(cur, 0);
  renderPiece(0); renderProg();
  sfx('ok');
  await wait(900);
  el.classList.remove('demo');
  const sv = KIDS._save();
  sv.tan = sv.tan || {};
  sv.tan.tutSeen = true;
  KIDS.store.persist();
  sayP('tan_tut_turn', '你来试一试，转一转放进去');
  await wait(600);
  /* 重新发同一关（确定性布局一致），进入"帮" */
  const flat = cur.flat;
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'help', tutStep: 0 };
  tutRedemo = false;
  buildBoard(); renderDots();
  lastAct = Date.now();
  setTimeout(() => { if (state.tut === 'help') pointGhost(tutTarget(), 'tut'); }, 700);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
const HINTS = { 1: '块数更多的图形哦', 2: '五块的大图形来啦', 3: '七块的经典七巧板哦' };
function nextHint(ci) {
  if (ci == null) ci = Math.floor(KIDS.calendar.limit(Infinity) / CH_LEN);
  if (ci >= 4) return '明天有' + GEN_HINTS[(ci - 4) % GEN_HINTS.length];
  return HINTS[ci] || '有新的拼图哦';
}
function winFlow() {
  state.won = true; state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  KIDS.ui.celebrate(stars).then(() => {
    const ci = Math.floor(cur.flat / CH_LEN), ch = ci + 1, lv = cur.flat % CH_LEN;
    const pr = KIDS.level.pass(ch, lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);   // 关卡无限：日历不设内容上限（每日新关+家长加关由 core 控制）
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
  scaffoldActive = false;
  drag = null;
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', tutStep: 0 };
  tutRedemo = false;
  lastAct = Date.now();
  buildBoard(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const fresh = flat === 0 && !sv.levels['1-0'] && !(sv.tan && sv.tan.tutSeen);
  if (fresh) { tutorialWatch(); return; }
  sayP('tan_hint', '转一转，放到一样的形状里');
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
  sayP('tan_hint', '转一转，放到一样的形状里');
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});

/* ================= 无操作看护：20s 轻声提示 / 25s 目标高亮；教学 5s 重演示一次 =================
   教玩观察 P1：原 20s 语音分支重置 lastAct → 25s 轮廓高亮永远达不到（死代码）。改为语音独立节流，不动 lastAct */
let lastVoice = 0;
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 25000 && !scaffoldActive) {
    maybeScaffold();
    return;
  }
  if (idle > 20000 && Date.now() - lastVoice > 20000) {
    lastVoice = Date.now();
    sayP('tan_hint', '转一转，放到一样的形状里');
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !tutRedemo && ghostReason !== 'tut') {
    tutRedemo = true;
    pointGhost(tutTarget(), 'tut');
  }
}, 1000);

/* ================= ?verify=1 自检 =================
   ① 25 关（静态 20 + 生成 20-24 抽查）结构校验：确定性 / 块型多重集=模板 / 块间无重叠（SH 交集）/
      ≥6 块模板严格连通（tplConnected 共享边判据，M7）/ 散布块顶点全在视区内（M4 clamp）
   ② 吸附判定单元：正例 6（解位邻域+旋转等价）/ 负例 6（偏移过大 或 非等价转角）
   ②b 同型互换单元（M2）：A 放到 B 解位 → 互换吸附成立；B 再放已换解位 → 全就位
   ②c 星级单元（M3）：完美玩法=3 星 / +3 废操作=2 星 / +6 废操作=1 星
   ③ autoSolve 引擎直驱 25 关：每块转正+落位 → 全部就位（won）
   ④ 布局抽查：mountain2 与 T7S 实建 DOM，最小块命中区（含 .hit 透明外扩）≥64px、无横向溢出 */
function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {};
  let npass = 0, total = 0;
  const strip = L => ({ name: L.name, view: L.view, pieces: L.pieces.map(p => [p.t, +p.x.toFixed(6), +p.y.toFixed(6), p.r]) });
  for (let flat = 0; flat < 25; flat++) {
    total++;
    const L1 = makeLevel(flat), L2 = makeLevel(flat);
    const det = JSON.stringify(strip(L1)) === JSON.stringify(strip(L2));
    const tpl = tplOf(flat);
    const ms1 = L1.pieces.map(p => p.t).sort().join(',');
    const ms2 = tpl.pcs.map(p => p.t).sort().join(',');
    const setOk = ms1 === ms2;
    let noOverlap = true, ovDetail = '';
    const vs = tpl.pcs.map(vertsOf);
    for (let a = 0; a < vs.length && noOverlap; a++)
      for (let b = a + 1; b < vs.length && noOverlap; b++) {
        const ov = overlapArea(vs[a], vs[b]);
        if (ov > 0.02) { noOverlap = false; ovDetail = a + '/' + b + '=' + ov.toFixed(3); }
      }
    const solved = (() => {          // autoSolve 直驱：转正（模拟点转）+ 落位吸附
      L1.pieces.forEach(p => {
        const per = ROT_PERIOD[p.t];
        let clicks = ((p.sol.r - p.r) % per + per) % per;
        while (clicks-- > 0) engRotate(L1, p.i);
        engPlace(L1, p.i);
      });
      return engWon(L1);
    })();
    /* M7：≥6 块模板强制严格连通（章 1/2 简单形相邻接于轮廓点，不适用共享边判据，不断言） */
    const conn = tpl.pcs.length >= 6 ? tplConnected(tpl.pcs) : true;
    /* M4：散布后每块全部顶点须在视区内（clamp 生效证明） */
    let inView = true, oobDetail = '';
    L1.pieces.forEach(p => vertsOf(p).forEach(v => {
      if (v[0] < L1.view.x - 0.001 || v[0] > L1.view.x + L1.view.w + 0.001 ||
          v[1] < L1.view.y - 0.001 || v[1] > L1.view.y + L1.view.h + 0.001) {
        inView = false; oobDetail = 'p' + p.i + '@' + v[0].toFixed(1) + ',' + v[1].toFixed(1);
      }
    }));
    const ok = det && setOk && noOverlap && solved && conn && inView;
    if (ok) npass++;
    const rec = { name: L1.name, pieces: L1.pieces.length, deterministic: det, setOk, noOverlap, solved, conn, inView, ok, ovDetail, oobDetail };
    if (flat < 20) levels[keyOf(flat)] = rec; else gen[flat] = Object.assign({ key: keyOf(flat) }, rec);
  }
  /* 单元：吸附判定正负例（mountain2 模板 + T7S 模板各取块） */
  total++;
  const cases = [];
  const t1 = TPL.mountain2, t7 = TPL.T7S;
  for (let k = 0; k < 6; k++) {      // 正例：块视觉对齐解位（质心微扰<0.3）+ 等价整圈旋转（对称形锚点随转角偏移，按质心反推）
    const src = k < 3 ? t1 : t7;
    const pc = src[k % src.length];
    const r2 = (pc.r + ROT_PERIOD[pc.t]) % 8;
    const cSol = centroidOf(vertsOf({ t: pc.t, x: pc.x, y: pc.y, r: pc.r }));
    const cRot = centroidOf(SHAPES[pc.t].map(v => rotPt(v, r2)));   // r2 朝向下质心的形状局部偏移
    const jx = 0.2 * (k % 2 ? 1 : -1), jy = 0.2 * (k % 2 ? -1 : 1);
    const p = { t: pc.t, x: cSol[0] + jx - cRot[0], y: cSol[1] + jy - cRot[1], r: r2 };
    cases.push({ want: true, got: snapCheck(p, pc), tag: 'pos' + k });
  }
  for (let k = 0; k < 6; k++) {      // 负例：偏移 1.2（超阈）或 非等价转角
    const src = k < 3 ? t1 : t7;
    const pc = src[k % src.length];
    const p = k % 2
      ? { t: pc.t, x: pc.x, y: pc.y, r: (pc.r + 1) % 8 }
      : { t: pc.t, x: pc.x + 1.2, y: pc.y + 1.2, r: pc.r };
    cases.push({ want: false, got: snapCheck(p, pc), tag: 'neg' + k });
  }
  const snapOk = cases.every(c => c.got === c.want);
  if (snapOk) npass++;
  units.snap = { ok: snapOk, cases };
  /* 单元：同型互换（M2）——T7S 两块 LT：A 放到 B 的解位 → 互换吸附；B 再放已换解位 → 全就位 */
  total++;
  const Ls = makeLevel(10);
  const pa = Ls.pieces.find(p => p.t === 'LT'), pb = Ls.pieces.find(p => p.t === 'LT' && p.i !== pa.i);
  const solA0 = pa.sol, solB0 = pb.sol;
  pa.r = pb.sol.r; pa.x = pb.sol.x; pa.y = pb.sol.y;
  const swapStep1 = engDrop(Ls, pa.i) && pa.placed && pa.sol === solB0 && pb.sol === solA0 &&
                    Ls.swapped && Ls.swapped.indexOf(pa.i) >= 0 && Ls.swapped.indexOf(pb.i) >= 0;
  Ls.pieces.forEach(p => engPlace(Ls, p.i));
  const swapOk = swapStep1 && engWon(Ls);
  if (swapOk) npass++;
  units.swap = { ok: swapOk, step1: swapStep1, won: engWon(Ls) };
  /* 单元：星级基线（M3）——完美玩法 moves==minMoves→3 星；+3 废操作→2 星；+6 废操作→1 星 */
  total++;
  const playLevel = (flat, waste) => {
    const L = makeLevel(flat);
    L.pieces.forEach((p, k) => {
      for (let w = 0; w < waste && k === 0; w++) {   // 废操作：拖到远处放手（不吸附不算就位）
        engDrag(L, p.i, p.sol.x + 5.5, p.sol.y + 5.5);
        engDrop(L, p.i);
      }
      const c = ((p.sol.r - p.r) % ROT_PERIOD[p.t] + ROT_PERIOD[p.t]) % ROT_PERIOD[p.t];
      for (let u = 0; u < c; u++) engRotate(L, p.i);
      /* 按质心对齐构造落点（SQ/PA 等价转角下锚点随转角偏移，锚点对锚点会差 √2 — 已知坑） */
      const cSol = centroidOf(vertsOf({ t: p.t, x: p.sol.x, y: p.sol.y, r: p.sol.r }));
      const cRot = centroidOf(vertsOf({ t: p.t, x: 0, y: 0, r: p.r }));
      engDrag(L, p.i, cSol[0] - cRot[0], cSol[1] - cRot[1]);
      engDrop(L, p.i);
    });
    return { won: engWon(L), moves: L.moves, min: L.minMoves, stars: engStars(L) };
  };
  const g0 = playLevel(10, 0), g3 = playLevel(10, 3), g6 = playLevel(10, 6);
  const starsOk = g0.won && g0.moves === g0.min && g0.stars === 3 &&
                  g3.won && g3.moves === g3.min + 3 && g3.stars === 2 &&
                  g6.won && g6.moves === g6.min + 6 && g6.stars === 1;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, perfect: g0, waste3: g3, waste6: g6 };
  /* 布局抽查：mountain2（2 块，flat=0）与 T7S（7 块，flat=10）实建 DOM 量最小块命中区（含 .hit 外扩） */
  const layout = {};
  let layoutOk = true;
  [0, 10].forEach(flat => {
    cur = makeLevel(flat);
    buildBoard();
    let minA = 1e9;
    cur.pieces.forEach(p => {
      const el = pieceEl(p.i);
      if (el) {
        const r = el.getBoundingClientRect();   // g 的 bbox 含透明命中描边带=真实触摸目标
        minA = Math.min(minA, Math.min(r.width, r.height));
      }
    });
    const de = document.documentElement;
    layout['flat' + flat] = { name: cur.name, minHit: Math.round(minA), overflowX: de.scrollWidth - window.innerWidth };
    if (minA < 64 || de.scrollWidth - window.innerWidth > 0) layoutOk = false;
  });
  const out = { game: 'tangram', total, pass: npass, layoutOk, layout, levels, gen, units };
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
  KIDS.init({ game: 'tangram', title: '七巧板拼图' });
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
async function autoSolveExec(plan) {
  for (const st of plan) {
    if (state.won) break;
    for (let c = 0; c < st.clicks; c++) {          // 模拟点转（短按）
      engRotate(cur, st.i);
      renderPiece(st.i);
      await wait(120);
    }
    const p = cur.pieces[st.i];                     // 模拟拖放到解位（吸附动画）
    p.x = p.sol.x; p.y = p.sol.y; p.r = p.sol.r;
    engDrop(cur, st.i);
    renderPiece(st.i);
    renderProg();
    await wait(150);
    if (cur.pieces[st.i].placed) sfx('ok');
  }
}
window.TAN = {
  get currentLevel() {
    return cur ? {
      flat: cur.flat,
      ch: Math.floor(cur.flat / CH_LEN) + 1,        // 章号 1 基
      lv: cur.flat % CH_LEN,
      name: cur.name, pieces: cur.pieces.length,
      placed: engPlacedCount(cur), moves: cur.moves
    } : null;
  },
  get pieces() {
    return cur ? cur.pieces.map(p => ({
      i: p.i, t: p.t, x: p.x, y: p.y, r: p.r, placed: p.placed,
      solX: p.sol.x, solY: p.sol.y, solR: p.sol.r,
      equiv: rotEquiv(p.t, p.r, p.sol.r),
      clicksToSol: ((p.sol.r - p.r) % ROT_PERIOD[p.t] + ROT_PERIOD[p.t]) % ROT_PERIOD[p.t]
    })) : [];
  },
  rotate(i) { engRotate(cur, i); renderPiece(i); return cur.pieces[i].r; },
  place(i, x, y) { const p = cur.pieces[i]; p.x = x; p.y = y; const ok = engDrop(cur, i); renderPiece(i); renderProg(); if (ok && engWon(cur)) winFlow(); return ok; },
  async autoSolve(exec) {
    const plan = cur.pieces.map(p => ({ i: p.i, clicks: ((p.sol.r - p.r) % ROT_PERIOD[p.t] + ROT_PERIOD[p.t]) % ROT_PERIOD[p.t] }));
    if (exec) await autoSolveExec(plan);
    else { cur.pieces.forEach(p => engPlace(cur, p.i)); }   // 引擎直驱（verify 用）
    return plan;
  },
  get tutorial() { return state.tut; }
};
