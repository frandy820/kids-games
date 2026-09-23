/* ================= crd 纯引擎：确定性关卡生成 + 题表驱动契合判定（无 DOM，UI 与 verify 共用）
   r12（2026-09-15）：判定真值=game-data SPEC_TABLE 题级表驱动（kind like/clash/wish/mix
   ×occ 场合×who 收卡人×每步 [col, correct, 干扰×2, h]）——v1「主题静态映射」废止
   （AUDIT-56 #39：8 条映射背一遍全对零失误）。引擎仍唯一契合（表三元组互异）。
   种子 = mulberry32(flat * 7919 + 857)（本款常量 857，SPEC-BATCH39 §0.94 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   取题（承 v1 章池+rotate）：静态关 flat<20：章 ch 的 5 题按关内偏移 rotate——
   scene=(ch-1)*5+((lv+qi)%5)；生成关 flat≥20：dch=ri(rnd,1,4) seeded 随机（域全档
   成立型），从对应章题池 seeded 无放回抽 5（dch≤2 池 scene 0-9 / dch≥3 池 10-19
   ——两步/三步域守恒）。
   候选盘（每步 3 枚）：SPEC_TABLE 行步三元组 seeded 打乱盘序（rnd 消耗恒定：
   每步恰 1 次 shuffled 取数）；answer=picks.indexOf(correct)。
   quiz 结构：{ scene(0-19), kind, occ, who, nstage(2|3), say(线索句), stage(题内步号
   0..nstage-1), stages[]({col('bg'|'st'|'wish'), picks[](3 枚), answer, h(步型
   'like'|'clash'|'wish'|'theme')}), _miss, _answered }
   步推进语义（stamp blanks 连盖同构）：非末步 stage+1（step 不动）；末步=卡完成
   _answered+step+1；末题末步='done'。
   铁律：每关 5 题；每步恰一枚契合项（structWhy 校验含 r12 语义四规则）；
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
const KINDS = ['like', 'clash', 'wish', 'mix'];
const OCCS = ['birthday', 'newyear', 'thanks', 'sorry', 'sick'];
const WHOS = ['grandma', 'monkey', 'teacher', 'friend'];
const HS = ['like', 'clash', 'wish', 'theme'];

/* ---------- 单题（卡）构建：SPEC_TABLE 行 + seeded 盘序；answer=契合项下标 ---------- */
function buildQuiz(scene, rnd) {
  const row = SPEC_TABLE[scene];
  const stages = row.steps.map(s => {
    const picks = shuffled([s[1], s[2], s[3]], rnd);         // 契合 1+干扰 2 表三元组 seeded 打乱
    return { col: s[0], picks: picks, answer: picks.indexOf(s[1]), h: s[4] };
  });
  return { scene: scene, kind: row.kind, occ: row.occ, who: row.who, nstage: row.nstage,
           say: row.say, sayKey: 'crd_sc_' + (scene + 1),   // T46 阶段2：情境句 clip 键（SPEC_TABLE 行序=crd_sc_N 注册序，禁重排）
           stage: 0, stages: stages, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关 seeded 无放回抽 5（顺序即题序）；池按 dch 选数分（两步/三步域守恒） ---------- */
function pickScenes(dch, rnd) {
  const pool = dch <= 2 ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const a = pool.slice(), out = [];
  for (let k = 0; k < CH_LEN; k++) out.push(a.splice(ri(rnd, 0, a.length - 1), 1)[0]);
  return out;
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 857);
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

/* ---------- 制卡引擎（无 DOM）：engTapPick(L, i) —— 点当前步第 i 枚候选
   'placed'  选对（本题步未完继续 stage+1 / 步完推进 step；末题末步并返 'done'）
   'done'    选对且末题末步=通关（与 'placed' 同拍——SPEC §1 末题末步 'done'）
   'wrong'   选干扰项：该题 miss+1（retries 全关累计=星级口径），候选回可重点（探索不罚）
   null      非法下标 / 关卡已结束 / 本题已答完 ---------- */
function engTapPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  const st = q.stages[q.stage];
  if (!st || !Number.isInteger(i) || i < 0 || i >= st.picks.length) return null;
  if (i === st.answer) {
    q.stage++;
    if (q.stage >= q.stages.length) {
      q._answered = true;                                    // 末步已选=本卡完成
      L.step++;
    }
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'placed';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（SPEC §0.94 miss 口径：选错计）：全关选错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前步契合项下标（独立函数供 verify 复核） */
const correctIdx = q => !q || !q.stages || !q.stages[q.stage] ? -1 : q.stages[q.stage].answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：scene 域 / kind·occ·who·
   nstage·say 与题表行一致 / nstage 与 dch 档一致（dch≤2 两步/≥3 三步）+kind 域一致
   （like·clash 两步 / wish·mix 三步）/ 步序列 col 顺序 / 每步盘 3 枚互异且属本列
   封闭集 / 契合项在盘恰 1+answer=契合下标复算 / h 域 / r12 语义四规则
   （偏好锚定·冲突同屏·语用映射·theme 步排除收卡人偏好元素）/ 初始态干净 ---------- */
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.scene) || q.scene < 0 || q.scene >= SPEC_TABLE.length) return 'scene';
  const row = SPEC_TABLE[q.scene];
  if (KINDS.indexOf(q.kind) < 0) return 'kindSet';
  if (OCCS.indexOf(q.occ) < 0) return 'occSet';
  if (WHOS.indexOf(q.who) < 0) return 'whoSet';
  if (q.kind !== row.kind) return 'kind';
  if (q.occ !== row.occ) return 'occ';
  if (q.who !== row.who) return 'who';
  if (q.nstage !== row.nstage) return 'nstage';
  const wantN = dch <= 2 ? 2 : 3;
  if (q.nstage !== wantN) return 'nstageDch';               // 盘步数选数档（域守恒）
  const kn = (q.kind === 'like' || q.kind === 'clash') ? 2 : 3;
  if (q.nstage !== kn) return 'kindNstage';                 // 章题型域（ch1-2 两步/ch3-4 三步）
  if (!Array.isArray(q.stages) || q.stages.length !== q.nstage) return 'stagesN';
  for (let k = 0; k < q.stages.length; k++) {
    const st = q.stages[k], sp = row.steps[k];
    if (st.col !== COLS(q.nstage)[k] || st.col !== sp[0]) return 'colSeq';   // 步序列=bg→st(→wish)
    if (st.h !== sp[4] || HS.indexOf(st.h) < 0) return 'h';
    if (st.picks.length !== 3) return 'picksN';             // 候选恒 3 枚（5-6 候选≤3）
    if (new Set(st.picks).size !== 3) return 'picksDup';    // 候选互异
    for (let j = 0; j < st.picks.length; j++)
      if (COLUMN_EL[st.col].indexOf(st.picks[j]) < 0) return 'picksSet';     // 本列封闭集
    let hits = 0;
    for (let j = 0; j < st.picks.length; j++)
      if (st.picks[j] === sp[1]) hits++;
    if (hits !== 1) return 'picksFit';                      // 契合项恰 1（表三元组互斥）
    if (st.answer !== st.picks.indexOf(sp[1])) return 'answer';
    /* r12 语义四规则（引擎级自证——verify 另有独立表对账） */
    if (st.h === 'like') {
      if (WHO_LIKE[q.who]) {
        if (sp[1] !== WHO_LIKE[q.who][st.col]) return 'likeAnchor';         // 正偏好=偏好元素
      } else if (q.who === 'friend') {
        if (sp[1] !== OCC_EL[q.occ][st.col] || st.picks.indexOf('horn') < 0) return 'likeNeg';   // 负偏好=场合默认+喇叭在场
      } else return 'likeWho';
    }
    if (st.h === 'clash') {
      if (sp[1] !== OCC_EL[q.occ][st.col] || CONFLICT_EL[q.occ] === undefined ||
          st.picks.indexOf(CONFLICT_EL[q.occ]) < 0) return 'clashRule';     // 冲突项与主题项同屏
    }
    if (st.h === 'wish' && sp[1] !== OCC_EL[q.occ].wish) return 'wishRule'; // 语用映射=场合祝福语
    if (st.h === 'theme') {
      if (sp[1] !== OCC_EL[q.occ][st.col]) return 'themeRule';
      if (WHO_LIKE[q.who]) {                                 // 排除收卡人偏好元素（防双真值歧义）
        const likes = Object.keys(WHO_LIKE[q.who]).map(c => WHO_LIKE[q.who][c]);
        for (let j = 0; j < st.picks.length; j++)
          if (st.picks[j] !== sp[1] && likes.indexOf(st.picks[j]) >= 0) return 'themeExclude';
      }
    }
  }
  if (q.say !== row.say) return 'say';
  if (q._miss !== 0 || q._answered || q.stage !== 0) return 'dirty';
  return null;
}
