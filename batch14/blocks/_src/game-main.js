/* ================= blocks 主逻辑（等轴测场景渲染 / 四题型点选作答 / 教学 / 推进）
   四题型（SPEC-BATCH14 §1）均点选答案卡（不灰化款）：
   count 数总块（干扰±1/±2）/ fill 补缺损（虚线目标盒，缺 2-6）
   front 正视图图卡（每列 max h）/ top 俯视图图卡（footprint 二值网格）
   答错=晃动零惩罚可重点；sayW force=q.miss===2；救援 14s=重读题面+正确卡 breathe，
   只被正确推进重置（错点/空白/探索不重置，读题按钮重置=主动学习动作 §0.7a）
   教学（仅 flat0 首次）：看=逐柱点数演示（柱高亮+柱底角标显该柱块数，被遮挡也要数的具象化）
   →演示答对（demoR 存 window.__bkDemoR §0.27）→帮=幽灵手指指正确卡→独=放手
   验收钩子：window.BK = { get currentLevel, get quiz(){kind,cols,goal,options,answerIdx,
   step,miss}, tapAnswer(i), async autoSolve(), get tutorial, get rescues }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/教学不受 flat 门限制（§0.5） */
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

const stageEl = $id('stage'), chipEl = $id('prompt-chip'), sceneEl = $id('scene'),
      answersEl = $id('answers'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;                            // 救援触发计数（BK.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => answersEl.querySelector('.opt[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 数数音（Web Audio 合成）：逐柱点数=双音上扬 / 演示落卡=coin */
const countHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };

/* ================= 渲染 ================= */
/* 题面：方块堆小图 + 问句（与题面 clip 文案严格一致） */
function renderChip(q) {
  chipEl.className = '';
  chipEl.innerHTML = '<span class="mini">' + ICONS.blocksMini + '</span>' +
    '<span class="ask">' + qVoice(q).text + '</span>';
}
/* 场景：等轴测方块堆（含地面格/fill 虚线目标盒/演示角标，全部 sceneSvg 生成） */
function renderScene(q) {
  const s = sceneSvg(q);
  sceneEl.innerHTML = s.svg;
}
/* 作答区：count/fill=数字大卡 / front=正视图条形图卡 / top=俯视图网格卡（3 选 1，§1 图卡非文字） */
function renderAnswers(q) {
  answersEl.innerHTML = '';
  q.items.forEach((v, i) => {
    const b = document.createElement('button');
    b.dataset.i = i;
    if (q.kind === 'front') {
      b.className = 'opt card';
      b.innerHTML = frontCardSvg(v);
      b.setAttribute('aria-label', '正视图候选 ' + (i + 1) + '：各列高 ' + v.join(','));
    } else if (q.kind === 'top') {
      b.className = 'opt card';
      b.innerHTML = topCardSvg(v);
      b.setAttribute('aria-label', '俯视图候选 ' + (i + 1));
    } else {
      b.className = 'opt';
      b.textContent = String(v);
      b.setAttribute('aria-label', '选 ' + v + ' 个');
    }
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
/* 题面=封闭句单 clip（§0.23）：clip 在场播 clip，缺则整句 TTS 兜底（play 自带） */
function speakQuiz(q) { if (q) KIDS.voice.play(qVoice(q).key, qVoice(q).text); }
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 题面，queue 单通道顺序播 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key, qVoice(q).key]);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip(q);
  renderScene(q);
  renderAnswers(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) KIDS.voice.play(qVoice(q).key, qVoice(q).text);  /* 换题读题 sayR 级 */
}

/* ================= 答题主路径（真实点击 / BK.tapAnswer / autoSolve / 教学演示共用） ================= */
async function uiPick(i, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engPick(cur, i);
  if (r === null) return false;
  const el = optEl(i);
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                        // 仅正确推进重置救援钟（§0.7a）
    if (state.tut === 'help') {                  // 教学"独"：首次答对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
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
    sfx('coin');
    await wait(880 * SPEED);
    if (cur !== run) return r;                   // 演出窗内重玩已重建关卡：丢弃旧续体
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                       // 答错：晃动不灰掉可重点（不灰化款 SPEC §1）
    if (el) { el.classList.remove('wrong', 'breathe'); void el.offsetWidth; el.classList.add('wrong'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);   /* flat<3 每错必播 / ≥3 节流+豁免恰一次（===2） */
    if (q.miss >= 2) {                           // 首错不 pulse：连错 2 次高亮正确卡
      const ok = optEl(q.answerIdx);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    if (state.tut === 'help') pointHelpNext();
    state.locked = true;                         /* 晃动窗防重入：连点一次错只记一次 miss（§0.26） */
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
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
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.blocks && sv.blocks.tutSeen);
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
/* 教学"帮"阶段指向：正确答案卡（数字卡/投影卡同） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(optEl(q.answerIdx));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=逐柱点数演示（前排左→右再到后排：整柱高亮 + 柱底角标显该柱块数 + pop 音——
   "被遮挡的方块也要数"的具象化）→ 正确卡 breathe + 手指演示答对（真实路径 uiPick）→
   重发同关 → 帮=指正确卡；独=首次答对放手。save.blocks.tutSeen 记住演示已放过（§0.6） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const R = q.R, C = q.C;
  /* 点数序：前排（r 大）先、列左→右，再后排（孩子视线从近到远） */
  const order = [];
  for (let r = R - 1; r >= 0; r--) for (let c = 0; c < C; c++) order.push([r, c]);
  for (let k = 0; k < order.length; k++) {
    const r = order[k][0], c = order[k][1];
    sceneEl.querySelectorAll('.cu[data-r="' + r + '"][data-c="' + c + '"]').forEach(el => {
      el.classList.add('lit');
    });
    const bd = sceneEl.querySelector('.dbadge[data-r="' + r + '"][data-c="' + c + '"]');
    if (bd) { bd.style.display = ''; bd.classList.add('on'); }
    countHi();
    await wait(620 * SPEED);
  }
  await wait(560 * SPEED);                       // 全柱角标停留：一共有几个=角标相加
  const okCard = optEl(q.answerIdx);
  if (okCard) { okCard.classList.remove('breathe'); void okCard.offsetWidth; okCard.classList.add('breathe'); }
  pointGhostAt(okCard);
  await wait(900 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false;                            // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  const r = await uiPick(q.answerIdx, true);
  window.__bkDemoR = r;                          /* §0.27 演示生效实证：verify 断言 ==='right' */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.blocks = sv.blocks || {};
    sv.blocks.tutSeen = true;
    KIDS.store.persist();
  }
  /* 立即重发同关（确定性关卡，题面一致），"你来数一数"在重发后的题面上说（照 batch5-13） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip → 题面（§0.6）
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默（§0.16） */
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
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 对齐重玩门/题面防御 */
  lastAct = Date.now();                          /* 重听题面=主动学习动作，重置救援钟（§0.7a batch13 口径） */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整句单 clip */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo) { sfx('pop'); return; }   /* 吞输入期点题面卡也轻叮（§0.16 主视觉区） */
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.opt')) {
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiPick(Number(e.target.closest('.opt').dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return;
  /* 空白/场景探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 救援视觉（§0.21）：正确答案卡 breathe 持续循环在屏 ================= */
function applyRescueVisual(q) {
  const ok = optEl(q.answerIdx);
  if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
}

/* ================= 无操作看护：14s 救援（重读题面+答案视觉 §0.21）/ 教学"帮"5s 重演示一次
   救援钟只被正确推进/重听题面重置（§0.7a：错点/空白不更新 lastAct） ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];
    if (q) {
      speakQuiz(q);                              // 救援=重读题面（§0.21）
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
  KIDS.init({ game: 'blocks', title: '空间积木' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);   /* 试玩 P1-2：重玩落在最后一关（原 first=0 死循环 1-1，通关后 proceed 又停 flat0） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用 §0.8） ================= */
window.BK = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                    /* SPEC §1 钩子契约：secret 不适用，不设 */
      kind: q.kind,                             /* 'count'|'fill'|'front'|'top' */
      R: q.R, C: q.C,                           /* 基底尺寸（行深度×列宽） */
      cols: q.cols.map(r => r.slice()),         /* 柱高二维数组 r×c（拷贝） */
      goal: q.goal ? q.goal.map(r => r.slice()) : null,   /* fill 型目标柱高 */
      options: q.items.map(v => Array.isArray(v) ? v.map(x => Array.isArray(x) ? x.slice() : x) : v),  /* count/fill=数字；front/top=投影序列化 */
      answerIdx: q.answerIdx,
      step: cur.step, miss: q.miss };
  },
  tapAnswer(i) { return uiPick(i); },
  async autoSolve() {                            // UI 路径自动答完当前关（四题型走真实流程）
    let n = 0;
    while (cur && !cur.done && n++ < 30) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      await uiPick(q.answerIdx);
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
