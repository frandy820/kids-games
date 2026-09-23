/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   r7 新玩法全覆盖。SPEC 断言独立重列（禁引引擎常量互证；源码级文本断言在 build.py）：
   ① 40 关全量审计（flat 0-39）：确定性 / 每关 5 题 / 章模式序列（独立重列）/
     kind 池规则 / choose 切法三选项（正确=份数匹配等分 + unfair + wrongN）/ fair 双态 /
     structOk / 引擎直驱（cut 两段：engCut→'judge'→engPick；0 重试 3 星）
   ② 两半严格等大专项：六款 L/R 半块同源镜像 + clip 等宽 + 渲染盒等尺寸 +
     cut 场景 #half-l/#half-r 等尺寸 + 切后判定段（#judge-row 2 按钮 + 娃娃两半等大）
   ③ 等分构造专项：choose 答对演出 n 块 data-span 全等 =360/n；fair 展示 spans 与
     公平/不公平一致（公平=[180,180] / 不公平=[120,240]，独立重列）
   ④ 判定边界单元：engPick 错→again→对；cut 刀阶段 engPick null / engCut→'judge'/重按 0；
     判定错→wrong；星级 3/2/1
   ⑤ UI 冒烟 flat0（首错零惩罚+通关 2 星）+ flat15（dch4 五模式齐+autoSolve 3 星）
   ⑥ 布局：双 viewport × 五模式（pick/fair/choose/cut刀/cut判定段/match）主目标 ≥96、
     全部按钮 ≥64、overflowX ≤0
   ⑦ 分布：pick 3选1/choose/fair 答案索引多位置出现；choose 人数 2/3/4 都出现
   ⑧ 时序分账（modeled）：独立表 V_T+题面句重列，每关 ≥40000ms / 每题 ≥8000ms +
     estMs 家族数值断言（n*345+600，禁 +300 变体）
   ⑨ 家族 F 行为断言：静态章预告 + 生成关预告实算 GEN_HINTS[genLevel(f+1).dch-1]
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- 独立重列表（SPEC 文字，禁引引擎常量互证） ---- */
  const V_POOL = { 1: ['apple', 'orange', 'melon'], 2: ['apple', 'orange', 'melon'],
    3: ['apple', 'orange', 'melon', 'pizza'],
    4: ['apple', 'orange', 'melon', 'pizza', 'wedge', 'berry'] };
  const V_EQ = d => (d <= 2 ? ['apple', 'orange', 'melon'] : ['apple', 'orange', 'melon', 'pizza']);
  const V_CORRECT = { 2: 'halves', 3: 'thirds', 4: 'quarters' };   // n 人正确切法
  const V_WRONGN = { 2: 'quarters', 3: 'quarters', 4: 'thirds' };  // 份数不对干扰
  const V_SEQ = { 1: ['pick', 'cut', 'choose', 'cut', 'pick'],
    2: ['fair', 'cut', 'fair', 'choose', 'fair'],
    3: ['choose', 'fair', 'choose', 'cut', 'choose'] };
  const V_SPAN_FAIR = [180, 180], V_SPAN_UNFAIR = [120, 240];
  const V_CH = ['-', '一', '两', '三', '四'];
  const V_NAME = { apple: '苹果', orange: '橙子', melon: '西瓜', pizza: '披萨', wedge: '西瓜', berry: '草莓' };
  const V_T = { pick: { act: 3000, fb: 880 }, choose: { act: 3500, fb: 2800 },
    fair: { act: 2800, fb: 2600 }, cut: { act: 3800, fb: 3600 }, match: { act: 3000, fb: 880 } };
  const V_EST = n => n * 345 + 600;                               // estMs 家族独立复算
  const vSpeech = q => q.mode === 'choose' ? V_CH[q.parts] + '个人分，选一样大的切法' :
    q.mode === 'cut' ? '点一点小刀，把' + V_NAME[q.kind] + '切成两半' :
    q.mode === 'fair' ? '看一看，这样分公平吗？' :
    q.mode === 'match' ? '找一找，另一半在哪里？' : '看一看，哪一个是它的一半？';
  const V_GEN = ['公平切水果，再来一轮', '几个人分，切几块', '切一切，拼一拼', '认一半，拼一拼'];
  const V_CHAPTER_HINT = { 1: '接下来，看看怎样分才公平', 2: '还要切成三块四块，人人一样多',
    3: '切一切，拼一拼，大挑战来啦', 4: '新一轮分水果挑战' };

  /* ---- ① 40 关全量审计 ---- */
  const pickDist = [0, 0, 0], choDist = [0, 0, 0], fairDist = [0, 0];
  const partsDist = { 2: 0, 3: 0, 4: 0 };
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let ruleOk = true, structAll = true, kindOk = true;
    const modes = {};
    const fairVals = [], parts3 = [];
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q, L1.dch)) structAll = false;
      modes[q.mode] = (modes[q.mode] || 0) + 1;
      const seq = V_SEQ[L1.dch] || null;
      if (seq && q.mode !== seq[k]) ruleOk = false;                    // dch1-3 模式序列（独立重列）
      if (L1.dch === 4) {                                              // dch4：五模式各恰一次
        Object.keys(modes).forEach(m => { if (modes[m] > 1) ruleOk = false; });
      }
      /* kind 池：pick/match→V_POOL[dch]；choose/fair/cut→V_EQ(dch) */
      const eq = q.mode === 'choose' || q.mode === 'fair' || q.mode === 'cut';
      const pool = eq ? V_EQ(L1.dch) : V_POOL[L1.dch];
      const used = [q.kind].concat((q.options || []).map(o => o.kind).filter(kk => kk));
      if (!used.every(kk => pool.indexOf(kk) >= 0)) kindOk = false;
      /* 模式专项（独立重列规则） */
      if (q.mode === 'pick') {
        if (L1.dch === 1 && q.nOpt !== (k === 0 ? 2 : 3)) ruleOk = false;   // dch1：首题 2 选 1
        if (q.nOpt === 3) pickDist[q.answerIdx]++;
        const hasUneven = q.options.some(o => o.state === 'uneven');
        if (q.nOpt === 3 && !hasUneven) ruleOk = false;                     // 3 选 1 必含一大一小陷阱
      }
      if (q.mode === 'choose') {
        const cuts = q.options.map(o => o.cut);
        if (q.options[q.answerIdx].cut !== V_CORRECT[q.parts]) ruleOk = false;  // 答案=份数匹配等分
        if (cuts.indexOf('unfair') < 0 || cuts.indexOf(V_WRONGN[q.parts]) < 0) ruleOk = false;
        if ([2, 3, 4].indexOf(q.parts) < 0) ruleOk = false;
        if (L1.dch === 1 && q.parts !== 2) ruleOk = false;                  // ch1 对半=2 人
        if (L1.dch === 2 && q.parts !== 2) ruleOk = false;
        if (L1.dch === 3) parts3.push(q.parts);
        partsDist[q.parts]++; choDist[q.answerIdx]++;
      }
      if (q.mode === 'fair') {
        fairVals.push(q.fairIsFair);
        fairDist[q.answerIdx]++;
        const want = q.fairIsFair ? V_SPAN_FAIR : V_SPAN_UNFAIR;            // 展示与判定一致
        if (q.spans[0] !== want[0] || q.spans[1] !== want[1]) ruleOk = false;
        if (q.options[q.answerIdx].fair !== q.fairIsFair) ruleOk = false;   // 答案=与展示一致
      }
      if (q.mode === 'cut' && q.judgeOpts[q.answerIdx].fair !== true) ruleOk = false;  // 两半等大恒公平
      if (q.mode === 'match') {
        if (q.options.some((o, i2) => i2 !== q.answerIdx && o.kind === q.kind)) ruleOk = false;
      }
    }
    /* fair 双态：dch2 的 3 道 fair 两种都出现；dch3 choose 人数 3、4 都出现 */
    if (L1.dch === 2 && !(fairVals.indexOf(true) >= 0 && fairVals.indexOf(false) >= 0)) ruleOk = false;
    if (L1.dch === 3 && !(parts3.indexOf(3) >= 0 && parts3.indexOf(4) >= 0)) ruleOk = false;
    if (L1.dch === 4 && (!modes.pick || !modes.cut || !modes.choose || !modes.fair || !modes.match)) ruleOk = false;
    /* 引擎直驱：cut 两段（engCut→'judge'→engPick 判定），其余 engPick(answer) */
    let driveOk = true;
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      let r;
      if (q.mode === 'cut') {
        const r1 = engCut(L1);
        const r2 = engCut(L1);                       // 重按早退 0
        r = engPick(L1, q.answerIdx);
        if (r1 !== 'judge' || r2 !== 0) driveOk = false;
      } else r = engPick(L1, q.answerIdx);
      const want = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (r !== want || !q.solved) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    /* 时序分账（⑧ 同表）：每关 modeled ≥40000 */
    let ms = 0, qmin = Infinity;
    let speechOk = true;                          // r7 审查 m-1：题句副本 vs 引擎 qSpeech 逐字符对账
    L1.quizzes.forEach(q => {
      if (vSpeech(q) !== qSpeech(q)) speechOk = false;
      const t = V_EST(vSpeech(q).length) + V_T[q.mode].act + V_T[q.mode].fb;
      ms += t; if (t < qmin) qmin = t;
    });
    const durOk = ms >= 40000 && qmin >= 8000 && speechOk;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && kindOk && driveOk && solvedAll && durOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, structAll: structAll,
      kindOk: kindOk, driveOk: driveOk, solvedAll: solvedAll, durOk: durOk, ms: ms,
      qs: L1.quizzes.map(q => q.mode[0] + (q.mode === 'choose' ? q.parts : '') + ':' + q.kind) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 两半严格等大专项 ---- */
  total++;
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:-9999px;top:0';
  document.body.appendChild(box);
  let halvesOk = true;
  const halfDetail = {};
  KINDS_ALL.forEach(kd => {
    box.innerHTML = halfFruitSvg(kd, 'L', 'va') + halfFruitSvg(kd, 'R', 'vb');
    const svgs = box.querySelectorAll('svg');
    const gl = svgs[0].querySelector('g[data-art]'), gr = svgs[1].querySelector('g[data-art]');
    const rl = svgs[0].querySelector('clipPath rect'), rr = svgs[1].querySelector('clipPath rect');
    const sameArt = gl.innerHTML === gr.innerHTML;                       // 同一 art 字符串=镜像对称源
    const mirrorTr = gr.getAttribute('transform') === 'translate(100 0) scale(-1 1)' &&
      gl.getAttribute('transform') === null;                             // R 侧镜像、L 侧原样
    const clipEq = rl.width.baseVal.value === rr.width.baseVal.value;    // clip 等宽（等大面积）
    const r0 = svgs[0].getBoundingClientRect(), r1 = svgs[1].getBoundingClientRect();
    const sizeEq = Math.abs(r0.width - r1.width) < 0.5 && Math.abs(r0.height - r1.height) < 0.5;
    halfDetail[kd] = { sameArt: sameArt, mirrorTr: mirrorTr, clipEq: clipEq, sizeEq: sizeEq };
    if (!(sameArt && mirrorTr && clipEq && sizeEq)) halvesOk = false;
  });
  box.remove();
  /* cut 场景：刀阶段两半等尺寸 → 切后判定段（#judge-row 2 按钮 + 两娃娃各拿一半等大） */
  startLevel(1);                                  // dch1：quiz1 恒为切分
  await FRU.tapOption(cur.quizzes[0].answerIdx);  // 首题（pick 2 选 1）推进到切分
  const qC = cur.quizzes[1];
  const hlR = $id('half-l').getBoundingClientRect(), hrR = $id('half-r').getBoundingClientRect();
  const sceneEq = qC && qC.mode === 'cut' && !qC.cutDone &&
    Math.abs(hlR.width - hrR.width) < 0.5 && Math.abs(hlR.height - hrR.height) < 0.5;
  /* 切后判定段：doCut 返回时判定段 DOM 已就位且未推进（本题停驻）——直接量取 */
  const cutRet = await FRU.doCut();
  const jr = $id('judge-row');
  const js = jr ? { row: true, n: jr.querySelectorAll('.card').length,
    btns: Array.prototype.map.call(jr.querySelectorAll('.card'), b => b.getBoundingClientRect()),
    ph: Array.prototype.map.call(document.querySelectorAll('#cut-result .phalf'), p => p.getBoundingClientRect()) }
    : { row: false, n: 0, btns: [], ph: [] };
  const dollsEq = js.ph.length === 2 &&
    Math.abs(js.ph[0].width - js.ph[1].width) < 0.5 && Math.abs(js.ph[0].height - js.ph[1].height) < 0.5;
  const judgeOk = cutRet === 'judge' && js.row && js.n === 2 &&
    js.btns.every(b => b.width >= 64 && b.height >= 64) && dollsEq && qC.cutDone === true && qC.judging === true;
  const halvesAll = halvesOk && sceneEq && judgeOk;
  if (halvesAll) npass++;
  units.halves = { ok: halvesAll, kinds: halfDetail, sceneEq: sceneEq,
    judge: { row: js.row, n: js.n, btnMin: js.btns.length ? Math.round(Math.min(...js.btns.map(b => Math.min(b.width, b.height)))) : 0,
      dollsEq: dollsEq, cutDone: qC.cutDone, judging: qC.judging } };

  /* ---- ③ 等分构造专项：choose 演出 n 块 span 全等=360/n；fair 展示 spans 对账 ---- */
  total++;
  startLevel(10);                                // dch3 quiz0 恒为 choose(3 人)
  const qCh = cur.quizzes[0];
  /* 演出节点在推进渲染前被替换——包一层 renderQuiz，替换前快照分块 DOM */
  const origR3 = renderQuiz;
  let chopSnap = null;
  renderQuiz = function () {
    if (!chopSnap) {
      const spans = Array.prototype.map.call(document.querySelectorAll('#cho-fruit .chop svg'),
        s => Number(s.getAttribute('data-span')));
      if (spans.length) chopSnap = { spans: spans, takers: document.querySelectorAll('#cho-takers .taker').length };
    }
    return origR3();
  };
  await FRU.tapOption(qCh.answerIdx);
  renderQuiz = origR3;                           // 还原
  const chopSpans = chopSnap ? chopSnap.spans : [];
  const choOk = qCh.mode === 'choose' && chopSpans.length === qCh.parts &&
    chopSpans.every(s => s === 360 / qCh.parts) &&
    !!chopSnap && chopSnap.takers === qCh.parts;                       // n 娃娃各拿一块
  startLevel(5);                                 // dch2 quiz0 恒为 fair
  const qF = cur.quizzes[0];
  const fpSpans = Array.prototype.map.call(document.querySelectorAll('#fair-show .fpiece'),
    p => Number(p.getAttribute('data-span')));
  const wantF = qF.fairIsFair ? V_SPAN_FAIR : V_SPAN_UNFAIR;
  const fairShowOk = qF.mode === 'fair' && fpSpans.length === 2 &&
    fpSpans[0] === wantF[0] && fpSpans[1] === wantF[1] &&
    (qF.fairIsFair ? (fpSpans[0] === fpSpans[1]) : (fpSpans[0] !== fpSpans[1]));  // 公平=等大/不公平=不等
  const piecesAll = choOk && fairShowOk;
  if (piecesAll) npass++;
  units.pieces = { ok: piecesAll, choose: { parts: qCh.parts, spans: chopSpans, takers: chopSnap && chopSnap.takers },
    fairShow: { fair: qF.fairIsFair, spans: fpSpans, want: wantF } };

  /* ---- ④ 判定边界单元 ---- */
  total++;
  const LU = genLevel(0);
  const qu = LU.quizzes[0];                      // flat0 首题：pick 2 选 1（教学依赖）
  const flat0Tut = qu.mode === 'pick' && qu.nOpt === 2;
  const widx = qu.options.findIndex((o, i) => i !== qu.answerIdx);
  const u1 = engPick(LU, widx);                  // 首错：灰掉计重试
  const u2 = engPick(LU, widx);                  // 已灰再点：'again' 不计数
  const u3 = engPick(LU, qu.answerIdx);          // 答对推进（下一题=cut）
  const u4 = engPick(LU, 0);                     // cut 刀阶段点选项：null
  const u5 = engCut(LU);                         // 切：'judge'
  const u6 = engCut(LU);                         // 重按：0
  const jc = LU.quizzes[1];
  const jw = jc.judgeOpts.findIndex((o, i) => i !== jc.answerIdx);
  const u7 = engPick(LU, jw);                    // 判定错（点"不公平"）：wrong
  const u8 = engPick(LU, 99);                    // 非法下标：null
  const u9 = engPick(LU, jc.answerIdx);          // 判定对：right
  const L2 = genLevel(1);
  const u10 = engCut(L2);                        // pick 题调切分：null
  const starsOk = engStars({ retries: 0 }) === 3 && engStars({ retries: 1 }) === 2 &&
    engStars({ retries: 2 }) === 2 && engStars({ retries: 5 }) === 1;
  const edgeOk = flat0Tut && u1 === 'wrong' && u2 === 'again' && u3 === 'right' && u4 === null &&
    u5 === 'judge' && u6 === 0 && u7 === 'wrong' && u8 === null && u9 === 'right' && u10 === null &&
    LU.retries === 2 && jc.judging === false && jc.cutDone === true && starsOk;
  if (edgeOk) npass++;
  units.edge = { ok: edgeOk, flat0Tut: flat0Tut, wrong: u1, again: u2, right: u3,
    pickOnKnife: u4, cutJudge: u5, recut: u6, judgeWrong: u7, badIdx: u8, judgeRight: u9,
    cutOnPick: u10, starsOk: starsOk };

  /* ---- ⑤ UI 冒烟 A：flat0 首错零惩罚（quiz0 恒 pick 2 选 1）+ 真实流程通关（1 重试=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, steps = 0;
  const widxOf = q => q.options.findIndex((o, i) => i !== q.answerIdx);
  {                                             // 首错：晃动+灰掉零惩罚；首错不 pulse 正确项
    const q0 = cur.quizzes[0];
    const wEl0 = cardEl(widxOf(q0));
    const okEl0 = cardEl(q0.answerIdx);
    await FRU.tapOption(widxOf(q0));
    wrongOk = q0.mode === 'pick' && !!wEl0 && wEl0.classList.contains('wrong') &&
      !okEl0.classList.contains('pulse') &&
      FRU.currentLevel.retries === 1 && FRU.currentLevel.step === 0;
  }
  while (cur && !cur.done && steps < 12) {      // 按模式真实流程打完（cut 走两段）
    const q = cur.quizzes[cur.step];
    if (!q) { smokeA = false; break; }
    if (q.mode === 'cut') {
      if (!q.cutDone) { const rc = await FRU.doCut(); if (rc !== 'judge') smokeA = false; }
      else { const rj = await FRU.tapOption(q.answerIdx); if (rj !== 'right' && rj !== 'done') smokeA = false; }
    } else {
      const r = await FRU.tapOption(q.answerIdx);
      if (r !== 'right' && r !== 'done') smokeA = false;
    }
    steps++;
  }
  const lvA = FRU.currentLevel;
  /* flat0 序列=[pick,cut,choose,cut,pick]：5 题 + cut 两段各计一步 = 7 步 */
  const smokeOkA = smokeA && wrongOk && steps === 7 && lvA.done && lvA.won && lvA.retries === 1 &&
    engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑤ UI 冒烟 B：flat15（dch4 五模式混排）autoSolve 通关（cut 走两段） ---- */
  total++;
  startLevel(15);
  const m15 = {};
  cur.quizzes.forEach(q => { m15[q.mode] = (m15[q.mode] || 0) + 1; });
  const a15 = await FRU.autoSolve();
  const lv15 = FRU.currentLevel;
  const smokeOkB = m15.pick === 1 && m15.cut === 1 && m15.choose === 1 && m15.fair === 1 && m15.match === 1 &&
    a15.done && lv15.done && lv15.won && lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, modes: m15, acts: a15.acts, retries: lv15.retries, stars: engStars(cur) };

  /* ---- ⑥ 布局：双 viewport 模拟 × 五模式（含 cut 判定段） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();
    const de = document.documentElement;
    const q = cur.quizzes[cur.step];
    /* 主触摸目标按模式：辨识/等分/公平大卡 .card / 切分小刀 / 拼合候选，全部 ≥96 */
    const mains = Array.prototype.map.call(
      q.mode === 'cut' ? (q.judging ? document.querySelectorAll('#judge-row .card') : document.querySelectorAll('#btn-knife')) :
      q.mode === 'match' ? boardEl.querySelectorAll('.mopt') :
      boardEl.querySelectorAll('.card'), b => b.getBoundingClientRect());
    const mainOk = mains.length > 0 && mains.every(r => r.width >= 96 && r.height >= 96);
    /* 板内全部可点按钮 ≥64 */
    const btns = Array.prototype.map.call(boardEl.querySelectorAll('button'), b => b.getBoundingClientRect());
    const btnOk = btns.every(r => r.width >= 64 && r.height >= 64);
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, mode: q.mode + (q.mode === 'cut' && q.judging ? ':judge' : ''),
      mainOk: mainOk, btnOk: btnOk, n: mains.length, ox: ox, pass: mainOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10]) {              // pick / fair / choose
    startLevel(flat);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  startLevel(1);                                // cut 刀阶段（flat1 quiz1 恒为 cut）
  await FRU.tapOption(cur.quizzes[0].answerIdx);
  sims.push(simView(1280, 800));
  sims.push(simView(800, 1180));
  await FRU.doCut();                            // cut 判定段
  await wait(400);
  sims.push(simView(1280, 800));
  sims.push(simView(800, 1180));
  startLevel(15);                               // match（dch4 内步进到 match 题）
  for (let s = 0; s < CH_LEN; s++) {
    const q = cur.quizzes[cur.step];
    if (!q) break;
    if (q.mode === 'match') { sims.push(simView(1280, 800)); sims.push(simView(800, 1180)); break; }
    if (q.mode === 'cut') { await FRU.doCut(); await FRU.tapOption(q.answerIdx); }
    else await FRU.tapOption(q.answerIdx);
    await wait(150);
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length >= 10 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑦ 分布断言：pick 3选1 / choose / fair 答案索引多位置出现；choose 人数 2/3/4 都出现 ---- */
  total++;
  const nPick = pickDist[0] + pickDist[1] + pickDist[2];
  const nCho = choDist[0] + choDist[1] + choDist[2];
  const nFair = fairDist[0] + fairDist[1];
  const distOk = nPick > 0 && nCho > 0 && nFair > 0 &&
    pickDist[0] > 0 && pickDist[1] > 0 && pickDist[2] > 0 && pickDist[0] < nPick * 0.6 &&
    choDist[0] > 0 && choDist[1] > 0 && choDist[2] > 0 && choDist[0] < nCho * 0.6 &&
    fairDist[0] > 0 && fairDist[1] > 0 &&
    partsDist[2] > 0 && partsDist[3] > 0 && partsDist[4] > 0;
  if (distOk) npass++;
  units.dist = { ok: distOk, pick: pickDist, choose: choDist, fair: fairDist, parts: partsDist };

  /* ---- ⑧ estMs 家族（n*345+600 定版，禁 +300 变体）+ 与独立复算同步 ---- */
  total++;
  const estSrc = estMs.toString();
  const estOk = estMs(5) === 5 * 345 + 600 && estMs(14) === 14 * 345 + 600 &&
    estSrc.indexOf('345') >= 0 && estSrc.indexOf('600') >= 0 && estSrc.indexOf('+ 300') < 0 &&
    [1, 2, 5, 10, 14, 20].every(n => estMs(n) === V_EST(n));
  if (estOk) npass++;
  units.estMs = { ok: estOk, est5: estMs(5), est14: estMs(14) };

  /* ---- ⑨ 家族 F 行为断言：静态章预告 + 生成关预告实算（禁 (ci+1)%4 字面——源码级在 build.py） ---- */
  total++;
  const statHintOk = nextHint(4) === V_CHAPTER_HINT[1] && nextHint(9) === V_CHAPTER_HINT[2] &&
                     nextHint(14) === V_CHAPTER_HINT[3] && nextHint(19) === V_CHAPTER_HINT[4];
  const genHintOk = [24, 29, 34, 39, 44].every(fl =>        // 生成关（flat≥20，ci≥4）实算对账
    nextHint(fl) === V_GEN[genLevel(fl + 1).dch - 1]);
  const famOk = statHintOk && genHintOk;
  if (famOk) npass++;
  units.family = { ok: famOk, staticHints: statHintOk, genHints: genHintOk };

  const out = { game: 'fruitsplit', total: total, pass: npass, layoutOk: layoutOk,
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
