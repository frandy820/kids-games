/* ================= colormix 纯引擎：确定性关卡生成 + 玻璃缸 FIFO + 混色判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R21-COLORMIX §R2，r21 修订；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 原色直击（目标=罐上色，单罐即成）/ dch2 恰 2 二级+3 浅原色（深浅两档判定，白罐进场）
   / dch3 恰 2 棕+3 浅二级（三步组合配方）/ dch4 配方反推（给缸中已混出的色选配方卡）
   玩法铁律（§0.51+r21 §R3/§R4）：点罐入缸（缸深 3，超深 FIFO 替换最早球）→ 缸变结果色 →
   自动判定；结果色==目标 celebrate；≠目标=1 试调（缸不清空继续试）——"缸内颜色集变化"才判：
   重复色入缸（集合未变）不判不罚。错试不记 miss 口径=试调次数（探索≠错误，不 sayW 重责）。
   反推题（dch4）：pot 恒空（缸液=目标色展示不泄配方），engPickRecipe 选卡混算==目标即成。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 混色：engMix(颜色数组) —— 去重集合查 MIX 表（无比例无减色），表外 → mud 浑浊 ---------- */
function mixKey(colors) {
  const u = [];
  for (let i = 0; i < colors.length; i++) if (u.indexOf(colors[i]) < 0) u.push(colors[i]);
  u.sort();
  return u.join('+');
}
const engMix = colors => MIX[mixKey(colors)] || 'mud';

/* ---------- 单题生成 ---------- */
function mkQuiz(target, jars) {
  return { target: target, jars: jars.slice(), pot: [], result: null,
           tries: 0, solved: false };
}

/* ---------- 反推题生成（§R4）：3 张配方卡=正确 + 深浅对 + 换一罐干扰（确定性 seeded）
   干扰两族：d1 深浅对（二级↔其浅版 / 浅X↔其深版；棕无浅版退化双换罐）；
   d2 换一罐（正确配方随机一位换成不在配方中的罐）。MIX 在可达域内是集合→结果的双射，
   集合异⇒结果异——结构性保证干扰混出≠目标（verify 侧独立复算断言兜底）。 ---------- */
function revDistractors(target, rec, rnd) {
  const lightOf = 'light' + target;
  let d1 = null;
  if (target.indexOf('light') === 0) d1 = RECIPE[target.slice(5)];
  else if (RECIPE[lightOf]) d1 = RECIPE[lightOf];
  const others = ['red', 'yellow', 'blue', 'white'].filter(c => rec.indexOf(c) < 0);
  const pos = ri(rnd, 0, rec.length - 1);
  const d2 = rec.slice();
  d2[pos] = others[ri(rnd, 0, others.length - 1)];
  if (!d1) {                                     /* 棕：无浅版（4 色集合缸深 3 不可表达）→ 双换罐 */
    const pos2 = (pos + 1) % rec.length;
    d1 = rec.slice();
    d1[pos2] = others[ri(rnd, 0, others.length - 1)];
  }
  return [d1, d2];
}
function mkRevQuiz(target, rnd) {
  const rec = RECIPE[target];
  const dd = revDistractors(target, rec, rnd);
  return { target: target, mode: 'reverse', jars: [],
           picks: shuffled([rec, dd[0], dd[1]], rnd),
           picked: -1, pot: [], result: target,     /* result=缸中展示色恒=目标（§R4） */
           tries: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   flat0 题0 恒 target='green'（§3 教学"演示调绿（黄+蓝）"=恰好演示完整一题；
   其余 4 题按 ch1 原色直击池——教完二级魔法回炉单罐因果，r21 不动）
   r21 章型（§R2）：dch2 恰 2 二级+3 浅原色（结构性无相邻同——两组内互异、跨组 id 必异）
   / dch3 恰 2 棕+3 浅二级（2 棕相邻重洗，guard 用尽交错兜底）
   / dch4 反推池采样+相邻重摇 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const C = CHAPTERS[dch];
  const quizzes = [];

  if (dch === 1) {
    /* ch1 原色直击（r21 不动）：池内采样 + 相邻题目标不同（flat0 题0 特例=green） */
    let lastT = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      if (flat === 0 && qi === 0) {
        quizzes.push(mkQuiz('green', C.jars)); lastT = 'green'; continue;
      }
      let t = C.pool[ri(rnd, 0, C.pool.length - 1)];
      for (let t2 = 0; t2 < 8 && t === lastT; t2++) t = C.pool[ri(rnd, 0, C.pool.length - 1)];
      quizzes.push(mkQuiz(t, C.jars));
      lastT = t;
    }
  } else if (dch === 2) {
    /* ch2 深浅魔法（r21）：恰 2 二级 + 3 浅原色，洗牌（天然无相邻同目标） */
    const seq = shuffled(shuffled(['orange', 'green', 'purple'], rnd).slice(0, 2)
      .concat(['lightred', 'lightyellow', 'lightblue']), rnd);
    for (let i = 0; i < CH_LEN; i++) quizzes.push(mkQuiz(seq[i], C.jars));
  } else if (dch === 3) {
    /* ch3 三色秘密（r21）：恰 2 棕 + 3 浅二级，洗牌且相邻不同（2 棕相邻重洗，guard 用尽交错兜底） */
    let seq = null, guard = 0;
    while (!seq && guard++ < 24) {
      const s = shuffled(['brown', 'brown', 'lightorange', 'lightgreen', 'lightpurple'], rnd);
      let ok = true;
      for (let i = 1; i < s.length; i++) if (s[i] === s[i - 1]) ok = false;
      if (ok) seq = s;
    }
    if (!seq) seq = ['brown', 'lightorange', 'brown', 'lightgreen', 'lightpurple'];
    for (let i = 0; i < CH_LEN; i++) quizzes.push(mkQuiz(seq[i], C.jars));
  } else {
    /* ch4 配方大师（r21 反推）：反推池采样 + 相邻题目标不同 */
    let lastT = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      let t = REV_POOL[ri(rnd, 0, REV_POOL.length - 1)];
      for (let t2 = 0; t2 < 8 && t === lastT; t2++) t = REV_POOL[ri(rnd, 0, REV_POOL.length - 1)];
      quizzes.push(mkRevQuiz(t, rnd));
      lastT = t;
    }
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, done: false, missTotal: 0 };
}

/* ---------- 点罐引擎（无 DOM）：engTapJar(L, color) —— 点一罐颜料入玻璃缸
   入缸 FIFO（缸深 3，超深替换最早球）→ 结果色重算 →
   'same'   集合未变（重复色）：不判不罚，球照入缸（探索观察）
   'wrong'  一次"调出"判非目标 = 1 试调（缸不清空继续试）
   'right'  结果色==目标：本题成（还有后续题）
   'done'   末题调对 = 通关
   null     非法色（不在本题颜料罐）/ 关卡已结束 ---------- */
function engTapJar(L, color) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q.mode === 'reverse') return null;            // r21 §R4：反推题无点罐通道（UI 守卫吞输入）
  if (q.jars.indexOf(color) < 0) return null;
  if (L.dch === 1 && q.jars.indexOf(q.target) >= 0 && q.pot.length && q.pot[q.pot.length - 1] !== color) q.pot = [];  // 试玩P2a：ch1 直击题换色点=清缸重判（缸残留致「点对了被说错」；混合题如 flat0 题0 green 保 FIFO）
  q.pot.push(color);
  if (q.pot.length > POT_DEPTH) q.pot.shift();      // FIFO：缸满 3 球后替换最早球
  const prev = q.result;
  q.result = engMix(q.pot);
  if (q.result === prev) return 'same';             // 颜色集未变：不算一次"调出"
  if (q.result === q.target) {                      // 自动判定：==目标 celebrate
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q.tries++;                                        // ≠目标 = 1 试调（探索≠错误）
  L.missTotal++;
  return 'wrong';
}
const engWon = L => !!L && L.done;

/* ---------- 选配方引擎（无 DOM，r21 §R4）：engPickRecipe(L, i) —— 反推题点一张配方卡
   卡罐组混算（去重集合语义同缸）==目标 → 本题成；
   'same'   重复点同卡：不判不罚（承 same 探索语义）
   'wrong'  卡混出≠目标 = 1 试调（不换题可重选——探索≠错）
   'right'  ==目标（还有后续题）/ 'done' 末题 / null 非反推态或非法索引 ---------- */
function engPickRecipe(L, i) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.mode !== 'reverse') return null;
  if (i == null || i < 0 || i >= q.picks.length) return null;
  if (i === q.picked) return 'same';
  q.picked = i;
  if (engMix(q.picks[i]) === q.target) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q.tries++;                                        // ≠目标 = 1 试调（可重选，不阻塞）
  L.missTotal++;
  return 'wrong';
}

/* ---------- 星级（SPEC §3 定版 + r21 §R4）：dch1 单罐直击恒 3★；
   其余 = 全关试调总数 missTotal 对最优基线 par（原色 0 / 二级·浅原色 1 / 棕·浅二级 2 /
   反推题 1=容一次探索性错选）：
   ≤par → 3★（每题都最优）；≤par+CH_LEN → 2★（平均多 1 次）；否则 1★。永不 0 星
   （反推 par 收官定夺 0→1：审查 m1+试玩 P2-1 双证据——par=0 下 6 岁人设 2/5 题首错，
   2★ 常态化 3★ 稀缺，与 ch1 豁免先例/ch2 par=1 同级精神一致；认知难度本体在反推维度
   不在星级卡死） ---------- */
const quizPar = t => PAR[t] != null ? PAR[t] : 1;
const engPar = L => L.quizzes.reduce((s, q) => s + (q.mode === 'reverse' ? 1 : quizPar(q.target)), 0);
const engStars = L => {
  if (!L) return 1;
  if (L.dch === 1) return 3;
  const m = L.missTotal || 0, par = engPar(L);
  return m <= par ? 3 : (m <= par + CH_LEN ? 2 : 1);
};

/* ---------- 结构校验（verify 用，返回失败原因或 null；r21 §R2/§R4 域）：
   目标在池 / jars 匹配章 / 相邻不同 / ch2 恰 2 二级+3 浅原色 / ch3 恰 2 棕+3 浅二级 /
   ch4 反推结构（picks 恰 3+正确恰 1+干扰 mix≠目标）/ flat0 题0 恒 green /
   初始 pot/result/tries 自洽 ---------- */
function structWhy(q, dch, flat, qi, prevT) {
  const C = CHAPTERS[dch];
  if (!q || !COLORS[q.target]) return 'target';
  if (q.target === 'mud' || q.target === 'white') return 'targetPool';   // 浑浊/白不做目标
  const isFlat0Q0 = flat === 0 && qi === 0;              // 教学演示题（调绿）豁免池检查
  if (isFlat0Q0) return q.target === 'green' ? null : 'flat0q0';
  if (dch === 4) {
    /* r21 反推题结构：域（池=非平凡配方）/ picks 恰 3 / 正确恰 1 / 干扰混出≠目标 */
    if (REV_POOL.indexOf(q.target) < 0) return 'revPool';
    if (q.mode !== 'reverse' || !Array.isArray(q.picks) || q.picks.length !== 3) return 'revPicks';
    let nOk = 0;
    for (let i = 0; i < q.picks.length; i++) {
      const p = q.picks[i];
      if (!Array.isArray(p) || !p.length || p.length > POT_DEPTH) return 'revPick';
      for (let k = 0; k < p.length; k++) if (['red', 'yellow', 'blue', 'white'].indexOf(p[k]) < 0) return 'revPick';
      const got = engMix(p);
      if (!COLORS[got]) return 'revPick';
      if (got === q.target) nOk++;
    }
    if (nOk !== 1) return 'revOk:' + nOk;                // 正确卡恰 1（干扰族结构性≠目标）
    if (q.pot.length !== 0 || q.result !== q.target || q.tries !== 0 || q.solved) return 'init';
    if (prevT != null && q.target === prevT) return 'adj';
    return null;
  }
  if (C.pool.indexOf(q.target) < 0) return 'pool:' + dch;
  if (q.jars.length !== C.jars.length) return 'jarsLen';
  for (let i = 0; i < q.jars.length; i++) if (q.jars[i] !== C.jars[i]) return 'jars';
  if (prevT != null && q.target === prevT) return 'adj';
  if (q.pot.length !== 0 || q.result !== null || q.tries !== 0 || q.solved) return 'init';
  return null;
}
