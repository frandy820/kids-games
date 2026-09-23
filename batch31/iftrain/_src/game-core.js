/* ================= iftrain 纯引擎 v2（r3 难度改造）：确定性关卡生成 + 点选/提交判定
   （无 DOM，UI 与 verify 共用）。种子 = mulberry32(flat * 7919 + 617)（本款常量 617，
   SPEC-BATCH31 §0.77 定版，v2 沿用）：同 flat 永远同关（重玩一致、verify 可检）。
   章型（§0.77 v2；进度章号单调递增、难度章号 dch=1+flat//5 静态四档，生成关 seeded 1-4）：
     dch1 single ×5 · 恒 4 候选（真值+SECONDARY 近义+2 随机）——查表但同域近义干扰
     dch2 multi ×5（COMBOS 全 5 行洗牌）· 4 候选 · 勾选+提交（交集思维）
     dch3 best×3（6 sit 取 3）+ conflict×2（3 行取 2）· 4 候选（双装备+优先级）
     dch4 五型各 1（single/multi/best/conflict/ruleback 洗牌）——反向题混入
   flat0 题0 锚定 single/rain（教学「下雨带雨伞」演示锚点，候选 4）。
   铁律（候选恒 4）：互异、含全部真值（need ⊆ opts）、⊆装备集（ruleback ⊆情境集）；
   干扰公平性——single 恒含 SECONDARY[sit] / multi 干扰 ∉ need∪SECONDARY[conds] /
   conflict 恒含 tempt 且干扰 ∉ {gear,tempt,SECONDARY[key]} / ruleback 干扰 ∉ valid_sits；
   相邻题（kind:签名）互异。 */
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
/* 提交制题型（判定在 engSubmit；点卡=勾选切换零惩罚） */
const isSubmitKind = k => k === 'multi' || k === 'best';

/* ---------- 每关题序表 {kind, sit?/combo?/cf?/gear?}（genLevel 预生成，rnd 同流保确定性）
   dch1 洗牌 SITS6 取 5（互异→相邻互异天然成立）；dch2 COMBOS 全 5 行洗牌；
   dch3 best 6 取 3 + conflict 3 取 2，标签交错 seeded 洗牌；dch4 五型各 1 洗牌；
   相邻 (kind:签名) 互异兜底重掷 ≤8 ---------- */
function specSeqOf(dch, rnd, flat) {
  let specs = [];
  if (dch === 1) {
    let sits = shuffled(SITS6, rnd).slice(0, CH_LEN);
    if (flat === 0) {                              // 教学锚：rain 恒在位 0 且全组互异
      const at = sits.indexOf('rain');
      if (at < 0) sits[0] = 'rain';                // 换入（被换 sit 本就不在 5 内，无重复）
      else if (at > 0) { sits.splice(at, 1); sits.unshift('rain'); }
    }
    sits.forEach(s => specs.push({ kind: 'single', sit: s }));
  } else if (dch === 2) {
    shuffled(IF_COMBOS, rnd).forEach(c => specs.push({ kind: 'multi', combo: c.id }));
  } else if (dch === 3) {
    const bests = shuffled(SITS6, rnd).slice(0, 3);
    const cfs = shuffled(IF_CONFLICTS, rnd).slice(0, 2).map(c => c.id);
    const tags = shuffled([0, 0, 0, 1, 1], rnd);               // 0=best / 1=conflict 交错
    let bi = 0, ci = 0;
    tags.forEach(t => { specs.push(t === 0 ? { kind: 'best', sit: bests[bi++] }
                                           : { kind: 'conflict', cf: cfs[ci++] }); });
  } else {
    const kinds = shuffled(['single', 'multi', 'best', 'conflict', 'ruleback'], rnd);
    kinds.forEach(k => specs.push(
      k === 'single' ? { kind: k, sit: SITS6[Math.floor(rnd() * 6)] } :
      k === 'multi' ? { kind: k, combo: IF_COMBOS[Math.floor(rnd() * IF_COMBOS.length)].id } :
      k === 'best' ? { kind: k, sit: SITS6[Math.floor(rnd() * 6)] } :
      k === 'conflict' ? { kind: k, cf: IF_CONFLICTS[Math.floor(rnd() * IF_CONFLICTS.length)].id } :
                         { kind: k, gear: GEARS6[Math.floor(rnd() * 6)] }));
  }
  if (flat === 0) specs[0] = { kind: 'single', sit: 'rain' };   // 教学演示锚点（上方已保证互异）
  const sigOf = s => s.kind + ':' + (s.sit || s.combo || s.cf || s.gear || '');
  const anyOf = a => a[Math.floor(rnd() * a.length)];
  const oneSpec = k =>                              // 按 kind 精确构造（单一参数键，防签名键污染）
    k === 'single' ? { kind: k, sit: anyOf(SITS6) } :
    k === 'multi' ? { kind: k, combo: anyOf(IF_COMBOS).id } :
    k === 'best' ? { kind: k, sit: anyOf(SITS6) } :
    k === 'conflict' ? { kind: k, cf: anyOf(IF_CONFLICTS).id } :
                       { kind: k, gear: anyOf(GEARS6) };
  const retryKinds = dch === 1 ? ['single'] : dch === 2 ? ['multi'] :
                     dch === 3 ? ['best', 'conflict'] :
                     ['single', 'multi', 'best', 'conflict', 'ruleback'];
  let prev = null;                                  // 相邻题互异（kind:签名）
  for (let qi = 0; qi < CH_LEN; qi++) {
    let s = specs[qi], pk = prev && sigOf(prev);
    for (let g = 0; g < 8 && sigOf(s) === pk; g++) {
      s = oneSpec(anyOf(retryKinds));
      specs[qi] = s;
    }
    prev = specs[qi];
  }
  return specs;
}

/* ---------- 单题构建（候选恒 4 + 干扰公平性规则；洗牌 + answer 下标）
   返回 {kind, conds[](正向=出示情境), ask(ruleback=装备), opts[{anim}]×4,
        need[](single-answer=1 / multi·best=2), answer(单答案题型=真值下标，提交型=-1),
        key(conflict 回锚情境), tempt(conflict 诱惑装备), picked[], _miss, _answered} ---------- */
function buildQuiz(spec, rnd) {
  let conds = [], ask = null, need = [], answer = -1, key = null, tempt = null;
  let picks = [];
  if (spec.kind === 'single') {
    conds = [spec.sit];
    need = [IF_PRIMARY[spec.sit]];
    const near = IF_SECONDARY[spec.sit];                        // 同域近义干扰恒在（§0.77 v2）
    picks = [need[0], near].concat(shuffled(GEARS6.filter(g => g !== need[0] && g !== near), rnd).slice(0, 2));
  } else if (spec.kind === 'multi') {
    const cb = IF_COMBOS.find(c => c.id === spec.combo);
    conds = cb.conds.slice(); need = cb.need.slice();
    const ban = need.concat(conds.map(c => IF_SECONDARY[c]));  // 半有效干扰排除（公平性）
    picks = need.concat(shuffled(GEARS6.filter(g => ban.indexOf(g) < 0), rnd).slice(0, 2));
  } else if (spec.kind === 'best') {
    conds = [spec.sit];
    need = [IF_PRIMARY[spec.sit], IF_SECONDARY[spec.sit]];
    picks = need.concat(shuffled(GEARS6.filter(g => need.indexOf(g) < 0), rnd).slice(0, 2));
  } else if (spec.kind === 'conflict') {
    const cf = IF_CONFLICTS.find(c => c.id === spec.cf);
    conds = cf.conds.slice(); need = [cf.gear]; key = cf.key; tempt = cf.tempt;
    const ban = [cf.gear, cf.tempt, IF_SECONDARY[cf.key]];     // 诱惑恒在+半有效排除
    picks = [cf.gear, cf.tempt].concat(shuffled(GEARS6.filter(g => ban.indexOf(g) < 0), rnd).slice(0, 2));
  } else {                                                     // ruleback（反向）
    ask = spec.gear; need = [IF_INV[spec.gear]];
    const valid = validSitsOf(spec.gear);
    picks = [need[0]].concat(shuffled(SITS6.filter(s => valid.indexOf(s) < 0), rnd).slice(0, 3));
  }
  const order = shuffled(picks, rnd);
  const opts = order.map(x => ({ anim: x }));
  if (!isSubmitKind(spec.kind)) {
    answer = -1;
    for (let j = 0; j < order.length; j++) if (order[j] === need[0]) answer = j;
  }
  return { kind: spec.kind, conds: conds, ask: ask, opts: opts, need: need,
           answer: answer, key: key, tempt: tempt,
           picked: [], _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 single/rain（§2 教学演示锚点） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 617);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张候选卡（opts 数组下标）
   单答案题型（single/conflict/ruleback）即时判定：
     'right' 答对且本题完成推进 / 'done' 答对且末题=通关
     'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   提交题型（multi/best）：点卡=勾选切换（判定在 engSubmit）：
     'pick' 勾选 / 'unpick' 取消勾选（零惩罚）
   null    非法下标或关卡已结束 ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (isSubmitKind(q.kind)) {
    const p = q.picked.indexOf(i);
    if (p >= 0) { q.picked.splice(p, 1); return 'unpick'; }
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

/* ---------- 提交引擎（multi/best「带好啦」；weather v2/bubble r1 先例）：
   'right' 勾选集==need 推进 / 'done' 末题提交成=通关
   'wrong_more' 勾选含非 need 件（多点/选错件）：清空重选 + miss+1（真实错误路径）
   'wrong_less' 勾选 ⊂ need 且未选满：保留勾选继续找（合法路径不算 miss）
   null 关卡已结束 / 单答案题型不适用 ---------- */
function engSubmit(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || !isSubmitKind(q.kind)) return null;
  const ids = q.picked.map(i => q.opts[i].anim);
  for (let k = 0; k < ids.length; k++) {
    if (q.need.indexOf(ids[k]) < 0) {
      q.picked = [];
      q._miss++;
      L.retries++;
      return 'wrong_more';
    }
  }
  if (ids.length < q.need.length) return 'wrong_less';
  q._answered = true;
  L.step++;
  if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
  return 'right';
}
const engWon = L => !!L && L.done;
/* 星级（§0.77 口径，v2 沿用）：全关错选/多点 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 救援/教学帮指用：单答案题=真值卡下标；提交题=未勾选的 need 卡（勾满=-1 指提交钮） */
function nextNeededIdx(q) {
  if (!q) return -1;
  if (!isSubmitKind(q.kind)) {
    for (let i = 0; i < q.opts.length; i++) if (q.opts[i].anim === q.need[0]) return i;
    return -1;
  }
  for (let i = 0; i < q.opts.length; i++) {
    if (q.need.indexOf(q.opts[i].anim) >= 0 && q.picked.indexOf(i) < 0) return i;
  }
  return -1;                                       // 勾满 → 调用方 breathe 提交钮
}
/* 兼容别名（UI/教学沿用旧名）：当前题正确卡下标 */
const correctIdx = q => nextNeededIdx(q);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表真值 / 章型规则 /
   候选恒 4 互异含全部真值 ⊆对应集 / 干扰公平性 / answer 自洽 / 相邻互异 / 锚点 / 初始态 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  const KINDS = ['single', 'multi', 'best', 'conflict', 'ruleback'];
  if (KINDS.indexOf(q.kind) < 0) return 'kind';
  const isApply = q.kind !== 'ruleback';
  const vals = q.opts.map(o => o.anim);
  /* ask/conds 域 */
  if (isApply) {
    const cs = q.conds || [];
    const want = q.kind === 'multi' || q.kind === 'conflict' ? 2 : 1;
    if (cs.length !== want) return 'condsLen';
    for (const c of cs) if (SITS6.indexOf(c) < 0) return 'condsSit';
  } else if (GEARS6.indexOf(q.ask) < 0) return 'askGear';
  const isAnchor = flat === 0 && qi === 0;         // 教学演示题（下雨带雨伞）锚点
  if (isAnchor && (q.kind !== 'single' || q.conds[0] !== 'rain' || q.need[0] !== 'umbrella')) return 'anchor';
  if (dch === 1 && q.kind !== 'single') return 'dch1';
  if (dch === 2 && q.kind !== 'multi') return 'dch2';
  if (dch === 3 && q.kind !== 'best' && q.kind !== 'conflict') return 'dch3';
  if (q.opts.length !== 4) return 'optLen';        // 候选恒 4（含 ch1——§0.77 v2）
  const pool = isApply ? GEARS6 : SITS6;
  for (const v of vals) if (pool.indexOf(v) < 0) return 'optPool';   // 候选恒 ∈ 对应集
  if (new Set(vals).size !== vals.length) return 'optDup';           // 候选互异
  /* need 真值独立推导（按题型对表） */
  let expNeed = null;
  if (q.kind === 'single') expNeed = [IF_PRIMARY[q.conds[0]]];
  else if (q.kind === 'multi') {
    const cb = IF_COMBOS.find(c => c.conds.join() === q.conds.slice().join());
    expNeed = cb ? cb.need.slice() : null;
  } else if (q.kind === 'best') expNeed = [IF_PRIMARY[q.conds[0]], IF_SECONDARY[q.conds[0]]];
  else if (q.kind === 'conflict') {
    const cf = IF_CONFLICTS.find(c => c.conds.join() === q.conds.slice().join());
    expNeed = cf ? [cf.gear] : null;
  } else expNeed = [IF_INV[q.ask]];
  if (!expNeed || q.need.length !== expNeed.length ||
      expNeed.some(x => q.need.indexOf(x) < 0)) return 'needTruth';
  for (const x of expNeed) if (vals.indexOf(x) < 0) return 'optTruth';   // 含全部真值
  const inters = vals.filter(v => expNeed.indexOf(v) < 0);              // 干扰=去真值，恰 4-|need|
  if (inters.length !== 4 - expNeed.length) return 'distract';
  /* 干扰公平性（§0.77 v2） */
  if (q.kind === 'single' && inters.indexOf(IF_SECONDARY[q.conds[0]]) < 0) return 'nearMiss';  // 近义恒在
  if (q.kind === 'conflict') {
    const cf = IF_CONFLICTS.find(c => c.conds.join() === q.conds.slice().join());
    if (!cf || vals.indexOf(cf.tempt) < 0) return 'temptMiss';           // 诱惑恒在
    if (inters.indexOf(IF_SECONDARY[cf.key]) >= 0) return 'temptBan';    // key 次配不作干扰
  }
  if (q.kind === 'multi') {
    const ban = q.conds.map(c => IF_SECONDARY[c]);
    for (const b of ban) if (inters.indexOf(b) >= 0) return 'multiBan';  // 半有效排除
  }
  if (q.kind === 'ruleback') {
    const valid = validSitsOf(q.ask);
    for (const v of inters) if (valid.indexOf(v) >= 0) return 'backInvalid';  // 反向干扰 ∉ valid
  }
  /* answer 自洽（单答案题型=真值卡下标；提交型=-1） */
  if (isSubmitKind(q.kind)) { if (q.answer !== -1) return 'ansSubmit'; }
  else {
    if (q.answer < 0 || q.answer >= 4) return 'ansRange';
    if (vals[q.answer] !== q.need[0]) return 'ansIdx';
  }
  const sig = q.kind + ':' + (q.conds ? q.conds.join() : q.ask);
  const psig = prevQ ? prevQ.kind + ':' + (prevQ.conds ? prevQ.conds.join() : prevQ.ask) : null;
  if (psig && psig === sig) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
