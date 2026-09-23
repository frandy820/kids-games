/* ================= memgrid 纯引擎：确定性关卡生成 + 两态点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-BATCH9 §3；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 3×3 k=2 / dch2 3×3 k=3 / dch3 4×4 k=3 / dch4 4×4 k=4（闪现 2500→2000ms）
   生成关（flat≥STATIC_LEVELS）= 随机规格（3/4）+ 档内随机 k，闪现 2000ms
   两态机制（本款特有）：q.phase 'show'（闪现期，engTap 一律 'show'=吞输入）→ 'input'（开放点选）
   零惩罚修正形态：点错不灭不锁，picked 满 k 格=题完成；同格重复点错不累计 miss（wrongSet 判重） */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 单题生成：cells = 从 N² 格均匀随机取 k 个互异格（确定性，同 rnd 流） ---------- */
function genOne(dch, rnd, gen) {
  let N, k, show;
  if (gen) {                                            // 生成关：随机规格 + 档内随机 k
    N = ri(rnd, 3, 4) === 3 ? 3 : 4;
    k = TIERS[N][ri(rnd, 0, TIERS[N].length - 1)];
    show = GEN_SHOW;
  } else {
    const sp = SPECS[dch];
    N = sp.N; k = sp.k; show = sp.show;
  }
  const all = [];
  for (let i = 0; i < N * N; i++) all.push(i);
  const cells = shuffled(all, rnd).slice(0, k);         // 洗牌取前 k=均匀随机且互异
  return { N: N, k: k, show: show, cells: cells,
           phase: 'show', picked: [], wrong: [], miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const gen = flat >= STATIC_LEVELS;                    // 静态 20 关之外=无限生成关
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(genOne(dch, rnd, gen));
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 两态切换（UI 的闪现计时器到期时调用；verify/skipShow 快进同口） ---------- */
function engToInput(L) {
  if (!L || L.done) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'show') return false;
  q.phase = 'input';
  return true;
}

/* ---------- 点格引擎（无 DOM）：engTap(L, i) —— 孩子点第 i 格
   'show'  = 闪现期（吞输入 §0.6 同源，tapCell 层返回 false）
   'right' = 点对一格（题继续）；'done' = 第 k 格点对（通关）
   'wrong' = 点错（晃动计错：新错格 miss+1；星级判据 retries 同步 +1）
   'again' = 重复点已点对格 / 重复点已错格（早退零惩罚不计数——同格重复点错不累计）
   null    = 非法 / 关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q.phase !== 'input') return 'show';               // 闪现期吞输入
  if (i < 0 || i >= q.N * q.N) return null;
  if (q.picked.indexOf(i) >= 0) return 'again';         // 已点对格：早退
  if (q.cells.indexOf(i) >= 0) {                        // 点对：亮起，k 格全亮=题完成
    q.picked.push(i);
    if (q.picked.length >= q.k) {
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return L.done ? 'done' : 'right';
    }
    return 'right';
  }
  if (q.wrong.indexOf(i) >= 0) return 'again';          // 同格重复点错：不累计 miss（§3 定版）
  q.wrong.push(i);
  q.miss++;
  L.retries++;                                          // 错次（星级判据；同格重复不计）
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错次=3 星；错次 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：N 合法 / cells 互异且 k=章规格 / 格号在界内 ---------- */
function structOk(q, dch, gen) {
  if (!q) return false;
  if ([3, 4].indexOf(q.N) < 0) return false;
  if (!q.cells || q.cells.length !== q.k) return false;
  for (let i = 0; i < q.cells.length; i++) {
    const c = q.cells[i];
    if (c < 0 || c >= q.N * q.N) return false;
    for (let j = i + 1; j < q.cells.length; j++) if (c === q.cells[j]) return false;   // 互异
  }
  if (gen) return TIERS[q.N].indexOf(q.k) >= 0;         // 生成关：k ∈ 该规格档位
  const sp = SPECS[dch];
  return q.N === sp.N && q.k === sp.k && q.show === sp.show;   // 静态关：N/k/show=章规格
}
