/* ================= matchstick 主逻辑（七段火柴等式渲染 / 拿放主路径 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH15 §3）：火柴棒等式当前不成立——点一根火柴（高亮拿起浮起）→
   点目标虚线槽（放置即判，无确认键）：成立=火焰粒子+胜利下一题 / 不成立=晃动零惩罚
   火柴回原位可再移（浪费移动计 miss；拿起/放回中间态零惩罚）。
   救援 14s=重读题面+可解源火柴 pulse 三连（engSolve 穷举首解），只被等式成立/重听题面
   重置（§0.7a：点火柴/放槽/错放=探索不重置）；读题按钮重置（主动学习动作）。
   教学（仅 flat0 首次）：看=演示完整移动（高亮拿起→虚线槽落位→等式亮起）→演示成立
   （demoR 存 window.__msDemoR §0.27）→重发同关→帮=幽灵手指指该拿的火柴→独=放手。
   验收钩子：window.MS = { get currentLevel, get quiz(){expr,left,right,ok,step,miss,held},
     tapStick(i), tapSlot(i), async autoSolve(), get tutorial, get rescues }（getter 拷贝） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/教学/轻反馈不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次——不灰化款 miss 无上限，
   必须 === 2（豁免只在每题 miss 首达 2 时发一次） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 拿起/放回轻反馈（§3 ms_pick/ms_drop，10s 节流） */
let lastPickV = 0, lastDropV = 0;
function sayPick() {
  const now = Date.now();
  if (now - lastPickV > 10000) { lastPickV = now; sayR(VOICE.pick.key, VOICE.pick.text); }
}
function sayDrop() {
  const now = Date.now();
  if (now - lastDropV > 10000) { lastDropV = now; sayR(VOICE.drop.key, VOICE.drop.text); }
}

const stageEl = $id('stage'), chipEl = $id('prompt-chip'), sceneEl = $id('scene'),
      sceneArea = $id('scene-area'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;
let slotXY = {};                                // 渲染期槽位坐标表（火柴飞行动画用）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const stickEl = s => sceneEl.querySelector('.stk[data-slot="' + s + '"]');
const slotEl = s => sceneEl.querySelector('.slot[data-slot="' + s + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
function renderChip() {
  chipEl.className = '';
  chipEl.innerHTML = '<span class="mini">' + ICONS.msMini + '</span>' +
    '<span class="ask">' + VOICE.q.text + '</span>';
}
/* 场景：七段火柴等式 SVG（JS 按容器实测 px 布局——命中矩形两向 ≥64 与视口无关地成立）
   画序：panel → 数字/符号/等号 cells（槽虚线在前火柴在后）→ fx 火焰层 */
function renderScene() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const availW = Math.max(320, sceneArea.clientWidth - 10);
  const availH = Math.max(240, sceneArea.clientHeight - 6);
  const nD = q.cells.filter(c => c.kind === 'd').length;
  /* 字宽拟合：从大到小试到放得下（两档间距；下限 92 保横杆长 ≥64 命中） */
  const tryFit = (gap, minOp, minEq) => {
    for (let w = 168; w >= 92; w -= 3) {
      const total = nD * (w + gap) + Math.max(minOp, w * 0.7) + gap +
        Math.max(minEq, w * 0.72) + gap;
      if (total <= availW) return w;
    }
    return 0;
  };
  let W = tryFit(34, 96, 80);
  if (!W) W = tryFit(20, 88, 76);
  if (!W) W = 92;
  const geo = digitGeo(W), og = opGeo(W);
  const H = geo.H;
  const topPad = 24, botPad = 14;               // 顶部余量=拿起浮起+阴影
  let y0 = topPad;
  if (H + topPad + botPad > availH) {           // 极矮视口：整体按高缩（保底 0.72，verify 视口不触）
    y0 = Math.max(8, topPad - (H + topPad + botPad - availH) * 0.5);
  }
  const xc0 = 10;
  let x = xc0, body = '';
  slotXY = {};
  q.cells.forEach((c, ci) => {
    const held = q.held;
    if (c.kind === 'd') {
      const x0 = x;
      SEG.forEach(seg => {
        const p = geo.pos[seg];
        const s = ci * 8 + SEGIDX[seg];
        const cx = x0 + p[0], cy = y0 + p[1];
        slotXY[s] = [cx, cy];
        const vertical = geo.vt.indexOf(seg) >= 0;
        const len = vertical ? geo.Lv : geo.Lh;
        if (c.segs[SEGIDX[seg]]) {
          body += stickSvg(cx, cy, seg, len, geo.t, vertical,
            (held != null && held === s) ? 'held' : '', s);
        } else {
          body += slotSvg(cx, cy, seg, len, geo.t, vertical,
            held != null ? 'hot' : '', s);
        }
      });
      x += W + 34;
    } else if (c.kind === 'op') {
      const cw = Math.max(96, W * 0.7), cx = x + cw / 2, cy = y0 + H / 2;
      const s0 = ci * 8, s1 = ci * 8 + 1;
      slotXY[s0] = [cx, cy];
      slotXY[s1] = [cx, cy];
      if (!c.segs[1])                                    /* '-'：竖槽虚线（+↔- 单根规则 §3） */
        body += slotSvg(cx, cy, 'v', og.opL, geo.t, true, q.held != null ? 'hot' : '', s1);
      body += stickSvg(cx, cy, 'h', og.opL, geo.t, false,
        (q.held != null && q.held === s0) ? 'held' : '', s0);
      if (c.segs[1])
        body += stickSvg(cx, cy, 'v', og.opL, geo.t, true,
          (q.held != null && q.held === s1) ? 'held' : '', s1);
      x += cw + 34;
    } else {                                             /* '='：双横固定不可移（§3） */
      const cw = Math.max(76, W * 0.72), cx = x + cw / 2, cy = y0 + H / 2;
      body += stickSvg(cx, cy - og.eqGap, 'h', og.eqL, geo.t, false, 'locked', -1);
      body += stickSvg(cx, cy + og.eqGap, 'h', og.eqL, geo.t, false, 'locked', -2);
      x += cw + 34;
    }
  });
  const totalW = x - 34 + 10;
  const svgW = Math.min(totalW, availW), svgH = y0 + H + botPad;
  const scale = totalW > availW ? availW / totalW : 1;   /* 极窄兜底整体缩（verify 双视口不触） */
  const svg = '<svg class="eq" width="' + Math.round(totalW * scale) + '" height="' + Math.round(svgH * scale) +
    (scale !== 1 ? '" viewBox="0 0 ' + totalW + ' ' + svgH : '') +
    '" xmlns="http://www.w3.org/2000/svg" aria-label="火柴算式">' +
    '<rect class="panel" x="2" y="' + (y0 - 14) + '" width="' + (totalW - 4) + '" height="' + (H + 28) +
    '" rx="26" fill="#FFFAF0" stroke="#E3D5BE" stroke-width="3"/>' +
    '<g class="cells"' + (scale !== 1 ? ' transform="scale(' + scale + ')"' : '') + '>' + body + '</g>' +
    '<g class="fx"></g></svg>';
  sceneEl.innerHTML = svg;
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
/* 题面=封闭句单 clip（§0.23）：ms_q 在场播 clip，缺则整句 TTS 兜底（play 自带） */
function speakQuiz() { sayR(VOICE.q.key, VOICE.q.text); }
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 题面，queue 单通道顺序播 */
function openingSpeak(turn) {
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key, VOICE.q.key]);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip();
  renderScene();
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   /* 换题读题 sayR 级 */
}

/* ================= 火柴飞行动画（WAAPI，keyframes 携带绝对 translate 兼容竖杆 rotate） */
function animStick(slot, toSlot, hold) {
  const el = stickEl(slot);
  const from = slotXY[slot], to = slotXY[toSlot];
  if (!el || !from || !to) return;
  const vert = el.getAttribute('transform').indexOf('rotate') >= 0;
  const rot = vert ? ' rotate(90deg)' : '';
  const base = 'translate(' + from[0] + 'px,' + from[1] + 'px)' + rot;
  const dst = 'translate(' + to[0] + 'px,' + to[1] + 'px)' + rot;
  if (hold) {
    el.animate([{ transform: base }, { transform: dst }], { duration: 380 * (VERIFY ? 0.2 : 1), fill: 'forwards', easing: 'ease-in-out' });
  } else {                                      /* 错放：飞过去再弹回原位 */
    el.animate([
      { transform: base }, { transform: dst, offset: 0.38 },
      { transform: base, offset: 0.78 },
      { transform: 'translate(' + (from[0] - 5) + 'px,' + from[1] + 'px)' + rot, offset: 0.88 },
      { transform: base }
    ], { duration: 640 * (VERIFY ? 0.2 : 1), easing: 'ease-in-out' });
  }
}
/* 火焰粒子（成立时从落位火柴喷出，§3 火焰粒子+胜利） */
function flameBurst(slot) {
  const svg = sceneEl.querySelector('svg.eq');
  const fx = svg && svg.querySelector('.fx');
  const p = slotXY[slot];
  if (!fx || !p) return;
  const cols = ['', 'f2', 'f3'];
  for (let i = 0; i < 16; i++) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]);
    c.setAttribute('r', 3 + Math.random() * 4);
    if (cols[i % 3]) c.setAttribute('class', cols[i % 3]);
    fx.appendChild(c);
    const dx = (Math.random() - 0.5) * 130, dy = -(34 + Math.random() * 86);
    c.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.25)', opacity: 0 }
    ], { duration: (560 + Math.random() * 380) * (VERIFY ? 0.2 : 1), delay: i * 22 * (VERIFY ? 0.2 : 1), easing: 'ease-out', fill: 'forwards' });
  }
  setTimeout(() => { if (fx.parentNode) fx.innerHTML = ''; }, VERIFY ? 300 : 1300);
}
function shakeScene() {
  const svg = sceneEl.querySelector('svg.eq');
  if (!svg) return;
  svg.classList.remove('shake'); void svg.offsetWidth; svg.classList.add('shake');
}
function markHot(on) {                          // 拿起后空槽亮虚线（hot 呼吸）
  sceneEl.querySelectorAll('.slot').forEach(el => el.classList.toggle('hot', !!on));
}

/* ================= 拿放主路径（真实点击 / MS 钩子 / autoSolve / 教学演示共用） ================= */
async function uiPick(s, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) sfx('pop');                      // 吞输入+轻叮（§0.22）
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (q.held != null) {                         // 已拿着一根再点火柴
    if (q.held === s) return uiPlace(s, demo);  // 点拿着的火柴=放回原位（'back' 零惩罚）
    /* b15 试玩 P2：换手=自动放回旧的再拿起新的（孩子直接点下一根，不强制先放回原位） */
    await uiPlace(q.held, demo);
    return uiPick(s, demo);
  }
  const r = engPick(cur, s);
  if (r === null) { if (!demo) sfx('pop'); return false; }
  const el = stickEl(s);
  if (el) el.classList.add('held');
  markHot(true);
  if (!VERIFY) KIDS.audio.note(690, 0.08, 0, 0.35);
  if (!demo) sayPick();                         /* 拿起轻反馈（10s 节流）；探索不重置救援钟 §0.7a */
  return 'held';
}
async function uiPlace(s, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) sfx('pop');                      // 吞输入+轻叮（§0.22）
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                              // 身份守卫：演出窗口内重玩会重建 cur
  const heldNow = q.held;
  if (heldNow == null) { if (!demo) sfx('pop'); return false; }
  const r = engPlace(cur, s);
  if (r === null) { if (!demo) sfx('pop'); return false; }
  if (r === 'back') {                           // 放回原位=取消拿起：零惩罚（中间态 §3）
    const el = stickEl(heldNow);
    if (el) el.classList.remove('held');
    markHot(false);
    if (!demo) sayDrop();                       /* 放好啦轻反馈（10s 节流） */
    return 'back';
  }
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                       // 仅等式成立重置救援钟（§0.7a）
    if (state.tut === 'help') {                 // 教学"独"：首次成立 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    const el = stickEl(heldNow);
    if (el) el.classList.remove('held');
    markHot(false);
    const svg = sceneEl.querySelector('svg.eq');
    if (svg) svg.classList.add('ok');           // 等式亮起（panel 转暖绿+杆辉光）
    animStick(heldNow, s, true);                // 火柴飞入目标槽
    flameBurst(s);                              // 火焰粒子
    sfx('coin');
    sayR(VOICE.right.key, VOICE.right.text);
    await wait(980 * SPEED);
    if (cur !== run) return r;                  // 演出窗内重玩已重建关卡：丢弃旧续体
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
    return r;
  }
  /* 不成立：晃动零惩罚火柴回原位可再移（浪费移动计 miss，引擎已还原） */
  const el = stickEl(heldNow);
  if (el) el.classList.remove('held');
  markHot(false);
  sfx('fail');
  sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);   /* flat<3 每错必播 / ≥3 节流+豁免恰一次 */
  shakeScene();
  animStick(heldNow, s, false);                 // 飞过去→弹回原位
  if (q.miss >= 2) {                            // 首错不 pulse：连错 2 次高亮可解源火柴
    const sols = engSolve(q.cells);
    const ok = sols.length ? stickEl(sols[0].src) : null;
    if (ok) { ok.classList.remove('pulse3'); void ok.offsetWidth; ok.classList.add('pulse3'); }
  }
  if (state.tut === 'help') pointHelpNext();
  state.locked = true;                          /* 晃动窗防重入：连点一次错只记一次 miss（§0.26） */
  await wait(680 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（不带"明天："前缀） */
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.matchstick && sv.matchstick.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5） */
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
  el.classList.remove('pulse3'); void el.offsetWidth;
  el.classList.add('pulse3');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：该拿的火柴（穷举首解源段；fallback 存储解） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return;
  const sols = engSolve(q.cells);
  const sol = sols.length ? sols[0] : q.solution;
  pointGhostAt(stickEl(sol.src));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.matchstick.tutSeen）
   看=演示一次完整移动（高亮拿起→幽灵手指到虚线槽→落位→等式亮起+火焰）——
   前段拿起走 demo 通道（locked 吞真实输入），落位临时解锁走真实路径演完整成立演出
   （返回值存 window.__msDemoR，verify 断言真实生效 §0.27）→立即重发同关（确定性，题面一致）
   →帮=幽灵手指指该拿的火柴；独=首次成立放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(1100 * SPEED);
  const q = cur.quizzes[0];
  const sols = engSolve(q.cells);
  const sol = sols.length ? sols[0] : q.solution;
  const srcEl = stickEl(sol.src);
  if (srcEl) srcEl.classList.add('lit');         // 该拿的火柴发光
  pointGhostAt(srcEl);
  await wait(900 * SPEED);
  ghost.press();
  await wait(300 * SPEED);
  await uiPick(sol.src, true);                   // demo 通道：拿起（浮起+空槽亮虚线）
  await wait(650 * SPEED);
  pointGhostAt(slotEl(sol.dst));                 // 幽灵手指移到目标虚线槽
  await wait(850 * SPEED);
  ghost.press();
  await wait(300 * SPEED);
  state.demo = false; state.locked = false;      /* 时序锚点：解锁窗内无 await 插入（batch9 m6） */
  const demoR = await uiPlace(sol.dst, true);    // 真实路径：放置即判成立（火焰+亮起）
  window.__msDemoR = demoR;                      /* §0.27 演示生效实证：verify 断言 ==='right' */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.matchstick = sv.matchstick || {};
    sv.matchstick.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip → 题面（§0.6 单通道）
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
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 pop+hop 不静默 */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.22 吞输入轻叮 */
  lastAct = Date.now();                          /* 重听题面=主动学习动作，重置救援钟（§0.7a） */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz();                                   /* 再听一遍：题面整句单 clip */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* 吞输入期点题面卡也轻叮（§0.16，b15 审查 m1 补 won） */
  lastAct = Date.now();                          /* 题面卡可点重听（主动学习动作 §0.7a） */
  speakQuiz();
});
sceneEl.addEventListener('pointerdown', e => {
  const stk = e.target.closest ? e.target.closest('.stk') : null;
  if (stk) {
    e.preventDefault();
    if (stk.classList.contains('locked')) {       /* 等号固定不可移：轻叮不静默（§0.16） */
      if (state.locked || state.demo) sfx('pop');
      else if (!VERIFY && cur && Date.now() - lastBlankHint > 10000) {
        lastBlankHint = Date.now(); sayR(VOICE.hint.key, VOICE.hint.text);
      }
      return;
    }
    /* b15 试玩 P1：已拿火柴点 '-' op 交叉区——竖槽与横杆同心、后画横杆在上层截获点击，
       层叠链含该 op 空竖槽则按放置意图分发（点竖槽任意位置含中心都能放入） */
    if (cur && !state.locked && !state.demo && !state.won) {
      const q0 = cur.quizzes[cur.step];
      const ci = Math.floor(Number(stk.dataset.slot) / 8);
      if (q0 && q0.held != null && q0.cells[ci] && q0.cells[ci].kind === 'op' && !q0.cells[ci].segs[1]) {
        const vslot = (document.elementsFromPoint(e.clientX, e.clientY) || []).some(
          el => el.closest && el.closest('.slot') && Number(el.closest('.slot').dataset.slot) === ci * 8 + 1);
        if (vslot) { uiPlace(ci * 8 + 1); return; }
      }
    }
    uiPick(Number(stk.dataset.slot));
    return;
  }
  const slot = e.target.closest ? e.target.closest('.slot') : null;
  if (slot) {
    e.preventDefault();
    const q = cur && cur.quizzes[cur.step];
    if (!q || q.held == null) { sfx('pop'); return; }   /* 未拿着点空槽=探索轻叮 */
    uiPlace(Number(slot.dataset.slot));
    return;
  }
  /* 空白探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 吞输入期轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});
window.addEventListener('resize', () => { if (cur && cur.quizzes[cur.step]) renderScene(); });

/* ================= 无操作看护：14s 救援（重读题面+可解源火柴 pulse 三连 §0.21）/
   教学"帮"5s 重演示一次。救援钟只被等式成立/重听题面重置（§0.7a：拿起/放槽/错放/空白/兔子不重置） */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueCount++;
    speakQuiz();                                 // 救援=重读题面（§0.21）
    const sols = engSolve(q.cells);              // 可解源火柴 pulse 三连（穷举同款取解）
    const el = sols.length ? stickEl(sols[0].src) : null;
    if (el) { el.classList.remove('pulse3'); void el.offsetWidth; el.classList.add('pulse3'); }
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
  KIDS.init({ game: 'matchstick', title: '火柴谜题' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
    first = Math.max(0, lim - 1);
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用 §0.8） ================= */
window.MS = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const ev = evalCells(q.cells);
    return {
      kind: 'ms',
      expr: q.cells.map(c => ({ kind: c.kind, segs: c.segs.slice() })),  /* 段位对象数组（拷贝） */
      left: ev.valid ? ev.left : null,
      right: ev.valid ? ev.right : null,          /* 不成立/不可读 → null */
      ok: ev.ok,
      step: cur.step, miss: q.miss,
      held: q.held                                /* 拿起段 slotId 或 null */
    };
  },
  tapStick(i) { return uiPick(i); },
  tapSlot(i) { return uiPlace(i); },
  async autoSolve() {                            /* UI 路径穷举一解通关：拿起→放槽→断言成立 */
    let n = 0;
    const run = cur;                             // 身份守卫：winFlow 延迟 proceed 换关即中止
    while (cur && cur === run && !cur.done && n++ < 30) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const sols = engSolve(q.cells);
      const sol = sols.length ? sols[0] : q.solution;
      await uiPick(sol.src);
      const r = await uiPlace(sol.dst);
      if (r !== 'right' && r !== 'done') break;
      await wait(40);
    }
    return { done: !!(cur && cur.done && cur === run), moves: n };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
