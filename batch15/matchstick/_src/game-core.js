/* ================= matchstick 纯引擎：七段段集判定 + 确定性反向构造生成 + 拿放判定（无 DOM）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   数据模型（SPEC-BATCH15 §3）：cells 段位数组——
     {kind:'d',  segs:[bool×7]}  数字位（段序 a..g，SEGSET 真值源）
     {kind:'op', segs:[bool×2]}  加减号位（[横,竖]：[1,1]='+',[1,0]='-'；[0,*]/[*,1] 无横=非法符号）
     {kind:'eq', segs:[true,true]} 等号位（2 横，固定不可移不可放，防无解域扩大 §3）
   布局恒为 A op B = C：[d+][op][d+][eq][d+]（A/B 一或两位，C 一或两位，段元 ≤4+2）
   槽位编址 slotId = cellIdx*8 + segIdx（数字 0-6 / 符号 0-1；等号不可编址）
   有解性（§0.30 命门）：谜面=从合法等式反向移 1 根构造——
     reversePuzzle：合法 cells 洗牌选一根 ON 段移走 → 洗牌试放全部空槽，
     恰使式"可读且不成立"者为谜面（天然有解=移回原处；verify 侧独立穷举复算）
   判定（engPick/engPlace）：
     'held' 拿起 / 'back' 放回原位（零惩罚不计 miss）/ 'right'/'done' 成立推进 /
     'wrong' 不成立（浪费移动计 miss，火柴回原位可再移）/ null 非法
   星级：0 错=3★ / 1-2 错=2★ / 更多=1★（拿起/放回中间态零惩罚 §3） */
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
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- cells 构造与求值（段集表 SEGSET 为唯一真值源，game-data.js） ---------- */
function mkDigit(d) { return { kind: 'd', segs: segBools(d) }; }
function mkOp(op) { return { kind: 'op', segs: [true, op === '+'] }; }
function mkEq() { return { kind: 'eq', segs: [true, true] }; }
/* 数字串（十进制）→ 数字 cells；'10' → [1,0]（含 1x 前导段位，§3 ch3） */
function mkNum(n) { return String(n).split('').map(ch => mkDigit(Number(ch))); }
/* 合法等式 → cells：A op B = C */
function eqCells(A, op, B, C) {
  return mkNum(A).concat([mkOp(op)], mkNum(B), [mkEq()], mkNum(C));
}
function cloneCells(cells) { return cells.map(c => ({ kind: c.kind, segs: c.segs.slice() })); }
const serCells = cells => cells.map(c => c.kind + c.segs.map(v => v ? 1 : 0).join('')).join('|');

/* 求值：可读（每位恰为某数字段集+符号有横）才 valid；ok = valid 且左=右
   返回 { valid, ok, left, right }（不可读/不成立时 left/right=null）
   相位机：0 读 A（数字）→ 遇 op（仅相位 0，须有横）→ 1 读 B → 遇 eq（仅相位 1）→ 2 读 C */
function evalCells(cells) {
  let phase = 0, nums = [0, 0, 0], op = null, hasOp = false, valid = true;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    if (c.kind === 'd') {
      const d = boolDigit(c.segs);
      if (d == null) { valid = false; break; }
      nums[phase] = nums[phase] * 10 + d;
    } else if (c.kind === 'op') {
      if (hasOp || phase !== 0 || !c.segs[0]) { valid = false; break; }   // 孤竖/空/重复符号=非法
      op = c.segs[1] ? '+' : '-';
      hasOp = true; phase = 1;
    } else {                                          // eq
      if (phase !== 1) { valid = false; break; }      // 等号必须在符号与 B 之后
      phase = 2;
    }
  }
  const bad = { valid: false, ok: false, left: null, right: null, A: null, B: null, C: null, op: null };
  if (!valid || !hasOp || phase !== 2) return bad;
  const left = op === '+' ? nums[0] + nums[1] : nums[0] - nums[1];
  return { valid: true, ok: left === nums[2], left: left, right: nums[2],
    A: nums[0], B: nums[1], C: nums[2], op: op };
}

/* ---------- 槽位工具（slotId = cellIdx*8 + segIdx；等号不可编址） ---------- */
function onSlots(cells) {                            // 全部 ON 段（等号除外）
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].kind === 'eq') continue;
    for (let j = 0; j < cells[i].segs.length; j++) if (cells[i].segs[j]) out.push(i * 8 + j);
  }
  return out;
}
function emptySlots(cells) {                         // 全部空槽（等号除外）
  const out = [];
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].kind === 'eq') continue;
    for (let j = 0; j < cells[i].segs.length; j++) if (!cells[i].segs[j]) out.push(i * 8 + j);
  }
  return out;
}
/* 应用一次移动（就地改 cells；调用方负责快照/还原） */
function applyMove(cells, src, dst) {
  cells[Math.floor(src / 8)].segs[src % 8] = false;
  cells[Math.floor(dst / 8)].segs[dst % 8] = true;
}
function isOpSlot(cells, s) { return cells[Math.floor(s / 8)].kind === 'op'; }

/* ---------- 穷举一解（救援/教学/autoSolve 共用；verify 侧另写独立穷举 §0.30） ---------- */
function engSolve(cells) {
  const out = [];
  const srcs = onSlots(cells);
  for (let a = 0; a < srcs.length; a++) {
    const src = srcs[a];
    const si = Math.floor(src / 8), sj = src % 8;
    cells[si].segs[sj] = false;                      // 移走源杆
    const dsts = emptySlots(cells);                  // 含 src 原槽（下方跳过）
    for (let b = 0; b < dsts.length; b++) {
      const dst = dsts[b];
      if (dst === src) continue;
      const di = Math.floor(dst / 8), dj = dst % 8;
      cells[di].segs[dj] = true;
      const ev = evalCells(cells);
      cells[di].segs[dj] = false;                    // 还原放置
      if (ev.valid && ev.ok) out.push({ src: src, dst: dst });
      if (out.length >= 24) { cells[si].segs[sj] = true; return out; }   // 救援/演示只需少量
    }
    cells[si].segs[sj] = true;                       // 还原源杆
  }
  return out;
}

/* ---------- 谜面数值域（引擎侧；verify 侧 refDomainOk 独立同规复算）
   约束的是谜面结构域（符号/位数/值域），不要求成立（谜面必不成立）：
   ch1 '+' A,B∈2-9 C≤10 / ch2 '-' A∈5-9 B∈1..A-1 C≤9 /
   ch3 A/C 恰一两位（'+' C∈10-19；'-' A∈10-19 C≤9）/ ch4 一位数混合（C≤10） ---------- */
function domainOk(dch, cells) {
  const ev = evalCells(cells);
  if (!ev.valid) return false;
  const nD = cells.filter(c => c.kind === 'd').length;
  if (nD < 3 || nD > 4) return false;                 // 布局界：A op B = C 段元 ≤4
  if (dch === 1) return ev.op === '+' && ev.A >= 2 && ev.A <= 9 && ev.B >= 2 && ev.B <= 9 && ev.C <= 10;
  if (dch === 2) return ev.op === '-' && ev.A >= 5 && ev.A <= 9 && ev.B >= 1 && ev.B < ev.A && ev.C <= 9;
  if (dch === 3) {
    const aTwo = ev.A >= 10, cTwo = ev.C >= 10;
    if (aTwo === cTwo) return false;                  // A/C 恰一为两位（§3）
    if (ev.op === '+') return ev.A >= 2 && ev.A <= 9 && ev.B >= 2 && ev.B <= 9 && ev.C >= 10 && ev.C <= 19;
    return ev.A >= 10 && ev.A <= 19 && ev.B >= 2 && ev.B <= 9 && ev.C <= 9;
  }
  if (ev.A < 2 || ev.A > 9 || ev.C > 10) return false;
  return ev.op === '+' ? (ev.B >= 2 && ev.B <= 9) : (ev.B >= 1 && ev.B <= 9 && ev.B < ev.A);
}

/* ---------- 反向构造（§0.30 命门）：合法 cells → 移 1 根使"可读且不成立"的谜面
   opAllowed=false 时源/目标都限数字段（ch1-3 "数字间移动" §3，符号保持原样）；
   preferOp=true 时优先尝试符号竖杆为源（ch4 运算符参与构造）；
   返回 { cells, solution:{src,dst} } 或 null（全空槽试尽仍成立/无可读 false 放法） */
function reversePuzzle(rnd, legal, opAllowed, preferOp) {
  let srcs = onSlots(legal).filter(s => opAllowed || !isOpSlot(legal, s));
  if (preferOp) {                                     // 符号竖杆排前（相对序保持）
    const ops = srcs.filter(s => isOpSlot(legal, s) && (s % 8) === 1);
    const rest = srcs.filter(s => !(isOpSlot(legal, s) && (s % 8) === 1));
    srcs = ops.concat(rest);
  } else srcs = shuffled(srcs, rnd);
  for (let a = 0; a < srcs.length; a++) {
    const src = srcs[a];
    const si = Math.floor(src / 8), sj = src % 8;
    legal[si].segs[sj] = false;
    const dsts = shuffled(emptySlots(legal), rnd).filter(s => opAllowed || !isOpSlot(legal, s));
    for (let b = 0; b < dsts.length; b++) {
      const dst = dsts[b];
      if (dst === src) continue;
      const di = Math.floor(dst / 8), dj = dst % 8;
      legal[di].segs[dj] = true;
      const ev = evalCells(legal);
      if (ev.valid && !ev.ok) {
        const cells = cloneCells(legal);              // 谜面快照（含已放的 dst）
        const solution = { src: dst, dst: src };      // 谜面上的解=把 dst 处的火柴移回 src
        legal[di].segs[dj] = false;                   // 还原合法式供外层继续
        legal[si].segs[sj] = true;
        return { cells: cells, solution: solution };
      }
      legal[di].segs[dj] = false;
    }
    legal[si].segs[sj] = true;
  }
  return null;
}

/* ---------- 各章合法等式域（SPEC §3 数值域） ---------- */
function genLegal(dch, rnd) {
  let A, B, C, op;
  if (dch === 1) {                                    // ch1 加法：A,B∈2-9，C≤10
    op = '+'; A = ri(rnd, 2, 9); B = ri(rnd, 2, 9);
    while (A + B > 10) { A = ri(rnd, 2, 9); B = ri(rnd, 2, 9); }
    C = A + B;
  } else if (dch === 2) {                             // ch2 减法：A∈5-9；族数字偏好（6/9/5/2/3）
    op = '-'; A = ri(rnd, 5, 9); B = ri(rnd, 1, A - 1); C = A - B;
    let tries = 0;                                    // 偏好重抽：A/B/C 含族数字即收
    const fam = [2, 3, 5, 6, 9];
    while (![A, B, C].some(v => fam.indexOf(v) >= 0) && tries++ < 8) {
      A = ri(rnd, 5, 9); B = ri(rnd, 1, A - 1); C = A - B;
    }
  } else if (dch === 3) {                             // ch3 两位数参与（A 或 C 恰一为两位）
    if (rnd() < 0.5) {                                // α：加法，C 两位（11-18）
      op = '+'; A = ri(rnd, 2, 9); B = ri(rnd, 2, 9);
      while (A + B < 11) { A = ri(rnd, 2, 9); B = ri(rnd, 2, 9); }
      C = A + B;
    } else {                                          // β：减法，A 两位（11-18），C 一位
      op = '-'; A = ri(rnd, 11, 18); B = ri(rnd, 2, 9);
      while (A - B > 9 || A - B < 1) { A = ri(rnd, 11, 18); B = ri(rnd, 2, 9); }
      C = A - B;
    }
  } else {                                            // ch4 加减混合一位数（符号变换入池）
    op = rnd() < 0.5 ? '+' : '-';
    if (op === '+') {
      A = ri(rnd, 2, 9); B = ri(rnd, 2, 9);
      while (A + B > 10) { A = ri(rnd, 2, 9); B = ri(rnd, 2, 9); }
      C = A + B;
    } else {
      A = ri(rnd, 5, 9); B = ri(rnd, 1, A - 1); C = A - B;
    }
  }
  return { A: A, op: op, B: B, C: C, cells: eqCells(A, op, B, C) };
}

/* ---------- 兜底模板（80 次全败概率极低；确定性保 verify）
   ch1-3：谜面 9+3=9（解：9 的 b 段 → 9 的 e 段 → 6+3=9 成立；域：A=9,B=3,C=9 ✓）
   ch4：谜面 8-3=9（解：8 的 b 段 → 符号竖槽 → 6+3=9 成立，符号参与；域 ✓） ---------- */
function fallbackQuiz(dch) {
  if (dch === 4) {
    return { kind: 'ms', cells: eqCells(8, '-', 3, 9), miss: 0, held: null, solved: false,
      solution: { src: 0 * 8 + SEGIDX.b, dst: 1 * 8 + 1 } };
  }
  return { kind: 'ms', cells: eqCells(9, '+', 3, 9), miss: 0, held: null, solved: false,
    solution: { src: 0 * 8 + SEGIDX.b, dst: 0 * 8 + SEGIDX.e } };
}

/* ---------- 单题生成（rnd 同流确定性；avoid=上一题序列化，相邻互异）
   ch1-3 反向构造限数字间移动（§3）；ch4 允符号参与且 qi1/3 优先符号构造；
   谜面须过数值域 domainOk（结构域，不要求成立） ---------- */
function genOne(dch, qi, rnd, avoid) {
  const opAllowed = dch === 4;
  const preferOp = dch === 4 && (qi === 1 || qi === 3);   // ch4 每关 ≥2 题符号参与构造
  const wantMulti = dch >= 2 && !preferOp;   /* b15 试玩 P1-2：ch2+ 偏好多解（nsols≥2，试错有回报） */
  let best = null;
  for (let tries = 0; tries < 80; tries++) {
    const legal = genLegal(dch, rnd);
    const pz = reversePuzzle(rnd, legal.cells, opAllowed, preferOp);
    if (pz && serCells(pz.cells) !== avoid && domainOk(dch, pz.cells)) {
      const cand = { kind: 'ms', cells: pz.cells, solution: pz.solution,
        miss: 0, held: null, solved: false };
      if (!wantMulti) return cand;
      best = best || cand;                    /* 兜底：80 次无多解时保住首个合格单解谜面 */
      if (engSolve(cand.cells).length >= 2) return cand;
    }
  }
  return best || fallbackQuiz(dch);
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const quizzes = [];
  let avoid = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, avoid);
    avoid = serCells(q.cells);
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 拿放引擎（无 DOM）：engPick(L, s) 拿起一根
   'held' 拿起 / null 已拿着·等号段·空段·关末 */
function engPick(L, s) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.held != null) return null;
  if (!Number.isInteger(s) || s < 0) return null;
  const ci = Math.floor(s / 8), sj = s % 8;
  const c = q.cells[ci];
  if (!c || c.kind === 'eq' || sj >= c.segs.length || !c.segs[sj]) return null;
  q.held = s;
  return 'held';
}
/* engPlace(L, s) 放置判定：
   'back' 放回原位（探索零惩罚）/ 'right'/'done' 成立推进 /
   'wrong' 不成立（miss/retries 各 +1，火柴已还原回原位）/
   null 未拿起·等号槽·已占槽·非法 */
function engPlace(L, s) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.held == null) return null;
  if (!Number.isInteger(s) || s < 0) return null;
  const ci = Math.floor(s / 8), sj = s % 8;
  const c = q.cells[ci];
  if (!c || c.kind === 'eq' || sj >= c.segs.length) return null;
  if (s === q.held) { q.held = null; return 'back'; }        // 放回原位=取消拿起，不计 miss
  if (c.segs[sj]) return null;                                // 已占槽
  applyMove(q.cells, q.held, s);
  const ev = evalCells(q.cells);
  if (ev.valid && ev.ok) {
    q.held = null;
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  applyMove(q.cells, s, q.held);                              // 不成立：火柴回原位（§3）
  q.miss++;                                                   // 浪费移动计 miss（中间态零惩罚）
  L.retries++;
  q.held = null;
  return 'wrong';
}
/* 星级：浪费移动口径（SPEC §3）——关级 retries 0=3★ / 1-2=2★ / 更多=1★（永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：布局合法+全可读+谜面不成立+存储解成立 ---------- */
function structOk(q) {
  if (!q || q.kind !== 'ms' || !Array.isArray(q.cells) || q.cells.length < 4) return false;
  let sawOp = false, sawEq = false, lastKind = '';
  for (let i = 0; i < q.cells.length; i++) {
    const c = q.cells[i];
    if (!c || !Array.isArray(c.segs)) return false;
    if (c.kind === 'd') {
      if (c.segs.length !== 7 || boolDigit(c.segs) == null) return false;   // 每位恰为数字段集
    } else if (c.kind === 'op') {
      if (sawOp || sawEq || c.segs.length !== 2 || !c.segs[0]) return false;
      sawOp = true;
    } else if (c.kind === 'eq') {
      if (!sawOp || sawEq || c.segs.length !== 2 || !c.segs[0] || !c.segs[1]) return false;
      sawEq = true;
    } else return false;
    lastKind = c.kind;
  }
  if (!sawOp || !sawEq || lastKind !== 'd') return false;
  const ev = evalCells(q.cells);
  if (!ev.valid || ev.ok) return false;                       // 谜面可读且不成立（§0.30）
  if (q.held != null || q.miss !== 0 || q.solved) return false;
  if (!q.solution || !Number.isInteger(q.solution.src) || !Number.isInteger(q.solution.dst)) return false;
  const test = cloneCells(q.cells);                           // 存储解复算成立
  applyMove(test, q.solution.src, q.solution.dst);
  const sev = evalCells(test);
  return sev.valid && sev.ok;
}
