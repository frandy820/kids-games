/* ================= maketen 纯引擎：确定性关卡生成 + 点卡判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 523)（本款常量 523，SPEC-BATCH35 §0.86 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC §0.86；进度章号单调递增、难度章号 dch=1+flat//5 静态四档）：
     dch1 凑 10（a∈2-8 偶偏，池 4）/ dch2 凑 10（a∈1-9 全域，池 5）
     dch3 凑 15（a∈6-9，池 4）/ dch4 混合（每题 target∈{10,15,20} seeded，池 5）
     生成关（flat≥20）dch=ri(rnd,1,4) seeded 随机（域全档成立型——b33 硬性②）
   数学先验（SPEC §0.86 封闭域验算）：补数封闭——凑 10 a∈1-9 x=10-a（对集
   (1,9)(2,8)(3,7)(4,6)(5,5)）；凑 15 a∈6-9 x=15-a∈6-9；凑 20 a∈11-18
   x=20-a∈2-9；卡池互异+含补数⇒唯一解（补数由 a 唯一确定，池互异禁双同值）。
   干扰池构造：池=补数+干扰，干扰取补数±1/±2 邻近值优先（距离序取数，同距组内
   seeded 洗牌），域凑 10 时 1-9 / 凑 15·20 时扩展 2-18，互异，禁取 a 本身
   （自己配自己=0 概念混淆）——不足额沿距离序外扩（同域内）直至凑满。
   answer=池中唯一满足 a+v=target 的下标（derive 独立函数——verify 从
   a+pool 复算=对账锚，禁读 quiz.answer 直比）。
   ch4 三目标在场：关内 5 题 seeded 取 target∈{10,15,20} 后做在场补齐
   （缺 target 换入重复槽——5 槽 3 值必有重复槽可换，SPEC「三目标切换」
   认知坡度主体）。
   quiz 结构：{ kind('ten' 恒), target(10|15|20), a, pool[{v}] 互异恒全摆,
               answer(池中补数下标), _miss, _answered }
   铁律：每关 5 题。 */
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

/* ---------- 章型真值表（SPEC §0.86）：池张数 / a 域（dch1 特例 a∈2-8） ---------- */
const POOL_N = { 1: 4, 2: 5, 3: 4, 4: 5 };                          // 池张数
const Q_TARGET = { 1: 10, 2: 10, 3: 15 };                           // ch1-3 固定目标
const A_RANGE = { 10: [1, 9], 15: [6, 9], 20: [11, 18] };           // a 域（按 target）
const D_DOMAIN = { 10: [1, 9], 15: [2, 18], 20: [2, 18] };          // 干扰域（凑 10 收 1-9）

/* ---------- answer 独立推导（对账锚）：池中唯一满足 a+v=target 的下标
   （无唯一解返回 -1——verify 复算用，禁读 quiz.answer 当期望源） ---------- */
function deriveAnswer(a, target, poolVs) {
  let idx = -1, cnt = 0;
  for (let i = 0; i < poolVs.length; i++) {
    if (a + poolVs[i] === target) { idx = i; cnt++; }
  }
  return cnt === 1 ? idx : -1;
}

/* ---------- 干扰池构造：邻近优先（距离序）+域约束+互异+禁 a 本身 ---------- */
function buildPool(a, target, size, rnd) {
  const x = target - a;                              // 补数（唯一解）
  const dom = D_DOMAIN[target], lo = dom[0], hi = dom[1];
  const buckets = {};
  for (let v = lo; v <= hi; v++) {
    if (v === x || v === a) continue;                // 互异（排补数）+禁 a 本身（干扰）
    const d = Math.abs(v - x);
    (buckets[d] = buckets[d] || []).push(v);
  }
  const picks = [];
  for (let d = 1; d <= hi - lo + 1 && picks.length < size - 1; d++) {
    if (buckets[d]) picks.push.apply(picks, shuffled(buckets[d], rnd));   // 同距组内 seeded 洗牌
  }
  const vals = picks.slice(0, size - 1);             // 距离序取数（±1/±2 邻近优先）
  vals.push(x);                                      // 补数入池
  const mixed = shuffled(vals, rnd);                 // 洗牌成池（互异全摆）
  const pool = mixed.map(v => ({ v: v }));
  /* answer 必须在**洗牌后**的池序上推导（曾错在洗牌前数组上推导=恒指末位的
     假答案：引擎与钩子共享错值自洽，verify 独立复算 a+v=target 才暴露） */
  return { pool: pool, answer: deriveAnswer(a, target, mixed) };
}

/* ---------- ch4 关内 target 序：seeded 取 {10,15,20} + 三目标在场补齐
   （5 槽 3 值必有重复槽——缺 target 换入首次出现保留的重复槽） ---------- */
function targetSeqOf(rnd) {
  const T = [10, 15, 20];
  const seq = [];
  for (let i = 0; i < CH_LEN; i++) seq.push(T[Math.floor(rnd() * T.length)]);
  for (let k = 0; k < T.length; k++) {
    if (seq.indexOf(T[k]) >= 0) continue;
    let slot = -1;
    for (let i = 0; i < CH_LEN; i++) {
      if (seq.indexOf(seq[i]) !== i) { slot = i; break; }   // 重复出现的槽（首次出现保留）
    }
    if (slot >= 0) seq[slot] = T[k];
  }
  return seq;
}

/* ---------- 单题构建 ---------- */
function buildQuiz(dch, rnd, tSeq, qi) {
  let target, a;
  if (dch === 4) {                                   // 混合：每题 target seeded（关内序）
    target = tSeq[qi];
    a = ri(rnd, A_RANGE[target][0], A_RANGE[target][1]);
  } else if (dch === 1) {                            // 凑 10 起步：a∈2-8 偶偏（偶数 60%）
    target = 10;
    a = rnd() < 0.6 ? 2 * ri(rnd, 1, 4) : ri(rnd, 2, 8);
  } else {
    target = Q_TARGET[dch];
    a = ri(rnd, A_RANGE[target][0], A_RANGE[target][1]);
  }
  const bp = buildPool(a, target, POOL_N[dch], rnd);
  return { kind: 'ten', target: target, a: a, pool: bp.pool, answer: bp.answer,
           _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关
   随机章参数 dch=ri(rnd,1,4) 先取数保确定性；ch4 tSeq 关内共享=三目标在场） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 523);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const tSeq = targetSeqOf(rnd);                             // ch4 关内 target 序（三目标在场）
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(dch, rnd, tSeq, qi));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapCard(L, i) —— 点卡池第 i 张（pool 数组下标）
   'right' 点中补数且非末题（本题完成推进）/ 'done' 点中且末题=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重点（探索不罚）
   null    非法下标 / 关卡已结束 / 本题已答
   miss 计数在本引擎判定层（b34 坑①：UI 防重入 guard 在调用判定前拦，
   预判口径 i===q.answer 与本引擎判定严格同构） ---------- */
function engTapCard(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.pool.length) return null;
  if (i === q.answer) {
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
/* 星级（§0.86 miss 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标（=deriveAnswer 复算，独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : deriveAnswer(q.a, q.target, q.pool.map(c => c.v));

/* ---------- 结构校验（verify 用，返回失败原因或 null）：章型 target/池张数/a 域 /
   池互异 / 含补数唯一（answer=deriveAnswer 复算）/ 干扰域+禁 a 本身 / 初始态干净 ---------- */
function structWhy(q, dch, qi) {
  if (!q) return 'quiz';
  if (q.kind !== 'ten') return 'kind';
  if (!POOL_N[dch]) return 'dch';
  if (dch !== 4 && q.target !== Q_TARGET[dch]) return 'target';            // ch1-3 固定目标
  if (dch === 4 && [10, 15, 20].indexOf(q.target) < 0) return 'target';    // ch4 三值域
  const alo = dch === 1 ? 2 : A_RANGE[q.target][0];
  const ahi = dch === 1 ? 8 : A_RANGE[q.target][1];
  if (!Number.isInteger(q.a) || q.a < alo || q.a > ahi) return 'aRange';
  if (!Array.isArray(q.pool) || q.pool.length !== POOL_N[dch]) return 'poolLen';
  const vals = q.pool.map(c => c.v);
  for (let k = 0; k < vals.length; k++) if (!Number.isInteger(vals[k])) return 'vInt';
  if (new Set(vals).size !== vals.length) return 'vDup';                   // 池互异
  const x = q.target - q.a;
  if (vals.indexOf(x) < 0) return 'vComp';                                 // 池含补数
  if (q.answer !== deriveAnswer(q.a, q.target, vals)) return 'answer';     // answer 推导自洽（唯一解）
  const dom = D_DOMAIN[q.target];
  for (let k = 0; k < vals.length; k++) {                                  // 干扰域+禁 a 本身
    if (vals[k] === x) continue;
    if (vals[k] < dom[0] || vals[k] > dom[1]) return 'dDomain';
    if (vals[k] === q.a) return 'dIsA';
  }
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
