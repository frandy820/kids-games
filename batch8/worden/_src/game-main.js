/* ================= worden 主逻辑（题面/选项渲染 / 点选判定 / 听音重播 / 教学 / 推进）
   玩法：四模式图词配对（pic2word 图→词卡 / sound2pic 听 en 发音→图 / word2pic 词→图认读）。
   题面 zh 指令（晓晓 clip）+ 答案 en 单词发音（AnaNeural clip）双声线是本款特点。
   听音题开题自动播 en clip + 听按钮/喇叭卡可重播（3s 节流防连点轰炸，sayR 不受 flat 门）。
   答错 = 晃动+灰掉可重点零惩罚；首错不 pulse 正确项（q._miss>=2 才高亮）。
   验收钩子：window.WEN = { get currentLevel, get quiz, tapOption(i), autoSolve(), replay() } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/听音重播不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩共性 P1）；
   force=miss≥2 豁免（连错 2 次恰是 pulse 已亮真卡住时刻，语音与高亮同步——6 岁试玩 P1②；
   3 选关卡错光灰掉 miss 封顶 2，豁免自然只发一次） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const qCardEl = $id('q-card'), optsEl = $id('opts'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白/探索点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 听音重播 3s 节流（防连点轰炸）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => optsEl.querySelector('.opt[data-i="' + i + '"]');
/* 判定真值下标（r32 blank 扩：blank 题=字母卡 pick，其余=词/图卡 target）——
   uiPick/教学指向/autoSolve/主线 qidx 驱动全走此单点 */
const correctIdx = q => q.options.indexOf(q.mode === 'blank' ? q.pick : q.target);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 题面语音（读题 sayR 级不受 flat 门；sound2pic=先 en 单词再 zh 指令；
   blank=zh 指令 q3（r32 新键 TODO 注册前静默过渡态，SPEC §R10））
   verify 页 play/queue 均为记录 stub——照常调用供"开题自动播 en clip"计数断言 */
function qSpeak(q) {
  if (!q) return;
  if (q.mode === 'sound2pic') KIDS.voice.queue(['wen_w_' + q.target, VOICE.q2.key]);
  else KIDS.voice.play(VOICE[MODE_Q[q.mode]].key, VOICE[MODE_Q[q.mode]].text);
}

/* ================= 渲染 ================= */
/* 题面卡：pic2word=大图 / word2pic=英文大字（认读对象 §0.19 小写+宽字距）/
   sound2pic=大喇叭可点重播 / blank=图+缺位词（r32 产出题：图示对象+拼写缺位槽） */
function renderQCard(q) {
  qCardEl.className = '';
  qCardEl.classList.add(q.mode);
  if (q.mode === 'pic2word') {
    qCardEl.setAttribute('aria-label', '看图，' + WORDS[q.target].zh);
    qCardEl.innerHTML = wordSvg(q.target);
  } else if (q.mode === 'word2pic') {
    qCardEl.setAttribute('aria-label', '读单词 ' + q.target);
    qCardEl.innerHTML = '<span class="word">' + q.target + '</span>';
  } else if (q.mode === 'blank') {
    /* 缺位词：目标词逐字符渲染，缺位=下划线槽（点对由 uiPick 填字母）；aria 不泄缺字母 */
    qCardEl.setAttribute('aria-label', '看图补字母，' + WORDS[q.target].zh);
    let s = '<div class="bwrap">' + wordSvg(q.target) + '<div class="gapword" aria-hidden="true">';
    for (let k = 0; k < q.target.length; k++) {
      s += k === q.blankPos ? '<span class="gap">_</span>' : '<span>' + q.target[k] + '</span>';
    }
    qCardEl.innerHTML = s + '</div></div>';
  } else {
    qCardEl.setAttribute('aria-label', '听一听，点出你听到的单词');
    qCardEl.innerHTML = ICONS.sndBig + '<span class="tapHint">听</span>';
  }
}
/* 选项区：pic2word=词卡（大字小写）；sound2pic/word2pic=图卡（每词一张简笔 SVG）；
   blank=字母卡（r32：大字母三选一，点对=补缺位） */
function renderOpts(q) {
  optsEl.innerHTML = '';
  q.options.forEach((w, i) => {
    const b = document.createElement('button');
    b.className = 'opt ' + (q.mode === 'pic2word' ? 'wordcard' : (q.mode === 'blank' ? 'lettercard' : 'piccard'));
    b.dataset.i = i;
    if (q.mode === 'pic2word') {
      b.setAttribute('aria-label', '单词 ' + w);
      b.innerHTML = '<span class="word">' + w + '</span>';    // 形近干扰词同为词卡（仅显示不发音）
    } else if (q.mode === 'blank') {
      b.setAttribute('aria-label', '字母 ' + w);
      b.innerHTML = '<span class="letter">' + w + '</span>';
    } else {
      b.setAttribute('aria-label', WORDS[w] ? WORDS[w].zh + '图片' : w);
      b.innerHTML = wordSvg(w);
    }
    optsEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderQCard(q);
  renderOpts(q);
  renderStep();
  if (!state.demo && !state.quiet) qSpeak(q);  // 开题读题（sound2pic 自动播 en clip+zh 指令）；quiet=开场/教学交接改走顺序链（审查 M1/M2）
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
/* 教学"帮"阶段指向：当前题正确选项 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(optEl(i));
}

/* ================= 答题主路径（真实点击 / WEN.tapOption / autoSolve 共用） ================= */
async function uiPick(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked 门，照 batch6/7） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || i < 0) return false;
  const run = cur;                              /* 演出窗口内点重玩会重建 cur——身份守卫防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  const el = optEl(i);

  if (r === 'wrong') {                          /* 答错：晃动+灰掉可重点（零惩罚）；首错不 pulse 正确项 */
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('wrong'); }
    sfx('fail');
    sayW(VOICE.wrong.key, wrongText(q), q._miss >= 2);   /* flat<3 每错必播 / flat≥3 10s 节流+miss≥2 豁免 */
    if (q._miss >= 2) {                         /* 连错 2 次才高亮正确项 */
      const ok = optEl(correctIdx(q));
      if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    }
    await wait(420 * SPEED);
    return 'wrong';
  }
  if (r === 'again') return 'again';            /* 已灰选项：早退零惩罚不计数（防御层） */

  /* ---- 答对 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (q.mode === 'blank') {                     /* r32 产出题：字母填入缺位槽+词完整反馈（同步 DOM 零演出窗，SPEC §R4/§R9）；
                                                   __blankFill=填入动作运行锚（verify/_selftest 取证——renderQuiz 重建后 DOM 态不可查，r30 __dualJumpN 同范式） */
    const gap = qCardEl.querySelector('.gap');
    if (gap) { gap.textContent = q.pick; gap.classList.add('filled'); }
    const gw = qCardEl.querySelector('.gapword');
    if (gw) gw.classList.add('full');
    window.__blankFill = { pick: q.pick, word: q.target,
      n: (window.__blankFill ? window.__blankFill.n : 0) + 1 };
  }
  if (el) {
    el.classList.add('right');
    el.classList.remove('pulse');
    const m = document.createElement('span');
    m.className = 'mark';
    m.innerHTML = ICONS.check;
    el.appendChild(m);
  }
  sfx('coin');
  /* 点对播该词 en 发音（形-音/音-义/认读/产出四模式统一巩固；干扰词永无 clip 不可能被播；
     blank 点对字母后播整词=产出成果正反馈闭环（r32 §R1），新 24 词注册前静默过渡态） */
  KIDS.voice.play('wen_w_' + q.target, q.target);
  if (r === 'done') hopRabbit();
  await wait(950 * SPEED);
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡，丢弃旧续体 */
  state.locked = false;
  if (r === 'done') winFlow();
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.wen && sv.wen.tutSeen);
  if (VERIFY) { if (!freshTut) openingSpeak(); return; }   /* verify 页 stub 记录开场链（autoplay 断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；审查 M1：hint 不得 _stop 切断题面/en 发音） */
}
function openingSpeak() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q.mode === 'sound2pic') KIDS.voice.queue([VOICE.hint.key, 'wen_w_' + q.target, VOICE.q2.key]);
  else KIDS.voice.queue([VOICE.hint.key, VOICE[MODE_Q[q.mode]].key]);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示点对第一题的词卡（点对播 en 发音+绿卡勾，locked 吞输入）→
   重发同关（确定性关卡，题面一致）；帮=指向正确卡；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(optEl(idx));
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示一次完整答对演出
  state.locked = false;
  state.quiet = true;                           // 演示答对的换题渲染不插播下一题指令（审查 M2）
  await uiPick(idx, true);
  const sv = KIDS._save();
  sv.wen = sv.wen || {};
  sv.wen.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来点一点"在重发后的题面上说（照 batch5/6/7） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  const q0 = cur.quizzes[0];                    // 交接顺序链：turn→题面（审查 M2：play(turn) 不得切断题面）
  if (q0.mode === 'sound2pic') KIDS.voice.queue([VOICE.turn.key, 'wen_w_' + q0.target, VOICE.q2.key]);
  else KIDS.voice.queue([VOICE.turn.key, VOICE[MODE_Q[q0.mode]].key]);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重播（听按钮/喇叭卡共用）：sayR 不受 flat 门；3s 节流防连点轰炸（force=测试钩子直通） */
function replaySpeech(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  qSpeak(q);                                    // sound2pic=en 单词+zh 指令；其余=zh 指令
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* §0.20：教学/演出期点兔子不打断 */
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查 m5：对齐重玩门/题面卡防御 */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  replaySpeech(false);
});
/* 喇叭题面卡（sound2pic 重播）/ 图·词题面卡（重听 zh 指令）——3s 节流（force=false） */
qCardEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  qCardEl.classList.remove('bounce'); void qCardEl.offsetWidth; qCardEl.classList.add('bounce');
  const ok = replaySpeech(false);
  if (!ok) {                                    /* 节流窗口内：sound2pic 回退播当前题 en 单词（6 岁跟读复述学习闭环不被打断——试玩 P1①）；其余模式轻提示兜底 */
    const q = cur.quizzes[cur.step];
    if (q && q.mode === 'sound2pic') KIDS.voice.play('wen_w_' + q.target, q.target);
    else if (Date.now() - lastBlankHint > 10000) {
      lastBlankHint = Date.now();
      sayR(VOICE.hint.key, VOICE.hint.text);
    }
  }
});
optsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.opt');
  if (el) { e.preventDefault(); uiPick(Number(el.dataset.i)); return; }
  e.preventDefault();                           /* 点选项区空白：10s 节流轻提示（§0.16，不重置救援钟） */
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（5.5 岁等待极限 15s 内）/ 教学"帮"5s 重演示一次
   救援=重读当前题面（sound2pic=重播 en 发音+zh 指令）；只有本看护与正确推进写 lastAct */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援：重读题面（不受 flat 门，§0.5） */
    if (q) qSpeak(q);
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
  KIDS.init({ game: 'worden', title: '英语单词' });
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
window.WEN = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      solved: !!q.solved };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { mode: q.mode, target: q.target, options: q.options.slice(),
      pick: q.pick, blankPos: q.blankPos,                  /* r32 blank 产出题字段（其余题型 undefined） */
      step: cur.step, answered: !!q.solved, miss: q._miss || 0,
      dead: q.options.map((w, i) => !!(q._dead && q._dead[i])) };
  },
  tapOption(i) { return uiPick(i); },
  replay() { return replaySpeech(true); },      /* 测试钩子：无视节流直通重播 */
  async autoSolve() {                           // UI 路径自动答完当前关（每题点正确卡，走真实流程）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
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
