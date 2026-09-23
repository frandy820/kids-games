/* ================= cbx 主逻辑（情境演出→点策略卡→平静下来/更难受）
   开题演出（presentQuiz）：小主角情绪态出场（不安呼吸+族表情）+情境道具+题面
   情境句 clip 播报（KIDS.voice.play cbx_sc_N——T46 阶段2 clip 化；
   窗=estMs(句长)+300+出场 400，动态按句长——家族 T）。演出锁=真时钟
   state.showUntil（Date.now() 比较，tapPick 演出期返 null——测试驱动须轮询等）。
   点好卡=主角平静下来（容器类 emo-*→calm：舒展表情+呼气一沉一浮+柔蓝泡泡）
   +确认链 [cbx_right, cbx_g_<好卡id>]（锁窗动态=right 2592+150+好卡句+300
   全链覆盖——好卡句承载策略指导禁被下题 say 切断；SPEC §2 下界 2892 恒含）。
   点坏/中性卡=卡摇头+主角情绪加深一拍（deeper）+错链 [cbx_wrong,
   按所点卡取 cbx_b_<id>/cbx_n_<id> 具体后果句]（豁免窗 WRONG_CHAIN_WIN
   =6834 真时钟，契约 I；SEL 铁律：后果句指向行为后果非人格——throw→「玩具
   摔坏了，你也会更难过」/cryonly→「哭一会儿可以，一直哭问题还在哦」）。
   点次优卡（fair——r50 灰阶：好池成员非本情境最佳）=卡轻摆（.fair 非否定
   演出，与坏卡摇头区分）+主角情绪加深+辨析链 [cbx_hint, cbx_sc_N 情境重播]
   （hint「选让心里舒服的」+重听情境=辨析教学闭环；SEL 诚实红线：深呼吸
   不会「更难受」，禁用 wrong 头段；零新键——T46 阶段3 speak 已删，未注册
   新键=静默，故 fair 链全用现有 clip；实链 2208+150+sc+300 ≤6834 恒入窗）
   +首错卡区整体 wiggle（方向级不指卡）/miss≥2 好卡 breathe（答案级）。
   救援：14s 方向级=重播情境句+情绪重演（lastDir 独立节流锚，不重置
   lastAct——契约 B）/ 30s 答案级=好卡 breathe+重播；错链豁免窗让路（契约 I）。
   验收钩子：window.CBX = { get currentLevel, get quiz{emo,scene,say,picks,answer,step,miss},
   tapPick(i), start(flat), autoSolve() }——真实页同暴露（b29 坑⑥）。
   tapPick 返回：好卡非末题 'picked' / 好卡末题 'done' / 坏·中性·次优卡 'wrong' /
   豁免窗内错点吞 false / 演出期 null（真时钟锁）/ 越界·已答·无题 null。 */
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
/* 错链构成（r50 三分流）：坏/中性卡=头段 cbx_wrong+尾段按卡取（坏=cbx_b_<id>/
   中性=cbx_n_<id>）；次优卡（fair=好池成员但≠answer）=辨析链 [cbx_hint,
   cbx_sc_N]（hint 引导+情境重播，非否定——SEL 诚实红线） */
const conseqKeyOf = id => POOL[id].kind === 'bad' ? 'cbx_b_' + id : 'cbx_n_' + id;
const wrongChainOf = (q, id) => POOL[id].kind === 'good'
  ? [VOICE.hint.key, q.sayKey]                          /* fair 辨析链（r50）：两段全 clip 零新键 */
  : [VOICE.wrong.key, conseqKeyOf(id)];

const sceneEl = $id('scene'), friendEl = $id('friend'), propEl = $id('prop'),
      qTextEl = $id('q-text'), cardsEl = $id('cards'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');
/* r50-fix m-5：deeper 类播完即摘（挂上不拆会按源序压过 #friend.emo-* 待机循环——
   r47 M1 同型）；m-1：fair 分支禁用（次优好策略≠情况更糟，SEL 三通道一致） */
const deepenFriend = () => { replayAnim(friendEl, 'deeper'); setTimeout(() => friendEl.classList.remove('deeper'), 560); };

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastHearAt = 0;                             // 重听情境句 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重演中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const pickAt = i => cardsEl.querySelector('.pick[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  qTextEl.textContent = Q_TEXT;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(523.25, 0.12, 0, 0.3); };

/* ================= 渲染 ================= */
/* 主角情绪态（契约 M DOM 类层锚）：题面态=容器类 emo-<族>（angry/sad/fear/frus
   对应表情组显+不安呼吸）/ 平静态=calm（fx-calm 显+呼气放松）——verify 三层断言依据 */
function setKidMood(emoOrCalm) {
  friendEl.classList.remove('emo-angry', 'emo-sad', 'emo-fear', 'emo-frus', 'calm');
  friendEl.classList.add(emoOrCalm === 'calm' ? 'calm' : 'emo-' + emoOrCalm);
}
function renderQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  friendEl.innerHTML = friendSvg();               // 小主角（含 5 表情组——容器类控显隐）
  setKidMood(q.emo);                              // 题面态=当前情绪族
  propEl.innerHTML = propSvg(q.prop);             // 情境道具（积木/画笔/气球/雷云…）
  sceneEl.dataset.scene = q.scene;                // 帧内容锚（verify 断言渲染即引擎）
  sceneEl.dataset.emo = q.emo;                    // 情绪族锚（verify 数值层对账）
  cardsEl.innerHTML = '';
  cardsEl.dataset.n = q.picks.length;
  for (let i = 0; i < q.picks.length; i++) {
    const c = POOL[q.picks[i]];
    const w = document.createElement('button');
    w.className = 'pick pop';
    w.dataset.i = i;                              // 卡下标（点选语义）
    w.style.animationDelay = (i * 90) + 'ms';
    w.setAttribute('aria-label', '工具 ' + c.label);   /* 统一「工具」——r50 起好池卡 2 张（good+fair），按 kind 标注会泄答案 */
    const art = document.createElement('span');
    art.className = 'art';
    art.innerHTML = cardIconSvg(c.icon);
    const word = document.createElement('span');
    word.className = 'word';
    word.textContent = c.label;
    w.appendChild(art); w.appendChild(word);
    cardsEl.appendChild(w);
  }
  renderStep();
}
function renderStep() {                           // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                           // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };      // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 开题演出：渲染 → 题面情境句 say（keyless TTS）→ 开放点选
   演出锁=真时钟 showUntil（tapPick 演出期返 null）================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  const win = ENTER_MS + estMs(q.say) + 300;      // 出场 400 与题面 TTS 并行，窗=estMs+300（家族 T）
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;      // 真时钟演出锁（余量）
  KIDS.voice.play(q.sayKey, q.say);               /* 题面情境句 clip 化（T46 阶段2：cbx_sc_N——落空=静默，core speechSynthesis 已删（r50-fix m-3 勘正） */
  deepenFriend();                                 /* 情绪出场重演一拍（播完摘类，容器 emo-* 待机循环恢复——m-5） */
  await wait(win * SPEED);
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                           /* 演出完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* 平静泡泡（演出层：#scene 内 spark 元素 6 颗柔蓝泡泡上飘——冷静呼气隐喻；
   spark 为 #scene 子元素 absolute 定位——坐标相对 #scene 内边距盒） */
function sparkBurst() {
  const r = sceneEl.getBoundingClientRect();
  for (let k = 0; k < 6; k++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.innerHTML = '<svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="8" fill="#BFE0F2" stroke="#4A3B2E" stroke-width="1.8" opacity=".9"/><circle cx="8" cy="8" r="2.2" fill="#FFF9EE"/></svg>';
    const ang = -Math.PI / 2 + (k - 2.5) * 0.42;
    s.style.left = Math.round(r.width / 2 + (k - 2.5) * 26 - 11) + 'px';
    s.style.top = Math.round(r.height * 0.34) + 'px';
    s.style.setProperty('--dx', Math.round(Math.cos(ang) * 66) + 'px');
    s.style.setProperty('--dy', Math.round(Math.sin(ang) * 76) + 'px');
    sceneEl.appendChild(s);
    setTimeout(() => s.remove(), 1100 * SPEED + 60);
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
/* 教学"帮"阶段指向：当前题好卡（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(pickAt(i));
}

/* ================= 点卡主路径（真实点击 / CBX.tapPick / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡区容器 bump 微动效——家族 D）；
   演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行）========== */
async function uiTapPick(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(cardsEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                   /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(cardsEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) { sfx('pop'); replayAnim(cardsEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内坏·中性卡点吞——pop+bump 不计 miss；
     好卡放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(cardsEl, 'bump'); return false;
  }
  const run = cur, token = showRun;               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapPick(cur, i);
  if (r === null) { sfx('pop'); replayAnim(cardsEl, 'bump'); return null; }
  const el = pickAt(i);

  if (r === 'wrong') {                            /* 坏/中性/次优卡：摇头或轻摆+主角加深一拍+三分流链+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + SHAKE_MS * SPEED + 140;   /* 首错锁=SHAKE_MS(1100) ≤ wrong+150=2310 且 ≤ hint+150=2358（N2 总窗口径） */
    dodgeLo();
    const pickedId = q.picks[i];                  /* 所点卡 id——链与动画按卡三分流 */
    const isFair = POOL[pickedId].kind === 'good';
    if (el) el.classList.add(isFair ? 'fair' : 'bad');   /* fair=轻摆（非否定）/坏·中性=摇头（行为后果反馈） */
    if (!isFair) deepenFriend();                  /* 主角情绪加深一拍——SEL 指向行为后果；fair 跳过（m-1：次优好策略非否定，三通道一致） */
    if (sayW(wrongChainOf(q, pickedId)))                    /* 三分流链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;       /* 链豁免：6834 真时钟（契约 I，窗按 max；fair 实链 6258 ≤ 窗） */
    if (q._miss === 1) replayAnim(cardsEl, 'wig');          /* 方向级：卡区整体 wiggle 不指卡 */
    if (q._miss >= 2) {                                    /* miss≥2=好卡 breathe（答案级梯度） */
      const ok = pickAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(SHAKE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('bad', 'fair');   /* 卡回可重点（探索不罚） */
    state.locked = false;
    return r;
  }

  /* ---- picked·done（好卡：主角平静下来+泡泡+确认链两段 [right, 好卡句]） ---- */
  lastAct = Date.now();                           /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                     /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__cbxTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  const goodId = q.picks[q.answer];               /* 好卡 id——确认链尾段句按卡取（cbx_g_*） */
  const win = celeWinOf(goodId);                  /* 锁窗动态全链=2592+150+好卡句+300（5370-7266） */
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;
  setKidMood('calm');                             /* 平静下来：容器类 calm（舒展表情+呼气放松） */
  sparkBurst();
  if (el) { el.classList.remove('breathe'); el.classList.add('good'); }
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key, 'cbx_g_' + goodId]);   /* 确认链：right+好卡句两段全 clip（SPEC §2） */
  await wait(win * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                           /* 教学迷你关完成：帮→独后进正式关 */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                  /* 新题开题（主角重新情绪出场+情境句） */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_cbx） ================= */
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
  showRun++;                                      /* 通关中止在途演出 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);        /* cbx_right：好办法，舒服多啦（2592ms） */
  if (VERIFY) { persistWin(stars); return; }      // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                              /* 家族 H：celebrate 2620+400=3020 ≥ 2592+300=2892 */
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
function proceed() {                              // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);                 // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  showRun++;                                      /* 中止在途演出（重玩/换关） */
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastHearAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                           /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };      // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.cbx && sv.cbx.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                  // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §2：watch=情境→点好卡→
   主角平静；turn=你来选一选帮/独）
   watch=播 cbx_tut_watch「看！冷静工具箱」→ 延 3300（≥3000+300）→ 开题演出
   （scene2 插队题 12 字：400+4740+300=5440）→ ghost 移入 800+press 320
   → demo 点好卡演出窗 5370（=2592+150+2328+300 sayout 全链）→ __cbxDemoR='picked'；
   turn=播 cbx_tut_turn「你来选一选」→ 延 2172（≥1872+300）→ scene0 首题开题
   （400+5385+300=6085）→ 帮（指向好卡）→首对独（solo）→进正式关。
   —— watch 段分账 3300+5440+800+320+5370=15230 ≤ 16000（单步演示款 ≤16s） ---------- */
function tutWatchLevel() {                        // 双题迷你关：题 0=演示题（demo 点好卡返回 'picked'）
  const mk = s => buildQuiz(s, mulberry32(97 + s));   // buildQuiz r50 起内置 answer=good 列下标（重算冗余已删）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mk(2), mk(0)] };             // 题0=scene2 演示（12 字+sayout 短好卡句控预算）/ 题1=预备位
}
function tutTurnLevel() {                         // 单题迷你关：scene0 首题（弟弟积木——正式关第一题同款）
  const mk = s => buildQuiz(s, mulberry32(97 + s));
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mk(0)] };
}
async function tutorialWatch() {
  const t0w = Date.now();                         // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);        /* cbx_tut_watch：看！冷静工具箱（3000ms） */
  await wait(TUT_WATCH_WAIT * SPEED);             /* ≥3000+300=3300：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                            /* 主角情绪出场+情境句（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(pickAt(idx));                      /* 幽灵手指指向好卡 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapPick(idx, true);       /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__cbxDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'picked'——终值语义） */
  window.__cbxWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.cbx = sv.cbx || {};
  sv.cbx.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 scene0 首题迷你关「你来选一选」（帮→独），首对放手进正式关 */
  ghost.hide();
  showRun++;                                      /* 显式中止在途（演示 picked 的 presentQuiz 新题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);          /* cbx_tut_turn：你来选一选（1872ms） */
  await wait(TUT_TURN_WAIT * SPEED);              /* ≥1872+300=2172 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();          /* 主角出场+情境句 → 开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重播情境句（方向级救援/重听共用；教学迷你关禁重播） */
function saySceneAgain() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || cur.flat < 0) return false;
  KIDS.voice.play(q.sayKey, q.say);   // 重播情境句（clip 化——T46 阶段2）
  deepenFriend();                                 /* 情境重播主角状态一拍（播完摘类——m-5） */
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);          /* 戳兔子=方向提示：选让心里舒服的 */
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  if (cur.flat < 0) return;                       /* 教学迷你关禁重播 */
  if (Date.now() - lastHearAt < 3000) return;     /* 重听 3s 节流 */
  lastHearAt = Date.now();
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  saySceneAgain();                                /* 重听情境句（题面真值同源） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  lastAct = Date.now();
  startLevel(cur.flat);                           /* 再玩一次=重开本关（同 flat 确定性同题） */
});
cardsEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.pick');
  if (!p) return;                                 // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapPick(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.pick')) return;          // 卡点击已由 cardsEl 处理
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);        /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重播情境句+主角情绪重演，lastDir 独立
   节流锚，不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（好卡 breathe+重播）/
   教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;       /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                             /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = pickAt(i); if (ok) replayAnim(ok, 'breathe'); }
      saySceneAgain();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播情境句（不动 lastAct） */
    saySceneAgain();
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
  KIDS.init({ game: 'cbx', title: '冷静工具箱' });   // 存档键 kidsgame_cbx（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {   // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  firstFlat = first;
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.CBX——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（picks=策略卡 id 数组恒 3 张 r50——verify 从 SPEC
   表 good 列独立推导 answer=picks.indexOf(SPEC_SCENES[scene].good)=对账锚，
   禁读 quiz.answer 直比）；step=全关题号 0-4
   （b33 坑①：题号语义显式声明——flat*5 内的第几题，非全局题号）。
   tapPick 返回：好卡非末题 'picked' / 好卡末题 'done' / 坏·中性·次优卡 'wrong' /
   豁免窗内错点吞 false / 演出期 null（真时钟锁）/ 越界 null ================ */
window.CBX = {
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
    return { emo: q.emo,                             /* 情绪族（angry/sad/fear/frus） */
             scene: q.scene,                         /* 情境题号 0-19（SPEC §2 题表行号） */
             say: q.say, sayKey: q.sayKey,           /* 情境句文本+clip 键（题面真值——T46 阶段2） */
             picks: q.picks.slice(),                 /* 策略卡 id 数组（恒 3 张 r50：good+fair+bad|neutral——SPEC 钩子契约） */
             answer: q.answer,                       /* 最佳卡下标（=picks.indexOf(题表 good 列)——r50 唯一解锚） */
             step: cur.step,                         /* 全关题号 0-4（b33 坑①语义） */
             miss: q._miss || 0 };
  },
  tapPick(i) { return uiTapPick(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点好卡，走真实判定链；
    let taps = 0, guard = 0;             // 演出锁/演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 200) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapPick(q.answer);
      if (r === 'picked' || r === 'done') taps++;
      else if (guard >= 198) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
