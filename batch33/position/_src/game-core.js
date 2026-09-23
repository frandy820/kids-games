/* ================= position 纯引擎：确定性关卡生成 + 方位格点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 977)（本款常量 position=977，SPEC-BATCH33 §0.80 定版
   ——r44 不变）：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R44-POSITION §R2/§R3；进度章号单调递增、难度章号 dch=1+flat//5 静态四档）：
     dch1 findpos 5 连 · 6 方位全域（r44：域 4→6 含左右），兔子初始位高亮 1.2s（入门锚）
     dch2 两族混出（findpos/placepos 逐题掷，全同翻 1 保两族在场）· 6 域
     dch3 dual 主载：qi0=findpos 热身 + qi1-4=shuffled([dual,dual,dual,coin])——dual 恒 3/关
     dch4 flip 主载：qi0=findpos 热身 + qi1-4=shuffled([flip,flip,flip,coin])——flip 恒 3/关
     生成关 flat≥20 每关随机章参数 dch=ri(1,4)（先取数保确定性），按 dch 取上述构成律
   flat0 题0 锚定 findpos/front（教学「看兔子在树前面点前面格」演示锚点——r44 保留）。
   铁律：cells=6 格恒全摆（固定 POS6 序，空间全域可点）；
   findpos：ask=兔子位=bunnyAt，answer=cells 内该格下标；
   placepos：ask=指令目标位 ≠ bunnyAt（当前位，域内随机），answer=目标格下标——
     点错格=wrong 含当前位格（SPEC §0.80 先验：目标≠兔子当前位）；
   dual：combo∈DUAL_COMBOS 封闭表（恰 4），ask=树约束/house=房位/ask2=房约束，
     两约束恒同格（交恒唯一），bunnyAt=null（兔子隐藏——防读图绕过推理），
     answer=树约束格下标；
   flip：ask=兔子说的方位（兔子视角），answer=FLIP_MAP[ask] 格下标（180° 转身映射：
     左右互换/前后互换/上下不变），face='back'（背面态），bunnyAt=域内随机 ≠ 映射格
     （兔子不在答案格——防点兔读图绕过映射）；
   相邻题（specKey）互异。 */
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

/* ---------- 每关题序表 {kind, pos|combo}（genLevel 预生成）
   pos=findpos 兔子位/placepos·flip 指令或问句方位；combo=dual 组合下标 0-3
   dch1 恒 findpos；dch2 逐题掷两族+全同翻 1；dch3/dch4 新题型主载（qi0 恒 findpos 热身
   ——救援腿兼容：14s 方向级重读恒有可解锚）；
   相邻题互异（specKey 重掷 ≤8 兜底，重掷保 kind 只重取 pos/combo——构成律不破坏） ---------- */
function specSeqOf(dch, rnd, flat) {
  const coin = () => rnd() < 0.5 ? 'findpos' : 'placepos';
  const pick = () => POS6[Math.floor(rnd() * POS6.length)];
  const mkDual = () => ({ kind: 'dual', combo: ri(rnd, 0, DUAL_COMBOS.length - 1) });
  const mkFlip = () => ({ kind: 'flip', pos: pick() });
  const mkCoin = () => { const k = coin(); return { kind: k, pos: pick() }; };
  const specKey = s => {
    if (s.kind === 'dual') { const c = DUAL_COMBOS[s.combo]; return 'dual:' + c.tree + '/' + c.houseDir; }
    return s.kind + ':' + s.pos;
  };
  const reroll = s => (s.kind === 'dual' ? mkDual() : s.kind === 'flip' ? mkFlip() : { kind: s.kind, pos: pick() });
  let specs = [];
  if (dch === 1) {                                    // ch1：findpos 5 连（6 域含左右）
    for (let qi = 0; qi < CH_LEN; qi++) specs.push({ kind: 'findpos', pos: pick() });
  } else if (dch === 2) {                             // ch2：两族混出（全同翻 1 保两族在场）
    for (let qi = 0; qi < CH_LEN; qi++) specs.push(mkCoin());
    const nFP = specs.filter(s => s.kind === 'findpos').length;
    if (nFP === 0) specs[0].kind = 'findpos';         // 全 placepos → 题0 翻 findpos
    else if (nFP === CH_LEN) specs[0].kind = 'placepos';   // 全 findpos → 题0 翻 placepos
  } else if (dch === 3) {                             // ch3：dual 主载 3/关（房子双参照复合）
    specs.push({ kind: 'findpos', pos: pick() });
    specs = specs.concat(shuffled([mkDual(), mkDual(), mkDual(), mkCoin()], rnd));
  } else {                                            // ch4：flip 主载 3/关（转身视角转换）
    specs.push({ kind: 'findpos', pos: pick() });
    specs = specs.concat(shuffled([mkFlip(), mkFlip(), mkFlip(), mkCoin()], rnd));
  }
  if (flat === 0) specs[0] = { kind: 'findpos', pos: 'front' };   // 教学演示锚点：兔子在树前面
  let prev = null;                                    // 相邻题互异（specKey——防连出同方位/同组合）
  for (let qi = 0; qi < CH_LEN; qi++) {
    let s = specs[qi], pk = prev && specKey(prev);
    for (let g = 0; g < 8 && specKey(s) === pk; g++) {
      s = reroll(s);
      specs[qi] = s;
    }
    prev = specs[qi];
  }
  return specs;
}

/* ---------- 单题构建：cells=6 格恒全摆（固定 POS6 序）
   findpos：ask=pos（=bunnyAt 兔子位），answer=cells 内 pos 格下标；
   placepos：ask=pos（指令目标），bunnyAt=域内随机 ≠ask（1 次 rnd），answer=ask 格下标；
   dual：combo 封闭表取三元组，ask=tree/house/ask2=houseDir，bunnyAt=null（隐藏），
         answer=tree 格下标（两约束同格，交恒唯一）；
   flip：mirror=FLIP_MAP[ask]，bunnyAt=域内随机 ≠mirror（1 次 rnd，兔不在答案格），
         face='back'（背面态），answer=mirror 格下标 ---------- */
function buildQuiz(spec, dch, rnd) {
  const cells = cellsOf(dch).map(p => ({ pos: p }));
  let bunnyAt = null, ask2 = null, house = null, face = null;
  if (spec.kind === 'findpos') {
    bunnyAt = spec.pos;                             // 兔子坐在问句方位格
  } else if (spec.kind === 'placepos') {
    const others = POS6.filter(p => p !== spec.pos);   // placepos 先验：当前位 ≠ 指令目标
    bunnyAt = others[Math.floor(rnd() * others.length)];
  } else if (spec.kind === 'dual') {
    const c = DUAL_COMBOS[spec.combo];
    ask2 = c.houseDir; house = c.house;             // ask=c.tree（树约束方位）
  } else {                                          // flip：兔不在映射格（防点兔绕过）
    const mirror = FLIP_MAP[spec.pos];
    const others = POS6.filter(p => p !== mirror);
    bunnyAt = others[Math.floor(rnd() * others.length)];
    face = 'back';
  }
  const target = spec.kind === 'dual' ? DUAL_COMBOS[spec.combo].tree   // dual 目标格=树约束
              : spec.kind === 'flip' ? FLIP_MAP[spec.pos] : spec.pos;  // flip=映射格/其余=spec.pos
  let answer = -1;
  for (let j = 0; j < cells.length; j++) {
    if (cells[j].pos === target) answer = j;
  }
  const q = { kind: spec.kind, ask: spec.kind === 'dual' ? DUAL_COMBOS[spec.combo].tree : spec.pos,
              cells: cells, bunnyAt: bunnyAt, answer: answer, _miss: 0, _answered: false };
  if (spec.kind === 'dual') { q.ask2 = ask2; q.house = house; }   // 新题型附加字段（findpos/
  if (spec.kind === 'flip') { q.face = face; }                    // placepos 不加=flat0q0 锚面
  return q;                                                       // JSON 与 v1 一致（§R2 ③）
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 findpos/front（§2 教学演示锚点） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 977);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点格引擎（无 DOM）：engTapCell(L, i) —— 点第 i 个方位格（cells 数组下标）
   'right' 答对且本题完成推进（placepos 引擎同步更新 q.bunnyAt=q.ask——兔子已放到目标格，
          契约 M 帧内容断言依据） / 'done' 答对且末题=通关
   'wrong' 点错（findpos 非兔子位格 / placepos 非目标格——含兔子当前位格 / dual 非交集格 /
          flip 非映射格）：该题 miss+1（retries 全关累计=星级口径），格不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapCell(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cells.length) return null;
  if (i === q.answer) {
    q._answered = true;
    if (q.kind === 'placepos') q.bunnyAt = q.ask;   // 兔子飞入目标格（引擎先落，UI 演出跟随）
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.80 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确格下标（=q.answer，独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 /
   cells 恒 6 格全摆固定序 / 四型形状（findpos ask=bunnyAt / placepos ask≠bunnyAt /
   dual 组合封闭+bunnyAt=null / flip 映射+face+兔不在答案格）/ answer 自洽 /
   相邻题互异 / flat0q0 锚点 / 初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  if (['findpos', 'placepos', 'dual', 'flip'].indexOf(q.kind) < 0) return 'kind';
  if (POS6.indexOf(q.ask) < 0) return 'askPool';                      // ask 恒 ∈ 方位封闭 6
  if (q.cells.length !== POS6.length) return 'cellsLen';              // r44：恒 6 格全摆
  for (let j = 0; j < q.cells.length; j++) {
    if (q.cells[j].pos !== POS6[j]) return 'cellsOrder';              // 固定 POS6 序
  }
  if (dch === 1 && q.kind !== 'findpos') return 'dchKind';            // ch1 恒 findpos
  if (q.kind === 'findpos') {
    if (q.bunnyAt !== q.ask) return 'fpBunny';                        // findpos：兔子位=问句方位
  } else if (q.kind === 'placepos') {
    if (q.bunnyAt === q.ask) return 'ppSame';                         // placepos：目标 ≠ 当前位
    if (POS6.indexOf(q.bunnyAt) < 0) return 'ppBunny';                // 当前位 ∈ 封闭 6
  } else if (q.kind === 'dual') {
    const c = DUAL_COMBOS.find(x => x.house === q.house && x.tree === q.ask && x.houseDir === q.ask2);
    if (!c) return 'duCombo';                                         // dual：三元组 ∈ 组合封闭表
    if (q.bunnyAt !== null) return 'duHide';                          // dual：兔子隐藏（防读图绕过）
  } else {
    if (q.face !== 'back') return 'flFace';                           // flip：背面态标记
    const m = FLIP_MAP[q.ask];
    if (!m) return 'flMap';                                           // ask ∈ 封闭 6（可映射）
    if (q.bunnyAt === m) return 'flOnAns';                            // flip：兔 ≠ 映射格（防点兔）
    if (POS6.indexOf(q.bunnyAt) < 0) return 'flBunny';
  }
  if (q.answer < 0 || q.answer >= q.cells.length) return 'ansRange';
  const target = q.kind === 'flip' ? FLIP_MAP[q.ask] : q.ask;
  if (q.cells[q.answer].pos !== target) return 'ansIdx';              // answer=目标格下标
  if (flat === 0 && qi === 0 && (q.kind !== 'findpos' || q.ask !== 'front')) return 'anchor';
  if (prevQ && prevQ.kind === q.kind && prevQ.ask === q.ask &&
      prevQ.ask2 === q.ask2) return 'adjacent';                       // 相邻互异（dual 含 ask2）
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
