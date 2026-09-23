/* ================= animalmenu 纯引擎 v2（r11 难度改造）：确定性关卡生成 + 点选/提交判定
   （无 DOM，UI 与 verify 共用）。种子 = mulberry32(flat * 7919 + 313)（本批常量 313，
   SPEC-BATCH31 §0.76 定版，r11 沿用）：同 flat 永远同关（重玩一致、verify 可检）。
   章型（§0.76 r11；进度章号单调递增、难度章号 dch=1+flat//5 静态四档，生成关 seeded 1-4）：
     dch1 findfood/findwho 两族混出 ×5 · 恒 4 候选（题域=配对封闭 8；全同翻 1 保两族在场）
     dch2 multifood ×5（洗牌 ANIMALS10 取 5 互异）· 4 候选 · 勾选+「点好啦」提交
        （need=MULTI[动物] 恰 2 件；干扰 ⊆ DISTRACT_OK[动物]∖need 公平表恰 2）
     dch3 dietclass ×5（洗牌 ANIMALS10 取 5，补换保每关 ≥1 肉食+≥1 草食）· 3 盘候选
        （opts=PLATES 洗牌，answer=DIET_PLATE[DIET[动物]] 下标）
     dch4 chaindir ×5（CHAIN_PREY 动物-动物取 2+其余取 3 洗牌——每关 ≥2 对真方向判定）
        · 2 候选（出示序=seeded 洗牌，answer=eater 下标）
   flat0 题0 锚定 findfood/rabbit（教学「看兔子点胡萝卜」演示锚点，候选 4）。
   铁律：候选互异含全部真值 ⊆对应集（findfood=食物 8/findwho=动物 8/multifood=食物 15
   ∩DISTRACT_OK∪need/dietclass=三盘全/dchain=对成员）；干扰恰 n-|need|；相邻题（kind:签名）互异。 */
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
/* 提交制题型（判定在 engSubmit；点卡=勾选切换零惩罚）——multifood */
const isSubmitKind = k => k === 'multifood';

/* ---------- 每关题序表 {kind, pair/animal/chain}（genLevel 预生成，rnd 同流保确定性）
   dch1 逐题掷 findfood/findwho+随机对（ANIMALS8）；dch2/3 洗牌 ANIMALS10 取 5（互异
   →相邻互异天然成立；dch3 采样后补换保 ≥1 肉食+≥1 草食）；dch4=CHAIN_PREY 取 2+
   非猎物对取 3 洗牌（5 对互异+≥2 动物-动物）；相邻 (kind:签名) 互异兜底重掷 ≤8 ---------- */
function specSeqOf(dch, rnd, flat) {
  const coin = () => rnd() < 0.5 ? 'findfood' : 'findwho';
  const pick8 = () => ANIMALS8[Math.floor(rnd() * ANIMALS8.length)];
  const specKey = s => s.kind + ':' + (s.pair || s.animal || (s.chain ? s.chain.eater + '>' + s.chain.eaten : ''));
  let specs = [];
  if (dch === 1) {
    if (flat === 0) specs.push({ kind: 'findfood', pair: 'rabbit' });   // 教学锚先行（防全同翻位撞锚）
    for (let qi = specs.length; qi < CH_LEN; qi++) specs.push({ kind: coin(), pair: pick8() });
    const nF = specs.filter(s => s.kind === 'findfood').length;      // 混出：全同翻 1（每关两族在场；
    if (nF === 0) specs[0].kind = 'findfood';                        // flat0 锚已保 findfood 在场）
    else if (nF === CH_LEN) specs[flat === 0 ? 1 : 0].kind = 'findwho';   // flat0 翻位 1（位 0=教学锚不动）
  } else if (dch === 2) {
    shuffled(ANIMALS10, rnd).slice(0, CH_LEN).forEach(a => specs.push({ kind: 'multifood', animal: a }));
  } else if (dch === 3) {
    let pool = shuffled(ANIMALS10, rnd).slice(0, CH_LEN);             // 采样后补换：≥1 肉食+≥1 草食
    const hasMeat = () => pool.some(a => DIET[a] === 'meat');
    const hasGrass = () => pool.some(a => DIET[a] === 'grass');
    const swapIn = want => {                                         // 换入一个 want 类动物（非样本内）
      const cands = ANIMALS10.filter(a => DIET[a] === want && pool.indexOf(a) < 0);
      if (!cands.length) return;
      const rep = pool.filter(a => DIET[a] === 'mix');                // 只换出冗余杂食（保两类都在）
      if (!rep.length) return;
      pool[pool.indexOf(rep[Math.floor(rnd() * rep.length)])] = cands[Math.floor(rnd() * cands.length)];
    };
    if (!hasMeat()) swapIn('meat');
    if (!hasGrass()) swapIn('grass');
    pool.forEach(a => specs.push({ kind: 'dietclass', animal: a }));
  } else {
    const prey = shuffled(CHAIN_PREY, rnd).slice(0, 2);               // 每关 ≥2 对动物-动物（真方向判定）
    const rest = shuffled(CHAIN.filter(p => CHAIN_PREY.indexOf(p) < 0), rnd).slice(0, CH_LEN - 2);
    specs = prey.concat(rest);                                        // 5 对互异（表内无重复对）
    specs = shuffled(specs, rnd);
    specs = specs.map(p => ({ kind: 'chaindir', chain: p }));
  }
  /* flat===0 恒 dch1（教学锚已在 dch1 分支内置位 0）——无跨分支锚替换 */
  const oneSpec = k =>                                               // 按 kind 精确构造（单一参数键，防签名键污染）
    k === 'findfood' || k === 'findwho' ? { kind: k, pair: pick8() } :
    k === 'multifood' ? { kind: k, animal: ANIMALS10[Math.floor(rnd() * ANIMALS10.length)] } :
    k === 'dietclass' ? { kind: k, animal: ANIMALS10[Math.floor(rnd() * ANIMALS10.length)] } :
                        { kind: k, chain: CHAIN[Math.floor(rnd() * CHAIN.length)] };
  const retryKinds = dch === 1 ? ['findfood', 'findwho'] :
                     dch === 2 ? ['multifood'] :
                     dch === 3 ? ['dietclass'] : ['chaindir'];
  let prev = null;                                                   // 相邻题互异（kind:签名）
  for (let qi = 0; qi < CH_LEN; qi++) {
    let s = specs[qi], pk = prev && specKey(prev);
    for (let g = 0; g < 8 && specKey(s) === pk; g++) {
      s = oneSpec(retryKinds[Math.floor(rnd() * retryKinds.length)]);
      specs[qi] = s;
    }
    prev = specs[qi];
  }
  return specs;
}

/* ---------- 单题构建（候选+干扰公平性；洗牌 + answer/need 语义）
   findfood：ask=动物 8，need=[PAIRS8 对]，候选 ⊆FOODS8 恒 4（真值+3 干扰）
   findwho：ask=食物 8，need=[animalOf]，候选 ⊆ANIMALS8 恒 4
   multifood：ask=动物 10，need=MULTI[动物]（2 件），候选=need+干扰 2 ⊆DISTRACT_OK∖need，
             answer=-1（提交制），picked=[]
   dietclass：ask=动物 10，need=[DIET_PLATE[DIET[动物]]]，候选=PLATES 洗牌 3 盘
   chaindir：pair=[eater,eaten]（CHAIN 行），出示序洗牌 2 卡，answer=eater 下标 ---------- */
function buildQuiz(spec, rnd) {
  let ask = null, pair = null, need = [], answer = -1, picks = [];
  if (spec.kind === 'findfood' || spec.kind === 'findwho') {
    const isFood = spec.kind === 'findfood';
    const truth = isFood ? PAIRS8[spec.pair] : spec.pair;
    ask = isFood ? spec.pair : PAIRS8[spec.pair];
    need = [truth];
    const pool = isFood ? FOODS8 : ANIMALS8;
    picks = [truth].concat(shuffled(pool.filter(x => x !== truth), rnd).slice(0, 3));
  } else if (spec.kind === 'multifood') {
    ask = spec.animal;
    need = MULTI[ask].slice();
    picks = need.concat(shuffled(DISTRACT_OK[ask].filter(x => need.indexOf(x) < 0), rnd).slice(0, 2));
  } else if (spec.kind === 'dietclass') {
    ask = spec.animal;
    need = [DIET_PLATE[DIET[ask]]];
    picks = PLATES.slice();                                          // 三盘全出示（洗牌定序）
  } else {                                                           // chaindir
    pair = [spec.chain.eater, spec.chain.eaten];
    need = [spec.chain.eater];
    picks = pair.slice();
  }
  const order = shuffled(picks, rnd);
  const opts = order.map(x => ({ anim: x }));
  if (!isSubmitKind(spec.kind)) {
    answer = -1;
    for (let j = 0; j < order.length; j++) if (order[j] === need[0]) answer = j;
  }
  const q = { kind: spec.kind, ask: ask, opts: opts, need: need, answer: answer,
              picked: [], _miss: 0, _answered: false };
  if (pair) q.pair = pair.slice();                                   // chaindir：[eater, eaten] 规范序（钩子对账）
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 findfood/rabbit（§1 教学演示锚点） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 313);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张候选卡（opts 数组下标）
   单答案题型（findfood/findwho/dietclass/chaindir）即时判定：
     'right' 答对且本题完成推进 / 'done' 答对且末题=通关
     'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   提交题型（multifood）：点卡=勾选切换（判定在 engSubmit）：
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

/* ---------- 提交引擎（multifood「点好啦」；iftrain v2/weather v2 先例）：
   'right' 勾选集==need 推进 / 'done' 末题提交成=通关
   'wrong_more' 勾选含非 need 件（漏选外多选/选错件）：清空重选 + miss+1（真实错误路径）
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
/* 星级（§0.76 r11 口径）：全关错选/多选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
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
   候选互异含全部真值 ⊆对应集 / 干扰恰 n-|need| 且公平 / answer 自洽 / 相邻互异 /
   flat0q0 锚点 / 初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  const KINDS = ['findfood', 'findwho', 'multifood', 'dietclass', 'chaindir'];
  if (KINDS.indexOf(q.kind) < 0) return 'kind';
  const vals = q.opts.map(o => o.anim);
  const isAnchor = flat === 0 && qi === 0;         // 教学演示题（兔子点胡萝卜）锚点
  if (isAnchor && (q.kind !== 'findfood' || q.ask !== 'rabbit')) return 'anchor';
  if (dch === 1 && (q.kind !== 'findfood' && q.kind !== 'findwho')) return 'dch1';
  if (dch === 2 && q.kind !== 'multifood') return 'dch2';
  if (dch === 3 && q.kind !== 'dietclass') return 'dch3';
  if (dch === 4 && q.kind !== 'chaindir') return 'dch4';
  /* 候选长度：pair=4 / multifood=4 / dietclass=3 / chaindir=2 */
  const wantLen = q.kind === 'dietclass' ? 3 : q.kind === 'chaindir' ? 2 : 4;
  if (vals.length !== wantLen) return 'optLen';
  if (new Set(vals).size !== vals.length) return 'optDup';          // 候选互异
  /* ask/pair 域 + need 真值独立推导（按题型对封闭表） */
  let expNeed = null, pool = null;
  if (q.kind === 'findfood') {
    if (ANIMALS8.indexOf(q.ask) < 0) return 'askAnimal';
    expNeed = [PAIRS8[q.ask]]; pool = FOODS8;
  } else if (q.kind === 'findwho') {
    if (FOODS8.indexOf(q.ask) < 0) return 'askFood';
    expNeed = [animalOf(q.ask)]; pool = ANIMALS8;
  } else if (q.kind === 'multifood') {
    if (ANIMALS10.indexOf(q.ask) < 0) return 'askAnimal10';
    expNeed = MULTI[q.ask].slice(); pool = FOODS15;
  } else if (q.kind === 'dietclass') {
    if (ANIMALS10.indexOf(q.ask) < 0) return 'askAnimal10';
    expNeed = [DIET_PLATE[DIET[q.ask]]]; pool = PLATES;
    if (vals.slice().sort().join() !== PLATES.slice().sort().join()) return 'plateSet';   // 三盘全出示
  } else {
    if (!q.pair || q.pair.length !== 2) return 'chainPair';
    const hit = CHAIN.filter(p => p.eater === q.pair[0] && p.eaten === q.pair[1]);
    if (!hit.length) return 'chainPair';                            // 对 ∈ CHAIN 表（表外不出题）
    expNeed = [q.pair[0]]; pool = [q.pair[0], q.pair[1]];
  }
  for (const v of vals) if (pool.indexOf(v) < 0) return 'optPool';  // 候选恒 ∈ 对应集
  if (!expNeed || q.need.length !== expNeed.length ||
      expNeed.some(x => q.need.indexOf(x) < 0)) return 'needTruth';
  for (const x of expNeed) if (vals.indexOf(x) < 0) return 'optTruth';   // 含全部真值
  const inters = vals.filter(v => expNeed.indexOf(v) < 0);              // 干扰=去真值，恰 n-|need|
  if (inters.length !== vals.length - expNeed.length) return 'distract';
  /* 干扰公平性（r11）：multifood 干扰 ⊆ DISTRACT_OK[ask]（半有效排除） */
  if (q.kind === 'multifood') {
    for (const v of inters) if (DISTRACT_OK[q.ask].indexOf(v) < 0) return 'fairBan';
  }
  /* answer 自洽（单答案题型=真值卡下标；提交型=-1） */
  if (isSubmitKind(q.kind)) { if (q.answer !== -1) return 'ansSubmit'; }
  else {
    if (q.answer < 0 || q.answer >= vals.length) return 'ansRange';
    if (vals[q.answer] !== q.need[0]) return 'ansIdx';
  }
  const sig = q.kind + ':' + (q.pair ? q.pair.join('>') : q.ask);
  const psig = prevQ ? prevQ.kind + ':' + (prevQ.pair ? prevQ.pair.join('>') : prevQ.ask) : null;
  if (psig && psig === sig) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  if (q.kind === 'multifood' && q.picked.length !== 0) return 'initPick';
  return null;
}
