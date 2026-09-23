/* ================= compare 纯引擎：确定性关卡生成 + 符号判定 + 双侧点数 + 三卡判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   难度章（r29 谱，SPEC-R29-COMPARE §R2/§R3，2026-09-21；与 SPEC-BATCH6 §2 冲突处以 R29 为准）：
   dch1 8 以内实物差 1-3 + = 每关恒 1 / dch2 10 以内全数字卡差 1-3 /
   dch3 10 以内数字卡差 1 近邻 + tri 三数比大小每关 2（窄跨度 2-4）/
   dch4 20 以内三模式混合（count 边 ≤12 可点数）+ near 最接近 N 每关 1（近对压迫）
   模式：mode='count' 双侧实物 / 'num' 双侧数字卡 / 'mix' 一侧数字卡一侧实物（哪侧数字随机）
        'tri' 三张数字卡选最大/最小（点卡判定） / 'near' 目标 N + 三候选选最接近（点卡判定）
   分布护栏（verify 断言 40 关精确值，r29 §R3）：
   ① tri 恒 20（dch3 10 关×2）/ near 恒 10（dch4 10 关×1）→ 符号题恒 170
   ② 相等题在符号槽内选：dch1/dch3 恒 1、dch2/dch4 lv 奇 2 偶 1 → 40 关合计恒 48
   ③ 大小题关内跑量平衡器（gt>lt 强制 '<'，反之 '>'，持平随 rnd；tri/near 不参与计数）
      → 关内 |gt-lt| ≤ 1，40 关 gt+lt = 170-48 = 122 */
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

/* ---------- 数值对生成：按 (dch, mode) 出 [small, big]，全部落章区间（非等题差恒 ≥1）
   r29 谱：dch1 8 以内差 1-3（8 超 subitizing 界 4-5，差 1 逼逐个点数）/
   dch2 10 以内差 1-3（全 num）/ dch3 10 以内差 1 近邻（全 num）/
   dch4 的 mix 模式因"大值/小值落在物品侧"两情形约束不同，由 mixPairOf 单独处理 ---------- */
function pairOf(dch, mode, rnd) {
  if (dch === 1) {                        // 8 以内实物差 1-3：small 1-7，big=small+diff≤8
    const diff = ri(rnd, 1, 3);
    const small = ri(rnd, 1, 8 - diff);
    return [small, small + diff];
  }
  if (dch === 2) {                        // 10 以内数字卡差 1-3（r29 全 num）
    const diff = ri(rnd, 1, 3);
    const small = ri(rnd, 1, 10 - diff);
    return [small, small + diff];
  }
  if (dch === 3) {                        // 10 以内数字卡差 1 近邻（r29 全 num；值域 1-10：small=ri(1,9) 数对上界 10——审查 m1 勘误同 SPEC §R2）
    const small = ri(rnd, 1, 9);
    return [small, small + 1];
  }
  /* dch 4：count 双侧 4-12 差 1-4（仍可点数）；num 双数字卡到 20 差 1-4（数位感直比） */
  const diff = ri(rnd, 1, 4);
  if (mode === 'count') { const small = ri(rnd, 4, 12 - diff); return [small, small + diff]; }
  const small = ri(rnd, 6, 20 - diff);
  return [small, small + diff];
}
/* dch4 mix 专用：物品侧 ≤12（可点数），数字卡侧 ≤20；answer/numOnLeft 定方向
   大值在物品侧 → big ≤12；小值在物品侧 → small ≤12、big=small+diff ≤16 */
function mixPairOf(rnd, bigOnItems) {
  const diff = ri(rnd, 1, 4);
  if (bigOnItems) {
    const big = ri(rnd, Math.max(6, diff + 1), 12);
    return [big - diff, big];
  }
  const small = ri(rnd, 4, 12);
  return [small, small + diff];
}
function eqNOf(dch, mode, rnd) {          // 相等题的公共 n（mix 有物品侧=同 n → 按 count 界）
  if (dch === 1) return ri(rnd, 2, 7);              // r29：= 进 ch1（8 以内实物相等）
  if (dch === 2) return ri(rnd, 2, 9);
  if (dch === 3) return ri(rnd, 2, 10);
  return mode === 'num' ? ri(rnd, 10, 20) : ri(rnd, 6, 10);
}
/* ---------- r29 tri 三数比大小（dch3）：窄跨度生成——span 2-4 的连续窗口内取 3 个互异数，
   逼精细数序两两比较（远距三数可凭首位秒判，窄窗 [6,7,8] 必须逐对比） ---------- */
function triOf(rnd) {
  const span = ri(rnd, 2, 4);             // 窗口跨度：span=2 恰三连续数 / 3-4 四五个数选三
  const lo = ri(rnd, 1, 10 - span);
  const win = [];
  for (let v = lo; v <= lo + span; v++) win.push(v);
  const three = shuffled(win, rnd).slice(0, 3);
  const qtype = rnd() < 0.5 ? 'max' : 'min';
  return { cards: three.map(n => ({ n: n })), qtype: qtype };
}
/* ---------- r29 near 最接近 N（dch4）：近对压迫生成——d1∈[2,4]（防差 1 秒判），
   d2∈[d1+1,d1+2]（贴身逼真算两个差再比），d3∈[d2+1,7]（明显远的干扰）；
   候选方向随机（单侧越界自动取可行侧：N∈[8,17]、d≤7 恒至少一侧可行，SPEC §R3） ---------- */
function nearOf(rnd) {
  const N = ri(rnd, 8, 17);
  const d1 = ri(rnd, 2, 4);
  const d2 = ri(rnd, d1 + 1, d1 + 2);
  const d3 = ri(rnd, d2 + 1, 7);
  const mk = d => {
    if (N - d >= 1 && N + d <= 20) return { n: rnd() < 0.5 ? N - d : N + d, d: d };
    return { n: N - d >= 1 ? N - d : N + d, d: d };
  };
  return { target: N, cards: shuffled([mk(d1), mk(d2), mk(d3)], rnd) };
}
/* ---------- 物品姿态数组（n 只，r 旋转 ±8° / s 缩放 0.94-1.06） ---------- */
function posesOf(n, rnd) {
  const a = [];
  for (let i = 0; i < n; i++) a.push({ r: ri(rnd, -8, 8), s: (94 + ri(rnd, 0, 12)) / 100 });
  return a;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；r29 谱 SPEC-R29 §R3） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  /* 模式表（r29）：dch1 全 count / dch2 全 num / dch3 = 3num+2tri 洗牌 /
     dch4 = count+num+mix+near 恒在 + 1 随机三模式补，整表洗牌 */
  let modes = null;
  if (dch === 2) modes = ['num', 'num', 'num', 'num', 'num'];
  else if (dch === 3) modes = shuffled(['num', 'num', 'num', 'tri', 'tri'], rnd);
  else if (dch === 4) {
    modes = shuffled(['count', 'num', 'mix', 'near', ['count', 'num', 'mix'][ri(rnd, 0, 2)]], rnd);
  }
  /* 相等题位置（r29：符号槽内选——tri/near 槽不承载 =）：dch1/dch3 恒 1、dch2/dch4 lv 奇 2 偶 1 */
  const eqSet = {};
  const symSlots = modes ? modes.map((m, i) => (m === 'tri' || m === 'near') ? -1 : i).filter(i => i >= 0)
                         : [0, 1, 2, 3, 4];
  const eqCnt = (dch === 1 || dch === 3) ? 1 : ((lv % 2 === 1) ? 2 : 1);
  shuffled(symSlots, rnd).slice(0, Math.min(eqCnt, symSlots.length)).forEach(i => { eqSet[i] = true; });
  const quizzes = [];
  let gt = 0, lt = 0;                     // 关内大小分布跑量平衡器（tri/near 不参与计数）
  for (let qi = 0; qi < CH_LEN; qi++) {
    const mode = modes ? modes[qi] : 'count';
    /* r29 三卡题：一次判定，不进 eq/平衡器 */
    if (mode === 'tri') {
      const t = triOf(rnd);
      const ns = t.cards.map(c => c.n);
      const want = ns.indexOf(t.qtype === 'max' ? Math.max.apply(null, ns) : Math.min.apply(null, ns));
      quizzes.push({ mode: 'tri', qtype: t.qtype, cards: t.cards, answer: want, wrong: [], _miss: 0 });
      continue;
    }
    if (mode === 'near') {
      const t = nearOf(rnd);
      let want = 0;
      t.cards.forEach((c, i) => { if (c.d < t.cards[want].d) want = i; });
      quizzes.push({ mode: 'near', target: t.target, cards: t.cards, answer: want, wrong: [], _miss: 0 });
      continue;
    }
    const isEq = !!eqSet[qi];
    /* 大小题方向：平衡器强制落后方（|gt-lt|≤1）；相等题不动 */
    let answer;
    if (isEq) answer = '=';
    else if (gt > lt) answer = '<';
    else if (lt > gt) answer = '>';
    else answer = rnd() < 0.5 ? '>' : '<';
    if (answer === '>') gt++; else if (answer === '<') lt++;
    /* mix：哪一侧放数字卡随机（须在数值生成前定：物品侧 ≤12 约束与方向有关） */
    const numOnLeft = mode === 'mix' ? rnd() < 0.5 : false;
    /* 数值 */
    let nL, nR;
    if (isEq) { nL = nR = eqNOf(dch, mode, rnd); }
    else if (dch === 4 && mode === 'mix') {
      const leftIsBig = answer === '>';
      const bigOnItems = (leftIsBig && !numOnLeft) || (!leftIsBig && numOnLeft);
      const pr = mixPairOf(rnd, bigOnItems);
      if (leftIsBig) { nL = pr[1]; nR = pr[0]; } else { nL = pr[0]; nR = pr[1]; }
    }
    else {
      const pr = pairOf(dch, mode, rnd);
      if (answer === '>') { nL = pr[1]; nR = pr[0]; }   // 左大
      else { nL = pr[0]; nR = pr[1]; }                  // 右大
    }
    /* 物品种类：左右互异（相等题也数不同物——纯数量比较） */
    const kA = ri(rnd, 0, KINDS.length - 1);
    let kB = ri(rnd, 0, KINDS.length - 2);
    if (kB >= kA) kB++;
    const mkSide = (n, kind, isNum) => isNum
      ? { n: n, kind: 'num', items: [] }
      : { n: n, kind: kind, items: posesOf(n, rnd) };
    const left = mkSide(nL, KINDS[kA], mode === 'num' || (mode === 'mix' && numOnLeft));
    const right = mkSide(nR, KINDS[kB], mode === 'num' || (mode === 'mix' && !numOnLeft));
    quizzes.push({ mode: mode, left: left, right: right, answer: answer,
      wrong: [], _miss: 0, _cL: 0, _cR: 0, _bL: [], _bR: [] });
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 双侧点数引擎（无 DOM）：engTap(L, side, i) —— 已数过的再点不增号
   返回本次角标号（1..n）；非法/数字卡侧/题已判返回 null；返回 0 = 该物品已数过（只跳不增号） */
function engTap(L, side, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  const sd = side === 'L' ? q.left : q.right;
  if (!sd || sd.kind === 'num' || i < 0 || i >= sd.items.length) return null;
  const badges = side === 'L' ? q._bL : q._bR;
  if (badges[i]) return 0;                // 已数过：只跳不增号
  if (side === 'L') { q._cL++; q._bL[i] = q._cL; return q._cL; }
  q._cR++; q._bR[i] = q._cR; return q._cR;
}
/* ---------- 重新数：清零当前题两侧全部角标（返回是否有清） ---------- */
function engRecount(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  const had = (q._cL || 0) > 0 || (q._cR || 0) > 0;
  q._cL = 0; q._cR = 0; q._bL = []; q._bR = [];
  return had;
}
/* ---------- 答题引擎（无 DOM）：s = '>' | '<' | '='
   'right' 答对推进 / 'done' 最后一题答对通关 / 'wrong' 首次点错（灰掉、计重试）
   'again' 点已灰符号（早退不计数） / null 非法或关卡已结束 ---------- */
function engPickSym(L, s) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  if (SYMS.indexOf(s) < 0) return null;
  const q = L.quizzes[L.step];
  if (q.mode === 'tri' || q.mode === 'near') return null;   /* r29 三卡题不走符号判定（防误计 wrong） */
  if (s === q.answer) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  if (q.wrong.indexOf(s) >= 0) return 'again';
  q.wrong.push(s);
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* ---------- r29 三卡判定引擎（无 DOM）：i = 0|1|2（卡位）
   语义与 engPickSym 同构：'right' 推进 / 'done' 通关 / 'wrong' 首次点错（灰掉计重试）
   'again' 点已灰卡（早退不计数） / null 非法或非三卡题或关卡已结束 ---------- */
function engPickPos(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if ((q.mode !== 'tri' && q.mode !== 'near') || !q.cards || q.cards.length !== 3) return null;
  if (i !== (i | 0) || i < 0 || i > 2) return null;
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
/* 星级：一关全对（retries=0）=3 星；总重试 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：answer 与题面独立复算（不复用生成函数——同源陷阱防线）
   符号题：answer 与两侧 n 一致、mode 合法、items 长度=n、count 侧种类合法且左右互异
   tri：cards 3 互异 1-10 / qtype 合法 / answer=极值下标（near 距离从 n 与 target 重算，不信 d 字段） ---------- */
function structOk(q) {
  if (!q) return false;
  if (q.mode === 'tri' || q.mode === 'near') {          // r29 三卡题
    if (!q.cards || q.cards.length !== 3) return false;
    if (q.answer == null || q.answer < 0 || q.answer > 2) return false;
    const ns = q.cards.map(c => c && c.n);
    if (ns.some(n => n == null || n !== Math.floor(n) || n < 1 || n > 20)) return false;
    if (ns[0] === ns[1] || ns[1] === ns[2] || ns[0] === ns[2]) return false;   // 三数互异=唯一解
    if (q.mode === 'tri') {
      if (q.qtype !== 'max' && q.qtype !== 'min') return false;
      if (Math.max.apply(null, ns) > 10) return false;                          // dch3 值域 10 以内
      const want = ns.indexOf(q.qtype === 'max' ? Math.max.apply(null, ns) : Math.min.apply(null, ns));
      return q.answer === want;
    }
    if (q.target == null || q.target < 8 || q.target > 17) return false;
    const ds = ns.map(n => Math.abs(n - q.target));                             // 距离从题面重算
    if (ds[0] === ds[1] || ds[1] === ds[2] || ds[0] === ds[2]) return false;    // 距离互异=唯一解
    let want = 0;
    ds.forEach((d, i) => { if (d < ds[want]) want = i; });
    return q.answer === want;
  }
  if (SYMS.indexOf(q.answer) < 0) return false;
  if (['count', 'num', 'mix'].indexOf(q.mode) < 0) return false;
  if (!q.left || !q.right) return false;
  const want = q.left.n > q.right.n ? '>' : (q.left.n < q.right.n ? '<' : '=');
  if (q.answer !== want) return false;
  const sideOk = sd => {
    if (sd.n == null || sd.n < 1) return false;
    if (sd.kind === 'num') return sd.items.length === 0;
    return KINDS.indexOf(sd.kind) >= 0 && sd.items.length === sd.n;
  };
  if (!sideOk(q.left) || !sideOk(q.right)) return false;
  /* 实物两侧种类互异（数字卡侧不参与） */
  if (q.left.kind !== 'num' && q.right.kind !== 'num' && q.left.kind === q.right.kind) return false;
  return true;
}
