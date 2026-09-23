/* ================= errdoc 主逻辑（三步诊：找病灶 → 开药 → 归因）
   开题（presentQuiz）：病历卡入场 800ms 锁（题面恒静态 DOM 文字不 TTS——SPEC §3）→
   开放点选三部位（0=左数/1=运算符/2=答案；b 与 = 纯展示不设部位）。
   步1 中病灶（uiTapPart）：红圈高亮 .lesion+ed_spot 链（ans 型单 clip 窗 2900；
   num/op 型提示链 [ed_spot, ed_s_here, 数/符号段]（T46 化 3 段全 clip）窗 6450 ≥6432）+提示泡（num
   「这里应该是 13」/op「这里应该是 +」——ans 型无提示不泄 fix）→ 药卡行入场（phase
   已 'fix'）。
   步2 选对药（uiTapFix）：痊愈动画（病历卡打勾✓+小兔子康复跳）+确认链
   [ed_right, ed_n_a, ed_op_*, ed_n_b, ed_s_eq, ed_n_fix]（T46 化 6 段全 clip）窗 10200 ≥10146（家族 G/H/N）→ 归因
   行入场（phase 已 'why'）。
   步3 归因（uiTapWhy）：任何选择都接受（非惩罚不计 miss）+对应药方 clip 单发
   （窗 3050 ≥2964）→ 末题步3 完 'done' 通关 / 否则下一题。
   错路径（步1 点正常部位/步2 选错药同链同窗）：错链 [ed_wrong, ed_hint] 豁免窗
   5274=1656+150+3168+300 真时钟（契约 I/I 补：窗内错点吞 false 不计 miss/对选放行/
   窗后二错照计）+吞输入轻叮配 bump（家族 D）+梯度：首错方向级（整卡/药卡行 wiggle
   不指答案）/miss≥2 答案级（病灶部位/正确药卡 breathe）。
   救援（契约 B/K）：14s 方向级=当前相位活动区 wiggle（lastDir 独立节流锚）/
   30s 答案级=病灶部位或正确药卡 breathe；错链豁免窗让路；教学帮 5s 重演示。
   验收钩子：window.ED = { get currentLevel, get quiz{shown{a,op,b,r}, errType, fix,
   phase, step(全关题号 0-4——b33 坑①), miss}, get pills()(fix 阶段返回当前题药卡值
   数组·显示序数值型拷贝；spot/why 阶段/无题返回 null——复验定版 2026-09-12),
   tapPart(i), tapFix(i), tapWhy(i), start(flat), autoSolve() }——真实页同暴露（b29 坑⑥）。
   tapPart 返回：中病灶 'spot'（phase→'fix'）/正常部位 'wrong'/豁免窗内错点吞
   false /演出期·相位不符·越界 null。tapFix：对 'fix'（phase→'why'）/错 'wrong'/
   同上 null·false。tapWhy：恒 'why_done'（末题步3 完 'done'）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat >= 0 && cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), chartEl = $id('chart'), eqEl = $id('eq'),
      eqBEl = $id('eq-b'), bubbleEl = $id('bubble'), patientEl = $id('patient'),
      qTextEl = $id('q-text'), pillsEl = $id('pills'), whyEl = $id('why'),
      rabbitBtn = $id('btn-rabbit'), ghostEl = $id('ghost'), stageEl = $id('stage');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const partBtnAt = i => eqEl.querySelector('.part[data-part="' + i + '"]');
const pillBtnAt = i => pillsEl.querySelector('.pill[data-pill="' + i + '"]');
const whyBtnAt = i => whyEl.querySelector('.why-btn[data-why="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  patientEl.innerHTML = KIDS.assets.rabbit('normal', 84);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：点中病灶=中音双跳 / 判对=双音上行+钱币 /
   答错=低柔单音 / 卡入场=轻叮 */
const chimeSpot = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.14, 0, 0.55); KIDS.audio.note(784, 0.22, 0.08, 0.5); } };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染（渲染即引擎——契约 M 帧内容锚：部位/药卡文本与 quiz 真值同源） ================= */
function renderCard(q) {
  partBtnAt(0).textContent = String(q.shown.a);
  partBtnAt(1).textContent = OP_SHOW[q.shown.op];
  eqBEl.textContent = String(q.shown.b);
  partBtnAt(2).textContent = String(q.shown.r);
  for (let i = 0; i < 3; i++) { const p = partBtnAt(i); p.classList.remove('lesion', 'breathe', 'shake'); }
  chartEl.classList.remove('cured', 'wig');
  bubbleEl.classList.remove('show');
  bubbleEl.textContent = '';
  patientEl.classList.remove('cured');
  patientEl.innerHTML = KIDS.assets.rabbit('normal', 84);
}
function renderPills(q) {                       // 药卡常驻 DOM（off 态只隐不删——布局可量可测）
  pillsEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('button');
    b.className = 'pill';
    b.dataset.pill = i;                         // 帧内容锚（verify 断言渲染即引擎）
    b.textContent = String(q.pills[i]);
    pillsEl.appendChild(b);
  }
  pillsEl.classList.add('off');
  pillsEl.classList.remove('wig');
}
function renderWhy() {                          // 归因三选（0 没看清/1 算错啦/2 点太快——恒过非惩罚）
  whyEl.innerHTML = '';
  const icons = [ICONS.eye, ICONS.calc, ICONS.tap];
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('button');
    b.className = 'why-btn';
    b.dataset.why = i;
    b.innerHTML = icons[i] + '<span>' + RX[i].label + '</span>';
    whyEl.appendChild(b);
  }
  whyEl.classList.add('off');
  whyEl.classList.remove('wig');
}
function setQText(phase) { qTextEl.textContent = PHASE_TEXT[phase] || ''; }
function renderStep() {                         // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                         // 章节点（1 基，生成关循环章画到当前章）
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
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderCard(q);
  renderPills(q);
  renderWhy();
  setQText('spot');
  renderStep();
}

/* ================= 开题演出：卡入场 800ms 锁 → 开放点选
   演出锁=真时钟 showUntil（tapPart 演出期返 null——测试驱动须轮询等可交互） ================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  state.locked = true;
  state.showUntil = Date.now() + PRESENT_MS * SPEED + 140;   // 真时钟演出锁（余量）
  sfx('click');
  await wait(PRESENT_MS * SPEED);
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                          /* 演出完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
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
/* 教学"帮"阶段指向（按相位）：spot=病灶部位 / fix=正确药卡 / why=归因首键
   （教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.phase === 'spot') { const i = lesionOf(q); pointGhostAt(partBtnAt(i)); }
  else if (q.phase === 'fix') pointGhostAt(pillBtnAt(pillIndexOf(q)));
  else pointGhostAt(whyBtnAt(0));
}

/* ================= 吞输入轻叮（家族 D：必配可见回应——诊所场景 bump 微动效） ================= */
function denyBump() { sfx('pop'); replayAnim(sceneEl, 'bump'); }

/* ================= 步1 找病灶（真实点击 / ED.tapPart / autoSolve / 教学演示共用）
   豁免窗 guard（I 补）在判定前拦，预判口径 i !== lesionOf(q) 与 core 判定严格同构（b34 坑①） ================= */
async function uiTapPart(i, demo) {
  if (!cur || state.won) { denyBump(); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) { denyBump(); return null; }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i > 2) { denyBump(); return null; }   // 越界
  if (q.phase !== 'spot') { denyBump(); return null; }                       // 相位门（步1 已过）
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     对选放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== lesionOf(q)) {
    denyBump(); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapPart(cur, i);
  if (r === null) { denyBump(); return null; }
  const el = partBtnAt(i);

  if (r === 'wrong') {                           /* 点了正常部位：摇头+错链+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + WROLL_MS * SPEED + 140;
    dodgeLo();
    if (el) replayAnim(el, 'shake');
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))            /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;      /* 链豁免：1656+150+3168+300=5274 真时钟（契约 I） */
    if (q._miss === 1) replayAnim(chartEl, 'wig');          /* 方向级：整卡 wiggle 不指病灶 */
    if (q._miss >= 2) {                                   /* miss≥2=病灶部位 breathe（答案级梯度） */
      const le = partBtnAt(lesionOf(q));
      if (le) replayAnim(le, 'breathe');
    }
    await wait(WROLL_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- spot（点中病灶：红圈+链+提示泡 → 药卡入场，phase 已 'fix'） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  state.locked = true;
  const win = q.errType === 'ans' ? SPOT_WIN_ANS : SPOT_WIN_HINT;
  state.showUntil = Date.now() + win * SPEED + 140;
  const le = partBtnAt(lesionOf(q));
  if (le) le.classList.add('lesion');            // 病灶红圈高亮（契约 M 帧内容锚）
  chimeSpot();
  if (q.errType === 'ans') {
    KIDS.voice.queue([VOICE.spot.key]);          // ans 型单 clip（不泄 fix，孩子自己算）
  } else {
    bubbleEl.textContent = hintShow(q);          // 提示泡：这里应该是 13 / 这里应该是 +
    bubbleEl.classList.add('show');
    KIDS.voice.queue([VOICE.spot.key].concat(hintParts(q)));   // T46 化：spot+here+数/符号段 3 段全 clip——零 keyless
  }
  pillsEl.classList.remove('off');               // 药卡提前入场（窗内可见，锁内不可点）
  setQText('fix');
  await wait(win * SPEED);                       // 等 spot 链播完（家族 G/H/T）
  if (cur !== run || token !== showRun) return r;
  state.locked = false;
  lastAct = Date.now();
  if (state.tut === 'help') setTimeout(pointHelpNext, 400 * SPEED);   // 帮：转指正确药卡
  return r;                                      // 'spot'
}

/* ================= 步2 开药（3 张药卡选 1；豁免窗 guard 同构预判 q.pills[i] !== q.fix） ================= */
async function uiTapFix(i, demo) {
  if (!cur || state.won) { denyBump(); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) { denyBump(); return null; }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= 3) { denyBump(); return null; }
  if (q.phase !== 'fix') { denyBump(); return null; }                        // 相位门（步2 未开/已过）
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && q.pills[i] !== q.fix) {
    denyBump(); return false;                                                // I 补：窗内错药吞
  }
  const run = cur, token = showRun;
  const r = engTapFix(cur, i);
  if (r === null) { denyBump(); return null; }
  const el = pillBtnAt(i);

  if (r === 'wrong') {                           /* 选错药：药卡摇头+错链+视觉梯度（步1/步2 同链同窗） */
    state.locked = true;
    state.showUntil = Date.now() + WROLL_MS * SPEED + 140;
    dodgeLo();
    if (el) replayAnim(el, 'shake');
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;      /* 5274 真时钟（契约 I：spot/fix 同链同窗） */
    if (q._miss === 1) replayAnim(pillsEl, 'wig');          /* 方向级：药卡行整体 wiggle */
    if (q._miss >= 2) {                                   /* miss≥2=正确药卡 breathe（答案级梯度） */
      const ok = pillBtnAt(pillIndexOf(q));
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(WROLL_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- fix（选对药：痊愈动画=病历卡打勾✓+小兔子康复跳 + 确认链 → 归因入场，phase 已 'why'） ---- */
  lastAct = Date.now();
  state.locked = true;
  state.showUntil = Date.now() + CONFIRM_WIN * SPEED + 140;
  if (el) { el.classList.remove('breathe'); el.classList.add('ok'); }
  pillsEl.querySelectorAll('.pill').forEach((p, k) => { if (k !== i) p.classList.add('dim'); });
  chartEl.classList.add('cured');                // 病历卡打勾（契约 M 帧内容锚）
  patientEl.innerHTML = KIDS.assets.rabbit('happy', 84);
  replayAnim(patientEl, 'cured');                // 小兔子康复跳
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key].concat(eqParts(q)));   // T46 化：治好啦+全式 5 段（共 6 段）全 clip——零 keyless
  whyEl.classList.remove('off');                 // 归因三选提前入场（窗内可见，锁内不可点）
  setQText('why');
  await wait(CONFIRM_WIN * SPEED);               // 等确认链播完：2232+750+段链 worst 7492+300=10146 ≤ 10200（T46 clip，家族 G/H）
  if (cur !== run || token !== showRun) return r;
  state.locked = false;
  lastAct = Date.now();
  if (state.tut === 'help') setTimeout(pointHelpNext, 400 * SPEED);   // 帮：转指归因键
  return r;                                      // 'fix'
}

/* ================= 步3 归因（轻环节不计 miss 非惩罚：任何选择都过+药方 clip） ================= */
async function uiTapWhy(i, demo) {
  if (!cur || state.won) { denyBump(); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) { denyBump(); return null; }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i > 2) { denyBump(); return null; }
  if (q.phase !== 'why') { denyBump(); return null; }                        // 相位门（步3 未开）
  const run = cur, token = showRun;
  const r = engTapWhy(cur, i);                   // 恒过（末题 'done' / 否则 'why_done'）
  if (r === null) { denyBump(); return null; }
  state.locked = true;
  state.showUntil = Date.now() + RX_WIN * SPEED + 140;
  const el = whyBtnAt(i);
  if (el) { el.classList.remove('breathe'); el.classList.add('pick'); }
  KIDS.voice.play(RX[i].key, RX[i].text);        // 药方单发：ed_rx_careful/calc/slow（窗 2964）
  sfx('ok');
  if (r === 'done' && cur.flat < 0 && state.tut === 'help') {
    state.tut = 'solo';                          /* 教学"独"：整题三步走完 → 放手 */
    window.__edTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  await wait(RX_WIN * SPEED);
  if (cur !== run || token !== showRun) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：watch 演示由 tutorialWatch 接管；
                                                     turn 帮→独后进正式关 */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                 /* 下一题开题 */
  return r;                                      // 'why_done'
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_errdoc） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
}
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
  showRun++;                                     /* 通关中止在途演出 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* ed_right：治好啦，真棒（2232ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2232+300=2532 */
    const pr = persistWin(stars);
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
  showRun++;                                     /* 中止在途演出（重玩/换关） */
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;       /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.errdoc && sv.errdoc.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §3）
   watch=播 ed_tut_watch「看！小医生看病啦」→ 13-5=9 完整三步演示（幽灵手指点答案病灶 9
   → 选药 8 → 归因选一条）→ __edDemoR='done'（gate G2 期望）；turn=重立 7+6=12 迷你关
   「你来看一看」（步 1 起帮：ghost 按相位指病灶/正确药卡/归因键）→ 整题走完帮→独进正式关。
   时序（家族 G/H/T）：watch clip 3216 → 延 3516（≥3216+300）→ 卡入场 800 →
   ghost 移 800+press 320 → demo 三步（spot 2900 / confirm 6100 / rx 3050 窗）→
   turn clip 1680 → 延 1980（≥1680+300）→ presentQuiz 800 → 开放真点
   —— watch 段名义分账 3516+800+1120+2900+1120+6100+1120+3050=19726 ≤ 22000（三步诊
   演示天然长于单步款，预算按款定档并注释）。 ---------- */
function tutWatchLevel() {                       // 演示题：13-5=9（SPEC §1 watch 例）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mkQuiz({ t: 'ans', a: 13, op: '-', b: 5, r: 9, fix: 8 })] };
}
function tutTurnLevel() {                        // 帮→独题：7+6=12（SPEC §1 turn 例；唯一题走完 'done'）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mkQuiz({ t: 'ans', a: 7, op: '+', b: 6, r: 12, fix: 13 })] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤22000 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* ed_tut_watch：看！小医生看病啦（3216ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥3216+300=3516：clip 播完再开题（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* 病历卡 13-5=9 入场（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  /* 步1 找病灶：幽灵手指点答案部位（病灶=2，ans 型） */
  pointGhostAt(partBtnAt(lesionOf(q)));
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r1 = await uiTapPart(lesionOf(q), true);     /* demo 通道豁免演出锁 → 'spot'（ans 型单 clip 窗） */
  if (state.tut !== 'watch') return;
  /* 步2 开药：指向正确药卡 8 → 选对（痊愈+确认链窗 6100） */
  pointGhostAt(pillBtnAt(pillIndexOf(q)));
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r2 = await uiTapFix(pillIndexOf(q), true);   /* → 'fix' */
  if (state.tut !== 'watch') return;
  /* 步3 归因：指向「没看清」→ 任选过（rx 窗 3050）→ 唯一题走完 'done' */
  pointGhostAt(whyBtnAt(0));
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r3 = await uiTapWhy(0, true);                /* → 'done'（gate G2 期望） */
  window.__edDemoR = r3;                             /* 演示生效证据（§0.27，gate 断言 'done'——终值语义） */
  window.__edWatchMs = Date.now() - t0w;             /* watch 段实测时长（verify 单元② 预算 ≤22000） */
  const sv = KIDS._save() || {};
  sv.errdoc = sv.errdoc || {};
  sv.errdoc.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 7+6=12 迷你关「你来看一看」（步 1 起帮→整题走完独），走完进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 done 后无余窗） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* ed_tut_turn：你来看一看（1680ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1680+300=1980 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 病历卡 7+6=12 入场 → 开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再检查检查，哪里不对劲 */
});
eqEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.part');
  if (!p) return;                                // b 与 = 非部位，走 stage 空白路径
  e.preventDefault();
  uiTapPart(Number(p.dataset.part));
});
pillsEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.pill');
  if (!p) return;
  e.preventDefault();
  uiTapFix(Number(p.dataset.pill));
});
whyEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.why-btn');
  if (!p) return;
  e.preventDefault();
  uiTapWhy(Number(p.dataset.why));
});
stageEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.part,.pill,.why-btn,#btn-rabbit')) return;   // 各行点击已由容器处理
  /* 空白/探索点击（含卡面 b 与 = 部位）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护（契约 B 双锚/K 面板守卫）：
   14s 方向级=当前相位活动区整体 wiggle（不指答案，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级=病灶部位或正确药卡 breathe
   （why 相位三键任选皆可，呼吸首键）/ 教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    if (q.phase === 'spot') { const le = partBtnAt(lesionOf(q)); if (le) replayAnim(le, 'breathe'); }
    else if (q.phase === 'fix') { const pe = pillBtnAt(pillIndexOf(q)); if (pe) replayAnim(pe, 'breathe'); }
    else { const we = whyBtnAt(0); if (we) replayAnim(we, 'breathe'); }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：活动区 wiggle（不动 lastAct） */
    if (q.phase === 'spot') replayAnim(chartEl, 'wig');
    else if (q.phase === 'fix') replayAnim(pillsEl, 'wig');
    else replayAnim(whyEl, 'wig');
    lastDir = Date.now();
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
  KIDS.init({ game: 'errdoc', title: '错题小医生' });   // 存档键 kidsgame_errdoc（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  firstFlat = first;
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.ED——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（shown 四元/errType/fix/phase 真值——verify 从 SPEC 表
   与构造公式独立复算 fix=对账锚）；step=全关题号 0-4（b33 坑①：题号语义）。
   tapPart：中病灶 'spot'（phase→'fix'）/正常部位 'wrong'/豁免窗内错点吞 false/
   演出期·相位不符·越界 null；tapFix：对 'fix'（phase→'why'）/错 'wrong'/同上；
   tapWhy：恒 'why_done'（末题步3 完 'done'）================= */
window.ED = {
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
    return { shown: { a: q.shown.a, op: q.shown.op, b: q.shown.b, r: q.shown.r },
             errType: q.errType,                             /* 'ans'|'num'|'op' */
             fix: q.fix,                                     /* 正确答案值（verify 独立复算对账） */
             phase: q.phase,                                 /* 'spot'|'fix'|'why' 三步诊相位 */
             step: cur.step,                                 /* 全关题号 0-4（b33 坑①） */
             miss: q._miss || 0 };
  },
  get pills() {                                    /* 复验定版（2026-09-12）：fix 阶段返回
                                                      当前题药卡值数组（显示序·数值型·拷贝）；
                                                      spot/why 阶段/无题返回 null */
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q || q.phase !== 'fix') return null;
    return q.pills.slice();
  },
  tapPart(i) { return uiTapPart(i); },
  tapFix(i) { return uiTapFix(i); },
  tapWhy(i) { return uiTapWhy(i); },
  async autoSolve() {            // UI 路径自动走完当前关（逐题三步真实判定链；
    let taps = 0, guard = 0;     // 演出窗/相位门 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 400) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      let r = null;
      if (q.phase === 'spot') r = await uiTapPart(lesionOf(q));
      else if (q.phase === 'fix') r = await uiTapFix(pillIndexOf(q));
      else r = await uiTapWhy(0);
      if (r === 'spot' || r === 'fix' || r === 'why_done' || r === 'done') taps++;
      else if (guard >= 398) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
