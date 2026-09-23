/* ================= countchick 纯引擎：确定性关卡生成 + 点数/比较/快数判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-BATCH5 §-r19；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 count 11-14 只 / dch2 count 15-20 只 + 2-4 只干扰（小鸭/小兔）只数小鸡
   dch3 compare 小鸡 7-12（恒多的一方）− 小鸭，差值 1-5，问「多几只/少几只」
   dch4 flash 8-16 只短时呈现估计（flashMs=FLASH_A+n*FLASH_B，选项间距 3）
   答案干扰项：count=N±1/N±2；compare=diff±1/diff±2；flash=N±3（估计容差判分，SPEC §-r19）
   位置撒点 scatterPts 在渲染像素空间做（中心距 ≥ 章 D，≥90px） */
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

/* ---------- 答案干扰项：候选池按 |差| 升序，滤非正/互异取前二（count/compare 共用近邻口径）
   count n≥11 恒有 n-1,n+1,n-2,n+2；compare diff≥1 恒有 diff+1,diff-1（diff=1 时 diff-1=0 滤除→diff+2） */
function distractorsOf(n) {
  const pool = [];
  [n - 1, n + 1, n - 2, n + 2].forEach(v => { if (v > 0 && v !== n && pool.indexOf(v) < 0) pool.push(v); });   /* 5 岁半试玩 P2：排除 0（0 概念不稳） */
  return pool.slice(0, 2);
}
/* flash 估计干扰：N±3 恒正（N≥8）恒互异——估计落在 ±1.5 内唯一映射正确项（SPEC §-r19 判分口径） */
function flashDistractorsOf(n) {
  return [n - 3, n + 3];
}

/* ---------- 位置撒点（渲染像素空间，确定性纯函数：同 (seed,W,H,n,D) 同布局）
   拒绝采样：每点最多 160 试，全部失败按 0.92 逐级放宽兜底（标准 viewport 下 n≤24 恒不需放宽）
   返回 [{x,y}...]（场内中心坐标，已含 margin 收缩）；两群/混养同流撒点=排列随机化（防数格子捷径） */
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
      if (!placed) d *= 0.92;                    // 极小场地兜底（verify 断言标准 viewport ≥90px 不触发）
    }
    if (!placed) pts.push({ x: Math.round(W / 2), y: Math.round(H / 2) }); // 理论不可达保险
  }
  return pts;
}
const mkChicks = (rnd, n) => {
  const a = [];
  for (let i = 0; i < n; i++) a.push({ f: rnd() < 0.5 ? 1 : 0, e: rnd() < 0.18 ? 1 : 0, s: Math.round((94 + rnd() * 12)) / 100 });
  return a;
};

/* ---------- 单题生成（rnd 全程同流保证确定性；lastKey=避免与上一题同关键量） ---------- */
function genOne(dch, qi, rnd, lastKey) {
  const C = CHAPTERS[dch];
  if (C.kind === 'compare') {
    /* 两群比较：小鸡恒为多的一方（clip 封闭两句：多几/少几两种问法随机），差值域 [dMin,dMax] */
    let n = ri(rnd, C.nMin, C.nMax), diff = ri(rnd, C.dMin, C.dMax);
    for (let t = 0; t < 8 && 'c' + n + '-' + diff === lastKey; t++) { n = ri(rnd, C.nMin, C.nMax); diff = ri(rnd, C.dMin, C.dMax); }
    const m = n - diff;
    const dir = rnd() < 0.5 ? 'more' : 'less';     // 问法方向（答案同为 diff：多几/少几互逆表述）
    const items = shuffled([diff].concat(distractorsOf(diff)), rnd);
    return { type: 'compare', n: n, m: m, diff: diff, dir: dir, items: items, answer: items.indexOf(diff),
      chicks: mkChicks(rnd, n), ducks: mkChicks(rnd, m), others: [],
      seed: 0, _cnt: 0, _cntD: 0, _badges: [], _badgesD: [] };
  }
  if (C.kind === 'flash') {
    /* 限时快数：短时呈现估计，选项 N-3/N/N+3；无点数角标（估计任务禁逐格数） */
    let n = ri(rnd, C.nMin, C.nMax);
    for (let t = 0; t < 8 && 'f' + n === lastKey; t++) n = ri(rnd, C.nMin, C.nMax);
    const items = shuffled([n].concat(flashDistractorsOf(n)), rnd);
    return { type: 'flash', n: n, items: items, answer: items.indexOf(n),
      chicks: mkChicks(rnd, n), others: [], flashMs: FLASH_A + n * FLASH_B,
      seed: 0, _cnt: 0, _badges: [], _resees: 0 };
  }
  /* count：单群点数 11-20（dch2 混入干扰动物只数小鸡） */
  let n = ri(rnd, C.nMin, C.nMax);
  for (let t = 0; t < 8 && 'c' + n === lastKey; t++) n = ri(rnd, C.nMin, C.nMax);
  const others = [];
  if (C.mix) {
    const nd = ri(rnd, D_MIN, D_MAX);
    for (let i = 0; i < nd; i++) others.push({ kind: rnd() < 0.5 ? 'duck' : 'bunny', f: rnd() < 0.5 ? 1 : 0, e: rnd() < 0.2 ? 1 : 0 });
  }
  const items = shuffled([n].concat(distractorsOf(n)), rnd);
  return { type: 'count', n: n, items: items, answer: items.indexOf(n),
    chicks: mkChicks(rnd, n), others: others, seed: 0, _cnt: 0, _badges: [] };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const quizzes = [];
  let lastKey = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, lastKey);
    q.seed = (flat * 5 + qi) * 7919 + 13;         // 撒点专用种子（渲染期独立流，同题同尺寸同布局）
    lastKey = q.type === 'compare' ? 'c' + q.n + '-' + q.diff : q.type[0] + q.n;
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点数引擎（无 DOM）：engTap(L, i, 'c'|'d') —— 已数过的再点不增号
   返回本次点数角标号；i 非法或题已判返回 null；返回 0 = 该动物已数过（只跳不增号）
   compare 双群各自独立计数（_badges 小鸡 / _badgesD 小鸭），count 模式 d 组恒空 */
function engTap(L, i, grp) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  const pool = grp === 'd' ? q.ducks : q.chicks;
  if (!pool || i < 0 || i >= pool.length) return null;
  const badges = grp === 'd' ? (q._badgesD = q._badgesD || []) : (q._badges = q._badges || []);
  if (badges[i]) return 0;                        // 已数过：只跳不增号
  const cntKey = grp === 'd' ? '_cntD' : '_cnt';
  q[cntKey] = (q[cntKey] || 0) + 1;
  badges[i] = q[cntKey];
  return q[cntKey];
}
/* ---------- 重新数：清零当前题全部角标（两群一起清） ---------- */
function engRecount(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  const had = (q._cnt || 0) > 0 || (q._cntD || 0) > 0;
  q._cnt = 0; q._cntD = 0; q._badges = []; q._badgesD = [];
  return had;
}
/* ---------- 答题引擎（无 DOM）：i = 答案按钮下标
   'right' 答对推进 / 'done' 最后一题答对通关 / 'wrong' 首次点错（该按钮灰掉、计重试）
   'again' 点已灰按钮 / null 非法或关卡已结束 ---------- */
function engPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  q.wrong = q.wrong || [];
  if (i === q.answer) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  if (q.wrong.indexOf(i) >= 0) return 'again';
  q.wrong.push(i);
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关全对（retries=0）=3 星；总重试 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 认知时长模型（SPEC §-r19 §4：与 game-data 常量联动，verify/selftest 双钉） ---------- */
function decideOf(q) {
  if (q.type === 'compare') return CMP_BASE + TAP_MS * (q.n + q.m);
  if (q.type === 'flash') return FLASH_BASE + q.flashMs;
  return COUNT_BASE + TAP_MS * q.n;
}
function qwinOf(q) {
  if (q.type === 'compare') return QWIN_CMP;
  if (q.type === 'flash') return QWIN_FLASH;
  return 0;
}
/* modeledMs(flat) = 关入场窗 + Σ(问句窗 + 认知 + 答对演出 + 题间渲染)。纯函数，与 UI 演出窗同源 */
function modeledMs(flat) {
  const L = genLevel(flat);
  let t = INTRO_MS;
  for (let k = 0; k < L.quizzes.length; k++) t += qwinOf(L.quizzes[k]) + decideOf(L.quizzes[k]) + RIGHT_MS + GAP_MS;
  return t;
}

/* ---------- 结构校验（verify 用）：answer 在 items 中且唯一、选项无重复、干扰项规则按题型合规 ---------- */
function structOk(q) {
  if (!q || !q.items || q.items.length !== 3) return false;
  if (q.answer < 0 || q.answer >= q.items.length) return false;
  const truth = q.type === 'compare' ? q.diff : q.n;
  if (q.items[q.answer] !== truth) return false;
  for (let i = 0; i < q.items.length; i++) {
    for (let j = i + 1; j < q.items.length; j++) if (q.items[i] === q.items[j]) return false;
  }
  const ds = q.items.filter((v, i) => i !== q.answer);
  if (q.type === 'flash') return ds.indexOf(truth - 3) >= 0 && ds.indexOf(truth + 3) >= 0;   // 估计容差间距 3（与撒点顺序无关）
  const dOk = ds.every(v => v >= 0 && v !== truth && Math.abs(v - truth) <= 2) && ds[0] !== ds[1];
  return dOk;
}
