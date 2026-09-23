/* ================= quiz 主逻辑（题面渲染 / 选项卡点选判定 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH20 §3 升档）：每题=题面卡（领域小标签+文字，点=重听题句）
   +4 张带图选项卡（1 正确+3 同域干扰）。点卡即判：对=绿框闪光+qz_right+
   下一题；错=该卡抖动+sayW+零惩罚
   可重选（单选制，卡不消失），1000ms 防重入窗（b16 定案禁偏离）。
   救援钟口径（§0.7a）：作答（对/错）不重置；唯答对推进重置；读题面=主动学习
   动作重置。梯度脚手架（b18/b19 定案）：miss=1 方向级=题面类别小标签 pulse；
   miss≥2 答案级=正确卡 breathe（不提前）。
   教学看-帮-独：watch=演示读题→排除干扰卡→选正确卡（返回值存 window.__qzDemoR
   §0.27）；帮=幽灵手指指向正确卡（rescueTarget 同源）；独=首次答对放手。
   题目文本/选项串=T46 阶段2（09-19）clip 化：qz_q_N/qz_opts_N/qz_cat_N/qz_no 全键在册
   （SPEC §3 原「动态文本不 clip 化」豁免就此退役——题库 160 题封闭全集已枚举合成）。
   验收钩子：window.QZ = { get currentLevel, get quiz(){qid,text,opts[](卡{v,img}),
   answer,step,miss}, tapOpt(i), start(flat), async autoSolve(), get tutorial,
   get rescues }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/教学/反馈不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次（miss===2） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) {
    lastWrongVoice = now;
    KIDS.voice.play(key, text);
  }
};
/* T46 阶段2（2026-09-19）：题库语音 clip 化——题面 qz_q_N/选项串 qz_opts_N/类别
   qz_cat_N/纠错 qz_no 全键在册（330 条，build↔manifest 全量对账）；sayQ=键链播报，
   全段在册走 queue 拼播，缺 clip=防御性整句 TTS 兜底（playChain 家族先例；正常路径
   恒全 clip 零 TTS） */
const sayQ = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.voice.say(fallback);
};

const stageEl = $id('stage'), askEl = $id('ask'), askCatEl = $id('ask-cat'),
      askTextEl = $id('ask-text'), optPoolEl = $id('opt-pool'), tipEl = $id('tip'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastAskAt = 0;                              // 重听题面 3s 节流
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;                            // 救援触发计数（QZ.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => optPoolEl.querySelector('.opt[data-i="' + i + '"]');
/* 干扰卡下标（教学排除演示用；verify 侧独立实现禁复用本函数） */
const distrIdx = q => { for (let i = 0; i < q.opts.length; i++) if (i !== q.answer) return i; return -1; };

/* ================= 错题隔日复现（升档新增）：sv.quiz.wrongBank=[{id,ok}]
   答错→入 bank（已在库则 ok 归零）；答对→ok+1，ok≥2 移出（答对两次毕业）；
   每日第一个 startLevel（serveDay≠今天）→ 从 bank 取 ≤3 题注入关首优先出题。
   存档兼容：无 sv.quiz / 无 wrongBank 字段=空 bank（不写不炸）。verify 页
   KIDS 未 init（_save()=null）→ 全部 no-op（verify 用覆写 _save 法测机制）。 ================= */
const todayStrQ = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
function bankLoad() {
  const sv = KIDS._save();
  if (!sv || !sv.quiz || !Array.isArray(sv.quiz.wrongBank)) return [];
  return sv.quiz.wrongBank.filter(function (e) {
    return e && typeof e.id === 'number' && Math.floor(e.id) === e.id && e.id >= 0 && e.id < QZ_BANK.length;
  });
}
function bankSave(list) {
  const sv = KIDS._save();
  if (!sv) return;                               // verify 页/未 init：no-op
  sv.quiz = sv.quiz || {};
  sv.quiz.wrongBank = list;
  KIDS.store.persist();
}
function bankMark(qid) {                         // 答错：入库或 ok 归零
  const list = bankLoad();
  const e = list.find(function (x) { return x.id === qid; });
  if (e) e.ok = 0;
  else list.push({ id: qid, ok: 0 });
  bankSave(list);
}
function bankPass(qid) {                         // 答对：ok+1，≥2 毕业
  const list = bankLoad();
  const i = list.findIndex(function (x) { return x.id === qid; });
  if (i < 0) return;
  list[i].ok++;
  if (list[i].ok >= 2) list.splice(i, 1);
  bankSave(list);
}
function bankServeToday() {                      // 日起始关注入（每日一次）：≤3 题 id
  const sv = KIDS._save();
  if (!sv) return [];
  sv.quiz = sv.quiz || {};
  if (sv.quiz.serveDay === todayStrQ()) return [];
  sv.quiz.serveDay = todayStrQ();
  const ids = bankLoad().slice(0, 3).map(function (e) { return e.id; });
  KIDS.store.persist();
  return ids;
}

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.speakerSmall;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
/* 题面卡：类别小标签（方向级救援 pulse 目标）+ 题面文字 */
function renderAsk(q) {
  askCatEl.innerHTML = QZ_ICONS[CAT_ICONS[q.cat]] + '<span class="cn">' + CATS[q.cat] + '</span>';
  askTextEl.textContent = q.text;
  askEl.className = '';
}
/* 选项卡：上图下字 */
function renderOpts(q) {
  optPoolEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.dataset.i = i;
    b.setAttribute('aria-label', '答案卡 ' + o.v);
    b.innerHTML = '<span class="oi">' + QZ_ICONS[o.img] + '</span><span class="ov">' + o.v + '</span>';
    optPoolEl.appendChild(b);
  });
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
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn）单段 queue 单通道 */
function openingSpeak(turn) {
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key]);
}
let readTimer = 0;                                /* P2-1：自动读题定时器（手动读题/换题即清） */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearRescueVisual();
  renderAsk(q);
  renderOpts(q);
  renderStep();
  /* P2-1（试玩）：每题首次渲染自动读题面——不识字也能独立玩。延迟让位单通道：
     开局 step0 让 hint 开场链（≈2.6s）；答对推进已等 qz_right（2100ms）只留尾音 350ms。
     手动"听"（readAsk）读题+选项更全，自动版只读题面不读选项（防啰嗦）。 */
  clearTimeout(readTimer);
  readTimer = setTimeout(() => {
    if (VERIFY || state.won || state.locked) return;
    if (state.tut === 'watch' || state.tut === 'help') return;   // 教学演示自带读题，不叠加
    if (!cur || cur.quizzes[cur.step] !== q || q.solved) return;
    lastAct = Date.now();                          /* 读题=主动学习重置救援钟（§0.7a 同口径） */
    sayQ([qKeyOf(q)], q.text);                     /* T46 阶段2：题面 qz_q_N（自动读题=只读题面） */
  }, cur.step === 0 ? 2600 : 350);
}

/* ================= 视觉反馈小件 ================= */
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
function clearRescueVisual() {
  askCatEl.classList.remove('pulse');
  askEl.classList.remove('flash', 'breathe');
  optPoolEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
}
/* 方向级线索（梯度脚手架 错1次）：题面类别小标签 pulse（§3 救援口径·方向级恒给） */
function applyDirVisual() {
  replayAnim(askCatEl, 'pulse');
}
/* 答案级视觉（miss≥2 / 14s 救援）：正确卡 breathe（§0.7 首错不 breathe 正确项） */
function applyAnswerVisual(q) {
  const t = rescueTarget(q);
  if (!t) return;
  const el = optEl(t.i);
  if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
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
  clearRescueVisual();                           /* 指新目标前清旧视觉（numberdet P1-3 教训） */
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 同源）：正确答案卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (t) pointGhostAt(optEl(t.i));
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 点卡主路径（真实点击 / QZ 钩子 / autoSolve / 教学演示共用）
   uiTapOpt(i, demo)：点选项卡 i → 判定。对=绿框+qz_right+推进（答对重置救援钟
   §0.7a）；错=该卡抖动+sayW+梯度脚手架+1000ms 防重入窗（§0.26 b16 定案），
   卡不消失零惩罚可重选（单选制）。身份守卫 const run=cur ================= */
async function uiTapOpt(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) sfx('pop');                       /* §0.22 吞输入轻叮 */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const plan = engTapOpt(cur, i);
  if (plan === null) {                           /* 非法下标 */
    sfx('pop');
    return false;
  }
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const res = engCommitJudge(cur, plan);
  if (plan.win) {                                // 答对：反馈+推进
    bankPass(q.qid);                             // 错题库：答对一次 ok+1（两次毕业）
    lastAct = Date.now();
    if (state.tut === 'help') {                  // 教学"独"：首次答对放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    clearRescueVisual();
    const el = optEl(i);
    if (el) { el.classList.add('ok'); setTimeout(() => el.classList.remove('ok'), 620); }
    sfx('ok');
    sayR(VOICE.right.key, VOICE.right.text);
    state.locked = true;
    await wait(2100 * SPEED);                    /* 等 qz_right（≈1.8s）主体播完 */
    if (cur !== run) return res;
    state.locked = false;
    if (res === 'done') winFlow();
    else renderQuiz();
    return res;
  }
  /* 错：该卡抖动+sayW+梯度脚手架（miss=1 方向级类别标签 pulse / miss≥2 答案级
     正确卡 breathe）；1000ms 防重入窗后零惩罚可重选（单选制，卡不动） */
  sfx('fail');
  bankMark(q.qid);                               // 错题库：答错入库（隔日复现）
  sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);
  replayAnim(optEl(i), 'wig');
  if (q.miss === 1) applyDirVisual();            /* 错 1 次闪方向级线索（梯度定案） */
  else applyAnswerVisual(q);                     /* miss≥2 才出答案级（不提前） */
  if (state.tut === 'help') scheduleHelpGhost(400);
  state.locked = true;
  await wait(1000 * SPEED);                      /* 错点防重入窗 1000ms（b16 定案） */
  if (cur !== run) return res;
  optPoolEl.querySelectorAll('.wig').forEach(k => k.classList.remove('wig'));
  state.locked = false;
  return res;
}

/* ================= 读题面（主动学习重置 §0.7a）：hint clip → 题面+选项 TTS 兜底
   （T46 阶段2：hint+题面+选项三段 clip 链播——听读兼顾不识字场景） ================= */
function readAsk() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  clearTimeout(readTimer);                         /* 手动读题接管，自动读题让位 */
  lastAct = Date.now();
  replayAnim(tipEl, 'flash');
  /* T46 阶段2：hint+题面+选项串三段全在册=queue 顺序链（原 say 逐段发=前段被掐只闻尾段，
     现链播听读完整）；缺任一 clip=整句 TTS 兜底 */
  sayQ([VOICE.hint.key, qKeyOf(q), optsKeyOf(q)],
       VOICE.hint.text + '。' + q.text + '。选项有：' + q.opts.map(o => o.v).join('，'));
  return true;
}
function uiHear() {
  if (!cur) return false;
  const now = Date.now();
  if (now - lastAskAt < 3000) return false;
  lastAskAt = now;
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  return readAsk();
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
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
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat, bankServeToday());        // 日起始关：错题复现注入 ≤3 题置前
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.quiz && sv.quiz.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  openingSpeak();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.quiz.tutSeen）
   看=演示读题（题面卡 breathe+TTS 读题面）→提示类别（类别小标签 flash）→排除
   （幽灵手指移到干扰卡停一停说"不对"）→选正确卡（按压+tapOpt 判对，返回值存
   window.__qzDemoR §0.27）→立即重发同关（确定性关卡，题面一致），"你来答一答"
   交接 →帮=指向正确卡；独=首次答对放手。全程 ≤16s ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  askEl.classList.add('breathe');                /* 看题：题面呼吸 */
  sayQ([qKeyOf(q)], q.text);                     /* 读题（T46 阶段2：qz_q_N clip） */
  await wait(1600 * SPEED);
  askEl.classList.remove('breathe');
  replayAnim(askCatEl, 'pulse');                 /* 类别提示：小标签闪 */
  sayQ([catKeyOf(q)], '这是' + CATS[q.cat] + '的题目');   /* T46 阶段2：qz_cat_N clip */
  await wait(1200 * SPEED);
  let demoR = null;
  const di = distrIdx(q);                        /* 排除：先看干扰卡 */
  if (di >= 0) {
    pointGhostAt(optEl(di));
    await wait(900 * SPEED);
    sayQ(['qz_no'], '这个不对');                 /* T46 阶段2：qz_no clip */
    await wait(700 * SPEED);
  }
  pointGhostAt(optEl(q.answer));                 /* 再指正确卡 */
  await wait(720 * SPEED);
  ghost.press();
  await wait(260 * SPEED);
  demoR = await uiTapOpt(q.answer, true);        /* demo 通道选卡判对 */
  await wait(430 * SPEED);
  window.__qzDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.quiz = sv.quiz || {};
    sv.quiz.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  openingSpeak(true);                            // 交接顺序链：qz_tut_turn（§0.6 单通道）
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈（§0.16） */
    sfx('pop');
    return;
  }
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.22 吞输入轻叮 */
  uiHear();                                      /* 读题面（主动学习重置救援钟） */
});
askEl.addEventListener('pointerdown', e => {     // 点题面卡=重听题句（主动学习重置）
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 吞输入期轻叮 */
  const now = Date.now();
  if (now - lastAskAt < 3000) return;
  lastAskAt = now;
  readAsk();
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.opt');
  if (c) {                                       // 选项卡：点选主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapOpt(Number(c.dataset.i));
    return;
  }
  if (e.target.closest('button, #tip')) return;  /* §0.16：底栏按钮/题面条显式排除（b16 S5 教训） */
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.21/§3：题句重读+类别小标签 pulse
   （方向级恒给）+miss≥2 正确卡 breathe（答案级））/ 教学"帮"5s 重演示一次。
   救援钟只被答对推进/读题面等主动学习重置（§0.7a：作答/错答/空白/兔子不重置） ================= */
function rescueAct(q) {
  rescueCount++;
  sayQ([VOICE.hint.key, qKeyOf(q)], VOICE.hint.text + '。' + q.text);   /* 题句重读=hint+题面链（T46 阶段2 全在册） */
  clearRescueVisual();
  applyDirVisual();                              /* 类别小标签 pulse（§3 救援口径·方向级恒给） */
  if (q.miss >= 2) applyAnswerVisual(q);         /* 正确卡 breathe=答案级：miss≥2 才出（b18 梯度定案） */
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
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
  KIDS.init({ game: 'quiz', title: '小兔百科问答' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.QZ = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: 'quiz', qid: q.qid, cat: q.cat,      /* SPEC §3 钩子契约（升档：q/domain/opts×4）+ 测试辅助字段（全拷贝） */
      q: q.text, domain: q.domain,
      text: q.text,
      opts: q.opts.map(o => ({ v: o.v, img: o.img })),
      answer: q.answer,
      step: cur.step, miss: q.miss };
  },
  get bank() {                                    /* 错题库快照（升档：verify/家长可查） */
    return bankLoad().map(e => ({ id: e.id, ok: e.ok }));
  },
  get served() {                                  /* 本关注入的复现题数 */
    return cur ? cur.served : 0;
  },
  tapOpt(i) { return uiTapOpt(i); },
  start(flat) {                                  /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                            /* UI 路径自动通关：逐题点正确卡 */
    const run = cur;                             // 身份守卫：winFlow 延迟 proceed 换关即中止
    let n = 0, quizzes = 0, ok = true;
    while (cur && cur === run && !cur.done && n++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const r = await uiTapOpt(q.answer);
      quizzes++;
      if (r !== 'right' && r !== 'done') { ok = false; break; }
    }
    return { done: !!(cur && cur.done && cur === run), quizzes: quizzes, ok: ok };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
