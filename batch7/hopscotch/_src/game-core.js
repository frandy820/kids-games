/* ================= hopscotch 纯引擎：确定性关卡生成 + 逐格/跳 2 跳步判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   r7 六章难度（SPEC-BATCH7 §3-r7；span=该关格数，mode=跳步长，hide=途中格数字全藏）：
   dch1 顺数 1-10：span10，from=1，to=5-8（走 4-7 格），全显数字
   dch2 跨十顺数：span20，to=15-20，len=4-8（from=to-len，路径必经 11-20 段），全显
   dch3 倒数：span20，len=5-8（from=to+len≤20），蓝旗，全显
   dch4 藏格心算：span10，len=4-8，偶顺（from=1）奇倒（to=1）双向都有；途中格（inner）数字全藏
   dch5 大石头阵：span20，len=4-8，偶顺奇倒；途中格全藏；远端≥14 必跨 11-20 段
   dch6 跳两格：span20，mode=2，偶链 from=2→to=8-16 偶 / 奇链 from=1→to=7-15 奇（qi 偶奇交替，
     跳距恒 2，跳 2 递进数序模式化而非逐 1 数；len 为距离 6-14=2×(3-7) 跳）
   合法步 = 与当前位置相距恰一个步长的格（mode1=|n-cur|1；mode2=|n-cur|2，方向不限——旗色指方向
   但反向仍是合法跳）；点其余格 = 'far' 零惩罚（计一次错点，星级用）；点当前格 = 'self' 不计错
   藏格规则（r7）：dch4/5 途中格（不含 from/to）数字全藏（hidden=inner 全集）——起点锚+已跳格
   点亮轨迹+语音读题为支持面，去「逐格发光」兜底（game-main 已删连错 pulse） */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号六章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % N_CH + 1;

/* ---------- 途中介格（不含 from/to）：r7 藏格章 hidden=inner 全集（中间格不亮，心算内化数序） */
const pathInner = q => {
  const s = Math.min(q.from, q.to) + 1, e = Math.max(q.from, q.to) - 1, r = [];
  for (let v = s; v <= e; v++) r.push(v);
  return r;
};

/* ---------- 单题生成（rnd 同流保证确定性；lastPair=避免与上一题完全同起终点） ---------- */
function genOne(dch, qi, rnd, lastPair) {
  let from = 1, to = 5, mode = 1;
  for (let t = 0; t < 8; t++) {
    if (dch === 1) {                                    // 顺数 1-10：from=1，走 4-7 格
      from = 1; to = ri(rnd, 5, 8);
    } else if (dch === 2) {                             // 跨十顺数：to 15-20，len 4-8（必经 11-20）
      to = ri(rnd, 15, 20); from = to - ri(rnd, 4, 8);
    } else if (dch === 3) {                             // 倒数：差 5-8，from=to+len≤20
      const len = ri(rnd, 5, 8);
      to = ri(rnd, 5, 20 - len); from = to + len;
    } else if (dch === 4) {                             // 藏格心算（1-10）：len 4-8，偶顺（锚 1 起）奇倒（锚 1 终）
      const len = ri(rnd, 4, 8);
      if (qi % 2 === 0) { from = 1; to = 1 + len; } else { to = 1; from = 1 + len; }
    } else if (dch === 5) {                             // 大石头阵（1-20 藏格）：远端 14-19 必跨十段
      const len = ri(rnd, 4, 8);
      if (qi % 2 === 0) { to = ri(rnd, 14, 19); from = to - len; }
      else { from = ri(rnd, 14, 19); to = from - len; }
    } else {                                            // 跳两格：偶链 2→8-16 / 奇链 1→7-15（3-7 跳）
      mode = 2;
      if (qi % 2 === 0) { from = 2; to = 2 * ri(rnd, 4, 8); }
      else { from = 1; to = 2 * ri(rnd, 3, 7) + 1; }
    }
    if (lastPair == null || from !== lastPair[0] || to !== lastPair[1]) break;
  }
  const q = { type: 'hop', from: from, to: to, dir: to > from ? 1 : -1,
    len: Math.abs(to - from), mode: mode, hide: dch === 4 || dch === 5, hidden: [] };
  if (q.hide) q.hidden = pathInner(q);                  // 途中格全藏（不涉起终点，structOk 保证）
  q._cur = from;
  q._miss = 0;
  q._shown = [];
  return q;
}

/* ---------- 关卡生成（静态 30 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const quizzes = [];
  let lastPair = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, lastPair);
    lastPair = [q.from, q.to];
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, span: SPAN[dch], quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 跳步引擎（无 DOM）：engTap(L, n) —— 点第 n 号格（步长=当题 mode：1 或 2）
   'step' 跳到相距一个步长的格（未到目标）/ 'goal' 跳上目标格（本题完成）
   'done' 最后一题跳上目标格（本关通关）/ 'self' 点当前所站格（无事发生不计错）
   'far' 点其余格（跳过格/相邻但步长不符；零惩罚，计一次错点）/ null 非法或关卡已结束 ---------- */
function engTap(L, n) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof n !== 'number' || !isFinite(n) || Math.floor(n) !== n || n < 1 || n > L.span) return null;
  const step = q.mode === 2 ? 2 : 1;
  if (n === q._cur) return 'self';
  if (Math.abs(n - q._cur) !== step) {            // 非步长格（mode1 跳过格 / mode2 只跳一格）：摇头零惩罚
    q._miss = (q._miss || 0) + 1;
    L.retries++;
    return 'far';
  }
  q._cur = n;                                      // 兔子跳过去（mode2 跨过中间一块石头）
  if (q.hidden.indexOf(n) >= 0 && q._shown.indexOf(n) < 0) q._shown.push(n);   // 藏数字格：点对才亮
  if (n === q.to) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'goal';
  }
  return 'step';
}
/* 下一落点（教学"帮"指向/autoSolve 用）：朝目标方向的一个步长 */
const engNext = q => q._cur + (q.to > q._cur ? 1 : -1) * (q.mode === 2 ? 2 : 1);
const engWon = L => !!L && L.done;
/* 星级：一关零错点（retries=0）=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用，规则从 SPEC §3-r7 重列）：
   from≠to、方向与起终点一致、len=|to-from|、起终点在 1..20 内、藏数字格不涉起终点；
   mode2：len 偶且 6-14（3-7 跳）、from/to 同奇偶（同一跳 2 链）、无藏格；
   mode1：len 4-8；hide 章 hidden 恰为 inner 全集，非 hide 章 hidden 恒空 ---------- */
function structOk(q) {
  if (!q || q.from === q.to) return false;
  if (q.dir !== (q.to > q.from ? 1 : -1)) return false;
  if (q.len !== Math.abs(q.to - q.from)) return false;
  if (q.from < 1 || q.from > CELL_N || q.to < 1 || q.to > CELL_N) return false;
  if (q.hidden.indexOf(q.from) >= 0 || q.hidden.indexOf(q.to) >= 0) return false;
  const inner = pathInner(q);
  if (!q.hidden.every(h => inner.indexOf(h) >= 0)) return false;
  if (q.mode === 2) {
    if (q.len % 2 !== 0 || q.len < 6 || q.len > 14) return false;
    if (q.from % 2 !== q.to % 2) return false;
    return !q.hide && q.hidden.length === 0;
  }
  if (q.len < 4 || q.len > 8) return false;
  return q.hide ? q.hidden.length === inner.length : q.hidden.length === 0;
}
