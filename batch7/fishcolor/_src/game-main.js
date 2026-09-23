/* ================= fishcolor 主逻辑（r7 改造：两步序记忆 / 间色合成 / 鱼群游散）
   池塘撒点渲染 / 游动小鱼 / 钓起计数 / 教学 / 推进：
   - 题面一次播完（单色/两步序/间色配方句），孩子自行记住顺序；分步推进只换卡不重播；
     救援=每题 idle 20s 一次重读（去自动重播兜底）
   - 间色题（ch3+）：卡面=成分迷你鱼+目标间色鱼；按配方序钓两种成分鱼→合成间色（完成播变出句）
   - 鱼群游散（ch2+）：在场 present ms→散去 away ms→重撒点位重出；已钓进度保留，散去期不可点
   - 点非目标色鱼→躲开零惩罚+纠错方向锚（点非目标=fis_wrong / 点了后步色=fis_wrong_seq，不泄答案）
   验收钩子：window.FIS = { get currentLevel, get quiz, tapFish(i), async autoSolve(),
     get tutorial, get school } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 20s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播（原 sayP 行为）；flat≥3 走 10s 节流（6 岁试玩共性 P1） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* T46 阶段2（2026-09-19）：题面拆段 clip 链——全段在册 queue 拼播，缺段整句 TTS 兜底
   （shop-math playChain 先例；段恒在册=防御性死分支） */
const playChain = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.voice.say(fallback);
};

const pondEl = $id('pond'), chipEl = $id('prompt-chip'), rodEl = $id('rod'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点水面空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const fishEl = i => pondEl.querySelector('.animal[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  pondEl.querySelector('.water').innerHTML = pondSvg();
  rodEl.innerHTML = ICONS.rod;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 水声（Web Audio 合成）：钓起=水花双音 / 错点躲开=低柔单音 / 分步推进=轻铃 */
const plop = () => { if (!VERIFY) { KIDS.audio.note(330, 0.12, 0, 0.5); KIDS.audio.note(494, 0.12, 0.06, 0.42); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const chimeStep = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.28, 0, 0.5); KIDS.audio.note(783.99, 0.36, 0.11, 0.5); } };
function rodTug() {
  rodEl.classList.remove('tug'); void rodEl.offsetWidth; rodEl.classList.add('tug');
}

/* ================= 渲染 ================= */
/* 题面色卡：视觉自解释（大色鱼+需钓数圆点，钓起点亮）；两步序=两张卡依次显示（当前大/下一暗） */
function chipCard(q, k, cls) {
  const C = COLORS[q.targets[k]];
  const n = q.need[k], g = q.got[k] || 0;
  let pips = '';
  for (let i = 0; i < n; i++) pips += '<i class="' + (i < g ? 'on' : '') + '"></i>';
  return '<div class="card ' + cls + '" style="--c:' + C.body + '" aria-label="钓' + C.name + '小鱼 ' + n + '条">' +
    '<span class="swatch">' + fishSvg({ c: q.targets[k], f: 0, e: 0 }) + '</span>' +
    '<span class="pips">' + pips + '</span>' +
    '<span class="lbl">' + C.name + '</span>' +
    (cls === 'done' ? '<span class="mark">' + ICONS.check + '</span>' : '') +
    '</div>';
}
/* r7 间色卡：成分迷你鱼×2（各带圆点，当前步亮）+ 目标间色大鱼（配方序=点钓序，视觉自解释） */
function mixCard(q, cls) {
  const M = COLORS[q.mix], act = engActive(q);
  const mini = k => {
    const C = COLORS[q.targets[k]], n = q.need[k], g = q.got[k] || 0;
    let pips = '';
    for (let i = 0; i < n; i++) pips += '<i class="' + (i < g ? 'on' : '') + '"></i>';
    return '<span class="mini ' + (act === k ? 'cur' : (act < 0 ? 'fin' : 'dim')) + '" style="--c:' + C.body + '">' +
      fishSvg({ c: q.targets[k], f: 0, e: 0 }) + '<span class="pips">' + pips + '</span></span>';
  };
  return '<div class="card mix ' + cls + '" style="--c:' + M.body + '" aria-label="钓' +
    COLORS[q.targets[0]].name + '和' + COLORS[q.targets[1]].name + '小鱼，变' + M.name + '">' +
    '<span class="mixrow">' + mini(0) + '<i class="plus" aria-hidden="true">+</i>' + mini(1) + '</span>' +
    '<span class="swatch">' + fishSvg({ c: q.mix, f: 0, e: 0 }) + '</span>' +
    '<span class="lbl">' + M.name + '</span>' +
    (cls === 'done' ? '<span class="mark">' + ICONS.check + '</span>' : '') +
    '</div>';
}
function renderChip(q) {
  const act = engActive(q);
  if (q.kind === 'mix') {                            // 间色：单卡（成分+目标）
    chipEl.innerHTML = mixCard(q, act < 0 ? 'done' : 'cur');
    return;
  }
  let h = chipCard(q, 0, act < 0 || act === 1 ? 'done' : 'cur');
  if (q.targets.length > 1) {
    h += '<span class="then" aria-hidden="true">' + ICONS.arrow + '</span>' +
      chipCard(q, 1, act === 1 ? 'cur' : (act < 0 ? 'done' : 'next'));
  }
  chipEl.innerHTML = h;
}
/* ================= r7 鱼群游散（温和压力非惩罚）：present→away→重撒→present
   散去=内层 .swim 游出+按钮 .away（pointer-events:none 不可点）；重出=placeFish 新 cycle 种子；
   已钓进度保留（q._gone 不清）；教学/演出窗暂停推进；verify 页按 SPEED 压缩时序可断言 */
const school = { on: false, phase: 'present', cycle: 0, timer: 0, waitSaid: false };
const schoolConf = () => SCHOOL[cur ? cur.dch : 1];
function schoolClear() { if (school.timer) { clearTimeout(school.timer); school.timer = 0; } }
function schoolApply() {
  pondEl.querySelectorAll('.animal').forEach(el => el.classList.toggle('away', school.phase === 'away'));
}
function schoolStart() {                             // 每题开始：全新鱼群（present，cycle=0）
  schoolClear();
  const cf = schoolConf();
  school.on = !!cf.on; school.phase = 'present'; school.cycle = 0;
  schoolApply();
  if (cf.on) school.timer = setTimeout(schoolScatter, cf.present * SPEED);
}
function schoolScatter() {                           // present→away：游散（不可钓，无惩罚）
  if (!cur || cur.done || state.won) return;
  if (state.locked || state.demo) { school.timer = setTimeout(schoolScatter, 1200 * SPEED); return; }
  school.phase = 'away';
  schoolApply();
  if (!VERIFY) { KIDS.audio.note(392, 0.14, 0, 0.28); KIDS.audio.note(262, 0.18, 0.1, 0.22); }
  if (!school.waitSaid) {                            // 游散首发提示：每关一次（救援类，不受 flat 门）
    school.waitSaid = true;
    if (!VERIFY && !state.demo) sayR(VOICE.waitAway.key, VOICE.waitAway.text);
  }
  school.timer = setTimeout(schoolBack, schoolConf().away * SPEED);
}
function schoolBack() {                              // away→重撒点位重出（进度保留）
  school.cycle++;
  school.phase = 'present';
  if (cur && cur.quizzes[cur.step] && !cur.done) {
    placeFish();                                     // 新 cycle 种子重撒；_gone 鱼保持已钓起
    schoolApply();
  }
  school.timer = setTimeout(schoolScatter, schoolConf().present * SPEED);
}
/* 池塘撒点：确定性纯函数（同 (seed+cycle) 同尺寸同布局）；鱼按钮盒静止（游动在内层 .swim） */
function placeFish() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  pondEl.querySelectorAll('.animal').forEach(el => el.remove());
  const C = CHAPTERS[cur.dch];
  const W = pondEl.clientWidth, H = pondEl.clientHeight;
  const size = C.size;
  const pts = scatterPts(mulberry32(q.seed + school.cycle * 101), W, H, q.fishes.length, C.D, size / 2 + 8);
  q.fishes.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'animal fish';
    b.dataset.i = i;
    b.dataset.k = 'f';
    b.setAttribute('aria-label', COLORS[f.c].name + '小鱼' + (i + 1));
    b.style.width = Math.round(size) + 'px';
    b.style.height = Math.round(size * 0.8) + 'px';
    const p0 = pts[i] || { x: W / 2, y: H / 2 };
    b.style.left = Math.round(p0.x - size / 2) + 'px';
    b.style.top = Math.round(p0.y - size * 0.4) + 'px';
    b.style.setProperty('--dur', (7 + f.w1 * 5).toFixed(2) + 's');
    b.style.setProperty('--del', (-f.w2 * 10).toFixed(2) + 's');
    b.innerHTML = '<span class="swim">' + fishSvg(f) + '</span><span class="badge"></span>';
    if (q._gone && q._gone[i]) b.classList.add('gone');   // 重渲染不丢已钓起状态
    pondEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip(q);
  renderStep();
  placeFish();
  schoolStart();                                    /* r7：每题全新鱼群（ch2+ 游散周期） */
  if (!VERIFY && !state.demo) playChain(quizParts(q), quizSpeech(q));   /* 读题一次（T46 阶段2 拆段 clip 链，§0.19 全语音承载）；
                                                                   r7 不自动重播（救援每题一次） */
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
window.addEventListener('resize', () => {
  if (cur && cur.quizzes[cur.step]) { placeFish(); schoolApply(); }   /* r7：重撒后恢复游散相位 */
});

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
/* 教学"帮"阶段指向：当前步第一条没钓起的目标色鱼 */
function firstLiveTarget(q) {
  const act = engActive(q);
  if (act < 0) return -1;
  q._gone = q._gone || [];
  for (let i = 0; i < q.fishes.length; i++) {
    if (q.fishes[i].c === q.targets[act] && !q._gone[i]) return i;
  }
  return -1;
}
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = firstLiveTarget(q);
  if (i >= 0) pointGhostAt(fishEl(i), 'tut');
}

/* ================= 钓鱼主路径（真实点击 / FIS.tapFish / autoSolve 共用） ================= */
async function uiTapFish(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked，照 batch5 M1 修复） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const actBefore = engActive(q);
  const run = cur;                               /* 演出窗口内点重玩会重建 cur——身份守卫防旧续体错推进 */
  const r = engTapFish(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';             /* 已钓起：早退零惩罚不计数（§0.7） */
  const el = fishEl(i);

  if (r === 'wrong') {                           /* 点非目标色鱼：摆尾躲开零惩罚+sayW 纠错方向锚 */
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
    dodgeLo();
    /* r7 纠错不泄答案：点非目标色=fis_wrong / 点了后步目标色（序错）=fis_wrong_seq（不说哪条对） */
    const seqMiss = q.targets.indexOf(q.fishes[i].c) >= 0;
    const vw = seqMiss ? VOICE.wrongSeq : VOICE.wrong;
    sayW(vw.key, vw.text);                       /* flat<3 每错必播 / flat≥3 10s 节流（P1） */
    if (q._miss >= 2) {                          /* 首错不 pulse：连错 2 次才高亮当前步目标色鱼 */
      const t = firstLiveTarget(q);
      if (t >= 0 && fishEl(t)) {
        const te = fishEl(t);
        te.classList.remove('breathe'); void te.offsetWidth; te.classList.add('breathe');
      }
    }
    await wait(420 * SPEED);
    return 'wrong';
  }

  /* ---- 钓起 ---- */
  lastAct = Date.now();                          /* 仅正确推进重置救援钟（5.5 岁试玩 P1） */
  if (state.tut === 'help') {                    /* 教学"独"：首次钓对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  if (el) {
    const bd = el.querySelector('.badge');
    bd.textContent = q._cnt;
    bd.classList.remove('on'); void bd.offsetWidth; bd.classList.add('on');
    el.classList.remove('breathe');
    el.classList.remove('rise'); void el.offsetWidth; el.classList.add('rise');
    setTimeout(() => { if (el.classList.contains('rise')) el.classList.add('gone'); }, 700 * SPEED);
  }
  plop();
  rodTug();

  if (r === 'done') {                            /* 本题钓满：小兔子开心→推进 */
    state.locked = true;
    schoolClear();                               /* r7：演出窗停游散周期 */
    sfx('coin');
    hopRabbit();
    if (q.kind === 'mix' && !VERIFY && !state.demo) {   /* r7 间色合成句（T46 阶段2：fis_mix_ 双序整句 clip） */
      KIDS.voice.play('fis_mix_' + q.mix + '_' + (MIXES[q.mix][0] === q.targets[0] ? '12' : '21'),
        nameOf(q.targets[0]) + '和' + nameOf(q.targets[1]) + '，变成' + nameOf(q.mix) + '的小鱼啦');
    }
    await wait(880 * SPEED);
    if (cur !== run) return r;                   /* 演出窗内重玩已重建关卡，丢弃旧续体 */
    state.locked = false;
    if (cur.done) winFlow();
    else renderQuiz();
  } else {
    renderChip(q);                               /* 色卡圆点点亮 */
    if (engActive(q) !== actBefore) chimeStep(); /* r7 分步推进：换卡+轻铃，不重播语音（序自记） */
    if (state.tut === 'help') pointHelpNext();   /* "帮"：跟着孩子的节奏指向下一条 */
  }
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);               // 0 基：刚打完的章
  /* 静态章末=预告下一静态章（ci+1<4）；生成关=实算下一关难度章（家族 F：禁 (ci+1)%4 字面） */
  if (ci + 1 < 4) return CHAPTERS[ci + 1].hint;
  return GEN_HINTS[genLevel(f + 1).dch - 1];
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
  schoolClear();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  school.waitSaid = false;                        /* r7：游散提示每关一次 */
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.fis && sv.fis.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指逐条钓起目标色鱼（角标 1..K 出现、色卡圆点点亮）→题成演示；
   帮=指向下一条没钓的目标色鱼；独=首次钓对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  let caught = 0;
  for (let i = 0; i < q.fishes.length && caught < q.need[0]; i++) {   // 演示逐条钓起（K≥2 恒 ≥1 次）
    if (q.fishes[i].c !== q.targets[0]) continue;
    pointGhostAt(fishEl(i), 'tut');
    await wait(900 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    await uiTapFish(i, true);
    caught++;
    await wait(560 * SPEED);
  }
  await wait(500 * SPEED);                      // 题成推进演出窗口
  const sv = KIDS._save();
  sv.fis = sv.fis || {};
  sv.fis.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来钓一钓"在重发后的题面上说（照 batch5 m6 修复） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与池塘交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* 反方审查 M1 附带：教学/演出期点兔子不打断 */

  lastAct = Date.now();
  hopRabbit();
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 反方审查 M1：教学/演出/通关期重玩门（防教学续体失控）*/

  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) playChain(quizParts(q), quizSpeech(q));   /* 再听一遍：读题（T46 阶段2 拆段链） */
});
pondEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.animal');
  if (!el) {                                    /* 点水面空白：10s 节流轻提示（§0.16 非主交互轻反馈） */
    e.preventDefault();
    if (VERIFY || !cur || state.locked || state.won || state.demo) return;
    if (Date.now() - lastBlankHint > 10000) {    /* 空白点击不重置救援钟（5.5 岁试玩 P1） */
      lastBlankHint = Date.now();
      sayR(VOICE.hint.key, VOICE.hint.text);
    }
    return;
  }
  e.preventDefault();
  uiTapFish(Number(el.dataset.i));
});

/* ================= 无操作看护（r7）：idle 20s 救援每题一次（去自动重播兜底）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    const qq = cur.quizzes[cur.step];            /* 救援：每题仅一次重读指令（不受 flat 门，§0.5） */
    if (qq && !qq._rescued) {
      qq._rescued = 1;
      playChain(quizParts(qq), quizSpeech(qq));   /* 救援重读（T46 阶段2 拆段链） */
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
  KIDS.init({ game: 'fishcolor', title: '钓鱼颜色' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：传 lim-1（刚玩完的末关） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.FIS = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || { _cnt: 0 };
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      caught: q._cnt || 0 };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind, mix: q.mix || null, targets: q.targets.slice(), need: q.need.slice(),
      got: q.got.slice(), step: cur.step, act: engActive(q), miss: q._miss || 0,
      fishes: q.fishes.map(f => ({ c: f.c })),
      gone: q.fishes.map((f, i) => !!(q._gone && q._gone[i])) };
  },
  tapFish(i) { return uiTapFish(i); },
  get school() {                                   /* r7 鱼群游散状态（verify/验收观测） */
    return { on: school.on, phase: school.phase, cycle: school.cycle };
  },
  async autoSolve() {                           // UI 路径自动钓完当前关（按分步顺序真实点鱼）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = firstLiveTarget(q);
      if (i < 0) break;
      const r = await uiTapFish(i);
      if (r === false || r === null || r === 'again') break;
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
