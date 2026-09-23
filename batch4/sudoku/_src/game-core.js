/* ================= sudoku 纯引擎（无 DOM） =================
   生成管线（SPEC-BATCH4 §3 核心门禁）：
   写死完整解模板 → 同构变换（带内行互换/堆内列互换/动物编号置换，均保有效性）
   → mulberry32(flat*7919+13) 按序变换 → 逐洞尝试挖洞，
   每挖一洞用回溯求解器计数（上限 2）验证唯一解，不唯一即恢复换洞。
   UI 与 ?verify=1 共用本文件，防两套逻辑漂移。 */
'use strict';

/* 本关规格：静态 20 关写死；flat≥20 生成关 4×4/6×6 交替爬坡（洞数循环上调） */
function specOf(flat) {
  if (flat < LEVEL_SPECS.length) return LEVEL_SPECS[flat];
  const k = flat - LEVEL_SPECS.length;
  return (k % 2 === 0)
    ? { n: 4, holes: 6 + (Math.floor(k / 2) % 2) }   /* 6,7 交替 */
    : { n: 6, holes: 9 + (Math.floor(k / 2) % 4) };  /* 9..12 循环爬坡 */
}

/* ---------- 同构变换：全部保持数独有效性 ----------
   行互换仅在带（band，boxR 行一组）内、列互换仅在堆（stack，boxC 列一组）内，
   动物编号置换是重标记——三者均不破坏行/列/宫约束 */
function transformBoard(tpl, cfg, rnd) {
  const n = cfg.n, g = tpl.slice();
  const swapRows = function(a, b) {
    for (let c = 0; c < n; c++) { const t = g[a * n + c]; g[a * n + c] = g[b * n + c]; g[b * n + c] = t; }
  };
  const swapCols = function(a, b) {
    for (let r = 0; r < n; r++) { const t = g[r * n + a]; g[r * n + a] = g[r * n + b]; g[r * n + b] = t; }
  };
  const bands = n / cfg.boxR, stacks = n / cfg.boxC;
  for (let round = 0; round < 2; round++) {
    for (let bd = 0; bd < bands; bd++) {
      const x = bd * cfg.boxR + Math.floor(rnd() * cfg.boxR);
      const y = bd * cfg.boxR + Math.floor(rnd() * cfg.boxR);
      if (x !== y) swapRows(x, y);
    }
    for (let st = 0; st < stacks; st++) {
      const x = st * cfg.boxC + Math.floor(rnd() * cfg.boxC);
      const y = st * cfg.boxC + Math.floor(rnd() * cfg.boxC);
      if (x !== y) swapCols(x, y);
    }
  }
  const perm = shuffled(Array.from({ length: n }, function(_, i) { return i; }), rnd);
  for (let i = 0; i < n * n; i++) g[i] = perm[g[i]];
  return g;
}

/* ---------- 回溯求解器（计数版，cap=2 即"是否唯一"）
   位掩码行/列/宫占用 + MRV（最少候选优先），4×4/6×6 上毫秒级 ---------- */
function countSolutions(cells, cfg, cap) {
  cap = cap || 2;
  const n = cfg.n, boxR = cfg.boxR, boxC = cfg.boxC, N = n * n;
  const g = cells.slice();
  const rows = new Array(n).fill(0), cols = new Array(n).fill(0), boxes = new Array(n).fill(0);
  for (let i = 0; i < N; i++) {
    const v = g[i];
    if (v < 0) continue;
    const r = (i / n) | 0, c = i % n;
    const b = ((r / boxR) | 0) * (n / boxC) + ((c / boxC) | 0);
    const bit = 1 << v;
    if ((rows[r] | cols[c] | boxes[b]) & bit) return 0; /* 题面自身冲突=0 解 */
    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
  }
  let count = 0;
  const dfs = function() {
    let bi = -1, bcnt = -1, bmask = 0;
    for (let i = 0; i < N; i++) {
      if (g[i] >= 0) continue;
      const r = (i / n) | 0, c = i % n;
      const b = ((r / boxR) | 0) * (n / boxC) + ((c / boxC) | 0);
      const used = rows[r] | cols[c] | boxes[b];
      let m = 0, cnt = 0;
      for (let v = 0; v < n; v++) if (!(used & (1 << v))) { m |= 1 << v; cnt++; }
      if (cnt === 0) return;                 /* 死端 */
      if (bcnt < 0 || cnt < bcnt) { bcnt = cnt; bi = i; bmask = m; if (cnt === 1) break; }
    }
    if (bi < 0) { count++; return; }         /* 无空格=找到一解 */
    const r = (bi / n) | 0, c = bi % n;
    const b = ((r / boxR) | 0) * (n / boxC) + ((c / boxC) | 0);
    for (let v = 0; v < n; v++) {
      const bit = 1 << v;
      if (!(bmask & bit)) continue;
      g[bi] = v; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      dfs();
      g[bi] = -1; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (count >= cap) return;
    }
  };
  dfs();
  return count;
}

/* ---------- 完整解约束校验：每行/列/宫恰为 0..n-1 的排列（verify 用） ---------- */
function validateFull(cells, cfg) {
  const n = cfg.n, N = n * n;
  const want = (1 << n) - 1;
  const res = { ok: true, rows: true, cols: true, boxes: true };
  if (cells.length !== N || cells.some(function(v) { return v < 0 || v >= n; })) { res.ok = false; return res; }
  for (let r = 0; r < n; r++) {
    let m = 0;
    for (let c = 0; c < n; c++) m |= 1 << cells[r * n + c];
    if (m !== want) { res.rows = false; res.ok = false; }
  }
  for (let c = 0; c < n; c++) {
    let m = 0;
    for (let r = 0; r < n; r++) m |= 1 << cells[r * n + c];
    if (m !== want) { res.cols = false; res.ok = false; }
  }
  const nBC = n / cfg.boxC, nBox = n / cfg.boxR * nBC;
  for (let b = 0; b < nBox; b++) {
    let m = 0;
    const r0 = Math.floor(b / nBC) * cfg.boxR, c0 = (b % nBC) * cfg.boxC;
    for (let dr = 0; dr < cfg.boxR; dr++)
      for (let dc = 0; dc < cfg.boxC; dc++) m |= 1 << cells[(r0 + dr) * n + c0 + dc];
    if (m !== want) { res.boxes = false; res.ok = false; }
  }
  return res;
}

/* ---------- 关卡生成（静态与生成关同一确定性通道，同 flat 永远同关） ---------- */
function makeLevel(flat) {
  flat = Math.max(0, flat | 0);
  const spec = specOf(flat), cfg = SIZES[spec.n];
  const rnd = mulberry32(flat * 7919 + 13);
  const tpls = TEMPLATES[spec.n];
  const sol = transformBoard(tpls[Math.floor(rnd() * tpls.length)], cfg, rnd);
  const cells = sol.slice();
  const order = shuffled(Array.from({ length: spec.n * spec.n }, function(_, i) { return i; }), rnd);
  let holes = 0;
  for (let k = 0; k < order.length && holes < spec.holes; k++) {
    const i = order[k], v = cells[i];
    cells[i] = -1;
    if (countSolutions(cells, cfg, 2) === 1) holes++;   /* 唯一才保留 */
    else cells[i] = v;                                   /* 不唯一=恢复换洞 */
  }
  return {
    flat: flat, n: spec.n, boxR: cfg.boxR, boxC: cfg.boxC, targetHoles: spec.holes,
    sol: sol, cells: cells, given: cells.map(function(v) { return v >= 0; }),
    holes: holes, hints: 3, hintsUsed: 0, wrongs: 0, sel: -1, won: false
  };
}

/* ---------- 对局引擎 ---------- */
function engConflictsAt(L, i) {  /* 与格 i 同值且同行/列/宫的格（冲突源） */
  const v = L.cells[i];
  if (v < 0) return [];
  const n = L.n, r = (i / n) | 0, c = i % n;
  const br = ((r / L.boxR) | 0) * L.boxR, bc = ((c / L.boxC) | 0) * L.boxC;
  const out = [];
  for (let j = 0; j < n * n; j++) {
    if (j === i || L.cells[j] !== v) continue;
    const r2 = (j / n) | 0, c2 = j % n;
    if (r2 === r || c2 === c ||
        (r2 >= br && r2 < br + L.boxR && c2 >= bc && c2 < bc + L.boxC)) out.push(j);
  }
  return out;
}
function engAnyConflict(L) {
  for (let i = 0; i < L.cells.length; i++) if (engConflictsAt(L, i).length) return true;
  return false;
}
function engWon(L) {
  return L.cells.every(function(v) { return v >= 0; }) && !engAnyConflict(L);
}
/* 唯一候选（只看给定格——不受孩子填错干扰，且候选唯一时必等于解值） */
function engCandidatesGivens(L, i) {
  const n = L.n, r = (i / n) | 0, c = i % n;
  const br = ((r / L.boxR) | 0) * L.boxR, bc = ((c / L.boxC) | 0) * L.boxC;
  const used = new Array(n).fill(false);
  for (let j = 0; j < n * n; j++) {
    if (j === i || !L.given[j] || L.cells[j] < 0) continue;
    const r2 = (j / n) | 0, c2 = j % n;
    if (r2 === r || c2 === c ||
        (r2 >= br && r2 < br + L.boxR && c2 >= bc && c2 < bc + L.boxC)) used[L.cells[j]] = true;
  }
  const out = [];
  for (let v = 0; v < n; v++) if (!used[v]) out.push(v);
  return out;
}
/* 提示：优先"当前可唯一确定"的空格（唯一候选），否则回退到解值（唯一解保证其可推出） */
function engHint(L) {
  if (L.won || L.hintsUsed >= L.hints) return null;
  const n = L.n, N = n * n;
  for (let i = 0; i < N; i++) {
    if (L.cells[i] >= 0) continue;
    const cands = engCandidatesGivens(L, i);
    if (cands.length === 1) return { cell: i, animal: cands[0] };
  }
  for (let i = 0; i < N; i++) {
    if (L.cells[i] < 0) return { cell: i, animal: L.sol[i] };
  }
  return null;
}
/* 星级：提示 0 次=3 星 / 1-2 次=2 星 / 用满 3 次或冲突填入 ≥6 次=1 星（永不 0 星） */
function engStars(hintsUsed, wrongs) {
  return (hintsUsed >= 3 || wrongs >= 6) ? 1 : (hintsUsed === 0 ? 3 : 2);
}
/* autoSolve 引擎直驱：全部空格填解值 → 必胜 */
function engAutoFill(L) {
  for (let i = 0; i < L.cells.length; i++) if (!L.given[i]) L.cells[i] = L.sol[i];
  L.won = engWon(L);
  return L.won;
}
