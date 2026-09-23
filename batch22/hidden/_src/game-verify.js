/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，各关独立计分）：确定性（同 flat 两次生成 JSON 一致）/
     章型结构（structWhy 全 null：N 区间/遮蔽 30-60 与章内子区间/双种各 ≥1/型1 必带干扰/
     型2 同系干扰+干扰遮蔽区间/countAsk 标志/位置互距 ≥256/初始态干净/
     型位表 dch1-3 恒型、dch4 子型∈{2,3} 混合 ≥2 型全题 flash——r20 SPEC-R20 §R2）/
     引擎直驱通关（tapScene 逐目标 found→full（countAsk）→engAnswer 答错 retry 不推进→
     答对 right/done + 场景空白 '?' 不计数不记错 + 完局后 null + miss 恒 0 + 3★）
   ② 遮蔽率元数据抽样（40 关全量）：全部 ∈[0.30,0.60]；dch1 ⊆[0.30,0.45]；dch2 ⊆[0.40,0.55]；
     dch3 ⊆[0.35,0.60]；全局出现 <0.40 与 >0.50（区间真实铺开非恒值）
   ③ 章型分布（r20 域）：flat0-4 型1+异种干扰（全可见）/ 5-9 型2+同系干扰+countAsk /
     10-14 型3 双种+countAsk / 15-19 型4 子型∈{2,3} 混合 ≥2 型+flash 全题 /
     20-39 难度章 (ch-1)%4+1 循环；主题 ≥3 种出现过
   ④ tapScene 命中语义（flat0 UI，型1 无作答）：空白 '?' 不计数 / 目标 found / 已找到 '?' /
     近偏点 '?' / 找全 right→新题 foundN 归零（miss 恒 0 全程）
   ⑤ 命中检测对账：每个热区按钮中心（offsetWidth/offsetLeft 量测）↔ 场景单位目标坐标 <12，
     且 engFoundIdx 同点命中同下标（UI/引擎同口径）
   ⑥ 吞输入单元：demo/locked 门拦 tapScene=false 且场容器 bump 类可见回应
   ⑦ 救援视觉直驱：方向级 .occ.rustle 沙沙 / 答案级 .halo 轮廓 breathe 出现→找到即撤
   ⑧ UI 冒烟：flat0 autoSolve 通关（恒 3★，verify 页不弹层）
   ⑨ 布局：双 viewport（1280×800 / 800×1180）×（章 2 / 章 4）：热区按钮 offset 尺寸 ≥64、
     计数条高 ≥64、field 宽高比=1000:620（无 letterbox）、overflowX ≤0
   ⑩ clips：必备键钉名全注入（m4：r20 三新键钉名入 need，≥37，SPEC-R20 §R6）
   ⑪ r20 计数作答全链（flat6 型2）：找全→ansOpen+作答条 5 钮→答错 retry 不推进不记 miss→
     ansOpen 态点目标 '?'→答对推进新题归零
   ⑫ r20 闪现单元（flat15 型4）：flash 期 tapScene=false 吞输入+bump+foundN 不动→
     flash 结束可点→找全+答数推进
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {};
  let npass = 0, total = 0;

  /* ---- ① 40 关全量审计（flat 0-39，逐关计分） ---- */
  const occAll = [], occByDch = { 1: [], 2: [], 3: [], 4: [] };
  const themeSeen = {};
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);          // 同 flat 同场景（确定性）
    let ruleOk = true;
    const pats = new Set();
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q, q.pattern, k) !== null) ruleOk = false;
      pats.add(q.pattern);
      themeSeen[q.theme] = 1;
      for (let i = 0; i < q.targets.length; i++) {
        occAll.push(q.targets[i].occlusion);
        occByDch[L1.dch].push(q.targets[i].occlusion);
      }
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    if (L1.dch >= 1 && L1.dch <= 3) {                               // 章 1-3 恒型
      if (!L1.quizzes.every(q => q.pattern === L1.dch)) ruleOk = false;
    } else {                                                        // r20 章4：子型∈{2,3} 混合 ≥2 型+全题 flash+countAsk
      if (!(pats.size >= 2 && L1.quizzes.every(q =>
        (q.pattern === 2 || q.pattern === 3) && q.flash === true && q.countAsk === true))) ruleOk = false;
    }
    if (L1.dch !== 4 && L1.quizzes.some(q => q.flash)) ruleOk = false;   // 闪现仅型4
    /* 引擎直驱：空白 '?' → 逐目标 found→full（countAsk）→engAnswer 答错 retry→答对推进
       → 完局 null + miss 0 + 3★（r20 SPEC-R20 §R3/R5） */
    let driveOk = true;
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      if (engTapScene(L1, 500, 60) !== '?') driveOk = false;        // 空白点=轻反馈不计数
      for (let i = 0; i < q.targets.length && driveOk; i++) {
        const last = i === q.targets.length - 1;
        const exp = last ? (q.countAsk ? 'full' : (k === L1.quizzes.length - 1 ? 'done' : 'right')) : 'found';
        if (engTapScene(L1, q.targets[i].x, q.targets[i].y) !== exp) driveOk = false;
      }
      if (driveOk && q.countAsk) {
        if (engAnswer(L1, q.n === 6 ? 2 : q.n + 1) !== 'retry') driveOk = false;   // 答错=不推进
        if (engTapScene(L1, q.targets[0].x, q.targets[0].y) !== '?') driveOk = false;  // ansOpen 态点目标=轻反馈
        const expA = k === L1.quizzes.length - 1 ? 'done' : 'right';
        if (engAnswer(L1, q.n) !== expA) driveOk = false;           // 答对=推进
      }
      if (!q.solved || q._found !== q.n) driveOk = false;
    }
    const edgeOk = L1.done && L1.step === CH_LEN &&
      engTapScene(L1, L1.quizzes[0].targets[0].x, L1.quizzes[0].targets[0].y) === null &&
      engFoundTarget(L1, 0) === null && engAnswer(L1, 3) === null &&  // 完局后引擎拒绝（含作答）
      L1.quizzes.every(q => q.targets.every(t => t.found)) &&
      (L1.missCnt || 0) === 0 && engStars(L1) === 3;
    const ok = det && ruleOk && driveOk && edgeOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk,
      driveOk: driveOk, edgeOk: edgeOk,
      pats: L1.quizzes.map(q => q.pattern), n: L1.quizzes.map(q => q.n) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 遮蔽率元数据（40 关全量抽样断言；r20 加 dch3 ⊆[0.35,0.60]） ---- */
  total++;
  const occOk = occAll.length > 300 &&
    occAll.every(v => v >= 0.30 - 1e-9 && v <= 0.60 + 1e-9) &&
    occByDch[1].length > 0 && occByDch[1].every(v => v >= 0.30 - 1e-9 && v <= 0.45 + 1e-9) &&
    occByDch[2].length > 0 && occByDch[2].every(v => v >= 0.40 - 1e-9 && v <= 0.55 + 1e-9) &&
    occByDch[3].length > 0 && occByDch[3].every(v => v >= 0.35 - 1e-9 && v <= 0.60 + 1e-9) &&
    occAll.some(v => v < 0.40) && occAll.some(v => v > 0.50);
  if (occOk) npass++;
  units.occ = { ok: occOk, n: occAll.length, min: Math.min.apply(null, occAll),
    max: Math.max.apply(null, occAll),
    dch1: [Math.min.apply(null, occByDch[1]), Math.max.apply(null, occByDch[1])],
    dch2: [Math.min.apply(null, occByDch[2]), Math.max.apply(null, occByDch[2])],
    dch3: [Math.min.apply(null, occByDch[3]), Math.max.apply(null, occByDch[3])] };

  /* ---- ③ 章型分布（静态 20 关区间 + 生成关循环；r20 域：型2 同系干扰+countAsk/
     型3 双种+countAsk/型4 子型{2,3}+flash 全题） ---- */
  total++;
  let distOk = true;
  const bandExpect = flat => (flat < 5 ? 1 : flat < 10 ? 2 : flat < 15 ? 3 : flat < 20 ? 4
    : (Math.floor(flat / 5) % 4) + 1);
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    if (L.dch !== bandExpect(flat)) distOk = false;
    if (L.dch === 4) continue;                     // dch4 子型叠加 flash 由①/mix15 专断（§R2）
    for (const q of L.quizzes) {
      if (q.pattern === 1 && !q.distractor) distOk = false;         // 型1 必带异种干扰（全可见）
      if (q.pattern === 1 && q.distractor.occlusion != null) distOk = false;
      if (q.pattern === 2) {                                        // r20 型2：同系干扰半遮蔽+countAsk
        if (!q.distractor || q.distractor.occlusion == null) distOk = false;
        else if (SIM[q.distractor.animal] !== q.kinds[0].a) distOk = false;
        else if (q.distractor.occlusion < 0.35 - 1e-9 || q.distractor.occlusion > 0.55 + 1e-9) distOk = false;
        if (!q.countAsk || q.flash) distOk = false;
      }
      if (q.pattern === 3) {                                        // r20 型3：双种+countAsk 无干扰
        if (q.kinds.length !== 2) distOk = false;
        if (q.distractor || !q.countAsk || q.flash) distOk = false;
      }
    }
  }
  const L15 = genLevel(15);
  const mix15 = new Set(L15.quizzes.map(q => q.pattern)).size >= 2 &&  // r20 章4 子型混合+全题 flash
    L15.quizzes.every(q => q.flash === true && q.countAsk === true);
  const themesOk = Object.keys(themeSeen).length >= 3;              // 主题多样性（四主题轮换）
  const distAll = distOk && mix15 && themesOk;
  if (distAll) npass++;
  units.dist = { ok: distAll, bandOk: distOk, mix15: mix15, themes: Object.keys(themeSeen) };

  /* ---- ④ tapScene 命中语义（flat0 真实 UI 状态机） ---- */
  total++;
  HD.start(0);
  const q0 = HD.quiz;
  const missPoint = t => {                        // 找一个离所有未找到目标都 >HIT_R 的近偏点
    for (let a = 0; a < 8; a++) {
      const ang = a * Math.PI / 4, px = t.x + Math.cos(ang) * (HIT_R + 12), py = t.y + Math.sin(ang) * (HIT_R + 12);
      if (px > 0 && px < SCENE_W && py > 0 && py < SCENE_H && engFoundIdx(cur, px, py) < 0) return [px, py];
    }
    return [30, 30];
  };
  const rBlank = await HD.tapScene(30, 30);
  const blankOk = rBlank === '?' && HD.quiz.foundN === 0 && HD.quiz.miss === 0;
  const t0 = q0.targets[0];
  const mp = missPoint(t0);
  const rNear = await HD.tapScene(mp[0], mp[1]);
  const nearOk = rNear === '?' && HD.quiz.foundN === 0;
  const rHit = await HD.tapScene(t0.x, t0.y);
  const hitOk = rHit === 'found' && HD.quiz.foundN === 1 &&
    HD.quiz.targets[0].found === true;
  const rAgain = await HD.tapScene(t0.x, t0.y);
  const againOk = rAgain === '?' && HD.quiz.foundN === 1;           // 已找到再点=「？」不重复计数
  let rLast = null;
  for (let i = 1; i < q0.targets.length; i++) rLast = await HD.tapScene(q0.targets[i].x, q0.targets[i].y);
  const fullOk = rLast === 'right' && HD.currentLevel.step === 1 &&
    HD.quiz && HD.quiz.foundN === 0 && HD.quiz.miss === 0;          // 找全推进，新题归零
  const tapOk = blankOk && nearOk && hitOk && againOk && fullOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, blank: blankOk, near: nearOk, hit: hitOk, again: againOk,
    full: fullOk, rHit: rHit, rNear: rNear };

  /* ---- ⑤ 命中检测对账：热区按钮视觉中心 ↔ 引擎目标（offset 量测，非 gBCR；
     .spot 用 translate(-50%,-50%) 居中 → 布局锚点即视觉中心） ---- */
  total++;
  HD.start(3);
  const q3 = HD.quiz;
  const fw = fieldEl.offsetWidth, fh = fieldEl.offsetHeight;
  const sw = spotsEl.offsetWidth, sh = spotsEl.offsetHeight;
  let alignOk = fw > 0 && Math.abs(sw / sh - SCENE_W / SCENE_H) < 0.03 && spotsEl.children.length === q3.targets.length;
  for (let i = 0; i < spotsEl.children.length && alignOk; i++) {
    const s = spotsEl.children[i];
    const cx = s.offsetLeft / sw * SCENE_W;
    const cy = s.offsetTop / sh * SCENE_H;
    if (Math.hypot(cx - q3.targets[i].x, cy - q3.targets[i].y) > 12) alignOk = false;
    if (engFoundIdx(cur, cx, cy) !== i) alignOk = false;            // 同点引擎命中同下标
  }
  if (alignOk) npass++;
  units.align = { ok: alignOk, fw: fw, fh: fh, sw: sw, sh: sh, n: spotsEl.children.length };

  /* ---- ⑥ 吞输入单元：demo/locked 门拦输入 + bump 可见回应 ---- */
  total++;
  HD.start(0);
  const qt = HD.quiz;
  state.demo = true; state.locked = true;                           // 模拟教学"看"演示期
  const p1 = HD.tapScene(qt.targets[0].x, qt.targets[0].y);
  const bump1 = fieldEl.classList.contains('bump');
  const sw1 = (await p1) === false && bump1 && HD.quiz.foundN === 0;
  fieldEl.classList.remove('bump');
  state.demo = false; state.locked = true;                          // 演出窗口（locked）
  const p2 = HD.tapScene(qt.targets[0].x, qt.targets[0].y);
  const bump2 = fieldEl.classList.contains('bump');
  const sw2 = (await p2) === false && bump2 && HD.quiz.foundN === 0;
  fieldEl.classList.remove('bump');
  state.locked = false;                                             // 还原
  const swallowOk = sw1 && sw2;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: sw1, locked: sw2 };

  /* ---- ⑦ 救援视觉直驱（无钟等待）：方向级 rustle / 答案级 halo ---- */
  total++;
  HD.start(10);
  const dirOk = HD._rescue.dir() === true &&
    !!$id('svgbox').querySelector('.occ.rustle');
  const ansOk = HD._rescue.ans() === true &&
    !!$id('fx').querySelector('.halo');
  const ht = HD.quiz.targets[Number($id('fx').querySelector('.halo').dataset.i)];
  await HD.tapScene(ht.x, ht.y);                                    // 找到该目标 → halo 即撤
  const haloGone = !$id('fx').querySelector('.halo');
  const rescueOk = dirOk && ansOk && haloGone;
  if (rescueOk) npass++;
  units.rescue = { ok: rescueOk, dir: dirOk, ans: ansOk, haloGone: haloGone };

  /* ---- ⑧ UI 冒烟：flat0 autoSolve 通关（恒 3★，verify 页不弹层） ---- */
  total++;
  HD.start(0);
  const wantTaps = cur.quizzes.reduce((s, q) => s + q.n, 0);
  const a0 = await HD.autoSolve();
  const lv0 = HD.currentLevel;
  const smokeOk = a0.done && a0.taps === wantTaps && lv0.done && lv0.won &&
    lv0.miss === 0 && engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeOk) npass++;
  units.smoke = { ok: smokeOk, taps: a0.taps, want: wantTaps, stars: engStars(cur) };

  /* ---- ⑨ 布局：双 viewport ×（章 2 / 章 4）offsetWidth/offsetHeight 量测 ---- */
  function simView(w, h, flat) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    fitField();
    const spots = Array.prototype.map.call(spotsEl.children, s => ({ w: s.offsetWidth, h: s.offsetHeight }));
    const hitOk = spots.length >= 2 && spots.every(s => s.w >= 64 && s.h >= 64);
    const cntOk = counterEl.offsetHeight >= 64;
    const fw2 = fieldEl.offsetWidth, fh2 = fieldEl.offsetHeight;
    const aspOk = fw2 > 0 && fh2 > 0 && Math.abs(fw2 / fh2 - SCENE_W / SCENE_H) < 0.03;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, hitOk: hitOk, cntOk: cntOk, aspOk: aspOk, ox: ox,
      n: spots.length, minW: spots.length ? Math.min.apply(null, spots.map(s => s.w)) : 0,
      pass: hitOk && cntOk && aspOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [6, 15]) {
    sims.push(simView(1280, 800, flat));
    sims.push(simView(800, 1180, flat));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                                    // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  units.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑩ clips：m4 钉名——r20 三新键钉名入 need，≥37（SPEC-R20 §R6；
     必备集从 SPEC §1 六动物域推导不从实现归纳） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['hid_tut_watch', 'hid_tut_turn', 'hid_hint', 'hid_right',
    'hid_cnt_q', 'hid_cnt_retry', 'hid_mem_watch'];
  const T46 = Object.keys(ANIMALS).reduce((a, aid) => a.concat(['hid_q_' + aid, 'hid_an_' + aid, 'hid_w_' + aid]), [])
    .concat(['hid_s_find', 'hid_s_he'])
    .concat(Array.from({ length: 6 }, (_, i) => 'hid_n_' + (i + 1)))
    .concat(['hid_ear']);
  const clipsOk = keys.length >= 37 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0) &&
    T46.every(k => !!KIDS.voice.clips[k] && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, t46: T46.length, keys: keys };

  /* ---- ⑪ r20 计数作答全链（flat6 型2 UI 真实判定链）：
     找全→ansOpen+作答条 5 钮（域 {2..6}）→答错 retry 不推进+ansMiss=1+miss 0→
     ansOpen 态点目标 '?'→答对推进新题归零 ---- */
  total++;
  HD.start(6);
  const qa = HD.quiz;
  for (let i = 0; i < qa.targets.length; i++) {
    await HD.tapScene(qa.targets[i].x, qa.targets[i].y);
  }
  const askOpen = HD.quiz && HD.quiz.ansOpen === true && HD.currentLevel.step === 0 &&
    counterEl.classList.contains('ask') && $id('ansbar').children.length === 5;
  const nums = Array.prototype.map.call($id('ansbar').children, b => Number(b.dataset.n));
  const domainOk = nums.join() === '2,3,4,5,6';
  const wrongN = qa.n === 6 ? 2 : qa.n + 1;
  const rRetry = await HD.answer(wrongN);
  const retryOk = rRetry === 'retry' && HD.quiz.ansOpen === true &&
    HD.quiz.ansMiss === 1 && HD.quiz.miss === 0 && HD.currentLevel.step === 0;
  const rHold = await HD.tapScene(qa.targets[0].x, qa.targets[0].y);
  const holdOk = rHold === '?' && HD.quiz.foundN === HD.quiz.n && HD.quiz.ansOpen === true;
  const rAns = await HD.answer(qa.n);
  const askAnsOk = rAns === 'right' && HD.currentLevel.step === 1 &&
    HD.quiz && HD.quiz.foundN === 0 && HD.quiz.ansOpen === false &&
    !counterEl.classList.contains('ask') && $id('ansbar').children.length === 0;
  const askAll = askOpen && domainOk && retryOk && holdOk && askAnsOk;
  if (askAll) npass++;
  units.ask = { ok: askAll, open: askOpen, domain: domainOk, retry: retryOk, hold: holdOk,
    ans: askAnsOk, n: qa.n, rRetry: rRetry, rHold: rHold, rAns: rAns };

  /* ---- ⑫ r20 闪现单元（flat15 型4）：flash 期 tapScene=false 吞输入+bump+foundN 不动→
     flash 结束可点→找全+答数推进 ---- */
  total++;
  HD.start(15);
  const fl0 = HD.quiz;
  const flashOn = HD.flashOn === true && fieldEl.classList.contains('flashing') &&
    getComputedStyle($id('eye')).display !== 'none';
  const rFl = await HD.tapScene(fl0.targets[0].x, fl0.targets[0].y);
  const swallowFl = rFl === false && fieldEl.classList.contains('bump') && HD.quiz.foundN === 0;
  fieldEl.classList.remove('bump');
  let waited = 0;
  while (HD.flashOn && waited < 5000) { await wait(60); waited += 60; }   // 等 flash 结束（verify 页 ≈0.29s）
  const flashOff = HD.flashOn === false && !fieldEl.classList.contains('flashing');
  const rFl2 = await HD.tapScene(fl0.targets[0].x, fl0.targets[0].y);
  const hitOk2 = rFl2 === 'found' && HD.quiz.foundN === 1;
  let fullDone = true;
  for (let i = 1; i < fl0.targets.length && fullDone; i++) {
    await HD.tapScene(fl0.targets[i].x, fl0.targets[i].y);
  }
  const opened = HD.quiz && HD.quiz.ansOpen === true;                    // 型4 子型均 countAsk
  const rFa = opened ? await HD.answer(fl0.n) : null;
  const advOk = opened && (rFa === 'right' || rFa === 'done') && !HD.quiz.ansOpen;
  const flashAll = flashOn && swallowFl && flashOff && hitOk2 && advOk;
  if (flashAll) npass++;
  units.flash = { ok: flashAll, on: flashOn, swallow: swallowFl, off: flashOff,
    hit: hitOk2, adv: advOk, waitMs: waited };

  const out = { game: 'hidden', total: total, pass: npass, units: units, levels: levels, gen: gen };
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
  runVerify();
}
