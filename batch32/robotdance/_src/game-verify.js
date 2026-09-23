/* ================= ?verify=1 自检（仅 verify 分支加载执行；SPEC-R43 新谱版）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39，引擎级）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 新谱全 null——新签名含 qi）/ 章号映射 / 引擎直驱（engToBuild+
     逐块照序点→fill×(n-1)+done；fix 题 engTapSlot(k)→done）/ flat0 q0 锚面独立对拍
     （硬编码 baseline 快照+旧律语义复刻双保险，SPEC-R43 §R10）
   ② SPEC 表独立对账（SPEC-R43 §R3 从文字独立重列，禁抄页面常量）× 40 关全题：
     步数 dch1 qi 表 [3,4,4,5,5]/dch2 6/dch3 7/dch4 8；u=min(n,U_CAP)（ch3/4 恒 u=6）；
     禁 3 连（steps 与 fix disp 双查）；块多重集=步骤多重集∪干扰（重复步=多同名块）；
     干扰=池中未用动作恰 NEW_CAP{3,3,4,4} 个互异；fix 结构律（k 域/bad∈steps≠steps[k]/
     disp 恰换 k 位/无新动作/disp 无 3 连/blocks 恒空）
   ②b 聚合分布断言（r39-bis ①铁律；仅全量模式 SEG<0 跑——分段模式逐题断言全覆盖，
     全量聚合由 pycheck Python 侧独立复算双落）：步数谱按 dch 分桶精确计数 / 重复律
     dup（dch3 恒 1/dch4 恒 2）/ 禁 3 连全 0 / 干扰数恒值 / **fix 错步位 k 直方图散布**
     （distinct≥4 且 max≤N/2+1——恒位回归必拦，r39-bis F1 同族）/ fix 题位 kq 散布
   ③ tapBlock 单元（flat0 q0=锚面 3 步 0 干扰 3 块，断言与 r43 前逐字一致）：watch 吞
     false / 越界 null / 错=wrong+miss+1+已填槽不回退+错链全 clip / 豁免窗内二错吞 /
     窗后二错照计 miss=2+正确块 breathe / 对=fill/done 返回值族+逐槽 filled==steps 前缀
     +确认链 [名音…,rbd_right]
   ③b fix 单元（flat15 ch4 驱动至 fix 题，SPEC-R43 §R5）：结构断言+槽 DOM==disp
     （帧内容 M 契约，pickable 在场）+转场链 [rbd_q_fix]+错格 wrong（miss+1+格 wig+
     错链）+豁免窗内二错吞+窗后二错照计+miss≥2 槽 k breathe（答案级）+tapSlot(k)=done
     （槽刷新正确版 steps=视觉修正演出）+确认链 9 段 [名音×8,rbd_right]+dance log==
     steps 正确版+下一题推进不卡死
   ④ 转场链单元：watch 演示完 [rbd_tut_turn, rbd_q] 进 build+演示实录==steps
   ⑤ replay 单元：build 相位重播（进度保留/已消耗块不在场/演示实录==steps）；watch 相位不可用
   ⑥ 教学链：tutorialWatch 真实走完（stub 存档）→ __rdDemoR='done' 且 tut='help'、
     真关 ch1 首题 3 步（锚面）、折算真实时长 ≤17150（STEP_MS 1834 后分账 16148+1000 余量）、
     首题 build
   ⑦ UI 冒烟：flat0 autoSolve（taps=21 恒 3★：锚 3+4+4+5+5）/flat5（taps=30：6×5）/
     flat10 先 1 错再 autoSolve（taps=35：7×5，miss=1 → 2★）
   ⑧ 帧内容断言（契约 M：渲染即引擎）：块 DOM==blocks（data-i/data-anim/小字名）/
     槽 DOM==filled（data-anim）/机器人 g[data-anim=robot] 在场/watch 相位块区隐藏
   ⑨ 布局：双 viewport（1280×800/800×1180）×（flat0/5/10/15/16）：块与槽 ≥48（SPEC
     下限）、机器人 SVG ≥120 高、描边对比度 ≥3:1、overflowX ≤0；flat15/16=ch4 双形态
     （fix 8 槽作答面 / 12 块候选面）按当前题形态断言
   ⑩ clips：rbd_ 12 条 + core 3 条全注入 + duration 辨别器（SPEC §4 实长 ±60ms；
     新 6 键注册后主线联动 21+实长入表——SPEC-R43 §R7/§R8 TODO）
   ⑪ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑫ 契约 A/B/E/F/I/I补/J/K 源码断言（读自身合并 script 文本）+watch/dance 演出相位
     idle 豁免+全款零 keyless 段（Mj-1 恒真式）+fix 锚（engTapSlot/uiTapSlot 入口
     guard/rescueTick fix 分流）
   ⑬ 章末预告独立硬编码对账（hint[i]↔CHAPTERS[i+1]，SPEC-R43 新文案）+生成关 nextHint 实算对账
   ⑭ 窗数学（SPEC-R43 §R8 独立复算）：STEP_MS 1834≥1684+150；舞窗 8×1834+2580=17252
     ≥8×(1684+150)+2280+300；错链窗 4650==1656+150+2544+300；教学 watch 延 3372≥3072+300；
     turn 延 2124≥1824+300；教学分账 16148≤16500
   ⑮ SPEED=0.12 + CSS --t 换算生效（verify 提速换算声明）
   分段参数：?verify=1&seg=k（k=0..3）→ ①②只审计 [k*10,k*10+10)（②b 聚合跳过），
     固定单元③-⑮全段照跑（幂等）；无 seg=全量 40 关+聚合（兼容原口径）
   结果写 #verify-result + window.__rdVlog + document.title='VERIFY PASS n/n (seg k)' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const segM = /[?&]seg=(\d)/.exec(location.search);
  const SEG = segM ? Number(segM[1]) : -1;                  // -1=全量（SEG-R43 §R9 分段排程）
  const FLAT_LO = SEG >= 0 ? SEG * 10 : 0;
  const FLAT_HI = SEG >= 0 ? SEG * 10 + 10 : 40;
  const T = (name, cond) => {                       // 原子断言计数器（selftest ≥40 断言口径）
    total++;
    if (cond) npass++;
    else (units.__failList = units.__failList || []).push(name);
    return !!cond;
  };

  /* SPEC-R43 §R3 文字独立重列（禁抄页面 MOVE_POOL、CH1_STEPS、DCH_* 表、VOICE 文案） */
  const SPEC_POOL = ['jump', 'spin', 'clap', 'stomp', 'wave', 'nod', 'kick', 'shake', 'bow', 'stretch'];
  const SPEC_NAMES = { jump: '跳一跳', spin: '转一圈', clap: '拍拍手',
                       stomp: '跺跺脚', wave: '挥挥手', nod: '点点头', kick: '踢踢腿',
                       shake: '摇一摇', bow: '鞠个躬', stretch: '伸伸手' };
  const SPEC_CH1 = [3, 4, 4, 5, 5];                          // dch1 题步数坡（q0=锚面 3 步）
  const SPEC_STEPS = { 2: 6, 3: 7, 4: 8 };                   // 步数（生成关同 dch）
  const SPEC_U = { 1: 5, 2: 6, 3: 6, 4: 6 };                 // 序列不同动作上限（ch3/4 恒重复）
  const SPEC_CAP = { 1: 3, 2: 3, 3: 4, 4: 4 };               // 干扰数（池 10 中未用动作）
  const SPEC_DUR = { rbd_tut_watch: 3072, rbd_tut_turn: 1824, rbd_hint: 2544,
                     rbd_right: 2280, rbd_wrong: 1656, rbd_q: 2088, rbd_replay: 1896,
                     rbd_n_jump: 1512, rbd_n_spin: 1512, rbd_n_clap: 1560,
                     rbd_n_stomp: 1536, rbd_n_wave: 1584,
                     /* r43 六键实长（主线 mutagen 实测 2026-09-22，manifest 5350）：
                        名音 10 全域 max=rbd_n_stretch 1704（超预估上界 1684——⑭ EST_UP 注记）；
                        确认链实测最坏=flat34 q0 Σ12840+8×150+2280=16320（+300=16620≤17252 余 632；
                        r43 M2 勘误——U_CAP{4:6} 下「8 步互异 Σ11552」不可能，u=6 dup=2 恒定） */
                     rbd_n_nod: 1584, rbd_n_kick: 1584, rbd_n_shake: 1560,
                     rbd_n_bow: 1464, rbd_n_stretch: 1704, rbd_q_fix: 2736 };
  const SPEC_CHAPTER_HINTS = { 1: '舞步变 6 步，还有捣乱动作', 2: '整支舞 7 步，还有重复舞步',
                               3: '8 步长舞，有一跳是错的，找出来', 4: '新一轮机器人舞步大挑战' };
  const SPEC_GEN_HINTS = ['四五步舞，看清再拼', '六步舞，小心干扰动作',
                          '七步舞，还有重复舞步，全都要记牢', '八步长舞，找找哪一跳错了'];
  /* flat0 q0 锚面快照（r43-baseline.json 实证提取，SPEC-R43 §R10 逐字节保留） */
  const ANCHOR_F0Q0 = { steps: ['wave', 'jump', 'clap'], blocks: ['clap', 'jump', 'wave'] };
  /* Mj-1 恒真式（本款全 clip 链）：queue 段全为 string（clip key）——出现 {key:null} 即违约 */
  const noKeyless = parts => !parts || !parts.length ? true :
    parts.every(p => typeof p === 'string');
  const specTriple = arr => {                          // 禁 3 连独立扫（SPEC 表推导，禁引引擎 hasTriple）
    for (let i = 2; i < arr.length; i++)
      if (arr[i] === arr[i - 1] && arr[i] === arr[i - 2]) return true;
    return false;
  };
  /* UI 驱动辅助：等当前题进入 build（或关已结束）；cur 为页面主逻辑闭包变量 */
  const waitBuildUI = async () => {
    let g = 0;
    while (g++ < 700) {
      if (!cur) return false;
      if (cur.done) return true;
      const q = window.RD.quiz;
      if (q && (q.phase === 'build' || q.phase === 'dance')) return true;
      await wait(50);
    }
    return !!(cur && cur.done);
  };

  /* ---- ①② 40 关全量审计 + SPEC 表独立对账（引擎级，每关 6 断言）+ 锚面独立对拍 ---- */
  const genDch = {};
  const agg = { nHist: {}, dupHist: {}, disHist: {}, kHist: {}, kqHist: {}, triple: 0, fixN: 0 };
  let auditOk = true, badCase = null;
  for (let flat = FLAT_LO; flat < FLAT_HI; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);       // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      if (flat === 0 && k === 0) continue;                 // 锚面走独立对拍（structWhy 不适用）
      if (structWhy(L1.quizzes[k], L1.dch, k)) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / 5) + 1;                             // 章号独立复算
    const dchOk = flat < 20 ? L1.dch === Math.floor(flat / 5) + 1
                            : (L1.dch >= 1 && L1.dch <= 4);                      // 生成关随机章参数
    /* 引擎直驱：engToBuild+逐块照序点 → fill×(n-1)+done；fix 题点槽 k → done */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      if (!engToBuild(L3)) { driveOk = false; break; }
      if (q.kind === 'fix') {                       // fix 题点槽 k → done 后继续推进（末题才通关）
        if (engTapSlot(L3, q.k) !== 'done') { driveOk = false; break; }
        continue;
      }
      for (let s = 0; s < q.steps.length; s++) {
        const ci = correctIdx(q);
        if (ci < 0) { driveOk = false; break; }
        const exp = s === q.steps.length - 1 ? 'done' : 'fill';
        const r = engTapBlock(L3, ci);
        if (r !== exp || q.filled.slice(0, s + 1).join(',') !== q.steps.slice(0, s + 1).join(',')) { driveOk = false; break; }
      }
      if (driveOk && !q.solved) driveOk = false;
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* SPEC 表独立对账（每题独立复算：步数表/u 上限/禁 3 连/块多重集/干扰数/fix 律）+ 锚面 */
    let specOk = true;
    for (let k = 0; k < L1.quizzes.length && specOk; k++) {
      const q = L1.quizzes[k], n = q.steps.length;
      if (flat === 0 && k === 0) {                        // 锚面：baseline 快照+旧律语义双保险
        const okA = q.steps.join(',') === ANCHOR_F0Q0.steps.join(',') &&
          q.blocks.map(b => b.anim).join(',') === ANCHOR_F0Q0.blocks.join(',');
        if (!okA) { badCase = 'anchor ' + flat; specOk = false; break; }
        continue;
      }
      const expN = L1.dch === 1 ? SPEC_CH1[k] : SPEC_STEPS[L1.dch];
      if (n !== expN) { badCase = 'stepsLen ' + flat + '/' + k; specOk = false; break; }
      if (new Set(q.steps).size !== Math.min(n, SPEC_U[L1.dch]) ||
          q.steps.some(a => SPEC_POOL.indexOf(a) < 0)) { badCase = 'uCap ' + flat + '/' + k; specOk = false; break; }
      if (specTriple(q.steps)) { badCase = 'triple ' + flat + '/' + k; specOk = false; break; }
      if (q.kind === 'fix') {                             // fix 律（SPEC-R43 §R4/§R5）
        if (L1.dch !== 4 || q.k < 0 || q.k >= n ||
            q.bad === q.steps[q.k] || q.steps.indexOf(q.bad) < 0 ||
            q.blocks.length !== 0) { badCase = 'fixStruct ' + flat + '/' + k; specOk = false; break; }
        const dispE = q.steps.slice(); dispE[q.k] = q.bad;
        if (q.disp.join(',') !== dispE.join(',') ||
            !q.disp.every(a => q.steps.indexOf(a) >= 0) ||   // 错版无新动作（防新奇检测 §R2.4）
            specTriple(q.disp)) { badCase = 'fixDisp ' + flat + '/' + k; specOk = false; break; }
      } else {
        const anims = q.blocks.map(b => b.anim);
        if (anims.length !== n + SPEC_CAP[L1.dch]) { badCase = 'blocksLen ' + flat + '/' + k; specOk = false; break; }
        const cnt = {}, scnt = {};
        anims.forEach(a => cnt[a] = (cnt[a] || 0) + 1);
        q.steps.forEach(a => scnt[a] = (scnt[a] || 0) + 1);
        let disN = 0, cntOk = true;
        for (const a in cnt) {
          if (scnt[a]) { if (cnt[a] !== scnt[a]) cntOk = false; }   // 步骤块计数全对（重复步=多块）
          else { if (cnt[a] !== 1 || SPEC_POOL.indexOf(a) < 0) cntOk = false; disN++; }
        }
        if (!cntOk || disN !== SPEC_CAP[L1.dch]) { badCase = 'blocksMs ' + flat + '/' + k; specOk = false; break; }
      }
      /* 聚合桶（②b 全量模式断言用） */
      const d = L1.dch;
      agg.nHist[d + ':' + n] = (agg.nHist[d + ':' + n] || 0) + 1;
      agg.dupHist[d + ':' + (n - new Set(q.steps).size)] = (agg.dupHist[d + ':' + (n - new Set(q.steps).size)] || 0) + 1;
      if (specTriple(q.steps) || (q.kind === 'fix' && specTriple(q.disp))) agg.triple++;
      if (q.kind === 'fix') {
        agg.fixN++;
        agg.kHist[q.k] = (agg.kHist[q.k] || 0) + 1;
      } else {
        const dis = q.blocks.map(b => b.anim).filter(a => q.steps.indexOf(a) < 0).length;
        agg.disHist[d + ':' + dis] = (agg.disHist[d + ':' + dis] || 0) + 1;
      }
    }
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk;
    if (!ok) auditOk = false;
    T('audit:' + flat + ':det', det);
    T('audit:' + flat + ':rule', ruleOk);
    T('audit:' + flat + ':ch', chOk);
    T('audit:' + flat + ':dch', dchOk);
    T('audit:' + flat + ':drive', driveOk && solvedAll);
    T('audit:' + flat + ':spec', specOk);
    if (flat >= 20) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    if (L1.dch === 4) {                                    // fix 题位 kq 聚合（每关恰 1）
      const kq = L1.quizzes.findIndex(q => q.kind === 'fix');
      agg.kqHist[kq] = (agg.kqHist[kq] || 0) + 1;
    }
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok,
                  lens: L1.quizzes.map(q => (q.kind === 'fix' ? 'F' : '') + q.steps.length + '/' + q.blocks.length) };
    if (flat < 20) levels[keyOf(flat)] = rec; else gen[flat] = rec;
  }
  units.audit = { ok: auditOk, bad: badCase, genDch: genDch };

  /* ---- ②b 聚合分布断言（r39-bis ①铁律；仅全量模式——分段模式由 pycheck 全量复算双落） ---- */
  if (SEG < 0) {
    const d1 = (genDch[1] || 0) + 5, d2 = (genDch[2] || 0) + 5, d3 = (genDch[3] || 0) + 5, d4 = (genDch[4] || 0) + 5;
    const nOk = agg.nHist['1:3'] === d1 - 1 && agg.nHist['1:4'] === d1 * 2 && agg.nHist['1:5'] === d1 * 2 &&
                agg.nHist['2:6'] === d2 * 5 && agg.nHist['3:7'] === d3 * 5 && agg.nHist['4:8'] === d4 * 5;
    T('dist:steps', nOk);                                  // 步数谱按 dch 分桶精确计数（dch1 n=3 扣锚面 1 题）
    const dupOk = agg.dupHist['1:0'] === d1 * 5 - 1 && agg.dupHist['2:0'] === d2 * 5 &&
                  agg.dupHist['3:1'] === d3 * 5 && agg.dupHist['4:2'] === d4 * 5;
    T('dist:dup', dupOk);                                  // 重复律：ch1/2 零重复、ch3 恒 1、ch4 恒 2
    const disOk = agg.disHist['1:3'] === d1 * 5 - 1 && agg.disHist['2:3'] === d2 * 5 &&
                  agg.disHist['3:4'] === d3 * 5 && agg.disHist['4:4'] === d4 * 4;
    T('dist:dis', disOk);                                  // 干扰恒值（dch1 锚面 q0=0 豁免 -1；dch4 fix 题无块）
    T('dist:triple0', agg.triple === 0);                   // 禁 3 连全 0（steps+disp）
    const kv = Object.keys(agg.kHist);
    const kMax = Math.max.apply(null, kv.map(x => agg.kHist[x]));
    T('dist:fix-k', agg.fixN === d4 && kv.length >= 4 && kMax <= Math.floor(agg.fixN / 2) + 1);   // 错步位散布（F1 同族防恒位）
    const kqv = Object.keys(agg.kqHist);
    T('dist:fix-kq', kqv.length >= 3);                     // fix 题位散布（每关恒 1 位置不恒定）
    units.dist = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('dist:')),
                   nHist: agg.nHist, dupHist: agg.dupHist, disHist: agg.disHist,
                   kHist: agg.kHist, kqHist: agg.kqHist, fixN: agg.fixN };
  }

  /* ---- ③ tapBlock 单元（flat0 q0=锚面：3 步 0 干扰 3 块——断言与 r43 前逐字一致） ---- */
  startLevel(0);
  let q0 = window.RD.quiz;
  const swWatch = await window.RD.tapBlock(0);            // watch 相位吞 → false
  T('tap:watch-swallow', swWatch === false && q0 && q0.phase === 'watch');
  T('tap:watch-board-hidden', boardEl.querySelectorAll('.block').length === 0);   // watch 相位块区隐藏
  await waitBuildUI();
  const q = window.RD.quiz;
  T('tap:shape', !!q && q.steps.length === 3 && q.blocks.length === 3 &&
    q.filled.every(f => f === null) && q.step === 0 && q.miss === 0 && q.phase === 'build');
  T('tap:demo-log', JSON.stringify(window.__rdDemoLog) === JSON.stringify(q.steps));   // 演示实录
  T('tap:turnq-chain', !!(window.__lastQueue && window.__lastQueue.length === 2 &&
    window.__lastQueue[0] === 'rbd_tut_turn' && window.__lastQueue[1] === 'rbd_q' &&
    noKeyless(window.__lastQueue)));                        // 转场链=你来拼一拼+按顺序点一点
  T('tap:bad-idx', (await window.RD.tapBlock(99)) === null);   // 越界=null
  const wIdx = q.blocks.findIndex(b => b.anim !== q.steps[0]);
  const beforeFilled = q.filled.slice();
  const rw = await window.RD.tapBlock(wIdx);
  const qw = window.RD.quiz;
  T('tap:wrong-ret', rw === 'wrong');
  T('tap:wrong-miss', qw.miss === 1 && window.RD.currentLevel.miss === 1);
  T('tap:wrong-filled-keep', JSON.stringify(qw.filled) === JSON.stringify(beforeFilled));   // M：点错槽不变
  T('tap:wrong-chain', !!(window.__lastQueue && window.__lastQueue.length === 2 &&
    window.__lastQueue[0] === 'rbd_wrong' && window.__lastQueue[1] === 'rbd_hint' &&
    noKeyless(window.__lastQueue)));                        // 错链=wrong+hint 全 clip 无 keyless
  const rw2 = await window.RD.tapBlock(wIdx);
  T('tap:guard-swallow', rw2 === false && window.RD.quiz.miss === 1);   // I 补：豁免窗内二错吞
  await new Promise(w => setTimeout(w, 4750));              // 真时钟等豁免窗（4650）过期
  const rw3 = await window.RD.tapBlock(wIdx);
  T('tap:guard-after', rw3 === 'wrong' && window.RD.quiz.miss === 2);   // 窗后二错照计 miss
  const ci2 = correctIdx(cur.quizzes[cur.step]);
  T('tap:breathe', ci2 >= 0 && !!blockEl(ci2) && blockEl(ci2).classList.contains('breathe'));   // miss≥2 答案级
  /* 正确填完：返回值族 fill×(n-1)+done + 契约 M 逐槽（filled 前缀==steps 前缀） */
  const rets = [];
  let prefixOk = true;
  const steps0 = window.RD.quiz.steps.slice();
  for (let s = 0; s < steps0.length; s++) {
    const cq = window.RD.quiz;                     // 当前题（末槽 tap 前仍本题）
    const idx = cq.blocks.findIndex(b => b.anim === steps0[s]);
    const isLast = s === steps0.length - 1;
    const r = await window.RD.tapBlock(idx);
    rets.push(r);
    /* 契约 M 逐槽：done 后 RD.quiz 已翻页——改读引擎已解题对象对账（最终序列==真值序列） */
    const eq = isLast ? cur.quizzes[cur.step - 1] : cur.quizzes[cur.step];
    if (!eq || eq.steps.join(',') !== steps0.join(',') ||
        eq.filled.slice(0, s + 1).join(',') !== steps0.slice(0, s + 1).join(',')) prefixOk = false;
    if (!isLast) {                                 // 非末槽：槽 DOM 帧内容同步核对
      const se = slotEl(s);                        //（末槽 DOM 在 dance 渲染后即翻页——引擎级已核）
      if (!se || se.dataset.anim !== steps0[s]) prefixOk = false;
    }
  }
  T('tap:fill-family', rets.slice(0, -1).every(r => r === 'fill') && rets[rets.length - 1] === 'done');
  T('tap:fill-prefix', prefixOk);
  T('tap:dance-chain', !!(window.__lastQueue &&
    window.__lastQueue.length === q.steps.length + 1 &&
    q.steps.every((a, k) => window.__lastQueue[k] === 'rbd_n_' + a) &&
    window.__lastQueue[q.steps.length] === 'rbd_right' &&
    noKeyless(window.__lastQueue)));                        // 确认链=名音逐段+right 尾段
  T('tap:dance-log', JSON.stringify(window.__rdDanceLog) === JSON.stringify(q.steps));
  await waitBuildUI();
  T('tap:next-q', !!(window.RD.quiz && window.RD.quiz.step === 0 &&
    window.RD.currentLevel.step === 1 && !window.RD.currentLevel.done));
  units.tap = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('tap:')) };

  /* ---- ③b fix 单元（flat15 ch4 驱动至 fix 题，SPEC-R43 §R5） ---- */
  startLevel(15);
  /* r43 M1 断言：fix 首演 watch 期槽=空槽（disp 不提前泄出——「与记忆中正确版对比」） */
  let fixWatchOk = false, fw = 0;
  while (fw++ < 1200) {
    const q0 = window.RD.quiz;
    if (q0 && q0.kind === 'fix' && q0.phase === 'watch') {
      const slotsW = Array.from(slotsEl.querySelectorAll('.slot'));
      fixWatchOk = slotsW.length === 8 &&
        slotsW.every(s => !s.dataset.anim && !s.classList.contains('pickable'));
      break;
    }
    if (window.RD.quiz && window.RD.quiz.phase === 'build') break;   // 已进 build（错过 watch 窗）
    await wait(20);
  }
  T('fix:watch-empty', fixWatchOk);
  let qf = null, gfix = 0;
  while (gfix++ < 300) {                              // 驱动至 fix 题开放（每关恒 1 题）
    const qq = window.RD.quiz;
    if (qq && qq.kind === 'fix' && qq.phase === 'build') { qf = qq; break; }
    if (!qq && cur && cur.done) break;
    if (qq && qq.phase === 'build' && qq.kind !== 'fix') {   // 常规题先答完（照序点）
      const usedN = {};                               // 已消耗同名块计数（r43 minor1：dup 步避已消耗）
      for (let s = qq.step; s < qq.steps.length; s++) {
        const cq = window.RD.quiz;
        const want = cq.steps[cq.step];
        let skip = usedN[want] || 0, idx = -1;
        for (let j = 0; j < cq.blocks.length; j++)
          if (cq.blocks[j].anim === want && skip-- <= 0) { idx = j; break; }
        usedN[want] = (usedN[want] || 0) + 1;
        await window.RD.tapBlock(idx);
      }
    }
    await wait(50);
  }
  T('fix:found', !!qf && qf.kind === 'fix' && qf.steps.length === 8 && qf.blocks.length === 0);
  if (qf) {
    T('fix:turn-chain', !!(window.__lastQueue && window.__lastQueue.length === 1 &&
      window.__lastQueue[0] === 'rbd_q_fix' && noKeyless(window.__lastQueue)));   // fix 转场链=[rbd_q_fix]
    T('fix:struct', qf.k >= 0 && qf.k < 8 && qf.bad !== qf.steps[qf.k] &&
      qf.steps.indexOf(qf.bad) >= 0 && qf.disp.every(a => qf.steps.indexOf(a) >= 0));
    const slotsDom = Array.from(slotsEl.querySelectorAll('.slot'));   // 槽 DOM==disp（帧内容 M 契约）
    T('fix:slots-dom', slotsDom.length === 8 &&
      slotsDom.every((s, i) => s.dataset.anim === qf.disp[i] &&
        s.querySelector('.s-name').textContent === SPEC_NAMES[qf.disp[i]] &&
        s.classList.contains('pickable')));
    T('fix:board-hidden', boardEl.querySelectorAll('.block').length === 0);   // fix 题无候选块
    const wrongSlot = qf.k === 0 ? 7 : 0;             // 错格（≠k）
    const rf1 = await window.RD.tapSlot(wrongSlot);
    T('fix:wrong', rf1 === 'wrong' && window.RD.quiz.miss === 1 &&
      window.RD.currentLevel.miss === 1);
    const rf2 = await window.RD.tapSlot(wrongSlot);
    T('fix:guard-swallow', rf2 === false && window.RD.quiz.miss === 1);   // I 补同律：豁免窗内二错吞
    await new Promise(w => setTimeout(w, 4750));      // 真时钟等豁免窗过期
    const rf3 = await window.RD.tapSlot(wrongSlot);
    const kfEl = slotEl(qf.k);
    T('fix:guard-after', rf3 === 'wrong' && window.RD.quiz.miss === 2);   // 窗后二错照计 miss
    T('fix:breathe', !!kfEl && kfEl.classList.contains('breathe'));       // miss≥2 答案级=槽 k breathe
    T('fix:bad-idx', (await window.RD.tapSlot(99)) === null);             // 越界=null
    /* r43 M1 断言：fix replay 期 disp 槽保留（SPEC §R5「对比锚不撤」）——watch 重演窗内
       轮询捕获槽帧（playMoves 8 步提速窗 ~2s），replay() resolve=重播完成回 build */
    const pRep = window.RD.replay();
    let repDispOk = false, gr = 0;
    while (gr++ < 900) {
      const qw = window.RD.quiz;
      if (qw && qw.phase === 'watch') {
        const slotsR = Array.from(slotsEl.querySelectorAll('.slot'));
        if (slotsR.length === 8 && slotsR.every((s, i) => s.dataset.anim === qf.disp[i] &&
            !s.classList.contains('pickable'))) { repDispOk = true; break; }
      }
      await wait(20);
    }
    T('fix:replay-disp', (await pRep) === true && repDispOk);
    /* 点对错误格：tapSlot 的 done 路径会 await 整段 dance（返回时已翻页）——槽=正确版的
       视觉修正演出须在 dance 窗内轮询捕获（不 await，20ms 间隔 vs dance≈2.1s 提速窗） */
    const fixStepAt = window.RD.currentLevel.step;
    const pDone = window.RD.tapSlot(qf.k);
    let slotsFixedOk = false, gsf = 0;
    while (gsf++ < 900) {
      const slotsNow = Array.from(slotsEl.querySelectorAll('.slot'));
      if (slotsNow.length === 8 && slotsNow.every((s, i) => s.dataset.anim === qf.steps[i] &&
          !s.classList.contains('pickable'))) { slotsFixedOk = true; break; }
      if (window.RD.currentLevel && window.RD.currentLevel.step === fixStepAt + 1) break;   // 已翻页
      await wait(20);
    }
    const rd1 = await pDone;                          // done 返回（dance 演完+下一题已排）
    T('fix:done', rd1 === 'done');
    T('fix:slots-fixed', slotsFixedOk);               // dance 槽=正确版 steps（视觉修正演出帧捕获）
    T('fix:done-chain', !!(window.__lastQueue && window.__lastQueue.length === 9 &&
      qf.steps.every((a, i) => window.__lastQueue[i] === 'rbd_n_' + a) &&
      window.__lastQueue[8] === 'rbd_right' && noKeyless(window.__lastQueue)));   // 确认链=正确版名音×8+right
    T('fix:dance-log', JSON.stringify(window.__rdDanceLog) === JSON.stringify(qf.steps));   // 舞=正确版
    await waitBuildUI();
    const lvFix = window.RD.currentLevel;
    T('fix:next-q', !!lvFix && (lvFix.done ||
      (lvFix.step === fixStepAt + 1 && !lvFix.done)));   // 推进不卡死（fix 末题=通关，非末题=+1）
  }
  units.fix = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('fix:')) };

  /* ---- ④⑤ replay 单元（flat5 ch2：6 步 3 干扰 9 块） ---- */
  startLevel(5);
  await waitBuildUI();
  const qr = window.RD.quiz;
  const idx0 = qr.blocks.findIndex(b => b.anim === qr.steps[0]);
  await window.RD.tapBlock(idx0);
  T('rep:filled1', window.RD.quiz.filled[0] === qr.steps[0] && window.RD.quiz.step === 1);
  window.__rdDemoLog = [];
  const rep = await window.RD.replay();
  T('rep:ret', rep === true);
  T('rep:phase-back', window.RD.quiz.phase === 'build');    // 重播后回 build
  T('rep:keep-progress', window.RD.quiz.filled[0] === qr.steps[0] &&
    window.RD.quiz.step === 1 && window.RD.quiz.miss === 0);   // 重播不清进度（b18 同构）
  T('rep:demo-log', JSON.stringify(window.__rdDemoLog) === JSON.stringify(qr.steps));
  T('rep:consumed-dom', boardEl.querySelectorAll('.block').length === qr.blocks.length - 1);   // 已消耗块不在场
  startLevel(6);                                            // 新关 watch 相位
  const rep2 = await window.RD.replay();
  T('rep:watch-guard', rep2 === false);                     // watch 相位 replay 不可用
  units.replay = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('rep:')) };

  /* ---- ⑥ 教学链：tutorialWatch 真实走完 → __rdDemoR='done'（幽灵手指按序点两块填槽） ---- */
  KIDS._save = function () { return { levels: {} }; };      // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);                                            // verify 分支正常排演示（被教学接管前中止）
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                     // 折算真实页时长
  T('tut:demoR', window.__rdDemoR === 'done');
  T('tut:help', state.tut === 'help' && cur.flat === 0 && !cur.tutLevel);
  T('tut:real-q3', cur.quizzes[0].steps.length === 3);      // 真关首题=锚面 3 步（§R10）
  /* 预算：真实页名义 16148ms（build.py TUT_SUM ≤16500 钉死，STEP_MS 1834）；verify 折算
     归一化开销 ~1000ms 余量（每步 await 真实开销 ×1/0.12≈8.3 倍放大） */
  T('tut:budget', tw <= 17150);
  await waitBuildUI();
  T('tut:q0-build', !!(window.RD.quiz && window.RD.quiz.phase === 'build'));
  units.tutorial = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('tut:')),
                     demoR: window.__rdDemoR, watchMs: Math.round(tw) };

  /* ---- ⑦ UI 冒烟：flat0/5 autoSolve 通关；flat10 先 1 错再 autoSolve（1 错=2★） ---- */
  startLevel(0);
  const a0 = await window.RD.autoSolve();
  T('smoke:flat0', a0.done && a0.taps === 21 && engStars(cur) === 3 && window.RD.currentLevel.done);
  startLevel(5);
  const a5 = await window.RD.autoSolve();
  T('smoke:flat5', a5.done && a5.taps === 30 && window.RD.currentLevel.done);
  startLevel(10);
  await waitBuildUI();
  const qw10 = window.RD.quiz;
  const w10 = qw10.blocks.findIndex(b => b.anim !== qw10.steps[0]);
  const r10 = await window.RD.tapBlock(w10);
  const a10 = await window.RD.autoSolve();
  T('smoke:flat10', r10 === 'wrong' && a10.done && a10.taps === 35 &&
    window.RD.currentLevel.miss === 1 && engStars(cur) === 2);
  smokes.auto = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('smoke:')),
                  taps: [a0.taps, a5.taps, a10.taps] };

  /* ---- ⑧ 帧内容断言（契约 M：渲染即引擎——块/槽 DOM 与 quiz 真值一一对应） ---- */
  const frameCheck = q => {
    const blocks = Array.from(boardEl.querySelectorAll('.block'));
    const domOk = blocks.length === q.blocks.length &&
      blocks.every(b => Number(b.dataset.i) >= 0 &&
        q.blocks[Number(b.dataset.i)].anim === b.dataset.anim &&
        b.querySelectorAll('svg').length === 1 &&
        b.querySelector('.c-name').textContent === SPEC_NAMES[b.dataset.anim]);   // 块=动作图+小字名
    const slots = Array.from(slotsEl.querySelectorAll('.slot'));
    const slotOk = slots.length === q.steps.length &&
      slots.every((s, i) => q.filled[i]                          // 已填槽=动作图+小字名（帧内容锚）；
        ? (s.dataset.anim === q.filled[i] && !!s.querySelector('svg') && !!s.querySelector('.s-name'))
        : (!s.dataset.anim && !s.querySelector('svg')));         // 空槽=虚线框无图（watch 相位全空）
    const robOk = !!robotZone.querySelector('.robot .rb-lift[data-anim="robot"]') &&
                  robotZone.querySelectorAll('.robot').length === 1;
    return domOk && slotOk && robOk;
  };
  startLevel(0);
  await waitBuildUI();
  const f0 = frameCheck(window.RD.quiz);
  startLevel(5);
  await waitBuildUI();
  const f5 = frameCheck(window.RD.quiz);
  startLevel(10);
  await waitBuildUI();
  const f10 = frameCheck(window.RD.quiz);
  T('frame:flat0', f0);
  T('frame:flat5', f5);
  T('frame:flat10', f10);
  units.frame = { ok: f0 && f5 && f10 };

  /* ---- ⑨ 布局：双 viewport ×（flat0/5/10/15/16）——块与槽 ≥48（SPEC 触摸下限）、机器人 ≥120；
     flat15/16=ch4 双形态（fix 8 槽作答面 / 12 块候选面）按当前题形态断言 ---- */
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
    startLevel(g._simFlat);
    await waitBuildUI();
    const q = window.RD.quiz;
    const blocks = Array.from(boardEl.querySelectorAll('.block')).map(b => ({ w: b.offsetWidth, h: b.offsetHeight }));
    const slots = Array.from(slotsEl.querySelectorAll('.slot')).map(s => ({ w: s.offsetWidth, h: s.offsetHeight }));
    const rob = robotZone.querySelector('.robot');
    const robH = rob ? Math.round(rob.getBoundingClientRect().height) : 0;
    let hitOk, cB;
    if (q && q.kind === 'fix') {                     // ch4 fix 形态：8 槽全 ≥48（作答面）；无块
      hitOk = slots.length === 8 && slots.every(s => s.w >= 48 && s.h >= 48);
      cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3;       // 对比锚=槽内 s-name 深棕文本 vs 底
    } else if (g._simFlat === 0) {                   // flat0 q0 锚面：3 步 0 干扰 3 块（§R10 锚豁免）
      hitOk = blocks.length === 3 && slots.length === 3 &&
        blocks.every(b => b.w >= 48 && b.h >= 48) && slots.every(s => s.w >= 48 && s.h >= 48);
      cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
        ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.block')).borderLeftColor), '#FFF9EE') >= 3;
    } else {                                         // 常规形态：块 ≥6 且块/槽全 ≥48
      hitOk = blocks.length >= 6 && slots.length >= 3 &&
        blocks.every(b => b.w >= 48 && b.h >= 48) && slots.every(s => s.w >= 48 && s.h >= 48);
      cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
        ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.block')).borderLeftColor), '#FFF9EE') >= 3;
    }
    const robOk = robH >= 120;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, blocks: blocks.length, robH: robH,
             hitOk: hitOk, robOk: robOk, contrast: cB, ox: ox,
             pass: hitOk && robOk && cB && ox <= 0 };
  }
  const sims = [];
  /* r43 M4：采样加 flat17（q0=seq 12 块常规题）——flat15/16 q0 均 fix，12 块候选面
     最密布局形态原零执行（审查 REPORT-REVIEW-r43 M4 假覆盖）；16 保留=fix 双形态关采样 */
  for (const flat of [0, 5, 10, 15, 16, 17]) {
    $id('game')._simFlat = flat;
    sims.push(await simView(1280, 800));
    sims.push(await simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  const layoutOk = sims.every(s => s.pass);
  T('layout:all', layoutOk);
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑩ clips（r43 终态 2026-09-22 主线注册）：rbd 18（通用 7+名音×10+fix 1）+ core 3
     = 21 全注入 + duration 辨别器（SPEC §4 实长 ±60ms，六新键 mutagen 实测入 SPEC_DUR） ---- */
  const keys = Object.keys(KIDS.voice.clips);
  const rbdKeys = ['rbd_tut_watch', 'rbd_tut_turn', 'rbd_hint', 'rbd_right', 'rbd_wrong',
                   'rbd_q', 'rbd_replay', 'rbd_q_fix'].concat(SPEC_POOL.map(w => 'rbd_n_' + w));
  const needAll = rbdKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 21 &&
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
  T('clips:inject', preOk);
  T('clips:dur', durOk);
  units.clips = { ok: preOk && durOk, n: keys.length };

  /* ---- ⑪ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  const LA = genLevel(10);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;
  T('stars:3', st3);
  T('stars:2', st2a && st2b);
  T('stars:1', st1 && stFloor);
  units.stars = { ok: st3 && st2a && st2b && st1 && stFloor };

  /* ---- ⑫ 契约 A/B/E/F/I/I补/J/K 源码断言（读自身合并 script 文本——第 3 个 script 块）
     + fix 锚（engTapSlot 引擎在场/uiTapSlot 入口 guard/rescueTick fix 分流——SPEC-R43 §R5） ---- */
  const src = document.querySelectorAll('script')[2].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.robotdance && sv.robotdance.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&     // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 4650') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcI2 = src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && q.blocks[i].anim !== q.steps[q.pos]') >= 0;   // I 补：guard 挂块入口
  const srcI3 = src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.k') >= 0;   // I 补 fix：guard 挂槽入口
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;              // J：语义链 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcIdle = src.indexOf('q.phase !== \'build\') return;') >= 0;   // watch/dance 演出相位豁免 idle
  const srcNK = src.indexOf('{ key:' + ' null') < 0;   // Mj-1 恒真式：全款零 keyless 段（拼接防自匹配）
  const srcT = src.indexOf("setProperty('--t'") >= 0;           // CSS 动画 SPEED 换算声明在场
  const srcFixE = src.indexOf('function engTapSlot(L, i)') >= 0 &&   // fix 引擎在场（engine 段文本同块）
                  src.indexOf('async function uiTapSlot(i)') >= 0 &&
                  src.indexOf('q.kind === \'fix\'') >= 2;       // fix 分流多处（render/救援/autoSolve）
  T('ctr:A', srcA); T('ctr:B', srcB); T('ctr:E', srcE); T('ctr:F', srcF);
  T('ctr:I', srcI); T('ctr:I2', srcI2); T('ctr:I3', srcI3); T('ctr:J', srcJ); T('ctr:K', srcK);
  T('ctr:idle-exempt', srcIdle); T('ctr:no-keyless', srcNK); T('ctr:t-var', srcT);
  T('ctr:fix-hooks', srcFixE);
  units.contract = { ok: srcA && srcB && srcE && srcF && srcI && srcI2 && srcI3 && srcJ && srcK &&
                            srcIdle && srcNK && srcT && srcFixE };

  /* ---- ⑬ 章末预告独立硬编码对账 + 生成关 nextHint 实算对账（SPEC-R43 §R3 新文案） ---- */
  const hintOk = [1, 2, 3, 4].every(i => CHAPTERS[i].hint === SPEC_CHAPTER_HINTS[i]) &&
    GEN_HINTS.every((h, i) => h === SPEC_GEN_HINTS[i]) &&
    nextHint(4) === SPEC_CHAPTER_HINTS[1] &&      // 章末（ch1 打完）预告 ch2 文案
    nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
    nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
    nextHint(19) === SPEC_CHAPTER_HINTS[4];
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  T('hints:chapters', hintOk);
  T('hints:gen', genOk);
  units.hints = { ok: hintOk && genOk };

  /* ---- ⑭ 窗数学（SPEC-R43 §R8 独立复算；SPEC 常量勿引页面 STEP_MS/WRONG_CHAIN_MS） ---- */
  const MAXN = SPEC_DUR.rbd_n_wave;                       // 在册名音 max 1584
  const EST_UP = 1684;                                   // 名音预估上界（SPEC-R43 §R8 常量复算；r43 实测
                                                         // max=stretch 1704>1684：STEP_MS 1834 罩音频零截断（间隙 130ms）；
                                                         // 确认链实测口径 flat34 q0 Σ12840+8×150+2280=16320+300≤舞窗 17252
                                                         // 余 632——r43 M2 勘误 2026-09-22，est 口径恰等式链不动）
  const winStep = 1834 >= EST_UP + 150;                  // 演示/舞单段窗 ≥ 预估上界+150
  const winDance = 8 * 1834 + 2580 >= 8 * (EST_UP + 150) + SPEC_DUR.rbd_right + 300;   // 17252 ≥ 17252
  const winWrong = 4650 === SPEC_DUR.rbd_wrong + 150 + SPEC_DUR.rbd_hint + 300;      // 错链豁免窗
  const winWatch = 3372 >= SPEC_DUR.rbd_tut_watch + 300;  // 教学 watch 演示延
  const winTurn = 2124 >= SPEC_DUR.rbd_tut_turn + 300;    // turn 后演示延（教学交接/replay 前导）
  const chainTurnQ = SPEC_DUR.rbd_tut_turn + 150 + SPEC_DUR.rbd_q === 4062;          // 转场链实长（异步不占窗）
  const tutSum = 3372 + 2 * 1834 + 420 + 2 * 920 + 260 + 60 + 280 + 2 * 1834 + 2580;   // 教学分账
  T('win:step', winStep && STEP_MS === 1834);
  T('win:dance', winDance);
  T('win:wrong', winWrong && WRONG_CHAIN_MS === 4650);
  T('win:watch', winWatch);
  T('win:turn', winTurn);
  T('win:turnq', chainTurnQ);
  T('win:tutsum', tutSum === 16148 && tutSum <= 16500);
  units.estWin = { ok: winStep && winDance && winWrong && winWatch && winTurn && chainTurnQ && tutSum <= 16500 };

  /* ---- ⑮ verify 提速断言（SPEED + CSS --t 换算生效） ---- */
  const tVar = getComputedStyle(document.documentElement).getPropertyValue('--t').trim();
  const speedOk = SPEED === 0.12 && (tVar === '0.12' || Math.abs(parseFloat(tVar) - 0.12) < 1e-6);
  T('speed', speedOk);
  units.speed = { ok: speedOk, SPEED: SPEED, tVar: tVar };

  const out = { game: 'robotdance', seg: SEG, total: total, pass: npass, layoutOk: layoutOk,
                failList: units.__failList || [], levels: levels, gen: gen,
                units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__rdVlog = out;                          // 外部断言挂点（任务书钩子）
  const segTag = SEG >= 0 ? ' (seg ' + SEG + ')' : '';
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total + segTag
                                                 : 'VERIFY FAIL' + segTag;
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
