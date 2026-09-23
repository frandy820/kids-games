/* ================= tangram 引擎（纯函数，无 DOM） =================
   块状态 {i,t,x,y,r}：x,y=锚点（旋转后顶点 0 落点），r=45° 步数（0..7）
   解位 sol={x,y,r} 来自模板；吸附=质心距<0.6 单位 且 旋转外观等价（模 ROT_PERIOD）
   verify=1 的结构校验 / 吸附单元 / autoSolve 直驱全部只依赖本层 + game-data.js */
'use strict';

/* ---------- 几何 ---------- */
function rotPt(p, k) {
  const a = Math.PI / 4 * (k % 8), c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
}
/* 块（或模板条目）→ 绝对顶点列表（模板坐标系） */
function vertsOf(pc) {
  const vs = SHAPES[pc.t].map(p => rotPt(p, pc.r));
  const dx = pc.x - vs[0][0], dy = pc.y - vs[0][1];
  return vs.map(v => [v[0] + dx, v[1] + dy]);
}
function centroidOf(vs) {
  return [vs.reduce((s, v) => s + v[0], 0) / vs.length, vs.reduce((s, v) => s + v[1], 0) / vs.length];
}
function shoelace(vs) {
  let s = 0;
  for (let i = 0; i < vs.length; i++) {
    const a = vs[i], b = vs[(i + 1) % vs.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}
/* Sutherland-Hodgman 凸多边形交集面积（块全为凸）——重叠校验用 */
function overlapArea(A, B) {
  const cw = v => (shoelace(v) > 0 ? v.slice().reverse() : v);
  let out = cw(A);
  const cl = cw(B);
  const inside = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) <= 1e-9;
  const isect = (p1, p2, a, b) => {
    const d1 = (b[0] - a[0]) * (p1[1] - a[1]) - (b[1] - a[1]) * (p1[0] - a[0]);
    const d2 = (b[0] - a[0]) * (p2[1] - a[1]) - (b[1] - a[1]) * (p2[0] - a[0]);
    if (Math.abs(d1 - d2) < 1e-12) return p2;
    const t = d1 / (d1 - d2);
    return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
  };
  for (let i = 0; i < cl.length && out.length; i++) {
    const a = cl[i], b = cl[(i + 1) % cl.length], inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j], prev = inp[(j + inp.length - 1) % inp.length];
      const ci = inside(cur, a, b), pi = inside(prev, a, b);
      if (ci) { if (!pi) out.push(isect(prev, cur, a, b)); out.push(cur); }
      else if (pi) out.push(isect(prev, cur, a, b));
    }
  }
  return out.length >= 3 ? Math.abs(shoelace(out)) : 0;
}
/* 旋转外观等价：等腰直角三角 8 步一圈但占位分 4 形 → 用周期表（同型同占位即等价） */
function rotEquiv(t, r, solR) {
  const p = ROT_PERIOD[t];
  return ((r - solR) % p + p) % p === 0;
}
/* ---------- 严格连通判据（与 _tools/solve7.py 同式）----------
   两块相邻 ⟺ 存在共线边段重叠长度 ≥0.15 单位（角对角点接触=视觉漂浮，不算）。
   旧池 bridge7/T7A/T7B 均以此判据实证不连通后移除；verify 对 ≥6 块模板强制断言。 */
function sharedEdgeLen(a1, a2, b1, b2) {
  const d1x = a2[0] - a1[0], d1y = a2[1] - a1[1], d2x = b2[0] - b1[0], d2y = b2[1] - b1[1];
  const L1 = Math.hypot(d1x, d1y), L2 = Math.hypot(d2x, d2y);
  if (L1 < 1e-6 || L2 < 1e-6) return 0;
  const n1x = d1x / L1, n1y = d1y / L1;
  if (Math.abs(n1x * d2x + n1y * d2y) < L2 - 1e-6) return 0;   // 不平行（阈值与 L2 比，勿用 max(L1,L2)）
  const dst = p => Math.abs(d1x * (p[1] - a1[1]) - d1y * (p[0] - a1[0])) / L1;
  if (dst(b1) > 1e-6 || dst(b2) > 1e-6) return 0;               // 不共线
  const t1 = (b1[0] - a1[0]) * n1x + (b1[1] - a1[1]) * n1y;
  const t2 = (b2[0] - a1[0]) * n1x + (b2[1] - a1[1]) * n1y;
  const lo = Math.min(t1, t2), hi = Math.max(t1, t2);
  return Math.max(0, Math.min(hi, L1) - Math.max(lo, 0));
}
function tplConnected(pcs, minShared) {
  if (minShared == null) minShared = 0.15;
  const E = pcs.map(pc => {
    const v = vertsOf(pc);
    return v.map((p, k) => [p, v[(k + 1) % v.length]]);
  });
  const par = pcs.map((_, i) => i);
  const find = i => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (let i = 0; i < pcs.length; i++)
    for (let j = i + 1; j < pcs.length; j++)
      if (E[i].some(e1 => E[j].some(e2 => sharedEdgeLen(e1[0], e1[1], e2[0], e2[1]) >= minShared)))
        par[find(i)] = find(j);
  const roots = {};
  let n = 0;
  for (let i = 0; i < pcs.length; i++) { const r = find(i); if (!roots[r]) { roots[r] = 1; n++; } }
  return n === 1;
}
/* 吸附判定：质心距 < 0.6 单位 且 旋转等价 */
const SNAP_DIST = 0.6;
function snapCheck(pc, sol) {
  if (!rotEquiv(pc.t, pc.r, sol.r)) return false;
  const c1 = centroidOf(vertsOf(pc)), c2 = centroidOf(vertsOf({ t: pc.t, x: sol.x, y: sol.y, r: sol.r }));
  return Math.hypot(c1[0] - c2[0], c1[1] - c2[1]) < SNAP_DIST;
}

/* ---------- 关卡模型 ---------- */
/* 散布后把块的实际顶点包络夹回可视区（M4：块锚点在带内但 45° 转角下顶点可越界半幅） */
function clampIntoView(p, view, trayTop) {
  const vs = vertsOf(p);
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  vs.forEach(v => {
    if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0];
    if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1];
  });
  const loX = view.x + 0.15, hiX = view.x + view.w - 0.15;
  const loY = trayTop + 0.15, hiY = view.y + view.h - 0.15;
  if (minX < loX) p.x += loX - minX; else if (maxX > hiX) p.x -= maxX - hiX;
  if (minY < loY) p.y += loY - minY; else if (maxY > hiY) p.y -= maxY - hiY;
}
/* makeLevel(flat)：确定性（mulberry32(flat*7919+13)）
   返回 {flat, name, pieces:[{i,t,x,y,r,sol,placed}], view:{x,y,w,h}, moves, minMoves, trayTop}
   view=模板包围盒外扩 + 下方托盘带（散布与目标同坐标系，拖动无换算）
   托盘宽下限 = 块数×2.0+1.6（7 块关模板 bbox 常窄于托盘需要宽度，须扩宽防叠死）；
   散布：n≤3 单排 / n≥4 两排（M4 修复 n=2 同列）；初始转角保证非解转；
   minMoves = 块数 + Σ每块转到解位等价角的最少点转数（M3 星级基线，完美玩法 extra=0） */
function makeLevel(flat) {
  const tpl = tplOf(flat);
  const n = tpl.pcs.length;
  const vs = tpl.pcs.map(vertsOf);
  const xs = [], ys = [];
  vs.forEach(v => v.forEach(p => { xs.push(p[0]); ys.push(p[1]); }));
  const bx = Math.min.apply(null, xs), by = Math.min.apply(null, ys);
  const bw = Math.max.apply(null, xs) - bx, bh = Math.max.apply(null, ys) - by;
  const PAD = 0.8;
  const vw = Math.max(bw + PAD * 2, Math.min(13.5, n * 2.0 + 1.6));
  const view = { x: bx + bw / 2 - vw / 2, y: by - PAD, w: vw, h: bh + PAD + 6.6 }; // 以模板中心对齐 view 中心
  const trayTop = by + bh + 0.55;                    // 托盘带顶（渲染层用同一几何）
  const rnd = mulberry32(flat * 7919 + 13);
  const cols = n <= 3 ? n : Math.ceil(n / 2);        // M4：n=2 时两列（旧式两行同列已修）
  const pieces = tpl.pcs.map((pc, i) => {
    let r = (pc.r + 1 + Math.floor(rnd() * 7)) % 8;  // 确定性散布（同 flat 同布局）；1..7 非零偏转
    if (((r - pc.r) % ROT_PERIOD[pc.t] + ROT_PERIOD[pc.t]) % ROT_PERIOD[pc.t] === 0) r = (r + 1) % 8; // 保证非解转
    const p = {
      i, t: pc.t, x: 0, y: 0, r,
      sol: { x: pc.x, y: pc.y, r: pc.r },
      placed: false
    };
    const colI = i % cols, row = Math.floor(i / cols);
    p.x = view.x + 1.1 + (vw - 2.2) * (cols === 1 ? 0.5 : colI / (cols - 1)) + (rnd() - 0.5) * 0.4;
    p.y = trayTop + 0.65 + row * 2.1 + rnd() * 0.4;
    clampIntoView(p, view, trayTop);
    return p;
  });
  let minMoves = n;                                  // 每块至少一次落手
  pieces.forEach(p => {
    minMoves += ((p.sol.r - p.r) % ROT_PERIOD[p.t] + ROT_PERIOD[p.t]) % ROT_PERIOD[p.t];
  });
  return { flat, name: tpl.name, pieces, view, moves: 0, minMoves, trayTop, swapped: null };
}

/* ---------- 操作（UI 与 autoSolve 共用；moves 供星级） ---------- */
function engRotate(L, i) {          // 点转 45°（顺时针视觉）
  const p = L.pieces[i];
  if (!p || p.placed) return false;
  p.r = (p.r + 1) % 8;
  L.moves++;
  return true;
}
function engDrag(L, i, x, y) {      // 拖放到锚点 (x,y)（单位坐标）——被拖离即解除已就位
  const p = L.pieces[i];
  if (!p) return false;
  p.x = x; p.y = y;
  if (p.placed) { p.placed = false; }
  L.moves++;
  return true;
}
function engDrop(L, i) {            // 落手：尝试吸附（就近吸附到位=咔哒；不吸附=留在原地，永不锁死）
  const p = L.pieces[i];
  if (!p) return false;
  if (snapCheck(p, p.sol)) {
    p.x = p.sol.x; p.y = p.sol.y; p.r = p.sol.r;
    p.placed = true;
    return true;
  }
  /* 同型互换（M2）：模板里同型块视觉无差，孩子不分辨块身份——放到"另一块的位置"时
     就近吸附并互换解位（两块同型 ⇒ 虚线槽外观相同，仅槽与块的配对对调，视觉无感） */
  const q = L.pieces.find(qq => qq.i !== i && !qq.placed && qq.t === p.t && snapCheck(p, qq.sol));
  if (q) {
    const tmp = p.sol; p.sol = q.sol; q.sol = tmp;
    p.x = p.sol.x; p.y = p.sol.y; p.r = p.sol.r;
    p.placed = true;
    L.swapped = [i, q.i];           // UI 需同步重画两块对应虚线槽
    return true;
  }
  return false;
}
function engPlace(L, i) {           // 验收/教学：直接放到解位并吸附（内部走同一判定）
  const p = L.pieces[i];
  if (!p) return false;
  p.x = p.sol.x; p.y = p.sol.y; p.r = p.sol.r;
  const ok = engDrop(L, i);
  if (!ok) L.moves++;               // 未吸附也算一次操作（异常兜底）
  return ok;
}
function engWon(L) { return L.pieces.every(p => p.placed); }
function engPlacedCount(L) { return L.pieces.filter(p => p.placed).length; }
/* 星级：多余操作（moves − minMoves；minMoves=块数+必需点转数，见 makeLevel）
   ≤2 → 3 星；≤5 → 2 星；否则 1 星。永不 0 星 */
function engStars(L) {
  const extra = L.moves - (L.minMoves || L.pieces.length);
  return extra <= 2 ? 3 : extra <= 5 ? 2 : 1;
}
