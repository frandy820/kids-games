/* ================= cbx 纯引擎：确定性关卡生成 + 点卡判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 897)（本款常量 897，SPEC-BATCH40 §0 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   dch 策略显式声明（b33 硬性②/SPEC §0.3）：静态关 flat<20 dch=flat//5+1（域全档
   成立型）；生成关 flat≥20 dch=ri(rnd,1,4) seeded 随机（先取数保确定性）。
   取题（N1 定版语义=章池+关内 rotate）：题(flat,k)=表行[(dch-1)*5+((flat%5)+k)%5]
   ——静态关 dch=flat//5+1 与 SPEC N1 公式 (flat//5)*5+((flat%5)+k)%5 等价；
   生成关 dch 由 seed 定章池，池内仍按 flat%5 rotate。
   候选卡（r50 改造：全程三选灰阶）：每题 picks=[good, fair, bad|neutral]
   seeded shuffle（最佳卡位置不恒定——禁位置学习）；ch1-2=最佳+次优+坏、
   ch3-4=最佳+次优+中性（纯灰阶去坏卡）。rnd 消耗顺序恒定：生成关先取 dch
   → 逐题卡序 shuffle（三元组 shuffle 每题耗 2 个 rnd——r50 谱面全刷新，
   唯一解锚与教学锚面保留，谱变化声明见 SPEC-R50 §R11）。
   answer=最佳卡下标（=picks.indexOf(题表 good 列)——r50 唯一解锚=SPEC 题表
   真值；verify 从 SPEC 表 good 列独立推导复算，禁读 quiz.answer 直比；
   fair 也是好池卡（kind==='good'）——「唯一 kind=good」旧口径 r50 作废）。
   quiz 结构：{ scene(0-19), emo, say(情境句), prop, picks[](卡 id 恒 3),
                answer, _miss, _answered }
   铁律：每关 5 题；每题候选=题表行三元组（good+fair+bad|neutral）三档
   id 互异+fair 类互异（structWhy 校验）；miss 在本判定层计（b34 坑①：
   UI guard 判定前拦+预判与 core 严格同构）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号=情绪域四档取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 单题构建：题库行三元组 [good, fair, bad|neutral] seeded 打散；
   answer=最佳卡（good 列）下标——r50 唯一解锚（fair 同为好池卡，kind 口径作废） ---------- */
function buildQuiz(scene, rnd) {
  const row = SCENES[scene];
  const ids = [row.good, row.fair, row.neutral || row.bad];   // ch1-2=+bad / ch3-4=+neutral
  const picks = shuffled(ids, rnd);
  const answer = picks.indexOf(row.good);            // 题表 good 列下标（验算 ✓ 恒 ≥0：good ∈ ids）
  return { scene: scene, emo: row.emo, say: row.say, sayKey: 'cbx_sc_' + (scene + 1),   // T46 阶段2：情境句 clip 键（SCENES 行序=注册序，禁重排）
           prop: PROP_OF[scene],
           picks: picks, answer: answer, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；N1 章池 rotate） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 897);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const base = (dch - 1) * 5;                                // 章池起点（静态关 dch===ch）
  const scenes = [];
  for (let k = 0; k < CH_LEN; k++) scenes.push(base + (lv + k) % 5);   // N1：池内 rotate
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(scenes[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv, scenes: scenes,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapPick(L, i) —— 点当前题第 i 张策略卡
   'picked' 点对且本题完成推进 / 'done' 点对且末题=通关
   'wrong'  点坏/中性卡：该题 miss+1（retries 全关累计=星级口径），卡回可重点（探索不罚）
   null     非法下标 / 关卡已结束 / 本题已答 ---------- */
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
/* 星级（SPEC §0 miss 计数款：0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星） */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题好卡下标（独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：scene 域 / 恒三选 /
   候选三 id 互异 / 题表三元组一致 / fair 类互异 / answer=good 列复算 / 初始态干净
   （dch 参数保留签名兼容——r50 全程三选不再分支卡数档） ---------- */
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.scene) || q.scene < 0 || q.scene >= SCENES.length) return 'scene';
  const row = SCENES[q.scene];
  if (q.picks.length !== 3) return 'picksN';               // r50：恒三选（ch1-4/生成关同构）
  if (new Set(q.picks).size !== 3) return 'dupId';         // 三 id 互异
  const exp = q.picks.indexOf(row.good);
  if (exp < 0 || q.answer !== exp) return 'answer';        // answer=题表 good 列下标复算
  if (POOL[row.fair].kind !== 'good' || row.fair === row.good) return 'fair';         // fair=好池成员且≠good
  if (GOOD_CLASS[row.fair] === GOOD_CLASS[row.good]) return 'fairClass';              // 类互异（灰阶可教锚）
  const ids = q.picks.slice().sort().join('|');
  const idsRow = [row.good, row.fair, row.neutral || row.bad].slice().sort().join('|');
  if (ids !== idsRow) return 'ids';                        // picks 集与题库行三元组一致（卡序无关）
  if (q.say !== row.say || q.emo !== row.emo) return 'say';
  if (q._miss !== 0 || q._answered) return 'dirty';
  return null;
}
