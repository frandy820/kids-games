/* ================= neighbors 纯引擎：确定性关卡生成 + 门牌点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   题型（SPEC-R31-NEIGHBORS §R3 定稿——r31 难度改造，与 SPEC-BATCH8 §1 冲突处以 R31 为准）：
   plus   比 n 多 1：n∈[1,9]（dch1）/ [10,19]（dch3）/ [1,19]（dch4）；answer=n+1；空房=answer
   minus  比 n 少 1：n∈[2,10]（dch2）/ [10,19]（dch3）/ [2,20]（dch4）；answer=n-1；空房=answer
   plus2  比 n 多 2（r31 新）：n∈[10,18]（dch3）/ [1,18]（dch4）；answer=n+2（从锚跨两步）
   minus2 比 n 少 2（r31 新）：n∈[12,19]（dch3）/ [3,20]（dch4）；answer=n-2
   mid    中间空位：n=左侧亮号∈[1,18]，右侧亮号=n+2，answer=n+1（空房居中，双向判断 ±1）
   mid4   跨度内插（r31 新）：亮 n 与 n+4（n∈[1,16]，dch4），answer=n+2（4 格跨度找正中）
   dualA  两步题（r31 新，dch4）：先多一再少二：n∈[12,18]，中间态 s=n+1，answer=n-1
   dualB  两步题（r31 新，dch4）：先多二再少一：n∈[12,18]，中间态 s=n+2，answer=n+1
   街道门牌范围（STREET）：dch1/2→1-10 / dch3→[8,20]（含 20 与 9 两个跨十锚点）/ dch4→1-20
   dch3 跨十专项：每关恒含 19→20（plus,n=19）与 10→9（minus,n=10）各 ≥1 题+±2 题 1 题（落位洗牌）
   dch4 五槽：qi0-3=shuffled([plus,minus,mid,X])（X=plus2/minus2/mid4 三选一），qi4=dual 压轴（A/B 掷币）
   藏牌律（r31 支架渐撤，纯函数零 rnd）：hidden=空房两邻中不属于 refs 的全部；dch1/2 恒全亮
   候选 3 张：干扰项与答案相近、互异、非负非 0（§0.17），全部落在 1-20 门牌域内 */
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

/* ---------- 各（dch,mode）下 n 的抽样域（SPEC-R31 §R3；各 ri 恰 1 次 rnd 消耗与旧版同构） ---------- */
function drawN(dch, mode, rnd) {
  if (dch === 1) return ri(rnd, 1, 9);          // plus 1-9（零改动）
  if (dch === 2) return ri(rnd, 2, 10);         // minus 2-10（零改动）
  if (dch === 3)                                 // 大数字章：±2 域收边（answer 域 [10,20]/[10,17]）
    return mode === 'plus2' ? ri(rnd, 10, 18)
         : mode === 'minus2' ? ri(rnd, 12, 19)
         : ri(rnd, 10, 19);                      // ±1 原域（mode 由调用方定）
  return mode === 'plus' ? ri(rnd, 1, 19)
       : mode === 'minus' ? ri(rnd, 2, 20)
       : mode === 'mid' ? ri(rnd, 1, 18)         // mid：左锚点 1-18（右锚点 ≤20）
       : mode === 'plus2' ? ri(rnd, 1, 18)
       : mode === 'minus2' ? ri(rnd, 3, 20)
       : mode === 'mid4' ? ri(rnd, 1, 16)        // mid4：左锚 1-16（右锚 n+4 ≤20）
       : ri(rnd, 12, 18);                        // dualA/dualB：起点 12-18（s/answer 全落街内）
}

/* ---------- 藏牌律（r31 支架渐撤，SPEC-R31 §R1：纯函数零 rnd 消耗）
   refs=题面锚点房（语音报出的号，恒亮）；hidden=空房两邻中不属于 refs 的全部（域内者）
   dch1/2 恒 []（全亮查表=起步坡度教学期）；±1 藏远邻/±2·mid4·dual 紧邻远邻皆藏
   （refs 除外）→顺数链断裂，孩子从 ref 心算跨步；mid 两邻皆 refs=零藏例外 ---------- */
const refNums = q => q.mode === 'mid' ? [q.n, q.n + 2]
  : q.mode === 'mid4' ? [q.n, q.n + 4]
  : [q.n];
function hiddenNums(q, dch) {
  if (!q || dch < 3) return [];
  const refs = refNums(q);
  return [q.answer - 1, q.answer + 1].filter(x => x >= 1 && x <= 20 && refs.indexOf(x) < 0);
}

/* ---------- 单题生成（rnd 同流保证确定性；force=专项题；lastKey=避免与上一题同型同数）
   干扰优先序（SPEC-R31 §R3 池表）：plus→{n+2,n-1} / minus→{n-2,n+1} / mid→{n+3,n-1}
   原样；plus2→{n+3,n+1}（n+1=「只走一步」捕获器）/ minus2→{n-3,n-1} /
   mid4→{n+1,n+3}（「不在正中间」捕获器）/ dual→s 居首（「忘第二步」诊断器，池避开 n=ref 亮牌）
   全过滤进 1-20 且 ≠answer，取前 2 ---------- */
function genOne(dch, qi, rnd, force, lastKey) {
  let mode, n;
  if (force && force.n != null) {              // 跨十专项：定型定数（19→20 / 10→9）
    mode = force.mode; n = force.n;
  } else {
    mode = force ? force.mode                  // dch4 qi0-3：定型不定数（四槽洗牌）
        : dch === 1 ? 'plus'
        : dch === 2 ? 'minus'
        : dch === 3 ? (rnd() < 0.5 ? 'plus' : 'minus')
        : ['plus', 'minus', 'mid'][ri(rnd, 0, 2)];   // （dch4 随机型路径 r31 后不可达——四槽恒定型，保留兼容）
    n = drawN(dch, mode, rnd);
    for (let t = 0; t < 6 && lastKey === mode + ':' + n; t++) n = drawN(dch, mode, rnd);   // 相邻题不重样
  }
  let answer, s;
  if (mode === 'plus') answer = n + 1;
  else if (mode === 'minus') answer = n - 1;
  else if (mode === 'plus2') answer = n + 2;
  else if (mode === 'minus2') answer = n - 2;
  else if (mode === 'mid') answer = n + 1;
  else if (mode === 'mid4') answer = n + 2;
  else if (mode === 'dualA') { s = n + 1; answer = n - 1; }
  else { s = n + 2; answer = n + 1; }          // dualB
  const pool = mode === 'plus'  ? [n + 2, n - 1, n + 3, n - 2, n + 4, n + 6]
             : mode === 'minus' ? [n - 2, n + 1, n - 3, n + 2, n - 4, n + 6]
             : mode === 'plus2'  ? [n + 3, n + 1, n + 4, n - 1, n + 5, n - 2]
             : mode === 'minus2' ? [n - 3, n - 1, n - 4, n + 1, n - 5, n + 2]
             : mode === 'mid'    ? [n + 3, n - 1, n + 4, n + 5, n - 2, n + 6]
             : mode === 'mid4'   ? [n + 1, n + 3, n - 1, n + 5, n + 6, n - 2]
             : mode === 'dualA'  ? [s, n - 2, n + 2, n - 3, n + 3]
             : [s, n + 3, n - 1, n + 4, n - 2];   // dualB（answer+1=n=ref 与 answer+2=s 冲突让位）
  const seen = [answer], ds = [];
  for (let k = 0; k < pool.length && ds.length < 2; k++) {
    const v = pool[k];
    if (v >= 1 && v <= 20 && seen.indexOf(v) < 0) { seen.push(v); ds.push(v); }
  }
  const options = shuffled([answer, ds[0], ds[1]], rnd);
  const q = { mode: mode, n: n, answer: answer, options: options, _miss: 0, _dim: [], _filled: false };
  if (s !== undefined) q.s = s;
  q.hidden = hiddenNums(q, dch);
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const quizzes = [];
  let lastKey = null;
  /* dch3 专项落位：从 5 个题位洗牌取 3——19→20 / 10→9 / ±2 题（每关各 ≥1） */
  const sp = shuffled([0, 1, 2, 3, 4], rnd);
  const specials = {};
  if (dch === 3) {
    specials[sp[0]] = { mode: 'plus', n: 19 };                              // 19→20 跨十
    specials[sp[1]] = { mode: 'minus', n: 10 };                             // 10→9 退十
    specials[sp[2]] = { mode: ['plus2', 'minus2'][ri(rnd, 0, 1)] };         // r31 ±2 专项（定型不定数）
  }
  /* dch4 五槽：qi0-3=shuffled([plus,minus,mid,X])（X 三选一掷币），qi4=dual 压轴（A/B 掷币） */
  let m4 = null;
  if (dch === 4) {
    const X = ['plus2', 'minus2', 'mid4'][ri(rnd, 0, 2)];
    m4 = shuffled(['plus', 'minus', 'mid', X], rnd);
    m4.push(['dualA', 'dualB'][ri(rnd, 0, 1)]);   // m4[4]=qi4 两步题
  }
  for (let qi = 0; qi < CH_LEN; qi++) {
    let force = specials[qi] || null;
    if (!force && dch === 4) force = { mode: m4[qi] };   // 定型不定数（n 仍随机）
    const q = genOne(dch, qi, rnd, force, lastKey);
    lastKey = q.mode + ':' + q.n;
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点第 i 张候选门牌（0-2）
   'goal' 答对（本题完成）/ 'done' 答对且最后一题（本关通关）
   'wrong' 答错（灰掉该牌，零惩罚计一次错点）/ 'again' 点已灰牌（早退零惩罚不计数，防御层）
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

/* ---------- 结构校验（verify 用）：答案与 mode 一致、候选互异非负非 0、域内、
   dual 中间态自洽、hidden 与藏牌律一致（SPEC-R31 §R3）；返回具体失败原因便于审计 */
function structWhy(q, dch) {
  if (!q || ['plus', 'minus', 'plus2', 'minus2', 'mid', 'mid4', 'dualA', 'dualB'].indexOf(q.mode) < 0) return 'mode';
  if (q.mode === 'plus'  && !(q.answer === q.n + 1 && q.n >= 1 && q.n <= 19)) return 'plusRange';
  if (q.mode === 'minus' && !(q.answer === q.n - 1 && q.n >= 2 && q.n <= 20)) return 'minusRange';
  if (q.mode === 'plus2'  && !(q.answer === q.n + 2 && q.n >= 1 && q.n <= 18)) return 'plus2Range';
  if (q.mode === 'minus2' && !(q.answer === q.n - 2 && q.n >= 3 && q.n <= 20)) return 'minus2Range';
  if (q.mode === 'mid'   && !(q.answer === q.n + 1 && q.n >= 1 && q.n <= 18)) return 'midRange';
  if (q.mode === 'mid4'  && !(q.answer === q.n + 2 && q.n >= 1 && q.n <= 16)) return 'mid4Range';
  if (q.mode === 'dualA' && !(q.answer === q.n - 1 && q.s === q.n + 1 && q.n >= 12 && q.n <= 18)) return 'dualARange';
  if (q.mode === 'dualB' && !(q.answer === q.n + 1 && q.s === q.n + 2 && q.n >= 12 && q.n <= 18)) return 'dualBRange';
  if (!Array.isArray(q.options) || q.options.length !== 3) return 'optLen';
  if (q.options.indexOf(q.answer) < 0) return 'noAnswer';
  const uniq = q.options.filter((v, i, a) => a.indexOf(v) === i);
  if (uniq.length !== 3) return 'optDup';
  if (!q.options.every(v => Number.isInteger(v) && v >= 1 && v <= 20)) return 'optRange';
  if (dch != null) {                           // hidden 派生律复算（藏牌与 mode 一致）
    const hh = hiddenNums(q, dch);
    const ok = Array.isArray(q.hidden) && q.hidden.length === hh.length &&
      q.hidden.every(v => hh.indexOf(v) >= 0);
    if (!ok) return 'hiddenMismatch';
  }
  return null;
}
