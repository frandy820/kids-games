/* ================= colormix 主逻辑（目标卡 / 玻璃缸与颜料罐渲染 / 入缸判定 / 教学 / 推进）
   玩法：题面语音「调出橙色吧」+目标色大卡 → 点颜料罐入玻璃缸（飞行色滴+入缸动画+颜料名 TTS）
   → 缸变结果色（液体漫开）→ 自动判定（==目标 celebrate 推进；≠目标=「？」泡+col_wrong，
   缸不清空继续点罐叠加观察——探索非错误，不重责）。缸深 3 FIFO 可视。
   r21（SPEC-R21-COLORMIX §R4）：dch4 反推题=缸液目标色+3 张配方卡（点卡作答，
   混算==目标推进；选错=wiggle+可重选不换题；首次反推卡次第 bounce 预告可点）。
   验收钩子：window.CM = { get currentLevel, get quiz, tapJar(color), pickRecipe(i), start(flat), async autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速（wait 全按 SPEED 缩放）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };

const jarsEl = $id('jars'), tankEl = $id('tank'),
      liquidEl = $id('liquid'), ballsEl = $id('pot-balls'),
      targetCard = $id('target-card'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost'), benchEl = $id('bench');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, busy: false, won: false, demo: false, tut: 'none', revTeased: false };
let lastAct = Date.now();
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  $id('wand').innerHTML = ICONS.wand;
  $id('tank-label').innerHTML = ICONS.wand;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：入缸=清脆双音 / 非目标「？」=低柔下滑 / 调对=轻铃上扬 */
const plopSfx = () => { if (!VERIFY) { KIDS.audio.note(880, 0.1, 0, 0.5); KIDS.audio.note(1175, 0.12, 0.05, 0.38); } };
const wooSfx = () => { if (!VERIFY) { KIDS.audio.note(233, 0.2, 0, 0.4); KIDS.audio.note(175, 0.24, 0.1, 0.35); } };
const chimeFull = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.24, 0, 0.5); KIDS.audio.note(783.99, 0.3, 0.09, 0.5); } };

/* ================= 题面语音（mode-aware，r21 §R4）：正推=目标色题面 clip（T46）；
   反推=col_rev_q（新键，注册前 KIDS.voice.play(key,text) 文本自愈） ================= */
const qKey = q => q.mode === 'reverse' ? 'col_rev_q' : quizKey(q.target);
const qSpeech = q => q.mode === 'reverse' ? '这个颜色是怎么调出来的呀' : quizSpeech(q.target);

/* ================= 渲染 ================= */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  targetCard.style.background = COLORS[q.target].hex;         // 目标色大卡
  targetCard.setAttribute('aria-label', '目标颜色：' + COLORS[q.target].name);
  renderPot();
  renderJars();
  renderStep();
  if (!VERIFY && !state.demo) KIDS.voice.play(qKey(q), qSpeech(q));   // 读题：正推题面 clip / 反推 col_rev_q
}
function renderPot() {                                        // 缸内球（contents 序）+液体结果色
  const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)];
  ballsEl.innerHTML = '';
  if (!q) return;
  for (let i = 0; i < q.pot.length; i++) {                    // 反推题 pot 恒空（缸液=目标色展示，不泄配方）
    const b = document.createElement('span');
    b.className = 'pball';
    b.style.background = COLORS[q.pot[i]].hex;
    ballsEl.appendChild(b);
  }
  liquidEl.style.background = q.result ? COLORS[q.result].hex : '#E4F1F6';
}
function renderJars() {                                       // 颜料罐排（正推）/ 配方卡排（反推，r21）
  const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)];
  jarsEl.innerHTML = '';
  if (!q) return;
  if (q.mode === 'reverse') {
    for (let i = 0; i < q.picks.length; i++) {
      const b = document.createElement('button');
      b.className = 'recipick';
      b.dataset.i = i;
      b.setAttribute('aria-label', '配方' + (i + 1) + '：' + q.picks[i].map(c => COLORS[c].name).join('加'));
      b.innerHTML = q.picks[i].map(c => '<span class="rjar">' + jarSvg(c) + '</span>').join('');
      jarsEl.appendChild(b);
    }
    maybeRevIntro();                                          // 首次反推：卡次第 bounce 预告（§R4）
    return;
  }
  for (let i = 0; i < q.jars.length; i++) {
    const c = q.jars[i];
    const b = document.createElement('button');
    b.className = 'jar';
    b.dataset.color = c;
    b.setAttribute('aria-label', COLORS[c].name + '颜料');
    b.innerHTML = '<span class="glow" aria-hidden="true"></span>' + jarSvg(c);
    jarsEl.appendChild(b);
  }
}
/* 首次反推视觉预告（每存档一次 sv.colormix.revSeen，§R4）：3 卡次第 bounce 一遍
   （预告可点，不指示正确答案——承 r20 数字钮次第高亮范式）；verify 页 stub 档下由
   state.revTeased 拦同关重复（stub _save 每次新对象，revSeen 不可依赖） */
function maybeRevIntro() {
  if (state.revTeased) return;
  const sv = KIDS._save() || { levels: {} };
  if (sv.colormix && sv.colormix.revSeen) return;
  state.revTeased = true;
  if (!VERIFY) {
    sv.colormix = sv.colormix || {};
    sv.colormix.revSeen = true;
    KIDS.store.persist();
  }
  const cards = jarsEl.querySelectorAll('.recipick');
  for (let i = 0; i < cards.length; i++) {
    setTimeout(() => { replayAnim(cards[i], 'tease'); if (!VERIFY) sfx('pop'); }, 150 + i * 150);
  }
}
const jarBtnOf = c => jarsEl.querySelector('.jar[data-color="' + c + '"]');
const recBtnOf = i => jarsEl.querySelector('.recipick[data-i="' + i + '"]');
function renderStep() {                                       // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                                       // 章节点（1 基，生成关循环章画到当前章）
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

/* ---------- 飞行颜料滴：罐心 → 缸心（fixed 层，320ms transition 后移除） ---------- */
function flyDrop(color, btn) {
  if (VERIFY) return;
  const r1 = btn.getBoundingClientRect(), r2 = tankEl.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'drop';
  d.style.background = COLORS[color].hex;
  d.style.left = Math.round(r1.left + r1.width / 2 - 13) + 'px';
  d.style.top = Math.round(r1.top + r1.height / 2 - 13) + 'px';
  document.body.appendChild(d);
  requestAnimationFrame(() => {
    d.style.transform = 'translate(' + Math.round(r2.left + r2.width / 2 - r1.left - r1.width / 2) + 'px,' +
      Math.round(r2.top + r2.height * 0.7 - r1.top - r1.height / 2) + 'px)';
    d.style.opacity = '.25';
  });
  setTimeout(() => d.remove(), 360);
}
/* 「？」泡：缸上方冒出（判非目标可视反馈，1.2s 消失；缸不清空） */
function qmBubble() {
  if (VERIFY) return;
  const old = benchEl.querySelector('#qm');
  if (old) old.remove();
  const d = document.createElement('div');
  d.id = 'qm';
  d.textContent = '？';
  d.style.left = (tankEl.offsetLeft + tankEl.offsetWidth / 2) + 'px';
  d.style.top = (tankEl.offsetTop - 6) + 'px';
  benchEl.appendChild(d);
  setTimeout(() => { if (d.parentNode) d.remove(); }, 1250);
}

/* ================= 幽灵手指（教学"看/帮"共用；指向固定布局的罐按钮，定位一次） ================= */
const ghost = {
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAtEl(btn) {
  if (VERIFY || !btn) return;
  const r = btn.getBoundingClientRect();
  ghostEl.style.left = Math.round(r.left + r.width / 2) + 'px';
  ghostEl.style.top = Math.round(r.top + r.height * 0.42) + 'px';
  ghost.show();
  setTimeout(() => ghost.press(), 800 * SPEED);
}
function pointHelpNext() {                      // 教学"帮"：指向当前题配方第一罐（方向级提示）
  if (!cur) return;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const rec = RECIPE[q.target];
  if (rec && rec.length) pointGhostAtEl(jarBtnOf(rec[0]));
}

/* ================= 点罐主路径（真实点击 / CM.tapJar / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（罐排容器 bump 微动效——b21 feed 定版）；
   防重入双锁（同步置位→紧邻点罐必被拦，§0.47）：
   busy=点罐占位锁（色滴飞行 240ms 窗，wrong 即释——探索连续可点）；
   locked=调对演出锁（650ms 漫开欣赏窗；演示期不动外层 locked） ================= */
async function uiTapJar(color, demo) {
  if (!cur || state.won) return false;
  if ((state.busy && !demo) || (state.locked && !demo) || (state.demo && !demo)) {   // 吞输入轻叮+bump
    sfx('pop');
    replayAnim(jarsEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (q.jars.indexOf(color) < 0) { sfx('pop'); replayAnim(jarsEl, 'bump'); return false; }   // 非法罐
  const run = cur;                               /* 身份守卫：演出窗内重开会重建 cur——防旧续体错推进 */
  const btn = jarBtnOf(color);
  flyDrop(color, btn);
  state.busy = true;                             // 占位锁同步置位：飞行窗内紧邻点罐=拒绝
  await wait(240 * SPEED);                       // 色滴飞行入缸的观感节拍（verify 提速）
  if (cur !== run) { state.busy = false; return false; }
  const r = engTapJar(cur, color);
  if (r === null) { state.busy = false; sfx('pop'); replayAnim(jarsEl, 'bump'); return false; }
  plopSfx();
  lastAct = Date.now();                          // 有效操作重置救援钟（§0.7a）
  if (state.tut === 'help') {                    // 教学"独"：首次点罐 → 放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  KIDS.voice.play(paintKey(color), COLORS[color].name);   // 颜料名 clip（T46 阶段2；缺 clip 文本自愈）
  renderPot();                                   // 球入缸+结果色漫开（same 也入缸可视）

  if (r === 'same') { state.busy = false; return 'same'; }        // 集合未变：不判不罚（观察）
  if (r === 'wrong') {                           // 一次"调出"判非目标=1 试调：？泡+col_wrong（缸不清空）
    state.busy = false;                          // 探索连续可点（不设错误防重入窗，§0.51 探索≠错误）
    wooSfx();
    qmBubble();
    setTimeout(() => { if (cur === run && !state.won && !demo) KIDS.voice.play(VOICE.wrong.key, VOICE.wrong.text); },  // 试玩P2b：教学演示不出「不一样」
      VERIFY ? 0 : 500);                         // 色词先说半秒再让位反馈句
    return 'wrong';
  }
  /* right / done：调对——650ms 漫开欣赏窗 */
  if (!demo) state.locked = true;                // 演出锁仅非演示（教学期 locked 由外层持有）
  chimeFull();
  await wait(650 * SPEED);
  state.busy = false;
  if (cur !== run) { if (!demo) state.locked = false; return r; }
  if (!demo) state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  // 新题（缸已随题切换清空）+读题
  if (state.tut === 'help') pointHelpNext();
  return r;
}

/* ================= 点配方卡主路径（r21 §R4 反推题：真实点击 / CM.pickRecipe / autoSolve 共用）
   吞输入轻叮必配可见回应（罐排容器 bump）；busy/locked 双锁语义同点罐；
   选错=卡 wiggle+col_wrong 不换题可重选（探索≠错）；重复点同卡='same' 不判不罚 ---------- */
async function uiPickRecipe(i) {
  if (!cur || state.won) return false;
  if (state.busy || state.locked || state.demo) {
    sfx('pop');
    replayAnim(jarsEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.mode !== 'reverse') return false;
  const run = cur;                               /* 身份守卫：演出窗内重开会重建 cur */
  state.busy = true;                             // 占位锁同步置位：窗内紧邻点卡=拒绝
  await wait(240 * SPEED);                       // 选卡节拍（与点罐观感一致，verify 提速）
  if (cur !== run) { state.busy = false; return false; }
  const r = engPickRecipe(cur, i);
  if (r === null) { state.busy = false; sfx('pop'); replayAnim(jarsEl, 'bump'); return false; }
  lastAct = Date.now();                          // 有效操作重置救援钟（§0.7a）
  if (r === 'same') { state.busy = false; return 'same'; }        // 重复选同卡：不判不罚
  if (r === 'wrong') {                           // 选错=1 试调：卡 wiggle+col_wrong（不换题可重选）
    state.busy = false;
    wooSfx();
    replayAnim(recBtnOf(i), 'wig');
    setTimeout(() => { if (cur === run && !state.won) KIDS.voice.play(VOICE.wrong.key, VOICE.wrong.text); },
      VERIFY ? 0 : 500);
    return 'wrong';
  }
  /* right / done：选对——650ms 欣赏窗 */
  state.locked = true;
  chimeFull();
  await wait(650 * SPEED);
  state.busy = false;
  if (cur !== run) { state.locked = false; return r; }
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  // 新题+读题（含反推→正推切章不发生：dch 关内同型）
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* col_right：调对啦，颜色真漂亮 */
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
  state = { locked: false, busy: false, won: false, demo: false, tut: 'none', revTeased: false };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.colormix && sv.colormix.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示调绿（黄+蓝→变绿=恰好完成 flat0 题0）→「变绿啦」；
   帮=指向配方第一罐（黄罐）；独=首次点罐放手（watch 全程 ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                      // flat0 题0 恒 target='green'
  const rec = RECIPE[q.target];                  // ['yellow','blue']
  let demoR = null;
  for (let k = 0; k < rec.length; k++) {
    pointGhostAtEl(jarBtnOf(rec[k]));
    await wait(850 * SPEED);
    ghost.press();
    await wait(300 * SPEED);
    demoR = await uiTapJar(rec[k], true);        /* demo 通道豁免 locked 门（演示吞输入） */
    await wait(520 * SPEED);
  }
  KIDS.voice.play(VOICE.green.key, VOICE.green.text);   /* 演示收束语（T46 阶段2 clip 化） */
  window.__cmDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);
  const sv = KIDS._save();
  sv.colormix = sv.colormix || {};
  sv.colormix.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来调一调"在重发后的题面上说 */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, busy: false, won: false, demo: false, tut: 'help', revTeased: false };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* 教学/演出期点兔子不打断 */
  lastAct = Date.now();
  hopRabbit();
  const q = cur.quizzes[cur.step];
  if (q && !state.won) KIDS.voice.play(qKey(q), qSpeech(q));  /* 戳兔子重读题面（正推色名/反推 col_rev_q） */
  else sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) KIDS.voice.play(qKey(q), qSpeech(q));   /* 再听一遍：重读题面（正推/反推 mode-aware） */
});
jarsEl.addEventListener('pointerdown', e => {
  const rec = e.target.closest('.recipick');
  if (rec) {                                     /* r21 反推题：点配方卡作答 */
    e.preventDefault();
    uiPickRecipe(+rec.dataset.i);
    return;
  }
  const el = e.target.closest('.jar');
  if (!el) return;
  e.preventDefault();
  uiTapJar(el.dataset.color);
});

/* ================= 无操作看护：14s 救援（重读题面+目标卡脉冲）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];             /* 救援：重读题面（不受 flat 门，§0.5） */
    if (q) sayR(qKey(q), qSpeech(q));            /* 正推题面 clip / 反推 col_rev_q（mode-aware） */
    replayAnim(targetCard, 'rescue');
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
  KIDS.init({ game: 'colormix', title: '颜色魔法' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口）
   r21 §R5：CM.pickRecipe(i) 反推作答入口；CM.quiz 增 mode（'mix' 默认，正推字段全保留
   向后兼容）/picks（反推时=罐组拷贝，正确卡索引不外显——verify 侧从 SPEC 独立推导）；
   反推题 CM.tapJar=false（engTapJar 返回 null→吞输入 bump） ================= */
window.CM = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.missTotal || 0, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    if (q.mode === 'reverse') {
      return { target: q.target,                               /* 反推目标色 id（缸液展示色） */
               mode: 'reverse',
               jars: [],                                       /* 反推无罐（作答面=配方卡） */
               picks: q.picks.map(p => p.slice()),             /* 配方卡罐组（拷贝） */
               picked: q.picked,
               pot: [],                                        /* pot 恒空（不泄配方） */
               result: q.result,                               /* 恒=目标（缸中展示色） */
               tries: q.tries,
               step: cur.step,
               miss: q.tries };
    }
    return { target: q.target,                                   /* 目标色 id */
             mode: 'mix',
             jars: q.jars.map(c => ({ color: c })),              /* 颜料罐（对象数组） */
             pot: q.pot.slice(),                                 /* 缸内球色序（FIFO contents） */
             result: q.result,                                   /* 现结果色|null */
             tries: q.tries,                                     /* 本题试调数 */
             step: cur.step,
             miss: q.tries };                                    /* miss=试调数（§3 定版口径） */
  },
  tapJar(color) { return uiTapJar(color); },
  pickRecipe(i) { return uiPickRecipe(i); },
  async autoSolve() {                    // UI 路径自动调完当前关（正推=逐题按配方点罐；反推=选正确卡；走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 300) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.mode === 'reverse') {
        const want = mixKey(RECIPE[q.target]);
        let idx = -1;
        for (let i = 0; i < q.picks.length; i++) if (mixKey(q.picks[i]) === want) idx = i;
        const r = await uiPickRecipe(idx);
        if (r === false) break;
        taps++;
        continue;
      }
      const rec = RECIPE[q.target];
      for (let k = 0; k < rec.length; k++) {
        const r = await uiTapJar(rec[k]);
        if (r === false) break;
        taps++;
        if (r === 'right' || r === 'done') break;   // r21 修复：切题即止（杂球 FIFO 收敛时 right 可提前于末罐出现，防余罐泄入新题缸）
      }
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
