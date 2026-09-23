/* ================= neighbors 主逻辑（数字小街渲染 / 门牌点选 / 填房亮灯 / 教学 / 推进）
   玩法：一排小房子挂门牌号（本章范围内 S 形按序续排，房子里住着小动物）。每题一个空房
   （高亮+问号旗），题面语音（数词 TTS 拼 clip 句式）"五的邻居是几呀？比它多一"。
   孩子从底部 3 张候选门牌点选填入空房 → 填对小动物搬进去亮灯庆祝；填错晃动灰掉零惩罚。
   空房左右邻居房号恒亮 = 数轴锚点（可"顺着数"自行验证）。每关 5 题。
   验收钩子：window.NEB = { get currentLevel, get quiz(){mode,n,answer,options,filled},
   tapOption(i), async autoSolve(), get tutorial } */
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
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩共性 P1：安静试错只有视觉晃动）；
   force=miss≥2 豁免（连错 2 次恰是 pulse 已亮真卡住时刻，语音与高亮同步——6 岁试玩 P1②；
   恒 3 选错光灰掉 miss 封顶 2，豁免自然只发一次） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const fieldEl = $id('field'), streetEl = $id('street'), chipEl = $id('prompt-chip'),
      platesEl = $id('plates'), stageEl = $id('stage'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const houseEl = n => streetEl.querySelector('.house[data-n="' + n + '"]');
const plateEl = i => platesEl.querySelector('.platebtn[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  fieldEl.querySelector('.scene').innerHTML = sceneSvg();
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：填对=双音上行+叮咚 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（T46 阶段2：预合成 clip 段链；r31 扩 8 型，SPEC-R31 §R10）
   plus/minus：queue([neb_n_n, neb_q1|neb_q2])（数词 clip+句式 clip，段间 0.15s）
   mid：queue([neb_mid_n, neb_q4])——neb_mid_n=「n和n+2」整段 clip；
   r31 新 5 型：plus2/minus2=[neb_n_n, neb_qp2|neb_qm2]；mid4=[neb_n_n, neb_and,
   neb_n_(n+4), neb_q4]；dualA/B=[neb_n_n, neb_dual_a|neb_dual_b]——5 新键主线注册前
   缺段走 KIDS.voice.say(fallback)（过渡态=静默，视觉完整，r29 m3 先例） */
const quizKeys = q => q.mode === 'mid'
  ? ['neb_mid_' + q.n, VOICE.q4.key]
  : q.mode === 'plus'
  ? ['neb_n_' + q.n, VOICE.q1.key]
  : q.mode === 'minus'
  ? ['neb_n_' + q.n, VOICE.q2.key]
  : q.mode === 'plus2'
  ? ['neb_n_' + q.n, VOICE.qp2.key]
  : q.mode === 'minus2'
  ? ['neb_n_' + q.n, VOICE.qm2.key]
  : q.mode === 'mid4'
  ? ['neb_n_' + q.n, VOICE.and.key, 'neb_n_' + (q.n + 4), VOICE.q4.key]
  : ['neb_n_' + q.n, (q.mode === 'dualA' ? VOICE.dualA : VOICE.dualB).key];
const quizText = q => q.mode === 'mid'
  ? numCn(q.n) + '和' + numCn(q.n + 2) + VOICE.q4.text
  : q.mode === 'plus'
  ? numCn(q.n) + VOICE.q1.text
  : q.mode === 'minus'
  ? numCn(q.n) + VOICE.q2.text
  : q.mode === 'plus2'
  ? numCn(q.n) + VOICE.qp2.text
  : q.mode === 'minus2'
  ? numCn(q.n) + VOICE.qm2.text
  : q.mode === 'mid4'
  ? numCn(q.n) + VOICE.and.text + numCn(q.n + 4) + VOICE.q4.text
  : numCn(q.n) + (q.mode === 'dualA' ? VOICE.dualA : VOICE.dualB).text;
const playChain = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.voice.say(fallback);
};
function speakQuiz(q) {
  if (!q) return;
  playChain(quizKeys(q), quizText(q));
}

/* ================= 渲染 ================= */
/* 参照房号（题面报出的锚点房）在引擎层（game-core.js refNums，verify 共用）：
   plus/minus/±2/dual=[n] / mid=[n,n+2] / mid4=[n,n+4]（恒亮+柔绿圈强调）
   r31 藏牌律（SPEC-R31 §R1）：q.hidden 房（dch3/4 空房两邻中非 ref 者）门牌牌面
   渲染 '·' + class 'blind'——视觉诚实铁律：藏=牌面视觉无数字且 aria 不泄号 */
function buildStreet() {
  const q = cur.quizzes[cur.step];
  const range = STREET[cur.dch], lo = range[0], hi = range[1];
  const N = hi - lo + 1;
  const twoRows = N > 10;
  const C = twoRows ? Math.ceil(N / 2) : N;
  streetEl.innerHTML = '';
  streetEl.style.setProperty('--cols', C);
  const refs = refNums(q);
  const hid = q.hidden || [];
  for (let num = lo; num <= hi; num++) {
    const h = document.createElement('div');
    h.className = 'house';
    h.dataset.n = num;
    if (num === q.answer) {
      h.setAttribute('aria-label', '空房子，要挂门牌号');
    } else if (hid.indexOf(num) >= 0) {
      h.setAttribute('aria-label', '还没挂门牌的房子');   // 视觉诚实：aria 不泄号
    } else {
      h.setAttribute('aria-label', num + ' 号房子');
    }
    const row = twoRows && num > lo + C - 1 ? 2 : 1;
    const idx = num - lo;
    h.style.gridArea = row + ' / ' + (row === 1 ? idx + 1 : C - (idx - C));   // 下排右→左（S 形续排）
    if (num === q.answer) {                     // 空房：虚线墙 + 问号旗
      h.classList.add('empty');
      h.innerHTML = '<div class="roof"></div><div class="wall"><div class="win"></div></div>' +
        '<div class="plate">?</div><div class="qflag">' + ICONS.flagQ + '</div>';
    } else {
      const blind = hid.indexOf(num) >= 0;      // r31 盲牌：牌面 '·'（墙/窗/动物照常）
      if (refs.indexOf(num) >= 0) h.classList.add('ref');
      if (blind) h.classList.add('blind');
      h.innerHTML = '<div class="roof"></div><div class="wall"><div class="win">' +
        animalSvg(num % 4) + '</div></div><div class="plate">' + (blind ? '·' : num) + '</div>';
    }
    if (twoRows && num === lo + C - 1) {        // 折点小箭头（纯装饰）
      const fa = document.createElement('span');
      fa.className = 'foldarrow';
      fa.innerHTML = ICONS.fold;
      h.appendChild(fa);
    }
    streetEl.appendChild(h);
  }
}
/* 填对：空房挂上门牌 + 小动物搬进窗 + 亮灯（庆祝演出，uiTapOption 调用） */
function fillHouse(q) {
  const h = houseEl(q.answer);
  if (!h) return;
  h.classList.remove('empty');
  h.classList.add('filled');
  const pl = h.querySelector('.plate');
  if (pl) pl.textContent = q.answer;
  const wn = h.querySelector('.win');
  if (wn) wn.innerHTML = animalSvg(q.answer % 4);
  const fl = h.querySelector('.qflag');
  if (fl) fl.remove();
}
function renderChip(q) {                        // 题面行：数字+图标装饰性冗余（指令全语音承载 §0.19）
  /* r31 新型：±2 双箭头 / mid4 双点隔 / dual 两小步标（+1 再 -2 / +2 再 -1） */
  if (q.mode === 'mid' || q.mode === 'mid4') {
    const gap = q.mode === 'mid4' ? '<span class="fmid">··</span>' : '<span class="fmid">·</span>';
    chipEl.innerHTML = '<span class="fnum">' + q.n + '</span>' + gap +
      '<span class="fq">?</span>' + gap + '<span class="fnum">' + (q.n + (q.mode === 'mid4' ? 4 : 2)) + '</span>';
  } else if (q.mode === 'dualA' || q.mode === 'dualB') {
    const first = q.mode === 'dualA' ? ICONS.up1 : ICONS.up2;
    const second = q.mode === 'dualA' ? ICONS.down2 : ICONS.down1;
    chipEl.innerHTML = '<span class="fnum">' + q.n + '</span>' +
      '<span class="fstep">' + first + second + '</span>' +
      '<span class="fq">?</span>';
  } else {
    const dir = q.mode === 'plus' ? ICONS.up1 : q.mode === 'minus' ? ICONS.down1
      : q.mode === 'plus2' ? ICONS.up2 : ICONS.down2;
    chipEl.innerHTML = '<span class="fnum">' + q.n + '</span>' +
      '<span class="fdir">' + dir + '</span>' +
      '<span class="fq">?</span>';
  }
}
function renderPlates(q) {
  platesEl.innerHTML = '';
  q.options.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'platebtn' + (q._dim[i] ? ' dim' : '');
    b.dataset.i = i;
    b.setAttribute('aria-label', '门牌 ' + v);
    b.innerHTML = '<span class="phanger"></span><span class="pv">' + v + '</span>';
    platesEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  buildStreet();
  renderChip(q);
  renderPlates(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);  /* 开场/换题读题；demo 门防演示收尾叠播；quiet=教学交接改顺序链（审查 M3） */
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
/* 教学"帮"阶段指向：当前题的正确门牌 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(plateEl(q.options.indexOf(q.answer)), 'tut');
}

/* ================= r31 dual 两跳演出（SPEC-R31 §R1/§R4，r30 演出窗纪律） ================= */
window.__dualJumpN = 0;                         /* verify/selftest 演出取证锚（答对两跳+miss≥2 演示合计） */
const isDualMode = q => q.mode === 'dualA' || q.mode === 'dualB';
/* 答对两跳（locked 窗内）：ref n 房高亮 420ms → s 房 820ms → 挂牌（fillHouse 由调用方
   执行）。s 段条件化（r31 修复 M1）：仅藏牌房（hidden 含 s=dualB，s=n+2 恒藏）揭示真数字
   →复盲（答后验算）；dualA 的 s=n+1 是亮牌房（hidden=[n-2]）→只加/去 reveal 高亮类，
   牌面恒真数字不写不复盲（SPEC §R12「亮牌仅高亮」兑现口径）。plate.textContent 写入只许
   发生在藏牌房路径。逐段身份守卫 cur!==run 即静默退（旧续体只操作已 detach 的旧 DOM
   引用，无视觉污染） */
async function dualJump(q, run) {
  window.__dualJumpN++;
  const refH = houseEl(q.n);
  if (refH) refH.classList.add('jump');
  await wait(420 * SPEED);
  if (cur !== run) { if (refH) refH.classList.remove('jump'); return false; }
  const sH = houseEl(q.s);
  const sBlind = (q.hidden || []).indexOf(q.s) >= 0;   /* dualB true / dualA false */
  if (sH) {
    sH.classList.add('reveal');
    if (sBlind) {
      const pl = sH.querySelector('.plate');
      if (pl) pl.textContent = q.s;
    }
  }
  await wait(820 * SPEED);
  if (refH) refH.classList.remove('jump');
  if (sH) {
    sH.classList.remove('reveal');
    if (sBlind) {
      const pl = sH.querySelector('.plate');
      if (pl && cur === run) pl.textContent = '·';   /* 复盲（关末不重建街，防 s 号亮残留 r29 同族） */
    }
  }
  return cur === run;
}
/* miss≥2 支架演示（不锁输入、不刷 lastAct=救援钟仍可达 r24 keepIdle；q._demoP 互斥
   r30 M1 范式：演示中重入返回在跑 promise 不叠演；650ms 让错反馈先落） */
function demoDualJump(q, run) {
  if (q._demoP) return q._demoP;
  q._demoP = (async () => {
    await wait(650 * SPEED);                    /* 让错反馈（晃动/灰牌）先落地 */
    if (cur !== run || cur.quizzes[cur.step] !== q) { q._demoP = null; return; }
    window.__dualJumpN++;
    const refH = houseEl(q.n);
    if (refH) { refH.classList.remove('jump'); void refH.offsetWidth; refH.classList.add('jump'); }
    await wait(420 * SPEED);
    if (cur !== run || cur.quizzes[cur.step] !== q) {
      if (refH) refH.classList.remove('jump'); q._demoP = null; return;
    }
    const sH = houseEl(q.s);
    const sBlind = (q.hidden || []).indexOf(q.s) >= 0;   /* dualB true / dualA false（r31 修复 M1 同 dualJump） */
    if (sH) {
      sH.classList.add('reveal');
      if (sBlind) {
        const pl = sH.querySelector('.plate');
        if (pl) pl.textContent = q.s;           /* 中间步揭晓=miss≥2 支架升级（仅藏牌房；dualA 亮房仅高亮） */
      }
    }
    await wait(820 * SPEED);
    if (sH && cur === run && cur.quizzes[cur.step] === q) {
      sH.classList.remove('reveal');
      if (sBlind) {
        const pl = sH.querySelector('.plate');
        if (pl) pl.textContent = '·';           /* 复盲：视觉诚实（非救援态不泄号；仅藏牌房） */
      }
    }
    if (refH) refH.classList.remove('jump');
    q._demoP = null;
  })();
  return q._demoP;
}

/* ================= 门牌点选主路径（真实点击 / NEB.tapOption / autoSolve 共用） ================= */
async function uiTapOption(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';            /* 已灰牌：早退零惩罚不计数（§0.7 防御层） */
  const el = plateEl(i);

  if (r === 'wrong') {                          /* 答错：晃动+灰掉（pointer-events:none）零惩罚 */
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig', 'dim'); }
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss >= 2);   /* flat<3 每错必播 / flat≥3 10s 节流+miss≥2 豁免（P1②） */
    if (q._miss >= 2) {                         /* 首错不 pulse：连错 2 次才高亮正确门牌 */
      const ok = plateEl(q.options.indexOf(q.answer));
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
      if (isDualMode(q)) demoDualJump(q, run);  /* r31：dual 连错 2 次 → 两跳街道演示（不锁不刷钟） */
    }
    await wait(480 * SPEED);
    return r;
  }

  /* ---- 答对：填房亮灯 → 推进 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  if (isDualMode(q)) {                          /* r31：dual 答对先两跳演出（1790ms 窗）再挂牌 */
    const go = await dualJump(q, run);
    if (!go) return r;                          /* 演出窗内重玩已重建关：丢弃旧续体（locked 随新关重置） */
  }
  fillHouse(q);
  chimeGoal();
  sfx('coin');
  await wait((isDualMode(q) ? 550 : 950) * SPEED);
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  state.locked = false;
  if (cur.done) winFlow();
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
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.neb && sv.neb.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点出正确门牌（空房挂上号+小动物搬进亮灯）→帮=指向正确门牌；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = q.options.indexOf(q.answer);
  pointGhostAt(plateEl(idx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapOption(idx, true);                 // demo 通道豁免 locked（演示吞真实输入）
  await wait(1000 * SPEED);                     // 填房亮灯演出窗口
  const sv = KIDS._save();
  sv.neb = sv.neb || {};
  sv.neb.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来挂一挂"在重发后的题面上说（照 batch5 m6 修复） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接链（T46 阶段2）：turn clip+题面段合并 queue 单链——段间自动顺序（原 2000ms TTS
     接力退役；审查 M3 顺序语义由 queue 保证，turn 与题面不叠音） */
  const q0 = cur.quizzes[0];
  playChain([VOICE.turn.key].concat(quizKeys(q0)), VOICE.turn.text + quizText(q0));
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* §0.20：教学/演出期点兔子不打断 */

  lastAct = Date.now();
  hopRabbit();
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20：教学/演出/通关期重玩门 */

  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查 m5：对齐重玩门/题面卡防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);             /* 再听一遍：数词+句式整段重读 */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);             /* 题面卡可点重听（点题卡=儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.platebtn');
  if (p) {                                      // 候选门牌：主答路径
    e.preventDefault();
    uiTapOption(Number(p.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return; // 题面卡走自己的 handler
  /* 空白/探索点击（含已灰门牌 pointer-events:none 落穿）：10s 节流轻提示（§0.16）；
     不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援提示（重读题面）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援=重读题面（§0.7a，非通用催促句） */
    if (q) speakQuiz(q); else sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'neighbors', title: '数的邻居' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.NEB = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      answer: q.answer || 0 };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { mode: q.mode, n: q.n, answer: q.answer, options: q.options.slice(),   /* SPEC §1 钩子契约（既有字段零变化） */
      s: q.s, hidden: (q.hidden || []).slice(),                                  /* r31 新增：dual 中间态/藏牌房号 */
      filled: !!q._filled, step: cur.step, miss: q._miss || 0, dim: q._dim.slice() };
  },
  tapOption(i) { return uiTapOption(i); },
  async autoSolve() {                           // UI 路径自动点完当前关（逐题点正确门牌）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 30) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapOption(q.options.indexOf(q.answer));
      taps++;
      if (r === false || r === null) break;     // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
