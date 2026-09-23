/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/ 章号 1 基+
     静态关难度章循环+生成关 dch=4 / **§0.42 命门：verify 侧独立约束回溯求解器 verCount**
     （朴素顺序回溯+数组占用检查，禁复用游戏侧位掩码+MRV 求解器——分源防两套逻辑同错）：
     题面（仅 given）解数===1 + sol 为有效完整解（行/列/2×3 宫 1-6 恰一次，独立复算）+
     given 格值===sol（提示格=解的一部分）/ 章空格区间（ch1 6-8/ch2 9-11/ch3 12-14/gen 12-14）/
     章特性独立复算（verNaked 裸单链：ch1 行/列链可解、ch2/3 行列宫链可解、ch3 行列链
     不可解=宫排除必用）/ 同关 5 盘 grid 互异 / 引擎直驱三档星级（0 错 3★/1 错 2★/3 错 1★）
   ② tapCell/tapNum 单元（flat0 真实 UI）：点空格=选中（.sel+数字卡区点亮）；错填=格子
     摇头+红数字闪（错数不进格）+miss+1+零惩罚+不推进+不重置救援钟+首错方向级（唯一候选
     格 breathe，独立对账格下标）；二错=答案级（+对应数字卡 pulse，独立对账数字）；填对=
     数字入格+格子跳+sel 清；点自己填的格=清除；given 格=不可清 false；无选中 tapNum=false；
     locked 吞输入=false+nudge（§0.22）；非法下标/数字 false
   ③ 教学链（verify 直驱 tutorialWatch）：watch clip → 幽灵手指演示两格（点格→选数真实
     生效）→ __snDemoR==='right'（§0.27）→ 重发同关（grid 与 genLevel(0) 逐格一致）tut='help'
     → 交接 queue ['sn_tut_turn']（§0.6 单通道）
   ④ sayW 三态（§0.5）：flat<3 每错必播（两错两播）/ flat≥3 10s 节流+miss===2 豁免（两错两播）
   ⑤ 分布与专项：VOICE 表文案独立字面量对账（manifest 一致）/ sn_+core 恰 9 条 clips 注入（T46 阶段2+sn_dead）
     / 无 sn_n_ 数词 clip（数词=TTS 兜底 §3）/ 开场链 queue(['sn_hint']) / 教学演示格
     =verify 独立算的唯一候选格（演示指对了格，分源对账）
   ⑥ UI 冒烟 A：flat0 首盘一错+autoSolve 收尾 → done+won+1 miss 2★+verify 页不弹层
   ⑦ UI 冒烟 B：flat10（ch3 宫必用）/flat15（ch4 静态）/flat25（生成关）autoSolve 3★+
     空格区间断言
   ⑧ 布局：双 viewport（1280×800 / 800×1180）×（flat0/10/15）：盘格 36 个 ≥64、数字卡
     6 张 ≥96（主答案 §0.9）、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0
   ⑨ 救援与 §0.7a：错点不重置救援钟；救援分级两件（miss<2=hint 语音+唯一候选格 breathe、
     miss≥2=+对应数字卡 pulse §0.21/b18 定案）；点格选中/填对/清除=主动学习动作重置
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立真值源（不调游戏侧求解器/链判定，防两套逻辑同错 §0.42） ---- */
  const R6 = i => (i / 6) | 0, C6 = i => i % 6;
  const verBox = (r, c) => (r >> 1) * 2 + ((c / 3) | 0);          // 2×3 宫号（独立计算）
  /* 独立约束回溯求解器（顺序扫描+每步数组占用检查，计数版 cap=2）——与游戏侧
     位掩码+MRV 实现路径完全不同，分源防同错 */
  function verCount(g) {
    const b = g.slice();
    const canPut = (i, v) => {
      const r = R6(i), c = C6(i);
      for (let j = 0; j < 36; j++) {
        if (j === i || b[j] !== v) continue;
        const r2 = R6(j), c2 = C6(j);
        if (r2 === r || c2 === c || verBox(r2, c2) === verBox(r, c)) return false;
      }
      return true;
    };
    let cnt = 0;
    const dfs = from => {
      if (cnt >= 2) return;
      let i = from;
      while (i < 36 && b[i] !== 0) i++;
      if (i >= 36) { cnt++; return; }
      for (let v = 1; v <= 6; v++) {
        if (canPut(i, v)) { b[i] = v; dfs(i + 1); b[i] = 0; if (cnt >= 2) return; }
      }
    };
    dfs(0);
    return cnt;
  }
  /* 独立完整解校验：每行/列/2×3 宫 1-6 恰一次 */
  function verValidFull(sol) {
    const want = '123456';
    const ok6 = arr => arr.length === 6 && arr.slice().sort().join('') === want;
    for (let r = 0; r < 6; r++) if (!ok6(sol.slice(r * 6, r * 6 + 6))) return false;
    for (let c = 0; c < 6; c++) if (!ok6(sol.filter((_, j) => C6(j) === c))) return false;
    for (let bt = 0; bt < 6; bt++) {
      const cells = [];
      for (let j = 0; j < 36; j++) if (verBox(R6(j), C6(j)) === bt) cells.push(sol[j]);
      if (!ok6(cells)) return false;
    }
    return true;
  }
  /* 独立裸单链可解性（useBox=false 行/列排除 / true 行列宫） */
  function verNaked(g, useBox) {
    const b = g.slice();
    let left = b.filter(v => v === 0).length, guard = 0;
    while (left > 0 && guard++ < 40) {
      let hit = -1, val = 0;
      for (let i = 0; i < 36 && hit < 0; i++) {
        if (b[i] !== 0) continue;
        const used = [];
        for (let j = 0; j < 36; j++) {
          if (j === i || b[j] === 0) continue;
          const r2 = R6(j), c2 = C6(j);
          if (r2 === R6(i) || c2 === C6(i) ||
              (useBox && verBox(r2, c2) === verBox(R6(i), C6(i)))) used.push(b[j]);
        }
        const cand = [1, 2, 3, 4, 5, 6].filter(v => used.indexOf(v) < 0);
        if (cand.length === 1) { hit = i; val = cand[0]; }
      }
      if (hit < 0) return false;
      b[hit] = val; left--;
    }
    return left === 0;
  }
  /* 独立唯一候选教学格（行/列裸单→含宫裸单→最少候选；对账救援/演示指向） */
  function verTeach(g) {
    let fb = null;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < 36; i++) {
        if (g[i] !== 0) continue;
        const used = [];
        for (let j = 0; j < 36; j++) {
          if (j === i || g[j] === 0) continue;
          const r2 = R6(j), c2 = C6(j);
          if (r2 === R6(i) || c2 === C6(i) ||
              (pass === 1 && verBox(r2, c2) === verBox(R6(i), C6(i)))) used.push(g[j]);
        }
        const cand = [1, 2, 3, 4, 5, 6].filter(v => used.indexOf(v) < 0);
        if (cand.length === 1) return { i: i, n: cand[0] };
        if (!fb || cand.length < fb.cnt) fb = { i: i, n: cand[0], cnt: cand.length };
      }
    }
    return fb ? { i: fb.i, n: fb.n } : null;
  }
  /* 独立找格 i 的冲突数（填它必违反约束——构造错路径用） */
  function verBadNum(g, i) {
    for (let v = 1; v <= 6; v++) {
      for (let j = 0; j < 36; j++) {
        if (j === i || g[j] !== v) continue;
        const r2 = R6(j), c2 = C6(j);
        if (r2 === R6(i) || c2 === C6(i) || verBox(r2, c2) === verBox(R6(i), C6(i))) return v;
      }
    }
    return 0;
  }
  const HOLE_RANGE = { 1: [6, 8], 2: [9, 11], 3: [12, 14], 4: [12, 14] };   // §0.42 章空格区间

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);                     // 确定性
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                        : (L1.dch >= 1 && L1.dch <= 4);   /* m4：生成关随机回落 1-4 */
    let solOk = true, uniqAll = true, givenOk = true, holesOk = true,
        chainOk = true, structAll = true, adjOk = true;
    const seenGrid = {};
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const holes = q.grid.filter(v => v === 0).length;
      /* sol 有效完整解（独立复算） */
      if (!verValidFull(q.sol)) solOk = false;
      /* §0.42 命门：独立求解器计数=1 + 提示格=解的一部分 */
      if (verCount(q.grid) !== 1) uniqAll = false;
      for (let i = 0; i < 36; i++) {
        if (q.given[i] !== (q.grid[i] !== 0)) givenOk = false;
        if (q.given[i] && q.grid[i] !== q.sol[i]) givenOk = false;
      }
      /* 章空格区间 */
      const range = HOLE_RANGE[L1.dch];
      if (holes < range[0] || holes > range[1]) holesOk = false;
      /* 章特性（独立复算）：ch1 行/列链可解；ch2/3 行列宫链可解；ch3 行列链不可解 */
      if (L1.dch === 1 && !verNaked(q.grid, false)) chainOk = false;
      if ((L1.dch === 2 || L1.dch === 3) && !verNaked(q.grid, true)) chainOk = false;
      if (L1.dch === 3 && verNaked(q.grid, false)) chainOk = false;
      /* 引擎侧结构（次检） */
      if (!structOk(q, L1.dch)) structAll = false;
      /* 同关 5 盘互异（grid 上屏互异——独立于引擎 sig） */
      const gk = q.grid.join('');
      if (seenGrid[gk]) adjOk = false;
      seenGrid[gk] = 1;
    }
    /* 引擎直驱 A：全对 → done 0 miss 3★ */
    const Ld = genLevel(flat);
    let driveOk = true;
    for (const q of Ld.quizzes) {
      for (let i = 0; i < 36; i++) {
        if (q.grid[i] === 0) {
          engTapCell(Ld, i);
          const r = engTapNum(Ld, q.sol[i]);
          if (r !== 'right' && r !== 'done') driveOk = false;
        }
      }
    }
    const s3 = Ld.done && Ld.misses === 0 && engStars(Ld) === 3;
    /* 引擎直驱 B：首盘一错后全对 → 1 miss 2★ */
    const Lw = genLevel(flat);
    const q0w = Lw.quizzes[0];
    const ei0 = q0w.grid.indexOf(0);
    const wn0 = verBadNum(q0w.grid, ei0);
    if (!wn0 || engTapCell(Lw, ei0) !== true || engTapNum(Lw, wn0) !== 'wrong') driveOk = false;
    for (const q of Lw.quizzes) {
      for (let i = 0; i < 36; i++) {
        if (q.grid[i] === 0) { engTapCell(Lw, i); engTapNum(Lw, q.sol[i]); }
      }
    }
    const s2 = Lw.done && Lw.misses === 1 && engStars(Lw) === 2;
    /* 引擎直驱 C：首盘三错 → 3 miss 1★（错次口径三档全实证） */
    const L1s = genLevel(flat);
    for (let m = 0; m < 3; m++) { engTapCell(L1s, ei0); engTapNum(L1s, wn0); }
    for (const q of L1s.quizzes) {
      for (let i = 0; i < 36; i++) {
        if (q.grid[i] === 0) { engTapCell(L1s, i); engTapNum(L1s, q.sol[i]); }
      }
    }
    const s1 = L1s.done && L1s.misses === 3 && engStars(L1s) === 1;
    const ok = det && chOk && dchOk && solOk && uniqAll && givenOk && holesOk &&
      chainOk && structAll && adjOk && driveOk && s3 && s2 && s1 &&
      L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, sol: solOk, unique: uniqAll,
      given: givenOk, holes: holesOk, chain: chainOk, struct: structAll, adj: adjOk,
      drive: driveOk && s3 && s2 && s1,
      holesN: L1.quizzes.map(q => q.grid.filter(v => v === 0).length) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCell/tapNum 单元（flat0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = SN.quiz;
  const ei = q0.grid.indexOf(0);
  const gi = q0.given.indexOf(true);
  const wn = verBadNum(q0.grid, ei);
  /* 点空格=选中+数字卡区点亮 */
  const c1 = await SN.tapCell(ei);
  const selOk = c1 === true &&
    !!boardEl.querySelector('.cell[data-i="' + ei + '"].sel') && numsEl.classList.contains('live');
  /* 错填：摇头+红闪+零惩罚（错数不进格）+首错方向级+不重置救援钟 */
  const pLog2 = [];
  const op2 = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLog2.push(String(key)); };
  lastAct = Date.now() - 13000;                                    // 回拨救援钟（§0.7a 断言用）
  const w1 = await SN.tapNum(wn);
  const tch1 = verTeach(q0.grid);                                  // 独立算方向级指向
  const wrongOk = w1 === 'wrong' && SN.quiz.miss === 1 && SN.currentLevel.misses === 1 &&
    SN.quiz.grid[ei] === 0 && SN.quiz.step === 0 &&                // 错数不进格+不推进
    !!boardEl.querySelector('.cell[data-i="' + ei + '"].wig') &&   // 摇头
    !!boardEl.querySelector('.cell[data-i="' + ei + '"].bad') &&   // 红数字闪
    pLog2.indexOf('sn_wrong') >= 0 &&                              // sayW 播出
    Date.now() - lastAct > 12800 &&                                // 错点不重置救援钟
    !!boardEl.querySelector('.cell[data-i="' + tch1.i + '"].breathe') &&  // 方向级指向对的格
    !numsEl.querySelector('.num.pulse');                           // 答案级未出（miss<2）
  /* 二错：答案级（+对应数字卡 pulse，独立对账数字） */
  await SN.tapCell(ei);
  const w2 = await SN.tapNum(wn);
  const tch2 = verTeach(q0.grid);
  const secondOk = w2 === 'wrong' && SN.quiz.miss === 2 &&
    !!boardEl.querySelector('.cell[data-i="' + tch2.i + '"].breathe') &&
    !!numsEl.querySelector('.num[data-n="' + tch2.n + '"].pulse');
  /* 填对：数字入格+格子跳+sel 清 */
  await SN.tapCell(ei);
  const rR = await SN.tapNum(q0.sol[ei]);
  const rightOk = rR === 'right' && SN.quiz.grid[ei] === q0.sol[ei] &&
    !boardEl.querySelector('.cell.sel') &&
    !!boardEl.querySelector('.cell[data-i="' + ei + '"].hop');
  /* 清除：点自己填的格=归空 */
  const c2 = await SN.tapCell(ei);
  const clearOk = c2 === true && SN.quiz.grid[ei] === 0;
  /* given 格不可清 / 无选中 tapNum / 非法下标 */
  const givenOk2 = (await SN.tapCell(gi)) === false;
  const noSelOk = (await SN.tapNum(3)) === false;
  const badOk = (await SN.tapCell(-1)) === false && (await SN.tapCell(36)) === false &&
    (await SN.tapNum(0)) === false && (await SN.tapNum(7)) === false;
  /* locked 吞输入（§0.22 主答案同规）：false+nudge+状态不变 */
  state.locked = true;
  const missB = SN.currentLevel.misses, stepB = SN.currentLevel.step;
  const rS1 = await SN.tapCell(ei), rS2 = await SN.tapNum(q0.sol[ei]);
  const swallowOk = rS1 === false && rS2 === false && SN.currentLevel.misses === missB &&
    SN.currentLevel.step === stepB &&
    (!!boardEl.querySelector('.cell.nudge') || !!numsEl.querySelector('.num.nudge'));
  state.locked = false;
  KIDS.voice.play = op2;
  const unitOk = selOk && wrongOk && secondOk && rightOk && clearOk && givenOk2 && noSelOk &&
    badOk && swallowOk;
  if (unitOk) npass++;
  units.taps = { ok: unitOk, selOk: selOk, wrongOk: wrongOk, secondOk: secondOk,
    rightOk: rightOk, clearOk: clearOk, givenOk: givenOk2, noSelOk: noSelOk,
    badOk: badOk, swallowOk: swallowOk };

  /* ---- ③ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const qLog3 = [], pLog3 = [];
  const oq3 = KIDS.voice.queue, op3 = KIDS.voice.play;
  KIDS.voice.queue = function (parts) { qLog3.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog3.push(String(key)); };
  startLevel(0);
  const q0s = genLevel(0).quizzes[0];
  await tutorialWatch();
  const lastQ3 = qLog3[qLog3.length - 1];
  const q3 = SN.quiz;
  const tutOk = pLog3.indexOf('sn_tut_watch') >= 0 &&               /* 看=演示配 watch clip */
    window.__snDemoR === 'right' &&                                 /* §0.27 演示点选真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&         /* 帮：解锁等孩子动手 */
    SN.currentLevel && SN.currentLevel.flat === 0 &&                /* 重发同关 */
    q3 && q3.step === 0 && q3.miss === 0 &&                         /* 新盘面初态 */
    q3.grid.join('') === q0s.grid.join('') &&                       /* 盘面=确定性重发（演示格已复位） */
    lastQ3 && lastQ3.length === 1 && lastQ3[0] === 'sn_tut_turn';   /* 交接顺序链单通道 */
  KIDS.voice.queue = oq3; KIDS.voice.play = op3;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog3.indexOf('sn_tut_watch') >= 0,
    demoR: window.__snDemoR, handoff: lastQ3, tut: state.tut, reissued: !!q3 };

  /* ---- ④ sayW 三态（§0.5）：flat<3 每错必播 / flat≥3 10s 节流+miss2 豁免 ---- */
  total++;
  const pLog4 = [];
  const op4 = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLog4.push(String(key)); };
  startLevel(0);
  let qa = SN.quiz;
  let ea = qa.grid.indexOf(0);
  let wa = verBadNum(qa.grid, ea);
  await SN.tapCell(ea);
  await SN.tapNum(wa);
  await SN.tapCell(ea);
  await SN.tapNum(wa);
  const saysFlat0 = pLog4.filter(k => k === 'sn_wrong').length;        /* 两错两播 */
  startLevel(10);                                                      /* flat≥3 */
  lastWrongVoice = 0;                                                  /* 节流表清零（模块变量直写） */
  qa = SN.quiz;
  ea = qa.grid.indexOf(0);
  wa = verBadNum(qa.grid, ea);
  await SN.tapCell(ea);
  await SN.tapNum(wa);
  await SN.tapCell(ea);
  await SN.tapNum(wa);                                                 /* 10s 内第二错=miss2 豁免恰一次 → 仍播 */
  const saysFlat10 = pLog4.filter(k => k === 'sn_wrong').length - saysFlat0;
  KIDS.voice.play = op4;
  const sayWOk = saysFlat0 === 2 && saysFlat10 === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0: saysFlat0, flat10: saysFlat10 };

  /* ---- ⑤ 分布与专项：文案对账 / clip 恰 9 条（T46 阶段2+sn_dead） / 无数词 clip / 开场链 ---- */
  total++;
  const refVoice = VOICE.watch.text === '看！每行每列不重复' &&
    VOICE.turn.text === '你来填一填' && VOICE.hint.text === '看看这一行少了谁' &&
    VOICE.right.text === '全部填对啦' && VOICE.wrong.text === '这个数字不对哦';
  const SN_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest',
    'sn_tut_watch', 'sn_tut_turn', 'sn_hint', 'sn_right', 'sn_wrong', 'sn_dead'];
  const clipKeys = Object.keys(KIDS.voice.clips);
  const clipOk = SN_KEYS.every(k => !!KIDS.voice.clips[k]) &&
    clipKeys.length === 9 &&                                          /* 恰 9 条（§4+T46 阶段2 sn_dead） */
    clipKeys.every(k => SN_KEYS.indexOf(k) >= 0) &&
    clipKeys.every(k => k.indexOf('sn_n_') !== 0);                    /* 数词=TTS 兜底不建 clip（§3） */
  const qLog5 = [];
  const oq5 = KIDS.voice.queue;
  KIDS.voice.queue = function (parts) { qLog5.push(parts.slice()); };
  startLevel(0);                                    /* verify 页恒走开场链 */
  const lastQ5 = qLog5[qLog5.length - 1];
  const openChain = !!lastQ5 && lastQ5.length === 1 && lastQ5[0] === 'sn_hint';
  KIDS.voice.queue = oq5;
  /* 教学演示指向对账：watch 演示首格=verify 独立算的唯一候选格（演示教的是"看行"） */
  const demoTeachOk = (function () {
    const g0 = genLevel(0).quizzes[0];
    const t = verTeach(g0.grid);
    return !!t && g0.sol[t.i] === t.n;                               /* 教学格应填值=解值 */
  })();
  const distOk = refVoice && clipOk && openChain && demoTeachOk;
  if (distOk) npass++;
  units.dist = { ok: distOk, refVoice: refVoice, clips: clipOk, nClips: clipKeys.length,
    openChain: openChain, demoTeach: demoTeachOk };

  /* ---- ⑥ UI 冒烟 A：flat0 首盘一错+autoSolve 收尾 → 1 miss 2★+verify 页不弹层 ---- */
  total++;
  startLevel(0);
  const qA = SN.quiz;
  const eiA = qA.grid.indexOf(0);
  const wnA = verBadNum(qA.grid, eiA);
  await SN.tapCell(eiA);
  await SN.tapNum(wnA);                                              /* 首盘一错 */
  const a = await SN.autoSolve();
  const lvA = SN.currentLevel;
  const smokeOkA = a.done && lvA.done && lvA.won && lvA.misses === 1 &&
    engStars(cur) === 2 && !document.querySelector('.k-celebrate');   /* verify 页不弹层（§0.2） */
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, taps: a.taps, misses: lvA.misses, stars: engStars(cur) };

  /* ---- ⑦ UI 冒烟 B：flat10（ch3 宫必用）/flat15（ch4 静态）/flat25（生成关）autoSolve 3★ ---- */
  total++;
  const chapOut = {};
  let smB = true;
  for (const f of [10, 15, 25]) {
    startLevel(f);
    const qf = SN.quiz;
    const lvf = SN.currentLevel;
    let domOk = !!qf && (f < STATIC_LEVELS ? lvf.dch === diffOfCh(lvf.ch)
                                            : (lvf.dch >= 1 && lvf.dch <= 4));   /* m4 同 */
    const holes = qf.grid.filter(v => v === 0).length;               /* 空格区间按 dch 口径 */
    const HR = { 1: [6, 8], 2: [9, 11], 3: [12, 14], 4: [12, 14] }[lvf.dch];
    domOk = domOk && holes >= HR[0] && holes <= HR[1];
    if (f === 10) domOk = domOk && lvf.dch === 3 && !verNaked(qf.grid, false) &&
      verNaked(qf.grid, true);                                       /* ch3：宫必用（独立复算） */
    const af = await SN.autoSolve();
    const lv2 = SN.currentLevel;
    const solveOk = af.done && lv2.done && lv2.won && lv2.misses === 0 && engStars(cur) === 3;
    chapOut[f] = { ok: domOk && solveOk, dch: lvf.dch, holes: holes, taps: af.taps };
    if (!domOk || !solveOk) smB = false;
  }
  if (smB) npass++;
  smokes.chapters = { ok: smB, flats: chapOut };

  /* ---- ⑧ 布局：双 viewport ×（flat0/10/15）量测 ---- */
  function simView(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    const cells = Array.prototype.map.call(boardEl.querySelectorAll('.cell'), b => b.getBoundingClientRect());
    const nums = Array.prototype.map.call(numsEl.querySelectorAll('.num'), b => b.getBoundingClientRect());
    const cellOk = cells.length === 36 && cells.every(r => r.width >= 64 && r.height >= 64);   /* 盘格 ≥64（§0.9 触摸） */
    const numOk = nums.length === 6 && nums.every(r => r.width >= 96 && r.height >= 96);       /* 主答案数字卡 ≥96 */
    let btnOk = true;                              /* 全部按钮 ≥64（.k-parentbtn 家长按钮豁免） */
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, cellOk: cellOk, numOk: numOk,
      btnOk: btnOk, ox: ox, pass: cellOk && numOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 10, 15]) {
    sims.push(simView(1280, 800, f));
    sims.push(simView(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                   /* 还原真实 viewport 布局 */
  const layoutOk = sims.length === 6 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑨ 救援与 §0.7a：错点不重置；救援分级两件（§0.21+b18 梯度定案）；
     点格选中/填对/清除=主动学习动作重置 ---- */
  total++;
  const pLog9 = [];
  const op9 = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLog9.push(String(key)); };
  startLevel(0);
  const q9 = SN.quiz;
  const ei9 = q9.grid.indexOf(0);
  const wn9 = verBadNum(q9.grid, ei9);
  await SN.tapCell(ei9);                           /* 选中（重置钟——回拨须在其后） */
  lastAct = Date.now() - 13000;
  await SN.tapNum(wn9);                            /* miss=1 */
  const noReset = Date.now() - lastAct > 12800;    /* 错点不重置救援钟 */
  /* miss<2 态救援：hint 语音+唯一候选格 breathe、无数字卡 pulse（方向级） */
  rescueAct(cur.quizzes[cur.step]);
  const t9a = verTeach(SN.quiz.grid);
  const fired1 = SN.rescues === 1 && pLog9.indexOf('sn_hint') >= 0 &&
    !!boardEl.querySelector('.cell[data-i="' + t9a.i + '"].breathe') &&
    !numsEl.querySelector('.num.pulse');
  /* miss≥2 态救援：breathe+对应数字卡 pulse（答案级） */
  await SN.tapCell(ei9);
  await SN.tapNum(wn9);                            /* miss=2 */
  rescueAct(cur.quizzes[cur.step]);
  const t9b = verTeach(SN.quiz.grid);
  const fired2 = SN.rescues === 2 &&
    !!boardEl.querySelector('.cell[data-i="' + t9b.i + '"].breathe') &&
    !!numsEl.querySelector('.num[data-n="' + t9b.n + '"].pulse');
  /* 主动学习动作重置（§0.7a）：点格选中/填对/清除 */
  lastAct = Date.now() - 13000;
  await SN.tapCell(ei9);                           /* 选中 */
  const selReset = Date.now() - lastAct < 600;
  lastAct = Date.now() - 13000;
  await SN.tapNum(q9.sol[ei9]);                    /* 填对 */
  const fillReset = Date.now() - lastAct < 600;
  lastAct = Date.now() - 13000;
  await SN.tapCell(ei9);                           /* 清除 */
  const clearReset = Date.now() - lastAct < 600;
  KIDS.voice.play = op9;
  const rescueOk9 = noReset && fired1 && fired2 && selReset && fillReset && clearReset;
  if (rescueOk9) npass++;
  units.rescue = { ok: rescueOk9, expNoReset: noReset, fired1: fired1, fired2: fired2,
    selReset: selReset, fillReset: fillReset, clearReset: clearReset };

  const out = { game: 'sudokunum', total: total, pass: npass, layoutOk: layoutOk,
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
  KIDS.voice.say = function () {};
  runVerify();
}
