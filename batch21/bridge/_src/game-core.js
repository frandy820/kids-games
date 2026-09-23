/* ================= bridge 纯引擎：确定性纠错关卡生成 + 找错/修错双步判定（无 DOM，UI 与 verify 共用）
   r9 玩法（SPEC-BATCH21 §3-r9）：石桥序列完整给出（周期 pattern 行，恰埋 1 块错石），孩子
   find 找错（点出错石）→ fix 修错（3 候选修对）→ 修对后兔子逐石过河（演出）→ 下一题。
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章型（进度章号单调递增、难度章号 (ch-1)%6+1 循环；生成关 flat≥30 seeded 随机 dch∈[1,6]）：
     dch1 'ab'    AB 二色周期：行 = A B A B A B（n=6，per=2），错位 badPos∈[2,5]
     dch2 'abc'   ABC 三色周期：行 = A B C A B C（n=6，per=3），badPos∈[3,5]
     dch3 'abcd'  ABCD 四元周期：行 = A B C D A B C D（n=8，per=4），badPos∈[4,7]
     dch4 'aabb'  AABB 重复元：行 = A A B B A A B B（n=8，per=4），badPos∈[4,7]
     dch5 'dual'  色+形双属性：行 = (cA 方)(cB 圆) ×3（n=6，per=2），badPos∈[2,5]，
                  错石/候选干扰与应值恰差一属性（同色异形 / 异色同形）
     dch6 混合：每题 seeded 取五型之一，保证每关 ≥3 型（多样性）
   错石规则（认知真值）：badPos ≥ per（行首首个完整周期无误——孩子从行首读周期）；
     错石值 = pattern 用色内异值（单色章：不能靠"颜色陌生"排除，必须数周期位置）/
     恰差一属性（dual 章）。候选 3 = [应值, 错石值, 第三干扰]，第三干扰与应值差恰一属性，
     行内用色不足时（ab/aabb 仅 2 色）取行外色。
   引擎返回：engTap（find 点石头）'found' 点中错石（题内过半，转 fix）/ 'wrong' 点非错石
     （晃动零惩罚，每点计一次错）/ null 非法下标或非 find 阶段（walk 演出锁）；
     engFix（fix 点候选）'goal' 修对且本题过河（本关继续）/ 'done' 修对且通关 /
     'wrong' 点错候选（零惩罚可重点）/ null 非法下标或非 fix 阶段。
   纠错真值独立可算（specBadPos，verify/Python 对账用，不读引擎 badPos 字段）：
     从行首 per 位读周期元 → 逐位比对 → 唯一不符位 = badPos，期望值 = 周期元[badPos%per]。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号六章循环取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % N_CH + 1;
const KIND_ALL = ['ab', 'abc', 'abcd', 'aabb', 'dual'];
const PERIOD = { ab: 2, abc: 3, abcd: 4, aabb: 4 };   // dual 周期=2（双属性对交替）
const kindPeriod = kind => kind === 'dual' ? 2 : PERIOD[kind];

/* ---------- 章型计划（每关 5 题；dch6 混合 ≥3 型） */
function kindsPlan(dch, rnd) {
  if (dch >= 1 && dch <= 5) {
    const k = KIND_ALL[dch - 1];
    return [k, k, k, k, k];
  }
  const plan = [];
  for (let t = 0; t < CH_LEN; t++) plan.push(KIND_ALL[Math.floor(rnd() * 5)]);
  if (new Set(plan).size < 3) {                    // 混合多样性：每关 ≥3 型（seeded 重排保确定性）
    plan.length = 0;
    const base = shuffled(KIND_ALL, rnd).slice(0, 3);   // 3 型打底
    for (let t = 0; t < CH_LEN; t++) plan.push(base[Math.floor(rnd() * base.length)]);
  }
  return plan;
}

/* ---------- 周期行生成：n 石 + 恰 1 错石（badPos ≥ per）+ 候选 3 */
function genOne(kind, rnd) {
  const per = kindPeriod(kind);
  const n = per === 4 ? 8 : 6;
  let stones;
  const badPos = ri(rnd, per, n - 1);
  let expectVal;                                    // badPos 位应值（color 或 {color,shape}）
  if (kind === 'dual') {
    const cs = shuffled(COLOR_POOL, rnd).slice(0, 2);          // 2 色互异
    const ss = shuffled(SHAPE_POOL, rnd);                      // 2 形互异（方/圆）
    expectVal = null;
    stones = [];
    for (let i = 0; i < n; i++) stones.push({ color: cs[i % 2], shape: ss[i % 2], bad: false, pos: i });
    const exp = stones[badPos];
    /* 错石=恰差一属性（随机差色或差形；另一差一属性组合留给第三干扰） */
    const offColor = rnd() < 0.5;
    const badVal = offColor ? { color: cs[1 - badPos % 2], shape: exp.shape }
                            : { color: exp.color, shape: ss[1 - badPos % 2] };
    const third = offColor ? { color: exp.color, shape: ss[1 - badPos % 2] }
                           : { color: cs[1 - badPos % 2], shape: exp.shape };
    stones[badPos] = { color: badVal.color, shape: badVal.shape, bad: true, pos: badPos };
    const cand = [{ color: exp.color, shape: exp.shape }, badVal, third];   // [应值, 错石值, 第三干扰]
    return finishOne(kind, stones, badPos, cand, rnd);
  }
  const cols = shuffled(COLOR_POOL, rnd).slice(0, kind === 'aabb' ? 2 : per);  // aabb 2 色/其余 per 色
  const cyc = kind === 'aabb' ? [cols[0], cols[0], cols[1], cols[1]] : cols;  // aabb 周期元=同同异异
  stones = [];
  for (let i = 0; i < n; i++) stones.push({ color: cyc[i % per], bad: false, pos: i });
  const expect = cyc[badPos % per];
  const others = cols.filter(c => c !== expect);                        // 行内异色（必 ≥1）
  const badVal = others[Math.floor(rnd() * others.length)];
  stones[badPos] = { color: badVal, bad: true, pos: badPos };
  /* 第三干扰：行内取（abc/abcd 有余量）；ab/aabb 仅 2 色 → 行外色（入门档允许视觉排除） */
  let third = others.find(c => c !== badVal);
  if (!third) {
    const outPool = COLOR_POOL.filter(c => cols.indexOf(c) < 0);
    third = outPool[Math.floor(rnd() * outPool.length)];
  }
  const cand = [{ color: expect }, { color: badVal }, { color: third }];
  return finishOne(kind, stones, badPos, cand, rnd);
}
/* 候选洗牌 + 组装题对象（phase 初值 'find'） */
function finishOne(kind, stones, badPos, cand, rnd) {
  const okVal = JSON.stringify(cand[0]);
  const mixed = shuffled(cand.map((c, i) => ({ c: c, k: i })), rnd);
  const candMix = mixed.map(m => m.c);
  const candOk = mixed.findIndex(m => JSON.stringify(m.c) === okVal);
  return { kind: kind, stones: stones, badPos: badPos,
           cand: candMix, candOk: candOk,
           phase: 'find', miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 30 关与生成关同一确定性通道） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, N_CH);        // 生成关随机章参数（先取数保确定性）
  const kinds = kindsPlan(dch, rnd);
  const quizzes = kinds.map(kind => genOne(kind, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv, kinds: kinds,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）—— find 阶段点石头第 i 块 */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!Number.isInteger(i) || i < 0 || i >= q.stones.length) return null;
  if (q.phase !== 'find') return null;              // walk 演出/fix 阶段点石头=非法（UI 锁）
  if (i === q.badPos) {                             // 找对错石：题内过半（转修错）
    q.phase = 'fix';
    return 'found';
  }
  q.miss++;                                         // 点非错石：晃动零惩罚（每点计一次错）
  L.retries++;
  return 'wrong';
}
/* ---------- 点选引擎（无 DOM）—— fix 阶段点候选第 i 块 */
function engFix(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!Number.isInteger(i) || i < 0 || i >= q.cand.length) return null;
  if (q.phase !== 'fix') return null;
  if (i === q.candOk) {                             // 修对：兔子过河（演出）→ 本题完成
    q.phase = 'walk';
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'goal';
  }
  q.miss++;                                         // 点错候选：零惩罚可重点
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点（retries=0）=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星（SPEC §3） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 独立纠错计算器（SPEC §3-r9 真值：不读引擎 badPos/candOk——从行首周期元重建）
   单色章：周期=PERIOD[kind]，head=行首 per 位色 → 唯一不符位；
   dual：head=行首 2 位属性对（色形各自比对）→ 唯一不符位。
   返回 { badPos, expColor, expShape }；推演不出（非法题面/不符位≠1）返回 null */
function specBadPos(q) {
  const per = kindPeriod(q.kind);
  const st = q.stones, n = st.length;
  if (n < per * 2) return null;                     // 至少两个完整周期（结构前提）
  const headC = [], headS = [];
  for (let i = 0; i < per; i++) {
    headC.push(st[i].color);
    headS.push(st[i].shape || null);
  }
  if (q.kind === 'aabb') {                                            // AABB 首 4 位 = 同同异异成对
    if (headC[0] !== headC[1] || headC[2] !== headC[3] || headC[0] === headC[2]) return null;
  } else if (new Set(headC).size !== per) return null;                // 周期色互异（ab/abc/abcd/dual）
  if (q.kind === 'dual' && (headS[0] === null || headS[0] === headS[1])) return null;  // 双属性形互异
  let bad = -1;
  for (let i = 0; i < n; i++) {
    const expC = headC[i % per], expS = headS[i % per];
    const badHere = st[i].color !== expC || (q.kind === 'dual' && st[i].shape !== expS);
    if (badHere) { if (bad >= 0) return null; bad = i; }              // 恰一不符位
  }
  if (bad < per) return null;                       // 首周期必须完整（不变量）
  return { badPos: bad, expColor: headC[bad % per], expShape: headS[bad % per] };
}

/* ---------- 结构校验（verify 用）：石数/周期行规则/恰一错石/错位 ≥per/候选 3 互异/
   干扰与应值恰差一属性/初始态自洽。返回具体失败原因便于审计 */
function structWhy(q) {
  if (!q || KIND_ALL.indexOf(q.kind) < 0) return 'kind';
  const st = q.stones, n = st.length;
  const per = kindPeriod(q.kind);
  if (n !== (per === 4 ? 8 : 6)) return 'nStones';  // per4→8 石（两完整周期）；其余 6 石
  for (let i = 0; i < n; i++) if (st[i].pos !== i) return 'pos';
  const spec = specBadPos(q);
  if (!spec) return 'specRow';                      // 周期重建失败（周期破坏/不符位≠1/首周期破坏）
  if (spec.badPos !== q.badPos) return 'badPos';    // 引擎错位=独立推演错位
  if (!st[q.badPos].bad) return 'badFlag';
  let nBad = 0;
  for (let i = 0; i < n; i++) if (st[i].bad) nBad++;
  if (nBad !== 1) return 'nBad';
  /* 属性纯度：单色章不得带 shape / dual 必带 shape */
  for (let i = 0; i < n; i++) {
    if (q.kind === 'dual') {
      if (!st[i].shape || !SHAPES[st[i].shape]) return 'shapeLib';
      if (st[i].num !== undefined && st[i].num !== null) return 'numLeak';
    } else {
      if (st[i].shape) return 'shapeLeak';
      if (st[i].num !== undefined && st[i].num !== null) return 'numLeak';
    }
    if (!COLORS[st[i].color]) return 'colorLib';
  }
  if (q.kind === 'dual') {                          // dual 错石=恰差一属性（同色异形/异色同形）
    const badStone = st[q.badPos];
    const cSame = badStone.color === spec.expColor, sSame = badStone.shape === spec.expShape;
    if (cSame === sSame) return 'dualAttr';         // 须恰差一（一真一假=异或）
  }
  /* 候选 3：互异 / 含应值恰一次 / 错石值在场 / 每干扰与应值恰差一属性 */
  if (!Array.isArray(q.cand) || q.cand.length !== 3) return 'nCand';
  const keys = q.cand.map(c => JSON.stringify({ color: c.color, shape: c.shape || null }));
  if (new Set(keys).size !== 3) return 'candDup';
  const expKey = JSON.stringify({ color: spec.expColor, shape: q.kind === 'dual' ? spec.expShape : null });
  if (keys.filter(k => k === expKey).length !== 1) return 'candExpect';
  if (keys.indexOf(expKey) !== q.candOk) return 'candOk';
  const badKey = JSON.stringify({ color: st[q.badPos].color, shape: st[q.badPos].shape || null });
  if (keys.indexOf(badKey) < 0) return 'candBadVal';
  const attrDiff = (c) => {
    const dc = c.color !== spec.expColor, ds = (c.shape || null) !== (q.kind === 'dual' ? spec.expShape : null);
    return dc !== ds;                               // 恰差一属性（异或；单色章 shape 恒 null→只看色）
  };
  for (const c of q.cand) {
    const k = JSON.stringify({ color: c.color, shape: c.shape || null });
    if (k !== expKey && !attrDiff(c)) return 'candAttr';
    if (k !== expKey && !COLORS[c.color]) return 'candColor';
  }
  if (q.phase !== 'find') return 'phase';
  if (q.miss !== 0) return 'miss';
  if (q._answered) return 'answered';
  return null;
}
