/* ================= ?verify=1 自检 v2（仅 verify 分支加载执行）
   断言全部从 SPEC-BATCH23 §1 v2（delta 改造定版）独立推导——SPEC_* 表本文件重列，
   不引用实现 WEATHER/CLOTHES/ZONES/CH1_ROWS/COMBOS 符号（禁同源对拍）。
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性 / 结构规则 structWhy 全 null /
     章号映射 / 引擎直驱（单件=right/done、多件=pick×need+submit→right/done）→ 全关 3★
   ② 独立真值对账（SPEC 池 13 件 cls/zone + 5 区间 outfit + 梯子 + ch1 行表 + ch2 组合表 +
     who 升降档 + anti 场景表）× 40 关全题：need 对表 / 候选唯一正确 / 卡数 6-5-4
   ③ 多件提交状态机：含错件=wrong_more 清空+miss / 未选满=wrong_less 保留 / 取消勾选零惩罚 /
     勾满恰 need=right
   ④ 点卡单元（flat0 锚定 multi cm0：题面两条件+6 候选；错窗防重入；提交钮显隐同步）
   ⑤ 教学链：tutorialWatch 真实走完（stub 存档）→ __weDemoR='right' 且步骤链
     [pick,pick,right]，tut='help'，watch 折算 ≤16s，flat0 题0 恒锚定
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 容器 bump
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（q0=2 勾+提交，q1-4 单件；taps=6，3★）
   ⑧ UI 冒烟 B：flat5（dch2 全 multi）先 wrong_more 一次再 autoSolve（miss=1→2★，taps=10）
   ⑨ 章分布聚合：dch1 行覆盖（静态 5 关 9 行全现）/ dch2 每关 5 组合齐 / dch3 静态 5 关
     9 档温度全现+每关 ≥1 边界题（8/16/24）+相邻区间互异+温度→区间→outfit 全对表 /
     dch4 每关 who·anti 各 ≥1+相邻题型互异 / 生成关四型全现
   ⑩ 布局：双 viewport ×（flat0 多件 6 卡 / flat10 温度计 / flat15 ch4 混排）：
     卡 ≥96×96、场景 ≥64、条件 chip ≥56、overflowX ≤0、描边对比度 ≥3:1
   ⑪ clips：wea_ 16 条 + core 3 条全注入
   ⑫ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（floor 1）
   ⑬ 章末预告 C7：hint[i]↔下一章特征；GEN_HINTS[k]↔dch=k+1；r9 nextHint 章末逐点独立副本
     （静态 f=4/9/14/19=CHAPTERS[floor(f/5)+1] + 生成关 f=24/29/34/39=GEN_HINTS[genLevel(f+1).dch-1]
     实算 + off-by-one 哨兵：非当前章/非下下章/字面 (ci+1)%4 撞点用实算值区分）
   ⑭ verify 提速断言：SPEED=0.12
   ⑮ r9 时长硬断言汇总（独立副本常量重列禁引引擎）：40 关 modeled min ≥40000ms +
     与源模型 levelDurMs 逐关对账一致 + 认知占比 ≥85% 且逐题 DECIDE ≥ estMs(题面句)（防纯语音窗）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- SPEC 独立真值表（从 delta 文字重列，禁引用实现符号） ---- */
  const SPEC_POOL = {                    /* 池 13 件：cls=天气类 / zone=唯一温度区间(1-5,0=雨具) */
    downcoat: { cls: 'snow', zone: 1 }, gloves: { cls: 'snow', zone: 1 }, snowboots: { cls: 'snow', zone: 1 },
    coat: { cls: 'snow', zone: 2 }, scarf: { cls: 'snow', zone: 2 },
    jacket: { cls: 'wind', zone: 3 }, longsleeve: { cls: 'mild', zone: 4 },
    shorts: { cls: 'sun', zone: 5 }, sunhat: { cls: 'sun', zone: 5 },
    sandals: { cls: 'sun', zone: 5 }, swimwear: { cls: 'sun', zone: 5 },
    raincoat: { cls: 'rain', zone: 0 }, rainboots: { cls: 'rain', zone: 0 }
  };
  const SPEC_ZONE_OF = t => (t < 0 ? 1 : (t <= 8 ? 2 : (t <= 16 ? 3 : (t <= 24 ? 4 : 5))));
  const SPEC_OUTFIT = { 1: ['downcoat', 'gloves'], 2: ['coat', 'scarf'], 3: ['jacket'],
                        4: ['longsleeve'], 5: ['shorts', 'sunhat'] };
  const SPEC_ZONE_ITEMS = { 1: ['downcoat', 'gloves', 'snowboots'], 2: ['coat', 'scarf'],
                            3: ['jacket'], 4: ['longsleeve'], 5: ['shorts', 'sunhat', 'sandals', 'swimwear'] };
  const SPEC_LADDER = ['downcoat', 'coat', 'jacket', 'longsleeve', 'shorts'];
  const SPEC_ROWS = {                    /* ch1：场景+天气 → 核心 1 件 */
    r0: { weather: 'rain', scene: 'school',   need: 'raincoat' },
    r1: { weather: 'rain', scene: 'puddle',   need: 'rainboots' },
    r2: { weather: 'sun',  scene: 'school',   need: 'sunhat' },
    r3: { weather: 'sun',  scene: 'beach',    need: 'shorts' },
    r4: { weather: 'sun',  scene: 'swim',     need: 'swimwear' },
    r5: { weather: 'snow', scene: 'school',   need: 'coat' },
    r6: { weather: 'snow', scene: 'snowman',  need: 'gloves' },
    r7: { weather: 'snow', scene: 'snowwalk', need: 'snowboots' },
    r8: { weather: 'wind', scene: 'park',     need: 'jacket' }
  };
  const SPEC_COMBOS = {                  /* ch2：两条件 → 2 件 */
    cm0: ['raincoat', 'jacket'], cm1: ['coat', 'rainboots'], cm2: ['sunhat', 'shorts'],
    cm3: ['scarf', 'coat'], cm4: ['downcoat', 'gloves']
  };
  const SPEC_WHO_SHIFT = { mom: -1, bunny: 1 };   /* 怕冷升一档 / 怕热降一档 */
  const SPEC_WHO_TEMPS = [5, 8, 12, 16, 18, 24];
  const SPEC_ANTI = {
    beach: ['shorts', 'sunhat', 'sandals', 'swimwear'],
    snowman: ['downcoat', 'gloves', 'scarf', 'snowboots'],
    swim: ['swimwear', 'sandals', 'sunhat']
  };
  const SPEC_TEMPS = [-5, 5, 8, 12, 16, 18, 24, 25, 32];
  const SPEC_BOUNDARY = [8, 16, 24];
  /* 静态题序真值表（SPEC v2 定版：行集/温度表/题型表——确定性+覆盖保证） */
  const SPEC_ROW_SETS = [
    ['r1', 'r2', 'r3', 'r4'],
    ['r0', 'r1', 'r5', 'r6', 'r7'],
    ['r2', 'r3', 'r8', 'r0', 'r5'],
    ['r4', 'r6', 'r7', 'r8', 'r1'],
    ['r3', 'r5', 'r6', 'r7', 'r8']
  ];
  const SPEC_TEMP_LISTS = [
    [-5, 8, 25, 12, 32], [5, 16, 18, -5, 24], [24, 5, 12, -5, 25],
    [32, 8, 16, 5, 18], [12, 25, 8, 24, -5]
  ];
  const SPEC_KIND_LISTS = [
    ['who', 'one', 'anti', 'temp', 'multi'],
    ['anti', 'multi', 'who', 'one', 'temp'],
    ['temp', 'who', 'multi', 'anti', 'one'],
    ['who', 'temp', 'anti', 'multi', 'one'],
    ['anti', 'one', 'who', 'multi', 'temp']
  ];

  /* ---- r9 时长独立副本常量（SPEC §1-r9 时长模型口径文字重列，禁引引擎 estMs/DECIDE_MS） ---- */
  const V_EST = c => c * 345 + 600;             // estMs 家族定版式（独立副本）
  const V_DECIDE = { one: 7400, multi: 8000, temp: 7800, who: 8200, anti: 7000 };
  const V_SUBMIT = 1600, V_SW = 900, V_MIN = 40000, V_COG_SHARE = 0.85;
  const vQuizDur = q => Math.max(V_EST(q.stem.length), V_DECIDE[q.kind]) +
                        (q.need.length > 1 ? V_SUBMIT : 0);
  const vCog = q => V_DECIDE[q.kind] + (q.need.length > 1 ? V_SUBMIT : 0);
  const vDur = L => L.quizzes.reduce((s, q) => s + vQuizDur(q), 0) + 5 * V_SW;
  let durMinMs = Infinity;

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const agg = { rowsSeen: {}, tempsSeen: {}, dch4Kinds: {}, genDch: {},
                dch2Combos: [], dch3Zones: [], dch4PerLevel: [] };
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === ((L1.ch - 1) % 4 + 1)
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* 引擎直驱：单件=点 right 卡即 right/done；多件=勾满 need+submit */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      if (q.need.length === 1) {
        const i = q.cards.map(c => c.id).indexOf(q.need[0]);
        const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
        if (engTapCloth(L3, i) !== exp) driveOk = false;
      } else {
        const idxs = q.need.map(n => q.cards.map(c => c.id).indexOf(n));
        for (let s = 0; s < idxs.length; s++) {
          if (engTapCloth(L3, idxs[s]) !== 'pick') driveOk = false;
        }
        const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
        if (engSubmit(L3) !== exp) driveOk = false;
      }
      if (!driveOk || q._miss !== 0 || q.picked.length !== q.need.length) driveOk = false;
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* r9 时长硬断言（每关）：modeled ≥40000ms + 与源模型 levelDurMs 逐关对账一致 */
    const dMs = vDur(L1);
    if (dMs < durMinMs) durMinMs = dMs;
    const durOk = dMs >= V_MIN && levelDurMs(L1) === dMs && levelDurMs(L2) === dMs;
    /* ⑨ 聚合数据源 */
    if (L1.dch === 1 && flat < 5) {
      L1.quizzes.forEach((q, k) => { if (!(flat === 0 && k === 0)) agg.rowsSeen[q.id] = 1; });
    }
    if (L1.dch === 2) {
      const ids = L1.quizzes.map(q => q.id).sort().join();
      agg.dch2Combos.push(ids);
    }
    if (L1.dch === 3 && flat >= 10 && flat < 15) {
      L1.quizzes.forEach(q => {
        agg.tempsSeen[q.conds[0].v] = agg.tempsSeen[q.conds[0].v] || [];
        agg.tempsSeen[q.conds[0].v].push(SPEC_ZONE_OF(q.conds[0].v));
        agg.dch3Zones.push(SPEC_ZONE_OF(q.conds[0].v));
      });
    }
    if (L1.dch === 4 && flat >= 15 && flat < 20) {
      const kinds = L1.quizzes.map(q => q.kind);
      agg.dch4PerLevel.push(kinds);
      kinds.forEach(kd => agg.dch4Kinds[kd] = (agg.dch4Kinds[kd] || 0) + 1);
    }
    if (flat >= 20) agg.genDch[L1.dch] = (agg.genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && durOk;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll, durMs: dMs, durOk: durOk,
                   kinds: L1.quizzes.map(q => q.kind + ':' + q.id),
                   need0: L1.quizzes[0].need };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const rowCov = Object.keys(agg.rowsSeen).length === 9;
  const comboFull = agg.dch2Combos.every(s => s === 'cm0,cm1,cm2,cm3,cm4');
  const tempKeys = Object.keys(agg.tempsSeen).map(Number).sort();
  const tempCov = tempKeys.join() === SPEC_TEMPS.slice().sort().join() &&
                  tempKeys.every(t => agg.tempsSeen[t][0] === SPEC_ZONE_OF(t));
  const dch3Adj = (function () {                             /* 静态 dch3 相邻区间互异+每关边界题 */
    for (let li = 0; li < 5; li++) {
      const L = genLevel(10 + li);
      let hasB = false;
      for (let k = 0; k < L.quizzes.length; k++) {
        const t = L.quizzes[k].conds[0].v;
        if (SPEC_BOUNDARY.indexOf(t) >= 0) hasB = true;
        if (k > 0 && SPEC_ZONE_OF(t) === SPEC_ZONE_OF(L.quizzes[k - 1].conds[0].v)) return false;
      }
      if (!hasB) return false;
    }
    return true;
  })();
  const dch4Ok = agg.dch4PerLevel.length === 5 &&
                 agg.dch4PerLevel.every((ks, li) =>
                   ks.indexOf('who') >= 0 && ks.indexOf('anti') >= 0 &&
                   ks.join() === SPEC_KIND_LISTS[li].join() &&
                   ks.every((kd, k) => k === 0 || kd !== ks[k - 1])) &&
                 ['one', 'multi', 'temp', 'who', 'anti'].every(kd => agg.dch4Kinds[kd] >= 1);
  const genDchOk = [1, 2, 3, 4].every(d => agg.genDch[d] > 0);
  const distOk = rowCov && comboFull && tempCov && dch3Adj && dch4Ok && genDchOk;
  if (distOk) npass++;
  units.dist = { ok: distOk, rowCov: rowCov, comboFull: comboFull, tempCov: tempCov,
                 dch3Adj: dch3Adj, dch4: dch4Ok, genDch: agg.genDch,
                 tempsSeen: tempKeys, dch4Kinds: agg.dch4Kinds };

  /* ---- ② 独立真值对账（SPEC 表 × 40 关全题；need 对表+候选唯一正确+卡数） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (!SPEC_POOL[q.cards[0].id]) { badCase = 'pool ' + flat + '/' + k; tableOk = false; break outer; }
      const ids = q.cards.map(c => c.id);
      if (ids.some(id => !SPEC_POOL[id])) { badCase = 'lib ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.kind === 'one') {
        const row = SPEC_ROWS[q.id];
        if (!row || q.need.join() !== row.need) { badCase = 'row ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.conds[0].v !== row.weather || q.conds[1].v !== row.scene) { badCase = 'rowCond ' + flat + '/' + k; tableOk = false; break outer; }
        const nCls = ids.filter(id => SPEC_POOL[id].cls === row.weather).length;
        if (nCls !== 1 || ids.length !== 6) { badCase = 'oneUni ' + flat + '/' + k; tableOk = false; break outer; }
      } else if (q.kind === 'multi') {
        const cb = SPEC_COMBOS[q.id];
        if (!cb || q.need.slice().sort().join() !== cb.slice().sort().join()) { badCase = 'combo ' + flat + '/' + k; tableOk = false; break outer; }
        const nCls = ids.filter(id => cb.indexOf(id) >= 0).length;
        if (nCls !== 2 || ids.length !== 6) { badCase = 'multiUni ' + flat + '/' + k; tableOk = false; break outer; }
      } else if (q.kind === 'temp') {
        const Z = SPEC_ZONE_OF(q.conds[0].v);
        if (q.need.slice().sort().join() !== SPEC_OUTFIT[Z].slice().sort().join()) { badCase = 'outfit ' + flat + '/' + k + ' t=' + q.conds[0].v; tableOk = false; break outer; }
        const zItems = ids.filter(id => SPEC_POOL[id].zone === Z);
        if (zItems.slice().sort().join() !== SPEC_ZONE_ITEMS[Z].filter(x => SPEC_OUTFIT[Z].indexOf(x) >= 0).slice().sort().join() ||
            ids.length !== 6) { badCase = 'tempUni ' + flat + '/' + k; tableOk = false; break outer; }
      } else if (q.kind === 'who') {
        const t = q.conds[0].v, pk = q.conds[1].v, Z = SPEC_ZONE_OF(t);
        const exp = SPEC_LADDER[Math.max(0, Math.min(4, Z - 1 + SPEC_WHO_SHIFT[pk]))];
        if (SPEC_WHO_TEMPS.indexOf(t) < 0 || q.need.join() !== exp) { badCase = 'who ' + flat + '/' + k; tableOk = false; break outer; }
        if (ids.slice().sort().join() !== SPEC_LADDER.slice().sort().join() || ids.length !== 5) { badCase = 'whoLadder ' + flat + '/' + k; tableOk = false; break outer; }
      } else {
        const used = SPEC_ANTI[q.conds[0].v];
        if (!used || used.indexOf(q.need[0]) >= 0) { badCase = 'antiNeed ' + flat + '/' + k; tableOk = false; break outer; }
        const nOut = ids.filter(id => used.indexOf(id) < 0).length;
        if (nOut !== 1 || ids.length !== 4) { badCase = 'antiUni ' + flat + '/' + k; tableOk = false; break outer; }
      }
    }
  }
  /* 静态题序对账（SPEC 定版表 × 静态关：flat0 q0=锚定 cm0；行集/温度表/题型表逐条） */
  let seqOk = true;
  for (let li = 0; li < 5 && seqOk; li++) {
    const L1 = genLevel(li), L10 = genLevel(10 + li), L15 = genLevel(15 + li);
    if (li === 0 && !(L1.quizzes[0].kind === 'multi' && L1.quizzes[0].id === 'cm0')) seqOk = false;
    const gotRows = L1.quizzes.slice(flat0Rest(li)).map(q => q.id).sort().join();
    if (gotRows !== SPEC_ROW_SETS[li].slice().sort().join()) seqOk = false;
    if (L10.quizzes.map(q => q.conds[0].v).join() !== SPEC_TEMP_LISTS[li].join()) seqOk = false;
    if (L15.quizzes.map(q => q.kind).join() !== SPEC_KIND_LISTS[li].join()) seqOk = false;
  }
  function flat0Rest(li) { return li === 0 ? 1 : 0; }        /* flat0 q0 锚定占位 */
  if (tableOk && seqOk) npass++;
  units.table = { ok: tableOk && seqOk, table: tableOk, seq: seqOk, bad: badCase };

  /* ---- ③ 多件提交状态机（引擎级，flat5=dch2） ---- */
  total++;
  const LT = genLevel(5);
  const q3 = LT.quizzes[0];
  const needIds = q3.need.slice();
  const wrongIdx = q3.cards.findIndex(c => needIds.indexOf(c.id) < 0);
  const iA = q3.cards.findIndex(c => c.id === needIds[0]);
  const iB = q3.cards.findIndex(c => c.id === needIds[1]);
  const c31 = engTapCloth(LT, wrongIdx) === 'pick' &&
              engSubmit(LT) === 'wrong_more' &&                 /* 含错件：清空+miss */
              q3.picked.length === 0 && LT.retries === 1 && q3._miss === 1;
  const c31b = engSubmit(LT) === 'wrong_less' && q3.picked.length === 0;   /* 空勾提交=少选（不炸不 miss） */
  const p1 = engTapCloth(LT, iA) === 'pick';
  const c32 = engSubmit(LT) === 'wrong_less' &&                 /* 未选满：保留继续 */
              q3.picked.length === 1 && LT.retries === 1;
  const c32b = engTapCloth(LT, iA) === 'unpick' && q3.picked.length === 0;   /* 取消勾选零惩罚 */
  engTapCloth(LT, iA);
  const c33 = engTapCloth(LT, iB) === 'pick' &&
              engSubmit(LT) === 'right' &&                      /* 勾满恰 need=推进 */
              LT.step === 1 && LT.retries === 1 && engStars(LT) === 2;
  const multiOk = c31 && c31b && p1 && c32 && c32b && c33 && q3.need.length === 2;
  if (multiOk) npass++;
  units.multi = { ok: multiOk, wrongMore: c31, emptyLess: c31b, less: c32, unpick: c32b, complete: c33 };

  /* ---- ④ 点卡单元（flat0 锚定题：两条件题面+提交钮显隐+错窗防重入） ---- */
  total++;
  startLevel(0);
  const q4 = WE.quiz;
  const initOk = q4 && q4.kind === 'multi' &&
                 q4.need.slice().sort().join() === ['jacket', 'raincoat'].sort().join() &&
                 q4.conds.length === 2 && q4.picks.length === 6 && q4.picked.length === 0 &&
                 q4.step === 0 && q4.miss === 0 && wearBtn.classList.contains('show');
  const badTap = (await WE.tapCloth(99)) === false;           // 非法下标=false（不炸）
  const wrongPickIdx = q4.picks.findIndex(id => q4.need.indexOf(id) < 0);
  const pW1 = await WE.tapCloth(wrongPickIdx);                 // 多件题勾错件=可勾（判定在提交）
  const sW = await WE.tapSubmit();                             // 含错件提交=wrong_more 清空+miss
  const s1 = pW1 === 'pick' && sW === 'wrong_more' &&
             WE.quiz.miss === 1 && WE.quiz.picked.length === 0 && WE.currentLevel.miss === 1;
  const need1Idx = q4.picks.findIndex(id => id === q4.need[0] || id === q4.need[1]);
  const pL = await WE.tapCloth(need1Idx);                      // 勾一件 → 提交=wrong_less 保留
  const sL = await WE.tapSubmit();
  const s2 = pL === 'pick' && sL === 'wrong_less' && WE.quiz.picked.length === 1;
  const pU = await WE.tapCloth(need1Idx);                      // 取消=零惩罚
  const need2Idx = q4.picks.findIndex((id, ix) => ix !== need1Idx && (id === q4.need[0] || id === q4.need[1]));
  await WE.tapCloth(need1Idx);
  const p2 = await WE.tapCloth(need2Idx);
  const sR = await WE.tapSubmit();                             // 勾满提交=推进
  const s3 = pU === 'unpick' && p2 === 'pick' && sR === 'right' && WE.quiz.step === 1;
  const wearHid = !wearBtn.classList.contains('show') && WE.quiz.kind === 'one' &&
                  typeof WE.quiz.need === 'string';          /* 单件题 need=字符串 id（契约） */
  const wIdx = WE.quiz.picks.findIndex(id => id !== WE.quiz.need);
  const pW2 = WE.tapCloth(wIdx);                               // 单件题错选（→wrong 1000ms 防重入窗）
  const rejW = await WE.tapCloth(wIdx);                        // 窗内紧邻再点=被拦 false
  const rW2 = await pW2;
  const s4 = rW2 === 'wrong' && rejW === false &&
             WE.quiz.miss === 1 && WE.currentLevel.miss === 2;
  const tapOk = initOk && badTap && s1 && s2 && s3 && wearHid && s4;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongMore: s1, less: s2,
                unpickComplete: s3, wearVisibility: wearHid, singleWrong: s4 };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __weDemoR='right'（ch2 型双条件演示） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const steps = window.__weDemoSteps || [];
  const tutOk = window.__weDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'multi' &&
                cur.quizzes[0].need.slice().sort().join() === ['jacket', 'raincoat'].sort().join() &&
                steps.length === 3 && steps[0] === 'pick' && steps[1] === 'pick' &&
                steps[2] === 'right' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__weDemoR, steps: steps, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await WE.tapCloth(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await WE.tapCloth(0)) === false;
  const swallow3 = (await WE.tapSubmit()) === false;         // 提交同样被 locked 门拦
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && swallow3 && WE.quiz.picked.length === 0 &&
                    WE.quiz.step === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2, submit: swallow3 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（q0 两勾+提交 + q1-4 单件；taps=6，3★） ---- */
  total++;
  startLevel(0);
  const a0 = await WE.autoSolve();
  const lv0 = WE.currentLevel;
  const smokeA = a0.done && a0.taps === 6 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat5（dch2 全 multi）先 wrong_more 一次再 autoSolve（1 错=2★） ---- */
  total++;
  startLevel(5);
  const q8 = WE.quiz;
  const wrongC = q8.picks.findIndex(id => q8.need.indexOf(id) < 0);
  const p8 = await WE.tapCloth(wrongC);
  const s8 = await WE.tapSubmit();
  const a5 = await WE.autoSolve();
  const lv5 = WE.currentLevel;
  const smokeB = p8 === 'pick' && s8 === 'wrong_more' && a5.done && a5.taps === 10 &&
                 lv5.done && lv5.won && lv5.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat5 = { ok: smokeB, submit: s8, taps: a5.taps, miss: lv5.miss, stars: engStars(cur) };

  /* ---- ⑩ 布局：双 viewport ×（flat0 多件 6 卡 / flat10 温度计 / flat15 ch4 混排） ---- */
  function lum(hexStr) {
    const m = hexStr.match(/#?([0-9a-f]{6})/i);
    if (!m) return null;
    const n = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
  }
  const ratioOf = (a, b) => { const x = lum(a), y = lum(b);
    return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cssToHex = c => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? '#' + [1, 2, 3].map(i => ('0' + (+m[i]).toString(16)).slice(-2)).join('') : c; };
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    /* M-A1：竖屏模拟须注入 .port 类吃到竖屏 CSS（媒体查询跟视口不跟元素） */
    document.body.classList.toggle('port', w < h);
    startLevel(g._simFlat);
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const chips = Array.prototype.map.call(condsEl.querySelectorAll('.chip'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    /* M-A1：rect 落容器断言（overflow:hidden 吞 scrollWidth 溢出，几何才是可见性真值） */
    const gr = g.getBoundingClientRect();
    const rectOk = Array.prototype.every.call(boardEl.querySelectorAll('.card'), b => {
      const r = b.getBoundingClientRect();
      return r.left >= gr.left - 0.5 && r.right <= gr.right + 0.5 &&
             r.top >= gr.top - 0.5 && r.bottom <= gr.bottom + 0.5;
    });
    const wearShown = cur.quizzes[cur.step].need.length > 1;
    const wearOk = !wearShown || (wearBtn.classList.contains('show') &&
      wearBtn.offsetWidth >= 72 && wearBtn.offsetHeight >= 64);
    const hitOk = cards.length >= 4 && cards.every(b => b.w >= 96 && b.h >= 96);
    const chipOk = chips.length >= 1 && chips.every(b => b.w >= 56 && b.h >= 56);
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&                        // 卡描边 INK 对底
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');       // 清理，不泄漏到下一单元
    return { vp: w + 'x' + h, cards: cards.length, hitOk: hitOk, chipOk: chipOk, sceneOk: sceneOk,
             wearOk: wearOk, contrast: cB && cS, rect: rectOk, ox: ox,
             pass: hitOk && chipOk && sceneOk && wearOk && cB && cS && rectOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 10, 15]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑪ clips：wea_ 56（v2 16 + T46 题面 17+提交 2+temp/who 21）+ core 3 全注入
       + v2 新 4 条实长断言（2026-09-13 重合成后 ffprobe 实测 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const t46Stem = [];
  for (let i = 0; i < 17; i++) t46Stem.push('wea_st_' + i);
  const need = ['wea_tut_watch', 'wea_tut_turn', 'wea_right', 'wea_hint',
                'wea_w_sun', 'wea_w_rain', 'wea_w_snow', 'wea_w_wind',
                'wea_q_sun', 'wea_q_rain', 'wea_q_snow', 'wea_q_wind',
                'wea_multi_hint', 'wea_temp_hint', 'wea_who_hint', 'wea_anti_hint']
    .concat(t46Stem, ['wea_sub_less', 'wea_sub_more'],
                ['wea_tt_m5', 'wea_tt_5', 'wea_tt_32',      /* 主线补 temp/who 21 键锚（域全在 build MUST） */
                 'wea_tw_mom_5', 'wea_tw_bunny_24'],
                ['core_chapter_end', 'core_day_end', 'core_rest']);
  /* STEM_LIST 与 wea_st_i 序对账（SPEC 推导：源内 stem 出现序 17 句互异） */
  const stemMapOk = STEM_LIST.length === 17 &&
    STEM_LIST.every((t, i) => KIDS.voice.clips['wea_st_' + i]);
  const SPEC_DUR = { wea_multi_hint: 2544, wea_temp_hint: 2856, wea_who_hint: 2880, wea_anti_hint: 2688 };
  const durs = await Promise.all(Object.keys(SPEC_DUR).map(k => new Promise(res => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; res(-1); } }, 8000);
    const a = new Audio(KIDS.voice.clips[k]);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.load();
  })));
  const clipsOk = keys.length === 59 && stemMapOk &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0) &&
    durs.every((d, i) => Math.abs(d - Object.values(SPEC_DUR)[i]) <= 60);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, stemMap: stemMapOk, durs: durs };

  /* ---- ⑫ 星级规则（引擎级构造直测） ---- */
  total++;
  const LA = genLevel(5);                          // dch2 提交制关
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;   // 永不 0 星
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- ⑬ 章末预告 C7 关键词 + r9 nextHint 章末逐点独立副本断言（契约 A/F/M1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('两个条件') >= 0 &&      // 预告 ch2 多条件
                 CHAPTERS[2].hint.indexOf('温度') >= 0 &&          // 预告 ch3 温度计
                 CHAPTERS[3].hint.indexOf('家人') >= 0 &&          // 预告 ch4 家人差异化
                 CHAPTERS[4].hint.indexOf('挑战') >= 0 &&          // 预告生成关
                 GEN_HINTS[0].indexOf('地方') >= 0 &&              // dch1 场景+天气
                 GEN_HINTS[1].indexOf('两件') >= 0 &&              // dch2 多条件两件
                 GEN_HINTS[2].indexOf('温度') >= 0 &&              // dch3 温度区间
                 GEN_HINTS[3].indexOf('混') >= 0;                  // dch4 混合
                 typeof nextHint === 'function';                  // 判卫（r7 纪律）
  /* 逐点断言累加器（单 hintOk 布尔装不下 8 个逐点+哨兵） */
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
                 (ci + 2 > 4 || got !== CHAPTERS[ci + 2].hint), 'static ' + f);  // 右移哨兵（末章无下下章跳过）
  }
  /* 生成关章末逐点（F：实算 GEN_HINTS[genLevel(f+1).dch-1]） */
  for (const f of [24, 29, 34, 39]) {
    const got = nextHint(f);
    nhPts['g' + f] = got;
    hintOk2Check(got === GEN_HINTS[genLevel(f + 1).dch - 1], 'gen ' + f);
  }
  /* 契约 F 字面哨兵：找一个生成关使实算 dch-1 ≠ 字面 (ci+1)%4，断言 nextHint 跟实算不跟字面。
     m5：找不到撞点=断言失效（恒真路径），须 fail 而非静默通过——seed 变更导致撞点消失时这里会
     拦住而不是放行一个没有判别力的哨兵 */
  let sentOk = false, sentNote = 'no-diff-found';
  for (let f = 24; f < 60 && sentNote === 'no-diff-found'; f++) {
    const ci = Math.floor(f / 5), real = genLevel(f + 1).dch - 1, lit = (ci + 1) % 4;
    if (ci >= 4 && real !== lit) {
      sentOk = nextHint(f) === GEN_HINTS[real] && nextHint(f) !== GEN_HINTS[lit];
      sentNote = 'f=' + f + ' real=' + real + ' lit=' + lit;
    }
  }
  const nhAll = hintOk && nhOkAll && sentOk;
  if (nhAll) npass++;
  units.hints = { ok: nhAll, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS,
                  nextPts: nhPts, sentinel: sentNote, sentinelOk: sentOk };

  /* ---- ⑭ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑮ r9 时长硬断言汇总（独立副本：min+认知占比+逐题认知主导） ---- */
  total++;
  let cogMin = 1, domBad = 0, worstDom = '';
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    let cog = 0;
    L.quizzes.forEach(q => {
      cog += vCog(q);
      if (vCog(q) < V_EST(q.stem.length)) { domBad++; if (!worstDom) worstDom = flat + '/' + q.id; }
    });
    if (cog / d < cogMin) cogMin = cog / d;
  }
  const durAll = durMinMs >= V_MIN && cogMin >= V_COG_SHARE && domBad === 0;
  if (durAll) npass++;
  units.duration = { ok: durAll, minMs: durMinMs, cogShare: +cogMin.toFixed(4),
                     domBad: domBad, worstDom: worstDom, min: V_MIN };

  const out = { game: 'weather', total: total, pass: npass, layoutOk: layoutOk,
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
