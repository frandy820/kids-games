/* ================= shapeshome 纯引擎：确定性关卡生成 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   r8 三新题型（章难度；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 tri 三维匹配：家=tc 色+ts 形+tz 大小；干扰恰与目标差一维（近干扰非远干扰）——
        A=同色同形翻大小；B=恰差形状 或 恰差非近似色（rnd 二选一）；
        首题热身=两干扰各差 ≥2 维（比"恰差一维"易排除）
   dch2 neg 否定条件：「不是 nc 色、也不是 ns 形」——按否定条件筛唯一满足项（抑制优势反应）；
        目标/干扰色与 nc 非近似（近似辨析留给 ch4）；首题热身=一干扰双条件全违反+一干扰恰违反一条件
   dch3 grid 九宫格：3 行各恒一形（行间互异）×3 列各恒一色（列间两两非近似），缺格 (r,c) 随机；
        干扰=恰对一规则（同列色异行形 / 异列色同行形）；首题热身=两干扰双规则全违反
   dch4 mix 混排：题序 kind 循环 [tri,neg,grid,tri,neg]；首题=标准参数（已学形态热身），
        第 2 题起 hard：tri-hard 目标色∈近似域且色维干扰=nearOf(tc)；
        neg-hard 目标色=nearOf(nc)（禁色的近似色，抑制+辨析双负荷）；
        grid-hard 列色恰含一组近似对（红橙/蓝紫相邻列）
   生成关（flat≥20）= 难度章号随机（1-4，姊妹款同口径），章内参数（目标/干扰/缺格/位置）随机
   规则铁律：options 三卡按 c|s|z 键互异；恰一张 match（answerIdx 有效）；相邻题目标不同
   （tri 比目标色 / neg 比禁色 / grid 比行列模式串） */
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
/* ch4 混排题序（首题 tri 标准=已学形态热身） */
const MIX_KINDS = ['tri', 'neg', 'grid', 'tri', 'neg'];

/* ---------- 判定（verify 断言的唯一定义点）
   tri：色+形+大小三维都比；neg：两否定条件都满足（≠nc 且 ≠ns）；
   grid：缺格行列规则（c=所在列恒色 / s=所在行恒形） ---------- */
const matchOf = (q, o) => q.kind === 'neg' ? (o.c !== q.nc && o.s !== q.ns)
  : q.kind === 'grid' ? (o.c === q.cols[q.miss.c] && o.s === q.rows[q.miss.r])
  : (o.c === q.tc && o.s === q.ts && o.z === q.tz);

/* ---------- grid 列色组：标准=两两非近似三元组；hard=恰含一组近似对+第三色与其均非近似 ---------- */
function gridCols(rnd, hard) {
  if (!hard) {
    for (let t = 0; t < 12; t++) {
      const cs = shuffled(COLOR_KEYS, rnd).slice(0, 3);
      if (!isNearPair(cs[0], cs[1]) && !isNearPair(cs[0], cs[2]) && !isNearPair(cs[1], cs[2])) return cs;
    }
    return ['red', 'yellow', 'green'];
  }
  const pair = [['red', 'orange'], ['blue', 'purple']][Math.floor(rnd() * 2)];
  const rest = COLOR_KEYS.filter(c => c !== pair[0] && c !== pair[1] &&
    !isNearPair(c, pair[0]) && !isNearPair(c, pair[1]));
  const third = rest[Math.floor(rnd() * rest.length)];
  return rnd() < 0.5 ? [pair[0], third, pair[1]] : [pair[1], third, pair[0]];
}

/* ---------- 单题生成（rnd 同流保证确定性；lastKey=上题目标键避重）
   返回 { kind, tri:tc/ts/tz | neg:nc/ns | grid:rows/cols/miss, options×3, answerIdx, _miss, solved } ---------- */
function genOne(dch, qi, rnd, lastKey) {
  let tc = null, ts = null, tz = null, nc = null, ns = null, rows = null, cols = null, miss = null, options;
  const hard = dch === 4 && qi > 0;                       // ch4 首题=标准（热身），第 2 题起 hard
  const kind = dch === 1 ? 'tri' : dch === 2 ? 'neg' : dch === 3 ? 'grid' : MIX_KINDS[qi];
  const pickFrom = pool => {
    let v = pool[Math.floor(rnd() * pool.length)];
    for (let t = 0; t < 8 && lastKey && v === lastKey; t++) v = pool[Math.floor(rnd() * pool.length)];
    return v;
  };

  if (kind === 'tri') {                                   // 三维匹配
    tc = pickFrom(dch === 4 && hard ? NEAR_KEYS : COLOR_KEYS);
    ts = SHAPE_KEYS[Math.floor(rnd() * SHAPE_KEYS.length)];
    tz = SIZE_KEYS[Math.floor(rnd() * SIZE_KEYS.length)];
    const zo = tz === 'big' ? 'small' : 'big';            // 干扰 A：同色同形翻大小（恰差一维）
    if (qi === 0 && dch !== 4) {                          // ch1 首题热身：两干扰各差 ≥2 维
      const dcols = shuffled(COLOR_KEYS.filter(c => c !== tc && !isNearPair(c, tc)), rnd).slice(0, 2);
      const dshs = shuffled(SHAPE_KEYS.filter(s => s !== ts), rnd).slice(0, 2);
      options = [{ c: tc, s: ts, z: tz }, { c: tc, s: dshs[0], z: zo }, { c: dcols[0], s: dshs[1], z: tz }];
    } else if (dch === 4 && hard) {                       // tri-hard：色维干扰=近似色（恰差一维）
      options = [{ c: tc, s: ts, z: tz }, { c: tc, s: ts, z: zo }, { c: nearOf(tc)[0], s: ts, z: tz }];
    } else {                                              // 标准：B=恰差形状 或 恰差非近似色（rnd 二选一）
      const byShape = rnd() < 0.5;
      const s2 = SHAPE_KEYS.filter(s => s !== ts)[Math.floor(rnd() * 3)];
      const c2 = shuffled(COLOR_KEYS.filter(c => c !== tc && !isNearPair(c, tc)), rnd)[0];
      options = [{ c: tc, s: ts, z: tz }, { c: tc, s: ts, z: zo },
        byShape ? { c: tc, s: s2, z: tz } : { c: c2, s: ts, z: tz }];
    }
  } else if (kind === 'neg') {                            // 否定条件
    nc = pickFrom(dch === 4 && hard ? NEAR_KEYS : COLOR_KEYS);
    ns = SHAPE_KEYS[Math.floor(rnd() * SHAPE_KEYS.length)];
    const poolC = COLOR_KEYS.filter(c => c !== nc && !isNearPair(c, nc));   // ch2 干扰/目标色与禁色非近似
    let ct = poolC[Math.floor(rnd() * poolC.length)];
    if (dch === 4 && hard) ct = nearOf(nc)[0];            // neg-hard：目标色=禁色的近似色
    const st = SHAPE_KEYS.filter(s => s !== ns)[Math.floor(rnd() * 3)];
    const s1 = SHAPE_KEYS.filter(s => s !== ns && s !== st)[Math.floor(rnd() * 2)];
    const c2 = poolC.filter(c => c !== ct)[Math.floor(rnd() * Math.max(1, poolC.length - 1))] || poolC[0];
    if (qi === 0 && dch !== 4) {                          // ch2 首题热身：一全违反+一形侧单违反
      options = [{ c: ct, s: st }, { c: nc, s: ns }, { c: c2, s: ns }];
    } else {                                              // 标准/hard：各违反恰一条件（色侧/形侧）
      options = [{ c: ct, s: st }, { c: nc, s: s1 }, { c: c2, s: ns }];
    }
  } else {                                                // 九宫格缺格
    let tries = 0;
    do {
      rows = shuffled(SHAPE_KEYS, rnd).slice(0, 3);       // 行恒形（行间互异）
      cols = gridCols(rnd, dch === 4 && hard);            // 列恒色（标准两两非近似 / hard 含近似对）
      tries++;
    } while (tries < 8 && lastKey && lastKey === rows.join() + '|' + cols.join());
    miss = { r: ri(rnd, 0, 2), c: ri(rnd, 0, 2) };
    const oc = cols.filter((_, j) => j !== miss.c);       // 其余两列色 / 其余两行形（真干扰源）
    const os = rows.filter((_, k) => k !== miss.r);
    const ans = { c: cols[miss.c], s: rows[miss.r] };
    if (qi === 0 && dch !== 4) {                          // ch3 首题热身：双规则全违反
      options = [ans, { c: oc[0], s: os[0] }, { c: oc[1], s: os[1] }];
    } else {                                              // 标准/hard：各恰对一规则
      options = [ans, { c: cols[miss.c], s: os[0] }, { c: oc[0], s: rows[miss.r] }];
    }
  }

  options = shuffled(options, rnd);
  const head = kind === 'tri' ? { kind: 'tri', tc: tc, ts: ts, tz: tz }
    : kind === 'neg' ? { kind: 'neg', nc: nc, ns: ns }
    : { kind: 'grid', rows: rows, cols: cols, miss: miss };
  const answerIdx = options.findIndex(o => matchOf(head, o));
  return Object.assign({ options: options, answerIdx: answerIdx, _miss: 0, solved: false }, head);
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性，姊妹款同口径）
  const quizzes = [];
  let lastKey = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, lastKey);
    lastKey = q.kind === 'tri' ? q.tc : q.kind === 'neg' ? q.nc   // 相邻题目标不同（禁色/目标色/行列模式）
      : q.rows.join() + '|' + q.cols.join();
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点第 i 张图形卡
   'right' = 送对（题继续）；'done' = 末题送对（通关）；'wrong' = 送错（灰掉，计错点）；
   'again' = 点已灰卡（早退零惩罚不计数）；null = 非法/关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || i < 0 || i >= q.options.length) return null;
  if (q._dead && q._dead[i]) return 'again';           // 已灰选项：早退（防御层 §0.7）
  if (i === q.answerIdx) {
    q._dead = q._dead || [];
    q._dead[i] = 1;
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q._dead = q._dead || [];
  q._dead[i] = 1;
  q._miss = (q._miss || 0) + 1;
  L.retries++;                                         // 错点次数（星级判据）
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点=3 星；错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);
/* 候选卡唯一键（互异判据；tri 含大小维） */
const optKey = o => o.c + '|' + o.s + '|' + (o.z || '');

/* ---------- 结构校验（verify 用）：题型/字段域/候选互异/恰一张 match/answerIdx 有效 ---------- */
function structOk(q, dch, qi) {
  if (!q || !q.options) return false;
  /* 题型与章对应（dch4 混排按题序循环） */
  const want = dch === 1 ? 'tri' : dch === 2 ? 'neg' : dch === 3 ? 'grid' : MIX_KINDS[qi];
  if (q.kind !== want) return false;
  if (q.options.length !== 3) return false;
  if (q.kind === 'tri') {
    if (COLOR_KEYS.indexOf(q.tc) < 0 || SHAPE_KEYS.indexOf(q.ts) < 0 || SIZE_KEYS.indexOf(q.tz) < 0) return false;
    if (dch === 4 && qi > 0 && NEAR_KEYS.indexOf(q.tc) < 0) return false;    // tri-hard 近似色域
  } else if (q.kind === 'neg') {
    if (COLOR_KEYS.indexOf(q.nc) < 0 || SHAPE_KEYS.indexOf(q.ns) < 0) return false;
    if (dch === 4 && qi > 0 && NEAR_KEYS.indexOf(q.nc) < 0) return false;    // neg-hard 近似色域
  } else {
    if (!Array.isArray(q.rows) || !Array.isArray(q.cols) || q.rows.length !== 3 || q.cols.length !== 3) return false;
    if (new Set(q.rows).size !== 3 || new Set(q.cols).size !== 3) return false;   // 行形互异/列色互异
    if (q.rows.some(s => SHAPE_KEYS.indexOf(s) < 0) || q.cols.some(c => COLOR_KEYS.indexOf(c) < 0)) return false;
    if (!q.miss || q.miss.r < 0 || q.miss.r > 2 || q.miss.c < 0 || q.miss.c > 2) return false;
  }
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      if (optKey(q.options[i]) === optKey(q.options[j])) return false;   // 候选互异
  /* 恰一张 match 且 answerIdx 指向它 */
  const matches = q.options.map((o, i) => matchOf(q, o) ? i : -1).filter(i => i >= 0);
  if (matches.length !== 1 || matches[0] !== q.answerIdx || q.answerIdx < 0) return false;
  return true;
}
