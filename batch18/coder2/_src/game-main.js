/* ================= coder2 主逻辑（地图渲染 / 点卡编排与退回 / 运行动画 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH18 §1）：每题=网格地图+小兔（含朝向）+胡萝卜目标（+可选障碍格）+
   指令卡池。点卡入底部程序序列；点序列内指令=退回（紧缩，后继前移）；点「运行」
   小兔逐格动画执行——到达=cd2_right+下一题；撞障碍/出界=cd2_wall、未到=cd2_wrong（三态），
   小兔回起点零惩罚可改程序。
   救援钟口径（§0.7a）：点卡/退回=探索不重置；运行到达推进/读程序重置；失败/空白/兔子不重置。
   教学看-帮-独：watch=演示看地图→排指令→运行到达（返回值存 window.__cd2DemoR §0.27）；
   帮=幽灵手指指向下一步（rescueTarget 同源）；独=首次运行到达放手。
   验收钩子：window.CD2 = { get currentLevel, get quiz(){W,H,start,goal,walls,pool,prog,runState,
   step,miss}, tapPool(i), tapProg(i), run(), start(flat), async autoSolve(), get tutorial,
   get rescues }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/教学/反馈不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次（miss===2） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) {
    lastWrongVoice = now;
    KIDS.voice.play(key, text);
  }
};
/* 指令词朗读（T46 阶段2 2026-09-19：cd2_i_<t> 5 键全在册——静态域 clip 化，
   play 带原文=缺 clip 防御性 TTS 兜底；原 §1「TTS 豁免」口径由 Task#46 红线取代） */
const sayInstr = t => KIDS.voice.play('cd2_i_' + t, INSTR_TEXT[t]);

const CELL = 60;                               // 地图格边长（px，与 head.html .gcell 严格一致；非触摸目标）
const STEP_MS = 430, TURN_MS = 340;            // 运行动画：前进/转向帧时长（×SPEED）
const stageEl = $id('stage'), gridEl = $id('grid'), poolAreaEl = $id('pool-area'),
      cardPoolEl = $id('card-pool'), progBarEl = $id('prog-bar'), runBtnEl = $id('run-btn'),
      answersEl = $id('answers'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let runState = 'idle';                          // 'idle'|'running'|'win'|'fail'（SPEC 钩子）
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;                            // 救援触发计数（CD2.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardPoolEl.querySelector('.card[data-i="' + i + '"]');
const progSlotEl = j => progBarEl.querySelector('.pslot[data-j="' + j + '"]');
const goalCellEl = () => gridEl.querySelector('.gcell.goal');
const cellAt = (x, y) => gridEl.querySelector('.gcell[data-k="' + x + ',' + y + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  runBtnEl.innerHTML = ICONS.play;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.speakerSmall;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：放卡=双音上扬 / 退回=低柔单音（轻反馈不惩罚） */
const cardHi = () => { if (!VERIFY) { KIDS.audio.note(760, 0.09, 0, 0.5); KIDS.audio.note(950, 0.12, 0.07, 0.4); } };
const takeLo = () => { if (!VERIFY) KIDS.audio.note(520, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
/* 地图：W×H 草地格（棋盘双色）+障碍格灌木+目标格胡萝卜+绝对定位小兔（含朝向） */
function renderGrid(q) {
  gridEl.innerHTML = '';
  gridEl.style.setProperty('--gw', q.W);
  gridEl.style.setProperty('--gh', q.H);
  const wallSet = wallKeySet(q);
  for (let y = 0; y < q.H; y++) for (let x = 0; x < q.W; x++) {
    const c = document.createElement('div');
    c.className = 'gcell' + ((x + y) % 2 ? ' alt' : '');
    c.dataset.k = x + ',' + y;
    if (wallSet[x + ',' + y]) { c.classList.add('wall'); c.innerHTML = ICONS.bush; }
    if (x === q.goal.x && y === q.goal.y) { c.classList.add('goal'); c.innerHTML = ICONS.carrot; }
    gridEl.appendChild(c);
  }
  const b = document.createElement('div');
  b.id = 'bunny';
  b.setAttribute('aria-label', '小兔');
  b.innerHTML = '<div id="bunny-rot"><div class="dir-arrow" aria-hidden="true"></div>' +
    '<div class="bunny-body">' + KIDS.assets.rabbit('normal', 46) + '</div></div>';
  gridEl.appendChild(b);
  bunnyHome();
}
/* 小兔归位起点朝向（渲染/失败回退共用） */
function bunnyHome() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  moveBunny({ x: q.start.x, y: q.start.y, dir: q.start.dir });
}
function moveBunny(f) {
  const b = $id('bunny'), r = $id('bunny-rot');
  if (!b || !r) return;
  b.style.transform = 'translate(' + (f.x * CELL) + 'px,' + (f.y * CELL) + 'px)';
  r.style.transform = 'rotate(' + (f.dir * 90) + 'deg)';
}
function bumpAnim() {
  const b = gridEl.querySelector('.bunny-body');
  if (!b) return;
  b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
}
/* 指令卡池：data-t=类型；点后 .gone（入程序）；救援/帮 breathe、pulse 三连 */
function renderPool(q) {
  cardPoolEl.innerHTML = '';
  q.pool.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card t-' + c.t;
    b.dataset.i = i;
    b.dataset.t = c.t;
    b.style.background = CARD_PALETTE[c.t];
    b.setAttribute('aria-label', '指令卡 ' + INSTR_TEXT[c.t]);
    b.innerHTML = '<span class="ci">' + instrIcon(c.t) + '</span><span class="ct">' +
      INSTR_TEXT[c.t] + '</span>';
    cardPoolEl.appendChild(b);
  });
}
/* 程序序列条：slots=池大小个槽（虚线）；已排卡显示 mini 指令（可点退回）。
   循环作用域分组（审查 M2）：rep 卡与其后 2 位槽包进 .pgroup 虚线框——
   「重复的是框里这几张」视觉锚点（与展开语义 min(2,后继) 对齐，REF 模板作用域恒 2 张） */
function renderProg(q) {
  progBarEl.innerHTML = '';
  const mkSlot = j => {
    const b = document.createElement('button');
    const t = j < q._prog.length ? q.pool[q._prog[j]].t : null;
    b.className = 'pslot' + (t ? ' full t-' + t : '');
    b.dataset.j = j;
    if (t) b.style.background = CARD_PALETTE[t];
    b.setAttribute('aria-label', t ? '第' + (j + 1) + '条指令 ' + INSTR_TEXT[t] + '，点一点放回去' : '第' + (j + 1) + '条，空');
    b.innerHTML = t ? '<span class="ci">' + instrIcon(t) + '</span><span class="ct">' + INSTR_TEXT[t] + '</span>'
                    : '<span class="num">' + (j + 1) + '</span>';
    return b;
  };
  let j = 0;
  while (j < q.slots) {
    const t = j < q._prog.length ? q.pool[q._prog[j]].t : null;
    if (t === 'rep2' || t === 'rep3') {
      const grp = document.createElement('span');
      grp.className = 'pgroup';
      grp.appendChild(mkSlot(j));
      if (j + 1 < q.slots) grp.appendChild(mkSlot(j + 1));   /* 作用域后 2 位（含空槽=「往框里放」暗示） */
      if (j + 2 < q.slots) grp.appendChild(mkSlot(j + 2));
      progBarEl.appendChild(grp);
      j += 3;
    } else {
      progBarEl.appendChild(mkSlot(j));
      j++;
    }
  }
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
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn）单段 queue 单通道 */
function openingSpeak(turn) {
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key]);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearRescueVisual();
  runState = 'idle';
  renderGrid(q);
  renderPool(q);
  renderProg(q);
  renderStep();
}

/* ================= 点卡主路径（真实点击 / CD2 钩子 / autoSolve / 教学演示共用） ================= */
/* uiTapPool(i, demo)：点池中第 i 张卡 → 追加程序末槽 + 指令词朗读（cd2_i_ clip，T46）；
   demo=true 仅 tutorialWatch 演示通道（豁免 locked 门） */
function uiTapPool(i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    if (!demo) sfx('pop');                        /* §0.22 吞输入轻叮（审查 m4，对齐家族口径） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const t = q.pool[i] && q.pool[i].t;
  const r = engTapPool(cur, i);
  if (r === null) {
    /* 嵌套拦截（审查 F2）：rep 卡前 1-2 位有 rep=落重复作用域——专属提示非静默 */
    if ((t === 'rep2' || t === 'rep3') && q._prog.length) {
      const n = q._prog.length;
      for (let k = n - 1; k >= n - 2 && k >= 0; k--) {
        const pt = q.pool[q._prog[k]].t;
        if (pt === 'rep2' || pt === 'rep3') {
          sfx('pop');
          KIDS.voice.play('cd2_loop', '循环块里不放循环块哦');   /* T46 clip 化（cd2_loop 在册） */
          return false;
        }
      }
    }
    return false;
  }
  cardHi();
  const el = cardEl(i);
  if (el) el.classList.add('gone');
  renderProg(q);                                  /* 全量重排（分组框随新卡即时归位，审查 M2） */
  sayInstr(q.pool[i].t);                         // 指令词=cd2_i_ clip（T46 阶段2）
  if (state.tut === 'help') scheduleHelpGhost(350);
  return 'placed';
}
/* uiTapProg(j)：点程序第 j 指令=退回池（后继前移紧缩）；空槽/非法下标 false。
   退回=探索零惩罚（§0.7a） */
function uiTapProg(j) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof j !== 'number' || j < 0 || j >= q._prog.length) return false;
  const ti = q._prog[j];                         // 退回前留档池卡索引
  const r = engTapProg(cur, j);
  if (r === null) return false;
  takeLo();
  const el = cardEl(ti);
  if (el) el.classList.remove('gone');           // 池卡复活（避免全池重渲染闪烁）
  renderProg(q);                                 // 程序条紧缩重排
  if (state.tut === 'help') scheduleHelpGhost(350);
  return r;
}

/* ================= 运行主路径（engRun 纯算对账 + 逐帧动画） ================= */
/* uiRun(demo)：点「运行」→ 展开程序逐帧执行（前进 STEP_MS/转向 TURN_MS/撞停 bump）；
   到达=cd2_right+推进；撞障碍出界=cd2_wall、未到=cd2_wrong（sayW 三态）+回起点零惩罚；
   失败防重入窗 1000ms（§0.26 b16 定案 b17 M1 实锤，禁偏离）；身份守卫 const run=cur */
async function uiRun(demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) { if (!demo) sfx('pop'); return false; }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (q._prog.length === 0) {                    // 空程序：轻拍提示不计数
    sfx('pop');
    runBtnEl.classList.remove('nudge'); void runBtnEl.offsetWidth; runBtnEl.classList.add('nudge');
    return false;
  }
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const plan = engRun(cur);
  if (!plan) return false;
  state.locked = true;
  runState = 'running';
  clearRescueVisual();
  sayR(VOICE.run.key, VOICE.run.text);           // 出发喽
  await wait(500 * SPEED);
  if (cur !== run) return false;
  q._trace = [{ x: plan.frames[0].x, y: plan.frames[0].y, dir: plan.frames[0].dir }];
  for (let k = 1; k < plan.frames.length; k++) {
    const f = plan.frames[k];
    moveBunny(f);
    q._trace.push({ x: f.x, y: f.y, dir: f.dir });
    if (f.bump) {                                // 撞障碍/出界：撞停反馈
      bumpAnim();
      await wait(430 * SPEED);
    } else if (f.x === plan.frames[k - 1].x && f.y === plan.frames[k - 1].y) {
      await wait(TURN_MS * SPEED);               // 原地转向帧（位置不变）
    } else {
      await wait(STEP_MS * SPEED);               // 前进帧
    }
    if (cur !== run) return false;
  }
  const res = engCommitRun(cur, plan);
  if (plan.win) {                                // 到达：反馈+推进（点对重置救援钟 §0.7a）
    runState = 'win';
    lastAct = Date.now();
    if (state.tut === 'help') {                  // 教学"独"：首次运行到达放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    const g = goalCellEl();
    if (g) { g.classList.add('win'); }
    sfx('ok');
    sayR(VOICE.right.key, VOICE.right.text);
    await wait(2100 * SPEED);                    // 等 cd2_right（≈1.8s）主体播完
    if (cur !== run) return res;
    state.locked = false;
    if (res === 'done') winFlow();
    else renderQuiz();
    return res;
  }
  /* 失败：撞墙/出界专属句；未到=wrong 三态；miss 已计入；连错 2 次给视觉线索（§0.7） */
  runState = 'fail';
  sfx('fail');
  if (plan.hit > 0) sayR(VOICE.wall.key, VOICE.wall.text);
  else sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);
  if (q.miss >= 2) applyRescueVisual(q);
  if (state.tut === 'help') scheduleHelpGhost(400);
  await wait(1000 * SPEED);                      /* 错点防重入窗 1000ms（b16 定案） */
  if (cur !== run) return res;
  bunnyHome();                                   // 小兔回起点（零惩罚，程序保留可改）
  await wait(480 * SPEED);
  if (cur !== run) return res;
  runState = 'idle';
  state.locked = false;
  return res;
}

/* ================= 读程序（主动学习重置救援钟 §0.7a）：逐条朗读已排指令 ================= */
function uiHear() {
  if (!cur) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  if (q._prog.length) {
    /* 读程序（T46 阶段2）：cd2_i_* 段链全在册 → queue 拼播（零 keyless 段，Mj-1 满足）；
       缺段整句 TTS 兜底（shop-math playChain 家族先例；本任务后段链恒在册=防御死分支） */
    const ks = q._prog.map(i => 'cd2_i_' + q.pool[i].t);
    if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
    else KIDS.voice.say(q._prog.map(i => INSTR_TEXT[q.pool[i].t]).join('，'));
  } else {
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
  return true;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（不带"明天："前缀，core 模板自带） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  clearTimeout(helpTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
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
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  runState = 'idle';
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.coder2 && sv.coder2.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  openingSpeak();
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
  /* 指新目标前清旧 breathe/pulse（numberdet P1-3：逐位引导不清除会叠亮失效） */
  clearRescueVisual();
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 同源策略）：先退错卡→再点应放池卡→齐了指运行 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (!t) return;
  if (t.act === 'prog') pointGhostAt(cardEl(t.i));
  else if (t.act === 'undo') pointGhostAt(progSlotEl(t.j));
  else pointGhostAt(runBtnEl);
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.coder2.tutSeen）
   看=演示看地图（目标格 breathe）→排指令（前 2 张完整手指演示，其余快放控时长）
   →幽灵手指点「运行」→运行到达（demo 通道，返回值存 window.__cd2DemoR §0.27）
   →立即重发同关（确定性关卡，题面一致），"你来排一排"交接 →帮=指向下一步；独=放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const g = goalCellEl();
  if (g) g.classList.add('breathe');             /* 看地图：目标格呼吸 1.3s */
  await wait(1300 * SPEED);
  let demoR = null;
  for (let k = 0; k < q.ref.length; k++) {
    const i = freePoolFor(q, q.ref[k]);
    if (i < 0) break;
    if (k < 2) {                                 // 前 2 张：手指移动+按压+入槽（点选语义看清）
      pointGhostAt(cardEl(i));
      await wait(720 * SPEED);
      ghost.press();
      await wait(260 * SPEED);
      uiTapPool(i, true);
      await wait(430 * SPEED);
    } else {                                     // 其余：手指原地快放（时长控制 ≤16s）
      ghost.press();
      await wait(150 * SPEED);
      uiTapPool(i, true);
      await wait(240 * SPEED);
    }
  }
  if (g) g.classList.remove('breathe');
  pointGhostAt(runBtnEl);                        // 指运行按钮
  await wait(700 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  demoR = await uiRun(true);                     // demo 通道豁免 locked（演示吞输入）
  window.__cd2DemoR = demoR;                     /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.coder2 = sv.coder2 || {};
    sv.coder2.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help' };
  runState = 'idle';
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  openingSpeak(true);                            // 交接顺序链：cd2_tut_turn（§0.6 单通道）
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈（§0.16） */
    sfx('pop');
    return;
  }
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.22 吞输入轻叮 */
  uiHear();                                      /* 读程序（主动学习重置救援钟） */
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.card');
  if (c) {                                       // 指令卡：入程序主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapPool(Number(c.dataset.i));
    return;
  }
  const p = e.target.closest('.pslot');
  if (p) {                                       // 程序槽：退回该指令（空槽=轻叮不静默）
    e.preventDefault();
    const q = cur && cur.quizzes[cur.step];
    if ((state.locked || state.demo) && !state.won) { sfx('pop'); return; }
    if (!q || Number(p.dataset.j) >= q._prog.length) { sfx('pop'); return; }
    uiTapProg(Number(p.dataset.j));
    return;
  }
  const rb = e.target.closest('#run-btn');
  if (rb) {                                      // 运行按钮
    e.preventDefault();
    uiRun();
    return;
  }
  if (e.target.closest('button, #grid, #tip')) return;   /* §0.16：地图=题面观察非空白（b16 S5 教训：div 型区域显式排除） */
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 救援视觉（§0.21/§1）：目标格 breathe + 首条应放指令卡 pulse 三连
   （undo 态=程序槽 breathe 指引先退回；run 态=运行按钮 pulse 指引出发） ================= */
function clearRescueVisual() {
  gridEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  gridEl.querySelectorAll('.win').forEach(k => k.classList.remove('win'));
  cardPoolEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
  progBarEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
  runBtnEl.classList.remove('pulse');
}
function applyRescueVisual(q) {
  const g = goalCellEl();
  if (g) { g.classList.remove('breathe'); void g.offsetWidth; g.classList.add('breathe'); }
  const t = rescueTarget(q);
  if (!t) return;
  if (t.act === 'prog') {
    const el = cardEl(t.i);
    if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  } else if (t.act === 'undo') {
    const el = progSlotEl(t.j);
    if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
  } else {
    runBtnEl.classList.remove('pulse'); void runBtnEl.offsetWidth; runBtnEl.classList.add('pulse');
  }
}

/* ================= 无操作看护：14s 救援（目标格 breathe+应放卡 pulse §0.21）
   / 教学"帮"5s 重演示一次。救援钟只被运行到达推进/读程序重置（§0.7a：
   点卡/退回/运行失败/空白/兔子不重置） ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo || runState === 'running') return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    applyRescueVisual(q);
    rescueCount++;
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'coder2', title: '小兔编程' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.CD2 = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const prog = [];
    for (let k = 0; k < q.slots; k++) prog.push(k < q._prog.length ? q.pool[q._prog[k]].t : null);
    return { kind: 'coder2', W: q.W, H: q.H,                    /* SPEC §1 钩子契约 */
      start: { x: q.start.x, y: q.start.y, dir: q.start.dir },
      goal: { x: q.goal.x, y: q.goal.y },
      walls: q.walls.map(w => [w[0], w[1]]),
      pool: q.pool.map(c => ({ t: c.t })),
      prog: prog, runState: runState, step: cur.step, miss: q.miss };
  },
  tapPool(i) { return uiTapPool(i); },
  tapProg(i) { const r = uiTapProg(i); return r === false ? false : r; },
  run() { return uiRun(); },
  start(flat) {                                  /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                            /* UI 路径自动通关：清程序→依 REF 排卡→运行 */
    const run = cur;                             // 身份守卫：winFlow 延迟 proceed 换关即中止
    let n = 0, quizzes = 0, ok = true;
    while (cur && cur === run && !cur.done && n++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      while (q._prog.length) {                   // 清空已排（退回探索零惩罚）
        if (uiTapProg(q._prog.length - 1) === false) break;
      }
      for (const t of q.ref) {
        await uiTapPool(freePoolFor(q, t));
      }
      const r = await uiRun();
      quizzes++;
      if (r !== 'right' && r !== 'done') { ok = false; break; }
    }
    return { done: !!(cur && cur.done && cur === run), quizzes: quizzes, ok: ok };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
