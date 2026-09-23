/* ================= mirrormaze 主逻辑（题面渲染 / 点格补全 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH17 §6 r14 轴向族）：每题=方盘网格+源侧色格+按 kind 渲染的对称轴
   （v 竖直/h 水平/d1 主对角/d2 反对角/pv·ph 6×6 周期双向/vv 平行双镜/r180 垂直双镜）。
   点空格补全镜像：点对（=某源格的镜像位）→该格点亮成同色；点非镜像位→格子闪一下
   不点亮可重点（低挫败零惩罚；1000ms 防重入窗内吞点=miss 只记一次 §0.26-b16 M1）；
   全部镜像位补齐→对称轴闪+mm_right+下一题。错点反馈轻（闪+微音），不长晃动。
   语音轴向分流（r14）：v 轴沿用旧键（hint/wrong 说"左边"——flat0-q0 恒 v 教学兼容）；
   非 v 轴走 mm_hint2/mm_wrong2（"镜子那一边"）；tip 文案按轴切换（非 clip）。
   救援钟口径（§0.7a）：点格子（无论对错）=作答不重置；补齐推进=唯一重置；空白/兔子/提示不重置。
   教学看-帮-独：watch=演示看源格→手指移到镜像位→逐格点满（返回值存 window.__mmDemoR
   §0.27，watch ≤16s）→立即重发同关（确定性关卡，题面一致），"你来拼一拼"交接 →
   帮=幽灵手指指向下一个未补镜像位；独=首次补齐放手。
   验收钩子：window.MM = { get currentLevel, get quiz{W,H,kind,axis,given,targets,step,miss},
   tapCell(x,y), autoSolve(), start(flat), get tutorial, get rescues } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/教学/反馈不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次——不灰化款 miss 无上限，
   必须 === 2（豁免只在每题 miss 首达 2 时发一次） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) {
    lastWrongVoice = now;
    KIDS.voice.play(key, text);
  }
};

const stageEl = $id('stage'), boardEl = $id('board'), gridEl = $id('grid'), axisEl = $id('axis'),
      answersEl = $id('answers'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;                            // 救援触发计数（MM.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellBtn = (x, y) => gridEl.querySelector('.cell[data-x="' + x + '"][data-y="' + y + '"]');
const hintBtnEl = () => answersEl.querySelector('#hint-btn');
const curQuiz = () => (cur && !cur.done) ? cur.quizzes[cur.step] : null;
/* 轴向语音分流（r14 §6）：v 轴=旧键（左/右语义）；其余 kind（含 pv 竖轴双向）=hint2/wrong2 */
const hintKeyOf = q => (!q || q.kind === 'v') ? VOICE.hint : VOICE.hint2;
const wrongKeyOf = q => (!q || q.kind === 'v') ? VOICE.wrong : VOICE.wrong2;
/* tip 文案按轴切换（非 clip；pv/ph 双向=先判哪侧是源） */
const TIP_OF = {
  v: '看看左边，拼右边', h: '看看上边，拼下边', d1: '斜镜子照一照', d2: '斜镜子照一照',
  pv: '先找镜子在哪边', ph: '先找镜子在哪边', vv: '两面镜子一起照', r180: '转半圈拼一拼'
};

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：点对点亮=双音上扬 / 错点=低柔单音（轻反馈不惩罚） */
const fillHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const tapLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
/* 棋盘：W×H 格（given 源格=实色卡：role src 必产 target / role axis 自映干扰格） */
function renderGrid(q) {
  boardEl.className = 'g' + q.W;
  gridEl.innerHTML = '';
  gridEl.style.gridTemplateColumns = 'repeat(' + q.W + ', var(--cs))';
  const givenMap = {};
  q.given.forEach(c => { givenMap[c.x + ',' + c.y] = c; });
  for (let y = 0; y < q.H; y++) {
    for (let x = 0; x < q.W; x++) {
      const b = document.createElement('button');
      b.className = 'cell';
      b.dataset.x = x;
      b.dataset.y = y;
      const c = givenMap[x + ',' + y];
      if (c) {                                    // 已给色格（源侧 src / 轴上自映 axis——均不可点亮）
        b.classList.add('lit', 'given');
        b.style.background = c.c;
        b.dataset.c = c.c;
        b.dataset.role = c.role;
        b.setAttribute('aria-label', '图案格');
      } else {
        b.setAttribute('aria-label', '空格');
      }
      gridEl.appendChild(b);
    }
  }
  axisEl.classList.remove('flash');
}
/* 对称轴（r14 轴向族）：#axis 容器内 .axl generic 线段，按 kind 实算几何——
   量测用 offsetWidth/computed gap（transform 无关：board-in 缩放动画不污染几何）。
   反射轴 K 的像素位=(K*step+cs)/2（K=反射常数：v/h=p/W-1、pv=5、vv=k1/k2；
   偶 K=列间缝中点、奇 K=中列格心——代数恒等式，两种盘宽统一） */
function renderAxis(q) {
  axisEl.innerHTML = '';
  const first = gridEl.children[0];
  if (!first) return;
  const cs = first.offsetWidth;
  const gap = parseFloat(getComputedStyle(gridEl).columnGap) || 8;
  const step = cs + gap;
  const gx = gridEl.offsetLeft, gy = gridEl.offsetTop;
  const cx = x => gx + x * step + cs / 2;          // 第 x 列格心
  const cy = y => gy + y * step + cs / 2;          // 第 y 行格心
  const ax = K => gx + (K * step + cs) / 2;        // 竖直反射轴 K 像素位
  const ay = L => gy + (L * step + cs) / 2;        // 水平反射轴 L 像素位
  const bot = () => gy + q.H * step - gap;         // 网格底缘
  const right = () => gx + q.W * step - gap;       // 网格右缘
  const ex = cs * 0.22;                            // 线段两端出界延伸
  const line = (x1, y1, x2, y2) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    const d = document.createElement('div');
    d.className = 'axl';
    d.style.left = x1 + 'px';
    d.style.top = y1 + 'px';
    d.style.width = len.toFixed(1) + 'px';
    d.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
    axisEl.appendChild(d);
  };
  switch (q.kind) {
    case 'v':  line(ax(3), gy - ex, ax(3), bot() + ex); break;
    case 'h':  line(gx - ex, ay(3), right() + ex, ay(3)); break;
    case 'd1': line(cx(0) - ex * .7, cy(0) - ex * .7, cx(4) + ex * .7, cy(4) + ex * .7); break;
    case 'd2': line(cx(4) + ex * .7, cy(0) - ex * .7, cx(0) - ex * .7, cy(4) + ex * .7); break;
    case 'pv': line(ax(5), gy - ex, ax(5), bot() + ex); break;
    case 'ph': line(gx - ex, ay(5), right() + ex, ay(5)); break;
    case 'vv':                                       /* 平行双镜：先照 k1 再照 k2（两竖线） */
      line(ax(q.axis.k1), gy - ex, ax(q.axis.k1), bot() + ex);
      line(ax(q.axis.k2), gy - ex, ax(q.axis.k2), bot() + ex);
      break;
    case 'r180':                                     /* 垂直双镜=转半圈（十字轴） */
      line(ax(5), gy - ex, ax(5), bot() + ex);
      line(gx - ex, ay(5), right() + ex, ay(5));
      break;
  }
}
/* 作答区：「提示」主按钮（≥96，首个未补镜像位 breathe+对应源格 pulse，不自动点亮） */
function renderAnswers(q) {
  answersEl.innerHTML = '';
  const tip = document.createElement('div');
  tip.id = 'tip';
  tip.innerHTML = ICONS.mirror + '<span>' + (TIP_OF[q.kind] || TIP_OF.v) + '</span>';
  const b = document.createElement('button');
  b.id = 'hint-btn';
  b.setAttribute('aria-label', '提示，' + hintKeyOf(q).text);
  b.innerHTML = ICONS.bulb + '<span>提示</span>';
  answersEl.appendChild(tip);
  answersEl.appendChild(b);
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
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）按当前题轴向分流，queue 单通道 */
function openingSpeak(turn) {
  if (!cur) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : hintKeyOf(curQuiz()).key]);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderGrid(q);
  renderAxis(q);
  renderAnswers(q);
  renderStep();
}
/* 补对点亮：实色卡+入场弹跳 */
function lightCell(x, y, c) {
  const b = cellBtn(x, y);
  if (!b) return;
  b.classList.remove('blink');
  b.classList.add('lit');
  b.style.background = c;
  b.dataset.c = c;
  b.setAttribute('aria-label', '已点亮');
  b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';   // 重触发 cell-in
}
/* 错点闪：格子闪一下不点亮（可重点；460ms 后自清，renderQuiz 兜底全清） */
function flashCell(x, y) {
  const b = cellBtn(x, y);
  if (!b) return;
  b.classList.remove('blink'); void b.offsetWidth; b.classList.add('blink');
  setTimeout(() => { if (b.isConnected) b.classList.remove('blink'); }, 460);
}
function axisFlash() {                           // 补齐=对称轴全线段闪亮（SPEC §6）
  axisEl.classList.remove('flash'); void axisEl.offsetWidth; axisEl.classList.add('flash');
}

/* ================= 补全主路径（真实点击 / MM 钩子 / autoSolve / 教学演示共用） ================= */
async function uiTapCell(x, y, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engTapCell(cur, x, y);
  if (r === null) {                              // 已点亮格/越界：轻叮不计 miss
    if (!demo) sfx('pop');
    return false;
  }
  if (r === 'wrong') {                           // 点非镜像位：闪一下不点亮，零惩罚可重点
    flashCell(x, y);
    sfx('fail');
    const wk = wrongKeyOf(q);                    /* 轴向分流：v=mm_wrong / 非 v=mm_wrong2 */
    sayW(wk.key, wk.text, q.miss === 2);         /* 三态（§0.5） */
    if (q.miss >= 2) applyRescueVisual(q);       /* 首错不提示：连错 2 次给视觉线索（§0.7） */
    if (state.tut === 'help') pointHelpNext();
    state.locked = true;                         /* 错点防重入窗 1000ms：连击不重复记 miss（b16 P2-1 M1） */
    await wait(1000 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }
  lightCell(x, y, cellColor(q, x, y));           // 点对：点亮成同色
  fillHi();
  if (state.tut === 'help' && r === 'placed') pointHelpNext();   // "帮"：跟着节奏指向下一格
  if (r === 'right' || r === 'done') {           // 补齐：对称轴闪+图案完整→推进
    lastAct = Date.now();                        // 仅补齐推进重置救援钟（§0.7a）
    if (state.tut === 'help') {                  // 教学"独"：首次补齐放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    clearRescueVisual();
    axisFlash();
    sayR(VOICE.right.key, VOICE.right.text);     // 补齐反馈句=中文 clip（§0.24）
    sfx('ok');
    await wait(2000 * SPEED);                    // 等 mm_right clip（≈2.5s）主体播完
    if (cur !== run) return r;
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
    return r;
  }
  return r;                                      // 'placed'
}
/* 该 target 的应亮颜色（同源格色；引擎真值） */
function cellColor(q, x, y) {
  for (const t of q.targets) if (t.x === x && t.y === y) return t.c;
  return '#F6ECD9';
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(f) {
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关（flat≥20 dch 随机）实算下一关难度章取 GEN 文案
     （家族 F 契约，r13 三犯后定版：禁章序取模推进形态——build.py 双断言） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A（b25 形态定版，r14 审查 m-6 对齐 dc）：winFlow 重玩旧关后 dayEnd 预告按进度关非 lim-1 */
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.mirrormaze && sv.mirrormaze.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音链（§0.5） */
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
  /* 指新目标前清旧 breathe/pulse（numberdet P1-3：逐位引导不清除会叠亮失效） */
  gridEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 同源策略）：下一个未补镜像位 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (!t) return;
  const tg = q.targets[t.i];
  pointGhostAt(cellBtn(tg.x, tg.y));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.mirrormaze.tutSeen）
   看=演示看源格→手指移到镜像位→逐格点满（首格完整手指演示，其余原地快放控时长，
   watch ≤16s）→末格走真实补齐路径完整演出（返回值存 window.__mmDemoR §0.27）
   →立即重发同关（确定性关卡，题面一致），"你来拼一拼"交接 →帮=指向下一格；独=放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                      /* flat0-q0 恒 v 轴（引擎保证——「看左」演示兼容） */
  const firstSrc = q.given.filter(c => c.role === 'src')[0];   // 看：手指先指源侧图案格
  const lEl = cellBtn(firstSrc.x, firstSrc.y);
  if (lEl) { pointGhostAt(lEl); }
  await wait(900 * SPEED);
  let demoR = null;
  for (let k = 0; k < q.targets.length; k++) {   // 拼镜像位
    const t = q.targets[k];
    const el = cellBtn(t.x, t.y);
    if (k === 0) {                               // 首格：手指移动+按压+点亮（镜像位语义看清）
      pointGhostAt(el);
      await wait(750 * SPEED);
      ghost.press();
      await wait(260 * SPEED);
      demoR = await uiTapCell(t.x, t.y, true);
      await wait(520 * SPEED);
    } else if (k === 1) {                        // 第二格也慢放（b17 试玩 P3-3：镜像关系要两格才看透）
      pointGhostAt(el);
      await wait(420 * SPEED);
      ghost.press();
      await wait(200 * SPEED);
      demoR = await uiTapCell(t.x, t.y, true);
      await wait(420 * SPEED);
    } else {                                     // 其余：手指原地快放（时长控制）
      if (el) ghost.press();
      await wait(140 * SPEED);
      demoR = await uiTapCell(t.x, t.y, true);
      await wait(330 * SPEED);
    }
  }
  window.__mmDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.mirrormaze = sv.mirrormaze || {};
    sv.mirrormaze.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip（§0.6 单通道）
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈（§0.16） */
    sfx('pop');
    return;
  }
  const hk = hintKeyOf(curQuiz());
  sayP(hk.key, hk.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.cell');
  if (c) {                                       // 格子：补全主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');     /* §0.22 吞输入期轻叮 */
    uiTapCell(Number(c.dataset.x), Number(c.dataset.y));
    return;
  }
  if (e.target.closest('#hint-btn')) {           // 提示：未补镜像位 breathe+源格 pulse（不自动点亮）
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) { sfx('pop'); return; }
    doHint();
    return;
  }
  if (e.target.closest('button, #board')) return;   // 其余按钮/板区非格目标：不触发空白提示
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    const hk = hintKeyOf(curQuiz());
    sayR(hk.key, hk.text);
  }
});
/* 提示动作：hint/hint2（按轴）句 + 首个未补镜像位 breathe + 对应源格 pulse 三连
   （救援视觉同源，不自动点亮） */
function doHint() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const t = rescueTarget(q);
  lastAct = Date.now();                      /* 提示=主动学习动作重置救援钟（审查 m7 家族口径） */
  const hk = hintKeyOf(q);
  sayR(hk.key, hk.text);
  if (!t) return true;
  applyRescuePair(q, t.i);
  return true;
}

/* ================= 救援视觉（§0.21/§6）：一个未补镜像位 breathe+对应源格 pulse
   （r14：源格坐标直取 target.sx/sy——六 kind 通用，禁按 W 反推 x） ================= */
function applyRescuePair(q, i) {
  const t = q.targets[i];
  const b = cellBtn(t.x, t.y);
  if (b) { b.classList.remove('breathe'); void b.offsetWidth; b.classList.add('breathe'); }
  const s = cellBtn(t.sx, t.sy);                  // 对应源格（引擎真值 sx/sy）
  if (s) { s.classList.remove('pulse'); void s.offsetWidth; s.classList.add('pulse'); }
}
function clearRescueVisual() {
  gridEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
}
function applyRescueVisual(q) {
  const t = rescueTarget(q);
  if (!t) return;
  applyRescuePair(q, t.i);
}

/* ================= 无操作看护：14s 救援（hint/hint2 按轴+未补位 breathe+源格 pulse §0.21）/
   教学"帮"5s 重演示一次。救援钟只被补齐推进重置（§0.7a：点格（对错均）/空白/兔子/提示不重置）。
   面板守卫（契约 K，r13 grid/poemfill 双犯）：日末/章末/休息/庆祝/家长面板在场时不抢播不指格 */
setInterval(() => {
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const hk = hintKeyOf(q);                     // 救援=提示句重播（按轴分流）+视觉对
    sayR(hk.key, hk.text);
    applyRescueVisual(q);
    rescueCount++;
    lastAct = Date.now();
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
  KIDS.init({ game: 'mirrormaze', title: '镜像迷宫' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.MM = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind, W: q.W, H: q.H,                 /* SPEC §6 钩子契约（六 kind+轴参数） */
      axis: q.kind === 'vv'
        ? { kind: q.kind, a: q.axis.k1, b: q.axis.k2 }     /* vv 带 K1=a,K2=b（SPEC 口径） */
        : { kind: q.kind },
      given: q.given.map(c => ({ x: c.x, y: c.y, c: c.c, role: c.role })),
      targets: q.targets.map(c => ({ x: c.x, y: c.y, c: c.c, sx: c.sx, sy: c.sy })),
      step: filledOf(q), miss: q.miss };                   /* step=已补进度（SPEC 口径） */
  },
  tapCell(x, y) { return uiTapCell(x, y); },
  modeled(flat) { return levelDurMs(genLevel(flat | 0)); },   /* 时长模型副本（SPEC §6 钩子契约；r14 试玩 P3-1 补导出——AR 同款） */
  start(flat) {                                   /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                             /* 引擎真值直驱 UI 路径：逐格点对镜像位 */
    let n = 0, quizzes = 0, ok = true;
    while (cur && !cur.done && n++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const plan = q.targets.map(t => ({ x: t.x, y: t.y }));
      for (const t of plan) {
        await uiTapCell(t.x, t.y);
      }
      quizzes++;
      if (!q.solved) { ok = false; break; }      // 断言补齐恰=全部镜像位
    }
    return { done: !!(cur && cur.done), quizzes: quizzes, ok: ok };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
