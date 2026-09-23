/* ================= hopscotch 主逻辑（河边圆石路径渲染 / 逐格·跳 2 跳步报数 / 教学 / 推进）
   玩法（r7 六章）：圆石格蛇形排布（span10=2 行 / span20=4 行，数字+点数双显），小兔子站当前格；
   题面语音"跳到 N"（mode2 前缀"两块两块跳"，目标格插旗：红旗=往前，蓝旗=往回）。
   点相距恰一个步长的格（mode1=±1，mode2=±2）兔子跳过去 + KIDS.voice.say 报数；
   到目标格=旗帜庆祝；点其余格=兔子摇头零惩罚（mode1 sayW"一格一格跳" / mode2"两块两块跳"）。
   藏格章（dch4/5）途中格数字全藏（点数圆点保留），踩到才亮——起点锚+已跳轨迹+语音读题为支持面，
   r7 已去"连错 2 次 pulse 下一格"逐格发光兜底（救援=14s idle 重读题）。每关 5 题。
   到旗庆祝窗 900ms（=game-data GOAL_MS，r7 时长模型口径；语音窗估计 estMs=n*345+600 家族定版，
   禁 +300 变体——四处同步：game-data 定义 / 本注释 / game-verify 断言 / build.py 字面 assert）。
   验收钩子：window.HOP = { get currentLevel, get quiz(){from,to,dir,mode,span,cur,hidden[]}, tapCell(n), async autoSolve() } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场读题语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 20s 零救援）；
   读题拆段 clip 化（T46 阶段2 hop_p_+hop_n_）→ queue 拼播，缺段 TTS 兜底 */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩共性 P1：安静试错只有视觉晃动）；
   r7：mode2（跳两格章）用 wrong2"两块两块跳"（步长规则不同） */
let lastWrongVoice = 0;
const sayWrong = q => {
  const v = q.mode === 2 ? VOICE.wrong2 : VOICE.wrong;
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(v.key, v.text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(v.key, v.text); }
};
/* T46 阶段2（2026-09-19）：题面拆段 clip 链——全段在册 queue 拼播，缺段整句 TTS 兜底
   （shop-math playChain 先例；段恒在册=防御性死分支） */
const playQuiz = q => {
  const ks = qParts(q);
  if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
  else KIDS.voice.say(qSpeech(q));
};

const fieldEl = $id('field'), pathEl = $id('path'), rabbitEl = $id('rabbit'),
      chipEl = $id('prompt-chip'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点水面空白轻提示节流（§0.16，10s）
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellEl = n => pathEl.querySelector('.cell[data-n="' + n + '"]');
/* 蛇形排布坐标：行=ceil(n/5)，奇数行左→右 / 偶数行右→左（1→5 / 6→10 / 11→15 / 16→20） */
const rowOf = n => Math.ceil(n / COLS);
const colOf = n => { const r = rowOf(n); return r % 2 ? (n - 1) % COLS + 1 : COLS - (n - 1) % COLS; };

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  fieldEl.querySelector('.river').innerHTML = riverSvg();
  rabbitEl.innerHTML = KIDS.assets.rabbit('normal', 200);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 圆石格：按当关 span 重建（span10=2 行 / span20=4 行，每行 5 格蛇形），格间方向箭头由 renderQuiz 按题挂 */
function buildPath(span) {
  pathEl.innerHTML = '';
  pathEl.style.gridTemplateRows = 'repeat(' + (span / COLS) + ',1fr)';
  for (let n = 1; n <= span; n++) {
    const b = document.createElement('button');
    b.className = 'cell';
    b.dataset.n = n;
    b.style.gridArea = rowOf(n) + ' / ' + colOf(n);
    b.innerHTML = '<span class="num">' + n + '</span>' + dotsHtml(n) + '<span class="nxt"></span>';
    b.setAttribute('aria-label', '石头 ' + n);
    pathEl.appendChild(b);
  }
}
/* 跳步音（Web Audio 合成）：跳对=马林巴双音 / 点当前格=低柔单音 / 跳错=更低哑音 / 到旗=叮咚 */
const hopHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1046.5, 0.12, 0.07, 0.4); } };
const hopLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.08, 0, 0.3); };
const hopBad = () => { if (!VERIFY) { KIDS.audio.note(330, 0.1, 0, 0.3); KIDS.audio.note(262, 0.12, 0.08, 0.28); } };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(987.77, 0.18, 0, 0.7); KIDS.audio.note(1318.5, 0.32, 0.09, 0.7); } };

/* ================= 渲染 ================= */
/* 格间方向箭头：mode1=行内顺向小三角+行末下折；mode2=链上格双箭头（»）跨一格指向下一落点 */
function arrowFor(n, q, span) {
  if (q.mode === 2) {
    if (n % 2 !== q.from % 2) return '';               // 非链上格（被跨过的石头）无箭头
    const nx = n + 2 * q.dir;
    if (nx < 1 || nx > span) return '';                // 链尾无箭头
    const nrow = rowOf(nx);
    if (nrow !== rowOf(n)) return 'aD2';               // 跨行折返：下折双箭头
    return colOf(nx) > colOf(n) ? 'aR2' : 'aL2';
  }
  if (n >= span) return '';                            // 末格无箭头
  if (n % COLS === 0) return 'aD';                     // 行末下折
  return rowOf(n) % 2 ? 'aR' : 'aL';
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const back = q.dir < 0, skip = q.mode === 2;
  chipEl.className = (back ? 'back ' : '') + (skip ? 'skip' : '');
  chipEl.innerHTML = '<span class="flagmini">' + (back ? ICONS.flagB : ICONS.flagR) + '</span>' +
    '<div><div class="big">' + (skip ? '两块两块' : '') + (back ? '往回跳，跳到 <b>' : '跳到 <b>') + q.to + '</b></div>' +
    '<div class="sub">' + (skip ? '»» 跳两格' : '蓝旗 · 往回跳 ↩') + '</div></div>';
  for (let n = 1; n <= cur.span; n++) {
    const el = cellEl(n);
    if (!el) continue;
    const isGoal = n === q.to, isHere = n === q._cur;
    const masked = q.hidden.indexOf(n) >= 0 && q._shown.indexOf(n) < 0;
    const arr = arrowFor(n, q, cur.span);
    const off = skip && n % 2 !== q.from % 2;          // mode2 非链上石头减淡（视觉自解释，仍可点）
    el.className = 'cell' + (arr ? ' ' + arr : '') + (off ? ' off' : '') +
      (isGoal ? ' goal' : '') + (isHere ? ' here' : '') + (masked ? ' masked' : '');
    const nxt = el.querySelector('.nxt');
    if (nxt) nxt.innerHTML = arr ? ICONS[arr] : '';
    let fl = el.querySelector('.flag');
    if (isGoal) {
      if (!fl) { fl = document.createElement('span'); el.appendChild(fl); }
      fl.className = 'flag' + (back ? ' back' : '');
      fl.innerHTML = back ? ICONS.flagB : ICONS.flagR;
    } else if (fl) fl.remove();
    el.setAttribute('aria-label', '石头 ' + n + (isGoal ? '，插旗' : ''));
  }
  renderStep();
  placeRabbit(false);
  if (!VERIFY && !state.demo) playQuiz(q);   /* 开场/换题读题（T46 阶段2 拆段链） */
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
  for (let c = 1; c <= Math.max(N_CH, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 小兔子站当前格：依格位置定位（#path inset 偏移换算到 #field 坐标；left/top 过渡=跳） */
function placeRabbit(anim) {
  const q = cur && cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)];
  if (!q) return;
  const el = cellEl(q._cur);
  if (!el) return;
  const w = Math.max(56, Math.round(el.offsetWidth * 0.72));
  rabbitEl.style.width = w + 'px';
  rabbitEl.style.left = Math.round(pathEl.offsetLeft + el.offsetLeft + el.offsetWidth / 2 - w / 2) + 'px';
  rabbitEl.style.top = Math.round(pathEl.offsetTop + el.offsetTop + el.offsetHeight * 0.4 - w * 0.42) + 'px';
  if (anim) { rabbitEl.classList.remove('hoppy'); void rabbitEl.offsetWidth; rabbitEl.classList.add('hoppy'); }
}
window.addEventListener('resize', () => { if (cur) placeRabbit(false); });

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el, reason) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show(reason);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：朝目标方向的下一落点（手口一致引导；到旗即无指向；flat0=dch1 mode1） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cellEl(engNext(q)), 'tut');
}

/* ================= 跳步主路径（真实点击 / HOP.tapCell / autoSolve 共用） ================= */
async function uiTapCell(n, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked，照 countchick M1 修复） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const oldCur = q._cur;                        // 跳步前所站格（"here"圈迁移用）
  const r = engTap(cur, n);
  if (r === null) return false;
  const el = cellEl(n);
  if (r === 'far') {                            // 非步长格（mode1 跳过/相邻越级，mode2 只跳一格）：兔子摇头+该格轻晃，零惩罚
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    rabbitEl.classList.remove('shake'); void rabbitEl.offsetWidth; rabbitEl.classList.add('shake');
    hopBad();
    sayWrong(q);                                /* 6 岁试玩共性 P1：flat≥3 也给纠错语音（10s 节流） */
    await wait(480 * SPEED);                    /* r7：去逐格发光兜底——连错不再 pulse 下一格（救援=14s idle 重读题） */
    return r;
  }
  if (r === 'self') {                           // 点当前所站格：轻晃不计错（"again"型早退）
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
    hopLo();
    return r;
  }
  /* 'step' | 'goal' | 'done'：兔子跳过去 + 报数 + 藏数字格点亮 */
  lastAct = Date.now();                          /* 仅合法跳（含反方向探索）重置救援钟；错点 far 不重置（5.5 岁试玩 P1） */
  if (q.hidden.indexOf(n) >= 0 && el) {         // 点对才亮出数字（数序内化：已跳格轨迹）
    el.classList.remove('masked');
    el.classList.add('reveal');
  }
  const oldEl = cellEl(oldCur);                 // "here"圈：旧格移除、新格加上
  if (oldEl && oldCur !== n) oldEl.classList.remove('here');
  if (el) el.classList.add('here');
  placeRabbit(true);
  hopHi();
  KIDS.voice.play('hop_n_' + n, numCn(n));     // 报数 clip（T46 阶段2；hop_n_1-20 在册，SPEC §3）
  if (state.tut === 'help') {                   // 教学"独"：首次跳对 → 强化反馈放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  if (r === 'step') {
    if (state.tut === 'help') pointHelpNext();
    return r;
  }
  /* 到达目标格：旗帜+庆祝 → 推进 */
  state.locked = true;
  if (el) { el.classList.remove('win'); void el.offsetWidth; el.classList.add('win'); }
  chimeGoal();
  sfx('coin');
  await wait(900 * SPEED);                      // 到旗庆祝窗（=GOAL_MS，r7 时长模型口径）
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = Math.max(0, (flat == null ? cur.flat : flat) | 0);
  /* 预告=接下来首个新关（flat+1）的难度章文案：静态段取其所属章 CHAPTERS 章末预告；
     生成关（家族契约 F）禁"章索引加一取模"字面——须实算 genLevel(f+1).dch 取 GEN_HINTS */
  /* r7 审查 M1（试玩 P2 截图实锤）：章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4 口径）。
     原式 floor((f+1)/CH_LEN)+1 在全部静态章末（f≡4 mod 5）恒多进一章 */
  if (f + 1 < STATIC_LEVELS) return CHAPTERS[Math.floor(f / CH_LEN) + 1].hint;
  return GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：dayEnd 预告传 nextHint(lim-1) */
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
  cur = genLevel(flat);
  buildPath(cur.span);                          // r7：按章 span 重建路径（10/20 格蛇形）
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.hop && sv.hop.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指逐格跳到旗（报数+藏格点亮演示）→独=首次跳对放手（flat0=dch1 mode1 逐格） */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const step = q.mode === 2 ? 2 : 1;
  let pos = q.from;
  while (pos !== q.to) {                        // 逐落点演示（章 1 len≥4 恒 ≥4 步，0 次边界安全）
    pos += (q.to > q.from ? 1 : -1) * step;
    pointGhostAt(cellEl(pos), 'tut');
    await wait(880 * SPEED);
    ghost.press();
    await wait(300 * SPEED);
    await uiTapCell(pos, true);                 // demo 通道豁免 locked
    await wait(430 * SPEED);
  }
  await wait(500 * SPEED);                      // 到旗庆祝窗口
  const sv = KIDS._save();
  sv.hop = sv.hop || {};
  sv.hop.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来跳一跳"在重发后的题面上说（照 countchick m6 修复） */
  ghost.hide();
  cur = genLevel(0);
  buildPath(cur.span);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与场地交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* 反方审查 M1 附带：教学/演出期点兔子不打断 */

  lastAct = Date.now();
  hopRabbit();
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 反方审查 M1：教学/演出/通关期重玩门（防教学续体失控）*/

  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) playQuiz(q);                           /* 读题：题面拆段链（T46 阶段2） */
});
fieldEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.cell');
  if (!el) {                                    // 点水面空白：10s 节流轻提示（§0.16 非主交互轻反馈）
    e.preventDefault();
    if (VERIFY || !cur || state.locked || state.won || state.demo) return;
    if (Date.now() - lastBlankHint > 10000) {    /* 空白点击不重置救援钟（5.5 岁试玩 P1） */
      lastBlankHint = Date.now();
      sayR(VOICE.hint.key, VOICE.hint.text);
    }
    return;
  }
  e.preventDefault();
  uiTapCell(Number(el.dataset.n));
});

/* ================= 无操作看护：14s 救援提示（5.5 岁等待极限 15s 内）/ 教学"帮"5s 重演示一次
   r7 藏格章去逐格发光后，救援口径不变：重读题面（藏格仍可走相邻格到旗，无卡死态） */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 反方审查 m5：救援重读题面（不识字孩子需要任务内容而非催促句） */
    if (q) playQuiz(q); else sayR(VOICE.hint.key, VOICE.hint.text);   /* T46 阶段2 */
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
buildPath(SPAN[1]);
if (!VERIFY) {
  KIDS.init({ game: 'hopscotch', title: '跳格子数数' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：dayEnd 预告传 nextHint(lim-1) */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.HOP = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || { _cur: 0 };
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      span: cur.span, step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      cur: q._cur || 0 };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { type: q.type, from: q.from, to: q.to, dir: q.dir, mode: q.mode, hide: q.hide, /* SPEC §3-r7 钩子契约 */
      span: cur.span, cur: q._cur, len: q.len, hidden: q.hidden.slice(), shown: q._shown.slice(),
      step: cur.step, miss: q._miss || 0 };
  },
  tapCell(n) { return uiTapCell(n); },
  async autoSolve() {                           // UI 路径自动跳完当前关（逐落点走真实流程）
    let hops = 0;
    while (cur && !cur.done && hops < 150) {
      const q = cur.quizzes[cur.step];
      if (!q || q._cur === q.to) break;
      const r = await uiTapCell(engNext(q));
      hops++;
      if (r === false) break;                   // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), hops: hops };
  },
  get tutorial() { return state.tut; }
};
