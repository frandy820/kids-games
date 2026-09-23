/* ================= datacollect 主逻辑 r14（场景/图表渲染 / 点格·点卡判定 / 教学 / 救援 / 推进）
   玩法：草地场景（动物成对布点——一格=2 只视觉锚）+ 图表（图例徽章+行 15 格槽；
   dch4 每类双条带：上次=淡格静态 lit=scene1/2，这次=交互）。
   count 题：点问句行「这次」条带格逐格点亮（叮+动物小图 pop——按群计数），点满
     answer/2 格 → settle 900ms 待决窗 → 自动判对；窗内超点 1 格=瞬间判错（错格闪红
     熄灭、已点保留、判错不清零）；点亮格再点=熄灭撤回（不罚）。
   数值题（sum/diff/mostdiff/change/totalchange）：4 选 1 数值卡单发判定（读表计算，
     对=right+确认链，错=wig+miss 可重点不灰化）。
   开题链（契约 N，全 clip）：count=[名音,dc_q_count] /
     sum·diff·mostdiff=[名音,名音,dc_q_sum|dc_q_diff] / change=[名音,dc_q_change_up|dn] /
     totalchange=[dc_q_total_up|dn]。
   确认链（家族 G/H 动态窗 1600+confirmTailMs——窗=链实长+300 恒 ≥ 链；T46 化全 clip）：
     count·change=[dc_right,名音,dc_n_<N>（/骨架 dc_s_duo|shao）] /
     其余=[dc_right,dc_s_yg|xc（/duo|shao）,dc_n_<N>]（数词+骨架段在册拼播）；
   错链 = [dc_wrong,dc_hint] 1800+150+1896+300=4146（契约 I 静态豁免窗，r14 不变）。
   救援：14s 方向级=重读题面+（count=场景该类逐只 pulse/数值题=图表 bump 回锚）；
   30s 答案级=count 前 answer/2 格 breathe / 数值题=正确卡 breathe。
   验收钩子：window.DC = { get currentLevel, get quiz{kind,scene,scene1,ask,answer,
     options,answerIdx,grid,step,miss}, get labels(行序类目 id), tapCell(i), tapCard(i),
     start(flat), dcStartNumeric(flat)(探针面), async autoSolve(), get tutorial }。
   quiz.step 语义=全关题号 0-4（b33 坑①：题号，非格进度）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.08 : 1;               // verify 页内 UI 演出提速（unit3 须 UI 全驱 20 关×5 题≈100 题；
                                                // 0.08 收敛确认链窗保 gate G1 120s 时限——错链豁免窗/错反馈节流走真时钟不受影响，窗口语义不变仅时间缩放）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* estMs/NUMCN/confirmText/confirmTailMs 等常量均在 game-data.js 定义（r14 单源——禁此处重复声明） */
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：错链全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), chartEl = $id('chart'), cardsEl = $id('cards'),
      qbarEl = $id('qbar'), rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastChartReplay = 0;                        // 点图表/草地重听节流（6s——防重播覆盖儿童自数，b31 P1）
let helpRedemo = false;

/* ---------- 竖屏双通道（body.port 类通道与 @media 逐条等值——head 两段同步；verify simView 用类通道） ---------- */
const portMQ = window.matchMedia ? window.matchMedia('(orientation:portrait)') : null;
function applyPort() {
  document.body.classList.toggle('port',
    !!(portMQ ? portMQ.matches : window.innerHeight > window.innerWidth));
}
applyPort();
if (portMQ && portMQ.addEventListener) portMQ.addEventListener('change', applyPort);
else window.addEventListener('resize', applyPort);

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const rowEl = cat => chartEl.querySelector('.row[data-cat="' + cat + '"]');
const cellEl = (cat, i) => i < 0 ? null
  : chartEl.querySelector('.row[data-cat="' + cat + '"] .band.cur .cell[data-i="' + i + '"]');
const cardEl = i => i < 0 ? null : cardsEl.querySelector('.ncard[data-i="' + i + '"]');
const unlocked = async () => {                  // 等演出窗/教学演示结束（verify 提速后 ≤1s）
  let wg = 0;
  while ((state.locked || state.demo) && wg++ < 900) await wait(50);
  return !(state.locked || state.demo);
};

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 / 场景点动物=轻嗒（数数辅助）
   点亮计数「叮」=单音 ding（无 clip——stub 发声时计数入 __dcDing 供 verify 对账） */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const tickSfx = () => { if (!VERIFY) KIDS.audio.note(1318.5, 0.07, 0, 0.26); };
const ding = () => {
  window.__dcDing = (window.__dcDing || 0) + 1;
  if (!VERIFY) KIDS.audio.note(1046.5, 0.14, 0, 0.5);
};

/* ================= 题面语音（开题链；契约 N：全 clip 前缀 + keyless TTS 恒链尾）
   count=[名音,dc_q_count] / sum·diff·mostdiff=[名音,名音,dc_q_sum|dc_q_diff] /
   change=[名音,dc_q_change_up|dn] / totalchange=[dc_q_total_up|dn]。
   读题异步不占 UI 等待窗 ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'count') KIDS.voice.queue([nameClip(q.ask), VOICE.qCount.key]);
  else if (q.kind === 'sum')
    KIDS.voice.queue([nameClip(q.ask[0]), nameClip(q.ask[1]), VOICE.qSum.key]);
  else if (q.kind === 'diff' || q.kind === 'mostdiff')
    KIDS.voice.queue([nameClip(q.ask[0]), nameClip(q.ask[1]), VOICE.qDiff.key]);
  else if (q.kind === 'change')
    KIDS.voice.queue([nameClip(q.ask), q.up ? VOICE.qUp.key : VOICE.qDn.key]);
  else KIDS.voice.queue([q.up ? VOICE.tUp.key : VOICE.tDn.key]);
}
/* 确认链（家族 G/H 动态窗）：count·change 含名音；尾段=T46 化数词+骨架 clip 拼播
   （numSegs：count=[dc_n_N]/change=[dc_s_duo|shao,dc_n_N]/sum·diff=[dc_s_yg|xc,dc_n_N]/
   totalchange=[dc_s_yg,dc_s_duo|shao,dc_n_N]——全段在册，零 keyless） */
function confirmParts(q) {
  if (q.kind === 'count' || q.kind === 'change')
    return [VOICE.right.key, nameClip(q.ask)].concat(numSegs(q));
  return [VOICE.right.key].concat(numSegs(q));
}
/* 重听路径（hear/图表/草地共用）：重播开题链+方向级回锚 */
function replayQuiz(withAnchor) {
  if (!cur || !cur.quizzes[cur.step]) return;
  speakQuiz();
  if (withAnchor) {
    const q = cur.quizzes[cur.step];
    if (q.kind === 'count') pulseSceneClass(q.ask);   /* 场景该类逐只 pulse（数数回锚） */
    else replayAnim(chartEl, 'bump');                 /* 数值题：图表回锚（读表重看） */
  }
}
/* 方向级回锚：图表容器 bump */
const pulseChartAll = () => replayAnim(chartEl, 'bump');
/* 场景某类动物逐只 pulse（每只错峰 90ms——数数节律；错反馈方向级/救援/重听共用） */
function pulseSceneClass(cat) {
  if (!cat) return;
  Array.from(sceneEl.querySelectorAll('.beast[data-cat="' + cat + '"]')).forEach((b, k) => {
    b.classList.remove('pulse'); void b.offsetWidth;
    b.style.animationDelay = (k * 90) + 'ms';
    b.classList.add('pulse');
  });
}
/* 答案级线索（miss≥2 / 30s 救援）：count=该行前 answer/2 格虚线框 breathe（告诉数到几格） */
function breatheAnswerCells(q) {
  if (!q || q.kind !== 'count') return;
  for (let i = 0; i < countSteps(q); i++) {
    const el = cellEl(q.ask, i);
    if (el) el.classList.add('breathe');
  }
}
/* 答案级线索：数值题=正确卡 breathe（值不标——位置线索） */
function breatheAnswerCard(q) {
  if (!q || q.kind === 'count' || !q.options) return;
  const el = cardEl(q.answerIdx);
  if (el) el.classList.add('breathe');
}

/* ================= 渲染 ================= */
function renderScene(L) {                        // 草地：草丛装饰 + 动物成对布点（data-cat=契约 M 锚）
  const tuft = (x, y, w) =>
    '<svg class="tuft" style="left:' + x + '%;top:' + y + '%;width:' + w + 'px" viewBox="0 0 34 26" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M4 26 Q6 12 2 6 Q10 10 10 26 M12 26 Q13 6 9 2 Q18 8 16 26 M22 26 Q24 10 20 5 Q29 11 26 26" stroke="#A8C489" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>';
  const tufts = [[8, 84], [30, 93], [55, 86], [78, 94], [92, 82], [18, 96], [66, 96]]
    .map(p => tuft(p[0], p[1], 30)).join('');
  const beasts = L.place.map((p, i) => {
    const w = Math.round(p.w * p.s);             // 对内第一只=全尺寸 / 第二只=0.86 翻面（成对可辨）
    return '<div class="beast" data-cat="' + p.c + '" data-pi="' + i + '" aria-hidden="true" style="left:' + p.x + '%;top:' + p.y + '%;width:' + w + 'px">' +
      '<span class="' + (p.f ? 'flip' : '') + '">' + catSvg(p.c, w) + '</span></div>';
  });
  sceneEl.innerHTML = tufts + beasts.join('');
}
/* 图例徽章句（r14 换算教学锚——verify 字面断言锚） */
const LEGEND_TEXT = '1格=2只';
function renderChart() {                         // 图表：图例徽章 + 行（div 标签+条带；dch4 双条带）
  const q = cur.quizzes[cur.step];
  const kind = q ? q.kind : 'count';
  chartEl.className = kind;                      // count|sum|diff|mostdiff|change|totalchange 交互域切换
  chartEl.dataset.kind = kind;                   // 帧内容锚（契约 M：verify 断言）
  const legend = '<div class="legend" aria-label="一格代表两只"><span class="lg-mini">' +
    catSvg(cur.cats[0], 24) + '</span>' + LEGEND_TEXT + '</div>';
  const dual = !!cur.scene1;                     // dch4 两次调查：每类双条带
  const rows = cur.cats.map((c, i) => {
    const lit = cur.rowsLit[c] || [];
    let cells = '';
    for (let ci = 0; ci < CELLS; ci++) {
      const on = lit.indexOf(ci) >= 0;
      cells += '<button class="cell' + (on ? ' lit' : '') + '" data-i="' + ci + '" aria-label="' +
        (on ? nameOf(c) + '一格' : '空格') + '">' +
        (on ? '<span class="mini">' + catSvg(c, 30) + '</span>' : '') + '</button>';
    }
    let oldCells = '';
    if (dual) {                                  // 上次条带=静态淡格 lit=scene1/SCALE（不进 rowsLit）
      const n1 = Math.max(1, cur.scene1[c] / SCALE);
      for (let ci = 0; ci < n1; ci++) oldCells += '<div class="cell softlit" aria-hidden="true"></div>';
    }
    const isAsk = q && q.kind === 'count' && q.ask === c;
    const bandHtml =
      (dual ? '<div class="band old"><div class="btag">上次</div><div class="cells">' + oldCells + '</div></div>' : '') +
      '<div class="band cur">' + (dual ? '<div class="btag">这次</div>' : '') +
      '<div class="cells">' + cells + '</div></div>';
    return '<div class="row' + (isAsk ? ' ask' : '') + '" data-idx="' + i + '" data-cat="' + c + '" data-v="' + cur.values[i] + '">' +
      '<div class="rlabel" data-row="' + i + '" aria-label="' + nameOf(c) + '行">' +
      catSvg(c, 30) + '<span class="rn">' + nameOf(c) + '</span>' + (isAsk ? '<span class="askq">？</span>' : '') +
      '</div><div class="bands">' + bandHtml + '</div></div>';
  });
  chartEl.setAttribute('aria-label', '统计表格，一格代表两只，' + cur.cats.map(nameOf).join('、'));
  chartEl.innerHTML = legend + rows.join('');
}
function renderCards(q) {                        // 数值卡区（数值题 4 选 1；count 题隐藏）
  if (!q || q.kind === 'count' || !q.options) {
    cardsEl.classList.remove('show');
    cardsEl.innerHTML = '';
    return;
  }
  cardsEl.innerHTML = q.options.map((v, i) =>
    '<button class="ncard" data-i="' + i + '" data-v="' + v + '" aria-label="' + NUMCN[v] + '">' + v + '</button>').join('');
  cardsEl.classList.add('show');
}
const quizText = q => q.kind === 'count' ? nameOf(q.ask) + '有几只呀？'
  : q.kind === 'sum' ? nameOf(q.ask[0]) + nameOf(q.ask[1]) + '一共几只呀？'
  : (q.kind === 'diff' || q.kind === 'mostdiff') ? nameOf(q.ask[0]) + nameOf(q.ask[1]) + '相差几只呀？'
  : q.kind === 'change' ? nameOf(q.ask) + (q.up ? '比第一次多了几只？' : '比第一次少了几只？')
  : (q.up ? '一共多了几只呀？' : '一共少了几只呀？');
function renderQbar(q) {                         // 题面句条（7-8 岁文字题面）
  const t = qbarEl.querySelector('.q-text');
  t.textContent = quizText(q);
  replayAnim(qbarEl, 'pop');
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
  renderChart();
  renderCards(q);
  renderQbar(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 开题读题（教学演示期静默）
}

/* ================= 答对演出：count/change=场景该类 pulse + 小兔子跳；数值题=图表 bump+跳
   （确认链由 uiSettleRight/uiTapCard 播；verify 页跳过装饰直接落定） ================= */
function celebrateScene(cat) {
  if (cat) pulseSceneClass(cat);
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
/* 教学"帮"阶段指向：当前 count 题下一个应点格（顺序点亮路径） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || q.kind !== 'count') return;
  const lit = cur.rowsLit[q.ask];
  pointGhostAt(cellEl(q.ask, Math.min(lit.length, countSteps(q) - 1)));
}

/* ================= settle：点满 answer/2 格自动判定（SPEC §0.84「点满自动判定 vs 超点瞬间判错」
   融合机制：末格点亮后 900ms 待决窗——窗内再点 1 格=瞬间判错（错格熄灭保留已点）；
   窗内无超点=自动判对推进。窗后（判错链窗后）重挂 settle（已点满防死锁）。 ========== */
let settleTimer = null, settleQ = null;
function armSettle(q) {
  clearSettle();
  settleQ = q;
  settleTimer = setTimeout(uiSettleRight, 900 * SPEED);
}
function clearSettle() {
  if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
  settleQ = null;
}
/* 判错后重挂 settle：错链豁免窗（真时钟）结束后再让 1500ms（窗后二错仍可达——verify 契约 I 补
   对账窗），若已点满 n 格且题未换→自动判对兜底（儿童判错后已点保留但无从再点满——
   不重挂即死锁，救援钟兜底过慢） */
function rearmSettleAfterChain(run, q) {
  const delay = Math.max(0, wrongChainUntil - Date.now()) + 1500;
  setTimeout(() => {
    if (!run || cur !== run || !q || q._answered) return;
    if (cur.quizzes[cur.step] !== q || q.kind !== 'count') return;
    if (cur.rowsLit[q.ask] && cur.rowsLit[q.ask].length === countSteps(q)) armSettle(q);
  }, delay);
}
async function uiSettleRight() {
  settleTimer = null;
  const run = cur, q = settleQ;
  settleQ = null;
  if (!run || !q || q._answered) return;
  if (run.quizzes[run.step] !== q || q.kind !== 'count') return;
  if (run.rowsLit[q.ask].length !== countSteps(q)) return;   /* 撤回已降格——不判 */
  const r = engSettle(run);
  if (!r) return;
  if (state.demo) window.__dcDemoR = r;                    /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  if (state.tut === 'help') { state.tut = 'solo'; ghost.hide(); hopRabbit(); }   /* 教学"独"：首次做对放手 */
  lastAct = Date.now();                                    /* 判对重置救援钟（§0.7a） */
  state.locked = true;
  chimeGoal();
  sfx('coin');
  celebrateScene(q.ask);
  KIDS.voice.queue(confirmParts(q));                       /* 确认链（家族 G/H 动态窗） */
  await wait(1600 * SPEED);                                /* 场景 pulse+格亮+确认链主窗 */
  if (cur !== run) return;
  await wait(confirmTailMs(q) * SPEED);                    /* 确认链收尾动态窗：1600+tail ≥ 链实长+300 */
  if (cur !== run) return;
  state.locked = false;
  if (r === 'done') { winFlow(); return; }
  renderQuiz();                                            /* 新题（图表累积，仅问句行清空）+读题 */
}

/* ================= 点格主路径（真实点击 / DC.tapCell / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（图表容器 bump 微动效——家族 D）；
   豁免窗 guard：超点吞/点亮撤回放行/窗后超点照计 miss（契约 I 补）========== */
async function uiTapCell(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(chartEl, 'bump');
    return null;                                           /* 演出/教学演示期吞输入 */
  }
  const q = cur.quizzes[cur.step];
  if (!q || q._answered || q.kind !== 'count') {
    sfx('pop'); replayAnim(chartEl, 'bump'); return null;  /* 数值题期点格=null */
  }
  if (!Number.isInteger(i) || i < 0 || i >= CELLS) {
    sfx('pop'); replayAnim(chartEl, 'bump'); return null;  /* 越界 */
  }
  const lit = cur.rowsLit[q.ask];
  const exceed = lit.indexOf(i) < 0 && lit.length >= countSteps(q);
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && exceed) {
    sfx('pop'); replayAnim(chartEl, 'bump'); return false; /* 豁免窗内超点吞（对选/撤回放行） */
  }
  const run = cur;                                         /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCell(cur, i);
  const el = cellEl(q.ask, i);

  if (r === 'off') {                                       /* 撤回：熄灭（探索不罚，不计 miss） */
    clearSettle();                                         /* 撤回降格=取消待决 settle */
    if (el) { el.classList.remove('lit', 'breathe'); el.innerHTML = ''; }
    sfx('pop');
    lastAct = Date.now();
    return 'off';
  }
  if (r === 'lit') {                                       /* 点亮即按群计数：「叮」+动物小图 pop */
    lastAct = Date.now();
    ding();
    if (el) {
      el.classList.remove('breathe');
      el.classList.add('lit');
      el.innerHTML = '<span class="mini">' + catSvg(q.ask, 30) + '</span>';
    }
    if (cur === run && cur.rowsLit[q.ask].length === countSteps(q)) armSettle(q);   /* 点满→settle 自动判定 */
    return 'lit';                                          /* 立即返回（不等 settle） */
  }
  if (r === 'wrong') {                                     /* 超点第 n+1 格：瞬间判错（判错不清零） */
    state.locked = true;
    clearSettle();
    if (el) {
      el.classList.remove('breathe');
      replayAnim(el, 'bad');                               /* 错格闪红熄灭（不点亮） */
    }
    dodgeLo();
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))
      wrongChainUntil = Date.now() + 4146;                 /* 错链豁免窗=wrong 1800+150+hint 1896+300=4146（契约 I 静态） */
    pulseSceneClass(q.ask);                                /* 方向级：场景该类逐只 pulse（重数辅助非泄数） */
    if (q._miss >= 2) breatheAnswerCells(q);               /* 答案级（miss≥2）：answer/2 格虚线框 breathe */
    await wait(1000 * SPEED);                              /* 错点防重入窗 1000ms；救援由豁免窗让路 */
    if (cur !== run) return r;
    state.locked = false;
    rearmSettleAfterChain(run, q);                         /* 链窗后重挂 settle（已点满防死锁） */
    return r;
  }
  sfx('pop'); replayAnim(chartEl, 'bump'); return null;
}

/* ================= 点数值卡主路径（sum/diff/mostdiff/change/totalchange 单发判定；count 期=null）========== */
async function uiTapCard(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop'); replayAnim(chartEl, 'bump'); return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q._answered || q.kind === 'count' || !q.options) {
    sfx('pop'); replayAnim(chartEl, 'bump'); return null;  /* count 期点卡=null */
  }
  if (!Number.isInteger(i) || i < 0 || i >= q.options.length) {
    sfx('pop'); replayAnim(chartEl, 'bump'); return null;  /* 越界 */
  }
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answerIdx) {
    sfx('pop'); replayAnim(chartEl, 'bump'); return false; /* 豁免窗内错卡吞/对选放行（契约 I 补） */
  }
  const run = cur;
  const r = engTapCard(cur, i);
  const el = cardEl(i);

  if (r === 'wrong') {                                     /* 点错卡：摇头+错链+方向级读表回锚（不灰化可重点） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))
      wrongChainUntil = Date.now() + 4146;
    if (q._miss >= 2) breatheAnswerCard(q);                /* 答案级：正确卡 breathe */
    else pulseChartAll();                                  /* 方向级：图表回锚（不泄答案） */
    await wait(1000 * SPEED);                              /* 错点防重入窗 1000ms */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right/done：卡亮+确认链（家族 G/H 动态窗） ---- */
  lastAct = Date.now();
  if (state.tut === 'help') { state.tut = 'solo'; ghost.hide(); hopRabbit(); }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  celebrateScene(null);                                    /* 数值题：图表回锚+小兔子跳 */
  KIDS.voice.queue(confirmParts(q));
  await wait(1600 * SPEED);                                /* 主演出窗 */
  if (cur !== run) return r;
  await wait(confirmTailMs(q) * SPEED);                    /* 确认链收尾动态窗（count·change 名音链最长 6468） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return r; }
  renderQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁章序取模推进形态） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  clearSettle();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* dc_right：做对啦，真聪明（2448ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2448+300=2748 */
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
  clearSettle();
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderScene(cur); renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.datacollect && sv.datacollect.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→你来数→帮/独
   看=播 dc_tut_watch「看！数一数做表格」→ 播题面链（名音+q_count）→ 幽灵手指先指场景
   兔子（逐只 pulse 视觉数数）再移到图表行 →逐格点亮 4 格（叮+pop，rabbit 8→4 格）
   → settle 自动判对（确认链拼播，__dcDemoR='right'）——demo 真实消耗 q0，天然进位 q1；
   turn=dc_tut_turn「你来数一数」+ 读题链前置 dc_scale「一格代表两只」（r14 换算教学锚）
   + q1（小鸡 10 只，SPEC §3-r14 定版）帮（幽灵手指指下一应点格）/独（首次做对放手）。
   watch 时序（家族 G/H，真实页名义预算 ≤16s）：watch 3264 → 延 3600（≥3264+300）；
   题面链（名音 1368+150+q_count 1752=3270）与场景逐只 pulse 800+1800 并行；
   ghost 移图表行 900+收尾垫 200（800+1800+900+200=3700 ≥ 3270+300 覆盖）；逐格演示 4×480（每格 160+120+200——r14 审查 m-3 勘正：原注 4×600 系笔误，build 分账同口径 1920）；
   settle 900+ 确认链演出窗 5800（1600+4200 ≥ 兔链 2448+150+1368+150+1290+300=5706）
   = 3600+3700+4×480+900+5800=15920 ≤ 16000 ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* dc_tut_watch：看！数一数做表格（3264ms） */
  const run = cur;
  await wait(3600 * SPEED);                      /* t=3600 ≥ 3264+300=3564：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 q0 锚：rabbit 8（教学演示锚，4 格）
  KIDS.voice.queue([nameClip(q.ask), VOICE.qCount.key]);   /* 播题面链：兔子，有几只呀（≤3270ms） */
  pulseSceneClass(q.ask);                        /* 场景兔子逐只 pulse（视觉数数锚，与题面并行） */
  await wait(800 * SPEED);                       /* pulse 起步窗（题面在播） */
  if (cur !== run) return;
  await wait(1800 * SPEED);                      /* 4 对兔 pulse 节律收束 */
  if (cur !== run) return;
  if (!VERIFY) { ghost.toEl(cellEl(q.ask, 0)); ghost.show(); }   /* 移到该行首格（0.8s CSS 过渡） */
  await wait(900 * SPEED);                       /* ghost 移动窗 */
  if (cur !== run) return;
  await wait(200 * SPEED);                       /* 题面链收尾垫（800+1800+900+200=3700 ≥ 3270+300 防撞尾） */
  if (cur !== run) return;
  for (let k = 0; k < countSteps(q); k++) {      /* 逐格点亮演示（叮+动物小图 pop——按群计数） */
    if (!VERIFY) ghost.toEl(cellEl(q.ask, k));
    await wait(160 * SPEED);
    if (cur !== run) return;
    ghost.press();
    await wait(120 * SPEED);
    if (cur !== run) return;
    const r = await uiTapCell(k, true);          /* demo 通道豁免 locked 门（演示吞真实输入） */
    if (r !== 'lit') break;
    await wait(200 * SPEED);
    if (cur !== run) return;
  }
  /* 末格已挂 settle → 等自动判对（真实流程）+ 确认链演出窗收束 */
  let wg = 0;
  while (cur === run && cur.step === 0 && wg++ < 900) await wait(Math.max(2, 20 * SPEED));   /* 轮询粒度随 SPEED 缩放 */
  wg = 0;
  while (state.locked && wg++ < 900) await wait(Math.max(2, 20 * SPEED));
  const sv = KIDS._save() || {};
  sv.datacollect = sv.datacollect || {};
  sv.datacollect.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn 段：你来数一数（q1=小鸡 10 只）——demo 已消耗 q0，天然进位无需重发（照家族 b5-33）；
     turn 后读题链前置 dc_scale「一格代表两只」（r14 换算教学锚——SPEC §3-r14：
     教学 turn 段+图例锚双通道；链全 clip 无 keyless） */
  ghost.hide();
  state.demo = false; state.locked = false; state.tut = 'help'; state.quiet = false;
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz();                                  /* q1 渲染（小鸡行待点亮 5 格） */
  sayR(VOICE.turn.key, VOICE.turn.text);         /* dc_tut_turn：你来数一数（1896ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) {
      KIDS.voice.queue([VOICE.scale.key, nameClip(cur.quizzes[cur.step].ask), VOICE.qCount.key]);
    }                                            /* ≥1896+300=2196 防尾截：scale 2208+名音 1368+q_count 1752 */
  }, 2200 * SPEED);
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再数一数呀 */
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
  replayQuiz(true);                              /* 再听一遍：题面链重播+方向级回锚 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 场景：点动物=单只蹦一下（数数辅助）；点草地=重听 */
  e.preventDefault();
  if (VERIFY || !cur) return;
  const b = e.target.closest('.beast');
  if (b) {
    lastAct = Date.now();                        /* 数数辅助=主动活动（重置救援钟） */
    replayAnim(b, 'tick');
    tickSfx();
    return;
  }
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  lastAct = Date.now();
  if (Date.now() - lastChartReplay < 6000) return;   /* 6s 节流：不重播覆盖儿童自数 */
  lastChartReplay = Date.now();
  replayQuiz(true);
});
chartEl.addEventListener('pointerdown', e => {
  const cell = e.target.closest('.band.cur .cell');
  if (!cell) return;                             // 图表空白/静态条带走 stage 空白路径
  e.preventDefault();
  if (VERIFY || !cur) return;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'count') {
    const row = cell.closest('.row');
    if (row && row.dataset.cat === q.ask) { uiTapCell(Number(cell.dataset.i)); return; }
  }
  /* 其余图表点按（他行格/数值题期点格）=重听题面+方向回锚（6s 节流） */
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  lastAct = Date.now();
  if (Date.now() - lastChartReplay < 6000) return;
  lastChartReplay = Date.now();
  replayQuiz(true);
});
cardsEl.addEventListener('pointerdown', e => {   /* 数值卡点选（数值题主交互域） */
  const card = e.target.closest('.ncard');
  if (!card) return;
  e.preventDefault();
  if (VERIFY || !cur) return;
  const q = cur.quizzes[cur.step];
  if (!q || q.kind === 'count') return;
  uiTapCard(Number(card.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('#chart') || e.target.closest('#scene') || e.target.closest('#cards')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+场景该类逐只 pulse/图表 bump 回锚，
   lastDir 独立节流锚，不重置 lastAct——30s 答案级不被饿死）
   / 30s 答案级（count=answer/2 格 breathe / 数值题=正确卡 breathe）/ 教学"帮"5s 重演示 */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默 */
  const idle = Date.now() - lastAct;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    if (q.kind === 'count') breatheAnswerCells(q);
    else breatheAnswerCard(q);
    speakQuiz();
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+回锚（不动 lastAct） */
    speakQuiz();
    if (q.kind === 'count') pulseSceneClass(q.ask);
    else pulseChartAll();
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
  KIDS.init({ game: 'datacollect', title: '数据收集员' });   // 存档键 kidsgame_datacollect（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.DC = {
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
    const scene = {};
    cur.cats.forEach((c, i) => { scene[c] = cur.values[i]; });
    const scene1 = cur.scene1 ? JSON.parse(JSON.stringify(cur.scene1)) : null;
    return { kind: q.kind,                             /* count|sum|diff|mostdiff|change|totalchange */
             scene: scene,                             /* 场景真值全类=「这次」调查（verify 对账锚） */
             scene1: scene1,                           /* dch4「上次」调查真值（其余章 null） */
             up: q.kind === 'change' || q.kind === 'totalchange' ? !!q.up : null,   /* dch4 同向：这次比第一次多/少 */
             ask: q.kind === 'count' || q.kind === 'change' ? q.ask
                : (q.kind === 'sum' || q.kind === 'diff' || q.kind === 'mostdiff') ? q.ask.slice() : null,
             answer: q.answer,                         /* count=只数 / sum·diff·mostdiff·change·totalchange=数值 */
             options: q.options ? q.options.slice() : null,   /* 数值题 4 选项（count null） */
             answerIdx: q.options ? q.answerIdx : -1,
             grid: (q.kind === 'count' ? (cur.rowsLit[q.ask] || []).slice() : []),   /* 该行已点亮格下标 */
             step: cur.step,                           /* 全关题号 0-4（b33 坑①：题号语义非格进度） */
             miss: q._miss || 0 };
  },
  get labels() {                                       /* 行标签池（行序类目 id——verify 探针面） */
    return cur && !cur.done ? cur.cats.slice() : null;
  },
  tapCell(i) { return uiTapCell(i); },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（count 顺序点亮/settle 自动判对；
    let taps = 0, guard = 0;             // 数值题 tapCard(answerIdx)；演出窗内 tap=null/false → 等窗结束重试）
    while (cur && !cur.done && guard++ < 300) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      if (q.kind === 'count') {
        const g = cur.rowsLit[q.ask];
        if (g.length < countSteps(q)) {
          const r = await uiTapCell(g.length);
          if (r === 'lit') taps++;
        } else { await wait(60); }        /* 已点满：settle 待决/演出窗中——等自动判对 */
      } else {
        const r = await uiTapCard(q.answerIdx);
        if (r === 'right' || r === 'done') taps++;
      }
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  dcStartNumeric(flat) {                  /* 探针面：推进到首个数值题（count 题引擎直驱快进，不演语音） */
    startLevel(flat == null ? 6 : flat);
    let g = 0;
    while (cur && !cur.done && cur.quizzes[cur.step] &&
           cur.quizzes[cur.step].kind === 'count' && g++ < 24) {
      const q = cur.quizzes[cur.step];
      q._opened = true;
      cur.rowsLit[q.ask] = [];
      for (let i = 0; i < countSteps(q); i++) cur.rowsLit[q.ask].push(i);
      engSettle(cur);
    }
    renderQuiz();
    return this.quiz;
  },
  get tutorial() { return state.tut; }
};
