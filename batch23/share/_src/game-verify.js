/* ================= ?verify=1 自检（仅 verify 分支加载执行；r22 适配 SPEC-R22-SHARE）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null：章池/整除性/剩余性/相邻不同/初始态干净/flat0 题0 恒 (2,2)
     /r22 cmp·rev 结构：mode/ask/池表/opts 4 钮含正确域内无重/唯一最值/相邻签名）/
     引擎直驱（split 逐题最少糖碗最优策略；r22 cmp/rev 正确作答一次推进；
     剩余题恰经一次 'plate' 引导；0 取回 0 答错=3 星通关）
   ①b 聚合：dch3 恒恰 2 题 k4（k4PerLv 10 关）/ dch4 恒 cmp+rev 混合且 qi0=cmp-who（dch4Mix 10 关）
   ② 判定独立对账：specJudge()（SPEC §2 文字口径独立重算，不引用引擎 engJudge）
     vs engJudge()：十二组 (n,k)（整除+剩余，含 r22 k4 对 [5,4]/[11,4]）全部糖数组合态全对拍
   ③ 两击制状态机（flat0 真实 UI）：未选糖点碗=无效 false+bump；pick/swap/drop；
     入碗 bowls/tray 联动；takeBack=tray+1/bowls[j]-1/miss+1；空碗取回 false；
     飞行占位锁防重入（busy 窗内紧邻点碗=拒绝不推进）
   ④ 自动判定分支（引擎级）：均衡+分完=推进；均衡+剩 ≥K=继续；不等≠错不推进；
     剩余题引导出现/点盘收尾（plateIds=n%k）；整除题永不进引导；
     取回补成均衡→引导翻转；非引导态点盘=null
   ⑤ UI 冒烟：flat0 / flat10（dch3 剩余含 k4）/ flat15（dch4 作答面）autoSolve 通关
     （split moves=Σ(入碗数+点盘数)、dch4 moves=5 对账；0 探索成本=3★；取回 1 次=2★）
   ⑥ 星级规则：r22 探索总成本口径（takebacks+qMiss）0=3★ / 1-2=2★ / ≥3=1★
   ⑦ 教学链：tutorialWatch() 真实走完（stub 存档）→ __shDemoR==='right'
     （演示分一颗+再分一颗=演示即完整一题）且 tut='help'；watch 折算真实时长 ≤16s
   ⑧ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + tray 容器 bump 微动效（b21 定版）
   ⑨ 布局：双 viewport（1280×800 / 800×1180）×（k2 大糖数关 / k3 剩余关碗满态 /
     r22 k4 关 / dch4 作答关）：糖/碗内糖/动物站/数字钮/问号钮/小盘/题面 ≥64、
     overflowX ≤0、糖描边与碗描边对底色对比度 ≥3:1
   ⑩ clips：子集式（sha_ 40 必备+core 3 精确在场+总数 ≥43——主线注册 r22 新 11 键后 54 亦过）
   ⑪ C7 型章末预告断言：hint[i]↔CHAPTERS[i+1]、GEN_HINTS[k]↔dch=k+1（禁右移——
     nextHint 边界值逐点对账 + r22 新文案关键词断言）
   ⑫ 语音文案对账：VOICE 五条 text 与 manifest 严格一致；numCn 数词表 0-12；
     r22 quizSpeech k=4 + cmp/rev 三形态文案自洽
   ⑬ verify 提速断言：SPEED=0.12
   ⑭ r22 作答面单元（flat15 真实 UI 状态机）：cmp 字段完备/分糖通道守卫
     （tapCandy·tapBowl·takeBack·tapPlate 全 false）/wrong 不换题可重选+qMiss 计/
     same 不判不罚/right 推进/数字钮 opts 4 含正确/非法索引 false
   ⑮ r22 首次新作答视觉预告：作答钮次第 bounce（.tease 在场，预告可点不指示答案）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- ① 40 关全量审计（flat 0-39；r22：cmp/rev 直驱+prev 传题本体） ---- */
  let dch4Mix = [], k4PerLv = [];
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const prev = k > 0 ? L1.quizzes[k - 1] : null;       /* r22：题本体（mode/ask/dist/x） */
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, prev);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    /* 章分布：ch=flat/5+1；dch=(ch-1)%4+1（生成关 ch5-8 循环取材） */
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1 &&
                 L1.dch === (L1.ch - 1) % 4 + 1;
    /* 引擎直驱：split 逐题最优策略（拿糖→最少糖碗；引导态点盘）；
       r22 cmp/rev=正确作答一次推进（who=argmax 站；diff=max−min；rev=x*k） */
    const L3 = genLevel(flat);
    let driveOk = true, plates = 0, ops = 0;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      if (q.mode && q.mode !== 'split') {                  /* r22 作答题直驱 */
        let lastR;
        if (q.mode === 'cmp' && q.ask === 'who') {
          let j = 0;
          for (let t = 1; t < q.k; t++) if (q.dist[t] > q.dist[j]) j = t;
          lastR = engPickAnimal(L3, j);
        } else {
          const ans = q.mode === 'rev' ? q.x * q.k
                    : Math.max.apply(null, q.dist) - Math.min.apply(null, q.dist);
          lastR = engPickNum(L3, q.opts.indexOf(ans));
        }
        ops++;
        if (lastR !== 'right' && lastR !== 'done') driveOk = false;
        continue;
      }
      const isRem = q.n % q.k !== 0;
      let sawPlate = false, lastR = null, guard = 0;
      while (!q.solved && guard++ < 60) {
        if (q._ready) {
          lastR = engTapPlate(L3); ops++;
          if (lastR !== 'right' && lastR !== 'done') { driveOk = false; break; }
          if (!sawPlate) { driveOk = false; break; }        // 盘引导必先于点盘出现
          continue;
        }
        if (engTapCandy(L3, 0) !== 'pick') { driveOk = false; break; }
        ops++;
        let j = 0;
        for (let t = 1; t < q.k; t++) if (q._bowlIds[t].length < q._bowlIds[j].length) j = t;
        lastR = engTapBowl(L3, j); ops++;
        if (lastR === 'plate') sawPlate = true;
        else if (lastR !== 'moved' && lastR !== 'right' && lastR !== 'done') { driveOk = false; break; }
      }
      if (!driveOk) break;
      if (lastR !== 'right' && lastR !== 'done') driveOk = false;      // 每题末步必判对
      if (isRem && (!sawPlate || q.plateIds.length !== q.n % q.k)) driveOk = false;  // 剩余题必经盘
      if (!isRem && sawPlate) driveOk = false;                          // 整除题禁盘引导
      if (sawPlate) plates++;
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.takebacks === 0 &&
                      L3.qMiss === 0 && engStars(L3) === 3;
    if (L1.dch === 3) {                                    /* r22：恰 2 题 k4（静态 5+生成 5） */
      k4PerLv.push(L1.quizzes.filter(q => q.k === 4).length === 2);
    }
    if (L1.dch === 4) {                                    /* r22：cmp+rev 混合且 qi0=cmp-who */
      const modes = L1.quizzes.map(q => q.mode);
      dch4Mix.push(modes.indexOf('cmp') >= 0 && modes.indexOf('rev') >= 0 &&
                   L1.quizzes[0].mode === 'cmp' && L1.quizzes[0].ask === 'who');
    }
    const ok = det && ruleOk && chOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                   driveOk: driveOk, solvedAll: solvedAll, plates: plates,
                   params: L1.quizzes.map(q => [q.n, q.k]),
                   kinds: L1.quizzes.map(q => q.kind),
                   modes: L1.quizzes.map(q => q.mode) };    /* r22 观测字段 */
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  /* 聚合1：dch3 恒恰 2 题 k4（r22 §R2 关级构成——静态 5 关+生成 5 关） */
  total++;
  const k4Ok = k4PerLv.length === 10 && k4PerLv.every(v => v);
  if (k4Ok) npass++;
  units.k4mix = { ok: k4Ok, n: k4PerLv.length };
  /* 聚合2：dch4 每关 cmp+rev 混合且 qi0=cmp-who（r22 §R2） */
  total++;
  const mixOk = dch4Mix.length === 10 && dch4Mix.every(v => v);
  if (mixOk) npass++;
  units.ch4mix = { ok: mixOk, n: dch4Mix.length };

  /* ---- ② 判定独立对账（SPEC §2 文字口径独立重算，不引用 engJudge） ---- */
  total++;
  function specJudge(n, k, counts) {
    let sum = 0;
    for (let i = 0; i < counts.length; i++) sum += counts[i];
    const tray = n - sum;
    const equal = counts.every(c => c === counts[0]);
    if (equal && tray === 0) return 'complete';            // 每碗相等且糖分完
    if (n % k !== 0 && equal && tray > 0 && tray < k) return 'plate';  // 剩 <K 放盘
    return 'none';                                         // 不等/有剩 ≥K=未完成
  }
  const PAIRS = [[2, 2], [6, 2], [10, 2], [3, 3], [9, 3], [12, 3], [5, 2], [7, 3], [8, 3], [11, 3],
                 [5, 4], [11, 4]];                          /* r22：k4 判定对拍（剩余域两端） */
  let nCase = 0, badCase = null;
  for (let p = 0; p < PAIRS.length; p++) {
    const n = PAIRS[p][0], k = PAIRS[p][1];
    const q0 = mkQuiz(n, k, ANIMAL_KEYS.slice(0, k));
    const mk = counts => {                                 // 构造任意分布态（solved=false）
      const qq = mkQuiz(n, k, q0.kinds);
      let used = 0;
      for (let j = 0; j < k; j++) {
        for (let t = 0; t < counts[j]; t++) qq._bowlIds[j].push(used++);
      }
      qq.trayIds = [];
      for (let id = used; id < n; id++) qq.trayIds.push(id);
      return qq;
    };
    const rec = c => { nCase++; const want = specJudge(n, k, c), got = engJudge(mk(c));
      if (want !== got) { badCase = n + '/' + k + ':' + c.join(',') + '=' + got + '!=' + want; return false; }
      return true; };
    let okAll = true;
    if (k === 2) {
      for (let a = 0; a <= n && okAll; a++) for (let b = 0; b <= n - a; b++) if (!rec([a, b])) { okAll = false; break; }
    } else if (k === 3) {
      for (let a = 0; a <= n && okAll; a++) for (let b = 0; b <= n - a && okAll; b++)
        for (let c = 0; c <= n - a - b; c++) if (!rec([a, b, c])) { okAll = false; break; }
    } else {                                               /* r22 k=4：四重全组合 */
      for (let a = 0; a <= n && okAll; a++) for (let b = 0; b <= n - a && okAll; b++)
        for (let c = 0; c <= n - a - b && okAll; c++)
          for (let d = 0; d <= n - a - b - c; d++) if (!rec([a, b, c, d])) { okAll = false; break; }
    }
    if (!okAll) break;
  }
  if (!badCase) npass++;
  units.judge = { ok: !badCase, nCase: nCase, bad: badCase };

  /* ---- ③ 两击制状态机（flat0 真实 UI；题0 钉 n=2 k=2） ---- */
  total++;
  SH.start(0);
  const s0 = SH.quiz;
  const initOk = s0 && s0.n === 2 && s0.k === 2 && s0.tray === 2 &&
                 s0.bowls.join() === '0,0' && s0.sel === null && s0.miss === 0 && s0.plate === 0;
  const noSel = (await SH.tapBowl(0)) === false && stationsEl.classList.contains('bump');   // 未选糖点碗=无效+bump
  const p1 = SH.tapCandy(0);
  const pickOk = p1 === 'pick' && SH.quiz.sel === 0 && !!trayEl.querySelector('.candy.sel');
  const dropOk = SH.tapCandy(0) === 'drop' && SH.quiz.sel === null &&
                 !trayEl.querySelector('.candy.sel');                                       // 点已提起的糖=放回
  SH.tapCandy(1);
  const swapOk = SH.tapCandy(0) === 'swap' && SH.quiz.sel === 0;                             // 再点别的糖=换选
  const badCandy = SH.tapCandy(99) === false;                                               // 越界糖=无效
  const badBowl = (await SH.tapBowl(5)) === false;                                          // 越界碗=无效
  const m1 = await SH.tapBowl(0);
  const moveOk = m1 === 'moved' && SH.quiz.bowls.join() === '1,0' && SH.quiz.tray === 1 && SH.quiz.sel === null;
  SH.tapCandy(0);
  const r1 = await SH.tapBowl(1);
  const rightOk = r1 === 'right' && SH.quiz.step === 1 && SH.quiz.tray === SH.quiz.n &&
                  SH.quiz.bowls.every(c => c === 0);
  /* 飞行占位锁：busy 窗内紧邻点碗=拒绝不推进（§0.47 同步置位） */
  SH.tapCandy(0);
  const pR = SH.tapBowl(0);                          // → 'moved'（240ms 占位锁）
  const rejBusy = await SH.tapBowl(0);               // 窗内紧邻发起=拒绝
  const rR = await pR;
  const busyOk = rejBusy === false && rR === 'moved';
  /* takeBack 语义：tray+1 / bowls[j]-1 / miss+1（当前题+关累计） */
  const b4 = { qmiss: SH.quiz.miss, lvmiss: SH.currentLevel.miss };
  SH.tapCandy(0);
  await SH.tapBowl(0);                               // 入碗 0（quiz1 已有 [1,0]，加成 [2,0] 必非完成）
  const afterPut = { tray: SH.quiz.tray, b0: SH.quiz.bowls[0] };
  const tbr = await SH.takeBack(0, 0);
  const takeOk = tbr === afterPut.b0 - 1 &&
                 SH.quiz.tray === afterPut.tray + 1 && SH.quiz.bowls[0] === afterPut.b0 - 1 &&
                 SH.quiz.miss === b4.qmiss + 1 && SH.currentLevel.miss === b4.lvmiss + 1;
  const emptyBack = (await SH.takeBack(1, 0)) === false;                                     // 空碗取回=无效
  const smOk = initOk && noSel && pickOk && dropOk && swapOk && badCandy && badBowl &&
               moveOk && rightOk && busyOk && takeOk && emptyBack;
  if (smOk) npass++;
  units.stateMachine = { ok: smOk, init: initOk, noSel: noSel, pick: pickOk, drop: dropOk,
                         swap: swapOk, badCandy: badCandy, badBowl: badBowl, move: moveOk,
                         right: rightOk, busyReject: busyOk, takeBack: takeOk, emptyBack: emptyBack };

  /* ---- ④ 自动判定分支（引擎级构造直测） ---- */
  total++;
  const kB = ANIMAL_KEYS.slice(0, 2), k3 = ANIMAL_KEYS.slice(0, 3);
  const put = (L, j) => { engTapCandy(L, 0); return engTapBowl(L, j); };
  const evenDone = (() => { const L = genLevel(0); put(L, 0); return put(L, 1) === 'right'; })();       // 均衡+分完=推进
  const evenMore = (() => { const L = genLevel(0); L.quizzes = [mkQuiz(6, 2, kB)];
    put(L, 0); const r1 = put(L, 1);                    // [1,1] 剩 4 ≥K → 未完成继续
    put(L, 0); put(L, 1); put(L, 0); const r2 = put(L, 1);   // [3,3] 分完 → 判对（单题数组=done）
    return r1 === 'moved' && r2 === 'done'; })();
  const unequal = (() => { const L = genLevel(0); L.quizzes = [mkQuiz(4, 2, kB)];
    put(L, 0); put(L, 0); put(L, 0);
    return put(L, 1) === 'moved'; })();                 // [3,1] 分完但不等≠错，不推进
  const plateFlow = (() => { const L = genLevel(0); L.quizzes = [mkQuiz(5, 2, kB)];
    let sawPlate = false, last = null;
    for (let i = 0; i < 4; i++) { put(L, i % 2); }      // [2,2] 剩 1 <K → 引导
    sawPlate = L.quizzes[0]._ready;
    last = engTapPlate(L);                              // 单题数组：收尾=done
    return sawPlate && last === 'done' && L.quizzes[0].plateIds.length === 1 &&
           L.quizzes[0].trayIds.length === 0; })();     // 点盘收尾：盘内=余数、托盘清空
  const divNoPlate = (() => { const L = genLevel(0); L.quizzes = [mkQuiz(6, 2, kB)];
    for (let i = 0; i < 5; i++) put(L, i % 2);
    return L.quizzes[0]._ready === false; })();         // 整除题 [3,3] 前 [2,2]+2 剩≥K、末步直接 right：禁引导
  const tbToPlate = (() => { const L = genLevel(0); L.quizzes = [mkQuiz(5, 2, kB)];
    for (let i = 0; i < 5; i++) put(L, i < 3 ? 0 : 1);  // [3,2] 分完不等
    engTakeBack(L, 0, 2);                               // 取回 → [2,2] 剩 1 → 引导翻转出现
    return L.quizzes[0]._ready === true; })();
  const plateNotReady = (() => { const L = genLevel(0); L.quizzes = [mkQuiz(5, 2, kB)];
    const n0 = engTapPlate(L) === null;                 // 全空未均衡=非引导
    for (let i = 0; i < 4; i++) put(L, i % 2);          // [2,2] → 引导
    put(L, 0);                                          // 再入一碗 → [3,2] 引导消失
    return n0 && L.quizzes[0]._ready === false && engTapPlate(L) === null; })();
  const branchOk = evenDone && evenMore && unequal && plateFlow && divNoPlate && tbToPlate && plateNotReady;
  if (branchOk) npass++;
  units.branches = { ok: branchOk, evenDone: evenDone, evenMore: evenMore, unequal: unequal,
                     plateFlow: plateFlow, divNoPlate: divNoPlate, tbToPlate: tbToPlate,
                     plateNotReady: plateNotReady };

  /* ---- ⑤ UI 冒烟：flat0 / flat10（dch3 含 k4）/ flat15（dch4 作答面）autoSolve 通关 + 星级 ---- */
  total++;
  SH.start(0);
  const lv0 = SH.currentLevel;
  const want0 = lv0 && cur.quizzes.reduce((s, q) => s + (q.n - q.n % q.k) + (q.n % q.k ? 1 : 0), 0);
  const a0 = await SH.autoSolve();
  const smoke0 = a0.done && a0.moves === want0 && SH.currentLevel.done && SH.currentLevel.won &&
                 SH.currentLevel.stars === 3 && !document.querySelector('.k-celebrate');
  smokes.flat0 = { ok: smoke0, moves: a0.moves, want: want0, stars: SH.currentLevel.stars };
  SH.start(10);
  const lv10 = SH.currentLevel;
  const want10 = cur.quizzes.reduce((s, q) => s + (q.n - q.n % q.k) + 1, 0);   // dch3 每题必经盘
  const a10 = await SH.autoSolve();
  const smoke10 = lv10.dch === 3 && a10.done && a10.moves === want10 &&
                  SH.currentLevel.stars === 3;
  smokes.flat10 = { ok: smoke10, moves: a10.moves, want: want10 };
  SH.start(15);
  const a15 = await SH.autoSolve();
  const smoke15 = SH.currentLevel.dch === 4 && a15.done && a15.moves === 5;   // r22：每题恰 1 次作答
  smokes.flat15 = { ok: smoke15, done: a15.done, moves: a15.moves };
  /* 取回 1 次 → 2★（探索成本口径：qMiss=0 路径） */
  SH.start(10);
  SH.tapCandy(0);
  await SH.tapBowl(0);                                // dch3 首题首颗必不完成（n≥5）
  await SH.takeBack(0, 0);
  const a10b = await SH.autoSolve();
  smokes.star2 = { ok: a10b.done && SH.currentLevel.stars === 2 && SH.currentLevel.miss === 1,
                   stars: SH.currentLevel.stars, miss: SH.currentLevel.miss };
  /* r22：作答错 1 次 → 2★（qmiss=1，takebacks=0——答错与取回同入星级口径） */
  SH.start(15);
  {
    const info = SH.quiz;                             // qi0 恒 cmp-who（dch4Plan 热身）
    let wrongJ = 0, rightJ = 0;
    for (let t = 1; t < info.bowls.length; t++) if (info.bowls[t] > info.bowls[rightJ]) rightJ = t;
    if (rightJ === 0) wrongJ = 1;
    await SH.pickAnimal(wrongJ);                      // 错一次（不换题）
    const r = await SH.pickAnimal(rightJ);            // 改对推进
    if (r !== 'right' && r !== 'done') smokes.star2q = null;
  }
  const a15b = await SH.autoSolve();
  smokes.star2q = smokes.star2q === null ? { ok: false } :
    { ok: a15b.done && SH.currentLevel.stars === 2 && SH.currentLevel.qmiss === 1 &&
         SH.currentLevel.miss === 0,
      stars: SH.currentLevel.stars, qmiss: SH.currentLevel.qmiss };
  const smokeAll = smoke0 && smoke10 && smoke15 && smokes.star2.ok && smokes.star2q.ok;
  if (smokeAll) npass++;

  /* ---- ⑥ 星级规则（引擎级构造直测；r22 探索总成本=takebacks+qMiss 合计分档） ---- */
  total++;
  const LS = genLevel(10);
  const t3 = engStars(Object.assign({}, LS, { takebacks: 0 })) === 3;
  const t2a = engStars(Object.assign({}, LS, { takebacks: 1 })) === 2;
  const t2b = engStars(Object.assign({}, LS, { takebacks: 2 })) === 2;
  const t1a = engStars(Object.assign({}, LS, { takebacks: 3 })) === 1;
  const t1b = engStars(Object.assign({}, LS, { takebacks: 7 })) === 1;
  const q3 = engStars(Object.assign({}, LS, { takebacks: 0, qMiss: 0 })) === 3;      // r22 合计 0
  const q2 = engStars(Object.assign({}, LS, { takebacks: 0, qMiss: 2 })) === 2;      // 纯答错 2 次
  const q2m = engStars(Object.assign({}, LS, { takebacks: 1, qMiss: 1 })) === 2;     // 混合计 2
  const q1 = engStars(Object.assign({}, LS, { takebacks: 0, qMiss: 3 })) === 1;      // 纯答错 3 次
  const q0 = engStars(null) === 1;                                                   // 无关兜底=1★ 永不 0
  const starsOk = t3 && t2a && t2b && t1a && t1b && q3 && q2 && q2m && q1 && q0;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, t3: t3, t2: t2a && t2b, t1: t1a && t1b,
                  q3: q3, q2: q2 && q2m, q1: q1, floor1: q0 };

  /* ---- ⑦ 教学链：tutorialWatch 真实走完 → __shDemoR='right'（演示即完整一题） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };            // verify 页存档 stub
  KIDS.store.persist = function () {};
  SH.start(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;            // 折算真实页时长
  const tutOk = window.__shDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].n === 2 && cur.quizzes[0].k === 2 &&
                tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__shDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑧ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + tray bump 微动效 ---- */
  total++;
  SH.start(0);
  state.demo = true; state.locked = true;                          // 模拟教学"看"演示期
  const swallow1 = SH.tapCandy(0) === false && trayEl.classList.contains('bump');
  const swallow1b = (await SH.tapBowl(0)) === false;               // 演示期点碗也被拦
  state.demo = false; state.locked = true;                         // 演出窗口（locked）
  const swallow2 = SH.tapCandy(0) === false;
  const swallow2b = (await SH.tapPlate()) === false;
  state.locked = false;                                            // 还原
  const swallowOk = swallow1 && swallow1b && swallow2 && swallow2b && SH.quiz.tray === 2;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1 && swallow1b, locked: swallow2 && swallow2b };

  /* ---- ⑨ 布局：双 viewport ×（k2 大糖数关碗满态 / k3 剩余关引导态）量测+对比度 ---- */
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
  /* 选关（genLevel 确定性直查）：k2 大糖数关（quiz0 k=2 且 n 大者）+ k3 剩余关
     （flat10 恒 dch3 → quiz0 必剩余题）+ r22 k4 关（quiz0 k=4）+ dch4 作答关（flat15）；
     找不到时兜底 1/10 */
  let flatK2 = -1, flatK3 = -1, flatK4 = -1;
  for (let f = 0; f < 40; f++) {
    const q0 = genLevel(f).quizzes[0];
    if (flatK2 < 0 && q0.k === 2 && q0.n >= 8) flatK2 = f;
    if (flatK3 < 0 && q0.k === 3 && q0.n % 3 !== 0) flatK3 = f;
    if (flatK4 < 0 && q0.k === 4 && (q0.mode || 'split') === 'split') flatK4 = f;
  }
  if (flatK2 < 0) flatK2 = 1;
  if (flatK3 < 0) flatK3 = 10;
  if (flatK4 < 0) flatK4 = 10;                        /* r22：dch3 恒 2 题 k4，quiz0 兜底可遇 */
  async function simView(w, h, flat, nostart) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    if (!nostart) SH.start(flat);               /* 审查m1：nostart=在当前已驱动态量测（numkey 补样） */
    const q = cur.quizzes[cur.step];
    const isAns = !!q.mode && q.mode !== 'split';      /* r22 作答题：碗阵静态无填糖 */
    if (!isAns) {
      /* 填碗恰 n-1 颗（均衡铺开）：placed<n 恒不判对换题；k3/k4 剩余关可能停进引导态
         （小盘点亮），k2 整除关停在中间态——布局量测在碗近满态进行 */
      const placed = q.n - 1;
      const per = Math.floor(placed / q.k), rem = placed % q.k;
      for (let j = 0; j < q.k; j++) {
        const cnt = per + (j < rem ? 1 : 0);
        for (let t = 0; t < cnt; t++) { uiTapCandy(0); await uiTapBowl(j); }
      }
    }
    const candies = Array.prototype.map.call(trayEl.querySelectorAll('.candy'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const bcandies = Array.prototype.map.call(stationsEl.querySelectorAll('.bcandy'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const stats = Array.prototype.map.call(stationsEl.querySelectorAll('.station'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const numkeys = Array.prototype.map.call(trayEl.querySelectorAll('.numkey'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const askbtns = Array.prototype.map.call(trayEl.querySelectorAll('.askbtn'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const plateOn = plateBtn.classList.contains('show');
    const plate = { w: plateBtn.offsetWidth, h: plateBtn.offsetHeight };
    const chip = { w: chipEl.offsetWidth, h: chipEl.offsetHeight };
    const candyOk = (isAns || (candies.length > 0 && candies.every(b => b.w >= 64 && b.h >= 64)));
    const bowlOk = bcandies.length > 0 && bcandies.every(b => b.w >= 64 && b.h >= 64);
    const statOk = stats.length === q.k && stats.every(b => b.w >= 64 && b.h >= 64);
    const keyOk = (numkeys.length + askbtns.length === 0) ||
                  numkeys.concat(askbtns).every(b => b.w >= 64 && b.h >= 64);   /* r22 作答钮 ≥64 */
    const plateOk = !plateOn || (plate.w >= 64 && plate.h >= 64);
    const chipOk = chip.w >= 64 && chip.h >= 64;
    /* 对比度：糖/碗描边（SVG stroke=INK）对各自底色 ≥3:1（浅色糖靠深描边承担） */
    const strokes = Array.from(trayEl.querySelectorAll('.candy svg [stroke], .numkey, .askbtn'))
      .map(el => el.tagName === 'BUTTON' ? '#4A3B2E' : el.getAttribute('stroke')).filter(Boolean);
    const cCandy = (isAns ? strokes.length >= 1 : strokes.length >= 2) &&
                   strokes.every(s => ratioOf(s, '#EAD9BC') >= 3);
    const bowlBorder = cssToHex(getComputedStyle(stationsEl.querySelector('.station .bowl-base')).borderTopColor);
    const cBowl = ratioOf(bowlBorder, '#DCE7C2') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, n: q.n, k: q.k, mode: q.mode || 'split',
             candies: candies.length, bcandies: bcandies.length, stations: stats.length,
             numkeys: numkeys.length, askbtns: askbtns.length,
             candyOk: candyOk, bowlOk: bowlOk, statOk: statOk, keyOk: keyOk, plateOk: plateOk,
             chipOk: chipOk, contrast: cCandy && cBowl, ox: ox,
             pass: candyOk && bowlOk && statOk && keyOk && plateOk && chipOk && cCandy && cBowl && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [flatK2, flatK3, flatK4, 15]) {   /* r22：k4 关+dch4 作答关入样 */
    sims.push(await simView(1280, 800, flat));
    sims.push(await simView(800, 1180, flat));
  }
  /* 审查m1：flat15 qi0 恒 cmp-who（tray 只渲染 .askbtn 无 numkey）——驱动至首个数字钮题
     （cmp-diff/rev）补量两视口；keyOk 在 numkeys>0 时才真正绑定尺寸断言 */
  SH.start(15);
  let numkeyOk = false;
  for (let g6 = 0; g6 < 6; g6++) {
    const qq = cur.quizzes[cur.step];
    if (!qq || cur.done) break;
    if (qq.opts) {
      const d1 = await simView(1280, 800, 15, true);
      const d2 = await simView(800, 1180, 15, true);
      sims.push(d1, d2);
      numkeyOk = d1.numkeys > 0 && d2.numkeys > 0 && d1.pass && d2.pass;
      break;
    }
    const mx = Math.max.apply(null, qq.dist);          /* cmp-who：选唯一 max 站推进 */
    await SH.pickAnimal(qq.dist.indexOf(mx));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  SH.start(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass) && numkeyOk;
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, numkeyOk: numkeyOk, sims: sims, flatK2: flatK2, flatK3: flatK3 };

  /* ---- ⑩ clips：子集式（sha_ 40 必备+core 3 精确在场+总数 ≥43——主线注册 r22 新 11 键后 54 亦过，
     SPEC-R22 §R6/r20·r21 范式：防注册前后断言漂移） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['sha_tut_watch', 'sha_tut_turn', 'sha_hint', 'sha_right', 'sha_plate'];
  const t46Quiz = [];
  for (let n = 2; n <= 12; n++) for (const k of [2, 3]) t46Quiz.push('sha_q_' + n + '_' + k);
  const t46Num = [];
  for (let n = 0; n <= 12; n++) t46Num.push('sha_n_' + n);
  const coreNeed = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const clipsOk = keys.length >= 43 &&
    need.concat(t46Quiz, t46Num, coreNeed).every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, keys: keys };

  /* ---- ⑪ C7 型章末预告断言：hint=预告下一章 + GEN_HINTS[k]↔dch=k+1（禁右移）
     CHAPTERS[i].hint 存的就是"预告 i+1 章"的文案 → nextHint(章末 flat)=CHAPTERS[该章].hint
     （如 ch1 末 flat4 → CHAPTERS[1].hint，其文案预告 ch2 三只）；生成关 GEN_HINTS 同理；
     r22 新文案关键词（ch3 预告带'四'、ch4 预告带'比'与'数'） ---- */
  total++;
  const hintMap = nextHint(4) === CHAPTERS[1].hint &&          // ch1 末（ci=0）→ ch1 配置 hint=预告 ch2
                  nextHint(9) === CHAPTERS[2].hint &&          // ch2 末 → 预告 ch3
                  nextHint(14) === CHAPTERS[3].hint &&         // ch3 末 → 预告 ch4
                  nextHint(19) === CHAPTERS[4].hint &&         // ch4 末 → 预告生成关
                  nextHint(24) === GEN_HINTS[1] &&             // ch5 末（dch1）→ 下一章 dch2（三只）
                  nextHint(29) === GEN_HINTS[2] &&             // ch6 末（dch2）→ dch3（四只分不完放盘）
                  nextHint(34) === GEN_HINTS[3];               // ch7 末（dch3）→ dch4（比一比数一数）
  const kw = s => t => s.indexOf(t) >= 0;
  const kwOk = kw(CHAPTERS[1].hint)('三') &&                   // 预告 ch2：三只
               kw(CHAPTERS[2].hint)('四') && kw(CHAPTERS[2].hint)('盘') &&   // 预告 ch3：四只+放小盘（r22）
               kw(CHAPTERS[3].hint)('比') && kw(CHAPTERS[3].hint)('数') &&   // 预告 ch4：比一比数一数（r22）
               kw(GEN_HINTS[0])('两') && kw(GEN_HINTS[1])('三') &&
               kw(GEN_HINTS[2])('四') && kw(GEN_HINTS[2])('盘') &&
               kw(GEN_HINTS[3])('比') && kw(GEN_HINTS[3])('数');
  const hintOk = hintMap && kwOk;
  if (hintOk) npass++;
  units.hints = { ok: hintOk, map: hintMap, keywords: kwOk };

  /* ---- ⑫ 语音文案对账（manifest 严格一致）+ numCn 数词表 + r22 题面文案 ---- */
  total++;
  const expectVoice = {
    watch: ['sha_tut_watch', '看！一人分一颗'],
    turn:  ['sha_tut_turn', '你来分一分'],
    hint:  ['sha_hint', '数数每只碗里几颗'],
    right: ['sha_right', '每只一样多，真公平'],
    plate: ['sha_plate', '剩下的放小盘子吧']
  };
  const voiceOk = Object.keys(expectVoice).every(k =>
    VOICE[k].key === expectVoice[k][0] && VOICE[k].text === expectVoice[k][1]);
  const NUMCN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
  const numOk = NUMCN.every((t, i) => numCn(i) === t);
  const speechOk = quizSpeech({ n: 6, k: 2 }) === '六颗糖，分给两只小动物，每只一样多';
  const speech4Ok = quizSpeech({ mode: 'split', n: 11, k: 4 }) === '十一颗糖，分给四只小动物，每只一样多';
  const cmpOk = quizSpeech({ mode: 'cmp', ask: 'who' }) === '谁的糖果多呀' &&
                quizSpeech({ mode: 'cmp', ask: 'diff' }) === '多几颗呀' &&
                quizSpeech({ mode: 'rev' }) === '数一数，一共有几颗糖呀';
  const vOk = voiceOk && numOk && speechOk && speech4Ok && cmpOk;
  if (vOk) npass++;
  units.voice = { ok: vOk, voice: voiceOk, num: numOk, speech: speechOk,
                  speech4: speech4Ok, cmp: cmpOk };

  /* ---- ⑬ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑭ r22 作答面单元（flat15=dch4 首，真实 UI 状态机，§R4） ---- */
  total++;
  SH.start(15);
  const q14 = SH.quiz;
  const init14 = q14 && q14.mode === 'cmp' && q14.ask === 'who' && q14.step === 0 &&
                 q14.tray === 0 && q14.tries === 0 && q14.picked === -1 &&
                 q14.bowls.length === q14.k;
  const gCandy = SH.tapCandy(0) === false;                 // cmp 题点糖=吞输入（engTapCandy null）
  const gBowl = (await SH.tapBowl(0)) === false;           // cmp-who 点碗通道=吞输入（作答走 pickAnimal）
  const gBack = (await SH.takeBack(0, 0)) === false;       // 静态碗阵禁取回
  const gPlate = (await SH.tapPlate()) === false;          // 无引导态
  let rightJ = 0;
  for (let t = 1; t < q14.bowls.length; t++) if (q14.bowls[t] > q14.bowls[rightJ]) rightJ = t;
  const wrongJ = rightJ === 0 ? 1 : 0;
  const badA = (await SH.pickAnimal(99)) === false;        // 越界站=吞输入
  const wA = await SH.pickAnimal(wrongJ);                  // 选错站=wrong 不换题可重选
  const wOk = wA === 'wrong' && SH.quiz.step === 0 && SH.quiz.tries === 1 &&
              SH.currentLevel.qmiss === 1 && SH.currentLevel.miss === 0;
  const sA = await SH.pickAnimal(wrongJ);                  // 重复同站=same 不判不罚
  const sOk = sA === 'same' && SH.quiz.tries === 1 && SH.currentLevel.qmiss === 1;
  const rA = await SH.pickAnimal(rightJ);                  // 选对站=推进
  const rOk = rA === 'right' && SH.quiz.step === 1 && SH.quiz.tries === 0;
  /* 数字钮题：dch4 保底 diff≥1 或 rev≥1 → 5 题内必遇 opts 题（who 逐个做完） */
  let numQ = null;
  for (let g14 = 0; g14 < 6 && !numQ; g14++) {
    const info = SH.quiz;
    if (!info) break;
    if (info.opts) { numQ = info; break; }
    if (info.mode === 'cmp' && info.ask === 'who') {
      let j = 0;
      for (let t = 1; t < info.bowls.length; t++) if (info.bowls[t] > info.bowls[j]) j = t;
      await SH.pickAnimal(j);
    }
  }
  const badN = numQ ? (await SH.pickNum(99)) === false : false;   // 越界钮=吞输入
  let nOk = false, nWrong = null, nRight = null;
  if (numQ) {
    const ans = numQ.mode === 'rev' ? numQ.x * numQ.k
              : Math.max.apply(null, numQ.bowls) - Math.min.apply(null, numQ.bowls);
    const wi = numQ.opts.findIndex(v => v !== ans);
    nWrong = await SH.pickNum(wi);                         // 选错数=wrong 可重选
    const wNok = nWrong === 'wrong' && SH.currentLevel.qmiss === 2;
    nRight = await SH.pickNum(numQ.opts.indexOf(ans));     // 选对=推进
    nOk = numQ.opts.length === 4 && new Set(numQ.opts).size === 4 &&
          numQ.opts.indexOf(ans) >= 0 && wNok &&
          (nRight === 'right' || nRight === 'done');
  }
  const ansOk = init14 && gCandy && gBowl && gBack && gPlate && badA && wOk && sOk && rOk &&
                !!numQ && badN && nOk;
  if (ansOk) npass++;
  units.answer = { ok: ansOk, init: init14, guardCandy: gCandy, guardBowl: gBowl,
                   guardBack: gBack, guardPlate: gPlate, badPick: badA, wrong: wOk, same: sOk,
                   right: rOk, numQ: numQ && { mode: numQ.mode, ask: numQ.ask, opts: numQ.opts },
                   badNum: badN, numWrong: nWrong, numRight: nRight };

  /* ---- ⑮ r22 首次新作答视觉预告（§R4：作答钮次第 bounce .tease 在场；verify 页不写档
     每关重触发——startLevel 重置 ansTeased） ---- */
  total++;
  SH.start(15);
  let teased = false;
  for (let t = 0; t < 20 && !teased; t++) {
    await wait(100);
    teased = !!document.querySelector('.numkey.tease, .askbtn.tease, .station.tease');
  }
  const introOk = teased;
  if (introOk) npass++;
  units.ansIntro = { ok: introOk, teased: teased };

  const out = { game: 'share', total: total, pass: npass, layoutOk: layoutOk,
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
  KIDS.voice.queue = function () {};
  runVerify();
}
