/* ================= calendar 主逻辑（题面渲染 / 词卡点选 / 序列条可视化 / 教学 / 救援 / 推进）
   玩法：题面 = 日历小星 + 题面句 + 顶部星期/月份序列条（base 橙亮带方向箭头；
   答对后答案位绿亮+小星填入），下方 4 张天/月词卡（cbound 组合日期词卡 wide 字号自适应）。
   点对 = 卡亮起 + 确认句 + 小星点亮；点错 = 卡摇头 + 方向语义反馈（禁「错了」），
   1000ms 防重入窗（b16 定案）后可重选（卡不灰——探索不罚）。
   播放分路（SPEC-R37 §R4 + §R6-bis 全十型段链化）：题面/确认/救援/方向/hint 一律
   clip 段链或单键（quizKeys/confirmKeys/dirKey/playHint 构造；±1 旧四型=T46 在册键，
   jump/dateq/cbound=§R6-bis 37 新键）——**键未注册期缺键兜底=整句文本轨=静默告警**
   （core Task#46 阶段3 已删 speechSynthesis，speak=console.warn 丢弃；不伪造缺失键）——
   判对收尾窗沿 T46 动态先例：max(estMs, chainMs)（链实长罩 TTS 估算；缺键期 chainMs
   计 0 < estMs → 窗恒 estMs，注册后自动切链实长——禁回退固定窗）。
   救援两级（家族 B）：14s 方向级=±1 接龙（day/month）queue([cal_q]+题面段链)/
   反向+jump/dateq/cbound=题面段链重读（不加 cal_q 引导——「它的后面」对非接龙字面假）；
   lastDir 独立节流锚不重置 lastAct；
   30s 答案级=正确卡 breathe+重读题面。
   语音窗（家族 G/H）：cal_tut_watch 3312 → 教学演示 tap 延至 t=3612（900+2712≥3312+300）；
   cal_tut_turn 1776 → turn 后读题延 2100；cal_right 2400 → celebrate(2620)+400=3020≥2700；
   错窗 1000ms；cal_q 2304 → 救援 queue 段；确认句窗=estMs 动态（345×字+600）——
   判对窗合计 800+max(estMs,chainMs)+300（缺键期 chainMs<estMs 恒取 estMs）。
   b25 M4 承接：主动读题（renderQuiz/startLevel）后重置 lastAct；救援自读不重置。
   门族一致性（r34 F1）：rabbit/replay=locked+demo+won；hear=locked+demo（补）；
   scene=locked+demo+won（补）；board=uiTapOpt 三门；stage 空白=locked+won+demo 轻叮。
   验收钩子：window.CA = { get currentLevel, get quiz(){kind, base, answer, opts[]{id,word},
   step, miss}, tapOpt(i), start(flat), async autoSolve(), get tutorial }（getter 返回拷贝） */
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
/* 纠错语义反馈（SPEC §0.63 无 flat 限定）：方向语义句全程播——flat<3 每错必播（教育优先）；
   flat≥3 走 10s 节流（节流对象=语义句本身，非通用 clip；审查 M2） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，审查 M4） */
const sayWrong = (q, word) => {
  if (!cur) return;
  const now = Date.now();
  if (cur.flat < 3 || now - lastWrongVoice > 10000) {
    lastWrongVoice = now;
    const dk = dirKey(q, word);
    /* 键轨（R37-bis）：单键=play（±1 cal_fb_ 系与 cal_self_ 系 + jump 数数 cal_fb_j_ 系）；
       数组=两段链（cbound d1=月词+cal_fb_cb_31|32）——缺键兜底=整句文本轨（静默告警） */
    if (Array.isArray(dk)) {
      if (dk.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(dk);
      else KIDS.voice.say(dirText(q, word));
    } else KIDS.voice.play(dk, dirText(q, word));
  }
};

const sceneEl = $id('scene'), boardEl = $id('board'), seqEl = $id('seq'),
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

/* ================= 题面语音（播放分路 SPEC-R37 §R4+§R6-bis）：全十型段链拼播
   （quizKeys 构造——±1=T46 在册键 / 新题型=§R6-bis 键；缺段防御=整句文本兜底：
   core voice.say=play(null,text) 无 clip 回退——Task#46 阶段3 删 TTS 后=静默告警） */
const playChain = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.voice.say(fallback);
};
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  playChain(quizKeys(q), quizText(q));      /* 「星期三的后面是星期几？」词+骨架段链；新题型同构 */
}
/* 救援 14s 方向级：±1 接龙题（day/month）=cal_q 引导 clip → 段链接力题面（cal_q 用途定版）；
   反向/jump/dateq/cbound=题面段链重读（playChain 缺键兜底文本轨——§R6-bis 注册后走链；
   非 ±1 接龙不加 cal_q 引导：「它的后面是哪一个」对 dateq/cbound 字面假） */
function rescueDirVoice() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'day' || q.kind === 'month') {
    const ks = quizKeys(q);
    if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue([VOICE.q.key].concat(ks));
    else KIDS.voice.queue([{ key: VOICE.q.key }, { key: null, text: quizText(q) }]);   /* 防御：缺段回原 TTS 接力 */
  } else playChain(quizKeys(q), quizText(q));
}
/* 兔兔 hint / 空白轻提示分向（SPEC-R37 §R4+§R6-bis）：±1=在册 cal_hint/cal_prev；
   jump 四型=数数教学句 cal_hint_p2/m2/p2m/m2m / dateq=cal_hint_dq / cbound=cal_hint_cb
   （§R6-bis 键——未注册期 play 缺键兜底=文本轨静默，文案与键文案严格一致） */
function playHint(q) {
  if (q.kind === 'cbound') { KIDS.voice.play('cal_hint_cb', '想一想，这个月过完是哪个月'); return; }
  if (q.kind === 'dateq') { KIDS.voice.play('cal_hint_dq', '日子过两天，星期也走两天'); return; }
  if (isJumpK(q.kind)) {
    const fwd = dOf(q.kind) > 0, mo = q.kind.indexOf('month') >= 0;
    KIDS.voice.play(mo ? (fwd ? 'cal_hint_p2m' : 'cal_hint_m2m') : (fwd ? 'cal_hint_p2' : 'cal_hint_m2'),
                    mo ? (fwd ? '数一数，往后数两个月' : '数一数，往前数两个月')
                       : (fwd ? '数一数，往后数两天' : '数一数，往前数两天'));
    return;
  }
  if (isRev(q.kind)) KIDS.voice.play('cal_prev', '想想它的前面是谁');
  else KIDS.voice.play(VOICE.hint.key, VOICE.hint.text);
}

/* ================= 渲染 ================= */
function renderScene(q) {                        // 题面：日历小星 + 题面句文字条
  sceneEl.dataset.kind = q.kind;
  sceneEl.setAttribute('aria-label', quizText(q) + '，点我再听一遍');
  sceneEl.innerHTML = '<div class="star-slot"><div id="starpet">' + starSvg(112) + '</div></div>' +
    '<div class="q-text">' + quizText(q) + '</div>';
}
function renderBoard(q) {                        // 天/月词卡排（大字词卡，序列位置看顶部序列条）
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    /* cbound 组合日期词 5-7 字：wide5/wide7 字号自适应（卡 ≥96×96 不变，词不溢卡宽） */
    b.className = 'card pop' + (o.word.length >= 7 ? ' wide7' : o.word.length >= 5 ? ' wide5' : '');
    b.dataset.i = i;
    b.dataset.w = o.word;                        // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', o.word);
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="word">' + o.word + '</span>';
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderSeqInto(seqEl, q);                       // 序列条（base 橙亮+方向箭头，答案位不亮防泄题）
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) {
    speakQuiz();                                 /* 开场/换题读题；demo 门防演示收尾叠播 */
    lastAct = Date.now();                        /* b25 M4：主动读题重置 idle 锚（长句不当挂机） */
  }
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
/* 教学"帮"阶段指向：当前题正确词卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点词卡主路径（真实点击 / CA.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（词卡排容器 bump 微动效——家族 D）；
   错点 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）========== */
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
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+方向语义反馈（分向模板），卡不灰可重选 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    replayAnim(seqEl.querySelector('.cell[data-w="' + q.opts[i].word + '"]'), 'wig');  /* 序列条闪所点格（试玩 P3-a：方向句配视觉锚） */
    dodgeLo();
    sayWrong(q, q.opts[i].word);                 /* 方向语义句全程（flat≥3 10s 节流，审查 M2） */
    wrongChainUntil = Date.now() + 4600;         /* 链豁免：estMs(最长方向句 4050)+300+裕量（审查 M4） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms（batch21 §0 L9）；救援掐断由 wrongChainUntil 守卫 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：卡亮起+序列条答案位亮+小星填入+确认句） ---- */
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
  seqLightAnswer(seqEl, q);                      /* 序列条答案位绿亮+小星（日历小星点亮） */
  const star = sceneEl.querySelector('#starpet');
  if (star) replayAnim(star, 'hop');
  /* 确认句播放（R37-bis 全十型段链；缺键兜底=整句文本轨静默） */
  playChain(confirmKeys(q), confirmText(q));
  await wait(800 * SPEED);                       /* 卡亮+小星动画主窗 */
  if (cur !== run) return r;
  /* 确认句收尾窗沿 T46 动态先例（禁固定窗）：estMs 与 clip 链实长较大者
     （10 字句 4050/链 5268 取大；§R6-bis 键未注册期 chainMs 计 0<estMs 恒取 estMs） */
  const confMs = Math.max(estMs(confirmText(q)), chainMs(confirmKeys(q)));
  await wait((confMs + CONFIRM_PAD) * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（题型/词/序列条全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（审查 M3：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* cal_right：答对啦，你真棒（2400ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2400+300（判对后窗 ≥2700） */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null)（任务书定版） */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（审查 M2/M4 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.calendar && sv.calendar.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面（TTS 拼句） */
  lastAct = Date.now();                          /* b25 M4：主动读题重置 idle 锚 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示接龙一个（flat0 题0 恒 星期三→星期四——确定性锚点，卡亮+小星填入）
   →帮=指向正确词卡；独=首次选对放手（watch 全程 ≤16s）
   时序（家族 G/H）：cal_tut_watch 3312ms → 演示 tap 延至 t=3612（900+2712 ≥ 3312+300），
   确认句 TTS 不与 watch 撞头；判对窗（800+estMs+300）罩满确认句再收束 turn ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* cal_tut_watch：看！星期几排排队（3312ms） */
  await wait(900 * SPEED);                       /* 小星亮相 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 day/星期三（→星期四）
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));
  await wait(2712 * SPEED);                      /* t=3612 ≥ watch 3312+300：clip 播完再演示（不撞头） */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__caDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);                       /* 收尾（确认句 TTS 仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.calendar = sv.calendar || {};
  sv.calendar.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来想一想"在重发后的题面上说（照 batch5-25） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* cal_tut_turn：你来想一想（1776ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2100);                                      /* ≥1776+300 防尾截（turn 后读题延） */
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
  const q = cur.quizzes[cur.step];               /* 戳兔子=方向提示（playHint 分向：±1 在册/新题型 TTS） */
  if (!q) return;
  playHint(q);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* r34 F1：补 demo 门（教学 watch 期听题叠播） */
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：题面重读（段链/TTS 分路） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 门族对齐（补 won 纵深） */
  lastAct = Date.now();
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
    const q = cur.quizzes[cur.step];
    if (q) playHint(q);                                                /* 空白轻提示与兔兔同分向（§0.16） */
  }
});

/* ================= 无操作看护：14s 方向级（接龙=cal_q 引导+题面接力 / 反向=题面重读
   +题面 pulse，lastDir 独立节流锚，不重置 lastAct——30s 答案级不被饿死）/
   30s 答案级（正确卡 breathe+重读题面）/ 教学"帮"5s 重演示 */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（审查 M4）：链播完前救援不掐断 */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();                        /* 防重触发（30s 级自身节流） */
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：读题+题面 pulse（不动 lastAct） */
    rescueDirVoice();
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
  KIDS.init({ game: 'calendar', title: '日历小星' });   // 存档键 kidsgame_calendar（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.CA = {
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
    return { kind: q.kind,                                /* SPEC §3 钩子契约：题型 id */
             base: q.base,                                /* 题面词（全词字符串） */
             answer: q.answer,                            /* 正确项词（=序列后继/前驱） */
             opts: q.opts.map(o => ({ id: o.id, word: o.word })),   /* {id,word} 契约字段 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选词卡，走真实判定链）
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
