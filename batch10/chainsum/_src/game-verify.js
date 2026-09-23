/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39，每关一记）：确定性（同 flat 两次生成 JSON 一致）/
     structWhy（op/d/answer 三元自洽、cur·answer∈[lo,hi]、候选 3 张含答案互异、干扰项 ≥1 禁 0
     域内且 |v-answer|∈{1,2,d}）/ chainWhy（q0.cur===s0 且 q(i).cur===q(i-1).answer 首尾相接）/
     参数域（pid 取章：s0∈P.s0、d∈P.d、q.lo/hi===P.lo/hi；静态关 pid===dch、生成关随机）/
     op 约束（每关 ± 各 ≥1、禁连续 3 题同 op；ch4 高频交替=相邻切换 ≥3 次）/
     引擎直驱（首题连错 2 张干扰=灰掉 miss 封顶 → 已灰 again 早退 → 全对通关 2 星；另全对 3 星）
   ② tapCard 单元（flat0 真实 UI）：首错=晃动+灰掉(pointer-events:none)+miss+dead 标记+首错不
     pulse / 已灰卡 hook 点击=again 零惩罚 / 非法下标 false / 答对 lit+空车厢同步填数亮起（演出窗内）
     +step 推进+尾部挂新空车厢（新运算牌）
   ②b sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / 灰化款 miss 封顶 2 → force 豁免恰一次
   ③ UI 冒烟 A：flat0 真实通路通关（1 错=2 星，verify 页不弹层）
   ④ UI 冒烟 B1：flat10（ch3 大数字域 [0,20] d∈[2,5]）链值全在域内+车厢 DOM 与引擎链对账+
     autoSolve 3 星；B2：flat17（ch4 高频交替）± 各 ≥1+切换 ≥3+真实 tapCard 通关
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0 两节车 / flat17 推进至六节车）：
     车厢数=step+2、车厢数字与链一致（尾部=?）、运算牌大字可见且文本=q.op+q.d、车厢 ≥64 宽、
     候选卡 3 张 ≥96、全按钮 ≥64（.k-parentbtn 豁免）、车厢/卡在场景内、overflowX ≤0
   ⑥ 分布与专项：40 关 op 分布（四章 ± 各 ≥1）/ 各章 d 域与上限覆盖 / numCn 1-20 独立字表对账 /
     qSpeech 独立拼句对账（'八加三等于几呀' 等 4 型）/ cs_* 3 条 clips 注入 clipOk /
     开场顺序链 stub（play(cs_hint) 后 2000ms 接力题面 TTS）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const opDist = { 1: { plus: 0, minus: 0 }, 2: { plus: 0, minus: 0 },
                   3: { plus: 0, minus: 0 }, 4: { plus: 0, minus: 0 } };
  const genOp = { plus: 0, minus: 0 };
  const dMax = { 1: 0, 2: 0, 3: 0, 4: 0 };

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let structAll = true, chainOk = true, ruleOk = true, opsOk = true, driveOk = true;
    const P = PARAMS[L1.pid];
    const cnt = { plus: 0, minus: 0 };
    let switches = 0;
    if (chainWhy(L1)) chainOk = false;
    if (flat < STATIC_LEVELS && L1.pid !== L1.dch) ruleOk = false;           // 静态关取本章参数
    if (!(L1.s0 >= P.s0[0] && L1.s0 <= P.s0[1])) ruleOk = false;             // 起点在章区间
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q)) structAll = false;
      if (q.lo !== P.lo || q.hi !== P.hi) ruleOk = false;                    // 数域随参数组
      if (!(q.d >= P.d[0] && q.d <= P.d[1])) ruleOk = false;                 // d 在章区间
      if (k === 0 && q.d > 2) ruleOk = false;                                // 试玩 P1②：每关首题热身 d<=2（warmCap=max(dmin,min(2,dmax))）
      cnt[q.op === '+' ? 'plus' : 'minus']++;
      if (flat < STATIC_LEVELS) { opDist[L1.dch][q.op === '+' ? 'plus' : 'minus']++; dMax[L1.dch] = Math.max(dMax[L1.dch], q.d); }
      else genOp[q.op === '+' ? 'plus' : 'minus']++;
      if (k >= 2 && L1.quizzes[k - 1].op === q.op && L1.quizzes[k - 2].op === q.op) opsOk = false;   // 禁连续 3 同
      if (k >= 1 && L1.quizzes[k - 1].op !== q.op) switches++;
    }
    if (cnt.plus < 1 || cnt.minus < 1) opsOk = false;                        // 每关 ± 各 ≥1
    if (L1.dch === 4 && flat < STATIC_LEVELS && switches < 3) opsOk = false; // ch4 高频交替
    /* 引擎直驱：首题两张干扰连错（灰化款 miss 封顶 2）→ 已灰 again 早退 → 逐题全对通关（2 星）；
       另取新关全对通关（3 星） */
    const Ld = genLevel(flat);
    const q0 = Ld.quizzes[0];
    const ws = q0.options.map((v, i) => v !== q0.answer ? i : -1).filter(x => x >= 0);
    if (engTap(Ld, ws[0]) !== 'wrong' || Ld.retries !== 1 || q0._miss !== 1 || !q0._dim[ws[0]]) driveOk = false;
    if (engTap(Ld, ws[1]) !== 'wrong' || Ld.retries !== 2 || q0._miss !== 2 || !q0._dim[ws[1]]) driveOk = false;
    if (engTap(Ld, ws[0]) !== 'again' || Ld.retries !== 2) driveOk = false;  // 已灰卡防御层
    for (let k = 0; k < CH_LEN && driveOk; k++) {
      const q = Ld.quizzes[k];
      const want = k === CH_LEN - 1 ? 'done' : 'goal';
      if (engTap(Ld, q.options.indexOf(q.answer)) !== want) driveOk = false;
      if (!q._filled) driveOk = false;
    }
    const solvedAll = Ld.done && Ld.step === CH_LEN && Ld.retries === 2 && engStars(Ld) === 2;
    const L3 = genLevel(flat);
    for (let k = 0; k < CH_LEN; k++) engTap(L3, L3.quizzes[k].options.indexOf(L3.quizzes[k].answer));
    if (!L3.done || engStars(L3) !== 3) driveOk = false;
    const ok = det && chainOk && structAll && ruleOk && opsOk && driveOk && Ld.done &&
      L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, pid: L1.pid, ok: ok, det: det, chainOk: chainOk,
      structAll: structAll, ruleOk: ruleOk, opsOk: opsOk, driveOk: driveOk && solvedAll,
      qs: L1.quizzes.map(q => q.cur + (q.op === '+' ? '+' : '-') + q.d + '=' + q.answer +
        '[' + q.options.join(',') + ']') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCard 单元（flat 0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = CS.quiz;
  const cards0 = Array.prototype.slice.call(cardsEl.querySelectorAll('.cardbtn'));
  /* DOM 对账：3 张卡 data-i 0-2、卡面数字与引擎 options 一致（渲染即引擎） */
  const alignOk = q0 && cards0.length === 3 && cards0.every((c, i) =>
    Number(c.dataset.i) === i &&
    c.querySelector('.cv').textContent === String(q0.options[i]));
  const ws0 = q0.options.map((v, i) => v !== q0.answer ? i : -1).filter(x => x >= 0);
  const wIdx = ws0[0], okIdx = q0.options.indexOf(q0.answer);
  const rW = await CS.tapCard(wIdx);              // 首错：晃动+灰掉+miss 计数+dead 标记+首错不 pulse
  const wEl = cardEl(wIdx), okEl = cardEl(okIdx);
  const wrongOk = rW === 'wrong' && CS.quiz.miss === 1 && CS.currentLevel.retries === 1 &&
    CS.quiz.step === 0 && !!CS.quiz.dead[wIdx] && !CS.quiz.dead[okIdx] &&
    wEl.classList.contains('dim') && wEl.classList.contains('wig') &&
    getComputedStyle(wEl).pointerEvents === 'none' &&      /* 灰掉：排除法保底（SPEC §1 灰化款） */
    !okEl.classList.contains('breathe');                   /* 首错不 pulse */
  const rA = await CS.tapCard(wIdx);              // 已灰卡 hook 点击：again 早退零惩罚
  const againOk = rA === 'again' && CS.quiz.miss === 1 && CS.currentLevel.retries === 1;
  const badIdx = (await CS.tapCard(3)) === false && (await CS.tapCard(-1)) === false &&
    (await CS.tapCard('x')) === false;
  const pOk = CS.tapCard(okIdx);                  // 答对：空车厢同步填数亮起（950ms 演出窗内读）
  const litCard = cardEl(okIdx).classList.contains('lit');
  const slot1 = carEl(1);
  const fillOk = !!slot1 && slot1.querySelector('.car').classList.contains('justlit') &&
    !slot1.querySelector('.car').classList.contains('empty') &&
    slot1.querySelector('.cv').textContent === String(q0.answer) &&
    !slot1.querySelector('.opsign b');                     /* 运算牌随填车摘牌 */
  const rOk = await pOk;
  /* 演出窗收尾 renderQuiz：3 节车（车头+1 已填）+ 新空车厢带新运算牌，等式 chip 同步 */
  const q1 = CS.quiz;
  const slot2 = carEl(2);
  const growOk = rOk === 'goal' && q1 && q1.step === 1 && trainEl.querySelectorAll('.carslot').length === 3 &&
    !!slot2 && slot2.querySelector('.car').classList.contains('empty') &&
    slot2.querySelector('.cv').textContent === '?' &&
    slot2.querySelector('.opsign b').textContent === q1.op + q1.d &&
    chipEl.querySelector('.fnum').textContent === String(q1.cur);
  const tapOk = alignOk && wrongOk && againOk && badIdx && litCard && fillOk && growOk;
  if (tapOk) npass++;
  units.tapCard = { ok: tapOk, align: alignOk, wrong: wrongOk, again: againOk,
    badIdx: badIdx, lit: litCard, fill: fillOk, grow: growOk };

  /* ---- ②b sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / 灰化款豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  /* T46 阶段2：纠错句 clip 化——key 从 null 变 cs_wrong（文本族不变） */
  const wrongPlays = () => wLog.filter(p => p[0] === 'cs_wrong' && p[1].indexOf('再想') === 0).length;
  const wrongPair = () => {
    const q = CS.quiz;
    return q.options.map((v, i) => v !== q.answer ? i : -1).filter(x => x >= 0);
  };
  startLevel(0);                                   // flat0：每错必播（两张干扰各错一次）
  const wp0 = wrongPair();
  await CS.tapCard(wp0[0]);
  await CS.tapCard(wp0[1]);
  const sayA = wrongPlays();                       // → 2
  startLevel(3);                                   // flat3：10s 节流
  lastWrongVoice = Date.now();                     /* flat0 分支不写时间戳，显式进入窗口内 */
  const wp3 = wrongPair();
  await CS.tapCard(wp3[0]);                        // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                   // 增量 → 0
  startLevel(3);                                   // 同关重发 fresh quiz：miss 封顶 2 → force 豁免恰一次
  lastWrongVoice = 0;                              /* 隔离上一子用例时间戳 */
  const wp3b = wrongPair();
  await CS.tapCard(wp3b[0]);                       // miss=1 → 播（10s 窗口早已过）
  await CS.tapCard(wp3b[1]);                       // miss=2 → force → 播
  const sayC = wrongPlays() - 2 - sayB;            // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = CS.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                               // 首错：灰牌零惩罚；首错不 pulse 正确卡
      const w = q.options.findIndex(v => v !== q.answer);
      await CS.tapCard(w);
      wrongOk2 = CS.currentLevel.retries === 1 && CS.currentLevel.step === 0 &&
        !cardEl(q.options.indexOf(q.answer)).classList.contains('breathe');
    }
    const r = await CS.tapCard(q.options.indexOf(q.answer));
    if (r !== 'goal' && r !== 'done') smokeA = false;
    steps++;
  }
  const lvA = CS.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && steps === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat10（ch3 大数字域 [0,20] d∈[2,5]）链值域内+车厢 DOM 对账+autoSolve 3 星 ---- */
  total++;
  startLevel(10);
  const L10 = genLevel(10);
  /* 首题态：车头=s0 + 空车厢=?（2 节车） */
  const headOk10 = !!carEl(0) && carEl(0).querySelector('.cv').textContent === String(L10.s0);
  const tailOk10 = !!carEl(1) && carEl(1).querySelector('.car').classList.contains('empty');
  const dOk10 = L10.quizzes.every(q => q.d >= 2 && q.d <= 5 &&
    q.cur >= 0 && q.cur <= 20 && q.answer >= 0 && q.answer <= 20);
  const a10 = await CS.autoSolve();
  const lv10 = CS.currentLevel;
  /* 通关态：6 节车全填（车头 s0 + 5 个结果），车厢 DOM 数字与引擎链逐一一致 */
  const chainVals = [L10.s0].concat(L10.quizzes.map(q => q.answer));
  const slotsAll = Array.prototype.slice.call(trainEl.querySelectorAll('.carslot'));
  const domChainOk = lv10.done && slotsAll.length === 6 &&
    chainVals.every((v, i) => slotsAll[i] &&
      slotsAll[i].querySelector('.cv').textContent === String(v));
  const smokeOkB1 = headOk10 && tailOk10 && dOk10 && domChainOk && a10.done && lv10.done &&
    lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat10 = { ok: smokeOkB1, headOk: headOk10, tailOk: tailOk10, dOk: dOk10,
    domChain: domChainOk, taps: a10.taps, stars: engStars(cur),
    qs: L10.quizzes.map(q => q.cur + q.op + q.d + '=' + q.answer) };

  /* ---- ④ UI 冒烟 B2：flat17（ch4 高频交替）± 各 ≥1+切换 ≥3+真实点击通关 ---- */
  total++;
  startLevel(17);
  const L17 = genLevel(17);
  const ops17 = L17.quizzes.map(q => q.op);
  let sw17 = 0;
  for (let k = 1; k < ops17.length; k++) if (ops17[k] !== ops17[k - 1]) sw17++;
  const kindsOk = ops17.indexOf('+') >= 0 && ops17.indexOf('-') >= 0 && sw17 >= 3;
  let mixTapOk = true;
  for (let s = 0; s < CH_LEN && mixTapOk; s++) {
    const q = CS.quiz;
    if (!q) { mixTapOk = false; break; }
    const r = await CS.tapCard(q.options.indexOf(q.answer));
    if (r !== 'goal' && r !== 'done') mixTapOk = false;
  }
  const lv17 = CS.currentLevel;
  const smokeOkB2 = kindsOk && mixTapOk && lv17.done && lv17.won && lv17.retries === 0;
  if (smokeOkB2) npass++;
  smokes.flat17 = { ok: smokeOkB2, kinds: kindsOk, switches: sw17, ops: ops17, retries: lv17.retries };

  /* ---- ⑤ 布局：双 viewport 模拟 ×（flat0 首题 2 节车 / flat17 推进至 6 节车=最宽链） ---- */
  async function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                 // 按新场地尺寸重排
    await wait(750);                              /* 等入场动画结束再量（§0.11 transform 中途陷阱） */
    const de = document.documentElement;
    const q = CS.quiz;
    const slots = Array.prototype.slice.call(trainEl.querySelectorAll('.carslot'));
    const nCars = Math.min(cur.step, CH_LEN) + 2;
    let carsOk = slots.length === nCars;          // 车厢数=step+2 + 车厢数字与链一致（尾部=?）
    slots.forEach((s, i) => {
      const t = s.querySelector('.cv').textContent;
      const want = i === nCars - 1 ? '?' : String(i === 0 ? cur.s0 : cur.quizzes[i - 1].answer);
      if (t !== want) carsOk = false;
    });
    const carRects = slots.map(s => s.getBoundingClientRect());
    const carSzOk = carRects.every(r => r.width >= 64 && r.height >= 56);    /* 车厢可读尺寸 */
    const sign = trainEl.querySelector('.carslot.tail .opsign b');
    const sr = sign ? sign.getBoundingClientRect() : null;
    const signOk = !!sr && sr.width >= 36 && sr.height >= 22 &&
      sign.textContent === q.op + q.d;            /* 运算牌大字可见且与题面同步 */
    const cards = Array.prototype.slice.call(cardsEl.querySelectorAll('.cardbtn'));
    const rects = cards.map(c => c.getBoundingClientRect());
    const cardOk = rects.length === 3 &&
      rects.every(r => r.width >= 96 && r.height >= 96);          /* 主答案按钮 ≥96（§0.9） */
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const fRect = fieldEl.getBoundingClientRect();
    const insideOk = carRects.every(r =>          // 车厢在场景内（不溢出）
      r.left >= fRect.left - 1 && r.right <= fRect.right + 1 &&
      r.top >= fRect.top - 1 && r.bottom <= fRect.bottom + 1);
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, dch: cur.dch, step: cur.step, carsOk: carsOk, carSz: carSzOk,
      signOk: signOk, card96: cardOk, btn64: btnOk, insideOk: insideOk, ox: ox,
      pass: carsOk && carSzOk && signOk && cardOk && btnOk && insideOk && ox <= 0 };
  }
  total++;
  const sims = [];
  startLevel(0);                                  // 首题态：车头+空车厢（2 节）
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  startLevel(17);                                 // ch4 推进 4 题：6 节车=最宽链
  for (let k = 0; k < 4; k++) engTap(cur, cur.quizzes[k].options.indexOf(cur.quizzes[k].answer));
  renderQuiz();
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：op 分布 / d 上限覆盖 / numCn 字表 / qSpeech 拼句 / clips 注入 / 开场链 ---- */
  total++;
  /* numCn 独立字表对账（零手抄）：1-20 逐一相符且互异 */
  const NUMCN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  let cnOk = true;
  const seenCn = {};
  if (numCn(0) !== '零') cnOk = false;             /* 审查 M1：0 数词臂（answer=0 链推进可达 cur=0） */
  for (let i = 1; i <= 20; i++) {
    if (numCn(i) !== NUMCN[i]) cnOk = false;
    if (seenCn[numCn(i)]) cnOk = false;
    seenCn[numCn(i)] = 1;
  }
  /* qSpeech 独立拼句对账（SPEC §1 例句 '八加三等于几呀'） */
  const spOk = qSpeech({ cur: 8, op: '+', d: 3 }) === '八加三等于几呀' &&
    qSpeech({ cur: 9, op: '-', d: 2 }) === '九减二等于几呀' &&
    qSpeech({ cur: 12, op: '+', d: 5 }) === '十二加五等于几呀' &&
    qSpeech({ cur: 20, op: '-', d: 6 }) === '二十减六等于几呀' &&
    qSpeech({ cur: 0, op: '+', d: 2 }) === '零加二等于几呀';    /* 审查 M1：cur=0 型 */
  /* cs_* clips 注入对账（T46 阶段2：3 句+25 段=cs_n_ 0-20/op×2/tail+wrong） */
  const CS_KEYS = ['cs_hint', 'cs_tut_turn', 'cs_tut_watch', 'cs_wrong',
    'cs_op_add', 'cs_op_sub', 'cs_tail']
    .concat(Array.from({ length: 21 }, (_, i) => 'cs_n_' + i));
  const clipOk = CS_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录；T46 阶段2）：queue([cs_hint, 题面段…]) 单通道链 */
  const origP = KIDS.voice.play, origS = KIDS.voice.say, origQ = KIDS.voice.queue;
  const playLog = [], sayLog = [], qLog = [];
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  startLevel(0);
  const q0b = genLevel(0).quizzes[0];
  const openQ = qLog.some(p => p.length === 5 && p[0] === 'cs_hint' &&
    p.slice(1).every((k, i) => k === qParts(q0b)[i]));       // 开场链=hint+题面 4 段
  KIDS.voice.play = origP; KIDS.voice.say = origS; KIDS.voice.queue = origQ;
  const distOk = cnOk && spOk && clipOk && openQ &&
    opDist[1].plus >= 1 && opDist[1].minus >= 1 &&
    opDist[2].plus >= 1 && opDist[2].minus >= 1 &&
    opDist[3].plus >= 1 && opDist[3].minus >= 1 &&
    opDist[4].plus >= 1 && opDist[4].minus >= 1 &&
    genOp.plus >= 1 && genOp.minus >= 1 &&                         /* 生成关随机参数两类都出现 */
    dMax[1] === PARAMS[1].d[1] && dMax[2] === PARAMS[2].d[1] &&    /* 各章 d 上限有覆盖 */
    dMax[3] === PARAMS[3].d[1] && dMax[4] === PARAMS[4].d[1];
  if (distOk) npass++;
  units.dist = { ok: distOk, numCn: cnOk, speech: spOk, clips: clipOk,
    openQ: openQ, opDist: opDist, genOp: genOp, dMax: dMax };

  const out = { game: 'chainsum', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  runVerify();
}
