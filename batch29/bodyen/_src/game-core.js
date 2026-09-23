/* ================= bodyen 纯引擎：确定性关卡生成 + 四卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 71)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R41-BODYEN §R2/§R3；进度章号单调递增、难度章号 dch=1+flat//5 静态四档）：
     dch1 hear 5 连（真值域 ALL24——全库听力曝光起步）
     dch2 see 5 连（真值域 ALL24；真值∈近形族 ⇒ 族干扰必在场——ch2 起近形近音干扰律）
     dch3 混出+近形：kind 逐题掷 hear/see（全同翻 1 保两种题型在场）；真值域=NEAR20，
          族干扰必在场
     dch4 混合+动词指令：qi1/qi3 恒 do（动词=VERBS[家族内 do 序号 % 5]——结构性均匀，
          触摸动词取 deck 词为部位、动作动词固定短语），其余 qi hear/see 混出（全同翻 1）
          +真值∈NEAR20 族干扰在场
   r41 词覆盖结构性保证（r32 deckOf 范式）：章族牌库 deck=shuffled(域, mulberry32(dch×104729+41))
   独立种子流；族内第 idx 关取 5 连位段（idx×5+qi 回绕）——ch1/ch2 静态 5 关 25 位段 ≥24=
   ALL24 全覆盖，ch3 静态 5 关 25 位段 ≥20=NEAR20 全覆盖（verify/pycheck 机检）。
   flat0 题0 锚定 hear/eye（教学「听英语点身体」演示锚点：幽灵手指点 eye 图卡）。
   铁律：候选恒 4 互异含真值；相邻题（kind:verb:ask）互异；ch2+ 真值∈NEAR20 ⇒ 近形族干扰
   必在场；do 题=单步判定（r25 M2）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 章参数（纯函数）：dchOf 只耗生成器第 1 掷（与 genLevel 首掷同流同位）；
   familyIdx=同 dch 族内关序（deck 段位用）——对 [0,flat) 逐关复算 dchOf，O(flat) 纯函数 */
function dchOf(flat) {
  if (flat < STATIC_LEVELS) return diffOfCh(chOfFlat(flat));
  return ri(mulberry32(flat * 7919 + 71), 1, 4);
}
function familyIdx(flat, dch) {
  let n = 0;
  for (let p = 0; p < flat; p++) if (dchOf(p) === dch) n++;
  return n;
}
/* 章族牌库（r32 deckOf 范式）：族独立种子流（不耗题内 rnd），域按章：dch1/2=ALL24、
   dch3/4=NEAR20（ch3+ 真值域=有族词） */
const DOM_OF = dch => (dch >= 3 ? NEAR20 : WORDS24);
const deckOf = dch => shuffled(DOM_OF(dch), mulberry32(dch * 104729 + 41));

/* ---------- 每关题序表 {kind, verb?, ask}（genLevel 预生成；rnd 同流保确定性）
   dch4 do 槽动词=VERBS[(2×idx+槽序) % 5]（qi1 槽序 0/qi3 槽序 1）——族内 do 计数
   结构性均匀（10 关 20 do → 每动词恰 4 次，verify/pycheck 精确断言）；
   touch 部位=deck 词（NEAR20 域），动作动词 ask=verb 本身；
   混出=非 do 题全同翻 1（dch3/dch4 每关 hear+see 都在场）；
   相邻题互异（kind:verb:ask 重掷 ≤8 兜底——deck 段内互异，结构上永不触发） */
function specSeqOf(dch, rnd, flat) {
  const dom = DOM_OF(dch), deck = deckOf(dch), len = deck.length;
  const idx = familyIdx(flat, dch);
  const keyOfSpec = s => s.kind === 'do' ? 'do:' + s.verb + ':' + s.ask : s.kind + ':' + s.ask;
  const coin = () => rnd() < 0.5 ? 'hear' : 'see';
  const pick = pool => pool[Math.floor(rnd() * pool.length)];
  const kindOf = () => dch === 1 ? 'hear' : dch === 2 ? 'see' : coin();
  let specs = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    if (dch === 4 && (qi === 1 || qi === 3)) {
      const verb = VERBS[(2 * idx + (qi === 1 ? 0 : 1)) % VERBS.length];
      specs.push({ kind: 'do', verb: verb, ask: verb === 'touch' ? deck[(idx * 5 + qi) % len] : verb });
    } else {
      specs.push({ kind: kindOf(), ask: deck[(idx * 5 + qi) % len] });
    }
  }
  if (dch >= 3) {                                   // 混出：非 do 题全同翻 1（每关两种题型在场）
    const hs = specs.filter(s => s.kind !== 'do');
    const nH = hs.filter(s => s.kind === 'hear').length;
    if (hs.length > 0 && (nH === 0 || nH === hs.length)) {
      for (let i = 0; i < specs.length; i++) {
        if (specs[i].kind !== 'do') { specs[i].kind = nH === 0 ? 'hear' : 'see'; break; }
      }
    }
  }
  if (flat === 0) specs[0] = { kind: 'hear', ask: 'eye' };   // 教学演示锚点：听 eye 点 eye 图卡
  let prev = null;                                  // 相邻题互异（kind:verb:ask）
  for (let qi = 0; qi < CH_LEN; qi++) {
    let s = specs[qi], pk = prev && keyOfSpec(prev);
    for (let g = 0; g < 8 && keyOfSpec(s) === pk; g++) {
      s = s.kind === 'do'
        ? { kind: 'do', verb: s.verb, ask: s.verb === 'touch' ? pick(dom, rnd) : s.verb }
        : { kind: kindOf(), ask: pick(dom, rnd) };
      specs[qi] = s;
    }
    prev = specs[qi];
  }
  return specs;
}

/* ---------- 单题构建：候选恒 4 = 真值 +（ch2+ 真值∈NEAR20 首族干扰必在场）+ 随机补齐
   → 洗牌 + answer 下标（答案位均匀——r39-bis 分布断言口径）
   hear 题 opts=图卡 {id:'p:<en>', part}（小兔高亮该部位迷你图）；
   see 题 opts=词卡 {id:'w:<en>', text}（英语单词文字）；
   do-touch 题 opts=动作卡 {id:'t:<en>', part}（小兔高亮+爪标摸部位）；
   do-action 题 opts=动作卡 {id:'a:<verb>', verb}（四动作图标卡=拍拍手/摇摇头/跺跺脚/挥挥手） */
function buildQuiz(spec, dch, rnd) {
  const order = [], opts = [];
  let answer = -1;
  if (spec.kind === 'do') {
    if (spec.verb === 'touch') {
      const picks = [spec.ask];
      if (NEAR[spec.ask].length) picks.push(NEAR[spec.ask][0]);   // 部位∈NEAR20（deck 域）⇒ 族干扰必在场
      const others = shuffled(WORDS24.filter(w => picks.indexOf(w) < 0), rnd);
      for (const w of others) { if (picks.length >= 4) break; picks.push(w); }
      order.push.apply(order, shuffled(picks, rnd));
      for (let j = 0; j < order.length; j++) if (order[j] === spec.ask) answer = j;
      for (const w of order) opts.push({ id: 't:' + w, part: w });
    } else {
      order.push.apply(order, shuffled(['clap', 'shake', 'stomp', 'wave'], rnd));
      for (let j = 0; j < order.length; j++) if (order[j] === spec.verb) answer = j;
      for (const v of order) opts.push({ id: 'a:' + v, verb: v });
    }
  } else {
    const picks = [spec.ask];
    if (dch >= 2 && NEAR[spec.ask].length) picks.push(NEAR[spec.ask][0]);   // ch2 起近形近音干扰律
    const others = shuffled(WORDS24.filter(w => picks.indexOf(w) < 0), rnd);
    for (const w of others) { if (picks.length >= 4) break; picks.push(w); }
    order.push.apply(order, shuffled(picks, rnd));
    for (let j = 0; j < order.length; j++) if (order[j] === spec.ask) answer = j;
    for (const w of order) opts.push(spec.kind === 'hear'
      ? { id: 'p:' + w, part: w }
      : { id: 'w:' + w, text: w });
  }
  return { kind: spec.kind, ask: spec.ask, verb: spec.verb, opts: opts, answer: answer,
           _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 hear/eye（§1 教学演示锚点） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 71);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张候选卡（opts 数组下标）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束（do 题同单步判定——r25 M2） ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (i === q.answer) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.70 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标（=q.answer，独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 / do 结构 /
   近形在场 / 候选互异含真值 / answer 自洽 / 相邻题互异 / flat0q0 锚点 / 初始态干净 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  if (q.kind !== 'hear' && q.kind !== 'see' && q.kind !== 'do') return 'kind';
  const keyOfQ = k => k.kind === 'do' ? 'do:' + k.verb + ':' + k.ask : k.kind + ':' + k.ask;
  const isAnchor = flat === 0 && qi === 0;         // 教学演示题（听 eye 点 eye）锚点
  if (isAnchor && (q.kind !== 'hear' || q.ask !== 'eye')) return 'anchor';
  if (dch === 1 && q.kind !== 'hear') return 'dch1kind';     // ch1 恒 hear
  if (dch === 2 && q.kind !== 'see') return 'dch2kind';      // ch2 恒 see
  if (dch === 4 && ((qi === 1 || qi === 3) !== (q.kind === 'do'))) return 'dch4slot';  // qi1/qi3 恒 do
  if (q.opts.length !== 4) return 'len';
  if (q.kind === 'do') {
    if (VERBS.indexOf(q.verb) < 0) return 'verb';
    if (q.verb === 'touch') {                       // 触摸题：4 部位动作卡互异含真值+族干扰
      if (WORDS24.indexOf(q.ask) < 0) return 'ask';
      if (dch >= 4 && NEAR20.indexOf(q.ask) < 0) return 'doAsk20';   // dch4 deck 域=NEAR20
      const vals = q.opts.map(o => o.part);
      for (const v of vals) if (WORDS24.indexOf(v) < 0) return 'optWord';
      if (new Set(vals).size !== 4) return 'optDup';
      if (vals[q.answer] !== q.ask) return 'ansIdx';
      if (dch >= 2 && NEAR[q.ask].length && !NEAR[q.ask].some(n => vals.indexOf(n) >= 0)) return 'nearMiss';
    } else {                                        // 动作题：ask=verb、四动作卡恰全集
      if (q.ask !== q.verb) return 'actAsk';
      const vs = q.opts.map(o => o.verb);
      if (vs.indexOf('touch') >= 0 || new Set(vs).size !== 4) return 'optAct';
      if (q.opts[q.answer].verb !== q.ask) return 'ansIdx';
    }
  } else {
    if (WORDS24.indexOf(q.ask) < 0) return 'ask';
    const vals = q.opts.map(o => q.kind === 'hear' ? o.part : o.text);
    for (const v of vals) if (WORDS24.indexOf(v) < 0) return 'optWord';   // 候选恒 ∈ 封闭 24
    if (new Set(vals).size !== 4) return 'optDup';            // 4 卡互异
    if (q.answer < 0 || q.answer > 3) return 'ansRange';
    if (vals[q.answer] !== q.ask) return 'ansIdx';             // answer=真值卡下标
    if (dch >= 2 && NEAR[q.ask].length && !NEAR[q.ask].some(n => vals.indexOf(n) >= 0))
      return 'nearMiss';                                       // ch2+ 真值∈族 ⇒ 族干扰在场
    if (dch >= 3 && NEAR20.indexOf(q.ask) < 0) return 'dch3ask'; // ch3+ 真值∈NEAR20
  }
  if (prevQ && keyOfQ(prevQ) === keyOfQ(q)) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
