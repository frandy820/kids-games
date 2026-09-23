/* ================= stack 主逻辑（塔区渲染 / 点列放置 / 倒塌重搭 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH18 §2）：地基+待放楼层块序列（宽 2-4 格+颜色；风摆块带 wind ±1）
   → 点底部格子列放置，块落到当前最高层上。全部楼层放完且塔不倒=celebrate+下一题；
   某层偏移超平衡域=倒塌动画（块翻滚散落+塔身晃）+从倒塌层重搭零惩罚（misses+1）。
   §0.26 倒塌防重入窗 1000ms + 身份守卫（const run=cur，await 后 cur!==run 丢弃旧续体）。
   §0.7a 口径：放稳一块（placed/win）重置救援钟；错点/空白/兔子不重置；听题重置。
   教学（仅 flat0 首次）：看=地基高亮→幽灵手指点安全列演示放 1-2 块→塔立（≤16s）
   →演示结果存 window.__stDemoR（§0.27）→重发同关→帮=指安全列；独=放手。
   验收钩子：window.ST = { get currentLevel, get quiz(){cols,floors[],placed[],wind,
   phase('placing'|'falling'|'win'),step,miss}, tapCol(c), start(flat), async autoSolve(),
   get tutorial, get rescues }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/教学/风摆提示不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每次倒必播；flat≥3 走 10s 节流；miss===2 force 豁免恰一次 */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const stageEl = $id('stage'), chipEl = $id('prompt-chip'), sceneEl = $id('scene'),
      colbarEl = $id('colbar'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, phase: 'placing' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 听题 3s 节流
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;                            // 救援触发计数（ST.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const colBtnEl = c => colbarEl.querySelector('.colbtn[data-c="' + c + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  colbarEl.innerHTML = '';
  for (let c = 0; c < GRID.cols; c++) {
    const b = document.createElement('button');
    b.className = 'colbtn';
    b.dataset.c = c;
    b.setAttribute('aria-label', '第' + (c + 1) + '列放置');
    b.innerHTML = '<span class="cell"></span><span class="cn">' + (c + 1) + '</span>';
    colbarEl.appendChild(b);
  }
}

/* ================= 渲染 ================= */
/* 题面：三层小楼图 + 章型问句（题面句 TTS 兜底豁免 clip） */
function renderChip() {
  chipEl.className = '';
  chipEl.innerHTML = '<span class="mini">' + ICONS.towerMini + '</span>' +
    '<span class="ask">' + qAsk(cur.dch) + '</span>';
}
function renderScene(q, opts) {
  sceneEl.innerHTML = sceneSvg(q, opts || {});
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
/* 题面句=T46 阶段2 clip 化：st_q_1..4 全在册（章问句静态域）；ASKS 域外 dch 落
   st_q_1——与 qAsk 的 ASKS[1] 兜底同源（play 带原文，缺 clip 仍可 TTS 兜底=防御死分支） */
const qAskKey = dch => ASKS[dch] ? 'st_q_' + dch : 'st_q_1';
function askSpeak() {
  const q = cur && cur.quizzes[cur.step];
  if (q) KIDS.voice.play(qAskKey(cur.dch), qAsk(cur.dch));
}
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip），queue 单通道顺序播 */
function openingSpeak(turn) {
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key]);
}
/* 换题渲染（题面/塔区/进度点）；风摆块成为当前块时播 st_wind（教学关键提示不受 flat 门） */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip();
  renderScene(q, {});
  renderStep();
  const f = q.floors[q.step];
  if (f && f.wind) sayWindDir(f.wind);
  if (!VERIFY && !state.demo && !state.quiet) askSpeak();   /* 换题读题面（T46 clip st_q_） */
}

/* ================= 点列放置主路径（真实点击 / ST.tapCol / autoSolve / 教学演示共用）
   demo=true 仅教学"看"演示通道（豁免 locked 门，batch5 M1 教训） ================= */
async function uiTapCol(c, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) sfx('pop');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engPlace(cur, c);
  if (r === null) return false;
  if (r === 'fall') {                            // 倒塌：块翻滚散落+塔身晃，零惩罚重搭
    state.phase = 'falling';
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);   /* miss 首达 2 豁免恰一次（§0.5） */
    renderScene(q, { fallout: true, fallCol: c });
    state.locked = true;                         /* 防重入窗（§0.26：连点一次倒只记一次 miss） */
    await wait(1000 * SPEED);                    /* b16 定案 1000ms */
    if (cur !== run) return r;
    state.phase = 'placing';
    state.locked = false;
    renderScene(q, {});                          // 当前块回悬停位（placed 保留，从倒塌层重搭）
    if (state.tut === 'help') scheduleHelpGhost(300);
    /* 试玩 P1：连倒时孩子瞎猜方向——倒塌恢复后立即闪一次安全列（复用救援视觉，
       不计救援数不重置钟；孩子看得到「往哪放不倒」，试错有锚点） */
    { const seq = solveSeq(q); if (seq && seq.length) breatheCol(seq[0]); }
    return r;                                    // 错点不重置救援钟（§0.7a）
  }
  /* ---- 放稳：块落到塔顶 + 轻反馈 → 下一块/下一题（放稳重置救援钟 §0.7a） ---- */
  lastAct = Date.now();
  if (state.tut === 'help') {                    // 教学"独"：首次放稳 → 强化反馈放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  clearColBreathe();
  state.phase = 'placing';
  sfx(r === 'win' ? 'ok' : 'coin');
  if (r === 'placed') sayP(VOICE.place.key, VOICE.place.text);
  renderScene(q, { drop: true });
  const nxt = q.floors[q.step];
  if (nxt && nxt.wind) sayWindDir(nxt.wind);   /* 风摆块登场提示 */
  state.locked = true;
  await wait((r === 'win' ? 860 : 520) * SPEED);
  if (cur !== run) return r;
  if (r === 'win') {                             // 本题楼层放完塔立：st_right+打勾 → 推进
    state.phase = 'win';
    sayR(VOICE.right.key, VOICE.right.text);
    renderScene(q, { done: true });
    await wait(880 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    state.phase = 'placing';
    if (cur.done) winFlow();
    else renderQuiz();
    return r;
  }
  state.locked = false;
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
  clearTimeout(helpTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);   // 写档在 celebrate then 内
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
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, phase: 'placing' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.stack && sv.stack.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音顺序链（§0.5） */
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
/* 风摆登场提示：st_wind clip+既有风向大红箭头（「哪边」信息由视觉承载——
   clip 与 TTS 双通道叠播有混音风险，动态方向句不叠 say，试玩 P2 处置记录） */
function sayWindDir(wind) {
  sayR(VOICE.wind.key, VOICE.wind.text);
}
function clearColBreathe() {
  colbarEl.querySelectorAll('.breathe').forEach(e => e.classList.remove('breathe'));
}
function breatheCol(c) {
  const el = colBtnEl(c);
  if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
}
/* 教学"帮"指向：当前块的一个安全放置列 breathe + 手指（本款认知脚手架=往哪放不倒） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const seq = solveSeq(q);
  if (!seq || !seq.length) return;
  clearColBreathe();
  breatheCol(seq[0]);
  pointGhostAt(colBtnEl(seq[0]));
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.stack.tutSeen）
   看=看地基（高亮）→幽灵手指点安全列演示放 1-2 块（demo 通道真实路径 uiTapCol）→塔立
   →重发同关 → 帮=指安全列；独=首次放稳放手。紧凑演示 ~8s（≤16s §0.30） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  renderScene(q, { litBase: true });             // 看地基：石色地基呼吸高亮
  await wait(1000 * SPEED);
  const demoN = Math.min(2, q.floors.length - 1);   // 演示放 1-2 块（留块给孩子）
  let allRight = true;
  for (let k = 0; k < demoN; k++) {
    const seq = solveSeq(q);
    if (!seq || !seq.length) { allRight = false; break; }
    breatheCol(seq[0]);
    pointGhostAt(colBtnEl(seq[0]));
    await wait(900 * SPEED);
    ghost.press();
    await wait(280 * SPEED);
    const r = await uiTapCol(seq[0], true);      // demo 通道豁免 locked（演示吞输入）
    if (r !== 'placed' && r !== 'win') allRight = false;
    await wait(560 * SPEED);
  }
  window.__stDemoR = allRight ? 'right' : 'fall';   /* §0.27 演示生效实证：verify 断言 ==='right' */
  renderScene(q, { litBase: true, done: q.solved }); /* 塔立：保留地基光+已完成打勾 */
  await wait(800 * SPEED);
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.stack = sv.stack || {};
    sv.stack.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  clearColBreathe();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true, phase: 'placing' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip（§0.6 单通道）
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
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 pop+hop 不静默 */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20+§0.22 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }  /* 吞输入轻叮（§0.22） */
  const now = Date.now();
  if (now - lastReplayAt < 3000) return;
  lastReplayAt = now;
  lastAct = Date.now();                          /* 重听题面=主动学习动作，重置救援钟（§0.7a） */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  askSpeak();                                    /* 再听一遍：题面句 TTS */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo) { sfx('pop'); return; }   /* 吞输入期点题面卡也轻叮（§0.16） */
  lastAct = Date.now();
  askSpeak();                                    /* 题面卡可点重听（儿童高发探索动作） */
});
colbarEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.colbtn');
  if (!el) return;
  e.preventDefault();
  if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
  uiTapCol(Number(el.dataset.c));
});
stageEl.addEventListener('pointerdown', e => {   /* 点舞台空白（非按钮/非塔区/非题面）：10s 节流轻提示（§0.16） */
  if (e.target.closest('button, #scene, #prompt-chip')) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 吞输入期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（题面重读 TTS+安全列 breathe §0.21）
   / 教学"帮"5s 重演示一次。救援钟只被放稳/听题重置（§0.7a：错点/空白/兔子不重置） ================= */
function rescueAct(q) {
  rescueCount++;
  askSpeak();                                    // 救援=重读题面（TTS）
  const seq = solveSeq(q);
  if (seq && seq.length) { clearColBreathe(); breatheCol(seq[0]); }   // 安全放置列 breathe
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueAct(q);
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
  KIDS.init({ game: 'stack', title: '搭高楼' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用 §0.8） ================= */
window.ST = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, misses: cur.misses, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                    /* SPEC §2 钩子契约 */
      cols: GRID.cols,                          /* 可放列数 */
      floors: q.floors.map(f => ({ w: f.w, color: COLORS[f.ci], wind: f.wind })),   /* 待放块（拷贝） */
      placed: q.placed.map(p => ({ col: p.col, off: p.off })),                     /* 已放（拷贝） */
      wind: q.floors[q.step] ? q.floors[q.step].wind : 0,   /* 当前风偏格数或 0 */
      phase: state.phase,                       /* 'placing'|'falling'|'win' */
      step: q.step, miss: q.miss };
  },
  tapCol(c) { return uiTapCol(c); },
  start(flat) {                                 /* 测试钩子：跳关（教学看演期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                           /* UI 路径自动通关：逐块点安全列（真实流程） */
    const run = cur;                            // 身份守卫：winFlow 延迟 proceed 换关即中止
    let taps = 0, guard = 0;
    while (cur && cur === run && !cur.done && guard++ < 80) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const seq = solveSeq(q);
      if (!seq || !seq.length) break;
      const r = await uiTapCol(seq[0]);
      taps++;
      if (r === false) break;
    }
    return { done: !!(cur && cur.done && cur === run), taps: taps };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
