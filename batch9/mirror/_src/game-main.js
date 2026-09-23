/* ================= mirror 主逻辑（对称板渲染 / 候选点选 / 教学看帮独 / 推进 / 救援钟）
   玩法：N×N 网格 + 中轴镜线，源侧已贴图案，镜像侧留空；每题高亮一个目标格（源格的镜像位），
   题面语音问"镜子右边/下面该贴哪一张呀"，底部 3 张候选贴纸卡点选贴入。
   贴对=贴上+弹跳+亮起；贴错=晃动零惩罚；首错不 pulse，miss≥2 pulse 正确卡。
   验收钩子：window.MIR = { get currentLevel, get quiz, tapOption(i), autoSolve(), replay() } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/重播不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩共性 P1）；
   force=miss≥2 豁免（连错 2 次恰是 pulse 已亮真卡住时刻，语音与高亮同步——batch8 定版） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const boardEl = $id('board'), optsEl = $id('opts'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白/探索点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重听题面 3s 节流（防连点轰炸）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const optEl = i => optsEl.querySelector('.opt[data-i="' + i + '"]');
const cellKey = (r, c) => r + '-' + c;
const cellEl = (r, c) => boardEl.querySelector('.cell[data-k="' + cellKey(r, c) + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 题面语音（读题 sayR 级不受 flat 门；按轴取竖/横题面 clip） */
function qSpeak(q) {
  if (!q) return;
  const cl = qClip(q);
  KIDS.voice.play(cl.key, cl.text);
}

/* ================= 对称板渲染（纯函数于 cur.step——确定性重渲染）
   网格 = N 图案列/行 + 中轴 20px 镜线占位（v 轴插中间列 / h 轴插中间行）；
   格显式定位（镜像坐标数学不受视觉占位列影响：竖轴 col c↔N-1-c / 横轴 row r↔N-1-r） */
function renderBoard() {
  const N = cur.N, half = Math.floor(N / 2), v = cur.axis === 'v';
  boardEl.className = v ? '' : 'hAxis';
  boardEl.style.setProperty('--cell', N === 5 ? '74px' : '84px');
  const cellCol = 'var(--cell)';
  const motifN = Array(N).fill(cellCol).join(' ');
  const halfN = Array(half).fill(cellCol).join(' ');
  const mid = '20px';
  boardEl.style.gridTemplateColumns = v ? [halfN, mid, halfN].join(' ') : motifN;
  boardEl.style.gridTemplateRows = v ? motifN : [halfN, mid, halfN].join(' ');
  boardEl.innerHTML = '';

  /* 中轴镜线（占中列/中行整条；pointer-events:none） */
  const mir = document.createElement('div');
  mir.className = 'mirror';
  mir.setAttribute('aria-hidden', 'true');
  if (v) { mir.style.gridColumn = (half + 1) + ''; mir.style.gridRow = '1 / span ' + N; }
  else { mir.style.gridRow = (half + 1) + ''; mir.style.gridColumn = '1 / span ' + N; }
  boardEl.appendChild(mir);

  /* 源侧贴纸与镜像侧状态（由 quizzes 推导：k<step 已贴 / k=step 高亮 / k>step 留空） */
  const srcMap = {}, dstMap = {};
  cur.quizzes.forEach((q, k) => {
    srcMap[cellKey(q.src.r, q.src.c)] = q;
    dstMap[cellKey(q.dst.r, q.dst.c)] = { q: q, k: k };
  });
  /* 奇数 N：中列/中行=轴占位跳过（自镜像格不入局）；偶数 N：轴线在两列/行之间，无格可跳 */
  const ax = N % 2 === 1 ? half : -1;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if ((v ? c : r) === ax) continue;                     // 奇数 N 的中轴格跳过
      const b = document.createElement('button');
      b.className = 'cell';
      b.dataset.k = cellKey(r, c);
      if (v) { b.style.gridColumn = (c < half ? c + 1 : c + 2) + ''; b.style.gridRow = (r + 1) + ''; }
      else { b.style.gridRow = (r < half ? r + 1 : r + 2) + ''; b.style.gridColumn = (c + 1) + ''; }
      const sq = srcMap[cellKey(r, c)];
      const dq = dstMap[cellKey(r, c)];
      if (sq) {                                             // 源侧已贴：原形
        b.classList.add('src');
        b.innerHTML = motifSvg(sq.mid, sq.color, null);
        b.setAttribute('aria-label', MOTIFS[sq.mid].zh + '贴纸');
      } else if (dq) {
        const q = dq.q;
        if (dq.k < cur.step) {                              // 已贴对：镜像形
          b.classList.add('filled');
          if (dq.k === cur.step - 1) b.classList.add('pop');   // 仅刚贴上的格弹跳
          b.innerHTML = motifSvg(q.answer.mid, q.answer.color, flipOf(q, true));
          b.setAttribute('aria-label', MOTIFS[q.answer.mid].zh + '贴对');
        } else if (dq.k === cur.step) {                     // 本题目标格
          b.classList.add('target');
          b.setAttribute('aria-label', '要贴贴纸的格子');
        } else b.setAttribute('aria-label', '空格子');
      } else b.setAttribute('aria-label', '空格子');
      boardEl.appendChild(b);
    }
  }
}
/* 候选区：3 张贴纸卡（镜像形/原形/干扰由引擎 options 决定，渲染零手抄） */
function renderOpts(q) {
  optsEl.innerHTML = '';
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.dataset.i = i;
    b.dataset.mid = o.mid;
    b.dataset.mir = o.mirrored ? '1' : '0';
    b.setAttribute('aria-label', MOTIFS[o.mid].zh + (o.mirrored ? '镜子里的样子' : '贴纸'));
    b.innerHTML = motifSvg(o.mid, o.color, flipOf(q, o.mirrored));
    optsEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderBoard();
  renderOpts(q);
  renderStep();
  if (!state.demo && !state.quiet) qSpeak(q);  // 开题读题；quiet=开场/教学交接改走顺序链（batch8 M1/M3）
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

/* ================= 答题主路径（真实点击 / MIR.tapOption / autoSolve 共用） ================= */
async function uiPick(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked 门） */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const q = cur.quizzes[cur.step];
  if (!q || i < 0) return false;
  const run = cur;                              /* 演出窗口内点重玩会重建 cur——身份守卫防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  const el = optEl(i);

  if (r === 'wrong') {                          /* 贴错：晃动+灰掉可重点（零惩罚）；首错不 pulse 正确项 */
    if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('wrong'); }
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss >= 2);   /* flat<3 每错必播 / flat≥3 10s 节流+miss≥2 豁免 */
    if (q._miss >= 2) {                         /* 连错 2 次才高亮正确项 */
      const ok = optEl(correctIdx(q));
      if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    }
    await wait(420 * SPEED);
    return 'wrong';
  }
  if (r === 'again') return 'again';            /* 已灰选项：早退零惩罚不计数（防御层） */

  /* ---- 贴对 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) {
    el.classList.add('right');
    el.classList.remove('pulse');
    const m = document.createElement('span');
    m.className = 'mark';
    m.innerHTML = ICONS.check;
    el.appendChild(m);
  }
  /* 目标格即刻贴上镜像形弹跳（板面即时反馈，正式重渲染在演出窗后） */
  const tCell = cellEl(q.dst.r, q.dst.c);
  if (tCell) {
    tCell.className = 'cell filled pop';
    tCell.innerHTML = motifSvg(q.answer.mid, q.answer.color, flipOf(q, true));
  }
  sfx('coin');
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
  lastReplayAt = 0;
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.mir && sv.mir.tutSeen);
  if (VERIFY) { if (!freshTut) openingSpeak(); return; }   /* verify 页 stub 记录开场链（autoplay 断言） */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；hint 不切断题面） */
}
function openingSpeak() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([VOICE.hint.key, qClip(q).key]);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示贴对第一题（贴上弹跳+绿卡勾，locked 吞输入）→
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
  state.demo = false;                           // 临时解锁走真实路径演示一次完整贴对演出
  state.locked = false;                         /* 时序锚点（审查 m6）：吞输入依赖 uiPick 正确路径
     在首个 await 前同步重设 locked=true——禁在 uiPick 的 gate 与 locked=true 之间插入 await */
  state.quiet = true;                           // 演示贴对的换题渲染不插播下一题指令（batch8 M2）
  await uiPick(idx, true);
  const sv = KIDS._save();
  sv.mir = sv.mir || {};
  sv.mir.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来贴一贴"在重发后的题面上说（照 batch5-8） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  const q0 = cur.quizzes[0];                    // 交接顺序链：turn→题面（play(turn) 不得切断题面）
  KIDS.voice.queue([VOICE.turn.key, qClip(q0).key]);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与板面交互 ================= */
let helpRedemo = false;
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重听题面（听按钮/目标格共用）：sayR 不受 flat 门；3s 节流防连点轰炸（force=测试钩子直通） */
function replaySpeech(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  qSpeak(q);                                    // 按轴重读题面（竖轴/横轴 clip 不同）
  return true;
}
function wigCell(el) {
  if (!el) return;
  el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig');
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
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 对齐重玩门 */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  replaySpeech(false);
});
/* 板面：目标格=重听题面（3s 节流）；其余格=探索点击轻提示（10s 节流，不重置救援钟） */
boardEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.cell');
  e.preventDefault();
  if (VERIFY || !el || !cur || state.locked || state.won || state.demo) return;
  if (el.classList.contains('target')) { replaySpeech(false); return; }
  wigCell(el);
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});
optsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.opt');
  if (el) { e.preventDefault(); uiPick(Number(el.dataset.i)); return; }
  e.preventDefault();                           /* 点候选区空白：10s 节流轻提示（§0.16） */
  if (VERIFY || !cur || state.locked || state.won || state.demo) return;
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（5.5 岁等待极限 15s 内）/ 教学"帮"5s 重演示一次
   救援=重读当前题面；只有本看护与正确推进写 lastAct（错点/探索点击不重置 §0.7a） */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援：重读题面（不受 flat 门，§0.5） */
    if (q) qSpeak(q);
    if (q) {                                    /* 视觉重现（试玩共性 P1）：正确贴纸 pulse 一次，静音也能看见答案线索 */
      const ai = q.options.findIndex(o => o.mid === q.answer.mid && o.color === q.answer.color && o.mirrored === q.answer.mirrored);
      const ok = optEl(ai);
      if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    }
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
  KIDS.init({ game: 'mirror', title: '对称画' });
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
window.MIR = {
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, axis: cur.axis, N: cur.N,
      n: cur.quizzes.length, step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
      solved: !!q.solved };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { axis: q.axis, N: q.N,
      src: { r: q.src.r, c: q.src.c }, dst: { r: q.dst.r, c: q.dst.c },
      answer: { mid: q.answer.mid, color: q.answer.color, mirrored: q.answer.mirrored },
      options: q.options.map(o => ({ mid: o.mid, color: o.color, mirrored: o.mirrored })),
      step: cur.step, miss: q._miss || 0,
      dead: q.options.map((o, i) => !!(q._dead && q._dead[i])) };
  },
  tapOption(i) { return uiPick(i); },
  replay() { return replaySpeech(true); },      /* 测试钩子：无视节流直通重播 */
  async autoSolve() {                           // UI 路径自动贴完当前关（每题贴正确卡，走真实流程）
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
