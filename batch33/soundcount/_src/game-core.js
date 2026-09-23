/* ================= soundcount 纯引擎：确定性关卡生成 + 数字卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 733)（本款常量 733，SPEC-BATCH33 §0.79 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH33 §0.79 + SPEC-R24-SOUNDCOUNT r24 修订；进度章号单调递增、
   难度章号 dch=1+flat//5 静态四档）：
     dch1 counthear 5 连 · N∈[2,3] · 2 候选数字卡（基线原样）
     dch2 counthear 5 连 · N∈[3,4] · 3 候选（基线原样）
     dch3 countmix 5 连 · N∈[3,5]+M∈[1,2] 且 N+M≤6 · 4 候选（选择性计数只数鼓；基线原样）
     dch4 r24 固定谱 qi0/2/4=counthear N∈[6,10]（候选⊆{6..10}，量域上探）
          + qi1/3=countdual N∈[3,5]≠M∈[2,4]（候选⊆{1..5} 含双真值，双音色双问两步作答）
          ——两形态每关恒在场（确定性谱替代旧逐题掷币混出；countmix 单独形态留 dch3）
   quiz 结构：{ kind, count(鼓次数真值), mix(铃次数，counthear=0), phase(countdual 0=问鼓/1=问铃),
     seq(击序数组 'd'=鼓/'b'=铃——countmix/countdual 洗牌混排，音色间可相邻), opts[{num}],
     answer(真值卡下标=count 卡；countdual 第二步真值卡按 phase 求值见 ansIdxOf), _miss, _answered }
   铁律：数字卡互异含真值（counthear-dch4 ⊆{6..10}，余 ⊆{1..5}；countdual 恒含 count 与 mix）；
   seq 击数对账（'d' 数==count 且 'b' 数==mix 且长度==count+mix；counthear seq 恒全 'd'）。 */
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

/* ---------- 单题构建：kind 由章型/谱位先行定（各域互不越界） ---------- */
function buildQuiz(kind, dch, rnd) {
  let count, mix;
  if (kind === 'counthear') {
    count = dch === 1 ? ri(rnd, 2, 3) : dch === 2 ? ri(rnd, 3, 4)
           : dch === 4 ? ri(rnd, 6, 10) : ri(rnd, 2, 5);   // r24：dch4 大域腿 6-10
    mix = 0;
  } else if (kind === 'countdual') {         // r24 双音色双问：N∈3-5 鼓 + M∈2-4 铃 且 N≠M
    count = ri(rnd, 3, 5);
    mix = ri(rnd, 2, 4);
    if (mix === count) mix = (count === 3 ? 4 : count === 4 ? 3 : 2);   // 同掷值定值替换（域内且 ≠N）
  } else {                                   // countmix：N∈3-5+M∈1-2 且 N+M≤6（dch3 专用）
    count = ri(rnd, 3, 5);
    mix = ri(rnd, 1, 2);
    if (count + mix > 6) mix = 6 - count;    // 先验钳制（count≤5 → mix≥1 恒成立）
  }
  /* 击序：counthear 恒全 'd'；countmix/countdual 洗牌混排（音色间可相邻——随机序不刻意隔开） */
  const seq = kind === 'counthear'
    ? Array.from({ length: count }, () => 'd')
    : shuffled(Array.from({ length: count }, () => 'd')
        .concat(Array.from({ length: mix }, () => 'b')), rnd);
  /* 候选：真值 + 数字域干扰补齐（互异含真值；ch1 2/ch2 3/ch3+ 4 卡。
     r24：dch4 counthear 候选 ⊆{6..10} 大域带（近失区间）；countdual 候选 ⊆{1..5} 恒含双真值 */
  let picks;
  if (kind === 'countdual') {
    picks = [count, mix].concat(
      shuffled(NUMS5.filter(x => x !== count && x !== mix), rnd).slice(0, 2));
  } else if (kind === 'counthear' && dch === 4) {
    picks = [count].concat(shuffled(NUMS_HI.filter(x => x !== count), rnd).slice(0, 3));
  } else {
    const nOpt = dch === 1 ? 2 : dch === 2 ? 3 : 4;
    picks = [count].concat(shuffled(NUMS5.filter(x => x !== count), rnd).slice(0, nOpt - 1));
  }
  const order = shuffled(picks, rnd);
  const opts = order.map(x => ({ num: x }));
  let answer = -1;
  for (let j = 0; j < order.length; j++) if (order[j] === count) answer = j;
  const quiz = { kind: kind, count: count, mix: mix, seq: seq,
                 opts: opts, answer: answer, _miss: 0, _answered: false };
  if (kind === 'countdual') quiz.phase = 0;  // r24 两步：初始 0=问鼓（对则转 1=问铃）
  return quiz;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   dch4 r24 固定谱：qi0/2/4=counthear 大域 + qi1/3=countdual（两形态每关恒在场——
   确定性谱替代旧逐题掷币+全同翻 1；两族混出训练值由 countdual 承载，countmix 单独
   形态留 dch3）；建题按 kind 走各自域先验——域互不污染 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 733);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  let kinds;
  if (dch === 4) {
    kinds = [];
    for (let qi = 0; qi < CH_LEN; qi++)
      kinds.push(qi % 2 === 0 ? 'counthear' : 'countdual');  // r24 固定谱（SPEC-R24 §R3）
  } else kinds = Array.from({ length: CH_LEN },
    () => dch === 3 ? 'countmix' : 'counthear');
  const quizzes = kinds.map(k => buildQuiz(k, dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- r24 当前步真值卡下标：countdual 按 phase（0=count 鼓/1=mix 铃）求值；
   他 kind 恒 =q.answer（count 卡下标）。SC.quiz.answer/救援 breathe/教学帮指共用同口径 ---------- */
function ansIdxOf(q) {
  if (!q) return -1;
  if (q.kind !== 'countdual') return q.answer;
  const want = q.phase === 1 ? q.mix : q.count;
  for (let j = 0; j < q.opts.length; j++) if (q.opts[j].num === want) return j;
  return -1;
}
/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张数字卡（opts 数组下标）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'half'  r24 countdual 第一步（鼓）对：phase→1 转问铃，不置 _answered 不推 step
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (i === ansIdxOf(q)) {
    if (q.kind === 'countdual' && q.phase === 0) { q.phase = 1; return 'half'; }
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
/* 星级（§0.79 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星
   （r24 countdual 双步共用 miss 口径——两步各 1 判定点与单步题同构，分档不动） */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标（r24 phase 感知，独立函数供 verify 复核） */
const correctIdx = q => ansIdxOf(q);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：数字域 1-10 / 章型规则 /
   countmix 先验（N∈3-5/M∈1-2/N+M≤6）/ countdual 先验（r24：N∈3-5≠M∈2-4/phase 初始 0）/
   击序 seq 对账 / 候选互异含真值（dch4 counthear ⊆{6..10}）/ answer 自洽 / 初始态干净 ---------- */
function structWhy(q, dch, qi) {
  if (!q) return 'quiz';
  if (q.kind !== 'counthear' && q.kind !== 'countmix' && q.kind !== 'countdual') return 'kind';
  const isCH = q.kind === 'counthear';
  const isDual = q.kind === 'countdual';
  if (!Number.isInteger(q.count) || q.count < 1 || q.count > 10) return 'countDomain';  // ⊆1-10（r24 大域）
  if (isCH) {
    if (q.mix !== 0) return 'chMix';
    if (dch === 1 && (q.count < 2 || q.count > 3)) return 'dch1N';
    if (dch === 2 && (q.count < 3 || q.count > 4)) return 'dch2N';
    if (dch === 4 && (q.count < 6 || q.count > 10)) return 'dch4N';   // r24 大域腿 6-10
  } else if (isDual) {
    if (dch !== 4) return 'dualDch';                                 // countdual 仅 dch4
    if (q.count < 3 || q.count > 5) return 'dualN';                  // N∈3-5
    if (q.mix < 2 || q.mix > 4) return 'dualM';                      // M∈2-4
    if (q.count === q.mix) return 'dualEq';                          // N≠M 两步真值可区分
    if (q.phase !== 0) return 'dualPhase';                           // 初始步=问鼓
  } else {
    if (q.count < 3 || q.count > 5) return 'mixN';                   // N∈3-5
    if (q.mix < 1 || q.mix > 2) return 'mixM';                       // M∈1-2
    if (q.count + q.mix > 6) return 'mixSum';                        // N+M≤6
    if (dch !== 3) return 'mixDch';                                  // r24：countmix 仅 dch3
  }
  if (dch === 3 && !(!isCH && !isDual)) return 'dch3Kind';           // ch3 恒 countmix
  if (dch === 4 && !isCH && !isDual) return 'dch4Kind';              // ch4 恒 {counthear,countdual}
  if (dch === 1 && q.opts.length !== 2) return 'dch1Len';
  if (dch === 2 && q.opts.length !== 3) return 'dch2Len';
  if (dch >= 3 && q.opts.length !== 4) return 'dchLen';
  /* 击序对账：长度/鼓数/铃数；counthear 恒全 'd' */
  if (!Array.isArray(q.seq) || q.seq.length !== q.count + q.mix) return 'seqLen';
  if (q.seq.filter(x => x === 'd').length !== q.count) return 'seqDrum';
  if (q.seq.filter(x => x === 'b').length !== q.mix) return 'seqBell';
  if (q.seq.some(x => x !== 'd' && x !== 'b')) return 'seqEl';
  if (isCH && q.seq.length && q.seq.some(x => x !== 'd')) return 'seqPure';
  const vals = q.opts.map(o => o.num);
  const pool = (isCH && dch === 4) ? NUMS_HI : NUMS5;                // r24 大域候选带
  for (const v of vals) if (pool.indexOf(v) < 0) return 'optPool';
  if (new Set(vals).size !== vals.length) return 'optDup';           // 候选互异
  if (vals.indexOf(q.count) < 0) return 'optTruth';                  // 含真值
  if (isDual && vals.indexOf(q.mix) < 0) return 'optTruth2';         // r24 双问两步真值都在候选
  if (q.answer < 0 || q.answer >= vals.length) return 'ansRange';
  if (vals[q.answer] !== q.count) return 'ansIdx';                   // answer=真值卡下标（第一步）
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
