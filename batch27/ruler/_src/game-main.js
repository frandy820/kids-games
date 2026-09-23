/* ================= ruler 主逻辑（题面渲染 / 数字·物品卡点选 / 单位链逐根点亮 / 教学 / 救援 / 推进）
   玩法：题面 = 物品横放 + 下方贴排单位链（等长一头对齐）+ 题面句；count=4 数字卡 /
   cmp=2 物品卡（各带测量图）。点对 = 单位链逐根点亮 + 卡亮 + 确认句 TTS 拼句
   （「铅笔有四根回形针长」）；点错 = 卡摇头 + queue 链 [rul_wrong clip, 语义引导句 TTS]
   （count 按所点数字大小方向 / cmp 按所点物品单位——锚「单位长，根数少也可能长」），
   1000ms 防重入窗（b16 定案）后可重选（探索不罚）。
   救援两级（§0.64/家族 B 定版，habitat lastDir 同构）：14s 方向级=重读题面 + 题面卡 pulse
   （lastDir 独立节流锚，不重置 lastAct——答案级可达）；30s 答案级=正确卡 breathe + 重读。
   主动读题（startLevel/hear/点题面）重置 lastAct idle 锚（b25 M4：防长链后被当挂机连读）；
   救援自读不重置防自喂（方向级仅动 lastDir；答案级重置 lastAct=30s 自然节流）。
   语音窗（家族 G/H/I，clip 实长 SPEC-BATCH27 §4 量化）：
   rul_tut_watch 3360 → 教学演示逐根点完延至 t=900+4×500+1000=3900（≥3360+300，禁撞头）；
   rul_tut_turn 1896 → turn 后读题延 2200（≥1896+300 防尾截）；
   确认句 TTS 最长 12 字（cmp「故事书更长，有六根回形针长」estMs=12×345+600=4740）→
     判对演出窗 1800+3600=5400 ≥4740（错→对路径读题同延防链掐尾）；
   rul_right 2496 → winFlow celebrate(2620)+wait(400)=3020 ≥2496+300=2796（判对后窗）；
   rul_wrong 2880 + 引导句 TTS（estMs 最长 13 字=5085）→ 拼播链 2880+150+5085=8115，
     错点防重入窗 1000ms（batch21 §0 L9）；对选可打断链=主动交互优先；救援读题掐链由
     wrongChainUntil=8800 守卫（≥8760+300 裕量 40，全字符口径 m1）；
   rul_q 2448 → count+clip 读题 clip（stick/block 读题与 cmp 题面=TTS 拼句豁免 clip 化）。
   验收钩子：window.RU = { get currentLevel, get quiz(){kind,item,unit,units,opts,answer,
   step,miss}, tapOpt(i), start(flat), async autoSolve(), get tutorial }（getter 返回拷贝） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（家族 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，家族 I） */
const sayW = parts => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); }
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

/* ================= 题面语音（count+clip=clip rul_q；stick/block 读题与 cmp 题面
   =TTS 拼句豁免 clip 化——SPEC §1；verify 页 stub 记 __lastVoiceKey/__lastSayText） ================= */
function speakQuiz() {
  if (!cur || !cur.quizzes[cur.step]) return;
  const q = cur.quizzes[cur.step];
  if (q.kind === 'count' && q.unit === 'clip') KIDS.voice.play(VOICE.q.key, VOICE.q.text);  /* 「它有几根回形针长」 */
  else KIDS.voice.play(quizKeyOf(q), quizText(q));               /* T46 阶段2：题面 clip 化（rul_q_* 15+rul_q2，200 题域枚举零 miss） */
}

/* ================= 渲染 ================= */
function renderScene(q) {                        // 题面：count=物品+单位链（一头对齐）；cmp=大字题面句
  sceneEl.dataset.kind = q.kind;
  if (q.kind === 'count') {
    const t = ITEMS[q.item].n + '有几' + UNITS[q.unit].q + UNITS[q.unit].n + '长？';
    sceneEl.setAttribute('aria-label', t + '点我再听一遍');
    sceneEl.innerHTML =
      '<div class="q-text">' + t + '</div>' +
      '<div class="measure">' +
        '<div class="item-row">' + itemSvg(q.item, 1) + '</div>' +
        '<div class="chain" aria-hidden="true">' + chainHtml(q.unit, q.units, 1) + '</div>' +
      '</div>';
  } else {
    sceneEl.setAttribute('aria-label', '谁更长？点我再听一遍');
    sceneEl.innerHTML = '<div class="q-text cmp">谁更长？</div>';
  }
}
function renderBoard(q) {                        // count=4 数字卡（大数字+量词）/ cmp=2 物品卡（物品+链+N根）
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = (q.kind === 'count' ? 'ncard' : 'ocard') + ' card pop';
    b.dataset.i = i;
    b.style.animationDelay = (i * 70) + 'ms';
    if (q.kind === 'count') {
      b.dataset.num = o.num;                     // verify 对账（渲染即引擎）
      b.setAttribute('aria-label', o.num + UNITS[q.unit].q);
      b.innerHTML = '<span class="num">' + o.num + '</span>' +
                    '<span class="nlab">' + UNITS[q.unit].q + '</span>';
    } else {
      b.dataset.obj = o.id;                      // verify 对账（渲染即引擎）
      b.dataset.unit = o.unit;
      b.dataset.units = o.units;
      b.setAttribute('aria-label', ITEMS[o.id].n + o.units + UNITS[o.unit].q);
      b.innerHTML = '<span class="o-item">' + itemSvg(o.id, 0.55) + '</span>' +
        '<span class="o-chain" aria-hidden="true">' + chainHtml(o.unit, o.units, 0.55) + '</span>' +
        '<span class="o-tag"><span class="n">' + o.units + '</span> ' + UNITS[o.unit].q + '</span>';
    }
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();  /* 开场/换题读题；demo 门防演示收尾叠播 */
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

/* ================= 答对演出：单位链逐根点亮（count=题面链 / cmp=答案卡内链）+ 卡亮
   （确认句 TTS 由 uiTapOpt 播）；verify 页跳点亮直接落定 ---------- */
function lightChain(q) {
  let root;
  if (q.kind === 'count') root = sceneEl.querySelector('.chain');
  else { const c = cardEl(q.answer); root = c ? c.querySelector('.o-chain') : null; }
  if (!root) return;
  const cells = root.querySelectorAll('.uc');
  Array.prototype.forEach.call(cells, (c, k) => {
    setTimeout(() => c.classList.add('lit'), k * 320 * SPEED + 250 * SPEED);
  });
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
/* 教学"帮"阶段指向：当前题正确卡（数字卡/物品卡） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / RU.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错点 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）；
   越界下标=null+pop+bump（钩子契约：对 right/错 wrong/锁 false/越界 null）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+rul_wrong+语义引导句（count 方向/cmp 单位锚） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sayW([VOICE.wrong.key, { key: guideKeyOf(q, i), text: guideText(q, i) }]);  /* T46 阶段2：引导句 clip 化（rul_g_*，链尾段） */
    wrongChainUntil = Date.now() + 8800;         /* 链豁免（家族 I）：2880+150+estMs(14字符 5430)+300=8760（m1 全字符口径） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：链逐根点亮+卡亮+确认句 TTS 拼句） ---- */
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
  if (cur === run) lightChain(q);                /* 单位链逐根点亮（count 题面链 / cmp 答案卡链） */
  KIDS.voice.play(confirmKeyOf(q), confirmText(q));   /* T46 阶段2：确认句 clip 化（rul_cf_* 15+rul_cft_* 4，最长 3432 ≤ 窗 5400-300） */
  await wait(1800 * SPEED);                      /* 链点亮+卡亮+确认句主窗 */
  if (cur !== run) return r;
  await wait(3600 * SPEED);                      /* 确认句 TTS 收尾窗：总 5400 ≥ estMs(12字)=4740（b25 estMs 定版）；
                                                    错→对路径读题延 5400 防错反馈链掐在 <500ms */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（物品/链/卡全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致；禁 (ci+1)%4 章序推进） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* rul_right：量对啦，真厉害（2496ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2496+300=2796（判对后窗） */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null)（b25 形态定版） */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（家族 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.ruler && sv.ruler.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指逐根点回形针（「一根一根数」）→ 演示点正确数字卡（flat0 题0 恒 pencil|clip
   确定性锚点）；帮=指向正确卡；独=首次选对放手（watch 全程 ≤16s）
   时序（家族 G/H）：watch clip 3360ms → 逐根点 4 根（每根 250 移动+250 按停），
   t=900+4×500=2900 → 再延 1000 至 t=3900 ≥3360+300（clip 播完再演示点卡不撞头）；
   演示演出窗 5400 罩确认句 TTS 再收束 turn ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* rul_tut_watch：看！用回形针量一量（3360ms） */
  await wait(900 * SPEED);                       /* 物品+链亮相 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 pencil|clip（units=4）
  const cells = Array.prototype.slice.call(sceneEl.querySelectorAll('.chain .uc'));
  for (let k = 0; k < cells.length; k++) {       // 幽灵手指逐根点回形针——「一根一根数」
    ghost.toEl(cells[k]); ghost.show();
    await wait(250 * SPEED);
    ghost.press();
    replayAnim(cells[k], 'bump');
    await wait(250 * SPEED);
  }
  await wait(1000 * SPEED);                      /* t=900+4×500+1000=3900 ≥ watch 3360+300：clip 播完再演示点卡 */
  const idx = correctIdx(q);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__ruDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);                       /* 收尾（确认句 TTS 仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.ruler = sv.ruler || {};
  sv.ruler.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来数一数"在重发后的题面上说（照 batch5-26） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* rul_tut_turn：你来数一数（1896ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2200);                                      /* ≥1896+300 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：摆整齐再数一数 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：题面重读 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapOpt(Number(p.dataset.i));
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

/* ================= 无操作看护（命名函数 rescueTick——verify 源码级断言用）：
   14s 方向级（重读题面+题面卡 pulse，lastDir 独立节流锚，不重置 lastAct——30s 答案级
   不被饿死）/ 30s 答案级（正确卡 breathe + 重读）/ 教学"帮"5s 重演示；
   错反馈链豁免窗守卫在顶部（家族 I：链播完前救援不掐断，不挡主动点选） ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（家族 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却每 14-18s 重播读题=「一直在念题点什么都没反应」） */
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
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+题面卡 pulse（不动 lastAct） */
    speakQuiz();
    replayAnim(sceneEl, 'pulse');
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);

/* ================= 启动（命名函数 boot——verify 源码级断言家族 A 用；
   verify 分支由 game-verify.js 接管） ================= */
function boot() {
  KIDS.init({ game: 'ruler', title: '测量小尺' });   // 存档键 kidsgame_ruler（core VER 1.0，家族 C：带 v:'1.0'）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}
buildStatic();
if (!VERIFY) boot();

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口）
   RU.quiz：count→opts=[{num}×4]；cmp→opts=[{id,unit,units}×2]；item/unit/units
   统一=答案三元组（count 题面物品 / cmp 答案卡测量组）；answer=正确卡下标 ================= */
window.RU = {
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
    return { kind: q.kind,                                  /* 'count' | 'cmp'（SPEC §1 钩子契约） */
             item: q.item,                                  /* 物品 id（cmp=答案物品） */
             unit: q.unit,                                  /* 单位 id（cmp=答案测量单位） */
             units: q.units,                                /* 链长数=真值（cmp=答案卡 units） */
             opts: q.opts.map(o => q.kind === 'count' ? { num: o.num }
                                  : { id: o.id, unit: o.unit, units: o.units }),
             answer: q.answer,
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选卡，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;
      const r = await uiTapOpt(i);
      if (r === false || r === null) break;      // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
