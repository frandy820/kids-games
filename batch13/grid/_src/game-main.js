/* ================= grid 主逻辑（r13：8×8 相对导航渲染/指令键/教学/推进）
   玩法：小兔子带朝向（N/E/S/W 箭头旋转+前方格虚线）站 8×8 起点；exec 章=指令条
   （当前命令高亮，前进命令带格点进度）按序执行 前进/左转/右转/拿宝箱；plan/maze 章=
   自由规划依序到访多宝箱（下一个宝箱呼吸高亮，错序 T=方向级反馈不罚死）。
   题面语音（§0.23 全 clip 禁 key:null）：exec=queue(指令句 cmdClips 拼接)；
   plan/maze=play(gri_i_order)。fwd 后播绝对方向词 gri_d_*（相对→绝对桥接，低频反馈）。
   救援（§0.21）：重读题面+答案视觉 breathe——exec=当前命令键 / plan=下一个宝箱格。
   撤销：退一步回退原子动作（步数不减）；错步可回退不罚（r13 delta③）。
   验收钩子：window.GR = { get currentLevel, get quiz(){kind,pos,heading,walls,chests,next,
     seq,seqIdx,fwdLeft,steps,optSteps,collected,step,miss}, tapFwd(), tapTurn('left'|'right'),
     tapTake(), tapUndo(), autoSolve(), get tutorial, get rescues } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/方向词不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流 + 豁免恰一次；
   不灰化款必须 === 2（r13 miss 源=exec 指令错配；plan 错序走方向 queue 单通道不叠播） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const stageEl = $id('stage'), boardEl = $id('board'), wrapEl = $id('board-wrap'),
      padEl = $id('pad-area'), chipEl = $id('prompt-chip'), meterEl = $id('stepmeter'),
      rabbitEl = $id('rabbit'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      undoBtn = $id('btn-undo');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白/探索点击轻提示节流（§0.16，10s）
let helpRedemo = false;
let qTimer = null;                              // 开场/教学链 clip→题面的接力定时器（§0.6）
let rescueCount = 0;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellEl = (r, c) => boardEl.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');
const cmdEl = c => padEl.querySelector('.cmdb[data-c="' + c + '"]');
const isExecKind = q => q.kind === 'exec1' || q.kind === 'exec2';

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  rabbitEl.innerHTML = '<div class="hwrap"><div class="harrow"></div></div>' +
    '<div class="body">' + KIDS.assets.rabbit('normal', 200) + '</div>';   /* 箭头环+兔身（CSS 随格缩放） */
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  padEl.querySelectorAll('.cmdb').forEach(b => {
    b.innerHTML = ICONS.cmd[b.dataset.c] + '<span>' + CMD_NAME[b.dataset.c] + '</span>';
  });
  undoBtn.innerHTML = ICONS.undo + '<span>退一步</span>';
}
/* 音效（Web Audio 合成）：前进=马林巴双音 / 撞墙=低哑音 / 转向=上行双音 / 到访=轻叮 / 终箱=叮咚 */
const hopHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1046.5, 0.12, 0.07, 0.4); } };
const bumpLo = () => { if (!VERIFY) { KIDS.audio.note(330, 0.1, 0, 0.3); KIDS.audio.note(262, 0.12, 0.08, 0.28); } };
const turnUp = () => { if (!VERIFY) { KIDS.audio.note(523.25, 0.08, 0, 0.35); KIDS.audio.note(659.25, 0.1, 0.06, 0.3); } };
const stageDing = () => { if (!VERIFY) KIDS.audio.note(740, 0.14, 0, 0.5); };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(987.77, 0.18, 0, 0.7); KIDS.audio.note(1318.5, 0.32, 0.09, 0.7); } };

/* ================= 布局尺寸（--cs 格 8×8 / --dir 指令键；双 viewport §0.9+r13 delta）
   8×8 域扩后格下限 44px 双向（r13 delta① 定死触控下限）；横屏指令键区右侧、竖屏下方。
   主答案键=前进/左转/右转/拿宝箱 ≥96；退一步 ≥64。 ---------- */
function layoutBoard() {
  /* 竖屏判别=真实视口 || body.port 类通道（verify simView 强制竖屏时 JS 侧同步走竖屏分支——
     否则格尺寸按横屏余量计算而 CSS 已纵排，板+键区溢出舞台被裁） */
  const portrait = document.body.classList.contains('port') || window.innerHeight > window.innerWidth;
  const gap = 6, wrapPad = 30;                  // board padding 12*2 + border 3*2*2
  const padSide = 3 * 96 + 2 * 10 + 22;         // 指令键区宽 + play-row gap（横屏预留）
  const padUnder = 2 * 96 + 1 * 10 + 12;        // 指令键区高（两行；竖屏预留）
  const availW = portrait ? stageEl.clientWidth : stageEl.clientWidth - padSide;
  const availH = portrait ? stageEl.clientHeight - padUnder : stageEl.clientHeight;
  let cs = Math.floor(Math.min((availH - GRID_N * gap - wrapPad) / GRID_N,
                               (availW - GRID_N * gap - wrapPad) / GRID_N));
  cs = Math.max(44, Math.min(cs, 96));          // r13：8×8 格 ≥44px 触控下限（双 viewport）
  document.documentElement.style.setProperty('--cs', cs + 'px');
  document.documentElement.style.setProperty('--gap', gap + 'px');
  document.documentElement.style.setProperty('--dir', '96px');
  if (cur) placeRabbit(false);
}
window.addEventListener('resize', () => { if (cur) { layoutBoard(); } });

/* ================= 题面语音（读题 sayR 级不受 flat 门）
   exec = queue 拼接全 clip（逐命令 cmdClips：向前+数词+格 / 向左转 / 向右转 / 拿到宝箱）；
   plan/maze = play(gri_i_order)。重入先清接力定时器（防旧题残留切断新题面） */
function speakQuiz(q) {
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  if (isExecKind(q)) {
    const parts = [];
    q.seq.forEach(cm => { cmdClips(cm).forEach(k => parts.push(k)); });
    KIDS.voice.queue(parts);
  } else KIDS.voice.play('gri_i_order', PLAN_SAY);
}

/* ================= 开场顺序链（§0.5/§0.6）：hint → OPEN_RELAY 3000ms 接力题面
   （接力窗 ≥ gri_i_hint 2640+300 防尾截——r13 实长表；禁双通道叠音） */
function openingSpeak() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  sayR(VOICE.hint.key, VOICE.hint.text);
  qTimer = setTimeout(() => {
    qTimer = null;
    if (cur && !cur.done) speakQuiz(cur.quizzes[cur.step]);
  }, OPEN_RELAY_MS);
}

/* ================= 渲染 ================= */
function renderChip(q) {                        // 题面卡：指令条/宝箱序（文字=语音的装饰性冗余 §0.19）
  chipEl.classList.remove('done');
  if (isExecKind(q)) {
    let html = '<span class="chipmini">' + chestSvg(false) + '</span>';
    q.seq.forEach((cm, i) => {
      const cls = i < q._si ? 'schip went' : (i === q._si ? 'schip cur' : 'schip');
      let dots = '';
      if (cm.t === 'fwd') {
        const done = i < q._si ? cm.n : (i === q._si ? cm.n - q._fn : 0);
        dots = '<span class="fdots">' +
          Array.from({ length: cm.n }, (_, k) => '<i class="' + (k < done ? 'on' : '') + '"></i>').join('') +
          '</span>';
      }
      html += '<span class="' + cls + '">' + ICONS.cmd[cm.t === 'fwd' ? 'fwd' : cm.t] +
        '<span class="st">' + cmdText(cm) + '</span>' + dots + '</span>';
    });
    chipEl.innerHTML = html;
  } else {
    let badges = '';
    q.chests.forEach((ch, i) => {
      badges += '<span class="ob ' + (i < q._col ? 'got' : (i === q._col ? 'next' : '')) + '">' +
        (i + 1) + ' 号</span>';
    });
    chipEl.innerHTML = '<span class="chipmini">' + chestSvg(false) + '</span>' +
      '<span class="orderbox"><span class="qtext">' + PLAN_SAY + '</span>' + badges + '</span>';
  }
  chipEl.setAttribute('aria-label', quizSay(q) + '，点我再听一遍');
}
function renderMeter(q) {                       // 步数表：错步可退不罚但步数常显（r13 delta③）
  meterEl.innerHTML = '已走 <b>' + q._steps + '</b> 步 · 最短 <b>' + q.opt + '</b> 步';
}
/* 8×8 网格：64 格 div（非答案目标——点击=探索轻反馈）+石块+宝箱（序号徽章/下一个呼吸） */
function renderBoard(q) {
  boardEl.className = '';
  boardEl.innerHTML = '';
  for (let r = 1; r <= GRID_N; r++) for (let c = 1; c <= GRID_N; c++) {
    const b = document.createElement('div');
    b.className = 'cell'; b.dataset.r = r; b.dataset.c = c;
    b.setAttribute('aria-label', '第' + r + '行第' + c + '列');
    const ci = q.chests.findIndex(ch => ch.r === r && ch.c === c);
    if (ci >= 0) {
      b.innerHTML = '<span class="chest">' + chestSvg(false) + '</span>' +
        '<span class="bnum">' + (ci + 1) + '</span>';
      if (ci === q._col) b.classList.add('nextchest');
      if (ci < q._col) b.classList.add('open');
    }
    if (q.walls.some(w => w.r === r && w.c === c))
      b.innerHTML = '<span class="stone">' + stoneSvg() + '</span>', b.classList.add('walled');
    boardEl.appendChild(b);
  }
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip(q);
  renderMeter(q);
  renderBoard(q);
  renderStep();
  layoutBoard();
  updateRabbit(false);
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);   /* 开场/换题读题；quiet=开场/教学交接走顺序链 */
}
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
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 小兔子站当前格 + 朝向箭头旋转 + 前方格虚线（朝向可视化 r13 delta②） */
function placeRabbit(anim) {
  const q = cur && cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)];
  if (!q) { rabbitEl.style.display = 'none'; return; }
  rabbitEl.style.display = 'block';
  const el = cellEl(q._pr, q._pc);
  if (!el) return;
  const w = Math.max(50, Math.round(el.offsetWidth * 0.7));
  rabbitEl.style.width = w + 'px';
  rabbitEl.style.left = Math.round(boardEl.offsetLeft + el.offsetLeft + el.offsetWidth / 2 - w / 2) + 'px';
  rabbitEl.style.top = Math.round(boardEl.offsetTop + el.offsetTop + el.offsetHeight * 0.42 - w * 0.44) + 'px';
  if (anim) { rabbitEl.classList.remove('hoppy'); void rabbitEl.offsetWidth; rabbitEl.classList.add('hoppy'); }
}
function updateRabbit(anim) {
  const q = cur && cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)];
  if (!q) return;
  placeRabbit(anim);
  const hw = rabbitEl.querySelector('.hwrap');
  if (hw) hw.style.transform = 'rotate(' + HEAD_DEG[q._h] + 'deg)';       /* 箭头环旋转=朝向 */
  boardEl.querySelectorAll('.cell.here').forEach(e => e.classList.remove('here'));
  boardEl.querySelectorAll('.cell.ahead').forEach(e => e.classList.remove('ahead'));
  const he = cellEl(q._pr, q._pc);
  if (he) he.classList.add('here');
  const d = DELTA_H[q._h], ar = q._pr + d[0], ac = q._pc + d[1];
  if (inGrid(ar, ac) && !q.walls.some(w => w.r === ar && w.c === ac)) {
    const ae = cellEl(ar, ac);
    if (ae) ae.classList.add('ahead');                                    /* 前方格虚线（撞墙预览） */
  }
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
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：当前题的答案线索（exec=当前命令键；plan=下一个宝箱格/已站箱=拿宝箱键） */
function helpTargetEl(q) {
  if (isExecKind(q)) {
    const act = q.seq[q._si];
    return act ? cmdEl(act.t === 'fwd' ? 'fwd' : act.t) : null;
  }
  const nx = q.chests[q._col];
  if (nx && q._pr === nx.r && q._pc === nx.c) return cmdEl('T');
  return nx ? cellEl(nx.r, nx.c) : null;
}
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(helpTargetEl(q));
}
/* 救援视觉线索元素（§0.21 答案 breathe；与 helpTargetEl 同一指向逻辑） */
function rescueTargetEl(q) { return helpTargetEl(q); }
/* 清全部 breathe/pulse 类（换题/救援重入） */
function clearHints() {
  boardEl.querySelectorAll('.breathe,.pulse').forEach(e => e.classList.remove('breathe', 'pulse'));
  padEl.querySelectorAll('.breathe,.pulse').forEach(e => e.classList.remove('breathe', 'pulse'));
}

/* ================= 答对推进（终箱收集 → 开箱演出 → 换题/通关） ================= */
async function advance(cellR, cellC, r) {
  const run = cur;
  state.locked = true;
  const el = cellEl(cellR, cellC);
  if (el) { el.classList.remove('nextchest'); el.classList.add('open'); }
  chipEl.classList.add('done');
  chimeGoal();
  sfx('coin');
  await wait(950 * SPEED);
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  state.locked = false;
  clearHints();
  if (cur.done) winFlow();
  else renderQuiz();
  return r;
}

/* ================= 指令键主路径（真实点击 / GR 钩子 / autoSolve 共用） ================= */
async function uiCmd(c, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked）。
     吞输入轻反馈（§0.22）：真实点击被 locked/demo/won 吞时 sfx('pop')，返回值/状态不变 */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    sfx('pop');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;
  const rr = engCmd(cur, c);
  if (rr === null) { sfx('pop'); return false; }
  const bel = cmdEl(c);
  if (rr === 'wrong') {                         /* exec 指令错配：晃动零惩罚（不灰化可重点） */
    if (bel) { bel.classList.remove('wig'); void bel.offsetWidth; bel.classList.add('wig'); }
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss === 2);
    if (q._miss >= 2) {                         /* 首错不 pulse：连错 2 次才高亮当前命令键（§0.7） */
      const ok = helpTargetEl(q);
      if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    }
    state.locked = true;                        /* 晃动窗防重入：连点一次错只记一次 miss（审查 m3） */
    await wait(480 * SPEED);
    if (cur !== run) return rr;
    state.locked = false;
    return rr;
  }
  if (rr === 'order') {                         /* 错序 T：方向级反馈不罚死（r13 delta③；miss 已计） */
    const here = cellEl(q._pr, q._pc);
    if (here) { here.classList.remove('shake'); void here.offsetWidth; here.classList.add('shake'); }
    KIDS.voice.queue(['gri_i_next', numKey(q._col + 1), 'gri_i_box']);   /* 先拿 N 号宝箱（单通道禁与 gri_wrong 叠播） */
    if (q._miss >= 2) {
      const nx = q.chests[q._col] && cellEl(q.chests[q._col].r, q.chests[q._col].c);
      if (nx) { nx.classList.remove('pulse'); void nx.offsetWidth; nx.classList.add('pulse'); }
    }
    state.locked = true;
    await wait(480 * SPEED);
    if (cur !== run) return rr;
    state.locked = false;
    return rr;
  }
  if (rr === 'nope') {                          /* 非宝箱格 T=探索：轻晃不罚（不锁不 miss） */
    if (bel) { bel.classList.remove('wig'); void bel.offsetWidth; bel.classList.add('wig'); }
    sfx('pop');
    return rr;
  }
  if (rr === 'bump') {                          /* 出界/撞墙：原地轻晃不移动（探索零惩罚不计 miss，§0.7a） */
    if (bel) { bel.classList.remove('wig'); void bel.offsetWidth; bel.classList.add('wig'); }
    rabbitEl.classList.remove('hoppy'); void rabbitEl.offsetWidth; rabbitEl.classList.add('hoppy');
    bumpLo();
    sfx('fail');
    await wait(480 * SPEED);                    /* 错点不重置救援钟（§0.7a）；卡住由 14s 救援指方向 */
    return rr;
  }
  /* 合法动作（step/turn/take/goal/done）：重置救援钟（推进的物理形态 §0.7a） */
  lastAct = Date.now();
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  if (rr === 'step') {
    updateRabbit(true);
    hopHi();
    sayR(DIR_KEY(HEAD_WORD[q._h]), DIR_NAME[HEAD_WORD[q._h]]);   /* 播绝对方向词（相对→绝对桥接） */
    if (isExecKind(q)) renderChip(q);
    renderMeter(q);
    return rr;
  }
  if (rr === 'turn') {
    updateRabbit(false);
    turnUp();
    if (isExecKind(q)) renderChip(q);
    return rr;
  }
  if (rr === 'take') {                          /* plan 中途到访：开箱定格+下一箱呼吸高亮 */
    const got = q.chests[q._col - 1];
    const el = got && cellEl(got.r, got.c);
    if (el) { el.classList.remove('nextchest'); el.classList.add('open'); }
    const nx = q.chests[q._col] && cellEl(q.chests[q._col].r, q.chests[q._col].c);
    if (nx) nx.classList.add('nextchest');
    stageDing();
    renderChip(q);
    return rr;
  }
  /* 终箱收集（goal/done）：开箱演出 → 推进 */
  return await advance(q.chests[q.chests.length - 1].r, q.chests[q.chests.length - 1].c, rr);
}

/* ================= 撤销主路径（错步可回退不罚；步数不减=r13 delta③） ================= */
async function uiUndo(demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    sfx('pop');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const rr = engUndo(cur);
  if (rr === null) {                            /* 空栈/终态：轻反馈不罚 */
    undoBtn.classList.remove('wig'); void undoBtn.offsetWidth; undoBtn.classList.add('wig');
    sfx('pop');
    return false;
  }
  updateRabbit(true);
  turnUp();
  if (isExecKind(q)) renderChip(q);
  renderMeter(q);
  return rr;                                    /* 撤销不重置救援钟（回退非推进） */
}

/* ================= 探索点击轻提示（§0.16：10s 节流，不重置救援钟） ================= */
function exploreHint() {
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关预告实算下一关难度章（家族 F——禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
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
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                            // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);               // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.grid && sv.grid.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5） */
}

/* ================= 教学（仅关 1-0 首次，flat0=exec1 [fwd1,T]）：看→帮→独
   看=幽灵手指逐命令演示（locked 吞输入，demo 参数豁免）→帮=指向当前命令键；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  /* 演示=逐命令执行参考序列（exec1 首题 [fwd1,T]：前进→拿宝箱） */
  const plan = q.seq.slice();
  for (let i = 0; i < plan.length; i++) {
    const c = plan[i].t;
    pointGhostAt(cmdEl(c === 'fwd' ? 'fwd' : c));
    await wait(900 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    await uiCmd(c, true);                        // demo 通道豁免 locked（演示吞真实输入）
    await wait(i === plan.length - 1 ? 1000 * SPEED : 260 * SPEED);
  }
  const sv = KIDS._save() || {};                 // verify 页 _save()=null 时空档防御（§0.6）
  sv.grid = sv.grid || {};
  sv.grid.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来找一找"在重发后的题面上说（照 batch7-13） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链：turn clip 播完再读题面（§0.6 禁双通道叠音；题面=queue 拼接接力） */
  sayR(VOICE.turn.key, VOICE.turn.text);
  qTimer = setTimeout(() => {
    qTimer = null;
    if (state.tut === 'help' && cur && !cur.done) speakQuiz(cur.quizzes[cur.step]);
  }, 2000);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) {   /* §0.20 三件门；教学/演出期点兔子=pop+hop 轻反馈（§0.16） */
    sfx('pop');
    hopRabbit();
    return;
  }
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20：教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 对齐重玩门 */
  lastAct = Date.now();                          /* 读题=主动学习动作重置救援钟（§0.7a 例外口径） */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 读题：题面整段重读 */
});
boardEl.addEventListener('pointerdown', e => {
  const cell = e.target.closest('.cell');
  e.preventDefault();
  if (cell) {                                    /* 格子=探索（非答案目标）：轻晃+轻提示（§0.16） */
    cell.classList.remove('shake'); void cell.offsetWidth; cell.classList.add('shake');
    sfx('pop');
    exploreHint();
    return;
  }
  sfx('pop');
  exploreHint();
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo) { sfx('pop'); return; }   /* 吞输入期点题面卡也轻叮（§0.16 主视觉区） */
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（点题卡=儿童高发探索动作） */
});
meterEl.addEventListener('pointerdown', e => {   /* 步数表=非主交互可点区：轻反馈（§0.16） */
  e.preventDefault();
  sfx('pop');
});
padEl.addEventListener('pointerdown', e => {
  const b = e.target.closest('.cmdb');
  if (b) { e.preventDefault(); uiCmd(b.dataset.c); return; }
  if (e.target.closest('#btn-undo')) { e.preventDefault(); uiUndo(); return; }
  e.preventDefault();
  sfx('pop');
  exploreHint();
});
stageEl.addEventListener('pointerdown', e => {   /* 舞台其余空白（吞输入期轻叮 §0.22） */
  if (e.target.closest('#board') || e.target.closest('#pad-area') ||
      e.target.closest('#prompt-chip') || e.target.closest('#stepmeter')) return;
  e.preventDefault();
  sfx('pop');
  exploreHint();
});

/* ================= 无操作看护：14s 救援（重读题面+答案视觉 breathe §0.21）/ 教学"帮"5s 重演示一次
   救援=exec 期当前命令键 breathe / plan 期下一个宝箱格 breathe+题面；
   只有本看护与合法推进写 lastAct——错点/空白/撤销/兔子点击不重置（§0.7a） */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   /* 契约 K（r13 试玩 P2-4/5）：面板/演出层在场不救援——层下语音视觉穿透层打扰家长操作；wordprob/thanks 同款 */
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueCount++;
    speakQuiz(q);                                /* 重读题面（不识字孩子需要任务内容） */
    const el = rescueTargetEl(q);                /* 答案视觉线索 breathe 循环在屏（静音可感知） */
    if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
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
  KIDS.init({ game: 'grid', title: '坐标寻宝' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（b12 m6：防跳章） */ });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.GR = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, retries: cur.retries, done: cur.done, won: state.won };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                      /* SPEC §3 r13 钩子契约 */
      kind: q.kind,
      pos: { r: q._pr, c: q._pc },                /* 兔子当前位置 */
      heading: q._h,                              /* 当前朝向 N/E/S/W */
      walls: q.walls.map(w => ({ r: w.r, c: w.c })),
      chests: q.chests.map(ch => ({ r: ch.r, c: ch.c })),
      next: q._col,                               /* 下一个待到访宝箱下标（0 基） */
      seq: isExecKind(q) ? q.seq.map(cm => ({ t: cm.t, n: cm.n || 0 })) : null,  /* exec 任务指令 */
      seqIdx: isExecKind(q) ? q._si : null,       /* 当前命令下标 */
      fwdLeft: isExecKind(q) ? q._fn : null,      /* 当前 fwd 命令剩余格数 */
      steps: q._steps,                            /* 已走步数（累计只增） */
      optSteps: q.opt,                            /* 最短步数（分段 BFS 和） */
      collected: q._col,                          /* 已收集宝箱数 */
      step: cur.step,                             /* 全关题号 0-4（b33 坑①语义） */
      miss: q._miss || 0
    };
  },
  tapFwd() { return uiCmd('fwd'); },
  tapTurn(side) { return uiCmd(side === 'left' ? 'L' : side === 'right' ? 'R' : side); },
  tapTake() { return uiCmd('T'); },
  tapUndo() { return uiUndo(); },
  async autoSolve() {                            // UI 路径自动答完当前关（exec=按指令条；plan=现算参考解）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 400) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      let c;
      if (isExecKind(q)) {
        const act = q.seq[q._si];
        if (!act) break;
        c = act.t;                                /* 'fwd' 一次一格 */
      } else {
        const plan2 = engPlanRef({ fr: q._pr, fc: q._pc, h0: q._h,
                                   chests: q.chests.slice(q._col), walls: q.walls });
        if (!plan2 || !plan2.length) break;
        c = plan2[0].t;
      }
      const r = await uiCmd(c);
      taps++;
      if (r === false || r === null) break;      // 锁死/重玩保护
      await wait(60);
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
