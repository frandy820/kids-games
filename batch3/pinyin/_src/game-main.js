/* ================= pinyin 主逻辑 =================
   玩法：每关 3-5 小题，一题 = 目标（大字母 / 车头声母+货物 / 整体认读货物）+ 3-4 节候选车厢
   答对 = 车厢挂上小火车（点亮+coin+拼合展示）；答错 = 晃动+高亮正确项 1.2s 后可重点（零惩罚）
   星级：全对 3 星 / 总重试 ≤2 = 2 星 / 否则 1 星；5 关 = 1 章
   语音仅前 3 关（sayP）；验收钩子 window.PYI；verify=1 stub 发声 API 引擎直驱 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };

const stageEl = $id('stage'), targetCard = $id('target-card'), trackEl = $id('track'),
      trainTray = $id('train-tray'), ghostEl = $id('ghost'),
      hearBtn = $id('btn-hear'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');

let cur = null;
let state = { locked: false, won: false, demo: false, tut: 'none' };
let actPromise = null;          // 当前题演出 Promise（correct 900ms / wrong 1200ms）
let lastAct = Date.now();
let ghostReason = null;         // 'tut' | 'scaffold'
let tutRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  hearBtn.innerHTML = ICONS.hear;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 78);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 尺寸（双 viewport 均保 car ≥96、间距 16） ================= */
function layoutStage() {
  if (!cur) return;
  const st = stageEl.getBoundingClientRect();
  const n = Math.max(3, (cur.questions[cur.idx] || cur.questions[cur.questions.length - 1] || { items: [] }).items.length);
  const gap = 16;
  const w = Math.floor((st.width - 24 - (n - 1) * gap) / n);
  const carCap = window.matchMedia('(orientation:portrait)').matches ? 160 : 140; // 竖屏宽度充裕，车厢放大（视觉评估 P1）
  const car = Math.max(96, Math.min(w, carCap));
  const root = document.documentElement.style;
  root.setProperty('--car', car + 'px');
  root.setProperty('--gap', gap + 'px');
  const tgt = Math.max(110, Math.min(Math.floor((st.height - 30) * 0.44), 170));
  root.setProperty('--tgt', tgt + 'px');
}
window.addEventListener('resize', () => { if (cur) layoutStage(); });

/* ================= 渲染 ================= */
function targetHTML(q) {
  if (q.type === 'pin') {  // 车头声母 + 货物（图/字）
    return '<div class="loco-side">' + ICONS.loco + '<span class="glyph">' + q.sm + '</span></div>' +
      '<span class="plus">+</span>' +
      '<div class="cargo">' + (q.pic && PIC[q.pic] ? PIC[q.pic] : '') + '<span class="zi">' + q.rep + '</span></div>';
  }
  if (q.type === 'ztr') {  // 整体认读：货物（图/字），音节藏在候选里
    return '<div class="cargo">' + (q.pic && PIC[q.pic] ? PIC[q.pic] : '') + '<span class="zi">' + q.rep + '</span></div>';
  }
  return '<span class="glyph">' + (q.sm || q.ym) + '</span>' +
    '<div class="tag">' + (q.rep || '') + '</div>';
}
function carHTML(item) {
  const long = item.length >= 4 ? ' long' : '';
  return '<div class="roof"></div><span class="glyph' + long + '">' + item + '</span>' +
    '<div class="wheels"><i></i><i></i></div>';
}
function carEl(i) { return trackEl.querySelector('.car[data-i="' + i + '"]'); }

function renderQuestion() {
  const q = cur.questions[cur.idx];
  if (!q) return;
  targetCard.className = q.type === 'pin' ? 'pin' : '';
  targetCard.innerHTML = targetHTML(q);
  trackEl.innerHTML = '';
  q.items.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'car';
    b.dataset.i = i;
    b.setAttribute('aria-label', '第' + (i + 1) + '节车厢');
    b.innerHTML = carHTML(it);
    trackEl.appendChild(b);
  });
  renderTrain();
  layoutStage();
  if (!VERIFY && !state.demo) hearTarget();   // 前 3 关每题自动示范读音
}
function renderTrain() {  // 顶栏小火车：车头 + 每题一节车厢，答对点亮（图优先，否则答案字母）
  const inner = trainTray.querySelector('.inner');
  inner.className = 'inner';
  inner.innerHTML = '<div class="loco">' + ICONS.loco + '</div>';
  cur.questions.forEach((q, k) => {
    const d = document.createElement('div');
    d.className = 'mini-car' + (k < cur.idx ? ' on' : '');
    const glyph = q.type === 'pin' ? q.ym : q.items[q.answer];
    d.innerHTML = (k < cur.idx && q.pic && PIC[q.pic]) ? PIC[q.pic]
      : '<span style="font-size:' + (glyph.length >= 4 ? 11 : 15) + 'px;font-weight:700">' + glyph + '</span>';
    inner.appendChild(d);
  });
}
function renderDots() {  // 章节点（ch 1 基）
  if (VERIFY) return;
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const ch = cur.ch, sv = KIDS._save();
  for (let c = 1; c <= ch; c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 幽灵手指（教学帮 / 演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhost(i, reason) {
  if (VERIFY) return;
  const el = carEl(i);
  if (!el) return;
  ghost.toEl(el); ghost.show(reason);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}

/* ================= 目标示范音（clip 优先，绝不 TTS 读字母串） ================= */
function hearTarget() {
  if (!cur) return;
  const q = cur.questions[cur.idx];
  if (!q) return;
  sayP('py_syl_' + q.syl, q.rep || (SYL_MAP[q.syl] || {}).r || '');
}

/* ================= 答题主路径（真实点击 / PYI.pick / autoSolve 共用） ================= */
function tapItem(i) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.questions[cur.idx];
  if (!q || i < 0 || i >= q.items.length) return false;
  lastAct = Date.now();
  if (ghostReason === 'scaffold') ghost.hide();
  state.locked = true;
  if (i === q.answer) actPromise = playCorrect(q, i);
  else actPromise = playWrong(q, i);
  return actPromise;
}
function playCorrect(q, i) {  // 答对：车厢挂上 + 点亮 + 拼合展示 + （前3关）整音节读音
  const el = carEl(i);
  if (el) {
    el.classList.add('correct');
    const mark = document.createElement('span');
    mark.className = 'mark';
    mark.innerHTML = ICONS.check;
    el.appendChild(mark);
  }
  engPick(cur, i);
  sfx('coin');
  trainTray.classList.remove('nudge'); void trainTray.offsetWidth; trainTray.classList.add('nudge');
  if (q.type === 'pin') {  // 拼合展示：车头 b + a → ba
    const sp = document.createElement('span');
    sp.className = 'plus';
    sp.textContent = '=';
    targetCard.appendChild(sp);
    const r = document.createElement('div');
    r.className = 'cargo';
    r.innerHTML = (q.pic && PIC[q.pic] ? PIC[q.pic] : '') + '<span class="result">' + q.syl + '</span>';
    targetCard.appendChild(r);
  }
  if (state.tut === 'help') {   // 教学"独"：首次答对 → 强化反馈放手
    state.tut = 'solo';
    ghost.hide();
    sfx('ok');
    hopRabbit();
  }
  renderTrain();
  sayP('py_syl_' + q.syl, q.rep || '');
  return new Promise(res => setTimeout(() => {
    state.locked = false;
    actPromise = null;
    if (engWon(cur)) winFlow();
    else { renderQuestion(); renderDots(); }
    res(true);
  }, 900));
}
function playWrong(q, i) {  // 答错：晃动 + 错项持久灰（本题内不可重点）+ 高亮正确项 1.2s；连错 2 次幽灵手指常驻指认（教玩观察 P1：此前连错后 10 秒零救援空窗）
  const el = carEl(i), ok = carEl(q.answer);
  if (el) { el.classList.remove('wrong'); void el.offsetWidth; el.classList.add('wrong'); }
  if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
  sfx('fail');
  engPick(cur, i);
  sayP('pyi_hint', '找一找一样的拼音');
  q._miss = (q._miss || 0) + 1;
  if (q._miss >= 2 && ok && !VERIFY) {   // 手指常驻至下一次点选（tapItem 对 scaffold 自动收指）
    ghost.toEl(ok); ghost.show('scaffold');
    setTimeout(() => ghost.press(), 400);
  }
  return new Promise(res => setTimeout(() => {
    if (ok) ok.classList.remove('pulse');
    state.locked = false;
    actPromise = null;
    res(false);
  }, 1200));
}

/* ================= 教学：看-帮-独（仅 1-0 首次；save.py.tutSeen 记住演示已放过） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP('pyi_tut_watch', '看！找到正确的车厢');
  await wait(700);
  const q = cur.questions[0];
  pointGhost(q.answer, 'tut');
  await wait(1300);
  state.demo = false;           // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  await tapItem(q.answer);
  const sv = KIDS._save();
  sv.py = sv.py || {};
  sv.py.tutSeen = true;
  KIDS.store.persist();
  sayP('pyi_tut_turn', '你来点一点');
  await wait(500);
  ghost.hide();
  /* 重发同一关（确定性布局一致），进入"帮"：高亮第一题正确项 */
  const flat = cur.flat;
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  tutRedemo = false;
  lastAct = Date.now();
  renderQuestion(); renderDots();
  setTimeout(() => { if (state.tut === 'help') pointGhost(cur.questions[0].answer, 'tut'); }, 600);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
const HINTS = { 1: '明天认一认韵母哦', 2: '明天拼一拼音节哦', 3: '明天有复韵母和整体认读哦' };
const GEN_HINTS = ['更多拼音火车挑战哦', '更长的拼音小火车哦', '超棒的整体认读挑战哦'];
function nextHint(ci) {
  if (ci == null) ci = Math.floor(KIDS.calendar.limit(Infinity) / CH_LEN);
  if (ci >= 4) return '明天有' + GEN_HINTS[(ci - 4) % GEN_HINTS.length];
  return HINTS[ci] || '有新的关卡哦';
}
function winFlow() {
  state.won = true; state.locked = true;
  ghost.hide();
  const stars = engStars(cur.retries);
  sfx('win');
  trainTray.classList.add('depart');   // 小火车开走
  KIDS.ui.celebrate(stars).then(() => {
    if (VERIFY) return;
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.ch) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {  // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);   // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  state = { locked: false, won: false, demo: false, tut: 'none' };
  actPromise = null;
  tutRedemo = false;
  trainTray.classList.remove('depart');
  cur = makeLevel(flat);
  lastAct = Date.now();
  renderQuestion(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const fresh = flat === 0 && !sv.levels['1-0'] && !(sv.py && sv.py.tutSeen);
  if (fresh) { tutorialWatch(); return; }
  sayP('pyi_hint', '找一找一样的拼音');
}

/* ================= 底栏与目标区交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  hearTarget();
});
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  sayP('pyi_hint', '找一找一样的拼音');
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
trackEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.car');
  if (!el) return;
  e.preventDefault();
  tapItem(Number(el.dataset.i));
});

/* ================= 无操作看护：20s 轻声提示 / 教学帮 5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayP('pyi_hint', '找一找一样的拼音');
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !tutRedemo && ghostReason !== 'tut') {
    tutRedemo = true;
    pointGhost(cur.questions[cur.idx] ? cur.questions[cur.idx].answer : 0, 'tut');
  }
}, 1000);

/* ================= ?verify=1 自检 =================
   ① 音节库合法性 3 单元：两拼 124 拆分合法无重复 / ZTR=16 且与表一致 / SM_READ·YM_READ 引用全在库
   ② 静态 20 关 + 生成 5 关结构：确定性 / 题数 3-5 / 每题 answer 唯一、型别匹配章
   ③ autoSolve 引擎直驱全部通关（0 重试 3 星）
   ④ 布局抽查：4 选项关实建 DOM 量车厢 ≥96、重听 ≥80、overflowX=0 */
function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, auto = {};
  let npass = 0, total = 0;

  /* ①-1 两拼音节库 */
  total++;
  const seen = {}, bad = [];
  let sylOk = true;
  SYL.forEach(e => {
    if (seen[e.s]) { sylOk = false; bad.push('dup:' + e.s); }
    seen[e.s] = 1;
    const sp = sylSplit(e.s);
    if (!sp || sp.whole || !SM_SET[sp.sm] || !YM_SET[sp.ym] || sylJoin(sp.sm, sp.ym) !== e.s) {
      sylOk = false; bad.push('split:' + e.s);
    }
  });
  units.twoPin = { count: SYL.length, ok: sylOk, bad: bad.slice(0, 5) };
  if (sylOk && SYL.length >= 120 && SYL.length <= 130) npass++;
  /* ①-2 整体认读 16 */
  total++;
  const ztrOk = ZTR.length === 16 && ZTR_LIB.length === 16 &&
    ZTR.every(z => ZTR_LIB.some(e => e.s === z)) && ZTR_LIB.every(e => ZTR_SET[e.s]);
  units.ztr = { count: ZTR_LIB.length, ok: ztrOk };
  if (ztrOk) npass++;
  /* ①-3 呼读音/本音引用完整性（含 ZERO 14 条入库） */
  total++;
  const allKeys = {};
  SYL.forEach(e => { allKeys[e.s] = 1; });
  ZTR_LIB.forEach(e => { allKeys[e.s] = 1; });
  ZERO.forEach(e => { allKeys[e.s] = 1; });
  let readsOk = true;
  SM.forEach(s => { if (!allKeys[SM_READ[s]]) { readsOk = false; bad.push('smread:' + s); } });
  YM.forEach(m => { const v = YM_READ[m]; if (v && !allKeys[v]) { readsOk = false; bad.push('ymread:' + m); } });
  ZERO.forEach(e => { if (!allKeys[e.s] || !sylSplit(e.s)) { readsOk = false; bad.push('zero:' + e.s); } });
  units.reads = { total: Object.keys(allKeys).length, ok: readsOk, bad: bad.slice(0, 8) };
  if (readsOk) npass++;

  /* ② 关卡结构（静态 20 + 生成 5） */
  const typeOk = (q, ch) => (ch === 1 && q.type === 'sm') || (ch === 2 && q.type === 'ym') ||
    (ch === 3 && q.type === 'pin') || (ch >= 4 && (q.type === 'pin' || q.type === 'ztr'));
  const itemOk = q => {
    const pool = q.type === 'sm' ? SM_SET : q.type === 'ym' || q.type === 'pin' ? YM_SET : ZTR_SET;
    return q.items.every(it => pool[it]) && (q.type !== 'pin' || q.items[q.answer] === q.ym) &&
      (q.type !== 'sm' || q.items[q.answer] === q.sm) && (q.type !== 'ym' || q.items[q.answer] === q.ym) &&
      allKeys[q.syl];
  };
  for (let flat = 0; flat < 25; flat++) {
    total++;
    const L1 = makeLevel(flat), L2 = makeLevel(flat);
    const det = JSON.stringify(L1.questions) === JSON.stringify(L2.questions);
    const nOk = L1.n >= 3 && L1.n <= 5 && L1.questions.length === L1.n;
    const qsOk = L1.questions.every(q => structOk(q) && typeOk(q, L1.ch) && itemOk(q));
    /* ③ autoSolve 同关直驱 */
    const picks = engAutoSolve(L1);
    const solved = engWon(L1) && L1.retries === 0 && L1.solved === L1.n;
    const stars = engStars(L1.retries);
    const ok = det && nOk && qsOk && solved;
    if (ok) npass++;
    const rec = { n: L1.n, ch: L1.ch, types: L1.questions.map(q => q.type), det, nOk, qsOk, solved, stars };
    if (flat < 20) { levels[keyOf(flat)] = rec; auto[keyOf(flat)] = { picks: picks.length, stars, retries: L1.retries }; }
    else { gen[flat] = Object.assign({ key: keyOf(flat) }, rec); auto['g' + flat] = { picks: picks.length, stars, retries: L1.retries }; }
  }

  /* ④ 布局抽查：flat=4（ch1 lv4，4 选项最密）实建 DOM */
  cur = makeLevel(4);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  renderQuestion();
  const c0 = trackEl.querySelector('.car'), h = hearBtn.getBoundingClientRect();
  const r0 = c0.getBoundingClientRect();
  const de = document.documentElement;
  const layout = {
    overflowX: de.scrollWidth - window.innerWidth,
    carW: Math.round(r0.width), carH: Math.round(r0.height),
    hearW: Math.round(h.width), hearH: Math.round(h.height),
    cars: trackEl.querySelectorAll('.car').length
  };
  const layoutOk = layout.overflowX <= 0 && layout.carW >= 96 && layout.carH >= 96 && layout.hearW >= 80 && layout.cars === 4;
  total++;
  if (layoutOk) npass++;

  const out = { game: 'pinyin', total, pass: npass, layoutOk, layout, units, levels, gen, auto };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

/* ================= 启动 ================= */
buildStatic();
if (VERIFY) {
  KIDS.audio.note = function() {};
  KIDS.audio.sfx = function() {};
  KIDS.speak = function() {};
  KIDS.voice.play = function() {};
  KIDS.voice.queue = function() {};
  runVerify();
} else {
  KIDS.init({ game: 'pinyin', title: '拼音小火车' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：先收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(null) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子 ================= */
async function autoSolveExec() {
  while (cur && !state.won) {
    if (engWon(cur)) break;
    const q = cur.questions[cur.idx];
    if (!q) break;
    const p = tapItem(q.answer);
    if (!p) break;
    await p;
  }
}
window.PYI = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.questions[cur.idx];
    return {
      flat: cur.flat,
      ch: cur.ch,                    // 章号 1 基
      lv: cur.lv,
      n: cur.n, idx: cur.idx,        // idx=已完成题数
      solved: cur.solved, retries: cur.retries,
      type: q ? q.type : null
    };
  },
  get quiz() {
    const q = cur && cur.questions[cur.idx];
    if (!q) return null;
    return {
      type: q.type,
      target: q.type === 'sm' ? q.sm : (q.type === 'ym' ? q.ym : q.syl),
      syl: q.syl, rep: q.rep,
      items: q.items.slice(),
      answer: q.answer,
      idx: cur.idx
    };
  },
  pick(i) { return tapItem(i); },
  async autoSolve() { await autoSolveExec(); return true; },
  get tutorial() { return state.tut; }
};
