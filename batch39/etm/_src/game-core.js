/* ================= etm 纯引擎：确定性关卡生成 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 867)（本款常量 867 承基线；r49 不变——flat0-4
   rnd 流与基线逐字节一致=教学锚谱保留）：同 flat 永远同关（重玩一致、verify 可检）。
   取题（r49 题库封闭 40 题=4 章池×10，SPEC-R49 §R3；每关 5 题）：
     静态关 flat<20：章 ch 的 5 题（rows (ch-1)*5..ch*5-1）按关内偏移 rotate——
     row=(ch-1)*5+((lv+qi)%5)（20 静态关覆盖静态 20 题各 5 次）；
     生成关 flat≥20：dch=ri(rnd,1,4) seeded 随机（域全档成立型——mulberry32
     第一个随机数，先取数保确定性；与基线同 flat 同 dch——首随机数取法不变），
     从 dch 独立池 POOL_ROWS[dch]（10 题）seeded 无放回抽 5（族域随 dch 守恒）。
   候选盘序：每题 seeded shuffle 一次（face 4 脸/level 5 档/mix 4 组合全出——
   「盘序 seeded 打乱」；逐题换序防位置学习，孩子须看脸谱/档位内容）。
   rnd 消耗顺序恒定：生成关先抽 dch →（抽题，仅生成关）→ 每题盘序 shuffle。
   answer=正确项下标（=picks.indexOf(本题情绪/档位/组合 id)——唯一解锚，
   verify 从 SPEC 题表+picks 独立推导复算，禁读 quiz.answer 直比）。
   quiz 结构：{ row(0-39), scene(情境 id), kind('face'|'level'|'mix'), text(情境句),
                say(=text 题面 keyless), picks(盘序 id 数组·逐题),
                answer, _miss, _answered }
   铁律：每关 5 题；候选=族池全集排列（无缺漏无重复）；miss 在本判定层计
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

/* ---------- 单题构建：题库行 + 盘序；answer=picks.indexOf(期望 id) ---------- */
function buildQuiz(row, picksOrder) {
  const qs = QUESTIONS[row];
  const answer = picksOrder.indexOf(qs.ans);
  return { row: row, scene: qs.scene, kind: qs.kind, text: qs.text, say: qs.text,
           sayKey: 'etm_sc_' + qs.scene,   // T46 阶段2：情境句 clip 键（scene id=注册键域）
           picks: picksOrder, answer: answer, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   r49 生成关分池：每 dch 独立 10 题池（静态章 5+扩展池 5——SPEC §R3）：
   dch1 face 直白 rows 0-4+20-24 / dch2 face 间接 rows 5-9+25-29 /
   dch3 level 五档 rows 10-14+30-34 / dch4 mix 混合 rows 15-19+35-39。
   seeded 无放回抽 5（顺序即题序）；族域随 dch（旧「dch≤2 face/≥3 level」二分退役） ---------- */
const POOL_ROWS = {
  1: [0, 1, 2, 3, 4, 20, 21, 22, 23, 24],
  2: [5, 6, 7, 8, 9, 25, 26, 27, 28, 29],
  3: [10, 11, 12, 13, 14, 30, 31, 32, 33, 34],
  4: [15, 16, 17, 18, 19, 35, 36, 37, 38, 39]
};
const KIND_OF_DCH = { 1: 'face', 2: 'face', 3: 'level', 4: 'mix' };
function pickRows(dch, rnd) {
  const pool = POOL_ROWS[dch] || POOL_ROWS[1];
  const a = pool.slice(), out = [];
  for (let k = 0; k < CH_LEN; k++) out.push(a.splice(ri(rnd, 0, a.length - 1), 1)[0]);
  return out;
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 867);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  let rows;
  if (flat < STATIC_LEVELS) {
    const base = (dch - 1) * 5;                              // 静态关 dch===ch：章池 rotate
    rows = [];
    for (let k = 0; k < CH_LEN; k++) rows.push(base + (lv + k) % 5);
  } else {
    rows = pickRows(dch, rnd);                               // 生成关：族池内 seeded 抽 5
  }
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(rows[qi], shuffled(poolOf(QUESTIONS[rows[qi]].kind), rnd)));   // 每题盘序 seeded
  return { flat: flat, ch: ch, dch: dch, lv: lv, rows: rows,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTapPick(L, i) —— 点第 i 个候选项
   'picked' 指对且本题完成推进 / 'done' 指对且末题=通关
   'wrong'   指错：该题 miss+1（retries 全关累计=星级口径），项弹回可重点（探索不罚）
   null      非法下标 / 关卡已结束 / 本题已答 ---------- */
function engTapPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) return null;
  if (i === q.answer) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'picked';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（SPEC §0.95 miss 口径：指错计）：全关指错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确项下标（独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：row 域 / 族标记一致 /
   盘数=族档（face 4/level 5——r49 五档，m3 勘正）/ picks=族池排列 / answer=picks.indexOf(题表 ans)
   复算 / text·say 与题库行一致 / 初始态干净 ---------- */
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.row) || q.row < 0 || q.row >= QUESTIONS.length) return 'row';
  const qs = QUESTIONS[q.row];
  const wantKind = KIND_OF_DCH[dch] || 'face';
  if (q.kind !== wantKind) return 'kind';                     // 族标记=难度档（face/level/mix）
  const wantN = wantKind === 'level' ? 5 : 4;
  if (q.picks.length !== wantN) return 'picksN';              // 盘数=族档（4 脸/5 档/4 组合）
  const expSet = poolOf(wantKind).slice().sort().join('|');
  if (q.picks.slice().sort().join('|') !== expSet) return 'picksPerm';   // 盘序=族池全集排列
  const exp = q.picks.indexOf(qs.ans);
  if (q.answer !== exp) return 'answer';                      // answer=picks.indexOf(ans) 复算
  if (q.scene !== qs.scene || q.text !== qs.text || q.say !== qs.text) return 'scene';   // 情境句与题库行逐字一致
  if (q._miss !== 0 || q._answered) return 'dirty';
  return null;
}
