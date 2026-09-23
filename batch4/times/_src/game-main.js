/* ================= times 主逻辑（UI / 池塘 / 分组图辅助 / 连加→乘法转化 / 教学）
   池塘数字鱼 = 4 选 1 答案；分组图辅助低章（dch1-2）答错自动亮起（aidAuto 消耗标记：首次点按钮不关闭）
   验收钩子：window.TIM = { get currentLevel, get quiz(), pick(i), groupAid(), autoSolve(), get tutorial } */
const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内动画提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；题面读音走 voice.queue 拼接（缺任一 clip 整句 TTS 兜底） */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援语音不受 flat 门限制（7 岁半玩家评估 P1：flat≥3 静置 20s 零救援——常规提示保持 sayP 防语音过频回潮） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
function sayQ(parts, fullText) {
  if (KIDS.voice.clips && parts.every(p => KIDS.voice.clips[p.key])) {
    KIDS.voice.queue(parts.map(p => p.key));
  } else {
    KIDS.voice.say(fullText);
  }
}
const sayQuiz = q => { if (cur && cur.flat < 3) sayQ(quizParts(q), quizFullText(q)); };
const sayConv = q => { if (cur && cur.flat < 3) sayQ(convertParts(q), convertFullText(q)); };

const fishGridEl = $id('fish-grid'), aidEl = $id('aid'), convertEl = $id('convert'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      groupsBtn = $id('btn-groups');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', tutStep: 0 };
let lastAct = Date.now();
let helpTimer = null, helpRedemo = false;
let ghostReason = null;
let aidAuto = false;         // 辅助是否因答错自动亮起（首次按钮点击不关闭，教玩观察 P2 修后模式）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const fishEl = i => fishGridEl.querySelector('.fish-btn[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  groupsBtn.innerHTML = ICONS.groups + '<span>看一看</span>';
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
function renderStep() {                          // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < 5; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                          // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const ch = cur.ch, sv = KIDS._save() || { levels: {} }; // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  $id('quiz-text').innerHTML = q.pre + '<span id="qm">?</span>' + q.post;
  fishGridEl.innerHTML = '';
  q.items.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'fish-btn' + (i % 2 ? ' alt' : '');   // 隔条鱼朝向翻转，更似游动
    b.dataset.i = i;
    b.setAttribute('aria-label', '选 ' + v);
    b.innerHTML = '<span class="bubble">' + v + '</span><span class="bob">' + fishSvg(i, 150) + '</span>';
    fishGridEl.appendChild(b);
  });
  closeAid();
  convertEl.classList.remove('show');
  renderStep();
  sayQuiz(q);
}

/* ================= 鱼群分组图辅助（看一看；仅低章 dch1-2）
   b 组每组 a 条（miss 型=数有几组→答案），同数连加一行行排，不标总数不代答
   面板内嵌一行答案气泡（覆盖池塘后鱼点不到，答案必须可达）：克隆数字/灰掉态，点气泡即作答 ---------- */
function aidAnswersHtml(q) {
  let s = '<div class="aid-ans-row">';
  q.items.forEach((v, i) => {
    s += '<button class="aid-ans' + ((q.wrong || []).indexOf(i) >= 0 ? ' wrong' : '') +
      '" data-i="' + i + '" aria-label="选 ' + v + '">' + v + '</button>';
  });
  return s + '</div>';
}
function groupAidHtml(q) {
  let rows = '';
  for (let g = 0; g < q.b; g++) {
    if (g && q.type === 'sum') rows += '<span class="a-plus">+</span>';
    let fish = '';
    for (let k = 0; k < q.a; k++) fish += aidFish();
    rows += '<span class="a-group">' + fish + '</span>';
  }
  const title = q.type === 'sum' ? '数一数' : (q.type === 'miss' ? '数一数有几组' : '每组的鱼一样多');
  const cap = q.type === 'miss' ? '<div class="aid-cap">每组 ' + q.a + ' 条，一共有几组？</div>' : '';
  return '<div class="aid-title">' + title + '</div><div class="a-row">' + rows + '</div>' + cap +
    aidAnswersHtml(q);
}
function aidAvailable() { return cur && cur.dch <= AID_MAX_DCH; }
function openAid() {
  if (!cur || cur.done || !aidAvailable()) return;
  aidEl.className = 'open';
  aidEl.innerHTML = groupAidHtml(cur.quizzes[cur.step]);
}
function closeAid() { aidEl.className = ''; aidEl.innerHTML = ''; aidAuto = false; }
function aidState() {
  const open = aidEl.classList.contains('open');
  return { open: open };
}
function groupAidToggle(force) {                 // 钩子与按钮共用：无参=切换
  const open = aidEl.classList.contains('open');
  if (force == null && open && aidAuto) {        // 答错自动亮起的辅助：首次按钮点击不关闭（孩子会把救援自己按没）
    aidAuto = false;
    return aidState();
  }
  const want = force == null ? !open : !!force;
  if (want !== open) { if (want) openAid(); else closeAid(); }
  return aidState();
}
/* 分组逐组点亮（仅教学演示"看"用） */
async function groupDemo() {
  const gs = aidEl.querySelectorAll('.a-group');
  for (let k = 0; k < gs.length; k++) {
    gs[k].classList.add('lit');
    sfx('pop');
    await wait(430 * SPEED);
  }
  await wait(320 * SPEED);
}

/* ================= 连加→乘法 转化动画（章 1 连加题答对后） ================= */
async function convertAnim(q) {
  const sumStr = Array(q.b).fill(q.a).join(' + ');
  convertEl.innerHTML = '<span class="cv-sum">' + sumStr + ' = ' + q.answer + '</span>' +
    '<span class="cv-arrow">→</span><span class="cv-mul">' + q.a + ' × ' + q.b + '</span>';
  convertEl.dataset.last = sumStr + '=' + q.answer + '|' + q.a + '×' + q.b;
  convertEl.classList.add('show');
  sfx('coin');
  sayConv(q);
  await wait(1650 * SPEED);
  convertEl.classList.remove('show');
}

/* ================= 幽灵手指（教学"帮"指向看一看按钮） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function scheduleHelpGhost(delay) {              // "帮"：高亮看一看按钮（SPEC §2）
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    ghost.toEl(groupsBtn);
    ghost.show('tut');
    groupsBtn.classList.remove('pulse'); void groupsBtn.offsetWidth; groupsBtn.classList.add('pulse');
  }, delay == null ? 600 : delay);
}

/* ================= 答题主路径（真实点击 / TIM.pick / autoSolve 共用） ================= */
async function uiPick(i, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  const r = engPick(cur, i);
  if (r === 'again' || r === null) return false;
  lastAct = Date.now();
  const el = fishEl(i);
  if (!el) return false;   /* 反方审查 m2：越界下标防护（真实点击不可达，钩子健壮性，对齐 clock） */
  if (r === 'right' || r === 'done') {
    if (state.tut === 'help') {                  // 教学"独"：首次答对 → 强化反馈，放手独立完成
      state.tut = 'solo';
      ghost.hide();
      rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
    }
    state.locked = true;
    el.classList.add('right');
    const qm = $id('qm');
    if (qm) { qm.textContent = q.answer; qm.classList.add('ok'); }
    sfx('ok');
    closeAid();
    renderStep();
    await wait(780 * SPEED);
    if (q.type === 'sum') await convertAnim(q);  // 连加题：弹出"也可以说 a×b"
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                       // 答错：晃动+灰掉（可点其它鱼）；首错只亮支架不代答，连错 2 次才高亮正确鱼
    q._miss = (q._miss || 0) + 1;
    el.classList.add('shake', 'wrong');
    const ok = fishEl(q.answerIdx);
    if (ok && q._miss >= 2) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    sfx('fail');
    if (aidAvailable()) {
      openAid(); aidAuto = true;                 // 分组图让孩子自己数（首错不 pulse 答案气泡）
      if (q._miss >= 2) {
        const ab = aidEl.querySelector('.aid-ans[data-i="' + q.answerIdx + '"]');
        if (ab) { ab.classList.remove('pulse'); void ab.offsetWidth; ab.classList.add('pulse'); }
      }
    }
    if (q.type === 'miss') sayR('tim_miss_hint', VOICE.miss.text);   // 缺因数题零教学：专用救援语音（不受 flat 门）
    else sayP('tim_hint', VOICE.hint.text);
    if (state.tut === 'help') scheduleHelpGhost(900);
    await wait(430 * SPEED);
  }
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 反方审查 M1：GEN 文案指"明天"的难度章=下一章，原 ci%4 指向刚打完的章（实证 ch5 完显 ×2×3，明天实为 ×4×5） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true; state.locked = true;
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
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint() });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint() });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                             // 进入今日解锁范围内第一个未通关的关
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur.flat);
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', tutStep: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  groupsBtn.style.display = aidAvailable() ? '' : 'none';   // 高章无分组图辅助（SPEC：低章限定）
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const fresh = flat === 0 && !sv.levels['1-0'] && !(sv.times && sv.times.tutSeen);
  if (fresh) { tutorialWatch(); return; }
  sayP('tim_hint', VOICE.hint.text);
}

/* ================= 教学：看-帮-独（仅关 1-0 首次；save.times.tutSeen 记住演示已放过）
   看=分组图逐组点亮 + 幽灵手点中正确数字鱼（含连加→乘法转化动画）→ 重发同一关
   帮=高亮"看一看"按钮 → 独=孩子首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP('tim_tut_watch', VOICE.watch.text);
  await wait(650 * SPEED);
  const q = cur.quizzes[0];                      // dch1 首题必为连加形态
  openAid();
  await wait(520 * SPEED);
  await groupDemo();
  await wait(300 * SPEED);
  /* 分组图开着（覆盖池塘）→ 幽灵手指指面板内答案气泡；否则指数字鱼 */
  const aidBtn = aidEl.querySelector('.aid-ans[data-i="' + q.answerIdx + '"]');
  const el = aidBtn || fishEl(q.answerIdx);
  ghost.toEl(el); ghost.show('tut');
  el.classList.add('pulse');
  await wait(850 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  el.classList.remove('pulse');
  state.demo = false; state.locked = false;
  await uiPick(q.answerIdx, true);               // 含转化动画
  await wait(350 * SPEED);
  const sv = KIDS._save();
  sv.times = sv.times || {};
  sv.times.tutSeen = true;
  KIDS.store.persist();
  sayP('tim_tut_turn', VOICE.turn.text);
  await wait(500 * SPEED);
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', tutStep: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  groupsBtn.style.display = aidAvailable() ? '' : 'none';
  renderQuiz(); renderDots();
  scheduleHelpGhost(700);
}

/* ================= 底栏交互 ================= */
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
  sayP('tim_hint', VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
groupsBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || cur.done) return;
  lastAct = Date.now();
  sfx('click');
  groupAidToggle();
  if (state.tut === 'help') ghost.hide();        // 孩子已发现工具，收起手指
});
fishGridEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.fish-btn');
  if (!el) return;
  e.preventDefault();
  uiPick(Number(el.dataset.i));
});
aidEl.addEventListener('pointerdown', e => {     // 辅助面板内的答案气泡（面板覆盖池塘时的作答路径）
  const el = e.target.closest('.aid-ans');
  if (!el) return;
  e.preventDefault();
  uiPick(Number(el.dataset.i));
});

/* ================= 无操作看护：20s 轻声提示目标 / 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayR('tim_hint', VOICE.hint.text);           // 救援语音不受 flat 门（评估 P1）
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    scheduleHelpGhost(0);
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'times', title: '乘法捕鱼' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });   /* 明日首解锁关=今日上限（M1：原硬编码 0 恒指章 1） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，全部返回拷贝） ================= */
window.TIM = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, step: cur.step,
      retries: cur.retries, done: cur.done, won: state.won, locked: state.locked } : null;
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    return { type: q.type, a: q.a, b: q.b, c: q.c, text: q.text,
      answer: q.answer, items: q.items.slice(), answerIdx: q.answerIdx,
      step: cur.step, wrong: (q.wrong || []).slice() };
  },
  pick(i) { return uiPick(i); },
  groupAid() { return groupAidToggle(); },
  async autoSolve() {                            // UI 路径自动答完当前关（走真实 pick 流程）
    let n = 0;
    while (cur && !cur.done && n++ < 30) {
      const q = cur.quizzes[cur.step];
      await uiPick(q.answerIdx);
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; }
};
