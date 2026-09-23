/* ================= picto 主逻辑（题面渲染 / 选项交互 / 教学 / 推进）
   玩法（r12 三题型）：toChar 图→字（给甲骨文象形图，从汉字卡点对的）、
   toPic 字→图（给汉字，从象形图卡选对的）、evo 字源推演（演变序列 [古形→甲骨→?]，
   ch2 起干扰恒同形近族——从匹配升到推演，题面只给图形趋势不给答案字形）。
   点对 → 卡亮+播该字组词 clip（音-形-义三绑定识字强化）→ 下一题；
   点错 → 晃动+灰掉可重点（零惩罚）；零识字可玩（题面语音+象形图自解释）。
   estMs 家族定版字面 `const estMs = n => n * 345 + 600;`（n=码点数；四处同步：
   game-data 定义 / 本注释 / game-verify 独立副本断言 / build.py 字面 assert；禁 +300 变体）。
   时长模型（game-data LOOK_MS/MOTOR_MS/RIGHT_MS）：认知步主体（题面语音+观察窗）
   占比 79%，答对演出窗实际值 = 本文件 `await wait(1900 * SPEED)`（=RIGHT_MS，对账口径）。
   验收钩子：window.PIC = { get currentLevel, get quiz, tapOption(i), async autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；救援/开场任务语音/读题不受 flat 门（SPEC §0.5） */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播（原 sayP 行为）；flat≥3 走 10s 节流 sayR（6 岁试玩共性 P1）；
   force=miss≥2 豁免（连错 2 次恰是 breathe 已亮真卡住时刻，语音与高亮同步——6 岁试玩 P1②；
   3 选关卡错光灰掉 miss 封顶 2，豁免自然只发一次） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const promptEl = $id('prompt-card'), optsEl = $id('opts'), stageEl = $id('stage'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点选项区空白轻提示节流（§0.16，10s）
let lastPromptVoice = 0;                        // 点题面重听题面指令节流（10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => optsEl.querySelector('.opt[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
/* 题面：toChar=象形图（古画卷轴框）/ toPic=大汉字 / evo=演变序列行 [古形→甲骨→?]（r12）；
   角标图标=模式线索（非文字依赖）
   选项行：toChar/evo=汉字卡（大字 §0.19）/ toPic=象形图卡 */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q.mode === 'evo') {
    /* 字源推演：两段图形演变+问号收尾——题面不含答案字形（判定=推演非匹配，verify 断言） */
    promptEl.classList.add('evo');
    promptEl.innerHTML = '<span class="evo-row">' + picSvg0(q.target) +
      '<span class="evo-arrow">' + ICONS.arrow + '</span>' + picSvg(q.target) +
      '<span class="evo-arrow">' + ICONS.arrow + '</span>' +
      '<span class="evo-q">?</span></span>' + '<span class="tag">' + ICONS.tagChar + '</span>';
  } else {
    promptEl.classList.remove('evo');
    promptEl.innerHTML = q.mode === 'toChar'
      ? picSvg(q.target) + '<span class="tag">' + ICONS.tagChar + '</span>'
      : '<span class="zi">' + PIC_BY[q.target].ch + '</span>' + '<span class="tag">' + ICONS.tagPic + '</span>';
  }
  promptEl.classList.remove('lit');
  promptEl.setAttribute('aria-label', q.mode === 'toChar' ? '古时候的画'
    : (q.mode === 'evo' ? '字的演变' : PIC_BY[q.target].ch));
  optsEl.innerHTML = '';
  q.options.forEach((k, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.dataset.i = i;
    b.setAttribute('aria-label', (q.mode === 'toPic' ? '古画 ' : '汉字 ') + PIC_BY[k].ch);
    b.innerHTML = q.mode === 'toPic'
      ? picSvg(k)
      : '<span class="zi">' + PIC_BY[k].ch + '</span>';
    optsEl.appendChild(b);
  });
  renderStep();
  if (!VERIFY && !state.demo && cur.step > 0) sayR(qKeyOf(q), qTextOf(q));   /* 非首题：渲染即读题面（首题由 startLevel 队列播） */
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
/* 教学"帮"指向：当前题的正确卡（配对游戏的支架=直接指出答案） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const el = optEl(q.answerIdx);
  if (el) pointGhostAt(el, 'tut');
}
/* 首错不 pulse 正确项（§0.7）：连错 2 次才高亮正确卡 */
function pulseCorrect(q) {
  const el = optEl(q.answerIdx);
  if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
}

/* ================= 选项主路径（真实点击 / PIC.tapOption / autoSolve 共用）
   demo=true 仅教学"看"演示通道（豁免 locked 门，batch5 M1 教训） ================= */
async function uiTapOption(i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const run = cur;                              /* 身份守卫：演出窗口内点重玩会重建 cur，防旧续体错推进（§0.20） */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const el = optEl(i);
  const r = engTapOption(cur, i);
  if (r === null) return null;
  if (r === false || r === 'again') return r;   /* 非法下标 / 已灰卡：早退零惩罚不计数（§0.7） */

  if (r === 'wrong') {                          /* 点错卡：晃动+灰掉可重点（零惩罚）+ sayW 纠错 */
    if (el) {
      el.classList.remove('wig'); void el.offsetWidth;
      el.classList.add('dim', 'wig');
    }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss >= 2);   /* flat<3 每错必播 / flat≥3 10s 节流+miss≥2 豁免（P1②） */
    if (q._miss >= 2) pulseCorrect(q);          /* 首错不 pulse：连错 2 次才高亮正确卡 */
    await wait(420 * SPEED);
    return 'wrong';
  }

  /* ---- 点对 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) el.classList.add('lit');
  promptEl.classList.remove('lit'); void promptEl.offsetWidth; promptEl.classList.add('lit');
  sfx('coin');
  KIDS.voice.play(chKeyOf(q.target), picW(q.target));   /* 读字组词 clip：音-形-义三绑定（§2 识字强化） */
  await wait(1900 * SPEED);
  if (cur !== run) return r;                    /* 身份守卫（§0.20） */
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = (flat == null ? cur.flat : flat);
  /* 家族契约 F/M1（r12 老批契约升级，照 bridge 口径）：静态章末预告=CHAPTERS[floor(f/CH_LEN)+1]
     （hint 存于本章条目、预告下一章语义）；生成关预告禁"章索引加一取模"字面——实算 genLevel(f+1).dch */
  if (f + 1 < STATIC_LEVELS) return CHAPTERS[Math.floor(f / CH_LEN) + 1].hint;
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 家族契约 A：dayEnd 预告传 nextHint(lim-1)（§0.4 防跳章） */ });
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
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.pic && sv.pic.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  const q0 = cur.quizzes[0];
  /* 开场任务语音+首题题面指令顺序播报（sayR 语义不受 flat 门；缺 clip 逐段 TTS 兜底） */
  KIDS.voice.queue([{ key: VOICE.hint.key, text: VOICE.hint.text },
                    { key: qKeyOf(q0), text: qTextOf(q0) }]);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示点对第一题（locked 吞输入，演示通道 demo 豁免）→ 组词亮起播一段；
   独=首次答对放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  pointGhostAt(optEl(q.answerIdx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapOption(q.answerIdx, true);         // demo 通道豁免 locked 门（演示吞输入）
  await wait(1200 * SPEED);                     // 让亮起+组词播一段
  const sv = KIDS._save();
  sv.pic = sv.pic || {};
  sv.pic.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同一确定性关卡（题面一致），"你来找一找"+题面指令在重发后的题面上说 */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const q0 = cur.quizzes[0];
  KIDS.voice.queue([{ key: VOICE.turn.key, text: VOICE.turn.text },
                    { key: qKeyOf(q0), text: qTextOf(q0) }]);
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
hearBtn.addEventListener('pointerdown', e => {   /* 再听一遍：重播题面指令（不节流） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查 m5：对齐重玩门/题面卡防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) KIDS.voice.play(qKeyOf(q), qTextOf(q));
});
promptEl.addEventListener('pointerdown', e => {  /* 点题面：轻反馈（10s 节流重听题面指令，§0.16） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  promptEl.classList.remove('bounce'); void promptEl.offsetWidth; promptEl.classList.add('bounce');
  const now = Date.now();
  if (now - lastPromptVoice > 10000) {
    lastPromptVoice = now;
    const q = cur.quizzes[cur.step];
    /* toPic（字→图）：指令后附带组词 clip——不识字孩子点题面获字音支架（6 岁试玩 P1③） */
    if (q && q.mode === 'toPic') KIDS.voice.queue([{ key: qKeyOf(q), text: qTextOf(q) },
                                                   { key: chKeyOf(q.target), text: picW(q.target) }]);
    else if (q) sayR(qKeyOf(q), qTextOf(q));
  }
});
optsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.opt');
  if (!el) return;
  e.preventDefault();
  uiTapOption(Number(el.dataset.i));
});
stageEl.addEventListener('pointerdown', e => {   /* 点空白（含已灰卡穿透）：10s 节流轻提示（§0.16） */
  if (e.target.closest('.opt') || e.target.closest('#prompt-card')) return;
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {      /* 空白点击不重置救援钟（§0.7a） */
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（重读题面指令）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援=重读题面指令（不受 flat 门，§0.5/§0.7a） */
    if (q) sayR(qKeyOf(q), qTextOf(q)); else sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'picto', title: '象形字' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：启动分支同口径（r12 老批契约升级） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.PIC = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, misses: cur.misses, done: cur.done, won: state.won } : null;
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                  /* SPEC §2 契约字段 + 测试辅助字段（全拷贝） */
      mode: q.mode, target: q.target, char: PIC_BY[q.target].ch,
      options: q.options.slice(), chars: q.options.map(k => PIC_BY[k].ch),
      answerIdx: q.answerIdx, answered: !!q.solved,
      distractors: q.distractors.slice(), near: q.near, nOpt: q.nOpt,
      evo: q.mode === 'evo',                  /* r12 字源推演题标记（演变题面 DOM 断言入口） */
      step: cur.step, miss: q._miss, grey: q._grey.slice()
    };
  },
  tapOption(i) { return uiTapOption(i); },
  async autoSolve() {                         // UI 路径自动点完当前关（每题点正确卡，走真实流程）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 30) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapOption(q.answerIdx);
      if (r === false || r === null || r === 'again') break;
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
