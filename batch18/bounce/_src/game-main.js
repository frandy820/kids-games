/* ================= bounce 主逻辑（台面渲染 / 点方向卡放飞 / 逐段飞行 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH18 §3）：每题=弹球台 SVG+球起点+2-3 张方向卡+墙+洞 2-3 个（1 正确）。
   点方向卡→球沿格点直线飞行，遇墙反弹（动画逐段，轨迹留痕）→入正确洞=bc_right+下一题；
   入错洞/步数上限（8 段反弹）=零惩罚可重点（miss 照计=星级口径）。
   §0.7a 救援钟口径：点方向卡（无论对错）=作答不重置；入正确洞推进=唯一重置；
   空白/兔子不重置。错点防重入窗：飞行期+错后 1000ms 连点只记一次 miss（b16/b17 定案）。
   教学看-帮-独：watch=演示看球弹一段（首段飞行+墙闪）→指正确方向卡→点对入洞
   （返回值存 window.__bcDemoR §0.27，watch ≤16s）→重发同关，"你猜它进哪个洞"交接
   →帮=幽灵手指指正确卡；独=首次答对放手。
   验收钩子：window.BC = { get currentLevel, get quiz(){W,H,ball,holes,walls,dirs,answer,
   phase,step,miss}, tapDir(i), start(flat), async autoSolve(), get tutorial, get rescues }
   轨迹导出：window.__bcTrace = {dir, pts, outcome, holeIdx, bounces}（每次放飞即写全量） */
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

const stageEl = $id('stage'), boardEl = $id('board'), fieldEl = $id('field'),
      answersEl = $id('answers'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');

/* 台面几何：格点阵 7×6（6×5 格当量），U=格距 px，PAD=面板内边距 */
const U = 68, PAD = 24;
const px = v => PAD + v * U;

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, phase: 'aim' };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;                            // 救援触发计数（BC.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => answersEl.querySelector('.dcard[data-i="' + i + '"]');
const ballEl = () => fieldEl.querySelector('#ball');
const dirAngle = d => Math.atan2(d[1], d[0]) * 180 / Math.PI;

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：放飞=短嗒 / 弹墙=马林巴轻音 / 入对洞=双音上扬 */
const tickSfx = () => { if (!VERIFY) KIDS.audio.note(740, 0.07, 0, 0.3); };

/* ================= 渲染 ================= */
/* 台面 SVG：边界墙矩形+格点阵+内部墙线+洞+起点环+轨迹+救援线+球（全部按格点整数坐标对齐） */
function renderField(q) {
  const s = [];
  s.push('<rect class="bounds" x="' + PAD + '" y="' + PAD + '" width="' + (q.W * U) +
    '" height="' + (q.H * U) + '" rx="12"/>');
  for (let y = 0; y <= q.H; y++)
    for (let x = 0; x <= q.W; x++)
      s.push('<circle class="dot" cx="' + px(x) + '" cy="' + px(y) + '" r="2.6"/>');
  q.walls.forEach(function (w, i) {
    s.push('<line class="wall" data-wi="' + i + '" data-x1="' + w.x1 + '" data-y1="' + w.y1 +
      '" data-x2="' + w.x2 + '" data-y2="' + w.y2 + '" x1="' + px(w.x1) + '" y1="' + px(w.y1) +
      '" x2="' + px(w.x2) + '" y2="' + px(w.y2) + '"/>');
  });
  q.holes.forEach(function (h) {
    s.push('<g class="hole" data-x="' + h.x + '" data-y="' + h.y + '" transform="translate(' +
      px(h.x) + ',' + px(h.y) + ')"><circle class="pit" r="13.5"/><circle class="dark" r="7"/>' +
      '<circle class="ring" r="13.5"/></g>');
  });
  s.push('<circle class="start" cx="' + px(q.ball.x) + '" cy="' + px(q.ball.y) + '" r="15"/>');
  s.push('<polyline id="trail" points=""/>');
  s.push('<line id="rescue-line" x1="0" y1="0" x2="0" y2="0"/>');
  s.push('<g id="ball"><circle class="body" r="11.5"/><circle class="shine" cx="-3.5" cy="-3.5" r="3"/></g>');
  fieldEl.innerHTML = s.join('');
  setBall(q.ball.x, q.ball.y);
}
/* 作答区：提示句 + 方向卡（≥64 实做 ≥96；箭头按 8 方向旋转+文字标签） */
function renderCards(q) {
  answersEl.innerHTML = '';
  const tip = document.createElement('div');
  tip.id = 'tip';
  tip.innerHTML = ICONS.ball + '<span>小球弹一弹，点方向卡进洞</span>';
  const row = document.createElement('div');
  row.id = 'cards';
  q.dirs.forEach(function (d, i) {
    const b = document.createElement('button');
    b.className = 'dcard';
    b.dataset.i = i;
    b.setAttribute('aria-label', '方向卡：往' + DIR_LABEL[d[0] + ',' + d[1]]);
    b.innerHTML = '<span class="a-ico" style="transform:rotate(' + dirAngle(d) + 'deg)">' +
      ICONS.arrow + '</span><span class="nm">' + DIR_LABEL[d[0] + ',' + d[1]] + '</span>';
    row.appendChild(b);
  });
  answersEl.appendChild(tip);
  answersEl.appendChild(row);
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
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip），queue 单通道顺序播（无词 clip） */
function openingSpeak(turn) {
  if (!cur) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key]);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderField(q);
  renderCards(q);
  renderStep();
}

/* ================= 球动画（逐格点飞行；verify 提速但轨迹数据全量导出） ================= */
function setBall(x, y) {
  const b = ballEl();
  if (b) b.style.transform = 'translate(' + px(x) + 'px,' + px(y) + 'px)';
}
function addTrail(x, y) {
  const t = fieldEl.querySelector('#trail');
  if (!t) return;
  t.setAttribute('points', (t.getAttribute('points') || '') + ' ' + px(x) + ',' + px(y));
}
function clearTrail() {
  const t = fieldEl.querySelector('#trail');
  if (t) t.setAttribute('points', '');
}
/* 弹点反馈：命中的内墙 glow / 边界闪亮（SVG 元素重触发动画用 getBoundingClientRect 促排） */
function glowAt(q, x, y) {
  let wi = -1;
  q.walls.forEach(function (w, i) {
    if (wallPoints(w).some(p => p[0] === x && p[1] === y)) wi = i;
  });
  let el = null;
  if (wi >= 0) el = fieldEl.querySelector('.wall[data-wi="' + wi + '"]');
  else el = fieldEl.querySelector('.bounds');
  if (!el) return;
  el.classList.remove('glow', 'hitflash');
  void el.getBoundingClientRect();
  el.classList.add(wi >= 0 ? 'glow' : 'hitflash');
  setTimeout(function () {
    if (el && el.isConnected) el.classList.remove('glow', 'hitflash');
  }, 460 * SPEED + 80);
}
/* 沿 sim.pts 逐格点飞（upto=只飞前缀，教学演示用；quiet=不播 boing 句） */
async function flyPath(q, sim, upto, quiet) {
  const pts = sim.pts;
  const last = upto == null ? pts.length - 1 : upto;
  const bendMap = {};
  sim.bounceIdx.forEach(function (i) { bendMap[i] = true; });
  let boingDone = false;
  for (let k = 1; k <= last; k++) {
    const diag = pts[k - 1][0] !== pts[k][0] && pts[k - 1][1] !== pts[k][1];
    await wait((diag ? 120 : 85) * SPEED);
    if (!ballEl() || !ballEl().isConnected) return false;
    setBall(pts[k][0], pts[k][1]);
    addTrail(pts[k][0], pts[k][1]);
    if (bendMap[k]) {                             // 到达反弹顶点：墙闪+音+boing 句（每趟首弹一次）
      glowAt(q, pts[k][0], pts[k][1]);
      tickSfx();
      if (!boingDone && !quiet) {
        boingDone = true;
        sayR(VOICE.boing.key, VOICE.boing.text);
      }
      await wait(110 * SPEED);
      if (!ballEl()) return false;
    }
  }
  await wait(130 * SPEED);
  return true;
}
/* 飞行收尾：入洞=洞吞球；步数上限/出界=小球淡出 */
async function flyEnd(sim) {
  await wait(140 * SPEED);
  const b = ballEl();
  if (!b) return;
  if (sim.outcome === 'hole') {
    const e = sim.pts[sim.pts.length - 1];
    const hg = fieldEl.querySelector('.hole[data-x="' + e[0] + '"][data-y="' + e[1] + '"]');
    if (hg) { hg.classList.remove('gulp'); void hg.getBoundingClientRect(); hg.classList.add('gulp'); }
  }
  b.classList.add('gone');
  await wait(380 * SPEED);
}
/* 球回起点（错后零惩罚可重点）：瞬移回起点再显形 */
function resetBall(q) {
  const b = ballEl();
  fieldEl.querySelectorAll('.wrong-x').forEach(function (e) { e.remove(); });   /* 错洞叉随回位清除 */
  if (!b) return;
  b.style.transition = 'none';
  setBall(q.ball.x, q.ball.y);
  void b.getBoundingClientRect();
  b.style.transition = '';
  setTimeout(function () { if (b.isConnected) b.classList.remove('gone'); }, 40);
}
function nudgeCard(i) {
  const el = cardEl(i);
  if (!el) return;
  el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge');
}

/* ================= 放飞主路径（真实点击 / BC 钩子 / autoSolve / 教学演示共用） ================= */
async function uiTapDir(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); nudgeCard(i); }      /* 吞输入+轻叮+卡圈轻闪（§0.22） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const r = engTapDir(cur, i);                    // 引擎真值先行（miss/推进同步落账）
  if (r === null) return false;
  const run = cur;                                // 身份守卫：演出窗口内重玩会重建 cur
  const occ = buildOcc(q.walls);
  const sim = simShot(occ, q.W, q.H, q.ball, q.dirs[i], q.holes);
  window.__bcTrace = {                            // 轨迹全量导出（§10：verify 可断言）
    dir: q.dirs[i].slice(),
    pts: sim.pts.map(p => p.slice()),
    outcome: sim.outcome, holeIdx: sim.holeIdx, bounces: sim.bounces
  };
  state.phase = 'fly';
  state.locked = true;                            // 飞行+错后窗口=防重入（连点只记一次 miss）
  clearRescueVisual();
  clearTrail();
  sfx('click');
  await flyPath(q, sim, null, false);
  await flyEnd(sim);
  if (cur !== run) return r;
  if (r === 'wrong') {                            // 入错洞/出界/步上限：零惩罚可重点
    sfx('fail');
    if (sim.outcome === 'hole') {                 /* 试玩 P1：进错洞语义化——打叉+直说， */
      markWrongHole(sim, q);                      /* 防「球明明进去了呀」的成败语义断裂 */
      KIDS.voice.play('bc_hole', '进错洞啦，换个方向再试试');   /* T46 阶段2：keyless→clip 化（bc_hole 在册） */
    } else {
      sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);     /* 三态（§0.5） */
    }
    if (q.miss >= 1) showFirstSeg(q);             /* 试玩 P1：梯度脚手架——错 1 次即闪首段虚线 */
    if (q.miss >= 2) applyRescueVisual(q);        /* 连错 2 次全套：正确卡 breathe（§0.7） */
    await wait(1000 * SPEED);                     /* 错点防重入窗收尾（§0 b16/b17 定案 1000ms 口径，禁偏离） */
    if (cur !== run) return r;
    resetBall(q);
    state.locked = false;
    state.phase = 'aim';
    if (state.tut === 'help') pointHelpNext();    /* "帮"：跟着节奏指回正确卡 */
    return r;
  }
  /* ---- 入正确洞：推进（唯一重置救援钟 §0.7a） ---- */
  lastAct = Date.now();
  if (state.tut === 'help') {                     // 教学"独"：首次答对放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  sayR(VOICE.right.key, VOICE.right.text);
  sfx('ok');
  await wait(2000 * SPEED);                       // 等 bc_right clip（≈2s）主体播完
  if (cur !== run) return r;
  state.locked = false;
  state.phase = 'aim';
  if (r === 'done') winFlow();
  else {
    renderQuiz();
    if (state.tut === 'help') pointHelpNext();
  }
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（不带"明天："前缀，core 模板自带） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, phase: 'aim' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.bounce && sv.bounce.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        // verify 页恒走开场链（stub 记录供断言）
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
  answersEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 同源策略）：正确方向卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(q.answer));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.bounce.tutSeen）
   看=演示指球→飞首段看反弹（墙闪+轨迹）→回起点→指正确方向卡→点对入洞（返回值存
   window.__bcDemoR §0.27）→重发同关，"你猜它进哪个洞"交接 →帮=指正确卡；独=放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  pointGhostAt(ballEl());                        // 看：手指先指小球
  await wait(900 * SPEED);
  await flyDemoSegment(q);                       // 看球弹一段：首段飞行+墙闪，再回起点
  await wait(650 * SPEED);
  pointGhostAt(cardEl(q.answer));                // 指"方向"：正确方向卡
  await wait(750 * SPEED);
  ghost.press();
  await wait(260 * SPEED);
  const demoR = await uiTapDir(q.answer, true);  // demo 通道豁免 locked 门（演示吞输入）
  window.__bcDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.bounce = sv.bounce || {};
    sv.bounce.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 演示首段：飞到第一个反弹顶点（不播 boing 句，避免盖 watch clip） */
async function flyDemoSegment(q) {
  const occ = buildOcc(q.walls);
  const s = simShot(occ, q.W, q.H, q.ball, q.dirs[q.answer], []);
  const upto = s.bounceIdx.length ? s.bounceIdx[0] : 1;
  clearTrail();
  await flyPath(q, s, upto, true);
  await wait(200 * SPEED);
  resetBall(q);
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true, phase: 'aim' };
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
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
stageEl.addEventListener('pointerdown', e => {
  const card = e.target.closest('.dcard');
  if (card) {                                    // 方向卡：放飞主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapDir(Number(card.dataset.i));
    return;
  }
  if (e.target.closest('button, #board')) return;   // 其余按钮/台面非卡目标：不触发空白提示
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 救援视觉（§0.21/§3）：正确方向卡 breathe + 首段轨迹虚线闪 ================= */
/* 首段预测虚线（answer 路径第一段）——梯度脚手架用（试玩 P1：错 1 次即可见） */
function showFirstSeg(q) {
  const occ = buildOcc(q.walls);
  const s = simShot(occ, q.W, q.H, q.ball, q.dirs[q.answer], []);
  const v = s.bounceIdx.length ? s.pts[s.bounceIdx[0]] : s.pts[1];
  const rl = fieldEl.querySelector('#rescue-line');
  if (rl && v) {
    rl.setAttribute('x1', px(q.ball.x));
    rl.setAttribute('y1', px(q.ball.y));
    rl.setAttribute('x2', px(v[0]));
    rl.setAttribute('y2', px(v[1]));
    rl.classList.remove('show'); void rl.getBoundingClientRect(); rl.classList.add('show');
  }
}
/* 进错洞打叉（试玩 P1：洞上 ✗ 短暂显示，resetBall 清除） */
function markWrongHole(sim, q) {
  const h = q.holes[sim.holeIdx];
  if (!h) return;
  const g = fieldEl.querySelector('.hole[data-x="' + h.x + '"][data-y="' + h.y + '"]');
  if (!g || g.querySelector('.wrong-x')) return;
  const x = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  x.setAttribute('d', 'M-8 -8 L8 8 M8 -8 L-8 8');
  x.setAttribute('class', 'wrong-x');
  g.appendChild(x);
}
function applyRescueVisual(q) {
  const c = cardEl(q.answer);
  if (c) { c.classList.remove('breathe'); void c.offsetWidth; c.classList.add('breathe'); }
  const occ = buildOcc(q.walls);
  const s = simShot(occ, q.W, q.H, q.ball, q.dirs[q.answer], []);
  const v = s.bounceIdx.length ? s.pts[s.bounceIdx[0]] : s.pts[1];
  const rl = fieldEl.querySelector('#rescue-line');
  if (rl && v) {
    rl.setAttribute('x1', px(q.ball.x));
    rl.setAttribute('y1', px(q.ball.y));
    rl.setAttribute('x2', px(v[0]));
    rl.setAttribute('y2', px(v[1]));
    rl.classList.remove('show'); void rl.getBoundingClientRect(); rl.classList.add('show');
  }
}
function clearRescueVisual() {
  answersEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  const rl = fieldEl.querySelector('#rescue-line');
  if (rl) rl.classList.remove('show');
}

/* ================= 无操作看护：14s 救援（bc_hint+正确卡 breathe+首段虚线闪 §0.21）/
   教学"帮"5s 重演示一次。救援钟只被入正确洞推进重置（§0.7a：点卡（对错均）/空白/兔子不重置） ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    sayR(VOICE.hint.key, VOICE.hint.text);       // 救援=提示句重播+视觉对
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
  KIDS.init({ game: 'bounce', title: '弹球进洞' });
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
window.BC = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: 'bounce', W: q.W, H: q.H,                 /* SPEC §3 钩子契约 */
      ball: { x: q.ball.x, y: q.ball.y },
      holes: q.holes.map(h => ({ x: h.x, y: h.y })),
      walls: q.walls.map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })),
      dirs: q.dirs.map(d => d.slice()),
      answer: q.answer, phase: state.phase, step: cur.step, miss: q.miss,
      okHole: q.okHole, solved: q.solved };                  /* 测试辅助字段（okHole=正确洞下标） */
  },
  tapDir(i) { return uiTapDir(i); },
  start(flat) {                                   /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                             /* 引擎真值直驱 UI 路径：逐题点正确方向卡 */
    const run = cur;                              /* 身份守卫（审查 m3：winFlow 延迟 proceed 换关即中止） */
    let n = 0, quizzes = 0, ok = true;
    while (cur && cur === run && !cur.done && n++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapDir(q.answer);
      quizzes++;
      if (r !== 'right' && r !== 'done') { ok = false; break; }   // 断言通关恰=全部正确方向
    }
    return { done: !!(cur && cur.done && cur === run), quizzes: quizzes, ok: ok };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
