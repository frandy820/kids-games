/* ================= sortsize 主逻辑（r19 三题型渲染 / 飞入动画 / 教学 / 推进 / 救援双锚）
   玩法（SPEC §-r19）：sort=按方向全排序 6-7 物相近档 / dual=先大小再颜色双属性
   / ord=点"第 N 大/N 小"的那一个。题面语音三族 clip（sor_q_*）。
   点对=emoji 飞入排序条下一格（ord=飞入单槽）；点错=晃动（不灰化可重点，SPEC §3），
   首错不 pulse，miss≥2 应点卡 breathe。已排卡 .gone 隐藏保位（非灰化——已非候选）。
   每关 5 题；救援双锚（家族 B）：14s 方向级=重读题面+题面卡 pulse（不泄答案）
   / 30s 答案级=应点卡 breathe；错反馈豁免窗（契约 I）=estMs(wrong)+300 窗内错点吞对选放行。
   方向视觉承载（零文字）：题面卡与排序条起点端 大象→蚂蚁/蚂蚁→大象 渐变示意+箭头；
   dual 加首色→次色徽章；ord=sizes 序圆点行第 rank 位套圈。
   验收钩子：window.SO = { get currentLevel, get quiz(){kind,tier,qi,kindId,order,first,rank,
   items,colors,left,pos,answerIdx,step,miss}, tapCard(i), async autoSolve(), get tutorial }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流（契约 J）；force 豁免恰一次——不灰化款
   （miss 无上限）必须 === 2（batch9 定版）：豁免只在每题 miss 首达 2 时发一次；
   返回是否起播——豁免窗仅起播时设（契约 I「起播设窗」，r19） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                       /* 错反馈豁免窗终点（救援 interval 让路，契约 I） */
const sayW = (key, text, force) => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return true; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); return true; }
  return false;
};

const stageEl = $id('stage'), stripEl = $id('strip'), boardEl = $id('board'),
      badgeEl = $id('dir-badge'), chipEl = $id('prompt-chip'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');
const slotEl = p => stripEl.querySelector('.slot[data-pos="' + p + '"]');
/* 槽内 emoji 缩放：按原 font-size 0.58 倍显示（clamp 20-56）→ 整条呈现大小渐变 */
const slotSize = size => Math.max(20, Math.min(56, Math.round(size * 0.58)));
const glyphOf = (q, i) => q.kind === 'dual' ? DUAL_COLORS[q.colors[i]].e : KINDS[q.kindId].e;
const nameOf = (q, i) => q.kind === 'dual' ? DUAL_COLORS[q.colors[i]].name : KINDS[q.kindId].name;

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
   三族题面句=sor_q_* clip（r19 clip 化；queue 段缺 clip 走 TTS 兜底）；
   题句不同即整句不同——题面/救援/重听共用 */
function speakQuiz(q) {
  if (!q) return;
  KIDS.voice.queue([{ key: qKeyOf(q), text: qSpeech(q) }]);
}
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 题面句，
   queue 单通道顺序播（clip 段 onended 接力，禁双通道叠音） */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key, { key: qKeyOf(q), text: qSpeech(q) }]);
}

/* ================= 渲染（r19 三题型分流） ================= */
function buildStrip(q) {                        // 排序条：方向徽章 + n 空槽（ord=单槽大格，数字=rank）
  stripEl.classList.toggle('ord', q.kind === 'ord');
  badgeEl.innerHTML = q.kind === 'dual'
    ? dirHtml(q.order, 0.95) + legendHtml(q.first, 0.95)   // 双属性：方向示意+首色→次色徽章
    : dirHtml(q.order, 0.95);                              // 起点=排序方向示意（零文字，SPEC §3）
  badgeEl.dataset.order = q.order;
  stripEl.innerHTML = '';
  const slots = q.kind === 'ord' ? 1 : q.items.length;
  for (let i = 0; i < slots; i++) {
    const d = document.createElement('div');
    d.className = 'slot';
    d.dataset.pos = i;
    d.innerHTML = '<i class="s-num">' + (q.kind === 'ord' ? q.rank : (i + 1)) + '</i>';
    stripEl.appendChild(d);
  }
}
function buildBoard(q) {                        // emoji 卡：乱序大小展示，入场 stagger；无文字（§0.19）
  boardEl.innerHTML = '';
  q.items.forEach((size, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.size = size;                      // verify 对账（渲染即引擎）
    if (q.kind === 'dual') b.dataset.c = q.colors[i];
    b.setAttribute('aria-label', nameOf(q, i) + '，' + (q.order === 'big' ? '大' : '小'));
    b.style.animationDelay = (i * 70) + 'ms';
    const em = document.createElement('span');
    em.className = 'c-emoji';
    em.style.fontSize = size + 'px';            // 级差缩放承载大小语义
    em.textContent = glyphOf(q, i);
    b.appendChild(em);
    boardEl.appendChild(b);
  });
}
function renderPrompt(q) {                      // 题面卡（点重听）：sort/dual=方向示意 / ord=序数锚
  if (q.kind === 'ord') chipEl.innerHTML = ordAnchorHtml(q, 1.15);
  else if (q.kind === 'dual') chipEl.innerHTML = dirHtml(q.order, 1.15) + legendHtml(q.first, 1.15);
  else chipEl.innerHTML = dirHtml(q.order, 1.15);
  chipEl.dataset.order = q.order;
  if (q.kind === 'dual') chipEl.dataset.first = q.first;
  else chipEl.removeAttribute('data-first');
  if (q.kind === 'ord') chipEl.dataset.rank = q.rank;
  else chipEl.removeAttribute('data-rank');
  chipEl.setAttribute('aria-label', qSpeech(q) + '，点我再听一遍');
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  buildStrip(q);
  buildBoard(q);
  renderPrompt(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);  /* 开场/换题读题（方向随题重申）；demo 门防演示收尾叠播；quiet=开场/教学交接改顺序链 */
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
   → transition 结束后目标槽填充+亮起（槽内 emoji 按比例缩放呈现渐变） */
function flyStep(el, pos, q, i) {
  const dur = 420 * SPEED;
  const size = q.items[i];
  if (el) el.classList.add('gone');
  const slot = slotEl(pos);
  if (el && slot) {
    const from = el.getBoundingClientRect();
    const to = slot.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'fly';
    fly.textContent = glyphOf(q, i);
    fly.style.fontSize = size + 'px';
    fly.style.left = from.left + 'px';
    fly.style.top = from.top + 'px';
    fly.style.width = from.width + 'px';
    fly.style.height = from.height + 'px';
    fly.style.transitionDuration = dur + 'ms';
    document.body.appendChild(fly);
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    const k = slotSize(size) / size;
    requestAnimationFrame(() => {
      fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')';
    });
    setTimeout(() => fly.remove(), dur + 90);   // transition 结束后移除飞行体
  }
  setTimeout(() => fillSlot(pos, q, i), dur);   // 到达即填充亮起
  return dur;
}
function fillSlot(pos, q, i) {
  const s = slotEl(pos);
  if (!s) return;
  s.innerHTML = '';                              // 清占位 s-num，防重复 DOM 叠放（batch11 审查 m3）
  s.classList.remove('lit'); void s.offsetWidth;
  s.classList.add('lit');
  const em = document.createElement('span');
  em.className = 's-emoji';
  em.style.fontSize = slotSize(q.items[i]) + 'px';    // 按比例缩放→整条大小渐变
  em.textContent = glyphOf(q, i);
  s.appendChild(em);
  const num = document.createElement('i');
  num.className = 's-num';
  num.textContent = q.kind === 'ord' ? q.rank : (pos + 1);
  s.appendChild(num);
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
/* 教学"帮"阶段指向：当前题当前应点的 emoji 卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(q.answerIdx), 'tut');
}

/* ================= emoji 卡点选主路径（真实点击 / SO.tapCard / autoSolve 共用） ================= */
async function uiTapCard(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  /* 契约 I（r19）：错反馈豁免窗内——错点吞（对选放行），防 miss 连发与语音截断；
     吞=轻叮+容器 bump（家族 D），miss/step 不动（误触不罚，b 系惯例） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answerIdx) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';            /* 已排卡/已答题：早退零惩罚不计数（§0.7 防御层） */
  const el = cardEl(i);

  if (r === 'wrong') {                          /* 答错：晃动（不灰掉可重点，SPEC §3 不灰化款） */
    if (el) { el.classList.remove('wig', 'breathe'); void el.offsetWidth; el.classList.add('wig'); }
    dodgeLo();
    if (sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2))   /* flat<3 每错必播 / flat≥3 10s 节流+豁免恰一次 */
      wrongChainUntil = Date.now() + estMs(VOICE.wrong.text) + 300;   /* 豁免窗=句长+300（契约 I，4350） */
    if (q.miss >= 2) {                          /* 首错不 pulse：连错 2 次才高亮应点卡 */
      const ok = cardEl(q.answerIdx);
      if (ok && !ok.classList.contains('gone')) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    await wait(480 * SPEED);
    return r;
  }

  /* ---- 答对：源卡飞入排序条目标槽亮起 →（题末）推进 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) el.classList.remove('breathe', 'wig');
  const target = q.kind === 'ord' ? 0 : q.pos - 1;   /* 引擎已推进：sort/dual 槽=pos-1 / ord=单槽 0 */
  const dur = flyStep(el, target, q, i);
  chimeStep();
  await wait(dur + 220 * SPEED);                /* 等飞入 transition 结束再量测/推进（§0.11） */
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  if (r === 'step') {                           /* 题内排对一步：不换题（方向/卡区不变） */
    state.locked = false;
    return r;
  }
  sfx('coin');                                  /* 排完一题/通关：全槽亮起小停顿 */
  if (r === 'done') { winFlow(); return r; }
  await wait(430 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  renderQuiz();                                 /* 换题：新题面整句重申+徽章/题面卡翻转 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN_HINTS[dch-1]
     （家族 F：禁 (ci+1)%4 字面——b26 审查 M3） */
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：winFlow 也实算 lim-1（双实算定版） */
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
  lastDir = Date.now();                         /* 家族 B：方向级锚随关重置 */
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与豁免窗（契约 I/J 配套） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  /* verify 页恒走 openingSpeak（stub 记录开场链供断言，教学由 verify 教学链单元直驱覆盖）
     家族 E：行为分流先查教学特例子键（freshTut 判定读 sv.sortsize.tutSeen） */
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.sortsize && sv.sortsize.tutSeen);
  if (VERIFY) { openingSpeak(); return; }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面句顺序链（§0.5） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示排对一步（locked 吞输入，demo 参数豁免）→帮=指向应点卡；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  badgeEl.classList.remove('teach'); void badgeEl.offsetWidth;   /* 方向徽章首现显式教学：放大闪亮一拍（试玩 P2③） */
  badgeEl.classList.add('teach');
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = q.answerIdx;
  pointGhostAt(cardEl(idx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapCard(idx, true);                    // demo 通道豁免 locked（演示吞真实输入）
  await wait(1000 * SPEED);                      // 飞入亮起演出窗口
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.sortsize = sv.sortsize || {};
    sv.sortsize.tutSeen = true;
    KIDS.store.persist();
  }
  /* 立即重发同关（确定性关卡，题面一致），"你来排一排"在重发后的题面上说（照 batch5-10） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链：turn clip→题面句，queue 单通道顺序播不叠音（§0.6） */
  openingSpeak(true);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.won) return;                           /* T4 m4：通关态点兔子零反应（与教学/演出轻反馈分流） */
  if (state.locked || state.demo) {                /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默（试玩 P2①） */
    sfx('pop');
    hopRabbit();
    return;
  }
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
  replayAnim(hearBtn, 'bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整句重读 */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（点题卡=儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (p) {                                       // emoji 卡：主答路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) {   /* §0.22 吞输入期轻叮+容器 bump（家族 D） */
      sfx('pop');
      replayAnim(boardEl, 'bump');
    }
    uiTapCard(Number(p.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return;  // 题面卡走自己的 handler
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22，试玩 P2①） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护（家族 B 双锚，r19）：14s 方向级=重读题面+题面卡 pulse
   （不泄答案；lastDir 独立节流锚，不重置 lastAct——30s 答案级不被饿死）
   / 30s 答案级=应点卡 breathe（静音也能看见答案线索）/ 教学"帮"5s 重演示一次 ================= */
function breatheAnswer(q) {
  const ok = cardEl(q.answerIdx);
  if (ok && !ok.classList.contains('gone')) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
}
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;      /* 契约 I：错反馈豁免窗内救援让路 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   /* 契约 K：面板在场守卫 */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：泄答案兜底档（30s 才指答案） */
    const q = cur.quizzes[cur.step];
    if (q) { breatheAnswer(q); speakQuiz(q); }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+题面卡 pulse（不泄答案） */
    const q = cur.quizzes[cur.step];
    if (q) { speakQuiz(q); replayAnim(chipEl, 'pulse'); }
    else sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'sortsize', title: '大小排排队' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：启动处传 lim-1 */
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（b14 家族修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.SO = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, pdch: cur.pdch, lv: cur.lv,
      n: cur.quizzes.length, step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      kind: q.kind || null, order: q.order || null, pos: q.pos || 0 };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind, tier: q.tier, qi: q.qi, kindId: q.kindId,    /* SPEC §-r19 钩子契约 */
      order: q.order, first: q.first || null, rank: q.rank || null,
      items: q.items.slice(), colors: q.colors ? q.colors.slice() : null,
      left: q.left.slice(), pos: q.pos, answerIdx: q.answerIdx, step: cur.step, miss: q.miss };
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                           // UI 路径自动点完当前关（逐题逐步点应点卡；ord 单点）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 60) {  // 5 题 × 最多 7 物 = 35 tap 上界，guard 60 余量
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
