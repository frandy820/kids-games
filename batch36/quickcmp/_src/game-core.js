/* ================= quickcmp 纯引擎：确定性关卡生成 + 闪现圆点比大小判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 887)（本款常量 887，SPEC-BATCH36 §0.89 定版，r46 不变）：
   同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R46 §R2/§R3 现行版；进度章号单调递增、难度章号 dch=1+flat//5 静态四档）：
     dch1 subitizing · n1,n2∈1-5 差≥1 禁相等 · 2 按钮（禁一样多）——谱零改动锚面章
     dch2 大数比例带+等数 · 掷 rnd()<0.3 等数（n∈10-20）/否则非等（10-20 差≥2 且
          0.85≤min/max<0.92）· 3 按钮
     dch3 比例窄带提速 · 恒非等 10-20 差≥2 且 0.85≤min/max<0.90（一样多=恒错干扰）· 3 按钮
     dch4 dual 双闪两段式 · base∈[10,20-d]，d∈{2,4,6}（POOL_DUAL 含镜像）· 两段判定
   quiz 结构：{ kind('cmp'|'dual'), nL(左圆点数), nR(右), d(dual 差值档∈{2,4,6}),
     _phase(dual 第一问 0|第二问 1), optsN(按钮集 2|3), flash(闪现档 ms 1200|1400),
     pL/pR(圆点坐标数组——渲染即引擎同源), _miss, _answered }
   布点先验（渲染铁律）：n≤12 网格 4×3=12 格（v1 不变——flat0-4 坐标逐字节保留）；
   n≥13 网格 5×4=20 格每格至多一圆点+格内抖动——最坏相邻格心距 x 向 20-2·2=16>2r、
   y 向 25-2·4=17>2r 恒不重叠；同题同半径 rOf：max(nL,nR)≤12?8:7.5（等大禁面积作弊）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 候选池（确定性枚举——无重抽循环；SPEC-R46 §R3 计数=pycheck 独立断言）
   subitizing 池：域 [1,5] 差≥1（v1 不变=20 有序对——锚面章取数路径不动）
   比例带池：域 [lo,hi] 差≥minDiff 且 rLo≤min/max<rHi（r46 比例收紧主承载——
   差≥2 先验排除差 1 不可辨带（儿童 ANS w≈0.15-0.25，(10,11).909/(11,12).917
   Δ/max≈8%<w 下沿），带内差 2/3 对 Δ/max=10-15% 恰挑战带——SPEC §R3 论证） ---------- */
function pairsWhere(lo, hi, minDiff, maxRatio) {
  const out = [];
  for (let a = lo; a <= hi; a++)
    for (let b = lo; b <= hi; b++) {
      if (Math.abs(a - b) < minDiff) continue;
      if (Math.min(a, b) / Math.max(a, b) > maxRatio) continue;
      out.push([a, b]);
    }
  return out;
}
/* 比例带版：rLo≤min/max<rHi（收紧=下界 0.85；上界开区间排除高 base 差 1 不可辨对） */
function pairsBand(lo, hi, minDiff, rLo, rHi) {
  const out = [];
  for (let a = lo; a <= hi; a++)
    for (let b = lo; b <= hi; b++) {
      if (Math.abs(a - b) < minDiff) continue;
      const r = Math.min(a, b) / Math.max(a, b);
      if (r < rLo || r >= rHi) continue;
      out.push([a, b]);
    }
  return out;
}
const POOL_SUB = pairsWhere(1, 5, 1, 1);        // 20 有序对（v1 锚面不动）
const POOL_R2  = pairsBand(10, 20, 2, 0.85, 0.92);   // 16 有序对（差2×7+差3×1 ×镜像）
const POOL_R3  = pairsBand(10, 20, 2, 0.85, 0.90);   // 14 有序对（差2×6+差3×1 ×镜像）
const POOL_EQ2 = (() => { const o = []; for (let n = 10; n <= 20; n++) o.push([n, n]); return o; })();   // ch2 等数 11 对（10-20）
/* dual 池：base∈[10,20-d]、d∈{2,4,6}，全序含镜像（无独立掷侧——侧由池序天然随机）=42 有序对 */
const POOL_DUAL = (() => {
  const o = [];
  for (const d of [2, 4, 6])
    for (let base = 10; base <= 20 - d; base++) {
      o.push([base + d, base]); o.push([base, base + d]);   // 左多+右多镜像
    }
  return o;
})();
const rOf = q => (Math.max(q.nL, q.nR) <= 12 ? 8 : 7.5);   // 同题同半径（等大铁律）

/* ---------- 圆点布点（SPEC-R46 §R3 网格分支）：n≤12 走 v1 十二格（flat0-4 坐标
   逐字节不变——rnd 流不动）；n≥13 二十格（5 列×4 行）。格心+抖动，先验见头部注释 ---------- */
function scatter(n, rnd) {
  const cells = shuffled(n <= 12 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
                                : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19], rnd).slice(0, n);
  const cols = n <= 12 ? 4 : 5, jx = n <= 12 ? 2.8 : 2, jy = n <= 12 ? 7 : 4;
  return cells.map(c => {
    const col = c % cols, row = Math.floor(c / cols);
    return [10 + (n <= 12 ? 2.5 : 0) + col * (n <= 12 ? 25 : 20) + (rnd() * 2 - 1) * jx,
            (n <= 12 ? 50 / 3 : 12.5) + row * (n <= 12 ? 100 / 3 : 25) + (rnd() * 2 - 1) * jy];
  });
}

/* ---------- 单题构建：域先验按章型先行定（互不越界——SPEC §R3 可满足性已验算）
   rnd 消耗序（pycheck 复刻真值源）：dch1/dch3/dch4 各 1 rnd；dch2 恒 2 rnd（掷+取） ---------- */
function buildQuiz(dch, rnd) {
  let pair, kind = 'cmp';
  if (dch === 1) {
    pair = POOL_SUB[ri(rnd, 0, POOL_SUB.length - 1)];       // 1 rnd（锚面路径零改动）
  } else if (dch === 2) {
    pair = rnd() < 0.3
      ? POOL_EQ2[ri(rnd, 0, POOL_EQ2.length - 1)]           // 等数题 30%（域 10-20）
      : POOL_R2[ri(rnd, 0, POOL_R2.length - 1)];            // 非等 70%（比例收紧带）
  } else if (dch === 3) {
    pair = POOL_R3[ri(rnd, 0, POOL_R3.length - 1)];         // 窄带 0.85-0.90（恒非等）
  } else {                                                  // dch4：dual 双闪两段式
    kind = 'dual';
    pair = POOL_DUAL[ri(rnd, 0, POOL_DUAL.length - 1)];     // 1 rnd（镜像在池内）
  }
  const optsN = dch === 1 ? 2 : 3;                          // ch1 两按钮禁一样多
  const q = { kind: kind, nL: pair[0], nR: pair[1], optsN: optsN, flash: flashMs(dch),
              pL: null, pR: null, _miss: 0, _answered: false };
  if (kind === 'dual') { q.d = Math.abs(pair[0] - pair[1]); q._phase = 0; }
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   圆点坐标随题生成（pL/pR 渲染即引擎同源——verify 布点对账不吃二次随机） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 887);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = buildQuiz(dch, rnd);
    q.pL = scatter(q.nL, rnd);
    q.pR = scatter(q.nR, rnd);
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTapSide(L, s)
   cmp  题型（ch1-3+教学迷你关）：s='L'|'R'|'S'
     'right' 答对且本题完成推进 / 'done' 答对且末题=通关
     'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），可重选（探索不罚）
   dual 题型（ch4）：两段式（r24/r25 half 家族范式——第一步对转相位不推 step 不计 miss）
     _phase=0（方向问）：s='L'|'R'|'S'（S=恒错干扰——dual 恒非等）；对→_phase=1 返回 'half'
     _phase=1（差值问）：s='2'|'4'|'6'（字符串）；对（s===String(q.d)）→'right'/末题'done'
   null 非法 s / ch1 点 'S' / dual 第一问点数字·第二问点侧（相位不符） / 关卡已结束 ---------- */
function engTapSide(L, s) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (q.kind === 'dual') {
    if (q._phase === 0) {
      if (s !== 'L' && s !== 'R' && s !== 'S') return null;
      if (s === correctSide(q)) { q._phase = 1; return 'half'; }   // 第一步对→转第二问（不推 step）
      q._miss++; L.retries++; return 'wrong';
    }
    if (s !== '2' && s !== '4' && s !== '6') return null;          // 第二问只认差值档
    if (s === String(q.d)) {
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    q._miss++; L.retries++; return 'wrong';
  }
  if (s !== 'L' && s !== 'R' && s !== 'S') return null;
  if (s === 'S' && q.optsN === 2) return null;         // ch1 两按钮禁一样多
  if (s === correctSide(q)) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.89 口径，r46 不变）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星
   （dual 两段各错各计——同 retries 口径） */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 正确侧（方向级救援/教学帮指用）：左多 'L' / 右多 'R' / 等数 'S'——独立函数供 verify 复核 */
const correctSide = q => !q ? null : (q.nL === q.nR ? 'S' : (q.nL > q.nR ? 'L' : 'R'));
/* dual 第二问正确档（答案级救援/帮指/verify 用）：'2'|'4'|'6'（String(q.d)） */
const engDualGap = q => !q || q.kind !== 'dual' ? null : String(q.d);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：域先验 / same 一致性 /
   按钮集 / dual 档域与初相位 / 布点对账（坐标含 r 在 viewBox 内+格距 2r 不重叠+同题同半径）/
   初始态干净 ---------- */
function structWhy(q, dch, qi) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.nL) || !Number.isInteger(q.nR)) return 'nInt';
  const same = q.nL === q.nR;
  const domSub = !same && q.nL >= 1 && q.nL <= 5 && q.nR >= 1 && q.nR <= 5 &&
                 Math.abs(q.nL - q.nR) >= 1;
  const band = q => !same && q.nL >= 10 && q.nL <= 20 && q.nR >= 10 && q.nR <= 20 &&
                    Math.abs(q.nL - q.nR) >= 2;              // 域+差≥2（比例带由 bandR 补全）
  const bandR = (q, rHi) => band(q) &&                       // 比例带 [0.85, rHi) 上下界皆断言（r46 m2：下界原缺）
                Math.min(q.nL, q.nR) / Math.max(q.nL, q.nR) >= 0.85 &&
                Math.min(q.nL, q.nR) / Math.max(q.nL, q.nR) < rHi;
  if (dch === 1) {
    if (q.kind !== 'cmp') return 'dch1Kind';
    if (!domSub) return 'dch1Dom';                     // 差≥1 禁相等（subitizing 锚面）
    if (q.optsN !== 2) return 'dch1Opts';              // 两按钮禁一样多
  } else if (dch === 2) {
    const domEq2 = same && q.nL >= 10 && q.nL <= 20;   // 等数对 n∈10-20
    if (q.kind !== 'cmp') return 'dch2Kind';
    if (!bandR(q, 0.92) && !domEq2) return 'dch2Dom';  // 比例带 [0.85,0.92) 差≥2 / 等数
    if (q.optsN !== 3) return 'dch2Opts';
  } else if (dch === 3) {
    if (q.kind !== 'cmp') return 'dch3Kind';
    if (!bandR(q, 0.90)) return 'dch3Dom';             // 窄带 [0.85,0.90) 差≥2 恒非等
    if (q.optsN !== 3) return 'dch3Opts';
  } else {
    if (q.kind !== 'dual') return 'dch4Kind';          // dual 恒定（r46 主形态）
    if (same || q.nL < 10 || q.nL > 20 || q.nR < 10 || q.nR > 20) return 'dch4Dom';
    if (q.d !== Math.abs(q.nL - q.nR) || (q.d !== 2 && q.d !== 4 && q.d !== 6)) return 'dch4Gap';
    if (q._phase !== 0) return 'dch4Phase';            // 生成态恒第一问
    if (q.optsN !== 3) return 'dch4Opts';
  }
  if (q.flash !== flashMs(dch)) return 'flash';              // 闪现档随章（1200|1400）
  /* 布点对账：点数==n、同题同半径 rOf、坐标含半径在 viewBox 内、两两距离>2r 不重叠 */
  const r = rOf(q);
  for (const key of ['pL', 'pR']) {
    const pts = q[key], n = key === 'pL' ? q.nL : q.nR;
    if (!Array.isArray(pts) || pts.length !== n) return 'ptsN' + key;
    for (const p of pts)
      if (p[0] < r - 1e-9 || p[0] > 100 - r + 1e-9 || p[1] < r - 1e-9 || p[1] > 100 - r + 1e-9) return 'ptsRange' + key;
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
        if (Math.sqrt(dx * dx + dy * dy) <= 2 * r + 1e-9) return 'ptsOverlap' + key;
      }
  }
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
