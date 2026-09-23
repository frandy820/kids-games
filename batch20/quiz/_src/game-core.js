/* ================= quiz 纯引擎：确定性关卡抽题 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat+同 serve 永远同关（重玩一致、verify 可检）。
   §0.45 题库真值（升档版）：题库=编译期封闭数据（QZ_BANK 160 题）与判定分离
   ——answer 存运行时索引，判定=索引比较；每题恰一正确项（bank.ans 唯一指向）
   +3 干扰；干扰项文本≠正确项（opts 互异，生成期不变式）；静态关四域各归一章
   （dch=1-4），flat≥20 生成关四域混抽（dch=0）；同关 5 题签名互异（题面+选项集）。
   verify 侧独立提取题库（正则+JSON.parse）分源对账。
   错题隔日复现（升档新增）：genLevel(flat, serve)——serve=题 id 数组（≤3），
   日起始关由 UI 层从 sv.quiz.wrongBank 取出注入关首（复现题不受章域限制）。
   数据模型：q.opts[](卡{v,img}×4)为 bank 选项的确定性洗牌，q.answer=正确项的
   运行时索引；q.domain='bio'|'weather'|'measure'|'reason'（钩子契约域字段）；
   q.miss 错次；q.solved 已解。点卡即判（单选制）：engTapOpt 产判定计划，
   engCommitJudge 落账（UI 与 verify 共用语义）。 */
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
/* 进度章号单调递增；难度类别：静态关 (ch-1)%4+1 循环（四类各一章），
   生成关 dch=0=四类混抽（§0.3/§3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* 题库类别索引（编译期一次构建） */
const BANK_BY_CAT = { 1: [], 2: [], 3: [], 4: [] };
QZ_BANK.forEach(function (b, i) { BANK_BY_CAT[b.cat].push(i); });
const ALL_BANK_IDX = QZ_BANK.map(function (_, i) { return i; });

/* ---------- 单题组装：bank 4 选项确定性洗牌 → 运行时 answer 索引
   （answer=索引比较判定，与题库数据分离 §0.45 升档：1 正确+3 干扰） ---------- */
function buildQuiz(bi, rnd) {
  const b = QZ_BANK[bi];
  const order = shuffled([0, 1, 2, 3], rnd);
  return { kind: 'quiz', qid: bi, cat: b.cat, domain: DOMAINS[b.cat], text: b.q,
    opts: order.map(function (k) { return { v: b.opts[k], img: b.ic[k] }; }),
    answer: order.indexOf(b.ans), miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；同关 5 题签名互异）
   sig=题面+选项集（体验维度：孩子看到的题目与答案卡；同类静态关从本类题池
   洗牌取 5 天然互异，防御性再查）。
   serve=错题隔日复现注入（升档新增）：日起始关把 wrongBank 里 ≤3 个题 id
   放在关首（优先出题）；serve 与 flat 同为种子输入——同 flat+同 serve 恒同关
   （确定性不破）。serve 题不受 dch 章域限制（复习跨章）。 ---------- */
const sigOf = q => [q.text, q.opts.map(function (o) { return o.v; }).slice().sort().join(',')].join('|');
function genLevel(flat, serve) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : 0;          // 0=生成关（四域混抽）
  const pool = dch ? BANK_BY_CAT[dch] : ALL_BANK_IDX;
  const quizzes = [], sigs = {};
  const serveOk = (serve || []).filter(function (id) {
    return typeof id === 'number' && Math.floor(id) === id && id >= 0 && id < QZ_BANK.length;
  }).slice(0, 3);
  let served = 0; const servedIds = {};
  for (let k = 0; k < serveOk.length; k++) {                    // 复现题优先置前（上限 3/关，同 id 去重）
    if (servedIds[serveOk[k]]) continue;
    const q = buildQuiz(serveOk[k], rnd);
    const sig = sigOf(q);
    servedIds[serveOk[k]] = 1;
    if (!sigs[sig]) { sigs[sig] = 1; quizzes.push(q); served++; }
  }
  const picks = shuffled(pool, rnd).slice(0, CH_LEN);           // 洗牌补足（无重复）
  for (let k = 0; k < picks.length && quizzes.length < CH_LEN; k++) {
    const q = buildQuiz(picks[k], rnd);
    const sig = sigOf(q);
    if (sigs[sig]) continue;                                    // 与 serve 题重复防御
    sigs[sig] = 1;
    quizzes.push(q);
  }
  while (quizzes.length < CH_LEN) {                             // 不可达防御：各类题池 ≥32>5
    quizzes.push(buildQuiz(BANK_BY_CAT[dch || 1][quizzes.length % BANK_BY_CAT[dch || 1].length], rnd));
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, served: served, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选判定引擎（无 DOM）：engTapOpt(L,i)=点选项卡 i 的判定计划
   i===answer → {win:true}；否则 {win:false}（零惩罚可重选，单选制无对位概念）；
   非法（越界/已解/关已结束）→ null ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.opts.length) return null;
  return { win: i === q.answer };
}
/* engCommitJudge(L,plan)：提交判定。win → solved+推进，返回 'right'/'done'；
   不等 → miss/retries 各 +1 返回 'wrong'（错次口径 §3：答错=1 错，零惩罚可重选） */
function engCommitJudge(L, plan) {
  const q = L.quizzes[L.step];
  if (plan.win) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 救援/教学"帮"目标（§3：方向级=题面类别关键词 pulse 恒给；
   答案级=正确卡 breathe，miss≥2 才出）
   rescueTarget=答案级：正确卡 idx（UI 与 verify 共用）；
   dirTarget=方向级：题面类别小标签（{act:'cat'}，恒可得） ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  return { act: 'opt', i: q.answer };
}
function dirTarget(q) {
  if (!q || q.solved) return null;
  return { act: 'cat' };
}

/* ---------- 结构校验（verify 用）：运行时题与封闭题库的一致性
   （题库规模/分布/ans 唯一性由 verify 侧独立提取对账 §0.45） ---------- */
function structOk(q) {
  if (!q || q.kind !== 'quiz') return false;
  if (typeof q.qid !== 'number' || q.qid < 0 || q.qid >= QZ_BANK.length) return false;
  const b = QZ_BANK[q.qid];
  if (q.cat !== b.cat) return false;
  if (q.domain !== DOMAINS[b.cat]) return false;                 // 升档：domain 域字段
  if (q.text !== b.q) return false;
  if (!Array.isArray(q.opts) || q.opts.length !== 4) return false;
  if (q.opts.some(function (o) { return typeof o.v !== 'string' || !o.v || !QZ_ICONS[o.img]; })) return false;
  const vs = q.opts.map(function (o) { return o.v; });
  if (new Set(vs).size !== vs.length) return false;              // 文本互异（干扰≠正确）
  if (new Set(vs.concat(b.opts)).size !== 4) return false;       // 运行时选项集=bank 选项集
  if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 3) return false;
  if (q.opts[q.answer].v !== b.opts[b.ans]) return false;        // 正确项指向 bank 正确文本
  return true;
}
