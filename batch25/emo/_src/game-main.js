/* ================= emo 主逻辑（场景渲染 / 候选点选（两向）/ 判对链 / 教学 / 救援 / 推进）
   玩法（SPEC-R35-EMO）：两向题型——
   fwd 正向：题面=情境场景图+情境句 clip（emo_s_<场景>），候选=4 表情脸；
   rev 逆向：题面=大表情脸+情绪词 clip（emo_w_<词>）+问句（emo_rev_q——TODO 注册前 TTS 兜底），
   候选=4 张情境场景图（2×2，选「是发生了哪件事」）。
   选对 = 该卡放大跳 + 情绪词 clip（emo_w_<词>）+ 链尾句 clip（fwd=确认句 emo_cf_<场景> /
   rev=情境句 emo_s_<场景>——两链同构，链窗 6800=词≤1488+150+尾句 4281-4825+300 余量，
   审查M2）；选错 = 摇头 + 引导反馈 clip（emo_wrong「再看看小兔子发生了什么呀」，
   不否定人格：不说"你错了""你不该开心"），1000ms 防重入窗（b16 定案；窗内 locked 吞点，
   clip 被对选打断=容忍）后可重选（探索不罚）。
   救援两级（家族 B 定版，shaperoof lastDir/lastAct 同构）：14s 方向级=重读题面
   （fwd=情境句 / rev=情绪词+问句链）+ 题面卡 pulse（lastDir 独立节流锚，不重置
   lastAct——答案级可达）；30s 答案级=正确卡 breathe。
   验收钩子：window.EM = { get currentLevel, get quiz(){scene, emo, mode, faces[]{id,emo,scene},
   step, miss}, tapFace(i), start(flat), async autoSolve(), get tutorial }（getter 返回拷贝） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
/* 救援/读题 TTS 不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错引导反馈：flat<3 每错必播；flat≥3 走 10s 节流（安静试错只有视觉晃动——shaperoof 同款） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let qTimer = null;                              // 教学 turn clip → 题面 TTS 接力定时器（feed 先例）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（两向：fwd=情境句 clip / rev=[情绪词+问句] 链——重听/救援共用；
   重入先清接力定时器（防旧题残留切断新题面） ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  if (q.mode === 'rev') {                        /* rev：情绪词（emo_w_ 在册）+问句（emo_rev_q TODO 注册前 TTS 兜底） */
    KIDS.voice.queue([VOICE.word(q.emo), { key: VOICE.rev.key, text: VOICE.rev.text }]);
    return;
  }
  KIDS.voice.play('emo_s_' + q.scene, sceneById(q.scene).ask);   /* T46 阶段2：情境句 clip 化（emo_s_* 24 在册） */
}

/* ================= 渲染（两向：fwd 题面=情境图+候选脸 / rev 题面=大表情脸+候选情境图） ================= */
function renderScene(q) {
  if (q.mode === 'rev') {                        // rev 题面卡=大表情脸（不剧透是哪件事——由孩子反选）
    sceneEl.dataset.scene = q.scene;
    sceneEl.setAttribute('aria-label', nameOfEmo(q.emo) + '的脸，点我再听一遍');
    sceneEl.innerHTML = '<span class="revface">' + faceSvg(q.emo) + '</span>';
    return;
  }
  const sc = sceneById(q.scene);                 // fwd 情境场景卡（图不画小兔子正脸——不剧透表情）
  sceneEl.dataset.scene = q.scene;
  sceneEl.setAttribute('aria-label', sc.ask + '，点我再听一遍');
  sceneEl.innerHTML = sceneSvg(sc);
}
function renderBoard(q) {                        // 候选卡排（fwd=4 表情脸一行 / rev=4 情境图 2×2；SVG 零文字 §0.19）
  boardEl.innerHTML = '';
  boardEl.classList.toggle('rev', q.mode === 'rev');
  q.faces.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.emo = f.emo;                       // verify 对账（渲染即引擎）
    if (f.scene) b.dataset.scene = f.scene;      // rev 候选情境 id（verify 对账；fwd 无此键）
    b.setAttribute('aria-label', q.mode === 'rev'
      ? sceneById(f.scene).ask + '，选一选' : nameOfEmo(f.emo) + '的脸');
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = q.mode === 'rev'
      ? '<span class="swrap">' + sceneSvg(sceneById(f.scene)) + '</span>'
      : '<span class="gwrap">' + faceSvg(f.emo) + '</span>';
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();  /* 开场/换题读题；demo 门防演示收束叠播 */
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
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：当前题正确脸 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点表情脸主路径（真实点击 / EM.tapFace / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（脸卡排容器 bump 微动效——家族 D）；
   错选 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）========== */
async function uiTapFace(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapFace(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+引导反馈 clip，卡不灰可重选（探索不罚） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text);     /* emo_wrong：再看看小兔子发生了什么呀 */
    await wait(WRONG_WIN_MS * SPEED);            /* 错选防重入窗 1000ms（b16 定案；clip 被对选打断=容忍） */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：卡放大跳+情绪词 clip+链尾句 clip 拼播链——两向同构同窗） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  const word = VOICE.word(q.emo);                /* emo_w_<词>：按题内情绪取（两向链首段） */
  if (q.mode === 'rev') {                        /* rev 链尾=情境句（emo_s_* 在册——情绪词先行+情境句确认，双向加固） */
    KIDS.voice.queue([word, { key: 'emo_s_' + q.scene, text: sceneById(q.scene).ask }]);
  } else {                                       /* fwd 链尾=确认句（emo_cf_* 在册） */
    KIDS.voice.queue([word, { key: 'emo_cf_' + q.scene, text: confirmOf(sceneById(q.scene)) }]);
  }
  await wait(RIGHT_CHAIN_MS * SPEED);            /* 链窗 6800（审查M2）：词≤1488+150+链尾句TTS 12-15字实测4281-4825+300 余量 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（场景/脸全换）+读题 */
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
  sayR(VOICE.right.key, VOICE.right.text);       /* emo_right：你说对啦，抱抱小兔子（2976） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(700);                             /* 审查M1：celebrate 2620+700=3320 ≥ emo_right 2976+300（原无补窗，每关掐尾 ~350ms） */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：两处 dayEnd 都传 lim-1（防跳章） */
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
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.emo && sv.emo.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面（情境句 TTS） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示选对开心脸（flat0 题0 恒 happy——确定性锚点，脸放大跳+链播情绪词）；
   演示点击推迟到 watch clip（2952）播完+余量后按下——判对链（情绪词+确认句）不与
   watch 撞头（家族 G）；→帮=指向正确脸；独=首次选对放手（watch 全程 ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* emo_tut_watch：看！小兔子怎么了（2952） */
  const q = cur.quizzes[0];                      // flat0 题0 恒 emo=happy
  const idx = correctIdx(q);
  await wait(700 * SPEED);
  pointGhostAt(cardEl(idx));
  await wait(2900 * SPEED);                      /* watch 2952 播完+余量 → 链不撞头（家族 G） */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapFace(idx, true);      /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__emDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(1300 * SPEED);                      /* 亮脸+放大跳演出窗口 */
  const sv = KIDS._save() || {};
  sv.emo = sv.emo || {};
  sv.emo.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来选一选"在重发后的题面上说（照 batch5-24） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* emo_tut_turn：你来选一选（1872） */
  qTimer = setTimeout(() => {                    /* turn 播完（1872）+留白后接力题面 TTS（feed 先例） */
    qTimer = null;
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2600);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再看看发生了什么 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  /* 门族一致性（r34 F1 同族漏门修复）：四门对齐 replayBtn——教学演示期/演出窗/通关期全拦 */
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：两向题面重读（fwd=情境句 / rev=情绪词+问句链） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面卡=重听题面（儿童高发探索动作；两向通用） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* won 门补齐（r35 门族对齐） */
  lastAct = Date.now();
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapFace(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读情境句+场景 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确脸 breathe）/ 教学"帮"5s 重演示 */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读情境句+场景 pulse（不动 lastAct） */
    speakQuiz();
    replayAnim(sceneEl, 'pulse');
    lastDir = Date.now();
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
  KIDS.init({ game: 'emo', title: '情绪脸谱' });        // 存档键 kidsgame_emo（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1（winFlow 同款） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口）
   quiz.faces 逐项 {id, emo, scene}（SPEC-R35-EMO §5 契约——fwd scene=null；rev scene=候选情境 id；
   right 不入钩子，正确性=fwd: f.emo===quiz.emo / rev: f.scene===quiz.scene） ================= */
window.EM = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { scene: q.scene,                            /* 答案情境 id */
             emo: q.emo,                                /* 正确情绪 id */
             mode: q.mode,                              /* 'fwd' | 'rev'（r35 两向） */
             faces: q.faces.map(f => ({ id: f.id, emo: f.emo, scene: f.scene })),
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapFace(i) { return uiTapFace(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选脸，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;
      const r = await uiTapFace(i);
      if (r === false || r === null) break;      // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
