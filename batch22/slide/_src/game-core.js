/* ================= slide 纯引擎：确定性盘面生成（K 步合法滑动构造）+ 滑块判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章型（SPEC-BATCH22 §2/§0.50；进度章号单调递增、难度章号 (ch-1)%4+1 循环；生成关随机章参数）：
     dch1 2×2  K∈[3,6]  / dch2 2×3（W=3,H=2）K∈[6,12] / dch3 3×3 K∈[12,20]
     dch4 盘型轮换：每关 5 题盘型计划 = shuffled([1,2,3,1,2])（≥2 种盘型，SPEC「ch4 生成关盘型轮换」）
   可解性构造（§0.50 核心，禁随机排列——3×3 奇偶性 50% 死局）：
     从完成态做 K 次随机合法滑动（禁立即回退防平凡抵消；终态=完成态重摇；
     终态=「完成态上块 m 与空格互换」（opt=1 模式）重摇——K 下限保证非平凡）。
     构造即证明可解：三角不等式 ⇒ 盘面到完成态最优步 opt ≤ K 恒成立（verify 侧
     BFS/IDA* 独立求解器对账）。q.path = 构造滑入序的块 id 反序 = 一条 K 步复原
     路（玩家解序参照，verify 重放对账）。
   引擎返回：'slide' 滑入未复原（题内推进）/ 'goal' 滑入且本题复原（本关继续）
     / 'done' 通关 / 'wig' 点非相邻块（轻微晃动拒绝，非错误零惩罚，仅计次不惩罚）
     / null 非法下标或关卡已结束 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 盘型参数（W 列 × H 行；K=构造滑动步数带） */
const CH_PARAMS = {
  1: { W: 2, H: 2, kLo: 3,  kHi: 6 },
  2: { W: 3, H: 2, kLo: 6,  kHi: 12 },
  3: { W: 3, H: 3, kLo: 8, kHi: 12 }        /* 试玩P1 勘误：3×3 降难 12-20→8-12（5-6 岁空间工作记忆上限） */
};
/* 空格相邻位（上下左右） */
function neighborsOf(p, W, H) {
  const x = p % W, y = Math.floor(p / W), out = [];
  if (x > 0) out.push(p - 1);
  if (x < W - 1) out.push(p + 1);
  if (y > 0) out.push(p - W);
  if (y < H - 1) out.push(p + W);
  return out;
}
const isHome = (posOf, blank, n) => blank === n - 1 && posOf.every((p, id) => p === id);

/* ---------- 单题生成：K 次随机合法滑动构造（禁立即回退 + 终态防完成态/opt=1） */
function genOne(P, rnd) {
  const W = P.W, H = P.H, n = W * H;
  const K = ri(rnd, P.kLo, P.kHi);
  for (let attempt = 0; attempt < 40; attempt++) {
    const occ = Array.from({ length: n }, (_, p) => p < n - 1 ? p : -1);  // occ[pos]=块 id（-1=空格）
    let blank = n - 1, prev = -1;
    const path = [];                                                      // 构造序：每步滑入空格的块 id
    for (let k = 0; k < K; k++) {
      const cands = neighborsOf(blank, W, H).filter(p => p !== prev);     // 禁立即回退
      const pick = cands[Math.floor(rnd() * cands.length)];
      path.push(occ[pick]);
      occ[blank] = occ[pick]; occ[pick] = -1;
      prev = blank; blank = pick;
    }
    /* 终态=完成态（opt=0）重摇 */
    if (occ.every((id, p) => p === n - 1 ? id === -1 : id === p)) continue;
    /* 终态=完成态上块 m 与空格互换（opt=1 模式）重摇：blank===m 且 occ[n-1]===m 且其余归位 */
    const m1 = occ[n - 1];
    if (m1 >= 0 && blank === m1 &&
        occ.every((id, p) => p === n - 1 || p === m1 || id === p)) continue;
    const posOf = Array.from({ length: n - 1 }, (_, id) => occ.indexOf(id));
    path.reverse();                                       /* 存玩家复原解序（构造序反序）：
                                                             path[0]=初态第一步应滑入空格的块 id */
    return { W: W, H: H, K: K, posOf: posOf, blank: blank, path: path,
             moves: 0, wigs: 0, _answered: false };
  }
  return null;                                                            // 理论不可达（防御）
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关（flat≥STATIC_LEVELS）：随机章参数 dch∈1-4（先取数保确定性） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);
  /* 盘型计划：dch1-2 全同盘型；dch3 静态章全 3×3；生成关 dch3/dch4 每题轮换且去 3×3
     （试玩P1 勘误：3×3 超纲——shuffled [1,2,1,2,2] → 5 题 2×2/2×3 两种，rnd 消耗序列不变保确定性） */
  const isGen = flat >= STATIC_LEVELS;
  const plan = (dch === 4 || (dch === 3 && isGen)) ? shuffled([1, 2, 1, 2, 2], rnd) : [dch, dch, dch, dch, dch];
  const quizzes = plan.map(pi => genOne(CH_PARAMS[pi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv, plan: plan,
           quizzes: quizzes, step: 0, moveTot: 0, kTot: quizzes.reduce((s, q) => s + q.K, 0),
           done: false };
}

/* ---------- 滑块引擎（无 DOM）：engTap(L, i) —— 点块 id i */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  const n = q.W * q.H;
  if (!Number.isInteger(i) || i < 0 || i >= n - 1) return null;
  const pos = q.posOf[i], b = q.blank;
  const adj = Math.abs(pos % q.W - b % q.W) + Math.abs(Math.floor(pos / q.W) - Math.floor(b / q.W)) === 1;
  if (!adj) { q.wigs++; return 'wig'; }                   /* 非相邻：'wig' 拒绝（零惩罚仅计数） */
  q.posOf[i] = b; q.blank = pos;                          /* 滑入空格 */
  q.moves++; L.moveTot++;
  if (isHome(q.posOf, q.blank, n)) {                      /* 全块归位：本题复原（自动判定无提交） */
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'goal';
  }
  return 'slide';
}
const engWon = L => !!L && L.done;
/* 星级：试滑块数口径（SPEC §2：≤K+2=3★/≤2K=2★/>2K=1★，K=本关各题构造步数和
   kTot；wig 非错误不入口径——滑块款几乎无惩罚路径仅计数）。永不 0 星 */
const engStars = L => L.moveTot <= L.kTot + 2 ? 3 : (L.moveTot <= L.kTot * 2 ? 2 : 1);

/* ---------- IDA* 求解器（曼哈顿启发，独立于构造路径）：
   返回 { opt: 最优步数, first: 第一步应滑块 id } 或 null。
   用途①救援答案级（30s 无进展：下一步应滑块 breathe——单步提示非全解）
   用途②verify 对账（与 BFS 距离表交叉验证）。禁回退剪枝不影响最优性；
   bound 每次 +2（曼哈顿奇偶与步长奇偶一致） */
function solveStep(q) {
  const W = q.W, H = q.H, n = W * H;
  const pos = q.posOf.slice();                            // id -> pos（工作副本）
  const occ = Array.from({ length: n }, () => -1);        // pos -> id
  for (let id = 0; id < n - 1; id++) occ[pos[id]] = id;
  const manh = () => {
    let s = 0;
    for (let id = 0; id < n - 1; id++) {
      const p = pos[id];
      s += Math.abs(p % W - id % W) + Math.abs(Math.floor(p / W) - Math.floor(id / W));
    }
    return s;
  };
  let bound = manh(), steps = 0;
  let stack = [];
  const dfs = (b, g, prev) => {
    const hh = manh();
    if (hh === 0) { steps = g; return true; }
    if (g + hh > bound) return false;
    const cand = neighborsOf(b, W, H);
    for (let ci = 0; ci < cand.length; ci++) {
      const p = cand[ci];
      if (p === prev) continue;                           /* 禁回退剪枝 */
      const id = occ[p];
      occ[b] = id; occ[p] = -1; pos[id] = b;
      stack.push(id);
      if (dfs(p, g + 1, b)) return true;
      stack.pop();
      occ[p] = id; occ[b] = -1; pos[id] = p;
    }
    return false;
  };
  for (let it = 0; it < 48; it++) {
    stack = [];
    if (dfs(q.blank, 0, -1)) return { opt: steps, first: stack[0] };
    bound += 2;
  }
  return null;
}

/* ---------- 构造路径重放（verify 对账用）：玩家按 path 序滑入 → 应回完成态
   （q.path = 构造滑入序反序 = K 步复原路，构造即证明可解的运行时证据） */
function replayHome(q) {
  const W = q.W, n = q.W * q.H;
  const posOf = q.posOf.slice(), path = q.path.slice();
  let blank = q.blank;
  const pos0 = q.posOf.slice(), b0 = q.blank;             /* 快照（重放可还原） */
  let ok = true;
  for (let k = 0; k < path.length; k++) {
    const id = path[k], p = posOf[id];
    if (neighborsOf(blank, W, q.H).indexOf(p) < 0) { ok = false; break; }
    posOf[id] = blank; blank = p;
  }
  if (!isHome(posOf, blank, n)) ok = false;
  q.posOf = pos0; q.blank = b0;                           /* 还原现场 */
  return ok;
}

/* ---------- 结构校验（verify 用）：盘型合法、K 落带、posOf 互异且与 blank
   互补、初始非完成态、非 opt=1 模式、path 长=K、初态自洽。返回失败原因 */
function structWhy(q) {
  if (!q) return 'null';
  const P = Object.values(CH_PARAMS).find(p => p.W === q.W && p.H === q.H);
  if (!P) return 'board';
  const n = q.W * q.H;
  if (!Number.isInteger(q.K) || q.K < P.kLo || q.K > P.kHi) return 'Kband';
  if (!Array.isArray(q.posOf) || q.posOf.length !== n - 1) return 'posOfLen';
  const seen = {};
  for (let id = 0; id < n - 1; id++) {
    const p = q.posOf[id];
    if (!Number.isInteger(p) || p < 0 || p >= n) return 'posRange';
    if (p === q.blank) return 'posBlank';
    if (seen[p]) return 'posDup';
    seen[p] = 1;
  }
  if (!Number.isInteger(q.blank) || q.blank < 0 || q.blank >= n) return 'blankRange';
  if (isHome(q.posOf, q.blank, n)) return 'home';         /* 初始即完成态 */
  const occPos = {}; q.posOf.forEach((p, id) => { occPos[p] = id; });   /* pos -> id */
  for (let m = 0; m < n - 1; m++) {                       /* opt=1 模式：blank===m 且其余归位 */
    if (q.blank === m && occPos[n - 1] === m &&
        q.posOf.every((p, id) => id === m ? p === n - 1 : p === id)) return 'opt1';
  }
  if (!Array.isArray(q.path) || q.path.length !== q.K) return 'pathLen';
  if (q.moves !== 0 || q.wigs !== 0) return 'counters';
  if (q._answered) return 'answered';
  return null;
}
