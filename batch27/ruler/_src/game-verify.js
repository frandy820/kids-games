/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch=(ch-1)%4+1；生成关随机章
     参数 dch∈1-4，钩子直读——b25 坑④）/ 引擎直驱（逐题点应选卡→right/末题 done→全关 3 星）+
     章分布聚合（dch1/dch2 五关组合并集=6 / dch3 全陷阱 / dch4 每关 ≥2 cmp+≥1 count /
     生成关四型全现）
   ② SPEC 封闭表独立对账（verify 内从 SPEC-BATCH27 §0.64 文字独立重列，禁引用引擎
     ITEMS/UNITS/COMBOS12/TRAPS）× 40 关全题：合法组合封闭 12（整除才合法，表外禁出题）/
     物品基准长 pencil4·crayon3·eraser2·scissors4·toycar5·book6 / 单位基准 clip1·stick2·
     block3 独立复算 units / cmp 陷阱对封闭 4 + 两卡单位互异（干扰禁全同单位）+ 答案=
     基准长大者独立复算 / 数字卡 4 互异含真值 ±1 与 ±2 至少各一 / 相邻题同型互异 /
     flat0q0 恒 pencil|clip（教学锚点）
   ③ ch3 陷阱专项（flat10-14 五关全题）：pair ∈ 陷阱对封闭 4 + 真值按基准长独立复算 +
     数字与长度脱钩断言（答案数字 ≤ 干扰数字而真长更大）
   ④ 点卡单元（flat0 真实 UI 状态机）：越界下标=null；count 错=wrong+miss+1+1000ms
     防重入窗（fire-and-forget 首击+窗内二击被拦——b25 坑①方法学）+ 反馈链
     [rul_wrong, {key:null,text:SPEC_GUIDE 方向句}]（under/over 双向）+ cmp 错（flat10）
     链句按所点卡单位（SPEC_GUIDE['cmp_'+unit]）；对=right 推进；换题 miss 清零；
     确认句 __lastSayText=独立拼句
   ⑤ 教学链：tutorialWatch() 真实走完（stub 存档）→ __ruDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；flat0 题0 恒 pencil|clip（锚点）
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump 微动效（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=5，恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3 陷阱）先点 1 次错卡再 autoSolve（miss=1 → 2 星）
   ⑨ 布局：双 viewport（1280×800 / 800×1180）×（ch1 count / ch3 cmp / ch4 混合）：
     数字/物品卡 ≥96×96（主答案 §0.9）、题面卡 ≥64、overflowX ≤0、卡与题面描边色对底色
     对比度 ≥3:1
   ⑩ clips：rul_ 6 条 + core 3 条全注入（dataURI 前缀在场）+ duration 身份辨别器
     （new Audio onloadedmetadata 与 SPEC §4 实长表差 ≤60ms）
   ⑪ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑫ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1；
     生成关 nextHint(f)=GEN_HINTS[genLevel(f+1).dch-1] 实算对账（家族 F，禁 (ci+1)%4）
   ⑬ verify 提速断言：SPEED=0.12
   ⑭ 语音窗动态断言（b25 estMs 定版：estMs(n)=n*345+600）：
     判对演出窗 1800+3600=5400 ≥ estMs(最长确认句独立拼算)；
     教学演示窗 900+4×500+1000=3900 ≥ rul_tut_watch 3360+300；
     turn 后读题延 2200 ≥ rul_tut_turn 1896+300；
     winFlow 补窗 2620+400=3020 ≥ rul_right 2496+300；
     链豁免窗 8800 ≥ rul_wrong 2880+150+estMs(最长引导句 14 字符)+300（m1 全字符）
   ⑮ 家族 A/B/F/I 源码级断言（Function.toString）：boot 含 nextHint(lim - 1) /
     winFlow 含 nextHint(null) / nextHint 含 genLevel(f + 1).dch 实算且禁 (ci + 1) % 4 /
     rescueTick 顶部 wrongChainUntil 守卫+lastDir/lastAct 双锚 / startLevel 重置
     lastWrongVoice+wrongChainUntil
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH27 §0.64/§1 文字独立重列（禁抄页面 ITEMS/UNITS/COMBOS12/TRAPS/GUIDE/文案） */
  const SPEC_ITEM6 = { pencil: 4, crayon: 3, eraser: 2, scissors: 4, toycar: 5, book: 6 };
  const SPEC_UBASE = { clip: 1, stick: 2, block: 3 };
  const SPEC_ITEM_N = { pencil: '铅笔', crayon: '蜡笔', eraser: '橡皮', scissors: '剪刀', toycar: '玩具车', book: '故事书' };
  const SPEC_UNIT_N = { clip: ['回形针', '根'], stick: ['小棒', '根'], block: ['积木', '块'] };
  const SPEC_COMBOS12 = [                                     // 合法组合封闭 12（整除才合法）
    ['pencil', 'clip'], ['crayon', 'clip'], ['eraser', 'clip'], ['scissors', 'clip'], ['toycar', 'clip'], ['book', 'clip'],
    ['book', 'stick'], ['pencil', 'stick'], ['scissors', 'stick'], ['eraser', 'stick'],
    ['book', 'block'], ['crayon', 'block']];
  const SPEC_COMBO_SET = {}; SPEC_COMBOS12.forEach(c => { SPEC_COMBO_SET[c[0] + '|' + c[1]] = SPEC_ITEM6[c[0]] / SPEC_UBASE[c[1]]; });
  const SPEC_TRAPS = [                                        // 陷阱对封闭 4（a=长方，b=短方）
    [['book', 'stick', 3], ['crayon', 'clip', 3]],            // 同数 3：6 vs 3
    [['pencil', 'stick', 2], ['eraser', 'clip', 2]],          // 同数 2：4 vs 2
    [['crayon', 'block', 1], ['eraser', 'clip', 2]],          // 数字反直觉：3 vs 2，数字 1 的蜡笔长
    [['book', 'block', 2], ['pencil', 'clip', 4]]];           // 数字反直觉：6 vs 4，数字 2 的书长
  const SPEC_TRAP_SET = {};
  SPEC_TRAPS.forEach(t => {
    SPEC_TRAP_SET[[t[0][0] + '|' + t[0][1], t[1][0] + '|' + t[1][1]].sort().join('&')] = t;
  });
  const SPEC_GUIDE = {
    count_over: '没有那么多，再数数', count_under: '还有一小段，再多数一根',
    cmp_clip: '回形针短，数得多也不一定长哦',
    cmp_stick: '小棒长，根数少也可能长哦',
    cmp_block: '积木长，块数少也可能长哦' };
  const SPEC_NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六' };   // 2=两（试玩 P3-a 口语量词）
  const SPEC_DUR = { rul_tut_watch: 3360, rul_tut_turn: 1896, rul_hint: 2544,
                     rul_right: 2496, rul_wrong: 2880, rul_q: 2448 };
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/汉字 + 600 落定余量
  const hanN = t => String(t).replace(/[^一-鿿]/g, '').length;
  const specUnits = (item, unit) => SPEC_ITEM6[item] / SPEC_UBASE[unit];      // 独立复算链长
  const specLen = c => c.units * SPEC_UBASE[c.unit];                          // 独立复算基准真长
  /* 独立拼确认句（SPEC 句式：item+有/更长，有+N+量词+单位名+长） */
  const specConfirm = (kind, item, unit, n) => SPEC_ITEM_N[item] +
    (kind === 'cmp' ? '更长，有' : '有') + SPEC_NUMCN[n] + SPEC_UNIT_N[unit][1] + SPEC_UNIT_N[unit][0] + '长';
  const trapKeyOf = q => q.opts.map(o => o.id + '|' + o.unit).sort().join('&');

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dch1Seen = {}, dch2Seen = {}, dch3Traps = {}, dch4Agg = [], genDch = {};
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
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* 引擎直驱：逐题点应选卡 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const i = correctIdx(q);
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapOpt(L3, i);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 章分布聚合（⑨ 数据源） */
    if (L1.dch === 1 && flat < 5) L1.quizzes.forEach(q => { dch1Seen[q.item + '|' + q.unit] = 1; });
    if (L1.dch === 2 && flat >= 5 && flat < 10) L1.quizzes.forEach(q => { dch2Seen[q.item + '|' + q.unit] = 1; });
    if (L1.dch === 3) L1.quizzes.forEach(q => { dch3Traps[trapKeyOf(q)] = 1; });
    if (L1.dch === 4) dch4Agg.push({
      cmp: L1.quizzes.filter(q => q.kind === 'cmp').length,
      cnt: L1.quizzes.filter(q => q.kind === 'count').length });
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   kinds: L1.quizzes.map(q => q.kind),
                   subs: L1.quizzes.map(q => q.kind === 'count' ? q.item + '|' + q.unit + ':' + q.units
                                   : trapKeyOf(q)) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const distOk = Object.keys(dch1Seen).length === 6 &&                          // ch1 五关并集=clip×6
                 Object.keys(dch2Seen).length === 6 &&                          // ch2 五关并集=stick×4+block×2
                 Object.keys(dch3Traps).length === 4 &&                         // ch3 五关陷阱对并集=4
                 dch4Agg.every(a => a.cmp >= 2 && a.cnt >= 1) &&                // ch4 混合：cmp≥2+count≥1
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;  // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, dch1N: Object.keys(dch1Seen).length, dch2N: Object.keys(dch2Seen).length,
                 dch3N: Object.keys(dch3Traps).length, dch4: dch4Agg, genDch: genDch };

  /* ---- ② SPEC 封闭表独立对账（表独立重列 × 40 关全题，期望全独立复算） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const isAnchor = flat === 0 && k === 0;
      if (isAnchor && !(q.kind === 'count' && q.item === 'pencil' && q.unit === 'clip')) {
        badCase = 'anchor ' + flat + '/' + k; tableOk = false; break outer;
      }
      if (q.kind === 'count') {
        const ck = q.item + '|' + q.unit;
        if (SPEC_COMBO_SET[ck] === undefined) { badCase = 'combo ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.units !== SPEC_COMBO_SET[ck]) { badCase = 'units ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.opts.length !== 4) { badCase = 'len ' + flat + '/' + k; tableOk = false; break outer; }
        const nums = q.opts.map(o => o.num);
        if (nums.filter((v, i, a) => a.indexOf(v) === i).length !== 4) { badCase = 'dup ' + flat + '/' + k; tableOk = false; break outer; }
        if (!nums.every(n => n >= 1 && n <= 6)) { badCase = 'range ' + flat + '/' + k; tableOk = false; break outer; }
        if (nums.filter(n => n === q.units).length !== 1) { badCase = 'ansN ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.answer !== nums.indexOf(q.units)) { badCase = 'ansIdx ' + flat + '/' + k; tableOk = false; break outer; }
        const ds = nums.filter(n => n !== q.units);                     // 3 干扰：±1 与 ±2 至少各一
        if (!ds.some(n => Math.abs(n - q.units) === 1)) { badCase = 'd1 ' + flat + '/' + k; tableOk = false; break outer; }
        if (!ds.some(n => Math.abs(n - q.units) === 2)) { badCase = 'd2 ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch === 1 && q.unit !== 'clip') { badCase = 'dch1unit ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch === 2 && q.unit === 'clip') { badCase = 'dch2unit ' + flat + '/' + k; tableOk = false; break outer; }
      } else if (q.kind === 'cmp') {
        if (q.opts.length !== 2) { badCase = 'len2 ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.opts[0].unit === q.opts[1].unit) { badCase = 'sameUnit ' + flat + '/' + k; tableOk = false; break outer; }
        for (const o of q.opts) {                                       // 两卡各自=合法组合
          if (SPEC_COMBO_SET[o.id + '|' + o.unit] !== o.units) { badCase = 'cardCombo ' + flat + '/' + k; tableOk = false; break outer; }
        }
        const tk = trapKeyOf(q);
        if (SPEC_TRAP_SET[tk] === undefined) { badCase = 'trapPair ' + flat + '/' + k; tableOk = false; break outer; }
        const la = specLen(q.opts[0]), lb = specLen(q.opts[1]);         // 真值按基准长独立复算
        if (la === lb) { badCase = 'tie ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.answer !== (lb > la ? 1 : 0)) { badCase = 'ansCmp ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.item !== q.opts[q.answer].id || q.unit !== q.opts[q.answer].unit ||
            q.units !== q.opts[q.answer].units) { badCase = 'hdr ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch !== 3 && L.dch !== 4) { badCase = 'cmpCh ' + flat + '/' + k; tableOk = false; break outer; }
      } else { badCase = 'kind ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 3 && q.kind !== 'cmp') { badCase = 'dch3kind ' + flat + '/' + k; tableOk = false; break outer; }
      const prev = k > 0 ? L.quizzes[k - 1] : null;                     // 相邻同型互异（独立判）
      if (prev && prev.kind === q.kind) {
        const ka = prev.kind === 'count' ? prev.item + '|' + prev.unit : trapKeyOf(prev);
        const kb = q.kind === 'count' ? q.item + '|' + q.unit : trapKeyOf(q);
        if (ka === kb) { badCase = 'adjacent ' + flat + '/' + k; tableOk = false; break outer; }
      }
    }
    if (L.dch === 4) {
      const cmpN = L.quizzes.filter(q => q.kind === 'cmp').length;
      if (cmpN < 2 || cmpN === CH_LEN) { badCase = 'dch4mix ' + flat; tableOk = false; break; }
    }
  }
  /* 页面表 ↔ SPEC 表逐条一致（物品名/单位名/量词/引导句/章名——防文案漂移） */
  const tabOk2 = ITEM_KEYS.every(k => ITEMS[k].n === SPEC_ITEM_N[k] && ITEMS[k].base === SPEC_ITEM6[k]) &&
                 UNIT_KEYS.every(k => UNITS[k].n === SPEC_UNIT_N[k][0] && UNITS[k].q === SPEC_UNIT_N[k][1] &&
                                      UNITS[k].base === SPEC_UBASE[k]) &&
                 COMBOS12.length === 12 &&
                 Object.keys(SPEC_GUIDE).every(k => GUIDE[k] === SPEC_GUIDE[k]);
  if (tableOk && tabOk2) npass++;
  units.table = { ok: tableOk && tabOk2, bad: badCase, pageTab: tabOk2 };

  /* ---- ③ ch3 陷阱专项（flat10-14 五关全题：真值独立复算+异单位+数字长度脱钩） ---- */
  total++;
  const trapDetail = [];
  let trap3Ok = true;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    if (L.dch !== 3) { trap3Ok = false; break; }
    for (const q of L.quizzes) {
      const tk = trapKeyOf(q);
      const spec = SPEC_TRAP_SET[tk];                        // 期望陷阱对（独立表）
      if (!spec) { trap3Ok = false; trapDetail.push('pairMiss ' + flat); break; }
      const la = specLen(q.opts[0]), lb = specLen(q.opts[1]);
      const ansOk = q.answer === (lb > la ? 1 : 0) && la !== lb;          // 答案=基准长大者
      const other = 1 - q.answer;
      const unhook = q.opts[q.answer].units <= q.opts[other].units &&     // 数字不指示长度（≤ 而更长）
                     specLen(q.opts[q.answer]) > specLen(q.opts[other]);
      const diffUnit = q.opts[0].unit !== q.opts[1].unit;                 // 干扰不同单位
      if (!ansOk || !unhook || !diffUnit) { trap3Ok = false; trapDetail.push('bad ' + flat); }
    }
    trapDetail.push(flat + ':' + L.quizzes.map(q =>
      q.opts[0].id + q.opts[0].units + q.opts[0].unit[0] + '/' + q.opts[1].id + q.opts[1].units + q.opts[1].unit[0] + '>' +
      q.opts[q.answer].id).join(','));
  }
  if (trap3Ok) npass++;
  units.trap3 = { ok: trap3Ok, detail: trapDetail };

  /* ---- ④ 点卡单元（flat0 count：越界/双向错链/防重入/miss 口径 + flat10 cmp 链句 + 确认句） ---- */
  total++;
  startLevel(0);
  const q4 = RU.quiz;
  const initOk = q4 && q4.kind === 'count' && q4.item === 'pencil' && q4.unit === 'clip' &&
                 q4.units === 4 && q4.opts.length === 4 &&
                 q4.opts.map(o => o.num).join().length > 0 &&
                 q4.answer === q4.opts.findIndex(o => o.num === 4) &&
                 q4.step === 0 && q4.miss === 0;
  const badIdx = (await RU.tapOpt(99)) === null;              // 越界下标=null（不炸）
  const nums0 = q4.opts.map(o => o.num);
  const iUnder = nums0.findIndex(n => n < 4);                 // 所点<真值（如 2/3）
  const iOver = nums0.findIndex(n => n > 4);                  // 所点>真值（5/6）
  const pU = RU.tapOpt(iUnder);                               // 第一错（under）走完整 1000ms 窗
  const rU = await pU;
  const chainU = window.__lastQueue && window.__lastQueue[0] === 'rul_wrong' &&
                 window.__lastQueue[1] && window.__lastQueue[1].key === 'rul_g_count_under' &&   // T46 阶段2：引导句键轨
                 window.__lastQueue[1].text === SPEC_GUIDE.count_under;   // 按所点数字方向
  const s1 = rU === 'wrong' && chainU && RU.quiz.miss === 1 && RU.currentLevel.miss === 1;
  const pW = RU.tapOpt(iOver);                                // 第二错（over）：fire-and-forget 首击
  const rejW = await RU.tapOpt(iOver);                        // 窗内紧邻再点=被拦 false（1000ms 防重入）
  const rW = await pW;
  const chainO = window.__lastQueue && window.__lastQueue[1] &&
                 window.__lastQueue[1].text === SPEC_GUIDE.count_over;    // 所点>真值
  const s1b = rW === 'wrong' && rejW === false && chainO && RU.quiz.miss === 2;
  const rR = await RU.tapOpt(q4.answer);
  const confirmOk = window.__lastVoiceKey === 'rul_cf_pencil_clip' &&                    // T46 阶段2：确认句键轨（spec 参数 pencil/clip 派生）
                 window.__lastVoiceText === specConfirm('count', 'pencil', 'clip', 4);   // 文本仍按 SPEC 独立拼句对账
  const s2 = rR === 'right' && RU.quiz.step === 1 && RU.quiz.miss === 0 && confirmOk;
  /* flat10（dch3）cmp 错反馈链：按所点卡单位（clip 卡→cmp_clip 句族） */
  startLevel(10);
  const qc = RU.quiz;
  const wIdx = 1 - qc.answer;
  const rC = await RU.tapOpt(wIdx);
  const chainC = window.__lastQueue && window.__lastQueue[0] === 'rul_wrong' &&
                 window.__lastQueue[1].text === SPEC_GUIDE['cmp_' + qc.opts[wIdx].unit];
  const cmpOk = qc.kind === 'cmp' && rC === 'wrong' && chainC && RU.quiz.miss === 1;
  const tapOk = initOk && badIdx && s1 && s1b && s2 && cmpOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badIdx: badIdx, under: s1, over: s1b, right: s2,
                confirm: confirmOk, cmpChain: cmpOk };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __ruDemoR='right'（演示数回形针量铅笔） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__ruDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'count' &&
                cur.quizzes[0].item === 'pencil' && cur.quizzes[0].unit === 'clip' &&
                tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__ruDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await RU.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await RU.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && RU.quiz.step === 0 && RU.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await RU.autoSolve();
  const lv0 = RU.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3 陷阱）先点 1 次错卡再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = RU.quiz;
  const wrongC = 1 - q8.answer;
  const r8 = await RU.tapOpt(wrongC);
  const a10 = await RU.autoSolve();
  const lv10 = RU.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑨ 布局：双 viewport ×（flat0 ch1 count / flat10 ch3 cmp / flat17 ch4 混合）+ 对比度 ---- */
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
    startLevel(g._simFlat);
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length >= 2 && cards.every(b => b.w >= 96 && b.h >= 96);
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&                        // 卡描边 INK 对底
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, cards: cards.length, hitOk: hitOk, sceneOk: sceneOk,
             contrast: cB && cS, ox: ox, pass: hitOk && sceneOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 10, 17]) {
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

  /* ---- ⑩ clips：rul_ 6 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['rul_tut_watch', 'rul_tut_turn', 'rul_hint', 'rul_right', 'rul_wrong', 'rul_q',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = keys.length === 43 &&
    keys.filter(k => /^(rul_q_|rul_q2$|rul_cf|rul_cft_|rul_g_)/.test(k)).length === 34 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

  /* ---- ⑪ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑫ 章末预告 C7 关键词断言（hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('小棒') >= 0 && CHAPTERS[1].hint.indexOf('积木') >= 0 &&   // 预告 ch2 换单位
                 CHAPTERS[2].hint.indexOf('根数') >= 0 && CHAPTERS[2].hint.indexOf('不一样') >= 0 && // 预告 ch3 单位陷阱
                 CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 &&     // 预告 ch4 混合
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                                              // 预告生成关
                 GEN_HINTS[0].indexOf('回形针') >= 0 &&                                              // dch1 回形针数一数
                 GEN_HINTS[1].indexOf('小棒') >= 0 && GEN_HINTS[1].indexOf('积木') >= 0 &&           // dch2 换个单位量
                 GEN_HINTS[2].indexOf('根数') >= 0 &&                                                // dch3 单位陷阱
                 GEN_HINTS[3].indexOf('集合') >= 0;                                                  // dch4 混合
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // 家族 F：生成关预告=实算下一关 dch
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS, genCalc: genOk };

  /* ---- ⑬ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑭ 语音窗动态断言（b25 estMs 定版：窗 ≥ estMs(最长句)；clip 实长 SPEC §4） ---- */
  total++;
  let maxConfLen = 0;
  SPEC_COMBOS12.forEach(c => {                              // 独立拼全部确认句候选取最长
    const n = SPEC_ITEM6[c[0]] / SPEC_UBASE[c[1]];
    maxConfLen = Math.max(maxConfLen, hanN(specConfirm('count', c[0], c[1], n)),
                                  hanN(specConfirm('cmp', c[0], c[1], n)));
  });
  const maxGuideLen = Math.max.apply(null, Object.keys(SPEC_GUIDE).map(k => hanN(SPEC_GUIDE[k])));
  const winOk = (1800 + 3600) >= estMs(maxConfLen) &&   // 判对演出窗 5400 ≥ estMs(最长确认句)
                (900 + 4 * 500 + 1000) >= 3360 + 300 && // 教学演示窗 t=3900 ≥ watch 3360+300
                2200 >= 1896 + 300 &&                   // turn 后读题延 ≥ 1896+300
                (2620 + 400) >= 2496 + 300 &&           // winFlow celebrate+补窗 ≥ rul_right+300
                8800 >= 2880 + 150 + estMs(maxGuideLen) + 300;   // 链豁免窗 ≥ 错链实长+300（m1 全字符）
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: { maxConfLen: maxConfLen, estMsConf: estMs(maxConfLen),
                                     maxGuideLen: maxGuideLen, chainNeed: 2880 + 150 + estMs(maxGuideLen) + 300 } };

  /* ---- ⑮ 家族 A/B/F/I 源码级断言（Function.toString——b26 审查源码级口径） ---- */
  total++;
  const srcBoot = boot.toString(), srcWin = winFlow.toString(), srcHint = nextHint.toString(),
        srcResc = rescueTick.toString(), srcStart = startLevel.toString();
  const srcOk = srcBoot.indexOf('nextHint(lim - 1)') >= 0 &&                    // A：启动 dayEnd 传 lim-1
                srcWin.indexOf('nextHint(null)') >= 0 &&                        // A：winFlow 传 null（等价）
                srcHint.indexOf('genLevel(f + 1).dch') >= 0 &&                  // F：生成关实算下一关 dch
                srcHint.indexOf('(ci + 1) % 4') < 0 &&                          // F：禁章序推进（b26 M3）
                srcResc.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&  // I：链豁免窗守卫
                srcStart.indexOf('lastWrongVoice = 0') >= 0 &&                  // I/J：startLevel 重置
                srcStart.indexOf('wrongChainUntil = 0') >= 0 &&                 // I：startLevel 重置豁免窗
                srcResc.indexOf('lastDir') >= 0 &&                              // B：方向级独立锚在场
                srcResc.indexOf('lastAct') >= 0 &&                              // B：答案级锚独立不被覆盖
                uiTapOpt.toString().indexOf('wrongChainUntil = Date.now() + 8800') >= 0;  // I：错路径设豁免终点
  if (srcOk) npass++;
  units.src = { ok: srcOk };

  const out = { game: 'ruler', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key/text（__lastVoiceKey/__lastVoiceText）；voice.queue 记录拼播链
     （__lastQueue）；voice.say 记录 TTS 拼句（__lastSayText）——供 ④ 链句/确认句断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  runVerify();
}
