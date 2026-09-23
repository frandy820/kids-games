/* ================= sudokunum 纯引擎：确定性出题 + 点格/选数判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + qi * 677 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   数据模型（SPEC §3 钩子契约）：quiz = { grid[36]（0 空/1-6 当前值），given[36]（bool 预填），
   sol[36]（完整解），sel（选中格 idx 或 -1），_miss，solved }；
   level L = { flat, ch, dch, lv, quizzes[5], step, misses, done }。
   生成管线（§0.42）：完整解模板 → 同构变换（带内行互换/堆内列互换/数字置换，均保有效性）
   → 按章空格数逐洞挖空，每洞用回溯求解器计数（上限 2）验唯一解+章特性链维持，
   不满足即恢复换洞——唯一解与可解链由此成立。game-verify 另带独立求解器分源复算。 */
function mulberry32(a) {
  return function () {
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数

/* ---------- 同构变换（照 batch4/sudoku，全部保持数独有效性）：
   行互换仅在带内（BOX_R 行一组）、列互换仅在堆内（BOX_C 列一组）、数字置换是重标记 ---------- */
function transformBoard(tpl, rnd) {
  const g = tpl.slice();
  const swapRows = (a, b) => { for (let c = 0; c < N6; c++) { const t = g[a * N6 + c]; g[a * N6 + c] = g[b * N6 + c]; g[b * N6 + c] = t; } };
  const swapCols = (a, b) => { for (let r = 0; r < N6; r++) { const t = g[r * N6 + a]; g[r * N6 + a] = g[r * N6 + b]; g[r * N6 + b] = t; } };
  for (let round = 0; round < 2; round++) {
    for (let bd = 0; bd < N6 / BOX_R; bd++) {          // 3 个行带
      const x = bd * BOX_R + Math.floor(rnd() * BOX_R), y = bd * BOX_R + Math.floor(rnd() * BOX_R);
      if (x !== y) swapRows(x, y);
    }
    for (let st = 0; st < N6 / BOX_C; st++) {           // 2 个列堆
      const x = st * BOX_C + Math.floor(rnd() * BOX_C), y = st * BOX_C + Math.floor(rnd() * BOX_C);
      if (x !== y) swapCols(x, y);
    }
  }
  const perm = shuffled([1, 2, 3, 4, 5, 6], rnd);       // 数字置换（1 基）
  for (let i = 0; i < N6 * N6; i++) g[i] = perm[g[i] - 1];
  return g;
}

/* ---------- 回溯求解器（计数版，cap=2 即"是否唯一"；游戏侧生成专用）
   位掩码行/列/宫占用 + MRV（最少候选优先），6×6 上毫秒级 ---------- */
function countSolutions(cells, cap) {
  cap = cap || 2;
  const rows = new Array(N6).fill(0), cols = new Array(N6).fill(0), boxes = new Array(N6).fill(0);
  const g = cells.slice();
  for (let i = 0; i < N6 * N6; i++) {
    const v = g[i];
    if (v === 0) continue;
    const r = (i / N6) | 0, c = i % N6, b = ((r / BOX_R) | 0) * (N6 / BOX_C) + ((c / BOX_C) | 0);
    const bit = 1 << v;
    if ((rows[r] | cols[c] | boxes[b]) & bit) return 0;  // 题面自身冲突=0 解
    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
  }
  let count = 0;
  const dfs = function () {
    let bi = -1, bcnt = -1, bmask = 0;
    for (let i = 0; i < N6 * N6; i++) {
      if (g[i] !== 0) continue;
      const r = (i / N6) | 0, c = i % N6, b = ((r / BOX_R) | 0) * (N6 / BOX_C) + ((c / BOX_C) | 0);
      const used = rows[r] | cols[c] | boxes[b];
      let m = 0, cnt = 0;
      for (let v = 1; v <= N6; v++) if (!(used & (1 << v))) { m |= 1 << v; cnt++; }
      if (cnt === 0) return;                            // 死端
      if (bcnt < 0 || cnt < bcnt) { bcnt = cnt; bi = i; bmask = m; if (cnt === 1) break; }
    }
    if (bi < 0) { count++; return; }                    // 无空格=找到一解
    const r = (bi / N6) | 0, c = bi % N6, b = ((r / BOX_R) | 0) * (N6 / BOX_C) + ((c / BOX_C) | 0);
    for (let v = 1; v <= N6; v++) {
      const bit = 1 << v;
      if (!(bmask & bit)) continue;
      g[bi] = v; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      dfs();
      g[bi] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (count >= cap) return;
    }
  };
  dfs();
  return count;
}

/* ---------- 裸单链可解性（章特性与救援找格共用）
   useBox=false：只用行/列排除（ch1 口径"行/列直接排除"）；useBox=true：行/列/宫。
   返回 true=整盘可由裸单推理解出（7-8 岁不猜数可完成）；makeNakedMap 另给逐格快照 ---------- */
function nakedChain(cells, useBox) {
  const g = cells.slice();
  let left = g.filter(v => v === 0).length;
  let guard = 0;
  while (left > 0 && guard++ < 40) {
    let hit = -1, val = 0;
    for (let i = 0; i < N6 * N6 && hit < 0; i++) {
      if (g[i] !== 0) continue;
      const cand = candOf(g, i, useBox);
      if (cand.length === 1) { hit = i; val = cand[0]; }
    }
    if (hit < 0) return false;                          // 无裸单=链断
    g[hit] = val; left--;
  }
  return left === 0;
}
/* 格 i 的候选数组（useBox 控制是否含宫排除） */
function candOf(g, i, useBox) {
  const r = (i / N6) | 0, c = i % N6;
  const used = [false, false, false, false, false, false, false];
  for (let j = 0; j < N6 * N6; j++) {
    if (j === i || g[j] === 0) continue;
    const r2 = (j / N6) | 0, c2 = j % N6;
    const sameBox = r2 >> 1 === r >> 1 && ((c2 / BOX_C) | 0) === ((c / BOX_C) | 0);
    if (r2 === r || c2 === c || (useBox && sameBox)) used[g[j]] = true;
  }
  const out = [];
  for (let v = 1; v <= N6; v++) if (!used[v]) out.push(v);
  return out;
}

/* ---------- 单盘生成（章规格贪心挖洞；失败重摆最多 60 次）
   每洞条件：唯一解（countSolutions===1）+ 章链维持（rowcol/full）；
   挖完再验 mustbox（ch3：纯行/列链不可解=宫必用）与空格区间 ---------- */
function genBoard(rnd, spec) {
  for (let att = 0; att < 60; att++) {
    const arnd = mulberry32((rnd() * 0xFFFFFF) | 0);    // attempt 独立子随机流
    const sol = transformBoard(TEMPLATES_6[Math.floor(arnd() * TEMPLATES_6.length)], arnd);
    const cells = sol.slice();
    const target = ri(arnd, spec.lo, spec.hi);
    const order = shuffled(Array.from({ length: N6 * N6 }, (_, k) => k), arnd);
    let holes = 0;
    for (let k = 0; k < order.length && holes < target; k++) {
      const i = order[k], v = cells[i];
      cells[i] = 0;
      let ok = countSolutions(cells, 2) === 1;          // 唯一才可挖
      if (ok && spec.chain) ok = nakedChain(cells, spec.chain === 'full');
      if (ok) holes++;
      else cells[i] = v;                                // 不满足=恢复换洞
    }
    if (holes < spec.lo || holes > spec.hi) continue;   // 没挖进区间=重摆
    if (spec.mustbox && nakedChain(cells, false)) continue;  // ch3：行/列链能解=宫没用上，重摆
    return { grid: cells.slice(), given: cells.map(v => v !== 0), sol: sol,
      holes: holes, _sig: cells.join('') };
  }
  return null;                                          // 理论不可达（区间宽松+60 次尝试）
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道，同 flat 永远同关）
   生成关（flat≥20）用 ch4 规格：12-14 空随机验证唯一解（§0.42） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // 生成关难度随机回落（审查 m4：对齐 §0.3 batch11 M1 定版）
  const quizzes = [];
  const used = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const qrnd = mulberry32(flat * 7919 + qi * 677 + 13);   // 每盘子随机流（同关互异）
    let b = null;
    for (let att = 0; att < 80; att++) {                    // sig 互异重试
      const cand = genBoard(qrnd, HOLE_SPEC[dch]);
      if (cand && used.indexOf(cand._sig) < 0) { b = cand; break; }
    }
    if (!b) b = genBoard(qrnd, HOLE_SPEC[dch]);             // 兜底（区间内必出）
    used.push(b._sig);
    quizzes.push({ grid: b.grid, given: b.given, sol: b.sol, holes: b.holes,
      sel: -1, _miss: 0, solved: false });
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, misses: 0, done: false };
}

/* ---------- 对局引擎（无 DOM）
   engTapCell：选中空格 / 清除自己填的格 / given 不可清 → true/false
   engTapNum：'right' 填对（盘未满）/ 'done' 本盘完成推进 / 'wrong' 违反约束（miss+1 零惩罚）
   / false 非法（无选中/越界/已解）。填对判定=约束满足（对 givens 唯一解；对孩子已放的
   「合规但非解」值不保证——死局由此产生，由 engTeachCell 死局检测兜底——审查 M3） ---------- */
/* v 放 i 的冲突源格列表（行/列/宫同值格，不含 i 自身；UI 红闪教学用） */
function engConflictCells(q, i, v) {
  const r = (i / N6) | 0, c = i % N6, out = [];
  for (let j = 0; j < N6 * N6; j++) {
    if (j === i || q.grid[j] !== v) continue;
    const r2 = (j / N6) | 0, c2 = j % N6;
    if (r2 === r || c2 === c ||
        (r2 >> 1 === r >> 1 && ((c2 / BOX_C) | 0) === ((c / BOX_C) | 0))) out.push(j);
  }
  return out;
}
function engConflictAt(q, i, v) { return engConflictCells(q, i, v).length > 0; }
function engBoardFullOk(q) {
  return q.grid.every(v => v !== 0);                        // 冲突值不会入格（见 uiTapNum）
}
function engTapCell(L, i) {
  if (!L || L.done || !L.quizzes[L.step]) return false;
  const q = L.quizzes[L.step];
  if (i < 0 || i >= N6 * N6 || q.solved) return false;
  if (q.grid[i] !== 0) {                                   // 已填：given 不可清 / 自己填的清除
    if (q.given[i]) return false;
    q.grid[i] = 0;
    if (q.sel === i) q.sel = -1;
    return true;
  }
  q.sel = q.sel === i ? -1 : i;                            // 空格：选中/再点取消
  return true;
}
function engTapNum(L, n) {
  if (!L || L.done || !L.quizzes[L.step]) return false;
  const q = L.quizzes[L.step];
  if (q.solved || n < 1 || n > N6 || q.sel < 0) return false;
  const i = q.sel;
  if (q.grid[i] !== 0) return false;
  if (engConflictAt(q, i, n)) {                            // 违反约束=错（摇头零惩罚，错数不进格）
    q._miss++;
    L.misses++;
    q.sel = -1;                                            // 错误终结当前选择态（重点格重选）
    return 'wrong';
  }
  q.grid[i] = n;
  q.sel = -1;
  if (engBoardFullOk(q)) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return 'done';
  }
  return 'right';
}
/* 唯一候选教学格（救援/梯度脚手架/教学演示找格共用）：
   死局检测先行（审查 M3）：存在 0 候选空格（孩子已放"合规但非解"值堵死）→ 返回
   {i:孩子放错的格, n:null, dead:true}（指错格而非指 0 候选格——原逻辑指的值必冲突，
   照做=跟着提示被记错）；无死局：优先行/列裸单（hint 文案贴合）→ 含宫裸单 → 最少候选格
   （0 候选格不入 fallback）；返回 {i, n}（n=该格应填值=解值），无空格返回 null */
function engTeachCell(q) {
  let deadHit = false, mine = -1;
  for (let i = 0; i < N6 * N6; i++) {
    if (q.grid[i] === 0) {
      if (!deadHit && candOf(q.grid, i, true).length === 0) deadHit = true;
    } else if (mine < 0 && !q.given[i] && q.grid[i] !== q.sol[i]) {
      mine = i;                                  // 孩子放的且非解（合规但错的格）
    }
  }
  if (deadHit) {
    if (mine >= 0) return { i: mine, n: null, dead: true };
    return null;                                 // 死局但找不到错格（理论不可达，防御）
  }
  let fallback = null;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < N6 * N6; i++) {
      if (q.grid[i] !== 0) continue;
      const cand = candOf(q.grid, i, pass === 1);
      if (cand.length === 0) continue;           // M3：0 候选格不入 fallback
      if (cand.length === 1) return { i: i, n: cand[0] };
      if (!fallback || cand.length < fallback.cnt) fallback = { i: i, n: q.sol[i], cnt: cand.length };
    }
  }
  return fallback ? { i: fallback.i, n: fallback.n } : null;
}
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);

/* ---------- 结构校验（引擎侧自检；verify 侧另有独立求解器/链复算分源 §0.42）
   grid 与 sol 同长 36、given 处 grid===sol、空格数在章区间、sol 为有效完整解 ---------- */
function structOk(q, dch) {
  if (!q || !q.grid || q.grid.length !== N6 * N6 || q.sol.length !== N6 * N6) return false;
  const spec = HOLE_SPEC[dch];
  const holes = q.grid.filter(v => v === 0).length;
  if (holes < spec.lo || holes > spec.hi) return false;
  for (let i = 0; i < N6 * N6; i++) {
    if (q.given[i] !== (q.grid[i] !== 0)) return false;   // given 标记与盘面一致
    if (q.given[i] && q.grid[i] !== q.sol[i]) return false;  // 提示格=解的一部分（§0.42）
  }
  return validateFullSol(q.sol);
}
function validateFullSol(sol) {
  const want = (1 << 7) - 2;                              // 位 1-6 全集
  for (let r = 0; r < N6; r++) {
    let m = 0;
    for (let c = 0; c < N6; c++) m |= 1 << sol[r * N6 + c];
    if (m !== want) return false;
  }
  for (let c = 0; c < N6; c++) {
    let m = 0;
    for (let r = 0; r < N6; r++) m |= 1 << sol[r * N6 + c];
    if (m !== want) return false;
  }
  for (let b = 0; b < N6; b++) {
    let m = 0;
    const r0 = ((b / (N6 / BOX_C)) | 0) * BOX_R, c0 = (b % (N6 / BOX_C)) * BOX_C;
    for (let dr = 0; dr < BOX_R; dr++)
      for (let dc = 0; dc < BOX_C; dc++) m |= 1 << sol[(r0 + dr) * N6 + c0 + dc];
    if (m !== want) return false;
  }
  return true;
}
