/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     章型一致（静态关=循环章；dch1 单列堆/dch2 宽渐变/dch3 恰 1 风/dch4 恰 2 风 5-6 块；
     dch2/3/4 首题=热身）/ 域独立断言（refRangeOk：宽 2-4、风 0/±1、相邻色互异、
     ch2 有渐变、ch4 解数 ≥2——全部 verify 侧独立复算，禁复用引擎判定 §0.38）/
     同关相邻楼层 sig 互异 / structOk
   ①b 引擎直驱：非法列 null → 倒列 miss/misses 恰一次 → 安全列 'placed'/'win' 推进；
     星级三档（全稳 3★/倒一次 2★/多倒 1★）
   ② 独立平衡复算对账（§0.38 分源核心）：verify 侧独立平衡复算器（refStep 自实现
     偏移/累积/风摆判定，字面量独立不引 GRID）——每题稳定解存在（refSolveFrom）+
     全对齐路径恒稳 + 40 关混合随机放置逐步对账 engPlace 返回值与 refStep 预测一致
   ③ UI 单元（flat0 真实 UI）：列按钮 7 个 + 塔区 SVG + 托盘块数=floors + tapCol 推进
     + 钩子字段（cols/floors/placed/wind/phase）+ SVG 楼块整数坐标对齐断言
   ④ sayW 三态（flat<3 每倒必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ⑤ UI 冒烟 A：flat0 真实通路（首题先倒一次=2 星）；倒塌判定即时可断言（miss/phase
     同步可查）+ 防重入窗同步续调 tapCol 返回 false 且 miss 恰一次 + verify 页不弹层
   ⑥⑦⑧ UI 冒烟 B：flat5（ch2 宽渐变+热身）/ flat10（ch3 风摆：st_wind 播报实证）/
     flat15（ch4 生成关 5-6 块两风摆 autoSolve 3★）
   ⑨ 教学链（verify 直驱 tutorialWatch）：演示放 1-2 块 → __stDemoR==='right'（§0.27）
     → 重发同关 → 交接链 queue([st_tut_turn]) 单通道 → tut='help'；演示常量和 ≤16s
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）：列按钮 ≥64、
     全按钮 ≥64（.k-parentbtn 豁免）、场景 SVG 非零、overflowX ≤0、楼块整数坐标
   ⑪ 专项：VOICE 七句文案独立字面量对账（SPEC §2 定稿）/ clips 注入恰 14 条
     （st_ 11=教学反馈 7+T46 章问句 st_q_ 4+core 3）/ 开场链 queue([st_hint]) 单通道 /
     题面句=st_q_ clip（T46 阶段2，say 恒零）
   结果写 #verify-result + 全部单元完成后 document.title='VERIFY PASS n/n'（外部脚本等 title） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立平衡复算器（分源 §0.38：不引 GRID.margin/baseW/layerOk/solveSeq，
         全部字面量独立重写——两套逻辑同错不可检；列序与引擎 ORDER 故意不同） ---- */
  function refStep(floors, placed, col) {          // 一步放置独立判定
    const i = placed.length;
    if (i >= floors.length) return null;
    if (typeof col !== 'number' || Math.floor(col) !== col || col < 0 || col > 6) return null;
    const f = floors[i];
    const pc = i === 0 ? 3 : placed[i - 1].col + floors[i - 1].wind;
    const pw = i === 0 ? 5 : floors[i - 1].w;
    const off = col + f.wind - pc;
    let sum = 0;
    for (let k = 0; k < placed.length; k++) sum += placed[k].off;
    if (Math.abs(off) > Math.max(0, pw / 2 - f.w / 2) + 0.5) return { r: 'fall', off: off };
    if (Math.abs(sum + off) > 2.5) return { r: 'fall', off: off };
    return { r: i + 1 >= floors.length ? 'win' : 'placed', off: off };
  }
  function refSolveFrom(floors, placed) {          // 独立稳定解（从部分塔续解）
    const res = [];
    const ORD = [3, 4, 2, 5, 1, 6, 0];
    function dfs(i, pc, sum) {
      if (i >= floors.length) return true;
      const pw = i === 0 ? 5 : floors[i - 1].w, f = floors[i];
      for (let k = 0; k < ORD.length; k++) {
        const col = ORD[k];
        const off = col + f.wind - pc;
        if (Math.abs(off) > Math.max(0, pw / 2 - f.w / 2) + 0.5) continue;
        if (Math.abs(sum + off) > 2.5) continue;
        res.push(col);
        if (dfs(i + 1, col + f.wind, sum + off)) return true;
        res.pop();
      }
      return false;
    }
    const pc0 = placed.length ? placed[placed.length - 1].col + floors[placed.length - 1].wind : 3;
    let s0 = 0;
    for (let k = 0; k < placed.length; k++) s0 += placed[k].off;
    return dfs(placed.length, pc0, s0) ? res : null;
  }
  function refCountSols(floors, cap) {             // 独立解计数（cap 截断）
    let n = 0;
    function dfs(i, pc, sum) {
      if (n >= cap) return;
      if (i >= floors.length) { n++; return; }
      const pw = i === 0 ? 5 : floors[i - 1].w, f = floors[i];
      for (let col = 0; col <= 6; col++) {
        const off = col + f.wind - pc;
        if (Math.abs(off) > Math.max(0, pw / 2 - f.w / 2) + 0.5) continue;
        if (Math.abs(sum + off) > 2.5) continue;
        dfs(i + 1, col + f.wind, sum + off);
        if (n >= cap) return;
      }
    }
    dfs(0, 3, 0);
    return n;
  }
  /* 章型域独立断言（SPEC §2：宽 2-4/风 0±1/章型块数风数/热身/渐变/解不唯一） */
  function refRangeOk(dch, qi, q) {
    const fs = q.floors;
    if (!Array.isArray(fs) || fs.length < 3 || fs.length > 6) return false;
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      if (!(f.w === 2 || f.w === 3 || f.w === 4)) return false;
      if (!(f.wind === -1 || f.wind === 0 || f.wind === 1)) return false;
      if (!(Number.isInteger(f.ci) && f.ci >= 0 && f.ci <= 3)) return false;
      if (i > 0 && f.ci === fs[i - 1].ci) return false;
    }
    const winds = fs.filter(f => f.wind !== 0).length;
    if (dch === 1 || (qi === 0 && dch !== 1))                    // ch1 型/热身
      return winds === 0 && fs.length >= 3 && fs.length <= 4 && fs[0].w === 4;
    if (dch === 2) {
      let change = false;
      for (let i = 1; i < fs.length; i++) if (fs[i].w !== fs[i - 1].w) change = true;
      return winds === 0 && change;
    }
    if (dch === 3) return winds === 1 && fs.length === 4;
    return winds === 2 && fs.length >= 5 && fs.length <= 6 && refCountSols(fs, 3) >= 2;
  }
  /* 用钩子快照（floors {w,color,wind}+placed {col,off}）独立找必倒列 */
  function refFindFall(qk) {
    for (let c = 0; c < 7; c++) if (refStep(qk.floors, qk.placed, c).r === 'fall') return c;
    return -1;
  }

  /* ---- ① 40 关全量审计 + ①b 引擎直驱（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, warmOk = true, adjOk = true, structAll = true,
        solAll = true, alignAll = true, driveOk = true, uniqAll = true;
    let prevSig = null;
    const sigSeen = {};
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refRangeOk(L1.dch, k, q)) rangeAll = false;
      if (!structOk(q)) structAll = false;
      if (!refSolveFrom(q.floors, q.placed)) solAll = false;    // 稳定解存在（独立）
      if (solAll && !solveSeq(JSON.parse(JSON.stringify(q)))) solAll = false;   // 引擎求解器也须成功
      const sigNow = sig(q);
      if (sigNow === prevSig) adjOk = false;                     // 同关相邻楼层序列互异
      if (sigSeen[sigNow]) uniqAll = false;                      // 同关全集合互异（审查 m1：与生成器 avoid Set 承诺对齐）
      sigSeen[sigNow] = true;
      prevSig = sigNow;
      /* 全对齐路径恒稳（存在性第二重：每块 col=3-wind → 实际中心恒 3、off 恒 0） */
      let okp = true;
      const ap = [];
      for (let i = 0; i < q.floors.length && okp; i++) {
        const col = 3 - q.floors[i].wind;
        const st = refStep(q.floors, ap, col);
        if (col < 0 || col > 6 || !st || st.r === 'fall' || st.off !== 0) okp = false;
        else ap.push({ col: col, off: st.off });
      }
      if (!okp) alignAll = false;
    }
    if (L1.dch !== 1) {
      const w = L1.quizzes[0];
      warmOk = w.warm === true && w.floors.every(f => f.wind === 0) && w.floors.length >= 3 && w.floors.length <= 4;
    } else warmOk = L1.quizzes[0].warm === false;

    /* 引擎直驱：非法列 null → 倒列恰一次 → 安全列推进；星级三档 */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.misses;
      if (engPlace(Ld, 99) !== null || engPlace(Ld, 0.5) !== null ||
          engPlace(Ld, -1) !== null || engPlace(Ld, 7) !== null) driveOk = false;
      let fc = -1;
      for (let c = 0; c < 7; c++) if (refStep(q.floors, q.placed, c).r === 'fall') { fc = c; break; }
      if (fc < 0 || engPlace(Ld, fc) !== 'fall' || q.miss !== 1 || Ld.misses !== base + 1) driveOk = false;
      let guard = 0;
      while (!q.solved && driveOk && guard++ < 20) {
        const s = solveSeq(q);
        if (!s || !s.length) { driveOk = false; break; }
        const r = engPlace(Ld, s[0]);
        if (r !== 'placed' && r !== 'win') driveOk = false;
      }
    }
    /* 星级三档独立驱动 */
    const Ls1 = genLevel(flat);                     // 每题倒一次=5 错=1★
    for (let k = 0; k < Ls1.quizzes.length; k++) {
      const q = Ls1.quizzes[k];
      for (let c = 0; c < 7; c++) if (refStep(q.floors, q.placed, c).r === 'fall') { engPlace(Ls1, c); break; }
      let g1 = 0;
      while (!q.solved && g1++ < 20) engPlace(Ls1, solveSeq(q)[0]);
    }
    const s1 = Ls1.done && Ls1.misses >= 5 && engStars(Ls1) === 1;
    const Ls2 = genLevel(flat);                     // 仅首题倒一次=2★
    {
      const q = Ls2.quizzes[0];
      for (let c = 0; c < 7; c++) if (refStep(q.floors, q.placed, c).r === 'fall') { engPlace(Ls2, c); break; }
      let g2 = 0;
      while (!q.solved && g2++ < 20) engPlace(Ls2, solveSeq(q)[0]);
      let g3 = 0;
      while (!Ls2.done && g3++ < 40) engPlace(Ls2, solveSeq(Ls2.quizzes[Ls2.step])[0]);
    }
    const s2 = Ls2.done && Ls2.misses === 1 && engStars(Ls2) === 2;
    const Ls3 = genLevel(flat);                     // 全净=3★
    let g4 = 0;
    while (!Ls3.done && g4++ < 40) engPlace(Ls3, solveSeq(Ls3.quizzes[Ls3.step])[0]);
    const s3 = Ls3.done && Ls3.misses === 0 && engStars(Ls3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    const ok = det && L1.quizzes.length === CH_LEN && rangeAll && warmOk && adjOk &&
      structAll && solAll && alignAll && driveOk && uniqAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, warmOk: warmOk,
      adjOk: adjOk, uniqAll: uniqAll, structAll: structAll, solAll: solAll, alignAll: alignAll, driveOk: driveOk,
      stars: { many1: engStars(Ls1), wrong1: engStars(Ls2), clean: engStars(Ls3) },
      qs: L1.quizzes.map(q => sig(q)) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 独立平衡复算对账：40 关混合随机放置逐步对账（engPlace vs refStep 分源一致） ---- */
  total++;
  let balOk = true, steps = 0, falls = 0;
  for (let flat = 0; flat < 40 && balOk; flat++) {
    const rr = mulberry32(flat * 131 + 7);
    const Lm = genLevel(flat);
    let qi = 0, placed = [], guard = 0;
    while (!Lm.done && guard++ < 300) {
      const q = Lm.quizzes[qi];
      let col;
      if (rr() < 0.5) col = Math.floor(rr() * 7);                       // 随机（含倒列）
      else {
        const s = refSolveFrom(q.floors, placed);
        col = s && s.length ? s[0] : Math.floor(rr() * 7);              // 独立安全列
      }
      const exp = refStep(q.floors, placed, col);
      const got = engPlace(Lm, col);
      if (exp.r !== got) { balOk = false; break; }                      // 分源判定必须逐步一致
      steps++;
      if (exp.r === 'fall') falls++;
      else {
        placed.push({ col: col, off: exp.off });
        if (exp.r === 'win') { qi++; placed = []; }
      }
    }
    if (!Lm.done) balOk = false;                                        // 混合策略必收敛
  }
  if (balOk && steps < 200) balOk = false;                              // 确实走到了足够步数
  if (balOk) npass++;
  units.balance = { ok: balOk, steps: steps, falls: falls };

  /* ---- ③ UI 单元（flat0 真实 UI）：列按钮/塔区 SVG/托盘/钩子字段/整数坐标 ---- */
  total++;
  startLevel(0);
  const q0 = ST.quiz;
  const svgEl = sceneEl.querySelector('svg.scene');
  const colBtns = colbarEl.querySelectorAll('.colbtn');
  const domOk = q0 && q0.cols === 7 && colBtns.length === 7 && !!svgEl &&
    sceneEl.querySelectorAll('.trayb').length === q0.floors.length &&      // 托盘=待放块数
    !!sceneEl.querySelector('.curwrap') &&                                  // 当前块悬停
    q0.phase === 'placing' && q0.wind === 0 && q0.step === 0 && q0.placed.length === 0;
  /* 真实放一块 + 整数坐标对账（x = 60+(col+wind)*40 - w*20 独立重算） */
  const seq0 = solveSeq(cur.quizzes[0]);
  const rp = await ST.tapCol(seq0[0]);
  const q0b = ST.quiz;
  const rects = sceneEl.querySelectorAll('.tower .blkr');
  let intOk = rp === 'placed' && q0b.step === 1 && q0b.placed.length === 1 &&
    q0b.placed[0].off === 0 && rects.length === 1;
  rects.forEach(r => {
    const x = Number(r.getAttribute('x')), y = Number(r.getAttribute('y')),
          w = Number(r.getAttribute('width')), h = Number(r.getAttribute('height'));
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(w) || !Number.isInteger(h)) intOk = false;
  });
  if (intOk) {
    const f0 = q0.floors[0];
    const wantX = 60 + (q0b.placed[0].col + f0.wind) * 40 - f0.w * 20;
    if (Number(rects[0].getAttribute('x')) !== wantX) intOk = false;      // 与钩子 placed 对账
  }
  const curR = sceneEl.querySelector('.curwrap .blkr');
  if (!curR || !Number.isInteger(Number(curR.getAttribute('x')))) intOk = false;
  const selfOk = !!(domOk && intOk);
  if (selfOk) npass++;
  units.ui = { ok: selfOk, domOk: domOk, intOk: intOk, cols: colBtns.length,
    trays: sceneEl.querySelectorAll('.trayb').length, floors: q0.floors.length };

  /* ---- ④ sayW 三态（flat<3 每倒必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key) { wLog.push(String(key)); };
  const wrongPlays = () => wLog.filter(k => k === 'st_wrong').length;
  startLevel(0);                                          // flat0：每倒必播
  await ST.tapCol(refFindFall(ST.quiz));
  await ST.tapCol(refFindFall(ST.quiz));
  const sayA = wrongPlays();                              // → 2
  startLevel(3);                                          // flat3：10s 节流
  lastWrongVoice = Date.now();                            /* 显式进入节流窗口内 */
  await ST.tapCol(refFindFall(ST.quiz));
  const sayB = wrongPlays() - 2;                          // 增量 → 0
  startLevel(3);                                          // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                                     /* 隔离上一子用例时间戳 */
  await ST.tapCol(refFindFall(ST.quiz));                  // miss=1 → 播（窗口外）
  await ST.tapCol(refFindFall(ST.quiz));                  // miss=2 → force → 播
  const sayC = wrongPlays() - 2 - sayB;                   // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ⑤ UI 冒烟 A：flat0 真实通路（首题先倒一次 → 1 错=2 星）
     倒塌判定即时可断言（miss/phase 同步查）+ 防重入窗同步续调只记一次 miss ---- */
  total++;
  startLevel(0);
  let smokeA = true, immOk = false, reOk = false;
  const fc0 = refFindFall(ST.quiz);
  if (fc0 < 0) smokeA = false;
  else {
    const p1 = ST.tapCol(fc0);
    const missNow = ST.quiz.miss;                         // 触发判定即时（不等动画）
    const phaseNow = ST.quiz.phase;
    const falloutNow = !!sceneEl.querySelector('.blk.fallout');
    const p2 = ST.tapCol(fc0);                            // 防重入窗内同步续调
    const r1 = await p1, r2 = await p2;
    immOk = missNow === 1 && phaseNow === 'falling' && falloutNow;
    reOk = r1 === 'fall' && r2 === false && ST.quiz.miss === 1 && ST.currentLevel.misses === 1;
  }
  const a0 = await ST.autoSolve();
  const lvA = ST.currentLevel;
  const smokeOkA = smokeA && immOk && reOk && a0.done && lvA.done && lvA.won &&
    lvA.misses === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, immOk: immOk, reentryOk: reOk, taps: a0.taps,
    misses: lvA.misses, stars: engStars(cur) };

  /* ---- ⑥ UI 冒烟 B1：flat5（ch2 宽渐变）首题热身 + autoSolve 3★ ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const warm5 = cur.dch === 2 && L5.quizzes[0].warm === true &&
    L5.quizzes[0].floors.every(f => f.wind === 0);
  const grad5 = L5.quizzes.some((q, i) => i > 0 && !q.warm &&
    (() => { let ch2 = false; q.floors.forEach((f, j) => { if (j > 0 && f.w !== q.floors[j - 1].w) ch2 = true; }); return ch2; })());
  const a5 = await ST.autoSolve();
  const lv5 = ST.currentLevel;
  const smokeOkB1 = warm5 && grad5 && a5.done && lv5.done && lv5.won &&
    lv5.misses === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, warm: warm5, grad: grad5, taps: a5.taps, stars: engStars(cur) };

  /* ---- ⑦ UI 冒烟 B2：flat10（ch3 风摆）autoSolve 3★ + st_wind 播报实证 ---- */
  total++;
  startLevel(10);
  const L10 = genLevel(10);
  const windQs = L10.quizzes.filter(q => !q.warm && q.floors.filter(f => f.wind !== 0).length === 1);
  const windOk10 = L10.dch === 3 && L10.quizzes.length - 1 === windQs.length;
  const wLog10 = [];
  const origPlay10 = KIDS.voice.play;
  KIDS.voice.play = function (key) { wLog10.push(String(key)); };
  const a10 = await ST.autoSolve();
  KIDS.voice.play = origPlay10;
  const windPlayed = wLog10.indexOf('st_wind') >= 0 && wLog10.indexOf('st_right') >= 0;
  const lv10 = ST.currentLevel;
  const smokeOkB2 = windOk10 && windPlayed && a10.done && lv10.done && lv10.won &&
    lv10.misses === 0 && engStars(cur) === 3;
  if (smokeOkB2) npass++;
  smokes.flat10 = { ok: smokeOkB2, windQs: windQs.length, windPlayed: windPlayed,
    taps: a10.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B3：flat15（ch4 生成关）5-6 块两风摆 + autoSolve 3★ ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const genOk15 = L15.dch === 4 && L15.quizzes.every(q => q.warm ||
    (q.floors.length >= 5 && q.floors.length <= 6 && q.floors.filter(f => f.wind !== 0).length === 2));
  const a15 = await ST.autoSolve();
  const lv15 = ST.currentLevel;
  const smokeOkB3 = genOk15 && a15.done && lv15.done && lv15.won &&
    lv15.misses === 0 && engStars(cur) === 3;
  if (smokeOkB3) npass++;
  smokes.flat15 = { ok: smokeOkB3, gen: genOk15, taps: a15.taps, stars: engStars(cur) };

  /* ---- ⑨ 教学链（verify 直驱 tutorialWatch）：演示 → demoR 实证 → 重发同关 → 交接链 ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  window.__stDemoR = null;
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → 地基高亮 → 演示放 1-2 块 → 塔立 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const demoR = window.__stDemoR;
  const q0t = ST.quiz;
  /* 演示紧凑性算术断言（SPEED=1 口径常量和 ≤16s §0.30；demoN=min(2,n-1) 与 tutorialWatch 同式） */
  const estWatch = 700 + 1000 + Math.min(2, q0t.floors.length - 1) * (900 + 280 + 520 + 560) + 800;
  const tutOk = pLog7.indexOf('st_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    demoR === 'right' &&                                                   /* §0.27 演示真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&               /* 帮：解锁等孩子动手 */
    ST.currentLevel && ST.currentLevel.flat === 0 &&                      /* 重发同关 */
    ST.quiz && ST.quiz.step === 0 && ST.quiz.miss === 0 &&                /* 新题面初态 */
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'st_tut_turn' &&       /* 交接链单通道 */
    estWatch <= 16000 && q0t.floors.length >= 3;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('st_tut_watch') >= 0,
    demoR: demoR, handoff: !!lastQ7, parts: lastQ7, tut: state.tut, estWatchMs: estWatch };

  /* ---- ⑩ 布局：双 viewport ×（flat0/5/10/15）
     量测前等列按钮入场 stagger 动画结束（§0.11 transform 中途陷阱） ---- */
  async function simLevel(w, h, flat) {
    startLevel(flat);
    const s0 = solveSeq(cur.quizzes[0]);
    await ST.tapCol(s0[0]);                       // 放一块使塔非空（整数坐标双 viewport 复查）
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                              // 列按钮入场动画（真实 ms，不吃 SPEED）
    const de = document.documentElement;
    const btns = Array.prototype.slice.call(colbarEl.querySelectorAll('.colbtn'));
    const colOk = btns.length === 7 &&
      btns.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const sv = sceneEl.querySelector('svg.scene');
    const sr = sv ? sv.getBoundingClientRect() : null;
    const sceneOk = !!sr && sr.width >= 100 && sr.height >= 80;   // 场景 SVG 可见非零
    let intOk2 = true;                            // 楼块整数坐标（双 viewport 复查）
    sceneEl.querySelectorAll('.tower .blkr, .curwrap .blkr').forEach(r => {
      ['x', 'y', 'width', 'height'].forEach(a => {
        if (!Number.isInteger(Number(r.getAttribute(a)))) intOk2 = false;
      });
    });
    const ox = Math.max($id('game').scrollWidth - $id('game').clientWidth,
      de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, colOk: colOk, btnOk: btnOk, sceneOk: sceneOk,
      intOk: intOk2, ox: ox, pass: colOk && btnOk && sceneOk && intOk2 && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simLevel(1280, 800, f));
    sims.push(await simLevel(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑪ 专项：文案对账 / clips 恰 14 / 开场链 / 题面 st_q_ clip（T46） ---- */
  total++;
  const refVoice = VOICE.watch.text === '看！把高楼搭起来' &&
    VOICE.turn.text === '你来搭一搭' && VOICE.hint.text === '对整齐就不倒啦' &&
    VOICE.right.text === '搭好啦，真稳' && VOICE.wrong.text === '歪了歪了，再来一次' &&
    VOICE.wind.text === '风来了，放另一边' && VOICE.place.text === '放好一层';
  const refAsk = qAsk(1) === '把楼层一块块搭上去' && qAsk(2) === '看看宽窄，稳稳地搭' &&
    qAsk(3) === '风来了，往另一边放' && qAsk(4) === '大风天，搭一座高楼';
  /* clips 注入恰 14 条（st_ 11=教学反馈 7+T46 章问句 4+core 3）且全在场 */
  const ST_KEYS = ['st_tut_watch', 'st_tut_turn', 'st_hint', 'st_right', 'st_wrong', 'st_wind', 'st_place',
                   'st_q_1', 'st_q_2', 'st_q_3', 'st_q_4'];
  const CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const allKeys = Object.keys(KIDS.voice.clips);
  const clipOk = ST_KEYS.concat(CORE_KEYS).every(k => !!KIDS.voice.clips[k]) && allKeys.length === 14;
  const coreOk = CORE_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([st_hint]) 单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'st_hint';
  askSpeak();                                    // 换题读题面：T46 章问句 clip（st_q_，期望从 ASKS 静态域推导）
  const askClip = playLog.length >= 1 && playLog[playLog.length - 1] === 'st_q_1' && sayLog.length === 0;
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const specOk = refVoice && refAsk && clipOk && coreOk && openChain && askClip;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, refAsk: refAsk, clips: clipOk,
    clipN: allKeys.length, core: coreOk, openChain: openChain, askClip: askClip };

  const out = { game: 'stack', total: total, pass: npass, levels: levels, gen: gen,
    units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
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
