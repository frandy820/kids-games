/* ================= sortsize 纯引擎：确定性关卡生成 + 三题型点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章型（SPEC-BATCH11 §-r19；进度章号单调递增 + 难度章号 (ch-1)%4+1 循环；生成关随机章参数 pdch）：
     ch1 6-7 物相近档全排序（方向恒 big）/ ch2 +方向混合 / ch3 双属性（3 档×红蓝，先大小再颜色）
     / ch4 序数题（第 N 大/N 小，rank∈[2,n-2]）+混排回顾
   每关 5 题；sort/ord 题每关种互异（全库 8 种洗牌取用）；dual 题恒双色皮球（每档恰一红一蓝）
   热身律：每章 qi0 给已学形态/明显档（ch2 方向首现放 qi1；ch4 第 N 小首现放 qi3）
   方向混合保证：混合章（2/3）除热身外随机方向，且每关 ≥1 small（全 big 则末题强制 small）
   展示乱序：sort/ord 严格非单调（升/降都不许）；dual 弱非单调（含平局的升/降都不许）
   点选坐标：items[i]=展示位 i 的 font-size 基准；left=剩余展示位；第 pos 步应点=
     sort：order='big' → left 中 items 最大者 / 'small' → 最小者（互异保证唯一）
     dual：先比尺寸（order 方向），同尺寸比颜色（q.first 色在前）——(尺寸,颜色) 对互异 → 唯一
     ord：全 items 按方向排序后第 q.rank 名（rank∈[2,n-2]，互异保证唯一；单点即完题）
   引擎返回：'step' 排对一步（题未完）/ 'goal' 排对且本题完成 / 'done' 通关
     / 'wrong' 点错（卡晃动不灰化可重点，每点计一次错）
     / 'again' 已排入排序条的卡或已答完的题（防御层零惩罚）
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

/* ---------- 比较器（answerIdx 真值源）：a 是否应排在 b 前（target order 语义）
   sort：尺寸互异 → 方向直接比；dual：先尺寸（方向），同尺寸 → first 色在前（SPEC 唯一解先验） */
function engPrecedes(q, a, b) {
  const va = q.items[a], vb = q.items[b];
  if (va !== vb) return q.order === 'big' ? va > vb : va < vb;
  if (q.kind !== 'dual') return false;
  return q.colors[a] === q.first;            /* 同尺寸：a 是首色 → a 前（b 必为另一色，构造保证） */
}

/* ---------- 当前应点位（answerIdx 真值源）：left 中 target order 最前物
   sort：items 两两互异 → argmax/argmin 唯一；dual：(尺寸,颜色) 对互异 → 全序唯一 */
function engAnswerIdx(q) {
  if (q.kind === 'ord') {
    const idx = q.items.map((v, i) => [v, i])
      .sort((x, y) => q.order === 'big' ? y[0] - x[0] : x[0] - y[0]);
    return idx[q.rank - 1][1];               /* 第 rank 名（1 基；互异 → 唯一） */
  }
  let best = -1;
  for (let k = 0; k < q.left.length; k++) {
    const i = q.left[k];
    if (best < 0 || engPrecedes(q, i, best)) best = i;
  }
  return best;
}

/* ---------- 展示乱序：sort/ord 严格非单调（升/降都重洗）；dual 弱非单调（含平局序列也重洗） */
function genItems(n, tier, rnd) {
  const lad = SIZE_LADDER[tier].slice();
  const mono = a => a.every((v, i) => i === 0 || a[i - 1] < v) ||
                     a.every((v, i) => i === 0 || a[i - 1] > v);
  let s = shuffled(lad, rnd), guard = 0;
  while (mono(s) && guard++ < 24) s = shuffled(lad, rnd);
  return s;
}
/* dual 展示：(尺寸,颜色) 对洗牌；弱单调（非降/非升整列）重洗——不许"整排已排好" */
function genDualDisp(tier, rnd) {
  const pairs = [];
  SIZE_LADDER[tier].forEach(s => { pairs.push([s, 'r']); pairs.push([s, 'b']); });
  const weakMono = a => a.every((p, i) => i === 0 || a[i - 1][0] <= p[0]) ||
                         a.every((p, i) => i === 0 || a[i - 1][0] >= p[0]);
  let d = shuffled(pairs, rnd), guard = 0;
  while (weakMono(d) && guard++ < 24) d = shuffled(pairs, rnd);
  return d;
}

/* ---------- 方向序列（每关 5 题）：热身/首现槽固定（计划 ord 字段），混合章其余随机
   ch1 恒 big（方向隔离）；混合章保证每关 ≥1 small（全 big 则末槽强制） */
function planLevelOrders(pdch, rnd) {
  const plan = QUIZ_PLAN[pdch];
  const orders = plan.map(P => P.ord || 'big');
  if (MIXED_CH[pdch]) {
    plan.forEach((P, qi) => {
      if (qi > 0 && !P.ord && P.kind !== 'ord') orders[qi] = rnd() < 0.5 ? 'big' : 'small';
    });
    if (orders.indexOf('small') < 0) orders[orders.length - 1] = 'small';
  }
  return orders;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关（flat≥STATIC_LEVELS）：随机章参数 pdch ∈1-4（章型规则按 pdch 生效）
   rnd 调用序固定：pdch → KIND_IDS 洗牌 → 方向随机 → 逐题（乱序洗牌/first/rank）→ 确定性 */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const pdch = flat >= STATIC_LEVELS ? ri(rnd, 1, 4) : dch;   // 生成关=随机章参数
  const plan = QUIZ_PLAN[pdch];
  const kindsPool = shuffled(KIND_IDS, rnd);
  const orders = planLevelOrders(pdch, rnd);
  const quizzes = plan.map((P, qi) => {
    const q = { kind: P.kind, qi: qi, tier: P.tier, order: orders[qi] };
    if (P.kind === 'dual') {
      const disp = genDualDisp(P.tier, rnd);
      q.kindId = DUAL_KIND;
      q.first = P.first || (rnd() < 0.5 ? 'r' : 'b');
      q.items = disp.map(p => p[0]);
      q.colors = disp.map(p => p[1]);
    } else {
      q.kindId = kindsPool[qi];
      q.items = genItems(P.n, P.tier, rnd);
      if (P.kind === 'ord') q.rank = P.rank ||
        (P.ord === 'small' ? ri(rnd, 2, 3) : ri(rnd, 2, P.n - 2));   /* 序数域：big∈[2,n-2] / small 首现收窄 [2,3] */
    }
    q.left = q.items.map((_, i) => i);
    q.pos = 0; q.miss = 0; q._answered = false;
    q.answerIdx = engAnswerIdx(q);                             // 初始应点位（ord 恒定，sort/dual 动态重算）
    return q;
  });
  return { flat: flat, ch: ch, dch: dch, pdch: pdch, lv: lv,
    quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点展示位 i 的 emoji 卡 */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  const n = q.items.length;
  if (!Number.isInteger(i) || i < 0 || i >= n) return null;
  if (q._answered) return 'again';
  if (q.kind !== 'ord' && q.left.indexOf(i) < 0) return 'again';  // 已排入排序条（UI .gone 拦截，兜底零惩罚）
  if (i === q.answerIdx) {
    if (q.kind === 'ord') {                                     // 序数题：单点即完题
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'goal';
    }
    q.left = q.left.filter(x => x !== i);
    q.pos++;
    if (q.pos >= n) {                                          // 本题全部排对
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'goal';
    }
    q.answerIdx = engAnswerIdx(q);                             // 逐点后动态重算下一步应点位
    return 'step';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点（retries=0）=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：kind/档位/题计划匹配、阶梯逐值、两两互异（dual=对互异）、
   级差落带、展示非单调（dual=弱非单调）、序数域、left/pos/answerIdx/miss 初始自洽。
   返回具体失败原因便于审计 */
function structWhy(q, pdch) {
  if (!q || !KINDS[q.kindId] && q.kindId !== DUAL_KIND) return 'kind';
  const plan = QUIZ_PLAN[pdch], P = plan[q.qi];
  if (!P || P.kind !== q.kind || P.tier !== q.tier) return 'plan';
  if (q.kind === 'dual' && (q.kindId !== DUAL_KIND || (P.first != null && P.first !== q.first))) return 'plan';
  if (q.order !== 'big' && q.order !== 'small') return 'order';
  const ref = SIZE_LADDER[P.tier];
  const n = q.kind === 'dual' ? ref.length * 2 : ref.length;
  if (!Array.isArray(q.items) || q.items.length !== n) return 'itemsLen';
  if (q.kind === 'dual') {
    if (q.first !== 'r' && q.first !== 'b') return 'first';
    const cnt = {};
    for (let i = 0; i < n; i++) {                              // 每档恰 2 物（一红一蓝）
      const c = cnt[q.items[i]] || (cnt[q.items[i]] = {});
      if (ref.indexOf(q.items[i]) < 0) return 'ladder';
      c[q.colors[i]] = (c[q.colors[i]] || 0) + 1;
    }
    for (let i = 0; i < ref.length; i++) {
      const c = cnt[ref[i]];
      if (!c || c.r !== 1 || c.b !== 1) return 'pair';         // (尺寸,颜色) 对互异 → 双键全序唯一
    }
    const weak = a => a.every((v, i) => i === 0 || q.items[i - 1] <= v) ||
                      a.every((v, i) => i === 0 || q.items[i - 1] >= v);
    if (weak(q.items)) return 'mono';                          // 展示弱非单调（不许整排已排好）
  } else {
    if (q.kindId === DUAL_KIND) return 'kind';
    for (let i = 0; i < n; i++) {                              // 同题取整档阶梯（基准逐值）
      if (q.items.indexOf(ref[i]) < 0) return 'ladder';
    }
    for (let i = 0; i < n; i++)                                // 两两互异（比值 ≠1）
      for (let j = i + 1; j < n; j++) if (q.items[i] === q.items[j]) return 'dup';
    if (q.kind === 'ord') {
      if (!Number.isInteger(q.rank) || q.rank < 2 || q.rank > n - 2) return 'rank';   // 序数域 [2,n-2]
      if (P.rank != null && q.rank !== P.rank) return 'plan';  // 热身槽 rank 钉死
    }
    const asc = q.items.slice().sort((a, b) => a - b);
    const band = tierBand(P.tier);
    for (let i = 1; i < n; i++) {                              // 级差落带（明显 ≥1.40 / 相近 1.1-1.26）
      const r = asc[i] / asc[i - 1];
      if (r < band[0] || r > band[1]) return 'ratio';
    }
    if (asc.every((v, i) => q.items[i] === v) ||
        asc.every((v, i) => q.items[q.items.length - 1 - i] === v)) return 'mono';   // 乱序必非单调
  }
  if (!Array.isArray(q.left) || q.left.length !== n) return 'left';
  for (let i = 0; i < n; i++) if (q.left[i] !== i) return 'leftInit';
  if (q.pos !== 0) return 'pos';
  if (q.miss !== 0) return 'miss';
  if (q.answerIdx !== engAnswerIdx(q)) return 'answerIdx';
  return null;
}
