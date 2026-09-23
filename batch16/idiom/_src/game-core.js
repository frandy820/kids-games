/* ================= idiom 纯引擎：确定性出题 + 点候选卡判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   数据模型（r16 SPEC §3-r16）：quiz = { idx（答案成语 1 基下标）, kind('fill'|'near'),
   options[4|2]（候选成语 idx 显示序）, answer（正确候选在 options 中的位置）,
   _miss, _hinted（错满 2 次小注已显示）, solved }。
   每关 8 题 = 6 fill + 2 near（r16 难度改造）：
     fill：从难度章池（16 条）确定性抽 6 条（互异），干扰=同章 3 条异成语（同章语义域天然迷惑）；
     near ：从难度章近义对（每章 ≥4 对）抽 2 对（互不共享成语——每条至多 1 对由数据保证），
            每对 seed 定向（答案=对中一方，干扰=另一方），题面=答案方的情境句 ctx。
   逻辑按通用写法保证任意库构成下成立（近义对不足该章 2 对时 fill 补位）。 */
function mulberry32(a) {
  return function () {
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号五章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % N_CH + 1;
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数

const chIdxs = ch => IDIOMS.filter(x => x.ch === ch).map(x => x.i);
/* 章内近义对列表：[{ a, b }]（near 互指对称——nearPairsOf 自证，verify 分源复算） */
const nearPairsOf = ch => {
  const seen = {}, out = [];
  chIdxs(ch).forEach(i => {
    const n = idmOf(i).near;
    if (n > 0 && !seen[Math.min(i, n) + '-' + Math.max(i, n)]) {
      seen[Math.min(i, n) + '-' + Math.max(i, n)] = 1;
      out.push({ a: i, b: n });
    }
  });
  return out;
};

/* ---------- 单题构造 ---------- */
function makeQuiz(rnd, idx, kind, dch) {
  if (kind === 'near') {                        // 近义辨析：2 候选=答案+指定近义对端
    const options = shuffled([idx, idmOf(idx).near], rnd);
    return { idx: idx, kind: 'near', options: options, answer: options.indexOf(idx),
             _miss: 0, _hinted: false, solved: false };
  }
  const dis = shuffled(chIdxs(dch).filter(i => i !== idx), rnd).slice(0, 3);   // 同章 3 干扰
  const options = shuffled([idx].concat(dis), rnd);
  return { idx: idx, kind: 'fill', options: options, answer: options.indexOf(idx),
           _miss: 0, _hinted: false, solved: false };
}

/* ---------- 关卡生成（静态 40 关与生成关同一确定性通道）
   出题序：near 位置=shuffled(8 位) 前 2 位（穿插自然）；fill 题材=章池排除 near 题已用 4 条。 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, N_CH);   // §0.3 生成关难度随机
  const pairs = shuffled(nearPairsOf(dch), rnd).slice(0, 2);            // 2 近义对（不足时 fill 补位）
  const nearSlots = shuffled([0, 1, 2, 3, 4, 5, 6, 7], rnd).slice(0, pairs.length);
  const used = {};                                                      // 本关已用成语（8 题互异）
  pairs.forEach(p => { used[p.a] = 1; used[p.b] = 1; });
  const fillPool = shuffled(chIdxs(dch).filter(i => !used[i]), rnd);    // 章池排除 near 题成员
  let fillTaken = 0;
  const quizzes = [];
  for (let k = 0; k < CH_LEN; k++) {
    const ni = nearSlots.indexOf(k);
    if (ni >= 0) {
      const p = pairs[ni];
      const idx = ri(rnd, 0, 1) ? p.a : p.b;                            // 每对 seed 定向
      quizzes.push(makeQuiz(rnd, idx, 'near', dch));
    } else {
      quizzes.push(makeQuiz(rnd, fillPool[fillTaken++], 'fill', dch));
    }
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, misses: 0, done: false };
}

/* ---------- 点候选卡引擎（无 DOM）
   'right' 答对推进（非末题）/ 'done' 通关 / 'wrong' 答错（miss+1，零惩罚可重点）/
   false 非法（越界/已解/关卡结束） ---------- */
function engTapCard(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || i < 0 || i >= q.options.length) return false;
  if (i === q.answer) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q._miss++;
  L.misses++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：关 miss（错点）0=3 星 / 1-2=2 星 / 更多=1 星。永不 0 星 */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：kind 构成 / 章域 / options 构成 / 干扰互异异于答案 /
   near 干扰=指定对端 / answer 位置一致 ---------- */
function structOk(q, dch) {
  if (!q || !q.options) return false;
  const nOpt = q.kind === 'near' ? 2 : 4;
  if (q.options.length !== nOpt) return false;
  if (q.idx < 1 || q.idx > IDIOMS.length) return false;
  if (idmOf(q.idx).ch !== dch) return false;                        // 题目成语在该难度章
  if (new Set(q.options).size !== nOpt) return false;               // 候选互异
  if (q.options[q.answer] !== q.idx || q.options.indexOf(q.idx) !== q.answer) return false;
  const dis = q.options.filter(i => i !== q.idx);
  if (q.kind === 'near') {
    return dis.length === 1 && dis[0] === idmOf(q.idx).near &&      // 近义干扰=指定对端
           idmOf(dis[0]).ch === dch;
  }
  return dis.length === 3 && dis.every(i => i >= 1 && i <= IDIOMS.length &&
    i !== q.idx && idmOf(i).ch === dch);                            // fill 干扰全同章
}
