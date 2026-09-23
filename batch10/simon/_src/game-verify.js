/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     structOk（键号 0-3；序列长=章规格；禁三连同键；速度=章规格/生成档位）/
     引擎直驱（每题 engToInput 后照序敲：中间 right→末锤 done→0 错 3 星）
   ② len/speed 分布：200 题中 len∈{2,3,4} 各 ≥40；speed 500 ≥75、380 ≥25（提速章实measured）
   ③ 两态吞输入：watch 期 tapPad=false 且 pos/seq 不变；skipWatch() 快进 → phase='input'
   ④ 敲击单元：首错零惩罚（wig+miss=1+pos 清零+phase 切回 watch）/ 二错 miss=2 /
     敲对逐锤推进，整条敲对换题推进 / 错后重播为题内重试（step 不动，seq 不变）
   ⑤ sayW 节流：flat<3 每错必播 / flat≥3 10s 一条 / 同题 miss===2 force 豁免（不灰化款口径）
   ⑥ 开场顺序链：queue([si_hint]) 单次（play 不切断 queue，§0.12 口径）
   ⑥b clips 注入对账（stub play 后缺 clip 无感，页面级兜底）：si_* 4 条 + core_* 3 条
   ⑦ 钩子 getter 拷贝：外部改返回值不污染引擎
   ⑧ 教学/演出吞输入单元：demo+locked 门拦钩子输入
   ⑨ 布局：双 viewport（模拟 1280×800 / 800×1180）× 四章代表关：
     鼓面 4 面 ≥96（主答案按钮 §0.9）、底栏按钮 ≥64、overflowX ≤0
   ⑩ UI 冒烟：flat0 首错零惩罚+autoSolve 通关（1 错=2 星）；flat15（章 4 混合提速）autoSolve 全对 3 星
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const lenHist = {}, speedHist = {};
  /* 本地小工具：轮询等当前题回 input（错后自动重播在途，不猜时长） */
  async function untilInput(ms) {
    const t0 = Date.now();
    while (Date.now() - t0 < (ms || 4000)) {
      const q = SI.quiz;
      if (q && q.phase === 'input') return true;
      await wait(60);
    }
    return !!(SI.quiz && SI.quiz.phase === 'input');
  }

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
      lenHist[q.len] = (lenHist[q.len] || 0) + 1;
      speedHist[q.speed] = (speedHist[q.speed] || 0) + 1;
    }
    /* 引擎直驱：每题 engToInput → 照序敲 seq（中间锤 right，末锤 right/done）→ 0 错 3 星 */
    for (let qi = 0; qi < L1.quizzes.length && driveOk; qi++) {
      const q = L1.quizzes[qi];
      if (!engToInput(L1)) driveOk = false;
      for (let c = 0; c < q.seq.length && driveOk; c++) {
        const r = engTap(L1, q.seq[c]);
        const last = c === q.seq.length - 1;
        const want = last ? (qi === L1.quizzes.length - 1 ? 'done' : 'right') : 'right';
        if (r !== want) driveOk = false;
      }
      if (q.pos !== q.seq.length || !q.solved) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && structAll && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll,
      dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll,
      qs: L1.quizzes.map(q => 'L' + q.len + '@' + q.speed + '[' + q.seq.join(',') + ']') };
    if (!isGen) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 200 题 len/speed 分布（len 分布专项 + 章 4 提速实measured） ---- */
  total++;
  const distOk = (lenHist[2] || 0) >= 40 && (lenHist[3] || 0) >= 40 && (lenHist[4] || 0) >= 40 &&
                 (speedHist[500] || 0) >= 75 && (speedHist[380] || 0) >= 25;
  if (distOk) npass++;
  units.dist = { ok: distOk, len: lenHist, speed: speedHist };

  /* ---- ③ 两态吞输入：watch 期 tapPad=false；skipWatch 快进 ---- */
  total++;
  startLevel(0);                                // verify flat0：无开场链，quiz0 停留 watch（不排演示）
  let q0 = SI.quiz;
  const watchPhase = q0.phase === 'watch';
  const tapWatch = await SI.tapPad(q0.seq[0]);         // watch 期敲鼓：false 吞输入
  const posKeep = SI.quiz.pos === 0 && SI.quiz.phase === 'watch' && SI.quiz.seq.length === q0.seq.length;
  const skipOk = SI.skipWatch() === true && SI.quiz.phase === 'input';
  const skipAgain = SI.skipWatch() === false;         // 已 input：快进幂等拒绝
  const twoOk = watchPhase && tapWatch === false && posKeep && skipOk && skipAgain;
  if (twoOk) npass++;
  units.twophase = { ok: twoOk, watchPhase: watchPhase, tapWatch: tapWatch,
                     posKeep: posKeep, skipOk: skipOk };

  /* ---- ④ 敲击单元：首错零惩罚重播 / 二错 miss=2 / 敲对逐锤推进换题 ---- */
  total++;
  const qA = SI.quiz;                           // flat0 quiz0 已在 input 期
  const wrongA = [0, 1, 2, 3].find(i => i !== qA.seq[0]);
  const r1 = await SI.tapPad(wrongA);                  // 首错：wig+低音+sayW，序列从头重播
  const st1 = SI.quiz, lv1 = SI.currentLevel;
  const wigged = !!(padEl(wrongA) && padEl(wrongA).classList.contains('wig'));
  const wrongOk1 = r1 === 'wrong' && st1.miss === 1 && st1.pos === 0 &&
                   st1.phase === 'watch' && lv1.retries === 1 && lv1.step === 0 &&
                   st1.seq.join() === qA.seq.join();   // 题内重试：序列不变、不换题
  const inA = await untilInput();                      // 等自动重播完成回 input
  const r2 = await SI.tapPad(wrongA);                  // 二错（同鼓再敲也计，无上限）：miss=2 → sayW force
  const wrongOk2 = r2 === 'wrong' && SI.quiz.miss === 2 && SI.currentLevel.retries === 2;
  const inB = await untilInput();
  const rc1 = await SI.tapPad(SI.quiz.seq[0]);         // 敲对第 1 锤：亮鼓推进不换题
  const stepSame = SI.currentLevel.step === 0 && SI.quiz.pos === 1 && SI.quiz.phase === 'input';
  const rc2 = await SI.tapPad(SI.quiz.seq[1]);         // 末锤：整条敲对 → 换题推进
  await wait(300);                                     // 推进演出窗（SPEED 提速）
  const advOk = rc2 === 'right' && SI.currentLevel.step === 1 &&
                SI.quiz && SI.quiz.step === 1 && SI.quiz.miss === 0;
  const tapOk = wrongOk1 && wigged && wrongOk2 && inA && inB &&
                rc1 === 'right' && stepSame && advOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, wrong: r1, wrong2: r2, wigged: wigged, wrongOk1: wrongOk1,
                wrongOk2: wrongOk2, advance: advOk };

  /* ---- ⑤ sayW 节流：flat<3 每错必播 / flat≥3 10s 一条 / miss===2 force 豁免 ---- */
  total++;
  let playLog = [];
  const origPlay = KIDS.voice.play;
  KIDS.voice.play = function (key) { playLog.push(key); };
  startLevel(0);                               // flat0：每错必播
  SI.skipWatch();
  await SI.tapPad([0, 1, 2, 3].find(i => i !== SI.quiz.seq[0]));
  await untilInput();
  await SI.tapPad([0, 1, 2, 3].find(i => i !== SI.quiz.seq[0]));
  const sayA = playLog.filter(k => k === 'si_wrong').length;    // flat0 两错 → 2 条
  lastWrongVoice = 0;                          /* 隔离上一单元错点的时间戳污染 */
  startLevel(3);                               // flat3：10s 节流
  SI.skipWatch();
  playLog = [];
  await SI.tapPad([0, 1, 2, 3].find(i => i !== SI.quiz.seq[0]));   // miss=1：节流窗口首条 → 播
  startLevel(3);                               // 重发同关（fresh quiz miss=0）
  SI.skipWatch();
  await SI.tapPad([0, 1, 2, 3].find(i => i !== SI.quiz.seq[0]));   // 窗口内二条 → 节流不播
  const sayB = playLog.filter(k => k === 'si_wrong').length;    // → 1 条
  startLevel(3);                               // 同题 miss===2 force 豁免
  lastWrongVoice = 0;                          /* 隔离上一子用例的节流时间戳（force 子用例从新窗口起算） */
  SI.skipWatch();
  playLog = [];
  await SI.tapPad([0, 1, 2, 3].find(i => i !== SI.quiz.seq[0]));  // miss=1 → 播
  await untilInput();
  await SI.tapPad([0, 1, 2, 3].find(i => i !== SI.quiz.seq[0]));  // miss=2 → force → 播
  const sayC = playLog.filter(k => k === 'si_wrong').length;    // → 2 条
  KIDS.voice.play = origPlay;
  const sayWOk = sayA === 2 && sayB === 1 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ⑥ 开场顺序链：queue([si_hint]) 单次（不叠音不切断） ---- */
  total++;
  const qLog = [];
  const origQueue = KIDS.voice.queue;
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(key); };
  startLevel(5);                               // 非 flat0 verify 关：openingSpeak 排链
  const chainOk = qLog.length === 1 && qLog[0].length === 1 && qLog[0][0] === 'si_hint';
  const repOk = SI.replay() === true;          // 测试钩子：无视节流直通重播题面指令
  KIDS.voice.queue = origQueue;
  KIDS.voice.play = origPlay;
  if (chainOk && repOk) npass++;
  units.opening = { ok: chainOk && repOk, chain: qLog[0] || null, replay: repOk };

  /* ---- ⑥b clips 注入对账（审查 M1：stub play 后缺 clip 无感，页面级兜底） ---- */
  total++;
  const SI_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest',
    'si_hint', 'si_replay', 'si_tut_turn', 'si_tut_watch'];
  const siClipOk = SI_KEYS.every(k => !!KIDS.voice.clips[k]);
  if (siClipOk) npass++;
  units.clips = { ok: siClipOk, n: SI_KEYS.length };

  /* ---- ⑦ 钩子 getter 拷贝：外部改返回值不污染引擎 ---- */
  total++;
  const g1 = SI.quiz;
  const kLen = g1.seq.length;
  g1.seq.push(999); g1.pos = -5; g1.phase = 'hacked';
  const g2 = SI.quiz;
  const copyOk = g2.seq.length === kLen && g2.pos !== -5 && g2.phase !== 'hacked';
  const shapeOk = ['seq', 'len', 'phase', 'pos', 'speed', 'miss'].every(f => f in g2);
  if (copyOk && shapeOk) npass++;
  units.getter = { ok: copyOk && shapeOk, copyOk: copyOk, shapeOk: shapeOk };

  /* ---- ⑧ 教学/演出吞输入单元：demo+locked 门拦钩子输入 ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;      // 模拟教学"看"演示期（locked 吞输入）
  const swallow1 = (await SI.tapPad(0)) === false;
  state.demo = false; state.locked = true;     // 演出窗口（locked）
  const swallow2 = (await SI.tapPad(0)) === false;
  state.locked = false;                        // 还原
  const swallowOk = swallow1 && swallow2 && SI.currentLevel.step === 0 &&
                    SI.quiz.pos === 0 && SI.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑨ 布局：双 viewport 模拟 × 四章代表关（鼓面 ≥96 / 按钮 ≥64 / overflowX ≤0） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    layoutPads();
    const de = document.documentElement;
    const bad = [];
    document.querySelectorAll('button').forEach(e => {
      if (e.classList.contains('k-parentbtn')) return;       // core 家长按钮豁免（§0.9）
      const r = e.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
        bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const pads = Array.prototype.map.call(document.querySelectorAll('.pad'),
      c => { const r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; });
    const padOk = pads.length === 4 && pads.every(a => a.w >= 96 && a.h >= 96);   // 主答案按钮 ≥96（§0.9）
    const tipR = tipEl.getBoundingClientRect();
    const tipOk = tipR.width > 100 && tipR.height >= 40;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, bad: bad, padOk: padOk, minPad: pads.length ?
      Math.round(Math.min.apply(null, pads.map(a => Math.min(a.w, a.h)))) : 0,
      tipOk: tipOk, ox: ox, pass: !bad.length && padOk && tipOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10, 15]) {          // 四章代表关（定长三章 + 混合提速章）
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
  SI.skipWatch();
  const qw = SI.quiz;
  const wIdx = [0, 1, 2, 3].find(i => i !== qw.seq[0]);
  const rw = await SI.tapPad(wIdx);             // 首题先错一次：零惩罚不推进（重播重试）
  const wrongDone = rw === 'wrong' && SI.currentLevel.step === 0 && SI.currentLevel.retries === 1;
  const a0 = await SI.autoSolve();              // 重播后补完本题+后续 4 题（真实等演示→照序敲）
  const lvA = SI.currentLevel;
  const smokeOkA = wrongDone && a0.done && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && a0.taps === 10 &&   // flat0 全 len2：2×5 锤
    !document.querySelector('.k-celebrate');    // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongDone: wrongDone, taps: a0.taps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 B：flat15（章 4 混合提速）autoSolve 全对 3 星 ---- */
  total++;
  startLevel(15);
  const wantTaps = cur.quizzes.reduce((s, q) => s + q.len, 0);
  const a15 = await SI.autoSolve();
  const lv15 = SI.currentLevel;
  const smokeOkB = a15.done && lv15.done && lv15.won && lv15.retries === 0 &&
    engStars(cur) === 3 && a15.taps === wantTaps;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, taps: a15.taps, wantTaps: wantTaps, stars: engStars(cur) };

  const out = { game: 'simon', total: total, pass: npass, layoutOk: layoutOk,
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
  KIDS.voice.say = function () {};                 /* 审查 m1：§0.2 字面清单对齐（当前无调用，防未来漏拦） */
  runVerify();
}
