/* ================= conserve 纯引擎：确定性关卡生成 + 三文字卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 59)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH28 §0.69/§3；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 数一数直接比：rows 无变换（spread 恒 0），same（等量）+ add（差 1）混出
     dch2 间距变换：rows 变换（right.spread=1），same+add 混出
     dch3 倒水+橡皮泥：family 掷 pour/clay（无离散数），same+add 混出
           （add=右杯再倒一点 / 右条再切一块——视觉增量明显）
     dch4 生成混合：family 掷三族，same+add 混出
   数量域：rows base ∈ [5,7]；add 变更侧 n=base±1（等量或恒差 1，不平）。
   add 语义：addSide=-1 左侧变更 / +1 右侧变更；rows delta=±1（加/拿走）；
     pour add 恒 addSide=+1, delta=+1（右杯倒入→右边多）；clay add 恒 addSide=+1,
     delta=-1（右条切走→左边多）。same 恒 addSide=0。
   生成关（flat≥20）：每关随机章参数 dch=ri(1,4)（先取数保确定性——b25 坑④ verify 钩子直读）。
   铁律：每关 same 与 add 混出（≥1 each，全 5 翻 1 保混合——防恒答一样多策略性通过）；
     候选 3 卡恒全摆（封闭集=全集）；相邻题（family+kind+base+addSide+delta）互异。 */
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

/* ---------- 每关题序表 {family, kind, base, addSide, delta}（genLevel 预生成；rnd 同流保确定性）
   same/add 混出：掷 ×5 标记，<1 same 或 <1 add 补足；全 5 翻 1（保混合）；
   相邻题互异（key 五元组重掷 ≤8 兜底）；flat0 题0 锚定 rows/same/base5（教学演示锚点） */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  const keyOfSpec = s => s.family + ':' + s.kind + ':' + s.base + ':' + s.addSide + ':' + s.delta;
  const pickDiff = (pool, prev) => {
    let s = pool[Math.floor(rnd() * pool.length)];
    for (let g = 0; g < 8 && keyOfSpec(s) === prev; g++) s = pool[Math.floor(rnd() * pool.length)];
    return s;
  };
  /* 家族池：dch1/dch2=rows；dch3=pour|clay；dch4=三族 */
  const famPool = dch === 1 || dch === 2 ? ['rows']
                : dch === 3 ? ['pour', 'clay']
                : FAMS3;
  const mk = () => {
    const family = famPool[Math.floor(rnd() * famPool.length)];
    const kind = rnd() < 0.5 ? 'same' : 'add';
    const base = ri(rnd, 5, 7);
    let addSide = 0, delta = 0;
    if (kind === 'add') {
      if (family === 'rows') { addSide = rnd() < 0.5 ? -1 : 1; delta = rnd() < 0.5 ? 1 : -1; }
      else { addSide = 1; delta = family === 'pour' ? 1 : -1; }
    }
    return { family: family, kind: kind, base: base, addSide: addSide, delta: delta };
  };
  let specs = [];
  for (let qi = 0; qi < CH_LEN; qi++) specs.push(mk());
  /* same/add 混出（每关 ≥1 each） */
  let nSame = specs.filter(s => s.kind === 'same').length;
  if (nSame === 0) { specs[0] = Object.assign({}, specs[0], { kind: 'same', addSide: 0, delta: 0 }); nSame = 1; }
  else if (nSame === CH_LEN) { specs[1] = Object.assign({}, specs[1], { kind: 'add' }); }
  /* 重生成 add 缺口参数（翻牌后 addSide/delta 需按 family 补齐） */
  specs = specs.map(s => {
    if (s.kind === 'add' && s.addSide === 0 && s.delta === 0) {
      if (s.family === 'rows') return Object.assign({}, s, { addSide: rnd() < 0.5 ? -1 : 1, delta: rnd() < 0.5 ? 1 : -1 });
      return Object.assign({}, s, { addSide: 1, delta: s.family === 'pour' ? 1 : -1 });
    }
    return s;
  });
  /* flat0 题0 锚点：rows/same/base5（教学「两边一样多」演示锚） */
  if (flat === 0) specs[0] = { family: 'rows', kind: 'same', base: 5, addSide: 0, delta: 0 };
  /* 相邻题互异 */
  let prev = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    let s = specs[qi], pk = prev && keyOfSpec(prev);
    for (let g = 0; g < 8 && keyOfSpec(s) === pk; g++) {
      s = mk();
      if (s.kind === 'add' && s.family !== 'rows') { s.addSide = 1; s.delta = s.family === 'pour' ? 1 : -1; }
      specs[qi] = s;
    }
    prev = specs[qi];
  }
  return specs;
}

/* ---------- 单题构建：left/right（变更后题面所见）→ 洗牌 3 文字卡 + answer 下标
   rows：left.n=base（恒基侧），right.n=base（same）/base±delta（add 按 addSide 落位）；
         spread：dch1 恒 0（无变换），dch2/dch4 rows 题 right.spread=1（变换后拉开）。
   pour/clay：n=1 占位（无离散数）；same addSide=0，add addSide=+1。
   候选 3 卡=封闭集全集（恒全摆）洗牌；answer=answerText 在 opts 中的下标 */
function buildQuiz(spec, dch, rnd) {
  let nL, nR, spread;
  if (spec.family === 'rows') {
    nL = spec.base; nR = spec.base;
    if (spec.kind === 'add') {
      if (spec.addSide < 0) nL = spec.base + spec.delta;
      else nR = spec.base + spec.delta;
    }
    spread = dch === 1 ? 0 : 1;
  } else {
    nL = 1; nR = 1; spread = 0;
  }
  /* 答案文案独立推导（verify 用 SPEC 表复算同口径） */
  let ansText;
  if (spec.kind === 'same') ansText = '一样多';
  else if (spec.family === 'rows') ansText = nL > nR ? '左边的多' : '右边的多';
  else ansText = spec.family === 'pour' ? '右边的多' : '左边的多';
  const order = shuffled(OPT_TEXTS, rnd);
  const opts = order.map(t => ({ id: 't:' + t, text: t }));
  let answer = -1;
  for (let j = 0; j < opts.length; j++) if (opts[j].text === ansText) answer = j;
  return { kind: spec.kind, family: spec.family, base: spec.base,
           delta: spec.delta,
           left: { n: nL, spread: spread }, right: { n: nR, spread: spread },
           addSide: spec.kind === 'add' ? spec.addSide : 0,
           opts: opts, answer: answer, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 rows/same/base5（§3 教学演示锚点——specSeqOf flat===0 分支保确定性） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 59);
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
   null    非法下标或关卡已结束 ---------- */
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
/* 星级（§0.69 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标（=q.answer，独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 /
   数量域 / same-add 混出 / 候选全集与答案自洽 / 相邻题互异 / flat0q0 锚点 / 初始态干净 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  if (FAMS3.indexOf(q.family) < 0) return 'family';
  if (q.kind !== 'same' && q.kind !== 'add') return 'kind';
  const isAnchor = flat === 0 && qi === 0;              // 教学演示题（两边一样多）锚点
  if (isAnchor && (q.family !== 'rows' || q.kind !== 'same' || q.base !== 5)) return 'anchor';
  if (dch === 1 && q.family !== 'rows') return 'dch1fam';       // ch1 恒 rows 无变换
  if (dch === 1 && (q.left.spread !== 0 || q.right.spread !== 0)) return 'dch1spread';
  if (dch === 2 && q.family !== 'rows') return 'dch2fam';       // ch2 恒 rows 间距变换
  if (dch === 2 && q.right.spread !== 1) return 'dch2spread';
  if (dch === 3 && q.family === 'rows') return 'dch3fam';       // ch3 恒 pour|clay
  if (q.family === 'rows') {
    if (q.base < 5 || q.base > 7) return 'baseRange';           // 数量域 5-7
    if (q.kind === 'same') {
      if (q.left.n !== q.base || q.right.n !== q.base) return 'sameN';
      if (Math.abs(q.left.n - q.right.n) !== 0) return 'sameDiff';
    } else {
      if (Math.abs(q.left.n - q.right.n) !== 1) return 'addDiff';   // add 恒差 1（不平）
      if (q.addSide !== (q.left.n !== q.base ? -1 : 1)) return 'addSide';
    }
  } else {
    if (q.left.n !== 1 || q.right.n !== 1) return 'nPh';        // pour/clay n=1 占位
    if (q.kind === 'add' && (q.addSide !== 1 || q.delta !== (q.family === 'pour' ? 1 : -1))) return 'addPh';
    if (q.kind === 'same' && q.addSide !== 0) return 'sameSide0';
  }
  if (q.kind === 'same' && q.addSide !== 0) return 'sameSide';
  if (q.opts.length !== 3) return 'len';
  const texts = q.opts.map(o => o.text);
  if (texts.slice().sort().join() !== OPT_TEXTS.slice().sort().join()) return 'optSet';   // 3 卡恒全摆
  if (q.answer < 0 || q.answer > 2 || texts[q.answer] === texts[(q.answer + 1) % 3]) return 'ansIdx';
  if (prevQ && prevQ.family === q.family && prevQ.kind === q.kind && prevQ.base === q.base &&
      prevQ.addSide === q.addSide && prevQ.delta === q.delta) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
