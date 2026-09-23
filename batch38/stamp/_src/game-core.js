/* ================= stamp 纯引擎：确定性关卡生成 + 盖印/找错判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 827)（本款常量 827，SPEC-BATCH38 §0.91/§1 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   取题（SPEC §1 题库封闭 20 题=4 章×5；每关 5 题）：
     静态关 flat<20：章 ch 的 5 题按关内偏移 rotate——scene=(ch-1)*5+((lv+qi)%5)
     （20 静态关覆盖全 20 题各 5 次）；生成关 flat≥20：dch=ri(rnd,1,4) seeded 随机
     （域全档成立型），从对应章题池 seeded 无放回抽 5（dch≤2 池 scene 0-9 / dch≥3 池 10-19）。
   ★ rnd 消耗序（verify/_table_check python 镜像逐 draw 对账——禁改动顺序）：
     genLevel(flat)：
       rnd = mulberry32(flat*7919+827)
       [flat≥20] dch = ri(rnd,1,4)                          → 1 draw
       [生成关]   scenes：5 次 splice ri(0,len-1)            → 5 draws
       逐题 buildQuiz(scene)（按题序）：
         scene<10 （ch1-2）：干扰 2 次 splice ri + shuffled(3)→ 4 draws
         scene10-14（ch3） ：shuffled(4)                    → 3 draws
         scene15-19（ch4） ：badIdx=ri(6,10) + shuffled(4)  → 4 draws
   印章盘（3-4 枚，正确 1+干扰 2-3，seeded shuffle 盘序——禁位置学习）：
     ch1-2 盘 3：正确章+seeded 抽 2 干扰（单属性池 4 中非正确取 2）；
     ch3-4 盘 4：正确章+单色对（COLOR_MATE）+单形对（SHAPE_MATE）+池内第 4 枚
     （单属性干扰=只满足一属性——verify 验算恰不满足另一属性）。
   ch4 体检：badIdx=ri(rnd,6,10)（首个组合周期 0-5 恒真值=公平锚）；错章=真值
   单属性伴章（scene 偶→单形对/奇→单色对——确定性，verify seeded 复算）。
   quiz 结构：{ scene(0-19), kind('next'|'fix'), unit(字符串|{colors,shapes}),
     sayKey/sayText(任务框架句——去泄题), period(单属性行), seq[](示范段图案 id 序列
     ——ch4 含 1 枚错章于 badIdx), blanks(恒 1), filled, picks[](盘图案 id),
     answer(当前判定正确章下标——verify 从 unit 双周期独立推导，禁读直比),
     badIdx(ch4 错章位；ch1-3 恒 -1), wrongId(ch4 错章 id), _found(ch4 已找错),
     _miss, _answered }
   铁律：每关 5 题；每题恰一枚正确章（structWhy 校验）；miss 在本判定层计
   （b34 坑①：UI guard 判定前拦+预判与 core 严格同构）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
/* strip 第 cell 格（0 基）真值：单属性=period[cell%plen]；双属性=colors[cell%3]+shapes[cell%6]
   （相位即续印；ch3 双线索=续盖位须同时满足两属性） */
const valAt = (row, cell) => typeof row.unit === 'string'
  ? row.period[cell % row.period.length]
  : row.unit.colors[cell % row.unit.colors.length] + row.unit.shapes[cell % row.unit.shapes.length];
/* quiz 上取真值（gallery/续盖推进用——quiz 携带 period|unit） */
const qValAt = (q, cell) => valAt(q, cell);
const BAD_LO = 6, BAD_HI = 10;                    // ch4 错章位域（首周期 0-5 恒真值）

/* ---------- 单题构建：题库行 + seeded 盘构成；answer=当前判定正确章下标 ---------- */
function makePicks(row, truth, scene, rnd) {
  if (scene < 10) {                               // ch1-2 盘 3：正确+seeded 2 干扰（2 ri+shuffle 2 draws）
    const rest = MOTIF_IDS.filter(m => m !== truth);
    const d1 = rest.splice(ri(rnd, 0, rest.length - 1), 1)[0];
    const d2 = rest.splice(ri(rnd, 0, rest.length - 1), 1)[0];
    return shuffled([truth, d1, d2], rnd);
  }
  /* ch3-4 盘 4：正确+单色对+单形对+池内第 4 枚（shuffle 3 draws） */
  const cand = [truth, COLOR_MATE[truth], SHAPE_MATE[truth]];
  const extra = DUAL_IDS.find(x => cand.indexOf(x) < 0);
  return shuffled(cand.concat(extra), rnd);
}
function buildQuiz(scene, rnd) {
  const row = ROWS[scene];
  const seq = [];
  for (let i = 0; i < row.seqLen; i++) seq.push(valAt(row, i));
  let badIdx = -1, wrongId = null;
  if (row.kind === 'fix') {
    badIdx = ri(rnd, BAD_LO, BAD_HI);             // 错章位 seeded（先取数——消耗序锚）
    const truth = seq[badIdx];
    wrongId = scene % 2 === 0 ? SHAPE_MATE[truth] : COLOR_MATE[truth];
    seq[badIdx] = wrongId;                        // 与真规律不符的错章（单属性伴章）
  }
  const truth0 = valAt(row, row.kind === 'fix' ? badIdx : row.seqLen);   // 当前判定真值（fix=错章位真值）
  const picks = makePicks(row, truth0, scene, rnd);
  return { scene: scene, kind: row.kind,
           unit: typeof row.unit === 'string' ? row.unit
                : { colors: row.unit.colors.slice(), shapes: row.unit.shapes.slice() },
           sayKey: row.sayKey, sayText: row.sayText,
           period: row.period || null,
           seq: seq, blanks: 1, filled: 0, picks: picks,
           answer: picks.indexOf(truth0), badIdx: badIdx, wrongId: wrongId,
           _found: false, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关 seeded 无放回抽 5（顺序即题序）；池按 dch 选数分（2 章/3-4 章域守恒） ---------- */
function pickScenes(dch, rnd) {
  const pool = dch <= 2 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const a = pool.slice(), out = [];
  for (let k = 0; k < CH_LEN; k++) out.push(a.splice(ri(rnd, 0, a.length - 1), 1)[0]);
  return out;
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 827);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  let scenes;
  if (flat < STATIC_LEVELS) {
    const base = (dch - 1) * 5;                              // 静态关 dch===ch：章池 rotate
    scenes = [];
    for (let k = 0; k < CH_LEN; k++) scenes.push(base + (lv + k) % 5);
  } else {
    scenes = pickScenes(dch, rnd);                           // 生成关：池内 seeded 抽 5
  }
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(scenes[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv, scenes: scenes,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 盖印引擎（无 DOM）：engTapStamp(L, i) —— 点盘内第 i 枚印章
   'stamped' ch1-3 盖对（'fixed' 见下——ch4 修复对）
   'fixed'   ch4 找到错章后盖对（错章被替换为正确图案）
   'done'    盖对且末题末格=通关（与 'stamped'/'fixed' 同拍——SPEC §1 末题 'done'）
   'wrong'   盖干扰章：该题 miss+1（retries 全关累计=星级口径），章回可重点（探索不罚）
   null      非法下标 / 关卡已结束 / 本题已答满 / ch4 未找错章（先 tapCell） ---------- */
function engTapStamp(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) return null;
  if (q.kind === 'fix' && !q._found) return null;             // ch4：先找错章才开盘
  if (i === q.answer) {
    q.filled++;
    if (q.filled >= q.blanks) {
      q._answered = true;                                    // 判定格已盖=本题完成
      L.step++;
    } else {
      q.answer = q.picks.indexOf(qValAt(q, q.seq.length + q.filled));   // 下一空位正确章
    }
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return q.kind === 'fix' ? 'fixed' : 'stamped';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
/* ---------- 找错引擎（无 DOM）：engTapCell(L, j) —— ch4 点花边第 j 格找错章
   'found'   j=badIdx：错章找到（开盘可修）
   'wrong'   j 为非错章：该题 miss+1（「这枚是对的哦」——spm_fix_wrong）
   null      非 ch4 / 已找到 / 非法下标 / 关卡已结束 ---------- */
function engTapCell(L, j) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.kind !== 'fix' || q._found) return null;
  if (!Number.isInteger(j) || j < 0 || j >= q.seq.length) return null;
  if (j === q.badIdx) { q._found = true; return 'found'; }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（SPEC §0.91 miss 口径：盖错+点错计）：全关 0 错=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前判定正确章下标（独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：scene/kind 域 / 盘数档 /
   盘图案互异且属封闭集 / 真值推导复算（单属性周期子串·双属性双周期——ch4 除
   badIdx 位外全真值+错章≠真值）/ 每判定正确章在盘 / answer=真值下标复算 /
   双周期不塌缩（形状周期恰 6）/ say·unit 与题库行一致 / 初始态干净 ---------- */
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.scene) || q.scene < 0 || q.scene >= ROWS.length) return 'scene';
  const row = ROWS[q.scene];
  if (q.kind !== row.kind) return 'kind';
  const wantN = q.scene < 10 ? 3 : 4;                        // 盘数档：ch1-2 3 枚 / ch3-4 4 枚
  if (q.picks.length !== wantN) return 'picksN';
  if (new Set(q.picks).size !== q.picks.length) return 'picksDup';    // 盘图案互异
  const pool = q.scene < 10 ? MOTIF_IDS : DUAL_IDS;
  for (let i = 0; i < q.picks.length; i++)
    if (pool.indexOf(q.picks[i]) < 0) return 'picksSet';              // 封闭集
  if (q.seq.length !== row.seqLen) return 'seqLen';
  for (let i = 0; i < q.seq.length; i++) {                   // 真值推导复算（ch4 badIdx 位除外）
    if (i === q.badIdx) continue;
    if (q.seq[i] !== valAt(row, i)) return 'seqPhase';
  }
  if (q.kind === 'fix') {
    if (q.badIdx < BAD_LO || q.badIdx > BAD_HI) return 'badIdxRange';
    if (q.seq[q.badIdx] === valAt(row, q.badIdx)) return 'wrongNotWrong';   // 错章须≠真值
    if (q.wrongId !== q.seq[q.badIdx]) return 'wrongId';
  } else if (q.badIdx !== -1) return 'badIdxNext';
  if (q.blanks !== 1 || q.blanks < 1) return 'blanks';
  if (typeof row.unit === 'string') {
    if (q.unit !== row.unit) return 'unit';
  } else {
    if (!q.unit || !q.unit.colors || !q.unit.shapes) return 'unit';
    if (q.unit.colors.join('') !== row.unit.colors.join('') ||
        q.unit.shapes.join('') !== row.unit.shapes.join('')) return 'unit';
    let rot = true;                                          // 双周期不塌缩：形状周期恰 6
    for (let i = 0; i < 3; i++) if (q.unit.shapes[i] !== q.unit.shapes[i + 3]) rot = false;
    if (rot) return 'shapeCollapse';
  }
  const jCell = q.kind === 'fix' ? q.badIdx : q.seq.length + q.filled;   // 当前判定真值位
  if (q.picks.indexOf(valAt(row, jCell)) < 0) return 'blankVal';         // 判定正确章在盘
  let exp = -1;
  for (let j = 0; j < q.picks.length; j++)
    if (q.picks[j] === valAt(row, jCell)) exp = j;
  if (q.answer !== exp) return 'answer';                     // answer=真值下标复算
  if (q.sayKey !== row.sayKey || q.sayText !== row.sayText) return 'say';
  if (q._miss !== 0 || q._answered || q.filled !== 0 || q._found) return 'dirty';
  return null;
}
