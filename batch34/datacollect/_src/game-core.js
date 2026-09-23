/* ================= datacollect 纯引擎：确定性关卡生成 + 场景成对布点 + 点格/数值卡判定（无 DOM）
   种子 = mulberry32(flat * 7919 + 809)（本批常量 dc=809，SPEC-BATCH34 §0.84/§3-r14 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   r14 题型六族（数值题恒居制表完成后=读表计算）：count（点格 answer/2 格）/ sum / diff
   / mostdiff（旧 most 改差值数值作答）/ change / totalchange（dch4 两次调查）。
   章型先验（r14）：dch1=2 类值偶 10-20 互异 5×count｜dch2=2 类偶 12-30 互异差≥4
   3count+1sum+1diff｜dch3=3 类偶 10-24 互异总≤60 3count+1sum+1mostdiff
   ｜dch4=两次调查 2 类 survey2 偶 10-16 互异、ΔA·ΔB 偶 2-8 同向（survey1=survey2∓Δ）
   2count+2change+1totalchange；生成关（flat≥20）dch=seeded ri(1,4) 先取数保确定性。
   数值卡 4 选 1：answer+3 干扰洗牌 answerIdx；干扰池=类别混淆值+运算混淆值+换算近误
   answer±2（序贯取 3 个合法互异——wordprob r13 范式；反启发式锚=干扰刻意含类别值/他题答案）。
   flat0 教学锚（SPEC §3-r14 定稿）：scene={rabbit:8, chick:10}（crafted 豁免 dch1 值域），
   q0=rabbit 8（watch 演示 4 tap）/ q1=chick 10（turn 你来数）。
   每关一景一表：rowsLit=各类目「这次」条带已点亮格下标集（跨题累积——制表叙事）；
   count 题开题时该行清空重收集（engOpen，重问防已满行秒判）；dch4 上次条带=静态淡格
   （渲染层 lit=scene1/SCALE 格，不进 rowsLit）。 */
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

/* ---------- 偶数序列 [lo..hi] 步 2（r14 全款取值恒偶） ---------- */
function evenSeq(lo, hi) {
  const a = [];
  for (let v = lo; v <= hi; v += 2) a.push(v);
  return a;
}

/* ---------- 数量采样：洗牌偶域取 k 个互异 + 章附加约束（拒绝采样 40 轮，
   兜底手造合法组——确定性同 rnd 流）。
   dch1 [10,20] / dch2 [12,30] 差≥4 / dch3 [10,24] 总≤60 / dch4 [10,16]（survey2）。 ---------- */
function pickEven(k, lo, hi, rnd, ok) {
  const dom = evenSeq(lo, hi);
  for (let g = 0; g < 40; g++) {
    const cand = shuffled(dom, rnd).slice(0, k);
    if (!ok || ok(cand)) return cand;
  }
  const fb = { '2:12:30': [12, 16], '3:10:24': [10, 12, 14] }[k + ':' + lo + ':' + hi];
  return fb || dom.slice(0, k);   // 兜底：附加约束章手造合法组，其余=域内最小 k 个互异偶
}

/* ---------- count 问句序列：n 问覆盖场景全类（每类 ≥1）+ 禁连续同名
   （重问即行清空重收集，连续重问体验差）；k≥2 且 n≥k 时 choices 恒非空。 ---------- */
function askSeq(cats, n, rnd) {
  const seq = [];
  const pool = shuffled(cats, rnd);                 // 覆盖层：每类先各问一轮
  for (let i = 0; i < n; i++) {
    let c;
    if (i < pool.length) c = pool[i];
    else {
      const choices = cats.filter(x => x !== seq[seq.length - 1]);
      c = choices[Math.floor(rnd() * choices.length)];
    }
    seq.push(c);
  }
  return seq;
}

/* ---------- 场景成对布点（确定性，r14 一格=2 只视觉锚）：每类 values/SCALE 对，
   每对两只（s=1 正 / s=0.86 翻面略小——成对可辨）；对槽=网格洗牌取位+槽内抖动。
   beast 基础尺寸按总对数分档：P≤12 → 52 / P≤20 → 44 / 其余 38（makePlace 返 w）。 ---------- */
function makePlace(cats, values, rnd) {
  const pairCat = [];
  cats.forEach((c, ci) => { for (let n = 0; n < values[ci] / SCALE; n++) pairCat.push(c); });
  const P = pairCat.length;
  const w = P <= 12 ? 52 : P <= 20 ? 44 : 38;
  const cols = P <= 12 ? 4 : P <= 20 ? 5 : 6;
  const rows = Math.ceil(P / cols);
  const slots = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) slots.push([c, r]);
  const sh = shuffled(slots, rnd).slice(0, P);
  const out = [];
  pairCat.forEach((cat, i) => {
    const sc = sh[i][0], sr = sh[i][1];
    const cx = Math.max(8, Math.min(92, (sc + 0.5) / cols * 100 + (rnd() - 0.5) * 10));
    const cy = Math.max(10, Math.min(90, (sr + 0.5) / rows * 100 + (rnd() - 0.5) * 12));
    out.push({ c: cat, x: Math.round((cx - 6) * 10) / 10, y: Math.round((cy - 5) * 10) / 10,
               s: 1, f: false, w: w });                       // 对内第一只
    out.push({ c: cat, x: Math.round((cx + 6) * 10) / 10, y: Math.round((cy + 6) * 10) / 10,
               s: 0.86, f: true, w: w });                     // 对内第二只（翻面略小）
  });
  return out;
}

/* ---------- 干扰池（r14 数值卡 4 选 1；序贯取 3——确定性优先序，wordprob r13 范式）：
   类别混淆值（读表行值——他题 count 答案即反启发式锚）+ 运算混淆值（和差互混/极值）
   + 换算近误 answer±2；取值约束=偶且 ∈[2,60]（NUMCN 封闭域）、≠answer、互异。 ---------- */
function distractPool(q, L) {
  const A = q.answer;
  const sc = L.scene;
  if (q.kind === 'sum' || q.kind === 'diff') {
    const a = sc[q.ask[0]], b = sc[q.ask[1]];
    return q.kind === 'sum'
      ? [Math.abs(a - b), a, b, A + 2, A - 2]                 // sum：差互混+类别值
      : [a + b, a, b, A + 2, A - 2];                          // diff：和互混+类别值
  }
  if (q.kind === 'mostdiff') {
    const vs = L.cats.map(c => sc[c]).sort((x, y) => y - x);  // 降序
    return [vs[0], vs[1], vs[2], A + 2, A - 2];               // 极值/中间行值
  }
  if (q.kind === 'change') {
    const other = L.cats.find(c => c !== q.ask);              // 另一类（k=2）
    return [sc[q.ask], L.scene1[q.ask],
            Math.abs(sc[other] - L.scene1[other]), A + 2, A - 2];
  }
  const d0 = Math.abs(sc[L.cats[0]] - L.scene1[L.cats[0]]);   // totalchange：两类 Δ
  const d1 = Math.abs(sc[L.cats[1]] - L.scene1[L.cats[1]]);
  return [d0, d1, Math.abs(d0 - d1), A + 2, A - 2];
}
function pickDistract(q, L) {
  const ds = [];
  for (const v of distractPool(q, L)) {
    if (ds.length >= 3) break;
    if (!Number.isInteger(v) || v < 2 || v > 60 || v % 2 !== 0) continue;   // NUMCN 封闭域
    if (v === q.answer || ds.indexOf(v) >= 0) continue;
    ds.push(v);
  }
  while (ds.length < 3) {                                     // 防御（合法池恒足 3，不触发）
    const v = q.answer + 2 * (ds.length + 1);
    if (v <= 60 && v !== q.answer && ds.indexOf(v) < 0) ds.push(v); else ds.push(q.answer - 2 * (ds.length + 1));
  }
  return ds;
}

/* ---------- 单题构建 ---------- */
function buildQuiz(kind, ask, answer, L, rnd) {
  const q = { kind: kind, ask: ask, answer: answer, _miss: 0, _answered: false };
  if (kind === 'count') q._opened = false;
  else {
    q.options = shuffled([answer].concat(pickDistract(q, L)), rnd);
    q.answerIdx = q.options.indexOf(answer);
  }
  return q;
}

/* ---------- 开题整备：count 题首次成为当前题时该行清空（重问=重新收集） ---------- */
function engOpen(L) {
  const q = L && L.quizzes[L.step];
  if (q && q.kind === 'count' && !q._opened) {
    q._opened = true;
    L.rowsLit[q.ask] = [];
  }
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   flat0 教学锚（SPEC §3-r14 定稿）：scene={rabbit:8, chick:10}（豁免 dch1 值域），
   q0=rabbit 8（watch 演示 4 tap）/ q1=chick 10（turn 你来数）。 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 809);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  let cats, values, scene1 = null, quizzes;
  if (flat === 0) {                                          // 教学锚关（crafted，确定性）
    cats = ['rabbit', 'chick'];
    values = [8, 10];
    quizzes = ['rabbit', 'chick', 'rabbit', 'chick', 'rabbit']
      .map(a => buildQuiz('count', a, values[cats.indexOf(a)], null, rnd));
  } else if (dch === 1) {
    cats = shuffled(ANIMALS6, rnd).slice(0, 2);
    values = pickEven(2, 10, 20, rnd, v => v[0] !== v[1]);
    quizzes = askSeq(cats, CH_LEN, rnd)
      .map(a => buildQuiz('count', a, values[cats.indexOf(a)], null, rnd));
  } else if (dch === 2) {
    cats = shuffled(ANIMALS6, rnd).slice(0, 2);
    values = pickEven(2, 12, 30, rnd, v => Math.abs(v[0] - v[1]) >= 4);
    const L0 = { cats: cats, scene: {} };
    cats.forEach((c, i) => { L0.scene[c] = values[i]; });
    quizzes = askSeq(cats, 3, rnd)
      .map(a => buildQuiz('count', a, values[cats.indexOf(a)], null, rnd));
    quizzes.push(buildQuiz('sum', [cats[0], cats[1]], values[0] + values[1], L0, rnd));
    quizzes.push(buildQuiz('diff', [cats[0], cats[1]], Math.abs(values[0] - values[1]), L0, rnd));
  } else if (dch === 3) {
    cats = shuffled(ANIMALS6, rnd).slice(0, 3);
    values = pickEven(3, 10, 24, rnd, v => v[0] + v[1] + v[2] <= 60);
    const L0 = { cats: cats, scene: {} };
    cats.forEach((c, i) => { L0.scene[c] = values[i]; });
    quizzes = askSeq(cats, 3, rnd)
      .map(a => buildQuiz('count', a, values[cats.indexOf(a)], null, rnd));
    const two = shuffled(cats, rnd).slice(0, 2);             // sum 取随机两类（确定性）
    quizzes.push(buildQuiz('sum', two, L0.scene[two[0]] + L0.scene[two[1]], L0, rnd));
    const vs = values.slice().sort((x, y) => y - x);         // mostdiff：最多类与最少类行（名音链序）
    const maxCat = cats[values.indexOf(vs[0])], minCat = cats[values.indexOf(vs[vs.length - 1])];
    quizzes.push(buildQuiz('mostdiff', [maxCat, minCat], vs[0] - vs[vs.length - 1], L0, rnd));
  } else {
    cats = shuffled(ANIMALS6, rnd).slice(0, 2);
    values = pickEven(2, 10, 16, rnd, v => v[0] !== v[1]);
    const up = rnd() < 0.5;                                  // 同向：两类都多（up）或少
    const d = [ri(rnd, 1, 4) * 2, ri(rnd, 1, 4) * 2];        // ΔA·ΔB 偶 2-8
    const scene = {};
    scene1 = {};
    cats.forEach((c, i) => { scene[c] = values[i]; scene1[c] = up ? values[i] - d[i] : values[i] + d[i]; });
    const L0 = { cats: cats, scene: scene, scene1: scene1 };
    quizzes = askSeq(cats, 2, rnd)
      .map(a => buildQuiz('count', a, scene[a], null, rnd));
    cats.forEach(c => {
      const cq = buildQuiz('change', c, Math.abs(scene[c] - scene1[c]), L0, rnd);
      cq.up = up;                                            // 「这次比第一次多/少」方向（同关同向）
      quizzes.push(cq);
    });
    const tq = buildQuiz('totalchange', null, d[0] + d[1], L0, rnd);
    tq.up = up;
    quizzes.push(tq);
    values = cats.map(c => scene[c]);
    const L = { flat: flat, ch: ch, dch: dch, lv: lv, cats: cats, values: values,
                scene: scene, scene1: scene1, rowsLit: {}, place: makePlace(cats, values, rnd),
                quizzes: quizzes, step: 0, retries: 0, done: false };
    cats.forEach(c => { L.rowsLit[c] = []; });
    engOpen(L);
    return L;
  }
  const scene = {};
  cats.forEach((c, i) => { scene[c] = values[i]; });
  const rowsLit = {};
  cats.forEach(c => { rowsLit[c] = []; });
  const L = { flat: flat, ch: ch, dch: dch, lv: lv, cats: cats, values: values,
              scene: scene, scene1: scene1, rowsLit: rowsLit, place: makePlace(cats, values, rnd),
              quizzes: quizzes, step: 0, retries: 0, done: false };
  engOpen(L);
  return L;
}

/* ---------- 点格引擎（无 DOM）：engTapCell(L, i) —— 点当前 count 题问句行「这次」条带格 i
   （r14 一格=2 只：n=countSteps=answer/2）
   'lit'   点亮未满格（含点满 n 格的那一格——main 层随后挂 settle 自动判定）
   'off'   撤回：点亮格再点=熄灭（探索不罚，不计 miss——SPEC §0.84 可撤回）
   'wrong' 超点：已点满 n 格再点第 n+1 格（settle 待决窗内瞬间判错，
           错格不点亮（main 层闪红熄灭），已点 n 格保留——判错不清零）
   null    非 count 题 / 非法下标 / 关卡已结束 ---------- */
function engTapCell(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q.kind !== 'count') return null;
  if (!Number.isInteger(i) || i < 0 || i >= CELLS) return null;
  const lit = L.rowsLit[q.ask];
  const at = lit.indexOf(i);
  if (at >= 0) { lit.splice(at, 1); return 'off'; }          // 撤回熄灭
  if (lit.length >= countSteps(q)) {                         // 超点第 n+1 格
    q._miss++; L.retries++;
    return 'wrong';
  }
  lit.push(i);                                               // 点亮（点亮即按群计数）
  return 'lit';
}

/* ---------- 点满自动判定（settle 到点由 main 层计时驱动）：engSettle(L)
   'right' 判对推进 / 'done' 判对且末题=通关 / null 未满格或非 count 题 ---------- */
function engSettle(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q.kind !== 'count') return null;
  if (L.rowsLit[q.ask].length !== countSteps(q)) return null;   // 唯一触发件=点满 n 格
  q._answered = true;
  L.step++;
  engOpen(L);                                                // 下一 count 题开题行清空
  if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
  return 'right';
}

/* ---------- 点数值卡引擎（sum/diff/mostdiff/change/totalchange 单发判定）：engTapCard(L, i)
   'right' 答对推进 / 'done' 且末题=通关 / 'wrong' 点错（卡不灰化可重点，miss+1）
   null    非 count 外数值题 / 非法下标 / 关卡已结束 ---------- */
function engTapCard(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q.kind === 'count' || !q.options) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return null;
  if (i === q.answerIdx) {
    q._answered = true;
    L.step++;
    engOpen(L);
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++; L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.84 miss 口径）：全关错计 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- 结构校验（verify 用，返回失败原因或 null）：章型规则 / 数量先验 /
   覆盖+禁连续 / 数值题居后 / 数值卡自洽 / flat0 教学锚 / 初始态干净 ---------- */
function structWhy(L, qi) {
  if (!L || !Array.isArray(L.quizzes)) return 'level';
  const q = L.quizzes[qi];
  if (!q) return 'quiz';
  const KINDS = ['count', 'sum', 'diff', 'mostdiff', 'change', 'totalchange'];
  if (KINDS.indexOf(q.kind) < 0) return 'kind';
  const dch = L.dch, k = L.cats.length;
  const expK = dch === 3 ? 3 : 2;                            // dch1/2/4=2 类、dch3=3 类
  if (k !== expK) return 'ncat';
  for (const c of L.cats) if (ANIMALS6.indexOf(c) < 0) return 'catPool';
  if (new Set(L.cats).size !== k) return 'catDup';
  if (L.values.length !== k) return 'vlen';
  const lo = dch === 1 ? 10 : dch === 2 ? 12 : dch === 3 ? 10 : 10;
  const hi = dch === 1 ? 20 : dch === 2 ? 30 : dch === 3 ? 24 : 16;
  if (L.flat !== 0) {                                        // flat0=教学锚 crafted 豁免域
    for (const v of L.values)
      if (!Number.isInteger(v) || v < lo || v > hi || v % 2 !== 0) return 'vRange';
    if (new Set(L.values).size !== k) return 'vDup';         // 同场景互异先验
    if (dch === 2 && Math.abs(L.values[0] - L.values[1]) < 4) return 'vGap4';
    if (dch === 3 && L.values.reduce((a, b) => a + b, 0) > 60) return 'sumCap';
  }
  const nq = L.quizzes.length;
  if (nq !== CH_LEN) return 'qlen';
  const kinds = L.quizzes.map(x => x.kind);
  const KIND_SEQ = {
    1: ['count', 'count', 'count', 'count', 'count'],
    2: ['count', 'count', 'count', 'sum', 'diff'],
    3: ['count', 'count', 'count', 'sum', 'mostdiff'],
    4: ['count', 'count', 'change', 'change', 'totalchange']
  }[dch];
  if (kinds.join(',') !== KIND_SEQ.join(',')) return 'seq:' + kinds.join(',');
  if (q.kind === 'count') {
    if (L.cats.indexOf(q.ask) < 0) return 'askPool';
    if (q.answer !== L.values[L.cats.indexOf(q.ask)]) return 'ansVal';
    const asks = kinds.map((kd, i) => kd === 'count' ? L.quizzes[i].ask : null).filter(x => x);
    for (const c of L.cats) if (asks.indexOf(c) < 0) return 'cover';   // 覆盖全类
    for (let i = 1; i < asks.length; i++) if (asks[i] === asks[i - 1]) return 'adjDup';
  } else if (q.kind === 'sum') {
    if (!Array.isArray(q.ask) || q.ask.length !== 2 ||
        L.cats.indexOf(q.ask[0]) < 0 || L.cats.indexOf(q.ask[1]) < 0 || q.ask[0] === q.ask[1])
      return 'askPair';
    if (q.answer !== L.scene[q.ask[0]] + L.scene[q.ask[1]]) return 'ansSum';
  } else if (q.kind === 'diff') {
    if (!Array.isArray(q.ask) || q.ask.length !== 2) return 'askPair';
    if (q.answer !== Math.abs(L.scene[q.ask[0]] - L.scene[q.ask[1]])) return 'ansDiff';
  } else if (q.kind === 'mostdiff') {
    const vs = L.values.slice().sort((a, b) => b - a);
    const maxCat = L.cats[L.values.indexOf(vs[0])], minCat = L.cats[L.values.indexOf(vs[vs.length - 1])];
    if (!Array.isArray(q.ask) || q.ask.length !== 2 || q.ask[0] !== maxCat || q.ask[1] !== minCat)
      return 'askMostdiff';                                 // 最多/最少类名音链序（quizSay 对齐）
    if (q.answer !== vs[0] - vs[vs.length - 1]) return 'ansMostdiff';
  } else if (q.kind === 'change') {
    if (dch !== 4 || !L.scene1) return 'changeCtx';
    if (L.cats.indexOf(q.ask) < 0) return 'askPool';
    if (q.answer !== Math.abs(L.scene[q.ask] - L.scene1[q.ask])) return 'ansChange';
    if (q.up !== (L.scene[q.ask] > L.scene1[q.ask])) return 'upSign';
  } else {
    if (dch !== 4 || !L.scene1) return 'changeCtx';
    if (q.ask !== null) return 'askTotal';
    let s = 0;
    for (const c of L.cats) s += Math.abs(L.scene[c] - L.scene1[c]);
    if (q.answer !== s) return 'ansTotal';
    if (q.up !== (L.scene[L.cats[0]] > L.scene1[L.cats[0]])) return 'upSign';
  }
  if (q.kind !== 'count') {                                  // 数值卡 4 选 1 自洽
    if (!Array.isArray(q.options) || q.options.length !== 4) return 'opts';
    if (q.options[q.answerIdx] !== q.answer) return 'answerIdx';
    for (let i = 0; i < 4; i++) {
      if (q.options[i] % 2 !== 0 || q.options[i] < 2 || q.options[i] > 60) return 'optDom';
      for (let j = i + 1; j < 4; j++) if (q.options[i] === q.options[j]) return 'optDup';
    }
  }
  if (L.flat === 0) {                                        // 教学锚（SPEC §3-r14）
    if (qi === 0 && (q.kind !== 'count' || q.ask !== 'rabbit' || q.answer !== 8)) return 'anchor0';
    if (qi === 1 && (q.kind !== 'count' || q.ask !== 'chick' || q.answer !== 10)) return 'anchor1';
  }
  if (q._miss !== 0 || q._answered || (q.kind === 'count' && q._opened !== (qi <= L.step))) return 'init';
  return null;
}
