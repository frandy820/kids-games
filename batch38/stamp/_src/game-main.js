/* ================= stamp 主逻辑（载体演出→选章盖印/找错修章→图案留格）
   开题演出（presentQuiz）：围巾载体出场+示范段格位 + 题面**任务框架句**
   （KIDS.voice.play(sayKey, sayText)——clip 优先/TTS 回退；去语音泄题：规律
   只能靠看不靠听，SPEC v3 明示；窗=estMs(句长)+300+出场 400，动态按句长
   ——家族 T）。演出锁=真时钟 state.showUntil（Date.now() 比较，tapStamp/
   tapCell 演出期返 null——测试驱动须轮询等）。
   ch1-3 续盖：盖对=印章闪亮+图案弹现永久留格（cell.stamped svg[data-motif]
   ——契约 M 盖印留格 DOM 断言）+确认链 [spm_right]（单 clip 窗 STAMP_WIN
   2316=2016+300 精确——家族 H）；
   ch4 体检纠错：满盖花边含 1 错章——先点格找错（tapCell：错章位→'found'
   标记+开盘；非错位→'wrong'+miss+spm_fix_wrong「这枚是对的哦…」链
   [spm_fix_wrong] 窗 FIX_WRONG_WIN 4452=4152+300），找到后从盘选正确章盖换
   （'fixed'+错章位图案替换弹现）。
   盖错=图案虚影抖动消散（不留格）+错链 [spm_wrong, spm_hint]（豁免窗
   6066=2016+150+3600+300 真时钟，契约 I）+首错盘区整体 wiggle（方向级
   不指章）/ miss≥2 答案级 breathe（ch1-3 正确章/ch4 找错期=错章格）。
   救援：14s 方向级=重播任务框架句+载体轻摆（lastDir 独立节流锚，不重置
   lastAct——契约 B）/ 30s 答案级=正确章 breathe+重播；错链豁免窗让路（契约 I）。
   验收钩子：window.ST = { get currentLevel, get quiz{kind,unit,seq,blank,picks,
   answer,step,miss,say,blanks,scene,badIdx,found}, tapStamp(i), tapCell(j),
   start(flat), autoSolve() }——真实页同暴露（b29 坑⑥）。
   tapStamp 返回：ch1-3 正确 'stamped'/末题 'done'；ch4 found 后正确 'fixed'/
   末题 'done'；干扰 'wrong'；豁免窗内干扰吞 false；演出期 null（真时钟锁）；
   ch4 未 found 先点盘=null（先找错章）。
   tapCell 返回（ch4）：错章位 'found'；非错位 'wrong'；豁免窗内非错位吞
   false；演出期 null；非 ch4/已 found=null。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* b25 定版 estMs（data 内同源定义——此处供窗断言与教学分账引用一致） */
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip；
   b36 m3 教训：教学迷你关 flat=-1 每错必播——条件写 cur.flat < 3） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }   /* 教学迷你关 flat=-1 每错必播（契约 J flat≥3 才节流） */
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const scarfEl = $id('scarf'), stripEl = $id('strip'), galleryEl = $id('gallery'),
      qTextEl = $id('q-text'), trayEl = $id('tray'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastHearAt = 0;                             // 重听任务句 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重演中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const stampWrapAt = j => trayEl.querySelector('.stamp-wrap[data-j="' + j + '"]');
const cellAt = i => stripEl.children[i];

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  qTextEl.textContent = Q_TEXT;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：盖对=双音上行 / 盖错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(523.25, 0.12, 0, 0.3); };

/* ================= 渲染 ================= */
/* 格位条（契约 M 数值/DOM 层锚）：done=示范段已印格（svg[data-motif] 真值）/
   blank=空位 / cur=当前续盖位 / stamped=孩子盖印格（永久留格）；
   ch4 体检：满盖全 done 格（含错章——外观同构防一眼锁定）+找到后 suspect 标记；
   wide=格位 >9 时收窄（ch3-4 13 格横条适配竖屏） */
function renderStrip() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  stripEl.dataset.scene = q.scene;              // 帧内容锚（verify 断言渲染即引擎）
  stripEl.dataset.kind = q.kind;                // 题型锚（next 续盖|fix 体检）
  stripEl.innerHTML = '';
  const total = q.seq.length + (q.kind === 'fix' ? 0 : q.blanks);
  stripEl.classList.toggle('wide', total > 9);
  for (let i = 0; i < total; i++) {
    const c = document.createElement('div');
    c.dataset.i = i;                            // 格位下标（ch4 找错点选语义）
    if (q.kind === 'fix') {
      c.className = 'cell done' + (q._found && i === q.badIdx ? ' suspect' : '');
      c.innerHTML = motifSvg(q.seq[i]);
    } else if (i < q.seq.length) {
      c.className = 'cell done'; c.innerHTML = motifSvg(q.seq[i]);
    } else if (i === q.seq.length + q.filled) c.className = 'cell blank cur';
    else c.className = 'cell blank';
    stripEl.appendChild(c);
  }
}
function renderTray() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'fix' && !q._found) {          // ch4 找错期：盘未开（先点花边找错章）
    trayEl.innerHTML = '<div class="find-tip">先点一点花边，找找哪一枚盖错了</div>';
    trayEl.dataset.n = 0;
    trayEl.dataset.phase = 'find';
    return;
  }
  trayEl.dataset.phase = 'stamp';
  trayEl.innerHTML = '';
  trayEl.dataset.n = q.picks.length;
  for (let j = 0; j < q.picks.length; j++) {
    const w = document.createElement('button');
    w.className = 'stamp-wrap pop';
    w.dataset.j = j;                            // 章下标（点选语义）
    w.style.animationDelay = (j * 90) + 'ms';
    w.setAttribute('aria-label', MOTIF_NAME[q.picks[j]] + '印章');
    const art = document.createElement('span');
    art.className = 'art';
    art.innerHTML = stampSvg(q.picks[j]);
    w.appendChild(art);
    trayEl.appendChild(w);
  }
}
/* 作品栏：已完成题的花边缩略（进度可见——关末成品展示载体；ch4 展示修复后花边） */
function renderGallery() {
  galleryEl.innerHTML = '';
  for (let k = 0; k < cur.step; k++) {
    const q = cur.quizzes[k];
    const it = document.createElement('span');
    it.className = 'gal-item';
    let h = '';
    const total = q.kind === 'fix' ? q.seq.length : q.seq.length + q.blanks;
    for (let i = 0; i < total; i++)
      h += '<span class="g-cell">' + motifSvg(qValAt(q, i)) + '</span>';
    it.innerHTML = h;
    galleryEl.appendChild(it);
  }
}
function renderQuiz() {
  renderStrip();
  renderTray();
  scarfEl.classList.toggle('cloth', cur.dch % 2 === 0);   // 章间换载体布色（围巾/桌布）
  renderGallery();
  renderStep();
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
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 开题演出：渲染 → 题面任务框架句（clip 优先/TTS 回退）→ 开放
   演出锁=真时钟 showUntil（tapStamp/tapCell 演出期 null）================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  const win = ENTER_MS + estMs(q.sayText) + 300;  // 出场 400 与任务句并行，窗=estMs+300（家族 T）
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;      // 真时钟演出锁（余量）
  KIDS.voice.play(q.sayKey, q.sayText);          /* 题面任务框架句（去泄题——不念规律） */
  replayAnim(scarfEl, 'enter');                  /* 载体出场重演 */
  await wait(win * SPEED);
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                          /* 演出完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* 多续盖位预留推进（blanks=1 表定不触达——机制保留）：当前空位格 cur 类移交 */
function advanceCurCell() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const ni = q.seq.length + q.filled;
  if (ni < stripEl.children.length) stripEl.children[ni].classList.add('cur');
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
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：ch4 找错期=错章格 / 其余=当前判定正确章（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'fix' && !q._found) {
    const bc = cellAt(q.badIdx);
    if (bc) pointGhostAt(bc);
    return;
  }
  const j = correctIdx(q);
  if (j >= 0) pointGhostAt(stampWrapAt(j));
}

/* ================= 盖印主路径（真实点击 / ST.tapStamp / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（盘区容器 bump 微动效——家族 D）；
   演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行）========== */
async function uiTapStamp(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(trayEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (q.kind === 'fix' && !q._found) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }   // ch4 先找错章
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内干扰章点吞——pop+bump 不计 miss；
     正确章放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(trayEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const cellIdx = q.kind === 'fix' ? q.badIdx : q.seq.length + q.filled;   // 本拍目标格（盖印前取值）
  const r = engTapStamp(cur, i);
  if (r === null) { sfx('pop'); replayAnim(trayEl, 'bump'); return null; }
  const el = stampWrapAt(i);

  if (r === 'wrong') {                           /* 干扰章：虚影抖动消散+错链两段+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + SHAKE_MS * SPEED + 140;
    dodgeLo();
    if (el) el.classList.add('bad');             /* 印章摇头（行为后果反馈） */
    const cell = cellAt(cellIdx);
    if (cell && q.kind !== 'fix') {              /* 图案虚影抖动消散（不留格——空位仍在；ch4 修复期不叠虚影） */
      const g = document.createElement('span');
      g.className = 'ghost';
      g.innerHTML = motifSvg(q.picks[i]);
      cell.appendChild(g);
    }
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))             /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;        /* 链豁免：2016+150+3600+300=6066 真时钟（契约 I） */
    if (q._miss === 1) replayAnim(trayEl, 'wig');           /* 方向级：盘区整体 wiggle 不指章 */
    if (q._miss >= 2) {                                     /* miss≥2=正确章 breathe（答案级梯度） */
      const ok = stampWrapAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(SHAKE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('bad');          /* 章回可重点（探索不罚） */
    if (cell && q.kind !== 'fix') { const g2 = cell.querySelector('.ghost'); if (g2) g2.remove(); }
    state.locked = false;
    return r;
  }

  /* ---- stamped/fixed/done（正确章：印章闪亮+图案弹现永久留格+确认链单 clip；
     ch4 fixed=错章位替换正确图案（suspect 标记清除）） ---- */
  lastAct = Date.now();                          /* 正确盖印重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次盖对 → 放手 */
    state.tut = 'solo';
    window.__stTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  state.showUntil = Date.now() + STAMP_WIN * SPEED + 140;   /* 2316=2016+300 精确（家族 H） */
  const cell = cellAt(cellIdx);
  if (cell) {                                    /* 图案弹现永久留格（契约 M：svg[data-motif] DOM 断言锚） */
    cell.classList.remove('blank', 'cur', 'suspect', 'done');
    cell.classList.add('stamped');
    cell.innerHTML = motifSvg(q.picks[i]);
  }
  if (el) { el.classList.remove('breathe'); el.classList.add('good'); }
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key]);           /* 确认链：spm_right 单 clip（SPEC §4） */
  await wait(STAMP_WIN * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关 */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  if (!q._answered) { advanceCurCell(); return r; }   /* 多续盖位预留（表定 blanks=1 不触达） */
  renderGallery();                               /* 本题花边入作品栏（进度可见） */
  presentQuiz();                                 /* 新题开题（载体重出场+任务句） */
  return r;
}

/* ================= ch4 找错主路径（tapCell——真实点击 / ST.tapCell / autoSolve 共用）
   点非错章=轻抖否认+spm_fix_wrong 单 clip 链（豁免窗 FIX_WRONG_WIN 4452=4152+300）；
   点中错章=found：suspect 标记+盘弹出（开盘修章）========== */
async function uiTapCell(j, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(stripEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+格条 bump */
    replayAnim(stripEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.kind !== 'fix' || q._found) return null;
  if (!Number.isInteger(j) || j < 0 || j >= q.seq.length) { sfx('pop'); replayAnim(stripEl, 'bump'); return null; }
  /* 豁免窗 guard（契约 I 同构：非错位点吞/错章位放行） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && j !== q.badIdx) {
    sfx('pop'); replayAnim(stripEl, 'bump'); return false;
  }
  const run = cur, token = showRun;
  const r = engTapCell(cur, j);
  if (r === null) { sfx('pop'); replayAnim(stripEl, 'bump'); return null; }
  const cell = cellAt(j);

  if (r === 'wrong') {                           /* 点了正确的章：轻抖否认+fixWrong 语义句 */
    state.locked = true;
    state.showUntil = Date.now() + SHAKE_MS * SPEED + 140;
    dodgeLo();
    if (cell) replayAnim(cell, 'deny');          /* 该格轻抖（这枚是对的） */
    if (sayW([VOICE.fixWrong.key]))              /* spm_fix_wrong 单 clip（占位窗 2316 真时钟） */
      wrongChainUntil = Date.now() + FIX_WRONG_WIN;
    if (q._miss >= 2) {                          /* miss≥2=错章位 breathe（答案级梯度） */
      const bc = cellAt(q.badIdx);
      if (bc) replayAnim(bc, 'breathe');
    }
    await wait(SHAKE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- found：错章标记+印章盘弹出（开盘修章） ---- */
  lastAct = Date.now();                          /* 找到错章重置救援钟 */
  state.locked = true;
  state.showUntil = Date.now() + FOUND_WIN * SPEED + 140;
  chimeGoal();
  sfx('coin');
  if (cell) cell.classList.add('suspect');       /* 错章标记（虚线圈住+脉冲） */
  renderTray();                                  /* 印章盘弹出（4 枚：正确+单色对+单形对+1） */
  await wait(FOUND_WIN * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_stamp） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
}
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  showRun++;                                     /* 通关中止在途演出 */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* spm_right：花边真漂亮（2016ms） */
  galleryEl.classList.add('finale');             /* 关末成品展示：作品栏花边齐跳（创作载体收尾） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2016+300=2316 */
    const pr = persistWin(stars);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null)（b25 形态定版） */
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
  showRun++;                                     /* 中止在途演出（重玩/换关） */
  galleryEl.classList.remove('finale');
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastHearAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.stamp && sv.stamp.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §1 v3：watch=任务句→看示范段→
   点正确章→盖印（ch1 型 ABC 续盖演示）；turn=你来盖一盖帮/独）
   watch=播 spm_tut_watch「看！按规律盖花边」→ 延 3500（≥3192+300）→ 开题演出
   （row0 任务句 12 字：400+4740+300=5440）→ ghost 移入 800+press 320
   → demo 盖正确章演出窗 2316 → __stDemoR='stamped'；
   turn=播 spm_tut_turn「你来盖一盖」→ 延 2100（≥1752+300）→ row0 首题开题
   （5440）→ 帮（指向正确章）→首对独（solo）→进正式关。
   —— watch 段分账 3500+5440+800+320+2316=12376 ≤ 16000（单步演示款 ≤16s） ---------- */
function mkQuiz(s) {                             // 教学迷你关题：规范盘序（正确章 0 号——deterministic）
  const row = ROWS[s];
  const seq = [];
  for (let i = 0; i < row.seqLen; i++) seq.push(valAt(row, i));
  const truth = valAt(row, row.seqLen);
  let picks;
  if (s < 10) {
    picks = [truth].concat(MOTIF_IDS.filter(m => m !== truth).slice(0, 2));
  } else {
    picks = [truth, COLOR_MATE[truth], SHAPE_MATE[truth]]
      .concat([DUAL_IDS.find(x => x !== truth && x !== COLOR_MATE[truth] && x !== SHAPE_MATE[truth])]);
  }
  return { scene: s, kind: row.kind,
           unit: typeof row.unit === 'string' ? row.unit
                : { colors: row.unit.colors.slice(), shapes: row.unit.shapes.slice() },
           sayKey: row.sayKey, sayText: row.sayText, period: row.period || null,
           seq: seq, blanks: 1, filled: 0, picks: picks,
           answer: 0, badIdx: -1, wrongId: null, _found: false,
           _miss: 0, _answered: false };
}
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 盖正确章返回 'stamped'）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mkQuiz(0), mkQuiz(0)] };    // 题0=演示（ABC 三色花边）/ 题1=预备位
}
function tutTurnLevel() {                        // 单题迷你关：row0 首题（正式关第一题同款）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false,
           quizzes: [mkQuiz(0)] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* spm_tut_watch：看！按规律盖花边（3192ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥3192+300=3492：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* 载体出场+任务框架句（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(stampWrapAt(idx));                /* 幽灵手指指向正确章（首枚章） */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapStamp(idx, true);     /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__stDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'stamped'——终值语义） */
  window.__stWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.stamp = sv.stamp || {};
  sv.stamp.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 row0 首题迷你关「你来盖一盖」（帮→独），首对放手进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 stamped 的 presentQuiz 新题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* spm_tut_turn：你来盖一盖（1752ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1752+300=2052 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 载体出场+任务句 → 开放盖印（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重播任务框架句（方向级救援/重听共用——去泄题：不重播规律；教学迷你关禁重播） */
function sayPatternAgain() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || cur.flat < 0) return false;
  KIDS.voice.play(q.sayKey, q.sayText);
  replayAnim(scarfEl, 'wig');
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：找找颜色的规律，再看看形状 */
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重播 */
  if (Date.now() - lastHearAt < 3000) return;    /* 重听 3s 节流 */
  lastHearAt = Date.now();
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  sayPatternAgain();                             /* 重听任务框架句（题面真值同源） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  lastAct = Date.now();
  startLevel(cur.flat);                          /* 再玩一次=重开本关（同 flat 确定性同题） */
});
/* ch4 找错：点花边格位（.cell → tapCell 找错章）；ch1-3 点格=探索空白路径（走 stage） */
stripEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.cell');
  if (!c) return;
  e.preventDefault();
  uiTapCell(Number(c.dataset.i));
});
trayEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.stamp-wrap');
  if (!p) return;                                // 章间空白走 stage 空白路径
  e.preventDefault();
  uiTapStamp(Number(p.dataset.j));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.stamp-wrap')) return;   // 章点击已由 trayEl 处理
  if (e.target.closest('#strip .cell')) return;  // 格位点击已由 stripEl 处理（ch4 找错路径）
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重播任务句+载体轻摆，lastDir 独立
   节流锚，不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（ch4 找错期=错章格
   breathe+重播；其余=正确章 breathe+重播）/ 教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      if (q.kind === 'fix' && !q._found) {
        const bc = cellAt(q.badIdx);             /* ch4 找错期：错章格 breathe */
        if (bc) replayAnim(bc, 'breathe');
      } else {
        const j = correctIdx(q);
        if (j >= 0) { const ok = stampWrapAt(j); if (ok) replayAnim(ok, 'breathe'); }
      }
      sayPatternAgain();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播任务句（不动 lastAct） */
    sayPatternAgain();
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言，照 b28 m4） */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'stamp', title: '规律画画' });   // 存档键 kidsgame_stamp（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  firstFlat = first;
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.ST——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝：kind='next'(ch1-3 续盖)|'fix'(ch4 体检)；
   unit=周期描述（ch1-2 'ABC'|'AABB'|'ABCC' 字符串；ch3-4 {colors:[3],shapes:[6]}
   双周期对象——verify 从双数组各自取模独立推导真值）；seq=示范段图案 id 序列
   （ch4 含 1 枚错章于 badIdx 位）；blank=当前空位序号（strip 0 基格号=
   seq.length+filled；ch4=badIdx 错章位）；picks=盘图案 id（3-4 枚）；answer=
   正确章下标（当前判定相位唯一）；badIdx=ch4 错章位下标（ch1-3 恒 -1）；
   found=ch4 是否已找到错章（开盘修章）；step=全关题号 0-4（b33 坑①：题号语义
   显式声明——flat*5 内的第几题，非全局题号）。
   tapStamp 返回：ch1-3 正确 'stamped'/末题 'done'；ch4 found 后正确 'fixed'/
   末题 'done'；干扰 'wrong'；豁免窗内干扰吞 false；演出期 null（真时钟锁）；
   ch4 未 found=null。tapCell 返回：ch4 错章位 'found'/非错位 'wrong'/
   豁免窗内非错位吞 false/演出期 null/非 ch4 或已 found=null ================ */
window.ST = {
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
    if (!q || q._answered) return null;
    return { kind: q.kind,                         /* 'next' 续盖 | 'fix' 体检纠错 */
             unit: typeof q.unit === 'string' ? q.unit
                : { colors: q.unit.colors.slice(), shapes: q.unit.shapes.slice() },
             seq: q.seq.slice(),                   /* 示范段图案 id 序列（ch4 含错章） */
             say: q.sayText,                       /* 任务框架句文本（keyless——去泄题） */
             blanks: q.blanks,                     /* 续盖位（表定恒 1） */
             scene: q.scene,                       /* 题库行号 0-19（SPEC §1 表行） */
             blank: q.kind === 'fix' ? q.badIdx : q.seq.length + q.filled,   /* 当前判定格序号 */
             picks: q.picks.slice(),               /* 印章盘图案 id 3-4 枚 */
             answer: q.answer,                     /* 正确章下标（verify 独立推导对账） */
             step: cur.step,                       /* 全关题号 0-4（b33 坑①语义） */
             miss: q._miss || 0,
             badIdx: q.kind === 'fix' ? q.badIdx : -1,   /* ch4 错章位；ch1-3 恒 -1 */
             found: !!(q.kind === 'fix' && q._found) };  /* ch4 找错进度（false=找错期） */
  },
  tapStamp(i) { return uiTapStamp(i); },
  tapCell(j) { return uiTapCell(j); },
  async autoSolve() {                    // UI 路径自动盖完当前关（ch4 先找错再修章；逐判定走真实链；
    let taps = 0, guard = 0;             // 演出锁/演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 200) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q || q._answered) { if (!q) break; continue; }
      if (q.kind === 'fix' && !q._found) {         /* ch4：先点错章位（found）再开盘修 */
        const rf = await uiTapCell(q.badIdx);
        if (rf === 'found') taps++;
        else if (guard >= 198) break;
        continue;
      }
      const r = await uiTapStamp(q.answer);
      if (r === 'stamped' || r === 'fixed' || r === 'done') taps++;
      else if (guard >= 198) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
