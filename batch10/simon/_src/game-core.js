/* ================= simon 纯引擎：确定性序列生成 + 两态敲击判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-BATCH10 §2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
   dch1 长 2 / dch2 长 3 / dch3 长 4（500ms/键）→ dch4 长 2-4 混合 + 380ms（提速）
   生成关（flat≥STATIC_LEVELS）= 每题随机长度 2-4 + 关级随机速度档（380/440/500）
   序列生成：键号 0-3 均匀随机，禁三连同键（前两键相同时本键从其余 3 键均匀取）
   两态机制：q.phase 'watch'（演示期，engTap 一律 'watch'=吞输入）→ 'input'（开放敲击）
   零惩罚修正形态：点错=错鼓计 miss+关计 retries，pos 清零、phase 切回 'watch' 从头重播
   ——watch 重入=该题重试零惩罚（不灰化款，miss 无上限，sayW force === 2 口径） */
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

/* ---------- 单题生成：len 个键号序列（确定性，同 rnd 流；禁三连同键） */
function genOne(dch, rnd, gen, genSpeed) {
  let len, speed;
  if (gen) {                                            // 生成关：随机长度 + 关级速度档
    len = ri(rnd, 2, 4);
    speed = genSpeed;
  } else {
    const sp = SPECS[dch];
    len = sp.len === 0 ? ri(rnd, 2, 4) : sp.len;        // 章 4：2-4 混合
    speed = sp.speed;
  }
  const seq = [];
  for (let i = 0; i < len; i++) {
    /* 前两键相同 → 本键从其余 3 键均匀取（禁三连，§2 verify 断言）；否则 4 键均匀 */
    const cand = (i >= 2 && seq[i - 1] === seq[i - 2])
      ? [0, 1, 2, 3].filter(k => k !== seq[i - 1])
      : [0, 1, 2, 3];
    seq.push(cand[Math.floor(rnd() * cand.length)]);
  }
  return { seq: seq, len: len, speed: speed,
           phase: 'watch', pos: 0, miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const gen = flat >= STATIC_LEVELS;                    // 静态 20 关之外=无限生成关
  const genSpeed = gen ? GEN_SPEEDS[ri(rnd, 0, GEN_SPEEDS.length - 1)] : 0;
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(genOne(dch, rnd, gen, genSpeed));
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 两态切换（UI 的演示计时器到期时调用；verify/skipWatch 快进同口） ---------- */
function engToInput(L) {
  if (!L || L.done) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'watch') return false;
  q.phase = 'input';
  return true;
}
/* 救援重播（§0.21）：临时切回 watch 重演序列，pos 保留（零惩罚——不剥夺已敲对进度） */
function engToWatch(L, resetPos) {
  if (!L || L.done) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'input') return false;
  q.phase = 'watch';
  if (resetPos) q.pos = 0;
  return true;
}

/* ---------- 敲鼓引擎（无 DOM）：engTap(L, i) —— 孩子敲第 i 面鼓（0-3）
   'watch' = 演示期（吞输入 §0.22，tapPad 层返回 false）
   'right' = 敲对一锤（pos++，题继续）；'done' = 末锤敲对（通关）
   'wrong' = 敲错（计 miss/retries，pos 清零，phase 切回 'watch' 序列从头重播）
   null    = 非法键号 / 关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q.phase !== 'input') return 'watch';              // 演示期吞输入
  if (i < 0 || i > 3) return null;
  if (i === q.seq[q.pos]) {                             // 敲对：亮鼓+音符，pos++
    q.pos++;
    if (q.pos >= q.seq.length) {                        // 整条敲对=过题
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return L.done ? 'done' : 'right';
    }
    return 'right';
  }
  q.miss++;                                             // 敲错：无上限计数（不灰化款）
  L.retries++;                                          // 错次（星级判据）
  /* 试玩 P1①：pos 保留（与救援重播 engToWatch(L,false) 零惩罚同构）——错一锤不清已敲对进度；
     重播视觉仍从头整条，回 input 后从已敲对处继续（len3 敲对 2 锤第 3 锤错曾是全游戏最大挫败点） */
  q.phase = 'watch';                                    // watch 重入=从头重播（重试零惩罚）
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错次=3 星；错次 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：键号在界 / 序列长=章规格 / 禁三连 / 速度=章规格 ---------- */
function structOk(q, dch, gen) {
  if (!q || !q.seq || q.seq.length !== q.len) return false;
  if (q.len < 2 || q.len > 4) return false;
  for (let i = 0; i < q.seq.length; i++) {
    const k = q.seq[i];
    if (k < 0 || k > 3) return false;
    if (i >= 2 && q.seq[i - 1] === k && q.seq[i - 2] === k) return false;   // 禁三连同键
  }
  if (gen) return GEN_SPEEDS.indexOf(q.speed) >= 0;    // 生成关：速度 ∈ 档位
  const sp = SPECS[dch];
  if (q.speed !== sp.speed) return false;              // 静态关：速度=章规格
  return sp.len === 0 ? true : q.len === sp.len;       // 混合章只查域，定长章查等
}
