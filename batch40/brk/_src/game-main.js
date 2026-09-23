/* ================= brk 主逻辑（目标牌+槽区 → 点卡拆解 → 卡飞入槽/干扰卡晃）
   开题演出（presentQuiz）：目标牌+槽区+候选卡 5 张出场 → 题面链
   queue([目标名 clip, {key:null, 模板}])（契约 N：keyless 段必居链尾——core
   queue keyless 段播完即弃后续，故语序=目标名在前「办一场生日聚会，帮小兔子
   拆一拆」）；窗 PRESENT_TTS=GOAL_CLIP_MAX 2232+段间 150+estMs(模板 7 字)=
   3015+尾 300=5697（N2 总窗口径），presentQuiz 锁窗=ENTER_MS 400+5697=6097。
   演出锁=真时钟 state.showUntil（tapCard 演出期返 null——测试驱动须轮询等）。
   点对=换步音效（order 族连选题步进只播换步音、不重播题面不读卡——SPEC §3
   语音行）+卡飞入槽（pick 清单逐格亮/order 序列按号进）+卡 .gone（进度=槽
   与 gone 卡双锚）；题完成（第 3/5 张）加确认链 [brk_right]（CELE_WIN
   3036=2736+300 精确）。
   点错（pick=干扰卡/order=非当前步卡）=错链 [brk_wrong]（豁免窗
   WRONG_CHAIN_WIN 3330=2880+150+300 真时钟契约 I）+干扰卡轻晃（SHAKE_MS
   1200 ≤ wrong+150=3030——b37 R3 首错锁禁覆盖豁免窗）+首错卡池 wiggle（方向级
   不指卡）/ miss≥2 当前应点卡 breathe（答案级梯度——order=当前步卡/pick=
   首张未选正确卡）。
   点已选卡=轻摇 shake+拒绝 false（家族 D 不计 miss——探索不罚，豁免窗内外
   同路径）。
   重听=重播题面链（3s 节流，题面后可点）。
   救援：14s 方向级=hint clip+卡池 wiggle（lastDir 独立节流锚不重置 lastAct
   ——契约 B）/30s 答案级=当前应点卡 breathe+重播题面；错链豁免窗让路（契约 I）。
   验收钩子：window.BRK = { get currentLevel, get quiz{kind,goal,goalLabel,
   cards,answer,answerList,picked,step,miss,say}, tapCard(i), start(flat),
   autoSolve(), get tutorial }——真实页同暴露（b29 坑⑥）。
   tapCard 返回：点对步进 'fill' / 题完成 'done'（pick 点满 3/order 5 步完，
   不分末题）/ 点错 'wrong' / 已选卡 false（轻摇不计 miss）/ 豁免窗内错点吞
   false / 演出期 null（真时钟锁）/ 越界·已答·无题 null。 */
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
/* 纠错链节流：flat<3（含教学迷你关 -1）每错必播；flat≥3 走 10s 节流
   （契约 J：语义句全程保留，禁切通用 clip；b36 m3 教训条件写 cur.flat < 3） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), goalBoardEl = $id('goal-board'), goalIcEl = $id('goal-ic'),
      goalNameEl = $id('goal-name'), goalSubEl = $id('goal-sub'),
      slotRowEl = $id('slot-row'), poolEl = $id('card-pool'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastHearAt = 0;                             // 重听题面 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重演中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardAt = i => poolEl.querySelector('.tcard[data-i="' + i + '"]');
const slotAt = k => slotRowEl.querySelector('.slot[data-k="' + k + '"]');
/* 族副题（槽区语境提示——纯文字装饰，题面真值=目标名 clip+模板链） */
const subOf = kind => (kind === 'order' ? '按顺序点，一步一步来' : '点出三张小问题卡');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  $id('q-text').textContent = Q_TEXT;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：步进=双音上行（换步音——order 连选
   步进只播此音效不重播题面，SPEC §3）/ 点错=低柔单音 */
const chimeStep = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(523.25, 0.12, 0, 0.3); };

/* ================= 渲染 ================= */
/* 题面渲染（契约 M 渲染即引擎）：目标牌（图标+名+族副题）+槽区（pick=小问题
   清单 3 槽/order=步骤序列 1-5 号槽，已填槽=q.picked 推导——重放）+候选卡池
   5 张（已选卡 .gone 保持=进度双锚之一） */
function renderQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  goalIcEl.innerHTML = goalSvg(q.goal);
  goalNameEl.textContent = q.goalLabel;
  goalSubEl.textContent = subOf(q.kind);
  sceneEl.dataset.scene = q.row;                // 帧内容锚（verify 断言渲染即引擎；生成关=-1）
  slotRowEl.innerHTML = '';
  slotRowEl.dataset.n = q.answerList.length;    // pick=3 / order=5
  for (let k = 0; k < q.answerList.length; k++) {
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.k = k;                            // 槽序（pick 清单序/order 步序）
    const filled = k < q.picked.length;
    const lbl = q.cards.find(c => c.id === q.picked[k]);
    s.innerHTML = '<span class="sn">' + (q.kind === 'order' ? '第' + (k + 1) + '步' : '小问题' + (k + 1)) + '</span>' +
                  '<span class="sc">' + (filled && lbl ? lbl.label : '') + '</span>';
    if (filled) s.classList.add('filled');
    slotRowEl.appendChild(s);
  }
  poolEl.innerHTML = '';
  poolEl.dataset.kind = q.kind;                 // 帧内容锚（族）
  for (let i = 0; i < q.cards.length; i++) {
    const b = document.createElement('button');
    b.className = 'tcard pop';
    b.dataset.i = i;                            // 卡下标（点选语义）
    b.style.animationDelay = (i * 90) + 'ms';
    b.setAttribute('aria-label', q.cards[i].label);
    b.innerHTML = '<span class="dot"></span><span class="tx">' + q.cards[i].label + '</span>';
    if (q.picked.indexOf(q.cards[i].id) >= 0) { // 已选卡 .gone 保持（重放）
      b.classList.remove('pop');
      b.classList.add('gone');
    }
    poolEl.appendChild(b);
  }
  renderStep();
}
/* 点对增量：槽填（.filled+文字+pop-in——契约 M 演出层锚）+卡 .gone */
function fillSlot(k, q) {
  const s = slotAt(k);
  if (!s) return;
  const lbl = q.cards.find(c => c.id === q.picked[k]);
  s.classList.add('filled', 'pop-in');
  const sc = s.querySelector('.sc');
  if (sc && lbl) sc.textContent = lbl.label;
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

/* ================= 开题演出：渲染 → 题面链（目标名 clip+模板 clip）→ 开放点选
   演出锁=真时针 showUntil（tapCard 演出期返 null）================= */
/* 题面链（T46 阶段2：全 clip 双段链 brk_t_+brk_tmpl——零 keyless；窗 PRESENT_TTS
   5697 恒安全覆盖（2232+150+clip 2256+300=4938 ≤ 5697=旧 estMs 口径上限） */
function sayGoalChain(q) {
  KIDS.voice.queue(['brk_t_' + q.goal, 'brk_tmpl']);
}
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  const win = ENTER_MS + PRESENT_TTS;            // 400+5352=5752（N2 总窗口径：出场+clip max+段间+estMs+尾）
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;      // 真时钟演出锁（余量）
  sayGoalChain(q);                               /* 目标名+模板（queue 链 keyless 居尾） */
  replayAnim(goalBoardEl, 'in');                 /* 目标牌出场重演（弹入） */
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
/* 教学"帮"阶段指向：当前应点卡（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardAt(i));
}

/* ================= 点卡主路径（真实点击 / BRK.tapCard / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡池容器 bump / 已选卡轻摇 shake——家族 D）；
   演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行——pick 族
   「对选」=任一未选正确卡（correctIdx 只返首张，guard 判定须按 isGood 逐卡））========== */
async function uiTapCard(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(poolEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(poolEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) { sfx('pop'); replayAnim(poolEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* 已选卡=轻摇+拒绝（家族 D：豁免窗内外同路径——探索不罚，不计 miss 不响 wrong） */
  if (q.picked.indexOf(q.cards[i].id) >= 0) {
    sfx('pop');
    replayAnim(cardAt(i), 'shake');
    return false;
  }
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     正确卡放行（缓解吞输入急性子观察）；窗后二错照常计 miss（miss≥2 梯度可达）
     ——pick 族对错逐卡判（isGood），不比 correctIdx 单值 */
  const isGood = q.kind === 'order'
    ? q.cards[i].id === q.answerList[q.picked.length]
    : q.answerList.indexOf(q.cards[i].id) >= 0;
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && !isGood) {
    sfx('pop'); replayAnim(poolEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCard(cur, i);
  if (r === null) { sfx('pop'); replayAnim(poolEl, 'bump'); return null; }
  const el = cardAt(i);

  if (r === 'wrong') {                           /* 点错：干扰卡轻晃+错链单段+方向级+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + SHAKE_MS * SPEED + 140;   /* 1200 ≤ 3030（b37 R3：留豁免窗活跃段） */
    dodgeLo();
    if (el) el.classList.add('miss');            /* 错卡轻晃（不亮正确卡本体——排除法可玩） */
    if (sayW([VOICE.wrong.key]))                 /* 错链单段全 clip（wrong 即干扰反馈句，无第二段） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;        /* 链豁免：2880+150+300=3330 真时钟（契约 I） */
    if (q._miss === 1) replayAnim(poolEl, 'wig');            /* 方向级：卡池整体 wiggle 不指卡 */
    if (q._miss >= 2) {                                     /* miss≥2=当前应点卡 breathe（答案级梯度） */
      const ok = cardAt(correctIdx(q));
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(SHAKE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('miss');         /* 卡回可重点（探索不罚） */
    state.locked = false;
    return r;
  }

  /* ---- fill / done（点对：换步音+卡飞入槽；题完成加确认链单 clip） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次点对 → 放手 */
    state.tut = 'solo';
    window.__brkTutSolo = true;                  /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  const isDone = r === 'done';                   /* 题完成（pick 第 3 张/order 第 5 步） */
  const win = isDone ? (FILL_MS + CELE_WIN) : FILL_MS;
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;
  const k = q.picked.length - 1;                 /* 本步槽序（picked 已推进） */
  if (el) el.classList.remove('pop', 'breathe');
  if (el) el.classList.add('gone');              /* 渲染层：卡飞入槽（契约 M） */
  fillSlot(k, q);                                /* 槽填（.filled+文字+pop-in） */
  chimeStep();                                   /* 换步音（order 连选步进只播此音——SPEC §3） */
  sfx('coin');
  await wait(FILL_MS * SPEED);                   /* 卡飞入槽主窗 1000 */
  if (cur !== run || token !== showRun) return r;
  if (isDone) {
    KIDS.voice.queue([VOICE.right.key]);         /* 确认链：brk_right 单 clip（题完成） */
    await wait(CELE_WIN * SPEED);                /* 3036=2736+300 精确（家族 H） */
    if (cur !== run) return r;
  }
  state.locked = false;
  if (isDone) {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关
                                                   （watch 期由 tutorialWatch 接管，不进关） */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    if (cur.done) { winFlow(); return 'done'; }  /* 末题=通关 */
    presentQuiz();                               /* 新题开题（非末题） */
    return 'done';
  }
  return r;                                      /* 'fill'：题内步进，卡池保持继续点 */
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_brk） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
}
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章档 GEN[dch-1]
     （家族 F：genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  showRun++;                                     /* 通关中止在途演出 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* brk_right：拆得好，一步步完成（2736ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(500);                             /* 家族 H：celebrate 2620+500=3120 ≥ 2736+300=3036（brk right 长，libr 400 不够） */
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
                   !(sv.brk && sv.brk.tutSeen);  /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §3：教学末步='done'——首题
   整题完成）。watch=播 brk_tut_watch「看！大问题拆小问题」→ 开题（题面链）→
   幽灵手指逐张点完 3 张正确卡（第 1/2 张 await fill 演出，第 3 张 fire 不
   await——watch 预算压缩，__brkDemoR 异步置 'done'，gate/verify 轮询断言）
   → __brkDemoR='done'（教学末步=题整题完成）；turn=重立单题迷你关「你来拆一
   拆」（行 0 目标 birthday 同款），帮（ghost 指首张应点卡+TTS 读卡——降坡
   「TTS 读卡」落点）→首对独（solo）→点满 3 张 done→进正式关。时序（家族 G/H/T）：
   watch clip 3408 → 延 3708（≥3408+300）→ 开题 400+5697（planttree 目标 clip
   1872 最短：400+1872+150+3015+300=5737）→ 3×（ghost 移入 800+press 320+
   FILL 1000，第 3 张 fire 不等）—— watch 段分账 3708+5737+2×2120+1120=
   14805 ≤ 16000 ---------- turn clip 1776 → 延 2076（≥1776+300）→ presentQuiz
   6097（birthday 2232）→ 帮指+读卡（600 后，say 不锁输入） ---------- */
function tutWatchLevel() {                       // 单题迷你关（planttree pick——目标 clip 最短压预算；池手写定死，verify 单元②独立对账）
  return { flat: -1, ch: 0, dch: 0, lv: 0, kind: 'pick', goals: ['planttree'],
           step: 0, retries: 0, done: false,
           quizzes: [{ row: -1, kind: 'pick', goal: 'planttree', goalLabel: GOAL_LABEL.planttree,
             cards: [{ id: 'planttree_1', label: '挖一个小坑' },
                     { id: 'picnic_0',    label: '看看天气预报' },
                     { id: 'planttree_0', label: '挑一棵小树苗' },
                     { id: 'picnic_2',    label: '装好水壶' },
                     { id: 'planttree_2', label: '把树苗放进去' }],
             answerList: ['planttree_0', 'planttree_1', 'planttree_2'],
             picked: [], _miss: 0, _answered: false }] };
}
function tutTurnLevel() {                        // 单题迷你关（行 0 目标 birthday 同款——与正式关 flat0 题0 同目标）
  return { flat: -1, ch: 0, dch: 0, lv: 0, kind: 'pick', goals: ['birthday'],
           step: 0, retries: 0, done: false,
           quizzes: [{ row: -1, kind: 'pick', goal: 'birthday', goalLabel: GOAL_LABEL.birthday,
             cards: [{ id: 'birthday_1', label: '写邀请卡' },
                     { id: 'bedtime_1',  label: '刷牙洗脸' },
                     { id: 'birthday_0', label: '定个好日子' },
                     { id: 'bedtime_4',  label: '关灯睡觉' },
                     { id: 'birthday_2', label: '准备蛋糕' }],
             answerList: ['birthday_0', 'birthday_1', 'birthday_2'],
             picked: [], _miss: 0, _answered: false }] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* brk_tut_watch：看！大问题拆小问题（3408ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥3408+300=3708：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* 题面链+卡池出场（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  for (let d = 0; d < 3; d++) {                  /* 三张正确卡逐张演示（教学末步='done'——首题整题完成） */
    const idx = q.cards.findIndex(c => c.id === q.answerList[d]);
    if (idx < 0) break;
    pointGhostAt(cardAt(idx));                   /* 幽灵手指指向第 d 张正确卡 */
    await wait(800 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    if (d < 2) {
      await uiTapCard(idx, true);                /* demo 通道豁免演出锁（fill 演出 await） */
    } else {
      uiTapCard(idx, true).then(r2 => { window.__brkDemoR = r2; });   /* 第 3 张 fire 不等：demo 末步 'done' 异步实证 */
    }
  }
  window.__brkWatchMs = Date.now() - t0w;        /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.brk = sv.brk || {};
  sv.brk.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立单题迷你关「你来拆一拆」（帮→独），点满 3 张放手进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（fire 演出身份守卫自回收） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* brk_tut_turn：你来拆一拆（1776ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1776+300=2076 防尾截（turn 后开题演出延） */
  if (state.tut !== 'help') return;
  if (cur.flat < 0) await presentQuiz();         /* 题面链 → 开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) {
      pointHelpNext();                           /* 帮：ghost 指首张应点卡 */
      const qq = cur.quizzes[cur.step];
      const ci = correctIdx(qq);
      if (ci >= 0) KIDS.voice.play('brk_step_' + qq.cards[ci].id,   /* 帮阶段读卡 clip 化（T46：brk_step_<gid>_<i>——落空回退 TTS） */
                                 qq.cards[ci].label);
    }
  }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重播题面链（方向级救援/重听共用；教学迷你关禁重播） */
function sayGoalAgain() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || cur.flat < 0) return false;
  sayGoalChain(q);
  replayAnim(goalBoardEl, 'repop');
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：哪几步帮到任务 */
  replayAnim(poolEl, 'wig');
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重播 */
  if (Date.now() - lastHearAt < 3000) return;    /* 重听 3s 节流 */
  lastHearAt = Date.now();
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  sayGoalAgain();                                /* 重听题面链（题面真值同源） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  lastAct = Date.now();
  startLevel(cur.flat);                          /* 再玩一次=重开本关（同 flat 确定性同题） */
});
poolEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.tcard');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapCard(Number(p.dataset.i));                /* 点卡池第 i 张（tapCard 语义） */
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.tcard')) return;        // 卡点击已由 poolEl 处理
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（hint+卡池 wiggle，lastDir 独立
   节流锚，不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（当前应点卡
   breathe+重播题面）/ 教学"帮"5s 重演示 ================= */
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
      if (i >= 0) { const ok = cardAt(i); if (ok) replayAnim(ok, 'breathe'); }
      sayGoalAgain();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：hint+卡池 wiggle（不动 lastAct） */
    sayR(VOICE.hint.key, VOICE.hint.text);
    replayAnim(poolEl, 'wig');
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
  KIDS.init({ game: 'brk', title: '问题拆解小博士' });   // 存档键 kidsgame_brk（core VER 1.0，家族 C）
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
   真实页同暴露 window.BRK——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝：cards 5 张 {id,label} 拷贝；answer/answerList
   （pick=3 正确步 id 按步序/order=定序表 5 步 id——SPEC §3 钩子契约两字段同值）；
   picked=已选 id 数组；step=全关题号 0-4（b33 坑①：题号语义显式声明——
   flat*5 内的第几题，非全局题号）；miss=题级（order 跨步续算）；say=题面整句
   文本（目标名，模板——verify 对账锚）。
   tapCard 返回：点对步进 'fill' / 题完成 'done' / 点错 'wrong' /
   已选卡 false（shake 家族 D 不计 miss）/ 豁免窗内错点吞 false /
   开题演出期 null（真时钟锁）/ 越界·已答·无题 null。
   autoSolve：每步重读 quiz（order=answerList[picked.length] 当前步/
   pick=answerList 未选首张——禁缓存，b38 坑③连选驱动）；演出锁期 null →
   轮询等锁窗结束重试，非 break ================= */
window.BRK = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             kind: cur.kind, step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                             /* SPEC §3 钩子契约：'pick'|'order' */
             goal: q.goal,                             /* 目标 id */
             goalLabel: q.goalLabel,                   /* 目标中文名（与 brk_t_* clip 文案同源） */
             cards: q.cards.map(c => ({ id: c.id, label: c.label })),   /* 候选 5 张 {id,label} */
             answer: q.answerList.slice(),             /* pick=3 正确步 id/order=定序表（与 answerList 同值） */
             answerList: q.answerList.slice(),         /* pick=3 id 集/order=5 步序 */
             picked: q.picked.slice(),                 /* 已选 id 集（进度真值） */
             step: cur.step,                           /* 全关题号 0-4（b33 坑①语义） */
             miss: q._miss || 0,                       /* 题级 miss（order 跨步续算） */
             say: q.goalLabel + '，' + TMPL };         /* 题面整句文本（目标名，模板） */
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应点卡，走真实判定链；
    let taps = 0, guard = 0;             // 演出锁/开题演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 300) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];    /* 每步重读 quiz（禁缓存——连选驱动） */
      if (!q) break;
      const want = q.kind === 'order'
        ? q.answerList[q.picked.length]
        : q.answerList.find(id => q.picked.indexOf(id) < 0);
      const i = q.cards.findIndex(c => c.id === want);
      if (i < 0) break;
      const r = await uiTapCard(i);
      if (r === 'fill' || r === 'done') taps++;
      else if (guard >= 298) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
