/* ================= ?verify=1 自检（仅 verify 分支加载执行；r29 谱 SPEC-R29-COMPARE）
   ① 40 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/ 5 题 / structOk
     （符号题 answer 与两侧 n 一致；tri 三互异+极值下标；near 距离从题面重算 argmin）/
     章难度与模式合规（r29：dch1 全 count 8 内差 1-3 =恒1；dch2 全 num 10 内差 1-3 =奇2偶1；
     dch3 num 差1 + tri 恒2（窄跨度 ≤4）=恒1；dch4 count/num/mix 各≥1 + near 恒1（近对律
     d1∈[2,4]/d2-d1∈[1,2]）+ count 边≤12 差1-4 =奇2偶1）
     / 引擎直驱通关（符号题点数→重数→再点→选符号；tri/near 走 engPickPos + 非法卡位/
     非法符号交叉断言；0 重试 3 星）
   ② 分布断言（r29 §R3 精确推导）：40 关 200 题恒 tri=20/near=10/符号题=170/=48/
     gt+lt=122 且 gt,lt∈[58,64]（SPEC 窗口）；关内符号题 |gt-lt| ≤ 1（无位置惯性）
   ③ 点数辅助单元（flat 0 真实 UI 状态机）：左/右角标分别递增、已数过返 0、重数清零、非法下标 false
   ④ UI 冒烟 A：flat0 角标 DOM 逐只断言 + 首错零惩罚（晃+灰、不 pulse 正确项）+ 通关 2 星；
     UI 冒烟 B：flat15（dch4）三模式+near 在关内真实出现 + autoSolve（含 near 分派）通关（3 星）；
     UI 冒烟 C（r29 新）：flat10（dch3）tri 三卡真实上屏 + 三卡错选零惩罚首错不 pulse +
     pickPos 通路通关
     UI 冒烟 D（r29 家族修复 m2+P2-1）：#duel 刷新/新题视觉态与模型对齐——错态刷新后
     q.wrong 逐项 .wrong 在场 + 演出态 .circled/.dimmed 不在场；新题上屏三态
     （.wrong/.dimmed/.circled）全空（符号题相邻转换面+三卡重建面双路核）
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat10 章 3 / flat15 章 4 符号题 +
     flat10 首个 tri / flat15 首个 near 三卡形态）：热区 ≥64、符号按钮 ≥96×100、
     物品/数字卡两两不重叠、三卡题符号区置灰、overflowX ≤ 0
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const symDist = { '>': 0, '<': 0, '=': 0 };
  const modesSeen = { count: 0, num: 0, mix: 0, tri: 0, near: 0 };

  /* ---- ① 40 关全量审计 + ② 分布统计 ---- */
  let distOkAll = true;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let ruleOk = true, structAll = true;
    let eqCnt = 0, gt = 0, lt = 0, triCnt = 0, nearCnt = 0;
    const lvModes = { count: 0, num: 0, mix: 0, tri: 0, near: 0 };
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q)) structAll = false;
      modesSeen[q.mode]++; lvModes[q.mode]++;
      if (q.mode === 'tri' || q.mode === 'near') {           // 三卡题：分布与规则断言独立面
        if (q.mode === 'tri') triCnt++;
        else nearCnt++;
        let okT = true;
        if (q.mode === 'tri') {                              // dch3：三互异 10 内 + 窄跨度 ≤4
          const ns = q.cards.map(c => c.n);
          okT = Math.max.apply(null, ns) <= 10 && (Math.max.apply(null, ns) - Math.min.apply(null, ns)) <= 4;
        } else {                                             // dch4 near：N 8-17 + 近对律 d1/d2（SPEC §R3）
          const ds = q.cards.map(c => Math.abs(c.n - q.target)).sort((a, b) => a - b);
          okT = q.target >= 8 && q.target <= 17 &&
            Math.max.apply(null, q.cards.map(c => c.n)) <= 20 &&
            ds[0] >= 2 && ds[0] <= 4 && (ds[1] - ds[0]) >= 1 && (ds[1] - ds[0]) <= 2;
        }
        if (!okT) ruleOk = false;
        continue;
      }
      symDist[q.answer]++;
      if (q.answer === '=') eqCnt++;
      else if (q.answer === '>') gt++;
      else lt++;
      const d = Math.abs(q.left.n - q.right.n);
      const maxN = Math.max(q.left.n, q.right.n);
      let ok = true;
      if (L1.dch === 1) {                      // r29：8 以内全实物差 1-3
        ok = q.mode === 'count' && maxN <= 8 && (q.answer === '=' ? true : (d >= 1 && d <= 3));
      } else if (L1.dch === 2) {               // r29：10 以内全数字卡差 1-3
        ok = q.mode === 'num' && maxN <= 10 && (q.answer === '=' ? true : (d >= 1 && d <= 3));
      } else if (L1.dch === 3) {               // r29：num 差 1 近邻（全数字卡）
        ok = q.mode === 'num' && maxN <= 10 && (q.answer === '=' ? true : d === 1);
      } else {                                 // dch4：20 以内差 1-4；count 边 ≤12
        const cntN = [];
        if (q.left.kind !== 'num') cntN.push(q.left.n);
        if (q.right.kind !== 'num') cntN.push(q.right.n);
        ok = maxN <= 20 && (q.answer === '=' ? true : (d >= 1 && d <= 4)) && cntN.every(n => n <= 12);
      }
      /* num/mix 的数字卡侧不点数：kind='num' 且 items 空（structOk 已含） */
      if (!ok) ruleOk = false;
    }
    /* 关级规则：= 槽位律 + tri/near 恒定量 + dch4 三模式各 ≥1（SPEC §R2/§R3） */
    if (L1.dch === 1 && eqCnt !== 1) ruleOk = false;          // dch1 = 恒 1（r29 新律）
    if (L1.dch === 2 && eqCnt !== (L1.lv % 2 === 1 ? 2 : 1)) ruleOk = false;
    if (L1.dch === 3 && (triCnt !== 2 || eqCnt !== 1 || lvModes.num !== 3)) ruleOk = false;
    if (L1.dch === 4 && (nearCnt !== 1 || eqCnt !== (L1.lv % 2 === 1 ? 2 : 1) ||
        lvModes.count < 1 || lvModes.num < 1 || lvModes.mix < 1)) ruleOk = false;
    if (Math.abs(gt - lt) > 1) distOkAll = false;                    // 关内无方向惯性（符号题）
    /* 引擎直驱：tri/near 走 engPickPos（含非法交叉断言）；符号题点数→重数→再点→选对 */
    let driveOk = true;
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      if (q.mode === 'tri' || q.mode === 'near') {
        if (engPickPos(L1, 5) !== null || engPickPos(L1, -1) !== null) driveOk = false;  // 非法卡位
        if (engPickSym(L1, '>') !== null) driveOk = false;           // 三卡题选符号 → null
        const r = engPickPos(L1, q.answer);
        if (r !== (k === L1.quizzes.length - 1 ? 'done' : 'right')) driveOk = false;
        continue;
      }
      for (const side of ['L', 'R']) {
        const sd = side === 'L' ? q.left : q.right;
        for (let i = 0; i < sd.items.length; i++) {
          if (engTap(L1, side, i) !== i + 1) { driveOk = false; break; }
        }
        if (!driveOk) break;
        if (sd.items.length && engTap(L1, side, 0) !== 0) driveOk = false;   // 已数过：只跳不增号
      }
      if (!driveOk) break;
      if ((q.left.kind !== 'num' || q.right.kind !== 'num') && !engRecount(L1)) driveOk = false;  // 重数清零（num 双卡题无物品可清，豁免）
      for (const side of ['L', 'R']) {
        const sd = side === 'L' ? q.left : q.right;
        for (let i = 0; i < sd.items.length; i++) {
          if (engTap(L1, side, i) !== i + 1) { driveOk = false; break; }
        }
        if (!driveOk) break;
      }
      if (!driveOk) break;
      if (engPickPos(L1, 0) !== null) driveOk = false;               // 符号题选卡 → null
      const r = engPickSym(L1, q.answer);
      const want = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (r !== want) driveOk = false;
      if (engPickSym(L1, 'x') !== null) driveOk = false;             // 非法符号恒 null
    }
    if (engPickSym(L1, '=') !== null) driveOk = false;               // 关已结束再选 → null
    if (engPickPos(L1, 0) !== null) driveOk = false;                 // 关已结束再选卡 → null
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && driveOk && solvedAll;
    if (ok) npass++;
    const qstr = q => q.mode === 'tri'
      ? q.cards.map(c => c.n).join(',') + (q.qtype === 'max' ? 'max' : 'min') + '@' + q.answer
      : (q.mode === 'near'
        ? q.cards.map(c => c.n).join(',') + '~' + q.target + '@' + q.answer
        : q.left.n + (q.left.kind === 'num' ? 'N' : '') + q.answer + q.right.n + (q.right.kind === 'num' ? 'N' : ''));
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, structAll: structAll,
      driveOk: driveOk, solvedAll: solvedAll, gt: gt, lt: lt, eq: eqCnt, tri: triCnt, near: nearCnt,
      qs: L1.quizzes.map(qstr) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 分布断言（r29 §R3 精确推导：tri20/near10/符号170/=48/gt+lt=122，窗口 [58,64]） ---- */
  total++;
  const nAll = symDist['>'] + symDist['<'] + symDist['='] + modesSeen.tri + modesSeen.near;
  const symN = symDist['>'] + symDist['<'] + symDist['='];
  const distOk = nAll === 200 && modesSeen.tri === 20 && modesSeen.near === 10 &&
    symN === 170 && symDist['='] === 48 &&
    symDist['>'] >= 58 && symDist['>'] <= 64 && symDist['<'] >= 58 && symDist['<'] <= 64 &&
    symDist['>'] + symDist['<'] === 122 && distOkAll;
  if (distOk) npass++;
  units.dist = { ok: distOk, n: nAll, gt: symDist['>'], lt: symDist['<'], eq: symDist['='],
    tri: modesSeen.tri, near: modesSeen.near, perLevelBalanced: distOkAll, modes: modesSeen };

  /* ---- ③ 点数辅助单元（flat 0 真实 UI 状态机：双侧独立角标） ---- */
  total++;
  startLevel(0);
  const q0 = CMP.quiz;
  const tapsL = [], tapsR = [];
  for (let i = 0; i < q0.items.left.length; i++) tapsL.push(CMP.tapItem('L', i));
  for (let i = 0; i < q0.items.right.length; i++) tapsR.push(CMP.tapItem('R', i));
  const incOk = tapsL.every((v, i) => v === i + 1) && tapsR.every((v, i) => v === i + 1);
  const retap = CMP.tapItem('L', 0);            // 已数过 → 0，计数不变
  const retapOk = retap === 0 && CMP.currentLevel.countedL === q0.items.left.length;
  const domBadges = document.querySelectorAll('#g-left .badge.on, #g-right .badge.on').length;
  const domOk = domBadges === q0.items.left.length + q0.items.right.length;   // 每个物品一个角标
  CMP.recount();
  const recOk = CMP.currentLevel.countedL === 0 && CMP.currentLevel.countedR === 0 &&
    document.querySelectorAll('.badge.on').length === 0;
  const badIdx = CMP.tapItem('L', 99) === false && CMP.tapItem('R', -1) === false;
  const tapOk = incOk && retapOk && domOk && recOk && badIdx;
  if (tapOk) npass++;
  units.tapItem = { ok: tapOk, incOk: incOk, retap: retap, domBadges: domBadges,
    recount: recOk, badIdx: badIdx };

  /* ---- ④ UI 冒烟 A：flat0 逐个点数（角标 DOM 逐只断言）+ 首错零惩罚 + 通关（1 重试=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = CMP.quiz;
    if (!q) { smokeA = false; break; }
    for (const side of ['left', 'right']) {
      for (let i = 0; i < q.items[side].length; i++) {
        if (CMP.tapItem(side === 'left' ? 'L' : 'R', i) !== i + 1) smokeA = false;
      }
    }
    const badges = document.querySelectorAll('.badge.on').length;
    if (badges !== q.items.left.length + q.items.right.length) smokeA = false;  // 逐只角标 DOM
    if (s === 0) {                              // 首错：晃动+灰掉零惩罚；首错不 pulse 正确项
      const wsym = SYMS.find(v => v !== q.answer);
      await CMP.pick(wsym);
      const wEl = symEl(wsym), okEl = symEl(q.answer);
      wrongOk = !!wEl && wEl.classList.contains('wrong') && !okEl.classList.contains('pulse') &&
        CMP.currentLevel.retries === 1 && CMP.currentLevel.step === 0;
    }
    const r = await CMP.pick(q.answer);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    steps++;
  }
  const lvA = CMP.currentLevel;
  const smokeOkA = smokeA && wrongOk && steps === CH_LEN && lvA.done && lvA.won && lvA.retries === 1 &&
    engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B：flat15（dch4）三模式+near 在关内真实出现 + autoSolve（含 near 分派）通关 ---- */
  total++;
  startLevel(15);
  const seen = { count: 0, num: 0, mix: 0, tri: 0, near: 0 };
  let numcardShown = false;
  for (let s = 0; s < CH_LEN; s++) {
    const q = CMP.quiz;
    if (!q) break;
    seen[q.mode]++;
    if (q.mode === 'tri' || q.mode === 'near') {
      if (document.querySelectorAll('.group.tri').length === 3) numcardShown = true;   // 三卡真实上屏
      await CMP.pickPos(q.answer);
    } else {
      if (document.querySelector('.numcard')) numcardShown = true;     // 数字卡真实上屏
      await CMP.pick(q.answer);
    }
  }
  const lv15 = CMP.currentLevel;
  const smokeOkB = seen.count >= 1 && seen.num >= 1 && seen.mix >= 1 && seen.near >= 1 &&
    numcardShown && lv15.done && lv15.won && lv15.retries === 0;
  /* autoSolve 独立通路（flat16 生成关，dch4 循环）：真实流程通关 3 星（near 分派覆盖） */
  startLevel(16);
  const a16 = await CMP.autoSolve();
  const lv16 = CMP.currentLevel;
  const autoOk = a16.done && lv16.done && lv16.retries === 0 && engStars(cur) === 3;
  if (smokeOkB && autoOk) npass++;
  smokes.flat15 = { ok: smokeOkB && autoOk, modes: seen, numcard: numcardShown,
    autoSolve: { done: a16.done, picks: a16.picks, retries: lv16.retries, stars: engStars(cur) } };

  /* ---- ④ UI 冒烟 C（r29）：flat10（dch3）tri 三卡真实上屏 + 错选零惩罚 + pickPos 通路通关 ---- */
  total++;
  startLevel(10);
  let triShown = false, triWrongOk = false, stepsC = 0, triSeenCnt = 0;
  const seenC = { count: 0, num: 0, mix: 0, tri: 0, near: 0 };
  let guardC = 0, lastStepC = -1;                // 错选零惩罚不推进——while 按题推进；lastStep 防同题重复计数
  while (cur && !cur.done && guardC++ < 30) {
    const q = CMP.quiz;
    if (!q) break;
    if (lastStepC !== q.step) {
      seenC[q.mode]++;
      if (q.mode === 'tri') triSeenCnt++;
      lastStepC = q.step;
    }
    if (q.mode === 'tri') {
      const triN = document.querySelectorAll('.group.tri').length;
      const symOff = symbolsEl.classList.contains('off');
      if (triN === 3 && symOff && document.querySelectorAll('.group.tri .numcard').length === 3) triShown = true;
      if (!triWrongOk) {                       // 首个 tri：错选零惩罚（灰掉不推进、正确卡不 pulse）
        const wp = [0, 1, 2].find(v => v !== q.answer);
        await CMP.pickPos(wp);
        const wEl = document.querySelector('.group.tri[data-pos="' + wp + '"]');
        const okEl = document.querySelector('.group.tri[data-pos="' + q.answer + '"] .numcard');
        triWrongOk = !!wEl && wEl.classList.contains('wrong') &&
          !(okEl && okEl.classList.contains('pulse')) &&
          CMP.currentLevel.retries === 1 && CMP.currentLevel.step === q.step;
        continue;                              // 零惩罚后同题重选（while 不消耗题位）
      }
      const r = await CMP.pickPos(q.answer);
      if (r !== (q.step === CH_LEN - 1 ? 'done' : 'right')) stepsC = -99;
      else stepsC++;
      continue;
    }
    const r = await CMP.pick(q.answer);
    if (r !== (q.step === CH_LEN - 1 ? 'done' : 'right')) stepsC = -99;
    else stepsC++;
  }
  const lv10 = CMP.currentLevel;
  const smokeOkC = triShown && triWrongOk && triSeenCnt === 2 && stepsC === CH_LEN &&
    seenC.num === 3 && lv10.done && lv10.won && lv10.retries === 1 && engStars(cur) === 2;
  if (smokeOkC) npass++;
  smokes.flat10 = { ok: smokeOkC, triShown: triShown, triWrongOk: triWrongOk,
    triCount: triSeenCnt, modes: seenC, retries: lv10.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 D（r29 家族修复 m2+P2-1）：刷新/新题视觉态与模型对齐（真实 DOM 查询）
     断言从修复要求推导（非实现归纳）：错态刷新（resize 监听真实路径）→ q.wrong 逐项
     .wrong 在场 + 演出态 .circled/.dimmed 不在场 + 模型不动（retries/step）；
     新题上屏（答对推进）→ .wrong/.dimmed/.circled 三态全空。
     .dimmed 属答对演出态（uiPickPos 答对瞬间加于非答案卡，届时 step 已推进——题中无
     模型态可回填），归清除面与 .circled/.pop 同族，不按 q.wrong 回填（防泄答案/防与
     实点路径视觉不一致） ---- */
  total++;
  startLevel(0);                                 // dch1 全符号题：resize 刷新面+相邻转换面天然覆盖
  let vbSym = true;
  {
    const q = CMP.quiz;
    const wsym = SYMS.find(v => v !== q.answer);
    await CMP.pick(wsym);                        // 首错：模型记 wrong + 视觉灰掉
    window.dispatchEvent(new Event('resize'));   // 真实 resize 监听 → renderQuiz 刷新路径
    const wEl = symEl(wsym);
    vbSym = vbSym && !!wEl && wEl.classList.contains('wrong') &&
      !document.querySelector('#duel > .group.circled') &&
      !document.querySelector('#duel > .group.dimmed') &&
      CMP.currentLevel.retries === 1 && CMP.currentLevel.step === 0;
    vbSym = vbSym && (await CMP.pick(wsym)) === 'again';   // 模型一致：已错项重点=静默 again
    await CMP.pick(q.answer);                    // 答对 → 下一题（flat0 恒符号题=相邻转换 P2-1 面）
    const gs = document.querySelectorAll('#duel > .group');
    vbSym = vbSym && gs.length === 2 && Array.prototype.every.call(gs, g =>
        !g.classList.contains('circled') && !g.classList.contains('pop') &&
        !g.classList.contains('dimmed')) &&
      !document.querySelector('#symbols .sym.wrong') &&
      CMP.currentLevel.step === 1;
  }
  startLevel(10);                                // dch3：tri 恒 2（三卡重建面）
  let vbTri = true, triHit = false;
  for (let s = 0; s < CH_LEN; s++) {
    const q = CMP.quiz;
    if (!q) { vbTri = false; break; }
    if (q.mode !== 'tri') { await CMP.pick(q.answer); continue; }
    triHit = true;
    const wp = [0, 1, 2].find(v => v !== q.answer);
    await CMP.pickPos(wp);                       // 错选：灰掉零惩罚
    window.dispatchEvent(new Event('resize'));   // renderQuiz → renderTriQuiz 重建路径
    const wEl = document.querySelector('.group.tri[data-pos="' + wp + '"]');
    vbTri = vbTri && !!wEl && wEl.classList.contains('wrong') &&
      !document.querySelector('#duel .group.circled') &&
      !document.querySelector('#duel .group.dimmed') &&
      CMP.currentLevel.step === q.step;
    const r = await CMP.pickPos(q.answer);       // 答对推进 → 重建后零残留（首 tri 位 ≤3 恒非末题）
    vbTri = vbTri && (r === 'right' || r === 'done') &&
      !document.querySelector('#duel .group.circled') &&
      !document.querySelector('#duel .group.dimmed') &&
      !document.querySelector('#duel .group.wrong');
    break;
  }
  const smokeOkD = vbSym && vbTri && triHit;
  if (smokeOkD) npass++;
  smokes.visualBackfill = { ok: smokeOkD, symRefresh: vbSym, triRefresh: vbTri };

  /* ---- ⑤ 布局：双 viewport × 三形态——实物符号题（flat0 章1 / flat15 章4 实物题）、
     数字卡符号题（flat10 章3，r29 起 dch3 无实物）、三卡题（flat10 tri / flat15 near） ---- */
  async function stepToSym(flat, wantItems) {    // 推进到首个符号题（wantItems=true 须有实物侧）
    startLevel(flat);
    for (let s = 0; s < CH_LEN; s++) {
      const q = CMP.quiz;
      if (!q) return null;
      if (q.mode !== 'tri' && q.mode !== 'near') {
        if (!wantItems || q.items.left.length || q.items.right.length) return q;
      }
      if (q.mode === 'tri' || q.mode === 'near') await CMP.pickPos(q.answer);
      else await CMP.pick(q.answer);
    }
    return null;
  }
  async function stepToMode(flat, wantMode) {    // 推进到首个目标 mode 题
    startLevel(flat);
    for (let s = 0; s < CH_LEN; s++) {
      const q = CMP.quiz;
      if (!q) return null;
      if (q.mode === wantMode) return q;
      if (q.mode === 'tri' || q.mode === 'near') await CMP.pickPos(q.answer);
      else await CMP.pick(q.answer);
    }
    return null;
  }
  async function simView(w, h, flat, wantItems) {  // 符号题形态：物品∪数字卡热区 ≥64
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    const q = await stepToSym(flat, wantItems);
    const de = document.documentElement;
    const syms = Array.prototype.map.call(symbolsEl.querySelectorAll('.sym'), b => b.getBoundingClientRect());
    const symOk = !!q && syms.length === 3 && syms.every(r => r.width >= 96 && r.height >= 96);
    const items = Array.prototype.map.call(document.querySelectorAll('.item'), b => {
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height,
        l: r.left, t: r.top };
    });
    const hitOk = items.length > 0 && items.every(a => a.w >= 64 && a.h >= 64);
    /* 物品两两不重叠（同一面板内；跨面板左右分离天然不重叠） */
    let overlapOk = true;
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 2) overlapOk = false;
      }
    }
    const nc = document.querySelector('.numcard');
    const ncOk = !nc || (nc.getBoundingClientRect().width >= 64 && nc.getBoundingClientRect().height >= 64);
    const structureOk = !!q && !!$id('g-left') && !!$id('slot') && !$id('g-left').classList.contains('tri');
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, mode: q && q.mode, symOk: symOk, hitOk: hitOk,
      overlapOk: overlapOk, ncOk: ncOk, structureOk: structureOk, items: items.length, ox: ox,
      pass: symOk && structureOk && ((wantItems && hitOk) || (!wantItems && ncOk)) && overlapOk && ox <= 0 };
  }
  async function simTri(w, h, flat, wantMode) {  // r29 三卡形态：三组数字卡 + 符号区置灰 + near 目标徽章
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    const q = await stepToMode(flat, wantMode);
    const de = document.documentElement;
    const triOk = !!q && document.querySelectorAll('.group.tri').length === 3 &&
      document.querySelectorAll('.group.tri .numcard').length === 3;
    const symOffOk = symbolsEl.classList.contains('off');
    const cards = Array.prototype.map.call(document.querySelectorAll('.group.tri .numcard'), b => {
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    });
    const hitOk = triOk && cards.length === 3 && cards.every(a => a.w >= 64 && a.h >= 64);
    let overlapOk = true;
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i], b = cards[j];
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 2) overlapOk = false;
      }
    }
    const tgtOk = wantMode !== 'near' || !!document.querySelector('#prompt-chip .tgt');
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, mode: wantMode, triOk: triOk, symOffOk: symOffOk, hitOk: hitOk,
      overlapOk: overlapOk, tgtOk: tgtOk, ox: ox,
      pass: triOk && symOffOk && hitOk && overlapOk && tgtOk && ox <= 0 };
  }
  total++;
  const sims = [];
  sims.push(await simView(1280, 800, 0, true));      // dch1 实物（r29 新值域 8 物品 grid 密度）
  sims.push(await simView(800, 1180, 0, true));
  sims.push(await simView(1280, 800, 10, false));    // dch3 数字卡符号题（r29 无实物）
  sims.push(await simView(800, 1180, 10, false));
  sims.push(await simView(1280, 800, 15, true));     // dch4 实物符号题（count/mix）
  sims.push(await simView(800, 1180, 15, true));
  const simsT = [];                             // r29 三卡形态：flat10 首个 tri / flat15 首个 near × 双 viewport
  for (const pair of [[10, 'tri'], [15, 'near']]) {
    simsT.push(await simTri(1280, 800, pair[0], pair[1]));
    simsT.push(await simTri(800, 1180, pair[0], pair[1]));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass) && simsT.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims, triSims: simsT };

  const out = { game: 'compare', total: total, pass: npass, layoutOk: layoutOk, dist: symDist,
    modes: modesSeen, levels: levels, gen: gen, units: units, smokes: smokes };
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
