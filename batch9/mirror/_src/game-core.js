/* ================= mirror 纯引擎：确定性关卡生成 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-BATCH9 §2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 竖轴 4×4 + 对称图案（星/花/爱心/圆/方）——dst=src 镜像位贴同图案，建立"等距镜像"概念
   dch2 竖轴 4×4 + 不对称图案（旗/鱼/月牙/靴子/扫帚）——候选=[镜像形,原形,干扰]，
        原形干扰是镜像训练灵魂：孩子必须认出"镜子里的样子"方向相反
   dch3 竖轴 5×5 + 多色——图案×颜色双维干扰（同形不同色 / 同色原形）
   dch4 横轴（上下镜像，认知转换）+ 竖横混合 + 规格 4/5 混合；生成关=随机轴+随机规格+随机布点
   镜像数学：竖轴 col c ↔ N-1-c；横轴 row r ↔ N-1-r（verify 断言 dst 坐标）
   规则铁律：options 含 answer（同引用）且按 mid+color+mirrored 键互异；
   answer.mid/color=src 贴纸同款；dch2+ answer.mirrored=true 且含原形干扰（mirrored=false 同 mid 同色） */
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

/* ---------- 镜像数学（verify 断言的唯一定义点） ---------- */
function mirrorOf(axis, N, r, c) {
  return axis === 'v' ? { r: r, c: N - 1 - c } : { r: N - 1 - r, c: c };
}
/* 源侧格集合（v：左半 c<half / h：上半 r<half；轴线上无格） */
function srcSideCells(axis, N) {
  const half = Math.floor(N / 2), out = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (axis === 'v' ? c < half : r < half) out.push({ r: r, c: c });
  return out;
}

/* ---------- 章 → 轴/规格/牌库（静态 20 关显式定；生成关按同规则随机） ---------- */
function chSpec(dch, lv, rnd) {
  if (dch === 1) return { axis: 'v', N: 4, pool: SYM_KEYS };
  if (dch === 2) return { axis: 'v', N: 4, pool: ASYM_KEYS };
  if (dch === 3) return { axis: 'v', N: 5, pool: ASYM_KEYS };
  /* dch4：横轴为主 + 竖横混合 + 规格 4/5 混合（静态关 lv 定，生成关 rnd 定） */
  const axis = rnd ? (rnd() < 0.5 ? 'h' : 'v') : (lv % 2 === 0 ? 'h' : 'v');
  const N = rnd ? (rnd() < 0.5 ? 4 : 5) : (lv < 3 ? 4 : 5);
  return { axis: axis, N: N, pool: ASYM_KEYS };
}

/* ---------- 单题生成：源格 src 贴纸 → 镜像位 dst 候选三张
   dch1: [同图案, 对称图案干扰 ×2]（对称图案镜像不变，认"位置等距"）
   dch2: [镜像形, 原形, 异图案干扰]（原形=镜像训练灵魂）
   dch3: [镜像形+源色, 原形+源色, 镜像形+异色]（形×色双维干扰）
   dch4: 同 dch2 结构（轴/规格混合） ---------- */
function genOne(dch, spec, src, rnd) {
  const pool = spec.pool;
  const mid = pool[Math.floor(rnd() * pool.length)];
  const color = PALETTE[Math.floor(rnd() * PALETTE.length)];
  const dst = mirrorOf(spec.axis, spec.N, src.r, src.c);
  const pickColor = () => PALETTE[Math.floor(rnd() * PALETTE.length)];
  let answer, options;
  if (dch === 1) {                                       // 章 1：对称图案贴同款
    answer = { mid: mid, color: color, mirrored: false };
    const others = shuffled(pool.filter(m => m !== mid), rnd).slice(0, 2);
    options = [answer,
      { mid: others[0], color: pickColor(), mirrored: false },
      { mid: others[1], color: pickColor(), mirrored: false }];
  } else if (dch === 3) {                                // 章 3：形×色双维干扰
    const oc = shuffled(PALETTE.filter(cl => cl !== color), rnd)[0];
    answer = { mid: mid, color: color, mirrored: true };
    options = [answer,
      { mid: mid, color: color, mirrored: false },       // 原形干扰（同形同色，方向相反）
      { mid: mid, color: oc, mirrored: true }];          // 异色干扰（同形镜像，颜色不同）
  } else {                                               // 章 2/4：原形干扰 + 异图案干扰
    const dm = shuffled(pool.filter(m => m !== mid), rnd)[0];
    answer = { mid: mid, color: color, mirrored: true };
    options = [answer,
      { mid: mid, color: color, mirrored: false },       // 原形干扰（镜像训练灵魂）
      { mid: dm, color: pickColor(), mirrored: true }];
  }
  options = shuffled(options, rnd);
  return { axis: spec.axis, N: spec.N, src: { r: src.r, c: src.c }, dst: dst,
    mid: mid, color: color, answer: answer, options: options, _miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   源侧洗牌取前 5 格 = 本关 5 个镜像目标（互异、分布均匀） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const spec = chSpec(dch, lv, flat >= STATIC_LEVELS ? rnd : null);
  const cells = shuffled(srcSideCells(spec.axis, spec.N), rnd).slice(0, CH_LEN);
  const quizzes = cells.map(src => genOne(dch, spec, src, rnd));
  return { flat, ch, dch, lv, axis: spec.axis, N: spec.N, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点第 i 张候选卡
   'right' = 贴对（题继续）；'done' = 末题贴对（通关）；'wrong' = 贴错（灰掉，计错点）；
   'again' = 点已灰卡（早退零惩罚不计数）；null = 非法/关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || i < 0 || i >= q.options.length) return null;
  if (q._dead && q._dead[i]) return 'again';              // 已灰选项：早退（防御层 §0.7）
  if (q.options[i] === q.answer) {
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
  L.retries++;                                            // 错点次数（星级判据）
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点=3 星；错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);
const correctIdx = q => q.options.indexOf(q.answer);
/* 候选卡唯一键（互异判据） */
const optKey = o => o.mid + '|' + o.color + '|' + (o.mirrored ? 1 : 0);

/* ---------- 结构校验（verify 用）：轴/规格/镜像坐标/候选不变式/贴纸与源格一致 ---------- */
function structOk(q, dch) {
  if (!q || (q.axis !== 'v' && q.axis !== 'h')) return false;
  if (q.N !== 4 && q.N !== 5) return false;
  if (!q.src || !q.dst || !q.answer || !q.options) return false;
  const m = mirrorOf(q.axis, q.N, q.src.r, q.src.c);
  if (m.r !== q.dst.r || m.c !== q.dst.c) return false;   // dst=src 镜像位（核心断言）
  const half = Math.floor(q.N / 2);
  if (q.axis === 'v' ? !(q.src.c < half && q.dst.c >= half) : !(q.src.r < half && q.dst.r >= half))
    return false;                                         // src 在源侧 / dst 在镜像侧
  if (q.options.length !== 3) return false;
  if (q.options.indexOf(q.answer) < 0) return false;      // answer 必在候选中（同引用）
  for (let i = 0; i < 3; i++)
    for (let j = i + 1; j < 3; j++)
      if (optKey(q.options[i]) === optKey(q.options[j])) return false;   // 候选互异
  if (q.answer.mid !== q.mid || q.answer.color !== q.color) return false;   // 贴纸=源格同款
  const pool = dch === 1 ? SYM_KEYS : ASYM_KEYS;
  if (pool.indexOf(q.mid) < 0) return false;              // 图案取自本章牌库
  for (const o of q.options) if (pool.indexOf(o.mid) < 0) return false;
  if (dch === 1) {                                        // 章 1：对称图案 + 全原形
    if (q.answer.mirrored) return false;
  } else {                                                // 章 2+：answer=镜像形 + 含原形干扰
    if (!q.answer.mirrored) return false;
    if (!q.options.some(o => !o.mirrored && o.mid === q.mid && o.color === q.color)) return false;
  }
  return true;
}
