/* ================= zilearn 主逻辑（字理亮相演出 / 点选题流 / 教学 / 推进 / 看护）
   玩法：每关 5 题位——qi0 亮相（0 判定演出锁）→ qi1 听音找字（half×2→right）
   → qi2 词/句挖空 → qi3 组词搭配 → qi4 关末小测（half→right）＝判定 7 点/关。
   语音（r41 两段制，段只接线不注册）：zi_ch_ 系与 zi_st_ 系及 VOICE 8 键；clip 缺失=core
   v1.0 静音兜底（TTS 通道已删），段二 gen_clips 注册后自动有声（SPEC-ZILEARN §R）。
   防泄露：视觉选题（word/sentence/match）题面期绝不播 zi_ch_<目标>（听音题的题面
   语音=目标字音本身，是玩法不是泄露）；救援答案级 breathe 是唯一答案暗示动画。
   验收钩子：window.ZIL = { currentLevel, quiz, tapOpt(i), autoSolve(), start(flat),
   tutorial, _idleHack, _rescueCore, _ziBase, _voiceLog }（b33 坑①：quiz.step=本关
   题位号 0-4，round=multi 题位内步号） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 教学期语音仅前 3 关（flat<3）；救援/题面语音不受 flat 门（家族 §0.5） */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流（家族 J——契约 J 恒字面 cur.flat<3；r1-m1 删零调用 sayR） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const watchEl = $id('watch'), wEv = $id('w-ev'), wSvg = $id('w-svg'), wZi = $id('w-zi'),
      wPy = $id('w-py'), wGlyph = $id('w-glyph'),
      qwrapEl = $id('qwrap'), qPrompt = $id('q-prompt'), qText = $id('q-text'), qSub = $id('q-sub'),
      optsEl = $id('opts'), ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'),
      hearBtn = $id('btn-hear'), replayBtn = $id('btn-replay');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', showUntil: 0, watchP: null };
let lastAct = Date.now();                       /* idle 锚（30s 答案级依据；救援不刷——keepIdle） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B） */
let lastAns = Date.now();                       /* 30s 答案级重复节流锚（keepIdle 配套，独立于 lastAct） */
let wrongChainUntil = 0;                        /* 错反馈链豁免窗终点（真时钟，救援让路——契约 I） */
let helpRedemo = false;
let ghostReason = null;
const __voiceLog = [];                          /* play/queue 键账（verify 防泄露断言依据） */

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => optsEl.querySelector('.opt[data-i="' + i + '"]');
/* PICTO 数据为 0-100 坐标裸 path（batch8 数据源不带 wrapper）——渲染时补 svg 包裹；
   HTML 上下文裸 <path> 是未知元素不渲染（r1-M1：26 字象形面板全空白根因） */
const picSvg = inner => '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';

/* ---------- 语音包装（记录键账 + 缺 clip 由 core 静音兜底） ---------- */
function wireVoiceLog() {
  const op = KIDS.voice.play, oq = KIDS.voice.queue;
  KIDS.voice.play = function (key, text) { __voiceLog.push(['p', key]); return op.call(this, key, text); };
  KIDS.voice.queue = function (parts) { __voiceLog.push(['q', parts.map(p => typeof p === 'string' ? p : p.key)]); return oq.call(this, parts); };
}

/* ---------- 日历限速（SPEC §R5：识字节奏保护——洪恩一天一课 5-6 字调研）
   首日 2 关（10 新字）→ 次日 3 关 → 第 3 日 4 关 → 第 4 日起 6 关/日；
   家长面板「今日多玩关数」（core calendar.bonus 机制原样复用）在基数上追加。
   不走 core calendar.limit（其首日 6 关=30 字/日，对识字主线过快——SPEC 声明） ---------- */
const ZI_DAY_NEW = [2, 3, 4];
function ziBase(day) {                          /* day=dayIndex（1 基）→ 累计可玩关数基数 */
  let s = 0;
  for (let d = 1; d <= Math.min(day, 3); d++) s += ZI_DAY_NEW[d - 1];
  if (day > 3) s += 6 * (day - 3);
  return s;
}
function ziLimit(total) {
  const day = KIDS.calendar.dayIndex();
  return Math.min(total, ziBase(day) + KIDS.calendar.bonusToday());
}
function ziDayDone(keys) {
  const lim = ziLimit(keys.length), sv = KIDS._save();
  for (let i = 0; i < lim; i++) if (!sv.levels[keys[i]]) return false;
  return true;
}

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  wireVoiceLog();
}

/* ================= 渲染 ================= */
function renderStep() {                         // HUD 本关 5 题位进度点
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
  const cEnd = Math.max(4, cur.ch), cStart = Math.max(1, cEnd - 7);   /* r1-m8：章点 8 点滚动窗（生成关 ch 随 flat 无界涨） */
  for (let c = cStart; c <= cEnd; c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ---------- qi0 字理亮相（演出锁防误触；0 判定；每字窗 LOOK_MS≈2.8s，SPEED 缩放）
   pic 字：ev 古形 → svg 甲骨形 → 大字（#watch.p2 切换）＋字音 clip；
   非 pic 字：glyph 字理文案＋大字＋字音 clip（glyphmode 藏侧板） ---------- */
async function runWatch(fast) {
  const run = cur;
  state.locked = true;
  const q = cur.quizzes[0];
  wGlyph.textContent = '';
  for (let k = 0; k < q.chars.length; k++) {
    const ch = q.chars[k], ent = CHARS[ch], pic = PICTO[ch];
    if (cur !== run) return;                    // 反方审查 M3：演出窗内重玩已重建 cur，丢弃旧续体
    watchEl.classList.remove('hide', 'p2', 'glyphmode', 'plainmode');
    qwrapEl.classList.add('hide');
    optsEl.classList.add('hide');
    if (pic) {
      wEv.innerHTML = picSvg(pic.ev || pic.svg);   // 无 ev 字：第一段直接现形（r1-M1 补 svg 包裹）
      wSvg.innerHTML = picSvg(pic.svg);
    } else if (ent.glyph) {
      watchEl.classList.add('glyphmode');
      wGlyph.textContent = ent.glyph;
    } else {
      watchEl.classList.add('plainmode');       // r1-M4：无字理文案=纯大字段（藏侧板与空气泡）
    }
    wZi.textContent = ch;
    wPy.textContent = ent.pyFull;
    KIDS.voice.play(chKey(ch), chText(ch));     // 字音（缺 clip=core 静音兜底，段二自动有声）
    await wait((fast ? 60 : WATCH_P1) * SPEED);
    if (cur !== run) return;
    if (pic) { watchEl.classList.add('p2'); await wait((fast ? 60 : WATCH_P2) * SPEED); }
    else await wait((fast ? 60 : (LOOK_MS - WATCH_P1)) * SPEED);
    if (cur !== run) return;
  }
  if (cur !== run) return;
  watchEl.classList.add('hide');
  engSkipWatch(cur);
  state.locked = false;
  renderQuiz();
}

/* ---------- 点选题面渲染（listen=播题面链；word/sentence/match=视觉题面禁播目标音） ---------- */
function sayQuestion() {
  const q = cur.quizzes[cur.step];
  if (!q || q.kind === 'watch') return;
  const r = q.rounds ? q.rounds[q.ri] : q;
  if (r.sub === 'listen' || q.kind === 'listen') {
    KIDS.voice.queue([{ key: VOICE.listen.key, text: VOICE.listen.text },
                      { key: chKey(r.t), text: chText(r.t) }]);
  } else if (q.kind === 'quiz') {
    KIDS.voice.queue([{ key: VOICE.quiz.key, text: VOICE.quiz.text }, { key: VOICE.word.key, text: VOICE.word.text }]);
  } else {
    KIDS.voice.play(VOICE.word.key, VOICE.word.text);
  }
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderStep();
  if (q.kind === 'watch') { state.watchP = runWatch(state.tut === 'turn'); return; }
  watchEl.classList.add('hide');
  qwrapEl.classList.remove('hide');
  optsEl.classList.remove('hide');
  const r = q.rounds ? q.rounds[q.ri] : q;
  qText.className = '';
  qSub.textContent = '';
  if (q.kind === 'listen' || r.sub === 'listen') {
    qPrompt.innerHTML = ICONS.hear + '<span>' + VOICE.listen.text + '</span>';
    qText.textContent = '';
  } else if (q.kind === 'word' || r.sub === 'word') {
    qPrompt.innerHTML = ICONS.pen + '<span>' + VOICE.word.text + '</span>';
    qText.innerHTML = r.display.split('＿').join('<span class="blank">＿</span>');
  } else if (q.kind === 'sentence') {
    qPrompt.innerHTML = ICONS.pen + '<span>' + VOICE.word.text + '</span>';
    qText.className = 'sent';
    qText.innerHTML = r.display.split('＿').join('<span class="blank">＿</span>');
    qSub.textContent = '读一读，选出生字';
  } else if (q.kind === 'match') {
    qPrompt.innerHTML = ICONS.pen + '<span>给它找个词朋友</span>';
    qText.textContent = r.t;
  }
  optsEl.innerHTML = '';
  const isWord = q.kind === 'match';
  r.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt' + (isWord ? ' wd' : '');
    b.dataset.i = i;
    b.innerHTML = '<span class="zi">' + o + '</span>';
    b.setAttribute('aria-label', (isWord ? '词语 ' : '字 ') + o);
    optsEl.appendChild(b);
  });
  lastAct = Date.now();                         // 开题重置 idle 锚
  lastDir = Date.now();
  if (!VERIFY && !state.demo) sayQuestion();
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
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}

/* ================= 点选主路径（真实点击 / ZIL.tapOpt / autoSolve 共用）
   演出锁=真时钟 state.showUntil（Date.now() 比较，演出期返 null）；watch 期/locked 期拒收 ---------- */
async function uiPick(i) {
  if (!cur || state.locked || state.won || state.demo) return false;
  if (Date.now() < state.showUntil) return null;
  const q = cur.quizzes[cur.step];
  if (!q || q.kind === 'watch') return false;
  const run = cur;
  const r = q.rounds ? q.rounds[q.ri] : q;
  const soft = state.tut === 'turn';            // 教学期不计 miss（任务书：教学不计 miss）
  const ret = engPick(cur, i, soft);
  if (ret === false || ret === null) return false;
  if (ret === 'wrong') {
    lastAct = Date.now();
    const el = optEl(i);
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
    optsEl.classList.remove('shake'); void optsEl.offsetWidth; optsEl.classList.add('shake');
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text);
    wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;   /* 链豁免窗=错反馈链实长(est)+300，真时钟（契约 I） */
    state.showUntil = Date.now() + 800 * SPEED + 140; /* 首错演出锁总窗（b39 总窗口径） */
    if (state.tut === 'turn') pointGhostAt(optEl(engAnswer(cur)), 'tut');
    await wait(800 * SPEED + 200);                    /* await 覆盖演出锁窗（autoSolve 连点不被 null 吞） */
    if (cur !== run) return ret;
    return ret;
  }
  /* half / right / done：点中闪亮+确认链 → 推进 */
  lastAct = Date.now();                         /* half 解锁处刷救援钟（r25 M2 铁律） */
  const el = optEl(i);
  if (el) el.classList.add('good');
  sfx('coin');
  state.locked = true;
  const isSent = q.kind === 'sentence';
  const chain = [{ key: VOICE.right.key, text: VOICE.right.text }];
  if (ret !== 'half') chain.push(isSent ? { key: stKey(cur.flat), text: cur.flat < STATIC_LEVELS ? LEVELS[cur.flat].sentence.text : '' } : { key: chKey(r.t), text: chText(r.t) });
  if (!VERIFY && !state.demo) KIDS.voice.queue(chain);
  const win = ret === 'half'
    ? estMs(VOICE.right.text) + 300
    : estMs(VOICE.right.text) + 150 + estMs(isSent && cur.flat < STATIC_LEVELS ? LEVELS[cur.flat].sentence.text : chText(r.t)) + 300;
  state.showUntil = Date.now() + win * SPEED + 140;   /* 真时钟演出锁（余量 140） */
  await wait(win * SPEED + 140);
  if (cur !== run) return ret;                  /* 反方审查 M3 */
  state.locked = false;
  state.showUntil = 0;
  if (ret === 'half') {
    if (state.tut === 'turn') {                 // 教学期首对 → 放手 solo
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    renderQuiz();
    return ret;
  }
  if (ret === 'done') { winFlow(); return ret; }
  renderQuiz();
  return ret;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  /* r1-M2：+1 取下一关所在章——flat 4 章末 → ci=1 → CHAPTERS[2]=ch2 预告（原 floor(flat/5)
     在章末返回刚学完章自己的 hint，off-by-one；flat 19 → ci=4 → 走 GEN 实算分支） */
  const ci = Math.floor(((flat == null ? cur.flat : flat) + 1) / CH_LEN);
  if (ci < 4) return CHAPTERS[ci + 1].hint;      /* 契约 C7：章末预告下一章 hint（禁右移） */
  return newCharsOf((flat == null ? cur.flat : flat) + 1).length ? GEN_HINT_MORE : GEN_HINT_DONE;  /* 家族 F：生成关实算 */
}
/* 家长进度摘要（任务书：已学字数/今日新字/累计句子——localStorage 本地） */
function ziStats() {
  const sv = KIDS._save() || { levels: {}, zi: {} };
  const zi = sv.zi || {};
  const doneFlats = Object.keys(sv.levels).map(k => (parseInt(k, 10) - 1) * CH_LEN + parseInt(k.split('-')[1], 10)).filter(f => f >= 0);
  const uniq = arr => Object.keys(arr.reduce((m, x) => (m[x] = 1, m), {}));
  const chars = uniq(doneFlats.flatMap(newCharsOf)).length;
  const today = (zi.dayLog || {})[todayStrZi()] || [];
  const todayNew = uniq(today.flatMap(newCharsOf)).length;
  const sents = doneFlats.filter(f => f >= 10 && f < STATIC_LEVELS).length;
  return { chars: chars, todayNew: todayNew, sents: sents };
}
function todayStrZi() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function logDayFlat(flat) {
  const sv = KIDS._save();
  sv.zi = sv.zi || {};
  sv.zi.dayLog = sv.zi.dayLog || {};
  sv.zi.dayLog[todayStrZi()] = (sv.zi.dayLog[todayStrZi()] || []).concat([flat]);
  KIDS.store.persist();
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
  const sv = KIDS._save();
  const k = keyOf(cur.flat);
  if (!sv.levels[k]) logDayFlat(cur.flat);      // 首次通关入当日新字账（重玩不重复计）
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = ziLimit(Infinity);
    const dayDone = lim > 0 && ziDayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                            // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = ziLimit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);               // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat, skipWatch) {
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', showUntil: 0, watchP: null };
  helpRedemo = false;
  lastWrongVoice = 0; wrongChainUntil = 0;
  lastAct = Date.now();
  lastDir = Date.now();
  lastAns = Date.now();
  renderDots();
  if (VERIFY) { renderStep(); engSkipWatch(cur); renderQuiz(); return; }   // verify 页：跳过亮相演出直入题流
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.zi && sv.zi.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  if (skipWatch) { engSkipWatch(cur); renderQuiz(); return; }   /* r1-m4：renderQuiz 内已播题面，外层再播=听音链双排 */
  renderQuiz();                                 // qi0 亮相演出（runWatch 完成后自动入题，逐字接续字音）
}

/* ================= 教学（仅关 1-0 首次）：看→操作→独
   看=演示 1 字亮相（天）+演示 1 轮听音点选（幽灵手指点正确卡）；
   操作=重发同关跳过亮相，孩子完成 1 轮听音（soft 不计 miss），首次答对即放手 solo ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  /* 演示 1：单字亮相「天」（ch1 lv0 首字，known 字） */
  const run = cur;
  const dq = { kind: 'watch', chars: ['天'], ri: 0 };
  cur.quizzes[0] = dq;
  await runWatch(false);
  if (cur !== run) return;
  /* 演示 2：听音点选 1 轮（合成题：目标天+干扰，不走引擎——演示零判定） */
  sayP(VOICE.listen.key, VOICE.listen.text);
  KIDS.voice.play(chKey('天'), chText('天'));
  const o = charOpts('天', 0, mulberry32(7));
  qwrapEl.classList.remove('hide');
  optsEl.classList.remove('hide');
  qPrompt.innerHTML = ICONS.hear + '<span>' + VOICE.listen.text + '</span>';
  qText.textContent = '';
  optsEl.innerHTML = '';
  o.opts.forEach((x, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.dataset.i = i;
    b.innerHTML = '<span class="zi">' + x + '</span>';
    optsEl.appendChild(b);
  });
  await wait(600 * SPEED);
  if (cur !== run) return;
  pointGhostAt(optEl(o.ans), 'tut');
  await wait(1700 * SPEED);
  if (cur !== run) return;
  ghost.press();
  await wait(400 * SPEED);
  const okEl = optEl(o.ans);
  if (okEl) okEl.classList.add('good');
  sfx('coin');
  KIDS.voice.play(VOICE.right.key, VOICE.right.text);
  await wait(2400 * SPEED);   /* 段二实长回填：zi_right=2280ms，2100 会截尾 180ms（SPEC §R9 回填记录） */
  if (cur !== run) return;
  ghost.hide();
  const sv = KIDS._save();
  sv.zi = sv.zi || {};
  sv.zi.tutSeen = true;
  KIDS.store.persist();
  /* 重发同一确定性关，跳过亮相，孩子操作（turn）→首对放手 */
  startLevel(0, true);
  state.tut = 'turn';
  setTimeout(() => { if (state.tut === 'turn') pointGhostAt(optEl(engAnswer(cur)), 'tut'); }, 900);
}

/* ================= 底栏交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat, state.tut === 'turn' || state.tut === 'solo');
});
hearBtn.addEventListener('pointerdown', e => {  // 重听题面（听音题重播题面链；视觉题重播提示音）
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.kind === 'watch') return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  sayQuestion();
});
optsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.opt');
  if (!el) return;
  e.preventDefault();
  uiPick(Number(el.dataset.i));
});

/* ================= 无操作看护：14s 方向级（重播题面语音）/ 30s 答案级（breathe 正确卡+重播）
   keepIdle 纪律：两级救援均不刷 lastAct（lastDir/lastAns 独立节流锚）；
   错反馈链豁免窗内救援让路（契约 I）；面板在场守卫（契约 K） ================= */
function rescueCore() {
  if (!cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;     /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;     /* 错反馈链豁免窗（契约 I） */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  const idle = Date.now() - lastAct;
  if (idle > RESCUE_ANS_MS && Date.now() - lastAns > RESCUE_ANS_REPEAT) {   /* 答案级：静音也能看见 */
    const q = cur.quizzes[cur.step];
    if (q && q.kind !== 'watch') {
      const r = q.rounds ? q.rounds[q.ri] : q;
      const ok = optEl(r.ans);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
      sayQuestion();
    }
    lastAns = Date.now();
    return;
  }
  if (idle > RESCUE_DIR_MS && Date.now() - lastDir > RESCUE_DIR_MS && idle <= RESCUE_ANS_MS) {   /* 方向级 */
    sayQuestion();
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'turn' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointGhostAt(optEl(engAnswer(cur)), 'tut');
  }
}
function rescueTick() {
  if (VERIFY) return;                           /* verify 页救援静默（驱动走 _rescueCore） */
  rescueCore();
}
setInterval(rescueTick, 1000);                  /* 命名函数 rescueTick（契约 K 源码级断言） */

/* ================= 家长面板进度摘要注入（家族面板 + zilearn 学习账） ================= */
function patchParentPanel() {
  const orig = KIDS.parent.panel.bind(KIDS.parent);
  KIDS.parent.panel = function () {
    orig();
    const box = document.querySelector('.k-panel .box');
    if (!box) return;
    const st = ziStats();
    const div = document.createElement('div');
    div.innerHTML = '<div style="font-size:15px;font-weight:700;margin-top:10px">识字进度</div>' +
      '<table>' +
      '<tr><td>已学汉字</td><td>' + st.chars + ' 字</td></tr>' +
      '<tr><td>今日新字</td><td>' + st.todayNew + ' 字</td></tr>' +
      '<tr><td>累计读句</td><td>' + st.sents + ' 句</td></tr>' +
      '</table>';
    const close = box.querySelector('.k-close');
    box.insertBefore(div, close);
  };
}

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'zilearn', title: '识字小课堂' });
  patchParentPanel();
  const lim = ziLimit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && ziDayDone(keys)) {             // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
    for (let i = lim - 1; i >= 0; i--) { if (sv.levels[keys[i]]) { first = i; break; } }   /* r1-m7：停最深已通关（proceed 同语义） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；真实页同暴露 window.ZIL） ================= */
window.ZIL = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, round: cur.ri, misses: cur.misses, done: cur.done, won: state.won } : null;
  },
  get quiz() {                                  /* 当前步快照（不含 answer——测试从 SPEC 独立推导） */
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q || q.kind === 'watch') return { kind: 'watch', chars: q ? q.chars.slice() : [], step: cur.step };
    const r = q.rounds ? q.rounds[q.ri] : q;
    return { kind: q.kind, sub: r.sub || null, target: r.t, display: r.display || null,
             opts: r.opts.slice(), step: cur.step, round: q.rounds ? q.ri : 0 };
  },
  tapOpt(i) { return uiPick(i); },
  async autoSolve() {                           // UI 路径自动答完当前关（每判定点点正确项=7 taps）
    if (state.watchP) { await state.watchP; }
    else if (cur && cur.quizzes[cur.step] && cur.quizzes[cur.step].kind === 'watch') {
      await wait(LOOK_MS * CH_LEN * SPEED + 600);
    }
    let taps = 0;
    while (cur && !cur.done && taps < 40) {
      const a = engAnswer(cur);
      if (a < 0) break;
      const r = await uiPick(a);
      taps++;
      if (r === false || r === null) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  start(flat) { startLevel(flat); },
  get tutorial() { return state.tut; },
  _idleHack(ms) { if (VERIFY) { lastAct = Date.now() - ms; lastDir = Date.now() - ms; lastAns = Date.now() - ms; } },
  _rescueCore() { if (VERIFY) rescueCore(); },
  _ziBase: ziBase,
  _vlogPush(t, k) { __voiceLog.push([t, k]); },     /* verify 页 stub 后的键账桥（防泄露断言依据） */
  get _voiceLog() { return __voiceLog.slice(); },
  get _anchors() { return VERIFY ? { lastAct: lastAct, lastDir: lastDir, lastAns: lastAns } : null; }
};
