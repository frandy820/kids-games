/* ================= area 主逻辑（工地渲染 / 四题型点卡作答 / 数格子 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH17 §6 r14）：ch1 calc 矩形挖空区+长宽标注 → 面积/周长真算数字卡；
   ch2 samearea 3 砖卡选与挖空区同面积者（正解异形状，防轮廓匹配）；ch3 combo 3-4 块砖
   展示问拼合总面积（部分和）；ch4 unit2 挖空区一格住 2 只问总数（×2 换算）。
   dch2/3/4 首题=count 数格子热身。点对=挖空区逐格点亮+数值确认句+下一题；
   点错=晃动零惩罚+红边可重点。
   「数格子」按钮=主动学习（重置救援钟 §0.7a）：逐格点亮+逐格播 ar_count_N。
   §0.26 晃动窗防重入 1000ms（b16 P2-1 定案）+ 身份守卫（const run=cur，await 后 cur!==run 丢弃）。
   教学看 ≤16s（b16 P3-1：紧凑演示=指挖空→快速数格子→指卡→演示答对；qi0 面积题积 ≤16 预算内）。
   验收钩子：window.AR = { get currentLevel, get quiz, tapCard(i), countCells(), start(flat),
   modeled(flat), async autoSolve(), get tutorial, get rescues }（getter 拷贝非活引用 §0.8） */
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
/* 答对确认语音（r14：确认句=真值巩固朗读——与时长模型 advSayOf 同口径四方同步）：
   calc perim='一圈 P 格'（格数≠真值须走真值句）/ combo='一共 T 格' / unit2='一共 2G 只'（单位只）；
   count/calc area/samearea=挖空区格数=真值 → cKey(G)+ar_right 两段 queue（段全在场，G≤10 clip 化）
   T46 阶段2（2026-09-19）：整句键 ar_cf_p/c/u（文案=advSayOf 一字不差）；hole 短句兜底
   ar_cf_s_N（缺段整句键在场即播，play 自带 TTS 文本回退=防御死分支） */
function confirmSpeak(q) {
  if (q.kind === 'calc' && q.sub === 'perim')
    KIDS.voice.play('ar_cf_p_' + q.ans, advSayOf(q));
  else if (q.kind === 'combo')
    KIDS.voice.play('ar_cf_c_' + q.ans, advSayOf(q));
  else if (q.kind === 'unit2')
    KIDS.voice.play('ar_cf_u_' + q.ans, advSayOf(q));
  else if (q.hole && KIDS.voice.clips[cKey(q.hole.length)])
    KIDS.voice.queue([cKey(q.hole.length), VOICE.right.key]);
  else if (q.hole) KIDS.voice.play('ar_cf_s_' + q.hole.length, advSayOf(q));
  else KIDS.voice.play(VOICE.right.key, VOICE.right.text);
}

const stageEl = $id('stage'), chipEl = $id('prompt-chip'), sceneAreaEl = $id('scene-area'),
      sceneEl = $id('scene'), answersEl = $id('answers'), ghostEl = $id('ghost'),
      countBtn = $id('btn-count'), rabbitBtn = $id('btn-rabbit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, counting: false };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;                            // 救援触发计数（AR.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => answersEl.querySelector('.opt[data-i="' + i + '"]');
const cellEl = p => sceneEl.querySelector('.hole-cell[data-x="' + p[0] + '"][data-y="' + p[1] + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  countBtn.innerHTML = ICONS.countIco + '<span>数格子</span>';
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 数数音（Web Audio 合成）：逐格点数=双音上扬 */
const countHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };

/* ================= 渲染 ================= */
/* 题面：砖墙小图 + 问句（题面句无 clip → 读题走 TTS 兜底，§0.23 豁免口径） */
function renderChip(q) {
  chipEl.className = '';
  chipEl.innerHTML = '<span class="mini">' + ICONS.wallMini + '</span>' +
    '<span class="ask">' + askOf(q) + '</span>';
}
function renderScene(q) {                        // 工地网格；combo=砖排展示（r14：无挖空区但有场景）
  if (q.kind === 'combo') {
    sceneAreaEl.classList.remove('noscene');
    sceneEl.innerHTML = comboSvg(q);
  } else if (q.hole) {
    sceneAreaEl.classList.remove('noscene');
    sceneEl.innerHTML = siteSvg(q);
  } else {
    sceneAreaEl.classList.add('noscene');
    sceneEl.innerHTML = '';
  }
  countBtn.hidden = !q.hole;                     // 数格子按钮=挖空区在场才可用（布局稳定走 hidden）
}
/* 作答区：数字卡（count/calc/combo/unit2）/ 砖卡（samearea）；unit2 单位=只 */
function renderAnswers(q) {
  answersEl.innerHTML = '';
  q.cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.dataset.i = i;
    if (typeof c === 'number') {
      b.className = 'opt';
      b.textContent = String(c);
      b.setAttribute('aria-label', '选 ' + c + (q.kind === 'unit2' ? ' 只' : ' 格'));
    } else {
      b.className = 'opt card';
      b.innerHTML = brickSvg(c.cells);
      b.setAttribute('aria-label', '砖块卡 ' + (i + 1) + '：' + c.cells.length + ' 格');
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
/* 题面句 clip（T46 阶段2 2026-09-19）：ar_ask_* 静句 + ar_calc_* 动态句，text=TTS 兜底（§0.23） */
function speakQuiz(q) { if (q) KIDS.voice.play(askKeyOf(q), askOf(q)); }
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ ar_tip 提示句，queue 单通道顺序播 */
function openingSpeak(turn) {
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key, VOICE.tip.key]);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearBreathe();
  renderChip(q);
  renderScene(q);
  renderAnswers(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);  /* 换题读题（TTS 兜底级） */
}

/* ================= 视觉反馈小件 ================= */
function clearBreathe() {
  answersEl.querySelectorAll('.breathe').forEach(e => e.classList.remove('breathe'));
}
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
/* miss≥2 高亮正确卡（§0.7 首错不 pulse；r14 全题型单答案卡） */
function pulseAnswer(q) {
  replayAnim(cardEl(q.answer), 'breathe');
}
function applyRescueVisual(q) {                  /* 救援视觉（§0.21）：正确卡 breathe 持续在屏 */
  clearBreathe();
  const el = cardEl(q.answer);
  if (el) el.classList.add('breathe');
}

/* ================= 逐格点亮（点对覆盖演出，SPEC §6 r14） =================
   r14 四型答案与挖空区形状不再同构（数字卡/异形砖），飞入动画退役——
   统一逐格点亮铺满绿（行优先序）+ 每格短音；无挖空区（combo）=短窗即收 */
async function lightCells(cells, gap) {
  for (let k = 0; k < cells.length; k++) {
    const el = cellEl(cells[k]);
    if (el) el.classList.add('filled');
    if (!VERIFY) KIDS.audio.note(620 + k * 45, 0.07, 0, 0.35);
    await wait(gap * SPEED);
  }
}
async function fillAnim(q) {
  if (!q.hole) { await wait(600 * SPEED); return; }              // combo：无挖空区，短窗即收
  await lightCells(q.hole, 100);
  await wait(380 * SPEED);
}

/* ================= 点卡主路径（真实点击 / AR 钩子 / autoSolve / 教学演示共用）
   demo=true 仅教学"看"演示通道（豁免 locked 门，batch5 M1 教训） ================= */
async function uiTapCard(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo) || (state.counting && !demo)) {
    if (!demo) sfx('pop');                       /* 吞输入+轻叮（§0.22） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engTap(cur, i);
  if (r === false) return false;
  const el = cardEl(i);
  if (r === 'wrong') {                           // 答错：晃动+红边零惩罚可重点（不灰化款）
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);   /* miss 首达 2 豁免恰一次（§0.5） */
    if (el) replayAnim(el, 'wrong');
    if (q.miss >= 2) pulseAnswer(q);             /* 首错不 pulse（§0.7） */
    state.locked = true;                         /* 晃动窗防重入（§0.26：连点只记一次 miss） */
    await wait(1000 * SPEED);              /* b16 试玩 P2-1：错点防重入窗 1000ms */
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') scheduleHelpGhost(300);
    return r;                                    /* 错点不重置救援钟（§0.7a） */
  }
  /* ---- 点对：砖块飞入逐格点亮 → 推进（点对重置救援钟 §0.7a） ---- */
  lastAct = Date.now();
  if (state.tut === 'help') {                    // 教学"独"：首次答对放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  clearBreathe();
  if (el) {
    el.classList.add('right');
    const m = document.createElement('span');
    m.className = 'mark';
    m.innerHTML = ICONS.check;
    el.appendChild(m);
  }
  sfx('coin');
  confirmSpeak(q);
  state.locked = true;
  await fillAnim(q);
  if (cur !== run) return r;                     // 演出窗内重玩已重建关卡：丢弃旧续体
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz();
  return r;
}

/* ================= 数格子（主动学习通道，SPEC §2）：逐格点亮+逐格播 ar_count_N
   点一下数一遍挖空区格数；重置救援钟（§0.7a 主动学习动作）；demo=教学演示豁免锁门 ================= */
async function countCells(fast, demo) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved || !q.hole) return false;
  if ((state.locked && !demo) || (state.demo && !demo) || state.counting) {
    if (!demo) sfx('pop');
    return false;
  }
  state.counting = true;
  lastAct = Date.now();                          // 主动学习动作重置救援钟（§0.7a）
  replayAnim(countBtn, 'bounce');
  const run = cur;
  const step = (fast ? 430 : 720) * SPEED;       // 教学演示紧凑 430ms/格（watch ≤16s，b16 P3-1）
  for (let n = 1; n <= q.hole.length; n++) {
    if (!state.counting || cur !== run || q.solved) break;
    lastAct = Date.now();                        // 数数持续=持续学习，钟不空转
    sceneEl.querySelectorAll('.hole-cell').forEach(e => e.classList.remove('lit', 'counted'));
    for (let k = 0; k < n - 1; k++) { const e = cellEl(q.hole[k]); if (e) e.classList.add('counted'); }
    const e = cellEl(q.hole[n - 1]);
    if (e) e.classList.add('lit');
    KIDS.voice.play(cKey(n), n + ' 格');         /* verify 页 stub 记录（单元断言数数句序列） */
    countHi();
    await wait(step);
  }
  const lastc = cellEl(q.hole[q.hole.length - 1]);
  if (lastc) { lastc.classList.remove('lit'); lastc.classList.add('counted'); }
  await wait(300 * SPEED);
  state.counting = false;
  lastAct = Date.now();                          // 数完收尾，救援钟从此起算
  return true;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4 查 CHAPTERS[ci+1] 实表）；生成关（f≥20）实算 f+1 关的
     dch 取对应型预告（家族 F 契约——禁 (ci+1)%4 取模字面，r13 第三犯禁令；build 断言实算在场） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
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
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A（b25 形态定版，r14 审查 m-6 对齐 dc）：winFlow 重玩旧关后 dayEnd 预告按进度关非 lim-1 */
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, counting: false };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.area && sv.area.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                // 开场任务语音+提示句顺序链（§0.5）
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
  replayAnim(el, 'breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"指向：正确卡（r14 全题型单答案） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(q.answer));
}
function scheduleHelpGhost(delay) {
  setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.area.tutSeen）
   看（紧凑 ≤16s，b16 P3-1）：watch clip → 指挖空区（题面闪）→ 快速数格子（430ms/格）
   → 正确卡 breathe + 手指演示答对（真实路径 uiTapCard demo 通道）→ 重发同关
   → 帮=指正确卡；独=首次答对放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  replayAnim(chipEl, 'flash');                   // 指"挖空区"：题面闪一下聚焦工地
  await wait(500 * SPEED);
  await countCells(true, true);                  // 演示数格子（demo 豁免锁门，快速节奏）
  const q = cur.quizzes[0];
  const okCard = cardEl(q.answer);
  if (okCard) replayAnim(okCard, 'breathe');
  pointGhostAt(okCard);
  await wait(900 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false;                            // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  state.counting = false;
  const r = await uiTapCard(q.answer, true);
  window.__arDemoR = r;                          /* §0.27 演示生效实证：verify 断言 ==='right' */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.area = sv.area || {};
    sv.area.tutSeen = true;
    KIDS.store.persist();
  }
  /* 立即重发同关（确定性关卡，题面一致），"你来铺一铺"在重发后的题面上说（照家族惯例） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true, counting: false };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip → 提示句（§0.6）
  scheduleHelpGhost(600);
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
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won || state.counting) { sfx('pop'); return; }  /* §0.22 吞输入轻叮 */
  lastAct = Date.now();                          /* 重听题面=主动学习动作，重置救援钟（§0.7a） */
  replayAnim(hearBtn, 'bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整句 TTS 兜底 */
});
countBtn.addEventListener('pointerdown', e => {  // 数格子（主动学习重置救援钟 §0.7a）
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won || state.counting) { sfx('pop'); return; }
  countCells(false);
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.counting) { sfx('pop'); return; }   /* 吞输入期点题面卡也轻叮（§0.16） */
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {   /* 点答案卡分发；空白探索 10s 节流轻提示（§0.16）
                                                    b16 S5：非按钮目标（题面 chip 等 div）须显式排除 */
  const opt = e.target.closest('.opt');
  if (opt) {
    e.preventDefault();
    uiTapCard(Number(opt.dataset.i));            /* 吞输入轻叮在 uiTapCard 守卫内统一（防双响） */
    return;
  }
  if (e.target.closest('button, #prompt-chip')) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo || state.counting) { sfx('pop'); return; }   /* 吞输入期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.21：数格子重数+正确卡 breathe，SPEC §2）
   / 教学"帮"5s 重演示一次。救援钟只被正确推进/数格子/重听题面重置（§0.7a：错点/空白/兔子不重置） */
function rescueAct(q) {
  rescueCount++;
  applyRescueVisual(q);                          /* 正确砖卡 breathe */
  countCells(true);                              /* 数格子重数（SPEC §2 救援=重数，fire-and-forget） */
}
setInterval(() => {
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   /* 契约 K：面板在场不救援（b39 家族） */
  if (VERIFY || !cur || state.won || state.locked || state.demo || state.counting) return;
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
  KIDS.init({ game: 'area', title: '铺砖小工匠' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);   /* 收尾后停留今日最后一关（家族 b14 修复对齐，b15 审查 M3） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用 §0.8） ================= */
window.AR = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                    /* r14 钩子契约（全题型单答案数字/砖卡 idx） */
      kind: q.kind,                             /* 'count'|'calc'|'samearea'|'combo'|'unit2' */
      hole: q.hole ? q.hole.map(p => p.slice()) : null,   /* 挖空区格坐标 [x,y] 数组（combo 无=null） */
      GW: q.GW, GH: q.GH,
      cards: q.cards.map(c => typeof c === 'number' ? c : { cells: c.cells.map(p => p.slice()), kind: c.kind }),
      answer: q.answer,
      step: cur.step, miss: q.miss, solved: q.solved };
  },
  tapCard(i) { return uiTapCard(i); },
  countCells() { return countCells(false); },
  start(flat) {                                 /* 测试钩子：跳关（教学看演期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  modeled(flat) { return levelDurMs(genLevel(flat | 0)); },   /* 时长模型副本（verify/独立复验对账源） */
  async autoSolve() {                           /* UI 路径自动通关：逐题点正确卡 */
    const run = cur;                            // 身份守卫：winFlow 延迟 proceed 换关即中止
    let taps = 0, guard = 0;
    while (cur && cur === run && !cur.done && guard++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const r = await uiTapCard(q.answer);
      taps++;
      if (r === false) break;
    }
    return { done: !!(cur && cur.done && cur === run), taps: taps };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
