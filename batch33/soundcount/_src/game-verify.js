/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch 静态 1+flat//5+生成 1-4）/
     引擎直驱（逐题点应选卡→right/末题 done→全关 3 星；r24 countdual 两步：
     第一步 'half'→第二步 right/done）
   ② SPEC 表独立对账（SPEC_NUMS/SPEC_HI/SPEC_DUR/SPEC 域表——verify 内从
     SPEC-BATCH33 §0.79/§4+SPEC-R24 文字独立重列，不引用引擎 NUMS5/NUMS_HI/VOICE/
     HIT_GAP）× 40 关全题：数字域 1-5（大域带 6-10）/ 候选互异含真值按章 2-3-4 卡 /
     answer 独立复算 / ch1 counthear N∈2-3 / ch2 counthear N∈3-4 / ch3 恒 countmix
     N∈3-5 M∈1-2 N+M≤6 / ch4 r24 固定谱（qi0/2/4 counthear N∈6-10 候选⊆{6..10} +
     qi1/3 countdual N∈3-5≠M∈2-4 候选⊆{1..5} 含双真值）/ 击序 seq 对账（'d' 数==count、
     'b' 数==mix、长度==count+mix、counthear 恒全 'd'）
   ③ 聚合独占票：dch4 每关谱构成（恰 3 counthear+恰 2 countdual、qi 奇偶对应）/
     生成关 dch1-4 全现
   ④ tapOpt 单元（flat0 counthear 2 卡）：越界=null；错=wrong+miss+1+错链两段
     [sc_wrong,sc_hint]（全 clip 无 keyless——契约 N）+首错自动重播（bounce 复位重数）；
     locked 窗内紧邻二击 false；对=right 推进+确认链 [sc_right,sc_n_<count>]
   ⑤ countmix 单元（flat10 ch3）：seq 与 count·mix 对账+铃图在场/miss≥2 正确卡
     breathe（答案级梯度）+豁免窗 3930 真时钟（窗内二错吞、窗后二错照计 miss）
   ⑥ 帧内容断言（契约 M：渲染即引擎）：数字卡 DOM 数==opts.len、每卡 data-num==
     opts[i].num 且圆点 .dot 数==num（6-10 双行五点阵同口径）、题面 data-kind==quiz.kind、
     鼓图 g[data-anim] 在场、countmix/countdual 铃图显示/counthear 铃图隐藏、
     q-text 按 kind（countdual 第二步=铃铛响了几下）——flat0 2 卡/flat5 3 卡/
     flat10 countmix 4 卡/flat15 dch4 大域 4 卡
   ⑦ 教学链三段（看→帮→独）：tutorialWatch() 真实走完（stub 存档）→
     __scDemoR==='right' 且 tut='help'（turn 2 下迷你关）；turn 题点对 → __scTutSolo
     且进正式关（flat=0 n=5），watch 折算真实时长 ≤16s
   ⑧ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑨ UI 冒烟：flat0 autoSolve（taps=5 恒 3★）/ flat5 autoSolve / flat10 先 1 错
     再 autoSolve（miss=1 → 2★）
   ⑩ 布局：双 viewport（1280×800/800×1180）×（flat0/flat5/flat12/flat15）：数字卡
     ≥96×96、鼓图 SVG ≥120px 高、描边对比度 ≥3:1、overflowX ≤0
   ⑪ clips：sc_ 13 条 + core 3 条全注入（子集式 ≥16——r24 新 7 键主线注册后 23 亦过）
     + duration 辨别器（_clipdur33 实长 ±60ms，13 键实长子集）
   ⑫ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑬ 契约 A/B/C/E/F/I/J/K/L/M/N 源码断言（读自身合并 script 文本；B 含救援双锚
     14s/30s；L=NUM_TEXT 覆盖 1-10 全量；M=__scBounceN 击序对账锚）+ r24 锚
     （pureOf/half 分支/dual 末步名音=铃数/答案级带锚重播）
   ⑭ 章末预告 C7 独立硬编码对账（hint[i]↔CHAPTERS[i+1]）+ 生成关 nextHint 实算对账
   ⑮ estMs 语音窗动态断言：判对窗 4600 ≥ 2304+150+1416+300=4170；错链豁免窗 3930 ==
     1656+150+1824+300（SPEC §4 精确值）；教学 watch 延 3450 ≥ 3144+300；turn 延
     2200 ≥ 1896+300；问句窗 2148 ≥ max(q1 1752,q2 1848)+300；r24 q3 窗 2600 ≥
     实长 2016+300=2316（注册后主线实测替换推导式）；celebrate 3020 ≥
     2304+300=2604
   ⑯ SPEED=0.12 提速断言
   ⑰ 重播节流：SC.replay() 起播 true+视锚重放（bounce 复位重数）+紧邻二次 false
     （3s 节流）+sc_replay clip 实播（voiceHist 在场）
   ⑱ 契约 M 击序视锚帧内容：播放期鼓 bounce 次数==count（播放器计数+DOM
     animationstart 双向对账）；countmix 只 bounce 鼓击（bounce==count ≠ count+mix）
   ⑲ r24 纯听撤锚单元（flat15 dch4）：播放期 .listening 耳徽标在场+整题 drum-b 动画
     0 次+__scBounceN==count（击计数在、视锚撤）+count∈6-10+候选 ⊆6-10+sc_ears 实播
   ⑳ r24 countdual 两步单元（flat15 qi1 真实 UI）：第一步 tapOpt='half'→phase=1+
     data-phase+q-text 切铃铛+sc_q3 实播 → 第二步错卡 wrong 不换步 → 第二步对
     'right' 推进+确认链尾名音=sc_n_<mix>（末步真值=铃数）
   ㉑ r24 救援两级单元（flat15，SC._forceIdle/_rescueCore 直调——r23 登记项④落地）：
     14s 方向级=纯听重播（bounce=0）；30s 答案级=正确卡 breathe+带锚重播（bounce>0）
     ——方向级不给/答案级可给分层实证
   结果写 #verify-result + window.__scVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH33 §0.79/§1/§4 + SPEC-R24-SOUNDCOUNT 文字独立重列（禁抄页面 NUMS5/NUMS_HI/VOICE/NUM_TEXT/常量） */
  const SPEC_NUMS = [1, 2, 3, 4, 5];             // 数字域封闭 1-5（dch1-3/countdual）
  const SPEC_HI = [6, 7, 8, 9, 10];              // r24 dch4 counthear 大域带
  const SPEC_NUM_TEXT = { 1: '一下', 2: '两下', 3: '三下', 4: '四下', 5: '五下',
                          6: '六下', 7: '七下', 8: '八下', 9: '九下', 10: '十下' };   // 契约 L（r24 扩 1-10）
  const SPEC_DUR = { sc_tut_watch: 3144, sc_tut_turn: 1896, sc_hint: 1824,
                     sc_right: 2304, sc_wrong: 1656, sc_q1: 1752, sc_q2: 1848,
                     sc_replay: 1656,
                     sc_n_1: 1320, sc_n_2: 1368, sc_n_3: 1416, sc_n_4: 1416, sc_n_5: 1320,
                     /* r24 新 7 键注册后主线实长回填（2026-09-20，_clipdur33 mutagen 实测） */
                     sc_ears: 3192, sc_q3: 2016,
                     sc_n_6: 1368, sc_n_7: 1368, sc_n_8: 1344, sc_n_9: 1344, sc_n_10: 1440 };
  const SPEC_CHAPTER_HINTS = { 1: '卡片变多了，仔细听再点', 2: '小铃铛来啦，只数鼓声哦',
                               3: '鼓不跳了，用耳朵数大数字', 4: '新一轮听音计数' };
  const SPEC_GEN_HINTS = ['两张卡里选数字', '三张卡里选数字',
                          '只数鼓声，别数铃铛', '用耳朵数大数字'];
  const SPEC_Q_TEXT = { counthear: '敲了几下呀', countmix: '鼓敲了几下',
                        dualA: '鼓敲了几下', dualB: '铃铛响了几下' };   // countdual 两步（r24）
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const SPEC_MAXNAME = 1440;                      // 名音全集 max（r24 注册后=sc_n_10 实长，_clipdur33）
  const unlocked = async () => {                  // 等击段播放/演出/错反馈窗结束（verify 提速后）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即 return
     丢弃后续段——本款全链 clip 段（keylessLast 对任意链恒 false=全 clip 无 keyless 安全） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);

  /* ---- ①② 40 关全量审计 + SPEC 表独立对账 ---- */
  const genDch = {}, planBad4 = [];
  let tableOk = true, badCase = null;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, k);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = flat < 20 ? L1.dch === Math.floor(flat / 5) + 1   // 静态四档
                           : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* 引擎直驱：逐题点应选卡 → right / 末题 done；全关零错=3 星；
       r24 countdual 两步：第一步 'half'（不推进）→第二步 right/done */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      if (q.kind === 'countdual') {
        const a1 = engTapOpt(L3, correctIdx(q));       // 第一步（鼓，phase 0）
        const a2 = engTapOpt(L3, correctIdx(q));       // 第二步（铃，phase 1）
        if (a1 !== 'half' || a2 !== exp || q._miss !== 0) { driveOk = false; break; }
      } else {
        const r = engTapOpt(L3, q.answer);
        if (r !== exp || q._miss !== 0) { driveOk = false; break; }
      }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;

    /* SPEC 表独立对账（每题：数字域/候选按章互异含真值/answer 复算/章型域/
       countmix 先验/r24 dch4 固定谱+大域带+countdual 先验/击序 seq 对账） */
    let specOk = true;
    let nCH = 0, nDual = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const isCH = q.kind === 'counthear';
      const isDual = q.kind === 'countdual';
      if (isCH) nCH++;
      if (isDual) nDual++;
      if (L1.dch === 1 && (!isCH || q.count < 2 || q.count > 3 || q.opts.length !== 2))
        { badCase = 'dch1 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 2 && (!isCH || q.count < 3 || q.count > 4 || q.opts.length !== 3))
        { badCase = 'dch2 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 3 && (isCH || isDual || q.opts.length !== 4))
        { badCase = 'dch3 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch >= 4 && q.opts.length !== 4)
        { badCase = 'dchLen ' + flat + '/' + k; specOk = false; break; }
      if (isCH) {
        if (q.mix !== 0) { badCase = 'chMix ' + flat + '/' + k; specOk = false; break; }
        /* r24：dch4 固定谱 qi0/2/4=counthear 大域 N∈6-10；qi1/3=countdual */
        if (L1.dch === 4 && (k % 2 !== 0 || q.count < 6 || q.count > 10))
          { badCase = 'dch4CH ' + flat + '/' + k; specOk = false; break; }
      } else if (isDual) {
        if (L1.dch !== 4 || k % 2 !== 1)              // countdual 仅 dch4 且 qi1/3
          { badCase = 'dch4Dual ' + flat + '/' + k; specOk = false; break; }
        if (q.count < 3 || q.count > 5 || q.mix < 2 || q.mix > 4 || q.count === q.mix ||
            q.phase !== 0)
          { badCase = 'dualPrior ' + flat + '/' + k; specOk = false; break; }
      } else {                                    // countmix 先验：N∈3-5/M∈1-2/N+M≤6（仅 dch3）
        if (L1.dch !== 3 || q.count < 3 || q.count > 5 || q.mix < 1 || q.mix > 2 || q.count + q.mix > 6)
          { badCase = 'mixPrior ' + flat + '/' + k; specOk = false; break; }
      }
      /* 击序 seq 对账（SPEC §1 钩子契约：'d'/'b' 数组） */
      if (!Array.isArray(q.seq) || q.seq.length !== q.count + q.mix ||
          q.seq.filter(x => x === 'd').length !== q.count ||
          q.seq.filter(x => x === 'b').length !== q.mix ||
          q.seq.some(x => x !== 'd' && x !== 'b'))
        { badCase = 'seq ' + flat + '/' + k; specOk = false; break; }
      if (isCH && q.seq.some(x => x !== 'd'))
        { badCase = 'seqPure ' + flat + '/' + k; specOk = false; break; }
      /* 候选：互异含真值；r24 候选带按 kind（dch4 counthear ⊆{6..10}，余 ⊆{1..5}，
         countdual 恒含 count 与 mix 双真值）；answer=真值卡下标独立复算 */
      const vals = q.opts.map(o => o.num);
      const pool = (isCH && L1.dch === 4) ? SPEC_HI : SPEC_NUMS;
      let poolOk = true;
      for (const v of vals) if (pool.indexOf(v) < 0) poolOk = false;
      if (!poolOk || new Set(vals).size !== vals.length || vals.indexOf(q.count) < 0 ||
          (isDual && vals.indexOf(q.mix) < 0))
        { badCase = 'opt ' + flat + '/' + k; specOk = false; break; }
      let expAns = -1;
      for (let j = 0; j < vals.length; j++) if (vals[j] === q.count) expAns = j;
      if (expAns < 0 || q.answer !== expAns)
        { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
    }
    if (!specOk) tableOk = false;
    if (L1.dch === 4 && (nCH !== 3 || nDual !== 2)) planBad4.push(flat);   // r24 固定谱构成
    if (flat >= 20) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  kinds: L1.quizzes.map(q => (q.kind === 'counthear' ? 'hear' :
                                    q.kind === 'countmix' ? 'mix' : 'dual') + ':' + q.count +
                                             (q.mix ? '+' + q.mix : '')) };
    if (flat < 20) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ③ 聚合独占票：dch4 固定谱构成（恰 3 counthear+恰 2 countdual）/ 生成关四型全现 ---- */
  total++;
  const aggOk = tableOk && planBad4.length === 0 &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, planBad4: planBad4, genDch: genDch };

  /* ---- ④ tapOpt 单元（flat0 counthear 2 候选）---- */
  total++;
  startLevel(0);
  await unlocked();
  const q4 = window.SC.quiz;
  const initOk = q4 && q4.kind === 'counthear' && q4.count >= 2 && q4.count <= 3 &&
                 q4.mix === 0 && q4.seq.length === q4.count &&
                 q4.opts.length === 2 &&
                 q4.opts.every(o => SPEC_NUMS.indexOf(o.num) >= 0) &&
                 q4.opts[q4.answer].num === q4.count &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await window.SC.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex((o, i) => i !== q4.answer);        // 错卡（2 选 1 的另一张）
  const pW = window.SC.tapOpt(wA);                                // → wrong（首错自动重播窗，fire-and-forget）
  const rejW = await window.SC.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue.length === 2 &&
                window.__lastQueue[0] === 'sc_wrong' &&           // 错链头=wrong clip（manifest 文案）
                window.__lastQueue[1] === 'sc_hint' &&            // 首错语义句=hint「再听一遍呀」（clip 段）
                window.__lastQueue.every(p => typeof p === 'string') &&   // 全 clip 无 keyless（契约 N）
                !keylessLast(window.__lastQueue);
  const reBounce = window.__scBounceN === q4.count;               // 首错自动重播=视锚重放（bounce 复位重数）
  const s1 = rW === 'wrong' && rejW === false && chainA && reBounce &&
             window.SC.quiz.miss === 1 && window.SC.currentLevel.miss === 1;
  const rR = await window.SC.tapOpt(q4.answer);
  const chainR = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'sc_right' &&          // 确认链=sc_right+数字名音（全 clip）
                 window.__lastQueue[1] === 'sc_n_' + q4.count;
  const s2 = rR === 'right' && chainR && window.SC.quiz.step === 1 && window.SC.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1,
                chain: chainA, reBounce: reBounce, right: s2, chainR: chainR };

  /* ---- ⑤ countmix 单元（flat10 ch3 恒 countmix）：seq 对账+豁免窗 3930+breathe 梯度 ---- */
  total++;
  startLevel(10);
  await unlocked();
  const qm = window.SC.quiz;
  const mixShape = qm && qm.kind === 'countmix' && qm.count >= 3 && qm.count <= 5 &&
                   qm.mix >= 1 && qm.mix <= 2 && qm.count + qm.mix <= 6 &&
                   qm.seq.length === qm.count + qm.mix &&
                   qm.seq.filter(x => x === 'd').length === qm.count &&
                   qm.seq.filter(x => x === 'b').length === qm.mix &&
                   qm.opts.length === 4 && qm.opts[qm.answer].num === qm.count;
  const bellShown = !!document.querySelector('#bell-wrap') &&
                    getComputedStyle(document.querySelector('#bell-wrap')).display !== 'none';
  const wC = qm.opts.findIndex((o, i) => i !== qm.answer);
  const rC = await window.SC.tapOpt(wC);                          // 首错（豁免窗起播）
  const chainM = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'sc_wrong' && window.__lastQueue[1] === 'sc_hint';
  const miss1 = window.SC.quiz.miss === 1;
  const rejM = await window.SC.tapOpt(wC) === false;              // 错链豁免窗内（locked/豁免）二错吞
  await new Promise(w => setTimeout(w, 4100));                    // 等错链豁免窗（真时钟 3930）过——
                                                                 // 窗后第二错照计 miss=2（梯度可达）
  const wD = qm.opts.findIndex((o, i) => i !== qm.answer && i !== wC);
  const rD = await window.SC.tapOpt(wD);
  const brEl = cardEl(qm.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe'); // miss≥2=正确卡 breathe（答案级梯度）
  const miss2 = rD === 'wrong' && window.SC.quiz.miss === 2;       // 第二次错=miss 2（卡不灰可重选）
  const rE = await window.SC.tapOpt(qm.answer);
  const mixOk = mixShape && bellShown && rC === 'wrong' && chainM && miss1 &&
                rejM && miss2 && breathe2 && rE === 'right';
  if (mixOk) npass++;
  units.tapMix = { ok: mixOk, shape: mixShape, bell: bellShown, chain: chainM,
                   miss1: miss1, rejInWin: rejM, miss2: miss2, breathe2: breathe2, right: rE };

  /* ---- ⑥ 帧内容断言（契约 M：渲染即引擎——数字卡 DOM==opts.len+data-num+圆点数==num+
     题面 kind+鼓图锚+铃图显示态+q-text 按 kind） ---- */
  total++;
  const frameCheck = q => {
    const cards = Array.from(boardEl.querySelectorAll('.card'));
    const domOk = cards.length === q.opts.length &&
      cards.every((c, i) => Number(c.dataset.num) === q.opts[i].num &&
        c.querySelectorAll('svg').length === 1 &&
        c.querySelectorAll('.dot').length === q.opts[i].num);     // 圆点数==数字（6-10 双行同口径）
    const drum = sceneEl.querySelector('#drum-wrap svg > g[data-anim]');
    const drumOk = !!drum && drum.dataset.anim === 'drum';        // 鼓视锚锚
    const kindOk = sceneEl.dataset.kind === q.kind;
    const bw = document.querySelector('#bell-wrap');
    const bellOk = (q.kind === 'countmix' || q.kind === 'countdual')
      ? (!!bw && getComputedStyle(bw).display !== 'none')          // countmix/countdual 铃身份图显示
      : (!!bw && getComputedStyle(bw).display === 'none');         // counthear 铃隐藏
    const txt = sceneEl.querySelector('.q-text').textContent;
    const wantTxt = q.kind === 'counthear' ? SPEC_Q_TEXT.counthear
      : q.kind === 'countmix' ? SPEC_Q_TEXT.countmix
      : (q.phase === 1 ? SPEC_Q_TEXT.dualB : SPEC_Q_TEXT.dualA);   // r24 dual 两步问句
    const txtOk = txt.indexOf(wantTxt) >= 0;
    return domOk && drumOk && kindOk && bellOk && txtOk;
  };
  startLevel(0);                                        // dch1 counthear 2 卡
  const fA = frameCheck(window.SC.quiz) && boardEl.querySelectorAll('.card').length === 2;
  startLevel(5);                                        // dch2 counthear 3 卡
  const fB = frameCheck(window.SC.quiz) && boardEl.querySelectorAll('.card').length === 3;
  startLevel(10);                                       // dch3 countmix 4 卡
  await unlocked();
  const fC = frameCheck(window.SC.quiz) && boardEl.querySelectorAll('.card').length === 4;
  startLevel(15);                                       // r24 dch4 大域 counthear 4 卡（qi0）
  await unlocked();
  const fD = frameCheck(window.SC.quiz) && boardEl.querySelectorAll('.card').length === 4 &&
             window.SC.quiz.count >= 6;                 // 大域腿（候选 ⊆6-10 在 ⑪① 对账）
  const frameOk = fA && fB && fC && fD;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, dch1: fA, dch2: fB, countmix: fC, dch4: fD };

  /* ---- ⑦ 教学链三段（看→帮→独）：tutorialWatch 真实走完 → __scDemoR='right'（演示点
     数字 3 卡）→ tut='help'（turn=2 下迷你关）；turn 题点对 → __scTutSolo + 进正式关 ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  window.__scTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__scWatchMs || 1e9) / SPEED;       // watch 段实测（家族预算 ≤16s 只罩 watch；
                                                             // turn 含 presentQuiz 开题另计）
  const tutHelp = window.__scDemoR === 'right' && state.tut === 'help' &&
                window.SC.currentLevel.flat === -1 && window.SC.quiz.count === 2 &&
                window.SC.quiz.seq.join('') === 'dd' &&
                twWatch <= 16000 && tw <= 24000;
  await unlocked();
  const qT = window.SC.quiz;                                // "帮"阶段放手题（turn 2 下）
  const rT = await window.SC.tapOpt(qT.answer);             // 首次选对 → 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__scTutSolo === true &&
                window.SC.currentLevel.flat === 0 && window.SC.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__scDemoR, tut: state.tut,
                     solo: window.__scTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT };

  /* ---- ⑧ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  await unlocked();
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await window.SC.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await window.SC.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && window.SC.quiz.step === 0 && window.SC.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑨ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await window.SC.autoSolve();
  const lv0 = window.SC.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑨ UI 冒烟 B：flat5（dch2 counthear 3 卡）autoSolve 通关 ---- */
  total++;
  startLevel(5);
  const a5 = await window.SC.autoSolve();
  const smokeB = a5.done && a5.taps === 5 && window.SC.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat5 = { ok: smokeB, taps: a5.taps };

  /* ---- ⑨ UI 冒烟 C：flat10（dch3 countmix）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const q10 = window.SC.quiz;
  const wrongC = q10.opts.findIndex((o, i) => i !== q10.answer);
  const r10 = await window.SC.tapOpt(wrongC);
  const a10 = await window.SC.autoSolve();
  const lv10 = window.SC.currentLevel;
  const smokeC = r10 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat10 = { ok: smokeC, r10: r10, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑩ 布局：双 viewport ×（flat0 / flat5 / flat12） ---- */
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
    const need = window.SC.quiz ? window.SC.quiz.opts.length : 4;   // ch1=2 / ch2=3 / 其余=4
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const dsvg = sceneEl.querySelector('#drum-wrap svg');
    const dvh = dsvg ? Math.round(dsvg.getBoundingClientRect().height) : 0;   // SVGElement 无 offsetHeight
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length === need && cards.every(b => b.w >= 96 && b.h >= 96);   // 数字卡=主答案按钮
    const sceneOk = dvh >= 120 && sc.w >= 64 && sc.h >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cards: cards.length, drumH: dvh,
             hitOk: hitOk, sceneOk: sceneOk, contrast: cB && cS, ox: ox,
             pass: hitOk && sceneOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 12, 15]) {                // r24 +flat15（dch4 大域 4 卡）
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

  /* ---- ⑪ clips：sc_ 20 条 + core 3 条全注入（子集式 ≥16：r24 新 7 键主线注册后 23 亦过）
     + duration 辨别器（_clipdur33 实长 ±60ms，20 键全量——r24 注册后主线实长回填 SPEC_DUR） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const scKeys = Object.keys(SPEC_DUR);
  const needAll = scKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length >= 16 &&
    needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(scKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[scKeys[i]]) <= 60);
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

  /* ---- ⑬ 契约 A/B/C/E/F/I/J/K/L/M/N 源码断言（读自身合并 script 文本——第 3 个 script 块）
     + 存档 v1.0（家族 C：core VER='1.0' + kidsgame_ 存档键 + init soundcount）
     r24②（审查 m2 收口）：script[2] 含 verify 自身文本，检索串一律拼接式防直接字面自匹配
     恒真（假绿）；GEN_HINTS 式/__scBounceN/__scDemoR/pureOf 四符号 verify 功能代码与注释
     亦含，检索串取 main 特有形态（nextHint 三元右支/计数递增点/demoR 赋值点/pureOf 定义行）---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextH' + 'int: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextH' + 'int: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('last' + 'Dir') >= 0 && src.indexOf('last' + 'Act') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.' + 'now() - last' + 'Dir > 14000)') >= 0 &&
               src.indexOf('idle > 30' + '000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.soundcount && sv.soundc' + 'ount.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('CHAPTERS[ci + 1].hint : ' + 'GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1（main nextHint 三元右支特异形态）
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.' + 'now() + 3930') >= 0 &&
               src.indexOf('if (Date.' + 'now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrong' + 'ChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.' + 'now() < wrongChainUntil && i !== correctIdx(q)') >= 0;   // I 补：豁免窗 guard（r24 phase 感知）
  const srcJ = src.indexOf('now - lastWrongVoice > 10' + '000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-ce" + "lebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescue' + 'Tick()') >= 0;   // K：面板守卫+命名函数
  const srcL = Object.keys(NUM_TEXT).length === 10 &&                    // L：数字/量词表覆盖 1-10 全量（r24 扩）
               SPEC_NUMS.concat(SPEC_HI).every(n => NUM_TEXT[n] === SPEC_NUM_TEXT[n]);
  const srcM = src.indexOf('window.__scBounceN = (window.' + '__scBounceN || 0) + 1') >= 0;   // M：击序视锚计数锚（main 递增点特异形态）
  const srcN = src.indexOf('window.SC' + ' =') >= 0 && src.indexOf('window.__scDemoR = de' + 'moR') >= 0;   // N 配套：钩子真实页暴露+教学实证（SC 钩子+demoR 赋值点）
  const srcRp = src.indexOf('VOICE.replay' + '.key') >= 0;                // sc_replay clip 实际使用
  const srcR24 = src.indexOf('const pur' + 'eOf') >= 0 &&                 // r24：纯听判定在场（定义行特异形态）
               src.indexOf("if (q.kind === 'countdual' && q." + 'phase === 0)') >= 0 &&   // half 转步分支
               src.indexOf("q.kind === 'countdual' ? q." + 'mix : q.count') >= 0 &&       // 末步名音=铃数
               src.indexOf('doReplay(false, pureOf' + '(cur))') >= 0;     // 答案级带锚重播分层
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core，coreSrc 不含 verify 文本免拼接）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'sound" + "count'") >= 0;   // C：本款存档键 kidsgame_soundcount
  const srcOk = srcA && srcB && srcE && srcF && srcI && srcJ && srcK && srcL && srcM && srcN &&
                srcRp && srcR24 && srcC;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, C: srcC, E: srcE, F: srcF,
                     I: srcI, J: srcJ, K: srcK, L: srcL, M: srcM, N: srcN, replay: srcRp,
                     r24: srcR24 };

  /* ---- ⑭ 章末预告 C7 独立硬编码对账 + 生成关 nextHint 实算对账 ---- */
  total++;
  const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                 CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                 CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                 CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                 GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                 GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                 nextHint(4) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完）预告 ch2 文案
                 nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                 nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                 nextHint(19) === SPEC_CHAPTER_HINTS[4];
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑮ estMs 语音窗动态断言（b25 定版：窗 ≥ estMs/链实长；clip 实长 _clipdur33.json）
     确认链=sc_right 2304+150+名音 max 1440=3870 → 演出窗 4600 ≥ 4194（r24 注册后实长）；
     错链豁免窗 3930 == wrong 1656+150+hint 1824+300（SPEC §4 精确值，过短掐链/过长吞二错）；
     教学演示延/turn 延/问句窗/celebrate 窗各 ≥ clip+300 ---- */
  total++;
  const winOk = (1600 + 3000) >= SPEC_DUR.sc_right + 150 + SPEC_MAXNAME + 300 &&   // 判对窗 4600 ≥ 4194
                3930 === SPEC_DUR.sc_wrong + 150 + SPEC_DUR.sc_hint + 300 &&       // 豁免窗=错链+300 精确
                3450 >= SPEC_DUR.sc_tut_watch + 300 &&                             // 教学演示延 ≥ 3444
                2200 >= SPEC_DUR.sc_tut_turn + 300 &&                              // turn 后击段延 ≥ 2196
                2148 >= Math.max(SPEC_DUR.sc_q1, SPEC_DUR.sc_q2) + 300 &&          // 问句窗 ≥ 2148
                2600 >= SPEC_DUR.sc_q3 + 300 &&                                    // r24 q3 窗 ≥ 实长 2016+300=2316（注册后实测替换推导式）
                (2620 + 400) >= SPEC_DUR.sc_right + 300;                           // winFlow ≥ 2604
  const estData = { confirmWin: 4600, confirmNeed: SPEC_DUR.sc_right + 150 + SPEC_MAXNAME + 300,
                    wrongChain: 3930, chainNeed: SPEC_DUR.sc_wrong + 150 + SPEC_DUR.sc_hint + 300,
                    watchT: 3450, turnDelay: 2200, askWin: 2148, q3Win: 2600, q3Need: SPEC_DUR.sc_q3 + 300,
                    rightFlow: 3020 };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑯ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑰ 重播节流：SC.replay() 整段重播+视锚重放，3s 节流内二次 false ---- */
  total++;
  startLevel(12);
  await unlocked();
  const rr1 = await window.SC.replay();          // 起播 true（击段+问句重播）
  const rr2 = await window.SC.replay();          // 3s 节流内紧邻二次= false
  const replayBounce = window.__scBounceN === window.SC.quiz.count;   // 重播=视锚重放
  const replaySaid = (window.__voiceHist || []).indexOf('sc_replay') >= 0;   // sc_replay clip 实播
  const replayOk = rr1 === true && rr2 === false && replayBounce && replaySaid;
  if (replayOk) npass++;
  units.replay = { ok: replayOk, first: rr1, second: rr2,
                   bounce: replayBounce, said: replaySaid };

  /* ---- ⑱ 契约 M 击序视锚帧内容：播放期鼓 bounce 次数==count（播放器计数+DOM
     animationstart 双向对账）；countmix 只 bounce 鼓击（==count ≠ count+mix） ---- */
  total++;
  let domB = 0;
  const onAnim = e => { if (e.animationName === 'drum-b') domB++; };
  document.addEventListener('animationstart', onAnim);
  startLevel(0);                                 // counthear（count∈2-3）
  await unlocked();
  const qA = window.SC.quiz;
  const mA = qA.kind === 'counthear' && window.__scBounceN === qA.count && domB === qA.count;
  domB = 0;
  startLevel(5);                                 // counthear（count∈3-4，与 flat0 域错开）
  await unlocked();
  const qB5 = window.SC.quiz;
  const mB = window.__scBounceN === qB5.count && domB === qB5.count;   // flat0/flat5 域错开（2-3 vs 3-4），不同 count 交叉对账
  domB = 0;
  startLevel(10);                                // countmix：bounce==count 而非 count+mix
  await unlocked();
  const qC10 = window.SC.quiz;
  const mC = qC10.kind === 'countmix' && qC10.mix > 0 &&
             window.__scBounceN === qC10.count &&
             window.__scBounceN !== qC10.count + qC10.mix &&   // 只 bounce 鼓击（铃击不 bounce）
             domB === qC10.count;
  document.removeEventListener('animationstart', onAnim);
  const anchorOk = mA && mB && mC;
  if (anchorOk) npass++;
  units.anchor = { ok: anchorOk, counthear0: mA, counthear5: mB,
                   countA: qA.count, countB: qB5.count,
                   countmix: mC, count: qC10.count, mix: qC10.mix, bounces: window.__scBounceN };

  /* ---- ⑲ r24 纯听撤锚单元（flat15 dch4 qi0）：播放期 .listening 耳徽标在场+
     整题 drum-b 动画 0 次+__scBounceN==count（击计数在、视锚撤）+count∈6-10+
     候选 ⊆6-10+sc_ears 实播（verify 页 stub 无档=每次触发） ---- */
  total++;
  let domAnch = 0;
  const onAnch = e => { if (e.animationName === 'drum-b') domAnch++; };
  document.addEventListener('animationstart', onAnch);
  startLevel(15);
  { let wg19 = 0;                                             // ears 预告窗后进击段（.listening 挂上）
    while (!sceneEl.classList.contains('listening') && wg19++ < 300) await wait(25); }
  const listeningOn = sceneEl.classList.contains('listening');
  await unlocked();
  const q19 = window.SC.quiz;
  const hiOk = q19 && q19.kind === 'counthear' && q19.count >= 6 && q19.count <= 10 &&
               q19.opts.length === 4 &&
               q19.opts.every(o => SPEC_HI.indexOf(o.num) >= 0) &&
               q19.opts[q19.answer].num === q19.count;
  const noAnchor = window.__scBounceN === q19.count && domAnch === 0;   // 击计数在、视锚撤
  const earsSaid = (window.__voiceHist || []).indexOf('sc_ears') >= 0;
  document.removeEventListener('animationstart', onAnch);
  const pureOk = listeningOn && hiOk && noAnchor && earsSaid;
  if (pureOk) npass++;
  units.pure = { ok: pureOk, listening: listeningOn, hi: hiOk, noAnchor: noAnchor,
                 count: q19 && q19.count, bounces: window.__scBounceN, ears: earsSaid };

  /* ---- ⑳ r24 countdual 两步单元（flat15 qi1 真实 UI）：第一步 tapOpt='half'→phase=1
     +data-phase+q-text 切铃铛+sc_q3 实播 → 第二步错卡 wrong 不换步 → 第二步对
     'right' 推进+确认链尾名音=sc_n_<mix>（末步真值=铃数） ---- */
  total++;
  const r20a = await window.SC.tapOpt(q19.answer);           // qi0 答对 → 'right'（演出+开题）
  await unlocked();                                          // quiz1=countdual 开题完成
  const qd = window.SC.quiz;
  const dualShape = qd && qd.kind === 'countdual' && qd.phase === 0 &&
                    qd.count >= 3 && qd.count <= 5 && qd.mix >= 2 && qd.mix <= 4 &&
                    qd.count !== qd.mix &&
                    qd.seq.length === qd.count + qd.mix &&
                    qd.seq.filter(x => x === 'd').length === qd.count &&
                    qd.seq.filter(x => x === 'b').length === qd.mix &&
                    qd.opts.length === 4 &&
                    qd.opts.every(o => SPEC_NUMS.indexOf(o.num) >= 0) &&
                    qd.opts[qd.answer].num === qd.count;
  const bellShownD = !!document.querySelector('#bell-wrap') &&
                     getComputedStyle(document.querySelector('#bell-wrap')).display !== 'none';
  const rHalf = await window.SC.tapOpt(qd.answer);           // 第一步（鼓）→ 'half'
  await unlocked();                                          // 第二步问句窗（q3 2600）结束
  const phase1 = window.SC.quiz.phase === 1 &&
                 window.SC.quiz.opts[window.SC.quiz.answer].num === qd.mix &&
                 sceneEl.dataset.phase === '1' &&
                 sceneEl.querySelector('.q-text').textContent.indexOf(SPEC_Q_TEXT.dualB) >= 0 &&
                 (window.__voiceHist || []).indexOf('sc_q3') >= 0;
  const wD20 = qd.opts.findIndex(o => o.num !== qd.mix);     // 第二步必错卡（≠当前步真值）
  const rWrong2 = await window.SC.tapOpt(wD20);              // 第二步错 → wrong（miss=1 不换步）
  const wrongKeep = rWrong2 === 'wrong' && window.SC.quiz.step === 1 &&
                    window.SC.quiz.miss === 1 && window.SC.quiz.phase === 1;
  await unlocked();                                          // 错链+首错自动重播窗收尾
  const rRight2 = await window.SC.tapOpt(window.SC.quiz.answer);   // 第二步对 → 'right' 推进
  const chainD = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'sc_right' &&
                 window.__lastQueue[1] === 'sc_n_' + qd.mix; // 末步名音=铃数（r24）
  const adv2 = rRight2 === 'right' && window.SC.quiz.step === 2;
  const dualOk = r20a === 'right' && dualShape && bellShownD && rHalf === 'half' &&
                 phase1 && wrongKeep && chainD && adv2;
  if (dualOk) npass++;
  units.dual = { ok: dualOk, first: r20a, shape: dualShape, bell: bellShownD,
                 half: rHalf === 'half', phase1: phase1, wrongKeep: wrongKeep,
                 chain: chainD, adv: adv2 };

  /* ---- ㉑ r24 救援两级单元（flat15，SC._forceIdle/_rescueCore 直调——r23 登记项④
     落地）：14s 方向级=纯听重播（bounce=0）+重播完成 idle 不归零（审查M1 r24 行为断言：
     keepIdle 生效——否则 30s 答案级每 14s 被清零永不可达）；30s 答案级=正确卡 breathe+
     带锚重播（bounce>0）——方向级不给/答案级可给分层实证 ---- */
  total++;
  let domR21 = 0;
  const onR21 = e => { if (e.animationName === 'drum-b') domR21++; };
  document.addEventListener('animationstart', onR21);
  startLevel(15);                                            // 回 flat15 首题（counthear 大域）
  await unlocked();
  window.SC._forceIdle(15000);                               // 模拟 14s+ 空闲（方向级域）
  window.SC._rescueCore();
  await wait(500);                                           // 纯听重播进行中（6-10 击×84ms）
  const dirPure = domR21 === 0 && window.__scBounceN > 0;    // 方向级：击计数在、零 bounce
  await unlocked();                                          // 等重播+问句收尾（locked 复位）
  const idleKept = window.SC._idle() > 14000;                // 审查M1：重播完成 idle 须仍 >14s
  window.SC._forceIdle(31000);                               // 模拟 30s+ 空闲（答案级域）
  const brEl21 = cardEl(window.SC.quiz.answer);
  window.SC._rescueCore();
  await wait(600);                                           // 带锚重播进行中（首击即 bounce）
  const ansBreathe = !!brEl21 && brEl21.classList.contains('breathe');
  const ansBounce = domR21 > 0;                              // 答案级：视锚回归
  await unlocked();
  document.removeEventListener('animationstart', onR21);
  const rescueOk = dirPure && idleKept && ansBreathe && ansBounce;
  if (rescueOk) npass++;
  units.rescueLvl = { ok: rescueOk, dirPure: dirPure, idleKept: idleKept,
                     ansBreathe: ansBreathe, ansBounce: ansBounce };

  const out = { game: 'soundcount', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__scVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）并留播报历史
     （__voiceHist——sc_replay 实播证据）；voice.queue 记录拼播链（__lastQueue） */
  window.__voiceHist = [];
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) {
    window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null;
    if (k) window.__voiceHist.push(k);
  };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
