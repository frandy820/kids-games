/* ================= chartread 纯引擎：确定性关卡生成 + 象形图/问句构建 + 点选判定（无 DOM）
   种子 = mulberry32(flat * 7919 + 919)（本批常量 chr=919，SPEC-BATCH31 §0.78 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   r17 章型（CH_LEN=8；进度章号单调递增、难度章号 dch=1+flat//8 静态四档，生成关
   flat>=32 每关 seeded ri(1,4)）：
     dch1 读图数一数  3 类目 unit=1  most/least/howmany/total（四族都在场）
     dch2 一格代表2   3 类目 unit=2  howmany/total/compare（三族都在场；真值=格数×2，
                       数值干扰必含格数误读值——读图错因先验）
     dch3 两图比一比  4 类目 unit=1  twocompare/constraint/compare/howmany（四族都在场）
     dch4 读图大挑战  4 类目 unit=逐题掷 八族全池（每关八族各一；twocompare 恒 unit=1）
   每题独立图表：类目=洗牌 CATS6 取 ncat；值互异（图内无并列——most/least/second/
   constraint 答案唯一性先验）：
     unit=1 值域 10-20；unit=2 格数 5-10 互异、真值=格数×2（10-20 偶数互异）。
   flat0 题0 锚定 most（教学「看图找答案」演示锚点）。
   数学先验铁律：类目卡族候选=图内类目全集（互异含真值，干扰恰 n-1）；
   数字卡族候选 4 互异含真值，干扰=真值±1/±2/±3 内（unit=2 时必含格数误读值）；
   compare 两类目 A 值>B 值（差 1-10；unit=2 差 2-10 偶数）；
   constraint 真值=排序紧邻夹层（比 X 大又比 Y 小的唯一类目，X/Y=真值下/上邻）；
   twocompare 两图同类目对（上午/下午），下午目标行>上午目标行，差 2-8。 */
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

/* ---------- 每关题型序表 {kind}（genLevel 预生成，rnd 同流保确定性）
   域：dch1 四族 / dch2 三族 / dch3 四族 / dch4 八族（=CH_LEN 槽 → 每关八族各一）；
   在场保证：域内每族 >=1（8 槽 >= 域大，必有重复槽可换）；
   flat0q0 锚 most 先落，再做在场补齐（锚不被覆盖）。 ---------- */
const KIND_POOL = {
  1: ['most', 'least', 'howmany', 'total'],
  2: ['howmany', 'total', 'compare'],
  3: ['twocompare', 'constraint', 'compare', 'howmany'],
  4: ['most', 'least', 'second', 'howmany', 'total', 'compare', 'constraint', 'twocompare']
};
const NCAT_OF = { 1: 3, 2: 3, 3: 4, 4: 4 };      // 每章类目数（twocompare 图内恒 2）
const KIND_ALL = ['most', 'least', 'second', 'howmany', 'total', 'compare', 'constraint', 'twocompare'];
function kindSeqOf(dch, rnd, flat) {
  const pool = KIND_POOL[dch] || KIND_POOL[4];
  let seq = [];
  for (let i = 0; i < CH_LEN; i++) seq.push(pool[Math.floor(rnd() * pool.length)]);
  if (flat === 0) seq[0] = 'most';                 // 教学演示锚点：看图找最多
  for (const k of pool) {                          // 在场保证：缺族换入重复槽
    if (seq.indexOf(k) >= 0) continue;
    let slot = -1;
    for (let i = 0; i < CH_LEN; i++) {
      const v = seq[i];
      if (seq.indexOf(v) !== i) { slot = i; break; }   // 重复出现的槽（首次出现保留）
    }
    if (slot >= 0) seq[slot] = k;
  }
  return seq;
}

/* ---------- 数字候选（howmany 真值=行值 / total=合计 / compare·twocompare=差值）：
   4 个互异含真值；干扰=真值±1/±2/±3 域内随机；unit=2 时必含格数误读值 must
   （=真值/2 族：行格数/格数合计/格数差——按一格=1 误读的读图错因干扰，
   must 免受 ±3 近邻约束，验证侧独立对账）。 ---------- */
function numOpts(truth, rnd, lo, hi, must) {
  const near = [];
  for (let d = -3; d <= 3; d++) {
    const n = truth + d;
    if (d !== 0 && n >= lo && n <= hi) near.push(n);
  }
  const picks = [];
  if (must != null && Number.isInteger(must) && must !== truth && must >= lo && must <= hi)
    picks.push(must);                              // 格数误读值必入候选（首占 1 席）
  for (const n of shuffled(near, rnd)) {
    if (picks.length >= 3) break;
    if (n !== truth && picks.indexOf(n) < 0) picks.push(n);
  }
  const order = shuffled(picks.concat([truth]), rnd);
  let answer = -1;
  for (let j = 0; j < order.length; j++) if (order[j] === truth) answer = j;
  const opts = order.map(n => ({ num: n }));
  return { opts: opts, answer: answer };
}

/* 值升序下标表（并列不可能：值互异先验） */
const idxSortedByValue = values => values.map((v, i) => [v, i])
  .sort((a, b) => a[0] - b[0]).map(p => p[1]);

/* ---------- 单题构建（chart 先行：每题新图；kind 特定部分 rnd 定序消费） ---------- */
function buildQuiz(kind, dch, rnd) {
  const ncat = NCAT_OF[dch] || 4;
  /* unit：ch2 恒 2 / ch1·ch3 恒 1 / ch4 逐题掷（twocompare 恒 1——两图对比叠加换算
     超载，双难不同掷） */
  const unit = dch === 2 ? 2 : (dch === 4 && kind !== 'twocompare' ? ri(rnd, 1, 2) : 1);
  const cats = shuffled(CATS6, rnd).slice(0, ncat);          // 类目=洗牌取 ncat（互异）
  let cells;
  if (unit === 2) cells = shuffled([5, 6, 7, 8, 9, 10], rnd).slice(0, ncat);   // 格数互异
  else cells = shuffled([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], rnd).slice(0, ncat);
  const values = unit === 2 ? cells.map(c => c * 2) : cells.slice();           // 真值=格数×unit
  const q = { kind: kind, chart: { cats: cats, values: values, unit: unit },
              chart2: null, target: null, pair: null, opts: [], answer: -1, text: '',
              _miss: 0, _answered: false };
  if (kind === 'most' || kind === 'least' || kind === 'second') {
    /* 类目图卡族：候选=图内类目全集；most=max 行 / least=min 行 / second=升序倒数第 2 */
    const order = idxSortedByValue(values);
    const ti = kind === 'most' ? order[values.length - 1]
      : kind === 'least' ? order[0] : order[values.length - 2];
    const truth = cats[ti];
    const ord = shuffled(cats, rnd);                       // 候选=类目全集（洗牌防行序=卡序套路）
    q.opts = ord.map(c => ({ anim: c }));
    q.answer = ord.indexOf(truth);
    q.text = kind === 'most' ? '谁最多呀？' : (kind === 'least' ? '谁最少呀？' : '谁第二多呀？');
  } else if (kind === 'howmany') {                         // 数字卡：真值=目标行值（unit=2 含格数干扰）
    const ti = ri(rnd, 0, ncat - 1);
    q.target = cats[ti];
    const t = values[ti];
    const no = numOpts(t, rnd, 5, 21, unit === 2 ? cells[ti] : null);
    q.opts = no.opts; q.answer = no.answer;
    q.text = nameOf(q.target) + '有几只呀？';
  } else if (kind === 'total') {                           // 合计：真值=全行和（unit=2 含格数和干扰）
    const t = values.reduce((s, v) => s + v, 0);
    const mis = unit === 2 ? cells.reduce((s, v) => s + v, 0) : null;
    const no = numOpts(t, rnd, 15, 80, mis);
    q.opts = no.opts; q.answer = no.answer;
    q.text = '一共有几只呀？';
  } else if (kind === 'compare') {                         // 差值：A 值>B 值（unit=2 含格数差干扰）
    let a = ri(rnd, 0, ncat - 1), b = ri(rnd, 0, ncat - 1), g = 0;
    while (b === a && g++ < 24) { a = ri(rnd, 0, ncat - 1); b = ri(rnd, 0, ncat - 1); }
    if (b === a) b = (a + 1) % ncat;                       // 兜底确定性邻位
    if (values[a] < values[b]) { const tmp = a; a = b; b = tmp; }   // A 值>B 值
    q.pair = [cats[a], cats[b]];
    const t = values[a] - values[b];                       // 差 1-10（unit=2 偶数 2-10）
    const no = numOpts(t, rnd, 1, 12, unit === 2 ? t / 2 : null);
    q.opts = no.opts; q.answer = no.answer;
    q.text = nameOf(q.pair[0]) + '比' + nameOf(q.pair[1]) + '多几只呀？';
  } else if (kind === 'constraint') {
    /* 多步约束：真值=排序紧邻夹层（比下邻 X 多、比上邻 Y 少的唯一类目）；
       候选=类目全集，唯一性由「值互异+紧邻」结构性成立 */
    const order = idxSortedByValue(values);
    const r = ri(rnd, 1, values.length - 2);               // 真值名次 ∈ 中间（非极值）
    const ansI = order[r], lowI = order[r - 1], highI = order[r + 1];
    q.pair = [cats[lowI], cats[highI]];
    const truth = cats[ansI];
    const ord = shuffled(cats, rnd);
    q.opts = ord.map(c => ({ anim: c }));
    q.answer = ord.indexOf(truth);
    q.text = '比' + nameOf(cats[lowI]) + '多又比' + nameOf(cats[highI]) + '少的是谁呀？';
  } else {                                                 // twocompare：两图同类目对（上午/下午）
    const tc = cats.slice(0, 2);
    const ti = ri(rnd, 0, 1);                              // 目标类目（两图中同名行）
    const vLow = ri(rnd, 10, 17);                          // 上午目标值 ≤17（保证可加差 ≤20）
    const vHigh = ri(rnd, vLow + 1, 20);                   // 上午另一行值（>vLow 互异）
    const amV = ti === 0 ? [vLow, vHigh] : [vHigh, vLow];
    const diff = ri(rnd, 2, Math.min(8, 20 - vLow));       // 差 2-8
    const pmV = amV.slice();
    pmV[ti] = vLow + diff;                                 // 下午目标行 = 上午+diff（>上午）
    let g2 = 0, ov = ri(rnd, 10, 20);                      // 下午另一行：异于其上午值与下午目标值
    while ((ov === vHigh || ov === pmV[ti]) && g2++ < 30) ov = ri(rnd, 10, 20);
    if (ov === vHigh || ov === pmV[ti])
      for (let v = 10; v <= 20; v++) if (v !== vHigh && v !== pmV[ti]) { ov = v; break; }
    pmV[1 - ti] = ov;
    q.chart = { cats: tc.slice(), values: amV, unit: 1 };
    q.chart2 = { cats: tc.slice(), values: pmV, unit: 1 };
    q.target = tc[ti];
    const no = numOpts(diff, rnd, 1, 10, null);
    q.opts = no.opts; q.answer = no.answer;
    q.text = TWO_LABELS[1] + '的' + nameOf(q.target) + '比' + TWO_LABELS[0] + '的多几只呀？';
  }
  return q;
}

/* ---------- 关卡生成（静态 32 关与生成关同一确定性通道；生成关 flat>=32 每关随机章参数）
   flat0 题0 恒 most（§3 教学演示锚点） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 919);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const kinds = kindSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(kinds[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张候选卡（opts 数组下标）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (i === q.answer) {
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
/* 星级（§0.78 口径）：全关错选 0=3 星 / 1-2=2 星 / >=3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标（=q.answer，独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;
/* 类目行下标（chart.cats 内）：方向级按答案类目找行 */
const rowIdxOf = (q, cat) => !q || !q.chart ? -1 : q.chart.cats.indexOf(cat);
/* howmany 目标行 / compare 两行下标（方向级逐格 pulse 用） */
const howmanyRowIdx = q => rowIdxOf(q, q && q.target);
const compareRowIdx = q => !q || !q.pair ? [-1, -1]
  : [rowIdxOf(q, q.pair[0]), rowIdxOf(q, q.pair[1])];
/* constraint 两约束行下标（X 下邻/Y 上邻——pulse 约束锚不泄答案） */
const constraintRowIdx = q => compareRowIdx(q);
/* second 答案行下标（升序倒数第 2——答案级 lit 用）；most/least 极值行 */
const rankRowIdx = q => {
  if (!q || !q.chart) return -1;
  const order = idxSortedByValue(q.chart.values);
  if (q.kind === 'most') return order[q.chart.values.length - 1];
  if (q.kind === 'least') return order[0];
  if (q.kind === 'second') return order[q.chart.values.length - 2];
  return -1;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）：类目/值域/unit 先验 /
   章型规则 / 各族真值与候选先验 / answer 自洽 / flat0q0 锚点 / 初始态干净 ---------- */
function structWhy(q, dch, flat, qi) {
  if (!q) return 'quiz';
  if (KIND_ALL.indexOf(q.kind) < 0) return 'kind';
  const ch = q.chart;
  if (!ch || !Array.isArray(ch.cats) || !Array.isArray(ch.values)) return 'chart';
  if (KIND_POOL[dch].indexOf(q.kind) < 0) return 'pool';       // 章型域
  if (dch !== 4 && ch.unit !== (dch === 2 ? 2 : 1)) return 'unit';   // ch1/2/3 unit 定死
  if (ch.unit !== 1 && ch.unit !== 2) return 'unitV';
  const ncat = q.kind === 'twocompare' ? 2 : NCAT_OF[dch];
  if (ch.cats.length !== ncat) return 'ncat';
  for (const c of ch.cats) if (CATS6.indexOf(c) < 0) return 'catPool';
  if (new Set(ch.cats).size !== ch.cats.length) return 'catDup';
  if (ch.values.length !== ch.cats.length) return 'vlen';
  for (const v of ch.values) if (!Number.isInteger(v) || v < 10 || v > 20) return 'vRange';
  if (new Set(ch.values).size !== ch.values.length) return 'vDup';   // 值互异（无并列先验）
  if (ch.unit === 2) {
    for (const v of ch.values) {
      const c = v / 2;                                               // 格数 5-10（真值=格数×2）
      if (v % 2 !== 0 || c < 5 || c > 10) return 'cellRange';
    }
  }
  if (q.kind === 'twocompare') {
    const c2 = q.chart2;
    if (!c2 || !Array.isArray(c2.cats) || c2.unit !== 1) return 'twoChart';
    if (c2.cats.join() !== ch.cats.join()) return 'twoCats';        // 两图同类目对
    if (c2.values.length !== 2) return 'twoVlen';
    for (const v of c2.values) if (!Number.isInteger(v) || v < 10 || v > 20) return 'twoVRange';
    if (new Set(c2.values).size !== 2) return 'twoVDup';
    const ti = ch.cats.indexOf(q.target);
    if (ti < 0) return 'target';
    if (c2.values[ti] <= ch.values[ti]) return 'twoOrder';          // 下午>上午先验
    const d = c2.values[ti] - ch.values[ti];
    if (d < 2 || d > 8) return 'twoDiff';                           // 差 2-8
    const nums = q.opts.map(o => o.num);
    if (nums.length !== 4) return 'nLen';
    for (const n of nums) if (!Number.isInteger(n) || n < 1 || n > 10) return 'nRange';
    if (new Set(nums).size !== 4) return 'nDup';
    if (nums.indexOf(d) < 0) return 'nTruth';
    if (nums.some(n => n !== d && Math.abs(n - d) > 3)) return 'nFar';
    if (q.answer < 0 || q.answer >= 4 || nums[q.answer] !== d) return 'ansIdx';
    if (q.text !== TWO_LABELS[1] + '的' + nameOf(q.target) + '比' + TWO_LABELS[0] + '的多几只呀？') return 'text';
    if (q.pair !== null) return 'extra';
    return (q._miss !== 0 || q._answered) ? 'init' : null;
  }
  if (q.chart2 !== null) return 'extra';                             // 仅 twocompare 有两图
  if (flat === 0 && qi === 0 && q.kind !== 'most') return 'anchor';  // 教学演示锚点
  if (q.kind === 'most' || q.kind === 'least' || q.kind === 'second' ||
      q.kind === 'constraint') {                                     // 类目图卡族
    let truth = null;
    const order = idxSortedByValue(ch.values);
    if (q.kind === 'most') truth = ch.cats[order[order.length - 1]];
    else if (q.kind === 'least') truth = ch.cats[order[0]];
    else if (q.kind === 'second') truth = ch.cats[order[order.length - 2]];
    else {                                                           // constraint：夹层唯一
      if (!Array.isArray(q.pair) || q.pair.length !== 2) return 'pair';
      const lowI = ch.cats.indexOf(q.pair[0]), highI = ch.cats.indexOf(q.pair[1]);
      if (lowI < 0 || highI < 0 || lowI === highI) return 'pairPool';
      if (ch.values[lowI] >= ch.values[highI]) return 'pairOrder';    // X<Y 先验
      const between = ch.cats.filter((c, i) => ch.values[i] > ch.values[lowI] && ch.values[i] < ch.values[highI]);
      if (between.length !== 1) return 'pairMid';                     // 夹层恰 1（真值唯一）
      truth = between[0];
    }
    const vals = q.opts.map(o => o.anim);
    if (q.opts.length !== ch.cats.length) return 'optLen';           // 候选=类目全集
    for (const v of vals) if (ch.cats.indexOf(v) < 0) return 'optPool';
    if (new Set(vals).size !== vals.length) return 'optDup';
    if (vals.length !== new Set(ch.cats.concat(vals)).size) return 'optSet';
    if (vals.indexOf(truth) < 0) return 'optTruth';
    if (q.answer < 0 || q.answer >= vals.length) return 'ansRange';
    if (vals[q.answer] !== truth) return 'ansIdx';
    if (q.kind !== 'constraint' && q.pair !== null) return 'extra';
    if (q.kind === 'constraint' &&
        q.text !== '比' + nameOf(q.pair[0]) + '多又比' + nameOf(q.pair[1]) + '少的是谁呀？') return 'text';
    if (q.kind === 'most' && q.text !== '谁最多呀？') return 'text';
    if (q.kind === 'least' && q.text !== '谁最少呀？') return 'text';
    if (q.kind === 'second' && q.text !== '谁第二多呀？') return 'text';
    if (q.target !== null) return 'extra';
  } else {                                                           // 数字卡族
    let truth = null, mis = null, lo = 1, hi = 12, text = null;
    if (q.kind === 'howmany') {
      const ti = ch.cats.indexOf(q.target);
      if (ti < 0) return 'target';                                   // 目标 ∈ 图内类目
      if (q.pair !== null) return 'extra';
      truth = ch.values[ti];
      if (ch.unit === 2) mis = ch.values[ti] / 2;                    // 格数误读值
      lo = 5; hi = 21;
      text = nameOf(q.target) + '有几只呀？';
    } else if (q.kind === 'total') {
      truth = ch.values.reduce((s, v) => s + v, 0);
      if (ch.unit === 2) mis = ch.values.reduce((s, v) => s + v / 2, 0);   // 格数合计误读值
      lo = 15; hi = 80;
      text = '一共有几只呀？';
      if (q.target !== null || q.pair !== null) return 'extra';
    } else {                                                         // compare
      if (!Array.isArray(q.pair) || q.pair.length !== 2) return 'pair';
      const ai = ch.cats.indexOf(q.pair[0]), bi = ch.cats.indexOf(q.pair[1]);
      if (ai < 0 || bi < 0 || ai === bi) return 'pairPool';
      if (ch.values[ai] <= ch.values[bi]) return 'pairOrder';        // A 值>B 值先验
      truth = ch.values[ai] - ch.values[bi];                         // 差 1-10
      if (truth < 1 || truth > 10) return 'pairDiff';
      if (ch.unit === 2) mis = truth / 2;
      lo = 1; hi = 12;
      text = nameOf(q.pair[0]) + '比' + nameOf(q.pair[1]) + '多几只呀？';
      if (q.target !== null) return 'extra';
    }
    const nums = q.opts.map(o => o.num);
    if (nums.length !== 4) return 'nLen';
    for (const n of nums) if (!Number.isInteger(n) || n < lo || n > hi) return 'nRange';
    if (new Set(nums).size !== 4) return 'nDup';
    if (nums.indexOf(truth) < 0) return 'nTruth';
    if (mis != null && nums.indexOf(mis) < 0) return 'nMis';         // 格数误读值必在候选
    if (nums.some(n => n !== truth && n !== mis && Math.abs(n - truth) > 3)) return 'nFar';
    if (q.answer < 0 || q.answer >= 4 || nums[q.answer] !== truth) return 'ansIdx';
    if (q.text !== text) return 'text';
  }
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
