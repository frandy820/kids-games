/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     数值域独立审计（refRangeOk 复算：ch1 付10 价3-9.5 找1-7；ch2 付20 价6-19 找1-14；
     ch3 付20 价5.5-19.5 找0.5-14.5；ch4 付50 价15-49 找1-35；找零=付-价恒正）/
     币盘供给恒足（refBoundedReach 独立有界 DP：真实人民币面值 {5,2,1,.5}元×5 凑出任意找零额）/
     题面拼接段全 clip（quizParts 每段 key 在场——36-50 数位拼接亦全 clip §0.23）/
     拼接段与 TTS 兜底文本一致 / 同关相邻价互异 / structOk
   ①b 引擎直驱：空提交='empty' 不计 miss / 非法面值与第 6 枚面值拒绝 /
     放币=探索零计数 / 错提交分向（more/less）miss 恰一次 / 独立贪心（refGreedy）
     放齐总额=找零提交 right/done / 带角找零=5 角唯一渠道（奇找零贪心必含 0.5 且
     无其他奇面值）/ 星级三档独立驱动（3 错=1★ / 1 错=2★ / 0 错=3★）
   ①c 救援目标闭环：rescueTarget 输出（add/remove）执行后独立 DP 复核仍可达；
     反复执行恒收敛到 ok 且提交 right
   ② tapCoin 单元（flat0 真实 UI）：放币 sum 推进+币 DOM .gone+托盘 .tcoin 落地+
     合计 DOM 实时（含 .half 角态）+非法面值 false
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ②c 超额/差额轻提示：方向正确（more/less）+ 10s 节流（窗口内不重播）
   ③ UI 冒烟 A：flat0 真实通路通关（首题错一次+空提交不计次=1 错 2 星，verify 页不弹层）
   ④ UI 冒烟 B1 flat5（ch2 付20）/ B2 flat10（ch3 带角：奇找零题真实走 0.5 币）/
     B3 flat15（ch4 付50：数位拼接 cas_n_5+cas_n_10 全 clip+黑板 50）
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 贪心找零+真实提交
     __csDemoR==='right'（§0.27）→ 重发同关 → 交接链 queue([cas_tut_turn, ...题面段])
     → tut='help' 解锁
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）
     币 ≥64、托盘币 ≥64、"找零"主按钮 ≥96、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0
   ⑥ 分布与专项：VOICE 表文案独立字面量对账（SPEC 定稿）/ numCn·numParts 数位拼接对账
     （五十=五+十 / 四十七=四+十+七）/ cas_* 46 条 clips 注入 clipOk /
     开场顺序链（queue([cas_hint, ...题面段]) 单通道）/ speakQuiz 救援拼句
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立复算（不调引擎生成器/greedySeq/canReach，防两套逻辑同错） ---- */
  function refRangeOk(dch, q) {
    if (q.pay !== (dch === 1 ? 20 : dch === 4 ? 100 : 40)) return false;   // 付 10/20/50 元
    if (q.change !== q.pay - q.price || q.change <= 0) return false;       // 找零=付-价 恒正
    const P = q.price, C = q.change;
    if (dch === 1) {                        // 价 3-9.5 元（整 3-9 / 带 3.5-8.5），找 1-7
      if (P % 2 === 0 ? (P < 6 || P > 18) : (P < 7 || P > 17)) return false;
      if (C < 2 || C > 14) return false;
    } else if (dch === 2) {                 // 价 6-19 整元，找 1-14
      if (P % 2 !== 0 || P < 12 || P > 38) return false;
      if (C < 2 || C > 28) return false;
    } else if (dch === 3) {                 // 价 6-19 整 / 5.5-19.5 带，找 0.5-14.5
      if (P % 2 === 0 ? (P < 12 || P > 38) : (P < 11 || P > 39)) return false;
      if (C < 1 || C > 29) return false;
    } else {                                // 价 15-49 整元，找 1-35
      if (P % 2 !== 0 || P < 30 || P > 98) return false;
      if (C < 2 || C > 70) return false;
    }
    return true;
  }
  function refCanReach(avail, target) {                    // 独立子集和 DP
    if (target < 0) return false;
    const dp = new Array(target + 1).fill(false);
    dp[0] = true;
    for (const v of avail) for (let t = target; t >= v; t--) if (dp[t - v]) dp[t] = true;
    return !!dp[target];
  }
  function refBoundedReach(target) {                       // 币盘供给恒足：{5,2,1,0.5}元×5（§0.28
    if (target < 0) return false;                          // 真实人民币面值）独立有界 DP；
    const dp = new Array(target + 1).fill(false);          // target=半元整数（0.5元=1），币即 10/4/2/1
    dp[0] = true;
    [10, 4, 2, 1].forEach(v => {
      for (let c = 0; c < 5; c++) for (let t = target; t >= v; t--) if (dp[t - v]) dp[t] = true;
    });
    return !!dp[target];
  }
  function refGreedy(target) {                             // 独立贪心（5→2→1→0.5 元逐枚）
    const seq = [];
    let r = target;
    [[10, 5], [4, 5], [2, 5], [1, 5]].forEach(p => {
      let n = 0;
      while (r >= p[0] && n < p[1]) { seq.push(p[0]); r -= p[0]; n++; }
    });
    return r === 0 ? seq : null;
  }
  const refAvail = q => {                                  // 托盘外余币展开（独立复算用）
    const a = [];
    [10, 4, 2, 1].forEach(v => {
      const n = 5 - q._tray.reduce((s, x) => s + (x === v ? 1 : 0), 0);
      for (let k = 0; k < n; k++) a.push(v);
    });
    return a;
  };
  /* 放一枚保证 ≠找零 的币（供错提交；面值元） */
  const wrongCoinYuan = c => (c === 5 ? 2 : 5);

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, clipAll = true, speechAll = true, adjOk = true,
        structAll = true, supplyAll = true, driveOk = true, rescueOk = true;
    let prevP = -1, jiaoN = 0;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refRangeOk(L1.dch, q)) rangeAll = false;
      if (!structOk(q)) structAll = false;
      if (!refBoundedReach(q.change)) supplyAll = false;                  // 币盘供给恒足（§0.28）
      const parts = quizParts(q);
      if (!parts.every(p => !!KIDS.voice.clips[p.key])) clipAll = false;  // 题面拼接段全 clip（§0.23）
      if (qSpeech(q) !== parts.map(p => p.text).join('')) speechAll = false;  // 兜底文本与段一致
      if (q.price === prevP) adjOk = false;                               // 相邻价互异
      prevP = q.price;
      if (q.change % 2 === 1) jiaoN++;
    }

    /* ①b 引擎直驱（retries 为关级累计：断言用题内增量，base=本题起始 retries） */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (engSubmit(Ld) !== 'empty' || q.miss !== 0 || Ld.retries !== base) driveOk = false;  // 空提交不计次
      if (engTapCoin(Ld, 99) !== null || engTapCoin(Ld, 3) !== null) driveOk = false;         // 非法面值
      for (let m = 0; m < 5; m++) { if (engTapCoin(Ld, 10) === null) driveOk = false; }       // 5 枚 5 元
      if (engTapCoin(Ld, 10) !== null) driveOk = false;                                       // 第 6 枚拒绝（§0.28 上限）
      while (q._tray.length) { if (engTapTray(Ld, 0) === null) driveOk = false; }
      if (engTapCoin(Ld, 10) === null) driveOk = false;                                       // 放币=探索零计数
      if (traySum(q) === q.change) { if (engTapCoin(Ld, 10) === null) driveOk = false; }      // 防恰等于：再放一枚构造超额
      const sumB = traySum(q);
      const wr = engSubmit(Ld);
      if (wr !== (sumB > q.change ? 'wrong-more' : 'wrong-less')) driveOk = false;            // 错提交分向
      if (q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;                           // miss 恰一次
      if (engTapTray(Ld, 0) === null) driveOk = false;                                        // 移回回落
      if (q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;                           // 探索仍零计数
      while (q._tray.length) engTapTray(Ld, 0);
      const sol = refGreedy(q.change);
      if (!sol) { driveOk = false; break; }
      let sum = 0;
      for (const v of sol) { const r = engTapCoin(Ld, v); if (r === null) { driveOk = false; break; } sum = r; }
      if (driveOk && sum !== q.change) driveOk = false;                                       // 解放齐=找零
      if (q.change % 2 === 1) {                                                               // 带角找零=5 角唯一渠道
        if (sol.indexOf(1) < 0) driveOk = false;                                              // 奇找零必含 0.5 元
        if (sol.some(v => v % 2 === 1 && v !== 1)) driveOk = false;                           // 唯一奇面值=0.5 元
      }
      if (engSubmit(Ld) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) driveOk = false;
    }
    /* 星级三档独立驱动：L1x=首题连错 3 次（更多=1★）/ L2x=仅一错（1-2=2★）/ L3=全对（0=3★） */
    const L1x = genLevel(flat);
    const qs1 = L1x.quizzes[0];
    let wcount = 0, g1 = 0;
    while (wcount < 3 && g1++ < 12) {
      if (engTapCoin(L1x, 10) === null && engTapCoin(L1x, 4) === null) break;
      if (traySum(qs1) === qs1.change) continue;
      const r = engSubmit(L1x);
      if (r === 'wrong-more' || r === 'wrong-less') wcount++;
    }
    while (qs1._tray.length) engTapTray(L1x, 0);
    let g2x = 0;
    while (!L1x.done && g2x++ < 30) {
      const q = L1x.quizzes[L1x.step];
      refGreedy(q.change).forEach(v => engTapCoin(L1x, v));
      engSubmit(L1x);
    }
    const s1 = L1x.done && L1x.retries === 3 && engStars(L1x) === 1;
    const L2x = genLevel(flat);
    let g3 = 0;
    while (!L2x.done && g3++ < 30) {
      const q = L2x.quizzes[L2x.step];
      if (L2x.step === 0) {                                       // 仅首题错一次
        engTapCoin(L2x, 10);
        if (traySum(q) === q.change) engTapCoin(L2x, 10);
        engSubmit(L2x);
        while (q._tray.length) engTapTray(L2x, 0);
      }
      refGreedy(q.change).forEach(v => engTapCoin(L2x, v));
      engSubmit(L2x);
    }
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L3 = genLevel(flat);
    let g4 = 0;
    while (!L3.done && g4++ < 30) {
      const q = L3.quizzes[L3.step];
      refGreedy(q.change).forEach(v => engTapCoin(L3, v));
      engSubmit(L3);
    }
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环：步进执行 rescueTarget（add/remove）→ 独立 DP 复核 → 收敛 ok → 提交 right */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    engTapCoin(Lr, 10);                                           // 歧途态（超或差）
    let rrOk = true, chainOk = true, steps = 0;
    while (steps++ < 30) {
      const t = rescueTarget(qr);
      if (!t) { chainOk = false; break; }
      if (t.act === 'ok') break;
      if (t.act === 'add') {
        if (engTapCoin(Lr, t.v) === null) { chainOk = false; break; }
      } else if (engTapTray(Lr, t.j) === null) { chainOk = false; break; }
      if (!refCanReach(refAvail(qr), qr.change - traySum(qr))) chainOk = false;  // 每步后独立复核仍可达
    }
    if (chainOk && engSubmit(Lr) !== 'right') chainOk = false;
    if (rescueTarget(qr) !== null) rrOk = false;                  // 已解题无救援目标
    rescueOk = rrOk && chainOk;

    const ok = det && L1.quizzes.length === CH_LEN && rangeAll && clipAll && speechAll &&
      adjOk && structAll && supplyAll && driveOk && rescueOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, clipAll: clipAll,
      speechAll: speechAll, adjOk: adjOk, structAll: structAll, supplyAll: supplyAll,
      driveOk: driveOk, rescueOk: rescueOk, jiaoN: jiaoN,
      stars: { many1: engStars(L1x), wrong1: engStars(L2x), clean: engStars(L3) },
      qs: L1.quizzes.map(q => fmtTxt(q.pay - q.price) + '<-' + fmtTxt(q.price) + '/付' + fmtYuan(q.pay)) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCoin 单元（flat0 真实 UI 状态机）：合计 DOM 实时同步 + 币 gone/托盘币落地
     + 币盘 DOM 币制实测（§0.28：真实人民币面值 {5,2,1,0.5}元×5，data-v/aria 均元制） ---- */
  total++;
  startLevel(0);
  const q0 = CS.quiz;
  const coinBtns = Array.prototype.slice.call(coinTrayEl.querySelectorAll('.coin'));
  const dvList = coinBtns.map(b => b.dataset.v);
  const dvOk = dvList.length === 20 &&
    ['0.5', '1', '2', '5'].every(s => dvList.filter(x => x === s).length === 5);  // 恰每面值 5 枚
  const ariaOk = coinBtns.every(b => /^(5 角|5 元|2 元|1 元)硬币$/.test(b.getAttribute('aria-label') || ''));
  const sol0 = refGreedy(Y(q0.change));                           // 半元解
  const taps = [];
  let domOk = true;
  for (const v of sol0) {                                         // 按解逐枚点（钩子面值元）
    const before = CS.quiz.sum;
    const r = CS.tapCoin(DENOM_YUAN[v]);
    taps.push(r);
    if (r === false || Math.abs(r - (before + DENOM_YUAN[v])) > 1e-9) domOk = false;   // 新合计（元）
    if (coinTrayEl.querySelectorAll('.coin.gone').length !== taps.length) domOk = false;  // .gone 同步
    const bTxt = sumboxEl.querySelector('.main').textContent;     // 合计 DOM 实时（含 .half 角态）
    const expInt = Math.floor(r);
    if (bTxt !== String(expInt) || sumboxEl.classList.contains('half') !== (r % 1 !== 0)) domOk = false;
  }
  await wait(620 * SPEED);                                        // 等飞行落地托盘币渲染
  const tkN = basketEl.querySelectorAll('.tcoin').length;
  if (tkN !== taps.length) domOk = false;                         // 托盘币=已放枚数
  const sumDone = CS.quiz.sum === q0.change && CS.quiz.miss === 0 && CS.currentLevel.retries === 0;
  const badVal = CS.tapCoin(7) === false && CS.tapCoin(0) === false && CS.tapCoin(3) === false;  // 非法面值
  const selfOk = taps.every(t => typeof t === 'number') && domOk && sumDone && badVal && dvOk && ariaOk;
  if (selfOk) npass++;
  units.tapCoin = { ok: selfOk, taps: taps, sum: CS.quiz ? CS.quiz.sum : null,
    domOk: domOk, tkN: tkN, badVal: badVal, dvOk: dvOk, ariaOk: ariaOk,
    dv: ['0.5', '1', '2', '5'].map(s => s + 'x' + dvList.filter(x => x === s).length).join(' '),
    change: q0.change, sol: sol0 };

  /* ---- ②b sayW 三态 + ②c 方向轻提示（flat<3 每错必播 / flat≥3 节流 / ===2 豁免 / more-less 方向+节流） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  startLevel(0);                                                  // flat0：每错必播
  const c0w = CS.quiz.change, v0w = wrongCoinYuan(c0w);
  CS.tapCoin(v0w);
  await CS.tapSubmit();
  await CS.tapSubmit();
  const sayA = cnt('cas_wrong');                                  // → 2
  const key0 = v0w > c0w ? 'cas_q_more' : 'cas_q_less';           // 方向判定（超额 more / 差额 less）
  const other0 = v0w > c0w ? 'cas_q_less' : 'cas_q_more';
  const tipA = cnt(key0);                                         // 首错方向提示恰 1（节流开窗）
  const tipOtherA = cnt(other0);                                  // 反向提示 0（方向正确）
  startLevel(3);                                                  // flat3：10s 节流
  lastWrongVoice = Date.now();                                    /* 显式进入节流窗口内 */
  CS.tapCoin(wrongCoinYuan(CS.quiz.change));
  await CS.tapSubmit();                                           // 窗口内 → 主句不播
  const sayB = cnt('cas_wrong') - 2;                              // 增量 → 0
  const tipB = cnt(key0) + cnt(other0) - tipA - tipOtherA;        // 节流窗内方向提示亦不播 → 0
  startLevel(3);                                                  // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                                             /* 隔离上一子用例时间戳 */
  lastMoreLess = 0;                                               /* 隔离方向提示节流窗 */
  const c3 = CS.quiz.change, v3 = wrongCoinYuan(c3);
  const key3 = v3 > c3 ? 'cas_q_more' : 'cas_q_less';
  CS.tapCoin(v3);
  await CS.tapSubmit();                                           // miss=1 窗口外 → 播
  await CS.tapSubmit();                                           // miss=2 → force === 2 → 播
  const sayC = cnt('cas_wrong') - 2 - sayB;                       // 增量 → 2
  const tipC = cnt(key3) - (key0 === key3 ? tipA : 0);            // 第三节首错再开窗 → 该方向恰 1（扣 A 节同向计数）
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  const tipOk = tipA === 1 && tipOtherA === 0 && tipB === 0 && tipC === 1;
  if (sayWOk && tipOk) npass++;
  units.sayW = { ok: sayWOk && tipOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC,
    tipFirst: tipA, tipOther: tipOtherA, tipThrottle: tipB, tipC: tipC,
    dir0: key0, dir3: key3 };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错一次+空提交不计次 → 1 错=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = CS.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                                        // 首错：托盘晃动零惩罚可调整；首错不出救援视觉
      CS.tapCoin(wrongCoinYuan(q.change));
      const r = await CS.tapSubmit();
      const wig = basketEl.classList.contains('wig');
      const payOk = !!payBtnEl() && getComputedStyle(payBtnEl()).pointerEvents !== 'none';
      const alive = coinTrayEl.querySelector('.coin:not(.gone)');
      const coinOk = !!alive && getComputedStyle(alive).pointerEvents !== 'none';   /* 不灰化：币仍可点 */
      const noFind = !findCardEl.classList.contains('show');                        /* 首错不亮找零卡 */
      wrongOk = (r === 'wrong-more' || r === 'wrong-less') && wig && payOk && coinOk && noFind &&
        CS.currentLevel.retries === 1 && CS.currentLevel.step === 0;
      while (CS.quiz.tray.length) CS.tapTrayCoin(0);        // 全部移回落（零惩罚可调整）
      if (CS.quiz.sum !== 0) smokeA = false;
      const rE = await CS.tapSubmit();                      // 空提交：不计次（§1 口径）
      if (rE !== 'empty' || CS.currentLevel.retries !== 1) smokeA = false;
    }
    const q2 = CS.quiz;
    const sol = refGreedy(Y(q2.change));
    for (const v of sol) CS.tapCoin(DENOM_YUAN[v]);
    const r = await CS.tapSubmit();
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    quizzesA++;
  }
  const lvA = CS.currentLevel;
  const smokeOkA = smokeA && wrongOk && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, quizzes: quizzesA,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat5（ch2 付 20 元）黑板 DOM+贪心真实通路通关 ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const pay5 = L5.quizzes.every(q => q.pay === 40);                 // 付 20 元
  const chalk5 = chipEl.textContent.indexOf('付了') >= 0 &&
    chipEl.textContent.indexOf('20') >= 0;
  let playB1 = true, quizzesB = 0;
  for (let s = 0; s < CH_LEN && playB1; s++) {
    const q = CS.quiz;
    if (!q) { playB1 = false; break; }
    refGreedy(Y(q.change)).forEach(v => CS.tapCoin(DENOM_YUAN[v]));
    const r = await CS.tapSubmit();
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB1 = false;
    quizzesB++;
  }
  const lv5 = CS.currentLevel;
  const smokeOkB1 = pay5 && chalk5 && playB1 && quizzesB === CH_LEN && lv5.done &&
    lv5.won && lv5.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, pay20: pay5, chalk: chalk5, quizzes: quizzesB, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat10（ch3 带角）——奇找零题真实走 0.5 币（5 角唯一渠道） ---- */
  total++;
  let jFlat = 10;
  let jIdx = genLevel(10).quizzes.findIndex(q => q.change % 2 === 1);
  if (jIdx < 0) {                                                   // flat10 无带角题（确定性回退扫 ch3）
    for (const f of [11, 12, 13, 14]) {
      const i = genLevel(f).quizzes.findIndex(q => q.change % 2 === 1);
      if (i >= 0) { jFlat = f; jIdx = i; break; }
    }
  }
  startLevel(jFlat);
  const LJ = genLevel(jFlat);
  const jiaoOk = jIdx >= 0 && LJ.quizzes[jIdx].change % 2 === 1;
  let playB2 = true, quizzesC = 0, jiaoPlaced = false, jiaoChecked = false;
  for (let s = 0; s < CH_LEN && playB2; s++) {
    const q = CS.quiz;
    if (!q) { playB2 = false; break; }
    const half = Y(q.change) % 2 === 1;
    refGreedy(Y(q.change)).forEach(v => CS.tapCoin(DENOM_YUAN[v]));
    if (half) {                                                     // 带角题：贪心解必含 5 角币
      jiaoChecked = true;
      jiaoPlaced = CS.quiz.tray.indexOf(0.5) >= 0;
    }
    const r = await CS.tapSubmit();
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB2 = false;
    quizzesC++;
  }
  const lv10 = CS.currentLevel;
  const smokeOkB2 = jiaoOk && playB2 && quizzesC === CH_LEN && jiaoChecked && jiaoPlaced &&
    lv10.done && lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB2) npass++;
  smokes.flat10 = { ok: smokeOkB2, jFlat: jFlat, jIdx: jIdx, jiaoPlaced: jiaoPlaced,
    quizzes: quizzesC, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B3：flat15（ch4 付 50）——数位拼接全 clip+黑板 50+贪心真实通路 ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const pay15 = L15.quizzes.every(q => q.pay === 100);              // 付 50 元
  const parts15 = quizParts(L15.quizzes[0]);
  const compOk = parts15[1].key === 'cas_n_5' && parts15[2].key === 'cas_n_10' &&  // 五十=五+十
    parts15.every(p => !!KIDS.voice.clips[p.key]);                  // 全 clip（含数位拼接段）
  const chalk15 = chipEl.textContent.indexOf('50') >= 0;
  let playB3 = true, quizzesD = 0;
  for (let s = 0; s < CH_LEN && playB3; s++) {
    const q = CS.quiz;
    if (!q) { playB3 = false; break; }
    refGreedy(Y(q.change)).forEach(v => CS.tapCoin(DENOM_YUAN[v]));
    const r = await CS.tapSubmit();
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB3 = false;
    quizzesD++;
  }
  const lv15 = CS.currentLevel;
  const smokeOkB3 = pay15 && compOk && chalk15 && playB3 && quizzesD === CH_LEN &&
    lv15.done && lv15.won && lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB3) npass++;
  smokes.flat15 = { ok: smokeOkB3, pay50: pay15, composed: compOk, chalk: chalk15,
    quizzes: quizzesD, stars: engStars(cur) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → demo 贪心找零+真实提交 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = CS.quiz;
  const tutOk = pLog7.indexOf('cas_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    window.__csDemoR === 'right' &&                                       /* §0.27 演示提交真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&               /* 帮：解锁等孩子动手 */
    CS.currentLevel && CS.currentLevel.flat === 0 &&                      /* 重发同关 */
    q0t && q0t.step === 0 && q0t.sum === 0 && q0t.tray.length === 0 &&    /* 新题面空托盘初态 */
    lastQ7 && lastQ7.length === 6 && lastQ7[0] === 'cas_tut_turn' &&      /* 交接顺序链单通道 */
    lastQ7[1].key === 'cas_q1' && lastQ7[3].key === 'cas_q2' &&           /* 题面段对象（queue 原样透传） */
    lastQ7[2].key === 'cas_n_10' && lastQ7[5].key === 'cas_q3';
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('cas_tut_watch') >= 0,
    demoR: window.__csDemoR, handoff: !!lastQ7, parts: lastQ7, tut: state.tut };

  /* ---- ⑤ 布局：双 viewport ×（flat0/5/10/15）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：coin-in scale(0) 起帧） ---- */
  async function simLayout(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 币入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const de = document.documentElement;
    refGreedy(Y(CS.quiz.change)).forEach(v => CS.tapCoin(DENOM_YUAN[v]));   // 放币测托盘币尺寸
    await wait(200);                            // 等飞行落地
    const coins = Array.prototype.slice.call(coinTrayEl.querySelectorAll('.coin'));
    const coinOk = coins.length === 20 &&
      coins.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const tks = Array.prototype.slice.call(basketEl.querySelectorAll('.tcoin'));
    const tkOk = tks.length > 0 &&
      tks.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const pb = payBtnEl();
    const payOk = !!pb && pb.getBoundingClientRect().height >= 96 && pb.getBoundingClientRect().width >= 96;
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, coinOk: coinOk, tkOk: tkOk,
      payOk: payOk, btnOk: btnOk, ox: ox, pass: coinOk && tkOk && payOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simLayout(1280, 800, f));
    sims.push(await simLayout(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / 数位拼接对账 / clip 注入 / 开场链 / 救援拼句 ---- */
  total++;
  /* SPEC §1 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！顾客买东西啦' &&
    VOICE.turn.text === '你来当收银员' && VOICE.hint.text === '算一算，要找多少钱' &&
    VOICE.q1.text === '付了' && VOICE.q2.text === '元，买了' &&
    VOICE.q3.text === '元的东西，找他多少呀' && VOICE.q3j.text === '元五角的东西，找他多少呀' &&
    VOICE.right.text === '找对啦' && VOICE.wrong.text === '再算一算找零' &&
    VOICE.more.text === '多找啦，拿回去一枚' && VOICE.less.text === '还差一点点';
  /* 数词：≤35 整词 / 36-50 数位拼接（clip 上限 35 的补足通道） */
  const numOk = numCn(10) === '十' && numCn(21) === '二十一' && numCn(35) === '三十五' &&
    numCn(40) === '四十' && numCn(47) === '四十七' && numCn(50) === '五十' &&
    numParts(35).length === 1 && numParts(35)[0].key === 'cas_n_35' &&
    numParts(50).length === 2 && numParts(50)[0].key === 'cas_n_5' && numParts(50)[1].key === 'cas_n_10' &&
    numParts(47).length === 3 && numParts(47)[0].key === 'cas_n_4' &&
    numParts(47)[1].key === 'cas_n_10' && numParts(47)[2].key === 'cas_n_7' &&
    numParts(47).every(p => !!KIDS.voice.clips[p.key]);
  /* cas_* 全部 46 条 clips 注入对账（build 注入后 KIDS.voice.clips 应含全部） */
  const CAS_KEYS = ['cas_tut_watch', 'cas_tut_turn', 'cas_hint', 'cas_right', 'cas_wrong',
    'cas_q_more', 'cas_q_less', 'cas_q1', 'cas_q2', 'cas_q3', 'cas_q3j']
    .concat(Array.from({ length: 35 }, (_, i) => 'cas_n_' + (i + 1)));
  const clipOk = CAS_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([cas_hint, ...题面段]) 单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const q0v = genLevel(0).quizzes[0];
  const openChain = qLog.length >= 1 && lastQ.length === 6 && lastQ[0] === 'cas_hint' &&
    lastQ[1].key === 'cas_q1' && lastQ[3].key === 'cas_q2' &&        // 付 10=单段数词（对象段按 .key 断言）
    (q0v.price % 2 ? lastQ[5].key === 'cas_q3j' : lastQ[5].key === 'cas_q3');
  speakQuiz(q0v);                                // 救援/重听拼句：题面段（clip 在场走 queue）
  const lastQ2 = qLog[qLog.length - 1];
  const rescueChain = qLog.length >= 2 && lastQ2 !== lastQ && lastQ2.length === 5 &&
    lastQ2[0] === 'cas_q1' && lastQ2.indexOf('cas_q2') === 2;
  const ttsFallback = sayLog.length === 0;       /* 全 clip 在场：正常链路零 TTS 兜底（§0.23） */
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const specOk = refVoice && numOk && clipOk && openChain && rescueChain && ttsFallback;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, numOk: numOk, clips: clipOk,
    openChain: openChain, rescueChain: rescueChain, ttsFallback: ttsFallback,
    casClips: CAS_KEYS.filter(k => !KIDS.voice.clips[k]) };

  const out = { game: 'cashier', total: total, pass: npass, layoutOk: layoutOk,
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
