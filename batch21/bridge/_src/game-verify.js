/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 60 关全量审计（flat 0-59，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     章号 1 基+六章循环 dch=(ch-1)%6+1（flat≥30 生成关 seeded dch∈[1,6]）/
     章型规则（dch1-5 全同型 / dch6 混合 ≥3 型）/ structWhy（引擎自检）+
     SPEC 独立周期计算器 vBadPos 对账（不读引擎 badPos——从行首周期元重建）+
     r9 规则副本（ab/abc 6 石、abcd/aabb 8 石、错位 ≥per、恰一错石、错石值
     ∈行用色异值（单色）/恰差一属性（dual）、候选 3 互异+应值恰一次+干扰恰差一属性）/
     r9 时长硬断言（vDur ≥40000 + 与源 levelDurMs 对账一致）/
     引擎直驱（find 错点=wrong+miss+不换 phase → found=phase fix → fix 错候选=wrong →
     修对=walk→goal/done；walk 期 engTap=null 锁；全对通关 3 星；2 错=2 星）
   ② find/fix 双步真实 UI 单元（flat0）：DOM 石头与引擎对账（data-i/data-color/
     data-shape/data-bad，渲染即引擎）/ find 首错=wig+miss+1+phase 仍 find+pat-tip
     不显示（首错不泄答案）/ 防重入窗内并发点=拒绝 / found=baddie 类+候选盘 show+
     候选 DOM 3 块对账 / fix 错候选=wig+miss / fix 对=fixed-in+walk 脚印+换题 /
     find 期点候选=拒绝（阶段门）
   ②b sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / miss===2 豁免恰一次
   ②c 教学链单元：直调 tutorialWatch——watch clip → pattern 读出（「…，有一块不对哦」）
     → 演示 found（__bgDemoR='found'）→ 候选滑入 → 演示修对 → 重发同关 → turn clip
     接题面 clip（queue 单通道）→ state 'help'（钩子契约）
   ③ UI 冒烟 A：flat0 真实通路通关（1 错=2 星，verify 页不弹层）
   ④ UI 冒烟 B1-B4（SPEC 侧独立走序=vBadPos/vCandOk 重建，不读引擎字段）：
     B1 flat10（ch3 abcd）8 石+四色周期+候选全行内色；B2 flat15（ch4 aabb）
     8 石+同同异异成对结构；B3 flat20（ch5 dual）色+形双属性+错石恰差一属性+
     autoSolve 3 星；B4 flat25（ch6 混合 ≥3 型）autoSolve
   ⑤ 布局：双 viewport（1280×800 / 800×1180）× flat{0,10,15,20,25}（含 8 石章与
     dual 候选态）：石数=引擎、石头与候选=主答案 ≥64、全按钮 ≥64（.k-parentbtn 豁免）、
     兔子在场 ≥40、overflowX ≤0——量测全用 offsetWidth/offsetHeight（禁 getBoundingClientRect）
   ⑥ 分布与家族：VOICE 八条与 SPEC 文案逐字对账 / brg_* 8 条 clips 注入 clipOk /
     estMs 家族定版（n*345+600，禁 +300 变体）/ speechOf phase 分流（find=fix_q 句/
     fix=fix_do 句）/ chantText 句式 / 开场顺序链 stub（queue 首段 brg_hint 接
     brg_fix_q）/ nextHint 章末逐点独立副本断言（SPEC_HINT 重列+off-by-one 哨兵）/
     durMin 报出 ≥40000 / 生成关 dch 1-6 全覆盖 / 60 关五 kind 全覆盖
   结果写 #verify-result + document.title='VERIFY PASS n/n'（全部单元完成后才设 title） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const kindCov = { ab: 0, abc: 0, abcd: 0, aabb: 0, dual: 0 };

  /* ---- r9 独立副本：SPEC §3-r9 数值/文案/规则/时长模型重列（禁引 SCAN_MS/CHAPTERS
     等引擎常量互证——全部自文字重列） ---- */
  const V_EST = c => c * 345 + 600;
  const V_SCAN = { ab: 4200, abc: 5200, abcd: 6800, aabb: 6300, dual: 7800 };
  const V_FIX = 3000, V_FOUND = 1600, V_STEP = 460, V_BANK = 900, V_RIGHT = 2400;
  const V_MIN = 40000, V_FLATS = 60;                 /* 静态 30 + 生成 30 */
  const V_FIXQ = '小桥上有一块石头放错啦，找一找';
  const V_FIXDO = '选一块对的石头，补上去';
  function vDur(q, first) {                          // 单题推算（r9 双步分账；first=本关首题播 fix_do）
    return V_EST(V_FIXQ.length) + V_SCAN[q.kind] + V_FOUND +
           (first ? V_EST(V_FIXDO.length) : 0) + V_FIX +
           q.stones.length * V_STEP + V_BANK + V_RIGHT;
  }
  const vLevelDur = L => L.quizzes.reduce((s, q, i) => s + vDur(q, i === 0), 0);
  /* 独立周期计算器（vBadPos）：从行首 per 位读周期元（aabb=同同异异成对重建），
     逐位比对 → 唯一不符位。返回 {badPos, expColor, expShape} 或 null */
  function vBadPos(q) {
    const per = q.kind === 'ab' ? 2 : q.kind === 'abc' ? 3 : q.kind === 'dual' ? 2 : 4;
    const st = q.stones, n = st.length;
    if (n !== (per === 4 ? 8 : 6)) return null;
    const hc = [], hs = [];
    for (let i = 0; i < per; i++) { hc.push(st[i].color); hs.push(st[i].shape || null); }
    if (q.kind === 'aabb') {
      if (hc[0] !== hc[1] || hc[2] !== hc[3] || hc[0] === hc[2]) return null;
    } else if (new Set(hc).size !== per) return null;
    if (q.kind === 'dual' && (hs[0] === null || hs[0] === hs[1])) return null;
    let bad = -1;
    for (let i = 0; i < n; i++) {
      const ec = hc[i % per], es = hs[i % per];
      const wrong = st[i].color !== ec || (q.kind === 'dual' && st[i].shape !== es);
      if (wrong) { if (bad >= 0) return null; bad = i; }
    }
    if (bad < per) return null;
    return { badPos: bad, expColor: hc[bad % per], expShape: hs[bad % per] };
  }
  /* 独立候选应值位（fix 步 SPEC 侧应点候选 idx） */
  function vCandOk(q, sp) {
    return q.cand.findIndex(c => c.color === sp.expColor &&
      (q.kind === 'dual' ? c.shape === sp.expShape : !c.shape));
  }
  /* r9 章规则副本：SPEC §3-r9 表逐行直译 */
  function vRuleOk(q) {
    const sp = vBadPos(q);
    if (!sp) return false;
    const st = q.stones, n = st.length;
    if (st[q.badPos].bad !== true) return false;
    let nBad = 0;
    for (const s of st) if (s.bad) nBad++;
    if (nBad !== 1) return false;                    // 恰一错石
    if (q.kind === 'dual') {                         // dual：双属性+错石恰差一属性
      for (const s of st) if (s.shape !== 'square' && s.shape !== 'round') return false;
      const bs = st[q.badPos];
      const cSame = bs.color === sp.expColor, sSame = bs.shape === sp.expShape;
      if (cSame === sSame) return false;             // 须恰差一（异或）
    } else {
      for (const s of st) if (s.shape) return false;  // 单色章禁 shape 泄漏
      const rowColors = new Set(st.map(s => s.color));
      if (!rowColors.has(st[q.badPos].color) || st[q.badPos].color === sp.expColor) return false;
      if (q.kind === 'ab' || q.kind === 'aabb') { if (rowColors.size !== 2) return false; }
      else if (rowColors.size !== per0f(q)) return false;
    }
    if (!Array.isArray(q.cand) || q.cand.length !== 3) return false;   // 候选 3
    const keys = q.cand.map(c => c.color + '|' + (c.shape || ''));
    if (new Set(keys).size !== 3) return false;
    const okIdx = vCandOk(q, sp);
    if (okIdx !== q.candOk || okIdx < 0) return false;
    for (const c of q.cand) {                        // 干扰与应值恰差一属性
      if (c === q.cand[okIdx]) continue;
      const dc = c.color !== sp.expColor;
      const ds = q.kind === 'dual' ? c.shape !== sp.expShape : false;
      if (dc === ds) return false;
    }
    return true;
  }
  function per0f(q) { return q.kind === 'abc' ? 3 : 4; }

  /* ---- ① 60 关全量审计（flat 0-59） ---- */
  const durAll = [];
  let durMin = Infinity, durMax = 0;
  for (let flat = 0; flat < V_FLATS; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const chOk = L1.ch === Math.floor(flat / 5) + 1 && L1.quizzes.length === 5;
    const dchOk = flat < 30 ? L1.dch === (L1.ch - 1) % 6 + 1
                             : (L1.dch >= 1 && L1.dch <= 6);                // 生成关 seeded 章参数
    if (flat >= 30) genDch[L1.dch]++;
    const kinds = L1.quizzes.map(q => q.kind);
    kinds.forEach(k => { kindCov[k]++; });
    let planOk = true;                                                       // 章型规则
    if (L1.dch >= 1 && L1.dch <= 5) planOk = kinds.every(k => k === KIND_ALL[L1.dch - 1]);
    else planOk = new Set(kinds).size >= 3;                                  // dch6 混合 ≥3 型
    let structAll = true, specAll = true, ruleOk = true, driveOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q)) structAll = false;
      const sp = vBadPos(q);                                                 // SPEC 独立计算器
      if (!sp || sp.badPos !== q.badPos || vCandOk(q, sp) !== q.candOk) specAll = false;
      if (!vRuleOk(q)) ruleOk = false;
    }
    const durMs = vLevelDur(L1);
    durAll.push(durMs);
    if (durMs < durMin) durMin = durMs;
    if (durMs > durMax) durMax = durMs;
    if (durMs < V_MIN) ruleOk = false;                                       // r9 时长硬断言 ≥40s
    if (levelDurMs(L1) !== durMs) ruleOk = false;                            // 源模型与独立副本对账一致
    /* 引擎直驱 A：首题 find 错点两次 → found → fix 错候选 → 修对走完 → 全关通关（2 错=2 星） */
    const Ld = genLevel(flat);
    {
      const q0 = Ld.quizzes[0];
      const nonBad = q0.stones.findIndex((s, i) => i !== q0.badPos);
      if (engTap(Ld, nonBad) !== 'wrong' || Ld.retries !== 1 || q0.miss !== 1 ||
          q0.phase !== 'find') driveOk = false;                              // find 错点：不换 phase
      if (engTap(Ld, nonBad) !== 'wrong' || q0.miss !== 2) driveOk = false;
      if (engTap(Ld, q0.badPos) !== 'found' || q0.phase !== 'fix') driveOk = false;
      if (engFix(Ld, q0.candOk === 0 ? 1 : 0) !== 'wrong' || q0.miss !== 3 ||
          q0.phase !== 'fix') driveOk = false;                               // fix 错候选：零惩罚可重点
      if (engTap(Ld, 0) !== null) driveOk = false;                           // fix 期点石头=非法（阶段门）
    }
    let last = null, guard = 0;
    while (!Ld.done && driveOk && guard++ < 30) {
      const q = Ld.quizzes[Ld.step];
      if (q.phase === 'find') {
        if (engFix(Ld, 0) !== null) { driveOk = false; break; }              // find 期点候选=非法（阶段门——先测后踩：engTap 翻转 phase）
        last = engTap(Ld, q.badPos);
      } else last = engFix(Ld, q.candOk);
      if (last !== 'found' && last !== 'goal' && last !== 'done') { driveOk = false; break; }
    }
    if (!Ld.done || Ld.step !== 5 || last !== 'done' || Ld.retries !== 3 ||
        engStars(Ld) !== 1) driveOk = false;                                 // 3 错点=1 星（口径 0=3/≤2=2/else=1）
    const L3 = genLevel(flat);                                               // 直驱 B：全净通关 3 星
    guard = 0;
    while (!L3.done && guard++ < 30) {
      const q = L3.quizzes[L3.step];
      if (q.phase === 'find') engTap(L3, q.badPos);
      else engFix(L3, q.candOk);
    }
    if (!L3.done || engStars(L3) !== 3) driveOk = false;
    const ok = det && chOk && dchOk && planOk && structAll && specAll && ruleOk && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, planOk: planOk,
                  structAll: structAll, specAll: specAll, ruleOk: ruleOk, driveOk: driveOk,
                  dur: durMs,
                  qs: L1.quizzes.map(q => q.kind + '[' + q.stones.map(s =>
                    colorShort(s.color) + (s.shape ? shapeShort(s.shape) : '') +
                    (s.bad ? '!' : '')).join('') + ']') };
    if (flat < 30) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② find/fix 双步单元 ---- */
  total++;
  startLevel(0);
  const q0 = BG.quiz;
  const els = Array.prototype.slice.call(stonesEl.querySelectorAll('.stone'));
  /* DOM 对账：石数=data-i 序 / 颜色/形状与引擎一致 / data-bad=bad（渲染即引擎） */
  const alignOk = !!q0 && els.length === q0.stones.length && els.every((e, i) =>
    Number(e.dataset.i) === i &&
    e.dataset.color === q0.stones[i].color &&
    (q0.stones[i].shape ? e.dataset.shape === q0.stones[i].shape : !e.dataset.shape) &&
    (e.dataset.bad === '1') === q0.stones[i].bad);
  /* find 阶段候选盘收起 / pattern 提示条不显示 */
  const hiddenOk = !candsEl.classList.contains('show') && !patTipEl.classList.contains('show');
  /* find 期点候选=拒绝（阶段门） */
  const candGateOk = (await BG.tapCand(0)) === false;
  const wi = q0.badPos === 0 ? 1 : 0;               // 首个非错石
  const rL0 = rabbitEl.style.left;                  // 兔子左岸位（内联样式直比——首帧前 offsetLeft 可能未 flush）
  const pW = BG.tapStone(wi);                       // 首错（异步开窗）
  const pW2 = BG.tapStone(q0.badPos);               // 防重入窗内并发：应拒绝
  const rW2 = await pW2, rW = await pW;
  const wrongOk = rW === 'wrong' && rW2 === false &&
    BG.quiz.miss === 1 && BG.currentLevel.retries === 1 &&
    BG.quiz.phase === 'find' &&                     // 不换 phase（未找到）
    stoneEl(wi).classList.contains('wig') &&
    !patTipEl.classList.contains('show') &&         // 首错不泄答案（miss=1 不显提示条）
    rabbitEl.style.left === rL0 && rabbitEl.offsetLeft >= 0;   // wrong 不动兔子（零惩罚不前进不后退）
  const pW3 = BG.tapStone(wi);                      // 第二次错：miss=2 → pattern 提示条浮现（规律可视化）
  await pW3;
  const tipOk = BG.quiz.miss === 2 && patTipEl.classList.contains('show');
  const rF = await BG.tapStone(q0.badPos);          // found：baddie 类+候选盘 show
  const cands = Array.prototype.slice.call(candsEl.querySelectorAll('.cand'));
  const foundOk = rF === 'found' && BG.quiz.phase === 'fix' && BG.quiz.miss === 2 &&
    stoneEl(q0.badPos).classList.contains('baddie') &&
    candsEl.classList.contains('show') &&
    cands.length === 3 &&
    cands.every((e, i) => Number(e.dataset.ci) === i &&
      e.dataset.color === q0.cand[i].color &&
      (q0.cand[i].shape ? e.dataset.shape === q0.cand[i].shape : !e.dataset.shape));
  const stoneGateOk = (await BG.tapStone(0)) === false;   // fix 期点石头=拒绝（阶段门）
  const badC = q0.candOk === 0 ? 1 : 0;             // fix 错候选：wig+miss+1（零惩罚）
  const rBad = await BG.tapCand(badC);
  const fixWrongOk = rBad === 'wrong' && BG.quiz.miss === 3 &&
    candEl(badC).classList.contains('wig') &&
    candEl(q0.candOk).classList.contains('breathe');     // miss≥2 答案级：正确候选 breathe（§0.21）
  const prevEls = Array.prototype.slice.call(stonesEl.querySelectorAll('.stone'));
  const sEl = stoneEl(q0.badPos);                   // 持引用（walk 后 renderQuiz 重建行，detached 节点仍可查）
  const rOk = await BG.tapCand(q0.candOk);          // 修对：fixed-in+walk 脚印+换题
  const walkOk = (rOk === 'goal' || rOk === 'done') && BG.quiz && BG.quiz.step === 1 &&
    sEl.dataset.color === q0.cand[q0.candOk].color &&   // 错石已替换（detached 节点数据仍可查）
    prevEls.every(e => !!e.querySelector('.paw')) &&    // walk 演出逐石脚印（detached 引用）
    rabbitEl.offsetLeft >= 0 &&
    !candsEl.classList.contains('show') &&              // 候选盘已收起
    stonesEl.querySelectorAll('.stone').length === BG.quiz.stones.length;  // 新桥已渲染
  const badIdx = (await BG.tapStone(99)) === false && (await BG.tapStone(-1)) === false &&
    (await BG.tapStone('x')) === false && (await BG.tapStone(1.5)) === false &&
    (await BG.tapCand(9)) === false;
  const dualOk = alignOk && hiddenOk && candGateOk && wrongOk && tipOk && foundOk &&
    stoneGateOk && fixWrongOk && walkOk && badIdx;
  if (dualOk) npass++;
  units.dualStep = { ok: dualOk, align: alignOk, hidden: hiddenOk, candGate: candGateOk,
    wrong: wrongOk, tip: tipOk, found: foundOk, stoneGate: stoneGateOk,
    fixWrong: fixWrongOk, walk: walkOk, badIdx: badIdx };

  /* ---- ②b sayW 三态（页面单元）：flat<3 每错必播 / flat≥3 10s 节流 / 豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 3)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'brg_wrong').length;
  const wrongStoneIdx = () => {
    const q = BG.quiz;
    return q.badPos === 0 ? 1 : 0;
  };
  startLevel(0);                                   // flat0：每错必播（连错两次）
  await BG.tapStone(wrongStoneIdx());
  await BG.tapStone(wrongStoneIdx());
  const sayA = wrongPlays();                       // → 2
  startLevel(3);                                   // flat3：10s 节流
  lastWrongVoice = Date.now();                     /* flat0 分支不写时间戳，显式进入窗口内 */
  await BG.tapStone(wrongStoneIdx());              // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                   // 增量 → 0
  startLevel(3);                                   // 同关重发 fresh quiz：豁免恰一次（miss===2）
  lastWrongVoice = 0;                              /* 隔离上一子用例时间戳 */
  await BG.tapStone(wrongStoneIdx());              // miss=1 → 播（节流窗外）
  await BG.tapStone(wrongStoneIdx());              // miss=2 → force → 播
  const sayC = wrongPlays() - 2 - sayB;            // 增量 → 2
  startLevel(5);                                   // ch2 abc：第三错（miss=3）不再豁免
  lastWrongVoice = 0;
  await BG.tapStone(wrongStoneIdx());              // miss=1 → 播
  await BG.tapStone(wrongStoneIdx());              // miss=2 → force → 播
  await BG.tapStone(wrongStoneIdx());              // miss=3 → force false+10s 窗内 → 静默
  const sayD = wrongPlays() - 2 - sayB - sayC;     // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && sayD === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, thirdWrong: sayD };

  /* ---- ②c 教学链单元：直调 tutorialWatch（watch clip→pattern 读出→演示 found→修对→turn 接力） ---- */
  total++;
  const qLog = [], pLog3 = [], sLog3 = [];
  const origQ3 = KIDS.voice.queue, origP3 = KIDS.voice.play, origS3 = KIDS.voice.say;
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog3.push(String(key)); };
  KIDS.voice.say = function (t) { sLog3.push(String(t)); };
  startLevel(0);                                   // 干净起点（openingSpeak 走 stub 不入对账段）
  await tutorialWatch();                           // SPEED=0.12 提速：看-演示很快完成
  const lastParts = qLog[qLog.length - 1];
  const q0t = BG.quiz;
  /* T46 阶段2：pattern 读出 say→clip 段链（SPEC=flat0 ch1 ab 首 4 石短名 token+尾句「，有一块不对哦」；
     期望 parts 从 SPEC 域推导——brg_t_{色}×stones[0..3]+brg_t_tail，不从 chantKeys 实现归纳） */
  const chantExp = q0t.stones.slice(0, 4).map(s => 'brg_t_' + s.color).concat(['brg_t_tail']);
  const chantParts = qLog.find(ps => ps.length === chantExp.length && ps.every((p, i) => p === chantExp[i]));
  const tutOk = pLog3.indexOf('brg_tut_watch') >= 0 &&                 /* 看=演示配 watch clip */
    pLog3.indexOf('brg_found') >= 0 &&                                 /* found 反馈真实生效 */
    window.__bgDemoR === 'found' &&                                   /* §0.27 演示判对（find 找对） */
    !!chantParts &&                                                    /* pattern 读出=段链（T46） */
    state.tut === 'help' && !state.demo && !state.locked &&           /* 帮：解锁等孩子动手 */
    BG.currentLevel && BG.currentLevel.flat === 0 &&                  /* 重发同关 */
    q0t && q0t.step === 0 && q0t.miss === 0 && q0t.phase === 'find' && /* 新题初态零污染 */
    lastParts && lastParts[0] === 'brg_tut_turn' &&                   /* 交接链=turn clip 单通道 */
    lastParts[1] === 'brg_fix_q';                                     /* 接题面 clip（r9 恒定题面） */
  KIDS.voice.queue = origQ3; KIDS.voice.play = origP3; KIDS.voice.say = origS3;
  startLevel(0);                                   // 还原正常状态（后续单元用）
  if (tutOk) npass++;
  units.tutChain = { ok: tutOk, demoR: window.__bgDemoR, handoff: lastParts ? lastParts[0] : null,
    chant: chantParts || null, tut: state.tut };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, quizzes = 0;
  for (let s = 0; s < 5 && smokeA; s++) {
    const q = BG.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                               // 首题 find 先错一次：晃动+不换 phase；首错不泄答案
      const w = q.badPos === 0 ? 1 : 0;
      await BG.tapStone(w);
      wrongOk2 = BG.currentLevel.retries === 1 && BG.currentLevel.step === 0 &&
        BG.quiz.phase === 'find' && !patTipEl.classList.contains('show');
    }
    const rF2 = await BG.tapStone(BG.quiz.badPos);   // found
    if (rF2 !== 'found') { smokeA = false; break; }
    const rFx = await BG.tapCand(BG.quiz.candOk);    // 修对 → walk → 换题/通关
    if (rFx !== 'goal' && rFx !== 'done') { smokeA = false; break; }
    quizzes++;
  }
  const lvA = BG.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && quizzes === 5 && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, quizzes: quizzes, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1-B4（SPEC 侧独立走序：vBadPos/vCandOk 重建，不读引擎 badPos/candOk） ---- */
  async function specDrive(flat) {
    startLevel(flat);
    const L = genLevel(flat);
    let ok = true;
    for (let s = 0; s < 5 && ok; s++) {
      const q = BG.quiz;
      if (!q) { ok = false; break; }
      const sp = vBadPos({ kind: q.kind, stones: q.stones });   // SPEC 侧独立重建
      if (!sp || sp.badPos !== q.badPos) { ok = false; break; }
      const r1 = await BG.tapStone(sp.badPos);
      if (r1 !== 'found') { ok = false; break; }
      const ci = vCandOk(q, sp);                                // SPEC 侧应值候选
      const r2 = await BG.tapCand(ci);
      if (r2 !== 'goal' && r2 !== 'done') { ok = false; break; }
    }
    return { ok: ok && BG.currentLevel.done, L: L };
  }
  total++;                                        // B1：flat10（ch3 abcd）8 石四色周期+候选全行内色
  const b1 = await specDrive(10);
  const L10 = b1.L;
  const abcdOk = L10.dch === 3 && L10.kinds.every(k => k === 'abcd') &&
    L10.quizzes.every(q => {
      const rowC = new Set(q.stones.map(s => s.color));
      return q.stones.length === 8 && rowC.size === 4 &&                 // 四元四色全行内
        q.cand.every(c => rowC.has(c.color)) && !q.stones.some(s => s.shape);
    });
  const lv10 = BG.currentLevel;
  const smokeOkB1 = b1.ok && abcdOk && lv10.done && lv10.won && lv10.retries === 0 &&
    engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat10 = { ok: smokeOkB1, abcd: abcdOk, retries: lv10.retries };

  total++;                                        // B2：flat15（ch4 aabb）8 石同同异异+成对定位
  const b2 = await specDrive(15);
  const L15 = b2.L;
  const aabbOk = L15.dch === 4 && L15.kinds.every(k => k === 'aabb') &&
    L15.quizzes.every(q => q.stones.length === 8 &&
      new Set(q.stones.map(s => s.color)).size === 2);
  const lv15 = BG.currentLevel;
  const smokeOkB2 = b2.ok && aabbOk && lv15.done && lv15.won && lv15.retries === 0;
  if (smokeOkB2) npass++;
  smokes.flat15 = { ok: smokeOkB2, aabb: aabbOk, retries: lv15.retries };

  total++;                                        // B3：flat20（ch5 dual）双属性+错石恰差一属性+3 星
  const b3 = await specDrive(20);
  const L20 = b3.L;
  const dualRuleOk = L20.dch === 5 && L20.kinds.every(k => k === 'dual') &&
    L20.quizzes.every(q => {
      const sp = vBadPos(q);
      if (!sp) return false;
      const bs = q.stones[q.badPos];
      const cSame = bs.color === sp.expColor, sSame = bs.shape === sp.expShape;
      return q.stones.every(s => s.shape === 'square' || s.shape === 'round') &&
        cSame !== sSame &&                                            // 错石恰差一属性
        q.cand.every((c, i) =>                                        // 干扰（非应值块）恰差一属性
          i === q.candOk ? true : (c.color !== sp.expColor) !== (c.shape !== sp.expShape));
    });
  const lv20 = BG.currentLevel;
  const smokeOkB3 = b3.ok && dualRuleOk && lv20.done && lv20.won && lv20.retries === 0 &&
    engStars(cur) === 3;
  if (smokeOkB3) npass++;
  smokes.flat20 = { ok: smokeOkB3, dual: dualRuleOk, retries: lv20.retries };

  total++;                                        // B4：flat25（ch6 混合 ≥3 型）+ autoSolve 3 星
  startLevel(25);
  const L25 = genLevel(25);
  const mixOk = L25.dch === 6 && new Set(L25.kinds).size >= 3;
  const a25r = await BG.autoSolve();
  const lv25 = BG.currentLevel;
  const smokeOkB4 = mixOk && a25r.done && a25r.taps === 10 && lv25.done && lv25.won &&
    lv25.retries === 0 && engStars(cur) === 3;
  if (smokeOkB4) npass++;
  smokes.flat25 = { ok: smokeOkB4, mix: mixOk, kinds: L25.kinds, taps: a25r.taps, stars: engStars(cur) };

  /* ---- ⑤ 布局：双 viewport × flat{0,10,15,20,25}（量测 offsetWidth/offsetHeight；
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱）；B3 关测 dual 候选态） ---- */
  async function simView(w, h, flat, toFix) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    /* M-A1：竖屏模拟须注入 .port 类吃到竖屏 CSS（媒体查询跟视口不跟元素） */
    document.body.classList.toggle('port', w < h);
    renderQuiz();                                 // 按新场地尺寸重排（兔子重摆）
    if (toFix) {                                  // 抽一题进 fix 候选态（候选盘在场量测）
      await BG.tapStone(BG.quiz.badPos);
    }
    await wait(850);                              // 入场动画 .42s+delay 最长 ~.77s（真实 ms，不吃 SPEED）
    const de = document.documentElement;
    const q = BG.quiz;
    const sts = Array.prototype.slice.call(stonesEl.querySelectorAll('.stone'));
    let countOk = sts.length === q.stones.length;                    // n 石 + data 对账
    sts.forEach((e, i) => {
      if (Number(e.dataset.i) !== i) countOk = false;
    });
    const stoneOk = sts.length === q.stones.length &&
      sts.every(e => e.offsetWidth >= 64 && e.offsetHeight >= 64);  /* 主答案按钮 ≥64（§3-r9） */
    /* M-A1：rect 落容器断言（overflow:hidden 会吞 scrollWidth 溢出，几何才是可见性真值） */
    const gr = g.getBoundingClientRect();
    const rectOk = sts.every(e => {
      const r = e.getBoundingClientRect();
      return r.left >= gr.left - 0.5 && r.right <= gr.right + 0.5 &&
             r.top >= gr.top - 0.5 && r.bottom <= gr.bottom + 0.5;
    });
    const cnds = Array.prototype.slice.call(candsEl.querySelectorAll('.cand'));
    const candOk2 = !toFix || (candsEl.classList.contains('show') &&
      cnds.length === 3 && cnds.every(e => e.offsetWidth >= 64 && e.offsetHeight >= 64));
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      if (b.offsetWidth > 4 && b.offsetHeight > 4 &&
          (b.offsetWidth < 64 || b.offsetHeight < 64)) btnOk = false;
    });
    const rabOk = rabbitEl.offsetWidth >= 40 && rabbitEl.offsetLeft >= 0 && rabbitEl.offsetTop >= 0;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');       // 清理，不泄漏到下一单元
    return { vp: w + 'x' + h, flat: flat, n: q.stones.length, countOk: !!countOk, stone64: stoneOk,
             cand64: candOk2, btn64: btnOk, rabbit: rabOk, rect: rectOk, ox: ox,
             pass: !!countOk && stoneOk && candOk2 && btnOk && rabOk && rectOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 10, 15, 20, 25]) {
    sims.push(await simView(1280, 800, f, f === 20));
    sims.push(await simView(800, 1180, f, f === 20));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = sims.length === 10 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与家族：文案同源 / clips 注入 / estMs / speechOf / chant / 开场链 /
     nextHint 章末逐点独立副本+哨兵 / durMin / 覆盖 ---- */
  total++;
  /* VOICE 八条与 SPEC §3-r9 文案逐字对账（禁手抄 manifest——REF 即 SPEC 原文；
     既有 5 键 r9 一字不改+新增 3 键） */
  const REF = [['watch', 'brg_tut_watch', '看！踩着石头过河'],
               ['turn', 'brg_tut_turn', '你来走一走'],
               ['hint', 'brg_hint', '看看前面的规律'],
               ['right', 'brg_right', '过河啦，你真棒'],
               ['wrong', 'brg_wrong', '看看前面踩了什么'],
               ['fixQ', 'brg_fix_q', '小桥上有一块石头放错啦，找一找'],
               ['fixDo', 'brg_fix_do', '选一块对的石头，补上去'],
               ['found', 'brg_found', '找到啦，就是这块']];
  const srcOk = REF.every(r => VOICE[r[0]].key === r[1] && VOICE[r[0]].text === r[2]);
  /* brg_* 8 条 clips 注入对账（build 注入后 KIDS.voice.clips 应含全部 8 条） */
  const BRG_KEYS = REF.map(r => r[1]);
  const clipOk = BRG_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* r9 新增 3 键实长断言（2026-09-14 ffprobe 实测，±60ms；姊妹款 bub_/wea_ 先例——
     截断/静音 clip 只骗真值检查，实长对账才拦得住） */
  const DUR_KEYS = ['brg_fix_q', 'brg_fix_do', 'brg_found'];
  const SPEC_DUR = { brg_fix_q: 3960, brg_fix_do: 3144, brg_found: 2568 };
  const durs = await Promise.all(DUR_KEYS.map(k => new Promise(res => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; res(-1); } }, 8000);
    const a = new Audio(KIDS.voice.clips[k]);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.load();
  })));
  const clipDurOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[DUR_KEYS[i]]) <= 60);
  /* estMs 家族定版（n*345+600，禁 +300 变体——与源模型 levelDurMs 对账在 ① 已做） */
  const estOk = estMs(1) === 945 && estMs(12) === 12 * 345 + 600 &&
    estMs.toString().indexOf('345') >= 0 && estMs.toString().indexOf('+ 300') < 0;
  /* speechOf phase 分流（synthetic 题，不依赖生成器） */
  const synthFind = { phase: 'find' }, synthFix = { phase: 'fix' };
  const spOk = speechOf(synthFind) === '小桥上有一块石头放错啦，找一找' &&
    speechOf(synthFix) === '选一块对的石头，补上去' &&
    speechOf(null) === '小桥上有一块石头放错啦，找一找';
  /* chantText 句式对账（r9：「红 蓝 红 蓝，有一块不对哦」） */
  const chantSynth = { kind: 'ab', stones: [{ color: 'red' }, { color: 'blue' }, { color: 'red' },
    { color: 'blue' }, { color: 'red' }, { color: 'blue' }] };
  const chantOk = chantText(chantSynth) === '红 蓝 红 蓝，有一块不对哦';
  /* 独立计算器自证：synthetic 题推演（不依赖生成器；位 5 应 blue 显 red=恰一错石） */
  const synthAb = { kind: 'ab', stones: [{ color: 'red', bad: false, pos: 0 }, { color: 'blue', bad: false, pos: 1 },
    { color: 'red', bad: false, pos: 2 }, { color: 'blue', bad: false, pos: 3 },
    { color: 'red', bad: false, pos: 4 }, { color: 'red', bad: true, pos: 5 }] };
  const synthDual = { kind: 'dual', stones: [{ color: 'red', shape: 'square', bad: false, pos: 0 },
    { color: 'blue', shape: 'round', bad: false, pos: 1 }, { color: 'red', shape: 'square', bad: false, pos: 2 },
    { color: 'blue', shape: 'round', bad: false, pos: 3 }, { color: 'red', shape: 'square', bad: false, pos: 4 },
    { color: 'red', shape: 'round', bad: true, pos: 5 }] };   // 应 (red,round)？位 5 应 blue/round——色错形对=恰差一属性
  const specSynthOk = vBadPos(synthAb) && vBadPos(synthAb).badPos === 5 &&
    vBadPos(synthAb).expColor === 'blue' &&
    vBadPos(synthDual) && vBadPos(synthDual).badPos === 5 &&
    vBadPos(synthDual).expColor === 'blue' && vBadPos(synthDual).expShape === 'round';
  /* 开场顺序链（stub 记录）：queue 首段 brg_hint → 第二段 brg_fix_q（clip 单通道接力） */
  const origQ6 = KIDS.voice.queue;
  const qLog6 = [];
  KIDS.voice.queue = function (parts) { qLog6.push(parts.slice()); };
  startLevel(0);
  const openParts = qLog6[qLog6.length - 1];
  const openOk = !!openParts && openParts[0] === 'brg_hint' && openParts[1] === 'brg_fix_q';
  KIDS.voice.queue = origQ6;
  /* r9 nextHint 章末逐点独立副本断言（SPEC §3-r9 文案重列，禁引 CHAPTERS/GEN_HINTS 互证）：
     f=4→预告 ch2 / 9→ch3 / 14→ch4 / 19→ch5 / 24→ch6 / 29→生成关实算 GEN[dch-1]；
     哨兵=nextHint(4) 不得等于 ch3 文案（off-by-one 回归，feed r7 M1 同型坑） */
  const SPEC_HINT = { 4: '三种颜色轮流排队的桥来啦，也要找错哦',
                      9: '四种颜色轮流排队的桥，更难找啦',
                      14: '两块两块挨着排队的桥来啦',
                      19: '石头又有颜色又有形状，要看两样啦',
                      24: '接下来什么花样的桥都有，都来考考你' };
  const V_GEN = ['两色桥找错石头', '三色桥找错石头', '四色桥找错石头',
                 '双胞胎桥找错石头', '彩色形状桥找错石头', '花样桥找错石头'];
  const hintOk = Object.keys(SPEC_HINT).every(f => nextHint(+f) === SPEC_HINT[f]) &&
    nextHint(29) === V_GEN[genLevel(30).dch - 1];
  const hintNeg = nextHint(4) !== SPEC_HINT[9];
  const distOk = srcOk && clipOk && clipDurOk && estOk && spOk && chantOk && specSynthOk && openOk &&
    hintOk && hintNeg &&
    genDch[1] >= 1 && genDch[2] >= 1 && genDch[3] >= 1 && genDch[4] >= 1 &&
    genDch[5] >= 1 && genDch[6] >= 1 &&                          /* 生成关章参数全覆盖 */
    kindCov.ab >= 1 && kindCov.abc >= 1 && kindCov.abcd >= 1 &&
    kindCov.aabb >= 1 && kindCov.dual >= 1 &&                    /* 60 关五 kind 全覆盖 */
    durMin >= V_MIN;                                             /* r9 时长硬断言（每关推算 ≥40s） */
  if (distOk) npass++;
  units.dist = { ok: distOk, voiceSrc: srcOk, clips: clipOk, clipDurs: durs, estMs: estOk, speech: spOk,
    chant: chantOk, specSynth: specSynthOk, openChain: openOk,
    hintOk: hintOk, hintNeg: hintNeg, genDch: genDch, kindCov: kindCov,
    durMin: durMin, durMax: durMax, durLevels: durAll.length };

  const out = { game: 'bridge', total: total, pass: npass, layoutOk: layoutOk,
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
