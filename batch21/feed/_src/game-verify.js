/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 60 关全量审计（六章×2 轮，V_FLATS=60）（flat 0-59：静态 30 + 生成 20）：确定性（同 flat 两次生成 JSON 一致）/
     章号 1 基+难度章循环 / r8 章规则独立重列（SPEC §1-r8 文字直译，禁引引擎常量互证）：
       dch1 pick 6-7 单堆 / dch2 pick 6-8 单堆 / dch3 pick 8-10 单堆 / dch4 pick 6-9 双堆 /
       dch5 left（n 7-10、eaten 2-4、rem=n-eaten 3-8，单堆，整关恒 left）/
       dch6 combo（foods 两异、a,b 2-5、合计 6-10，三堆，整关恒 combo）/
     structWhy / 相邻题签名互异 / flat0-qi0 钉 n=6 胡萝卜（教学演示=正解）/
     引擎直驱（首题欠点错（碗不清空）→ 错堆探针 → left 两阶段（含 engCount 顺序点数）→
     combo 双类填 → 全题喂对通关 2 星；另全净 3 星）/
     r8 时长硬断言：每关推算 Σ[estMs(题句)+ΣTAP+窗] ≥ 40000ms（独立副本重列+与源模型对账）
   ② 碗计数状态机单元（flat0 真实 UI）：题面 chip=图形+数字 / 数词 TTS 同步 / 取回倒读含'零' /
     错堆轻反馈不计数不 miss / 越点撤销就绪 / 碗空取回 false
   ②b 提交错路径单元：提交时≠需求（欠点）——零惩罚碗不清空（区分新旧行为强断言：
     错后碗 DOM 与 _bowl 均不动）+ 1000ms 防重入窗内 tapFood/tapBowl 均拒绝（b16 定案）
   ③ 点满自动判单元（§0.46 两款并用）：==需求按钮 .ready 亮起 → grace 窗后无 submit 自动推进；
     越点/取回撤销就绪且不误判
   ④ r8 left 剩题单元（flat20=dch5）：先取 n → 'eat'（不清屏——剩 rem 件上垫可见、碗清空、
     chip 显 '?'、field.left2）→ 点数圆点支持（顺序点数 1..rem 亮 dot；乱序/重复点拒绝）→
     连错 2 次恒无逐根高亮（r8 去逐根高亮兜底）→ 越点取回修正 → 镜像作答判对
   ⑤ r8 combo 合计订单单元（flat25=dch6）：chip 双组图形+数字+加号 / 干扰堆 miss-food /
     只填一类提交=wrong 碗不清空（合计判定=逐类匹配）/ 补齐双类 → 判对推进
   ⑥ UI 冒烟：flat0 真实通路（1 错=2 星）/ flat5 autoSolve 3 星 / flat15 双堆 / flat20 left /
     flat25 combo autoSolve 3 星
   ⑦ sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / 不灰化款 miss===2 豁免恰一次
   ⑧ 教学链单元：直调 tutorialWatch——watch clip → 演示取 6 根（数词「一」…「六」同步）→
     演示喂对 __fdDemoR='right' → 重发同关 → turn clip → 2000ms 接力题面 TTS → state 'help'
   ⑨ 分布与家族：语音文案 7 条字面量对账 / quizSpeech·comboSpeech 独立拼句对账 / numCn 数词 /
     fed_* 7 条 + core 3 条 clips 注入对账 / 零文字依赖审计（题面=数字或'?'，堆/碗/垫零文字）/
     estMs 家族（n*345+600 定版，禁 +300 变体）/ nextHint 章末逐点独立副本断言（SPEC §1-r8）
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（flat0 单堆 / flat20 left 问句态（垫+碗+堆）/
     flat25 combo 三堆双组 chip）：量测一律 offsetWidth/offsetHeight（§0.11 动画中间帧压扁坑）：
     堆/碗件/剩物件/全按钮 ≥64（.k-parentbtn 豁免）、喂食主按钮 ≥96、题面 chip ≥64 且数字可见、
     overflowX ≤0
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const foodDist = { carrot: 0, greens: 0, apple: 0 };
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  /* ---- r8 独立副本：SPEC §1-r8 数值/文案/时长模型重列（禁引 TAP_MS/CHAPTERS 等引擎常量互证） ---- */
  const V_EST = c => c * 345 + 600;
  const V_TAP = 2000, V_RIGHT = 2400, V_EAT = 900;
  const V_ASK = V_EST(15) + V_EST(11) + V_EAT;
  const V_MIN = 40000, V_FLATS = 60;   /* 静态 30 + 生成 30（六章循环整整两轮，dch 全覆盖） */
  function vNum(n) {
    const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (n < 10) return D[n];
    if (n === 10) return '十';
    return '';
  }
  const vName = { carrot: '胡萝卜', greens: '青菜', apple: '苹果' };
  const vMw = { carrot: '根', greens: '片', apple: '个' };
  function vQuizSpeech(q) { return '喂小兔子' + vNum(q.n) + vMw[q.food] + vName[q.food]; }
  function vComboSpeech(q) {
    return '喂小兔子，' + vNum(q.a) + vMw[q.foods[0]] + vName[q.foods[0]] +
      '，' + vNum(q.b) + vMw[q.foods[1]] + vName[q.foods[1]];
  }
  function vDur(q) {                            // 单题推算（r8 三题型分账）
    if (q.kind === 'combo') return V_EST(vComboSpeech(q).length) + (q.a + q.b) * V_TAP + V_RIGHT;
    if (q.kind === 'left')
      return V_EST(vQuizSpeech(q).length) + q.n * V_TAP + V_ASK + q.rem * V_TAP + V_RIGHT;
    return V_EST(vQuizSpeech(q).length) + q.n * V_TAP + V_RIGHT;
  }
  const vLevelDur = L => L.quizzes.reduce((s, q) => s + vDur(q), 0);
  /* r8 章规则：SPEC §1-r8 表逐行直译 */
  function vRuleOk(q, dch, npiles) {
    if (dch === 1) return q.kind === 'pick' && q.n >= 6 && q.n <= 7 && npiles === 1;
    if (dch === 2) return q.kind === 'pick' && q.n >= 6 && q.n <= 8 && npiles === 1;
    if (dch === 3) return q.kind === 'pick' && q.n >= 8 && q.n <= 10 && npiles === 1;
    if (dch === 4) return q.kind === 'pick' && q.n >= 6 && q.n <= 9 && npiles === 2;
    if (dch === 5) return q.kind === 'left' && q.n >= 7 && q.n <= 10 &&
      q.eaten >= 2 && q.eaten <= 4 && q.rem === q.n - q.eaten && q.rem >= 3 && q.rem <= 8 && npiles === 1;
    return q.kind === 'combo' && Array.isArray(q.foods) && q.foods.length === 2 &&
      q.foods[0] !== q.foods[1] && q.a >= 2 && q.a <= 5 && q.b >= 2 && q.b <= 5 &&
      q.a + q.b >= 6 && q.a + q.b <= 10 && npiles === 3;
  }
  const vSig = q => q.kind + ':' + (q.kind === 'combo'
    ? q.foods[0] + q.foods[1] + '=' + (q.a + q.b)
    : q.food + '@' + q.n + (q.kind === 'left' ? '-' + q.eaten : ''));

  /* ---- ① 60 关全量审计（六章×2 轮，V_FLATS=60）（flat 0-59） ---- */
  const durAll = [];
  let durMin = Infinity, durMax = 0;
  for (let flat = 0; flat < V_FLATS; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const chOk = L1.ch === Math.floor(flat / 5) + 1 && L1.quizzes.length === 5;
    const dchOk = L1.dch === (L1.ch - 1) % 6 + 1;   // 六章循环（静态与生成关同式）
    if (flat >= 30) genDch[L1.dch]++;
    let structAll = true, ruleOk = true, adjOk = true, driveOk = true, hotOk = true;
    if (flat === 0) {                            // 教学演示题钉 n=6 胡萝卜（flat0 特例，仅关 0）
      const h0 = L1.quizzes[0];
      if (!(h0.kind === 'pick' && h0.food === 'carrot' && h0.n === 6 && h0.piles.length === 1)) hotOk = false;
    }
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q, L1.dch)) structAll = false;
      if (!vRuleOk(q, L1.dch, q.piles.length)) ruleOk = false;
      if (q.kind !== 'combo') foodDist[q.food]++;
      else q.foods.forEach(f => foodDist[f]++);
      if (k > 0 && vSig(L1.quizzes[k - 1]) === vSig(q)) adjOk = false;   // 相邻题签名互异
    }
    const durMs = vLevelDur(L1);
    durAll.push(durMs);
    if (durMs < durMin) durMin = durMs;
    if (durMs > durMax) durMax = durMs;
    if (durMs < V_MIN) ruleOk = false;                                              // r8 时长硬断言 ≥40s
    if (levelDurMs(L1) !== durMs) ruleOk = false;                                   // 源模型与独立副本对账一致
    if (L1.quizzes.some(q => q.kind === 'combo'
        ? vComboSpeech(q) !== comboSpeech(q) : vQuizSpeech(q) !== quizSpeech(q))) ruleOk = false;
    /* 引擎直驱 A：首题欠点错一次 → 错堆探针（有干扰堆时）→ 全题喂对通关（1 错=2 星） */
    const Ld = genLevel(flat);
    {
      const q0 = Ld.quizzes[0];
      const f0 = q0.kind === 'combo' ? q0.foods[0] : q0.food;
      if (engTapFood(Ld, f0) !== 1) driveOk = false;                              // 欠点臂：碗内 1 ≠ 需求
      if (engSubmit(Ld) !== 'wrong' || Ld.retries !== 1 || q0._miss !== 1 ||
          (q0._bowl[f0] || 0) !== 1) driveOk = false;                             // 错后碗不清空（_bowl 仍 1）
    }
    let guard = 0;
    while (!Ld.done && driveOk && guard++ < 25) {
      const q = Ld.quizzes[Ld.step];
      const nd = needOf(q);
      const wf = q.piles.find(k => !(k in nd)) || null;
      if (wf) {                                                                   // 错堆：不计入不算错（§0.46）
        const cntB = q._bowl[wf] || 0, missB = q._miss;
        if (engTapFood(Ld, wf) !== 'miss-food' || (q._bowl[wf] || 0) !== cntB ||
            q._miss !== missB) driveOk = false;
      }
      let taps = 0;
      const pre = Object.keys(q._bowl).reduce((s, f) => s + q._bowl[f], 0);   // 欠点臂已取的 1 件
      Object.keys(nd).forEach(f => { for (let i = q._bowl[f] || 0; i < nd[f]; i++) {
        if (engTapFood(Ld, f) === null) driveOk = false; taps++;
      } });
      const r1 = engFeed(Ld);
      if (q.kind === 'left' && r1 === 'eat') {   // 剩题两阶段：吃掉→点数支持→镜像作答
        if (q.phase !== 2 || Object.keys(q._bowl).some(f => q._bowl[f] !== 0)) driveOk = false;
        if (engCount(Ld, 1) !== null) driveOk = false;                            // 乱序点数拒绝
        for (let i = 0; i < q.rem; i++) {
          if (engCount(Ld, i) !== i + 1) driveOk = false;                         // 顺序点数 1..rem
          if (engCount(Ld, i) !== null) driveOk = false;                          // 重复点拒绝
        }
        for (let i = 0; i < q.rem; i++) if (engTapFood(Ld, q.food) === null) driveOk = false;
        taps += q.rem;
        const r2 = engFeed(Ld);
        if (r2 !== 'right' && r2 !== 'done') driveOk = false;
        if (q._judged !== true) driveOk = false;
      } else if (r1 !== 'right' && r1 !== 'done') driveOk = false;
      if (q.kind === 'left' && taps + pre !== q.n + q.rem) driveOk = false;       // 取物总账：先 n 后 rem
    }
    if (!Ld.done || Ld.step !== 5 || Ld.retries !== 1 || engStars(Ld) !== 2) driveOk = false;
    /* 引擎直驱 B：全净通关 3 星（left 两阶段+combo 双类全直驱） */
    const L3 = genLevel(flat);
    guard = 0;
    let clean = true;
    while (!L3.done && clean && guard++ < 25) {
      const q = L3.quizzes[L3.step];
      const nd = needOf(q);
      Object.keys(nd).forEach(f => { for (let i = q._bowl[f] || 0; i < nd[f]; i++) engTapFood(L3, f); });
      const r1 = engFeed(L3);
      if (q.kind === 'left' && r1 === 'eat') {
        for (let i = 0; i < q.rem; i++) engTapFood(L3, q.food);
        const r2 = engFeed(L3);
        if (r2 !== 'right' && r2 !== 'done') clean = false;
      } else if (r1 !== 'right' && r1 !== 'done') clean = false;
    }
    if (!L3.done || engStars(L3) !== 3) clean = false;
    const ok = det && chOk && dchOk && structAll && ruleOk && adjOk && hotOk && driveOk && clean;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, ruleOk: ruleOk,
      adjOk: adjOk, driveOk: driveOk, clean: clean, hotOk: hotOk, durMs: durMs,
      qs: L1.quizzes.map(q => q.kind === 'combo'
        ? 'c' + q.foods[0].slice(0, 2) + q.a + '+' + q.foods[1].slice(0, 2) + q.b
        : q.kind[0] + q.food.slice(0, 3) + q.n + (q.kind === 'left' ? '-' + q.eaten : '')) };
    if (flat < 30) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 碗计数状态机单元（flat0 真实 UI：题面钉 n=6 胡萝卜；同步块原子防 grace 误判） ---- */
  total++;
  startLevel(0);
  const q0 = FD.quiz;
  const pileBtns = Array.prototype.slice.call(pilesEl.querySelectorAll('.pile'));
  const numEl = chipEl.querySelector('.num');
  /* DOM 对账（渲染即引擎）：chip=图形+数字 6、单堆胡萝卜、数字零文字依赖（仅数字） */
  const alignOk = q0 && q0.kind === 'pick' && q0.food === 'carrot' && q0.n === 6 &&
    q0.need.carrot === 6 && pileBtns.length === 1 && pileBtns[0].dataset.food === 'carrot' &&
    numEl.textContent === '6' && chipEl.querySelector('.glyph svg') !== null;
  const says = [];
  const origPlay2a = KIDS.voice.play;
  /* T46 阶段2：取物/倒读数词 say→fed_n_{k} clip（SPEC=类内计数 k 逐拍播报，期望键序列从
     数据流推导：1..7 顺数 + 6..0 倒读，不从实现归纳） */
  KIDS.voice.play = function (key, text) { if (key) says.push(String(key)); };
  const rMiss = FD.tapFood('apple');            // 错堆：不计数不 miss 不数词（探索≠错）
  const missOk = rMiss === 'miss-food' && says.length === 0 &&
    bowlItemsEl.querySelectorAll('.bitem').length === 0 && FD.quiz.miss === 0;
  for (let i = 1; i <= 6; i++) FD.tapFood('carrot');   // 数词同步「一」…「六」→ 第 6 根就绪
  const readySeen = feedBtn.classList.contains('ready');
  const c7 = FD.tapFood('carrot');              // 越点「七」→ 撤销就绪
  const overOk = c7 === 7 && !feedBtn.classList.contains('ready') && FD.quiz.step === 0;
  let bPrev = -1, backOk6 = true;
  for (let i = 0; i < 7; i++) {                 // 取回倒读「六」…「零」
    const r = FD.tapBowl('carrot');
    if (r !== 6 - i) backOk6 = false;
    bPrev = r;
  }
  const b0 = bPrev === 0;
  const bEmpty = FD.tapBowl('carrot');          // 碗空取回 false
  KIDS.voice.play = origPlay2a;
  const cntOk = backOk6 && b0 && bEmpty === false &&
    says.join(',') === 'fed_n_1,fed_n_2,fed_n_3,fed_n_4,fed_n_5,fed_n_6,fed_n_7,' +
                      'fed_n_6,fed_n_5,fed_n_4,fed_n_3,fed_n_2,fed_n_1,fed_n_0' &&
    bowlItemsEl.querySelectorAll('.bitem').length === 0 &&
    FD.quiz.step === 0 && FD.quiz.miss === 0 && FD.quiz.bowl.carrot === 0;
  const unitOk2 = alignOk && missOk && overOk && cntOk && readySeen;
  if (unitOk2) npass++;
  units.bowl = { ok: unitOk2, align: alignOk, missFood: missOk, over: overOk, count: cntOk,
    ready: readySeen, says: says };

  /* ---- ②b 提交错路径单元：欠点错+1000ms 防重入窗（真实 UI） ---- */
  total++;
  startLevel(0);
  for (let i = 0; i < 5; i++) FD.tapFood('carrot');   // 碗内 5 ≠ 需求 6
  const bowlBefore = bowlItemsEl.querySelectorAll('.bitem').length;
  const pW = FD.submit();                        // 错：promise 在防重入窗内（同步段先加 wig）
  const wigSeen = feedBtn.classList.contains('wig');
  const rejTap = FD.tapFood('carrot');           // 窗内取物拒绝（§0.26）
  const rejTake = FD.tapBowl('carrot');          // 窗内取回拒绝
  const rW = await pW;
  const wrongOk = rW === 'wrong' && rejTap === false && rejTake === false &&
    FD.currentLevel.retries === 1 && FD.quiz.step === 0 && FD.quiz.miss === 1 &&
    bowlItemsEl.querySelectorAll('.bitem').length === bowlBefore &&   /* 零惩罚：碗不清空（新旧行为强断言） */
    FD.quiz.bowl.carrot === 5 && wigSeen;
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, r: rW, rejTap: rejTap, rejTake: rejTake,
    bowlKept: bowlItemsEl.querySelectorAll('.bitem').length === bowlBefore };

  /* ---- ③ 点满自动判单元（§0.46 两款并用：需求满足按钮亮起脉冲+点满即判） ---- */
  total++;
  startLevel(0);
  for (let i = 0; i < 6; i++) FD.tapFood('carrot');   // ==6 就绪 → grace 窗自动判（无 submit）
  const rdyA = feedBtn.classList.contains('ready');
  await wait(GRACE_MS * SPEED + 700 * SPEED + 120);   /* grace→自动提交→吃食演出+fed_right 窗 */
  const autoOk = rdyA && FD.currentLevel.step === 1 && FD.quiz && FD.quiz.step === 1 &&
    FD.quiz.miss === 0;
  startLevel(0);                                 // 越点撤销：就绪消失且不误判
  for (let i = 0; i < 7; i++) FD.tapFood('carrot');
  await wait(GRACE_MS * SPEED + 200);
  const overNoFire = FD.currentLevel.step === 0 && !feedBtn.classList.contains('ready');
  FD.tapBowl('carrot');                          // 取回到 6 → 再就绪 → 立即取回到 5 撤销（grace 不点火）
  FD.tapBowl('carrot');
  await wait(GRACE_MS * SPEED + 200);
  const takeNoFire = FD.currentLevel.step === 0;
  const graceOk = autoOk && overNoFire && takeNoFire;
  if (graceOk) npass++;
  units.grace = { ok: graceOk, auto: autoOk, overCancel: overNoFire, takeCancel: takeNoFire };

  /* ---- ④ r8 left 剩题单元（flat20=dch5：先取 n→吃掉不清屏→点数→镜像作答） ---- */
  total++;
  startLevel(20);
  const qa0 = FD.quiz;
  let eatOk = false, askOk = false, countOk = false, noHiOk = false, solveLeft = false;
  if (qa0 && qa0.kind === 'left') {
    for (let i = 0; i < qa0.n; i++) FD.tapFood(qa0.food);   // 先取 n（同步块：grace 不误判）
    const re = await FD.submit();                           // 'eat'：兔兔吃掉 eaten 件（不清屏）
    eatOk = re === 'eat' && bowlItemsEl.querySelectorAll('.bitem').length === 0;
    const q2 = FD.quiz;
    /* 问句态：chip 显 '?'（去自动计数器）、剩 rem 件上垫可见、field.left2、need 切 rem */
    askOk = !!q2 && q2.phase === 2 && q2.target === qa0.rem && q2.need[qa0.food] === qa0.rem &&
      q2.rem === qa0.n - qa0.eaten && chipEl.querySelector('.num').textContent === '?' &&
      chipEl.classList.contains('add2') && fieldEl.classList.contains('left2') &&
      leftoversEl.querySelectorAll('.leftover').length === qa0.rem &&
      leftoversEl.style.display === 'flex';
    /* 连错 2 次（空碗提交）：零惩罚+恒无逐根高亮（r8 去逐根高亮兜底） */
    await FD.submit();
    await FD.submit();
    noHiOk = FD.quiz.miss === 2 && FD.quiz.step === 0 &&
      leftoversEl.querySelectorAll('.leftover').length === qa0.rem &&
      document.querySelectorAll('.leftover.breathe, .leftover.pulse, .bitem.breathe').length === 0;
    /* 点数圆点支持：乱序/重复拒绝，顺序点数亮 dot+数词 clip（fed_n_1..3，T46 阶段2） */
    const cnt = [];
    const origPlay4 = KIDS.voice.play;
    KIDS.voice.play = function (key) { if (key) cnt.push(String(key)); };
    const bad1 = FD.tapLeftover(1);              // 乱序 → false
    const s0 = FD.tapLeftover(0);                // 1「一」
    const dup0 = FD.tapLeftover(0);              // 重复 → false
    const s1 = FD.tapLeftover(1);                // 2「二」
    const s2 = FD.tapLeftover(2);                // 3「三」
    KIDS.voice.play = origPlay4;
    const dots = leftoversEl.querySelectorAll('.leftover.counted').length;
    countOk = bad1 === false && s0 === 1 && dup0 === false && s1 === 2 && s2 === 3 &&
      cnt.join(',') === 'fed_n_1,fed_n_2,fed_n_3' && dots === 3 && FD.quiz.counted === 3;
    /* 越点取回修正 → 镜像作答（取 rem+2 → 取回 2 → 就绪 → 判对推进） */
    for (let i = 0; i < qa0.rem + 2; i++) FD.tapFood(qa0.food);
    FD.tapBowl(qa0.food);
    FD.tapBowl(qa0.food);
    const rf = await FD.submit();
    solveLeft = (rf === 'right' || rf === 'done') && FD.currentLevel.step === 1;
  }
  const addOk2 = eatOk && askOk && countOk && noHiOk && solveLeft;
  if (addOk2) npass++;
  units.left = { ok: addOk2, eat: eatOk, ask: askOk, count: countOk, noHighlight: noHiOk,
    solve: solveLeft, q: qa0 && { kind: qa0.kind, food: qa0.food, n: qa0.n,
    eaten: qa0.eaten, rem: qa0.rem } };

  /* ---- ⑤ r8 combo 合计订单单元（flat25=dch6：双组 chip / 干扰堆 / 合计判定） ---- */
  total++;
  startLevel(25);
  const qc0 = FD.quiz;
  let chipOk = false, dOk = false, partOk = false, fullOk = false;
  if (qc0 && qc0.kind === 'combo') {
    const nums = Array.prototype.map.call(chipEl.querySelectorAll('.num'), el => el.textContent);
    chipOk = chipEl.classList.contains('combo') && nums.length === 2 &&
      nums[0] === String(qc0.a) && nums[1] === String(qc0.b) &&
      chipEl.querySelector('.plus svg') !== null &&
      chipEl.querySelectorAll('.glyph svg').length === 2;
    const wf = qc0.piles.find(k => k !== qc0.foods[0] && k !== qc0.foods[1]);
    const rD = FD.tapFood(wf);                   // 干扰堆：miss-food 不计数不算错
    dOk = rD === 'miss-food' && FD.quiz.miss === 0 && FD.quiz.bowl[wf] === undefined &&
      Object.keys(FD.quiz.bowl).length === 2 &&
      FD.quiz.bowl[qc0.foods[0]] === 0 && FD.quiz.bowl[qc0.foods[1]] === 0;
    for (let i = 0; i < qc0.a; i++) FD.tapFood(qc0.foods[0]);   // 只填一类 → 未就绪
    const partReady = feedBtn.classList.contains('ready');
    const rP = await FD.submit();                // 提交=wrong（合计判定=逐类匹配；碗不清空）
    partOk = !partReady && rP === 'wrong' && FD.quiz.miss === 1 &&
      FD.quiz.bowl[qc0.foods[0]] === qc0.a && FD.quiz.step === 0;
    for (let i = 0; i < qc0.b + 1; i++) FD.tapFood(qc0.foods[1]);   // 第二类越点 1 → 未就绪
    const overReady = feedBtn.classList.contains('ready');
    FD.tapBowl(qc0.foods[1]);                    // 取回 1 → 双类齐 → 就绪
    const fixReady = feedBtn.classList.contains('ready');
    const rF = await FD.submit();                // 合计满足 → 判对推进
    fullOk = !overReady && fixReady && (rF === 'right' || rF === 'done') &&
      FD.currentLevel.step === 1;
  }
  const comboOk2 = chipOk && dOk && partOk && fullOk;
  if (comboOk2) npass++;
  units.combo = { ok: comboOk2, chip: chipOk, distractor: dOk, partial: partOk, full: fullOk,
    q: qc0 && { kind: qc0.kind, foods: qc0.foods, a: qc0.a, b: qc0.b } };

  /* ---- ⑥ UI 冒烟 ---- */
  total++;                                       // A：flat0 真实通路（1 错=2 星，不弹层）
  startLevel(0);
  const rw0 = await FD.submit();                 // 空碗提交 → 错 1 次
  let stepsA = 0, solveA = true;
  for (let s = 0; s < 5 && solveA; s++) {
    const q = FD.quiz;
    if (!q) { solveA = false; break; }
    for (const f in q.need) for (let i = q.bowl[f] || 0; i < q.need[f]; i++) FD.tapFood(f);
    const r = await FD.submit();
    if (r !== 'right' && r !== 'done') solveA = false;
    stepsA++;
  }
  const lvA = FD.currentLevel;
  const smokeA = rw0 === 'wrong' && solveA && stepsA === 5 && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, retries: lvA.retries, stars: engStars(cur) };

  total++;                                       // B：flat5（dch2 定量 6-8）autoSolve 3 星
  startLevel(5);
  const aB = await FD.autoSolve();
  const lvB = FD.currentLevel;
  const smokeB = aB.done && lvB.done && lvB.won && lvB.retries === 0 && engStars(cur) === 3;
  if (smokeB) npass++;
  smokes.flat5 = { ok: smokeB, taps: aB.taps, stars: engStars(cur) };

  total++;                                       // C：flat15（dch4 双堆）错堆不计 miss + autoSolve 3 星
  startLevel(15);
  const qC = FD.quiz;
  const wfC = qC.piles.find(f => f !== qC.food);
  const missC1 = FD.tapFood(wfC);
  const missC2 = FD.tapFood(wfC);
  const pileWig = pileEl(wfC).classList.contains('wig');
  const noCnt = FD.quiz.bowl[qC.food] === 0 && FD.quiz.miss === 0;
  const aC = await FD.autoSolve();
  const lvC = FD.currentLevel;
  const smokeC = missC1 === 'miss-food' && missC2 === 'miss-food' && pileWig && noCnt &&
    aC.done && lvC.done && lvC.retries === 0 && engStars(cur) === 3;
  if (smokeC) npass++;
  smokes.flat15 = { ok: smokeC, wrongPile: wfC, noCount: noCnt, stars: engStars(cur) };

  total++;                                       // D：flat20（dch5 left 全关）autoSolve 3 星
  startLevel(20);
  const hasLeft = genLevel(20).quizzes.every(q => q.kind === 'left');
  const aD = await FD.autoSolve();
  const lvD = FD.currentLevel;
  const smokeD = hasLeft && aD.done && lvD.done && lvD.won && lvD.retries === 0 && engStars(cur) === 3;
  if (smokeD) npass++;
  smokes.flat20 = { ok: smokeD, hasLeft: hasLeft, taps: aD.taps, stars: engStars(cur) };

  total++;                                       // E：flat25（dch6 combo 全关）autoSolve 3 星
  startLevel(25);
  const hasCombo = genLevel(25).quizzes.every(q => q.kind === 'combo');
  const aE = await FD.autoSolve();
  const lvE = FD.currentLevel;
  const smokeE = hasCombo && aE.done && lvE.done && lvE.won && lvE.retries === 0 && engStars(cur) === 3;
  if (smokeE) npass++;
  smokes.flat25 = { ok: smokeE, hasCombo: hasCombo, taps: aE.taps, stars: engStars(cur) };

  /* ---- ⑦ sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / ===2 豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key) { wLog.push(String(key)); };
  const wrongPlays = () => wLog.filter(k => k === 'fed_wrong').length;
  startLevel(0);                                 // flat0：每错必播
  await FD.submit(); await FD.submit();
  const sayA = wrongPlays();                     // → 2
  startLevel(3);                                 // flat3：10s 节流窗内 → 静默
  lastWrongVoice = Date.now();
  await FD.submit();
  const sayB = wrongPlays() - 2;                 // 增量 → 0
  startLevel(3);                                 // 同关重发：miss 1→2→3（不灰化款可无限错）
  lastWrongVoice = 0;
  await FD.submit();                             // miss=1 → 播（节流窗外）
  await FD.submit();                             // miss=2 → force ===2 → 播（豁免恰一次）
  await FD.submit();                             // miss=3 → 无 force+窗内 → 静默
  const sayC = wrongPlays() - 2 - sayB;          // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, forceOnce: sayC };

  /* ---- ⑧ 教学链单元（直调 tutorialWatch）+ 开场顺序链
     T46 阶段2：数词/题面 say→clip（fed_n_1..6 / fed_q_{n}_{食物}；题面走 queue 段链） ---- */
  total++;
  const vLog = [];
  const origPlay3 = KIDS.voice.play, origSay3 = KIDS.voice.say, origQ3 = KIDS.voice.queue;
  KIDS.voice.play = function (key) { vLog.push(['p', String(key)]); };
  KIDS.voice.say = function (t) { vLog.push(['s', String(t)]); };
  KIDS.voice.queue = function (parts) { vLog.push(['q', parts.slice()]); };
  startLevel(0);                                 // 干净起点（开场链 stub 记录在 vLog 前段）
  await tutorialWatch();                         // SPEED=0.12 提速：演示取 6 根→喂 很快完成
  const iw = vLog.findIndex(v => v[0] === 'p' && v[1] === 'fed_tut_watch');
  const demoR = window.__fdDemoR;
  const tutHelp = FD.tutorial === 'help' && FD.quiz && FD.quiz.step === 0 &&
    FD.quiz.miss === 0 && FD.currentLevel.retries === 0;   // 重发同关零污染
  const numIdx = [1, 2, 3, 4, 5, 6].map(k =>
    vLog.findIndex(v => v[0] === 'p' && v[1] === 'fed_n_' + k));   // 演示取 6 根数词同步（T46 clip）
  const it = vLog.findIndex(v => v[0] === 'p' && v[1] === 'fed_tut_turn');
  await wait(2300);                              // 等 2000ms 接力题面 clip 链落地
  const qRe = cur.quizzes[cur.step];
  const quizExpect = qRe.kind === 'combo'
    ? ['fed_c_head', 'fed_c_' + qRe.a + '_' + qRe.foods[0], 'fed_c_' + qRe.b + '_' + qRe.foods[1]]
    : ['fed_q_' + qRe.n + '_' + qRe.food];       /* SPEC 域推导（T46 键式），不从实现归纳 */
  const is = vLog.findIndex(v => v[0] === 'q' &&
    v[1].length === quizExpect.length && v[1].every((p, i) => p === quizExpect[i]));
  let seqOk = iw >= 0 && it > iw && is > it && numIdx.every(ix => ix > iw) && numIdx[0] >= 0;
  for (let k = 1; k < numIdx.length; k++) if (numIdx[k] <= numIdx[k - 1]) seqOk = false;
  const chainOk = demoR === 'right' && tutHelp && seqOk;   /* watch → 一…六 → turn → 题面 */
  KIDS.voice.play = origPlay3; KIDS.voice.say = origSay3; KIDS.voice.queue = origQ3;
  startLevel(0);                                 // 还原正常状态（后续单元用）
  if (chainOk) npass++;
  units.tutChain = { ok: chainOk, demoR: demoR, help: tutHelp,
    iw: iw, numIdx: numIdx, it: it, is: is, expect: quizExpect.join('+'),
    seq: vLog.filter(v => v[0] !== 'q' ? v[1].slice(0, 3) === 'fed' : true).slice(0, 12) };

  /* ---- ⑨ 分布与家族：文案同源 / 拼句对账 / 数词 / clips 注入 / 零文字审计 / estMs / nextHint ---- */
  total++;
  const vOk = VOICE.watch.key === 'fed_tut_watch' && VOICE.watch.text === '看！喂小兔子吃东西' &&
    VOICE.turn.key === 'fed_tut_turn' && VOICE.turn.text === '你来喂一喂' &&
    VOICE.hint.key === 'fed_hint' && VOICE.hint.text === '数一数，喂给它' &&
    VOICE.right.key === 'fed_right' && VOICE.right.text === '喂好啦，小兔子吃得真香' &&
    VOICE.wrong.key === 'fed_wrong' && VOICE.wrong.text === '再数一数有几根' &&
    VOICE.leftQ.key === 'fed_left_q' && VOICE.leftQ.text === '小兔子吃掉啦，数一数，还剩几根' &&
    VOICE.leftDo.key === 'fed_left_do' && VOICE.leftDo.text === '拿一样多的，喂给小兔子';
  const spOk = quizSpeech({ kind: 'pick', food: 'carrot', n: 6, phase: 1 }) === '喂小兔子六根胡萝卜' &&
    quizSpeech({ kind: 'left', food: 'apple', n: 8, phase: 1 }) === '喂小兔子八个苹果' &&
    comboSpeech({ kind: 'combo', foods: ['carrot', 'greens'], a: 4, b: 3 }) === '喂小兔子，四根胡萝卜，三片青菜' &&
    comboSpeech({ kind: 'combo', foods: ['apple', 'carrot'], a: 2, b: 5 }) === '喂小兔子，二个苹果，五根胡萝卜' &&
    numCn(0) === '零' && numCn(6) === '六' && numCn(10) === '十';
  const clipKeys = Object.keys(KIDS.voice.clips);
  const clipOk = ['fed_tut_watch', 'fed_tut_turn', 'fed_hint', 'fed_right', 'fed_wrong',
    'fed_left_q', 'fed_left_do',
    'core_chapter_end', 'core_day_end', 'core_rest'].every(k => clipKeys.indexOf(k) >= 0) &&
    /* T46 阶段2 新键族在场：题面 15+combo 段 13+数词 11+more——总 47 fed+3 core=50 */
    [6, 7, 8, 9, 10].reduce((a, n) => a.concat(FOOD_KEYS.map(f => 'fed_q_' + n + '_' + f)), [])
      .concat(['fed_c_head'])
      .concat([2, 3, 4, 5].reduce((a, n) => a.concat(FOOD_KEYS.map(f => 'fed_c_' + n + '_' + f)), []))
      .concat(Array.from({ length: 11 }, (_, i) => 'fed_n_' + i))
      .concat(['fed_more']).every(k => clipKeys.indexOf(k) >= 0) &&
    clipKeys.length === 50 && clipKeys.every(k => KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  /* estMs 家族定版（n*345+600，禁 +300 变体——与源模型 levelDurMs 对账在 ① 已做） */
  const estOk = estMs(1) === 945 && estMs(12) === 12 * 345 + 600 &&
    estMs.toString().indexOf('345') >= 0 && estMs.toString().indexOf('+ 300') < 0;
  /* r8 nextHint 章末逐点独立副本断言（SPEC §1-r8 文案重列，禁引 CHAPTERS/GEN_HINTS 互证）：
     静态章末 flat∈{4,9,14,19,24} 预告下一章；29=ch6 末→生成关 flat30（dch1）；
     34→flat35（dch2）；哨兵=nextHint(4) 不得等于 ch3 文案（off-by-one 回归，r7 审查 M1 同型） */
  const SPEC_HINT = { 4: '要数到八啦，数字越来越大了', 9: '马上要数到十，一根一根数清楚',
    14: '有两种食物啦，听清楚小兔子想吃什么', 19: '小兔子吃完还会剩几根，数一数再喂它',
    24: '两个都想要的来啦，胡萝卜和青菜一起喂', 29: '一次拿六七根', 34: '数到八才够吃' };
  const hintOk = Object.keys(SPEC_HINT).every(f => nextHint(+f) === SPEC_HINT[f]);
  const hintNeg = nextHint(4) !== '马上要数到十，一根一根数清楚';
  /* 零文字依赖审计（§0.19）：题面=数字或'?'、堆/碗件/剩物件/喂食主按钮零文字（aria 不算可见文字） */
  startLevel(0);
  FD.tapFood('carrot');
  const numTxt = chipEl.querySelector('.num').textContent;
  const zeroText = /^[0-9?]$/.test(numTxt) &&
    feedBtn.textContent.trim() === '' &&
    Array.prototype.every.call(pilesEl.querySelectorAll('.pile'), p => p.textContent.trim() === '') &&
    Array.prototype.every.call(bowlItemsEl.querySelectorAll('.bitem'), b => b.textContent.trim() === '') &&
    Array.prototype.every.call(leftoversEl.querySelectorAll('.leftover'), l => l.textContent.trim() === '');
  const distOk = vOk && spOk && clipOk && estOk && hintOk && hintNeg && zeroText &&
    genDch[1] >= 1 && genDch[2] >= 1 && genDch[3] >= 1 && genDch[4] >= 1 &&
    genDch[5] >= 1 && genDch[6] >= 1 &&                          /* 生成关六章参数全覆盖 */
    foodDist.carrot >= 1 && foodDist.greens >= 1 && foodDist.apple >= 1;   /* 60 关三种食物全覆盖 */
  if (distOk) npass++;
  units.dist = { ok: distOk, voice: vOk, speech: spOk, clips: clipOk, estMs: estOk,
    hintOk: hintOk && hintNeg, zeroText: zeroText, genDch: genDch, foodDist: foodDist,
    durMin: durMin, durMax: durMax, durLevels: durAll.length };

  /* ---- ⑩ 布局：双 viewport ×（flat0 单堆 / flat20 left 问句态（垫+碗+堆）/ flat25 combo 三堆）
     量测一律 offsetWidth/offsetHeight（transform 动画中间帧压扁 getBoundingClientRect 坑） ---- */
  async function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz(false);
    await wait(60);                              /* 布局落定（offset* 不受动画 transform 影响） */
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    let btnOk = true;                            // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      if (b.offsetWidth > 4 && b.offsetHeight > 4 && (b.offsetWidth < 64 || b.offsetHeight < 64)) btnOk = false;
    });
    const feedOk = feedBtn.offsetWidth >= 96 && feedBtn.offsetHeight >= 96;   /* 主按钮 ≥96（§0.9） */
    const chipOk2 = chipEl.offsetWidth >= 64 && chipEl.offsetHeight >= 64 &&
      chipEl.querySelector('.num').offsetWidth > 0;
    const piles = Array.prototype.slice.call(pilesEl.querySelectorAll('.pile'));
    const pileOk = piles.length === FD.quiz.piles.length &&
      piles.every(p => p.offsetWidth >= 64 && p.offsetHeight >= 64);
    const items = Array.prototype.slice.call(bowlItemsEl.querySelectorAll('.bitem'));
    const itemOk = items.every(b => b.offsetWidth >= 64 && b.offsetHeight >= 64);
    const lo = Array.prototype.slice.call(leftoversEl.querySelectorAll('.leftover'));
    const loOk = (cur.quizzes[cur.step] || {}).kind === 'left' &&
      (cur.quizzes[cur.step] || {}).phase === 2
      ? lo.length === FD.quiz.rem && lo.every(b => b.offsetWidth >= 64 && b.offsetHeight >= 64)
      : lo.length === 0;                          /* 非问句态垫上无剩物 */
    return { vp: w + 'x' + h, dch: cur.dch, step: cur.step, piles: piles.length, items: items.length,
      leftovers: lo.length, ox: ox, btn64: btnOk, feed96: feedOk, chip: chipOk2, pile64: pileOk,
      item64: itemOk, lo64: loOk,
      pass: ox <= 0 && btnOk && feedOk && chipOk2 && pileOk && itemOk && loOk };
  }
  total++;
  const sims = [];
  startLevel(0);                                 // ch1 单堆 + 碗内 1 件（碗件 ≥64 抽查）
  FD.tapFood('carrot');
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  startLevel(20);                                // dch5 left：推进 quiz0 到问句态（垫 rem 件+碗 2 件）
  const ql = FD.quiz;
  for (let i = 0; i < ql.n; i++) FD.tapFood(ql.food);
  await FD.submit();                             // 'eat' → 问句态
  FD.tapFood(ql.food); FD.tapFood(ql.food);      // 作答取 2 件在碗
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  startLevel(25);                                // dch6 combo 三堆双组 chip
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                 // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  const out = { game: 'feed', total: total, pass: npass, layoutOk: layoutOk,
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
