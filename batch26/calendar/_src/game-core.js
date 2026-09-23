/* ================= calendar 引擎（确定性 RNG / 关卡生成 / 点选判定 / 星级 / 结构校验）
   关生成（确定性 seeded，同 flat 两次生成 JSON 一致；SPEC-R37 §R2/§R3 章谱）：
   dch1 星期接龙（逐行不动）：pool=章级乱序（星期三置首=flat0 题0 教学锚点），关 k 取
     pool[(k*5+i)%7] 连续 5 窗口——五关并集覆盖全 7 天（教学序列完备）
   dch2 月份族：month×3 轮转窗 (k*3+i)%12（五关单步并集覆盖全 12 月）
     + monthJump×1（±2 常规，base=月池洗牌取）+ 跨年 monthJumpCross×1（+2 base=十二月
     →二月 或 -2 base=一月→十一月，seeded 二选一）
   dch3 倒着想：day_rev×1（base 排星期一）+ month_rev×1（base 排一月）
     + day_m2 跨界×1（base∈{星期一,星期二}）+ month_m2 跨界×1（base∈{一月,二月}）
     + 接龙跨界×1（CROSS_TAIL 族 rnd——v1 难点保留）；跨界密度 1→3/关
   dch4 大挑战：anyOld×1（旧四型 rnd）+ anyJump×1（跳四型 rnd）+ dateq×1 + cbound×1
     + anyAll×1（全十型 rnd）——dateq/cbound 恒各 1，四基型互异（kind 唯一数 ≥4 恒成立）
   生成关 flat≥20：dch=ri(1,4) 随机章型（不变；b25 坑④：生成关 dch 由钩子直读）
   干扰：±1=base+答案另侧邻+1 随机（v1 原样）；±2/dateq=中转词（答案往 base 侧 1 格）
   +外侧邻+1 随机（dateq 排除锚 base——自指句语义防错配）；cbound=d1 不存在日期
   +d2 下月二号+d3 下下月一号（无 base 槽）。关内同签名（kind+base+dn）互异 */
'use strict';

function mulberry32(a) {
  return function () {
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

const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* 章级 base 池（dch1：星期三置首保 flat0 题0 锚点；dch2：全 12 月乱序） */
function famPool(dch, ch) {
  const rnd = mulberry32(ch * 31 + 7);
  if (dch === 1) {
    const rest = shuffled(DAYS.filter(d => d !== '星期三'), rnd);
    return ['星期三'].concat(rest);
  }
  return shuffled(MONTHS, rnd);
}

/* 关题面序列（{kind, base, dn?} 数组，长度 CH_LEN；rnd 消耗序固定） */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  if (dch === 1) {
    const pool = famPool(1, Math.floor(flat / CH_LEN) + 1);
    const k = flat % CH_LEN;
    for (let i = 0; i < CH_LEN; i++) seq.push({ kind: 'day', base: pool[(k * 5 + i) % 7] });
    return seq;
  }
  if (dch === 2) {
    const pool = famPool(2, Math.floor(flat / CH_LEN) + 1);
    const k = flat % CH_LEN;
    for (let i = 0; i < 3; i++) seq.push({ kind: 'month', base: pool[(k * 3 + i) % 12] });
    const mPool = shuffled(MONTHS, rnd);                     // 常规多步 base（全 12 月洗牌取首）
    seq.push({ kind: rnd() < 0.5 ? 'month_2' : 'month_m2', base: mPool[0] });
    seq.push(rnd() < 0.5 ? { kind: 'month_2', base: '十二月' }   // 跨年多步（→二月）
                         : { kind: 'month_m2', base: '一月' });  // 跨年多步（→十一月）
    return shuffled(seq, rnd);
  }
  if (dch === 3) {
    const crossKind = rnd() < 0.5 ? 'day' : 'month';
    seq.push({ kind: crossKind, base: CROSS_TAIL[crossKind] });          // 接龙跨界（答案绕回环首）
    const dp = shuffled(DAYS.filter(d => d !== '星期一'), rnd);          // 反向 base 排环首位
    const mp = shuffled(MONTHS.filter(m => m !== '一月'), rnd);
    seq.push({ kind: 'day_rev', base: dp[0] }, { kind: 'month_rev', base: mp[0] },
              { kind: 'day_m2', base: rnd() < 0.5 ? '星期一' : '星期二' },    // 前天跨界（→星期六/日）
              { kind: 'month_m2', base: rnd() < 0.5 ? '一月' : '二月' });    // 上上个月跨界（→十一月/十二月）
    return shuffled(seq, rnd);
  }
  /* dch4 大挑战：anyOld+anyJump+dateq+cbound+anyAll（各族独立池逐取，签名互异；
     anyAll 池=旧四+跳四——dateq/cbound 只由固定槽出，恒各恰 1，谱断言稳定） */
  const kinds = [KINDS[ri(rnd, 0, 3)], KINDS[4 + ri(rnd, 0, 3)], 'dateq', 'cbound', KINDS[ri(rnd, 0, 7)]];
  const dpool = shuffled(DAYS, rnd), mpool = shuffled(MONTHS, rnd);
  const dnPool = shuffled([0, 1, 2, 3, 4, 5, 6, 7], rnd), cbPool = shuffled(CB_SRC, rnd);
  let di = 0, mi = 0, dni = 0, ci = 0;
  kinds.forEach(k => seq.push(
    k === 'dateq'  ? { kind: k, base: dpool[di++], dn: dnPool[dni++] } :
    k === 'cbound' ? { kind: k, base: cbPool[ci++] } :
    { kind: k, base: famOf(k) === DAYS ? dpool[di++] : mpool[mi++] }));
  return seq;
}

/* 单题构造：answer=环步进 ±1/±2（dateq=+2）；cbound=月末边界行查表 */
function buildQuiz(spec, rnd) {
  const kind = spec.kind, base = spec.base;
  if (kind === 'cbound') {
    const answer = cbNext(base) + '一号';
    const words = [answer,                                        // 下月一号（正确）
                   base + cbD1W(base) + '号',                     // d1 不存在日期（大月小月教育近对）
                   cbNext(base) + '二号',                         // d2 下月二号
                   cbNext2(base) + '一号'];                       // d3 下下月一号
    const order = shuffled(words, rnd);
    return { kind: kind, base: base, answer: answer,
             opts: order.map((w, j) => ({ id: 'o' + j, word: w, right: w === answer })),
             _miss: 0, _answered: false };
  }
  const fam = famOf(kind);
  const bi = fam.indexOf(base);
  const d = dOf(kind);
  const answer = stepOf(fam, bi, d);
  const ai = fam.indexOf(answer);
  let near1, near2, pool;
  if (Math.abs(d) === 1) {                             // v1 原样：题面词=答案强相邻近对
    near1 = base;
    near2 = stepOf(fam, ai, d);                        // 答案另一侧邻
    pool = fam.filter(w => w !== answer && w !== near1 && w !== near2);
  } else {                                             // ±2/dateq：中转词+外侧邻
    const s = d > 0 ? 1 : -1;                          // 单步符号（中转/外侧均为环距 1——近对律）
    near1 = stepOf(fam, ai, -s);                       // 答案往 base 方向 1 格=路径中转（强近对）
    near2 = stepOf(fam, ai, s);                        // 答案外侧邻
    pool = fam.filter(w => w !== answer && w !== near1 && w !== near2 &&
                           (kind !== 'dateq' || w !== base));   // dateq 排除锚（self 句语义防错配）
  }
  const wild = pool[Math.floor(rnd() * pool.length)];
  const order = shuffled([answer, near1, near2, wild], rnd);
  const q = { kind: kind, base: base, answer: answer,
              opts: order.map((w, j) => ({ id: 'o' + j, word: w, right: w === answer })),
              _miss: 0, _answered: false };   /* 初始态显式置零（照 b24/b25：_miss++ 对 undefined 起步=NaN） */
  if (kind === 'dateq') q.dn = spec.dn;
  return q;
}

function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 401);  /* 401：生成关 flat20-39 dch 分布 5/5/5/5 四型全现（97 恰为死角） */
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点词卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张卡（opts 数组下标）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (q.opts[i].right) {
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
/* 星级（§0.63 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标 */
const correctIdx = q => {
  if (!q) return -1;
  for (let i = 0; i < q.opts.length; i++) if (q.opts[i].right) return i;
  return -1;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭集 / kind 规则 /
   answer=环步进 ±1/±2 或月末行表 / 近对在场 / 选项互异与 right 自洽 / 章型规则 /
   flat0q0 锚点 / 相邻题签名不重复 / 初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q || KINDS.indexOf(q.kind) < 0) return 'kind';
  if (q.kind === 'cbound') {                              // 跨月界：月末边界行表对账
    const end = CB_END[q.base];
    if (!end) return 'base';
    if (dch !== 4) return 'cbDch';                        // cbound 只允许 ch4/生成 dch4 谱
    const ni = MONTHS.indexOf(q.base);
    const answer = MONTHS[(ni + 1) % 12] + '一号';
    if (q.answer !== answer) return 'answerSeq';
    if (q.opts.length !== 4) return 'optsLen';
    const words = q.opts.map(o => o.word);
    if (words.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'optsDup';
    const legal = [answer, q.base + cbD1W(q.base) + '号',
                   MONTHS[(ni + 1) % 12] + '二号', MONTHS[(ni + 2) % 12] + '一号'];
    if (!words.every(w => legal.indexOf(w) >= 0)) return 'optsLib';
    if (words.filter(w => w === answer).length !== 1) return 'rightCount';
    for (let k = 0; k < q.opts.length; k++) {
      if (q.opts[k].right !== (q.opts[k].word === answer)) return 'rightFlag';
    }
    if (words.indexOf(q.base + cbD1W(q.base) + '号') < 0) return 'nearMissing';   // 不存在日期必在干扰
    if (flat === 0 && qi === 0) return 'anchor';
    if (prevQ && prevQ.kind === q.kind && prevQ.base === q.base) return 'adjacent';
    if (q._miss !== 0 || q._answered) return 'init';
    return null;
  }
  const fam = famOf(q.kind);
  if (fam.indexOf(q.base) < 0) return 'base';
  const bi = fam.indexOf(q.base);
  if (q.answer !== stepOf(fam, bi, dOf(q.kind))) return 'answerSeq';
  if (q.opts.length !== 4) return 'optsLen';
  const words = q.opts.map(o => o.word);
  if (words.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'optsDup';
  if (!words.every(w => fam.indexOf(w) >= 0)) return 'optsLib';
  if (words.filter(w => w === q.answer).length !== 1) return 'rightCount';
  for (let k = 0; k < q.opts.length; k++) {
    if (q.opts[k].right !== (q.opts[k].word === q.answer)) return 'rightFlag';
  }
  /* 近对=相邻项：答案的相邻天/月（环距 1）至少一在干扰（±2 题由中转+外侧邻自动满足） */
  const ai = fam.indexOf(q.answer);
  const nearOk = words.some(w => {
    if (w === q.answer) return false;
    const wi = fam.indexOf(w);
    return (wi - ai + fam.length) % fam.length === 1 || (ai - wi + fam.length) % fam.length === 1;
  });
  if (!nearOk) return 'nearMissing';
  if (q.kind === 'dateq' && words.indexOf(q.base) >= 0) return 'dateAnchor';   // dateq 锚不入干扰
  if (dch === 1 && q.kind !== 'day') return 'dch1kind';   // ch1 全为星期接龙
  if (dch === 2 && q.kind !== 'month' && q.kind !== 'month_2' && q.kind !== 'month_m2')
    return 'dch2kind';                                    // ch2 全为月份族（接龙+多步跳）
  if (dch === 3) {
    const cross = isCrossQ(q);                            // 接龙跨界（base=环尾）
    const m2c = (q.kind === 'day_m2' && (q.base === '星期一' || q.base === '星期二')) ||
                (q.kind === 'month_m2' && (q.base === '一月' || q.base === '二月'));   // 反向多步跨界
    const plainRev = q.kind === 'day_rev' || q.kind === 'month_rev';
    if (!cross && !m2c && !plainRev) return 'dch3bad';    // ch3 谱外题型（SPEC-R37 §R2）
  }
  if (flat === 0 && qi === 0 && !(q.kind === 'day' && q.base === '星期三')) return 'anchor';  // 教学演示锚点
  if (prevQ && prevQ.kind === q.kind && prevQ.base === q.base &&
      (q.kind !== 'dateq' || prevQ.dn === q.dn)) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}

/* 跨界题判定（verify/分布统计用）：接龙 base=环尾（答案绕回环首） */
const isCrossQ = q => (q.kind === 'day' || q.kind === 'month') && q.base === CROSS_TAIL[q.kind];
