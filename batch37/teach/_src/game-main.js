/* ================= teach 主逻辑（三步小课：示范 → 兔子学 → 纠错；r5 难度改造）
   开题（presentQuiz）：task clip 2160+300 → 任务句 keyless「教小兔子数N个苹果」
   窗=max(4005, estMs(动态字数)+300)（r5：9-10 字句 4005-4350）→ [关首题 n≥10
   追加按群引导句 5040] → 开放点托盘。
   示范步（uiTapApple）：点托盘苹果一颗飞入碗一颗（碗计数=苹果点阵逐个显示，每颗标
   序号——数感锚）；碗容量=N 点满自动确认 'confirmed'（数数自由探索不计 miss）→
   兔子步演出。**r5 按群计数**：n≥10 策略条 [一个一个数|两个两个数|五个五个数]——
   组模式 tap 一次一组飞入（.grp 组块聚拢=分组点亮）+组末 keyless say「四个/九个…」
   （累计报数——shapecount r3 先例）；切换策略=本题碗清零重数（不罚：大数用群数才
   高效、逐个数可行但慢，不惩罚只慢——miss 恒只在 fix 步）。
   兔子步（rabbitTurn，纯演出零判定）：兔子探头看碗（与兔子句窗重叠起演）→ 兔子句
   keyless say「兔子说：我来试试」**窗与摆苹果重叠**（演出窗=max(3360+300, m×250)
   +卡入场 800）→ 学习碗逐颗摆 q.seq 颗**每颗标报数数字**（r5 错误类型三类：漏数
   skip m=n-1/重复 dup m=n+1/换序 swap m=n——孩子读序列判定非只看数量）→
   engRabbitDone（phase→'fix'）+诊断 4 卡入场 800 → 开放。
   纠错步（uiTapFix）：**生成化 4 选**（正确+同型错参+异型+无错——视觉匹配失效须读
   兔子数数过程判定；answerOf=findIndex(good) 唯一解锚）；选对=兔子修正确认演出
   （skip 补颗标 X/swap 两颗归位——重渲正确序列 .fixed 高亮；dup 拿走第二颗重复
   .away）+学会庆祝（happy+hop）+确认链 [tch_right] 窗 3420 精确（家族 H）→末题
   'done' 通关/否则下一题；选错=兔子困惑摇头+错链 [tch_wrong,tch_hint] 豁免窗
   4866=2064+150+2352+300 真时钟（契约 I/I 补：窗内错点吞 false 不计 miss/对选放行/
   窗后二错照计）+梯度：首错方向级（卡行 wiggle 不指答案）/miss≥2 答案级（好卡
   breathe）。**r5 教到会**：engTapFix 内 mhits[etype] 首选对 ++/错选清零，连续 2
   =掌握（persistWin 写档 sv.teach.hits）。
   救援（契约 B/K）：14s 方向级=重读任务句+兔子探头（lastDir 独立节流锚）/
   30s 答案级=好卡 breathe+重读任务句（仅 fix 相位有答案级；show 相位救援=重读
   任务句）；错链豁免窗让路；教学帮 5s 重演示。
   验收钩子：window.TCH = { get currentLevel, get quiz{phase('show'|'rabbit'|'fix'),
   n, etype, errAt, seq, m, repeat, group, bowl, cards[4], answer, step(全关题号
   0-4——b33 坑①), miss}, tapApple(i), tapFix(i), setGroup(g), start(flat),
   autoSolve(), get mastered }——真实页同暴露（b29 坑⑥）。
   tapApple 返回：单颗入碗 'in'/组块飞入 'group'/第 N 颗点满自动确认 'confirmed'
   （转 rabbit 演出）/碗满后再点 false/演出期·越界 null。setGroup 返回：切换重置
   'reset'/小数无策略条·同策略 null/演出期 null/非 show 相位 false。tapFix 返回：
   i=answer 'right'（末题 'done'）/错卡 'wrong'/豁免窗内错卡吞 false/非 fix 相位·
   演出期 null（b33 坑① phase 吞输入语义）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播（教学迷你关 flat=-1）；flat≥3 走 10s 节流
   （契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), rabbitWrapEl = $id('rabbit-wrap'), rabbitBodyEl = $id('rabbit-body'),
      rabbitSayEl = $id('rabbit-say'), teachDotsEl = $id('teach-dots'), learnDotsEl = $id('learn-dots'),
      qTextEl = $id('q-text'), trayEl = $id('tray'), fixcardsEl = $id('fixcards'),
      groupbarEl = $id('groupbar'),
      rabbitBtn = $id('btn-rabbit'), ghostEl = $id('ghost'), stageEl = $id('stage');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const trayBtnAt = i => trayEl.querySelector('.t-apple[data-apple="' + i + '"]');
const groupBtnAt = i => trayEl.querySelector('.t-group[data-group="' + i + '"]');
const fixBtnAt = i => fixcardsEl.querySelector('.fixcard[data-fix="' + i + '"]');
/* 组块数（r5 按群）：块 b 覆盖 [b*g,(b+1)*g)，末块=余数 n-b*g */
const blockCount = q => Math.ceil(q.n / q.group);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  $id('teach-bowl').innerHTML = ICONS.bowl;
  $id('learn-bowl').innerHTML = ICONS.bowl;
  rabbitBodyEl.innerHTML = KIDS.assets.rabbit('normal', 84);
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：苹果入碗=中音短跳 / 判对=双音上行+钱币 /
   答错=低柔单音 / 卡入场=轻叮 */
const chimeApple = () => { if (!VERIFY) KIDS.audio.note(659.25, 0.12, 0, 0.5); };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染（渲染即引擎——契约 M 帧内容锚：碗苹果点阵（带序号标签）/
   托盘数（单颗/组块）/诊断 4 卡 label 与 quiz 真值同源；verify 断言
   #teach-dots .apple 数===quiz.bowl、#learn-dots .apple 数===quiz.m（fix 相位）、
   .apple .num 标签序列===quiz.seq） ================= */
function renderTray(q) {                        // 托盘：逐个模式 N+2 颗（n≥10 缩为 48px wrap）；
  trayEl.innerHTML = '';                        // 组块模式 ceil(n/g) 块（块内 g 颗小苹果）
  if (q.group === 1) {
    const count = q.n + TRAY_EXTRA;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('button');
      b.className = 't-apple' + (q.n >= GROUP_MIN ? ' sm' : '');
      b.dataset.apple = i;                      // 帧内容锚（verify 断言渲染即引擎）
      b.innerHTML = ICONS.apple;
      trayEl.appendChild(b);
    }
  } else {
    const blocks = blockCount(q);
    for (let b = 0; b < blocks; b++) {
      const inBlock = Math.min(q.group, q.n - b * q.group);
      const btn = document.createElement('button');
      btn.className = 't-group';
      btn.dataset.group = b;                    // 帧内容锚（verify 断言渲染即引擎）
      let inner = '';
      for (let k = 0; k < inBlock; k++) inner += ICONS.apple;
      btn.innerHTML = inner;
      trayEl.appendChild(btn);
    }
  }
  trayEl.classList.remove('off', 'dim');
}
function renderGroupBar(q) {                    // 策略条（r5 按群）：n≥10 在场，active=当前策略
  groupbarEl.innerHTML = '';
  if (q.n < GROUP_MIN) { groupbarEl.classList.add('off'); return; }
  for (const m of GROUP_MODES) {
    const b = document.createElement('button');
    b.className = 'gmode' + (q.group === m.g ? ' active' : '');
    b.dataset.g = m.g;
    b.textContent = m.label;
    groupbarEl.appendChild(b);
  }
  groupbarEl.classList.remove('off');
}
const CARD_ICONS = { skip: ICONS.fixSkip, dup: ICONS.fixDup, swap: ICONS.fixSwap, none: ICONS.fixNone };
function renderFixCards(q) {                    // 诊断 4 卡常驻 DOM（off 态只隐不删——布局可量可测）
  fixcardsEl.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button');
    b.className = 'fixcard';
    b.dataset.fix = i;                          // 帧内容锚（verify 断言渲染即引擎）
    b.innerHTML = CARD_ICONS[q.cards[i].kind] + '<span class="fx-label">' + q.cards[i].label + '</span>';
    fixcardsEl.appendChild(b);
  }
  fixcardsEl.classList.add('off');
  fixcardsEl.classList.remove('wig');
}
function addAppleTo(el, num) {                  // 碗内点阵+一颗（tch-pop 弹入——数感锚非数字；
  const d = document.createElement('div');      // num=序号标签（teach 碗=已数到几/learn 碗=兔子报数）
  d.className = 'apple';
  d.innerHTML = ICONS.apple;
  if (num != null) {
    const n = document.createElement('span');
    n.className = 'num';
    n.textContent = num;
    d.appendChild(n);
  }
  el.appendChild(d);
  return d;
}
function addGroupTo(el, k, start) {             // r5 分组点亮：一组 k 颗聚拢进 .grp（组内紧组间疏）
  const g = document.createElement('div');
  g.className = 'grp';
  for (let j = 1; j <= k; j++) addAppleTo(g, start + j);
  el.appendChild(g);
  return g;
}
function setQText(phase, q) {
  const key = phase === 'fix' && q && q.repeat ? 'fixRep' : phase;
  qTextEl.textContent = phase === 'show' && q ? taskTTS(q) : (PHASE_TEXT[key] || '');
}
function renderStep() {                         // HUD 本关 5 题进度点
  const tray2 = $id('step-dots');
  tray2.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray2.appendChild(i);
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
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderTray(q);
  renderGroupBar(q);
  teachDotsEl.innerHTML = '';
  learnDotsEl.innerHTML = '';
  renderFixCards(q);
  setQText('show', q);
  rabbitBodyEl.innerHTML = KIDS.assets.rabbit('normal', 84);
  rabbitWrapEl.classList.remove('hop', 'shake', 'peek');
  rabbitSayEl.classList.remove('show');
  renderStep();
}

/* ================= 开题演出：task clip → 任务句 keyless（动态窗）→ [按群引导句] → 开放
   演出锁=真时钟 showUntil（tapApple 演出期返 null——测试驱动须轮询等可交互） ================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  const sayWin = Math.max(TASK_SAY_MIN, estMs(taskTTS(q)) + 300);        /* r5 动态窗（≥9 字下限） */
  const groupWin = (cur.step === 0 && q.n >= GROUP_MIN) ? GROUP_SAY_WIN : 0;   /* 关首题大数引导句 */
  state.locked = true;
  state.showUntil = Date.now() + (TASK_CLIP_WIN + sayWin + groupWin) * SPEED + 140;   // 真时钟演出锁（余量）
  sfx('click');
  KIDS.voice.play(VOICE.task.key, VOICE.task.text);       /* tch_task：教兔子数一数（2160ms） */
  await wait(TASK_CLIP_WIN * SPEED);                      /* ≥2160+300=2460：clip 播完再读题 */
  if (cur !== run || token !== showRun) return;
  KIDS.voice.play(taskClipOf(q), taskTTS(q));             /* 任务句（T46 化：tch_task_N 全句 clip——零 keyless） */
  await wait(sayWin * SPEED);                             /* ≥estMs(动态字数)+300（≥4005） */
  if (cur !== run || token !== showRun) return;
  if (groupWin) {
    KIDS.voice.play('tch_ghint', GROUP_HINT_TTS);         /* r5 按群引导句（T46 clip 3120 ≤ 窗 5040——窗不动） */
    await wait(groupWin * SPEED);
    if (cur !== run || token !== showRun) return;
  }
  state.locked = false;
  lastAct = Date.now();                          /* 演出完成开放点托盘（b25 M4：重置 idle 锚） */
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
/* 教学"帮"阶段指向（按相位）：show=托盘下一颗苹果（逐个模式——教学迷你关 n<10 无组块）/
   fix=好卡（教学期泄答案=家族先例，帮→独后撤）；rabbit=纯演出无指向 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.phase === 'show') {
    const next = Math.min(q.bowl, q.n + TRAY_EXTRA - 1);
    pointGhostAt(trayBtnAt(next));
  } else if (q.phase === 'fix') {
    pointGhostAt(fixBtnAt(answerOf(q)));
  }
}

/* ================= 吞输入轻叮（家族 D：必配可见回应——小课堂场景 bump 微动效） ================= */
function denyBump() { sfx('pop'); replayAnim(sceneEl, 'bump'); }

/* ================= 示范步：点托盘入碗（真实点击 / TCH.tapApple / autoSolve / 教学演示
   共用）——数数自由探索不计 miss；碗容量=N 点满自动确认。
   r5 双模式：逐个（tap 一颗）/组块（tap 一组 g 颗+组末计数 say——按群高效，
   逐个数可行但慢，不惩罚只慢） ================= */
async function uiTapApple(i, demo) {
  if (!cur || state.won) { denyBump(); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) { denyBump(); return null; }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0) { denyBump(); return null; }   // 越界
  if (q.phase !== 'show') { denyBump(); return false; }   // 碗满/兔子演出期：吞输入轻叮（家族 D）
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */

  if (q.group === 1) {                           /* ---- 逐个模式：i=苹果下标 ---- */
    if (i >= q.n + TRAY_EXTRA) { denyBump(); return null; }
    const r = engTapApple(cur, i, q.n + TRAY_EXTRA);
    if (r === null) { denyBump(); return null; }
    const tEl = trayBtnAt(i);
    if (tEl) tEl.style.visibility = 'hidden';      // 托盘苹果飞走
    addAppleTo(teachDotsEl, q.bowl);               // 碗内点阵+1（标已数到几）
    chimeApple();
    lastAct = Date.now();                          /* 正确推进重置救援钟（§0.7a） */
    if (r === 'in') return r;
    rabbitTurn(demo);                              /* 'confirmed'：→ 兔子步（fire-and-forget） */
    return r;
  }

  /* ---- 组块模式（r5 按群）：i=块下标，tap 一次一组飞入 ---- */
  const blocks = blockCount(q);
  if (i >= blocks) { denyBump(); return null; }
  /* r5 审查 M-1：take=该块实际颗数（块 b 覆盖 [b*g, min((b+1)*g, n))）与全局剩余取小——
     原式取全局剩余，乱序先点 1 颗的末块碗中飞入整组 g 颗，破坏碗点阵数感锚 */
  const take = Math.min(Math.min(q.group, q.n - i * q.group), q.n - q.bowl);
  if (take <= 0) { denyBump(); return false; }     // 碗满防御（常态 phase 门先拦）
  const bEl = groupBtnAt(i);
  if (bEl) bEl.style.visibility = 'hidden';        // 组块飞走
  let r = null;
  for (let k = 0; k < take; k++) {                 // 引擎层逐颗判定（i*g+k 视觉锚）
    r = engTapApple(cur, i * q.group + k, blocks * q.group);
    if (r === null) break;
  }
  if (r === null) { denyBump(); return null; }
  addGroupTo(teachDotsEl, take, q.bowl - take);    // 分组点亮：一组聚拢（组内标序号）
  chimeApple();
  lastAct = Date.now();
  if (r === 'confirmed') { rabbitTurn(demo); return r; }
  KIDS.voice.play(groupClipOf(q.bowl), groupTTS(q.bowl));   /* r5 组末计数（T46：tch_n_N clip，非阻塞） */
  return 'group';
}

/* ================= 切换数数策略（r5 按群）：本题碗清零重数——换个方法从头数
   （不罚：重置非错误不响 bump 只轻叮 click；小数无策略条） ================= */
function uiSetGroup(g) {
  if (!cur || state.won) { denyBump(); return null; }
  if (state.locked || state.demo || Date.now() < state.showUntil) { denyBump(); return null; }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (q.phase !== 'show') { denyBump(); return false; }   // 相位门（b33 坑①）
  if (q.n < GROUP_MIN) return null;              // 小数无策略条（恒逐个）
  if (!GROUP_MODES.some(m => m.g === g)) { denyBump(); return null; }
  if (q.group === g) { denyBump(); return null; } // 同策略无效
  engResetBowl(cur);                             // 引擎层碗清零（重数）
  q.group = g;
  teachDotsEl.innerHTML = '';                    // 碗点阵复位
  renderTray(q);                                 // 托盘重渲（单颗↔组块）
  renderGroupBar(q);
  sfx('click');
  KIDS.voice.play(gmClipOf(g), GROUP_MODES.find(m => m.g === g).label);   /* 策略 label（T46：tch_gm_* clip，非阻塞） */
  lastAct = Date.now();
  return 'reset';
}

/* ================= 兔子步演出（纯演出零判定——SPEC §6 r5）
   兔子探头看碗（peek 800 与兔子句窗重叠起演）→ 兔子句 keyless「兔子说：我来试试」
   **窗与摆苹果重叠**（r5 压缩演出：演出窗=max(3660, m×250)+卡入场 800——大数不再
   串行叠加）→ 学习碗逐颗摆 q.seq 颗（每颗标报数数字——r5 错误类型可视载体）→
   engRabbitDone（phase→'fix'）+诊断 4 卡入场 800 → 开放。 ================= */
async function rabbitTurn(demo) {
  const run = cur, token = showRun;
  const q = cur.quizzes[cur.step];
  state.locked = true;
  const win = Math.max(RABBIT_SAY_WIN, APPLE_POP_MS * q.m) + CARD_IN_MS;
  state.showUntil = Date.now() + win * SPEED + 140;
  trayEl.classList.add('dim');                   // 碗满：托盘剩余置灰（不能再点）
  setQText('rabbit', q);
  ghost.hide();
  replayAnim(rabbitWrapEl, 'peek');              // 兔子探头看碗（与兔子句重叠）
  KIDS.voice.play('tch_rabbit', rabbitTTS);       // 兔子句（T46 clip 2592 ≤ 窗 3660——窗不动）
  rabbitSayEl.classList.add('show');
  const placing = (async () => {                 // 摆苹果与句窗并行（重叠起演）
    for (let k = 0; k < q.m; k++) {              // 兔子在学习碗逐颗摆 seq[k]（标报数数字）
      if (cur !== run || token !== showRun) return;
      addAppleTo(learnDotsEl, q.seq[k]);
      sfx('pop');
      await wait(APPLE_POP_MS * SPEED);
    }
  })();
  await wait(RABBIT_SAY_WIN * SPEED);            // 句窗（摆并行流中）
  if (cur !== run || token !== showRun) return;
  rabbitSayEl.classList.remove('show');
  await placing;                                 // 等摆完（大数 m×250 可能超句窗）
  if (cur !== run || token !== showRun) return;
  engRabbitDone(cur);                            // phase 'rabbit'→'fix'（演出结束开放纠错）
  renderFixCards(q);                             // 4 卡常驻（重放入场）
  fixcardsEl.classList.remove('off');
  setQText('fix', q);                            // 复现题=「又犯了老毛病」（r5 教到会叙事）
  sfx('click');
  await wait(CARD_IN_MS * SPEED);
  if (cur !== run || token !== showRun) return;
  state.locked = false;
  lastAct = Date.now();
  lastDir = Date.now();
  if (state.tut === 'help') setTimeout(pointHelpNext, 400 * SPEED);   // 帮：转指好卡
}

/* ================= 纠错步（fix 选卡；豁免窗 guard 预判口径 i !== answerOf(q)
   与 core 判定严格同构——b34 坑①） ================= */
async function uiTapFix(i, demo) {
  if (!cur || state.won) { denyBump(); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) { denyBump(); return null; }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i > 3) { denyBump(); return null; }   // 越界（r5 4 卡）
  if (q.phase !== 'fix') { denyBump(); return null; }      // 相位门（b33 坑①：非 fix 相位吞输入）
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     对选放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== answerOf(q)) {
    denyBump(); return false;
  }
  const run = cur, token = showRun;
  const r = engTapFix(cur, i);
  if (r === null) { denyBump(); return null; }
  const el = fixBtnAt(i);

  if (r === 'wrong') {                           /* 选错卡：兔子困惑摇头+错链+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + WROLL_MS * SPEED + 140;
    dodgeLo();
    replayAnim(rabbitWrapEl, 'shake');           // 兔子困惑摇头（SEL：演出层不羞辱孩子）
    if (el) replayAnim(el, 'shake');
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))            /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;      /* 链豁免：2064+150+2352+300=4866 真时钟（契约 I） */
    if (q._miss === 1) replayAnim(fixcardsEl, 'wig');       /* 方向级：卡行整体 wiggle 不指答案 */
    if (q._miss >= 2) {                                    /* miss≥2=好卡 breathe（答案级梯度） */
      const okEl = fixBtnAt(answerOf(q));
      if (okEl) replayAnim(okEl, 'breathe');
    }
    await wait(WROLL_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- right/done（选对：兔子修正确认演出+学会庆祝+确认链 → 下一题/通关，phase 已推进） ---- */
  lastAct = Date.now();
  state.locked = true;
  state.showUntil = Date.now() + CONFIRM_WIN * SPEED + 140;
  if (el) { el.classList.remove('breathe'); el.classList.add('ok'); }
  fixcardsEl.querySelectorAll('.fixcard').forEach((c, k) => { if (k !== i) c.classList.add('dim'); });
  /* r5 修正确认演出（800 < 窗 3420——一次性 await 覆盖）：
     dup=拿走第二颗重复（away 飞离，剩余天然有序）/skip=补漏的数（重渲 1..n 新颗高亮）/
     swap=两颗归位（重渲 1..n 换位颗高亮） */
  if (q.etype === 'dup') {
    const dots = learnDotsEl.querySelectorAll('.apple');
    const second = learnDotsLastDup(q);                 // 第二颗重复的下标
    if (dots[second]) dots[second].classList.add('away');
  } else {
    learnDotsEl.innerHTML = '';
    for (let k = 1; k <= q.n; k++) {
      const d = addAppleTo(learnDotsEl, k);
      if ((q.etype === 'skip' && k === q.errAt) ||
          (q.etype === 'swap' && (k === q.errAt || k === q.errAt + 1))) d.classList.add('fixed');
    }
  }
  rabbitBodyEl.innerHTML = KIDS.assets.rabbit('happy', 84);   // 学会庆祝
  replayAnim(rabbitWrapEl, 'hop');
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key]);           // 确认链=right 单 clip 3420（契约 N 无 keyless）
  await wait(CONFIRM_WIN * SPEED);               // 等 right 播完：3120+300=3420 精确（家族 H）
  if (cur !== run || token !== showRun) return r;
  state.locked = false;
  lastAct = Date.now();
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：watch 演示由 tutorialWatch 接管；
                                                     turn 帮→独后进正式关 */
      if (state.tut === 'help') {
        state.tut = 'solo';                      /* 教学"独"：整题三步走完 → 放手 */
        window.__tchTutSolo = true;              /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
        ghost.hide();
        hopRabbit();
        startLevel(firstFlat);
      }
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                 /* 下一节小课开题 */
  return r;                                      // 'right'
}
/* dup 第二颗重复下标（seq 中 errAt 的 lastIndexOf——r5 修正演出定位） */
function learnDotsLastDup(q) {
  return q.seq.lastIndexOf(q.errAt);
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_teach）；
   r5 教到会：本关末 mhits 快照写 sv.teach.hits + mastered 派生（连续 2 次
   同型首选答对——两轮口径） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  /* verify 沙盒 stub={levels:{}} 无 game 字段=安全跳过（core 内部 save 未 init 时
     level.pass 会炸）；⑪ init 后真实档 v1.0 带 game=真实写档链 */
  if (!sv || !sv.levels || !sv.game) return { chapterDone: false };
  sv.teach = sv.teach || {};
  sv.teach.hits = { skip: cur.mhits.skip, dup: cur.mhits.dup, swap: cur.mhits.swap };
  sv.teach.mastered = { skip: cur.mhits.skip >= 2, dup: cur.mhits.dup >= 2, swap: cur.mhits.swap >= 2 };
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
  sayR(VOICE.right.key, VOICE.right.text);       /* tch_right：兔子学会啦，你是好老师（3120ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(800);                             /* 家族 H：celebrate 2620+800=3420 ≥ right 3120+300=3420（b37 裁决） */
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
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.teach && sv.teach.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §3 + §6 r5）
   watch=N=4/skip/缺3（seq 1,2,4——r5 漏数演示锚）完整三步演示（幽灵手指示范点 4 颗
   → 兔子摆错漏 3 → ghost 点「漏数了3」好卡 → 学会）→ __tchDemoR='done'（gate G2
   期望——errdoc 先例：一节小课完整走完）；
   turn=重立 N=5/dup/重3（seq 1,2,3,3,4,5）迷你关「你来教一教」（示范步起帮：ghost
   按相位指托盘苹果/好卡）→ 整题走完帮→独进正式关。
   时序（家族 G/H/T；r5 分账）：watch 3132 → 开题 task 2460+任务句动态窗 4005（N=4
   9 字 estMs 3705+300）→ ghost 示范 4 颗（首 800+320+3×320）→ 兔子步 max(3660,3×250)
   +卡入场 800=4460 → ghost 指好卡 1120 → right 窗 3420 —— 名义合计
   3132+6465+2080+4460+1120+3420=20677 ≤ 22000（三步完整演示款 ≤22s——b35 M1 裁决款型）。 ---------- */
function tutWatchLevel() {                       // 演示题：N=4，skip 缺 3（兔子摆 1,2,4 →补 3）
  const L = { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
              quizzes: [mkQuiz(4, 'skip', 3, null, 2, false)] };
  L.mhits = { skip: 0, dup: 0, swap: 0 };
  return L;
}
function tutTurnLevel() {                        // 帮→独题：N=5，dup 重 3（1,2,3,3,4,5→拿走一颗 3）
  const L = { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
              quizzes: [mkQuiz(5, 'dup', 3, null, 2, false)] };
  L.mhits = { skip: 0, dup: 0, swap: 0 };
  return L;
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤22000 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* tch_tut_watch：看！当小老师（2832ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥2832+300=3132：clip 播完再开题（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* task 2460+任务句 4350 开题（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  /* ①示范步：幽灵手指点托盘 4 颗苹果（首颗 800 移+320 压；后续相邻直接压 320——从紧） */
  pointGhostAt(trayBtnAt(0));
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const rA1 = await uiTapApple(0, true);         /* demo 通道豁免演出锁 → 'in' */
  if (state.tut !== 'watch') return;
  for (let a = 1; a < 4; a++) {                  // 手指已在托盘区（相邻颗直接按压）
    ghost.press();
    await wait(320 * SPEED);
    const rAx = await uiTapApple(a, true);
    if (state.tut !== 'watch') return;
    if (rAx !== (a === 3 ? 'confirmed' : 'in')) break;   /* 第 4 颗点满自动确认→兔子步 */
  }
  if (state.tut !== 'watch') return;
  /* ②兔子步演出在途（rabbitTurn fire-and-forget）→ 轮询等 fix 相位开放（b18 范式；
     watch 为演示态 demo 恒 true——break 不含 demo 门，只看相位+演出锁） */
  {
    let wg = 0;
    while (wg++ < 900) {
      if (state.tut !== 'watch') return;
      const qq = cur.quizzes[cur.step];
      if (qq && qq.phase === 'fix' && !state.locked && Date.now() >= (state.showUntil || 0)) break;
      await wait(100);
    }
  }
  /* ③纠错步：幽灵手指点好卡「漏数了3」→ 修正+学会（right 窗 3420）→ 'done' */
  pointGhostAt(fixBtnAt(answerOf(q)));
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const rF = await uiTapFix(answerOf(q), true);  /* → 'done'（gate G2 期望） */
  window.__tchDemoR = rF;                        /* 演示生效证据（§0.27，gate 断言 'done'——终值语义） */
  window.__tchWatchMs = Date.now() - t0w;        /* watch 段实测时长（verify 单元② 预算 ≤22000） */
  const sv = KIDS._save() || {};
  sv.teach = sv.teach || {};
  sv.teach.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 N=5/dup/重3 迷你关「你来教一教」（示范步起帮→整题走完独），走完进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 done 后无余窗） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* tch_tut_turn：你来教一教（1752ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1752+300=2052 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 开题 → 开放点托盘（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step] && cur.quizzes[cur.step].phase === 'show') pointHelpNext();
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：看看兔子摆对了吗 */
});
trayEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.t-apple,.t-group');
  if (!p) return;
  e.preventDefault();
  uiTapApple(Number(p.dataset.apple != null ? p.dataset.apple : p.dataset.group));
});
groupbarEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.gmode');
  if (!p) return;
  e.preventDefault();
  uiSetGroup(Number(p.dataset.g));
});
fixcardsEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.fixcard');
  if (!p) return;
  e.preventDefault();
  uiTapFix(Number(p.dataset.fix));
});
stageEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.t-apple,.t-group,.gmode,.fixcard,#btn-rabbit')) return;   // 各行点击已由容器处理
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    const q = cur.quizzes[cur.step];
    if (q && q.phase === 'show') sayR(VOICE.task.key, VOICE.task.text);   /* show 相位=重读任务 clip */
    else sayR(VOICE.hint.key, VOICE.hint.text);                            /* 其余=方向提示 */
  }
});

/* ================= 无操作看护（契约 B 双锚/K 面板守卫）：
   14s 方向级=重读任务句+兔子探头（不指答案，lastDir 独立节流锚，不重置 lastAct——
   30s 答案级不被饿死）/ 30s 答案级=好卡 breathe+重读任务句（仅 fix 相位——show 相位
   数数无答案概念，救援恒重读任务句+探头）/ 教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索（仅 fix 相位） */
    if (q.phase === 'fix') {
      const okEl = fixBtnAt(answerOf(q));
      if (okEl) replayAnim(okEl, 'breathe');
    }
    KIDS.voice.play(taskClipOf(q), taskTTS(q));    /* 重读任务句（T46 clip——数数方向锚） */
    replayAnim(rabbitWrapEl, 'peek');            /* 兔子探头（视觉方向锚） */
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读任务句+探头（不动 lastAct） */
    KIDS.voice.play(taskClipOf(q), taskTTS(q));
    replayAnim(rabbitWrapEl, 'peek');
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
  KIDS.init({ game: 'teach', title: '教会小兔子' });   // 存档键 kidsgame_teach（core VER 1.0，家族 C）
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
   真实页同暴露 window.TCH——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（phase/n/etype/errAt/seq/m/repeat/group/bowl 真值——
   verify 从 RNG 副本独立复算 n/etype/errAt/seq/m 对账；answer=verify 独立推导
   cards 中唯一 good===true 的 i）；step=全关题号 0-4（b33 坑①：题号语义）。
   tapApple：单颗 'in'/组块 'group'/点满自动确认 'confirmed'/碗满后再点 false/
   演出期·越界 null；tapFix：好卡 'right'（末题 'done'）/错卡 'wrong'/豁免窗内
   错卡 false/非 fix 相位·演出期 null；setGroup：切换 'reset'/无效·小数·演出期
   null/非 show 相位 false；mastered=关内连续首选答对计数（r5 教到会两轮跟踪）================= */
window.TCH = {
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
    return { phase: q.phase,                       /* 'show'|'rabbit'|'fix'（b33 坑①流程分步语义） */
             n: q.n,                               /* 本题目标数 4-20（教学迷你关 4/5；verify 独立复算对账） */
             etype: q.etype,                       /* 错误类型 'skip'|'dup'|'swap'（r5 诊断真值） */
             errAt: q.errAt,                       /* 错误参数（skip/dup=涉及的数/swap=前一个数） */
             seq: q.seq.slice(),                   /* 兔子报数序列（fix 判定真值——读过程锚） */
             m: q.m,                               /* 兔子摆的数=seq.length（skip n-1/dup n+1/swap n） */
             repeat: q.repeat,                     /* 复现前题同型（「又犯了同样的错」——r5 出题侧） */
             group: q.group,                       /* 数数策略 1|2|5（r5 按群；n≥10 可切） */
             bowl: q.bowl,                         /* 示范碗当前苹果数（show 阶段进度） */
             cards: q.cards.map(c => ({ good: c.good, label: c.label })),
             answer: answerOf(q),                  /* 好卡下标（verify 独立推导：唯一 good） */
             step: cur.step,                       /* 全关题号 0-4（b33 坑①） */
             miss: q._miss || 0 };
  },
  tapApple(i) { return uiTapApple(i); },
  tapFix(i) { return uiTapFix(i); },
  setGroup(g) { return uiSetGroup(g); },
  async autoSolve() {            // UI 路径自动走完当前关（逐题三步真实判定链；
    let taps = 0, guard = 0;     // 演出窗/相位门 null → 轮询等锁窗结束重试，非 break；
    while (cur && !cur.done && guard++ < 800) {   // r5 大数：优等生路径=五个五个数（群数高效）
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      if (q.phase === 'show') {
        if (q.n >= GROUP_MIN && q.group === 1) {
          const rs = uiSetGroup(5);
          if (rs !== 'reset') { await wait(100); continue; }
        }
        const idx = q.group > 1 ? Math.floor(q.bowl / q.group) : q.bowl;   // 槽位推进（下一未用块/颗）
        const r = await uiTapApple(idx, false);
        if (r === 'in' || r === 'group' || r === 'confirmed') taps++;
      } else if (q.phase === 'fix') {
        const r = await uiTapFix(answerOf(q), false);
        if (r === 'right' || r === 'done') taps++;
      } else {
        await wait(100);                                     // rabbit 演出期等待（fire-and-forget）
      }
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; },
  get mastered() {                              /* r5 教到会：关内连续首选答对计数（persist 写档） */
    return cur ? { skip: cur.mhits.skip, dup: cur.mhits.dup, swap: cur.mhits.swap } : null;
  }
};
