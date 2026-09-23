/* ================= words 主逻辑（题面渲染 / 拼字槽交互 / 教学 / 推进）
   玩法：题面大字（点击 10s 节流重听读音组词）+ 下方打乱部件块（正确 2-3 个+干扰 2-3 个，r28 家族优先）。
   点部件块 → 飞入（下方弹入）上方拼字槽；点已填槽撤回；干扰块=晃动弹回零惩罚；
   槽满自动判定：全对 → 字亮起+读音组词语音 → 下一字；有误 → 错槽弹回（对槽保留）。
   验收钩子：window.WRD = { get currentLevel, get quiz, tapPart(i), tapSlot(i), async autoSolve() } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；救援/开场任务语音不受 flat 门（SPEC §0.5） */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播（原 sayP 行为）；flat≥3 走 10s 节流 sayR（6 岁试玩共性 P1：
   不识字孩子安静试错只有视觉晃动，无即时解释） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 纠错统一入口：章 2（声旁家族）/章 4（字家族）每关首次错播家族辨析提示（6 岁试玩 P2；r28 扩 ch2），其余走 sayW */
const sayWrong = () => {
  if (cur && (cur.dch === 2 || cur.dch === 4) && !cur._famSaid) { cur._famSaid = true; sayR(VOICE.fam.key, VOICE.fam.text); return; }
  sayW(VOICE.wrong.key, VOICE.wrong.text);
};

const targetEl = $id('target-card'), slotsEl = $id('slots'), tilesEl = $id('tiles'),
      ghostEl = $id('ghost'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'
let lastCharVoice = 0;                          // 点题面大字重听读音的 10s 节流
let lastIdleVoice = 0;                          // 点空槽轻提示的 10s 节流

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const tileEl = i => tilesEl.querySelector('.tile[data-i="' + i + '"]');
const slotEl = i => slotsEl.querySelector('.slot[data-i="' + i + '"]');
const slotEls = () => Array.from(slotsEl.children);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  targetEl.innerHTML = '<span class="zi">' + q.c + '</span><span class="py">' + q.py.replace(/\d+$/, '') + '</span>';   /* 反方审查 M1：he2 等内部 clip 后缀不上屏 */
  targetEl.classList.remove('lit');
  slotsEl.innerHTML = '';
  q.parts.forEach((p, i) => {
    const s = document.createElement('button');
    s.className = 'slot';
    s.dataset.i = i;
    s.setAttribute('aria-label', '拼字槽 ' + (i + 1));
    slotsEl.appendChild(s);
  });
  tilesEl.innerHTML = '';
  q.tiles.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'tile';
    b.dataset.i = i;
    b.textContent = t.ch;
    b.setAttribute('aria-label', '部件 ' + t.ch);
    tilesEl.appendChild(b);
  });
  renderStep();
  if (!VERIFY && !state.demo && cur.step > 0) sayR(chKey(q), q.w);   /* 非首题：渲染即读字音（首题由 startLevel 队列播；demo 门防教学演示收尾叠播——反方审查 m4） */
}
/* 槽区与池块全量同步（幂等；进槽弹入动画只在内容变化时重放） */
function syncSlots(q) {
  q.slots.forEach((ti, j) => {
    const s = slotEl(j);
    if (!s) return;
    if (ti == null) {
      if (s.classList.contains('fill')) { s.classList.remove('fill'); s.innerHTML = ''; }
    } else {
      const ch = q.tiles[ti].ch;
      const old = s.querySelector('.zi');
      if (!s.classList.contains('fill') || !old || old.textContent !== ch) {
        s.innerHTML = '<span class="zi">' + ch + '</span>';
        s.classList.remove('fill'); void s.offsetWidth; s.classList.add('fill');
      }
    }
  });
  q.tiles.forEach((t, i) => {
    const el = tileEl(i);
    if (el) el.classList.toggle('used', q.slots.indexOf(i) >= 0);
  });
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
/* 下一个该点的块：第一个空槽的应填部件，在池中找未用匹配块（干扰块与正确部件不同字，字面匹配必正确） */
function nextTileIdx(q) {
  const j = q.slots.indexOf(null);
  if (j < 0) return -1;
  for (let i = 0; i < q.tiles.length; i++) {
    if (q.tiles[i].ch === q.parts[j] && q.slots.indexOf(i) < 0) return i;
  }
  return -1;
}
/* 教学"帮"指向：下一块找不到（部件都卡在错槽）→ 指向第一个错槽提示撤回 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const idx = nextTileIdx(q);
  if (idx >= 0) { pointGhostAt(tileEl(idx), 'tut'); return; }
  const wrongSlot = q.slots.findIndex((ti, j) => ti != null && q.tiles[ti].ch !== q.parts[j]);
  if (wrongSlot >= 0) pointGhostAt(slotEl(wrongSlot), 'tut');
}
/* 首错不 pulse 正确项（§0.7）：连错 2 次才高亮下一个该点的块 */
function pulseNextTile(q) {
  const idx = nextTileIdx(q);
  const el = idx >= 0 ? tileEl(idx) : null;
  if (el) { el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
}

/* ================= 拼字主路径（真实点击 / WRD.tapPart / autoSolve 共用）
   demo=true 仅教学"看"演示通道（豁免 locked 门，batch5 M1 教训） ================= */
async function uiTapPart(i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return false;
  const run = cur;                                /* 反方审查 M3：演出窗口内点重玩会重建 cur——身份守卫防旧续体在新 cur 上 winFlow 白拿星 */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engTapPart(cur, i);
  if (r === false) return false;
  lastAct = Date.now();
  const tEl = tileEl(i);
  if (r === 'wrong') {                          // 干扰块：晃动弹回（零惩罚，不进槽）
    if (tEl) { tEl.classList.remove('wig'); void tEl.offsetWidth; tEl.classList.add('wig'); }
    sfx('fail');
    sayWrong();
    if (q._miss >= 2) pulseNextTile(q);
    await wait(420 * SPEED);
    return r;
  }
  if (r === 'fail') {                           // 槽满判定失败：错槽弹回（对槽保留）+槽区晃动
    syncSlots(q);
    slotsEl.classList.remove('shake'); void slotsEl.offsetWidth; slotsEl.classList.add('shake');
    sfx('fail');
    sayWrong();
    if (q._miss >= 2) pulseNextTile(q);
    if (state.tut === 'help') pointHelpNext();
    await wait(520 * SPEED);
    if (cur !== run) return r;                   /* 反方审查 M3 */
    return r;
  }
  /* placed / right / done：块进槽弹入 */
  sfx('pop');
  syncSlots(q);
  if (r === 'placed') {
    if (state.tut === 'help') pointHelpNext();  // "帮"：跟着节奏指向下一块
    return r;
  }
  /* 本字拼对：字整体亮起+读音组词语音 → 下一字 */
  if (state.tut === 'help') {                   // 教学"独"：首次完整拼对 → 强化反馈放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  targetEl.classList.remove('lit'); void targetEl.offsetWidth; targetEl.classList.add('lit');
  slotEls().forEach(s => s.classList.add('lit'));
  sfx('coin');
  KIDS.voice.play(chKey(q), q.w);               // 读音组词（clip 缺失整句 TTS 兜底）
  await wait(1900 * SPEED);
  if (cur !== run) return r;                     /* 反方审查 M3：末题亮字演出窗内重玩已重建关卡，丢弃旧续体 */
  state.locked = false;
  if (r === 'done') winFlow();
  else renderQuiz();
  return r;
}
/* 撤回：点已填槽 → 该块回池（无惩罚）；点空槽=非主交互轻提示（10s 节流，§0.16） */
function uiTapSlot(i) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engTapSlot(cur, i);
  if (!r) {
    const now = Date.now();
    if (now - lastIdleVoice > 10000) { lastIdleVoice = now; sayR(VOICE.hint.key, VOICE.hint.text); }
    return false;
  }
  lastAct = Date.now();
  syncSlots(q);
  sfx('click');
  if (state.tut === 'help') pointHelpNext();
  return true;
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
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.wrd && sv.wrd.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  const q0 = cur.quizzes[0];
  /* 开场任务语音+首字读音顺序播报（sayR 语义不受 flat 门；缺 clip 逐段 TTS 兜底） */
  KIDS.voice.queue([{ key: VOICE.hint.key, text: VOICE.hint.text },
                    { key: chKey(q0), text: q0.w }]);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指按序点部件块（逐块飞入槽）→ 槽满亮起演示完整一字；帮=指向下一该点的块/错槽；
   独=首次完整拼对放手 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  for (let j = 0; j < q.parts.length; j++) {    // 演示按序点部件（章 1 为 2 部件，≥2 次非零循环）
    const idx = nextTileIdx(q);
    if (idx < 0) break;
    pointGhostAt(tileEl(idx), 'tut');
    await wait(900 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    await uiTapPart(idx, true);                 // demo 通道豁免 locked 门（演示吞输入）
    await wait(480 * SPEED);
  }
  await wait(1200 * SPEED);                     // 让亮起+读音组词播一段
  const sv = KIDS._save();
  sv.wrd = sv.wrd || {};
  sv.wrd.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同一确定性关卡（闪现窗口一帧），"你来拼一拼"+首字读音在重发后的题面上说 */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const q0 = cur.quizzes[0];
  KIDS.voice.queue([{ key: VOICE.turn.key, text: VOICE.turn.text },
                    { key: chKey(q0), text: q0.w }]);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与题面交互 ================= */
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
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {  // 读字：主动重播当前字读音组词（不节流）
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  const q = cur.quizzes[cur.step];
  if (q) KIDS.voice.play(chKey(q), q.w);
});
targetEl.addEventListener('pointerdown', e => { // 点题面大字：轻反馈（10s 节流可复用读音，§0.16）
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  targetEl.classList.remove('bounce'); void targetEl.offsetWidth; targetEl.classList.add('bounce');
  const now = Date.now();
  if (now - lastCharVoice > 10000) {
    lastCharVoice = now;
    const q = cur.quizzes[cur.step];
    if (q) sayR(chKey(q), q.w);
  }
});
tilesEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.tile');
  if (!el) return;
  e.preventDefault();
  uiTapPart(Number(el.dataset.i));
});
slotsEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.slot');
  if (!el) return;
  e.preventDefault();
  uiTapSlot(Number(el.dataset.i));
});

/* ================= 无操作看护：20s 救援提示（重读当前字音）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    const q = cur.quizzes[cur.step];            // 救援=重读当前字读音组词（sayR 不受 flat 门）
    if (q) sayR(chKey(q), q.w); else sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'words', title: '识字积木' });
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
window.WRD = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, misses: cur.misses, done: cur.done, won: state.won } : null;
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                  /* SPEC §1 契约字段 + 测试辅助字段（全拷贝） */
      target: q.c, py: q.py,
      parts: q.parts.slice(),
      distractors: q.distractors.slice(),
      slots: q.slots.map(ti => ti == null ? null : q.tiles[ti].ch),
      slotTileIdx: q.slots.slice(),
      tiles: q.tiles.map(t => t.ch),
      tileTypes: q.tiles.map(t => t.t),
      solved: q.solved, step: cur.step
    };
  },
  tapPart(i) { return uiTapPart(i); },
  tapSlot(i) { return uiTapSlot(i); },
  async autoSolve() {                         // UI 路径自动拼完当前关（按槽序点正确块，走真实流程）
    let n = 0;
    while (cur && !cur.done && n++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      for (let j = 0; j < q.parts.length; j++) {
        const idx = nextTileIdx(q);
        if (idx < 0) break;
        await uiTapPart(idx);
      }
    }
    return { done: !!(cur && cur.done), words: n };
  },
  get tutorial() { return state.tut; }
};
