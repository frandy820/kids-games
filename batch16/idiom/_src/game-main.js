/* ================= idiom 主逻辑 r16（情境句渲染 / 点候选卡判定 / 教学 / 救援 / 推进）
   玩法：情境句卡（ctx 大字+下划线空位+读句喇叭）→ 白话小注条（错满 2 次=答案级释义 /
   点对窗=释义巩固）→ 成语候选卡（fill 4 张同章干扰 / near 2 张近义辨析；#cards.k2）。
   点对=情境卡亮+空位填入成语+确认链 [idm_right2, idm_w_<idx>, idm_def_<idx>]（家族 G/H 动态窗
   1600+confirmTailMs 恒 ≥ 链；T46 阶段2 释义尾段 clip 化）；点错=卡晃+错链 [idm_wrong2, idm_hint2]
   （豁免窗 6480）+零惩罚可重点（不灰化款，miss 无上限计数）。
   开题链（契约 N 形态，T46 阶段2 全 clip 化）：[idm_q_fill|idm_q_near, idm_ctx_<idx>]。
   救援：14s 方向级=重读开题链+情境卡 flash 回锚（lastDir 独立节流锚，家族 B）；
   30s 答案级=正确卡 breathe（位置线索不念答案）；错链豁免窗让路（契约 I）。
   验收钩子：window.IDM = { get currentLevel, get quiz{kind,idx,ctx,options,answer,step,
   miss}, tapCard(i), start(flat), hear(), async autoSolve(), get rescues, get tutorial,
   nextHintOf(flat) }——verify 家族 F 断言直调 nextHintOf。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.08 : 1;               // verify 页内 UI 演出提速（40 关×8 题全驱时限收敛；
                                                // 窗口语义不变仅时间缩放，错反馈节流走真时钟）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* estMs/Q_INSTR/DECIDE_MS/confirmTailMs/WRONG_CHAIN_MS 等常量均在 game-data.js（r16 单源——禁此处重复声明） */
/* 救援/开场读题/教学不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流（契约 J：错链全程保留，禁切通用 clip）：flat<3 每错必播；
   flat≥3 走 10s 节流；force=miss===2 豁免恰一次（不灰化款口径，batch9/11 定版）
   ——节流未播返回 false，豁免窗仅链起播时设（契约 I「起播设」） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援让路） */
const sayW = (parts, force) => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  /* P2-C2 修复（试玩+审查）：force 分支同步重置节流锚（对齐姊妹款 spellen/timecalc 结构——
     原 force 直 queue 不动锚，10s 节流被豁免播放绕过=三连错 16s 内播 3 次） */
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;
};

const stageEl = $id('stage'), qcardEl = $id('qcard'), qTextEl = $id('q-text'),
      qSpkEl = $id('q-spk'), noteEl = $id('note'), cardsEl = $id('cards'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 听按钮重播 3s 节流
let helpRedemo = false;
let rescueCount = 0;

/* ---------- 竖屏双通道（body.port 类通道与 @media 逐条等值——head 两段同步；verify simView 用类通道） ---------- */
const portMQ = window.matchMedia ? window.matchMedia('(orientation:portrait)') : null;
function applyPort() {
  document.body.classList.toggle('port',
    !!(portMQ ? portMQ.matches : window.innerHeight > window.innerWidth));
}
applyPort();
if (portMQ && portMQ.addEventListener) portMQ.addEventListener('change', applyPort);
else window.addEventListener('resize', applyPort);

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const LV_RANGE = [0, 1, 2, 3, 4, 5, 6, 7];       // 每章 8 关（r16 CH_LEN=8）
const cardEl = i => (i == null || i < 0) ? null : cardsEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 旧档迁移（r16 M3：CH_LEN 5→8 + 章 4→5 键基变更）
   旧基（30 条/4 章/CH_LEN 5）存量档 levels 键 'C-L' L≤4，与新基 'C-L' L≤7 错位
   （旧 '2-0'=旧 flat5 误作新 flat8 → 跳关+章语义错乱）。新基顺序解锁下
   「有跨章首关 C-0 而缺前章第 6 键 (C-1)-5」=旧基残留矛盾态 → 一次性整档重置
   （赶在 KIDS.init 读档前；教学关 ~5min 成本优于静默跳关）。正常新档不误删：
   顺序解锁到 C-0 必先过 (C-1)-5。c 扫 2..5（N_CH 全覆盖）。 ================= */
try {
  const raw = localStorage.getItem('kidsgame_idiom');
  if (raw) {
    const lv = (JSON.parse(raw) || {}).levels || {};
    let legacy = false;
    for (let c = 2; c <= N_CH; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { legacy = true; break; }
    }
    if (legacy) localStorage.removeItem('kidsgame_idiom');
  }
} catch (e) { /* 迁移失败不阻断启动 */ }

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  qSpkEl.innerHTML = ICONS.speaker;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（T46 阶段2 全 clip 化，契约 N 形态：clip 指令前缀+情境句 clip 尾）
   开题链 [idm_q_fill|idm_q_near, idm_ctx_<idx>]；确认链 [idm_right2, idm_w_<idx> 读音,
   idm_def_<idx> 释义尾]——零 keyless 段（原 keyless 文本尾段退役，read 正文先例豁免随
   Task#46 撤销）；缺段整句 KIDS.speak 兜底=防御性死分支（subbug sayQ/shop playChain 先例，
   build MUST 250 键+verify clipTail 双钉）；读题异步不占 UI 等待窗 ================= */
const quizParts = q => [qVoice(q).key, 'idm_ctx_' + q.idx];
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const ks = quizParts(q);
  if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
  else KIDS.speak(qVoice(q).text + idmOf(q.idx).ctx);
}
/* 确认链（家族 G/H 动态窗）：全 clip 三段（释义尾=idm_def_<idx>） */
const confirmParts = q => [VOICE.right2.key, idmKey(q.idx), 'idm_def_' + q.idx];

/* ================= 渲染 ================= */
function renderQcard(q) {                        // 情境句卡：ctx 的 ____ → 下划线空位框
  qTextEl.innerHTML = idmOf(q.idx).ctx.replace('____',
    '<span class="blank" aria-label="成语空位"></span>');
  replayAnim(qcardEl, 'flash');
}
function fillBlank(q) {                          // 点对：空位填入成语四字（绿底收束）
  const b = qTextEl.querySelector('.blank');
  if (b) { b.textContent = idmOf(q.idx).id; b.classList.add('ok'); }
}
function showNote(q) {                           // 白话小注（错满 2 次答案级 / 点对窗释义巩固）
  noteEl.textContent = idmOf(q.idx).say;
  noteEl.classList.add('show');
}
const hideNote = () => noteEl.classList.remove('show');
function renderCards(q) {                        // 候选卡：fill 4 张 / near 2 张（#cards.k2）
  cardsEl.classList.toggle('k2', q.kind === 'near');
  cardsEl.innerHTML = q.options.map((idx, i) =>
    '<button class="card" data-i="' + i + '" data-idx="' + idx +
    '" aria-label="' + idmOf(idx).id + '"><span class="tx">' + idmOf(idx).id + '</span></button>').join('');
}
function renderStep() {                          // HUD 本关 8 题进度点
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
  for (let c = 1; c <= Math.max(N_CH, cur.ch); c++) {
    const i = document.createElement('i');
    const done = LV_RANGE.every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function clearBreathe() { cardsEl.querySelectorAll('.card.breathe').forEach(c => c.classList.remove('breathe')); }
/* 答案级线索（miss≥2 / 30s 救援）：正确卡 breathe（位置线索，不念答案文本） */
function breatheAnswerCard(q) {
  if (!q || q.solved) return;
  const el = cardEl(q.answer);
  if (el) el.classList.add('breathe');
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearBreathe();
  hideNote();
  qcardEl.classList.remove('lit');
  renderQcard(q);
  renderCards(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 常规换题读题（教学演示期静默）
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
/* 教学"帮"阶段指向：当前题正确候选卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return;
  pointGhostAt(cardEl(q.answer));
}
let helpTimer = null;
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 点候选卡主路径（真实点击 / IDM.tapCard / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（候选区微动——家族 D）；豁免窗 guard：窗内错卡吞/对选放行 ========== */
async function uiTapCard(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(cardsEl, 'shake');
    return null;                                 /* 演出/教学演示期吞输入 */
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) { sfx('pop'); replayAnim(cardsEl, 'shake'); return null; }
  if (!Number.isInteger(i) || i < 0 || i >= q.options.length) {
    sfx('pop'); replayAnim(cardsEl, 'shake'); return null;   /* 越界 */
  }
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(cardsEl, 'shake'); return false;  /* 豁免窗内错卡吞/对选放行（契约 I） */
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCard(cur, i);
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 点错卡：晃动+错链+方向级情境卡回锚（不灰化可重点） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sfx('fail');
    if (sayW([VOICE.wrong2.key, VOICE.hint2.key], q._miss === 2))
      wrongChainUntil = Date.now() + WRONG_CHAIN_MS;         /* 错链豁免窗=6480（契约 I 静态，data 单源） */
    if (q._miss >= 2) { q._hinted = true; showNote(q); breatheAnswerCard(q); }   /* 答案级（miss≥2）：释义小注+正确卡 breathe */
    else replayAnim(qcardEl, 'flash');                        /* 方向级：情境卡闪（重读回锚不泄答案） */
    await wait(1000 * SPEED);                                 /* 错点防重入窗 1000ms；救援由豁免窗让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right/done：空位填入+情境卡亮+确认链（家族 G/H 动态窗 1600+confirmTailMs 恒 ≥ 链） ---- */
  lastAct = Date.now();                          /* 判对重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次做对放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe', 'wig'); el.classList.add('lit', 'hop'); }
  fillBlank(q);
  showNote(q);                                   /* 释义小注（点对窗巩固——听到也看到） */
  qcardEl.classList.add('lit');
  chimeGoal();
  sfx('coin');
  hopRabbit();
  const cks = confirmParts(q);                   /* 确认链：选对啦+成语读音+白话释义（全 clip） */
  if (cks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(cks);
  else KIDS.voice.say(VOICE.right2.text + idmOf(q.idx).id + idmOf(q.idx).say);   /* 缺段防御死分支 */
  await wait(CONFIRM_BASE * SPEED);              /* 主演出窗（空位填入+卡亮） */
  if (cur !== run) return r;
  await wait(confirmTailMs(q) * SPEED);          /* 确认链收尾动态窗：1600+tail ≥ 链实长+300 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return r; }
  renderQuiz();                                  /* 新题+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<N_CH 静态 5 章）；生成关=实算下一关随机章 GEN[dch-1]
     （家族 F：genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁章序取模推进形态） */
  return ci < N_CH ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  clearTimeout(helpTimer);
  ghost.hide();
  clearBreathe();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 收束垫——末题确认链已在点对窗播完，
                                                   章末/日末层语音（core_chapter_end）在层弹出时才起，无叠音 */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, LV_RANGE);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars8 = LV_RANGE.reduce((s2, l) => s2 + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars8, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A（b25 形态定版）：dayEnd 预告按今日进度关 lim-1（I-m1：原 null 实参形态=cur.flat，重玩旧关 edge 下预告错位——对齐姊妹款） */
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
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;       /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.idiom && sv.idiom.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→你来选→帮/独
   看=播 idm_tut_watch2「看！读句子选成语」(3360ms) → 等 3660（≥3360+300 防撞头）
   → 幽灵手指移到正确候选卡（900ms 移动窗）→ press → uiTapCard(answer, demo) 真实消耗 q0
   （空位填入+确认链完整闭环，__idmDemoR='right' 生效证据 §0.27）→ 等演出窗收束 → tutSeen 写档
   → handoff=重发同关（确定性关卡，题面一致）+ 顺序链 [idm_tut_turn2, 指令, ctx]（§0.6 单通道）
   帮（幽灵手指指当前题正确卡，5s 无动作重演示一次）/独（首次做对放手）。
   watch 时序（真实页名义预算 ≤10s）：3660 + 900 + 340 + 确认链窗（≤12750）≈ ≤17650 —— 链窗内
   SPEED=1 儿童跟随听释义，无操作等待。 ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch2.key, VOICE.watch2.text);     /* idm_tut_watch2：看！读句子选成语（3360ms） */
  const run = cur;
  await wait(3660 * SPEED);                      /* ≥3360+300：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q0 = cur.quizzes[0];                     // flat0 q0（确定性）：演示锚
  if (!VERIFY) { ghost.toEl(cardEl(q0.answer)); ghost.show(); }   /* 移到正确候选卡（0.8s CSS 过渡） */
  await wait(900 * SPEED);
  if (cur !== run) return;
  ghost.press();
  await wait(340 * SPEED);
  if (cur !== run) return;
  const r = await uiTapCard(q0.answer, true);    /* demo 通道豁免 locked 门（演示吞真实输入） */
  if (state.demo) window.__idmDemoR = r || null; /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  /* 等确认链演出窗收束（uiTapCard 内 locked 到窗末） */
  let wg = 0;
  while (state.locked && wg++ < 900) await wait(Math.max(2, 20 * SPEED));
  const sv = KIDS._save() || {};
  sv.idiom = sv.idiom || {};
  sv.idiom.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关+顺序链+幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  lastWrongVoice = 0; wrongChainUntil = 0;
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链：idm_tut_turn2「你来选一选」→ 题面指令 → 情境句 clip 尾（§0.6 禁双通道叠音；
     T46 全 clip 化三段，缺段 KIDS.speak 兜底=防御死分支） */
  const q0 = cur.quizzes[0];
  const hks = [VOICE.turn2.key, qVoice(q0).key, 'idm_ctx_' + q0.idx];
  if (hks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(hks);
  else KIDS.speak(VOICE.turn2.text + qVoice(q0).text + idmOf(q0.idx).ctx);
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  sayR(VOICE.hint2.key, VOICE.hint2.text);       /* 戳兔子=方向提示：读一读句子想一想 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  startLevel(cur.flat);
});
/* 重读题面（听按钮/情境卡共用）：重播开题链；3s 节流防连点轰炸（force=测试钩子直通） */
function replaySpeech(force) {
  if (!cur || !cur.quizzes[cur.step]) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  speakQuiz();
  return true;
}
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 对齐重玩门 */
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  replaySpeech(true);
});
qcardEl.addEventListener('pointerdown', e => {   /* 点情境卡/喇叭=重读情境句（主动学习，重置救援钟） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期轻叮（§0.22） */
  lastAct = Date.now();                          /* 主动读题=主动活动（重置救援钟） */
  replayAnim(qSpkEl, 'bounce');
  replaySpeech(false);                           /* 3s 节流（节流未播仍是活动——钟已重置） */
});
cardsEl.addEventListener('pointerdown', e => {   /* 候选卡点选（主交互域） */
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  uiTapCard(Number(card.dataset.i));
});
stageEl.addEventListener('pointerdown', e => {   /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟 */
  if (e.target.closest('#qcard') || e.target.closest('#cards') || e.target.closest('button')) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint2.key, VOICE.hint2.text);
  }
});

/* ================= 无操作看护：14s 方向级（重读开题链+情境卡 flash 回锚，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe 位置线索）
   / 教学"帮"5s 重演示；错链豁免窗让路（契约 I）；面板在场守卫（契约 K） ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;      /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默 */
  const idle = Date.now() - lastAct;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    breatheAnswerCard(q);
    speakQuiz();
    lastAct = Date.now();
    rescueCount++;
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+回锚（不动 lastAct） */
    speakQuiz();
    replayAnim(qcardEl, 'flash');
    lastDir = Date.now();
    rescueCount++;
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言，照 b28 m4） */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'idiom', title: '成语填空' });   // 存档键 kidsgame_idiom（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1（§0.4 防跳章） */
    first = Math.max(0, lim - 1);                /* P2-D10 修复：停留最后一关（家族 b14 形态——原 first=0 回 flat0 重看热身） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.IDM = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             locked: state.locked, demo: state.demo,   /* 演出/教学窗位（selftest 等窗用——家族
                                                           spellen SP.currentLevel 同款字段） */
             misses: cur.misses, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q || q.solved) return null;
    return { kind: q.kind,                        /* 'fill' | 'near'（verify 分源复算锚） */
             idx: q.idx,                          /* 答案成语 1 基下标 */
             ctx: idmOf(q.idx).ctx,               /* 情境句（含 ____ 空位——verify 断言映射正确） */
             optionIds: q.options.map(i => idmOf(i).id),   /* 候选成语文本（显示序） */
             optionIdxs: q.options.slice(),       /* 候选成语 idx（显示序——verify 结构复算锚） */
             answer: q.answer,                    /* 正确候选位置 */
             nearPeer: q.kind === 'near' ? idmOf(q.idx).near : 0,   /* near 干扰=指定对端（verify 断言） */
             step: cur.step,                      /* 全关题号 0-7 */
             miss: q._miss || 0,
             hinted: !!q._hinted };
  },
  tapCard(i) { return uiTapCard(i); },
  hear() { return replaySpeech(true); },          /* 测试钩子：无视节流直通重读题面 */
  async autoSolve() {                             // UI 路径自动点完当前关（tapCard(answer)；演出窗内 tap=null → 等窗结束重试）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 400) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const r = await uiTapCard(q.answer);
      if (r === 'right' || r === 'done') taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get rescues() { return rescueCount; },          /* 救援触发计数（自测用） */
  get tutorial() { return state.tut; },
  nextHintOf(flat) { return nextHint(flat == null ? (cur ? cur.flat : 0) : flat); }   /* 家族 F 断言直调 */
};
