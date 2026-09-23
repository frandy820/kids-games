/* ================= money 纯引擎：确定性关卡生成 + 凑钱/买两件/键盘找零判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   内部金额单位=半元（0.5 元）整数：币 {0.5,1,5,10}元 = {1,2,10,20}，零浮点歧义
   章难度（SPEC-BATCH13 §1 r15）：
   dch1 凑零钱含角（币 0.5/1/5 元；价池 角{2.5,3.5,5.5,6.5,7.5}+整{3,4,6,7,8}，qi0/2/4 角价——起步含五角）
   dch2 买两件合计（qi0 热身=dch1 角价型；qi1/2 拆型无 10 元币 T∈15 档；qi3/4 含 10 元币 T∈10 档；
        两件各 2.5-9.5 元，合计=凑钱目标——先算 A+B 再凑）
   dch3 找零整元键盘（付 10/20 元，价 3-18，差 2-17 整元；数字键盘输入）
   dch4 找零带角键盘（付 10/20，价 X.5 X∈2-8；付 10→差 1.5-7.5、付 20→差 11.5-17.5；
        答案=元数字+5 角键；qi0 热身=dch3 型）
   凑钱可凑性=引擎级保证：coins 含 price 的基础分解+干扰币（生成即证明可达，verify 再 DP 复核）
   最少解币数上限（儿童工作记忆先验，verify 独立复算）：dch1 ≤4 / dch2 ≤5（拆型与含 10 型逐一验算）
   miss 语义（SPEC §1"零惩罚可调整"）：放币/移币/按键=构造探索不计 miss；
   tapOK/tapConfirm 提交错（或空输入确认）才 miss++/retries++
   键盘域：元位数 ≤2（第 3 位拒收）；角位仅 0/5 两态（5 角键 toggle，仅 dch4 在场） */
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

/* ---------- 价位选择（同关优先不重复、相邻不同；池尽回退） ---------- */
function pickPrice(rnd, pool, used, avoid) {
  let p = pool.filter(v => used.indexOf(v) < 0 && v !== avoid);
  if (!p.length) p = pool.filter(v => v !== avoid);
  if (!p.length) p = pool;                            // 理论不可达（各池 ≥5 种）
  return pick(rnd, p);
}
/* ---------- 币盘收尾：干扰币（0-2 枚 0.5/1/5 元）+洗牌+最少 3 枚（防一步题） ---------- */
function finishGather(price, coins, rnd) {
  const extra = ri(rnd, 0, 2);
  for (let i = 0; i < extra; i++) coins.push(pick(rnd, [1, 2, 10]));
  capCoins(coins, 7, 40);                             // 基础币在前，只砍尾部干扰
  while (coins.length < 3) coins.push(pick(rnd, [1, 2, 10]));
  return { kind: 'gather', price: price,
    coins: shuffled(coins, rnd).map(v => v),
    _taken: [], _tray: [], miss: 0, solved: false, warm: false };
}
function capCoins(coins, maxN, maxSum) {              // 防御上限：只 pop 尾部干扰币
  while (coins.length > maxN || sumBy(coins) > maxSum) {
    if (coins.length <= 1) break;
    coins.pop();
  }
}

/* ---------- dch1 凑零钱含角（半元价池；角价 5/7/11/13/15，整价 6/8/12/14/16）
   基础分解：≥5 元给 5 元币，余 1 元币，角给 5 角币——最少解 ≤4（SPEC 先验验算） ---------- */
const G1_HALF_POOL = [5, 7, 11, 13, 15];              // 2.5/3.5/5.5/6.5/7.5 元
const G1_INT_POOL = [6, 8, 12, 14, 16];               // 3/4/6/7/8 元
function baseCoins(p) {                               // 半元基础分解（5 元→10/1 元→2/5 角→1）
  const coins = [];
  if (p >= 10) coins.push(10);
  let r = p - (p >= 10 ? 10 : 0);
  while (r >= 2) { coins.push(2); r -= 2; }
  if (r === 1) coins.push(1);
  return coins;
}
function genGatherHalf(rnd, used, avoid, wantHalf) {  // dch1（兼 dch2 首题热身）
  const pool = wantHalf ? G1_HALF_POOL : G1_INT_POOL;
  const price = pickPrice(rnd, pool, used, avoid);
  return finishGather(price, baseCoins(price), rnd);
}

/* ---------- dch2 买两件合计：两价相加 → 合计为凑钱目标（多币组合）
   拆型（无 10 元币）T 池 15 档 / 含 10 型 T 池 10 档（半元；最少解 ≤5 逐一验算，排除 9.5/13.5/14/14.5/17.5 等超档值） ---------- */
const PAIR_SPLIT_POOL = [16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 33, 34];  // 8-17 元（缺 14 档）
const PAIR_TEN_POOL = [24, 25, 26, 27, 28, 30, 31, 32, 33, 34];                        // 12-17 元（缺 14.5 档）
function splitTwo(rnd, T) {                           // 合计 T → 两件各 2.5-9.5 元（半元 5-19）
  const lo = Math.max(5, T - 19), hi = Math.min(19, T - 5);
  const a = ri(rnd, lo, hi);
  return [a, T - a];
}
function finishPair(T, coins, rnd) {
  const q = finishGather(T, coins, rnd);
  q.kind = 'pair';
  const ab = splitTwo(rnd, T);
  q.priceA = ab[0]; q.priceB = ab[1];
  return q;
}
function genPairSplit(rnd, used, avoid) {             // dch2 拆型：无 10 元币（需拆解）
  const T = pickPrice(rnd, PAIR_SPLIT_POOL, used, avoid);
  const coins = [];
  const k = Math.min(Math.floor(T / 10), 3);          // ≤3 枚 5 元
  for (let i = 0; i < k; i++) coins.push(10);
  let r = T - k * 10;
  while (r >= 2) { coins.push(2); r -= 2; }
  if (r === 1) coins.push(1);
  if (ri(rnd, 0, 1)) coins.push(pick(rnd, [1, 2, 10]));   // 0-1 干扰（不加 10 元保持"拆"语义）
  return finishPair(T, coins, rnd);
}
function genPairTen(rnd, used, avoid) {               // dch2 含 10 型：用 10 元币
  const T = pickPrice(rnd, PAIR_TEN_POOL, used, avoid);
  const coins = [20];
  let r = T - 20;
  if (r >= 10) { coins.push(10); r -= 10; }
  while (r >= 2) { coins.push(2); r -= 2; }
  if (r === 1) coins.push(1);
  if (ri(rnd, 0, 1)) coins.push(pick(rnd, [1, 2, 10]));
  return finishPair(T, coins, rnd);
}

/* ---------- 找零生成（c3 整元键盘 / c4 带角键盘；无选项卡——答案域即键盘输入域） ---------- */
function finishChange(pay, price, rnd) {              // 半元 → 键盘初态（digits='' jiao=false）
  const q = { kind: price % 2 === 1 ? 'jiao' : 'change', pay: pay, price: price,
    ans: pay - price, digits: '', jiao: false, miss: 0, solved: false, warm: false };
  return q;
}
function genChangeWhole(rnd, used, avoid) {           // dch3（兼 dch4 首题热身）
  const pay = rnd() < .5 ? 20 : 40;                   // 付 10/20 元
  const pool = pay === 20 ? [6, 8, 10, 12, 14, 16]                        // 价 3-8 元
    : Array.from({ length: 16 }, (_, i) => 6 + i * 2);                    // 价 3-18 元
  const price = pickPrice(rnd, pool, used, avoid);
  return finishChange(pay, price, rnd);
}
function genChangeJiao(rnd, used, avoid) {            // dch4：价 X.5（X∈2-8），差=付-X-0.5
  const pay = rnd() < .5 ? 20 : 40;                   // 付 10→差 1.5-7.5 / 付 20→差 11.5-17.5
  const pool = [5, 7, 9, 11, 13, 15, 17];             // X.5 价（半元奇数）
  const price = pickPrice(rnd, pool, used, avoid);
  return finishChange(pay, price, rnd);
}

/* ---------- 单题生成（rnd 同流确定性；同关相邻价不同，优先未用价） ---------- */
function genOne(dch, qi, rnd, used, avoid) {
  let q;
  if (dch === 1) q = genGatherHalf(rnd, used, avoid, qi % 2 === 0);     // qi0/2/4 角价=起步含五角
  else if (dch === 2) q = qi === 0 ? genGatherHalf(rnd, used, avoid, true)   // 首题热身=dch1 角价型
    : (qi <= 2 ? genPairSplit(rnd, used, avoid) : genPairTen(rnd, used, avoid));
  else if (dch === 3) q = genChangeWhole(rnd, used, avoid);
  else q = qi === 0 ? genChangeWhole(rnd, used, avoid) : genChangeJiao(rnd, used, avoid);   // 首题热身=dch3 型
  q.warm = qi === 0 && (dch === 2 || dch === 4);
  if (q.kind === 'gather' || q.kind === 'pair') {                     // 商品轮换（确定性）
    q.goods = qi % GOODS.length;
    if (q.kind === 'pair') q.goodsB = (q.goods + 3) % GOODS.length;   // 两件不同商品
  }
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const quizzes = [];
  const used = [];
  let avoid = -1;                                     // 上一题半元价（同关 kind 恒定，避相邻重复）
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, used, avoid);
    used.push(q.price);
    avoid = q.price;
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 凑钱引擎（无 DOM）：篮内合计（gather+pair 共用） ---------- */
const sumOf = q => q._tray.reduce((s, i) => s + q.coins[i], 0);
const isGatherKind = q => q.kind === 'gather' || q.kind === 'pair';

/* engTapCoin(L, i)：gather/pair 期点第 i 枚币入篮 → 返回新合计（半元）；
   已入篮/非法下标/键盘期/关已结束 → null */
function engTapCoin(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!isGatherKind(q)) return null;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.coins.length) return null;
  if (q._taken[i]) return null;
  q._taken[i] = 1;
  q._tray.push(i);
  return sumOf(q);
}
/* engTapTray(L, j)：点篮内第 j 枚币移除 → 返回新合计；非法下标/键盘期 → null */
function engTapTray(L, j) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!isGatherKind(q)) return null;
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q._tray.length) return null;
  q._taken[q._tray[j]] = 0;
  q._tray.splice(j, 1);
  return sumOf(q);
}
/* engOK(L)：gather/pair 期"给钱啦"提交——合计=价 → 'right'/'done'（推进）；
   ≠价 → 'wrong'（miss/retries 计一次，零惩罚可调整）；键盘期 → 'again' 防御层；
   放币/移除/按键不进此路径（探索不计 miss） */
function engOK(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!isGatherKind(q)) return 'again';
  if (sumOf(q) === q.price) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}

/* ---------- 键盘引擎（dch3/4 找零）：engKey 构造（探索零惩罚）/ engConfirm 判定 ----------
   k ∈ '0'-'9'（元位数字，≤2 位，首位 0 替换）| 'del'（退格元位）| 'clr'（清空+角位）
   | 'jiao'（5 角键 toggle，仅 jiao 型；change 型返回 null 拒收）
   返回 {digits, jiao, capped}（capped=超位数拒收，状态不变）；键盘期以外 'again'/null */
function engKey(L, k) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (isGatherKind(q)) return 'again';                 // gather/pair 期按键=防御层
  if (k === 'del') {
    if (q.digits.length) q.digits = q.digits.slice(0, -1);
    return { digits: q.digits, jiao: q.jiao, capped: false };
  }
  if (k === 'clr') {
    q.digits = ''; q.jiao = false;
    return { digits: q.digits, jiao: q.jiao, capped: false };
  }
  if (k === 'jiao') {
    if (q.kind !== 'jiao') return null;               // 5 角键仅带角章在场
    q.jiao = !q.jiao;
    return { digits: q.digits, jiao: q.jiao, capped: false };
  }
  if (typeof k === 'string' && k.length === 1 && k >= '0' && k <= '9') {
    if (q.digits.length >= 2) return { digits: q.digits, jiao: q.jiao, capped: true };   // 位数上限 2：拒收
    q.digits = q.digits === '0' ? k : q.digits + k;   // 首位 0 替换（计算器惯例）
    return { digits: q.digits, jiao: q.jiao, capped: false };
  }
  return null;                                        // 非法键名
}
/* engConfirm(L)：确认判定（唯一 miss 计数点）——元数字×2+（角?1:0）=答案（半元）→ 'right'/'done';
   错/空输入 → 'wrong'（miss/retries 计一次；空输入确认与空篮提交同口径）；gather 期 → 'again' 防御层 */
function engConfirm(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (isGatherKind(q)) return 'again';
  const val = q.digits === '' ? -1 : Number(q.digits) * 2 + (q.jiao ? 1 : 0);   // 半元；空输入恒错
  if (val === q.ans) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（SPEC §1，永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 可行性 DP：avail（半元数组）能否子集和凑出 target（每币一次） ---------- */
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

/* ---------- 救援目标（§0.21）：
   gather/pair：合计=价 → {act:'ok'}；可加币 → {act:'add', i}；否则 → {act:'remove', j}（恒有解）
   change/jiao 键盘：清→位→角→确认 阶梯——非前缀输入 → {act:'clr'}；元位未齐 →
   {act:'key', k=下一位正确数字}；元位齐角错 → {act:'chip'}；全对 → {act:'ok'} ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  if (isGatherKind(q)) {
    const sum = sumOf(q);
    if (sum === q.price) return { act: 'ok' };
    const availIdx = [];
    for (let i = 0; i < q.coins.length; i++) if (!q._taken[i]) availIdx.push(i);
    if (sum < q.price) {
      for (const i of availIdx) {
        const rest = availIdx.filter(k => k !== i).map(k => q.coins[k]);
        if (canReach(rest, q.price - sum - q.coins[i])) return { act: 'add', i: i };
      }
    }
    for (let j = q._tray.length - 1; j >= 0; j--) {     // 后放的先引导移除（直觉）
      const ci = q._tray[j];
      const rest = availIdx.concat([ci]).map(k => q.coins[k]);
      if (canReach(rest, q.price - (sum - q.coins[ci]))) return { act: 'remove', j: j };
    }
    return null;                                        // 理论不可达（生成即证明完整解在场）
  }
  const ansY = String(Math.floor(q.ans / 2));
  const needJiao = q.ans % 2 === 1;
  if (q.digits !== '' && q.digits !== ansY.slice(0, q.digits.length)) return { act: 'clr' };
  if (q.digits.length < ansY.length) return { act: 'key', k: ansY[q.digits.length] };
  if (needJiao !== q.jiao) return { act: 'chip' };
  return { act: 'ok' };
}

/* ---------- 结构校验（verify 用；数值域断言在 verify refRangeOk 独立推导） ---------- */
function structOk(q) {
  if (!q) return false;
  if (isGatherKind(q)) {
    if (!Array.isArray(q.coins) || q.coins.length < 3 || q.coins.length > 7) return false;
    if (q.coins.some(v => [1, 2, 10, 20].indexOf(v) < 0)) return false;      // 币面值 ∈{0.5,1,5,10}元
    if (sumBy(q.coins) < q.price) return false;                              // 可凑性前提：总额≥价
    if (q.kind === 'pair') {
      if (q.priceA + q.priceB !== q.price) return false;                     // 两件合计=目标
      if (q.priceA < 5 || q.priceA > 19 || q.priceB < 5 || q.priceB > 19) return false;  // 各 2.5-9.5 元
    }
    return canReach(q.coins, q.price);                                       // 引擎级：子集和可达
  }
  if (q.kind !== 'change' && q.kind !== 'jiao') return false;
  if (q.pay !== 20 && q.pay !== 40) return false;                            // 付 10/20 元
  if (q.ans !== q.pay - q.price || q.ans <= 0) return false;                 // 差=付-价 恒正
  if (q.kind === 'change' && (q.price % 2 !== 0 || q.ans % 2 !== 0)) return false;   // 整元章全偶
  if (q.kind === 'jiao' && (q.price % 2 === 0 || q.ans % 2 === 0)) return false;     // 带角章全奇
  if (String(Math.floor(q.ans / 2)).length > 2) return false;                // 键盘位数域 ≤2
  return typeof q.digits === 'string' && typeof q.jiao === 'boolean';
}
