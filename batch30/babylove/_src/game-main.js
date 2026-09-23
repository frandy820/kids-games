/* ================= babylove 主逻辑（r10 四题型多步：题面渲染 / 点选判定 / 教学 / 救援 / 推进）
   玩法（每题=3 步/小问）：题面=大图（配对=出示动物 / grow=链成体 / habitat=生境场景）
   +名音与题面句拼播（开题链=clip+clip 全 clip 无 keyless——契约 N 天然安全）；下方候选图卡。
   findmom（幼体名音+q1「它的妈妈是谁呀」→点成体卡）/ findbaby（成体+q2→点幼体卡，ch2+）
   / grow（成体+q3「它小时候是什么样呀」→卵→幼→成逐点点选，已点卡 done 淡化）
   / habitat（bab_h_<hab>+q4_mom/baby 拼句→4 候选 2×2 双维合取）。
   点对非题尾步='step'：短确认（配对=名音+SUB_WIN 2400 锁窗 / habitat=q4+HAB_SUB_WIN 2600
   锁窗 / grow=[名音,grow_next] fire-and-forget 不锁——storybed 逐点先例豁免契约 G）；
   题尾步=bab_right+名音拼播（确认链 1600+3200=4800 罩 right 2280+150+名音 max 1848+300=4578）。
   点错=卡摇头+bab_wrong+语义句 clip（T46 阶段2 键段 bab_again_*；AGAIN_OF 按题型）+大图再 pulse
   方向级回锚，1000ms 防重入窗后可重选（探索不罚）。
   救援：14s 方向级=重读题面+大图 pulse（lastDir 独立节流锚）；30s 答案级=正确卡
   breathe+重读题面；错反馈链豁免窗 6600 让路（契约 I）。
   验收钩子：window.BL = { get currentLevel, get quiz(){kind, ask, want?, opts[]{anim},
   answer, step, substep, miss}, tapOpt(i), start(flat), async autoSolve(), get tutorial }
   （getter 返回拷贝；tapOpt 返回 'step'/'right'/'done'/'wrong'/null——r10 契约） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* r10 时长窗（实测口径 2026-09-14；build 静态断言+verify modeled 对账依据）：
   SUB_WIN 2400 罩名音 max 1848+300=2148（配对小问切换锁窗）
   HAB_SUB_WIN 2600 罩 q4 max 2136+300=2436（habitat 小问切换锁窗）
   GROW_STEP_WIN 2200 grow 步动画窗（链 fire-and-forget：名音+150+grow_next 1488+300=3786 续播不锁）
   关 modeled 下界：配对=5×(2×2400+4800)=48000ms / grow=5×(2×2200+4800)=46000
   / habitat=5×(2×2600+4800)=50000——全章 ≥40s（审计 #28 实测 22s 根治） */
const SUB_WIN = 2400, HAB_SUB_WIN = 2600, GROW_STEP_WIN = 2200;
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
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
const view = () => quizView(cur);               // 当前步视图（引擎 quizView——UI/钩子/救援共用）

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

/* ================= 题面语音（开题链=名音+题面句拼播，clip+clip 无 keyless——契约 N 安全；
   家族 G 链后窗按 r10 实长：max 名音 1848+150+q1 2232=4230（读题异步不占 UI 等待窗）
   grow 开题链=bab_n_<成体>+150+bab_q3 2520=4518；habitat=bab_h_<hab> max 2016+150+
   bab_q4 max 2136=4302（均异步） ================= */
function speakQuiz() {
  const v = view();
  if (!v) return;
  if (v.kind === 'findmom') KIDS.voice.queue([nameClip(v.ask), VOICE.q1.key]);
  else if (v.kind === 'findbaby') KIDS.voice.queue([nameClip(v.ask), VOICE.q2.key]);
  else if (v.kind === 'grow') KIDS.voice.queue([nameClip(v.ask), VOICE.q3.key]);
  else KIDS.voice.queue([VOICE[HAB_CLIP[v.ask]].key, v.want === 'mom' ? VOICE.q4Mom.key : VOICE.q4Baby.key]);
}
/* 重听路径（hear/题面共用）：重播开题链+大图再 pulse（方向级回锚） */
function replayQuiz(withPulse) {
  if (!view()) return;
  speakQuiz();
  if (withPulse) pulseAsk();
}
/* 方向级回锚：题面大图再 pulse（错反馈/重听/救援共用） */
function pulseAsk() {
  if (sceneEl) replayAnim(sceneEl, 'pulse');
}

/* ================= 渲染 ================= */
const Q_TEXT = {
  findmom: VOICE.q1.text,
  findbaby: VOICE.q2.text,
  grow: VOICE.q3.text,
  habitat: function (v) { return '住在' + HAB_NAME[v.ask] + '的，' + (v.want === 'mom' ? VOICE.q4Mom.text : VOICE.q4Baby.text); }
};
function renderScene(v) {                        // 题面：软垫 + 大图 + 题面句 + 题内 3 小步点
  sceneEl.dataset.kind = v.kind;
  sceneEl.dataset.ask = v.ask;                   // 帧内容锚（契约 M：verify 断言）
  const big = v.kind === 'habitat' ? habSvg(v.ask, 150) : animSvg(v.ask, 150);
  const aria = v.kind === 'habitat' ? (HAB_NAME[v.ask] + '，点我再听一遍')
    : (nameOf(v.ask) + '，点我再听一遍');
  sceneEl.setAttribute('aria-label', aria);
  let tray = '';                                 // grow：已排阶段缩略槽（卵→?→?）
  if (v.kind === 'grow') {
    const q = cur.quizzes[cur.step];
    tray = '<div class="grow-tray" aria-hidden="true">';
    for (let s = 0; s < 3; s++) {
      const st = GROWTH[q.ask][s];
      tray += '<span class="gt-slot' + (s < q.phase ? ' got' : '') + '">' +
        (s < q.phase ? animSvg(st, 44) : '<i class="gt-num">' + (s + 1) + '</i>') + '</span>' +
        (s < 2 ? '<span class="gt-arrow">→</span>' : '');
    }
    tray += '</div>';
  }
  const dots = '<div class="sub-dots" aria-hidden="true">' +
    [0, 1, 2].map(s => '<i class="' + (s < v.substep ? 'done' : s === v.substep ? 'cur' : '') + '"></i>').join('') +
    '</div>';
  sceneEl.innerHTML = '<div class="ask-slot"><div class="ask-shadow" aria-hidden="true"></div>' +
    big + '</div>' + tray +
    '<div class="q-text">' + (v.kind === 'habitat' ? Q_TEXT.habitat(v) : Q_TEXT[v.kind]) + '</div>' + dots;
}
function renderBoard(v) {                        // 候选图卡排（SVG 零文字；grow 已点卡 done 淡化）
  boardEl.innerHTML = '';
  v.opts.forEach((o, i) => {
    const q = cur.quizzes[cur.step];
    const done = v.kind === 'grow' && q && GROWTH[q.ask].indexOf(o.anim) >= 0 && GROWTH[q.ask].indexOf(o.anim) < q.phase;
    const b = document.createElement('button');
    b.className = 'card pop' + (done ? ' done' : '');
    b.dataset.i = i;
    b.dataset.anim = o.anim;                     // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', nameOf(o.anim) + '图卡');
    b.innerHTML = animSvg(o.anim, 104);
    b.style.animationDelay = (i * 70) + 'ms';
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const v = view();
  if (!v) return;
  renderScene(v);
  renderBoard(v);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 开题读题（教学演示期静默）
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
  for (let c = 1; c <= Math.max(5, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 答对演出：大图跳 + 小兔子滑入示范（确认句拼播由 uiTapOpt 播）
   verify 页跳过装饰直接落定 ================= */
function celebrateScene(run) {
  const slot = sceneEl.querySelector('.ask-slot');
  if (slot) replayAnim(slot, 'jump');
  if (!sceneEl.querySelector('.demo-pet')) {
    const pet = document.createElement('div');
    pet.className = 'demo-pet';
    pet.innerHTML = KIDS.assets.rabbit('happy', 54);   /* 小兔子开心示范 */
    sceneEl.appendChild(pet);
    requestAnimationFrame(() => pet.classList.add('show'));
  }
  hopRabbit();
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
/* 教学"帮"阶段指向：当前步正确卡 */
function pointHelpNext() {
  const v = view();
  if (!v) return;
  const i = correctIdx(v);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / BL.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错防重入窗/判对演出窗共用 locked 门；错点 1000ms 防重入窗（b16 定案）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const v0 = view();
  if (!v0) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+bab_wrong+语义句（keyless 恒链尾）+大图 pulse */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const parts = [VOICE.wrong.key,              /* bab_wrong 1656 在前 */
      AGAIN_OF[v0.kind]];                        /* 语义句 clip 键段（T46 阶段2；text=TTS 兜底；四题型） */
    if (sayW(parts))
      wrongChainUntil = Date.now() + 6600;      /* 链豁免：1656+150+2904(bab_again_mom 实长)+300=5010（契约 I） */
    pulseAsk();                                  /* 方向级：大图再 pulse（看清楚再想） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- step（步/小问完成非题尾——r10 新分支） ---- */
  if (r === 'step') {
    lastAct = Date.now();                        /* 正确选择重置救援钟（§0.7a） */
    const nk = v0.kind;
    if (nk === 'grow') {                         /* 逐点 fire-and-forget（storybed 先例豁免契约 G）：
                                                     卡 done 淡化+槽填充+链续播，不锁输入（抢点正常节奏） */
      if (el) { el.classList.add('done', 'lit'); setTimeout(() => { if (el) el.classList.remove('lit'); }, 700 * SPEED); }
      chimeGoal();
      sfx('coin');
      KIDS.voice.queue([nameClip(v0.opts[i].anim), VOICE.growNext.key]);   /* 步链：阶段名音+然后呢 */
      const v1 = view();
      if (v1) renderScene(v1);                   // 刷 grow-tray 槽（卡排不动防动画重播）
      return r;
    }
    state.locked = true;                         /* 配对/habitat 小问切换锁窗（听新小问读题） */
    if (el) { el.classList.add('lit'); setTimeout(() => { if (el) el.classList.remove('lit'); }, 700 * SPEED); }
    chimeGoal();
    sfx('coin');
    const v1 = view();
    if (nk === 'habitat') KIDS.voice.queue([v1.want === 'mom' ? VOICE.q4Mom.key : VOICE.q4Baby.key]);
    else KIDS.voice.queue([nameClip(v1.ask)]);   /* 新小问动物名音（2400 窗罩 max 1848+300） */
    await wait((nk === 'habitat' ? HAB_SUB_WIN : SUB_WIN) * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (v1) { renderScene(v1); renderBoard(v1); renderStep(); }   // 新小问（大图/卡全换）
    return r;
  }

  /* ---- right·done（本题完成：大图跳+兔子示范+确认句拼播） ---- */
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
  if (cur === run) celebrateScene(run);          /* 大图跳 + 小兔子滑入示范 */
  const hitAnim = v0.opts[i].anim;               /* 点中动物/阶段名音（grow 末步=成体名） */
  KIDS.voice.queue([VOICE.right.key, nameClip(hitAnim)]);   /* 确认链：找对啦真棒+点中名音（全 clip 无 keyless） */
  await wait(1600 * SPEED);                      /* 大图跳+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait(3200 * SPEED);                      /* 确认链收尾窗：总 4800 ≥ 2280+150+1848+300=4578（家族 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（大图/卡全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<5）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%5） */
  return ci < 5 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* bab_right：找对啦，真棒（2280ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2280+300=2580 */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.babylove && sv.babylove.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=播 bab_tut_watch「看！帮宝宝找妈妈」→ 播蝌蚪名音+题面句（开题链）→ 幽灵手指点
   青蛙图卡 →点中（'step'——题内第 1 小问完成）→帮=指向正确卡；独=首次选对放手（watch 全程 ≤16s）
   时序（家族 G/H）：watch clip 3072ms → 开题链演示延至 t=3400（≥3072+300，禁与名音撞头）；
   开题链 bab_n_tadpole 1368+150+bab_q1 2232=3750，ghost 移入窗 4100 ≥ 3750+300；
   演出窗 1600+3200=4800 罩 step 窗 2400（演示走 step 分支：SUB_WIN 2400——demo tap 后
   step 分支的切换窗即收尾，链由窗罩满） ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* bab_tut_watch：看！帮宝宝找妈妈（3072ms） */
  const run = cur;
  await wait(3400 * SPEED);                      /* t=3400 ≥ 3072+300=3372：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const v0 = view();                             // flat0 题0 第 1 小问恒 findmom/tadpole（教学演示锚）
  KIDS.voice.queue([nameClip(v0.ask), VOICE.q1.key]);   /* 播开题链：小蝌蚪+它的妈妈是谁呀（3750ms） */
  const idx = correctIdx(v0);
  pointGhostAt(cardEl(idx));                     /* 幽灵手指指向青蛙图卡 */
  await wait(4100 * SPEED);                      /* ≥3750+300=4050：开题链播完+ghost 移入停顿 */
  if (cur !== run) return;
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__blDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'step'——r10 步语义） */
  await wait(300 * SPEED);                       /* 收尾（step 切换窗由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.babylove = sv.babylove || {};
  sv.babylove.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来点一点"在重发后的题面上说（照 batch5-29） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* bab_tut_turn：你来点一点（1824ms） */
  setTimeout(() => {
    if (state.tut === 'help' && view()) speakQuiz();
  }, 2150);                                      /* ≥1824+300=2124 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再看看想一想 */
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
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  replayQuiz(false);                             /* 再听一遍：名音+题面句重播 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'pulse');
  replayQuiz(true);                              /* 附大图再 pulse（方向级回锚） */
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
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+大图 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe）/ 教学"帮"5s 重演示 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const v = view();
    if (v) {
      const i = correctIdx(v);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+大图 pulse（不动 lastAct） */
    speakQuiz();
    pulseAsk();
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
  KIDS.init({ game: 'babylove', title: '动物宝宝找妈妈' });   // 存档键 kidsgame_babylove（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.BL = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    const v = view();
    if (!v) return null;
    const out = { kind: v.kind,                           /* SPEC §1 钩子契约：findmom|findbaby|grow|habitat */
                  ask: v.ask,                             /* findmom=幼体/findbaby=成体/grow=链 id/habitat=生境 id */
                  opts: v.opts.map(o => ({ anim: o.anim })), /* 图卡 {anim}（封闭 30 之一） */
                  answer: v.answer,                       /* 当前步正确卡下标 */
                  step: v.step,
                  substep: v.substep,                     /* 题内步序 0-2（r10） */
                  miss: v.miss };
    if (v.kind === 'habitat') out.want = v.want;          /* 双维之一：'mom'|'baby' */
    return out;
  },
  tapOpt(i) { return uiTapOpt(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐步点应选卡，走真实判定链；
    let taps = 0, guard = 0;             // 演出窗内 tap=false → 等窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 240) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const v = view();
      if (!v) break;
      const r = await uiTapOpt(v.answer);
      if (r === 'step' || r === 'right' || r === 'done') taps++;
      else if (r === 'wrong') { /* 继续重试点对（不会发生：直点 answer） */ }
      else if (guard >= 238) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
