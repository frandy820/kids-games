/* ================= habit 主逻辑（顺序条/步骤卡渲染 / 飞入动画 / 教学 / 推进）
   r5：卡区=q.cards（真实步 {s} 与干扰卡 {d} 交错，6-9 张）；点干扰卡=晃动计错（辨析训练）。
   纠错语音=方向锚中性句（feedbackFor：起点/依赖/顺序锚，不泄步骤名——SPEC §3-r5）；
   反馈句走 TTS 拼句，estMs=TTS_MAX_CHARS*345+600=5430（r4 m-5 家族定版口径，非阻塞不设窗）。
   玩法：题面=流程名（hb_q_* clip + hb_suffix 尾段 clip，T46 阶段2 全 clip 拼句，queue 顺序播不叠音）。
   点对=卡 CSS transition 飞入上方顺序条第 pos 位亮起；点错=晃动（不灰化可重点，SPEC §3），
   首错不 pulse，miss≥2 应点卡 breathe。已排卡 .gone 隐藏保位（非灰化——已非候选）。
   每关 5 题；救援=重读题面+应点卡 pulse 一次（§0.21 视觉重现）。
   验收钩子：window.HB = { get currentLevel, get quiz(){hid,name,steps,shown,decoys,cards,
   pos,answerIdx,step,miss}, tapCard(i), async autoSolve(), get tutorial }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次——不灰化款（miss 无上限）
   必须 === 2（batch9 定版）：豁免只在每题 miss 首达 2 时发一次，防豁免变每错必播 */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const stageEl = $id('stage'), stripEl = $id('strip'), boardEl = $id('board'),
      chipEl = $id('prompt-chip'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');
const slotEl = p => stripEl.querySelector('.slot[data-pos="' + p + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：排对一步=短双音 / 答错=低柔单音 / 排完一题=叮咚 */
const chimeStep = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.12, 0, 0.55); KIDS.audio.note(880, 0.18, 0.07, 0.6); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（读题 sayR 级不受 flat 门）
   整句 = hb_q_* clip + hb_suffix 尾段 clip（T46 阶段2 全 clip 零 keyless），queue 顺序播（段间 0.15s，禁叠音） */
function speakQuiz(q) {
  if (!q) return;
  KIDS.voice.queue(qSpeechParts(q.hid));
}
/* r5 纠错方向锚（去泄序）：按错位选中性句，不泄具体步骤名——
   相邻交换（点到下一步）→ 顺序锚；开头错（pos=0）→ 起点锚；中间错（pos>0）→ 依赖锚；
   点干扰卡不揭示干扰身份，按位置走起点/依赖锚（verify 负向断言：反馈不含步骤名/流程名） */
function feedbackFor(q, i) {
  const c = q.cards[i];
  if (c && c.s !== undefined && c.s === q.pos + 1) return VOICE.wrongAdj;
  return q.pos === 0 ? VOICE.wrongStart : VOICE.wrongMid;
}
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn）→ 题面两段，queue 单通道顺序播 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key].concat(qSpeechParts(q.hid)));
}

/* ================= 渲染 ================= */
function buildStrip(n) {                        // 顺序条：n 空槽（虚线+序号大字）
  stripEl.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'slot';
    d.dataset.pos = i;
    d.innerHTML = '<i class="s-num">' + (i + 1) + '</i>';
    stripEl.appendChild(d);
  }
}
function buildBoard(q) {                        // 步骤卡：q.cards 交错展示（真实步 shown 序+干扰卡），入场 stagger
  boardEl.innerHTML = '';
  q.cards.forEach((c, i) => {
    const st = c.d !== undefined ? stepOf(q.decoys[c.d].h, q.decoys[c.d].s) : stepOf(q.hid, c.s);
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.sid = st.id;                      // verify 对账（渲染即引擎；干扰卡=来源序列步骤 id）
    b.setAttribute('aria-label', st.t);
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="c-emoji">' + st.e + '</span><span class="c-word">' + st.t + '</span>';
    boardEl.appendChild(b);
  });
}
function renderPrompt(q) {                      // 题面行：流程图标 + 名称大字 + 问句（指令全语音承载）
  chipEl.innerHTML = '<span class="p-ico">' + HABITS[q.hid].icon + '</span>' +
    '<span class="p-name">' + q.name + '</span><span class="p-ask">' + Q_SUFFIX + '？</span>';
  chipEl.setAttribute('aria-label', q.name + Q_SUFFIX + '，点我再听一遍');
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  buildStrip(q.steps.length);
  buildBoard(q);
  renderPrompt(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);  /* 开场/换题读题；demo 门防演示收尾叠播；quiet=开场/教学交接改顺序链 */
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
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 飞入动画（§0.11：CSS transition，时长随 SPEED）
   源卡立即 .gone 隐藏保位 → 克隆飞行体 fixed 从源卡矩形 transform 到目标槽矩形
   → transition 结束后目标槽填充+亮起（槽亮与飞行体到达同步） */
function flyStep(el, pos, step) {
  const dur = 420 * SPEED;
  if (el) el.classList.add('gone');
  const slot = slotEl(pos);
  if (el && slot) {
    const from = el.getBoundingClientRect();
    const to = slot.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'fly';
    fly.textContent = step.e;
    fly.style.left = from.left + 'px';
    fly.style.top = from.top + 'px';
    fly.style.width = from.width + 'px';
    fly.style.height = from.height + 'px';
    fly.style.transitionDuration = dur + 'ms';
    document.body.appendChild(fly);
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    const k = Math.min(to.width, to.height) / Math.max(from.width, from.height);
    requestAnimationFrame(() => {
      fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')';
    });
    setTimeout(() => fly.remove(), dur + 90);   // transition 结束后移除飞行体
  }
  setTimeout(() => fillSlot(pos, step), dur);   // 到达即填充亮起
  return dur;
}
function fillSlot(pos, step) {
  const s = slotEl(pos);
  if (!s) return;
  s.classList.remove('lit'); void s.offsetWidth;
  s.classList.add('lit');
  s.innerHTML = '<span class="s-emoji">' + step.e + '</span><i class="s-num">' + (pos + 1) + '</i>';
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
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：当前题当前应点的步骤卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(q.answerIdx), 'tut');
}

/* ================= 步骤卡点选主路径（真实点击 / HB.tapCard / autoSolve 共用） ================= */
async function uiTapCard(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';            /* 已排卡/已答题：早退零惩罚不计数（§0.7 防御层） */
  const el = cardEl(i);

  if (r === 'wrong') {                          /* 答错（顺序错/点干扰卡）：晃动不灰掉可重点（SPEC §3-r5） */
    if (el) { el.classList.remove('wig', 'breathe'); void el.offsetWidth; el.classList.add('wig'); }
    dodgeLo();
    const fb = feedbackFor(q, i);               /* r5 方向锚中性句（起点/依赖/顺序），不泄步骤名 */
    sayW(fb.key, fb.text, q.miss === 2);   /* flat<3 每错必播 / flat≥3 10s 节流+豁免恰一次（miss 无上限，===2 防豁免变每错必播） */
    if (q.miss >= 2) {                          /* 首错不 pulse：连错 2 次才高亮应点卡 */
      const ok = cardEl(q.answerIdx);
      if (ok && !ok.classList.contains('gone')) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    await wait(480 * SPEED);
    return r;
  }

  /* ---- 答对：源卡飞入顺序条第 q.pos-1 位亮起 →（题末）推进 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) el.classList.remove('breathe', 'wig');
  const dur = flyStep(el, q.pos - 1, stepOf(q.hid, q.pos - 1));   /* 引擎已 pos++，目标槽=pos-1 */
  chimeStep();
  await wait(dur + 220 * SPEED);                /* 等飞入 transition 结束再量测/推进（§0.11） */
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  if (r === 'step') {                           /* 题内排对一步：不换题 */
    state.locked = false;
    return r;
  }
  sfx('coin');                                  /* 排完一题/通关：全槽亮起小停顿 */
  if (r === 'done') { winFlow(); return r; }
  await wait(430 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  renderQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关章型 GEN[dch-1]（家族 F，r5 审查 m-1：
     (ci+1)%4 章序推进仅 dch 循环策略下巧合等值，防御性禁式——habitat r4 M-1 同型） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
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
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  /* verify 页恒走 openingSpeak（stub 记录开场链供断言，教学由真实页自测覆盖） */
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.habit && sv.habit.tutSeen);
  if (VERIFY) { openingSpeak(); return; }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；hint 不得切断题面） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示排对一步（locked 吞输入，demo 参数豁免）→帮=指向应点卡；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = q.answerIdx;
  pointGhostAt(cardEl(idx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapCard(idx, true);                    // demo 通道豁免 locked（演示吞真实输入）
  await wait(1000 * SPEED);                      // 飞入亮起演出窗口
  const sv = KIDS._save();
  sv.habit = sv.habit || {};
  sv.habit.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来排一排"在重发后的题面上说（照 batch5-9） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链：turn→题面两段，queue 单通道顺序播不叠音（§0.6） */
  openingSpeak(true);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* §0.20：教学/演出期点兔子不打断 */

  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20：教学/演出/通关期重玩门 */

  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查 m5：对齐重玩门/题面卡防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整段重读 */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（点题卡=儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (p) {                                       // 步骤卡：主答路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮（演出窗真实点击可感知） */
    uiTapCard(Number(p.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return;  // 题面卡走自己的 handler
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（重读题面+应点卡 pulse 一次 §0.21）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援=重读题面（§0.7a，非通用催促句）+ 视觉重现 */
    if (q) {
      speakQuiz(q);
      const ok = cardEl(q.answerIdx);           /* 应点卡 pulse 一次：静音环境屏幕可感知答案线索 */
      if (ok && !ok.classList.contains('gone')) {   /* 试玩 P3：三连脉冲（单次 1.2s 眨眼即错过，三款中最"一瞬"） */
        for (let k = 0; k < 3; k++) setTimeout(() => {
          ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse');
        }, k * 520);
      }
    } else sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'habit', title: '好习惯排序' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    /* r5 审查 M-2：传 lim-1（刚打完的最后一关）——家族 A 契约（b23/b24 定版）：
       nextHint(lim) 会按明日首关所在章预告、超前一章 */
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.HB = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      hid: q.hid || null, pos: q.pos || 0 };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { hid: q.hid, name: q.name,                         /* SPEC §3-r5 钩子契约 */
      steps: q.steps.slice(), shown: q.shown.slice(),
      decoys: q.decoys.map(d => ({ h: d.h, s: d.s })),
      cards: q.cards.map(c => (c.d !== undefined ? { d: c.d } : { s: c.s })),
      pos: q.pos, answerIdx: q.answerIdx, step: cur.step, miss: q.miss };
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                           // UI 路径自动点完当前关（逐题逐步点应点卡）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 60) {  // 5 题 × 最多 8 步 = 40 tap 上界（r5 6-8 步），guard 60 余量
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapCard(q.answerIdx);
      taps++;
      if (r === false || r === null) break;     // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
