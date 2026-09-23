/* ================= maze 主逻辑（迷宫渲染 / 逐格点选走位 / 足迹回退 / 教学 / 救援 / 推进）
   玩法：题面 = size×size 网格迷宫（小兔 / 萝卜 / 树篱墙 /（ch3）钥匙+门 SVG）+ 题面句；
   点相邻可行格 = 小兔走一格（'moved'，走格动画 + 足迹点）；点已走格 = 合法回退
   （'back'，足迹截断，不记 miss——死路自救）；到萝卜 = 局终（'right' / 末局 'done'，
   判对确认 = maz_right clip 局终庆祝无拼播链）；点障碍 / 对角 / 不相邻 = 'wrong' + miss
   轻反馈（迷宫试错 = 探索：pop + 网格容器 bump + 目标格 deny 闪，**不 wig 人格否定** +
   相邻可行格 pulse 高亮=方向级线索）；未拿钥匙点门 = 'wrong' + miss + maz_key「先找
   钥匙哦」（钥匙门 = 规划进阶非陷阱）；拾钥匙 = 'moved' + hasKey + 「拿到钥匙啦」TTS
   + 钥匙徽章点亮；每关 3 局（SPEC §0.75 破 5 题惯例）。
   救援两级（§0.75/家族 B 定版）：14s 方向级 = 重读题面 + 相邻可行格 pulse（lastDir
   独立节流锚，不重置 lastAct）；30s 答案级 = BFS 最短路下一格 breathe + 重读
   （solveNext 实算）；教学"帮"5s 重演示。
   语音窗（家族 G/H/I/N，clip 实长 SPEC-BATCH30 §4）：
   maz_tut_watch 3264 → 教学演示 tap 延至 t=900+3000=3900（≥3264+300=3564，禁撞头）；
   maz_tut_turn 1800 → turn 后读题延 2200（≥1800+300 防尾截）；
   教学 demo 机制句 8 字（点旁边的格子走路 estMs=3360）→ demo 局终演出窗 3700
     （≥3360+300）；
   maz_right 2424 → 局终演出窗 2800（≥2424+300=2724）；winFlow celebrate(2620)+
     wait(400)=3020 ≥2724（契约 H）；
   maz_wrong 2664 + 语义句 TTS「点小兔旁边的格子」（estMs(8)=3360）→ 拼播链
     2664+150+3360=6174，错点防重入窗 1000ms；救援读题掐链由 wrongChainUntil=6500
     守卫（≥2664+150+2544+300=5658，maz_guide clip 实长，家族 I）；
   maz_key 1896（未钥点门单段链）→ wrongChainUntil=2400（≥1896+300=2196，家族 I）。
   T46 阶段2（2026-09-19）：引导句/拾钥匙句/demo 句 clip 化（maz_guide/maz_keyget/
   maz_demo 键段，text=TTS 兜底）——全款 keyless 段清零（Mj-1 链尾约束自然解除）。
   验收钩子：window.MZ = { get currentLevel, get quiz(){maze{size,walls[],key,door,
   entry,goal}, pos{r,c}, hasKey, step(局内已走步数), miss}, tapCell(r,c), start(flat),
   async autoSolve(), get tutorial }——tapCell 返回值族：moved(含拾钥匙/过门)/
   back(回退已走格)/right(到萝卜)/done(末局)/wrong(障碍·对角·不相邻·未钥点门)/
   null(越界或演出窗)，全 async；getter 返回拷贝；maze 每局固定（不随移动变，
   pos 反映当前位置）。教学实证 window.__mzDemoR。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（家族 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，家族 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene');
const gridEl0 = () => sceneEl.querySelector('.grid');   /* 每局重渲染，取现引用 */
const rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / LEVELS_PER_CH) + 1) + '-' + (i % LEVELS_PER_CH);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellEl = (r, c) => sceneEl.querySelector('.cell[data-r="' + r + '"][data-c="' + c + '"]');
const curMaze = () => cur && !cur.done ? cur.mazes[cur.step] : null;

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：局终=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（统一 maz_q clip「帮小兔子吃到萝卜」） ================= */
function speakQuiz() {
  if (!curMaze()) return;
  KIDS.voice.play(VOICE.q.key, VOICE.q.text);
}

/* ================= 渲染 ================= */
/* 小兔定位（网格内绝对定位，left/top 按格心——transition .32s 即走格动画；泛化 size） */
function placeBun(pos) {
  const g = gridEl0(), bun = g && g.querySelector('.bun');
  if (!g || !bun) return;
  const size = curMaze() ? curMaze().size : 5;
  const gap = 6, gw = g.clientWidth;
  const cw = (gw - gap * (size - 1)) / size, bs = bun.offsetWidth || 82;
  bun.style.left = (pos.c * (cw + gap) + (cw - bs) / 2) + 'px';
  bun.style.top = (pos.r * (cw + gap) + (cw - bs) / 2) + 'px';
  bun.dataset.r = pos.r; bun.dataset.c = pos.c;      /* 帧内容断言（verify 直读） */
}
/* 撞墙（相邻墙错点）：小兔朝该方向顶一下弹回（视觉解释「过不去」） */
function nudgeBun(dr, dc) {
  const bun = gridEl0() && gridEl0().querySelector('.bun');
  if (!bun) return;
  ['nudge-up', 'nudge-down', 'nudge-left', 'nudge-right'].forEach(c => bun.classList.remove(c));
  void bun.offsetWidth;
  bun.classList.add(dr < 0 ? 'nudge-up' : dr > 0 ? 'nudge-down' : dc < 0 ? 'nudge-left' : 'nudge-right');
}
/* 相邻可行格 pulse 高亮（错反馈方向级 + 14s 方向级救援共用：§0.75 方向级=相邻可行格） */
function walkHint() {
  const q = curMaze();
  if (!q) return;
  [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => {
    const p = { r: q.pos.r + d[0], c: q.pos.c + d[1] };
    if (!inSize(q.size, p) || isWall(q.walls, p)) return;
    if (q.door && !q.hasKey && samePos(q.door, p)) return;   // 未钥门不算可行格
    const el = cellEl(p.r, p.c);
    if (el) { el.classList.remove('walk-hint'); void el.offsetWidth; el.classList.add('walk-hint');
              setTimeout(() => el.classList.remove('walk-hint'), 1300); }
  });
}
function renderRun(speak) {                      // 局题面：题面句条 +（ch3）钥匙徽章 + size×size 网格
  const q = curMaze();
  if (!q) return;
  sceneEl.setAttribute('aria-label', quizText() + '，点我再听一遍');
  let h = '<div class="q-text">' + quizText() + '</div>';
  if (q.key) h += '<div class="key-badge' + (q.hasKey ? ' show lit' : ' show') + '" aria-label="钥匙">' + keySvg() + '</div>';
  h += '<div class="grid" style="grid-template-columns:repeat(' + q.size + ',1fr);width:' +
       Math.min(540, q.size * 84 + (q.size - 1) * 6) + 'px"></div>';
  sceneEl.innerHTML = h;
  const g = gridEl0();
  for (let r = 0; r < q.size; r++) for (let c = 0; c < q.size; c++) {
    const p = { r: r, c: c };
    const isW = isWall(q.walls, p), isG = samePos(p, q.goal),
          isK = !!(q.key && !q.hasKey && samePos(p, q.key)),
          isD = !!(q.door && samePos(p, q.door)),
          isT = q.trail.some(t => samePos(t, p));
    const cell = document.createElement('div');   /* div 非 button：scene 容器已为 button，禁嵌套 */
    cell.className = 'cell' + (isW ? ' wall' : '') + (isG ? ' goal-cell' : '') +
                      (isK ? ' key-cell' : '') + (isD ? ' door-cell' : '') + (isT ? ' trail-cell' : '');
    cell.dataset.r = r; cell.dataset.c = c;
    cell.setAttribute('aria-label', '第' + (r + 1) + '行第' + (c + 1) + '列格子');
    cell.innerHTML = isW ? bushSvg() : isG ? carrotSvg() : isK ? keySvg() :
                     isD ? doorSvg(q.hasKey) : '';
    g.appendChild(cell);
  }
  const bun = document.createElement('div');
  bun.className = 'bun';
  bun.innerHTML = KIDS.assets.rabbit('normal', 72);
  g.appendChild(bun);
  placeBun(q.pos);
  renderStep();
  if (speak !== false && !VERIFY && !state.demo && !state.quiet) speakQuiz();   /* 开场/换局读题 */
}
/* 足迹增量更新（moved/back 后；renderRun 不重建——走格动画连续性） */
function paintTrail(prevTrail, newTrail) {
  const gone = {};
  prevTrail.forEach((t, i) => { if (i >= newTrail.length || !samePos(newTrail[i], t)) gone[t.r + ',' + t.c] = 1; });
  Object.keys(gone).forEach(k => { const el = cellEl(+k.split(',')[0], +k.split(',')[1]); if (el) el.classList.remove('trail-cell'); });
  newTrail.forEach(t => { const el = cellEl(t.r, t.c); if (el) el.classList.add('trail-cell'); });
}
function renderStep() {                          // HUD 本关 3 局进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < RUNS_PER_LEVEL; k++) {
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
/* 教学"帮"阶段指向：当前局 BFS 最短路下一格（solveNext 实算——未拿钥匙先指钥匙） */
function pointHelpNext() {
  const q = curMaze();
  if (!q) return;
  const p = solveNext(q);
  if (p) pointGhostAt(cellEl(p.r, p.c));
}

/* ================= 点格主路径（真实点击 / MZ.tapCell / autoSolve / 教学演示共用）
   吞输入轻叮必配网格容器 bump（家族 D）：演出窗/越界=null+pop+bump；
   错点 1000ms 防重入窗（b16 定案禁偏离）========== */
async function uiTapCell(r, c, demo) {
  const g = gridEl0();
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(g, 'bump');
    return null;                                 // 演出窗/教学演示期吞点=null（钩子契约）
  }
  const q = curMaze();
  if (!q) return null;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const wasKey = q.hasKey;
  const prevTrail = q.trail.map(t => ({ r: t.r, c: t.c }));
  const res = engTapCell(cur, r, c);
  if (res === null) { sfx('pop'); replayAnim(g, 'bump'); return null; }   // 越界坐标/局已结束
  const el = cellEl(r, c);

  if (res === 'wrong') {                         /* 障碍/对角/不相邻/未钥点门：miss+轻反馈（不 wig） */
    state.locked = true;
    if (el) replayAnim(el, 'deny');              // 目标格 deny 闪（轻反馈，非人格否定）
    const p = { r: r, c: c };
    if (distOf(p, q.pos) === 1 && isWall(q.walls, p)) nudgeBun(p.r - q.pos.r, p.c - q.pos.c);
    dodgeLo();
    sfx('pop');
    replayAnim(g, 'bump');
    const doorTap = !!(q.door && samePos(q.door, p) && !wasKey);
    if (doorTap) {                               /* 未拿钥匙点门：maz_key 单段链（无 keyless 段） */
      if (sayW([VOICE.key.key])) wrongChainUntil = Date.now() + 2400;   /* 链豁免 ≥1896+300=2196（家族 I） */
    } else {
      if (sayW([VOICE.wrong.key, { key: 'maz_guide', text: GUIDE.guide }]))   /* 拼播链：maz_wrong+引导句 clip（T46 阶段2；text=TTS 兜底） */
        wrongChainUntil = Date.now() + 6500;     /* 链豁免（家族 I）：2664+150+2544(maz_guide 实长)+300=5658 */
    }
    walkHint();                                  /* 方向级：相邻可行格 pulse 高亮 */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由豁免窗让路 */
    if (cur !== run) return res;
    state.locked = false;
    return res;
  }

  if (res === 'moved') {                         /* 相邻可行格移动（含拾钥匙/过门）：走格动画+落定窗 */
    state.locked = true;
    paintTrail(prevTrail, q.trail);
    if (!wasKey && q.hasKey) {                   /* 拾钥匙：钥匙格放大淡出+徽章点亮+「拿到钥匙啦」 */
      const ksvg = el && el.querySelector('svg');
      if (ksvg) ksvg.classList.add('key-got');
      const badge = sceneEl.querySelector('.key-badge');
      if (badge) { badge.classList.add('lit'); badge.classList.add('show'); }
      if (!demo) KIDS.voice.play('maz_keyget', GETKEY_SENT);   /* 拾钥匙确认句 clip（T46 阶段2，实长 1824；text=TTS 兜底） */
    }
    if (q.door && samePos(q.door, q.pos) && q.hasKey) {   /* 过门：门开态换 SVG（走过即开） */
      if (el) el.innerHTML = doorSvg(true);
    }
    placeBun(q.pos);
    await wait(520 * SPEED);
    if (cur !== run) return res;
    state.locked = false;
    return res;
  }

  if (res === 'back') {                          /* 回退已走格：足迹截断（不记 miss——死路自救） */
    state.locked = true;
    paintTrail(prevTrail, q.trail);
    placeBun(q.pos);
    await wait(520 * SPEED);
    if (cur !== run) return res;
    state.locked = false;
    return res;
  }

  /* ---- right·done（到萝卜格：演出+maz_right clip 局终庆祝，无拼播链 §0.75） ---- */
  lastAct = Date.now();                          /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次走通 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  paintTrail(prevTrail, q.trail);
  placeBun(q.pos);
  const bun = g.querySelector('.bun');
  if (bun) bun.classList.add('reach');
  const gsvg = el && el.querySelector('svg');
  if (gsvg) gsvg.classList.add('carrot-lit');
  chimeGoal();
  sfx('coin');
  if (res === 'right') {                         /* 非末局：局终演出+读新局 */
    if (demo) KIDS.voice.play('maz_demo', DEMO_SENT);   /* 教学 demo=机制句 clip（T46 阶段2，实长 2472；text=TTS 兜底） */
    else KIDS.voice.play(VOICE.right.key, VOICE.right.text);   /* maz_right 2424 */
    await wait((demo ? 3700 : 2800) * SPEED);    /* 局终演出窗 2800 ≥2424+300；demo 3700 ≥3360+300 */
    if (cur !== run) return res;
    state.locked = false;
    renderRun();                                 /* 新局（网格全换）+读题 */
    return res;
  }
  /* done：局终演出短窗后交棒 winFlow（celebrate 内再播 maz_right——契约 H 窗） */
  await wait(900 * SPEED);
  if (cur !== run) return res;
  winFlow();
  return res;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / LEVELS_PER_CH);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致；禁 (ci+1)%4 章序推进） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* maz_right：走到啦，真聪明（2424ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2424+300=2724（判对后窗） */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
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
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（家族 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderRun(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.maze && sv.maze.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点 (1,2) 相邻格走一步 → 点 (1,3) 萝卜格（flat0 局0 恒 entry(1,1)→
   goal(1,3) dist=2 无墙——确定性锚点，走 2 步到萝卜）；演示句「点旁边的格子走路」；
   帮=指向 BFS 下一格；独=首次走通放手
   时序（家族 G/H）：watch clip 3264ms → 演示 tap 延至 t=900+3000=3900（≥3264+300=3564），
   第一步 moved 落定 520 后第二步局终窗 3700 罩机制句 TTS（estMs(8)=3360）再收束 turn
   （全程 SPEED 预算 900+3000+320+520+3700+500=8940 ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* maz_tut_watch：看！帮小兔子走迷宫（3264ms） */
  await wait(900 * SPEED);                       /* 网格+小兔+萝卜亮相 */
  pointGhostAt(cellEl(1, 2));                    /* 锚点：第一步恒点 (1,2)（相邻可行格） */
  await wait(3000 * SPEED);                      /* t=3900 ≥ watch 3264+300=3564：clip 播完再演示（不撞头） */
  ghost.press();
  await wait(320 * SPEED);
  const r1 = await uiTapCell(1, 2, true);        /* demo 通道豁免 locked 门（演示吞真实输入） */
  const r2 = await uiTapCell(1, 3, true);        /* 走第 2 步到萝卜：'right'（终值语义） */
  window.__mzDemoR = r2;                         /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);                       /* 收尾（机制句 TTS 仍在播，由局终窗 3700 罩满） */
  const sv = KIDS._save() || {};
  sv.maze = sv.maze || {};
  sv.maze.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来走一走"在重发后的题面上说（照 batch5-29） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderRun(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* maz_tut_turn：你来走一走（1800ms） */
  setTimeout(() => {
    if (state.tut === 'help' && curMaze()) speakQuiz();
  }, 2200);                                      /* ≥1800+300=2100 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：看看旁边的格子 */
  walkHint();                                    /* 方向级：相邻可行格 pulse */
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
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：题面重读 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  const cell = e.target.closest('.cell');
  if (cell) {                                    /* 格子点击=走位主路径 */
    e.preventDefault();
    uiTapCell(Number(cell.dataset.r), Number(cell.dataset.c));
    return;
  }
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.cell') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护（命名函数 rescueTick——verify 源码级断言用）：
   14s 方向级（重读题面+相邻可行格 pulse，lastDir 独立节流锚，不重置 lastAct——30s 答案级
   不被饿死）/ 30s 答案级（BFS 下一格 breathe + 重读）/ 教学"帮"5s 重演示；
   错反馈链豁免窗守卫在顶部（家族 I：链播完前救援不掐断，不挡主动点选） ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（家族 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板遮挡期救援静默（家族 K：层在时点击全吞却每 14-18s 重播读题=「一直在念题点什么都没反应」） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = curMaze();
    if (q) {
      const p = solveNext(q);
      if (p) { const el = cellEl(p.r, p.c); if (el) replayAnim(el, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+相邻可行格 pulse（不动 lastAct） */
    speakQuiz();
    walkHint();
    replayAnim(sceneEl, 'pulse');
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);

/* ================= 启动（命名函数 boot——verify 源码级断言家族 A 用；
   verify 分支由 game-verify.js 接管） ================= */
function boot() {
  KIDS.init({ game: 'maze', title: '迷宫探险' });   // 存档键 kidsgame_maze（core VER 1.0，家族 C：带 v:'1.0'）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}
buildStatic();
if (!VERIFY) boot();

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口）
   MZ.quiz：maze={size,walls[],key,door,entry,goal}（每局固定，不随移动变——key/door
   无门局为 null）/ pos={r,c}（小兔当前格）/ hasKey / step=trail.length-1（局内已走步数，
   回退后随足迹截断变小）/ miss=本局 miss。currentLevel.step=局序（0-2）、
   currentLevel.miss=全关 miss 合计（星级口径） ================= */
window.MZ = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.mazes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    const q = curMaze();
    if (!q) return null;
    return { maze: { size: q.size,
                     walls: q.walls.map(w => ({ r: w.r, c: w.c })),
                     key: q.key ? { r: q.key.r, c: q.key.c } : null,
                     door: q.door ? { r: q.door.r, c: q.door.c } : null,
                     entry: { r: q.entry.r, c: q.entry.c },
                     goal: { r: q.goal.r, c: q.goal.c } },
             pos: { r: q.pos.r, c: q.pos.c },
             hasKey: !!q.hasKey,
             step: q.trail.length - 1,
             miss: q._miss || 0 };
  },
  tapCell(r, c) { return uiTapCell(r, c); },
  async autoSolve() {                    // UI 路径自动走完当前关（3 局合计 taps，BFS 逐步点真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 300) {
      const q = curMaze();
      if (!q) break;
      const p = solveNext(q);
      if (!p) break;                             // 无解（生成先验保证不出现）
      const r = await uiTapCell(p.r, p.c);
      if (r === null) break;                     // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
