/* ================= thanks 纯引擎：确定性关卡生成 + 点卡判定（无 DOM，UI 与 verify 共用）
   r12 难度改造（SPEC-BATCH37 §7 真值现行版；v1 good:bool 好坏二分作历史存档）：
   种子 = mulberry32(flat * 7919 + 727)（本款常量 727 沿 v1，SPEC §0.88/§7）：
   同 flat 永远同关（重玩一致、verify 可检）。
   取题（§7 题库封闭 20 题=4 章×5；每关 5 题 kind-pure per-chapter）：
     静态关 flat<20：章 ch 的 5 题按关内偏移 rotate——scene=(ch-1)*5+((lv+qi)%5)
     （20 静态关覆盖全 20 题各 5 次；ch1-2 fit 两选/ch3 size 三选/ch4 anti 三选恒同档）；
     生成关 flat≥20：dch=ri(rnd,1,4) seeded 随机（域全档成立型——SPEC §0.88
     生成关策略=b33 硬性②显式声明：mulberry32 第一个随机数，先取数保确定性），
     从对应**单章池** seeded 无放回抽 5（r12 池改 per-chapter kind-pure：
     dch1→题 0-4 / dch2→题 5-9 / dch3→题 10-14 / dch4→题 15-19——同关不混题型框架，
     框架锚（tha_fit/tha_not）随题播不串档；卡数 2/2/3/3 与 v1 dch≤2<10/dch≥3≥10 口径一致）。
   卡序：每题 cards seeded shuffle（best/bad 位置不恒定——禁位置学习）；
   rnd 消耗顺序恒定：生成关先抽 dch →（抽题，仅生成关）→ 逐题卡序 shuffle。
   answer（r12 按 kind 分流，verify 从 cards 独立推导复算禁读 quiz.answer 直比）：
     kind='fit'|'size'：answer=唯一 tier==='best' 的 i（择优解锚）
     kind='anti'    ：answer=唯一 tier==='bad' 的 i（反向解锚——senses anti 族先例：
                       点**不合时宜**的那句=对；恰 1 bad 防（>1）双真值）
   quiz 结构：{ scene(0-19), kind('fit'|'size'|'anti'), say(情景句), anim, prop,
                cards[{tier,label,icon}], answer, _miss, _answered }
   铁律：每关 5 题；tier 分布语义先验（structWhy 按 kind 校验：
     fit=[best,gray] / size=[best,gray,bad] / anti=[ok,ok,bad]）；
     miss 在本判定层计（b34 坑①：UI guard 判定前拦+预判与 core 严格同构）。 */
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
/* r12 章→题池（per-chapter kind-pure，§7 定版）；卡数档=dch1/2 两选、dch3/4 三选 */
const poolOfDch = dch => {
  const base = (dch - 1) * 5;
  return [base, base + 1, base + 2, base + 3, base + 4];
};
/* 答案 tier（kind 分流）：fit/size='best' / anti='bad'——verify 复算同口径 */
const answerTierOf = kind => (kind === 'anti' ? 'bad' : 'best');

/* ---------- 单题构建：题库行 + seeded 卡序打散；answer 按 kind 取唯一解档 ---------- */
function buildQuiz(scene, rnd) {
  const row = SCENES[scene];
  const cards = shuffled(row.cards, rnd).map(c => ({ tier: c.tier, label: c.label, icon: c.icon }));
  const want = answerTierOf(row.kind);
  let answer = -1, hitN = 0;
  for (let i = 0; i < cards.length; i++) if (cards[i].tier === want) { hitN++; answer = i; }
  if (hitN !== 1) answer = -1;                       // 语义先验（SPEC §7 验算 ✓ 恒 1）：防御式兜底
  return { scene: scene, kind: row.kind, say: row.say, anim: row.anim, prop: row.prop,
           cards: cards, answer: answer, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关 seeded 无放回抽 5（顺序即题序）；池=单章 5 题 kind-pure ---------- */
function pickScenes(dch, rnd) {
  const a = poolOfDch(dch).slice(), out = [];
  for (let k = 0; k < CH_LEN; k++) out.push(a.splice(ri(rnd, 0, a.length - 1), 1)[0]);
  return out;
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 727);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  let scenes;
  if (flat < STATIC_LEVELS) {
    scenes = poolOfDch(dch).map((_, k) => poolOfDch(dch)[(lv + k) % 5]);   // 静态关 dch===ch：章池 rotate
  } else {
    scenes = pickScenes(dch, rnd);                           // 生成关：单章池 seeded 抽 5
  }
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(scenes[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv, scenes: scenes,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapCard(L, i) —— 点当前题第 i 张回应卡
   'right' 点对（best 或 anti 唯一 bad）且本题完成推进 / 'done' 点对且末题=通关
   'wrong' 点非答案卡（gray/bad 于 fit·size；ok/bad 于 anti 点 ok）：该题 miss+1
            （retries 全关累计=星级口径），卡回可重点（探索不罚）
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
/* 星级（SPEC §0.88 miss 口径沿 v1：非答案点计）：全关 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题答案卡下标（独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：scene 域 / kind 域 /
   卡数选数档 / tier 分布语义先验（按 kind）/ answer 复算 / label 集与题库行一致 /
   初始态干净 ---------- */
const TIERS_OF = { fit: ['best', 'gray'],
                   size: ['best', 'gray', 'bad'],
                   anti: ['ok', 'ok', 'bad'] };      // 分布多重集（kind 定档）
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.scene) || q.scene < 0 || q.scene >= SCENES.length) return 'scene';
  const row = SCENES[q.scene];
  if (q.kind !== row.kind || !TIERS_OF[q.kind]) return 'kind';   // kind 与题库行一致且域合法
  const wantN = dch <= 2 ? 2 : 3;
  if (q.cards.length !== wantN || row.cards.length !== wantN) return 'cardsN';
  const tiers = q.cards.map(c => c.tier).sort().join('|');
  const wantT = TIERS_OF[q.kind].slice().sort().join('|');
  if (tiers !== wantT) return 'tiers';               // 语义先验：fit=[best,gray]/size=[best,gray,bad]/anti=[ok,ok,bad]
  const want = answerTierOf(q.kind);
  let hitN = 0, exp = -1;
  for (let i = 0; i < q.cards.length; i++) if (q.cards[i].tier === want) { hitN++; exp = i; }
  if (hitN !== 1) return 'hitN';                     // 恰一解档（best 或 bad）
  if (q.answer !== exp) return 'answer';             // answer=唯一解档下标复算
  const lbl = q.cards.map(c => c.label).sort().join('|');
  const lblRow = row.cards.map(c => c.label).sort().join('|');
  if (lbl !== lblRow) return 'labels';               // label 集与题库行一致（卡序无关）
  if (q.say !== row.say || q.anim !== row.anim) return 'say';
  if (q._miss !== 0 || q._answered) return 'dirty';
  return null;
}
