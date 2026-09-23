/* ================= position 主逻辑（树+六方位格渲染 / 四型点格判定 / 教学 / 救援 / 推进）
   玩法（SPEC-R44-POSITION）：场景=树居中+方位格（浅虚线框，恒全摆 6 格含左右）+题面句条。
   findpos（ps_q1「兔子在树的哪里呀」→点兔子所在格）/ placepos（全句 clip
   「把兔子放到树的X」ps_place_<方位> 6 键→点目标格放兔子）/
   dual（ch3+：「兔子藏在树的X，也在房子的Y」ps_dual_<combo> 4 键（r44 新键已注册
   2026-09-22 段二，全链有声——未注册期静默披露销账）→房子渲染左下/右下，兔子隐藏，
   点两约束共指格（§R12.1：两约束恒同格非交集结构）
   兔子 pop 出现）/ flip（ch4+：「兔子转过身去啦，它的X边是树的哪边呀」ps_flip_<方位>
   6 键→兔子背面态坐非答案格，answer=FLIP_MAP 映射格，点对教育链 [ps_right, ps_fy_<ask>]）。
   点对=格亮+ps_right+确认链（findpos/placepos/dual=[ps_right, ps_n_<方位>, ps_ya] 全 clip；
   flip=[ps_right, ps_fy_<ask>] 教育句承载映射律——注册后实测 7002≤窗 9000（余 1998，
   SPEC-R44 §R8 段二复核；原未注册期 est 口径销账）+placepos 兔子飞入/dual 兔子 pop 出现；
   点错=格摇头+错链两段 [ps_wrong, ps_hint]（全 clip 无 keyless）+方向级回锚
   （findpos=兔 pulse / placepos=场景 pulse 不泄具体格 / dual=房子 pulse（看两个参照物，
   不泄格）/ flip=兔 pulse（背面兔提示看朝向，兔在非答案格不泄答案）），1000ms 防重入窗后可重选；
   miss≥2=正确格 breathe（答案级，家族梯度——四型恒用，SPEC §0.80 v1 定版延续）。
   救援：14s 方向级=重读题面+方向级回锚（lastDir 独立节流锚）；30s 答案级=正确格
   breathe+重读；错反馈链豁免窗 4970 让路（契约 I：SPEC §4 算式 1656+150+2856+300=4962
   下界，任务书 4960 为舍入口径，取 4970 覆盖契约下界）。
   ch1 兔子初始位高亮 1.2s 帮定位（左右首进降坡锚）；ch2 起高亮即刻消失（纯看图）。
   验收钩子：window.PS = { get currentLevel, get quiz(){kind, ask, ask2, house, face,
     cells[]{pos}, bunnyAt, answer, step, miss}, tapCell(i), start(flat), async autoSolve(),
     get tutorial }（getter 返回拷贝；真实页同暴露——b29 坑⑥：verify 页独占钩子=驱动假阳性）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), cellsWrapEl = $id('cells'), treeSvgEl = $id('tree-svg'),
      houseEl = $id('house'),
      qbarEl = $id('qbar'), qTextEl = qbarEl.querySelector('.q-text'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellEl = i => cellsWrapEl.querySelector('.cell[data-i="' + i + '"]');
const bunnyCell = () => cellsWrapEl.querySelector('.cell .bunny') ?
  cellsWrapEl.querySelector('.cell .bunny').closest('.cell') : null;

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  treeSvgEl.innerHTML = TREE_INNER;             // 树整棵（z=20：盖 back 格兔子/被 front 格兔子盖）
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（开题链）
   findpos=[ps_q1]（问句单 clip——不播方位名音防泄答案）；
   placepos=[ps_place_<ask>]（六方位全句 6 键在册）；
   dual=[ps_dual_<combokey>]（r44 新键 4——未注册期回退 speak→Task#46 静默+q-text 视觉承载，
   主线段二注册后自动接链，SPEC-R44 §R6/§R7）；
   flip=[ps_flip_<ask>]（r44 新键 6，同上）。读题异步不占 UI 等待窗 */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'findpos') KIDS.voice.queue([VOICE.q1.key]);
  else if (q.kind === 'placepos') KIDS.voice.queue([placeClip(q.ask)]);
  else if (q.kind === 'dual') KIDS.voice.queue([dualClip(DUAL_COMBOS.find(c => c.tree === q.ask && c.houseDir === q.ask2 && c.house === q.house).key)]);
  else KIDS.voice.queue([flipClip(q.ask)]);
}
/* 重听路径（hear/场景空白共用）：重播开题链+方向级回锚 */
function replayQuiz(withAnchor) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  speakQuiz();
  if (withAnchor) dirAnchor();
}
/* 方向级视觉回锚（错反馈/重听/救援共用）按题型分流（SPEC-R44 §R5）：
   findpos=兔子 pulse（兔子即答案锚）/ placepos=场景整体 pulse（不泄具体目标格）/
   dual=房子 pulse（新参照物锚「看两个参照物」——房非作答格不泄答案）/
   flip=兔 pulse（背面兔提示看朝向——兔在非答案格不泄答案） */
function dirAnchor() {
  if (!cur) return;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'findpos' || q.kind === 'flip') {
    const b = bunnyCell();
    if (b) { const bn = b.querySelector('.bunny'); if (bn) replayAnim(bn, 'pulse'); }
  } else if (q.kind === 'dual') {
    pulseHouse();
  } else {
    replayAnim(sceneEl, 'pulse');
  }
}
/* 兔子 pulse（救援/错反馈方向级直接入口） */
function pulseBunny() {
  const b = bunnyCell();
  if (b) { const bn = b.querySelector('.bunny'); if (bn) replayAnim(bn, 'pulse'); }
}
/* 房子 pulse（r44 dual 方向级回锚直接入口——房非作答格不泄答案） */
function pulseHouse() {
  if (houseEl.dataset.on === '1') replayAnim(houseEl, 'pulse');
}

/* ================= 渲染 ================= */
const Q_TEXT = q => q.kind === 'findpos' ? VOICE.q1.text
  : q.kind === 'placepos' ? PLACE_TTS[q.ask]
  : q.kind === 'dual' ? DUAL_TTS[DUAL_COMBOS.find(c => c.tree === q.ask && c.houseDir === q.ask2 && c.house === q.house).key]
  : FLIP_TTS[q.ask];
/* 格子几何 → % 定位（场景坐标系 330×470 → #scene 百分比） */
function cellStyle(el, pos) {
  const g = CELL_GEO[pos];
  el.style.left = ((g.cx - g.w / 2) / VIEW_W * 100) + '%';
  el.style.top = ((g.cy - g.h / 2) / VIEW_H * 100) + '%';
  el.style.width = (g.w / VIEW_W * 100) + '%';
  el.style.height = (g.h / VIEW_H * 100) + '%';
}
function renderCells(q) {                         // 方位格层（恒全摆 6 格）+兔子落 bunnyAt 格
  cellsWrapEl.innerHTML = '';
  q.cells.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'cell pos-' + c.pos + ' pop-in';
    b.dataset.i = i;
    b.dataset.pos = c.pos;                        // 帧内容锚（契约 M：渲染即引擎+遮挡 z 断言）
    b.setAttribute('aria-label', POS_NAME[c.pos] + '格子');
    cellStyle(b, c.pos);
    if (c.pos === q.bunnyAt) {
      const bn = document.createElement('div');
      /* r44 flip：背面兔（转身态）——class 'bunny back'+格 data-face 朝向锚（契约 M）；
         dual（bunnyAt=null）零兔渲染=隐藏（防读图绕过推理） */
      bn.className = q.face === 'back' ? 'bunny back' : 'bunny';
      bn.innerHTML = q.face === 'back' ? bunnyBackSvg() : bunnySvg();
      if (q.face === 'back') b.dataset.face = 'back';
      b.appendChild(bn);
    }
    b.style.animationDelay = (i * 70) + 'ms';
    cellsWrapEl.appendChild(b);
  });
  qTextEl.textContent = Q_TEXT(q);
}
/* r44 dual 房子渲染：q.kind==='dual' 时按 HOUSE_GEO 挂房子 SVG（g[data-scene="house"]
   契约 M 锚；pointer-events:none 非作答面）；其他题型清空 */
function renderHouse(q) {
  if (q && q.kind === 'dual' && HOUSE_GEO[q.house]) {
    const g = HOUSE_GEO[q.house];
    houseEl.innerHTML = houseSvg();
    houseEl.style.left = ((g.cx - g.w / 2) / VIEW_W * 100) + '%';
    houseEl.style.top = ((g.cy - g.h / 2) / VIEW_H * 100) + '%';
    houseEl.style.width = (g.w / VIEW_W * 100) + '%';
    houseEl.style.height = (g.h / VIEW_H * 100) + '%';
    houseEl.dataset.on = '1';
  } else {
    houseEl.innerHTML = '';
    houseEl.removeAttribute('style');
    houseEl.dataset.on = '0';
  }
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
  renderCells(q);
  renderHouse(q);                                 // r44：dual 挂房子/其他题型清空
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 开题读题（教学演示期静默）
  /* ch1 兔子初始位高亮 1.2s 帮定位（入门锚——r44 起含左右首进的降坡缓冲）；
     ch2 起即刻消失=纯看图 */
  if (!VERIFY && cur.dch === 1 && q.kind === 'findpos') {
    const b = cellEl(q.answer);
    if (b) {
      replayAnim(b, 'lit');
      setTimeout(() => b.classList.remove('lit'), 1200);
    }
  }
}

/* ================= placepos 兔子飞入（点对演出）：克隆兔子从旧格飞越到目标格
   （引擎已同步更新 q.bunnyAt；旧格兔子移除+目标格兔子即时入 DOM 保证帧内容断言即时一致，
   格内兔子 450ms 后显现与飞越 clone 落定同步） ================= */
function flyBunny(fromPos, toPos) {
  const g1 = CELL_GEO[fromPos], g2 = CELL_GEO[toPos];
  if (!g1 || !g2) return;
  const sz = pos => (pos === 'front' ? 90 : pos === 'back' ? 58 : 80);   // 格内兔子宽%（head 各格类）
  const el = document.createElement('div');
  el.className = 'bunny-fly';
  el.innerHTML = bunnySvg();
  el.style.width = (g1.w * sz(fromPos) / 100 / VIEW_W * 100) + '%';
  el.style.left = (g1.cx / VIEW_W * 100) + '%';
  el.style.top = (g1.cy / VIEW_H * 100) + '%';
  el.style.transform = 'translate(-50%,-50%)';
  sceneEl.appendChild(el);
  const target = cellsWrapEl.querySelector('.cell[data-pos="' + toPos + '"]');
  const inner = target && target.querySelector('.bunny');
  if (inner) inner.style.visibility = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.width = (g2.w * sz(toPos) / 100 / VIEW_W * 100) + '%';
    el.style.left = (g2.cx / VIEW_W * 100) + '%';
    el.style.top = (g2.cy / VIEW_H * 100) + '%';
  }));
  setTimeout(() => {
    el.remove();
    if (inner) inner.style.visibility = '';
  }, 450 * SPEED + 40);
}

/* ================= 答对演出：题面条跳 + 确认句文字 + 小兔子按钮跳（确认链拼播由 uiTapCell 播）
   r44 flip：确认句=FLIPY_TTS（转身以后它的X边就是树的M边呀——映射律视觉承载）；
   其余题型=CONFIRM_TTS（兔子在树的X呀）。verify 页跳过装饰直接落定 ================= */
function celebrateScene(q) {
  qTextEl.textContent = q.kind === 'flip' ? FLIPY_TTS[q.ask] : CONFIRM_TTS[q.ask];
  replayAnim(qbarEl, 'jump');
  hopRabbit();
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
/* 教学"帮"阶段指向：当前题正确格 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cellEl(i));
}

/* ================= 点格主路径（真实点击 / PS.tapCell / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（格层容器 bump 微动效——家族 D）；
   错防重入窗/判对演出窗共用 locked 门；错点 1000ms 防重入窗（b16 定案）========== */
async function uiTapCell(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(sceneEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——locked 窗 verify 页乘 SPEED
     缩水防 40ms 漏点；对选放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(sceneEl, 'bump'); return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const fromPos = q.bunnyAt;                      /* placepos 飞入起点（引擎更新前快照） */
  const r = engTapCell(cur, i);
  if (r === null) { sfx('pop'); replayAnim(sceneEl, 'bump'); return null; }   // 越界/已答=null+pop+bump
  const el = cellEl(i);

  if (r === 'wrong') {                           /* 答错：格摇头+错链两段（wrong→hint 全 clip 无 keyless）+方向级回锚 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const parts = [VOICE.wrong.key,                              /* 错链头=wrong clip（manifest 文案） */
      VOICE.hint.key];                                           /* 语义句 clip「再看看，兔子在哪边」*/
    if (sayW(parts))
      wrongChainUntil = Date.now() + 4970;      /* 链豁免：1656+150+2856+300=4962 下界（SPEC §4 算式），
                                                   任务书 4960 为舍入口径，取 4970 覆盖契约下界（契约 I） */
    dirAnchor();                                 /* 方向级：findpos=兔子 pulse / placepos=场景 pulse（不泄格） */
    if (q._miss >= 2) {                          /* miss≥2=正确格 breathe（答案级，§0.80 家族梯度恒用） */
      const ok = cellEl(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：格亮+确认句+确认链拼播；placepos 兔子飞入/dual 兔子 pop 出现） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  if (q.kind === 'placepos') {                   /* placepos：兔子飞入目标格（引擎已更 bunnyAt=ask；
                                                   旧格移兔+目标格入兔=DOM 即时一致，格内兔隐 450ms 与飞越同步） */
    const fromCell = cellsWrapEl.querySelector('.cell[data-pos="' + fromPos + '"]');
    if (fromCell && fromCell.querySelector('.bunny')) fromCell.querySelector('.bunny').remove();
    const toCell = cellsWrapEl.querySelector('.cell[data-pos="' + q.bunnyAt + '"]');
    if (toCell && !toCell.querySelector('.bunny')) {
      const bn = document.createElement('div');
      bn.className = 'bunny';
      bn.innerHTML = bunnySvg();
      toCell.appendChild(bn);
    }
    flyBunny(fromPos, q.bunnyAt);
  }
  if (q.kind === 'dual' && el && !el.querySelector('.bunny')) {
    /* r44 dual：藏的兔子出现在答案格（pop-in 弹入=「找到啦」即验算；无飞入——无 fromPos） */
    const bn = document.createElement('div');
    bn.className = 'bunny pop-in';
    bn.innerHTML = bunnySvg();
    el.appendChild(bn);
  }
  if (cur === run) celebrateScene(q);            // 确认句文字+题面条跳+兔子按钮跳
  if (q.kind === 'flip') {
    /* r44 flip 确认链=[ps_right, ps_fy_<ask>]（教育句承载映射律；注册后实测 7002≤窗
       9000 余 1998——SPEC-R44 §R8 段二复核收口，原 est 口径 TODO 销账） */
    KIDS.voice.queue([VOICE.right.key, flipYClip(q.ask)]);
  } else {
    KIDS.voice.queue([VOICE.right.key, nameClip(q.ask),       /* 确认链：放对啦真棒+方位名音 */
      YA_KEY]);                                               /* 「呀」clip（T46 化全 clip 链；dual 名音=树约束方位） */
  }
  await wait(1600 * SPEED);                      /* 格亮+飞入/pop+确认链主窗 */
  if (cur !== run) return r;
  /* 确认链收尾窗：findpos/placepos/dual 总 5500 ≥ 2280+150+1416+150+1152+300=5448（ps_ya 实长）；
     flip 总 1600+7400=9000 ≥ 2280+150+ps_fy est 6120+300=8850（SPEC-R44 §R8） */
  await wait((q.kind === 'flip' ? 7400 : 3900) * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（场景/题面全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
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
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* ps_right：放对啦，真棒（2280ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2280+300=2580 */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.position && sv.position.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=播 ps_tut_watch「看！兔子在哪里呀」→ 播问句 ps_q1（findpos 开题链——不播名音防泄答案）
   → 幽灵手指点前面格（兔子位）→点中（确认链拼播）→帮=指向正确格；独=首次选对放手
   （watch 全程 ≤16s）
   时序（家族 G/H）：watch clip 3024ms → 问句演示延至 t=3400（≥3024+300=3324，禁撞头）；
   开题链 ps_q1 2328 → ghost 移入窗 2700 ≥ 2328+300=2628；
   演出窗 1600+3900=5500 罩确认链 2280+150+名音 max 1416+150+ps_ya 1152+300=5448 ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* ps_tut_watch：看！兔子在哪里呀（3024ms） */
  const run = cur;
  await wait(3400 * SPEED);                      /* t=3400 ≥ 3024+300=3324：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 findpos/front（教学演示锚）
  KIDS.voice.queue([VOICE.q1.key]);              /* 播开题链：兔子在树的哪里呀（2328ms） */
  const idx = correctIdx(q);
  pointGhostAt(cellEl(idx));                     /* 幽灵手指指向前面格（兔子所在格） */
  await wait(2700 * SPEED);                      /* ≥2328+300=2628：问句播完+ghost 移入停顿 */
  if (cur !== run) return;
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapCell(idx, true);      /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__psDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  await wait(300 * SPEED);                       /* 收尾（确认链仍在播，由 uiTapCell 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.position = sv.position || {};
  sv.position.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关+首题换 placepos/front 定制（SPEC §2「turn=你来放一放（placepos 前面）帮/独」——
     两族各教一次：watch 演示 findpos/turn 实操 placepos（兔子在后面，点前面格放过去）；
     turn 后 solo 接真关余题 q1-q4（findpos）；审查 P-1 修复 2026-09-11）
     placepos 开题=全句 clip ps_place_front「把兔子放到树的前面」（T46 化，原 TTS 全段退役） */
  ghost.hide();
  cur = genLevel(0);
  cur.quizzes[0] = { kind: 'placepos', ask: 'front',
                     cells: cellsOf(1).map(p => ({ pos: p })),
                     bunnyAt: 'back', answer: cellsOf(1).indexOf('front'),
                     _miss: 0, _answered: false };
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* ps_tut_turn：你来放一放（1776ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2100);                                      /* ≥1776+300=2076 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再看看，兔子在哪边 */
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
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  replayQuiz(false);                             /* 再听一遍：问句/指令全句重播 */
});
cellsWrapEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.cell');
  if (!p) return;                                // 格层空白穿透到场景（#cells pointer-events:none）
  e.preventDefault();
  uiTapCell(Number(p.dataset.i));
});
sceneEl.addEventListener('pointerdown', e => {   /* 点场景空白（树/草地）=重听题面（高发探索动作） */
  if (e.target.closest('.cell')) return;         // 格子走 cellsWrap 路径（防双触发）
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayQuiz(true);                              /* 附方向级回锚 */
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

/* ================= 无操作看护：14s 方向级（重读题面+方向级回锚，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确格 breathe）/ 教学"帮"5s 重演示 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cellEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+回锚（不动 lastAct） */
    speakQuiz();
    dirAnchor();
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
  KIDS.init({ game: 'position', title: '方位词图阵' });   // 存档键 kidsgame_position（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.PS——b29 坑⑥：verify 页独占钩子=驱动假阳性） ================= */
window.PS = {
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
    if (!q) return null;
    return { kind: q.kind,                             /* SPEC-R44 §R5 钩子契约：findpos|placepos|dual|flip */
             ask: q.ask,                               /* findpos=兔子位 / placepos=指令目标 / dual=树约束方位 / flip=兔子说的方位 */
             ask2: q.ask2 || null,                     /* dual 专属：房约束方位（其余 null） */
             house: q.house || null,                   /* dual 专属：房位 key left-down|right-down（其余 null） */
             face: q.face || null,                     /* flip 专属：'back' 背面态（其余 null） */
             cells: q.cells.map(c => ({ pos: c.pos })), /* 格 {pos}——恒 6 格域（r44 含左右） */
             bunnyAt: q.bunnyAt === undefined ? null : q.bunnyAt,  /* 兔子当前格 pos；dual=null（隐藏） */
             answer: q.answer,                         /* 目标格 cells 下标（flip=FLIP_MAP 映射格） */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapCell(i) { return uiTapCell(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选格，走真实判定链；
    let taps = 0, guard = 0;             // 演出窗内 tap=false → 等窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 120) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 600) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapCell(q.answer);
      if (r === 'right' || r === 'done') taps++;
      else if (r === 'wrong') { /* 继续重试点对（不会发生：直点 answer） */ }
      else if (guard >= 118) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
