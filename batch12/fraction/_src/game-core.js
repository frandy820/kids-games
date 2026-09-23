/* ================= fraction 纯引擎：确定性关卡生成 + 四题型点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章参数（SPEC-BATCH12 §2 + r15 难度改造；进度章号单调递增、难度章号 (ch-1)%5+1 循环；生成关随机章参数）：
     dch1 认 1/2：cut(n=2) 与 read(1/2) 交替 [A,B,A,B,A,B,A,B]（qi0=cut 保教学链）
     dch2 三四等分混 read（r15）：cut(n=3/4 按出现序交替) 与 read(1/3, 1/4 交替) [A,B]×4
     dch3 几分之几：read，答案 ∈ {2/4, 3/4, 2/3} 相邻互异；首题热身 = 1/2（已学样本）
     dch4 比大小混 read（r15）：cmp(同分子对相邻互异) 与 read(池同 ch3) [C,B]×4；首题热身 = 1/2vs1/4
     dch5 一样大（r15 新章=分数比较与等值）：首题热身 = cmp 1/2vs1/4（已学差距最大对）；
       qi 奇 = eq 等值（{1/2,2/4} 双向按出现序交替）；qi 偶≥2 = cmp 同分母对（CMP2_SET 相邻互异）
   干扰约束（§0.17 互异/相近/禁 0 负）：
     cut 干扰 = n 份不均 + (n+1) 等分 + (n+1) 份不均（r15 加非平均切 un(n+1)：份数错+不均双特征），
       四卡 (t,n) 形两两互异；不均卡角宽 max/min ≥1.5 视觉可判；
     read 干扰 = n/k、k/(n+1)、(k+1)/n 按值域过滤（禁 0/负/超 1 假分数/分母 1（n/n=1 属合法近错放行，审查 m9）），互异且 ≠ 答案；
     cmp 两块值恒不等（answerIdx = 大的那块）；
     eq 干扰 = 2 张取自 {1/3, 1/4, 2/3, 3/4}（值全 ≠ 1/2 且互异），answerIdx = 与参照等值的块。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号五章循环取材（r15：4→5 章，§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % N_CHAPTERS + 1;

/* ---------- 不等分权重（≥1.5 倍视觉可判）：固定模板 + ±0.014 微扰 + 归一 + 洗牌
   模板已验（r15 prior_check.py）：微扰最坏比 2 份 1.60 / 3 份 1.57 / 4 份 1.59 / 5 份 1.64
   （r15 新增 5 份档——cut 第 4 卡 un(n+1) 在 n=4 时需要；min 权重 0.146 > 0.05 下限有安全余量） */
const UN_TPL = { 2: [0.63, 0.37], 3: [0.46, 0.27, 0.27], 4: [0.33, 0.185, 0.25, 0.235], 5: [0.30, 0.16, 0.22, 0.16, 0.16] };
function unequalWeights(n, rnd) {
  const w = UN_TPL[n].map(v => v + (rnd() - 0.5) * 0.028);
  const s = w.reduce((a, b) => a + b, 0);
  return shuffled(w.map(v => v / s), rnd);   // 归一化按同比缩放，角宽比严格保持
}

/* ---------- 题型序列（dch → 每题 kind；r15 五章） */
const kindOf = (dch, qi) =>
  dch === 1 || dch === 2 ? (qi % 2 === 0 ? 'cut' : 'read') :
  dch === 3 ? 'read' :
  dch === 4 ? (qi % 2 === 0 ? 'cmp' : 'read') :
  (qi === 0 ? 'cmp' : (qi % 2 === 1 ? 'eq' : 'cmp'));   // dch5：qi0 热身 cmp；奇 eq；偶≥2 同分母 cmp

/* ---------- read 答案池 / cmp 对子池（大块在前；r15 ch5 同分母池 CMP2_SET）/ eq 干扰域
   eq 等值域先验：分母 ≤4 真分数等值对恰 1 对 {1/2, 2/4}（prior 验算），双向交替；干扰值全 ≠ 1/2 */
const READ_SET = [[2, 4], [3, 4], [2, 3]];
const CMP_SET = [[1, 2, 1, 3], [1, 3, 1, 4], [2, 3, 2, 4]];
const CMP2_SET = [[1, 4, 3, 4], [1, 4, 2, 4], [2, 4, 3, 4], [1, 3, 2, 3]];
const EQ_DIST = [[1, 3], [1, 4], [2, 3], [3, 4]];
const readKey = c => c[0] + '/' + c[1];
const pairKey = p => p[0] + '/' + p[1] + '|' + p[2] + '/' + p[3];

/* ---------- 从池中取一个与 lastKey 不同的项（keyFn 显式传入；确定性，8 次重掷后兜底线性找） */
function pickDiff(pool, keyFn, rnd, lastKey) {
  for (let t = 0; t < 8; t++) {
    const c = pool[Math.floor(rnd() * pool.length)];
    if (keyFn(c) !== lastKey) return c;
  }
  return pool.find(c => keyFn(c) !== lastKey) || pool[0];
}

/* ---------- 单题生成（rnd 同流保证确定性；last = 上一题对象（相邻互异用））
   返回 {kind, n, k, rk, rn, c0, rot, pk, options[], answerIdx, _dim[], _miss, _answered} */
function genOne(dch, qi, rnd, last) {
  const kind = kindOf(dch, qi);

  if (kind === 'cut') {                              /* A 切分判断（r15 4 选 1）：正确 = n 等分 */
    const n = dch === 1 ? 2 : ((qi >> 1) % 2 === 0 ? 3 : 4);   /* ch2 cut 出现序 3/4 交替（qi 0,2,4,6） */
    const opts = [
      { t: 'eq', n: n, w: uniformW(n), rot: Math.floor(rnd() * 360) },            // 正确：n 等分
      { t: 'un', n: n, w: unequalWeights(n, rnd), rot: Math.floor(rnd() * 360) }, // 干扰：n 份不均
      { t: 'eq', n: n + 1, w: uniformW(n + 1), rot: Math.floor(rnd() * 360) },    // 干扰：(n+1) 等分
      { t: 'un', n: n + 1, w: unequalWeights(n + 1, rnd), rot: Math.floor(rnd() * 360) }  // r15 干扰：(n+1) 份不均（非平均切）
    ];
    const options = shuffled(opts, rnd);
    const answerIdx = options.findIndex(o => o.t === 'eq' && o.n === n);
    return { kind: 'cut', n: n, k: null, rk: null, rn: null, c0: null, rot: null, pk: null,
             options: options, answerIdx: answerIdx,
             _dim: [0, 0, 0, 0], _miss: 0, _answered: false };
  }

  if (kind === 'read') {                             /* B 分数识别：涂色 k/n 份 */
    let k, n;
    if (dch === 1) { k = 1; n = 2; }                          /* ch1 恒 1/2 */
    else if (dch === 2) { n = (qi >> 1) % 2 === 0 ? 3 : 4; k = 1; }  /* r15 ch2 混 read：1/3、1/4 出现序交替 */
    else if (dch === 3 && qi === 0) { k = 1; n = 2; }         /* ch3 首题热身=1/2 */
    else {
      const pick = pickDiff(READ_SET, readKey, rnd, last && last.kind === 'read' ? last.k + '/' + last.n : null);
      k = pick[0]; n = pick[1];
    }
    const cand = [[n, k], [k, n + 1], [k + 1, n]];   /* SPEC 干扰序：n/k、k/(n+1)、(k+1)/n */
    const seen = [k + '/' + n];
    const opts = [{ num: k, den: n }];
    for (let ci = 0; ci < cand.length && opts.length < 3; ci++) {
      const a = cand[ci][0], b = cand[ci][1];
      if (b < 2 || a < 1 || a > b) continue;         /* 值域：禁 0/负/超 1 假分数/分母 1（n/n=1 属合法近错放行，审查 m9）（§0.17） */
      const key = a + '/' + b;
      if (seen.indexOf(key) >= 0) continue;
      seen.push(key); opts.push({ num: a, den: b });
    }
    const options = shuffled(opts, rnd);
    const answerIdx = options.findIndex(o => o.num === k && o.den === n);
    return { kind: 'read', n: n, k: k, rk: null, rn: null, c0: ri(rnd, 0, n - 1), rot: Math.floor(rnd() * 360), pk: null,
             options: options, answerIdx: answerIdx,
             _dim: [0, 0, 0], _miss: 0, _answered: false };
  }

  if (kind === 'cmp') {                              /* C 比大小：两块同尺寸披萨块（大块在前定义对子） */
    let pair;
    if (qi === 0) pair = [1, 2, 1, 4];               /* ch4/ch5 首题热身=1/2 vs 1/4（差距最大对） */
    else pair = pickDiff(dch === 4 ? CMP_SET : CMP2_SET, pairKey, rnd,
                         last && last.kind === 'cmp' ? last.pk : null);   /* r15：ch4 同分子池 / ch5 同分母池 */
    const opts = shuffled([{ k: pair[0], n: pair[1] }, { k: pair[2], n: pair[3] }], rnd);
    const bigV = Math.max(pair[0] / pair[1], pair[2] / pair[3]);
    const answerIdx = opts.findIndex(o => o.k / o.n === bigV);
    return { kind: 'cmp', n: null, k: null, rk: null, rn: null, c0: null, rot: null, pk: pairKey(pair),
             options: opts, answerIdx: answerIdx,
             _dim: [0, 0], _miss: 0, _answered: false };
  }

  /* E 等值匹配（r15 新题型，ch5）：题面参照块 rk/rn，点等值块——{1/2,2/4} 双向按 eq 出现序交替 */
  const fwd = (((qi - 1) >> 1) % 2 === 0);           /* True：参照 1/2 找 2/4；False：参照 2/4 找 1/2 */
  const rk = fwd ? 1 : 2, rn = fwd ? 2 : 4;
  const ak = fwd ? 2 : 1, an = fwd ? 4 : 2;
  const dists = shuffled(EQ_DIST, rnd).slice(0, 2);  /* 干扰 2 张（值全 ≠ 1/2 互异） */
  const opts = shuffled([{ k: ak, n: an }, { k: dists[0][0], n: dists[0][1] }, { k: dists[1][0], n: dists[1][1] }], rnd);
  const refV = rk / rn;
  const answerIdx = opts.findIndex(o => o.k / o.n === refV);
  return { kind: 'eq', n: null, k: null, rk: rk, rn: rn, c0: null, rot: null,
           pk: rk + '/' + rn + '=' + ak + '/' + an,
           options: opts, answerIdx: answerIdx,
           _dim: [0, 0, 0], _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 40 关与生成关同一确定性通道；生成关 flat≥40 每关随机章参数） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, N_CHAPTERS);   // 生成关随机章参数（先取数保确定性）
  const quizzes = [];
  let last = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, last);
    last = q;
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点第 i 张卡
   'right' 答对（本题完成推进）/ 'done' 答对且最后一题（本关通关）
   'wrong' 答错（该卡灰掉零惩罚，排除法保底——灰化款 SPEC §2）
   'again' 点已灰卡（早退零惩罚不计数，防御层；真实点击被 pointer-events:none 拦，hook 兜底）
   null 非法下标或关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return null;
  if (q._dim[i]) return 'again';
  if (i === q.answerIdx) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q._dim[i] = 1;
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点（retries=0）=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星（SPEC §0.14） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：按题型分支，返回具体失败原因便于审计
   覆盖：题型规则域 / 等分正确性（eq 角宽比≈1、un ≥1.5）/ 干扰互异 / 分数值域
   （禁 0 负/超 1 假分数/分母 1（n/n=1 属合法近错放行，审查 m9））/ answerIdx 自洽 / 初始态干净 ---------- */
function structWhy(q) {
  if (!q) return 'null';
  if (q._miss !== 0) return 'miss';
  if (!q._dim.every(v => !v)) return 'dim';
  if (q._answered) return 'answered';
  if (q.kind === 'cut') {
    if (q.n !== 2 && q.n !== 3 && q.n !== 4) return 'n';
    if (q.options.length !== 4) return 'optLen';    // r15：4 选 1（+非平均切干扰）
    const eqT = q.options.filter(o => o.t === 'eq' && o.n === q.n);
    const un = q.options.filter(o => o.t === 'un' && o.n === q.n);
    const eqO = q.options.filter(o => o.t === 'eq' && o.n === q.n + 1);
    const unO = q.options.filter(o => o.t === 'un' && o.n === q.n + 1);
    if (eqT.length !== 1 || un.length !== 1 || eqO.length !== 1 || unO.length !== 1) return 'optForm';   // 四卡 (t,n) 形两两互异
    if (q.options[q.answerIdx] !== eqT[0]) return 'answerIdx';
    for (let i = 0; i < q.options.length; i++) {                    // 等分正确性：权重和=1、角宽比
      const o = q.options[i];
      const s = o.w.reduce((a, b) => a + b, 0);
      if (Math.abs(s - 1) > 0.01) return 'wSum';
      if (o.w.length !== o.n || o.w.some(v => v <= 0.05)) return 'wMin';
      const mx = Math.max.apply(null, o.w), mn = Math.min.apply(null, o.w);
      if (o.t === 'eq' && mx / mn > 1.001) return 'eqUneven';       // 等分卡必须真等分
      if (o.t === 'un' && mx / mn < 1.5) return 'unTooEven';        // 不均卡角宽差 ≥1.5 倍视觉可判
      if ((o.rot | 0) < 0 || (o.rot | 0) > 359) return 'rot';
    }
    return null;
  }
  if (q.kind === 'read') {
    if (!(q.k >= 1 && q.k < q.n && q.n >= 2 && q.n <= 4)) return 'range';   // 值域：真分数 2-4 份
    if (q.options.length !== 3) return 'optLen';
    if (!(q.options[q.answerIdx].num === q.k && q.options[q.answerIdx].den === q.n)) return 'answerIdx';
    const keys = q.options.map(o => o.num + '/' + o.den);
    if (keys.filter((v, i, a) => a.indexOf(v) === i).length !== 3) return 'optDup';   // 干扰互异
    for (let i = 0; i < q.options.length; i++) {
      const o = q.options[i];
      if (o.num < 1 || o.den < 2 || o.num > o.den) return 'optRange';       // 禁 0/负/超 1 假分数/分母 1（n/n=1 属合法近错放行，审查 m9）
      const inPool = (o.num === q.k && o.den === q.n) || (o.num === q.n && o.den === q.k) ||
                     (o.num === q.k && o.den === q.n + 1) || (o.num === q.k + 1 && o.den === q.n);
      if (!inPool) return 'distractor';                                     // 干扰 ⊆ SPEC 三形
    }
    if (q.c0 < 0 || q.c0 >= q.n) return 'c0';
    if (q.rot < 0 || q.rot > 359) return 'rot';
    return null;
  }
  if (q.kind === 'cmp') {
    if (q.options.length !== 2) return 'optLen';
    const v = q.options.map(o => o.k / o.n);
    if (!(v[0] > 0 && v[1] > 0) || Math.abs(v[0] - v[1]) < 1e-9) return 'cmpEq';   // 两块恒不等
    if (q.answerIdx !== (v[0] > v[1] ? 0 : 1)) return 'answerIdx';                 // answerIdx = 大块
    for (let i = 0; i < q.options.length; i++) {
      const o = q.options[i];
      if (!(o.k >= 1 && o.k < o.n && o.n >= 2 && o.n <= 4)) return 'cmpRange';     // 值域
    }
    if (!q.pk) return 'pk';
    return null;
  }
  /* eq（r15） */
  if (!(q.rk === 1 && q.rn === 2) && !(q.rk === 2 && q.rn === 4)) return 'eqRef';   // 参照域={1/2,2/4}
  if (q.options.length !== 3) return 'optLen';
  const refV = q.rk / q.rn;
  if (q.options[q.answerIdx].k / q.options[q.answerIdx].n !== refV) return 'answerIdx';
  const vals = q.options.map(o => o.k / o.n);
  if (vals.filter((v, i, a) => a.indexOf(v) === i).length !== 3) return 'optDup';   // 值互异（恰一张等值）
  if (vals.filter(v => v === refV).length !== 1) return 'eqDup';
  for (let i = 0; i < q.options.length; i++) {
    const o = q.options[i];
    if (!(o.k >= 1 && o.k < o.n && o.n >= 2 && o.n <= 4)) return 'eqRange';         // 值域：真分数 2-4 份
    if (o.k / o.n === refV && i !== q.answerIdx) return 'eqDup';
    if (o.k / o.n !== refV && !EQ_DIST.some(d => d[0] === o.k && d[1] === o.n)) return 'eqDistractor';  // 干扰 ⊆ {1/3,1/4,2/3,3/4}
  }
  if (q.pk !== q.rk + '/' + q.rn + '=' + q.options[q.answerIdx].k + '/' + q.options[q.answerIdx].n) return 'pk';
  return null;
}
