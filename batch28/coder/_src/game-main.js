/* ================= coder 主逻辑（题面渲染 / 指令卡点选 / 走格动画 / 教学 / 救援 / 推进）
   r40（SPEC-R40-CODER）：ch1-2 3×3 走 2/3 步；ch3 起 4×4 大草地 run dist 4/5；
   path 预测 seq 2（ch3 lv0-1）/3（ch3 lv2+/ch4），seq3 候选 4 格；run 池 ≥5 张卡排紧凑档。
   玩法：题面 = 草地网格（3×3/4×4：小兔 / 萝卜 / 石头 SVG）+ 题面句；run 题 = 方向指令卡
   （箭头+汉字，点一张小兔走一格），path 题 = 指令条按序 2-3 步箭头 + 3-4 格候选卡。
   run：到达萝卜即 right（殊途同达合法——交换律路径教育上正确）；撞石/出界 = 该卡吞
   （卡灰飞 + 小兔朝向顶一下 + 「往这边走不过去哦」TTS 拼句，不记 miss=探索豁免）；
   卡池点完未到达 = wrong + miss + 复位（小兔回起点、卡池全恢复）。
   path：点对格 = right（确认句 TTS）；点错 = wig + queue 链 [cod_wrong clip,
   「再想想，先走第一步看看」TTS]，1000ms 防重入窗后可重选（探索不罚）。
   救援两级（§0.67/家族 B 定版）：14s 方向级=重读题面 + 题面卡 pulse（lastDir 独立节流锚，
   不重置 lastAct）；30s 答案级=应点卡 breathe + 重读（run 应点卡=solveNext DFS 实算）。
   主动读题（startLevel/hear/点题面）重置 lastAct idle 锚（b25 M4）；救援自读不重置防自喂。
   语音窗（家族 G/H/I，clip 实长 SPEC-BATCH28 §4 量化 + R40 §R4）：
   cod_tut_watch 3504 → 教学演示 tap 延至 t=900+3000=3900（≥3504+300，禁撞头）；
   cod_tut_turn 1848 → turn 后读题延 2200（≥1848+300 防尾截）；
   确认句 clip 最长 cod_demo 2832 → 判对演出窗 1800+3600=5400 ≥2832+300（错→对路径同延防掐尾）；
   cod_right 2424 → winFlow celebrate(2620)+wait(400)=3020 ≥2424+300=2724（判对后窗）；
   cod_wrong 2568 + 引导链（run 四段 8418）→ 错链豁免窗 wrongChainUntil=8800（≥8418+300，家族 I）；
   撞石豁免句 cod_g_block 2280 → wrongChainUntil=3700 让路救援；
   path 读题 seq2 7 段链 11244+1000 ≤14000 方向级救援间隔（无掐尾，fire-and-forget）；
   path 读题 seq3 9 段链 14136（Σ段 12936+150×8）>14000 → r40 新增 readChainUntil=14600
     豁免守卫（家族 I 同构：speakQuiz 起 seq3 链时设窗，rescueTick 让路至链播完——
     救援延迟不饿死，1s 轮询链后即触发；seq2 不挂窗）；run 读题=cod_q clip 2400。
   验收钩子：window.CD = { get currentLevel, get quiz(){kind,g,grid{start,goal,stones[]},
   pool[]{dir,used}, seq[], opts[]{r,c}, answer, step, miss}, tapCard(i), start(flat),
   async autoSolve(), get tutorial }——tapCard 返回值族：moved/right/done/wrong/false(撞石卡吞)/
   null(越界或演出窗)，全 async（走格动画+判定链）；getter 返回拷贝 */
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
let readChainUntil = 0;                          /* seq3 读题链豁免窗终点（r40：9 段链 14136>14000 救援间隔，
                                                   家族 I 同构让路；seq2 链 11244 挂 14000 内不设窗） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* m2（审查 2026-09-10）：节流未播返回 false——豁免窗仅起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), boardEl = $id('board'),
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
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（run=clip cod_q；path=TTS 拼句豁免 clip 化——SPEC §1；
   verify 页 stub 记 __lastVoiceKey/__lastSay） ================= */
function speakQuiz() {
  if (!cur || !cur.quizzes[cur.step]) return;
  const q = cur.quizzes[cur.step];
  if (q.kind === 'run') KIDS.voice.play(VOICE.q.key, VOICE.q.text);   /* 「帮小兔子走到萝卜」 */
  else {                                       /* T46 阶段2：path 读题变长链 clip 化（全键在册，r40 seq3=9 段） */
    KIDS.voice.queue(pathKeys(q));
    if (q.seq.length === 3)                    /* r40：seq3 链 14136 > 14000 救援间隔 → 设读链豁免窗
                                                  （14600 ≥ Σ12936+150×8+300=14436，build/verify 双静态对账） */
      readChainUntil = Date.now() + 14600;
  }
}

/* ================= 渲染 ================= */
/* 小兔定位（网格内绝对定位，left/top 按格心——transition .35s 即走格动画；
   r40：g×g 通用（ch3 起 4×4——cw=(gw−gap·(g−1))/g） */
function placeBun(pos, g) {
  const bun = sceneEl.querySelector('.bun'), gridEl = sceneEl.querySelector('.grid');
  if (!bun || !gridEl) return;
  const gw = gridEl.clientWidth, gap = 7, gn = g || 3;
  const cw = (gw - gap * (gn - 1)) / gn, bs = bun.offsetWidth || 86;
  bun.style.left = (pos.c * (cw + gap) + (cw - bs) / 2) + 'px';
  bun.style.top = (pos.r * (cw + gap) + (cw - bs) / 2) + 'px';
}
/* 撞石/出界：小兔朝该方向顶一下弹回（视觉解释「过不去」） */
function nudgeBun(dir) {
  const bun = sceneEl.querySelector('.bun');
  if (!bun) return;
  ['nudge-up', 'nudge-down', 'nudge-left', 'nudge-right'].forEach(c => bun.classList.remove(c));
  void bun.offsetWidth;
  bun.classList.add('nudge-' + dir);
}
/* run 到达演出：小兔连跳 + 萝卜摇摆放大（k=格索引 r·g+c——r40 双网格） */
function reachFx(q) {
  const bun = sceneEl.querySelector('.bun');
  if (bun) bun.classList.add('reach');
  const cells = sceneEl.querySelectorAll('.cell');
  const k = q.goal.r * q.g + q.goal.c;
  const carrot = cells[k] && cells[k].querySelector('svg');
  if (carrot) carrot.classList.add('carrot-lit');
}
/* path 点对演出：小兔走到落点格 + 落点格点亮 */
function pathFx(q) {
  placeBun(q.goal, q.g);
  const cells = sceneEl.querySelectorAll('.cell');
  const k = q.goal.r * q.g + q.goal.c;
  if (cells[k]) cells[k].classList.add('goal-cell');
  const bun = sceneEl.querySelector('.bun');
  if (bun) bun.classList.add('reach');
}
function renderScene(q) {                        // 题面：题面句条 +（path 指令条）+ g×g 网格（r40：3|4）
  sceneEl.dataset.kind = q.kind;
  sceneEl.setAttribute('aria-label', quizText(q) + '，点我再听一遍');
  let h = '<div class="q-text">' + quizText(q) + '</div>';
  if (q.kind === 'path') {                       // 指令序列按序展示（卡面箭头顺序 + 语音念；seq 2-3 步）
    h += '<div class="seq-strip">' + q.seq.map((d, k) =>
      '<div class="seq-card" style="animation-delay:' + (k * 90) + 'ms">' + arrowSvg(d) +
      '<span class="seq-no">' + (k + 1) + '</span></div>').join('') + '</div>';
  }
  h += '<div class="grid' + (q.g === 4 ? ' g4' : '') + '">';
  for (let r = 0; r < q.g; r++) for (let c = 0; c < q.g; c++) {
    const p = { r: r, c: c };
    const isS = isStone(q.stones, p);
    const isG = q.kind === 'run' && samePos(p, q.goal);   // path 题落点不画萝卜（那是答案）
    h += '<div class="cell' + (isS ? ' stone' : '') + (isG ? ' goal-cell' : '') + '" data-r="' + r + '" data-c="' + c + '">' +
         (isS ? stoneSvg() : (isG ? carrotSvg() : '')) + '</div>';
  }
  h += '</div>';
  sceneEl.innerHTML = h;
  const gridEl = sceneEl.querySelector('.grid');
  const bun = document.createElement('div');
  bun.className = 'bun';
  bun.innerHTML = KIDS.assets.rabbit('normal', 76);
  gridEl.appendChild(bun);
  placeBun(q.walked || q.start, q.g);
}
function renderBoard(q) {                        // run=方向指令卡（箭头+汉字）/ path=3-4 格候选卡
  boardEl.innerHTML = '';
  const n = q.kind === 'run' ? q.pool.length : q.opts.length;
  /* r40：run 池 ≥5 张（dch3 池 5 / dch4 池 5-6）挂 many 紧凑档（6×80+5×14=550≤640 单行） */
  boardEl.classList.toggle('many', q.kind === 'run' && q.pool.length >= 5);
  for (let i = 0; i < n; i++) {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.style.animationDelay = (i * 70) + 'ms';
    if (q.kind === 'run') {
      const d = q.pool[i].dir;
      b.dataset.dir = d;                         // verify 对账（渲染即引擎）
      b.setAttribute('aria-label', '往' + DIRS[d].n + '走指令卡');
      b.innerHTML = '<span class="arrow">' + arrowSvg(d) + '</span>' +
                    '<span class="d-label">' + DIRS[d].n + '</span>';
    } else {
      const o = q.opts[i];
      b.dataset.r = o.r; b.dataset.c = o.c;      // verify 对账（渲染即引擎）
      b.setAttribute('aria-label', '第' + (o.r + 1) + '行第' + (o.c + 1) + '列候选格卡');
      b.innerHTML = '<span class="mini' + (q.g === 4 ? ' m4' : '') + '">' + miniGridHtml(o, q.g) + '</span>' +
                    '<span class="g-label">走到这格</span>';
    }
    boardEl.appendChild(b);
  }
}
function renderQuiz(speak) {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
  if (speak !== false && !VERIFY && !state.demo && !state.quiet) speakQuiz();  /* 开场/换题读题 */
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
/* 教学"帮"阶段指向：当前题应点卡（run=solveNext DFS 实算下一步；path=正确格） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / CD.tapCard / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）：演出窗/越界/已用卡=null+pop+bump；
   错点 1000ms 防重入窗（b16 定案禁偏离）========== */
async function uiTapCard(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return null;                                 // 演出窗/教学演示期吞点=null（钩子契约）
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCard(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界下标/已用卡
  const el = cardEl(i);

  if (r === 'false') {                           /* 撞石/出界：该卡吞+小兔顶一下+探索豁免句（不记 miss） */
    if (el) { el.classList.remove('pop'); el.classList.add('spent'); }
    nudgeBun(q.pool[i].dir);
    sfx('pop');
    replayAnim(boardEl, 'bump');
    KIDS.voice.play('cod_g_block', GUIDE.block); /* T46 阶段2：撞石豁免句 clip 化（2280） */
    wrongChainUntil = Date.now() + 3700;         /* 探索反馈豁免 ≥2280+300（救援让路，家族 I 同守卫） */
    return r;
  }

  if (r === 'moved') {                           /* run 合法一步未到达：走格动画+落定窗 */
    state.locked = true;
    if (el) { el.classList.remove('pop'); el.classList.add('used-up'); }
    placeBun(q.walked, q.g);
    await wait(520 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  if (r === 'wrong') {                           /* run 卡尽未到达（引擎已复位）/path 点错格 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key].concat(guideKeys(q))))   /* T46 阶段2 拼播链：cod_wrong+引导段组全键化（m2：仅链起播时设窗） */
      wrongChainUntil = Date.now() + 8800;       /* 链豁免（家族 I）：2568+150+gw1 3072+150+d 1224+150+gw2 1104+300=8718 */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    if (q.kind === 'run') renderQuiz(false);     /* run 复位重渲染：小兔回起点+卡池全恢复（不读题） */
    state.locked = false;
    return r;
  }

  /* ---- right·done（run 到达萝卜 / path 点对格：演出+确认句 TTS） ---- */
  lastAct = Date.now();                          /* 正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  if (q.kind === 'run') { placeBun(q.walked, q.g); reachFx(q); }  /* 走到萝卜格+连跳+萝卜摇摆 */
  else pathFx(q);                                                /* path：小兔走到落点格点亮 */
  chimeGoal();
  sfx('coin');
  KIDS.voice.play(demo ? 'cod_demo' : confirmKeyOf(q),            /* T46 阶段2：demo 机制句/确认句 clip 化 */
                 demo ? '点箭头，小兔子就走' : confirmText(q));   /* 教学 demo=机制句；正常=确认句（实长 ≤2832 ≤ 窗 5400-300） */
  if (demo) window.__cdDemoV = 'cod_demo';           /* demo 键实证（verify ⑤ 断言——turn 句会覆写 __lastVoiceKey） */
  await wait(1800 * SPEED);                      /* 走格+演出+确认句主窗 */
  if (cur !== run) return r;
  await wait(3600 * SPEED);                      /* 确认句收尾窗：总 5400 ≥ 确认句 clip 实长上界 2832（cod_demo，
                                                    T46 clip 化后实长口径——estMs 估算口径随 clip 化退役，r40 审查 m5 勘正）；
                                                    错→对路径读题延 5400 防错反馈链掐在 <500ms */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（网格/卡全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
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
  sayR(VOICE.right.key, VOICE.right.text);       /* cod_right：走到啦，真聪明（2424ms） */
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
  lastWrongVoice = 0; wrongChainUntil = 0; readChainUntil = 0;   /* 换关重置错反馈节流锚与链豁免（家族 I/J 配套；r40 读链窗同列） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.coder && sv.coder.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点「上」卡 → 小兔走一格到萝卜（flat0 题0 恒 start(1,1)→goal(0,1)
   卡池=[上]——确定性锚点；演示句「点箭头，小兔子就走」）；帮=指向应点卡；独=首次选对放手
   时序（家族 G/H）：watch clip 3504ms → 演示 tap 延至 t=900+3000=3900（≥3504+300），
   确认机制句不与 watch 撞头；演示演出窗 5400 罩机制句 TTS 再收束 turn（全程 ≤16s） */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* cod_tut_watch：看！小兔子要去找萝卜（3504ms） */
  await wait(900 * SPEED);                       /* 网格+小兔+萝卜亮相 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 pool=[up]（→点「上」卡）
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));
  await wait(3000 * SPEED);                      /* t=3900 ≥ watch 3504+300=3804：clip 播完再演示（不撞头） */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapCard(idx, true);      /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__cdDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);                       /* 收尾（机制句 TTS 仍在播，由 uiTapCard 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.coder = sv.coder || {};
  sv.coder.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来指一指"在重发后的题面上说（照 batch5-27） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* cod_tut_turn：你来指一指（1848ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2200);                                      /* ≥1848+300 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：想想先往哪边走 */
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
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapCard(Number(p.dataset.i));
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

/* ================= 无操作看护（命名函数 rescueTick——verify 源码级断言用）：
   14s 方向级（重读题面+题面卡 pulse，lastDir 独立节流锚，不重置 lastAct——30s 答案级
   不被饿死）/ 30s 答案级（应点卡 breathe + 重读）/ 教学"帮"5s 重演示；
   错反馈链豁免窗守卫在顶部（家族 I：链播完前救援不掐断，不挡主动点选） ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil || Date.now() < readChainUntil) return;   /* 错反馈链豁免窗（家族 I）+
                                                   r40 seq3 读题链豁免窗（14136>14000 救援间隔）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板遮挡期救援静默（家族 K：层在时点击全吞却每 14-18s 重播读题=「一直在念题点什么都没反应」） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+题面卡 pulse（不动 lastAct） */
    speakQuiz();
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
  KIDS.init({ game: 'coder', title: '指令小兔' });   // 存档键 kidsgame_coder（core VER 1.0，家族 C：带 v:'1.0'）
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
   CD.quiz：run→pool=[{dir,used}...] / seq=[] / opts=[] / answer=-1（答案=动态路径非单卡）；
   path→seq=[dir,dir] / opts=[{r,c}×3] / answer=正确格下标；grid 两题型统一
   {start,goal,stones[]}（path 的 goal=seq 落点——渲染不画萝卜） ================= */
window.CD = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             g: cur.g || 3, step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                                  /* 'run' | 'path'（SPEC §1 钩子契约） */
             g: q.g || 3,                                   /* r40：网格档 3|4（渲染即引擎对账） */
             grid: { start: { r: q.start.r, c: q.start.c },
                     goal: { r: q.goal.r, c: q.goal.c },
                     stones: q.stones.map(s => ({ r: s.r, c: s.c })) },
             pool: q.kind === 'run' ? q.pool.map(c => ({ dir: c.dir, used: !!c.used })) : [],
             seq: q.kind === 'path' ? q.seq.slice() : [],
             opts: q.kind === 'path' ? q.opts.map(o => ({ r: o.r, c: o.c })) : [],
             answer: q.kind === 'path' ? q.answer : -1,
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（run 逐步点 solveNext 应点卡，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;                          // run 撞石死局（真实用户 wrong 复位兜底）
      const r = await uiTapCard(i);
      if (r === null || r === false) break;      // 锁死/重玩保护（'false' 字符串≠false 布尔）
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
