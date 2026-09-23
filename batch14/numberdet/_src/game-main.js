/* ================= numberdet 主逻辑（数轴渲染 / 数字键盘 / 猜测判定演出 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH14 §3）：1-N 藏神秘数（宝箱），数字键盘输猜测——
   猜大 num_big'太大啦'+数轴 >guess 段灰化 / 猜小 num_small'太小啦'+<guess 段灰化 /
   猜中宝箱开启+num_got'猜中啦'下一题；每猜必有信息反馈，无 wrong 路径（§0.24 显式豁免，
   不设 VOICE.wrong/不建 num_wrong clip——故本款无 sayW 纠错通道，big/small/gone 全走 sayR）。
   范围外/已排除 → 键盘轻抖+sfx+num_gone，不计猜测次数（无害探索 §0.7a：键盘输入=探索不重置
   救援钟，确认合法猜测=推进形态重置）；读题按钮重置（主动学习动作）。
   救援 14s：num_hint'试一试中间的数'+数轴剩余段中点 pulse 三连（救援即教二分 §0.21）。
   教学看-帮-独：watch=侦探兔三步猜中（大→小→中，区间收缩可视化，demoR 存 window.__ndDemoR
   §0.27）/帮=幽灵手指按中点数字/独=首次猜中放手。
   验收钩子：window.ND = { get currentLevel, get quiz(){kind,lo,hi,secret,base,guesses,input,
   step,miss}, tapKey(k), tapDel(), tapOK(), start(flat), async autoSolve(), get tutorial,
   get rescues }（getter 拷贝非活引用；autoSolve=恒猜中点二分，断言 ≤base 次） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 反馈/救援/开场/读题/教学不受 flat 门（§0.5：big/small/got/gone 是本款核心指令语音 §0.19） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 题面=queue 拼接 clip（§0.23）：全部段 clip 在场走 queue，缺任一走整句 TTS 兜底 */
function sayQ(parts, fullText) {
  if (KIDS.voice.clips && parts.every(p => KIDS.voice.clips[p.key])) {
    KIDS.voice.queue(parts.map(p => p.key));
  } else {
    KIDS.voice.say(fullText);
  }
}

const stageEl = $id('stage'), tableEl = $id('table'), tipEl = $id('tip'), tipTextEl = $id('tip-text'),
      keysEl = $id('keys'), okBtn = $id('ok-btn'), leftEl = $id('left'),
      axisEl = $id('axis'), segL = $id('seg-l'), segM = $id('seg-m'), segR = $id('seg-r'),
      rLo = $id('r-lo'), rHi = $id('r-hi'), rangeChip = $id('range-chip'),
      inVal = $id('in-val'), chestEl = $id('chest'), gcountN = $id('gcount-n'),
      inputCard = $id('input-card'), pinEl = $id('pin'), midDot = $id('mid-dot'),
      revealEl = $id('reveal'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白/探索点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 听按钮重播 3s 节流
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const keyEl = d => keysEl.querySelector('.key[data-d="' + d + '"]');

/* ================= 静态构建 ================= */
const KEY_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'del', 0, null];   // 3×4：1-9 + 删|0|占位
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  chestEl.innerHTML = chestSvg(false);
  okBtn.innerHTML = ICONS.check + '<span>确认</span>';
  keysEl.innerHTML = '';
  KEY_ORDER.forEach(d => {
    if (d === null) {                           // 末行右侧占位（非按钮，不参与触摸审计）
      const sp = document.createElement('div');
      sp.className = 'keysp';
      sp.setAttribute('aria-hidden', 'true');
      keysEl.appendChild(sp);
      return;
    }
    const b = document.createElement('button');
    b.className = 'key';
    b.dataset.d = d;
    if (d === 'del') {
      b.setAttribute('aria-label', '删除一位');
      b.innerHTML = ICONS.del;
    } else {
      b.setAttribute('aria-label', '数字 ' + d);
      b.textContent = d;
    }
    keysEl.appendChild(b);
  });
  layout();
}
/* 桌面布局（数轴区‖键盘）：按舞台实测切换横/竖排；
   键径 clamp[64,104]；确认键独立于网格=键盘全宽大条（min-height 96，§0.9 主答案） */
function layout() {
  const availW = stageEl.clientWidth - 16;
  const availH = stageEl.clientHeight - tipEl.offsetHeight - 22;
  const colMode = availH >= 640 && availW < availH * 1.15;   // 高屏窄持=竖排；否则横排
  tableEl.classList.toggle('col', colMode);
  const gap = 13;
  let kw, kh;
  if (colMode) {
    kw = Math.min(availW, 470);
    kh = availH - 330;                           // 竖排：数轴卡+输入卡占上方 ~330
  } else {
    kw = Math.min(availW * 0.4, 410);
    kh = availH;
  }
  const key = Math.max(64, Math.min(Math.floor((kw - 2 * gap) / 3),
    Math.floor((kh - 4 * gap - 96 - gap) / 4), 104));
  document.documentElement.style.setProperty('--key', key + 'px');
}
window.addEventListener('resize', () => layout());

/* ================= 渲染 ================= */
const pct = (v, N) => (v - 0.5) / N * 100;       // 格位模型：v 的格心百分比
function setTip(kind) {                          // kind: 'watch' | 'help' | undefined
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  tipEl.className = kind || '';
  tipTextEl.innerHTML = '神秘数藏在 <b>1</b> 到 <b>' + q.N + '</b> 之间';   /* 审查 m5 */
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
/* 数轴静态：5 倍数中间刻度（1<v<N）+ 端点 1/N 大字（每次换题按 N 重建，≤19 刻度轻量） */
function buildAxis(q) {
  axisEl.querySelectorAll('.tick,.endcap').forEach(e => e.remove());
  for (let v = 5; v < q.N; v += 5) {
    const t = document.createElement('span');
    t.className = 'tick';
    t.dataset.v = v;
    t.style.left = pct(v, q.N) + '%';
    t.innerHTML = '<i></i><span>' + v + '</span>';
    axisEl.appendChild(t);
  }
  [[1, '0%'], [q.N, '100%']].forEach(pair => {
    const e = document.createElement('b');
    e.className = 'endcap';
    e.dataset.v = pair[0];
    e.textContent = pair[0];
    e.style.left = pair[1];
    axisEl.appendChild(e);
  });
}
/* 数轴动态：排除段/剩余段宽度 + 剩余区间两端大字实时（"还剩 lo 到 hi"）+ 刻度灰死 */
function updateAxis(q) {
  const N = q.N, L = (q.lo - 1) / N * 100, W = (q.hi - q.lo + 1) / N * 100;
  segL.style.left = '0%';
  segL.style.width = L + '%';
  segM.style.left = L + '%';
  segM.style.width = W + '%';
  segR.style.left = (L + W) + '%';
  segR.style.width = Math.max(0, 100 - L - W) + '%';
  rLo.textContent = q.lo;                        // 剩余区间两端数字大字实时显示（SPEC §3）
  rHi.textContent = q.hi;
  rangeChip.classList.toggle('ok', q.lo === q.hi);   // 收紧到唯一值=绿（即将揭晓）
  axisEl.querySelectorAll('.tick').forEach(t => {
    const v = Number(t.dataset.v);
    t.classList.toggle('dead', v < q.lo || v > q.hi);
  });
}
function clearTransient() {                      // 换题清 pins/救援点/揭示
  pinEl.classList.remove('show');
  midDot.classList.remove('on', 'pulse3');
  revealEl.classList.remove('show');
}
function renderInput(q) {
  inVal.textContent = q.input == null ? '?' : q.input;
  inVal.classList.toggle('empty', q.input == null);
  gcountN.textContent = q.guesses;
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearTransient();
  chestEl.classList.remove('open');
  chestEl.innerHTML = chestSvg(false);
  buildAxis(q);
  updateAxis(q);
  renderInput(q);
  renderStep();
  setTip(state.tut === 'watch' ? 'watch' : (state.tut === 'help' ? 'help' : undefined));
  if (!VERIFY && !state.demo && !state.quiet) sayQ(quizParts(q), qSpeech(q));  /* 换题读题 sayR 级 */
}
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 题面段，queue 单通道顺序播 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key].concat(quizParts(q)));
}
function speakQuiz(q) { if (q) sayQ(quizParts(q), qSpeech(q)); }

/* ================= 键盘/确认主路径（真实点击 / ND 钩子 / autoSolve / 教学演示共用） ================= */
function nudgeKey(d) {                           // 吞输入期轻反馈视觉（§0.22）
  const el = keyEl(d);
  if (el) { el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); }
}
function nudgeInput() {
  inputCard.classList.remove('nudge'); void inputCard.offsetWidth; inputCard.classList.add('nudge');
}
function keysShake() {                           // 范围外/已排除：键盘轻抖（不计数，无害探索）
  keysEl.classList.remove('shake'); void keysEl.offsetWidth; keysEl.classList.add('shake');
}
function hideMidDot() { midDot.classList.remove('on', 'pulse3'); }

async function uiKey(d, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); nudgeKey(d); }      // 吞输入+轻叮+键圈轻闪（§0.22）
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const r = engKey(cur, d);
  if (r === null) return false;
  hideMidDot();
  if (!VERIFY) KIDS.audio.note(d === 'del' ? 500 : 640 + Number(d) * 12, 0.1, 0, 0.4);
  renderInput(q);                                // 拼数实时显示（键盘输入=探索，不重置救援钟 §0.7a）
  return r;                                      // 返回新拼数
}
async function uiDel(demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); nudgeKey('del'); }
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const r = engDel(cur);
  if (r === false) return false;
  hideMidDot();
  if (!VERIFY) KIDS.audio.note(440, 0.09, 0, 0.3);
  renderInput(q);
  return r;                                      // number（新拼数）或 null（已清空）
}
/* 确认主路径：engOK 五态（big/small/got/done/gone/empty）各走专属演出 */
async function uiOK(demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    /* 审查 M2：确认键（主答案）吞输入期轻叮+轻抖——对齐 uiKey，禁静默（§0.22） */
    if (!demo) { sfx('pop'); okBtn.classList.remove('nudge'); void okBtn.offsetWidth; okBtn.classList.add('nudge'); }
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const g = q.input;                             // 本次拼数（engOK 会消耗，先留档画图钉）
  const r = engOK(cur);
  if (r === null) return false;
  if (r === 'empty') {                           // 空输入：输入卡轻抖+轻叮（不计数不语音）
    nudgeInput(); sfx('pop');
    return 'empty';
  }
  if (r === 'gone') {                            // 范围外/已排除：键盘轻抖+sfx+num_gone，不计猜测次数
    keysShake();
    sfx('fail');
    sayR(VOICE.gone.key, VOICE.gone.text);
    hideMidDot();
    renderInput(q);                              // 引擎已清拼数 → 输入位回 ?（状态同步）
    state.locked = true;                         /* 反馈窗防重入（§0.26：连点只入一次反馈窗） */
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    return 'gone';
  }
  /* ---- 合法猜测：推进形态，重置救援钟（§0.7a） ---- */
  lastAct = Date.now();
  hideMidDot();
  if (r === 'big' || r === 'small') {
    sayR(r === 'big' ? VOICE.big.key : VOICE.small.key,
         r === 'big' ? VOICE.big.text : VOICE.small.text);
    if (!VERIFY) KIDS.audio.note(r === 'big' ? 392 : 587, 0.22, 0, 0.5);
    updateAxis(q);                               // 排除段灰化/剩余段亮（区间收缩可视化）
    renderInput(q);                              // 拼数已消耗回 ?
    if (g != null) {                             // 猜测图钉：蓝=太小/橙红=太大（信息锚点）
      pinEl.className = r;
      pinEl.querySelector('b').textContent = g;
      pinEl.style.left = pct(g, q.N) + '%';
      void pinEl.offsetWidth;
      pinEl.classList.add('show');
    }
    state.locked = true;                         /* 反馈窗防重入（区间动画 0.45s，§0.11） */
    await wait(700 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') pointHelpNext();   // "帮"：跟着区间收缩指向新的中点
    return r;
  }
  /* ---- 猜中（got/done）：宝箱开启+数轴揭示+推进 ---- */
  if (state.tut === 'help') {                    // 教学"独"：首次猜中 → 放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  sayR(VOICE.got.key, VOICE.got.text);
  sfx('coin');
  updateAxis(q);
  renderInput(q);
  pinEl.classList.remove('show');
  chestEl.innerHTML = chestSvg(true);
  chestEl.classList.remove('open'); void chestEl.offsetWidth; chestEl.classList.add('open');
  revealEl.querySelector('b').textContent = q.secret;   // 数轴 secret 位置金光揭示
  revealEl.style.left = pct(q.secret, q.N) + '%';
  revealEl.classList.add('show');
  state.locked = true;
  await wait(1050 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz();
  return r;
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  layout();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.numberdet && sv.numberdet.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5） */
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
  /* 试玩 P1-3：指新目标前清全部旧 breathe——逐位引导时数字键逐个亮起不清除，
     叠成"1,5,0,2"四键齐亮+确认键常态呼吸，指向失效 */
  keysEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  okBtn.classList.remove('breathe');
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：中点数字的下一个未按数字键（拼数逐位引导），拼完指向确认；
   拼错（非中点前缀）→ 指删除键 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return;
  const mid = String(engMid(q));
  const now = q.input == null ? '' : String(q.input);
  if (now === mid) { clearTimeout(helpTimer); pointGhostAt(okBtn); return; }
  if (mid.indexOf(now) === 0) {                  // 前缀正确 → 指下一位数字键
    clearTimeout(helpTimer);
    pointGhostAt(keyEl(mid[now.length]));
  } else pointGhostAt(keyEl('del'));             // 拼错 → 指删除
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.numberdet.tutSeen）
   看=侦探兔三步猜中演示（大→小→中；每步区间收缩可视化自动随 uiOK 发生）：
   前两步走 demo 通道（locked 吞真实输入），末步临时解锁走真实路径演完整猜中演出
   （返回值存 window.__ndDemoR，verify 断言真实生效 §0.27）→ 立即重发同关（确定性，题面一致）
   → 帮=幽灵手指按中点数字；独=首次猜中放手 */
function demoPlan(q) {                           // 演示三步（自适应 secret 边界，禁重猜已排除数）
  const s = q.secret, N = q.N, plan = [];
  if (s < N) plan.push(Math.min(N, s + 3));      // 第一步：偏大 → '太大啦'
  if (s > 1) plan.push(Math.max(1, s - 2));      // 第二步：偏小 → '太小啦'
  let d = 3;
  while (plan.length < 2) {                      // 边界（s=1 无更小 / s=N 无更大）：补同向一步
    if (s === 1) plan.push(Math.min(N, d));
    else if (s === N) plan.push(N - 1);          /* 审查 m3：N-2 small 后 lo=N-1，补 N-1 恒在剩余区间（原 s-d=N-3 已被排除，禁演示 gone） */
    else plan.push(Math.max(1, s - d));
    d++;
  }
  plan.push(s);                                  // 第三步：猜中
  return plan;
}
async function demoTypeDigits(g) {               // 幽灵手指逐位按数字键
  const ds = String(g).split('');
  for (const ch of ds) {
    pointGhostAt(keyEl(Number(ch)));
    await wait(820 * SPEED);
    ghost.press();
    await wait(280 * SPEED);
    uiKey(Number(ch), true);
    await wait(300 * SPEED);
  }
}
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  setTip('watch');
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学 opening 用 sayR 不受 flat 门（§0.6） */
  await wait(1100 * SPEED);
  const q = cur.quizzes[0];
  const plan = demoPlan(q);
  for (let k = 0; k < plan.length - 1; k++) {    // 前两步：demo 通道（含 big/small 反馈演出）
    await demoTypeDigits(plan[k]);
    pointGhostAt(okBtn);
    await wait(780 * SPEED);
    ghost.press();
    await wait(280 * SPEED);
    await uiOK(true);
  }
  await demoTypeDigits(plan[plan.length - 1]);   // 末步：解锁走真实路径演示完整猜中
  pointGhostAt(okBtn);
  await wait(780 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false; state.locked = false;      /* 时序锚点：解锁窗内无 await 插入（batch9 m6） */
  const demoR = await uiOK(true);
  window.__ndDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'got'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.numberdet = sv.numberdet || {};
    sv.numberdet.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip → 题面段（§0.6 单通道）
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重读题面（听按钮/题面卡）：重播 num_q1+num_n_N+num_q2（queue 拼接）；
   sayR 不受 flat 门；读题=主动学习动作重置救援钟（§0.7a 例外口径）；3s 节流防连点 */
function replaySpeech(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  lastAct = Date.now();
  sayQ(quizParts(q), qSpeech(q));
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 pop+hop 不静默 */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 对齐重玩门 */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  replaySpeech(false);
});
tipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo) { sfx('pop'); return; }   /* 吞输入期点题面轻叮（§0.16） */
  replaySpeech(false);                           /* 题面卡可点重听（儿童高发探索动作） */
});
keysEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.key');
  if (el) {
    e.preventDefault();
    if (el.dataset.d === 'del') uiDel();          /* watch 期 uiDel/uiKey 自吞+轻叮 */
    else uiKey(Number(el.dataset.d));
  }
});
okBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  uiOK();                                        /* locked/demo 期自吞（uiOK 门） */
});
stageEl.addEventListener('pointerdown', e => {   /* 点舞台空白（非键非按钮非题面）：10s 节流轻提示 */
  if (e.target.closest('.key') || e.target.closest('button') || e.target.closest('#tip')) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }  /* 吞输入期轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（num_hint+中点 pulse 三连 §0.21/§3）/
   教学"帮"5s 重演示一次。救援钟只被合法猜测推进/读题重置（§0.7a：键盘输入/空白/兔子不重置） */
function rescueAct(q) {
  rescueCount++;
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 救援语音=num_hint'试一试中间的数'（救援即教二分） */
  midDot.style.left = pct(engMid(q), q.N) + '%'; /* 数轴剩余段中点 pulse 三连 */
  midDot.classList.remove('pulse3'); void midDot.offsetWidth;
  midDot.classList.add('on', 'pulse3');
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueAct(q);
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
  KIDS.init({ game: 'numberdet', title: '数字侦探' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.ND = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: 'hunt', lo: q.lo, hi: q.hi, secret: q.secret, base: q.base,
      N: q.N, guesses: q.guesses, input: q.input, step: cur.step, miss: q.miss };
  },
  tapKey(k) { return uiKey(k); },
  tapDel() { return uiDel(); },
  tapOK() { return uiOK(); },
  start(flat) {                                  /* 测试钩子：跳关（教学看演期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                            /* UI 路径二分自动通关：恒猜中点（≤base 断言用） */
    const per = [];
    const run = cur;                             // 身份守卫：winFlow 延迟 proceed 换关即中止
    let guard = 0;
    while (cur && cur === run && !cur.done && guard++ < 80) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      while (q.input != null) uiDel();
      let g2 = 0;
      while (!q.solved && g2++ < 20) {
        const mid = engMid(q);
        String(mid).split('').forEach(ch => uiKey(Number(ch)));
        const r = await uiOK();
        if (r === false || r === null || cur !== run) break;
        await wait(40);
      }
      if (cur !== run) break;
      per.push(q.guesses);
    }
    return { done: !!(cur && cur.done && cur === run), perQuiz: per,
             total: per.reduce((a, b) => a + b, 0) };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
