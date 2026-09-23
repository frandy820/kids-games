/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章规则（dch1 竖轴4×4对称图案 / dch2 竖轴4×4不对称+原形干扰 / dch3 竖轴5×5多色双维 /
     dch4 轴竖横混合+规格4/5混合）/ structOk（dst=src 镜像坐标·候选互异·贴纸同源）/
     引擎直驱通关（每题贴正确卡 right→末题 done→0 错 3 星）
   ② 覆盖：对称 5 图案章 1 全用 / 不对称 5 图案 40 关全用 / 两轴均有 / 规格 4/5 均有
   ③ 镜像数学专项：逐题断言 dst（竖 col N-1-c / 横 row N-1-r）与 src 两侧分布
   ④ 点选单元：首错零惩罚不 pulse / 已灰 pointer-events:none + 再点 'again' / 二错 pulse 正确卡
   ⑤ sayW 节流：flat<3 每错必播 / flat≥3 10s 一条
   ⑥ 开场顺序链 stub：queue([mir_hint, mir_q_v|mir_q_h])（按轴）+ replay() 直通
   ⑦ 候选卡与引擎严格同源（DOM dataset.mid/mir==引擎 options，零手抄）
   ⑧ 教学/演出吞输入单元：demo+locked 门拦真实与钩子输入
   ⑨ 布局：双 viewport（模拟 1280×800 / 800×1180）× 四代表关：
     候选卡 ≥96、格按钮与图案 SVG ≥64、底栏按钮 ≥64、overflowX ≤0
   ⑩ UI 冒烟：flat0 首错零惩罚+通关（1 错=2 星）；flat15（章 4 横轴）autoSolve 3 星
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const midHist = {}, axisHist = {}, sizeHist = {};
  /* MIR.quiz 返回拷贝——按值判等（mid+color+mirrored 三字段全同=答案卡；
     dch3 颜色干扰与答案同 mid 同 mirrored 仅色不同，禁用两字段判等） */
  const isAns = (q, o) => o.mid === q.answer.mid && o.color === q.answer.color &&
    o.mirrored === q.answer.mirrored;
  const ansIdx = q => q.options.findIndex(o => isAns(q, o));
  const wrongIdx = q => q.options.findIndex(o => !isAns(q, o));

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let ruleOk = true, structAll = true, dchOk = true, driveOk = true, srcOk = true;
    if (L1.ch !== Math.floor(flat / CH_LEN) + 1 || L1.dch !== (L1.ch - 1) % 4 + 1) dchOk = false;
    const srcSeen = {};
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q, L1.dch)) structAll = false;
      midHist[q.mid] = (midHist[q.mid] || 0) + 1;
      srcSeen[q.src.r + '-' + q.src.c] = (srcSeen[q.src.r + '-' + q.src.c] || 0) + 1;
      const orig = q.options.filter(o => !o.mirrored);
      if (L1.dch === 1) {                                    // 章 1：竖轴 4×4 对称图案全原形
        if (L1.axis !== 'v' || L1.N !== 4) ruleOk = false;
        if (q.options.some(o => SYM_KEYS.indexOf(o.mid) < 0)) ruleOk = false;
        if (q.options.filter(o => o.mid !== q.mid).length !== 2) ruleOk = false;
      } else if (L1.dch === 2) {                             // 章 2：竖轴 4×4 [镜像,原形,异图案]
        if (L1.axis !== 'v' || L1.N !== 4) ruleOk = false;
        if (orig.length !== 1 || orig[0].mid !== q.mid || orig[0].color !== q.color) ruleOk = false;
        const third = q.options.filter(o => o !== q.answer && o.mirrored);
        if (third.length !== 1 || third[0].mid === q.mid) ruleOk = false;
      } else if (L1.dch === 3) {                             // 章 3：竖轴 5×5 形×色双维
        if (L1.axis !== 'v' || L1.N !== 5) ruleOk = false;
        if (orig.length !== 1 || orig[0].mid !== q.mid || orig[0].color !== q.color) ruleOk = false;
        const third = q.options.filter(o => o !== q.answer && o.mirrored);
        if (third.length !== 1 || third[0].mid !== q.mid || third[0].color === q.color) ruleOk = false;
      } else {                                               // 章 4：轴/规格混合（静态 lv 定/生成 rnd 定）
        if (L1.axis !== 'v' && L1.axis !== 'h') ruleOk = false;
        if (L1.N !== 4 && L1.N !== 5) ruleOk = false;
        if (flat < STATIC_LEVELS) {                          // 静态：lv 偶=横轴 lv 奇=竖轴 / lv<3=4 else 5
          if (L1.axis !== (L1.lv % 2 === 0 ? 'h' : 'v')) ruleOk = false;
          if (L1.N !== (L1.lv < 3 ? 4 : 5)) ruleOk = false;
        }
        if (orig.length !== 1 || orig[0].mid !== q.mid || orig[0].color !== q.color) ruleOk = false;
        const third = q.options.filter(o => o !== q.answer && o.mirrored);
        if (third.length !== 1 || third[0].mid === q.mid) ruleOk = false;
      }
    }
    axisHist[L1.axis] = (axisHist[L1.axis] || 0) + 1;
    sizeHist[L1.N] = (sizeHist[L1.N] || 0) + 1;
    if (Object.keys(srcSeen).length !== CH_LEN) srcOk = false;   // 5 源格互异
    /* 引擎直驱：每题贴正确卡（末题 done）→ 0 错 3 星 */
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      const r = engTap(L1, correctIdx(q));
      const want = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (r !== want) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && dchOk &&
      driveOk && solvedAll && srcOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, axis: L1.axis, N: L1.N, ok: ok, det: det, ruleOk: ruleOk,
      structAll: structAll, dchOk: dchOk, driveOk: driveOk, srcOk: srcOk, solvedAll: solvedAll,
      qs: L1.quizzes.map(q => q.axis + q.N + ':' + q.src.r + ',' + q.src.c + '→' +
        q.dst.r + ',' + q.dst.c + ' ' + q.mid + '(' + q.options.map(o =>
          o.mid + (o.mirrored ? '*' : '') + '/' + o.color.slice(1)).join('|') + ')') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 覆盖：图案库全用 / 两轴 / 两规格 ---- */
  total++;
  const coverOk = SYM_KEYS.every(m => midHist[m] >= 1) && ASYM_KEYS.every(m => midHist[m] >= 1) &&
    midHist[SYM_KEYS[0]] >= 1 && (axisHist.v || 0) >= 1 && (axisHist.h || 0) >= 1 &&
    (sizeHist[4] || 0) >= 1 && (sizeHist[5] || 0) >= 1;
  if (coverOk) npass++;
  units.cover = { ok: coverOk, mid: midHist, axis: axisHist, size: sizeHist };

  /* ---- ③ 镜像数学专项：dst=src 镜像位（竖 col N-1-c / 横 row N-1-r）+ 两侧分布 ---- */
  total++;
  let mathOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat), half = Math.floor(L.N / 2);
    for (const q of L.quizzes) {
      const wantR = q.axis === 'v' ? q.src.r : L.N - 1 - q.src.r;
      const wantC = q.axis === 'v' ? L.N - 1 - q.src.c : q.src.c;
      if (q.dst.r !== wantR || q.dst.c !== wantC) mathOk = false;   // dst 坐标=镜像数学
      if (q.axis === 'v' ? !(q.src.c < half && q.dst.c >= half)
                         : !(q.src.r < half && q.dst.r >= half)) mathOk = false;   // 源侧/镜像侧
    }
  }
  if (mathOk) npass++;
  units.mirrorMath = { ok: mathOk };

  /* ---- ④ 点选单元：首错零惩罚不 pulse / 灰卡 pointer-events:none + 'again' / 二错 pulse ---- */
  total++;
  startLevel(0);
  const q0 = MIR.quiz;
  const wIdx = wrongIdx(q0);
  const tIdx = ansIdx(q0);
  const noPulse1 = !(optEl(tIdx) && optEl(tIdx).classList.contains('pulse'));
  const r1 = await MIR.tapOption(wIdx);                      // 首错：灰掉零惩罚
  await wait(80);
  const greyEl = optEl(wIdx);
  const peNone = getComputedStyle(greyEl).pointerEvents === 'none';
  const missState = MIR.currentLevel.retries === 1 && MIR.currentLevel.step === 0;
  const r2 = await MIR.tapOption(wIdx);                      // 再点已灰卡：'again' 零惩罚
  const againOk = r2 === 'again' && MIR.currentLevel.retries === 1 && MIR.currentLevel.step === 0;
  const noPulse2 = !(optEl(tIdx) && optEl(tIdx).classList.contains('pulse'));   // 一错后仍不 pulse
  const r3 = await MIR.tapOption(tIdx);                      // 贴对：推进换题（仍在 flat0）
  await wait(200);                                           // 推进演出窗（SPEED 提速）
  const advOk = r3 === 'right' && MIR.currentLevel.step === 1 && MIR.quiz && MIR.quiz.step === 1;
  startLevel(5);                                             // dch2：3 张候选可二错
  const q5 = MIR.quiz;
  const wrongs5 = q5.options.map((o, i) => ({ o: o, i: i })).filter(x => !isAns(q5, x.o));
  const tp5 = ansIdx(q5);
  await MIR.tapOption(wrongs5[0].i);                         // 首错：不 pulse
  const noPulse3 = !(optEl(tp5) && optEl(tp5).classList.contains('pulse'));
  await MIR.tapOption(wrongs5[1].i);                         // 二错：正确卡 pulse 高亮
  const pulse2 = !!(optEl(tp5) && optEl(tp5).classList.contains('pulse'));
  const tapOk = noPulse1 && r1 === 'wrong' && peNone && missState && againOk && noPulse2 &&
    advOk && noPulse3 && pulse2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, wrong: r1, peNone: peNone, again: r2, pulse2: pulse2, advance: advOk };

  /* ---- ⑤ sayW 节流：flat<3 每错必播 / flat≥3 10s 一条 ---- */
  total++;
  let playLog = [];
  const origPlay = KIDS.voice.play;
  KIDS.voice.play = function (key) { playLog.push(key); };
  startLevel(0);                                             // flat0：每错必播
  const qw = MIR.quiz;
  const wi = wrongIdx(qw);
  playLog = [];
  await MIR.tapOption(wi);
  await MIR.tapOption(wi);                                   // 已灰卡=again 不播
  const sayA = playLog.filter(k => k === 'mir_wrong').length;    // flat0 一错 → 1 条
  lastWrongVoice = 0;                                        /* 隔离 ④ 单元错点的时间戳污染 */
  startLevel(3);                                             // flat3：10s 节流
  const qw3 = MIR.quiz;
  const wi3 = wrongIdx(qw3);
  playLog = [];
  const rw1 = await MIR.tapOption(wi3);
  startLevel(3);                                             // 重发同关（首卡未灰）
  const qw3b = MIR.quiz;
  const wi3b = wrongIdx(qw3b);                               // 重发后 dead 已清，首错卡可直接再点
  const rw2 = await MIR.tapOption(wi3b);
  const sayB = playLog.filter(k => k === 'mir_wrong').length;    // flat3 两错 → 1 条
  KIDS.voice.play = origPlay;
  const sayWOk = sayA === 1 && sayB === 1 && rw1 === 'wrong' && rw2 === 'wrong';
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Plays: sayB };

  /* ---- ⑥ 开场顺序链（按轴取竖/横题面 clip）+ replay() 直通 ---- */
  total++;
  const qLog = [];
  const origQueue = KIDS.voice.queue;
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  startLevel(2);                                             // dch1 竖轴
  const autoV = qLog.length === 1 && qLog[0][0] === 'mir_hint' && qLog[0][1] === 'mir_q_v';
  const rep1 = MIR.replay() === true;                        // 测试钩子：无视节流直通
  startLevel(15);                                            // dch4 lv0 横轴
  const autoH = qLog.length === 2 && qLog[1][0] === 'mir_hint' && qLog[1][1] === 'mir_q_h';
  KIDS.voice.queue = origQueue;
  KIDS.voice.play = origPlay;
  const chainOk = autoV && autoH && rep1;
  if (chainOk) npass++;
  units.chain = { ok: chainOk, logs: qLog };

  /* ---- ⑥b clips 注入对账（审查 M1：stub play 后缺 clip 无感，页面级兜底） ---- */
  total++;
  const MIR_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest',
    'mir_hint', 'mir_q_h', 'mir_q_v', 'mir_tut_turn', 'mir_tut_watch'];
  const mirClipOk = MIR_KEYS.every(k => !!KIDS.voice.clips[k]);
  if (mirClipOk) npass++;
  units.clips = { ok: mirClipOk, n: MIR_KEYS.length };

  /* ---- ⑦ 候选卡与引擎严格同源（DOM dataset==引擎 options，零手抄） ---- */
  total++;
  let domOk = true;
  for (const flat of [0, 10]) {
    startLevel(flat);
    for (let s = 0; s < 2; s++) {                            // 抽查每关前两题
      const q = MIR.quiz;
      if (!q) break;
      const cards = optsEl.querySelectorAll('.opt');
      if (cards.length !== q.options.length) domOk = false;
      cards.forEach((c, i) => {
        if (c.dataset.mid !== q.options[i].mid ||
            c.dataset.mir !== (q.options[i].mirrored ? '1' : '0')) domOk = false;
      });
      /* 目标格在板面 DOM 在场且坐标=引擎 dst（4×4 偶数 N 曾把镜像列误当轴跳过——回归断言） */
      const tCell = boardEl.querySelector('.cell.target');
      if (!tCell || tCell.dataset.k !== q.dst.r + '-' + q.dst.c) domOk = false;
      /* 源侧 5 贴纸 + 中轴镜线在场 */
      if (boardEl.querySelectorAll('.cell.src').length !== CH_LEN || !boardEl.querySelector('.mirror'))
        domOk = false;
      if (s === 0) await MIR.tapOption(ansIdx(q));          // 推进到第二题
      await wait(150);
    }
  }
  if (domOk) npass++;
  units.domText = { ok: domOk };

  /* ---- ⑧ 教学/演出吞输入单元：demo+locked 门拦真实与钩子输入 ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期（locked 吞输入）
  const swallow1 = (await MIR.tapOption(0)) === false;
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await MIR.tapOption(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && MIR.currentLevel.step === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑨ 布局：双 viewport 模拟 × 四代表关（v4/v5/h4/h5） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();
    const de = document.documentElement;
    const bad = [];
    document.querySelectorAll('button').forEach(e => {
      if (e.classList.contains('k-parentbtn')) return;       // core 家长按钮豁免（§0.9）
      const r = e.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
        bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const mainBad = [];
    document.querySelectorAll('.opt').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width < 96 || r.height < 96)
        mainBad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const svgs = Array.prototype.map.call(document.querySelectorAll('.opt svg, #board .cell svg'),
      s => { const r = s.getBoundingClientRect(); return { w: r.width, h: r.height }; });
    const svgOk = svgs.length > 0 && svgs.every(a => a.w >= 64 && a.h >= 64);   // 图案 SVG ≥64
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, bad: bad, mainBad: mainBad, svgOk: svgOk, ox: ox,
      pass: !bad.length && !mainBad.length && svgOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 10, 15, 19]) {                      // 四代表关：v4 / v5 / h4 / h5
    startLevel(flat);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                             // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑩ UI 冒烟 A：flat0 首错零惩罚 + 通关（1 错=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongDone = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = MIR.quiz;
    if (!q) { smokeA = false; break; }
    if (!wrongDone) {                                        // 首题先错一次：灰掉零惩罚不推进
      const r = await MIR.tapOption(wrongIdx(q));
      wrongDone = r === 'wrong' && MIR.currentLevel.step === 0 && MIR.currentLevel.retries === 1;
      if (!wrongDone) smokeA = false;
    }
    const q2 = MIR.quiz;
    const r = await MIR.tapOption(ansIdx(q2));
    if (r !== 'right' && r !== 'done') { smokeA = false; break; }
    await wait(150);
    steps++;
  }
  const lvA = MIR.currentLevel;
  const smokeOkA = smokeA && wrongDone && steps === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongDone: wrongDone, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 B：flat15（章 4 横轴）autoSolve UI 通路通关 3 星 ---- */
  total++;
  startLevel(15);
  const a15 = await MIR.autoSolve();
  const lv15 = MIR.currentLevel;
  const smokeOkB = cur.axis === 'h' && a15.done && lv15.done && lv15.won && lv15.retries === 0 &&
    engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, axis: cur.axis, taps: a15.taps, stars: engStars(cur) };

  const out = { game: 'mirror', total: total, pass: npass, layoutOk: layoutOk,
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
