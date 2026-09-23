/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39，r30 谱）：确定性 / 一步题答案=N-M 且 ≥0、
     章区间合规（dch1 n 4-8 / dch2 6-10 剩余 ≥1 / dch3 12-20 允许剩余=0、跨十 ≥2 且含答案 0 题 /
     dch4 一步题 n 9-14+瓢虫 2-4）/ 两步题仅 dch4 qi1(A 先减后加)/qi3(B 先加后减)：n 10-15、
     b/c 域、s=中间态、答案公式、两步至少一步跨十、干扰项恒含 {s, 答案±1 定值}、无瓢虫、
     每关 A=B=1（40 关共 dual=20）/ 干扰项规则（一步题 ±1/±2 互异 >0 ≠答案，答案 0 时为 {1,2}）/
     相邻题答案不同 / structOk / 引擎直驱通关（放飞递增→已飞返 0→飞满点剩余返 0→重新飞清零→
     再放飞→答对，0 重试 3 星；dual 的 m=飞走数语义原样可用）
   ② 放飞单元（flat0 支架章）：角标 1..M 递增 / 飞满再点不放飞 / 重新飞清零 / 非法下标 false
   ③ UI 冒烟：A flat0 放飞角标 DOM 逐只断言 + 首错零惩罚 + 通关 2 星；
     B flat15（章 4）答前点虫不计数（盲飞）+ 干扰瓢虫不计数 + autoSolve 直选通关 + autoFly×5；
     C flat5（章 2 盲飞）答前点虫不计数→miss1 不解锁不 pulse→miss2 解锁支架不 pulse→
     支架恢复点虫放飞→重新飞清零→答对 autoFly→通关（2 星，autoFly 计 5）
   ④ 布局：双 viewport（模拟 1280×800 / 800×1180）×（章 1 密集 8 只 / 章 3 密集 / 章 4 混养）：
     虫热区 ≥64、答案按钮 ≥96×96、overflowX ≤0、场上动物两两中心距 ≥90px（撒点防重叠不可点）；
     scatterPts 确定性单元 + 最密场景（21-24 点 D=94 / 8 点 D=150 章 1 新档）≥90px 单元
   ⑤ 答案位置分布不恒首位（三位置均出现、首位 <60%）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0];
  let dualTotal = 0, dualACnt = 0, dualBCnt = 0;

  /* ---- ① 40 关全量审计（flat 0-39，r30 谱独立复算——不复用生成函数） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const C = CHAPTERS[L1.dch];
    let ruleOk = true, structAll = true, adjOk = true, rangeOk = true;
    let crossN = 0, zeroN = 0, dualA = 0, dualB = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q)) structAll = false;
      if (q.type === 'dual') {                       /* 两步题槽位/域/公式/跨十/干扰项独立复算 */
        if (L1.dch !== 4 || (k !== 1 && k !== 3) || q.form !== (k === 1 ? 'A' : 'B')) ruleOk = false;
        if (q.ladybugs.length !== 0 || q.bugs.length !== q.n) ruleOk = false;
        if (q.n < 10 || q.n > 15) rangeOk = false;
        const bOk = q.b >= 2 && q.b <= 6 && q.c >= 2 && q.c <= 6;
        const domOk = q.form === 'A' ? (q.c <= 4 && q.n - q.b >= 5)
                                     : (q.b <= 4 && q.c !== q.b && q.n + q.b <= 18);
        const ansOk = q.form === 'A'
          ? (q.s === q.n - q.b && q.answer === q.s + q.c && q.answer >= 6 && q.answer <= 17)
          : (q.s === q.n + q.b && q.answer === q.s - q.c && q.answer >= 6 && q.answer <= 17);
        const crossOk = q.form === 'A'
          ? ((q.b % 10) > (q.n % 10) || ((q.s % 10) + q.c > 9))
          : ((q.n % 10) + (q.b % 10) > 9 || (q.c % 10) > (q.s % 10));
        const mOk = q.m === (q.form === 'A' ? q.b : q.c) &&
                    q.flyIn === (q.form === 'A' ? q.c : q.b);
        if (!bOk || !domOk || !ansOk || !crossOk || !mOk) rangeOk = false;
        const ds = q.items.filter(v => v !== q.answer);
        const d2 = q.form === 'A' ? q.answer + 1 : q.answer - 1;
        if (ds.indexOf(q.s) < 0 || ds.indexOf(d2) < 0) ruleOk = false;   /* 干扰项恒含 s+定值 */
        if (q.form === 'A') dualA++; else dualB++;
      } else {
        /* 一步题区间：n 在章区间 / m≥1 / m 上限（章 3 允许 m=n）/ 答案=n-m ≥0 / 剩余 0 仅章 3 */
        const mMax = L1.dch === 3 ? q.n : q.n - 1;
        if (q.n < C.nMin || q.n > C.nMax || q.bugs.length !== q.n ||
            q.m < 1 || q.m > mMax || q.answer !== q.n - q.m || q.answer < 0) rangeOk = false;
        if (L1.dch <= 2 && q.answer < 1) rangeOk = false;
        if (q.answer === 0 && L1.dch !== 3) rangeOk = false;
        if (q.cross !== ((q.m % 10) > (q.n % 10))) rangeOk = false;            // 跨十标记一致
        if (L1.dch === 4 && (k === 1 || k === 3)) ruleOk = false;              // 槽位互补：qi1/3 必两步
        if (L1.dch === 3) { if (q.cross) crossN++; if (q.answer === 0) zeroN++; }
        const ndOk = L1.dch === 4
          ? (q.ladybugs.length >= D_MIN && q.ladybugs.length <= D_MAX)
          : q.ladybugs.length === 0;
        if (!ndOk) ruleOk = false;
      }
      if (k > 0 && L1.quizzes[k - 1].answer === q.answer) adjOk = false;     // 相邻题答案不同
      idxDist[q.answerIdx]++;
    }
    if (L1.dch === 3 && (crossN < 2 || zeroN < 1)) ruleOk = false;           // 章 3：跨十 ≥2 + 全飞走 ≥1
    if (L1.dch === 4 && (dualA !== 1 || dualB !== 1)) ruleOk = false;        // 章 4：A/B 各 1（固定槽）
    dualACnt += dualA; dualBCnt += dualB; dualTotal += dualA + dualB;
    /* 引擎直驱：放飞 m 只（递增断言）→ 已飞返 0 → 飞满点剩余返 0 → 重新飞清零（再按返 false）
       → 再放飞 m 只 → 答对推进 */
    let driveOk = true;
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      for (let i = 0; i < q.m; i++) {
        if (engTapBug(L1, i) !== i + 1) { driveOk = false; break; }
      }
      if (!driveOk) break;
      if (engTapBug(L1, 0) !== 0) driveOk = false;                           // 已飞走：不放飞
      if (q.n > q.m && engTapBug(L1, q.m) !== 0) driveOk = false;            // 飞满 m：点剩余不放飞
      if (!engRefly(L1)) driveOk = false;                                    // 重新飞：清零（有放飞→true）
      if (engRefly(L1)) driveOk = false;                                     // 再按：无放飞→false
      for (let i = 0; i < q.m; i++) {
        if (engTapBug(L1, i) !== i + 1) { driveOk = false; break; }
      }
      if (!driveOk) break;
      const r = engPick(L1, q.answerIdx);
      const want = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (r !== want) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && adjOk && rangeOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, structAll: structAll,
      adjOk: adjOk, rangeOk: rangeOk, driveOk: driveOk, solvedAll: solvedAll, dual: dualA + dualB,
      qs: L1.quizzes.map(q => (q.type === 'dual'
        ? q.form + ':' + q.n + (q.form === 'A' ? '-' : '+') + q.b + (q.form === 'A' ? '+' : '-') + q.c + '=' + q.answer
        : q.n + '-' + q.m + '=' + q.answer + (q.ladybugs.length ? '+' + q.ladybugs.length : ''))) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  /* r30 全局两步谱（20 关 dual：A/B 各 10）汇总在 units.dual，终判并入 title 条件 */

  /* ---- ② 放飞单元（flat 0 支架章真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = SUB.quiz;
  const taps = [];
  for (let i = 0; i < q0.m; i++) taps.push(SUB.tapBug(i));
  const incOk = taps.every((v, i) => v === i + 1) && SUB.currentLevel.flyCount === q0.m;
  const domB = fieldEl.querySelectorAll('.badge.on').length;                  // 每只放飞虫一个角标
  const domOk = domB === q0.m;
  const flyCls = bugEl(0).classList.contains('fly');                         // 放飞动画类同步挂上
  const overOk = q0.n > q0.m                                                  // 飞满 m：点剩余不放飞
    ? (SUB.tapBug(q0.m) === 0 && SUB.currentLevel.flyCount === q0.m) : true;
  const reFly = SUB.recount();                                                // 重新飞：清零+还原
  const recOk = reFly === true && SUB.currentLevel.flyCount === 0 &&
    fieldEl.querySelectorAll('.badge.on').length === 0 &&
    fieldEl.querySelectorAll('.animal.gone').length === 0;
  const rc2 = SUB.recount() === false;                                       // 无放飞再按→false
  const badIdx = SUB.tapBug(99) === false && SUB.tapBug(-1) === false;
  const tapOk = incOk && domOk && flyCls && overOk && recOk && rc2 && badIdx;
  if (tapOk) npass++;
  units.tapBug = { ok: tapOk, taps: taps, domBadges: domB, flyCls: flyCls, over: overOk,
    recount: recOk, recountAgain: rc2, badIdx: badIdx };

  /* ---- ③ UI 冒烟 A：flat0 支架章逐只放飞（角标 DOM 逐只断言）+ 首错零惩罚 + 通关（1 重试=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = CHKq();
    if (!q) { smokeA = false; break; }
    for (let i = 0; i < q.m; i++) {
      if (SUB.tapBug(i) !== i + 1) smokeA = false;
      if (fieldEl.querySelectorAll('.badge.on').length !== i + 1) smokeA = false;   // 逐只角标 DOM
    }
    if (s === 0) {                              // 首错：晃动+灰掉零惩罚；首错不 pulse 正确项
      const widx = q.items.findIndex((v, i2) => i2 !== q.answerIdx);
      await SUB.pick(widx);
      const wEl = answersEl.querySelector('.opt[data-i="' + widx + '"]');
      const okEl = answersEl.querySelector('.opt[data-i="' + q.answerIdx + '"]');
      wrongOk = !!wEl && wEl.classList.contains('wrong') && !okEl.classList.contains('pulse') &&
        SUB.currentLevel.retries === 1 && SUB.currentLevel.step === 0;
    }
    const r = await SUB.pick(q.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    steps++;
  }
  const lvA = SUB.currentLevel;
  const smokeOkA = smokeA && wrongOk && steps === CH_LEN && lvA.done && lvA.won && lvA.retries === 1 &&
    engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ③ UI 冒烟 B：flat15（章 4 盲飞+混养）答前点虫不计数 + 干扰瓢虫不计数 + autoSolve 直选 + autoFly×5 ---- */
  total++;
  startLevel(15);
  window.__autoFlyN = 0;
  const q15 = SUB.quiz;
  const domL = fieldEl.querySelectorAll('.animal[data-k="o"]').length;
  const othersOk = q15.ladybugs.length >= D_MIN && q15.ladybugs.length <= D_MAX && domL === q15.ladybugs.length;
  const tapLadyOk = SUB.tapLady(0) === true && SUB.currentLevel.flyCount === 0;   // 点瓢虫不计数
  const inert15 = SUB.tapBug(0) === false && SUB.currentLevel.flyCount === 0 &&
    fieldEl.querySelectorAll('.badge.on').length === 0;                // 盲飞答前点虫=不计数
  const a15 = await SUB.autoSolve();
  const lv15 = SUB.currentLevel;
  const smokeOkB = othersOk && tapLadyOk && inert15 && a15.done && lv15.done && lv15.won &&
    lv15.retries === 0 && engStars(cur) === 3 && window.__autoFlyN === 5;   // 每题答对各一次验证演出
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, others: q15.ladybugs.length, domLadybugs: domL, tapLady: tapLadyOk,
    inert: inert15, picks: a15.picks, retries: lv15.retries, stars: engStars(cur), autoFly: window.__autoFlyN };

  /* ---- ③ UI 冒烟 C：flat5（章 2 盲飞）支架救援链——miss1 不解锁不 pulse→miss2 解锁不 pulse→
     支架恢复点虫放飞→重新飞清零→答对 autoFly→通关 2 星 ---- */
  total++;
  startLevel(5);
  window.__autoFlyN = 0;
  const q5 = SUB.quiz;
  const blindOk = q5.mode === 'blind' && q5.assist === false;
  const inert5 = SUB.tapBug(0) === false && SUB.currentLevel.flyCount === 0 &&
    fieldEl.querySelectorAll('.badge.on').length === 0;
  const w1 = q5.items.findIndex((v, i2) => i2 !== q5.answerIdx);
  await SUB.pick(w1);                                          // miss1：灰掉、不解锁、不 pulse
  const s1 = SUB.quiz;
  const m1Ok = s1.assist === false && SUB.currentLevel.retries === 1 &&
    !optEl(s1.answerIdx).classList.contains('pulse');
  const w2 = s1.items.findIndex((v, i2) => i2 !== s1.answerIdx && i2 !== w1);
  await SUB.pick(w2);                                          // miss2：解锁支架（盲飞 pulse 延至 3）
  const s2 = SUB.quiz;
  const unlockOk = s2.assist === true && !optEl(s2.answerIdx).classList.contains('pulse');
  const againR = await SUB.pick(w1);                           // r30fix minor1：miss3 尝试=重按已灰错项→again 不涨 miss
  const miss3Ok = againR === 'again' && SUB.currentLevel.retries === 2 &&   // 3 选项题面错项仅 2 个：结构性 miss 极限=2，
    !optEl(s2.answerIdx).classList.contains('pulse') &&        // 若误把 again 计 miss（或阈值写 >2），pulse 将出现——判别力断言
    SUB.currentLevel.step === 0;
  const flyOk = SUB.tapBug(0) === 1 && SUB.currentLevel.flyCount === 1 &&   // 支架恢复：点虫放飞+角标
    fieldEl.querySelectorAll('.badge.on').length === 1;
  const recOk5 = SUB.recount() === true && SUB.currentLevel.flyCount === 0;  // 重新飞清零
  const r5 = await SUB.pick(s2.answerIdx);                     // 答对：autoFly 验证演出
  const afOk = r5 === 'right' && window.__autoFlyN === 1;
  const rest = await SUB.autoSolve();                          // 余下 4 题直选通关
  const lv5 = SUB.currentLevel;
  const smokeOkC = blindOk && inert5 && m1Ok && unlockOk && miss3Ok && flyOk && recOk5 && afOk &&
    rest.done && lv5.done && lv5.won && window.__autoFlyN === 5 && engStars(cur) === 2;
  if (smokeOkC) npass++;
  smokes.flat5 = { ok: smokeOkC, blind: blindOk, inert: inert5, miss1: m1Ok, unlock: unlockOk,
    miss3: miss3Ok, assistFly: flyOk, recount: recOk5, autoFly: afOk, picks: rest.picks, stars: engStars(cur) };

  /* ---- ④ 布局：双 viewport 模拟 ×（章 1 密集 8 只 / 章 3 密集 / 章 4 混养） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                               // 按新场地尺寸重新撒点（同 seed 同尺寸同布局）
    const de = document.documentElement;
    const ans = Array.prototype.map.call(answersEl.querySelectorAll('.opt'), b => b.getBoundingClientRect());
    const ansOk = ans.length === 3 && ans.every(r => r.width >= 96 && r.height >= 96);
    const animals = Array.prototype.map.call(fieldEl.querySelectorAll('.animal'), b => {
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    });
    const hitOk = animals.length > 0 && animals.every(a => a.w >= 64 && a.h >= 64);
    let distOk = true, minD = 1e9;
    for (let i = 0; i < animals.length; i++) {
      for (let j = i + 1; j < animals.length; j++) {
        const d = Math.hypot(animals[i].x - animals[j].x, animals[i].y - animals[j].y);
        if (d < minD) minD = d;
        if (d < 90) distOk = false;             // 撒点中心距 ≥90px：防重叠不可点
      }
    }
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, ansOk: ansOk, hitOk: hitOk, distOk: distOk, minD: Math.round(minD),
      animals: animals.length, ox: ox, pass: ansOk && hitOk && distOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 10, 15]) {             // 章 1 新域 8 只 / 章 3 最密 / 章 4 动物最多
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

  /* ---- ④ 附：scatterPts 确定性 + 最密场景 ≥90px 单元（章 3 n=20 / 章 4 17+4=21 留 24 余量 /
     章 1 新域 n=8 D=150——r30 撤 5 以内后 ch1 密度档） ---- */
  total++;
  const sc1 = scatterPts(mulberry32(987654), 900, 460, 12, 96, 54);
  const sc2 = scatterPts(mulberry32(987654), 900, 460, 12, 96, 54);
  const scDet = JSON.stringify(sc1) === JSON.stringify(sc2) && sc1.length === 12;
  const minOf = pts => {
    let mn = 1e9;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < mn) mn = d;
    }
    return mn;
  };
  let scMin = minOf(sc1);
  const scMinOk = scMin >= 96;
  const dense = [
    scatterPts(mulberry32(700001), 1172, 436, 21, 94, 47),   // 横屏最密（章 4 极值 14+4 上下兼容）
    scatterPts(mulberry32(700002), 740, 820, 21, 94, 47),    // 竖屏最密
    scatterPts(mulberry32(700003), 1172, 436, 24, 94, 47),   // 余量（>实际最多 18-21）
    scatterPts(mulberry32(700004), 1172, 436, 8, 150, 64),   // 章 1 新域 8 只 D=150（r30）
    scatterPts(mulberry32(700005), 740, 820, 8, 150, 64)     // 章 1 竖屏
  ].map(minOf);
  const denseOk = dense.every(d => d >= 90);
  const scOk = scDet && scMinOk && denseOk;
  if (scOk) npass++;
  units.scatter = { ok: scOk, det: scDet, minD: Math.round(scMin), dense: dense.map(d => Math.round(d)) };

  /* ---- ⑤ 分布断言：answerIdx 三位置都出现、首位不恒定（<60%） ---- */
  total++;
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[0] < 200 * 0.6;
  if (distOk) npass++;
  units.dist = { ok: distOk, idx0: idxDist[0], idx1: idxDist[1], idx2: idxDist[2], n: idxDist[0] + idxDist[1] + idxDist[2] };
  units.dual = { total: dualTotal, a: dualACnt, b: dualBCnt, ok: dualTotal === 20 && dualACnt === 10 && dualBCnt === 10 };

  const out = { game: 'subbug', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk && units.dual.ok) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

function CHKq() { return cur && !cur.done ? cur.quizzes[cur.step] : null; }

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  runVerify();
}
