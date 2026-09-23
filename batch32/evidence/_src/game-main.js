/* ================= evidence 主逻辑（结论卡/证据卡渲染 / 点选·勾选判定 / 教学 / 救援 / 推进）
   r17（SPEC-BATCH32 §-r17-evidence）：结论卡（完整结论句+小侦探放大镜图标）+ 屏显问句
   + 证据场景图卡（SVG+短标签）。题型三族：
     findexact（ch1/ch2 点卡判定：tap 真=right / tap 干扰=wrong）
     findall（ch3 勾选制：tapOpt=pick/unpick 零惩罚中性动作，tapSubmit=判定步——契约 F17：
       漏/多选=wrong+miss 且已选对位保留（picked=picked∩answers 错选位清除）可续选补齐）
     reverse（ch4 反问：tap 非真卡=right / tap 真值卡=wrong——抑制式判断）。
   开题链（全 clip，契约 N 天然合规——无 keyless 段）：
     findexact=[evi_c_<id>, evi_q1]（max 2832+150+2232+300=5514）
     findall=[evi_c_<id>, evi_q2]（max 2832+150+3120+300=6402）
     reverse=[evi_c_<id>, evi_q3]（max 2832+150+2376+300=5658）——读题异步不占 UI 等待窗。
   点对=卡 lit+确认链 [evi_right]（2472 单段，判对后窗 1600+1300=2900 ≥2772）
   +结论卡 pulse+小兔子跳；findall 判对=三真值卡 lit 保持。
   点错=卡摇头+错链 [evi_wrong 2112, evi_again「能证明吗」1680]（T46 键段链尾）
   +方向级：首错=结论卡再 pulse；miss≥2=正确证据卡 breathe（findexact/reverse=answer
   单卡 / findall=下一个未勾真值卡——家族梯度脚手架）。
   错链豁免窗 4242（2112+150+1680+300，T46 clip 实长口径，真时钟——契约 I r17 补：判定式题型错点吞/对选
   放行；findall 勾选中性不吞，守卫挂 uiSubmit——窗内提交吞 pop+bump）。
   救援：14s 方向级=重播题面链（结论句+150+q 句）+结论卡 pulse（lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级=正确卡 breathe+重读题面。
   验收钩子：window.EV = { get currentLevel, get quiz(){kind,concl,opts,answer/answers,
   picked,step,miss}, tapOpt(i), tapSubmit(), start(flat), async autoSolve()(判定步口径),
   get bank, get conclPool, get tutorial }。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* estMs 定版在 game-data（四方同步之一；main 不重复声明直接使用） */
/* 错反馈链豁免窗（契约 I，T46 实长口径）：evi_wrong 2112 + 150 + evi_again「能证明吗」clip 1680 + 300 = 4242 */
const WRONG_CHAIN_WIN = 2112 + 150 + 1680 + 300;
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5） */
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

const conclEl = $id('concl'), qbarEl = $id('qbar'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      submitBtn = $id('btn-submit'), ghostEl = $id('ghost');

/* r17 存档启动 IIFE（CH_LEN 5→8 键基迁移，r16 范式——SPEC §-r17 §3）：
   ①v1 键基迁移——v1 keyOf 分母=CH_LEN=5，旧档 '2-0'=旧 flat5 直映新基（分母 8）跳关
     且章语义错乱：矛盾态 lv[c+'-0'] 在而 lv[(c-1)+'-5'] 缺（c=2..4）=v1 基档一次性重置；
   ②脏键守卫——仅判格式非法与关号越界（<0 或 >7）；章号上界放开：生成关章号 ≥5 合法无界
     （keyOf 分母 CH_LEN=8，flat≥32 写 '5-0'+——禁整档 removeItem 吞掉生成关进度）。
   执行点先于 KIDS.init 读档。 */
try {
  const raw = localStorage.getItem('kidsgame_evidence');
  if (raw) {
    const lv = (JSON.parse(raw) || {}).levels || {};
    let reset = false;
    for (let c = 2; c <= 4; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { reset = true; break; }
    }
    if (!reset) {
      for (const k of Object.keys(lv)) {
        const m = /^(\d+)-(\d+)$/.exec(k);
        if (!m || +m[1] < 1 || +m[2] < 0 || +m[2] > CH_LEN - 1) { reset = true; break; }
      }
    }
    if (reset) localStorage.removeItem('kidsgame_evidence');
  }
} catch (e) { /* 守卫失败不阻断启动 */ }

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastConclReplay = 0;                        // 点结论卡重听节流（6s——防反复重播盖住儿童观察）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);   // 每章 8 关（r17 分母 8；v1 分母=5→启动 IIFE 迁移）
const CH_LVS = [0, 1, 2, 3, 4, 5, 6, 7];        // 本章全部关号（level.pass 用）
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  submitBtn.innerHTML = ICONS.check;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 勾选=轻单音（findall pick 的轻回应）
   / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const chimeLit = () => { if (!VERIFY) KIDS.audio.note(784, 0.14, 0, 0.5); };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（开题链；全 clip 无 keyless——契约 N 天然合规）
   findexact=[evi_c_<id>, evi_q1] max 5514 / findall=[evi_c_<id>, evi_q2] max 6402
   / reverse=[evi_c_<id>, evi_q3] max 5658——读题异步不占 UI 等待窗 ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([conclClip(q.concl),
    q.kind === 'findexact' ? VOICE.q1.key : (q.kind === 'findall' ? VOICE.q2.key : VOICE.q3.key)]);
}
/* 重听路径（hear/结论卡共用）：重播开题链+结论卡再 pulse（方向级回锚） */
function replayQuiz(withPulse) {
  if (!cur || !cur.quizzes[cur.step]) return;
  speakQuiz();
  if (withPulse) pulseConcl();
}
/* 方向级回锚：结论卡再 pulse（错反馈/重听/救援共用——「回到结论想证据」） */
function pulseConcl() {
  replayAnim(conclEl, 'pulse');
}
/* 答案级线索：正确证据卡 breathe（findexact/reverse=answer 单卡 / findall=下一个未勾
   真值卡逐张步进（§-r17 §5）；miss≥2 才亮——家族梯度脚手架，首错只给结论卡 pulse） */
function breatheCorrect(q) {
  const i = correctIdx(q);
  if (i >= 0) { const el = cardEl(i); if (el) replayAnim(el, 'breathe'); }
}

/* ================= 渲染 ================= */
function renderConcl(q) {                        // 结论卡：小侦探放大镜+完整结论句（7-8 识字）
  conclEl.dataset.concl = q.concl;               // 帧内容锚（契约 M：verify 断言）
  conclEl.dataset.kind = q.kind;
  conclEl.setAttribute('aria-label', '结论卡：' + conclText(q.concl) + '，点我再听一遍');
  conclEl.innerHTML = '<span class="c-icon">' + ICONS.detective + '</span>' +
    '<span class="c-text">' + conclText(q.concl) + '</span>';
  replayAnim(conclEl, 'pop');
}
function renderQbar(q) {                         // 问句条（三族屏显问句）
  const t = qbarEl.querySelector('.q-text');
  t.textContent = q.text;
  replayAnim(qbarEl, 'pop');
}
function renderBoard(q) {                        // 证据卡：场景 SVG+短标签小字+勾选角标（findall）
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.img = o.img;                       // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', '证据卡：' + o.label);
    b.innerHTML = evSvg(o.img, 74) + '<span class="tick"></span><span class="nm">' + o.label + '</span>';
    b.style.animationDelay = (i * 70) + 'ms';
    boardEl.appendChild(b);
  });
}
/* 提交钮状态（findall 在场才显示；armed=有勾选/ready=勾满三张呼吸——计数驱动不泄答案） */
function updateSubmitState() {
  const q = cur && !cur.done ? cur.quizzes[cur.step] : null;
  const show = !!(q && q.kind === 'findall' && !q._answered && !state.won);
  submitBtn.classList.toggle('hidden', !show);
  if (!show) { submitBtn.classList.remove('armed', 'ready'); return; }
  const n = q.picked.length;
  submitBtn.classList.toggle('armed', n > 0);
  submitBtn.classList.toggle('ready', n > 0 && n === q.answers.length);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderConcl(q);
  renderQbar(q);
  renderBoard(q);
  renderStep();
  updateSubmitState();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 开题读题（教学演示期静默）
}
function renderStep() {                          // HUD 本关 8 题进度点
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
    const done = CH_LVS.every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 答对演出：结论卡 pulse + 小兔子跳（确认链由判定路径播）
   verify 页跳过装饰直接落定 ================= */
function celebrateScene() {
  replayAnim(conclEl, 'pulse');
  hopRabbit();
}

/* ================= 判对共同路径（uiTapOpt 点卡判对 / uiSubmit 提交判对共用）
   findexact/reverse=点亮所点卡 / findall=三真值卡 lit 保持；
   确认链=evi_right 单段（2472；演出窗 1600+1300=2900 ≥2472+300=2772） ================= */
async function finishCorrect(q, run, r, tapIdx) {
  lastAct = Date.now();                          /* 正确判定重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次判对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (q.kind === 'findall') {
    for (const a of q.answers) {
      const e2 = cardEl(a);
      if (e2) { e2.classList.remove('breathe', 'held'); e2.classList.add('lit'); }
    }
    updateSubmitState();
  } else if (tapIdx != null) {
    const el = cardEl(tapIdx);
    if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  }
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateScene();
  KIDS.voice.queue([VOICE.right.key]);           /* 确认链=evi_right 单段 */
  await wait(1600 * SPEED);                      /* 确认链主窗（卡 lit+结论卡 pulse+兔子跳） */
  if (cur !== run) return r;
  await wait(1300 * SPEED);                      /* 确认链收尾窗：总 2900 ≥ 2472+300=2772（家族 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (cur.done) { winFlow(); return 'done'; }    /* 末题通关 */
  renderQuiz();                                  /* 新题（结论卡/问句/证据卡全换）+读题 */
  return r;
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
  el.classList.remove('breathe'); void el.offsetWidth;
  el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：当前题正确卡（findall=下一个未勾真值卡） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / EV.tapOpt / autoSolve / 教学演示共用）
   findexact/reverse=点卡即判定步；findall=勾选切换（中性零惩罚）。
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错链豁免窗（契约 I r17，真时钟）：判定式题型窗内错点吞（pop+bump 不计 miss）、
   对选放行、窗后二错照计 miss；findall 勾选不吞（守卫挂 uiSubmit）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const judging = q.kind !== 'findall';          // findexact/reverse 判定步在点卡
  if (!demo && judging && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答/已勾态非法=null+pop+bump
  const el = cardEl(i);

  if (r === 'pick' || r === 'unpick') {          /* findall 勾选切换：中性动作零惩罚（F17） */
    lastAct = Date.now();                        /* 主动选择重置救援钟（§0.7a） */
    if (el) el.classList.toggle('held', q.picked.indexOf(i) >= 0);
    if (r === 'pick') chimeLit();
    updateSubmitState();
    return r;
  }

  if (r === 'wrong') {                           /* 答错（findexact 点干扰/reverse 点真值卡）：摇头+错链+方向级 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, { key: 'evi_again', text: WRONG_AGAIN }]))
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;   /* 链豁免窗=4242（契约 I，T46 键段） */
    if (q._miss >= 2) breatheCorrect(q);          /* 答案级线索 miss≥2 才亮（家族梯度脚手架） */
    else pulseConcl();                            /* 首错=结论卡再 pulse（方向级，不泄答案） */
    await wait(1000 * SPEED);                     /* 错点防重入窗 1000ms；对选可打断链；救援由豁免窗让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right/done（findexact 点真值 / reverse 点非真卡：本题完成或末题通关） ---- */
  return await finishCorrect(q, run, r, i);
}

/* ================= 提交主路径（findall 判定步；真实点击 / EV.tapSubmit / autoSolve 共用）
   契约 F17：picked 集==answers 集→right；漏/多选=wrong（miss+1）且已选对位保留
   （错选位清 .held+摇头），可续选补齐再提交；空选/被拦=false 不计 miss。
   契约 I r17：错链豁免窗内提交吞（pop+bump）——勾选中性不吞、判定步受窗保护 ========== */
async function uiSubmit(demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.kind !== 'findall') return false;
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur;
  const prevPicked = q.picked.slice();           /* 错选位取证（摇头演出用） */
  const r = engSubmit(cur);
  if (r === null || r === false) { sfx('pop'); replayAnim(boardEl, 'bump'); return r; }

  if (r === 'wrong') {                           /* 漏/多选：错选卡清勾+摇头+错链+方向级 */
    state.locked = true;
    for (const j of prevPicked) {
      if (q.answers.indexOf(j) < 0) {            /* 被清除的错选位（对位保留的不动） */
        const e2 = cardEl(j);
        if (e2) { e2.classList.remove('held'); replayAnim(e2, 'wig'); }
      }
    }
    dodgeLo();
    if (sayW([VOICE.wrong.key, { key: 'evi_again', text: WRONG_AGAIN }]))
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;   /* 链豁免窗=4242（契约 I，T46 键段） */
    if (q._miss >= 2) breatheCorrect(q);          /* 答案级线索 miss≥2 才亮（findall=下一个未勾真值卡） */
    else pulseConcl();
    await wait(1000 * SPEED);                     /* 错点防重入窗（续选可打断链；救援由豁免窗让路） */
    if (cur !== run) return r;
    state.locked = false;
    updateSubmitState();
    return r;
  }

  /* ---- right/done（提交判对：三真值卡 lit 保持，本题完成或末题通关） ---- */
  return await finishCorrect(q, run, r, null);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN_HINTS[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁取模） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  updateSubmitState();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* evi_right：找对啦，真聪明（2472ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2472+300=2772 */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, CH_LVS);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars8 = CH_LVS.reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars8, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：winFlow 也实算 lim-1（r17 双实算定版，同启动处；E-M1 修复） */
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
                   !(sv.evidence && sv.evidence.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=播 evi_tut_watch「看！找一找证据」→ 播题面链（evi_c_rainwet 结论句+evi_q1 问句）
   →幽灵手指先指结论卡（读结论锚）再移到答案卡（水洼）→点中（确认链拼播）；
   turn=你来当侦探。时序（家族 G/H；SPEC §4 实长）：watch clip 2928ms → 题面链延至
   t=3300（≥2928+300，禁撞头）；ghost 结论卡锚窗 3200（≥evi_c_rainwet 1776+300，
   q1 2232 仍在播）；移卡窗 900+press 320；演出窗 1600+1300 罩确认链 2472+300=2772；
   分账 3300+3200+900+320+1600+1300+300=10920 ≤16000 ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* evi_tut_watch：看！找一找证据（2928ms） */
  const run = cur;
  await wait(3300 * SPEED);                      /* t=3300 ≥ 2928+300=3228：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 rainwet findexact puddle（教学锚）
  KIDS.voice.queue([conclClip(q.concl), VOICE.q1.key]);   /* 播题面链：结论句+哪张能证明它呀 */
  const card = cardEl(correctIdx(q));
  if (!VERIFY && conclEl) { ghost.toEl(conclEl); ghost.show(); }   /* 先指结论卡（读结论锚） */
  await wait(3200 * SPEED);                      /* ≥1776+300：rainwet 结论句播完+ghost 结论锚停顿 */
  if (cur !== run) return;
  if (!VERIFY && card) ghost.toEl(card);         /* 移到水洼证据卡（0.8s CSS 过渡；q1 问句在播） */
  await wait(900 * SPEED);                       /* ghost 移动窗 */
  if (cur !== run) return;
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(correctIdx(q), true);   /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__evDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  await wait(300 * SPEED);                       /* 收尾（确认链仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.evidence = sv.evidence || {};
  sv.evidence.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来当侦探"在重发后的题面上说（照 batch5-31） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* evi_tut_turn：你来当侦探（1920ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2300);                                      /* ≥1920+300=2220 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再看看想一想 */
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
  replayQuiz(false);                             /* 再听一遍：题面链重播 */
});
conclEl.addEventListener('pointerdown', e => {   /* 点结论卡=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4；节流内仍计主动活动） */
  if (Date.now() - lastConclReplay < 6000) return;   /* 6s 节流：反复重播会盖住儿童看图找证据 */
  lastConclReplay = Date.now();
  replayQuiz(true);                              /* 附结论卡再 pulse（方向级回锚） */
});
submitBtn.addEventListener('pointerdown', e => { /* 提交钮（findall 判定步——契约 F17） */
  e.preventDefault();
  uiSubmit();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapOpt(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#concl') || e.target.closest('#btn-submit')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重播题面链+结论卡 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe）/ 教学"帮"5s 重演示 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      breatheCorrect(q);
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播题面链（结论句+150+q 句）+结论卡 pulse（不动 lastAct） */
    speakQuiz();
    pulseConcl();
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言，照 b28 m4） */

/* ================= 启动（verify 分支由 game-verify.js 接管；迁移 IIFE 已先行） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'evidence', title: '找证据' });   // 存档键 kidsgame_evidence（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（b14 家族修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.EV = {
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
    return { kind: q.kind,                              /* findexact|findall|reverse */
             concl: q.concl,                            /* 结论 id（封闭 20） */
             opts: q.opts.map(o => ({ img: o.img, label: o.label })),   /* 证据卡 {img,label} */
             answer: q.kind === 'findall' ? -1 : q.answer,   /* findexact 真值/reverse 非真卡下标 */
             answers: q.kind === 'findall' ? q.answers.slice() : null, /* findall 三真值下标集（升序） */
             picked: q.kind === 'findall' ? q.picked.slice() : [], /* findall 已勾下标集 */
             text: q.text,
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  tapSubmit() { return uiSubmit(); },
  get bank() { return JSON.parse(JSON.stringify(EV_BANK)); },   /* 结论池深拷贝（verify 独立对账） */
  get conclPool() { return CONCLS20.slice(); },                 /* 封闭 20 结论 id */
  async autoSolve() {                    // UI 路径自动点完当前关（判定步口径：每题恒 1——
    let taps = 0, guard = 0;             // findall 先勾满再提交，勾选不计步；演出窗内重试不 break）
    while (cur && !cur.done && guard++ < 240) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      let r;
      if (q.kind === 'findall') {
        for (const a of q.answers) if (q.picked.indexOf(a) < 0) await uiTapOpt(a);
        r = await uiSubmit();                    // 勾选零惩罚不计步，提交=判定步
      } else r = await uiTapOpt(q.answer);       // findexact 真值 / reverse 非真卡
      if (r === 'right' || r === 'done') taps++;
      else if (r === false) { await wait(150); continue; }   /* 豁免窗/演出窗吞提交（真时钟 4242，T46）——小等重试防热自旋打满 guard */
      else if (guard >= 238) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
