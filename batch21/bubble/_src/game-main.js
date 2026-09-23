/* ================= bubble 主逻辑 v2/r9（去计数器+颜色子集+提交制+倒计时收尾 / 泡泡场渲染 / 教学 / 推进）
   玩法：天空持续冒彩泡（蓝/黄/粉三色上飘+左右摆+灰云朵干扰），顶部只显示目标数 N+目标色色卡
   ——当前计数不显示，孩子必须自己在心里数。点破目标色泡=计数+1+数词语音；点非目标色泡=
   不破+抖动+轻「呜」（探索）；点灰云=破但不计数（探索）。点够后点兔子旁「好了」大按钮提交：
   ==N→right / >N→「多点了，重新数一数」清空重数（泡重置，miss+1）/ <N→「还差几个，再点点」
   不清空继续点。泡飘出顶=自然消失不罚；场恒保目标色泡 ≥2（respawn 秒级）。
   r9 倒计时收尾（章后段=每章第 4/5 关 cur.timed）：每题先静默数数 QUIET_SEC(n)（无计时显示），
   后 COUNT_SEC 可见温和倒计时（#timer 琥珀条收缩，末 3 秒转橙轻脉冲）；超时泡泡缓浮不爆
   SLEEP_SEC（静息：点泡/提交软吞 'sleep' 零惩罚，queue 播 bub_timeup+题面重读），随后自动
   温和重来（计数清零+计时重臂，泡唤醒不重建场——miss/submitErr/cloudPops/step 全不动）。
   estMs 家族定版字面 `const estMs = n => n * 345 + 600;`（n=码点数；四处同步=game-data 定义 /
   本注释 / game-verify 独立副本+数值断言 / build.py 字面 assert；禁 +300 变体）。
   验收钩子：window.BB = { get currentLevel, get quiz, get bubbles, tapBubble(id), tapSubmit(),
   async autoSolve(), get tutorial, get timer } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出与泡场模拟提速（dt/SPEED 喂引擎）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音（承 feed 款口径）：flat<3 每错必播；flat≥3 走 10s 节流；
   force=miss===2 豁免恰一次（wrong_less 不清空可连续触发，===2 保证豁免只发一次） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const fieldEl = $id('field'), counterEl = $id('counter'),
      rabbitBtn = $id('btn-rabbit'), submitBtn = $id('btn-submit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost'), timerEl = $id('timer');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let field = null;                               // 当前泡泡场（engField 产物）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let tstate = { phase: 'off', t0: 0, countEnd: 0, sleepEnd: 0 };   // r9 倒计时状态机（UI 层，走 field.t 模拟钟）
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点天空空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  submitBtn.innerHTML = ICONS.submit;
  $id('bicon').innerHTML = ICONS.bubbleMini;
  fieldEl.querySelector('.sky').innerHTML = skySvg();
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：点破=清脆双音 / 云朵与非目标色「呜」=低柔下滑 / 提交成=轻铃上扬 */
const popSfx = () => { if (!VERIFY) { KIDS.audio.note(988, 0.1, 0, 0.55); KIDS.audio.note(1319, 0.12, 0.05, 0.4); } };
const wooSfx = () => { if (!VERIFY) { KIDS.audio.note(233, 0.2, 0, 0.4); KIDS.audio.note(175, 0.24, 0.1, 0.35); } };
const chimeFull = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.24, 0, 0.5); KIDS.audio.note(783.99, 0.3, 0.09, 0.5); } };

/* ================= 泡泡场渲染（引擎逐帧 → DOM；transform 定位，量测走 offsetWidth/offsetHeight） ================= */
const bubbleEls = new Map();                    // id → button
const lastPos = new Map();                      // id → {x,y} 场内像素（爆裂圈/幽灵手指定位用）
function mkBubbleEl(b) {
  const el = document.createElement('button');
  el.className = 'bubble' + (b.kind === 'cloud' ? ' cloud' : '') + (b.big ? ' big' : '');
  el.dataset.id = b.id;
  el.setAttribute('aria-label', b.kind === 'cloud' ? '小云朵' : '泡泡');
  el._hw = b.big ? 48 : 38;                     // 半宽（命中盒 96/76 的一半，transform 中心定位用）
  el.innerHTML = '<span class="bod">' + (b.kind === 'cloud' ? cloudSvg() : bubbleSvg(b.hue)) + '</span>';
  return el;
}
function renderField() {
  if (!cur || !field) return;
  const W = fieldEl.clientWidth, H = fieldEl.clientHeight;
  const seen = {};
  for (let i = 0; i < field.bubbles.length; i++) {
    const b = field.bubbles[i];
    seen[b.id] = 1;
    let el = bubbleEls.get(b.id);
    if (!el) { el = mkBubbleEl(b); bubbleEls.set(b.id, el); fieldEl.appendChild(el); }
    const x = (b.x + b.wobA * Math.sin(b.wobP + field.t * b.wobF)) * W;
    const y = (1 - b.y) * H;
    lastPos.set(b.id, { x: x, y: y });
    el.style.transform = 'translate3d(' + Math.round(x - el._hw) + 'px,' + Math.round(y - el._hw) + 'px,0)';
  }
  bubbleEls.forEach((el, id) => { if (!seen[id]) { el.remove(); bubbleEls.delete(id); lastPos.delete(id); } });
  if (ghost.trackId != null) {                  // 幽灵手指逐帧跟泡
    const p = lastPos.get(ghost.trackId);
    if (p) {
      const r = fieldEl.getBoundingClientRect();  // fixed 手指换算屏幕坐标（运行时定位，非布局断言）
      ghostEl.style.left = Math.round(r.left + p.x) + 'px';
      ghostEl.style.top = Math.round(r.top + p.y) + 'px';
    } else {
      ghost.trackId = null;
      if (state.tut === 'help') pointHelpNext();
    }
  }
}
/* 点破裂圈：在场内像素位放一枚扩散环（云朵灰色版），340ms 后移除 */
function burstAt(id, cloud) {
  const p = lastPos.get(id);
  if (!p) return;
  const d = document.createElement('div');
  d.className = 'burst' + (cloud ? ' cloud' : '');
  d.style.left = Math.round(p.x) + 'px';
  d.style.top = Math.round(p.y) + 'px';
  fieldEl.appendChild(d);
  setTimeout(() => d.remove(), 340 * SPEED + 80);
}
/* 非目标色泡抖动（不破——色不对的可见提示） */
function shakeBubble(id) {
  const el = bubbleEls.get(id);
  if (!el) return;
  el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
  setTimeout(() => { el.classList.remove('nope'); }, 500 * SPEED + 100);
}
function resetField() {
  field = engField(cur);
  armTimer();                                   /* r9：场重建（新关/多点重数）→ 倒计时重臂（模拟钟归零重启） */
  bubbleEls.forEach(el => el.remove());
  bubbleEls.clear();
  lastPos.clear();
}

/* ---------- 模拟驱动：rAF 为主 + 250ms interval 兜底（后台/降频帧停摆不断流）；dt 钳 250ms ---------- */
let lastT = 0;
function advance(now) {
  if (!cur || !field) { lastT = now; return; }
  const dtReal = Math.min(now - lastT, 250);
  lastT = now;
  if (dtReal > 0 && !state.won) {
    const drift = tstate.phase === 'sleep' ? DRIFT_K : 1;   /* r9 静息期缓浮（泡泡缓浮不爆——泡速/生成/模拟钟同步放慢） */
    engFieldTick(field, dtReal / 1000 / SPEED * drift);     // 泡速/生成按 SPEED 缩放
    timerTick();                                            // r9 倒计时推进（静息窗按 DRIFT_K 折算的同一模拟钟）
  }
  renderField();
}

/* ================= r9 倒计时收尾状态机（UI 层；引擎 engFieldTick 直驱不涉计时保确定性）
   armTimer  新题/泡场重建时重臂（renderQuiz 与 resetField 双锚点）
   quiet     静默数数窗 QUIET_SEC(n)：无计时显示（不打扰数数）
   count     可见倒计时 COUNT_SEC：#timer.on 琥珀条收缩，remain<3s 转 .low（橙+轻脉冲）
   sleep     超时静息 SLEEP_SEC（模拟钟按 DRIFT_K 折算）：field.sleep 缓浮、输入软吞 'sleep'、
             queue 播 bub_timeup→题面重读；lastAct 刷新（静息不计救援静置）
   roll      温和重来：q._cnt 清零+重臂 quiet（泡唤醒不重建场；miss/submitErr/cloudPops/step 零改动） */
function armTimer() {
  tstate = { phase: cur && cur.timed && !cur.done ? 'quiet' : 'off',
             t0: field ? field.t : 0, countEnd: 0, sleepEnd: 0 };
  fieldEl.classList.remove('sleep');
  if (timerEl) timerEl.classList.remove('on', 'low');   /* 立即摘除（不等下一帧 timerTick） */
}
function timerTick() {
  if (!cur || state.won || cur.done) { if (timerEl) timerEl.classList.remove('on', 'low'); return; }
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (tstate.phase === 'quiet' && cur.timed && field.t - tstate.t0 >= QUIET_SEC(q.n)) {
    tstate.phase = 'count';                                // 收尾开始：温和单音+琥珀条登场
    tstate.countEnd = field.t + COUNT_SEC;
    if (!VERIFY) KIDS.audio.note(523.25, 0.16, 0, 0.22);
  } else if (tstate.phase === 'count' && field.t >= tstate.countEnd) {
    tstate.phase = 'sleep';                                // 超时：泡泡缓浮不爆（非惩罚）
    tstate.sleepEnd = field.t + SLEEP_SEC * DRIFT_K;       // 静息窗按缓浮钟折算（真实体感=SLEEP_SEC）
    fieldEl.classList.add('sleep');
    lastAct = Date.now();
    counterEl.classList.remove('rescue'); void counterEl.offsetWidth; counterEl.classList.add('rescue');
    KIDS.voice.queue([{ key: VOICE.timeup.key, text: VOICE.timeup.text },   /* 睡着啦不着急→题面重读（顺序播） */
                      { key: quizKey(q), text: quizSpeech(q) }]);   /* T46 阶段2 题面 clip（链尾段，缺 clip 文本自愈） */
  } else if (tstate.phase === 'sleep' && field.t >= tstate.sleepEnd) {
    q._cnt = 0;                                            // 温和重来：从零重数（零惩罚）
    tstate.phase = cur.timed ? 'quiet' : 'off';
    tstate.t0 = field.t;
    tstate.countEnd = 0; tstate.sleepEnd = 0;
    fieldEl.classList.remove('sleep');
  }
  if (timerEl) {                                           // #timer 渲染（仅 count 相位可见）
    const on = tstate.phase === 'count';
    timerEl.classList.toggle('on', on);
    if (!on) { timerEl.classList.remove('low'); }
    else {
      const rem = Math.max(0, tstate.countEnd - field.t);
      timerEl.firstElementChild.style.width = (rem / COUNT_SEC * 100).toFixed(1) + '%';
      timerEl.classList.toggle('low', rem < 3.05);
    }
  }
}
function rafCB(now) { advance(now); requestAnimationFrame(rafCB); }
requestAnimationFrame(rafCB);
setInterval(() => { if (performance.now() - lastT > 300) advance(performance.now()); }, 250);

/* ================= 题面渲染（v2：目标色色卡+目标数——当前计数不显示） ================= */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  $id('target-n').textContent = q.n;
  $id('bicon').innerHTML = bubbleSvg(HUE_OF[q.color]);      // 目标色色卡（图形呈现，零文字）
  armTimer();                                   /* r9：新题 → 倒计时重臂（题面即计时锚） */
  renderStep();
  if (!VERIFY && !state.demo) KIDS.voice.play(quizKey(q), quizSpeech(q)); // 读题：题面 clip（T46 阶段2，缺 clip 文本自愈）
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
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 幽灵手指（教学"帮"/演示共用；逐帧跟泡） ================= */
const ghost = {
  trackId: null,
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { this.trackId = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(id) {
  if (VERIFY || id == null) return;
  ghost.trackId = id;
  ghost.show();
  setTimeout(() => { if (ghost.trackId === id) ghost.press(); }, 800 * SPEED);
}
function ghostToSubmit() {                      // 幽灵手指静态指向「好了」按钮（教学提交步演示）
  if (VERIFY) return;
  ghost.trackId = null;
  const r = submitBtn.getBoundingClientRect();
  ghostEl.style.left = Math.round(r.left + r.width / 2) + 'px';
  ghostEl.style.top = Math.round(r.top + r.height / 2) + 'px';
  ghost.show();
}
function pointHelpNext() {                      // 教学"帮"：未点够指目标色泡；点够了指「好了」按钮
  if (!cur || !field) return;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q._cnt >= q.n) { ghostToSubmit(); return; }
  const b = engFirstColor(field, q.color);
  if (b) pointGhostAt(b.id);
}

/* ================= 点泡主路径（真实点击 / BB.tapBubble / autoSolve / 教学演示共用）
   v2 返回值：'pop' 目标色点破 / 'skip' 非目标色或干扰云（不计数）/ null 演出期吞输入 /
   'sleep' r9 静息期软吞（泡泡缓浮不爆——零声零惩罚）/ false 非法 id 或泡已离场 ---------- */
async function uiTapBubble(id, demo) {
  if (!cur || state.won) return false;
  if (tstate.phase === 'sleep') return 'sleep';             /* r9 静息期：泡不爆不响（软吞非惩罚） */
  if ((state.locked && !demo) || (state.demo && !demo)) { sfx('pop'); return null; }   // 吞输入轻叮（演出期 null）
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur——防旧续体错推进 */
  const r = engTapBubble(field, id);
  if (r === null) { sfx('pop'); return false; } /* 泡已不在场/非法 id：轻叮零惩罚 */
  if (r === 'nope') {                           /* 非目标色：泡不破+抖动+「呜」轻反馈（探索≠错误） */
    wooSfx();
    shakeBubble(id);
    return 'skip';
  }
  burstAt(id, r === 'cloud');
  if (r === 'cloud') {                          /* 干扰云朵：点破不计数+「呜」（探索≠错误，不说 wrong） */
    wooSfx();
    if (state.tut === 'help') pointHelpNext();
    return 'skip';
  }
  lastAct = Date.now();                         /* 仅目标色点破重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次点破目标色 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  popSfx();
  KIDS.voice.play(numKey(q._cnt), numCn(q._cnt));   /* 跟数数词 clip（T46 阶段2，缺 clip 文本自愈——计数不显示，耳朵是刻度） */
  return 'pop';
}

/* ================= 提交主路径 v2/r9（「好了」按钮 / BB.tapSubmit / autoSolve / 教学演示共用）
   返回值：'right'（含末题成——通关内部走 winFlow）/ 'wrong_more' / 'wrong_less' /
   'sleep' r9 静息期软吞（重来前不收卷——零惩罚）/ null 演出期吞输入或无题 ---------- */
async function uiSubmit(demo) {
  if (!cur || state.won) return null;
  if (tstate.phase === 'sleep') return 'sleep';             /* r9 静息期：提交软吞（重来后再数） */
  if ((state.locked && !demo) || (state.demo && !demo)) { sfx('pop'); return null; }   // 吞输入（演出期 null）
  const run = cur;                              /* 身份守卫（同上） */
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  const r = engSubmit(field);
  if (r === null) return null;

  if (r === 'wrong_less') {                     /* 少点：不清空继续点（合法路径不算 miss） */
    lastAct = Date.now();
    state.locked = true;                        /* 短窗防连点提交刷语音 */
    wooSfx();
    hopRabbit();
    sayW(VOICE.wrongLess.key, VOICE.wrongLess.text, engMiss(cur) === 2);
    await wait(500 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') pointHelpNext();
    return 'wrong_less';
  }
  if (r === 'wrong_more') {                     /* 多点：清空重数+泡重置+miss+1（真实错误路径） */
    lastAct = Date.now();
    state.locked = true;
    wooSfx();
    resetField();                               /* 泡重置（确定性种子=同构新场） */
    hopRabbit();
    sayW(VOICE.wrongMore.key, VOICE.wrongMore.text, engMiss(cur) === 2);
    await wait(600 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') pointHelpNext();
    return 'wrong_more';
  }
  /* right / done：提交成 */
  lastAct = Date.now();
  state.locked = true;                          /* 120ms 防重入窗（承原节奏） */
  chimeFull();
  await wait(120 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') winFlow();
  else {
    renderQuiz();
    if (state.tut === 'help') pointHelpNext();
  }
  return 'right';
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  /* 家族契约 F（r9）：生成关预告禁"章索引加一取模"字面——须实算 genLevel(f+1).dch 取 GEN_HINTS
     （旧式按章索引加一取模在生成关章中段 off-by-one——dayEnd 传 lim-1 常为章中段，必错章）
     r7 审查 M1 同型坑：静态章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4 口径） */
  if (f + 1 < STATIC_LEVELS) return CHAPTERS[Math.floor(f / CH_LEN) + 1].hint;
  return GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);      /* bub_right：数对啦，泡泡真好玩 */
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
  cur = genLevel(flat);
  resetField();
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastWrongVoice = 0;                          /* 契约 J 配套：换关重置错反馈节流锚（审查 m2） */
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.bubble && sv.bubble.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指逐个点破 3 只蓝泡（数词同步）→「数够了就拍拍小兔子」→手指按「好了」按钮→题成演示；
   帮=未点够指目标色泡/点够了指「好了」；独=首次点破放手（watch ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);      /* 看！点蓝色的小泡泡 */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                     /* flat0 题0 恒 n=3 color='blue' */
  let demoR = null;
  for (let k = 0; k < q.n; k++) {               // 演示逐个点破（恒 3 次；泡离场则等 respawn 再指）
    let id = null, guard = 0;
    while (id == null && guard++ < 40) {
      const b = engFirstColor(field, q.color);
      if (b) id = b.id; else await wait(200 * SPEED);
    }
    if (id == null) break;
    pointGhostAt(id);
    await wait(850 * SPEED);
    ghost.press();
    await wait(300 * SPEED);
    demoR = await uiTapBubble(id, true);        /* demo 通道豁免 locked 门（演示吞输入） */
    await wait(520 * SPEED);
  }
  KIDS.voice.play(VOICE.enough.key, VOICE.enough.text);   /* 演示强调（T46 阶段2 clip 化） */
  await wait(600 * SPEED);
  ghostToSubmit();                              /* 手指移向「好了」按钮 */
  await wait(850 * SPEED);
  ghost.press();
  await wait(300 * SPEED);
  demoR = await uiSubmit(true);                 /* 演示提交 → 'right'（题 0 成） */
  window.__bbDemoR = demoR;                     /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);
  const sv = KIDS._save();
  sv.bubble = sv.bubble || {};
  sv.bubble.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来点一点，点够了拍拍小兔子"在重发后的题面上说 */
  ghost.hide();
  cur = genLevel(0);
  resetField();
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与天空场交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* 教学/演出期点兔子不打断 */
  if (tstate.phase === 'sleep') return;                 /* r9 静息期不打断 timeup→题面重读链 */
  lastAct = Date.now();
  hopRabbit();
  const q = cur.quizzes[cur.step];
  if (q && !state.won) KIDS.voice.play(quizKey(q), quizSpeech(q));   /* 戳兔子=重读题面（含 N 与色——试玩 P2 洞察承用；T46 clip） */
  else sayP(VOICE.hint.key, VOICE.hint.text);
});
submitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (!cur) return;                              /* 提交门在 uiSubmit 内（verify 页可真实点击自测） */
  lastAct = Date.now();
  submitBtn.classList.remove('press'); void submitBtn.offsetWidth; submitBtn.classList.add('press');
  uiSubmit();
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  if (tstate.phase === 'sleep') return;                 /* r9 静息期不打断语音链 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) KIDS.voice.play(quizKey(q), quizSpeech(q));   /* 再听一遍：重读题面（T46 阶段2 clip） */
});
fieldEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.bubble');
  if (!el) {                                    /* 点天空空白：10s 节流轻提示（空白点击不重置救援钟） */
    e.preventDefault();
    if (VERIFY || !cur || state.locked || state.won || state.demo) return;
    if (tstate.phase === 'sleep') return;               /* r9 静息期空白点不触发提示语音 */
    if (Date.now() - lastBlankHint > 10000) {
      lastBlankHint = Date.now();
      sayR(VOICE.hint.key, VOICE.hint.text);
    }
    return;
  }
  e.preventDefault();
  uiTapBubble(Number(el.dataset.id));
});

/* ================= 无操作看护：14s 救援（重读题面+目标卡脉冲）/ 教学"帮"5s 重演示一次 ================= */
function rescueTick() {                        /* 命名函数+面板守卫（契约 K 形态，审查 m3） */
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (tstate.phase === 'sleep') return;                 /* r9 静息期已有引导链，救援不叠声 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援：重读题面（不受 flat 门，§0.5） */
    if (q) sayR(quizKey(q), quizSpeech(q));     /* T46 阶段2 题面 clip（缺 clip 文本自愈） */
    counterEl.classList.remove('rescue'); void counterEl.offsetWidth; counterEl.classList.add('rescue');
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && ghost.trackId == null) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'bubble', title: '泡泡数数' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：启动分支同口径（r9 修 off-by-one） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.BB = {
  start(flat) { startLevel(flat); },                    /* 外部切关（verify 页/独立复验共用口径） */
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || { _cnt: 0 };
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, done: cur.done, won: state.won, timed: !!cur.timed,
      count: q._cnt || 0, miss: engMiss(cur), pops: cur.totalPops || 0,
      cloudPops: cur.cloudPops || 0, submitErr: cur.submitErr || 0,
      colors: cur.colors.slice() };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { n: q.n, color: q.color, count: q._cnt || 0,        /* n=目标 / color=目标色 / count=已点目标色数（内部真值） */
      pops: cur.totalPops || 0, step: cur.step,                 /* pops=累计点破含干扰云 */
      miss: engMiss(cur),                                       /* miss=多点提交错次+干扰云 ≥3 折 1 */
      cloudPops: cur.cloudPops || 0, submitErr: cur.submitErr || 0 };
  },
  get bubbles() {                                                /* 场上泡快照（自驱测试用） */
    return field ? field.bubbles.map(b => ({ id: b.id, kind: b.kind, color: b.color,
      x: Math.round(b.x * 1000) / 1000, y: Math.round(b.y * 1000) / 1000, big: !!b.big })) : [];
  },
  get timer() {                                                  /* r9 倒计时状态（verify/独立复验共用）
    timed=关是否章后段计时 / phase='off'|'quiet'|'count'|'sleep' /
    remain=count 相位剩余秒 / quietRemain=quiet 相位剩余秒 */
    const q = cur && !cur.done ? cur.quizzes[cur.step] : null;
    return { timed: !!(cur && cur.timed), phase: tstate.phase,
      remain: tstate.phase === 'count' && field ? Math.round(Math.max(0, tstate.countEnd - field.t) * 100) / 100 : null,
      quietRemain: tstate.phase === 'quiet' && field && q
        ? Math.round(Math.max(0, QUIET_SEC(q.n) - (field.t - tstate.t0)) * 100) / 100 : null };
  },
  tapBubble(id) { return uiTapBubble(id); },
  tapSubmit() { return uiSubmit(); },
  async autoSolve() {                    // UI 路径自动通关（逐题点目标色至 N→tapSubmit，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 600) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q._cnt >= q.n) {
        const r = await uiSubmit();
        if (r === null) { await wait(20); continue; }
        continue;
      }
      const b = engFirstColor(field, q.color);
      if (!b) { await wait(30); continue; }
      const r = await uiTapBubble(b.id);
      if (r !== 'pop') { await wait(20); continue; }   // 泡在读取与点破间离场：重取
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
