/* ================= poemfill 主逻辑 r13（句卡渲染 / 点卡入槽与退回 / 填满判定 / 教学 / 救援 / 推进）
   r13（SPEC-BATCH17 §1-r13）：F/R=给上（下）句选下（上）句、O=句序重组、FF=飞花令。
   题面=标题+作者+题面句（lead 青底）+整句空槽（浅黄底，槽内小方格示句长）；
   首字提示=「提示」按钮亮目标句首字（pf_first 通道，题面不预置——r13 去整首朗读脚手架）。
   【重听语义 r13】读音/重听=读题面上句（T46 阶段2 clip 化 cueKeyOf 段键——可见文本朗读不泄答案；
   主动学习重置救援钟 §0.7a）；整首朗读 pf_poem_* 唯一用途=关末奖励（winFlow 播、
   ch4 无单一诗不播；clip 通道禁 TTS 兜底铁律不变）。
   选对=right clip（RIGHT_WAIT 主体）→ 答案句完整朗读（T46 行键 clip，estMs+LINE_TAIL 窗——
   clip 实长 5 字≤2424ms/7 字≤2592ms 均在窗内，模型常量不动）
   →推进（b17 试玩 P2-2 同款紧凑路径，总演出窗=ADV 模型常量）。
   选错→空槽行晃动零惩罚，已入槽句可点槽退回（句卡复活）。
   救援钟口径（§0.7a）：点句卡/退回=探索不重置；填对推进/点读音/点题面句跟读重置。
   救援 14s=pf_first 句+目标句首字亮出+首未对槽 breathe+答案句卡 pulse 三连。
   教学看-帮-独：watch=演示读上句→指空槽→幽灵手指点答案句卡（demo 通道真实入槽，
   返回值存 window.__pfDemoR §0.27）→立即重发同关+turn 交接；帮=指向下一步；独=放手。
   §0.26 错点防重入窗 1000ms + 身份守卫（const run=cur，await 后 cur!==run 丢弃旧续体）。
   验收钩子：window.PF = { get currentLevel, get quiz, tapCard(i), tapBuilt(i), hear(),
   hint(), autoSolve(), start(flat), modeled(flat), get tutorial, get rescues }（getter 拷贝） */
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
/* 整首朗读专用通道（r13 唯一用途=关末奖励；sp_word 同款铁律）：pf_poem_<pid> clip 在场
   →KIDS.voice.play(key)【不带 text】：缺 clip 且无 text=静默不 TTS 兜底；
   播 clip 前先停残留 TTS 防双通道叠音 */
function sayPoem(pid) {
  const key = 'pf_poem_' + pid;
  if (KIDS.voice.clips && KIDS.voice.clips[key]) {
    try { window.speechSynthesis.cancel(); } catch (e) {}
    KIDS.voice.play(key);
    return true;
  }
  console.warn('[poemfill] clip missing, no TTS fallback for poem read (SPEC-BATCH17 1-r13):', key);
  return false;
}

const stageEl = $id('stage'), pcardEl = $id('pcard'), poemTitleEl = $id('poem-title'),
      speakerBtn = $id('speaker-btn'), poemLinesEl = $id('poem-lines'),
      ffPanelEl = $id('ff-panel'), ffCharEl = $id('ff-char'), ffAskEl = $id('ff-ask'), ffSrcEl = $id('ff-src'),
      tableAreaEl = $id('table-area'), cardPoolEl = $id('card-pool'),
      answersEl = $id('answers'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;                            // 救援触发计数（PF.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardPoolEl.querySelector('.scard[data-i="' + i + '"]');
const slotEl = j => poemLinesEl.querySelector('.bslot[data-j="' + j + '"]');
const lineEl = li => poemLinesEl.querySelector('.pline[data-i="' + li + '"]');
const hintBtnEl = () => answersEl.querySelector('#hint-btn');
/* 首张未用的答案句卡（教学演示/帮/救援共用） */
function freeCardFor(q, text) {
  for (let i = 0; i < q.tiles.length; i++) {
    if (!q._used[i] && q.tiles[i] === text) return i;
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
/* 音效（Web Audio 合成）：入格=双音上扬 / 退回=低柔单音（轻反馈不惩罚） */
const charHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const takeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
/* F/R：题面句+答案空槽两行（按诗序排——R 型空槽在前）；O：首句+三空槽四行；
   不参与题面的句隐藏（防同关他题答案经题面泄题） */
function renderPoem(q) {
  poemTitleEl.innerHTML = '《' + q.title + '》<span class="au">' + q.author + '</span>';
  poemLinesEl.innerHTML = '';
  const show = {};
  if (q.type === 'O') {
    show[0] = 'cue';
    for (let j = 0; j < 3; j++) show[j + 1] = 'blank';
  } else {
    show[q.cueIdx] = 'cue';
    show[q.ansIdx] = 'blank';
  }
  q.lines.forEach((line, li) => {
    if (!show[li]) return;
    const isBlank = show[li] === 'blank';
    const pl = document.createElement('div');
    pl.className = 'pline ' + (isBlank ? 'blank-line' : 'lead');
    pl.dataset.i = li;
    pl.setAttribute('aria-label', isBlank ? '待填诗句' : '题面句 ' + line);
    if (isBlank) {
      const j = q.type === 'O' ? li - 1 : 0;
      pl.appendChild(buildSlot(q, j));
    } else {
      for (const c of line) {
        const sp = document.createElement('span');
        sp.className = 'ch';
        sp.textContent = c;
        pl.appendChild(sp);
      }
    }
    poemLinesEl.appendChild(pl);
  });
}
/* 句槽：n 个小方格示句长；首字提示格 .given（q._fc[j] 已亮出的首字） */
function buildSlot(q, j) {
  const b = document.createElement('button');
  b.className = 'bslot';
  b.dataset.j = j;
  b.setAttribute('aria-label', '第' + (j + 1) + '句，空');
  const fc = q._fc && q._fc[j];
  for (let k = 0; k < q.ans[j].length; k++) {
    const cell = document.createElement('i');
    cell.className = 'cell' + (k === 0 && fc ? ' given' : '');
    cell.innerHTML = '<span class="lt">' + (k === 0 && fc ? fc : '') + '</span>';
    b.appendChild(cell);
  }
  return b;
}
/* 句卡池：答案句+干扰句打乱（data-l=句文；点后 .gone=已入槽） */
function renderCards(q) {
  cardPoolEl.innerHTML = '';
  q.tiles.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'scard';
    b.dataset.i = i;
    b.dataset.l = t;
    b.style.background = tileBg(i);
    b.setAttribute('aria-label', '句卡 ' + t);
    b.innerHTML = '<span class="lt">' + t + '</span>';
    cardPoolEl.appendChild(b);
  });
}
/* 作答区：「提示」主按钮（≥96，亮目标句首字不自动填入） */
function renderAnswers(q) {
  answersEl.innerHTML = '';
  const tip = document.createElement('div');
  tip.id = 'tip';
  const tipText = q.type === 'R' ? '想一想上一句是什么'
    : q.type === 'O' ? '把诗句排排队'
    : q.type === 'FF' ? '找一找藏着字的诗句' : '想一想下一句是什么';
  tip.innerHTML = ICONS.ear + '<span>' + tipText + '</span>';
  const b = document.createElement('button');
  b.id = 'hint-btn';
  b.setAttribute('aria-label', '提示，第一句诗的第一个字亮起来');
  b.innerHTML = ICONS.bulb + '<span>提示</span>';
  answersEl.appendChild(tip);
  answersEl.appendChild(b);
}
function fillSlot(j, text) {
  const b = slotEl(j);
  if (!b) return;
  b.classList.add('full');
  b.classList.remove('breathe');
  b.setAttribute('aria-label', '第' + (j + 1) + '句，' + text + '，点一点放回去');
  b.innerHTML = '<span class="lt">' + text + '</span>';
}
function clearSlot(q, j) {
  const b = slotEl(j);
  if (!b) return;
  b.classList.remove('full', 'win', 'breathe');
  b.setAttribute('aria-label', '第' + (j + 1) + '句，空');
  const nb = buildSlot(q, j);                    /* 重建小方格（保留已亮首字 _fc） */
  b.innerHTML = nb.innerHTML;
}
/* 首字提示：亮出目标句首字（q._fc[j] 登记，槽内首格 given 样式） */
function revealFirstChar(q, j) {
  q._fc = q._fc || {};
  if (q._fc[j]) return;
  q._fc[j] = q.ans[j].charAt(0);
  const b = slotEl(j);
  if (b && !b.classList.contains('full')) {
    const nb = buildSlot(q, j);
    b.innerHTML = nb.innerHTML;
  }
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
/* 开场顺序链（§0.5/§0.6）：单通道播任务句（r13 整首朗读退出开场链——去脚手架；
   题面句视觉呈现不自动朗读，主动听=点读音按钮） */
function openingSpeak(turn) {
  if (!cur || !cur.quizzes[cur.step]) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key]);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  q._fc = {};
  if (q.type === 'FF') {                         // 飞花令面板（无诗卡；过关揭示出处）
    pcardEl.style.display = 'none';
    ffPanelEl.classList.add('show');
    ffCharEl.textContent = q.targetChar;
    ffAskEl.textContent = cueSayOf(q);
    ffSrcEl.classList.remove('show');
    ffSrcEl.textContent = '';
  } else {
    pcardEl.style.display = '';
    ffPanelEl.classList.remove('show');
    renderPoem(q);
  }
  renderCards(q);
  renderAnswers(q);
  renderStep();
}

/* ================= 重听题面（r13 定稿语义：读题面句；T46 阶段2 clip 化——cueKeyOf
   段键 play 播（FF=pf_ff_q_问句/F·R·O=pf_l_ 题面行），play 带原文=缺 clip 防御兜底；
   主动学习重置救援钟 §0.7a） ================= */
function uiHear() {
  if (!cur) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  lastAct = Date.now();                          /* 点读音=主动学习动作（§0.7a 例外口径） */
  speakerBtn.classList.remove('bounce'); void speakerBtn.offsetWidth; speakerBtn.classList.add('bounce');
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  KIDS.voice.play(cueKeyOf(q), cueSayOf(q));     /* F/R/O=题面行；FF=题面问句（可见文本，不泄答案） */
  return true;
}
/* 点题面句=跟读该句（T46 clip 行键 pf_l_；主动学习重置救援钟 §0.7a） */
function sentTap(li) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.type === 'FF' || li < 0 || li > 3) return false;
  if (state.locked || state.demo || state.won) { sfx('pop'); flashLine(li); return false; }
  if (li !== q.cueIdx) return false;             // 仅题面句可跟读（空槽行另走 .bslot）
  lastAct = Date.now();
  flashLine(li);
  KIDS.voice.play('pf_l_' + q.pid + '_' + li, q.lines[li]);
  return true;
}
function flashLine(li) {
  const el = lineEl(li);
  if (!el) return;
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

/* ================= 入槽主路径（真实点击 / PF 钩子 / autoSolve / 教学演示共用） ================= */
async function uiTapCard(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engTapTile(cur, i);
  if (r === null) return false;
  const j = q._bt.indexOf(i);                    // 该句卡落入的槽位
  const tEl = cardEl(i);
  if (tEl) tEl.classList.add('gone');
  charHi();
  fillSlot(j, q.tiles[i]);
  if (r === 'right' || r === 'done') {           // 填满且对：反馈+答案句朗读+推进（ADV 窗）
    lastAct = Date.now();                        // 仅正确推进重置救援钟（§0.7a）
    if (state.tut === 'help') {                  // 教学"独"：首次填对放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    clearRescueVisual();
    sayR(VOICE.right.key, VOICE.right.text);     // 填对反馈句=中文 clip（§1）
    sfx('ok');
    const bl = q.type === 'FF' ? null : lineEl(q.type === 'O' ? 1 : q.ansIdx);
    if (bl) bl.classList.add('win-line');         // 答案句整行亮绿（§1"诗句亮"）
    for (let k = 0; k < q.ans.length; k++) {
      const c = slotEl(k);
      if (c) c.classList.add('win');
    }
    if (q.type === 'FF') {                       // 飞花令过关揭示出处（诗名+作者）
      ffSrcEl.textContent = '《' + q.title + '》·' + q.author;
      ffSrcEl.classList.add('show');
    }
    await wait(RIGHT_WAIT * SPEED);              // 等 pf_right clip（≈2.4s）主体播完
    if (cur !== run) return r;
    if (!demo) {                                 // 答案句完整朗读（T46 行键 clip 巩固；ADV 尾窗）
      KIDS.voice.play(lineKeyOf(winLineOf(q)), winLineOf(q));
      await wait((estMs(winLineOf(q)) + LINE_TAIL) * SPEED);
      if (cur !== run) return r;
    }
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
    return r;
  }
  if (r === 'wrong') {                           // 填满且错：空槽行晃动零惩罚，句留槽可退回
    const wli = q.type === 'FF' ? null : (q.type === 'O' ? 1 : q.ansIdx);
    const bl = wli === null ? null : lineEl(wli);
    if (bl) { bl.classList.remove('wig'); void bl.offsetWidth; bl.classList.add('wig'); }
    if (q.type === 'FF') { ffCharEl.classList.remove('wig'); void ffCharEl.offsetWidth; ffCharEl.classList.add('wig'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);       /* 三态（§0.5） */
    if (q.miss >= 2) applyRescueVisual(q);       /* 首错不提示：连错 2 次给视觉线索（§0.7） */
    if (state.tut === 'help') pointHelpNext();
    state.locked = true;                         /* 晃动窗防重入：连点只记一次 miss（§0.26） */
    await wait(1000 * SPEED);              /* b16 试玩 P2-1 定案：错点防重入窗 1000ms */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }
  if (state.tut === 'help') pointHelpNext();     // "帮"：跟着节奏指向下一步
  return r;                                      // 'placed'
}
/* 点已填槽=退回该句卡（探索零惩罚；不重置救援钟） */
function uiTapBuilt(j) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const ti = q._bt[j];                           // 退回前留档句卡索引
  const r = engTapBuilt(cur, j);
  if (r === null) return false;
  takeLo();
  const tEl = cardEl(ti);
  if (tEl) tEl.classList.remove('gone');         // 句卡复活（避免全池重渲染闪烁）
  clearSlot(q, j);
  return r;
}

/* ================= 过关推进（celebrate → 关末整首朗读奖励 → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4，CHAPTERS[i].hint=第 i+1 章预告——家族 F 契约表，
     r13 试玩 P2-3 修复：原表 hint 写本章内容致静态预告错位一格）；生成关预告实算下一关
     难度章 GEN_HINTS[genLevel(f+1).dch-1]（家族 F——禁 (ci+1)%4：取模与 seeded 随机 dch
     仅 1/4 相符，r13 审查 M1/试玩 P2-2 实锤，grid 为正确范本） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  /* r13 关末奖励=整首朗读 clip（ch1-3 一诗一课收束；ch4 无单一诗不播；
     VERIFY 页也走此通道（stub 记录供断言），fire-and-forget 不锁输入 */
  if (cur.pid) sayPoem(cur.pid);
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
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.poemfill && sv.poemfill.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务句单通道（r13 无整首朗读） */
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
  /* 指新目标前清旧 breathe/pulse（逐位引导不清除会叠亮失效） */
  cardPoolEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
  poemLinesEl.querySelectorAll('.bslot.breathe').forEach(k => k.classList.remove('breathe'));
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 同源策略）：先退错句→再点答案句卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (!t) return;
  if (t.act === 'tile') pointGhostAt(cardEl(t.i));
  else pointGhostAt(slotEl(t.j));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.poemfill.tutSeen）
   看=演示读上句（flash+行键 clip 读题面句，T46）→指答案空槽→幽灵手指点答案句卡（demo 通道真实入槽，
   返回值存 window.__pfDemoR §0.27；总时长 ~7s ≤16s；不读答案句防泄题）
   →立即重发同关（确定性关卡，题面一致），"你来填一填"交接 →帮=指向下一步；独=放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(1200 * SPEED);
  const q = cur.quizzes[0];
  flashLine(q.cueIdx);                           /* 演示"读上句"：题面句闪+行键 clip 读（T46） */
  KIDS.voice.play('pf_l_' + q.pid + '_' + q.cueIdx, q.lines[q.cueIdx]);
  await wait(1800 * SPEED);
  pointGhostAt(slotEl(0));                       /* 演示"指空槽"：幽灵手指移向空槽 */
  await wait(1200 * SPEED);
  const i = q._bt[0] >= 0 ? q._bt[0] : freeCardFor(q, q.ans[0]);
  pointGhostAt(cardEl(i));                       /* 幽灵手指移向答案句卡 */
  await wait(900 * SPEED);
  ghost.press();
  await wait(300 * SPEED);
  const demoR = await uiTapCard(i, true);        /* demo 通道豁免 locked 门（演示吞输入） */
  window.__pfDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.poemfill = sv.poemfill || {};
    sv.poemfill.tutSeen = true;
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
  openingSpeak(true);                            // 交接顺序链：turn clip 单通道（§0.6）
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
  uiHear();                                      /* 再听题面句（重置救援钟） */
});
speakerBtn.addEventListener('pointerdown', e => {  // 诗卡读音按钮：读题面句（主动学习动作）
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }
  uiHear();
});
stageEl.addEventListener('pointerdown', e => {
  const t = e.target.closest('.scard');
  if (t) {                                       // 句卡：入槽主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapCard(Number(t.dataset.i));
    return;
  }
  const c = e.target.closest('.bslot');
  if (c) {                                       // 已填槽：退回该句（空槽=轻叮不静默）
    e.preventDefault();
    if (!c.classList.contains('full') || (state.locked || state.demo) && !state.won) {
      sfx('pop');
      return;
    }
    uiTapBuilt(Number(c.dataset.j));
    return;
  }
  if (e.target.closest('#speaker-btn')) return;  // 独立绑定（上方 handler 已处理）
  if (e.target.closest('#hint-btn')) {           // 提示：亮目标句首字（不自动填入，§1-r13）
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) { sfx('pop'); return; }
    doHint();
    return;
  }
  const pl = e.target.closest('.pline');         // 点题面句=跟读（.pline 是 div，置于全部
  if (pl) {                                      //   按钮判定之后防劫持——b15 div 劫持教训）
    e.preventDefault();
    sentTap(Number(pl.dataset.i));
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
/* 提示动作（r13）：F/R/O=pf_first 句+目标句首字亮出（首个未对槽）+该槽 breathe
   （不自动填入；不重置救援钟）；FF=pf_hint 句+读出指定字（发音辅助不泄答案） */
function doHint() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  if (q.type === 'FF') {
    sayR(VOICE.hint.key, VOICE.hint.text);
    KIDS.voice.play('pf_ff_c_' + q.targetChar, q.targetChar);   /* 指定字发音 clip（T46：飞/春/花 3 键在册） */
    ffCharEl.classList.remove('breathe'); void ffCharEl.offsetWidth; ffCharEl.classList.add('breathe');
    return true;
  }
  sayR(VOICE.first.key, VOICE.first.text);
  const t = rescueTarget(q);
  if (!t) return true;
  if (t.act === 'tile') revealFirstChar(q, t.j);
  const c = slotEl(t.j);
  if (c) { c.classList.remove('breathe'); void c.offsetWidth; c.classList.add('breathe'); }
  return true;
}

/* ================= 救援视觉（§0.21/§1-r13）：pf_first 句+目标句首字亮出+首未对槽 breathe
   +答案句卡 pulse 三连（14s 无操作或连错 2 触发；FF=徽章 breathe+答案卡 pulse） ================= */
function clearRescueVisual() {
  poemLinesEl.querySelectorAll('.bslot.breathe').forEach(k => k.classList.remove('breathe'));
  cardPoolEl.querySelectorAll('.pulse').forEach(k => k.classList.remove('pulse'));
  ffCharEl.classList.remove('breathe');
}
function applyRescueVisual(q) {
  const t = rescueTarget(q);
  if (!t) return;
  if (t.act === 'tile') revealFirstChar(q, t.j);       /* 首字亮出（救援级提示） */
  const c = slotEl(t.j);
  if (c) { c.classList.remove('breathe'); void c.offsetWidth; c.classList.add('breathe'); }
  if (q.type === 'FF') {
    ffCharEl.classList.remove('breathe'); void ffCharEl.offsetWidth; ffCharEl.classList.add('breathe');
  }
  /* 对应句卡 pulse 三连：该槽所需句的空闲卡（undo 态同样指引"该放哪张"，§1 救援口径） */
  const needI = t.act === 'tile' ? t.i : freeCardFor(q, q.ans[t.j]);
  if (needI >= 0) {
    const el = cardEl(needI);
    if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
  }
}

/* ================= 无操作看护：14s 救援（pf_first 句+首字亮出+槽 breathe+答案句卡 pulse §0.21）/
   教学"帮"5s 重演示一次。救援钟只被填对推进/点读音/点题面句跟读重置（§0.7a：
   点句卡/退回/错填/空白/兔子/提示不重置） ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   /* 契约 K（r13 试玩 P2-6）：面板/演出层在场不救援——层下 pf_first 语音+首字脉冲穿透层打扰；wordprob/thanks 同款 */
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    sayR(VOICE.first.key, VOICE.first.text);     // 救援=pf_first 句+视觉三连（r13 无整首朗读）
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
  KIDS.init({ game: 'poemfill', title: '古诗连句' });
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
window.PF = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, pid: cur.pid,
      n: cur.quizzes.length, step: cur.step, retries: cur.retries, done: cur.done,
      won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    /* SPEC §1-r13 钩子契约：lines=题面视图（题面句全文/答案句 □ 串/不参与句 ''；FF 无诗卡） */
    const lines = q.type === 'FF' ? null :
      q.lines.map((ln, li) => {
        if (q.type === 'O') return li === 0 ? ln : '□'.repeat(q.ans[li - 1].length);
        if (li === q.cueIdx) return ln;
        if (li === q.ansIdx) return '□'.repeat(q.ans[0].length);
        return '';
      });
    return { kind: 'poemfill', type: q.type, poem: q.title, author: q.author, pid: q.pid,
      lines: lines, cueIdx: q.cueIdx, targetChar: q.targetChar,
      ask: q.type === 'FF' ? cueSayOf(q) : null,
      slots: q.ans.slice(), cards: q.tiles.slice(), built: builtOf(q).slice(),
      step: cur.step, miss: q.miss };
  },
  tapCard(i) { return uiTapCard(i); },
  tapBuilt(i) { const r = uiTapBuilt(i); return r === false ? false : r; },
  hear() { return uiHear(); },
  hint() { return doHint(); },
  start(flat) {                                   /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                             /* 引擎真值直驱 UI 路径：清槽→逐槽点对句卡 */
    let n = 0, quizzes = 0, ok = true;
    while (cur && !cur.done && n++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      while (builtOf(q).some(x => x !== null)) {           // 清空已填（退回探索零惩罚）
        const j = q._bt.map(t => t >= 0).lastIndexOf(true);
        uiTapBuilt(j);
      }
      for (let j = 0; j < q.ans.length; j++) {
        const i = freeCardFor(q, q.ans[j]);
        await uiTapCard(i);
      }
      quizzes++;
      if (!builtOf(q).every((c, k) => c === q.ans[k])) { ok = false; break; }   // 断言填成恰=答案
    }
    return { done: !!(cur && cur.done), quizzes: quizzes, ok: ok };
  },
  modeled(flat) {                                 /* r13 时长模型外查通道（verify_one 对账） */
    return levelDurMs(genLevel(flat | 0));
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
