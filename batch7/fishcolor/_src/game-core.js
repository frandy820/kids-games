/* ================= fishcolor 纯引擎：确定性关卡生成 + 钓鱼判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（r7 改造，SPEC-BATCH7 §1 r7 块；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 单色：基础 4 色，6-8 鱼，K=2-3，干扰 2-3
   dch2 两步序：两目标先后（need 组合和 2-3），6-9 鱼，黑白干扰 ≥1，无近似干扰（序记忆为主负荷）
   dch3 间色：橙=红+黄/绿=黄+蓝/紫=红+蓝，成分各 2 条+非成分干扰，6-8 鱼，场上无间色目标鱼
   dch4 混排：TYPE_PATTERNS[lv%3] 轮换三题型（single K=3 近似干扰 ≥2 / two 和 3-4 / mix），
     8-10 鱼；生成关=同通道 dch 循环
   规则铁律：每步目标色鱼数 ≥ need；干扰色绝不与目标色同名；间色题场上绝无间色鱼 */
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
/* 进度章号单调递增（与 keyOf/写档一致，杜绝生成关软锁）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 当题当前步（两步序/间色分步执行）：第一个 got<need 的下标；全钓满 = -1 ---------- */
function engActive(q) {
  for (let k = 0; k < q.targets.length; k++) {
    if ((q.got[k] || 0) < q.need[k]) return k;
  }
  return -1;
}
/* 干扰鱼总数（色不在 targets 中的鱼） */
const engDistract = q => q.fishes.filter(f => q.targets.indexOf(f.c) < 0).length;
/* 近似色干扰鱼数（色与任一目标构成近似对） */
const engNearFish = q => q.fishes.filter(f =>
  q.targets.indexOf(f.c) < 0 && q.targets.some(t => isNearPair(t, f.c))).length;

/* ---------- 题型常量（r7） ---------- */
const DUAL_NEEDS = [[1, 1], [2, 1], [1, 2]];        // dch2 两步序（和 2-3）
const DUAL_NEEDS4 = [[2, 1], [1, 2], [2, 2]];       // dch4 两步序（和 3-4）
const MIX_KEYS = ['orange', 'green', 'purple'];
const TYPE_PATTERNS = [                             // dch4 每关三题型轮换（每关三型各 ≥1）
  ['single', 'two', 'mix', 'two', 'single'],
  ['two', 'mix', 'single', 'mix', 'two'],
  ['mix', 'single', 'two', 'single', 'mix']
];

/* ---------- 单题生成（rnd 同流保证确定性；lastC=避免与上一题主目标色相同）
   返回 { kind('single'|'two'|'mix'), mix, shortMix, targets, need, got, fishes } */
function genOne(dch, qi, rnd, lastC, lv) {
  const pool = POOLS[dch];
  let t1 = pool[Math.floor(rnd() * pool.length)];
  for (let t = 0; t < 8 && lastC && t1 === lastC; t++) t1 = pool[Math.floor(rnd() * pool.length)];
  const others = pool.filter(c => c !== t1);
  let targets = [t1], need = [0], mix = null, shortMix = false;
  let tN1 = 0, tN2 = 0, distr = [];

  if (dch === 1) {                                   // 章 1：单色，6-8 鱼，K=2-3
    const C = CHAPTERS[1];
    const K = ri(rnd, 2, 3), total = ri(rnd, C.tMin, C.tMax);
    const dn = ri(rnd, 2, Math.min(3, total - K));
    need = [K]; tN1 = total - dn;
    distr = shuffled(others, rnd).slice(0, dn);
  } else if (dch === 2) {                            // 章 2：两步序，6-9 鱼，黑白 ≥1，无近似干扰
    const C = CHAPTERS[2];
    const t2 = others[Math.floor(rnd() * others.length)];
    const nd = DUAL_NEEDS[Math.floor(rnd() * DUAL_NEEDS.length)];
    const bwPick = shuffled(['black', 'white'], rnd).slice(0, ri(rnd, 1, 2));
    const restPool = shuffled(pool.filter(c =>
      c !== t1 && c !== t2 && !isNearPair(c, t1) && !isNearPair(c, t2)), rnd);
    /* 总数恒落 [tMin,tMax]：先定干扰 dn，再按剩余区间定目标鱼数（防 clamp 掉下界） */
    const base = nd[0] + nd[1];
    const dn = Math.min(ri(rnd, 2, 4), bwPick.length + restPool.length, C.tMax - base - 1);
    const lo = Math.max(base, C.tMin - dn), hi = C.tMax - dn;
    const tn = lo + Math.floor(rnd() * (hi - lo + 1));
    const extra = tn - base, e1 = ri(rnd, 0, extra), e2 = extra - e1;
    targets = [t1, t2]; need = [nd[0], nd[1]];
    tN1 = nd[0] + e1; tN2 = nd[1] + e2;
    distr = bwPick.concat(restPool.slice(0, Math.max(0, dn - bwPick.length)));
  } else if (dch === 3) {                            // 章 3：间色合成，6-8 鱼，成分各 2 条
    const C = CHAPTERS[3];
    let mk = MIX_KEYS[Math.floor(rnd() * MIX_KEYS.length)];
    for (let t = 0; t < 8 && lastC && MIXES[mk][0] === lastC; t++) mk = MIX_KEYS[Math.floor(rnd() * MIX_KEYS.length)];
    targets = MIXES[mk].slice(); need = [1, 1]; mix = mk;
    tN1 = 2; tN2 = 2;
    const rem = pool.filter(c => targets.indexOf(c) < 0)[0];   // 非成分原色（恰一种）
    const extras = shuffled(['pink', 'black', 'white'], rnd);
    const dn = ri(rnd, 2, 4);                                  // rem 1 + extras dn-1 → 总 6-8
    distr = [rem].concat(extras.slice(0, dn - 1));
  } else {                                           // 章 4：混排三题型，8-10 鱼
    const C = CHAPTERS[4];
    const kind = TYPE_PATTERNS[lv % 3][qi];
    if (kind === 'single') {                         // 单色 K=3 + 近似干扰 ≥2（t1 必带近似色）
      for (let t = 0; t < 8 && !nearOf(t1).some(c => pool.indexOf(c) >= 0 && c !== t1); t++) {
        t1 = pool[Math.floor(rnd() * pool.length)];
      }
      const oth4 = pool.filter(c => c !== t1);       // t1 重取后重算（防 others 过期混入目标色）
      const near = nearOf(t1).filter(c => oth4.indexOf(c) >= 0);
      const total = ri(rnd, C.tMin, C.tMax);
      need = [3]; tN1 = 3 + ri(rnd, 0, 1);
      const dn = total - tN1;
      distr = near.length === 1 ? [near[0], near[0]] : near.slice(0, 2);
      const rest = shuffled(oth4.filter(c => distr.indexOf(c) < 0), rnd);
      distr = distr.concat(rest.slice(0, Math.max(0, dn - distr.length)));
    } else if (kind === 'two') {                     // 两步序（和 3-4）
      const t2 = others[Math.floor(rnd() * others.length)];
      const nd = DUAL_NEEDS4[Math.floor(rnd() * DUAL_NEEDS4.length)];
      const restPool = shuffled(pool.filter(c => c !== t1 && c !== t2), rnd);
      const base = nd[0] + nd[1];
      const dn = Math.min(ri(rnd, 2, 5), restPool.length, C.tMax - base - 1);
      const lo = Math.max(base, C.tMin - dn), hi = C.tMax - dn;
      const tn = lo + Math.floor(rnd() * (hi - lo + 1));
      const extra = tn - base, e1 = ri(rnd, 0, extra), e2 = extra - e1;
      targets = [t1, t2]; need = [nd[0], nd[1]];
      tN1 = nd[0] + e1; tN2 = nd[1] + e2;
      distr = restPool.slice(0, dn);
    } else {                                         // 间色（复习短句）
      let mk = MIX_KEYS[Math.floor(rnd() * MIX_KEYS.length)];
      for (let t = 0; t < 8 && lastC && MIXES[mk][0] === lastC; t++) mk = MIX_KEYS[Math.floor(rnd() * MIX_KEYS.length)];
      targets = MIXES[mk].slice(); need = [1, 1]; mix = mk; shortMix = true;
      tN1 = 2; tN2 = 2;
      const rem = POOLS[3].filter(c => targets.indexOf(c) < 0)[0];
      const extras = shuffled(['pink', 'black', 'white'], rnd);
      const dn = ri(rnd, 4, 5);                                 // rem 1 + extras → 总 8-9
      distr = [rem].concat(extras.slice(0, dn - 1));
    }
  }

  /* 鱼色列表（目标色 tN1+tN2 条 + 干扰 distr 条）→ 洗牌 → 逐条生成姿态参数
     （mix 题 targets[0] ≠ 初始 t1——一律按 targets 取色，两步/单色不受影响） */
  const cols = [];
  for (let i = 0; i < tN1; i++) cols.push(targets[0]);
  for (let i = 0; i < tN2; i++) cols.push(targets[1]);
  distr.forEach(c => cols.push(c));
  const fishes = shuffled(cols, rnd).map(c => ({
    c: c, f: rnd() < 0.5 ? 1 : 0, e: rnd() < 0.15 ? 1 : 0,
    s: Math.round(94 + rnd() * 12) / 100, w1: rnd(), w2: rnd()
  }));
  return { kind: mix ? 'mix' : (need.length > 1 ? 'two' : 'single'),
    mix: mix, shortMix: shortMix,
    targets: targets, need: need, got: need.map(() => 0),
    fishes: fishes, seed: 0, _cnt: 0, _gone: [], _miss: 0 };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const quizzes = [];
  let lastC = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, lastC, lv);
    q.seed = (flat * 5 + qi) * 7919 + 13;           // 撒点专用种子（渲染期独立流，同题同尺寸同布局）
    lastC = q.targets[0];
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 钓鱼引擎（无 DOM）：engTapFish(L, i) —— 点第 i 条鱼
   返回数值 = 钓起（本题累计钓起数 1..K，题继续）；
   'done' = 最后一钓本题完成（末题则通关）；'wrong' = 点非目标色鱼（躲开，计错点）；
   'again' = 点已钓起的鱼（早退零惩罚不计数）；null = 非法/关卡已结束
   两步序/间色：未到当前步的目标色鱼一律 'wrong'（顺序须自行记住，按序完成才过题） ---------- */
function engTapFish(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || i < 0 || i >= q.fishes.length) return null;
  q._gone = q._gone || [];
  if (q._gone[i]) return 'again';
  const act = engActive(q);
  if (act < 0) return 'again';
  if (q.fishes[i].c === q.targets[act]) {
    q._gone[i] = 1;
    q.got[act] = (q.got[act] || 0) + 1;
    q._cnt = (q._cnt || 0) + 1;
    if (engActive(q) < 0) {                          // 本题钓满：推进
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return 'done';
    }
    return q._cnt;
  }
  q._miss = (q._miss || 0) + 1;
  L.retries++;                                       // 错点次数（星级判据：0=3★ / 1-2=2★ / 更多=1★）
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点=3 星；错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：kind/目标数形状、need 1-3、目标色互异、
   每步目标色鱼数 ≥need、间色题 targets=配方序且场上绝无间色鱼 */
function structOk(q) {
  if (!q || !q.targets || !q.targets.length) return false;
  if (q.need.length !== q.targets.length || q.got.length !== q.targets.length) return false;
  const shapeOk = (q.kind === 'single' && q.targets.length === 1) ||
    ((q.kind === 'two' || q.kind === 'mix') && q.targets.length === 2);
  if (!shapeOk) return false;
  for (let k = 0; k < q.targets.length; k++) {
    if (!COLORS[q.targets[k]]) return false;
    if (!(q.need[k] >= 1 && q.need[k] <= 3)) return false;
    if (q.got[k] !== 0) return false;
    for (let j = k + 1; j < q.targets.length; j++) if (q.targets[k] === q.targets[j]) return false;
  }
  if (!q.fishes.length) return false;
  if (q.kind === 'mix') {                            // 间色：配方在册、targets=配方序、场上无间色鱼
    if (!MIXES[q.mix]) return false;
    if (q.targets[0] !== MIXES[q.mix][0] || q.targets[1] !== MIXES[q.mix][1]) return false;
    for (let i = 0; i < q.fishes.length; i++) if (q.fishes[i].c === q.mix) return false;
  }
  const targetCount = {};
  q.targets.forEach(t => targetCount[t] = 0);
  for (let i = 0; i < q.fishes.length; i++) {
    if (!COLORS[q.fishes[i].c]) return false;
    if (targetCount[q.fishes[i].c] != null) targetCount[q.fishes[i].c]++;
  }
  for (let k = 0; k < q.targets.length; k++) {       // 每步目标色鱼数 ≥ need（钓起后仍够数）
    if (targetCount[q.targets[k]] < q.need[k]) return false;
  }
  return true;
}

/* ---------- 位置撒点（渲染像素空间，确定性纯函数：同 (seed,W,H,n,D) 同布局）——照 batch5/6
   拒绝采样：每点最多 160 试，全部失败按 0.92 逐级放宽兜底（标准 viewport 下 n≤10 恒不需放宽）
   返回 [{x,y}...]（场内中心坐标，已含 margin 收缩） */
function scatterPts(rnd, W, H, n, D, margin) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    let placed = false, d = D, guard = 0;
    while (!placed && guard++ < 24) {
      for (let t = 0; t < 160 && !placed; t++) {
        const x = margin + rnd() * Math.max(1, W - 2 * margin);
        const y = margin + rnd() * Math.max(1, H - 2 * margin);
        let ok = true;
        for (let k = 0; k < pts.length; k++) {
          const dx = pts[k].x - x, dy = pts[k].y - y;
          if (dx * dx + dy * dy < d * d) { ok = false; break; }
        }
        if (ok) { pts.push({ x: Math.round(x), y: Math.round(y) }); placed = true; }
      }
      if (!placed) d *= 0.92;                        // 极小场地兜底（verify 断言标准 viewport ≥90px 不触发）
    }
    if (!placed) pts.push({ x: Math.round(W / 2), y: Math.round(H / 2) }); // 理论不可达保险
  }
  return pts;
}
