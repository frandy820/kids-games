/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 两次生成 JSON 一致）/
     数值域独立审计（N 6-12、M 2-4、商=floor(N/M) ≥2、余=N%M ∈0-2、章池字面量对账 REF_POOLS）/
     热身（dch3/4 首题无余数；dch3 必含余数题）/ 同关相邻 (N,M) 不同 /
     干扰项互异禁 0 负且规则池内（商±1/±2/除数 M，独立 candRules 复算）/ structOk /
     引擎直驱（发放期点答案卡='again' 防御层 → 逐颗发放序号递增 → ask 切换 → 各盘=商（轮流均匀）
     → ask 期点糖 null → 余数糖留桌 left=rem → 同卡连错 2 次=不灰化可重点 miss/retries 递增
     → 首题带 2 错通关 2 星；另全对 3 星）
   ② tapCandy 单元（flat0 真实 UI）：发放逐颗 given/cur 推进+糖 DOM gone+盘角标 DOM 递增+
     非法下标 false+ask 期点余数糖 false（不计数零惩罚）
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题错一次=2 星，verify 页不弹层）
   ④ UI 冒烟 B1：flat10（ch3 有余数）首题热身无余数+余数题剩糖留桌（leftover DOM=rem）
     +div_rem 语音播出+autoSolve 3 星
     B2：flat15（ch4 算式黑板）黑板 DOM（N÷M=?）+首题热身+真实点击通关
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip 播出 → demo 发放+答对 → 重发同关 →
     交接链 queue([div_tut_turn, ...题面 5 段]) → tut='help' 解锁
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/10/15）deal 期糖 ≥64、盘 ≥64、
     全按钮 ≥64（.k-parentbtn 豁免）+ ask 期答案卡 ≥96×96、overflowX ≤0
   ⑥ 分布与专项：VOICE 表文案独立字面量对账（SPEC 定稿）/ div_* 19 条 clips 注入 clipOk /
     开场顺序链（queue([div_hint, ...题面 5 段]) 单通道）/ speakQuiz 救援拼句（queue 5 段）/
     answerIdx 三位置均出现且首位 <60%
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0];

  /* verify 侧独立复算的章池字面量与干扰规则池（不调引擎 candPool/genOne，防两套逻辑同错） */
  const REF_POOLS = {
    noRemS: ['6/2', '6/3', '8/2', '8/4', '10/2'],
    noRemL: ['9/3', '12/3', '12/4'],
    hasRem: ['7/2', '7/3', '8/3', '9/4', '10/3', '10/4', '11/2', '11/3']
  };
  REF_POOLS.all = REF_POOLS.noRemS.concat(REF_POOLS.noRemL, REF_POOLS.hasRem);
  function refRangeOk(dch, qi, q) {
    if (q.n < 6 || q.n > 12 || q.m < 2 || q.m > 4) return false;
    if (q.answer !== Math.floor(q.n / q.m) || q.rem !== q.n % q.m) return false;   // 整除与余数正确性
    if (q.answer < 2) return false;                                                // 商 ≥2
    const k = q.n + '/' + q.m;
    if (dch === 1) return REF_POOLS.noRemS.indexOf(k) >= 0;
    if (dch === 2) return REF_POOLS.noRemL.indexOf(k) >= 0;
    if (dch === 3) return qi === 0 ? REF_POOLS.noRemL.indexOf(k) >= 0               // 首题热身=无余数
                                   : REF_POOLS.hasRem.indexOf(k) >= 0;
    return qi === 0 ? REF_POOLS.all.indexOf(k) >= 0 && q.rem === 0                  // ch4 首题热身
                    : REF_POOLS.all.indexOf(k) >= 0;
  }
  function candRules(q) {
    const set = [];
    [q.answer - 1, q.answer + 1, q.answer - 2, q.answer + 2, q.m].forEach(v => {
      if (v > 0 && v !== q.answer && set.indexOf(v) < 0) set.push(v);
    });
    return set;
  }

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);      // 确定性（含发放初态）
    let rangeAll = true, warmOk = true, adjOk = true, structAll = true, distrAll = true, remHas = true;
    let prevKey = null;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refRangeOk(L1.dch, k, q)) rangeAll = false;                          // 数值域独立审计
      if (q.items.length !== 3 || !structOk(q)) structAll = false;              // 3 选 1 互异禁 0
      q.items.forEach((v, idx) => {                                            // 干扰=规则构造且≠answer
        if (idx === q.answerIdx) return;
        if (v === q.answer || candRules(q).indexOf(v) < 0) distrAll = false;
      });
      idxDist[q.answerIdx]++;
      const key = q.n + '/' + q.m;
      if (prevKey === key) adjOk = false;                                       // 同关相邻 (N,M) 不同
      prevKey = key;
    }
    if ((L1.dch === 3 || L1.dch === 4) && L1.quizzes[0].rem !== 0) warmOk = false;   // 首题热身
    if (L1.dch === 3 && !L1.quizzes.slice(1).some(q => q.rem > 0)) remHas = false;  // ch3 必含余数题
    /* 引擎直驱：防御层 → 发放序号递增 → ask 切换+轮流均匀 → ask 期点糖 null → 余数留桌
       → 首题同卡连错 2（不灰化可重点）→ 带错通关 2 星；另全对 3 星 */
    const Ld = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      if (engPick(Ld, 0) !== 'again') driveOk = false;                          // 发放期点答案卡
      const cnt = q.n - q.rem;
      for (let i = 0; i < cnt; i++) {
        if (engTapCandy(Ld, i) !== i + 1) { driveOk = false; break; }
      }
      if (!driveOk) break;
      if (q._phase !== 'ask' || q._left !== q.rem) driveOk = false;             // 余数糖留桌上
      if (!q._given.every(v => v === q.answer)) driveOk = false;                // 轮流发放=各盘=商
      if (engTapCandy(Ld, 0) !== null || engTapCandy(Ld, 99) !== null ||
          engTapCandy(Ld, 0.5) !== null) driveOk = false;                       // ask 期/非法下标
      if (k === 0) {                                                            // 首题连错 2 次再答对
        let wi = 0; while (wi === q.answerIdx) wi++;
        if (engPick(Ld, wi) !== 'wrong' || q.miss !== 1 || Ld.retries !== 1) driveOk = false;
        if (engPick(Ld, wi) !== 'wrong' || q.miss !== 2 || Ld.retries !== 2) driveOk = false;   // 同卡可重点
      }
      const want = k === Ld.quizzes.length - 1 ? 'done' : 'right';
      if (engPick(Ld, q.answerIdx) !== want) driveOk = false;
    }
    const stars2 = Ld.done && Ld.step === CH_LEN && Ld.retries === 2 && engStars(Ld) === 2;
    const L3 = genLevel(flat);
    let guard = 0;
    while (!L3.done && guard++ < 30) {
      const q = L3.quizzes[L3.step];
      for (let i = 0; i < q.n - q.rem; i++) engTapCandy(L3, i);
      engPick(L3, q.answerIdx);
    }
    const stars3 = L3.done && L3.retries === 0 && engStars(L3) === 3;           // 全对 3 星（永不 0）
    if (!stars2 || !stars3) driveOk = false;
    const ok = det && L1.quizzes.length === CH_LEN && rangeAll && warmOk && adjOk &&
      structAll && distrAll && remHas && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, warmOk: warmOk,
      adjOk: adjOk, structAll: structAll, distrAll: distrAll, remHas: remHas, driveOk: driveOk,
      stars: { wrong2: engStars(Ld), clean: engStars(L3) },
      qs: L1.quizzes.map(q => q.n + '/' + q.m + '=' + q.answer + (q.rem ? 'r' + q.rem : '')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCandy 单元（flat0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = DV.quiz;
  const n0 = q0.total, m0 = q0.plates, K0 = n0 - q0.rem;
  const taps = [];
  for (let i = 0; i < K0; i++) taps.push(DV.tapCandy(i));
  const incOk = taps.every((v, i) => v === i + 1);
  const qAfter = DV.quiz;
  const stateOk = qAfter.phase === 'ask' && qAfter.left === q0.rem &&
    qAfter.given.every(v => v === q0.answer) && qAfter.cur === 0;               // 轮流均匀+ask 切换
  const goneN = candyTrayEl.querySelectorAll('.candy.gone').length;             // 每颗已发糖 .gone
  const goneOk = goneN === K0;
  const badIdx = DV.tapCandy(99) === false && DV.tapCandy(-1) === false && DV.tapCandy('x') === false;
  const askTap = DV.tapCandy(0) === false && DV.currentLevel.step === 0;        // ask 期点糖不推进
  await wait(560 * SPEED);                                                      // 等飞行动画落地更新盘角标 DOM
  let badgeOk = true;
  for (let p = 0; p < m0; p++) {                                                // 盘角标 DOM=各盘已放
    const bd = plateEls(p).querySelector('.badge');
    if (bd.textContent !== String(q0.answer) || !bd.classList.contains('on')) badgeOk = false;
  }
  await wait(200 * SPEED);                                                      // 等 showAsk 亮卡
  const optN = answersEl.querySelectorAll('.opt').length;
  const tapOk = incOk && stateOk && goneOk && badgeOk && badIdx && askTap && optN === 3;
  if (tapOk) npass++;
  units.tapCandy = { ok: tapOk, taps: taps, phase: qAfter.phase, left: qAfter.left,
    given: qAfter.given, gone: goneN, badge: badgeOk, badIdx: badIdx, askTap: askTap, optN: optN };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'div_wrong').length;  /* wrong 已 clip 化（审查 m5） */
  const dealAll = async () => {
    const q = cur.quizzes[cur.step];
    let g = 0;
    while (q._phase === 'deal' && g++ < 16) {
      let i = 0; while (i < q.n && q._flown[i]) i++;
      if (i >= q.n) break;
      uiTapCandy(i);
    }
    await wait(700 * SPEED);
  };
  const wrongIdx = () => { const q = DV.quiz; let i = 0; while (i === q.answerIdx) i++; return i; };
  startLevel(0);                                // flat0：每错必播
  await dealAll();
  await DV.tapAnswer(wrongIdx());
  await DV.tapAnswer(wrongIdx());
  const sayA = wrongPlays();                    // → 2
  startLevel(3);                                // flat3：10s 节流
  await dealAll();
  lastWrongVoice = Date.now();                  /* 显式进入节流窗口内 */
  await DV.tapAnswer(wrongIdx());               // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                // 增量 → 0
  startLevel(3);                                // 同关重发 fresh quiz：miss===2 force 豁免
  await dealAll();
  lastWrongVoice = 0;                           /* 隔离上一子用例时间戳 */
  await DV.tapAnswer(wrongIdx());               // miss=1 → 播（10s 窗口外）
  await DV.tapAnswer(wrongIdx());               // miss=2 → force === 2 → 播
  const sayC = wrongPlays() - 2 - sayB;         // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = DV.quiz;
    if (!q) { smokeA = false; break; }
    await dealAll();
    if (s === 0) {                              // 首错：晃动不灰掉可重点；首错不 pulse 正确卡
      const widx = wrongIdx();
      await DV.tapAnswer(widx);
      const wEl = answersEl.querySelector('.opt[data-i="' + widx + '"]');
      const okEl = answersEl.querySelector('.opt[data-i="' + DV.quiz.answerIdx + '"]');
      wrongOk = !!wEl && wEl.classList.contains('wrong') &&
        getComputedStyle(wEl).pointerEvents !== 'none' &&       /* 不灰化：可重点（SPEC §1） */
        !okEl.classList.contains('breathe') &&                  /* 首错不 pulse */
        DV.currentLevel.retries === 1 && DV.currentLevel.step === 0;
    }
    const q2 = DV.quiz;
    const r = await DV.tapAnswer(q2.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    quizzesA++;
  }
  const lvA = DV.currentLevel;
  const smokeOkA = smokeA && wrongOk && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, quizzes: quizzesA,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat10（ch3 有余数）首题热身+余数留桌+div_rem 播出+autoSolve 3 星 ---- */
  total++;
  const rLog = [];
  const origPlay4 = KIDS.voice.play;
  KIDS.voice.play = function (key) { rLog.push(String(key)); };
  startLevel(10);
  const L10 = genLevel(10);
  const warm10 = cur.dch === 3 && L10.quizzes[0].rem === 0 && L10.quizzes.slice(1).some(q => q.rem > 0);
  await dealAll();                              // 首题（热身无余数）发放+亮卡
  await DV.tapAnswer(DV.quiz.answerIdx);        // 答对 → 进入第二题（余数题，确定性）
  const qRem = DV.quiz;
  await dealAll();                              // 余数题发放：剩 rem 颗留桌上
  const leftoverN = candyTrayEl.querySelectorAll('.candy.leftover').length;
  const remOk = qRem.rem > 0 && DV.quiz.phase === 'ask' && DV.quiz.left === qRem.rem &&
    leftoverN === qRem.rem &&                                   // 剩糖留桌上（SPEC §1）
    rLog.indexOf('div_rem' + qRem.rem) >= 0;                    // 余数句语音播出（无 flat 门）
  KIDS.voice.play = origPlay4;
  const a10 = await DV.autoSolve();             // 收尾通关（从第二题 ask 期继续）
  const lv10 = DV.currentLevel;
  const smokeOkB1 = warm10 && remOk && a10.done && lv10.done && lv10.won &&
    lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat10 = { ok: smokeOkB1, warm: warm10, remOk: remOk, rem: qRem.rem,
    leftover: leftoverN, picks: a10.picks, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat15（ch4 算式黑板）黑板 DOM+首题热身+真实点击通关 ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const q15 = L15.quizzes[0];
  const fEl = document.getElementById('formula');
  const boardOk = cur.dch === 4 && !!fEl && fEl.textContent.replace(/\s/g, '') ===
    (q15.n + '÷' + q15.m + '=?') && q15.rem === 0;              // 黑板算式直给+首题热身
  let playB2 = true, quizzesB = 0;
  for (let s = 0; s < CH_LEN && playB2; s++) {
    const q = DV.quiz;
    if (!q) { playB2 = false; break; }
    await dealAll();
    const r = await DV.tapAnswer(q.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB2 = false;
    quizzesB++;
  }
  const lv15 = DV.currentLevel;
  const smokeOkB2 = boardOk && playB2 && quizzesB === CH_LEN && lv15.done && lv15.won &&
    lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB2) npass++;
  smokes.flat15 = { ok: smokeOkB2, board: boardOk, formula: fEl ? fEl.textContent : null,
    quizzes: quizzesB, stars: engStars(cur) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → demo 发放+答对 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const tutOk = pLog7.indexOf('div_tut_watch') >= 0 &&                       /* 看=演示配 watch clip */
    state.tut === 'help' && !state.demo && !state.locked &&                  /* 帮：解锁等孩子动手 */
    DV.currentLevel && DV.currentLevel.flat === 0 &&                         /* 重发同关 */
    DV.quiz && DV.quiz.step === 0 && DV.quiz.phase === 'deal' &&             /* 新题面发放初态 */
    lastQ7 && lastQ7.length === 6 && lastQ7[0] === 'div_tut_turn' &&         /* 交接顺序链单通道 */
    lastQ7[1].key === 'div_n_' + DV.quiz.total && lastQ7[5].text === VOICE.q3.text;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('div_tut_watch') >= 0,
    handoff: !!lastQ7, parts: lastQ7, tut: state.tut, phase: DV.quiz ? DV.quiz.phase : null };

  /* ---- ⑤ 布局：双 viewport ×（flat0 / flat10 / flat15）×（deal 期 / ask 期）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：candy-in scale(0) 起帧） ---- */
  async function simDeal(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 糖果入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const de = document.documentElement;
    const q = cur.quizzes[cur.step];
    const candies = Array.prototype.slice.call(candyTrayEl.querySelectorAll('.candy'));
    const candyOk = candies.length === q.n &&
      candies.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const plates = Array.prototype.slice.call(plateRowEl.querySelectorAll('.plate'));
    const plateOk = plates.length === q.m &&
      plates.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, phase: 'deal', candyOk: candyOk, plateOk: plateOk,
      btnOk: btnOk, ox: ox, pass: candyOk && plateOk && btnOk && ox <= 0 };
  }
  async function simAsk(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await dealAll();                            // 发放完毕亮卡（showAsk 窗口已含 700*SPEED）
    await wait(620);                            // 答案卡入场动画结束再量（§0.11）
    const de = document.documentElement;
    const opts = Array.prototype.slice.call(answersEl.querySelectorAll('.opt'));
    const optOk = opts.length === 3 &&
      opts.every(b => { const r = b.getBoundingClientRect(); return r.width >= 96 && r.height >= 96; });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, phase: 'ask', optOk: optOk, ox: ox, pass: optOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 10, 15]) {
    sims.push(await simDeal(1280, 800, f));
    sims.push(await simDeal(800, 1180, f));
    sims.push(await simAsk(1280, 800, f));
    sims.push(await simAsk(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 12 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / 救援拼句 / 覆盖率 ---- */
  total++;
  /* SPEC §1 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！糖果分一分' &&
    VOICE.turn.text === '你来分一分' && VOICE.hint.text === '一人一颗轮着分' &&
    VOICE.q1.text === '颗糖，平均分给' && VOICE.q2.text === '个小朋友' &&
    VOICE.q3.text === '每人几颗呀' && VOICE.rem1.text === '剩下一颗不够分啦' &&
    VOICE.rem2.text === '剩下两颗不够分啦';
  const numCnOk = numCn(2) === '二' && numCn(10) === '十' && numCn(11) === '十一' && numCn(12) === '十二';
  /* div_* 全部 19 条 clips 注入对账（build 注入后 KIDS.voice.clips 应含全部） */
  const DIV_KEYS = ['div_tut_watch', 'div_tut_turn', 'div_hint', 'div_q1', 'div_q2', 'div_q3',
    'div_rem1', 'div_rem2', 'div_wrong'].concat([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => 'div_n_' + n));
  const clipOk = DIV_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([div_hint, ...题面 5 段]) 单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const q0v = genLevel(0).quizzes[0];
  const openChain = qLog.length >= 1 && lastQ.length === 6 && lastQ[0] === 'div_hint' &&
    lastQ[1].key === 'div_n_' + q0v.n && lastQ[3].key === 'div_n_' + q0v.m &&
    lastQ[2].text === VOICE.q1.text && lastQ[5].text === VOICE.q3.text;
  speakQuiz(q0v);                               // 救援/重听拼句：题面 5 段（clip 在场走 queue）
  const lastQ2 = qLog[qLog.length - 1];
  const rescueChain = qLog.length >= 2 && lastQ2 !== lastQ && lastQ2.length === 5 &&
    lastQ2[0] === 'div_n_' + q0v.n && lastQ2[4] === 'div_q3';
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  /* 答案位置分布：三位置均出现、首位不恒定（<60%） */
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[0] < 200 * 0.6;
  const specOk = refVoice && numCnOk && clipOk && openChain && rescueChain && distOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, numCn: numCnOk, clips: clipOk,
    openChain: openChain, rescueChain: rescueChain, idx: idxDist, n: idxDist[0] + idxDist[1] + idxDist[2] };

  const out = { game: 'divide', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
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
