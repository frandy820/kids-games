/* ================= chainsum 纯引擎：确定性关卡生成 + 候选卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   链结构（SPEC-BATCH10 §1）：同关五题首尾相接——q0 以 s0 为当前数，q(i) 以 q(i-1).answer 为当前数，
   每题 cur 经 op(±)d 得 answer；全程数域 [lo,hi]（cur 与 answer 都在域内，s0 取自 PARAMS 恒在域内）
   op 多样性：逐题随机 + 禁连续 3 题同 op（长度 5 下必然 ± 各 ≥1）；ch4(alt) 高频交替=与上一题相反
   取数顺序：先定 op（多样性规则）→ 在 op 可行域内取 d（d∈[dmin,dmax] 且结果 ∈[lo,hi]；
   数域宽 ≥10 > 2*dmin，两 op 必有一个可行，多样性规则恒可满足，无重抽死循环）
   候选 3 张数字卡 = 答案 + 2 干扰（答案±(1|2|d) 中按 |1|,|2|,|d| 优先取，互异、≥1 禁 0 禁负、域内） */
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

/* ---------- op 选择：多样性规则先行，可行域兜底（不可行换向——数域宽保证另一向恒可行）
   span = 该 op 在当前数下可用的最大跨度（+ 向 hi-cur / - 向 cur-lo） */
function pickOp(P, qi, rnd, ops, c) {
  let pref;
  if (P.alt && qi >= 1) pref = ops[qi - 1] === '+' ? '-' : '+';      // ch4：高频交替偏好
  else pref = rnd() < 0.5 ? '+' : '-';                              // 逐题随机
  if (qi >= 2 && ops[qi - 1] === pref && ops[qi - 2] === pref)       // 禁连续 3 题同 op
    pref = pref === '+' ? '-' : '+';
  const span = op => op === '+' ? P.hi - c : c - P.lo;
  if (span(pref) >= P.d[0]) return pref;
  return pref === '+' ? '-' : '+';                                  // 换向（至多 2 连同向，不违 3 连禁）
}

/* ---------- 单题生成（rnd 同流保证确定性） ---------- */
function genOne(P, qi, rnd, ops, c) {
  const op = pickOp(P, qi, rnd, ops, c);
  /* 试玩 P1②：每关首题热身 d≤2（ch2 实测五题全 d≥3 对 6 岁无过渡档）；
     warmCap≥dmin 各章恒成立（ch1 d=[1,2] cap=2 / ch3 dmin=2 cap=2 / ch2、4 dmin=1 cap=2） */
  const warmCap = qi === 0 ? Math.max(P.d[0], Math.min(2, P.d[1])) : P.d[1];
  const maxD = Math.min(warmCap, op === '+' ? P.hi - c : c - P.lo);  // op 可行域内取 d
  const d = ri(rnd, P.d[0], maxD);
  const answer = op === '+' ? c + d : c - d;
  /* 干扰池：答案±(1|2|d) 按 |1|→|2|→|d| 优先（d 与 1/2 重合时天然去重），过滤 ≥1 禁 0 禁负、域内、≠答案 */
  const pool = [answer + 1, answer - 1, answer + 2, answer - 2, answer + d, answer - d];
  const seen = [answer], ds = [];
  for (let k = 0; k < pool.length && ds.length < 2; k++) {
    const v = pool[k];
    if (v >= 1 && v <= P.hi && seen.indexOf(v) < 0) { seen.push(v); ds.push(v); }
  }
  const options = shuffled([answer, ds[0], ds[1]], rnd);
  return { cur: c, op: op, d: d, answer: answer, options: options,
    lo: P.lo, hi: P.hi, _miss: 0, _dim: [], _filled: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关=随机取章参数，pid 记录取的参数组） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const pid = flat < STATIC_LEVELS ? dch : ri(rnd, 1, 4);
  const P = PARAMS[pid];
  const s0 = ri(rnd, P.s0[0], P.s0[1]);
  const quizzes = [];
  const ops = [];
  let c = s0;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(P, qi, rnd, ops, c);
    ops.push(q.op);
    c = q.answer;                                // 链推进：下一题当前数 = 本题结果
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, pid: pid, s0: s0,
    quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点第 i 张候选数字卡（0-2）
   'goal' 答对（本题完成）/ 'done' 答对且最后一题（本关通关）
   'wrong' 答错（灰掉该卡零惩罚，排除法保底——灰化款 SPEC §1）
   'again' 点已灰卡（早退零惩罚不计数，防御层；真实点击被 pointer-events:none 拦，hook 兜底）
   null 非法下标或关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  if (i !== 0 && i !== 1 && i !== 2) return null;
  const q = L.quizzes[L.step];
  if (q._dim && q._dim[i]) return 'again';
  if (q.options[i] === q.answer) {
    q._filled = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'goal';
  }
  q._dim[i] = true;
  q._miss = (q._miss || 0) + 1;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点（retries=0）=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 链校验（verify 用）：q0.cur===s0 且 q(i).cur===q(i-1).answer（首尾相接成链） ---------- */
function chainWhy(L) {
  if (!L || !Array.isArray(L.quizzes) || L.quizzes.length !== CH_LEN) return 'len';
  for (let k = 0; k < L.quizzes.length; k++) {
    const want = k === 0 ? L.s0 : L.quizzes[k - 1].answer;
    if (L.quizzes[k].cur !== want) return 'chain' + k;
  }
  return null;
}

/* ---------- 结构校验（verify 用）：op/d/answer 三元自洽、cur·answer 在数域内、
   候选 3 张含答案互异、干扰项 ≥1 禁 0 禁负域内且 |v-answer|∈{1,2,d}。
   返回具体失败原因便于审计 ---------- */
function structWhy(q) {
  if (!q || (q.op !== '+' && q.op !== '-')) return 'op';
  if (!Number.isInteger(q.d) || q.d < 1 || q.d > 6) return 'dRange';
  if (q.answer !== (q.op === '+' ? q.cur + q.d : q.cur - q.d)) return 'answer';
  if (!(q.cur >= q.lo && q.cur <= q.hi)) return 'curRange';
  if (!(q.answer >= q.lo && q.answer <= q.hi)) return 'ansRange';
  if (!Array.isArray(q.options) || q.options.length !== 3) return 'optLen';
  if (q.options.indexOf(q.answer) < 0) return 'noAnswer';
  const uniq = q.options.filter((v, i, a) => a.indexOf(v) === i);
  if (uniq.length !== 3) return 'optDup';
  if (!q.options.every(v => Number.isInteger(v) && v >= 0 && v <= q.hi)) return 'optRange';
  const ds = q.options.filter(v => v !== q.answer);
  if (!ds.every(v => v >= 1)) return 'distractorZero';
  if (!ds.every(v => [1, 2, q.d].indexOf(Math.abs(v - q.answer)) >= 0)) return 'distractorDist';
  return null;
}
