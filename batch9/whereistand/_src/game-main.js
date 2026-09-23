/* ================= whereistand 主逻辑（动物排队渲染 / 场景点选 / 教学 / 推进）
   玩法：5 只小动物横排或竖排，题面语音问方位（"谁在最上面呀" clip / "从左边数，第二个是谁呀"
   整句 clip），孩子直接点场景中的动物。答错=该动物晃动不灰掉（场景卡全可点，零惩罚），
   首错不 pulse，miss≥2 pulse 正确位。每关 5 题。
   r33 谱（SPEC-R33-WHEREISTAND）：四题型 edge/ordinal/two（两步指令）/flip（参照物翻转，
   动物自身方位）——two/flip 判定同为单步点选（engTap 零改动），题面链式两段 clip
   （过渡态缺 clip=hint 段后静默放弃整句，§R10）。
   开场/交接语音走顺序链（quiet 标志，batch8 worden 定版形态）：edge/ordinal=queue([hint,题面 clip])；
   two/flip=queue([hint,链段1,链段2]) 三段链。
   验收钩子：window.WIS = { get currentLevel, get quiz(){mode,dir,k,dir2,refIdx,animal,orient,line,
   answerIdx,answered}, tapSlot(i), async autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩共性 P1：安静试错只有视觉晃动）；
   force=miss≥2 豁免（连错 2 次恰是 pulse 已亮真卡住时刻，语音与高亮同步——batch8 P1②定版）；
   本款答错不灰掉，同卡可反复点错，豁免自然只在每题 miss 首达 2 时发一次 */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const fieldEl = $id('field'), lineEl = $id('line'), chipEl = $id('prompt-chip'),
      stageEl = $id('stage'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'
let qTimer = null;                              // T46 阶段2 后接力形态退役（恒 null，防御保留防外部引用）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => lineEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  fieldEl.querySelector('.scene').innerHTML = sceneSvg();
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：点对=双音上行+叮咚 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（读题 sayR 级不受 flat 门）
   edge = clip 直播（wis_q_up/down/left/right）；ordinal = 整句 clip wis_ord_*（T46 阶段2）
   two/flip = queue 两段链（r33；过渡态缺 clip 段=core 放弃整句，仅链首可听，SPEC-R33 §R10）
   重入先清接力定时器（开场链 hint→TTS 接力 / 防旧题残留） */
function speakQuiz(q) {
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  if (q.mode === 'edge') {
    const v = VOICE[DIRS[q.dir].q];
    KIDS.voice.play(v.key, v.text);
  } else if (q.mode === 'ordinal') {
    /* T46 阶段2：序数题面整句 clip（wis_ord_<dir>_<k> 4×5=20 全在册） */
    KIDS.voice.play('wis_ord_' + q.dir + '_' + q.k, ordinalCn(q.dir, q.k));
  } else if (q.mode === 'two') {
    /* r33 两步：从X边数第k个（参照）→ 它的Y边（answer） */
    KIDS.voice.queue([WIS2.fromKey(q.dir, q.k), WIS2.goKey(q.dir2)]);
  } else {
    /* r33 flip：参照动物点名 → 它自己的X边（横排镜像/竖排不镜像由答案承载，语音不泄） */
    KIDS.voice.queue([WIS2.nameKey(q.line[q.refIdx]), WIS2.sideKey(q.dir2)]);
  }
}

/* ================= 开场顺序链（§0.5/§0.6，worden 定版形态：quiet 标志防渲染插播）
   edge/ordinal = queue 两段 clip 链；two/flip = queue 三段链（hint+链段1+链段2，r33） */
function openingSpeak() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }   /* 防上一关接力残留切断本关 */
  if (q.mode === 'edge') {
    KIDS.voice.queue([VOICE.hint.key, VOICE[DIRS[q.dir].q].key]);
  } else if (q.mode === 'ordinal') {
    /* T46 阶段2：ordinal 题面 clip 化——原 2000ms TTS 接力改 queue 两段链（无叠音无切断） */
    KIDS.voice.queue([VOICE.hint.key, 'wis_ord_' + q.dir + '_' + q.k]);
  } else if (q.mode === 'two') {
    KIDS.voice.queue([VOICE.hint.key, WIS2.fromKey(q.dir, q.k), WIS2.goKey(q.dir2)]);
  } else {
    KIDS.voice.queue([VOICE.hint.key, WIS2.nameKey(q.line[q.refIdx]), WIS2.sideKey(q.dir2)]);
  }
}

/* ================= 渲染 ================= */
function buildLine() {                           // 排队场景：line[0] 恒 = 最左 / 最上（引擎坐标约定）
  const q = cur.quizzes[cur.step];
  lineEl.className = q.orient;                   // 'horiz' | 'vert'
  lineEl.innerHTML = '';
  q.line.forEach((id, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.setAttribute('aria-label', ANIMALS[id].name);
    b.style.animationDelay = (i * 70) + 'ms';    // 入场 stagger 弹入
    b.innerHTML = animalSvg(id);
    lineEl.appendChild(b);
  });
}
function renderChip(q) {                         // 题面行：方向箭头 + 序数大字（装饰性冗余，指令全语音承载）
  if (q.mode === 'edge') {
    chipEl.innerHTML = '<span class="fdir">' + ICONS[DIRS[q.dir].arrow] + '</span><span class="fq">?</span>';
    chipEl.setAttribute('aria-label', '谁在最' + DIRS[q.dir].cn + '面，点我再听一遍');
  } else if (q.mode === 'ordinal') {
    chipEl.innerHTML = '<span class="fdir">' + ICONS[DIRS[q.dir].arrow] + '</span>' +
      '<span class="fk">第<b>' + q.k + '</b>个</span>';
    chipEl.setAttribute('aria-label', '从' + DIRS[q.dir].cn + '边数第' + q.k + '个，点我再听一遍');
  } else if (q.mode === 'two') {
    /* r33 两步：数数方向箭头+第k个+相对方向箭头（题面语音两子句的视觉冗余，不泄答案动物） */
    chipEl.innerHTML = '<span class="fdir">' + ICONS[DIRS[q.dir].arrow] + '</span>' +
      '<span class="fk">第<b>' + q.k + '</b>个</span>' +
      '<span class="fdir">' + ICONS[DIRS[q.dir2].arrow] + '</span>';
    chipEl.setAttribute('aria-label', '从' + DIRS[q.dir].cn + '边数第' + q.k + '个，它' +
      DIRS[q.dir2].cn + '边那只，点我再听一遍');
  } else {
    /* r33 flip：参照动物头像 + 双向箭头（↔/↕）——「它的哪一边」之问不指向任一侧（镜像推理不泄） */
    chipEl.innerHTML = '<span class="fan">' + animalSvg(q.line[q.refIdx]) + '</span>' +
      '<span class="fdir">' + (q.orient === 'horiz' ? ICONS.mirrorH : ICONS.mirrorV) + '</span>' +
      '<span class="fq">?</span>';
    chipEl.setAttribute('aria-label', ANIMALS[q.line[q.refIdx]].name + '的' +
      DIRS[q.dir2].cn + '边，点我再听一遍');
  }
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  buildLine();
  renderChip(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);  /* 开场/换题读题；demo 门防演示收尾叠播；quiet=开场/教学交接改顺序链 */
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
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：当前题正确位置的动物 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(q.answerIdx), 'tut');
}

/* ================= 场景点选主路径（真实点击 / WIS.tapSlot / autoSolve 共用） ================= */
async function uiTapSlot(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';            /* 已答完的题：早退零惩罚不计数（§0.7 防御层） */
  const el = cardEl(i);

  if (r === 'wrong') {                          /* 答错：晃动（不灰掉——场景卡全可点可重点，SPEC §1） */
    if (el) { el.classList.remove('wig', 'breathe'); void el.offsetWidth; el.classList.add('wig'); }
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss === 2);   /* flat<3 每错必播 / flat≥3 10s 节流+豁免恰一次（P1②；场景卡不灰化 miss 无上限，===2 防豁免变每错必播） */
    if (q._miss >= 2) {                         /* 首错不 pulse：连错 2 次才高亮正确位置的动物 */
      const ok = cardEl(q.answerIdx);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    await wait(480 * SPEED);
    return r;
  }

  /* ---- 答对：该动物亮起 → 推进 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe', 'pop'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  await wait(950 * SPEED);
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  state.locked = false;
  if (cur.done) winFlow();
  else renderQuiz();
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
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  /* verify 页恒走 openingSpeak（stub 记录开场链供 autoplay 断言，教学由真实页自测覆盖） */
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.wis && sv.wis.tutSeen);
  if (VERIFY) { openingSpeak(); return; }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；hint 不得切断题面） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点出正确位置的动物（亮起庆祝，locked 吞输入）→帮=指向正确动物；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = q.answerIdx;
  pointGhostAt(cardEl(idx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapSlot(idx, true);                    // demo 通道豁免 locked（演示吞真实输入）
  await wait(1000 * SPEED);                      // 亮起演出窗口
  const sv = KIDS._save();
  sv.wis = sv.wis || {};
  sv.wis.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来点一点"在重发后的题面上说（照 batch5-8） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链：turn→题面（flat0 首题恒 edge up——确定性），queue 两段 clip 顺序播不叠音 */
  const q0 = cur.quizzes[0];
  if (q0.mode === 'edge') KIDS.voice.queue([VOICE.turn.key, VOICE[DIRS[q0.dir].q].key]);
  else KIDS.voice.queue([VOICE.turn.key, 'wis_ord_' + q0.dir + '_' + q0.k]);   /* T46 阶段2：接力改 queue 链 */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* §0.20：教学/演出期点兔子不打断 */

  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20：教学/演出/通关期重玩门 */

  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查 m5：对齐重玩门/题面卡防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整段重读 */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（点题卡=儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (p) {                                       // 场景动物卡：主答路径
    e.preventDefault();
    uiTapSlot(Number(p.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return;  // 题面卡走自己的 handler
  /* 空白/探索点击（天空草地等）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援提示（重读题面）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援=重读题面（§0.7a，非通用催促句） */
    if (q) speakQuiz(q); else sayR(VOICE.hint.key, VOICE.hint.text);
    if (q) {                                    /* 视觉重现（试玩共性 P1）：正确动物 breathe 一次，静音也能看见答案线索 */
      const ok = cardEl(q.answerIdx);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
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
  KIDS.init({ game: 'whereistand', title: '方位排排队' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.WIS = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      answerIdx: q.answerIdx || 0 };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { mode: q.mode, dir: q.dir || null, k: q.k == null ? null : q.k,  /* SPEC-R33 §R5 钩子契约 */
      dir2: q.dir2 || null, refIdx: q.refIdx == null ? null : q.refIdx,      /* r33：two/flip 新字段（只增） */
      animal: q.mode === 'flip' ? q.line[q.refIdx] : null,                   /* flip 参照动物（点名对账） */
      orient: q.orient,
      line: q.line.slice(), answerIdx: q.answerIdx,
      answered: !!q._answered,                                             /* 家族口径（picto/worden 同）——T46 阶段2 补漏 */
      step: cur.step, miss: q._miss || 0 };
  },
  tapSlot(i) { return uiTapSlot(i); },
  async autoSolve() {                           // UI 路径自动点完当前关（逐题点正确位置）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 30) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapSlot(q.answerIdx);
      taps++;
      if (r === false || r === null) break;     // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
