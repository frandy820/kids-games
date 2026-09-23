/* ================= subbug 纯引擎：确定性关卡生成 + 放飞计数 + 答题判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（r30 谱，SPEC-R30-SUBBUG §R2——与 SPEC-BATCH6 §3 冲突处以 SPEC-R30 为准）：
   dch1 8 以内（n 4-8，m 1..n-1，剩余 ≥1）——支架教学章（点虫放飞数剩全套保留，教学链零改动）
   dch2 10 以内（n 6-10，剩余 ≥1）——盲飞章（先答后飞，UI 层门，引擎不区分）
   dch3 20 以内跨十（n 12-20；qi0/qi3 强制跨十，qi2 强制"全飞走"答案 0）——盲飞章
   dch4 一步题 n 9-14 + 干扰瓢虫 2-4 只（n 不播报：选择性计数，只数绿虫自得 n）
        两步加减混合 ×2/关（qi1=先减后加 A、qi3=先加后减 B，无瓢虫、n 播报）
   跨十定义：一步题 m 的个位 > n 的个位（15-7 型借位减法）；
        两步题 = 两步中至少一步跨十（见 CANDS_DUAL 注释）
   答案干扰项：一步题 = 答案±1/±2（互异、>0：答案=0 时为 {1,2}，答案>0 时绝不给 0——§0.17）；
        两步题 = {中间态 s, 答案±1}（A 恒 answer+1、B 恒 answer-1——两型互补，答案恒非极值，
        防"选最大/最小"启发式；s=第一步结果，即经典"忘第二步"错误捕获器） */
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

/* ---------- 答案干扰项：候选池按 |差| 升序（r-1,r+1,r-2,r+2），滤正值/互异取前二
   r=0 → 1,2 / r=1 → 2,3 / r=2 → 1,3——全部落在 r±2 内、互异、且永不为 0（§0.17） */
function distractorsOf(r) {
  const pool = [];
  [r - 1, r + 1, r - 2, r + 2].forEach(v => { if (v > 0 && v !== r && pool.indexOf(v) < 0) pool.push(v); });
  return pool.slice(0, 2);
}

/* ---------- 候选 (n,m) 全集（按章规则离线枚举，生成时只做过滤+抽取，天然确定性）
   dch≤2：m∈1..n-1（剩余 ≥1）；dch3：m∈1..n（允许剩余=0）；dch4 一步题：m∈1..n-1（剩余 ≥1）
   r30：dch1 域 4-8（原 2-5）、dch4 一步题域 9-14（原 12-17，n 改自数故下调保计数负荷合理） */
const CANDS = {};
(function buildCands() {
  for (let d = 1; d <= 4; d++) {
    const C = CHAPTERS[d], list = [];
    for (let n = C.nMin; n <= C.nMax; n++) {
      const mMax = d === 3 ? n : n - 1;
      for (let m = 1; m <= mMax; m++) {
        list.push({ n: n, m: m, r: n - m, cross: (m % 10) > (n % 10) });
      }
    }
    CANDS[d] = list;
  }
})();

/* ---------- 两步加减混合候选池（r30 新增，dch4 qi1/qi3 固定槽位——r24 固定谱先例）
   A=先减后加：叶子 n 只 → 飞走 b 只 → 又飞来 c 只 → 还剩 n-b+c（m=b、flyIn=c）
   B=先加后减：叶子 n 只 → 飞来 b 只 → 又飞走 c 只 → 还剩 n+b-c（m=c、flyIn=b）
   跨十约束（两步至少一步）：A = b 个位>n 个位 或 (n-b)个位+c>9；B = n个位+b个位>9 或 c个位>(n+b)个位
   域：A n 10-15/b 2-6/c 2-4/s=n-b≥5/答案 6-17；B n 10-14/b 2-4/c 2-6/c≠b(答案≠n)/
       n+b≤18/答案 ≥6；人教版一上"连加连减/加减混合"单元正主（10 以内起步、此处 20 以内深化） */
const CANDS_DUAL = { A: [], B: [] };
(function buildDualCands() {
  for (let n = 10; n <= 15; n++) {
    for (let b = 2; b <= 6; b++) {
      for (let c = 2; c <= 6; c++) {
        if (b <= 4 && c !== b && n + b <= 18 && n + b - c >= 6 &&
            ((n % 10) + (b % 10) > 9 || (c % 10) > ((n + b) % 10))) {
          CANDS_DUAL.B.push({ n: n, b: b, c: c, s: n + b, answer: n + b - c });
        }
        if (c <= 4 && n - b >= 5 &&
            ((b % 10) > (n % 10) || (((n - b) % 10) + c > 9))) {
          CANDS_DUAL.A.push({ n: n, b: b, c: c, s: n - b, answer: n - b + c });
        }
      }
    }
  }
})();

/* ---------- 单题生成（rnd 同流保证确定性；lastAns=避免与上一题答案相同——pool 过滤保证恒成立）
   ch3 题内模式：qi0/qi3=跨十、qi2=全飞走（答案 0），qi1/qi4=普通（剩余 ≥1）
   ch4 题内槽位（r30）：qi1=dual A、qi3=dual B，其余一步题（带瓢虫、n 不播报） */
function genOne(dch, qi, rnd, lastAns) {
  if (dch === 4 && (qi === 1 || qi === 3)) return genDual(qi === 1 ? 'A' : 'B', rnd, lastAns);
  const wantCross = dch === 3 && (qi === 0 || qi === 3);
  const wantZero = dch === 3 && qi === 2;
  let pool = CANDS[dch].filter(c =>
    (wantCross ? c.cross : true) && (wantZero ? c.r === 0 : c.r > 0));
  let p = lastAns == null ? pool : pool.filter(c => c.r !== lastAns);
  if (!p.length) p = pool;                       // 理论不可达（各池答案值 ≥2 种）
  const c = p[Math.floor(rnd() * p.length)];
  const bugs = [];
  for (let i = 0; i < c.n; i++) {
    bugs.push({ f: rnd() < 0.5 ? 1 : 0, e: rnd() < 0.18 ? 1 : 0,        // 朝向/眨眼
      s: Math.round(94 + rnd() * 12) / 100, g: Math.floor(rnd() * 3) }); // 0.94-1.06 尺寸/绿色档
  }
  const ladybugs = [];
  if (dch === 4) {                                // 章 4 一步题：混入红色瓢虫（只数绿虫）
    const nd = ri(rnd, D_MIN, D_MAX);
    for (let i = 0; i < nd; i++) ladybugs.push({ f: rnd() < 0.5 ? 1 : 0, e: rnd() < 0.2 ? 1 : 0 });
  }
  const items = shuffled([c.r].concat(distractorsOf(c.r)), rnd);
  return { type: 'sub', n: c.n, m: c.m, answer: c.r, cross: c.cross,
    items: items, answerIdx: items.indexOf(c.r),
    bugs: bugs, ladybugs: ladybugs, seed: 0, _fly: 0, _flown: [] };
}

/* ---------- 两步题生成（rnd 消耗序：池选 1 次 → n 只虫装饰 ×4 → 飞来虫装饰 ×4 → 选项洗牌，
   与 pycheck 逐位同构）。m=飞走数（A:b/B:c）、flyIn=飞来数（A:c/B:b）——engTapBug 按 m 语义原样可用 */
function genDual(form, rnd, lastAns) {
  const pool = CANDS_DUAL[form];
  let p = lastAns == null ? pool : pool.filter(cc => cc.answer !== lastAns);
  if (!p.length) p = pool;
  const cc = p[Math.floor(rnd() * p.length)];
  const d2 = form === 'A' ? cc.answer + 1 : cc.answer - 1;
  const bugs = [], inBugs = [];
  for (let i = 0; i < cc.n; i++) {
    bugs.push({ f: rnd() < 0.5 ? 1 : 0, e: rnd() < 0.18 ? 1 : 0,
      s: Math.round(94 + rnd() * 12) / 100, g: Math.floor(rnd() * 3) });
  }
  const inN = form === 'A' ? cc.c : cc.b;
  for (let i = 0; i < inN; i++) {
    inBugs.push({ f: rnd() < 0.5 ? 1 : 0, e: rnd() < 0.18 ? 1 : 0,
      s: Math.round(94 + rnd() * 12) / 100, g: Math.floor(rnd() * 3) });
  }
  const items = shuffled([cc.answer, cc.s, d2], rnd);
  return { type: 'dual', form: form, n: cc.n, b: cc.b, c: cc.c, s: cc.s,
    m: form === 'A' ? cc.b : cc.c, flyIn: inN, answer: cc.answer, cross: true,
    items: items, answerIdx: items.indexOf(cc.answer),
    bugs: bugs, inBugs: inBugs, ladybugs: [], seed: 0, _fly: 0, _flown: [] };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const quizzes = [];
  let lastAns = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, lastAns);
    q.seed = (flat * 5 + qi) * 7919 + 13;         // 撒点专用种子（渲染期独立流，同题同尺寸同布局）
    lastAns = q.answer;
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 放飞引擎（无 DOM）：engTapBug(L, i) —— 点第 i 只绿虫放飞
   返回本次放飞序号（1..m）；i 非法或题已判返回 null；
   返回 0 = 不放飞（该虫已飞走，或已飞满 m 只——剩余虫保留供点数） ---------- */
function engTapBug(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (i < 0 || i >= q.bugs.length) return null;
  q._flown = q._flown || [];
  if (q._flown[i]) return 0;                      // 已飞走
  if ((q._fly || 0) >= q.m) return 0;             // 飞满 m：剩余虫是答案，不放飞
  q._fly = (q._fly || 0) + 1;
  q._flown[i] = 1;
  return q._fly;
}
/* ---------- 重新飞：清零本题全部放飞（角标/飞行状态一并还原） ---------- */
function engRefly(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  const had = (q._fly || 0) > 0;
  q._fly = 0; q._flown = [];
  return had;
}
/* ---------- 答题引擎（无 DOM）：i = 答案按钮下标
   'right' 答对推进 / 'done' 最后一题答对通关 / 'wrong' 首次点错（该按钮灰掉、计重试）
   'again' 点已灰按钮 / null 非法或关卡已结束 ---------- */
function engPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  q.wrong = q.wrong || [];
  if (i === q.answerIdx) {
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

/* ---------- 结构校验（verify 用）：answerIdx 指向 answer 且唯一、选项无重复、干扰项规则合规
   两步题（r30）：干扰项恒 = {中间态 s, 答案±1 定值}，且 answer/s 与 n,b,c 按型自洽 ---------- */
function structOk(q) {
  if (!q || !q.items || q.items.length !== 3) return false;
  if (q.answerIdx < 0 || q.answerIdx >= q.items.length) return false;
  if (q.items[q.answerIdx] !== q.answer) return false;
  for (let i = 0; i < q.items.length; i++) {
    for (let j = i + 1; j < q.items.length; j++) if (q.items[i] === q.items[j]) return false;
  }
  const ds = q.items.filter((v, i) => i !== q.answerIdx);
  if (q.type === 'dual') {
    const d2 = q.form === 'A' ? q.answer + 1 : q.answer - 1;
    const formulaOk = q.form === 'A'
      ? (q.answer === q.n - q.b + q.c && q.s === q.n - q.b && q.m === q.b && q.flyIn === q.c)
      : (q.answer === q.n + q.b - q.c && q.s === q.n + q.b && q.m === q.c && q.flyIn === q.b);
    return formulaOk && ds.indexOf(q.s) >= 0 && ds.indexOf(d2) >= 0 &&
      q.s > 0 && d2 > 0 && q.s !== q.answer && d2 !== q.answer;
  }
  const dOk = ds.every(v => v > 0 && v !== q.answer && Math.abs(v - q.answer) <= 2) && ds[0] !== ds[1];
  return dOk;
}

/* ---------- 位置撒点（渲染像素空间，确定性纯函数：同 (seed,W,H,n,D) 同布局）——照 countchick
   拒绝采样：每点最多 160 试，全部失败按 0.92 逐级放宽兜底（标准 viewport 下 n≤24 恒不需放宽）
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
      if (!placed) d *= 0.92;                     // 极小场地兜底（verify 断言标准 viewport ≥90px 不触发）
    }
    if (!placed) pts.push({ x: Math.round(W / 2), y: Math.round(H / 2) }); // 理论不可达保险
  }
  return pts;
}
