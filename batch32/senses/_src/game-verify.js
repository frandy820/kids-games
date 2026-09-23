/* ================= ?verify=1 自检（仅 verify 分支加载执行；r11 四族版）
   ① 静态 20+生成 20 关全量审计（flat 0-39）：确定性/structWhy 全 null/章号映射/引擎直驱
     （multi=engTapOpt×need+engSubmit）
   ② SPEC 表独立对账（SPEC_SENSE_OF/SPEC_SENSES/SPEC_THINGS/SPEC_MULTI/SPEC_CH_FAMILY——
     从 SPEC-BATCH32 §6 r11 文字独立重列，禁引引擎 SENSES5/THINGS10/MULTI5/CH_FAMILY）×40 关全题：
     find 候选互异含真值恒 4（findthing 防双真值：同感官对至多 1 物在场）/
     multi 候选=感官 5 全集+answers=该物感官集下标恰 3+answer=-1/
     anti 相关恰 3（2 单感官物+1 含 S 多感官物）不相关恰 1=answer/
     comp 诱惑=被捂恒在场+可用真值恰 1（另一剩余禁在场）+感官集外恰 2/flat0q0=findsense/bell
   ③ 聚合独占票：章型位序族并集/覆盖（ch1 multi 5 物全现·ch2/ch3/ch4 anti 5 感官全现·
     ch3 comp 5 对·ch4 comp 10 对·生成关 dch1-4 全现+五 kind 全现）
   ④ tapOpt 单元（flat0 findsense/bell 4 候选）：越界 null/错=wrong+miss+1+1000ms 防重入+
     错链三段（sen_wrong→sen_n_bell→sen_again_sense「再想一想，用什么呢」T46 键段尾）/对=right+确认链两段/
     重听链
   ⑤ multi 提交状态机（flat5 q1）：勾/取消零惩罚/空选不判（false 不计 miss）/漏选+多选=wrong
     （清空 held+miss）/勾满 need 提交=right（确认链=sen_right+3 感官名音逐段全 clip）
   ⑥ anti 抑制单元（flat5 q0）：相关 3+不相关 1=answer/错链=sen_wrong+感官名音+keyless
     「再想一想，哪个不是用<S>的呀」/对=right
   ⑦ comp 代偿单元（flat15 q0）：被捂=该物感官之一+诱惑恒在场+可用真值恰 1+另一剩余禁在场+
     集外恰 2/错（点诱惑）链=sen_wrong+被捂名音+keyless「再想一想，捂住了还能用什么」/对=right
   ⑧ 帧内容断言（契约 M：渲染即引擎）：四族题面/卡数/data-anim/data-ask/data-blocked/
     not-ring/cov-badge/w5+held+tick/提交钮 armed·ready 态
   ⑨ 教学链三段（看→帮→独）watch 折算真实 ≤16s
   ⑩ 吞输入轻叮+可见回应（bump）
   ⑪ UI 冒烟：flat0/flat5/flat10（1 错→2★）autoSolve（multi 走真实提交链）
   ⑫ 布局：双 viewport（1280×800/800×1180·body.port 类通道——纪律⑥）×（flat0 find/
     flat5 anti/flat5 multi/flat15 comp）：卡 ≥96×96、multi 5 卡、提交钮 ≥72、
     rect 落容器、题面 SVG ≥120、提交钮 ≥64（SPEC 触摸目标下限）、对比度 ≥3:1、overflowX ≤0
   ⑬ clips：sen_ 33 条+core 3 条全注入+duration 辨别器（_clipdur32 实长 ±60ms）
   ⑭ 星级三档（0=3★/1-2=2★/≥3=1★ 永不 0 星）
   ⑮ 契约 A/B/E/F/I/J/K/N 源码断言+存档 v1.0
   ⑯ 章末预告 C7 独立硬编码对账+off-by-one 哨兵（预告文案两两互异先行——全同则哨兵空转必 fail）+
     生成关 nextHint 实算对账
   ⑰ estMs 语音窗动态断言：单选确认窗 4600/multi 确认窗 7400/错链豁免窗 9800（T46）≥ 四族链实长
   ⑱ r11 认知建模硬断言：40 关 modeled ≥40000ms（认知步主体非演出窗；SPEC_MODELED 独立表
     复算+与引擎 modeledLevelMs 对账）
   ⑲ SPEED=0.12
   结果写 #verify-result + window.__seVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH32 §0.76/§1/§4/§6 r11 文字独立重列（禁抄页面 SENSES5/THINGS10/MULTI5/
     MULTI_SENSES/CH_FAMILY/MODELED_MS/CHAPTERS/GEN_HINTS/文案） */
  const SPEC_SENSE_OF = {                       // 单感官物品 → 主感官（每感官恰 2 物）
    rainbow: 'eye', star: 'eye', bell: 'ear', birdsong: 'ear',
    flower: 'nose', cookie: 'nose', softtoy: 'hand', ice: 'hand',
    lemon: 'mouth', candy: 'mouth'
  };
  const SPEC_SENSES = ['eye', 'ear', 'nose', 'hand', 'mouth'];            // 感官封闭 5
  const SPEC_THINGS = ['rainbow', 'star', 'bell', 'birdsong', 'flower',  // 单感官物品封闭 10
                       'cookie', 'softtoy', 'ice', 'lemon', 'candy'];
  const SPEC_MULTI = {                          // r11 多感官物封闭 5（每物恰 3 感官）
    popcorn: ['eye', 'ear', 'nose'], watermelon: ['eye', 'ear', 'mouth'],
    kitten: ['eye', 'ear', 'hand'], soup: ['eye', 'nose', 'mouth'],
    drum: ['eye', 'ear', 'hand']
  };
  const SPEC_CH_FAMILY = {                      // 章型位序（每章 5 题，q0 恒单选题型）
    1: ['find', 'multi', 'find', 'multi', 'multi'],
    2: ['anti', 'multi', 'anti', 'find', 'anti'],
    3: ['anti', 'multi', 'comp', 'multi', 'anti'],
    4: ['comp', 'multi', 'anti', 'comp', 'find']
  };
  const SPEC_MODELED = { find: 4500, anti: 7500, multi: 15000, comp: 9000 };  // 认知建模 ms/题
  const SPEC_MODELED_FLOOR = 40000;             // 每关认知建模下限（r11 时长门禁）
  const SPEC_SAGAIN = '再想一想，用什么呢';       // findsense 错链尾（9 字）
  const SPEC_TAGAIN = '再想想什么用它';           // findthing 错链尾（7 字）
  const SPEC_MUAGAIN = '再想一想，都用了哪里呀';  // multi 错链尾（11 字）
  const SPEC_ANBASE = '再想一想，哪个不是用';     // anti 错链尾前段（10 字+感官名 2+'的呀'2=14）
  const SPEC_ANTAIL = '的呀';
  const SPEC_COVAGAIN = '再想一想，捂住了还能用什么'; // comp 错链尾（13 字）
  const SPEC_DUR = { sen_tut_watch: 2592, sen_tut_turn: 1824, sen_hint: 1656, sen_right: 2256,
                     sen_wrong: 1656, sen_q1: 1560, sen_q2: 1824,
                     sen_q3: 2664, sen_q_not: 1776, sen_q_not2: 1248,
                     sen_q_cov1: 1512, sen_q_cov2: 1992, sen_mw: 1824,
                     sen_n_eye: 1368, sen_n_ear: 1344, sen_n_nose: 1344,
                     sen_n_hand: 1440, sen_n_mouth: 1344,
                     sen_n_rainbow: 1368, sen_n_star: 1872, sen_n_bell: 1824,
                     sen_n_birdsong: 1848, sen_n_flower: 1632, sen_n_cookie: 1776,
                     sen_n_softtoy: 1752, sen_n_ice: 1800, sen_n_lemon: 1776,
                     sen_n_candy: 1848,
                     sen_n_popcorn: 1536, sen_n_watermelon: 1368, sen_n_kitten: 1560,
                     sen_n_soup: 1392, sen_n_drum: 1464,   // batch32/_clipdur32.json 实长
                     sen_again_sense: 2640, sen_again_thing: 2184, sen_again_multi: 2976,
                     sen_again_cov: 3264, sen_anti_base: 2880, sen_anti_tail: 1248 };   // T46 六键 ffprobe 实测
  const SPEC_CHAPTER_HINTS = { 1: '接下来，要找一个不一样的哦', 2: '捂住一个感官，还能用什么呀',
                               3: '什么都混在一起，大挑战', 4: '新一轮五感大挑战' };
  const SPEC_GEN_HINTS = ['选感官，还要找全哦', '找一个不一样的哦',
                          '捂住一个，想一想哦', '五感大集合，来挑战'];
  const SPEC_CNFN = { eye: '眼睛', ear: '耳朵', nose: '鼻子', hand: '小手', mouth: '嘴巴' };  // 感官名（anti 错链尾拼算）
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const famTok = k => (k === 'findsense' || k === 'findthing') ? 'find' : k;
  const unlocked = async () => {                  // 等错防重入/演出窗结束（verify 提速后 ≤1.4s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段播完即 return 丢弃后续段——
     T46 阶段2 四族错链尾段全部 clip 键段化，全款拼播链无 keyless 段（链尾断言改键段直断） */
  /* 驱动当前题到推进（multi=勾满 need+提交；单选=点 answer）；返回是否推进 */
  const driveQ = async () => {
    const q = window.SE.quiz;
    if (!q) return false;
    if (!(await unlocked())) return false;
    if (q.kind === 'multi') {
      for (const j of q.answers) { if (!(await unlocked())) return false; await window.SE.tapOpt(j); }
      const r = await window.SE.tapSubmit();
      return r === 'right' || r === 'done';
    }
    const r = await window.SE.tapOpt(q.answer);
    return r === 'right' || r === 'done';
  };
  /* 遍历推进直到目标族出现（≤5 题内必达——章型位序保证） */
  const seekKind = async kind => {
    for (let g = 0; g < 6; g++) {
      const q = window.SE.quiz;
      if (!q) return null;
      if (q.kind === kind) return q;
      if (!(await driveQ())) return null;
    }
    return null;
  };

  /* ---- ①② 40 关全量审计 + SPEC 表独立对账 ---- */
  const genDch = {}, mixBad = {};
  const cov = { multiU: {}, antiU: {}, compN: 0, compU: {}, ch1Find: {}, genKinds: {} };
  let tableOk = true, badCase = null, modeledBad = null;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = flat < 20 ? L1.dch === Math.floor(flat / 5) + 1   // 静态四档
                           : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* 引擎直驱：multi=engTapOpt×need+engSubmit；单选=engTapOpt(answer) → right/末题 done */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      let r;
      if (q.kind === 'multi') {
        for (const j of q.answers) engTapOpt(L3, j);
        r = engSubmit(L3);
      } else r = engTapOpt(L3, q.answer);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;

    /* r11 认知建模独立复算（SPEC_MODELED 表）+与引擎常量对账 */
    let modSum = 0;
    for (const q of L1.quizzes) modSum += SPEC_MODELED[famTok(q.kind)];
    if (modSum < SPEC_MODELED_FLOOR || modSum !== modeledLevelMs(L1)) modeledBad = flat + '=' + modSum;

    /* SPEC 表独立对账（每题：章型位序/四族数学先验/answer(s) 复算） */
    let specOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const vals = q.opts.map(o => o.anim);
      if (SPEC_CH_FAMILY[L1.dch][k] !== famTok(q.kind)) { badCase = 'chFam ' + flat + '/' + k; specOk = false; break; }
      if (flat === 0 && k === 0) {                          // 教学演示锚点：闹钟响响点耳朵
        if (q.kind !== 'findsense' || q.ask !== 'bell') { badCase = 'anchor ' + flat; specOk = false; break; }
      }
      if (famTok(q.kind) === 'find') {
        const isFS = q.kind === 'findsense';
        const askOk = isFS ? SPEC_THINGS.indexOf(q.ask) >= 0 : SPEC_SENSES.indexOf(q.ask) >= 0;
        if (!askOk) { badCase = 'askDomain ' + flat + '/' + k; specOk = false; break; }
        if (vals.length !== 4) { badCase = 'findLen ' + flat + '/' + k; specOk = false; break; }
        const pool = isFS ? SPEC_SENSES : SPEC_THINGS;
        let poolOk = true;
        for (const v of vals) if (pool.indexOf(v) < 0) poolOk = false;
        if (!poolOk || new Set(vals).size !== vals.length) { badCase = 'optPool ' + flat + '/' + k; specOk = false; break; }
        let truth, truthCnt = 0;
        if (isFS) truth = SPEC_SENSE_OF[q.ask];
        else for (const v of vals) if (SPEC_SENSE_OF[v] === q.ask) { truth = v; truthCnt++; }
        if (!truth || vals.indexOf(truth) < 0) { badCase = 'optTruth ' + flat + '/' + k; specOk = false; break; }
        if (!isFS) {                                        // 防双真值：同感官对至多 1 物在场
          const bySense = {};
          let pairOk = true;
          for (const v of vals) {
            const s2 = SPEC_SENSE_OF[v];
            if (bySense[s2]) { pairOk = false; break; }
            bySense[s2] = true;
          }
          if (!pairOk || truthCnt !== 1) { badCase = 'dblTruth ' + flat + '/' + k; specOk = false; break; }
        }
        let expAns = -1;
        for (let j = 0; j < vals.length; j++) if (vals[j] === truth) expAns = j;
        if (expAns < 0 || q.answer !== expAns) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
        if (flat < 5) cov.ch1Find[q.kind] = true;           // ch1 两子族并集素材
      } else if (q.kind === 'multi') {
        if (!SPEC_MULTI[q.ask]) { badCase = 'askMulti ' + flat + '/' + k; specOk = false; break; }
        if (vals.length !== SPEC_SENSES.length || new Set(vals).size !== vals.length) {
          badCase = 'multiLen ' + flat + '/' + k; specOk = false; break; }
        let setOk = true;
        for (const v of vals) if (SPEC_SENSES.indexOf(v) < 0) setOk = false;
        if (!setOk) { badCase = 'optPool ' + flat + '/' + k; specOk = false; break; }
        const want = SPEC_MULTI[q.ask];
        const expIdx = vals.map((v, j) => want.indexOf(v) >= 0 ? j : -1).filter(j => j >= 0);
        const gotIdx = (q.answers || []).slice().sort((a, b) => a - b);
        if (expIdx.length !== want.length || JSON.stringify(expIdx) !== JSON.stringify(gotIdx)) {
          badCase = 'multiAns ' + flat + '/' + k; specOk = false; break; }
        if (q.answer !== -1 || (q.picked && q.picked.length)) { badCase = 'multiInit ' + flat + '/' + k; specOk = false; break; }
        if (flat < 20) cov.multiU[q.ask] = true;
      } else if (q.kind === 'anti') {
        if (SPEC_SENSES.indexOf(q.ask) < 0) { badCase = 'askSense ' + flat + '/' + k; specOk = false; break; }
        if (vals.length !== 4 || new Set(vals).size !== 4) { badCase = 'antiLen ' + flat + '/' + k; specOk = false; break; }
        let nRel = 0, nSingle = 0, unrel = null, unrel2 = null;
        for (const v of vals) {
          const isSingle = SPEC_THINGS.indexOf(v) >= 0;
          const isMulti = !!SPEC_MULTI[v];
          if (!isSingle && !isMulti) { badCase = 'optPool ' + flat + '/' + k; specOk = false; break; }
          const rel = isSingle ? SPEC_SENSE_OF[v] === q.ask :
                      isMulti ? SPEC_MULTI[v].indexOf(q.ask) >= 0 : false;
          if (rel) { nRel++; if (isSingle) nSingle++; }
          else if (unrel === null) unrel = v;
          else if (unrel2 === null) unrel2 = v;
        }
        if (nRel !== 3 || nSingle !== 2 || unrel === null || unrel2 !== null) {
          badCase = 'antiRel ' + flat + '/' + k; specOk = false; break; }   // 相关恰 3（2 单感官+1 多感官）/不相关恰 1
        if (vals[q.answer] !== unrel) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
        if (flat < 20) cov.antiU[q.ask] = true;
      } else {
        if (!SPEC_MULTI[q.ask]) { badCase = 'askMulti ' + flat + '/' + k; specOk = false; break; }
        if (!SPEC_MULTI[q.ask] || SPEC_MULTI[q.ask].indexOf(q.blocked) < 0) { badCase = 'blockedIn ' + flat + '/' + k; specOk = false; break; }
        if (vals.length !== 4 || new Set(vals).size !== 4) { badCase = 'compLen ' + flat + '/' + k; specOk = false; break; }
        const want = SPEC_MULTI[q.ask];
        let nAvail = 0, nBlocked = 0, nOut = 0, truth = null;
        for (const v of vals) {
          if (SPEC_SENSES.indexOf(v) < 0) { badCase = 'optPool ' + flat + '/' + k; specOk = false; break; }
          if (want.indexOf(v) >= 0) {
            if (v === q.blocked) nBlocked++;
            else { nAvail++; if (truth === null) truth = v; }
          } else nOut++;
        }
        if (nBlocked !== 1 || nAvail !== 1 || nOut !== 2 || !truth) {   // 诱惑恒在/真值恰 1/集外恰 2
          badCase = 'compPrior ' + flat + '/' + k; specOk = false; break; }
        if (truth === q.blocked || vals[q.answer] !== truth) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
        if (flat < 20) { cov.compN++; cov.compU[q.ask + ':' + q.blocked] = true; }
      }
    }
    if (!specOk) tableOk = false;
    if (flat >= 20) {
      genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
      for (const q of L1.quizzes) cov.genKinds[q.kind] = true;
    }
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk && !modeledBad;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  modeled: modSum,
                  kinds: L1.quizzes.map(q => q.kind + ':' + q.ask) };
    if (flat < 20) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ③ 聚合独占票：章型位序覆盖+生成关四型全现+五 kind 全现 ---- */
  total++;
  const multiAll = Object.keys(SPEC_MULTI), senseAll = SPEC_SENSES.slice();
  const ch3 = [10, 11, 12, 13, 14], ch4 = [15, 16, 17, 18, 19];
  const ch3comp = ch3.filter(f => genLevel(f).quizzes.filter(q => q.kind === 'comp').length === 1).length;
  const ch4comp = ch4.reduce((a, f) => a + genLevel(f).quizzes.filter(q => q.kind === 'comp').length, 0);
  const aggOk = tableOk && !modeledBad &&
    multiAll.every(m => cov.multiU[m]) &&                        // 静态 20 关 multi 5 物全现
    senseAll.every(s => cov.antiU[s]) &&                         // 静态 20 关 anti 5 感官全现
    ch3comp === 5 && ch4comp === 10 &&                           // ch3 每关 1 comp/ch4 每关 2 comp
    cov.ch1Find.findsense && cov.ch1Find.findthing &&            // ch1 find 两子族并集全现
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0 &&   // 生成关四型全现
    ['findsense', 'findthing', 'multi', 'anti', 'comp'].every(k2 => cov.genKinds[k2]);
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, modeledBad: modeledBad, genDch: genDch,
                  multiU: Object.keys(cov.multiU).length, antiU: Object.keys(cov.antiU).length,
                  compN: cov.compN, compU: Object.keys(cov.compU).length,
                  ch3comp: ch3comp, ch4comp: ch4comp };

  /* ---- ④ tapOpt 单元（flat0 findsense/bell 4 候选）---- */
  total++;
  startLevel(0);
  const q4 = window.SE.quiz;
  const initOk = q4 && q4.kind === 'findsense' && q4.ask === 'bell' &&
                 q4.opts.length === 4 &&
                 q4.opts.every(o => typeof o.anim === 'string' && SPEC_SENSES.indexOf(o.anim) >= 0) &&
                 q4.opts[q4.answer].anim === 'ear' &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await window.SE.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex((o, i) => i !== q4.answer);        // 错卡（异感官）
  const pW = window.SE.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await window.SE.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue.length === 3 &&
                window.__lastQueue[0] === 'sen_wrong' &&          // 错链头=wrong clip（manifest 文案）
                window.__lastQueue[1] === 'sen_n_bell' &&         // 题面名音回锚（clip 段）
                window.__lastQueue[2] && window.__lastQueue[2].key === 'sen_again_sense' &&   // T46 键段尾
                window.__lastQueue[2].text === SPEC_SAGAIN;
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             window.SE.quiz.miss === 1 && window.SE.currentLevel.miss === 1;
  replayQuiz(false);                              // 重听路径（仍在 q0 findsense）：名音+题面句（两 clip 无 keyless）
  const chainQ = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'sen_n_bell' &&
                 window.__lastQueue[1] === 'sen_q1';
  const rR = await window.SE.tapOpt(q4.answer);
  const chainR = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'sen_right' &&          // 确认链=sen_right+名音尾段（全 clip 无 keyless）
                 window.__lastQueue[1] === 'sen_n_ear';
  const s2 = rR === 'right' && chainR && chainQ && window.SE.quiz.step === 1 && window.SE.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1,
                chain: chainA, right: s2, chainR: chainR, chainReplay: chainQ };

  /* ---- ⑤ multi 提交状态机（flat5 q1=multi）两遍式：豁免窗 9.5s 真时钟内二次提交必被吞，
     故 A 遍零错先测 勾/取消/空选/勾满对提交=right+确认链；B 遍（重开重置窗）专测错选 wrong ---- */
  total++;
  startLevel(5);
  const qm = await seekKind('multi');
  const mShape = !!qm && qm.kind === 'multi' && !!SPEC_MULTI[qm.ask] &&
                 qm.opts.length === 5 && qm.answer === -1 &&
                 qm.answers.length === 3 && qm.picked.length === 0 &&
                 qm.answers.every(j => SPEC_MULTI[qm.ask].indexOf(qm.opts[j].anim) >= 0);
  const noAns = qm ? qm.opts.filter((o, i) => qm.answers.indexOf(i) < 0) : [];   // 2 干扰感官
  const d0 = qm ? qm.opts.findIndex(o => o.anim === noAns[0].anim) : -1;
  const p1 = await window.SE.tapOpt(qm.answers[0]);               // 勾真值 1 → pick
  const p2 = await window.SE.tapOpt(d0);                          // 勾干扰 1 → pick
  const sPick = p1 === 'pick' && p2 === 'pick' &&
                JSON.stringify(window.SE.quiz.picked) === JSON.stringify([qm.answers[0], d0]);
  const u1 = await window.SE.tapOpt(qm.answers[0]);               // 取消勾选零惩罚
  const sUnpick = u1 === 'unpick' && window.SE.quiz.picked.length === 1 && window.SE.quiz.miss === 0;
  const u2 = await window.SE.tapOpt(d0);                          // 取消干扰 → picked 清空
  const subEmpty = await window.SE.tapSubmit();                   // 空选不判：false 不计 miss（窗未设纯路径）
  const wEmpty = subEmpty === false && window.SE.quiz.miss === 0 && window.SE.quiz.picked.length === 0;
  for (const j of qm.answers) await window.SE.tapOpt(j);          // 勾满 need（3 真值）
  const readyOk = submitBtn.classList.contains('ready') && submitBtn.classList.contains('armed');
  const subR = await window.SE.tapSubmit();                       // → right（零错路径窗干净）
  const chainMR = window.__lastQueue && window.__lastQueue.length === 4 &&
                 window.__lastQueue[0] === 'sen_right' &&
                 qm.answers.every((j, i2) => window.__lastQueue[i2 + 1] === 'sen_n_' + qm.opts[j].anim);
  const passA = mShape && sPick && sUnpick && wEmpty && readyOk &&
                subR === 'right' && chainMR && window.SE.quiz.step === qm.step + 1;
  /* B 遍：重开 flat5（startLevel 重置豁免窗），错选集=真值 1+干扰 2（漏选+多选并犯）→ wrong */
  startLevel(5);
  const qmB = await seekKind('multi');
  const dB0 = qmB ? qmB.opts.findIndex((o, i) => qmB.answers.indexOf(i) < 0) : -1;
  const dB1 = qmB ? qmB.opts.findIndex((o, i) => qmB.answers.indexOf(i) < 0 && i !== dB0) : -1;
  await window.SE.tapOpt(qmB.answers[0]);
  await window.SE.tapOpt(dB0);
  await window.SE.tapOpt(dB1);
  const subW2 = await window.SE.tapSubmit();                      // → wrong（清空+miss）
  const chainM = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'sen_mw' &&            // multi 错链头=没有找全哦
                 window.__lastQueue[1] === 'sen_n_' + qmB.ask &&  // 物品名音回锚
                 window.__lastQueue[2] && window.__lastQueue[2].key === 'sen_again_multi' &&   // T46 键段尾
                 window.__lastQueue[2].text === SPEC_MUAGAIN;
  const heldCleared = boardEl.querySelectorAll('.card.held').length === 0;
  const passB = subW2 === 'wrong' && chainM && heldCleared && window.SE.quiz.miss === 1;
  const multiOk = passA && passB;
  if (multiOk) npass++;
  units.multi = { ok: multiOk, shape: mShape, pick: sPick, unpick: sUnpick,
                  emptyNoMiss: wEmpty, ready: readyOk,
                  right: subR, chainRight: chainMR, wrong: passB, chainWrong: chainM };

  /* ---- ⑥ anti 抑制单元（flat5 q0：相关 3+不相关 1=answer；错链含感官名） ---- */
  total++;
  startLevel(5);
  const qa = window.SE.quiz;
  const aShape = !!qa && qa.kind === 'anti' && SPEC_SENSES.indexOf(qa.ask) >= 0 &&
                 qa.opts.length === 4 &&
                 qa.opts[qa.answer].anim !== undefined &&
                 (SPEC_SENSE_OF[qa.opts[qa.answer].anim] !== qa.ask) &&
                 !(SPEC_MULTI[qa.opts[qa.answer].anim] || []).includes(qa.ask);   // answer=不相关
  const relIdx = qa ? qa.opts.map((o, i) => i).filter(i => i !== qa.answer) : [];
  const rA = await window.SE.tapOpt(relIdx[0]);                   // 点相关卡=wrong（抑制失败）
  const chainAN = window.__lastQueue && window.__lastQueue.length === 5 &&   // T46 拼句三段化（5 段链）
                 window.__lastQueue[0] === 'sen_wrong' &&
                 window.__lastQueue[1] === 'sen_n_' + qa.ask &&   // 感官名音回锚
                 window.__lastQueue[2] && window.__lastQueue[2].key === 'sen_anti_base' &&
                 window.__lastQueue[2].text === SPEC_ANBASE &&
                 window.__lastQueue[3] === 'sen_n_' + qa.ask &&   // 拼句中间名音（同感官）
                 window.__lastQueue[4] && window.__lastQueue[4].key === 'sen_anti_tail' &&
                 window.__lastQueue[4].text === SPEC_ANTAIL;
  const aMiss = window.SE.quiz.miss === 1;
  const rA2 = await window.SE.tapOpt(qa.answer);                  // 点不相关=right
  const chainAR = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'sen_right' &&
                 window.__lastQueue[1] === 'sen_n_' + qa.opts[qa.answer].anim;
  const antiOk = aShape && rA === 'wrong' && chainAN && aMiss && rA2 === 'right' && chainAR;
  if (antiOk) npass++;
  units.anti = { ok: antiOk, shape: aShape, wrong: rA, chain: chainAN, right: rA2, chainR: chainAR };

  /* ---- ⑦ comp 代偿单元（flat15 q0：诱惑=被捂恒在场；点诱惑=wrong） ---- */
  total++;
  startLevel(15);
  const qc = window.SE.quiz;
  const cVals = qc ? qc.opts.map(o => o.anim) : [];
  const cWant = qc ? (SPEC_MULTI[qc.ask] || []) : [];
  const cShape = !!qc && qc.kind === 'comp' && !!SPEC_MULTI[qc.ask] &&
                 cWant.indexOf(qc.blocked) >= 0 &&
                 cVals.filter(v => v === qc.blocked).length === 1 &&          // 诱惑恒在场恰 1
                 cVals.filter(v => cWant.indexOf(v) >= 0 && v !== qc.blocked).length === 1 &&  // 可用真值恰 1
                 cVals.filter(v => cWant.indexOf(v) < 0).length === 2 &&      // 集外恰 2
                 cVals[qc.answer] !== qc.blocked &&
                 cWant.indexOf(cVals[qc.answer]) >= 0 && cVals[qc.answer] !== qc.blocked;
  const tIdx = qc ? cVals.indexOf(qc.blocked) : -1;
  const rC = await window.SE.tapOpt(tIdx);                        // 点被捂感官（诱惑）=wrong
  const chainC = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'sen_wrong' &&
                 window.__lastQueue[1] === 'sen_n_' + qc.blocked &&  // 被捂感官名音回锚
                 window.__lastQueue[2] && window.__lastQueue[2].key === 'sen_again_cov' &&   // T46 键段尾
                 window.__lastQueue[2].text === SPEC_COVAGAIN;
  const rC2 = await window.SE.tapOpt(qc.answer);                  // 点可用真值=right
  const chainCR = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'sen_right' &&
                 window.__lastQueue[1] === 'sen_n_' + cVals[qc.answer];
  const compOk = cShape && rC === 'wrong' && chainC && rC2 === 'right' && chainCR;
  if (compOk) npass++;
  units.comp = { ok: compOk, shape: cShape, wrong: rC, chain: chainC, right: rC2, chainR: chainCR };

  /* ---- ⑧ 帧内容断言（契约 M：渲染即引擎——四族 DOM 锚） ---- */
  total++;
  startLevel(0);                                        // findsense 4 卡
  const fFind = window.SE.quiz && (() => {
    const q = window.SE.quiz;
    const cards = Array.from(boardEl.querySelectorAll('.card'));
    const domOk = cards.length === 4 &&
      cards.every((c, i) => c.dataset.anim === q.opts[i].anim && c.querySelectorAll('svg').length === 1);
    const g = sceneEl.querySelector('.ask-slot svg > g[data-anim]');
    return domOk && sceneEl.dataset.ask === q.ask && !!g && g.dataset.anim === q.ask &&
           sceneEl.querySelector('.q-text').textContent.indexOf('用什么呢') >= 0;
  })();
  startLevel(5);                                        // anti q0：not-ring+题面句
  const qfa = window.SE.quiz;
  const fAnti = !!qfa && qfa.kind === 'anti' && (() => {
    const g = sceneEl.querySelector('.ask-slot svg > g[data-anim]');
    return !!sceneEl.querySelector('.not-ring') && g && g.dataset.anim === qfa.ask &&
           sceneEl.querySelector('.q-text').textContent.indexOf('不是用') >= 0 &&
           boardEl.querySelectorAll('.card').length === 4;
  })();
  startLevel(5);                                        // multi q1：w5+5 卡+tick+held+提交钮态
  const qfm = await seekKind('multi');
  const fMulti = !!qfm && (() => {
    const cards = Array.from(boardEl.querySelectorAll('.card'));
    const base = qfm.kind === 'multi' && boardEl.classList.contains('w5') &&
                 cards.length === 5 && !submitBtn.classList.contains('hidden') &&
                 cards.every(c => c.querySelectorAll('.tick').length === 1);
    return base;                                        // held/ready 态在 ⑤ 单元已断言
  })();
  startLevel(15);                                       // comp q0：cov-badge+data-blocked
  const qfc = window.SE.quiz;
  const fComp = !!qfc && qfc.kind === 'comp' && (() => {
    const badge = sceneEl.querySelector('.cov-badge');
    const bg = badge ? badge.querySelector('svg > g[data-anim]') : null;
    return !!badge && !!bg && bg.dataset.anim === qfc.blocked &&
           sceneEl.dataset.blocked === qfc.blocked &&
           sceneEl.querySelector('.q-text').textContent.indexOf('捂住了') >= 0;
  })();
  const frameOk = fFind && fAnti && fMulti && fComp;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, find: fFind, anti: fAnti, multi: fMulti, comp: fComp };

  /* ---- ⑨ 教学链三段（看→帮→独）：tutorialWatch 真实走完 → __seDemoR='right'（演示点
     耳朵小人图卡）→ tut='help'（帮）；再首题点对 → tut='solo'（独） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutHelp = window.__seDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'findsense' &&
                cur.quizzes[0].ask === 'bell' && tw <= 16000;
  await unlocked();
  const qT = window.SE.quiz;                                // "帮"阶段放手题（重发同关题 0）
  const rT = await window.SE.tapOpt(qT.answer);             // 首次选对 → tut='solo'（独）
  const tutSolo = rT === 'right' && state.tut === 'solo';
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__seDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑩ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await window.SE.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await window.SE.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && window.SE.quiz.step === 0 && window.SE.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑪ UI 冒烟 A：flat0 autoSolve 通关（判定步=5 恒 3★；multi=提交 1 步） ---- */
  total++;
  startLevel(0);
  const a0 = await window.SE.autoSolve();
  const lv0 = window.SE.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑪ UI 冒烟 B：flat5（dch2 anti 主场）autoSolve 通关 ---- */
  total++;
  startLevel(5);
  const a5 = await window.SE.autoSolve();
  const smokeB = a5.done && a5.taps === 5 && window.SE.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat5 = { ok: smokeB, taps: a5.taps };

  /* ---- ⑪ UI 冒烟 C：flat10（dch3 q0=anti）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const q10 = window.SE.quiz;
  const wrongC = q10.opts.findIndex((o, i) => i !== q10.answer);
  const r10 = await window.SE.tapOpt(wrongC);
  await new Promise(w => setTimeout(w, 10100));               // 等错链豁免窗（真时钟 9800，T46）——窗后照计
  const a10 = await window.SE.autoSolve();
  const lv10 = window.SE.currentLevel;
  const smokeC = r10 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat10 = { ok: smokeC, r10: r10, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑫ 布局：双 viewport ×（flat0 find / flat5 anti / flat5 multi / flat15 comp）；
     竖屏走 body.port 类通道（纪律⑥：媒体查询跟视口不跟元素）+rect 落容器断言 ---- */
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
  const inRect = (r, R, pad) => r.left >= R.left - pad && r.right <= R.right + pad &&
                               r.top >= R.top - pad && r.bottom <= R.bottom + pad;
  async function simView(w, h, port, flat, kind) {
    const g = $id('game');
    document.body.classList.toggle('port', !!port);
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    let ok = true;
    if (kind) ok = !!(await seekKind(kind));                 // 驱动到目标族（multi 非 q0）
    const q = window.SE.quiz;
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight, r: b.getBoundingClientRect() }));
    const bR = boardEl.getBoundingClientRect();
    const svg = sceneEl.querySelector('.ask-slot svg');
    const svgh = svg ? Math.round(svg.getBoundingClientRect().height) : 0;   // SVGElement 无 offsetHeight
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const need = q ? q.opts.length : 4;
    const hitOk = cards.length === need && cards.every(b => b.w >= 96 && b.h >= 96);
    const rectOk = cards.every(b => inRect(b.r, bR, 2));     // 卡 rect 落 #board 容器（纪律⑥）
    let subOk = true;                                        // multi 提交钮在场且 ≥64（SPEC 触摸目标下限）
    if (q && q.kind === 'multi') {
      subOk = !submitBtn.classList.contains('hidden') &&
              submitBtn.offsetWidth >= 64 && submitBtn.offsetHeight >= 64;
    } else subOk = submitBtn.classList.contains('hidden');
    const sceneOk = svgh >= 120 && sc.w >= 64 && sc.h >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const g2 = $id('game');
    const ox = Math.max(g2.scrollWidth - g2.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');
    return { vp: w + 'x' + h + (port ? ' port' : ''), flat: flat, kind: kind || q.kind,
             cards: cards.length, svgH: svgh,
             hitOk: hitOk, rectOk: rectOk, subOk: subOk, sceneOk: sceneOk,
             contrast: cB && cS, ox: ox,
             pass: ok && hitOk && rectOk && subOk && sceneOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  sims.push(await simView(1280, 800, false, 0, null));
  sims.push(await simView(800, 1180, true, 0, null));
  sims.push(await simView(1280, 800, false, 5, 'anti'));
  sims.push(await simView(800, 1180, true, 5, null));        // q0=anti
  sims.push(await simView(1280, 800, false, 5, 'multi'));
  sims.push(await simView(800, 1180, true, 5, 'multi'));
  sims.push(await simView(1280, 800, false, 15, 'comp'));
  sims.push(await simView(800, 1180, true, 15, null));       // q0=comp
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  document.body.classList.remove('port');
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑬ clips：sen_ 39 条（r11 33+T46 语义句 6）+ core 3 条全注入 + duration 辨别器（±60ms 全表） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const senKeys = ['sen_tut_watch', 'sen_tut_turn', 'sen_hint', 'sen_right', 'sen_wrong',
                   'sen_q1', 'sen_q2', 'sen_q3', 'sen_q_not', 'sen_q_not2',
                   'sen_q_cov1', 'sen_q_cov2', 'sen_mw',
                   'sen_again_sense', 'sen_again_thing', 'sen_again_multi',
                   'sen_again_cov', 'sen_anti_base', 'sen_anti_tail']
                   .concat(SPEC_SENSES.concat(SPEC_THINGS).concat(Object.keys(SPEC_MULTI))
                   .map(w => 'sen_n_' + w));
  const needAll = senKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 42 &&
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
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

  /* ---- ⑭ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑮ 契约 A/B/E/F/I/J/K/N 源码断言（script[2]=纯 data+engine+main——verify 独立第 4 块，无自匹配恒真，审查 m-1）
     + 存档 v1.0（家族 C：core VER='1.0' + kidsgame_ 存档键 + init senses） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.senses && sv.senses.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 9800') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcN = src.indexOf('window.SE =') >= 0 && src.indexOf('__seDemoR') >= 0;   // N 配套：钩子真实页暴露+教学实证
  const srcT = src.indexOf('const estMs = n => n * 345 + 600;') >= 0;     // T：estMs 定版字面（r11）
  const srcG2 = src.indexOf('q._miss >= 2') >= 0;         // miss≥2=正确卡 breathe（答案级梯度在场）
  const srcMs = src.indexOf('q.kind !== \'multi\' && wrongChainUntil') >= 0;   // I 补：multi 勾选豁免窗不吞
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'senses'") >= 0;             // C：本款存档键 kidsgame_senses
  const srcOk = srcA && srcB && srcE && srcF && srcI && srcJ && srcK && srcN &&
                srcT && srcG2 && srcMs && srcC;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, C: srcC, E: srcE, F: srcF,
                     I: srcI, J: srcJ, K: srcK, N: srcN, T: srcT, grad: srcG2, msGuard: srcMs };

  /* ---- ⑯ 章末预告 C7 独立硬编码对账 + off-by-one 哨兵 + 生成关 nextHint 实算对账
     哨兵纪律（r7-r10 ⑦）：先断言四章文案两两互异（找到撞点总集）——若全同则负断言空转必 fail ---- */
  total++;
  const hs = [1, 2, 3, 4].map(i => CHAPTERS[i].hint);
  const pairwiseDiff = hs.every((a, i) => hs.every((b, j) => i === j || a !== b));
  const tableEq = [1, 2, 3, 4].every(i => CHAPTERS[i].hint === SPEC_CHAPTER_HINTS[i]) &&
                  GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                  GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3];
  const endOk = pairwiseDiff && tableEq &&
                 nextHint(4) === SPEC_CHAPTER_HINTS[1] &&       // ch1 末预告=CHAPTERS[1].hint（文案预告 ch2 anti）
                 nextHint(9) === SPEC_CHAPTER_HINTS[2] &&       // ch2 末预告=CHAPTERS[2].hint（预告 ch3 comp）
                 nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                 nextHint(19) === SPEC_CHAPTER_HINTS[4] &&
                 nextHint(4) !== CHAPTERS[2].hint &&            // off-by-one 哨兵：≠下一章末预告（+1 位）
                 nextHint(9) !== CHAPTERS[3].hint &&
                 nextHint(14) !== CHAPTERS[4].hint &&
                 nextHint(14) !== CHAPTERS[1].hint;             // ≠上一章末预告（-1 位，双向哨兵）
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  if (endOk && genOk) npass++;
  units.hints = { ok: endOk && genOk, pairwiseDiff: pairwiseDiff, tableEq: tableEq,
                  chapters: hs, gen: GEN_HINTS };

  /* ---- ⑰ estMs 语音窗动态断言（b25 定版：窗 ≥ estMs/链实长；clip 实长 _clipdur32.json
     +T46 六键 ffprobe。错链尾段 T46 clip 化——实长口径取代 estMs 字数口径）
     单选确认链=sen_right 2256+150+名音 max 1872 → 窗 4600 ≥ 4578；
     multi 确认链=2256+3×(150+感官名音 max 1440)+300=7326 → 窗 7400；
     错链（四族，T46 实长）：fs=1656+150+1872+150+2640+300=7768 / ft=1656+150+1440+150+2184+300=6870 /
     multi=1824+150+1560+150+2976+300=6960 / anti（最长 5 段）=1656+150+1440+150+2880+150+1440+150+1248+300=9564 /
     comp=1656+150+1440+150+3264+300=6960 —— 豁免窗 9800（T46：anti 拆三段后 9500 不够）≥ 全族 ---- */
  total++;
  const maxName = SPEC_DUR.sen_n_star;                    // 全名音 max 1872（_clipdur32）
  const maxSenseName = SPEC_DUR.sen_n_hand;               // 感官名音 max 1440
  const maxMName = SPEC_DUR.sen_n_kitten;                 // 多感官名音 max 1560
  const wcFS = SPEC_DUR.sen_wrong + 150 + maxName + 150 + SPEC_DUR.sen_again_sense + 300;
  const wcFT = SPEC_DUR.sen_wrong + 150 + maxSenseName + 150 + SPEC_DUR.sen_again_thing + 300;
  const wcMU = SPEC_DUR.sen_mw + 150 + maxMName + 150 + SPEC_DUR.sen_again_multi + 300;
  const wcAN = SPEC_DUR.sen_wrong + 150 + maxSenseName + 150 + SPEC_DUR.sen_anti_base + 150 +
               maxSenseName + 150 + SPEC_DUR.sen_anti_tail + 300;
  const wcCO = SPEC_DUR.sen_wrong + 150 + maxSenseName + 150 + SPEC_DUR.sen_again_cov + 300;
  const winOk = (1600 + 3000) >= SPEC_DUR.sen_right + 150 + maxName + 300 &&   // 单选判对窗 4600 ≥ 4578
                (1600 + 5800) >= SPEC_DUR.sen_right + 3 * (150 + maxSenseName) + 300 &&   // multi 判对窗 7400 ≥ 7326
                3900 >= SPEC_DUR.sen_n_bell + 150 + SPEC_DUR.sen_q1 + 300 &&   // 教学开题链演示窗 ≥ 3834
                3000 >= SPEC_DUR.sen_tut_watch + 300 &&                        // 教学名音演示延 ≥ 2892
                2150 >= SPEC_DUR.sen_tut_turn + 300 &&                         // turn 后读题延 ≥ 2124
                (2620 + 400) >= SPEC_DUR.sen_right + 300 &&                    // winFlow ≥ 2556
                9800 >= wcFS && 9800 >= wcFT && 9800 >= wcMU &&
                9800 >= wcAN && 9800 >= wcCO;
  const estData = { confirmWin: 4600, confirmNeed: SPEC_DUR.sen_right + 150 + maxName + 300,
                    multiConfirmWin: 7400,
                    multiConfirmNeed: SPEC_DUR.sen_right + 3 * (150 + maxSenseName) + 300,
                    tutChainWin: 3900, tutChainNeed: SPEC_DUR.sen_n_bell + 150 + SPEC_DUR.sen_q1 + 300,
                    watchT: 3000, turnDelay: 2150, rightFlow: 3020,
                    wrongChain: 9800,
                    chainNeedFS: wcFS, chainNeedFT: wcFT, chainNeedMU: wcMU,
                    chainNeedAN: wcAN, chainNeedCO: wcCO };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑱ r11 认知建模硬断言：40 关逐关 modeled ≥40000（SPEC 独立表已在 ① 复算；
     此处独立副本逐档再列——静态四档各 5 关+生成 20 关全过） ---- */
  total++;
  const modFlats = [];
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const s2 = L.quizzes.reduce((a, q) => a + SPEC_MODELED[famTok(q.kind)], 0);
    if (s2 < SPEC_MODELED_FLOOR || s2 !== modeledLevelMs(L)) modFlats.push(flat + ':' + s2);
  }
  const chSums = [1, 2, 3, 4].map(d => SPEC_CH_FAMILY[d].reduce((a, f) => a + SPEC_MODELED[f], 0));
  const modeledOk = modFlats.length === 0 && chSums.every(s2 => s2 >= SPEC_MODELED_FLOOR);
  if (modeledOk) npass++;
  units.modeled = { ok: modeledOk, bad: modFlats.slice(0, 4), chSums: chSums,
                    floor: SPEC_MODELED_FLOOR };

  /* ---- ⑲ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'senses', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__seVlog = out;                          // 外部断言挂点（任务书钩子）
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
