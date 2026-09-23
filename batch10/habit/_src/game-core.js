/* ================= habit 纯引擎：确定性关卡生成 + 步骤排序/干扰辨析点选判定（无 DOM，UI 与 verify 共用）
   r5 难度改造（SPEC-BATCH10 §3-r5）：
   - 流程库 12：ch1 熟知 6 步（洗手/起床/刷牙/穿衣）/ ch2 非熟知因果序（包饺子/种花/寄信）/
     ch3 近义步辨析（洗澡/洗衣服/烤蛋糕 + 干扰 ×2）/ ch4 与生成关=全库混出（≥2 条 7-8 步
     长序列）+ 干扰 seeded 0-2
   - 卡区结构：q.cards = 展示卡描述符数组——{s:步骤号}（本序列真实步）与 {d:干扰索引}
     交错；q.shown 保留=真实步展示排列（0..n-1 且 ≠恒等）；q.decoys=[{h,s}] 干扰来源
     （他序列步骤引用）。answerIdx = cards 中 {s:pos} 的下标（钩子契约 r5）
   - 干扰公平构造：干扰恒非本序列步骤；干扰文本 ∉ 本序列步骤词；干扰文本两两互异；
     同主题（THEME）优先、候选不足回落全库——verify 断言
   - 点干扰卡 = 'wrong'（辨析即训练目标，miss 计数）；点已排真实步 = 'again'（零惩罚）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   引擎返回：'step' 排对一步（题未完）/ 'goal' 排对且本题完成 / 'done' 通关
     / 'wrong' 点错（真步顺序错或点干扰卡；卡晃动不灰化可重点，每点计一次错）
     / 'again' 已排过的步骤卡或已答完的题（防御层零惩罚）
     / null 非法下标或关卡已结束 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
/* 章型流程池（r5：ch1 熟知 / ch2 因果 / ch3 辨析池；ch4 与生成关走全库，full 分支处理） */
const HABIT_POOLS = {
  1: ['xishou', 'qichuang', 'shuaya', 'chuanyi'],
  2: ['baojiaozi', 'zhonghua', 'jixin'],
  3: ['xizao', 'xiyi', 'kaodangao']
};
/* 7-8 步长序列（ch4 混出保证 ≥2 条，"混出+长序列"章义） */
const LONG_HABITS = HABIT_IDS.filter(h => HABITS[h].steps.length >= 7);

/* ---------- 乱序生成：0..n-1 洗牌排列，恒等则重洗（必≠原序，SPEC §3 乱序约束） */
function genShown(n, rnd) {
  const idx = Array.from({ length: n }, (_, i) => i);
  let s = shuffled(idx, rnd), guard = 0;
  while (s.every((v, i) => v === i) && guard++ < 24) s = shuffled(idx, rnd);
  return s;
}

/* ---------- 干扰卡生成（r5 delta④公平构造）：
   候选=他序列全部步骤，滤掉文本 ∈ 本序列步骤词者；同主题（THEME）优先，
   同主题不足 k 才回落全库；按文本去重取 k 条（确定性 seeded） */
function genDecoys(hid, k, rnd) {
  if (!k || k <= 0) return [];
  const myTexts = HABITS[hid].steps.map(s => s.t);
  const theme = THEME[hid];
  const cands = [];
  HABIT_IDS.forEach(h => {
    if (h === hid) return;
    HABITS[h].steps.forEach((st, si) => {
      if (myTexts.indexOf(st.t) < 0) cands.push({ h: h, s: si, t: st.t, th: THEME[h] });
    });
  });
  const same = cands.filter(e => e.th === theme);
  const pool = shuffled(same.length >= k ? same : cands, rnd);
  const out = [], seen = {};
  for (let i = 0; i < pool.length && out.length < k; i++) {
    if (!seen[pool[i].t]) { seen[pool[i].t] = 1; out.push({ h: pool[i].h, s: pool[i].s }); }
  }
  return out;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const full = dch === 4 || flat >= STATIC_LEVELS;         // 章 4 混合 / 生成关=全库混出
  const pool = full ? HABIT_IDS : HABIT_POOLS[dch];
  let seq;
  if (full) {                                              // 全库混出：长序列 2 条 + 其余 3 条，5 流程互异
    const longs = shuffled(LONG_HABITS, rnd).slice(0, 2);
    const rest = shuffled(HABIT_IDS.filter(h => longs.indexOf(h) < 0), rnd).slice(0, CH_LEN - 2);
    seq = shuffled(longs.concat(rest), rnd);
  } else {                                                 // 章 1-3 池：前 |pool| 题互异保证池内各 ≥1，余题池内随机
    seq = shuffled(pool, rnd);
    while (seq.length < CH_LEN) seq.push(pool[ri(rnd, 0, pool.length - 1)]);
  }
  const quizzes = seq.map(hid => {
    const n = HABITS[hid].steps.length;
    /* 干扰数：DECOY_RULE 按难度章（ch1/ch2=0，ch3=2，full=seeded 0-2），MAX_CARDS 封顶 */
    let dc = full ? ri(rnd, 0, 2) : DECOY_RULE[dch];
    dc = Math.max(0, Math.min(dc, MAX_CARDS - n));
    const shown = genShown(n, rnd);
    const decoys = genDecoys(hid, dc, rnd);
    const cards = shuffled(shown.map(si => ({ s: si }))
      .concat(decoys.map((_, k) => ({ d: k }))), rnd);    // 真实步与干扰卡交错展示
    return { hid: hid, name: HABITS[hid].name,
      steps: HABITS[hid].steps.map(s => s.id),              // 正序步骤 id（钩子契约）
      shown: shown, decoys: decoys, cards: cards,
      pos: 0, answerIdx: cards.findIndex(c => c.s === 0),
      miss: 0, _answered: false };
  });
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点展示卡区第 i 张卡（q.cards 下标） */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) return null;
  if (q._answered) return 'again';
  const c = q.cards[i];
  if (c.d !== undefined) {                                  // 干扰卡：点它=错（辨析训练，可重点不灰化）
    q.miss++;
    L.retries++;
    return 'wrong';
  }
  if (c.s < q.pos) return 'again';                          // 已排入顺序条的步骤（UI .gone 拦截，兜底零惩罚）
  if (i === q.answerIdx) {
    q.pos++;
    if (q.pos >= q.steps.length) {                          // 本题全部排对
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'goal';
    }
    q.answerIdx = q.cards.findIndex(c2 => c2.s === q.pos);  // 下一步应点卡
    return 'step';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点（retries=0）=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：hid 在库、步骤表正序对账、shown=0..n-1 全排列且
   ≠恒等、cards=n+decoys 且真实步全覆盖一次、干扰公平构造（他序列/文本不撞/互异/数量规则）、
   pos/answerIdx 初始自洽、miss 起始 0。返回具体失败原因便于审计 */
function structWhy(q) {
  if (!q || !HABITS[q.hid]) return 'hid';
  const ref = HABITS[q.hid].steps, n = ref.length;
  if (n < 6 || n > 8) return 'stepsRange';                  // SPEC §3-r5：每流程 6-8 步
  if (!Array.isArray(q.steps) || q.steps.length !== n) return 'stepsLen';
  if (!q.steps.every((id, i) => id === ref[i].id)) return 'stepsOrder';
  if (!Array.isArray(q.shown) || q.shown.length !== n) return 'shownLen';
  const sorted = q.shown.slice().sort((a, b) => a - b);
  for (let i = 0; i < n; i++) if (sorted[i] !== i) return 'shownPerm';
  if (q.shown.every((v, i) => v === i)) return 'shownIdentity';   // 乱序必≠原序
  const myTexts = ref.map(s => s.t);
  if (!Array.isArray(q.decoys)) return 'decoysType';
  if (q.cards.length !== n + q.decoys.length || q.cards.length > MAX_CARDS) return 'cardsLen';
  const seenStep = [], seenDecoy = [], decoyTexts = [];
  for (let i = 0; i < q.cards.length; i++) {                // cards：真实步 0..n-1 各一次 + 干扰引用各一次
    const c = q.cards[i];
    if (c.d !== undefined) {
      if (!Number.isInteger(c.d) || c.d < 0 || c.d >= q.decoys.length || seenDecoy[c.d]) return 'cardsDecoy';
      seenDecoy[c.d] = 1;
      const dc = q.decoys[c.d];
      if (!dc || !HABITS[dc.h] || dc.h === q.hid) return 'decoyForeign';   // 干扰恒非本序列步骤
      if (!Number.isInteger(dc.s) || dc.s < 0 || dc.s >= HABITS[dc.h].steps.length) return 'decoyRef';
      const t = HABITS[dc.h].steps[dc.s].t;
      if (myTexts.indexOf(t) >= 0) return 'decoyTextClash';                // 干扰文本 ∉ 本序列步骤词
      if (decoyTexts.indexOf(t) >= 0) return 'decoyDup';                   // 干扰文本两两互异
      decoyTexts.push(t);
    } else {
      if (!Number.isInteger(c.s) || c.s < 0 || c.s >= n || seenStep[c.s]) return 'cardsStep';
      seenStep[c.s] = 1;
    }
  }
  if (q.pos !== 0) return 'pos';
  if (q.answerIdx !== q.cards.findIndex(c => c.s === 0)) return 'answerIdx';
  if (q.miss !== 0) return 'miss';
  return null;
}
