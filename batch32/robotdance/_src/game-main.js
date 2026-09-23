/* ================= robotdance 主逻辑（分相状态机渲染 / 按序点选判定 / 教学 / 救援 / 推进）
   玩法相位机（每题）：watch 演示（机器人逐动作播：动画+名音，单段 1834ms=1684+150；
   播完转场链 [rbd_tut_turn, rbd_q] 进 build；fix 题=[rbd_q_fix]，SPEC-R43 §R5）
   → build 重建（槽 3-8+候选块 6-12；按序点选：对=填槽+块消失+200ms 微缩重放 /
   错=wrong 链 [rbd_wrong, rbd_hint]+豁免窗 4650，已填槽不回退；重复步=多个同名块
   按序各点一次）→ dance（机器人按序完整跳+名音逐段+确认链 right 尾段）→ 下一题。
   fix 题（ch4 每关 1 题，SPEC-R43 §R5）：watch 演正确版→build 槽区静态显示错版 disp
   （8 格全填可点 pickable）→点错误格 k=done（槽刷新正确版→dance 跳正确版+确认链）/
   点错格=wrong（同错链同豁免窗，miss≥2 槽 k breathe 答案级）→ 单步判定无中间态（r25 M2）。
   救援（契约 B/K）：watch/dance 演出相位豁免 idle（演出即引导，不计时）；
   build 14s 方向级=当前步名音+槽 pulse（lastDir 独立锚；fix 题=任务重述 rbd_q_fix）/
   30s 答案级=正确块 breathe（fix 题=槽 k breathe+rbd_q_fix）。
   错反馈（契约 I/I 补/J）：guard 挂 uiTapBlock/uiTapSlot 入口——豁免窗（真时钟 4650）内
   错点吞、对选放行、窗后二错照计 miss；语义链 flat≥3 只 10s 节流；startLevel 重置锚。
   语音链全 clip 无 keyless（契约 N 天然安全——Mj-1 恒真式：本款零 keyless 段）。
   验收钩子：window.RD（verify 页与真实页都暴露——b29 坑⑥）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
/* CSS 动画时长换算声明：head.html 全部 keyframes 时长=calc(X*var(--t))，此处把
   --t 置为 SPEED（真实页 1 / verify 页 0.12）——CSS 动画与 JS 等待窗同一因子，提速不漂移 */
document.documentElement.style.setProperty('--t', String(SPEED));
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3（含教学关 flat=-1）每错必播；flat≥3 走 10s 节流（契约 J：
   语义链 [rbd_wrong, rbd_hint] 全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const tipEl = $id('tip'), robotZone = $id('robot-zone'), slotsEl = $id('slots'),
      boardEl = $id('board'), bunnyBtn = $id('btn-bunny'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let watchT = null, watchRun = 0;                // watch 演示定时器 + 运行令牌（重开/重播中止在途演出）
window.__rdDemoLog = [];                        // watch 演示动作实录（verify 帧内容对账）
window.__rdDanceLog = [];                       // dance 完整舞动作实录（verify 对账）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const blockEl = i => boardEl.querySelector('.block[data-i="' + i + '"]');
const slotEl = i => slotsEl.querySelector('.slot[data-slot="' + i + '"]');
const liveQuiz = () => cur && !cur.done ? cur.quizzes[cur.step] : null;

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  bunnyBtn.innerHTML = KIDS.assets.rabbit('normal', 66);
  robotZone.innerHTML = robotSvg(170);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：填对=双音上行 / 错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染（渲染即引擎：DOM 锚与 quiz 真值一一对应——契约 M） ================= */
const TIP_TEXT = { watch: '看机器人跳舞', build: VOICE.q.text, dance: VOICE.right.text };
function renderTip(q) {
  tipEl.textContent = q.kind === 'fix'
    ? (q.phase === 'dance' ? TIP_TEXT.dance : VOICE.fix.text)   // fix 题面=找一找（SPEC-R43 §R5）
    : (TIP_TEXT[q.phase] || TIP_TEXT.watch);
}
function renderSlots(q, just) {
  slotsEl.innerHTML = '';
  /* fix 槽显示三分支（r43 修复轮 M1 2026-09-22）：build=错版 disp 全填可点（零视觉区分
     错误格）；dance=正确版（视觉修正演出）；**watch 首演=空槽**（SPEC §R5「孩子与记忆中
     正确版逐格对比」——首演期显示 disp 会把记忆保持弱化成实时找茬）；replay 例外=q._replay
     期间 disp 保留（SPEC §R5 明文「对比锚不撤」，审查 REPORT-REVIEW-r43 M1） */
  const fixShow = q.kind === 'fix'
    ? (q.phase === 'dance' ? q.steps
       : (q.phase === 'build' || q._replay) ? q.disp : null)
    : null;
  q.steps.forEach((a, i) => {
    const d = document.createElement('div');
    d.className = 'slot';
    d.dataset.slot = String(i);
    if (fixShow) {                               /* fix 题：build=错版 disp 全填可点（零视觉
                                                    区分错误格）；dance=正确版（视觉修正演出） */
      d.dataset.anim = fixShow[i];
      d.innerHTML = actionSvg(fixShow[i], 44) + '<div class="s-name">' + nameOf(fixShow[i]) + '</div>';
      if (q.phase === 'build' && !q.solved) d.classList.add('pickable');
    } else {
      const filled = q.filled[i] != null;
      if (filled) {                              // 已填槽=动作图+小字名（帧内容锚）
        d.dataset.anim = q.filled[i];
        d.innerHTML = actionSvg(q.filled[i], 44) + '<div class="s-name">' + nameOf(q.filled[i]) + '</div>';
        if (just != null && i === just) d.classList.add('fill-pop');   // 仅新填槽 pop（200ms）
      }
      if (i === q.pos && q.phase === 'build' && !q.solved) d.classList.add('cur');   // 当前槽
    }
    d.insertAdjacentHTML('beforeend', '<i class="s-idx">' + (i + 1) + '</i>');
    slotsEl.appendChild(d);
  });
}
function renderBoard(q) {
  if (q.phase !== 'build' || q.kind === 'fix') { boardEl.style.display = 'none'; boardEl.innerHTML = ''; return; }
  boardEl.style.display = '';
  boardEl.innerHTML = '';
  q.blocks.forEach((b, i) => {
    if (q._consumed[i]) return;                  // 已消耗块从候选区消失
    const el = document.createElement('button');
    el.className = 'block pop';
    el.dataset.i = String(i);
    el.dataset.anim = b.anim;                    // verify 对账（渲染即引擎）
    el.setAttribute('aria-label', nameOf(b.anim) + '动作块');
    el.innerHTML = actionSvg(b.anim, 56) + '<div class="c-name">' + nameOf(b.anim) + '</div>';
    el.style.animationDelay = (i * 60) + 'ms';
    boardEl.appendChild(el);
  });
}
function renderPhase(q, just) {
  if (!q) return;
  renderTip(q);
  renderSlots(q, just);
  renderBoard(q);
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
function renderQuiz() {
  const q = liveQuiz();
  if (!q) return;
  renderPhase(q);
  renderStep();
}

/* ================= 机器人动画（CSS keyframes；时长=calc(*var(--t)) 已随 SPEED 换算） ================= */
const MOVE_ANIM_MS = { jump: 850, spin: 1000, clap: 1000, stomp: 1000, wave: 1350,   // 名义全长（新 5 SPEC-R43）
                       nod: 1000, kick: 1100, shake: 1800, bow: 1100, stretch: 1200 };
function robotAnim(move, mini) {
  const rob = robotZone.querySelector('.robot');
  if (!rob) return;
  rob.classList.remove('a-jump', 'a-spin', 'a-clap', 'a-stomp', 'a-wave',
                       'a-nod', 'a-kick', 'a-shake', 'a-bow', 'a-stretch', 'mini');
  void rob.offsetWidth;
  if (mini) rob.classList.add('a-' + move, 'mini');
  else rob.classList.add('a-' + move);
  const dur = mini ? 220 : (MOVE_ANIM_MS[move] || 900);
  setTimeout(() => { rob.classList.remove('a-' + move, 'mini'); }, dur * SPEED + 50);
}
function pulseSlot(pos) {                        // 方向级：当前槽再 pulse（错反馈/救援共用）
  const el = slotEl(pos);
  if (el) replayAnim(el, 'flash');
}
function clearBreathe() {
  boardEl.querySelectorAll('.block.breathe').forEach(b => b.classList.remove('breathe'));
  slotsEl.querySelectorAll('.slot.breathe').forEach(s => s.classList.remove('breathe'));   // fix 答案级（SPEC-R43）
}
function bounceReplayBtn() { replayAnim(replayBtn, 'bounce'); }   // 首错：重播按钮在场提示

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
/* 教学"帮"阶段指向：当前步正确块（仅 build 相位——watch 期指向=泄底）；
   fix 题防御分流指槽 k（教学关无 fix——flat0 ch1，防御性兼容，SPEC-R43 §R5） */
function pointHelpNext() {
  const q = liveQuiz();
  if (!q || q.phase !== 'build') return;
  if (q.kind === 'fix') { const ke = slotEl(q.k); if (ke) pointGhostAt(ke); return; }
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(blockEl(i));
}

/* ================= watch 演示播放器（question 开题 / replay 重播 / dance 共用底层）
   逐动作：动画+名音 play+150 间隙（单段窗 STEP_MS=1834=预估 1684+150；实测 max stretch
   1704→间隙 130ms 零截断，r43 定版——minor4 勘误原 1734/1584 旧值，SPEC §4/§R8）；
   watchRun 令牌中止在途演出（重开/重播）；身份守卫 cur!==run 丢弃旧关续体 ================= */
function stopWatch() { clearTimeout(watchT); watchT = null; watchRun++; }
async function playMoves(q, run, token, logArr) {
  for (let k = 0; k < q.steps.length; k++) {
    if (token !== watchRun || cur !== run) return false;
    robotAnim(q.steps[k], false);
    KIDS.voice.play(nameClip(q.steps[k]), nameOf(q.steps[k]));
    if (logArr) logArr.push(q.steps[k]);
    await wait(STEP_MS * SPEED);                 // 单段 ≤1834ms（名音实测 max 1704，间隙 130）
  }
  return token === watchRun && cur === run;
}
/* 开题：lead 后播演示 → 演示完 [rbd_tut_turn, rbd_q] 转场链进 build（chainTurn=false
   供教学交接用——turn 刚播过，只补 q）；build 开始重置救援双锚 */
function startQuizFlow(lead, chainTurn) {
  stopWatch();
  const run = cur, token = watchRun;
  watchT = setTimeout(async () => {
    watchT = null;
    if (cur !== run || state.won || !run) return;
    const q = liveQuiz();
    if (!q || q.solved) return;
    renderPhase(q);
    const ok = await playMoves(q, run, token, window.__rdDemoLog);
    if (!ok) return;
    engToBuild(cur);
    /* 转场链：演示完「你来拼一拼」+「按顺序点一点」进 build（SPEC §0.77+§2；全 clip 无 keyless）；
       fix 题=任务句 [rbd_q_fix]「有一跳错啦，找一找」（SPEC-R43 §R5/§R7） */
    const chain = q.kind === 'fix' ? [VOICE.fix.key]
                : (chainTurn === false ? [VOICE.q.key] : [VOICE.turn.key, VOICE.q.key]);
    KIDS.voice.queue(chain);
    renderPhase(liveQuiz());
    lastAct = Date.now();                        /* build 开始重置救援钟（§0.7a） */
    lastDir = Date.now();
    if (state.tut === 'help') pointHelpNext();   // 教学"帮"：build 开放再指（不泄底）
  }, lead * SPEED);
}

/* ================= dance 演出相位：机器人按序完整跳 + 确认链（名音逐段+right 尾段）
   窗口：k 步最长 k×1834+2580（right 2280+300）；5 步=11750 ≥ 11050（SPEC §4，家族 G/H） */
async function danceFlow(run, q) {
  const chain = q.steps.map(a => nameClip(a)).concat([VOICE.right.key]);
  KIDS.voice.queue(chain);                       // 确认链：完整舞名音逐段+right 尾段（全 clip 无 keyless）
  const token = watchRun;
  for (let k = 0; k < q.steps.length; k++) {
    if (cur !== run || token !== watchRun) return;
    robotAnim(q.steps[k], false);
    window.__rdDanceLog.push(q.steps[k]);
    await wait(STEP_MS * SPEED);
  }
  if (cur !== run || token !== watchRun) return;
  await wait(2580 * SPEED);                      /* right 尾段 2280+300；总窗 5×1834+2580=11750 ≥ 11050 */
}

/* ================= 点块主路径（真实点击 / RD.tapBlock / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（块区容器 bump 微动效——家族 D）；
   错链豁免窗 guard（契约 I 补，真时钟禁 SPEED 缩水窗）：错点吞/对选放行/窗后照计 miss */
async function uiTapBlock(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = liveQuiz();
  if (!q || q.solved) return false;
  if (!Number.isInteger(i) || i < 0 || i >= q.blocks.length) {   // 越界=null+pop+bump
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return null;
  }
  /* 契约 I 补：错链豁免窗（真时钟 4650）内错点吞（pop+bump 不计 miss）、对选放行 */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && q.blocks[i].anim !== q.steps[q.pos]) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapBlock(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已消耗块
  if (r === 'watch') {                           /* watch/dance 演出期吞输入+轻叮（§0.22） */
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const el = blockEl(i);

  if (r === 'wrong') {                    /* 点错：块摇头+[rbd_wrong, rbd_hint] 全 clip 链+
                                            当前槽 pulse 方向级+重播按钮提示；已填槽不回退 */
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))  /* 错链=rbd_wrong 1656+150+rbd_hint 2544+300 */
      wrongChainUntil = Date.now() + 4650;        /* 豁免窗 4650（契约 I；救援 interval 让路） */
    pulseSlot(q.pos);                             /* 方向级：当前应填槽高亮 */
    bounceReplayBtn();                            /* 首错：rbd_replay 重播按钮在场提示 */
    if (q.miss >= 2) {                            /* miss≥2=答案级：正确块 breathe（家族梯度） */
      const ci = correctIdx(q);
      if (ci >= 0) { const ce = blockEl(ci); if (ce) replayAnim(ce, 'breathe'); }
    }
    await wait(600 * SPEED);                      /* 摇头演完（§0.11）；无 locked 窗——豁免窗 guard 承担 */
    return r;
  }

  /* ---- fill / done（点对：填槽+块消失+200ms 微缩重放） ---- */
  lastAct = Date.now();                           /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                     /* 教学"独"：首次点对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopBunny();
  }
  clearBreathe();
  if (el) el.classList.add('gone');               /* 块消失（微缩退场 200ms） */
  sfx('coin');
  const filledIdx = q.pos - 1;                    /* 引擎已 pos++：刚填槽下标 */
  robotAnim(q.steps[filledIdx], true);            /* 该动作 200ms 微缩重放 */
  if (r === 'fill') {
    await wait(260 * SPEED);                      /* 填槽+块退场演出窗 */
    if (cur !== run) return r;
    renderPhase(liveQuiz(), filledIdx);           /* 刷新槽/块区（消耗块消失+当前槽前移） */
    return r;
  }

  /* ---- done：末槽填完 → dance 相位（完整舞+确认链） ---- */
  state.locked = true;
  renderPhase(q, filledIdx);                      /* dance：槽全满+块区收起 */
  await wait(280 * SPEED);                        /* 填槽动画收尾（fill-pop 200） */
  if (cur !== run) return r;
  chimeGoal();
  await danceFlow(run, q);                        /* 机器人按序完整跳+名音逐段+right 尾段 */
  if (cur !== run) return r;
  state.locked = false;
  if (run.tutLevel) return r;                     /* 教学演示完成——交接由 tutorialWatch 接管 */
  if (engWon(run)) { winFlow(); return r; }       /* 末题末槽=通关 */
  renderQuiz();                                   /* 下一题（watch 相位） */
  startQuizFlow(600);
  return r;
}

/* ================= 点槽主路径（fix 题专用，SPEC-R43 §R5；真实点击 / RD.tapSlot / autoSolve 共用）
   单步原子判定（r25 M2）：i===k='done'（槽刷新正确版→dance 跳正确版+确认链）；
   i!==k='wrong'（miss+1+错链+豁免窗 4650 同常规+错点格 wig；miss≥2 槽 k breathe 答案级）；
   无中间态不卡死（豁免窗后可再点）；吞输入轻叮配容器 bump（家族 D） */
async function uiTapSlot(i) {
  if (!cur || state.won || state.locked || state.demo) {
    sfx('pop');
    replayAnim(slotsEl, 'bump');
    return false;
  }
  const q = liveQuiz();
  if (!q || q.solved || q.kind !== 'fix') return false;
  if (!Number.isInteger(i) || i < 0 || i >= q.steps.length) {   // 越界=null+pop+bump
    sfx('pop');
    replayAnim(slotsEl, 'bump');
    return null;
  }
  if (q.phase !== 'build') {                    // watch 演示期吞输入+轻叮（§0.22）
    sfx('pop');
    replayAnim(slotsEl, 'bump');
    return false;
  }
  /* 契约 I 补同律：错链豁免窗（真时钟 4650）内错点吞、对选放行 */
  if (wrongChainUntil && Date.now() < wrongChainUntil && i !== q.k) {
    sfx('pop');
    replayAnim(slotsEl, 'bump');
    return false;
  }
  const run = cur;                              /* 身份守卫：演出窗内重玩会重建 cur */
  const r = engTapSlot(cur, i);
  if (r === null) { sfx('pop'); replayAnim(slotsEl, 'bump'); return null; }
  if (r === 'watch') { sfx('pop'); replayAnim(slotsEl, 'bump'); return false; }
  const el = slotEl(i);

  if (r === 'wrong') {                          /* 点错格：格 wig+错链+miss≥2 槽 k breathe */
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))   /* 错链=rbd_wrong 1656+150+rbd_hint 2544+300 */
      wrongChainUntil = Date.now() + 4650;        /* 豁免窗 4650（契约 I；救援 interval 让路） */
    if (q.miss >= 2) {                           /* miss≥2=答案级：槽 k breathe（家族梯度） */
      const ke = slotEl(q.k);
      if (ke) replayAnim(ke, 'breathe');
    }
    await wait(600 * SPEED);                     /* wig 演完（§0.11） */
    return r;
  }

  /* ---- done：点对错误格 → 槽刷新正确版（视觉修正演出）→ dance 跳正确版+确认链 ---- */
  lastAct = Date.now();                          /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') { state.tut = 'solo'; ghost.hide(); hopBunny(); }
  clearBreathe();
  chimeGoal();
  state.locked = true;
  renderPhase(q);                                /* dance：槽=steps 正确版 */
  await wait(280 * SPEED);                       /* 修正演出收尾 */
  if (cur !== run) return r;
  await danceFlow(run, q);                       /* dance=跳正确版+确认链（steps 通用） */
  if (cur !== run) return r;
  state.locked = false;
  if (run.tutLevel) return r;
  if (engWon(run)) { winFlow(); return r; }
  renderQuiz();                                  /* 下一题（watch 相位） */
  startQuizFlow(600);
  return r;
}

/* ================= replay 重播演示（build 相位可用；RD.replay 与重播按钮共用）
   watch 相位完整重演动画+名音（filled/已消耗块全保留——重播不清进度）；返回 true/false */
async function replayDemo() {
  const q = liveQuiz();
  if (!q || q.solved || q.phase !== 'build') return false;
  sayR(VOICE.replay.key, VOICE.replay.text);      /* rbd_replay：再看一遍舞（1896ms） */
  engToWatch(cur);                                /* build 临时切回 watch（pos 保留） */
  q._replay = true;                               /* r43 M1：replay 期 disp 槽保留（对比锚不撤） */
  renderPhase(q);
  state.locked = true;                            /* 演出期吞输入（engTapBlock 'watch' 兜底） */
  await wait(2124 * SPEED);                       /* replay 前导窗：>rbd_replay 1896 无截断（余 228ms；
                                                  2124=turn 延窗值复用，家族 300 约定差 72ms——r43
                                                  minor3 勘误注记，原「≥1896+300」算式不成立 */
  const run = cur;
  const ok = await playMoves(q, run, watchRun, window.__rdDemoLog);
  if (!ok || cur !== run) { state.locked = false; return false; }
  engToBuild(cur);
  delete liveQuiz()._replay;                      /* 回 build 清 replay 标志（r43 M1） */
  renderPhase(liveQuiz());
  state.locked = false;
  lastAct = Date.now();                           /* 重播=主动交互，重置 idle 锚 */
  return true;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末）
   注：确认链 right 尾段已在 dance 相位播过，winFlow 不再重播 right（celebrate 承载收尾） */
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
  stopWatch();
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null) */
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
  stopWatch();
  ghost.hide();
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  window.__rdDemoLog = [];
  window.__rdDanceLog = [];
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.robotdance && sv.robotdance.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) { startQuizFlow(400); return; }    // verify 页：照常排演示（相位推进供驱动）
  if (freshTut) { tutorialWatch(); return; }
  startQuizFlow(600);                            // 常规开题：稍候即演示（题面=演示链）
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（SPEC §2）
   看=教学关 2 步舞（跳一跳、拍拍手）：rbd_tut_watch「看！机器人跳舞啦」(3072) →
   机器人逐动作播 → 幽灵手指按序点两块填槽 → 'done'（完整舞+确认链）→ __rdDemoR；
   帮=交接真关 genLevel(0)，rbd_tut_turn「你来拼一拼」→首题演示→build 后指向正确块；
   独=首次点对放手。
   时序（真实页名义分账）：watch 延 3372（≥3072+300）+演示 2×1834+转场链起 420+
   ghost 2×920（含 pointGhostAt 内 800 移动+按压）+fill 260+60+280+dance 2×1834+2580
   = 16148 ≤ 16500（verify 实测同值；minor4 勘误原 1734/15748 为 STEP_MS 旧值 stale） */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  cur = genTutLevel();                           // 教学关（2 步舞，tutLevel=true）
  lastWrongVoice = 0; wrongChainUntil = 0;
  window.__rdDemoLog = []; window.__rdDanceLog = [];
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* rbd_tut_watch：看！机器人跳舞啦（3072ms） */
  await wait(3372 * SPEED);                      /* t=3372 ≥ 3072+300=3372：clip 播完再演（不撞头） */
  if (state.tut !== 'watch') return;
  const run = cur;
  const ok = await playMoves(run.quizzes[0], run, watchRun, window.__rdDemoLog);   /* 跳一跳、拍拍手逐动作播 */
  if (!ok || state.tut !== 'watch' || cur !== run) return;
  engToBuild(cur);
  KIDS.voice.queue([VOICE.turn.key, VOICE.q.key]);   /* 你来拼一拼+按顺序点一点 */
  renderPhase(run.quizzes[0]);                   /* build：块出现 */
  await wait(420 * SPEED);                       /* 转场链起+块入场（链异步续播） */
  if (state.tut !== 'watch' || cur !== run) return;
  /* 幽灵手指按序点两块填槽（pointGhostAt 内 800 移动+按压，920 窗覆盖） */
  for (let t = 0; t < 2; t++) {
    const q = run.quizzes[0];
    const idx = correctIdx(q);
    if (idx < 0) return;
    pointGhostAt(blockEl(idx));
    await wait(920 * SPEED);
    const dR = await uiTapBlock(idx, true);      /* demo 通道豁免 locked 门（演示吞真实输入） */
    if (t === 1) { window.__rdDemoR = dR; break; }   /* 教学演示结果（末槽填完='done'）——dance 已在内演完 */
    await wait(60 * SPEED);
    if (state.tut !== 'watch' || cur !== run) return;
  }
  /* 存教学已看标记 + 交接真关（你来拼=3 步舞） */
  const sv = KIDS._save() || {};
  sv.robotdance = sv.robotdance || {};
  sv.robotdance.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  ghost.hide();
  cur = genLevel(0);                             // 真实首关（确定性，重发同关）
  lastWrongVoice = 0; wrongChainUntil = 0;
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now(); lastDir = Date.now();
  window.__rdDemoLog = []; window.__rdDanceLog = [];
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);         /* rbd_tut_turn：你来拼一拼（1824ms） */
  startQuizFlow(2124, false);                    /* ≥1824+300 后演示首题舞（turn 刚播过，转场只补 q） */
}

/* ================= 底栏与舞台交互 ================= */
function hopBunny() {
  bunnyBtn.classList.remove('hop'); void bunnyBtn.offsetWidth; bunnyBtn.classList.add('hop');
}
bunnyBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopBunny();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  const q = liveQuiz();                            /* fix 题=任务重述（hint「下一步」语义不符，SPEC-R43 §R5） */
  if (q && q.kind === 'fix' && q.phase === 'build') sayR(VOICE.fix.key, VOICE.fix.text);
  else sayR(VOICE.hint.key, VOICE.hint.text);      /* 戳兔子=方向提示：再想一想，下一步 */
});
replayBtn.addEventListener('pointerdown', e => {   /* 再看一遍舞（build 相位可用；fix 题=重播正确版） */
  e.preventDefault();
  if (VERIFY || !cur || state.won) return;
  if (state.locked || state.demo) { sfx('pop'); replayAnim(boardEl, 'bump'); return; }
  lastAct = Date.now();
  replayDemo();
});
hearBtn.addEventListener('pointerdown', e => {     /* 再听一遍=重听题面句（fix 题=任务句） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  const q = liveQuiz();
  if (q && q.kind === 'fix') sayR(VOICE.fix.key, VOICE.fix.text);
  else sayR(VOICE.q.key, VOICE.q.text);
});
slotsEl.addEventListener('pointerdown', e => {     /* 点槽：fix 题build=作答；常规题=方向级提示 */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  const q = liveQuiz();
  if (!q || q.phase !== 'build') return;
  if (q.kind === 'fix') {                          /* fix 题点槽=指出错步位（SPEC-R43 §R5） */
    const p = e.target.closest('.slot');
    if (!p) return;
    lastAct = Date.now();
    uiTapSlot(Number(p.dataset.slot));
    return;
  }
  lastAct = Date.now();
  pulseSlot(q.pos);                                /* 常规题：当前步名音+槽 pulse */
  KIDS.voice.play(nameClip(q.steps[q.pos]), nameOf(q.steps[q.pos]));
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.block');
  if (!p) return;                                // 块间空白走 stage 空白路径
  e.preventDefault();
  uiTapBlock(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.block') || e.target.closest('.slot')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护（契约 B/K）：watch/dance 演出相位豁免 idle（演出即引导，
   不计时——§0.77 演示相位定义）；build 14s 方向级（当前步名音+槽 pulse，lastDir 独立
   节流锚，不动 lastAct）/30s 答案级（正确块 breathe+当前步名音）；教学"帮"5s 重演示 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默 */
  const q = liveQuiz();
  if (!q || q.solved || q.phase !== 'build') return;   /* watch/dance 演出相位不计时（演出即引导） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    if (q.kind === 'fix') {                      /* fix 题：错误槽 k breathe+任务重述（SPEC-R43 §R5） */
      const ke = slotEl(q.k);
      if (ke) replayAnim(ke, 'breathe');
      KIDS.voice.play(VOICE.fix.key, VOICE.fix.text);
    } else {
      const ci = correctIdx(q);
      if (ci >= 0) { const ce = blockEl(ci); if (ce) replayAnim(ce, 'breathe'); }
      KIDS.voice.play(nameClip(q.steps[q.pos]), nameOf(q.steps[q.pos]));
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级（不动 lastAct） */
    if (q.kind === 'fix') {                      /* fix 题=任务重述（hint「下一步」语义不符） */
      KIDS.voice.play(VOICE.fix.key, VOICE.fix.text);
    } else {                                     /* 常规题：当前步名音+槽 pulse */
      KIDS.voice.play(nameClip(q.steps[q.pos]), nameOf(q.steps[q.pos]));
      pulseSlot(q.pos);
    }
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言） */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'robotdance', title: '兔子机器人学跳舞' });   // 存档键 kidsgame_robotdance（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   verify 页与真实页都暴露——b29 坑⑥） ================= */
window.RD = {
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
    return { steps: q.steps.slice(),                     /* SPEC §2：steps=动作 id 序列真值 */
             blocks: q.blocks.map(b => ({ anim: b.anim })),   /* 候选块 {anim} 含干扰（全量；fix 题空） */
             filled: q.filled.slice(),                   /* 已填槽动作 id 或 null */
             step: q.pos,                                /* 当前应填下标 0 基 */
             miss: q.miss,
             phase: q.phase,                             /* 'watch'|'build'|'dance' */
             kind: q.kind || 'seq',                      /* 'seq'|'fix'（SPEC-R43 §R5） */
             k: q.kind === 'fix' ? q.k : undefined,      /* fix 错步位（0 基） */
             bad: q.kind === 'fix' ? q.bad : undefined,  /* fix 替换动作 */
             disp: q.kind === 'fix' ? q.disp.slice() : undefined };   /* fix 错版显示序列 */
  },
  tapBlock(i) { return uiTapBlock(i); },                 /* 'fill'/'done'/'wrong'/越界 null/吞 false */
  tapSlot(i) { return uiTapSlot(i); },                   /* fix 题点槽：'done'/'wrong'/null/false（SPEC-R43） */
  replay() { return replayDemo(); },                     /* build 相位重播演示（watch 重演+名音；fix=正确版） */
  async autoSolve() {                    // UI 路径自动点完当前关（真实等演示/舞演出→逐块照序点）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 300) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.phase !== 'build') { await waitPhase(q); continue; }
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const cq = cur.quizzes[cur.step];
      if (!cq || cq.solved || cq.phase !== 'build') continue;
      if (cq.kind === 'fix') {                     /* fix 题：点错误槽 k（SPEC-R43 §R5） */
        const r = await uiTapSlot(cq.k);
        if (r === 'done') taps++;
        else if (r === false || r === null) await wait(200);
        continue;
      }
      const ci = correctIdx(cq);
      if (ci < 0) break;
      const r = await uiTapBlock(ci);
      if (r === 'fill' || r === 'done') taps++;
      else if (r === false || r === null) await wait(200);
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
/* 轮询等演出相位结束（autoSolve/verify 驱动用；真实等待不猜时长） */
async function waitPhase(q) {
  const span = (3200 + 10 * STEP_MS) * SPEED + 6000;   /* 8 步+2 余量（SPEC-R43 §R8） */
  const t0 = Date.now();
  while (Date.now() - t0 < span) {
    if (!cur || cur.done) return true;
    const cq = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)];
    if (cq && (cq.solved || cq.phase === 'build')) return true;
    await wait(50);
  }
  return !!(cur && cur.done);
}
