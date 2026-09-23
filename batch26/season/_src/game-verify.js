/* ================= ?verify=1 自检 r4（双约束整套装；仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性 / 章型规则（structWhy 全 null）/
     章号映射 / 引擎直驱（outfit=勾满 need→提交 right/末题 done；anti=点 need 卡）→ 全关 3 星
   ② 封闭集独立对账：SPEC 表独立重列（30 物品双属性 / OUT2、OUT3 套装变体 / 陷阱对 6 /
     反向 need 池 12 / 带 3 场合 4——不引用引擎 ITEMS、OUT2、OUT3、TRAP_PAIRS）× 40 关全题：
     need==表内变体且逐件 fits / 干扰恒 !fits（唯一性构造铁律）/ 候选互异且 need 全在场 /
     卡数=need+3（anti=4）/ dch1 两件 / dch2 三件且 occ≠sleep / dch3 陷阱对件在干扰 /
     stem==独立重算句
   ③ ch3 陷阱专项（flat10-14）：每题 need 存在陷阱成员且对件在卡内且对件 !fits
   ④ 提交三路径隔离实验（flat0 UI 状态机）：wrong_less（少选=保留继续 miss 不变）/
     wrong_more（含错件=清空重选+miss+1）/ right（勾满提交推进）；pick/unpick 切换；
     反向题（dch4 页）：点适配件=wrong+miss+1+方向锚 TTS 绑定带；点 need=right
   ⑤ 教学链：tutorialWatch() 真实走完（stub 存档）→ __seDemoR==='right' 且步骤
     ['pick','pick','right'] 且 tut='help'，watch 折算真实时长 ≤16s；flat0 题0 恒锚定
     cold|school [heavycoat,pants]
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 物品卡排容器 bump（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3）先 wrong_more 一次再 autoSolve（1 错=2 星）
   ⑨ 章分布聚合：dch1 全两件 / dch2 全三件且无 sleep / dch3 陷阱在场 / dch4 反向 ≥2
     / 生成关四型全现
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（ch1 / ch4 混合）：物品卡 ≥96×96、
     条件区/场景/卡排/提交钮 bbox 严格不相交（r3 m3：静态推算临界的交叠 bbox 实测定案）、
     overflowX ≤0、对比度 ≥3:1
   ⑪ clips：sea_ 8 条 + core 3 条全注入 + SPEC_DUR 实长断言（±60ms，Promise.all+8000ms 超时）
   ⑫ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑬ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1（家族 F）
   ⑭ verify 提速断言：SPEED=0.12
   ⑮ 反馈/确认句表：全部 ≤TTS_MAX_CHARS 且 max==TTS_MAX_CHARS（常量自洽）/
     判对演出窗 620+430+4350=5400 ≥ estMs(TTS_MAX_CHARS)+300（b25 定版 +600 口径，m-5 统一）/
     wrongChainUntil=4750 ≥ estMs+300（链豁免护栏，m-5：4600→4750）
   ⑯ 单关净时长模型（≥45s 硬指标可证）：modeledMin=Σ per 题 [estMs(stem 码点)
     + 300×need 件数 + 5400 判对窗] —— 5 题（听题面 TTS+逐件勾选演出+提交确认窗）
     对静态 20 关全量断言 ≥45000ms（思考占比=题面 TTS 听读窗占 modeled ≥35%，
     实测最低=dch2 三件套章 39.4%；SPEC r4 块记录模型）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH26 §0.62 r4 块文字独立重列（禁抄页面 ITEMS/OUT2/OUT3/TRAP_PAIRS/池） */
  const SPEC_ITEMS = {                                     // 30 物品双属性封闭表 t=带 o=场合
    umbrella:    { t: ['cool'], o: ['school', 'party'] },
    rainboots:   { t: ['cool'], o: ['school'] },
    lightjacket: { t: ['cool'], o: ['school', 'sport', 'party'] },
    kite:        { t: ['cool'], o: ['sport'] },
    tshirt:      { t: ['hot'], o: ['school', 'sport', 'party'] },
    sandals:     { t: ['hot'], o: ['school', 'party'] },
    sunhat:      { t: ['hot'], o: ['school', 'sport', 'party'] },
    goggles:     { t: ['hot'], o: ['sport'] },
    longsleeve:  { t: ['cool'], o: ['school', 'sport', 'party'] },
    vest:        { t: ['cool'], o: ['school', 'party'] },
    pants:       { t: ['cool', 'cold'], o: ['school', 'sport', 'party'] },
    trench:      { t: ['cool'], o: ['school', 'party'] },
    heavycoat:   { t: ['cold'], o: ['school', 'sport', 'party'] },
    gloves:      { t: ['cold'], o: ['school', 'sport'] },
    scarf:       { t: ['cold'], o: ['school', 'party'] },
    snowboots:   { t: ['cold'], o: ['school'] },
    sweater:     { t: ['cold'], o: ['school', 'sport', 'party'] },
    shorts:      { t: ['hot'], o: ['school', 'sport'] },
    skirt:       { t: ['hot', 'cool'], o: ['school', 'party'] },
    dress:       { t: ['hot', 'cool', 'cold'], o: ['party'] },
    sneaker:     { t: ['hot', 'cool'], o: ['school', 'sport'] },
    partyshoes:  { t: ['cool', 'cold'], o: ['school', 'party'] },
    woolhat:     { t: ['cold'], o: ['school', 'party'] },
    cap:         { t: ['hot', 'cool'], o: ['sport'] },
    thinscarf:   { t: ['cool'], o: ['school', 'party'] },
    earmuffs:    { t: ['cold'], o: ['school', 'sport', 'party'] },
    warmpants:   { t: ['cold'], o: ['school', 'sport'] },
    swimsuit:    { t: ['hot'], o: ['sport'] },
    pajamas:     { t: ['hot', 'cool', 'cold'], o: ['sleep'] },
    slippers:    { t: ['hot', 'cool', 'cold'], o: ['sleep'] }
  };
  const SPEC_TEMPS = ['cold', 'cool', 'hot'];
  const SPEC_OCCS = ['school', 'sport', 'sleep', 'party'];
  const SPEC_OUT2 = {
    'cold|school': [['heavycoat','pants'], ['sweater','warmpants']],
    'cold|sport': [['sweater','pants'], ['heavycoat','warmpants']],
    'cold|sleep': [['pajamas','slippers']],
    'cold|party': [['heavycoat','dress'], ['sweater','dress']],
    'cool|school': [['lightjacket','pants'], ['trench','skirt']],
    'cool|sport': [['longsleeve','pants'], ['lightjacket','pants']],
    'cool|sleep': [['pajamas','slippers']],
    'cool|party': [['trench','skirt'], ['lightjacket','skirt']],
    'hot|school': [['tshirt','shorts'], ['tshirt','skirt']],
    'hot|sport': [['tshirt','shorts'], ['swimsuit','goggles']],
    'hot|sleep': [['pajamas','slippers']],
    'hot|party': [['dress','sandals'], ['tshirt','skirt']]
  };
  const SPEC_OUT3 = {
    'cold|school': [['heavycoat','pants','scarf'], ['sweater','warmpants','woolhat']],
    'cold|sport': [['sweater','pants','gloves'], ['heavycoat','warmpants','earmuffs']],
    'cold|party': [['heavycoat','dress','partyshoes'], ['sweater','dress','partyshoes']],
    'cool|school': [['lightjacket','pants','rainboots'], ['trench','skirt','umbrella']],
    'cool|sport': [['longsleeve','pants','cap'], ['lightjacket','pants','kite'], ['longsleeve','pants','sneaker']],
    'cool|party': [['trench','dress','partyshoes'], ['lightjacket','skirt','thinscarf']],
    'hot|school': [['tshirt','shorts','sandals'], ['tshirt','skirt','sunhat']],
    'hot|sport': [['tshirt','shorts','cap'], ['tshirt','shorts','sneaker'], ['swimsuit','goggles','cap']],
    'hot|party': [['tshirt','skirt','sunhat'], ['tshirt','dress','sandals']]
  };
  const SPEC_TRAP = [['lightjacket','heavycoat'], ['thinscarf','scarf'], ['sunhat','woolhat'],
                     ['tshirt','longsleeve'], ['sandals','sneaker'], ['pants','shorts']];
  const SPEC_ANTI_POOL = ['tshirt', 'longsleeve', 'lightjacket', 'heavycoat', 'thinscarf', 'scarf',
                          'sunhat', 'woolhat', 'sandals', 'snowboots', 'shorts', 'warmpants'];
  const SPEC_TEMP_N = { cold: '很冷', cool: '凉爽', hot: '很热' };
  const SPEC_OCC_N = { school: '去上学', sport: '做运动', sleep: '去睡觉', party: '去派对' };
  /* m-6：反馈/锚句 SPEC 独立重列（顶部表区——④b ④d ⑮ 共用；页面常量仅作对账对象） */
  const SPEC_SUBMIT = { less: '还差一件，再挑一挑', more: '多选了一件，再挑一挑' };
  const SPEC_ANTI_ANCHOR = { cold: '很冷的天，哪件会发抖', cool: '凉爽的天，哪件不合适',
                             hot: '很热的天，哪件会出汗' };
  const specFits = (k, b, o) => SPEC_ITEMS[k].t.indexOf(b) >= 0 && SPEC_ITEMS[k].o.indexOf(o) >= 0;
  const specStem = q => q.kind === 'anti'
    ? SPEC_TEMP_N[q.band] + '的天，哪件穿上不合适'
    : SPEC_TEMP_N[q.band] + '的天' + SPEC_OCC_N[q.occ] + '，穿什么';

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dchStat = [], genDch = {};
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
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* 引擎直驱：outfit=逐件勾 need→提交 right/末题 done；anti=点 need 卡 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      if (q.kind === 'anti') {
        let iN = -1;
        for (let i = 0; i < q.items.length; i++) if (q.items[i].item === q.need[0]) iN = i;
        if (engTapItem(L3, iN) !== exp || q._miss !== 0) { driveOk = false; break; }
      } else {
        for (const it of q.need) {
          let iN = -1;
          for (let i = 0; i < q.items.length; i++) if (q.items[i].item === it) iN = i;
          if (engTapItem(L3, iN) !== 'pick') { driveOk = false; break; }
        }
        if (!driveOk) break;
        if (engSubmit(L3) !== exp || q._miss !== 0) { driveOk = false; break; }
      }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 章分布聚合（⑨ 数据源） */
    dchStat.push({ dch: L1.dch, quizzes: L1.quizzes.map(q => ({
      kind: q.kind, band: q.band, occ: q.occ, need: q.need.slice(),
      n: q.need.length, cards: q.items.map(t => t.item) })) });
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   kinds: L1.quizzes.map(q => q.kind + ':' + q.need.length) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const d1Ok = dchStat.slice(0, 5).every(r => r.dch === 1 && r.quizzes.every(q => q.kind === 'outfit' && q.n === 2));
  const d2Ok = dchStat.slice(5, 10).every(r => r.dch === 2 && r.quizzes.every(q => q.kind === 'outfit' && q.n === 3 && q.occ !== 'sleep'));
  const d3Ok = dchStat.slice(10, 15).every(r => r.dch === 3 && r.quizzes.every(q => q.kind === 'outfit' &&
    q.cards.some(c => q.need.some(nk => SPEC_TRAP.some(p => (p[0] === nk && p[1] === c) || (p[1] === nk && p[0] === c))))));
  const d4Ok = dchStat.slice(15, 20).every(r => r.dch === 4 && r.quizzes.filter(q => q.kind === 'anti').length >= 2);
  const distOk = d1Ok && d2Ok && d3Ok && d4Ok &&
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;  // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, d1: d1Ok, d2: d2Ok, d3: d3Ok, d4: d4Ok, genDch: genDch };

  /* ---- ② 封闭集独立对账（SPEC 表独立重列 × 40 关全题） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (SPEC_TEMPS.indexOf(q.band) < 0) { badCase = 'band ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.stem !== specStem(q)) { badCase = 'stem ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.kind === 'anti') {
        if (L.dch !== 4) { badCase = 'antiDch ' + flat; tableOk = false; break outer; }
        if (q.need.length !== 1 || SPEC_ANTI_POOL.indexOf(q.need[0]) < 0) { badCase = 'antiNeed ' + flat + '/' + k; tableOk = false; break outer; }
        if (SPEC_ITEMS[q.need[0]].t.indexOf(q.band) >= 0) { badCase = 'antiFits ' + flat + '/' + k; tableOk = false; break outer; }
        const ks = q.items.map(t => t.item);
        if (ks.length !== 4 || ks.filter((v, i, a) => a.indexOf(v) === i).length !== 4) { badCase = 'antiCards ' + flat + '/' + k; tableOk = false; break outer; }
        let nFit = 0;
        for (const c of ks) {
          if (!SPEC_ITEMS[c]) { badCase = 'antiLib ' + flat + '/' + k; tableOk = false; break outer; }
          if (c !== q.need[0] && SPEC_ITEMS[c].t.indexOf(q.band) >= 0) nFit++;
        }
        if (nFit !== 3 || ks.indexOf(q.need[0]) < 0) { badCase = 'antiDistr ' + flat + '/' + k; tableOk = false; break outer; }
        continue;
      }
      if (SPEC_OCCS.indexOf(q.occ) < 0) { badCase = 'occ ' + flat + '/' + k; tableOk = false; break outer; }
      const table = q.need.length === 2 ? SPEC_OUT2 : SPEC_OUT3;
      const variants = table[q.band + '|' + q.occ];
      if (!variants || !variants.some(v => v.slice().join() === q.need.slice().join())) {
        badCase = 'variant ' + flat + '/' + k + ' ' + q.band + '|' + q.occ + '=' + q.need.join(); tableOk = false; break outer;
      }
      for (const nk of q.need) if (!specFits(nk, q.band, q.occ)) { badCase = 'needFits ' + flat + '/' + k; tableOk = false; break outer; }
      const ks = q.items.map(t => t.item);
      if (ks.length !== q.need.length + 3) { badCase = 'cardsLen ' + flat + '/' + k; tableOk = false; break outer; }
      if (ks.filter((v, i, a) => a.indexOf(v) === i).length !== ks.length) { badCase = 'dup ' + flat + '/' + k; tableOk = false; break outer; }
      for (const nk of q.need) if (ks.indexOf(nk) < 0) { badCase = 'needIn ' + flat + '/' + k; tableOk = false; break outer; }
      for (const c of ks) {
        if (!SPEC_ITEMS[c]) { badCase = 'lib ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.need.indexOf(c) < 0 && specFits(c, q.band, q.occ)) { badCase = 'distrFits ' + flat + '/' + k; tableOk = false; break outer; }  // 唯一性铁律
      }
      if (L.dch === 1 && q.need.length !== 2) { badCase = 'dch1 ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 2 && (q.need.length !== 3 || q.occ === 'sleep')) { badCase = 'dch2 ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 3) {                                       // 陷阱对件必在干扰（对件 !fits 时）
        let hasTrap = false;
        for (const nk of q.need) {
          for (const pr of SPEC_TRAP) {
            const mate = pr[0] === nk ? pr[1] : (pr[1] === nk ? pr[0] : null);
            if (mate && !specFits(mate, q.band, q.occ)) {
              hasTrap = true;
              if (ks.indexOf(mate) < 0) { badCase = 'trapMiss ' + flat + '/' + k; tableOk = false; break outer; }
            }
          }
        }
        if (!hasTrap) { badCase = 'noTrap ' + flat + '/' + k; tableOk = false; break outer; }
      }
      if (L.dch === 4) {
        const nAnti = L.quizzes.filter(x => x.kind === 'anti').length;
        if (nAnti < 2) { badCase = 'antiLt2 ' + flat; tableOk = false; break outer; }
      }
    }
  }
  if (tableOk) npass++;
  units.table = { ok: tableOk, bad: badCase };

  /* ---- ③ ch3 陷阱专项（flat10-14 五关全题：need 陷阱成员→对件在场且 !fits） ---- */
  total++;
  const trapDetail = [];
  let trap3Ok = true;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    if (L.dch !== 3) { trap3Ok = false; break; }
    const pairs = L.quizzes.map(q => {
      const ks = q.items.map(t => t.item);
      const traps = [];
      for (const nk of q.need) for (const pr of SPEC_TRAP) {
        const mate = pr[0] === nk ? pr[1] : (pr[1] === nk ? pr[0] : null);
        if (mate && !specFits(mate, q.band, q.occ)) traps.push(nk + '>' + mate + (ks.indexOf(mate) >= 0 ? ':in' : ':MISS'));
      }
      return q.band + '|' + q.occ + ' ' + traps.join(' ');
    });
    if (!pairs.every(p => p.indexOf(':MISS') < 0 && p.indexOf('>') >= 0)) trap3Ok = false;
    trapDetail.push(pairs);
  }
  if (trap3Ok) npass++;
  units.trap3 = { ok: trap3Ok, detail: trapDetail };

  /* ---- ④ 提交三路径隔离实验（flat0 UI：pick/unpick / less 保留 / more 清空+miss / right 推进） ---- */
  total++;
  startLevel(0);
  const q4 = SE.quiz;
  const initOk = q4 && q4.kind === 'outfit' && q4.band === 'cold' && q4.occ === 'school' &&
                 q4.need.join() === 'heavycoat,pants' && q4.picks.length === 5 &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await SE.tapItem(99)) === false;           // 非法下标=false（不炸）
  const iA = q4.picks.indexOf(q4.need[0]);                   // 厚外套
  const iB = q4.picks.indexOf(q4.need[1]);                   // 长裤
  const iW = q4.picks.findIndex(k => q4.need.indexOf(k) < 0);  // 首个非 need 干扰
  const p1 = await SE.tapItem(iA);                           // 勾第 1 件 → pick
  const heldOk = p1 === 'pick' && SE.quiz.picked.length === 1 &&
                 cardEl(iA).classList.contains('held') &&
                 sceneEl.querySelectorAll('#bunny-wear .wear').length === 1;   // badge 同步
  const u1 = await SE.tapItem(iA);                           // 取消 → unpick
  const unpickOk = u1 === 'unpick' && SE.quiz.picked.length === 0 &&
                   !cardEl(iA).classList.contains('held');
  const p1b = await SE.tapItem(iA);                          // 重新勾回
  const lessR = await SE.tapSubmit();                        // 未选满 → wrong_less（保留继续）
  const lessOk = lessR === 'wrong_less' && SE.quiz.picked.length === 1 &&
                 SE.quiz.miss === 0 && SE.currentLevel.miss === 0;
  const moreBefore = await SE.tapItem(iW);                   // 再勾 1 件错件（pick）
  const moreR = await SE.tapSubmit();                        // 含错件 → wrong_more（清空+miss）
  const moreOk = moreR === 'wrong_more' && SE.quiz.picked.length === 0 &&
                 SE.quiz.miss === 1 && SE.currentLevel.miss === 1 &&
                 boardEl.querySelectorAll('.card.held').length === 0;          // held 全撤
  const p2a = await SE.tapItem(iA), p2b = await SE.tapItem(iB);   // 勾满 need 两件
  const readyOk = wearBtn.classList.contains('ready');       // 勾满 → 提交钮呼吸邀请
  /* m-9：locked 演出期 tapSubmit 吞输入（false+不判不推进——状态快照对比：此处 miss 已被
     more 路径抬到 1，禁硬编码 0；tapItem 路径既有覆盖的对称钉死） */
  const heldN = SE.quiz.picked.length, missN = SE.quiz.miss, stepN = SE.quiz.step;
  state.locked = true;
  const swallowS = (await SE.tapSubmit()) === false && SE.quiz.picked.length === heldN &&
                   SE.quiz.step === stepN && SE.quiz.miss === missN;
  state.locked = false;
  const rR = await SE.tapSubmit();                           // 提交成 → right 推进
  const rightOk = rR === 'right' && SE.quiz.step === 1 && SE.quiz.miss === 0;
  const submit4 = { ok: initOk && badTap && heldOk && unpickOk && lessOk && moreOk && readyOk && swallowS && rightOk };
  if (submit4.ok) npass++;
  units.submit = { ok: submit4.ok, init: initOk, badTap: badTap, held: heldOk, unpick: unpickOk,
                   less: lessOk, more: moreOk, ready: readyOk, right: rightOk,
                   moreR: moreR, lessR: lessR, moreBefore: moreBefore };

  /* ---- ④b 反向题（dch4 UI 页）：点适配件=wrong+方向锚 TTS 绑定带；点 need=right ---- */
  total++;
  let antiFlat = -1;                                          // 确定：flat15-39 首个 q0=anti 的关
  for (let f = 15; f < 40 && antiFlat < 0; f++) if (genLevel(f).quizzes[0].kind === 'anti') antiFlat = f;
  const antiFlatOk = antiFlat >= 15 && antiFlat <= 39;
  let antiOk = false, antiAnchor = '';
  if (antiFlatOk) {
    startLevel(antiFlat);
    window.__lastSayText = null;
    const qa = SE.quiz;
    const iFit = qa.picks.findIndex(k => SPEC_ITEMS[k].t.indexOf(qa.band) >= 0);   // 适配件
    const iNeed = qa.picks.indexOf(qa.need[0]);
    const rW = await SE.tapItem(iFit);
    antiAnchor = SPEC_ANTI_ANCHOR[qa.band];               /* m-6：期望从 SPEC 独立重列表取（禁读页面常量） */
    const wOk = rW === 'wrong' && SE.quiz.miss === 1 &&
                window.__lastVoiceKey === 'sea_anchor_' + qa.band;   /* T46 阶段2：方向锚 clip 化（sea_anchor_<band> SPEC 键域） */
    const rN = await SE.tapItem(iNeed);
    antiOk = wOk && rN === 'right' && SE.quiz.step === 1;
  }
  if (antiFlatOk && antiOk) npass++;
  units.anti = { ok: antiFlatOk && antiOk, flat: antiFlat, anchor: antiAnchor };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __seDemoR='right'（演示勾两件+提交） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__seDemoR === 'right' &&
                JSON.stringify(window.__seDemoSteps) === JSON.stringify(['pick', 'pick', 'right']) &&
                state.tut === 'help' && cur.flat === 0 &&
                cur.quizzes[0].band === 'cold' && cur.quizzes[0].occ === 'school' &&
                cur.quizzes[0].need.join() === 'heavycoat,pants' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__seDemoR, steps: window.__seDemoSteps,
                     tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 物品卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await SE.tapItem(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await SE.tapItem(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && SE.quiz.step === 0 && SE.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await SE.autoSolve();
  const lv0 = SE.currentLevel;
  const smokeA = a0.done && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, done: a0.done, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3）先 wrong_more 一次再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = SE.quiz;
  const w8 = q8.picks.findIndex(k => q8.need.indexOf(k) < 0);
  await SE.tapItem(q8.picks.indexOf(q8.need[0]));            // 勾 1 件 need
  await SE.tapItem(w8);                                      // 勾 1 件错件
  const r8 = await SE.tapSubmit();                           // → wrong_more（miss+1）
  const a10 = await SE.autoSolve();
  const lv10 = SE.currentLevel;
  const smokeB = r8 === 'wrong_more' && a10.done && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑩ 布局：双 viewport ×（flat0 ch1 / flat17 ch4 混合）bbox 实测 + 对比度 ---- */
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
  const rectsOverlap = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(g._simFlat);
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length >= 4 && cards.every(b => b.w >= 96 && b.h >= 96);   // 候选恒 4+，主答案 ≥96
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    /* bbox 严格不相交（r3 m3：静态推算临界的交叠必须实测定案） */
    const rScene = sceneEl.getBoundingClientRect();
    const rConds = condsEl.getBoundingClientRect();
    const rBoard = boardEl.getBoundingClientRect();
    const rWear = wearBtn.getBoundingClientRect();
    const rHear = hearBtn.getBoundingClientRect();
    const rRabbit = rabbitBtn.getBoundingClientRect();
    const sepOk = !rectsOverlap(rScene, rConds) && !rectsOverlap(rConds, rBoard) &&
                  !rectsOverlap(rWear, rHear) && !rectsOverlap(rHear, rRabbit) &&
                  wearBtn.classList.contains('show');       // 套装题提交钮在场
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&                        // 物品卡描边 INK 对底
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, cards: cards.length, hitOk: hitOk, sceneOk: sceneOk, sepOk: sepOk,
             contrast: cB && cS, ox: ox, pass: hitOk && sceneOk && sepOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 17]) {
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

  /* ---- ⑪ clips：sea_ 43 条 + core 3 条全注入 + SPEC_DUR 实长断言（±60ms，审查 m3；
       T46 阶段2 增题面/确认/锚/提交 35：sea_st_12+sea_cf_15+sea_sta_3+sea_anchor_3+sea_sub_2） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['sea_tut_watch', 'sea_tut_turn', 'sea_hint', 'sea_right',
                'sea_wrong', 'sea_q', 'sea_hint_outfit', 'sea_hint_anti',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const t46n = keys.filter(k => /^(sea_st_|sea_cf_|sea_sta_|sea_anchor_|sea_sub_)/.test(k)).length;
  const preOk = keys.length === 46 && t46n === 35 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durSpec = { sea_tut_watch: 3216, sea_tut_turn: 1752, sea_hint: 2712,
                    sea_right: 2544, sea_wrong: 2304, sea_q: 2400,
                    sea_hint_outfit: 2760, sea_hint_anti: 2520 };    // r4 真值表（浏览器实测）
  const durKeys = Object.keys(durSpec);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);   // 8s 超时（纪律）
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - durSpec[durKeys[i]]) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

  /* ---- ⑫ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  total++;
  const LA = genLevel(10);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;   // 永不 0 星
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- ⑬ 章末预告 C7 关键词断言（hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('三件') >= 0 &&                       // 预告 ch2 三件套
                 CHAPTERS[2].hint.indexOf('像') >= 0 && CHAPTERS[2].hint.indexOf('仔细') >= 0 &&   // 预告 ch3 陷阱
                 CHAPTERS[3].hint.indexOf('反') >= 0 &&                          // 预告 ch4 反向题
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                          // 预告生成关
                 GEN_HINTS[0].indexOf('两件') >= 0 &&                            // dch1 两件套
                 GEN_HINTS[1].indexOf('三件') >= 0 &&                            // dch2 三件套
                 GEN_HINTS[2].indexOf('像') >= 0 &&                              // dch3 近季陷阱
                 GEN_HINTS[3].indexOf('不合适') >= 0;                            // dch4 反向
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // 审查 M3
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑭ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑮ 反馈/确认句表全检 + TTS 窗护栏（b25 定版运行时复核；m-6：句表从 SPEC 独立
     重列表取，页面常量仅作「页↔SPEC 逐条一致」对账对象） ---- */
  total++;
  const pageTabOk = SUBMIT_TEXT.less === SPEC_SUBMIT.less && SUBMIT_TEXT.more === SPEC_SUBMIT.more &&
                    SPEC_TEMPS.every(b => ANTI_ANCHOR[b] === SPEC_ANTI_ANCHOR[b]);   // 页↔SPEC 一致
  const sents = [];                                          // 反馈+确认句全集（封闭枚举，SPEC 口径）
  sents.push(SPEC_SUBMIT.less, SPEC_SUBMIT.more);
  for (const b of SPEC_TEMPS) sents.push(SPEC_ANTI_ANCHOR[b], SPEC_TEMP_N[b] + '的天，它不合适');
  for (const b of SPEC_TEMPS) for (const o of SPEC_OCCS) sents.push(SPEC_TEMP_N[b] + '的天' + SPEC_OCC_N[o] + '，穿好啦');
  const lens = sents.map(t => [...t].length);
  const maxChars = Math.max(...lens);
  const lenOk = lens.every(n => n <= 11);
  const selfOk = maxChars === TTS_MAX_CHARS;                 // 常量自洽（=实际最长句码点）
  const winOk = (620 + 430 + 4350) >= estMs(TTS_MAX_CHARS) + 300;  // 判对演出窗 ≥ estMs+300（b25 定版 +600 口径，m-5）
  const chainOk = 4750 >= estMs(TTS_MAX_CHARS) + 300;        // 链豁免窗护栏（审查 M4；m-5：4600→4750）
  const fbOk = lenOk && selfOk && winOk && chainOk && pageTabOk;   /* m-6：页↔SPEC 句表一致纳入判据 */
  if (fbOk) npass++;
  units.feedback = { ok: fbOk, len: lenOk, maxChars: maxChars, ttsMaxChars: TTS_MAX_CHARS,
                     estMs: estMs(TTS_MAX_CHARS), win: 620 + 430 + 4350, winOk: winOk, chainOk: chainOk };

  /* ---- ⑯ 单关净时长模型（≥45s 硬指标可证）：静态 20 关全量 ---- */
  total++;
  let durMinAll = true, minLv = null;
  const durDetail = [];
  for (let flat = 0; flat < STATIC_LEVELS; flat++) {
    const L = genLevel(flat);
    let ms = 0, ttsMs = 0;
    for (const q of L.quizzes) {
      const stemMs = estMs([...q.stem].length);              // 听读题面 TTS（思考窗）
      ms += stemMs + (q.kind === 'outfit' ? 300 * q.need.length : 0) + 5400;
      ttsMs += stemMs;
    }
    if (minLv === null || ms < minLv) minLv = ms;
    if (ms < 45000) durMinAll = false;
    durDetail.push(Math.round(ms / 100) / 10);
  }
  const ttsShareOk = (() => {                                 // 每关 TTS 听读 ≥ modeled 40%（思考占比可证）
    for (let flat = 0; flat < STATIC_LEVELS; flat++) {
      const L = genLevel(flat);
      let ms = 0, ttsMs = 0;
      for (const q of L.quizzes) {
        const stemMs = estMs([...q.stem].length);
        ms += stemMs + (q.kind === 'outfit' ? 300 * q.need.length : 0) + 5400;
        ttsMs += stemMs;
      }
      if (ttsMs / ms < 0.35) return false;
    }
    return true;
  })();
  const lvDurOk = durMinAll && ttsShareOk;
  if (lvDurOk) npass++;
  units.duration = { ok: lvDurOk, minLvMs: minLv, perLvSec: durDetail, ttsShareOk: ttsShareOk };

  const out = { game: 'season', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key（__lastVoiceKey）/ voice.say 记录拼句文本（__lastSayText） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k) { window.__lastVoiceKey = k || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function () {};
  runVerify();
}
