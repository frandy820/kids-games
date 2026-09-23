/* ================= multibattle 纯引擎：确定性关卡生成 + 抢答判定 + 对手得分（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC §2；无首题热身设计——每章题型单一，全关直入对抗）：
   dch1 {2,3}×{2..9} / dch2 {4,5}×{2..9} / dch3 {6,7}×{2..9}
   dch4 = 洗牌[2×m89({8,9}×) + 3×mix(2..9 混合复习)]（照 times 混合复习结构，无缺因数型）
   a≠b 允许（口诀含平方）；同关相邻题算式互异（(a,b) 有序对不同）
   干扰 = {ans±a, ans±b, a+b} 滤重/正值/非 ans 取 2（§0.17 近邻+运算混淆；池恒 ≥2：最差 a=b=2 时 {2,6}）
   miss 口径（家族统一=准确性）：答错 tapAnswer 计 miss/retries；
   对手超时 engFoe 只进 foeScore/step——不计 miss 不扣星（超时是慢不是错，零惩罚精神）
   星级：0 错=3★ / 1-2 错=2★ / 更多=1★（永不 0）；胜负=myScore≥3（速度口径，与星级分离，UI 层判） */
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

/* ---------- 干扰候选池：{ans±a, ans±b, a+b}，滤 0 负/同答案/重复
   恒 ≥2 证明：ans-a=a(b-1)≥2>0 与 ans+a=a(b+1) 互异且 ≠ans（b≥2）；
   a=b 时两对退化相同，a+b≠ans（除 a=b=2 外）仍保证 ≥2；a=b=2 时池={2,6} 恰 2 ---------- */
function candPool(q) {
  const raw = [q.answer - q.a, q.answer + q.a, q.answer - q.b, q.answer + q.b, q.a + q.b];
  const uniq = [];
  raw.forEach(v => { if (v > 0 && v !== q.answer && uniq.indexOf(v) < 0) uniq.push(v); });
  return uniq;
}

/* ---------- 单题生成（rnd 同流确定性；kind='mul'章键因数/'m89'{8,9}/'mix'混合） ---------- */
function genOne(dch, kind, rnd) {
  let a, b;
  if (kind === 'm89') { a = rnd() < 0.5 ? 8 : 9; b = ri(rnd, 2, 9); }
  else if (kind === 'mix') { a = ri(rnd, 2, 9); b = ri(rnd, 2, 9); }
  else { const ks = KEYS[dch]; a = ks[ri(rnd, 0, ks.length - 1)]; b = ri(rnd, 2, 9); }
  /* q.src 字段记录来源型（'mul'章键因数/'m89'{8,9}/'mix'混合）——verify 形态审计用（不进钩子契约） */
  const q = { kind: 'mul', src: kind, a: a, b: b, answer: a * b, text: a + '×' + b, miss: 0, solved: false };
  const ds = shuffled(candPool(q), rnd).slice(0, 2);
  q.items = shuffled([q.answer, ds[0], ds[1]], rnd);
  q.answerIdx = q.items.indexOf(q.answer);
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；相邻题算式互异重试 ≤60） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const kinds = dch === 4
    ? shuffled(['m89', 'm89', 'mix', 'mix', 'mix'], rnd)
    : ['mul', 'mul', 'mul', 'mul', 'mul'];
  const quizzes = [];
  let prev = null;                                    // 上一题 (a,b)（相邻互异）
  for (let qi = 0; qi < CH_LEN; qi++) {
    let q = null;
    for (let t = 0; t < 60; t++) {                    // 重试至与上一题 (a,b) 对不同
      const c = genOne(dch, kinds[qi], rnd);
      if (!prev || c.a !== prev.a || c.b !== prev.b) { q = c; break; }
    }
    if (!q) q = genOne(dch, kinds[qi], rnd);          // 兜底（理论不可达：每题 ≥16 组合）
    prev = { a: q.a, b: q.b };
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes,
           step: 0, retries: 0, done: false, myScore: 0, foeScore: 0 };
}

/* ---------- 抢答引擎（无 DOM）：engPick(L, i) 孩子点第 i 张答案卡
   'right' 答对推进（myScore++）/ 'done' 答对且最后一题（通关）
   'wrong' 答错（miss/retries 计一次，零惩罚可重点）/ null 已结束或非法下标 ---------- */
function engPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.items.length) return null;
  if (i === q.answerIdx) {
    q.solved = true;
    L.myScore++;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;                                        // 不灰化款：同卡可重复点，每次计错
  return 'wrong';
}
/* ---------- 对手超时引擎：engFoe(L) —— 对手钟走完调用
   'foe' 对手进 1 格推进 / 'foedone' 最后一题对手得分（关终）
   不计 miss 不扣星（超时是慢不是错，SPEC §2 明示） ---------- */
function engFoe(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  q.solved = true;
  L.foeScore++;
  L.step++;
  if (L.step >= L.quizzes.length) L.done = true;
  return L.done ? 'foedone' : 'foe';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（miss=retries 口径，家族统一；超时不进此口径） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：算式域 + 3 选 1 互异禁 0 负 + 干扰池复算 ---------- */
function structOk(q) {
  if (!q || q.kind !== 'mul') return false;
  if (!(q.a >= 2 && q.a <= 9 && q.b >= 2 && q.b <= 9)) return false;
  if (q.a * q.b !== q.answer) return false;
  if (!Array.isArray(q.items) || q.items.length !== 3) return false;
  if (q.answerIdx < 0 || q.answerIdx >= 3 || q.items[q.answerIdx] !== q.answer) return false;
  for (let i = 0; i < 3; i++) {
    if (q.items[i] <= 0) return false;                                     // 禁 0 负
    for (let j = i + 1; j < 3; j++) if (q.items[i] === q.items[j]) return false;  // 互异
  }
  const ds = q.items.filter((v, i) => i !== q.answerIdx);
  return ds.every(v => v !== q.answer && candPool(q).indexOf(v) >= 0);
}
