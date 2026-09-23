/* ================= crd 主逻辑（制卡演出→选契合候选→元素落位）
   r12（2026-09-15）：题面=线索句 keyless TTS（「奶奶喜欢云朵和花，做张生日贺卡」
   等 SPEC_TABLE 句表——say 非队列链）；判定=题表驱动（偏好/冲突/语用三 delta）；
   错链与方向提示按**步型 h** 分流（like→crd_hint_like / clash→crd_hint_no /
   wish→crd_hint_wish / theme→crd_hint；豁免窗 CHAIN_WIN[h] 真时钟——契约 I）。
   开卡演出（presentQuiz）：贺卡画布出场+当前步虚线位 + 线索句
   情境句 clip 播报（KIDS.voice.play crd_sc_N——T46 阶段2 clip 化，落空回退 TTS；
   窗=estMs(句长)+300+出场 400，动态按句长——家族 T）。演出锁=真时钟
   state.showUntil（Date.now() 比较，tapPick 演出期返 null——测试驱动须轮询等）。
   题内步推进（presentStage，stamp blanks 连盖同构）：非末步 stage+1 换盘
   （step 不动——一题多步驱动须每步重读 quiz，b38 坑③），STAGE_MS 换盘窗；
   卡完成（末步）=成品定格 FINISH_HOLD 一拍+飞向小兔子送出 FINISH_FLY
   （收卡人开心演出：小兔子跳+爱心飘）+入贺卡集→step+1 新卡开题。
   选对=候选闪亮+元素落位永久留存（.layer.placed svg[data-el]——契约 M
   落位 DOM 断言）+确认链 [crd_right]（单 clip 窗 CARD_WIN 2316=2016+300
   精确——家族 H）；选错=虚影抖动消散（不落位——虚线位仍在）+错链
   [crd_wrong, crd_hint_步型]（豁免窗 CHAIN_WIN[h]=wrong+150+hintX+300 真时钟，
   契约 I）+首错盘区整体 wiggle（方向级不指候选）/ miss≥2 正确候选 breathe（答案级）。
   救援：14s 方向级=重播线索句+画布轻摆（lastDir 独立节流锚，不重置
   lastAct——契约 B）/ 30s 答案级=正确候选 breathe+重播；错链豁免窗让路（契约 I）。
   验收钩子：window.CRD = { get currentLevel, get quiz{scene,kind,occ,who,stage,
   nstage,col,picks,answer,h,step,miss,say}, tapPick(i), start(flat), autoSolve() }
   ——真实页同暴露（b29 坑⑥）。tapPick 返回：契合项非末题末步 'placed' /
   末题末步 'done' / 干扰项 'wrong' / 豁免窗内干扰项吞 false / 演出期 null
   （真时钟锁）/ 越界·已答完 null。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* b25 定版 estMs（data 内同源定义——此处供窗断言与教学分账引用一致） */
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip；
   b36 m3 教训：教学迷你关 flat=-1 每错必播——条件写 cur.flat < 3） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }   /* 教学迷你关 flat=-1 每错必播（契约 J flat≥3 才节流） */
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const cardEl = $id('card'), galleryEl = $id('gallery'),
      qTextEl = $id('q-text'), trayEl = $id('tray'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost'), dockEl = $id('dock');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastHearAt = 0;                             // 重听主题句 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新卡/换盘中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const pickWrapAt = j => trayEl.querySelector('.pick-wrap[data-j="' + j + '"]');
const layerOf = col => cardEl.querySelector('.layer[data-col="' + col + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  qTextEl.textContent = Q_TEXT;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：选对=双音上行 / 选错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(523.25, 0.12, 0, 0.3); };

/* ================= 渲染 ================= */
/* 贺卡画布（契约 M 数值/DOM 层锚）：dataset.scene/stage/occ/kind/who=引擎真值；
   层序=bg→st(→wish)：k<stage=已落位层（.placed svg[data-el] 永久留存）/
   k===stage=当前目标位（.slot.cur 虚线呼吸）/ 其后=待做虚线位 */
function renderCard() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  cardEl.dataset.scene = q.scene;               // 帧内容锚（verify 断言渲染即引擎）
  cardEl.dataset.stage = q.stage;
  cardEl.dataset.occ = q.occ;                   // r12：场合（帧锚）
  cardEl.dataset.kind = q.kind;                 // r12：题型族（帧锚）
  cardEl.dataset.who = q.who;                   // r12：收卡人（帧锚）
  cardEl.innerHTML = '';
  const cols = COLS(q.nstage);
  for (let k = 0; k < cols.length; k++) {
    const lyr = document.createElement('div');
    lyr.className = 'layer';
    lyr.dataset.col = cols[k];
    if (k < q.stage) {
      lyr.classList.add('placed');
      lyr.innerHTML = cardLayerSvg(cols[k], q.stages[k].picks[q.stages[k].answer]);
    } else if (k === q.stage) lyr.classList.add('slot', 'cur');
    else lyr.classList.add('slot');
    cardEl.appendChild(lyr);
  }
}
function renderTray() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const st = q.stages[q.stage];
  trayEl.innerHTML = '';
  trayEl.dataset.n = st.picks.length;
  for (let j = 0; j < st.picks.length; j++) {
    const w = document.createElement('button');
    w.className = 'pick-wrap pop t-' + st.col;
    w.dataset.j = j;                            // 候选下标（点选语义）
    w.style.animationDelay = (j * 90) + 'ms';
    w.setAttribute('aria-label', EL_NAME[st.picks[j]] +
      (st.col === 'bg' ? '底纹' : (st.col === 'st' ? '贴纸' : '祝福语')));
    const art = document.createElement('span');
    art.className = 'art';
    art.innerHTML = pickSvg(st.col, st.picks[j]);
    w.appendChild(art);
    trayEl.appendChild(w);
  }
}
/* 贺卡集：已完成卡的缩略（进度可见——关末成品展示载体） */
function renderGallery() {
  galleryEl.innerHTML = '';
  for (let k = 0; k < cur.step; k++) {
    const q = cur.quizzes[k];
    const it = document.createElement('span');
    it.className = 'gal-item';
    it.style.background = THEME_TINT[q.occ];
    const stEl = OCC_EL[q.occ].st;
    it.innerHTML = '<svg data-el="' + stEl + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
      '<g data-anim="st">' + stInner(stEl) + '</g></svg>';
    galleryEl.appendChild(it);
  }
}
function renderQuiz() {
  renderCard();
  renderTray();
  renderGallery();
  renderStep();
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

/* ================= 开卡演出：渲染 → 题面主题句 say（keyless TTS）→ 开放点选
   演出锁=真时钟 showUntil（tapPick 演出期 null）================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  const win = ENTER_MS + estMs(q.say) + 300;     // 出场 400 与主题句 TTS 并行，窗=estMs+300（家族 T）
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;      // 真时钟演出锁（余量）
  KIDS.voice.play(q.sayKey, q.say);             /* 题面主题句 clip 化（T46 阶段2：crd_sc_N——
                                                   落空自动回退 TTS，B 类键） */
  replayAnim(cardEl, 'enter');                  /* 画布出场重演 */
  await wait(win * SPEED);
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                          /* 演出完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* 题内步推进（stamp blanks 连盖同构）：目标位移交下一层+换盘（卡不重出场，
   已落层永久留存不动；step 不动——驱动须重读 quiz） */
async function presentStage() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q._answered) return;
  cardEl.dataset.stage = q.stage;
  const nxt = layerOf(COLS(q.nstage)[q.stage]);
  if (nxt) nxt.classList.add('cur');
  renderTray();
  const run = cur, token = ++showRun;
  state.locked = true;
  state.showUntil = Date.now() + STAGE_MS * SPEED + 140;
  await wait(STAGE_MS * SPEED);
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();
  lastDir = Date.now();
}

/* 元素落位（永久留存——契约 M：.placed svg[data-el] DOM 断言锚） */
function placeOnCard(col, id) {
  const lyr = layerOf(col);
  if (!lyr) return;
  lyr.classList.remove('slot', 'cur');
  lyr.classList.add('placed');
  lyr.innerHTML = cardLayerSvg(col, id);
}

/* 卡完成：成品定格一拍 → 入贺卡集+送出演出（飞向小兔子收卡+爱心） */
async function cardFinish() {
  replayAnim(cardEl, 'finale');                 /* 成品定格 1 拍 */
  await wait(FINISH_HOLD * SPEED);
  renderGallery();                              /* 本卡入贺卡集（进度可见） */
  hopRabbit();                                  /* 小兔子收卡开心 */
  lovePop();
  replayAnim(cardEl, 'fly');                    /* 送出：贺卡飞向小兔子 */
  await wait(FINISH_FLY * SPEED);
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
/* 教学"帮"阶段指向：当前步契合候选（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const j = correctIdx(q);
  if (j >= 0) pointGhostAt(pickWrapAt(j));
}

/* ================= 选候选主路径（真实点击 / CRD.tapPick / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（盘区容器 bump 微动效——家族 D）；
   演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行）========== */
async function uiTapPick(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(trayEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  const st = q.stages[q.stage];
  if (!st) return null;
  if (!Number.isInteger(i) || i < 0 || i >= st.picks.length) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内干扰项点吞——pop+bump 不计 miss；
     契合项放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== st.answer) {
    sfx('pop'); replayAnim(trayEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const col = st.col;                            // 本拍目标层（落位前取值）
  const r = engTapPick(cur, i);
  if (r === null) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }
  const el = pickWrapAt(i);

  if (r === 'wrong') {                           /* 干扰项：虚影抖动消散+错链两段+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + SHAKE_MS * SPEED + 140;   /* 首错锁总窗 1100+140=1240 ≤ 2118 */
    dodgeLo();
    if (el) el.classList.add('bad');             /* 候选摇头（行为后果反馈） */
    const lyr = layerOf(col);
    if (lyr) {                                   /* 元素虚影抖动消散（不落位——虚线位仍在） */
      const g = document.createElement('span');
      g.className = 'ghost';
      g.innerHTML = pickSvg(col, st.picks[i]);
      lyr.appendChild(g);
    }
    /* r12 错链按步型 h 分流（全 clip 无 keyless——契约 N）：like→hint_like /
       clash→hint_no / wish→hint_wish / theme→hint；豁免窗 CHAIN_WIN[h] 真时钟（契约 I） */
    if (sayW([VOICE.wrong.key, VOICE[HINT_OF[st.h]].key]))
      wrongChainUntil = Date.now() + CHAIN_WIN[st.h];
    if (q._miss === 1) replayAnim(trayEl, 'wig');           /* 方向级：盘区整体 wiggle 不指候选 */
    if (q._miss >= 2) {                                     /* miss≥2=契合候选 breathe（答案级梯度） */
      const ok = pickWrapAt(q.stages[q.stage].answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(SHAKE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('bad');          /* 候选回可重点（探索不罚） */
    if (lyr) { const g2 = lyr.querySelector('.ghost'); if (g2) g2.remove(); }
    state.locked = false;
    return r;
  }

  /* ---- placed·done（契合项：候选闪亮+元素落位永久留存+确认链单 clip） ---- */
  lastAct = Date.now();                          /* 正确落位重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__crdTutSolo = true;                  /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  state.showUntil = Date.now() + CARD_WIN * SPEED + 140;   /* 2316=2016+300 精确（家族 H） */
  placeOnCard(col, st.picks[i]);                 /* 元素落位永久留存（契约 M：svg[data-el] DOM 断言锚） */
  if (el) { el.classList.remove('breathe'); el.classList.add('good'); }
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key]);           /* 确认链：crd_right 单 clip（SPEC §4） */
  await wait(CARD_WIN * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关 */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  if (q._answered) {                             /* 卡完成（末步）非末题：定格+送出 → 新卡开题 */
    state.locked = true;
    state.showUntil = Date.now() + (FINISH_HOLD + FINISH_FLY) * SPEED + 200;
    await cardFinish();
    if (cur !== run) return r;
    presentQuiz();                               /* 新卡开题（出场+主题句） */
    return r;
  }
  presentStage();                                /* 题内步推进：stage+1 换盘（step 不动） */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_crd） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
}
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  showRun++;                                     /* 通关中止在途演出 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* crd_right：贺卡真好看（2016ms） */
  galleryEl.classList.add('finale');             /* 关末成品展示：贺卡集齐跳（创作载体收尾） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2016+300=2316 */
    const pr = persistWin(stars);
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
  showRun++;                                     /* 中止在途演出（重玩/换关） */
  galleryEl.classList.remove('finale');
  cardEl.classList.remove('finale', 'fly');
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastHearAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.crd && sv.crd.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §1：watch=线索句→看候选→
   点契合项→落位；turn=你也做一张帮/独；演示题=SPEC_TABLE 行 0 偏好题（r12——
   「奶奶喜欢云朵和花」→bg 步选云朵纹：教学即示范「听线索→选喜欢的」）
   watch=播 crd_tut_watch「看！做一张贺卡」→ 延 3300（≥2928+300）→ 开题演出
   （行 0 线索句 15 字：400+5775+300=6475）→ ghost 移入 800+press 320
   → demo 选契合项（bg 步）演出窗 2316 → __crdDemoR='placed'（§4 教学末步）；
   turn=播 crd_tut_turn「你也做一张」→ 延 2100（≥1728+300）→ 行 0 卡开题
   （6475）→ 帮（指向契合候选）→首对独（solo）→两步做完进正式关。
   —— watch 段分账 3300+6475+800+320+2316=13211 ≤ 16000（单步演示款 ≤16s） ---------- */
function mkQuiz(s) {                             // 教学迷你关题：规范盘序（契合项 0 号——deterministic）
  const row = SPEC_TABLE[s];
  const stages = row.steps.map(sp =>
    ({ col: sp[0], picks: [sp[1], sp[2], sp[3]], answer: 0, h: sp[4] }));
  return { scene: s, kind: row.kind, occ: row.occ, who: row.who, nstage: row.nstage,
           say: row.say, sayKey: 'crd_sc_' + (s + 1),   // T46 阶段2：情境句 clip 键（行序=注册序）
           stage: 0, stages: stages, _miss: 0, _answered: false };
}
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 选契合项返回 'placed'）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mkQuiz(0), mkQuiz(0)] };    // 题0=演示（行 0 偏好题 bg 步）/ 题1=预备位
}
function tutTurnLevel() {                        // 单题迷你关：行 0 卡（正式关第一卡同款·两步连做）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mkQuiz(0)] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* crd_tut_watch：看！做一张贺卡（2928ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥2928+300=3228：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* 画布出场+线索句「奶奶喜欢云朵和花，做张生日贺卡」（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(pickWrapAt(idx));                 /* 幽灵手指指向契合候选（云朵纹=奶奶偏好） */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapPick(idx, true);      /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__crdDemoR = demoR;                     /* 演示生效证据（§0.27，gate 断言 'placed'——终值语义） */
  window.__crdWatchMs = Date.now() - t0w;        /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.crd = sv.crd || {};
  sv.crd.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立行 0 卡迷你关「你也做一张」（帮→独），首对放手两步做完进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 placed 的 presentStage 换盘） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);         /* crd_tut_turn：你也做一张（1728ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1728+300=2028 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 画布出场+主题句 → 开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 收卡演出：小兔子上方爱心飘起（朋友收卡开心） */
function lovePop() {
  const s = document.createElement('span');
  s.className = 'love';
  s.textContent = '♥';
  s.setAttribute('aria-hidden', 'true');
  dockEl.appendChild(s);
  setTimeout(() => { if (s.parentNode) s.remove(); }, 950);
}
/* 重播主题句（方向级救援/重听共用；教学迷你关禁重播） */
function sayThemeAgain() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || cur.flat < 0) return false;
  KIDS.voice.play(q.sayKey, q.say);   // 重播主题句（clip 化——T46 阶段2）
  replayAnim(cardEl, 'wig');
  return true;
}
/* r12 步型方向提示（戳兔子/空白探索共用——与错链尾段同源 HINT_OF 分流） */
function sayDirHint() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const v = VOICE[HINT_OF[q.stages[q.stage].h]];
  sayR(v.key, v.text);
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayDirHint();                                    /* 戳兔子=方向提示（按步型分流：偏好/冲突/语用/场合） */
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重播 */
  if (Date.now() - lastHearAt < 3000) return;    /* 重听 3s 节流 */
  lastHearAt = Date.now();
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  sayThemeAgain();                               /* 重听主题句（题面真值同源） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  lastAct = Date.now();
  startLevel(cur.flat);                          /* 再玩一次=重开本关（同 flat 确定性同题） */
});
trayEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.pick-wrap');
  if (!p) return;                                // 候选间空白走 stage 空白路径
  e.preventDefault();
  uiTapPick(Number(p.dataset.j));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.pick-wrap')) return;    // 候选点击已由 trayEl 处理
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayDirHint();                                 /* 空白探索=方向提示（步型分流） */
  }
});

/* ================= 无操作看护：14s 方向级（重播主题句+画布轻摆，lastDir 独立
   节流锚，不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（契合候选 breathe+重播）/
   教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q && !q._answered) {
      const j = correctIdx(q);
      if (j >= 0) { const ok = pickWrapAt(j); if (ok) replayAnim(ok, 'breathe'); }
      sayThemeAgain();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播主题句（不动 lastAct） */
    sayThemeAgain();
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言，照 b28 m4） */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'crd', title: '贺卡工坊' });   // 存档键 kidsgame_crd（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  firstFlat = first;
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.CRD——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（picks=当前步候选 id 3 枚——verify 从 theme+col+
   picks+映射表独立推导 answer=对账锚，禁读 quiz.answer 直比）；
   step=全关题号 0-4（b33 坑①：题号语义显式声明——flat*5 内的第几卡，非全局题号；
   题内步推进=stage+1 而 step 不动——一题多步驱动须每步重读 quiz，b38 坑③）。
   tapPick 返回：契合项非末题末步 'placed' / 末题末步 'done' / 干扰项 'wrong' /
   豁免窗内干扰项吞 false / 演出期 null（真时钟锁）/ 越界 null ================ */
window.CRD = {
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
    if (!q || q._answered) return null;
    const st = q.stages[q.stage];
    if (!st) return null;
    return { scene: q.scene,                      /* 题表行号 0-19（SPEC_TABLE 索引——verify 表对账锚） */
             kind: q.kind,                        /* r12 题型族 'like'|'clash'|'wish'|'mix' */
             occ: q.occ,                          /* r12 场合 id（birthday|newyear|thanks|sorry|sick） */
             who: q.who,                          /* r12 收卡人 id（grandma|monkey|teacher|friend） */
             stage: q.stage,                      /* 题内步号 0..nstage-1 */
             nstage: q.stages.length,             /* 2|3（ch1-2 两步/ch3-4 三步） */
             col: st.col,                         /* 当前列 'bg'|'st'|'wish' */
             picks: st.picks.slice(),             /* 候选 id 3 枚（盘序 seeded 打乱） */
             answer: st.answer,                   /* 契合项下标（verify 独立推导） */
             h: st.h,                             /* r12 步型 'like'|'clash'|'wish'|'theme'（错链分流键） */
             step: cur.step,                      /* 全关题号 0-4（b33 坑①语义） */
             miss: q._miss || 0,
             say: q.say, sayKey: q.sayKey };      /* 题面线索句+clip 键（T46 阶段2） */
  },
  tapPick(i) { return uiTapPick(i); },
  async autoSolve() {                    // UI 路径自动做完当前关（逐步入点契合项，走真实判定链；
    let taps = 0, guard = 0;             // 一题多步：每轮重读 quiz（stage 推进 step 不动——假卡死防线）；
    while (cur && !cur.done && guard++ < 400) {   // 演出锁/演出期 null → 轮询等锁窗结束重试，非 break
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q || q._answered) { if (!q) break; continue; }
      const r = await uiTapPick(q.stages[q.stage].answer);
      if (r === 'placed' || r === 'done') taps++;
      else if (guard >= 398) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
