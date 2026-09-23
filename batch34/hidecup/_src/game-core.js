/* ================= hidecup 纯引擎：确定性关卡生成 + 点杯判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 311)（本款常量 311，SPEC-BATCH34 §0.82 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH34 §0.82 + SPEC-R25 §R2；进度章号单调递增、难度章号 dch=1+flat//5 静态四档）：
     dch1 c=2 s=1 / dch2 c=2 s=2 / dch3 c=3 s=2（r25 提速 900ms）/ dch4 谱=
     qi0/2/4 hide c=4 s=4 + qi1/3 hidedual c=3 s=3（r25：4杯4换+双动物+700ms）
     生成关（flat≥20）dch=ri(rnd,1,4) seeded 随机（域全档成立型——b33 硬性②）
   swaps 真值约束：每对 (a,b) a≠b 且 ⊆[0,c)；相邻两次换位至少一杯不同
   （数值对不全等——禁连续同一对回滚式假换；c=2 唯一可行解=数值交替
   (0,1)/(1,0)，c=3+ 优先异集合对）。
   answer=动物初始杯下标 start 经 swaps 逐次互换推导（derive 独立函数——
   verify 从 start+swaps 复算=对账锚，禁读 quiz.answer 直比）。hidedual（r25）
   双动物双答案 answerA/answerB 各自推导（双射恒推互异），q.answer=当前步
   真值（phase 0=A / 'half' 后引擎置=B）。
   quiz 结构：hide { kind, cups, swaps, start, answer, anim, _miss, _answered } /
   hidedual { kind, cups, swaps, startA/startB, answerA/answerB, animA/animB,
   phase, start/answer/anim(兼容面), _miss, _answered }
   铁律：每关 5 题；每关一主（level 级 anim，全题共用）+仅 dch4 一副（anim2≠主，
   双动物腿出场，其余不出场）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- answer 推导（对账锚：动物随杯走，位置跟踪模型）
   swap [a,b] 互换位置 a、b 的两杯——动物杯在位置 a 则到 b，在 b 则到 a ---------- */
function derive(start, swaps) {
  let p = start;
  for (let k = 0; k < swaps.length; k++) {
    const sw = swaps[k];
    if (p === sw[0]) p = sw[1];
    else if (p === sw[1]) p = sw[0];
  }
  return p;
}
/* ---------- swaps 生成：相邻两次至少一杯不同（禁连续同一对回滚式假换）
   c=3+ 优先异集合候选（更强防假换）；c=2 集合恒同 → 数值交替 (0,1)/(1,0) ---------- */
function genSwaps(c, s, rnd) {
  const swaps = [];
  let prev = null;
  const norm = p => p[0] < p[1] ? p[0] + ',' + p[1] : p[1] + ',' + p[0];
  for (let k = 0; k < s; k++) {
    const all = [];
    for (let a = 0; a < c; a++) for (let b = 0; b < c; b++) if (a !== b) all.push([a, b]);
    let cand = prev ? all.filter(p => norm(p) !== norm(prev)) : all;          // 优先异集合
    if (!cand.length)
      cand = all.filter(p => !(p[0] === prev[0] && p[1] === prev[1]));       // c=2：数值交替
    const p = cand[Math.floor(rnd() * cand.length)];
    swaps.push([p[0], p[1]]);
    prev = p;
  }
  return swaps;
}

/* ---------- 单题构建（SPEC-R25 §R3：dch4 按 DUAL_KINDS[qi] 分腿） ---------- */
function buildQuiz(dch, qi, rnd, anim, anim2) {
  const cfg = CH_CFG[dch];
  if (dch === 4 && DUAL_KINDS[qi] === 'hidedual') {
    /* 双动物腿：c=3 s=3（量域留旧 dch4 域——负荷在双轨迹不在杯数）；
       startA/startB 压缩采样互异（startB>=startA 则 +1，不耗重掷）；
       一串 swaps 两动物共用（同串换位各自追踪）；双射恒推 answerA≠answerB */
    const c = cfg.dc, s = cfg.ds;
    const startA = ri(rnd, 0, c - 1);
    let startB = ri(rnd, 0, c - 2);
    if (startB >= startA) startB++;
    const swaps = genSwaps(c, s, rnd);
    return { kind: 'hidedual', cups: c, swaps: swaps,
             startA: startA, startB: startB,
             answerA: derive(startA, swaps), answerB: derive(startB, swaps),
             animA: anim, animB: anim2, phase: 0,
             start: startA, answer: derive(startA, swaps),   /* 兼容面：answer 恒=当前步真值（phase0=A） */
             anim: anim, _miss: 0, _answered: false };
  }
  const c = cfg.c, s = cfg.s;
  const start = ri(rnd, 0, c - 1);
  const swaps = genSwaps(c, s, rnd);
  return { kind: 'hide', cups: c, start: start, swaps: swaps,
           answer: derive(start, swaps), anim: anim, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关
   随机章参数 dch=ri(rnd,1,4) 先取数保确定性；每关一主=level 级动物（池 5 随机） ---------- */
/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关
   随机章参数 dch=ri(rnd,1,4) 先取数保确定性；每关一主=level 级动物（池 5 随机）。
   r25：anim2（关副，≠主，同掷定值替换不耗种子）**仅 dch===4 取数**——
   dch1-3 rnd 消耗序列与 r25 前逐位一致（基线真不动） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 311);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const anim = ANIMALS[Math.floor(rnd() * ANIMALS.length)];  // 每关一主（先取数保确定性）
  let anim2 = null;                                          // 每关一副（仅 dch4 双动物腿出场）
  if (dch === 4) {
    anim2 = ANIMALS[Math.floor(rnd() * ANIMALS.length)];
    if (anim2 === anim) anim2 = ANIMALS[(ANIMALS.indexOf(anim) + 1) % ANIMALS.length];   // 同掷定值替换
  }
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(dch, qi, rnd, anim, anim2));
  return { flat: flat, ch: ch, dch: dch, lv: lv, anim: anim, anim2: anim2,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点杯引擎（无 DOM）：engTapCup(L, i) —— 点当前位置 i 的杯
   'right' 开对且本题完成推进 / 'done' 开对且末题=通关
   'half'  双动物第一步对（r25）：phase 0→1 切第二问，不置 _answered 不推 step
          （q.answer 同步=answerB——autoSolve/救援/豁免窗 guard 共用单一口径）
   'wrong' 开空：该题 miss+1（retries 全关累计=星级口径），杯盖回可重点（探索不罚）
   null    非法下标 / 关卡已结束 / 本题已答 ---------- */
function engTapCup(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cups) return null;
  if (i === q.answer) {
    if (q.kind === 'hidedual' && q.phase === 0) {
      q.phase = 1;
      q.answer = q.answerB;              /* 当前步真值切 B（breathe/guard/autoSolve 自动 phase 感知） */
      return 'half';
    }
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.82 miss 口径）：全关开空 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确杯位置（=q.answer，独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：章型 c/s 真值表（r25：
   dch4 谱=hide c4s4 / hidedual c3s3 按 DUAL_KINDS[qi] 分腿——关级谱构成断言在
   game-verify ③ 聚合，此处单题） / swaps 形状域（a≠b ⊆[0,c)）/ 相邻对非全等
   （禁假换）/ answer=derive 复算（hidedual 双答案复算互异）/ 动物池封闭 /
   初始态干净 ---------- */
function structWhy(q, dch, qi) {
  if (!q) return 'quiz';
  const cfg = CH_CFG[dch];
  if (!cfg) return 'dch';
  if (q.kind === 'hidedual') {                       /* r25 双动物腿（仅 dch4 谱位） */
    if (dch !== 4 || DUAL_KINDS[qi] !== 'hidedual') return 'dualPos';
    if (q.cups !== cfg.dc) return 'cups';
    if (!Array.isArray(q.swaps) || q.swaps.length !== cfg.ds) return 'swapsLen';
    const why = swapShapeWhy(q);
    if (why) return why;
    for (const s of ['startA', 'startB']) {
      if (!Number.isInteger(q[s]) || q[s] < 0 || q[s] >= q.cups) return s + 'Range';
    }
    if (q.startA === q.startB) return 'startSame';               // 两动物不同杯
    if (q.answerA !== derive(q.startA, q.swaps)) return 'answerA';   // 双答案独立复算
    if (q.answerB !== derive(q.startB, q.swaps)) return 'answerB';
    if (q.answerA === q.answerB) return 'answerSame';            // 双射恒推互异
    if (ANIMALS.indexOf(q.animA) < 0 || ANIMALS.indexOf(q.animB) < 0) return 'animPool';
    if (q.animA === q.animB) return 'animSame';                  // 两动物互异（链内无同键连播）
    if (q.phase !== 0) return 'phase';                           // 初始问 A
    if (q.answer !== q.answerA) return 'answer';                 // 兼容面=当前步真值（phase0=A）
    if (ANIMALS.indexOf(q.anim) < 0 || q.anim !== q.animA) return 'anim';
    if (q._miss !== 0 || q._answered) return 'init';
    return null;
  }
  if (q.kind !== 'hide') return 'kind';
  if (q.cups !== cfg.c) return 'cups';
  if (!Array.isArray(q.swaps) || q.swaps.length !== cfg.s) return 'swapsLen';
  const why2 = swapShapeWhy(q);
  if (why2) return why2;
  if (!Number.isInteger(q.start) || q.start < 0 || q.start >= q.cups) return 'startRange';
  if (q.answer !== derive(q.start, q.swaps)) return 'answer';     // answer 推导自洽
  if (ANIMALS.indexOf(q.anim) < 0) return 'anim';                 // 动物池封闭
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
/* swaps 形状域公共段（两 kind 共用）：a≠b ⊆[0,c) / 相邻对非全等（禁假换） */
function swapShapeWhy(q) {
  for (let k = 0; k < q.swaps.length; k++) {
    const sw = q.swaps[k];
    if (!Array.isArray(sw) || sw.length !== 2) return 'swapShape';
    if (!Number.isInteger(sw[0]) || !Number.isInteger(sw[1])) return 'swapInt';
    if (sw[0] === sw[1]) return 'swapSame';                       // a≠b
    if (sw[0] < 0 || sw[0] >= q.cups || sw[1] < 0 || sw[1] >= q.cups) return 'swapRange';
    if (k > 0) {
      const pv = q.swaps[k - 1];
      if (sw[0] === pv[0] && sw[1] === pv[1]) return 'swapRepeat';   // 同序重复=假换
      if (q.cups >= 3 && sw[0] === pv[1] && sw[1] === pv[0]) return 'swapBack';   // c>=3 同集合反向=真回滚（SPEC §5 裁决；c=2 数值交替例外）
    }
  }
  return null;
}
