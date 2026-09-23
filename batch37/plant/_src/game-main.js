/* ================= plant 主逻辑（程序卡开题 → 点格种树 → 花园成形 → 关末全景）
   开题演出（presentQuiz）：渲染程序卡新句（abs 6 字/rel 15 字——r47 δ3）→ pl_ask
   「种在哪一格」（窗 ASK_WIN 2172=1872+300 家族 H）→ 卡亮 .lit + 卡句播报
   （playCard 分流：abs=T46 全句 clip pl_q_{row}_{col}；rel=queue 拼 3 clip
   [pl_rel_from, pl_mv_X, pl_mv_Y] 窗 CARD_WIN_REL 6900——r47 §R6/§R7 est 上界，
   段一未注册静默期卡文案视觉承载）→ 开放点选。花园网格跨题持续成形
   （每关 5 卡 5 树——网格只在换关时重建）。
   r47 δ2 标尺闪现（dch≥3）：开题标尺可见，卡亮 RULER_FADE_MS 1200 后淡出
   （#garden.rulers-off）；错反馈/重听/救援方向级=litRulers 解除淡出重闪，高亮窗
   （700+700+900）末恢复淡出（cur===run 守卫——r46 S1 旗标回收纪律）。
   r47 δ3 rel 题：星星起点徽章（setStar 生命周期：开题挂/种对清/换关重建；
   starPulse=点星星拒绝+方向级反馈）；错链第二段=pl_rel_hint（豁免窗
   WRONG_CHAIN_REL 6219 真时钟契约 I）；abs 语义全承 v1。
   演出锁=真时钟 state.showUntil（Date.now() 比较，tapCell 演出期返 null——
   测试驱动须轮询等可交互）。
   点对=树苗生长动画（empty→tree+pop）+确认链 [pl_right]（单 clip 1944——
   演出窗 GROW_MS 1100+PLANT_TAIL 1300=2400 ≥ 1944+300=2244 家族 G/H）。
   点错=错链（abs [pl_wrong, pl_hint] 5082 / rel [pl_wrong, pl_rel_hint] 6219
   真时钟契约 I）+方向级反馈（abs=高亮正确行/列标尺——只亮行列边缘不亮格子本体
   不泄答案；rel=星星 starbeat）/miss≥2 正确格 breathe（答案级）。
   点已种格=树苗轻摇 shake+拒绝 false（家族 D 不计 miss——探索不罚，豁免窗内外
   同路径）；点星星格=星星摇 starbeat+拒绝 false（r47 家族 D 变体——星星是
   salient 参照物，儿童首点星星是自然探索，不计 miss）。
   重听=重读程序卡+方向级反馈（3s 节流，题面后可点）。
   救援：14s 方向级=重读程序卡+方向级反馈（lastDir 独立节流锚不重置 lastAct——
   契约 B；rel 加星星 pulse）/30s 答案级=正确格 breathe+重读；错链豁免窗让路
   （契约 I）。关末=花园全景 panorama+零错开花 bloom 加成（纯演出层——判定
   每步即判，GARDEN_WIN 2400 ≥ 2244）→ celebrate → persistWin。
   验收钩子：window.PL = { get currentLevel, get quiz{kind,mode,row,col,n,star,
   moves,planted,card,step,miss}, tapCell(i), start(flat), autoSolve(), reread() }
   ——真实页同暴露（b29 坑⑥）。tapCell 返回：对且非末题 'planted' / 对且末题
   'done' / 错格 'wrong' / 已种格·星星格 false（不计 miss）/ 豁免窗内错点吞
   false / 演出期 null（真时钟锁）/ 越界·已答·无题 null。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3（含教学迷你关 -1）每错必播；flat≥3 走 10s 节流
   （契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), gridEl = $id('grid'), gardenEl = $id('garden'),
      colRulerEl = $id('col-ruler'), rowRulerEl = $id('row-ruler'),
      cardEl = $id('card'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重听 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新卡/重听中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellAt = i => gridEl.querySelector('.cell[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：种对=双音上行 / 点错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
function renderGrid(q) {                        // 花园网格+行列标尺（换关时整建；跨题持续成形不重建）
  $id('game').classList.toggle('wide', q.n >= 5);   // r47 δ1：n≥5（5×5/6×6）紧凑布局
  gridEl.style.setProperty('--n', q.n);
  colRulerEl.style.setProperty('--n', q.n);
  rowRulerEl.style.setProperty('--n', q.n);
  colRulerEl.innerHTML = '';
  rowRulerEl.innerHTML = '';
  gridEl.innerHTML = '';
  for (let c = 1; c <= q.n; c++) {
    const s = document.createElement('span');
    s.textContent = c;                          // 列号 1-N（坐标教学锚；ch3-4 闪现——δ2）
    s.dataset.col = c;
    colRulerEl.appendChild(s);
  }
  for (let r = 1; r <= q.n; r++) {
    const s = document.createElement('span');
    s.textContent = r;                          // 行号 1-N（同上）
    s.dataset.row = r;
    rowRulerEl.appendChild(s);
  }
  for (let i = 0; i < q.n * q.n; i++) {
    const b = document.createElement('button');
    b.className = 'cell empty';
    b.dataset.i = i;                            // 扁平下标（渲染即引擎——契约 M）
    const rr = Math.floor(i / q.n) + 1, cc = i % q.n + 1;
    b.setAttribute('aria-label', '第' + rr + '行第' + cc + '列的格子');
    b.innerHTML = '<div class="sapling">' + treeSvg(86) + '</div>';
    gridEl.appendChild(b);
  }
  gridEl.dataset.n = q.n;                       // 帧内容锚（verify 断言渲染即引擎）
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
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderGrid(q);
  renderStep();
}

/* ================= r47 δ3 星星徽章生命周期（rel 题参照锚）
   setStar(q)：清在场徽章→rel 题挂 starIdx 格（data-star DOM 锚+starbadge SVG；
   star ∉ used 生成期保证星星永不上树）；abs 题/null=纯清除
   （种对/换题/换关均清除——题内 target≠star，树苗不与徽章共存） ================= */
function setStar(q) {
  gridEl.querySelectorAll('.cell.star').forEach(c => {
    c.classList.remove('star', 'starbeat');
    delete c.dataset.star;
    const b = c.querySelector('.starbadge');
    if (b) b.remove();                 /* r47-fix M1：徽章 span 随星拆除（防残留金星盖树苗/标后题答案格） */
    const al = c.getAttribute('aria-label');
    if (al && al.endsWith('，星星起点')) c.setAttribute('aria-label', al.slice(0, -5));   /* 还原 renderGrid 原始标签 */
  });
  if (!q || q.mode !== 'rel') return;
  const el = cellAt(starIdx(q));
  if (el) {
    el.classList.add('star');
    el.dataset.star = '1';
    el.setAttribute('aria-label', '第' + q.star.row + '行第' + q.star.col + '列的格子，星星起点');
    if (!el.querySelector('.starbadge'))
      el.insertAdjacentHTML('beforeend', '<span class="starbadge">' + starSvg() + '</span>');
  }
}
/* 方向级反馈（rel）：星星 starbeat pulse——提示回星星参照（星星≠答案格不泄答案） */
function starPulse(q) {
  if (!q || q.mode !== 'rel') return;
  const el = cellAt(starIdx(q));
  if (el) replayAnim(el, 'starbeat');
}

/* ================= 标尺高亮（方向级反馈：先看行再看列——只亮行列边缘，
   不亮格子本体——不泄答案；错反馈/重听/救援共用）
   r47 δ2：ch3-4（run.dch≥3）高亮窗内解除 rulers-off 重闪，窗末恢复淡出
   （cur===run 守卫——题已换则不动新题的标尺态，r46 S1 旗标回收纪律） ================= */
function litRulers(q) {
  const run = cur, st = cur ? cur.step : -1;
  gardenEl.classList.remove('rulers-off');                    // ch3-4 重闪基线（ch1-2 无类无副作用）
  const rr = rowRulerEl.children[q.row - 1], cc = colRulerEl.children[q.col - 1];
  if (rr) replayAnim(rr, 'lit');                              // 先看行
  setTimeout(() => { if (cc) replayAnim(cc, 'lit'); }, RULER_ROW_MS * SPEED);   // 再看列
  setTimeout(() => {
    if (rr) rr.classList.remove('lit');
    if (cc) cc.classList.remove('lit');
    if (run && run.dch >= 3 && cur === run && cur.step === st) gardenEl.classList.add('rulers-off');   // 窗末恢复淡出（step 守卫：同关换题不动新题标尺态——审查 m1）
  }, (RULER_ROW_MS + RULER_COL_MS + 900) * SPEED);
}

/* ================= 卡句播报分流（r47 §R4）：abs=T46 全句 clip voice.play /
   rel=queue 拼 3 clip [pl_rel_from, pl_mv_X, pl_mv_Y]（段一未注册静默——
   core queue 缺 clip 且无文本=放弃整句，卡文案视觉承载，r37/r44 先例） ================= */
const playCard = q => q.mode === 'rel'
  ? KIDS.voice.queue(relClips(q))
  : KIDS.voice.play(cardClip(q), cardText(q));

/* ================= 开题呈现：程序卡新句 → ask → 卡亮+读卡（abs clip/rel 链）→ 开放点选
   演出锁=真时钟 showUntil（tapCell 演出期返 null——测试驱动须轮询等可交互） ================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderStep();
  cardEl.textContent = cardText(q);             // 程序卡新句（题面真值：abs 6 字/rel 15 字）
  cardEl.classList.toggle('rel', q.mode === 'rel');   // rel 长文案紧凑字号（r47）
  cardEl.classList.remove('lit');
  const run = cur, token = ++showRun;
  state.locked = true;
  state.showUntil = Date.now() + (ASK_WIN + (q.mode === 'rel' ? CARD_WIN_REL : CARD_WIN)) * SPEED + 140;   // 真时钟演出锁
  setStar(q);                                   // rel 星星徽章（开题挂——生命周期锚）
  gardenEl.classList.remove('rulers-off');      // ch3-4 开题标尺可见（δ2 闪现基线）
  sayR(VOICE.ask.key, VOICE.ask.text);          /* pl_ask：种在哪一格（1872） */
  await wait(ASK_WIN * SPEED);                  /* 2172=1872+300（家族 H） */
  if (token !== showRun || cur !== run) return;
  cardEl.classList.add('lit');                  // 卡亮（读卡视锚）
  playCard(q);                                  /* 卡句：abs pl_q clip（T46）/ rel 3 clip 链（r47） */
  if (run.dch >= 3)                             /* δ2：卡亮 RULER_FADE_MS 1200 后标尺淡出
                                                    （token+run 双守卫——中止在途不落脏类，r46 S1） */
    setTimeout(() => {
      if (token === showRun && cur === run) gardenEl.classList.add('rulers-off');
    }, RULER_FADE_MS * SPEED);         /* r47-fix M2：注册点已在卡亮（ask 窗 await 后）——延迟只算淡出段，防 ASK_WIN 双重计入 */
  await wait(q.mode === 'rel' ? CARD_WIN_REL * SPEED : CARD_WIN * SPEED);   /* abs 3315 / rel 6900（r47 §R7） */
  if (token !== showRun || cur !== run) return;
  cardEl.classList.remove('lit');
  state.locked = false;
  lastAct = Date.now();                         /* 读卡完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* ================= 重听：重读程序卡+卡亮+方向级反馈（user=true 走 3s 节流；
   救援路径 false 不重置 lastAct——契约 B；轻提示不锁输入）
   方向级反馈按题型分流：abs=标尺高亮 / rel=星星 pulse（r47） ================= */
function reReadCard(user) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || state.won) return false;
  if (cur.flat < 0) return false;               /* 教学迷你关禁重听（重发=破坏教学时序） */
  if (user) {
    if (Date.now() - lastReplayAt < 3000) return false;   // 3s 节流
    lastReplayAt = Date.now();
  }
  replayAnim(cardEl, 'lit');
  playCard(q);                                  // 重读卡句（abs clip / rel 链）
  if (q.mode === 'rel') starPulse(q); else litRulers(q);
  if (user) lastAct = Date.now();               /* 主动重听重置 idle（救援路径不动——契约 B） */
  return true;
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
/* 教学"帮"阶段指向：当前题目标格（教学期泄答案=家族先例，帮→独后撤；
   教学迷你关恒 abs 3×3——r47 谱不触教学） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cellAt(i));
}

/* ================= 点格主路径（真实点击 / PL.tapCell / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（网格容器 bump / 已种格树苗轻摇 shake / 星星格星星摇
   starbeat——家族 D）；演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/
   对选放行）========== */
async function uiTapCell(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(gridEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(gridEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.n * q.n) { sfx('pop'); replayAnim(gridEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* 已种格=树苗轻摇+拒绝（家族 D：豁免窗内外同路径——探索不罚，不计 miss 不响 wrong） */
  if (cur.planted.indexOf(i) >= 0) {
    sfx('pop');
    replayAnim(cellAt(i), 'shake');
    return false;
  }
  /* 星星格=星星摇+拒绝（r47 家族 D 变体：星星是 salient 参照物，首点星星=自然
     探索不罚不计 miss；预判与引擎 engTapCell starIdx 分支严格同构——b34 坑） */
  if (q.mode === 'rel' && i === starIdx(q)) {
    sfx('pop');
    replayAnim(cellAt(i), 'starbeat');
    return false;
  }
  const tgt = cellIdx(q);
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     对选放行（缓解吞输入急性子观察）；窗后二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== tgt) {
    sfx('pop'); replayAnim(gridEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCell(cur, i);
  if (r === null) { sfx('pop'); replayAnim(gridEl, 'bump'); return null; }
  const el = cellAt(i);

  if (r === 'wrong') {                           /* 点错：方向级反馈+错链两段+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + (q._miss === 1 ? 2214 : 1000) * SPEED + 140;   /* b37 审查 R3：4782 全吞豁免窗收窄 */
    dodgeLo();
    if (q.mode === 'rel') starPulse(q);          /* rel 方向级：星星 pulse（回参照物） */
    else litRulers(q);                           /* abs 方向级：高亮正确行/列标尺（不亮格子本体） */
    if (sayW(q.mode === 'rel' ? [VOICE.wrong.key, REL_HINT_KEY] : [VOICE.wrong.key, VOICE.hint.key]))
      /* 错链豁免窗按题型分流（契约 I 真时钟）：rel 6219 / abs 5082（r47 §R7） */
      wrongChainUntil = Date.now() + (q.mode === 'rel' ? WRONG_CHAIN_REL : WRONG_CHAIN_WIN);
    if (q._miss >= 2) {                                      /* miss≥2=正确格 breathe（答案级梯度） */
      const ok = cellAt(tgt);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait((q._miss === 1 ? 2214 : 1000) * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- planted / done（种对：树苗生长动画+确认链单 clip） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  setStar(null);                                 /* 星星徽章让位（题末清除——r47 生命周期） */
  if (state.tut === 'help') {                    /* 教学"独"：首次种对 → 放手 */
    state.tut = 'solo';
    window.__plTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  state.showUntil = Date.now() + (GROW_MS + PLANT_TAIL) * SPEED + 140;
  if (el) {
    el.classList.remove('empty', 'breathe', 'pop');
    void el.offsetWidth;
    el.classList.add('tree', 'pop');             /* 渲染层：empty→tree（契约 M）+生长动画 */
  }
  chimeGoal();
  sfx('coin');
  KIDS.voice.queue([VOICE.right.key]);           /* 确认链：小树种好啦（单 clip 1944——契约 N） */
  await wait(GROW_MS * SPEED);                   /* 树苗生长动画主窗 1100 */
  if (cur !== run) return r;
  await wait(PLANT_TAIL * SPEED);                /* 收尾窗：1100+1300=2400 ≥ 1944+300=2244（家族 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关（watch 期由
                                                   tutorialWatch 接管，不进关） */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                 /* 新卡开题（花园持续成形——网格不重建） */
  return r;
}

/* ================= 过关推进（花园全景 → celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_plant） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
}
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关静态章档 GEN[dch-1]
     （家族 F：genLevel 纯函数确定性，dch=静态 ch 档无 RNG——预告与实际恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
/* 关末花园全景+零错开花加成（纯演出层——判定每步即判；GARDEN_WIN 2400 ≥
   pl_right 1944+300=2244 罩 winFlow 重播） */
async function gardenShow() {
  if (cur && cur.retries === 0) {
    gridEl.querySelectorAll('.cell.tree').forEach(c => replayAnim(c, 'bloom'));
  }
  sceneEl.classList.add('panorama');
  await wait(GARDEN_WIN * SPEED);
  sceneEl.classList.remove('panorama');
}
function winFlow() {
  state.won = true;
  state.locked = true;
  showRun++;                                     /* 通关中止在途演出 */
  setStar(null);                                 /* 星星徽章清除（r47：全景不留参照） */
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* pl_right：小树种好啦（1944ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  gardenShow().then(() => KIDS.ui.celebrate(stars)).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 1944+300=2244 */
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
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastReplayAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.plant && sv.plant.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §2 v1+r47：watch=3×3 中心格演示/
   turn=3×3 单卡——恒 abs（r47 谱不触教学，锚面零变化）；quiz 补 mode/star/moves
   字段（行为零变化）
   watch=播 pl_tut_watch「看！按卡种小树」→ 开题（ask+卡亮读卡）→ 幽灵手指点
   目标格 → 树长出（__plDemoR='planted'——题 0 非末题）；turn=重立单卡迷你关
   「你来种一种」，帮（指向目标格）→首对独（solo）→进正式关。时序（家族 G/H/T）：
   watch clip 3072 → 延 3372（≥3072+300）→ 开题（ask 2172+卡句 3315）
   → ghost 移入 800+press 320 → demo 演出窗 1100+1300=2400（罩确认链
   1944+300=2244）—— watch 段分账 3372+2172+3315+800+320+2400=13379 ≤ 16000 ----------
   turn clip 1824 → 延 2124（≥1824+300）→ presentQuiz 5487 → 帮指 ---------- */
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 种对返回 'planted'）
  return { flat: -1, ch: 0, dch: 0, lv: 0, n: 3, step: 0, retries: 0, done: false, planted: [],
           quizzes: [{ kind: 'plant', mode: 'abs', n: 3, row: 2, col: 2, star: null, moves: null, _miss: 0, _answered: false },
                     { kind: 'plant', mode: 'abs', n: 3, row: 1, col: 3, star: null, moves: null, _miss: 0, _answered: false }] };
}
function tutTurnLevel() {                        // 单题迷你关（末题=种对返回 'done'→帮转独）
  return { flat: -1, ch: 0, dch: 0, lv: 0, n: 3, step: 0, retries: 0, done: false, planted: [],
           quizzes: [{ kind: 'plant', mode: 'abs', n: 3, row: 3, col: 1, star: null, moves: null, _miss: 0, _answered: false }] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* pl_tut_watch：看！按卡种小树（3072ms） */
  await wait(3372 * SPEED);                      /* ≥3072+300=3372：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* ask+卡亮读卡 → 开放（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);                     // =4 中心格（演示更直观）
  pointGhostAt(cellAt(idx));                     /* 幽灵手指指向目标格 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapCell(idx, true);      /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__plDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'planted'——终值语义） */
  window.__plWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.plant = sv.plant || {};
  sv.plant.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立单卡迷你关「你来种一种」（帮→独），首种对放手进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 planted 的 presentQuiz 新卡） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* pl_tut_turn：你来种一种（1824ms） */
  await wait(2124 * SPEED);                      /* ≥1824+300=2124 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* ask+卡句→开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
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
  const q = cur.quizzes[cur.step];
  if (q && q.mode === 'rel') {                   /* r47：rel 提示=回星星数着走（不泄答案格） */
    sayR(REL_HINT_KEY, REL_HINT_TEXT);
    starPulse(q);
  } else {
    sayR(VOICE.hint.key, VOICE.hint.text);       /* abs 戳兔子=方向提示：先看行，再看列 */
    if (q) litRulers(q);
  }
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期重听门 */
  lastAct = Date.now();
  replayAnim(replayBtn, 'bounce');
  reReadCard(true);                              /* 重读程序卡+方向级反馈（3s 节流在内） */
});
gridEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.cell');
  if (!p) return;                                // 格间空白走 stage 空白路径
  e.preventDefault();
  uiTapCell(Number(p.dataset.i));                /* 点扁平下标 i 的格（tapCell 语义） */
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.cell')) return;         // 格点击已由 gridEl 处理
  /* 空白/探索点击（含舞台垫非格区）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    const q = cur.quizzes[cur.step];             /* r47：rel 空白提示=pl_rel_hint（题型分流） */
    if (q && q.mode === 'rel') sayR(REL_HINT_KEY, REL_HINT_TEXT);
    else sayR(VOICE.hint.key, VOICE.hint.text);  /* abs 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读程序卡+方向级反馈，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确格 breathe+重读）/
   教学"帮"5s 重演示
   r47：方向级反馈按题型分流在 reReadCard 内（abs 标尺/rel 星星）——救援路径
   恒 user=false 不刷 lastAct（契约 B；r46 M1 救援饿死家族缺陷复核=不适用本款
   reReadCard 无条件刷锚点） ================= */
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
      const i = correctIdx(q);
      if (i >= 0) { const ok = cellAt(i); if (ok) replayAnim(ok, 'breathe'); }
      reReadCard(false);
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读程序卡+方向级反馈（不动 lastAct） */
    reReadCard(false);
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
  KIDS.init({ game: 'plant', title: '植树程序' });   // 存档键 kidsgame_plant（core VER 1.0，家族 C）
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
   真实页同暴露 window.PL——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（含 row/col 目标格真值——verify 用独立 mulberry32 副本
   复算坐标=对账锚）；step=全关题号 0-4（b33 坑①：题号语义）。
   r47 新字段：mode('abs'|'rel')/star({row,col}|null)/moves([[d,s]×2]|null 拷贝)。
   tapCell 返回：对且非末题 'planted' / 对且末题 'done' / 错格 'wrong' /
   已种格 false（bump 家族 D 不计 miss）/ 星星格 false（r47 家族 D 变体不计 miss）/
   豁免窗内错点吞 false / 开题演出期 null（真时钟锁）/ 越界·已答·无题 null；
   reread()=重读程序卡（3s 节流内 false）================= */
window.PL = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             grid: cur.n, step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                             /* SPEC §2 钩子契约：'plant' 恒 */
             mode: q.mode,                             /* r47：'abs'|'rel' 题型真值 */
             row: q.row,                               /* 本题行号 1-N（abs=卡坐标/rel=位移终点） */
             col: q.col,                               /* 本题列号 1-N */
             n: q.n,                                   /* 网格边长 3-6 */
             star: q.star ? { row: q.star.row, col: q.star.col } : null,   /* rel 星星起点（拷贝） */
             moves: q.moves ? q.moves.map(m => m.slice()) : null,          /* rel 两段指令（拷贝） */
             planted: cur.planted.slice(),             /* 已种格扁平下标数组（进度真值） */
             card: cardText(q),                        /* 程序卡文本（abs 6 字/rel 15 字真值） */
             step: cur.step,                           /* 全关题号 0-4（b33 坑①） */
             miss: q._miss || 0 };
  },
  tapCell(i) { return uiTapCell(i); },
  reread() { return reReadCard(true); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点目标格，走真实判定链；
    let taps = 0, guard = 0;             // 演出锁/开题演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 200) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapCell(correctIdx(q));
      if (r === 'planted' || r === 'done') taps++;
      else if (guard >= 198) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
