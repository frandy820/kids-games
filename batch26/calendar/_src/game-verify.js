/* ================= ?verify=1 自检（仅 verify 分支加载执行；SPEC-R37 口径）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch=(ch-1)%4+1；生成关随机章）
     / 引擎直驱（逐题点应选词卡→right/末题 done→全关 3 星）
   ② 封闭集独立对账：SPEC_DAYS7/SPEC_MONTHS12/SPEC_KINDS10/DNUMS/CB 行表（verify 内从
     SPEC-R37 §R2/§R3 文字独立重列，不引用引擎常量）× 40 关全题：kind∈10 型 /
     base·answer·opts ∈ 对应封闭集 / answer=独立算环步进（±1/±2）或月末行表 /
     4 卡互异 / 恰 1 right / 近对在场（环族=答案环距 1 ≥1；cbound=不存在日期干扰在场）/
     dateq 锚不入干扰 / dch1 全 day / dch2 全 month 族 / dch3 新谱 / dch4 dateq+cbound 各恰 1
   ③ ch3 跨界专项（flat10-14 五关）：每关接龙跨界恰 1（base=星期日/十二月，答案=环首）
     + 反向多步跨界恰 2（day_m2 base∈{星期一,星期二} / month_m2 base∈{一月,二月}）
   ④ 点词卡单元（flat0 真实 UI 状态机）：非法下标=false；错=wrong+miss+1+1000ms
     防重入窗（fire-and-forget 首击+窗内二击被拦）+ 方向反馈按相对位置分向
     （点 base→self 专属句 / 点环距 ≥2→fwd.after）；对=right 推进；换题 miss 清零
   ④b flat≥3 错反馈走语音轨（段链题型=cal_fb_/cal_self_ 键；新题型=TTS 数数教育句）
     +10s 节流
   ⑤ 教学链：tutorialWatch() 真实走完（stub 存档）→ __caDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；flat0 题0 恒 day/星期三（锚点）
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 词卡排容器 bump 微动效（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=5，恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3 新谱）先点 1 次错卡再 autoSolve（miss=1 → 2 星）
   ⑨ 章分布聚合：dch1 五关 base 并集=全 7 天 / dch2 五关**全题** base 并集=全 12 月 /
     dch3 每关谱（rev 2+反向跨界多步 2+接龙跨界 1）/ dch4 dateq+cbound 各恰 1+kinds ≥4 /
     生成关四型全现
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（ch1 / ch4 混合）：词卡 ≥96×96（主答案
     §0.9）、题面卡 ≥64、序列条格数=当前题族长（7/12）且格 ≥24×24、overflowX ≤0、
     卡与题面描边色对底色对比度 ≥3:1
   ⑪ clips：cal_ 6 条 + T46 38 条 + §R6-bis 37 条 + core 3 条全注入=84（R37-bis 键集）
   ⑫ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑬ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1（家族 F）
   ⑭ verify 提速断言：SPEED=0.12
   ⑮ 方向反馈分向专项：±1 四型 15 例旧表（base 中心分区逐例对拍）+ jump/dateq 数数
     教育三路新例 + cbound 三例（d1 专属句/d2,d3 fwd.after）——全句面字面真；
     + UI 层反向族题实测一例（__lastVoiceText）
   ⑯ TTS 拼句窗（b25 定版）：estMs=345×汉字数+600（标点不计）数值直测；CONFIRM_PAD ≥300；
     最长确认句（十型封闭表全枚举独立算）estMs 记录在案（静态窗断言由 build.py 把守）
   ⑰ 新题型专项（SPEC-R37）：jump 环步 ±2 独立复算 / dateq 日期-星期双表对账（dn→dn+2
     词形+answer=锚+2 星期）/ cbound 11 行四词形静态全对账 + UI 层 cbound 错点实测
     （d1=不存在日期专属句 / d2=fwd.after 在册键）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-R37 §R2/§R3 文字独立重列（禁抄页面 DAYS/MONTHS/CB_END/DNUMS） */
  const SPEC_DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
  const SPEC_MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月',
                       '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const SPEC_KINDS = ['day', 'month', 'day_rev', 'month_rev',
                      'day_2', 'day_m2', 'month_2', 'month_m2', 'dateq', 'cbound'];
  const SPEC_DNUMS = ['一号', '二号', '三号', '四号', '五号', '六号', '七号', '八号'];
  const SPEC_TNUMS = ['三号', '四号', '五号', '六号', '七号', '八号', '九号', '十号'];
  /* 月末边界行表（11 源月；二月不做源月）：src → 月末天数 */
  const SPEC_CB = [['一月', 31], ['三月', 31], ['四月', 30], ['五月', 31], ['六月', 30],
                   ['七月', 31], ['八月', 31], ['九月', 30], ['十月', 31], ['十一月', 30], ['十二月', 31]];
  const SPEC_NUM = { 30: '三十', 31: '三十一', 32: '三十二' };
  const cbD1w = (m, e) => m + SPEC_NUM[e === 31 ? 32 : 31] + '号';   // 不存在日期词形
  const cbAns = m => SPEC_MONTHS[(SPEC_MONTHS.indexOf(m) + 1) % 12] + '一号';
  const fam = k => (k === 'day' || k === 'day_rev' || k === 'day_2' ||
                    k === 'day_m2' || k === 'dateq') ? SPEC_DAYS : SPEC_MONTHS;
  const rev = k => k === 'day_rev' || k === 'month_rev' || k === 'day_m2' || k === 'month_m2';
  /* 独立算步长：±1 旧型 / ±2 多步跳与 dateq */
  const stepOfSpec = k => (k === 'day' || k === 'month') ? 1 :
                         (k === 'day_rev' || k === 'month_rev') ? -1 :
                         (k === 'day_2' || k === 'month_2' || k === 'dateq') ? 2 : -2;
  /* 独立算：base 环步进 d 的目标词（跨界即模回环首） */
  const succ = (f, b) => f[(f.indexOf(b) + 1) % f.length];
  const pred = (f, b) => f[(f.indexOf(b) - 1 + f.length) % f.length];
  const stepN = (f, b, d) => f[(f.indexOf(b) + d + f.length) % f.length];
  const ringDist = (f, from, to) => (f.indexOf(to) - f.indexOf(from) + f.length) % f.length;
  /* 近对在场（独立推导，环族）：答案环距 1 的相邻词 ≥1 在干扰 */
  const nearInOpts = q => q.opts.some(o => !o.right && (ringDist(fam(q.kind), q.answer, o.word) === 1 || ringDist(fam(q.kind), o.word, q.answer) === 1));

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dch1Bases = {}, dch2Bases = {}, dch3Agg = [], dch4Agg = [], genDch = {}, genDch4New = { dateq: 0, cbound: 0 };
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
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（照 shaperoof）
    /* 引擎直驱：逐题点应选词卡 → right / 末题 done；全关零错=3 星 */
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
    /* 章分布聚合（⑨ 数据源；SPEC-R37 新谱口径） */
    if (L1.dch === 1 && flat < 5) L1.quizzes.forEach(q => { dch1Bases[q.base] = 1; });
    if (L1.dch === 2 && flat >= 5 && flat < 10) L1.quizzes.forEach(q => { dch2Bases[q.base] = 1; });   // 全题（单步+多步）
    if (L1.dch === 3) dch3Agg.push({
      cross: L1.quizzes.filter(q => (q.kind === 'day' || q.kind === 'month') && q.base === (q.kind === 'day' ? '星期日' : '十二月')).length,
      revN: L1.quizzes.filter(q => q.kind === 'day_rev' || q.kind === 'month_rev').length,
      m2c: L1.quizzes.filter(q => (q.kind === 'day_m2' && (q.base === '星期一' || q.base === '星期二')) ||
                                  (q.kind === 'month_m2' && (q.base === '一月' || q.base === '二月'))).length,
      dayM2: L1.quizzes.filter(q => q.kind === 'day_m2').length,
      monthM2: L1.quizzes.filter(q => q.kind === 'month_m2').length });
    if (L1.dch === 4) dch4Agg.push({
      dateq: L1.quizzes.filter(q => q.kind === 'dateq').length,
      cbound: L1.quizzes.filter(q => q.kind === 'cbound').length,
      uniq: SPEC_KINDS.filter(kk => L1.quizzes.some(q => q.kind === kk)).length });
    if (flat >= STATIC_LEVELS) {
      genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
      if (L1.dch === 4) L1.quizzes.forEach(q => { if (q.kind === 'dateq' || q.kind === 'cbound') genDch4New[q.kind]++; });
    }
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   kinds: L1.quizzes.map(q => q.kind),
                   bases: L1.quizzes.map(q => q.kind + ':' + q.base) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const d1n = Object.keys(dch1Bases).length, d2n = Object.keys(dch2Bases).length;
  const distOk = d1n === 7 && d2n === 12 &&                              // 两族五关全题并集全覆盖
                 dch3Agg.every(a => a.cross === 1 && a.revN === 2 && a.m2c === 2 && a.dayM2 >= 1 && a.monthM2 >= 1) &&  // ch3 新谱
                 dch4Agg.every(a => a.dateq === 1 && a.cbound === 1 && a.uniq >= 4) &&  // ch4 新谱
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0 &&   // 生成关四型全现
                 genDch4New.dateq > 0 && genDch4New.cbound > 0;                       // 生成 dch4 含新题型
  if (distOk) npass++;
  units.dist = { ok: distOk, dch1Cover: d1n, dch2Cover: d2n, dch3: dch3Agg, dch4: dch4Agg, genDch: genDch, genDch4New: genDch4New };

  /* ---- ② 封闭集独立对账（SPEC 表独立重列 × 40 关全题；SPEC-R37 十型） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const f = fam(q.kind);
      if (SPEC_KINDS.indexOf(q.kind) < 0) { badCase = 'kind ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.kind === 'cbound') {                                   // 跨月界行表对账（独立表）
        const row = SPEC_CB.find(r => r[0] === q.base);
        if (!row) { badCase = 'cbBase ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch !== 4) { badCase = 'cbDch ' + flat + '/' + k; tableOk = false; break outer; }   // 只允许 dch4 谱
        const ni = SPEC_MONTHS.indexOf(q.base);
        const legal = [cbAns(q.base), cbD1w(q.base, row[1]),
                       SPEC_MONTHS[(ni + 1) % 12] + '二号', SPEC_MONTHS[(ni + 2) % 12] + '一号'];
        const words0 = q.opts.map(o => o.word);
        if (q.answer !== cbAns(q.base)) { badCase = 'cbAns ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.opts.length !== 4 || words0.filter((v, i, a) => a.indexOf(v) === i).length !== 4) { badCase = 'cbShape ' + flat + '/' + k; tableOk = false; break outer; }
        if (!words0.every(w => legal.indexOf(w) >= 0)) { badCase = 'cbLib ' + flat + '/' + k; tableOk = false; break outer; }
        if (words0.filter(w => w === q.answer).length !== 1 || !q.opts.every(o => o.right === (o.word === q.answer))) { badCase = 'cbRight ' + flat + '/' + k; tableOk = false; break outer; }
        if (words0.indexOf(cbD1w(q.base, row[1])) < 0) { badCase = 'cbD1Missing ' + flat + '/' + k; tableOk = false; break outer; }   // 不存在日期必在干扰
        continue;
      }
      if (f.indexOf(q.base) < 0) { badCase = 'base ' + flat + '/' + k; tableOk = false; break outer; }
      const expAns = stepN(f, q.base, stepOfSpec(q.kind));         // 独立算环步进（±1/±2）
      if (q.answer !== expAns) { badCase = 'answerSeq ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.opts.length !== 4) { badCase = 'len ' + flat + '/' + k; tableOk = false; break outer; }
      const words = q.opts.map(o => o.word);
      if (words.filter((v, i, a) => a.indexOf(v) === i).length !== 4) { badCase = 'dup ' + flat + '/' + k; tableOk = false; break outer; }
      for (let j = 0; j < 4; j++) {
        if (f.indexOf(words[j]) < 0) { badCase = 'opt ' + flat + '/' + k + '/' + j; tableOk = false; break outer; }
      }
      if (words.filter(w => w === q.answer).length !== 1) { badCase = 'ansN ' + flat + '/' + k; tableOk = false; break outer; }
      if (!q.opts.every(o => o.right === (o.word === q.answer))) { badCase = 'rightFlag ' + flat + '/' + k; tableOk = false; break outer; }
      if (!nearInOpts(q)) { badCase = 'near ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.kind === 'dateq' && words.indexOf(q.base) >= 0) { badCase = 'dateAnchor ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 1 && q.kind !== 'day') { badCase = 'dch1kind ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 2 && q.kind !== 'month' && q.kind !== 'month_2' && q.kind !== 'month_m2') { badCase = 'dch2kind ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 3) {
        const cross = (q.kind === 'day' || q.kind === 'month') && q.base === (q.kind === 'day' ? '星期日' : '十二月');
        const m2c = (q.kind === 'day_m2' && (q.base === '星期一' || q.base === '星期二')) ||
                    (q.kind === 'month_m2' && (q.base === '一月' || q.base === '二月'));
        const plainRev = q.kind === 'day_rev' || q.kind === 'month_rev';
        if (!cross && !m2c && !plainRev) { badCase = 'dch3bad ' + flat + '/' + k; tableOk = false; break outer; }
      }
    }
    if (L.dch === 3) {                                            // 关级谱断言（SPEC-R37 §R2）
      const crossN = L.quizzes.filter(q => (q.kind === 'day' || q.kind === 'month') && q.base === (q.kind === 'day' ? '星期日' : '十二月')).length;
      const m2cN = L.quizzes.filter(q => (q.kind === 'day_m2' && (q.base === '星期一' || q.base === '星期二')) ||
                                          (q.kind === 'month_m2' && (q.base === '一月' || q.base === '二月'))).length;
      const revN = L.quizzes.filter(q => q.kind === 'day_rev' || q.kind === 'month_rev').length;
      if (crossN !== 1 || m2cN !== 2 || revN !== 2) { badCase = 'dch3spec ' + flat; tableOk = false; break; }
    }
    if (L.dch === 4) {
      if (L.quizzes.filter(q => q.kind === 'dateq').length !== 1 ||
          L.quizzes.filter(q => q.kind === 'cbound').length !== 1 ||
          SPEC_KINDS.filter(kk => L.quizzes.some(q => q.kind === kk)).length < 4) {
        badCase = 'dch4spec ' + flat; tableOk = false; break;
      }
    }
  }
  if (tableOk) npass++;
  units.table = { ok: tableOk, bad: badCase };

  /* ---- ③ ch3 跨界专项（flat10-14 五关：接龙跨界恰 1+答案=环首；反向多步跨界恰 2） ---- */
  total++;
  const crossDetail = [];
  let crossOk = true;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    if (L.dch !== 3) { crossOk = false; break; }
    const qs = L.quizzes.filter(q => (q.kind === 'day' || q.kind === 'month') && (q.base === '星期日' || q.base === '十二月'));
    const okQ = qs.length === 1 && qs.every(q => q.answer === (q.base === '星期日' ? '星期一' : '一月'));
    const m2s = L.quizzes.filter(q => (q.kind === 'day_m2' && (q.base === '星期一' || q.base === '星期二')) ||
                                      (q.kind === 'month_m2' && (q.base === '一月' || q.base === '二月')));
    const okM2 = m2s.length === 2 && m2s.every(q => q.answer === (q.kind === 'day_m2'
      ? (q.base === '星期一' ? '星期六' : '星期日')
      : (q.base === '一月' ? '十一月' : '十二月')));
    if (!okQ || !okM2) crossOk = false;
    crossDetail.push(qs.concat(m2s).map(q => q.kind[0] + q.base + '→' + q.answer));
  }
  if (crossOk) npass++;
  units.cross3 = { ok: crossOk, detail: crossDetail };

  /* ---- ④ 点词卡单元（flat0 真实 UI：错窗防重入 / 方向反馈分向 / miss 口径） ---- */
  total++;
  startLevel(0);
  const q4 = CA.quiz;
  const initOk = q4 && q4.kind === 'day' && q4.base === '星期三' && q4.answer === '星期四' &&
                 q4.opts.length === 4 && q4.opts.map(o => o.id).join() === 'o0,o1,o2,o3' &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await CA.tapOpt(99)) === false;           // 非法下标=false（不炸）
  const idxOf = w => q4.opts.findIndex(o => o.word === w);
  const iBase = idxOf('星期三');                            // 点 base（在答案前）→ fwd.before
  const iFar = idxOf('星期五');                            // 未来侧（确定性生成恒在场）→ fwd.after
  const pW = CA.tapOpt(iBase);                              // → wrong（1000ms 防重入窗）
  const rejW = await CA.tapOpt(iBase);                      // 窗内紧邻再点=被拦 false（fire-and-forget 口径）
  const rW = await pW;
  const beforeOk = rW === 'wrong' && rejW === false &&
                   window.__lastVoiceText === '就是今天哦，找它后面的';   // 接龙·点 base 专属句（M1）
  const s1 = beforeOk && CA.quiz.miss === 1 && CA.currentLevel.miss === 1;
  const pW2 = CA.tapOpt(iFar);                              // 点环距 ≥2 项（在答案后）→ fwd.after
  const rW2 = await pW2;
  const afterOk = rW2 === 'wrong' && window.__lastVoiceText === '它排在后面哦，往前找找';   // 接龙·未来侧句（M1）
  const s1b = afterOk && CA.quiz.miss === 2;                // 第二次错=miss 2
  const rR = await CA.tapOpt(idxOf('星期四'));
  const s2 = rR === 'right' && CA.quiz.step === 1 && CA.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s1b && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongBase: s1, wrongFar: s1b, right: s2 };

  /* ---- ④b flat≥3 错反馈走语音轨+10s 节流（SPEC-R37：±1=cal_fb_/cal_self_ 在册键；
       新题型=play(null,text) TTS 数数教育句——键轨双通道断言，静默=FAIL） ---- */
  total++;
  lastWrongVoice = 0;                                       // 重置节流锚（隔离本单元）
  startLevel(5);                                            // flat5（flat≥3，ch2 谱含多步跳）
  const q5 = CA.quiz;
  const w5 = q5.opts.findIndex(o => !o.right);
  const r5 = await CA.tapOpt(w5);
  const sayTrack = (typeof window.__lastVoiceKey === 'string' &&
                    (window.__lastVoiceKey.indexOf('cal_fb_') === 0 || window.__lastVoiceKey.indexOf('cal_self_') === 0)) ||
                   (window.__lastVoiceKey === null && typeof window.__lastVoiceText === 'string' &&
                    window.__lastVoiceText.length >= 4);    // 新题型 TTS 轨（play(null,text)→say 记录）
  window.__lastVoiceText = null;
  const r5b = await CA.tapOpt(w5);                          // 10s 节流窗内二错
  const throttled = r5b === 'wrong' && window.__lastVoiceText === null;
  const wrongSayOk = r5 === 'wrong' && sayTrack && CA.quiz.miss === 2 && throttled;
  if (wrongSayOk) npass++;
  units.wrongClip = { ok: wrongSayOk, sayTrack: sayTrack, throttled: throttled };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __caDemoR='right'（演示 星期三→星期四） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__caDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'day' && cur.quizzes[0].base === '星期三' &&
                tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__caDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 词卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await CA.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await CA.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && CA.quiz.step === 0 && CA.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await CA.autoSolve();
  const lv0 = CA.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3）先点 1 次错卡再 autoSolve（1 错=2 星） ---- */
  total++;
  lastWrongVoice = 0;
  startLevel(10);
  const q8 = CA.quiz;
  const wrongC = q8.opts.findIndex(o => o.word !== q8.answer);
  const r8 = await CA.tapOpt(wrongC);
  const a10 = await CA.autoSolve();
  const lv10 = CA.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑩ 布局：双 viewport ×（flat0 ch1 / flat17 ch4 混合）量测 + 描边对比度 ---- */
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
    const cells = Array.prototype.map.call(seqEl.querySelectorAll('.cell'), c => ({
      w: c.offsetWidth, h: c.offsetHeight }));
    const curQ = cur.quizzes[cur.step];
    const seqOk = cells.length === fam(curQ.kind).length && cells.every(c => c.w >= 24 && c.h >= 24);
    const hitOk = cards.length === 4 && cards.every(b => b.w >= 96 && b.h >= 96);
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&                        // 词卡描边 INK 对底
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, cells: cells.length, seqOk: seqOk, cards: cards.length, hitOk: hitOk,
             sceneOk: sceneOk, contrast: cB && cS, ox: ox, pass: seqOk && hitOk && sceneOk && cB && cS && ox <= 0 };
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

  /* ---- ⑪ clips：cal_ 81 条（T46 44+§R6-bis 37）+ core 3 条全注入 + 时长身份辨别器（SPEC §4
       ±60ms，审查 m3；durSpec=六件套+CAL_CLIP_MS 75 行全量对账——重合成即 FAIL 防表过期） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['cal_tut_watch', 'cal_tut_turn', 'cal_hint', 'cal_right', 'cal_wrong', 'cal_q',
                'core_chapter_end', 'core_day_end', 'core_rest',
                /* §R6-bis 37 新键逐键注入断言（键注册后 build 注入 manifest——缺一即 FAIL 防漏注册） */
                'cal_q_d2', 'cal_q_dm2', 'cal_q_m2', 'cal_q_mm2', 'cal_q_dq1', 'cal_q_dq2', 'cal_q_cb',
                'cal_cf_d2', 'cal_cf_dm2', 'cal_cf_m2', 'cal_cf_mm2', 'cal_cf_cb',
                'cal_num_1', 'cal_num_2', 'cal_num_3', 'cal_num_4', 'cal_num_5', 'cal_num_6',
                'cal_num_7', 'cal_num_8', 'cal_num_9', 'cal_num_10', 'cal_num_30', 'cal_num_31',
                'cal_fb_cb_31', 'cal_fb_cb_32',
                'cal_fb_j_p1d', 'cal_fb_j_m1d', 'cal_fb_j_p1m', 'cal_fb_j_m1m', 'cal_fb_j_over',
                'cal_hint_p2', 'cal_hint_m2', 'cal_hint_p2m', 'cal_hint_m2m', 'cal_hint_dq', 'cal_hint_cb'];
  const preOk = keys.length === 84 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0) &&
    Object.keys(CAL_CLIP_MS).length === 75 && keys.filter(k => k in CAL_CLIP_MS).length === 75;
  const durSpec = Object.assign({ cal_tut_watch: 3312, cal_tut_turn: 1776, cal_hint: 2376,
                                   cal_right: 2400, cal_wrong: 2088, cal_q: 2304 }, CAL_CLIP_MS);
  const durKeys = Object.keys(durSpec);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
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
  const hintOk = CHAPTERS[1].hint.indexOf('月份') >= 0 &&                              // 预告 ch2 月份接龙
                 CHAPTERS[2].hint.indexOf('昨天') >= 0 &&                              // 预告 ch3 反向
                 CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 &&  // 预告 ch4 混合
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                                // 预告生成关
                 GEN_HINTS[0].indexOf('星期') >= 0 &&                                  // dch1 星期接龙
                 GEN_HINTS[1].indexOf('月') >= 0 &&                                    // dch2 月份接龙
                 GEN_HINTS[2].indexOf('倒') >= 0 &&                                    // dch3 反向
                 GEN_HINTS[3].indexOf('混') >= 0;                                      // dch4 混合
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // 审查 M3：生成关预告=实算下一关 dch
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑭ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑮ 方向反馈分向专项（±1 四型 15 例旧表逐例对拍——base 中心分区不动；
     jump/dateq 数数教育三路新例；cbound 三例——全句面字面真，断言=SPEC 硬编码禁同源归纳） ---- */
  total++;
  const qFwd = { kind: 'day', base: '星期日', answer: '星期一' };          // 跨周接龙
  const qFwd2 = { kind: 'day', base: '星期三', answer: '星期四' };         // 常规接龙
  const qFw = { kind: 'month', base: '十二月', answer: '一月' };           // 跨年接龙
  const qDr = { kind: 'day_rev', base: '星期五', answer: '星期四' };       // 常规反向
  const qMr = { kind: 'month_rev', base: '一月', answer: '十二月' };       // 跨年反向
  const dirCases = [   /* 审查 M1 重写：base/过去/未来三分区全覆盖——未来侧用例必在（旧表 7 假之源） */
    [dirText(qFwd, '星期日') === '就是今天哦，找它后面的', 'fwd.cross.base'],
    [dirText(qFwd, '星期六') === '这个已经过啦，它在前面', 'fwd.cross.past(昨天)'],
    [dirText(qFwd, '星期三') === '它排在后面哦，往前找找', 'fwd.cross.future'],
    [dirText(qFwd2, '星期三') === '就是今天哦，找它后面的', 'fwd.base'],
    [dirText(qFwd2, '星期一') === '这个已经过啦，它在前面', 'fwd.past'],
    [dirText(qFwd2, '星期五') === '它排在后面哦，往前找找', 'fwd.future'],
    [dirText(qFw, '十二月') === '就是这个月哦，找它后面的', 'month.fwd.base(跨年)'],
    [dirText(qFw, '十一月') === '这个已经过啦，它在前面', 'month.fwd.past(上个月)'],
    [dirText(qFw, '二月') === '它排在后面哦，往前找找', 'month.fwd.future'],
    [dirText(qDr, '星期五') === '就是今天哦，找它前面的', 'day_rev.base'],
    [dirText(qDr, '星期六') === '昨天在它前面哦', 'day_rev.future(明天)'],
    [dirText(qDr, '星期二') === '昨天在它后面哦', 'day_rev.past'],
    [dirText(qMr, '一月') === '就是这个月哦，找它前面的', 'month_rev.base(跨年)'],
    [dirText(qMr, '二月') === '上个月在它前面哦', 'month_rev.future'],
    [dirText(qMr, '十一月') === '上个月在它后面哦', 'month_rev.past'],
    /* SPEC-R37 新题型：jump 数数教育三路（s=0 自指/s=1 差一步/s≥2 数过头） */
    [dirText({ kind: 'day_2', base: '星期三', answer: '星期五' }, '星期三') === '就是今天哦，找它后面的', 'day_2.base'],
    [dirText({ kind: 'day_2', base: '星期三', answer: '星期五' }, '星期四') === '再多数一天哦', 'day_2.中转词(差一步)'],
    [dirText({ kind: 'day_2', base: '星期三', answer: '星期五' }, '星期六') === '数过头啦，往回数一数', 'day_2.数过头'],
    [dirText({ kind: 'day_m2', base: '星期三', answer: '星期一' }, '星期二') === '再少数一天哦', 'day_m2.中转词'],
    [dirText({ kind: 'month_2', base: '十一月', answer: '一月' }, '十二月') === '再多数一个月哦', 'month_2.中转(跨年)'],
    [dirText({ kind: 'month_m2', base: '三月', answer: '一月' }, '五月') === '数过头啦，往回数一数', 'month_m2.数过头'],
    [dirText({ kind: 'dateq', base: '星期六', answer: '星期一' }, '星期日') === '再多数一天哦', 'dateq.中转(跨周)'],
    /* cbound：d1 不存在日期专属句 / d2,d3=fwd.after 在册模板（字面真：二号排在一号后） */
    [dirText({ kind: 'cbound', base: '十月', answer: '十一月一号' }, '十月三十二号') === '十月没有三十二号哦', 'cbound.d1(不存在日期)'],
    [dirText({ kind: 'cbound', base: '十月', answer: '十一月一号' }, '十一月二号') === '它排在后面哦，往前找找', 'cbound.d2'],
    [dirText({ kind: 'cbound', base: '十月', answer: '十一月一号' }, '十二月一号') === '它排在后面哦，往前找找', 'cbound.d3']
  ];
  const dirPureOk = dirCases.every(c => c[0]);
  /* dirKey 键轨同步断言（§R6-bis 键表推导）：jump s=0=cal_self_ 在册键 / s=1=cal_fb_j_ 数数键
     / s≥2=cal_fb_j_over；cbound d1=月词+cal_fb_cb_31|32 两段链 / d2=cal_fb_fwd_a 在册键 */
  const keyCases = [
    [dirKey({ kind: 'day_2', base: '星期三', answer: '星期五' }, '星期三') === 'cal_self_d_f', 'day_2.baseKey'],
    [dirKey({ kind: 'day_2', base: '星期三', answer: '星期五' }, '星期四') === 'cal_fb_j_p1d', 'day_2.中转Key=cal_fb_j_p1d'],
    [dirKey({ kind: 'day_m2', base: '星期三', answer: '星期一' }, '星期二') === 'cal_fb_j_m1d', 'day_m2.中转Key=cal_fb_j_m1d'],
    [dirKey({ kind: 'month_2', base: '十一月', answer: '一月' }, '十二月') === 'cal_fb_j_p1m', 'month_2.中转Key=cal_fb_j_p1m'],
    [dirKey({ kind: 'month_m2', base: '三月', answer: '一月' }, '三月') === 'cal_self_m_r', 'month_m2.baseKey'],
    [dirKey({ kind: 'dateq', base: '星期六', answer: '星期一' }, '星期日') === 'cal_fb_j_p1d', 'dateq.中转Key=cal_fb_j_p1d'],
    [dirKey({ kind: 'day_2', base: '星期三', answer: '星期五' }, '星期六') === 'cal_fb_j_over', 'day_2.数过头Key'],
    [dirKey({ kind: 'cbound', base: '十月', answer: '十一月一号' }, '十一月二号') === 'cal_fb_fwd_a', 'cbound.d2Key'],
    [JSON.stringify(dirKey({ kind: 'cbound', base: '十月', answer: '十一月一号' }, '十月三十二号')) ===
      JSON.stringify(['cal_m_9', 'cal_fb_cb_32']), 'cbound.d1Key=[cal_m_9,cal_fb_cb_32]'],
    [JSON.stringify(dirKey({ kind: 'cbound', base: '四月', answer: '五月一号' }, '四月三十一号')) ===
      JSON.stringify(['cal_m_3', 'cal_fb_cb_31']), 'cbound.d1Key小月=[cal_m_3,cal_fb_cb_31]']
  ];
  const keyOk = keyCases.every(c => c[0]);
  /* UI 层反向族题实测一例（flat10-14 首题 rev 族——ch3 谱含 day_rev/month_rev/day_m2c/month_m2c，
     洗牌后 4/5 概率×5 关必有；startLevel 重置节流锚→首错必播；
     断言=SPEC 分向模板硬编码合法句集（±2 题 base 不保证在干扰，点任意错卡断言∈集，
     禁与 dirText 同源归纳；静默/句外=FAIL） */
  let uiDirOk = false, uiDirCase = null;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    const q = L.quizzes[0];
    if (!rev(q.kind)) continue;                              // rev 族（含反向多步 day_m2/month_m2）
    startLevel(flat);                                        // startLevel 重置节流锚 → 首错必播
    const ui = CA.quiz;
    window.__lastVoiceText = null;                           // 清残留（⑧ winFlow cal_right 不串场）
    const wi = ui.opts.findIndex(o => o.word !== q.answer);  // 点第一张错卡（answer 由 genLevel 预扫得出）
    const rw = await CA.tapOpt(wi);
    const daySet = ui.kind === 'day_rev'
      ? ['就是今天哦，找它前面的', '昨天在它前面哦', '昨天在它后面哦']
      : ['就是今天哦，找它前面的', '再少数一天哦', '数过头啦，往回数一数'];
    const monthSet = ui.kind === 'month_rev'
      ? ['就是这个月哦，找它前面的', '上个月在它前面哦', '上个月在它后面哦']
      : ['就是这个月哦，找它前面的', '再少数一个月哦', '数过头啦，往回数一数'];
    const legal = (ui.kind.indexOf('day') === 0) ? daySet : monthSet;
    uiDirOk = rw === 'wrong' && legal.indexOf(window.__lastVoiceText) >= 0;
    uiDirCase = { flat: flat, kind: ui.kind, tapped: ui.opts[wi].word, got: window.__lastVoiceText };
    break;
  }
  const dirOk = dirPureOk && keyOk && uiDirOk;
  if (dirOk) npass++;
  units.dirSplit = { ok: dirOk, pure: dirCases.map(c => c[1] + ':' + c[0]), keys: keyCases.map(c => c[1] + ':' + c[0]), ui: uiDirCase };

  /* ---- ⑯ TTS 拼句窗（b25 定版：estMs=345×汉字数+600，标点不计；十型确认句全枚举） ---- */
  total++;
  const han = s => String(s).replace(/[^一-鿿]/g, '').length;
  const e1 = estMs('星期三的后面是星期四') === han('星期三的后面是星期四') * 345 + 600;
  const e2 = estMs('这个月是十二月，上个月是几月？') === han('这个月是十二月，上个月是几月？') * 345 + 600;   // 标点不计
  const padOk = CONFIRM_PAD >= 300;
  let maxConf = 0, maxConfText = '';
  const confCand = [];
  for (let i = 0; i < 7; i++) {                              // ±1 旧型（接龙/反向）
    confCand.push(SPEC_DAYS[i] + '的后面是' + succ(SPEC_DAYS, SPEC_DAYS[i]),
                  SPEC_DAYS[i] + '的前面是' + pred(SPEC_DAYS, SPEC_DAYS[i]),
                  SPEC_DAYS[i] + '的后天是' + stepN(SPEC_DAYS, SPEC_DAYS[i], 2),     // day_2
                  SPEC_DAYS[i] + '的前天是' + stepN(SPEC_DAYS, SPEC_DAYS[i], -2));   // day_m2
  }
  for (let i = 0; i < 12; i++) {
    confCand.push(SPEC_MONTHS[i] + '的后面是' + succ(SPEC_MONTHS, SPEC_MONTHS[i]),
                  SPEC_MONTHS[i] + '的前面是' + pred(SPEC_MONTHS, SPEC_MONTHS[i]),
                  SPEC_MONTHS[i] + '的下下个月是' + stepN(SPEC_MONTHS, SPEC_MONTHS[i], 2),   // month_2
                  SPEC_MONTHS[i] + '的上上个月是' + stepN(SPEC_MONTHS, SPEC_MONTHS[i], -2), // month_m2
                  '明天是' + SPEC_MONTHS[(i + 1) % 12] + '一号');                            // cbound 确认
  }
  for (let i = 0; i < 8; i++)                                // dateq 确认（目标号+星期词）
    confCand.push(SPEC_TNUMS[i] + '是' + SPEC_DAYS[i % 7]);
  for (const t of confCand) if (estMs(t) > maxConf) { maxConf = estMs(t); maxConfText = t; }
  const winFloor = 800 + maxConf + CONFIRM_PAD;              // 判对窗合计下限（静态式由 build.py 把守）
  const ttsOk = e1 && e2 && padOk && maxConf === 11 * 345 + 600;   // 最长=「十一月的上上个月是九月」11 字 4395（SPEC-R37 §R7 勘正）
  if (ttsOk) npass++;
  units.ttsWindow = { ok: ttsOk, estMs10: e1, estMsPunct: e2, padOk: padOk,
                      maxConfirmMs: maxConf, maxConfirmText: maxConfText, winFloor: winFloor };

  /* ---- ⑰ 新题型专项（SPEC-R37 §R1）：jump 环步 ±2 独立复算 / dateq 日期-星期双表对账
     / cbound 11 行四词形静态全对账 + UI 层 cbound 错点实测（d1 专属句/d2 在册键） ---- */
  total++;
  let ntOk = true, ntBad = null;
  for (let flat = 0; flat < 40 && ntOk; flat++) {
    const L = genLevel(flat);
    for (const q of L.quizzes) {
      if (isJumpK(q.kind) || q.kind === 'dateq') {
        const f = fam(q.kind);
        const exp = stepN(f, q.base, stepOfSpec(q.kind));         // 独立算 ±2 环步
        if (q.answer !== exp) { ntOk = false; ntBad = 'jump ' + flat + ' ' + q.kind + '/' + q.base; break; }
        if (q.kind === 'dateq') {                                 // 日期双表：dn 词形 + 目标=dn+2
          if (q.dn == null || q.dn < 0 || q.dn > 7) { ntOk = false; ntBad = 'dateq.dn ' + flat; break; }
          if (quizText(q) !== SPEC_DNUMS[q.dn] + '是' + q.base + '，' + SPEC_TNUMS[q.dn] + '是星期几？') { ntOk = false; ntBad = 'dateq.stem ' + flat; break; }
        }
        /* 中转词在场（±2 强近对=路径中转=答案往 base 方向 1 格，SPEC §R3） */
        const mid = stepN(f, q.answer, stepOfSpec(q.kind) > 0 ? -1 : 1);
        if (q.opts.every(o => o.word !== mid)) { ntOk = false; ntBad = 'jump.mid ' + flat + ' ' + q.kind + '/' + q.base; break; }
      }
    }
  }
  /* cbound 11 行静态全对账（独立行表→引擎词形函数 cbD1W/cbEndW/cbNext 同构对拍） */
  let cbRowsOk = true, cbBad = null;
  for (const [m, e] of SPEC_CB) {
    const ni = SPEC_MONTHS.indexOf(m);
    const four = [cbAns(m), cbD1w(m, e), SPEC_MONTHS[(ni + 1) % 12] + '二号', SPEC_MONTHS[(ni + 2) % 12] + '一号'];
    if (quizText({ kind: 'cbound', base: m }) !== m + (e === 31 ? '三十一' : '三十') + '号，明天是几月几号？') { cbRowsOk = false; cbBad = 'cb.stem ' + m; break; }
    if (confirmText({ kind: 'cbound', base: m, answer: cbAns(m) }) !== '明天是' + cbAns(m)) { cbRowsOk = false; cbBad = 'cb.confirm ' + m; break; }
    if (four.some(w => typeof w !== 'string' || w.length < 4 || w.length > 7)) { cbRowsOk = false; cbBad = 'cb.shape ' + m; break; }
  }
  /* UI 层 cbound 实测（flat15 ch4 谱恒含 1 题：引擎驱动推进至 cbound 题后点 d1→两段链
     queue（月词+cal_fb_cb_31|32——§R6-bis 裁决 4，sayWrong 数组轨）、点 d2→在册键） */
  let cbUiOk = false, cbUiCase = null;
  startLevel(15);
  lastWrongVoice = 0;
  for (let k = 0; k < CH_LEN && CA.quiz; k++) {
    if (CA.quiz.kind !== 'cbound') {
      await CA.tapOpt(correctIdx(cur.quizzes[cur.step]));    // 引擎驱动推进（快通道：跳过非 cbound 题）
      continue;
    }
    const ui = CA.quiz;
    const iD1 = ui.opts.findIndex(o => o.word === cbD1w(ui.base, SPEC_CB.find(r => r[0] === ui.base)[1]));
    const iD2 = ui.opts.findIndex(o => o.word === SPEC_MONTHS[(SPEC_MONTHS.indexOf(ui.base) + 1) % 12] + '二号');
    const r1 = await CA.tapOpt(iD1);
    const q1 = window.__lastQueue;                           // d1=两段链 queue（sayWrong 数组轨——say stub 不记文本）
    lastWrongVoice = 0;                                      // 重置错反馈节流锚（二击 d2 必播，④b 同法）
    const r2 = await CA.tapOpt(iD2);
    const k2 = window.__lastVoiceKey;
    cbUiOk = r1 === 'wrong' &&
             JSON.stringify(q1) === JSON.stringify(['cal_m_' + SPEC_MONTHS.indexOf(ui.base),
               'cal_fb_cb_' + (SPEC_CB.find(r => r[0] === ui.base)[1] === 31 ? 32 : 31)]) &&   // 大月 32/小月 31（§R6-bis 键表推导）
             r2 === 'wrong' && k2 === 'cal_fb_fwd_a';
    cbUiCase = { flat: 15, base: ui.base, d1Queue: q1, d2key: k2 };
    break;
  }
  const ntAll = ntOk && cbRowsOk && cbUiOk;
  if (ntAll) npass++;
  units.newKinds = { ok: ntAll, jumpDateq: ntOk, bad: ntBad, cbRows: cbRowsOk, cbBad: cbBad, cbUi: cbUiCase };

  const out = { game: 'calendar', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play/say 记录调用（__lastVoiceKey/__lastVoiceText）供 ④⑮ 反馈分向断言；
     voice.queue 记录段 key 序列（__lastQueue）供救援接力对账 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastVoiceKey = null; window.__lastVoiceText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = (parts || []).map(p => typeof p === 'string' ? p : (p && p.key) || null);
  };
  runVerify();
}
