/* ================= times 纯引擎：确定性题目生成器（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   难度章（dch=(ch-1)%4+1 循环）：
   dch1 ×2/×3（每关前 2 题连加形态 + 后 3 题乘法）/ dch2 ×4/×5 / dch3 ×6/×7
   dch4 ×8/×9 两题 + 混合复习两题 + 缺因数一题（? × a = c，a∈2..5）
   进度章号 chOfFlat 单调递增（M1 教训：与 keyOf 一致，生成关 flat≥20 连续推进禁软锁） */
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
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;   // 进度章号：单调递增
const diffOfCh = ch => (ch - 1) % 4 + 1;                  // 难度章号：四章循环取材

/* ---------- 每关题型序列
   dch1 固定 [sum,sum,mul,mul,mul]（SPEC：前半段连加形态、后半段直接乘法，教学递进不洗牌）
   dch2/3 全乘法；dch4 = 2 个 ×8/×9 + 2 个混合 + 1 个缺因数（洗牌） ---------- */
function genKinds(dch, rnd) {
  if (dch === 1) return ['sum', 'sum', 'mul', 'mul', 'mul'];
  if (dch === 2 || dch === 3) return ['mul', 'mul', 'mul', 'mul', 'mul'];
  return shuffled(['m89', 'm89', 'mix', 'mix', 'miss'], rnd);
}

/* ---------- 单题生成
   sum：a+a+…（b 个 a，a∈{2,3}，b∈2..5），answer=Σ
   mul：a × b，a=本章口诀键因数，b∈2..9
   m89：a∈{8,9}；mix：a,b∈2..9（混合复习）
   miss：? × a = c，a∈2..5（分组图行短好数），b∈2..9，answer=b（缺的因数） ---------- */
function genOne(dch, kind, rnd) {
  let type, a, b, c = null;
  if (kind === 'sum') {
    type = 'sum';
    a = rnd() < 0.5 ? 2 : 3;
    b = ri(rnd, 2, 5);
  } else if (kind === 'mul') {
    type = 'mul';
    const ks = KEYS[dch];
    a = ks[ri(rnd, 0, ks.length - 1)];
    b = ri(rnd, 2, 9);
  } else if (kind === 'm89') {
    type = 'mul';
    a = rnd() < 0.5 ? 8 : 9;
    b = ri(rnd, 2, 9);
  } else if (kind === 'mix') {
    type = 'mul';
    a = ri(rnd, 2, 9);
    b = ri(rnd, 2, 9);
  } else { // miss
    type = 'miss';
    a = ri(rnd, 2, 5);
    b = ri(rnd, 2, 9);
    c = a * b;
  }
  const answer = type === 'miss' ? b : a * b;
  const sumStr = type === 'sum' ? Array(b).fill(a).join(' + ') : null;
  const pre  = type === 'miss' ? '' : (type === 'sum' ? sumStr + ' = ' : a + ' × ' + b + ' = ');
  const post = type === 'miss' ? ' × ' + a + ' = ' + c : '';
  return { type, a, b, c, answer, pre, post, text: pre + '?' + post };
}

/* ---------- 干扰项规则（口诀表近邻 + 运算混淆，全部可闭式构造）
   mul/sum：a+b（3×4 混成 3+4 的口诀混淆积）、(a±1)×b、a×(b±1)、(a+2)×b、a×(b+2)（近邻积，小积时保 3 个候选）
   miss（answer=缺的因数 b）：b±1、b+2、另一因数 a ---------- */
function candPool(q) {
  const raw = [];
  if (q.type === 'miss') raw.push(q.b - 1, q.b + 1, q.b + 2, q.a);
  else raw.push(q.a + q.b, (q.a + 1) * q.b, (q.a - 1) * q.b, q.a * (q.b + 1), q.a * (q.b - 1),
                (q.a + 2) * q.b, q.a * (q.b + 2));
  const uniq = [];
  raw.forEach(v => { if (v >= 0 && v !== q.answer && uniq.indexOf(v) < 0) uniq.push(v); });
  return uniq;
}
/* 4 选 1：答案 + 3 个规则干扰，洗牌（答案位置轮转，禁恒首位） */
function withItems(q, rnd) {
  const picks = shuffled(candPool(q), rnd).slice(0, 3);
  const items = shuffled([q.answer, picks[0], picks[1], picks[2]], rnd);
  q.items = items;
  q.answerIdx = items.indexOf(q.answer);
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch);
  const rnd = mulberry32(flat * 7919 + 13);
  const kinds = genKinds(dch, rnd);
  const used = [];
  const quizzes = kinds.map(kind => {
    for (let t = 0; t < 80; t++) {        // 同关无重复题（80 次兜底）
      const q = genOne(dch, kind, rnd);
      if (used.indexOf(q.text) < 0) { used.push(q.text); return withItems(q, rnd); }
    }
    return withItems(genOne(dch, kind, rnd), rnd);
  });
  return { flat, ch, dch, lv: flat % CH_LEN, quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 答题引擎（无 DOM）：i = 数字鱼下标
   'right' 答对推进 / 'done' 通关 / 'wrong' 首次点错（灰掉、计重试）/ 'again' 点已灰 / null 已结束 ---------- */
function engPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  q.wrong = q.wrong || [];
  if (i === q.answerIdx) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  if (q.wrong.indexOf(i) >= 0) return 'again';
  q.wrong.push(i);
  L.retries++;
  return 'wrong';
}
/* 星级：5 题全部一次答对=3 星；总重试 ≤3=2 星；否则 1 星（永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 3 ? 2 : 1);

/* ---------- 章语义审计（verify 专用：按 SPEC 语义独立实现，不抄生成器） ---------- */
function rangeOk(dch, q) {
  if (q.type === 'sum') {
    return dch === 1 && (q.a === 2 || q.a === 3) && q.b >= 2 && q.b <= 5 &&
      q.a * q.b === q.answer;
  }
  if (q.type === 'mul') {
    if (!(q.a >= 2 && q.a <= 9 && q.b >= 2 && q.b <= 9) || q.a * q.b !== q.answer) return false;
    const inKs = (v, ks) => ks.indexOf(v) >= 0;
    if (dch === 1) return inKs(q.a, KEYS[1]) || inKs(q.b, KEYS[1]);
    if (dch === 2) return inKs(q.a, KEYS[2]) || inKs(q.b, KEYS[2]);
    if (dch === 3) return inKs(q.a, KEYS[3]) || inKs(q.b, KEYS[3]);
    return true; // dch4：×8/×9 与混合复习均落在 2..9（×8/×9 存在性由关形态审计保证）
  }
  if (q.type === 'miss') {
    return dch === 4 && q.a >= 2 && q.a <= 5 && q.b >= 2 && q.b <= 9 &&
      q.c === q.a * q.b && q.answer === q.b && q.b === q.c / q.a; // SPEC：缺因数形态 b == c ÷ a
  }
  return false;
}
