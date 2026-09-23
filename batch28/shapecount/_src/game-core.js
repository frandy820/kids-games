/* ================= shapecount 纯引擎：确定性关卡生成 + 数字卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 47)：同 flat 永远同关（重玩一致、verify 可检）。
   r3 章型（SPEC-BATCH28 §0.68 r3 版本块；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 多数一数：散点单形 count 5-10 个（flat0 题0 恒 circle×6——教学演示锚点
           「两个两个分组数」：3 组×1400ms 分账与旧逐个数一致）
     dch2 排好队数：grid 阵列 r∈{2,3,4}×c∈{3,4,5}，r*c∈[10,20] 满阵，答案=r*c
           （行列结构化视觉——分组策略：两个两个数/按行数）
     dch3 空格颜色：gridmiss（r*c∈[12,20] 缺格 k∈[1,4] 且 r*c-k≥10——减法结构）+
           dual（目标 3-6 + 同色异形 2-5 + 同形异色 2-5，双干扰必在场）交替 3+2
     dch4 大挑战：四型混合（count 近形版+grid+gridmiss+dual，每关 ≥2 型）+
           全题漂移 drift（r3 ④ 移动干扰：横摆 ±9px 慢速 CSS 动画，判定层不受影响）
   生成关（flat≥20）：每关随机章参数 dch=ri(1,4)（先取数保确定性——b25 坑④ verify 钩子直读）；
   dch4 含漂移。铁律：count/grid/gridmiss/dual 候选数字=numSet(n) 数学先验（四数互异
   含真值、全 ≥1、定长 4）；dual 同色异形+同形异色双干扰必在场（§0.68 r3）；
   散点槽位 12 确定性互异（非重叠由槽位模型保证）；阵列 _place=row/cp 结构
   （miss 格不在 _place）；相邻题同型身份互异（防同关连题单调）。 */
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

/* ---------- 场景槽位模型（散点：4 列 × 3 行 = 12 槽；渲染前算位防重叠）
   渲染换算（renderScene）：col = slot % 4，row = floor(slot / 4)；
   left = col*25+12.5%（列中心），top = 22+row*29 %（行中心）。
   数量上界：count n+m ≤ 12 / dual n+d1+d2 ≤ 12——槽位恒充足、互异不叠。
   阵列（grid/gridmiss）：GRID_TOP/GRID_DY 行定位 + (cp+0.5)/cols 列定位
   （game-data 几何常量——渲染/verify/build 三处同源）。 */
const N_SLOTS = 12;

/* ---------- 阵列参数掷取：r∈{2,3,4}×c∈{3,4,5}，总格数域内重掷（≤24 掷兜底）
   满阵域 [10,20]（dch2）/ 缺格阵底数域 [12,20]（dch3 缺格后 ≥10） */
function rollGrid(rnd, totLo, totHi) {
  for (let g = 0; g < 24; g++) {
    const r = ri(rnd, GRID_R[0], GRID_R[1]), c = ri(rnd, GRID_C[0], GRID_C[1]);
    if (r * c >= totLo && r * c <= totHi) return { r: r, c: c };
  }
  return { r: 4, c: 5 };                              // 兜底（4×5=20 恒在两域内）
}

/* ---------- 每关题序表（genLevel 预生成；rnd 同流保确定性）
   dch1：flat0 题0 锚 circle×6；形序列=全 6 池洗牌取 5（互异轮换）
   dch2：形=全 6 池互异轮换；每题掷 r×c（满阵 10-20）
   dch3：两子型交替 3+2（首型掷 coin）；gm 掷 r×c+k；du 掷 形/色/三数量
   dch4：每题 ri(1,4) 定型（<2 型兜底改末题补缺型）；count=近形版；
         全部题 drift=true（漂移标记随题型落 buildQuiz） ---------- */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  const pickDiff = (pool, prev) => {
    let s = pool[Math.floor(rnd() * pool.length)];
    for (let g = 0; g < 8 && s === prev; g++) s = pool[Math.floor(rnd() * pool.length)];
    return s;
  };
  if (dch === 1) {
    let shapes;
    if (flat === 0) shapes = ['circle'].concat(shuffled(ALL6.filter(s => s !== 'circle'), rnd).slice(0, CH_LEN - 1));
    else shapes = shuffled(ALL6, rnd).slice(0, CH_LEN);
    for (let qi = 0; qi < CH_LEN; qi++) {
      const n = (flat === 0 && qi === 0) ? 6 : ri(rnd, N_CH1[0], N_CH1[1]);   // flat0q0 锚 n=6（分组数教学）
      seq.push({ kind: 'count', ask: shapes[qi], n: n });
    }
    return seq;
  }
  if (dch === 2) {
    const shapes = shuffled(ALL6, rnd).slice(0, CH_LEN);   // 互异轮换（相邻身份天然互异）
    for (let qi = 0; qi < CH_LEN; qi++) {
      const rc = rollGrid(rnd, GRID_TOT[0], GRID_TOT[1]);
      seq.push({ kind: 'grid', ask: shapes[qi], r: rc.r, c: rc.c });
    }
    return seq;
  }
  if (dch === 3) {
    const firstDual = rnd() < 0.5;                        // 交替 3+2（首型掷 coin）
    for (let qi = 0; qi < CH_LEN; qi++) {
      const isDual = (qi % 2 === 0) === firstDual;        // 0,2,4 一型 / 1,3 另一型
      if (isDual) seq.push(rollDualSpec(rnd, null));
      else {
        const rc = rollGrid(rnd, MISS_TOT[0], MISS_TOT[1]);
        const k = ri(rnd, MISS_K[0], Math.min(MISS_K[1], rc.r * rc.c - MISS_FLOOR));
        seq.push({ kind: 'gridmiss', ask: pickDiff(ALL6, null), r: rc.r, c: rc.c, k: k });
      }
    }
    return seq;
  }
  /* dch4 四型混合（每关 ≥2 型） */
  const kinds = [];
  for (let qi = 0; qi < CH_LEN; qi++) kinds.push(ri(rnd, 1, 4));
  const uniq = kinds.filter((v, i, a) => a.indexOf(v) === i);
  if (uniq.length < 2) kinds[CH_LEN - 1] = (kinds[0] % 4) + 1;   // 全同型 → 末题改邻型（保混合）
  let prevAsk = null, prevDual = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const t = kinds[qi];
    if (t === 1) {
      const ask = pickDiff(NEAR_KEYS, prevAsk);          // ch4 count=近形版（近形必在场）
      let n = ri(rnd, N_CH4[0], N_CH4[1]), m = ri(rnd, N_DIST4[0], N_DIST4[1]);
      for (let g = 0; g < 12 && n + m > N_SLOTS; g++) m = ri(rnd, N_DIST4[0], N_DIST4[1]);
      if (n + m > N_SLOTS) m = N_SLOTS - n;              // 兜底钳制（n≤9 → m=12-n∈[3,7] 恒界内）
      seq.push({ kind: 'count', ask: ask, n: n, m: m });
      prevAsk = ask;
    } else if (t === 2) {
      const ask = pickDiff(ALL6, prevAsk);
      const rc = rollGrid(rnd, GRID_TOT[0], GRID_TOT[1]);
      seq.push({ kind: 'grid', ask: ask, r: rc.r, c: rc.c });
      prevAsk = ask;
    } else if (t === 3) {
      const ask = pickDiff(ALL6, prevAsk);
      const rc = rollGrid(rnd, MISS_TOT[0], MISS_TOT[1]);
      const k = ri(rnd, MISS_K[0], Math.min(MISS_K[1], rc.r * rc.c - MISS_FLOOR));
      seq.push({ kind: 'gridmiss', ask: ask, r: rc.r, c: rc.c, k: k });
      prevAsk = ask;
    } else {
      const du = rollDualSpec(rnd, prevDual);
      seq.push(du);
      prevDual = du.shape + ':' + du.color;
    }
  }
  return seq;
}

/* ---------- dual 题参数掷取：目标 n 3-6 + 同色异形 d1 2-5 + 同形异色 d2 2-5，
   三量和 ≤12（散点槽位上界，≤16 掷兜底+末掷钳制）；
   干扰形 d1s ≠ 目标形、干扰色 d2c ≠ 目标色（近形对 50% 优先取——辨析回退纯形状通道）
   prev=相邻题 'shape:color' 身份（互异兜底 ≤8 掷） ---------- */
function rollDualSpec(rnd, prev) {
  for (let g = 0; g < 16; g++) {
    const shape = ALL6[Math.floor(rnd() * 6)];
    const color = COLOR4[Math.floor(rnd() * 4)];
    if (g < 8 && prev === shape + ':' + color) continue;
    const n = ri(rnd, DUAL_N[0], DUAL_N[1]);
    const d1 = ri(rnd, DUAL_D[0], DUAL_D[1]);
    const d2 = ri(rnd, DUAL_D[0], DUAL_D[1]);
    if (n + d1 + d2 > N_SLOTS) continue;                 // 槽位上界铁律（重掷）
    let d1s = ALL6[Math.floor(rnd() * 6)];
    if (d1s === shape) d1s = ALL6[(ALL6.indexOf(shape) + 1) % 6];   // 干扰形 ≠ 目标形
    else if (NEAR[shape] && rnd() < 0.5) d1s = NEAR[shape];         // 近形干扰 50%（同色近形=辨析最狠）
    if (d1s === shape) d1s = NEAR[shape] || ALL6[(ALL6.indexOf(shape) + 2) % 6];
    let d2c = COLOR4[Math.floor(rnd() * 4)];
    if (d2c === color) d2c = COLOR4[(COLOR4.indexOf(color) + 1) % 4];   // 干扰色 ≠ 目标色
    return { kind: 'dual', shape: shape, color: color, n: n, d1s: d1s, d1: d1, d2c: d2c, d2: d2 };
  }
  /* 兜底（概率上不可达：16 掷全失败）——确定性钳制保域 */
  return { kind: 'dual', shape: 'circle', color: 'red', n: 4, d1s: 'triangle', d1: 3, d2c: 'blue', d2: 3 };
}

/* ---------- 单题构建
   count（dch1 单形 / dch4 近形版）：scene={ask:n(+near:m)}；数字卡=shuffled(numSet(n))
   grid：满阵 rows×cols，n=r*c，scene={ask:n}；_place=阵列格（miss 空）
   gridmiss：n=r*c-k，miss[]=缺格 idx（洗牌取 k），scene={ask:n}
   dual：ask='shape:color'，scene={'shape:color':n,'d1s:color':d1,'shape:d2c':d2}
         （三组合键=目标+同色异形+同形异色，双干扰必在场）；_place 散点带 fill ---------- */
function buildQuiz(spec, dch, rnd) {
  if (spec.kind === 'count') {
    const n = spec.n;
    const near = spec.m != null ? NEAR[spec.ask] : null;
    const scene = {};
    scene[spec.ask] = n;
    if (near) scene[near] = spec.m;
    const nums = shuffled(numSet(n), rnd);
    const opts = nums.map(x => ({ num: x }));
    const ids = near ? [spec.ask, near] : [spec.ask];
    return { kind: 'count', ask: spec.ask, n: n, scene: scene,
             opts: opts, answer: nums.indexOf(n),
             _place: placeOf(scene, ids, rnd), _miss: 0, _answered: false };
  }
  if (spec.kind === 'grid' || spec.kind === 'gridmiss') {
    const miss = spec.kind === 'gridmiss'
      ? shuffled(Array.from({ length: spec.r * spec.c }, (_, i) => i), rnd).slice(0, spec.k) : [];
    const n = spec.r * spec.c - miss.length;
    const scene = {};
    scene[spec.ask] = n;
    const nums = shuffled(numSet(n), rnd);
    const opts = nums.map(x => ({ num: x }));
    return { kind: spec.kind, ask: spec.ask, rows: spec.r, cols: spec.c, miss: miss, n: n,
             scene: scene, opts: opts, answer: nums.indexOf(n),
             _place: gridPlace(spec.r, spec.c, miss, spec.ask, rnd),
             _miss: 0, _answered: false };
  }
  /* dual */
  const scene = {};
  scene[spec.shape + ':' + spec.color] = spec.n;
  scene[spec.d1s + ':' + spec.color] = spec.d1;          // 同色异形干扰（必在场）
  scene[spec.shape + ':' + spec.d2c] = spec.d2;          // 同形异色干扰（必在场）
  const nums = shuffled(numSet(spec.n), rnd);
  const opts = nums.map(x => ({ num: x }));
  const keys = [spec.shape + ':' + spec.color, spec.d1s + ':' + spec.color, spec.shape + ':' + spec.d2c];
  return { kind: 'dual', ask: spec.shape + ':' + spec.color,
           dual: { shape: spec.shape, color: spec.color, n: spec.n,
                   d1s: spec.d1s, d1: spec.d1, d2c: spec.d2c, d2: spec.d2 },
           n: spec.n, scene: scene, opts: opts, answer: nums.indexOf(spec.n),
           _place: placeOf(scene, keys, rnd), _miss: 0, _answered: false };
}

/* ---------- 场景散布（确定性）：实例序=键序展开，槽位洗牌互异 + 旋转 ±12° + 缩放 .95-1.05
   dual 键 'shape:color' 解析出 fill（颜色 id）；count 键=shapeId 无 fill */
function placeOf(scene, keys, rnd) {
  const flat = [];
  keys.forEach(k => {
    const shape = k.indexOf(':') > 0 ? k.split(':')[0] : k;
    const fill = k.indexOf(':') > 0 ? k.split(':')[1] : null;
    for (let i = 0; i < scene[k]; i++) flat.push({ shape: shape, fill: fill });
  });
  const slots = shuffled(Array.from({ length: N_SLOTS }, (_, i) => i), rnd).slice(0, flat.length);
  return flat.map((it, k) => ({ shape: it.shape, fill: it.fill, slot: slots[k],
                                rot: Math.round(rnd() * 24 - 12),
                                scale: +(0.95 + rnd() * 0.1).toFixed(3) }));
}

/* ---------- 阵列散布（r3 ②）：满格 (row,cp) 全展开跳过 miss 格；
   旋转 ±8° + 缩放 .97-1.03（阵列整齐感，微变体小于散点）；
   miss 格不在 _place（渲染/verify 双口径：DOM 元素数=n=r*c-k） ---------- */
function gridPlace(rows, cols, miss, shape, rnd) {
  const missSet = {};
  miss.forEach(i => { missSet[i] = true; });
  const out = [];
  for (let i = 0; i < rows * cols; i++) {
    if (missSet[i]) continue;
    out.push({ shape: shape, fill: null, row: Math.floor(i / cols), cp: i % cols,
               rot: Math.round(rnd() * 16 - 8),
               scale: +(0.97 + rnd() * 0.06).toFixed(3) });
  }
  return out;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 circle×6（§2 教学演示锚点——两个两个分组数）；drift 标记=dch4 全题
   （r3 ④ 移动干扰：渲染层漂移，判定层 scene 真值不变） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 47);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张卡（opts 数组下标）
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
/* 星级（§0.68 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标 */
const correctIdx = q => q ? q.answer : -1;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 /
   阵列参数域与缺格结构 / dual 双干扰在场 / 候选数字数学先验 / 场景-答案自洽 /
   槽位·阵列格一致性 / 相邻题同型互异 / flat0q0 锚点 / 初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'q';
  const isAnchor = flat === 0 && qi === 0;              // 教学演示题（两个两个数圆形）锚点
  if (isAnchor && !(q.kind === 'count' && q.ask === 'circle' && q.n === 6)) return 'anchor';
  if (q.kind === 'count') {
    if (!SHAPES[q.ask]) return 'ask';
    if (dch !== 1 && dch !== 4) return 'countCh';                   // count 只在 ch1/ch4
    if (dch === 1) {
      if (Object.keys(q.scene).length !== 1) return 'dch1scene';    // ch1 单形
      if (q.n < N_CH1[0] || q.n > N_CH1[1]) return 'dch1n';
    } else {
      if (Object.keys(q.scene).length !== 2) return 'ch4scene';
      if (NEAR_KEYS.indexOf(q.ask) < 0) return 'ch4pool';           // ch4 目标恒近形 4 池
      const near = NEAR[q.ask];
      if (!(near in q.scene)) return 'nearMissing';                 // 近形必在场（§0.68 r3）
      const m = q.scene[near];
      if (m < N_DIST4[0] || m > N_DIST4[1]) return 'mRange';
      if (q.n < N_CH4[0] || q.n > N_CH4[1]) return 'ch4n';
      if (q.n + m > N_SLOTS) return 'slots';
    }
  } else if (q.kind === 'grid') {
    if (dch !== 2 && dch !== 4) return 'gridCh';
    if (!SHAPES[q.ask]) return 'ask';
    if (q.rows < GRID_R[0] || q.rows > GRID_R[1]) return 'rows';
    if (q.cols < GRID_C[0] || q.cols > GRID_C[1]) return 'cols';
    const tot = q.rows * q.cols;
    if (tot < GRID_TOT[0] || tot > GRID_TOT[1]) return 'tot';
    if (q.n !== tot) return 'nTot';
    if (q.miss && q.miss.length) return 'gridMiss';                 // 满阵无缺格
  } else if (q.kind === 'gridmiss') {
    if (dch !== 3 && dch !== 4) return 'gmCh';
    if (!SHAPES[q.ask]) return 'ask';
    if (q.rows < GRID_R[0] || q.rows > GRID_R[1]) return 'rows';
    if (q.cols < GRID_C[0] || q.cols > GRID_C[1]) return 'cols';
    const tot = q.rows * q.cols;
    if (tot < MISS_TOT[0] || tot > MISS_TOT[1]) return 'gmTot';
    if (!Array.isArray(q.miss) || q.miss.length < MISS_K[0] || q.miss.length > MISS_K[1]) return 'kRange';
    if (tot - q.miss.length < MISS_FLOOR) return 'floor';           // 缺格后 ≥10（域铁律）
    if (q.n !== tot - q.miss.length) return 'nSub';                 // 减法结构：n = r*c - k
    if (q.miss.filter((v, i, a) => a.indexOf(v) === i).length !== q.miss.length) return 'missDup';
    if (!q.miss.every(v => v >= 0 && v < tot)) return 'missRange';
  } else if (q.kind === 'dual') {
    if (dch !== 3 && dch !== 4) return 'dualCh';
    if (!q.dual) return 'dualObj';
    const d = q.dual;
    if (!SHAPES[d.shape] || !COLORS[d.color]) return 'dualLib';
    if (!SHAPES[d.d1s]) return 'd1sLib';
    if (!COLORS[d.d2c]) return 'd2cLib';
    if (d.d1s === d.shape) return 'd1sSame';                        // 同色异形干扰：形必异
    if (d.d2c === d.color) return 'd2cSame';                        // 同形异色干扰：色必异
    if (d.n < DUAL_N[0] || d.n > DUAL_N[1]) return 'dualN';
    if (d.d1 < DUAL_D[0] || d.d1 > DUAL_D[1] || d.d2 < DUAL_D[0] || d.d2 > DUAL_D[1]) return 'dualD';
    if (d.n + d.d1 + d.d2 > N_SLOTS) return 'dualSlots';
    if (q.ask !== d.shape + ':' + d.color) return 'askPair';
    if (Object.keys(q.scene).length !== 3) return 'dualScene';      // 恰 3 组合键
    if (q.scene[q.ask] !== d.n) return 'sceneN';
    if (q.scene[d.d1s + ':' + d.color] !== d.d1) return 'sceneD1';  // 同色异形在场（必在）
    if (q.scene[d.shape + ':' + d.d2c] !== d.d2) return 'sceneD2';  // 同形异色在场（必在）
  } else return 'kind';
  if (dch === 1 && q.kind !== 'count') return 'dch1kind';           // ch1 全为散点计数
  if (dch === 2 && q.kind !== 'grid') return 'dch2kind';            // ch2 全为满阵
  if (dch === 3 && q.kind !== 'gridmiss' && q.kind !== 'dual') return 'dch3kind';  // ch3 两子型
  if (q.scene[q.ask] !== q.n) return 'sceneAsk';
  if (q.opts.length !== 4) return 'len';
  const nums = q.opts.map(o => o.num);
  if (nums.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'dup';
  if (!nums.every(x => x >= 1 && x <= 20)) return 'range';
  if (nums.filter(x => x === q.n).length !== 1) return 'ansN';
  if (q.answer !== nums.indexOf(q.n)) return 'ansIdx';
  if (nums.slice().sort().join() !== numSet(q.n).slice().sort().join()) return 'numSet';  // 候选=数学先验集
  if (prevQ && prevQ.kind === q.kind) {                            // 同型相邻互异
    const ka = prevQ.kind === 'dual' ? prevQ.ask
             : prevQ.kind === 'count' || prevQ.kind === 'grid' || prevQ.kind === 'gridmiss' ? prevQ.ask : '';
    const kb = q.kind === 'dual' ? q.ask : q.ask;
    if (ka === kb) return 'adjacent';
  }
  /* 槽位/阵列格一致：_place 数=scene 总数；散点槽互异界内；阵列格=满格-缺格 */
  const tot = Object.keys(q.scene).reduce((s, k) => s + q.scene[k], 0);
  if (q._place.length !== tot) return 'placeN';
  if (q.kind === 'grid' || q.kind === 'gridmiss') {
    const want = {};
    for (let i = 0; i < q.rows * q.cols; i++) want[i] = !(q.miss && q.miss.indexOf(i) >= 0);
    const got = {};
    q._place.forEach(p => { const idx = p.row * q.cols + p.cp; got[idx] = true; });
    for (let i = 0; i < q.rows * q.cols; i++) if (want[i] !== !!got[i]) return 'placeGrid';
    if (q._place.some(p => p.shape !== q.ask)) return 'placeShape';
  } else {
    const slots = q._place.map(p => p.slot);
    if (slots.filter((v, i, a) => a.indexOf(v) === i).length !== tot) return 'placeDup';
    if (!slots.every(s => s >= 0 && s < N_SLOTS)) return 'placeRange';
    const want = {};
    Object.keys(q.scene).forEach(k => {
      const shape = k.indexOf(':') > 0 ? k.split(':')[0] : k;
      const fill = k.indexOf(':') > 0 ? k.split(':')[1] : null;
      const key = shape + (fill ? '|' + fill : '');
      want[key] = (want[key] || 0) + q.scene[k];
    });
    const got = {};
    q._place.forEach(p => { const key = p.shape + (p.fill ? '|' + p.fill : ''); got[key] = (got[key] || 0) + 1; });
    if (Object.keys(want).some(k => want[k] !== got[k])) return 'placeIds';
  }
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
