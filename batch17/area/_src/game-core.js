/* ================= area 纯引擎：形状代数 + 确定性关卡生成 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   数据模型（SPEC-BATCH17 §6 r14）：
     dch1 calc 算一算：挖空区=完整 L×W 矩形（2..5 档、积 ≤20、排除 5×5）+长宽标注
       子型 area（面积=长×宽）/perim（周长=2×(长+宽)），COMPOSE=[a,a,a,p,p]；
       数字卡 3 张（干扰=典型错 周长/半周/面积 混入 +近误 ±1/±2）
     dch2 samearea 一样大：挖空区=形状池 kind X（3/4 格），3 选 1——正解=同面积异形状 kind Y
       （canonical≠X——防轮廓匹配必须数格），干扰=面积 ±1 近误（G=3:2/4 格各一；G=4:3 格两 kind）
     dch3 combo 拼砖组：N=3-4 块互异 kind 砖横排展示（无挖空区），问拼合总面积=多砖之和
       （6..12 格）；数字卡 3 张（干扰=部分和（漏加一块典型错）+近误 ±1/±2）
     dch4 unit2 一格代二：挖空区 G 格（2..8，单砖或双砖拼接），一格住 2 只 → 真值=2G；
       数字卡 3 张（干扰恒含 G（忘换算典型错）+2G±2）
     dch2/3/4 首题（qi0）=count 数格子热身（家族惯例，1-8 格 ±1/±2——count 生成器 b17 原样保留）
   数值域封闭性（SPEC §6 域表——全部干扰池非空可满足）：
     calc area 干扰池 {L+W, 2(L+W), A±1, A±2}\{A}：典型错恒在场（(2,2) 时 L+W=A 被滤但
       P=8≠4 在场；(4,4) 时 P=A 被滤但 L+W=8 在场——两种对偶情形互补恒非空）
     calc perim 干扰池 {L+W, L×W, P±1, P±2}\{P}：同上对偶恒非空
     samearea：3/4 格同面积异形状组 {b3,l3}/{sq,t4,z4} 恒有异 kind；±1 面积 kind 池恒非空
     combo：部分和 {T-a_i} 恒非空（a_i≥1）；近误 T±1/T±2 恒非空（T≥6）
     unit2：{2G-2, 2G+2}\{G,2G} 恒非空（G=2 时 2G-2=G 被滤但 2G+2=6 在场）
   可解性（§0.35 铁律）：数字卡恰 1 张=真值（生成器自检+verify 侧独立复算对账，禁 answer 自证）
   同关 5 题互异（sig=kind+子型+挖空区形状签名+砖组+卡组+answer，Set 全互异）
   判定：engTap 点卡——'right'/'done'（推进）/'wrong'（miss/retries 计一次，零惩罚可重点）/false（非法） */
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
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 形状代数 ---------- */
const ckey = p => p[0] + ',' + p[1];
/* 平移到原点 + 行优先排序（规范姿态） */
function normCells(cells) {
  let mx = 1e9, my = 1e9;
  cells.forEach(p => { if (p[0] < mx) mx = p[0]; if (p[1] < my) my = p[1]; });
  return cells.map(p => [p[0] - mx, p[1] - my]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}
/* 顺时针旋转 90°：(x,y)→(-y,x)（返回 norm 姿态） */
function rotCells(cells) {
  return normCells(cells.map(p => [-p[1], p[0]]));
}
const serCells = cells => cells.map(p => p.join(',')).join(';');
/* 形状身份：4 旋转的 norm 序列化取字典序最小（旋转不变形状——SPEC §2 形状池口径） */
function canonCells(cells) {
  let best = null, c = normCells(cells);
  for (let i = 0; i < 4; i++) {
    const s = serCells(c);
    if (best === null || s < best) best = s;
    c = rotCells(c);
  }
  return best;
}
const sameShape = (a, b) => canonCells(a) === canonCells(b);
/* hole 合法性：整数坐标 0-4 域（5×5 内）、无重复格、单连通（拼合区域） */
function holeOk(hole) {
  if (!Array.isArray(hole) || !hole.length) return false;
  const seen = {};
  for (let i = 0; i < hole.length; i++) {
    const p = hole[i];
    if (!Array.isArray(p) || p.length !== 2 || !Number.isInteger(p[0]) || !Number.isInteger(p[1])) return false;
    if (p[0] < 0 || p[0] > 4 || p[1] < 0 || p[1] > 4) return false;
    const k = ckey(p);
    if (seen[k]) return false;
    seen[k] = 1;
  }
  const st = [hole[0].slice()], vis = {};
  vis[ckey(hole[0])] = 1;
  let cnt = 1;
  while (st.length) {
    const p = st.pop();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
      const k = (p[0] + d[0]) + ',' + (p[1] + d[1]);
      if (seen[k] && !vis[k]) { vis[k] = 1; cnt++; st.push([p[0] + d[0], p[1] + d[1]]); }
    });
  }
  return cnt === hole.length;
}
/* 卡组合法性：{cells,kind}，cells=该 kind 某旋转 norm 姿态，卡间互异 */
function cardsOk(cards) {
  if (!Array.isArray(cards)) return false;
  const sers = [];
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (!c || !Array.isArray(c.cells) || KINDS.indexOf(c.kind) < 0) return false;
    if (serCells(normCells(c.cells)) !== serCells(c.cells)) return false;          // 须 norm 姿态
    if (canonCells(c.cells) !== canonCells(SHAPES[c.kind])) return false;          // 姿态=该 kind 的旋转
    if (c.cells.length !== SHAPES[c.kind].length) return false;
    sers.push(serCells(c.cells));
  }
  for (let i = 0; i < sers.length; i++) for (let j = i + 1; j < sers.length; j++)
    if (sers[i] === sers[j]) return false;
  return true;
}
function gridOk(q) {
  if (q.hole === null) return q.GW === 0 && q.GH === 0;
  if (!Number.isInteger(q.GW) || !Number.isInteger(q.GH) || q.GW < 1 || q.GW > 5 || q.GH < 1 || q.GH > 5) return false;
  return q.hole.every(p => p[0] < q.GW && p[1] < q.GH);
}

/* ---------- 工地随机 padding：hole 嵌在稍大的工地里（"挖空"语境；GW/GH ≤5×5） ---------- */
function padSite(rnd, hole, extras) {
  let w = 0, h = 0;
  hole.forEach(p => { if (p[0] > w) w = p[0]; if (p[1] > h) h = p[1]; });
  w++; h++;
  const pl = ri(rnd, 0, Math.min(1, 5 - w)), pt = ri(rnd, 0, Math.min(1, 5 - h));
  const pr = Math.min(ri(rnd, 0, 1), 5 - w - pl), pb = Math.min(ri(rnd, 0, 1), 5 - h - pt);
  const sh = p => [p[0] + pl, p[1] + pt];
  return { hole: hole.map(sh), placed: extras ? extras.map(e => e.map(sh)) : null,
    GW: w + pl + pr, GH: h + pt + pb };
}

/* ---------- 姿态与挖空区生成 ---------- */
function poseOf(rnd, kind) {                        // 随机旋转的 norm 姿态
  let c = SHAPES[kind].map(p => p.slice());
  const n = ri(rnd, 0, 3);
  for (let i = 0; i < n; i++) c = rotCells(c);
  return normCells(c);
}
/* 单砖挖空区（1-4 格） */
function holeSingle(rnd) { return poseOf(rnd, pick(rnd, KINDS)); }
/* 双砖拼接挖空区（4-8 格）：两砖边相邻不重叠，bbox≤5×5
   返回 { hole(0,0 基 norm), a, b }——a/b=两砖在 hole 坐标系的格集（placed 用） */
function holePair(rnd) {
  for (let t = 0; t < 60; t++) {
    const ka = pick(rnd, KINDS), kb = pick(rnd, KINDS);
    const area = SHAPES[ka].length + SHAPES[kb].length;
    if (area < 4 || area > 8) continue;
    const A = poseOf(rnd, ka), B = poseOf(rnd, kb);
    const Aset = {};
    A.forEach(p => { Aset[ckey(p)] = 1; });
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const cands = [], candKeys = {};
    B.forEach(b => A.forEach(a => DIRS.forEach(d => {
      const dx = a[0] + d[0] - b[0], dy = a[1] + d[1] - b[1];
      const dk = dx + ',' + dy;
      if (candKeys[dk]) return;
      const placed = B.map(p => [p[0] + dx, p[1] + dy]);
      if (placed.some(p => Aset[ckey(p)])) return;                 // 不重叠
      let mx = 1e9, my = 1e9, Mx = -1e9, My = -1e9;
      A.concat(placed).forEach(p => {
        if (p[0] < mx) mx = p[0]; if (p[0] > Mx) Mx = p[0];
        if (p[1] < my) my = p[1]; if (p[1] > My) My = p[1];
      });
      if (Mx - mx >= 5 || My - my >= 5) return;                    // bbox ≤5×5
      candKeys[dk] = 1; cands.push({ dx: dx, dy: dy });
    })));
    if (!cands.length) continue;
    const cc = pick(rnd, cands);
    const placedB = B.map(p => [p[0] + cc.dx, p[1] + cc.dy]);
    const all = A.concat(placedB);
    let mx = 1e9, my = 1e9;
    all.forEach(p => { if (p[0] < mx) mx = p[0]; if (p[1] < my) my = p[1]; });
    const sh = p => [p[0] - mx, p[1] - my];
    return { hole: normCells(all), a: A.map(sh), b: placedB.map(sh) };
  }
  /* 兜底模板（60 次全败概率极低；确定性保 verify）：t4 + sq 竖拼 */
  const A = [[0, 0], [1, 0], [2, 0], [1, 1]], B = [[0, 2], [1, 2], [0, 3], [1, 3]];
  return { hole: normCells(A.concat(B)), a: A.map(p => p.slice()), b: B.map(p => p.slice()) };
}

/* ---------- 数字卡干扰（§0.17）：候选池滤 0/负/同答案/重复 → 取 n 张 → 洗牌 ---------- */
function numItems(rnd, ans) {
  const pool = [];
  [ans - 2, ans - 1, ans + 1, ans + 2].forEach(v => { if (v > 0 && v !== ans && pool.indexOf(v) < 0) pool.push(v); });
  const ds = shuffled(pool, rnd).slice(0, 2);
  const items = shuffled([ans, ds[0], ds[1]], rnd);
  return { items: items, answerIdx: items.indexOf(ans) };
}
/* 三数字卡组装：恰 1 张=真值（互异正值域 1..30，域断言 structOk/verify 分源复算） */
function numCards(rnd, ans, d1, d2) {
  const items = shuffled([ans, d1, d2], rnd);
  return { items: items, answerIdx: items.indexOf(ans) };
}

/* ---------- dch1 calc 生成：矩形挖空区+长宽标注 → 面积/周长真算
   sub='area'（ans=L*W）|'perim'（ans=2*(L+W)）；maxDim=边长上档（qi≤2→4 / qi≥3→5）
   积 ≤20（5×5 全格排除——工地域+教学 watch ≤16s 预算）
   干扰：d1=典型错（area 问混 周长 P 或 半周 L+W；perim 问混 面积 A 或 半周 L+W——恒在场，
   强迫儿童辨析运算对象）；d2=近误 ±1/±2 ---------- */
function genCalc(rnd, sub, maxDim, avoidSigs) {
  for (let t = 0; t < 40; t++) {
    const L = ri(rnd, 2, maxDim), W = ri(rnd, 2, maxDim);
    if (L * W > 20) continue;
    const A = L * W, P = 2 * (L + W), ans = sub === 'area' ? A : P;
    const confVal = sub === 'area' ? P : A;
    const confPool = [];
    [L + W, confVal].forEach(v => { if (v > 0 && v !== ans && confPool.indexOf(v) < 0) confPool.push(v); });
    const d1 = pick(rnd, confPool);                 // 典型错恒在场
    let nearPool = [];
    [ans - 2, ans - 1, ans + 1, ans + 2].forEach(v => {
      if (v > 0 && v !== ans && v !== d1 && confPool.indexOf(v) < 0 && nearPool.indexOf(v) < 0) nearPool.push(v);
    });
    const d2 = pick(rnd, nearPool);
    const opt = numCards(rnd, ans, d1, d2);
    const rect = [];
    for (let y = 0; y < W; y++) for (let x = 0; x < L; x++) rect.push([x, y]);
    const site = padSite(rnd, rect, null);
    const q = { kind: 'calc', sub: sub, L: L, W: W, hole: site.hole, GW: site.GW, GH: site.GH,
      cards: opt.items, answer: opt.answerIdx, ans: ans,
      placed: null, sel: null, miss: 0, solved: false, warm: false };
    if (!avoidSigs.some(s => s === sigOf(q))) return q;
  }
  /* 兜底模板：3×4 面积 12（干扰 P=14 + 近误 11）——确定性保 verify */
  const rect = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) rect.push([x, y]);
  const opt = numCards(rnd, 12, 14, 11);
  return { kind: 'calc', sub: 'area', L: 3, W: 4, hole: rect, GW: 3, GH: 4,
    cards: opt.items, answer: opt.answerIdx, ans: 12,
    placed: null, sel: null, miss: 0, solved: false, warm: false };
}

/* ---------- dch2 samearea 生成：挖空区=kind X 姿态（3/4 格），正解=同面积异形状 kind Y
   （canonical≠X——防轮廓匹配必须数格）；干扰=面积 ±1 近误
   G=3：干扰=2 格 b2 + 4 格（sq/t4/z4 之一）；G=4：干扰=3 格 b3+l3 两 kind（-1 双侧近误）
   可解性：恰 1 卡面积=hole 面积（干扰面积恒 ≠G） ---------- */
const AREA_GROUP = { 3: ['b3', 'l3'], 4: ['sq', 't4', 'z4'] };
function genSamearea(rnd, avoidSigs) {
  for (let t = 0; t < 40; t++) {
    const G = rnd() < 0.5 ? 3 : 4;
    const X = pick(rnd, AREA_GROUP[G]);
    const Y = pick(rnd, AREA_GROUP[G].filter(k => k !== X));
    let dk = [];
    if (G === 3) dk = [pick(rnd, KINDS.filter(k => SHAPES[k].length === 2)),
                       pick(rnd, AREA_GROUP[4])];
    else dk = ['b3', 'l3'];
    const hole = poseOf(rnd, X);
    const cards = shuffled([{ cells: poseOf(rnd, Y), kind: Y },
      { cells: poseOf(rnd, dk[0]), kind: dk[0] },
      { cells: poseOf(rnd, dk[1]), kind: dk[1] }], rnd);
    const answer = cards.findIndex(c => c.kind === Y);
    const site = padSite(rnd, hole, null);
    const q = { kind: 'samearea', hole: site.hole, GW: site.GW, GH: site.GH, cards: cards,
      answer: answer, ans: hole.length, placed: null, sel: null, miss: 0, solved: false, warm: false };
    if (!avoidSigs.some(s => s === sigOf(q))) return q;
  }
  /* 兜底模板：hole=b3 直三，正解 l3（同 3 格异形状），干扰 b2/sq（2/4 格近误） */
  const cards = shuffled([{ cells: [[0, 0], [0, 1], [1, 1]], kind: 'l3' },
    { cells: [[0, 0], [1, 0]], kind: 'b2' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], kind: 'sq' }], rnd);
  return { kind: 'samearea', hole: [[0, 0], [1, 0], [2, 0]], GW: 3, GH: 1, cards: cards,
    answer: cards.findIndex(c => c.kind === 'l3'), ans: 3,
    placed: null, sel: null, miss: 0, solved: false, warm: false };
}

/* ---------- dch3 combo 生成：N=3-4 块互异 kind 砖（部分和结构，总面积 6..12）
   干扰：d1=部分和（漏加随机一块——典型错）；d2=近误 ±1/±2（避让 d1/部分和重复）
   无挖空区（hole=null）——拼合面积须逐块点数相加，防"数整体"绕过加法 ---------- */
function genCombo(rnd, avoidSigs) {
  for (let t = 0; t < 60; t++) {
    const N = ri(rnd, 3, 4);
    const kinds = shuffled(KINDS, rnd).slice(0, N);
    const bricks = kinds.map(k => ({ cells: poseOf(rnd, k), kind: k }));
    const total = bricks.reduce((s, b) => s + b.cells.length, 0);
    if (total < 6 || total > 12) continue;
    const partials = [];
    bricks.forEach(b => {
      const v = total - b.cells.length;
      if (partials.indexOf(v) < 0) partials.push(v);
    });
    const d1 = pick(rnd, partials);                 // 部分和典型错恒在场
    let nearPool = [];
    [total - 2, total - 1, total + 1, total + 2].forEach(v => {
      if (v > 0 && v !== d1 && nearPool.indexOf(v) < 0) nearPool.push(v);
    });
    const d2 = pick(rnd, nearPool);
    const opt = numCards(rnd, total, d1, d2);
    const q = { kind: 'combo', hole: null, GW: 0, GH: 0, bricks: bricks,
      cards: opt.items, answer: opt.answerIdx, ans: total,
      placed: null, sel: null, miss: 0, solved: false, warm: false };
    if (!avoidSigs.some(s => s === sigOf(q))) return q;
  }
  /* 兜底模板：b3+sq+b2=9 格（干扰部分和 6 + 近误 10）——确定性保 verify */
  const bricks = [{ cells: [[0, 0], [1, 0], [2, 0]], kind: 'b3' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], kind: 'sq' },
    { cells: [[0, 0], [1, 0]], kind: 'b2' }];
  const opt = numCards(rnd, 9, 6, 10);
  return { kind: 'combo', hole: null, GW: 0, GH: 0, bricks: bricks,
    cards: opt.items, answer: opt.answerIdx, ans: 9,
    placed: null, sel: null, miss: 0, solved: false, warm: false };
}

/* ---------- dch4 unit2 生成：挖空区 G 格（2..8，单砖或双砖拼接），一格住 2 只 → 真值 2G
   干扰：d1=G（忘换算典型错——恒在场，须区分 G 与 2G）；d2=2G±2 ---------- */
function genUnit2(rnd, avoidSigs) {
  for (let t = 0; t < 60; t++) {
    const bare = rnd() < 0.45 ? holeSingle(rnd) : holePair(rnd).hole;
    if (bare.length < 2 || bare.length > 8) continue;
    const G = bare.length, ans = 2 * G;
    let nearPool = [];
    [ans - 2, ans + 2].forEach(v => {
      if (v > 0 && v !== G && v !== ans && nearPool.indexOf(v) < 0) nearPool.push(v);
    });
    const d2 = pick(rnd, nearPool);
    const opt = numCards(rnd, ans, G, d2);
    const site = padSite(rnd, bare, null);
    const q = { kind: 'unit2', hole: site.hole, GW: site.GW, GH: site.GH,
      cards: opt.items, answer: opt.answerIdx, ans: ans,
      placed: null, sel: null, miss: 0, solved: false, warm: false };
    if (!avoidSigs.some(s => s === sigOf(q))) return q;
  }
  /* 兜底模板：b2 两格 → 4 只（干扰 G=2 + 2G+2=6）——确定性保 verify */
  const opt = numCards(rnd, 4, 2, 6);
  return { kind: 'unit2', hole: [[0, 0], [1, 0]], GW: 2, GH: 1,
    cards: opt.items, answer: opt.answerIdx, ans: 4,
    placed: null, sel: null, miss: 0, solved: false, warm: false };
}

/* ---------- ch1 count 生成（dch2-4 首题热身，b17 原样保留）：hole=单砖(1-4)或双砖拼(4-8) ---------- */
function genCount(rnd, avoidSigs) {
  const FALLBACK = [[[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]]];
  for (let t = 0; t < 40; t++) {
    const bare = rnd() < 0.45 ? holeSingle(rnd) : holePair(rnd).hole;
    const site = padSite(rnd, bare, null);
    const opt = numItems(rnd, site.hole.length);
    const q = { kind: 'count', hole: site.hole, GW: site.GW, GH: site.GH,
      cards: opt.items, answer: opt.answerIdx, ans: site.hole.length,
      placed: null, sel: null, miss: 0, solved: false, warm: false };
    if (!avoidSigs.some(s => s === sigOf(q))) return q;
  }
  for (let f = 0; f < FALLBACK.length; f++) {                    // 兜底模板（sig 避让优先）
    const site = padSite(rnd, FALLBACK[f], null);
    const opt = numItems(rnd, site.hole.length);
    const q = { kind: 'count', hole: site.hole, GW: site.GW, GH: site.GH,
      cards: opt.items, answer: opt.answerIdx, ans: site.hole.length,
      placed: null, sel: null, miss: 0, solved: false, warm: false };
    if (!avoidSigs.some(s => s === sigOf(q))) return q;
  }
  const opt = numItems(rnd, 3);                                  // 终局兜底（verify 可抓）
  return { kind: 'count', hole: [[0, 0], [1, 0], [2, 0]], GW: 3, GH: 1,
    cards: opt.items, answer: opt.answerIdx, ans: 3,
    placed: null, sel: null, miss: 0, solved: false, warm: false };
}

/* ---------- 题签名（同关 5 题互异：kind+子型+挖空区签名+砖组+卡组+answer） ---------- */
function sigOf(q) {
  return q.kind + (q.sub ? ':' + q.sub : '') + '|' + (q.hole ? serCells(q.hole) : '-') + '|' +
    (q.bricks ? q.bricks.map(b => b.kind + ':' + serCells(b.cells)).join('+') + '|' : '') +
    q.cards.map(c => typeof c === 'number' ? String(c) : c.kind + ':' + serCells(c.cells)).join('/') +
    '|' + JSON.stringify(q.answer);
}

/* ---------- 单题生成（rnd 同流确定性；avoidSigs=本关已有 sig 全互异） ---------- */
function genOne(dch, qi, rnd, avoidSigs) {
  let q;
  if (dch === 1) q = genCalc(rnd, CALC_COMPOSE[qi], qi <= 2 ? 4 : 5, avoidSigs);
  else if (dch === 2) q = qi === 0 ? genCount(rnd, avoidSigs) : genSamearea(rnd, avoidSigs);   // 首题热身=count 型
  else if (dch === 3) q = qi === 0 ? genCount(rnd, avoidSigs) : genCombo(rnd, avoidSigs);
  else q = qi === 0 ? genCount(rnd, avoidSigs) : genUnit2(rnd, avoidSigs);
  q.warm = qi === 0 && dch !== 1;
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const quizzes = [], sigs = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, sigs);
    sigs.push(sigOf(q));
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 全题型单答案点卡（数字卡/砖卡通用）
   'right'/'done' 点对（推进）/'wrong' 点错（miss/retries 计一次，零惩罚可重点）/
   false 非法下标/关已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return false;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.cards.length) return false;
  if (i === q.answer) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;                                       // 不灰化款：同卡可重复点，每次计错
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（家族口径，永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用；§0.35 可解性由 verify 侧 ref 独立复算对账） ---------- */
const numCardsOk = (cards, ans) => {
  if (!Array.isArray(cards) || cards.length !== 3) return false;
  if (!cards.every(v => Number.isInteger(v) && v >= 1 && v <= 30)) return false;       // 数值域 1..30
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (cards[i] === cards[j]) return false;
  return cards.filter(v => v === ans).length === 1;                                    // 恰 1 张真值
};
function structOk(q) {
  if (!q || typeof q.kind !== 'string') return false;
  if (q.miss !== 0 || q.solved !== false) return false;
  if (!gridOk(q)) return false;
  if (q.kind === 'count') {
    if (!numCardsOk(q.cards, q.hole.length)) return false;
    if (!holeOk(q.hole) || q.hole.length < 1 || q.hole.length > 8) return false;
    return q.answer === q.cards.indexOf(q.hole.length) && q.ans === q.hole.length;
  }
  if (q.kind === 'calc') {
    if (q.sub !== 'area' && q.sub !== 'perim') return false;
    if (!Number.isInteger(q.L) || !Number.isInteger(q.W) || q.L < 2 || q.W < 2 || q.L > 5 || q.W > 5) return false;
    if (q.L * q.W > 20) return false;                                                 // 教学窗+工地域上限
    const ans = q.sub === 'area' ? q.L * q.W : 2 * (q.L + q.W);
    if (q.ans !== ans) return false;
    if (!numCardsOk(q.cards, ans)) return false;
    if (!holeOk(q.hole) || q.hole.length !== q.L * q.W) return false;                 // 格数=积
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;                                    // 矩形性：bbox=L×W
    q.hole.forEach(p => {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    });
    if (x1 - x0 + 1 !== q.L || y1 - y0 + 1 !== q.W) return false;                     // 无重复+连通+等数 ⇒ 完整矩形
    return q.answer === q.cards.indexOf(ans);
  }
  if (q.kind === 'samearea') {
    if (!Array.isArray(q.cards) || q.cards.length !== 3) return false;
    if (!cardsOk(q.cards)) return false;
    if (!holeOk(q.hole) || q.hole.length < 3 || q.hole.length > 4) return false;
    const hits = q.cards.filter(c => c.cells.length === q.hole.length);
    if (hits.length !== 1) return false;                                              // 恰 1 卡同面积
    if (sameShape(hits[0].cells, q.hole)) return false;                               // 正解异形状（同形状=轮廓匹配可解，违规）
    if (q.cards[q.answer].cells.length !== q.hole.length) return false;               // answer=该卡
    for (let i = 0; i < 3; i++)
      if (i !== q.answer && q.cards[i].cells.length === q.hole.length) return false;  // 干扰面积≠G
    return q.ans === q.hole.length;
  }
  if (q.kind === 'combo') {
    if (!Array.isArray(q.bricks) || q.bricks.length < 3 || q.bricks.length > 4) return false;
    if (!cardsOk(q.bricks)) return false;                                             // 砖组姿态/互异
    const total = q.bricks.reduce((s, b) => s + b.cells.length, 0);
    if (total < 6 || total > 12) return false;
    if (q.ans !== total) return false;
    if (!numCardsOk(q.cards, total)) return false;
    const partials = q.bricks.map(b => total - b.cells.length);
    const dis = q.cards.filter((v, i) => i !== q.answer);
    if (!dis.some(v => partials.indexOf(v) >= 0)) return false;                       // 部分和典型错在场
    return q.answer === q.cards.indexOf(total);
  }
  if (q.kind === 'unit2') {
    if (!holeOk(q.hole) || q.hole.length < 2 || q.hole.length > 8) return false;
    const ans = 2 * q.hole.length;
    if (q.ans !== ans) return false;
    if (!numCardsOk(q.cards, ans)) return false;
    if (q.cards.indexOf(q.hole.length) < 0 || q.cards.indexOf(q.hole.length) === q.answer) return false;  // G 陷阱在场且非答案
    return q.answer === q.cards.indexOf(ans);
  }
  return false;
}
