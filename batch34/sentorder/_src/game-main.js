/* ================= sentorder 主逻辑（题面渲染 / 词卡点选填槽 / 教学 / 救援 / 推进）
   玩法：题面 = 句意插图 + 句条文字（点题面 = 重听整句 TTS——听觉+视觉双锚）；
   槽位行 = 句长 L 格；词卡池 = L+d 恒全摆（本句词乱序 + 干扰卡，已用仅灰化）。
   点「下一正确词」= 词飞入槽 + TTS 读词（'fill'）；句拼满 = 'done'
   （确认链 so_right + 整句 TTS 拼句——keyless TTS 段恒链尾，契约 N）；
   点语序跳前的本句词 = 'wrong'（so_wrong_order「这个词要晚一点说」）；
   点干扰词 = 'wrong'（so_wrong_word「这个词不是这句话的」）——两级错反馈（钩子恒 'wrong'
   不区分，两级文案实现侧按错因选 clip）；已用卡再点 = 吞 false + 轻叮 + bump（不记 miss）。
   miss>=2 下一正确词卡 breathe（答案级）。
   救援两级（家族 B）：14s 方向级 = so_hint + 题面卡 pulse（lastDir 独立节流锚）；
   30s 答案级 = 应点卡 breathe + 整句重读。
   主动读题（startLevel/hear/点题面/fill/done）重置 lastAct idle 锚（b25 M4）；救援自读不重置防自喂。
   语音窗（家族 G/H/I/T，实长 _clipdur34.json 真值）：
   so_tut_watch 2952 → 教学演示首 tap 延至 t=900+3100=4000（≥2952+300=3252，禁撞头）；
   so_tut_turn 1824 → turn 后读题延 2200（≥1824+300=2124 防尾截）；
   词音 fill 窗 = WORD_WIN 字数档 worst clip+300（T46：1548/1740/2004；estMs 口径退役）；
   确认链 so_right 2520+150+整句 clip so_s worst 2952（T46）=5922 → done 演出窗
     2600+4500=7100 ≥6675+300（契约 G/H；≥SPEC §4 7020 口径同样罩满）；
   错链两条取 max：word 2784+150+so_hint 2760+300=5994 → wrongChainUntil=6000（家族 I），
     错点防重入窗 1000ms；对选可打断链；救援读题掐链由豁免窗守卫；
   题面整句 so_s clip 最长 2952 fire-and-forget（<14000 方向级救援间隔，无掐尾）。
   验收钩子（无条件挂 window——gate G2/R8 真实页可达）：
   window.SO = { get currentLevel, get quiz(){words[],opts[]({w,used}),picked[],step(全关题号
   0-4——b33 坑①),miss}, tapWord(i), start(flat), async autoSolve(), get tutorial }——
   tapWord 返回值族：fill/done/wrong/false(已用卡或演出窗吞)/null(越界)，全 async；getter 返回拷贝 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.03 : 1;               // verify 页内 UI 演出提速（12 单元含 flat0-19 全量 UI
                                              // 驱动 ≈50s@0.03——0.12 下 ≈150s 超 gate G1 轮询窗 120s，
                                              // 0.03 留 ≥2 倍余量防并行负载抖动）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限
   救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
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
const cardEl = i => boardEl.querySelector('.wcard[data-i="' + i + '"]');
const slotEl = j => slotsEl.querySelector('.cell[data-j="' + j + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：词入槽=双音上扬 / 答错=低柔单音 / 判对=双音上行 */
const wordHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };

/* ================= 题面语音（整句 TTS——听句是拼句任务的听觉锚）
   verify 页 stub 记 __lastQueue/__lastVoiceKey/__lastSay ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (q) KIDS.voice.play(sentClipOf(q), q.text);   /* 整句（T46 化：so_s_* 全句 clip——fire-and-forget，最长 2952 < 方向级救援 14s） */
}

/* ================= 渲染 ================= */
function renderScene(q) {                            // 题面：句意插图 + 句条文字
  sceneEl.setAttribute('aria-label', q.text + '，点我再听一遍');
  sceneEl.innerHTML = '<div class="pic">' + sentSvg(q.pic) + '</div>' +
    '<div class="line">' + q.text + '</div>';
}
function renderSlots(q) {                            // 槽位行：句长 L 格（空=虚线格）
  slotsEl.innerHTML = '';
  for (let j = 0; j < q.words.length; j++) {
    const b = document.createElement('button');
    b.className = 'cell';
    b.dataset.j = j;
    b.setAttribute('aria-label', '第' + (j + 1) + '格，空');
    b.innerHTML = '<span class="wd"></span>';
    slotsEl.appendChild(b);
  }
}
function renderBoard(q) {                            // 词卡池：L+d 恒全摆（data-w=词——verify 对账）
  boardEl.innerHTML = '';
  for (let i = 0; i < q.opts.length; i++) {
    const b = document.createElement('button');
    b.className = 'wcard pop';
    b.dataset.i = i;
    b.dataset.w = q.opts[i].w;
    b.style.animationDelay = (i * 70) + 'ms';
    b.setAttribute('aria-label', '词 ' + q.opts[i].w);
    b.innerHTML = '<span class="ch">' + q.opts[i].w + '</span>';
    boardEl.appendChild(b);
  }
}
function fillSlot(j, w) {                            // 词入槽（帧内容断言锚：.wd 文本即槽序）
  const c = slotEl(j);
  if (!c) return;
  c.classList.remove('breathe');
  c.classList.add('full');
  c.setAttribute('aria-label', '第' + (j + 1) + '格，' + w);
  const wd = c.querySelector('.wd');
  wd.textContent = w;
  wd.style.animation = 'none'; void wd.offsetWidth; wd.style.animation = '';   // 重触发 wd-in
}
function hintBreathe(q) {                            // miss≥2 下一正确词卡亮（答案级——不自动填入）
  const i = correctIdx(q);
  if (i >= 0) { const el = cardEl(i); if (el) replayAnim(el, 'breathe'); }
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
function renderStep() {                              // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                              // 章节点（1 基，生成关循环章画到当前章）
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
/* 教学"帮"阶段指向：当前题应点卡（下一正确词的未用卡） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / SO.tapWord / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡池容器 bump 微动效——家族 D）：演出窗/已用卡=false+pop+bump；
   越界=null+pop+bump；错点 1000ms 防重入窗（b16 定案禁偏离）========== */
async function uiTapWord(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;                                 // 演出窗/教学演示期吞点=false（钩子契约）
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  /* 家族 I：错链窗内错点吞/对选放行（真时钟，b31 定版——locked×SPEED 窗 verify 页缩水 30ms 漏二击）。
     core 判定即计 miss，须判定前拦；预判口径与 engTapWord 同构（!used && w===words[picked.length] 才是对选）；
     越界/used 不入窗预判（保留 core 语义：越界=null、used 原路径） */
  if (Date.now() < wrongChainUntil && Number.isInteger(i) && i >= 0 && i < q.opts.length) {
    const c0 = q.opts[i];
    if (!(c0 && !c0.used && c0.w === q.words[q.picked.length])) {
      sfx('pop'); replayAnim(boardEl, 'bump'); return false;   /* 窗内错点吞（家族 D 轻叮配 bump） */
    }
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapWord(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界下标
  if (r === 'used') {                            // 已用卡：轻叮+可见回应（不记 miss）→ 吞 false
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const el = cardEl(i);
  const w = q.opts[i].w;

  if (r === 'fill') {                            /* 下一正确词（非末词）：词飞入槽+TTS 读词 */
    state.locked = true;
    if (el) { el.classList.remove('pop', 'breathe'); el.classList.add('gone'); }
    fillSlot(q.picked.length - 1, w);
    wordHi();
    KIDS.voice.play(wordClipOf(w), w);           /* 读词（T46 化：so_w_* clip——零 keyless） */
    await wait(WORD_WIN[w.length] * SPEED);      /* 词音窗（T46 字数档 worst clip+300：1548/1740/2004——estMs 口径 1 字档差 3ms 退役） */
    if (cur !== run) return r;
    lastAct = Date.now();                        /* 正确推进重置救援钟（§0.7a） */
    state.locked = false;
    return r;
  }

  if (r === 'wrong') {                           /* 错点：wig+miss+两级错反馈链 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const why = wrongWhy(q, w);                  /* 两级错因：'order' 语序跳前 / 'word' 干扰词 */
    const wrongKey = why === 'order' ? VOICE.wordOrder.key : VOICE.wrongWord.key;
    if (sayW([wrongKey, VOICE.hint.key]))        /* 拼播链：wrong_x+so_hint（仅链起播时设窗） */
      wrongChainUntil = Date.now() + 6000;       /* 链豁免（家族 I）：max(2424,2784)+150+2760+300=5994 */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由豁免窗让路 */
    if (cur !== run) return r;
    if (q._miss >= 2) hintBreathe(q);            /* miss≥2 下一正确词卡亮（答案级） */
    state.locked = false;
    return r;
  }

  /* ---- done（句拼满：演出+确认链 right+整句 TTS 朗读） ---- */
  lastAct = Date.now();                          /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：句拼满（末词对）→ 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('pop', 'breathe'); el.classList.add('gone'); }
  fillSlot(q.picked.length - 1, w);
  for (let k = 0; k < q.words.length; k++) {     /* 目标槽整排亮绿 */
    const c = slotEl(k);
    if (c) { c.classList.remove('breathe'); c.classList.add('win'); }
  }
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key, sentClipOf(q)]);   /* 确认链（T46 化）：right+整句 so_s clip 两段全键——零 keyless */
  await wait(2600 * SPEED);                      /* 入槽+演出主窗 */
  if (cur !== run) return r;
  await wait(4500 * SPEED);                      /* 链收尾窗：总 7100 ≥2520+150+so_s worst 2952+300=5922（T46 clip 口径，契约 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (cur.done) { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（插图/槽/卡全换）+读题 */
  return 'done';
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
    await wait(400);                             /* 演出收尾窗（确认链已在 uiTapWord 7100 窗内播完） */
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
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.sentorder && sv.sentorder.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读整句 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指按序点 小兔子→吃→萝卜 句拼满（flat0 题0 恒=ch1 首句「小兔子吃萝卜」3 词——确定性锚点；
   逐词点入+读词，末词 done 确认链 right+整句朗读）；帮=指向应点卡；独=首次句拼满放手
   时序（家族 G/H）：watch clip 2952ms → 演示首 tap 延至 t=900+3100=4000（≥2952+300=3252），
   确认词音不与 watch 撞头；done 演出窗 7100 罩确认链再收束 turn */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* so_tut_watch：看！拼出一句话（2952ms） */
  await wait(900 * SPEED);                       /* 插图+槽位+词卡亮相 */
  const i0 = correctIdx(cur.quizzes[0]);         // 第一张「小兔子」卡（flat0 题0 恒首句）
  pointGhostAt(cardEl(i0));
  await wait(3100 * SPEED);                      /* t=4000 ≥ watch 2952+300=3252：clip 播完再演示（不撞头） */
  ghost.press();
  await wait(320 * SPEED);
  await uiTapWord(i0, true);                     /* 小兔子 → 'fill'（demo 通道豁免 locked 门；读词 TTS） */
  const i1 = correctIdx(cur.quizzes[0]);         // 「吃」卡
  pointGhostAt(cardEl(i1));
  await wait(600 * SPEED);                       /* ghost 移位收束 */
  ghost.press();
  await wait(320 * SPEED);
  await uiTapWord(i1, true);                     /* 吃 → 'fill' */
  const i2 = correctIdx(cur.quizzes[0]);         // 「萝卜」卡（末词）
  pointGhostAt(cardEl(i2));
  await wait(600 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  window.__soDemoR = await uiTapWord(i2, true);  /* 萝卜 → 'done'（句拼满，链 right+整句 TTS；演示完成=唯一写点） */
  await wait(500 * SPEED);                       /* 收尾（确认链由 uiTapWord 7100 窗罩满） */
  const sv = KIDS._save() || {};
  sv.sentorder = sv.sentorder || {};
  sv.sentorder.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来拼一拼"在重发后的题面上说（照 batch5-33） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* so_tut_turn：你来拼一拼（1824ms） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：想一想，先说哪一个 */
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
  speakQuiz();                                   /* 再听一遍：整句重读 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听整句（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.wcard');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapWord(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.wcard') || e.target.closest('#scene')) return;
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
   14s 方向级（so_hint+题面卡 pulse，lastDir 独立节流锚，不重置 lastAct——30s 答案级
   不被饿死）/ 30s 答案级（应点卡 breathe+整句重读）/ 教学"帮"5s 重演示；
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
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：hint+题面卡 pulse（不动 lastAct） */
    sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'sentorder', title: '句子拼拼乐' });   // 存档键 kidsgame_sentorder（core VER 1.0，家族 C：带 v:'1.0'）
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
   gate G2 教学链+通关、R8 真实路径推进依赖真实页可达） ================= */
window.SO = {
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
    return { words: q.words.slice(),                           /* 本句正确语序词（SPEC §2 钩子契约） */
             opts: q.opts.map(c => ({ w: c.w, used: !!c.used })),   /* 候选卡池恒全摆 L+d */
             picked: q.picked.slice(),                         /* 已入槽词序 */
             step: cur.step,                                   /* 全关题号 0-4（b33 坑①：非词进度） */
             miss: q._miss || 0 };
  },
  tapWord(i) { return uiTapWord(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐词点 solveNext 应点卡，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 200) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;
      const r = await uiTapWord(i);
      if (r === null || r === false) break;      // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
