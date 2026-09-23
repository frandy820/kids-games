/* ================= senses 纯引擎：确定性关卡生成 + 四族题型判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 421)（本批常量 sen=421，SPEC-BATCH32 §0.76/§6 r11 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   章型（r11 v2：CH_FAMILY 每章 5 题族序定版，q0 恒单选题型；进度章号单调递增、
   难度章号 dch=1+flat//5 静态四档，生成关 flat≥20 dch=ri(1,4)）：
     dch1 [find,multi,find,multi,multi]——find 复习（恒 4 候选两族混出）+multi 多感官全选入门
     dch2 [anti,multi,anti,find,anti]——anti 通感排除主场
     dch3 [anti,multi,comp,multi,anti]——comp 失能代偿引入
     dch4 [comp,multi,anti,comp,find]——四族混出
   铁律（verify/structWhy 双侧独立复算）：
     find——findsense 候选感官互异含真值 ⊆感官 5 恒 4；findthing 候选物品互异含真值 ⊆物品 10
       恒 4 且干扰不含真值同感官另一物（防双真值——每感官至多 1 物在场）；
     multi——候选=感官 5 全集（互异 5 卡），answers=该物感官集下标恰 3，漏选/多选都错；
     anti——ask=感官 S；候选 4 物品卡互异，其中「相关」=THINGS_OF[S] 2 单感官物+1 含 S
       多感官物恰 3，「不相关」恰 1=answer（防双真值：判相关须掌握多感官物感官集）；
     comp——ask=多感官物 m，blocked=其感官之一；候选 4 感官卡=真值 A+被捂 S（诱惑恒在）+
       感官集外恰 2（5-3=2 恒填满）；另一剩余感官 B 禁在场（防双真值——恰 1 可用真值）；
     flat0 题0 锚定 findsense/bell（教学「看闹钟响图点耳朵卡」演示锚点）；
     相邻题（族:题键）互异。 */
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

/* ---------- 每关题序表（genLevel 预生成；r11 章型位序制 CH_FAMILY[dch] 逐位取材，rnd 同流保确定性）
   find 位逐题掷 findsense/findthing+物品；multi 位取多感官物；anti 位取感官；
   comp 位取多感官物+seeded 洗牌其感官集（blocked=洗牌[0]，truth=洗牌[1]——另一剩余禁入候选）；
   flat0 题0 恒 findsense/bell（§1 教学演示锚点）；相邻题互异（族:题键重掷 ≤8 兜底） ---------- */
const specKeyOf = s =>
  s.kind === 'findsense' ? 'fs:' + s.thing :
  s.kind === 'findthing' ? 'ft:' + SENSE_OF[s.thing] :
  s.kind === 'multi' ? 'mu:' + s.mthing :
  s.kind === 'anti' ? 'an:' + s.sense :
  'co:' + s.mthing + ':' + s.blocked;

function specSeqOf(dch, rnd, flat) {
  const coin = () => rnd() < 0.5 ? 'findsense' : 'findthing';
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const compSpec = () => {
    const m = pick(MULTI5), ss = shuffled(MULTI_SENSES[m], rnd);
    return { kind: 'comp', mthing: m, blocked: ss[0], truth: ss[1] };
  };
  const roll = fam => fam === 'find' ? { kind: coin(), thing: pick(THINGS10) } :
      fam === 'multi' ? { kind: 'multi', mthing: pick(MULTI5) } :
      fam === 'anti' ? { kind: 'anti', sense: pick(SENSES5) } : compSpec();
  let specs = CH_FAMILY[dch].map(fam => roll(fam));
  if (flat === 0) specs[0] = { kind: 'findsense', thing: 'bell' };   // 教学演示锚点：闹钟响响点耳朵
  let prev = null;                                  // 相邻题互异（fs 问物/ft 问感官/mu 问物/an 问感官/co 问物+被捂）
  for (let qi = 0; qi < CH_LEN; qi++) {
    let s = specs[qi], pk = prev && specKeyOf(prev);
    for (let g = 0; g < 8 && specKeyOf(s) === pk; g++) {
      s = roll(CH_FAMILY[dch][qi]);
      specs[qi] = s;
    }
    prev = specs[qi];
  }
  return specs;
}

/* ---------- 单题构建（四族；洗牌+answer/answers 自洽）
   find：ask=物品(findsense)/感官(findthing)，候选恒 4；findthing 干扰按「感官已占位」排除
     （每感官至多 1 物在场——防双真值）；
   multi：候选=感官 5 全集洗牌；answers=该物感官集下标升序恰 3；picked=[];
   anti：相关=THINGS_OF[S](2 单感官物)+1 seeded 含 S 多感官物；不相关=seeded 取
     （单感官≠S ∪ 多感官不含 S）池 1 个=answer；
   comp：候选=[truth, blocked, 感官集外 2] 洗牌；answer=truth 下标 ---------- */
function buildQuiz(spec, rnd) {
  if (spec.kind === 'multi') {
    const order = shuffled(SENSES5, rnd);
    const opts = order.map(x => ({ anim: x }));
    const answers = [];
    order.forEach((x, j) => { if (MULTI_SENSES[spec.mthing].indexOf(x) >= 0) answers.push(j); });
    return { kind: 'multi', ask: spec.mthing, opts: opts, answers: answers, answer: -1,
             picked: [], _miss: 0, _answered: false };
  }
  if (spec.kind === 'anti') {
    const S = spec.sense;
    const relMulti = MULTI5.filter(m => MULTI_SENSES[m].indexOf(S) >= 0);
    const rm = relMulti[Math.floor(rnd() * relMulti.length)];
    const unrelPool = THINGS10.filter(t => SENSE_OF[t] !== S)
      .concat(MULTI5.filter(m => MULTI_SENSES[m].indexOf(S) < 0));
    const ur = unrelPool[Math.floor(rnd() * unrelPool.length)];
    const order = shuffled([ur].concat(THINGS_OF[S], [rm]), rnd);
    const opts = order.map(x => ({ anim: x }));
    let answer = -1;
    for (let j = 0; j < order.length; j++) if (order[j] === ur) answer = j;
    return { kind: 'anti', ask: S, opts: opts, answer: answer, _miss: 0, _answered: false };
  }
  if (spec.kind === 'comp') {
    const ms = MULTI_SENSES[spec.mthing];
    const outside = SENSES5.filter(x => ms.indexOf(x) < 0);   // 恰 2（5−3）
    const order = shuffled([spec.truth, spec.blocked, outside[0], outside[1]], rnd);
    const opts = order.map(x => ({ anim: x }));
    let answer = -1;
    for (let j = 0; j < order.length; j++) if (order[j] === spec.truth) answer = j;
    return { kind: 'comp', ask: spec.mthing, blocked: spec.blocked, opts: opts,
             answer: answer, _miss: 0, _answered: false };
  }
  /* ---- find（findsense/findthing，恒 4 候选） ---- */
  const isFS = spec.kind === 'findsense';
  const truth = isFS ? SENSE_OF[spec.thing] : spec.thing;
  const pool = isFS ? SENSES5 : THINGS10;
  const picks = [truth];
  const usedSense = {}; usedSense[SENSE_OF[spec.thing]] = true;   // 真值感官占位（findthing 防双真值）
  const others = shuffled(pool.filter(x => x !== truth), rnd);
  for (const x of others) {
    if (picks.length >= 4) break;
    if (!isFS) {                                 // findthing：感官已占位的物品不入候选
      if (usedSense[SENSE_OF[x]]) continue;
      usedSense[SENSE_OF[x]] = true;
    }
    picks.push(x);
  }
  const order = shuffled(picks, rnd);
  const opts = order.map(x => ({ anim: x }));
  let answer = -1;
  for (let j = 0; j < order.length; j++) if (order[j] === truth) answer = j;
  return { kind: spec.kind, ask: isFS ? spec.thing : SENSE_OF[spec.thing],
           opts: opts, answer: answer, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 findsense/bell（§1 教学演示锚点） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 421);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张候选卡（opts 数组下标）
   单选题型（findsense/findthing/anti/comp）：对 'right'/末题 'done'/错 'wrong'（该题 miss+1，
     retries 全关累计=星级口径，卡不灰可重选——探索不罚）/ null 非法下标或关卡已结束；
   multi：'pick' 勾选 / 'unpick' 取消（零惩罚——勾选不是判定，判定在 engSubmit）/ null 同上 */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (q.kind === 'multi') {
    const at = q.picked.indexOf(i);
    if (at >= 0) { q.picked.splice(at, 1); return 'unpick'; }
    q.picked.push(i);
    return 'pick';
  }
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
/* ---------- multi 提交判定：engSubmit(L) —— 勾选集合 == answers 集合才算对
   'right' 勾满真值且本题完成推进 / 'done' 末题=通关 / 'wrong' 漏选或多选（清空重选，
   该题 miss+1、retries+1——一题多错照计，星级梯度可达）/ false 非提交题型 / null 关卡已结束 */
function engSubmit(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (q.kind !== 'multi') return false;
  const norm = a => a.slice().sort((x, y) => x - y).join(',');
  if (norm(q.picked) === norm(q.answers)) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q.picked = [];                      // 清空重选（把它找全——漏选/多选都错）
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.76 口径承 r11）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：单选题正确卡下标（独立函数供 verify 复核；multi 用 q.answers 数组） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：章型位序 / 四族封闭表与数学先验 /
   answer(s) 自洽 / 防双真值（findthing 同感官对·anti 恰 1 不相关·comp 恰 1 可用真值）/
   相邻题互异 / flat0q0 锚点 / 初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  const fam = familyTok(q.kind);
  if (['find', 'multi', 'anti', 'comp'].indexOf(fam) < 0) return 'kind';
  if (CH_FAMILY[dch][qi] !== fam) return 'chFam';                  // 章型位序（r11 定版）
  if (flat === 0 && qi === 0 && (q.kind !== 'findsense' || q.ask !== 'bell')) return 'anchor';
  if (fam === 'find') {
    const isFS = q.kind === 'findsense';
    if (isFS && THINGS10.indexOf(q.ask) < 0) return 'askThing';    // findsense ask=物品 id
    if (!isFS && SENSES5.indexOf(q.ask) < 0) return 'askSense';    // findthing ask=感官 id
    if (q.opts.length !== 4) return 'findLen';                     // find 恒 4 卡（r11 起含 ch1）
    const pool = isFS ? SENSES5 : THINGS10;
    const vals = q.opts.map(o => o.anim);
    for (const v of vals) if (pool.indexOf(v) < 0) return 'optPool';
    if (new Set(vals).size !== vals.length) return 'optDup';
    let truth = null;
    if (isFS) truth = SENSE_OF[q.ask];
    else {
      const bySense = {};
      for (const v of vals) {
        const s2 = SENSE_OF[v];
        if (bySense[s2]) return 'sensePair';                       // 防双真值：同感官对至多 1 物在场
        bySense[s2] = true;
        if (s2 === q.ask) truth = v;
      }
    }
    if (truth === null || vals.indexOf(truth) < 0) return 'optTruth';
    if (vals[q.answer] !== truth) return 'ansIdx';
  } else if (fam === 'multi') {
    if (MULTI5.indexOf(q.ask) < 0) return 'askMulti';              // ask=多感官物
    const vals = q.opts.map(o => o.anim);
    if (q.opts.length !== SENSES5.length) return 'multiLen';       // 候选=感官 5 全集
    for (const v of vals) if (SENSES5.indexOf(v) < 0) return 'optPool';
    if (new Set(vals).size !== vals.length) return 'optDup';
    const want = MULTI_SENSES[q.ask];
    const truthIdx = [];
    vals.forEach((v, j) => { if (want.indexOf(v) >= 0) truthIdx.push(j); });
    if (truthIdx.length !== want.length) return 'multiTruth';      // 真值恒 3 全在场
    if (q.answers.length !== want.length || normIdx(q.answers) !== normIdx(truthIdx)) return 'multiAns';
    if (q.picked.length !== 0) return 'init';
  } else if (fam === 'anti') {
    if (SENSES5.indexOf(q.ask) < 0) return 'askSense';             // ask=被排除感官 S
    if (q.opts.length !== 4) return 'antiLen';
    const vals = q.opts.map(o => o.anim);
    if (new Set(vals).size !== vals.length) return 'optDup';
    let nRel = 0, truth = null;
    for (const v of vals) {
      const inPool = THINGS10.indexOf(v) >= 0 || MULTI5.indexOf(v) >= 0;
      if (!inPool) return 'optPool';                               // 候选=单感官物∪多感官物
      const rel = (THINGS10.indexOf(v) >= 0 && SENSE_OF[v] === q.ask) ||
                  (MULTI5.indexOf(v) >= 0 && MULTI_SENSES[v].indexOf(q.ask) >= 0);
      if (rel) nRel++;
      else if (truth === null) truth = v;
      else if (v !== truth) return 'antiMulti';                    // 不相关恰 1（防双真值）
    }
    if (nRel !== 3 || truth === null) return 'antiRel';            // 相关恰 3（2 单感官+1 多感官）
    let nS = 0;
    for (const v of vals) if (THINGS10.indexOf(v) >= 0 && SENSE_OF[v] === q.ask) nS++;
    if (nS !== 2) return 'antiSingles';                            // 恒含 S 的 2 个单感官物
    if (vals[q.answer] !== truth) return 'ansIdx';
  } else {                                                          /* ---- comp ---- */
    if (MULTI5.indexOf(q.ask) < 0) return 'askMulti';
    if (SENSES5.indexOf(q.blocked) < 0) return 'blockedSense';
    if (MULTI_SENSES[q.ask].indexOf(q.blocked) < 0) return 'blockedIn';   // 被捂必属该物感官集
    if (q.opts.length !== 4) return 'compLen';
    const vals = q.opts.map(o => o.anim);
    if (new Set(vals).size !== vals.length) return 'optDup';
    const ms = MULTI_SENSES[q.ask];
    let nAvail = 0, nBlocked = 0, nOut = 0, nOther = 0, truth = null;
    for (const v of vals) {
      if (SENSES5.indexOf(v) < 0) return 'optPool';
      if (ms.indexOf(v) >= 0) {
        if (v === q.blocked) { nBlocked++; continue; }             // 诱惑=被捂感官恒在场
        nAvail++;
        if (truth === null) truth = v; else if (v !== truth) nOther++;
      } else nOut++;
    }
    if (nBlocked !== 1) return 'compTempt';                        // 被捂感官恰 1 在场（诱惑恒在）
    if (nAvail !== 1 || nOther > 0) return 'compTruth';            // 可用真值恰 1（另一剩余禁在场）
    if (nOut !== 2) return 'compOut';                              // 感官集外恰 2 填满
    if (vals[q.answer] !== truth) return 'ansIdx';
    if (q.blocked === truth) return 'compSelf';                    // 真值≠被捂
  }
  if (prevQ && specKeyEq(prevQ, q)) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
const normIdx = a => a.slice().sort((x, y) => x - y).join(',');
const specKeyEq = (a, b) => {                                       // 相邻题互异键（引擎侧）
  const ka = a.kind === 'findsense' ? 'fs:' + a.ask :
             a.kind === 'findthing' ? 'ft:' + a.ask :
             a.kind === 'multi' ? 'mu:' + a.ask :
             a.kind === 'anti' ? 'an:' + a.ask : 'co:' + a.ask + ':' + a.blocked;
  const kb = b.kind === 'findsense' ? 'fs:' + b.ask :
             b.kind === 'findthing' ? 'ft:' + b.ask :
             b.kind === 'multi' ? 'mu:' + b.ask :
             b.kind === 'anti' ? 'an:' + b.ask : 'co:' + b.ask + ':' + b.blocked;
  return ka === kb;
};
