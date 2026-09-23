/* ================= slide 主逻辑（拼图盘渲染 / 滑块动画 / 教学 / 救援 / 推进）
   玩法：题面语音「把小兔子的照片拼好吧」，右侧小样恒可见（完成参照）。
   盘面恒正方形（块=网格等分矩形，全百分比布局，resize 免重排），点空格
   相邻块=滑入（left/top transition ≤200ms + sfx）；点非相邻块='wig' 轻晃
   + sli_wrong（零惩罚，1000ms 防重入窗）；全块归位=完整原图盖盘闪现
   + sli_right（自动判定无提交）；5 盘=1 关 celebrate。
   开场/交接语音走顺序链（queue 单通道）：hint（或 turn clip）→ 题面 TTS。
   救援两级（SPEC §2）：14s 方向级=重读题面+空格 pulse；30s 无进展答案级=
   IDA* 独立求解下一步应滑块 breathe（单步提示非全解）。
   验收钩子：window.SL = { get currentLevel, get quiz(){grid W,H,
   tiles[]({id,pos,goal}),blank,moves,step}, tapTile(i), start(flat),
   async autoSolve(), get tutorial }（getter 返回拷贝非活引用）；
   教学演示判对证据 window.__slDemoR（§0.27，verify 断言 'slide'）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每次必播；flat≥3 走 10s 节流；force=豁免恰一次（===2 防变每次必播） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const boardEl = $id('board'), miniArtEl = $id('mini-art'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let actAt = Date.now(), dirAt = Date.now();     // 救援双钟：答案级 30s（仅有效滑动重置 §0.7a）/方向级 14s
let lastBlankHint = 0;                          // 点空白 10s 节流（§0.16）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const tileEl = id => boardEl.querySelector('.tile[data-id="' + id + '"]');
const blankEl = () => boardEl.querySelector('.blankcell');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  $id('mini').querySelector('.cap').innerHTML = ICONS.frame;
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：滑入=短滑音双音 / wig=低柔单音 / 复原一题=叮咚 */
const chimeSlide = () => { if (!VERIFY) { KIDS.audio.note(620, 0.09, 0, 0.4); KIDS.audio.note(830, 0.13, 0.05, 0.45); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(500, 0.09, 0, 0.28); };
/* 吞输入可见回应（b21 沉淀③：轻叮必配 bump 微动效） */
function bumpBoard() {
  boardEl.classList.remove('bump'); void boardEl.offsetWidth; boardEl.classList.add('bump');
}

/* ================= 题面语音（读题 sayR 级不受 flat 门；T46 阶段2 clip 化=sli_q）
   开场/交接顺序链（§0.5/§0.6）：queue 单通道——hint（或 turn clip）播完接题面 */
function speakQuiz() { KIDS.voice.play(VOICE.quiz.key, VOICE.quiz.text); }
function openingSpeak(turn) {
  if (!cur || !cur.quizzes[cur.step]) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key, { key: 'sli_q', text: quizSpeech() }]);
}

/* ================= 渲染（全百分比布局：块=网格等分矩形，resize 免重排；
   .art 相对块恒静止——块内显示完整 SVG 图的对应区域，滑入=块 left/top 位移） */
function setTilePos(el, pos, q) {
  el.style.left = ((pos % q.W) * 100 / q.W) + '%';
  el.style.top = (Math.floor(pos / q.W) * 100 / q.H) + '%';
}
/* 盘面恒正方形：量 boardwrap 可用空间给 #board 设显式 px（子元素全 absolute
   不撑开父级，必须显式尺寸；tile 全百分比 → resize 重排仅此一处） */
function layoutBoard() {
  const wrap = $id('boardwrap');
  const S = Math.max(140, Math.floor(Math.min(wrap.offsetWidth, wrap.offsetHeight)) - 8);
  boardEl.style.width = S + 'px';
  boardEl.style.height = S + 'px';
}
function renderScene(q) {
  layoutBoard();
  boardEl.innerHTML = '';
  const art = PICS[picOf(cur.flat)];
  /* 空格软框（不可点，救援方向级 pulse 靶） */
  const bEl = document.createElement('div');
  bEl.className = 'blankcell pop';
  bEl.style.width = (100 / q.W) + '%'; bEl.style.height = (100 / q.H) + '%';
  setTilePos(bEl, q.blank, q);
  boardEl.appendChild(bEl);
  /* 拼图块（id 序，块上禁数字标号——图块纹理=线索，aria 无数字） */
  q.posOf.forEach((pos, id) => {
    const b = document.createElement('button');
    b.className = 'tile pop';
    b.dataset.id = id;
    b.setAttribute('aria-label', '照片拼图块');
    b.style.width = (100 / q.W) + '%'; b.style.height = (100 / q.H) + '%';
    b.style.animationDelay = (id * 60) + 'ms';
    const c = id % q.W, r = Math.floor(id / q.W);
    const a = document.createElement('div');
    a.className = 'art';
    a.style.width = (q.W * 100) + '%'; a.style.height = (q.H * 100) + '%';
    a.style.left = (-c * 100) + '%'; a.style.top = (-r * 100) + '%';
    a.innerHTML = art;
    b.appendChild(a);
    setTilePos(b, pos, q);
    boardEl.appendChild(b);
  });
  /* 完整原图盖盘层（本题复原闪现） */
  const rv = document.createElement('div');
  rv.id = 'reveal';
  rv.innerHTML = art;
  boardEl.appendChild(rv);
}
function moveBlankCell(q) {
  const b = blankEl();
  if (b) setTilePos(b, q.blank, q);
}
function revealShow() {
  const rv = boardEl.querySelector('#reveal');
  if (rv) { rv.classList.remove('show'); void rv.offsetWidth; rv.classList.add('show'); }
}
function pulseBlank() {
  const b = blankEl();
  if (b) { b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse'); }
}
function renderStep() {                                 // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                                 // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };            // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function renderMini() { miniArtEl.innerHTML = PICS[picOf(cur.flat)]; }
function renderQuiz(skipSpeak) {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet && !skipSpeak) speakQuiz();  /* 开场/换盘读题；demo 门防叠播；skipSpeak=已并入 queue（审查 M2） */
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
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：当前盘下一步应滑块（IDA* 独立求解，非构造路径复读） */
function hintNextTile() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return null;
  const s = solveStep(q);
  return s ? tileEl(s.first) : null;
}
function pointHelpNext() {
  const el = hintNextTile();
  if (el) pointGhostAt(el);
}

/* ================= 滑块点选主路径（真实点击 / SL.tapTile / autoSolve / 教学演示共用）
   uiTapTile(i, demo)：locked 门拦真实输入（吞输入轻叮+bump §0.22/沉淀③）；demo 通道仅教学用 */
async function uiTapTile(i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); bumpBoard(); }              /* 吞输入轻叮+可见回应（零静默） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) { if (!demo) { sfx('pop'); bumpBoard(); } return false; }
  const el = tileEl(i);

  if (r === 'wig') {                             /* 非相邻块：轻晃拒绝（非错误零惩罚，不计数入口径） */
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.wigs === 2);
    if (el) { el.classList.remove('wig', 'breathe'); void el.offsetWidth; el.classList.add('wig'); }
    state.locked = true;
    await wait(1000 * SPEED);                    /* 晃动防重入窗 1000ms（§0.27/§0.26） */
    if (cur !== run) return r;
    state.locked = false;                        /* 不灰化可重点（零惩罚） */
    return r;
  }

  /* ---- 滑入：块位移动画（≤200ms）→ （复原）完整图闪现 ---- */
  actAt = dirAt = Date.now();                    /* 仅有效滑动重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次滑入 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    dockHop();
  }
  state.locked = true;
  chimeSlide();
  if (el) { el.classList.remove('breathe', 'wig'); setTilePos(el, q.posOf[i], q); }
  moveBlankCell(q);
  await wait(210 * SPEED);                       /* 滑入动画 ≤200ms + 余量 */
  if (cur !== run) return r;
  if (r === 'slide') {                           /* 题内滑入未复原：不换盘继续 */
    state.locked = false;
    return r;
  }
  sfx('coin');                                   /* 本题复原：完整原图盖盘 + sli_right */
  revealShow();
  if (r === 'done') {
    sayR(VOICE.right.key, VOICE.right.text);     /* 末题无后续读题，直接播完 */
    await wait(950 * SPEED);
    if (cur !== run) return r;
    winFlow();
    return r;
  }
  KIDS.voice.queue([VOICE.right.key, { key: 'sli_q', text: quizSpeech() }]);  /* 审查 M2：奖励→读题 queue 接力，防 say 打断截尾 */
  await wait(1050 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  renderQuiz(true);                              /* 换盘：读题已并入 queue，跳过 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（b21 沉淀②：hint[i]↔CHAPTERS[i+1]） */
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
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
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
  actAt = dirAt = Date.now();
  renderMini(); renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.slide && sv.slide.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        // verify 页恒走 openingSpeak（stub 记录开场链）
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5） */
}

/* ================= 教学（仅关 1-0 首次，save.slide.tutSeen）：看→帮→独
   看=演示滑 1 块（幽灵手指点+滑动+「空格旁边的才能滑」）→
   帮=IDA* 指向下一应滑块；独=首次滑入放手（SPEC §2；watch ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                      // flat0=ch1 2×2（确定性）
  const s0 = solveStep(q);                       // 演示块=IDA* 下一步应滑块（真实有效步）
  const i1 = s0 ? s0.first : q.path[0];
  KIDS.voice.play(VOICE.adj.key, VOICE.adj.text);   /* 演示规则句（T46 阶段2 clip 化） */
  pointGhostAt(tileEl(i1));
  await wait(1100 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapTile(i1, true);       // demo 通道豁免 locked（演示吞真实输入）——演示滑 1 块
  window.__slDemoR = demoR;                      /* 演示判对真实生效证据（§0.27，verify 断言 'slide'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱跳过写档
  if (sv) {
    sv.slide = sv.slide || {};
    sv.slide.tutSeen = true;
    KIDS.store.persist();
  }
  /* 立即重发同关（确定性关卡，盘面一致），"你来拼一拼"在重发后的盘上说（照 batch5-21） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  actAt = dirAt = Date.now();
  renderMini(); renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            /* 交接顺序链：turn clip → 题面 TTS（queue 单通道） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function dockHop() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  dockHop();                                     /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；点兔子=轻反馈不静默（§0.16） */
    sfx('pop');
    return;
  }
  sayP(VOICE.hint.key, VOICE.hint.text);
  pulseBlank();                                  /* 提示配空格高亮：方向级同款视觉（§0.15 救援视觉） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;
  actAt = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz();                                   /* 再听一遍：题面整句重读 */
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.tile');
  e.preventDefault();
  if (p) {                                       // 拼图块：主答路径
    uiTapTile(Number(p.dataset.id));             /* 吞输入轻叮+bump 在 uiTapTile 门内（§0.22/沉淀③） */
    return;
  }
  /* 空白/空格探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); bumpBoard(); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
    pulseBlank();
  }
});

/* ================= 无操作看护（SPEC §2 两级救援；§0.7a 双钟）
   方向级 14s：重读题面 + 空格 pulse（dirAt 重置，不拦答案级计时）
   答案级 30s 无有效进展：IDA* 下一步应滑块 breathe（单步提示非全解；actAt 重置）
   教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const now = Date.now(), idleAct = now - actAt, idleDir = now - dirAt;
  if (idleAct > (q.W * q.H === 9 ? 20000 : 30000)) {  /* 答案级：3×3 盘 20s 快救（试玩P1），余 30s */
    sayR(VOICE.hint.key, VOICE.hint.text);
    pulseBlank();
    const el = hintNextTile();
    if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
    actAt = dirAt = now;
    return;
  }
  if (idleDir > 14000) {                         /* 方向级：重读题面 + 空格 pulse + 应滑块描边（试玩P2） */
    speakQuiz();
    pulseBlank();
    const he = hintNextTile();
    if (he) { he.classList.remove('hintline'); void he.offsetWidth; he.classList.add('hintline');
      setTimeout(() => he.classList.remove('hintline'), 1300); }
    dirAt = now;
    return;
  }
  if (idleDir > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'slide', title: '滑块拼图' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；b21 沉淀①start 必带） */
window.SL = {
  start(flat) { startLevel(flat); },                     /* 外部切关（verify 页/独立复验共用口径） */
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv,
             n: cur.quizzes.length, plan: cur.plan.slice(), step: cur.step,
             moves: cur.moveTot, kTot: cur.kTot,
             wigs: cur.quizzes.reduce((s, q) => s + q.wigs, 0),
             done: cur.done, won: state.won };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { grid: { W: q.W, H: q.H }, W: q.W, H: q.H, K: q.K,     /* SPEC §2 钩子契约 */
             tiles: q.posOf.map((pos, id) => ({ id: id, pos: pos, goal: id })),
             blank: q.blank, moves: q.moves, wigs: q.wigs, step: cur.step };
  },
  tapTile(i) { return uiTapTile(i); },
  async autoSolve() {                        // UI 路径自动点完当前关（逐盘沿构造复原路 K 步）
    let taps = 0, guard = 0, qi = -1, pi = 0;
    while (cur && !cur.done && guard++ < 200) {   // 5 盘 × K≤20 = 100 tap 上界，guard 200 余量
      if (cur.step !== qi) { qi = cur.step; pi = 0; }
      const q = cur.quizzes[qi];
      if (!q) break;
      const r = await uiTapTile(q.path[pi]);      /* path=构造序反序=K 步复原路（恒合法） */
      taps++;
      if (r === false || r === null) break;       // 锁死/重玩保护
      if (r === 'slide') pi++;
      /* goal/done → 换盘：下轮 step!==qi 重置 pi */
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
