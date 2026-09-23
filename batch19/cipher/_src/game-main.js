/* ================= cipher 主逻辑（密码表渲染 / 密文解码槽 / 点卡填槽与退回 /
   拼满自动判定 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH19 §1）：每题=密码表+密文列（上符号下解码槽）+候选卡池。
   点候选卡按序填入首空槽，拼满自动判定：对=绿框+ci_right+下一题；错=晃动+
   sayW+槽自动清空（卡回池零惩罚可重选）。点已填槽=退回；点密文符号=表行闪联
   +朗读映射（主动学习）；ch3 情报例卡可点朗读。
   救援钟口径（§0.7a）：作答（填卡/退回/错答）不重置；唯答对推进重置；
   读题面/点密文符号/点表行/点情报卡=主动学习动作重置。
   教学看-帮-独：watch=演示看密文→查表→逐卡解码（返回值存 window.__ciDemoR §0.27）；
   帮=幽灵手指指向下一张该点的卡（rescueTarget 同源）；独=首次答对放手。
   验收钩子：window.CI = { get currentLevel, get quiz(){table[],cipher[],answer,opts[],
   step,miss}, tapOpt(i), start(flat), async autoSolve(), get tutorial, get rescues }
   （getter 拷贝非活引用） */
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
/* T46 阶段2（2026-09-19）：值词/密码对/引导句 clip 化（原 say() 拼句通道清零）
   —— ci_v_d1-9 数字词 + ci_v_<字> 12 用字 + ci_sym_* 10 符号名 + ci_repr 连接词 + ci_look1/2
   全段在册走 queue 拼播；缺段整句 TTS 兜底（shop-math playChain 先例，防御性死分支） */
const valKey = v => /^[1-9]$/.test(v) ? 'ci_v_d' + v : 'ci_v_' + v;
const playChain = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.voice.say(fallback);
};
const sayVal = v => playChain([valKey(v)], v);
const sayPair = (sid, img) => playChain(['ci_sym_' + sid, 'ci_repr', valKey(img)],
  SYMS[sid].name + '，代表，' + img);

const stageEl = $id('stage'), tableEl = $id('cipher-table'), intelEl = $id('intel'),
      cipherRowEl = $id('cipher-row'), cardPoolEl = $id('card-pool'), tipEl = $id('tip'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'),
      replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastAskAt = 0;                              // 重听题面 3s 节流
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;                            // 救援触发计数（CI.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardPoolEl.querySelector('.card[data-i="' + i + '"]');
const slotEl = j => cipherRowEl.querySelector('.cslot[data-j="' + j + '"]');
const symEl = j => cipherRowEl.querySelector('.csym[data-j="' + j + '"]');
const rowEl = r => tableEl.querySelector('.trow[data-r="' + r + '"]');
const rowIndexOf = (q, sym) => q.table.findIndex(t => t.sym === sym);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.speakerSmall;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：填卡=双音上扬 / 退回=低柔单音（轻反馈不惩罚） */
const cardHi = () => { if (!VERIFY) { KIDS.audio.note(760, 0.09, 0, 0.5); KIDS.audio.note(950, 0.12, 0.07, 0.4); } };
const takeLo = () => { if (!VERIFY) KIDS.audio.note(520, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
/* 密码表：行卡（符号 ↔ 像；ch3 缺角行=?虚线）；行可点=朗读映射（主动学习） */
function renderTable(q) {
  tableEl.innerHTML = '';
  q.table.forEach((t, r) => {
    const b = document.createElement('button');
    b.className = 'trow' + (t.img == null ? ' hiddenrow' : '');
    b.dataset.r = r;
    b.setAttribute('aria-label', t.img == null
      ? SYMS[t.sym].name + '，密码表缺了一角'
      : SYMS[t.sym].name + '，代表' + t.img);
    b.innerHTML = '<span class="tsym">' + SYMS[t.sym].svg + '</span>' +
      '<span class="tarrow">↔</span>' +
      '<span class="timg">' + (t.img == null ? '?' : t.img) + '</span>';
    tableEl.appendChild(b);
  });
}
/* ch3 情报例卡：破译好的对照（符号→明文对）；可点=朗读（主动学习） */
function renderIntel(q) {
  if (!q.example) { intelEl.className = ''; intelEl.innerHTML = ''; return; }
  intelEl.className = 'show';
  intelEl.innerHTML = ICONS.intel + q.example.cipher.map((s, k) =>
    '<span class="ipair"><span class="isym">' + SYMS[s].svg + '</span>' +
    '<span class="iimg">' + q.example.plain[k] + '</span></span>').join('');
}
/* 密文列：每列=上密文符号（可点=表行闪联）+下解码槽（空=虚线点/满=mini 卡可退回） */
function renderCipher(q) {
  cipherRowEl.className = '';
  cipherRowEl.innerHTML = '';
  q.cipher.forEach((s, j) => {
    const col = document.createElement('div');
    col.className = 'ccol';
    const sym = document.createElement('button');
    sym.className = 'csym';
    sym.dataset.j = j;
    sym.setAttribute('aria-label', '密文第' + (j + 1) + '个，' + SYMS[s].name + '，点一点查表');
    sym.innerHTML = SYMS[s].svg;
    const slot = document.createElement('button');
    slot.className = 'cslot';
    slot.dataset.j = j;
    slot.setAttribute('aria-label', '第' + (j + 1) + '个解码槽');
    slot.innerHTML = '<span class="num"></span>';
    col.appendChild(sym); col.appendChild(slot);
    cipherRowEl.appendChild(col);
  });
  updateSlots(q);
}
/* 槽态同步（填卡/退回/清空共用；不动符号避免闪烁） */
function updateSlots(q) {
  q._built.forEach((bi, j) => {
    const el = slotEl(j);
    if (!el) return;
    if (bi == null) { el.className = 'cslot'; el.innerHTML = '<span class="num"></span>'; }
    else {
      el.className = 'cslot full';
      el.innerHTML = '<span class="cv">' + q.opts[bi].v + '</span>';
    }
  });
}
/* 池卡 gone 态同步（错后清空复活共用） */
function updatePoolGone(q) {
  q.opts.forEach((o, i) => {
    const el = cardEl(i);
    if (el) el.classList.toggle('gone', !!q._used[i]);
  });
}
/* 候选卡池：数字/字大字卡 */
function renderPool(q) {
  cardPoolEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.i = i;
    b.setAttribute('aria-label', '候选卡 ' + o.v);
    b.innerHTML = '<span class="cv">' + o.v + '</span>';
    cardPoolEl.appendChild(b);
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
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearRescueVisual();
  renderTable(q);
  renderIntel(q);
  renderCipher(q);
  renderPool(q);
  renderStep();
}

/* ================= 视觉反馈小件 ================= */
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
const wigRow = () => replayAnim(cipherRowEl, 'wig');
const okRow = () => { replayAnim(cipherRowEl, 'okrow'); cipherRowEl.querySelectorAll('.cslot').forEach(el => el.classList.add('ok')); };
function clearRescueVisual() {
  tableEl.querySelectorAll('.flash,.pulse,.breathe').forEach(k => k.classList.remove('flash', 'pulse', 'breathe'));
  intelEl.classList.remove('flash', 'pulse');
  cardPoolEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
  cipherRowEl.querySelectorAll('.flash').forEach(k => k.classList.remove('flash'));
}
/* 方向级线索（梯度脚手架 错1次）：首个空槽对应密文符号的表行 pulse / 缺角→情报卡 pulse */
function applyDirVisual(q) {
  const t = dirTarget(q);
  if (!t) return;
  if (t.act === 'row') replayAnim(rowEl(t.r), 'pulse');
  else replayAnim(intelEl, 'pulse');
}
/* 答案级视觉（miss≥2 / 14s 救援）：正确首卡 breathe（§0.7 首错不 pulse 正确项） */
function applyAnswerVisual(q) {
  const t = rescueTarget(q);
  if (!t) return;
  const el = cardEl(t.i);
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
/* 教学"帮"阶段指向（rescueTarget 同源）：首个空槽的正确值候选卡（教逐位解码） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (t) pointGhostAt(cardEl(t.i));
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 点卡主路径（真实点击 / CI 钩子 / autoSolve / 教学演示共用）
   uiTapOpt(i, demo)：点候选卡 i → 填入第一个空槽 + 数字词/字 TTS 朗读（豁免通道）；
   拼满自动判定——对=ci_right+推进；错=晃动+sayW+槽清空（卡回池零惩罚可重选）。
   失败防重入窗 1000ms（§0.26 b16 定案禁偏离）；身份守卫 const run=cur ================= */
async function uiTapOpt(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) sfx('pop');                       /* §0.22 吞输入轻叮 */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.opts.length) return false;
  const j = engTapOpt(cur, i);
  if (j === null) {                              /* 已用卡/已满 */
    sfx('pop');
    return false;
  }
  cardHi();
  const el = cardEl(i);
  if (el) el.classList.add('gone');
  updateSlots(q);
  sayVal(q.opts[i].v);                           // 数字词/字 clip 串读（T46 阶段2）
  if (state.tut === 'help') scheduleHelpGhost(350);
  const plan = engJudge(cur);
  if (!plan) return 'placed';
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const res = engCommitJudge(cur, plan);
  if (plan.win) {                                // 破译成功：反馈+推进（答对重置救援钟 §0.7a）
    lastAct = Date.now();
    if (state.tut === 'help') {                  // 教学"独"：首次答对放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    clearRescueVisual();
    okRow();
    sfx('ok');
    sayR(VOICE.right.key, VOICE.right.text);
    state.locked = true;
    await wait(2100 * SPEED);                     /* 等 ci_right（≈1.8s）主体播完 */
    if (cur !== run) return res;
    state.locked = false;
    if (res === 'done') winFlow();
    else renderQuiz();
    return res;
  }
  /* 错：晃动+sayW+梯度脚手架（miss=1 方向级表行 pulse / miss≥2 答案级正确卡 breathe）；
     1000ms 防重入窗后槽自动清空（卡回池零惩罚可重选） */
  sfx('fail');
  sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);
  wigRow();
  if (q.miss === 1) applyDirVisual(q);           /* 错 1 次闪方向级线索（任务书梯度定案） */
  else applyAnswerVisual(q);                     /* miss≥2 才出答案级（不提前） */
  if (state.tut === 'help') scheduleHelpGhost(400);
  state.locked = true;
  await wait(1000 * SPEED);                      /* 错点防重入窗 1000ms（b16 定案） */
  if (cur !== run) return res;
  for (let k = q._built.length - 1; k >= 0; k--) {
    if (q._built[k] == null) continue;
    if (q.opts[q._built[k]].v === q.answer[k]) continue;   /* 试玩 P1：评对的位保留（built=卡 idx，按值对位——
                                                              idx 与 answer 值比较恒不等=全清，本批复验实锤） */
    engTapSlot(cur, k);                          /* 错位清空：卡回池可重选（零惩罚） */
  }
  updateSlots(q);
  updatePoolGone(q);
  state.locked = false;
  return res;
}

/* ================= 点已填槽=退回该卡（改答零惩罚，§0.7a 不重置救援钟） ================= */
function uiTapSlot(j) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q._built.length) return false;
  const r = engTapSlot(cur, j);
  if (r === null) { sfx('pop'); return false; }  // 空槽=轻叮不静默
  takeLo();
  updateSlots(q);
  updatePoolGone(q);
  if (state.tut === 'help') scheduleHelpGhost(350);
  return r;
}

/* ================= 查表闪联（主动学习，§0.7a 重置救援钟）
   点密文符号=表行闪+朗读映射；缺角行→情报例卡闪+读情报推得的映射 ================= */
function uiTapSym(j) {
  if (!cur) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof j !== 'number' || j < 0 || j >= q.cipher.length) return false;
  if (state.locked || state.demo || state.won) { sfx('pop'); replayAnim(symEl(j), 'flash'); return false; }
  lastAct = Date.now();
  replayAnim(symEl(j), 'flash');
  const r = rowIndexOf(q, q.cipher[j]);
  if (r >= 0 && q.table[r].img != null) {
    replayAnim(rowEl(r), 'flash');
    sayPair(q.cipher[j], q.table[r].img);
  } else {
    replayAnim(intelEl, 'flash');
    const truthV = q.truth && q.truth[q.cipher[j]];
    if (truthV != null) sayPair(q.cipher[j], truthV);
    else KIDS.voice.play('ci_look1', '看破译好的情报，推一推');   /* T46：字面句 clip 化 */
  }
  return true;
}
/* 点表行=朗读该行映射（主动学习重置） */
function uiTapRow(r) {
  if (!cur) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof r !== 'number' || r < 0 || r >= q.table.length) return false;
  if (state.locked || state.demo || state.won) { sfx('pop'); replayAnim(rowEl(r), 'flash'); return false; }
  lastAct = Date.now();
  replayAnim(rowEl(r), 'flash');
  const t = q.table[r];
  if (t.img != null) sayPair(t.sym, t.img);
  else {
    replayAnim(intelEl, 'flash');
    const truthV = q.truth && q.truth[t.sym];
    if (truthV != null) sayPair(t.sym, truthV);
    else KIDS.voice.play('ci_look2', '这一行缺了一角，看情报推一推');   /* T46：字面句 clip 化 */
  }
  return true;
}
/* 点情报例卡=朗读整条情报（主动学习重置；T46 阶段2：密码对段复用 queue 拼播，零新键） */
function uiTapIntel() {
  if (!cur) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved || !q.example) return false;
  if (state.locked || state.demo || state.won) { sfx('pop'); replayAnim(intelEl, 'flash'); return false; }
  lastAct = Date.now();
  replayAnim(intelEl, 'flash');
  const parts = q.example.cipher.map((s, k) => SYMS[s].name + '，代表，' + q.example.plain[k]);
  const chain = [];
  q.example.cipher.forEach((s, k) => { chain.push('ci_sym_' + s, 'ci_repr', valKey(q.example.plain[k])); });
  playChain(chain, '情报写着，' + parts.join('，'));
  return true;
}
/* 读题面（主动学习重置 §0.7a）：hint clip → 密文符号名串（TTS 兜底） */
function readAsk() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  lastAct = Date.now();
  replayAnim(tipEl, 'flash');
  /* T46 阶段2：hint clip + 密文符号名段（ci_sym_*）合并单条 queue 链（原 say 两连发互相截断） */
  const names = q.cipher.map(s => SYMS[s].name).join('，');
  playChain([VOICE.hint.key].concat(q.cipher.map(s => 'ci_sym_' + s)),
             VOICE.hint.text + '，把' + names + '，破译出来');
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
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.cipher && sv.cipher.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  openingSpeak();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.cipher.tutSeen）
   看=演示看密文（密文行 breathe）→查表（首符表行 flash）→逐卡解码（前 2 张完整
   手指演示，其余快放控时长）→拼满判对（demo 通道，返回值存 window.__ciDemoR §0.27）
   →立即重发同关（确定性关卡，题面一致），"你来破一破"交接 →帮=指向下一张该点的卡；
   独=首次答对放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  cipherRowEl.classList.add('breathe');          /* 看密文：符号呼吸 1.1s */
  await wait(1100 * SPEED);
  cipherRowEl.classList.remove('breathe');
  const r0 = rowIndexOf(q, q.cipher[0]);
  if (r0 >= 0 && q.table[r0].img != null) replayAnim(rowEl(r0), 'flash');   /* 查表：首符行闪 */
  else replayAnim(intelEl, 'flash');
  await wait(1100 * SPEED);
  let demoR = null;
  for (let k = 0; k < q.answer.length; k++) {
    const i = freeOptFor(q, q.answer[k]);
    if (i < 0) break;
    if (k < 2) {                                 // 前 2 张：手指移动+按压+入槽（点选语义看清）
      pointGhostAt(cardEl(i));
      await wait(720 * SPEED);
      ghost.press();
      await wait(260 * SPEED);
      demoR = await uiTapOpt(i, true);
      await wait(430 * SPEED);
    } else {                                     // 其余：手指原地快放（时长控制 ≤16s）
      ghost.press();
      await wait(150 * SPEED);
      demoR = await uiTapOpt(i, true);
      await wait(240 * SPEED);
    }
  }
  window.__ciDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.cipher = sv.cipher || {};
    sv.cipher.tutSeen = true;
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
  openingSpeak(true);                            // 交接顺序链：ci_tut_turn（§0.6 单通道）
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
tipEl.addEventListener('pointerdown', e => {     // 点题面条=重听题句（主动学习重置）
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 吞输入期轻叮 */
  const now = Date.now();
  if (now - lastAskAt < 3000) return;
  lastAskAt = now;
  readAsk();
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.card');
  if (c) {                                       // 候选卡：填槽主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapOpt(Number(c.dataset.i));
    return;
  }
  const sl = e.target.closest('.cslot');
  if (sl) {                                      // 解码槽：退回该卡（空槽=轻叮不静默）
    e.preventDefault();
    uiTapSlot(Number(sl.dataset.j));
    return;
  }
  const sy = e.target.closest('.csym');
  if (sy) {                                      // 密文符号：查表闪联（主动学习）
    e.preventDefault();
    uiTapSym(Number(sy.dataset.j));
    return;
  }
  const tr = e.target.closest('.trow');
  if (tr) {                                      // 表行：朗读映射（主动学习）
    e.preventDefault();
    uiTapRow(Number(tr.dataset.r));
    return;
  }
  if (e.target.closest('#intel')) {              // 情报例卡：朗读（主动学习）
    e.preventDefault();
    uiTapIntel();
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

/* ================= 无操作看护：14s 救援（§0.21/§1：题句重读+正确首卡 breathe+
   密码表对应行 pulse）/ 教学"帮"5s 重演示一次。救援钟只被答对推进/读题面/
   查表闪联等主动学习重置（§0.7a：作答/错答/空白/兔子不重置） ================= */
function rescueAct(q) {
  rescueCount++;
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 题句重读 */
  clearRescueVisual();
  applyDirVisual(q);                             /* 密码表对应行 pulse（§1 救援口径·方向级恒给） */
  if (q.miss >= 2) applyAnswerVisual(q);         /* 正确首卡 breathe=答案级：miss≥2 才出（审查 m1：b18 梯度定案统一） */
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
  KIDS.init({ game: 'cipher', title: '小兔密码破译' });
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
window.CI = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: 'cipher', dch: cur.dch,      /* SPEC §1 钩子契约 + 测试辅助字段（全拷贝） */
      table: q.table.map(t => ({ sym: t.sym, img: t.img })),
      hidden: q.hidden.slice(),
      example: q.example ? { cipher: q.example.cipher.slice(), plain: q.example.plain.slice() } : null,
      cipher: q.cipher.slice(),
      answer: q.answer.slice(),
      opts: q.opts.map(o => ({ v: o.v })),
      built: q._built.slice(),
      step: cur.step, miss: q.miss };
  },
  tapOpt(i) { return uiTapOpt(i); },
  tapSlot(j) { return uiTapSlot(j); },
  start(flat) {                                  /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                            /* UI 路径自动通关：清空已填→按答案逐位填卡 */
    const run = cur;                             // 身份守卫：winFlow 延迟 proceed 换关即中止
    let n = 0, quizzes = 0, ok = true;
    while (cur && cur === run && !cur.done && n++ < 40) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      for (let k = q._built.length - 1; k >= 0; k--) {
        if (q._built[k] != null && uiTapSlot(k) === false) { ok = false; break; }
      }
      if (!ok) break;
      let r = null;
      for (let m = 0; m < q.answer.length; m++) {
        const i = freeOptFor(q, q.answer[m]);
        r = await uiTapOpt(i);
        if (r === false || r === 'wrong') { ok = false; break; }
      }
      quizzes++;
      if (!ok) break;
      if (r !== 'right' && r !== 'done') { ok = false; break; }
    }
    return { done: !!(cur && cur.done && cur === run), quizzes: quizzes, ok: ok };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
