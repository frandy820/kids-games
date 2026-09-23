/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/ 章号 1 基+
     静态关难度章循环+生成关 dch∈1-4 / secret 域 [1,N] / 同关 5 题互异 / base 独立复算
     （表值 {20:5,30:5,50:6,99:7} = ceil(log2(N+1)) = 恒中点二分最坏步数 DP 复算 W(N)；
     SPEC 括注"ceil(log2(N))+1"字面值 6/6/7/8 恒 ≥ 表值——表值为准，两读法下"≤base"均成立）
   ①b 引擎直驱：空输入 'empty' 不计数 → 范围外/已排除 'gone' 不计次（guesses/miss 零增量）→
     恒中点二分逐猜：返回态与区间收紧独立对账（small→lo=max(lo,g+1) / big→hi=min(hi,g-1)）、
     guesses 恰 +1、miss=max(0,guesses-base) 实时、通关 guesses ≤ base（二分断言）
   ①c 星级口径（超基准）：纯二分 Σ超次=0 → 3★ / lo 策略（guesses=secret）超次=secret-base：
     公式档位全 40 关对账 + 构造 Σ∈[1,2]→2★ 与 Σ≥3→1★ 的实证关（聚合计数）
   ② tapKey/tapDel/tapOK 单元（flat0 真实 UI）：拼数 DOM 实时 / 删除两段 / 空 'empty' /
     范围外 99 'gone'（键盘 shake 动画在场+不计数）/ 猜大猜小 lo/hi 收紧 + 数轴剩余区间文字
     实时（r-lo/r-hi DOM=引擎值）+ 图钉 / miss 实时
   ②b 救援与 §0.7a 口径：键入/删除/范围外不重置救援钟（回拨 13s+键入 1.5s→救援仍触发）；
     合法猜测重置；读题重置；救援=num_hint+中点 pulse3（rescues≥1）
   ③ 教学链（verify 直驱 tutorialWatch）：watch clip → 三步演示（大→小→中）→ __ndDemoR==='got'
     （§0.27 演示生效实证）→ 重发同关 tut='help' → 交接 queue([num_tut_turn, ...题面段])
   ④ sayW 豁免说明（§0.24）：VOICE.wrong 未设 + num_wrong clip 不在场 + sayW 未定义（三证）
   ⑤ 分布与专项：VOICE 表文案独立字面量对账 / num_* 14 条 clips 注入 clipOk / 开场链
     queue([num_hint, num_q1, num_n_N, num_q2]) / 题面三段拼接（ch4 N=99 用 num_n_99）/
     numCn 四值
   ⑥ UI 冒烟 A：flat0 真实键盘路径通关（一次范围外轻抖+猜大+猜小+猜中三态全走过）
   ⑦ UI 冒烟 B：flat5/10/15（ch2 N=30 / ch3 N=50 / ch4 N=99）autoSolve 恒中点通关 3★
     且逐题 guesses ≤ base
   ⑧ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）：数字键与删除键 ≥64、
     确认 ≥96、全按钮 ≥64（.k-parentbtn 豁免）、剩余区间 chip 可见且文字=引擎 lo/hi、
     剩余段宽 >0、overflowX ≤0
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0 };
  let qual2Total = 0, qual2Pass = 0, qual1Total = 0, qual1Pass = 0;

  /* ---- verify 侧独立复算（不调引擎 BASE_N/baseOf，防两套逻辑同错） ---- */
  const REF_RANGE = { 1: 20, 2: 30, 3: 50, 4: 99 };
  const REF_BASE = { 20: 5, 30: 5, 50: 6, 99: 7 };
  /* 恒中点二分最坏步数 DP：W(0)=0；W(s)=1+W(ceil((s-1)/2))（engMid=floor((lo+hi)/2) 口径） */
  function refWorst(N) {
    const memo = [0];
    for (let s = 1; s <= N; s++) memo[s] = 1 + memo[Math.ceil((s - 1) / 2)];
    return memo[N];
  }
  const formulaOk = Object.keys(REF_BASE).every(N => {
    const n = Number(N);
    return REF_BASE[n] === Math.ceil(Math.log2(n + 1)) &&            /* 表值=ceil(log2(N+1)) */
      Math.ceil(Math.log2(n)) + 1 >= REF_BASE[n] &&                  /* SPEC 括注字面式恒≥表值 */
      refWorst(n) === REF_BASE[n];                                   /* =恒中点二分最坏步数 */
  });
  /* 引擎驱动小助手：恒中点二分打完一题 / lo 策略（每猜当前 lo，guesses=secret） */
  function driveBisectQuiz(L, q) {
    let g = 0;
    while (!q.solved && g++ < 30) {
      const mid = engMid(q);
      String(mid).split('').forEach(ch => engKey(L, Number(ch)));
      const r = engOK(L);
      if (r !== 'big' && r !== 'small' && r !== 'got' && r !== 'done') return false;
    }
    return q.solved;
  }
  function driveLoQuiz(L, q) {
    let g = 0;
    while (!q.solved && g++ < 120) {
      const v = q.lo;
      String(v).split('').forEach(ch => engKey(L, Number(ch)));
      engOK(L);
    }
    return q.solved;
  }

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 星级口径（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch) : (L1.dch >= 1 && L1.dch <= 4);
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    const wantN = REF_RANGE[L1.dch];
    let rangeAll = true, uniqOk = true, baseAll = true, structAll = true;
    const secrets = [];
    L1.quizzes.forEach(q => {
      if (q.kind !== 'hunt') rangeAll = false;
      if (q.N !== wantN) rangeAll = false;                         // 范围按难度章
      if (q.secret < 1 || q.secret > q.N) rangeAll = false;        // secret 域
      if (q.base !== REF_BASE[q.N] || !formulaOk) baseAll = false; // base 表值+公式独立复算
      if (!structOk(q)) structAll = false;
      secrets.push(q.secret);
    });
    if (secrets.filter((v, i, a) => a.indexOf(v) === i).length !== CH_LEN) uniqOk = false;  // 同关互异
    /* ①b 引擎直驱：empty/gone 不计数 → 二分逐猜（收紧对账+计数+miss 实时+≤base） */
    const Ld = genLevel(flat);
    let driveOk = true, bisectMax = 0;
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      if (engOK(Ld) !== 'empty' || q.guesses !== 0 || q.miss !== 0) { driveOk = false; break; }   // 空输入
      const goneV = q.N < 99 ? 99 : 0;                             // 范围外（N=99 用 0<1）
      String(goneV).split('').forEach(ch => engKey(Ld, Number(ch)));
      if (engOK(Ld) !== 'gone' || q.guesses !== 0 || q.miss !== 0) { driveOk = false; break; }    // 不计次
      if (q.input !== null) { driveOk = false; break; }            // gone 后拼数已清
      if (engDel(Ld) !== false && q.input !== null) { driveOk = false; break; }                   // 空删除=false
      while (!q.solved && driveOk) {
        const lo0 = q.lo, hi0 = q.hi, mid = engMid(q);
        String(mid).split('').forEach(ch => engKey(Ld, Number(ch)));
        const r = engOK(Ld);
        if (r === 'small') {
          if (q.lo !== Math.max(lo0, mid + 1) || q.hi !== hi0) { driveOk = false; break; }        // 收紧对账
        } else if (r === 'big') {
          if (q.hi !== Math.min(hi0, mid - 1) || q.lo !== lo0) { driveOk = false; break; }
        } else if (r !== 'got' && r !== 'done') { driveOk = false; break; }
        if (q.guesses > q.base) { driveOk = false; break; }         // 二分 ≤base 断言（逐猜）
        if (q.miss !== Math.max(0, q.guesses - q.base)) { driveOk = false; break; }               // miss 实时
      }
      if (driveOk && !q.solved) driveOk = false;
      if (driveOk) bisectMax = Math.max(bisectMax, q.guesses);
    }
    const s3 = Ld.done && Ld.quizzes.every(q => q.miss === 0) && engStars(Ld) === 3;
    /* ①c lo 策略全关驱动：档位公式对账（guesses=secret → 超次=secret-base） */
    const L1x = genLevel(flat);
    L1x.quizzes.forEach(q => { if (!driveLoQuiz(L1x, q)) driveOk = false; });
    const sumL = L1x.quizzes.reduce((s, q) => s + q.miss, 0);
    const tierOf = s => s === 0 ? 3 : (s <= 2 ? 2 : 1);
    const formulaStar = L1x.done && engStars(L1x) === tierOf(sumL);
    /* 2★/1★ 构造实证（聚合）：Σ超次 ∈[1,2] / ≥3 的关 */
    const idx2 = L1x.quizzes.findIndex(q => q.secret - q.base >= 1 && q.secret - q.base <= 2);
    if (idx2 >= 0) {
      qual2Total++;
      const Lq = genLevel(flat);
      Lq.quizzes.forEach((q, k) => { if (k === idx2) driveLoQuiz(Lq, q); else driveBisectQuiz(Lq, q); });
      const sq = Lq.quizzes.reduce((s, q) => s + q.miss, 0);
      if (sq >= 1 && sq <= 2 && engStars(Lq) === 2) qual2Pass++;
    }
    const idx1 = L1x.quizzes.findIndex(q => q.secret - q.base >= 3);
    if (idx1 >= 0) {
      qual1Total++;
      const Lq = genLevel(flat);
      Lq.quizzes.forEach((q, k) => { if (k === idx1) driveLoQuiz(Lq, q); else driveBisectQuiz(Lq, q); });
      const sq = Lq.quizzes.reduce((s, q) => s + q.miss, 0);
      if (sq >= 3 && engStars(Lq) === 1) qual1Pass++;
    }
    const ok = det && chOk && dchOk && rangeAll && uniqOk && baseAll && structAll &&
      driveOk && s3 && formulaStar && L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, uniqOk: uniqOk,
      baseAll: baseAll, structAll: structAll, driveOk: driveOk, bisectMax: bisectMax,
      starsLo: { sum: sumL, stars: engStars(L1x) }, secrets: secrets };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  const qual2Ok = qual2Total >= 6 && qual2Pass === qual2Total;      // 2★ 实证关（聚合门槛）
  const qual1Ok = qual1Total >= 10 && qual1Pass === qual1Total;     // 1★ 实证关（聚合门槛）

  /* ---- ② tapKey/tapDel/tapOK 单元（flat0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = ND.quiz;
  const N0 = q0.N, s0 = q0.secret;
  const keyOk1 = await ND.tapKey(5) === 5 && inVal.textContent === '5' && ND.quiz.input === 5;
  const keyOk2 = await ND.tapKey(2) === 52 && inVal.textContent === '52';
  const keyFull = await ND.tapKey(9) === false;                    // 已 2 位，满
  const del1 = await ND.tapDel() === 5 && inVal.textContent === '5';
  const del2 = await ND.tapDel() === null && inVal.textContent === '?' && inVal.classList.contains('empty');
  const del3 = await ND.tapDel() === false;                        // 空删除
  const rEmpty = await ND.tapOK();
  const emptyOk = rEmpty === 'empty' && ND.quiz.guesses === 0 && ND.quiz.miss === 0;
  await ND.tapKey(9); await ND.tapKey(9);                          // 范围外 99（ch1 N=20）
  const rGone = await ND.tapOK();
  const goneOk = rGone === 'gone' && ND.quiz.guesses === 0 && ND.quiz.miss === 0 &&
    getComputedStyle(keysEl).animationName === 'keys-shake' && inVal.textContent === '?';
  /* 猜大/猜小（自适应 secret 边界）+ 区间收紧与剩余区间文字实时对账 */
  let bigOk = false, smallOk = false, textOk = false, missOk = false, pinOk = false;
  if (s0 < N0) {
    String(N0).split('').forEach(ch => ND.tapKey(Number(ch)));
    const rb = await ND.tapOK();
    bigOk = rb === 'big' && ND.quiz.hi === N0 - 1 && ND.quiz.lo === 1 &&
      rHi.textContent === String(N0 - 1) && rLo.textContent === '1' &&
      ND.quiz.guesses === 1 && ND.quiz.miss === 0;
    pinOk = pinEl.classList.contains('show') && pinEl.querySelector('b').textContent === String(N0) &&
      pinEl.className.indexOf('big') >= 0;
  }
  const q0b = ND.quiz;
  if (q0b.secret > q0b.lo) {
    String(q0b.lo).split('').forEach(ch => ND.tapKey(Number(ch)));
    const rs = await ND.tapOK();
    smallOk = rs === 'small' && ND.quiz.lo === q0b.lo + 1 &&
      rLo.textContent === String(q0b.lo + 1) && ND.quiz.hi === q0b.hi;
  }
  /* 超次实时：lo 策略驱动（ND.quiz getter 是拷贝——每轮重取活值，防快照死循环）；
     终态二选一：guesses 烧到 base+1 → miss===1，或 lo 烧穿提前猜中 → step 推进 */
  let missLive = false;
  for (let t = 0; t < 12; t++) {
    const ql = ND.quiz;
    if (!ql || ql.step !== 0) { missLive = true; break; }          // lo 烧穿=猜中推进（兜底真值）
    if (ql.guesses >= ql.base + 1) {
      missLive = ND.quiz.miss === 1 && ND.quiz.guesses === ND.quiz.base + 1;
      break;
    }
    String(ql.lo).split('').forEach(ch => ND.tapKey(Number(ch)));
    await ND.tapOK();
  }
  missOk = missLive && ND.quiz.miss === Math.max(0, ND.quiz.guesses - ND.quiz.base);  // miss 不变量
  textOk = rLo.textContent === String(ND.quiz.lo) && rHi.textContent === String(ND.quiz.hi);
  const unitOk = keyOk1 && keyOk2 && keyFull && del1 && del2 && del3 && emptyOk && goneOk &&
    (bigOk || smallOk) && textOk && missOk;
  if (unitOk) npass++;
  units.taps = { ok: unitOk, key: keyOk1 && keyOk2 && keyFull, del: del1 && del2 && del3,
    empty: emptyOk, gone: goneOk, big: bigOk, small: smallOk, pin: pinOk,
    rangeText: textOk, missLive: missOk, goneAnim: getComputedStyle(keysEl).animationName };

  /* ---- ②b 救援与 §0.7a 口径（救援钟只被合法猜测/读题重置；lastAct 同作用域直读直写，
     断言走时钟值而非 interval 相位——确定性） ---- */
  total++;
  const rLog = [];
  const origPb = KIDS.voice.play;
  KIDS.voice.play = function (key) { rLog.push(String(key)); };
  let rescueOk = true;
  startLevel(0);
  /* 键入/删除/范围外/空确认=探索动作：不重置救援钟 */
  lastAct = Date.now() - 13000;
  await ND.tapKey(3);
  const t1 = lastAct;
  await ND.tapDel();
  const t2 = lastAct;
  await ND.tapKey(9); await ND.tapKey(9);
  await ND.tapOK();                                // 'gone'
  const t3 = lastAct;
  await ND.tapOK();                                // 'empty'
  const t4 = lastAct;
  if (Date.now() - t1 < 12900 || Date.now() - t2 < 12900 ||
      Date.now() - t3 < 12900 || Date.now() - t4 < 12900) rescueOk = false;   // 全程未重置
  /* 14s 救援行为本体（verify 页 interval 被 VERIFY 门关（家族口径），行为函数直驱断言；
     interval 14s 阈值由无头自测在真实页覆盖）：num_hint + 剩余段中点 pulse 三连 */
  rescueAct(cur.quizzes[cur.step]);
  if (ND.rescues !== 1) rescueOk = false;
  if (rLog.indexOf('num_hint') < 0) rescueOk = false;          // 救援语音=num_hint（救援即教二分）
  if (!midDot.classList.contains('on') ||
      !midDot.classList.contains('pulse3')) rescueOk = false;  // 中点 pulse 三连视觉（§0.21）
  /* 合法猜测=推进形态重置：big/small 后 lastAct≈now，1.3s 内不再救援 */
  const qR = ND.quiz;
  String(qR.lo).split('').forEach(ch => ND.tapKey(Number(ch)));
  const rr = await ND.tapOK();
  const legalOk = (rr === 'small' || rr === 'big' || rr === 'got' || rr === 'done') &&
    Date.now() - lastAct < 600;
  KIDS.voice.play = origPb;
  if (rescueOk) npass++;
  units.rescue = { ok: rescueOk, expNoReset: true, fired: ND.rescues === 1,
    midPulse: midDot.classList.contains('pulse3'), legalReset: legalOk,
    hintPlayed: rLog.indexOf('num_hint') >= 0 };

  /* ---- ③ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const qLog7 = [], pLog7 = [];
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  startLevel(0);
  await tutorialWatch();                           // 看：watch clip → 三步演示 → 重发同关 → 帮
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = ND.quiz;
  const fbN = pLog7.filter(k => k === 'num_big' || k === 'num_small').length;
  const demoFbOk = fbN >= 2 &&                                        /* 三步演示=两步信息反馈（大/小） */
    (pLog7.indexOf('num_big') >= 0 || pLog7.indexOf('num_small') >= 0);  /* secret=1 或 N 时同向（自适应） */
  const tutOk = pLog7.indexOf('num_tut_watch') >= 0 &&                  /* 看=演示配 watch clip */
    window.__ndDemoR === 'got' &&                                      /* §0.27 演示猜中真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&            /* 帮：解锁等孩子动手 */
    ND.currentLevel && ND.currentLevel.flat === 0 &&                    /* 重发同关 */
    ND.quiz && ND.quiz.step === 0 && ND.quiz.guesses === 0 &&           /* 新题面初态 */
    pLog7.indexOf('num_got') >= 0 && demoFbOk &&                        /* 演示含信息反馈+猜中 */
    lastQ7 && lastQ7.length === 4 && lastQ7[0] === 'num_tut_turn' &&    /* 交接顺序链单通道 */
    lastQ7[1].key === 'num_q1' && lastQ7[2].key === 'num_n_' + q0t.N && lastQ7[3].key === 'num_q2';
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('num_tut_watch') >= 0,
    demoR: window.__ndDemoR, sawBig: pLog7.indexOf('num_big') >= 0,
    sawSmall: pLog7.indexOf('num_small') >= 0, handoff: lastQ7, tut: state.tut };

  /* ---- ④ sayW 豁免说明（§0.24 显式豁免，非遗漏） ---- */
  total++;
  const exemptOk = VOICE.wrong === undefined && !KIDS.voice.clips['num_wrong'] &&
    typeof sayW === 'undefined';
  if (exemptOk) npass++;
  units.wrongExempt = { ok: exemptOk,
    note: 'SPEC §0.24 显式豁免：numberdet 无错点语义（每猜必有 big/small 信息反馈），不设 VOICE.wrong、不建 num_wrong clip、不定义 sayW——豁免非遗漏' };

  /* ---- ⑤ 分布与专项：文案对账 / clip 注入 / 开场链 / 题面三段拼接 / numCn ---- */
  total++;
  /* SPEC §3 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！猜一猜神秘数' &&
    VOICE.turn.text === '你来当侦探' && VOICE.hint.text === '试一试中间的数' &&
    VOICE.q1.text === '神秘数藏在1到' && VOICE.q2.text === '之间' &&   /* 审查 m5 文案同步 */
    VOICE.big.text === '太大啦' && VOICE.small.text === '太小啦' &&
    VOICE.got.text === '猜中啦' && VOICE.gone.text === '这个数已经排除啦';
  const numCnOk = numCn(10) === '十' && numCn(20) === '二十' && numCn(30) === '三十' &&
    numCn(50) === '五十' && numCn(99) === '九十九';
  /* num_* 全部 14 条 clips 注入对账（build 注入后 KIDS.voice.clips 应含全部） */
  const NUM_KEYS = ['num_tut_watch', 'num_tut_turn', 'num_hint', 'num_q1', 'num_q2',
    'num_big', 'num_small', 'num_got', 'num_gone',
    'num_n_10', 'num_n_20', 'num_n_30', 'num_n_50', 'num_n_99'];
  const clipOk = NUM_KEYS.every(k => !!KIDS.voice.clips[k]) &&
    Object.keys(KIDS.voice.clips).every(k => k.indexOf('num_') !== 0 || NUM_KEYS.indexOf(k) >= 0);
  /* 开场顺序链（stub 记录）：queue([num_hint, num_q1, num_n_N, num_q2]) 单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                   // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const q0v = genLevel(0).quizzes[0];
  const openChain = qLog.length >= 1 && lastQ.length === 4 && lastQ[0] === 'num_hint' &&
    lastQ[1].key === 'num_q1' && lastQ[2].key === 'num_n_' + q0v.N && lastQ[3].key === 'num_q2';
  /* 题面三段拼接：ch1 N=20 与 ch4 N=99（num_n_99'九十九'）全 clip 在场 */
  const parts0 = quizParts(q0v);
  const q15v = genLevel(15).quizzes[0];
  const parts15 = quizParts(q15v);
  const partsOk = parts0.length === 3 && parts0[0].key === 'num_q1' &&
    parts0[1].key === 'num_n_20' && parts0[2].key === 'num_q2' &&
    parts15.length === 3 && parts15[1].key === 'num_n_99' &&
    parts0.concat(parts15).every(p => !!KIDS.voice.clips[p.key]);
  /* 救援/重听拼句（题面 3 段，clip 在场走 queue） */
  speakQuiz(q0v);                                 // 救援/重听拼句（sayQ 全 clip 态走 queue，段=key 串）
  const lastQ2 = qLog[qLog.length - 1];
  const rescueChain = qLog.length >= 2 && lastQ2 !== lastQ && lastQ2.length === 3 &&
    lastQ2[0] === 'num_q1' && lastQ2[1] === 'num_n_20' && lastQ2[2] === 'num_q2';
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const distOk = refVoice && numCnOk && clipOk && openChain && partsOk && rescueChain &&
    formulaOk && qual2Ok && qual1Ok && genDch[1] >= 1 && genDch[2] >= 1 &&
    genDch[3] >= 1 && genDch[4] >= 1;
  if (distOk) npass++;
  units.dist = { ok: distOk, refVoice: refVoice, numCn: numCnOk, clips: clipOk,
    openChain: openChain, partsOk: partsOk, rescueChain: rescueChain, formula: formulaOk,
    qual2: { total: qual2Total, pass: qual2Pass }, qual1: { total: qual1Total, pass: qual1Pass },
    genDch: genDch };

  /* ---- ⑥ UI 冒烟 A：flat0 真实键盘路径通关（范围外轻抖+猜大+猜小+猜中三态全走过） ---- */
  total++;
  startLevel(0);
  const saw = { big: 0, small: 0, got: 0, gone: 0 };
  let smokeA = true, quizzesA = 0, lastR = null;
  const typeGuess = async v => {                   // 真实钩子路径拼数（tapKey/tapDel/tapOK）
    while (ND.quiz && ND.quiz.input != null) ND.tapDel();
    String(v).split('').forEach(ch => ND.tapKey(Number(ch)));
    return ND.tapOK();
  };
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = ND.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                                 // 一次范围外（99>N）：键盘轻抖不计数
      const rg = await typeGuess(99);
      saw.gone += rg === 'gone' ? 1 : 0;
      if (rg !== 'gone' || ND.quiz.guesses !== 0) smokeA = false;
    }
    const qq = ND.quiz;
    if (!saw.big && qq.secret < qq.hi) {           // 猜大：N 位（secret<N 必 big）
      const rb = await typeGuess(qq.hi);
      saw.big += rb === 'big' ? 1 : 0;
      if (rb !== 'big' && rb !== 'got') { smokeA = false; break; }
      if (rb === 'got') saw.got++;
    }
    const q2 = ND.quiz;
    if (q2 && !saw.small && q2.secret > q2.lo) {   // 猜小：lo 位（secret>lo 必 small）
      const rs2 = await typeGuess(q2.lo);
      saw.small += rs2 === 'small' ? 1 : 0;
      if (rs2 !== 'small' && rs2 !== 'got') { smokeA = false; break; }
      if (rs2 === 'got') saw.got++;
    }
    const q3 = ND.quiz;                            // 恒中点二分收尾
    let g = 0;
    while (ND.quiz && ND.quiz.step === s && g++ < 20) {
      const q4 = ND.quiz;
      lastR = await typeGuess(engMid({ lo: q4.lo, hi: q4.hi }));
      if (lastR !== 'big' && lastR !== 'small' && lastR !== 'got' && lastR !== 'done') { smokeA = false; break; }
      if (lastR === 'got' || lastR === 'done') saw.got++;
    }
    if (ND.quiz && ND.quiz.step === s) smokeA = false;
    quizzesA++;
  }
  const lvA = ND.currentLevel;
  const smokeOkA = smokeA && saw.gone >= 1 && saw.big >= 1 && saw.small >= 1 && saw.got >= 1 &&
    quizzesA === CH_LEN && lvA.done && lvA.won && lastR === 'done' &&
    !document.querySelector('.k-celebrate');       // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, saw: saw, quizzes: quizzesA, stars: engStars(cur) };

  /* ---- ⑦ UI 冒烟 B：flat5/10/15（ch2/ch3/ch4）autoSolve 恒中点通关 3★ 且逐题 ≤base ---- */
  total++;
  const chapSpec = { 5: { N: 30, base: 5 }, 10: { N: 50, base: 6 }, 15: { N: 99, base: 7 } };
  const chapOut = {};
  let smokeB = true;
  for (const f of [5, 10, 15]) {
    startLevel(f);
    const qf = ND.quiz;
    const domOk = qf && qf.N === chapSpec[f].N && qf.base === chapSpec[f].base &&
      rHi.textContent === String(qf.N) && rLo.textContent === '1';
    const a = await ND.autoSolve();
    const lv = ND.currentLevel;
    const solveOk = a.done && lv.done && lv.won && engStars(cur) === 3 &&
      a.perQuiz.length === CH_LEN && a.perQuiz.every(g => g <= chapSpec[f].base);
    chapOut[f] = { ok: domOk && solveOk, N: qf.N, perQuiz: a.perQuiz, stars: engStars(cur) };
    if (!domOk || !solveOk) smokeB = false;
  }
  if (smokeB) npass++;
  smokes.chapters = { ok: smokeB, flats: chapOut };

  /* ---- ⑧ 布局：双 viewport ×（flat0/5/10/15）量测（等入场动画结束 §0.11） ---- */
  async function simView(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    layout();
    await wait(680);                               // 入场/段动画结束再量（真实 ms，不吃 SPEED）
    const de = document.documentElement;
    const keys = Array.prototype.slice.call(keysEl.querySelectorAll('.key'));
    const keyOk = keys.length === 11 &&
      keys.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const or = okBtn.getBoundingClientRect();
    const okOk = or.width >= 96 && or.height >= 96;
    let btnOk = true;                              // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const q = cur.quizzes[cur.step];
    const chipOk = rangeChip.getBoundingClientRect().height > 0 &&                 // 剩余区间 chip 可见
      rLo.textContent === String(q.lo) && rHi.textContent === String(q.hi) &&     // 文字=引擎 lo/hi
      parseFloat(segM.style.width) > 0;                                           // 剩余段亮且宽>0
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, keyOk: keyOk, okOk: okOk, btnOk: btnOk,
      chipOk: chipOk, ox: ox, pass: keyOk && okOk && btnOk && chipOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simView(1280, 800, f));
    sims.push(await simView(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                   // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  const out = { game: 'numberdet', total: total, pass: npass, layoutOk: layoutOk,
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
