/* ================= shaperoof 主逻辑（5.5-6.5 段 v2：分离交互 / 补洞动画 / 教学 / 救援 / 推进）
   玩法：屋顶缺洞 + 4 瓦片候选。分离交互（share/dressup 两击制同构防误触）：
   ① 点瓦=选中（高亮+旋转钮点亮）② 点「旋转钮」=顺时针转 90°（combo 题无朝向，钮常灰）
   ③ 再点同一瓦=放置判定（形状对+朝向对才放得上）。
   判定反馈：形状对朝向错=轻抖+sr_rot_hint「转一转，方向要对上洞洞」/ 镜像形错放=
   sr_mir_wrong「照照镜子哦，方向反过来啦」/ 形状错=shr_wrong；均 miss+1+1000ms 防重入窗。
   combo=两块板瓦先后拼接（'half'→'right'），题面语音=sr_combo_hint。
   救援两级（§0.55/家族 B 定版）：14s 方向级=重读题面+屋顶 pulse（lastDir 独立节流锚，
   不重置 lastAct）；30s 答案级=下一步应点瓦 breathe。
   验收钩子：window.SR = { get currentLevel(kind:rot|mirror|combo|mix), get quiz(){kind, hole,
   need, tiles[]{id,shape,right,dir,used}, sel, placedN, step, miss}, tapPiece(i), tapRotate(),
   tapPlace(i), start(flat), async autoSolve(), get tutorial }（getter 返回拷贝） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错语义反馈（rot/mir/wrong 同门）：flat<3 每错必播；flat≥3 走 10s 节流（安静试错） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      rotateBtn = $id('btn-rotate'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');
const curQuiz = () => cur && !cur.done ? cur.quizzes[cur.step] : null;

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rotateBtn.innerHTML = ICONS.rotate;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 半拼=单音 / 答错=低柔单音 / 旋转=短高音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const chimeHalf = () => { if (!VERIFY) KIDS.audio.note(659.25, 0.14, 0, 0.5); };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const rotTick = () => { if (!VERIFY) KIDS.audio.note(740, 0.07, 0, 0.35); };

/* ================= 题面语音（题面 clip 化：combo=sr_combo_hint 其余=shr_q） ================= */
function speakQuiz() {
  const q = curQuiz();
  if (!q) return;
  const v = quizVoice(q);
  KIDS.voice.play(v.key, v.text);
}

/* ================= 渲染 ================= */
function renderScene(q) {                        // 房子：缺洞屋顶 + lit 窗数 + 小兔子
  sceneEl.dataset.kind = q.kind;
  sceneEl.setAttribute('aria-label', '屋顶缺了' + (q.kind === 'combo' ? '一大块' : nameOfShape(q.shape)) + '，点我再听一遍');
  sceneEl.innerHTML = houseSvg(q, cur.step) +
    '<div class="bunny-slot"><div id="bunny">' + KIDS.assets.rabbit('normal', 96) + '</div></div>';
}
function renderBoard(q) {                        // 瓦片卡排（SVG 零文字标签 §0.19；朝向=CSS 旋转）
  boardEl.innerHTML = '';
  q.tiles.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.shape = t.shape;                   // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', (q.kind === 'combo' ? nameOfSlab(t.shape) : nameOfShape(t.shape)) + '瓦片');
    b.style.animationDelay = (i * 70) + 'ms';
    if (q.kind === 'combo') {
      b.innerHTML = '<span class="gwrap">' + slabSvg(t.shape) + '</span>';
    } else {
      const gw = document.createElement('span');
      gw.className = 'gwrap';
      gw.innerHTML = shapeSvg(t.shape, null, 'tile', 0);       // 朝向走外层 CSS（转场平滑）
      /* M1 修复（2026-09-13 审查）：镜像形（SHAPES[].mir 存在）CSS 角取负——SVG 内是
         Flip∘Rot（与洞同序），外层 CSS 是 Rot∘Flip，二者差 2×dir×90°（奇 dir 差 180°）；
         取负角后瓦视觉=Rot_(-t)∘Flip=Flip∘Rot_t 与洞视觉恒一致（视觉对齐 ⟺ t.dir==q.dir） */
      gw.style.transform = 'rotate(' + ((SHAPES[t.shape].mir ? (4 - t.dir) % 4 : t.dir) * 90) + 'deg)';
      b.appendChild(gw);
    }
    boardEl.appendChild(b);
  });
}
/* 旋转钮状态：combo 题/无选中/锁定=灰；可转=呼吸点亮（幼儿可见的操作指向） */
function updateDock() {
  const q = curQuiz();
  const active = !!(q && q.kind !== 'combo' && q._sel >= 0 && q.tiles[q._sel] && !q.tiles[q._sel]._used);
  rotateBtn.classList.toggle('ready', active && !state.locked && !state.demo && !state.won);
  rotateBtn.setAttribute('aria-disabled', (!active).toString());
}
function renderQuiz() {
  const q = curQuiz();
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
  updateDock();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();  /* 开场/换题读题；demo 门防演示收尾叠播 */
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

/* ================= 补洞动画：瓦从卡飞到屋顶洞（.flytile 克隆体 CSS transition §0.11）
   rot/mirror=飞到洞心，落定后洞填实心（带朝向）；combo=飞到对应槽位，落定后槽填实心；
   verify 页跳飞行直接补 ---------- */
function flyTile(el, q, i, slotIdx, run) {
  const t = q.tiles[i];
  const land = () => {
    if (run && cur !== run) return;                        // 演出窗内重玩已重建关卡：丢弃迟到补洞
    const hole = sceneEl.querySelector('.hole');
    if (!hole || hole.dataset.shape !== q.shape) return;   // 场景已换题重建：丢弃迟到补洞
    if (q.kind === 'combo') {
      const sl = hole.querySelector('.slot[data-slot="' + slotIdx + '"]');
      if (sl) {
        sl.setAttribute('fill', SLABS[t.shape].color);
        sl.setAttribute('stroke', INK);
        sl.setAttribute('stroke-width', '2.5');
        sl.removeAttribute('stroke-dasharray');
        sl.removeAttribute('opacity');
        replayAnim(sl, 'lit');
      }
    } else {
      const k = 0.50;
      const x0 = 155, y0 = 37;                             // (180-25, 62-25)：洞心 50×50 框
      const meta = SHAPES[q.shape];
      const base = meta.mir ? SHAPE_ELS[meta.mir] : SHAPE_ELS[q.shape];
      const tr = (meta.mir ? 'matrix(-1 0 0 1 100 0)' : '') + ' rotate(' + q.dir * 90 + ' 50 50)';
      hole.innerHTML = '<g class="hfill" transform="translate(' + x0 + ' ' + y0 + ') scale(' + k + ')">' +
        '<g fill="' + meta.color + '" stroke="' + INK + '" stroke-width="7" stroke-linejoin="round"' +
        (tr ? ' transform="' + tr + '"' : '') + '>' + base + '</g></g>';
    }
    const winK = Math.min(cur.step, CH_LEN) - 1;           // step 已推进：刚答对的窗序号
    const w = sceneEl.querySelector('.win[data-k="' + winK + '"]');
    if (w) w.classList.add('lit');
    const bun = sceneEl.querySelector('#bunny');
    if (bun) replayAnim(bun, 'hop');
  };
  if (VERIFY || !el) { land(); return; }
  const toEl = q.kind === 'combo' ? sceneEl.querySelector('.slot[data-slot="' + slotIdx + '"]')
                                  : sceneEl.querySelector('.hole-plate');
  const from = el.getBoundingClientRect();
  const to = toEl ? toEl.getBoundingClientRect() : sceneEl.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'flytile';
  fly.innerHTML = q.kind === 'combo' ? slabSvg(t.shape, 52) : shapeSvg(t.shape, 52, 'tile', t.dir);
  fly.style.left = from.left + 'px';
  fly.style.top = from.top + 'px';
  fly.style.transitionDuration = '430ms';
  document.body.appendChild(fly);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  requestAnimationFrame(() => {
    fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.8)';
  });
  setTimeout(() => { fly.remove(); land(); }, 450);
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
/* 教学"帮"阶段指向：当前题下一步应点瓦 */
function pointHelpNext() {
  const q = curQuiz();
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 吞输入轻叮+可见回应（家族 D：容器 bump） ================= */
const swallowTap = () => { sfx('pop'); replayAnim(boardEl, 'bump'); return false; };

/* ================= 分离交互主路径（真实点击 / SR 钩子 / autoSolve / 教学演示共用）
   ① uiTapPiece(i)：选中瓦（高亮+旋转钮点亮）——无锁定窗口（换选自由）
   ② uiRotate()：选中瓦顺时针转 90°（CSS 转场+短高音；combo/无选中=吞点）
   ③ uiTapPlace(i)：放置判定（详见 game-core.js engTapPlace 枚举）========== */
async function uiTapPiece(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) return swallowTap();
  const q = curQuiz();
  if (!q) return false;
  const r = engTapPiece(cur, i);
  if (r === null) return swallowTap();
  const el = cardEl(i);
  if (el) {
    boardEl.querySelectorAll('.card.sel').forEach(c => c.classList.remove('sel'));
    el.classList.add('sel');
    replayAnim(el, 'bump');
  }
  sfx('pop');
  updateDock();
  return r;
}
function uiRotate(demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) return swallowTap();
  const q = curQuiz();
  if (!q) return false;
  const d = engRotate(cur);
  if (d === null) { replayAnim(rotateBtn, 'bump'); sfx('pop'); return false; }
  rotTick();
  const el = cardEl(q._sel);
  const gw = el && el.querySelector('.gwrap');
  if (gw) {                                              // M1：镜像形 CSS 角取负（与 renderTiles 同公式）
    const sd = q.tiles[q._sel];
    gw.style.transform = 'rotate(' + ((SHAPES[sd.shape].mir ? (4 - sd.dir) % 4 : sd.dir) * 90) + 'deg)';
  }
  return d;
}
async function uiTapPlace(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) return swallowTap();
  const q = curQuiz();
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapPlace(cur, i);
  if (r === null) return swallowTap();
  const el = cardEl(i);

  if (r === 'wrong' || r === 'rot' || r === 'mir') {   /* 失败尝试：摇头+分型语义反馈（卡不灰可重试） */
    state.locked = true;
    updateDock();
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (r === 'rot') sayW(VOICE.rot.key, VOICE.rot.text);       /* sr_rot_hint：转一转，方向要对上洞洞 */
    else if (r === 'mir') sayW(VOICE.mir.key, VOICE.mir.text);  /* sr_mir_wrong：照照镜子哦，方向反过来啦 */
    else sayW(VOICE.wrong.key, VOICE.wrong.text);               /* shr_wrong：这块的边对不上哦 */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms（b16 定案） */
    if (cur !== run) return r;
    state.locked = false;
    updateDock();
    return r;
  }

  lastAct = Date.now();                          /* 成功放置重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次放对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  updateDock();
  if (el) { el.classList.remove('breathe', 'sel'); el.classList.add('lit'); }

  if (r === 'half') {                            /* combo 第一块：飞入槽位（题未完，无推进） */
    chimeHalf();
    let slotIdx = -1;
    for (let k = 0; k < q.sub.length; k++) if (q.sub[k].shape === q.tiles[i].shape) slotIdx = k;
    if (el) el.classList.add('used');
    flyTile(el, q, i, slotIdx, run);
    await wait(760 * SPEED);                     /* 槽位填充演出窗 */
    if (cur !== run) return r;
    state.locked = false;
    updateDock();
    return r;
  }

  /* ---- right·done（本题完成：瓦飞入补洞+亮窗+兔子跳） ---- */
  chimeGoal();
  sfx('coin');
  flyTile(el, q, i, -1, run);
  await wait(900 * SPEED);                       /* 对→读题间隔 2330>最长反馈 clip 防尾截（承 m1） */
  if (cur !== run) return r;
  await wait(430 * SPEED);                       /* 补洞飞行窗 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（洞形/瓦片/窗灯全换）+读题 */
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
  updateDock();
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* shr_right：补好啦，房子真漂亮 */
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：两处 dayEnd 都传 lim-1（防跳章） */
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.shaperoof && sv.shaperoof.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示完整分离交互链（flat0 题0 恒 rot/triangle/洞dir1/偏1——确定性锚点）：
   点瓦选中 → 点旋转钮转一次 → 再点瓦放置（瓦片飞入补洞+亮窗）→帮=指向正确瓦；
   独=首次放对放手（watch 全程 ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* shr_tut_watch：看！屋顶缺了一块 */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                      // flat0 题0 恒 rot/triangle/dir1/off1
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));                     /* ① 幽灵手指点瓦=选中 */
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapPiece(idx, true);                   /* demo 通道豁免 locked 门（演示吞真实输入） */
  await wait(500 * SPEED);
  ghost.toEl(rotateBtn);                         /* ② 幽灵手指移到旋转钮 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const rotN = await uiRotate(true);             /* 演示=旋转一次（off=1 锚点保证恰好一次） */
  window.__srDemoRot = typeof rotN === 'number' ? 1 : 0;   /* 演示旋转实证（gate/selftest 断言） */
  await wait(600 * SPEED);
  pointGhostAt(cardEl(idx));                     /* ③ 幽灵手指回瓦=放置 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapPlace(idx, true);
  window.__srDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(1300 * SPEED);                      /* 亮卡+补洞飞行+亮窗演出窗口 */
  const sv = KIDS._save() || {};
  sv.shaperoof = sv.shaperoof || {};
  sv.shaperoof.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来补一补"在重发后的题面上说（照 batch5-23） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* shr_tut_turn：你来补一补 */
  setTimeout(() => {
    if (state.tut === 'help' && curQuiz()) speakQuiz();
  }, 2000);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：看看洞的形状 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：题面 clip 重读 */
});
rotateBtn.addEventListener('pointerdown', e => {   /* 旋转钮：分离交互②（combo 题/无选中=吞点） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  uiRotate();                                    /* 救援钟语义承旧：卡片/旋转交互不重置 lastAct（§0.7a 同 old） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点房子=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {   /* 瓦片两击制：未选中=选 / 已选中=放置（防误触） */
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  if (VERIFY || !cur) return;
  const q = curQuiz();                           /* 救援钟语义承旧：卡片交互不重置 lastAct（§0.7a 同 old） */
  const i = Number(p.dataset.i);
  if (q && q._sel === i && !(q.tiles[i] && q.tiles[i]._used)) uiTapPlace(i);
  else uiTapPiece(i);
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+屋顶 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（下一步应点瓦 breathe）/ 教学"帮"5s 重演示 */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = curQuiz();
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+屋顶 pulse（不动 lastAct） */
    speakQuiz();
    replayAnim(sceneEl, 'pulse');
    lastDir = Date.now();
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
  KIDS.init({ game: 'shaperoof', title: '形状屋顶' });   // 存档键 kidsgame_shaperoof（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1（winFlow 同款） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口）
   tapPiece(i)='sel' / tapRotate()=新 dir 0-3 / tapPlace(i)='right'|'done'|'half'|'rot'|'mir'|
   'wrong'|false（SPEC v2 契约：分离交互三入口，tapTile 旧口已废） ================= */
window.SR = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    const kindOf = { 1: 'rot', 2: 'mirror', 3: 'combo', 4: 'mix' };
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, kind: kindOf[cur.dch], lv: cur.lv,
             n: cur.quizzes.length, step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    const q = curQuiz();
    if (!q) return null;
    return { kind: q.kind,                                  /* SPEC v2：'rot'|'mirror'|'combo'（章级 mix 见 currentLevel.kind） */
             hole: q.shape,                                 /* 洞型 id（combo='L'|'T'|'Z'） */
             need: q.kind === 'combo'
               ? q.sub.map(s => ({ shape: s.shape, dir: 0 }))
               : { shape: q.shape, dir: q.dir },            /* 需求真值 {shape, dir} */
             tiles: q.tiles.map(t => ({ id: t.id, shape: t.shape, right: t.right, dir: t.dir, used: !!t._used })),
             sel: typeof q._sel === 'number' ? q._sel : -1,
             placedN: q._placedN || 0,
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapPiece(i) { return uiTapPiece(i); },
  tapRotate() { return uiRotate(); },
  tapPlace(i) { return uiTapPlace(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（选瓦→转到位→放置，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = curQuiz();
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;
      if (q._sel !== i) {
        const r = await uiTapPiece(i);
        if (r === false || r === null) break;      // 锁死/重玩保护
      }
      if (q.kind !== 'combo') {
        const turns = (q.dir - q.tiles[i].dir + 4) % 4;
        for (let k = 0; k < turns; k++) {
          const d = uiRotate();
          if (d === false || d === null) break;    // 旋转通道被拦：放置必失败，跳出防死循环
        }
      }
      const r = await uiTapPlace(i);
      if (r === false || r === null) break;        // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
