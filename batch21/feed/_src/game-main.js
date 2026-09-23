/* ================= feed 主逻辑（食物堆取物入碗 / 碗计数状态机 / 喂食推进 / 教学 / 救援）
   玩法（r8：SPEC-BATCH21 §1-r8 / §0.46）：题面语音「喂小兔子六根胡萝卜」（整句 TTS 拼句），
   题面 chip = 食物图形 + 大数字（零文字标签 §0.19；combo=双组图形+数字+加号，
   left 问句阶段只显 '?'——去自动计数器，答案须点数剩物得出）。点食物堆取物入碗：
   每根 = 飞行动画 + 数词 TTS「一、二、三…」；点非目标堆 = 轻反馈不计数（探索≠错）。
   碗内各目标食物计数 == 需求时「喂给小兔」按钮（≥96px）亮起脉冲：点满自动判
   （grace 窗后自动提交）或点按钮判，两款并用；grace 窗内再点/取回则撤销就绪。
   错（提交时≠需求）= sayW+1000ms 防重入窗（b16 定案）零惩罚，碗不清空；点碗内食物取回
   （计数-1+数词倒读）。
   left 剩题两阶段：先取 n 根 → 兔兔吃掉 eaten 根（不清屏——剩 rem 根搬到餐垫可见，
   碗清空供作答）→ fed_left_q「小兔子吃掉啦，数一数，还剩几根」+fed_left_do「拿一样多的，
   喂给小兔子」→ 点剩物=亮圆点+数词（点数圆点支持，engCount 顺序点数）→ 取 rem 根镜像作答。
   combo 双食物合计订单：「喂小兔子，四根胡萝卜，三片青菜」分类别取、合计判定（逐类匹配）。
   救援（14s 只被正确推进重置）= 碗+按钮 pulse（方向级）+目标堆 breathe（答案级 miss≥2）；
   r8 去逐根高亮兜底——碗内/剩物永不逐根呼吸，只留方向锚与「多啦放回去一根」语音。
   estMs 家族定版字面 `const estMs = n => n * 345 + 600;`（n=码点数；四处同步：
   game-data 定义 / 本文件注释 / game-verify 断言 / build.py 字面 assert；禁 +300 变体）。
   验收钩子：window.FD = { get currentLevel, get quiz(){kind('pick'|'left'|'combo'), food, n,
   eaten, rem, foods, a, b, bowl, need, step, miss, phase, target, piles, counted},
   tapFood(foodKey), tapBowl(foodKey), tapLeftover(i), submit(), async autoSolve(), get tutorial }
   （getter 返回拷贝非活引用；need/phase/target/piles/counted 为附加观测字段） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const GRACE_MS = 1300;                         // 点满自动判宽限窗（真实 ms 基数，随 SPEED 缩放）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/题面/喂对不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩共性 P1：安静试错只有视觉晃动）；
   force=miss===2 豁免恰一次（不灰化款：碗不清空可无限次错，===2 保证豁免只发一次——
   SPEC §1 口径 + shadow 首单元门禁实证同源） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const chipEl = $id('prompt-chip'), pilesEl = $id('piles'), bowlItemsEl = $id('bowl-items'),
      bowlWrapEl = $id('bowl-wrap'), rabbitEl = $id('rabbit'), feedBtn = $id('btn-feed'),
      ghostEl = $id('ghost'), leftoversEl = $id('leftovers'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'
let qTimer = null;                              // 开场/教学链 clip→题面 TTS 的接力定时器
let graceT = null;                              // 点满自动判宽限窗定时器（§0.46 两款并用）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const pileEl = k => pilesEl.querySelector('.pile[data-food="' + k + '"]');
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 碗内总量（combo 双类求和；over 语音判定用） */
const bowlTotal = q => Object.keys(q._bowl).reduce((s, f) => s + q._bowl[f], 0);
const needTotal = q => { const nd = needOf(q); return Object.keys(nd).reduce((s, f) => s + nd[f], 0); };

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  feedBtn.innerHTML = ICONS.feed;
  $id('bowl-art').innerHTML = bowlSvg();
  rabbitEl.innerHTML = KIDS.assets.rabbit('normal', 104);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：喂对/吃了=双音上行 / 错堆轻反馈=低柔单音 / 取回=短叮 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(523, 0.09, 0, 0.3); };
const backTone = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.32); };

/* ================= 题面语音（读题 sayR 级不受 flat 门；T46 阶段2 拼句 clip 化）
   pick/left 阶段一 = fed_q_{n}_{食物} 整句 clip；combo = fed_c_head+fed_c_{a}+fed_c_{b} 段链
   （全段在册走 queue，缺段整句 TTS 兜底——shop-math playChain 先例，防御性死分支）；
   left 问句阶段 = fed_left_q + fed_left_do 双 clip 顺序链（queue 段间 0.15s）
   重入先清接力定时器（防旧题残留切断新题面） ================= */
const playChain = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.voice.say(fallback);
};
function sayQuiz(q) {
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  if (isAsk(q)) KIDS.voice.queue([VOICE.leftQ.key, VOICE.leftDo.key]);
  else playChain(speechKeys(q), speechOf(q));
}
/* 开场顺序链（§0.5/§0.6，chainsum 定版形态）：play(fed_hint) 后 2000ms 接力题面 TTS
   （hint clip ~1.6s，留白 2s 防叠音；禁 play 直接切断题面） */
function openingSpeak() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  sayR(VOICE.hint.key, VOICE.hint.text);
  qTimer = setTimeout(() => {
    qTimer = null;
    const q2 = cur && cur.quizzes[cur.step];
    if (q2 && !q2._judged) sayQuiz(q2);
  }, 2000);
}

/* ================= 渲染 ================= */
function renderChip(q) {                        // 题面行（零文字标签 §0.19）
  chipEl.classList.toggle('add2', isAsk(q));
  chipEl.classList.toggle('combo', q.kind === 'combo');
  if (q.kind === 'combo') {                     // 双组图形+数字+加号（订单全显，挑战=双轨计数）
    chipEl.innerHTML = '<span class="glyph">' + pileCluster(q.foods[0]) + '</span>' +
      '<span class="num">' + q.a + '</span><span class="plus">' + ICONS.plus + '</span>' +
      '<span class="glyph">' + pileCluster(q.foods[1]) + '</span>' +
      '<span class="num">' + q.b + '</span>';
    chipEl.setAttribute('aria-label', comboSpeech(q) + '，点我再听一遍');
    return;
  }
  /* pick/left 阶段一：图形+数字；left 问句：图形+'?'（去自动计数器——答案须点数剩物） */
  chipEl.innerHTML = '<span class="glyph">' + pileCluster(q.food) + '</span>' +
    '<span class="num">' + (isAsk(q) ? '?' : phaseTarget(q)) + '</span>';
  chipEl.setAttribute('aria-label', isAsk(q)
    ? VOICE.leftQ.text + '，' + VOICE.leftDo.text + '，点我再听一遍'
    : quizSpeech(q) + '，点我再听一遍');
}
function renderPiles(q) {                       // 食物堆（1-3 堆，目标堆位置 seeded 混排）
  pilesEl.innerHTML = '';
  q.piles.forEach(k => {
    const b = document.createElement('button');
    b.className = 'pile';
    b.dataset.food = k;
    b.setAttribute('aria-label', nameOf(k) + '堆，点一下拿一根');
    b.innerHTML = pileCluster(k);
    pilesEl.appendChild(b);
  });
}
function renderBowl(q) {                        // 碗内食物（取回通道：点碗内一件取回 1 根）
  bowlItemsEl.innerHTML = '';
  Object.keys(q._bowl).forEach(f => {
    for (let i = 0; i < q._bowl[f]; i++) {
      const b = document.createElement('button');
      b.className = 'bitem';
      b.dataset.food = f;
      b.setAttribute('aria-label', '碗里的' + nameOf(f) + '，点一下放回一根');
      b.innerHTML = FOOD_SVG[f]();
      bowlItemsEl.appendChild(b);
    }
  });
}
/* 剩物餐垫（left 问句阶段：剩 rem 件可见不清屏；点一件=亮一个圆点+数词——点数圆点支持） */
const fieldEl = $id('field');
function renderLeftovers(q) {
  leftoversEl.innerHTML = '';
  fieldEl.classList.toggle('left2', isAsk(q));
  if (!isAsk(q)) { leftoversEl.style.display = 'none'; return; }
  leftoversEl.style.display = 'flex';
  for (let i = 0; i < q.rem; i++) {
    const b = document.createElement('button');
    b.className = 'leftover';
    b.dataset.food = q.food;
    b.dataset.idx = i;
    b.setAttribute('aria-label', '剩下的' + nameOf(q.food) + '，点一下数一数');
    b.innerHTML = FOOD_SVG[q.food]() + '<i class="dot"></i>';
    leftoversEl.appendChild(b);
    setTimeout(() => b.classList.add('in'), 60 * i * SPEED + 30);
  }
}
function renderQuiz(speak) {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  cancelGrace();
  feedBtn.classList.remove('ready', 'wig');
  renderChip(q);
  renderPiles(q);
  renderBowl(q);
  renderLeftovers(q);
  renderStep();
  if (speak !== false && !VERIFY && !state.demo && !state.quiet) sayQuiz(q);
  /* 开场/教学交接改顺序链（quiet 标志防渲染插播——shadow 定版形态） */
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
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(N_CH, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 取物飞行动画（装饰克隆体，CSS transition，时长随 SPEED §0.11） ================= */
function flyItem(food, fromEl) {
  if (VERIFY || !fromEl) return;                // verify 页不起飞行克隆体（纯 DOM 状态即真值）
  const to = bowlItemsEl.getBoundingClientRect();
  const from = fromEl.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'fly-food';
  fly.innerHTML = FOOD_SVG[food]();
  fly.style.left = (from.left + from.width / 2 - 26) + 'px';
  fly.style.top = (from.top + from.height / 2 - 26) + 'px';
  fly.style.transitionDuration = (430 * SPEED) + 'ms';
  document.body.appendChild(fly);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  requestAnimationFrame(() => {
    fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.9)';
  });
  setTimeout(() => fly.remove(), 430 * SPEED + 90);
}

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el, reason) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show(reason);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：没数剩物 → 指餐垫（点数支持）；没取够 → 指目标堆（combo=还差的类）；
   取够了 → 指「喂给小兔」按钮（手口一致引导） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (isAsk(q) && q._lc < q.rem) { pointGhostAt(leftoversEl, 'tut'); return; }
  const nd = needOf(q);
  let under = null, over = false;
  Object.keys(nd).forEach(f => {
    if ((q._bowl[f] || 0) < nd[f]) under = f;
    if ((q._bowl[f] || 0) > nd[f]) over = true;
  });
  if (under) { pointGhostAt(pileEl(under), 'tut'); return; }
  pointGhostAt(feedBtn, 'tut');
}
let helpTimer = null;
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, delay == null ? 700 : delay);
}

/* ================= 点满自动判宽限窗（§0.46 两款并用：按钮亮起脉冲提示 + 点满即判）
   窗内再点（计数越过需求）/取回（计数跌离需求）→ 撤销就绪取消自动判；
   教学 demo 通道不起定时器（演示由 tutorialWatch 显式点按钮喂，防双通道竞态） ================= */
function cancelGrace() {
  if (graceT) { clearTimeout(graceT); graceT = null; }
}
function startGrace() {
  feedBtn.classList.add('ready');
  if (state.demo) return;
  cancelGrace();
  graceT = setTimeout(() => {
    graceT = null;
    const q = cur && cur.quizzes[cur.step];
    if (!q || q._judged || state.locked || state.won || state.demo) return;
    if (engReady(q)) uiSubmit();                // 点满自动判（仍就绪才提交）
  }, GRACE_MS * SPEED);
}
/* 计数变化后就绪态重算：就绪 → 亮起+起窗；未就绪 → 熄灭+撤窗 */
function refreshReady() {
  const q = cur && !cur.done ? cur.quizzes[cur.step] : null;
  const ready = !!(q && !q._judged && !state.won && engReady(q));
  if (ready && !feedBtn.classList.contains('ready')) startGrace();
  else if (!ready) { cancelGrace(); feedBtn.classList.remove('ready'); }
}

/* ================= 取物主路径（真实点击 / FD.tapFood / autoSolve / 演示共用） ================= */
function uiTapFood(food, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked）。
     吞输入期轻反馈（§0.22）：真实点击被 locked/demo/won 吞时 sfx('pop') 轻叮 */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); replayAnim(bowlItemsEl, 'bump'); }   /* 吞点可见回应（试玩 P2） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engTapFood(cur, food);
  if (r === null) return false;
  if (r === 'miss-food') {                      // 点非目标堆：摆动+低哑声，不计数零惩罚（§0.46 探索≠错）
    replayAnim(pileEl(food), 'wig');
    dodgeLo();
    return 'miss-food';
  }
  /* 取到 1 根：入碗 DOM（同步前缀供验收窗内读）+ 飞行动画 + 数词 TTS（食物词/数词=TTS 兜底） */
  const b = document.createElement('button');
  b.className = 'bitem in';
  b.dataset.food = food;
  b.setAttribute('aria-label', '碗里的' + nameOf(food) + '，点一下放回一根');
  b.innerHTML = FOOD_SVG[food]();
  bowlItemsEl.appendChild(b);
  setTimeout(() => b.classList.remove('in'), 420 * SPEED + 60);
  flyItem(food, pileEl(food));
  replayAnim(pileEl(food), 'pulse-tap');
  KIDS.voice.play(numKey(r), numCn(r));         // 该食物类内计数（combo 双轨各自 1..n；T46 clip）
  refreshReady();
  return r;
}
/* ================= 取回主路径（点碗内食物=取回 1 根：计数-1+数词倒读，§0.46 自助修正通道） ================= */
function uiTakeBack(food, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); replayAnim(bowlItemsEl, 'bump'); }   /* 吞点可见回应（试玩 P2） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engTake(cur, food);
  if (r === null) { sfx('pop'); return false; }
  const items = bowlItemsEl.querySelectorAll('.bitem[data-food="' + food + '"]');
  if (items.length) items[items.length - 1].remove();
  backTone();
  KIDS.voice.play(numKey(r), numCn(r));         // 数词倒读（含'零'——碗空 fed_n_0；T46 clip）
  refreshReady();
  return r;
}
/* ================= 点数剩物支持（left 问句阶段）：点一件=亮一个圆点+数词（engCount 顺序点数）
   已点过/乱序点 → 轻摆不重复计数；去自动计数器=总数永不上屏，孩子点才亮 ================= */
function uiCountLeftover(i) {
  if (!cur || state.locked || state.won || state.demo) { sfx('pop'); return false; }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engCount(cur, i);
  if (r === null) {
    const el = leftoversEl.querySelector('.leftover[data-idx="' + i + '"]');
    if (el && !el.classList.contains('counted')) replayAnim(el, 'wig');
    else sfx('pop');
    return false;
  }
  const el = leftoversEl.querySelector('.leftover[data-idx="' + i + '"]');
  if (el) el.classList.add('counted');          // 亮一个圆点（::after dot）
  KIDS.voice.play(numKey(r), numCn(r));         // 数词（一、二、三…点满=剩数；T46 clip）
  /* 点数=学习动作，不重置救援钟（§0.7a 同取物：静置数数=卡住信号才触发救援） */
  return r;
}

/* ================= 提交主路径（真实点击 / FD.submit / autoSolve / 点满自动判共用）
   就绪 → 喂食推进（'eat' left 阶段一兔兔吃掉（不清屏，剩物上垫）/ 'right' 判对推进 /
   'done' 通关）；未就绪 → 'wrong'：sayW+1000ms 防重入窗（§0.26 b16 定案），
   零惩罚碗不清空（不灰化款） ================= */
async function uiSubmit(demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); replayAnim(bowlItemsEl, 'bump'); }   /* 吞点可见回应（试玩 P2） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engSubmit(cur);
  if (r === null) return false;
  cancelGrace();
  feedBtn.classList.remove('ready');

  if (r === 'wrong') {                          // 错：按钮晃动+梯度脚手架；碗不动零惩罚
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss === 2);   /* 不灰化款 ===2 豁免恰一次 */
    replayAnim(feedBtn, 'wig');
    if (q._miss === 1) applyDirVisual();        /* 错 1 次方向级：碗+按钮 pulse（"看看碗里"） */
    else applyAnswerVisual(q);                  /* miss≥2 答案级：目标堆 breathe（r8 无逐根高亮） */
    if (state.tut === 'help') scheduleHelpGhost(400);
    state.locked = true;
    await wait(1000 * SPEED);                   /* 错点防重入窗 1000ms（b16 定案） */
    if (cur !== run) return r;
    feedBtn.classList.remove('wig');
    state.locked = false;
    return r;
  }

  /* ---- 喂食推进：正确推进重置救援钟（§0.7a）；吃掉碗内食物 → 兔兔 happy ---- */
  lastAct = Date.now();
  if (state.tut === 'help') {                   // 教学"独"：首次喂对 → 强化反馈放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  clearRescueVisual();
  state.locked = true;
  munchRabbit();
  if (r === 'eat') {                            // left 阶段一：吃掉 eaten 件（不清屏——剩 rem 件上垫）
    await eatSome(q, q.eaten);
    if (cur !== run) return r;
    chimeGoal();
    await wait(300 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    renderQuiz(false);                          // chip 切 '?'、剩物上垫、碗清空供作答
    KIDS.voice.queue([VOICE.leftQ.key, VOICE.leftDo.key]);   /* 问句+作答指引双 clip 顺序链 */
    if (state.tut === 'help') scheduleHelpGhost(1200);
    return r;
  }
  await eatAll(q);                              // 碗内+餐垫剩物全飞进兔兔（演出窗内 DOM 同步清空）
  if (cur !== run) return r;
  sfx('coin');
  chimeGoal();
  sayR(VOICE.right.key, VOICE.right.text);
  await wait(2100 * SPEED);                     /* 等 fed_right（≈1.9s）主体播完再读下一题 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz(true);
  return r;
}
/* 吃掉演出：碗内前 k 件逐件飞向兔兔后移除（不清屏——剩余件留在碗内由 renderLeftovers 接管上垫） */
async function eatSome(q, k) {
  const items = Array.prototype.slice.call(bowlItemsEl.querySelectorAll('.bitem')).slice(0, k);
  items.forEach((el, i) => setTimeout(() => el.classList.add('eaten'), i * 90 * SPEED));
  await wait(items.length * 90 * SPEED + 420 * SPEED);
  items.forEach(el => { if (el.parentNode) el.remove(); });
}
/* 喂食演出：碗内食物+餐垫剩物逐件飞向兔兔后清空（同步前缀：先标记 .eaten 供验收窗内读） */
async function eatAll(q) {
  const items = Array.prototype.slice.call(bowlItemsEl.querySelectorAll('.bitem'))
    .concat(Array.prototype.slice.call(leftoversEl.querySelectorAll('.leftover')));
  items.forEach((el, i) => setTimeout(() => el.classList.add('eaten'), i * 90 * SPEED));
  await wait(items.length * 90 * SPEED + 420 * SPEED);
  bowlItemsEl.innerHTML = '';                   /* 引擎态已由 engFeed 置好（判对换题），DOM 对齐 */
  leftoversEl.innerHTML = '';
  leftoversEl.style.display = 'none';
}
function munchRabbit() {
  rabbitEl.innerHTML = KIDS.assets.rabbit('happy', 104);
  replayAnim(rabbitEl, 'munch');
  setTimeout(() => { if (!state.won || VERIFY) rabbitEl.innerHTML = KIDS.assets.rabbit('normal', 104); }, 1500 * SPEED + 400);
}
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}

/* ================= 梯度脚手架视觉（错反馈与救援共用两级，§0.21/§1 口径）
   r8 去逐根高亮兜底：碗内/剩物永不逐根呼吸（自动计数器同罪）；只留方向锚 ================= */
function applyDirVisual() {                     // 方向级：碗+按钮 pulse（问句阶段+餐垫 pulse"数这里"）
  replayAnim(bowlWrapEl, 'pulse');
  replayAnim(feedBtn, 'pulse');
  if (cur && isAsk(cur.quizzes[cur.step])) replayAnim(leftoversEl, 'pulse');
}
function applyAnswerVisual(q) {                 // 答案级：目标堆 breathe（combo=两类目标堆）
  (q.kind === 'combo' ? q.foods : [q.food]).forEach(f => {
    const p = pileEl(f);
    if (p) { p.classList.remove('breathe'); void p.offsetWidth; p.classList.add('breathe'); }
  });
  if (bowlTotal(q) > needTotal(q)) {            // 多点：延后说（方向锚不泄答案；say 会打断 wrong clip）
    const lv = cur;
    setTimeout(() => {
      const q2 = lv && !lv.done ? lv.quizzes[lv.step] : null;
      if (q2 === q && !q._judged && bowlTotal(q2) > needTotal(q2)) KIDS.voice.play(VOICE.more.key, VOICE.more.text);   /* T46 阶段2 clip */
    }, 2100 * SPEED);
  }
}
function clearRescueVisual() {
  bowlWrapEl.classList.remove('pulse');
  feedBtn.classList.remove('pulse');
  leftoversEl.classList.remove('pulse');
  pilesEl.querySelectorAll('.breathe').forEach(p => p.classList.remove('breathe'));
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  /* 家族契约 F（r8）：生成关预告禁"章索引加一取模"字面——须实算 genLevel(f+1).dch 取 GEN_HINTS
     r7 审查 M1 同型坑：章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4 口径） */
  if (f + 1 < STATIC_LEVELS) return CHAPTERS[Math.floor(f / CH_LEN) + 1].hint;
  return GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  cancelGrace();
  clearTimeout(helpTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 家族契约 A：dayEnd 预告传 nextHint(lim-1)（§0.4 防跳章） */ });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                            // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);               // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  cancelGrace();
  clearTimeout(helpTimer);
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  leftoversEl.innerHTML = '';
  leftoversEl.style.display = 'none';
  renderQuiz(false); renderDots();
  if (VERIFY) { openingSpeak(); return; }       // verify 页恒走开场链 stub（教学由单元直调覆盖）
  const sv = KIDS._save() || { levels: {} };
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.feed && sv.feed.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                               /* 开场任务语音+题面顺序链（§0.5；hint 不得切断题面） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看 = 演示取 6 根（数词同步「一…六」ch1 量域下限）→点按钮喂（flat0-qi0 钉 n=6 胡萝卜=
   演示即正解；6 步演示 ≈14.3s ≤16s §0.25 上限）；帮 = 幽灵手指指目标堆/喂食按钮；
   独 = 首次喂对放手。演示结果存 window.__fdDemoR（§0.27） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  for (let i = 0; i < q.n; i++) {               // 演示取 n 根（SPEC §1：数词同步）
    pointGhostAt(pileEl(q.food), 'tut');
    await wait(900 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    uiTapFood(q.food, true);                    // demo 通道豁免 locked（不吞题；不起 grace 定时器）
    await wait(520 * SPEED);
  }
  await wait(400 * SPEED);
  pointGhostAt(feedBtn, 'tut');                 // 取够了 → 指「喂给小兔」按钮
  await wait(900 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示一次完整喂对演出
  state.locked = false;
  const demoR = await uiSubmit(true);           // ==需求 → 'right' 推进（演示实证存 __fdDemoR）
  window.__fdDemoR = demoR;
  const sv = KIDS._save() || {};                // verify 页 _save()=null 时空档（教学链单元直调）
  sv.feed = sv.feed || {};
  sv.feed.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来喂一喂"在重发后的题面上说（照 batch5-11） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  leftoversEl.innerHTML = '';
  leftoversEl.style.display = 'none';
  renderQuiz(false); renderDots();
  state.quiet = false;
  /* 交接顺序链：turn clip 播完再读题面——题面为整句 TTS，qTimer 2000ms 接力（§0.6，禁双通道叠音） */
  sayP(VOICE.turn.key, VOICE.turn.text);
  qTimer = setTimeout(() => {
    qTimer = null;
    const q2 = cur && cur.quizzes[cur.step];
    if (state.tut === 'help' && q2 && !q2._judged) sayQuiz(q2);
  }, 2000);
  scheduleHelpGhost(600);
}

/* ================= 底栏与舞台交互 ================= */
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学演出通关期重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查对齐重玩门/题面卡防御 */
  lastAct = Date.now();                         /* 主动学习重置（§0.7a） */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  sayQuiz(cur.quizzes[cur.step]);               /* 再听一遍：题面整段重读（问句阶段=双 clip 链） */
});
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) {   /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默 */
    sfx('pop');
    hopRabbit();
    return;
  }
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  sayQuiz(cur.quizzes[cur.step]);               /* 题面卡可点重听（点题卡=儿童高发探索动作） */
});
feedBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  uiSubmit();
});
pilesEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.pile');
  if (!p) return;
  e.preventDefault();
  uiTapFood(p.dataset.food);
});
bowlItemsEl.addEventListener('pointerdown', e => {
  const it = e.target.closest('.bitem');
  if (!it) return;
  e.preventDefault();
  uiTakeBack(it.dataset.food);
});
leftoversEl.addEventListener('pointerdown', e => {   /* 点数剩物支持（r8 点数圆点） */
  const it = e.target.closest('.leftover');
  if (!it) return;
  e.preventDefault();
  uiCountLeftover(parseInt(it.dataset.idx, 10));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.pile') || e.target.closest('.bitem') ||
      e.target.closest('.leftover') || e.target.closest('#btn-feed') ||
      e.target.closest('#prompt-chip')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（重读题面 + 碗/按钮 pulse + miss≥2 目标堆 breathe
   §0.21/§1）/ 教学"帮"5s 重演示一次。救援钟只被正确推进重置（§0.7a——lastAct 仅
   喂食推进/读题重置；取物/取回/点数剩物/错堆探索不重置：静置数数=卡住信号） ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];
    if (q && !q._judged) {
      sayQuiz(q);                               // 救援=重读题面（§0.7a，非通用催促句）
      applyDirVisual();                         // 方向级：碗+按钮 pulse（问句阶段+餐垫）
      if (q._miss >= 2) applyAnswerVisual(q);   // 答案级：目标堆 breathe（miss≥2；r8 无逐根高亮）
    }
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
  KIDS.init({ game: 'feed', title: '喂小兔' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：启动分支同口径 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.FD = {
  start(flat) { startLevel(flat); },                    /* 外部切关（verify 页/独立复验共用口径） */
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, retries: cur.retries, done: cur.done, won: state.won };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const bowl = {}, need = {};                  /* 碗内现况/当前需求 {food→count}（r8 双类合计判定） */
    Object.keys(q._bowl).forEach(f => bowl[f] = q._bowl[f]);
    const nd = needOf(q);
    Object.keys(nd).forEach(f => need[f] = nd[f]);
    return { kind: q.kind, food: q.food, n: q.n, eaten: q.eaten, rem: q.rem,
             foods: q.foods ? q.foods.slice() : null, a: q.a, b: q.b,
             bowl: bowl, need: need, step: cur.step, miss: q._miss,
             phase: q.phase, target: phaseTarget(q), piles: q.piles.slice(),
             counted: q._lc };                   /* counted=已点数剩物件数（点数圆点支持） */
  },
  tapFood(foodKey) { return uiTapFood(foodKey); },
  tapBowl(foodKey) { return uiTakeBack(foodKey); },
  tapLeftover(i) { return uiCountLeftover(i); },
  submit() { return uiSubmit(); },
  async autoSolve() {                           // UI 路径自动喂完当前关（按 need 逐类取→点按钮喂）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 200) {
      const info = window.FD.quiz;
      if (!info) break;
      let under = null, over = null;
      for (const f in info.need) {
        if ((info.bowl[f] || 0) < info.need[f]) under = f;
        if ((info.bowl[f] || 0) > info.need[f]) over = f;
      }
      if (under) {
        const r = uiTapFood(under);
        if (r === false) { await wait(90 * SPEED); continue; }   // 推进演出窗让行
        taps++;
        continue;
      }
      if (over) { uiTakeBack(over); continue; }   // 越过需求取回修正（防御层）
      const r = await uiSubmit();               // 就绪 → 点按钮判（真实通路；'eat' 后 need 自动切换）
      if (r === false || r === null) await wait(90 * SPEED);
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
