/* ================= babylove 纯引擎：确定性关卡生成 + 四题型多步判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 87)（本批常量 87，SPEC-BATCH30 §0.73 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   章型（r10 五章；进度章号单调递增、难度章号 dch=1+flat//5 静态五档）：
     dch1 findmom 3 连小问 · 4 候选（12 对池——量扩根治「第 2 章见底」）
     dch2 两族混出（kind 逐题掷 findmom/findbaby，全同翻 1 保两族在场）· 近形干扰
     dch3 grow 发育链三段序（6 链轮出：卵→幼→成逐点点选，已点卡 done 淡化）
     dch4 habitat 生境×发育双维（2×2 干扰：同境异段/异境同段/双异 各恰 1）
     dch5 四型混出（每关 ≥3 不同型，翻样保多样）
   flat≥25 生成关 dch=ri(1,5)（burn 先取数保确定性）。
   每题=3 步/小问（r10 时长结构）：tapOpt 返回 'step'（步完成非题尾——storybed 先例）
   /'right'（题完成非末题）/'done'（末题完成）/'wrong'（步错：miss+1 卡不灰可重选）/null。
   flat0 题0 锚定 findmom/tadpole 第 1 小问（教学「看蝌蚪点青蛙」演示锚点）。
   铁律：候选互异含真值 ⊆对应集（findmom=成体集/findbaby=幼体集）；配对干扰=随机异对
   恰 3；dch≥2 幼体候选（findbaby）真值有近形伴时干扰必含伴恰 1 位（CONFUSABLE）；
   habitat 四卡 (hab 对错 × stage 对错) 恰 2×2 唯一组合；grow 卡池=链三阶段全量乱序；
   相邻题（kind:ask 串）互异。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号五章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 5 + 1;

/* ---------- 每关题序表（genLevel 预生成；rnd 同流保确定性）
   配对题 pairs=3 互异幼体 id（题内小问动物互异）；grow 题 chain=链 id；
   habitat 题 hab=生境 id（3 小问同境 want 变化，两种 want 在场）。
   dch4 habs=洗牌 HABITATS 取 5（每生境 ≥1）；dch3 chains=洗牌取 5（互异链）；
   dch5 kind 逐题掷四型 + 翻样（每关 ≥3 不同型）；相邻题（kind:ask 串）互异 ≤8 兜底 ---------- */
function specSeqOf(dch, rnd, flat) {
  const kinds = () => {
    if (dch === 1) return 'findmom';
    if (dch === 2) return rnd() < 0.5 ? 'findmom' : 'findbaby';
    if (dch === 3) return 'grow';
    if (dch === 4) return 'habitat';
    const K4 = ['findmom', 'findbaby', 'grow', 'habitat'];
    return K4[Math.floor(rnd() * 4)];
  };
  const pick3 = () => shuffled(BABIES6, rnd).slice(0, 3);       // 题内 3 小问动物互异
  let specs = [];
  if (dch === 3) {
    const cs = shuffled(GROWTH_CHAINS, rnd).slice(0, 5);        // 5 题互异链
    for (const c of cs) specs.push({ kind: 'grow', chain: c });
  } else if (dch === 4) {
    const hs = shuffled(HABITATS, rnd);                          // 3 生境垫底
    while (hs.length < 5) hs.push(hs[hs.length % 3]);            // 补 2（每生境 ≥1）
    for (const h of hs) specs.push({ kind: 'habitat', hab: h });
  } else if (dch === 5) {
    const K4 = ['findmom', 'findbaby', 'grow', 'habitat'];
    for (let qi = 0; qi < 5; qi++) {
      const k = K4[Math.floor(rnd() * 4)];
      if (k === 'grow') specs.push({ kind: 'grow', chain: GROWTH_CHAINS[Math.floor(rnd() * GROWTH_CHAINS.length)] });
      else if (k === 'habitat') specs.push({ kind: 'habitat', hab: HABITATS[Math.floor(rnd() * 3)] });
      else specs.push({ kind: k, pairs: pick3() });
    }
    let uniq = new Set(specs.map(s => s.kind));                   // 翻样：每关 ≥3 不同型
    let g2 = 0;
    while (g2++ < 8) {
      const miss = ['findmom', 'findbaby', 'grow', 'habitat'].filter(k => !uniq.has(k))[0];
      if (!miss) break;
      const at = ri(rnd, 0, 4);
      if (miss === 'grow') specs[at] = { kind: 'grow', chain: GROWTH_CHAINS[Math.floor(rnd() * GROWTH_CHAINS.length)] };
      else if (miss === 'habitat') specs[at] = { kind: 'habitat', hab: HABITATS[Math.floor(rnd() * 3)] };
      else specs[at] = { kind: miss, pairs: pick3() };
      uniq = new Set(specs.map(s => s.kind));                    // 替换后重算（防顶掉唯一型回退）
    }
  } else {
    for (let qi = 0; qi < 5; qi++) specs.push({ kind: kinds(), pairs: pick3() });
    if (dch === 2) {                                            // 混出：全同翻 1（两族在场）
      const nM = specs.filter(s => s.kind === 'findmom').length;
      if (nM === 0) specs[0] = { kind: 'findmom', pairs: pick3() };
      else if (nM === 5) specs[0] = { kind: 'findbaby', pairs: pick3() };
    }
  }
  if (flat === 0) specs[0] = { kind: 'findmom', pairs: ['tadpole'].concat(shuffled(BABIES6.filter(b => b !== 'tadpole'), rnd).slice(0, 2)) };
  const specKey = s => s.kind + ':' + (s.kind === 'grow' ? s.chain : s.kind === 'habitat' ? s.hab : s.pairs.join(','));
  let prev = null;                                              // 相邻题互异（kind:ask 串）
  for (let qi = 0; qi < specs.length; qi++) {
    let s = specs[qi], pk = prev && specKey(prev);
    for (let g = 0; g < 8 && specKey(s) === pk; g++) {
      const k = kinds();
      if (k === 'grow') s = { kind: 'grow', chain: GROWTH_CHAINS[Math.floor(rnd() * GROWTH_CHAINS.length)] };
      else if (k === 'habitat') s = { kind: 'habitat', hab: HABITATS[Math.floor(rnd() * 3)] };
      else s = { kind: k, pairs: pick3() };
      specs[qi] = s;
    }
    prev = specs[qi];
  }
  return specs;
}

/* ---------- 单步候选构建：真值 + 干扰补齐 → 洗牌 + answer 下标
   findmom：ask=幼体 id，真值=PAIRS6[ask]（成体），候选 ⊆成体集
   findbaby：ask=成体 id，真值=babyOf(ask)（幼体），候选 ⊆幼体集；
     dch≥2 且真值有近形伴 → 干扰必含伴恰 1 位（其余 2 随机异对） ---------- */
function pairOpts(ask, isMom, dch, rnd) {
  const truth = isMom ? PAIRS6[ask] : babyOf(ask);
  const pool = isMom ? ADULTS6 : BABIES6;
  const picks = [truth];
  if (!isMom && dch >= 2 && CONFUSABLE[truth]) picks.push(CONFUSABLE[truth]);   // 近形伴（r10）
  const others = shuffled(pool.filter(x => picks.indexOf(x) < 0), rnd);
  for (const x of others) { if (picks.length >= 4) break; picks.push(x); }
  const order = shuffled(picks, rnd);
  let answer = -1;
  for (let j = 0; j < order.length; j++) if (order[j] === truth) answer = j;
  return { opts: order.map(x => ({ anim: x })), answer: answer };
}

/* ---------- habitat 小问构建（r10 双维）：四卡 (hab 对错 × stage 对错) 恰 2×2
   真值=hab+want 命中；dSame=同境异段 / dStage=异境同段 / dBoth=双异 各恰 1 ---------- */
function habOpts(hab, want, rnd) {
  const isMom = want === 'mom';
  const ofHab = stagePool => stagePool.filter(a => HAB_OF[a] === hab);
  const notHab = stagePool => stagePool.filter(a => HAB_OF[a] !== hab);
  const allB = BABIES6, allA = ADULTS6;
  const tPool = isMom ? ofHab(allA) : ofHab(allB);              // 真值池（hab+want）
  const samePool = isMom ? ofHab(allB) : ofHab(allA);           // 同境异段
  const stagePool = isMom ? notHab(allA) : notHab(allB);        // 异境同段
  const bothPool = isMom ? notHab(allB) : notHab(allA);         // 双异
  const truth = tPool[Math.floor(rnd() * tPool.length)];
  const pick1 = arr => arr[Math.floor(rnd() * arr.length)];
  const picks = [truth, pick1(samePool.filter(x => x !== truth)), pick1(stagePool), pick1(bothPool)];
  const order = shuffled(picks, rnd);
  let answer = -1;
  for (let j = 0; j < order.length; j++) if (order[j] === truth) answer = j;
  return { opts: order.map(x => ({ anim: x })), answer: answer };
}

/* ---------- 单题构建（每题=3 步/小问）
   配对题 subs=[{ask,opts,answer}×3]（3 小问动物互异同 kind）
   grow 题 {ask=链 id, opts=链三阶段乱序, phase}
   habitat 题 subs=[{hab,want,opts,answer}×3]（同境 want 变化，两种 want 在场） ---------- */
function buildQuiz(spec, dch, rnd) {
  if (spec.kind === 'grow') {
    const chain = GROWTH[spec.chain];
    const order = shuffled(chain, rnd);
    return { kind: 'grow', ask: spec.chain, opts: order.map(x => ({ anim: x })),
             phase: 0, _miss: 0, _answered: false };
  }
  if (spec.kind === 'habitat') {
    let wants = [];
    for (let s = 0; s < 3; s++) wants.push(rnd() < 0.5 ? 'mom' : 'baby');
    if (wants.every(w => w === 'mom')) wants[ri(rnd, 0, 2)] = 'baby';    // 两种 want 在场
    else if (wants.every(w => w === 'baby')) wants[ri(rnd, 0, 2)] = 'mom';
    const subs = [];
    for (let s = 0; s < 3; s++) {
      const o = habOpts(spec.hab, wants[s], rnd);
      subs.push({ hab: spec.hab, want: wants[s], opts: o.opts, answer: o.answer });
    }
    return { kind: 'habitat', ask: spec.hab, subs: subs, si: 0, _miss: 0, _answered: false };
  }
  const isMom = spec.kind === 'findmom';
  const subs = [];
  for (let s = 0; s < spec.pairs.length; s++) {
    const ask = isMom ? spec.pairs[s] : PAIRS6[spec.pairs[s]];
    const o = pairOpts(ask, isMom, dch, rnd);
    subs.push({ ask: ask, opts: o.opts, answer: o.answer });
  }
  return { kind: spec.kind, ask: subs[0].ask, subs: subs, si: 0, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 25 关与生成关同一确定性通道；生成关 flat≥25 每关随机章参数）
   flat0 题0 第 1 小问恒 findmom/tadpole（§1 教学演示锚点） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 87);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 5);      // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 当前步视图（UI/钩子/救援共用）：摊平当前题当前步 ----------
   {kind, ask, want?(habitat), opts, answer, step, substep, miss}
   findmom ask=幼体 id / findbaby ask=成体 id / grow ask=链 id（=成体 id）
   / habitat ask=生境 id（want='mom'|'baby'）；answer=当前步正确卡下标 ---------- */
function quizView(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (q.kind === 'grow') {
    const want = GROWTH[q.ask][q.phase];
    let answer = -1;
    for (let j = 0; j < q.opts.length; j++) if (q.opts[j].anim === want) answer = j;
    return { kind: q.kind, ask: q.ask, opts: q.opts, answer: answer,
             step: L.step, substep: q.phase, miss: q._miss || 0 };
  }
  const sub = q.subs[q.si];
  const v = { kind: q.kind, ask: sub.ask, opts: sub.opts, answer: sub.answer,
              step: L.step, substep: q.si, miss: q._miss || 0 };
  if (q.kind === 'habitat') { v.ask = sub.hab; v.want = sub.want; }
  return v;
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张候选卡（opts 数组下标）
   'step'  步/小问完成但本题未完（substep 推进——r10 新值，storybed 先例）
   'right' 题完成且非末题 / 'done' 末题完成=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  const nSteps = 3;
  if (q.kind === 'grow') {
    const want = GROWTH[q.ask][q.phase];
    const opt = q.opts[i];
    if (!Number.isInteger(i) || i < 0 || !opt) return null;
    if (!q._used) q._used = [];                   // 本题已正确用过的卡（视觉 done 淡化）
    if (q._used.indexOf(i) >= 0) return 'wrong';  // 已点卡再点=wrong 不计 miss（m-2：误触不罚，
                                                  //  storybed §0.74「已点 .done 再点=wrong 同口径」家族定版）
    if (opt.anim !== want) { q._miss++; L.retries++; return 'wrong'; }
    q._used.push(i);
    q.phase++;
    if (q.phase < nSteps) return 'step';
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  const sub = q.subs[q.si];
  if (!sub) return null;
  if (!Number.isInteger(i) || i < 0 || i >= sub.opts.length) return null;
  if (i === sub.answer) {
    q.si++;
    if (q.si < nSteps) return 'step';
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
/* 星级（§0.73 口径承 r10）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前步正确卡下标（quizView 独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : (q.answer !== undefined ? q.answer : -1);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 /
   候选域互异含真值 / answer 自洽 / 干扰构成（配对恰 3·近形·habitat 2×2）/
   grow 链全量 / 相邻题互异 / flat0q0 锚点 / 初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  if (q.kind !== 'findmom' && q.kind !== 'findbaby' && q.kind !== 'grow' && q.kind !== 'habitat') return 'kind';
  const isAnchor = flat === 0 && qi === 0;         // 教学演示题（蝌蚪找妈妈）锚点
  if (isAnchor && (q.kind !== 'findmom' || q.ask !== 'tadpole')) return 'anchor';
  if (dch === 1 && q.kind !== 'findmom') return 'dch1';                    // ch1 恒 findmom
  if (dch === 2 && q.kind !== 'findmom' && q.kind !== 'findbaby') return 'dch2';
  if (dch === 3 && q.kind !== 'grow') return 'dch3';
  if (dch === 4 && q.kind !== 'habitat') return 'dch4';
  if (q._miss !== 0 || q._answered) return 'init';
  const checkStep = (sub, kind) => {
    const isMom = kind === 'findmom';
    if (kind === 'findmom' && BABIES6.indexOf(sub.ask) < 0) return 'askBaby';    // findmom ask=幼体
    if (kind === 'findbaby' && ADULTS6.indexOf(sub.ask) < 0) return 'askAdult';  // findbaby ask=成体
    const pool = isMom ? ADULTS6 : BABIES6;
    const vals = sub.opts.map(o => o.anim);
    if (vals.length !== 4) return 'len4';
    for (const v of vals) if (pool.indexOf(v) < 0) return 'optPool';   // 候选恒 ∈ 对应集
    if (new Set(vals).size !== vals.length) return 'optDup';           // 候选互异
    const truth = isMom ? PAIRS6[sub.ask] : babyOf(sub.ask);           // 真值独立换算
    if (vals.indexOf(truth) < 0) return 'optTruth';                    // 含真值
    if (sub.answer < 0 || sub.answer >= vals.length) return 'ansRange';
    if (vals[sub.answer] !== truth) return 'ansIdx';                   // answer=真值卡下标
    return null;
  };
  if (q.kind === 'grow') {
    if (GROWTH_CHAINS.indexOf(q.ask) < 0) return 'growChain';
    const chain = GROWTH[q.ask];
    const vals = q.opts.map(o => o.anim);
    if (vals.length !== 3) return 'growLen';
    if (new Set(vals).size !== 3) return 'growDup';
    for (const st of chain) if (vals.indexOf(st) < 0) return 'growSet';   // 卡池=链三阶段全量
    if (q.phase !== 0) return 'growPhase';
    const want = chain[0];
    let a = -1;
    for (let j = 0; j < vals.length; j++) if (vals[j] === want) a = j;
    if (a < 0) return 'growAns';                        // 首步正确卡恒在（answer 由 quizView 实算）
  } else if (q.kind === 'habitat') {
    if (HABITATS.indexOf(q.ask) < 0) return 'habAsk';
    const wants = q.subs.map(s => s.want);
    if (new Set(wants).size !== 2) return 'habWantMix';                  // 两种 want 在场
    for (const s of q.subs) {
      if (s.want !== 'mom' && s.want !== 'baby') return 'habWant';
      if (s.hab !== q.ask) return 'habSub';
      const vals = s.opts.map(o => o.anim);
      if (vals.length !== 4 || new Set(vals).size !== 4) return 'habLenDup';
      const sameHab = vals.filter(v => HAB_OF[v] === s.hab);
      const isMom = s.want === 'mom';
      const truthStg = vals.filter(v => (ADULTS6.indexOf(v) >= 0) === isMom);
      if (sameHab.length !== 2 || truthStg.length !== 2) return 'hab2x2'; // (hab×stage) 恰 2×2
      const truth = vals.filter(v => HAB_OF[v] === s.hab && (ADULTS6.indexOf(v) >= 0) === isMom);
      if (truth.length !== 1) return 'habTruth';
      if (s.answer < 0 || vals[s.answer] !== truth[0]) return 'habAns';
      /* r10 裁决：habitat 不设近形干扰位（近形伴与真值同境同段会破坏 2×2 唯一结构——
         近形辨析由 findbaby 承载；异境干扰卡已天然排除同段同境歧义） */
    }
  } else {
    if (!q.subs || q.subs.length !== 3) return 'subLen';
    const asks = q.subs.map(s => s.ask);
    if (new Set(asks).size !== 3) return 'subAskDup';                     // 小问动物互异
    for (const s of q.subs) {
      const why = checkStep(s, q.kind);
      if (why) return why;
      if (q.kind === 'findbaby' && dch >= 2) {                            // 近形伴在场恰 1 位
        const truth = babyOf(s.ask);
        if (CONFUSABLE[truth] && s.opts.map(o => o.anim).indexOf(CONFUSABLE[truth]) < 0) return 'confMiss';
      }
    }
    if (q.si !== 0) return 'si0';
  }
  if (prevQ) {                                    // 相邻题互异（kind + 全步 ask 串——r10 题=3 步，
    const keyOfQ = qq => qq.kind + ':' + (qq.kind === 'habitat' ? qq.ask :   // habitat sub 无 ask 字段：
                                     qq.subs ? qq.subs.map(s => s.ask).join(',') : qq.ask);   // 用 hab（与
    if (keyOfQ(prevQ) === keyOfQ(q)) return 'adjacent';     // specSeqOf 相邻重掷的 specKey 同口径）
  }                                                // 首小问同而二三异=合法复习非重复题
  return null;
}
