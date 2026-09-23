/* ================= cashier 纯引擎：确定性关卡生成 + 找零托盘判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   内部金额单位=半元（0.5 元）整数：带角全整数运算零浮点歧义（承 money）
   章难度（SPEC-BATCH15 §1）：
   dch1 付 10 元，价 3-9 元（20% 概率 X.5，X≤8 保找零 ≥1 元），找零 1-7 元
   dch2 付 20 元，价 6-19 元整数，找零 1-14 元
   dch3 付 20 元，价 6-19 整 + 5.5-19.5 半（40% 半），找零 0.5-14.5 元（带角找零=5 角币唯一渠道）
   dch4 付 50 元，价 15-49 元整数，找零 1-35 元
   币盘固定供给（§0.28）：真实人民币面值 {5,2,1} 元 + {5} 角，每面值 5 枚（共 20 枚）
   内部半元编码（0.5 元=1）只在引擎层使用；DOM data-v / CS 钩子 / greedySeq 输出=面值（元）
   供给恒足：5×5+5×2+5×1+5×0.5 = 40.5 元 ≥ 找零上限 35 元；角值 0.5 只能由 5 角币凑（奇偶唯一渠道）
   miss 语义（§1 星级口径）：放币/移币=构造探索不计 miss；提交空盘='empty' 不计次；
   提交总额≠找零 → miss++/retries++（wrong-more 超额 / wrong-less 差额） */
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

const Y = e => Math.round(e * 2);                     // 元 → 半元
const sumBy = (arr, f) => arr.reduce((s, v) => s + (f ? f(v) : v), 0);

/* ---------- 币盘（固定 20 枚：5元×5 + 2元×5 + 1元×5 + 5角×5，降序=贪心序） ---------- */
const DENOM_YUAN_LIST = [5, 2, 1, 0.5];               // §0.28 币制（元）：真实人民币面值
const DENOMS = DENOM_YUAN_LIST.map(Y);                // 引擎内部半元编码：10/4/2/1（外部表面一律用元）
const DENOM_STOCK = 5;                                // 每面值数量上限（§0.28）
const DENOM_YUAN = { 10: 5, 4: 2, 2: 1, 1: 0.5 };     // 半元 → 元
function trayCoins() {
  const a = [];
  DENOMS.forEach(v => { for (let k = 0; k < DENOM_STOCK; k++) a.push(v); });
  return a;
}
const cntOf = (tray, v) => tray.reduce((s, x) => s + (x === v ? 1 : 0), 0);

/* ---------- 价池选取（used=已用价优先全不重复；avoid=相邻价必互异 §1） ---------- */
function pickPrice(rnd, pool, used, avoid) {
  let p = pool.filter(v => used.indexOf(v) < 0 && v !== avoid);
  if (!p.length) p = pool.filter(v => v !== avoid);
  if (!p.length) p = pool;                            // 理论不可达（各池 ≥7 种）
  return pick(rnd, p);
}
const iRange = (lo, hi) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

/* ---------- 单题生成：pay>price 恒成立（找零>0）由池域保证 ---------- */
function genQuiz(dch, qi, rnd, used, avoid) {
  let pool;
  if (dch === 1) {                                    // 价 3-9 元，20% X.5（≤8.5 → 找零 ≥1）
    pool = rnd() < 0.2 ? iRange(3, 8).map(x => Y(x + 0.5)) : iRange(3, 9).map(Y);
  } else if (dch === 2) {                             // 价 6-19 元整数
    pool = iRange(6, 19).map(Y);
  } else if (dch === 3) {                             // 价 6-19 整 + 5.5-19.5 半（40% 半）
    pool = rnd() < 0.4 ? iRange(5, 19).map(x => Y(x + 0.5)) : iRange(6, 19).map(Y);
  } else {                                            // 价 15-49 元整数
    pool = iRange(15, 49).map(Y);
  }
  const price = pickPrice(rnd, pool, used, avoid);
  const pay = dch === 1 ? Y(10) : (dch === 4 ? Y(50) : Y(20));
  return { kind: 'cashier', price: price, pay: pay, change: pay - price,
    goods: qi % GOODS.length, customer: qi % CUSTOMERS.length,
    _tray: [], miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const quizzes = [];
  const used = [];
  let avoid = -1;                                     // 上一题半元价（相邻互异）
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genQuiz(dch, qi, rnd, used, avoid);
    used.push(q.price);
    avoid = q.price;
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 找零托盘引擎（无 DOM）：托盘总额 ---------- */
const traySum = q => q._tray.reduce((s, v) => s + v, 0);

/* engTapCoin(L, v)：点一枚 v 面值（半元）币入托盘 → 返回新总额；
   非法面值/该面值已用满 5 枚/关已结束 → null（放币=探索，不计 miss 不重置救援钟 §0.7a） */
function engTapCoin(L, v) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (DENOMS.indexOf(v) < 0) return null;
  if (cntOf(q._tray, v) >= DENOM_STOCK) return null;
  q._tray.push(v);
  return traySum(q);
}
/* engTapTray(L, j)：点托盘内第 j 枚币移回 → 返回新总额；非法下标 → null */
function engTapTray(L, j) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q._tray.length) return null;
  q._tray.splice(j, 1);
  return traySum(q);
}
/* engSubmit(L)：'找零'提交——
   空托盘 → 'empty'（不计次不 miss，§1 空提交口径）
   总额=找零 → 'right'/'done'（推进，唯一重置救援钟的主路径 §0.7a）
   超额 → 'wrong-more' / 差额 → 'wrong-less'（miss/retries 计一次，零惩罚可调整） */
function engSubmit(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q._tray.length) return 'empty';
  const s = traySum(q);
  if (s === q.change) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;
  return s > q.change ? 'wrong-more' : 'wrong-less';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（空提交不计次，SPEC §1，永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 可行性 DP：multiset（半元数组）能否子集和凑出 target（每币一次） ---------- */
function canReach(avail, target) {
  if (target < 0) return false;
  if (target === 0) return true;
  const dp = new Array(target + 1).fill(false);
  dp[0] = true;
  for (const v of avail) {
    for (let t = target; t >= v; t--) if (dp[t - v]) dp[t] = true;
  }
  return !!dp[target];
}

/* ---------- 贪心最小组合（教学/救援/autoSolve 共用）：5→2→1→0.5 逐枚
   面值制 {5,2,1,.5}×5 对 ≤40 元任意半元值恒成（§0.28 供给恒足）
   target=半元（引擎内部）；返回面值序列（元：5/2/1/0.5，供 UI/钩子直接使用）或 null */
function greedySeq(target) {
  const seq = [];
  let r = target;
  for (const v of DENOMS) {
    let n = 0;
    while (r >= v && n < DENOM_STOCK) { seq.push(DENOM_YUAN[v]); r -= v; n++; }
  }
  return r === 0 ? seq : null;
}

/* ---------- 救援/教学"帮"目标（§1）：总额=找零 → {act:'ok'} 指提交键；
   可加币 → {act:'add', v}（加入后仍可完成）；应移除 → {act:'remove', j}（后放先移，直觉）。
   v=半元（引擎边界，engTapCoin 直用；UI 取币须先 DENOM_YUAN[v] 转元）。
   恒有解（币盘供给恒足，完整贪心解在场）。 ---------- */
function availMultiset(q) {                           // 未入盘的币展开
  const a = [];
  DENOMS.forEach(v => {
    const n = DENOM_STOCK - cntOf(q._tray, v);
    for (let k = 0; k < n; k++) a.push(v);
  });
  return a;
}
function rescueTarget(q) {
  if (!q || q.solved) return null;
  const sum = traySum(q);
  if (sum === q.change) return { act: 'ok' };
  if (sum < q.change) {
    for (const v of DENOMS) {                         // 大面值优先（贪心直觉）
      if (v > q.change - sum) continue;
      const av = availMultiset(q);
      const vi = av.indexOf(v);
      if (vi < 0) continue;
      av.splice(vi, 1);
      if (canReach(av, q.change - sum - v)) return { act: 'add', v: v };
    }
  }
  for (let j = q._tray.length - 1; j >= 0; j--) {     // 后放的先引导移除
    const c = q._tray[j];
    const av = availMultiset(q); av.push(c);
    if (canReach(av, q.change - (sum - c))) return { act: 'remove', j: j };
  }
  return null;                                        // 理论不可达（供给恒足）
}

/* ---------- 结构校验（verify 用）：找零=差额恒正 + 托盘面值/上限合法 + 供给恒足 ---------- */
function structOk(q) {
  if (!q || q.kind !== 'cashier') return false;
  if (q.change !== q.pay - q.price || q.change <= 0) return false;
  if (!Array.isArray(q._tray) || q._tray.some(v => DENOMS.indexOf(v) < 0)) return false;
  if (DENOMS.some(v => cntOf(q._tray, v) > DENOM_STOCK)) return false;   // 每面值 ≤5
  return canReach(trayCoins(), q.change);                                // 币盘供给恒足（§0.28）
}
