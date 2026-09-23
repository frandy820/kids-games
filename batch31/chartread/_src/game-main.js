/* ================= chartread 主逻辑（象形图渲染 / 点选判定 / 教学 / 救援 / 推进）
   玩法：行式象形统计图（每行=类目头 icon+名小字 + 值个 icon 重复，行高≥48px；
   unit=2 每格=2 只 icon 成对格 + 轴角标「一格=2」）+ 题面句 + 候选卡
   （most/least/second/constraint=类目图卡 / howmany/total/compare/twocompare=数字卡）。
   开题链（契约 N）：most/least/second/total=[chr_q_*] 全 clip；
   howmany=[chr_n_<target>, chr_q_howmany] / compare=[chr_n_A, chr_s_bi, chr_n_B, chr_s_duo]
   / constraint=[chr_s_bi, chr_n_X, chr_s_dyou, chr_n_Y, chr_s_shd]
   / twocompare=[chr_lab_pm, chr_s_de, chr_n_t, chr_s_bi, chr_lab_am, chr_s_de, chr_s_duo]
   ——T46 阶段3 题面全 clip 化（keyless 清零，拼句与 q.text 逐字对齐去尾问号）。
   点对=卡亮+确认链（类目卡族=[chr_right,chr_n_<答案类目>]；数值族全 clip：
   howmany=[right, chr_n_值] / total=[right, chr_s_yg, chr_n_和]
   / compare·twocompare=[right, chr_s_do, chr_n_差]——数字键 chr_n_1..74 与 NUMCN 同口径）
   +图表 pulse+小兔子跳；
   点错=卡摇头+语义句 clip 单段链（chr_again_* 键段，T46 阶段2）+方向级行提示：
     most/least miss=1 图表 pulse、miss≥2 答案行 lit（答案级线索梯度）；
     second miss≥2 第二多行 lit（排序答案级）；howmany=目标行逐格 pulse；
     compare=两类目行串行逐格 pulse；total=全行串行逐格（逐行加的程序示范）；
     constraint=两约束行 pulse（锚约束不泄答案）；twocompare=两图目标行逐格 pulse。
   救援：14s 方向级=重读题面+图表 pulse（lastDir 独立节流锚）；30s 答案级=正确卡
   breathe+重读题面；错反馈链豁免窗 clip 实长+300 让路（契约 I，T46 阶段2）。
   验收钩子：window.CH = { get currentLevel, get quiz(){chart,chart2,q,miss}, tapOpt(i),
   start(flat), async autoSolve(), get tutorial }（getter 返回拷贝）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5） */
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

const chartEl = $id('chart'), qbarEl = $id('qbar'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

/* r17 存档启动 IIFE（CH_LEN 5→8 键基迁移，SPEC §4 r17 增补段定版）：
   ①旧键基矛盾态——v1 keyOf 分母=CH_LEN=5，旧档 '2-0'=旧 flat5 直映新基（分母 8）
    跳章且章语义错乱：矛盾态 lv[c+'-0'] 在而 lv[(c-1)+'-5'|'-6'|'-7'] 缺（c=2..9 扫描窗）
    =旧基档一次性重置（r15/r16 家族同款；赶在 KIDS.init 读档前）；
   ②脏键守卫——仅判格式非法与关号越界（<0 或 >7，新键基关号域）；章号上界放开：
    生成关章号 ≥5 合法无界（禁整档 removeItem 吞掉生成关进度——r16 fatal 教训）。 */
try {
  const raw = localStorage.getItem('kidsgame_chartread');
  if (raw) {
    const lv = (JSON.parse(raw) || {}).levels || {};
    let reset = false;
    for (let c = 2; c <= 9; c++) {
      if (lv[c + '-0'] !== undefined && (lv[(c - 1) + '-5'] === undefined ||
          lv[(c - 1) + '-6'] === undefined || lv[(c - 1) + '-7'] === undefined)) { reset = true; break; }
    }
    if (!reset) {
      for (const k of Object.keys(lv)) {
        const m = /^(\d+)-(\d+)$/.exec(k);
        if (!m || +m[1] < 1 || +m[2] < 0 || +m[2] > 7) { reset = true; break; }
      }
    }
    if (reset) localStorage.removeItem('kidsgame_chartread');
  }
} catch (e) { /* 守卫失败不阻断启动 */ }

/* ---------- 竖屏双通道（body.port 类通道与 @media 逐条等值——head 两段同步；
   verify simView 用类通道量测竖屏规则真通道） ---------- */
const portMQ = window.matchMedia ? window.matchMedia('(orientation:portrait)') : null;
function applyPort() {
  document.body.classList.toggle('port',
    !!(portMQ ? portMQ.matches : window.innerHeight > window.innerWidth));
}
applyPort();
if (portMQ && portMQ.addEventListener) portMQ.addEventListener('change', applyPort);

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastChartReplay = 0;                        // 点图表重听节流（6s——试玩 P1：逐格点数时反复重播覆盖儿童自数）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const CH_LVS = Array.from({ length: CH_LEN }, (_, l) => l);   // 本章全部关号（level.pass/dots 用）
const cardEl = i => i < 0 ? null : boardEl.querySelector('.card[data-i="' + i + '"]');
const rowsByCat = cat => Array.from(chartEl.querySelectorAll('.row[data-cat="' + cat + '"]'));
const rowEl = i => i < 0 ? null : chartEl.querySelector('.row[data-idx="' + i + '"]');

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

/* ================= 题面语音（开题链；T46 阶段3 全 clip 化——keyless 清零）
   most/least=单 clip 1824 / second=1848 / total=2040 / howmany=名音+q_howmany；
   compare=名A+s_bi+名B+s_duo / constraint=s_bi+名X+s_dyou+名Y+s_shd
   / twocompare=lab_pm+s_de+名t+s_bi+lab_am+s_de+s_duo（拼句=q.text 去尾问号逐字）
   ——读题异步不占 UI 等待窗 ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'most') KIDS.voice.queue([VOICE.qMost.key]);
  else if (q.kind === 'least') KIDS.voice.queue([VOICE.qLeast.key]);
  else if (q.kind === 'second') KIDS.voice.queue([VOICE.qSecond.key]);
  else if (q.kind === 'total') KIDS.voice.queue([VOICE.qTotal.key]);
  else if (q.kind === 'howmany')
    KIDS.voice.queue([nameClip(q.target), VOICE.qHowmany.key]);
  else if (q.kind === 'compare')
    KIDS.voice.queue([nameClip(q.pair[0]), VOICE.sBi.key, nameClip(q.pair[1]), VOICE.sDuo.key]);
  else if (q.kind === 'constraint')
    KIDS.voice.queue([VOICE.sBi.key, nameClip(q.pair[0]), VOICE.sDyou.key,
                      nameClip(q.pair[1]), VOICE.sShd.key]);
  else
    KIDS.voice.queue([VOICE.labPm.key, VOICE.sDe.key, nameClip(q.target), VOICE.sBi.key,
                      VOICE.labAm.key, VOICE.sDe.key, VOICE.sDuo.key]);   // twocompare
}
/* 重听路径（hear/题面共用）：重播开题链+图表再 pulse（方向级回锚） */
function replayQuiz(withPulse) {
  if (!cur || !cur.quizzes[cur.step]) return;
  speakQuiz();
  if (withPulse) pulseChart();
}
/* 方向级回锚：图表容器再 pulse（错反馈/重听/救援共用） */
function pulseChart() {
  if (chartEl) replayAnim(chartEl, 'pulse');
}
/* 行内逐格 pulse：每格错峰 90ms（数数节律）；按类目取行（twocompare 两图同名行
   一并取到——两图目标行同时数）；unit=2 时每格=2 只（pulse 节律按格不按只） */
function pulseUnitsIn(row, baseMs) {
  if (!row) return;
  Array.from(row.querySelectorAll('.unit')).forEach((u, k) => {
    u.classList.remove('pulse'); void u.offsetWidth;
    u.style.animationDelay = (baseMs + k * 90) + 'ms';
    u.classList.add('pulse');
  });
}
function pulseRowsByCat(cat, baseMs) {
  rowsByCat(cat).forEach(r => pulseUnitsIn(r, baseMs || 0));
}
function rowPulse(cat) {                          // 行级 pulse（constraint 两约束行）
  rowsByCat(cat).forEach(r => replayAnim(r, 'pulse'));
}
/* total：全行串行逐格（先数第一行、再第二行……逐行加的程序示范） */
function pulseTotalRows(q) {
  let base = 0;
  q.chart.cats.forEach((c, i) => {
    pulseRowsByCat(c, base);
    base += Math.round(q.chart.values[i] / q.chart.unit) * 90 + 900;
  });
}
/* 答案级线索：答案行 lit（miss≥2 才亮——家族梯度脚手架，首错只给方向级）
   most/least=极值行 / second=升序倒数第 2 行（rankRowIdx 独立复算） */
function lightAnswerRow(q) {
  const bi = rankRowIdx(q);
  const row = rowEl(bi);
  if (row) row.classList.add('lit');
}
/* 清行级提示（换题/换关） */
function clearRowCues() {
  Array.from(chartEl.querySelectorAll('.row.lit')).forEach(r => r.classList.remove('lit'));
  Array.from(chartEl.querySelectorAll('.unit.pulse')).forEach(u => { u.classList.remove('pulse'); u.style.animationDelay = ''; });
  Array.from(chartEl.querySelectorAll('.row.pulse')).forEach(r => r.classList.remove('pulse'));
}

/* ================= 渲染 ================= */
/* 行内格串：unit=1 每格 1 icon（每第 5 格加 .g5 组距——五个一群点数支架）；
   unit=2 每格=2 icon 成对格（.pair——一格代表两只的视觉锚） */
function unitsHTML(cat, value, unit) {
  const n = Math.round(value / unit);
  let out = '';
  for (let k = 0; k < n; k++) {
    const g5 = (k % 5 === 4 && k < n - 1) ? ' g5' : '';
    const inner = unit === 2
      ? catSvg(cat, 21) + catSvg(cat, 21)
      : catSvg(cat, 24);
    out += '<span class="unit' + (unit === 2 ? ' pair' : '') + g5 + '">' + inner + '</span>';
  }
  return out;
}
function rowsHTML(cats, values, unit) {
  return cats.map((c, i) =>
    '<div class="row" data-idx="' + i + '" data-cat="' + c + '" data-v="' + values[i] + '">' +
    '<div class="row-head">' + catSvg(c, 34) + '<span class="rn">' + nameOf(c) + '</span></div>' +
    '<div class="row-units">' + unitsHTML(c, values[i], unit) + '</div></div>').join('');
}
function renderChart(q) {                        // 象形图（unit=2 带轴角标；twocompare 双图）
  chartEl.dataset.kind = q.kind;                 // 帧内容锚（契约 M：verify 断言）
  let inner;
  if (q.kind === 'twocompare') {
    inner = '<div class="two-wrap">' +
      '<div class="sub-chart" data-lab="0"><div class="sub-tag">' + TWO_LABELS[0] + '</div>' +
      '<div class="rows">' + rowsHTML(q.chart.cats, q.chart.values, 1) + '</div></div>' +
      '<div class="sub-chart" data-lab="1"><div class="sub-tag">' + TWO_LABELS[1] + '</div>' +
      '<div class="rows">' + rowsHTML(q.chart2.cats, q.chart2.values, 1) + '</div></div></div>';
    chartEl.setAttribute('aria-label', '上午和下午两张统计图，' +
      q.chart.cats.map(nameOf).join('、') + '，点我再听一遍');
  } else {
    const axis = q.chart.unit === 2 ? '<span class="axis-tag">一格=2</span>' : '';
    inner = axis + '<div class="rows">' + rowsHTML(q.chart.cats, q.chart.values, q.chart.unit) + '</div>';
    chartEl.setAttribute('aria-label', (q.chart.unit === 2 ? '象形统计图，一格代表两只，' : '象形统计图，') +
      q.chart.cats.map(nameOf).join('、') + '，点我再听一遍');
  }
  chartEl.innerHTML = inner;
}
function renderQbar(q) {                         // 题面句条（7-8 岁文字题面）
  const t = qbarEl.querySelector('.q-text');
  t.textContent = q.text;
  replayAnim(qbarEl, 'pop');
}
function renderBoard(q) {                        // 候选卡：类目图卡（svg+名小字）或数字卡（大数字+只）
  const catKind = q.kind === 'most' || q.kind === 'least' || q.kind === 'second' || q.kind === 'constraint';
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    if (catKind) {
      b.dataset.anim = o.anim;                   // verify 对账（渲染即引擎）
      b.setAttribute('aria-label', nameOf(o.anim) + '图卡');
      b.innerHTML = catSvg(o.anim, 76) + '<span class="nm">' + nameOf(o.anim) + '</span>';
    } else {
      b.dataset.num = o.num;                     // verify 对账
      b.setAttribute('aria-label', String(o.num) + ' 只');
      b.innerHTML = '<span class="num">' + o.num + '</span><span class="unit-tag">只</span>';
    }
    b.style.animationDelay = (i * 70) + 'ms';
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChart(q);
  renderQbar(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 开题读题（教学演示期静默）
}
function renderStep() {                          // HUD 本关 8 题进度点
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
    const done = CH_LVS.every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 答对演出：图表 pulse + 小兔子跳（确认链由 uiTapOpt 播）
   verify 页跳过装饰直接落定 ================= */
function celebrateScene() {
  replayAnim(chartEl, 'pulse');
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
/* 教学"帮"阶段指向：当前题正确卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / CH.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错防重入窗/判对演出窗共用 locked 门；错点 1000ms 防重入窗（b16 定案）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  /* b31 复验修（2026-09-11）：错链豁免窗（真时钟）内错点吞——locked 窗 verify 页乘 SPEED 缩水防 40ms 漏点（b30 家族 T7 口径 miss 只+1）；对选放行（缓解 b30 P1-1 吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度脚手架可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+语义句 clip 单段链（T46 键段）+方向级行提示 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const again = againOf(q), ak = againKeyOf(q);
    if (sayW([{ key: ak, text: again }]))
      wrongChainUntil = Date.now() + (AGAIN_DUR[ak] + 300);   /* 链豁免窗=clip 实长+300（契约 I，T46 实长口径） */
    cueWrong(q);
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：图表 pulse+兔子跳+确认链拼播） ---- */
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
  if (cur === run) celebrateScene();
  confirmChain(q);
  await wait(1600 * SPEED);                      /* 图表 pulse+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait(4700 * SPEED);                      /* 确认链收尾窗：总 6300 ≥ 类目族 2448+150+1440+300=4338
                                                    与数值族全 clip 最长 total 2448+150+1320+150+1848+300=6216
                                                    （T46 阶段3 数字段 clip 化后 4100→4700，家族 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（每题新图：图表/卡全换）+读题 */
  return r;
}

/* 错反馈语义句分派（unit=2 数值族共用换算提醒句——读图错因直指） */
function againOf(q) {
  if (q.kind === 'second') return SECOND_AGAIN;
  if (q.kind === 'constraint') return CONSTRAINT_AGAIN;
  if (q.kind === 'twocompare') return TWOCOMPARE_AGAIN;
  if (q.kind === 'total') return q.chart.unit === 2 ? UNIT2_AGAIN : TOTAL_AGAIN;
  if (q.kind === 'compare') return q.chart.unit === 2 ? UNIT2_AGAIN : COMPARE_AGAIN;
  if (q.kind === 'howmany') return q.chart.unit === 2 ? UNIT2_AGAIN : HOWMANY_AGAIN;
  return MOST_AGAIN;                             // most/least 共用
}
/* 错反馈语义句 clip 键分派（T46 阶段2；与 againOf 同判据同序——键/句恒配对） */
function againKeyOf(q) {
  if (q.kind === 'second') return AGAIN_KEYS.second;
  if (q.kind === 'constraint') return AGAIN_KEYS.constraint;
  if (q.kind === 'twocompare') return AGAIN_KEYS.twocompare;
  if (q.kind === 'total') return q.chart.unit === 2 ? AGAIN_KEYS.unit2 : AGAIN_KEYS.total;
  if (q.kind === 'compare') return q.chart.unit === 2 ? AGAIN_KEYS.unit2 : AGAIN_KEYS.compare;
  if (q.kind === 'howmany') return q.chart.unit === 2 ? AGAIN_KEYS.unit2 : AGAIN_KEYS.howmany;
  return AGAIN_KEYS.most;                        // most/least 共用
}
/* 错反馈方向级线索（按题型；答案级 lit 由 most/least/second miss≥2 触发） */
function cueWrong(q) {
  if (q.kind === 'howmany') {
    pulseRowsByCat(q.target);                            /* 目标行逐格 pulse（twocompare 无此型） */
  } else if (q.kind === 'compare') {
    const ai = q.chart.cats.indexOf(q.pair[0]), bi = q.chart.cats.indexOf(q.pair[1]);
    pulseRowsByCat(q.pair[0]);                           /* 两行串行逐格（A 行数完再 B 行） */
    pulseRowsByCat(q.pair[1], (Math.round(q.chart.values[ai] / q.chart.unit) - 1) * 90 + 1300);
  } else if (q.kind === 'total') {
    pulseTotalRows(q);                                   /* 全行串行逐格（逐行加程序示范） */
  } else if (q.kind === 'second') {
    if (q._miss >= 2) lightAnswerRow(q);                 /* 答案级：第二多行 lit（miss≥2） */
    else pulseTotalRows(q);                              /* 方向级：全行串行（排序扫描） */
  } else if (q.kind === 'constraint') {
    rowPulse(q.pair[0]); rowPulse(q.pair[1]);            /* 两约束行 pulse（锚约束不泄答案） */
  } else if (q.kind === 'twocompare') {
    pulseRowsByCat(q.target);                            /* 两图目标行同时逐格 pulse */
  } else if (q._miss >= 2) {
    lightAnswerRow(q);                                   /* 答案级线索 miss≥2 才亮（家族梯度脚手架） */
  } else {
    pulseChart();                                        /* 首错=图表 pulse 方向级（不泄答案） */
  }
}
/* 判对确认链（契约 L/N：数值族数字段=chr_n_ 数字 clip——与 NUMCN 表同口径 74/74 已核；
   T46 阶段3 全 clip 化，keyless 清零） */
function confirmChain(q) {
  const catKind = q.kind === 'most' || q.kind === 'least' || q.kind === 'second' || q.kind === 'constraint';
  if (catKind) {
    KIDS.voice.queue([VOICE.right.key, nameClip(q.opts[q.answer].anim)]);   /* right+答案类目名音（全 clip 无 keyless） */
  } else if (q.kind === 'howmany') {
    KIDS.voice.queue([VOICE.right.key, nameClip(q.chart.values[q.chart.cats.indexOf(q.target)])]);
  } else if (q.kind === 'total') {
    KIDS.voice.queue([VOICE.right.key, VOICE.sYg.key,
                      nameClip(q.chart.values.reduce((s, v) => s + v, 0))]);
  } else if (q.kind === 'compare') {
    KIDS.voice.queue([VOICE.right.key, VOICE.sDo.key,
                      nameClip(q.chart.values[q.chart.cats.indexOf(q.pair[0])] - q.chart.values[q.chart.cats.indexOf(q.pair[1])])]);
  } else {
    KIDS.voice.queue([VOICE.right.key, VOICE.sDo.key,
                      nameClip(q.chart2.values[q.chart.cats.indexOf(q.target)] - q.chart.values[q.chart.cats.indexOf(q.target)])]);
  }
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章文案（ci<4；日末停章中段同走下一章预告——§0.4 防跳章，
     家族 F 口径）；生成关段（ci≥4）实算下一关随机章型 GEN[dch-1]——genLevel 纯函数
     确定性，同 flat 恒同 dch，预告与实际章型恒一致（禁取模推进形态） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* chr_right：读对啦，真聪明（2448ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2448+300=2748 */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, CH_LVS);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const starsN = CH_LVS.reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: starsN, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A（r17 升级双 lim-1）：日末预告=今日末关下一关 */
      setTimeout(() => proceed(), 3400);
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
  lastDir = Date.now();                          /* 换关重置方向级节流锚（救援双锚配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.chartread && sv.chartread.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=播 chr_tut_watch「看！看图找答案」→ 播题面句 chr_q_most「谁最多呀」→ 幽灵手指先指
   最长行（读图锚）再移到答案卡 →点中（确认链拼播）→帮=指向正确卡；独=首次选对放手
   时序（家族 G/H）：watch clip 2976ms → 题面句延至 t=3300（≥2976+300，禁撞头）；
   题面 chr_q_most 1824，ghost 行锚窗 2200 ≥ 1824+300=2124；移卡窗 900+press 320；
   演出窗 1600+4700 罩确认链 2448+150+1440+300=4338（most 教学锚=类目族） ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* chr_tut_watch：看！看图找答案（2976ms） */
  const run = cur;
  await wait(3300 * SPEED);                      /* t=3300 ≥ 2976+300=3276：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 most（教学演示锚）
  KIDS.voice.queue([VOICE.qMost.key]);           /* 播题面句：谁最多呀（1824ms） */
  let bi = 0;                                    // 最长行（读图锚：先指行再指卡）
  for (let i = 1; i < q.chart.cats.length; i++) if (q.chart.values[i] > q.chart.values[bi]) bi = i;
  const row = rowEl(bi), card = cardEl(correctIdx(q));
  if (!VERIFY && row) { ghost.toEl(row); ghost.show(); }
  await wait(2200 * SPEED);                      /* ≥1824+300=2124：题面句播完+ghost 行锚停顿 */
  if (cur !== run) return;
  if (!VERIFY && card) ghost.toEl(card);         /* 移到答案图卡（0.8s CSS 过渡） */
  await wait(900 * SPEED);                       /* ghost 移动窗 */
  if (cur !== run) return;
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(correctIdx(q), true);   /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__chDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  await wait(300 * SPEED);                       /* 收尾（确认链仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.chartread = sv.chartread || {};
  sv.chartread.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来读一读"在重发后的题面上说（照 batch5-30） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* chr_tut_turn：你来读一读（1872ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2200);                                      /* ≥1872+300=2172 防尾截（turn 后读题延） */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再看看这张图 */
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
  replayQuiz(false);                             /* 再听一遍：题面链重播 */
});
chartEl.addEventListener('pointerdown', e => {   /* 点图表=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4；节流内仍计主动活动） */
  if (Date.now() - lastChartReplay < 6000) return;   /* 6s 节流：逐格点数时不再重播覆盖儿童自数 */
  lastChartReplay = Date.now();
  replayQuiz(true);                              /* 附图表再 pulse（方向级回锚） */
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapOpt(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#chart')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+图表 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe）/ 教学"帮"5s 重演示 */
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
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+图表 pulse（不动 lastAct） */
    speakQuiz();
    pulseChart();
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
  KIDS.init({ game: 'chartread', title: '图表小读者' });   // 存档键 kidsgame_chartread（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A（r17 升级双 lim-1）：两处实算 */
    first = Math.max(0, lim - 1);                             /* 停留今日末关（旧 0 基回跳已弃） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.CH = {
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
    const catKind = q.kind === 'most' || q.kind === 'least' || q.kind === 'second' || q.kind === 'constraint';
    return { chart: { cats: q.chart.cats.slice(), values: q.chart.values.slice(), unit: q.chart.unit },   /* SPEC §3 钩子契约 */
             chart2: q.chart2 ? { cats: q.chart2.cats.slice(), values: q.chart2.values.slice(), unit: q.chart2.unit } : null,
             kind: q.kind,                             /* most|least|second|howmany|total|compare|constraint|twocompare */
             target: q.target || null,                 /* howmany/twocompare 目标类目 id */
             pair: q.pair ? q.pair.slice() : null,     /* compare 两类目（A 值>B 值）/constraint [下邻X,上邻Y] */
             opts: q.opts.map(o => catKind ? { anim: o.anim } : { num: o.num }),  /* 图卡 {anim} 或数字 {num} */
             answer: q.answer,
             text: q.text,
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选卡，走真实判定链；
    let taps = 0, guard = 0;             // 演出窗内 tap=false → 等窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 160) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapOpt(q.answer);
      if (r === 'right' || r === 'done') taps++;
      else if (r === 'wrong') { /* 继续重试点对（不会发生：直点 answer） */ }
      else if (guard >= 158) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
