/* ================= divide 纯引擎：确定性关卡生成 + 轮流发放 + 答题判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-BATCH12 §1）：
   dch1 无余数小量（6/8/10÷2/3/4 整除 5 组合）
   dch2 无余数大量（9-12÷3/4 整除 3 组合；池小→同关"相邻 (n,m) 不同"而非全不重复）
   dch3 有余数（余 1-2、商 ≥2；首题热身=无余数，余数概念首现前给已学样本）
   dch4 除法算式直给（黑板 N÷M=？；全域混合复习；首题热身=无余数）
   全域约束：N∈6..12、M∈2..4、商 ≥2（N≥2M）、余 ∈0..2（余 3 恒不出现——11÷4 型排除）
   答案干扰项 = 商 ±1 / ±2 / 除数 M（商与除数混）互异禁 0 负（§0.17） */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 候选 (N,M) 池（按章规则离线枚举，生成时只做过滤+抽取，天然确定性）
   noRem = 无余数池；hasRem = 余数池（余 1-2 且商 ≥2） ---------- */
const POOL_NOREM_S = [[6, 2], [6, 3], [8, 2], [8, 4], [10, 2]];                  // ch1：小量整除 5 组合
const POOL_NOREM_L = [[9, 3], [12, 3], [12, 4]];                                 // ch2：大量整除 3 组合（含 12÷4=3）
const POOL_HASREM  = [[7, 2], [7, 3], [8, 3], [9, 4], [10, 3], [10, 4], [11, 2], [11, 3]]; // ch3：余 1-2
const POOL_ALL     = POOL_NOREM_S.concat(POOL_NOREM_L, POOL_HASREM);             // ch4：全域混合 13 种
function poolOf(dch, warm) {
  if (dch === 1) return POOL_NOREM_S;
  if (dch === 2) return POOL_NOREM_L;
  if (dch === 3) return warm ? POOL_NOREM_L : POOL_HASREM;   // ch3 首题热身=上一章大糖堆样本
  return warm ? POOL_NOREM_S.concat(POOL_NOREM_L) : POOL_ALL; // ch4 首题热身=已学无余数
}

/* ---------- 单题生成（rnd 同流保证确定性）
   约束链：优先"本关未用的 (n,m)"（池充足章全不重复）→ 退"与前一题不同"（ch2 池 3 种客观约束）
   → 池兜底；warm=首题热身（dch3/4 首题=无余数，SPEC §1） ---------- */
function genOne(dch, qi, rnd, used, prevKey) {
  const warm = qi === 0 && (dch === 3 || dch === 4);
  const pool = poolOf(dch, warm);
  const key = c => c[0] + '/' + c[1];
  let p = pool.filter(c => used.indexOf(key(c)) < 0 && key(c) !== prevKey);
  if (!p.length) p = pool.filter(c => key(c) !== prevKey);
  if (!p.length) p = pool;                                   // 理论不可达（各池 ≥3 种）
  const c = p[Math.floor(rnd() * p.length)];
  const n = c[0], m = c[1];
  const answer = Math.floor(n / m), rem = n % m;
  return genWithItems({ n: n, m: m, answer: answer, rem: rem, warm: warm }, rnd);
}

/* ---------- 答案干扰项：候选池 [商-1, 商+1, 商-2, 商+2, 除数 M]（近邻优先，§0.17）
   滤 0/负/等于答案/互异，取前 2 → 3 选 1 洗牌（答案位置轮转，禁恒首位） ---------- */
function candPool(q) {
  const raw = [q.answer - 1, q.answer + 1, q.answer - 2, q.answer + 2, q.m];
  const uniq = [];
  raw.forEach(v => { if (v > 0 && v !== q.answer && uniq.indexOf(v) < 0) uniq.push(v); });
  return uniq;
}
function genWithItems(q, rnd) {
  const picks = shuffled(candPool(q), rnd).slice(0, 2);
  q.items = shuffled([q.answer, picks[0], picks[1]], rnd);
  q.answerIdx = q.items.indexOf(q.answer);
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
  let prevKey = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, used, prevKey);
    used.push(q.n + '/' + q.m);
    prevKey = q.n + '/' + q.m;
    /* 发放引擎状态（每题独立；_given 各盘已放/_left 剩糖/_flown 糖是否已发） */
    q._given = [];
    for (let i = 0; i < q.m; i++) q._given.push(0);
    q._left = q.n;
    q._flown = [];
    for (let i = 0; i < q.n; i++) q._flown.push(0);
    q._phase = 'deal';                                        // 'deal' 发放期 → 'ask' 答问期
    q.miss = 0;
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 发放引擎（无 DOM）：engTapCandy(L, i) —— deal 期点第 i 颗糖
   轮流发放：飞到"当前轮到的盘子"（=已放总数 % M，天然均匀防错）
   返回本次发放序号（1..N-余数）；已发走的糖返 0；ask 期/非法下标返 null
   发放到剩糖不足一轮（left < M）→ 自动切 'ask'（余数糖留在桌上） ---------- */
function engTapCandy(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (i < 0 || i >= q.n || typeof i !== 'number' || Math.floor(i) !== i) return null;
  if (q._phase !== 'deal') return null;
  if (q._flown[i]) return 0;
  q._flown[i] = 1;
  q._left--;
  const p = q._given.reduce((s, v) => s + v, 0) % q.m;        // 当前轮到的盘子
  q._given[p]++;
  if (q._left <= q.rem) q._phase = 'ask';                     // 剩糖=余数（含 0）：发放结束
  return q._given.reduce((s, v) => s + v, 0);                 // 发放序号
}
/* 当前轮到的盘子下标（deal 期=下一颗糖的落点；ask 期=发放完毕恒 0） */
const engCurPlate = q => q._given.reduce((s, v) => s + v, 0) % q.m;

/* ---------- 答题引擎（无 DOM）：i = 答案卡下标
   'right' 答对推进 / 'done' 最后一题答对通关 / 'wrong' 点错（不灰化：可重点、每次计 miss）
   'again' 非当前阶段防御层 / null 关卡已结束 ---------- */
function engPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q._phase !== 'ask') return 'again';                     // 发放期点答案卡：防御层早退
  if (i < 0 || i >= q.items.length) return null;
  if (i === q.answerIdx) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;                                                // 不灰化款：同卡可重复点，每次计错
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（SPEC §1，永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：answerIdx 指向 answer 且唯一、3 选项互异禁 0、干扰规则合规 ---------- */
function structOk(q) {
  if (!q || !q.items || q.items.length !== 3) return false;
  if (q.answerIdx < 0 || q.answerIdx >= q.items.length) return false;
  if (q.items[q.answerIdx] !== q.answer) return false;
  for (let i = 0; i < q.items.length; i++) {
    if (q.items[i] <= 0) return false;                        // 禁 0 负
    for (let j = i + 1; j < q.items.length; j++) if (q.items[i] === q.items[j]) return false;
  }
  const ds = q.items.filter((v, i) => i !== q.answerIdx);
  return ds.every(v => v !== q.answer && candPool(q).indexOf(v) >= 0);
}
