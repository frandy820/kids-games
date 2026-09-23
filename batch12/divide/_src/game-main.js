/* ================= divide 主逻辑（糖果托盘/盘子渲染 / 轮流发放飞行 / 答问 / 教学 / 推进）
   玩法两段（SPEC-BATCH12 §1）：
   deal 发放期——N 颗糖（6-12）分给 M 个盘子（2-4）：逐颗点糖→飞到当前轮到的盘子
   （轮流发放天然均匀=防错），盘子角标 +1，轮到的盘子呼吸高亮；
   剩糖不足一轮（left<M）自动切 ask 答问期——余数糖留桌上（降饱和视觉）+余数语音，
   亮"每人几颗呀"3 选 1 数字大卡（干扰=商±1/±2/商与除数混，互异禁 0）。
   答错=晃动不灰化可重点（不灰化款）；sayW force=q.miss===2；首错不高亮，miss≥2 正确卡 breathe。
   验收钩子：window.DV = { get currentLevel, get quiz(){total,plates,cur,given,left,phase,
   options,answerIdx,answer,rem,step,miss}, tapCandy(i), tapAnswer(i), async autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/余数句/教学不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次——不灰化款（miss 无上限）
   必须 === 2（batch9/sortsize 定版）：豁免只在每题 miss 首达 2 时发一次，防豁免变每错必播 */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 题面=queue 拼接 clip（times 模式 §0.23）：全部段 clip 在场走 queue，缺任一走整句 TTS 兜底 */
function sayQ(parts, fullText) {
  if (KIDS.voice.clips && parts.every(p => KIDS.voice.clips[p.key])) {
    KIDS.voice.queue(parts.map(p => p.key));
  } else {
    KIDS.voice.say(fullText);
  }
}

const stageEl = $id('stage'), chipEl = $id('prompt-chip'), dealcountEl = $id('dealcount'),
      candyTrayEl = $id('candy-tray'), plateRowEl = $id('plate-row'), answersEl = $id('answers'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let lastRemHint = 0;                            // ask 期点余数糖提示节流（10s）
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const candyEl = i => candyTrayEl.querySelector('.candy[data-i="' + i + '"]');
const plateEls = p => plateRowEl.querySelector('.plate[data-p="' + p + '"]');
const optEl = i => answersEl.querySelector('.opt[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：发放=双音上扬 / 点余数糖（不放飞）=低柔单音 */
const candyHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const flapLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
/* 题面：ch1-3 图文章面（糖icon N 颗糖·平均分给·盘icon M 个小朋友）/ ch4 黑板算式 N÷M=? */
function renderChip(q) {
  if (cur.dch === 4) {
    chipEl.className = 'board';
    chipEl.innerHTML = '<div id="formula">' + q.n + ' ÷ ' + q.m + ' = <span class="qm">?</span></div>';
    return;
  }
  chipEl.className = '';
  chipEl.innerHTML =
    '<span class="seg">' + ICONS.candyMini + '<b>' + q.n + '</b><span class="lb">颗糖</span></span>' +
    '<span class="x">平均分给</span>' +
    '<span class="seg">' + ICONS.plateMini + '<b>' + q.m + '</b><span class="lb">个小朋友</span></span>';
}
/* 发放进度条：已发 k / 需发 K（K=n-rem；发完即答案铺垫） */
function renderDealcount(q) {
  const k = q._given.reduce((s, v) => s + v, 0), K = q.n - q.rem;
  dealcountEl.innerHTML = '<b>' + k + '</b>/' + K + ' 已分';
  dealcountEl.setAttribute('aria-label', '已分 ' + k + ' 颗，共 ' + K + ' 颗');
}
function renderCandies(q) {
  candyTrayEl.innerHTML = '';
  for (let i = 0; i < q.n; i++) {
    const b = document.createElement('button');
    b.className = 'candy';
    b.dataset.i = i;
    b.dataset.pal = i % 4;
    b.setAttribute('aria-label', '糖果' + (i + 1));
    b.innerHTML = candySvg(i % 4, 64);
    candyTrayEl.appendChild(b);
  }
}
function updateBadge(el, n, p) {
  const bd = el.querySelector('.badge');
  if (n > 0) {
    bd.textContent = n;
    bd.classList.remove('on'); void bd.offsetWidth; bd.classList.add('on');
  }
  const pile = el.querySelector('.pile');
  let html = '';
  for (let k = 0; k < n; k++) {
    html += '<i style="background:' + CANDY_PAL[(p + k) % 4].body + '"></i>';
  }
  pile.innerHTML = html;
}
function renderPlates(q) {
  plateRowEl.innerHTML = '';
  for (let p = 0; p < q.m; p++) {
    const d = document.createElement('div');
    d.className = 'plate';
    d.dataset.p = p;
    d.setAttribute('aria-label', '盘子' + (p + 1));
    d.innerHTML = '<span class="face">' + faceSvg(ANIMALS[p % 4]) + '</span>' +
      '<span class="dish">' + dishSvg(124) + '</span>' +
      '<span class="pile"></span><span class="badge"></span>';
    plateRowEl.appendChild(d);
    if (q._given[p] > 0) updateBadge(d, q._given[p], p);   // 重渲染还原已放状态
  }
  renderTurn();
}
/* 轮到的盘子呼吸高亮（deal 期常驻；ask 期清除） */
function renderTurn() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  plateRowEl.querySelectorAll('.plate').forEach(el => el.classList.remove('turn'));
  if (q._phase === 'deal') {
    const el = plateEls(engCurPlate(q));
    if (el) el.classList.add('turn');
  }
}
function optBtn(t, i) {
  const b = document.createElement('button');
  b.className = 'opt';
  b.dataset.i = i;
  b.textContent = t;
  b.setAttribute('aria-label', '选 ' + t);
  return b;
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
function speakQuiz(q) { if (q) sayQ(quizParts(q), qSpeech(q)); }
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 题面 5 段，
   queue 单通道顺序播（clip 段 onended 接力，禁双通道叠音） */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key].concat(quizParts(q)));
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip(q);
  renderCandies(q);
  renderPlates(q);
  renderDealcount(q);
  answersEl.innerHTML = '<div id="deal-tip">' + ICONS.hand + '<span>一颗一颗点糖果，轮着分</span></div>';
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) sayQ(quizParts(q), qSpeech(q));  /* 换题读题 sayR 级不受 flat 门（审查 m7：三款统一，不识字依赖听题） */
}

/* ================= 飞行动画：点糖→克隆糖 fixed 飞到盘 → 到达后角标+糖堆+盘弹跳 ================= */
function flyCandy(fromEl, plateIdx, q) {
  const plate = plateEls(plateIdx);
  if (!plate) return;
  const a = fromEl.getBoundingClientRect(), b = plate.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'fly-candy';
  f.innerHTML = candySvg(Number(fromEl.dataset.pal) || 0, 56);
  f.style.left = (a.left + a.width / 2 - 28) + 'px';
  f.style.top = (a.top + a.height / 2 - 28) + 'px';
  document.body.appendChild(f);
  const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
  const dy = (b.top + b.height * 0.5) - (a.top + a.height / 2);
  requestAnimationFrame(() => {
    f.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.55) rotate(14deg)';
    f.style.opacity = '0';
  });
  setTimeout(() => {
    f.remove();
    updateBadge(plate, q._given[plateIdx], plateIdx);
    plate.classList.remove('land'); void plate.offsetWidth; plate.classList.add('land');
    sfx('pop');
  }, 460 * SPEED);
}

/* ================= 发放主路径（真实点击 / DV.tapCandy / autoSolve / 教学演示共用） ================= */
function uiTapCandy(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (q._phase !== 'deal') {                     // ask 期点余数糖：摆动+节流余数提示（零惩罚轻反馈）
    const el = (typeof i === 'number' && i >= 0 && i < q.n && !q._flown[i]) ? candyEl(i) : null;
    if (el) {
      el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig');
      flapLo();
      if (q.rem > 0 && Date.now() - lastRemHint > 10000) {
        lastRemHint = Date.now();
        sayR(remPart(q).key, remPart(q).text);
      }
    }
    return false;
  }
  const r = engTapCandy(cur, i);
  if (r === null) return false;
  if (r === 0) return 0;                         // 已发走的糖（真实 DOM 不可达；钩子防御）
  lastAct = Date.now();                          // 发放成功=正确推进，重置救援钟（§0.7a）
  const run = cur;
  const el = candyEl(i);
  const plateIdx = (r - 1) % q.m;                // 本颗糖落盘（发放序号 r：0 基盘子轮转）
  if (el) {
    el.classList.remove('breathe', 'wig');
    el.classList.add('gone');
    flyCandy(el, plateIdx, q);
  }
  candyHi();
  renderDealcount(q);
  if (q._phase === 'ask') {                      // 发放完毕：延迟亮答案卡（飞完最后一颗的节奏）
    setTimeout(() => {
      if (cur === run && cur.quizzes[cur.step] === q && q._phase === 'ask' && !q.solved) showAsk(q);
    }, 620 * SPEED);
  } else {
    renderTurn();                                // 轮到的盘子高亮切换
    if (state.tut === 'help') pointHelpNext();   // "帮"：跟着发放节奏指向下一颗
  }
  return r;
}
/* ask 答问期亮卡：余数糖降饱和留桌上 + 余数句（无 flat 门，关键教学）→ 问句（flat<3） */
function showAsk(q) {
  renderTurn();
  for (let i = 0; i < q.n; i++) {
    if (!q._flown[i]) {
      const el = candyEl(i);
      if (el) el.classList.add('leftover');
    }
  }
  renderDealcount(q);
  answersEl.innerHTML = '';
  q.items.forEach((v, i) => answersEl.appendChild(optBtn(v, i)));
  const parts = q.rem > 0 ? [remPart(q)] : [];
  if (cur && cur.flat < 3) parts.push({ key: VOICE.q3.key, text: VOICE.q3.text });
  if (parts.length === 1) KIDS.voice.play(parts[0].key, parts[0].text);
  else if (parts.length === 2) KIDS.voice.queue(parts);
}

/* ================= 答题主路径（真实点击 / DV.tapAnswer / autoSolve 共用） ================= */
async function uiPick(i, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗口内重玩会重建 cur（M3） */
  const r = engPick(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';             /* 发放期点答案卡：防御层早退零惩罚（§0.7） */
  const el = optEl(i);
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                        /* 仅正确推进重置救援钟（§0.7a） */
    if (state.tut === 'help') {                  // 教学"独"：首次答对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    if (el) {
      el.classList.remove('breathe', 'wrong');
      el.classList.add('right');
      const m = document.createElement('span');
      m.className = 'mark';
      m.innerHTML = ICONS.check;
      el.appendChild(m);
    }
    const qm = document.querySelector('#formula .qm');   // ch4 黑板 ? → 答案亮绿
    if (qm) { qm.textContent = q.answer + (q.rem ? '……' + q.rem : ''); qm.classList.add('ok'); }  /* 余数题定格 7÷2=3……1（审查 m8：二年级规范写法） */
    sfx('coin');
    await wait(880 * SPEED);
    if (cur !== run) return r;                   /* 演出窗内重玩已重建关卡：丢弃旧续体 */
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                       // 答错：晃动不灰掉可重点（不灰化款 SPEC §1）
    if (el) { el.classList.remove('wrong', 'breathe'); void el.offsetWidth; el.classList.add('wrong'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);   /* flat<3 每错必播 / flat≥3 节流+豁免恰一次（===2） */
    if (q.miss >= 2) {                           /* 首错不 pulse：连错 2 次才高亮正确卡 */
      const ok = optEl(q.answerIdx);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    if (state.tut === 'help') pointHelpNext();
    await wait(520 * SPEED);
  }
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
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
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
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.divide && sv.divide.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5） */
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
/* 教学"帮"阶段指向：发放期=下一颗没发的糖；ask 期=正确答案卡（手口一致引导） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q._phase === 'deal') {
    let i = 0;
    while (i < q.n && q._flown[i]) i++;
    if (i < q.n) pointGhostAt(candyEl(i), 'tut');
  } else {
    pointGhostAt(optEl(q.answerIdx), 'tut');
  }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示轮流发放（前 2 颗完整手指演示看懂轮流，其余原地快放控时长）
   →演示选对答案 → 重发同关 → 帮=指向下一颗糖/正确卡；独=首次答对放手
   save.divide.tutSeen 记住演示已放过（§0.6） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const total = q.n - q.rem;
  for (let i = 0; i < total; i++) {
    const el = candyEl(i);
    if (i < 2) {                                 // 前 2 颗：手指移动+按压+放飞（轮流语义看清）
      pointGhostAt(el, 'tut');
      await wait(750 * SPEED);
      ghost.press();
      await wait(260 * SPEED);
      uiTapCandy(i, true);
      await wait(520 * SPEED);
    } else {                                     // 其余：手指原地快放（时长控制）
      if (el) ghost.press();
      await wait(140 * SPEED);
      uiTapCandy(i, true);
      await wait(330 * SPEED);
    }
  }
  await wait(650 * SPEED);                       // 等 ask 亮卡
  pointGhostAt(optEl(q.answerIdx), 'tut');
  await wait(800 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false;                            // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  await uiPick(q.answerIdx, true);
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.divide = sv.divide || {};
    sv.divide.tutSeen = true;
    KIDS.store.persist();
  }
  /* 立即重发同关（确定性关卡，题面一致），"你来分一分"在重发后的题面上说（照 batch5-11） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip → 题面 5 段（§0.6）
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默（§0.16） */
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
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 对齐重玩门/题面防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整句重读（queue 拼接） */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.candy');
  if (c) {                                       // 糖果：主发放路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapCandy(Number(c.dataset.i));
    return;
  }
  if (e.target.closest('.opt')) {
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiPick(Number(e.target.closest('.opt').dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip') || e.target.closest('#dealcount')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（重读题面+答案视觉 §0.21）/ 教学"帮"5s 重演示一次
   发放期救援=轮到的盘子（常驻呼吸）+下一颗糖双 breathe；答问期=正确卡 breathe ================ */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];
    if (q) {
      speakQuiz(q);                              // 救援=重读题面（queue 拼接，§0.21）
      if (q._phase === 'deal') {
        renderTurn();                            // 轮到的盘子高亮刷新（呼吸常驻）
        let i = 0;
        while (i < q.n && q._flown[i]) i++;
        const el = i < q.n ? candyEl(i) : null;  // 下一颗糖 breathe（发放时移除）
        if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
      } else {
        const ok = optEl(q.answerIdx);           // 答问期：正确卡 breathe 持续循环在屏
        if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
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
  KIDS.init({ game: 'divide', title: '除法分糖' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（审查 m6：lim%5==0 时跳章） */ });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.DV = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { total: q.n, plates: q.m, cur: engCurPlate(q),          /* SPEC §1 钩子契约 */
      given: q._given.slice(), left: q._left, phase: q._phase,
      options: q.items.slice(), answerIdx: q.answerIdx, answer: q.answer,
      rem: q.rem, step: cur.step, miss: q.miss };
  },
  tapCandy(i) { return uiTapCandy(i); },
  tapAnswer(i) { return uiPick(i); },
  async autoSolve() {                            // UI 路径自动答完当前关（发放+答问两段走真实流程）
    let n = 0;
    while (cur && !cur.done && n++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      let g = 0;
      while (q._phase === 'deal' && g++ < 16) {  // 发放：逐颗点未发的糖
        let i = 0;
        while (i < q.n && q._flown[i]) i++;
        if (i >= q.n) break;
        uiTapCandy(i);
        await wait(30);
      }
      await wait(720 * SPEED);                   // 等 ask 亮卡（620*SPEED 延迟窗口）
      if (q._phase === 'ask' && !q.solved) await uiPick(q.answerIdx);
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; }
};
