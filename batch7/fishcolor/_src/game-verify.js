/* ================= ?verify=1 自检（仅 verify 分支加载执行；r7 玩法全量覆盖）
   SPEC 断言自 r7 块文字独立重列（本地 NAMES/MIXV/PATTERNS/NEARV 副本，禁引引擎常量互证）：
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章规则（dch1 单色 6-8 鱼 K=2-3 干扰 2-3 / dch2 两步序 6-9 鱼 need 和 2-3 黑白鱼 ≥1
     且近似干扰=0 / dch3 间色 6-8 鱼 targets=配方序 场上无间色鱼 成分各 ≥2 / dch4 混排
     三型各 ≥1 single K=3+近似干扰 ≥2 two 和 3-4 8-10 鱼）/ structOk / 相邻题主目标色互异 /
     顺序铁律探针（后步色先点=wrong，独立实例）/ 引擎直驱通关 0 错 3 星
   ② 钓鱼单元：角标 1..k 递增+DOM / 已钓起返 'again' 零惩罚 / 非法下标 false
   ②b 错点单元+sayW：躲开零惩罚、首错不 pulse、二错 breathe；flat0 两错播 2 条 fis_wrong /
     flat3 两错 10s 节流只 1 条
   ②c 序错单元（flat5 两步序）：点后步色=wrong+fis_wrong_seq；时间快进过 10s 节流窗后
     点干扰色=fis_wrong（纠错分流两键都不泄答案）
   ③ UI 冒烟：flat0 首错零惩罚+通关（1 错=2 星）；flat15（章 4 混排）题型模式+autoSolve 3 星
   ③C 间色单元（flat10）：kind=mix、场上无间色鱼、卡面双成分迷你鱼、点第二成分=wrong、
     按序钓两成分=done 推进
   ④ 布局：双 viewport ×（章 3 间色卡 / 章 4 密集）：鱼热区 ≥64、游动实时盒 ≥64、
     中心距 ≥90、色卡行高 ≥78、overflowX ≤0；scatterPts 确定性+最密场景 ≥90
   ⑤ 时长硬断言（r7 ≥40s/关）：modeled=Σ题[estMs(题句)+300 + 钓次×3200 + 880]（不含游散
     等待=保守下界）；题句由本地副本重建并与引擎 quizSpeech 逐字符对账（防漂移）；
     estMs 家族字面验算（9→3705/0→600）
   ⑥ 鱼群游散单元：ch1 不启用；ch3 在场→散去（.away 不可点、进度保留、散去期空白点零惩罚）
     →重出（cycle+1、鱼数不变、已钓仍 gone）
   ⑦ 覆盖：目标色 5 色（红黄蓝绿橙）各 ≥1 + 间色 3 键各 ≥1 + 9 色场上鱼各 ≥1
   ⑧ 教学/演出吞输入单元：demo+locked 门拦真实与钩子输入
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  /* ---- 独立副本（SPEC r7 文字重列，禁引引擎常量互证） ---- */
  const NAMES = { red: '红色', orange: '橙色', yellow: '黄色', green: '绿色', blue: '蓝色',
    purple: '紫色', pink: '粉色', black: '黑色', white: '白色' };
  const MIXV = { orange: ['red', 'yellow'], green: ['yellow', 'blue'], purple: ['red', 'blue'] };
  const PATTERNS = [
    ['single', 'two', 'mix', 'two', 'single'],
    ['two', 'mix', 'single', 'mix', 'two'],
    ['mix', 'single', 'two', 'single', 'mix']
  ];
  const NEARV = { red: ['orange'], orange: ['red', 'yellow'], yellow: ['orange'],
    blue: ['purple'], purple: ['blue'], green: [], pink: [], black: [], white: [] };
  const nearV = (a, b) => (NEARV[a] || []).indexOf(b) >= 0 || (NEARV[b] || []).indexOf(a) >= 0;
  const cntV = n => n === 1 ? '一条' : (n === 2 ? '两条' : '三条');
  const speechV = q => q.kind === 'mix'
    ? (q.shortMix
      ? '先钓' + NAMES[q.targets[0]] + '，再钓' + NAMES[q.targets[1]] + '，变出' + NAMES[q.mix]
      : NAMES[q.mix] + '是' + NAMES[q.targets[0]] + '和' + NAMES[q.targets[1]] + '变的，先钓' +
        NAMES[q.targets[0]] + '，再钓' + NAMES[q.targets[1]])
    : (q.kind === 'two'
      ? '先钓' + cntV(q.need[0]) + NAMES[q.targets[0]] + '，再钓' + cntV(q.need[1]) + NAMES[q.targets[1]]
      : '钓' + cntV(q.need[0]) + NAMES[q.targets[0]] + '的鱼');
  /* 时长模型（保守下界，不含游散等待）：题句窗 estMs(len)+300（家族 T）+ 每钓 3200（5-6 岁
     典型决策+操作 dwell）+ 完成推进窗 880 */
  const CATCH_MS = 3200, DONE_MS = 880, SAY_TAIL = 300;
  const modeledMs = L => L.quizzes.reduce((s, q) =>
    s + (estMs(speechV(q).length) + SAY_TAIL) + q.need.reduce((a, b) => a + b, 0) * CATCH_MS + DONE_MS, 0);

  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const colorHist = {}, fishHist = {}, mixHist = {};
  Object.keys(NAMES).forEach(c => { colorHist[c] = 0; fishHist[c] = 0; });
  Object.keys(MIXV).forEach(c => { mixHist[c] = 0; });

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const CP = { 1: [6, 8], 2: [6, 9], 3: [6, 8], 4: [8, 10] }[L1.dch];      // 章鱼数区间（SPEC）
    let ruleOk = true, structAll = true, adjOk = true, rangeOk = true, orderOk = true;
    const kindsSeen = [];
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q)) structAll = false;
      q.targets.forEach(t => { colorHist[t]++; });                            // 目标色统计
      if (q.kind === 'mix') mixHist[q.mix]++;                                 // 间色键统计
      q.fishes.forEach(f => { fishHist[f.c]++; });                            // 场上鱼色统计
      const nf = q.fishes.length;
      const distract = q.fishes.filter(f => q.targets.indexOf(f.c) < 0);
      if (nf < CP[0] || nf > CP[1]) rangeOk = false;                          // 总鱼数在章区间
      kindsSeen.push(q.kind);
      if (L1.dch === 1) {                                                     // dch1 单色
        if (q.kind !== 'single' || q.targets.length !== 1) rangeOk = false;
        if (!(q.need[0] >= 2 && q.need[0] <= 3)) rangeOk = false;             // K=2-3
        if (!(distract.length >= 2 && distract.length <= 3)) ruleOk = false;  // 干扰 2-3
      } else if (L1.dch === 2) {                                              // dch2 两步序
        if (q.kind !== 'two' || q.targets.length !== 2) rangeOk = false;
        if (q.need[0] + q.need[1] < 2 || q.need[0] + q.need[1] > 3) rangeOk = false;
        if (q.fishes.filter(f => f.c === 'black' || f.c === 'white').length < 1) rangeOk = false;
        if (distract.some(f => q.targets.some(t => nearV(t, f.c)))) ruleOk = false;   // 近似干扰=0
      } else if (L1.dch === 3) {                                              // dch3 间色
        if (q.kind !== 'mix' || !MIXV[q.mix]) rangeOk = false;
        if (q.targets[0] !== MIXV[q.mix][0] || q.targets[1] !== MIXV[q.mix][1]) ruleOk = false;
        if (q.need[0] !== 1 || q.need[1] !== 1) ruleOk = false;
        if (q.fishes.some(f => f.c === q.mix)) ruleOk = false;                // 场上无间色目标鱼
        if (q.fishes.filter(f => f.c === q.targets[0]).length < 2 ||
            q.fishes.filter(f => f.c === q.targets[1]).length < 2) ruleOk = false;   // 成分各 ≥2
      } else {                                                                // dch4 混排
        if (q.kind !== PATTERNS[L1.lv % 3][k]) ruleOk = false;                // 题型模式
        if (q.kind === 'single') {
          if (q.need[0] !== 3) rangeOk = false;                               // K=3
          if (distract.filter(f => q.targets.some(t => nearV(t, f.c))).length < 2) ruleOk = false;
        } else if (q.kind === 'two') {
          if (q.need[0] + q.need[1] < 3 || q.need[0] + q.need[1] > 4) rangeOk = false;
        } else {
          if (q.fishes.some(f => f.c === q.mix)) ruleOk = false;
          if (q.fishes.filter(f => f.c === q.targets[0]).length < 2 ||
              q.fishes.filter(f => f.c === q.targets[1]).length < 2) ruleOk = false;
        }
      }
      if (speechV(q) !== quizSpeech(q)) ruleOk = false;                       // 题句漂移对账
      if (k > 0 && L1.quizzes[k - 1].targets[0] === q.targets[0]) adjOk = false;   // 相邻主目标互异
    }
    if (L1.dch === 4) {                                                       // dch4 每关三型各 ≥1
      ['single', 'two', 'mix'].forEach(t => { if (kindsSeen.indexOf(t) < 0) ruleOk = false; });
    }
    /* 顺序铁律探针（独立实例）：每题先点后步色必 wrong，再按步序正常通关推进 */
    const Lp = genLevel(flat);
    for (let k = 0; k < Lp.quizzes.length && orderOk; k++) {
      const q = Lp.quizzes[Lp.step];
      const early = q.fishes.findIndex(f => f.c === q.targets[1]);
      if (q.targets.length === 2 && early >= 0 && engTapFish(Lp, early) !== 'wrong') orderOk = false;
      while (orderOk && engActive(q) >= 0) {
        const act = engActive(q);
        const i = q.fishes.findIndex((f, j) => f.c === q.targets[act] && !(q._gone && q._gone[j]));
        if (i < 0) { orderOk = false; break; }
        engTapFish(Lp, i);
      }
    }
    /* 引擎直驱：按步序钓起目标色鱼（累计数递增断言→末钓 'done'）→ 0 错点通关 3 星 */
    let driveOk = true;
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      let want = 0;
      while (engActive(q) >= 0) {
        const act = engActive(q);
        const i = q.fishes.findIndex((f, j) => f.c === q.targets[act] && !(q._gone && q._gone[j]));
        if (i < 0) { driveOk = false; break; }
        want++;
        const last = q.got[act] + 1 >= q.need[act] && act === q.targets.length - 1;
        const r = engTapFish(L1, i);
        if (r !== (last ? 'done' : want)) { driveOk = false; break; }
      }
      if (!driveOk || engActive(q) >= 0) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && adjOk &&
      rangeOk && orderOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, structAll: structAll,
      adjOk: adjOk, rangeOk: rangeOk, orderOk: orderOk, driveOk: driveOk, solvedAll: solvedAll,
      modeledMs: modeledMs(L1),
      qs: L1.quizzes.map(q => q.kind[0] + ':' + q.targets.map((t, j) => NAMES[t][0] + q.need[j]).join('>') + '(' + q.fishes.length + ')') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 钓鱼单元（flat 0 真实 UI 状态机；钓 need-1 条留题开放 → 补最后一钓 'done'） ---- */
  total++;
  startLevel(0);
  const q0 = FIS.quiz;
  const act0 = q0.act;
  const tcol = q0.targets[act0];
  const needN = q0.need[act0];
  const live = [];
  q0.fishes.forEach((f, i) => { if (f.c === tcol && !q0.gone[i]) live.push(i); });
  const taps = [];
  for (let k = 0; k < needN - 1 && k < live.length - 1; k++) {
    taps.push(await FIS.tapFish(live[k]));
    await wait(40);
  }
  const openN = taps.length;                     // 题仍开放时的已钓数（1..need-1）
  const incOk = openN >= 1 && taps.every((v, i) => v === i + 1) &&
    FIS.currentLevel.caught === openN;
  const domOk = pondEl.querySelectorAll('.badge.on').length === openN;   // 每钓一条一个角标
  const againOk = (await FIS.tapFish(live[0])) === 'again';             // 已钓起：早退零惩罚
  const againKeep = FIS.currentLevel.step === 0 && FIS.currentLevel.retries === 0 && FIS.currentLevel.caught === openN;
  const badIdx = (await FIS.tapFish(99)) === false && (await FIS.tapFish(-1)) === false;
  const lastR = await FIS.tapFish(live[openN]);                        // 最后一钓：'done' 推进换题
  await wait(160);                                                      // 推进演出窗（SPEED 提速）
  const doneOk = lastR === 'done' && FIS.currentLevel.step === 1 && FIS.currentLevel.caught === 0;
  const tapOk = incOk && domOk && againOk && againKeep && badIdx && doneOk;
  if (tapOk) npass++;
  units.tapFish = { ok: tapOk, taps: taps, domBadges: pondEl.querySelectorAll('.badge.on').length,
    again: againOk, badIdx: badIdx, lastDone: doneOk };

  /* ---- ②b 错点单元 + sayW 节流（flat0 每错必播 / flat3 10s 一条；均点干扰色→fis_wrong） ---- */
  total++;
  let playLog = [];
  const origPlay = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { playLog.push(key); };
  startLevel(0);                                 /* flat0：每错必播 */
  const qw = FIS.quiz;
  const widx = qw.fishes.findIndex(f => f.c !== qw.targets[qw.act]);
  const t0 = firstLiveTarget(cur.quizzes[cur.step]);
  const noPulse1 = !(t0 >= 0 && fishEl(t0) && fishEl(t0).classList.contains('breathe'));
  await FIS.tapFish(widx);                       /* 首错：躲开，不 pulse 目标鱼 */
  await FIS.tapFish(widx);                       /* 二错：目标鱼 breathe 高亮出现 */
  await wait(500);
  const t1 = firstLiveTarget(cur.quizzes[cur.step]);
  const wrongOk = FIS.currentLevel.retries === 2 && FIS.currentLevel.step === 0 &&
    noPulse1 && !!(t1 >= 0 && fishEl(t1) && fishEl(t1).classList.contains('breathe'));
  const sayA = playLog.filter(k2 => k2 === 'fis_wrong').length;   // flat0 两错 → 2 条
  startLevel(3);                                 /* flat3：10s 节流 → 两错只 1 条 */
  const qw3 = FIS.quiz;
  const widx3 = qw3.fishes.findIndex(f => f.c !== qw3.targets[qw3.act]);
  playLog = [];
  await FIS.tapFish(widx3);
  await FIS.tapFish(widx3);
  const sayB = playLog.filter(k2 => k2 === 'fis_wrong').length;
  KIDS.voice.play = origPlay;
  const sayWOk = sayA === 2 && sayB === 1 && wrongOk;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Plays: sayB, wrong: wrongOk };

  /* ---- ②c 序错单元（flat5 两步序）：点后步色=fis_wrong_seq；节流窗时间快进后干扰色=fis_wrong ---- */
  total++;
  KIDS.voice.play = function (key, text) { playLog.push(key); };
  startLevel(5);
  playLog = [];
  const qs5 = FIS.quiz;
  const seqOk5 = qs5.kind === 'two' && qs5.targets.length === 2;
  const early5 = qs5.fishes.findIndex(f => f.c === qs5.targets[1]);
  const realNow = Date.now; let vNow = realNow() + 20000;   // 起点即过节流窗（②b 刚播过一条）
  Date.now = () => vNow;
  const rSeq = await FIS.tapFish(early5);        /* 点第二步骤色：wrong + 序错方向锚 */
  const seqClip = playLog.indexOf('fis_wrong_seq') >= 0;
  vNow += 11000;                                 /* 快进 11s：过 sayW 10s 节流窗（flat5≥3） */
  const d5 = FIS.quiz.fishes.findIndex(f => f.c !== FIS.quiz.targets[0] && f.c !== FIS.quiz.targets[1]);
  const rD5 = await FIS.tapFish(d5);             /* 点干扰色：wrong + 颜色方向锚 */
  Date.now = realNow;
  const colClip = playLog.indexOf('fis_wrong') >= 0;
  KIDS.voice.play = origPlay;
  const seqUnitOk = seqOk5 && early5 >= 0 && rSeq === 'wrong' && seqClip &&
    d5 >= 0 && rD5 === 'wrong' && colClip &&
    FIS.currentLevel.retries === 2 && FIS.currentLevel.step === 0;
  if (seqUnitOk) npass++;
  units.seqWrong = { ok: seqUnitOk, kind: qs5.kind, rSeq: rSeq, seqClip: seqClip,
    rD5: rD5, colClip: colClip, log: playLog.slice(0, 4) };

  /* ---- ③ UI 冒烟 A：flat0 首错零惩罚 + 通关（1 错点=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongDone = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = FIS.quiz;
    if (!q) { smokeA = false; break; }
    if (!wrongDone) {                            /* 首题先错一次：躲开零惩罚，不推进不弹层 */
      const w = q.fishes.findIndex(f => f.c !== q.targets[q.act]);
      const r = await FIS.tapFish(w);
      wrongDone = r === 'wrong' && FIS.currentLevel.step === 0 && FIS.currentLevel.retries === 1;
      if (!wrongDone) smokeA = false;
    }
    while (smokeA && FIS.quiz && FIS.quiz.step === s) {
      const i = firstLiveTarget(cur.quizzes[cur.step]);
      if (i < 0) break;
      const r = await FIS.tapFish(i);
      if (r === false || r === null || r === 'again') { smokeA = false; break; }
      await wait(40);
    }
    steps++;
  }
  const lvA = FIS.currentLevel;
  const smokeOkA = smokeA && wrongDone && steps === CH_LEN && lvA.done && lvA.won && lvA.retries === 1 &&
    engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongDone: wrongDone, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ③ UI 冒烟 B：flat15（章 4 混排）题型模式 + autoSolve UI 通路通关 ---- */
  total++;
  const L15 = genLevel(15);
  const patOk = L15.quizzes.every((q, k) => q.kind === PATTERNS[L15.lv % 3][k]) &&
    ['single', 'two', 'mix'].every(t => L15.quizzes.some(q => q.kind === t));
  startLevel(15);
  const q15 = FIS.quiz;
  const fishOk = q15.fishes.length >= 8 && q15.fishes.length <= 10;
  const a15 = await FIS.autoSolve();
  const lv15 = FIS.currentLevel;
  const smokeOkB = patOk && fishOk && a15.done && lv15.done && lv15.won && lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, pattern: patOk, fishes: q15.fishes.length,
    kinds: L15.quizzes.map(q => q.kind).join(','), taps: a15.taps, stars: engStars(cur) };

  /* ---- ③C 间色单元（flat10 章 3）：无间色鱼+双成分卡+序错=wrong+按序合成=done ---- */
  total++;
  startLevel(10);
  let mixOk = true;
  const qm = FIS.quiz;
  if (qm.kind !== 'mix' || !MIXV[qm.mix] ||
      qm.targets[0] !== MIXV[qm.mix][0] || qm.targets[1] !== MIXV[qm.mix][1]) mixOk = false;
  if (qm.fishes.some(f => f.c === qm.mix)) mixOk = false;                 // 场上无间色目标鱼
  const domMix = !!(chipEl.querySelector('.card.mix') &&
    chipEl.querySelectorAll('.card.mix .mini').length === 2);              // 双成分迷你鱼卡
  const e2 = qm.fishes.findIndex(f => f.c === qm.targets[1]);
  const rE2 = await FIS.tapFish(e2);                                     // 先点第二成分=wrong
  const i1 = qm.fishes.findIndex((f, i) => f.c === qm.targets[0] && !qm.gone[i]);
  const r1 = await FIS.tapFish(i1);                                      // 第一成分=1
  await wait(60);
  const pip1 = chipEl.querySelectorAll('.card.mix .mini .pips i.on').length;
  const i2 = qm.fishes.findIndex((f, i) => f.c === qm.targets[1] && !qm.gone[i]);
  const r2 = await FIS.tapFish(i2);                                      // 第二成分=done
  await wait(160);
  const mixUnitOk = mixOk && domMix && rE2 === 'wrong' && r1 === 1 && r2 === 'done' &&
    pip1 === 1 && FIS.currentLevel.step === 1 && FIS.currentLevel.retries === 1;
  if (mixUnitOk) npass++;
  units.mix = { ok: mixUnitOk, mix: qm.mix, targets: qm.targets.slice(), noMixFish: mixOk,
    domMix: domMix, earlyWrong: rE2, r1: r1, r2: r2, pip1: pip1 };

  /* ---- ④ 布局：双 viewport 模拟 ×（章 3 间色卡 / 章 4 密集） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                // 按新池塘尺寸重新撒点（同 seed 同尺寸同布局）
    const de = document.documentElement;
    const fishes = Array.prototype.map.call(pondEl.querySelectorAll('.animal'), b => {
      const r = b.getBoundingClientRect();
      const sw = b.querySelector('.swim');
      const sr = sw ? sw.getBoundingClientRect() : r;   // 游动内层实时盒（translateX 动画进行中）
      return { x: r.left + r.width / 2, y: r.top + r.height / 2,
        w: r.width, h: r.height, lw: sr.width, lh: sr.height };
    });
    const hitOk = fishes.length > 0 && fishes.every(a => a.w >= 64 && a.h >= 64 && a.lw >= 64 && a.lh >= 64);
    let distOk = true, minD = 1e9;
    for (let i = 0; i < fishes.length; i++) {
      for (let j = i + 1; j < fishes.length; j++) {
        const d = Math.hypot(fishes[i].x - fishes[j].x, fishes[i].y - fishes[j].y);
        if (d < minD) minD = d;
        if (d < 90) distOk = false;              // 撒点中心距 ≥90px：防重叠不可点
      }
    }
    const chipOk = chipEl.getBoundingClientRect().height >= 78;   // 色卡题面行可视高度
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, hitOk: hitOk, distOk: distOk, minD: Math.round(minD),
      fishes: fishes.length, chipOk: chipOk, ox: ox, pass: hitOk && distOk && chipOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [10, 15]) {                 // 章 3 间色卡（最高卡）/ 章 4 最密 10 鱼
    startLevel(flat);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                 // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ④ 附：scatterPts 确定性 + 最密场景 ≥90px 单元（章 4 极值 10 鱼 D=106，留余量 12 点） ---- */
  total++;
  const sc1 = scatterPts(mulberry32(987654), 900, 460, 12, 96, 54);
  const sc2 = scatterPts(mulberry32(987654), 900, 460, 12, 96, 54);
  const scDet = JSON.stringify(sc1) === JSON.stringify(sc2) && sc1.length === 12;
  const minOf = pts => {
    let mn = 1e9;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < mn) mn = d;
    }
    return mn;
  };
  const scMin = minOf(sc1);
  const dense = [
    scatterPts(mulberry32(700001), 1172, 420, 10, 106, 51),    // 横屏最密（章 4 极值 10 鱼）
    scatterPts(mulberry32(700002), 740, 700, 10, 106, 51),     // 竖屏最密
    scatterPts(mulberry32(700003), 1172, 420, 12, 106, 51)     // 余量（>实际最多 10）
  ].map(minOf);
  const denseOk = dense.every(d => d >= 90);
  const scOk = scDet && scMin >= 96 && denseOk;
  if (scOk) npass++;
  units.scatter = { ok: scOk, det: scDet, minD: Math.round(scMin), dense: dense.map(d => Math.round(d)) };

  /* ---- ⑤ 时长硬断言（r7 ≥40s/关）+ estMs 家族字面验算 + 题句漂移对账 ---- */
  total++;
  const estOk = estMs(9) === 9 * 345 + 600 && estMs(9) === 3705 &&
    estMs(0) === 600 && estMs(1) === 945;
  const modeledAll = [];
  for (let flat = 0; flat < 40; flat++) modeledAll.push(modeledMs(genLevel(flat)));
  const minMs = Math.min.apply(null, modeledAll);
  let speechOk = true;                            // 题句本地副本 vs 引擎 quizSpeech 逐字符（防漂移）
  for (let flat = 0; flat < 40; flat++) {
    genLevel(flat).quizzes.forEach(q => { if (speechV(q) !== quizSpeech(q)) speechOk = false; });
  }
  const durOk = estOk && minMs >= 40000 && speechOk;
  if (durOk) npass++;
  units.duration = { ok: durOk, estOk: estOk, minMs: minMs, floorMs: 40000,
    perDch: [1, 2, 3, 4].map(d => {
      const v = [];
      for (let flat = 0; flat < 40; flat++) { const L = genLevel(flat); if (L.dch === d) v.push(modeledMs(L)); }
      return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
    }) };

  /* ---- ⑥ 鱼群游散单元：ch1 不启用；ch3 在场→散去→重出（进度保留/散去期不可点） ---- */
  total++;
  const waitPhase = async (ph, timeout) => {      // 轮询等相位（away 窗仅 384ms，固定 sleep 会跳过）
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (FIS.school.phase === ph) return true;
      await wait(50);
    }
    return FIS.school.phase === ph;
  };
  startLevel(0);
  const offOk = FIS.school.on === false;
  startLevel(10);                                 // ch3（SPEED 压缩：present 1.8s / away 0.384s）
  const sOn = FIS.school.on === true && FIS.school.phase === 'present' && FIS.school.cycle === 0;
  const q10 = FIS.quiz;
  const tgt10 = q10.fishes.findIndex((f, i) => f.c === q10.targets[q10.act] && !q10.gone[i]);
  const rc = await FIS.tapFish(tgt10);            // 在场期钓一条当前步目标鱼（进度）
  const sawAway = await waitPhase('away', 4000);  // 过 present 窗（1800ms）→ 散去
  const awayOk = sawAway &&
    pondEl.querySelectorAll('.animal.away').length === FIS.quiz.fishes.length &&
    FIS.currentLevel.caught === 1 && FIS.currentLevel.step === 0;     // 进度保留
  const missBefore = FIS.quiz.miss, retBefore = FIS.currentLevel.retries;
  pondEl.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));   // 散去期空白点
  const blankOk = FIS.quiz.miss === missBefore && FIS.currentLevel.retries === retBefore;
  const sawBack = await waitPhase('present', 3000) && FIS.school.cycle === 1; // 过 away 窗 → 重出
  const backOk = sawBack &&
    pondEl.querySelectorAll('.animal').length === FIS.quiz.fishes.length &&
    FIS.quiz.gone.filter(g => g).length === 1;    // 已钓鱼仍 gone
  const schoolOk = offOk && sOn && rc === 1 && awayOk && blankOk && backOk;
  if (schoolOk) npass++;
  units.school = { ok: schoolOk, ch1Off: offOk, on: sOn, away: awayOk, blank: blankOk, back: backOk };

  /* ---- ⑦ 覆盖：目标色 5 色各 ≥1 + 间色 3 键各 ≥1 + 9 色场上鱼各 ≥1 ---- */
  total++;
  const tgtOk = ['red', 'yellow', 'blue', 'green', 'orange'].every(c => colorHist[c] >= 1);
  const mixCovOk = Object.keys(MIXV).every(c => mixHist[c] >= 1);
  const fishCovOk = Object.keys(NAMES).every(c => fishHist[c] >= 1);
  const distOk = tgtOk && mixCovOk && fishCovOk;
  if (distOk) npass++;
  units.colorDist = { ok: distOk, targets: colorHist, mixes: mixHist, fishes: fishHist };

  /* ---- ⑧ 教学/演出吞输入单元：demo+locked 门拦真实与钩子输入 ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;        // 模拟教学"看"演示期（locked 吞输入）
  const swallow1 = (await FIS.tapFish(0)) === false;
  state.demo = false; state.locked = true;       // 演出窗口（locked）
  const swallow2 = (await FIS.tapFish(0)) === false;
  state.locked = false;                          // 还原
  const swallowOk = swallow1 && swallow2 && FIS.currentLevel.step === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  const out = { game: 'fishcolor', total: total, pass: npass, layoutOk: layoutOk,
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
