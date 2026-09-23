/* ================= senses 主逻辑（r11 四族：题面大图+图卡渲染 / 点选·勾选·提交判定 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH32 §6 r11）：题型四族——find（findsense 物品大图+名音+sen_q1→点感官卡 /
   findthing 感官大图+名音+sen_q2→点物品卡，恒 4 候选）；multi（多感官物大图+名音+sen_q3
   「都用什么呢，找全哦」→5 感官卡全选恰 3，勾选 .held+绿勾提交制，漏选/多选都错=wrong
   清空重选）；anti（打叉感官小人大图+「哪个不是用 S 的呀」→4 物品卡选唯一不相关——抑制式）；
   comp（多感官物大图+捂住徽章（感官小人+否决圈）+「捂住了 S，还能用什么呀」→4 感官卡选唯一
   可用真值——失能代偿）。
   开题链全 clip 无 keyless（multi=名音+q3 / anti=qNot+感官名音+qNot2 / comp=名音+qCov1+
   感官名音+qCov2——契约 N 天然安全）；点对=sen_right+答案名音拼播（multi=sen_right+3 感官
   名音逐段）；点错=卡摇头+错链三段（错链头 clip→题面名音 clip 回锚→方向级语义句 TTS keyless
   恒链尾）+题面大图再 pulse 方向级回锚，1000ms 防重入窗后可重选（探索不罚）；
   miss≥2=正确卡 breathe（multi=全部真值卡，答案级家族梯度）。
   错链豁免窗 9500 ≥ 最长 anti 链 1656+150+1440+150+estMs(14)+300=9126（契约 I，真时钟）；
   判对演出窗 1600+3000（单选族）/1600+5800（multi 确认链 right+3×(150+感官名音 max 1440)
   +300=7326——家族 G/H）。
   救援：14s 方向级=重读题面+大图 pulse（lastDir 独立节流锚）；30s 答案级=正确卡 breathe+重读题面。
   验收钩子：window.SE = { get currentLevel, get quiz(){kind, ask, opts[]{anim}, answer,
   answers[]·picked[]（multi）, blocked（comp）, step, miss}, tapOpt(i), tapSubmit(),
   start(flat), async autoSolve(), get tutorial }（getter 返回拷贝；真实页同暴露——b29 坑⑥） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = n => n * 345 + 600;              // b25 定版：SAPI ~345ms/字 + 600 落定余量（入参=字符数）
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      submitBtn = $id('btn-submit'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  submitBtn.innerHTML = ICONS.check;
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（开题链=名音/题面句 clip 拼播，全 clip 无 keyless——契约 N 安全；
   读题异步不占 UI 等待窗。链实长（§4/_clipdur32）：
   findsense max 1872+150+1560=3582 / findthing max 1440+150+1824=3414 /
   multi max 1560+150+2664=4374 / anti 1776+150+1440+150+1248=4764 /
   comp max 1560+150+1512+150+1440+150+1992=6954 ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'findsense') KIDS.voice.queue([nameClip(q.ask), VOICE.q1.key]);
  else if (q.kind === 'findthing') KIDS.voice.queue([nameClip(q.ask), VOICE.q2.key]);
  else if (q.kind === 'multi') KIDS.voice.queue([nameClip(q.ask), VOICE.q3.key]);
  else if (q.kind === 'anti') KIDS.voice.queue([VOICE.qNot.key, nameClip(q.ask), VOICE.qNot2.key]);
  else KIDS.voice.queue([nameClip(q.ask), VOICE.qCov1.key, nameClip(q.blocked), VOICE.qCov2.key]);
}
/* 重听路径（hear/题面共用）：重播开题链+大图再 pulse（方向级回锚） */
function replayQuiz(withPulse) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  speakQuiz();
  if (withPulse) pulseAsk();
}
/* 方向级回锚：题面大图再 pulse（错反馈/重听/救援共用——各族题面大图） */
function pulseAsk() {
  if (sceneEl) replayAnim(sceneEl, 'pulse');
}

/* ================= 渲染 ================= */
const qText = q => q.kind === 'findsense' ? VOICE.q1.text :
  q.kind === 'findthing' ? VOICE.q2.text :
  q.kind === 'multi' ? VOICE.q3.text :
  q.kind === 'anti' ? VOICE.qNot.text + nameOf(q.ask) + VOICE.qNot2.text :
  VOICE.qCov1.text + nameOf(q.blocked) + '，' + VOICE.qCov2.text;
function renderScene(q) {                        // 题面：暖色侦察垫 + 大图 + 题面句
  sceneEl.dataset.kind = q.kind;                 // 帧内容锚（契约 M：verify 断言）
  sceneEl.dataset.ask = q.ask;
  if (q.kind === 'comp') sceneEl.dataset.blocked = q.blocked;
  else sceneEl.removeAttribute('data-blocked');
  const aria = q.kind === 'comp'
    ? nameOf(q.ask) + '，捂住了' + nameOf(q.blocked) + '，点我再听一遍'
    : nameOf(q.ask) + '，点我再听一遍';
  sceneEl.setAttribute('aria-label', aria);
  let slot = '<div class="ask-slot"><div class="ask-shadow" aria-hidden="true"></div>' +
    animSvg(q.ask, 150);
  if (q.kind === 'anti') slot += '<div class="not-ring" aria-hidden="true"></div>';   // 打叉感官小人（否决圈）
  if (q.kind === 'comp') slot += '<div class="cov-badge" aria-hidden="true">' +       // 捂住徽章：感官小人+否决圈
    '<div class="cov-ic">' + animSvg(q.blocked, 40) + '</div>' + noMarkSvg(76) + '</div>';
  slot += '</div>';
  sceneEl.innerHTML = slot + '<div class="q-text">' + qText(q) + '</div>';
}
function renderBoard(q) {                        // 候选图卡排（SVG 零文字；multi=5 感官卡收紧+提交钮）
  boardEl.innerHTML = '';
  boardEl.classList.toggle('w5', q.kind === 'multi');
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.anim = o.anim;                     // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', nameOf(o.anim) + (q.kind === 'multi' ? '卡，点一下选它' : '图卡'));
    b.innerHTML = animSvg(o.anim, q.kind === 'multi' ? 84 : 104) + '<i class="tick" aria-hidden="true"></i>';
    b.style.animationDelay = (i * 70) + 'ms';
    boardEl.appendChild(b);
  });
  submitBtn.classList.toggle('hidden', q.kind !== 'multi');
  updateSubmitState();
}
/* multi 提交钮状态：勾数==真值数 → .ready 呼吸（计数驱动不泄答案——哪些卡不泄） */
function updateSubmitState() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.kind !== 'multi') return;
  submitBtn.classList.toggle('ready', q.picked.length === q.answers.length && q.picked.length > 0);
  submitBtn.classList.toggle('armed', q.picked.length > 0);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 开题读题（教学演示期静默）
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
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 答对演出：大图跳 + 小兔子滑入示范（确认句拼播由判定路径播）
   verify 页跳过装饰直接落定 ================= */
function celebrateScene(run) {
  const slot = sceneEl.querySelector('.ask-slot');
  if (slot) replayAnim(slot, 'jump');
  if (!sceneEl.querySelector('.demo-pet')) {
    const pet = document.createElement('div');
    pet.className = 'demo-pet';
    pet.innerHTML = KIDS.assets.rabbit('happy', 54);   /* 小兔子开心示范 */
    sceneEl.appendChild(pet);
    requestAnimationFrame(() => pet.classList.add('show'));
  }
  hopRabbit();
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
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：当前题正确卡（multi 非教学内容不指——q0 恒 findsense） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 错反馈（四族共用骨架）：错链三段+方向级回锚+miss≥2 答案级梯度
   链构成（T46 阶段2 语义句尾段 clip 化——实长口径，§4/_clipdur32+T46 六键 ffprobe）：
   findsense 1656+150+物品名音max1872+150+again_sense 2640+300=7768
   / findthing 1656+150+感官名音max1440+150+again_thing 2184+300=6870
   / multi 1824+150+名音max1560+150+again_multi 2976+300=6960
   / anti（最长，5 段拼播）=1656+150+1440+150+anti_base 2880+150+名音1440+150+anti_tail 1248+300=9564
   / comp 1656+150+1440+150+again_cov 3264+300=6960
   ——豁免窗 9800 ≥ 全族链+余量（r11 9500→T46 9800：anti 拆三段后链超旧窗 64ms；契约 I。
   T46 后全链 clip 键段无 keyless——契约 N 天然合规） ================= */
function wrongParts(q) {
  if (q.kind === 'multi') return [VOICE.mw.key, nameClip(q.ask),
    { key: 'sen_again_multi', text: MULTI_AGAIN }];
  if (q.kind === 'anti') return [VOICE.wrong.key, nameClip(q.ask),
    { key: 'sen_anti_base', text: ANTI_BASE }, nameClip(q.ask),
    { key: 'sen_anti_tail', text: ANTI_TAIL }];
  if (q.kind === 'comp') return [VOICE.wrong.key, nameClip(q.blocked),
    { key: 'sen_again_cov', text: COV_AGAIN }];
  return [VOICE.wrong.key, nameClip(q.ask),
    { key: q.kind === 'findsense' ? 'sen_again_sense' : 'sen_again_thing',
      text: q.kind === 'findsense' ? SENSE_AGAIN : THING_AGAIN }];
}
async function wrongFlow(q, run, el) {
  state.locked = true;
  if (el) replayAnim(el, 'wig');
  dodgeLo();
  if (sayW(wrongParts(q)))
    wrongChainUntil = Date.now() + 9800;         /* 链豁免：≥最长 anti 链 9564+余量（T46 拆段后 9500→9800，契约 I） */
  pulseAsk();                                    /* 方向级：题面大图再 pulse（不泄答案） */
  if (q._miss >= 2) {                            /* miss≥2=正确卡 breathe（答案级，家族梯度） */
    if (q.kind === 'multi') for (const j of q.answers) { const ok = cardEl(j); if (ok) replayAnim(ok, 'breathe'); }
    else { const ok = cardEl(q.answer); if (ok) replayAnim(ok, 'breathe'); }
  }
  await wait(1000 * SPEED);                      /* 错点防重入窗 1000ms；对选可打断链；救援由豁免窗让路 */
  if (cur !== run) return;
  state.locked = false;
}
/* ================= 答对推进（单选 tapOpt / multi tapSubmit 共用）：
   确认链=sen_right+答案名音（multi=+3 感官名音逐段，全 clip 无 keyless——契约 N）；
   演出窗 1600+3000（单选族 ≥2256+150+1872+300=4578）/ 1600+5800（multi ≥2256+3×1590+300=7326） ================= */
async function rightFlow(q, run, r, litEls) {
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  litEls.forEach(e2 => { if (e2) { e2.classList.remove('breathe'); e2.classList.add('lit'); } });
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateScene(run);          /* 大图跳 + 小兔子滑入示范 */
  const chain = [VOICE.right.key].concat(q.kind === 'multi'
    ? q.answers.map(j => nameClip(q.opts[j].anim))
    : [nameClip(q.opts[q.answer].anim)]);
  KIDS.voice.queue(chain);
  await wait(1600 * SPEED);                      /* 大图跳+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait((q.kind === 'multi' ? 5800 : 3000) * SPEED);   /* 确认链收尾窗（家族 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（大图/卡全换）+读题 */
  return r;
}

/* ================= 点卡主路径（真实点击 / SE.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错防重入窗/判对演出窗共用 locked 门；错点 1000ms 防重入窗（b16 定案）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  /* b31 家族 I 补口径（2026-09-11）：错链豁免窗（真时钟）内错点吞——对选放行；multi 勾选是
     中性动作（判定在 tapSubmit）不吞，豁免窗守卫挂在 uiSubmit（窗内提交吞 pop+bump） */
  if (!demo && q.kind !== 'multi' && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump
  const el = cardEl(i);

  if (q.kind === 'multi') {                      /* pick/unpick：勾选徽章+提交钮状态（零惩罚） */
    lastAct = Date.now();
    if (el) el.classList.toggle('held', r === 'pick');
    sfx('pop');
    updateSubmitState();
    return r;
  }

  if (r === 'wrong') {                           /* 答错：摇头+错链三段+大图 pulse */
    await wrongFlow(q, run, el);
    return r;
  }

  /* ---- right·done（本题完成：大图跳+兔子示范+确认句拼播） ---- */
  return rightFlow(q, run, r, [el]);
}

/* ================= multi 提交主路径（真实点击 / SE.tapSubmit / autoSolve 共用）
   空选不判（防误触计 miss——探索不罚）；豁免窗内吞；漏选/多选=wrong 清空重选 ================= */
async function uiSubmit() {
  if (!cur || state.won || state.locked || state.demo) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.kind !== 'multi') return false;
  if (wrongChainUntil && Date.now() < wrongChainUntil) {   /* 契约 I：链播完前不重复判（pop+bump 吞） */
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  if (!q.picked.length) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }   // 空选不判
  const run = cur;
  const r = engSubmit(cur);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }

  if (r === 'wrong') {                           /* 漏选/多选：清空重选（错链+清 held，不指认错卡） */
    boardEl.querySelectorAll('.card.held').forEach(c => c.classList.remove('held'));
    updateSubmitState();
    await wrongFlow(q, run, null);
    return r;
  }
  const litEls = q.answers.map(j => cardEl(j));
  return rightFlow(q, run, r, litEls);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F/M1：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* sen_right：点对啦，真棒（2256ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2256+300=2556 */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null)（b25 形态定版） */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.senses && sv.senses.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=播 sen_tut_watch「看！用什么呢」→ 播闹钟名音+题面句（开题链）→ 幽灵手指点
   耳朵小人图卡 →点中（确认链拼播）→帮=指向正确卡；独=首次选对放手（watch 全程 ≤16s）
   时序（家族 G/H）：watch clip 2592ms → 开题链演示延至 t=3000（≥2592+300=2892，禁与名音撞头）；
   开题链 sen_n_bell 1824+150+sen_q1 1560=3534，ghost 移入窗 3900 ≥ 3534+300=3834；
   演出窗 1600+3000 罩确认链 2256+150+1872+300=4578 ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* sen_tut_watch：看！用什么呢（2592ms） */
  const run = cur;
  await wait(3000 * SPEED);                      /* t=3000 ≥ 2592+300=2892：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 findsense/bell（教学演示锚）
  KIDS.voice.queue([nameClip(q.ask), VOICE.q1.key]);   /* 播开题链：闹钟响响+用什么呢（3534ms） */
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));                     /* 幽灵手指指向耳朵小人图卡 */
  await wait(3900 * SPEED);                      /* ≥3534+300=3834：开题链播完+ghost 移入停顿 */
  if (cur !== run) return;
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__seDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  await wait(300 * SPEED);                       /* 收尾（确认链仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.senses = sv.senses || {};
  sv.senses.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来点一点"在重发后的题面上说（照 batch5-31） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* sen_tut_turn：你来点一点（1824ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2150);                                      /* ≥1824+300=2124 防尾截（turn 后读题延） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再想一想 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  replayQuiz(false);                             /* 再听一遍：名音+题面句重播 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'pulse');
  replayQuiz(true);                              /* 附大图再 pulse（方向级回锚） */
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapOpt(Number(p.dataset.i));
});
submitBtn.addEventListener('pointerdown', e => { /* 提交钮（multi 判定步） */
  e.preventDefault();
  uiSubmit();
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene') || e.target.closest('#btn-submit')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+大图 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe；multi=全部真值卡）/
   教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      if (q.kind === 'multi') { for (const j of q.answers) { const ok = cardEl(j); if (ok) replayAnim(ok, 'breathe'); } }
      else { const i = correctIdx(q); if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); } }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+大图 pulse（不动 lastAct） */
    speakQuiz();
    pulseAsk();
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
  KIDS.init({ game: 'senses', title: '五感侦探' });   // 存档键 kidsgame_senses（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.SE——b29 坑⑥：verify 页独占钩子=驱动假阳性） ================= */
window.SE = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const o = { kind: q.kind,                             /* SPEC §6 r11：findsense|findthing|multi|anti|comp */
                ask: q.ask,                               /* 出示图 id（find/anti 见上表；multi/comp=多感官物） */
                opts: q.opts.map(x => ({ anim: x.anim })), /* 图卡 {anim}（感官 5∪物品 10∪多感官物 5） */
                answer: q.kind === 'multi' ? -1 : q.answer, /* 单选题=正确卡下标；multi=-1（判定在 tapSubmit） */
                step: cur.step,
                miss: q._miss || 0 };
    if (q.kind === 'multi') { o.answers = q.answers.slice(); o.picked = q.picked.slice(); }
    if (q.kind === 'comp') o.blocked = q.blocked;
    return o;
  },
  tapOpt(i) { return uiTapOpt(i); },
  tapSubmit() { return uiSubmit(); },            /* multi 判定步：right·done·wrong·false（非 multi/被拦） */
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选卡/勾满 need+提交，
    let taps = 0, guard = 0;             // 走真实判定链；演出窗内 tap=false → 等窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 160) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 700) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      if (q.kind === 'multi') {
        for (const j of q.answers) {
          let ok = false;
          for (let t2 = 0; t2 < 40 && !ok; t2++) {   // 被锁吞/勾错位→等待重试（'unpick' 再点回 'pick'）
            let g2 = 0;
            while ((state.locked || state.demo) && g2++ < 700) await wait(50);
            const rp = await uiTapOpt(j);
            if (rp === 'pick') ok = true;
            else await wait(120);
          }
        }
        let g3 = 0;
        while ((state.locked || state.demo) && g3++ < 700) await wait(50);
        let r = await uiSubmit();
        for (let t3 = 0; t3 < 20 && r === false; t3++) {   // 被吞（链窗/空选异常）：等窗重试
          await wait(200);
          r = await uiSubmit();
        }
        if (r === 'right' || r === 'done') taps++;                  // 判定步计数（multi=提交 1 步）
        else if (guard >= 158) break;
      } else {
        const r = await uiTapOpt(q.answer);
        if (r === 'right' || r === 'done') taps++;
        else if (r === 'wrong') { /* 继续重试点对（不会发生：直点 answer） */ }
        else if (guard >= 158) break;
      }
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
