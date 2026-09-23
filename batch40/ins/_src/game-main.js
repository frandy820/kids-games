/* ================= ins 主逻辑（看动物听题→两选点选→LEGS 推导判定）
   开题演出（presentQuiz）：动物大图出场+题面拼接链
   KIDS.voice.queue(['ins_a_' + anim, 'ins_t_' + kind])——T46 阶段2 全 clip 双段链
   （动物名 clip+题模板尾段 ins_t_ clip——落空回退 TTS；段间 150。
   窗=ENTER 400+名 clip 实长+150+estMs(尾段)+300，动态按句长——家族 T）。
   演出锁=真时钟 state.showUntil（Date.now() 比较，tapPick 演出期返 null
   ——测试驱动须轮询等）。legs 族题恒挂 .leg-focus（腿高亮视觉锚——
   SPEC §1：腿逐条可数恒在，禁把答案画在题面）。
   选对=按钮闪亮 .good+动物图 happy 一拍+确认链 [ins_right]（单 clip 窗
   PICK_WIN 2964=2664+300 精确——家族 H）；选错=按钮摇头+错链
   [ins_wrong, ins_sci_x]（科普句按动物类——蛛形纲=「它不是昆虫」句式，
   知识红线；豁免窗 6638=1944+150+3744+300 真时钟，契约 I）+首错盘区整体
   wiggle（方向级不指候选）/ miss≥2 正确候选 breathe（答案级）。
   救援：14s 方向级=播科普句+动物图轻摆（lastDir 独立节流锚，不重置
   lastAct——契约 B）/ 30s 答案级=正确候选 breathe+重播题面；错链豁免窗让路
   （契约 I）。
   验收钩子：window.INS = { get currentLevel, get quiz{kind,anim,text,picks,
   answer,step,miss,say}, tapPick(i), start(flat), autoSolve() }——真实页同
   暴露（b29 坑⑥）。tapPick 返回：契合项非末题 'picked' / 末题 'done' /
   干扰项 'wrong' / 豁免窗内干扰项吞 false / 演出期 null（真时钟锁）/
   越界·已答完 null。 */
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

const animalEl = $id('animal'), trayEl = $id('tray'),
      qTextEl = $id('q-text'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost'), dockEl = $id('dock');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastHearAt = 0;                             // 重听题面 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/演出中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const pickAt = i => trayEl.querySelector('.pick[data-i="' + i + '"]');
/* 完整题面句（text/say 同源）：dch1-3=动物名+SAY_T 尾；r26 dch4 谱=具名题
   动物名+SAY_T4 尾 / mixfind=MIX_SAY[cond] 单句（无主角名——念名即泄答案） */
const quizSay = q => q.kind === 'mixfind' ? MIX_SAY[q.cond]
  : ANIMAL_NAME[q.anim] + (SAY_T4[q.kind] || SAY_T[q.kind]);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：选对=双音上行 / 选错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(523.25, 0.12, 0, 0.3); };

/* ================= 渲染 ================= */
/* 动物观察大图（契约 M 数值/DOM 层锚）：dataset.anim/dataset.kind=引擎真值；
   legs 族恒挂 .leg-focus（腿高亮可数——SPEC §1 视觉锚恒在）；
   r26（SPEC-R26 §R4）：legs3 恒挂 .leg-hide（叶子挡腿——腿不可数，类目知识
   回忆通道；30s 答案级救援掀叶）；mixfind=放大镜找一找场景（data-anim="search"
   ——无主角，不承载答案） */
function renderAnimal() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'mixfind') {                    // r26：找一找模式（舞台非主角）
    animalEl.dataset.anim = 'search';
    animalEl.dataset.kind = q.kind;
    animalEl.innerHTML = SEARCH_SVG;
    animalEl.classList.remove('leg-focus', 'leg-hide');
    return;
  }
  animalEl.dataset.anim = q.anim;                // 帧内容锚（verify 断言渲染即引擎）
  animalEl.dataset.kind = q.kind;
  animalEl.innerHTML = animSvg(q.anim) + (q.kind === 'legs3' ? '<div class="leafcover" aria-hidden="true"></div>' : '');   /* r26 legs3=svg+叶遮挡条 */
  animalEl.classList.toggle('leg-focus', q.kind === 'legs');
  animalEl.classList.toggle('leg-hide', q.kind === 'legs3');   // r26 撤腿可数锚
}
function renderTray() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  trayEl.innerHTML = '';
  trayEl.dataset.n = q.picks.length;
  for (let j = 0; j < q.picks.length; j++) {
    const b = document.createElement('button');
    b.className = 'pick pop';
    b.dataset.i = j;                             // 候选下标（点选语义——.pick[data-i])
    b.style.animationDelay = (j * 90) + 'ms';
    b.setAttribute('aria-label', PICK_LABEL[q.picks[j]] || ANIMAL_NAME[q.picks[j]]);   // r26：三选标签+动物名兜底
    const art = document.createElement('span');
    art.className = 'art';
    art.innerHTML = pickSvg(q.kind, q.picks[j]);
    b.appendChild(art);
    trayEl.appendChild(b);
  }
}
function renderQuiz() {
  renderAnimal();
  renderTray();
  qTextEl.textContent = quizSay(cur.quizzes[cur.step]);   // 题面装饰句（不播——题面真值=语音链）
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

/* ================= 开题演出：渲染 → 题面拼接链 → 开放点选。
   演出锁=真时钟 showUntil（tapPick 演出期 null）。
   r26（SPEC-R26 §R4）：dch4 具名题（judge3/legs3/bodyseg）链=['ins_a_'+anim,
   'ins_t_'+kind]（ins_t_judge3/legs3/bodyseg 新键——注册前静默）；mixfind 链=
   ['ins_t_mix'+cond] 单段（无主角名防泄）；窗=ENTER+名实长+150+estMs(尾)+300
   （mixfind 无名段）——estMs 全字符口径恒安全覆盖。================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  const win = q.kind === 'mixfind'
    ? ENTER_MS + estMs(MIX_SAY[q.cond]) + 300                                        /* r26：单段链无名音 */
    : ENTER_MS + NAME_DUR[q.anim] + 150 + estMs(SAY_T4[q.kind] || SAY_T[q.kind]) + 300;   /* 出场 400 与题面链并行 */
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;      // 真时钟演出锁（余量）
  KIDS.voice.queue(q.kind === 'mixfind'
    ? ['ins_t_mix' + q.cond]                                 /* r26：mixfind 题面单段 clip */
    : ['ins_a_' + q.anim, 'ins_t_' + q.kind]);               /* T46 阶段2：全 clip 双段链（尾段 ins_t_ 键，窗=estMs 口径恒安全覆盖） */
  replayAnim(animalEl, 'enter');                 /* 动物图出场重演 */
  await wait(win * SPEED);
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                          /* 演出完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
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
/* 教学"帮"阶段指向：当前题契合候选（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const j = correctIdx(q);
  if (j >= 0) pointGhostAt(pickAt(j));
}

/* ================= 点选主路径（真实点击 / INS.tapPick / autoSolve / 教学演示共用）
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
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内干扰项点吞——pop+bump 不计 miss；
     契合项放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(trayEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapPick(cur, i);
  if (r === null) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }
  const el = pickAt(i);

  if (r === 'wrong') {                           /* 干扰项：按钮摇头+错链两段+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + SHAKE_MS * SPEED + 140;   /* 首错锁总窗 1100+140=1240 ≤ 2094 */
    dodgeLo();
    if (el) el.classList.add('bad');             /* 候选摇头（行为后果反馈） */
    if (sayW([VOICE.wrong.key, VOICE[sciKeyOf(q.anim)].key])) {   /* 错链全 clip 无 keyless（契约 N）：科普句三向按动物类（r26 干扰动物→sciNone） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;        /* 链豁免：1944+150+3744+300=6638 真时钟（契约 I） */
      if (sciKeyOf(q.anim) === 'sciNone')                    /* r26：干扰动物错链更长（sci_none 实长 4344>基线链构成 sci_insect 3744）——专窗 */
        wrongChainUntil = Date.now() + WRONG_CHAIN_WIN4;
    }
    if (q._miss === 1) replayAnim(trayEl, 'wig');           /* 方向级：盘区整体 wiggle 不指候选 */
    if (q._miss >= 2) {                                     /* miss≥2=契合候选 breathe（答案级梯度） */
      const ok = pickAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(SHAKE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('bad');          /* 候选回可重点（探索不罚） */
    state.locked = false;
    return r;
  }

  /* ---- picked·done（契合项：按钮闪亮+动物开心一拍+确认链） ---- */
  lastAct = Date.now();                          /* 正确选中重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__insTutSolo = true;                  /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  const winR = q.kind === 'mixfind' ? MIX_WIN : PICK_WIN;   /* r26：mixfind 确认链=right+名音两段——窗 4554（§R9 实测口径） */
  state.locked = true;
  state.showUntil = Date.now() + winR * SPEED + 140;   /* 2964=2664+300 精确（家族 H）/ mixfind 4554 */
  if (el) { el.classList.remove('breathe'); el.classList.add('good'); }
  replayAnim(animalEl, 'happy');
  chimeGoal();
  sfx('coin');
  if (q.kind === 'mixfind') KIDS.voice.queue([VOICE.right.key, 'ins_a_' + q.anim]);   /* r26：末步名音=找到的动物（r25 先例） */
  else KIDS.voice.queue([VOICE.right.key]);           /* 确认链：ins_right 单 clip（SPEC §1） */
  await wait(winR * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关 */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                 /* 下一题开题（出场+题面链） */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_ins） ================= */
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
  sayR(VOICE.right.key, VOICE.right.text);       /* ins_right：答对啦，小科学家（2664ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2664+300=2964 */
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
  animalEl.classList.remove('happy');
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastHearAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.ins && sv.ins.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §1 降坡：watch=看昆虫
   蜘蛛→幽灵手指点昆虫按钮；turn=你也点一点帮/独；演示题=row0 ant judge）
   watch=播 ins_tut_watch「看！昆虫和蜘蛛」→ 延 3400（≥3072+300）→ 开题演出
   （ant 题面窗 400+1344+150+4395+300=6589）→ ghost 移入 800+press 320
   → demo 点契合项演出窗 2964 → __insDemoR='picked'（§4 教学末步）；
   turn=播 ins_tut_turn「你来点一点」→ 延 2200（≥1824+300）→ ant 题开题
   （6589）→ 帮（指向契合候选）→首对独（solo）→一题点完进正式关。
   —— watch 段分账 3400+6589+800+320+2964=14073 ≤ 16000（单步演示款 ≤16s） ---------- */
function mkQuiz(s) {                             // 教学迷你关题：规范盘序（契合项 0 号——deterministic）
  const row = ROWS[s];
  const picks = PICKS_OF(row.kind).slice();      // ['insect','spider'] 固定序
  return { row: s, kind: row.kind, anim: row.anim,
           picks: picks, answer: picks.indexOf(pickIdOf(row.kind, row.anim)),   // ant→'insect'=0
           _miss: 0, _answered: false };
}
function tutWatchLevel() {                       // 双题位迷你关：题 0=演示题（demo 点契合项返回 'picked'）
  return { flat: -1, ch: 0, dch: 0, lv: 0, rows: [0, 0], step: 0, retries: 0, done: false,
           quizzes: [mkQuiz(0), mkQuiz(0)] };    // 题0=演示（ant judge）/ 题1=预备位
}
function tutTurnLevel() {                        // 单题迷你关：ant 辨类（正式关第一题同款·一题点完）
  return { flat: -1, ch: 0, dch: 0, lv: 0, rows: [0], step: 0, retries: 0, done: false,
           quizzes: [mkQuiz(0)] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* ins_tut_watch：看！昆虫和蜘蛛（3072ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥3072+300=3372：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* 动物图出场+题面链「蚂蚁呀，它是昆虫还是蜘蛛？」（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(pickAt(idx));                     /* 幽灵手指指向昆虫按钮 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapPick(idx, true);      /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__insDemoR = demoR;                     /* 演示生效证据（§0.27，gate 断言 'picked'——终值语义） */
  window.__insWatchMs = Date.now() - t0w;        /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.ins = sv.ins || {};
  sv.ins.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 ant 迷你关「你来点一点」（帮→独），首对放手一题点完进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 picked 的 presentQuiz 开题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);         /* ins_tut_turn：你来点一点（1824ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1824+300=2124 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 动物图出场+题面链 → 开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重播题面链（方向级救援/重听共用；教学迷你关禁重播）。
   r26：与 presentQuiz 同式分流——mixfind 重播 ['ins_t_mix'+cond] 单段
   （禁播主角名音=泄答案——anim=契合动物） */
function sayQuizAgain() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || cur.flat < 0) return false;
  KIDS.voice.queue(q.kind === 'mixfind'
    ? ['ins_t_mix' + q.cond]                                 /* r26：mixfind 重播单段（防泄） */
    : ['ins_a_' + q.anim, 'ins_t_' + q.kind]);   // 重播题面链（clip 化——T46 阶段2）
  replayAnim(animalEl, 'wig');
  return true;
}
/* 方向级科普句（SPEC §1：科普句=救援方向级；蛛形纲=「它不是昆虫」句式） */
function saySci() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const sci = VOICE[sciKeyOf(q.anim)];
  KIDS.voice.play(sci.key, sci.text);
  replayAnim(animalEl, 'wig');
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：数数它有几条腿 */
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重播 */
  if (Date.now() - lastHearAt < 3000) return;    /* 重听 3s 节流 */
  lastHearAt = Date.now();
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  sayQuizAgain();                                /* 重听题面链（题面真值同源） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  lastAct = Date.now();
  startLevel(cur.flat);                          /* 再玩一次=重开本关（同 flat 确定性同题） */
});
trayEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.pick');
  if (!p) return;                                // 候选间空白走 stage 空白路径
  e.preventDefault();
  uiTapPick(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.pick')) return;         // 候选点击已由 trayEl 处理
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（科普句+动物图轻摆，lastDir 独立
   节流锚，不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（契合候选
   breathe+重播题面链）/ 教学"帮"5s 重演示。
   r26（SPEC-R26 §R4）：30s 答案级在 legs3 题**掀叶揭晓腿**（视锚回归一次
   ——r24 soundcount 答案级带锚重播同款分层：方向级恒不掀=知识型提示 /
   答案级可掀=卡死 30s 的孩子最后看到一次「类目↔腿数」对应关系）；
   rescueCore 抽取（rescueTick=VERIFY 门+核心体，真实页行为逐字节等价）——
   VERIFY 页专用驱动 _idleHack/_rescueCore 挂 INS（⑭ 救援分层单元直驱实证，
   r24 ㉑ 同范式） ================= */
function rescueCore() {
  if (!cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q && !q._answered) {
      const ok = pickAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
      if (q.kind === 'legs3') animalEl.classList.remove('leg-hide');   /* r26：掀叶揭晓腿（答案级视锚回归） */
      sayQuizAgain();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：科普句（SPEC §1；不动 lastAct；不掀叶——分层） */
    saySci();
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
function rescueTick() {
  if (VERIFY) return;                            /* verify 页救援静默（驱动走 _rescueCore） */
  rescueCore();
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言，照 b28 m4） */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'ins', title: '昆虫还是蜘蛛' });   // 存档键 kidsgame_ins（core VER 1.0，家族 C）
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
   真实页同暴露 window.INS——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（picks=当前题候选 id 2 枚——verify 从 kind+anim+
   SPEC_LEGS 独立推导 answer=对账锚，禁读 quiz.answer 直比）；
   step=全关题号 0-4（b33 坑①：题号语义显式声明——flat*5 内的第几题）。
   text/say=完整题面句（动物名+模板尾段同源——text 供 q-text 装饰、say 供
   语音链对账）。
   tapPick 返回：契合项非末题 'picked' / 末题 'done' / 干扰项 'wrong' /
   豁免窗内干扰项吞 false / 演出期 null（真时钟锁）/ 越界·已答完 null ================ */
window.INS = {
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
    return { kind: q.kind,                          /* 题 family：dch1-3 'judge'|'legs' 两族；r26 dch4 谱 'judge3'|'legs3'|'bodyseg'|'mixfind'（SPEC-R26 §R2） */
             anim: q.anim,                          /* 动物 id（LEGS 封闭集 10 种；mixfind=契合动物——verify 推导锚，题面不念名） */
             cond: q.kind === 'mixfind' ? q.cond : 0,   /* r26：mixfind 双条件 6|8（腿数↔类目），其余 0 */
             text: quizSay(q),                      /* 完整题面句（q-text 装饰同源） */
             picks: q.picks.slice(),                /* 候选 id 2 枚（dch1-3）/3 枚（dch4 谱——盘序 seeded 打乱） */
             answer: q.answer,                      /* 契合项下标（verify 按 SPEC_LEGS/SEGS 独立推导） */
             step: cur.step,                        /* 全关题号 0-4（b33 坑①语义） */
             miss: q._miss || 0,
             say: quizSay(q) };                     /* 题面语音句（=clip 动物名+尾段拼接；mixfind=单句） */
  },
  tapPick(i) { return uiTapPick(i); },
  async autoSolve() {                    // UI 路径自动做完当前关（逐题点契合项，走真实判定链；
    let taps = 0, guard = 0;             // 单步题：每轮重读 quiz（picked 后 step+1 开新题——假卡死防线）；
    while (cur && !cur.done && guard++ < 400) {   // 演出锁/演出期 null → 轮询等锁窗结束重试，非 break
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q || q._answered) { if (!q) break; continue; }
      const r = await uiTapPick(q.answer);
      if (r === 'picked' || r === 'done') taps++;
      else if (guard >= 398) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; },
  /* r26 VERIFY 页专用救援驱动（SPEC-R26 §R4——真实页 no-op：⑭ 分层单元直驱用） */
  _idleHack(ms) { if (VERIFY) { lastAct = Date.now() - ms; lastDir = Date.now() - ms; } },
  _rescueCore() { if (VERIFY) rescueCore(); }
};
