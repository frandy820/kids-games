/* ================= ?verify=1 自检（仅 verify 分支加载执行——独立第 4 script 块）
   ① 静态 32 + 生成 16 关全量审计（flat 0-47）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/8+1，dch 静态 1+flat//8+生成 1-4）/
     引擎直驱（逐题点应选卡 8 题→right/末题 done→全关 3 星）
   ② SPEC 表独立对账（SPEC_CATS/SPEC_NAMES/SPEC_DECIDE 等——verify 内从 SPEC-BATCH31
     §4 r17 增补段文字独立重列，不引用引擎 CATS6/NUMCN/DECIDE_MS）× 48 关全题：
     类目 ⊆封闭集互异（3/4 类目；twocompare 图内 2）/ 值 10-20 互异（无并列=排序族
     唯一性先验）/ unit 规则（ch1/3=1、ch2=2、ch4 掷 1|2；u2 值=格数×2 格 5-10）/
     most/least/second 真值=极值/升序倒数第 2 独立复算 / howmany 真值=目标行值 /
     total 真值=全行和 / compare A>B 差 1-10 / constraint 夹层恰 1 /
     twocompare 两图同类目对+下午>上午+差 2-8 / unit=2 数值族干扰必含格数误读值 /
     answer 独立复算 / 题面句逐字 / flat0q0=most（教学锚）
   ③ 聚合独占票：dch1 四族/dch2 三族/dch3 四族/dch4 八族在场 / 生成关 dch1-4 全现 /
     每关恰 8 题 / modeled 最低值 ≥ 99854（精确钉）
   ④ tapMost 单元（flat0）：越界=null；一错=wrong+miss1+chr_again_most 键段链（T46）+
     二错（豁免窗后）miss2+答案行 lit；对=right+确认链 [chr_right,chr_n_<答案类目>]
   ⑤ tapHowmany2 单元（flat8 ch2 全 unit=2）：轴角标「一格=2」在场+目标行**格数**
     逐格 pulse（格数=值/2 非 20 格）+错链=换算语义句+干扰含格数误读值+
     对=right+确认链 [chr_right,chr_n_<值>]（T46 阶段3 数字 clip）
   ⑥ tapTotal 单元（flat0 遍历寻 total）：错链=合计语义句；对=确认链
     [chr_right,chr_s_yg,chr_n_<和>]（T46 阶段3）
   ⑦ tapSecond 单元（flat24 ch4 寻 second）：错链=排序语义句；二错后第二多行 lit
     （升序倒数第 2 独立复算行）；对=[chr_right,chr_n_<第二多类目>]
   ⑧ tapCompare 单元（flat16 ch3 寻 compare·unit=1）：错链=比较语义句；对=
     [chr_right,chr_s_do,chr_n_<差>]（T46 阶段3）
   ⑨ tapConstraint 单元（flat16 寻 constraint）：错链=双条件语义句+两约束行
     row pulse（非答案行）；对=[chr_right,chr_n_<夹层类目>]
   ⑩ tapTwocompare 单元（flat16 寻 twocompare）：两 sub-chart 在场（上午/下午）+
     两图目标行逐格 pulse+对=[chr_right,chr_s_do,chr_n_<差>]（T46 阶段3）
   ⑪ 帧内容断言（契约 M）：行 DOM 数==cats.len、data-cat/data-v==引擎、每行
     .unit 数==values[i]/unit（u2 按 2 倍换算对账）且含 SVG g[data-cat]、
     u2 轴角标在场/u1 缺席、图卡 data-anim/数字卡 data-num==opts、twocompare 双图
   ⑫ 教学链：tutorialWatch() 真实走完（stub 存档）→ __chDemoR==='right' 且
     tut='help'，watch 折算真实时长 ≤16s
   ⑬ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑭ UI 冒烟：flat0 autoSolve（taps=8 恒 3★）/ flat8（ch2）autoSolve / flat24（ch4）
     先 1 错再 autoSolve（miss=1 → 2★）
   ⑮ 布局 simView：横视口 1280×800 + body.port 类通道 ×（ch1 most/ch2 u2/
     twocompare/constraint/second/生成关）：候选卡 ≥96×96、行高 ≥48px、格 ≥22px、
     描边对比度 ≥3:1、overflowX ≤0、u2 角标视口内
   ⑯ clips：chr_ 109 条（r17 25+T46 again 8+数字 74+碎片/标签 s_*·lab_*）+ core 3 条
     =112 全注入 + duration 辨别器（SPEC §4 实长 ±60ms，含数字键 1..74）
   ⑰ 契约 L 专项：NUMCN 封闭域 1-74 全量非 undefined（2=两/22=二十二/74=七十四/
     75=undefined 上界）
   ⑱ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑲ 契约 A/B/E/F/I/J/K+迁移 IIFE+竖屏双通道源码断言（读第 3 script 块=游戏块，
     verify 独立第 4 块不自匹配；A=双 lim-1+停留 Math.max(0,lim-1)+旧 null 实参禁再现）
   ⑳ 章末/日末预告独立硬编码对账（家族 F 定式：ci<4→CHAPTERS[ci+1].hint（flat7/15/23/31
     与章中段 flat26）、ci≥4→GEN 实算 genLevel(f+1).dch-1）
   ㉑ 语音窗动态断言（T46 阶段3 全 clip 口径）：判对窗 1600+4700=6300 ≥
     max(类目 4338, howmany 4578, total 6216, compare 5616)；错链豁免窗
     clip 实长+300（T46 八键，最长 unit2 3384+300=3684）；教学窗四项
   ㉒ modeled 难度地板：48 关 Σ(listen+DECIDE+conv+tap) 最低值 ≥99854（精确钉）
   ㉓ SPEED=0.12 提速断言
   结果写 #verify-result + window.__chVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH31 §0.78/§3/§4 r17 增补段文字独立重列（禁抄页面 CATS6/CATNAME/NUMCN/文案） */
  const SPEC_CATS = ['rabbit', 'cat', 'dog', 'bird', 'fish', 'chick'];   // 类目封闭 6
  const SPEC_NAMES = { rabbit: '兔子', cat: '猫', dog: '狗',
                       bird: '小鸟', fish: '鱼', chick: '小鸡' };
  const SPEC_DUR = { chr_tut_watch: 2976, chr_tut_turn: 1872, chr_hint: 2112, chr_right: 2448,
                     chr_wrong: 2016, chr_q_most: 1824, chr_q_least: 1824,
                     chr_q_second: 1848, chr_q_total: 2040,
                     chr_q_howmany: 1752, chr_q_compare: 1968,
                     chr_n_rabbit: 1368, chr_n_cat: 1104, chr_n_dog: 1104,
                     chr_n_bird: 1440, chr_n_fish: 1080, chr_n_chick: 1440,   // SPEC §4 clip 实长
                     chr_again_most: 2688, chr_again_second: 3264, chr_again_howmany: 2184,
                     chr_again_total: 3120, chr_again_compare: 3216, chr_again_unit2: 3384,
                     chr_again_constraint: 2640, chr_again_twocompare: 3168,   // T46 阶段2 八键
                     chr_s_bi: 1128, chr_s_dyou: 1536, chr_s_shd: 1896, chr_s_de: 1128,
                     chr_s_duo: 1680, chr_s_yg: 1320, chr_s_do: 1104,
                     chr_lab_pm: 1392, chr_lab_am: 1416 };                     // T46 阶段3 拼句碎片
  /* T46 阶段3 数字键 chr_n_1..74（与源 NUMCN 表同口径 74/74 已核；ffprobe 实测 ms） */
  const SPEC_NUM = {
                   1: 1368, 2: 1416, 3: 1440, 4: 1464, 5: 1344, 6: 1416, 7: 1416, 8: 1416,
                   9: 1392, 10: 1464, 11: 1584, 12: 1584, 13: 1656, 14: 1656, 15: 1584, 16: 1656,
                   17: 1680, 18: 1632, 19: 1632, 20: 1560, 21: 1752, 22: 1752, 23: 1776, 24: 1776,
                   25: 1728, 26: 1752, 27: 1776, 28: 1776, 29: 1752, 30: 1608, 31: 1800, 32: 1752,
                   33: 1824, 34: 1848, 35: 1752, 36: 1824, 37: 1848, 38: 1824, 39: 1824, 40: 1632,
                   41: 1800, 42: 1752, 43: 1776, 44: 1824, 45: 1752, 46: 1776, 47: 1824, 48: 1824,
                   49: 1800, 50: 1560, 51: 1680, 52: 1704, 53: 1728, 54: 1728, 55: 1656, 56: 1704,
                   57: 1752, 58: 1728, 59: 1704, 60: 1560, 61: 1728, 62: 1728, 63: 1776, 64: 1752,
                   65: 1728, 66: 1728, 67: 1776, 68: 1776, 69: 1752, 70: 1560, 71: 1728, 72: 1728,
                   73: 1776, 74: 1776 };
  for (const _n in SPEC_NUM) SPEC_DUR['chr_n_' + _n] = SPEC_NUM[_n];
  const SPEC_AGAIN = { most: '再看看哪一行最长', second: '先找最多的，再找第二多',
                       howmany: '再数一数这一行', total: '把每一行都数一数再加起来',
                       compare: '一行一行数一数再比一比', unit2: '一格代表两只，数数格子',
                       constraint: '两个条件都要比一比哦', twocompare: '两张图都看一看再比一比' };
  const SPEC_CHAPTER_HINTS = { 1: '一格代表两只，数格子算一算', 2: '两张图比一比，还要找中间的',
                               3: '第二大也找得到，全都混在一起', 4: '新一轮看图找答案' };
  const SPEC_GEN_HINTS = ['三行图里数一数，再算总数', '一格代表两只，数格子',
                          '两张图比一比', '读图大集合'];
  const SPEC_DECIDE = { most: 8000, least: 8000, second: 12000, howmany: 11000,
                        total: 15000, compare: 12000, constraint: 14000, twocompare: 15000 };
  const SPEC_CONV = 4000, SPEC_TAP = 1200;
  const MODELED_MIN = 99854;                // T46 阶段3 重钉（listen 全 clip 口径，flat7 ch1）——selftest 双钉
  const SPEC_CH_LEN = 8, SPEC_STATIC = 32;      // r17 键基
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const unlocked = async () => {                  // 等错防重入/演出窗结束（verify 提速后 ≤1s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);
  /* 遍历推进直到目标题型出现（在场保证：dch2 含 howmany/dch3 四族/dch4 八族各一） */
  const seekKind = async kind => {
    for (let g = 0; g < 12; g++) {
      const q = window.CH.quiz;
      if (!q) return null;
      if (q.kind === kind) return q;
      if (!(await unlocked())) return null;
      const r = await window.CH.tapOpt(q.answer);
      if (r === 'done' || r === false) return null;
    }
    return null;
  };
  const numList = q => q.opts.map(o => o.num);
  const animList = q => q.opts.map(o => o.anim);
  const isCatKind = k => k === 'most' || k === 'least' || k === 'second' || k === 'constraint';

  /* ---- ①② 48 关全量审计 + SPEC 表独立对账 + modeled ---- */
  const genDch = {}, missBad = [], lenBad = [];
  const modeledBy = {}; let modeledMin = Infinity, modeledMinFlat = -1;
  let badCase = null, tableOk = true;
  for (let flat = 0; flat < 48; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    if (L1.quizzes.length !== SPEC_CH_LEN) lenBad.push(flat);                   // 32 关×8 题对账
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k);
      if (why) ruleOk = false;
    }
    const expCh = Math.floor(flat / SPEC_CH_LEN) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = flat < SPEC_STATIC ? L1.dch === Math.floor(flat / SPEC_CH_LEN) + 1   // 静态四档
                                     : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* 引擎直驱：逐题点应选卡 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapOpt(L3, q.answer);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === SPEC_CH_LEN && L3.retries === 0 && engStars(L3) === 3;

    /* SPEC 表独立对账（每题：类目/值域/unit 先验/真值与 answer 独立复算/题面句逐字） */
    let specOk = true;
    const kindSeen = {};
    let lvModeled = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k], ch = q.chart;
      kindSeen[q.kind] = (kindSeen[q.kind] || 0) + 1;
      const ncat = q.kind === 'twocompare' ? 2 : (L1.dch === 1 || L1.dch === 2 ? 3 : 4);
      if (ch.cats.length !== ncat) { badCase = 'ncat ' + flat + '/' + k; specOk = false; break; }
      for (const c of ch.cats) if (SPEC_CATS.indexOf(c) < 0) { badCase = 'catPool ' + flat + '/' + k; specOk = false; break; }
      if (!specOk) break;
      if (new Set(ch.cats).size !== ch.cats.length) { badCase = 'catDup ' + flat + '/' + k; specOk = false; break; }
      if (ch.values.length !== ch.cats.length) { badCase = 'vlen ' + flat + '/' + k; specOk = false; break; }
      for (const v of ch.values) if (!Number.isInteger(v) || v < 10 || v > 20) { badCase = 'vRange ' + flat + '/' + k; specOk = false; break; }
      if (!specOk) break;
      if (new Set(ch.values).size !== ch.values.length) { badCase = 'vDup ' + flat + '/' + k; specOk = false; break; }   // 无并列先验
      /* unit 章规（SPEC：ch1/3 恒 1、ch2 恒 2、ch4 掷 1|2；twocompare 恒 1） */
      const uExp = L1.dch === 2 ? 2 : (L1.dch === 4 && q.kind !== 'twocompare' ? null : 1);
      if (uExp !== null && ch.unit !== uExp) { badCase = 'unit ' + flat + '/' + k; specOk = false; break; }
      if (ch.unit !== 1 && ch.unit !== 2) { badCase = 'unitV ' + flat + '/' + k; specOk = false; break; }
      if (ch.unit === 2) {
        for (const v of ch.values) {
          const c2 = v / 2;
          if (v % 2 !== 0 || c2 < 5 || c2 > 10) { badCase = 'cellRange ' + flat + '/' + k; specOk = false; break; }
        }
        if (!specOk) break;
      }
      if (flat === 0 && k === 0 && q.kind !== 'most') { badCase = 'anchor ' + flat; specOk = false; break; }   // 教学演示锚点
      let expTruth = null, expText = null, mis = null, lo = 1, hi = 12;
      if (q.kind === 'most' || q.kind === 'least' || q.kind === 'second') {
        const order = ch.cats.map((c, i) => [ch.values[i], c]).sort((a, b) => a[0] - b[0]);   // 升序独立排
        expTruth = q.kind === 'most' ? order[order.length - 1][1]
          : q.kind === 'least' ? order[0][1] : order[order.length - 2][1];
        expText = q.kind === 'most' ? '谁最多呀？' : (q.kind === 'least' ? '谁最少呀？' : '谁第二多呀？');
        const vals = animList(q);
        if (q.opts.length !== ch.cats.length) { badCase = 'optLen ' + flat + '/' + k; specOk = false; break; }
        if (vals.length !== new Set(ch.cats.concat(vals)).size) { badCase = 'optSet ' + flat + '/' + k; specOk = false; break; }   // 候选=类目全集
        if (q.target !== null || q.pair !== null || q.chart2 !== null) { badCase = 'extra ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'howmany') {
        const ti = ch.cats.indexOf(q.target);
        if (ti < 0) { badCase = 'target ' + flat + '/' + k; specOk = false; break; }        // 目标∈图内
        expTruth = ch.values[ti];
        if (ch.unit === 2) mis = ch.values[ti] / 2;                       // 格数误读值必在候选
        lo = 5; hi = 21;
        expText = SPEC_NAMES[q.target] + '有几只呀？';
        if (q.pair !== null || q.chart2 !== null) { badCase = 'extra ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'total') {
        expTruth = ch.values.reduce((s, v) => s + v, 0);
        if (ch.unit === 2) mis = ch.values.reduce((s, v) => s + v / 2, 0);
        lo = 15; hi = 80;
        expText = '一共有几只呀？';
        if (q.target !== null || q.pair !== null || q.chart2 !== null) { badCase = 'extra ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'compare') {
        const ai = ch.cats.indexOf(q.pair[0]), bi = ch.cats.indexOf(q.pair[1]);
        if (ai < 0 || bi < 0 || ai === bi) { badCase = 'pairPool ' + flat + '/' + k; specOk = false; break; }
        if (ch.values[ai] <= ch.values[bi]) { badCase = 'pairOrder ' + flat + '/' + k; specOk = false; break; }   // A 值>B 值先验
        expTruth = ch.values[ai] - ch.values[bi];
        if (expTruth < 1 || expTruth > 10) { badCase = 'pairDiff ' + flat + '/' + k; specOk = false; break; }    // 差 1-10
        if (ch.unit === 2) mis = expTruth / 2;
        lo = 1; hi = 12;
        expText = SPEC_NAMES[q.pair[0]] + '比' + SPEC_NAMES[q.pair[1]] + '多几只呀？';
        if (q.target !== null || q.chart2 !== null) { badCase = 'extra ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'constraint') {
        const lowI = ch.cats.indexOf(q.pair[0]), highI = ch.cats.indexOf(q.pair[1]);
        if (lowI < 0 || highI < 0 || lowI === highI || ch.values[lowI] >= ch.values[highI]) {
          badCase = 'pairC ' + flat + '/' + k; specOk = false; break;
        }
        const between = ch.cats.filter((c, i) => ch.values[i] > ch.values[lowI] && ch.values[i] < ch.values[highI]);
        if (between.length !== 1) { badCase = 'pairMid ' + flat + '/' + k; specOk = false; break; }   // 夹层恰 1
        expTruth = between[0];
        expText = '比' + SPEC_NAMES[q.pair[0]] + '多又比' + SPEC_NAMES[q.pair[1]] + '少的是谁呀？';
        const vals = animList(q);
        if (vals.length !== new Set(ch.cats.concat(vals)).size) { badCase = 'optSetC ' + flat + '/' + k; specOk = false; break; }
        if (q.target !== null || q.chart2 !== null) { badCase = 'extra ' + flat + '/' + k; specOk = false; break; }
      } else {                                                      // twocompare
        const c2 = q.chart2;
        const ti = ch.cats.indexOf(q.target);
        if (!c2 || c2.cats.join() !== ch.cats.join() || ti < 0) { badCase = 'twoChart ' + flat + '/' + k; specOk = false; break; }
        if (c2.values[ti] <= ch.values[ti]) { badCase = 'twoOrder ' + flat + '/' + k; specOk = false; break; }
        expTruth = c2.values[ti] - ch.values[ti];
        if (expTruth < 2 || expTruth > 8) { badCase = 'twoDiff ' + flat + '/' + k; specOk = false; break; }
        lo = 1; hi = 10;
        expText = '下午的' + SPEC_NAMES[q.target] + '比上午的多几只呀？';
        if (q.pair !== null) { badCase = 'extra ' + flat + '/' + k; specOk = false; break; }
      }
      if (q.text !== expText) { badCase = 'text ' + flat + '/' + k; specOk = false; break; }   // 题面句逐字对账
      if (isCatKind(q.kind)) {                                     // 类目卡族：answer=真值卡
        const vals = animList(q);
        let expAns = -1;
        for (let j = 0; j < vals.length; j++) if (vals[j] === expTruth) expAns = j;
        if (expAns < 0 || q.answer !== expAns) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
      } else {                                                      // 数字卡族先验
        const nums = numList(q);
        if (nums.length !== 4) { badCase = 'nLen ' + flat + '/' + k; specOk = false; break; }
        for (const n of nums) if (!Number.isInteger(n) || n < lo || n > hi) { badCase = 'nRange ' + flat + '/' + k; specOk = false; break; }
        if (!specOk) break;
        if (new Set(nums).size !== 4) { badCase = 'nDup ' + flat + '/' + k; specOk = false; break; }
        if (nums.indexOf(expTruth) < 0) { badCase = 'nTruth ' + flat + '/' + k; specOk = false; break; }
        if (mis != null && nums.indexOf(mis) < 0) { badCase = 'nMis ' + flat + '/' + k; specOk = false; break; }   // 格数误读值必在候选
        for (const n of nums) if (n !== expTruth && n !== mis && Math.abs(n - expTruth) > 3) { badCase = 'nFar ' + flat + '/' + k; specOk = false; break; }   // 干扰⊆±3（误读值除外）
        if (!specOk) break;
        if (nums[q.answer] !== expTruth) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
      }
      /* modeled 认知时长累加（SPEC_DECIDE 独立表 + listen 实算） */
      let listen;
      if (q.kind === 'most') listen = SPEC_DUR.chr_q_most;
      else if (q.kind === 'least') listen = SPEC_DUR.chr_q_least;
      else if (q.kind === 'second') listen = SPEC_DUR.chr_q_second;
      else if (q.kind === 'total') listen = SPEC_DUR.chr_q_total;
      else if (q.kind === 'howmany') listen = SPEC_DUR['chr_n_' + q.target] + 150 + SPEC_DUR.chr_q_howmany;
      else if (q.kind === 'compare') listen = SPEC_DUR['chr_n_' + q.pair[0]] + 150 + SPEC_DUR.chr_s_bi + 150 +
        SPEC_DUR['chr_n_' + q.pair[1]] + 150 + SPEC_DUR.chr_s_duo;
      else if (q.kind === 'constraint') listen = SPEC_DUR.chr_s_bi + 150 + SPEC_DUR['chr_n_' + q.pair[0]] + 150 +
        SPEC_DUR.chr_s_dyou + 150 + SPEC_DUR['chr_n_' + q.pair[1]] + 150 + SPEC_DUR.chr_s_shd;
      else listen = SPEC_DUR.chr_lab_pm + 150 + SPEC_DUR.chr_s_de + 150 + SPEC_DUR['chr_n_' + q.target] + 150 +
        SPEC_DUR.chr_s_bi + 150 + SPEC_DUR.chr_lab_am + 150 + SPEC_DUR.chr_s_de + 150 + SPEC_DUR.chr_s_duo;
      lvModeled += listen + SPEC_DECIDE[q.kind] + (ch.unit === 2 ? SPEC_CONV : 0) + SPEC_TAP;
    }
    if (specOk && lvModeled < modeledMin) { modeledMin = lvModeled; modeledMinFlat = flat; }
    modeledBy[L1.dch] = Math.min(modeledBy[L1.dch] == null ? Infinity : modeledBy[L1.dch], lvModeled);
    if (!specOk) tableOk = false;
    /* 聚合素材：章型域在场（dch1 四族/dch2 三族/dch3 四族/dch4 八族） */
    const needKinds = L1.dch === 1 ? ['most', 'least', 'howmany', 'total']
      : L1.dch === 2 ? ['howmany', 'total', 'compare']
      : L1.dch === 3 ? ['twocompare', 'constraint', 'compare', 'howmany']
      : ['most', 'least', 'second', 'howmany', 'total', 'compare', 'constraint', 'twocompare'];
    for (const kk of needKinds) if (!kindSeen[kk]) missBad.push(flat + ':' + kk);
    if (flat >= SPEC_STATIC) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  n: L1.quizzes.length, modeled: lvModeled,
                  kinds: L1.quizzes.map(q => q.kind) };
    if (flat < SPEC_STATIC) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ③ 聚合独占票：章型域在场 / 生成关四型全现 / 每关恰 8 题 / modeled 地板 ---- */
  total++;
  const aggOk = tableOk && missBad.length === 0 && lenBad.length === 0 &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, missBad: missBad.slice(0, 5), lenBad: lenBad,
                  genDch: genDch };

  /* ---- ㉒ modeled 难度地板（精确钉 99854——T46 阶段3 listen 全 clip 口径）---- */
  total++;
  const modeledOk = modeledMin >= MODELED_MIN && isFinite(modeledMin);
  if (modeledOk) npass++;
  units.modeled = { ok: modeledOk, min: modeledMin, minFlat: modeledMinFlat, pin: MODELED_MIN,
                    byDch: modeledBy };

  /* ---- ④ tapMost 单元（flat0 most 3 候选图卡）---- */
  total++;
  startLevel(0);
  const q4 = window.CH.quiz;
  let expMax = 0;                                           // 真值独立复算：最多行类目
  for (let i = 1; i < q4.chart.cats.length; i++)
    if (q4.chart.values[i] > q4.chart.values[expMax]) expMax = i;
  const truthCat = q4.chart.cats[expMax];
  const initOk = q4 && q4.kind === 'most' &&
                 q4.chart.cats.every(c => SPEC_CATS.indexOf(c) >= 0) &&
                 q4.chart.values.every(v => v >= 10 && v <= 20) &&
                 new Set(q4.chart.values).size === q4.chart.values.length &&
                 q4.opts.length === q4.chart.cats.length &&
                 q4.opts.every(o => typeof o.anim === 'string' && q4.chart.cats.indexOf(o.anim) >= 0) &&
                 q4.opts[q4.answer].anim === truthCat &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await window.CH.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex((o, i) => i !== q4.answer);        // 错卡（图内非最多类目）
  const pW = window.CH.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await window.CH.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue.length === 1 &&   // 语义句 clip 单段链（T46 键段）
                window.__lastQueue[0] && window.__lastQueue[0].key === 'chr_again_most' &&
                window.__lastQueue[0].text === SPEC_AGAIN.most;
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             window.CH.quiz.miss === 1 && window.CH.currentLevel.miss === 1;
  await unlocked();
  await new Promise(w => setTimeout(w, 4200));   // 等出错链豁免窗（保守等待：T46 most 2688+300=2984 < 旧 estMs 窗 3660）——窗后二错照计 miss=2（lit 梯度可达）
  const wB = q4.opts.findIndex((o, i) => i !== q4.answer && i !== wA);   // 另一错卡（二错）
  const rB = await window.CH.tapOpt(wB);
  await unlocked();
  const litRow = chartEl.querySelector('.row.lit');               // 答案级线索 miss≥2 才亮
  const litOk = rB === 'wrong' && window.CH.quiz.miss === 2 &&
                !!litRow && litRow.dataset.cat === truthCat;      // 亮的是答案行（极值行）
  const rR = await window.CH.tapOpt(q4.answer);
  const chainR = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'chr_right' &&          // 确认链=right+答案类目名音（全 clip 无 keyless）
                 window.__lastQueue[1] === 'chr_n_' + truthCat;
  const qNext = window.CH.quiz;                   // 对账当前题
  replayQuiz(false);                              // 重听路径
  /* 开题链期望（SPEC §4 独立复列——与 speakQuiz 分派同构：全 clip 题型单键 /
     howmany=名音+TTS 尾 / compare=两名音+TTS 尾 / constraint·twocompare=全句单段） */
  const expOpenChain = q => {
    if (q.kind === 'most') return ['chr_q_most'];
    if (q.kind === 'least') return ['chr_q_least'];
    if (q.kind === 'second') return ['chr_q_second'];
    if (q.kind === 'total') return ['chr_q_total'];
    if (q.kind === 'howmany') return ['chr_n_' + q.target, 'chr_q_howmany'];
    if (q.kind === 'compare') return ['chr_n_' + q.pair[0], 'chr_s_bi', 'chr_n_' + q.pair[1], 'chr_s_duo'];
    if (q.kind === 'constraint') return ['chr_s_bi', 'chr_n_' + q.pair[0], 'chr_s_dyou', 'chr_n_' + q.pair[1], 'chr_s_shd'];
    return ['chr_lab_pm', 'chr_s_de', 'chr_n_' + q.target, 'chr_s_bi', 'chr_lab_am', 'chr_s_de', 'chr_s_duo'];
  };
  const chainEq = (a, e) => !a || a.length !== e.length ? false : e.every((x, i) =>
    typeof x === 'string' ? a[i] === x
      : !!(a[i] && a[i].key === null && a[i].text === x.text));
  const expQ = expOpenChain(qNext);
  const chainQ = chainEq(window.__lastQueue, expQ) &&
                 (expQ.some(x => typeof x !== 'string') ? keylessLast(window.__lastQueue) : true);
  const s2 = rR === 'right' && chainR && chainQ && window.CH.quiz.step === 1 && window.CH.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && litOk && s2;
  if (tapOk) npass++;
  units.tapMost = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1,
                    chain: chainA, lit: litOk, right: s2, chainR: chainR, chainReplay: chainQ };

  /* ---- ⑤ tapHowmany2 单元（flat8 ch2 恒 unit=2：角标+格数 pulse+误读干扰+数字确认） ---- */
  total++;
  startLevel(8);
  const qh = await seekKind('howmany');
  const ti_h = qh ? qh.chart.cats.indexOf(qh.target) : -1;
  const truthH = qh ? qh.chart.values[ti_h] : 0;
  const cellsH = qh ? truthH / 2 : 0;
  const axisEl = chartEl.querySelector('.axis-tag');            // 单位标注（轴角标铁证）
  const axisOk = !!axisEl && axisEl.textContent === '一格=2';
  const hShape = qh && qh.kind === 'howmany' && qh.chart.unit === 2 &&
                  ti_h >= 0 && truthH % 2 === 0 &&
                  qh.opts.length === 4 &&
                  numList(qh).indexOf(cellsH) >= 0 &&            // 干扰含按一格=1 误读值
                  qh.opts[qh.answer].num === truthH;
  const wC = qh.opts.findIndex((o, i) => i !== qh.answer);
  const rC = await window.CH.tapOpt(wC);
  const chainB = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] && window.__lastQueue[0].key === 'chr_again_unit2' &&   // T46 键段
                 window.__lastQueue[0].text === SPEC_AGAIN.unit2;
  const tRows = chartEl.querySelectorAll('.row[data-cat="' + qh.target + '"]');
  const pulsed = tRows.length === 1 &&
                 tRows[0].querySelectorAll('.unit.pulse').length === cellsH;   // 目标行逐**格** pulse（格数≠值——换算在帧层可证）
  const miss1 = window.CH.quiz.miss === 1;
  const rE = await window.CH.tapOpt(qh.answer);
  const chainN = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'chr_right' &&           // T46 阶段3：right+数字 clip（chr_n_<值>）
                 window.__lastQueue[1] === 'chr_n_' + truthH;
  const hOk = axisOk && hShape && rC === 'wrong' && chainB && pulsed && miss1 && rE === 'right' && chainN;
  if (hOk) npass++;
  units.tapHowmany2 = { ok: hOk, axis: axisOk, shape: hShape, chain: chainB, pulseCells: pulsed,
                        misIn: hShape ? numList(qh).indexOf(cellsH) >= 0 : false,
                        miss1: miss1, right: rE, chainNum: chainN };

  /* ---- ⑥ tapTotal 单元（flat0 遍历寻 total：错链+合计数字确认） ---- */
  total++;
  startLevel(0);
  const qt = await seekKind('total');
  const sumT = qt ? qt.chart.values.reduce((s, v) => s + v, 0) : 0;
  const tShape = qt && qt.kind === 'total' && qt.chart.unit === 1 &&
                 qt.opts.length === 4 && qt.opts[qt.answer].num === sumT;
  const wT = qt.opts.findIndex((o, i) => i !== qt.answer);
  const rT = await window.CH.tapOpt(wT);
  const chainT = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] && window.__lastQueue[0].key === 'chr_again_total' &&   // T46 键段
                 window.__lastQueue[0].text === SPEC_AGAIN.total;
  const allPulsed = Array.from(chartEl.querySelectorAll('.row'))
    .every(r => r.querySelectorAll('.unit.pulse').length > 0);     // 全行逐格（逐行加程序示范）
  const rT2 = await window.CH.tapOpt(qt.answer);
  const chainT2 = window.__lastQueue && window.__lastQueue.length === 3 &&
                  window.__lastQueue[0] === 'chr_right' &&
                  window.__lastQueue[1] === 'chr_s_yg' &&           // T46 阶段3：right+一共+数字 clip
                  window.__lastQueue[2] === 'chr_n_' + sumT;
  const tOk = tShape && rT === 'wrong' && chainT && allPulsed && rT2 === 'right' && chainT2;
  if (tOk) npass++;
  units.tapTotal = { ok: tOk, shape: tShape, chain: chainT, rowsPulse: allPulsed,
                     right: rT2, chainSum: chainT2 };

  /* ---- ⑥b tapHowmany1 mini 单元（T46 阶段2：chr_again_howmany 键段——ch1 内 howmany 恒 unit=1，
     单元⑤ ⑥ 只覆盖 unit2/total 键；错链豁免窗=AGAIN_DUR 实长口径最短键 2184+300） ---- */
  total++;
  startLevel(0);
  const qh1 = await seekKind('howmany');
  let chainH1 = false, hmInfo = { found: false };
  if (qh1 && qh1.chart.unit === 1) {
    hmInfo.found = true;
    const wH = qh1.opts.findIndex((o, i) => i !== qh1.answer);
    const rH = await window.CH.tapOpt(wH);
    chainH1 = rH === 'wrong' && window.__lastQueue && window.__lastQueue.length === 1 &&
              window.__lastQueue[0] && window.__lastQueue[0].key === 'chr_again_howmany' &&
              window.__lastQueue[0].text === SPEC_AGAIN.howmany;
  }
  if (chainH1) npass++;
  units.tapHowmany1 = { ok: chainH1, found: hmInfo.found };

  /* ---- ⑦ tapSecond 单元（flat24 ch4 寻 second：排序真值+二错 lit 第二多行） ---- */
  total++;
  startLevel(24);
  const qs = await seekKind('second');
  const orderS = qs ? qs.chart.cats.map((c, i) => [qs.chart.values[i], c]).sort((a, b) => a[0] - b[0]) : null;
  const truthS = orderS ? orderS[orderS.length - 2][1] : null;      // 升序倒数第 2 独立复算
  const sShape = qs && qs.kind === 'second' && qs.opts[qs.answer].anim === truthS;
  const wrongS = qs.opts.findIndex((o, i) => i !== qs.answer);
  const rS = await window.CH.tapOpt(wrongS);
  const chainS = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] && window.__lastQueue[0].key === 'chr_again_second' &&   // T46 键段
                 window.__lastQueue[0].text === SPEC_AGAIN.second;
  await unlocked();
  await new Promise(w => setTimeout(w, 5100));    // 等豁免窗（保守等待：T46 second 3264+300=3564 < 旧 estMs 窗 4695）
  const wrongS2 = qs.opts.findIndex((o, i) => i !== qs.answer && o.anim !== qs.opts[wrongS].anim);
  const rS2 = await window.CH.tapOpt(wrongS2);
  await unlocked();
  const litS = chartEl.querySelector('.row.lit');
  const litOkS = rS2 === 'wrong' && window.CH.quiz.miss === 2 &&
                 !!litS && litS.dataset.cat === truthS;             // 亮的是第二多行（非最大行）
  const rS3 = await window.CH.tapOpt(qs.answer);
  const chainS2 = window.__lastQueue && window.__lastQueue.length === 2 &&
                  window.__lastQueue[0] === 'chr_right' &&
                  window.__lastQueue[1] === 'chr_n_' + truthS;
  const sOkS = sShape && rS === 'wrong' && chainS && litOkS && rS3 === 'right' && chainS2;
  if (sOkS) npass++;
  units.tapSecond = { ok: sOkS, shape: sShape, chain: chainS, litSecond: litOkS,
                      right: rS3, chainName: chainS2 };

  /* ---- ⑧ tapCompare 单元（flat16 ch3 寻 compare·unit=1：错链+差值确认） ---- */
  total++;
  startLevel(16);
  const qc = await seekKind('compare');
  const ai = qc && qc.chart.cats.indexOf(qc.pair[0]);
  const bi = qc && qc.chart.cats.indexOf(qc.pair[1]);
  const cDiff = qc ? qc.chart.values[ai] - qc.chart.values[bi] : 0;
  const cShape = qc && qc.kind === 'compare' && qc.chart.unit === 1 && ai >= 0 && bi >= 0 &&
                 ai !== bi && qc.chart.values[ai] > qc.chart.values[bi] &&
                 cDiff >= 1 && cDiff <= 10 &&
                 qc.opts.length === 4 && qc.opts[qc.answer].num === cDiff;
  const wD = qc.opts.findIndex((o, i) => i !== qc.answer);
  const rD = await window.CH.tapOpt(wD);
  const chainC = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] && window.__lastQueue[0].key === 'chr_again_compare' &&   // T46 键段
                 window.__lastQueue[0].text === SPEC_AGAIN.compare;
  const rF = await window.CH.tapOpt(qc.answer);
  const chainD = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'chr_right' &&
                 window.__lastQueue[1] === 'chr_s_do' &&            // T46 阶段3：right+多+差值 clip
                 window.__lastQueue[2] === 'chr_n_' + cDiff;
  const cOk = cShape && rD === 'wrong' && chainC && rF === 'right' && chainD;
  if (cOk) npass++;
  units.tapCompare = { ok: cOk, shape: cShape, chain: chainC, right: rF, chainDiff: chainD };

  /* ---- ⑨ tapConstraint 单元（flat16 寻 constraint：两约束行 pulse+夹层确认） ---- */
  total++;
  startLevel(16);
  const qx = await seekKind('constraint');
  const lowI = qx ? qx.chart.cats.indexOf(qx.pair[0]) : -1;
  const highI = qx ? qx.chart.cats.indexOf(qx.pair[1]) : -1;
  const between = qx ? qx.chart.cats.filter((c, i) =>
    qx.chart.values[i] > qx.chart.values[lowI] && qx.chart.values[i] < qx.chart.values[highI]) : [];
  const xShape = qx && qx.kind === 'constraint' && between.length === 1 &&
                 qx.opts[qx.answer].anim === between[0];
  const wX = qx.opts.findIndex((o, i) => i !== qx.answer);
  const rX = await window.CH.tapOpt(wX);
  const chainX = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] && window.__lastQueue[0].key === 'chr_again_constraint' &&   // T46 键段
                 window.__lastQueue[0].text === SPEC_AGAIN.constraint;
  const rowLow = chartEl.querySelector('.row[data-cat="' + qx.pair[0] + '"]');
  const rowHigh = chartEl.querySelector('.row[data-cat="' + qx.pair[1] + '"]');
  const rowsPulsed = !!rowLow && !!rowHigh &&
                     rowLow.classList.contains('pulse') && rowHigh.classList.contains('pulse');
  const litNone = !chartEl.querySelector('.row.lit');              // 约束行提示不泄答案
  const rX2 = await window.CH.tapOpt(qx.answer);
  const chainX2 = window.__lastQueue && window.__lastQueue.length === 2 &&
                  window.__lastQueue[0] === 'chr_right' &&
                  window.__lastQueue[1] === 'chr_n_' + between[0];
  const xOk = xShape && rX === 'wrong' && chainX && rowsPulsed && litNone && rX2 === 'right' && chainX2;
  if (xOk) npass++;
  units.tapConstraint = { ok: xOk, shape: xShape, chain: chainX, rowsPulse: rowsPulsed,
                          noLit: litNone, right: rX2, chainName: chainX2 };

  /* ---- ⑩ tapTwocompare 单元（flat16 寻 twocompare：双图+两图目标行 pulse+差值确认） ---- */
  total++;
  startLevel(16);
  const qw = await seekKind('twocompare');
  const tiW = qw ? qw.chart.cats.indexOf(qw.target) : -1;
  const wDiff = qw && qw.chart2 ? qw.chart2.values[tiW] - qw.chart.values[tiW] : 0;
  const subs = chartEl.querySelectorAll('.sub-chart');
  const twoFrame = subs.length === 2 &&
                   subs[0].querySelector('.sub-tag').textContent === '上午' &&
                   subs[1].querySelector('.sub-tag').textContent === '下午';
  const wShape = qw && qw.kind === 'twocompare' && tiW >= 0 &&
                 qw.chart2.values[tiW] > qw.chart.values[tiW] &&
                 wDiff >= 2 && wDiff <= 8 && qw.opts[qw.answer].num === wDiff;
  const wW = qw.opts.findIndex((o, i) => i !== qw.answer);
  const rW2 = await window.CH.tapOpt(wW);
  const chainW = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] && window.__lastQueue[0].key === 'chr_again_twocompare' &&   // T46 键段
                 window.__lastQueue[0].text === SPEC_AGAIN.twocompare;
  const tRowsW = chartEl.querySelectorAll('.row[data-cat="' + qw.target + '"]');
  const bothPulsed = tRowsW.length === 2 &&                   // 两图目标行都逐格 pulse
    Array.from(tRowsW).every(r => r.querySelectorAll('.unit.pulse').length > 0);
  const rW3 = await window.CH.tapOpt(qw.answer);
  const chainW2 = window.__lastQueue && window.__lastQueue.length === 3 &&
                  window.__lastQueue[0] === 'chr_right' &&
                  window.__lastQueue[1] === 'chr_s_do' &&            // T46 阶段3：right+多+差值 clip
                  window.__lastQueue[2] === 'chr_n_' + wDiff;
  const wOk = twoFrame && wShape && rW2 === 'wrong' && chainW && bothPulsed && rW3 === 'right' && chainW2;
  if (wOk) npass++;
  units.tapTwocompare = { ok: wOk, twoChart: twoFrame, shape: wShape, chain: chainW,
                          bothPulse: bothPulsed, right: rW3, chainDiff: chainW2 };

  /* ---- ⑪ 帧内容断言（契约 M：渲染即引擎——行/格 DOM 与 quiz.chart 对账含 unit 换算） ---- */
  total++;
  const frameCheck = q => {
    /* twocompare 双图行集分别对账 chart/chart2；单图题全行对账 chart。
       格数=值/unit（u2 换算对账）；icon g 数=值（u2 成对格每格 2 icon——icon 总数恒=值） */
    const rowSets = q.kind === 'twocompare'
      ? [Array.from(chartEl.querySelectorAll('.sub-chart[data-lab="0"] .row')),
         Array.from(chartEl.querySelectorAll('.sub-chart[data-lab="1"] .row'))]
      : [Array.from(chartEl.querySelectorAll('.row'))];
    const charts = q.kind === 'twocompare' ? [q.chart, q.chart2] : [q.chart];
    const chartOk = rowSets.every((rows, ci) => rows.length === charts[ci].cats.length &&
      rows.every((r, i) => r.dataset.cat === charts[ci].cats[i] &&
        Number(r.dataset.v) === charts[ci].values[i] &&
        r.querySelectorAll('.unit').length === charts[ci].values[i] / charts[ci].unit &&
        r.querySelectorAll('.unit svg > g[data-cat]').length === charts[ci].values[i] &&
        r.querySelector('.unit svg > g[data-cat]').dataset.cat === charts[ci].cats[i]));
    const axisOk = q.chart.unit === 2
      ? !!(chartEl.querySelector('.axis-tag') && chartEl.querySelector('.axis-tag').textContent === '一格=2')
      : !chartEl.querySelector('.axis-tag');                        // u1 无角标
    const cards = Array.from(boardEl.querySelectorAll('.card'));
    const numeric = !isCatKind(q.kind);
    const domOk = cards.length === q.opts.length &&
      cards.every((c, i) => numeric
        ? Number(c.dataset.num) === q.opts[i].num && c.querySelectorAll('svg').length === 0
        : c.dataset.anim === q.opts[i].anim && c.querySelectorAll('svg').length === 1);
    const txtOk = qbarEl.querySelector('.q-text').textContent === q.text;
    return chartOk && axisOk && domOk && txtOk;
  };
  startLevel(0);                                        // ch1 most 3 类目 3 卡（u1）
  const fA = frameCheck(window.CH.quiz) && boardEl.querySelectorAll('.card').length === 3;
  startLevel(8);
  const qf2 = window.CH.quiz;                           // ch2 恒 u2（成对格）
  const fB = frameCheck(qf2) && qf2.chart.unit === 2 &&
             chartEl.querySelectorAll('.unit.pair').length > 0;
  startLevel(8);
  const qfh = await seekKind('howmany');                // u2 数字卡帧（data-num 对账）
  const fC = !!qfh && frameCheck(qfh) && window.CH.quiz.kind === 'howmany';
  startLevel(16);
  const qfw = await seekKind('twocompare');             // 两图帧：两 sub-chart 行值与两 chart 对账
  const subRows = lab => chartEl.querySelectorAll('.sub-chart[data-lab="' + lab + '"] .row');
  const rowsAM = Array.from(subRows(0)), rowsPM = Array.from(subRows(1));
  const fD = !!qfw && frameCheck(qfw) && rowsAM.length === 2 && rowsPM.length === 2 &&
    rowsAM.every((r, i) => Number(r.dataset.v) === qfw.chart.values[i]) &&
    rowsPM.every((r, i) => Number(r.dataset.v) === qfw.chart2.values[i]);
  startLevel(24);
  const qfs = await seekKind('second');                 // ch4 4 类目排序帧
  const fE = !!qfs && frameCheck(qfs) && chartEl.querySelectorAll('.row').length === 4;
  const frameOk = fA && fB && fC && fD && fE;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, ch1: fA, u2: fB, u2num: fC, two: fD, ch4: fE };

  /* ---- ⑫ 教学链：tutorialWatch 真实走完 → __chDemoR='right'（演示点最多行答案卡） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__chDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'most' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__chDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑬ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await window.CH.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await window.CH.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && window.CH.quiz.step === 0 && window.CH.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑭ UI 冒烟 A：flat0 autoSolve 通关（8 题 taps=8，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await window.CH.autoSolve();
  const lv0 = window.CH.currentLevel;
  const smokeA = a0.done && a0.taps === 8 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑭ UI 冒烟 B：flat8（ch2 一格代表2）autoSolve 通关 ---- */
  total++;
  startLevel(8);
  const a8 = await window.CH.autoSolve();
  const smokeB = a8.done && a8.taps === 8 && window.CH.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat8 = { ok: smokeB, taps: a8.taps };

  /* ---- ⑭ UI 冒烟 C：flat24（ch4 八族）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(24);
  await unlocked();
  const q24 = window.CH.quiz;
  const wrongC = q24.opts.findIndex((o, i) => i !== q24.answer);
  const r24 = await window.CH.tapOpt(wrongC);
  const a24 = await window.CH.autoSolve();
  const lv24 = window.CH.currentLevel;
  const smokeC = r24 === 'wrong' && a24.done && a24.taps === 8 && lv24.done && lv24.won &&
                 lv24.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat24 = { ok: smokeC, r24: r24, taps: a24.taps, miss: lv24.miss, stars: engStars(cur) };

  /* ---- ⑮ 布局 simView：横视口 1280×800 + body.port 类通道（竖屏规则真通道）×6 面 ---- */
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
  function measure(vp, usePort) {
    const g = $id('game');
    g.style.width = vp[0] + 'px';
    g.style.height = vp[1] + 'px';
    if (usePort) document.body.classList.add('port');           // 竖屏类通道（与 @media 逐行等值由 build 断言）
    const q = window.CH.quiz;
    const need = q ? q.opts.length : 4;
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const rows = Array.prototype.map.call(chartEl.querySelectorAll('.row'), r => r.offsetHeight);
    const unitEl = chartEl.querySelector('.unit');
    const unitH = unitEl ? unitEl.getBoundingClientRect().height : 0;
    const hitOk = cards.length === need && cards.every(b => b.w >= 96 && b.h >= 96);
    const chartOk = rows.length >= 2 && rows.every(rh => rh >= 48) && unitH >= 22;
    const axisIn = !q || q.chart.unit !== 2 || !!(function () {   // u2 角标须在图表视口内
      const aR = chartEl.querySelector('.axis-tag').getBoundingClientRect();
      const cR = chartEl.getBoundingClientRect();
      return aR.left >= cR.left - 2 && aR.right <= cR.right + 2 && aR.top >= cR.top - 2;
    })();
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(chartEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    if (usePort) document.body.classList.remove('port');
    return { vp: vp[0] + 'x' + vp[1] + (usePort ? '+port' : ''), kind: q ? q.kind : '-',
             cards: cards.length, rowH: Math.min.apply(null, rows), unitH: Math.round(unitH),
             hitOk: hitOk, chartOk: chartOk, axisIn: axisIn, contrast: cB && cS, ox: ox,
             pass: hitOk && chartOk && axisIn && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  const seekThen = async (flat, kind) => {
    startLevel(flat);
    const q = kind ? await seekKind(kind) : window.CH.quiz;
    return !!q;
  };
  const faces = [[0, null, 'ch1'], [8, null, 'ch2u2'], [16, 'twocompare', 'two'],
                 [16, 'constraint', 'cons'], [24, 'second', 'second'], [32, null, 'gen']];
  for (const f of faces) {
    if (!(await seekThen(f[0], f[1]))) continue;
    sims.push(measure([1280, 800], false));
    sims.push(measure([800, 1180], true));                     // 竖屏规则经 body.port 类通道量测
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.length === faces.length * 2 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑯ clips：chr_ 109 条（r17 25 + T46 阶段2 八句 + 数字 74 + 碎片/标签 s_*·lab_*）
     + core 3 条 = 112 全注入 + duration 辨别器（±60ms，SPEC_DUR 含数字键 1..74） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const chrKeys = ['chr_tut_watch', 'chr_tut_turn', 'chr_hint', 'chr_right', 'chr_wrong',
                   'chr_q_most', 'chr_q_least', 'chr_q_second', 'chr_q_total',
                   'chr_q_howmany', 'chr_q_compare']
                   .concat(SPEC_CATS.map(w => 'chr_n_' + w))
                   .concat(Object.keys(SPEC_AGAIN).map(k => 'chr_again_' + k))   // T46 八句（most/second/... 表驱动）
                   .concat(Object.keys(SPEC_NUM).map(n => 'chr_n_' + n))        // T46 阶段3 数字键 1..74
                   .concat(['chr_s_bi', 'chr_s_dyou', 'chr_s_shd', 'chr_s_de', 'chr_s_duo',
                            'chr_s_yg', 'chr_s_do', 'chr_s_dduo', 'chr_lab_pm', 'chr_lab_am']);
  const needAll = chrKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 112 &&
    needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
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
  units.clips = { ok: clipsOk, n: keys.length, durs: durs, durKeys: durKeys };

  /* ---- ⑰ 契约 L 专项：NUMCN 封闭域 1-74 全量输出断言（禁 undefined；独立位/复合位口径） ---- */
  total++;
  let numOk = true;
  for (let v = 1; v <= 74; v++) {
    if (typeof NUMCN[v] !== 'string' || !NUMCN[v].length) { numOk = false; break; }
  }
  numOk = numOk && NUMCN[75] === undefined &&                          // 上界封闭
          NUMCN[2] === '两' && NUMCN[10] === '十' && NUMCN[12] === '十二' &&
          NUMCN[20] === '二十' && NUMCN[22] === '二十二' && NUMCN[33] === '三十三' &&
          NUMCN[45] === '四十五' && NUMCN[57] === '五十七' && NUMCN[74] === '七十四';
  if (numOk) npass++;
  units.numcn = { ok: numOk, spots: [NUMCN[2], NUMCN[22], NUMCN[74]], upperOpen: NUMCN[75] === undefined };

  /* ---- ⑱ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  total++;
  const LA = genLevel(16);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;   // 永不 0 星
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- ⑲ 契约源码断言（读第 3 script 块=游戏块 data+engine+main——verify 独立第 4 块不自匹配） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const nLim = src.split('nextHint(lim - 1)').length - 1;
  const srcA = nLim === 2 &&                                   // A（r17 双 lim-1）：winFlow+启动两处实算
               src.indexOf('Math.max(0, lim - 1)') >= 0 &&      // 日末停留今日末关
               src.indexOf('nextHint(null)') < 0;               // 旧 null 实参禁再现（含注释）
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.chartread && sv.chartread.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1) % 4') < 0;   // 禁章序右移
  const srcI = src.indexOf('wrongChainUntil = Date.now() + (AGAIN_DUR[ak] + 300)') >= 0 &&   // I：T46 实长口径动态窗
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：动态豁免窗+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcM = src.indexOf("localStorage.getItem('kidsgame_chartread')") >= 0 &&   // M：键基迁移 IIFE
               src.indexOf("lv[(c - 1) + '-5']") >= 0 &&                            // 矛盾态检测
               src.indexOf('+m[2] > 7') >= 0;                                       // 脏键守卫新键基 0-7
  const srcPort = src.indexOf('function applyPort()') >= 0 &&
                  src.indexOf("classList.toggle('port'") >= 0;   // 竖屏双通道 JS
  const srcOk = srcA && srcB && srcE && srcF && srcI && srcJ && srcK && srcM && srcPort;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK,
                     M: srcM, port: srcPort, nLim: nLim };

  /* ---- ⑳ 章末/日末预告独立硬编码对账 + 生成关 nextHint 实算对账（边界=f+1≥32 进生成） ---- */
  total++;
  /* 章末/日末预告口径（家族 F 定式·timecalc 同款）：ci=⌊f/8⌋<4 → CHAPTERS[ci+1].hint
     （章末 flat7/15/23/31 与日末停章中段 flat26 同走下一章预告——§0.4 防跳章）；
     生成关段（ci≥4，含 flat32+ 与日末 lim-1≥32）实算 GEN[genLevel(f+1).dch-1] 禁取模 */
  const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&
                 CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                 CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                 CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                 GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                 GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                 nextHint(7) === SPEC_CHAPTER_HINTS[1] &&        // ch1 打完（flat7）→ CHAPTERS[1] 预告 ch2
                 nextHint(15) === SPEC_CHAPTER_HINTS[2] &&
                 nextHint(23) === SPEC_CHAPTER_HINTS[3] &&
                 nextHint(26) === SPEC_CHAPTER_HINTS[4] &&       // 日末停章中段：同走下一章预告（家族）
                 nextHint(31) === SPEC_CHAPTER_HINTS[4];         // ch4 打完 → CHAPTERS[4] 生成段预告
  const genOk = [36, 41, 46].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ㉑ 语音窗动态断言（T46 阶段3 全 clip 口径；clip 实长 SPEC §4 r17+实测）
     确认链（类目族最长）=chr_right 2448+150+名音 max 1440+300=4338；
     确认链（数值族最长 total）=2448+150+chr_s_yg 1320+150+chr_n max(33-74) 1848+300=6216
     → 判对窗 1600+4100=5700 → 1600+4700=6300（数值段 clip 化后上调）；
     howmany=4578 / compare·twocompare=5616；
     错链豁免窗=语义句 clip 实长+300（T46 阶段2 实长口径，最长 unit2 3384+300=3684） ---- */
  total++;
  const maxName = SPEC_DUR.chr_n_bird;                    // 名音 max 1440（SPEC §4）
  const maxNum = (lo, hi) => { let m = 0; for (let n = lo; n <= hi; n++) m = Math.max(m, SPEC_NUM[n]); return m; };
  const cfHm = SPEC_DUR.chr_right + 150 + maxNum(10, 20) + 300;                    // howmany 确认链（值域 10-20）
  const cfTt = SPEC_DUR.chr_right + 150 + SPEC_DUR.chr_s_yg + 150 + maxNum(33, 74) + 300;   // total（和域 33-74）
  const cfCp = SPEC_DUR.chr_right + 150 + SPEC_DUR.chr_s_do + 150 + maxNum(1, 10) + 300;    // compare/twocompare（差域 1-10）
  const winOk = (1600 + 4700) >= SPEC_DUR.chr_right + 150 + maxName + 300 &&   // 判对窗 6300 ≥ 类目族 4338
                (1600 + 4700) >= cfHm &&                                       // howmany ≥ 4578
                (1600 + 4700) >= cfTt &&                                       // total ≥ 6216（最长）
                (1600 + 4700) >= cfCp &&                                       // compare ≥ 5616
                '一共七十四只'.length === 6 && NUMCN[74] + '' === '七十四' &&   // 尾段最长句封闭域钉
                3300 >= SPEC_DUR.chr_tut_watch + 300 &&                         // 教学 watch 演示延 ≥ 3276
                2200 >= SPEC_DUR.chr_q_most + 300 &&                            // 教学题面句窗 ≥ 2124
                2200 >= SPEC_DUR.chr_tut_turn + 300 &&                          // turn 后读题延 ≥ 2172
                (2620 + 400) >= SPEC_DUR.chr_right + 300 &&                     // winFlow ≥ 2748
                (SPEC_DUR.chr_again_most + 300) === 2988 &&                     // most/least 链窗=2688+300（T46）
                (SPEC_DUR.chr_again_howmany + 300) === 2484 &&                  // howmany 链窗=2184+300
                (SPEC_DUR.chr_again_compare + 300) === 3516 &&                  // compare 链窗=3216+300
                (SPEC_DUR.chr_again_second + 300) === 3564 &&                   // second 链窗=3264+300
                (SPEC_DUR.chr_again_unit2 + 300) === 3684 &&                    // unit2 链窗=3384+300（最长）
                (SPEC_DUR.chr_again_twocompare + 300) === 3468 &&               // twocompare 链窗=3168+300
                (SPEC_DUR.chr_again_constraint + 300) === 2940 &&               // constraint 链窗=2640+300
                (SPEC_DUR.chr_again_total + 300) === 3420;                      // total 链窗=3120+300
  const estData = { confirmWin: 6300, confirmNeedCat: SPEC_DUR.chr_right + 150 + maxName + 300,
                    confirmNeedHowmany: cfHm, confirmNeedTotal: cfTt, confirmNeedCompare: cfCp,
                    watchT: 3300, tutQWin: 2200, turnDelay: 2200, rightFlow: 3020,
                    wrongChainMax: SPEC_DUR.chr_again_unit2 + 300 };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ㉓ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'chartread', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes,
                modeled: { min: modeledMin, minFlat: modeledMinFlat, pin: MODELED_MIN, byDch: modeledBy } };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__chVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；
     voice.queue 记录拼播链（__lastQueue）供反馈链/确认链绑定断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
