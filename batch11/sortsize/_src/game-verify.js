/* ================= ?verify=1 自检（仅 verify 分支加载执行；r19 独立第 4 script 块）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 两次生成 JSON 一致）/ 章规则
     （r19 题计划：ch1 6-7 物相近档恒 big；ch2 +方向混合（qi1 首现 small）；ch3 双属性
     （qi0 热身明显档 first=r）；ch4 序数（qi0 热身 rank2 / qi3 第N小 / qi4 dual 回顾）；
     每关 sort/ord 题种互异）/ structWhy（阶梯档位逐值、dual 每档恰一红一蓝、级差落带、
     展示非单调、序数域 [2,n-2]、left/pos/answerIdx/miss 自洽）/ 引擎直驱（首题连错 2
     → 排对一步 → 点已排位 again → 逐点 answerIdx 独立重算全对 → 2 星；另全对 3 星）
   ② tapCard 单元 sort（flat0 obv6）：卡 data-size 对账 / 首错=晃动不灰掉+首错不 pulse
     / 窗内二错=吞（契约 I：miss 不动返 false）/ 窗过后二错=miss2+force 播+应点卡 breathe
     / 非法下标 false / 答对一步=源卡 gone+pos 推进+locked 拦截+槽 lit / again / goal 换题
   ②b tapCard 单元 dual（flat10 热身）：色徽章 legend=first 色 / 卡 data-c 对账 /
     同档异色=错（wig）/ 首色=对 → 平局翻转（下一应点=同档另一色）独立重算
   ②c tapCard 单元 ord（flat15 热身）：单槽+槽内数字=rank / 题面锚 n 圆点降序+ring 位=rank-1
     / 错点=wig 零惩罚不推进 / 对点=goal 飞入单槽 lit
   ③ sayW 三态+豁免窗（flat0 无节流两错均播（间隔>窗）/ flat3 节流静默不设窗照计数
     / miss===2 force 起播设窗 / 窗内吞）
   ④ UI 冒烟：A flat0 真实通路（首错=2 星）/ B1 flat5 autoSolve 3 星+方向混合
     / B2 flat10 dual 真实点击通关 / B3 flat15 ord+dual 混排真实通关
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip 播出 → demo 排对一步 → 重发同关 →
     交接链 queue([sor_tut_turn, 题面]) → tut='help' 解锁
   ⑤ 布局：双 viewport 模拟 ×（obv6 flat0/close7 flat3/dual flat10/ord flat15）：
     卡数=物数、卡 ≥96、槽 ≥64（ord=单槽）、emoji 不溢出卡、题面锚/徽章结构、全按钮 ≥64
     （.k-parentbtn 豁免）、overflowX ≤0
   ⑥ 分布与专项：SIZE_LADDER 独立字面量对账 / 三族题面句独立字面量 / 17 条 sor_* clips
     注入 / 开场链与三族读题链 stub（全 keyed，keylessLast）/ 40 关 8 种 emoji 全覆盖+
     方向分布 / script[2] 源码断言（家族 A/F/I 字面+旧字面清除，检索串拼接防自匹配）
   ⑧ 时长模型 r19 双钉：STEP/ORD 字面 === SPEC / modeled(0)===88650 / 40 关 min===82760
     max===137900 / verify 独立 SPEC 计划复算逐章对账
   结果写 #verify-result + document.title='VERIFY PASS n/n'（墙钟 <100s，SPEC §-r19 标注） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const kindDist = {};
  KIND_IDS.forEach(k => { kindDist[k] = 0; });
  let dirBig = 0, dirSmall = 0, mixedLevels = 0;

  /* answerIdx 独立重算器（不调 engAnswerIdx/engPrecedes，防同源假阳性——比较器语义从 SPEC 推导） */
  const expectIdx = q => {
    if (q.kind === 'ord') {
      const order = q.items.map((v, i) => [v, i])
        .sort((x, y) => q.order === 'big' ? y[0] - x[0] : x[0] - y[0]);
      return order[q.rank - 1][1];
    }
    const before = (a, b) => {
      if (q.items[a] !== q.items[b]) return q.order === 'big' ? q.items[a] > q.items[b] : q.items[a] < q.items[b];
      return q.kind === 'dual' ? q.colors[a] === q.first : false;   /* 同档：首色在前（SPEC 唯一解先验） */
    };
    let best = -1;
    for (const i of q.left) if (best < 0 || before(i, best)) best = i;
    return best;
  };
  const ladderSet = tier => SIZE_LADDER[tier].slice().sort((a, b) => a - b).join(',');

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);      // 确定性（含 pdch）
    let structAll = true, ruleOk = true, driveOk = true;
    const cnt = {};
    L1.quizzes.forEach(q => { cnt[q.kindId] = (cnt[q.kindId] || 0) + 1; if (KINDS[q.kindId]) kindDist[q.kindId]++; });
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    if (flat < STATIC_LEVELS && L1.pdch !== L1.dch) ruleOk = false;   // 静态关 pdch=难度章号
    if (L1.pdch < 1 || L1.pdch > 4) ruleOk = false;
    const orders = L1.quizzes.map(q => q.order);
    const nonDual = L1.quizzes.filter(q => q.kindId !== DUAL_KIND);
    if (nonDual.length !== Object.keys(cnt).length - (cnt[DUAL_KIND] ? 1 : 0)) ruleOk = false;   // sort/ord 题每关种互异
    /* 章型规则（SPEC §-r19 题计划）：热身/首现槽钉死 + 混合保证 */
    const q0 = L1.quizzes[0];
    if (L1.pdch === 1) {
      if (!(q0.kind === 'sort' && q0.tier === 'obv6' && q0.order === 'big')) ruleOk = false;
      if (!orders.every(o => o === 'big')) ruleOk = false;              // ch1 方向隔离恒 big
    } else if (L1.pdch === 2) {
      if (!(q0.kind === 'sort' && q0.tier === 'close6' && q0.order === 'big')) ruleOk = false;
      if (L1.quizzes[1].order !== 'small') ruleOk = false;              // 从小到大首现放第 2 题
    } else if (L1.pdch === 3) {
      if (!(q0.kind === 'dual' && q0.tier === 'dualObv' && q0.order === 'big' && q0.first === 'r')) ruleOk = false;
      if (orders.indexOf('small') < 0) ruleOk = false;                  // 混合章每关 ≥1 small
      mixedLevels++;
    } else {
      if (!(q0.kind === 'ord' && q0.tier === 'obv6' && q0.rank === 2 && q0.order === 'big')) ruleOk = false;
      const q3 = L1.quizzes[3];
      if (!(q3.kind === 'ord' && q3.order === 'small' && q3.rank >= 2 && q3.rank <= 3)) ruleOk = false;   // 第N小首现
      if (L1.quizzes[4].kind !== 'dual') ruleOk = false;                // 混排回顾
      if (orders.indexOf('small') < 0) ruleOk = false;
      mixedLevels++;
    }
    if (L1.pdch === 2 && orders.indexOf('small') < 0) ruleOk = false;
    orders.forEach(o => { if (o === 'big') dirBig++; else dirSmall++; });
    for (let k = 0; k < L1.quizzes.length; k++) {
      if (structWhy(L1.quizzes[k], L1.pdch)) structAll = false;
    }
    /* 引擎直驱：首题连错 2（不灰掉可重点）→ 排对一步 → （非 ord）点已排位 again →
       逐点 answerIdx 独立重算全对 → 全对通关 2 星；另全对 3 星 */
    const Ld = genLevel(flat);
    const d0 = Ld.quizzes[0];
    let wi = 0; while (wi === d0.answerIdx) wi++;
    if (engTap(Ld, wi) !== 'wrong' || Ld.retries !== 1 || d0.miss !== 1) driveOk = false;
    if (engTap(Ld, wi) !== 'wrong' || Ld.retries !== 2 || d0.miss !== 2) driveOk = false;   // 同卡可重点
    const placed0 = d0.answerIdx;
    if (engTap(Ld, placed0) !== (d0.kind === 'ord' ? 'goal' : 'step')) driveOk = false;   // ord 单点即完题
    if (d0.answerIdx !== expectIdx(d0)) driveOk = false;        // 逐点后动态重算正确
    if (d0.kind !== 'ord' && engTap(Ld, placed0) !== 'again') driveOk = false;   // 已排卡零惩罚（ord 单点题无此态）
    let last = null, guard = 0;
    while (!Ld.done && guard++ < 60) {
      const q = Ld.quizzes[Ld.step];
      last = engTap(Ld, expectIdx(q));
      if (last === null || last === 'wrong' || last === 'again') { driveOk = false; break; }
      if (!q._answered && q.kind !== 'ord' && q.answerIdx !== expectIdx(q)) { driveOk = false; break; }
    }
    if (!Ld.done || Ld.step !== CH_LEN || last !== 'done' || engStars(Ld) !== 2) driveOk = false;
    const L3 = genLevel(flat);
    guard = 0;
    while (!L3.done && guard++ < 60) engTap(L3, expectIdx(L3.quizzes[L3.step]));
    if (!L3.done || engStars(L3) !== 3) driveOk = false;
    const ok = det && structAll && ruleOk && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, pdch: L1.pdch, ok: ok, det: det, structAll: structAll,
      ruleOk: ruleOk, driveOk: driveOk,
      qs: L1.quizzes.map(q => q.kind[0] + (q.kind === 'ord' ? q.rank : '') + q.order[0] + ':' + q.items.join('/')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCard 单元 sort（flat 0 真实 UI；q0=sort obv6 big） ---- */
  total++;
  startLevel(0);
  const q0 = SO.quiz;
  const n0 = q0.items.length;
  const cards0 = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
  const slots0 = Array.prototype.slice.call(stripEl.querySelectorAll('.slot'));
  /* DOM 对账：n0 张卡 data-i 0..n-1、data-size=引擎 items、卡内 emoji 内联字号=items；
     槽 n0 个；方向徽章/题面卡 data-order=引擎 order（渲染即引擎） */
  const alignOk = q0 && q0.kind === 'sort' && n0 === 6 && cards0.length === n0 && slots0.length === n0 &&
    cards0.every((c, i) => Number(c.dataset.i) === i && Number(c.dataset.size) === q0.items[i] &&
      c.querySelector('.c-emoji').style.fontSize === q0.items[i] + 'px') &&
    badgeEl.dataset.order === q0.order && chipEl.dataset.order === q0.order;
  const wi2 = (q0.answerIdx + 1) % n0;
  const rW = await SO.tapCard(wi2);              // 首错：晃动不灰掉+miss=1+起播设窗+首错不 pulse
  const wEl = cardEl(wi2), okEl = cardEl(q0.answerIdx);
  const wrongOk = rW === 'wrong' && SO.quiz.miss === 1 && SO.currentLevel.retries === 1 &&
    SO.quiz.step === 0 && SO.quiz.pos === 0 && wEl.classList.contains('wig') &&
    !wEl.classList.contains('dim') &&
    getComputedStyle(wEl).pointerEvents !== 'none' &&      /* 不灰掉：每张卡都可能是下一步（SPEC §3） */
    !okEl.classList.contains('breathe');                   /* 首错不 pulse */
  const rSw = await SO.tapCard((wi2 + 1) % n0);  // 窗内二错：吞（契约 I）——miss 不动返 false
  const swallowOk = rSw === false && SO.quiz.miss === 1 && SO.currentLevel.retries === 1;
  await wait(4450);                              /* 等豁免窗（4350）过期——真时钟 */
  const rW2 = await SO.tapCard(wi2);             // 窗过后同卡二错：miss=2 → force 起播+应点卡 breathe
  const wrong2Ok = rW2 === 'wrong' && SO.quiz.miss === 2 && SO.currentLevel.retries === 2 &&
    okEl.classList.contains('breathe');
  const badIdx = (await SO.tapCard(n0)) === false && (await SO.tapCard(-1)) === false &&
    (await SO.tapCard('x')) === false && (await SO.tapCard(1.5)) === false;
  /* 答对一步：演出窗内同步读源卡 .gone + pos 推进；locked 窗内 hook 拦截 */
  const pOk = SO.tapCard(q0.answerIdx);
  const goneOk = cardEl(q0.answerIdx).classList.contains('gone') &&
    SO.quiz.pos === 1 && SO.currentLevel.step === 0;
  const lockedRet = await SO.tapCard(q0.answerIdx);        // 飞入演出窗内：locked 门拦 hook
  const rStep = await pOk;                                 // 'step'（飞入 transition 已结束）
  const slot0 = slotEl(0);
  const slotLit = slot0 && slot0.classList.contains('lit') &&
    slot0.querySelector('.s-emoji') !== null &&
    parseInt(slot0.querySelector('.s-emoji').style.fontSize, 10) === slotSize(q0.items[q0.answerIdx]);
  await wait(4450);                              /* 等豁免窗过期——窗内旧应点位点击会被吞（契约 I 对非当前应点一律吞） */
  const rAgain = await SO.tapCard(q0.answerIdx);           // 点已排位（旧应点位）：'again' 零惩罚
  const againOk = rAgain === 'again' && SO.quiz.miss === 2 && SO.quiz.pos === 1;
  let lastTap = null, g2 = 0;                              // 排完本题剩余步 → 主路径 'goal'
  while (SO.quiz && SO.quiz.step === 0 && g2++ < 12) lastTap = await SO.tapCard(SO.quiz.answerIdx);
  const q1 = SO.quiz;                                      // 'goal' 后换题：新方向徽章翻转对账
  const freshOk = q1 && q1.step === 1 && q1.pos === 0 && SO.currentLevel.retries === 2 &&
    badgeEl.dataset.order === q1.order && chipEl.dataset.order === q1.order &&
    boardEl.querySelectorAll('.card').length === q1.items.length &&
    Array.prototype.every.call(boardEl.querySelectorAll('.card'), (c, i) =>
      Number(c.dataset.size) === q1.items[i]);
  const goalOk = lastTap === 'goal' && freshOk;            // 题完成不追加错次
  const tapOk = alignOk && wrongOk && swallowOk && wrong2Ok && badIdx && rStep === 'step' && goneOk &&
    lockedRet === false && slotLit && againOk && goalOk;
  if (tapOk) npass++;
  units.tapCard = { ok: tapOk, align: alignOk, wrong: wrongOk, windowSwallow: swallowOk,
    wrong2: wrong2Ok, badIdx: badIdx, step: rStep === 'step' && goneOk && slotLit, lockedGuard: lockedRet === false,
    again: againOk, goal: goalOk, freshDir: freshOk };

  /* ---- ②b tapCard 单元 dual（flat10 ch3 热身：dualObv big first=r） ---- */
  total++;
  startLevel(10);
  const dq = SO.quiz;
  /* DOM 对账：legend 首球=first 色（chip+badge 双冗余）、卡 data-c=引擎 colors、6 槽 */
  const legendOk = dq && dq.kind === 'dual' && dq.first === 'r' &&
    chipEl.dataset.first === 'r' && badgeEl.dataset.order === dq.order &&
    chipEl.querySelectorAll('.lg')[0].textContent === DUAL_COLORS.r.e &&
    chipEl.querySelectorAll('.lg')[1].textContent === DUAL_COLORS.b.e &&
    badgeEl.querySelectorAll('.lg')[0].textContent === DUAL_COLORS.r.e &&
    boardEl.querySelectorAll('.card').length === 6 &&
    stripEl.querySelectorAll('.slot').length === 6 &&
    Array.prototype.every.call(boardEl.querySelectorAll('.card'), (c, i) =>
      c.dataset.c === dq.colors[i] && Number(c.dataset.size) === dq.items[i]);
  /* 平局语义：同档两色，非首色=错（wig）；首色=对 → 下一应点=同档另一色（tie 翻转） */
  const dAns = dq.answerIdx;
  const tieIdx = dq.items.findIndex((v, i) => v === dq.items[dAns] && i !== dAns);   // 同档另一色
  const rTieW = await SO.tapCard(tieIdx);         // 同档异色=错（同尺寸非首色不该先排）
  const tieWrongOk = rTieW === 'wrong' && SO.quiz.miss === 1;
  const rTieR = await SO.tapCard(dAns);           // 首色=对（窗内对选放行——契约 I）
  const tieRightOk = rTieR === 'step' && SO.quiz.pos === 1 && cardEl(dAns).classList.contains('gone');
  const flipOk = SO.quiz.answerIdx === tieIdx && expectIdx(SO.quiz) === tieIdx;   // 平局翻转独立重算
  const rFlip = await SO.tapCard(tieIdx);
  const flip2Ok = rFlip === 'step' && SO.quiz.pos === 2 &&
    SO.quiz.answerIdx === expectIdx(SO.quiz);
  const dualOk = legendOk && tieWrongOk && tieRightOk && flipOk && flip2Ok;
  if (dualOk) npass++;
  units.tapDual = { ok: dualOk, legend: legendOk, tieWrong: tieWrongOk, tieRight: tieRightOk,
    flip: flipOk && flip2Ok };

  /* ---- ②c tapCard 单元 ord（flat15 ch4 热身：ord obv6 rank2 big） ---- */
  total++;
  startLevel(15);
  const oq = SO.quiz;
  const oas = Array.prototype.slice.call(chipEl.querySelectorAll('.oa'));
  const oAns = oq.answerIdx;
  let oWrong = (oAns + 1) % oq.items.length;
  if (oWrong === oAns) oWrong = (oWrong + 1) % oq.items.length;
  /* DOM 对账：#strip.ord 单槽+槽内数字=rank；题面锚 n 圆点 size 降序（big）+ring 位=rank-1 */
  const ordDomOk = oq && oq.kind === 'ord' && oq.rank === 2 && oq.order === 'big' &&
    chipEl.dataset.rank === '2' &&
    stripEl.classList.contains('ord') &&
    stripEl.querySelectorAll('.slot').length === 1 &&
    stripEl.querySelector('.slot .s-num').textContent === '2' &&
    oas.length === oq.items.length &&
    oas.every((e, i) => e.classList.contains('ring') === (i === oq.rank - 1)) &&
    oas.every((e, i) => i === 0 || parseInt(oas[i - 1].style.fontSize, 10) > parseInt(e.style.fontSize, 10)) &&
    oq.answerIdx === expectIdx(oq);               /* 第 2 大独立重算（≠位置序） */
  const rOW = await SO.tapCard(oWrong);           // 错点：wig 零惩罚不推进（序数题单点）
  const ordWrongOk = rOW === 'wrong' && SO.quiz.miss === 1 && SO.quiz.step === 0 &&
    cardEl(oWrong).classList.contains('wig') && !cardEl(oWrong).classList.contains('gone');
  const pOR = SO.tapCard(oAns);                   // 对点（窗内对选放行）：goal 飞入单槽（promise 内含演出窗）
  await wait(60);                                 /* 演出中段读 DOM（goal 后 renderQuiz 重建板——末态读不到飞入痕迹） */
  const flyGone = cardEl(oAns).classList.contains('gone') &&
    slotEl(0).classList.contains('lit') &&
    slotEl(0).querySelector('.s-num').textContent === '2';
  const rOR = await pOR;
  const ordRightOk = rOR === 'goal' && SO.currentLevel.step === 1 && flyGone;
  const ordOk = ordDomOk && ordWrongOk && ordRightOk;
  if (ordOk) npass++;
  units.tapOrd = { ok: ordOk, dom: ordDomOk, wrong: ordWrongOk, right: ordRightOk };

  /* ---- ③ sayW 三态+豁免窗（flat0 无节流 / flat3 节流静默不设窗 / force 起播 / 窗内吞） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'sor_wrong' && p[1].indexOf('再想') === 0).length;   /* T46 阶段2：wrong 已 clip 化（键化断言，text 仍对账） */
  const wrongIdx = () => { const q = SO.quiz; let i = 0; while (i === q.answerIdx) i++; return i; };
  startLevel(0);                                   // flat0：无 10s 节流（间隔>豁免窗两错均播）
  await SO.tapCard(wrongIdx());
  await wait(4450);                                /* 窗过期再错（窗内会吞——契约 I） */
  await SO.tapCard(wrongIdx());
  const sayA = wrongPlays();                       // → 2
  startLevel(3);                                   // flat3：节流档
  lastWrongVoice = Date.now();                     /* 显式进入节流窗口内 */
  const rA = await SO.tapCard(wrongIdx());         // miss=1 节流静默：不播不设窗（照计数）
  const missA = SO.quiz.miss, sayB1 = wrongPlays() - 2;
  const rB = await SO.tapCard(wrongIdx());         // miss=2 → force ===2 起播+设窗
  const missB = SO.quiz.miss, sayB2 = wrongPlays() - 2 - sayB1;
  const rC = await SO.tapCard(wrongIdx());         // 窗内吞：false 且 miss 不动
  const missC = SO.quiz.miss;
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && rA === 'wrong' && missA === 1 && sayB1 === 0 &&
    rB === 'wrong' && missB === 2 && sayB2 === 1 &&
    rC === false && missC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3ThrottleSilent: sayB1 === 0 && missA === 1,
    flat3Force: sayB2 === 1 && missB === 2, windowSwallow: rC === false && missC === 2 };

  /* ---- ④ UI 冒烟 A：flat0 真实通路通关（首题错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = SO.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                               // 首错：零惩罚；首错不 pulse 应点卡
      let w = 0; while (w === q.answerIdx) w++;
      await SO.tapCard(w);
      wrongOk2 = SO.currentLevel.retries === 1 && SO.currentLevel.step === 0 &&
        !cardEl(SO.quiz.answerIdx).classList.contains('breathe');
    }
    let g3 = 0, lastT = null;
    while (SO.quiz && SO.quiz.step === s && g3++ < 12) lastT = await SO.tapCard(SO.quiz.answerIdx);
    if (lastT !== 'goal' && lastT !== 'done') smokeA = false;
    quizzesA++;
  }
  const lvA = SO.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, quizzes: quizzesA,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat5（ch2 方向混合）首题热身+每关 ≥1 small+autoSolve 3 星 ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const o5 = L5.quizzes.map(q => q.order);
  const nOk5 = L5.quizzes.every(q => q.items.length === 6 || q.items.length === 7);
  const ladOk5 = L5.quizzes.every(q =>
    q.items.slice().sort((a, b) => a - b).join(',') === ladderSet(q.tier));
  const warm5 = o5[0] === 'big' && o5[1] === 'small' && o5.indexOf('small') >= 0;
  const a5 = await SO.autoSolve();
  const lv5 = SO.currentLevel;
  const smokeOkB1 = warm5 && nOk5 && ladOk5 && a5.done && lv5.done && lv5.won &&
    lv5.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, orders: o5, ladder: ladOk5, taps: a5.taps, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat10（ch3 双属性）真实点击通关（含平局翻转逐点） ---- */
  total++;
  startLevel(10);
  let dualTapOk = true, legendFollowOk = true, quizzesB = 0;
  for (let s = 0; s < CH_LEN && dualTapOk; s++) {
    const q = SO.quiz;
    if (!q) { dualTapOk = false; break; }
    /* 换题落地即对账：色序徽章/题面卡/卡区跟随新题（含方向与首色翻转） */
    if (badgeEl.dataset.order !== q.order || chipEl.dataset.order !== q.order ||
        chipEl.dataset.first !== q.first ||
        chipEl.querySelectorAll('.lg')[0].textContent !== DUAL_COLORS[q.first].e ||
        boardEl.querySelectorAll('.card').length !== q.items.length) legendFollowOk = false;
    let g4 = 0, lastT = null;
    while (SO.quiz && SO.quiz.step === s && g4++ < 12) lastT = await SO.tapCard(SO.quiz.answerIdx);
    if (lastT !== 'goal' && lastT !== 'done') dualTapOk = false;
    quizzesB++;
  }
  const lv10 = SO.currentLevel;
  const smokeOkB2 = dualTapOk && legendFollowOk && quizzesB === CH_LEN &&
    lv10.done && lv10.won && lv10.retries === 0;
  if (smokeOkB2) npass++;
  smokes.flat10 = { ok: smokeOkB2, legendFollow: legendFollowOk, taps: quizzesB, retries: lv10.retries };

  /* ---- ④ UI 冒烟 B3：flat15（ch4 序数+混排）真实点击通关 ---- */
  total++;
  startLevel(15);
  let ordTapOk = true, ordFollowOk = true, quizzesC = 0;
  const kindsC = [];
  for (let s = 0; s < CH_LEN && ordTapOk; s++) {
    const q = SO.quiz;
    if (!q) { ordTapOk = false; break; }
    kindsC.push(q.kind);
    if (q.kind === 'ord') {
      /* 序数题落地对账：单槽数字=rank+锚 ring 位=rank-1（方向翻转锚升降序跟随） */
      const ringIdx = Array.prototype.indexOf.call(chipEl.querySelectorAll('.oa'),
        chipEl.querySelector('.oa.ring'));
      const oasC = Array.prototype.slice.call(chipEl.querySelectorAll('.oa'));
      const descOk = q.order === 'big'
        ? oasC.every((e, i) => i === 0 || parseInt(oasC[i - 1].style.fontSize, 10) > parseInt(e.style.fontSize, 10))
        : oasC.every((e, i) => i === 0 || parseInt(oasC[i - 1].style.fontSize, 10) < parseInt(e.style.fontSize, 10));
      if (!stripEl.classList.contains('ord') ||
          stripEl.querySelector('.slot .s-num').textContent !== String(q.rank) ||
          ringIdx !== q.rank - 1 || oasC.length !== q.items.length || !descOk ||
          chipEl.dataset.rank !== String(q.rank)) ordFollowOk = false;
    }
    if (q.kind !== 'ord' && stripEl.classList.contains('ord')) ordFollowOk = false;   /* dual 回顾题无 ord 类 */
    let g5 = 0, lastT = null;
    while (SO.quiz && SO.quiz.step === s && g5++ < 12) lastT = await SO.tapCard(SO.quiz.answerIdx);
    if (lastT !== 'goal' && lastT !== 'done') ordTapOk = false;
    quizzesC++;
  }
  const lv15 = SO.currentLevel;
  const kindsOk = kindsC[0] === 'ord' && kindsC[3] === 'ord' && kindsC[4] === 'dual';
  const smokeOkB3 = ordTapOk && ordFollowOk && kindsOk && quizzesC === CH_LEN &&
    lv15.done && lv15.won && lv15.retries === 0;
  if (smokeOkB3) npass++;
  smokes.flat15 = { ok: smokeOkB3, kinds: kindsC, anchorFollow: ordFollowOk, retries: lv15.retries };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { pLog7.push(String(key)); };
  startLevel(0);
  await tutorialWatch();                          // 看：watch clip → demo 排对一步 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const tutOk = pLog7.indexOf('sor_tut_watch') >= 0 &&                        /* 看=演示配 watch clip */
    state.tut === 'help' && !state.demo && !state.locked &&                   /* 帮：解锁等孩子动手 */
    SO.currentLevel && SO.currentLevel.flat === 0 && SO.quiz && SO.quiz.pos === 0 &&  /* 重发同关=新题面 */
    lastQ7 && lastQ7.length === 2 && lastQ7[0] === 'sor_tut_turn' &&          /* 交接顺序链单通道 */
    typeof lastQ7[1] === 'object' && lastQ7[1].key === 'sor_q_big' && lastQ7[1].text === Q_BIG;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('sor_tut_watch') >= 0,
    handoff: !!lastQ7, parts: lastQ7, tut: state.tut };

  /* ---- ⑤ 布局：双 viewport 模拟 ×（obv6 flat0 / close7 flat3 / dual flat10 / ord flat15） ---- */
  async function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                 // 按新场地尺寸重排
    await wait(750);                              /* 等入场 stagger 动画结束再量（§0.11 transform 中途陷阱） */
    const de = document.documentElement;
    const q = SO.quiz;
    const n = q.items.length;
    const cards = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
    let countOk = cards.length === n;             // n 卡 + data-size 与引擎对账
    cards.forEach((c, i) => {
      if (Number(c.dataset.i) !== i || Number(c.dataset.size) !== q.items[i]) countOk = false;
    });
    const rects = cards.map(c => c.getBoundingClientRect());
    const cardOk = rects.length === n &&
      rects.every(r => r.width >= 96 && r.height >= 96);          /* 主答案按钮 ≥96（§0.9） */
    const wantSlots = q.kind === 'ord' ? 1 : n;
    const slotRects = Array.prototype.slice.call(stripEl.querySelectorAll('.slot'))
      .map(s => s.getBoundingClientRect());
    const slotOk = slotRects.length === wantSlots &&
      slotRects.every(r => r.width >= 64 && r.height >= 64);      /* 排序条槽 ≥64 专项 */
    const emojiOk = cards.every((c, i) => {       /* 级差 emoji 不溢出卡（大号 108px 专项） */
      const r = c.getBoundingClientRect(), e = c.querySelector('.c-emoji').getBoundingClientRect();
      return e.width <= r.width + 2 && e.height <= r.height + 2;
    });
    let glyphOk;                                  /* 题面锚结构按题型（方向示意/色序/序数锚） */
    if (q.kind === 'ord') {
      const oasV = Array.prototype.slice.call(chipEl.querySelectorAll('.oa'));
      const ringV = Array.prototype.indexOf.call(oasV, chipEl.querySelector('.oa.ring'));
      glyphOk = oasV.length === n && ringV === q.rank - 1 &&
        badgeEl.querySelectorAll('.d').length === 4 &&
        chipEl.getBoundingClientRect().height >= 64;
    } else if (q.kind === 'dual') {
      glyphOk = chipEl.querySelectorAll('.d').length === 4 && badgeEl.querySelectorAll('.d').length === 4 &&
        chipEl.querySelectorAll('.lg').length === 2 && badgeEl.querySelectorAll('.lg').length === 2 &&
        chipEl.querySelectorAll('.lg')[0].textContent === DUAL_COLORS[q.first].e &&
        chipEl.getBoundingClientRect().height >= 64;
    } else {
      glyphOk = chipEl.querySelectorAll('.d').length === 4 &&
        badgeEl.querySelectorAll('.d').length === 4 &&
        chipEl.getBoundingClientRect().height >= 64;
    }
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const bRect = boardEl.getBoundingClientRect();
    const insideOk = rects.every(r =>             // 卡在卡区内（不溢出）
      r.left >= bRect.left - 1 && r.right <= bRect.right + 1 &&
      r.top >= bRect.top - 1 && r.bottom <= bRect.bottom + 1);
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, kind: q.kind, order: q.order, n: n, countOk: countOk, card96: cardOk,
      slot64: slotOk, emojiOk: emojiOk, glyphOk: glyphOk, btn64: btnOk, insideOk: insideOk, ox: ox,
      pass: countOk && cardOk && slotOk && emojiOk && glyphOk && btnOk && insideOk && ox <= 0 };
  }
  total++;
  const sims = [];
  const LAYOUT_FLATS = [0, 3, 10, 15];            // obv6 6 物 / close7 7 物 / dual 6 物 / ord 6 物（确定性）
  for (const f of LAYOUT_FLATS) {
    startLevel(f);
    sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, flats: LAYOUT_FLATS, sims: sims };

  /* ---- ⑥ 分布与专项：阶梯/句族/clip 注入/三族链/源码断言（script[2]，检索串拼接防自匹配） ---- */
  total++;
  /* SPEC §-r19 梯度表独立字面量（零手抄对账：档位逐值） */
  const REF_LADDER = { obv6: '19|27|39|55|77|108', close6: '34|40|47|55|64|75',
    close7: '32|38|44|52|61|71|84', dualObv: '30|45|68', dualClose: '40|47|55' };
  const ladRefOk = Object.keys(REF_LADDER).every(t => SIZE_LADDER[t].join('|') === REF_LADDER[t]);
  /* SPEC §-r19 句族独立字面量（与 gen_clips.py/manifest 三方一致，build 对账） */
  const ORD_CN_V = { 2: '二', 3: '三', 4: '四', 5: '五' };
  const SPEC_SENT = {
    big: '从最大的开始，排一排', small: '从最小的开始，排一排',
    dbr: '从最大的开始排，一样大的，红皮球排在前面',
    dbb: '从最大的开始排，一样大的，蓝皮球排在前面',
    dsr: '从最小的开始排，一样大的，红皮球排在前面',
    dsb: '从最小的开始排，一样大的，蓝皮球排在前面'
  };
  for (let n = 2; n <= 5; n++) {
    SPEC_SENT['ob' + n] = '从最大的开始数，第' + ORD_CN_V[n] + '个，是哪一个呀';
    SPEC_SENT['os' + n] = '从最小的开始数，第' + ORD_CN_V[n] + '个，是哪一个呀';
  }
  const sentOk = qSpeech({ kind: 'sort', order: 'big' }) === SPEC_SENT.big &&
    qSpeech({ kind: 'sort', order: 'small' }) === SPEC_SENT.small &&
    qSpeech({ kind: 'dual', order: 'big', first: 'r' }) === SPEC_SENT.dbr &&
    qSpeech({ kind: 'dual', order: 'big', first: 'b' }) === SPEC_SENT.dbb &&
    qSpeech({ kind: 'dual', order: 'small', first: 'r' }) === SPEC_SENT.dsr &&
    qSpeech({ kind: 'dual', order: 'small', first: 'b' }) === SPEC_SENT.dsb &&
    [2, 3, 4, 5].every(n => qSpeech({ kind: 'ord', order: 'big', rank: n }) === SPEC_SENT['ob' + n] &&
      qSpeech({ kind: 'ord', order: 'small', rank: n }) === SPEC_SENT['os' + n]) &&
    Q_BIG === SPEC_SENT.big && Q_SMALL === SPEC_SENT.small &&
    Q_DUAL.br === SPEC_SENT.dbr && Q_DUAL.bb === SPEC_SENT.dbb &&
    Q_DUAL.sr === SPEC_SENT.dsr && Q_DUAL.sb === SPEC_SENT.dsb;
  /* sor_* clips 注入对账（build 注入后 KIDS.voice.clips 应含全部 17 条 sor + 3 core） */
  const SOR_KEYS = ['sor_hint', 'sor_tut_turn', 'sor_tut_watch', 'sor_q_big', 'sor_q_small',
    'sor_q_dbr', 'sor_q_dbb', 'sor_q_dsr', 'sor_q_dsb',
    'sor_q_ob2', 'sor_q_ob3', 'sor_q_ob4', 'sor_q_ob5',
    'sor_q_os2', 'sor_q_os3', 'sor_q_os4', 'sor_q_os5'];
  const CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const clipOk = SOR_KEYS.every(k => !!KIDS.voice.clips[k]) && CORE_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([sor_hint, {key 题面句}]) 单通道；三族读题链=单段 keyed
     （keylessLast：全部段 keyed——core queue 弃尾语义下 keyless 恒链尾，本款无 keyless 段） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                  // flat0 首题 sort big 确定性
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 2 &&
    lastQ[0] === 'sor_hint' &&
    typeof lastQ[1] === 'object' && lastQ[1] !== null && lastQ[1].key === 'sor_q_big' &&
    lastQ[1].text === Q_BIG;                      /* 题面句=sor_q_* clip（缺 clip 时 core 走 TTS 兜底） */
  speakQuiz(genLevel(0).quizzes[0]);              // 救援/重听：单题面段
  const lastQ2 = qLog[qLog.length - 1];
  const rescueChain = qLog.length >= 2 && lastQ2 !== lastQ && lastQ2.length === 1 &&
    typeof lastQ2[0] === 'object' && lastQ2[0].key === 'sor_q_big' && lastQ2[0].text === Q_BIG;
  speakQuiz(genLevel(10).quizzes[0]);             // dual 题面链：键 sor_q_dbr（warmup first=r）
  const lastQ3 = qLog[qLog.length - 1];
  const dualChain = lastQ3.length === 1 && lastQ3[0].key === 'sor_q_dbr' &&
    lastQ3[0].text === Q_DUAL.br;
  speakQuiz(genLevel(15).quizzes[0]);             // ord 题面链：键 sor_q_ob2（warmup rank2）
  const lastQ4 = qLog[qLog.length - 1];
  const ordChain = lastQ4.length === 1 && lastQ4[0].key === 'sor_q_ob2' &&
    lastQ4[0].text === SPEC_SENT.ob2;
  const keylessLast = qLog.every(parts => parts.every(p =>
    typeof p === 'string' || (p && typeof p.key === 'string' && p.key)));   /* 全 keyed（契约 N） */
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  /* script[2] 源码断言（游戏块=第 3 块；verify 自身在第 4 块不参与检索——b36 自匹配防回归；
     高风险串字符串拼接） */
  const gameSrc = document.querySelectorAll('script')[2].textContent;
  const srcOk = gameSrc.indexOf('next' + 'Hint(lim - 1)') >= 0 &&          /* 家族 A 双实算 */
    gameSrc.indexOf('Math.max(0, lim - 1)') >= 0 &&
    gameSrc.indexOf('GEN_' + 'HINTS[genLevel(f + 1).dch - 1]') >= 0 &&     /* 家族 F 实算 */
    gameSrc.indexOf('(ci + 1) % 4') < 0 &&                                 /* 旧字面禁再现 */
    gameSrc.indexOf('nextHint(null)') < 0 &&                               /* 旧 null 实参禁再现 */
    gameSrc.indexOf('function rescue' + 'Tick()') >= 0 &&                  /* 契约 K */
    gameSrc.indexOf('estMs(VOICE.wrong.text) + 300') >= 0;                 /* 契约 I 豁免窗 */
  const distOk = ladRefOk && sentOk && clipOk && openChain && rescueChain && dualChain && ordChain &&
    keylessLast && srcOk &&
    KIND_IDS.every(k => kindDist[k] >= 1) &&      // 40 关 8 种 emoji 全覆盖
    mixedLevels >= 10 && dirBig > dirSmall && dirSmall >= 12;   // 混合章充足+双方向分布
  if (distOk) npass++;
  units.dist = { ok: distOk, ladderRef: ladRefOk, sent: sentOk, clips: clipOk,
    openChain: openChain, rescueChain: rescueChain, dualChain: dualChain, ordChain: ordChain,
    keylessLast: keylessLast, srcOk: srcOk,
    kindDist: kindDist, dir: { big: dirBig, small: dirSmall, mixedLevels: mixedLevels } };

  /* ---- ⑧ 时长模型 r19 双钉：字面===SPEC + modeled 精确钉死 + verify 独立计划复算 ---- */
  total++;
  const SPEC_STEP = { obv6: 1500, close6: 2100, close7: 2300, dualObv: 2800, dualClose: 3400 };
  const SPEC_ORD = { obv6: 4200, close7: 7600 };
  const SPEC_MODELED_FLAT0 = 88650;
  const SPEC_MODELED_MIN = 82760;                 // §-r19 §4：ch4 关（11065+3*14465+28300，禁约数）
  const SPEC_MODELED_MAX = 137900;                // ch3 关（24700+4*28300）
  const estMsV = s => s.length * 345 + 600;       // estMs 独立副本（四方之 verify 侧，吃字符串）
  /* SPEC 计划独立副本（不复用 QUIZ_PLAN——防同源假阳性）：[kind, tier, n] × 5 题 */
  const SPEC_PLAN = {
    1: [['sort', 'obv6', 6], ['sort', 'close6', 6], ['sort', 'close6', 6], ['sort', 'close7', 7], ['sort', 'close7', 7]],
    2: [['sort', 'close6', 6], ['sort', 'close6', 6], ['sort', 'close7', 7], ['sort', 'close7', 7], ['sort', 'close7', 7]],
    3: [['dual', 'dualObv', 6], ['dual', 'dualClose', 6], ['dual', 'dualClose', 6], ['dual', 'dualClose', 6], ['dual', 'dualClose', 6]],
    4: [['ord', 'obv6', 6], ['ord', 'close7', 7], ['ord', 'close7', 7], ['ord', 'close7', 7], ['dual', 'dualClose', 6]]
  };
  const SENT_LEN = { sort: SPEC_SENT.big.length, dual: SPEC_SENT.dbr.length, ord: SPEC_SENT.ob2.length };
  const vLevelDur = d => SPEC_PLAN[d].reduce((s, P) =>
    s + estMsV('x'.repeat(SENT_LEN[P[0]])) +                      /* 题句窗（同长哨兵串——独立复算） */
    (P[0] === 'ord' ? SPEC_ORD[P[1]] : P[2] * SPEC_STEP[P[1]]) + 400, 0);
  const litOk = JSON.stringify(STEP_MS) === JSON.stringify(SPEC_STEP) &&
    JSON.stringify(ORD_MS) === JSON.stringify(SPEC_ORD) &&
    SWITCH_MS === 400 &&
    estMsV(SPEC_SENT.big) === 4050 && estMsV(SPEC_SENT.dbr) === 7500 && estMsV(SPEC_SENT.ob2) === 6465;
  const m0Ok = modeled(0) === SPEC_MODELED_FLAT0;
  let mdMin = Infinity, mdMax = 0, planBad = 0;
  for (let f = 0; f < 40; f++) {
    const m = modeled(f);
    if (m < mdMin) mdMin = m;
    if (m > mdMax) mdMax = m;
    const L = genLevel(f);
    if (m !== vLevelDur(L.pdch)) planBad++;       /* 引擎 modeled 与 SPEC 计划复算逐关对账 */
  }
  const mdOk = litOk && m0Ok && mdMin === SPEC_MODELED_MIN && mdMax === SPEC_MODELED_MAX &&
    planBad === 0 && vLevelDur(1) === 88650 && vLevelDur(2) === 95750 &&
    vLevelDur(3) === 137900 && vLevelDur(4) === 82760;
  if (mdOk) npass++;
  units.modeled = { ok: mdOk, literals: litOk, flat0: modeled(0), min: mdMin, max: mdMax,
    planBad: planBad, chDurs: { 1: vLevelDur(1), 2: vLevelDur(2), 3: vLevelDur(3), 4: vLevelDur(4) } };

  const out = { game: 'sortsize', total: total, pass: npass, layoutOk: layoutOk,
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
