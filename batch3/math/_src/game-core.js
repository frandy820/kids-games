/* ================= math 纯引擎：确定性题目生成器（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-BATCH3 §2；进度章号单调递增、难度章号 (ch-1)%4+1 循环，M1 修复）：
   ch1 五以内加减 / ch2 十以内加减 / ch3 二十以内不进位加减
   ch4 进位加 + 退位减 + 三数连加（和≤20）；生成关 flat≥20 难度按 (ch-1)%4+1 循环、进度章号单调递增 */
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
/* M1 修复（反方审查）：进度章号单调递增（与 keyOf/写档一致，flat20→ch5，杜绝生成关软锁）；
   难度章号四章循环取材（ch5 难度=ch1）；verify 语义审计用 dch */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const quizText = (a, b, c, op) => op === '++' ? (a + ' + ' + b + ' + ' + c) : (a + ' ' + op + ' ' + b);

/* ---------- 单题生成：kind 见 genKinds；操作数下界取 1（0 太平凡），answer 允许 0（如 3-3） ---------- */
function genOne(ch, kind, rnd) {
  const op = ch === 4 ? (kind === 'ca' ? '+' : kind === 'bs' ? '-' : '++') : kind;
  let a, b, c = null;
  if (op === '+') {
    if (ch === 1) { a = ri(rnd, 1, 4); b = ri(rnd, 1, 5 - a); }                     // 和 2-5
    else if (ch === 2) { a = ri(rnd, 1, 9); b = ri(rnd, 1, 10 - a); }               // 和 2-10
    else if (ch === 3) {                                                            // 不进位：个位和 ≤9
      a = rnd() < 0.3 ? 10 : ri(rnd, 11, 18);                                       // 10+b 也算不进位；19 无解（9+b 必进位）
      b = ri(rnd, 1, 9 - (a % 10));
    } else { a = ri(rnd, 2, 9); b = ri(rnd, Math.max(2, 11 - a), 9); }              // 进位：和 11-18
  } else if (op === '-') {
    if (ch === 1) { a = ri(rnd, 2, 5); b = ri(rnd, 1, a); }                          // 差 0-4
    else if (ch === 2) { a = ri(rnd, 2, 10); b = ri(rnd, 1, a); }                    // 差 0-9
    else if (ch === 3) {                                                             // 不退位：个位够减
      a = ri(rnd, 11, 19);
      b = rnd() < 0.3 ? 10 : ri(rnd, 1, a % 10);                                     // a-10 型也不退位
    } else { a = ri(rnd, 11, 18); b = ri(rnd, (a % 10) + 1, 9); }                    // 退位：减数 > 个位
  } else {                                                                           // '++' 三数连加（仅 ch4，和 ≤20）
    a = ri(rnd, 2, 9); b = ri(rnd, 2, 9); c = ri(rnd, 1, 20 - a - b);
  }
  const answer = op === '+' ? a + b : op === '-' ? a - b : a + b + c;
  return { a, b, c, op, answer, text: quizText(a, b, c, op) };
}

/* ---------- 每关题型配比：ch1-3 每关至少 2 加 2 减（第 5 题随机）；ch4 固定 2 进位加 + 2 退位减 + 1 连加 ---------- */
function genKinds(ch, rnd) {
  if (ch <= 3) {
    const ks = rnd() < 0.5 ? ['+', '+', '-', '-'] : ['-', '-', '+', '+'];
    ks.push(rnd() < 0.5 ? '+' : '-');
    return shuffled(ks, rnd);
  }
  return shuffled(['ca', 'ca', 'bs', 'bs', 'ta'], rnd);
}

/* ---------- 干扰项：answer ±1..3 且 ≥0，两两互异且 ≠answer；3 选项洗牌（答案位置随机） ---------- */
function withItems(q, rnd) {
  const cand = [];
  for (let d = 1; d <= 3; d++) { if (q.answer - d >= 0) cand.push(q.answer - d); cand.push(q.answer + d); }
  const uniq = [];
  cand.forEach(v => { if (v !== q.answer && uniq.indexOf(v) < 0) uniq.push(v); });
  const picks = shuffled(uniq, rnd).slice(0, 2);
  const items = shuffled([q.answer, picks[0], picks[1]], rnd);
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
    for (let t = 0; t < 80; t++) {        // 同关无重复题（题库 ≥20 种，冲突概率极低，80 次兜底）
      const q = genOne(dch, kind, rnd);
      if (used.indexOf(q.text) < 0) { used.push(q.text); return withItems(q, rnd); }
    }
    return withItems(genOne(dch, kind, rnd), rnd);
  });
  return { flat, ch, dch, lv: flat % CH_LEN, quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 答题引擎（无 DOM）：i = 答案按钮下标
   'right' 答对推进 / 'wrong' 首次点错（该按钮灰掉、计重试）/ 'again' 点已灰按钮 / null 关卡已结束 ---------- */
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

/* ---------- 章语义审计（verify 专用：按 SPEC 语义独立实现，不抄生成器，防两套逻辑同错） ---------- */
function rangeOk(ch, q) {
  if (q.op === '+') {
    const s = q.a + q.b;
    if (q.a < 0 || q.b < 0 || s !== q.answer || s > 20) return false;
    if (ch === 1) return q.a <= 5 && q.b <= 5 && s <= 5;
    if (ch === 2) return q.a <= 10 && q.b <= 10 && s <= 10;
    if (ch === 3) return q.a >= 10 && q.a <= 19 && q.b >= 1 && q.b <= 9 && (q.a % 10) + q.b <= 9;
    return q.a >= 2 && q.a <= 9 && q.b >= 2 && q.b <= 9 && s >= 11 && (q.a % 10) + (q.b % 10) >= 10;
  }
  if (q.op === '-') {
    if (q.a < 0 || q.b < 0 || q.a - q.b !== q.answer || q.a > 20) return false;
    if (ch === 1) return q.a <= 5 && q.b <= 5;
    if (ch === 2) return q.a <= 10 && q.b <= 10;
    if (ch === 3) return q.a >= 10 && q.a <= 19 &&
      (q.b === 10 || (q.b >= 1 && q.b <= 9 && q.a % 10 >= q.b)); // a-10 型或个位够减=不退位
    return q.a >= 11 && q.a <= 18 && q.b >= 2 && q.b <= 9 && q.a % 10 < q.b;
  }
  if (q.op === '++') {
    return ch === 4 && q.a >= 1 && q.b >= 1 && q.c >= 1 && q.a + q.b + q.c === q.answer && q.answer <= 20;
  }
  return false;
}
