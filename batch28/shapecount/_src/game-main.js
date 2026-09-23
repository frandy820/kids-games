/* ================= shapecount 主逻辑（r3 难度改造版：题面渲染双模式 / 数字卡点选 /
   目标点亮 / 教学（两个两个分组数）/ 救援 / 推进）
   玩法：题面 = 图形场景（r3 双模式：count/dual=散点 12 槽 / grid·gridmiss=r×c 阵列）
   + 题面句 TTS 拼句（count「三角形有几个？」=queue 链 [shc_q 任务锚, 题面句]；
   grid「排好队的图形，一共有几个？」/ gridmiss「有空格的图形，一共几个？」/
   dual「红色的圆形有几个？」）；一律 4 数字卡。ch4 全题漂移（drift-x 横摆 ±9px
   慢速 CSS 动画——r3 ④ 移动干扰：纯视觉层，判定 scene 真值不变）。
   点对 = 场景目标图形逐个点亮（count=ask 形 / grid·gridmiss=全阵 / dual=形+色双匹配）
   + 卡亮 + 确认句 TTS 拼句（「一共，有十二个」/「红色的圆形，有四个」——NUMCN 2=两）；
   点错 = 卡摇头 + queue 链 [shc_wrong clip, 语义引导句 TTS]（count/grid 按所点数字
   方向 / gridmiss 结构锚 / dual 两步过滤锚），1000ms 防重入窗（b16 定案）后可重选。
   救援两级（§0.68/家族 B 定版）：14s 方向级=重读题面+题面卡 pulse（lastDir 独立节流锚，
   不重置 lastAct）；30s 答案级=正确卡 breathe+重读。主动读题重置 lastAct idle 锚（b25 M4）。
   面板遮挡期救援静默（家族 K）。hint 按题型选播（r3 新增 shc_hint_grid/shc_hint_dual）。
   语音窗（家族 G/H/I，clip 实长=shc_ 浏览器实测 2026-09-10；r3 新增 hint_grid 3168/
   hint_dual 2976——hint 为 fire-and-forget 播放无后续窗依赖）：
   shc_tut_watch 3096 → 教学分组点前延至 t=900+3100=4000（≥3096+300=3396）；
   shc_tut_turn 1896 → turn 后读题延 2400（≥1896+300=2196 防尾截）；
   确认句 TTS 最长 10 全字符（黄色的三角形，有六个 estMs=10×345+600=4050）→
     判对演出窗 1800+3600=5400 ≥4050（错→对路径读题同延防链掐尾）；
   shc_right 2304 → winFlow celebrate(2620)+wait(600)=3220 ≥2304+300=2604（判对后窗）；
   shc_wrong 1968 + 引导句 TTS（estMs 最长 10 字符=4050）→ 拼播链 1968+150+4050=6168，
     错点防重入窗 1000ms；对选可打断链；救援读题掐链由 wrongChainUntil=7900 守卫
     （≥6168+300=6468，全字符口径）；
   教学分组数分账：900+3100+3×(250+250+900)+5400+500=14100 ≤16000。
   验收钩子：window.SC = { get currentLevel, get quiz, tapOpt(i), start(flat),
   async autoSolve(), get tutorial }（getter 返回拷贝）。
   tapOpt 返回值族（SPEC-BATCH28 §2 r3）：对='right'/末题对='done'/错='wrong'+miss+1/
   越界或演出窗=null（吞输入轻叮+容器 bump 照配——家族 D）。 */
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
  return false;                            /* m2（审查 2026-09-10）：节流未播返回 false——豁免窗仅起播时设（契约 I「起播设」） */
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
/* 漂移标记（r3 ④）：dch4 全题漂移——渲染/verify 钩子同源派生（禁散存题内，防两处漂移） */
const driftOf = L => L.dch === 4;

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

/* ================= 题面语音（四型统一 queue 链 [shc_q 任务锚, 题面句 TTS 拼句]
   ——SPEC §2 图形名/颜色名豁免 clip 化；verify 页 stub 记 __lastQueue/__lastSayText） ================= */
function speakQuiz() {
  if (!cur || !cur.quizzes[cur.step]) return;
  const q = cur.quizzes[cur.step];
  KIDS.voice.queue([VOICE.q].concat(quizKeys(q)));   /* T46 阶段2：题面段链 clip 化（题型句/色+形+尾句全键） */
}

/* ================= 渲染（r3 双模式：散点 scatter / 阵列 grid；漂移=drift-x 内联动画）
   外层定位 / 内层旋转缩放+入场动画分离（防 transform 覆盖）；图形 pointer-events:none
   不挡题面重听。渲染判定一致（r2 M1 铁律）：散点 data-id/data-slot ↔ _place.slot；
   阵列 data-id/data-row/data-cp ↔ (row,cp)（miss 格不渲染）；dual data-fill ↔ 组合键
   颜色段（fill 属性同源=shapeEl(id, fill)——verify DOM 级对账） ================= */
function renderScene(q) {
  const drift = driftOf(cur);
  sceneEl.dataset.kind = q.kind;
  sceneEl.dataset.mode = (q.kind === 'grid' || q.kind === 'gridmiss') ? 'grid' : 'scatter';
  sceneEl.dataset.drift = drift ? '1' : '0';
  sceneEl.setAttribute('aria-label', quizText(q) + '点我再听一遍');
  let h = '<div class="q-text">' + quizText(q) + '</div>';
  const gridMode = sceneEl.dataset.mode === 'grid';
  q._place.forEach((p, k) => {
    let pos, attrs, ph;
    if (gridMode) {
      pos = 'left:' + ((p.cp + 0.5) / q.cols * 100).toFixed(3) + '%;top:calc(' +
            (GRID_TOP[q.rows] + p.row * GRID_DY[q.rows]).toFixed(3) + '% + 22px)';
      attrs = 'data-row="' + p.row + '" data-cp="' + p.cp + '"';
      ph = p.row * q.cols + p.cp;
    } else {
      const col = p.slot % 4, row = Math.floor(p.slot / 4);
      pos = 'left:' + (col * 25 + 12.5) + '%;top:' + (28 + row * 29) + '%';
      attrs = 'data-slot="' + p.slot + '"';
      ph = p.slot;
    }
    const anim = drift ? ';animation:drift-x ' + (7 + ph % 4) + 's ease-in-out ' +
                 (-(ph * 0.9)).toFixed(1) + 's infinite' : '';
    h += '<span class="sc-shape" data-id="' + p.shape + '" ' + attrs +
         (p.fill ? ' data-fill="' + p.fill + '"' : '') +
         ' style="' + pos + anim + '">' +
         '<span class="sc-in" style="transform:rotate(' + p.rot + 'deg) scale(' + p.scale + ');animation-delay:' + (k * 60) + 'ms">' +
         shapeSvg(p.shape, p.fill ? COLORS[p.fill].col : null) + '</span></span>';
  });
  sceneEl.innerHTML = h;
}
function renderBoard(q) {                        // 四型一律 4 数字卡（大数字+「个」）
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'ncard card pop';
    b.dataset.i = i;
    b.dataset.num = o.num;                       // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', o.num + '个');
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="num">' + o.num + '</span><span class="nlab">个</span>';
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

/* ================= 答对演出：场景目标图形逐个点亮
   （count=ask 形 / grid·gridmiss=全阵 / dual=形+色双匹配——渲染判定同源：data-id+data-fill）
   + 卡亮（确认句 TTS 由 uiTapOpt 播）；verify 页跳点亮直接落定 ---------- */
function lightShapes(q) {
  let cells;
  if (q.kind === 'dual')
    cells = sceneEl.querySelectorAll('.sc-shape[data-id="' + q.dual.shape + '"][data-fill="' + q.dual.color + '"]');
  else if (q.kind === 'grid' || q.kind === 'gridmiss')
    cells = sceneEl.querySelectorAll('.sc-shape');
  else
    cells = sceneEl.querySelectorAll('.sc-shape[data-id="' + q.ask + '"]');
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
/* 教学"帮"阶段指向：当前题正确卡（数字卡） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / SC.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错点 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）；
   越界下标/演出窗=null+pop+bump（钩子契约：对 right/错 wrong/越界·演出窗 null）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+shc_wrong+语义引导句（方向/结构/两步锚） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, { key: guideKeyOf(q, i), text: guideText(q, i) }]))  /* T46 阶段2：引导句 clip 化（m2：仅链起播时设窗） */
      wrongChainUntil = Date.now() + 7900;       /* 链豁免（家族 I）：1968+150+引导 clip 最长 3168+300=5586 ≤ 7900 */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：目标图形逐个点亮+卡亮+确认句 TTS 拼句） ---- */
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
  if (cur === run) lightShapes(q);               /* 场景目标图形逐个点亮（按题型选目标集） */
  const cKeys = confirmKeys(q);
  KIDS.voice.queue(cKeys);                       /* T46 阶段2：确认句段链 clip 化（dual 4 段/grid 2 段） */
  await wait(1800 * SPEED);                      /* 图形点亮+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait(Math.max(3600, chainMs(cKeys) + CONFIRM_PAD - 1800) * SPEED);
                                                /* T46 确认链收尾窗：max(estMs 窗 5400, 链实长+PAD)——dual 6186+300
                                                   超 estMs 窗，clip 链口径动态补足（calendar 先例）；
                                                   错→对路径读题延 ≥5400 防错反馈链掐在 <500ms */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（场景/卡全换）+读题 */
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
  sayR(VOICE.right.key, VOICE.right.text);       /* shc_right：数对啦，真棒（2304ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(600);                             /* 家族 H：celebrate 2620+600=3220 ≥ shc_right 2304+300=2604（判对后窗） */
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.shapecount && sv.shapecount.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指**两个两个分组点**圆形（每组点 2 个+组末计数 TTS「两个/四个/六个」——
   r3 分组策略教学：6-7 岁跳过逐个数用 2 个 2 个数；estMs(2字符)=1290 罩内）
   → 演示点正确数字卡（确认句「圆形，有六个」=报总数收束）→帮=指向正确卡；独=首次选对放手
   （watch 全程 ≤16s——build 静态断言分账：900+3100+3×1400+5400+500=14100）
   时序（家族 G/H）：watch clip 3096ms → t=900 场景亮相+手指就位 → 再延 3100 至 t=4000
   ≥3096+300=3396（clip 播完再分组点，计数 TTS 不与 watch 撞头）；
   每组 250+250（两小步移动+按停）+900（组末计数 TTS+驻留）=1400；
   演示演出窗 5400 罩确认句 TTS 再收束 turn ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* shc_tut_watch：看！图形里有几个（3096ms） */
  await wait(900 * SPEED);                       /* 场景亮相 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 circle×6（确定性锚点）
  const cells = Array.prototype.slice.call(sceneEl.querySelectorAll('.sc-shape[data-id="circle"]'));
  if (cells.length) { ghost.toEl(cells[0]); ghost.show(); }
  await wait(3100 * SPEED);                      /* t=900+3100=4000 ≥ watch 3096+300=3396：clip 播完（手指就位漂浮） */
  const groups = Math.ceil(cells.length / 2);    // 6 个 → 3 组（两个两个数）
  for (let g = 0; g < groups; g++) {             // 幽灵手指分组点圆形——「两个两个数」
    ghost.toEl(cells[2 * g]);
    await wait(250 * SPEED);
    ghost.press();
    replayAnim(cells[2 * g].firstElementChild, 'bump');
    if (cells[2 * g + 1]) {
      ghost.toEl(cells[2 * g + 1]);
      await wait(250 * SPEED);
      ghost.press();
      replayAnim(cells[2 * g + 1].firstElementChild, 'bump');
    }
    KIDS.voice.play('shc_n_' + 2 * (g + 1), NUMCN[2 * (g + 1)] + '个');   /* T46 阶段2：分组计数 clip 化（shc_n_2/4/6） */
    await wait(900 * SPEED);
  }
  const idx = correctIdx(q);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入）；确认句=报总数 */
  window.__scDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);                       /* 收尾（确认句 TTS 仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.shapecount = sv.shapecount || {};
  sv.shapecount.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来数一数"在重发后的题面上说（照 batch5-28） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* shc_tut_turn：你来数一数（1896ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2400);                                      /* ≥1896+300=2196 防尾截（turn 后读题延，留辨别器 ±60ms 余量） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 底栏与舞台交互（hint 按题型选播——r3：HINTS[kind]） ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  const h = hintOf(cur.quizzes[cur.step]);       /* 策略提示：count=逐个/grid·gm=按行/dual=两步过滤 */
  sayR(h.key, h.text);
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
    const h = hintOf(cur.quizzes[cur.step]);     /* 空白探索=题型策略提示 */
    sayR(h.key, h.text);
  }
});

/* ================= 无操作看护（命名函数 rescueTick——verify 源码级断言用）：
   14s 方向级（重读题面+题面卡 pulse，lastDir 独立节流锚，不重置 lastAct——30s 答案级
   不被饿死）/ 30s 答案级（正确卡 breathe + 重读）/ 教学"帮"5s 重演示；
   错反馈链豁免窗守卫在顶部（家族 I：链播完前救援不掐断，不挡主动点选）；
   面板遮挡期救援静默（家族 K——试玩 P2-3：层在时点击全吞却周期重播读题=压迫感） ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（家族 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板遮挡期救援静默（家族 K：k-dayend/k-chapterend/k-resttip/k-celebrate/k-panel 在场即静默） */
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
  KIDS.init({ game: 'shapecount', title: '图形计数' });   // 存档键 kidsgame_shapecount（core VER 1.0，家族 C：带 v:'1.0'）
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
   SC.quiz（r3 四型）：opts 恒 [{num}×4] 数字卡；count→scene={图形id:数量}（ch1 单键/
   ch4 双键近形）、ask=目标图形 id；grid→rows/cols 满阵、scene={图形id:r*c}；
   gridmiss→rows/cols/miss[](缺格 idx)、n=r*c-len(miss) 减法结构；
   dual→ask='图形:颜色'、dual={shape,color,n,d1s,d1,d2c,d2}、scene 3 组合键
   （目标+同色异形+同形异色）；drift=dch4 全题漂移标记；answer=正确卡下标 ================= */
window.SC = {
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
    const scene = {};
    Object.keys(q.scene).forEach(k => { scene[k] = q.scene[k]; });
    return { kind: q.kind,                                  /* 'count'|'grid'|'gridmiss'|'dual'（SPEC §2 r3） */
             scene: scene,                                  /* {图形id:数量} 或 {'图形:颜色':数量}（拷贝） */
             ask: q.ask,                                    /* count=图形 id / dual='图形:颜色' / grid·gm=图形 id */
             rows: q.rows != null ? q.rows : null,          /* grid/gridmiss 行数 */
             cols: q.cols != null ? q.cols : null,          /* grid/gridmiss 列数 */
             missCells: q.miss ? q.miss.slice() : null,     /* gridmiss 缺格 idx 数组（r3 新键） */
             dual: q.dual ? { shape: q.dual.shape, color: q.dual.color, n: q.dual.n,
                              d1s: q.dual.d1s, d1: q.dual.d1, d2c: q.dual.d2c, d2: q.dual.d2 } : null,
             n: q.n,                                        /* 真值总数（各型自洽：r*c(-k)/过滤数） */
             drift: driftOf(cur),                           /* ch4 漂移标记（渲染/verify 同源） */
             opts: q.opts.map(o => ({ num: o.num })),
             answer: q.answer,
             step: cur.step,
             miss: q._miss || 0 };                          /* 本题错选数（原契约语义不变） */
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
