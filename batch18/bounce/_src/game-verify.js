/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   断言全部从 SPEC-BATCH18 §3+§0.39 分源推导（禁从实现行为归纳）：
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     静态关难度章映射 / 章域（墙数+斜墙数/方向卡数/洞数域）/ 反射真值分源复算
     （verify 侧独立反射模拟器 refSim：自实现到达墙点反弹——水平墙翻 vy/垂直墙翻 vx/
     45° 斜墙翻转轴向分解+8 段反弹步上限，禁复用游戏侧 simShot §0.39）：
     恰 answer 入正确洞 / 干扰方向不入正确洞（入别洞/出界/步上限）/
     章级反弹域（ch1=1 且 1 内墙 / ch2=2 且 2 内墙 / ch3=3 且 ≥2 内墙含斜 / ch4=1-3 且
     ≥min(b,2) 内墙）/ 无 loose 兜底题 / structOk / 同关 5 题 sig 互异（独立签名复算）
   ①b 引擎直驱：非法下标拒绝；错方向=miss 恰一次（再点再计）；对方向=right/done 推进；
     5 题全解=done；星级三档独立驱动（3 错=1★/1 错=2★/0 错=3★）
   ①c 救援目标闭环：rescueTarget 步进执行收敛到解题；已解题无救援目标
   ② tapDir 单元（flat0 真实 UI）：飞行中 phase='fly'+locked；错方向=miss=1+
     轨迹导出对账（__bcTrace 与 refSim 逐点数/终点/结局一致）；对方向=step+1；
     越界下标=false
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题错一次=1 错 2 星；首错无救援视觉；verify 页不弹层）
   ④ UI 冒烟 B：flat15（ch4：3 墙含 1 斜/3 洞/3 方向）全对通关 3 星
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 看球弹一段→指卡→点对入洞
     __bcDemoR==='right'（§0.27）→ 重发同关 → 交接链 queue([bc_tut_turn]) → tut='help' 解锁
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）
     方向卡 ≥64、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0；
     SVG 墙段/洞整数格点坐标对齐（data 格点 ↔ viewBox 像素恰等于 PAD+x*U）+格点阵数
   ⑥ 分布与专项：VOICE 表文案独立字面量对账（SPEC 定稿）/ 10 条 clips（bc_ 7+core 3，T46 阶段2+bc_hole）clipOk /
     开场顺序链（queue([bc_hint]) 单通道）/ 飞行反馈通道（bc_boing+bc_right）
   结果写 #verify-result + document.title='VERIFY PASS n/n'（全部单元同步完成后设） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立反射模拟器（与游戏侧分源双写；禁复用 simShot/buildOcc 自证 §0.39）
     语义（SPEC §3+§0.39）：格点逐步行进；到达墙点按该点全部墙向合成反射——
     水平墙(沿x)翻 vy、垂直墙(沿y)翻 vx、45° 斜墙翻转轴向分解（沿(1,1)：dx↔dy；
     沿(1,-1)：(dx,dy)→(-dy,-dx)）；方向不变=贴墙滑不计反弹；变向达 8 次=步上限止；
     到点即查洞（先入洞后反弹）；边界四墙按贴边自动补。 ---- */
  function refSim(W, H, ball, dir, walls, holes) {
    const typesAt = (x, y) => {                  // 该格点的墙向标签（边界 BV/BH + 内墙 w?:idx）
      const t = [];
      if (x === 0 || x === W) t.push('BV');
      if (y === 0 || y === H) t.push('BH');
      for (let i = 0; i < walls.length; i++) {
        const a = walls[i];
        const ddx = a.x2 - a.x1, ddy = a.y2 - a.y1;
        const n = Math.max(Math.abs(ddx), Math.abs(ddy));
        const sx = ddx > 0 ? 1 : (ddx < 0 ? -1 : 0), sy = ddy > 0 ? 1 : (ddy < 0 ? -1 : 0);
        let on = false;
        for (let k = 0; k <= n; k++) {
          if (a.x1 + sx * k === x && a.y1 + sy * k === y) { on = true; break; }
        }
        if (!on) continue;
        if (ddx === 0) t.push('wV:' + i);
        else if (ddy === 0) t.push('wH:' + i);
        else if ((ddx > 0) === (ddy > 0)) t.push('wP:' + i);   // 沿(1,1)
        else t.push('wM:' + i);                                // 沿(1,-1)
      }
      return t;
    };
    let cx = ball.x, cy = ball.y, vx = dir[0], vy = dir[1];
    const pts = [[cx, cy]];
    const bends = [];
    const touched = {};
    let nB = 0, sawDiag = false;
    for (let iter = 0; iter < 80; iter++) {
      const ts = typesAt(cx, cy);
      let nvx = vx, nvy = vy, diag = false;
      for (let z = 0; z < ts.length; z++) {
        const tg = ts[z];
        if (tg === 'BV') nvx = -nvx;
        else if (tg === 'BH') nvy = -nvy;
        else if (tg.charAt(0) === 'w') {
          const kind = tg.charAt(1);
          if (kind === 'V') nvx = -nvx;
          else if (kind === 'H') nvy = -nvy;
          else if (kind === 'P') { const tm = nvx; nvx = nvy; nvy = tm; diag = true; }
          else { const tm = nvx; nvx = -nvy; nvy = -tm; diag = true; }
        }
      }
      if (nvx !== vx || nvy !== vy) {             // 贴墙滑（方向不变）不计反弹
        for (let z = 0; z < ts.length; z++)
          if (ts[z].charAt(0) === 'w') touched[ts[z].split(':')[1]] = true;
        if (nB >= 8)                              // §0.39 步数上限=8 段反弹
          return { pts: pts, end: 'cap', hole: -1, bends: nB, diag: sawDiag,
            internal: Object.keys(touched).length };
        nB++;
        bends.push(pts.length - 1);
        if (diag) sawDiag = true;
        vx = nvx; vy = nvy;
      }
      cx += vx; cy += vy;
      if (cx < 0 || cx > W || cy < 0 || cy > H)
        return { pts: pts, end: 'out', hole: -1, bends: nB, diag: sawDiag,
          internal: Object.keys(touched).length };
      pts.push([cx, cy]);
      for (let hi = 0; hi < holes.length; hi++)
        if (holes[hi].x === cx && holes[hi].y === cy)
          return { pts: pts, end: 'hole', hole: hi, bends: nB, diag: sawDiag,
            internal: Object.keys(touched).length };
    }
    return { pts: pts, end: 'fuse', hole: -1, bends: nB, diag: sawDiag,
      internal: Object.keys(touched).length };
  }

  /* 章域独立字面量（SPEC §3）：墙数[轴,斜]/方向卡数/洞数域 */
  const REF_WALLS = { 1: [1, 0], 2: [2, 0], 3: [2, 1], 4: [2, 1] };
  const REF_NDIRS = { 1: 2, 2: 3, 3: 3, 4: 3 };
  const REF_NHOLES = { 1: [2, 2], 2: [2, 3], 3: [3, 3], 4: [3, 3] };

  /* 单题分源审计（§3+§0.39 断言；返回 {ok, why[]}） */
  function refQuizOk(dch, q) {
    const why = [];
    if (q.loose) why.push('loose 兜底题（章域不达标）');
    const diagWalls = q.walls.filter(w => w.x1 !== w.x2 && w.y1 !== w.y2).length;
    const axisWalls = q.walls.length - diagWalls;
    if (axisWalls !== REF_WALLS[dch][0] || diagWalls !== REF_WALLS[dch][1])
      why.push('墙配比 ' + axisWalls + '+' + diagWalls + '≠' + REF_WALLS[dch]);
    if (q.dirs.length !== REF_NDIRS[dch]) why.push('方向卡数 ' + q.dirs.length);
    if (q.holes.length < REF_NHOLES[dch][0] || q.holes.length > REF_NHOLES[dch][1])
      why.push('洞数 ' + q.holes.length + ' 不在 ' + REF_NHOLES[dch]);
    if (!structOk(q)) why.push('structOk');
    /* 反射真值对账（独立模拟器）：answer 入正确洞 + 章级反弹域 */
    const rAns = refSim(q.W, q.H, q.ball, q.dirs[q.answer], q.walls, q.holes);
    if (!(rAns.end === 'hole' && rAns.hole === q.okHole))
      why.push('answer 未入正确洞 end=' + rAns.end + ' hole=' + rAns.hole + '/' + q.okHole);
    const b = rAns.bends, ih = rAns.internal;
    if (dch === 1 && !(b === 1 && ih === 1)) why.push('ch1 反弹域 b=' + b + ' i=' + ih);
    if (dch === 2 && !(b === 2 && ih === 2)) why.push('ch2 反弹域 b=' + b + ' i=' + ih);
    if (dch === 3 && !(b === 3 && ih >= 2 && rAns.diag)) why.push('ch3 反弹域 b=' + b + ' i=' + ih + ' d=' + rAns.diag);
    if (dch === 4 && !(b >= 1 && b <= 3 && ih >= Math.min(b, 2))) why.push('ch4 反弹域 b=' + b + ' i=' + ih);
    /* 洞唯一命中：干扰方向不入正确洞（入别洞/出界/步上限皆可） */
    for (let i = 0; i < q.dirs.length; i++) {
      if (i === q.answer) continue;
      const r = refSim(q.W, q.H, q.ball, q.dirs[i], q.walls, q.holes);
      if (r.end === 'hole' && r.hole === q.okHole) why.push('干扰 dir' + i + ' 也入正确洞');
    }
    return { ok: why.length === 0, why: why };
  }
  /* 独立签名（同关互异判据；与游戏侧 quizSig 分源双写） */
  function refSigOf(q) {
    const w = q.walls.map(x => [x.x1, x.y1, x.x2, x.y2].join('.')).sort().join('~');
    const h = q.holes.map(x => x.x + '.' + x.y).sort().join('~');
    const d = q.dirs.map(x => x.join('.')).sort().join('~');
    return q.W + '/' + q.H + '#' + q.ball.x + '.' + q.ball.y + '#' + w + '#' + h + '#' + d;
  }
  function wrongIdxOf() {
    const q = BC.quiz;
    for (let i = 0; i < q.dirs.length; i++) if (i !== q.answer) return i;
    return -1;
  }

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, structAll = true, driveOk = true, rescueOk = true;
    const refWhys = [];
    const sigSeen = {};
    let sigRepeated = false;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    if (L1.quizzes.length !== CH_LEN) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const r = refQuizOk(L1.dch, q);
      if (!r.ok) { rangeAll = false; refWhys.push('q' + k + ':' + r.why.slice(0, 3).join('|')); }
      if (!structOk(q)) structAll = false;
      const sg = refSigOf(q);                     // 独立签名：同关互异
      if (sigSeen[sg]) sigRepeated = true;
      sigSeen[sg] = true;
    }
    if (sigRepeated) rangeAll = false;

    /* ①b 引擎直驱 */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (engTapDir(Ld, -1) !== null || engTapDir(Ld, 99) !== null) driveOk = false;   // 非法下标
      let wi = -1;
      for (let i = 0; i < q.dirs.length; i++) if (i !== q.answer) { wi = i; break; }
      if (engTapDir(Ld, wi) !== 'wrong') driveOk = false;             // 错方向（入别洞/出界/上限）
      if (q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;   // 错=miss 恰一次
      if (engTapDir(Ld, wi) !== 'wrong') driveOk = false;             // 再点再计（UI 防重入窗另测）
      if (q.miss !== 2 || Ld.retries !== base + 2) driveOk = false;
      const want = k === CH_LEN - 1 ? 'done' : 'right';
      if (engTapDir(Ld, q.answer) !== want) driveOk = false;          // 对方向=推进
      if (!q.solved || Ld.step !== k + 1) driveOk = false;
    }
    if (Ld.done !== true) driveOk = false;                           // 5 题全解=关完成
    /* 星级三档独立驱动 */
    const L1x = genLevel(flat);
    const qw = L1x.quizzes[0];
    let wSel = -1;
    for (let i = 0; i < qw.dirs.length; i++) if (i !== qw.answer) { wSel = i; break; }
    for (let g = 0; g < 3; g++) engTapDir(L1x, wSel);                // 首题连错 3 次
    let g2x = 0;
    while (!L1x.done && g2x++ < 40) engTapDir(L1x, L1x.quizzes[L1x.step].answer);
    const s1 = L1x.done && L1x.retries === 3 && engStars(L1x) === 1;
    const L2x = genLevel(flat);
    engTapDir(L2x, wSel);                                            // 仅首题错一次
    let g3 = 0;
    while (!L2x.done && g3++ < 40) engTapDir(L2x, L2x.quizzes[L2x.step].answer);
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L3 = genLevel(flat);
    let g4 = 0;
    while (!L3.done && g4++ < 40) engTapDir(L3, L3.quizzes[L3.step].answer);
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环：rescueTarget 步进点对方向 → 收敛解题 */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    engTapDir(Lr, wSel);                                             // 歧途态起步（miss=1）
    let chainOk = true, steps = 0;
    while (!qr.solved && steps++ < 40) {
      const t = rescueTarget(qr);
      if (!t || t.i !== qr.answer) { chainOk = false; break; }
      if (engTapDir(Lr, t.i) !== 'right') { chainOk = false; break; }
    }
    if (!qr.solved) chainOk = false;
    if (rescueTarget(qr) !== null) chainOk = false;                  // 已解题无救援目标
    rescueOk = chainOk;

    const ok = det && rangeAll && structAll && driveOk && rescueOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, structAll: structAll,
      driveOk: driveOk, rescueOk: rescueOk,
      stars: { many1: engStars(L1x), wrong1: engStars(L2x), clean: engStars(L3) },
      qs: L1.quizzes.map(q => q.W + 'x' + q.H + ' w' + q.walls.length + ' h' + q.holes.length +
        ' d' + q.dirs.length + ' b' + refSim(q.W, q.H, q.ball, q.dirs[q.answer], q.walls, q.holes).bends) };
    if (refWhys.length) rec.refWhys = refWhys;
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapDir 单元（flat0 真实 UI）：飞行态/轨迹导出对账/错 miss/对推进/非法下标 ---- */
  total++;
  startLevel(0);
  const q0 = BC.quiz;
  const iW = wrongIdxOf();
  const pW = BC.tapDir(iW);                        // 发射（未 await：飞行中）
  const flyState = BC.quiz && BC.quiz.phase === 'fly' && BC.currentLevel.locked === true;
  const rW = await pW;
  const tr = window.__bcTrace;
  const rrW = refSim(q0.W, q0.H, q0.ball, q0.dirs[iW], q0.walls, q0.holes);
  const traceOkW = !!tr && tr.dir[0] === q0.dirs[iW][0] && tr.dir[1] === q0.dirs[iW][1] &&
    tr.pts.length === rrW.pts.length && tr.bounces === rrW.bends &&
    tr.pts[0][0] === q0.ball.x && tr.pts[0][1] === q0.ball.y &&
    tr.pts[tr.pts.length - 1][0] === rrW.pts[rrW.pts.length - 1][0] &&
    tr.pts[tr.pts.length - 1][1] === rrW.pts[rrW.pts.length - 1][1] &&
    (rrW.end === 'hole' ? (tr.outcome === 'hole' && tr.holeIdx === rrW.hole) : tr.outcome !== 'hole');
  const wrongTapOk = rW === 'wrong' && flyState && traceOkW &&
    BC.quiz && BC.quiz.miss === 1 && BC.quiz.step === 0 && BC.quiz.phase === 'aim';
  const rR = await BC.tapDir(q0.answer);           // 对方向：推进
  const rightTapOk = rR === 'right' && BC.currentLevel.step === 1;
  const badIdx = (await BC.tapDir(99)) === false && (await BC.tapDir(-1)) === false;
  const tapOk = wrongTapOk && rightTapOk && badIdx;
  if (tapOk) npass++;
  units.tapDir = { ok: tapOk, wrongTapOk: wrongTapOk, traceOk: traceOkW, flyState: flyState,
    rightTapOk: rightTapOk, badIdx: badIdx, traceLen: tr ? tr.pts.length : 0, refLen: rrW.pts.length };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue, origSay2 = KIDS.voice.say;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  KIDS.voice.say = function (t) { wLog.push(['s', String(t)]); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  startLevel(0);                                   // flat0：每错必播
  let wA = wrongIdxOf();
  await BC.tapDir(wA);
  await BC.tapDir(wA);                             // 第二次错（await 序列=窗已过）
  const sayA = cnt('bc_wrong');                    // → 2
  startLevel(3);                                   // flat3：10s 节流
  lastWrongVoice = Date.now();                     /* 显式进入节流窗口内 */
  let wB = wrongIdxOf();
  await BC.tapDir(wB);
  const sayB = cnt('bc_wrong') - 2;                // 增量 → 0
  startLevel(3);                                   // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                              /* 隔离上一子用例时间戳 */
  const wqC = BC.quiz;
  const base3 = wqC.miss;
  let wC = wrongIdxOf();
  await BC.tapDir(wC);                             // miss=1 窗口外 → 播
  await BC.tapDir(wC);                             // miss=2 → force === 2 → 播
  const sayC = cnt('bc_wrong') - 2 - sayB;         // 增量 → 2
  const missOk = BC.quiz.miss === base3 + 2;
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2; KIDS.voice.say = origSay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && missOk;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, missOk: missOk };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错一次 → 1 错=2 星；首错无救援视觉） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, quizzesA = 0;
  const iA = wrongIdxOf();
  const rA = await BC.tapDir(iA);
  {
    /* 梯度脚手架（试玩 P1-2 定案）：错 1 次=仅首段虚线（rescue-line.show 应在）；
       正确卡 breathe 仍须 miss≥2 才出现（§0.7 首错不泄答案） */
    const segShown = !!fieldEl.querySelector('#rescue-line.show');
    const noCard = !answersEl.querySelector('.dcard.breathe');
    const lv = BC.currentLevel;
    wrongOk = rA === 'wrong' && segShown && noCard && lv.retries === 1 && lv.step === 0 && BC.quiz.miss === 1;
  }
  const resA = await BC.autoSolve();               // 含重做首题在内的 5 题全对
  quizzesA = resA.quizzes;
  await wait(900 * SPEED);
  const lvA = BC.currentLevel;
  const smokeOkA = smokeA && wrongOk && resA.done && resA.ok && quizzesA === CH_LEN &&
    lvA.done && lvA.won && lvA.retries === 1 && engStars(cur) === 2 &&
    !document.querySelector('.k-celebrate');      // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, quizzes: quizzesA, retries: lvA.retries,
    stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B：flat15（ch4：3 墙含 1 斜/3 洞/3 方向）全对通关 3 星 ---- */
  total++;
  startLevel(15);
  const q15 = cur.quizzes[0];
  const diag15 = q15.walls.filter(w => w.x1 !== w.x2 && w.y1 !== w.y2).length;
  const shapeOk = !!q15 && q15.walls.length === 3 && diag15 === 1 &&
    q15.holes.length === 3 && q15.dirs.length === 3;
  const resB = await BC.autoSolve();
  await wait(900 * SPEED);
  const lv15 = BC.currentLevel;
  const smokeOkB = shapeOk && resB.done && resB.ok && lv15.done && lv15.won &&
    lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, shapeOk: shapeOk, quizzes: resB.quizzes,
    stars: engStars(cur), holes: q15 ? q15.holes.length : 0, diag: diag15 };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  startLevel(0);
  const t0ms = Date.now();
  await tutorialWatch();                           // 看：watch clip → demo 弹一段→指卡→点对入洞 → 重发同关 → 帮
  const tutMs = Date.now() - t0ms;
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const fresh0 = genLevel(0).quizzes[0];
  const q0t = BC.quiz;
  const tutOk = pLog7.indexOf('bc_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    window.__bcDemoR === 'right' &&                                     /* §0.27 演示点对真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    BC.currentLevel && BC.currentLevel.flat === 0 &&                     /* 重发同关 */
    q0t && q0t.step === 0 && q0t.miss === 0 &&                           /* 新题面同题初态 */
    q0t.dirs.length === fresh0.dirs.length &&
    q0t.walls.length === fresh0.walls.length &&
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'bc_tut_turn' &&      /* 交接顺序链单通道 */
    tutMs < 16000;                                                      /* watch ≤16s（verify 提速下恒真，真实页由时序设计保证） */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('bc_tut_watch') >= 0,
    demoR: window.__bcDemoR, handoff: !!lastQ7, parts: lastQ7, tut: state.tut, tutMs: tutMs };

  /* ---- ⑤ 布局：双 viewport ×（flat0/5/10/15）+ SVG 整数格点坐标对齐
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱） ---- */
  function svgAlignOk() {                          // 墙线/洞 data 格点 ↔ viewBox 像素对齐 + 格点阵数
    const q = cur.quizzes[cur.step];
    if (!q) return false;
    let ok = fieldEl.querySelectorAll('line.wall').length === q.walls.length &&
      fieldEl.querySelectorAll('.hole').length === q.holes.length &&
      fieldEl.querySelectorAll('.dot').length === (q.W + 1) * (q.H + 1);
    q.walls.forEach(w => {
      const el = fieldEl.querySelector('line.wall[data-x1="' + w.x1 + '"][data-y1="' + w.y1 +
        '"][data-x2="' + w.x2 + '"][data-y2="' + w.y2 + '"]');
      if (!el) { ok = false; return; }
      if (Math.abs(Number(el.getAttribute('x1')) - (PAD + w.x1 * U)) > 0.01 ||
          Math.abs(Number(el.getAttribute('y2')) - (PAD + w.y2 * U)) > 0.01) ok = false;
    });
    q.holes.forEach(h => {
      const g = fieldEl.querySelector('.hole[data-x="' + h.x + '"][data-y="' + h.y + '"]');
      if (!g) { ok = false; return; }
      const m = /translate\(([\d.]+),\s*([\d.]+)\)/.exec(g.getAttribute('transform') || '');
      if (!m || Math.abs(Number(m[1]) - (PAD + h.x * U)) > 0.01 ||
          Math.abs(Number(m[2]) - (PAD + h.y * U)) > 0.01) ok = false;
    });
    return ok;
  }
  async function simLayout(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                               // 卡片入场动画 .38s+delay .14s（真实 ms，不吃 SPEED）
    const align = svgAlignOk();
    const cards = Array.prototype.slice.call(answersEl.querySelectorAll('.dcard'));
    const cardOk = cards.length > 0 &&
      cards.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    let btnOk = true;                              // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, cardOk: cardOk, btnOk: btnOk, align: align, ox: ox,
      pass: cardOk && btnOk && align && ox <= 0 };
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
  startLevel(0);                                   // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / 飞行反馈通道 ---- */
  total++;
  /* SPEC §3 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！小球弹弹弹' &&
    VOICE.turn.text === '你猜它进哪个洞' && VOICE.hint.text === '想想球会怎么弹' &&
    VOICE.right.text === '进洞啦，猜对了' && VOICE.wrong.text === '再想想弹的方向' &&
    VOICE.boing.text === '弹到墙上啦';
  /* 9 条 clips 注入对账（bc_ 6 + core 3，manifest games:['bounce']；无额外词 clip） */
  const BC_KEYS = ['bc_tut_watch', 'bc_tut_turn', 'bc_hint', 'bc_right', 'bc_wrong', 'bc_boing', 'bc_hole'];
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 10 && BC_KEYS.every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;   /* T46 阶段2+bc_hole=10 */
  /* 开场顺序链 + 飞行反馈通道（stub 记录） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push([String(key), text === undefined ? null : String(text)]); };
  KIDS.voice.say = function (t) { playLog.push(['#tts', String(t)]); };
  startLevel(0);                                   // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'bc_hint';   // 开场=[hint] 单通道
  const qNow = BC.quiz;
  await BC.tapDir(qNow.answer);                    // 飞行反馈：首弹 boing + 入洞 right
  const boingOk = playLog.some(p => p[0] === 'bc_boing') && playLog.some(p => p[0] === 'bc_right');
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const specOk = refVoice && clipOk && openChain && boingOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, clips: clipOk, nClips: nClips,
    openChain: openChain, boingOk: boingOk,
    missing: BC_KEYS.filter(k => !KIDS.voice.clips[k]) };

  const out = { game: 'bounce', total: total, pass: npass, layoutOk: layoutOk,
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
