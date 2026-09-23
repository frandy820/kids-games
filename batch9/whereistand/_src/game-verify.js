/* ================= ?verify=1 自检（仅 verify 分支加载执行；r33 谱=SPEC-R33-WHEREISTAND）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39，每关一记）：确定性（同 flat 两次生成 JSON 一致）/
     structWhy（四题型自洽：mode/dir/orient、ordinal k∈1-5、two k∈2-4 同 orient、flip refIdx∈1-3、
     line 5 只互异且在库、answerIdx 公式复算）/
     **two/flip 答案独立字面复算**（不调引擎公式函数：two 参照邻位 / flip 镜像律横排左=屏幕右、
     竖排上下不镜像）/
     章型规则（dch1 全 edge 四向混出 up=2+down/left/right 各 1+qi0 恒 up / dch2 edge=2+ordinal=3+
     qi0 恒 edge / dch3 two=3+ordinal=2+qi0 恒 ordinal / dch4 四型各 ≥1；生成关=随机型 structWhy 把关）/
     引擎直驱（首题连错 2 次同卡可重点 → 全对通关 2 星；另全对 3 星）
   ② tapSlot 单元（flat0 真实 UI）：首错=晃动不灰掉（pointer-events 保留）+miss 计数+首错不 pulse /
     同卡二错=miss 2+正确位 pulse / 非法下标 false / 答对 lit（演出窗内同步读）+step 推进
   ②b sayW 三态（审查 m1 页面级）：flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次
   ③ UI 冒烟 A：flat0 真实通路通关（1 错=2 星，verify 页不弹层）
   ④ B1 flat10（dch3）：two=3+ordinal=2 结构+首题 ordinal 序数大字+two 题面行双箭头取证+autoSolve 3 星；
     B2 flat17（dch4）：四型各 ≥1+真实 tapSlot 通关；
     **B3 新题型交叉面深冒烟（r29 交叉断言双向）**：two 引擎级参照位误点（只做第一步）+
     反向邻位误点（方向词混淆）均 wrong→答对通关 2★；flip 引擎级镜像律+朴素侧（未翻转/过度翻转）
     误点+点参照动物本身误点→通关 2★；flip UI 级真实 DOM（chip 参照头像 data-a 对账+朴素侧 wig+答对）
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×五形态（vert edge / horiz edge / horiz two /
     horiz flip / vert flip——后四者谓词扫描定位）：5 卡齐全、卡=主答案 ≥96、动物 SVG ≥64、
     svg data-a 与 line 对账、全按钮 ≥64（.k-parentbtn 豁免）、卡在场景内、overflowX ≤0
   ⑥ 分布与专项：40 关四型分布（静态章型构造性精确值+生成关随机面 ≥ 下限）/ ordinal k 1-5+
     two k 2-4 覆盖 / ordinalCn·twoCn·flipCn 独立字表对账 / WIS2_TEXTS 28 键零手抄对账 /
     wis_* clips 注入存在（28 键=8 指令+20 ordinal 含 T46 wis_wrong；wis2_ 28 新键主线注册后同注入
     ——build clips 59，SPEC-R33 §R10）/
     开场链 stub（edge/ordinal 两段+two/flip 三段——首题即该型的关扫描驱动+重听 speakQuiz 直调） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const staticDist = { 1: { edge: 0, ordinal: 0, two: 0, flip: 0 }, 2: { edge: 0, ordinal: 0, two: 0, flip: 0 },
                       3: { edge: 0, ordinal: 0, two: 0, flip: 0 }, 4: { edge: 0, ordinal: 0, two: 0, flip: 0 } };
  const genMode = { edge: 0, ordinal: 0, two: 0, flip: 0 };
  const dirDist = { up: 0, down: 0, left: 0, right: 0 };
  const genDir = { up: 0, down: 0, left: 0, right: 0 };
  const kDist = [0, 0, 0, 0, 0, 0];               // ordinal kDist[k]（k=1-5）
  const twoK = [0, 0, 0, 0, 0];                   // two twoK[k]（k=2-4）
  /* two/flip 答案独立字面公式（SPEC-R33 §R1/§R3——禁调 twoAnswerIdx/flipAnswerIdx 同源函数） */
  const litTwo = (q) => {
    const ref = (q.dir === 'up' || q.dir === 'left') ? q.k - 1 : CH_LEN - q.k;
    return (q.dir2 === 'up' || q.dir2 === 'left') ? ref - 1 : ref + 1;
  };
  const litFlip = (q) => q.orient === 'horiz'
    ? (q.dir2 === 'left' ? q.refIdx + 1 : q.refIdx - 1)
    : (q.dir2 === 'up' ? q.refIdx - 1 : q.refIdx + 1);

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let structAll = true, ruleOk = true, driveOk = true, literalOk = true;
    const cnt = { edge: 0, ordinal: 0, two: 0, flip: 0, up: 0, down: 0, left: 0, right: 0, vert: 0, horiz: 0 };
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q)) structAll = false;
      cnt[q.mode]++;
      cnt[q.dir || q.dir2]++;                     // 主方向：edge/ordinal/two=dir、flip=dir2
      cnt[q.orient]++;
      dirDist[q.dir || q.dir2]++;
      if (q.mode === 'ordinal') kDist[q.k]++;
      if (q.mode === 'two') twoK[q.k]++;
      if (q.mode === 'two' && q.answerIdx !== litTwo(q)) literalOk = false;
      if (q.mode === 'flip' && q.answerIdx !== litFlip(q)) literalOk = false;
      if (flat < STATIC_LEVELS) staticDist[L1.dch][q.mode]++;
      else { genMode[q.mode]++; genDir[q.dir || q.dir2]++; }
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    if (flat < STATIC_LEVELS) {                   // 静态四章按 SPEC-R33 §R2 章型
      if (L1.dch === 1 && !(cnt.edge === 5 && cnt.up === 2 && cnt.down === 1 &&
          cnt.left === 1 && cnt.right === 1 && L1.quizzes[0].dir === 'up')) ruleOk = false;
      if (L1.dch === 2 && !(cnt.edge === 2 && cnt.ordinal === 3 &&
          L1.quizzes[0].mode === 'edge')) ruleOk = false;
      if (L1.dch === 3 && !(cnt.two === 3 && cnt.ordinal === 2 &&
          L1.quizzes[0].mode === 'ordinal')) ruleOk = false;
      if (L1.dch === 4 && !(cnt.edge >= 1 && cnt.ordinal >= 1 &&
          cnt.two >= 1 && cnt.flip >= 1)) ruleOk = false;
    } else {                                      // 生成关=四型随机（SPEC-R33 §R3），合法性由 structWhy 把关
      if (cnt.edge + cnt.ordinal + cnt.two + cnt.flip !== CH_LEN) ruleOk = false;
    }
    /* 引擎直驱：首题同卡连错 2 次（答错不灰掉可重点，retries=2）→ 逐题答对通关（2 星）；
       另取新关全对通关（3 星） */
    const Ld = genLevel(flat);
    const q0 = Ld.quizzes[0];
    const wi = (q0.answerIdx + 1) % CH_LEN;
    if (engTap(Ld, wi) !== 'wrong' || Ld.retries !== 1 || q0._miss !== 1) driveOk = false;
    if (engTap(Ld, wi) !== 'wrong' || Ld.retries !== 2 || q0._miss !== 2) driveOk = false;
    for (let k = 0; k < CH_LEN && driveOk; k++) {
      const want = k === CH_LEN - 1 ? 'done' : 'goal';
      if (engTap(Ld, Ld.quizzes[k].answerIdx) !== want) driveOk = false;
    }
    if (!Ld.done || Ld.step !== CH_LEN || engStars(Ld) !== 2) driveOk = false;
    const L3 = genLevel(flat);
    for (let k = 0; k < CH_LEN; k++) engTap(L3, L3.quizzes[k].answerIdx);
    if (!L3.done || engStars(L3) !== 3) driveOk = false;
    const ok = det && structAll && ruleOk && driveOk && literalOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, ruleOk: ruleOk,
      driveOk: driveOk, literalOk: literalOk,
      qs: L1.quizzes.map(q => q.mode[0] + ':' + (q.dir || q.dir2) +
        (q.mode === 'ordinal' ? q.k : '') +
        (q.mode === 'two' ? q.k + '>' + q.dir2 : '') +
        (q.mode === 'flip' ? q.refIdx : '') + '=' + q.answerIdx) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapSlot 单元（flat 0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = WIS.quiz;
  const cards0 = Array.prototype.slice.call(lineEl.querySelectorAll('.card'));
  /* DOM 对账：5 张卡 data-i 0-4、svg data-a 与引擎 line 一致（渲染即引擎） */
  const alignOk = q0 && cards0.length === CH_LEN && cards0.every((c, i) =>
    Number(c.dataset.i) === i &&
    c.querySelector('svg').getAttribute('data-a') === q0.line[i]);
  const wi2 = (q0.answerIdx + 1) % CH_LEN;
  const rW = await WIS.tapSlot(wi2);              // 首错：晃动不灰掉+miss 计数+首错不 pulse
  const wEl = cardEl(wi2), okEl = cardEl(q0.answerIdx);
  const wrongOk = rW === 'wrong' && WIS.quiz.miss === 1 && WIS.currentLevel.retries === 1 &&
    WIS.quiz.step === 0 && wEl.classList.contains('wig') &&
    !wEl.classList.contains('dim') &&
    getComputedStyle(wEl).pointerEvents !== 'none' &&      /* 不灰掉：场景卡全可点（SPEC §1） */
    !okEl.classList.contains('breathe');                   /* 首错不 pulse */
  const rW2 = await WIS.tapSlot(wi2);             // 同卡二错：可重点+miss=2 → pulse 正确位
  const wrong2Ok = rW2 === 'wrong' && WIS.quiz.miss === 2 && WIS.currentLevel.retries === 2 &&
    WIS.quiz.step === 0 && okEl.classList.contains('breathe');
  const badIdx = (await WIS.tapSlot(CH_LEN)) === false && (await WIS.tapSlot(-1)) === false &&
    (await WIS.tapSlot('x')) === false && (await WIS.tapSlot(1.5)) === false;
  const pOk = WIS.tapSlot(q0.answerIdx);          // 答对：lit 演出窗内同步读（renderQuiz 前）
  const litOk = cardEl(q0.answerIdx).classList.contains('lit');
  const rOk = await pOk;
  const stepOk = rOk === 'goal' && litOk && WIS.quiz && WIS.quiz.step === 1;   /* 新题未答（step 推进即证） */
  const tapOk = alignOk && wrongOk && wrong2Ok && badIdx && stepOk;
  if (tapOk) npass++;
  units.tapSlot = { ok: tapOk, align: alignOk, wrong: wrongOk, wrong2: wrong2Ok,
    badIdx: badIdx, step: stepOk };

  /* ---- ②b sayW 三态（审查 m1 补页面级：flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  /* T46 阶段2：纠错句 clip 化——key 从 null 变 wis_wrong（文本族 SPEC 不变） */
  const wrongPlays = () => wLog.filter(p => p[0] === 'wis_wrong' && p[1].indexOf('再想') === 0).length;
  const wrongIdx = () => (WIS.quiz.answerIdx + 1) % CH_LEN;
  startLevel(0);                                   // flat0：每错必播
  await WIS.tapSlot(wrongIdx());
  await WIS.tapSlot(wrongIdx());
  const sayA = wrongPlays();                       // → 2
  startLevel(3);                                   // flat3：10s 节流
  lastWrongVoice = Date.now();                     /* flat0 分支不写时间戳，显式进入窗口内 */
  await WIS.tapSlot(wrongIdx());                   // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                   // 增量 → 0
  startLevel(3);                                   // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                              /* 隔离上一子用例时间戳（force 子用例从新窗口起算） */
  await WIS.tapSlot(wrongIdx());                   // miss=1 → 播
  await WIS.tapSlot(wrongIdx());                   // miss=2 → force → 播
  const sayC = wrongPlays() - 2 - sayB;            // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = WIS.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                               // 首错：零惩罚；首错不 pulse 正确位
      await WIS.tapSlot((q.answerIdx + 1) % CH_LEN);
      wrongOk2 = WIS.currentLevel.retries === 1 && WIS.currentLevel.step === 0 &&
        !cardEl(q.answerIdx).classList.contains('breathe');
    }
    const r = await WIS.tapSlot(q.answerIdx);
    if (r !== 'goal' && r !== 'done') smokeA = false;
    steps++;
  }
  const lvA = WIS.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && steps === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat10（dch3 转个弯）two=3+ordinal=2 + 序数大字 + two 双箭头 + autoSolve 3 星 ---- */
  total++;
  startLevel(10);
  const L10 = genLevel(10);
  let c10 = { edge: 0, ordinal: 0, two: 0, flip: 0, horiz: 0, vert: 0 };
  L10.quizzes.forEach(q => { c10[q.mode]++; c10[q.orient]++; });
  const q10 = WIS.quiz;                           // 首题恒 ordinal（r33 结构锚）：题面行序数大字 k
  const chipK = chipEl.querySelector('.fk b');
  const chipOk = q10 && q10.mode === 'ordinal' && chipK && chipK.textContent === String(q10.k);
  /* 驱动至首个 two 题：题面行=双方向箭头+第k个（两子句视觉冗余） */
  let twoChipOk = false, guard10 = 0;
  while (WIS.quiz && WIS.quiz.mode !== 'two' && guard10++ < CH_LEN) {
    await WIS.tapSlot(WIS.quiz.answerIdx);
  }
  if (WIS.quiz && WIS.quiz.mode === 'two') {
    const dirsN = chipEl.querySelectorAll('.fdir').length;
    const kb = chipEl.querySelector('.fk b');
    twoChipOk = dirsN === 2 && kb && kb.textContent === String(WIS.quiz.k);
  }
  const a10 = await WIS.autoSolve();
  const lv10 = WIS.currentLevel;
  const smokeOkB1 = c10.two === 3 && c10.ordinal === 2 && c10.edge === 0 && c10.flip === 0 &&
    c10.horiz >= 1 && c10.vert >= 1 &&
    chipOk && twoChipOk && a10.done && lv10.done && lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat10 = { ok: smokeOkB1, dist: c10, chip: chipOk, twoChip: twoChipOk, taps: a10.taps, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat17（dch4 全都要）四型各 ≥1、真实点击通关 ---- */
  total++;
  startLevel(17);
  const L17 = genLevel(17);
  let c17 = { edge: 0, ordinal: 0, two: 0, flip: 0 };
  L17.quizzes.forEach(q => { c17[q.mode]++; });
  const kindsOk = c17.edge >= 1 && c17.ordinal >= 1 && c17.two >= 1 && c17.flip >= 1;
  let mixTapOk = true;
  for (let s = 0; s < CH_LEN && mixTapOk; s++) {
    const q = WIS.quiz;
    if (!q) { mixTapOk = false; break; }
    const r = await WIS.tapSlot(q.answerIdx);
    if (r !== 'goal' && r !== 'done') mixTapOk = false;
  }
  const lv17 = WIS.currentLevel;
  const smokeOkB2 = kindsOk && mixTapOk && lv17.done && lv17.won && lv17.retries === 0;
  if (smokeOkB2) npass++;
  smokes.flat17 = { ok: smokeOkB2, kinds: kindsOk, dist: c17,
    qs: L17.quizzes.map(q => q.mode + ':' + (q.dir || q.dir2) + (q.mode === 'ordinal' ? q.k : '') +
      (q.mode === 'two' ? q.k + '>' + q.dir2 : '') + (q.mode === 'flip' ? q.refIdx : '')),
    retries: lv17.retries };

  /* ---- ④b B3 新题型交叉面深冒烟（r29 交叉断言双向；two/flip 各有断言实体，无条件跳过） ---- */
  total++;
  let twoFound = null, flipFound = null;
  for (let f = 0; f < 40 && (!twoFound || !flipFound); f++) {
    const L = genLevel(f);
    for (let i = 0; i < CH_LEN; i++) {
      const q = L.quizzes[i];
      if (!twoFound && q.mode === 'two') twoFound = { flat: f, qi: i, q: q };
      if (!flipFound && q.mode === 'flip') flipFound = { flat: f, qi: i, q: q };
    }
  }
  /* twoCross（引擎级）：参照位误点=「只做第一步」捕获器 / 反向邻位误点=方向词混淆捕获器，
     两误点均 wrong（answerIdx≠二者=判别力前提）→ 答对 → 全关通关 2★ */
  let twoCross = false;
  if (twoFound) {
    const Lt = genLevel(twoFound.flat);
    const q = Lt.quizzes[twoFound.qi];
    for (let s = 0; s < twoFound.qi; s++) engTap(Lt, Lt.quizzes[s].answerIdx);
    const ref = litTwo0(q);                       // 参照位=ordinal 字面公式
    const opp = (q.dir2 === 'up' || q.dir2 === 'left') ? ref + 1 : ref - 1;   // 反方向邻位
    twoCross = q.answerIdx !== ref && q.answerIdx !== opp &&
      engTap(Lt, ref) === 'wrong' && q._miss === 1 &&
      engTap(Lt, opp) === 'wrong' && q._miss === 2 &&
      engTap(Lt, q.answerIdx) === 'goal';
    for (let s = Lt.step; s < CH_LEN; s++) engTap(Lt, Lt.quizzes[s].answerIdx);
    twoCross = twoCross && Lt.done && engStars(Lt) === 2;
  }
  function litTwo0(q) {                           // 参照位独立复算（勿调引擎 ordinal 同源函数）
    return (q.dir === 'up' || q.dir === 'left') ? q.k - 1 : CH_LEN - q.k;
  }
  /* flipMir（引擎级）：镜像律断言（横排 dir2=left→answerIdx=refIdx+1 即它的左=屏幕右；
     竖排不镜像）+ 朴素侧误点（未翻转/过度翻转）+ 点参照动物本身误点 → 通关 2★ */
  let flipMir = false;
  if (flipFound) {
    const Lf = genLevel(flipFound.flat);
    const q = Lf.quizzes[flipFound.qi];
    for (let s = 0; s < flipFound.qi; s++) engTap(Lf, Lf.quizzes[s].answerIdx);
    const want = litFlip(q);
    const naive = q.orient === 'horiz'
      ? (q.dir2 === 'left' ? q.refIdx - 1 : q.refIdx + 1)
      : (q.dir2 === 'up' ? q.refIdx + 1 : q.refIdx - 1);
    flipMir = q.answerIdx === want && want !== naive &&
      engTap(Lf, naive) === 'wrong' && q._miss === 1 &&
      engTap(Lf, q.refIdx) === 'wrong' && q._miss === 2 &&
      engTap(Lf, q.answerIdx) === 'goal';
    for (let s = Lf.step; s < CH_LEN; s++) engTap(Lf, Lf.quizzes[s].answerIdx);
    flipMir = flipMir && Lf.done && engStars(Lf) === 2;
  }
  /* flipUi（UI 级真实 DOM）：chip 参照头像与 line[refIdx] 对账 + 双向箭头在场（不指答案）+
     朴素侧真实点击 wig + 答对 goal */
  let flipUi = false;
  if (flipFound) {
    startLevel(flipFound.flat);
    let g3 = 0;
    while (WIS.quiz && WIS.quiz.step < flipFound.qi && g3++ < CH_LEN + 1) {
      await WIS.tapSlot(WIS.quiz.answerIdx);
    }
    const qf = WIS.quiz;
    if (qf && qf.mode === 'flip') {
      const fan = chipEl.querySelector('.fan svg');
      const naive2 = qf.orient === 'horiz'
        ? (qf.dir2 === 'left' ? qf.refIdx - 1 : qf.refIdx + 1)
        : (qf.dir2 === 'up' ? qf.refIdx + 1 : qf.refIdx - 1);
      const rN = await WIS.tapSlot(naive2);
      const wigOk = rN === 'wrong' && cardEl(naive2).classList.contains('wig');
      const rG = await WIS.tapSlot(qf.answerIdx);
      flipUi = !!fan && fan.getAttribute('data-a') === qf.line[qf.refIdx] &&
        !!chipEl.querySelector('.fdir') && wigOk && rG === 'goal';
    }
  }
  const b3Ok = !!twoFound && !!flipFound && twoCross && flipMir && flipUi;
  if (b3Ok) npass++;
  units.b3 = { ok: b3Ok, twoFlat: twoFound && twoFound.flat, twoQi: twoFound && twoFound.qi,
    twoCross: twoCross, flipFlat: flipFound && flipFound.flat, flipQi: flipFound && flipFound.qi,
    flipMir: flipMir, flipUi: flipUi };

  /* ---- ⑤ 布局：双 viewport × 五形态（vert edge / horiz edge / horiz two / horiz flip / vert flip） ---- */
  async function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                 // 按新场地尺寸重排
    await wait(750);                              /* 等入场 stagger 动画结束再量（§0.11 transform 中途陷阱） */
    const de = document.documentElement;
    const q = WIS.quiz;
    const cards = Array.prototype.slice.call(lineEl.querySelectorAll('.card'));
    let countOk = cards.length === CH_LEN;        // 5 卡齐全 + svg 与引擎 line 对账
    cards.forEach((c, i) => {
      const s = c.querySelector('svg');
      if (Number(c.dataset.i) !== i || !s || s.getAttribute('data-a') !== q.line[i]) countOk = false;
    });
    const rects = cards.map(c => c.getBoundingClientRect());
    const cardOk = rects.length === CH_LEN &&
      rects.every(r => r.width >= 96 && r.height >= 96);          /* 主答案按钮 ≥96（§0.9） */
    const svgs = cards.map(c => c.querySelector('svg').getBoundingClientRect());
    const svgOk = svgs.every(r => r.width >= 64 && r.height >= 64);   /* 动物 SVG ≥64 专项 */
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const fRect = fieldEl.getBoundingClientRect();
    const insideOk = rects.every(r =>             // 卡在场景内（不溢出）
      r.left >= fRect.left - 1 && r.right <= fRect.right + 1 &&
      r.top >= fRect.top - 1 && r.bottom <= fRect.bottom + 1);
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, orient: q.orient, mode: q.mode, countOk: countOk, card96: cardOk,
      svg64: svgOk, btn64: btnOk, insideOk: insideOk, ox: ox,
      pass: countOk && cardOk && svgOk && btnOk && insideOk && ox <= 0 };
  }
  total++;
  const sims = [];
  const gotoQuiz = (pred) => {                    // 谓词扫描定位（r33：谱内方向随机，不再恒定 flat 锚）
    for (let f = 0; f < 40; f++) {
      const L = genLevel(f);
      for (let i = 0; i < CH_LEN; i++) {
        if (pred(L.quizzes[i])) { startLevel(f); cur.step = i; renderQuiz(); return true; }
      }
    }
    return false;
  };
  const mk = async (label, pred) => {
    for (const vp of [[1280, 800], [800, 1180]]) {
      const hit = gotoQuiz(pred);
      const r = hit ? await simView(vp[0], vp[1])
        : { form: label, vp: vp[0] + 'x' + vp[1], pass: false, miss: 'no-quiz' };
      r.form = label;
      sims.push(r);
    }
  };
  await mk('vertEdge', q => q.mode === 'edge' && q.orient === 'vert');      // flat0 q0 恒命中
  await mk('horizEdge', q => q.mode === 'edge' && q.orient === 'horiz');
  await mk('horizTwo', q => q.mode === 'two' && q.orient === 'horiz');
  await mk('horizFlip', q => q.mode === 'flip' && q.orient === 'horiz');    // flip 镜像主战场
  await mk('vertFlip', q => q.mode === 'flip' && q.orient === 'vert');      // ↕ 图标与不镜像面
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：章型分布 / k 覆盖 / 文案字表对账 / WIS2 28 键 / clips 注入 / 开场·重听链 stub ---- */
  total++;
  /* ordinalCn/twoCn/flipCn 文案独立字表对账（零手抄） */
  const DIRCN = { left: '左', right: '右', up: '上', down: '下' };
  const NUM5 = ['', '一', '二', '三', '四', '五'];
  let cnOk = true;
  ALL_DIRS.forEach(d => {
    for (let k = 1; k <= 5; k++) {
      if (ordinalCn(d, k) !== '从' + DIRCN[d] + '边数，第' + NUM5[k] + '个是谁呀') cnOk = false;
    }
  });
  ALL_DIRS.forEach(d1 => ALL_DIRS.forEach(d2 => {
    if (DIRS[d1].orient !== DIRS[d2].orient) return;   // two 两步同 orient 全组合
    [2, 3, 4].forEach(k => {
      if (twoCn(d1, k, d2) !== '从' + DIRCN[d1] + '边数，第' + NUM5[k] + '个，它的' + DIRCN[d2] + '边，是谁呀') cnOk = false;
    });
  }));
  if (flipCn('小猫咪', 'left') !== '小猫咪的左边，是谁呀') cnOk = false;
  /* WIS2_TEXTS 28 键（12 from+4 go+8 name+4 side）零手抄对账：键名计数/互异/样例键+样例文案 */
  const w2keys = WIS2_TEXTS.map(x => x[0]);
  const w2map = {};
  WIS2_TEXTS.forEach(x => { w2map[x[0]] = x[1]; });
  const textsOk = WIS2_TEXTS.length === 28 && w2keys.filter((v, i, a) => a.indexOf(v) === i).length === 28 &&
    w2map['wis2_from_left_2'] === '从左边数，第二个' && w2map['wis2_from_left_4'] === '从左边数，第四个' &&
    w2map['wis2_go_right'] === '它的右边，是谁呀' && w2map['wis2_go_up'] === '它的上边，是谁呀' &&
    w2map['wis2_name_cat'] === '小猫咪' && w2map['wis2_name_duck'] === '小鸭子' &&
    w2map['wis2_side_left'] === '的左边，是谁呀' && w2map['wis2_side_down'] === '的下边，是谁呀';
  /* wis_* clips 注入对账（28 键全在册=8 指令+20 ordinal 含 T46 wis_wrong；wis2_ 28 新键主线已注册注入——build clips 59，r33 审查 m2 勘正） */
  const WIS_KEYS = ['wis_hint', 'wis_q_down', 'wis_q_left', 'wis_q_right', 'wis_q_up',
    'wis_tut_turn', 'wis_tut_watch', 'wis_wrong']
    .concat(Object.keys(DIRS).flatMap(d => [1, 2, 3, 4, 5].map(k => 'wis_ord_' + d + '_' + k)));   /* T46 阶段2：+wrong 1+ordinal 20 */
  const clipOk = WIS_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场/重听链（stub 记录）：edge/ordinal=queue([wis_hint, 题面 clip]) 两段；
     two/flip=queue([wis_hint, 链段1, 链段2]) 三段（首题即该型的关扫描驱动） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                  // flat0 首题恒 edge up（r33 教学锚）
  const openEdge = qLog.length === 1 && qLog[0].length === 2 &&
    qLog[0][0] === 'wis_hint' && qLog[0][1] === 'wis_q_up';
  startLevel(10);                                 // dch3 首题恒 ordinal（r33 结构锚）
  const q10b = genLevel(10).quizzes[0];
  const openOrd = qLog.some(p => p.length === 2 && p[0] === 'wis_hint' &&
    p[1] === 'wis_ord_' + q10b.dir + '_' + q10b.k);
  let twoFirst = -1, flipFirst = -1;              // 扫描首题即 two/flip 的关（谱确定性→断言确定性）
  for (let f = 0; f < 40; f++) {
    const m0 = genLevel(f).quizzes[0].mode;
    if (m0 === 'two' && twoFirst < 0) twoFirst = f;
    if (m0 === 'flip' && flipFirst < 0) flipFirst = f;
  }
  let openTwo = false, openFlip = false;
  if (twoFirst >= 0) {
    const qt = genLevel(twoFirst).quizzes[0];
    startLevel(twoFirst);
    openTwo = qLog.some(p => p.length === 3 && p[0] === 'wis_hint' &&
      p[1] === WIS2.fromKey(qt.dir, qt.k) && p[2] === WIS2.goKey(qt.dir2));
  }
  if (flipFirst >= 0) {
    const qf2 = genLevel(flipFirst).quizzes[0];
    startLevel(flipFirst);
    openFlip = qLog.some(p => p.length === 3 && p[0] === 'wis_hint' &&
      p[1] === WIS2.nameKey(qf2.line[qf2.refIdx]) && p[2] === WIS2.sideKey(qf2.dir2));
  }
  qLog.length = 0;                                // 重听通道（speakQuiz 直调，r33 两段链键序）
  speakQuiz({ mode: 'two', dir: 'left', k: 2, dir2: 'right' });
  const hearTwo = qLog.length === 1 && qLog[0].length === 2 &&
    qLog[0][0] === 'wis2_from_left_2' && qLog[0][1] === 'wis2_go_right';
  speakQuiz({ mode: 'flip', line: ANIMAL_IDS.slice(0, 5), refIdx: 2, dir2: 'left', orient: 'horiz' });
  const hearFlip = qLog.length === 2 && qLog[1].length === 2 &&
    qLog[1][0] === 'wis2_name_' + ANIMAL_IDS[2] && qLog[1][1] === 'wis2_side_left';
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const distOk = cnOk && textsOk && clipOk && openEdge && openOrd &&
    twoFirst >= 0 && flipFirst >= 0 && openTwo && openFlip && hearTwo && hearFlip &&
    staticDist[1].edge === 25 && staticDist[1].ordinal === 0 && staticDist[1].two === 0 && staticDist[1].flip === 0 &&
    staticDist[2].edge === 10 && staticDist[2].ordinal === 15 && staticDist[2].two === 0 && staticDist[2].flip === 0 &&
    staticDist[3].ordinal === 10 && staticDist[3].two === 15 && staticDist[3].edge === 0 && staticDist[3].flip === 0 &&
    staticDist[4].edge >= 5 && staticDist[4].ordinal >= 5 && staticDist[4].two >= 5 && staticDist[4].flip >= 5 &&
    genMode.edge >= 1 && genMode.ordinal >= 1 && genMode.two >= 1 && genMode.flip >= 1 &&   /* 生成关四型都出现 */
    genDir.up >= 1 && genDir.down >= 1 && genDir.left >= 1 && genDir.right >= 1 &&
    dirDist.up >= 1 && dirDist.down >= 1 && dirDist.left >= 1 && dirDist.right >= 1 &&
    kDist[1] >= 1 && kDist[2] >= 1 && kDist[3] >= 1 && kDist[4] >= 1 && kDist[5] >= 1 &&
    twoK[2] >= 1 && twoK[3] >= 1 && twoK[4] >= 1;
  if (distOk) npass++;
  units.dist = { ok: distOk, numCn: cnOk, w2Texts: textsOk, clips: clipOk, openEdge: openEdge,
    openOrd: openOrd, twoFirst: twoFirst, openTwo: openTwo, flipFirst: flipFirst, openFlip: openFlip,
    hearTwo: hearTwo, hearFlip: hearFlip,
    staticDist: staticDist, genMode: genMode, genDir: genDir, dirDist: dirDist,
    kDist: kDist.slice(1), twoK: twoK.slice(2) };

  const out = { game: 'whereistand', total: total, pass: npass, layoutOk: layoutOk,
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
