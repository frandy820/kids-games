/* ================= fruitsplit 纯引擎：确定性关卡生成 + 五模式判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   r7 难度改造（AUDIT-56 #11）：切分无对错→全部模式真判定——
   pick   辨识一半（三态卡：整个/一半/一大一小陷阱——"一半"= 等分两块之一，非随便一块）
   choose 等分选择（n=2/3/4 人按人数选切法：halves/thirds/quarters 正确，unfair/wrongN 干扰）
   fair   公平判断（展示等大或一大一小，判断公平/不公平；不公平答对→重切演出）
   cut    切两半（手感保留）→ 判公平（真判定：切完必须点对"公平"才推进）
   match  拼合（半块配对，保留）
   章难度：dch1 [pick,cut,choose,cut,pick] / dch2 [fair,cut,fair,choose,fair]（fair 双态 T,F,T 或 F,T,F）
           dch3 [choose,fair,choose,cut,choose]（人数 3/4）/ dch4 五模式各一洗牌
   生成关（flat≥20）同通道：难度章号 (ch-1)%4+1 循环取材 */
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
/* 进度章号单调递增（与 keyOf/写档一致，杜绝生成关软锁）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 每关 5 题的模式/参数序列（rnd 流顺序固定 → 确定性）
   dch1 对半 / dch2 公平判断（fair 公平+不公平双态都出现）/ dch3 三四等分 / dch4 五模式各一洗牌 */
function modeSpecs(dch, rnd) {
  if (dch === 1) return [
    { mode: 'pick' }, { mode: 'cut' }, { mode: 'choose', parts: 2 },
    { mode: 'cut' }, { mode: 'pick' }];
  if (dch === 2) {
    const f0 = rnd() < 0.5;                        // fair 双态交替：T,F,T 或 F,T,F（两种都出现）
    return [
      { mode: 'fair', fair: f0 }, { mode: 'cut' },
      { mode: 'fair', fair: !f0 }, { mode: 'choose', parts: 2 },
      { mode: 'fair', fair: f0 }];
  }
  if (dch === 3) {
    const lastP = rnd() < 0.5 ? 3 : 4;             // 第三道 choose 人数（3/4 都稳定出现）
    const f = rnd() < 0.5;
    return [
      { mode: 'choose', parts: 3 }, { mode: 'fair', fair: f },
      { mode: 'choose', parts: 4 }, { mode: 'cut' },
      { mode: 'choose', parts: lastP }];
  }
  const seq = shuffled(['pick', 'choose', 'fair', 'cut', 'match'], rnd);
  return seq.map(m => ({ mode: m,
    parts: m === 'choose' ? ri(rnd, 2, 4) : 0,
    fair: m === 'fair' ? rnd() < 0.5 : true }));
}

/* ---------- 单题生成（rnd 同流保证确定性；lastKind=避免与上一题同水果连出）
   kind 池：pick/match→DCH_KINDS[dch]；choose/fair/cut→eqKindsOf(dch)（等分切法池） */
function pickKind(pool, rnd, lastKind) {
  let kind = pool[Math.floor(rnd() * pool.length)];
  for (let t = 0; t < 8 && lastKind != null && kind === lastKind; t++) {
    kind = pool[Math.floor(rnd() * pool.length)];
  }
  return kind;
}
function genOne(dch, qi, rnd, lastKind, spec) {
  const eq = spec.mode === 'choose' || spec.mode === 'fair' || spec.mode === 'cut';
  const pool = eq ? eqKindsOf(dch) : DCH_KINDS[dch];
  const kind = pickKind(pool, rnd, lastKind);
  const base = { mode: spec.mode, kind: kind, wrong: [], _miss: 0, seed: 0, solved: false };

  if (spec.mode === 'pick') {
    /* 辨识：2 选 1（整个 vs 一半，dch1 前两题）→ 3 选 1（整个/一半/一大一小陷阱）
       —— 陷阱态升级（r7）：旧"切开拼回"改为"一大一小"，半=等分概念（不是随便一块） */
    const nOpt = dch === 1 && qi < 2 ? 2 : 3;
    const states = nOpt === 2 ? ['whole', 'half'] : ['whole', 'half', 'uneven'];
    const cards = shuffled(states.map(s => ({ state: s })), rnd);
    const answerIdx = cards.findIndex(c => c.state === 'half');
    const options = cards.map(c => ({
      kind: kind, state: c.state,
      side: c.state === 'half' ? (rnd() < 0.5 ? 'L' : 'R') : null
    }));
    return Object.assign(base, { nOpt: nOpt, given: null, options: options,
      answerIdx: answerIdx, cutDone: false });
  }
  if (spec.mode === 'choose') {
    /* 等分选择：n 人 → 正确切法 cutForN(n)；干扰 = unfair（一大一小）+ wrongCutForN(n)（份数不对） */
    const n = spec.parts;
    const cuts = shuffled([cutForN(n), 'unfair', wrongCutForN(n)], rnd);
    return Object.assign(base, { parts: n, given: null,
      options: cuts.map(c => ({ cut: c })),
      answerIdx: cuts.indexOf(cutForN(n)), nOpt: 3, cutDone: false });
  }
  if (spec.mode === 'fair') {
    /* 公平判断：展示 spans（公平=[180,180] 等大 / 不公平=[120,240] 一大一小）；
       答案 = 与展示一致的按钮（公平展示→"公平"，不公平展示→"不公平"） */
    const isFair = !!spec.fair;
    const opts = shuffled([{ fair: true }, { fair: false }], rnd);
    return Object.assign(base, { fairIsFair: isFair, spans: fairSpans(isFair),
      given: { kind: kind, side: null },
      options: opts, answerIdx: opts.findIndex(o => o.fair === isFair), nOpt: 2, cutDone: false });
  }
  if (spec.mode === 'cut') {
    /* 切两半 → 判公平（两段）：knife 阶段点刀（engCut→'judge'）→ judging 阶段点按钮
       （engPick；两半等大恒公平 → answerIdx=judgeOpts 中"公平"按钮，位置随机防位置记忆） */
    const judge = shuffled([{ fair: true }, { fair: false }], rnd);
    return Object.assign(base, { given: { kind: kind, side: null }, options: [],
      judgeOpts: judge, answerIdx: judge.findIndex(o => o.fair === true),
      nOpt: 2, cutDone: false, judging: false });
  }
  /* match 拼合：给左半（L），候选 3 半块；正确=同款右半（R），干扰=不同水果半块（kind 互异） */
  const others = shuffled(pool.filter(k => k !== kind), rnd).slice(0, 2);
  const opts = shuffled([
    { kind: kind, side: 'R' },
    { kind: others[0], side: rnd() < 0.5 ? 'L' : 'R' },
    { kind: others[1], side: rnd() < 0.5 ? 'L' : 'R' }
  ], rnd);
  return Object.assign(base, { given: { kind: kind, side: 'L' }, options: opts,
    answerIdx: opts.findIndex(o => o.kind === kind), nOpt: 3, cutDone: false });
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const specs = modeSpecs(dch, rnd);               // 先抽序列（rnd 流稳定）
  const quizzes = [];
  let lastKind = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, lastKind, specs[qi]);
    q.seed = (flat * 5 + qi) * 7919 + 13;
    lastKind = q.kind;
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 答题引擎（无 DOM，pick/choose/fair/match + cut 判定段共用）：i = 选项下标
   'right' 答对推进 / 'done' 最后一题答对通关 / 'wrong' 首次点错（该选项灰掉、计重试）
   'again' 点已灰选项 / null 非法、cut 刀阶段（未切先判）或关卡已结束 ---------- */
function engPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  let opts;
  if (q.mode === 'cut') {                          // 切分题：判定段才可点（刀阶段走 engCut）
    if (!q.judging) return null;
    opts = q.judgeOpts;
  } else opts = q.options;
  if (i < 0 || i >= opts.length) return null;
  if (i === q.answerIdx) {
    q.solved = true;
    if (q.mode === 'cut') q.judging = false;       // 判定完成（cutDone 保持 true）
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  if (q.wrong.indexOf(i) >= 0) return 'again';
  q.wrong.push(i);
  L.retries++;
  return 'wrong';
}
/* ---------- 切分引擎（无 DOM）：'judge' 切完进入判公平阶段（r7 真判定——不再"切了就算过"）
   0 = 本题已切过（重按早退） / null 非法、非切分题或关卡已结束 ---------- */
function engCut(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.mode !== 'cut') return null;
  if (q.cutDone) return 0;
  q.cutDone = true;
  q.judging = true;
  return 'judge';
}
const engWon = L => !!L && L.done;
/* 星级：一关全对（retries=0）=3 星；总重试 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用，按模式分支；dch=难度章号定 kind 池） ---------- */
function structOk(q, dch) {
  if (!q || typeof q.mode !== 'string') return false;
  if (q.cutDone !== false) return false;           // 生成期恒未切
  const eqPool = eqKindsOf(dch), allPool = DCH_KINDS[dch];
  if (q.mode === 'pick') {
    if (q.options.length !== q.nOpt || (q.nOpt !== 2 && q.nOpt !== 3)) return false;
    const halves = q.options.filter(o => o.state === 'half');
    if (halves.length !== 1 || q.options[q.answerIdx].state !== 'half') return false;
    const states = q.options.map(o => o.state);
    for (let i = 0; i < states.length; i++)
      for (let j = i + 1; j < states.length; j++) if (states[i] === states[j]) return false;
    if (q.nOpt === 3 && states.indexOf('uneven') < 0) return false;   // 3 选 1 必含一大一小陷阱
    return q.options.every(o => o.kind === q.kind && allPool.indexOf(o.kind) >= 0);
  }
  if (q.mode === 'choose') {
    if (q.options.length !== 3) return false;
    if ([2, 3, 4].indexOf(q.parts) < 0 || eqPool.indexOf(q.kind) < 0) return false;
    const cuts = q.options.map(o => o.cut);
    for (let i = 0; i < cuts.length; i++) {
      if (!CUTS[cuts[i]]) return false;
      for (let j = i + 1; j < cuts.length; j++) if (cuts[i] === cuts[j]) return false;
    }
    if (q.options[q.answerIdx].cut !== cutForN(q.parts)) return false;   // 答案=份数匹配的等分
    if (cuts.indexOf('unfair') < 0) return false;                        // 必含非等分陷阱
    if (cuts.indexOf(wrongCutForN(q.parts)) < 0) return false;           // 必含份数不对干扰
    return true;
  }
  if (q.mode === 'fair') {
    if (q.options.length !== 2) return false;
    if (eqPool.indexOf(q.kind) < 0 || typeof q.fairIsFair !== 'boolean') return false;
    if (q.options[0].fair === q.options[1].fair) return false;
    const spans = q.spans || [];
    const want = fairSpans(q.fairIsFair);
    if (spans.length !== 2 || spans[0] !== want[0] || spans[1] !== want[1]) return false;
    return q.options[q.answerIdx].fair === q.fairIsFair;   // 答案=与展示一致
  }
  if (q.mode === 'cut') {
    if (q.options.length !== 0 || q.judging !== false) return false;
    if (eqPool.indexOf(q.kind) < 0) return false;
    if (q.judgeOpts.length !== 2 || q.judgeOpts[0].fair === q.judgeOpts[1].fair) return false;
    return q.judgeOpts[q.answerIdx].fair === true;         // 两半等大恒公平 → 答案=公平按钮
  }
  /* match：3 候选 kind 全互异（干扰 ≠ 正确半块同款）；正确=同款另一侧 */
  if (q.options.length !== 3) return false;
  if (!q.given || q.given.kind !== q.kind || q.given.side !== 'L') return false;
  const kinds = q.options.map(o => o.kind);
  for (let i = 0; i < kinds.length; i++)
    for (let j = i + 1; j < kinds.length; j++) if (kinds[i] === kinds[j]) return false;
  const okOpt = q.options[q.answerIdx];
  return !!okOpt && okOpt.kind === q.kind && okOpt.side === 'R' &&
    kinds.every(k => allPool.indexOf(k) >= 0);
}
