/* ================= ?verify=1 自检（仅 verify 分支加载执行；独立第 4 script 块）
   r15 难度改造（2026-09-16）：五章×8 题 + eq 等值题型 + cut 4 选 1 + 时长模型门禁。
   ① 80 关全量审计（flat 0-79=静态 40+生成 40，每关一记）：确定性（同 flat 两次生成 JSON 一致）/
     章号 1 基+难度章 (ch-1)%5+1 循环（生成关 dch∈[1,5] 随机）/ structWhy（四题型规则域/等分正确性：
     eq 角宽比≈1、un ≥1.5（r15 含 5 份档）/干扰互异/分数值域禁 0 负假分数/answerIdx 自洽/初始态干净）/
     章规则（ch1 cut2+read1/2 交替、ch2 cut3/4+read1/3·1/4 混、ch3 read 池+首题热身 1/2、
     ch4 cmp+read 混+首题热身 1/2vs1/4、ch5 eq 等值+cmp 同分母+首题热身）/ 相邻同题互异 /
     引擎直驱（错光灰掉 miss 封顶 → 已灰 again 早退 → 全对通关；错光数=干扰数→星档（cut 3 错=1 星，
     read/eq 2 错=2 星，cmp 1 错=2 星）；另全对 3 星）
   ② tapCard 单元（flat0 真实 UI，cut 题 r15 四卡）：卡 data-opt/data-rot 与引擎对账（渲染即引擎）/
     首错=晃动+灰掉(pointer-events:none)+miss+dead 标记+首错不 pulse / 已灰卡 hook 点击=again
     零惩罚 / 第二错=miss2 → 正确卡 pulse 两遍 / 非法下标 false / 答对 lit+题面 paired 同步（演出
     窗内）+step 推进换 read 题（分数卡 DOM 对账）
   ②b sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / 灰化款 miss===2 豁免恰一次
     （r15：cut 4 选 1 干扰 3 张、read/eq 三选一 2 张、cmp 两选一 1 张——豁免 ===2 与 >=2 等价，
     家族统一 ===2）
   ②c 教学链单元：直调 tutorialWatch——watch clip → 演示答对 → 重发同关 → turn clip →
     2000ms 接力题面 queue（cut 题全 clip 三段含数词，单通道不叠音）→ state 'help'（钩子契约）
   ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层）
   ④ UI 冒烟 B：flat16（ch3）read 全章——qi0 热身 1/2 + 答对念分数词 fra_f_1_2（clip 强化）+
     真实点击通关 3 星；C：flat24（ch4）cmp 混 read——qi0 热身 1/2vs1/4 + 两卡 DOM 对账 +
     autoSolve 3 星；D：flat32（ch5 r15）eq——qi0 热身 cmp → qi1 eq：ref 钩子 {k,n}∈{1/2,2/4}+
     参照块 pwrap+问句「一样大」+三块卡 data-val 对账+答案值=参照值+autoSolve 3 星
   ⑤ 布局（竖屏三件套）：双 viewport（1280×800 / 800×1180）×四题型（cut 四披萨卡/read 分数卡/
     cmp 两块卡/eq 三块卡）：卡数=候选数、卡=主答案 ≥96（offsetWidth 量测，量前清 .pop——
     card-in transform 陷阱）、卡内图形在界内、port 竖屏通道锚（body.port 与 @media 等值：
     cut/read 卡 136↔120、cmp/eq 卡 172↔156）、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0
   ⑥ 分布与专项：FRA_NUM/FRAC_NAME 独立字面量对账（SPEC 定稿文案）/ fra_* 18 条 clips 注入
     clipOk / 开场顺序链 stub（play(fra_hint) 后 2000ms 接力题面 queue）/ 生成关 dch 1-5 全覆盖 /
     80 关题型+read 答案+cmp 对子（同分子 3+热身+同分母 4）+eq 双向全覆盖
   ⑦ 时长模型单元（crd r12 范式 r15）：estMsV 独立副本/V_DECIDE/V_ADV 四层对账+80 关 parity
     （与源 modeled 逐关一致）+dMin 精确断言 72265（flat24，dch4）+LEVEL_MIN_MS 40000 下限
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const kindDist = { cut: 0, read: 0, cmp: 0, eq: 0 };
  const readAns = { '1/2': 0, '1/3': 0, '1/4': 0, '2/3': 0, '2/4': 0, '3/4': 0 };
  const cmpPairs = { '1/2|1/3': 0, '1/3|1/4': 0, '2/3|2/4': 0, '1/2|1/4': 0,
                     '1/4|3/4': 0, '1/4|2/4': 0, '2/4|3/4': 0, '1/3|2/3': 0 };
  const eqPairs = { '1/2=2/4': 0, '2/4=1/2': 0 };
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const CMP_POOL = ['1/2|1/3', '1/3|1/4', '2/3|2/4'];
  const CMP2_POOL = ['1/4|3/4', '1/4|2/4', '2/4|3/4', '1/3|2/3'];

  /* ---- ① 80 关全量审计（flat 0-79：静态 40 + 生成 40，r15） ---- */
  for (let flat = 0; flat < 80; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                     : (L1.dch >= 1 && L1.dch <= N_CHAPTERS); // 生成关随机章参数（1-5）
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    let structAll = true, ruleOk = true, adjOk = true, warmOk = true;
    let prev = null, prevEq = null;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q)) structAll = false;
      kindDist[q.kind]++;
      if (q.kind === 'read') readAns[q.k + '/' + q.n] = (readAns[q.k + '/' + q.n] || 0) + 1;
      if (q.kind === 'cmp' && cmpPairs[q.pk] != null) cmpPairs[q.pk]++;
      if (q.kind === 'eq') eqPairs[q.pk] = (eqPairs[q.pk] || 0) + 1;
      if (L1.dch === 1) {                                                   // ch1：cut(n=2)+read(1/2) 交替
        if (q.kind !== (k % 2 === 0 ? 'cut' : 'read')) ruleOk = false;
        if (q.kind === 'cut' && q.n !== 2) ruleOk = false;
        if (q.kind === 'read' && !(q.k === 1 && q.n === 2)) ruleOk = false;
      } else if (L1.dch === 2) {                                            // ch2 r15：cut 3/4 交替 + read 1/3·1/4 交替
        const en = (k >> 1) % 2 === 0 ? 3 : 4;
        if (q.kind !== (k % 2 === 0 ? 'cut' : 'read')) ruleOk = false;
        if (q.kind === 'cut' && q.n !== en) ruleOk = false;
        if (q.kind === 'read' && !(q.k === 1 && q.n === en)) ruleOk = false;
        if (k > 0 && prev.kind === q.kind) {                                // 相邻同题互异（cut n / read n）
          if (q.kind === 'cut' && prev.n === q.n) adjOk = false;
          if (q.kind === 'read' && prev.n === q.n) adjOk = false;
        }
      } else if (L1.dch === 3) {                                            // ch3：read 池 + 首题热身
        if (q.kind !== 'read') ruleOk = false;
        if (k === 0 && !(q.k === 1 && q.n === 2)) warmOk = false;           // 首题热身=1/2（已学样本）
        if (k > 0 && !READ_SET.some(p => p[0] === q.k && p[1] === q.n)) ruleOk = false;
        if (k > 0 && prev.k === q.k && prev.n === q.n) adjOk = false;       // 相邻答案互异
      } else if (L1.dch === 4) {                                            // ch4 r15：cmp+read 混
        if (q.kind !== (k % 2 === 0 ? 'cmp' : 'read')) ruleOk = false;
        if (k === 0 && q.pk !== '1/2|1/4') warmOk = false;                  // 首题热身=1/2 vs 1/4
        if (k > 0 && q.kind === 'cmp' && CMP_POOL.indexOf(q.pk) < 0) ruleOk = false;
        if (k > 0 && q.kind === 'read' && !READ_SET.some(p => p[0] === q.k && p[1] === q.n)) ruleOk = false;
        if (k > 0 && prev.kind === q.kind) {                                // 相邻同题互异
          if (q.kind === 'cmp' && prev.pk === q.pk) adjOk = false;
          if (q.kind === 'read' && prev.k === q.k && prev.n === q.n) adjOk = false;
        }
      } else {                                                              // ch5 r15：热身 cmp + eq/cmp(同分母) 交替
        if (k === 0) {
          if (q.kind !== 'cmp' || q.pk !== '1/2|1/4') warmOk = false;       // 首题热身=已学差距最大对
        } else if (k % 2 === 1) {
          if (q.kind !== 'eq') ruleOk = false;
          if (eqPairs[q.pk] == null && q.pk !== '1/2=2/4' && q.pk !== '2/4=1/2') ruleOk = false;
          if (prevEq && prevEq.pk === q.pk) adjOk = false;                  // 相邻 eq 方向互异
          prevEq = q;
        } else {
          if (q.kind !== 'cmp' || CMP2_POOL.indexOf(q.pk) < 0) ruleOk = false;   // 同分母对
          if (prev && prev.kind === 'cmp' && prev.pk === q.pk) adjOk = false;
        }
      }
      prev = q;
    }
    /* 引擎直驱：首题错光灰掉（r15：cut 4 选 1 干扰 3 张 / read·eq 3 选 1 2 张 / cmp 2 选 1 1 张）
       → 已灰 again 早退 → 逐题全对通关（retries=错光数 → cut 3 星档 1、read/eq/cmp 2 星档 2）；
       另取新关全对通关（3 星） */
    const Ld = genLevel(flat);
    const q0 = Ld.quizzes[0];
    const ws = q0.options.map((v, i) => i !== q0.answerIdx ? i : -1).filter(x => x >= 0);
    let driveOk = true;
    if (engTap(Ld, ws[0]) !== 'wrong' || Ld.retries !== 1 || q0._miss !== 1 || !q0._dim[ws[0]]) driveOk = false;
    for (let wi = 1; wi < ws.length; wi++) {
      if (engTap(Ld, ws[wi]) !== 'wrong' || Ld.retries !== wi + 1 || q0._miss !== wi + 1 || !q0._dim[ws[wi]]) driveOk = false;
    }
    if (engTap(Ld, ws[0]) !== 'again' || Ld.retries !== ws.length) driveOk = false;   // 已灰卡防御层
    let lastR = null, guard = 0;
    while (!Ld.done && driveOk && guard++ < 12) {
      lastR = engTap(Ld, Ld.quizzes[Ld.step].answerIdx);
      if (lastR !== 'right' && lastR !== 'done') { driveOk = false; break; }
    }
    const wantStars = ws.length <= 2 ? 2 : 1;                               // r15：错光全部干扰后 1 星（cut）/2 星（其余）
    if (!Ld.done || Ld.step !== CH_LEN || lastR !== 'done' ||
        Ld.retries !== ws.length || engStars(Ld) !== wantStars) driveOk = false;
    const L3 = genLevel(flat);
    guard = 0;
    while (!L3.done && guard++ < 12) engTap(L3, L3.quizzes[L3.step].answerIdx);
    if (!L3.done || engStars(L3) !== 3) driveOk = false;
    const ok = det && chOk && dchOk && structAll && ruleOk && adjOk && warmOk && driveOk &&
      L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, ruleOk: ruleOk,
                  adjOk: adjOk, warmOk: warmOk, driveOk: driveOk,
                  qs: L1.quizzes.map(q => q.kind === 'cut' ? 'cut' + q.n : q.kind === 'read' ? q.k + '/' + q.n
                    : q.kind === 'cmp' ? q.pk : q.pk) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCard 单元（flat0 真实 UI 状态机，qi0=cut n=2 r15 四披萨卡） ---- */
  total++;
  startLevel(0);
  const q0 = FR.quiz;
  const cards0 = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
  /* DOM 对账：4 张卡 data-i/data-opt/data-rot 与引擎 options 一致；题面数字=2（渲染即引擎） */
  const alignOk = q0 && q0.kind === 'cut' && q0.n === 2 && cards0.length === 4 &&
    cards0.every((c, i) =>
      Number(c.dataset.i) === i &&
      c.dataset.opt === q0.options[i].t + q0.options[i].n &&
      c.dataset.rot === String(q0.options[i].rot)) &&
    chipEl.querySelector('.qtext b').textContent === '2' &&
    boardEl.dataset.k === 'cut';
  const ws0 = q0.options.map((v, i) => i !== q0.answerIdx ? i : -1).filter(x => x >= 0);
  const wIdx = ws0[0], okIdx = q0.answerIdx;
  const rW = await FR.tapCard(wIdx);              // 首错：晃动+灰掉+miss 计数+dead 标记+首错不 pulse
  const wEl = cardEl(wIdx), okEl = cardEl(okIdx);
  const wrongOk = rW === 'wrong' && FR.quiz.miss === 1 && FR.currentLevel.retries === 1 &&
    FR.quiz.step === 0 && FR.quiz.dead.indexOf(wIdx) >= 0 && FR.quiz.dead.indexOf(okIdx) < 0 &&
    wEl.classList.contains('dim') && wEl.classList.contains('wig') &&
    getComputedStyle(wEl).pointerEvents === 'none' &&      /* 灰掉：排除法保底（SPEC §2 灰化款） */
    !okEl.classList.contains('pulse');                    /* 首错不 pulse */
  const rA = await FR.tapCard(wIdx);              // 已灰卡 hook 点击：again 早退零惩罚
  const againOk = rA === 'again' && FR.quiz.miss === 1 && FR.currentLevel.retries === 1;
  const badIdx = (await FR.tapCard(4)) === false && (await FR.tapCard(-1)) === false &&   /* r15 四卡：4 才越界 */
    (await FR.tapCard('x')) === false && (await FR.tapCard(1.5)) === false;
  const rW2 = await FR.tapCard(ws0[1]);           // 第二错：miss=2 → 正确卡 pulse 两遍（豁免拍）
  const pulse2 = rW2 === 'wrong' && FR.quiz.miss === 2 &&
    cardEl(okIdx).classList.contains('pulse');
  const pOk = FR.tapCard(okIdx);                  // 答对：lit 点亮+题面 paired 同步（演出窗内读）
  const litCard = cardEl(okIdx).classList.contains('lit');
  const chipPair = chipEl.classList.contains('paired');
  const rOk = await pOk;                          // 'right'：推进换 read 题
  const q1 = FR.quiz;
  const q1Cards = boardEl.querySelectorAll('.card');
  const nextOk = rOk === 'right' && q1 && q1.kind === 'read' && q1.step === 1 && q1.miss === 0 &&
    boardEl.dataset.k === 'read' &&
    Array.prototype.every.call(q1Cards, (c, i) =>
      Number(c.dataset.i) === i &&
      Number(c.dataset.num) === q1.options[i].num &&
      Number(c.dataset.den) === q1.options[i].den) &&
    !!chipEl.querySelector('.pwrap') &&
    document.querySelectorAll('#step-dots i.done').length === 1;
  const tapOk = alignOk && wrongOk && againOk && badIdx && pulse2 && litCard && chipPair && nextOk;
  if (tapOk) npass++;
  units.tapCard = { ok: tapOk, align: alignOk, wrong: wrongOk, again: againOk,
    badIdx: badIdx, pulse2: pulse2, lit: litCard, chipPair: chipPair, next: nextOk };

  /* ---- ②b sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / miss===2 豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'fra_wrong').length;  /* wrong 已 clip 化（审查 m5） */
  const wrongIdx = () => {
    const q = FR.quiz;
    return q.options.map((v, i) => i !== q.answerIdx ? i : -1).filter(x => x >= 0);
  };
  startLevel(0);                                   // flat0：每错必播（r15 cut 四选一：错两张干扰）
  const wp0 = wrongIdx();
  await FR.tapCard(wp0[0]);
  await FR.tapCard(wp0[1]);
  const sayA = wrongPlays();                       // → 2
  startLevel(3);                                   // flat3：10s 节流
  lastWrongVoice = Date.now();                     /* flat0 分支不写时间戳，显式进入窗口内 */
  const wp3 = wrongIdx();
  await FR.tapCard(wp3[0]);                        // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                   // 增量 → 0
  startLevel(3);                                   // 同关重发 fresh quiz：miss===2 → force 豁免恰一次
  lastWrongVoice = 0;                              /* 隔离上一子用例时间戳 */
  const wp3b = wrongIdx();
  await FR.tapCard(wp3b[0]);                       // miss=1 → 播（10s 窗口早已过）
  await FR.tapCard(wp3b[1]);                       // miss=2 → force ===2 → 播
  const sayC = wrongPlays() - 2 - sayB;            // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC,
    note: 'r15：cut 4 选 1 干扰 3 张、read/eq 三选一 2 张、cmp 两选一 1 张——miss 封顶后第三/三错不存在，豁免 ===2 与 >=2 等价（家族统一写 ===2）' };

  /* ---- ②c 教学链单元：直调 tutorialWatch（watch clip→演示→重发→turn clip→接力题面 queue） ---- */
  total++;
  const vLog = [];
  const origPlay3 = KIDS.voice.play, origQueue3 = KIDS.voice.queue;
  KIDS.voice.play = function (key) { vLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { vLog.push(['q', JSON.stringify(parts)]); };
  startLevel(0);                                   // 干净起点（openingSpeak 走 stub 不入 vLog 顺序断言）
  await tutorialWatch();                           // SPEED=0.12 提速：watch 演示很快完成
  const tutHelp = FR.tutorial === 'help' && FR.quiz && FR.quiz.step === 0 &&
    FR.quiz.miss === 0 && FR.currentLevel.retries === 0;   // 重发同关零污染
  await wait(2300);                                // 等 2000ms 接力题面 queue 落地
  const iw = vLog.findIndex(v => v[0] === 'p' && v[1] === 'fra_tut_watch');
  const it = vLog.findIndex(v => v[0] === 'p' && v[1] === 'fra_tut_turn');
  const iq = vLog.findIndex(v => v[0] === 'q' && v[1].indexOf('fra_q_cut') >= 0);
  const cutParts = iq >= 0 ? JSON.parse(vLog[iq][1]) : null;
  const partsOk = !!cutParts && cutParts.length === 3 && cutParts[0] === 'fra_q_cut' &&
    cutParts[1] === 'fra_num_2' && cutParts[2] === 'fra_q_cut2';  // 全 clip 拼接（审查 M1 修复：禁 key:null TTS 段）
  const chainOk = tutHelp && iw >= 0 && it >= 0 && iw < it && it < iq && iq >= 0 && partsOk;
  KIDS.voice.play = origPlay3; KIDS.voice.queue = origQueue3;
  startLevel(0);                                   // 还原正常状态（后续单元用）
  if (chainOk) npass++;
  units.tutChain = { ok: chainOk, help: tutHelp, partsOk: partsOk,
    seq: vLog.filter(v => v[1].slice(0, 3) === 'fra').slice(0, 4) };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = FR.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                               // 首错：灰牌零惩罚；首错不 pulse 正确卡
      const w = q.options.findIndex((o, i) => i !== q.answerIdx);
      await FR.tapCard(w);
      wrongOk2 = FR.currentLevel.retries === 1 && FR.currentLevel.step === 0 &&
        !cardEl(q.answerIdx).classList.contains('pulse');
    }
    const r = await FR.tapCard(q.answerIdx);
    if (r !== 'right' && r !== 'done') smokeA = false;
    steps++;
  }
  const lvA = FR.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && steps === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B：flat16（ch3 r15 扁号）read 全章——热身 1/2 + 分数词 clip 强化 + 通关 3 星 ---- */
  total++;
  startLevel(16);
  const L16 = genLevel(16);
  const rule16 = L16.dch === 3 && L16.quizzes.every(q => q.kind === 'read') &&
    L16.quizzes[0].k === 1 && L16.quizzes[0].n === 2 &&                     // 首题热身
    L16.quizzes.every((q, i) => i === 0 || READ_SET.some(p => p[0] === q.k && p[1] === q.n)) &&
    L16.quizzes.every((q, i) => i === 0 || L16.quizzes[i - 1].k !== q.k || L16.quizzes[i - 1].n !== q.n);
  const plog16 = [];
  const origP16 = KIDS.voice.play;
  KIDS.voice.play = function (key) { plog16.push(String(key)); };
  await FR.tapCard(FR.quiz.answerIdx);           // qi0 答对：念分数词 fra_f_1_2（clip 强化）
  KIDS.voice.play = origP16;
  const wordOk = plog16.indexOf('fra_f_1_2') >= 0;
  let taps16 = wordOk ? 1 : 1, smB = wordOk;
  while (smB && FR.currentLevel && !FR.currentLevel.done && taps16 < 14) {
    const q = FR.quiz;
    if (!q) { smB = false; break; }
    const r = await FR.tapCard(q.answerIdx);
    taps16++;
    if (r !== 'right' && r !== 'done') smB = false;
  }
  const lv16 = FR.currentLevel;
  const smokeOkB = rule16 && wordOk && smB && lv16.done && lv16.won &&
    lv16.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat16 = { ok: smokeOkB, rule: rule16, wordClip: wordOk,
    answers: L16.quizzes.map(q => q.k + '/' + q.n), taps: taps16, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 C：flat24（ch4 r15 混 read 章）cmp——qi0 热身 1/2vs1/4 + 两卡 DOM 对账 + autoSolve 3 星 ---- */
  total++;
  startLevel(24);
  const L24 = genLevel(24);
  const rule24 = L24.dch === 4 &&
    L24.quizzes.every((q, i) => q.kind === (i % 2 === 0 ? 'cmp' : 'read')) &&   // r15 混 read
    L24.quizzes[0].pk === '1/2|1/4' &&                                          // 首题热身（差距最大对）
    L24.quizzes.every((q, i) => i === 0 || q.kind !== 'cmp' ||
      ['1/2|1/3', '1/3|1/4', '2/3|2/4'].indexOf(q.pk) >= 0) &&
    L24.quizzes.every(q => q.kind !== 'cmp' ||                                    // answerIdx=大块（仅 cmp 题——r15 混 read 章）
      q.answerIdx === (q.options[0].k / q.options[0].n > q.options[1].k / q.options[1].n ? 0 : 1));
  const dom24 = (function () {
    const q = FR.quiz;
    const cs = boardEl.querySelectorAll('.card');
    return q.kind === 'cmp' && cs.length === 2 && boardEl.dataset.k === 'cmp' &&
      Array.prototype.every.call(cs, (c, i) =>
        Number(c.dataset.i) === i && c.dataset.val === q.options[i].k + '-' + q.options[i].n);
  })();
  const a24 = await FR.autoSolve();               // 余题全对通关（autoSolve 路径，r15 8 题）
  const lv24 = FR.currentLevel;
  const smokeOkC = rule24 && dom24 && a24.done && a24.taps === CH_LEN && lv24.done && lv24.won &&
    lv24.retries === 0 && engStars(cur) === 3;
  if (smokeOkC) npass++;
  smokes.flat24 = { ok: smokeOkC, rule: rule24, domAlign: dom24, taps: a24.taps,
    kinds: L24.quizzes.map(q => q.kind === 'cmp' ? q.pk : q.k + '/' + q.n), stars: engStars(cur) };

  /* ---- ④ UI 冒烟 D：flat32（ch5 r15 新章）eq——qi0 热身 cmp → qi1 eq 参照块钩子/三块卡/等值答案 + 3 星 ---- */
  total++;
  startLevel(32);
  const L32 = genLevel(32);
  const rule32 = L32.dch === 5 &&
    L32.quizzes[0].kind === 'cmp' && L32.quizzes[0].pk === '1/2|1/4' &&        // 首题热身=已学对
    L32.quizzes.every((q, i) => i === 0 || (i % 2 === 1 ? q.kind === 'eq' : q.kind === 'cmp')) &&
    L32.quizzes.filter(q => q.kind === 'cmp').slice(1)
      .every(q => ['1/4|3/4', '1/4|2/4', '2/4|3/4', '1/3|2/3'].indexOf(q.pk) >= 0) &&  // 同分母对
    L32.quizzes.filter(q => q.kind === 'eq').every(q => q.pk === '1/2=2/4' || q.pk === '2/4=1/2');
  const eq0Warm = FR.quiz && FR.quiz.kind === 'cmp' && FR.quiz.ref === null;   // 热身题 ref 钩子为 null
  await FR.tapCard(FR.quiz.answerIdx);            // 答完热身 → qi1 = eq
  const qe = FR.quiz;
  const plog32 = [];
  const origP32 = KIDS.voice.play;
  KIDS.voice.play = function (key) { plog32.push(String(key)); };
  const dom32 = (function () {
    const cs = boardEl.querySelectorAll('.card');
    const pw = chipEl.querySelector('.pwrap');
    const qt = chipEl.querySelector('.qtext.small');
    return qe && qe.kind === 'eq' && qe.ref && (qe.ref.k + '/' + qe.ref.n === '1/2' || qe.ref.k + '/' + qe.ref.n === '2/4') &&
      qe.options.length === 3 && cs.length === 3 && boardEl.dataset.k === 'eq' &&
      Array.prototype.every.call(cs, (c, i) =>
        Number(c.dataset.i) === i && c.dataset.val === qe.options[i].k + '-' + qe.options[i].n) &&
      qe.options[qe.answerIdx].k / qe.options[qe.answerIdx].n === qe.ref.k / qe.ref.n &&   // 答案=参照等值
      qe.options.every((o, i) => qe.options.findIndex(x => x.k / x.n === o.k / o.n) === i) &&  // 值互异
      !!pw && pw.offsetWidth > 60 && !!qt && qt.textContent.indexOf('一样大') >= 0;
  })();
  const rEq = await FR.tapCard(qe.answerIdx);     // eq 答对：念答案分数词（如 fra_f_2_4）
  KIDS.voice.play = origP32;
  const eqWord = plog32.indexOf('fra_f_' + qe.options[qe.answerIdx].k + '_' + qe.options[qe.answerIdx].n) >= 0;
  const a32 = await FR.autoSolve();               // 余题全对通关
  const lv32 = FR.currentLevel;
  const smokeOkD = rule32 && eq0Warm && dom32 && rEq === 'right' && eqWord &&
    a32.done && lv32.done && lv32.won && lv32.retries === 0 && engStars(cur) === 3;
  if (smokeOkD) npass++;
  smokes.flat32 = { ok: smokeOkD, rule: rule32, warmRefNull: eq0Warm, domAlign: dom32,
    eqWord: eqWord, ref: qe && qe.ref, pairs: L32.quizzes.map(q => q.pk), taps: a32.taps, stars: engStars(cur) };

  /* ---- ⑤ 布局（竖屏三件套 r15）：双 viewport ×四题型；port 通道锚（body.port 与 @media 等值） ---- */
  async function simView(w, h, port) {
    const g = $id('game');
    document.body.classList.toggle('port', !!port);       // 竖屏类通道（与 @media 逐条等值——r15 三件套）
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                         // 按新场地尺寸重排
    await wait(760);                                      /* 等入场动画结束（card-in .42s 真实 ms） */
    const cards = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
    cards.forEach(c => c.classList.remove('pop'));        /* 量测前清 .pop：transform 中途陷阱（r15 定版） */
    const q = FR.quiz;
    const n = q.options.length;
    let countOk = cards.length === n;                     // n 卡 + data 与引擎对账
    cards.forEach((c, i) => {
      const o = q.options[i];
      const key = q.kind === 'cut' ? c.dataset.opt + '@' + c.dataset.rot
        : q.kind === 'read' ? c.dataset.num + '/' + c.dataset.den : c.dataset.val;
      const exp = q.kind === 'cut' ? o.t + o.n + '@' + o.rot
        : q.kind === 'read' ? o.num + '/' + o.den : o.k + '-' + o.n;
      if (Number(c.dataset.i) !== i || key !== exp) countOk = false;
    });
    /* 卡=主答案 ≥96 + 卡宽=题型档位锚（offsetWidth 量测：cut/read 136·cmp/eq 172；port 120/156） */
    const LAND_W = { cut: 136, read: 136, cmp: 172, eq: 172 };
    const PORT_W = { cut: 120, read: 120, cmp: 156, eq: 156 };
    const realPort = window.innerHeight > window.innerWidth;
    let cardOk = cards.length === n &&
      cards.every(c => c.offsetWidth >= 96 && c.offsetHeight >= 96);          /* 主答案按钮 ≥96（§0.9） */
    const cw = cards.length ? cards[0].offsetWidth : 0;
    const wantPort = PORT_W[q.kind], wantLand = LAND_W[q.kind];
    const portStyle = port ? (cw >= wantPort - 2 && cw <= wantPort + 2)
                           : (realPort || (cw >= wantLand - 2 && cw <= wantLand + 2));
    /* 卡内图形/分数字在界内（offset 几何——卡 position:relative 为 offsetParent，+8px 容差） */
    const insideOk = cards.every(c => {
      const inner = c.querySelector('.gwrap') || c.querySelector('.frac');
      return inner.offsetLeft >= -8 && inner.offsetTop >= -8 &&
             inner.offsetLeft + inner.offsetWidth <= c.offsetWidth + 8 &&
             inner.offsetTop + inner.offsetHeight <= c.offsetHeight + 8;
    });
    let chipOk = chipEl.offsetWidth >= 64 && chipEl.offsetHeight >= 64;   /* 题面卡可见性按题型 */
    if (q.kind === 'cut') chipOk = chipOk && chipEl.querySelector('.qtext b').textContent === String(q.n);
    else if (q.kind === 'read') {
      const pw = chipEl.querySelector('.pwrap');
      chipOk = chipOk && !!pw && pw.offsetWidth >= 60;
    } else if (q.kind === 'eq') {
      const pw = chipEl.querySelector('.pwrap');
      chipOk = chipOk && !!pw && pw.offsetWidth >= 60 &&
        chipEl.querySelector('.qtext.small').textContent.indexOf('一样大') >= 0;
    } else chipOk = chipOk && chipEl.querySelector('.qtext').textContent.indexOf('大') >= 0;
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      if (b.offsetWidth > 4 && b.offsetHeight > 4 && (b.offsetWidth < 64 || b.offsetHeight < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');       // 离场清理（竖屏类通道只在本量测内生效）
    return { vp: w + 'x' + h + (port ? 'P' : ''), kind: q.kind, dch: cur.dch, step: cur.step, n: n, cw: cw,
      countOk: countOk, card96: cardOk, portStyle: portStyle, insideOk: insideOk, chipOk: chipOk,
      btn64: btnOk, ox: ox,
      pass: countOk && cardOk && portStyle && insideOk && chipOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  startLevel(0);                                  // cut：四披萨卡（r15 4 选 1 最宽形态）
  sims.push(await simView(1280, 800, false)); sims.push(await simView(800, 1180, true));
  startLevel(16);                                 // read：分数卡 + 涂色披萨题面（ch3 qi0 即 read）
  sims.push(await simView(1280, 800, false)); sims.push(await simView(800, 1180, true));
  startLevel(24);                                 // cmp：两披萨块卡（最宽卡型）
  sims.push(await simView(1280, 800, false)); sims.push(await simView(800, 1180, true));
  startLevel(32);                                 // eq：三披萨块卡 + 参照块题面（推进 1 题到 qi1）
  engTap(cur, cur.quizzes[0].answerIdx);
  renderQuiz();
  sims.push(await simView(1280, 800, false)); sims.push(await simView(800, 1180, true));
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：字面量对账 / clips 注入 / 开场链 / 覆盖 / 裁决记录 ---- */
  total++;
  /* FRA_NUM 独立字面量对账（数词段拼接裁决的文本源，零手抄） */
  const numOk = FRA_NUM[2] === '两' && FRA_NUM[3] === '三' && FRA_NUM[4] === '四' &&
    Object.keys(FRA_NUM).length === 3;
  /* FRAC_NAME 独立字面量对账（SPEC §2 六条分数词定稿文案） */
  const FN_REF = { '1/2': '二分之一', '1/3': '三分之一', '1/4': '四分之一',
                   '2/3': '三分之二', '2/4': '四分之二', '3/4': '四分之三' };
  const nameOk = Object.keys(FN_REF).length === Object.keys(FRAC_NAME).length &&
    Object.keys(FN_REF).every(k => FRAC_NAME[k] === FN_REF[k]);
  /* fra_* clips 注入对账（r15：build 注入后 KIDS.voice.clips 应含全部 18 条=既有 17+fra_q_eq） */
  const FRA_KEYS = ['fra_tut_watch', 'fra_tut_turn', 'fra_hint', 'fra_q_cut', 'fra_q_cut2',
    'fra_q_read', 'fra_q_cmp', 'fra_q_eq', 'fra_f_1_2', 'fra_f_1_3', 'fra_f_1_4',
    'fra_f_2_3', 'fra_f_2_4', 'fra_f_3_4', 'fra_num_2', 'fra_num_3', 'fra_num_4', 'fra_wrong'];
  const clipOk = FRA_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：play(fra_hint) 后 2000ms 接力题面 queue（cut 拼接段） */
  const origP = KIDS.voice.play, origQ = KIDS.voice.queue;
  const playLog = [], queueLog = [];
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.queue = function (parts) { queueLog.push(parts); };
  startLevel(0);
  const openHint = playLog.indexOf('fra_hint') >= 0;
  await wait(2300);                               // 等 2000ms 接力 queue 落地
  const q0b = genLevel(0).quizzes[0];             // flat0 qi0 = cut n=2（确定性）
  const qParts = queueLog.find(p => p[0] === 'fra_q_cut');
  const openQ = !!qParts && qParts.length === 3 && qParts[1] === 'fra_num_' + q0b.n &&
    qParts[2] === 'fra_q_cut2';   /* 全 clip 拼接（审查 M1） */
  KIDS.voice.play = origP; KIDS.voice.queue = origQ;
  const distOk = numOk && nameOk && clipOk && openHint && openQ &&
    genDch[1] >= 1 && genDch[2] >= 1 && genDch[3] >= 1 && genDch[4] >= 1 && genDch[5] >= 1 &&  /* 生成关 dch 1-5 全覆盖 */
    kindDist.cut >= 1 && kindDist.read >= 1 && kindDist.cmp >= 1 && kindDist.eq >= 1 &&      /* 80 关四题型全覆盖 */
    Object.keys(readAns).every(k => readAns[k] >= 1) &&                      /* read 答案全覆盖（r15 含 1/3、1/4） */
    Object.keys(cmpPairs).every(k => cmpPairs[k] >= 1) &&                    /* cmp 对子全覆盖（同分子 3+热身+同分母 4） */
    Object.keys(eqPairs).every(k => eqPairs[k] >= 1);                       /* eq 等值双向全覆盖 */
  if (distOk) npass++;
  units.dist = { ok: distOk, fraNum: numOk, fracName: nameOk, clips: clipOk,
    openHint: openHint, openQ: openQ, genDch: genDch, kindDist: kindDist,
    readAns: readAns, cmpPairs: cmpPairs, eqPairs: eqPairs };

  /* ---- ⑦ 时长模型单元（crd r12 范式 r15）：独立副本复算 + 80 关 parity + dMin 精确断言 ---- */
  total++;
  const estMsV = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）
  const V_GAP = 150;                              // queue 段间停顿（core 实码）
  const V_OPEN = estMsV('看一看，每份一样大') + 2000;    // 开场链（9 字 → 3705+2000=5705）
  const V_VOICE = {
    cut: estMsV('哪一个平均分成了') + estMsV('两') + estMsV('份') + 2 * V_GAP,   // 8+1+1 字+2 停顿=5550
    read: estMsV('涂色部分是几分之几'),                    // 9 字 → 3705
    cmp: estMsV('哪一块大'),                               // 4 字 → 1980
    eq: estMsV('哪一块和它一样大')                         // 8 字 → 3360（r15）
  };
  const V_DECIDE = { cut: 8500, read: 7000, cmp: 5500, eq: 7500 };   // r15 四题型（SPEC r15 推算）
  const V_ADV_B = 620, V_ADV_W = 1450, V_MIN = 40000;
  const quizDurV = q => Math.max(V_VOICE[q.kind], V_DECIDE[q.kind]) + V_ADV_B + (q.kind !== 'cut' ? V_ADV_W : 0);
  const levelDurV = L => V_OPEN + L.quizzes.reduce((s, q) => s + quizDurV(q), 0);
  let dMin = Infinity, dFlat = -1, parityOk = true, minOk = true;
  for (let flat = 0; flat < 80; flat++) {
    const dv = levelDurV(genLevel(flat)), ds = modeled(flat);
    if (Math.abs(dv - ds) > 0.001) parityOk = false;                     // 独立副本 vs 源模型逐关一致
    if (dv < V_MIN) minOk = false;                                       // 每关 ≥ LEVEL_MIN_MS
    if (dv < dMin) { dMin = dv; dFlat = flat; }
  }
  /* 源常量同步断言（estMs 全字符口径/VOICE_MS/DECIDE_MS/ADV/OPEN/LEVEL_MIN_MS——build.py 另做字面 assert） */
  const constOk = estMs('看一看，每份一样大') === 3705 && estMs('哪一块和它一样大') === 3360 &&
    estMs('哪一个平均分成了') === 3360 && OPEN_MS === 5705 &&
    VOICE_MS.cut === 5550 && VOICE_MS.read === 3705 && VOICE_MS.cmp === 1980 && VOICE_MS.eq === 3360 &&
    DECIDE_MS.cut === 8500 && DECIDE_MS.read === 7000 && DECIDE_MS.cmp === 5500 && DECIDE_MS.eq === 7500 &&
    ADV_BASE === 620 && ADV_WORD === 1450 && LEVEL_MIN_MS === 40000 &&
    CH_LEN === 8 && STATIC_LEVELS === 40 && N_CHAPTERS === 5;
  const durUnitOk = minOk && parityOk && constOk && dMin >= V_MIN &&
    dMin === 72265 && dFlat === 24;                 /* 80 关 modeled 最低值精确断言（防回漂；dch4 混 read 章首次出现=flat24） */
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
    wantMin: 72265, parity: parityOk, constOk: constOk, minOk: minOk };

  const out = { game: 'fraction', total: total, pass: npass, layoutOk: layoutOk,
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
