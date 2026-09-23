/* ================= money 主逻辑（r15：商品价签/币托盘/购物篮/数字键盘渲染 / 凑钱·买两件提交
   / 键盘找零确认 / 教学 / 推进）
   玩法四型（SPEC-BATCH13 §1 r15）：
   gather 凑零钱含角——商品价签大字（含"X元5角"）+钱币托盘（含 5 角金币）：点币入篮（飞入）、
   再点篮内币移除，合计实时大字；点"给钱啦"提交：合计=价→庆祝；≠价→篮晃动零惩罚（不灰化
   可调整；放币/移除=探索不计 miss）
   pair 买两件合计——两件商品各带价签，先算两价之和再凑正好的钱（多币组合）
   change 找零整元键盘——黑板"付了 X 元，买了 Y 元的东西"，数字键盘（1-9+清空+0+退格）
   输元位数字，"算好啦"确认判定；按键=构造探索不计 miss，确认错/空输入确认才 miss
   jiao 找零带角键盘——键盘+5 角键 toggle；答案"X 元 5 角"（显示禁小数连写）
   答错=晃动不灰化可重点；sayW force=q.miss===2；救援 14s=重读题面+答案视觉线索
   （凑钱期可行性 DP 指币/指提交钮；键盘期 清→位→角→确认 阶梯 breathe），只被正确推进重置。
   验收钩子：window.MN = { get currentLevel, get quiz(){kind,price,priceA,priceB,pay,coins,tray,
   sum,digits,jiao,answer,step,miss}, tapCoin(v), tapTray(i), tapOK(), tapKey(k), tapConfirm(),
   async autoSolve(), get tutorial, get rescues }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/教学不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次——不灰化款 miss 无上限，
   必须 === 2（豁免只在每题 miss 首达 2 时发一次，防豁免变每错必播） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 题面=queue 拼接 clip（§0.23）：全部段 clip 在场走 queue，缺任一走整句 TTS 兜底 */
function sayQ(parts, fullText) {
  if (KIDS.voice.clips && parts.every(p => KIDS.voice.clips[p.key])) {
    KIDS.voice.queue(parts.map(p => p.key));
  } else {
    KIDS.voice.say(fullText);
  }
}

const stageEl = $id('stage'), chipEl = $id('prompt-chip'), coinTrayEl = $id('coin-tray'),
      basketRowEl = $id('basket-row'), basketEl = $id('basket'), sumboxEl = $id('sumbox'),
      tableAreaEl = $id('table-area'), answersEl = $id('answers'), ghostEl = $id('ghost'),
      keypadEl = $id('keypad'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let rescueCount = 0;                            // 救援触发计数（MN.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const coinEl = i => coinTrayEl.querySelector('.coin[data-i="' + i + '"]');
const tcoinEl = j => basketEl.querySelector('.tcoin[data-j="' + j + '"]');
const keyEl = k => keypadEl.querySelector('.key[data-k="' + k + '"]');
const payBtnEl = () => answersEl.querySelector('#pay-btn');
const confirmBtnEl = () => answersEl.querySelector('#confirm-btn');
const coinName = v => v === 0.5 ? '五角' : (v + ' 元');          // 币名（aria/提示）

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  buildKeys();
}
/* 数字键盘 3×4：1-9 + 末行[清空, 0, 退格]（column 家族；键 ≥64，change/jiao 期在场） */
const KEY_LAYOUT = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'del'];
function buildKeys() {
  keypadEl.innerHTML = '';
  KEY_LAYOUT.forEach(k => {
    const b = document.createElement('button');
    b.className = 'key' + (k === 'clr' || k === 'del' ? ' fn' : '');
    b.dataset.k = k;
    if (k === 'clr') { b.textContent = '清空'; b.setAttribute('aria-label', '清空'); }
    else if (k === 'del') { b.textContent = '退格'; b.setAttribute('aria-label', '退格，删一个数字'); }
    else { b.textContent = k; b.setAttribute('aria-label', '数字 ' + k); }
    keypadEl.appendChild(b);
  });
}
/* 音效（Web Audio 合成）：入篮/按键=双音上扬 / 移除=低柔单音（轻反馈不惩罚） */
const coinHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const takeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const keyLo = () => { if (!VERIFY) KIDS.audio.note(659, 0.08, 0, 0.35); };

/* ================= 渲染 ================= */
/* 题面：gather=商品+价签大字 / pair=两件商品+两价签+加号 / change·jiao=小黑板（付 X · 买 Y）
   带角显示一律"X元5角"格式（禁小数连写） */
const chalkTxt = j => j % 2 ? ((j - 1) / 2 + '元5角') : (j / 2 + '元');
function tagHtml(j, id) {                              // 价签（半元 → "X元"/"X元5角"）
  if (j % 2) return '<span id="' + id + '"><b>' + ((j - 1) / 2) + '</b><span class="u">元</span><span class="j5">5角</span></span>';
  return '<span id="' + id + '"><b>' + (j / 2) + '</b><span class="u">元</span></span>';
}
function renderChip(q) {
  if (q.kind === 'change' || q.kind === 'jiao') {
    chipEl.className = 'board';
    chipEl.innerHTML = '<div id="chalk">' +
      '<span class="ln"><span class="lb">付了</span><b>' + fmtYuan(q.pay) + '</b><span class="lb">元</span></span>' +
      '<span class="ln"><span class="lb">买了</span><b>' + chalkTxt(q.price) + '</b><span class="lb">的东西</span></span>' +
      '<span class="ask">找回几元呀？</span></div>';
    return;
  }
  chipEl.className = '';
  if (q.kind === 'pair') {
    const ga = GOODS[q.goods % GOODS.length], gb = GOODS[q.goodsB % GOODS.length];
    chipEl.innerHTML = '<span class="goods">' + ga.svg + '</span>' + tagHtml(q.priceA, 'tagA') +
      '<span class="plus">+</span>' +
      '<span class="goods">' + gb.svg + '</span>' + tagHtml(q.priceB, 'tagB') +
      '<span class="give">点出正好的钱</span>';
    return;
  }
  const g = GOODS[q.goods >= 0 ? q.goods % GOODS.length : 0];
  chipEl.innerHTML = '<span class="goods">' + g.svg + '</span>' +
    '<span class="gname">' + g.name + '</span>' +
    tagHtml(q.price, 'tag') +
    '<span class="give">点出正好的钱</span>';
}
/* 币托盘：每枚圆形人民币按钮（data-i=coins 下标；重渲染还原已入篮 .gone；5 角金币） */
function renderCoins(q) {
  coinTrayEl.innerHTML = '';
  q.coins.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'coin' + (q._taken[i] ? ' gone' : '');
    b.dataset.i = i;
    b.setAttribute('aria-label', coinName(fmtYuan(v)) + '硬币');
    b.innerHTML = coinSvg(fmtYuan(v), 64);
    coinTrayEl.appendChild(b);
  });
}
/* 购物篮：篮内币（data-j=tray 序，点=移除）+ 合计实时大字（=价亮绿） */
function renderBasket(q) {
  basketEl.innerHTML = '';
  if (!q._tray.length) {
    basketEl.innerHTML = '<span class="empty">点点钱币，放进小篮子</span>';
  } else {
    q._tray.forEach((ci, j) => {
      const b = document.createElement('button');
      b.className = 'tcoin';
      b.dataset.j = j;
      b.setAttribute('aria-label', '篮内 ' + coinName(fmtYuan(q.coins[ci])) + '，点一点拿回来');
      b.innerHTML = coinSvg(fmtYuan(q.coins[ci]), 60);
      basketEl.appendChild(b);
    });
  }
  renderSum(q);
}
function renderSum(q) {                          // 合计实时大字；带角="X元5角"格式（=价亮绿）
  const s = sumOf(q);
  const b = sumboxEl.querySelector('b'), u = sumboxEl.querySelector('.u');
  let j5 = sumboxEl.querySelector('.j5');
  if (s % 2 === 1) {
    b.textContent = (s - 1) / 2;
    u.style.display = 'none';
    if (!j5) { j5 = document.createElement('span'); j5.className = 'j5'; sumboxEl.appendChild(j5); }
    j5.textContent = '元5角';
  } else {
    b.textContent = s / 2;
    u.style.display = '';
    if (j5) j5.remove();
  }
  sumboxEl.classList.toggle('ok', s === q.price);
}
/* 作答区：gather/pair="给钱啦"主提交大按钮 / change·jiao=答案显示+（jiao）5 角键+"算好啦"确认 */
function renderAnswers(q) {
  answersEl.innerHTML = '';
  if (isGatherKind(q)) {
    const b = document.createElement('button');
    b.id = 'pay-btn';
    b.setAttribute('aria-label', '给钱啦，提交');
    b.innerHTML = ICONS.hand + '<span>给钱啦</span>';
    answersEl.appendChild(b);
    return;
  }
  const d = document.createElement('div');
  d.id = 'ans-display';
  d.innerHTML = '<b class="ph">?</b><span class="u">元</span>';
  answersEl.appendChild(d);
  if (q.kind === 'jiao') {                        // 5 角键仅带角章在场（toggle）
    const j = document.createElement('button');
    j.id = 'jiao-chip';
    j.setAttribute('aria-label', '加五角');
    j.textContent = '5角';
    answersEl.appendChild(j);
  }
  const c = document.createElement('button');
  c.id = 'confirm-btn';
  c.setAttribute('aria-label', '算好啦，确认');
  c.innerHTML = ICONS.ok + '<span>算好啦</span>';
  answersEl.appendChild(c);
  renderKeyState(q);
}
/* 键盘答案显示同步：元位数字（空='?' 占位）/ 5 角键 .on */
function renderKeyState(q) {
  const d = $id('ans-display');
  if (!d) return;
  const b = d.querySelector('b');
  if (q.digits === '') { b.textContent = '?'; b.classList.add('ph'); }
  else { b.textContent = q.digits; b.classList.remove('ph'); }
  const j = $id('jiao-chip');
  if (j) j.classList.toggle('on', !!q.jiao);
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
function speakQuiz(q) { if (q) sayQ(quizParts(q), qSpeech(q)); }
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn clip）→ 题面段，queue 单通道顺序播 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key].concat(quizParts(q)));
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  const gather = isGatherKind(q);
  const kb = !gather;                             // 键盘期：币托盘/篮收起，数字键盘在场
  coinTrayEl.style.display = kb ? 'none' : '';
  basketRowEl.style.display = kb ? 'none' : '';
  keypadEl.classList.toggle('show', kb);
  renderChip(q);
  if (gather) { renderCoins(q); renderBasket(q); }
  renderAnswers(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) sayQ(quizParts(q), qSpeech(q));  /* 换题读题 sayR 级（不识字依赖听题） */
}

/* ================= 飞行动画：点币→克隆 fixed 飞向购物篮 → 到达后篮内币弹入 ================= */
function flyCoin(fromEl, q) {
  const to = basketEl.getBoundingClientRect();
  const a = fromEl.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'fly-coin';
  f.innerHTML = coinSvg(fmtYuan(q.coins[Number(fromEl.dataset.i)]), 56);
  f.style.left = (a.left + a.width / 2 - 28) + 'px';
  f.style.top = (a.top + a.height / 2 - 28) + 'px';
  document.body.appendChild(f);
  const dx = (to.left + to.width / 2) - (a.left + a.width / 2);
  const dy = (to.top + to.height / 2) - (a.top + a.height / 2);
  requestAnimationFrame(() => {
    f.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.7) rotate(16deg)';
    f.style.opacity = '0';
  });
  setTimeout(() => f.remove(), 480 * SPEED);
}

/* ================= 凑钱主路径（gather/pair；真实点击 / MN 钩子 / autoSolve / 教学演示共用） ================= */
function uiTapCoin(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || !isGatherKind(q)) return false;
  const r = engTapCoin(cur, i);
  if (r === null) return false;
  /* 放币不重置救援钟（审查 m4：探索构造非推进，与移除币/§0.7a 统一口径） */
  const el = coinEl(i);
  if (el) {
    el.classList.remove('breathe');
    el.classList.add('gone');
    flyCoin(el, q);
  }
  coinHi();
  renderSum(q);                                  // 合计实时同步更新（SPEC §1"篮内合计实时大字显示"）
  setTimeout(() => { if (cur && cur.quizzes[cur.step] === q && !q.solved) renderBasket(q); }, 460 * SPEED);
  if (state.tut === 'help') pointHelpNext();     // "帮"：跟着节奏指向下一步
  return r;                                      // 返回新合计（半元）
}
/* 移除篮内币（零惩罚探索；不重置救援钟——构造回退非推进）
   语义注：放币与移除都不计 miss（SPEC §1"零惩罚可调整"），miss 只来自 tapOK 提交错 */
function uiTapTray(j) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q || !isGatherKind(q)) return false;
  const r = engTapTray(cur, j);
  if (r === null) return false;
  takeLo();
  renderBasket(q);
  renderCoins(q);
  return r;
}
/* "给钱啦"提交主路径（gather/pair） */
async function uiTapOK(demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || !isGatherKind(q)) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engOK(cur);
  if (r === null) return false;
  if (r === 'again') return 'again';             // 防御层（理论不可达：kind 已滤）
  const btn = payBtnEl();
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                        // 仅正确推进重置救援钟（§0.7a）
    if (state.tut === 'help') {                  // 教学"独"：首次答对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    sumboxEl.classList.add('ok');
    if (btn) { btn.classList.remove('breathe'); btn.style.background = '#8FBF7F'; btn.style.boxShadow = '0 6px 0 #6FA063'; }
    const tags = chipEl.querySelectorAll('#tag, #tagA, #tagB');
    tags.forEach(t => { t.style.borderStyle = 'solid'; t.style.borderColor = '#5E9455'; t.style.background = '#EAF4E4'; });
    sfx('coin');
    await wait(880 * SPEED);
    if (cur !== run) return r;                   // 演出窗内重玩已重建关卡：丢弃旧续体
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                       // 提交错：篮晃动零惩罚不灰化（SPEC §1）
    basketEl.classList.remove('wig'); void basketEl.offsetWidth; basketEl.classList.add('wig');
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);   /* flat<3 每错必播 / ≥3 节流+豁免恰一次（===2） */
    if (q.miss >= 2) applyRescueVisual(q);       /* 首错不 pulse：连错 2 次给正确视觉线索 */
    if (state.tut === 'help') pointHelpNext();
    state.locked = true;                         /* 晃动窗防重入：连点一次错只记一次 miss（审查 m3，照 column） */
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
  }
  return r;
}

/* ================= 键盘主路径（change/jiao 找零；真实点击 / MN.tapKey / autoSolve 共用）
   按键=构造探索不计 miss（与放币同口径）；超位拒收=轻闪不计数 ---------- */
function uiKey(k, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || isGatherKind(q)) return false;
  const r = engKey(cur, k);
  if (r === null || r === 'again') return false;
  if (r.capped) {                                // 第 3 位数字拒收：显示区轻闪（§0.22 吞输入轻反馈）
    const d = $id('ans-display');
    if (d) { d.classList.remove('nudge'); void d.offsetWidth; d.classList.add('nudge'); }
    sfx('pop');
    return r;
  }
  keyLo();
  renderKeyState(q);
  if (state.tut === 'help') pointHelpNext();
  return r;                                      // {digits, jiao, capped}（拷贝语义）
}
/* "算好啦"确认主路径：唯一判定点——对=推进；错/空输入=miss（与空篮提交同口径） */
async function uiConfirm(demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || isGatherKind(q)) return false;
  const run = cur;                               // 身份守卫
  const r = engConfirm(cur);
  if (r === null) return false;
  if (r === 'again') return 'again';             // gather 期确认：防御层早退零惩罚（§0.7）
  const disp = $id('ans-display');
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                        // 仅正确推进重置救援钟（§0.7a）
    if (state.tut === 'help') {
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    if (disp) { disp.classList.remove('breathe', 'wig'); disp.classList.add('ok'); }
    const cb = confirmBtnEl();
    if (cb) { cb.classList.remove('breathe'); cb.style.background = '#8FBF7F'; cb.style.boxShadow = '0 6px 0 #6FA063'; }
    sfx('coin');
    await wait(880 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                       // 确认错：显示区晃动零惩罚可重点（不灰化 SPEC §1）
    if (disp) { disp.classList.remove('ok', 'breathe'); void disp.offsetWidth; disp.classList.add('wig'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);
    if (q.miss >= 2) applyRescueVisual(q);       /* 首错不 pulse：连错 2 次给 清→位→角→确认 阶梯线索 */
    state.locked = true;                         /* 晃动窗防重入：连点一次错只记一次 miss（审查 m3） */
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
  }
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关实算下一关难度章取 GEN 文案（家族 F，禁取模推进） */
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.money && sv.money.tutSeen);
  if (VERIFY) { openingSpeak(); return; }        /* verify 页恒走开场链（stub 记录供断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5） */
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
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：gather/pair=可行下一步（rescueTarget：提交钮/可加币/应移除币）；
   键盘=清→位→角→确认 阶梯（rescueTarget 同源） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (isGatherKind(q)) {
    const t = rescueTarget(q);
    if (!t) return;
    if (t.act === 'ok') pointGhostAt(payBtnEl());
    else if (t.act === 'add') pointGhostAt(coinEl(t.i));
    else pointGhostAt(tcoinEl(t.j));
  } else {
    const t = rescueTarget(q);
    if (!t) return;
    if (t.act === 'ok') pointGhostAt(confirmBtnEl());
    else if (t.act === 'chip') pointGhostAt($id('jiao-chip'));
    else if (t.act === 'key') pointGhostAt(keyEl(t.k));
    else pointGhostAt(keyEl('clr'));
  }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示凑钱（前 2 枚完整手指演示，其余原地快放控时长）→演示"给钱啦"提交
   →重发同关 → 帮=指向可行下一步；独=首次答对放手。save.money.tutSeen 记住演示已放过（§0.6）
   flat0=dch1 凑零钱含角——演示含 5 角币凑法（r15 起步含五角） ================= */
function greedySolve(q) {                        // 空篮贪心凑法（0.5/1/5/10 币制贪心恒成；教学/自测用）
  const order = q.coins.map((v, i) => ({ v: v, i: i })).sort((a, b) => b.v - a.v);
  let target = q.price;
  const seq = [];
  for (const c of order) {
    if (c.v <= target) { seq.push(c.i); target -= c.v; if (!target) break; }
  }
  return target === 0 ? seq : null;
}
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const seq = greedySolve(q) || [];
  for (let k = 0; k < seq.length; k++) {
    const el = coinEl(seq[k]);
    if (k < 2) {                                 // 前 2 枚：手指移动+按压+飞入（点币语义看清）
      pointGhostAt(el);
      await wait(750 * SPEED);
      ghost.press();
      await wait(260 * SPEED);
      uiTapCoin(seq[k], true);
      await wait(520 * SPEED);
    } else {                                     // 其余：手指原地快放（时长控制）
      if (el) ghost.press();
      await wait(140 * SPEED);
      uiTapCoin(seq[k], true);
      await wait(330 * SPEED);
    }
  }
  await wait(560 * SPEED);                       // 等篮内渲染稳定
  pointGhostAt(payBtnEl());
  await wait(800 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false;                            // 临时解锁走真实路径演示一次完整提交演出
  state.locked = false;
  await uiTapOK(true);
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.money = sv.money || {};
    sv.money.tutSeen = true;
    KIDS.store.persist();
  }
  /* 立即重发同关（确定性关卡，题面一致），"你来付一付"在重发后的题面上说（照 batch5-12） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            // 交接顺序链：turn clip → 题面段（§0.6）
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
function breatheEl(el) {
  if (!el) return;
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默（§0.16） */
    sfx('pop');
    hopRabbit();
    return;
  }
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20：教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 对齐重玩门/题面防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整句重读（queue 拼接） */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo) { sfx('pop'); return; }   /* 吞输入期点题面卡也轻叮（审查 m1，§0.16 主视觉区） */
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.coin');
  if (c) {                                       // 钱币：放币主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapCoin(Number(c.dataset.i));
    return;
  }
  const t = e.target.closest('.tcoin');
  if (t) {                                       // 篮内币：移除
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');
    uiTapTray(Number(t.dataset.j));
    return;
  }
  if (e.target.closest('#pay-btn')) {
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');
    uiTapOK();
    return;
  }
  const k = e.target.closest('.key');
  if (k) {                                       // 数字键盘键（含 5 角键经 #jiao-chip 分支）
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');
    uiKey(k.dataset.k);
    return;
  }
  if (e.target.closest('#jiao-chip')) {
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');
    uiKey('jiao');
    return;
  }
  if (e.target.closest('#confirm-btn')) {
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');
    uiConfirm();
    return;
  }
  if (e.target.closest('#prompt-chip')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 救援视觉（§0.21）：凑钱期=可行性 DP 指引（提交钮/可加币/应移除币 breathe）；
   键盘期=清→位→角→确认 阶梯（rescueTarget 同源：错输入指清空键/缺位指正确数字键/缺角指 5 角键/全对指确认钮） ================= */
function applyRescueVisual(q) {
  if (isGatherKind(q)) {
    const t = rescueTarget(q);
    if (!t) return;
    if (t.act === 'ok') breatheEl(payBtnEl());
    else if (t.act === 'add') breatheEl(coinEl(t.i));
    else breatheEl(tcoinEl(t.j));
    return;
  }
  const t = rescueTarget(q);
  if (!t) return;
  if (t.act === 'ok') breatheEl(confirmBtnEl());
  else if (t.act === 'chip') breatheEl($id('jiao-chip'));
  else if (t.act === 'key') breatheEl(keyEl(t.k));
  else breatheEl(keyEl('clr'));
}

/* ================= 无操作看护：14s 救援（重读题面+答案视觉 §0.21）/ 教学"帮"5s 重演示一次
   救援钟只被正确推进/有效构造重置（§0.7a：错点/空白/按键探索不更新 lastAct） ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   /* r15 审查 M1：契约 K 面板守卫（三款独缺——面板在场期救援静默防叠音） */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];
    if (q) {
      speakQuiz(q);                              // 救援=重读题面（queue 拼接，§0.21）
      applyRescueVisual(q);
      rescueCount++;
    } else sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'money', title: '零钱管家' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 lim%5==0 防跳章） */ });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.MN = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    if (isGatherKind(q)) {                        /* SPEC §1 r15 钩子契约（gather/pair） */
      return { kind: q.kind, price: fmtYuan(q.price),
        priceA: q.kind === 'pair' ? fmtYuan(q.priceA) : null,
        priceB: q.kind === 'pair' ? fmtYuan(q.priceB) : null,
        pay: null, coins: q.coins.map(fmtYuan), tray: q._tray.map(i => fmtYuan(q.coins[i])),
        sum: fmtYuan(sumOf(q)), digits: null, jiao: null, answer: null,
        step: cur.step, miss: q.miss };
    }
    return { kind: q.kind, price: fmtYuan(q.price), priceA: null, priceB: null,
      pay: fmtYuan(q.pay), coins: null, tray: null, sum: null,
      digits: q.digits, jiao: q.jiao, answer: fmtYuan(q.ans),           /* 键盘型：输入态+答案（元数值） */
      step: cur.step, miss: q.miss };
  },
  tapCoin(v) {                                    // v=面值（元）：找第一枚未入篮同面值币
    if (!cur || cur.done) return false;
    const q = cur.quizzes[cur.step];
    if (!q || !isGatherKind(q)) return false;
    const j = Y(v);
    for (let i = 0; i < q.coins.length; i++) {
      if (q.coins[i] === j && !q._taken[i]) { const r = uiTapCoin(i); return r === false ? false : fmtYuan(r); }
    }
    return false;
  },
  tapTray(i) { const r = uiTapTray(i); return r === false ? false : fmtYuan(r); },
  tapOK() { return uiTapOK(); },
  tapKey(k) { return uiKey(k); },                 // k='0'-'9'|'del'|'clr'|'jiao'（r15 键盘契约）
  tapConfirm() { return uiConfirm(); },
  async autoSolve() {                            // UI 路径自动答完当前关（凑钱+键盘走真实流程）
    let n = 0;
    while (cur && !cur.done && n++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (isGatherKind(q)) {
        while (q._tray.length) { uiTapTray(q._tray.length - 1); }   // 清篮回初态
        const seq = greedySolve(q) || [];
        for (const i of seq) { uiTapCoin(i); await wait(30); }
        await wait(520 * SPEED);                 // 等飞入+篮渲染
        await uiTapOK();
      } else {
        uiKey('clr');
        const y = String(Math.floor(q.ans / 2));
        for (const ch of y) { uiKey(ch); await wait(30); }
        if (q.ans % 2 === 1) { uiKey('jiao'); await wait(30); }
        await wait(200 * SPEED);
        await uiConfirm();
      }
    }
    return { done: !!(cur && cur.done), picks: n };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
