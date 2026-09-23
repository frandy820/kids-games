/* ================= quickcmp 主逻辑（闪现圆点比大小：题面时序 / 侧选判定 / 教学 / 救援 / 推进）
   玩法（SPEC-R46 现行版）：开题=问句 qc_ask「哪边的圆点多」（2088ms）→ 圆点阵闪现
   （ch1/ch3 1200ms / ch2/ch4 1400ms——感知窗非答题窗；ch4=dual 双闪序列：左簇 1400→
   ISI 800→右簇 1400→消隐 300）→ 消隐（veil 透明度过渡，DOM 恒在=闪现后残留计数锚）
   → 开放点选（无限时压力——反应款不抢快，超时零惩罚）。
   ch1-3=cmp 单步（点对=right+复述）；ch4=dual 两段式（r24/r25 half 范式）：第一问方向
   三选→对转第二问「多几个呢」（qc_ask_gap，r46 段二已注册——SPEC §R7）差值三档
   2/4/6→对才推进；第一步对不推 step 不计 miss，转相位必刷 lastAct（r25 M2 铁律）。
   确认链（T46 化）=[qc_right, qc_s_left, qc_n_X, qc_s_right, qc_n_Y] 5 段 clip 拼播；
   演出窗动态尾（SPEC §R8，r37 max(estMs,chainMs) 先例）：max(nL,nR)≤10→2000+6800
   （罩最坏 8796，教学迷你关同档——分账 17220≤17250 帽不破）；>10→2000+7400（罩
   11-20 实测链 9132=2256+600+1344+1632×2+1368+300，r46 段二实测复核 09-22）。
   点错=wrong+miss+多的一侧 pulse（等数两侧；dual 第一问同）/正确档 pulse 路径无
   （第二问错仅 wig）+错链 [qc_wrong, qc_hint]（豁免窗 4938=1992+150+2496+300 真时钟）；
   miss≥2 答案级 breathe=多的一侧（等数两侧；dual 第二问=正确档按钮 breathe）。
   再看一眼=doFlash(user)：重放闪现（dual=重放完整双闪序列；6s 节流——节流拒绝仍重置
   lastAct 保救援锚，b31 坑④先例）；救援：14s 方向级=重放闪现（lastDir 独立锚）/
   30s 答案级=breatheAnswer（按相位分流）+重放；错反馈链豁免窗 4938 让路（契约 I）。
   验收钩子：window.QC = { get currentLevel, get quiz{kind,nL,nR,d,phase,flash,same,
   options,step,miss}, flashNow(), tapSide(s), start(flat), autoSolve() }——真实页同
   暴露（b29 坑⑥）。tapSide 返回域：'right'|'done'|'wrong'|'half'（dual 第一步对）|
   null（闪现窗吞/非法 s/相位不符）|false（locked/豁免窗吞）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* T46 化（2026-09-19）：estMs TTS 估长退役（确认链全 clip 化，窗=静态常量按 clip
   实长推导——estMs 口径已无消费者，禁死代码留存） */
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }   /* 审查 m3：教学迷你关 flat=-1 每错必播（契约 J flat≥3 才节流） */
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), choicesEl = $id('choices'),
      panelLEl = $id('panelL'), panelREl = $id('panelR'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), flashBtn = $id('btn-flash'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, flashOn: false };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastFlashAt = 0;                            // 再看一眼 6s 节流锚（b31 chr 先例）
let helpRedemo = false;
let flashRun = 0;                               // 闪现播放令牌（重开关卡/新题/重看中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const sideBtnEl = s => choicesEl.querySelector('.side-btn[data-side="' + s + '"]');
const panelElOf = s => s === 'L' ? panelLEl : panelREl;
/* 多的一侧面板（等数题=两侧同时——SPEC §0.89 答案级口径） */
function pulseAnswer(q) {
  const s = correctSide(q);
  if (s === 'S') { replayAnim(panelLEl, 'pulse'); replayAnim(panelREl, 'pulse'); }
  else replayAnim(panelElOf(s), 'pulse');
}
/* 答案级 breathe（SPEC-R46 §R3 按相位分流）：cmp/等数=多的一侧面板（等数两侧）；
   dual 第二问=正确档按钮 breathe（差值答案级线索） */
function breatheAnswer(q) {
  if (q.kind === 'dual' && q._phase === 1) {
    const el = sideBtnEl(engDualGap(q));
    if (el) el.classList.add('breathe');
    return;
  }
  const s = correctSide(q);
  if (s === 'S') { panelLEl.classList.add('breathe'); panelREl.classList.add('breathe'); }
  else panelElOf(s).classList.add('breathe');
}

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  flashBtn.innerHTML = ICONS.eye;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  $id('vs').innerHTML = VS_BADGE;
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 闪现播放器（感知窗——闪现态=演出层锚，契约 M）
   flashOn/flashOff 幂等；__qcFlashN=累计闪现次数（verify 与 DOM veil 态双向对账） */
function flashOn() {
  window.__qcFlashN = (window.__qcFlashN || 0) + 1;
  panelLEl.classList.remove('veil');
  panelREl.classList.remove('veil');
}
function flashOff() {
  panelLEl.classList.add('veil');
  panelREl.classList.add('veil');
}
/* ================= 再看一眼 / 开题闪现共用（user=true 走 6s 节流——SPEC §2 重看通道；
   救援/开题 user=false 直放；keepIdle=true=救援重放不刷 lastAct——r46 M1：14s 方向级
   不得饿死 30s 答案级，r24 doReplay keepIdle 同型）。闪现期 state.flashOn=true+locked=true（输入吞 null）。
   r46 dual 双闪序列（SPEC-R46 §R8）：左簇揭示→ISI（双簇均隐）→右簇揭示→消隐；
   __qcDualPhase='A'|'ISI'|'B'|null=序列中间态锚（verify 瞬态捕获——SPEED=0.12 下
   468ms 序列须密集轮询，b18 先例）；每次 doFlash 调用 __qcFlashN+1（含 dual） */
async function doFlash(user, keepIdle) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || state.won) return false;
  if (user) {
    if (Date.now() - lastFlashAt < 6000) return false;   // 6s 节流（b31 chr 先例：不覆盖儿童静观）
    lastFlashAt = Date.now();
  }
  const token = ++flashRun, run = cur;
  state.flashOn = true;
  state.locked = true;
  const stale = () => { window.__qcDualPhase = null; return false; };   // 中断清中间态锚
  if (q.kind === 'dual') {                       /* ---- dual 双闪序列 ---- */
    window.__qcFlashN = (window.__qcFlashN || 0) + 1;
    window.__qcDualPhase = 'A';
    panelLEl.classList.remove('veil');           /* 第一簇（左）揭示 */
    panelREl.classList.add('veil');
    await wait(q.flash * SPEED);                 /* 簇闪现窗 1400（SPEC §R8） */
    if (cur !== run || token !== flashRun) return stale();
    panelLEl.classList.add('veil');              /* 第一簇消隐（ISI 间隔） */
    window.__qcDualPhase = 'ISI';
    await wait(DUAL_ISI * SPEED);
    if (cur !== run || token !== flashRun) return stale();
    window.__qcDualPhase = 'B';
    panelREl.classList.remove('veil');           /* 第二簇（右）揭示 */
    await wait(q.flash * SPEED);
    if (cur !== run || token !== flashRun) return stale();
    flashOff();                                  /* 消隐（DOM 恒在——残留计数锚） */
    await wait(300 * SPEED);                     /* 消隐余量 */
    if (cur !== run || token !== flashRun) return stale();
    window.__qcDualPhase = null;
  } else {                                       /* ---- cmp 双面板同揭（v1 不变） ---- */
    flashOn();
    await wait(q.flash * SPEED);                 /* 闪现窗 1200|1400（感知窗） */
    if (cur !== run || token !== flashRun) return false;
    flashOff();                                  /* 消隐（DOM 恒在——闪现后残留计数锚） */
    await wait(300 * SPEED);                     /* 消隐余量 */
    if (cur !== run || token !== flashRun) return false;
  }
  state.flashOn = false;
  state.locked = false;
  if (!keepIdle) lastAct = Date.now();           /* 闪毕开放点选（b25 M4：感知完成重置 idle 锚；救援重放豁免——r46 M1） */
  lastDir = Date.now();
  return true;
}

/* ================= 开题呈现：渲染题面（veil 态）→ 问句 qc_ask → 延 2400（≥2088+300）
   → 闪现+消隐（doFlash）→ 开放点选。答对推进/重开关卡共用 ================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();                                 // 面板+按钮+进度点（新题面，圆点 veil 态）
  const run = cur;
  sayR(VOICE.ask.key, VOICE.ask.text);          /* qc_ask：哪边的圆点多（2088ms） */
  await wait(2400 * SPEED);                     /* ≥2088+300=2388（家族 H） */
  if (cur !== run) return;
  await doFlash(false);                         // 闪现（1200|1400——FLASH_EASY/MID 按章，r46）+消隐 300 → 开放
}

/* ================= 渲染 ================= */
/* 答案按钮图示：横排小圆点左重右轻/两侧等/左轻右重（无 .dot class——不污染面板计数锚） */
function arrowSvg(side) {
  const l = side === 'L' ? 3 : 2, r = side === 'R' ? 3 : 2;
  let s = '<svg viewBox="0 0 96 34" xmlns="http://www.w3.org/2000/svg" fill="none">';
  for (let k = 0; k < l; k++)
    s += '<circle cx="' + (14 + k * 13) + '" cy="17" r="5.5" fill="#E8975A" stroke="' + INK + '" stroke-width="1.8"/>';
  for (let k = 0; k < r; k++)
    s += '<circle cx="' + (58 + k * 13) + '" cy="17" r="5.5" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>';
  s += '<path d="M45 17 h6" stroke="' + INK + '" stroke-width="2"/></svg>';
  return s;
}
function renderPanels(q) {                       // 左右对称圆点面板（veil 态起步——ask 期不可见）
  const r = rOf(q);                              // 同题同半径（r46：n≥13 大簇 7.5）
  panelLEl.innerHTML = dotsSvg(q.nL, q.pL, r) + '<div class="tag">左边</div>';
  panelREl.innerHTML = dotsSvg(q.nR, q.pR, r) + '<div class="tag">右边</div>';
  panelLEl.classList.remove('breathe', 'pulse', 'lit');
  panelREl.classList.remove('breathe', 'pulse', 'lit');
  panelLEl.classList.add('veil');
  panelREl.classList.add('veil');
  sceneEl.setAttribute('aria-label', VOICE.ask.text + '，点我再看一遍圆点');
}
/* dual 第二问判定（档级按钮渲染与 s 域共用） */
const isDualGap = q => q.kind === 'dual' && q._phase === 1;
function renderChoices(q) {                      // 答案按钮排（ch1 2 个禁一样多 / ch2+ 3 个；
  choicesEl.innerHTML = '';                      //  dual 第二问=差值三档 2/4/6——SPEC-R46 §R3）
  const defs = isDualGap(q)
    ? [['2', '多 2 个'], ['4', '多 4 个'], ['6', '多 6 个']]
    : q.optsN === 2
      ? [['L', '左边多'], ['R', '右边多']]
      : [['L', '左边多'], ['S', '一样多'], ['R', '右边多']];
  defs.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'side-btn pop' + (isDualGap(q) ? ' gap' : '');
    b.dataset.side = d[0];                       // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', d[1]);
    b.innerHTML = isDualGap(q)
      ? '<div class="lbl">' + d[1] + '</div><div class="gapnum">' + d[0] + '</div>'
      : '<div class="lbl">' + d[1] + '</div>' + arrowSvg(d[0]);
    b.style.animationDelay = (i * 70) + 'ms';
    choicesEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderPanels(q);
  renderChoices(q);
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

/* ================= 答对演出：圆点重现对照真相 + 小兔子滑入示范（确认句拼播由 uiTapSide 播）
   verify 页跳过装饰直接落定 ================= */
function celebratePanels() {
  flashOn();                                     /* 圆点重现（点对后的真相对照——教育反馈） */
  if (!panelLEl.querySelector('.demo-pet')) {
    const pet = document.createElement('div');
    pet.className = 'demo-pet';
    pet.innerHTML = KIDS.assets.rabbit('happy', 54);   /* 小兔子开心示范 */
    panelLEl.appendChild(pet);
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
/* 教学"帮"阶段指向：当前题正确侧按钮（dual=按相位正确侧/正确档——教学恒 cmp，防御性） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const s = isDualGap(q) ? engDualGap(q) : correctSide(q);
  if (s) pointGhostAt(sideBtnEl(s));
}

/* ================= 点选主路径（真实点击 / QC.tapSide / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（按钮排容器 bump 微动效——家族 D）；
   闪现窗内输入吞 null（SPEC §2 钩子契约——感知期不作答）；
   错防重入窗/判对演出窗共用 locked 门；豁免窗 guard 挂判定前（b34 坑①：miss 在
   core 判定层，guard 须判定前拦+预判与 core 严格同构）========== */
async function uiTapSide(s, demo) {
  if (state.flashOn) {                           /* 闪现窗：输入吞 null（SPEC §2 钩子契约——
                                                    先于 locked 门：闪现期 locked 恒真，吞待闪毕） */
    sfx('pop');
    replayAnim(choicesEl, 'bump');
    return null;
  }
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(choicesEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const dualP1 = isDualGap(q);                   /* dual 第二问：s 域='2'|'4'|'6'（SPEC §R3） */
  if (dualP1 ? (s !== '2' && s !== '4' && s !== '6')
             : (s !== 'L' && s !== 'R' && s !== 'S')) {   /* 非法/相位不符参数 */
    sfx('pop');
    replayAnim(choicesEl, 'bump');
    return null;
  }
  if (!dualP1 && s === 'S' && q.optsN === 2) {   /* ch1 无「一样多」按钮——非法 */
    sfx('pop');
    replayAnim(choicesEl, 'bump');
    return null;
  }
  /* 预判与 core 同构（engTapSide 判定同式；dual 按相位取正确档/正确侧） */
  const sideOk = dualP1 ? s === engDualGap(q) : s === correctSide(q);
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——对选放行；窗后二错照计 miss */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && !sideOk) {
    sfx('pop'); replayAnim(choicesEl, 'bump'); return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapSide(cur, s);
  if (r === null) { sfx('pop'); replayAnim(choicesEl, 'bump'); return null; }
  flashRun++;                                    /* 判定后中止在途闪现尾段（重看/救援闪现）；同步解除闪现态
                                                   （r46 S1：被中止者 abort 退出不清旗标——防误清在途新闪现者，
                                                   旗标由本 ++ 点回收，ask 窗可判定不变式恒立） */
  state.flashOn = false;
  const el = sideBtnEl(s);

  if (r === 'wrong') {                           /* 答错：摇头+错链两段+多的一侧 pulse 一轮 /
                                                    miss≥2 多的一侧 breathe（等数题两侧） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))                       /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + 4938;      /* 链豁免：wrong 1992+150+hint 2496+300=4938（契约 I 真时钟） */
    if (!isDualGap(q)) pulseAnswer(q);           /* 方向级：多的一侧 pulse 一轮（§0.89；dual 第二问=差值相位无方向语义，不 pulse） */
    if (q._miss >= 2) breatheAnswer(q);          /* miss≥2=答案级 breathe（按相位分流：dual P1=正确档） */
    await wait((q._miss === 1 ? 4638 : 1000) * SPEED);   /* 首错链主窗 1992+150+2496=4638 / 错点防重入 1000 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- half（dual 第一步对：转第二问——不推 step 不计 miss，r24/r25 家族范式） ---- */
  if (r === 'half') {
    lastAct = Date.now();                        /* r25 M2 铁律：half 类正确交互解锁处必刷救援钟 */
    if (state.tut === 'help') {                  /* 教学"独"兜底（教学恒 cmp 不达；防御性） */
      state.tut = 'solo'; window.__qcTutSolo = true; ghost.hide(); hopRabbit();
    }
    state.locked = true;
    panelElOf(q.nL > q.nR ? 'L' : 'R').classList.add('lit');   /* 多侧 lit 记忆锚（保持到题末） */
    renderChoices(q);                            /* 第二问差值三档按钮排 */
    sayR(VOICE.gap.key, VOICE.gap.text);         /* qc_ask_gap 多几个呢（r46 段二已注册，实测 1656——SPEC §R7） */
    await wait(GAP_ASK_WIN * SPEED);             /* 第二问问句窗 2700（≥实测 1656+300=1956，窗不调——SPEC §R8 复核） */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：按钮亮+圆点重现对照+确认句拼播） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__qcTutSolo = true;                   /* 帮→独实证（verify 断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  if (cur === run) celebratePanels(run);         /* 圆点重现对照 + 小兔子滑入示范 */
  KIDS.voice.queue([VOICE.right.key].concat(segParts(q)));   /* 确认链（T46 化）：比对啦真棒+复述 4 段 clip 拼播（零 keyless；qc_n 1-20 全在册） */
  /* 判对演出窗动态尾（SPEC-R46 §R8；r37 max(estMs,chainMs) 家族先例）：n≤10 走 v1 尾
     6800（罩最坏 8796；教学迷你关 n≤5 同档——教学分账 17220≤17250 不破）；n>10 走尾
     7400（罩 11-20 实测最坏链 9132——实测 max 1632/键，r46 段二复核 09-22 窗不调） */
  const tailWin = (q.nL > 10 || q.nR > 10) ? 7400 : 6800;
  await wait(2000 * SPEED);                      /* 按钮亮+圆点重现+确认链主窗 */
  if (cur !== run) return r;
  await wait(tailWin * SPEED);                   /* 确认链收尾窗：总 8800|9400 ≥ 最坏链 8796|9168（家族 G/H） */
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
  presentQuiz();                                 /* 新题开题（问句+闪现+消隐） */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_quickcmp） ================= */
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
  flashRun++;                                    /* 通关中止在途闪现 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* qc_right：比对啦，真棒（2256ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层（init 沙盒除外——单元⑪真实写档）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2256+300=2556 */
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
  flashRun++;                                    /* 中止在途闪现（重玩/换关） */
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastFlashAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, flashOn: false };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.quickcmp && sv.quickcmp.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题：问句+闪现（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §2：watch 闪现→点多侧 / turn 你来比一比）
   watch=播 qc_tut_watch「看！圆点闪一闪」→ 延 3400（≥3072+300）→ 问句 qc_ask 2088 →
   延 2400（≥2088+300）→ 闪现 1200+消隐 300 → ghost 移入 800+press 320 → demo 演出窗
   2000+6800（T46 clip 口径：罩确认链最坏 8796=2256+150×4+1344+1464+1368+1464+300）
   → 点中（__qcDemoR='right'）；
   turn=qc_tut_turn「你来比一比」→ 延 2150（≥1848+300）→ presentQuiz 开题 →
   帮（指向正确侧按钮）→首对独（solo）→进正式关。
   watch 全程分账 3400+2400+1200+300+800+320+8800=17220 ≤ 17250（T46 化 09-19：
   帽按 clip 实长分账重定——原 16000 帽基于 estMs 复述 3360，clip 复述 5 段
   实长+gap 5640+600 > 3360，音频完整性优先；单步演示款口径不变） ---------- */
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 点中返回 'right'）
  const mk = (a, b) => ({ kind: 'cmp', nL: a, nR: b, optsN: 2, flash: FLASH_EASY,   // r46：kind 显式（教学恒 cmp——dual 属 ch4+）
    pL: scatter(a, mulberry32(a * 31 + 7)), pR: scatter(b, mulberry32(b * 31 + 7)),
    _miss: 0, _answered: false });
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mk(3, 5), mk(4, 2)] };
}
function tutTurnLevel() {                        // 单题迷你关：2 vs 4（末题=点中返回 'done'→帮转独）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [{ kind: 'cmp', nL: 2, nR: 4, optsN: 2, flash: FLASH_EASY,
             pL: scatter(2, mulberry32(97)), pR: scatter(4, mulberry32(193)),
             _miss: 0, _answered: false }] };
}
async function tutorialWatch() {
  const t0w = Date.now();                       // watch 段计时锚（verify 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, flashOn: false };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* qc_tut_watch：看！圆点闪一闪（3072ms） */
  const run = cur;
  await wait(3400 * SPEED);                      /* ≥3072+300=3372：clip 播完再问句（不撞头） */
  if (cur !== run) return;
  sayR(VOICE.ask.key, VOICE.ask.text);           /* qc_ask：哪边的圆点多（2088ms） */
  await wait(2400 * SPEED);                      /* ≥2088+300=2388 防尾截 */
  if (cur !== run) return;
  await doFlash(false);                          /* 闪现 3 vs 5+消隐（demo 期输入被 demo 门拦） */
  if (cur !== run) return;
  const q = cur.quizzes[0];
  const idx = correctSide(q);                    /* 'R'（3<5 右边多） */
  pointGhostAt(sideBtnEl(idx));                  /* 幽灵手指指向「右边多」按钮 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapSide(idx, true);      /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__qcDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  window.__qcWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.quickcmp = sv.quickcmp || {};
  sv.quickcmp.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 2 vs 4 迷你关「你来比一比」（帮→独），首对放手进正式关 */
  ghost.hide();
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, flashOn: false };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* qc_tut_turn：你来比一比（1848ms） */
  await wait(2150 * SPEED);                      /* ≥1848+300=2148 防尾截（turn 后问句延） */
  if (cur.flat < 0) await presentQuiz();         /* 问句+闪现→开放点选（demo 已撤可真点） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：数一数，比一比 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重玩（重发=破坏教学时序） */
  lastAct = Date.now();
  startLevel(cur.flat);
});
flashBtn.addEventListener('pointerdown', e => {  /* 再看一眼圆点（重看通道 6s 节流） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;
  lastAct = Date.now();                          /* 主动重看重置 idle 锚（b25 M4；节流内仍计主动活动） */
  replayAnim(flashBtn, 'bounce');
  doFlash(true);
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=再看一眼圆点（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;
  lastAct = Date.now();                          /* b31 坑④：节流拒绝也重置（保救援锚） */
  doFlash(true);
});
choicesEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.side-btn');
  if (!p) return;                                // 按钮间空白走 stage 空白路径
  e.preventDefault();
  uiTapSide(p.dataset.side);
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.side-btn') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重放闪现，lastDir 独立节流锚，
   不重置 lastAct——doFlash keepIdle 参兑现（r46 M1：原共享尾部无条件刷 lastAct，
   答案级被饿死为试玩静置实锤）/ 30s 答案级（多侧 breathe+重放闪现）/
   教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（层在时点击全吞却重放闪现） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      breatheAnswer(q);
      doFlash(false, true);                      /* keepIdle：救援重放不刷 idle 锚（lastAct 由下行自刷——r46 M1） */
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重放闪现（不动 lastAct——doFlash keepIdle 兑现，r46 M1） */
    doFlash(false, true);
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
  KIDS.init({ game: 'quickcmp', title: '快速比大小' });   // 存档键 kidsgame_quickcmp（core VER 1.0，家族 C）
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
   真实页同暴露 window.QC——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   tapSide 返回：对且非末题 'right' / 对且末题 'done' / 错 'wrong' /
   闪现窗内 null（吞待闪毕）/ 非法 s 或 ch1 点 'S' null；
   flashNow()=再看一眼（6s 节流内 false；节流拒绝仍重置 lastAct——b31 坑④先例）================= */
window.QC = {
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
    return { kind: q.kind || 'cmp',                    /* SPEC-R46 §R3：题型（cmp 单步/dual 两段） */
             nL: q.nL,                                  /* SPEC §2 钩子契约：左圆点数 */
             nR: q.nR,                                  /* 右圆点数 */
             d: q.kind === 'dual' ? q.d : 0,            /* dual 差值档 {2,4,6}（verify 独立复算=|nL-nR|） */
             phase: q.kind === 'dual' ? q._phase : 0,   /* dual 两段相位 0 方向问|1 差值问 */
             flash: q.flash,                            /* 闪现档 ms 1200|1400 */
             same: q.nL === q.nR,                       /* 等数题布尔（verify 独立复算） */
             options: q.optsN,                          /* 按钮集 2|3（ch1 两选禁 same） */
             step: cur.step,                            /* 全关题号（b33 坑①） */
             miss: q._miss || 0 };
  },
  tapSide(s) { return uiTapSide(s); },
  flashNow() { lastAct = Date.now(); return doFlash(true); },   /* 节流内仍重置救援锚（b31 坑④） */
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点正确侧/正确档，走真实判定链；
    let taps = 0, guard = 0;             // dual 两段=先 half 转相位再点档（half 不计 taps 题未完）；
    while (cur && !cur.done && guard++ < 120) {   // 演出窗/闪现期 locked → 等窗结束重试，非 break
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 2400) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const s = isDualGap(q) ? engDualGap(q) : correctSide(q);
      const r = await uiTapSide(s);
      if (r === 'right' || r === 'done') taps++;
      else if (guard >= 118) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
