/* ================= cipher 纯引擎：确定性关卡生成 + 解码槽判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   §0.40 映射真值：密码表=双射（符号集↔目标集无重无漏）；密文经表解码唯一；
   干扰选项 ∉ 正确答案的映射像。ch3 缺表题无歧义铁律——情报例中每个缺符号
   恰出现且像唯一（同符号同像），缺行真值与表现有像不重（恢复表仍双射）；
   生成期即保证，verify 侧独立解密器分源复算。
   数据模型：q._built[j]（解码槽 j ← opts 下标或 null 按位对应密文），
   q._used[i]（候选卡 i 已入槽）；拼满由 UI/引擎显式 engJudge 判定。 */
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
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

const NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ALL_CHARS = Array.from(new Set(WORDS.join('').split('')));   // 词库全字池（互异）

/* ---------- 数字域生成（ch1/ch4 数字版共用）：表 4-6 对符号→数字，密文逐符解码
   干扰=数字 ∉ answer 像集（表外/表内非密文像均可，须查表分辨） ---------- */
function genNumQuiz(rnd, pairLo, pairHi, clenLo, clenHi, nDis) {
  const np = ri(rnd, pairLo, pairHi);
  const syms = shuffled(SYM_IDS, rnd).slice(0, np);
  const imgs = shuffled(NUMS, rnd).slice(0, np);            // 数字互异 → 双射
  const table = syms.map((s, i) => ({ sym: s, img: imgs[i] }));
  const map = {};
  syms.forEach((s, i) => { map[s] = imgs[i]; });
  const clen = ri(rnd, clenLo, clenHi);
  const cipher = [];
  for (let k = 0; k < clen; k++) cipher.push(syms[ri(rnd, 0, np - 1)]);
  const answer = cipher.map(s => map[s]);
  const ansSet = {};
  answer.forEach(v => { ansSet[v] = 1; });
  const distract = shuffled(NUMS.filter(d => !ansSet[d]), rnd).slice(0, nDis);
  return finishQuiz(table, [], null, cipher, answer, distract, rnd);
}
/* ---------- 字词域生成（ch2）：词字各配符号 + 填充行补足 4-6 对
   填充字/干扰字=词库全字池 ∉ 本词字（表内填充行像可作干扰=须查表分辨） ---------- */
function genWordQuiz(rnd, pairLo, pairHi, nDis) {
  const w = WORDS[ri(rnd, 0, WORDS.length - 1)];
  const chars = w.split('');
  const fillN = Math.max(1, ri(rnd, pairLo - chars.length, pairHi - chars.length));
  const pool = shuffled(SYM_IDS, rnd);                       // 词字符号 + 填充符号同池取
  const fillPool = ALL_CHARS.filter(c => chars.indexOf(c) < 0);
  const fillChars = shuffled(fillPool, rnd).slice(0, fillN);
  const table = chars.map((c, i) => ({ sym: pool[i], img: c }))
    .concat(fillChars.map((c, i) => ({ sym: pool[chars.length + i], img: c })));
  const map = {};
  table.forEach(t => { map[t.img] = t.sym; });
  const cipher = chars.map(c => map[c]);
  const answer = chars.slice();
  const distract = shuffled(fillPool, rnd).slice(0, nDis);
  return finishQuiz(table, [], null, cipher, answer, distract, rnd);
}
/* ---------- 缺表推理生成（ch3）：表 5-6 对缺 1-2 行（img=null），
   情报例=短密文+明文对照（含每个缺符号≥1 次），正式密文 3-5 符含全部缺符号 ---------- */
function genMissingQuiz(rnd) {
  const np = ri(rnd, 5, 6), nh = ri(rnd, 1, 2);
  const syms = shuffled(SYM_IDS, rnd).slice(0, np);
  const imgs = shuffled(NUMS, rnd).slice(0, np);             // 全表像互异（含缺行真值）
  const hidSet = {};
  shuffled(syms.map((s, i) => i), rnd).slice(0, nh).forEach(i => { hidSet[i] = 1; });
  const table = syms.map((s, i) => ({ sym: s, img: hidSet[i] ? null : imgs[i] }));
  const truth = {};                                          // 缺行真值（生成期专用，钩子不暴露）
  Object.keys(hidSet).forEach(i => { truth[syms[i]] = imgs[i]; });
  const fullMap = {};
  syms.forEach((s, i) => { fullMap[s] = imgs[i]; });
  /* 情报例：全部缺符号 + 0-1 个可见行符号，打乱；明文=完整映射解码 */
  const exSyms = shuffled(Object.keys(truth), rnd)
    .concat(shuffled(syms.filter((s, i) => !hidSet[i]), rnd).slice(0, ri(rnd, 0, 1)));
  const exCipher = shuffled(exSyms, rnd);
  const example = { cipher: exCipher.slice(), plain: exCipher.map(s => fullMap[s]) };
  /* 正式密文：含全部缺符号 + 随机表符号补到目标长（≥3） */
  const target = Math.max(nh, ri(rnd, 3, 5));
  const cip = Object.keys(truth).slice();
  while (cip.length < target) cip.push(syms[ri(rnd, 0, np - 1)]);
  const cipher = shuffled(cip, rnd);
  const answer = cipher.map(s => fullMap[s]);
  const ansSet = {};
  answer.forEach(v => { ansSet[v] = 1; });
  const distract = shuffled(NUMS.filter(d => !ansSet[d]), rnd).slice(0, 2);
  const hidden = [];
  table.forEach((t, i) => { if (t.img == null) hidden.push(i); });
  return finishQuiz(table, hidden, example, cipher, answer, distract, rnd, truth);
}
/* ---------- 生成关（ch4）：数字版 5-6 对+4-5 符+干扰 3 / 双词拼接 4-5 字+干扰 3 ---------- */
function genFinalQuiz(rnd) {
  if (ri(rnd, 0, 1) === 0) return genNumQuiz(rnd, 5, 6, 4, 5, 3);
  for (let g = 0; g < 30; g++) {                             // 双词字集无交 + 总长 4-5
    const A = WORDS[ri(rnd, 0, WORDS.length - 1)];
    const B = WORDS[ri(rnd, 0, WORDS.length - 1)];
    const chars = (A + B).split('');
    if (A === B || chars.length < 4 || chars.length > 5) continue;
    if (new Set(chars).size !== chars.length) continue;      // 字互异（双射可行）
    const pool = shuffled(SYM_IDS, rnd);
    const fillN = ri(rnd, Math.max(1, 5 - chars.length), 6 - chars.length);
    const fillPool = ALL_CHARS.filter(c => chars.indexOf(c) < 0);
    const fillChars = shuffled(fillPool, rnd).slice(0, fillN);
    const table = chars.map((c, i) => ({ sym: pool[i], img: c }))
      .concat(fillChars.map((c, i) => ({ sym: pool[chars.length + i], img: c })));
    const map = {};
    table.forEach(t => { map[t.img] = t.sym; });
    const cipher = chars.map(c => map[c]);
    const distract = shuffled(fillPool, rnd).slice(0, 3);
    return finishQuiz(table, [], null, cipher, chars.slice(), distract, rnd);
  }
  return genNumQuiz(rnd, 5, 6, 4, 5, 3);                     // 不可达防御：退数字版
}
/* ---------- 组装（候选池=answer 多重集+干扰洗牌；槽/用态初始化）
   truth=缺行真值 map（ch3 朗读用；不参与判定，verify 侧独立解密器不用它 §0.40） ---------- */
function finishQuiz(table, hidden, example, cipher, answer, distract, rnd, truth) {
  const opts = shuffled(answer.concat(distract), rnd);
  return { kind: 'cipher', table: table, hidden: hidden, example: example,
    truth: truth || null,
    cipher: cipher, answer: answer, opts: opts.map(v => ({ v: v })),
    _built: cipher.map(function () { return null; }),
    _used: opts.map(function () { return false; }),
    miss: 0, solved: false };
}

/* ---------- 单题生成入口（确定性；章分支） ---------- */
function genQuiz(dch, rnd) {
  if (dch === 1) return genNumQuiz(rnd, 4, 5, 3, 4, 2);
  if (dch === 2) return genWordQuiz(rnd, 4, 6, 2);
  if (dch === 3) return genMissingQuiz(rnd);
  return genFinalQuiz(rnd);
}

/* ---------- 手解安全网模板（genLevel 极端防御；verify 侧 REF_FALLBACKS 双写对账） ---------- */
const FALLBACKS = {
  1: { table: [['star', '3'], ['moon', '5'], ['sun', '7'], ['cloud', '2']],
       cipher: ['star', 'moon', 'star'], distract: ['6', '8'] },
  2: { table: [['star', '太'], ['moon', '阳'], ['cloud', '水'], ['flower', '果']],
       cipher: ['star', 'moon'], distract: ['山', '白'] },
  3: { table: [['star', '3'], ['moon', '5'], ['sun', '7'], ['cloud', '2'], ['fish', null]],
       hidden: [4], example: { cipher: ['fish', 'star'], plain: ['4', '3'] },
       cipher: ['fish', 'moon', 'fish'], distract: ['6', '8'] },
  4: { table: [['star', '3'], ['moon', '5'], ['sun', '7'], ['cloud', '2'], ['fish', '4'], ['tree', '6']],
       cipher: ['sun', 'tree', 'moon', 'sun'], distract: ['1', '8', '9'] }
};
function fallbackQuiz(dch) {
  const f = FALLBACKS[dch] || FALLBACKS[1];
  const table = f.table.map(p => ({ sym: p[0], img: p[1] }));
  const fullMap = {};
  f.table.forEach(p => { fullMap[p[0]] = p[1]; });
  const hidden = f.hidden ? f.hidden.slice() : [];
  const truth = {};                              // 缺行真值（从情报例推，朗读用）
  if (f.hidden && f.example) {
    f.hidden.forEach(i => {
      const k = f.example.cipher.indexOf(table[i].sym);
      if (k >= 0) truth[table[i].sym] = f.example.plain[k];
    });
  }
  const answer = f.cipher.map(s => fullMap[s]);
  const opts = shuffled(answer.concat(f.distract), { next: function () { return 0.9; } });
  return { kind: 'cipher', table: table, hidden: hidden,
    example: f.example ? { cipher: f.example.cipher.slice(), plain: f.example.plain.slice() } : null,
    truth: Object.keys(truth).length ? truth : null,
    cipher: f.cipher.slice(), answer: answer, opts: opts.map(v => ({ v: v })),
    _built: f.cipher.map(function () { return null; }),
    _used: opts.map(function () { return false; }),
    miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；同关 5 题签名互异）
   sig=表符号集+密文序+答案串（体验维度：孩子看到的符号/密文/解码结果；
   表行展示顺序等呈现维度不入签名——b18 flat2 教训） ---------- */
const sigOf = q => [q.table.map(t => t.sym).sort().join(''),
  q.cipher.join(''), q.answer.join('')].join('|');
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);
  const quizzes = [], sigs = {};
  let guard = 0;
  while (quizzes.length < CH_LEN && guard++ < 120) {
    const q = genQuiz(dch, rnd);
    const sig = sigOf(q);
    if (sigs[sig]) continue;
    sigs[sig] = 1;
    quizzes.push(q);
  }
  while (quizzes.length < CH_LEN) quizzes.push(fallbackQuiz(dch));   // 不可达防御
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 解码槽引擎（无 DOM）：点候选卡入首空槽 / 点已填槽退回 ---------- */
/* engTapOpt(L,i)：点候选卡 i → 填入第一个空槽，返回槽位 j；非法（越界/已用/已满/
   关已结束）→ null。填卡=作答动作但不重置救援钟（§0.7a 唯答对推进重置） */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.opts.length) return null;
  if (q._used[i]) return null;
  const j = q._built.indexOf(null);
  if (j < 0) return null;
  q._used[i] = true;
  q._built[j] = i;
  return j;
}
/* engTapSlot(L,j)：点解码槽 j=退回该卡回池（按位退回，后继不动——每槽对应密文位）；
   空槽/非法下标 → null。退回=改答零惩罚（§0.7a 不重置） */
function engTapSlot(L, j) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q._built.length) return null;
  if (q._built[j] == null) return null;
  q._used[q._built[j]] = false;
  q._built[j] = null;
  return 'emptied';
}
/* 空闲池中第一个值为 v 的卡（教学演示/帮/救援/autoSolve 共用） */
function freeOptFor(q, v) {
  for (let i = 0; i < q.opts.length; i++) if (!q._used[i] && q.opts[i].v === v) return i;
  return -1;
}
/* engJudge(L)：拼满判定纯算——built 值序列与 answer 逐位比对 → {win}；未满 → null */
function engJudge(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q._built.some(x => x == null)) return null;
  const vals = q._built.map(i => q.opts[i].v);
  return { win: vals.every((v, k) => v === q.answer[k]) };
}
/* engCommitJudge(L,plan)：提交判定。win → solved+推进，返回 'right'/'done'；
   不等 → miss/retries 各 +1 返回 'wrong'（错次口径 §1：答错=1 错） */
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

/* ---------- 救援/教学"帮"目标（§1：正确首卡 breathe+密码表对应行 pulse）
   rescueTarget=答案级：首个空槽 j 的正确值 → 未用候选卡 i（{act:'opt'}）；
   dirTarget=方向级（梯度脚手架 错1次）：首个空槽对应密文符号 → 表行 r（缺角行→情报例卡）
   两目标同源策略，UI 与 verify 共用 ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  const j = q._built.indexOf(null);
  if (j < 0) return null;
  const i = freeOptFor(q, q.answer[j]);
  if (i < 0) return null;
  return { act: 'opt', i: i, j: j };
}
function dirTarget(q) {
  if (!q || q.solved) return null;
  const j = q._built.indexOf(null);
  if (j < 0) return null;
  const r = q.table.findIndex(t => t.sym === q.cipher[j]);
  if (r < 0) return null;
  if (q.table[r].img == null) return { act: 'intel' };
  return { act: 'row', r: r };
}

/* ---------- 结构校验（verify 用）：表域+池约束
   （双射性/解码唯一/干扰排除由 verify 侧独立解密器分源复算 §0.40） ---------- */
function structOk(q) {
  if (!q || q.kind !== 'cipher') return false;
  if (!Array.isArray(q.table) || q.table.length < 4 || q.table.length > 6) return false;
  const syms = q.table.map(t => t.sym);
  if (syms.some(s => !SYMS[s])) return false;
  if (new Set(syms).size !== syms.length) return false;            // 符号无重
  const vis = q.table.filter(t => t.img != null).map(t => t.img);
  if (new Set(vis).size !== vis.length) return false;              // 可见行像无重
  const hidRows = q.table.map((t, i) => t.img == null ? i : -1).filter(i => i >= 0);
  const hid = q.hidden || [];
  if (hid.length !== hidRows.length || hid.some((v, k) => v !== hidRows[k])) return false;
  if (!Array.isArray(q.cipher) || q.cipher.length < 2 || q.cipher.length > 5) return false;   // ch2 词域 2-3 符（SPEC §1「太阳」2 字词合法）；ch1/3/4 长度由 verify 分章断言
  if (q.cipher.some(s => syms.indexOf(s) < 0)) return false;       // 密文符号在表内
  if (!Array.isArray(q.answer) || q.answer.length !== q.cipher.length) return false;
  if (q.example && (q.example.cipher.length !== q.example.plain.length ||
      q.example.cipher.some(s => syms.indexOf(s) < 0))) return false;
  if (!Array.isArray(q.opts) || q.opts.some(o => typeof o.v !== 'string' || !o.v)) return false;
  const need = {}, have = {};
  q.answer.forEach(v => { need[v] = (need[v] || 0) + 1; });
  q.opts.forEach(o => { have[o.v] = (have[o.v] || 0) + 1; });
  for (const k of Object.keys(need)) if (have[k] !== need[k]) return false;   // 池 ⊇ answer 多重集
  const extra = q.opts.length - q.answer.length;
  if (extra < 2 || extra > 3) return false;                        // 干扰 2-3
  const extraList = [];
  const need2 = {};
  q.answer.forEach(v => { need2[v] = (need2[v] || 0) + 1; });
  q.opts.forEach(o => { if (need2[o.v] > 0) need2[o.v]--; else extraList.push(o.v); });
  if (new Set(extraList).size !== extraList.length) return false;  // 干扰互异
  if (extraList.some(v => need[v])) return false;                  // 干扰 ∉ answer 像（§0.40）
  return true;
}
