/* ================= fruitsplit 主逻辑（r7：五模式渲染 / 切分两段判定 / 教学 / 推进）
   玩法（SPEC-BATCH7 §2 r7）：
   pick 辨识：哪个是一半（三态卡：整个/一半/一大一小陷阱）；
   choose 等分选择：n(2/3/4) 人图示+语音，选份数匹配的等分切法（halves/thirds/quarters）；
   fair 公平判断：展示等大或一大一小，判断公平/不公平（不公平答对→重切演出）；
   cut 切分：点刀切两半（手感保留）→ 判公平（真判定：必须点对"公平"才推进）；
   match 拼合：半块配对拼回整个。
   验收钩子：window.FRU = { get currentLevel, get quiz, tapOption(i), doCut(), async autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 20s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音（6 岁试玩共性 P1）：flat<3 每错必播 / flat≥3 走 10s 节流 sayR */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* T46 阶段2（2026-09-19）：题面/公平句 clip 化——全段在册 queue 拼播，缺段整句 TTS 兜底
   （shop-math playChain 先例；段恒在册=防御性死分支） */
const playChain = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.speak(fallback);
};

const boardEl = $id('board'), chipEl = $id('prompt-chip'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let lastBoardHint = 0;                          // 非主交互轻提示 10s 节流（§0.16）
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');
const moptEl = i => boardEl.querySelector('.mopt[data-i="' + i + '"]');
const optEl = (q, i) => (q.mode === 'match' ? moptEl(i) : cardEl(i));   // cut 判定段按钮同 .card
const DOLL_SHIRTS = ['#5FC4CE', '#F5C445', '#B98BD6', '#8FBF7F'];

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  document.querySelector('#board-wrap .wood').innerHTML = woodSvg();
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 刀声（Web Audio 合成）：刀落=高频短击+低频滑落；切开展开=双音 */
const sndKnife = () => {
  if (VERIFY) return;
  KIDS.audio.note(1318, 0.06, 0, 0.5);
  KIDS.audio.note(880, 0.08, 0.05, 0.45);
  KIDS.audio.note(587, 0.14, 0.1, 0.4);
};
const sndSplit = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.5); KIDS.audio.note(783.99, 0.22, 0.1, 0.5); } };

/* ================= 渲染 ================= */
function chipFor(q) {
  const icon = q.mode === 'pick' ? ICONS.pm_pick : (q.mode === 'choose' ? ICONS.pm_choose :
    (q.mode === 'fair' || (q.mode === 'cut' && q.judging) ? ICONS.pm_fair :
    (q.mode === 'cut' ? ICONS.pm_cut : ICONS.pm_match)));
  chipEl.innerHTML = icon + '<div class="big">' + qBigText(q) + '</div>';
}
function cardArt(o) {                           // 辨识卡图形：整个/单半/一大一小陷阱（r7 第三态）
  if (o.state === 'whole') return '<span class="art">' + fruitSvg(o.kind) + '</span>';
  if (o.state === 'half') return '<span class="art">' + halfFruitSvg(o.kind, o.side, null) + '</span>';
  return '<span class="art unevenpair">' + pieceSvg(o.kind, 0, 120) + pieceSvg(o.kind, 120, 360) + '</span>';
}
function renderPick(q) {
  chipFor(q);
  const row = document.createElement('div');
  row.id = 'cards';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.i = i;
    b.setAttribute('aria-label', o.state === 'whole' ? '整个水果' :
      (o.state === 'half' ? '半个水果' : '一大一小两块'));
    b.innerHTML = cardArt(o);
    row.appendChild(b);
  });
  boardEl.appendChild(row);
}
/* ---------- choose：人数图示 + 主水果 + 3 切法卡 ---------- */
function renderChoose(q) {
  chipFor(q);
  const zone = document.createElement('div');
  zone.id = 'choose-zone';
  let heads = '';
  for (let i = 0; i < q.parts; i++) heads += dollHeadSvg(i);
  zone.innerHTML =
    '<div id="cho-people" aria-label="' + NUM_CN[q.parts] + '个人">' + heads + '</div>' +
    '<div id="cho-fruit" aria-label="水果">' + fruitSvg(q.kind) + '</div>';
  boardEl.appendChild(zone);
  const row = document.createElement('div');
  row.id = 'cards';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card cutcard';
    b.dataset.i = i;
    b.setAttribute('aria-label', CUT_ARIA[o.cut]);
    b.innerHTML = '<span class="art">' + cutStyleSvg(q.kind, o.cut) + '</span>';
    row.appendChild(b);
  });
  boardEl.appendChild(row);
}
/* choose 答对：主水果按正确切法切开 → 块分离 → n 个娃娃各拿一块（块中心角相等=等大） */
function chooseCutShow(q) {
  const fruit = $id('cho-fruit');
  if (!fruit) return;
  const n = q.parts;
  let pieces = '';
  for (let i = 0; i < n; i++) {
    const a0 = pieceAngles(n, i), a1 = pieceAngles(n, i + 1);
    pieces += '<span class="chop" data-i="' + i + '" style="--dx:' + (i - (n - 1) / 2) * 46 + 'px">' +
      pieceSvg(q.kind, a0, a1) + '</span>';
  }
  fruit.innerHTML = '<div class="cho-pieces">' + pieces + '</div>';
  fruit.classList.add('cut');
}
function chooseTakers(q) {
  const zone = $id('choose-zone');
  if (!zone) return;
  const n = q.parts;
  let takers = '';
  for (let i = 0; i < n; i++) {
    const a0 = pieceAngles(n, i), a1 = pieceAngles(n, i + 1);
    takers += '<div class="taker"><div class="who">' + dollSvg(DOLL_SHIRTS[i % 4]) +
      '<div class="phalf piecehold">' + pieceSvg(q.kind, a0, a1) + '</div></div></div>';
  }
  const res = document.createElement('div');
  res.id = 'cho-takers';
  res.setAttribute('aria-label', NUM_CN[q.parts] + '个人一样多');
  res.innerHTML = takers;
  zone.appendChild(res);
  zone.classList.add('taken');
}
/* ---------- fair：两块展示（等大/一大一小）+ 2 娃娃 + 公平/不公平按钮 ---------- */
function renderFair(q) {
  chipFor(q);
  const zone = document.createElement('div');
  zone.id = 'fair-zone';
  let show = '', people = '';
  for (let i = 0; i < 2; i++) {
    show += '<div class="fpiece" data-i="' + i + '" data-span="' + q.spans[i] + '">' +
      pieceSvg(q.kind, i === 0 ? 180 : 180 + q.spans[0], i === 0 ? 180 + q.spans[0] : 540) + '</div>';
    people += dollHeadSvg(i);
  }
  zone.innerHTML =
    '<div id="fair-show" aria-label="切好的两块">' + show + '</div>' +
    '<div id="fair-people" aria-label="两个人">' + people + '</div>';
  boardEl.appendChild(zone);
  const row = document.createElement('div');
  row.id = 'cards';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card fbtn';
    b.dataset.i = i;
    b.setAttribute('aria-label', FAIR_ARIA[o.fair]);
    b.innerHTML = '<span class="art">' + fairBtnSvg(o.fair) + '</span>';
    row.appendChild(b);
  });
  boardEl.appendChild(row);
}
/* fair 不公平答对后的重切演出：两块收回 → 等大切法线闪 → 两个等大半块 */
function fairRecut(q) {
  const show = $id('fair-show');
  if (!show) return;
  show.classList.add('recut');
  let eq = '';
  for (let i = 0; i < 2; i++) {
    eq += '<div class="fpiece" data-i="' + i + '" data-span="180">' +
      pieceSvg(q.kind, 180 + 180 * i, 360 + 180 * i) + '</div>';
  }
  show.innerHTML = eq;
  const zone = $id('fair-zone');
  if (zone) zone.classList.add('recut-done');
}
/* ---------- cut：大水果+小刀（刀阶段）→ 两半展开+娃娃（判定段） ---------- */
function renderCut(q) {
  chipFor(q);
  const zone = document.createElement('div');
  zone.id = 'cut-zone';
  zone.innerHTML =
    '<div id="fruit-wrap">' +
      '<div id="fruit-whole" aria-label="水果">' + fruitSvg(q.kind) + '</div>' +
      '<div id="half-l" class="fhalf" data-half="L">' + halfFruitSvg(q.kind, 'L', 'hl' + q.seed) + '</div>' +
      '<div id="half-r" class="fhalf" data-half="R">' + halfFruitSvg(q.kind, 'R', 'hr' + q.seed) + '</div>' +
    '</div>' +
    '<button id="btn-knife" aria-label="小刀，切一切">' + ICONS.knife + '</button>';
  boardEl.appendChild(zone);
  if (q.judging) addJudgeRow(q);                 // 重渲染兜底（正常流由 uiCut 追加）
}
/* 判定段：两个娃娃各拿一半 + 公平/不公平按钮行（r7 真判定） */
function addJudgeRow(q) {
  let res = $id('cut-result');
  if (!res) {
    res = document.createElement('div');
    res.id = 'cut-result';
    res.setAttribute('aria-label', '两个娃娃各拿一半');
    boardEl.appendChild(res);
  }
  res.innerHTML =
    '<div class="taker"><div class="who">' + dollSvg('#5FC4CE') +
      '<div class="phalf">' + halfFruitSvg(q.kind, 'L', null) + '</div></div></div>' +
    '<div class="taker"><div class="who"><div class="phalf">' + halfFruitSvg(q.kind, 'R', null) + '</div>' +
      dollSvg('#F5C445') + '</div></div>';
  res.classList.add('on');
  if (!$id('judge-row')) {
    const row = document.createElement('div');
    row.id = 'judge-row';
    q.judgeOpts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'card fbtn';
      b.dataset.i = i;
      b.setAttribute('aria-label', FAIR_ARIA[o.fair]);
      b.innerHTML = '<span class="art">' + fairBtnSvg(o.fair) + '</span>';
      row.appendChild(b);
    });
    boardEl.appendChild(row);
  }
}
/* ---------- match：给半块 + 空槽 + 3 候选（保留） ---------- */
function renderMatch(q) {
  chipFor(q);
  const zone = document.createElement('div');
  zone.id = 'match-zone';
  zone.innerHTML =
    '<div id="match-top">' +
      '<div id="given-slot"><div class="mhalf" aria-label="给到的半个水果">' +
        halfFruitSvg(q.given.kind, q.given.side, 'gv' + q.seed) + '</div></div>' +
      '<span class="mplus" aria-hidden="true">+</span>' +
      '<div id="slot" class="mhalf dashed" aria-label="另一半的位置"><span class="mq">?</span></div>' +
    '</div>';
  const cands = document.createElement('div');
  cands.id = 'cands';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'mopt';
    b.dataset.i = i;
    b.setAttribute('aria-label', '候选半个水果' + (i + 1));
    b.innerHTML = '<span class="art">' + halfFruitSvg(o.kind, o.side, 'mo' + q.seed + '_' + i) + '</span>';
    cands.appendChild(b);
  });
  zone.appendChild(cands);
  boardEl.appendChild(zone);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  boardEl.innerHTML = '';
  if (q.mode === 'pick') renderPick(q);
  else if (q.mode === 'choose') renderChoose(q);
  else if (q.mode === 'fair') renderFair(q);
  else if (q.mode === 'cut') renderCut(q);
  else renderMatch(q);
  renderStep();
  if (!VERIFY && !state.demo) playChain([qKey(q)], qSpeech(q));   /* 题面整句（T46 阶段2 clip 化） */
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
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：cut 刀阶段→小刀；cut 判定段/fair/choose→正确按钮；match→正确候选 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.mode === 'cut' && !q.judging) pointGhostAt($id('btn-knife'), 'tut');
  else pointGhostAt(optEl(q, q.answerIdx), 'tut');
}

/* ================= 答题主路径（真实点击 / FRU.tapOption / autoSolve 共用） ================= */
async function uiTapOption(i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;   /* 反方审查 m7：对齐 uiCut 的 demo 豁免 */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (q.mode === 'cut' && !q.judging) return false;        // 刀阶段不可点选项（走 uiCut）
  const run = cur;                              /* 演出窗口内点重玩会重建 cur——身份守卫防旧续体在新 cur 上 winFlow */
  const r = engPick(cur, i);
  if (r === null || r === 'again') return r;
  const el = optEl(q, i);
  if (r === 'right' || r === 'done') {
    lastAct = Date.now();                        /* 仅正确推进重置救援钟（5.5 岁试玩 P1：乱点孩子等得到救援） */
    if (state.tut === 'help') {                 // 教学"独"：首次答对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    if (el) {
      el.classList.add('right');
      const m = document.createElement('span');
      m.className = 'mark';
      m.innerHTML = ICONS.check;
      el.appendChild(m);
    }
    let fb = 880;                                /* 答对演出窗（ms，SPEC_T.fb 口径——verify 时序分账源） */
    if (q.mode === 'choose') {                   // 等分切开演出：切线闪→块分离→n 娃娃各拿一块
      chooseCutShow(q);
      sfx('ok');
      await wait(900 * SPEED);
      if (cur !== run) return r;
      chooseTakers(q);
      /* T46 阶段2：公平反馈+等分句合并 queue 链（原 clip+TTS 双通道重叠播） */
      playChain([VOICE.fairYes.key, 'fru_q_fair3_' + q.parts],
        VOICE.fairYes.text + '，' + NUM_CN[q.parts] + '块一样大，很公平');
      fb = 1900;
    } else if (q.mode === 'fair') {
      if (q.fairIsFair) {                        // 公平：娃娃开心跳
        const fp = $id('fair-people');
        if (fp) fp.classList.add('happy');
        KIDS.voice.play(VOICE.fairYes.key, VOICE.fairYes.text);
        fb = 2600;
      } else {                                   // 不公平：指出→重切演出（等大切法线闪→两等大块）
        KIDS.voice.play(VOICE.fairNo.key, VOICE.fairNo.text);
        await wait(1300 * SPEED);
        if (cur !== run) return r;
        fairRecut(q);
        KIDS.voice.play(VOICE.recut.key, VOICE.recut.text);
        fb = 1900;
      }
      sfx('ok');
    } else if (q.mode === 'cut') {               // 判定段答对：两半等大=公平
      const res = $id('cut-result');
      if (res) res.classList.add('happy');
      KIDS.voice.play(VOICE.fairYes.key, VOICE.fairYes.text);
      sfx('ok');
      fb = 2600;
    } else if (q.mode === 'match') {
      fillSlot(q);                               // 拼合成功：两半拼回整个（中缝虚线示意切线）
      sfx('coin');
    } else sfx('coin');
    await wait(fb * SPEED);
    if (cur !== run) return r;                   /* 末题演出窗内重玩已重建关卡，丢弃旧续体 */
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  } else {                                      // 答错：晃动+灰掉（零惩罚，可重点其它）；首错只轻提示，连错 2 次才高亮正确项
    q._miss = (q._miss || 0) + 1;
    if (el) el.classList.add('wrong');
    const ok = optEl(q, q.answerIdx);
    if (ok && q._miss >= 2) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text);   /* 6 岁试玩共性 P1：flat≥3 也给纠错语音（10s 节流） */
    await wait(520 * SPEED);
  }
  return r;
}
/* 拼合槽：两半拼回整个（整个水果 + 中缝虚线=切线可见） */
function fillSlot(q) {
  const slot = $id('slot');
  if (!slot) return;
  slot.classList.remove('dashed');
  slot.classList.add('lit');
  slot.innerHTML = fruitSvg(q.kind) + '<i class="seam"></i>';
}

/* ================= 切分主路径（真实点刀 / FRU.doCut / autoSolve 共用）
   r7 两段：切（手感）→ 判公平（engPick）。返回 'judge'=进入判定段 ---------- */
async function uiCut(demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (q.mode !== 'cut' || q.cutDone) return q.mode === 'cut' ? 0 : false;
  const run = cur;                              /* 身份守卫（同 uiTapOption） */
  const r = engCut(cur);
  if (r !== 'judge') return r === 0 ? 0 : false;
  lastAct = Date.now();
  state.locked = true;
  ghost.hide();
  const knife = $id('btn-knife'), whole = $id('fruit-whole'),
        hl = $id('half-l'), hr = $id('half-r');
  if (knife) knife.classList.add('off');
  sndKnife();
  if (whole) whole.classList.add('hide');
  if (hl) hl.classList.add('go-l');
  if (hr) hr.classList.add('go-r');
  await wait(650 * SPEED);
  sndSplit();
  addJudgeRow(q);                                // 两娃娃各拿一半 + 公平/不公平按钮（真判定）
  chipFor(q);                                    // 题面切到"公平吗？"
  KIDS.voice.play(VOICE.fairQ.key, VOICE.fairQ.text);   /* 判定段题面（救援/任务语音口径，不受 flat 门） */
  sfx('ok');
  await wait(600 * SPEED);
  if (cur !== run) return r;                     /* 演出窗内重玩：丢弃旧续体 */
  state.locked = false;
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(f) {
  const fl = f == null ? cur.flat : f;
  const ci = Math.floor(fl / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关预告实算下一关难度章（家族 F：禁 (ci+1)%4 字面） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(fl + 1).dch - 1];
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：dayEnd 预告传 nextHint(lim - 1) */
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
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.fru && sv.fru.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示点选正确大卡（一半，flat0 首题恒为辨识 2 选 1）；帮=指向正确选项/小刀；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                     // 关 1-0 首题恒为辨识 2 选 1（确定性生成）
  pointGhostAt(cardEl(q.answerIdx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapOption(q.answerIdx, true);         /* demo 通道豁免 locked（m7 对齐 uiCut），无需变通解锁 */
  const sv = KIDS._save();
  sv.fru = sv.fru || {};
  sv.fru.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来切一切"在重发后的题面上说（照 countchick m6 修复） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与板面交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* 反方审查 M1 附带：教学/演出期点兔子不打断 */

  lastAct = Date.now();
  hopRabbit();
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 反方审查 M1：教学/演出/通关期重玩门（防教学续体失控）*/

  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) playChain([qKey(q)], qSpeech(q));     /* 读题：题面整句（T46 阶段2 clip 化） */
});
boardEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  const opt = e.target.closest('.card, .mopt');
  if (opt) { uiTapOption(Number(opt.dataset.i)); return; }
  if (e.target.closest('#btn-knife')) { uiCut(); return; }
  const q = cur.quizzes[cur.step];
  /* 切分刀阶段点水果本体（非主交互）：晃一下 + 10s 节流轻提示（§0.16）；并记录起点供下滑切 */
  const fw = e.target.closest('#fruit-whole');
  if (fw && q && q.mode === 'cut' && !q.cutDone && !state.locked && !state.won && !state.demo) {
    swipeY = e.clientY;                          /* 戳水果本体不重置救援钟（探索行为，5.5 岁试玩 P1） */
    fw.classList.remove('wig'); void fw.offsetWidth; fw.classList.add('wig');
    if (Date.now() - lastBoardHint > 10000) {
      lastBoardHint = Date.now();
      sayR(VOICE.knife.key, VOICE.knife.text);
    }
    return;
  }
  /* 板面空白：10s 节流轻提示（§0.16 第一反应高发非主交互输入） */
  if (!q || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBoardHint > 10000) {      /* 空白点击不重置救援钟（5.5 岁试玩 P1） */
    lastBoardHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 切分下滑手势（SPEC §2：点刀 或 从上往下滑） ================= */
let swipeY = null;
window.addEventListener('pointermove', e => {
  if (swipeY == null || VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (e.clientY - swipeY > 40) {                 // 下滑 ≥40px：等价点刀
    swipeY = null;
    uiCut();
  }
});
window.addEventListener('pointerup', () => { swipeY = null; });
window.addEventListener('pointercancel', () => { swipeY = null; });

/* ================= 无操作看护：14s 救援提示（5.5 岁等待极限 15s 内）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 反方审查 m5：救援重读题面（不识字孩子需要任务内容而非催促句） */
    if (q) playChain([qKey(q)], qSpeech(q)); else sayR(VOICE.hint.key, VOICE.hint.text);   /* T46 阶段2 */
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
  KIDS.init({ game: 'fruitsplit', title: '水果切切' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    /* r7 审查 M2：家族 A=启动 dayEnd 传 nextHint(lim - 1)（lim 为章边界时 lim 会多前进一章） */
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.FRU = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || { cutDone: false };
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      mode: q ? q.mode : null, cutDone: !!(q && q.cutDone), judging: !!(q && q.judging) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const opts = q.mode === 'cut'
      ? (q.judging ? q.judgeOpts.map(o => ({ fair: o.fair })) : [])
      : q.options.map(o => ({
          kind: o.kind === undefined ? null : o.kind,
          state: o.state === undefined ? null : o.state,
          side: o.side === undefined ? null : o.side,
          cut: o.cut === undefined ? null : o.cut,
          fair: o.fair === undefined ? null : o.fair }));
    return { mode: q.mode, kind: q.kind, target: q.answerIdx, answerIdx: q.answerIdx,
      parts: q.parts === undefined ? null : q.parts,
      fairIsFair: q.fairIsFair === undefined ? null : q.fairIsFair,
      spans: q.spans ? q.spans.slice() : null,
      given: q.given ? { kind: q.given.kind, side: q.given.side } : null,
      options: opts,
      cutDone: !!q.cutDone, judging: !!q.judging, step: cur.step,
      wrongs: (q.wrong || []).slice() };
  },
  tapOption(i) { return uiTapOption(i); },
  doCut() { return uiCut(); },
  async autoSolve() {                           // UI 路径自动答完当前关（按题面模式走真实流程）
    let acts = 0;
    while (cur && !cur.done && acts++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.mode === 'cut') {
        if (!q.cutDone) await uiCut();          // 刀阶段：切
        else await uiTapOption(q.answerIdx);    // 判定段：点"公平"
      } else await uiTapOption(q.answerIdx);
    }
    return { done: !!(cur && cur.done), acts: acts };
  },
  get tutorial() { return state.tut; }
};
