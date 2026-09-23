/* ================= wordprob 纯引擎：确定性两步应用题生成 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   r13 章难度（SPEC-BATCH13 §2 r13；进度章号单调递增、难度章号 (ch-1)%4+1 循环；生成关随机章参数）：
     dch1 两步加减：bus2(as a+b-c)/cookie2(sa a-b+c) 轮换；首题热身=bus1 单步 100 以内进位加（桥接）
     dch2 乘加乘减：plate2(ma a×b+c)/row2(ms a×b-c) 轮换（表内乘法域）；首题热身=ch1 已学型
     dch3 多余条件：busex/cookieex 轮换（sad=a-b+c+d 多余数；d=座位/年龄）；首题热身=ch2 已学型
     dch4 综合：rowex(mad=a×b-c+d)/candy2(sd (a-c)/b 整除) 轮换；首题热身=ch3 已学型
   数值域（dom 闭区间+form 约束）：操作数全部 ≤35（wor_n_1..35）；as: c≤a+b-8 / sa 系: b≤a-8 /
     ms 系: c≤a×b-4 / sd: a=b×商+c（商 5-8 整除域）；中间量 ≤45，答案 ≤69，全部 100 以内。
   干扰三元组（r13 定案"算得对但答非所问"）：
     d1 = 两步中间量（as/sa 系=a±b 首步值 / ma 系=a×b / sd=a-c）——算了第一步没算第二步；
     d2 = 次可算量（extra 型=多余数字 d 本身——把无关数当答案；two 型=符号错值等优先序）；
     d3 = 近误值（答案 ±2 优先，回退 ±1/±3）。
     全部 >0、≠答案、互异（§0.17）；verify 侧独立复算 d1/d2 确为题面可算量真值（禁随机近误充当）。
   模板轮换：相邻题模板互异（每章 ≥2 模板，防连发）。 */
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

/* ---------- 两步结构（form → 答案/中间量；槽位=dom 语序，sd 槽序 [a,c,b]） ---------- */
const ANS_OF = {
  add: n => n[0] + n[1],
  as:  n => n[0] + n[1] - n[2],
  sa:  n => n[0] - n[1] + n[2],
  ma:  n => n[0] * n[1] + n[2],
  ms:  n => n[0] * n[1] - n[2],
  sd:  n => (n[0] - n[1]) / n[2],
  sad: n => n[0] - n[1] + n[2],
  mad: n => n[0] * n[1] - n[2]
};
const MID_OF = {
  add: null,
  as:  n => n[0] + n[1],
  sa:  n => n[0] - n[1],
  ma:  n => n[0] * n[1],
  ms:  n => n[0] * n[1],
  sd:  n => n[0] - n[1],
  sad: n => n[0] - n[1],
  mad: n => n[0] * n[1]
};

/* ---------- 单题数值生成（dom+form 约束；rnd 同流保证确定性）
   sd 特型：b(人数 n2)∈[2,3]、商 q∈[5,8]、c(送出 n1)∈[5,9]，a=b×q+c 落 dom[0] ---------- */
function genNums(t, rnd) {
  if (t.form === 'sd') {
    const b = ri(rnd, t.dom[2][0], t.dom[2][1]);
    const q = ri(rnd, 5, 8);
    const c = ri(rnd, t.dom[1][0], t.dom[1][1]);
    return [b * q + c, c, b];                       // 槽序 [a,c,b]，a=b×q+c 整除域
  }
  let n = t.dom.map(d => ri(rnd, d[0], d[1]));
  if (t.form === 'add' && n[0] === n[1])           /* 镜像差 |a-b| 作 d1 须 ≥1（禁 0 干扰） */
    n[1] = n[1] < t.dom[1][1] ? n[1] + 1 : n[1] - 1;
  if (t.form === 'as') n[2] = Math.min(n[2], n[0] + n[1] - 8);      // 答案 ≥8
  if (t.form === 'sa' || t.form === 'sad') n[1] = Math.min(n[1], n[0] - 8);   // 中间量 ≥8
  if (t.form === 'ms' || t.form === 'mad') n[2] = Math.min(n[2], n[0] * n[1] - 4);  // 答案 ≥4
  return n;
}

/* ---------- 可算量优先序（d2 用；extra 型多余数 d 排最前——"把无关数当答案"最强干扰） ---------- */
function d2Pool(q) {
  const n = q.nums, a = n[0], b = n[1], c = n[2], d = n[3];
  switch (q.form) {
    case 'as':  return [a + b + c, a - b, b - c, a - c, a, b, c];
    case 'sa':  return [a - b - c, a + b, a + b + c, a, b, c];
    case 'sad': return [d, a - b - c, a + b, a + b + c, a, b, c];
    case 'ma':  return [a * b - c, a + b + c, a + b, a, b, c];
    case 'ms':  return [a * b + c, a + b, a, b, c];
    case 'mad': return [d, a * b + c, a + b, a, b, c];
    case 'sd':  return [b, a, c, a - b, a + b];
    default:    return [Math.abs(a - b), a, b];     // add：镜像差优先
  }
}

/* ---------- 干扰三元组构造（确定性：优先序取首个合法值，d 撞值域内移位）
   d1=中间量（add 无中间量=镜像差）/ d2=次可算量（extra=多余数 d）/ d3=近误 ±2→±1→±3 ---------- */
function distractorsOf(q) {
  const mid = MID_OF[q.form] ? MID_OF[q.form](q.nums) : null;
  let d1 = mid != null ? mid : Math.abs(q.nums[0] - q.nums[1]);   // add：|a-b| 镜像
  if (d1 <= 0 || d1 === q.answer) d1 = q.answer + 2;              // 防御（正常域不触发）
  /* extra 型 d2 优先=多余数 d；d 与答案/中间量撞值时域内移位（确定性） */
  let pool = d2Pool(q);
  if (q.form === 'sad' || q.form === 'mad') {
    const t = TPLS[q.tpl], dlo = t.dom[3][0], dhi = t.dom[3][1];
    let dv = q.nums[3];
    if (dv === q.answer || dv === d1) {
      dv = dv + 1 <= dhi ? dv + 1 : dv - 1;
      q.nums[3] = dv;                              // 撞值移位同步进题面（读题与干扰一致）
    }
    pool = [q.nums[3]].concat(pool.slice(1));
  }
  let d2 = 0;
  for (let i = 0; i < pool.length; i++) {
    const v = pool[i];
    if (v > 0 && v !== q.answer && v !== d1) { d2 = v; break; }
  }
  let d3 = 0;
  const cands = [q.answer + 2, q.answer - 2, q.answer + 1, q.answer - 1, q.answer + 3, q.answer - 3];
  for (let i = 0; i < cands.length; i++) {
    const v = cands[i];
    if (v > 0 && v !== q.answer && v !== d1 && v !== d2) { d3 = v; break; }
  }
  return [d1, d2, d3];
}

/* ---------- 单题组装：4 选 1 = 答案 + 干扰三元组洗牌（答案位置轮转，禁恒首位） ---------- */
function withItems(q, rnd) {
  const ds = distractorsOf(q);
  q.options = shuffled([q.answer, ds[0], ds[1], ds[2]], rnd);
  q.answerIdx = q.options.indexOf(q.answer);
  return q;
}

/* ---------- 单题生成（rnd 同流保证确定性；prevTpl=上一题模板 id，相邻互异）
   warm=首题热身：dch1=bus1 单步桥接（kind one）；dch2/3/4=上一章主型模板池（kind 不变） ---------- */
function genOne(dch, qi, rnd, prevTpl) {
  const warm = qi === 0;
  const poolIds = warm ? WARM_POOL[dch] : CH_POOLS[dch];
  const pool = poolIds.filter(t => t !== prevTpl);   // 模板轮换：不与上一题同模板
  const tpl = pool[Math.floor(rnd() * pool.length)];
  const t = TPLS[tpl];
  const q = { kind: t.kind, form: t.form, tpl: tpl, nums: genNums(t, rnd), warm: warm };
  q.answer = ANS_OF[q.form](q.nums);
  return withItems(q, rnd);
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const quizzes = [];
  let prevTpl = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, prevTpl);
    prevTpl = q.tpl;
    q.miss = 0;                                    // 不灰化款：错点计数（同卡可重复点）
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：i = 答案卡下标
   'right' 答对推进 / 'done' 最后一题答对通关 / 'wrong' 点错（晃动不灰化可重点，计 miss）
   null 非法下标或关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return null;
  if (i === q.answerIdx) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;                                     // 不灰化款：同卡可重复点，每次计错（零惩罚）
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（永不 0 星 §0.14） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：answerIdx 指向 answer 且唯一、4 选项互异禁 0、干扰规则合规 ---------- */
function structOk(q) {
  if (!q || !q.options || q.options.length !== 4) return false;
  if (q.answerIdx < 0 || q.answerIdx >= q.options.length) return false;
  if (q.options[q.answerIdx] !== q.answer) return false;
  if (ANS_OF[q.form](q.nums) !== q.answer) return false;   // 运算自洽（form 逐式复算）
  for (let i = 0; i < q.options.length; i++) {
    if (q.options[i] <= 0) return false;           // 禁 0 负
    for (let j = i + 1; j < q.options.length; j++) if (q.options[i] === q.options[j]) return false;
  }
  const ds = q.options.filter((v, i) => i !== q.answerIdx);
  const want = distractorsOf(q);
  return ds.every(v => want.indexOf(v) >= 0);      // 干扰恰=三元组（引擎侧规则；verify 另立独立复算）
}
