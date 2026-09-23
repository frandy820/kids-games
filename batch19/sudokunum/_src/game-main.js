/* ================= sudokunum 主逻辑（盘面渲染 / 点格选数 / 教学 / 救援 / 推进）
   玩法（SPEC §3）：6×6 盘（2×3 宫粗描边分区）+底部数字卡 1-6。
   点空格=选中（数字卡区点亮）→点数字卡填入；点自己填的格=清除；点 given 格=轻叮不可清。
   填错=格子摇头+红数字闪过（不进格）+冲突源格红闪，零惩罚可改（§0.8）；
   全盘填对=盘框转绿+波浪跳+sn_right → 下一题（关内 5 盘），关完成 celebrate+写档。
   §0.7a 口径：填对/清除/点格选中=主动学习动作重置救援钟；错点/空白/兔子不重置。
   §0.26 晃动窗防重入（1000ms 禁偏离）+身份守卫（const run=cur，await 后 cur!==run 丢弃旧续体）。
   梯度脚手架（b18 定案承）：错 1 次仅闪方向级线索（存在唯一候选的格 breathe）；
   miss≥2 才出答案级（该格 breathe+对应数字卡 pulse）；救援 14s 同口径分级（§0.21）。
   验收钩子：window.SN = { get currentLevel, get quiz, tapCell(i), tapNum(n), start(flat),
   async autoSolve(), get tutorial, get rescues }（getter 拷贝非活引用） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3 播）；救援/开场/教学不受 flat 门（§0.5） */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播 / flat≥3 10s 节流+豁免恰一次（§0.5，不灰化款 miss===2） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const TIP_TEXT = '每行每列不重复';             /* 提示条常显文案（与 watch clip 文案同源 §0.18） */

const stageEl = $id('stage'), tipEl = $id('tip'), tipIcoEl = $id('tip-ico'), tipTextEl = $id('tip-text'),
      boardEl = $id('board'), bdCheckEl = $id('bd-check'), numsEl = $id('nums'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白点击轻提示节流（§0.16，10s）
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellEl = i => boardEl.querySelector('.cell[data-i="' + i + '"]');
const numEl = n => numsEl.querySelector('.num[data-n="' + n + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  tipIcoEl.innerHTML = ICONS.lens;
  bdCheckEl.innerHTML = ICONS.check;
}

/* ================= 渲染 ================= */
function renderQuiz() {                         // 新一盘：建 36 格（保留 bd-check 角标）
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearBreathe();
  boardEl.classList.remove('ok');
  tipTextEl.textContent = TIP_TEXT;
  boardEl.querySelectorAll('.cell').forEach(e => e.remove());
  for (let i = 0; i < N6 * N6; i++) {
    const r = (i / N6) | 0, c = i % N6;
    const b = document.createElement('button');
    b.className = 'cell' + (r % BOX_R === BOX_R - 1 && r < N6 - 1 ? ' bxb' : '') +
      (c % BOX_C === BOX_C - 1 && c < N6 - 1 ? ' bxr' : '');
    b.dataset.i = i;
    b.setAttribute('aria-label', '第' + (r + 1) + '行第' + (c + 1) + '列');
    boardEl.appendChild(b);
  }
  if (!numsEl.childElementCount) {              // 数字卡 1-6（一次构建）
    for (let n = 1; n <= N6; n++) {
      const b = document.createElement('button');
      b.className = 'num';
      b.dataset.n = n;
      b.setAttribute('aria-label', '数字' + n);
      b.textContent = n;
      numsEl.appendChild(b);
    }
  }
  renderCells();
  renderStep();
}
function renderCells() {                        // 全量刷新格子状态（36 格开销可忽略）
  const q = cur.quizzes[cur.step];
  if (!q) return;
  for (let i = 0; i < N6 * N6; i++) {
    const el = cellEl(i);
    if (!el) continue;
    const v = q.grid[i];
    el.classList.toggle('given', q.given[i]);
    el.classList.toggle('empty', v === 0);
    el.classList.toggle('mine', v !== 0 && !q.given[i]);
    el.classList.toggle('sel', q.sel === i);
    el.textContent = v === 0 ? '' : v;
  }
  numsEl.classList.toggle('live', q.sel >= 0);  // 选中格后数字卡区点亮
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

/* ================= 视觉反馈小件 ================= */
function clearBreathe() { boardEl.querySelectorAll('.breathe').forEach(e => e.classList.remove('breathe')); }
function clearHints() {                          /* 新提示前清全部旧提示（breathe+数字卡 pulse——防类残留误导读） */
  clearBreathe();
  numsEl.querySelectorAll('.pulse').forEach(e => e.classList.remove('pulse'));
}
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
const wigCell = i => replayAnim(cellEl(i), 'wig');
const hopCell = i => replayAnim(cellEl(i), 'hop');
const nudgeCell = i => replayAnim(cellEl(i), 'nudge');
const breatheCell = i => { if (cellEl(i)) cellEl(i).classList.add('breathe'); };
const pulseNum = n => replayAnim(numEl(n), 'pulse');
const nudgeNum = n => replayAnim(numEl(n), 'nudge');
function flashBadCell(i, n) {                   /* 错数红闪 0.6s 后消失（不进格；纯视觉不随 SPEED 提速——
                                                   verify 错点断言在 1000ms 防重入窗后才检查） */
  const el = cellEl(i);
  if (!el) return;
  el.textContent = n;
  el.classList.add('bad');
  setTimeout(() => { el.classList.remove('bad'); if (el.textContent === String(n)) el.textContent = ''; }, 600);
}
function pulseFoes(q, i, n) {                   /* 冲突源格红闪（教孩子看到哪里重复） */
  engConflictCells(q, i, n).forEach(j => replayAnim(cellEl(j), 'foe'));
}
function boardOk() {                            /* 全盘完成：盘框转绿+波浪跳+勾角标 */
  boardEl.classList.add('ok');
  boardEl.querySelectorAll('.cell').forEach((e, k) => {
    setTimeout(() => replayAnim(e, 'wave'), k * 30 * SPEED);
  });
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
  clearBreathe();                               /* 指新目标前清全部旧 breathe（家族 P1-3 教训） */
  ghost.toEl(el);
  ghost.show();
  replayAnim(el, 'pulse');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"指向：唯一候选格 breathe——方向级线索（不直接给数字，孩子自己看行） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = engTeachCell(q);
  if (!t) return;
  breatheCell(t.i);
  pointGhostAt(cellEl(t.i));
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(() => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 点格主路径（真实点击 / SN 钩子 / autoSolve / 教学演示共用）
   demo=true 仅教学"看"演示通道（豁免 locked 门，batch5 M1 教训） ================= */
async function uiTapCell(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); nudgeCell(i); }    /* 吞输入+轻叮+格子轻闪（§0.22） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved || i < 0 || i >= N6 * N6) return false;
  const wasFilled = q.grid[i] !== 0;
  const r = engTapCell(cur, i);
  if (r === false) {                            /* given 格不可清 / 非法下标 */
    sfx('pop');
    nudgeCell(i);
    return false;
  }
  lastAct = Date.now();                         /* 主动学习动作重置救援钟（§0.7a） */
  sfx('click');
  renderCells();
  if (wasFilled) replayAnim(cellEl(i), 'flash'); /* 清除轻闪 */
  return true;
}

/* ================= 选数主路径：填入判定（对/错/完成推进） ================= */
async function uiTapNum(n, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); nudgeNum(n); }     /* 吞输入+轻叮+卡圈轻闪（§0.22 主答案同规） */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved || n < 1 || n > N6) return false;
  if (q.sel < 0) {                              /* 无选中格：轻叮提示先点格 */
    sfx('pop');
    nudgeNum(n);
    return false;
  }
  const run = cur;                              /* 身份守卫：演出窗内重玩会重建 cur */
  const iSel = q.sel;                           /* 错格下标先取（engTapNum wrong 会清 sel） */
  const r = engTapNum(cur, n);
  if (r === false) return false;
  if (r === 'wrong') {                          /* 错填：摇头+红闪+零惩罚（错数不进格） */
    sfx('fail');
    sayW(VOICE.wrong.key, VOICE.wrong.text, q._miss === 2);   /* miss 首达 2 豁免恰一次（§0.5） */
    wigCell(iSel);
    flashBadCell(iSel, n);
    pulseFoes(q, iSel, n);
    /* 梯度脚手架（b18 定案）：错 1 次仅方向级（唯一候选格 breathe）；miss≥2 答案级（+数字卡 pulse） */
    clearHints();                                /* 新提示前清旧提示（防 pulse 类残留误导读） */
    const t = engTeachCell(q);
    if (t && t.dead) {                           /* 死局：指孩子放错的格摇头+明说（审查 M3） */
      wigCell(t.i);
      KIDS.voice.play('sn_dead', '有一个数字放错啦，换一换摇头的格子');   /* T46 阶段2：keyless→clip 化（sn_dead 在册） */
    } else if (t) {
      breatheCell(t.i);
      if (q._miss >= 2) pulseNum(t.n);
    }
    state.locked = true;                        /* 晃动窗防重入（§0.26：连点只记一次 miss） */
    await wait(1000 * SPEED);              /* b16 试玩定案：错点防重入窗 1000ms 禁偏离 */
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') scheduleHelpGhost(1500);   /* 试玩 P5：错点后 1.5s 再演示（原 300ms 抢答感） */
    return r;                                   /* 错点不重置救援钟（§0.7a） */
  }
  /* ---- 填对：格子跳+数字入格；全盘完成=盘框转绿+sn_right → 推进 ---- */
  lastAct = Date.now();                         /* 点对重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次填对放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  clearHints();
  renderCells();
  hopCell(iSel);                                /* 填对的格子跳一下 */
  sfx('coin');
  if (r === 'done') {
    boardOk();
    KIDS.voice.play(VOICE.right.key, VOICE.right.text);   /* 全盘完成确认句（§3） */
    state.locked = true;
    await wait(2100 * SPEED);                   /* 波浪+确认语音播完再进下一盘 */
    if (cur !== run) return r;
    state.locked = false;
    if (cur.done) winFlow();
    else renderQuiz();
  }
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
  clearTimeout(helpTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档（§0.2）
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
function proceed() {                            // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);               // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function openingSpeak(turn) {                   /* 开场顺序链（§0.5/§0.6）：turn（教学交接）或 hint，queue 单通道 */
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key]);
}
function startLevel(flat) {
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.sn && sv.sn.tutSeen);
  if (VERIFY) { openingSpeak(); return; }       // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.sn.tutSeen）
   看=演示两格（幽灵手指点空格→选中→指对应数字卡→点选填对，demo 通道真实生效，
   返回值存 window.__snDemoR §0.27）→重发同关 → 帮=幽灵手指指唯一候选格；独=放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(1000 * SPEED);
  const q = cur.quizzes[0];
  let demoR = null;
  for (let d = 0; d < 2; d++) {                 /* 演示两格：点格→选数（每格 ~4s，watch 合计 ~9s ≤16s） */
    const t = engTeachCell(q);                  /* 行/列裸单格优先（"看行"贴教学文案） */
    if (!t || t.dead) break;                     /* 死局防御：教学盘理论无死局（M3） */
    pointGhostAt(cellEl(t.i));
    await wait(880 * SPEED);
    ghost.press();
    await wait(300 * SPEED);
    await uiTapCell(t.i, true);                 // demo 通道豁免 locked 门（演示吞输入）
    await wait(420 * SPEED);
    pointGhostAt(numEl(t.n));
    await wait(880 * SPEED);
    ghost.press();
    await wait(300 * SPEED);
    demoR = await uiTapNum(t.n, true);          // 'right'（教学盘 6-8 空不会 done）
    window.__snDemoR = demoR;                   /* 演示生效证据（§0.27，verify 断言 'right'） */
    await wait(650 * SPEED);
  }
  const sv = KIDS._save();                      // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.sn = sv.sn || {};
    sv.sn.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                            // 确定性关卡：同一关重来（盘面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                           // 交接顺序链：turn clip（§0.6 单通道）
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 pop+hop 不静默 */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
tipEl.addEventListener('pointerdown', e => {    // 点提示条=重听玩法句（主动学习重置）
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 吞输入期轻叮 */
  lastAct = Date.now();
  replayAnim(tipEl, 'flash');
  sayP(VOICE.hint.key, VOICE.hint.text);
});
boardEl.addEventListener('pointerdown', e => {  // 点格子：选中/清除（主交互）
  const el = e.target.closest('.cell');
  if (!el) return;
  e.preventDefault();
  uiTapCell(Number(el.dataset.i));
});
numsEl.addEventListener('pointerdown', e => {   // 点数字卡：填入选中格（主答案）
  const el = e.target.closest('.num');
  if (!el) return;
  e.preventDefault();
  uiTapNum(Number(el.dataset.n));
});
stageEl.addEventListener('pointerdown', e => {  /* 点舞台空白（非按钮/非盘/非题面条）：10s 节流轻提示（§0.16） */
  if (e.target.closest('button, #tip, #board')) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }  /* 吞输入期轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.21：hint 语音+唯一候选格 breathe；
   miss≥2 加对应数字卡 pulse=答案级） / 教学"帮"5s 重演示一次。
   救援钟只被填对/清除/点格选中/重听玩法重置（§0.7a：错点/空白/兔子不重置） ================= */
function rescueAct(q) {
  rescueCount++;
  sayR(VOICE.hint.key, VOICE.hint.text);
  clearHints();
  const t = engTeachCell(q);
  if (!t) return;
  if (t.dead) {                                 /* 死局：指错格摇头+明说（审查 M3——救援同口径） */
    wigCell(t.i);
    KIDS.voice.play('sn_dead', '有一个数字放错啦，换一换摇头的格子');   /* T46 阶段2：keyless→clip 化（sn_dead 在册） */
    return;
  }
  breatheCell(t.i);
  if (q._miss >= 2) pulseNum(t.n);              /* 答案级：miss≥2 才出（b18 梯度定案） */
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                   /* 过题过渡窗不救援 */
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
  KIDS.init({ game: 'sudokunum', title: '数独数字版' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);               /* 收尾后停留今日最后一关（家族 b14 修复对齐，b15 审查 M3） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.SN = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, misses: cur.misses, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                  /* SPEC §3 契约字段 + 测试辅助字段（全拷贝） */
      grid: q.grid.slice(), given: q.given.slice(), sol: q.sol.slice(),
      sel: q.sel, holes: q.holes, step: cur.step, miss: q._miss, solved: q.solved
    };
  },
  tapCell(i) { return uiTapCell(i); },
  tapNum(n) { return uiTapNum(n); },
  start(flat) {                                /* 测试钩子：跳关（教学看演期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                          /* UI 路径自动通关：逐空格点格+填解值 */
    const run = cur;                           // 身份守卫：winFlow 延迟 proceed 换关即中止
    let taps = 0, guard = 0;
    while (cur && cur === run && !cur.done && guard++ < 300) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      const i = q.grid.indexOf(0);
      if (i < 0) break;
      const c = await uiTapCell(i);
      if (c === false) break;
      const r = await uiTapNum(q.sol[i]);
      taps++;
      if (r === false || r === 'wrong') break;
    }
    return { done: !!(cur && cur.done && cur === run), taps: taps };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
