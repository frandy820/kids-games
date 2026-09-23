/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 50 关全量审计（flat 0-49：静态 30 + 生成 20）：确定性（同 flat 两次生成 JSON 一致）/
     structOk（from≠to、方向与起终点一致、len=|to-from|、起终点 1-20、藏格不涉起终点且在途中）/
     r7 章规则独立重列（SPEC §3-r7 文字直译，禁引引擎常量互证）：
       dch1 顺数 1-10（span10，from=1，to 5-8，全显）/ dch2 跨十顺数（span20，to 15-20，len 4-8）/
       dch3 倒数（span20，len 5-8）/ dch4 藏格心算（span10，len 4-8，偶顺奇倒，途中格全藏）/
       dch5 大石头阵（span20，len 4-8，偶顺奇倒，途中格全藏，远端≥14 跨十段）/
       dch6 跳两格（span20，mode2，偶链 2→8-16/奇链 1→7-15，len 偶 6-14=3-7 跳）/
     相邻题起终点不重样 / 引擎直驱（self 不计错→far 计一次错→逐落点 step→goal/done，藏格全点亮）/
     r7 时长硬断言：每关推算 Σ[estMs(题面句长)+Σhop(1800|藏 2600)+900] ≥ 40000ms（独立副本重列）
   ② tapCell 单元：far/self/step 判定 + miss 计数 + 非法下标 false
   ③ r7 跳 2 单元（flat25 dch6）：±1=far / ±2=step、链上双箭头+非链减淡、autoSolve 3 星
   ④ r7 藏格单元（flat15 dch4）：途中格全藏（=inner 全集）+ 踩到点亮 + 连错零 pulse（去逐格发光兜底）
   ⑤ r7 数域 20 单元（flat5 dch2）：20 格 4 行蛇形、十点阵（.dots i 总数=n 不变量）
   ⑥ 布局：双 viewport（1280×800 / 800×1180）×（span10 基础/span20/藏格/跳 2）：
     格 ≥64×64、格不出界、旗可见、点数齐全、藏格数字 visibility 遮蔽、overflowX ≤0
   ⑦ 分布与家族：章 1 目标多值（不恒定）/ dch4·5 每关双向 / dch6 每关偶奇双链都有 /
     estMs 家族（n*345+600 定版，禁 +300 变体）+ 与源模型 levelDurMs 对账一致
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const ch1Tos = {}, durAll = [];
  let durMin = Infinity, durMax = 0;

  /* ---- r7 独立副本：SPEC §3-r7 数值/文案重列（禁引 SPAN/HOP_MS 等引擎常量互证） ---- */
  const V_SPAN = { 1: 10, 2: 20, 3: 20, 4: 10, 5: 20, 6: 20 };
  const V_EST = c => c * 345 + 600;
  const V_HOP = 1800, V_HID = 2600, V_GOAL = 900, V_MIN = 40000;
  function vNum(n) {
    const D = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    if (n <= 9) return D[n - 1];
    if (n === 10) return '十';
    if (n <= 19) return '十' + D[n - 11];
    return '二十';
  }
  function vSpeech(q) {                          // SPEC §3-r7 题面句模板（mode2 前缀"两块两块"）
    const head = q.mode === 2 ? (q.dir > 0 ? '两块两块跳，跳到' : '两块两块往回跳，跳到')
                              : (q.dir > 0 ? '跳到' : '往回跳，跳到');
    return head + vNum(q.to);
  }
  function vDur(q) {                             // 单题推算：听题+逐落点（藏格加成）+到旗窗
    const st = q.mode === 2 ? 2 : 1;
    let ms = 0, pos = q.from;
    for (let h = 0; h < q.len / st; h++) {
      pos += st * q.dir;
      ms += q.hidden.indexOf(pos) >= 0 ? V_HID : V_HOP;
    }
    return V_EST(vSpeech(q).length) + ms + V_GOAL;
  }
  const vInner = q => {                          // 途中介格（不含起终点）
    const r = [];
    for (let v = Math.min(q.from, q.to) + 1; v <= Math.max(q.from, q.to) - 1; v++) r.push(v);
    return r;
  };

  /* ---- ① 50 关全量审计（flat 0-49） ---- */
  for (let flat = 0; flat < 50; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let structAll = true, ruleOk = true, adjOk = true, driveOk = true, spanOk = true, durOk = true;
    let fwdN = 0, backN = 0, chainEv = 0, chainOd = 0, durMs = 0;
    spanOk = L1.span === V_SPAN[L1.dch];
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q)) structAll = false;
      const inner = vInner(q);
      /* r7 章规则：独立重列（SPEC 文字直译） */
      if (L1.dch === 1) {
        if (!(q.from === 1 && q.to >= 5 && q.to <= 8 && q.dir === 1 && q.mode === 1 &&
              q.hidden.length === 0 && q.len === q.to - 1)) ruleOk = false;
      } else if (L1.dch === 2) {
        if (!(q.dir === 1 && q.mode === 1 && q.to >= 15 && q.to <= 20 &&
              q.len >= 4 && q.len <= 8 && q.len === q.to - q.from && q.hidden.length === 0)) ruleOk = false;
      } else if (L1.dch === 3) {
        if (!(q.dir === -1 && q.mode === 1 && q.len >= 5 && q.len <= 8 &&
              q.len === q.from - q.to && q.from <= 20 && q.to >= 5 && q.hidden.length === 0)) ruleOk = false;
      } else if (L1.dch === 4) {
        if (!(q.mode === 1 && q.len >= 4 && q.len <= 8 && q.len === Math.abs(q.to - q.from) &&
              q.hidden.length === inner.length && inner.every(v => q.hidden.indexOf(v) >= 0) &&
              (k % 2 === 0 ? (q.from === 1 && q.dir === 1) : (q.to === 1 && q.dir === -1)))) ruleOk = false;
      } else if (L1.dch === 5) {
        if (!(q.mode === 1 && q.len >= 4 && q.len <= 8 && q.len === Math.abs(q.to - q.from) &&
              q.hidden.length === inner.length && inner.every(v => q.hidden.indexOf(v) >= 0) &&
              Math.max(q.from, q.to) >= 14)) ruleOk = false;
      } else {  // dch6
        if (!(q.mode === 2 && q.dir === 1 && q.hidden.length === 0 && q.len % 2 === 0 &&
              q.len >= 6 && q.len <= 14 && q.len === q.to - q.from &&
              (k % 2 === 0 ? (q.from === 2 && q.to % 2 === 0) : (q.from === 1 && q.to % 2 === 1)))) ruleOk = false;
      }
      if (q.from < 1 || q.from > L1.span || q.to < 1 || q.to > L1.span) ruleOk = false;
      if (L1.dch === 4 || L1.dch === 5) { if (q.dir === 1) fwdN++; else backN++; }
      if (L1.dch === 6) { if (q.from % 2 === 0) chainEv++; else chainOd++; }
      if (k > 0) {
        const p = L1.quizzes[k - 1];
        if (p.from === q.from && p.to === q.to) adjOk = false;               // 相邻题起终点不重样
      }
      if (L1.dch === 1) ch1Tos[q.to] = (ch1Tos[q.to] || 0) + 1;
      if (vSpeech(q) !== qSpeech(q)) durOk = false;   // r7 审查 m-1：题句副本 vs 引擎对账（防时长失锚）
    durMs += vDur(q);
    }
    if ((L1.dch === 4 || L1.dch === 5) && (fwdN < 2 || backN < 2)) ruleOk = false;   // 每关双向都有
    if (L1.dch === 6 && (chainEv < 2 || chainOd < 2)) ruleOk = false;               // 每关偶奇双链都有
    if (durMs < V_MIN) durOk = false;                                              // r7 时长硬断言 ≥40s
    durAll.push(durMs);
    if (durMs < durMin) durMin = durMs;
    if (durMs > durMax) durMax = durMs;
    if (levelDurMs(L1) !== durMs) durOk = false;                                   // 源模型与独立副本对账一致
    /* 引擎直驱：self 不计错 → far 计一次错 → 还原（重生成同关干净驱动）→ 逐落点到旗
       （藏数字格随步点亮；goal/done 推进；0 错驱动+预置 1 far=3 星口径同前） */
    const Ld = genLevel(flat);
    const q0 = Ld.quizzes[0];
    if (engTap(Ld, q0.from) !== 'self' || Ld.retries !== 0) driveOk = false; // 点当前格：不计错
    const farOff = (q0.mode === 2 ? 1 : 2) * q0.dir;                         // mode1 far=±2，mode2 far=±1
    let farN = q0._cur + farOff;
    if (farN < 1 || farN > Ld.span) farN = q0._cur - farOff;
    if (farN >= 1 && farN <= Ld.span && Math.abs(farN - q0._cur) !== (q0.mode === 2 ? 2 : 1)) {
      if (engTap(Ld, farN) !== 'far' || Ld.retries !== 1 || q0._miss !== 1) driveOk = false;
    }
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      let pos = q._cur;
      let guard = 0;
      while (pos !== q.to && guard++ < 30) {
        pos = engNext(q);
        const want = pos === q.to ? (k === Ld.quizzes.length - 1 ? 'done' : 'goal') : 'step';
        if (engTap(Ld, pos) !== want) { driveOk = false; break; }
      }
      if (q.hide && !q.hidden.every(h => q._shown.indexOf(h) >= 0)) driveOk = false;   // 藏格全点亮
      if (q._cur !== q.to) driveOk = false;
    }
    const solvedAll = Ld.done && Ld.step === CH_LEN && Ld.retries === 1 && engStars(Ld) === 2;
    const ok = det && L1.quizzes.length === CH_LEN && structAll && ruleOk && adjOk &&
      driveOk && spanOk && durOk && Ld.done;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, span: L1.span, ok: ok, det: det, structAll: structAll,
      ruleOk: ruleOk, adjOk: adjOk, driveOk: driveOk && solvedAll, spanOk: spanOk, durMs: durMs,
      durOk: durOk, fwd: fwdN, back: backN,
      qs: L1.quizzes.map(q => (q.mode === 2 ? '2x' : '') + (q.dir === 1 ? '' : '<') + q.from + '-' + q.to +
        (q.hidden.length ? '(藏' + q.hidden.length + '格)' : '')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCell 单元（flat 0 真实 UI 状态机，mode1） ---- */
  total++;
  startLevel(0);
  const q0 = HOP.quiz;
  const far0 = q0.from + (q0.dir === 1 ? 2 : -2);
  const rFar = await HOP.tapCell(far0);        // 非步长格：摇头零惩罚 + miss 计数
  const farOk = rFar === 'far' && HOP.quiz.miss === 1 && HOP.currentLevel.retries === 1 &&
    HOP.quiz.cur === q0.from && cellEl(far0).classList.contains('shake');
  const rSelf = await HOP.tapCell(q0.from);    // 点当前所站格：self 早退不计错
  const selfOk = rSelf === 'self' && HOP.quiz.miss === 1 && HOP.currentLevel.retries === 1;
  const nxt = engNext(cur.quizzes[0]);
  const rStep = await HOP.tapCell(nxt);        // 相邻格：跳过去 + cur 更新 + here 圈迁移
  const stepOk = rStep === 'step' && HOP.quiz.cur === nxt &&
    cellEl(nxt).classList.contains('here') && !cellEl(q0.from).classList.contains('here');
  const badIdx = (await HOP.tapCell(0)) === false && (await HOP.tapCell(11)) === false &&
    (await HOP.tapCell(3.5)) === false;
  const tapOk = farOk && selfOk && stepOk && badIdx;
  if (tapOk) npass++;
  units.tapCell = { ok: tapOk, far: farOk, self: selfOk, step: stepOk, badIdx: badIdx };

  /* ---- ③ r7 跳 2 单元（flat25=dch6：mode2 步长 2，±1=far；偶奇双链；链视觉） ---- */
  total++;
  startLevel(25);
  const qs6 = HOP.quiz;
  const far6 = qs6.cur + 1;                    // 只跳一格：far（步长须为 2）
  const r6far = await HOP.tapCell(far6);
  const far6Ok = r6far === 'far' && HOP.quiz.miss === 1 && HOP.quiz.cur === qs6.from;
  const step6 = qs6.from + 2 * qs6.dir;        // 跳两格：合法 step
  const r6step = await HOP.tapCell(step6);
  const step6Ok = r6step === 'step' && HOP.quiz.cur === step6;
  const chainPar = qs6.from % 2;               // 链视觉：链上格无减淡+双箭头，非链格减淡
  let chainVisOk = true;
  for (let n = 1; n <= HOP.currentLevel.span; n++) {
    const el = cellEl(n), onChain = n % 2 === chainPar;
    if (onChain && el.classList.contains('off')) chainVisOk = false;
    if (!onChain && !el.classList.contains('off')) chainVisOk = false;
  }
  const chainLinkOk = cellEl(qs6.from).classList.contains('aR2') &&            // quiz0 偶链 2→4 同行右向 »
    cellEl(qs6.from + 2).classList.contains('aD2');                            // 4→6 跨行折下 »
  const chipSkipOk = chipEl.classList.contains('skip');
  const a25 = await HOP.autoSolve();
  const lv25 = HOP.currentLevel;
  const skipOk = far6Ok && step6Ok && chainVisOk && chainLinkOk && chipSkipOk &&
    a25.done && lv25.done && lv25.won && lv25.retries === 1 && engStars(cur) === 2;
  if (skipOk) npass++;
  units.skip2 = { ok: skipOk, far: far6Ok, step: step6Ok, chainVis: chainVisOk,
    chainArrow: chainLinkOk, chip: chipSkipOk, hops: a25.hops, retries: lv25.retries };

  /* ---- ④ r7 藏格单元（flat15=dch4：途中格全藏=inner 全集；踩到点亮；连错零 pulse） ---- */
  total++;
  startLevel(15);
  const q15 = HOP.quiz;
  const inner15 = [];
  for (let v = Math.min(q15.from, q15.to) + 1; v <= Math.max(q15.from, q15.to) - 1; v++) inner15.push(v);
  const maskedDom = pathEl.querySelectorAll('.cell.masked').length;
  const hidOk = q15.hidden.length === inner15.length && inner15.every(v => q15.hidden.indexOf(v) >= 0) &&
    maskedDom === q15.hidden.length &&
    q15.hidden.every(h => h !== q15.from && h !== q15.to);                    // 藏格=途中全集，不涉起终点
  let maskCssOk = true;
  q15.hidden.forEach(h => {                                                   // 遮蔽=数字 visibility:hidden（点数保留）
    const v = getComputedStyle(cellEl(h).querySelector('.num')).visibility;
    if (v !== 'hidden') maskCssOk = false;
  });
  const hidStep = q15.hidden[0];              // 真实踩上第一块藏格：数字点亮（已跳格轨迹）
  let walk = q15.from;
  while (walk !== hidStep) { walk += (hidStep > walk ? 1 : -1); await HOP.tapCell(walk); }
  const revealOk = !cellEl(hidStep).classList.contains('masked') &&
    cellEl(hidStep).classList.contains('reveal') &&
    getComputedStyle(cellEl(hidStep).querySelector('.num')).visibility === 'visible';
  const farHid = HOP.quiz.cur + 2;            // 连错两次：r7 去逐格发光兜底——恒无 pulse
  await HOP.tapCell(farHid);
  await HOP.tapCell(farHid);
  const noPulseOk = HOP.quiz.miss === 2 && document.querySelectorAll('.cell.pulse').length === 0;
  const a15 = await HOP.autoSolve();
  const lv15 = HOP.currentLevel;
  const smokeOkB = hidOk && maskCssOk && revealOk && noPulseOk && a15.done && lv15.done &&
    lv15.retries === 2 && engStars(cur) === 2;
  if (smokeOkB) npass++;
  units.hidden = { ok: smokeOkB, hidden: q15.hidden.slice(), inner: inner15, domMasked: maskedDom,
    hidOk: hidOk, maskCss: maskCssOk, reveal: revealOk, noPulse: noPulseOk,
    hops: a15.hops, retries: lv15.retries, stars: engStars(cur) };

  /* ---- ⑤ r7 数域 20 单元（flat5=dch2：20 格蛇形 4 行；十点阵 .dots i 总数=n） ---- */
  total++;
  startLevel(5);
  const lv5 = HOP.currentLevel;
  const cells5 = pathEl.querySelectorAll('.cell').length;
  let dotsOk20 = true, tenOk = true;
  for (let n = 1; n <= 20; n++) {
    const el = cellEl(n);
    const iN = el.querySelectorAll('.dots i').length;                          // 十点阵内 10 点也计 <i>
    if (iN !== n) dotsOk20 = false;                                            // .dots i 总数=n 不变量
    const tenN = el.querySelectorAll('.dots .ten').length;
    if (tenN !== Math.floor(n / 10)) tenOk = false;                            // 十点阵个数=十位数（10=1 框，20=2 框）
  }
  const rowOk20 = cellEl(1).style.gridArea.startsWith('1 /') && cellEl(6).style.gridArea.startsWith('2 /') &&
    cellEl(11).style.gridArea.startsWith('3 /') && cellEl(16).style.gridArea.startsWith('4 /');
  const spanOk20 = cells5 === 20 && lv5.span === 20 && rowOk20 && HOP.quiz.to >= 15;
  const dom20Ok = spanOk20 && dotsOk20 && tenOk;
  if (dom20Ok) npass++;
  units.span20 = { ok: dom20Ok, cells: cells5, dots: dotsOk20, ten: tenOk, rows: rowOk20 };

  /* ---- ⑥ 布局：双 viewport 模拟 ×（dch1 基础 / dch2 数域20 / dch4 藏格 / dch6 跳2） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                               // 按新场地尺寸重排（旗/藏格/兔子随题重挂）
    const de = document.documentElement;
    const cells = Array.prototype.map.call(pathEl.querySelectorAll('.cell'), b => b.getBoundingClientRect());
    const span = HOP.currentLevel ? HOP.currentLevel.span : 0;
    const hitOk = cells.length === span && cells.every(r => r.width >= 64 && r.height >= 64);
    const fRect = fieldEl.getBoundingClientRect();
    const insideOk = cells.every(r => r.left >= fRect.left - 1 && r.right <= fRect.right + 1 &&
      r.top >= fRect.top - 1 && r.bottom <= fRect.bottom + 1);                // 格不出界
    const flag = fieldEl.querySelector('.cell.goal .flag');
    const flagR = flag ? flag.getBoundingClientRect() : null;
    const flagOk = !!flagR && flagR.width >= 14 && flagR.height >= 16;        // 旗可见
    let dotsOk = true;
    for (let n = 1; n <= span; n++) {                                         // 数字+点数双显齐全（.dots i=n）
      const d = cellEl(n).querySelectorAll('.dots i').length;
      if (d !== n) dotsOk = false;
    }
    let maskVisOk = true;
    for (let n = 1; n <= span; n++) {
      const masked = cellEl(n).classList.contains('masked');
      const v = getComputedStyle(cellEl(n).querySelector('.num')).visibility;
      if (masked !== (v === 'hidden')) maskVisOk = false;
    }
    const rabOk = rabbitEl.getBoundingClientRect().width >= 56;               // 兔子在场上
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: cur.flat, dch: cur.dch, hitOk: hitOk, insideOk: insideOk,
      flagOk: flagOk, dotsOk: dotsOk, maskVisOk: maskVisOk, rabOk: rabOk, ox: ox,
      pass: hitOk && insideOk && flagOk && dotsOk && maskVisOk && rabOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 15, 25]) {           // dch1 基础 / dch2 数域20 / dch4 藏格 / dch6 跳2
    startLevel(flat);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑦ 分布与家族：章 1 目标多值 / 章规则性 / estMs 家族定版 ---- */
  total++;
  const tos = Object.keys(ch1Tos).map(Number).sort((a, b) => a - b);
  const distOk = tos.length >= 2 && tos.every(t => t >= 5 && t <= 8) &&
    durAll.length === 50 && Math.min.apply(null, durAll) >= V_MIN;
  const estOk = estMs(1) === 945 && estMs(12) === 12 * 345 + 600 &&
    estMs.toString().indexOf('345') >= 0 && estMs.toString().indexOf('+ 300') < 0;
  /* r7 审查 M1：nextHint 家族断言（期望文案独立副本重列，禁引 CHAPTERS 互证）——
     原实现 floor((f+1)/CH_LEN)+1 全部静态章末（f≡4 mod 5）多进一章，试玩 P2 截图实锤 */
  const SPEC_HINT = { 4: '要数到二十啦，从十一接着往上数', 9: '插蓝旗啦，小兔子要往回跳',
    14: '石头藏起数字啦，数一数圆点', 19: '更大的石头阵，数字也藏起来',
    24: '两块两块跳，一次跳过一块石头', 28: '新一轮跳格子数数' };
  const hintOk = Object.keys(SPEC_HINT).every(f => nextHint(+f) === SPEC_HINT[f]);
  const hintNeg = nextHint(4) !== '插蓝旗啦，小兔子要往回跳';   /* off-by-one 回归哨兵 */
  const famOk = distOk && estOk && hintOk && hintNeg;
  if (famOk) npass++;
  units.dist = { ok: famOk, ch1Tos: ch1Tos, estMs: estOk, hintOk: hintOk && hintNeg,
    durMin: durMin, durMax: durMax, durLevels: durAll.length };

  const out = { game: 'hopscotch', total: total, pass: npass, layoutOk: layoutOk,
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
