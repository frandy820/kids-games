/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     structOk（N∈{3,4}；cells 互异且 k=章规格；静态关 N/k/show=章规格，生成关 k∈档位）/
     引擎直驱（每题 engToInput 后逐格点 cells：中间 right→末格 done→0 错 3 星）
   ② k/N 分布：40 关 k∈{2,3,4} 各 ≥25 题、N∈{3,4} 各 ≥10 关（k 分布专项）
   ③ 两态吞输入：show 期 tapCell=false 且 picked 不变；skipShow() 快进 → phase='input'
   ④ 点选单元：首错零惩罚不 pulse / 同格重复点错不累计 miss / miss≥2 pulse 一枚未点中记忆格 /
     点对逐格亮起，k 格全亮换题推进
   ⑤ sayW 节流：flat<3 每个新错格必播 / flat≥3 10s 一条 / 同题 miss≥2 force 豁免
   ⑥ 开场顺序链：queue([mg_hint, mg_q]) 单次（play 不切断 queue，§0.12 口径）
   ⑦ 钩子 getter 拷贝：外部改返回值不污染引擎
   ⑧ 教学/演出吞输入单元：demo+locked 门拦钩子输入
   ⑨ 布局：双 viewport（模拟 1280×800 / 800×1180）× 四章代表关：
     网格格 ≥64（触摸目标）、按钮 ≥64、overflowX ≤0
   ⑩ UI 冒烟：flat0 首错零惩罚+autoSolve 通关（1 错=2 星）；flat15 autoSolve 全对 3 星
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const kHist = {}, nHist = {};

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const isGen = flat >= STATIC_LEVELS;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let structAll = true, dchOk = true, driveOk = true;
    if (L1.ch !== Math.floor(flat / CH_LEN) + 1 || L1.dch !== (L1.ch - 1) % 4 + 1) dchOk = false;
    for (const q of L1.quizzes) {
      if (!structOk(q, L1.dch, isGen)) structAll = false;
      kHist[q.k] = (kHist[q.k] || 0) + 1;
      nHist[q.N] = (nHist[q.N] || 0) + 1;
    }
    /* 引擎直驱：每题 engToInput → 逐格点 cells（中间格 right，末格 right/done）→ 0 错 3 星 */
    for (let qi = 0; qi < L1.quizzes.length && driveOk; qi++) {
      const q = L1.quizzes[qi];
      if (!engToInput(L1)) driveOk = false;
      for (let c = 0; c < q.cells.length && driveOk; c++) {
        const r = engTap(L1, q.cells[c]);
        const last = c === q.cells.length - 1;
        const want = last ? (qi === L1.quizzes.length - 1 ? 'done' : 'right') : 'right';
        if (r !== want) driveOk = false;
      }
      if (q.picked.length !== q.k || !q.solved) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && structAll && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll,
      dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll,
      qs: L1.quizzes.map(q => q.N + 'x' + q.N + 'k' + q.k + '[' + q.cells.join(',') + ']') };
    if (!isGen) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 40 关 k/N 分布（k 分布专项） ---- */
  total++;
  const distOk = (kHist[2] || 0) >= 25 && (kHist[3] || 0) >= 25 && (kHist[4] || 0) >= 25 &&
                 (nHist[3] || 0) >= 10 && (nHist[4] || 0) >= 10;
  if (distOk) npass++;
  units.dist = { ok: distOk, k: kHist, N: nHist };

  /* ---- ③ 两态吞输入：show 期 tapCell=false；skipShow 快进 ---- */
  total++;
  startLevel(0);                                // verify flat0：无开场链，quiz0 停留 show（不排闪现）
  let q0 = MEMG.quiz;
  const showPhase = q0.phase === 'show';
  const tapShow = await MEMG.tapCell(q0.cells[0]);     // show 期点格：false 吞输入
  const pickedEmpty = MEMG.quiz.picked.length === 0 && MEMG.quiz.phase === 'show';
  const skipOk = MEMG.skipShow() === true && MEMG.quiz.phase === 'input';
  const skipAgain = MEMG.skipShow() === false;         // 已 input：快进幂等拒绝
  const twoOk = showPhase && tapShow === false && pickedEmpty && skipOk && skipAgain;
  if (twoOk) npass++;
  units.twophase = { ok: twoOk, showPhase: showPhase, tapShow: tapShow,
                     pickedEmpty: pickedEmpty, skipOk: skipOk };

  /* ---- ④ 点选单元：首错不 pulse / 重复错格不累计 / miss≥2 pulse / 点对推进 ---- */
  total++;
  const qA = MEMG.quiz;                         // flat0 quiz0 已在 input 期
  const wrongA = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(i => qA.cells.indexOf(i) < 0);
  const noPulse1 = !(cellEl(qA.cells[0]) && cellEl(qA.cells[0]).classList.contains('pulse'));
  const r1 = await MEMG.tapCell(wrongA);               // 首错：晃动零惩罚不 pulse
  const miss1 = MEMG.quiz.miss === 1 && MEMG.currentLevel.retries === 1;
  const noPulse2 = !(cellEl(qA.cells[0]) && cellEl(qA.cells[0]).classList.contains('pulse'));
  const r2 = await MEMG.tapCell(wrongA);               // 同格重复点错：again 不累计
  const againOk = r2 === 'again' && MEMG.quiz.miss === 1 && MEMG.currentLevel.retries === 1;
  const wrongB = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(i => qA.cells.indexOf(i) < 0 && i !== wrongA);
  await MEMG.tapCell(wrongB);                          // 二错（异格）：miss=2 → pulse 支架
  const pulse2 = !!(cellEl(qA.cells[0]) && cellEl(qA.cells[0]).classList.contains('pulse'));
  const pickedKeep = MEMG.quiz.picked.length === 0;    // 点错不灭不锁，已点亮的仍在（此处未点对=0）
  const rc1 = await MEMG.tapCell(qA.cells[0]);         // 点对第 1 格：亮起不换题
  const stepSame = MEMG.currentLevel.step === 0 && MEMG.quiz.picked.length === 1;
  const rc2 = await MEMG.tapCell(qA.cells[1]);         // 第 k 格：题完成换题
  await wait(200);                                     // 推进演出窗（SPEED 提速）
  const advOk = rc2 === 'right' && MEMG.currentLevel.step === 1 && MEMG.quiz && MEMG.quiz.step === 1;
  const tapOk = noPulse1 && r1 === 'wrong' && miss1 && noPulse2 && againOk &&
                pulse2 && pickedKeep && rc1 === 'right' && stepSame && advOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, wrong: r1, again: r2, againOk: againOk, pulse2: pulse2,
                advance: advOk, missKeep: pickedKeep };

  /* ---- ⑤ sayW 节流：flat<3 新错格必播 / flat≥3 10s 一条 / miss≥2 force 豁免 ---- */
  total++;
  let playLog = [];
  const origPlay = KIDS.voice.play;
  KIDS.voice.play = function (key) { playLog.push(key); };
  const wrongsOf = q => { const out = []; for (let i = 0; i < q.N * q.N; i++) if (q.cells.indexOf(i) < 0) out.push(i); return out; };
  startLevel(0);                               // flat0：每个新错格必播（同格重复=again 不播）
  MEMG.skipShow();
  let q5 = MEMG.quiz;
  await MEMG.tapCell(wrongsOf(q5)[0]);
  await MEMG.tapCell(wrongsOf(q5)[1]);
  const sayA = playLog.filter(k => k === 'mg_wrong').length;    // flat0 两个异格错 → 2 条
  lastWrongVoice = 0;                          /* 隔离上一单元错点的时间戳污染 */
  startLevel(3);                               // flat3：10s 节流
  MEMG.skipShow();
  let q3 = MEMG.quiz;
  playLog = [];
  await MEMG.tapCell(wrongsOf(q3)[0]);         // miss=1：节流窗口首条 → 播
  startLevel(3);                               // 重发同关（fresh quiz miss=0）
  MEMG.skipShow();
  q3 = MEMG.quiz;
  await MEMG.tapCell(wrongsOf(q3)[0]);         // 窗口内二条 → 节流不播
  const sayB = playLog.filter(k => k === 'mg_wrong').length;    // → 1 条
  startLevel(3);                               // 同题 miss≥2 force 豁免
  lastWrongVoice = 0;                          /* 隔离上一子用例的节流时间戳（force 子用例从新窗口起算） */
  MEMG.skipShow();
  q3 = MEMG.quiz;
  playLog = [];
  await MEMG.tapCell(wrongsOf(q3)[0]);         // miss=1 → 播
  await MEMG.tapCell(wrongsOf(q3)[1]);         // miss=2 → force → 播
  const sayC = playLog.filter(k => k === 'mg_wrong').length;    // → 2 条
  KIDS.voice.play = origPlay;
  const sayWOk = sayA === 2 && sayB === 1 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ⑥ 开场顺序链：queue([mg_hint, mg_q]) 单次（不叠音不切断） ---- */
  total++;
  const qLog = [];
  const origQueue = KIDS.voice.queue;
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(key); };
  startLevel(5);                               // 非 flat0 verify 关：openingSpeak 排链
  const chainOk = qLog.length === 1 && qLog[0][0] === 'mg_hint' && qLog[0][1] === 'mg_q';
  const repOk = MEMG.replay() === true;        // 测试钩子：无视节流直通重播
  KIDS.voice.queue = origQueue;
  KIDS.voice.play = origPlay;
  if (chainOk && repOk) npass++;
  units.opening = { ok: chainOk && repOk, chain: qLog[0] || null, replay: repOk };

  /* ---- ⑥b clips 注入对账（审查 M1：stub play 后缺 clip 无感，页面级兜底） ---- */
  total++;
  const MG_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest',
    'mg_hint', 'mg_q', 'mg_tut_turn', 'mg_tut_watch'];
  const mgClipOk = MG_KEYS.every(k => !!KIDS.voice.clips[k]);
  if (mgClipOk) npass++;
  units.clips = { ok: mgClipOk, n: MG_KEYS.length };

  /* ---- ⑦ 钩子 getter 拷贝：外部改返回值不污染引擎 ---- */
  total++;
  const g1 = MEMG.quiz;
  const kLen = g1.cells.length;
  g1.cells.push(999); g1.picked.push(-1); g1.phase = 'hacked';
  const g2 = MEMG.quiz;
  const copyOk = g2.cells.length === kLen && g2.picked.length === 0 && g2.phase !== 'hacked';
  const shapeOk = ['N', 'k', 'cells', 'phase', 'picked', 'miss'].every(f => f in g2);
  if (copyOk && shapeOk) npass++;
  units.getter = { ok: copyOk && shapeOk, copyOk: copyOk, shapeOk: shapeOk };

  /* ---- ⑧ 教学/演出吞输入单元：demo+locked 门拦钩子输入 ---- */
  total++;
  startLevel(0);
  MEMG.skipShow();
  state.demo = true; state.locked = true;      // 模拟教学"看"演示期（locked 吞输入）
  const swallow1 = (await MEMG.tapCell(0)) === false;
  state.demo = false; state.locked = true;     // 演出窗口（locked）
  const swallow2 = (await MEMG.tapCell(0)) === false;
  state.locked = false;                        // 还原
  const swallowOk = swallow1 && swallow2 && MEMG.currentLevel.step === 0 &&
                    MEMG.quiz.picked.length === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑨ 布局：双 viewport 模拟 × 四章代表关（网格格 ≥64 / overflowX ≤0） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderGrid(); renderTip(); layoutGrid();
    const de = document.documentElement;
    const bad = [];
    document.querySelectorAll('button').forEach(e => {
      if (e.classList.contains('k-parentbtn')) return;       // core 家长按钮豁免（§0.9）
      const r = e.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
        bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const cells = Array.prototype.map.call(document.querySelectorAll('.cell'),
      c => { const r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; });
    const cellOk = cells.length >= 9 && cells.every(a => a.w >= 64 && a.h >= 64);
    const tipR = tipEl.getBoundingClientRect();
    const tipOk = tipR.width > 100 && tipR.height >= 40;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, bad: bad, cellOk: cellOk, minCell: cells.length ?
      Math.round(Math.min.apply(null, cells.map(a => Math.min(a.w, a.h)))) : 0,
      tipOk: tipOk, ox: ox, pass: !bad.length && cellOk && tipOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10, 15]) {          // 四章代表关（3×3 两章 + 4×4 两章）
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

  /* ---- ⑩ UI 冒烟 A：flat0 首错零惩罚 + autoSolve 通关（1 错=2 星） ---- */
  total++;
  startLevel(0);
  MEMG.skipShow();
  const qw = MEMG.quiz;
  const wIdx = [0, 1, 2, 3, 4, 5, 6, 7, 8].find(i => qw.cells.indexOf(i) < 0);
  const rw = await MEMG.tapCell(wIdx);          // 首题先错一次：零惩罚不推进
  const wrongDone = rw === 'wrong' && MEMG.currentLevel.step === 0 && MEMG.currentLevel.retries === 1;
  const a0 = await MEMG.autoSolve();            // 补完本题+后续 4 题（真实等闪现→逐格点）
  const lvA = MEMG.currentLevel;
  const smokeOkA = wrongDone && a0.done && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongDone: wrongDone, taps: a0.taps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 B：flat15（章 4 4×4 k=4）autoSolve 全对 3 星 ---- */
  total++;
  startLevel(15);
  const wantTaps = cur.quizzes.reduce((s, q) => s + q.k, 0);
  const a15 = await MEMG.autoSolve();
  const lv15 = MEMG.currentLevel;
  const smokeOkB = a15.done && lv15.done && lv15.won && lv15.retries === 0 &&
    engStars(cur) === 3 && a15.taps === wantTaps;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, taps: a15.taps, wantTaps: wantTaps, stars: engStars(cur) };

  const out = { game: 'memgrid', total: total, pass: npass, layoutOk: layoutOk,
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
  runVerify();
}
