/* ================= simon 主逻辑（两态演示流程 / 鼓阵渲染 / 敲击判定 / 教学 / 救援 / 推进）
   玩法：每题小兔子敲鼓演示序列（watch：鼓亮+音符，间隔 speed ms，吞输入+轻叮）
   → input 期孩子照序敲。整条敲对=过题。
   点错=错鼓 wig+低音+sayW，序列从头重播（watch 重入=重试零惩罚，miss 无上限计数）；
   重播时播 si_replay'再看一遍哦'。
   救援钟 7a：input 期 14s 静置 → 重播整条序列（§0.21 天然视觉重现）+ si_hint；
   pos 保留（零惩罚——不剥夺已敲对进度）；watch 期不救援（演出中）。
   验收钩子：window.SI = { currentLevel, quiz, tapPad(i), autoSolve(), skipWatch(), rescues, tutorial }
   skipWatch()：测试快进——watch 期直跳 input（不敲鼓）；verify 页另有 SPEED=0.12 提速全部演出计时 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内演示/演出计时提速（防总时长爆炸）
const LEAD = 1200;                             // 常规题：si_hint 播响 → watch 开始的等待
const LEAD_CHAIN = 1900;                       // 顺序链（开场 hint / 教学 turn 接力）：≥1.8s（§0.6）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/重播不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force=miss===2 豁免恰一次
   ——不灰化款（miss 无上限）必须 === 2，batch9 定版（防豁免变每错必播） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const padsEl = $id('pads'), tipEl = $id('tip'), tipTextEl = $id('tip-text'),
      tipCountEl = $id('tip-count'), stageEl = $id('stage'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白/探索点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 听按钮重播 3s 节流
let helpRedemo = false;
let watchT = null, watchRun = 0;                // watch 演示定时器 + 运行令牌（skipWatch/重开中止在途演出）
let rescueCount = 0;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const padEl = i => padsEl.querySelector('.pad[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  padsEl.innerHTML = '';
  for (let i = 0; i < 4; i++) {                 // 四面小鼓（红黄绿蓝，静态一次建好）
    const b = document.createElement('button');
    b.className = 'pad p' + i;
    b.dataset.i = i;
    b.setAttribute('aria-label', PADS[i].name);
    padsEl.appendChild(b);
  }
  layoutPads();
}
/* 鼓径按 stage 实时算：min(宽/高约束) clamp [110,300]，间距 18 —— 双 viewport 均 ≥96（主答案按钮） */
function layoutPads() {
  const availW = stageEl.clientWidth - 16;
  const availH = stageEl.clientHeight - 84;     // 减指令条+间距
  const g = 18;
  const w = Math.floor((availW - g) / 2);
  const h = Math.floor((availH - g) / 2);
  const size = Math.max(110, Math.min(Math.min(w, h), 300));
  document.documentElement.style.setProperty('--pad', size + 'px');
  document.documentElement.style.setProperty('--padgap', g + 'px');
}
window.addEventListener('resize', () => layoutPads());

/* HUD 两态指令条：watch=看小兔子敲小鼓 / input=跟着敲一敲 + pos/len 计数 */
function renderTip() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.phase === 'input') {
    tipEl.className = 'input count';
    tipTextEl.textContent = TIP_INPUT;
    tipCountEl.textContent = q.pos + '/' + q.len;
  } else {
    tipEl.className = 'watch';
    tipTextEl.textContent = TIP_WATCH;
  }
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
function unlightAll() {
  padsEl.querySelectorAll('.pad.lit').forEach(p => p.classList.remove('lit'));
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  unlightAll();
  renderTip();
  renderStep();
  if (!state.demo && !state.quiet) {            // 常规换题：si_hint → watch 演示（quiet=开场/教学交接走顺序链）
    qSpeak(q);
    scheduleWatch(LEAD);
  }
}

/* ================= 幽灵手指（教学"帮"与演示共用） ================= */
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
/* 教学"帮"阶段指向：当前应敲的鼓（仅 input 期——watch 期指向=泄底） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.phase !== 'input') return;
  pointGhostAt(padEl(q.seq[q.pos]));
}

/* ================= 鼓音与亮鼓（键音=Web Audio 合成，§0.13） ================= */
function padNote(i) {
  if (!VERIFY && PADS[i]) KIDS.audio.note(PADS[i].freq, 0.42, 0, 0.9);
}
/* input 期敲对短闪：亮 ~260ms 自灭（视觉+音符同步反馈） */
function flashPad(i) {
  const el = padEl(i);
  if (!el) return;
  el.classList.remove('lit'); void el.offsetWidth;
  el.classList.add('lit');
  padNote(i);
  setTimeout(() => { el.classList.remove('lit'); }, 260 * SPEED);
}

/* ================= watch 序列演示（两态核心）
   scheduleWatch(delay)：delay 后逐键亮鼓+音符（每键 speed ms：亮 speed*0.6 后熄）
   → 演示完 phase='input'；watchRun 令牌中止在途演出（skipWatch/重开关卡）
   身份守卫 cur!==run 丢弃旧关续体（演出窗内重玩会重建 cur） */
function qSpeak(q) { if (q) KIDS.voice.play(VOICE.hint.key, VOICE.hint.text); }
function stopWatch() { clearTimeout(watchT); watchT = null; watchRun++; }
async function playSeq(q, token, run) {
  const litMs = Math.max(170, Math.min(Math.round(q.speed * 0.6), 340));
  for (let k = 0; k < q.seq.length; k++) {
    if (token !== watchRun || cur !== run) return;
    const el = padEl(q.seq[k]);
    if (el) el.classList.add('lit');
    padNote(q.seq[k]);
    await wait(litMs * SPEED);
    if (token !== watchRun || cur !== run) { if (el) el.classList.remove('lit'); return; }
    if (el) el.classList.remove('lit');
    await wait(Math.max(60, q.speed - litMs) * SPEED);
  }
}
function scheduleWatch(delay) {
  stopWatch();
  const run = cur, token = watchRun;
  watchT = setTimeout(async () => {
    watchT = null;
    if (cur !== run || state.won) return;        /* 教学期 locked=true 仍要演示（demo 吞输入在 uiPad 层） */
    const q = cur.quizzes[cur.step];
    if (!q || q.solved) return;
    await playSeq(q, token, run);
    if (token !== watchRun || cur !== run) return;
    finishWatch(run);
  }, delay * SPEED);
}
function finishWatch(run) {                     // 演示完 → 开放输入（verify/skipWatch 同口）
  if (cur !== run) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;
  unlightAll();
  engToInput(cur);
  renderTip();
  if (state.tut === 'help') pointHelpNext();    // 教学"帮"：演示完再指（不泄底）
}
/* 测试快进（公开钩子）：watch 期直跳 input，不敲鼓不吞点击 */
function skipWatchExec() {
  if (!cur || cur.done || state.won) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.phase !== 'watch') return false;
  stopWatch();
  unlightAll();
  engToInput(cur);
  renderTip();
  if (state.tut === 'help') pointHelpNext();
  return true;
}
/* 轮询等演示期结束（autoSolve/教学用；真实等待，不猜时长） */
async function waitPhaseInput(q) {
  const span = (LEAD_CHAIN + q.seq.length * q.speed + 1500) * SPEED + 4500;
  const t0 = Date.now();
  while (Date.now() - t0 < span) {
    if (!cur || cur.done || q.solved || q.phase === 'input') return true;
    await wait(50);
  }
  return !!(cur && (q.solved || q.phase === 'input'));
}

/* ================= 敲鼓主路径（真实点击 / SI.tapPad / autoSolve 共用） ================= */
async function uiPad(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked 门，照 batch6-9） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) { if (state.locked && !demo && !state.won) sfx('pop'); return false; }  /* 审查 m2：locked 演出窗轻叮（对齐另两款）；won/demo 态静默 */
  const q = cur.quizzes[cur.step];
  if (!q || i < 0 || i > 3) return false;
  const run = cur;                              /* 演出窗口内点重玩会重建 cur——身份守卫防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'watch') {                                /* 演示期吞输入+轻叮+鼓圈轻闪（§0.22+试玩P2 静音可感知）；返回值/状态不变 */
    sfx('pop');
    const ne = padEl(i);
    if (ne && !demo) { ne.classList.remove('nudge'); void ne.offsetWidth; ne.classList.add('nudge'); }
    return false;
  }
  const el = padEl(i);

  if (r === 'wrong') {                          /* 敲错：错鼓晃动+低音，序列从头重播（重试零惩罚） */
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
    sfx('fail');
    sayW(VOICE.wrong.key, wrongText(q), q.miss === 2);  /* flat<3 每错必播 / flat≥3 节流+豁免恰一次（===2） */
    renderTip();                                /* 引擎已切回 watch：指令条同步两态 */
    await wait(680 * SPEED);                    /* 让晃动演完再重播（§0.11） */
    if (cur !== run) return r;                  /* 演出窗内重玩已重建关卡，丢弃旧续体 */
    sayR(VOICE.replay.key, VOICE.replay.text);  /* 重播语音'再看一遍哦'（§2） */
    scheduleWatch(650);
    return 'wrong';
  }

  /* ---- 敲对：亮鼓+音符+指针 pos++（引擎已推进） ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次敲对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  flashPad(i);
  renderTip();                                  /* pos/len 计数更新 */
  if (q.solved) {                               /* 整条敲对=过题：短演出后换题/通关 */
    sfx('coin');
    state.locked = true;
    if (r === 'done') hopRabbit();
    await wait(950 * SPEED);
    if (cur !== run) return r;                  /* 演出窗内重玩已重建关卡，丢弃旧续体 */
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
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
  stopWatch();
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
  stopWatch();
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  unlightAll();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.simon && sv.simon.tutSeen);
  if (VERIFY) {                                 /* verify 页 stub 记录开场链（autoplay 断言） */
    state.quiet = false;                        /* 后续换题照常排演示（quiz0 已在 quiet=true 下渲染，flat0 停 watch 供两态断言） */
    if (!freshTut) openingSpeak();
    return;
  }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+顺序链（§0.5：hint 不 _stop 切断题面） */
}
function openingSpeak() {                        /* 顺序链：si_hint → watch 演示（LEAD_CHAIN 接力 §0.6） */
  const q = cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([VOICE.hint.key]);
  scheduleWatch(LEAD_CHAIN);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=真实演示一次序列（locked 吞输入）→ 幽灵手指演示敲第一锤 →
   重发同关（确定性关卡，序列一致）；帮=input 期幽灵手指指向当前应敲的鼓；独=首次敲对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);      /* 教学 opening 用 sayR 不受 flat 门（§0.6） */
  scheduleWatch(600);                           /* watch 语音响起即演示（边听边看） */
  const q = cur.quizzes[0];
  await waitPhaseInput(q);                      /* 真实等演示期结束（500ms/键），不猜时长 */
  pointGhostAt(padEl(q.seq[0]));
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示敲第一锤
  state.locked = false;                         /* 时序锚点（batch9 m6）：吞输入依赖 uiPad 演示鼓
     全程无 await 且正确路径同步重设 locked=true——禁在其间插入 await */
  state.quiet = true;                           // 演示敲击的反馈不插播语音
  await uiPad(q.seq[0], true);
  const sv = KIDS._save();
  sv.simon = sv.simon || {};
  sv.simon.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，序列一致），"你来敲一敲"在重发后的题面上说（照 batch5-9） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  unlightAll();
  renderQuiz(); renderDots();
  state.quiet = false;
  const q0 = cur.quizzes[0];                    // 交接顺序链：turn → 题面 hint（§0.6 禁双通道叠音）
  KIDS.voice.queue([VOICE.turn.key, VOICE.hint.key]);
  scheduleWatch(LEAD_CHAIN);                    // finishWatch 时 tut=help → 幽灵手指指向（不泄底）
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重播（听按钮）：重听题面指令 si_hint；sayR 不受 flat 门；3s 节流防连点轰炸（force=测试钩子直通） */
function replaySpeech(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  qSpeak(q);
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* §0.20：教学/演出期点兔子不打断 */
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 对齐重玩门 */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  replaySpeech(false);
});
padsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.pad');
  if (el) { e.preventDefault(); uiPad(Number(el.dataset.i)); return; }   /* watch 期 uiPad 自吞 */
  e.preventDefault();                           /* 点舞台空白：10s 节流轻提示（§0.16，不重置救援钟） */
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（5.5 岁等待极限 15s 内）/ 教学"帮"5s 重演示一次
   救援=input 期静置 14s → 重播整条序列（§0.21 天然视觉重现）+ 播 si_hint；
   pos 保留（零惩罚）；watch 期不救援（演出中，计时器在推进）；
   只有本看护与正确推进写 lastAct——错点/空白/兔子点击不重置 */
function rescueAct(q) {
  rescueCount++;
  sayR(VOICE.hint.key, VOICE.hint.text);
  engToWatch(cur, false);                       /* 临时切回 watch 重演，pos 保留 */
  renderTip();
  scheduleWatch(500);
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.phase !== 'input') return;        /* 演示期/换题过渡窗不救援（计时器在推进） */
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
  KIDS.init({ game: 'simon', title: '听指令小鼓' });
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
window.SI = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
             solved: !!q.solved };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { seq: q.seq.slice(), len: q.len, phase: q.phase, pos: q.pos,
             speed: q.speed, miss: q.miss, step: cur.step };
  },
  tapPad(i) { return uiPad(i); },
  skipWatch() { return skipWatchExec(); },       /* 测试快进：watch 期直跳 input（不敲鼓） */
  replay() { return replaySpeech(true); },       /* 测试钩子：无视节流直通重播题面指令 */
  async autoSolve() {                           // UI 路径自动答完当前关（真实等演示期→逐锤照序敲）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 80) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.phase !== 'input') { await waitPhaseInput(q); continue; }
      const r = await uiPad(q.seq[q.pos]);
      if (r === false || r === null || r === 'wrong') break;
      taps++;
      await wait(60);
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get rescues() { return rescueCount; },         /* 救援触发计数（自测用） */
  get tutorial() { return state.tut; }
};
