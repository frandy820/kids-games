/* ================= ?verify=1 自检（仅 verify 分支加载执行；独立第 4 script 块）
   ① 40 关全量审计（flat 0-39=32 静态+8 生成）：确定性（同 flat 两次生成 JSON 一致）/
     逐位对账（auditQuiz 独立语义审计：从 (op,a,b) 位算复推 marks/digits/plan——
     进位题标记集恰=满十位置集/退位题恰=不够减位置集/减法 a>b/结果 nd 位数禁前导 0/
     计划序=加填后标·减标后填）+章型契约（auditProfile：dch+qi→op/nd/标记数——
     ch1·2 qi0 热身 0 标记 qi1-7 恰 1；ch3 奇偶交替加减 qi0/1 热身 qi2-5 单 qi6/7 双；
     ch4 as/sa 交替 qi0 全无 qi1-4 恰一 qi5-7 全有）/8 题/关/32 静态关/同关无重复/
     引擎直驱（每题照 plan 逐动作：填 right·标 mark·步界 step2·末题 done→0 错 3 星）
   ② 引擎单元：非法键值 null/填错零惩罚（pos/cells 不动、miss·retries 计数）/
     标记相位按数字键='wrongmark' miss 不可跳过/同 op 错点亮='wrongslot' miss/
     提前点亮与重复点已亮='early' 不 miss 不推进/异 op 槽位=false 惰性/
     两步题步 1 完='step2' 换步/星级映射 3/2/1 永不为 0
   ③ sayW 三态：flat<3 每错必播 / flat≥3 10s 节流一条 / 同题 miss===2 force 豁免（不灰化款口径）
   ④ 开场顺序链：queue([clm_q_add]) 单次（play 不切断 queue）+ hear() 直通重读
   ⑤ clips 注入对账：clm_* 11 条 + core_* 3 条
   ⑥ 钩子 getter 拷贝：外部改返回值不污染引擎（quiz 形状含 phase/need/mark/marks 新契约）
   ⑦ 教学/演出吞输入单元：demo+locked 门拦钩子输入（tapKey 与 tapMark 双通道）
   ⑧ 教学链：tutorialHandoff 交接顺序链 queue([clm_tut_turn, clm_q_add]) + tut='help' + 题面复位
   ⑨ r15 操作步视觉：ch1 热身无小 1 可见锚；进位题填个位后标记相位（槽 cur 呼吸+键盘降权）；
     数字键=miss 不推进；点亮后 phase 复 fill；热身题错点亮=miss；
     ch2 借位题开题即标记相位（退位点未亮）、点亮后常驻；两步题步 2 换面（①② 步标）
   ⑩ 布局：双 viewport（1280×800 横 + 800×1180 竖实测 + 1280×800×body.port 类通道——
     portStyle 锚=#table.col）×按钮 ≥64（含标记槽）/键盘 10 键 ≥64/黑板数字 ≥40px/overflowX ≤0；
     量测 offsetWidth/offsetHeight（避 transform）+量测前清 .breathe/.nudge/.shake 瞬态类
   ⑪ UI 冒烟：flat0 首错零惩罚+autoSolve 通关（1 错=2 星，23 动作）；flat8（ch2 退位章）
     autoSolve 全对 3 星；flat24（ch4 两步章）autoSolve 全对 3 星（42 动作）
   ⑫ duration：独立副本 estMsV+DECIDE 分型常量+计划推导（verify 侧从 (op,a,b,nd) 独立位算
     复推动作 DECIDE 序列，禁调 data 的 planDecide/quizDurMs）逐关对账 levelDurMs +
     每关 ≥LEVEL_MIN_MS 40000 + 40 关最低 === 117600 精确防回漂
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dchHist = {};
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const isGen = flat >= STATIC_LEVELS;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let auditAll = true, noDup = true, driveOk = true, dchOk = true;
    if (L1.ch !== Math.floor(flat / CH_LEN) + 1) dchOk = false;
    if (L1.quizzes.length !== CH_LEN) dchOk = false;              // r15：8 题/关
    if (!isGen && L1.dch !== (L1.ch - 1) % 4 + 1) dchOk = false;   // 静态关：难度章=章循环
    if (isGen && !(L1.dch >= 1 && L1.dch <= 4)) dchOk = false;     // 生成关：随机章在 1-4
    dchHist[L1.dch] = (dchHist[L1.dch] || 0) + 1;
    const texts = [];
    for (let qi = 0; qi < L1.quizzes.length; qi++) {
      const q = L1.quizzes[qi];
      if (!q || !auditQuiz(L1.dch, qi, q)) auditAll = false;      // 逐位对账（独立语义审计）
      if (texts.indexOf(q.text) >= 0) noDup = false;              // 同关无重复题
      texts.push(q.text);
    }
    /* 引擎直驱：照 plan 逐动作（填 right / 标 mark / 步界 step2 / 末题 done）→ 0 错 3 星 */
    for (let qi = 0; qi < L1.quizzes.length && driveOk; qi++) {
      const q = L1.quizzes[qi];
      let last = null;
      for (let si = 0; si < q.steps.length && driveOk; si++) {
        const st = q.steps[si];
        for (let k = 0; k < st.plan.length && driveOk; k++) {
          const act = st.plan[k];
          const r = act.t === 'd' ? engKey(L1, act.v) : engMark(L1, act.t, act.col);
          if (!['right', 'mark', 'step2', 'done'].includes(r)) driveOk = false;
          last = r;
        }
      }
      const isLast = qi === L1.quizzes.length - 1;
      if (isLast && last !== 'done') driveOk = false;
      if (!isLast && last !== 'right' && last !== 'step2') driveOk = false;
      /* 每题每步终态对账 */
      q.steps.forEach(st => {
        if (!st.solved || st.pos !== st.plan.length) driveOk = false;
      });
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && auditAll && noDup && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, auditAll: auditAll, noDup: noDup,
      dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll,
      qs: L1.quizzes.map(q => q.text + '=' + q.ans +
        q.steps.map(s2 => s2.marks.join('')).join('|')) };
    if (!isGen) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 引擎单元：非法键值 / 填错零惩罚 / 标记操作步分型 / 步 2 / 星级映射 ---- */
  total++;
  const L = genLevel(0), q0 = L.quizzes[0];
  const bad0 = engKey(L, -1) === null && engKey(L, 10) === null &&
               engKey(L, 3.5) === null && engKey(L, '3') === null &&
               engMark(L, 'x', 1) === null && engMark(L, 'c', 0) === null;   // 非法键值全拒
  const wD = (q0.steps[0].plan[0].v + 1) % 10;                    // 必不等于个位答案
  const r1 = engKey(L, wD);
  const wrongOk = r1 === 'wrong' &&
    q0.miss === 1 && L.retries === 1 && q0.steps[0].pos === 0 &&
    q0.steps[0].cells.every(c => c === null);                     // 零惩罚：位与格不动（可重点）
  /* quiz1=进位题：填个位 → 标记相位按数字键='wrongmark' miss 不可跳过 */
  engKey(L, q0.steps[0].plan[0].v); engKey(L, q0.steps[0].plan[1].v);   // 过热身题 qi0
  const qc = L.quizzes[1];
  engKey(L, qc.steps[0].plan[0].v);                               // 进位题填个位 → 标记相位
  const m0 = qc.miss;
  const wm = engKey(L, (qc.steps[0].plan[2].v + 3) % 10);
  const wrongMarkOk = wm === 'wrongmark' && qc.miss === m0 + 1 &&
    qc.steps[0].pos === 1 && qc.steps[0].lit.length === 0;        // 不推进不点亮
  /* 错点亮（2 位数点 c2）='wrongslot' miss；提前点亮 c1 未到相位？c1 即当前 → 先测错位再点亮 */
  const ws = engMark(L, 'c', 2);
  const wrongSlotOk = ws === 'wrongslot' && qc.miss === m0 + 2;
  const mk = engMark(L, 'c', 1);
  const earlyOk = engMark(L, 'c', 1) === 'early';                 // 重复点已亮=轻反馈不 miss
  const markOk = mk === 'mark' && qc.miss === m0 + 2 &&
    qc.steps[0].lit.indexOf('c1') >= 0 && qc.steps[0].pos === 2;  // 点亮推进
  const inertOk = engMark(L, 'b', 1) === false;                   // 异 op 槽位=惰性 no-op 不罚
  const r3 = engKey(L, qc.steps[0].plan[2].v);                    // 填十位 → 换题
  const advOk = r3 === 'right' && L.step === 2 && L.quizzes[2].miss === 0;
  /* 两步题步界：flat24=ch4，驱动 qi0 步 1 末位 → 'step2' */
  const LT = genLevel(24), qt0 = LT.quizzes[0];
  for (let k = 0; k < qt0.steps[0].plan.length - 1; k++) {
    const a = qt0.steps[0].plan[k];
    a.t === 'd' ? engKey(LT, a.v) : engMark(LT, a.t, a.col);
  }
  const lastA = qt0.steps[0].plan[qt0.steps[0].plan.length - 1];
  const step2Ok = engKey(LT, lastA.v) === 'step2' && qt0.si === 1 &&
    qt0.steps[1].pos === 0 && qt0.steps[1].cells.every(c => c === null);
  const sMap = r => engStars({ retries: r });
  const starsOk = sMap(0) === 3 && sMap(1) === 2 && sMap(2) === 2 && sMap(3) === 1 && sMap(99) === 1;
  const engOk = bad0 && wrongOk && wrongMarkOk && wrongSlotOk && markOk && earlyOk &&
                inertOk && advOk && step2Ok && starsOk;
  if (engOk) npass++;
  units.engine = { ok: engOk, bad0: bad0, wrongOk: wrongOk, wrongMarkOk: wrongMarkOk,
    wrongSlotOk: wrongSlotOk, markOk: markOk, earlyOk: earlyOk, inertOk: inertOk,
    advOk: advOk, step2Ok: step2Ok, starsOk: starsOk };

  /* ---- ③ sayW 节流：flat<3 每错必播 / flat≥3 10s 一条 / miss===2 force 豁免 ---- */
  total++;
  let playLog = [];
  const origPlay = KIDS.voice.play;
  KIDS.voice.play = function (key) { playLog.push(key); };
  startLevel(0);                                // flat0：每错必播（填错走 clm_hint）
  await CL.tapKey((CL.quiz.need + 1) % 10);
  await CL.tapKey((CL.quiz.need + 1) % 10);
  const sayA = playLog.filter(k => k === 'clm_hint').length;       // flat0 两错 → 2 条
  lastWrongVoice = 0;                           /* 隔离上一单元错点的时间戳污染 */
  startLevel(3);                                // flat3：10s 节流
  playLog = [];
  await CL.tapKey((CL.quiz.need + 1) % 10);   // miss=1：节流窗口首条 → 播
  startLevel(3);                                // 重发同关（fresh quiz miss=0）
  await CL.tapKey((CL.quiz.need + 1) % 10);   // 窗口内二条（miss=1 无豁免）→ 节流不播
  const sayB = playLog.filter(k => k === 'clm_hint').length;       // → 1 条
  startLevel(3);                                // 同题 miss===2 force 豁免
  lastWrongVoice = 0;                           /* force 子用例从新窗口起算 */
  playLog = [];
  await CL.tapKey((CL.quiz.need + 1) % 10);   // miss=1 → 播
  await CL.tapKey((CL.quiz.need + 1) % 10);   // miss=2 → force → 播
  const sayC = playLog.filter(k => k === 'clm_hint').length;       // → 2 条
  KIDS.voice.play = origPlay;
  const sayWOk = sayA === 2 && sayB === 1 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ④ 开场顺序链：queue([clm_q_add]) 单次（不叠音不切断）+ hear 直通 ---- */
  total++;
  const qLog = [];
  const origQueue = KIDS.voice.queue;
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  startLevel(5);                                // 非 flat0 verify 关：openingSpeak 排链（ch1=加法）
  const chainOk = qLog.length === 1 && qLog[0].length === 1 && qLog[0][0] === 'clm_q_add';
  const repOk = CL.hear() === true;             // 测试钩子：无视节流直通重读题面
  KIDS.voice.queue = origQueue;
  if (chainOk && repOk) npass++;
  units.opening = { ok: chainOk && repOk, chain: qLog[0] || null, replay: repOk };

  /* ---- ⑤ clips 注入对账（stub play 后缺 clip 无感，页面级兜底） ---- */
  total++;
  const CLM_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest',
    'clm_hint', 'clm_q_add', 'clm_q_sub', 'clm_q_two', 'clm_q_step2',
    'clm_carry_go', 'clm_borrow_go', 'clm_no_carry', 'clm_no_borrow',
    'clm_tut_turn', 'clm_tut_watch'];
  const clipOk = CLM_KEYS.every(k => !!KIDS.voice.clips[k]);
  if (clipOk) npass++;
  units.clips = { ok: clipOk, n: CLM_KEYS.length };

  /* ---- ⑥ 钩子 getter 拷贝：外部改返回值不污染引擎（含 r15 新形状） ---- */
  total++;
  const g1 = CL.quiz;
  const dLen = g1.cells.length;
  g1.digits = null; g1.cells[0] = -5; g1.need = -5; g1.op = 'hacked'; g1.phase = 'hacked';
  const g2 = CL.quiz;
  const copyOk = g2.cells.length === dLen && g2.need !== -5 && g2.op !== 'hacked' &&
                 g2.phase !== 'hacked' && g2.cells[0] !== -5;
  const shapeOk = ['op', 'form', 'a', 'b', 'c', 'ans', 'mid', 'nd', 'si', 'phase',
                   'need', 'mark', 'col', 'cells', 'marks', 'step', 'miss',
                   'carry', 'borrow'].every(f => f in g2);
  if (copyOk && shapeOk) npass++;
  units.getter = { ok: copyOk && shapeOk, copyOk: copyOk, shapeOk: shapeOk };

  /* ---- ⑦ 教学/演出吞输入单元：demo+locked 门拦钩子输入（键与标记槽双通道） ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;       // 模拟教学"看"演示期（locked 吞输入）
  const swallow1 = (await CL.tapKey(5)) === false;
  const swallow1m = (await CL.tapMark('c', 1)) === false;
  state.demo = false; state.locked = true;      // 演出窗口（板擦/晃动/换步）
  const swallow2 = (await CL.tapKey(5)) === false;
  state.locked = false;                         // 还原
  const swallowOk = swallow1 && swallow1m && swallow2 && CL.currentLevel.step === 0 &&
                    CL.quiz.miss === 0 && CL.quiz.phase === 'fill';
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, demoMark: swallow1m, locked: swallow2 };

  /* ---- ⑧ 教学链：tutorialHandoff 交接（turn→题面 顺序链 + tut='help' + 题面复位） ---- */
  total++;
  const tLog = [];
  KIDS.voice.queue = function (parts) { tLog.push(parts.slice()); };
  tutorialHandoff();                            // 直调交接（教学"看"演示后的真实续体）
  KIDS.voice.queue = origQueue;
  const tutOk = state.tut === 'help' && tLog.length === 1 &&
    tLog[0].length === 2 && tLog[0][0] === 'clm_tut_turn' && tLog[0][1] === 'clm_q_add' &&
    CL.quiz.step === 0 && CL.quiz.si === 0 && CL.quiz.miss === 0;   // 题面复位（步 1 首动作）
  const tutReset = CL.quiz.phase === 'fill' && CL.quiz.cells.every(c => c === null) &&
                   CL.quiz.marks.length === 0;
  if (tutOk && tutReset) npass++;
  units.tutChain = { ok: tutOk && tutReset, chain: tLog[0] || null, tut: state.tut };

  /* ---- ⑨ r15 操作步视觉：进位槽相位流 + 错点亮 + 借位题开题标记相位 + 两步步标 ---- */
  total++;
  startLevel(0);                                // ch1：quiz0=热身不进位
  const w0 = CL.quiz;
  const w0Ok = w0.carry === false && w0.phase === 'fill' &&
    !$id('mz-c1').classList.contains('lit') && !$id('mz-c1').hidden;   // 热身槽在场未亮
  const falseLight = await CL.tapMark('c', 1);  // 热身题错点亮=miss（不进位题点小 1）
  const flOk = falseLight === 'wrongslot' && CL.quiz.miss === 1 &&
               CL.quiz.phase === 'fill';
  await CL.tapKey(CL.quiz.need);                // 热身个位
  await CL.tapKey(CL.quiz.need);                // 热身十位 → 换题（板擦）
  await wait(400 * SPEED);
  const c1q = CL.quiz;
  const c1Ok = c1q.carry === true && c1q.step === 1 &&
               !$id('mz-c1').classList.contains('lit');              // 进位题呈现时小 1 未亮
  await CL.tapKey(c1q.need);                    // 填个位 → 标记相位
  const qm = CL.quiz;
  const phaseOk = qm.phase === 'carry' && qm.mark.t === 'c' && qm.mark.col === 1 &&
    $id('mz-c1').classList.contains('cur') && keysEl.classList.contains('dim');
  const skipTry = await CL.tapKey((qm.mark.col * 7 + 3) % 10);   // 标记相位按数字键=miss 不跳过
  const skipOk = skipTry === 'wrongmark' && CL.quiz.phase === 'carry' &&
                 CL.quiz.miss === 1 && CL.quiz.mark.t === 'c';
  const litTry = await CL.tapMark('c', 1);      // 点亮小 1 → 相位回 fill
  const litOk = litTry === 'mark' && CL.quiz.phase === 'fill' &&
    $id('mz-c1').classList.contains('lit') && !keysEl.classList.contains('dim');
  await CL.tapKey(CL.quiz.need);                // 十位 → 过题
  startLevel(8);                                // ch2：quiz0 热身；借位章
  await CL.tapKey(CL.quiz.need); await CL.tapKey(CL.quiz.need);   // 过热身
  await wait(400 * SPEED);
  const bq = CL.quiz;
  const bOk = bq.borrow === true && bq.phase === 'borrow' &&       // 借位题开题即标记相位
    $id('mz-b1').classList.contains('cur') &&
    !$id('mz-b1').classList.contains('lit');                       // 退位点未点亮
  const bMark = await CL.tapMark('b', 1);
  const bLitOk = bMark === 'mark' && CL.quiz.phase === 'fill' &&
    $id('mz-b1').classList.contains('lit');
  startLevel(24);                               // ch4 两步：步 1 走完换步 2（①→②）
  let sawChip2 = false, guardT = 0;
  while (CL.quiz && CL.quiz.step === 0 && guardT++ < 40) {   // 按相位驱动首题至步 2（标记步照点）
    const qq = CL.quiz;
    if (qq.si === 1) {
      sawChip2 = $id('step-chip').textContent === '②';       // 步 2 呈现=②步标（换步动画已收）
      break;
    }
    if (qq.phase === 'fill') await CL.tapKey(qq.need);
    else await CL.tapMark(qq.mark.t, qq.mark.col);
  }
  const twoOk = sawChip2;
  const hintOk = w0Ok && flOk && c1Ok && phaseOk && skipOk && litOk && bOk && bLitOk && twoOk;
  if (hintOk) npass++;
  units.markFlow = { ok: hintOk, warmAnchor: w0Ok && flOk, carryPhase: c1Ok && phaseOk,
                     noSkip: skipOk, carryLit: litOk, borrowPhase: bOk && bLitOk, twoStep: twoOk };

  /* ---- ⑩ 布局：双 viewport 实测 + body.port 类通道（portStyle 锚=#table.col）
     量测 offsetWidth/offsetHeight（避 transform）；量测前清瞬态类 ---- */
  function simView(w, h, port) {
    const g = $id('game');
    document.querySelectorAll('.breathe,.nudge,.shake,.bad').forEach(e => {
      e.classList.remove('breathe', 'nudge', 'shake', 'bad');
    });
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    document.body.classList.toggle('port', !!port);
    layout();
    const bad = [];
    document.querySelectorAll('button').forEach(e => {
      if (e.classList.contains('k-parentbtn')) return;       // core 家长按钮豁免（§0.9）
      if (e.offsetParent === null) return;                    // hidden 槽不参与（display:none）
      if (e.offsetWidth > 4 && e.offsetHeight > 4 &&
          (e.offsetWidth < 64 || e.offsetHeight < 64))
        bad.push((e.id || e.className) + ':' + e.offsetWidth + 'x' + e.offsetHeight);
    });
    const keys = Array.prototype.map.call(document.querySelectorAll('.key'),
      k => Math.min(k.offsetWidth, k.offsetHeight));
    const keyOk = keys.length === 10 && keys.every(a => a >= 64);   // 键盘 0-9 ≥64（§3）
    const zones = Array.prototype.map.call(
      document.querySelectorAll('.mzone:not([hidden])'),
      z => Math.min(z.offsetWidth, z.offsetHeight));
    const zoneOk = zones.length >= 1 && zones.every(a => a >= 64);  // 可见标记槽 ≥64（两位数关仅 1 槽在场）
    const bn = document.querySelector('.bn');
    const fs = bn ? parseFloat(getComputedStyle(bn).fontSize) : 0;
    const bnOk = fs >= 40;                                   // 黑板数字大字 ≥40px（§3）
    const cellsOk = document.querySelectorAll('.bcell').length === 3;   // 4 列三位答案格
    const tipR = tipEl.getBoundingClientRect();
    const tipOk = tipR.width > 100 && tipR.height >= 40;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    /* portStyle 锚：竖排判据只依赖 #game 模拟尺寸实测 + body.port 类通道
       （#game 为 fixed+显式宽高，测值与真实窗口方向无关——P1b 真竖下横模拟仍须横排） */
    const colExpect = port || h >= 1180;
    document.body.classList.remove('port');
    return { vp: w + 'x' + h + (port ? 'P' : ''), bad: bad, keyOk: keyOk, minKey: keys.length ?
      Math.round(Math.min.apply(null, keys)) : 0, zoneOk: zoneOk, bbfs: Math.round(fs),
      cellsOk: cellsOk, tipOk: tipOk, ox: ox, colMode: tableEl.classList.contains('col'),
      colExpect: colExpect, pass: !bad.length && keyOk && zoneOk && bnOk && cellsOk && tipOk &&
      ox <= 0 && tableEl.classList.contains('col') === colExpect };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 16, 24]) {          // 四章代表关（flat16=ch3 三位、flat24=ch4 两步）
    startLevel(flat);
    sims.push(simView(1280, 800, false));       // 横屏实测（col 期望=false）
    sims.push(simView(800, 1180, false));       // 竖屏实测（量测条件成立 col=true）
    sims.push(simView(1280, 800, true));        // 竖屏类通道（body.port 强制 col=true）
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑪ UI 冒烟 A：flat0 首错零惩罚 + autoSolve 通关（1 错=2 星，23 动作） ---- */
  total++;
  startLevel(0);
  const qw = CL.quiz;
  const rw = await CL.tapKey((qw.need + 1) % 10);   // 首题先错一次：零惩罚同位重填
  const wrongDone = rw === 'wrong' && CL.currentLevel.step === 0 &&
                    CL.currentLevel.retries === 1 && CL.quiz.phase === 'fill';
  const a0 = await CL.autoSolve();              // 补完本题（2 键）+ 后续 7 题（3 动作/题）
  const lvA = CL.currentLevel;
  const smokeOkA = wrongDone && a0.done && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && a0.taps === 23 &&   // flat0：2+7×3 动作
    !document.querySelector('.k-celebrate');    // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongDone: wrongDone, taps: a0.taps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑪ UI 冒烟 B：flat8（ch2 退位章，首题热身）autoSolve 全对 3 星 ---- */
  total++;
  startLevel(8);
  const warm8 = CL.quiz.borrow === false && CL.quiz.op === 'sub';   // 退位章首题=热身不退位
  const a8 = await CL.autoSolve();
  const lv8 = CL.currentLevel;
  const smokeOkB = warm8 && a8.done && lv8.done && lv8.won &&
    lv8.retries === 0 && engStars(cur) === 3 && a8.taps === 23;
  if (smokeOkB) npass++;
  smokes.flat8 = { ok: smokeOkB, warm: warm8, taps: a8.taps, stars: engStars(cur) };

  /* ---- ⑪ UI 冒烟 C：flat24（ch4 两步章，首题热身）autoSolve 全对 3 星（4+5×4+6×3 动作） ---- */
  total++;
  startLevel(24);
  const warm24 = CL.quiz.form !== null && CL.quiz.marks.length === 0;   // 两步热身=无标记
  const a24 = await CL.autoSolve();
  const lv24 = CL.currentLevel;
  const smokeOkC = warm24 && a24.done && lv24.done && lv24.won &&
    lv24.retries === 0 && engStars(cur) === 3 && a24.taps === 42;
  if (smokeOkC) npass++;
  smokes.flat24 = { ok: smokeOkC, warm: warm24, taps: a24.taps, stars: engStars(cur) };

  /* ---- ⑫ duration：独立副本复算（estMsV/分型常量/计划推导全 verify 侧——分源）
     + 逐关对账 levelDurMs + 40 关最低值精确防回漂（CLM_DMIN === 117600） ---- */
  total++;
  const estMsV = s => s.length * 345 + 600;                /* b25 定版（与 data estMs 四方同步） */
  const DECIDE_INPUT_V = 5000, DECIDE_MARK_V = 4000;      /* r15 分型常量（SPEC §4 独立副本） */
  const ADV_V = 1200, ENTER_V = 400, STAGE_V = 400;
  const TWO2_V = estMsV('第二步，接着算') + 300;            /* 步 2 换面句窗 */
  const CLM_DMIN = 117600;                                 /* 40 关最低=ch1/ch2 关恒值：
                                                             11200 + 7×15200（verify ⑫ 精确防回漂） */
  const cueV = q => q.form ? '两步竖式，算一算'
    : (q.op === 'add' ? '加法竖式，算一算' : '减法竖式，算一算');
  const durV = q => {
    let sum = 0, k = 0;
    const twoStart = q.steps[1] ? q.steps[0].plan.length : -1;
    q.steps.forEach(st => {
      /* 独立位算复推动作 DECIDE 序列（禁调 planDecide——分源对账） */
      const A = String(st.a).split('').reverse().map(Number);
      const B = String(st.b).split('').reverse().map(Number);
      const dec = [];
      if (st.op === 'add') {
        let carry = 0;
        for (let i = 0; i < st.nd; i++) {
          dec.push(DECIDE_INPUT_V);
          carry = ((A[i] || 0) + (B[i] || 0) + carry) >= 10 ? 1 : 0;
          if (carry && i < st.nd - 1) dec.push(DECIDE_MARK_V);
        }
      } else {
        let borrow = 0;
        for (let i = 0; i < st.nd; i++) {
          if (((A[i] || 0) - borrow - (B[i] || 0)) < 0) { dec.push(DECIDE_MARK_V); dec.push(DECIDE_INPUT_V); borrow = 1; }
          else { dec.push(DECIDE_INPUT_V); borrow = 0; }
        }
      }
      dec.forEach(d => {
        const win = k === 0 ? (ENTER_V + estMsV(cueV(q)) + 300)
                            : (k === twoStart ? TWO2_V : STAGE_V);
        sum += Math.max(win, d);
        k++;
      });
    });
    return sum + ADV_V;
  };
  let durAll = true, dMin = Infinity, dMinFlat = -1;
  for (let flat = 0; flat < 40; flat++) {
    const Ld = genLevel(flat);
    let sumV = 0;
    Ld.quizzes.forEach(q => {
      sumV += durV(q);
      if (durV(q) !== quizDurMs(q)) durAll = false;        /* 独立副本 vs data 模型逐题对账 */
    });
    if (sumV !== levelDurMs(Ld)) durAll = false;           /* 逐关对账 */
    if (sumV < LEVEL_MIN_MS) durAll = false;               /* 硬门禁 >=40000 */
    if (sumV < dMin) { dMin = sumV; dMinFlat = flat; }
  }
  if (!(CLM_DMIN === dMin && LEVEL_MIN_MS <= dMin)) durAll = false;   /* 精确防回漂 */
  if (durAll) npass++;
  units.duration = { ok: durAll, dMin: dMin, dMinFlat: dMinFlat, expect: CLM_DMIN,
    minGate: LEVEL_MIN_MS };

  const out = { game: 'column', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, dchHist: dchHist, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__clmVlog = out;                                  /* _selftest P1/P1b 抓取口 */
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险；§0.2 字面清单对齐） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  runVerify();
}
