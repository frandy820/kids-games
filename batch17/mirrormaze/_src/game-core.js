/* ================= mirrormaze 纯引擎：确定性轴向族对称补全生成与判定（无 DOM，UI 与 verify 共用）
   r14（SPEC-BATCH17 §6 真值源）：种子 = mulberry32(flat * 7919 + 29)：同 flat 永远同关。
   镜射变换群（引擎侧=逐面镜逐次应用；verify/verify_one 用闭式代数独立复算——三源分算 §6）：
     v   竖直居中轴（W=4）：T(x,y)=(3-x,y)
     h   水平居中轴（H=4）：T(x,y)=(x,3-y)
     d1  主对角 x=y（5×5）：T(x,y)=(y,x)         轴上格（x=y）自映不产 target
     d2  反对角 x+y=4（5×5）：T(x,y)=(4-y,4-x)    轴上格（x+y=4）自映不产 target
     pv/ph 6×6 周期+双向（v/h 轴 K=5）：T=reflV(5)/reflH(5)；源侧 seeded 双向（判哪侧是源）；
           棋盘格周期图案（色=(x+y)%2 两色指派）——镜像补全后右/下半=相位反转（照抄/续延位置策略必错）
     vv  平行双镜（6×6）：先照 k1 再照 k2：x→k2-(k1-x)=x+(k2-k1)=平移（SPEC §6 恒等式）；
         配置 (k1,k2)∈{(3,5)Δ+2,(1,5)Δ+4,(5,3)Δ-2,(5,1)Δ-4}，源带=移出侧 2 列
     r180 垂直双镜（6×6）：reflH(5)∘reflV(5)=(5-x,5-y)=绕盘心旋转 180°（交换律成立）
   公平性不变式（§6）：given 中 role='src' 的格其变换位必为同色 target；role='axis' 自映不产 target；
   targets 与 given 无重叠 ⇒ 补全题唯一解（给定源格集+轴下目标格集唯一）。
   数据模型：q.given=源侧色格[{x,y,c,role}]；q.targets=应补格[{x,y,c,sx,sy}]（sx,sy=镜像源格）；
   q._fill[i]=第 i 个 target 是否已点亮。
   engTapCell：点对（未补 target）=点亮；点非 target（given 格/空位）='wrong'（miss 计一次、零惩罚
   可重点）；点已点亮 target/越界/已解题=null。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 引擎侧镜射原语（逐面镜应用；verify 侧用闭式代数分源对账，禁复用本组函数 §6） */
const reflV = (K, p) => ({ x: K - p.x, y: p.y });
const reflH = (L, p) => ({ x: p.x, y: L - p.y });
const KINDS = ['v', 'h', 'd1', 'd2', 'pv', 'ph', 'vv', 'r180'];
const KIND_W = { v: 4, h: 4, d1: 5, d2: 5, pv: 6, ph: 6, vv: 6, r180: 6 };
const KIND_TGT = { v: [3, 4], h: [3, 4], d1: [4, 5], d2: [4, 5], pv: [6, 6], ph: [6, 6], vv: [4, 6], r180: [4, 6] };
/* vv 双镜配置（k1,k2,Δ）：先照 k1 再照 k2 ⇒ 平移 Δ=k2-k1（源带=移出侧 2 列） */
const VV_CFG = [[3, 5, 2], [1, 5, 4], [5, 3, -2], [5, 1, -4]];

/* 单题变换（引擎侧：按轴逐次应用反射原语） */
function applyKind(q, p) {
  switch (q.kind) {
    case 'v':  return reflV(3, p);
    case 'h':  return reflH(3, p);
    case 'd1': return { x: p.y, y: p.x };
    case 'd2': return { x: 4 - p.y, y: 4 - p.x };
    case 'pv': return reflV(5, p);
    case 'ph': return reflH(5, p);
    case 'vv': return reflV(q.axis.k2, reflV(q.axis.k1, p));
    case 'r180': return reflH(5, reflV(5, p));
  }
  return null;
}

/* ---------- 单题生成（确定性，按难度章） ---------- */
function genQuiz(dch, rnd, forceV) {
  if (dch === 1) {                                  /* ch1：4×4 v/h 轴逐题轮换（flat0-q0 固定 v=教学兼容） */
    const kind = (forceV || rnd() < 0.5) ? 'v' : 'h';
    const q = { kind: kind, W: 4, H: 4, axis: { kind: kind }, side: 'A', tpl: -1,
      given: [], targets: [], _fill: [], miss: 0, solved: false };
    q.tpl = DCH1_TPL[Math.floor(rnd() * DCH1_TPL.length)];
    const t = RECT[q.tpl];
    let maxB = 0; t.forEach(p => { maxB = Math.max(maxB, p[1]); });
    const off = ri(rnd, 0, 3 - maxB);
    const ci = ri(rnd, 0, PALETTE.length - 1);
    t.forEach(p => {
      /* 模板带域 2 列（a=横跨带 0/1，b=沿带 0..3）：v 源=左半 2 列；h 源=上半 2 行（转置） */
      q.given.push(kind === 'v' ? { x: p[0], y: p[1] + off, c: PALETTE[ci], role: 'src' }
                                : { x: p[1] + off, y: p[0], c: PALETTE[ci], role: 'src' });
    });
    buildTargets(q);
    return q;
  }
  if (dch === 2) {                                  /* ch2：5×5 斜 45° 轴（d1/d2 轮换）+轴上干扰格 */
    const kind = rnd() < 0.5 ? 'd1' : 'd2';
    const q = { kind: kind, W: 5, H: 5, axis: { kind: kind }, side: 'A', tpl: -1,
      given: [], targets: [], _fill: [], miss: 0, solved: false };
    q.tpl = Math.floor(rnd() * TRI.length);
    const t = TRI[q.tpl];
    const ci = ri(rnd, 0, PALETTE.length - 1);
    t.forEach(p => {
      /* TRI 定义在 d1 源侧（y>x）；d2 源侧=h 翻折 (x,4-y)（§6 真值：y>x ⇒ x+(4-y)<4） */
      const c = kind === 'd1' ? { x: p[0], y: p[1] } : { x: p[0], y: 4 - p[1] };
      q.given.push({ x: c.x, y: c.y, c: PALETTE[ci], role: 'src' });
    });
    /* 轴上干扰格 1-2（自映：d1 对角 x=y / d2 反对角 x+y=4；色≠主体） */
    const axCells = kind === 'd1' ? [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]
                                  : [[4, 0], [3, 1], [2, 2], [1, 3], [0, 4]];
    const nAx = 1 + (rnd() < 0.5 ? 0 : 1);
    const axPick = shuffled(axCells, rnd).slice(0, nAx);
    axPick.forEach(a => q.given.push({ x: a[0], y: a[1], c: PALETTE[(ci + 1 + ri(rnd, 0, 1)) % PALETTE.length], role: 'axis' }));
    q.given.sort((a, b) => a.y - b.y || a.x - b.x);
    buildTargets(q);
    return q;
  }
  if (dch === 3) {                                  /* ch3：6×6 周期棋盘格+双向（pv/ph；判哪侧是源） */
    const kind = rnd() < 0.5 ? 'pv' : 'ph';
    const q = { kind: kind, W: 6, H: 6, axis: { kind: kind }, side: rnd() < 0.5 ? 'A' : 'B', tpl: -1,
      given: [], targets: [], _fill: [], miss: 0, solved: false };
    const two = shuffled([0, 1, 2], rnd).slice(0, 2);
    const assign = [PALETTE[two[0]], PALETTE[two[1]]];   /* assign[(x+y)%2] */
    if (kind === 'pv') {                            /* 块=2 列×3 行：A 源 cols0-1 / B 源 cols4-5 */
      const r = ri(rnd, 0, 3);
      const x0 = q.side === 'A' ? 0 : 4;
      for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 2; dx++) {
        const x = x0 + dx, y = r + dy;
        q.given.push({ x: x, y: y, c: assign[(x + y) % 2], role: 'src' });
      }
    } else {                                        /* 块=3 列×2 行：A 源 rows0-1 / B 源 rows4-5 */
      const c = ri(rnd, 0, 3);
      const y0 = q.side === 'A' ? 0 : 4;
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) {
        const x = c + dx, y = y0 + dy;
        q.given.push({ x: x, y: y, c: assign[(x + y) % 2], role: 'src' });
      }
    }
    buildTargets(q);
    return q;
  }
  /* dch4：双镜复合（vv 平行=平移 / r180 垂直=180° 旋转） */
  const kind = rnd() < 0.5 ? 'vv' : 'r180';
  const q = { kind: kind, W: 6, H: 6, axis: { kind: kind }, side: 'A', tpl: -1,
    given: [], targets: [], _fill: [], miss: 0, solved: false };
  if (kind === 'vv') {
    const cfg = VV_CFG[Math.floor(rnd() * VV_CFG.length)];
    q.axis.k1 = cfg[0]; q.axis.k2 = cfg[1];
    q.tpl = DCH4_VV[Math.floor(rnd() * DCH4_VV.length)];
    const t = RECT[q.tpl];
    let maxB = 0; t.forEach(p => { maxB = Math.max(maxB, p[1]); });
    const off = ri(rnd, 0, 5 - maxB);
    const ci = ri(rnd, 0, PALETTE.length - 1);
    const x0 = cfg[2] > 0 ? 0 : 4;                  /* 源带=移出侧 2 列（Δ>0 左带 / Δ<0 右带） */
    t.forEach(p => q.given.push({ x: x0 + p[0], y: p[1] + off, c: PALETTE[ci], role: 'src' }));
  } else {
    q.tpl = DCH4_R180[Math.floor(rnd() * DCH4_R180.length)];
    const t = RECT[q.tpl];
    let maxX = 0, maxY = 0;
    t.forEach(p => { maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]); });
    const offX = ri(rnd, 0, 2 - Math.min(2, maxX));
    const offY = ri(rnd, 0, 5 - maxY);
    const ci = ri(rnd, 0, PALETTE.length - 1);
    t.forEach(p => q.given.push({ x: p[0] + offX, y: p[1] + offY, c: PALETTE[ci], role: 'src' }));
  }
  buildTargets(q);
  return q;
}

/* 由 given(src) 逐格应用变换生成 targets（色同源格；sx,sy=源格坐标）——唯一解的结构保证 */
function buildTargets(q) {
  q.targets = [];
  q.given.forEach(g => {
    if (g.role !== 'src') return;
    const t = applyKind(q, { x: g.x, y: g.y });
    q.targets.push({ x: t.x, y: t.y, c: g.c, sx: g.x, sy: g.y });
  });
  q.targets.sort((a, b) => a.y - b.y || a.x - b.x);
  q._fill = q.targets.map(function () { return false; });
}

/* 题签名（同关 5 题互异判据）：kind+轴参数+W/H+given 全格（含颜色）排序 */
function quizSig(q) {
  const ax = q.kind === 'vv' ? ':' + q.axis.k1 + ',' + q.axis.k2 : '';
  return q.kind + ax + ':' + q.W + 'x' + q.H + ':' +
    q.given.map(c => c.x + ',' + c.y + ',' + c.c).sort().join(';');
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；同关 5 题互异） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 29);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const quizzes = [];
  const seen = {};
  let guard = 0;
  while (quizzes.length < CH_LEN && guard++ < 500) {
    const q = genQuiz(dch, rnd, flat === 0 && quizzes.length === 0);  // flat0-q0 固定 v（教学兼容）
    const sig = quizSig(q);
    if (seen[sig]) continue;                       // 同关互异：撞签名重生成
    seen[sig] = true;
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 补全引擎（无 DOM） ---------- */
const filledOf = q => q._fill.reduce((s, f) => s + (f ? 1 : 0), 0);

/* engTapCell(L, x, y)：点 (x,y) 格 → 返回 'placed'（点对未满）/
   'right'|'done'（补齐最后一格，step 推进）/ 'wrong'（非 target 位，miss 计一次）
   / null（非法：越界、已点亮 target、已解题、关已结束） */
function engTapCell(L, x, y) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (typeof x !== 'number' || typeof y !== 'number' ||
      Math.floor(x) !== x || Math.floor(y) !== y ||
      x < 0 || y < 0 || x >= q.W || y >= q.H) return null;
  for (let i = 0; i < q.targets.length; i++) {
    const t = q.targets[i];
    if (t.x === x && t.y === y) {
      if (q._fill[i]) return null;                 // 已点亮：无操作不计 miss（可重点口径）
      q._fill[i] = true;
      q.solved = q._fill.every(f => f === true);
      if (q.solved) {
        L.step++;
        if (L.step >= L.quizzes.length) L.done = true;
        return L.done ? 'done' : 'right';
      }
      return 'placed';
    }
  }
  q.miss++;                                        // 非 target 位（given 格/空位）
  L.retries++;
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（错次口径，零惩罚=可无限重点） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 救援/教学"帮"目标（§3 承旧）：首个未补镜像位 → {i}（其对应源格=pulse 目标）；
   已解题 → null ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  for (let i = 0; i < q.targets.length; i++) {
    if (!q._fill[i]) return { i: i };
  }
  return null;
}

/* ---------- 结构校验（verify 用）：域/角色/公平性不变式基础面（对称真值由 verify 分源复算 §6） */
function structOk(q) {
  if (!q || KINDS.indexOf(q.kind) < 0) return false;
  if (q.W !== KIND_W[q.kind] || q.H !== KIND_W[q.kind]) return false;
  if (!q.axis || q.axis.kind !== q.kind) return false;
  if (!Array.isArray(q.given) || !q.given.length) return false;
  const lo = KIND_TGT[q.kind][0], hi = KIND_TGT[q.kind][1];
  if (!Array.isArray(q.targets) || q.targets.length < lo || q.targets.length > hi) return false;
  const seen = {};
  let nSrc = 0, nAxis = 0;
  for (const c of q.given) {
    if (c.x < 0 || c.x >= q.W || c.y < 0 || c.y >= q.H) return false;
    if (PALETTE.indexOf(c.c) < 0) return false;
    if (seen[c.x + ',' + c.y]) return false;
    seen[c.x + ',' + c.y] = true;
    if (c.role === 'src') nSrc++;
    else if (c.role === 'axis') nAxis++;
    else return false;
  }
  if (nSrc !== q.targets.length) return false;                    // 每源格恰一 target
  if ((q.kind === 'd1' || q.kind === 'd2') !== (nAxis > 0)) return false;  // 轴上格仅 dch2
  const tseen = {};
  for (const t of q.targets) {
    if (t.x < 0 || t.x >= q.W || t.y < 0 || t.y >= q.H) return false;
    if (tseen[t.x + ',' + t.y]) return false;
    tseen[t.x + ',' + t.y] = true;
    if (seen[t.x + ',' + t.y]) return false;                      // targets 与 given 无重叠
    const src = q.given.filter(g => g.x === t.sx && g.y === t.sy && g.role === 'src');
    if (src.length !== 1 || src[0].c !== t.c) return false;       // 色同源格+源恰一
  }
  return Array.isArray(q._fill) && q._fill.length === q.targets.length &&
    q._fill.every(f => f === false) && q.miss === 0 && q.solved === false;
}
