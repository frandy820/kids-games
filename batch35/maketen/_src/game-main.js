/* ================= maketen 主逻辑（题面 → 点卡 → 收银/两级错反馈）
   题面静态即开（target 大字 + 伙伴卡 a + 卡池恒全摆，无开场演出锁）；
   点中补数（a+x=target）=收银：卡飞进店里（.gone）+钱币叮当（Web Audio
   coin）+货架 +1+确认链（T46 化 2026-09-19）[mt_right, mt_n_A, mt_s_add,
   mt_n_X, mt_s_eq, mt_n_T] 6 段全 clip 拼播（原 keyless TTS 全式尾段退役）
   演出窗 1600+8500=10100 ≥ 最坏链 10098（t20/a16 全域推导；家族 G/H）；
   教学演示窗 1600+8100=9700 ≥ demo 链（3+7=10）9642。
   点错=卡摇头+两级方向数感反馈：和>target=[mt_wrong_more, mt_hint]（5970）/
   和<target=[mt_wrong_less, mt_hint]（6018）——豁免窗取 max 6018 真时钟
   （契约 I：链起播设窗+救援让路+startLevel 重置；I 补豁免窗 guard 错点吞
   pop+bump 不计 miss/对选放行/窗后二错照计——预判口径 i!==q.answer 与
   core 判定 i===q.answer 严格同构，b34 坑①）。
   错反馈梯度：首错=方向级（错卡 wig+题面 target 重锚 pulse，不指正确卡）；
   miss≥2=正确卡 breathe（答案级）。
   救援：14s 方向级=target 重锚（lastDir 独立节流锚，不动 lastAct——契约 B）/
   30s 答案级=正确卡 breathe+hint；错链豁免窗让路（契约 I）。
   验收钩子：window.MT = { get currentLevel, get quiz{target,a,pool[],answer,step,miss},
   tapCard(i), start(flat), autoSolve() }——真实页同暴露（b29 坑⑥）。
   tapCard 返回：i=answer→'right'/末题 'done'；错→'wrong'（两级文案实现内分派，
   钩子恒 'wrong'）；豁免窗内错点吞 false；收银演出期 null（真时钟锁）；
   越界·已答·无题 null。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* T46 化（2026-09-19）：estMs TTS 估长退役（确认链全 clip 化，窗=静态常量按 clip
   实长全域推导——estMs 口径已无消费者，禁死代码留存） */
/* 确认链算式（契约 L，T46 后=verify 对账源）：NUMCN 1-20 全量读数，「+」读「加」
   「=」读「等于」——max 8 字「十八加二等于二十」；播报走 formulaParts clip 拼播 */
const formulaText = q => NUMCN[q.a] + '加' + NUMCN[q.target - q.a] + '等于' + NUMCN[q.target];
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat >= 0 && cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), poolEl = $id('pool'), shelfEl = $id('shelf'),
      buddyEl = $id('buddy-card'), buddyNumEl = $id('buddy-num'),
      targetBarEl = $id('target-bar'), targetNumEl = $id('target-num'),
      rabbitBtn = $id('btn-rabbit'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/收银中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const poolCardAt = i => poolEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  $id('buddy-face').innerHTML = ICONS.partner;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：收银=双音上行+金币叮当 /
   答错=低柔单音（不惊吓） */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染（题面静态：target 大字 / 伙伴卡 / 卡池恒全摆 / 货架） ================= */
function renderShelf() {                        // 货架：本关已完成题数=金币数（step 已推进）
  shelfEl.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const s = document.createElement('div');
    s.className = 'slot' + (k < cur.step ? ' fill' : '');
    shelfEl.appendChild(s);
  }
}
function fillShelfSlot() {                      // 收银即刻+1（不等换题渲染）
  const s = shelfEl.children[cur.step - 1];
  if (s) s.classList.add('fill');
}
function renderPool(q) {                        // 卡池恒全摆（4-5 张互异；契约 M 锚 data-i/.cv）
  poolEl.innerHTML = '';
  poolEl.dataset.n = q.pool.length;
  for (let k = 0; k < q.pool.length; k++) {
    const c = document.createElement('div');
    c.className = 'card';
    c.dataset.i = k;
    const cv = document.createElement('div');
    cv.className = 'cv';
    cv.textContent = q.pool[k].v;
    c.appendChild(cv);
    poolEl.appendChild(c);
  }
}
function renderStep() {                         // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                         // 章节点（1 基，生成关循环章画到当前章）
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
function renderQuiz() {                         // 题面整体（target/伙伴卡/卡池/货架/进度点）
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  targetNumEl.textContent = q.target;           // 题面顶部大字（契约 M 帧：恒===quiz.target）
  buddyNumEl.textContent = q.a;                 // 伙伴卡数值（契约 M 帧：恒===quiz.a）
  renderPool(q);
  renderShelf();
  renderStep();
}

/* 题面重锚（错反馈方向级/救援 14s 共用：target+伙伴卡 pulse，不指正确卡） */
function pulseTarget() {
  replayAnim(targetBarEl, 'pulse');
  replayAnim(buddyEl, 'pulse');
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
/* 教学"帮"阶段指向：当前题正确卡（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(poolCardAt(i));
}

/* ================= 点卡主路径（真实点击 / MT.tapCard / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡池容器 bump 微动效——家族 D）；
   收银演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行）========== */
async function uiTapCard(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(poolEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(poolEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.pool.length) { sfx('pop'); replayAnim(poolEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径（2026-09-12）：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     对选放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达）。
     预判 i!==q.answer 与 core engTapCard 判定 i===q.answer 严格同构（b34 坑①：miss 在
     core 判定层，防重入 guard 必须在判定前拦） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(poolEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCard(cur, i);
  if (r === null) { sfx('pop'); replayAnim(poolEl, 'bump'); return null; }
  const el = poolCardAt(i);

  if (r === 'wrong') {                           /* 点错：卡摇头+两级方向链+视觉梯度（1000ms 防重入窗） */
    state.locked = true;
    state.showUntil = Date.now() + WRONG_MS * SPEED + 140;
    dodgeLo();
    if (el) replayAnim(el, 'wig');
    const sum = q.a + q.pool[i].v;               /* 两级方向数感反馈按和值分派（SPEC §0.86） */
    const head = sum > q.target ? VOICE.wrongMore : VOICE.wrongLess;
    if (sayW([head.key, VOICE.hint.key]))        /* 错链=[more|less, hint] 全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;   /* 链豁免：max(5970,6018)=6018 真时钟（契约 I） */
    if (q._miss === 1) pulseTarget();            /* 方向级：题面 target 重锚（不指正确卡） */
    if (q._miss >= 2) {                          /* miss≥2=正确卡 breathe（答案级梯度） */
      const ok = poolCardAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(WRONG_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（收银：卡飞进店里+货架+1+确认链拼播） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__mtTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  const tailWin = demo ? TUT_CELE_TAIL : CELE_TAIL;   /* 教学演示窗 9700 ≥ 9642（demo 通道） */
  state.showUntil = Date.now() + (CELE_MAIN + tailWin) * SPEED + 140;   /* 10100 ≥ 10098（家族 G/H） */
  if (el) { el.classList.remove('breathe'); el.classList.add('gone'); }   /* 收银：卡飞进店里（契约 M 收银帧锚） */
  fillShelfSlot();                               /* 货架 +1（金币叮当） */
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key].concat(formulaParts(q)));   /* 确认链（T46 化）：right+算式 5 段 clip 拼播（契约 L；零 keyless） */
  await wait(CELE_MAIN * SPEED);                 /* 卡飞+货架收银主窗 */
  if (cur !== run) return r;
  await wait(tailWin * SPEED);                   /* 确认链收尾窗：10100 ≥ 10098（家族 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关（watch 期由
                                                   tutorialWatch 接管，不进关） */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  renderQuiz();                                  /* 新题题面（target/伙伴卡/卡池全换） */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_maketen） ================= */
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
  sayR(VOICE.right.key, VOICE.right.text);       /* mt_right：凑对啦，收银咯（2472ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2472+300=2772 */
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
  lastWrongVoice = 0; wrongChainUntil = 0;       /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.maketen && sv.maketen.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;                           /* 题面静态即开（无开场演出，直接可点） */
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §2：watch=3+7 收银/turn=2+□=10 池 3）
   watch=播 mt_tut_watch「看！两张卡凑一凑」→ 幽灵手指指向补数卡 7 →点中
   （target=10，3+7=10 收银演示，__mtDemoR='right'）；turn=重立 2+□=10 迷你关
   「你来凑一凑」池 3 张（9/8/7），帮（指向补数卡 8）→首对独（solo）→进正式关。
   时序（家族 G/H，T46 clip 口径）：watch clip 3264 → 延 3564（≥3264+300）→
   ghost 移入 800+press 320 → demo 演出窗 1600+8100=9700（罩确认链 demo 链
   2472+150×5+1224+1152+1176+1320+1248+300=9642）→ turn clip 1776 → 延 2076
   （≥1776+300）→ 题面开放点选——watch 段分账 3564+800+320+9700=14384 ≤ 16000 ---------- */
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 点中返回 'right'）
  const mk = (a, vs) => {
    const pool = vs.map(v => ({ v: v }));
    return { kind: 'ten', target: 10, a: a, pool: pool,
             answer: deriveAnswer(a, 10, vs), _miss: 0, _answered: false };
  };
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mk(3, [6, 7, 8]), mk(4, [5, 6, 7])] };   // 题 0=3+7 演示锚
}
function tutTurnLevel() {                        // 单题迷你关：2+□=10 池 3 张（末题=点中 'done'→帮转独）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [{ kind: 'ten', target: 10, a: 2, pool: [{ v: 9 }, { v: 8 }, { v: 7 }],
                       answer: 1, _miss: 0, _answered: false }] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* mt_tut_watch：看！两张卡凑一凑（3264ms） */
  await wait(TUT_WATCH_WIN * SPEED);             /* ≥3264+300=3564：clip 播完再演示（不撞头） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);                     /* 演示题（3+7）补数下标 */
  pointGhostAt(poolCardAt(idx));                 /* 幽灵手指指向补数卡 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapCard(idx, true);      /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__mtDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  window.__mtWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.maketen = sv.maketen || {};
  sv.maketen.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 2+□=10 迷你关「你来凑一凑」（帮→独），首对放手进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 right 的换题渲染已过演出窗） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* mt_tut_turn：你来凑一凑（1776ms） */
  await wait(TUT_TURN_WIN * SPEED);              /* ≥1776+300=2076 防尾截（turn 后开放点选） */
  if (cur.flat < 0) state.locked = false;        /* 题面静态即开（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
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
  pulseTarget();                                 /* 戳兔子=方向提示：题面重锚+「想一想，还差几」 */
  sayR(VOICE.hint.key, VOICE.hint.text);
});
poolEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapCard(Number(p.dataset.i));                /* 点卡池第 i 张（pool 数组下标语义） */
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card')) return;         // 卡点击已由 poolEl 处理
  /* 空白/探索点击（含题面/柜台非卡区）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（题面 target 重锚，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe+hint）/
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
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = poolCardAt(i); if (ok) replayAnim(ok, 'breathe'); }
      sayR(VOICE.hint.key, VOICE.hint.text);
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：题面重锚（不动 lastAct） */
    pulseTarget();
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
  KIDS.init({ game: 'maketen', title: '凑十小铺' });   // 存档键 kidsgame_maketen（core VER 1.0，家族 C）
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
   真实页同暴露 window.MT——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（含 target/a/pool/answer 真值——verify 从 a+pool
   独立复算 answer=唯一满足 a+v=target 的 i=对账锚）；step=全关题号 0-4
   （b33 坑①：题号语义，非卡进度）。
   tapCard 返回：i=answer→'right'/末题 'done'；错→'wrong'（两级方向文案由实现
   按 a+pool[i].v 与 target 大小分派——mt_wrong_more/mt_wrong_less，钩子不区分）；
   豁免窗内错点吞 false / 收银演出期 null（真时钟锁）/ 越界 null ================= */
window.MT = {
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
    return { kind: q.kind,                             /* SPEC §2 钩子契约：'ten' 恒 */
             target: q.target,                         /* 本凑目标 10|15|20 */
             a: q.a,                                   /* 伙伴卡数 */
             pool: q.pool.map(c => ({ v: c.v })),      /* 卡池 {v} 互异恒全摆 4-5 张（拷贝） */
             answer: q.answer,                         /* 池中补数下标（唯一 a+v=target） */
             step: cur.step,                           /* 全关题号 0-4（b33 坑①） */
             miss: q._miss || 0 };
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点补数卡，走真实判定链；
    let taps = 0, guard = 0;             // 演出期 null → 轮询等锁窗结束重试，非 break）
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
