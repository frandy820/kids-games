/* ================= ?verify=1 自检（仅 verify 分支加载执行；SPEC-R36-SIGN §R8）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 逐题 + levelWhy 关级构成全 null）/ 章号映射（ch=flat/5+1，
     dch 静态 (ch-1)%4+1 / 生成关随机 1-4 钩子直读——b25 坑④）/ 引擎直驱（逐题点
     应选卡→right/末题 done→全关 3 星；mean/act 同判通吃）
   ② 封闭集独立对账：SPEC_SIGN24/SPEC_NEAR9/SPEC_WALK5/SPEC_DENY15/SPEC_M/SPEC_ACT/
     SPEC_SENT/SPEC_FAM/SPEC_GUIDE（verify 内从 SPEC-R36 §R1 文字独立重列，不引用
     引擎 SIGNS/NEAR/池/ACT）× 40 关全题：标志 ∈ 封闭 24 表 / 卡 ∈ 封闭 24 且 4 卡
     互异 / 恰 1 卡 meaning=sign / ch1 目标+卡 ⊆ 行走安全 5 池 / ch2 目标 ∈ 红圈黄三
     角 15 池 / ch3 每题近对在场 / ch4 每关近对在场 ≥3 / 映射唯一（24 m + 24 ACT +
     24 sent 互异且页表=SPEC 表逐条一致；ACT 与 m 零碰撞；fam 七族对账）
   ③ ch3 近对在场专项（flat10-14 五关全题）+ 生成关 dch==3 关计数（近对亦必在场）
   ④ 点卡单元（flat0 真实 UI 状态机）：非法下标=false；错=wrong+miss+1+1000ms
     防重入窗（fire-and-forget 首击+窗内二击被拦——b25 坑①方法学）+ 反馈链绑定题面
     标志 fam（__lastQueue=['sgn_wrong', {key:'sgn_guide_'+fam, text:SPEC_GUIDE[fam]}]
     ——T46 阶段2 键化口径，r36 修复基线存量红 key===null 旧断言）；对=right 推进；
     换题 miss 清零
   ⑤ 教学链：tutorialWatch() 真实走完（stub 存档）→ __sgDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；flat0 题0 恒 light mean 不闪（锚点）
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump 微动效（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=5，恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3 近对）先点 1 次错卡再 autoSolve（miss=1 → 2 星）
   ⑯ act 行为题单元（flat17 dch4）：驱动至 act 题——kind='act'/题面条=act 文案/
     board.act 类/4 卡标签=SPEC_ACT 表/speakQuiz 直调 __lastVoiceKey='sgn_q_act'/
     错行为卡 wrong+对行为卡推进（单判定点）
   ⑰ flash 闪现单元（flat5 dch2）：驱动至 flash 位——遮面前无 on/1800×SPEED=216ms
     后 .on 在场/非 flash 题无遮面 DOM/reflashCover 直调=揭面→144ms 后复遮/
     遮面期点卡可判（wrong 照常）
   ⑨ 章分布聚合：dch1 行走 5 全集轮换出场 / dch2 目标 ⊆ 禁令 15 + 闪现 2×5=10 /
     dch3 目标 ⊆ 近对 18 + 闪现 5 / dch4 act=10+boss=5+近对 ≥3/关 / 生成关四型全现
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（flat0 ch1 / flat17 ch4 驱动至
     act 题量长标签）：卡 ≥96×96（主答案 §0.9）、题面卡 ≥64、overflowX ≤0、
     描边对比度 ≥3:1
   ⑪ clips：sgn_ 6 条 + core 3 条全注入 + **计数 41（sgn_sent_24/sgn_guide_7+sgn_q_act
     ——r36 注册后联动定版，审查 M1 勘正）** + 时长身份
     辨别器 + child SVG 双人自检
   ⑫ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑬ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1
   ⑭ verify 提速断言：SPEED=0.12
   ⑮ 语音窗动态断言（b25 estMs 定版：estMs(n)=n*345+600）：判对演出窗 5400 ≥
     estMs(最长 sent 10 字)；教学演示窗 3900 ≥ 3456+300；turn 延 2200 ≥ 1872+300；
     winFlow 3020 ≥ 2448+300；错链豁免 7000 ≥ 2808+150+estMs(引导句最长 9 字)+300
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-R36-SIGN §R1 文字独立重列（禁抄页面 SIGNS/NEAR/池/ACT/文案） */
  const SPEC_SIGN24 = ['light', 'zebra', 'bridge', 'tunnel', 'walk', 'noentry', 'nocar', 'noped',
                       'nobike', 'horn', 'stop', 'yield', 'ped', 'child', 'work', 'slow',
                       'cross', 'turn', 'slip', 'rail', 'oneway', 'straight', 'goleft', 'goright'];
  const SPEC_NEAR = { noentry: 'nocar', nocar: 'noentry', noped: 'nobike', nobike: 'noped',
                      stop: 'yield', yield: 'stop', ped: 'child', child: 'ped',
                      cross: 'turn', turn: 'cross', slip: 'slow', slow: 'slip',
                      oneway: 'straight', straight: 'oneway', goleft: 'goright', goright: 'goleft',
                      zebra: 'walk', walk: 'zebra' };
  const SPEC_WALK5 = ['light', 'zebra', 'bridge', 'tunnel', 'walk'];        // ch1 行走安全 5
  const SPEC_DENY15 = ['noentry', 'nocar', 'noped', 'nobike', 'horn', 'stop', 'yield',
                       'ped', 'child', 'work', 'slow', 'cross', 'turn', 'slip', 'rail']; // ch2
  const SPEC_M = { light: '看灯走', zebra: '走斑马线', bridge: '走天桥', tunnel: '走地下道',
                   walk: '只能走路', noentry: '不能通行', nocar: '车不能进', noped: '行人禁入',
                   nobike: '单车禁行', horn: '禁按喇叭', stop: '停下看路', yield: '先让一让',
                   ped: '注意行人', child: '前方儿童', work: '前方施工', slow: '慢慢走',
                   cross: '路口小心', turn: '急转弯', slip: '路滑慢走', rail: '小心火车',
                   oneway: '只往前走', straight: '只准直行', goleft: '往左转', goright: '往右转' };
  const SPEC_ACT = { light: '红灯等绿灯走', zebra: '走斑马线过街', bridge: '从天桥过街',
                     tunnel: '从地下道过街', walk: '慢慢走不跑', noentry: '绕开这里走',
                     nocar: '汽车绕开走', noped: '不走这条路', nobike: '不骑车进去',
                     horn: '不按喇叭', stop: '停一停再走', yield: '让别的人先走',
                     ped: '注意来往的人', child: '小心小朋友', work: '绕开工地走',
                     slow: '放慢速度走', oneway: '顺着箭头走', straight: '一直走不转弯',
                     goleft: '往左边转弯', goright: '往右边转弯', cross: '路口看两边',
                     turn: '转弯慢一点', slip: '路滑小心走', rail: '一停二看三过' };
  const SPEC_SENT = { light: '红灯停，绿灯行', zebra: '过马路，走斑马线', bridge: '过马路，走天桥',
                      tunnel: '过马路，走地下通道', walk: '蓝牌子，这里只能走',
                      noentry: '红圈圈，这里不能走', nocar: '红圈白杠，车不能进',
                      noped: '红圈圈，行人不能进', nobike: '红圈圈，自行车不能进',
                      horn: '红圈圈，不能按喇叭', stop: '红八角，停下看一看',
                      yield: '红倒三角，先让一让', ped: '黄三角，前方有行人',
                      child: '黄三角，前方有小朋友', work: '黄三角，前方在施工',
                      slow: '黄三角，要慢慢走', cross: '黄三角，前面是路口',
                      turn: '黄三角，路要转弯', slip: '黄三角，路滑慢点走',
                      rail: '黄三角，小心火车', oneway: '蓝牌子，只往前走',
                      straight: '蓝圆圈，只准直行', goleft: '蓝圆圈，往左转弯',
                      goright: '蓝圆圈，往右转弯' };
  const SPEC_FAM = { light: 'signal', zebra: 'blue', bridge: 'blue', tunnel: 'blue', walk: 'blue',
                     noentry: 'red', nocar: 'red', noped: 'red', nobike: 'red', horn: 'red',
                     stop: 'redoct', yield: 'redtri', ped: 'yellow', child: 'yellow',
                     work: 'yellow', slow: 'yellow', cross: 'yellow', turn: 'yellow',
                     slip: 'yellow', rail: 'yellow', oneway: 'blue', straight: 'bluec',
                     goleft: 'bluec', goright: 'bluec' };
  const SPEC_GUIDE = { red: '红圈圈说，不能做', redoct: '红八角说，停下来',
                       redtri: '红倒三角说，让一让', yellow: '黄三角说，要小心',
                       blue: '蓝牌子说，这样走', bluec: '蓝圆圈说，这样走',
                       signal: '看看灯的颜色再走' };
  const SPEC_ACTQ = '看到这个标志，怎么做';
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const nearInCards = q => q.cards.some(c => c.meaning !== q.sign && c.meaning === SPEC_NEAR[q.sign]);
  /* 驱动至谓词命中题（逐题点正确卡推进；act/flash 单元与布局 flat17 用） */
  async function driveTo(flat, pred) {
    startLevel(flat);
    for (let k = 0; k < CH_LEN; k++) {
      const q = cur && cur.quizzes[cur.step];
      if (!q) return false;
      if (pred(q)) return true;
      const r = await SG.tapCard(correctIdx(q));
      if (r !== 'right' && r !== 'done') return false;
    }
    return false;
  }

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dch1Seen = [], dch2Seen = {}, dch3TargetOk = { ok: true }, dch4Near = [], dch4Act = [],
        genDch = {}, genDch3Lv = [];
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (levelWhy(L1)) ruleOk = false;                 // 关级构成律（§R2 谱）
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* 引擎直驱：逐题点应选卡 → right / 末题 done；全关零错=3 星（mean/act 同判） */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const i = correctIdx(q);
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapCard(L3, i);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 章分布聚合（⑨ 数据源） */
    if (L1.dch === 1) dch1Seen.push(L1.quizzes.map(q => q.sign));
    if (L1.dch === 2) L1.quizzes.forEach(q => { dch2Seen[q.sign] = (dch2Seen[q.sign] || 0) + 1; });
    if (L1.dch === 3) L1.quizzes.forEach(q => {          // 目标 ∈ 近对池 18 + 伙伴在场
      if (SPEC_NEAR[q.sign] === undefined || !nearInCards(q)) dch3TargetOk.ok = false;
    });
    if (L1.dch === 4) {
      dch4Near.push(L1.quizzes.filter(q => nearInCards(q)).length);
      dch4Act.push(L1.quizzes.filter(q => q.kind === 'act').length);
    }
    if (flat >= STATIC_LEVELS) {
      genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
      if (L1.dch === 3) genDch3Lv.push(flat);
    }
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   signs: L1.quizzes.map(q => q.sign),
                   kinds: L1.quizzes.map(q => q.kind),
                   flashes: L1.quizzes.map(q => !!q.flash),
                   nearCount: L1.quizzes.filter(q => nearInCards(q)).length };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  /* dch1 聚合从 SPEC 推导：池 5 = 5 题旋转 → 每关 5 全集出场且互异（构造性） */
  const dch1AggOk = dch1Seen.every(arr => {
    const d = arr.filter((v, i, a) => a.indexOf(v) === i);
    return d.length === 5 && SPEC_WALK5.every(k => arr.indexOf(k) >= 0);   // 5 全集轮换出场
  });
  const distOk = dch1AggOk &&
                 Object.keys(dch2Seen).length >= 10 &&                         // dch2 目标取材多样（全在 15 池）
                 dch3TargetOk.ok &&                                           // dch3 目标全为近对标志且伙伴在场
                 dch4Near.every(n => n >= 3) && dch4Act.every(n => n === 2) && // dch4 近对 ≥3 / act 恰 2
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;  // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, dch1FullSet: dch1AggOk, dch2Distinct: Object.keys(dch2Seen).length,
                 dch3Target: dch3TargetOk.ok, dch4NearCounts: dch4Near, dch4ActCounts: dch4Act,
                 genDch: genDch };

  /* ---- ② 封闭集独立对账（SPEC 表独立重列 × 40 关全题 + 三表映射唯一） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (SPEC_SIGN24.indexOf(q.sign) < 0) { badCase = 'sign ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.cards.length !== 4) { badCase = 'len ' + flat + '/' + k; tableOk = false; break outer; }
      const ms = q.cards.map(c => c.meaning);
      if (ms.filter((v, i, a) => a.indexOf(v) === i).length !== 4) { badCase = 'dup ' + flat + '/' + k; tableOk = false; break outer; }
      for (let j = 0; j < 4; j++) {
        if (SPEC_SIGN24.indexOf(ms[j]) < 0) { badCase = 'card ' + flat + '/' + k + '/' + j; tableOk = false; break outer; }
      }
      if (ms.filter(v => v === q.sign).length !== 1) { badCase = 'ansN ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 1) {                        // ch1：目标+卡 ⊆ 行走安全 5 池（SPEC ch1）
        if (SPEC_WALK5.indexOf(q.sign) < 0) { badCase = 'dch1pool ' + flat + '/' + k; tableOk = false; break outer; }
        if (!ms.every(v => SPEC_WALK5.indexOf(v) >= 0)) { badCase = 'dch1set ' + flat + '/' + k; tableOk = false; break outer; }
      }
      if (L.dch === 2 && SPEC_DENY15.indexOf(q.sign) < 0) { badCase = 'dch2pool ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 3 && !nearInCards(q)) { badCase = 'near3 ' + flat + '/' + k; tableOk = false; break outer; }
    }
    if (L.dch === 4 && L.quizzes.filter(q => nearInCards(q)).length < 3) {
      badCase = 'near4 ' + flat; tableOk = false; break;
    }
  }
  /* 映射唯一（24 m 互异 + 24 ACT 互异 + ACT∩m=∅ + 24 sent 互异 + 页表=SPEC 表逐条
     一致 + fam 归属一致 + GUIDE 七族 + act 题面句） */
  const mVals = Object.keys(SIGNS).map(k => SIGNS[k].m);
  const aVals = Object.keys(ACT).map(k => ACT[k]);
  const sVals = Object.keys(SIGNS).map(k => SIGNS[k].sent);
  const uniqueOk = new Set(mVals).size === 24 && new Set(sVals).size === 24 &&
    Object.keys(SPEC_M).length === 24 &&
    new Set(aVals).size === 24 && Object.keys(SPEC_ACT).length === 24 &&
    aVals.every(v => mVals.indexOf(v) < 0) &&                    // ACT 与 m 零碰撞
    SPEC_SIGN24.every(k => ACT[k] === SPEC_ACT[k] &&
                           SIGNS[k].m === SPEC_M[k] && SIGNS[k].sent === SPEC_SENT[k] &&
                           SIGNS[k].fam === SPEC_FAM[k] && FAMS.indexOf(SIGNS[k].fam) >= 0) &&
    Object.keys(GUIDE).every(k => GUIDE[k] === SPEC_GUIDE[k]) &&
    ACT_Q.text === SPEC_ACTQ;
  /* 形状颜色先验族成员对账（红圈 5 / 红八角 1 / 红倒三角 1 / 黄三角 8 / 蓝底方 5 /
     蓝圆圈 3 / 信号灯 1） */
  const famCnt = {};
  SPEC_SIGN24.forEach(k => { famCnt[SPEC_FAM[k]] = (famCnt[SPEC_FAM[k]] || 0) + 1; });
  const famOk = famCnt.red === 5 && famCnt.redoct === 1 && famCnt.redtri === 1 &&
                famCnt.yellow === 8 && famCnt.blue === 5 && famCnt.bluec === 3 &&
                famCnt.signal === 1;
  if (tableOk && uniqueOk && famOk) npass++;
  units.table = { ok: tableOk && uniqueOk && famOk, bad: badCase, unique: uniqueOk, fam: famOk };

  /* ---- ③ ch3 近对在场专项（flat10-14 五关全题 + 生成关 dch==3 亦在场） ---- */
  total++;
  const nearDetail = [];
  let near3Ok = true;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    if (L.dch !== 3) { near3Ok = false; break; }
    const pairs = L.quizzes.map(q => q.sign + '>' + SPEC_NEAR[q.sign] + ':' + (nearInCards(q) ? 'in' : 'MISS'));
    if (!pairs.every(p => p.endsWith(':in'))) near3Ok = false;
    nearDetail.push(pairs);
  }
  for (const flat of genDch3Lv) {                // 生成关 dch==3 的关：近对同样必在场（b25 坑④扩展）
    const L = genLevel(flat);
    if (!L.quizzes.every(q => nearInCards(q))) { near3Ok = false; nearDetail.push(['gen' + flat + ' MISS']); }
  }
  if (near3Ok) npass++;
  units.near3 = { ok: near3Ok, detail: nearDetail, genDch3: genDch3Lv };

  /* ---- ④ 点卡单元（flat0 真实 UI 状态机：错窗防重入 / 反馈链绑定题面 fam / miss 口径）
     防重入测法（b25 坑①）：tapX 的 promise 在错窗结束才 resolve——测窗内二击必须
     fire-and-forget 首击（不 await）+ 紧邻二击 ---------- */
  total++;
  startLevel(0);
  const q4 = SG.quiz;
  const initOk = q4 && q4.sign === 'light' && q4.meaning === 'light' &&
                 q4.kind === 'mean' && q4.flash === false && q4.cards.length === 4 &&
                 q4.cards.map(c => c.id).join() === 's0,s1,s2,s3' &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await SG.tapCard(99)) === false;           // 非法下标=false（不炸）
  const wrongs = q4.cards.map((c, i) => ({ m: c.meaning, i: i })).filter(x => x.m !== q4.sign);
  const wA = wrongs[0], wB = wrongs[1];                       // 两张不同错卡（4 卡互异）
  const pW = SG.tapCard(wA.i);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await SG.tapCard(wA.i);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const famA = SPEC_FAM[q4.sign];                             // flat0 题0=light → signal
  const chainA = window.__lastQueue && window.__lastQueue[0] === 'sgn_wrong' &&   // 反馈链=sgn_wrong+引导句（键化口径）
                window.__lastQueue[1] && window.__lastQueue[1].key === 'sgn_guide_' + famA &&
                window.__lastQueue[1].text === SPEC_GUIDE[famA];     // 绑题面标志 fam
  const s1 = rW === 'wrong' && rejW === false && chainA &&    // 错#1 后立即快照（miss=1）
             SG.quiz.miss === 1 && SG.currentLevel.miss === 1;
  const pW2 = SG.tapCard(wB.i);                               // 同题点另一错卡
  const rW2 = await pW2;
  const s1b = rW2 === 'wrong' && SG.quiz.miss === 2;          // 第二次错=miss 2（卡不灰可重选）
  const rR = await SG.tapCard(q4.cards.findIndex(c => c.meaning === q4.sign));
  const s2 = rR === 'right' && SG.quiz.step === 1 && SG.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s1b && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1, wrongB: s1b,
                chain: chainA, right: s2 };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __sgDemoR='right'（演示认红绿灯） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__sgDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].sign === 'light' &&
                cur.quizzes[0].kind === 'mean' && !cur.quizzes[0].flash && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__sgDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await SG.tapCard(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await SG.tapCard(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && SG.quiz.step === 0 && SG.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await SG.autoSolve();
  const lv0 = SG.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3 近对）先点 1 次错卡再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = SG.quiz;
  const wrongC = q8.cards.findIndex(c => c.meaning !== q8.sign);
  const r8 = await SG.tapCard(wrongC);
  const a10 = await SG.autoSolve();
  const lv10 = SG.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑯ act 行为题单元（flat17 dch4 驱动至 act 题） ---- */
  total++;
  const actReached = await driveTo(17, q => q.kind === 'act');
  const qa = SG.quiz;
  const labels = Array.prototype.map.call(boardEl.querySelectorAll('.card .m-label'), el => el.textContent);
  const actCardsOk = actReached && qa && qa.kind === 'act' && qa.flash === false &&
    boardEl.classList.contains('act') &&                    // 行为卡排类标记
    labels.length === 4 &&
    qa && labels.every((t, i) => t === SPEC_ACT[qa.cards[i].meaning]) &&   // 4 标签=SPEC_ACT 表（含正确行为）
    document.querySelector('#scene .q-text').textContent.indexOf(SPEC_ACTQ) >= 0;  // 题面条=act 文案
  speakQuiz();                                               // 直调：verify 页 renderQuiz 不发声（VERIFY 门）
  const actVoiceKey = window.__lastVoiceKey;
  const actVoiceOk = actVoiceKey === 'sgn_q_act';            // act 题面句键（TODO 注册前 stub 键序仍可断言）
  const wAct = qa ? qa.cards.findIndex(c => c.meaning !== qa.sign) : -1;
  let actWrongOk = false;
  if (wAct >= 0) {                                           // 错行为卡：wrong（fire-and-forget）
    await SG.tapCard(wAct);
    actWrongOk = !!SG.quiz && SG.quiz.miss === 1 && SG.quiz.step === 0;   // 单判定点：错不推进不卡死
  }
  const a17 = await SG.autoSolve();                          // 收尾通关（act/mean 混合）
  const actOk = actCardsOk && actVoiceOk && actWrongOk && a17.done;
  if (actOk) npass++;
  units.act = { ok: actOk, reached: actReached, voiceKey: actVoiceKey,
                labels: labels, wrongMiss: SG.currentLevel.miss, solved: a17.done,
                qText: document.querySelector('#scene .q-text').textContent };

  /* ---- ⑰ flash 闪现单元（flat5 dch2 驱动至 flash 位） ---- */
  total++;
  const flashReached = await driveTo(5, q => q.flash);
  const qf = SG.quiz;
  const cover = sceneEl.querySelector('.flash-cover');
  const coverThere = flashReached && !!qf && qf.flash && !!cover && !cover.classList.contains('on');   // 亮相期未遮
  await wait(600);                                           // 1800×SPEED=216ms 后必遮（余量）
  const coveredNow = !!(cover && cover.classList.contains('on'));
  const reOk = reflashCover();                               // 救援重闪直调：揭面
  const revealed = reOk && !!(cover && !cover.classList.contains('on'));
  await wait(400);                                           // 1200×SPEED=144ms 后复遮
  const recovered = !!(cover && cover.classList.contains('on'));
  const wf = qf ? qf.cards.findIndex(c => c.meaning !== qf.sign) : -1;
  let rf = null, flashTapOk = false;
  if (wf >= 0) {                                             // 遮面期点卡可判（凭记忆作答）
    rf = await SG.tapCard(wf);
    flashTapOk = rf === 'wrong' && !!SG.quiz && SG.quiz.miss === 1;
  }
  const a5 = await SG.autoSolve();                           // 收尾通关
  const noFlashDom = (await driveTo(6, q => !q.flash && q.kind === 'mean')) ?
    !sceneEl.querySelector('.flash-cover') : false;
  const flashOk = coverThere && coveredNow && revealed && recovered && flashTapOk && a5.done && noFlashDom;
  if (flashOk) npass++;
  units.flash = { ok: flashOk, reached: flashReached, covered: coveredNow,
                  reflash: reOk, recovered: recovered, tapWhileCovered: rf, solved: a5.done,
                  nonFlashNoDom: noFlashDom };

  /* ---- ⑩ 布局：双 viewport ×（flat0 ch1 / flat17 ch4 驱动至 act 题量长标签） ---- */
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
  async function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    if (g._simFlat === 17) await driveTo(17, q => q.kind === 'act');   // 量 act 长标签形态
    else startLevel(g._simFlat);
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length === 4 && cards.every(b => b.w >= 96 && b.h >= 96);
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
  for (const flat of [0, 17]) {
    $id('game')._simFlat = flat;
    sims.push(await simView(1280, 800));
    sims.push(await simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑪ clips：sgn_ 6 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4 ±60ms，审查 m3）
         + child SVG 双人自检（审查 M5）
         计数 41（sgn_sent_24/sgn_guide_7+sgn_q_act；r36 注册后联动定版，审查 M1 勘正） ---------- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['sgn_tut_watch', 'sgn_tut_turn', 'sgn_hint', 'sgn_right', 'sgn_wrong', 'sgn_q',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = keys.length === 41 &&
    keys.filter(k => k.indexOf('sgn_sent_') === 0).length === 24 &&
    keys.filter(k => k.indexOf('sgn_guide_') === 0).length === 7 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durSpec = { sgn_tut_watch: 3456, sgn_tut_turn: 1872, sgn_hint: 2448,
                    sgn_right: 2448, sgn_wrong: 2808, sgn_q: 2544,
                    sgn_sent_nobike: 3120, sgn_guide_redtri: 2760, sgn_q_act: 2856 };  /* r36 新键实长（审查 M6：最长 10 字 sent/9 字 guide/act 题面句；主线 mutagen 实测） */
  const durKeys = Object.keys(durSpec);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - durSpec[durKeys[i]]) <= 60);
  const childFig2 = (SIGN_ELS.child.match(/<circle/g) || []).length === 2;   // 双头圆=双人奔跑，红点已删（M5）
  const clipsOk = preOk && durOk && childFig2;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs, childFig2: childFig2 };

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
  const hintOk = CHAPTERS[1].hint.indexOf('红圈') >= 0 && CHAPTERS[1].hint.indexOf('黄三角') >= 0 &&   // 预告 ch2 红圈黄三角
                 CHAPTERS[2].hint.indexOf('像') >= 0 && CHAPTERS[2].hint.indexOf('仔细') >= 0 &&     // 预告 ch3 近对辨析
                 CHAPTERS[3].hint.indexOf('挑战') >= 0 && CHAPTERS[3].hint.indexOf('怎么做') >= 0 &&  // 预告 ch4 混合+行为
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                                              // 预告生成关
                 GEN_HINTS[0].indexOf('走路') >= 0 &&                                                // dch1 行走安全
                 GEN_HINTS[1].indexOf('红圈') >= 0 &&                                                // dch2 红圈黄三角
                 GEN_HINTS[2].indexOf('像') >= 0 &&                                                  // dch3 近对辨析
                 GEN_HINTS[3].indexOf('集合') >= 0;                                                  // dch4 混合
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // 审查 M3：生成关预告=实算下一关 dch
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑭ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑮ 语音窗动态断言（b25 estMs 定版：窗 ≥ estMs(最长句)；clip 实长 SPEC §4） ---- */
  total++;
  const maxSentLen = Math.max.apply(null, SPEC_SIGN24.map(k => SPEC_SENT[k].length));   // 最长含义句（10 字）
  const maxGuideLen = Math.max.apply(null, Object.keys(SPEC_GUIDE).map(k => SPEC_GUIDE[k].length)); // 最长引导句（9 字）
  const winOk = (1800 + 3600) >= estMs(maxSentLen) &&   // 判对演出窗 5400 ≥ estMs(10 字)=4050
                (900 + 3000) >= 3456 + 300 &&           // 教学演示窗 t=3900 ≥ watch 3456+300
                2200 >= 1872 + 300 &&                   // turn 后读题延 ≥ 1872+300
                (2620 + 400) >= 2448 + 300 &&           // winFlow celebrate+补窗 ≥ sgn_right+300
                7000 >= 2808 + 150 + estMs(maxGuideLen) + 300;   // 错链豁免 ≥ 链总实长+300（r36 九字口径）
  const estData = { maxSentLen: maxSentLen, estMsMax: estMs(maxSentLen), rightWin: 5400,
                    watchT: 3900, turnDelay: 2200, rightFlow: 3020,
                    maxGuideLen: maxGuideLen, guideChain: 2808 + 150 + estMs(maxGuideLen) + 300 };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  const out = { game: 'sign', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录调用 key（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）
     供 ④ 反馈链绑定题面 fam 断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k) { window.__lastVoiceKey = k || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
