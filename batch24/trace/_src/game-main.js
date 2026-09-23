/* ================= trace 主逻辑 r5（自推笔顺 / 选卡题面 / 描红板渲染 / 教学 / 推进 / 救援）
   玩法流（SPEC-BATCH24 §7）：题型三族——
   trace 自推笔顺：只亮起点（ends 模式另挂终点静态绿环），中间笔序孩子自己判断；
     点对=连线延伸+轻音（音高逐锚递升）；点错=错锚 shake+按错型方向反馈（跳笔=tra_w_wait/
     逆笔=期望段主轴 tra_w_down/right/up/left），不 flash 正确锚点（不泄答案），miss+1 pos 不进；
   listen 听数选字：queue(tra_l_q+tra_n_<num>) 念数 → 4 数字卡（近音/形近干扰在场）→
     选对进描红（start 模式）；选错=tra_w_pick+卡 shake（方向锚不泄答案）；
   mirror 镜像辨析：queue(tra_m_q+tra_n)「哪个是正的六」→ 4 卡=同数字 3 变体
     （scaleX(-1)/rotate180/scaleY(-1)）→ 选对进描红；选错=tra_w_mir。
   题完成=完整描红线亮起+数词朗读（tra_n_<num>）+兔子跳；关完成=celebrate+写档星级。
   窗常量（game-data WIN，四处同步）：WRONG=1000 错点/错选防重入 / PICK_RIGHT=600 选对演出窗
   （hint2 语音并发不锁）/ DONE=4100 数词链窗。
   验收钩子：window.TR = { get currentLevel, get quiz, tapAnchor(i), tapCard(i), start(flat),
                          async autoSolve(), get tutorial, get phase } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速（wait 全按 SPEED 缩放）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (v) => { if (cur && cur.flat < 3) KIDS.voice.play(v.key, v.text); };
/* 救援/教学/题面/正误核心反馈不受 flat 门限制（§0.5：不识字孩子静置零救援=不可收；
   r5 听数/镜像题面必播——不播则题不可解） */
const sayR = (v) => { if (v) KIDS.voice.play(v.key, v.text); };

const boardEl = $id('board'), rabbitEl = $id('rabbit'), bubbleEl = $id('bubble'),
      ghostNumEl = $id('ghost-num'), skeletonEl = $id('skeleton'), litEl = $id('lit'),
      demoPathEl = $id('demo-path'), ghostEl = $id('ghost'),
      cardsEl = $id('cards'), askEl = $id('ask'),
      rabbitBtn = $id('btn-rabbit'), demoBtn = $id('btn-demo');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { phase: 'play', locked: false, busy: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let rescueDirDone = false, rescueAnsDone = false;
let runId = 0;                                  // 演示令牌：startLevel/教学作废在途定时器
let arc = { total: 1, s: [0] };                 // 当前题锚点弧长表（path 采样，单调）
let anchorsEls = [];                            // 当前题锚点 button 列表

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const anchorEl = i => anchorsEls[i];
const cardEls = () => Array.prototype.slice.call(cardsEl.children);
const cardEl = i => cardEls()[i];

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  demoBtn.innerHTML = ICONS.pen;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 68);
  rabbitEl.innerHTML = KIDS.assets.rabbit('happy', 88);
  bubbleEl.innerHTML = ICONS.hand;
  askEl.innerHTML = ICONS.speaker;
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* 连线轻音：逐锚递升 do→sol 循环（第 k 锚= PENTA[k%5]；家族通道 KIDS.audio.note 马林巴） */
function anchorNote(k) {
  if (VERIFY) return;
  const f = PENTA[k % PENTA.length];
  if (!f) return;
  KIDS.audio.note(f, 1.05, 0, 0.85);
  KIDS.audio.note(f * 2, 0.4, 0.012, 0.2);
}
function flashAnchor(i) {                       // 救援方向级：锚点 pulse 0.5s（r5=已写到位的锚，不泄下一锚）
  const el = anchorEl(i);
  if (!el) return;
  replayAnim(el, 'flash');
  setTimeout(() => el.classList.remove('flash'), 540 * SPEED + 320);
}
function shakeAnchor(i) {                       // 点错：所点错锚自身 shake（可见回应不泄答案）
  const el = anchorEl(i);
  if (!el) return;
  replayAnim(el, 'shake');
  setTimeout(() => el.classList.remove('shake'), 540 * SPEED + 320);
}
function setBubble() { replayAnim(bubbleEl, 'pulse'); }   // 状态泡（零文字：小手图标=你来点）
function danceRabbit() {
  replayAnim(rabbitEl, 'dance');
  replayAnim(rabbitBtn, 'hop');
}

/* ================= 幽灵手指（教学"看/帮"/答案级救援共用） ================= */
const ghost = {
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el) {                     // 通用：指向任意元素（锚点/卡）
  if (VERIFY || !el) return;
  const r = el.getBoundingClientRect();
  ghostEl.style.left = Math.round(r.left + r.width / 2) + 'px';
  ghostEl.style.top = Math.round(r.top + r.height * 0.45) + 'px';
  ghost.show();
  setTimeout(() => ghost.press(), 700 * SPEED);
}
function pointHelpNext() {                      // 教学"帮"：自推不指下一锚——仅起点未点时指起点
  if (!cur || cur.done) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved || q.phase !== 'write' || q.pos !== 0) return;
  pointGhostAt(anchorEl(0));
}

/* ================= 描红板渲染 =================
   锚点弧长表：path 采样找每锚最近点（首锚恒 0、末锚恒全长、单调强制——多笔 path 的
   M 跳变处弧长连续，笔序天然单调）；亮线=完整 path 按弧长 dasharray 延伸 */
function computeArc(pathEl, anchors) {
  const total = pathEl.getTotalLength();
  const N = 480, pts = [];
  for (let k = 0; k <= N; k++) {
    const p = pathEl.getPointAtLength(total * k / N);
    pts.push([p.x, p.y]);
  }
  const s = [];
  let lastS = 0;
  for (let i = 0; i < anchors.length; i++) {
    let si;
    if (i === 0) si = 0;
    else if (i === anchors.length - 1) si = total;
    else {
      let best = 0, bd = Infinity;
      for (let k = 0; k <= N; k++) {
        const dx = pts[k][0] - anchors[i][0], dy = pts[k][1] - anchors[i][1];
        const d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = k; }
      }
      si = total * best / N;
    }
    if (si <= lastS) si = Math.min(lastS + 0.01, total);   // 单调强制
    lastS = si;
    s.push(si);
  }
  return { total: total, s: s };
}
function setLit(q) {                            // 亮线延伸到已点亮的末锚
  const upto = q.pos > 0 ? arc.s[q.pos - 1] : 0;
  litEl.style.strokeDasharray = upto.toFixed(2) + ' ' + (arc.total + 2).toFixed(2);
}
function litFull() {                            // 题完成：完整描红线亮起
  litEl.style.strokeDasharray = arc.total.toFixed(2) + ' 0';
  litEl.classList.remove('full'); void litEl.getBoundingClientRect();
  litEl.classList.add('full');
}
/* r5 自推锚点态（负向真值：中间锚点永不发光——verify 断言 class/animation 缺席）：
   仅起点呼吸（q.pos===0 时挂 current）；ends 模式终点静态绿环（endmark 恒挂末锚）；
   其余锚点=浅虚圆。done=已写过的绿实心。 */
function renderAnchorStates(q) {
  for (let i = 0; i < anchorsEls.length; i++) {
    const el = anchorsEls[i];
    el.classList.toggle('done', i < q.pos);
    el.classList.remove('current', 'endmark', 'flash', 'rescued', 'shake');
  }
  if (q.solved || cur.done) return;
  if (q.pos === 0) {
    const el = anchorEl(0);
    if (el) el.classList.add('current');
  }
  if (q.hintMode === 'ends') {
    const el = anchorEl(q.anchors.length - 1);
    if (el) el.classList.add('endmark');
  }
}
function anchorDoneFx(i) {                      // 点对：锚点绿实心 pop
  const el = anchorEl(i);
  if (!el) return;
  const dot = el.querySelector('.dot');
  replayAnim(dot, 'pop');
}
function renderPick(q) {                        // r5 选卡题面：卡行+问号板（底图数字不泄答案）
  cardsEl.style.display = 'flex';              // CSS 默认 none——选卡期显行
  askEl.style.display = 'flex';
  ghostNumEl.textContent = '';
  skeletonEl.setAttribute('d', '');
  litEl.setAttribute('d', '');
  litEl.classList.remove('full');
  litEl.style.strokeDasharray = '0 2';
  cardsEl.innerHTML = '';
  for (let i = 0; i < q.cards.length; i++) {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.idx = String(i);
    b.setAttribute('aria-label', '数字卡' + (i + 1));
    const g = document.createElement('span');
    const c = q.cards[i];
    let suf = '';
    if (q.kind === 'mirror') {                  // 卡 id=数字+后缀（m/r/f 变体）；listen=纯数字
      suf = String(c).slice(String(q.num).length);
      g.textContent = String(q.num);
    } else g.textContent = String(c);
    g.className = 'g' + (suf ? ' v-' + suf : '');
    b.appendChild(g);
    cardsEl.appendChild(b);
  }
}
function renderWrite(q) {                       // 描红板：底图数字+骨架+亮线+锚点
  cardsEl.style.display = 'none';
  cardsEl.innerHTML = '';                       // 清残留卡（选卡期 DOM 不留场）
  askEl.style.display = 'none';
  const d = DIGITS[q.num];
  ghostNumEl.textContent = String(q.num);
  ghostNumEl.setAttribute('font-size', q.num === 10 ? '58' : '78');
  skeletonEl.setAttribute('d', d.path);
  litEl.setAttribute('d', d.path);
  litEl.classList.remove('full');
  litEl.style.strokeDasharray = '0 ' + (arc.total + 2);
  arc = computeArc(litEl, q.anchors);
  setLit(q);
  for (let i = 0; i < q.anchors.length; i++) {
    const b = document.createElement('button');
    b.className = 'anchor';
    b.dataset.idx = String(i);
    b.setAttribute('aria-label', '第' + (i + 1) + '个点');
    b.style.left = q.anchors[i][0] + '%';
    b.style.top = q.anchors[i][1] + '%';
    b.innerHTML = '<span class="dot"></span>';
    boardEl.appendChild(b);
    anchorsEls.push(b);
  }
  renderAnchorStates(q);
}
function renderQuiz() {                         // 新题：按相位分流（pick=选卡 / write=描红板）
  const q = cur && !cur.done ? cur.quizzes[cur.step] : null;
  anchorsEls.forEach(el => el.remove());
  anchorsEls = [];
  cardsEl.classList.remove('pulse', 'bump');   // 清残留动画类（display none→flex 会重放旧动画）
  ghost.hide();
  if (!q) {
    cardsEl.style.display = 'none';
    askEl.style.display = 'none';
    return;
  }
  if (q.phase === 'pick') renderPick(q);
  else renderWrite(q);
  setBubble();
}
function renderStep() {                         // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  if (!cur) return;
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
  if (!cur) return;
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 题面语音（r5：pick 题必播题面；write 题 flat<3 提示） ================= */
function stemParts(q) {                         // 听数/镜像题面链（queue 0.15s 段间停顿）
  return [{ key: q.kind === 'listen' ? VOICE.l_q.key : VOICE.m_q.key,
            text: q.kind === 'listen' ? VOICE.l_q.text : VOICE.m_q.text },
          { key: 'tra_n_' + q.num, text: numCn(q.num) }];
}
function playCue() {
  const q = cur && !cur.done ? cur.quizzes[cur.step] : null;
  if (!q) return;
  if (q.phase === 'pick') KIDS.voice.queue(stemParts(q));   // 题面必播（听觉题不播不可解）
  else sayP(VOICE.hint2);
}

/* ================= 点锚主路径（真实点击 / TR.tapAnchor / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（描红板 bump 微动效——家族 D）；
   busy=反馈占位锁（wrong 1000ms 防重入窗（WIN.WRONG 200+800）/ right 200ms，同步置位→紧邻点击必被拦） ================= */
async function uiTapAnchor(i, demo) {
  if (!cur || state.won) {
    sfx('pop'); replayAnim(boardEl, 'bump');
    return false;
  }
  if ((state.busy && !demo) || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop'); replayAnim(boardEl, 'bump');    // 教学演示期/演出窗=吞输入
    return false;
  }
  const run = cur;
  const r0 = engTapAnchor(cur, i);
  if (r0 === null) {                            // 序号越界/题已结束/选卡期点板
    sfx('pop'); replayAnim(boardEl, 'bump');
    return false;
  }
  lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false;
  anchorsEls.forEach(el => el.classList.remove('rescued'));   // 答案级救援视觉：动作即清
  cardEls().forEach(el => el.classList.remove('rescued'));
  ghost.hide();
  if (state.tut === 'help' && !demo) {          // 教学"独"：首次真点 → 放手
    state.tut = 'solo';
    danceRabbit();
  }
  state.busy = true;

  if (r0 === 'wrong') {                         // 点错：错锚 shake+错型方向反馈；pos 不进（不重头）
    await wait(200 * SPEED);
    if (cur === run) {
      const q = cur.quizzes[cur.step];
      if (q && !q.solved) {
        shakeAnchor(i);                         /* 所点错锚自身 shake（不 flash 正确锚=不泄答案，r5 核心） */
        const wt = engWrongType(q, i);
        const v = wt.type === 'skip' ? VOICE.w_wait : VOICE['w_' + (wt.dir || 'down')];
        KIDS.voice.play(v.key, v.text);         /* 方向反馈（核心反馈不受 flat 门） */
      }
    }
    await wait(800 * SPEED);                    /* 错点防重入 200+800=1000ms=WIN.WRONG（家族定案） */
    state.busy = false;
    return 'wrong';
  }

  /* 点对：连线延伸+轻音（音高逐锚递升——点击序号=推进后 pos-1）。
     done/won 时 engTapAnchor 已 step++：题引用取**刚完成的题**（step-1），数词按题内数字取 */
  const qCur = run.quizzes[Math.min(run.step, run.quizzes.length - 1)];
  const qRef = r0 !== 'right' ? run.quizzes[run.step - 1] : qCur;
  anchorNote(qRef.pos - 1);
  anchorDoneFx(i);
  setLit(qRef);
  renderAnchorStates(qRef);
  renderStep();
  await wait(200 * SPEED);                      /* right 路径缩短防连点吞 */
  if (r0 === 'right') { state.busy = false; return 'right'; }

  if (r0 === 'done') {                          // 题完成：描红线全亮+数词朗读+兔子跳 → 下一题
    litFull();
    danceRabbit();
    KIDS.voice.queue([{ key: VOICE.right.key, text: VOICE.right.text },
                      { key: 'tra_n_' + qRef.num, text: numCn(qRef.num) }]);   /* 写好啦，真棒 + 数词 */
    await wait(WIN.DONE * SPEED);               /* 审查M1：tra_right 2280+150+tra_n_10 1248+余量——链播完再读下一题 */
    state.busy = false;
    if (cur !== run) return 'done';
    if (!demo) nextQuiz();
    return 'done';
  }
  /* won：末题完成 = 整关通关（数词照读——末题也是题） */
  litFull();
  danceRabbit();
  KIDS.voice.queue([{ key: VOICE.right.key, text: VOICE.right.text },
                    { key: 'tra_n_' + qRef.num, text: numCn(qRef.num) }]);
  state.busy = false;
  await wait(WIN.DONE * SPEED);                 /* 审查M1：末题数词链播完再进 celebrate */
  winFlow();
  return 'won';
}

/* ================= 选卡主路径（r5 新题型：真实点击 / TR.tapCard / autoSolve 共用）
   选对=WIN.PICK_RIGHT 600ms 演出窗（卡 pop+其余淡出）→ 进描红相位+hint2 并发（不锁不空等）；
   选错=卡 shake+方向锚语音（listen=tra_w_pick/mirror=tra_w_mir，不泄答案）+1000ms 防重入 ================= */
async function uiTapCard(i, demo) {
  if (!cur || state.won) {
    sfx('pop'); replayAnim(cardsEl, 'bump');
    return false;
  }
  if ((state.busy && !demo) || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop'); replayAnim(cardsEl, 'bump'); // 演出期=吞输入（卡行 bump 可见回应）
    return false;
  }
  const run = cur;
  const q0 = run.quizzes[run.step];
  if (!q0 || q0.phase !== 'pick') {
    sfx('pop'); replayAnim(cardsEl, 'bump');
    return false;
  }
  const r0 = engPickCard(run, i);
  if (r0 === null) {                            // 卡下标越界
    sfx('pop'); replayAnim(cardsEl, 'bump');
    return false;
  }
  lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false;
  anchorsEls.forEach(el => el.classList.remove('rescued'));
  cardEls().forEach(el => el.classList.remove('rescued'));
  ghost.hide();
  if (state.tut === 'help' && !demo) {
    state.tut = 'solo';
    danceRabbit();
  }
  state.busy = true;

  if (r0 === 'wrong') {                         // 选错：卡 shake+方向锚反馈；phase 不变（重选）
    await wait(200 * SPEED);
    if (cur === run) {
      const q = cur.quizzes[cur.step];
      if (q && !q.solved) {
        const el = cardEl(i);
        if (el) {
          replayAnim(el, 'shake');
          setTimeout(() => el.classList.remove('shake'), 540 * SPEED + 320);
        }
        const v = q.kind === 'listen' ? VOICE.w_pick : VOICE.w_mir;
        KIDS.voice.play(v.key, v.text);         /* 再听一遍/转一转再看看（不泄答案） */
      }
    }
    await wait(800 * SPEED);                    /* 错选防重入 200+800=1000ms=WIN.WRONG */
    state.busy = false;
    return 'wrong';
  }

  /* 选对：正确卡 ok pop+其余淡出 → PICK_RIGHT 演出窗 → 描红板（hint2 并发播不锁） */
  const el = cardEl(i);
  if (el) replayAnim(el, 'ok');
  cardEls().forEach((c, k) => { if (k !== i) c.classList.add('dim'); });
  sfx('pop');
  await wait(WIN.PICK_RIGHT * SPEED);
  state.busy = false;
  if (cur !== run) return 'right';
  if (!demo) {
    renderQuiz();                               // phase 已 'write' → 描红板
    sayR(VOICE.hint2);                          /* 从发亮的起点开始（并发不锁——窗内即可看板） */
  }
  return 'right';
}
function nextQuiz() {                           // 下一题（同关内）
  if (!cur || cur.done) return;
  runId++;                                      // 作废在途演出定时器
  state.phase = 'play'; state.locked = false; state.busy = false;
  renderStep();
  renderQuiz();
  playCue();                                    /* pick 题面必播 / write 提示 flat<3 */
}

/* ================= 笔顺演示（底栏"看笔顺"）：幽灵手指沿 path 走一遍（演示实证）
   只演不改状态；期间锁输入，结束恢复当前进度渲染；选卡期禁用（演示会泄答案数字） ================= */
async function playStrokeDemo() {
  const q0 = cur && !cur.done ? cur.quizzes[cur.step] : null;
  if (!q0 || q0.phase !== 'write' || state.won || state.demo || state.busy) {
    sfx('pop'); replayAnim(boardEl, 'bump');
    return;
  }
  const my = ++runId, run = cur;
  const q = run.quizzes[run.step];
  if (!q || q.solved) return;
  state.demo = true;
  demoPathEl.setAttribute('d', DIGITS[q.num].path);
  demoPathEl.style.display = '';
  const total = arc.total;
  demoPathEl.style.strokeDasharray = '0 ' + (total + 2);
  const t0 = Date.now(), DUR = (VERIFY ? 400 : 1600);
  const move = () => {                          // 幽灵手指沿弧长移动
    if (runId !== my || cur !== run) { demoPathEl.style.display = 'none'; ghost.hide(); return; }
    const k = Math.min(1, (Date.now() - t0) / DUR);
    const s = total * k;
    demoPathEl.style.strokeDasharray = s.toFixed(2) + ' ' + (total + 2);
    const pt = litEl.getPointAtLength(s);
    const r = boardEl.getBoundingClientRect();
    ghostEl.style.left = Math.round(r.left + r.width * pt.x / 100) + 'px';
    ghostEl.style.top = Math.round(r.top + r.height * pt.y / 100) + 'px';
    ghost.show();
    if (k < 1) requestAnimationFrame(move);
    else setTimeout(() => {                     // 收束：恢复进度渲染
      demoPathEl.style.display = 'none';
      ghost.hide();
      if (runId === my && cur === run) { state.demo = false; renderQuiz(); }
    }, 420 * SPEED);
  };
  requestAnimationFrame(move);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关章型 GEN[dch-1]（家族 F，r5 审查 m-1：
     (ci+1)%4 章序推进仅 dch 循环策略下巧合等值，防御性禁式——habitat r4 M-1 同型） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true; state.locked = true; state.phase = 'won';
  ghost.hide();
  renderStep();
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
function proceed() {                             // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);                // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  runId++;
  ghost.hide();
  cur = genLevel(flat);
  state = { phase: 'play', locked: false, busy: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false; rescueDirDone = false; rescueAnsDone = false;
  lastAct = Date.now();
  demoPathEl.style.display = 'none';
  renderStep(); renderDots();
  renderQuiz();
  if (VERIFY) return;                            // verify 页：无教学无存档
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.trace && sv.trace.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  playCue();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指逐锚点按下（数字 1 两锚点，走真实比对链）→ __trDemoR='right'；
   帮=起点未点时指起点（自推不指下一锚）；独=首次真点放手（watch 全程 ≤16s） ================= */
async function tutorialWatch() {
  const my = ++runId;
  state.demo = true; state.locked = true; state.tut = 'watch';
  setBubble();
  sayR(VOICE.watch);                             /* 看！从发亮的点开始点（r5 语义仍准确：起点发亮） */
  await wait(650 * SPEED);
  const run = cur;
  const q0 = run.quizzes[0];                     // flat0 题 0 恒数字 1（两锚点，trace/ends）
  let demoR = null;
  for (let k = 0; k < q0.anchors.length; k++) {  // 幽灵手指逐锚点复现
    if (runId !== my || cur !== run) { state.demo = false; return; }
    pointGhostAt(anchorEl(q0.pos));
    await wait(760 * SPEED);
    ghost.press();
    await wait(280 * SPEED);
    const r = await uiTapAnchor(q0.pos, true);   // demo 通道豁免锁
    if (r && !demoR) demoR = r;                  // 首锚点对='right'（gate 断言口径）
    await wait(460 * SPEED);
  }
  /* 审查M1：删演示收束语 say('写得真像')——与 queue(tra_right+tra_n) 撞头互掐 */
  window.__trDemoR = demoR;                      // 演示生效证据（§0.27，gate 断言 'right'）
  await wait(500 * SPEED);
  const sv = KIDS._save();
  sv.trace = sv.trace || {};
  sv.trace.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来连一连"在重发后的题面上说 */
  ghost.hide();
  startLevel(0);
  state.tut = 'help';
  sayP(VOICE.turn);                              /* 你来连一连（flat=0 <3） */
  setTimeout(() => {
    if (state.tut === 'help' && !ghostEl.classList.contains('show')) pointHelpNext();
  }, 500 * SPEED);
}

/* ================= 救援钟（play 后静置；verify 页由 verify 直驱函数测）
   14s 方向级=按相位分流：write=已写到位锚 pulse+hint2（不泄下一锚）/ pick=重读题面+卡行 pulse；
   30s 答案级=幽灵手指指到当前锚点位/正确卡+rescued 强化呼吸；
   双锚各自独立节流，有效动作即清（piano 结构照抄，家族 B） ================= */
function rescueDir() {
  if (!cur || cur.done) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (q.phase === 'pick') {
    replayAnim(cardsEl, 'pulse');
    KIDS.voice.queue(stemParts(q));              /* 重读题面（方向级不泄答案） */
  } else {
    flashAnchor(q.pos > 0 ? q.pos - 1 : 0);      /* 已写到的位置（pos=0 时=起点） */
    sayR(VOICE.hint2);                           /* 从发亮的起点开始，想一想下一笔 */
  }
  return true;
}
function rescueAns() {
  if (!cur || cur.done) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (q.phase === 'pick') {
    const el = cardEl(q.right);
    if (el) el.classList.add('rescued');         // 正确卡 breathe 强化
    pointGhostAt(el);                            // + 幽灵手指指到位（非 verify 页）
  } else {
    const el = anchorEl(q.pos);
    if (el) el.classList.add('rescued');         // 当前锚 breathe 强化（红光大呼吸）
    pointGhostAt(el);
  }
  return true;
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000 && !rescueAnsDone) { rescueAnsDone = true; rescueAns(); return; }
  if (idle > 14000 && !rescueDirDone) { rescueDirDone = true; rescueDir(); return; }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 底栏与输入 ================= */
function hopRabbit() { replayAnim(rabbitBtn, 'hop'); }
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || state.locked || state.demo) return;   // 教学/演出期点兔子不打断
  lastAct = Date.now();
  hopRabbit();
  if (cur && !state.won && !cur.done) {
    const q = cur.quizzes[cur.step];
    if (q && q.phase === 'pick') KIDS.voice.queue(stemParts(q));   // 重读题面
    else if (q) sayR(VOICE.hint2);
  }
});
demoBtn.addEventListener('pointerdown', e => {        // 看笔顺（当前数字重演一遍；选卡期禁用）
  e.preventDefault();
  KIDS.audio.unlock();
  lastAct = Date.now();
  replayAnim(demoBtn, 'bounce');
  playStrokeDemo();
});
askEl.addEventListener('pointerdown', e => {          // 问号板：再听一次题面（选卡期）
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || state.won || state.demo) return;
  const q = cur && !cur.done ? cur.quizzes[cur.step] : null;
  if (q && q.phase === 'pick') {
    lastAct = Date.now();
    replayAnim(askEl, 'pulse');
    KIDS.voice.queue(stemParts(q));
  }
});
cardsEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.card');
  e.preventDefault();
  KIDS.audio.unlock();
  if (!c) {                                      // 点卡行空白=吞输入轻叮+可见回应
    if (!state.won) { sfx('pop'); replayAnim(cardsEl, 'bump'); }
    return;
  }
  uiTapCard(parseInt(c.dataset.idx, 10));
});
boardEl.addEventListener('pointerdown', e => {
  const a = e.target.closest('.anchor');
  e.preventDefault();
  KIDS.audio.unlock();
  if (!a) {                                      // 点板空白=无有效目标：吞输入轻叮+可见回应
    if (!state.won) { sfx('pop'); replayAnim(boardEl, 'bump'); }
    return;
  }
  uiTapAnchor(parseInt(a.dataset.idx, 10));
});

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'trace', title: '描红数字' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })          /* 审查M1：§0.4 防跳章（家族 A） */;
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口）
   TR.quiz.anchors = 锚点序号有序数组 [0..n-1]（选卡相位=null）；tapAnchor(i) 的 i=anchors 下标；
   tapCard(i) 的 i=卡下标（quiz.cards 序）；cards：listen=数字串（'4'）/mirror=数字+变体后缀（'6m'） ================= */
window.TR = {
  start(flat) {
    startLevel(flat);
  },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.missTotal || 0, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                       /* 题型真值：'trace'|'listen'|'mirror' */
             phase: q.phase,                     /* 相位：'pick'（选卡）|'write'（描红） */
             num: q.num,                         /* 题内数字 1-10 */
             hintMode: q.hintMode,               /* 自推提示档：'ends'|'start' */
             anchors: q.phase === 'write' ? q.anchors.map((_, i) => i) : null,
             cards: q.phase === 'pick' ? q.cards.slice() : null,   /* 候选卡 id 序 */
             right: q.phase === 'pick' ? q.right : -1,             /* 正确卡下标 */
             pos: q.pos,                         /* 当前比对位 */
             step: cur.step,
             miss: q.miss };                     /* 本题失败尝试数 */
  },
  tapAnchor(i) {
    return uiTapAnchor(i);
  },
  tapCard(i) {
    return uiTapCard(i);
  },
  async autoSolve() {                    // UI 路径自动点完当前关（选卡→逐锚走真实比对链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 900) {
      if (state.busy || state.won || state.demo || state.locked) { await wait(60); continue; }
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.phase === 'pick') {
        const r = await uiTapCard(q.right);
        if (r !== false && r != null) taps++;
      } else {
        const r = await uiTapAnchor(q.pos);
        if (r !== false && r != null) taps++;
      }
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; },
  get phase() { return state.phase; }
};
