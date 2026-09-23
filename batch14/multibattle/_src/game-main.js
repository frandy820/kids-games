/* ================= multibattle 主逻辑（赛道渲染 / 抢答判定 / 对手钟 / 教学 / 胜负收尾）
   玩法（SPEC-BATCH14 §2）：赛跑对抗。每题一道乘法算式 3 选 1 大数字卡 + 对手答题钟进度条：
   - 孩子先答对→己方进 1 格 + mul_win + 庆祝音（钟即停）
   - 答错→晃动零惩罚可重点（对手钟不停，§0.26 晃动窗防重入）
   - 钟走完→对手进 1 格 + mul_lose 播报，自动下一题（不计 miss 不扣星——超时是慢不是错）
   - 关末：孩子 ≥3 格=胜利庆祝；<3=鼓励收尾"就差一点点，再来一局"（不锁关不惩罚）
     星级=miss 口径（准确性）；胜负=速度，两者分离（SPEC 明示设计意图）
   对手钟真实时长 FOE_MS（verify 页统一乘 SPEED 提速）；教学 watch/demo 期钟冻结（help 起走）；
   对手钟与救援钟独立（超时换题不重置救援钟 lastAct）。
   验收钩子：window.MB = { get currentLevel, get quiz(){a,b,options,answerIdx,step,miss,
   myScore,foeScore,foeT}, tapAnswer(i), async autoSolve(), get tutorial, get rescues } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速（钟同乘，对齐 wait() 口径）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/进格播报/开场任务语音/教学不受 flat 门限制（§0.5；mul_win/mul_lose=核心反馈每题一次） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次——不灰化款 miss 无上限，
   必须 === 2（豁免只在每题 miss 首达 2 时发一次，防豁免变每错必播） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 题面=queue 拼接 clip（§0.23）：全部段 clip 在场走 queue，缺任一走整句 TTS 兜底 */
function sayQ(parts, fullText) {
  if (KIDS.voice.clips && parts.every(p => KIDS.voice.clips[p.key])) {
    KIDS.voice.queue(parts.map(p => p.key));
  } else {
    KIDS.voice.say(fullText);
  }
}

const stageEl = $id('stage'), chipEl = $id('prompt-chip'), answersEl = $id('answers'),
      trackEl = $id('track'), foeClockEl = $id('foe-clock'), fcFillEl = $id('fc-fill'),
      myPosEl = $id('my-pos'), foePosEl = $id('foe-pos'), myScoreEl = $id('my-score'),
      foeScoreEl = $id('foe-score'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastTurnNudge = 0;                            // 帮期换题"你来抢答"重提节流（试玩 P2④）
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;                            // 救援触发计数（MB.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => answersEl.querySelector('.opt[data-i="' + i + '"]');

/* ================= 对手钟（世代计数防竞态；rAF 驱动进度条渐满）
   foeT=剩余比例 0-1（钩子可观测）；钟走完→onFoeTimeout（对手进格零惩罚）；
   教学 demo 期不启动（renderQuiz 门）；答对/换关/关末 stopFoe（foeT 回 1 待走） ================= */
let foeGen = 0, foeT = 1;
function setFoeBar(f) { fcFillEl.style.width = (f * 100) + '%'; }
function startFoe() {
  const gen = ++foeGen;
  const dur = Math.max(200, FOE_MS[cur.dch] * SPEED);   // verify 提速口径=base*SPEED
  const t0 = performance.now();
  const stepFn = () => {
    if (gen !== foeGen) return;                 // 已被 stop/重启：本代作废
    const el = performance.now() - t0;
    foeT = Math.max(0, 1 - el / dur);
    setFoeBar(1 - foeT);
    if (foeT <= 0) { onFoeTimeout(); return; }
    requestAnimationFrame(stepFn);
  };
  requestAnimationFrame(stepFn);
}
function stopFoe() { foeGen++; foeT = 1; setFoeBar(0); }
/* 钟走完：对手进 1 格 + mul_lose 播报 → 自动下一题（engFoe 不计 miss 不扣星，§2） */
async function onFoeTimeout() {
  const run = cur;                              // 身份守卫：演出窗口内重玩会重建 cur
  foeGen++;                                     // 自然到 0：本代终结（防重入）
  foeT = 0; setFoeBar(1);
  foeClockEl.classList.add('full');
  state.locked = true;                          // 吞演出窗点击（点击→pop 轻反馈 §0.22）
  const r = engFoe(cur);
  sfx('fail');
  sayR(VOICE.lose.key, VOICE.lose.text);
  renderTrack(false, true);
  renderStep();
  await wait(820 * SPEED);
  if (cur !== run) { state.locked = false; return; }
  state.locked = false;
  foeClockEl.classList.remove('full');
  if (r === 'foedone') winFlow();
  else {
    renderQuiz();
    if (state.tut === 'help') {                  // 帮期换题：手指重指新题正确卡
      pointHelpNext();
      /* 试玩 P2④：帮期孩子不接手→对手无限连胜无出口——换题重提"你来抢答"（10s 节流） */
      const now = Date.now();
      if (now - lastTurnNudge > 10000) { lastTurnNudge = now; sayR(VOICE.turn.key, VOICE.turn.text); }
    }
  }
}

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  $id('my-bun').innerHTML = KIDS.assets.rabbit('normal', 46) + '<span class="tag">我</span>';
  $id('foe-bun').innerHTML = foeSvg(46) + '<span class="tag">灰兔</span>';
  $id('flagpole').innerHTML = FLAG;
  foeClockEl.querySelector('.face').innerHTML = foeFace;
  trackEl.querySelectorAll('.lane').forEach(lane => {   // 格点刻度：5 格（终点线加粗）
    for (let k = 1; k <= CH_LEN; k++) {
      const t = document.createElement('i');
      t.className = 'tick';
      t.style.left = laneLeft(k);
      lane.appendChild(t);
    }
  });
}
/* 赛道格位：起点 12% → 终点 92%（左端让出计分角标），与 .tick 刻度对齐 */
const laneLeft = s => (12 + s / CH_LEN * 80) + '%';

/* ================= 渲染 ================= */
function renderExpr(q) {
  chipEl.innerHTML = '<span id="expr" aria-label="' + q.a + '乘' + q.b + '等于多少">' +
    '<b>' + q.a + '</b><i>×</i><b>' + q.b + '</b><em>=</em><span id="ex-q">?</span></span>';
}
function renderAnswers(q) {
  answersEl.innerHTML = '';
  q.items.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.dataset.i = i;
    b.textContent = String(v);
    b.setAttribute('aria-label', '选 ' + v);
    answersEl.appendChild(b);
  });
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
/* 赛道：比分角标 + 兔子格位（进格方 hop；纯位置更新不 hop） */
function renderTrack(hopMine, hopFoe) {
  myScoreEl.textContent = cur.myScore;
  foeScoreEl.textContent = cur.foeScore;
  myPosEl.style.left = laneLeft(cur.myScore);
  foePosEl.style.left = laneLeft(cur.foeScore);
  if (hopMine) { myPosEl.classList.remove('hop'); void myPosEl.offsetWidth; myPosEl.classList.add('hop'); }
  if (hopFoe) { foePosEl.classList.remove('hop'); void foePosEl.offsetWidth; foePosEl.classList.add('hop'); }
}
function speakQuiz(q) { if (q) sayQ(quizParts(q), qSpeech(q)); }
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 题面 4 段，queue 单通道顺序播 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key].concat(quizParts(q)));
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderExpr(q);
  renderAnswers(q);
  renderStep();
  renderTrack();
  foeClockEl.classList.remove('full');
  foeT = 1; setFoeBar(0);
  if (!state.demo && !state.won && !cur.done) startFoe();   /* 教学 watch/demo 期钟不走（help 起走） */
  if (!VERIFY && !state.demo && !state.quiet) sayQ(quizParts(q), qSpeech(q));   /* 换题读题 sayR 级 */
}

/* ================= 抢答主路径（真实点击 / MB.tapAnswer / autoSolve / 教学演示共用） ================= */
async function uiPick(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engPick(cur, i);
  if (r === null) return false;
  const el = optEl(i);
  if (r === 'right' || r === 'done') {
    stopFoe();                                   // 抢答成功：钟即停（§2 孩子先答对）
    lastAct = Date.now();                        // 点对重置救援钟（§0.7a 主交互口径）
    if (state.tut === 'help') {                  // 教学"独"：首次答对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbitBtn();
    }
    state.locked = true;
    if (el) {
      el.classList.remove('breathe', 'wrong');
      el.classList.add('right');
      const m = document.createElement('span');
      m.className = 'mark';
      m.innerHTML = ICONS.check;
      el.appendChild(m);
    }
    const qEl = $id('ex-q');
    if (qEl) { qEl.textContent = q.answer; qEl.classList.add('ok'); }
    sfx('coin');
    sayR(VOICE.win.key, VOICE.win.text);         // 己方进格播报（核心反馈）
    renderTrack(true);
    renderStep();
    await wait(880 * SPEED);
    if (cur !== run) return r;                   // 演出窗内重玩已重建关卡：丢弃旧续体
    state.locked = false;
    if (demo) return r;                          // 教学演示：不进下一题渲染（tutorialWatch 随即重发同关，防中间态起钟）
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                       // 答错：晃动不灰掉可重点（对手钟不停，SPEC §2）
    if (el) { el.classList.remove('wrong', 'breathe'); void el.offsetWidth; el.classList.add('wrong'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);   /* flat<3 每错必播 / ≥3 节流+豁免恰一次（===2） */
    if (q.miss >= 2) applyRescueVisual(q);       /* 首错不 pulse：连错 2 次给正确视觉线索 */
    if (state.tut === 'help') pointHelpNext();
    state.locked = true;                         /* 晃动窗防重入：连点一次错只记一次 miss（§0.26） */
    await wait(520 * SPEED);
    /* 题身份守卫（审查 M1）：对手超时在本窗内换题（同 cur 已推进 step）时不解锁——
       旧卡下标对新题判分会白得分/误记 miss，交由 onFoeTimeout 续体收尾解锁 */
    if (cur !== run || cur.quizzes[cur.step] !== q) return r;
    state.locked = false;
  }
  return r;
}

/* ================= 过关推进（胜负分支 → 写档 → 章末/日末）
   星级=engStars（miss 口径）照常给；胜负=myScore≥3 只定收尾演出（§2 两者分离） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（不带"明天："前缀，core 模板自带） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  stopFoe();
  ghost.hide();
  const stars = engStars(cur);
  const win = cur.myScore >= WIN_LINE;
  window.__mbWinBranch = win ? 'win' : 'again';  // 关末胜负文案分支（verify 断言）
  sfx(win ? 'win' : 'fail');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  const afterWin = () => {
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
  };
  if (win) KIDS.ui.celebrate(stars).then(afterWin);
  else againLayer(stars).then(function (replay) {          // 鼓励收尾：不锁关不惩罚（§2）
    if (replay) {
      KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);  /* 先写档保底（审查 m2）：重赛中途退出不丢本局；core 保星 max 下重赛更高星可覆盖 */
      startLevel(cur.flat);                               // 主动再赛一局（进度不回退，重打照常写档）
    }
    else afterWin();
  });
}
/* 鼓励收尾层（<3 格）：星星照给 + "就差一点点，再来一局" + 再来一局按钮；3.6s 自动流转 */
function againLayer(stars) {
  return new Promise(res => {
    const o = document.createElement('div');
    o.className = 'mb-ov';
    o.innerHTML = '<div class="mb-stars">' + '★'.repeat(stars) + '</div>' +
      '<div class="mb-big">' + AGAIN_TEXT + '</div>' +
      '<div class="mb-sub">把算式再算一遍，一定能追上它</div>' +
      '<button class="mb-btn" id="mb-again-btn">再来一局</button>';
    document.body.appendChild(o);
    requestAnimationFrame(() => o.classList.add('show'));
    let done = false;
    const finish = replay => {
      if (done) return;
      done = true;
      o.classList.remove('show');
      setTimeout(() => { o.remove(); res(replay); }, 320);
    };
    o.querySelector('#mb-again-btn').addEventListener('pointerdown', e => { e.preventDefault(); finish(true); });
    setTimeout(() => finish(false), 3600);
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
  stopFoe();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.multibattle && sv.multibattle.tutSeen);
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
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：正确答案卡（SPEC §2 帮=幽灵手指指正确卡，钟走） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(optEl(q.answerIdx));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=演示（对手钟冻结，幽灵手指指正确卡+演示答对进格）→ 重发同关（比分清零）
   → 帮=手指指正确卡（钟起走）→ 独=首次答对放手。
   save.multibattle.tutSeen 记住演示已放过（§0.6）；演示生效实证 window.__mbDemoR（§0.27） ================= */
async function tutorialWatch() {
  stopFoe();                                     // watch 期钟冻结（demo=true 期间不再起钟）
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  pointGhostAt(optEl(q.answerIdx));
  await wait(850 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  ghost.hide();
  state.demo = false;                            // 临时解锁走真实路径演示一次完整抢答演出
  state.locked = false;
  window.__mbDemoR = await uiPick(q.answerIdx, true);   /* 演示实证：真实答对返回 'right'（§0.27） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.multibattle = sv.multibattle || {};
    sv.multibattle.tutSeen = true;
    KIDS.store.persist();
  }
  /* 立即重发同关（确定性关卡，题面一致，比分清零），"你来抢答"在重发后的题面上说（照家族） */
  stopFoe();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();                    // help 起走钟（SPEC §2）
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip → 题面 4 段（§0.6）
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbitBtn() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默（§0.16） */
    sfx('pop');
    hopRabbitBtn();
    return;
  }
  hopRabbitBtn();                                /* 探索点击不重置救援钟（§0.7a） */
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
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 对齐重玩门/题面防御 */
  lastAct = Date.now();                          /* 读题=主动学习动作，重置救援钟（§0.7a 例外口径） */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面 4 段 queue 拼接 */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo) { sfx('pop'); return; }   /* 吞输入期点题面卡也轻叮（§0.16 主视觉区） */
  lastAct = Date.now();                          /* 重听题面=主动学习动作（§0.7a） */
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const o = e.target.closest('.opt');
  if (o) {                                       // 答案卡：抢答主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiPick(Number(o.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip') || e.target.closest('.fc-bar')) { sfx('pop'); return; }  /* 钟条点击轻反馈（审查 m1） */
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 救援视觉（§0.21）：重读题面 + 正确答案卡 breathe 持续循环 ================= */
function applyRescueVisual(q) {
  const ok = optEl(q.answerIdx);
  if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
}

/* ================= 无操作看护：14s 救援（重读题面+答案视觉 §0.21）/ 教学"帮"5s 重演示一次
   救援钟只被正确推进/读题重置（§0.7a）；对手超时换题=系统推进不重置（两钟独立，§2） ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];
    if (q) {
      speakQuiz(q);                              // 救援=重读题面（queue 拼接，§0.21）
      applyRescueVisual(q);
      rescueCount++;
    } else sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'multibattle', title: '乘法对战' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4） */ });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.MB = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done,
      myScore: cur.myScore, foeScore: cur.foeScore,
      won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { a: q.a, b: q.b, options: q.items.slice(), answerIdx: q.answerIdx,
      step: cur.step, miss: q.miss,
      myScore: cur.myScore, foeScore: cur.foeScore, foeT: foeT };
  },
  tapAnswer(i) { return uiPick(i); },
  async autoSolve() {                            // UI 路径自动答完当前关（逐题直接答对，不涉钟等待）
    let n = 0;
    while (cur && !cur.done && n++ < 30) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      await uiPick(q.answerIdx);                 // 答对即 stopFoe，无超时竞争
    }
    return { done: !!(cur && cur.done), picks: n, myScore: cur ? cur.myScore : 0 };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
