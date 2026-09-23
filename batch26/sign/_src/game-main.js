/* ================= sign 主逻辑（题面渲染 / 含义卡·行为卡点选 / 闪现遮面 / 标志放大跳+兔子示范 / 教学 / 救援 / 推进）
   玩法（SPEC-R36-SIGN）：题面 = 街景 + 交通标志大图 + 题面句 clip（mean=sgn_q
   「这个标志是什么意思？」/ act=sgn_q_act「看到这个标志，怎么做？」——TODO 键
   注册前静默），下方 4 张卡（mean 含义卡 / act 行为卡）。flash 题（ch2 起）=标志
   亮相 FLASH_MS=1800ms 后被「?」面板遮住，凭记忆作答（救援方向级已遮时重闪
   1200ms 再遮回——reflashCover，不刷 lastAct 防自喂）。
   点对 = 标志放大跳 + 小兔子滑入示范 + 含义句 clip（sgn_sent_*；新 12 标志注册前
   静默——SPEC §R10 过渡态）；点错 = 该卡摇头 + queue 链 [sgn_wrong clip, 引导句]
   （引导句按题面标志族 GUIDE[fam] clip sgn_guide_*——注册前静默段终止，
   锚定形状颜色线索，禁「错了」否定人格），1000ms 防重入窗（b16 定案）后可重选（探索不罚）。
   救援两级（§0.61/家族 B 定版，habitat lastDir 同构）：14s 方向级=重读题面 + 题面卡 pulse
   （lastDir 独立节流锚，不重置 lastAct——答案级可达）；30s 答案级=正确含义卡 breathe + 重读。
   主动读题（startLevel/hear/点题面）重置 lastAct idle 锚（b25 M4：防长链后被当挂机连读）；
   救援自读不重置防自喂（方向级仅动 lastDir；答案级重置 lastAct=30s 自然节流）。
   语音窗（家族 G/H，clip 实长 SPEC-BATCH26 §4 量化）：
   sgn_tut_watch 3456 → 教学演示 tap 延至 t=900+3000=3900（≥3456+300，禁与收束 TTS 撞头）；
   sgn_tut_turn 1872 → turn 后读题延 2200（≥1872+300 防尾截）；
   sgn_right 2448 → winFlow celebrate(2620)+wait(400)=3020 ≥2748（判对后窗）；
   sgn_wrong 2808 + 引导句（estMs 最长 9 字「红倒三角说，让一让」=3705）→ 拼播链
     2808+150+3705=6963，错点防重入窗 1000ms（batch21 §0 L9）；对选可打断链=主动
     交互优先；救援读题掐链由 wrongChainUntil=7000 守卫（审查 M4：错路径起播设豁免
     终点，救援 interval 让路；r36 引导句 8→9 字 6700→7000）；
   sgn_q 2544 → 读题 clip（重听按钮可再触发，无锁窗）；
   act 题面句 sgn_q_act（TODO 键）estMs(10 字)=4050 → renderQuiz 后 fire-and-forget，
     无 await 窗（对选即停上一条）；
   含义句 TTS 最长 10 字 estMs=10*345+600=4050 → 判对演出窗 1800+3600=5400 ≥4050
     （错→对路径读题延 5400 防错反馈链掐在 <500ms——b25 定版 estMs 口径）。
   验收钩子：window.SG = { get currentLevel, get quiz(){sign, meaning, cards[]{id,meaning},
   step, miss}, tapCard(i), start(flat), async autoSolve(), get tutorial }（getter 返回拷贝） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（habitat 6 岁试玩 P1 沉淀同构） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，审查 M4） */
const sayW = parts => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); }
};

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

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

/* ================= 题面语音（mean=clip sgn_q / act=TODO 键 sgn_q_act 注册前静默——SPEC §R10） ================= */
function speakQuiz() {
  if (!cur || !cur.quizzes[cur.step]) return;
  const q = cur.quizzes[cur.step];
  if (q.kind === 'act') KIDS.voice.play(ACT_Q.key, ACT_Q.text);   /* 「看到这个标志，怎么做？」 */
  else KIDS.voice.play(VOICE.q.key, VOICE.q.text);                /* 「这个标志是什么意思？」 */
}

/* ================= 渲染 ================= */
/* flash 遮面 timer 族（§R9 时序表新增面）：单 pending 变量，renderScene 入口清——
   重入安全（换题/重玩/教学重发同关时旧 timer 必被清，r30 身份守卫配套） */
let flashTimer = 0, revealTimer = 0;
function clearFlashTimers() {
  if (flashTimer) { clearTimeout(flashTimer); flashTimer = 0; }
  if (revealTimer) { clearTimeout(revealTimer); revealTimer = 0; }
}
function renderScene(q) {                        // 题面：街景 + 大标志（+flash 遮面）+ 题面句文字条
  clearFlashTimers();
  sceneEl.dataset.sign = q.sign;
  sceneEl.setAttribute('aria-label', SIGNS[q.sign].n + '，点我再听一遍');
  sceneEl.innerHTML = streetSvg() +
    '<div class="sign-slot">' + signSvg(q.sign, 118) +
    (q.flash ? '<div class="flash-cover" aria-hidden="true"><span>?</span></div>' : '') +
    '</div>' +
    '<div class="q-text">' + (q.kind === 'act' ? ACT_Q.text + '？' : quizText) + '</div>';
  if (q.flash) {                                 // 闪现观察题：亮相 FLASH_MS 后遮面（SPEED 提速随 verify）
    const cover = sceneEl.querySelector('.flash-cover');
    flashTimer = setTimeout(() => { cover.classList.add('on'); flashTimer = 0; }, FLASH_MS * SPEED);
  }
}
/* 救援重闪（§R1 维度二救援让步）：flash 题已遮时揭面 REVEAL_MS 再遮回；
   仅 14s 方向级触发；不刷 lastAct（救援自读族防自喂——§R4） */
const REVEAL_MS = 1200;
function reflashCover() {
  const q = cur && cur.quizzes[cur.step];
  const cover = sceneEl.querySelector('.flash-cover');
  if (!q || !q.flash || !cover || !cover.classList.contains('on')) return false;
  cover.classList.remove('on');
  if (revealTimer) clearTimeout(revealTimer);
  revealTimer = setTimeout(() => { cover.classList.add('on'); revealTimer = 0; }, REVEAL_MS * SPEED);
  return true;
}
function renderBoard(q) {                        // 卡排：mean 含义卡（m 短语+含义图标）/ act 行为卡（ACT 短语+行为图标）
  boardEl.innerHTML = '';
  const isAct = q.kind === 'act';
  boardEl.classList.toggle('act', isAct);
  q.cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.meaning = c.meaning;                // verify 对账（渲染即引擎；act 卡 meaning=行为 id）
    const label = isAct ? ACT[c.meaning] : SIGNS[c.meaning].m;
    b.setAttribute('aria-label', label + (isAct ? '行为卡' : '含义卡'));
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="gwrap">' + (isAct ? actSvg(c.meaning) : meanSvg(c.meaning)) + '</span>' +
      '<span class="m-label' + (label.length >= 5 ? ' long' : '') + '">' + label + '</span>';
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();  /* 开场/换题读题；demo 门防演示收尾叠播 */
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

/* ================= 答对演出：标志放大跳 + 小兔子滑入示范（含义句 TTS 由 uiTapCard 播）
   verify 页跳飞行直接落定 ---------- */
function celebrateSign(run) {
  const slot = sceneEl.querySelector('.sign-slot');
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
/* 教学"帮"阶段指向：当前题正确含义卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点含义卡主路径（真实点击 / SG.tapCard / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（含义卡排容器 bump 微动效——家族 D）；
   错点 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）========== */
async function uiTapCard(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCard(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+sgn_wrong+形状颜色引导句（绑题面标志 fam） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sayW([VOICE.wrong.key, { key: 'sgn_guide_' + SIGNS[q.sign].fam, text: GUIDE[SIGNS[q.sign].fam] }]);  /* T46 阶段2：引导句 clip 化（sgn_guide_* 5，链尾段） */
    wrongChainUntil = Date.now() + 7000;         /* 链豁免：2808+150+estMs(引导句最长9字=3705)+300=6963（审查 M4；r36 引导句 8→9 字） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms（batch21 §0 L9）；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：标志放大跳+兔子示范+含义句 TTS） ---- */
  clearFlashTimers();                            /* r36 审查 M5：flash 抢答后掐 pending 遮面 timer+揭面，防「?」盖答对演出 */
  { const _cv = sceneEl.querySelector('.flash-cover'); if (_cv) _cv.classList.remove('on'); }
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
  if (cur === run) celebrateSign(run);           /* 标志放大跳 + 小兔子滑入示范 */
  KIDS.voice.play('sgn_sent_' + q.sign, confirmText(q.sign));   /* T46 阶段2：含义句 clip 化（sgn_sent_* 24，estMs(10 字)=4050 ≤ 窗 5400-300；审查 M3 注释勘正） */
  await wait(1800 * SPEED);                      /* 标志跳+卡亮+含义句主窗 */
  if (cur !== run) return r;
  await wait(3600 * SPEED);                      /* 含义句 TTS 收尾窗：总 5400 ≥ estMs(10字)=4050（b25 estMs 定版）；
                                                    错→对路径读题延 5400 防错反馈链掐在 <500ms */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（标志/含义卡全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（审查 M3：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* sgn_right：认对啦，真安全（2448ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2448+300（sgn_right 判对后窗 ≥2748） */
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
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（审查 M2/M4 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.sign && sv.sign.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面（clip sgn_q） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示认对红绿灯（flat0 题0 恒 light——确定性锚点，标志放大跳+兔子滑入）
   →帮=指向正确含义卡；独=首次选对放手（watch 全程 ≤16s）
   时序（家族 G/H）：watch clip 3456ms → 演示 tap 延至 t=900+3000=3900（≥3456+300），
   含义句 TTS 不与 watch 撞头；演示演出窗 5400 罩含义句 TTS 再收束 turn ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* sgn_tut_watch：看！这个标志告诉你什么（3456ms） */
  await wait(900 * SPEED);                       /* 街景+标志亮相 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 sign=light（→看灯走）
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));
  await wait(3000 * SPEED);                      /* t=3900 ≥ watch 3456+300=3756：clip 播完再演示（不撞头） */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapCard(idx, true);      /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__sgDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);                       /* 收尾（含义句 TTS 仍在播，由 uiTapCard 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.sign = sv.sign || {};
  sv.sign.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来选一选"在重发后的题面上说（照 batch5-25） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* sgn_tut_turn：你来选一选（1872ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2200);                                      /* ≥1872+300 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再看看标志的样子 */
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
  speakQuiz();                                   /* 再听一遍：题面 clip 重读 */
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
  uiTapCard(Number(p.dataset.i));
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
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确含义卡 breathe）/ 教学"帮"5s 重演示 */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（审查 M4）：链播完前救援不掐断 */
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
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+题面卡 pulse（不动 lastAct）；
                                                     flash 题已遮时重闪（§R1 维度二救援让步） */
    speakQuiz();
    replayAnim(sceneEl, 'pulse');
    if (cur.quizzes[cur.step] && cur.quizzes[cur.step].flash) reflashCover();
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'sign', title: '交通标志' });   // 存档键 kidsgame_sign（core VER 1.0，家族 C）
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
window.SG = {
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
    return { sign: q.sign,                                  /* SPEC §1 钩子契约：标志 id */
             meaning: q.sign,                               /* 正确含义/行为 id（meaning id=标志 id，两题型同判） */
             kind: q.kind,                                  /* 'mean' | 'act'（r36 只增字段） */
             flash: !!q.flash,                              /* 闪现观察题标记（r36 只增字段） */
             cards: q.cards.map(c => ({ id: c.id, meaning: c.meaning })),   /* {id,meaning} 契约字段 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选含义卡，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;
      const r = await uiTapCard(i);
      if (r === false || r === null) break;      // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
