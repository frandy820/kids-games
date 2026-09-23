/* ================= blocks 纯引擎：确定性关卡生成 + 点选判定 + 投影计算（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   数据模型（SPEC-BATCH14 §1）：格柱 stacks——基底 r×c（1-3 格），cols[r][c]=柱高 0-3，
   从地面连续堆高无悬空（柱高语义本身保证物理合法，俯视无空腔歧义）
   章型：
     dch1 count：3×2 基底无空列（每格 h≥1），柱高 1-3，总块 6-12（审查 m4 统一）
     dch2 fill：目标盒 2×2×2=8 / 3×2×2=12 / 2×3×2=12 三档；缺损后每柱 0-目标高，缺 2-6
     dch3 front：正视图=每列 c 取 max h over r 条形投影；干扰=某列 ±1 / 两列互换
     dch4 top：俯视=footprint 二值网格；干扰=一格翻转 / 沿对角镜像（R=C 时 transpose）
     dch2/3/4 首题（qi0）=ch1 count 型热身（SPEC §1"每关首题热身"）
   同关相邻题柱高布局互异（ser 序列化对账）
   投影：projFront/projTop 为引擎唯一真值源（UI 渲染共用）；verify 侧另写独立复算对账
   判定：engPick 点答案卡——'right'/'done'（推进）/'wrong'（miss/retries 计一次，零惩罚可重点）
   干扰项（§0.17）：count/fill=±1/±2；互异禁 0 负；选项洗牌防恒首位 */
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
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 工具 ---------- */
const sumOf = cols => cols.reduce((s, row) => s + row.reduce((a, v) => a + v, 0), 0);
const ser = cols => cols.map(r => r.join('')).join('/');
const eqArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/* 数字选项池（count/fill）：ans±1/±2 滤 0 负/同答案/重复 → 洗牌取 2 → 三卡洗牌（§0.17） */
function numItems(rnd, ans) {
  const pool = [];
  [ans - 2, ans - 1, ans + 1, ans + 2].forEach(v => { if (v > 0 && v !== ans && pool.indexOf(v) < 0) pool.push(v); });
  const ds = shuffled(pool, rnd).slice(0, 2);
  const items = shuffled([ans, ds[0], ds[1]], rnd);
  return { items: items, answerIdx: items.indexOf(ans) };
}

/* ---------- 投影（引擎唯一真值源；verify 侧 refFront/refTop 独立复算对账） ---------- */
/* 正视图：从前面看，每列 c 的可见高度 = max over r（被遮挡的也要想） */
const projFront = cols => cols[0].map((_, c) => cols.reduce((m, row) => Math.max(m, row[c]), 0));
/* 俯视图：从上往下看，h>0 即亮格（二值 footprint） */
const projTop = cols => cols.map(row => row.map(h => (h > 0 ? 1 : 0)));

/* ---------- count 生成（ch1；兼 dch2/3/4 首题热身）
   3×2 基底无空列（每格 h≥1），柱高 1-3，总块 6-12；干扰=总数 ±1/±2 ---------- */
function genCount(rnd, avoid) {
  const R = 3, C = 2;
  let cols, tries = 0;
  do {
    cols = [];
    for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(ri(rnd, 1, 3)); cols.push(row); }
    tries++;
  } while ((sumOf(cols) > 12 || (avoid != null && ser(cols) === avoid)) && tries < 40);   // 总块 6-12+同关相邻堆互异
  if (sumOf(cols) > 12) cols = [[1, 1], [2, 1], [1, 2]];          // 兜底模板 total=8（40 次全败概率极低；确定性保 verify）
  const total = sumOf(cols);
  const opt = numItems(rnd, total);
  return { kind: 'count', R: R, C: C, cols: cols, goal: null, ans: total,
    items: opt.items, answerIdx: opt.answerIdx, miss: 0, solved: false, warm: false };
}

/* ---------- fill 生成（ch2）：目标盒三档 {2×2×2, 3×2×2, 2×3×2}（高恒 2）
   缺损=随机逐块减（柱残高 0-目标高，物理合法），缺 2-6；干扰=缺数 ±1/±2 ---------- */
function genFill(rnd, avoid) {
  const BOXES = [{ R: 2, C: 2 }, { R: 3, C: 2 }, { R: 2, C: 3 }];
  let box, cols, tries = 0;
  do {
    box = pick(rnd, BOXES);
    const goal = [];
    for (let r = 0; r < box.R; r++) { const row = []; for (let c = 0; c < box.C; c++) row.push(2); goal.push(row); }
    cols = goal.map(r => r.slice());
    const holes = ri(rnd, 2, 6);                                   // 缺 2-6（≤盒容量 8）
    for (let i = 0; i < holes; i++) {
      const cand = [];
      for (let r = 0; r < box.R; r++) for (let c = 0; c < box.C; c++) if (cols[r][c] > 0) cand.push([r, c]);
      const p = pick(rnd, cand);
      cols[p[0]][p[1]]--;
    }
    tries++;
  } while (avoid != null && ser(cols) === avoid && tries < 40);
  const goal = [];
  for (let r = 0; r < box.R; r++) goal.push(new Array(box.C).fill(2));
  const holesN = sumOf(goal) - sumOf(cols);
  const opt = numItems(rnd, holesN);
  return { kind: 'fill', R: box.R, C: box.C, cols: cols, goal: goal, ans: holesN,
    items: opt.items, answerIdx: opt.answerIdx, miss: 0, solved: false, warm: false };
}

/* ---------- front 生成（ch3）：基底 2-3×2-3，柱高 0-3
   答案=projFront；干扰=某一列 ±1 / 两列互换（互异非答案） ---------- */
function frontDistractors(profile, rnd) {
  const out = [], seen = [JSON.stringify(profile)];
  const cand = [];
  for (let c = 0; c < profile.length; c++) {                      // 某列 ±1（域 0-3 内）
    if (profile[c] + 1 <= 3) { const p = profile.slice(); p[c]++; cand.push(p); }
    if (profile[c] - 1 >= 0) { const p = profile.slice(); p[c]--; cand.push(p); }
  }
  for (let a = 0; a < profile.length; a++) for (let b = a + 1; b < profile.length; b++)
    if (profile[a] !== profile[b]) { const p = profile.slice(); const t = p[a]; p[a] = p[b]; p[b] = t; cand.push(p); }   // 两列互换
  shuffled(cand, rnd).forEach(p => {
    const k = JSON.stringify(p);
    if (out.length < 2 && seen.indexOf(k) < 0) { out.push(p); seen.push(k); }
  });
  return out;
}
function genFront(rnd, avoid) {
  let R, C, cols, profile, ds, tries = 0;
  do {
    R = ri(rnd, 2, 3); C = ri(rnd, 2, 3);
    cols = [];
    for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(ri(rnd, 0, 3)); cols.push(row); }
    profile = projFront(cols);
    ds = frontDistractors(profile, rnd);
    tries++;
  } while ((avoid != null && ser(cols) === avoid || profile.every(v => v === 0) || ds.length < 2) && tries < 40);
  if (ds.length < 2) {                                            // 兜底模板（40 次全败概率极低；确定性保 verify）
    cols = [[3, 0, 1], [1, 0, 2]]; R = 2; C = 3;
    profile = projFront(cols);
    ds = frontDistractors(profile, rnd);
  }
  const items = shuffled([profile, ds[0], ds[1]], rnd);
  const k = JSON.stringify(profile);
  return { kind: 'front', R: R, C: C, cols: cols, goal: null, ans: profile.slice(),
    items: items, answerIdx: items.findIndex(p => JSON.stringify(p) === k),
    miss: 0, solved: false, warm: false };
}

/* ---------- top 生成（ch4）：基底 2-3×2-3，柱高 0-3
   答案=projTop footprint（亮格数 2..R*C-1）；干扰=一格翻转 / 对角镜像 transpose（R=C） ---------- */
function topDistractors(foot, R, C, rnd) {
  const out = [], seen = [JSON.stringify(foot)];
  const cand = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {       // 一格翻转（多一格/少一格）
    const f = foot.map(row => row.slice());
    f[r][c] = f[r][c] ? 0 : 1;
    cand.push({ f: f, lit: f.reduce((s, row) => s + row.reduce((a, v) => a + v, 0), 0) });
  }
  if (R === C) {                                                  // 对角镜像（主对角 transpose，尺寸不变）
    const f = [];
    for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(foot[c][r]); f.push(row); }
    cand.push({ f: f, lit: 99 });
  }
  shuffled(cand, rnd).forEach(it => {                             // 翻转后仍须亮格 1..RC-1（教学可辨）
    if (it.lit < 1 || it.lit > R * C - 1) return;
    const k = JSON.stringify(it.f);
    if (out.length < 2 && seen.indexOf(k) < 0) { out.push(it.f); seen.push(k); }
  });
  return out;
}
function genTop(rnd, avoid) {
  let R, C, cols, foot, ds, tries = 0, lit = 0;
  do {
    R = ri(rnd, 2, 3); C = ri(rnd, 2, 3);
    cols = [];
    for (let r = 0; r < R; r++) { const row = []; for (let c = 0; c < C; c++) row.push(ri(rnd, 0, 3)); cols.push(row); }
    foot = projTop(cols);
    lit = foot.reduce((s, row) => s + row.reduce((a, v) => a + v, 0), 0);
    ds = topDistractors(foot, R, C, rnd);
    tries++;
  } while ((avoid != null && ser(cols) === avoid || lit < 2 || lit > R * C - 1 || !ds || ds.length < 2) && tries < 40);   // 亮格 2..RC-1（翻转干扰可行）+互异
  if (!ds || ds.length < 2) {                                     // 兜底模板
    cols = [[2, 0, 1], [0, 1, 0]]; R = 2; C = 3;
    foot = projTop(cols);                                         // 亮格 3，翻转/多格均可行
    ds = topDistractors(foot, R, C, rnd);
  }
  const items = shuffled([foot, ds[0], ds[1]], rnd);
  const k = JSON.stringify(foot);
  return { kind: 'top', R: R, C: C, cols: cols, goal: null, ans: foot.map(r => r.slice()),
    items: items, answerIdx: items.findIndex(p => JSON.stringify(p) === k),
    miss: 0, solved: false, warm: false };
}

/* ---------- 单题生成（rnd 同流确定性；avoid=上一题柱高序列化，相邻互异） ---------- */
function genOne(dch, qi, rnd, avoid) {
  let q;
  if (dch === 1) q = genCount(rnd, avoid);
  else if (dch === 2) q = qi === 0 ? genCount(rnd, avoid) : genFill(rnd, avoid);   // 首题热身=ch1 型
  else if (dch === 3) q = qi === 0 ? genCount(rnd, avoid) : genFront(rnd, avoid);
  else q = qi === 0 ? genCount(rnd, avoid) : genTop(rnd, avoid);
  q.warm = qi === 0 && dch !== 1;
  return q;
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
    avoid = ser(q.cols);
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engPick(L, i) —— 四题型统一点答案卡
   'right'/'done' 点对（推进） / 'wrong' 点错（miss/retries 计一次，零惩罚晃动可重点）
   null 非法下标/关已结束 */
function engPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.items.length) return null;
  if (i === q.answerIdx) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;                                        // 不灰化款：同卡可重复点，每次计错
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（SPEC §1 家族口径，永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：按题型分支 */
function structOk(q) {
  if (!q || !Array.isArray(q.items) || q.items.length !== 3) return false;
  if (q.answerIdx < 0 || q.answerIdx > 2) return false;
  if (!Array.isArray(q.cols) || q.R < 1 || q.R > 3 || q.C < 1 || q.C > 3) return false;
  if (q.cols.length !== q.R || q.cols.some(row => row.length !== q.C)) return false;
  if (q.cols.some(row => row.some(h => !Number.isInteger(h) || h < 0 || h > 3))) return false;   // 柱高物理合法
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++)
    if (deepEq(q.items[i], q.items[j])) return false;                                           // 互异
  if (q.kind === 'count') {
    if (q.R !== 3 || q.C !== 2) return false;
    if (q.cols.some(row => row.some(h => h < 1))) return false;                                 // 无空列
    if (q.ans !== sumOf(q.cols) || q.ans < 6 || q.ans > 12) return false;                       // 总块域 6-12（SPEC 定稿，审查 m4）
    return q.items[q.answerIdx] === q.ans && q.items.every(v => Number.isInteger(v) && v > 0);
  }
  if (q.kind === 'fill') {
    if (!q.goal || q.goal.length !== q.R) return false;
    const cap = sumOf(q.goal);
    if (cap !== 8 && cap !== 12) return false;                                                  // 目标盒三档
    if (q.goal.some(row => row.some(v => v !== 2))) return false;                               // 高恒 2
    if (q.cols.some((row, r) => row.some((h, c) => h < 0 || h > q.goal[r][c]))) return false;    // 每柱 0-目标高
    if (q.ans !== cap - sumOf(q.cols) || q.ans < 2 || q.ans > 6) return false;                  // 缺 2-6
    return q.items[q.answerIdx] === q.ans && q.items.every(v => Number.isInteger(v) && v > 0);
  }
  if (q.kind === 'front') {
    if (!eqArr(q.ans, projFront(q.cols))) return false;                                         // 投影正确
    if (q.ans.every(v => v === 0)) return false;
    return deepEq(q.items[q.answerIdx], q.ans) &&
      q.ans.every(v => v >= 0 && v <= 3);
  }
  if (q.kind === 'top') {
    if (!deepEq(q.ans, projTop(q.cols))) return false;
    const lit = q.ans.reduce((s, row) => s + row.reduce((a, v) => a + v, 0), 0);
    return lit >= 1 && deepEq(q.items[q.answerIdx], q.ans);
  }
  return false;
}
