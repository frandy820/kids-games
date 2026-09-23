/* ================= storybed 主逻辑 v2（r10）：顺序条/步骤卡渲染 / 依赖图「合理序」逐点制 / 三题型 / 教学 / 救援 / 推进
   玩法（SPEC-BATCH30 §6 r10）：
   order/rain 题：题面=流程小图+流程名大字+「先做什么呀？」（rain 题顶挂「明天下雨」条件徽章，
   语音 stb_q_rain——条件卡片改变流程=出门插入「带小伞」5 步）；上方顺序条 n 槽（槽序=点选次序）；
   下方 4-5 张乱序步骤卡。点当前合法步骤（依赖图：未完成∧前置全完成——可换序多解）→ 源卡
   .done 淡化保留+克隆飞入顺序条下一槽亮起（'step'）→「然后呢」逐点至全部完成（末步 'right'，
   末题 'done'）；点非法步骤（前置未完成/已点/干扰卡）='wrong'+miss+wig（miss≥2 才亮合法卡=
   答案级梯度脚手架）。
   miss 题：题面「少了哪一步呀」（stb_q_miss）+ 顺序条=3 预填槽+1 缺口槽（呼吸提示）+ 4 候选卡；
   点缺失步卡=飞入缺口槽（'right'/末题 'done'）；点干扰卡='wrong'+miss（专用句 GUIDE.miss）。
   救援两级（家族 B 双锚）：14s 方向级=重读题面+合法卡 pulse 三连（lastDir 独立锚不重置 lastAct）；
   30s 答案级=首张合法卡 breathe+重读（lastAct 重置）。
   语音窗（家族 G/H/I/N/T + estMs 全字符口径，SPEC §4 实长 + r10 新键）：
   stb_tut_watch 3096 → 演示首 tap 延至 t=900+2500=3400（≥3096+300=3396 禁撞头）；
   stb_tut_turn 1776 → turn 后读题延 2100（≥1776+300=2076 防尾截）；
   逐点反馈链 [步音, stb_next] =步实长+150+1488 ≤1896+150+1488=3534 fire-and-forget
     （<14000 方向级救援间隔-1000，无掐尾；新点起新链打断旧链=孩子抢点正常语义）；
   排完确认链 [stb_right, 末步步音]=2520+150+1896=4566 → 判对演出窗 1800+3400=5200
     ≥4566+300=4866（契约 G/H；全 clip 段无 keyless——契约 N 无虞）；
   错链 [stb_wrong, 语义句 clip 键段]（T46 阶段2：三句族 stb_g_wrong/distract/miss，
     text=TTS 兜底）=2496+150+3120 → 豁免窗 wrongChainUntil=7100 ≥5766+300=6066（家族 I）；
   出题句分型：order=stb_q / rain=stb_q_rain / miss=stb_q_miss（play 单发无锁窗）；
   错点防重入窗 1000ms；救援读题掐链由 wrongChainUntil 守卫。
   验收钩子（无条件挂 window——b29 坑⑥，gate G2/R8 真实页可达）：
   window.SB = { get currentLevel, get quiz(){kind('order'|'rain'|'miss'),flow,steps[](卡池
   {stepId,text,done}),answers[](当前合法步骤集),answer(=answers[0] 兼容),phase(已点数),
   step,miss,chain[](miss 题出示链,null=缺口)}, tapCard(i), start(flat),
   async autoSolve(){done,taps}, get tutorial }——tapCard 返回值族：
   step/right/done/wrong/null（越界或演出窗），全 async；getter 返回拷贝 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流（家族 J：语义句全程保留禁切通用 clip）：flat<3 每错必播；flat≥3 10s 节流
   ——返回是否起播（契约 I「仅起播时设豁免窗」） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，家族 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;
};

const stageEl = $id('stage'), stripEl = $id('strip'), boardEl = $id('board'),
      chipEl = $id('prompt-chip'), condEl = $id('cond'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');
const slotEl = p => stripEl.querySelector('.slot[data-pos="' + p + '"]');
/* 步骤文本查表（含 rain 条件步 out_4「带小伞」——FLOWS 表外唯一扩展步） */
function stepTextOf(flow, n) { return +n === 4 ? COND.rain.text : FLOWS[flow].steps[+n].t; }

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：排对一步=短双音 / 答错=低柔单音 / 排完一题=叮咚 */
const chimeStep = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.12, 0, 0.55); KIDS.audio.note(880, 0.18, 0.07, 0.6); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };

/* ================= 题面语音分型（r10）：order=stb_q / rain=stb_q_rain / miss=stb_q_miss ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'rain') KIDS.voice.play(VOICE.qr.key, VOICE.qr.text);
  else if (q.kind === 'miss') KIDS.voice.play(VOICE.qm.key, VOICE.qm.text);
  else KIDS.voice.play(VOICE.q.key, VOICE.q.text);
}

/* ================= 渲染 ================= */
function buildStrip(n) {                        // order/rain：n 空槽（虚线+序号大字，槽序=点选次序）
  stripEl.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const d = document.createElement('div');
    d.className = 'slot';
    d.dataset.pos = i;
    d.innerHTML = '<i class="s-num">' + (i + 1) + '</i>';
    stripEl.appendChild(d);
  }
}
function buildMissStrip(q) {                    // miss 题：3 预填槽（链实步）+1 缺口槽（虚线+?）
  stripEl.innerHTML = '';
  const flow = q.flow;
  for (let i = 0; i < 4; i++) {
    const d = document.createElement('div');
    if (i === q.gapIdx) {
      d.className = 'slot gap';
      d.dataset.pos = i;
      d.innerHTML = '<i class="s-q">?</i>';
    } else {
      const k = i < q.gapIdx ? i : i - 1;               // 链实步固有号（跳过缺口）
      d.className = 'slot preset';
      d.dataset.pos = i;
      d.innerHTML = '<span class="s-art">' + stepArt(stepTextOf(flow, k)) + '</span>' +
                    '<i class="s-num">' + (i + 1) + '</i>';
    }
    stripEl.appendChild(d);
  }
}
function buildBoard(q) {                        // 步骤卡池（order/rain=乱序步骤+干扰；miss=4 候选）
  boardEl.innerHTML = '';
  q.pool.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.sid = p.stepId;
    b.setAttribute('aria-label', p.text);
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="c-art">' + stepArt(p.text) + '</span><span class="c-word">' + p.text + '</span>';
    boardEl.appendChild(b);
  });
}
function renderPrompt(q) {                      // 题面行（识字冗余，指令全语音承载）+ 条件徽章分型
  condEl.classList.toggle('show', q.kind === 'rain');
  if (q.kind === 'rain')
    condEl.innerHTML = '<span class="cd-ico">' + condArt('rain') + '</span><span class="cd-word">' + COND.rain.badge + '</span>';
  const ask = q.kind === 'miss' ? '，少了哪一步呀？' : '，先做什么呀？';
  chipEl.innerHTML = '<span class="p-ico">' + flowArt(q.flow) + '</span>' +
    '<span class="p-name">' + q.name + '</span><span class="p-ask">' + ask + '</span>';
  chipEl.setAttribute('aria-label', q.name + '，' + (q.kind === 'miss' ? '少了哪一步呀' : '先做什么呀') + '，点我再听一遍');
}
function renderQuiz(speak) {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'miss') buildMissStrip(q); else buildStrip(q.stepIds.length);
  buildBoard(q);
  renderPrompt(q);
  renderStep();
  if (speak !== false && !VERIFY && !state.demo && !state.quiet) speakQuiz();  /* 开场/换题读题（分型） */
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
   order/rain：源卡 .done 淡化保留 → 克隆飞行体 源卡矩形→顺序条第 placed 位槽 → 到达填充+亮起；
   miss：点对候选卡 → 克隆飞入第 gapIdx 位缺口槽 → 到达填充+亮起 ================= */
function flyStep(el, pos, text) {
  const dur = 420 * SPEED;
  if (el) { el.classList.add('done'); }
  const slot = slotEl(pos);
  if (el && slot) {
    const from = el.getBoundingClientRect();
    const to = slot.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'fly';
    fly.innerHTML = stepArt(text);
    fly.style.left = from.left + 'px';
    fly.style.top = from.top + 'px';
    fly.style.width = from.width + 'px';
    fly.style.height = from.height + 'px';
    fly.style.transitionDuration = dur + 'ms';
    document.body.appendChild(fly);
    const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    const k = Math.min(to.width, to.height) / Math.max(from.width, from.height);
    requestAnimationFrame(() => {
      fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')';
    });
    setTimeout(() => fly.remove(), dur + 90);
  }
  setTimeout(() => fillSlot(pos, text), dur);   // 到达即填充亮起
  return dur;
}
function fillSlot(pos, text) {
  const s = slotEl(pos);
  if (!s) return;
  s.classList.remove('lit', 'gap', 'preset'); void s.offsetWidth;
  s.classList.add('lit');
  s.innerHTML = '<span class="s-art">' + stepArt(text) + '</span><i class="s-num">' + (pos + 1) + '</i>';
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
/* 教学"帮"阶段指向：当前题第一张合法步骤卡（可换序多解下任一合法卡即可） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = engAnswerIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / SB.tapCard / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡板容器 bump 微动效——家族 D）：演出窗/教学演示期/越界=null+pop+bump；
   错点 1000ms 防重入窗；miss≥2 才亮第一张合法卡（答案级梯度脚手架，§6） ========== */
async function uiTapCard(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return null;                                 // 演出窗/教学演示期吞点=null（钩子契约）
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界下标
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 非法点：wig+miss+错链（语义句 clip 键段，三句族分型） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const gk = q.kind === 'miss' ? 'miss'
      : (q.stepIds.indexOf(q.pool[i].stepId) < 0 ? 'distract' : 'wrong');   /* 三句族分型（miss 干扰/干扰/前置未完） */
    if (sayW([VOICE.wrong.key, { key: GUIDE_KEY[gk], text: GUIDE[gk] }]))   /* 错链=stb_wrong+语义句 clip（T46 阶段2；text=TTS 兜底） */
      wrongChainUntil = Date.now() + 7100;       /* 链豁免（家族 I）：2496+150+3120(stb_g_wrong 实长)+300=6066 */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    if (q.miss >= 2) {                           /* 答案级线索 miss≥2 才亮第一张合法卡（梯度脚手架） */
      const ok = cardEl(engAnswerIdx(q));
      if (ok && !ok.classList.contains('done')) replayAnim(ok, 'breathe');
    }
    state.locked = false;
    return r;
  }

  lastAct = Date.now();                          /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次排对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe', 'wig'); }
  if (q.kind === 'miss') {                       /* ---- miss 题补对：飞入缺口槽+确认链 right+缺失步音 ---- */
    const dur = flyStep(el, q.gapIdx, q.missingText);
    chimeStep();
    sfx('coin');
    chimeGoal();
    KIDS.voice.queue([VOICE.right.key, stepKeyOf(q.missingId)]);   /* 2520+150+缺失步步音 */
    await wait(1800 * SPEED);                    /* 入槽+演出主窗 */
    if (cur !== run) return r;
    await wait(3400 * SPEED);                    /* 链收尾窗：总 5200 ≥2520+150+1896+300=4866（契约 G/H） */
    if (cur !== run) return r;
    state.locked = false;
    if (r === 'done') { winFlow(); return 'done'; }
    renderQuiz();                                /* 新题 + 分型读题 */
    return r;
  }
  const n = q.pos - 1;                           /* 引擎已 placed.push：所点步骤序=n（槽序=点选次序） */
  const sid = q.placed[n];
  const dur = flyStep(el, n, stepTextOf(q.flow, +sid.split('_')[1]));   /* 源卡 .done 淡化+克隆飞入槽 n */
  chimeStep();
  if (r === 'step') {                            /* 题内排对一步：逐点反馈链=步音+「然后呢」（fire-and-forget） */
    KIDS.voice.queue([stepKeyOf(sid), VOICE.next.key]);        /* ≤1896+150+1488=3534 <14s 救援间隔 */
    await wait(dur + 220 * SPEED);               /* 飞入 transition 窗 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right / done（本题排完：全槽亮起+确认链 right+末点点步音） ---- */
  sfx('coin');
  chimeGoal();
  KIDS.voice.queue([VOICE.right.key, stepKeyOf(q.placed[q.placed.length - 1])]);   /* 2520+150+末步步音 */
  await wait(1800 * SPEED);                      /* 入槽+演出主窗 */
  if (cur !== run) return r;
  await wait(3400 * SPEED);                      /* 链收尾窗：总 5200 ≥2520+150+1896+300=4866（契约 G/H；
                                                    错→对路径读题同延防链掐尾） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（顺序条/卡池/题面全换）+分型读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致；禁 (ci+1)%4 章序推进） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 演出收尾窗（确认链已在 uiTapCard 5200 窗内播完） */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（家族 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(false); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.storybed && sv.storybed.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面（分型：q/qr/qm） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指按序点 sleep 前 3 步（flat0 题0 恒 sleep+3 步——确定性锚点；刷牙/洗脸互可换，
   演示序=合法序之一「刷牙→洗脸→穿睡衣」，末步返回 'right'=终值语义，__sbDemoR 唯一写点）；
   帮=指向第一张合法卡；独=首次排对放手。
   时序（家族 G/H）：watch clip 3096ms → 演示首 tap 延至 t=900+2500=3400（≥3096+300=3396，
   clip 播完再演示不撞头）；步间 1300（逐点链步音+「然后呢」主体段，抢点掐链=正常节奏）；
   末步判对演出窗 5200 罩确认链（2520+150+步音+300）；全程名义预算 15140 ≤16s */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* stb_tut_watch：看！把事情排排队（3096ms） */
  await wait(900 * SPEED);                       /* 题面+顺序条+步骤卡亮相 */
  const steps = [0, 1, 2];                       /* sleep 前 3 步逐点演示（placed 序） */
  let demoR = null;
  for (let s = 0; s < steps.length; s++) {
    const q = cur.quizzes[0];
    const i = engAnswerIdx(q);                   // 当前合法卡（演示恒点合法卡——多解示范）
    pointGhostAt(cardEl(i));
    if (s === 0) await wait(2500 * SPEED);       /* t=900+2500=3400 ≥ watch 3096+300：clip 播完再演示 */
    else await wait(600 * SPEED);                /* ghost 移位收束 */
    ghost.press();
    await wait(320 * SPEED);
    demoR = await uiTapCard(i, true);            /* demo 通道豁免 locked 门（'step'×2 → 末步 'right'） */
    if (s < steps.length - 1) await wait(1300 * SPEED);   /* 逐点链主体段（步音+然后呢） */
  }
  window.__sbDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right' 终值语义） */
  await wait(500 * SPEED);                       /* 收尾（确认链由 uiTapCard 5200 窗罩满） */
  const sv = KIDS._save() || {};
  sv.storybed = sv.storybed || {};
  sv.storybed.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），「你来排一排」在重发后的题面上说（照 batch5-29） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(false); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* stb_tut_turn：你来排一排（1776ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2100);                                      /* ≥1776+300=2076 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：想想先做什么 */
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
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍（分型） */
});
chipEl.addEventListener('pointerdown', e => {    /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(chipEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapCard(Number(p.dataset.i));
});
stageEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#prompt-chip') || e.target.closest('.slot')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护（命名函数 rescueTick——verify 源码级断言用）：
   14s 方向级（重读题面+全部合法卡 pulse 三连，lastDir 独立节流锚，不重置 lastAct——30s
   答案级不被饿死）/ 30s 答案级（第一张合法卡 breathe + 重读，lastAct 重置）/ 教学"帮"5s 重演示；
   错反馈链豁免窗守卫在顶部（家族 I：链播完前救援不掐断，不挡主动点选） ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（家族 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板遮挡期救援静默（家族 K：层在时点击全吞却每 14-18s 重播读题=「一直在念题点什么都没反应」） */
  const idle = Date.now() - lastAct;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const legalIdxs = legalSteps(q).map(id => {          // 合法步骤在卡池中的展示位（多解=多卡）
    for (let i = 0; i < q.pool.length; i++) if (q.pool[i].stepId === id) return i;
    return -1;
  }).filter(i => i >= 0);
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const ok = legalIdxs.length ? cardEl(legalIdxs[0]) : null;
    if (ok) replayAnim(ok, 'breathe');
    speakQuiz();
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+链区/合法卡 pulse（不动 lastAct） */
    speakQuiz();
    if (q.kind === 'miss') {                     /* miss 题合法集恒=唯一答案卡——pulse 它=泄答案
                                       （M-2：改 pulse 链区容器，缺口槽常驻呼吸已是方向锚，
                                         与 dressup budget/anti「场景 pulse 不指片」同批口径） */
      for (let k = 0; k < 3; k++) setTimeout(() => replayAnim(stripEl, 'pulse'), k * 520);
    } else {                                     /* 非 miss：多解=多卡方向锚（合法集全部卡） */
      legalIdxs.forEach(i => {
        const ok = cardEl(i);
        if (ok && !ok.classList.contains('done')) {
          for (let k = 0; k < 3; k++) setTimeout(() => replayAnim(ok, 'pulse'), k * 520);
        }
      });
    }
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);

/* ================= 启动（命名函数 boot——verify 源码级断言家族 A 用；
   verify 分支由 game-verify.js 接管） ================= */
function boot() {
  KIDS.init({ game: 'storybed', title: '晚安故事序' });   // 存档键 kidsgame_storybed（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}
buildStatic();
if (!VERIFY) boot();

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；无条件挂 window——
   与家族先例 HB/BE/PM/WP 一致：gate G2 教学链+通关、R8 真实路径推进依赖真实页可达） ================= */
window.SB = {
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
    const answers = legalSteps(q);                          /* 当前合法步骤集（miss 题=[missingId]） */
    let chain = null;
    if (q.kind === 'miss') {                                /* 出示链（null=缺口位） */
      chain = [];
      for (let i = 0; i < 4; i++) chain.push(i === q.gapIdx ? null : {
        stepId: q.chainSteps[i < q.gapIdx ? i : i - 1],
        text: stepTextOf(q.flow, (i < q.gapIdx ? i : i - 1)) });
    }
    return { kind: q.kind,                                  /* 题型（order/rain/miss，SPEC §6） */
             flow: q.flow,                                  /* 流程 id */
             steps: q.pool.map(p => ({ stepId: p.stepId, text: p.text, done: !!p.done })),   /* 卡池 */
             answers: answers,                              /* 当前合法步骤 stepId 集 */
             answer: answers.length ? answers[0] : null,    /* 兼容单答案语义 */
             chain: chain,                                  /* miss 题出示链（null=缺口） */
             phase: q.pos,                                  /* 已点数 */
             step: cur.step,
             miss: q.miss };
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题逐步点合法卡，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 140) {   // 5 题 × 最多 5 卡 = 25 tap 上界，guard 余量
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const want = q.kind === 'miss' ? q.missingId : legalSteps(q)[0];
      let i = -1;
      for (let k = 0; k < q.pool.length; k++) if (q.pool[k].stepId === want) { i = k; break; }
      if (i < 0) break;
      const r = await uiTapCard(i);
      if (r === null || r === false) break;       // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
