/* ================= logicwho 主逻辑（题面渲染 / 点选动物卡 / 教学 / 救援 / 推进）
   玩法（SPEC §2）：三个座位排排坐（帽色/物品可见、住客"?"隐藏）+ 线索卡 2-3 条。
   问句"戴红帽子的是谁呀"→点下方动物卡：对=座位揭幕+徽章亮起+动物跳一下+把结论说成
   完整正陈述（"戴红帽子的是小猫"）；错=卡晃动零惩罚可重点+关键线索卡高亮一下。
   救援 14s（§0.21）：问句重读+正确动物卡 breathe+关键线索卡 pulse 三连。
   §0.7a 口径：点动物卡=主交互（点对重置救援钟/错点不重置）；重听题面/重听线索=主动学习
   动作重置；点座位/兔子/空白=探索不重置。
   §0.26 晃动窗防重入 + 身份守卫（const run=cur，await 后 cur!==run 丢弃旧续体）。
   验收钩子：window.LW = { get currentLevel, get quiz, tapAnimal(i), start(flat),
   async autoSolve(), get tutorial, get rescues }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；救援/开场/读题/教学不受 flat 门（§0.5） */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播 / flat≥3 10s 节流+豁免恰一次（§0.5，b15 审查 M2 对齐家族） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 线索句/确认句=queue 拼接（§0.23）：段 clip 全在场走 queue；缺任一段整句 TTS 兜底 */
function sayParts(segs, fullText) {
  if (KIDS.voice.clips && segs.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(segs);
  else KIDS.voice.say(fullText);
}
/* 答对确认句=把推理结论说成完整正陈述（教"线索句"的完整表达） */
function confirmSegs(q) {
  if (q.ask.kind === 'hat')
    return ['lgw_c_a', HATS[q.ask.value].key, 'lgw_c_b', ANIMALS[q.animals[q.answer]].key];
  return ['lgw_c_h', ITEMS[q.ask.value].key, 'lgw_c_i', ANIMALS[q.animals[q.answer]].key];
}
const confirmText = q => q.ask.kind === 'hat'
  ? '戴' + HATS[q.ask.value].cn + '帽子的是' + ANIMALS[q.animals[q.answer]].name
  : '拿' + ITEMS[q.ask.value].cn + '的是' + ANIMALS[q.animals[q.answer]].name;

const stageEl = $id('stage'), tipEl = $id('tip'), tipIcoEl = $id('tip-ico'), tipTextEl = $id('tip-text'),
      benchEl = $id('bench'), cluesEl = $id('clues'), cardsEl = $id('cards'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重听题面 3s 节流
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardsEl.querySelector('.card[data-i="' + i + '"]');
const clueEl = i => cluesEl.querySelector('.clue[data-i="' + i + '"]');
const seatEls = () => Array.from(benchEl.children);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
/* 线索卡徽记：正=色点（帽色）/负=✗/相对=←/绝对=◀▶/物品正=物品小图（§2 可读辅助） */
function clueBadge(c) {
  if (c.t === 'pos') return '<span class="cb pos" style="background:' + HATS[c.hat].fill + '"></span>';
  if (c.t === 'neg') return '<span class="cb neg">✗</span>';
  if (c.t === 'rel') return '<span class="cb">←</span>';
  if (c.t === 'abs') return '<span class="cb">' + (c.edge === 'L' ? '◀' : '▶') + '</span>';
  return '<span class="cb">' + itemSvg(c.item, 22) + '</span>';
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearBreathe();
  tipIcoEl.innerHTML = q.ask.kind === 'hat' ? hatSvg(q.ask.value, 36) : itemSvg(q.ask.value, 36);
  tipTextEl.textContent = q.askText;
  benchEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('button');
    s.className = 'seat';
    s.dataset.i = i;
    s.setAttribute('aria-label', '座位' + (i + 1));
    s.innerHTML = '<span class="s-hat">' + hatSvg(q.hats[i]) + '</span>' +
      '<span class="s-body">' + mysterySvg() + '</span>' +
      (q.items ? '<span class="s-item">' + itemSvg(q.items[i]) + '</span>' : '');
    benchEl.appendChild(s);
  }
  cluesEl.innerHTML = '';
  q.clues.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'clue';
    b.dataset.i = i;
    b.setAttribute('aria-label', '线索' + (i + 1));
    b.innerHTML = clueBadge(c) + '<span class="ct">' + c.text + '</span>';
    cluesEl.appendChild(b);
  });
  cardsEl.innerHTML = '';
  q.choices.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.i = i;
    b.setAttribute('aria-label', ANIMALS[a].name);
    b.innerHTML = animalSvg(a) + '<span class="nm">' + ANIMALS[a].name + '</span>';
    cardsEl.appendChild(b);
  });
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) KIDS.voice.play(q.askKey, q.askText);   /* 换题读问句 */
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

/* ================= 视觉反馈小件 ================= */
function clearBreathe() {
  cardsEl.querySelectorAll('.breathe').forEach(e => e.classList.remove('breathe'));
  cluesEl.querySelectorAll('.breathe').forEach(e => e.classList.remove('breathe'));
}
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
const wigCard = i => replayAnim(cardEl(i), 'wig');
const hopCard = i => replayAnim(cardEl(i), 'hop');
const nudgeCard = i => replayAnim(cardEl(i), 'nudge');
const flashClue = i => replayAnim(clueEl(i), 'flash');
const dimCard = (i, on) => { const el = cardEl(i); if (el) el.classList.toggle('dim', !!on); };
function pulseKeyClue(q) {                      /* 关键线索卡高亮一下（错点回看提示，§2） */
  replayAnim(clueEl(q.kc), 'flash');
}
function pulseAnswer(q) {                       /* miss≥2 才高亮正确卡（§0.7 首错不 pulse） */
  const idx = q.choices.indexOf(q.animals[q.answer]);
  replayAnim(cardEl(idx), 'pulse');
}
function revealSeat(q) {                        /* 点对：座位揭幕（?身体→动物）+徽章绿光 */
  const s = seatEls()[q.answer];
  if (!s) return;
  s.classList.remove('lit', 'reveal'); void s.offsetWidth;
  s.classList.add('lit', 'reveal');
  const body = s.querySelector('.s-body');
  if (body) body.innerHTML = animalSvg(q.animals[q.answer]);
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
  clearBreathe();                               /* 指新目标前清全部旧 breathe（家族 P1-3 教训） */
  ghost.toEl(el);
  ghost.show();
  replayAnim(el, 'pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"指向：关键线索卡 breathe——教孩子"回看哪条线索"（本款的认知脚手架） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const el = clueEl(q.kc);
  if (el) el.classList.add('breathe');
  pointGhostAt(el);
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 点选动物卡主路径（真实点击 / LW 钩子 / autoSolve / 教学演示共用）
   demo=true 仅教学"看"演示通道（豁免 locked 门，batch5 M1 教训） ================= */
async function uiTapAnimal(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); nudgeCard(i); }    /* 吞输入+轻叮+卡圈轻闪（§0.22 主答案同规） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                              /* 身份守卫：演出窗内重玩会重建 cur */
  const r = engTapAnimal(cur, i);
  if (r === false) return false;
  if (r === 'wrong') {                          /* 错点：晃动零惩罚可重点+关键线索卡高亮一下 */
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss === 2);   /* miss 首达 2 豁免恰一次（§0.5） */
    wigCard(i);
    pulseKeyClue(q);
    if (q._miss >= 2) pulseAnswer(q);           /* 首错不 pulse 正确项（§0.7） */
    state.locked = true;                        /* 晃动窗防重入（§0.26：连点只记一次 miss） */
    await wait(560 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') scheduleHelpGhost(300);
    return r;                                   /* 错点不重置救援钟（§0.7a） */
  }
  /* ---- 点对：座位揭幕+动物跳一下+结论正陈述 → 推进（点对重置救援钟 §0.7a） ---- */
  lastAct = Date.now();
  if (state.tut === 'help') {                   /* 教学"独"：首次答对放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  clearBreathe();
  revealSeat(q);
  hopCard(i);
  sfx('coin');
  sayParts(confirmSegs(q), confirmText(q));
  state.locked = true;
  await wait(2400 * SPEED);                     /* 确认句 4 段拼接 ≈2.4s，播完再进下一题 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz();
  return r;
}

/* ================= 重听通道（题面/线索）：主动学习动作，重置救援钟（§0.7a 例外） ================= */
function replayAsk(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  lastAct = Date.now();
  replayAnim(tipEl, 'flash');
  KIDS.voice.play(q.askKey, q.askText);
  return true;
}
function clueTap(i) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || i < 0 || i >= q.clues.length) return false;
  if (state.locked || state.demo || state.won) { sfx('pop'); flashClue(i); return false; }
  lastAct = Date.now();
  flashClue(i);
  sayParts(q.clues[i].segs, q.clues[i].text);
  return true;
}
function seatTap(i) {                           /* 点座位=探索（不重置救援钟） */
  const s = seatEls()[i];
  if (!s) return false;
  sfx('pop');
  replayAnim(s, 'nudge');
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
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
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 问句 clip，queue 单通道顺序播 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key, q.askKey]);
}
function startLevel(flat) {
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.logicwho && sv.logicwho.tutSeen);
  if (VERIFY) { openingSpeak(); return; }       // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.logicwho.tutSeen）
   看=线索卡逐条亮+逐条读 → 错误动物划暗（排除可视化）→ 幽灵手指点正确卡（demo 通道真实
   点选，返回值存 window.__lwDemoR §0.27）→ 重发同关 → 帮=幽灵手指指关键线索卡；独=放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(1000 * SPEED);
  const q = cur.quizzes[0];
  for (let k = 0; k < q.clues.length; k++) {    // 线索卡逐条亮+逐条读（读线索→排除）
    flashClue(k);
    sayParts(q.clues[k].segs, q.clues[k].text);
    await wait(2400 * SPEED);
  }
  q.choices.forEach((a, i) => {                 // 排除：错误动物划暗
    if (a !== q.animals[q.answer]) dimCard(i, true);
  });
  await wait(900 * SPEED);
  const idx = q.choices.indexOf(q.animals[q.answer]);
  pointGhostAt(cardEl(idx));
  await wait(880 * SPEED);
  ghost.press();
  await wait(300 * SPEED);
  const demoR = await uiTapAnimal(idx, true);   // demo 通道豁免 locked 门（演示吞输入）
  window.__lwDemoR = demoR;                     /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                      // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.logicwho = sv.logicwho || {};
    sv.logicwho.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                            // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                           // 交接顺序链：turn clip → 问句（§0.6 单通道）
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 pop+hop 不静默 */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {  // 再听一遍：重播问句（主动学习重置救援钟）
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.22 吞输入轻叮 */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  replayAsk(false);
});
tipEl.addEventListener('pointerdown', e => {    // 点题面=重听问句（主动学习重置）
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 吞输入期轻叮 */
  replayAsk(false);
});
cluesEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.clue');
  if (!el) return;
  e.preventDefault();
  clueTap(Number(el.dataset.i));
});
benchEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.seat');
  if (!el) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  seatTap(Number(el.dataset.i));
});
cardsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.card');
  if (!el) return;
  e.preventDefault();
  uiTapAnimal(Number(el.dataset.i));
});
stageEl.addEventListener('pointerdown', e => {  /* 点舞台空白（非按钮）：10s 节流轻提示（§0.16） */
  if (e.target.closest('button')) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }  /* 吞输入期轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.21：问句重读+正确动物卡 breathe+关键线索卡
   pulse 三连）/ 教学"帮"5s 重演示一次。救援钟只被点对/重听题面/重听线索重置
   （§0.7a：错点/座位/空白/兔子不重置） ================= */
function rescueAct(q) {
  rescueCount++;
  sayR(q.askKey, q.askText);                    /* 问句重读 */
  clearBreathe();
  const idx = q.choices.indexOf(q.animals[q.answer]);
  const cEl = cardEl(idx);
  if (cEl) cEl.classList.add('breathe');        /* 正确动物卡 breathe */
  const kEl = clueEl(q.kc);
  if (kEl) replayAnim(kEl, 'pulse3');           /* 关键线索卡 pulse 三连 */
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                   /* 过题过渡窗不救援 */
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
  KIDS.init({ game: 'logicwho', title: '逻辑三人组' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐，b15 审查 M3） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.LW = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, misses: cur.misses, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                  /* SPEC §2 契约字段 + 测试辅助字段（全拷贝） */
      animals: q.animals.slice(), hats: q.hats.slice(),
      items: q.items ? q.items.slice() : null,
      clues: q.clues.map(c => ({ t: c.t, hat: c.hat, item: c.item, X: c.X, Y: c.Y, W: c.W,
        edge: c.edge, keyClue: !!c.keyClue, text: c.text, segs: c.segs.slice() })),
      ask: { kind: q.ask.kind, value: q.ask.value }, askKey: q.askKey, askText: q.askText,
      answer: q.answer, answerAnimal: q.animals[q.answer], kc: q.kc,
      choices: q.choices.slice(), step: cur.step, miss: q._miss, solved: q.solved
    };
  },
  tapAnimal(i) { return uiTapAnimal(i); },
  start(flat) {                                /* 测试钩子：跳关（教学看演期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                          /* UI 路径自动通关：逐题点正确动物卡 */
    const run = cur;                           // 身份守卫：winFlow 延迟 proceed 换关即中止
    let taps = 0, guard = 0;
    while (cur && cur === run && !cur.done && guard++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const idx = q.choices.indexOf(q.animals[q.answer]);
      const r = await uiTapAnimal(idx);
      taps++;
      if (r === false) break;
    }
    return { done: !!(cur && cur.done && cur === run), taps: taps };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
