/* ================= shapeshome 主逻辑（r8 三题型：三维家卡 / 否定徽章家卡 / 九宫格 + 图形卡点选 / 飞入 / 教学 / 推进 / 救援钟）
   玩法：ch1 三维——家=色+形+大小，点与家三维全同的图形卡（干扰恰差一维）；
   ch2 否定——家卡屋顶两枚划掉徽章（禁色✗/禁形✗）+语音「不是X色也不是Y形」，点唯一满足否定条件的卡；
   ch3 九宫格——行恒形/列恒色推缺格?，从三卡补缺；ch4 混排 hard；生成关随机章。
   答对=图形飞进家（grid=飞进缺格）+家亮灯；答错=晃动+灰掉（灰化款 miss 封顶 2）。
   验收钩子：window.SP = { get currentLevel, get quiz, tapCard(i), autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
/* verify 页 KIDS.audio.sfx 已被 stub 为空函数（game-verify.js），此处直通便于测试注入记录 */
const sfx = n => { KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/重播不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force=miss≥2 豁免（灰化款恰两干扰全灰、
   pulse 已亮真卡住时刻，语音与高亮同步——SPEC §0.5 灰化款口径 q._miss >= 2） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const homeEl = $id('home'), cardsEl = $id('cards'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白/探索点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重听题面 3s 节流（防连点轰炸）
let qTimer = null;                              // 开场/教学交接顺序链接力（§0.6 禁叠音）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardsEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 题面语音（读题 sayR 级不受 flat 门；r8 三题型题面句全 clip 化，缺 clip TTS 兜底） */
function qSpeak(q) {
  if (q) KIDS.voice.play(qKeyOf(q), quizSpeech(q));
}
/* 开场顺序链（§0.6 禁叠音）：queue 按 clip 实际时长 onended 接力——r8 规则句变长（~20 码点），
   固定延时窗会截断，改 core queue 链（hint → [章 2/3/4 首关规则句] → 题面句） */
function openingSpeak() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearTimeout(qTimer);
  const parts = [{ key: VOICE.hint.key, text: VOICE.hint.text }];
  /* 章 2/3/4 首关规则句（规则切换预告纯文字孩子读不到，语音预告直达——r8 新章新键） */
  const rule = cur.flat === 5 ? RULES.neg : cur.flat === 10 ? RULES.grid : cur.flat === 15 ? RULES.mix : null;
  if (rule) parts.push({ key: rule.key, text: rule.text });
  parts.push({ key: qKeyOf(q), text: quizSpeech(q) });
  KIDS.voice.queue(parts);
}

/* ================= 渲染 ================= */
function renderQuestion(q) {                    // 题面区：tri=三维家卡 / neg=否定徽章家卡 / grid=九宫格
  homeEl.classList.remove('lit');
  homeEl.setAttribute('aria-label', q.kind === 'grid' ? '找规律的格子，点我听题目' : '图形的家，点我听题目');
  homeEl.innerHTML = q.kind === 'tri' ? homeSvg(q) : q.kind === 'neg' ? negSvg(q) : gridHtml(q);
}
function renderCards(q) {
  cardsEl.innerHTML = '';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.i = i;
    b.dataset.c = o.c;
    b.dataset.s = o.s;
    if (o.z) b.dataset.z = o.z;
    const label = (o.z ? COLORS[o.c].name + SIZES[o.z].name : COLORS[o.c].name) + SHAPES[o.s].name + '图形';
    b.setAttribute('aria-label', label);
    b.innerHTML = shapeSvg(o.s, COLORS[o.c].hex, o.z ? SIZES[o.z].scale : 1);
    if (q._dead && q._dead[i]) b.classList.add('wrong');   // 重渲染不丢已灰状态
    cardsEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderQuestion(q);
  renderCards(q);
  renderStep();
  if (!state.demo && !state.quiet) qSpeak(q);     // 开题读题；quiet=开场/教学交接走顺序链
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

/* ================= 答对飞进家 + 家亮灯（tri/neg=山墙圆窗 / grid=缺格格子填入） ================= */
function flyToHome(el, q) {
  const o = q.options[q.answerIdx];
  const r1 = (el || cardsEl).getBoundingClientRect();
  const tgt = q.kind === 'grid' ? homeEl.querySelector('.gmiss') : homeEl.querySelector('.gwin');
  const r2 = tgt ? tgt.getBoundingClientRect() : homeEl.getBoundingClientRect();
  const fl = document.createElement('div');
  fl.className = 'flyer';
  fl.innerHTML = shapeSvg(o.s, COLORS[o.c].hex, o.z ? SIZES[o.z].scale : 1);
  fl.style.left = Math.round(r1.left + r1.width / 2 - 46) + 'px';
  fl.style.top = Math.round(r1.top + r1.height / 2 - 46) + 'px';
  fl.style.transition = 'transform ' + (0.62 * SPEED).toFixed(3) + 's cubic-bezier(.5,.05,.6,1)';
  document.body.appendChild(fl);
  const dx = Math.round(r2.left + r2.width / 2 - (r1.left + r1.width / 2));
  const dy = Math.round(r2.top + r2.height / 2 - (r1.top + r1.height / 2));
  requestAnimationFrame(() => { requestAnimationFrame(() => {
    fl.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.58)';
  }); });
  setTimeout(() => {                               // 到家：飞行物收起 + 家亮灯 + 轻亮音
    fl.remove();
    homeEl.classList.add('lit');
    if (q.kind === 'grid' && tgt) {                // 缺格填入：? 换成补上的图形
      tgt.classList.add('filled');
      tgt.innerHTML = shapeSvg(o.s, COLORS[o.c].hex);
    }
    sfx('ok');
  }, 640 * SPEED);
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
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('pulse'); void el.offsetWidth;
  el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：当前题正确卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = q.answerIdx;
  if (i >= 0) pointGhostAt(cardEl(i));
}
function wigEl(el) {
  if (!el) return;
  el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig');
}

/* ================= 答题主路径（真实点击 / SP.tapCard / autoSolve 共用） ================= */
async function uiPick(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked 门） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || i < 0 || i >= q.options.length) return false;
  const run = cur;                              /* 演出窗口内点重玩会重建 cur——身份守卫防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  const el = cardEl(i);

  if (r === 'wrong') {                          /* 送错：晃动+灰掉可重点（零惩罚）；首错不 pulse 正确卡 */
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('wrong'); }
    sfx('fail');
    sayW(wrongKeyOf(q), wrongSpeech(q), q._miss >= 2);     /* T46 阶段2：shp_wrong 族整句 clip；flat<3 每错必播 / flat≥3 10s 节流+miss≥2 豁免 */
    if (q._miss >= 2) {                         /* 连错 2 次才高亮正确卡 */
      const ok = cardEl(q.answerIdx);
      if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    }
    await wait(420 * SPEED);
    return 'wrong';
  }
  if (r === 'again') return 'again';            /* 已灰选项：早退零惩罚不计数（防御层） */

  /* ---- 送对 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) {
    el.classList.add('right');
    el.classList.remove('pulse', 'breathe');
    const m = document.createElement('span');
    m.className = 'mark';
    m.innerHTML = ICONS.check;
    el.appendChild(m);
  }
  flyToHome(el, q);                             /* 图形飞进家（grid=飞进缺格） → 家亮灯 */
  sfx('coin');
  if (r === 'done') hopRabbit();
  await wait(980 * SPEED);
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡，丢弃旧续体 */
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = Math.max(0, (flat == null ? cur.flat : flat) | 0);
  /* r7 审查 M1 同型：静态段（含 f=19 末章章末）预告=CHAPTERS[floor(f/CH_LEN)+1]（f≡4 mod 5 时 floor 不进位）；
     家族契约 F：生成关段（f≥20）预告禁 (ci+1)%4 字面——实算 genLevel(f+1).dch 取 GEN_HINTS（预告与下一关真实章一致） */
  if (f < STATIC_LEVELS) return CHAPTERS[Math.floor(f / CH_LEN) + 1].hint;
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：dayEnd 预告传 nextHint(lim - 1) */
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
  clearTimeout(qTimer);
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.shp && sv.shp.tutSeen);
  if (VERIFY) { if (!freshTut) openingSpeak(); return; }   /* verify 页 stub 记录开场链（教学链单元另行直驱） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；hint 不切断题面） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示送对第一题（卡绿勾→图形飞进家→家亮灯，locked 吞输入）→
   重发同关（确定性关卡，题面一致）；帮=指向正确卡；独=首次答对放手。
   交接顺序链（§0.6）：turn clip（~1.9s）→ 题面 TTS 接力（题面无 clip，queue 不可用） */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = q.answerIdx;
  pointGhostAt(cardEl(idx));
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示一次完整送对演出
  state.locked = false;                         /* 时序锚点（batch9 审查 m6）：吞输入依赖 uiPick 正确路径
     在首个 await 前同步重设 locked=true——禁在 uiPick 的 gate 与 locked=true 之间插入 await */
  state.quiet = true;                           // 演示送对的换题渲染不插播下一题指令
  await uiPick(idx, true);
  const sv = KIDS._save() || { levels: {} };       // 空档兜底（姊妹款同口径）
  sv.shp = sv.shp || {};
  sv.shp.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来送一送"在重发后的题面上说（照 batch5-9） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  KIDS.voice.play(VOICE.turn.key, VOICE.turn.text);   /* turn clip → 1.9s 后题面 TTS 接力 */
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { if (state.tut === 'help' && cur && !cur.done) qSpeak(cur.quizzes[0]); }, 1900 * SPEED);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重听题面（听按钮/家卡共用）：sayR 不受 flat 门；3s 节流防连点轰炸（force=测试钩子直通） */
function replaySpeech(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  qSpeak(q);
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) {   /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默（试玩 P2①） */
    sfx('pop');
    hopRabbit();
    return;
  }
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 对齐重玩门 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  replaySpeech(false);
});
/* 题面区（家卡/九宫格）：点击=重听题面（视觉锚点最直觉）；教学/演出期给轻反馈不重读 */
homeEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { wigEl(homeEl); sfx('pop'); return; }
  lastAct = Date.now();
  wigEl(homeEl);
  replaySpeech(false);
});
/* 图形卡：吞输入期（locked/demo）真实点击被吞 → 轻叮 pop + 轻摆（§0.22），状态不变；
   舞台级监听（姊妹款同口径）：卡区/题面区以外的舞台留白也给轻反馈（§0.16） */
const stageEl = $id('stage');
stageEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.card');
  if (el) {
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) {
      sfx('pop');
      wigEl(el);
      return;
    }
    uiPick(Number(el.dataset.i));
    return;
  }
  if (e.target.closest('#home')) return;         // 题面区走自己的 handler
  e.preventDefault();                           /* 舞台空白/探索点击：10s 节流轻提示（§0.16） */
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22，试玩 P2①） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（5.5 岁等待极限 15s 内）/ 教学"帮"5s 重演示一次
   救援=重读题面 + 正确卡 breathe 循环在屏（§0.21 高亮类，静音环境屏幕可感知）；
   只有本看护与正确推进写 lastAct（错点/探索点击不重置 §0.7a） ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];
    if (q) {
      qSpeak(q);                                /* 重读题面（不受 flat 门，§0.5） */
      const ok = cardEl(q.answerIdx);           /* 正确卡 breathe 持续循环（救援视觉重现） */
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
  KIDS.init({ game: 'shapeshome', title: '形状分家' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    /* r7 审查 M2 同型（家族契约 A）：启动 dayEnd 传 nextHint(lim - 1)（lim 为章边界时会多前进一章） */
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.SP = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const head = q.kind === 'tri' ? { kind: 'tri', tc: q.tc, ts: q.ts, tz: q.tz }
      : q.kind === 'neg' ? { kind: 'neg', nc: q.nc, ns: q.ns }
      : { kind: 'grid', rows: q.rows.slice(), cols: q.cols.slice(), miss: { r: q.miss.r, c: q.miss.c } };
    return Object.assign(head, {
      options: q.options.map(o => ({ c: o.c, s: o.s, z: o.z || null })),
      answerIdx: q.answerIdx, step: cur.step,
      missCount: q._miss || 0,                    /* 本题错点数（grid 题的 miss=缺格位置，两键分离 r8） */
      dead: q.options.map((o, i) => !!(q._dead && q._dead[i])) });
  },
  tapCard(i) { return uiPick(i); },
  replay() { return replaySpeech(true); },      /* 测试钩子：无视节流直通重播 */
  async autoSolve() {                           // UI 路径自动送完当前关（每题送正确卡，走真实流程）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = q.answerIdx;
      if (i < 0) break;
      const r = await uiPick(i);
      if (r === false || r === null || r === 'again' || r === 'wrong') break;
      taps++;
      await wait(60);
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
