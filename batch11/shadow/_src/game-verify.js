/* ================= ?verify=1 自检（仅 verify 分支加载执行）—— r8 难度改造版
   ① 静态 20 + 生成 20 关全量审计（flat 0-39，每关一记）：确定性（同 flat 两次生成 JSON 一致）/
     章号 1 基+难度章循环（生成关 dch∈[1,4] 随机）/ structWhy（mode 合法、multi=targets 2-4 物+1 干扰
     互异在库、overlap=pair 2 物同组+2 干扰、rot∈{0,90,180,270}、veil 全卡一致、初始态干净）/
     r8 章规则（独立副本重列：ch1 全 multi 零转无遮蔽·qi0 2 物 3 卡·qi1-4 3-4 物 4-5 卡 /
     ch2 qi1-4 目标卡恒 ∈{90,180,270} / ch3 qi1-4 veil 全真+目标非 0 / ch4 qi1-2 overlap
     零转无遮蔽·qi3-4 veil+旋转）/ 干扰同组（组内非目标剩余>0 时必同组）/ 相邻题主目标互异 /
     旋转 90/180/270 三向 40 关全覆盖 / 引擎直驱（首题：干扰错=灰、未来目标错=不灰、已灰 again
     早退、全对通关 2 星 / 另全对 3 星）
   ①t r8 时长硬断言（独立副本常量，禁引引擎）：每关 Σ[max(estMs(题面句长), 辨识步值
     plain2600/rot3000/veil3200/ovl3600)] + 5×切换900 ≥ 40000ms；决策步数 ≥13（第二道锚，
     防"纯语音窗撑时长"失判别）；独立副本与源模型 levelDurMs 逐关对账一致
   ② tapCard 单元（flat0 真实 UI，ch1 qi0 2 物+1 干扰）：卡 data-sid/字形与引擎对账（渲染即引擎）/
     题面 t-row 两项+cur 高亮 / 首错=干扰卡晃动+灰掉(pointer-events:none)+未来目标卡错=晃动不灰 /
     已灰卡 hook 点击=again 零惩罚 / 非法下标 false / 连对=lit 点亮（演出窗内）→gone 消显+phase
     推进+chip hit/cur 移动+picked 标记 / 本题连完=step 推进换题
   ②b sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次
     （multi 第三错=miss3 静默臂）
   ②c 教学链单元：直调 tutorialWatch——watch clip → 演示连对一步 → 重发同关 → turn clip →
     2000ms 接力题面（单通道不叠音）→ state 'help'（钩子契约）
   ③ UI 冒烟 A：flat0 真实通路通关（1 错=2 星，verify 页不弹层）
   ④ UI 冒烟 B1：flat5（ch2）qi0 热身零旋转 → 连完 qi0 推进 qi1 旋转剪影（引擎目标卡∈{90,180,270}+
     DOM transform≠none）+ autoSolve 3 星；B3：flat10（ch3）qi1 灌木遮蔽 DOM 几何（veil 覆盖
     卡下方 ~70%、glyph 顶部可见）+ autoSolve；B2：flat15（ch4）qi1 overlap 叠影题面+双选两步
     （第一 right 题不换+卡 sel+题面 hit；第二 right 题完成）+ 干扰错 + autoSolve 通关
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0 三卡 / flat5 推进 qi1 四卡旋转 /
     flat10 qi1 四卡遮蔽 / flat15 qi1 四卡重叠题面）：卡数=候选数、卡=主答案 ≥96、旋转字形在卡内、
     veil 高度 ∈[0.62,0.78]×卡高、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0
   ⑥ 分布与专项：剪影库 15 项独立字面量对账（id|emoji|中名|组 逐字）/ quizSpeech+pairSpeech 独立
     拼句对账（SPEC §1-r8 例句）/ 新键 clips 注入 clipOk（sha_teach_watch/sha_teach_turn/
     sha_help/sha_q_pair/sha_q_cat）/ estMs 家族字面+数值（12→4740）/ 开场顺序链 stub（play
     (sha_help) 后 2000ms 接力题面）/ 生成关 dch 1-4 全覆盖 / 40 关 15 项剪影目标全覆盖 /
     nextHint 契约独立副本（静态章末四点文字重列 + 生成关 GEN_HINTS[genLevel(f+1).dch-1] 实算式
     在场——家族契约 A/F/M1，r7 审查 M1 同型坑逐点断言）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const libDist = {};
  LIB_IDS.forEach(id => { libDist[id] = 0; });
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const rotCov = { 90: 0, 180: 0, 270: 0 };

  /* ---- r8 时长独立副本常量（SPEC §1-r8 时长模型口径，文字重列禁引引擎常量互证） ---- */
  const V_EST = c => c * 345 + 600;             // estMs 家族定版式（12 码点题面句→4740 / overlap 20 码点→7500）
  const V_PLAIN = 2600, V_ROT = 3000, V_VEIL = 3200, V_OVL = 3600, V_SW = 900, V_MIN = 40000, V_STEP_MIN = 13;
  const vQuizDur = q => {
    if (q.mode === 'overlap') return V_EST(20) + 2 * V_OVL;    // 叠影句 20 码点（独立点数）+双选两步
    let ms = 0;
    for (let s = 0; s < q.targets.length; s++) {
      let cog = V_PLAIN;                                        // 零旋转单物辨识
      if (q.veil[0]) cog = V_VEIL;                              // 遮蔽+旋转叠加
      else if (q.rot.some(v => v !== 0)) cog = V_ROT;           // 全卡旋转（心像旋转）
      ms += Math.max(V_EST(12), cog);                           // 题面句 12 码点（15 物中名恒 2 字）与辨识重叠取大
    }
    return ms;
  };
  const vDur = L => L.quizzes.reduce((s, q) => s + vQuizDur(q), 0) + 5 * V_SW;
  const vSteps = L => L.quizzes.reduce((s, q) => s + (q.mode === 'overlap' ? 2 : q.targets.length), 0);
  let durMin = Infinity, stepsMin = Infinity;

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                     : (L1.dch >= 1 && L1.dch <= 4);         // 生成关随机章参数
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    let structAll = true, ruleOk = true, adjOk = true;
    let spins = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q)) structAll = false;
      (q.targets || q.pair).forEach(id => { libDist[id]++; });               // 目标分布统计（multi 逐物/pair 逐物）
      const tg = groupOf((q.targets || q.pair)[0]);
      const n = q.options.length;
      /* r8 章规则（独立副本：SPEC §1-r8 章进阶文字重列） */
      if (k === 0) {                                                          // 各章首题热身：multi3（dch1=2 物）、零旋转无遮蔽
        if (q.mode !== 'multi' || q.veil.some(v => v) || q.rot.some(v => v !== 0)) ruleOk = false;
        if (L1.dch === 1 && (q.targets.length !== 2 || n !== 3)) ruleOk = false;
        if (L1.dch !== 1 && (q.targets.length !== 3 || n !== 4)) ruleOk = false;
      } else if (L1.dch === 1) {                                              // ch1：多物连解，零旋转零遮蔽
        if (q.mode !== 'multi' || q.rot.some(v => v !== 0) || q.veil.some(v => v)) ruleOk = false;
        if (q.targets.length < 3 || q.targets.length > 4 || n !== q.targets.length + 1) ruleOk = false;
      } else if (L1.dch === 2) {                                              // ch2：qi1-4 目标卡恒 90/180/270
        if (q.mode !== 'multi' || q.veil.some(v => v)) ruleOk = false;
        if (q.targets.length !== 3 || n !== 4) ruleOk = false;
        q.targets.forEach(tg2 => {
          const r2 = q.rot[q.options.indexOf(tg2)];
          if (r2 !== 90 && r2 !== 180 && r2 !== 270) ruleOk = false;
          else rotCov[r2]++;
        });
        if (!q.rot.every(v => [0, 90, 180, 270].indexOf(v) >= 0)) ruleOk = false;
      } else if (L1.dch === 3) {                                              // ch3：qi1-4 遮蔽+旋转叠加
        if (q.mode !== 'multi' || !q.veil.every(v => v)) ruleOk = false;
        if (q.targets.length !== 3 || n !== 4) ruleOk = false;
        q.targets.forEach(tg2 => {
          const r2 = q.rot[q.options.indexOf(tg2)];
          if (r2 !== 90 && r2 !== 180 && r2 !== 270) ruleOk = false;
          else rotCov[r2]++;
        });
      } else {                                                                // ch4：qi1-2 overlap / qi3-4 混排 veil+rot
        if (k <= 2) {
          if (q.mode !== 'overlap' || n !== 4 || q.rot.some(v => v !== 0) || q.veil.some(v => v)) ruleOk = false;
          if (groupOf(q.pair[0]) !== groupOf(q.pair[1])) ruleOk = false;
          if (!q.options.every(id => groupOf(id) === tg)) ruleOk = false;     // 重叠题全同组
        } else {
          if (q.mode !== 'multi' || !q.veil.every(v => v)) ruleOk = false;
          if (q.targets.length !== 3 || n !== 4) ruleOk = false;
          q.targets.forEach(tg2 => {
            const r2 = q.rot[q.options.indexOf(tg2)];
            if (r2 !== 90 && r2 !== 180 && r2 !== 270) ruleOk = false;
            else rotCov[r2]++;
          });
        }
      }
      /* 干扰同组：multi 干扰与目标同组（组内非目标剩余>0 时必同组；round 组 multi4 补邻组为合法） */
      if (q.mode === 'multi') {
        const sameLeft = LIB_IDS.filter(id => groupOf(id) === tg && q.targets.indexOf(id) < 0).length;
        if (!q.options.every(id => q.targets.indexOf(id) >= 0 ||
            groupOf(id) === tg || sameLeft === 0)) ruleOk = false;
      }
      if (k > 0) {                                                            // 相邻题主目标互异（首目标代表）
        const prev = L1.quizzes[k - 1];
        if ((prev.targets || prev.pair)[0] === (q.targets || q.pair)[0]) adjOk = false;
      }
      if (q.rot) q.rot.forEach(v => { if (v > 0) spins++; });
    }
    /* 引擎直驱：首题（恒 multi）干扰错=灰 → 未来目标错=晃动不灰（还要连）→ 已灰 again 早退 →
       逐连对步全对通关（2 星）；另取新关全对通关（3 星） */
    const Ld = genLevel(flat);
    const q0 = Ld.quizzes[0];
    const dIdx = q0.options.findIndex(id => q0.targets.indexOf(id) < 0);
    const fIdx = q0.options.findIndex(id => q0.targets.indexOf(id) >= 1);      // 未来目标（targets[1] 的卡）
    let driveOk = true;
    if (engTap(Ld, dIdx) !== 'wrong' || Ld.retries !== 1 || q0._miss !== 1 || !q0._dim[dIdx]) driveOk = false;
    if (engTap(Ld, fIdx) !== 'wrong' || Ld.retries !== 2 || q0._miss !== 2 || q0._dim[fIdx]) driveOk = false;   // 不灰
    if (engTap(Ld, dIdx) !== 'again' || Ld.retries !== 2) driveOk = false;     // 已灰卡防御层
    let last = null, guard = 0;
    while (!Ld.done && driveOk && guard++ < 30) {
      last = engTap(Ld, wantOf(Ld.quizzes[Ld.step]));
      if (last !== 'right' && last !== 'done') { driveOk = false; break; }
    }
    if (!Ld.done || Ld.step !== CH_LEN || last !== 'done' || Ld.retries !== 2 || engStars(Ld) !== 2) driveOk = false;
    const L3 = genLevel(flat);
    guard = 0;
    while (!L3.done && guard++ < 30) engTap(L3, wantOf(L3.quizzes[L3.step]));
    if (!L3.done || engStars(L3) !== 3) driveOk = false;
    /* r8 时长硬断言（独立副本）+决策步锚+与源模型对账 */
    const dMs = vDur(L1), stp = vSteps(L1);
    if (dMs < durMin) durMin = dMs;
    if (stp < stepsMin) stepsMin = stp;
    const durOk = dMs >= V_MIN && stp >= V_STEP_MIN && levelDurMs(L1) === dMs && levelSteps(L1) === stp;
    const ok = det && chOk && dchOk && structAll && ruleOk && adjOk && driveOk && durOk &&
      L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, ruleOk: ruleOk,
                  adjOk: adjOk, driveOk: driveOk, durMs: dMs, steps: stp,
                  qs: L1.quizzes.map(q => (q.targets || q.pair).join('+') + '[' + q.options.join(',') + ']') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* Chrome 把 rotate(0deg) 计算为单位矩阵（非 'none'）——零旋转判定两者都认 */
  const noRotCss = t => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';

  /* ---- ② tapCard 单元（flat0 真实 UI 状态机，ch1 qi0=2 物+1 干扰） ---- */
  total++;
  startLevel(0);
  const q0 = SH.quiz;
  const cards0 = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
  const glyphOf = el => el.querySelector('.glyph');
  const tItems = () => Array.prototype.slice.call(chipEl.querySelectorAll('.t-item'));
  /* DOM 对账：3 张卡 data-i/data-sid/字形 emoji 与引擎 options 一致、零旋转；
     题面 t-row 两项=targets、首项目标 cur 高亮（渲染即引擎） */
  const alignOk = q0 && cards0.length === 3 && cards0.every((c, i) =>
    Number(c.dataset.i) === i && c.dataset.sid === q0.options[i] &&
    glyphOf(c).textContent === emojiOf(q0.options[i]) &&
    noRotCss(getComputedStyle(glyphOf(c)).transform)) &&
    q0.mode === 'multi' && q0.targets.length === 2 && q0.phase === 0 &&
    tItems().length === 2 &&
    tItems().map(it => it.querySelector('.t-glyph').textContent).join('') === q0.targets.map(emojiOf).join('') &&
    tItems()[0].classList.contains('cur') && !tItems()[1].classList.contains('cur');
  const wIdx = q0.options.findIndex(id => q0.targets.indexOf(id) < 0);        // 干扰卡
  const fIdx = q0.options.findIndex(id => q0.targets.indexOf(id) === 1);      // 未来目标卡（targets[1]）
  const okIdx = q0.answerIdx;
  const rW = await SH.tapCard(wIdx);              // 错干扰：晃动+灰掉+miss 计数+dead 标记+首错不 pulse
  const wEl = cardEl(wIdx), okEl = cardEl(okIdx);
  const wrongOk = rW === 'wrong' && SH.quiz.miss === 1 && SH.currentLevel.retries === 1 &&
    SH.quiz.step === 0 && SH.quiz.dead.indexOf(wIdx) >= 0 &&
    wEl.classList.contains('dim') && wEl.classList.contains('wig') &&
    getComputedStyle(wEl).pointerEvents === 'none' &&      /* 灰掉：排除法保底（SPEC §1 灰化款） */
    !okEl.classList.contains('breathe');                   /* 首错不 pulse */
  const rF = await SH.tapCard(fIdx);              // 错未来目标：晃动零惩罚不灰（该卡接下来还要连）
  const fEl = cardEl(fIdx);
  const futOk = rF === 'wrong' && SH.quiz.miss === 2 && SH.quiz.dead.indexOf(fIdx) < 0 &&
    fEl.classList.contains('wig') && !fEl.classList.contains('dim') &&
    getComputedStyle(fEl).pointerEvents !== 'none' &&
    SH.currentLevel.step === 0 && SH.quiz.phase === 0;
  const rA = await SH.tapCard(wIdx);              // 已灰卡 hook 点击：again 早退零惩罚
  const againOk = rA === 'again' && SH.quiz.miss === 2 && SH.currentLevel.retries === 2;
  const badIdx = (await SH.tapCard(3)) === false && (await SH.tapCard(-1)) === false &&
    (await SH.tapCard('x')) === false && (await SH.tapCard(1.5)) === false;
  const pOk = SH.tapCard(okIdx);                  // 连对第一步：lit 点亮（演出窗内读）
  const litCard = cardEl(okIdx).classList.contains('lit');
  const rOk = await pOk;                          // 'right'（2 物题连完第 1 物，本题未完）
  const qMid = SH.quiz;
  const midEl = cardEl(okIdx);
  const midOk = rOk === 'right' && qMid && qMid.step === 0 && qMid.phase === 1 &&
    qMid.picked.indexOf(okIdx) >= 0 && midEl.classList.contains('gone') &&
    !midEl.classList.contains('lit') &&
    getComputedStyle(midEl).pointerEvents === 'none' &&    /* 消显卡不可重点 */
    tItems()[0].classList.contains('hit') && !tItems()[0].classList.contains('cur') &&
    tItems()[1].classList.contains('cur') &&               /* 题面高亮移到下一目标 */
    qMid.target === qMid.targets[1];                        /* hook target 跟随 phase */
  const r2 = await SH.tapCard(SH.quiz.answerIdx); // 连对第二物：本题完成换题
  const q1 = SH.quiz;
  const q1Cards = boardEl.querySelectorAll('.card');
  const nextOk = r2 === 'right' && q1 && q1.step === 1 && q1.phase === 0 && q1.miss === 0 &&
    q1Cards.length === q1.options.length &&
    chipEl.querySelectorAll('.t-item.cur').length === 1 &&
    document.querySelectorAll('#step-dots i.done').length === 1;
  const tapOk = alignOk && wrongOk && futOk && againOk && badIdx && litCard && midOk && nextOk;
  if (tapOk) npass++;
  units.tapCard = { ok: tapOk, align: alignOk, wrong: wrongOk, future: futOk, again: againOk,
                    badIdx: badIdx, lit: litCard, mid: midOk, next: nextOk };

  /* ---- ②b sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / force 豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'sha_w_same' && p[1].indexOf('再找') === 0).length;   /* T46 阶段2：wrong 已 clip 化（键化断言，text 仍对账） */
  const wrongIdx = () => {
    const q = SH.quiz;
    return q.options.map((v, i) => v !== q.target ? i : -1).filter(x => x >= 0);
  };
  startLevel(0);                                   // flat0：每错必播（干扰+未来目标各错一次）
  const wp0 = wrongIdx();
  await SH.tapCard(wp0[0]);
  await SH.tapCard(wp0[1]);
  const sayA = wrongPlays();                       // → 2
  startLevel(3);                                   // flat3：10s 节流
  lastWrongVoice = Date.now();                     /* flat0 分支不写时间戳，显式进入窗口内 */
  const wp3 = wrongIdx();
  await SH.tapCard(wp3[0]);                        // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                   // 增量 → 0
  startLevel(3);                                   // 同关重发 fresh quiz：force 豁免恰一次
  lastWrongVoice = 0;                              /* 隔离上一子用例时间戳 */
  const wp3b = wrongIdx();
  await SH.tapCard(wp3b[0]);                       // miss=1 → 播（10s 窗口早已过）
  await SH.tapCard(wp3b[1]);                       // miss=2 → force → 播
  const sayC = wrongPlays() - 2 - sayB;            // 增量 → 2
  startLevel(5);                                   // ch2 multi3+1 干扰：第三错(miss=3)豁免恰一次静默臂
  lastWrongVoice = 0;
  const wp5 = wrongIdx();
  await SH.tapCard(wp5[0]);                        // miss=1 → 播（节流窗外）
  await SH.tapCard(wp5[1]);                        // miss=2 → force ===2 → 播
  await SH.tapCard(wp5[2]);                        // miss=3 → force false+10s 窗内 → 静默
  const sayD = wrongPlays() - 2 - sayB - sayC;     // 增量 → 2（第三错不再豁免）
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && sayD === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, thirdWrong: sayD };

  /* ---- ②c 教学链单元：直调 tutorialWatch（watch clip→演示连对→重发→turn clip→接力题面） ---- */
  total++;
  const vLog = [];
  const origPlay3 = KIDS.voice.play, origSay3 = KIDS.voice.say;
  KIDS.voice.play = function (key) { vLog.push(['p', String(key)]); };
  KIDS.voice.say = function (t) { vLog.push(['s', String(t)]); };
  startLevel(0);                                   // 干净起点（openingSpeak 走 stub 不入 vLog）
  await tutorialWatch();                           // SPEED=0.12 提速：watch 演示（连对一步）很快完成
  const tutHelp = SH.tutorial === 'help' && SH.quiz && SH.quiz.step === 0 &&
    SH.quiz.miss === 0 && SH.currentLevel.retries === 0;   // 重发同关零污染
  await wait(2300);                                // 等 2000ms 接力题面 落地
  const iw = vLog.findIndex(v => v[0] === 'p' && v[1] === 'sha_teach_watch');
  const it = vLog.findIndex(v => v[0] === 'p' && v[1] === 'sha_teach_turn');
  /* 题面句=晓晓 clip（play 'sha_q_*'）；say 整句=缺 clip 兜底态，两通道任一命中即过 */
  const q0c = cur.quizzes[cur.step];
  const t0 = q0c.mode === 'overlap' ? q0c.pair[q0c._phase] : q0c.targets[q0c._phase];
  const isSay = vLog.findIndex(v => v[0] === 's' && v[1] === quizSpeech({ t: t0 }));
  const isPlay = vLog.findIndex(v => v[0] === 'p' && v[1] === 'sha_q_' + t0);
  const is = isSay >= 0 ? isSay : isPlay;
  const chainOk = tutHelp && iw >= 0 && it >= 0 && iw < it && it < is && is >= 0;
  KIDS.voice.play = origPlay3; KIDS.voice.say = origSay3;
  startLevel(0);                                   // 还原正常状态（后续单元用）
  if (chainOk) npass++;
  units.tutChain = { ok: chainOk, help: tutHelp, seq: vLog.filter(v => v[1].slice(0, 3) === 'sha' || v[0] === 's').slice(0, 4) };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = SH.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                               // 首错：干扰卡灰牌零惩罚；首错不 pulse 应点卡
      const w = q.options.findIndex(v => v !== q.target);
      await SH.tapCard(w);
      wrongOk2 = SH.currentLevel.retries === 1 && SH.currentLevel.step === 0 &&
        !cardEl(q.answerIdx).classList.contains('breathe');
    }
    let phaseDone = false;
    while (!phaseDone && smokeA) {               // 逐连对步点当前应点卡直到换题
      const r = await SH.tapCard(SH.quiz.answerIdx);
      if (r !== 'right' && r !== 'done') smokeA = false;
      if (SH.quiz === null || SH.quiz.step !== s) phaseDone = true;
    }
    steps++;
  }
  const lvA = SH.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && steps === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat5（ch2）qi0 热身零旋转 → 推进 qi1 旋转剪影引擎+DOM 对账 + autoSolve ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const q5_0 = SH.quiz;                          // qi0：热身不旋转（§1 承 batch10 P1②）
  const warmOk = q5_0.rot.every(v => v === 0) && !q5_0.veil.some(v => v) &&
    Array.prototype.every.call(boardEl.querySelectorAll('.card .glyph'),
      g => noRotCss(getComputedStyle(g).transform));
  let adv5 = null;
  while (SH.quiz && SH.quiz.step === 0) {        // 连完 qi0 三物推进到 qi1（旋转题）
    adv5 = await SH.tapCard(SH.quiz.answerIdx);
  }
  const q5_1 = SH.quiz;
  const rotEng = q5_1.targets.map(tg => q5_1.rot[q5_1.options.indexOf(tg)]);
  const rotEngOk = adv5 === 'right' && q5_1.step === 1 &&
    rotEng.every(v => v === 90 || v === 180 || v === 270) &&          // 目标卡恒旋转
    q5_1.rot.every(v => [0, 90, 180, 270].indexOf(v) >= 0);
  const rotDom = !noRotCss(getComputedStyle(cardEl(q5_1.answerIdx).querySelector('.glyph')).transform);
  const a5 = await SH.autoSolve();               // 余题全对通关（含全部旋转步）
  const lv5 = SH.currentLevel;
  const smokeOkB1 = L5.dch === 2 && warmOk && rotEngOk && rotDom &&
    a5.done && lv5.done && lv5.won && lv5.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, warm: warmOk, rotEng: rotEng, rotEngOk: rotEngOk,
                   rotDom: rotDom, taps: a5.taps, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B3：flat10（ch3）qi1 灌木遮蔽 DOM 几何 + autoSolve ---- */
  total++;
  startLevel(10);
  const L10 = genLevel(10);
  let adv10 = null;
  while (SH.quiz && SH.quiz.step === 0) {
    adv10 = await SH.tapCard(SH.quiz.answerIdx);
  }
  const q10_1 = SH.quiz;
  const veilEls = Array.prototype.slice.call(boardEl.querySelectorAll('.card .veil'));
  const card10 = cardEl(q10_1.answerIdx);
  const cr = card10.getBoundingClientRect();
  const vr = card10.querySelector('.veil').getBoundingClientRect();
  const veilEngOk = adv10 === 'right' && q10_1.step === 1 && q10_1.veil.every(v => v);
  const veilDomOk = veilEls.length === q10_1.options.length &&          // 全卡遮蔽（公平无元线索）
    vr.height >= cr.height * 0.62 && vr.height <= cr.height * 0.78 &&   // 挡下方 ~70%（±8% 容差）
    Math.abs(vr.top - (cr.top + cr.height * 0.3)) <= cr.height * 0.08 &&
    Math.abs(vr.bottom - cr.bottom) <= 4;                               // 贴卡底
  const glyphTop = card10.querySelector('.glyph').getBoundingClientRect();
  const peekOk = glyphTop.top < vr.top && vr.top < glyphTop.bottom;     // 字形上半露出（部分轮廓可辨）
  const a10 = await SH.autoSolve();
  const lv10 = SH.currentLevel;
  const smokeOkB3 = L10.dch === 3 && veilEngOk && veilDomOk && peekOk &&
    a10.done && lv10.done && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB3) npass++;
  smokes.flat10 = { ok: smokeOkB3, veilEng: veilEngOk, veilDom: veilDomOk, peek: peekOk,
                    veilH: Math.round(vr.height / cr.height * 100) + '%', taps: a10.taps };

  /* ---- ④ UI 冒烟 B2：flat15（ch4）qi1 overlap 叠影双选 + 混排通关 ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  let adv15 = null;
  while (SH.quiz && SH.quiz.step === 0) {
    adv15 = await SH.tapCard(SH.quiz.answerIdx);
  }
  const q15_1 = SH.quiz;                          // qi1：overlap 重叠拆解
  const ovlEls = Array.prototype.slice.call(chipEl.querySelectorAll('.ovl-g'));
  const ovlDomOk = adv15 === 'right' && q15_1.mode === 'overlap' && q15_1.step === 1 &&
    ovlEls.length === 2 &&
    ovlEls.map(g => g.textContent).sort().join('') === q15_1.targets.slice().sort().map(emojiOf).join('') &&
    getComputedStyle(ovlEls[0]).filter.indexOf('brightness(0)') >= 0;   // 题面=剪影（黑）
  const ovlWrongIdx = q15_1.options.findIndex(id => q15_1.targets.indexOf(id) < 0);
  const rOw = await SH.tapCard(ovlWrongIdx);      // 干扰错：灰掉
  const ovlWrongOk = rOw === 'wrong' && SH.quiz.dead.indexOf(ovlWrongIdx) >= 0 && SH.quiz.phase === 0;
  const firstOk = await SH.tapCard(q15_1.answerIdx);   // 双选第一张：right 但题不换+卡 sel+题面 hit
  const selOk = firstOk === 'right' && SH.quiz.step === 1 && SH.quiz.phase === 1 &&
    cardEl(q15_1.answerIdx).classList.contains('sel') &&
    chipEl.querySelectorAll('.ovl-g.hit').length === 1;
  const secondOk = await SH.tapCard(SH.quiz.answerIdx);  // 双选第二张：题完成
  const doneOk = secondOk === 'right' && SH.quiz.step === 2 && SH.quiz.phase === 0;
  const a15 = await SH.autoSolve();               // 余题（qi2 overlap+qi3-4 混排 veil+rot）通关
  const lv15 = SH.currentLevel;
  const smokeOkB2 = L15.dch === 4 && ovlDomOk && ovlWrongOk && selOk && doneOk &&
    a15.done && lv15.done && lv15.retries === 1 && engStars(cur) === 2;
  if (smokeOkB2) npass++;
  smokes.flat15 = { ok: smokeOkB2, ovlDom: ovlDomOk, ovlWrong: ovlWrongOk, sel: selOk,
                    second: doneOk, taps: a15.taps, retries: lv15.retries };

  /* ---- ⑤ 布局：双 viewport 模拟 × 四场景（3 卡热身 / 4 卡旋转 / 4 卡遮蔽 / 4 卡重叠题面） ---- */
  async function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                 // 按新场地尺寸重排
    await wait(750);                              /* 等入场动画结束再量（§0.11 transform 中途陷阱） */
    const de = document.documentElement;
    const q = SH.quiz;
    const n = q.options.length;
    const cards = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
    let countOk = cards.length === n;             // n 卡 + data-sid 与引擎对账
    cards.forEach((c, i) => {
      if (Number(c.dataset.i) !== i || c.dataset.sid !== q.options[i]) countOk = false;
    });
    const rects = cards.map(c => c.getBoundingClientRect());
    const cardOk = rects.length === n &&
      rects.every(r => r.width >= 96 && r.height >= 96);          /* 主答案按钮 ≥96（§0.9） */
    /* 旋转字形在卡内（emoji 近方形，90° 旋转包围盒不溢出卡；+8px 容差） */
    const insideOk = cards.every(c => {
      const gr = c.querySelector('.glyph').getBoundingClientRect();
      const r2 = c.getBoundingClientRect();
      return gr.left >= r2.left - 8 && gr.right <= r2.right + 8 &&
             gr.top >= r2.top - 8 && gr.bottom <= r2.bottom + 8;
    });
    const chipRect = chipEl.getBoundingClientRect();
    const chipOk = chipRect.width >= 64 && chipRect.height >= 64;
    const veils = Array.prototype.slice.call(boardEl.querySelectorAll('.card .veil'));
    const veilOk = veils.every(v => {             // 遮蔽层几何（若在场）：高度 ∈[0.6,0.8]×卡高
      const r2 = v.getBoundingClientRect();
      const c = v.parentElement.getBoundingClientRect();
      return r2.height >= c.height * 0.6 && r2.height <= c.height * 0.8;
    });
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, dch: cur.dch, step: cur.step, n: n, countOk: countOk, card96: cardOk,
             insideOk: insideOk, chipOk: chipOk, veilOk: veilOk, btn64: btnOk, ox: ox,
             pass: countOk && cardOk && insideOk && chipOk && veilOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  startLevel(0);                                  // ch1 qi0 三卡热身
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  startLevel(5);                                  // ch2 推进 qi1：旋转题四卡
  while (SH.quiz && SH.quiz.step === 0) await SH.tapCard(SH.quiz.answerIdx);
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  startLevel(10);                                 // ch3 推进 qi1：遮蔽题四卡
  while (SH.quiz && SH.quiz.step === 0) await SH.tapCard(SH.quiz.answerIdx);
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  startLevel(15);                                 // ch4 推进 qi1：重叠题面四卡
  while (SH.quiz && SH.quiz.step === 0) await SH.tapCard(SH.quiz.answerIdx);
  sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：独立字面量对账 / 拼句 / 新键 clips / estMs 家族 / 开场链 / 覆盖 / nextHint 契约 ---- */
  total++;
  /* 剪影库独立字面量对账（SPEC §1 枚举逐项，零手抄）：id|emoji|中名|组 逐字相符、共 15 项 */
  const REF = ['cat|🐱|小猫|quad', 'dog|🐶|小狗|quad', 'rabbit|🐰|小兔|quad',
    'bear|🐻|小熊|quad', 'hamster|🐹|仓鼠|quad', 'fox|🦊|狐狸|quad',
    'apple|🍎|苹果|round', 'ball|⚽|皮球|round', 'sun|🌞|太阳|round', 'orange|🍊|橘子|round',
    'star|⭐|星星|feat', 'balloon|🎈|气球|feat', 'butterfly|🦋|蝴蝶|feat',
    'fish|🐠|小鱼|feat', 'frog|🐸|青蛙|feat'];
  let refOk = REF.length === LIB_IDS.length;
  REF.forEach(row => {
    const p = row.split('|');
    const it2 = LIB[p[0]];
    if (!it2 || it2.e !== p[1] || it2.n !== p[2] || it2.g !== p[3]) refOk = false;
  });
  /* quizSpeech / pairSpeech 独立拼句对账（SPEC §1 例句 + r8 重叠句） */
  const spOk = quizSpeech({ t: 'cat' }) === '找一找，谁的影子是小猫呀' &&
    quizSpeech({ t: 'frog' }) === '找一找，谁的影子是青蛙呀' &&
    quizSpeech({ t: 'ball' }) === '找一找，谁的影子是皮球呀' &&
    pairSpeech({ pair: ['cat', 'dog'] }) === '这两个影子叠在一起啦，找一找是谁的影子呀';
  /* r8 clips 注入对账（教学 3 新键 + overlap 题面 + 题面抽查 1；旧 sha_tut_watch 等 3 键已归
     batch23/share（2026-09-10 撞车事故）——shadow 侧不再引用，缺 clip=TTS 兜底）
     T46 阶段2（09-19）：wrong 纠错键 sha_w_same 在册入查 */
  const SHA_KEYS = ['sha_teach_watch', 'sha_teach_turn', 'sha_help', 'sha_q_pair', 'sha_q_cat', 'sha_w_same'];
  const clipOk = SHA_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* estMs 家族定版（数值+字面双断言：12 码点→4740） */
  const estOk = estMs(12) === 4740 && estMs(20) === 7500 &&
    estMs.toString().indexOf('n * 345 + 600') >= 0 && estMs.toString().indexOf('+ 300') < 0;
  /* 开场顺序链（stub 记录）：play(sha_help) 后 2000ms 接力题面句 */
  const origP = KIDS.voice.play, origS = KIDS.voice.say;
  const playLog = [], sayLog = [];
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);
  const openHint = playLog.indexOf('sha_help') >= 0;
  await wait(2300);                               // 等 2000ms 接力 落地
  const q0b = genLevel(0).quizzes[0];
  const t0b = q0b.targets[0];
  const qPlayAt = playLog.indexOf('sha_q_' + t0b);
  const openQ = (qPlayAt > playLog.indexOf('sha_help')) ||
    (sayLog.length >= 1 && sayLog[0] === quizSpeech({ t: t0b }));   /* clip 通道接力 / say=兜底态 */
  KIDS.voice.play = origP; KIDS.voice.say = origS;
  /* r8 家族契约 A/F/M1：nextHint 章末逐点独立副本（文字重列，禁引 CHAPTERS/GEN_HINTS 互证）。
     flat19（末静态关）的下一关 flat20=首个生成关 → 走生成关实算分支（与 24/29/34/39 同组） */
  const NH_STATIC = {
    0: '影子会转圈圈啦，转过的也要认出来',                       /* ch1 任意关 → 预告 ch2 */
    4: '影子会转圈圈啦，转过的也要认出来',                       /* 打完 ch1（章末） */
    7: '影子要躲进灌木丛啦，只露一点点',                         /* ch2 中段 → 预告 ch3 */
    9: '影子要躲进灌木丛啦，只露一点点',                         /* 打完 ch2 */
    12: '两个影子会叠成一团，拆开看看是谁',                      /* ch3 中段 → 预告 ch4 */
    14: '两个影子会叠成一团，拆开看看是谁',                      /* 打完 ch3 */
    17: '新一轮影子配对大挑战'                                   /* ch4 中段 → 预告（CHAPTERS[4]） */
  };
  const nhStaticOk = Object.keys(NH_STATIC).every(f => nextHint(Number(f)) === NH_STATIC[f]);
  const nhGenOk = [19, 24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]) &&
    nextHint.toString().indexOf('genLevel(f + 1).dch') >= 0 &&    /* 生成关实算式在场（契约 F） */
    nextHint.toString().indexOf('(ci + 1) %') < 0 &&              /* 禁章索引取模字面（契约 F） */
    nextHint.toString().indexOf('CHAPTERS[Math.floor(f / CH_LEN) + 1].hint') >= 0;  /* M1 定版式 */
  const nhOk = nhStaticOk && nhGenOk;
  const distOk = refOk && spOk && clipOk && estOk && openHint && openQ && nhOk &&
    genDch[1] >= 1 && genDch[2] >= 1 && genDch[3] >= 1 && genDch[4] >= 1 &&  /* 生成关随机章参数全覆盖 */
    rotCov[90] >= 1 && rotCov[180] >= 1 && rotCov[270] >= 1 &&              /* 旋转三向覆盖 */
    LIB_IDS.every(id => libDist[id] >= 1);        // 40 关 15 项剪影目标全覆盖（确定性断言）
  if (distOk) npass++;
  units.dist = { ok: distOk, libRef: refOk, speech: spOk, clips: clipOk, estMs: estOk,
                 openHint: openHint, openQ: openQ, nextHint: nhOk, genDch: genDch,
                 rotCov: rotCov, libDist: libDist };
  units.durModel = { ok: durMin >= V_MIN && stepsMin >= V_STEP_MIN,
                     minMs: durMin, minSteps: stepsMin, floorMs: V_MIN, floorSteps: V_STEP_MIN };

  const out = { game: 'shadow', total: total, pass: npass, layoutOk: layoutOk,
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
