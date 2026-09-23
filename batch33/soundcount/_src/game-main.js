/* ================= soundcount 主逻辑（击段播放+视锚/纯听 / 数字卡点选判定 / 教学 / 救援 / 推进）
   玩法：开题=播击段（ch1-3 鼓图逐击 bounce 视锚同步——5-6 岁降坡核心；countmix 鼓 N+铃 M
   混排，铃=干扰音色只响不 bounce——视锚同选择性；**r24 dch4 纯听**：撤逐击视锚（鼓不
   bounce），播放期挂「用耳朵数」耳徽标——零逐击信息，听觉计数必经通道）→ 问句
   （counthear=sc_q1「敲了几下呀」/countmix=sc_q2「鼓敲了几下」/countdual 第一步=sc_q2
   第二步=sc_q3「铃铛响了几下」）→ 数字卡点选（数字大字+对应点数圆点；6-10 双行五点阵）。
   r24 countdual 两步：第一步（鼓）对='half' 卡亮+确认链后转问铃（不重播不推进）；
   第二步（铃）对=right/done 推进（确认链名音=铃数 sc_n_<mix>）。
   点对=卡亮+sc_right+数字名音拼播（确认链=[sc_right, sc_n_<N>]——全 clip 无 keyless，
   契约 N 天然安全；r24 名音=末步真值：countdual 第二步用铃数；大域名音 sc_n_6-10
   注册前静默 SPEC-R24 §R6）；点错首错=错链 [sc_wrong, sc_hint]
   （豁免窗 3930=1656+150+1824+300）+自动重播一遍击段+数字卡排 bump（方向级）；
   miss≥2=正确数字卡 breathe（答案级；countdual 按 phase 取当前步真值卡）。
   重听=整段重播（题面后可点，3s 节流；dch4 恒纯听）；救援：14s 方向级=纯听自动重播
   （lastDir 独立节流锚）/30s 答案级=正确卡 breathe+重播（r24 纯听关例外带视锚——
   方向级不给/答案级可给分层）；错反馈链豁免窗 3930 让路（契约 I）。
   验收钩子：window.SC = { get currentLevel, get quiz{kind,count,mix,seq,opts,answer,phase,
   step,miss}, tapOpt(i), start(flat), autoSolve(), replay() }——真实页同暴露（b29 坑⑥）；
   r24 verify 专用驱动 _forceIdle/_rescueCore（VERIFY 页守卫，真实页不可达）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径；家族 T 契约锚——r24③ 后 ears 唯一调用点已改实长常量窗，定义保留防家族断言漂移）
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat >= 0 && cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重听 3s 节流锚（SPEC §0.79）
let helpRedemo = false;
let playRun = 0;                                // 击段播放令牌（重开关卡/新题/重播中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');
/* r24 纯听判定：dch4 起（含生成关 dch4 腿）击段撤逐击视锚（教学迷你关 flat<0 与
   flat0-14 恒 false——教学/基线零改动） */
const pureOf = L => !!L && L.dch === 4;

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：答对=双音上行 / 答错=低柔单音
   鼓击=低频短音 146.83 / 铃击=清脆高音 1244.51（音色差=选择性计数可辨） */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const drumNote = () => { if (!VERIFY) KIDS.audio.note(146.83, 0.35, 0, 0.95); };
const bellNote = () => { if (!VERIFY) KIDS.audio.note(1244.51, 0.5, 0, 0.6); };

/* ================= 击段播放器（听觉序列——simon 节拍参照）
   ch1-3：鼓图逐击 bounce 视锚同步（降坡核心）；铃击只响不 bounce。
   r24 dch4 纯听：鼓击不 bounce（drumHit(false)），播放期 scene 挂 .listening
   （「用耳朵数」耳徽标——仅标志播放窗口，零逐击信息）；anchored=true 仅 30s 答案级
   救援在纯听关传入（视锚例外回归一次——方向级不给/答案级可给分层）。
   __scBounceN=本次播放鼓击计数（播放器写，verify 与 DOM animationstart 双向对账——
   契约 M；纯听下仍逐击累加=击序对账锚不随视锚撤） */
function drumHit(anchor) {
  if (anchor) { const el = $id('drum-wrap'); if (el) replayAnim(el, 'bounce'); }
  window.__scBounceN = (window.__scBounceN || 0) + 1;
  drumNote();
}
async function playBeats(q, anchored) {
  const token = ++playRun, run = cur;
  window.__scBounceN = 0;
  const pure = pureOf(cur) && !anchored;         /* r24 纯听（dch4 且非答案级带锚重播） */
  if (pure) sceneEl.classList.add('listening');
  if (!VERIFY) KIDS.audio.unlock();              /* 首次自动播放前解锁音频上下文 */
  try {
    for (let k = 0; k < q.seq.length; k++) {
      if (token !== playRun || cur !== run || state.won) return false;
      if (q.seq[k] === 'd') drumHit(!pure);      /* 鼓击：纯听关只计数+发声不 bounce */
      else bellNote();                           /* 铃击：只响（视锚同选择性） */
      await wait(HIT_GAP * SPEED);               /* 段间 700ms 可数节奏 */
    }
  } finally { sceneEl.classList.remove('listening'); }
  return token === playRun && cur === run && !state.won;
}
/* 问句（counthear=sc_q1 / countmix=sc_q2 / countdual 第一步=sc_q2 第二步=sc_q3 r24）；
   q3 窗 2600 ≥ 6 字×家族最长字率(q2 1848/5=369.6)+300=2518（注册后实长复测替换） */
const askText = q => q.kind === 'counthear' ? VOICE.q1
  : (q.kind === 'countdual' && q.phase === 1) ? VOICE.q3 : VOICE.q2;
const askWin = q => (q.kind === 'countdual' && q.phase === 1) ? 2600 : 2148;
const askVoice = q => sayR(askText(q).key, askText(q).text);

/* ================= r24 纯听模式首次预告（每存档一次 sv.soundcount.earsSeen；verify 页
   不写档每次触发）：dch4 首次击段前播 sc_ears，等实长+300 余量窗 3192+300=3492
   （_clipdur33 实测回填，宁等勿叠防语音压掉头几击——r24 审查 m4 收紧：原 estMs
   全字符口径 4395 每存档首次超等 ~1.2s） ================= */
async function maybeEarsIntro() {
  const sv = KIDS._save();
  if (sv && sv.soundcount && sv.soundcount.earsSeen) return;
  sayR(VOICE.ears.key, VOICE.ears.text);         /* sc_ears：这次呀，用小耳朵数一数（注册前静默） */
  await wait((3192 + 300) * SPEED);
  const s2 = KIDS._save() || {};
  s2.soundcount = s2.soundcount || {};
  s2.soundcount.earsSeen = true;
  if (KIDS._save()) KIDS.store.persist();
}

/* ================= 开题呈现：渲染题面 → (纯听预告) → 击段 → 问句 → 开放点选
   （含击后 300 余量+问句窗 askWin 2148/2600——r24 dual 第二步 q3 窗）
   答对推进/重开关卡共用（渲染在此——advance 路径不复漏换题面） ================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();                                 // 场景+数字卡+进度点（新题面）
  const run = cur;
  state.locked = true;
  if (pureOf(cur)) await maybeEarsIntro();       /* r24 dch4 纯听预告（每存档一次） */
  if (cur !== run) return;
  const ok = await playBeats(q);
  const token = playRun;
  if (!ok || cur !== run || token !== playRun) return;   // 中断（换关/新播放接管）——接管方负责锁
  await wait(300 * SPEED);
  if (cur !== run || token !== playRun) return;
  askVoice(q);
  await wait(askWin(q) * SPEED);                 /* ≥ max(q1 1752,q2 1848)+300=2148；q3 窗 2600（家族 H） */
  if (cur !== run || token !== playRun) return;
  state.locked = false;
  lastAct = Date.now();                          /* 问句播完开放点选（b25 M4：读题完成重置 idle 锚） */
  lastDir = Date.now();
}
/* ================= 重听：整段重播（user=true 走 3s 节流；救援/首错自动重播 false；
   r24 anchored=true=30s 答案级救援在纯听关的带视锚重播；
   keepIdle=true=重播完成不刷 lastAct（审查M1 r24：方向级救援重播走共享路径曾隐式
   刷新 idle 锚→30s 答案级每 14s 被清零永不可达，r23 P1-1 同型——仅方向级传 true；
   用户主动重听/首错自动重播/答案级重播保留刷新，b25 M4 语义不变） ================= */
async function doReplay(user, anchored, keepIdle) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || state.won) return false;
  if (user) {
    if (Date.now() - lastReplayAt < 3000) return false;   // 3s 节流（SPEC §0.79）
    lastReplayAt = Date.now();
    sayR(VOICE.replay.key, VOICE.replay.text);   /* sc_replay：再听一遍（与击段叠播不撞） */
  }
  const run = cur;
  state.locked = true;
  const ok = await playBeats(q, anchored);
  const token = playRun;
  if (!ok || cur !== run || token !== playRun) return false;
  await wait(300 * SPEED);
  if (cur !== run || token !== playRun) return false;
  askVoice(q);
  await wait(askWin(q) * SPEED);
  if (cur !== run || token !== playRun) return false;
  state.locked = false;
  if (!keepIdle) lastAct = Date.now();
  return true;
}

/* ================= 渲染 ================= */
function renderScene(q) {                        // 题面：暖色舞台垫+铃身份图（countmix/countdual）+鼓大图+问句条
  sceneEl.dataset.kind = q.kind;                 // 帧内容锚（契约 M：verify 断言）
  if (q.kind === 'countdual') sceneEl.dataset.phase = q.phase || 0;   // r24 双步：0 问鼓/1 问铃（谁满亮）
  else sceneEl.removeAttribute('data-phase');
  const ask = askText(q);
  sceneEl.setAttribute('aria-label', ask.text + '，点我再听一遍');
  sceneEl.innerHTML = '<div class="stage-props">' +
    '<div id="bell-wrap">' + bellSvg(86) + '<div class="bell-shadow" aria-hidden="true"></div></div>' +
    '<div id="drum-wrap">' + drumSvg(150) + '<div class="drum-shadow" aria-hidden="true"></div></div>' +
    '</div>' +
    '<div class="listen-badge" aria-hidden="true">' + ICONS.hear + '<span>用耳朵数</span></div>' +
    '<div class="q-text">' + ask.text + '</div>';
}
function renderBoard(q) {                        // 数字卡排（数字大字+圆点；ch1 2/ch2 3 卡居中）
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.num = o.num;                       // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', '数字' + o.num + '卡');
    b.innerHTML = numSvg(o.num, 104);
    b.style.animationDelay = (i * 70) + 'ms';
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
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

/* ================= 答对演出：鼓图跳 + 小兔子滑入示范（确认句拼播由 uiTapOpt 播）
   verify 页跳过装饰直接落定 ================= */
function celebrateScene() {
  const dw = $id('drum-wrap');
  if (dw) replayAnim(dw, 'bounce');
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
/* 教学"帮"阶段指向：当前题正确数字卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / SC.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（数字卡排容器 bump 微动效——家族 D）；
   错防重入窗/判对演出窗共用 locked 门；首错链后自动重播（方向级核心）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  /* b31 家族 I 补口径（2026-09-11）：错链豁免窗（真时钟）内错点吞——locked 窗 verify 页乘 SPEED
     缩水防 40ms 漏点；对选放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达）。
     r24：对选=当前步真值卡（correctIdx phase 感知——dual 第二步真值是铃卡非静态 q.answer） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== correctIdx(q)) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump
  playRun++;                                     /* 判定后中止在途播放尾音（重播尾段/救援重播） */
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+错链两段（wrong clip→hint clip）
                                                    +首错自动重播+卡排 bump / miss≥2 正确卡 breathe */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))                       /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + 3930;      /* 链豁免：wrong 1656+150+hint 1824+300=3930（契约 I） */
    if (q._miss === 1) replayAnim(boardEl, 'bump');   /* 方向级：数字卡排 bump（§0.79） */
    if (q._miss >= 2) {                          /* miss≥2=正确卡 breathe（答案级，家族梯度；
                                                    r24 dual 按 phase 取当前步真值卡） */
      const ok = cardEl(correctIdx(q));
      if (ok) replayAnim(ok, 'breathe');
    }
    if (q._miss === 1) {                         /* 首错：错链播完自动重播一遍击段（方向级核心） */
      await wait(3630 * SPEED);                  /* 错链主窗 wrong 1656+150+hint 1824=3630 */
      if (cur !== run) return r;
      await doReplay(false);
      if (cur !== run) return r;
      state.locked = false;
    } else {
      await wait(1000 * SPEED);                  /* 错点防重入窗 1000ms（对选可打断链） */
      if (cur !== run) return r;
      state.locked = false;
    }
    return r;
  }

  /* ---- half（r24 countdual 第一步·鼓 对：确认链后转问铃——不重播不推进） ---- */
  if (r === 'half') {
    state.locked = true;
    if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
    chimeGoal();
    sfx('coin');
    KIDS.voice.queue([VOICE.right.key, nameClip(q.count)]);   /* 第一步名音=鼓数 */
    await wait(1600 * SPEED);                      /* 卡亮+确认链主窗（家族 G/H 同款） */
    if (cur !== run) return r;
    await wait(3000 * SPEED);                      /* 确认链收尾窗：总 4600 ≥ 4170 */
    if (cur !== run) return r;
    renderScene(q);                                /* q-text/data-phase 切第二步（数字卡不动） */
    askVoice(q);                                   /* sc_q3：铃铛响了几下（窗 2600） */
    await wait(askWin(q) * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    lastAct = Date.now();                          /* 第二步开放点选重置 idle 锚 */
    lastDir = Date.now();
    return r;
  }

  /* ---- right·done（本题完成：鼓跳+兔子示范+确认句拼播） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__scTutSolo = true;                   /* 帮→独实证（verify ⑦ 断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateScene(run);          /* 鼓图跳 + 小兔子滑入示范 */
  const nameN = q.kind === 'countdual' ? q.mix : q.count;   /* r24 末步名音=真值：dual 第二步=铃数 */
  KIDS.voice.queue([VOICE.right.key, nameClip(nameN)]);   /* 确认链：数对啦真棒+数字名音（全 clip 无 keyless） */
  await wait(1600 * SPEED);                      /* 鼓跳+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait(3000 * SPEED);                      /* 确认链收尾窗：总 4600 ≥ 2304+150+1416+300=4170（家族 G/H） */
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
  presentQuiz();                                 /* 新题开题（击段+问句） */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
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
  playRun++;                                     /* 通关中止在途播放 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* sc_right：数对啦，真棒（2304ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2304+300=2604 */
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
  playRun++;                                     /* 中止在途击段播放（重玩/换关） */
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastReplayAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.soundcount && sv.soundcount.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题：击段+问句（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §1：watch=3 下/turn=2 下）
   watch=播 sc_tut_watch「看！听一听数一数」→ 3 下鼓逐击 bounce+问句 → 幽灵手指点数字 3 卡
   →点中（__scDemoR）；turn=重立 2 下迷你关「你来数一数」，帮（指向正确卡）→首对独（solo）
   →进正式关。时序（家族 G/H）：watch clip 3144 → 延 3450（≥3144+300）→ 击段 3×700=2100
   → 击后 300 → 问句 1752 → 延 2050（≥1752+300）→ ghost 移入 800+press 320 → demo 演出窗
   1600+3000（罩确认链 2304+150+1416+300=4170）→ turn clip 1896 → 延 2200（≥1896+300）
   → presentQuiz 2×700+300+2148 —— watch 全程分账 13920 ≤ 16000 ---------- */
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 点中返回 'right'）
  const mk = (d1, d2) => ({ kind: 'counthear', count: 3, mix: 0,
    seq: ['d', 'd', 'd'], opts: [{ num: d1 }, { num: d2 }],
    answer: d2 === 3 ? 1 : 0, _miss: 0, _answered: false });
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mk(1, 3), mk(3, 2)] };
}
function tutTurnLevel() {                        // 单题迷你关：2 下（末题=点中返回 'done'→帮转独）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [{ kind: 'counthear', count: 2, mix: 0, seq: ['d', 'd'],
                      opts: [{ num: 2 }, { num: 4 }], answer: 0,
                      _miss: 0, _answered: false }] };
}
async function tutorialWatch() {
  const t0w = Date.now();                       // watch 段计时锚（verify ⑦ 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* sc_tut_watch：看！听一听数一数（3144ms） */
  const run = cur;
  await wait(3450 * SPEED);                      /* ≥3144+300=3444：clip 播完再播击段（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];
  await playBeats(q);                            /* 3 下鼓逐击 bounce（视锚）2100ms */
  if (cur !== run) return;
  await wait(300 * SPEED);                       /* 击后余量 */
  if (cur !== run) return;
  askVoice(q);                                   /* sc_q1：敲了几下呀（1752ms） */
  await wait(2080 * SPEED);                      /* ≥1752+300=2052 防尾截 */
  if (cur !== run) return;
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));                     /* 幽灵手指指向数字 3 卡 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__scDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  window.__scWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify ⑦ 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.soundcount = sv.soundcount || {};
  sv.soundcount.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 2 下迷你关「你来数一数」（帮→独），首对放手进正式关 */
  ghost.hide();
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* sc_tut_turn：你来数一数（1896ms） */
  await wait(2200 * SPEED);                      /* ≥1896+300=2196 防尾截（turn 后击段延） */
  if (cur.flat < 0) await presentQuiz();         /* 2 下鼓+问句→开放点选（demo 已撤可真点） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再听一遍呀 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重玩（重发=破坏教学时序） */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 题面播完才可点（locked 门） */
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  doReplay(true);                                /* 整段重播+视锚重放（3s 节流在 doReplay 内） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=整段重听（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;
  lastAct = Date.now();
  replayAnim(sceneEl, 'pulse');
  doReplay(true);
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

/* ================= 无操作看护：14s 方向级（纯听整段重播，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe+重播——r24 纯听关
   例外带视锚：方向级不给/答案级可给分层）/ 教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  rescueCore();
}
function rescueCore() {                          /* r24 抽取：verify 单元直调断言（r23 登记项④落地） */
  if (!cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);                   /* r24 dual 按 phase 取当前步真值卡 */
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      doReplay(false, pureOf(cur));              /* r24 纯听关带视锚重播（答案级可给） */
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：纯听整段重播（不动 lastAct） */
    doReplay(false, false, true);              /* 审查M1 r24：keepIdle——重播完成不刷 idle 锚，
                                                  30s 答案级跨重播周期可达（否则每 14s 清零退化单级） */
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
  KIDS.init({ game: 'soundcount', title: '听音计数' });   // 存档键 kidsgame_soundcount（core VER 1.0，家族 C）
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
   真实页同暴露 window.SC——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   tapOpt 返回：对且非末题 'right' / 对且末题 'done' / 错 'wrong' / 越界 null；
   replay()=整段重播（3s 节流内 false）================= */
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
    return { kind: q.kind,                             /* SPEC §1 钩子契约：counthear|countmix|countdual */
             count: q.count,                           /* 鼓次数真值 */
             mix: q.mix,                               /* 铃次数（counthear=0） */
             seq: q.seq.slice(),                       /* 击序数组 'd'=鼓/'b'=铃 */
             opts: q.opts.map(o => ({ num: o.num })),  /* 数字卡 {num}（dch4 counthear ⊆6-10 余 ⊆1-5） */
             answer: correctIdx(q),                    /* r24 当前步真值卡下标（dual phase 感知） */
             phase: q.kind === 'countdual' ? q.phase : 0,   /* r24 dual 0=问鼓/1=问铃 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  replay() { return doReplay(true); },
  _forceIdle(ms) {                                /* r24 verify 专用：救援两级驱动（真实页守卫） */
    if (!VERIFY) return;
    lastAct = Date.now() - ms;
    lastDir = Date.now() - ms;
  },
  _idle() {                                       /* 审查M1 r24 verify 专用：idle 只读（行为断言
                                                     用——方向级重播完成 idle 不得归零） */
    if (!VERIFY) return null;
    return Date.now() - lastAct;
  },
  _rescueCore() { if (VERIFY) rescueCore(); },    /* r24 verify 专用：直调救援核心体 */
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选卡，走真实判定链；
    let taps = 0, guard = 0;             // 演出窗/击段播放期 locked → 等窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 120) {    // r24 taps=判对次数（dual 两步计 2——dch4 关=7）
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 1200) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapOpt(correctIdx(q));     /* r24 phase 感知（dual 逐步点当前步真值卡） */
      if (r === 'right' || r === 'done' || r === 'half') taps++;
      else if (guard >= 118) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
