/* ================= stack 纯引擎：确定性关卡生成 + 堆叠平衡判定 + 稳定解求解（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   平衡模型（SPEC-BATCH18 §0.38/§2，简化确定性）：
   - 每层偏移 off = (col + wind) - 下层实际中心（格单位；首层下层=地基中心列 baseC）
   - 层稳定：|off| ≤ max(0, 下层半宽 - 当前块半宽) + 0.5（安全裕度）
     （clamp 0：下层更窄时=必须对齐才能放——"宽的放窄的要放正"题型语义；
       无 clamp 则下窄上宽任何放置全倒，ch2 该型不可玩）
   - 累积稳定：|Σ各层 off| ≤ 地基半宽 2.5（每放一层即时判定 → 越叠越险）
   - 全对齐路径（每块 off=0）恒满足两条件 → 每题稳定解存在性平凡成立；
     ch4 生成关另要求稳定解数 ≥2（解不唯一，countSols 截断计数）
   风摆块：放置实际中心 = col + wind（wind ±1），孩子须点反向列抵消（预判启蒙）
   章型：
     dch1 单列堆 3-4 块（宽度非增自 4 起，对齐宽容）
     dch2 块宽渐变（下宽上窄=非增 / 下窄上宽=非降，均含至少一处严格变化）
     dch3 含 1 个风摆块（4 块，wind 块不在首层）
     dch4 生成关 5-6 块 + 2 个风摆块，稳定解 ≥2
     dch2/3/4 首题（qi0）=dch1 型热身（SPEC §0 家族先例）
   同关相邻题楼层序列 sig 互异
   判定：engPlace(L, col) —— 'placed'/'win'（推进）/ 'fall'（misses 计一次，倒塌零惩罚从当前层重搭）/ null
   solveSeq：从当前部分塔续解（列序中心向外，优先对齐贴近孩子直觉）；verify 侧 refSolve 分源复算 */
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

/* ---------- 平衡判定（引擎唯一真值源；verify 侧 refLayerOk/refCumOk 分源独立实现） ---------- */
const layerOk = (off, wLower, wUpper) =>
  Math.abs(off) <= Math.max(0, wLower / 2 - wUpper / 2) + GRID.margin;
const cumOk = sum => Math.abs(sum) <= GRID.baseW / 2;
const cumSum = q => q.placed.reduce((s, p) => s + p.off, 0);
const lowC = (q, i) => i === 0 ? GRID.baseC : q.placed[i - 1].col + q.floors[i - 1].wind;
const lowW = (q, i) => i === 0 ? GRID.baseW : q.floors[i - 1].w;

/* 楼层序列 sig（同关相邻题互异对账） */
const sig = q => q.floors.map(f => '' + f.w + (f.wind > 0 ? '+' : f.wind < 0 ? '-' : '0')).join('');

/* ---------- 稳定解求解：从 q 当前部分塔续解（DFS；列序中心向外优先对齐）
   返回剩余块的放置列数组，或 null（无解） ---------- */
function solveSeq(q) {
  const res = [];
  const ORDER = [3, 2, 4, 1, 5, 0, 6];
  const lc0 = q.placed.length ? q.placed[q.placed.length - 1].col + q.floors[q.placed.length - 1].wind : GRID.baseC;
  function dfs(i, lc, sum) {
    if (i >= q.floors.length) return true;
    const f = q.floors[i], lw = lowW(q, i);
    for (let k = 0; k < ORDER.length; k++) {
      const col = ORDER[k];
      const off = col + f.wind - lc;
      if (!layerOk(off, lw, f.w)) continue;
      if (!cumOk(sum + off)) continue;
      res.push(col);
      if (dfs(i + 1, col + f.wind, sum + off)) return true;
      res.pop();
    }
    return false;
  }
  return dfs(q.step, lc0, cumSum(q)) ? res : null;
}
/* 稳定解计数（cap 截断；ch4 生成用"解不唯一"断言） */
function countSols(q, cap) {
  let n = 0;
  const total = q.floors.length;
  function dfs(i, lc, sum) {
    if (n >= cap) return;
    if (i >= total) { n++; return; }
    const f = q.floors[i], lw = lowW(q, i);
    for (let col = 0; col < GRID.cols; col++) {
      const off = col + f.wind - lc;
      if (!layerOk(off, lw, f.w)) continue;
      if (!cumOk(sum + off)) continue;
      dfs(i + 1, col + f.wind, sum + off);
      if (n >= cap) return;
    }
  }
  dfs(0, GRID.baseC, 0);
  return n;
}

/* ---------- 生成器 ---------- */
/* 楼层块工厂：宽度数组 + wind 指定 → floors（ci 轮转 4 色相邻互异） */
function mkFloors(rnd, ws, winds) {
  const start = ri(rnd, 0, 3);
  return ws.map((w, i) => ({ w: w, ci: (start + i) % 4, wind: (winds && winds[i]) || 0 }));
}
function mkQuiz(ws, winds, rnd) {
  const floors = mkFloors(rnd, ws, winds);
  const q = { floors: floors, placed: [], step: 0, miss: 0, solved: false, warm: false };
  return q;
}
/* dch1 热身/单列堆：首块 4 宽，后续非增（2..前块），3-4 块无风（对齐宽容） */
function genWarm(rnd) {
  const n = ri(rnd, 3, 4);
  const ws = [4];
  for (let i = 1; i < n; i++) ws.push(ri(rnd, 2, ws[i - 1]));
  return mkQuiz(ws, null, rnd);
}
/* dch2 宽渐变：narrow 下宽上窄（4 起非增）/ wide 下窄上宽（2 起非降），3-4 块，至少一处严格变化 */
function genCh2(rnd) {
  let ws, tries = 0;
  do {
    if (rnd() < 0.5) {                       // 下宽上窄
      const n = ri(rnd, 3, 4);
      ws = [4];
      for (let i = 1; i < n; i++) ws.push(ri(rnd, 2, ws[i - 1]));
    } else {                                 // 下窄上宽
      const n = ri(rnd, 3, 4);
      ws = [2];
      for (let i = 1; i < n; i++) ws.push(ri(rnd, ws[i - 1], 4));
    }
    tries++;
  } while ((!ws.some((w, i) => i > 0 && w !== ws[i - 1]) || ws.length < 3) && tries < 40);
  if (!ws.some((w, i) => i > 0 && w !== ws[i - 1])) ws = [4, 3, 2];   // 兜底（40 次全败概率极低）
  return mkQuiz(ws, null, rnd);
}
/* dch3 风摆：4 块非增自 4，恰 1 个风摆块（非首层），wind ±1 */
function genCh3(rnd) {
  const n = 4;
  const ws = [4];
  for (let i = 1; i < n; i++) ws.push(ri(rnd, 2, ws[i - 1]));
  const wi = ri(rnd, 1, n - 1);
  const winds = {};
  winds[wi] = rnd() < 0.5 ? -1 : 1;
  return mkQuiz(ws, winds, rnd);
}
/* dch4 生成关：5-6 块随机步进宽度 + 2 个风摆块（不同层非首层），稳定解 ≥2 */
function genCh4(rnd) {
  let q = null, tries = 0;
  do {
    const n = ri(rnd, 5, 6);
    const ws = [ri(rnd, 2, 4)];
    for (let i = 1; i < n; i++) ws.push(Math.max(2, Math.min(4, ws[i - 1] + ri(rnd, -1, 1))));
    const i1 = ri(rnd, 1, n - 2), i2 = ri(rnd, i1 + 1, n - 1);
    const winds = {};
    winds[i1] = rnd() < 0.5 ? -1 : 1;
    winds[i2] = rnd() < 0.5 ? -1 : 1;
    q = mkQuiz(ws, winds, rnd);
    tries++;
  } while (countSols(q, 3) < 2 && tries < 40);
  if (countSols(q, 3) < 2) {                 // 兜底模板：解数充裕的确定性序列
    const winds = { 1: 1, 3: -1 };
    q = mkQuiz([4, 4, 3, 3, 2], winds, rnd);
  }
  return q;
}
/* 单题生成（rnd 同流确定性；avoid=同关已出题 sig 集合，全关互异） */
function genOne(dch, qi, rnd, avoid) {
  let q = null, tries = 0;
  do {
    q = (dch === 1 || (qi === 0 && dch !== 1)) ? genWarm(rnd)
      : dch === 2 ? genCh2(rnd)
      : dch === 3 ? genCh3(rnd)
      : genCh4(rnd);
    tries++;
  } while (avoid != null && avoid.has(sig(q)) && tries < 120);
  q.warm = qi === 0 && dch !== 1;
  return q;
}
/* 关卡生成（静态 20 关与生成关同一确定性通道） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);
  const quizzes = [];
  const avoid = new Set();
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, avoid);
    avoid.add(sig(q));
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, misses: 0, done: false };
}

/* ---------- 放置引擎（无 DOM）：engPlace(L, col) —— 点列放置当前块
   'placed' 放稳待续 / 'win' 本题楼层放完塔立（推进） / 'fall' 倒塌（misses 计一次，零惩罚重搭）
   null 非法列/关已结束 */
function engPlace(L, col) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.solved) return null;
  if (typeof col !== 'number' || Math.floor(col) !== col || col < 0 || col >= GRID.cols) return null;
  const f = q.floors[q.step];
  const off = col + f.wind - lowC(q, q.step);
  if (!layerOk(off, lowW(q, q.step), f.w) || !cumOk(cumSum(q) + off)) {
    q.miss++;
    L.misses++;                              // 倒塌一次 = 1 错（星级口径）
    return 'fall';
  }
  q.placed.push({ col: col, off: off });
  q.step++;
  if (q.step >= q.floors.length) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return 'win';
  }
  return 'placed';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（家族口径，永不 0 星） */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：楼层序列域 + 运行态自洽 */
function structOk(q) {
  if (!q || !Array.isArray(q.floors) || q.floors.length < 3 || q.floors.length > 6) return false;
  for (let i = 0; i < q.floors.length; i++) {
    const f = q.floors[i];
    if (!Number.isInteger(f.w) || f.w < 2 || f.w > 4) return false;              // 宽 2-4 格
    if (!(f.wind === -1 || f.wind === 0 || f.wind === 1)) return false;          // 风 ∈ {0,±1}
    if (!Number.isInteger(f.ci) || f.ci < 0 || f.ci > 3) return false;           // 色板 4 色
    if (i > 0 && f.ci === q.floors[i - 1].ci) return false;                      // 相邻互异
  }
  if (!Array.isArray(q.placed) || q.placed.length !== q.step) return false;      // placed/step 自洽
  if (!Number.isInteger(q.miss) || q.miss < 0) return false;
  if (q.solved !== (q.step === q.floors.length)) return false;
  for (let i = 0; i < q.placed.length; i++) {
    if (!Number.isInteger(q.placed[i].col) || q.placed[i].col < 0 || q.placed[i].col >= GRID.cols) return false;
    const want = q.placed[i].col + q.floors[i].wind - (i === 0 ? GRID.baseC : q.placed[i - 1].col + q.floors[i - 1].wind);
    if (q.placed[i].off !== want) return false;                                  // 偏移可复算
  }
  return true;
}
