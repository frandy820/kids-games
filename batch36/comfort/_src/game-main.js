/* ================= comfort 主逻辑（r11 择优+梯度+后果链；情景演出→点做法卡→后果演出）
   开题演出（presentQuiz）：朋友 sad 出场（耷拉呼吸+眼泪下落）+情景道具 + 题面
   情景句 T46 化 09-19 clip 播报（voice.play(sayClipOf(q), q.say)——co_sc_* 全句键，
   窗=estMs(句长)+300+出场 400，动态按句长——家族 T）。r11：best2 题题面句播完
   串播方向锚 co_pick「都很好，哪个现在最好」（PICK_WIN 3252=2952+300——不指认：
   锚文本与全部卡 label 无子串交集，verify 断言）。演出锁=真时钟
   state.showUntil（Date.now() 比较，tapCard 演出期返 null——测试驱动须轮询等）。
   r11 选择-后果因果链（delta③）：
   点 best 卡=朋友破涕为笑（容器类 sad→happy：弯眼+咧嘴+跳两下+撒星星）+
   #outcome[data-out=best] 问题解决小动画（CELE_WIN 窗内）+确认链 [co_right]
   （单 clip 窗 CELE_WIN 2940=2640+300 精确——家族 H）。
   点 gray 卡（有点用但不是最好）=朋友「半好」态 meh（平眉睁眼小平笑，不哭了
   但还没开心）+#outcome[data-out=gray] 部分缓解+灰链 [co_gray]（单 clip 豁免窗
   GRAY_WIN 3540=3240+300 真时钟）+miss+1——SEL 温和：指向「还有更好的办法」
   不否定已选行为。
   点 bad 卡=坏卡摇头+朋友更难过一拍（sadder）+错链 [co_wrong, co_hint]（豁免窗
   5898=2544+150+2904+300 真时钟，契约 I）+「这样朋友会更难过哦」（SEL 铁律：
   坏反馈恒指向行为后果不自攻击）+首错卡区整体 wiggle（方向级不指卡）/
   miss≥2 best 卡 breathe（答案级）。
   救援：14s 方向级=重播情景句+朋友耷拉重演（lastDir 独立节流锚，不重置
   lastAct——契约 B）/ 30s 答案级=best 卡 breathe+重播；错链豁免窗让路（契约 I）。
   r11 时长模型注释（与 data/verify/build 四处同步）：每题=max(voiceWin,DECIDE)+ADV，
   DECIDE{best2:10000,grad3:11000}，voiceWin=400+estMs(say)+300+(best2 加 3252)，
   ADV=2940；40 关 modeled 最低 64700 ≥ 40000（verify ⑭ 硬断言）。
   验收钩子：window.CO = { get currentLevel, get quiz{scene,kind,say,cards,tier,label,
   answer,step,miss}, tapCard(i), start(flat), autoSolve() }——真实页同暴露（b29 坑⑥）。
   tapCard 返回：best 卡非末题 'right' / best 卡末题 'done' / gray·bad 卡 'wrong' /
   豁免窗内非 best 卡吞 false / 演出期 null（真时钟锁）/ 越界·已答·无题 null。 */
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
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip）
   r11：灰链 [co_gray] 与坏链 [co_wrong,co_hint] 同治（均为语义纠错句） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I；灰/坏链共用） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }   /* 审查 m3：教学迷你关 flat=-1 每错必播（契约 J flat≥3 才节流） */
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), friendEl = $id('friend'), propEl = $id('prop'),
      qTextEl = $id('q-text'), cardsEl = $id('cards'), outcomeEl = $id('outcome'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastHearAt = 0;                             // 重听情景句 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重演中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardWrapAt = i => cardsEl.querySelector('.card-wrap[data-i="' + i + '"]');

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
/* 朋友表情态（契约 M DOM 类层锚）：'sad' 题面态（fx-sad 组显+耷拉呼吸+眼泪）/
   'meh' r11 灰卡后果半好态（fx-meh 组显：平眉睁眼小平笑，无泪）/
   'happy' 破涕为笑（fx-happy 组显+跳两下）——verify 三层断言依据 */
function setFriendMood(mood) {
  friendEl.classList.remove('sad', 'happy', 'meh', 'sadder');
  friendEl.classList.add(mood);
}
/* r11 后果气泡（选择-后果因果链演出层；#outcome data-out=best|gray——帧内容锚） */
function renderOutcome(kind) {
  outcomeEl.dataset.out = kind;                 // 'best' 问题解决 / 'gray' 部分缓解
  outcomeEl.innerHTML = outcomeSvg(kind);
  outcomeEl.classList.remove('show'); void outcomeEl.offsetWidth;
  outcomeEl.classList.add('show');
}
function clearOutcome() {
  outcomeEl.classList.remove('show');
  outcomeEl.dataset.out = '';
  outcomeEl.innerHTML = '';
}
function renderQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  friendEl.innerHTML = friendSvg(q.anim);       // 朋友（含 fx-sad/fx-meh/fx-happy 表情组）
  setFriendMood('sad');                         // 题面态=伤心（眼泪+耷拉）
  clearOutcome();                               // 新题清后果气泡（r11 因果链逐题重置）
  propEl.innerHTML = propSvg(q.prop);           // 情景道具
  sceneEl.dataset.scene = q.scene;              // 帧内容锚（verify 断言渲染即引擎）
  cardsEl.innerHTML = '';
  cardsEl.dataset.n = q.cards.length;
  for (let i = 0; i < q.cards.length; i++) {
    const c = q.cards[i];
    const w = document.createElement('button');
    w.className = 'card-wrap pop';
    w.dataset.i = i;                            // 卡下标（点选语义）
    w.style.animationDelay = (i * 90) + 'ms';
    w.setAttribute('aria-label', (c.tier === 'best' ? '最好的做法 ' : c.tier === 'gray' ? '有点用的做法 ' : '做法 ') + c.label);
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

/* ================= 开题演出：渲染 → 题面情景句 play（T46 化：co_sc_* clip）→（best2 题串播
   方向锚 co_pick——r11 择优题面锚）→ 开放点选
   演出锁=真时钟 showUntil（tapCard 演出期返 null）================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  const sayWin = ENTER_MS + estMs(q.say) + 300;  // 出场 400 与题面 clip 串行；窗=estMs+300（T46 化保留 estMs 上界——20 句实测 clip 全部 ≤ estMs，verify 逐句对账）
  const anchor = q.kind === 'best2';             // r11：择优题播方向锚（不指认）
  const win = sayWin + (anchor ? PICK_WIN : 0);
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;      // 真时钟演出锁（余量）
  KIDS.voice.play(sayClipOf(q), q.say);         /* 题面情景句（T46 化：co_sc_* 全句 clip——零 keyless） */
  replayAnim(friendEl, 'droop');                /* 伤心出场重演（容器 .sad 已带呼吸动画） */
  if (anchor) {
    await wait(sayWin * SPEED);                 /* 等题面句窗走完再串播锚（不抢声道） */
    if (token !== showRun || cur !== run) return;
    KIDS.voice.play(VOICE.pick.key, VOICE.pick.text);    /* co_pick：都很好，哪个现在最好 */
    await wait(PICK_WIN * SPEED);
  } else {
    await wait(win * SPEED);
  }
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                          /* 演出完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* 破涕为笑撒星星（演出层：#scene 内 spark 元素 6 颗，CSS 随机方向飞散；
   spark 为 #scene 子元素 absolute 定位——坐标相对 #scene 内边距盒） */
function sparkBurst() {
  const r = sceneEl.getBoundingClientRect();
  for (let k = 0; k < 6; k++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.innerHTML = '<svg viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg"><path d="M11 1 l2.6 6.4 L20 10 l-6.4 2.6 L11 19 l-2.6 -6.4 L2 10 l6.4 -2.6 Z" fill="#F5C542" stroke="#4A3B2E" stroke-width="1.6"/></svg>';
    const ang = -Math.PI / 2 + (k - 2.5) * 0.42;
    s.style.left = Math.round(r.width / 2 + (k - 2.5) * 26 - 11) + 'px';
    s.style.top = Math.round(r.height * 0.34) + 'px';
    s.style.setProperty('--dx', Math.round(Math.cos(ang) * 66) + 'px');
    s.style.setProperty('--dy', Math.round(Math.sin(ang) * 76) + 'px');
    sceneEl.appendChild(s);
    setTimeout(() => s.remove(), 1000 * SPEED + 60);
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
/* 教学"帮"阶段指向：当前题 best 卡（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardWrapAt(i));
}

/* ================= 点卡主路径（真实点击 / CO.tapCard / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡区容器 bump 微动效——家族 D）；
   演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行）========== */
async function uiTapCard(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(cardsEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(cardsEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) { sfx('pop'); replayAnim(cardsEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟；r11 灰/坏链共用同一锚）内非 best 卡点吞——
     pop+bump 不计 miss；best 放行（缓解吞输入急性子观察）；窗后第二错照常计 miss
     （miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(cardsEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCard(cur, i);
  if (r === null) { sfx('pop'); replayAnim(cardsEl, 'bump'); return null; }
  const el = cardWrapAt(i);

  if (r === 'wrong') {                           /* 非 best 卡：gray/bad 分流反馈+后果（r11 梯度） */
    const gray = q.cards[i].tier === 'gray';
    state.locked = true;
    const lockWin = gray ? GRAY_WIN : SHAKE_MS;
    state.showUntil = Date.now() + lockWin * SPEED + 140;
    dodgeLo();
    if (el) el.classList.add('bad');             /* 卡摇头（行为后果反馈；灰卡亦可重点=探索不罚） */
    if (gray) {
      /* 灰卡（有点用但不是最好）：朋友半好 meh+部分缓解后果+灰链单 clip（r11） */
      setFriendMood('meh');
      renderOutcome('gray');
      if (sayW([VOICE.gray.key]))                            /* 语义纠错句（契约 J 同治） */
        wrongChainUntil = Date.now() + GRAY_WIN;             /* 灰链豁免：3240+300=3540 真时钟（契约 I） */
    } else {
      /* 坏卡：朋友更难过一拍+错链两段（v1 沿用） */
      replayAnim(friendEl, 'sadder');                       /* 加深耷拉一拍——SEL：指向后果；可重触发 */
      if (sayW([VOICE.wrong.key, VOICE.hint.key]))           /* 错链全 clip 无 keyless（契约 N） */
        wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;      /* 链豁免：2544+150+2904+300=5898 真时钟（契约 I） */
    }
    if (q._miss === 1) replayAnim(cardsEl, 'wig');         /* 方向级：卡区整体 wiggle 不指卡 */
    if (q._miss >= 2) {                                   /* miss≥2=best 卡 breathe（答案级梯度） */
      const ok = cardWrapAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(lockWin * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('bad');          /* 卡回可重点（探索不罚） */
    state.locked = false;
    return r;
  }

  /* ---- right·done（best 卡：问题解决后果=朋友破涕为笑+后果气泡+撒星星+确认链单 clip） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__coTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  state.showUntil = Date.now() + CELE_WIN * SPEED + 140;   /* 2940=2640+300 精确（家族 H） */
  setFriendMood('happy');                        /* 破涕为笑：容器类 happy（弯眼+咧嘴+跳两下） */
  renderOutcome('best');                         /* r11 后果链好档：问题解决小动画气泡 */
  sparkBurst();
  if (el) { el.classList.remove('breathe'); el.classList.add('good'); }
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key]);           /* 确认链：co_right 单 clip（SPEC §4） */
  await wait(CELE_WIN * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关 */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                 /* 新题开题（朋友重新伤心出场+情景句） */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑫ init 后=真实写档链（localStorage kidsgame_comfort） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
}
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4，家族 M1：CHAPTERS[floor(f/5)+1]）；生成关=实算
     下一关随机章型 GEN[dch-1]（家族 F：genLevel 纯函数确定性，同 flat 恒同 dch——
     预告与实际章型恒一致，禁 (ci+1)%4 字面） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  showRun++;                                     /* 通关中止在途演出 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* co_right：朋友开心啦，真好（2640ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑫）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2640+300=2940 */
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
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastHearAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.comfort && sv.comfort.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §1：watch=情景→点 best 卡→朋友笑；
   turn=你来试一试帮/独；r11：演示题 scene4=best2 择优题——题面句后串播方向锚
   co_pick（孩子第一次听「都很好，哪个现在最好」=择优任务框架）
   watch=播 co_tut_watch「看！朋友伤心了」→ 延 3180（≥2880+300）→ 开题演出
   （scene4 小羊水杯短句 8 字：400+3360+300=4060 + 锚窗 PICK_WIN 3252=7312）
   → ghost 移入 800+press 320 → demo 点 best 卡演出窗 2940 → __coDemoR='right'；
   turn=播 co_tut_turn「你来试一试」→ 延 2124（≥1824+300）→ scene0 首题开题
   （400+estMs(12 字 4740)+300+3252=8692）→ 帮（指向 best 卡）→首对独（solo）→进正式关。
   —— watch 段分账 3180+7312+800+320+2940=14552 ≤ 16000（单步演示款 ≤16s） ---------- */
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 点 best 卡返回 'right'）
  const mk = s => {
    const row = SCENES[s];
    const cards = row.cards.map(c => ({ tier: c.tier, label: c.label, icon: c.icon }));
    let answer = -1;
    cards.forEach((c, i) => { if (c.tier === 'best') answer = i; });
    return { scene: s, say: row.say, anim: row.anim, prop: row.prop,
             kind: cards.length === 2 ? 'best2' : 'grad3',
             cards: cards, answer: answer, _miss: 0, _answered: false };
  };
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mk(4), mk(0)] };            // 题0=scene4 演示（8 字短句+择优锚控预算）/ 题1=预备位
}
function tutTurnLevel() {                        // 单题迷你关：scene0 首题（冰淇淋——正式关第一题同款）
  const mk = s => {
    const row = SCENES[s];
    const cards = row.cards.map(c => ({ tier: c.tier, label: c.label, icon: c.icon }));
    let answer = -1;
    cards.forEach((c, i) => { if (c.tier === 'best') answer = i; });
    return { scene: s, say: row.say, anim: row.anim, prop: row.prop,
             kind: cards.length === 2 ? 'best2' : 'grad3',
             cards: cards, answer: answer, _miss: 0, _answered: false };
  };
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mk(0)] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* co_tut_watch：看！朋友伤心了（2880ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥2880+300=3180：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* 小羊伤心出场+情景句+择优锚（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(cardWrapAt(idx));                 /* 幽灵手指指向 best 卡 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapCard(idx, true);      /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__coDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  window.__coWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.comfort = sv.comfort || {};
  sv.comfort.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 scene0 首题迷你关「你来试一试」（帮→独），首对放手进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 right 的 presentQuiz 新题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* co_tut_turn：你来试一试（1824ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1824+300=2124 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 朋友出场+情景句+择优锚 → 开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 方向提示音按题型分流（r11）：择优题=锚 co_pick「都很好，哪个现在最好」
   （方向锚不泄答案——不指认哪张卡）；梯度题=co_hint 沿 v1 */
const dirVoice = () => {
  const q = cur && cur.quizzes[cur.step];
  return q && q.kind === 'best2' ? VOICE.pick : VOICE.hint;
};
/* 重播情景句（方向级救援/重听共用；教学迷你关禁重播） */
function saySceneAgain() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || cur.flat < 0) return false;
  KIDS.voice.play(sayClipOf(q), q.say);   /* T46 化：重播同键 clip */
  replayAnim(friendEl, 'droop');
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  const v = dirVoice();
  sayR(v.key, v.text);                           /* 戳兔子=方向提示（best2 题=择优锚/梯度题=想想怎样） */
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重播 */
  if (Date.now() - lastHearAt < 3000) return;    /* 重听 3s 节流 */
  lastHearAt = Date.now();
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  saySceneAgain();                               /* 重听情景句（题面真值同源） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  lastAct = Date.now();
  startLevel(cur.flat);                          /* 再玩一次=重开本关（同 flat 确定性同题） */
});
cardsEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card-wrap');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapCard(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card-wrap')) return;    // 卡点击已由 cardsEl 处理
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    const v = dirVoice();
    sayR(v.key, v.text);                         /* 空白探索=方向提示（best2 题=择优锚） */
  }
});

/* ================= 无操作看护：14s 方向级（重播情景句，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（best 卡 breathe+重播）/
   教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断（灰/坏链共用） */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cardWrapAt(i); if (ok) replayAnim(ok, 'breathe'); }
      saySceneAgain();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播情景句（不动 lastAct） */
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
  KIDS.init({ game: 'comfort', title: '安慰选择' });   // 存档键 kidsgame_comfort（core VER 1.0，家族 C）
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
   真实页同暴露 window.CO——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（含 cards tier/label 真值——verify 从 cards 独立
   推导 answer=唯一 tier==='best' 的 i，禁读 quiz.answer 直比）；kind='best2'|'grad3'
   （r11 择优/梯度题型）；step=全关题号 0-4（b33 坑①：题号语义显式声明——flat*5
   内的第几题，非全局题号）。
   tapCard 返回：best 卡非末题 'right' / best 卡末题 'done' / gray·bad 卡 'wrong' /
   豁免窗内非 best 卡吞 false / 演出期 null（真时钟锁）/ 越界 null ================ */
window.CO = {
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
    return { scene: q.scene,                          /* 情景 id 0-19（SPEC §6 题库行号） */
             kind: q.kind,                            /* 'best2'|'grad3'（r11 题型） */
             say: q.say,                              /* 情景句文本（题面真值=T46 clip 对账源） */
             cards: q.cards.map(c => ({ tier: c.tier, label: c.label })),   /* 做法卡（图省略——图标非语义真值） */
             answer: q.answer,                        /* best 卡下标（唯一 tier==='best' 的 i） */
             step: cur.step,                          /* 全关题号 0-4（b33 坑①语义） */
             miss: q._miss || 0 };
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点 best 卡，走真实判定链；
    let taps = 0, guard = 0;             // 演出锁/演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 200) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapCard(q.answer);
      if (r === 'right' || r === 'done') taps++;
      else if (guard >= 198) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
