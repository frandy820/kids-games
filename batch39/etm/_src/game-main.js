/* ================= etm 主逻辑（情境演出→点脸谱/档位/组合脸→选中演出/摇头弹回）
   r49（SPEC-R49）：玩法框架零改动——renderQuiz 对 mix 族天然走 else 分支
   （温度计隐藏+4 组合脸候选），lvNumberOf('l1'-'l5')→1-5 直接适配五档升位；
   救援双锚/演出窗/错反馈两级/教学链全部承基线（§R1 不变项表）。
   r49 idle 锚核对表（keepIdle 家族第 4 例自查——r23/r24/r46 教训）：
   14s 方向级 rescueTick→saySceneAgain 不刷 lastAct ✓（只刷 lastDir）；
   30s 答案级刷新 lastAct=终态动作语义保留 ✓；用户主动重看 hearBtn/戳兔子
   rabbitBtn/再玩 replayBtn→startLevel 均刷 lastAct=用户主动语义 ✓；
   开题 presentQuiz 演出完成刷两锚=感知完成（b25 M4）✓。无共享演出路径
   无条件刷锚缺陷。
   开题演出（presentQuiz）：情境插画卡出场+题面情境句 clip 播报（KIDS.voice.play
   ——非队列链，SPEC §2 明示契约 N 不适用；窗=estMs(句长)+300+出场 400，动态按句
   长题表 6-17 字 2970-6765——家族 T；r49 新 22 键未注册期=T46 阶段3 静默落空，
   窗数学不变）。演出锁=真时钟 state.showUntil（Date.now() 比较，tapPick 演出期
   返 null——测试驱动须轮询等）。
   指对=正确项 .good 放大跳动+（level 族）水银柱升位演出（PICK_MS 1000 前置——
   温度计强度隐喻核心，data-lv 1-5）+确认链 [etm_right]（单 clip 窗 CELE_WIN
   1932=1632+300 精确——家族 H；合计演出锁 2932）。
   指错=项摇头+miss+错链 [etm_wrong, etm_hint]（豁免窗 4626=2088+150+2088+300
   真时钟，契约 I）+错链播毕重播情境句（错反馈不泄答案——重播情境句+
   hint 句方向级重读，不亮正确项本体）+首错候选区整体 wiggle（方向级不指项）/
   miss≥2 正确项 breathe（答案级梯度）。
   救援：14s 方向级=重播情境句+插画卡重演（lastDir 独立节流锚，不重置
   lastAct——契约 B）/ 30s 答案级=正确项 breathe+重播；错链豁免窗让路（契约 I）。
   验收钩子：window.ETM = { get currentLevel, get quiz{scene,kind,text,picks,
   answer,step,miss,say}, tapPick(i), start(flat), autoSolve() }——真实页同暴露
   （b29 坑⑥）。
   tapPick 返回：正确项非末题 'picked' / 正确项末题 'done' / 错项 'wrong' /
   豁免窗内错项吞 false / 演出期 null（真时钟锁）/ 越界·已答·无题 null。 */
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

const sceneEl = $id('scene'), sceneCardEl = $id('scene-card'), hintEl = $id('hint-line'),
      thermoEl = $id('thermo'), qTextEl = $id('q-text'), picksEl = $id('picks'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastHearAt = 0;                             // 重听情境句 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重演中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）
let hintResayTimer = 0;                         // 方向级反馈延时句（错链播毕重播情境句——SPEC §2）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const pickAt = i => picksEl.querySelector('.pick[data-i="' + i + '"]');
const tubeEl = () => thermoEl.querySelector('.t-tube');
const lvNumberOf = id => Number(String(id).slice(1));   /* 'l1'→1（水银柱档号——DOM 演出锚） */

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  qTextEl.textContent = Q_TEXT;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：指对=双音上行 / 指错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(523.25, 0.12, 0, 0.3); };

/* ================= 渲染 ================= */
/* 两族舞台（契约 M 帧内容锚）：face 族=情境插画+4 脸谱（温度计隐藏）；
   level 族=情境插画+立式温度计（水银柱归零 data-lv="0"）+5 档位卡（r49 五档，m3 勘正） */
function renderQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  sceneCardEl.innerHTML = sceneSvg(q.scene);      // 情境插画（事件性简笔——不画表情不泄答案）
  replayAnim(sceneCardEl, 'in');
  hintEl.textContent = q.say;                     // 情境句真值（题面 TTS 同源——双通道）
  sceneEl.dataset.scene = q.row;                  // 帧内容锚（verify 断言渲染即引擎）
  if (q.kind === 'level') {
    thermoEl.classList.add('show');               // 立式温度计（强度隐喻核心）
    const tube = tubeEl();
    if (tube) tube.dataset.lv = '0';              // 开题水银柱归零（答对后升位）
  } else {
    thermoEl.classList.remove('show');
  }
  picksEl.innerHTML = '';
  picksEl.dataset.n = q.picks.length;             // face 4/level 5（r49：竖屏 data-n=5 走 2 列网格——m3 勘正）
  picksEl.dataset.kind = q.kind;
  for (let i = 0; i < q.picks.length; i++) {
    const id = q.picks[i];
    const w = document.createElement('button');
    w.className = 'pick pop';
    w.dataset.i = i;                              // 项下标（点选语义）
    w.style.animationDelay = (i * 90) + 'ms';
    w.setAttribute('aria-label', pickName(q.kind, id));
    const art = document.createElement('span');
    art.className = 'art';
    art.innerHTML = pickSvg(q.kind, id);          // 脸谱大图/档位强度脸+温度计小样
    const word = document.createElement('span');
    word.className = 'word';
    word.textContent = pickName(q.kind, id);
    w.appendChild(art); w.appendChild(word);
    picksEl.appendChild(w);
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

/* ================= 开题演出：渲染 → 题面情境句 say（keyless TTS）→ 开放点选
   演出锁=真时钟 showUntil（tapPick 演出期返 null）================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  clearTimeout(hintResayTimer);                  // 新题开题：中止在途情境句重播
  renderQuiz();
  const run = cur, token = ++showRun;
  const win = ENTER_MS + estMs(q.say) + 300;     // 出场 400 与题面 TTS 并行，窗=estMs+300（家族 T）
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;      // 真时钟演出锁（余量）
  KIDS.voice.play(q.sayKey, q.say);             /* 题面情境句 clip 化（T46 阶段2：etm_sc_<scene>——
                                                   落空自动回退 TTS，B 类键） */
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
/* 教学"帮"阶段指向：当前题正确项（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(pickAt(i));
}

/* ================= 点选主路径（真实点击 / ETM.tapPick / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（候选区容器 bump 微动效——家族 D）；
   演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行）========== */
async function uiTapPick(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(picksEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(picksEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) { sfx('pop'); replayAnim(picksEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错项点吞——pop+bump 不计 miss；
     正确项放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(picksEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapPick(cur, i);
  if (r === null) { sfx('pop'); replayAnim(picksEl, 'bump'); return null; }
  const el = pickAt(i);

  if (r === 'wrong') {                           /* 错项：摇头+错链两段+方向级反馈+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + BOUNCE_MS * SPEED + 140;   /* 1100 ≤ 2238（b37 R3：留豁免窗活跃段） */
    dodgeLo();
    if (el) el.classList.add('miss');            /* 错项摇头（不亮正确项本体——不泄答案） */
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))             /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;        /* 链豁免：2088+150+2088+300=4626 真时钟（契约 I） */
    /* 方向级反馈=错链播毕重播情境句（SPEC §2：重播情境句+hint 句重读——方向级，
       q 未答且未换关才播，防叠音/串题） */
    clearTimeout(hintResayTimer);
    hintResayTimer = setTimeout(() => {
      if (cur === run && !state.won && !q._answered) {
        KIDS.voice.play(q.sayKey, q.say);   // 错链播毕重播情境句（clip 化——T46 阶段2）
        replayAnim(hintEl, 'repop');
        replayAnim(sceneCardEl, 'in');
      }
    }, WRONG_CHAIN_WIN + 60);
    if (q._miss === 1) replayAnim(picksEl, 'wig');           /* 方向级：候选区整体 wiggle 不指项 */
    if (q._miss >= 2) {                                     /* miss≥2=正确项 breathe（答案级梯度） */
      const ok = pickAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(BOUNCE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('miss');          /* 项回可重点（探索不罚） */
    state.locked = false;
    return r;
  }

  /* ---- picked·done（正确项：.good 放大+（level 族）水银柱升位+确认链单 clip） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次指对 → 放手 */
    state.tut = 'solo';
    window.__etmTutSolo = true;                  /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  clearTimeout(hintResayTimer);                  // 已指对：中止在途情境句重播（防叠音）
  state.locked = true;
  state.showUntil = Date.now() + (PICK_MS + CELE_WIN) * SPEED + 140;   /* 1000+1932（家族 H） */
  if (el) { el.classList.remove('breathe'); el.classList.add('good'); }
  if (q.kind === 'level') {                      /* 水银柱升位演出（强度隐喻核心——DOM 锚 data-lv） */
    const tube = tubeEl();
    if (tube) tube.dataset.lv = String(lvNumberOf(q.picks[q.answer]));
  }
  chimeGoal();
  sfx('coin');
  await wait(PICK_MS * SPEED);                   /* 选中演出窗（.good+水银柱升位） */
  if (cur !== run || token !== showRun) return r;
  KIDS.voice.queue([VOICE.right.key]);           /* 确认链：etm_right 单 clip（SPEC §4） */
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
  presentQuiz();                                 /* 新题开题（新情境卡+情境句） */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_etm） ================= */
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
  clearTimeout(hintResayTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* etm_right：你说对啦（1632ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 1632+300=1932 */
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
  clearTimeout(hintResayTimer);                  // 换关中止在途情境句重播
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastHearAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.etm && sv.etm.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §2：watch=听情境→看脸谱→
   点正确脸谱；turn=你来指一指帮/独；演示题=face 族）
   watch=播 etm_tut_watch「看！现在心情怎么样」→ 延 3540（≥3240+300）→ 开题演出
   （row0 花情境 8 字：400+3360+300=4060）→ ghost 移入 800+press 320
   → demo 点正确脸谱演出窗 1000+1932=2932 → __etmDemoR='picked'；
   turn=播 etm_tut_turn「你来指一指」→ 延 2148（≥1848+300）→ row0 首题开题
   （400+3360+300=4060）→ 帮（指向正确脸谱）→首对独（solo）→进正式关。
   —— watch 段分账 3540+4060+800+320+2932=11652 ≤ 16000（单步演示款 ≤16s） ---------- */
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（face 族 row0 花→开心）
  return { flat: -1, ch: 0, dch: 0, lv: 0, rows: [0, 1],
           step: 0, retries: 0, done: false,
           quizzes: [buildQuiz(0, ['sad', 'happy', 'scared', 'angry']), buildQuiz(1, ['angry', 'sad', 'happy', 'scared'])] };
}
function tutTurnLevel() {                        // 单题迷你关：row0 首题（花——正式关第一题同款盘序由 startLevel 生成）
  return { flat: -1, ch: 0, dch: 0, lv: 0, rows: [0],
           step: 0, retries: 0, done: false,
           quizzes: [buildQuiz(0, ['scared', 'angry', 'happy', 'sad'])] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* etm_tut_watch：看！现在心情怎么样（3240ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥3240+300=3540：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* 花情境卡出场+情境句（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(pickAt(idx));                     /* 幽灵手指指向正确脸谱（开心） */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapPick(idx, true);      /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__etmDemoR = demoR;                     /* 演示生效证据（§0.27，gate 断言 'picked'——终值语义） */
  window.__etmWatchMs = Date.now() - t0w;        /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.etm = sv.etm || {};
  sv.etm.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 row0 首题迷你关「你来指一指」（帮→独），首对放手进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 picked 的 presentQuiz 新题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* etm_tut_turn：你来指一指（1848ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1848+300=2148 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 花情境卡+情境句 → 开放点选（demo 已撤可真点） */
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
  KIDS.voice.play(q.sayKey, q.say);         // 重播情境句（clip 化——T46 阶段2）
  replayAnim(hintEl, 'repop');
  replayAnim(sceneCardEl, 'in');
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：听听发生了什么 */
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重播 */
  if (Date.now() - lastHearAt < 3000) return;    /* 重听 3s 节流 */
  lastHearAt = Date.now();
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  saySceneAgain();                               /* 重听情境句（题面真值同源） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  lastAct = Date.now();
  startLevel(cur.flat);                          /* 再玩一次=重开本关（同 flat 确定性同题） */
});
picksEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.pick');
  if (!p) return;                                // 项间空白走 stage 空白路径
  e.preventDefault();
  uiTapPick(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.pick')) return;         // 项点击已由 picksEl 处理
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重播情境句+插画卡重演，lastDir 独立
   节流锚，不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确项 breathe+
   重播）/ 教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
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
  KIDS.init({ game: 'etm', title: '表情温度计' });   // 存档键 kidsgame_etm（core VER 1.0，家族 C）
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
   真实页同暴露 window.ETM——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（picks 拷贝；answer=正确项下标——verify 从 SPEC 题表
   期望 id 对 picks 独立推导对账，禁读 quiz.answer 直比）；step=全关题号 0-4
   （b33 坑①：题号语义显式声明——flat*5 内的第几题，非全局题号）。
   tapPick 返回：正确项非末题 'picked' / 正确项末题 'done' / 错项 'wrong' /
   豁免窗内错项吞 false / 演出期 null（真时钟锁）/ 越界·已答·无题 null ================ */
window.ETM = {
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
    return { scene: q.scene,                            /* 情境 id（SPEC §2 题库行唯一锚） */
             kind: q.kind,                              /* 族标记：'face' 命名 | 'level' 分级 */
             text: q.text, sayKey: q.sayKey,            /* 情境句全文+clip 键（=quiz.say——题面真值） */
             picks: q.picks.slice(),                    /* 盘序 id 数组（face 4 脸/level 5 档——r49 m3 勘正） */
             answer: q.answer,                          /* 正确项下标（=picks.indexOf(题表期望 id)） */
             step: cur.step,                            /* 全关题号 0-4（b33 坑①语义） */
             miss: q._miss || 0,
             say: q.say };                              /* 情境句 keyless 文本（say 非队列链） */
  },
  tapPick(i) { return uiTapPick(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点正确项，走真实判定链；
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
