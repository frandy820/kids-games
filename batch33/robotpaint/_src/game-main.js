/* ================= 机器画师 robotpaint 主逻辑 r18（五题型分相状态机 / 记忆闪现 / 双画师
   / 组指令判定 / 教学 / 救援 / 推进）
   玩法相位机（每题）：pick 组指令（目标侧按题型呈现——plain/neg/edit/mem 指令卡或
   闪现图案；指令槽 3+属性块池 8 轴分组+组内打乱——当前槽高亮，点该轴块=填入+pop+名音；
   点异轴块=轻叮吞+当前槽 flash 方向级；点已填槽=清空回该轴）→（三槽满「画！」亮起）
   tapGo → paint 作画演出（rp_go 1176 + 颜色底/形状轮廓/大小缩放 3×800，锁定窗 ≥3876）
   → compare 比对（成品与目标并排+印记 像√/不像?）：全对=rp_like 前导+确认链
   [rp_right, 名音×槽序]（三段恒，窗 8634）/ 任一错=错链 [rp_wrong, rp_hint]
   （1848+150+2712+300=5010 豁免窗，契约 I）+并排晃动，miss≥2（ch3+）不一致轴
   应选块 breathe（答案级——首错只「哪不一样呀」不指轴）；错后回 pick 槽保留可改
   （比对窗保留供对照——改槽重画）→ 对→下一题 pick / 末题 won。
   r18 题型分流：neg=否定指令卡（打叉芯片=封闭集补全推理，比对相位揭示目标）/
   edit=两步修改（pick 画布显起始画，目标卡呈 from✗→to✓ 芯片行，比对揭示终态）/
   mem=记忆复现（开题 rp_mem 闪现句 clip 起算 FLASH_WIN=estMs(17)+300 呈现窗，窗毕罩住
   [data-covered]，比对揭示重编码，回 pick 再罩——记后画不退化）/ dual=双画师并行
   （四框=gA|pA|gB|pB，当前任务对 .cur 高亮；任务一判对 painted1 定格+like 印记、
   槽复位切任务二；quiz miss 两任务累计）。
   救援（契约 B/K）：paint/compare 演出相位与 mem 闪现窗豁免 idle（演出即引导）；
   pick 14s 方向级=rp_q+当前槽 pulse（lastDir 独立锚）/30s 答案级=应选块 breathe+
   目标值名音；教学"帮"5s 重演示。
   错反馈（契约 I/I 补/J）：guard 挂 uiTapGo 入口——豁免窗（真时钟 5010）内重画吞、
   窗后照常（本款 tapGo 才产生 wrong——豁免窗护重画间隔）；语义链 flat≥3 只 10s 节流；
   startLevel 重置锚。语音链 T46 化后全 clip（mem 闪现句=rp_mem 单段链，零 keyless）。
   验收钩子：window.RP（verify 页与真实页都暴露——b29 坑⑥）。 */
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
   语义链 [rp_wrong, rp_hint] 全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const tipEl = $id('tip'), easelEl = $id('easel'),
      paperGoal = $id('paper-goal'), paperPaint = $id('paper-paint'),
      paperGoal2 = $id('paper-goal2'), paperPaint2 = $id('paper-paint2'),
      frameGoal = document.querySelector('.frame[data-role="target"]'),
      framePaint = document.querySelector('.frame[data-role="painted"]'),
      frameGoal2 = document.querySelector('.frame[data-role="gB"]'),
      framePaint2 = document.querySelector('.frame[data-role="pB"]'),
      capGoal = $id('cap-goal'), capPaint = $id('cap-paint'),
      capGoal2 = $id('cap-goal2'), capPaint2 = $id('cap-paint2'),
      slotsEl = $id('slots'), boardEl = $id('board'), artistBtn = $id('btn-artist'),
      goBtn = $id('btn-go'), ghostEl = $id('ghost');

/* ---------- r18 存档迁移 IIFE（CH_LEN 5→6 键基变化；必须先于 KIDS.init 读档执行——
   build 次序断言）。①旧基矛盾态：c=2..4 若 lv[c+'-0'] 在而 lv[(c-1)+'-5'] 缺
   （新基按序推进下不可能——旧基 CH_LEN=5 档打到 c 章 0 关必先打完 (c-1) 章 5 关）
   → 一次性重置（levels 清空+教学重播）；ch1 矛盾态（'1-1' 在而 '1-0' 缺）同判。
   ②脏键守卫：键须 ^(\d+)-(\d+)$ 且 章号≥1（上界放开——生成关章号随 flat 递增防误清）、
   关号 0..CH_LEN-1=5（旧基越界键如 '1-5' 存在=新基关号 5 合法保留；'1-6' 脏键重置）。 ---------- */
(function () {
  try {
    const raw = localStorage.getItem('kidsgame_robotpaint');
    if (!raw) return;
    const sv = JSON.parse(raw);
    if (!sv || !sv.levels) return;
    const lv = sv.levels;
    let bad = false;
    for (let c = 2; c <= 4; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { bad = true; break; }
    }
    if (!bad && lv['1-1'] !== undefined && lv['1-0'] === undefined) bad = true;
    if (!bad) {
      for (const k of Object.keys(lv)) {
        const m = /^(\d+)-(\d+)$/.exec(k);
        if (!m || +m[1] < 1 || +m[2] < 0 || +m[2] > CH_LEN - 1) { bad = true; break; }
      }
    }
    if (bad) {
      Object.keys(lv).forEach(k => delete lv[k]);
      delete sv.robotpaint;                    /* levels 重置=回教学链（迁移 reset 例教学重播） */
      try { localStorage.setItem('kidsgame_robotpaint', JSON.stringify(sv)); } catch (e) {}
    }
  } catch (e) {}
})();

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let paintRun = 0;                               // 作画演出运行令牌（重开/换关中止在途演出）
let flashRun = 0;                               // mem 闪现窗运行令牌（重开/换关中止在途闪现）
window.__rpPaintLog = [];                       // 作画分相位实录（verify 帧内容对账：['color','shape','size']）
window.__rpDemoLog = [];                        // 教学演示填槽实录（verify 对账）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const LV_ALL = Array.from({ length: CH_LEN }, (_, i) => i);
const blockEl = i => boardEl.querySelector('.block[data-i="' + i + '"]');
const slotEl = i => slotsEl.querySelector('.slot[data-slot="' + i + '"]');
const liveQuiz = () => cur && cur.step < cur.quizzes.length ? cur.quizzes[cur.step] : null;

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  artistBtn.innerHTML = artistSvg(62);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：填块=双音上行 / 错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染（渲染即引擎：DOM 锚与 quiz 真值一一对应——契约 M） ================= */
const TIP_TEXT = { plain: VOICE.q.text, neg: VOICE.neg.text, edit: VOICE.edit.text,
                   mem: '看清楚，记住它', dual: VOICE.dual.text,
                   paint: '小画师在画啦', compare: '', won: '画得真像' };
function renderTip(q) {
  if (!q) { tipEl.textContent = TIP_TEXT.plain; return; }
  if (q.judged === 'diff' && (q.phase === 'compare' || q.phase === 'pick'))
    tipEl.textContent = q.phase === 'compare' ? VOICE.wrong.text : VOICE.hint.text;
  /* 比对中=「哪不一样呀」；错后回 pick=「哪不一样呀，再看看」（引导改槽重画） */
  else if (q.phase === 'compare' || q.phase === 'won') tipEl.textContent = VOICE.like.text;
  else if (q.phase === 'paint') tipEl.textContent = TIP_TEXT.paint;
  else if (q.kind === 'dual' && q.tIdx === 1) tipEl.textContent = '再说清楚第二张';
  else tipEl.textContent = TIP_TEXT[q.kind] || TIP_TEXT.plain;
}
function renderSlots(q, just) {
  slotsEl.innerHTML = '';
  q.slots.forEach((s, i) => {
    const d = document.createElement('div');
    d.className = 'slot';
    d.dataset.slot = String(i);
    d.dataset.axis = s.axis;                     // 轴标签恒在（槽位固定序）
    if (s.val) {                                 // 已填槽=属性图+小字名（帧内容锚）
      d.dataset.val = s.val;
      d.innerHTML = '<div class="s-val">' + blockSvg(s.val, 44) +
        '<div class="s-name">' + nameOf(s.val) + '</div></div>';
      if (just != null && i === just) d.classList.add('fill-pop');   // 仅新填槽 pop
    }
    d.insertAdjacentHTML('afterbegin', '<div class="s-axis">' + AXIS_LABEL[s.axis] + '</div>');
    if (i === q.slotIdx && q.phase === 'pick' && !q.solved) d.classList.add('cur');   // 当前待填槽
    slotsEl.appendChild(d);
  });
}
function renderBoard(q) {
  if (q.phase !== 'pick' || q.solved) { boardEl.style.display = 'none'; boardEl.innerHTML = ''; return; }
  boardEl.style.display = '';
  boardEl.innerHTML = '';
  q.blocks.forEach((b, i) => {
    const el = document.createElement('button');
    el.className = 'block pop';
    el.dataset.i = String(i);
    el.dataset.axis = b.axis;                    // verify 对账（渲染即引擎）
    el.dataset.val = b.val;
    el.setAttribute('aria-label', nameOf(b.val) + '块');
    el.innerHTML = blockSvg(b.val, 52) + '<div class="c-name">' + nameOf(b.val) + '</div>';
    el.style.animationDelay = (i * 50) + 'ms';
    boardEl.appendChild(el);
  });
}
/* ---------- r18 目标侧渲染：pick 未判=按题型呈现（neg 否定卡/edit 修改卡/mem 闪现→罩/
   plain·dual 图案卡）；paint/compare/won 或已判（neg/edit 错后回 pick 保持揭示——不测
   记忆测推理）=揭示目标图案。mem 恒罩于 pick（错后回 pick 再罩——记后画不退化） ---------- */
function goalHtml(q) {
  if (q.phase === 'pick') {
    if (q.kind === 'mem') return q.flashDone ? coverCardHtml() : propSvg(q.target);   /* 闪现中显·闪毕罩 */
    if (q.judged === null) {
      if (q.kind === 'neg') return negCardHtml(q);
      if (q.kind === 'edit') return editCardHtml(q);
    }
  }
  return propSvg(q.target);
}
const CAP_GOAL = { plain: '要画的', neg: '想一想', edit: '改一改', mem: '记住它' };
function renderEaselState(q) {
  const dual = q.kind === 'dual';
  easelEl.classList.toggle('dual', dual);
  capGoal.textContent = dual ? '要画的①' : (CAP_GOAL[q.kind] || '要画的');
  capPaint.textContent = dual ? (q.tIdx === 0 ? '小画师①在画' : '小画师①画好啦')
                              : '小画师画的';
  capGoal2.textContent = '还要画的②';
  capPaint2.textContent = dual && q.tIdx === 1 ? '小画师②在画' : '小画师②等着';
  paperGoal.innerHTML = dual ? propSvg(q.goals[0]) : goalHtml(q);   /* 契约 M 锚 g[data-target] */
  if (dual) paperGoal2.innerHTML = propSvg(q.goals[1]);             /* 第二目标卡（同锚作用域内） */
  frameGoal.classList.toggle('cur', dual && q.tIdx === 0);
  framePaint.classList.toggle('cur', dual && q.tIdx === 0 && !q.t1Done);
  frameGoal2.classList.toggle('cur', dual && q.tIdx === 1);
  framePaint2.classList.toggle('cur', dual && q.tIdx === 1);
}
/* ---------- r18 画布渲染：三态（待命画师 / 作画演出段 / 成品定格+印记）；
   dual 双画布（A=任务一画布，t1Done 后定格 painted1+like 印记；B=任务二活动画布）；
   edit pick 未判=画布显起始画（引擎 q.start——契约 M 锚与引擎一致） ---------- */
function renderCanvas(frame, paper, mode) {
  if (mode.waiting) {                            // 未画：画师待命站画纸旁
    frame.classList.remove('settled');
    paper.innerHTML = artistSvg(96);
    frame.querySelectorAll('.stamp').forEach(s => s.remove());
    return;
  }
  if (mode.ph) {                                 // paint 演出分相位段（JS 逐段驱动，局部三元组）
    frame.classList.remove('settled');
    paper.innerHTML = propSvg(mode.triple, { ph: mode.ph, paint: true });
    frame.querySelectorAll('.stamp').forEach(s => s.remove());
    return;
  }
  frame.classList.add('settled');                // 定格（compare / 错后 pick 保留 / dual 任务一成果）
  paper.innerHTML = propSvg(mode.triple, { paint: true });
  frame.querySelectorAll('.stamp').forEach(s => s.remove());
  if (mode.judge) {
    const st = document.createElement('div');
    st.className = 'stamp';
    st.dataset.judge = mode.judge;               // 'like'像√ / 'diff'不像?（契约 M 锚）
    st.textContent = mode.judge === 'like' ? '像' : '不像';
    frame.appendChild(st);
  }
}
function canvasMode(q, ph, pT) {
  if (ph) return { triple: pT, ph: ph };                        /* 作画演出段（painted 判定前置的槽组装） */
  if (q.painted) return { triple: q.painted, judge: q.judged };
  if (q.kind === 'edit' && q.phase === 'pick') return { triple: q.start };
  return { waiting: true };
}
function renderPainted(q, ph, pT) {
  if (q.kind === 'dual') {
    if (q.t1Done) {
      renderCanvas(framePaint, paperPaint,                      /* 画布A：任务一成果定格+like */
        { triple: q.painted1, judge: 'like' });
    } else {
      renderCanvas(framePaint, paperPaint, canvasMode(q, ph, pT));
    }
    renderCanvas(framePaint2, paperPaint2,                      /* 画布B：任务二活动 / 未到=待命 */
      q.tIdx === 1 ? canvasMode(q, ph, pT) : { waiting: true });
    return;
  }
  renderCanvas(framePaint, paperPaint, canvasMode(q, ph, pT));
}
function renderGo(q) {                           // 「画！」三槽满+pick 才亮（错后常驻——重画）
  const ready = q && !q.solved && q.phase === 'pick' && q.slotIdx >= q.slots.length;
  goBtn.classList.toggle('ready', !!ready);
}
function renderPhase(q, just) {
  if (!q) return;
  renderTip(q);
  renderSlots(q, just);
  renderBoard(q);
  renderGo(q);
}
function renderQuiz(just) {
  const q = liveQuiz();
  if (!q) return;
  renderPhase(q, just);
  renderEaselState(q);
  if (q.phase !== 'paint') renderPainted(q, null);
}
function renderStep() {                          // HUD 本关 6 题进度点
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
    let done = true;
    for (let l = 0; l < CH_LEN; l++) if (!sv.levels[c + '-' + l]) done = false;
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 动画辅助 ================= */
function pulseSlot(idx) {                        // 方向级：当前槽再 pulse（错反馈/救援共用）
  const el = slotEl(idx);
  if (el) replayAnim(el, 'flash');
}
function clearBreathe() {
  boardEl.querySelectorAll('.block.breathe').forEach(b => b.classList.remove('breathe'));
}
function shakeFrames() {                         // 首错方向级：成品与目标并排轻微晃动
  replayAnim(frameGoal, 'shake');
  replayAnim(framePaint, 'shake');
}
/* miss≥2 答案级（ch3+）：不一致轴的应选块 breathe + 并排该轴 pulse（找不同辅助） */
function showDiffHelp(q) {
  if (!DCH_BREATHE[cur.dch]) return;             // ch3+ 才指错轴（首错不指轴，SPEC §-r18）
  const axes = diffAxes(q);
  axes.forEach(ax => {
    const bi = q.blocks.findIndex(b => b.axis === ax && b.val === q.target[ax]);
    if (bi >= 0) { const be = blockEl(bi); if (be) replayAnim(be, 'breathe'); }
    const si = q.slots.findIndex(s => s.axis === ax);
    if (si >= 0) pulseSlot(si);
  });
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
/* 教学"帮"阶段指向：当前待填槽轴的应选块（仅 pick 相位） */
function pointHelpNext() {
  const q = liveQuiz();
  if (!q || q.phase !== 'pick') return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(blockEl(i));
}

/* ================= 开题（题型分流）：plain=rp_q / neg=rp_neg / edit=rp_edit /
   dual=rp_dual（任务二回 rp_q）/ mem=rp_mem 闪现句 clip 起算呈现窗（T46 化单段链；
   呈现窗=FLASH_WIN=estMs(17)+300 实算预算冻结（家族 T）；窗毕罩住+rp_q 开放交互）；
   开题重置救援双锚 ================= */
function startQuizFlow(lead) {
  setTimeout(() => {
    if (!cur || state.won || state.demo) return;
    const q = liveQuiz();
    if (!q || q.solved || q.phase !== 'pick') return;
    if (q.kind === 'mem' && !q.flashDone) { memFlashFlow(q); return; }
    sayOpener(q);
    lastAct = Date.now();                        /* pick 开放重置救援钟（§0.7a） */
    lastDir = Date.now();
    if (state.tut === 'help') pointHelpNext();   // 教学"帮"：pick 开放再指（不泄底）
  }, lead * SPEED);
}
function sayOpener(q) {
  if (q.kind === 'neg') sayR(VOICE.neg.key, VOICE.neg.text);          /* rp_neg 3600 */
  else if (q.kind === 'edit') sayR(VOICE.edit.key, VOICE.edit.text);  /* rp_edit 3768 */
  else if (q.kind === 'dual' && q.tIdx === 0) sayR(VOICE.dual.key, VOICE.dual.text);  /* rp_dual 3792 */
  else sayR(VOICE.q.key, VOICE.q.text);                               /* rp_q（plain/dual 任务二/mem 罩后） */
}
/* mem 闪现流：rp_mem 闪现句 clip（T46 化）→ FLASH_WIN 呈现窗（锁定=演出即引导）
   → 罩住+rp_q 开放。令牌守卫：重开/换关中止；早退路径必解锁（防悬挂锁）。 */
async function memFlashFlow(qStart) {
  const run = cur, token = ++flashRun;
  state.locked = true;
  KIDS.voice.queue([VOICE.mem.key]);                   /* mem 闪现句 clip 单段链（T46 化） */
  await wait(FLASH_WIN * SPEED);                       /* 呈现窗=estMs(17)+300（实算） */
  if (token !== flashRun || cur !== run) return;       /* 换关：startLevel 已重置 state */
  const q = liveQuiz();
  if (!q || q !== qStart || q.solved || q.phase !== 'pick') { state.locked = false; return; }
  q.flashDone = true;                                  /* 呈现完 → 罩住（goalHtml 转罩卡） */
  state.locked = false;
  renderEaselState(q);
  sayR(VOICE.q.key, VOICE.q.text);
  lastAct = Date.now();
  lastDir = Date.now();
}

/* ================= 点块主路径（真实点击 / RP.tapBlock / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（块区容器 bump 微动效——家族 D）；
   异轴点选=吞不填+当前槽 flash（说得清楚=按槽序说，方向级引导） ================= */
async function uiTapBlock(i, demo) {
  if (!cur || state.won) {                       // 通关终态吞（真实点击兜底）
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = liveQuiz();
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.blocks.length) {   // 越界=null+pop+bump
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return null;
  }
  if (q.phase !== 'pick' || q.solved) return null;   // paint/compare 相位吞（任务书：返回 null）
  if ((state.locked || state.demo) && !demo) {   // 演出/教学锁/mem 闪现窗：轻叮+bump（吞 false）
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const r = engTapBlock(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }
  if (r === 'wrong-axis') {                     /* 异轴块吞：轻叮+当前槽 flash 方向级 */
    sfx('pop');
    dodgeLo();
    pulseSlot(q.slotIdx);
    replayAnim(boardEl, 'bump');
    return false;
  }
  /* ---- fill / ready（填入当前槽+pop+名音；末槽填满=「画！」亮起待画） ---- */
  lastAct = Date.now();                          /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次有效填入 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopArtist();
  }
  clearBreathe();
  const filledIdx = q.slotIdx - 1 < 0 ? slotsEl.children.length - 1 : q.slotIdx - 1;
  sfx('coin');
  KIDS.voice.play(nameClip(q.slots[filledIdx].val), nameOf(q.slots[filledIdx].val));   // 名音绑定
  renderPhase(liveQuiz(), filledIdx);
  await wait(260 * SPEED);                       /* 填槽 pop 演出窗 */
  return r;
}

/* ================= 点槽（已填槽可改：清空回该轴选择——指令可编辑，SPEC 明示；
   空槽=null；r18 无预填锁定槽） ================= */
function uiTapSlot(i) {
  if (!cur || state.won) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  const q = liveQuiz();
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.slots.length) return null;
  if (q.phase !== 'pick' || q.solved) return null;   // 非 pick 相位（paint/compare 吞 null）
  if (state.locked || state.demo) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  const s = q.slots[i];
  if (!s.val) { pulseSlot(i); return null; }     // 空槽无可清（pulse=这是当前可选轴）
  const preVal = s.val;                          // 清空前存值（engTapSlot 置 null 后引用同读）
  const r = engTapSlot(cur, i);
  if (r !== 'clear') return null;
  lastAct = Date.now();                          /* 主动改槽=推进（重置救援钟） */
  clearBreathe();
  sfx('pop');
  KIDS.voice.play(nameClip(preVal), nameOf(preVal));   // 清出属性名音（回该轴再选）
  renderPhase(liveQuiz());
  return r;
}

/* ================= 「画！」主路径（RP.tapGo / autoSolve / 教学演示共用）
   判定集中点：三槽满+pick → paint 作画演出（go 1176+3×800，锁定窗 ≥3876）→
   compare 比对（like 前导+确认链 / wrong 错链+豁免窗 5010）；
   豁免窗 guard（契约 I 补，真时钟禁 SPEED 缩水窗）：窗内重画吞（错链播完才可重画）；
   dual 任务一判对=确认链后 engAfterConfirm 切任务二（槽复位重选）；edit 起始画在
   pick 相位已定格画布（重画=改指令覆盖之）。 ================= */
async function uiTapGo(demo) {
  if (!cur || state.won) {                       // 通关终态吞（真实点击兜底）
    sfx('pop');
    replayAnim(goBtn, 'bump');
    return false;
  }
  const q = liveQuiz();
  if (!q || q.solved) return null;
  if (q.phase !== 'pick') return null;           // paint/compare 相位（任务书：返回 null）
  if (q.slotIdx < q.slots.length) {              // 三槽未满：go 按钮未就绪
    sfx('pop');
    pulseSlot(q.slotIdx);
    return null;
  }
  if ((state.locked || state.demo) && !demo) {   // 演出/教学锁/mem 闪现窗：轻叮+bump（吞 false）
    sfx('pop');
    replayAnim(goBtn, 'bump');
    return false;
  }
  /* 契约 I 补：错链豁免窗（真时钟 5010）内重画吞——错链播完才可重画 */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil) {
    sfx('pop');
    replayAnim(goBtn, 'bump');
    return false;
  }
  const run = cur, token = ++paintRun;           /* 身份守卫：演出窗内重开/换关丢弃旧续体 */
  state.locked = true;
  /* ---- paint 相位：rp_go 播报 → 颜色底 → 形状轮廓 → 大小缩放（各 ~800ms 演出） ---- */
  if (!engToPaint(cur)) { state.locked = false; return null; }
  renderPhase(liveQuiz()); renderTip(liveQuiz());
  KIDS.voice.play(VOICE.go.key, VOICE.go.text);  /* rp_go：画！（1176ms） */
  await wait(GO_MS * SPEED);
  const pT = { color: q.slots[0].val, shape: q.slots[1].val, size: q.slots[2].val };
  window.__rpPaintLog = [];
  const phs = ['color', 'shape', 'size'];
  for (const ph of phs) {
    if (token !== paintRun || cur !== run) return false;
    framePaint.classList.add('artist-painting');
    if (q.kind === 'dual' && q.tIdx === 1) framePaint2.classList.add('artist-painting');
    renderPainted(q, ph, pT);                    /* 演出段（局部三元组——作画过程可视化） */
    window.__rpPaintLog.push(ph);
    await wait(PAINT_STEP_MS * SPEED);           /* 单属性段 ≤800ms（SPEC §4 演出窗） */
  }
  framePaint.classList.remove('artist-painting');
  framePaint2.classList.remove('artist-painting');
  if (token !== paintRun || cur !== run) return false;
  /* ---- compare 比对：引擎判定（painted=三槽值忠实组装——错轴可视化） ---- */
  const res = engTapGo(cur);
  if (!res) { state.locked = false; return null; }
  renderPainted(q, null);
  renderTip(q);
  renderPhase(q);
  if (res.r === 'wrong') {
    /* 错=不像：错链 [rp_wrong, rp_hint] 全 clip + 并排晃动（首错方向级不指轴）；
       miss≥2（ch3+）不一致轴应选块 breathe（答案级）；槽保留可改、比对窗保留 */
    dodgeLo();
    shakeFrames();
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))  /* 错链=rp_wrong 1848+150+rp_hint 2712+300 */
      wrongChainUntil = Date.now() + 5010;        /* 豁免窗 5010（契约 I；救援 interval 让路） */
    await wait(2600 * SPEED);                     /* 晃动+印记演出窗（豁免窗真时钟继续跑） */
    if (token !== paintRun || cur !== run) return res.r;
    engBackToPick(cur);                           /* 回 pick：槽保留可改（重画=改槽再画） */
    state.locked = false;
    lastAct = Date.now();                         /* 比对结束=新决策点（重置救援钟） */
    renderQuiz();                                 /* 目标侧同步（mem 再罩/neg·edit 保持揭示） */
    if (q.miss >= 2) showDiffHelp(q);             /* 答案级：miss≥2 才指错轴（ch3+）——渲染后加（防重绘清 breathe） */
    return res.r;
  }
  /* ---- 对=像：like 前导 + 确认链 [rp_right, 名音×槽序]（恒三段——r18 全档三槽） ---- */
  chimeGoal();
  replayAnim(framePaint, 'flash-ok');
  if (res.nextTask) replayAnim(framePaint2, 'flash-ok');
  KIDS.voice.play(VOICE.like.key, VOICE.like.text);   /* rp_like：画得真像（1752ms） */
  await wait(LIKE_WIN * SPEED);                   /* ≥1752+300 前导窗 */
  if (token !== paintRun || cur !== run) return 'right';
  const names = q.slots.map(s => nameClip(s.val));     /* 槽序名音（三段恒） */
  KIDS.voice.queue([VOICE.right.key].concat(names));   /* 确认链=right 首段+名音按槽序（全 clip） */
  await wait(CONFIRM_WIN * SPEED);                    /* 链实长+300=8634（恒三段） */
  if (token !== paintRun || cur !== run) return 'right';
  state.locked = false;
  engAfterConfirm(run);                           /* 本题终态 phase='won' / dual 切任务二 */
  if (run.tutLevel) return 'right';               /* 教学演示完成——交接由 tutorialWatch 接管 */
  if (engWon(run)) { winFlow(); return 'done'; }  /* 末题末槽=通关 */
  renderQuiz(); renderStep();                     /* 下一题（pick 相位）/ dual 任务二（pick） */
  startQuizFlow(600);
  return res.r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末）
   注：确认链已在 compare 相位播完，winFlow 不再重播 right（celebrate 承载收尾） ---------- */
function nextHint(flat) {
  const f = flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  paintRun++;
  flashRun++;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, LV_ALL);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const starsN = LV_ALL.reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: starsN, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：winFlow 传 lim-1（原 null 实参形态废止） */
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
  paintRun++;
  flashRun++;
  ghost.hide();
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  window.__rpPaintLog = [];
  window.__rpDemoLog = [];
  renderQuiz(); renderStep(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.robotpaint && sv.robotpaint.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) { startQuizFlow(400); return; }    // verify 页：照常开题（相位推进供驱动）
  if (freshTut) { tutorialWatch(); return; }
  startQuizFlow(600);                            // 常规开题：稍候即题面句（pick 即刻开放）
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（SPEC §3）
   看=教学关目标红色大圆形（三轴完整流程）：rp_tut_watch「看！小画师要画画啦」(3384)
   → 幽灵手指按槽序点 红/圆/大 三块填槽（'fill'×2+'ready'）→ 指向「画！」→ go 判对
   （演出+确认链）→ __rpDemoR='right'；
   帮=交接真关 genLevel(0)，rp_tut_turn「你来当小老师」→首题 pick 后指向应选块；
   独=首次有效填入放手。 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  cur = genTutLevel();                           // 教学关（红色大圆形，tutLevel=true）
  lastWrongVoice = 0; wrongChainUntil = 0;
  window.__rpPaintLog = []; window.__rpDemoLog = [];
  renderQuiz(); renderStep(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* rp_tut_watch：看！小画师要画画啦（3384ms） */
  await wait(3684 * SPEED);                      /* ≥3384+300：clip 播完再演（不撞头） */
  if (state.tut !== 'watch') return;
  const run = cur;
  /* 幽灵手指按槽序点三块（pointGhostAt 内 800 移动+按压，920 窗覆盖） */
  for (let t = 0; t < 3; t++) {
    const q = run.quizzes[0];
    const idx = correctIdx(q);
    if (idx < 0) return;
    pointGhostAt(blockEl(idx));
    await wait(920 * SPEED);
    const dR = await uiTapBlock(idx, true);      /* demo 通道豁免 locked 门（演示吞真实输入） */
    window.__rpDemoLog.push(q.slots[q.slotIdx - 1 >= 0 ? q.slotIdx - 1 : 2].val);
    if (dR !== 'fill' && dR !== 'ready') return;
    if (t === 2) break;
    await wait(60 * SPEED);
    if (state.tut !== 'watch' || cur !== run) return;
  }
  /* 指向「画！」按钮 → go 判对（演出+like+确认链在内演完） */
  pointGhostAt(goBtn);
  await wait(920 * SPEED);
  if (state.tut !== 'watch' || cur !== run) return;
  const goR = await uiTapGo(true);
  window.__rpDemoR = goR;                        /* 教学演示结果（go 判对='right'）——SPEC §3 */
  /* 存教学已看标记 + 交接真关（你来当小老师） */
  const sv = KIDS._save() || {};
  sv.robotpaint = sv.robotpaint || {};
  sv.robotpaint.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  ghost.hide();
  /* turn 首题换定制「黄色小方形」（SPEC §3「turn=你来当小老师（黄色小方形）帮/独」——
     seeded 首题目标≠定制句不符；三槽全空完整三指令（kind='plain'）；turn 后 solo 接真关余题；
     审查 R-4 修复 2026-09-11 沿用） */
  cur = genLevel(0);                             // 真实首关骨架（确定性，重发同关）
  const tq = cur.quizzes[0];
  tq.target = { color: 'yel', shape: 'squ', size: 'small' };
  tq.slots = AXES.map(ax => ({ axis: ax, val: null }));
  tq.slotIdx = 0; tq.phase = 'pick'; tq.painted = null; tq.judged = null;
  tq.miss = 0; tq.solved = false;
  lastWrongVoice = 0; wrongChainUntil = 0;
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now(); lastDir = Date.now();
  window.__rpPaintLog = [];
  renderQuiz(); renderStep(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);         /* rp_tut_turn：你来当小老师（2016ms） */
  startQuizFlow(2316);                           /* ≥2016+300 后播首题题面（pick 即刻开放） */
}

/* ================= 底栏与舞台交互 ================= */
function hopArtist() {
  artistBtn.classList.remove('hop'); void artistBtn.offsetWidth; artistBtn.classList.add('hop');
}
artistBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopArtist();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  const q = liveQuiz();
  if (!q) return;
  if (q.phase === 'pick' && q.slotIdx < q.slots.length) {
    pulseSlot(q.slotIdx);                        /* 方向提示：当前槽 pulse+rp_q */
    sayR(VOICE.q.key, VOICE.q.text);
  } else {
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 比对期：哪不一样呀，再看看 */
  }
});
goBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.won) return;
  uiTapGo();
});
slotsEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.slot');
  if (!p) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  uiTapSlot(Number(p.dataset.slot));
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

/* ================= 无操作看护（契约 B/K）：paint/compare 演出相位与 mem 闪现窗豁免
   idle（演出即引导，不计时）；pick 14s 方向级（rp_q+当前槽 pulse，lastDir 独立节流锚，
   不动 lastAct）/30s 答案级（应选块 breathe+目标值名音）；教学"帮"5s 重演示 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默 */
  const q = liveQuiz();
  if (!q || q.solved || q.phase !== 'pick') return;   /* paint/compare 演出相位不计时（演出即引导） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const ci = correctIdx(q);
    if (ci >= 0) { const ce = blockEl(ci); if (ce) replayAnim(ce, 'breathe'); }
    if (q.slotIdx < q.slots.length) {
      const tv = q.target[q.slots[q.slotIdx].axis];
      KIDS.voice.play(nameClip(tv), nameOf(tv));
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：rp_q+当前槽 pulse（不动 lastAct） */
    KIDS.voice.play(VOICE.q.key, VOICE.q.text);
    if (q.slotIdx < q.slots.length) pulseSlot(q.slotIdx);
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
  KIDS.init({ game: 'robotpaint', title: '机器画师' });   // 存档键 kidsgame_robotpaint（core VER 1.0，家族 C；迁移 IIFE 已先行）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = Math.max(0, lim - 1);                             /* 家族 A：停留日末关（可重玩） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   verify 页与真实页都暴露——b29 坑⑥） ================= */
window.RP = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur) return null;
    const qi = Math.min(cur.step, cur.quizzes.length - 1);   /* done 后返回末题（phase='won'） */
    const q = cur.quizzes[qi];
    if (!q) return null;
    const out = { kind: q.kind, mem: !!q.mem, flashDone: !!q.flashDone,
             target: { color: q.target.color, shape: q.target.shape, size: q.target.size },
             slots: q.slots.map(s => ({ axis: s.axis, val: s.val })),
             slotIdx: q.slotIdx,                              /* 当前待填槽下标（三槽满=3） */
             blocks: q.blocks.map(b => ({ axis: b.axis, val: b.val })),   /* 恒 8 全量（组内打乱序） */
             phase: q.phase,                                  /* 'pick'|'paint'|'compare'|'won' */
             painted: q.painted ? { color: q.painted.color, shape: q.painted.shape, size: q.painted.size } : null,
             judged: q.judged,                                /* 'like'|'diff'|null */
             tIdx: q.tIdx, t1Done: q.t1Done,
             step: qi, miss: q.miss };   /* step=题号；槽进度由 slotIdx 独立承载 */
    if (q.negMap) {
      out.negMap = {};
      AXES.forEach(ax => { if (q.negMap[ax]) out.negMap[ax] = q.negMap[ax].slice(); });
    }
    if (q.edits) out.edits = q.edits.map(e => ({ axis: e.axis, from: e.from, to: e.to }));
    if (q.start) out.start = { color: q.start.color, shape: q.start.shape, size: q.start.size };
    if (q.goals) out.goals = q.goals.map(g => ({ color: g.color, shape: g.shape, size: g.size }));
    return out;
  },
  tapBlock(i) { return uiTapBlock(i); },          /* 'fill'/'ready'/异轴·演出吞 false/越界·非 pick null */
  tapSlot(i) { return uiTapSlot(i); },            /* 'clear'/空槽·非 pick null */
  tapGo() { return uiTapGo(); },                  /* 'right'/'done'/'wrong'/未满·非 pick null/豁免窗吞 false */
  get state() { return { locked: state.locked, won: state.won, demo: state.demo, tut: state.tut }; },
  async autoSolve() {                    // UI 路径自动点完当前关（等演出相位→按槽序点→画）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 500) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.phase !== 'pick') { await waitPick(q); continue; }
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const cq = cur.quizzes[cur.step];
      if (!cq || cq.solved || cq.phase !== 'pick') continue;
      if (cq.slotIdx < cq.slots.length) {         // 待填槽：点应选块（fill/ready）
        const ci = correctIdx(cq);
        if (ci < 0) break;
        const r = await uiTapBlock(ci);
        if (r === 'fill' || r === 'ready') taps++;
        else if (r === false || r === null) await wait(200);
        continue;
      }
      /* 三槽满：错后槽保留错值（比对 diff）——先清错轴重填再画（比较槽当前值 vs 目标，
         不用 painted（旧成品）：豁免窗内 tapGo 吞→wait 循环重试，窗后成功；
         dual 任务二同构（target 已切 goals[1]）） */
      if (cq.judged === 'diff') {
        let dirty = false;
        for (let si = 0; si < cq.slots.length; si++) {
          const s = cq.slots[si];
          if (s.val === cq.target[s.axis]) continue;
          const rc = await uiTapSlot(si);         // 清错轴槽（豁免窗不拦槽操作）
          if (rc === 'clear') dirty = true;
          const ci = correctIdx(cq);
          if (ci >= 0) { const rb = await uiTapBlock(ci); if (rb) taps++; }
        }
        if (dirty) continue;
      }
      const r = await uiTapGo();
      if (r === 'right' || r === 'done') taps++;
      else if (r === false || r === null) await wait(200);
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
/* 轮询等演出相位结束（autoSolve/verify 驱动用；真实等待不猜时长） */
async function waitPick(q) {
  const span = (GO_MS + 3 * PAINT_STEP_MS + LIKE_WIN + CONFIRM_WIN + 2500) * SPEED + 8000;
  const t0 = Date.now();
  while (Date.now() - t0 < span) {
    if (!cur || cur.done) return true;
    const cq = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)];
    if (cq && (cq.solved || cq.phase === 'pick')) return true;
    await wait(50);
  }
  return !!(cur && cur.done);
}
