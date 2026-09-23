/* ================= chainsum 主逻辑（小火车渲染 / 候选卡点选 / 填车亮灯 / 教学 / 推进）
   玩法：小兔子火车接龙。首节车厢=起点数字；每题尾部空车厢上方挂运算牌（+3/-2 大字），
   题面语音=整句 TTS（"八加三等于几呀"，数词+加减词拼句）。孩子从底部 3 张数字卡点选结果：
   答对=空车厢填数亮起、尾部挂新空车厢（同关五题首尾相接成链）；答错=晃动灰掉零惩罚
   （排除法保底——灰化款），首错不 pulse，miss≥2 pulse 正确卡。每关 5 题。
   开场/交接语音走顺序链（quiet 标志，worden/whereistand 定版形态）：
   开场=play(cs_hint) 后 2000ms 接力题面 TTS；教学交接=play(turn) 后 2000ms 接力（禁双通道叠音）。
   验收钩子：window.CS = { get currentLevel, get quiz(){cur,op,d,answer,options,dead,step,miss},
   tapCard(i), async autoSolve(), get tutorial }（getter 返回拷贝非活引用） */
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
   force=miss≥2 豁免（连错 2 次恰是 pulse 已亮真卡住时刻，语音与高亮同步——batch8 P1②定版）；
   本款答错灰掉（灰化款），3 选错光灰掉 miss 封顶 2，豁免自然只发一次 */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const fieldEl = $id('field'), trainEl = $id('train'), chipEl = $id('prompt-chip'),
      cardsEl = $id('cards'), stageEl = $id('stage'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'
let qTimer = null;                              // T46 阶段2 后接力形态退役（恒 null，防御保留）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardsEl.querySelector('.cardbtn[data-i="' + i + '"]');
const carEl = i => trainEl.querySelector('.carslot[data-i="' + i + '"]');

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

/* ================= 题面语音（读题 sayR 级不受 flat 门）
   题面 = 拆段 clip 链（T46 阶段2：'八加三等于几呀'=cs_n_8+cs_op_add+cs_n_3+cs_tail）；重入先清接力定时器 */
function speakQuiz(q) {
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  /* T46 阶段2：题面拆段 clip 链（cs_n_+cs_op_+cs_tail），缺段整句 TTS 兜底 */
  const ks = qParts(q);
  if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
  else KIDS.voice.say(qSpeech(q));
}

/* ================= 开场顺序链（§0.5/§0.6，worden/whereistand 定版形态：quiet 标志防渲染插播）
   queue([cs_hint, 题面段…]) 单通道链（T46 阶段2：题面 clip 化后接力 TTS 形态退役） */
function openingSpeak() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }   /* 防上一关接力残留切断本关 */
  /* T46 阶段2：题面已 clip 化——原 2000ms TTS 接力改 queue([hint, 题面段…]) 链 */
  const ks = [VOICE.hint.key].concat(qParts(q));
  if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
  else sayR(VOICE.hint.key, VOICE.hint.text);
}

/* ================= 渲染 ================= */
/* 小火车：car[0]=车头 s0，car[i]=quizzes[i-1].answer（i≤step 已填），car[step+1]=空车厢（当前题）；
   刚答上的一节（index===step>0）带 justlit 弹出；运算牌挂空车厢上方（+ 暖橙 / - 灰蓝大字） */
function buildTrain() {
  const q = cur.quizzes[cur.step];
  const nCars = Math.min(cur.step, CH_LEN) + 2;          // 已填 step+1 节 + 空车厢 1 节（通关前恒有）
  trainEl.innerHTML = '';
  for (let i = 0; i < nCars; i++) {
    const slot = document.createElement('div');
    slot.dataset.i = i;
    if (i === 0) slot.className = 'carslot head';
    else if (i === nCars - 1) slot.className = 'carslot tail';
    else slot.className = 'carslot';
    const sign = document.createElement('div');
    sign.className = 'opsign';
    const car = document.createElement('div');
    const num = document.createElement('span');
    num.className = 'cv';
    if (i === nCars - 1) {                              // 尾部空车厢：? + 运算牌大字
      car.className = 'car empty';
      num.textContent = '?';
      sign.classList.add(q.op === '+' ? 'plus' : 'minus');
      sign.innerHTML = '<b>' + q.op + q.d + '</b>';
      slot.setAttribute('aria-label', '空车厢，运算 ' + q.op + q.d);
    } else {
      car.className = 'car';
      num.textContent = i === 0 ? cur.s0 : cur.quizzes[i - 1].answer;
      if (i === cur.step && cur.step > 0) car.classList.add('justlit');   // 刚接上的一节
    }
    car.appendChild(num);
    const wheels = document.createElement('div');
    wheels.className = 'wheels';
    wheels.innerHTML = '<i></i><i></i>';
    slot.appendChild(sign); slot.appendChild(car); slot.appendChild(wheels);
    trainEl.appendChild(slot);
  }
}
function renderChip(q) {                        // 题面行：等式装饰性冗余（指令全语音承载 §0.19）
  chipEl.innerHTML = '<span class="fnum">' + q.cur + '</span>' +
    '<span class="fop ' + (q.op === '+' ? 'plus' : 'minus') + '">' + q.op + '</span>' +
    '<span class="fnum">' + q.d + '</span><span class="feq">=</span><span class="fq">?</span>';
  chipEl.setAttribute('aria-label', qSpeech(q) + '，点我再听一遍');
}
function renderCards(q) {
  cardsEl.innerHTML = '';
  q.options.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'cardbtn' + (q._dim[i] ? ' dim' : '');
    b.dataset.i = i;
    b.setAttribute('aria-label', '数字 ' + v);
    b.innerHTML = '<span class="changer"></span><span class="cv">' + v + '</span>';
    cardsEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  buildTrain();
  renderChip(q);
  renderCards(q);
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
/* 教学"帮"阶段指向：当前题的正确数字卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(q.options.indexOf(q.answer)), 'tut');
}

/* ================= 候选卡点选主路径（真实点击 / CS.tapCard / autoSolve 共用） ================= */
async function uiTapCard(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked）。
     吞输入期轻反馈（§0.22）：真实点击被 locked/demo/won 吞时 sfx('pop') 轻叮，返回值/状态不变 */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    sfx('pop');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';            /* 已灰卡：早退零惩罚不计数（§0.7 防御层） */
  const el = cardEl(i);

  if (r === 'wrong') {                          /* 答错：晃动+灰掉（pointer-events:none）零惩罚，排除法保底 */
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig', 'dim'); }
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss >= 2);   /* flat<3 每错必播 / flat≥3 10s 节流+豁免恰一次（灰化款 miss 封顶 2） */
    if (q._miss >= 2) {                         /* 首错不 pulse：连错 2 次才高亮正确数字卡 */
      const ok = cardEl(q.options.indexOf(q.answer));
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    await wait(480 * SPEED);
    return r;
  }

  /* ---- 答对：空车厢填数亮起（同步前缀）→ 演出窗 → 尾部挂新空车厢 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  fillCar();                                    /* 空车厢填数亮灯（同步，供验收窗内读 DOM） */
  chimeGoal();
  sfx('coin');
  await wait(950 * SPEED);
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  state.locked = false;
  if (cur.done) winFlow();
  else renderQuiz();
  return r;
}
/* 填车：engTap 已推进 step → 刚答的空车厢 = carEl(step)（原 step+1 位）填上答案并亮起 */
function fillCar() {
  const slot = carEl(cur.step);
  if (!slot) return;
  const q = cur.quizzes[cur.step - 1];
  const car = slot.querySelector('.car');
  const num = slot.querySelector('.cv');
  if (!car || !num || !q) return;
  slot.className = 'carslot';
  car.classList.remove('empty');
  car.classList.add('justlit');
  num.textContent = q.answer;
  const sign = slot.querySelector('.opsign');
  if (sign) sign.innerHTML = '';                /* 运算牌随填车摘牌（新车厢自带新牌） */
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  /* verify 页恒走 openingSpeak（stub 记录开场链供断言，教学由真实页自测覆盖） */
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.cs && sv.cs.tutSeen);
  if (VERIFY) { openingSpeak(); return; }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；hint 不得切断题面） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点出正确数字卡（空车厢填数亮起，locked 吞输入）→帮=指向正确卡；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = q.options.indexOf(q.answer);
  pointGhostAt(cardEl(idx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapCard(idx, true);                    // demo 通道豁免 locked（演示吞真实输入）
  await wait(1000 * SPEED);                      // 填车亮灯演出窗口
  const sv = KIDS._save();
  sv.cs = sv.cs || {};
  sv.cs.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来接一接"在重发后的题面上说（照 batch5-8） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链（T46 阶段2）：题面已 clip 化——qTimer 接力改 queue([turn, 题面段…]) 链 */
  {
    const qh = cur.quizzes[cur.step];
    const ks = [VOICE.turn.key].concat(qParts(qh));
    if (ks.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(ks);
    else sayR(VOICE.turn.key, VOICE.turn.text);
  }
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
  const p = e.target.closest('.cardbtn');
  if (p) {                                       // 候选数字卡：主答路径
    e.preventDefault();
    uiTapCard(Number(p.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return;  // 题面卡走自己的 handler
  /* 空白/探索点击（天空草地车厢等，含已灰卡 pointer-events:none 落穿）：10s 节流轻提示（§0.16）；
     不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（重读题面 + 正确卡视觉重现一次）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援=重读题面（§0.7a，非通用催促句） */
    if (q) speakQuiz(q); else sayR(VOICE.hint.key, VOICE.hint.text);
    if (q) {                                    /* 视觉重现（§0.21）：正确数字卡 breathe 一次，静音也能看见答案线索 */
      const ok = cardEl(q.options.indexOf(q.answer));
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
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
  KIDS.init({ game: 'chainsum', title: '算术接龙' });
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
window.CS = {
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
    return { cur: q.cur, op: q.op, d: q.d, answer: q.answer,          /* SPEC §1 钩子契约 */
      options: q.options.slice(), dead: q._dim.slice(),
      step: cur.step, miss: q._miss || 0 };
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                           // UI 路径自动点完当前关（逐题点正确数字卡）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 30) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapCard(q.options.indexOf(q.answer));
      taps++;
      if (r === false || r === null) break;     // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
