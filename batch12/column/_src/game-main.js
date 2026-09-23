/* ================= column 主逻辑（r15：黑板渲染 4 列 / 计划驱动填键+标记操作步 / 板擦 / 教学 / 救援 / 推进）
   玩法：小黑板呈现竖式（4 列数位对齐+横线：op|百|十|个，两位数百位列空），答案格当前格高亮闪烁；
   先个位后高位逐位填（clm_hint 口径）+ 进退位标记操作步：
   加法=填个位后若满十须点亮十位上方小"1"（再填十位）；减法=个位不够减先点亮被减数十位退位点（再填个位）；
   三位数双标记题两个标记步；两步题步 1 走完换步 2（中间结果作步 2 首操作数，①② 步标）。
   标记相位按数字键=miss 不可跳过（r15 核心：进退位由玩家自己点亮，系统不代劳）；
   填错/错点亮=暖红晃+零惩罚同位重试（不灰化款，miss 无上限计数）；提前点亮/重复点已亮=轻反馈不 miss。
   救援钟 14s（§0.7a/§0.21）：填位相位=重读题面 clm_q_* + 应填数字键 breathe；标记相位=标记句
   clm_carry_go/clm_borrow_go + 标记槽 breathe；错点/空白/探索点击不重置救援钟（契约 K 面板守卫）。
   验收钩子：window.CL = { get currentLevel, get quiz, tapKey(d), tapMark(t,col), start(flat), hear(),
     autoSolve(), get rescues, get tutorial } —— quiz 口径见 game-verify.js 钩子单元 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内过渡/动画计时提速（防总时长爆炸）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场读题/教学不受 flat 门（§0.5：不识字孩子 flat≥3 静置零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force=miss===2 豁免恰一次
   ——不灰化款（miss 无上限）必须 === 2（batch9/11 定版，防豁免变每错必播） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const stageEl = $id('stage'), tableEl = $id('table'), keysEl = $id('keys'),
      tipEl = $id('tip'), tipTextEl = $id('tip-text'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白/探索点击轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 听按钮重播 3s 节流
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;
let prevActT = null;                            /* 上一动作类型（标记相位入口判定：'d'→标记=新入口） */

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const keyEl = d => keysEl.querySelector('.key[data-d="' + d + '"]');
const zoneEl = (t, col) => $id('mz-' + t + col);          // 标记槽元素（'c'/'b' × 1/2 列）
const cellEl = col => $id(['c-o', 'c-t', 'c-h'][col]);    // 列号→答案格（0=个位 1=十位 2=百位）

/* ================= 静态构建 ================= */
const KEY_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, null];   // 3×4：1-9 + 空|0|空
/* r15 审查 M3：旧档基迁移——CH_LEN 5→8 使 r12 存量档（5 基 '1-0'..'4-4'）键位错位（旧 '2-0'=旧 flat5
   误作新 flat8→跳关+章语义错乱）。新基顺序解锁下「有跨章首关 C-0 而缺前章第 6 键 (C-1)-5」=旧基残留矛盾态
   →一次性整档重置（赶在 KIDS.init 读档前删 localStorage，教学关 ~5min 成本优于静默跳关）。 */
try {
  const raw = localStorage.getItem('kidsgame_column');
  if (raw) {
    const lv = (JSON.parse(raw) || {}).levels || {};
    let legacy = false;
    for (let c = 2; c <= 4; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { legacy = true; break; }
    }
    if (legacy) localStorage.removeItem('kidsgame_column');
  }
} catch (e) { /* 迁移失败不阻断启动 */ }
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  keysEl.innerHTML = '';
  KEY_ORDER.forEach(d => {
    if (d === null) {                          // 末行两侧占位（非按钮，不参与触摸审计）
      const sp = document.createElement('div');
      sp.className = 'keysp';
      sp.setAttribute('aria-hidden', 'true');
      keysEl.appendChild(sp);
      return;
    }
    const b = document.createElement('button');
    b.className = 'key';
    b.dataset.d = d;
    b.setAttribute('aria-label', '数字 ' + d);
    b.textContent = d;
    keysEl.appendChild(b);
  });
  /* 标记槽统一挂 pointerdown（引擎判分型：mark/early/wrongslot/false 惰性） */
  [['c', 1], ['c', 2], ['b', 1], ['b', 2]].forEach(([t, col]) => {
    const z = zoneEl(t, col);
    z.addEventListener('pointerdown', e => {
      e.preventDefault();
      uiMark(t, col);
    });
  });
  layout();
}
/* 桌面布局（黑板‖键盘）：按舞台实测切换横/竖排；body.port 类通道强制竖排（r15 竖屏双通道）；
   键径 clamp[64,104]、黑板字号 clamp[40,62]（黑板数字 ≥40px 门禁） */
function layout() {
  const availW = stageEl.clientWidth - 16;
  const availH = stageEl.clientHeight - tipEl.offsetHeight - 22;
  const colMode = document.body.classList.contains('port') ||
                  (availH >= 640 && availW < availH * 1.1);   // 高屏窄持=竖排；否则横排
  tableEl.classList.toggle('col', colMode);
  const gap = 13;
  let kw, kh, bw, bh;
  if (colMode) {
    kw = Math.min(availW, 460); kh = availH * 0.42;
    bw = Math.min(availW, 480); bh = availH * 0.50;
  } else {
    kw = availW * 0.42; kh = availH * 0.92;
    bw = availW * 0.50; bh = availH * 0.94;
  }
  const key = Math.max(64, Math.min(Math.floor((kw - 2 * gap) / 3),
    Math.floor((kh - 3 * gap) / 4), 104));
  const bbw = Math.min(bw, 440);
  const bbfs = Math.max(40, Math.min(Math.floor(Math.min(bbw * 0.20, bh * 0.145)), 62));
  const de = document.documentElement;
  de.style.setProperty('--key', key + 'px');
  de.style.setProperty('--bbfs', bbfs + 'px');
}
window.addEventListener('resize', () => layout());

/* ================= 渲染 ================= */
function setTip(kind) {                         // kind: 'watch' | 'help' | op | 'two'
  if (kind === 'watch') { tipEl.className = 'watch'; tipTextEl.textContent = TIP_WATCH; }
  else if (kind === 'help') { tipEl.className = 'help'; tipTextEl.textContent = TIP_HELP; }
  else { tipEl.className = ''; tipTextEl.textContent = TIPS[kind] || ''; }
}
function renderStep() {                         // HUD 本关 8 题进度点
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
    const done = LV_RANGE.every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 竖式黑板状态渲染：4 列数位对齐大字 + 标记槽 arm/cur/lit + 答案格当前位高亮 + ①② 步标 */
function renderBoardState(q) {
  if (!q) return;
  const s = q.steps[q.si], nd = s.nd;
  const dg = (n, i) => nd > 2 || i < 2 ? String(n).split('').reverse()[i] : '';
  $id('a-h').textContent = nd === 3 ? dg(s.a, 2) : '';
  $id('a-t').textContent = dg(s.a, 1);
  $id('a-o').textContent = dg(s.a, 0);
  $id('b-h').textContent = nd === 3 ? dg(s.b, 2) : '';
  $id('b-t').textContent = dg(s.b, 1);
  $id('b-o').textContent = dg(s.b, 0);
  $id('op-sign').textContent = s.op === 'add' ? '+' : '−';
  $id('step-chip').textContent = q.form ? (q.si === 0 ? '①' : '②') : '';
  [0, 1, 2].forEach(col => {
    const c = cellEl(col);
    c.textContent = s.cells[col] == null ? '' : s.cells[col];
    c.classList.remove('cur', 'lit', 'bad');
  });
  const act = s.plan[s.pos];
  if (act && act.t === 'd') cellEl(act.col).classList.add('cur');   // 当前应填格高亮
  /* 标记槽：可见性（加法=标记带 / 减法=位格）+ arm 淡锚 + cur 呼吸 + lit 已亮 */
  [['c', 1], ['c', 2], ['b', 1], ['b', 2]].forEach(([t, col]) => {
    const z = zoneEl(t, col);
    const visible = (t === 'c') === (s.op === 'add') && col < nd;
    z.hidden = !visible;
    z.classList.toggle('arm', visible && !z.classList.contains('lit'));
    z.classList.toggle('lit', s.lit.indexOf(markKey(t, col)) >= 0);
    z.classList.toggle('cur', !!(act && act.t === t && act.col === col));
  });
}
/* 相位同步：标记相位键盘降权+入口提示（flat<3 单次）
   判据 prevActT==='d'（刚从填位进入标记相位）或 allowPrompt（新题/交接后首动作即借位） */
function syncPhase(allowPrompt) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) { keysEl.classList.remove('dim'); return; }
  const s = q.steps[q.si];
  const act = s.plan[s.pos];
  keysEl.classList.toggle('dim', !!act && act.t !== 'd');
  if (act && act.t !== 'd' && (prevActT === 'd' || allowPrompt)) {
    const v = act.t === 'c' ? VOICE.carryGo : VOICE.borrowGo;
    if (!state.demo && !state.quiet) sayP(v.key, v.text);
  }
  prevActT = act ? act.t : null;
}
function hideSweep() { $id('bb').classList.remove('sweep', 'wiped', 'stepswap'); }
function clearBreathe() {
  keysEl.querySelectorAll('.key.breathe').forEach(k => k.classList.remove('breathe'));
  document.querySelectorAll('.mzone.breathe').forEach(z => z.classList.remove('breathe'));
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearBreathe();
  hideSweep();
  prevActT = null;
  [0, 1, 2].forEach(col => { const c = cellEl(col); c.className = 'bcell'; });
  renderBoardState(q);
  renderStep();
  setTip(state.tut === 'watch' ? 'watch' : (state.tut === 'help' ? 'help' : (q.form ? 'two' : q.steps[0].op)));
  syncPhase(false);
  if (!state.demo && !state.quiet) qSpeak(q);   // 常规换题读题面指令（sayR 口径不受 flat 门）
}
function qSpeak(q) { if (q) KIDS.voice.play(qKeyOf(q), qTextOf(q)); }

/* ================= 救援视觉（§0.21）：应填数字键 / 应点标记槽 breathe 持续循环 ================= */
function breatheTarget() {
  clearBreathe();
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.solved) return;
  const s = q.steps[q.si];
  const act = s.plan[s.pos];
  if (!act) return;
  if (act.t === 'd') { const el = keyEl(act.v); if (el) el.classList.add('breathe'); }
  else { const z = zoneEl(act.t, act.col); if (z && !z.hidden) z.classList.add('breathe'); }
}
function nudgeKey(d) {                          // 吞输入期轻反馈视觉（§0.22）
  const el = keyEl(d);
  if (el) { el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); }
}
function nudgeZone(t, col) {                    // 标记槽轻闪（early/吞输入反馈）
  const z = zoneEl(t, col);
  if (z) { z.classList.remove('shake'); void z.offsetWidth; z.classList.add('shake'); }
}

/* ================= 幽灵手指（教学"帮"与演示共用） ================= */
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
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：当前应做的动作（填位=数字键 / 标记=标记槽） */
function pointHelpNext() {
  if (!cur) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;
  const s = q.steps[q.si];
  const act = s.plan[s.pos];
  if (!act) return;
  pointGhostAt(act.t === 'd' ? keyEl(act.v) : zoneEl(act.t, act.col));
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 填键主路径（真实点击 / CL.tapKey / autoSolve 共用） ================= */
async function uiKey(d, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked 门，照家族惯例） */
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo && !state.won) { sfx('pop'); nudgeKey(d); }   // 吞输入+轻叮+键圈轻闪（§0.22）
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (!Number.isInteger(d) || d < 0 || d > 9) return false;
  const run = cur;                              /* 演出窗口内点重玩会重建 cur——身份守卫防旧续体错推进 */
  const s = q.steps[q.si];
  const act = s.plan[s.pos];
  const r = engKey(cur, d);
  if (r === null || r === false) return false;

  if (r === 'wrong' || r === 'wrongmark') {
    if (r === 'wrong') {                        /* 填错：该格暖红晃+零惩罚同位重填（不灰化可重点） */
      const cell = cellEl(act.col);
      if (cell) {
        cell.textContent = d;
        cell.classList.remove('bad'); void cell.offsetWidth; cell.classList.add('bad');
      }
      sfx('fail');
      sayW(VOICE.hint.key, VOICE.hint.text, q.miss === 2);
    } else {                                    /* 标记相位按数字键：应点标记槽脉冲+方向句（不可跳过） */
      nudgeZone(act.t, act.col);
      sfx('fail');
      const v = act.t === 'c' ? VOICE.carryGo : VOICE.borrowGo;
      sayW(v.key, v.text, q.miss === 2);
    }
    state.locked = true;                        /* 晃动窗防重入（此窗内新点击=演出窗吞输入+轻叮） */
    await wait(620 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (r === 'wrong') {
      const cell = cellEl(act.col);
      if (cell) { cell.textContent = ''; cell.classList.remove('bad'); }
    }
    renderBoardState(q);                        /* 当前格高亮复位（同一格重填） */
    return r;
  }

  /* ---- 填对：粉笔白亮+跳下一动作（引擎已推进） ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次填对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
    setTip(q.form ? 'two' : s.op);
  }
  const cell = cellEl(act.col);
  if (cell) {
    cell.textContent = d;
    cell.classList.remove('bad', 'cur');
    cell.classList.add('lit');
  }
  if (!VERIFY) KIDS.audio.note(act.col === 0 ? 523.25 : (act.col === 1 ? 659.25 : 783.99), 0.38, 0, 0.85);
  if (r === 'step2') {                          /* 步 1 完成：换步 2（板面换页+第二步句） */
    renderBoardState(q);                        /* 先落格白亮再换面 */
    state.locked = true;
    await wait(300 * SPEED);
    if (cur !== run) return r;
    $id('bb').classList.add('stepswap');
    prevActT = 'd';                             /* 换步后首动作若为标记=新入口（提示可播） */
    renderBoardState(q);
    sayR(VOICE.qStep2.key, VOICE.qStep2.text);  /* 第二步指令（救援口径不受 flat 门） */
    syncPhase();
    await wait(420 * SPEED);
    if (cur !== run) return r;
    $id('bb').classList.remove('stepswap');
    state.locked = false;
    return r;
  }
  renderBoardState(q);                          /* 下一格高亮/标记槽 cur 在此更新 */
  syncPhase();
  if (q.solved) {                               /* 末位填对=过题：板擦横扫 → 换题/通关 */
    sfx('coin');
    state.locked = true;
    await wait(360 * SPEED);
    if (cur !== run) return r;
    await eraserSweep();
    if (cur !== run) return r;
    state.locked = false;
    if (r === 'done') winFlow();
    else renderQuiz();
  }
  return r;
}

/* ================= 标记槽主路径（r15 操作步：真实点击 / CL.tapMark / autoSolve 共用） ================= */
async function uiMark(t, col, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo && !state.won) { sfx('pop'); nudgeZone(t, col); }   // 吞输入+轻叮+槽闪（§0.22）
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  const run = cur;
  const s = q.steps[q.si];
  const act = s.plan[s.pos];
  const r = engMark(cur, t, col);
  if (r === null || r === false) return r;      /* 非法参数 / 异 op 槽位惰性 no-op（静默） */

  if (r === 'early') {                          /* 提前点亮/重复点已亮：轻反馈不 miss 不推进 */
    sfx('pop');
    nudgeZone(t, col);
    return 'early';
  }
  if (r === 'wrongslot') {                      /* 同 op 错点亮：槽暖红晃+方向句+miss */
    nudgeZone(t, col);
    sfx('fail');
    const v = t === 'c' ? VOICE.carryGo : VOICE.borrowGo;   /* r15 审查 m3：原 noCarry/noBorrow 在位置错场景与事实反（'o' 题点 c2 实需进位）→改播方向句（引导点亮，零新增键） */
    sayW(v.key, v.text, q.miss === 2);
    state.locked = true;
    await wait(620 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    renderBoardState(q);
    return r;
  }

  /* ---- 点亮成功：小 1/退位点弹入+轻音（标记相位提示音升调） ---- */
  lastAct = Date.now();                         /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
    setTip(q.form ? 'two' : s.op);
  }
  const z = zoneEl(t, col);
  if (z) { z.classList.remove('arm'); }
  if (!VERIFY) KIDS.audio.note(880, 0.3, 0, 0.7);
  renderBoardState(q);
  syncPhase(false);
  return 'mark';
}
/* 板擦横扫动画（过题）：擦子横扫+板面字迹渐隐，~0.9s */
async function eraserSweep() {
  const bb = $id('bb');
  bb.classList.remove('sweep', 'wiped'); void bb.offsetWidth;
  bb.classList.add('sweep', 'wiped');
  await wait(880 * SPEED);
  bb.classList.remove('sweep', 'wiped');
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（不带"明天："前缀，core 模板自带）
     ——家族 F 契约：生成关实算 genLevel(f+1).dch 取文案，禁章序取模推进形态 */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  clearTimeout(helpTimer);
  ghost.hide();
  clearBreathe();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, LV_RANGE);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const starsN = LV_RANGE.reduce((s2, l) => s2 + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: starsN, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A（b25 形态定版）：dayEnd 预告按进度关 */
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
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  prevActT = null;
  lastAct = Date.now();
  clearBreathe();
  renderQuiz(); renderDots();
  layout();
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.column && sv.column.tutSeen);
  state.quiet = false;
  if (freshTut) { tutorialWatch(); return; }
  openingSpeak();                               /* 开场顺序链：题面指令单次（verify 页 stub 记录断言） */
  syncPhase(true);                              /* 借位题开题即标记相位：入口提示（flat<3） */
}
function openingSpeak() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([qKeyOf(q)]);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.column.tutSeen）
   看=固定演示题 36+47（进位题：完整走 填个位→点亮进位小 1→填十位=新操作步全链演示；
   locked 吞输入；幽灵手指 指个位格→指数字键→按下填入 → 指进位槽→按下点亮 → 指十位键→按下；
   两位全对=板擦横扫完整闭环）→ 立即重发同关（确定性关卡，题面一致）；
   帮=幽灵手指指向当前应做的动作（键/槽）；交接走顺序链 queue([clm_tut_turn, 题面])
   （§0.6 禁双通道叠音）；独=首次推进放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  setTip('watch');
  sayR(VOICE.watch.key, VOICE.watch.text);      /* 教学 opening 用 sayR 不受 flat 门（§0.6） */
  const demo = quizOfSingle('add', 36, 47);     /* 固定演示题：36+47=83 进位（含标记操作步） */
  cur.quizzes[0] = demo;                        /* 顶替首题渲染（教学后 tutorialHandoff 重发原关） */
  renderBoardState(demo);
  await wait(1200 * SPEED);
  /* 演示 1：指个位格 → 指键 → 填入 */
  pointGhostAt(cellEl(0));
  await wait(950 * SPEED);
  ghost.press();
  await wait(340 * SPEED);
  pointGhostAt(keyEl(demo.steps[0].plan[0].v));
  await wait(950 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  state.demo = false; state.locked = false;     /* 时序锚点（batch9 m6）：解锁窗内无 await 插入 */
  state.quiet = true;                           /* 演示填入的反馈不插播语音 */
  await uiKey(demo.steps[0].plan[0].v, true);
  /* 演示 2（r15 核心）：指进位槽 → 按下点亮小 1 */
  state.demo = true; state.locked = true;
  await wait(500 * SPEED);
  pointGhostAt(zoneEl('c', 1));
  await wait(900 * SPEED);
  ghost.press();
  await wait(340 * SPEED);
  state.demo = false; state.locked = false;
  state.quiet = true;
  await uiMark('c', 1, true);
  /* 演示 3：指十位键 → 填入 → 板擦闭环 */
  state.demo = true; state.locked = true;
  await wait(500 * SPEED);
  pointGhostAt(keyEl(demo.steps[0].plan[2].v));
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  state.demo = false; state.locked = false;
  state.quiet = true;
  await uiKey(demo.steps[0].plan[2].v, true);   /* 末位填对 → 板擦横扫（quiet 不播） */
  const sv = KIDS._save() || { levels: {} };   /* 空档防御（审查 m3：core _save 未 init 返 null） */
  sv.column = sv.column || {};
  sv.column.tutSeen = true;
  KIDS.store.persist();
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                            // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  prevActT = null;
  lastAct = Date.now();
  clearBreathe();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链：clm_tut_turn → 题面指令（§0.6 禁双通道叠音） */
  KIDS.voice.queue([VOICE.turn.key, qKeyOf(cur.quizzes[0])]);
  syncPhase(true);                              /* 借位题开题即标记相位：入口提示（flat<3） */
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重读题面（听按钮）：重播 clm_q_*；sayR 不受 flat 门；3s 节流防连点轰炸（force=测试钩子直通） */
function replaySpeech(force) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  const now = Date.now();
  if (!force && now - lastReplayAt < 3000) return false;
  lastReplayAt = now;
  qSpeak(q);
  return true;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16：教学/演出期 pop+hop 不静默 */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 对齐重玩门 */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  replaySpeech(false);
});
keysEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.key');
  if (el) { e.preventDefault(); uiKey(Number(el.dataset.d)); return; }   /* watch 期 uiKey 自吞 */
});
stageEl.addEventListener('pointerdown', e => {  /* 点舞台空白（非键非板非按钮）：10s 节流轻提示 */
  if (e.target.closest('.key') || e.target.closest('button')) return;
  if (e.target.closest('#bb') && !(state.locked || state.won || state.demo)) return;  /* 黑板非演出期=无操作 */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }  /* 吞输入期轻叮（审查 m4，§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.7a/§0.21）/ 教学"帮"5s 重演示一次
   填位相位=重读题面 clm_q_* + 应填数字键 breathe；标记相位=标记句 + 应点标记槽 breathe；
   只有本看护与正确推进写 lastAct——错点/空白/兔子点击不重置；
   演出窗（locked=板擦/晃动/换步）与教学看演期不救援；面板层在场不救援（契约 K） */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                   /* 过题过渡窗不救援（板擦在扫） */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueCount++;
    const s = q.steps[q.si];
    const act = s.plan[s.pos];
    if (act && act.t !== 'd') {                 /* 标记相位：方向句+槽 breathe */
      const v = act.t === 'c' ? VOICE.carryGo : VOICE.borrowGo;
      sayR(v.key, v.text);
    } else {
      sayR(qKeyOf(q), qTextOf(q));              /* 填位相位：重读题面（op 对应 clm_q_*） */
    }
    breatheTarget();
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
  KIDS.init({ game: 'column', title: '竖式小黑板' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.CL = {
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
    if (!q || q.solved) return null;
    const s = q.steps[q.si];
    const act = s.plan[s.pos];
    return { op: q.op, form: q.form || null, a: q.a, b: q.b, c: q.c == null ? null : q.c,
             ans: q.ans, mid: q.mid == null ? null : q.mid, nd: s.nd, si: q.si,
             phase: act.t === 'd' ? 'fill' : (act.t === 'c' ? 'carry' : 'borrow'),
             need: act.t === 'd' ? act.v : null,
             mark: act.t === 'd' ? null : { t: act.t, col: act.col },
             col: act.col, cells: s.cells.slice(), marks: s.lit.slice(),
             step: cur.step, miss: q.miss,
             carry: s.marks.some(m => m.charAt(0) === 'c'),
             borrow: s.marks.some(m => m.charAt(0) === 'b') };
  },
  tapKey(d) { return uiKey(d); },
  tapMark(t, col) { return uiMark(t, col); },
  start(flat) {                                 /* 测试钩子：跳关（教学看演期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  hear() { return replaySpeech(true); },        /* 测试钩子：无视节流直通重读题面 */
  async autoSolve() {                           // UI 路径自动答完当前关（照 plan 逐动作：填位+标记）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 400) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const s = q.steps[q.si];
      const act = s.plan[s.pos];
      if (!act) break;
      const r = act.t === 'd' ? await uiKey(act.v) : await uiMark(act.t, act.col);
      if (r === false || r === null) break;
      taps++;
      await wait(50);
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get rescues() { return rescueCount; },        /* 救援触发计数（自测用） */
  get tutorial() { return state.tut; }
};
