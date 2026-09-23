/* ================= wordpuz 主逻辑（题面渲染 / 字母卡点选填槽 / 教学 / 救援 / 推进）
   玩法：题面 = 目标词插图 + 中文提示徽章（点题面=重听 wpu_q+词音拼播链）；
   槽位行 = 词长格；字母卡乱序点选。点下一个所需字母 = 字母飞入槽位（'moved'）；
   槽位串接===目标词 = 词完成（'right'/'done'，拼播链 wpu_right+wpu_w_<word> 确认）；
   点非所需字母 = wrong + miss + wig；已用卡再点 = 'false' + pop + bump（不记 miss）；
   重复字母点任一同字母未用卡均合法（多重集语义——殊途同达）。
   miss≥2 首字母槽亮提示（sp_first 先例）。
   救援两级（§0.72/家族 B 定版）：14s 方向级=重读题面 + 题面卡 pulse（lastDir 独立
   节流锚，不重置 lastAct）；30s 答案级=应点卡 breathe + 重读（应点卡=solveNext 实算）。
   主动读题（startLevel/hear/点题面）重置 lastAct idle 锚（b25 M4）；救援自读不重置防自喂。
   语音窗（家族 G/H/I，clip 实长 SPEC-BATCH29 §4 量化）：
   wpu_tut_watch 3048 → 教学演示首 tap 延至 t=900+3100=4000（≥3048+300=3348，禁撞头）；
   wpu_tut_turn 1824 → turn 后读题延 2200（≥1824+300=2124 防尾截）；
   判对拼播链 wpu_right 2496+150+词音（max 1608）=4254 → 判对演出窗 1800+3000=4800
     ≥4254+300=4554（契约 G/H；demo 机制句 estMs(9)=3705 同窗罩满）；
   wpu_wrong 2256 + 引导句 TTS（estMs 全字符 10 字=4050）→ 拼播链 2256+150+4050=6456，
     错点防重入窗 1000ms；对选可打断链；救援读题掐链由 wrongChainUntil=6900 守卫
     （≥2256+150+4050+300=6756，家族 I）；
   题面句链 wpu_q 2136+150+词音 ≤3894 fire-and-forget（<14000 方向级救援间隔，无掐尾）。
   验收钩子（无条件挂 window，与家族先例 CD/BE/PM 一致——gate G2/R8 真实页可达）：
   window.WP = { get currentLevel, get quiz(){word,zh,pool[],slots[],
   answer(下一所需字母——字母而非下标),step,miss}, tapLtr(i), start(flat),
   async autoSolve(), get tutorial }——tapLtr 返回值族：
   moved/right/done/wrong/false(已用卡)/null(越界或演出窗)，全 async；getter 返回拷贝 */
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
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), boardEl = $id('board'), slotsEl = $id('slots'),
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
const ltrEl = i => boardEl.querySelector('.ltr[data-i="' + i + '"]');
const slotEl = j => slotsEl.querySelector('.cell[data-j="' + j + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：字母入格=双音上扬 / 答错=低柔单音 / 判对=双音上行 */
const letterHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };

/* ================= 题面语音（题面句+英语词音 queue 拼播链——SPEC §4）
   verify 页 stub 记 __lastQueue/__lastVoiceKey ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([VOICE.q.key, wordKey(q.word)]);   /* 「看图拼单词」+ cat（≤2136+150+1608=3894） */
}

/* ================= 渲染 ================= */
function renderScene(q) {                        // 题面：题面句条 + 插图 + 中文提示徽章
  sceneEl.setAttribute('aria-label', quizText() + '，点我再听一遍');
  sceneEl.innerHTML = '<div class="q-text">' + quizText() + '</div>' +
    '<div class="pic">' + wordSvg(q.word) + '</div>' +
    '<div class="zh">' + q.zh + '</div>';
}
function renderSlots(q) {                        // 槽位行：词长格（空=虚线格）
  slotsEl.innerHTML = '';
  for (let j = 0; j < q.word.length; j++) {
    const b = document.createElement('button');
    b.className = 'cell';
    b.dataset.j = j;
    b.setAttribute('aria-label', '第' + (j + 1) + '格，空');
    b.innerHTML = '<span class="lt"></span>';
    slotsEl.appendChild(b);
  }
}
function renderBoard(q) {                        // 字母卡排：池乱序卡（data-l=字母——verify 对账）
  boardEl.innerHTML = '';
  for (let i = 0; i < q.pool.length; i++) {
    const b = document.createElement('button');
    b.className = 'ltr pop';
    b.dataset.i = i;
    b.dataset.l = q.pool[i].ch;
    b.style.animationDelay = (i * 70) + 'ms';
    b.setAttribute('aria-label', '字母 ' + q.pool[i].ch);
    b.innerHTML = '<span class="ch">' + q.pool[i].ch + '</span>';
    boardEl.appendChild(b);
  }
}
function fillSlot(j, letter) {                   // 字母入格（帧内容断言锚：.lt 文本即槽序）
  const c = slotEl(j);
  if (!c) return;
  c.classList.remove('breathe');                 // 首字母亮提示使命完成
  c.classList.add('full');
  c.setAttribute('aria-label', '第' + (j + 1) + '格，字母 ' + letter);
  const lt = c.querySelector('.lt');
  lt.textContent = letter;
  lt.style.animation = 'none'; void lt.offsetWidth; lt.style.animation = '';   // 重触发 lt-in
}
function firstSlotHint() {                       // miss≥2 首字母槽亮（sp_first 先例——不自动填入）
  const c = slotEl(0);
  if (c && !c.classList.contains('full')) replayAnim(c, 'breathe');
}
function renderQuiz(speak) {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderSlots(q);
  renderBoard(q);
  renderStep();
  if (speak !== false && !VERIFY && !state.demo && !state.quiet) speakQuiz();  /* 开场/换题读题 */
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
/* 教学"帮"阶段指向：当前题应点卡（下一所需字母的未用卡） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(ltrEl(i));
}

/* ================= 点卡主路径（真实点击 / WP.tapLtr / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）：演出窗/越界=null+pop+bump；
   已用卡='false'+pop+bump（不记 miss）；错点 1000ms 防重入窗（b16 定案禁偏离）========== */
async function uiTapLtr(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return null;                                 // 演出窗/教学演示期吞点=null（钩子契约）
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapLtr(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界下标
  const el = ltrEl(i);

  if (r === 'false') {                           /* 已用卡：轻叮+可见回应（不记 miss） */
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return r;
  }

  if (r === 'moved') {                           /* 所需字母入槽：字母飞入+落定窗 */
    state.locked = true;
    if (el) { el.classList.remove('pop'); el.classList.add('gone'); }
    fillSlot(q.slots.length - 1, q.pool[i].ch);
    letterHi();
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  if (r === 'wrong') {                           /* 非所需字母：wig+miss+错反馈链 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, { key: 'wpu_g_wrong', text: GUIDE.wrong }]))   /* 拼播链：wpu_wrong+引导句 clip（T46 阶段2；text=TTS 兜底；仅链起播时设窗） */
      wrongChainUntil = Date.now() + 6900;       /* 链豁免（家族 I）：2256+150+2976(wpu_g_wrong 实长)+300=5682 */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    if (q._miss >= 2) firstSlotHint();           /* miss≥2 首字母槽亮（sp_first 先例） */
    state.locked = false;
    return r;
  }

  /* ---- right·done（槽位串接===目标词：演出+判对拼播链 right+词音确认） ---- */
  lastAct = Date.now();                          /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('pop', 'breathe'); el.classList.add('gone'); }
  fillSlot(q.slots.length - 1, q.pool[i].ch);
  for (let k = 0; k < q.word.length; k++) {      /* 目标槽整排亮绿 */
    const c = slotEl(k);
    if (c) { c.classList.remove('breathe'); c.classList.add('win'); }
  }
  chimeGoal();
  sfx('coin');
  if (demo) KIDS.voice.play('wpu_demo', DEMO_SAY);   /* 教学 demo=机制句 clip（T46 阶段2，实长 2832；text=TTS 兜底） */
  else KIDS.voice.queue([VOICE.right.key, wordKey(q.word)]);   /* 判对拼播链：2496+150+词音≤1608=4254 */
  await wait(1800 * SPEED);                      /* 入格+演出主窗 */
  if (cur !== run) return r;
  await wait(3000 * SPEED);                      /* 链收尾窗：总 4800 ≥4254+300=4554（契约 G/H；
                                                    错→对路径读题同延防链掐尾） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（插图/槽/卡全换）+读题 */
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
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 演出收尾窗（判对链已在 uiTapLtr 4800 窗内播完） */
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.wordpuz && sv.wordpuz.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指按序点 c→a→t 槽位填满（flat0 题0 恒 word=cat 池=[c,a,t]——确定性锚点；
   演示句「点字母，放进格子里」）；帮=指向应点卡；独=首次选对放手
   时序（家族 G/H）：watch clip 3048ms → 演示首 tap 延至 t=900+3100=4000（≥3048+300=3348），
   确认机制句不与 watch 撞头；判对演出窗 4800 罩机制句 TTS（estMs(9)=3705）再收束 turn（全程 ≤16s） */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* wpu_tut_watch：看！拼出小单词（3048ms） */
  await wait(900 * SPEED);                       /* 插图+槽位+字母卡亮相 */
  const i0 = correctIdx(cur.quizzes[0]);         // 第一张 c 卡（flat0 题0 恒 cat）
  pointGhostAt(ltrEl(i0));
  await wait(3100 * SPEED);                      /* t=4000 ≥ watch 3048+300=3348：clip 播完再演示（不撞头） */
  ghost.press();
  await wait(320 * SPEED);
  await uiTapLtr(i0, true);                      /* c → 'moved'（demo 通道豁免 locked 门；中途不写 __wpDemoR——gate/verify 只认终值） */
  const i1 = correctIdx(cur.quizzes[0]);         // a 卡
  pointGhostAt(ltrEl(i1));
  await wait(600 * SPEED);                       /* ghost 移位收束 */
  ghost.press();
  await wait(320 * SPEED);
  await uiTapLtr(i1, true);                      /* a → 'moved' */
  const i2 = correctIdx(cur.quizzes[0]);         // t 卡
  pointGhostAt(ltrEl(i2));
  await wait(600 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  window.__wpDemoR = await uiTapLtr(i2, true);   /* t → 'right'（cat 拼满，链 right+cat 词音；演示完成一题=唯一写点） */
  await wait(500 * SPEED);                       /* 收尾（判对链由 uiTapLtr 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.wordpuz = sv.wordpuz || {};
  sv.wordpuz.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来拼一拼"在重发后的题面上说（照 batch5-28） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* wpu_tut_turn：你来拼一拼（1824ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2200);                                      /* ≥1824+300=2124 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：看图想一想 */
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
  speakQuiz();                                   /* 再听一遍：题面句+词音重读 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.ltr');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapLtr(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.ltr') || e.target.closest('#scene')) return;
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
   不被饿死）/ 30s 答案级（应点卡 breathe + 重读）/ 教学"帮"5s 重演示；
   错反馈链豁免窗守卫在顶部（家族 I：链播完前救援不掐断，不挡主动点选） ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（家族 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板遮挡期救援静默（家族 K：层在时点击全吞却每 14-18s 重播读题=「一直在念题点什么都没反应」） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = ltrEl(i); if (ok) replayAnim(ok, 'breathe'); }
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
  KIDS.init({ game: 'wordpuz', title: '单词拼图' });   // 存档键 kidsgame_wordpuz（core VER 1.0，家族 C：带 v:'1.0'）
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

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；无条件挂 window——
   与家族先例 CD/BE/PM 一致：gate G2 教学链+通关、R8 真实路径推进依赖真实页可达） ================= */
window.WP = {
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
    return { word: q.word,                                   /* 目标词（SPEC §3 钩子契约） */
             zh: q.zh,                                       /* 中文提示 */
             pool: q.pool.map(c => ({ ch: c.ch, used: !!c.used })),
             slots: q.slots.slice(),                         /* 已填字母序 */
             answer: q._answered ? null : q.word[q.slots.length],   /* 下一所需字母——字母而非下标（多重集语义） */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapLtr(i) { return uiTapLtr(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐字母点 solveNext 应点卡，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;
      const r = await uiTapLtr(i);
      if (r === null || r === false) break;      // 锁死/重玩保护（'false' 字符串≠false 布尔）
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
