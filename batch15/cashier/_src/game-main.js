/* ================= cashier 主逻辑（柜台渲染 / 币盘与找零托盘 / 提交判定 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH15 §1）：小动物顾客拿 1 件商品+付 1 张大额纸币（10/20/50 只展示）→
   黑板"商品 Y 元 / 付了 X 元"→ 点币盘（5/2/1/0.5 元×5 固定供给）把找零点入托盘，合计实时大字
   → 点"找零"提交：总额=找零→顾客道谢离场下一题（组合开放，总额判对不判组成）；
   ≠找零→托盘晃动零惩罚可调整（多了点托盘币移回/少了补）；空提交不计次（nudge 轻反馈）。
   错提交分超额/差额 → cas_q_more/cas_q_less 方向轻提示（10s 节流，与 cas_wrong queue 顺序链）。
   救援 14s＝重读题面+「要找 Z 元」数字卡亮起+最小组合第一枚币 breathe（miss≥2 同款视觉）。
   救援钟口径（§0.7a）：放币/移币=探索不重置；提交正确/读题/题面卡重置；错提交/空白/兔子不重置。
   教学看-帮-独：watch=演示一笔找零（贪心逐枚）→帮=幽灵手指指可行下一步→独=首次提交对放手；
   演示返回值存 window.__csDemoR（§0.27）。
   验收钩子：window.CS = { get currentLevel, get quiz(){price,paid,change,tray,step,miss},
   tapCoin(v), tapTrayCoin(i), tapSubmit(), autoSolve(), start(flat), get tutorial,
   get rescues }（getter 拷贝非活引用；autoSolve=贪心 5→2→1→0.5 逐枚，断言总额恰=change） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/教学/反馈不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force 豁免恰一次——不灰化款 miss 无上限，
   必须 === 2（豁免只在每题 miss 首达 2 时发一次）。tail=方向轻提示（§1 more/less，节流窗外）：
   与主句 queue 顺序链单通道播出，不截断（§0.6 精神） */
let lastWrongVoice = 0;
const sayW = (key, text, force, tail) => {
  if (!cur) return;
  if (cur.flat < 3) {
    if (tail) KIDS.voice.queue([key, tail.key]); else KIDS.voice.play(key, text);
    return;
  }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) {
    lastWrongVoice = now;
    if (tail) KIDS.voice.queue([key, tail.key]); else KIDS.voice.play(key, text);
  }
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
      findCardEl = $id('find-card'), tableAreaEl = $id('table-area'), answersEl = $id('answers'),
      ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let helpRedemo = false;
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let lastMoreLess = 0;                           // 超额/差额方向轻提示节流（§1，10s）
let rescueCount = 0;                            // 救援触发计数（CS.rescues）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const TRAY_LIST = trayCoins();                  // 固定币盘 20 枚（5元×5+2元×5+1元×5+5角×5）
const coinEl = i => coinTrayEl.querySelector('.coin[data-i="' + i + '"]');
const coinElFor = v => {                        // 首枚该面值未入盘币（同面值可互换）
  const els = coinTrayEl.querySelectorAll('.coin[data-v="' + v + '"]');
  for (let k = 0; k < els.length; k++) if (!els[k].classList.contains('gone')) return els[k];
  return null;
};
const goneElFor = v => {                        // 首枚该面值已入盘币（移回时还原）
  const els = coinTrayEl.querySelectorAll('.coin[data-v="' + v + '"]');
  for (let k = 0; k < els.length; k++) if (els[k].classList.contains('gone')) return els[k];
  return null;
};
const tcoinEl = j => basketEl.querySelector('.tcoin[data-j="' + j + '"]');
const payBtnEl = () => answersEl.querySelector('#pay-btn');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：入盘=双音上扬 / 移回=低柔单音（轻反馈不惩罚） */
const coinHi = () => { if (!VERIFY) { KIDS.audio.note(880, 0.09, 0, 0.5); KIDS.audio.note(1108, 0.12, 0.07, 0.4); } };
const takeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
/* 金额文本（半元→"X 元"/"X 元 5 角"/纯"5 角"）：el 需含 .main/.mu/.jj 结构 */
function setMoneyText(el, j) {
  const int = Math.floor(j / 2), half = j % 2 === 1;
  const main = el.querySelector('.main'), mu = el.querySelector('.mu');
  main.textContent = String(int);
  main.style.display = int === 0 ? 'none' : '';
  mu.style.display = int === 0 ? 'none' : '';
  el.classList.toggle('half', half);
}
/* 题面：顾客+商品+小黑板（商品 Y 元 / 付了 X 元，价 X.5 带"5 角"）+ 大额纸币（只读） */
function renderChip(q) {
  const g = GOODS[q.goods % GOODS.length], c = CUSTOMERS[q.customer % CUSTOMERS.length];
  const payY = q.pay / 2;
  const priceHalf = q.price % 2 === 1;
  const pInt = (q.price - (priceHalf ? 1 : 0)) / 2;
  chipEl.innerHTML = '<span class="cust" aria-hidden="true">' + c.svg + '</span>' +
    '<span class="goods" aria-hidden="true">' + g.svg + '</span>' +
    '<div id="chalk">' +
    '<span class="ln"><span class="lb">商品</span><b>' + pInt + '</b><span class="u">元</span>' +
      (priceHalf ? '<b class="pb5">5</b><span class="u">角</span>' : '') + '</span>' +
    '<span class="ln"><span class="lb">付了</span><b>' + payY + '</b><span class="u">元</span></span>' +
    '<span class="ask">找他多少呀？</span></div>' +
    '<span class="bill" role="img" aria-label="' + payY + ' 元纸币">' + billSvg(payY, 92) + '</span>';
}
/* 币盘：20 枚固定供给圆形硬币（data-v=面值元 "5"/"2"/"1"/"0.5"，外部表面一律元制 §0.28；
   .gone=已入找零托盘） */
function renderCoins() {
  coinTrayEl.innerHTML = '';
  TRAY_LIST.forEach((v, i) => {
    const b = document.createElement('button');
    b.className = 'coin';
    b.dataset.i = i;
    b.dataset.v = DENOM_YUAN[v];
    b.setAttribute('aria-label', (DENOM_YUAN[v] < 1 ? '5 角' : DENOM_YUAN[v] + ' 元') + '硬币');
    b.innerHTML = coinSvg(DENOM_YUAN[v], 64);
    coinTrayEl.appendChild(b);
  });
}
/* 找零托盘：托内币（data-j=tray 序，点=移回）+ 合计实时大字（不显示目标找零，靠心算） */
function renderBasket(q) {
  basketEl.innerHTML = '';
  if (!q._tray.length) {
    basketEl.innerHTML = '<span class="empty">点点钱币，把零钱找给他</span>';
  } else {
    q._tray.forEach((v, j) => {
      const b = document.createElement('button');
      b.className = 'tcoin';
      b.dataset.j = j;
      b.setAttribute('aria-label', '托盘内 ' + (DENOM_YUAN[v] < 1 ? '5 角' : DENOM_YUAN[v] + ' 元') + '，点一点拿回去');
      b.innerHTML = coinSvg(DENOM_YUAN[v], 60);
      basketEl.appendChild(b);
    });
  }
  renderSum(q);
}
function renderSum(q) { setMoneyText(sumboxEl, traySum(q)); }
/* 作答区："找零"主提交大按钮（≥96） */
function renderAnswers() {
  answersEl.innerHTML = '';
  const b = document.createElement('button');
  b.id = 'pay-btn';
  b.setAttribute('aria-label', '找零，提交');
  b.innerHTML = ICONS.hand + '<span>找零</span>';
  answersEl.appendChild(b);
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
  hideFindCard();
  renderChip(q);
  renderCoins();
  renderBasket(q);
  renderAnswers();
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) sayQ(quizParts(q), qSpeech(q));  /* 换题读题 sayR 级 */
}

/* ================= 飞行动画：点币→克隆 fixed 飞向找零托盘 → 到达后托内币弹入 ================= */
function flyCoin(fromEl, v) {                         // v=面值（元）
  const to = basketEl.getBoundingClientRect();
  const a = fromEl.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'fly-coin';
  f.innerHTML = coinSvg(v, 56);
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

/* ================= 找零主路径（真实点击 / CS 钩子 / autoSolve / 教学演示共用） ================= */
function uiTapCoin(v, demo) {
  /* v=面值（元：5/2/1/0.5），引擎边界 Y() 转半元；locked 门拦真实输入；
     demo 通道仅 tutorialWatch 内部传 true（豁免 locked） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const r = engTapCoin(cur, Y(v));
  if (r === null) return false;
  /* 放币不重置救援钟（§0.7a：探索构造非推进，与移币/错提交统一口径） */
  const el = coinElFor(v);
  if (el) {
    el.classList.remove('breathe');
    el.classList.add('gone');
    flyCoin(el, v);
  }
  coinHi();
  renderSum(q);                                  // 合计实时同步更新（SPEC §1）
  setTimeout(() => { if (cur && cur.quizzes[cur.step] === q && !q.solved) renderBasket(q); }, 460 * SPEED);
  if (state.tut === 'help') pointHelpNext();     // "帮"：跟着节奏指向下一步
  return r;                                      // 返回新合计（半元）
}
/* 移回托盘币（零惩罚探索；不重置救援钟） */
function uiTapTray(j) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const vBack = q._tray[j];                      // 移回前留档面值（半元；还原同面值币须转元）
  const r = engTapTray(cur, j);
  if (r === null) return false;
  takeLo();
  const g = goneElFor(DENOM_YUAN[vBack]);
  if (g) g.classList.remove('gone');             // 币盘补给一枚（避免全盘重渲染闪烁）
  renderBasket(q);
  renderSum(q);
  return r;
}
/* "找零"提交主路径：empty 轻反馈不计次 / 对=顾客离场推进 / 错=晃动+方向提示零惩罚 */
async function uiSubmit(demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    /* 审查 M2（batch14）：提交键（主答案）吞输入期轻叮+轻抖——禁静默（§0.22） */
    if (!demo) {
      sfx('pop');
      const b = payBtnEl();
      if (b) { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); }
    }
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;                               // 身份守卫：演出窗口内重玩会重建 cur
  const r = engSubmit(cur);
  if (r === null) return false;
  const btn = payBtnEl();
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                        // 仅正确推进重置救援钟（§0.7a）
    if (state.tut === 'help') {                  // 教学"独"：首次提交对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    hideFindCard();
    sayR(VOICE.right.key, VOICE.right.text);     // 反馈=找对啦（§1）
    if (btn) { btn.classList.remove('breathe', 'nudge'); btn.style.background = '#8FBF7F'; btn.style.boxShadow = '0 6px 0 #6FA063'; }
    const cust = chipEl.querySelector('.cust');
    if (cust) cust.classList.add('leave');       // 顾客道谢离场（SPEC §1）
    sfx('coin');
    await wait(880 * SPEED);
    if (cur !== run) return r;                   // 演出窗内重玩已重建关卡：丢弃旧续体
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else if (r === 'empty') {                    // 空提交：不计次不 miss（§1 口径）
    basketEl.classList.remove('nudge'); void basketEl.offsetWidth; basketEl.classList.add('nudge');
    sfx('pop');
    return 'empty';
  } else {                                       // 错提交：托盘晃动零惩罚可调整（SPEC §1）
    basketEl.classList.remove('wig'); void basketEl.offsetWidth; basketEl.classList.add('wig');
    sfx('fail');
    sayWrong(q, r === 'wrong-more');             /* 三态 cas_wrong + 方向轻提示（10s 节流） */
    if (q.miss >= 2) applyRescueVisual(q);       /* 首错不提示：连错 2 次给找零额视觉线索（§0.7） */
    if (state.tut === 'help') pointHelpNext();
    state.locked = true;                         /* 晃动窗防重入：连点一次错只记一次 miss（§0.26） */
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
  }
  return r;
}
/* 错提交语音：cas_wrong 三态主通道 + more/less 方向轻提示（10s 节流，queue 顺序链不截断） */
function sayWrong(q, over) {
  const tip = over ? VOICE.more : VOICE.less;
  const tipDue = Date.now() - lastMoreLess > 10000;
  if (tipDue) lastMoreLess = Date.now();
  sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2, tipDue ? tip : null);
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.cashier && sv.cashier.tutSeen);
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
  /* 指新目标前清旧 breathe（numberdet P1-3：逐位引导不清除会叠亮失效） */
  coinTrayEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  basketEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  const pb = payBtnEl(); if (pb) pb.classList.remove('breathe');
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 可行性 DP）：总额=找零→指提交；差→指可加币；超→指移回币 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (!t) return;
  if (t.act === 'ok') pointGhostAt(payBtnEl());
  else if (t.act === 'add') pointGhostAt(coinElFor(DENOM_YUAN[t.v]));   /* t.v=半元（引擎边界）转元取币 */
  else pointGhostAt(tcoinEl(t.j));
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.cashier.tutSeen）
   看=演示一笔找零（贪心最小组合逐枚：前 2 枚完整手指演示，其余原地快放控时长）
   →临时解锁走真实路径演示完整提交演出（返回值存 window.__csDemoR §0.27）
   →立即重发同关（确定性关卡，题面一致），"你来当收银员"交接 →帮=指向可行下一步；独=放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const seq = greedySeq(q.change) || [];
  for (let k = 0; k < seq.length; k++) {
    const el = coinElFor(seq[k]);
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
  await wait(560 * SPEED);                       // 等托盘渲染稳定
  pointGhostAt(payBtnEl());
  await wait(800 * SPEED);
  ghost.press();
  await wait(280 * SPEED);
  state.demo = false; state.locked = false;      /* 时序锚点：解锁窗内无 await 插入（batch9 m6） */
  const demoR = await uiSubmit(true);            // 真实路径演示一次完整提交演出
  window.__csDemoR = demoR;                      /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.cashier = sv.cashier || {};
    sv.cashier.tutSeen = true;
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
  openingSpeak(true);                            // 交接顺序链：turn clip → 题面段（§0.6 单通道）
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
  lastAct = Date.now();                          /* 读题=主动学习动作重置救援钟（§0.7a 例外） */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整句重读（queue 拼接） */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* 吞输入期轻叮（§0.16） */
  lastAct = Date.now();                          /* 重听题面=主动学习（§0.7a 例外口径） */
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.coin');
  if (c) {                                       // 币盘：放币主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapCoin(Number(c.dataset.v));
    return;
  }
  const t = e.target.closest('.tcoin');
  if (t) {                                       // 托盘币：移回
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');
    uiTapTray(Number(t.dataset.j));
    return;
  }
  if (e.target.closest('#pay-btn')) {
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 主答案吞输入期轻叮 */
    uiSubmit();
    return;
  }
  if (e.target.closest('#prompt-chip')) return;
  /* 空白/探索点击（含大额纸币展示区）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 救援视觉（§0.21/§1）：找零额大字卡亮起 + 最小组合第一枚币 breathe */
function showFindCard(q) {
  setMoneyText(findCardEl, q.change);
  findCardEl.classList.remove('show', 'breathe');
  void findCardEl.offsetWidth;
  findCardEl.classList.add('show', 'breathe');
}
function hideFindCard() { findCardEl.classList.remove('show', 'breathe', 'half'); }
function applyRescueVisual(q) {
  showFindCard(q);                               // "要找 Z 元"数字卡亮起（找零额大字提示）
  const seq = greedySeq(q.change);               // 最小组合（5→2→1→0.5）第一枚币 breathe
  if (seq && seq.length) {
    const el = coinElFor(seq[0]);
    if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
  }
}

/* ================= 无操作看护：14s 救援（重读题面+找零额卡+首币线索 §0.21）/
   教学"帮"5s 重演示一次。救援钟只被正确提交/读题重置（§0.7a：放币/移币/错提交/空白/兔子不重置） */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                    /* 过题过渡窗不救援 */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    speakQuiz(q);                                // 救援=重读题面（queue 拼接）
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
  KIDS.init({ game: 'cashier', title: '找零收银' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4） */ });
    first = Math.max(0, lim - 1);                /* 收尾后停留今日最后一关（家族 b14 修复对齐，b15 审查 M3） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.CS = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: 'cashier', price: fmtYuan(q.price), paid: fmtYuan(q.pay),
      change: fmtYuan(q.change), tray: q._tray.map(v => DENOM_YUAN[v]),   /* 已放币面值（元） */
      sum: fmtYuan(traySum(q)), step: cur.step, miss: q.miss };           /* SPEC §1 钩子契约 */
  },
  tapCoin(v) {                                    // v=面值（元）：0.5/1/2/5 → 新合计（元）
    if (!cur || cur.done) return false;
    const q = cur.quizzes[cur.step];
    if (!q) return false;
    const j = Y(v);
    if (DENOMS.indexOf(j) < 0 || cntOf(q._tray, j) >= DENOM_STOCK) return false;
    const r = uiTapCoin(v);
    return r === false ? false : fmtYuan(r);
  },
  tapTrayCoin(i) { const r = uiTapTray(i); return r === false ? false : fmtYuan(r); },
  tapSubmit() { return uiSubmit(); },
  start(flat) {                                   /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                             /* 贪心凑零逐枚 5→2→1→0.5（UI 真实路径） */
    let n = 0, quizzes = 0, sumsOk = true;
    while (cur && !cur.done && n++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      while (q._tray.length) uiTapTray(q._tray.length - 1);   // 清托盘回初态
      const seq = greedySeq(q.change) || [];
      for (const v of seq) { uiTapCoin(v); await wait(30); }
      quizzes++;
      if (traySum(q) !== q.change) { sumsOk = false; break; }  /* 断言总额恰=change（§1） */
      await wait(420 * SPEED);                    // 等飞入+托盘渲染
      await uiSubmit();
    }
    return { done: !!(cur && cur.done), quizzes: quizzes, sumsOk: sumsOk };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
