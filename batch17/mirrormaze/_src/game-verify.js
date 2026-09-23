/* ================= ?verify=1 自检（仅 verify 分支加载执行；r14 轴向族版）
   断言全部从 SPEC-BATCH17 §6+§0.36 分源推导（禁从实现行为归纳）：
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     静态关难度章映射 / 六 kind 结构分源复算（verify 自带闭式代数 T 独立实现 refT，
     禁引引擎 reflV/reflH/applyKind：given(src) 逐格变换重算 targets 对账（含颜色+sx/sy））/
     公平性不变式（every given(src) 变换位=target 同色；axis 格自映不产 target）/
     dch1 v/h 源半域 / dch2 d1/d2 三角源侧+轴上干扰格 / dch3 pv/ph 周期棋盘格
     （双色相位一致+每 target 与源格相位互反=续延预测逐格全错+双向源带）/ dch4 vv
     平移量=轴参数差（闭式 x+(k2-k1)）+r180 源带 cols0-2 / left 无重复 / targets 与 given
     无重叠 / 同关 5 题独立签名互异 / structOk
   ①b 引擎直驱：非法坐标/非整数拒绝；点 given 格='wrong'；错点=miss 恰一次（再点再计）；
     点已点亮 target=null 不计；逐 target 点满=placed/right/done 推进；5 题全解=done
   ①c 救援目标闭环：rescueTarget 步进执行收敛到补齐（步数=全 targets 数）；已解题无目标
   ★ 星级三档独立驱动（0 错=3★/1-2 错=2★/≥3 错=1★）
   ② tapCell 单元（flat0 真实 UI）：错点=blink 闪同步+不点亮+miss=1；点对=lit+同色+已补
     进度+1；重点已点亮格=false 不计 miss；越界/非整数=false
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流+miss===2 force 豁免恰一次）+轴向分流
     （flat0 v=mm_wrong / flat5 d1/d2=mm_wrong2）
   ③ UI 冒烟 A：flat0 首题错点一次→全通路通关（1 错=2 星；补齐=对称轴 flash 同步在场；
     verify 页不弹层）
   ④ UI 冒烟 B：flat15（ch4：6×6 vv/r180 双镜复合）全对通关 3 星
   ⑤ 布局（竖屏三件套 M3）：双 viewport ×四 dch（flat0/5/10/15）：格数=W×H、格 ≥64
     （含 6×6 档）、portStyle 竖屏锚（格尺寸横/竖双档位）、轴向线段数按 kind（单线/双线/
     十字）、提示按钮 ≥96、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0
   ⑥ 分布与专项：VOICE 表 7 键文案独立字面量对账（SPEC 定稿）/ 10 条 clips（mm_ 7+core 3）
     clipOk / 开场顺序链（queue([mm_hint]) 单通道——flat0-q0 恒 v）/ 提示通道轴向分流
     （flat10 ch3 非轴=mm_hint2+tip 按轴切换）
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 看源格→点镜像位逐格补齐
     __mmDemoR==='right'（§0.27）→ 重发同关 → 交接链 queue([mm_tut_turn]) → tut='help'
   ⑪ duration（r14 门禁）：40 关 modeled 硬断言——独立副本常量重列（禁引源模型：
     V_DECIDE/V_STEP/V_QUIZ/V_ENTER/V_STAGE/V_MIN）≥40000+最低值 84075 精确（防回漂）
     +与源模型 levelDurMs 逐关对账+每步 DECIDE≥voiceWin+源常量同步
     （estMs 全字符口径/DECIDE_MS/ADV_STEP/ADV_QUIZ=3015/LEVEL_MIN_MS）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立真值（闭式代数 T——禁引引擎 reflV/reflH/applyKind，§6 三源分算） ---- */
  const REF_W = { v: 4, h: 4, d1: 5, d2: 5, pv: 6, ph: 6, vv: 6, r180: 6 };
  const REF_KINDS_OF_DCH = { 1: ['v', 'h'], 2: ['d1', 'd2'], 3: ['pv', 'ph'], 4: ['vv', 'r180'] };
  const REF_TGT = { v: [3, 4], h: [3, 4], d1: [4, 5], d2: [4, 5], pv: [6, 6], ph: [6, 6], vv: [4, 6], r180: [4, 6] };
  const REF_PALETTE = ['#E8975A', '#8FBF7F', '#C98B9B'];
  const REF_AXIS_N = { v: 1, h: 1, d1: 1, d2: 1, pv: 1, ph: 1, vv: 2, r180: 2 };   // 对称轴线段数
  /* 闭式代数变换（SPEC §6 真值表）：v(3-x,y)/h(x,3-y)/d1(y,x)/d2(4-y,4-x)/pv(5-x,y)/
     ph(x,5-y)/vv=x+(k2-k1) 平移（双平行镜复合恒等式）/r180(5-x,5-y)=转 180° */
  function refT(q, p) {
    switch (q.kind) {
      case 'v':    return { x: 3 - p.x, y: p.y };
      case 'h':    return { x: p.x, y: 3 - p.y };
      case 'd1':   return { x: p.y, y: p.x };
      case 'd2':   return { x: 4 - p.y, y: 4 - p.x };
      case 'pv':   return { x: 5 - p.x, y: p.y };
      case 'ph':   return { x: p.x, y: 5 - p.y };
      case 'vv':   return { x: p.x + (q.axis.k2 - q.axis.k1), y: p.y };
      case 'r180': return { x: 5 - p.x, y: 5 - p.y };
    }
    return null;
  }
  const keyOfCell = c => c.x + ',' + c.y;
  /* 独立签名（同关 5 题互异判据）：kind+轴参数+W/H+given 全格（含颜色）排序 */
  function refSigOf(q) {
    const ax = q.kind === 'vv' ? ':' + q.axis.k1 + ',' + q.axis.k2 : '';
    return q.kind + ax + ':' + q.W + 'x' + q.H + ':' +
      q.given.map(c => c.x + ',' + c.y + ',' + c.c).sort().join(';');
  }
  /* 答案签名（反启发式锚 delta⑤）：kind+轴参数+源侧（同模板跨签名答案变换互异——
     记住图案≠记住答案，必须读轴） */
  function ansSigOf(q) {
    const src = q.given.filter(c => c.role === 'src');
    const xs = src.map(c => c.x), ys = src.map(c => c.y);
    let side = '';
    if (q.kind === 'v') side = Math.max.apply(0, xs) <= 1 ? 'L' : 'R';
    if (q.kind === 'h') side = Math.max.apply(0, ys) <= 1 ? 'T' : 'B';
    if (q.kind === 'pv') side = Math.max.apply(0, xs) <= 1 ? 'A' : 'B';
    if (q.kind === 'ph') side = Math.max.apply(0, ys) <= 1 ? 'A' : 'B';
    if (q.kind === 'vv') side = (q.axis.k2 - q.axis.k1) > 0 ? 'L' : 'R';
    const ax = q.kind === 'vv' ? ':' + q.axis.k1 + ',' + q.axis.k2 : '';
    return q.kind + ax + ':' + side;
  }
  /* 单题结构分源复算（SPEC §6 全量判据） */
  function refQuizOk(dch, q) {
    const why = [];
    if (REF_KINDS_OF_DCH[dch].indexOf(q.kind) < 0) why.push('kind ' + q.kind + ' 不属 dch' + dch);
    if (q.W !== REF_W[q.kind] || q.H !== REF_W[q.kind]) why.push('盘面 ' + q.W + 'x' + q.H);
    const seen = {};
    let nSrc = 0, nAxis = 0;
    for (const c of q.given) {
      if (c.x < 0 || c.x >= q.W || c.y < 0 || c.y >= q.H) why.push('given 越界 ' + keyOfCell(c));
      if (REF_PALETTE.indexOf(c.c) < 0) why.push('色域 ' + keyOfCell(c));
      if (seen[keyOfCell(c)]) why.push('given 重复 ' + keyOfCell(c));
      seen[keyOfCell(c)] = true;
      if (c.role === 'src') nSrc++;
      else if (c.role === 'axis') nAxis++;
      else why.push('role 非法 ' + keyOfCell(c));
    }
    if (!nSrc) why.push('无 src 格');
    const tSeen = {};
    for (const t of q.targets) {
      if (t.x < 0 || t.x >= q.W || t.y < 0 || t.y >= q.H) why.push('target 越界 ' + keyOfCell(t));
      if (tSeen[keyOfCell(t)]) why.push('target 重复 ' + keyOfCell(t));
      tSeen[keyOfCell(t)] = true;
      if (seen[keyOfCell(t)]) why.push('target 与 given 重叠 ' + keyOfCell(t));
    }
    /* 公平性不变式：every given(src) 的闭式变换位=target 同色且 sx/sy=源格；axis 自映无 target */
    for (const c of q.given) {
      const T = refT(q, c);
      if (c.role === 'axis') {
        if (T.x !== c.x || T.y !== c.y) why.push('axis 非自映 ' + keyOfCell(c));
        if (q.targets.some(t => t.x === c.x && t.y === c.y)) why.push('axis 产 target ' + keyOfCell(c));
      } else {
        const hit = q.targets.filter(t => t.x === T.x && t.y === T.y);
        if (hit.length !== 1 || hit[0].c !== c.c || hit[0].sx !== c.x || hit[0].sy !== c.y)
          why.push('src 变换位≠同色 target ' + keyOfCell(c));
      }
    }
    if (nSrc !== q.targets.length) why.push('targets 数 ' + q.targets.length + '≠src ' + nSrc);
    const lo = REF_TGT[q.kind][0], hi = REF_TGT[q.kind][1];
    if (q.targets.length < lo || q.targets.length > hi)
      why.push('targets 数 ' + q.targets.length + ' 不在域 [' + lo + ',' + hi + ']');
    const src = q.given.filter(c => c.role === 'src');
    /* 章别源侧结构（SPEC §6 章结构） */
    if (dch === 1) {
      if (nAxis) why.push('ch1 含 axis 格');
      if (q.kind === 'v' && !src.every(c => c.x <= 1)) why.push('ch1-v 源非左半');
      if (q.kind === 'h' && !src.every(c => c.y <= 1)) why.push('ch1-h 源非上半');
    }
    if (dch === 2) {
      if (!nAxis || nAxis > 2) why.push('ch2 轴上干扰格数 ' + nAxis);
      if (q.kind === 'd1') {
        if (!src.every(c => c.y > c.x)) why.push('d1 源非 y>x 三角');
        if (!q.given.filter(c => c.role === 'axis').every(c => c.x === c.y)) why.push('d1 轴格非 x=y');
      } else {
        if (!src.every(c => c.x + c.y < 4)) why.push('d2 源非 x+y<4 三角');
        if (!q.given.filter(c => c.role === 'axis').every(c => c.x + c.y === 4)) why.push('d2 轴格非 x+y=4');
      }
    }
    if (dch === 3) {
      if (nAxis) why.push('ch3 含 axis 格');
      /* 周期棋盘格：双色相位一致（同相位恒同色、异相位恒异色）——独立于引擎 assign */
      const ph = { 0: null, 1: null };
      for (const c of src) {
        const p = (c.x + c.y) % 2;
        if (ph[p] === null) ph[p] = c.c;
        else if (ph[p] !== c.c) why.push('周期相位色不一致 ' + keyOfCell(c));
      }
      if (!ph[0] || !ph[1] || ph[0] === ph[1]) why.push('ch3 非双色棋盘格');
      /* 周期反相判别（delta④）：每 target 位置相位与源格相位互反——续延/照抄预测逐格全错 */
      for (const t of q.targets) {
        if (((t.x + t.y) % 2) === ((t.sx + t.sy) % 2)) why.push('周期同相（判别失效）' + keyOfCell(t));
      }
      /* 双向源带：pv A=cols0-1/B=cols4-5；ph A=rows0-1/B=rows4-5 */
      if (q.kind === 'pv') {
        const xs = src.map(c => c.x);
        const band = Math.max.apply(0, xs) <= 1 ? [0, 1] : [4, 5];
        if (!src.every(c => c.x >= band[0] && c.x <= band[1])) why.push('pv 源带非整 2 列');
      } else {
        const ys = src.map(c => c.y);
        const band = Math.max.apply(0, ys) <= 1 ? [0, 1] : [4, 5];
        if (!src.every(c => c.y >= band[0] && c.y <= band[1])) why.push('ph 源带非整 2 行');
      }
    }
    if (dch === 4) {
      if (nAxis) why.push('ch4 含 axis 格');
      if (q.kind === 'vv') {
        const d = q.axis.k2 - q.axis.k1;
        /* 平移对账：target.x-sx 恒=k2-k1（先照 k1 再照 k2 的方向真值）+源带=移出侧 2 列 */
        for (const t of q.targets) if (t.x - t.sx !== d) why.push('vv 平移量≠轴参数差 ' + keyOfCell(t));
        const x0 = d > 0 ? 0 : 4;
        if (!src.every(c => c.x >= x0 && c.x <= x0 + 1)) why.push('vv 源带非移出侧 2 列');
        if (Math.abs(d) !== 2 && Math.abs(d) !== 4) why.push('vv Δ=' + d + ' 非法');
      } else {
        if (!src.every(c => c.x <= 2)) why.push('r180 源带非 cols0-2');
        for (const t of q.targets) if (t.x !== 5 - t.sx || t.y !== 5 - t.sy) why.push('r180 非转半圈 ' + keyOfCell(t));
      }
    }
    return { ok: why.length === 0, why: why };
  }
  /* 找一个非 given 非 target 空 cell（错点用；各章恒存在） */
  function emptyCell(q) {
    const occ = {};
    q.given.forEach(c => { occ[keyOfCell(c)] = 1; });
    q.targets.forEach(t => { occ[keyOfCell(t)] = 1; });
    for (let y = 0; y < q.H; y++) for (let x = 0; x < q.W; x++)
      if (!occ[x + ',' + y]) return { x: x, y: y };
    return null;
  }

  /* ---- 反启发式锚（delta⑤）与 pv/ph 双向覆盖：40 关聚合 ---- */
  const tplSigs = {};
  const sideSeen = { pv: {}, ph: {} };
  let anchorN = 0;

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-39） ---- */
  const auditOf = flat => {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const rec = { dch: L1.dch, kinds: L1.quizzes.map(q => q.kind) };
    rec.det = JSON.stringify(L1) === JSON.stringify(L2);
    rec.range = L1.dch >= 1 && L1.dch <= 4 && L1.quizzes.length === CH_LEN &&
      (flat >= STATIC_LEVELS || L1.dch === diffOfCh(chOfFlat(flat)));   // 静态关=循环章
    rec.struct = true;
    rec.ref = true;
    const why = [];
    const sigSeen = {};
    let sigRepeated = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const r = refQuizOk(L1.dch, q);
      if (!r.ok) { rec.ref = false; why.push('q' + k + ':' + r.why.slice(0, 2).join('|')); }
      if (!structOk(q)) rec.struct = false;
      const sg = refSigOf(q);                        // 独立签名：同关互异
      if (sigSeen[sg]) sigRepeated = true;
      sigSeen[sg] = true;
      /* 聚合：模板×答案签名（反启发式锚）/pv·ph 双向覆盖 */
      if (q.tpl >= 0) {
        const as = ansSigOf(q);
        const key = q.kind + ':' + q.tpl;            // 模板同 id 跨 kind 复用（ch1/ch4 共库）
        tplSigs[key] = tplSigs[key] || {};
        tplSigs[key][as] = true;
      }
      if (q.kind === 'pv') sideSeen.pv[q.side] = true;
      if (q.kind === 'ph') sideSeen.ph[q.side] = true;
    }
    if (sigRepeated) rec.range = false;
    rec.why = why.slice(0, 3);
    /* ①b 引擎直驱：非法拒/given 格=wrong/错点 miss 恰一次（再点再计）/已点亮=null/推进通关 */
    const Ld = genLevel(flat);
    rec.drive = true;
    const q0 = Ld.quizzes[0];
    if (engTapCell(Ld, -1, 0) !== null || engTapCell(Ld, 0, 99) !== null ||
        engTapCell(Ld, 1.5, 0) !== null) rec.drive = false;
    const ec = emptyCell(q0);
    if (engTapCell(Ld, ec.x, ec.y) !== 'wrong' || q0.miss !== 1 || Ld.retries !== 1) rec.drive = false;
    if (engTapCell(Ld, ec.x, ec.y) !== 'wrong' || q0.miss !== 2) rec.drive = false;  // 再点再计
    const g0 = q0.given[0];
    if (engTapCell(Ld, g0.x, g0.y) !== 'wrong' || q0.miss !== 3 || Ld.retries !== 3) rec.drive = false;  // 点 given 格=wrong
    let relitOk = false;
    for (let k = 0; k < Ld.quizzes.length && rec.drive; k++) {
      const q = Ld.quizzes[k];
      for (let i = 0; i < q.targets.length; i++) {
        const isQuizLast = i === q.targets.length - 1;
        const isLevelLast = isQuizLast && k === Ld.quizzes.length - 1;
        const r = engTapCell(Ld, q.targets[i].x, q.targets[i].y);
        const want = isLevelLast ? 'done' : (isQuizLast ? 'right' : 'placed');
        if (r !== want) { rec.drive = false; break; }
        if (k === 0 && i === 0) {                   // 已点亮 target 再点=null 不计 miss
          relitOk = engTapCell(Ld, q.targets[0].x, q.targets[0].y) === null && q.miss === 3;
        }
      }
    }
    if (!Ld.done || Ld.step !== CH_LEN || Ld.retries !== 3 || !relitOk) rec.drive = false;
    /* ①c 救援闭环：rescueTarget 步进收敛（步数=全 targets 数；已解题无目标） */
    const Lr = genLevel(flat);
    let rSteps = 0, rescueOk = true, expectSteps = 0;
    for (const q of Lr.quizzes) expectSteps += q.targets.length;
    let guard = 0;
    while (!Lr.done && guard++ < 200) {
      const q = Lr.quizzes[Lr.step];
      if (!q) { rescueOk = false; break; }
      const t = rescueTarget(q);
      if (!t && !q.solved) { rescueOk = false; break; }
      if (t) {
        engTapCell(Lr, q.targets[t.i].x, q.targets[t.i].y);
        rSteps++;
      }
    }
    if (rescueTarget(Lr.quizzes[CH_LEN - 1]) !== null) rescueOk = false;   // 已解题无目标
    if (!Lr.done || rSteps !== expectSteps) rescueOk = false;
    rec.rescue = rescueOk;
    rec.ok = rec.det && rec.range && rec.struct && rec.ref && rec.drive && rec.rescue;
    return rec;
  };
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const rec = auditOf(flat);
    if (flat < STATIC_LEVELS) levels[flat] = rec; else gen[flat] = rec;
    if (rec.ok) npass++;
  }
  /* 聚合断言：反启发式锚（≥2 互异答案签名的模板 ≥5）+pv/ph 双向覆盖 */
  total++;
  for (const k2 of Object.keys(tplSigs)) {
    if (Object.keys(tplSigs[k2]).length >= 2) anchorN++;   /* r14 实测 anchor=6（verify_one M4 同口径 2026-09-15——SPEC §6 实测值回写） */
  }
  const coverOk = Object.keys(sideSeen.pv).sort().join(',') === 'A,B' &&
                  Object.keys(sideSeen.ph).sort().join(',') === 'A,B';
  const anchorOk = anchorN >= 5 && coverOk;
  if (anchorOk) npass++;
  units.anchor = { ok: anchorOk, templatesWithTwoSigs: anchorN, pvSides: Object.keys(sideSeen.pv),
    phSides: Object.keys(sideSeen.ph) };

  /* ---- ★ 星级三档独立驱动（flat7：0/1/3 错） ---- */
  total++;
  const L3 = genLevel(7);
  for (const q of L3.quizzes) for (const t of q.targets) engTapCell(L3, t.x, t.y);
  const s3 = engStars(L3) === 3;
  const L2 = genLevel(7);
  engTapCell(L2, emptyCell(L2.quizzes[0]).x, emptyCell(L2.quizzes[0]).y);       // 1 错
  for (const q of L2.quizzes) for (const t of q.targets) engTapCell(L2, t.x, t.y);
  const s2 = engStars(L2) === 2;
  const L1s = genLevel(7);
  const ec1 = emptyCell(L1s.quizzes[0]);
  engTapCell(L1s, ec1.x, ec1.y); engTapCell(L1s, ec1.x, ec1.y); engTapCell(L1s, ec1.x, ec1.y);   // 3 错
  for (const q of L1s.quizzes) for (const t of q.targets) engTapCell(L1s, t.x, t.y);
  const s1 = engStars(L1s) === 1;
  if (s3 && s2 && s1) npass++;
  units.stars = { ok: s3 && s2 && s1, s3: s3, s2: s2, s1: s1 };

  /* ---- ② tapCell 单元（flat0 真实 UI） ---- */
  total++;
  startLevel(0);
  await wait(60);
  const qT = cur.quizzes[0];
  const ecT = emptyCell(qT);
  const rW = await MM.tapCell(ecT.x, ecT.y);
  const wb = cellBtn(ecT.x, ecT.y);
  const wrongOk = rW === 'wrong' && wb.classList.contains('blink') && !wb.classList.contains('lit') &&
    MM.quiz.miss === 1;
  const t0 = qT.targets[0];
  const rP = await MM.tapCell(t0.x, t0.y);
  const rb = cellBtn(t0.x, t0.y);
  const placedOk = rP === 'placed' && rb.classList.contains('lit') && rb.dataset.c === t0.c &&
    MM.quiz.step === 1;
  const rN = await MM.tapCell(t0.x, t0.y);                       // 重点已点亮格
  const relitOk2 = rN === false && MM.quiz.miss === 1;
  const rO1 = await MM.tapCell(99, 0), rO2 = await MM.tapCell(1.5, 0);          // 越界/非整数
  const oobOk = rO1 === false && rO2 === false;
  const tapOk = wrongOk && placedOk && relitOk2 && oobOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, wrongOk: wrongOk, placedOk: placedOk, relit: relitOk2, oob: oobOk };

  /* ---- ②b sayW 三态 + 轴向分流（flat0 v=mm_wrong / flat5 d1·d2=mm_wrong2） ---- */
  total++;
  const origP = KIDS.voice.play;
  const pLogB = [];
  KIDS.voice.play = function (key, text) { pLogB.push(String(key)); };
  startLevel(0);
  await MM.tapCell(emptyCell(cur.quizzes[0]).x, emptyCell(cur.quizzes[0]).y);
  await MM.tapCell(emptyCell(cur.quizzes[0]).x, emptyCell(cur.quizzes[0]).y);   // flat<3：每错必播
  const n0 = pLogB.filter(k => k === 'mm_wrong').length;
  const k0 = pLogB[pLogB.length - 1];
  startLevel(5);                                                                 // flat5=ch2 斜轴
  const q5 = cur.quizzes[0];
  await MM.tapCell(emptyCell(q5).x, emptyCell(q5).y);                            // ①节流窗首播
  await MM.tapCell(emptyCell(q5).x, emptyCell(q5).y);                            // ②miss===2 force
  await MM.tapCell(emptyCell(q5).x, emptyCell(q5).y);                            // ③10s 窗内静默
  const n5 = pLogB.filter(k => k === 'mm_wrong2').length;
  const k5 = pLogB[pLogB.length - 1];
  KIDS.voice.play = origP;
  const sayWOk = n0 === 2 && k0 === 'mm_wrong' && n5 === 2 && k5 === 'mm_wrong2';
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, nFlat0: n0, keyFlat0: k0, nFlat5: n5, keyFlat5: k5 };

  /* ---- ③ UI 冒烟 A：flat0 错一次→全通路通关（2 星+对称轴 flash 同步在场） ---- */
  total++;
  startLevel(0);
  await MM.tapCell(emptyCell(cur.quizzes[0]).x, emptyCell(cur.quizzes[0]).y);    // 首题错点一次
  let axisFlashed = false, quizzesA = 0;
  while (cur && !cur.done && quizzesA < 30) {
    const q = cur.quizzes[cur.step];
    for (const t of q.targets) {
      const p = MM.tapCell(t.x, t.y);            // flash 在 await 前同步挂类——逐击即时抓取
      if (axisEl.classList.contains('flash')) axisFlashed = true;
      await p;
    }
    quizzesA++;
  }
  const lvA = MM.currentLevel;
  const smokeOkA = cur.done && quizzesA === CH_LEN && cur.retries === 1 &&
    engStars(cur) === 2 && lvA.won && axisFlashed;
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, axisFlashed: axisFlashed, quizzes: quizzesA,
    stars: engStars(cur), retries: cur.retries };

  /* ---- ④ UI 冒烟 B：flat15（ch4 双镜复合）全对通关 3 星 ---- */
  total++;
  startLevel(15);
  const q15 = cur.quizzes[0];
  const shapeOk = q15.W === 6 && (q15.kind === 'vv' || q15.kind === 'r180');
  const rB = await MM.autoSolve();
  const lv15 = MM.currentLevel;
  const smokeOkB = shapeOk && rB.ok && rB.done && rB.quizzes === CH_LEN &&
    lv15.done && lv15.won && cur.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, shapeOk: shapeOk, kind: q15.kind, quizzes: rB.quizzes,
    stars: engStars(cur), targets: q15.targets.length };

  /* ---- ⑤ 布局（竖屏三件套 M3）：双 viewport ×四 dch（flat0/5/10/15）
     量测用 offsetWidth（transform 无关：board-in 缩放动画不污染几何）；
     portStyle 判别锚=格尺寸横/竖双档位（g4 92/84、g5 82/72、g6 72/66）；
     轴向线段数按 kind（vv 双平行线/r180 十字） ---- */
  async function simView(w, h, port, flat) {
    const g = $id('game');
    document.body.classList.toggle('port', !!port);       // 竖屏类通道（与 @media 逐条等值——M3）
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    await wait(620);                            // 盘入场动画 .4s（真实 ms，不吃 SPEED）
    const cells = Array.prototype.slice.call(gridEl.querySelectorAll('.cell'));
    const q = cur.quizzes[cur.step];
    const cellOk = cells.length === q.W * q.H &&
      cells.every(b => b.offsetWidth >= 64 && b.offsetHeight >= 64);
    const cs = cells.length ? cells[0].offsetWidth : 0;
    const wantPort = { 4: 84, 5: 72, 6: 66 }[q.W];
    const wantLand = { 4: 92, 5: 82, 6: 72 }[q.W];
    const realPort = window.innerHeight > window.innerWidth;
    const portStyle = port ? (cs >= wantPort - 2 && cs <= wantPort + 2)
                           : (realPort || (cs >= wantLand - 2 && cs <= wantLand + 2));
    const axN = axisEl.querySelectorAll('.axl').length;
    const axisOk = axN === REF_AXIS_N[q.kind];          // 轴向线段数=kind 真值（1/1/2/2）
    const hb = hintBtnEl();
    const hintOk = !!hb && hb.getBoundingClientRect().width >= 96 && hb.getBoundingClientRect().height >= 96;
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');
    return { vp: w + 'x' + h + (port ? 'P' : ''), flat: flat, kind: q.kind, cells: cells.length,
      cs: cs, cellOk: cellOk, portStyle: portStyle, axisOk: axisOk, axisN: axN,
      hintOk: hintOk, btnOk: btnOk, ox: ox,
      pass: cellOk && portStyle && axisOk && hintOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simView(1280, 800, false, f));
    sims.push(await simView(800, 1180, true, f));
  }
  const gv = $id('game');
  gv.style.width = '';
  gv.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / 提示通道轴向分流 ---- */
  total++;
  /* SPEC §6 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！照镜子拼一拼' &&
    VOICE.turn.text === '你来拼一拼' &&
    VOICE.hint.text === '看看左边想一想' && VOICE.hint2.text === '看看镜子那一边' &&
    VOICE.right.text === '拼好啦，真对称' &&
    VOICE.wrong.text === '照照左边再看看' && VOICE.wrong2.text === '照照镜子再看看';
  /* 10 条 clips 注入对账（mm_ 7 + core 3，manifest games:['mirrormaze']；无额外词 clip） */
  const MM_KEYS = ['mm_tut_watch', 'mm_tut_turn', 'mm_hint', 'mm_hint2', 'mm_right', 'mm_wrong', 'mm_wrong2'];
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 10 && MM_KEYS.every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;
  /* 开场顺序链 + 提示通道轴向分流（stub 记录） */
  const origQ = KIDS.voice.queue, origP6 = KIDS.voice.play;
  const qLog = [], playLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  startLevel(0);                                // verify 页恒走开场链（flat0-q0 恒 v）
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'mm_hint';   // 开场=[hint] 单通道
  const tipV = (document.querySelector('#tip span') || {}).textContent || '';
  startLevel(10);                               // ch3 pv/ph：非 v 轴→hint2+tip 按轴
  const q10 = cur.quizzes[0];
  doHint();
  const hintR2 = playLog.indexOf('mm_hint2') >= 0;
  const tipPv = (document.querySelector('#tip span') || {}).textContent || '';
  const tipOk = tipV === '看看左边，拼右边' && tipPv === '先找镜子在哪边';
  KIDS.voice.queue = origQ; KIDS.voice.play = origP6;
  const specOk = refVoice && clipOk && openChain && hintR2 && tipOk && (q10.kind === 'pv' || q10.kind === 'ph');
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, clips: clipOk, nClips: nClips,
    openChain: openChain, hint2: hintR2, tipOk: tipOk, kind10: q10.kind,
    missing: MM_KEYS.filter(k => !KIDS.voice.clips[k]) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  startLevel(0);
  const t0ms = Date.now();
  await tutorialWatch();                          // 看：watch clip → demo 看源格→点镜像位 → 补齐 → 重发同关 → 帮
  const tutMs = Date.now() - t0ms;
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const fresh0 = genLevel(0).quizzes[0];
  const q0t = MM.quiz;
  const tutOk = pLog7.indexOf('mm_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    window.__mmDemoR === 'right' &&                                     /* §0.27 演示补齐真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    MM.currentLevel && MM.currentLevel.flat === 0 &&                     /* 重发同关 */
    q0t && q0t.step === 0 && q0t.miss === 0 &&                           /* 新题面同题初态 */
    q0t.targets.length === fresh0.targets.length &&
    q0t.given.length === fresh0.given.length &&
    q0t.kind === 'v' &&                                                  /* flat0-q0 恒 v（教学兼容） */
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'mm_tut_turn' &&      /* 交接顺序链单通道 */
    tutMs < 16000;                                                      /* watch ≤16s（verify 提速下恒真，真实页由时序设计保证） */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('mm_tut_watch') >= 0,
    demoR: window.__mmDemoR, handoff: !!lastQ7, parts: lastQ7, tut: state.tut, tutMs: tutMs };

  /* ---- ⑪ duration（r14 门禁）：40 关 modeled ≥40000+实测最低 93275 精确（flat0 定死：
     全 v 关 17 格=5×(4600×17/5 摊平)+5×3015——理论下限 84075（全 3 格 v 模板关）只是
     下界，防回漂锚用 40 关实测最低值）+逐关对账+语音窗不撑 ---- */
  /* 独立副本常量（禁引源模型；DECIDE_MS 六型=SPEC §6 认知推算定版） */
  const estMsV = s => s.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  const V_DECIDE = { v: 4000, h: 5500, d1: 7500, d2: 7500, pv: 8000, ph: 8000, vv: 10000, r180: 9500 };
  const V_STEP = 600, V_ENTER = 400, V_STAGE = 400, V_MIN = 40000;
  const V_QUIZ = estMsV('拼好啦，真对称');        // = 3015（7 字符含逗号——全字符口径）
  const vDur = L => L.quizzes.reduce((s, q) =>
    s + q.targets.reduce((a, _, k) =>
      a + Math.max(k === 0 ? V_ENTER : V_STAGE, V_DECIDE[q.kind]) + V_STEP, 0) + V_QUIZ, 0);
  let dMin = Infinity, dFlat = -1, parityOk = true, voiceOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;             // 独立副本与源模型逐关对账
    for (const q of L.quizzes) for (let k = 0; k < q.targets.length; k++)
      if (V_DECIDE[q.kind] < (k === 0 ? V_ENTER : V_STAGE)) voiceOk = false;   // 逐步：决策 ≥ 语音窗
  }
  /* 源常量同步断言（estMs 全字符口径/DECIDE_MS/ADV_STEP/ADV_QUIZ/LEVEL_MIN_MS——build.py 另做字面 assert） */
  const constOk = JSON.stringify(DECIDE_MS) === JSON.stringify(V_DECIDE) &&
    ADV_STEP === 600 && ADV_QUIZ === 3015 && estMs('拼好啦，真对称') === 3015 &&
    ENTER_MS === 400 && STAGE_MS === 400 && LEVEL_MIN_MS === 40000 &&
    typeof modeled === 'function' && modeled(0) === vDur(genLevel(0));
  const durUnitOk = dMin >= V_MIN && dMin === 93275 && dFlat === 0 && parityOk && voiceOk && constOk;
  total++;
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
    parity: parityOk, voiceNeverDominates: voiceOk, constOk: constOk,
    decide: V_DECIDE, quiz: V_QUIZ, step: V_STEP };

  const out = { game: 'mirrormaze', total: total, pass: npass, layoutOk: layoutOk,
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
