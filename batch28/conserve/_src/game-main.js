/* ================= conserve 主逻辑（题面渲染 / 变换演出 / 三文字卡点选 / 教学 / 救援 / 推进）
   玩法：题面 = 左右对比场景（两排圆片 / 两杯水 / 两团橡皮泥）+ 变换动画，下方 3 张文字卡
   （左边的多 / 一样多 / 右边的多——恒全摆）。变换题开场演出（演出窗吞点——家族 D）：
   pre 帧「看，两边一样多」（TTS 对齐窗）→ 变换动画 ≤2s + 解说句（动画期间播，窗=estMs 对齐）
   → add 题追加变更演出（又给…加了一个 / 又倒一点 / 又切一块）→ 读题 cnv_q「哪一边多」
   （读题在变换动画后才播）。ch1 无变换直接读题。
   点对 = 场景放大跳 + 小兔子滑入示范 + 确认句 TTS 拼句（「两边都是六个，一样多」——rows same
   计数证据锚）；点错 = 卡摇头 + queue 链 [cnv_wrong clip, 语义引导句 TTS]（rows same=计数
   证据句「再数一数，两边都是 N 个哦」/ pour·clay=不变多不变少句 / add=回溯锚），1000ms
   防重入窗后可重选（探索不罚）。
   救援两级（§0.69/家族 B 定版）：14s 方向级=重读题面 + 题面卡 pulse（lastDir 独立节流锚，
   不重置 lastAct）；30s 答案级=正确卡 breathe + 重读；面板在场守卫（契约 K）静默。
   语音窗（家族 G/H/I，clip 实长 SPEC-BATCH28 §4 量化）：
   cnv_tut_watch 2712 → 教学变换延至 t=3012（≥2712+300，禁与解说 TTS 撞头）；
   cnv_tut_turn 1848 → turn 后读题延 2200（≥1848+300 防尾截）；
   cnv_right 2496 → winFlow celebrate(2620)+wait(400)=3020 ≥2796（判对后窗）；
   cnv_wrong 2184 + 引导句 TTS（estMs 最长 21 字=7845）→ 拼播链 2184+150+7845=10179，
     错点防重入窗 1000ms；对选可打断链；救援读题掐链由 wrongChainUntil=10500 守卫（契约 I）；
   cnv_q 1680 → 读题 clip（变换动画后播；重听按钮可再触发）；
   确认句 TTS 最长 12 字 estMs=4740 → 判对演出窗 1800+3600=5400 ≥4740（b25 定版 estMs 口径）。
   验收钩子：window.CV = { get currentLevel, get quiz(){kind, family, left{n,spread},
   right{n,spread}, addSide, opts[]{id,text}, answer, step, miss}, tapOpt(i), start(flat),
   async autoSolve(), get tutorial }（getter 返回拷贝）
   tapOpt 返回：对='right' / 末题对='done' / 错='wrong'（miss+1，step 不变）/
   locked·演出窗（含变换演出窗）=false+pop+bump / 越界·已答=null+pop+bump；
   教学演示结果 window.__cvDemoR */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* m2（审查 2026-09-10）：节流未播返回 false——豁免窗仅起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, intro: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let scenePhase = 'postadd';                     // 当前题面相位（pre/post/postadd）
let introGen = 0;                               // 变换演出代际（换关/重玩让渡锁权）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（恒 clip cnv_q「哪一边多」——变换动画后才播） ================= */
function speakQuiz() {
  if (!cur || !cur.quizzes[cur.step]) return;
  KIDS.voice.play(VOICE.q.key, VOICE.q.text);       /* 「哪一边多」 */
}

/* ================= 渲染 ================= */
const FAM_NAME = { rows: '两排圆片', pour: '两杯水', clay: '两团橡皮泥' };
function renderSceneAt(q, phase) {               // 题面：场景三相之一 + 题面句文字条
  scenePhase = phase;
  sceneEl.dataset.family = q.family;
  sceneEl.dataset.phase = phase;
  sceneEl.setAttribute('aria-label', FAM_NAME[q.family] + '，点我再听一遍');
  sceneEl.innerHTML = '<div class="scene-slot">' + sceneSvg(q, phase) + '</div>' +
    '<div class="q-text">哪一边多？</div>';
}
function renderBoard(q) {                        // 文字卡排（3 卡恒全摆）
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.oid = o.id;                        // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', o.text + '卡');
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="t-label">' + o.text + '</span>';
    boardEl.appendChild(b);
  });
}
/* 变换演出（SPEC §0.69：变换前后各一帧；演出窗吞点——家族 D）
   pre 帧+「看，两边一样多」→ 变换动画（≤2s CSS）+解说句（窗=estMs 对齐）→
   add 变更演出 → 读题。全部窗乘 SPEED（verify 提速；真实页 SPEED=1 对齐） */
async function quizIntro(q) {
  const gen = ++introGen;
  const run = cur;
  state.intro = true;
  state.locked = true;                           /* 变换演出窗：tapOpt 吞 false+pop+bump */
  renderSceneAt(q, 'pre');
  KIDS.voice.play('cnv_pre', PRE_SAY);           /* T46 阶段2：「看，两边一样多」clip 化（2424） */
  await wait(estMs(PRE_SAY) * SPEED);
  if (gen !== introGen || cur !== run) return;
  renderSceneAt(q, 'post');                      /* 变换动画（.rs-morph CSS ≤2s） */
  KIDS.voice.play('cnv_t_' + q.family, T_SAY[q.family]);   /* T46 阶段2：变换解说 clip 化（最长 3912） */
  await wait(estMs(T_SAY[q.family]) * SPEED);
  if (gen !== introGen || cur !== run) return;
  if (q.kind === 'add') {
    renderSceneAt(q, 'postadd');                 /* 变更演出（视觉增量明显） */
    KIDS.voice.play(addKeyOf(q), addSayOf(q));   /* T46 阶段2：追加句 clip 化（最长 2592） */
    await wait(estMs(addSayOf(q)) * SPEED);
    if (gen !== introGen || cur !== run) return;
  }
  state.intro = false;
  state.locked = false;
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   /* 读题在变换动画后 */
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderSceneAt(q, cur.dch === 1 ? 'postadd' : 'pre');
  renderBoard(q);
  renderStep();
  if (cur.dch >= 2) quizIntro(q);                /* 变换章开场演出（verify 也真实走 locked 窗） */
}
function renderStep() {                          // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                          // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 答对演出：场景放大跳 + 小兔子滑入示范（确认句 TTS 由 uiTapOpt 播）
   verify 页跳飞行直接落定 ---------- */
function celebrateScene(run) {
  const slot = sceneEl.querySelector('.scene-slot');
  if (slot) replayAnim(slot, 'jump');
  if (!sceneEl.querySelector('.demo-pet')) {
    const pet = document.createElement('div');
    pet.className = 'demo-pet';
    pet.innerHTML = KIDS.assets.rabbit('happy', 58);   /* 小兔子开心示范 */
    sceneEl.appendChild(pet);
  }
  hopRabbit();
}

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：当前题正确卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / CV.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   变换演出窗/错防重入窗/判对演出窗共用 locked 门；错点 1000ms 防重入窗（b16 定案）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+cnv_wrong+语义引导句（按 family×kind） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, { key: guideKeyOf(q), text: guideOf(q) }]))  /* T46 阶段2：引导句 clip 化（m2：仅链起播时设窗） */
      wrongChainUntil = Date.now() + 10500;      /* 链豁免：2184+150+引导 clip 最长 4944+300=7578 ≤ 10500（契约 I） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：场景放大跳+兔子示范+确认句 TTS） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateScene(run);          /* 场景放大跳 + 小兔子滑入示范 */
  KIDS.voice.play(confirmKeyOf(q), confirmOf(q));  /* T46 阶段2：确认句 clip 化（最长 3192 ≤ 窗 5400-300） */
  await wait(1800 * SPEED);                      /* 场景跳+卡亮+确认句主窗 */
  if (cur !== run) return r;
  await wait(3600 * SPEED);                      /* 确认句 TTS 收尾窗：总 5400 ≥ estMs(12字)=4740（b25 定版） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（场景/卡全换；变换章走 quizIntro）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* cnv_right：比对啦，真厉害（2496ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2496+300（cnv_right 判对后窗 ≥2796） */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null)（b25 形态定版） */
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                             // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);                // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  introGen++;                                    /* 旧变换演出让渡锁权（重玩/换关） */
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, intro: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.conserve && sv.conserve.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  if (cur.dch === 1) speakQuiz();                /* 无变换章直接读题；变换章由 quizIntro 收尾读题 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=两排 5 圆片对齐展示（「两边一样多」）→右排拉开动画+解说→幽灵手指点「一样多」卡
   （「数一数就知道」）→帮=指向正确卡；独=首次选对放手（watch 全程 ≤16s，分账 15162）
   时序（家族 G/H）：watch clip 2712ms → 变换延至 t=3012（≥2712+300=3012，禁与解说撞头）；
   演出窗 5400 罩确认句 TTS 再收束 turn ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* cnv_tut_watch：看！哪一边多（2712ms） */
  const run = cur;
  await wait(3012 * SPEED);                      /* t=3012 ≥ 2712+300：clip 播完再变换（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 rows/same/base5（→一样多）
  /* 教学演示右排拉开（题本体 dch1 无变换——教学帧借 spread=1 演示守恒核心，答案不变） */
  const dq = Object.assign({}, q, { right: { n: q.base, spread: 1 } });
  renderSceneAt(dq, 'post');                     /* 右排拉开动画 */
  KIDS.voice.play('cnv_t_rows', T_SAY.rows);     /* T46 阶段2：「右边的拉开了，可是数量没有变」clip 化（3648） */
  await wait(estMs(T_SAY.rows) * SPEED);         /* 窗=estMs(14字)=5430 对齐（动画 ≤2s 含窗内） */
  if (cur !== run) return;
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));                     /* 幽灵手指指向「一样多」卡 */
  await wait(700 * SPEED);                       /* ghost 移入停顿 */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__cvDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(300 * SPEED);                       /* 收尾（确认句 TTS 仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.conserve = sv.conserve || {};
  sv.conserve.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来比一比"在重发后的题面上说（照 batch5-27） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, intro: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* cnv_tut_turn：你来比一比（1848ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step] && !state.intro) speakQuiz();
  }, 2200);                                      /* ≥1848+300=2148 防尾截（turn 后读题延） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：先数一数再比 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：题面重读（cnv_q） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapOpt(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+题面卡 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe）/ 教学"帮"5s 重演示 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+题面卡 pulse（不动 lastAct） */
    speakQuiz();
    replayAnim(sceneEl, 'pulse');
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* m4（审查 2026-09-10）：命名函数与两款同构，供 verify 源码级断言 */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'conserve', title: '数量守恒' });   // 存档键 kidsgame_conserve（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.CV = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                             /* SPEC §3 钩子契约：same|add */
             family: q.family,                         /* rows|pour|clay */
             left: { n: q.left.n, spread: q.left.spread },
             right: { n: q.right.n, spread: q.right.spread },
             addSide: q.addSide,                       /* same=0 / add=-1|1（变更侧） */
             opts: q.opts.map(o => ({ id: o.id, text: o.text })),   /* 3 文字卡 {id,text} */
             answer: q.answer,                         /* 正确卡下标 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选卡，走真实判定链；
    let taps = 0, guard = 0;             // 变换演出窗内 tap=false → 等窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 120) {
      let wg = 0;
      while ((state.locked || state.demo || state.intro) && wg++ < 600) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapOpt(q.answer);
      if (r === 'right' || r === 'done') taps++;
      else if (r === 'wrong') { /* 继续重试点对（不会发生：直点 answer） */ }
      else if (guard >= 118) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
