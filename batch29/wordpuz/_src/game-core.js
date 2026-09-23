/* ================= wordpuz 纯引擎：确定性关卡生成 + 字母卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 47)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH29 §0.72/§3；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 三字母：词长恒 3，池 = 词字母（3 张），无干扰
     dch2 四字母：词长恒 4，池 = 词字母（4 张），无干扰
     dch3 捣蛋字母：词长 ∈{3,4}，池 = 词字母 + 1 干扰（4-5 张）
     dch4 混合：词长 ∈{3,4}，干扰 0/1 随机（3-5 张）
   生成关（flat≥20）：burn 一掷后 dch=ri(1,4)（先取数保确定性——b25 坑④）。
   池数学先验（§0.72，构造即验证——structWhy 同款校验双保险）：
     ① 池多重集 = 目标词字母多重集 ± 恰 1 张干扰卡（ch3+），干扰字母 ∉ 目标词字母；
     ② 池恒可拼出目标（池 ⊇ 词字母多重集，多余干扰可剩——按序点词字母即可完成）；
     ③ 词完成判定 = 槽位串接 === 目标词（多重集语义：重复字母点任一同字母未用卡均合法）。
   flat0 题0 教学演示锚点：word=cat 池=[c,a,t]（幽灵手指按序点 c→a→t）。 */
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

/* ---------- 每关题序表（genLevel 预生成；rnd 同流保确定性）
   词长/干扰按章型掷定；词选择保证每关内相邻题词互异（4 字母池仅 2 词=交替） ---------- */
function specSeqOf(dch, rnd) {
  const seq = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    let len, distract;
    if (dch === 1)      { len = 3; distract = false; }
    else if (dch === 2) { len = 4; distract = false; }
    else if (dch === 3) { len = ri(rnd, 3, 4); distract = true; }
    else                { len = ri(rnd, 3, 4); distract = rnd() < 0.5; }
    seq.push({ len: len, distract: distract });
  }
  return seq;
}

/* ---------- 词选择（与前一题词互异；flat0 题0 锚点=cat——教学演示 c→a→t） ---------- */
function pickWord(spec, rnd, flat, qi, prevWord) {
  if (flat === 0 && qi === 0) return 'cat';
  const pool = spec.len === 4 ? W4 : W3;
  for (let t = 0; t < 24; t++) {
    const w = pool[Math.floor(rnd() * pool.length)];
    if (!prevWord || w !== prevWord || t === 23) return w;   // 相邻互异（末掷兜底放行）
  }
  return pool[0];
}

/* ---------- 干扰字母（∉ 目标词字母；取材=词表全字母并集——学过的字母做干扰） ---------- */
function pickDistract(word, rnd) {
  const cands = ALPHA_UNION.filter(c => word.indexOf(c) < 0);
  return cands[Math.floor(rnd() * cands.length)];
}

/* ---------- 单题构建 ---------- */
function buildQuiz(spec, dch, rnd, flat, qi, prevQ) {
  const word = pickWord(spec, rnd, flat, qi, prevQ ? prevQ.word : null);
  const letters = word.split('');
  const src = spec.distract ? letters.concat([pickDistract(word, rnd)]) : letters;
  return { word: word, zh: WORDS[word], pool: shuffled(src, rnd).map((ch, j) => ({ id: 'p' + j, ch: ch, used: false })),
           slots: [], _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关 dch 取数前 burn 一掷：mulberry32(flat*7919+47) 首掷对 4 有系统偏差
   （coder b25 实测教训——burn 后四型全现，burn+ri 仍是该 rnd 流固定首个消耗，
   确定性保持） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 47);
  if (flat >= STATIC_LEVELS) rnd();                          // burn：首掷偏差修正（仅生成关消耗）
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd);
  const quizzes = [];
  let prev = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = buildQuiz(specs[qi], dch, rnd, flat, qi, prev);
    quizzes.push(q);
    prev = q;
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点字母卡引擎（无 DOM）：engTapLtr(L, i) —— 点第 i 张字母卡
   'moved' 所需字母填入槽位但词未满（字母入格动画）
   'right' 词完成且非末题（推进下一题）/ 'done' 词完成且末题=通关
   'wrong' 非所需字母（miss+1+wig——多重集语义：重复字母点任一同字母未用卡均合法）
   'false' 已用卡（不记 miss——UI 层 pop+bump 轻反馈）
   null    越界下标 / 关卡已结束 ---------- */
function engTapLtr(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.pool.length) return null;
  const card = q.pool[i];
  if (card.used) return 'false';                             // 已用卡（不记 miss）
  if (card.ch !== q.word[q.slots.length]) {                  // 按字母比较（非下标）=多重集语义
    q._miss++;
    L.retries++;
    return 'wrong';
  }
  card.used = true;
  q.slots.push(card.ch);
  if (q.slots.join('') === q.word) {                         // 词完成判定=槽位串接===目标词（§0.72）
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  return 'moved';
}
const engWon = L => !!L && L.done;
/* 星级（§0.72 口径=miss）：全关 miss 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- 应点卡求解（教学帮指/答案级救援/autoSolve 共用）
   返回应点卡的 pool 下标（第一张未用且字母=下一所需），无=-1 ---------- */
function solveNext(q) {
  if (!q || q._answered) return -1;
  const need = q.word[q.slots.length];
  for (let i = 0; i < q.pool.length; i++)
    if (!q.pool[i].used && q.pool[i].ch === need) return i;
  return -1;
}
const correctIdx = q => solveNext(q);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：词封闭 / 章型规则 /
   池多重集=词字母±1 干扰（干扰∉词字母）/ 槽序干净 / flat0q0 锚点 / 相邻词互异 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'q';
  if (!(q.word in WORDS)) return 'word';                     // 词 ∈ 封闭 20
  if (q.zh !== WORDS[q.word]) return 'zh';
  const len = q.word.length;
  if (dch === 1 && !(len === 3 && q.pool.length === 3)) return 'ch1';   // 三字母池 3
  if (dch === 2 && !(len === 4 && q.pool.length === 4)) return 'ch2';   // 四字母池 4
  if (dch === 3 && !(len >= 3 && len <= 4 && q.pool.length === len + 1)) return 'ch3';   // +1 干扰
  if (dch === 4 && !(len >= 3 && len <= 4 &&
      (q.pool.length === len || q.pool.length === len + 1))) return 'ch4';              // 混合
  if (q.pool.length !== len && q.pool.length !== len + 1) return 'poolN';
  /* 池多重集独立复算：排序比较（词字母 ± 恰 1 干扰∉词） */
  const pm = q.pool.map(c => c.ch).sort().join('');
  const wm = q.word.split('').sort().join('');
  if (q.pool.length === len) {
    if (pm !== wm) return 'multiset';
  } else {
    const diff = q.pool.filter(c => q.word.indexOf(c.ch) < 0);
    if (diff.length !== 1) return 'distractN';               // 恰 1 张干扰卡（干扰∉词字母）
    const want = q.word.split('').concat([diff[0].ch]).sort().join('');
    if (pm !== want) return 'multisetD';                     // 词字母+干扰的多重集对账
  }
  if (flat === 0 && qi === 0 && !(q.word === 'cat' && q.pool.length === 3)) return 'anchor';   // 教学锚点 cat
  if (prevQ && prevQ.word === q.word) return 'adjacent';     // 相邻题词互异
  if (q.slots.length !== 0 || q._miss !== 0 || q._answered) return 'init';
  if (q.pool.some(c => c.used)) return 'used';
  return null;
}
