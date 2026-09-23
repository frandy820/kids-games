/* ================= robotdance 纯引擎：确定性关卡生成 + 分相按序点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 823)（本款常量 823 不变，SPEC-R43 §R4）：同 flat 永远同关。
   章型（SPEC-R43 §R3；进度章号单调递增、难度章号 dch=1+flat//5 静态四档，生成关 ri(1,4)）：
     dch1 步数 qi 表 [3,4,4,5,5]（q0=锚面 3 步，flat0 q0 走 legacyQuiz 旧律逐字节）· 干扰 3
     dch2 步数 6 · u=6 无重复 · 干扰 3
     dch3 步数 7 · u=6 恒 ≥1 重复 · 干扰 4
     dch4 步数 8 · u=6 恒 ≥2 重复 · 干扰 4 · 每关恒 1 题 fix「改一步」（kq=ri(0,4) 掷位）
   铁律（SPEC-R43 §R2 防背）：允许重复但禁 3 连（相邻同动作 ≤2 连续）；
     fix 替换动作 bad 恒取自 steps 本身（disp 集合===steps 集合——集合记忆失效）+disp 无 3 连；
     候选块互异 ⊆池 ⊇步骤集；干扰=池中未用动作恰 NEW_CAP 个（同族防排除法）；块序洗牌 seeded。
   相位：q.phase 'watch'（演示期，判定一律 'watch'=吞输入）→ 'build'（开放点选）
   → 填满/点对错步位切 'dance'（演出期同样吞输入）；replay 重播=build 临时切回 watch（进度保留）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
/* 章参数表（SPEC-R43 §R3）：dch1 题步数坡（q0=3 锚面）/ dch2-4 步数 / u 上限（ch3/4 恒有重复）/
   干扰数 NEW_CAP（池 10 中未用动作取 d 个——同族舞步防排除法） */
const CH1_STEPS = [3, 4, 4, 5, 5];
const DCH_STEPS = { 2: 6, 3: 7, 4: 8 };
const U_CAP = { 1: 5, 2: 6, 3: 6, 4: 6 };
const NEW_CAP = { 1: 3, 2: 3, 3: 4, 4: 4 };
const OLD_POOL = ['jump', 'spin', 'clap', 'stomp', 'wave'];   // 旧 5 池（flat0 q0 锚面专用）
const OLD_DCH_STEPS = { 1: 3, 2: 4, 3: 5 };                    // 旧章步数（锚面通道）
const OLD_DCH_CAP = { 1: 0, 2: 1, 3: 2, 4: 2 };                // 旧干扰上限（锚面通道）

/* 3 连工具（SPEC-R43 §R2.2 禁 3 连）：makesTriple=插入位 p 放 a 后是否构成同动作 3 连；
   hasTriple=全序列 3 连扫描（steps 与 fix disp 双查） */
function makesTriple(arr, p, a) {
  if (p > 0 && arr[p - 1] === a) {
    if (p > 1 && arr[p - 2] === a) return true;               // 左侧已 2 连
    if (p < arr.length && arr[p] === a) return true;          // 左右各 1 → 插入成 3 连
  }
  if (p < arr.length && arr[p] === a && p + 1 < arr.length && arr[p + 1] === a) return true;
  return false;
}
function hasTriple(arr) {
  for (let i = 2; i < arr.length; i++)
    if (arr[i] === arr[i - 1] && arr[i] === arr[i - 2]) return true;
  return false;
}

/* ---------- 单题构建（SPEC-R43 §R4 生成律；rnd 消耗序钉死禁改序——pycheck 逐位对拍）：
   n(0 rnd) → shuffled(POOL10)=9 rnd 取 u 种 → u<n 时重复注入（每个 2 rnd+3 连顺移 0 rnd）
   → fix（k 1 rnd + bad 掷位 1 rnd+顺移 0 rnd）→ 干扰 shuffled(rest) len-1 rnd → 块洗牌 n+d-1 rnd ---------- */
function buildQuiz(dch, rnd, qi, isFix) {
  const n = dch === 1 ? CH1_STEPS[qi] : DCH_STEPS[dch];
  const u = Math.min(n, U_CAP[dch]);
  const moves = shuffled(MOVE_POOL, rnd).slice(0, u);          // u 种动作（洗全池 9 rnd）
  let steps = moves.slice(0, n);                               // u≥n（ch1/ch2）：无重复
  for (let e = steps.length; e < n; e++) {                     // u<n（ch3/4）：重复注入
    const a = moves[ri(rnd, 0, u - 1)];                        // 1 rnd 重复动作
    let p = ri(rnd, 0, steps.length);                          // 1 rnd 插入位
    if (makesTriple(steps, p, a)) {                            // 3 连防御：顺移首个合法位（0 rnd）
      let q2 = (p + 1) % (steps.length + 1);
      while (q2 !== p && makesTriple(steps, q2, a)) q2 = (q2 + 1) % (steps.length + 1);
      p = q2;                                                  // 合法位恒存在（重复段 ≤2 时段间有隔断）
    }
    steps = steps.slice(0, p).concat([a], steps.slice(p));
  }
  if (isFix) {                                                 // fix 题（SPEC-R43 §R5）
    const k = ri(rnd, 0, n - 1);                               // 1 rnd 错步位（均匀，非恒位）
    const uniq = Array.from(new Set(steps)).filter(a => a !== steps[k]);
    const bi = ri(rnd, 0, uniq.length - 1);                    // 1 rnd bad 候选掷位
    let bad = uniq[bi];
    for (let t = 1; t < uniq.length; t++) {                    // disp 3 连防御：顺移候选（0 rnd）
      const cand = uniq[(bi + t) % uniq.length];
      const test = steps.slice(); test[k] = cand;
      if (!hasTriple(test)) { bad = cand; break; }
    }
    const disp = steps.slice(); disp[k] = bad;
    return { kind: 'fix', steps: steps, k: k, bad: bad, disp: disp,
             blocks: [], filled: new Array(n).fill(null),
             pos: 0, miss: 0, phase: 'watch', solved: false, _consumed: [] };
  }
  const d = NEW_CAP[dch];
  const stepSet = new Set(steps);
  const rest = MOVE_POOL.filter(a => !stepSet.has(a));          // 池中未用动作（10-u 个）
  const extras = shuffled(rest, rnd).slice(0, d);               // 干扰恰 d 个（同族）
  const order = shuffled(steps.concat(extras), rnd);            // 候选块顺序洗牌 seeded
  return { steps: steps, blocks: order.map(a => ({ anim: a })),
           filled: new Array(n).fill(null),
           pos: 0, miss: 0, phase: 'watch', solved: false,
           _consumed: order.map(() => false) };
}

/* ---------- flat0 q0 锚面（SPEC-R43 §R10：旧律逐字节保留——旧 5 池/3 步/0 干扰；
   rnd 消耗序与旧 buildQuiz(dch=1) 完全一致：shuffled(OLD5)=4 rnd + 块洗牌=2 rnd） ---------- */
function legacyQuiz(rnd) {
  const n = OLD_DCH_STEPS[1];
  const pool = shuffled(OLD_POOL, rnd);
  const steps = pool.slice(0, n);
  const k = Math.min(5 - n, OLD_DCH_CAP[1]);                   // =0（锚面无干扰）
  const extras = pool.slice(n, n + k);
  const order = shuffled(steps.concat(extras), rnd);
  return { steps: steps, blocks: order.map(a => ({ anim: a })),
           filled: new Array(n).fill(null),
           pos: 0, miss: 0, phase: 'watch', solved: false,
           _consumed: order.map(() => false) };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 823);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const kq = dch === 4 ? ri(rnd, 0, 4) : -1;                 // dch4 fix 题位（每关恒 1 题，SPEC-R43 §R3）
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    if (flat === 0 && qi === 0) quizzes.push(legacyQuiz(rnd));       // 锚面：旧律逐字节
    else quizzes.push(buildQuiz(dch, rnd, qi, qi === kq));
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 教学关（仅 UI 层用：2 步舞=跳一跳+拍拍手，2 块自然序；SPEC §2） ---------- */
function genTutLevel() {
  const q = { steps: ['jump', 'clap'], blocks: [{ anim: 'jump' }, { anim: 'clap' }],
              filled: [null, null], pos: 0, miss: 0, phase: 'watch', solved: false,
              _consumed: [false, false] };
  return { flat: -1, ch: 1, dch: 1, lv: 0, quizzes: [q],
           step: 0, retries: 0, done: false, tutLevel: true };
}

/* ---------- 相位切换（UI 演示计时器到期时调用；verify/引擎直驱同口） ---------- */
function engToBuild(L) {
  if (!L || L.done) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'watch') return false;
  q.phase = 'build';
  return true;
}
/* replay 重播：build 临时切回 watch（filled/pos/_consumed 全保留——重播不清进度，b18 同构；
   fix 题 replay=重播正确版演示（disp 槽显示保留——对比锚不撤，SPEC-R43 §R5） */
function engToWatch(L) {
  if (!L || L.done) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'build') return false;
  q.phase = 'watch';
  return true;
}

/* ---------- 点块引擎（无 DOM）：engTapBlock(L, i) —— 点第 i 块候选（blocks 数组下标）
   'fill'  点对（块动作=当前步动作）：填槽 filled[pos]=动作、块消耗、pos++
   'done'  末槽填完（本题组装完成→dance 相位；末题末槽=L.done）
   'wrong' 点错（干扰块或顺序错位块）：miss+1（retries 全关累计=星级口径），
           已填槽不回退（错只计 miss 不清槽——b18 定案）
   'watch' watch/dance 演出演出期吞输入（uiTapBlock 层转 false+轻叮）
   null    非法下标 / 已消耗块 / 关卡已结束 ---------- */
function engTapBlock(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.blocks.length) return null;
  if (q._consumed[i]) return null;                  // 已消耗块（已填槽）非合法目标
  if (q.phase !== 'build') return 'watch';          // watch/dance 演出期吞输入
  if (q.blocks[i].anim === q.steps[q.pos]) {
    q.filled[q.pos] = q.steps[q.pos];
    q._consumed[i] = true;
    q.pos++;
    if (q.pos >= q.steps.length) {                  // 末槽填完=本题完成
      q.solved = true;
      q.phase = 'dance';
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return 'done';
    }
    return 'fill';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}

/* ---------- 点槽引擎（fix 题专用，SPEC-R43 §R5；与 engTapBlock 同构单步原子判定 r25 M2）
   'done'  点对（i===k 错步位）：solved+切 dance（L.step/L.done 推进同 done 路径）
   'wrong' 点错（i!==k）：miss+1（retries 计星同口径）
   'watch' 非 build 相位吞输入
   null    非法下标 / 非 fix 题 / 关卡已结束 ---------- */
function engTapSlot(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.kind !== 'fix') return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.steps.length) return null;
  if (q.phase !== 'build') return 'watch';
  if (i === q.k) {
    q.solved = true;
    q.phase = 'dance';
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return 'done';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（miss 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 当前步正确块下标（未消耗且动作=steps[pos]；救援答案级/教学帮指/autoSolve 共用；
   fix 题 blocks 空 → -1（fix 题答案目标=槽 k，UI 层 fix 分流用 slotEl(q.k)，SPEC-R43 §R5） */
function correctIdx(q) {
  if (!q || q.solved) return -1;
  for (let j = 0; j < q.blocks.length; j++)
    if (!q._consumed[j] && q.blocks[j].anim === q.steps[q.pos]) return j;
  return -1;
}

/* ---------- 结构校验（verify 用，返回失败原因或 null；SPEC-R43 §R3/§R6 新谱全量重写）
   flat0 q0 锚面（legacyQuiz 产物）不适用本函数——verify 侧走锚对拍（逐字节），此处锚豁免。
   块律（重复步语义）：候选块多重集===步骤多重集∪干扰多重集——重复步=多个同名块
   （每步消耗一块按序点，孩子须监控块计数=「再认+复现」次数负荷，SPEC-R43 §R2.1） ---------- */
function structWhy(q, dch, qi) {
  if (!q) return 'quiz';
  if (q.phase !== 'watch' || q.pos !== 0 || q.miss !== 0 || q.solved) return 'init';
  const n = q.steps.length;
  const expN = dch === 1 ? CH1_STEPS[qi] : DCH_STEPS[dch];
  if (n !== expN) return 'stepsLen';                        // 步数谱（dch1 qi 表）
  for (const a of q.steps) if (MOVE_POOL.indexOf(a) < 0) return 'stepsPool';
  const u = new Set(q.steps).size;
  if (u !== Math.min(n, U_CAP[dch])) return 'uCap';         // 重复律（ch3/4 恒 u=6）
  if (hasTriple(q.steps)) return 'triple';                  // 禁 3 连
  const stepSet = new Set(q.steps);
  if (q.kind === 'fix') {                                   // fix 结构律（SPEC-R43 §R4/§R5）
    if (dch !== 4) return 'fixDch';
    if (q.k < 0 || q.k >= n) return 'fixK';
    if (q.bad === q.steps[q.k] || q.steps.indexOf(q.bad) < 0) return 'fixBad';   // bad∈steps 且≠steps[k]
    const disp = q.steps.slice(); disp[q.k] = q.bad;
    if (q.disp.join(',') !== disp.join(',')) return 'fixDisp';   // disp===steps 恰换 k 位
    if (!q.disp.every(a => stepSet.has(a))) return 'fixNew';     // 错版无新动作（防新奇检测 §R2.4）
    if (hasTriple(q.disp)) return 'fixTriple';                   // 错版也无 3 连（防规则泄题）
    if (q.blocks.length !== 0) return 'fixBlocks';               // fix 题 blocks 恒空（作答目标=槽）
    if (q.filled.length !== n || q.filled.some(x => x !== null)) return 'filled';
    return null;
  }
  if (q.kind) return 'kind';                                // 常规题 kind 必须空
  const anims = q.blocks.map(b => b.anim);
  const cnt = {}, stepCnt = {};
  anims.forEach(a => cnt[a] = (cnt[a] || 0) + 1);
  q.steps.forEach(a => stepCnt[a] = (stepCnt[a] || 0) + 1);
  for (const a of q.steps) if ((cnt[a] || 0) !== stepCnt[a]) return 'stepsCov';   // 步骤块计数全对（重复步=多块）
  let disN = 0;
  for (const a in cnt) if (!stepCnt[a]) {
    if (cnt[a] !== 1) return 'disDup';                      // 干扰块互异
    if (MOVE_POOL.indexOf(a) < 0) return 'disPool';
    disN++;
  }
  if (disN !== NEW_CAP[dch]) return 'disCnt';               // 干扰恰 NEW_CAP 个（同族=池中未用动作）
  if (q.filled.length !== n || q.filled.some(x => x !== null)) return 'filled';
  if (q._consumed.some(c => c)) return 'consumed';
  return null;
}
