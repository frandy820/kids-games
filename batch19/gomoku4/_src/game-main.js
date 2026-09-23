/* ================= gomoku4 主逻辑（棋盘渲染 / 落子判定 / 兔子 AI 应手 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH19 §2）：5×5（ch1 4×4）棋盘，孩子执胡萝卜橙子，兔子 AI 应手
   （600-1200ms 假思考）。横/竖/斜 ≥4 连即胜（审查 M1 裁决）。
   - 孩子四连 → gk_right + 金圈四连 → 下一局（末局=过关 celebrate）
   - 兔子四连 → gk_lose（sayW 三态）+ 负局=1 错 miss+1 → 零惩罚重下同局（不推进不换先手）
   - 满盘平局 → gk_draw + 过题推进（平=过题不扣星）
   - 落子后防重入窗 1000ms（b16 定案禁偏离：连点/双落子只记一次）
   - 梯度脚手架：负局 miss==1 重开闪中心 pulse（方向级）；miss>=2 局中轮到孩子时常驻
     可制胜点/必堵点 breathe（答案级，b18 定案 miss>=2 不提前）
   §0.7a 救援钟口径：孩子落子/听提示=重置；AI 落子（系统行为）/点空白/点兔子不重置。
   验收钩子：window.GK = { get currentLevel, get quiz{N,board,turn,phase,winline,step,miss},
     tapCell(i), aiMove(), start(flat), async autoSolve(), get tutorial, get rescues } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速（AI 思考/演出窗同乘）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3 播）；救援/开场/胜负播报/教学不受 flat 门（§0.5） */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 负局播报（纠错轻语音口径 §0.5）：flat<3 每负必播 / flat>=3 10s 节流 + 首负（miss 将=1）
   force 豁免恰一次——一局负局天然间隔整局时长，节流罕见触发 */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 落子音=Web Audio 直调合成（任务指示；verify 页 stub 掉 note）：孩子=清亮双音，兔子=低柔双音 */
const dropSfx = who => {
  if (VERIFY) return;
  if (who === 1) { KIDS.audio.note(660, 0.16, 0, 0.8); KIDS.audio.note(990, 0.2, 0.05, 0.55); }
  else { KIDS.audio.note(392, 0.14, 0, 0.7); KIDS.audio.note(330, 0.18, 0.06, 0.5); }
};

const stageEl = $id('stage'), bgridEl = $id('bgrid'), turnTagEl = $id('turn-tag'),
      turnTxtEl = $id('turn-txt'), turnIcoEl = $id('turn-tag').querySelector('.t-ico'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let curGame = null;                             // 当前局模型 {cfg,n,board,turn,phase,winline,miss}
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白点击轻提示节流（§0.16，10s）
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;
let aiRun = false;                              // AI 应手进行中（防钩子 aiMove 与内联续体双驱）
let lockUntil = 0;                              // 防重入窗期限（b16 定案：落子后 1000ms 禁偏离）
/* 统一解锁：仅当轮到孩子、无 AI 进行中、无终局演出时解锁（b18：推进断言须等可交互态）
   容差 2ms：setTimeout 可能提前唤醒（verify 页 120ms 窗口误差占比大），
   拒绝临界解锁曾致 locked 永真死锁（竞态实锤）——由 aiTurn 的 while 过线+interval 兜底共防 */
function settleLock() {
  if (state.won || state.demo) return;
  if (!curGame || curGame.phase !== 'play' || curGame.turn === 2 || aiRun) return;
  if (performance.now() < lockUntil - 2) return;
  state.locked = false;
}

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellEl = i => bgridEl.querySelector('.cell[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
function renderBoard() {                         // 棋盘按局重建（n 变化 4↔5）
  const g = curGame;
  bgridEl.innerHTML = '';
  bgridEl.style.setProperty('--n', g.n);
  bgridEl.classList.remove('over');
  for (let i = 0; i < g.n * g.n; i++) {
    const b = document.createElement('button');
    b.className = 'cell';
    b.dataset.i = i;
    b.setAttribute('role', 'gridcell');
    b.setAttribute('aria-label', '第' + ((i / g.n | 0) + 1) + '行第' + (i % g.n + 1) + '列');
    bgridEl.appendChild(b);
  }
  renderStatus();
}
function renderStatus() {
  const g = curGame;
  if (!g) return;
  if (g.phase !== 'play') {
    turnTagEl.classList.remove('thinking');
    turnIcoEl.innerHTML = g.phase === 'lose' ? ICONS.turnFoe : ICONS.turnMe;
    turnTxtEl.textContent = g.phase === 'win' ? '四个连上啦！' :
      g.phase === 'lose' ? '兔子赢啦，再来一局' : '平局，下一局';
    return;
  }
  if (g.turn === 1) {
    turnTagEl.classList.remove('thinking');
    turnIcoEl.innerHTML = ICONS.turnMe;
    turnTxtEl.textContent = '轮到你啦，点一个空格';
  } else {
    turnTagEl.classList.add('thinking');
    turnIcoEl.innerHTML = ICONS.turnFoe;
    turnTxtEl.textContent = '兔子在想';
  }
}
function placeStone(who, i) {                    // 落子：board 更新 + 棋子弹入 + last 标记 + 落子音
  const g = curGame;
  g.board[i] = who;
  bgridEl.querySelectorAll('.cell.last').forEach(e => e.classList.remove('last'));
  const el = cellEl(i);
  if (el) {
    const st = document.createElement('span');
    st.className = 'stone';
    st.innerHTML = stoneSvg(who, 64);
    el.appendChild(st);
    el.classList.add('last');
  }
  dropSfx(who);
}
function renderWin(cls) {                        // 四连线高亮 + 其余棋子压暗
  const g = curGame;
  bgridEl.classList.add('over');
  (g.winline || []).forEach(i => { const el = cellEl(i); if (el) el.classList.add(cls); });
}
function renderStep() {                          // HUD 本关 5 局进度点
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

/* ================= 脚手架与救援视觉 ================= */
function clearScaffold() {
  bgridEl.querySelectorAll('.breathe,.pulse').forEach(e => e.classList.remove('breathe', 'pulse'));
}
function breatheCell(i) { const el = cellEl(i); if (el) el.classList.add('breathe'); }
function pulseCell(i) {
  const el = cellEl(i);
  if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
}
/* 答案级（miss>=2 常驻，b18 定案）：轮到孩子时可制胜点 breathe，否则必堵点 breathe */
function applyScaffold() {
  clearScaffold();
  if (!curGame || curGame.phase !== 'play' || curGame.turn !== 1) return;
  if (curGame.miss < 2) return;
  const wp = winPointsFor(curGame.board, curGame.n, 1);
  if (wp.length) { breatheCell(wp[0]); return; }
  const fp = winPointsFor(curGame.board, curGame.n, 2);
  if (fp.length) breatheCell(fp[0]);
}
/* 方向级（负局 miss==1 重开）：中心格 pulse 提示开局方向（不直接给答案） */
function scaffoldDirection() {
  if (!curGame || curGame.phase !== 'play') return;
  const n = curGame.n, h = n >> 1;
  pulseCell(h * n + h);
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
  clearScaffold();                               /* 指新目标前清全部旧 breathe（家族 P1-3 教训） */
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 700);
}
/* 教学"帮"指向：当前局面 solver 推荐点（教下法；AI 回合时指 AI 上一手附近不指——只在玩家回合指） */
function pointHelpNext() {
  if (!curGame || curGame.phase !== 'play' || curGame.turn !== 1) return;
  const i = engSolverPick(curGame.board, curGame.n);
  if (i == null) return;
  pointGhostAt(cellEl(i));
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 局加载 ================= */
function startGame(carryMiss) {
  clearTimeout(helpTimer);
  ghost.hide();
  aiRun = false;
  lockUntil = 0;                                 /* 新局=新的防重入周期（AI 先手开局不受旧窗拖累） */
  const cfg = cur.games[cur.step];
  curGame = { cfg: cfg, n: cfg.n, board: new Array(cfg.n * cfg.n).fill(0),
    turn: cfg.first, phase: 'play', winline: null, miss: carryMiss || 0 };
  renderBoard();
  renderStep();
  clearScaffold();
  if (curGame.turn === 2 && !state.demo) aiTurn(false);   /* AI 先手局：fire-and-forget 开局（内部 think 延迟+身份守卫） */
  applyScaffold();                                        /* miss>=2 重开：答案级常驻（空盘自然无点） */
  scaffoldDirection();                                    /* miss==1 重开：中心 pulse 方向级 */
}
function openingSpeak(turn) {                    /* 开场链（§0.5/§0.6）：hint 或交接 turn（单段 queue 单通道——审查 m2 对齐家族） */
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key]);
}
function startLevel(flat) {
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  startGame(false);
  renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.gomoku4 && sv.gomoku4.tutSeen);
  if (VERIFY) { openingSpeak(false); return; }   // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak(false);
}

/* ================= 兔子 AI 应手（假思考 → 落子 → 负局/平局结算）
   aiRun 防双驱（内联续体 vs GK.aiMove 钩子）；身份守卫（cur/curGame await 后比对）。
   尾部等待防重入窗走满（AI think 600ms < 1000ms 时补足——b16 定案禁偏离） ================= */
async function aiTurn(demo) {
  if (!curGame || curGame.phase !== 'play' || curGame.turn !== 2 || aiRun) return false;
  const run = cur, g = curGame;
  aiRun = true;
  state.locked = true;                           // AI 期吞输入（点击→pop §0.22）
  const think = demo ? 400 * SPEED : thinkMs(g) * SPEED;   // demo 演出快放（watch ≤16s）
  await wait(think);
  if (cur !== run || curGame !== g) { aiRun = false; return false; }
  const i = demo ? engDemoPick(g.board, g.n, 99) : engAiPick(g.board, g.n, g.cfg.aiMode, g.cfg.aiSeed);
  if (i == null || g.board[i] !== 0) { aiRun = false; return false; }
  placeStone(2, i);
  if (!demo) window.__gkAiMoves = (window.__gkAiMoves || 0) + 1;   /* verify 观测：真 AI 应手计数 */
  const w = engScanWin(g.board, g.n);
  if (w) {                                       // 兔子四连 → 负局：零惩罚重下
    aiRun = false;
    return await loseGame(g, w);
  }
  if (g.board.indexOf(0) < 0) {                  // AI 落子满盘 → 平局过题
    aiRun = false;
    return await endGame(g, 'draw', null, demo);
  }
  g.turn = 1;
  renderStatus();
  aiRun = false;
  while (performance.now() < lockUntil) {        // 防重入窗：孩子落子起 1000ms（AI 先手局无此限）
    await wait(Math.max(4, lockUntil - performance.now()));   // while 过线：防 timer 提前唤醒
    if (cur !== run || curGame !== g) return 'ai';
  }
  settleLock();
  applyScaffold();                               // miss>=2：轮到孩子 → 答案级 breathe
  return 'ai';
}

/* ================= 落子主路径（真实点击 / GK.tapCell / autoSolve / 教学演示共用）
   demo=true 仅教学"看"演示通道（豁免 locked 门，batch5 M1 教训） ================= */
async function uiPlay(i, demo) {
  if (!cur || !curGame || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) {                                 /* 吞输入期轻叮+格子闪（§0.22+试玩 P4：无声环境下须有可见反馈） */
      sfx('pop');
      const el = cellEl(i);
      if (el) { el.classList.add('breathe'); setTimeout(() => el.classList.remove('breathe'), 600); }
    }
    return false;
  }
  if (curGame.phase !== 'play') return false;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= curGame.n * curGame.n || curGame.board[i] !== 0) return false;
  if (curGame.turn !== 1) { if (!demo) sfx('pop'); return false; }   /* AI 回合点棋盘轻叮 */
  const run = cur, g = curGame;
  lastAct = Date.now();                          /* 孩子落子=主交互，重置救援钟（§0.7a） */
  clearScaffold();
  placeStone(1, i);
  state.locked = true;                           /* 防重入窗 1000ms（b16 定案禁偏离） */
  lockUntil = performance.now() + 1000 * SPEED;
  const w = engScanWin(g.board, g.n);
  if (w) return await endGame(g, 'win', w, demo);
  if (g.board.indexOf(0) < 0) return await endGame(g, 'draw', null, demo);
  g.turn = 2;
  renderStatus();
  const r = await aiTurn(demo);                  /* 内联 AI 应手（负局/平局在内结算并换 curGame；尾部等满防重入窗） */
  if (cur !== run) return r || false;            /* 身份守卫：演出窗内重玩已重建关卡 */
  if (curGame === g) {                           /* 正常回到孩子回合（aiTurn 已等满窗解锁） */
    if (state.tut === 'help') scheduleHelpGhost(300);
    return 'moved';
  }
  /* curGame 已换（负局重开/平局推进）：结算演出 1300/1400ms 已覆盖防重入窗，新局可交互 */
  return r || false;
}

/* ================= 局结算 ================= */
/* 胜/平：金圈四连（胜）或全盘定格（平）→ 过题推进（末局=winFlow） */
async function endGame(g, kind, w, demo) {
  const run = cur;
  g.phase = kind === 'win' ? 'win' : 'draw';
  g.winline = w ? w.line : null;
  renderStatus();
  if (kind === 'win') {
    renderWin('wincell');
    sfx('win');
    sayR(VOICE.right.key, VOICE.right.text);     /* 己方胜=核心反馈每局一次 */
  } else {
    sfx('fail');
    sayR(VOICE.draw.key, VOICE.draw.text);
  }
  await wait(1300 * SPEED);
  if (cur !== run) return kind === 'win' ? 'right' : 'draw';
  if (demo) return kind === 'win' ? 'right' : 'draw';   /* 教学/演示：不推进（tutorialWatch 收尾重发） */
  if (state.tut === 'help') {                    /* 教学"独"：首次成四放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbitBtn();
  }
  cur.step++;
  if (cur.step >= cur.games.length) {
    cur.done = true;
    winFlow();
    return 'done';
  }
  startGame(false);                              /* 演出 1300ms 已覆盖防重入窗，新局可交互 */
  settleLock();
  return kind === 'win' ? 'right' : 'draw';
}
/* 负局：红圈四连 → sayW(gk_lose) → miss+1 → 零惩罚重下同局（不推进；换先手——审查 M2：
   SPEC §2 挫败兜底链「重下→换我先下」，ch3 AI 先手受挫的孩子可抢回先手；连负交替换） */
async function loseGame(g, w) {
  const run = cur;
  const willMiss = g.miss + 1;
  g.phase = 'lose';
  g.winline = w.line;
  renderStatus();
  renderWin('losecell');
  sfx('fail');
  sayW(VOICE.lose.key, VOICE.lose.text, willMiss === 1);   /* 首负 force 豁免恰一次（§0.5 三态） */
  await wait(1400 * SPEED);
  if (cur !== run) return 'wrong';
  g.miss = willMiss;
  cur.retries++;                                 /* 星级口径：负局=1 错 */
  window.__gkLoseSeen = true;                    /* verify 负局路径观测点 */
  g.cfg.first = g.cfg.first === 1 ? 2 : 1;       /* 换先手（M2）：重开翻转 first——先手台阶 */
  startGame(willMiss);                           /* 重开同局（carry 数字 miss：梯度脚手架分级） */
  settleLock();                                  /* 演出 1400ms 已覆盖防重入窗——防假卡死（b18 教训） */
  if (state.tut === 'help') scheduleHelpGhost(400);
  return 'wrong';
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
  clearTimeout(helpTimer);
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

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.gomoku4.tutSeen）
   看=演示连四取胜一局快放（4×4 首行连四，demo AI 避让不堵）→ 重发同关
   → 帮=幽灵手指指 solver 推荐点 → 独=首次成四放手。
   演示真实生效实证 window.__gkDemoR='right'（§0.27）；
   watch 时长核算：语音~1.5s+7 步演出~8.5s+胜演出 1.3s ≈ 11.3s ≤16s（SPEC 任务指示） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  let demoR = null;
  for (let k = 0; k < DEMO_LINE.length; k++) {
    const i = DEMO_LINE[k];
    if (curGame && curGame.board[i] !== 0) break;        /* 防御：演示线被占（理论不可达） */
    pointGhostAt(cellEl(i));
    await wait(750 * SPEED);
    ghost.press();
    await wait(300 * SPEED);
    ghost.hide();
    state.demo = false;                                  /* 临时走真实路径（demo 通道豁免 locked） */
    state.locked = false;
    demoR = await uiPlay(i, true);                       /* 内联 demo AI 应手（400ms 快放） */
    state.demo = true;
    state.locked = true;
    if (demoR === 'right') break;                        /* 第四子成四：演示胜（'right'） */
    await wait(360 * SPEED);
  }
  window.__gkDemoR = demoR;                              /* 演示生效实证（§0.27） */
  const sv = KIDS._save();                               /* 真实页 save 恒非 null；verify 直驱跳过写档 */
  if (sv) {
    sv.gomoku4 = sv.gomoku4 || {};
    sv.gomoku4.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 交接语音 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  startGame(false);                                      /* 确定性关卡：同一关局配置一致（棋盘清零） */
  renderDots();
  state.quiet = false;
  openingSpeak(true);                                    /* 交接：gk_tut_turn（§0.6 单通道） */
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbitBtn() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbitBtn();                                       /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 pop+hop 不静默 */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20+§0.22 吞输入轻叮 */
  lastAct = Date.now();
  startLevel(cur.flat);                                 /* 重玩整关（确定性同配置） */
});
hearBtn.addEventListener('pointerdown', e => {           /* 听提示：播 gk_hint（主动学习重置救援钟 §0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  sayR(VOICE.hint.key, VOICE.hint.text);
});
bgridEl.addEventListener('pointerdown', e => {           /* 棋盘：点空格落子主路径（吞输入 pop 在 uiPlay 内） */
  const el = e.target.closest('.cell');
  if (!el) return;
  e.preventDefault();
  if (!cur || !curGame) return;
  uiPlay(Number(el.dataset.i));
});
stageEl.addEventListener('pointerdown', e => {           /* 点舞台空白（非棋盘/按钮）：10s 节流轻提示（§0.16） */
  if (e.target.closest('button') || e.target.closest('#bwrap') || e.target.closest('#statusbar')) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 吞输入期轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.21：播提示 + 可制胜点/必堵点 breathe）
   / 教学"帮"5s 重演示一次。救援钟只被孩子落子/听提示重置（§0.7a：AI 落子/空白/兔子不重置）；
   仅孩子可操作态计时（AI 期/演出窗/终局不触发） ================= */
function rescueAct() {
  rescueCount++;
  sayR(VOICE.hint.key, VOICE.hint.text);
  clearScaffold();
  const wp = winPointsFor(curGame.board, curGame.n, 1);   /* 可制胜点 breathe（救援=答案级，SPEC §2） */
  if (wp.length) { breatheCell(wp[0]); lastAct = Date.now(); return; }
  const fp = winPointsFor(curGame.board, curGame.n, 2);   /* 必堵点 breathe */
  if (fp.length) { breatheCell(fp[0]); lastAct = Date.now(); return; }
  const h = curGame.n >> 1;                              /* 都无：中心 pulse 方向级 */
  pulseCell(h * curGame.n + h);
  lastAct = Date.now();
}
setInterval(() => {
  if (!cur || !curGame || state.won || state.demo) return;
  settleLock();                                  /* 解锁兜底（verify 页同样执行）：settle 临界遗漏 1s 内恢复 */
  if (VERIFY || state.locked) return;            /* verify 页不走真实救援/重演示（SPEED 口径外） */
  if (curGame.phase !== 'play' || curGame.turn !== 1) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueAct();
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
  KIDS.init({ game: 'gomoku4', title: '四子棋' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐，b15 审查 M3） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.GK = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.games.length,
      step: cur.step, retries: cur.retries, done: cur.done,
      won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || !curGame || cur.done) return null;
    return { N: curGame.n, board: curGame.board.slice(), turn: curGame.turn,
      phase: curGame.phase, winline: curGame.winline ? curGame.winline.slice() : null,
      step: cur.step, miss: curGame.miss };
  },
  tapCell(i) { return uiPlay(i); },
  aiMove() {                                             /* 测试钩子：手动驱动 AI 应手一步 */
    if (!cur || !curGame || curGame.phase !== 'play' || curGame.turn !== 2 ||
        state.won || state.demo || aiRun) return false;
    return aiTurn(false);
  },
  start(flat) {                                          /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                                    /* UI 路径自动通关：solver 驱动孩子侧逐局取胜 */
    const run = cur;
    let taps = 0, guard = 0;
    while (cur && cur === run && !cur.done && guard++ < 400) {
      if (!curGame || curGame.phase !== 'play') { await wait(100); continue; }   /* 演出窗密集轮询（b18：fire-and-forget 后轮询） */
      if (curGame.turn === 2) {
        if (!aiRun) aiTurn(false);                       /* AI 先手开局兜底驱动 */
        await wait(100);
        continue;
      }
      if (state.locked) { await wait(60); continue; }    /* 推进断言等可交互态（b18 教训） */
      const i = engSolverPick(curGame.board, curGame.n);   /* 与引擎直驱同函数（必胜确定性） */
      if (i == null) break;
      const r = await uiPlay(i);
      taps++;
      if (r === false) break;
    }
    return { done: !!(cur && cur.done && cur === run), taps: taps,
      retries: cur ? cur.retries : null, stars: cur ? engStars(cur) : 0 };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
