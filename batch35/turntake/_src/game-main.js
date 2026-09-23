/* ================= turntake 主逻辑（花圃渲染 / 回合状态机 / 点花判定链 / 教学 / 救援 / 推进）
   2026-09-13 难度升级改造：判定层从「找耷拉」升级为「渴度比较+排序」。
   玩法：3 盆花每回合都有渴度梯度（thirsts∈{1,2,3}——CSS 三档 t1/t2/t3 姿态+土色双通道），
   顶部双头像指示轮到谁（ch1-2 加大箭头）。
   孩子回合：ch1-2=点最渴的（ch1 档差大 {1,1,3} / ch2 档差细微 {2,2,3}）；
   ch3-4=排序浇（按最渴→最不渴依次点 3 步：中间步短确认 1400ms 无 clip，回合收口步走
   浇水演出 2900ms ≥ 确认链 right 单 clip 2472+300=2772（家族 G/H）+tt_right）；
   点非应点盆=wrong：ch1-2/纠错链 [tt_wrong, tt_hint]（找最渴）、ch3-4 排序链
   [tt_wrong, tt_order_wrong]（先浇更渴）——两链 estMs 同长 1752+150+3015+300=5217
   （新句 7 字×345+600 口径，豁免窗 5217 待主线实测回填）；方向级回锚=应点花 pulse 一轮，
   miss≥2=应点花 breathe（答案级），1000ms 防重入窗；排序错不罚退已浇。
   兔子回合=兔子走位浇水演出 1.2s（走位 500+浇水 700——缩短无效等待）；seeded 约 1/3 浇错：
   浇错开纠错回合（q._fix → quiz.turn='k'+tt_rabbit_wrong 单发+题面轻提示，孩子点 engTarget
   纠正='right' 推进不计题号）；浇对正常等待。演出期（未开纠错）点击任何花=抢点→tt_wait
   单发提醒（不拼播不设豁免窗——抢点不罚不计 miss），每兔子回合最多提醒 1 次，重复抢点
   只 sfx pop+容器 bump 轻吞家族 D。
   救援：14s 方向级=重播章内提示+应点花 pulse（lastDir 独立节流锚）；30s 答案级=应点花
   breathe+重播。教学：watch（渴度圈注+幽灵手指点最渴的一盆→等兔子浇一盆，突出
   「轮到兔子时手收回等待」）→turn 你来浇一浇（帮→独）。
   验收钩子：window.TT = { get currentLevel, get quiz(){ turn, thirsty[3](渴度数组,已浇=0),
     target(当前应点盆=未浇最渴者), step(全关题号=孩子回合序——b33 坑①), miss, turnIdx,
     rabbitWrong(兔子本回合是否浇错) }, tapFlower(i), start(flat),
     async autoSolve(), get tutorial }（getter 返回拷贝；真实页同暴露——b29 坑⑥）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径；
                                               // 本款全 clip 无 keyless 段——estMs 供语音窗静态对账备用，家族 T）
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

const sceneEl = $id('scene'), flowersEl = $id('flowers'), bgSvgEl = $id('bg-svg'),
      qbarEl = $id('qbar'), qTextEl = qbarEl.querySelector('.q-text'),
      turnBarEl = $id('turn-bar'), arrowEl = $id('turn-arrow'),
      whoK = document.querySelector('.who-k'), whoR = document.querySelector('.who-r'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');
const qText = t => { qTextEl.textContent = t; };

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', watering: false, rabbit: false };
let perfRun = 0;                                // 演出代 token（重玩/换关中止在途演出）
let firstFlat = 0;                              // 启动首关（教学迷你关完成后回跳）
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const flowerEl = i => flowersEl.querySelector('.flower[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  bgSvgEl.innerHTML = SCENE_INNER;              // 花园背景（g[data-scene="garden"] 契约 M 锚）
  arrowEl.innerHTML = '<svg viewBox="0 0 44 38" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M17 0 h10 v14 h9 L22 36 L8 14 h9 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/></svg>';
  whoK.querySelector('.avatar').innerHTML = KID_AVATAR;
  whoR.querySelector('.avatar').innerHTML = KIDS.assets.rabbit('happy', 60);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 / 喷水=带通噪声（喷水音=Web Audio
   合成，SPEC §1 定版——非 clip；verify 页 stub 且 ctx null 双保险下静默） */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const spraySfx = () => {
  if (VERIFY) return;
  const c = KIDS.audio.ctx;
  if (!c || !c.createBufferSource) return;
  try {
    const dur = 0.7, len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.8;
    const g = c.createGain(); g.gain.value = 0.16 * (KIDS.audio._vol ? KIDS.audio._vol() : 0.6);
    src.connect(f); f.connect(g); g.connect(c.destination); src.start();
  } catch (e) {}
};

/* ================= 渲染 ================= */
function renderStep() {                          // HUD 本关 5 题进度点（孩子回合序）
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
/* 花圃层（3 盆花恒全摆）+ 渴度梯度态（每盆 t1/t2/t3 姿态+土色类——已浇盆去类复原；
   .drop 三盆都渴都挂（不单独标答案——判定材料=梯度本身，契约 M 演出层锚）；
   教学演示期另挂 .tbadge 渴度圈注（thirst 枚小水滴=1/2/3，教「比一比谁最渴」） */
function renderFlowers(q) {
  flowersEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const th = q.watered[i] ? 0 : q.thirsts[i];
    const b = document.createElement('button');
    b.className = 'flower pop-in' + (th ? ' t' + th : '');
    b.dataset.i = i;                              // 帧内容锚（契约 M：渲染即引擎对账）
    b.setAttribute('aria-label', '第' + (i + 1) + '盆花');
    b.innerHTML = flowerSvg(i);
    if (th) {
      const d = document.createElement('div');
      d.className = 'drop';
      d.innerHTML = DROP_SVG;
      b.appendChild(d);
      if (state.demo) {                           // 教学渴度圈注（仅演示期）
        const tb = document.createElement('div');
        tb.className = 'tbadge';
        for (let k = 0; k < th; k++) tb.appendChild(document.createElement('i'));
        b.appendChild(tb);
      }
    }
    b.style.animationDelay = (i * 70) + 'ms';
    flowersEl.appendChild(b);
  }
}
/* 解渴一盆（孩子点中/兔子浇水共用）：去渴度类+摘水滴与圈注+花开动效 */
function relievePot(i) {
  const el = flowerEl(i);
  if (!el) return;
  el.classList.remove('t1', 't2', 't3');
  const d = el.querySelector('.drop'); if (d) d.remove();
  const tb = el.querySelector('.tbadge'); if (tb) tb.remove();
  replayAnim(el, 'watered');
}
/* 有效回合方（纠错回合 q._fix 视孩子方——quiz.turn 同口径） */
const effSide = q => !q ? 'r' : ((q.turn === 'k' || q._fix) ? 'k' : 'r');
/* 轮到指示（双头像亮灯恒在；大箭头 ch1-2 指向当前方，ch3-4 隐去——降坡定版） */
function renderTurnUI() {
  const q = cur.turns[cur.turnIdx];
  if (!q) return;
  const side = effSide(q);
  whoK.classList.toggle('active', side === 'k');
  whoR.classList.toggle('active', side === 'r');
  turnBarEl.classList.toggle('no-arrow', cur.dch >= 3);
  arrowEl.classList.toggle('at-k', side === 'k');
  arrowEl.classList.toggle('at-r', side === 'r');
  renderFlowers(q);
  renderStep();
}
/* 方向级视觉回锚（错反馈/重听/救援共用）：应点花（未浇最渴者）pulse 一轮（定版） */
function dirAnchor() {
  const q = cur && cur.turns[cur.turnIdx];
  if (!q || effSide(q) !== 'k') return;
  const th = flowerEl(engTarget(cur));
  if (th) replayAnim(th, 'pulse');
}

/* ================= 浇水演出（孩子/兔子共用）：水壶倾斜+水滴挂目标花上方 ================= */
function waterAnim(i) {
  const w = document.createElement('div');
  w.className = 'can-wrap';
  w.innerHTML = CAN_SVG + '<i></i><i></i><i></i><i></i>';
  w.style.left = ((i + 0.5) / 3 * 100) + '%';
  sceneEl.appendChild(w);
  setTimeout(() => w.remove(), 1400 * SPEED + 60);
}
/* 兔子走位浇水（演出 1.2s=走位 500+浇水 700——缩短无效等待，2026-09-13 改造定版；
   verify 页乘 SPEED 缩短） */
function bunnyShow(i) {
  let g = sceneEl.querySelector('.bunny-g');
  if (!g) {
    g = document.createElement('div');
    g.className = 'bunny-g';
    g.innerHTML = '<div class="bsvg">' + KIDS.assets.rabbit('happy', 120) + '</div>' +
                  '<div class="mini-can">' + CAN_SVG + '</div>';
    sceneEl.appendChild(g);
  }
  g.style.left = '100%';                          // 从场外右侧入场
  void g.offsetWidth;
  g.style.left = (6 + i * 31) + '%';              // 走到浇水位（浇对=最渴花/浇错=非最渴花）
  g.classList.remove('show', 'hop'); void g.offsetWidth;
  g.classList.add('show', 'hop');
}
function bunnyHide() {
  const g = sceneEl.querySelector('.bunny-g');
  if (g) g.classList.remove('show');
}
async function rabbitWater(q) {
  const token = perfRun;
  bunnyShow(q.rabbitPos);                         // 兔子走向浇水位（seeded 对/错）
  await wait(500 * SPEED);                        // 走位（1.2s 演出前半）
  if (token !== perfRun) { bunnyHide(); return; }
  spraySfx();                                     // 喷水音=Web Audio 合成（非 clip）
  waterAnim(q.rabbitPos);
  q.watered[q.rabbitPos] = true;                  // 引擎态同步：被浇盆记已浇（quiz.thirsty 报 0）
  relievePot(q.rabbitPos);                        // 被浇盆解渴（浇错=非最渴盆被解——等孩子纠正）
  await wait(700 * SPEED);                        // 浇水（合计 1200ms）
  if (token !== perfRun) { bunnyHide(); return; }
  bunnyHide();
}

/* ================= 回合流（从当前回合推进：R=兔子演出连演（浇错开纠错回合）/ K=备题开放点选） ================= */
async function flowFrom() {
  const run = cur, token = perfRun;
  while (cur === run && token === perfRun && !run.done && !state.won) {
    const q = run.turns[run.turnIdx];
    if (!q) return;
    if (q.turn === 'r') {
      state.rabbit = true;                        // 兔子演出期（此期点击=抢点）
      renderTurnUI();
      qText(RABBIT_TEXT);
      await rabbitWater(q);
      if (cur !== run || token !== perfRun) return;
      state.rabbit = false;
      if (q.rabbitWrong) {                        // 兔子浇错→开纠错回合（turn 报 'k'，不计题号）
        q._fix = true;
        renderTurnUI();                           // 亮灯切孩子+箭头（ch1-2）
        qText(RABBIT_WRONG_TEXT);                 /* 题面轻提示「小兔子浇错啦，帮帮它」 */
        KIDS.voice.play(VOICE.rabbitWrong.key, VOICE.rabbitWrong.text);   /* tt_rabbit_wrong 单发不拼播（同 tt_wait 口径） */
        hopRabbit();
        lastAct = Date.now();                     /* 纠错回合开放重置 idle 锚 */
        lastDir = Date.now();
        return;                                   // 等孩子点正确盆纠正
      }
      engAdvance(run);
      if (run.done) { winFlow(); return; }        // ch3-4 尾随 R 回合在此收口通关
      continue;                                   // 连 2 R（dch≥3 域）继续演
    }
    renderTurnUI();                               // 孩子回合：备题（渴度梯度渲染+亮灯）
    if (run.dch <= 2) {                           /* ch1-2=点最渴的；ch3-4=排序浇（题面分派） */
      qText(PROMPT_TEXT);
      if (!VERIFY && !state.demo) sayR(VOICE.hint.key, VOICE.hint.text);   // 开题读题
    } else {
      qText(ORDER_PROMPT_TEXT);
      if (!VERIFY && !state.demo) sayR(VOICE.orderHint.key, VOICE.orderHint.text);
    }
    lastAct = Date.now();                         /* 备题开放重置 idle 锚（b25 M4） */
    lastDir = Date.now();
    return;
  }
}

/* ================= 点花主路径（真实点击 / TT.tapFlower / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（场景容器 bump 微动效——家族 D）；
   浇水演出期 null（SPEC §1）；兔子演出期 'wait'/重复抢点 false；错点 1000ms 防重入窗 ========== */
async function uiTapFlower(i, demo) {
  if (!cur || state.won || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(sceneEl, 'bump');
    return false;
  }
  if (cur.done) return null;
  const q = cur.turns[cur.turnIdx];
  if (!q) return null;
  if (q.turn === 'r' && !q._fix && !demo) {       /* 兔子演出期抢点（不罚不计 miss；_fix=已开纠错走应点路径） */
    if (!q._waitSaid) {
      q._waitSaid = true;                         /* 每兔子回合最多提醒 1 次 */
      KIDS.voice.play(VOICE.wait.key, VOICE.wait.text);   /* tt_wait 单发不拼播（SPEC §4，不设豁免窗） */
      qText(WAIT_TEXT);
      hopRabbit();
      return 'wait';
    }
    sfx('pop'); replayAnim(sceneEl, 'bump');      /* 同回合重复抢点=false 轻吞（家族 D） */
    return false;
  }
  if (!demo && state.watering) return null;       // 浇水演出期 null（SPEC §1 定版）
  if (!demo && state.locked) { sfx('pop'); replayAnim(sceneEl, 'bump'); return false; }   // 错窗防重入
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     对选放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== engTarget(cur)) {
    sfx('pop'); replayAnim(sceneEl, 'bump'); return false;
  }
  const run = cur, token = perfRun;               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapFlower(cur, i);
  if (r === null) { sfx('pop'); replayAnim(sceneEl, 'bump'); return null; }   // 越界
  const el = flowerEl(i);

  if (r === 'wrong') {                            /* 答错：花摇头+错链两段+方向级回锚（应点花 pulse） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const order = run.dch >= 3 && !q._fix;        /* 排序题中错=顺序反馈；ch1-2/纠错错=找最渴反馈 */
    qText(order ? ORDER_WRONG_TEXT : WRONG_TEXT);
    const parts = [VOICE.wrong.key,               /* 错链头=wrong clip「这盆不渴哦」（manifest 文案） */
                   order ? VOICE.orderWrong.key : VOICE.hint.key];   /* 语义句尾：先浇更渴/找最渴——全 clip 无 keyless */
    if (sayW(parts))
      wrongChainUntil = Date.now() + 5217;        /* 链豁免：1752+150+estMs(7 字 3015)+300=5217（新句 estMs 口径，待主线实测回填，契约 I） */
    dirAnchor();                                  /* 方向级=应点花 pulse 一轮（定版） */
    if (q._miss >= 2) {                           /* miss≥2=应点花 breathe（答案级梯度） */
      const th = flowerEl(engTarget(cur));
      if (th) replayAnim(th, 'breathe');
    }
    await wait(1000 * SPEED);                     /* 错点防重入窗 1000ms；对选可打断链；救援由豁免窗让路 */
    if (cur !== run || token !== perfRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（浇水演出：回合收口步=完整窗+确认链 / 排序中间步=短确认 1400 无 clip） ---- */
  const advanced = q._answered;                   /* engTapFlower 已收口本回合（排序中间步=false） */
  lastAct = Date.now();                           /* 正确选择重置救援钟（§0.7a） */
  lastDir = Date.now();
  if (state.tut === 'help') {                     /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__ttTutSolo = true;                    /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.watering = true;                          // 浇水演出期（此期 tapFlower=null）
  relievePot(i);
  chimeGoal();
  spraySfx();
  waterAnim(i);
  if (advanced) {                                 /* 回合收口：完整演出窗+确认链（家族 G/H） */
    qText(RIGHT_TEXT);
    KIDS.voice.queue([VOICE.right.key]);          /* 确认链=right 单 clip（SPEC §4：2472 → 窗 ≥2772） */
    await wait(1500 * SPEED);                     /* 浇水演出主窗（水壶倾斜+水滴+花开） */
    if (cur !== run || token !== perfRun) return r;
    await wait(1400 * SPEED);                     /* 收尾窗：总 2900 ≥ 2472+300=2772（家族 G/H） */
    if (cur !== run || token !== perfRun) return r;
  } else {
    await wait(1400 * SPEED);                     /* 排序中间步短确认（无 clip 无链窗——题内节奏） */
    if (cur !== run || token !== perfRun) return r;
  }
  state.watering = false;
  if (cur.flat < 0) {                             /* 教学迷你关完成：帮→独后进正式关 */
    if (state.tut === 'solo') startLevel(firstFlat);
    return r;
  }
  if (cur.done) { winFlow(); return r; }          // 本次点击收口末回合=通关（含纠错收口）
  if (advanced) flowFrom();                       // 下一回合（R=兔子演出 / K=新题）——中间步不重备题
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_turntake） ================= */
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
  perfRun++;                                     /* 通关中止在途演出 */
  ghost.hide();
  bunnyHide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* tt_right：浇对啦，花开咯（2472ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2472+300=2772 */
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
  bunnyHide();
  perfRun++;                                     /* 中止在途演出（重玩/换关） */
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', watering: false, rabbit: false };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderStep(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.turntake && sv.turntake.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  flowFrom();                                    // 备题/兔子演出（verify 页同跑——autoSolve 需其推进）
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   迷你关 turns=[K(0),R(1),K(2)]（渴度三元组定版，相邻 argmax 互异；兔子恒浇对）：
   watch=看你浇 1 盆（幽灵手指+渴度圈注 tbadge 教「比一比谁最渴」→点最渴盆→__ttDemoR）→
   等兔子浇 1 盆（手收回等待：ghost 隐去+指示灯切兔子+演出 1.2s）→turn=你来浇一浇（帮→独），
   末回合点中='done' 且帮已转独 → startLevel(firstFlat) 进正式关。
   时序（家族 G/H）：watch clip 新句 9 字 estMs 3705 → 延 4100（≥3705+300，estMs 口径待主线
   实测回填）；浇水演出窗 2900（罩 right 单链 2472+300=2772）；兔子演出 1200；
   turn clip 1776 → 延 2100（≥1776+300 防尾截）后读题。 ---------- */
function tutWatchLevel() {
  const mk = (turn, thirsts) => ({ turn: turn, thirsts: thirsts, watered: [false, false, false],
    rabbitWrong: false, rabbitPos: argmaxOf(thirsts),
    _miss: 0, _waitSaid: false, _answered: false, _fix: false, _taps: 0 });
  return { flat: -1, ch: 0, dch: 1, lv: 0,
           turns: [mk('k', [1, 1, 3]), mk('r', [1, 3, 1]), mk('k', [3, 1, 1])],   // 教学渴度（argmax 2/1/0 互异）
           turnIdx: 0, step: 0, retries: 0, done: false };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  perfRun++;
  state = { locked: false, won: false, demo: true, tut: 'watch', watering: false, rabbit: false };
  cur = tutWatchLevel();
  renderStep(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* tt_tut_watch：看！给最渴的花浇水（新句 9 字 estMs 3705） */
  await wait(4100 * SPEED);                      /* t=4100 ≥ 3705+300=4005：clip 播完再演（estMs 口径，待主线实测回填） */
  if (state.tut !== 'watch') return;
  /* —— 看你浇一盆（demo 孩子回合：渴度圈注+幽灵手指点最渴盆） —— */
  const q0 = cur.turns[0];
  renderTurnUI();                                // 孩子亮灯+大箭头（教学 dch=1）+三盆渴度梯度+圈注
  qText('轮到你啦，比一比谁最渴');
  pointGhostAt(flowerEl(engTarget(cur)));        /* 幽灵手指指向最渴盆（教学期泄答案=家族先例） */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapFlower(engTarget(cur), true);   /* demo 通道豁免 demo 门（演示吞真实输入） */
  window.__ttDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  /* —— 等兔子浇一盆（demo 兔子回合：手收回等待=ghost 隐去+亮灯切兔子+演出 1.2s） —— */
  ghost.hide();
  const q1 = cur.turns[1];
  state.rabbit = true;
  renderTurnUI();
  qText('轮到小兔子啦，手收好等一等');
  window.__ttDemoWait = { ghostHidden: !ghostEl.classList.contains('show'), turn: q1.turn };
  await rabbitWater(q1);
  if (state.tut !== 'watch') return;
  state.rabbit = false;
  engAdvance(cur);
  window.__ttWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  /* —— turn 你来浇一浇（帮→独）：末回合点中即迷你关通关 → startLevel(firstFlat) —— */
  const sv = KIDS._save() || {};
  sv.turntake = sv.turntake || {};
  sv.turntake.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  state = { locked: false, won: false, demo: false, tut: 'help', watering: false, rabbit: false };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderTurnUI(); renderStep();
  qText(PROMPT_TEXT);
  sayR(VOICE.turn.key, VOICE.turn.text);         /* tt_tut_turn：你来浇一浇（1776ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.turns[cur.turnIdx] && cur.turns[cur.turnIdx].turn === 'k')
      sayR(VOICE.hint.key, VOICE.hint.text);     /* 开题读题（最渴花提示句） */
  }, 2100);                                      /* ≥1776+300=2076 防尾截（turn 后读题延） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
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
/* 教学"帮"阶段指向：当前回合应点盆（未浇最渴者） */
function pointHelpNext() {
  const q = cur && cur.turns[cur.turnIdx];
  if (!q || effSide(q) !== 'k') return;
  pointGhostAt(flowerEl(engTarget(cur)));
}
/* 章内提示句（重听/戳兔子/点空白/救援共用）：ch1-2+纠错=找最渴 / ch3-4 排序=按序浇 */
const hintOf = () => (cur && cur.dch >= 3 &&
  !(cur.turns[cur.turnIdx] && cur.turns[cur.turnIdx]._fix)) ? VOICE.orderHint : VOICE.hint;

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.watering || state.rabbit || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(hintOf().key, hintOf().text);             /* 戳兔子=方向提示：章内提示句（找最渴/按序浇） */
  dirAnchor();
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || cur.flat < 0) return;    /* 教学迷你关禁重演（重发=破坏教学时序） */
  if (state.locked || state.watering || state.rabbit || state.demo || state.won) return;   /* §0.20 演出/教学期重演门 */
  lastAct = Date.now();
  replayAnim(replayBtn, 'bounce');
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || cur.flat < 0) return;
  if (state.locked || state.watering || state.rabbit || state.demo || state.won) { sfx('pop'); return; }
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  sayR(hintOf().key, hintOf().text);             /* 再听一遍：开题提示句重播（章内分派） */
  dirAnchor();
});
flowersEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.flower');
  if (!p) return;                                // 花层空白穿透到场景（重听路径）
  e.preventDefault();
  uiTapFlower(Number(p.dataset.i));
});
sceneEl.addEventListener('pointerdown', e => {   /* 点场景空白（草地/天空）=重听题面（高发探索动作） */
  if (e.target.closest('.flower')) return;       // 花点击已由 flowersEl 路径处理（防双触发）
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.watering || state.rabbit || state.demo || state.won) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  sayR(hintOf().key, hintOf().text);
  dirAnchor();
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.flower') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.watering || state.rabbit || state.demo || state.won) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(hintOf().key, hintOf().text);           /* 空白探索=方向提示（章内分派） */
  }
});

/* ================= 无操作看护：14s 方向级（重播章内提示+应点花 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（应点花 breathe+重播）/
   教学"帮"5s 重演示（仅孩子有效回合；兔子演出期/浇水演出期不救援） ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.watering || state.rabbit || state.demo) return;
  if (cur.flat < 0) return;                      /* 教学迷你关不救援（帮 5s 重演示单独处理） */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const q = cur.turns[cur.turnIdx];
  if (!q || effSide(q) !== 'k') return;          /* 兔子演出期不救援（演出自动推进；纠错回合可救） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const th = flowerEl(engTarget(cur));
    if (th) replayAnim(th, 'breathe');
    sayR(hintOf().key, hintOf().text);
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播提示+回锚（不动 lastAct） */
    sayR(hintOf().key, hintOf().text);
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
  KIDS.init({ game: 'turntake', title: '轮流浇花' });   // 存档键 kidsgame_turntake（core VER 1.0，家族 C）
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
   真实页同暴露 window.TT——b29 坑⑥：verify 页独占钩子=驱动假阳性）。
   tapFlower 返回：孩子有效回合（题面/纠错）点中应点盆 'right'（排序中间步同）/收口末回合
   'done'；点非应点盆 'wrong'；兔子演出期（未开纠错）'wait'（首抢=提醒，同回合重复抢点
   false）；浇水演出期 null；越界/已结束 null。
   quiz={ turn('k'|'r' 有效回合方——纠错回合报 'k'), thirsty[3](渴度数组，已浇盆=0),
   target(当前应点盆下标=未浇最渴者——verify 独立 argmax 复核), step(全关题号=孩子题收口序,
   纠错不计), miss(本回合), turnIdx, rabbitWrong(兔子本回合是否浇错——浇错时纠错目标=target) }。
   step=全关题号=孩子回合序 0-4（b33 坑①：题号语义，非花进度）================= */
window.TT = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.turns.length,
             kTurns: cur.turns.filter(t => t.turn === 'k').length,
             rTurns: cur.turns.filter(t => t.turn === 'r').length,
             turnIdx: cur.turnIdx, step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.turns[cur.turnIdx];
    if (!q) return null;
    const thirsty = [0, 1, 2].map(k => q.watered[k] ? 0 : q.thirsts[k]);   /* 已浇盆渴度视 0 */
    return { turn: effSide(q),                       /* 钩子契约：'k'|'r' 有效回合方（纠错报 'k'） */
             thirsty: thirsty,                       /* 3 盆渴度数组 [t0,t1,t2]（未浇=1-3/已浇=0） */
             target: engTarget(cur),                 /* 当前应点盆（verify 独立 argmax 对账） */
             step: cur.step,                         /* 全关题号=孩子题收口序（纠错不计） */
             miss: q._miss || 0,
             turnIdx: cur.turnIdx,                   /* 回合指针 0..len-1 */
             rabbitWrong: q.turn === 'r' || q._fix ? !!q.rabbitWrong : false };   /* 兔子浇错标记 */
  },
  tapFlower(i) { return uiTapFlower(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐回合等有效孩子回合点应点盆——
    let taps = 0, guard = 0;             // 排序题 3 步/纠错 1 步都走真实判定链；兔子演出自动推进只等待）
    while (cur && !cur.done && guard++ < 900) {             // 演出窗吞 null→300ms 间隔重试（b34 坑④）
      let wg = 0;
      while (wg++ < 8000) {
        if (!cur || cur.done) break;
        const q = cur.turns[cur.turnIdx];
        if (q && (q.turn === 'k' || q._fix) && !state.locked && !state.watering &&
            !state.rabbit && !state.demo && !state.won) break;
        await wait(50);
      }
      if (!cur || cur.done) break;
      const q = cur.turns[cur.turnIdx];
      if (!q || (q.turn !== 'k' && !q._fix)) continue;
      const r = await uiTapFlower(engTarget(cur));
      if (r === 'right' || r === 'done') taps++;
      else await wait(300);              /* 演出窗吞 null/false→300ms 间隔重试（b34 坑④无间隔瞬间烧尽） */
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
