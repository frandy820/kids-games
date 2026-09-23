/* ================= spellen 主逻辑（r16 三题型渲染与判定 / 瓦片点选退回 / 缺字母选项 / 释义拼写
   / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH16 §2-r16）：三题型混排（q0 恒 listen 保教学）——
   listen=大喇叭（sp_word_* 英文 clip §0.32）+目标格 3-6+瓦片池（词字母+干扰 2-3）；
   missing=词卡亮大半字母缺 1-2 位+字母选项卡 3/4 张（b/d 翻转对干扰）；
   meaning=中文释义卡（sp_mean_* 中文 clip）+瓦片池（不自动播词音=主动拼写回忆，可点喇叭听）。
   拼满/填空判对：sp_right+字母名跟读（sp_l_ 预合成 clip，T46）+下一词；判错：晃动零惩罚
   （瓦片型字母留格可点退回；missing 选项不消失可重点）。点喇叭=主动学习重置救援钟；
   点「提示」=首个未拼对格/当前缺位格 breathe（不自动填入）。
   救援钟口径（§0.7a）：点瓦片/选项/退回=探索不重置；拼对推进/听喇叭重置；错拼/空白/兔子不重置。
   教学看-帮-独：watch=演示听音→逐字母点选→拼满（返回值存 window.__spDemoR §0.27）→
   帮=幽灵手指指向下一步；独=首次拼对放手。
   验收钩子：window.SP = { get currentLevel, get quiz, tapTile(i), tapOption(i), tapBuilt(i),
   hear(), autoSolve(), start(flat), get tutorial, get rescues } */
'use strict';

/* r16 审查 M3（column r15 范式）：旧档基迁移——CH_LEN 5→8 使 b16 存量档（5 基 '1-0'..'4-4'）
   键位错位（旧 '2-0'=旧 flat5 误作新 flat8→跳关+章语义错乱）。新基顺序解锁下
   「有跨章首关 C-0 而缺前章第 6 键 (C-1)-5」=旧基残留矛盾态 → 一次性整档重置
   （赶在 KIDS.init 读档前删 localStorage，教学关 ~5min 成本优于静默跳关）。 */
try {
  const raw = localStorage.getItem('kidsgame_spellen');
  if (raw) {
    const lv = (JSON.parse(raw) || {}).levels || {};
    let legacy = false;
    for (let c = 2; c <= 4; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { legacy = true; break; }
    }
    if (legacy) localStorage.removeItem('kidsgame_spellen');
  }
} catch (e) { /* 迁移失败不阻断启动 */ }

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/教学/反馈不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次——不灰化款 miss 无上限，
   必须 === 2（豁免只在每题 miss 首达 2 时发一次） */
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
/* 单词发音专用通道（§0.32 铁律）：sp_word_<word> 英文 clip 在场→KIDS.voice.play(key)
   【不带 text】：core play 缺 clip 且无 text=静默不 TTS 兜底；clip 缺失→宁可不播+console.warn。
   播 clip 前先停残留 TTS（字母跟读）防双通道叠音（core play 只停 audio 不停 speechSynthesis） */
function sayWord(word) {
  const key = 'sp_word_' + word;
  if (KIDS.voice.clips && KIDS.voice.clips[key]) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
    KIDS.voice.play(key);
    return true;
  }
  console.warn('[spellen] clip missing, no TTS fallback for English word (SPEC-BATCH16 0.32):', key);
  return false;
}
/* 中文释义通道（r16）：sp_mean_<word> 预合成中文 clip；缺 clip 允许中文 TTS 兜底
   （中文 TTS 读中文无 §0.32 事故面，兜底为保险层） */
function sayMean(word) {
  const mean = MEANS[word];
  if (!mean) return false;
  KIDS.voice.play('sp_mean_' + word, mean);
  return true;
}
/* 字母名跟读（T46 拆段 2026-09-19）：sp_l_<word> 预合成字母名串 clip（60 词全族在册）；
   缺 clip 回退中文 TTS 顿号串（中文文本无 §0.32 英文事故面，兜底为保险层）——零 keyless */
const sayLetters = word => KIDS.voice.play('sp_l_' + word, word.split('').join('、'));

const stageEl = $id('stage'), boardEl = $id('board'), speakerBtn = $id('speaker-btn'),
      slotsEl = $id('slots'), tableAreaEl = $id('table-area'), tilePoolEl = $id('tile-pool'),
      answersEl = $id('answers'), ghostEl = $id('ghost'), meanCardEl = $id('mean-card'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;                            // 救援触发计数（SP.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const tileEl = i => tilePoolEl.querySelector('.tile[data-i="' + i + '"]');
const cellEl = j => slotsEl.querySelector('.cell[data-j="' + j + '"]');
const hintBtnEl = () => answersEl.querySelector('#hint-btn');
/* 本章全部关位（CH_LEN=8，章完判定/预告入参——r16 基） */
const CH_LVS = [0, 1, 2, 3, 4, 5, 6, 7];
/* 首块未用的目标字母瓦片（教学演示/帮/救援共用；missing 选项同语义） */
function freeTileFor(q, letter) {
  const pool = q.type === 'missing' ? q.opts : q.tiles;
  for (let i = 0; i < pool.length; i++) {
    if (q.type === 'missing' ? pool[i] === letter : (!q._used[i] && pool[i] === letter)) return i;
  }
  return -1;
}

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  speakerBtn.innerHTML = ICONS.speaker;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.speakerSmall;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：入格/填空=双音上扬 / 退回=低柔单音（轻反馈不惩罚） */
const letterHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const takeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
/* 目标格：listen/meaning=word.length 个空格（可点退回）；
   missing=词卡（可见字母格 .given 只读 div + 缺位格 .blank，当前待填 .cur 呼吸） */
function renderSlots(q) {
  slotsEl.innerHTML = '';
  for (let j = 0; j < q.word.length; j++) {
    if (q.type === 'missing' && q.blanks.indexOf(j) >= 0) {          // 缺位格
      const d = document.createElement('div');
      d.className = 'cell blank' + (q.blanks[q.cur] === j ? ' cur' : '');
      d.dataset.j = j;
      d.setAttribute('aria-label', '第' + (j + 1) + '格，缺字母');
      d.innerHTML = '<span class="lt"></span>';
      slotsEl.appendChild(d);
      continue;
    }
    if (q.type === 'missing') {                                       // 可见字母格（只读）
      const d = document.createElement('div');
      d.className = 'cell given';
      d.dataset.j = j;
      d.setAttribute('aria-label', '字母 ' + q.word[j]);
      d.innerHTML = '<span class="lt">' + q.word[j] + '</span>';
      slotsEl.appendChild(d);
      continue;
    }
    const b = document.createElement('button');                       // 瓦片型空格（可退回）
    b.className = 'cell';
    b.dataset.j = j;
    b.setAttribute('aria-label', '第' + (j + 1) + '格，空');
    b.innerHTML = '<span class="lt"></span>';
    slotsEl.appendChild(b);
  }
}
/* 瓦片池：listen/meaning=词字母+干扰打乱 / missing=字母选项卡（.tile 同样式；data-l=字母） */
function renderTiles(q) {
  tilePoolEl.innerHTML = '';
  tilePoolEl.setAttribute('aria-label', q.type === 'missing' ? '字母选项卡' : '字母瓦片池');
  const pool = q.type === 'missing' ? q.opts : q.tiles;
  pool.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.dataset.i = i;
    b.dataset.l = t;
    b.style.background = tileBg(i);
    b.setAttribute('aria-label', '字母 ' + t);
    b.innerHTML = '<span class="lt">' + t + '</span>';
    tilePoolEl.appendChild(b);
  });
}
/* 作答区：「提示」主按钮（≥96，首未对格/当前缺位格 breathe 不自动填入）；tip 文案分型 */
function renderAnswers(q) {
  answersEl.innerHTML = '';
  const tip = document.createElement('div');
  tip.id = 'tip';
  const tipText = q.type === 'missing' ? '看一看，选一选字母'
    : (q.type === 'meaning' ? '想一想英文怎么拼' : '先听一听，再拼一拼');
  tip.innerHTML = ICONS.ear + '<span>' + tipText + '</span>';
  const b = document.createElement('button');
  b.id = 'hint-btn';
  b.setAttribute('aria-label', '提示，第一个字母亮起来');
  b.innerHTML = ICONS.bulb + '<span>提示</span>';
  answersEl.appendChild(tip);
  answersEl.appendChild(b);
}
function fillCell(j, letter) {
  const c = cellEl(j);
  if (!c) return;
  c.classList.add('full');
  c.setAttribute('aria-label', '第' + (j + 1) + '格，字母 ' + letter + '，点一点放回去');
  const lt = c.querySelector('.lt');
  lt.textContent = letter;
  lt.style.animation = 'none'; void lt.offsetWidth; lt.style.animation = '';   // 重触发 lt-in
}
function clearCell(j) {
  const c = cellEl(j);
  if (!c) return;
  c.classList.remove('full', 'win', 'breathe');
  c.setAttribute('aria-label', '第' + (j + 1) + '格，空');
  c.querySelector('.lt').textContent = '';
}
function renderStep() {                          // HUD 本关进度点（r16 每关 8 题）
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < cur.quizzes.length; k++) {
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
    const done = CH_LVS.every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 开场顺序链（§0.5/§0.6，分型）：listen/missing=[开场句, 单词英文 clip]
   meaning=[mean 句, sp_mean_<word> 释义 clip]（不自动播词音=主动拼写回忆，§2-r16）；
   queue 单通道顺序播 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.type === 'meaning') {
    KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.mean.key, 'sp_mean_' + q.word]);
  } else {
    const lead = turn ? VOICE.turn.key
      : (q.type === 'missing' ? VOICE.missing.key : VOICE.hint.key);
    KIDS.voice.queue([lead, 'sp_word_' + q.word]);
  }
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const gameEl = $id('game');
  gameEl.classList.toggle('q-meaning', q.type === 'meaning');   // 释义卡替位喇叭（CSS 通道）
  if (q.type === 'meaning') meanCardEl.textContent = MEANS[q.word];
  renderSlots(q);
  renderTiles(q);
  renderAnswers(q);
  renderStep();
  /* 换题自动播（真实页 quiet 后）：listen/missing=词音（missing 借词音定位缺位）；
     meaning=释义 clip（sp_mean_<word> 中文，不自动播词音=主动回忆锚点，可点喇叭主动听） */
  if (!VERIFY && !state.demo && !state.quiet) {
    if (q.type === 'meaning') sayMean(q.word);
    else sayWord(q.word);
  }
}

/* ================= 听喇叭（重听=主动学习重置救援钟 §0.7a；三型通用） ================= */
function uiHear() {
  if (!cur) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  lastAct = Date.now();                          /* 重听单词=主动学习动作（§0.7a 例外口径） */
  if (q.type !== 'meaning') {
    speakerBtn.classList.remove('bounce'); void speakerBtn.offsetWidth; speakerBtn.classList.add('bounce');
  }
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  return sayWord(q.word);
}

/* ================= 拼词主路径（真实点击 / SP 钩子 / autoSolve / 教学演示共用） ================= */
async function uiTapTile(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engTapTile(cur, i);
  if (r === null) return false;
  const j = q._bt.indexOf(i);                    // 该瓦片落入的格位
  const tEl = tileEl(i);
  if (tEl) tEl.classList.add('gone');
  letterHi();
  fillCell(j, q.tiles[i]);
  if (r === 'right' || r === 'done') {           // 拼满且对：反馈+字母跟读+推进
    lastAct = Date.now();                        // 仅正确推进重置救援钟（§0.7a）
    if (state.tut === 'help') {                  // 教学"独"：首次拼对放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    clearRescueVisual();
    sayR(VOICE.right.key, VOICE.right.text);     // 拼对反馈句=中文 clip（§0.32）
    sfx('ok');
    for (let k = 0; k < q.word.length; k++) {    // 目标格整排亮绿
      const c = cellEl(k);
      if (c) c.classList.add('win');
    }
    await wait(2000 * SPEED);                    // 等 sp_right clip（≈3s）主体播完
    if (cur !== run) return r;
    sayLetters(q.word);                          // 字母名跟读（sp_l_ clip，T46）
    await wait(2000 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
    return r;
  }
  if (r === 'wrong') {                           // 拼满且错：晃动零惩罚，字母留格可退回
    slotsEl.classList.remove('wig'); void slotsEl.offsetWidth; slotsEl.classList.add('wig');
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);       /* 三态（§0.5） */
    if (q.miss >= 2) applyRescueVisual(q);       /* 首错不提示：连错 2 次给视觉线索（§0.7） */
    if (state.tut === 'help') pointHelpNext();
    state.locked = true;                         /* 晃动窗防重入：连点只记一次 miss（§0.26） */
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }
  if (state.tut === 'help') pointHelpNext();     // "帮"：跟着节奏指向下一步
  return r;                                      // 'placed'
}
/* 点已拼格=退回该字母瓦片（探索零惩罚；不重置救援钟；missing 无退回——选项不消失可重点） */
function uiTapBuilt(j) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const ti = q._bt[j];                           // 退回前留档瓦片索引
  const r = engTapBuilt(cur, j);
  if (r === null) return false;
  takeLo();
  const tEl = tileEl(ti);
  if (tEl) tEl.classList.remove('gone');         // 瓦片复活（避免全池重渲染闪烁）
  clearCell(j);
  return r;
}
/* missing 选项点选（真实点击 / SP 钩子 / autoSolve 共用）：对=填当前空，末空推进；
   错=词卡晃动零惩罚（选项不消失），miss 口径同瓦片题 */
async function uiTapOption(i) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;
  const j = q.type === 'missing' ? q.blanks[q.cur] : -1;
  const r = engTapOption(cur, i);
  if (r === null) return false;
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                        // 正确推进重置救援钟（§0.7a）
    state.locked = true;
    clearRescueVisual();
    const c = cellEl(j);
    if (c) { c.classList.add('full', 'win'); c.querySelector('.lt').textContent = q.word[j]; }
    letterHi();
    sayR(VOICE.right.key, VOICE.right.text);
    sfx('ok');
    for (const k of q.blanks) {                  // 全部缺位格亮绿
      const ck = cellEl(k);
      if (ck) ck.classList.add('win');
    }
    await wait(2000 * SPEED);
    if (cur !== run) return r;
    sayLetters(q.word);                          // 字母名跟读（sp_l_ clip，T46）
    await wait(2000 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
    return r;
  }
  if (r === 'placed') {                          // 填对当前空（还有空待填）
    lastAct = Date.now();                        // 填对=推进性动作（同拼满对口径重置）
    const c = cellEl(j);
    if (c) {
      c.classList.add('full');
      c.classList.remove('cur');
      c.querySelector('.lt').textContent = q.word[j];
    }
    letterHi();
    const nextC = cellEl(q.blanks[q.cur]);       // 下一缺位格呼吸指示
    if (nextC) nextC.classList.add('cur');
    if (state.tut === 'help') pointHelpNext();
    return r;
  }
  /* wrong：词卡晃动零惩罚 */
  slotsEl.classList.remove('wig'); void slotsEl.offsetWidth; slotsEl.classList.add('wig');
  sfx('fail');
  sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);
  if (q.miss >= 2) applyRescueVisual(q);
  if (state.tut === 'help') pointHelpNext();
  state.locked = true;
  await wait(520 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(f) {
  const flat = f == null ? cur.flat : f;
  const ci = Math.floor(flat / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4 静态四界）；生成关=下一关实际难度章的 GEN 文案
     （家族 F 实算形态——r14 定版，禁章序取模推进） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, CH_LVS);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars8 = CH_LVS.reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars8, nextHint: nextHint(cur.flat) });
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
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.spellen && sv.spellen.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面 clip 顺序链（§0.5） */
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
  /* 指新目标前清旧 breathe/pulse（numberdet P1-3：逐位引导不清除会叠亮失效） */
  tilePoolEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
  slotsEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 同源策略）：先退错字母→再点目标字母瓦片；
   missing=指向当前空正确字母选项 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (!t) return;
  if (t.act === 'tile' || t.act === 'opt') pointGhostAt(tileEl(t.i));
  else pointGhostAt(cellEl(t.j));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.spellen.tutSeen）
   看=演示听音→逐字母点选→拼满（前 2 字母完整手指演示，其余原地快放控时长）
   →末瓦片走真实拼对路径完整演出（返回值存 window.__spDemoR §0.27）
   →立即重发同关（确定性关卡，题面一致），"你来拼一拼"交接 →帮=指向下一步；独=放手
   （q0 恒 listen=教学演示固定为听音拼词范式，r16 定版） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  sayWord(q.word);                               /* 演示听音（英文 clip 通道） */
  await wait(1500 * SPEED);
  let demoR = null;
  for (let j = 0; j < q.word.length; j++) {
    const i = q._bt[j] >= 0 ? q._bt[j] : freeTileFor(q, q.word[j]);
    const el = tileEl(i);
    if (j < 2) {                                 // 前 2 字母：手指移动+按压+入格（点选语义看清）
      pointGhostAt(el);
      await wait(750 * SPEED);
      ghost.press();
      await wait(260 * SPEED);
      demoR = await uiTapTile(i, true);
      await wait(520 * SPEED);
    } else {                                     // 其余：手指原地快放（时长控制）
      if (el) ghost.press();
      await wait(140 * SPEED);
      demoR = await uiTapTile(i, true);
      await wait(330 * SPEED);
    }
  }
  window.__spDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.spellen = sv.spellen || {};
    sv.spellen.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                             // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip → 题面 clip（§0.6 单通道）
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
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
  uiHear();                                      /* 再听一遍单词（重置救援钟） */
});
stageEl.addEventListener('pointerdown', e => {
  const t = e.target.closest('.tile');
  if (t) {                                       // 瓦片/选项卡：分型分派主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    const q = cur && cur.quizzes[cur.step];
    if (q && q.type === 'missing') uiTapOption(Number(t.dataset.i));
    else uiTapTile(Number(t.dataset.i));
    return;
  }
  const c = e.target.closest('.cell');
  if (c) {                                       // 已拼格：退回该字母（空格/missing 只读格=轻叮不静默）
    e.preventDefault();
    if (c.classList.contains('given') || !c.classList.contains('full') ||
        (state.locked || state.demo) && !state.won) {
      sfx('pop');
      return;
    }
    uiTapBuilt(Number(c.dataset.j));
    return;
  }
  if (e.target.closest('#speaker-btn')) {        // 大喇叭：重听单词（主学习动作）
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) { sfx('pop'); return; }
    uiHear();
    return;
  }
  if (e.target.closest('#hint-btn')) {           // 提示：首未对格/当前缺位格 breathe（不自动填入，§2）
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) { sfx('pop'); return; }
    doHint();
    return;
  }
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});
/* 提示动作：sp_first 句 + 首个未拼对格/当前缺位格 breathe（救援视觉同源，不自动填入；不重置救援钟） */
function doHint() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const t = rescueTarget(q);
  sayR(VOICE.first.key, VOICE.first.text);
  if (!t) return true;
  const c = cellEl(t.j);
  if (c) { c.classList.remove('breathe'); void c.offsetWidth; c.classList.add('breathe'); }
  return true;
}

/* ================= 救援视觉（§0.21/§2）：发音重播+首未对格 breathe+对应瓦片 pulse 三连
   （missing=当前缺位格 breathe+正确选项卡 pulse） ================= */
function clearRescueVisual() {
  slotsEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  tilePoolEl.querySelectorAll('.pulse').forEach(k => k.classList.remove('pulse'));
}
function applyRescueVisual(q) {
  const t = rescueTarget(q);
  if (!t) return;
  const c = cellEl(t.j);
  if (c) { c.classList.remove('breathe'); void c.offsetWidth; c.classList.add('breathe'); }
  /* 对应瓦片/选项 pulse 三连：该格所需字母的空闲瓦片（undo 态同样指引"该放哪块"，§2 救援口径） */
  const needI = t.act === 'tile' ? t.i : (t.act === 'opt' ? t.i : freeTileFor(q, q.word[t.j]));
  if (needI >= 0) {
    const el = tileEl(needI);
    if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  }
}

/* ================= 无操作看护：14s 救援（发音重播+首格 breathe+瓦片 pulse §0.21）/
   教学"帮"5s 重演示一次。救援钟只被拼对推进/听喇叭重置（§0.7a：
   点瓦片/选项/退回/错拼/空白/兔子/提示不重置） ================= */
setInterval(() => {
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   // 契约 K：面板期不救援不计时
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    sayWord(q.word);                             // 救援=单词发音重播（英文 clip 通道）——b16 审查 S1：传词非 quiz 对象
    applyRescueVisual(q);
    rescueCount++;
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
  KIDS.init({ game: 'spellen', title: '英语拼写' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4） */ });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.SP = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const out = { kind: 'spellen', type: q.type, word: q.word,                  /* SPEC §2-r16 钩子契约 */
      step: cur.step, miss: q.miss };
    if (q.type === 'missing') {
      out.blanks = q.blanks.slice();
      out.filled = q.filled.slice();
      out.opts = q.opts.slice();
    } else {
      out.tiles = q.tiles.slice();
      out.built = builtOf(q).slice();
      if (q.type === 'meaning') out.mean = q.mean;
    }
    return out;
  },
  tapTile(i) { return uiTapTile(i); },
  tapOption(i) { return uiTapOption(i); },
  tapBuilt(i) { const r = uiTapBuilt(i); return r === false ? false : r; },
  hear() { return uiHear(); },
  start(flat) {                                   /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                             /* 引擎真值直驱 UI 路径：三型 */
    let n = 0, quizzes = 0, ok = true;
    while (cur && !cur.done && n++ < 80) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.type === 'missing') {
        let m = 0;
        while (!q.solved && m++ < 8) {
          const i = q.opts.indexOf(q.word[q.blanks[q.cur]]);
          if (i < 0 || (await uiTapOption(i)) === null) { ok = false; break; }
        }
      } else {
        while (builtOf(q).some(x => x !== null)) {           // 清空已拼（退回探索零惩罚）
          const j = q._bt.map(t => t >= 0).lastIndexOf(true);
          uiTapBuilt(j);
        }
        for (let j = 0; j < q.word.length; j++) {
          const i = freeTileFor(q, q.word[j]);
          await uiTapTile(i);
        }
      }
      quizzes++;
      if (q.type === 'missing') {                 // 断言填成恰=缺位正确字母序列
        if (q.filled.join('') !== q.blanks.map(j => q.word[j]).join('')) { ok = false; break; }
      } else if (builtOf(q).join('') !== q.word) { ok = false; break; }   // 断言拼成恰=目标词
    }
    return { done: !!(cur && cur.done), quizzes: quizzes, ok: ok };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
