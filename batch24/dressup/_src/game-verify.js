/* ================= ?verify=1 自检（仅 verify 分支加载执行）——r10 三族版
   ① 静态 20+生成 20 关全量审计（flat 0-39）：确定性/章型（structWhy：三族题型/封闭表/干扰构成/
     候选互异/相邻互异/初始态干净）/同关 5 题签名互异/引擎直驱（三族分流：anti 单击/两击 hold 链）/
     retries=0→3 星/时长 modeled ≥40000ms+与源模型 levelDurMs 逐关对账；dch 聚合（章型分布）
   ② 贴纸池封闭 19 对账：独立 SPEC 常量 vs 页面 STICKERS 逐项
   ③ 主题封闭表对账+三族 need 规则（独立表：conflict/budget=全集、anti=[错位件]∈MISFIT 表）
   ④ need 全贴才过（conflict 引擎级）：贴 n-1 件=hold 不推进，贴齐才 right
   ⑤ 贴错弹回计数（conflict 引擎级）：wrong→miss+1/placed 不变/sel 清空可重试
   ⑥ 两击制语义（flat0 conflict 真实 UI）：sel→hold→right 推进/未选 false/again/unsel
   ⑦ free 零写档零计步：quiz/currentLevel 快照全程不变 + localStorage 不落 kidsgame_dressup
   ⑧ 教学链：tutorialWatch 真实走完（stub 存档）→ __drDemoR='right' 且 tut='help'，≤16s
   ⑨ 吞输入轻叮+可见回应：demo/locked 期拦钩子输入 + 容器 bump
   ⑩ UI 冒烟 A：flat0 autoSolve 通关（3 星）；冒烟 B：先贴错 1 次再 autoSolve（retries=1→2 星）
   ⑪ 星级规则：0=3★/1-2=2★/≥3=1★（引擎构造直测）
   ⑫ 救援钟（piano 双锚）：conflict=need 片 pulse+演示贴一件；budget=先揭错件再装对件（零 miss）
     +方向级不指片；anti=方向级场景 pulse 不指片（不泄答案）+答案级演示点错位件
   ⑬ 布局：双 viewport ×（conflict flat0/budget flat7/anti flat12）：贴纸 ≥64、模式/底栏 ≥64、
     budget 三槽书包在场、overflowX ≤0、gBCR 落容器（r8 纪律⑥：body.port 通道+容器内含断言）
   ⑭ clips：dru_ 9 条 + core 3 条全注入（dataURI 前缀在场）
   ⑮ 章末预告 C7 关键词+r10 nextHint 章末逐点独立副本（静态 M1/生成关 F 实算）+off-by-one 哨兵
     +「找不到撞点必须 fail」F 字面哨兵（r9 m5 纪律）
   ⑯ verify 提速断言：SPEED=0.12；verify 页零写档
   ⑰ r10 冲突池单元：每 conflict 题配对主题干扰 ≥min(3,配对件数)（独立 PAIR 表逐项重算）
   ⑱ r10 预算单元：装入无即时反馈（错件 hold 不弹回）+满员即检（错退对留+miss+1）+
     peel 零惩罚+UI 三槽书包+槽满引导 full 防御层
   ⑲ r10 反向单元：单击即判（对推进/错 miss 不推进）+错位件唯一+其余=主题全集+UI good 闪绿
   ⑳ r10 时长硬断言汇总（独立副本常量禁引引擎）：40 关 modeled min ≥40000ms+逐关对账+
     逐题 DECIDE ≥ estMs(题面句)（语音窗从不撑时长）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const until = async (fn, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < (ms || 8000)) {
      if (fn()) return true;
      await wait(40);
    }
    return fn();
  };
  const quizSnap = () => JSON.stringify(DR.quiz);

  /* ---- r10 独立副本常量（SPEC-BATCH24 §8 口径文字重列，禁引引擎 estMs/DECIDE_MS/TAP_MS 等） ---- */
  const V_EST = c => c * 345 + 600;             // estMs 家族定版式（独立副本）
  const V_DECIDE = { conflict: 6200, budget: 7800, anti: 5400 };
  const V_TAP = 430, V_ADV = 3200, V_SW = 900, V_MIN = 40000;
  const vDur = L => L.quizzes.reduce((s, q) => s + Math.max(V_EST(q.stem.length), V_DECIDE[q.kind]) +
    (q.kind === 'anti' ? 0 : q.need.length * V_TAP) + V_ADV, 0) + 5 * V_SW;

  /* ---- 独立 SPEC 封闭表（§0.57 主题表沿 v1 + §8 r10 三族表；禁抄页面常量） ---- */
  const SPEC_THEMES = {
    school: ['sbag', 'sunhat', 'satchel'], sports: ['shoes', 'cap', 'bpack'],
    nap: ['ncap', 'pjy', 'bear'], party: ['crown', 'bow', 'dress'],
    rain: ['raincoat', 'rboots'], winter: ['scarf', 'gloves', 'coat']
  };
  const SPEC_POOL = {
    sbag: 'school', sunhat: 'school', satchel: 'school',
    shoes: 'sports', cap: 'sports', bpack: 'sports',
    ncap: 'nap', pjy: 'nap', bear: 'nap',
    crown: 'party', bow: 'party', dress: 'party',
    raincoat: 'rain', rboots: 'rain',
    scarf: 'winter', gloves: 'winter', coat: 'winter',
    flower: 'free', star: 'free'
  };
  const SPEC_PAIR = { rain: 'winter', winter: 'rain', school: 'sports', sports: 'school', nap: 'party', party: 'nap' };
  const SPEC_MISFIT = {
    school: ['ncap', 'pjy'], sports: ['ncap', 'pjy'], nap: ['raincoat', 'rboots'],
    party: ['rboots', 'raincoat'], rain: ['crown', 'dress'], winter: ['dress', 'bow']
  };
  const SPEC_BUDGET_THEMES = ['school', 'sports', 'nap', 'party', 'winter'];

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dchStat = { 1: [], 2: [], 3: [], 4: [] };
  let durMinMs = Infinity, durMinFlat = -1;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      if (structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null)) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    /* 同关 5 题有序签名互异（kind+theme+need+栏序） */
    const sigs = L1.quizzes.map(q => q.kind + '|' + q.theme + '|' + q.need.join(',') + '|' + q.stickers.map(s => s.id).join(','));
    const uniq = new Set(sigs).size === CH_LEN;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === (L1.ch - 1) % 4 + 1
                                       : (L1.dch >= 1 && L1.dch <= 4);   // 生成关随机章参数
    /* 引擎直驱（三族分流）：anti 单击 right；conflict/budget 逐件两击 (n-1)×hold+末件 right/done */
    const L3 = genLevel(flat);
    let driveOk = true, taps = 0;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const isLastQ = k === L3.quizzes.length - 1;
      if (q.kind === 'anti') {
        const i = q.stickers.findIndex(s => s.right);
        if (i < 0 || engTapSticker(L3, i) !== (isLastQ ? 'done' : 'right')) driveOk = false;
      } else {
        for (let s = 0; s < q.need.length && driveOk; s++) {
          const i = nextNeededIdx(q);
          if (engTapSticker(L3, i) !== 'sel') { driveOk = false; break; }
          const last = s === q.need.length - 1;
          const exp = last ? (isLastQ ? 'done' : 'right') : 'hold';
          const r = engTapRabbit(L3);
          taps++;
          if (r !== exp) { driveOk = false; break; }
        }
      }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* r10 时长硬断言（每关）：modeled ≥40000ms + 与源模型 levelDurMs 逐关对账一致 */
    const dMs = vDur(L1);
    if (dMs < durMinMs) { durMinMs = dMs; durMinFlat = flat; }
    const durOk = dMs >= V_MIN && levelDurMs(L1) === dMs && levelDurMs(L2) === dMs;
    /* dch 聚合（仅静态关——生成关章参数随机，精确计数无意义；dch4=混合无单族，kindsOk 空真） */
    if (flat < STATIC_LEVELS) dchStat[L1.dch].push({
      flat: flat,
      kindsOk: L1.dch === 4 || L1.quizzes.every(q => q.kind === ['conflict', 'budget', 'anti'][L1.dch - 1]),
      mixAll: L1.dch !== 4 || ['conflict', 'budget', 'anti'].every(k => L1.quizzes.some(q => q.kind === k))
    });
    const ok = det && ruleOk && uniq && chOk && dchOk && driveOk && solvedAll && durOk;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, uniq: uniq,
                   chOk: chOk, dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, durOk: durOk, taps: taps,
                   quizzes: L1.quizzes.map(q => q.kind + ':' + q.theme + ':' + q.need.join('+')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const dch1Ok = dchStat[1].length === 5 && dchStat[1].every(s => s.kindsOk);
  const dch2Ok = dchStat[2].length === 5 && dchStat[2].every(s => s.kindsOk);
  const dch3Ok = dchStat[3].length === 5 && dchStat[3].every(s => s.kindsOk);
  const dch4Ok = dchStat[4].length === 5 && dchStat[4].every(s => s.kindsOk && s.mixAll);
  const dchAggOk = dch1Ok && dch2Ok && dch3Ok && dch4Ok;
  if (dchAggOk) npass++;
  units.dch = { ok: dchAggOk, dch1conflict: dch1Ok, dch2budget: dch2Ok, dch3anti: dch3Ok, dch4mix: dch4Ok,
                n: { 1: dchStat[1].length, 2: dchStat[2].length, 3: dchStat[3].length, 4: dchStat[4].length } };

  /* ---- ② 贴纸池封闭对账（独立 SPEC 常量，禁抄页面表）：17 主题物品并集+2 自由装饰=19 ---- */
  total++;
  const POOL_WANT = 19;
  const poolOk = STICKER_IDS.length === POOL_WANT && Object.keys(SPEC_POOL).length === POOL_WANT &&
    STICKER_IDS.every(id => SPEC_POOL[id] === STICKERS[id].theme) &&
    Object.keys(SPEC_POOL).every(id => STICKERS[id] && STICKERS[id].n) &&
    FREE_DECO.length === 2 && FREE_DECO.every(id => STICKERS[id].theme === 'free');
  if (poolOk) npass++;
  units.pool = { ok: poolOk, n: STICKER_IDS.length, want: POOL_WANT };

  /* ---- ③ 主题封闭表对账+三族 need 规则（独立表逐题重算） ---- */
  total++;
  let themeOk = Object.keys(THEMES).length === 6 &&
    THEME_IDS.length === 6 &&
    Object.keys(SPEC_THEMES).every(t => THEMES[t] && THEMES[t].items.join() === SPEC_THEMES[t].join());
  for (let flat = 0; flat < 40 && themeOk; flat++) {
    const L = genLevel(flat);
    for (const q of L.quizzes) {
      const tbl = SPEC_THEMES[q.theme];
      if (!tbl) { themeOk = false; break; }
      /* anti 的 need=错位件（跨主题，由 SPEC_MISFIT 校验）——inTable 仅约束 conflict/budget */
      const inTable = q.kind === 'anti' || q.need.every(id => tbl.indexOf(id) >= 0);
      const stickerNeed = q.need.every(id => q.stickers.some(s => s.id === id));
      const rightOk = q.stickers.every(s => s.right === (q.need.indexOf(s.id) >= 0));
      let kindOk;
      if (q.kind === 'anti') {
        kindOk = q.need.length === 1 && SPEC_MISFIT[q.theme].indexOf(q.need[0]) >= 0 &&
                 q.stickers.filter(s => !s.right).length === tbl.length &&
                 tbl.every(id => q.stickers.some(s => s.id === id && !s.right));
      } else {
        kindOk = q.need.length === tbl.length && tbl.every(id => q.need.indexOf(id) >= 0);
        if (q.kind === 'budget') kindOk = kindOk && q.budget === 3 && SPEC_BUDGET_THEMES.indexOf(q.theme) >= 0;
      }
      if (!(inTable && stickerNeed && rightOk && kindOk)) { themeOk = false; break; }
    }
  }
  if (themeOk) npass++;
  units.themes = { ok: themeOk };

  /* ---- ④ need 全贴才过（conflict 引擎级，§0.57 hold 状态机沿 v1） ---- */
  total++;
  const LN = genLevel(0);                          // flat0 题0 = conflict rain 2 件（教学锚）
  const qN = LN.quizzes[0];
  const s1 = engTapSticker(LN, nextNeededIdx(qN));
  const h1 = engTapRabbit(LN);                     // 贴对首件 = hold（缺一不过）
  const c41 = s1 === 'sel' && h1 === 'hold' && qN.placed.length === 1 &&
              LN.step === 0 && !qN._answered && qN._miss === 0;
  const s2 = engTapSticker(LN, nextNeededIdx(qN));
  const r2 = engTapRabbit(LN);                     // 贴齐 = right 推进
  const c42 = s2 === 'sel' && r2 === 'right' && LN.step === 1 && qN._answered &&
              LN.quizzes[1].placed.length === 0;
  const noSkip = c41 && c42;
  if (noSkip) npass++;
  units.needall = { ok: noSkip, holdFirst: c41, fullAdvance: c42 };

  /* ---- ⑤ 贴错弹回计数（conflict 引擎级） ---- */
  total++;
  const LW = genLevel(0);
  const qW = LW.quizzes[0];
  const wrongIdx = qW.stickers.findIndex(s => !s.right);
  const wSel = engTapSticker(LW, wrongIdx);
  const placedB = qW.placed.length;
  const w1 = engTapRabbit(LW);                     // 贴错：miss+1、placed 不变、sel 清空
  const c51 = wSel === 'sel' && w1 === 'wrong' && qW._miss === 1 && LW.retries === 1 &&
              qW.placed.length === placedB && qW.sel === null && !qW._answered;
  const wNosel = engTapRabbit(LW);                 // 无选中=无效动作不计数
  const c52 = wNosel === 'nosel' && qW._miss === 1 && LW.retries === 1;
  const okIdx = nextNeededIdx(qW);                 // 弹回后可重试（贴对仍推进）
  engTapSticker(LW, okIdx);
  const w2 = engTapRabbit(LW);
  const c53 = w2 === 'hold' && qW.placed.length === 1 && qW._miss === 1;
  const wrongOk = c51 && c52 && c53;
  if (wrongOk) npass++;
  units.wrong = { ok: wrongOk, bounce: c51, nosel: c52, retry: c53 };

  /* ---- ⑥ 两击制语义（flat0 conflict 真实 UI 状态机） ---- */
  total++;
  const modeTask0 = DR.mode() === 'task';
  DR.start(0);
  await until(() => !state.locked && !state.busy);
  const stOk0 = DR.currentLevel.flat === 0 && DR.currentLevel.ch === 1 &&
                DR.quiz.kind === 'conflict' && DR.quiz.theme === 'rain' && DR.quiz.need.length === 2;
  const nosel = await DR.tapRabbit();              // 未选贴纸点兔子=无效
  const noselOk = nosel === false;
  const i1 = DR.quiz.stickers.findIndex(s => s.id === DR.quiz.need[0]);
  const sel1 = DR.tapSticker(i1);                  // 第一击=选中
  const c61 = sel1 === 'sel';
  const snap6 = quizSnap();
  const hold1 = await DR.tapRabbit();              // 第二击=贴上（首件 hold）
  const c62 = hold1 === 'hold' && DR.quiz.placed.length === 1 && DR.quiz.step === 0 &&
              DR.quiz.miss === 0 && quizSnap() !== snap6;
  const again1 = DR.tapSticker(i1);                // 点已贴片=again 零惩罚
  const c63 = again1 === 'again' && DR.quiz.miss === 0;
  const i2 = DR.quiz.stickers.findIndex(s => s.id === DR.quiz.need[1]);
  const sel2 = DR.tapSticker(i2);
  const unsel2 = DR.tapSticker(i2);                // 再点选中片=取消
  const c64 = sel2 === 'sel' && unsel2 === 'unsel';
  DR.tapSticker(i2);
  const right2 = await DR.tapRabbit();             // 贴齐=推进（题 2 场景全换）
  const c65 = right2 === 'right' && DR.currentLevel.step === 1 &&
              DR.quiz.step === 1 && DR.quiz.placed.length === 0 && DR.quiz.miss === 0;
  const tapOk = modeTask0 && stOk0 && noselOk && c61 && c62 && c63 && c64 && c65;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, task0: modeTask0 && stOk0, nosel: noselOk, sel: c61,
                hold: c62, again: c63, unsel: c64, advance: c65 };

  /* ---- ⑦ free 零写档零计步（piano free 同构：quiz 静止、levels 不动、localStorage 不落） ---- */
  total++;
  DR.start(0);
  await until(() => !state.locked && !state.busy);
  const lvB = JSON.stringify(DR.currentLevel);
  const qzB = quizSnap();
  DR.setMode('free');
  const freeMode = DR.mode() === 'free';
  const f1 = DR.tapSticker(0);                     // free 两击贴上一件（STICKER_IDS 全池下标）
  const f2 = await DR.tapRabbit();
  const f3 = DR.tapSticker(3);
  const f4 = await DR.tapRabbit();
  const peel = DR.freePeel(0);                     // 揭下一件
  const clr = DR.freeClear();                      // 清空
  const freeOk = freeMode && f1 === 'free' && f2 === 'free' && f3 === 'free' && f4 === 'free' &&
                 peel === STICKER_IDS[0] && clr === true &&
                 quizSnap() === qzB && JSON.stringify(DR.currentLevel) === lvB &&  /* quiz/关模型静止 */
                 DR.currentLevel.step === 0 && DR.quiz.miss === 0;                 /* 零计步零 miss */
  let lsFree = 'unset';
  try { lsFree = localStorage.getItem('kidsgame_dressup'); } catch (e) {}
  const lsOk = lsFree === null;                    /* free 操作绝不写档 */
  DR.setMode('task');
  const backOk = DR.mode() === 'task' && DR.currentLevel.flat === 0 &&
                 DR.currentLevel.step === 0;
  if (freeOk && lsOk && backOk) npass++;
  units.free = { ok: freeOk && lsOk && backOk, zero: freeOk, lsNull: lsOk, backTask: backOk };

  /* ---- ⑧ 教学链：tutorialWatch 真实走完 → __drDemoR='right' ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};
  DR.start(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;            // 折算真实页时长
  const tutOk = window.__drDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__drDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑨ 吞输入轻叮+可见回应：demo/locked 期拦钩子输入 + bump ---- */
  total++;
  DR.start(0);
  await until(() => !state.locked && !state.busy);
  state.demo = true; state.locked = true;                            // 模拟教学"看"演示期
  const sw1 = DR.tapSticker(0) === false && trayEl.classList.contains('bump');
  const sw2 = (await DR.tapRabbit()) === false;
  state.demo = false; state.locked = true;                           // 演出窗（locked）
  const sw3 = DR.tapSticker(0) === false;
  state.locked = false;                                              // 还原（后续单元自行 start）
  const swallowOk = sw1 && sw2 && sw3 && DR.currentLevel.step === 0 &&
                    DR.quiz.step === 0 && DR.quiz.miss === 0 && DR.quiz.placed.length === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, trayBump: sw1, rabbitSwallow: sw2, locked: sw3 };

  /* ---- ⑩ UI 冒烟 A：flat0 autoSolve 通关（retries 0 → 3 星，不弹层不写档） ---- */
  total++;
  DR.start(0);
  await until(() => !state.locked && !state.busy);
  const wantTaps = cur.quizzes.reduce((s, q) => s + (q.kind === 'anti' ? 1 : q.need.length), 0);
  const a0 = await DR.autoSolve();
  const lv0 = DR.currentLevel;
  const smokeA = a0.done && a0.taps === wantTaps && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, want: wantTaps, stars: engStars(cur) };

  /* ---- ⑩B UI 冒烟 B：flat0 先贴错 1 次再 autoSolve（retries=1 → 2 星） ---- */
  total++;
  DR.start(0);
  await until(() => !state.locked && !state.busy);
  const wrongI = DR.quiz.stickers.findIndex(s => !s.right);
  DR.tapSticker(wrongI);
  const rwP = DR.tapRabbit();                      // 在途（飞行窗→错贴 1000ms 防重入窗全程 busy/locked）
  const guardWin = DR.tapSticker(0) === false;     /* 窗内紧邻输入被吞（b16 定案：错点防重入 1000ms） */
  const rw = await rwP;
  const a1 = await DR.autoSolve();
  const lv1 = DR.currentLevel;
  const smokeB = rw === 'wrong' && guardWin && a1.done && lv1.done && lv1.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat0miss1 = { ok: smokeB, rw: rw, guardWin: guardWin, miss: lv1.miss, stars: engStars(cur) };

  /* ---- ⑪ 星级规则（引擎构造直测：0=3★/1-2=2★/≥3=1★） ---- */
  total++;
  const LS = genLevel(5);
  const s11 = [];
  [0, 1, 2, 3, 7].forEach(m => { LS.retries = m; s11.push(engStars(LS)); });
  const starsOk = s11[0] === 3 && s11[1] === 2 && s11[2] === 2 && s11[3] === 1 && s11[4] === 1;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, got: s11, want: [3, 2, 2, 1, 1] };

  /* ---- ⑫ 教援钟（piano 双锚）：conflict=need 片 pulse+演示贴；budget=先揭错再装对（零 miss）
     +方向级不指片；anti=方向级场景 pulse 不指片（不泄答案）+答案级演示点错位件 ---- */
  total++;
  DR.start(0);                                     // conflict（v1 断言沿）
  await until(() => !state.locked && !state.busy);
  const needIdx = () => nextNeededIdx(cur.quizzes[cur.step]);
  const dEl = stkBtnOf(needIdx());
  const dOk = rescueDir() && dEl.classList.contains('pulse');       /* 14s 方向级：need 未贴片 pulse */
  const before = DR.quiz.placed.length;
  const aOkR = await rescueAns();                                    /* 30s 答案级：演示真贴一件 */
  const aOk = aOkR === true && DR.quiz.placed.length === before + 1;
  const anchorReset = rescueDirDone === false && rescueAnsDone === false;   /* 演示=有效动作重开救援窗 */
  /* budget：先装一件错件 → 救援须揭回错件再装对件（帮做不制造 miss），方向级不指片 */
  DR.start(5);
  await until(() => !state.locked && !state.busy);
  const bq = cur.quizzes[cur.step];
  const bNoPulse = rescueDir() && !Array.from(trayEl.querySelectorAll('.stk'))
                   .some(b => b.classList.contains('pulse')) && sceneEl.classList.contains('pulse');
  const bWrongI = bq.stickers.findIndex(s => !s.right);
  DR.tapSticker(bWrongI);
  await DR.tapRabbit();                            // 装入错件=hold（不弹回）
  const bOkR = await rescueAns();
  const bOk = bOkR === true && bq.placed.length === 1 &&
              bq.need.indexOf(bq.placed[0]) >= 0 && (bq._miss || 0) === 0;
  /* anti：方向级不指片；答案级演示点错位件（题推进） */
  DR.start(10);
  await until(() => !state.locked && !state.busy);
  const aDirOk = rescueDir() && !Array.from(trayEl.querySelectorAll('.stk'))
                 .some(b => b.classList.contains('pulse')) && sceneEl.classList.contains('pulse');
  const stepB = DR.currentLevel.step;
  const aAnsR = await rescueAns();
  const aAnsOk = aAnsR === true && DR.currentLevel.step === stepB + 1;
  const rescueOk = dOk && aOk && anchorReset && bNoPulse && bOk && aDirOk && aAnsOk;
  if (rescueOk) npass++;
  units.rescue = { ok: rescueOk, conflictDir: dOk, conflictAns: aOk, anchorReset: anchorReset,
                   budgetDirNoLeak: bNoPulse, budgetAns: bOk, antiDirNoLeak: aDirOk, antiAns: aAnsOk };

  /* ---- ⑬ 布局：双 viewport ×（conflict flat0 / budget flat7 / anti flat12）
     r8 纪律⑥：媒体查询跟视口——页内模拟竖屏走 body.port 类通道 + gBCR 落容器断言 ---- */
  async function simView(w, h) {
    const g = $id('game');
    const portrait = h > w;
    document.body.classList.toggle('port', portrait);
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    DR.start(g._simFlat);
    await wait(1000);                              /* 等 .stk pop 入场动画结束（gBCR 含 transform 缩放，动画中量测=假小） */
    const gr = g.getBoundingClientRect();
    const inG = r => r.right <= gr.right + 1 && r.left >= gr.left - 1 && r.bottom <= gr.bottom + 1;
    const stks = Array.prototype.map.call(trayEl.querySelectorAll('.stk'), b => {
      const r = b.getBoundingClientRect();
      return { w: b.offsetWidth, h: b.offsetHeight, in: inG(r) };   /* 尺寸=offset（布局真值）；落容器=gBCR */
    });
    const btns = [btnFree, btnTask, rabbitBtn, hearBtn, replayBtn].map(b => {
      const r = b.getBoundingClientRect();
      return { w: b.offsetWidth, h: b.offsetHeight, in: inG(r) };
    });
    const sc = sceneEl.getBoundingClientRect();
    const slotsOk = sceneEl.dataset.kind !== 'budget' ||
                    sceneEl.querySelectorAll('.pack-slots i').length === 3;
    const stkOk = stks.length >= 3 && stks.every(b => b.w >= 64 && b.h >= 64 && b.in);
    const btnOk = btns.every(b => b.w >= 64 && b.h >= 64 && b.in);
    const scOk = sc.width >= 64 && sc.height >= 64 && inG(sc);
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, stks: stks.length, stkOk: stkOk, btnOk: btnOk, scOk: scOk,
             slotsOk: slotsOk, port: portrait, ox: ox,
             pass: stkOk && btnOk && scOk && slotsOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 7, 12]) {
    $id('game')._simFlat = flat;
    sims.push(await simView(1280, 800));
    sims.push(await simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  document.body.classList.remove('port');
  DR.start(0);                                    // 还原
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑭ clips：dru_ 26（既有 9 + T46 阶段2 题面 17）+ core 3 条全注入 ---- */
  total++;
  const keysC = Object.keys(KIDS.voice.clips);
  const t46Dru = [];
  for (const t of ['school', 'sports', 'nap', 'party', 'rain', 'winter']) t46Dru.push('dru_q_' + t);
  for (const t of ['school', 'sports', 'nap', 'party', 'winter']) t46Dru.push('dru_qb_' + t);
  for (const t of ['school', 'sports', 'nap', 'party', 'rain', 'winter']) t46Dru.push('dru_qa_' + t);
  const need = ['dru_tut_watch', 'dru_tut_turn', 'dru_hint', 'dru_right', 'dru_wrong', 'dru_free',
                'dru_budget_hint', 'dru_anti_hint', 'dru_anti_right']
    .concat(t46Dru, ['core_chapter_end', 'core_day_end', 'core_rest']);
  const clipsOk = keysC.length === 29 && t46Dru.length === 17 &&
    need.every(k => keysC.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keysC.length, keys: keysC };

  /* ---- ⑮ 章末预告 C7 关键词 + r10 nextHint 章末逐点独立副本（契约 A/F/M1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('三样') >= 0 &&        // 预告 ch2 装备预算
                 CHAPTERS[2].hint.indexOf('不合适') >= 0 &&      // 预告 ch3 反向排除
                 CHAPTERS[3].hint.indexOf('混') >= 0 &&          // 预告 ch4 混合
                 CHAPTERS[4].hint.indexOf('自由') >= 0 &&        // 预告生成关
                 GEN_HINTS[0].indexOf('相似') >= 0 &&            // dch1 主题冲突池
                 GEN_HINTS[1].indexOf('三样') >= 0 &&            // dch2 装备预算
                 GEN_HINTS[2].indexOf('不合适') >= 0 &&          // dch3 反向排除
                 GEN_HINTS[3].indexOf('混') >= 0 &&              // dch4 混合
                 typeof nextHint === 'function';                // 判卫（r7 纪律①：跨块 const 不挂 window）
  /* 逐点断言累加器（单布尔装不下 8 逐点+哨兵） */
  let nhOkAll = true;
  const hintOk2Check = (ok, why) => { if (!ok) nhOkAll = false; };
  /* 静态章末逐点（M1：CHAPTERS[floor(f/5)+1]）+ off-by-one 哨兵（非当前章/非下下章） */
  const nhPts = {};
  for (const f of [4, 9, 14, 19]) {
    const ci = Math.floor(f / 5);
    const got = nextHint(f);
    nhPts['s' + f] = got;
    hintOk2Check(got === CHAPTERS[ci + 1].hint &&              // M1：CHAPTERS[floor(f/5)+1]
                 got !== (CHAPTERS[ci] || {}).hint &&           // 左移哨兵（ci=0 无左邻跳过）
                 (ci + 2 > 4 || got !== CHAPTERS[ci + 2].hint), 'static ' + f);  // 右移哨兵
  }
  /* 生成关章末逐点（F：实算 GEN_HINTS[genLevel(f+1).dch-1]——禁 (ci+1)%4 字面） */
  for (const f of [24, 29, 34, 39]) {
    const got = nextHint(f);
    nhPts['g' + f] = got;
    hintOk2Check(got === GEN_HINTS[genLevel(f + 1).dch - 1], 'gen ' + f);
  }
  /* 契约 F 字面哨兵：找一个生成关使实算 dch-1 ≠ 字面 (ci+1)%4，断言 nextHint 跟实算不跟字面。
     r9 m5 纪律：找不到撞点=断言失效（恒真路径），必须 fail 而非静默通过 */
  let sentOk = false, sentNote = 'no-diff-found';
  for (let f = 24; f < 60; f++) {
    const ci = Math.floor(f / 5), real = genLevel(f + 1).dch - 1, lit = (ci + 1) % 4;
    if (ci >= 4 && real !== lit) {
      sentOk = nextHint(f) === GEN_HINTS[real] && nextHint(f) !== GEN_HINTS[lit];
      sentNote = 'f=' + f + ' real=' + real + ' lit=' + lit;
      break;
    }
  }
  const hintAllOk = hintOk && nhOkAll && sentOk;
  if (hintAllOk) npass++;
  units.hint = { ok: hintAllOk, kw: hintOk, perPoint: nhOkAll, sentinel: sentOk, sentNote: sentNote,
                 n4: nextHint(4), n24: nextHint(24), n34: nextHint(34), pts: nhPts };

  /* ---- ⑯ verify 提速 + verify 页零写档 ---- */
  total++;
  let lsDressup = null;
  try { lsDressup = localStorage.getItem('kidsgame_dressup'); } catch (e) {}
  const speedOk = SPEED === 0.12 && lsDressup === null;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED, lsDressup: lsDressup === null };

  /* ---- ⑰ r10 冲突池单元：每 conflict 题配对主题干扰 ≥min(3,配对件数)（独立 PAIR 表逐项重算） ---- */
  total++;
  let cpOk = true;
  const cpBad = [];
  for (let flat = 0; flat < 40 && cpOk; flat++) {
    const L = genLevel(flat);
    for (const q of L.quizzes) {
      if (q.kind !== 'conflict') continue;
      const pair = SPEC_PAIR[q.theme];
      const pairN = q.stickers.filter(s => SPEC_POOL[s.id] === pair && !s.right).length;
      const want = Math.min(3, SPEC_THEMES[pair].length);
      const themesN = new Set(q.stickers.map(s => SPEC_POOL[s.id])).size;
      if (pairN < want || themesN < 2) { cpOk = false; cpBad.push({ flat: flat, pairN: pairN, want: want }); break; }
    }
  }
  if (cpOk) npass++;
  units.conflictpool = { ok: cpOk, bad: cpBad.slice(0, 3) };

  /* ---- ⑱ r10 预算单元：装入无即时反馈+满员即检（错退对留+miss+1）+peel 零惩罚+UI 三槽书包 ---- */
  total++;
  const LB = genLevel(5);                          // ch2 首关（全 budget）
  const qB18 = LB.quizzes[0];
  const e1 = qB18.budget === 3 && qB18.stickers.length === 6 &&
             qB18.stickers.filter(s => SPEC_POOL[s.id] === SPEC_PAIR[qB18.theme] && !s.right).length >= 2;
  const dI = qB18.stickers.findIndex(s => !s.right);
  engTapSticker(LB, dI);
  const rHoldWrong = engTapRabbit(LB);             // 装入错件=hold（不弹回不计数）
  const e2 = rHoldWrong === 'hold' && qB18.placed.length === 1 && (qB18._miss || 0) === 0;
  engTapSticker(LB, nextNeededIdx(qB18));
  const rH2 = engTapRabbit(LB);
  engTapSticker(LB, nextNeededIdx(qB18));
  const rChk = engTapRabbit(LB);                   // 满员=[错,对,对] → 检查未过
  const e3 = rH2 === 'hold' && rChk === 'wrong' && qB18._miss === 1 && LB.retries === 1 &&
             qB18.placed.length === 2 && qB18.placed.every(id => qB18.need.indexOf(id) >= 0);
  engTapSticker(LB, nextNeededIdx(qB18));
  const rRec = engTapRabbit(LB);                   // 补齐第 3 对件 → 过
  const e4 = rRec === 'right' && LB.step === 1;
  const LP = genLevel(6);                          // peel：装入 1 件后揭回（零惩罚）
  const qP = LP.quizzes[0];
  engTapSticker(LP, nextNeededIdx(qP));
  engTapRabbit(LP);
  const placedP = qP.placed[0];                    // 已装 id（栏序首片对件，非 need[0]——洗牌后序不定）
  const peeled = engPeel(LP, 0);
  const e5 = peeled === placedP && qP.placed.length === 0 && (qP._miss || 0) === 0 && LP.retries === 0;
  const engBudgetOk = e1 && e2 && e3 && e4 && e5;
  /* UI 级：三槽书包 DOM + 错件退回可视 + 槽满引导 */
  DR.start(5);
  await until(() => !state.locked && !state.busy);
  const uiSlots = sceneEl.dataset.kind === 'budget' &&
                  sceneEl.querySelectorAll('.pack-slots i').length === 3 &&
                  sceneEl.querySelectorAll('.pack #bunny-wear').length === 1;
  const badI2 = DR.quiz.stickers.findIndex(s => !s.right);
  DR.tapSticker(badI2);
  const uHoldWrong = await DR.tapRabbit();         // UI 装错件=hold（badge 挂上不弹）
  const uiBadge1 = sceneEl.querySelectorAll('#bunny-wear .wear').length === 1;
  const placedBad = DR.quiz.placed[0];             // 已装=该错件 id（对账基准）
  const p1 = DR.peel(0);                           // UI 揭回（badge 消失+片恢复可选）
  const uiPeel = p1 === placedBad &&
                 sceneEl.querySelectorAll('#bunny-wear .wear').length === 0;
  const missB = DR.currentLevel.miss;              // 揭回零惩罚：miss 不增
  const uiBudgetOk = uiSlots && uHoldWrong === 'hold' && uiBadge1 && uiPeel && missB === 0;
  const budgetOk = engBudgetOk && uiBudgetOk;
  if (budgetOk) npass++;
  units.budget = { ok: budgetOk, table: e1, noBounce: e2, capCheck: e3, recover: e4, peel: e5,
                   ui: uiBudgetOk };

  /* ---- ⑲ r10 反向单元：单击即判+错位件唯一+其余=主题全集+UI good 闪绿 ---- */
  total++;
  const LA = genLevel(10);                         // ch3 首关（全 anti）
  const qA = LA.quizzes[0];
  const an1 = qA.need.length === 1 && SPEC_MISFIT[qA.theme].indexOf(qA.need[0]) >= 0 &&
              qA.stickers.filter(s => s.right).length === 1 &&
              qA.stickers.filter(s => !s.right).every(s => SPEC_THEMES[qA.theme].indexOf(s.id) >= 0);
  const fitI = qA.stickers.findIndex(s => !s.right);
  const rW19 = engTapSticker(LA, fitI);            // 点合适件=wrong（miss+1 不推进）
  const an2 = rW19 === 'wrong' && qA._miss === 1 && LA.retries === 1 && LA.step === 0 && !qA._answered;
  const misI = qA.stickers.findIndex(s => s.right);
  const rR19 = engTapSticker(LA, misI);            // 点错位件=right（推进）
  const an3 = rR19 === 'right' && LA.step === 1 && qA._answered;
  const engAntiOk = an1 && an2 && an3;
  DR.start(10);
  await until(() => !state.locked && !state.busy);
  const uiW = DR.tapSticker(DR.quiz.stickers.findIndex(s => !s.right));
  const uiWOk = uiW === 'wrong' && DR.quiz.miss === 1 && DR.currentLevel.step === 0;
  await until(() => !state.locked && !state.busy);
  const misI2 = DR.quiz.stickers.findIndex(s => s.right);
  const misEl = stkBtnOf(misI2);
  const uiR = DR.tapSticker(misI2);                // 单击即判：同步返回+good 闪绿（演出异步）
  const uiROk = uiR === 'right' && misEl && misEl.classList.contains('good');
  await until(() => DR.currentLevel.step === 1);   /* 演出锁等足窗（r7 纪律③：推进≠可交互，等 ADV 窗走完） */
  const uiAdv = DR.currentLevel.step === 1 && DR.quiz.step === 1;
  const antiOk = engAntiOk && uiWOk && uiROk && uiAdv;
  if (antiOk) npass++;
  units.anti = { ok: antiOk, table: an1, wrongTap: an2, rightTap: an3, uiWrong: uiWOk, uiGood: uiROk, uiAdvance: uiAdv };

  /* ---- ⑳ r10 时长硬断言汇总（独立副本常量；40 关 modeled min ≥40000+逐关对账+语音窗不撑时长） ---- */
  total++;
  let dMin = Infinity, dFlat = -1, parityOk = true, voiceOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;
    for (const q of L.quizzes) {
      if (V_DECIDE[q.kind] < V_EST(q.stem.length)) voiceOk = false;   // 逐题：决策 ≥ 语音窗
    }
  }
  const durUnitOk = dMin >= V_MIN && parityOk && voiceOk && durMinMs === dMin;
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
                     parity: parityOk, voiceNeverDominates: voiceOk };

  const out = { game: 'dressup', total: total, pass: npass, layoutOk: layoutOk,
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
  KIDS.voice.say = function () {};
  KIDS.voice.queue = function () {};
  runVerify();
}
