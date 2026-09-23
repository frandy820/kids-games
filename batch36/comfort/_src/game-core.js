/* ================= comfort 纯引擎：确定性关卡生成 + 点卡判定（无 DOM，UI 与 verify 共用）
   r11 卡模型（SPEC-BATCH36 §6）：cards[{tier:'best'|'gray'|'bad',label,icon}]——
   best2 题（scene 0-9）恰 [best,gray]（无 bad）；grad3 题（scene 10-19）恰
   [best,gray,bad]（梯度干扰：淘汰 bad 后 best vs gray 才是认知负荷）。
   种子 = mulberry32(flat * 7919 + 757)（本款常量 757，SPEC-BATCH36 §0.88 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   取题（SPEC §0.88 题库封闭 20 题=4 章×5；每关 5 题）：
     静态关 flat<20：章 ch 的 5 题按关内偏移 rotate——scene=(ch-1)*5+((lv+qi)%5)
     （20 静态关覆盖全 20 题各 5 次；ch1-2 择优二选/ch3-4 梯度三选恒同档）；
     生成关 flat≥20：dch=ri(rnd,1,4) seeded 随机（域全档成立型——b33 硬性②），
     从对应选数题池 seeded 无放回抽 5（dch≤2 题池 scene 0-9 / dch≥3 题池 10-19）。
   卡序：每题 cards seeded shuffle（best 位置不恒定——禁位置学习）；
   rnd 消耗顺序恒定：生成关先抽 dch →（抽题，仅生成关）→ 逐题卡序 shuffle。
   answer=best 卡下标（=cards 中唯一 tier==='best' 的 i——SPEC §6 唯一解锚，
   verify 从 cards 独立推导复算，禁读 quiz.answer 直比）。
   quiz 结构：{ scene(0-19), say(情景句), anim, prop, kind('best2'|'grad3'),
                cards[{tier,label,icon}], answer, _miss, _answered }
   铁律：每关 5 题；每题恰一张 best + 恰一张 gray（best2 无 bad / grad3 恰一张 bad）
   （structWhy 校验）；miss 在本判定层计（b34 坑①：UI guard 判定前拦+预判与 core 严格同构）。
   灰卡判定与坏卡同为 'wrong'+miss（r11 择优口径：不是最好=错——SEL 温和反馈在 UI 层，
   引擎只管对错）；星级口径沿 v1（retries 全关累计）。 */
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

/* ---------- 单题构建：题库行 + seeded 卡序打散；answer=唯一 best 下标 ---------- */
function buildQuiz(scene, rnd) {
  const row = SCENES[scene];
  const cards = shuffled(row.cards, rnd).map(c => ({ tier: c.tier, label: c.label, icon: c.icon }));
  let answer = -1, bestN = 0;
  for (let i = 0; i < cards.length; i++) if (cards[i].tier === 'best') { bestN++; answer = i; }
  if (bestN !== 1) answer = -1;                       // 语义先验（验算 ✓ 恒 1）：防御式兜底
  return { scene: scene, say: row.say, anim: row.anim, prop: row.prop,
           kind: row.cards.length === 2 ? 'best2' : 'grad3',
           cards: cards, answer: answer, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关 seeded 无放回抽 5（顺序即题序）；池按 dch 选数分（择优/梯度域守恒） ---------- */
function pickScenes(dch, rnd) {
  const pool = dch <= 2 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const a = pool.slice(), out = [];
  for (let k = 0; k < CH_LEN; k++) out.push(a.splice(ri(rnd, 0, a.length - 1), 1)[0]);
  return out;
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 757);
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

/* ---------- 点卡引擎（无 DOM）：engTapCard(L, i) —— 点当前题第 i 张做法卡
   'right' 点 best 且本题完成推进 / 'done' 点 best 且末题=通关
   'wrong' 点非 best（gray 或 bad 同口径）：该题 miss+1（retries 全关累计=星级口径），
           卡回可重点（探索不罚）——gray/bad 的反馈与后果分流在 UI 层（r11）
   null    非法下标 / 关卡已结束 / 本题已答 ---------- */
function engTapCard(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) return null;
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
/* 星级（SPEC §0.88 miss 口径沿 v1：选非 best 计）：全关选错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题 best 卡下标（独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：scene 域 / 卡数选数档 /
   tier 构成（best2 恰 1 best 1 gray 0 bad / grad3 恰 1 best 1 gray 1 bad）/
   answer=findIndex(best) 复算 / label 集与题库行一致 / 初始态干净 ---------- */
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.scene) || q.scene < 0 || q.scene >= SCENES.length) return 'scene';
  const row = SCENES[q.scene];
  const wantN = dch <= 2 ? 2 : 3;
  if (q.cards.length !== wantN || row.cards.length !== wantN) return 'cardsN';
  let bestN = 0, grayN = 0, badN = 0;
  for (let i = 0; i < q.cards.length; i++) {
    if (q.cards[i].tier === 'best') bestN++;
    else if (q.cards[i].tier === 'gray') grayN++;
    else if (q.cards[i].tier === 'bad') badN++;
    else return 'tier';                        // 未知 tier
  }
  if (bestN !== 1) return 'bestN';                       // 语义先验：恰一张 best
  if (grayN !== 1) return 'grayN';                       // 恰一张 gray（r11 梯度干扰恒在）
  if ((q.kind === 'best2' ? 0 : 1) !== badN) return 'badN';   // best2 无 bad / grad3 恰 1 bad
  if (q.kind !== (wantN === 2 ? 'best2' : 'grad3')) return 'kind';   // kind 与卡数档一致
  let exp = -1;
  for (let i = 0; i < q.cards.length; i++) if (q.cards[i].tier === 'best') exp = i;
  if (q.answer !== exp) return 'answer';                 // answer=唯一 best 下标复算
  const lbl = q.cards.map(c => c.label).sort().join('|');
  const lblRow = row.cards.map(c => c.label).sort().join('|');
  if (lbl !== lblRow) return 'labels';                   // label 集与题库行一致（卡序无关）
  if (q.say !== row.say || q.anim !== row.anim) return 'say';
  if (q._miss !== 0 || q._answered) return 'dirty';
  return null;
}
