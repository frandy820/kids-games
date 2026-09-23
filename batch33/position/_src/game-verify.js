/* ================= ?verify=1 自检（仅 verify 分支加载执行；r44 谱=SPEC-R44-POSITION）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39，每关一票）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch 静态 1+flat//5+生成 1-4）/
     引擎直驱（逐题点应选格→right/末题 done→全关 3 星）
   ①b SPEC 表独立对账（SPEC_POS6/SPEC_NAME/SPEC_FLIP_MAP/SPEC_DUAL_COMBOS——verify 内从
     SPEC-R44 §R4 文字独立重列，不引用引擎 POS6/FLIP_MAP/DUAL_COMBOS）× 40 关全题：
     cells 恒 6 格固定序（r44 域分裂退役）/ 章构成律（dch1 恒 findpos / dch2 两族在场 /
     dch3 dual=3+findpos≥1 / dch4 flip=3+findpos≥1）/
     findpos ask=bunnyAt 且 answer=ask 格下标独立复算 /
     placepos ask≠bunnyAt（先验）且 answer=ask 格 /
     dual 三元组∈组合封闭表+bunnyAt=null+answer=树约束格 /
     flip face='back'+answer=SPEC_FLIP_MAP[ask] 格独立复算+bunnyAt≠映射格 /
     相邻题互异（kind+ask+ask2）/ flat0q0 锚
   ② 聚合独占票：生成关 dch1-4 全现 + dual 组合 4 值全域覆盖 ≥1 + flip ask 6 值全域
     覆盖 ≥1 + answer 位直方图 6 桶下界（均匀期望独立推导 ≥14——dual 组合 tree 无 up/back
     期望 ≈28/桶取半，r39-bis 教训①下界不抄观测）
   ③ tapCell 单元（flat0 findpos/front 6 格）：越界=null；错=wrong+miss+1+1000ms 防重入
     （首击 fire-and-forget+窗内二击 false）+错链两段 [ps_wrong, ps_hint]（全 clip 无 keyless）；
     对=right 推进+确认链三段 [ps_right, ps_n_front, ps_ya]（T46 化全 clip 链）；
     重听链=[ps_q1] 单 clip
   ④ placepos 单元（flat5 dch2 两族混出，遍历寻 placepos 题）：形状（ask≠bunnyAt/answer=ask 格）/
     点兔子当前位格=wrong（先验：点错格=wrong 含当前位）/二错 miss=2+正确格 breathe（答案级梯度）/
     放对=bunnyAt 更新为 ask+DOM 兔子移格（契约 M）+确认链名音=ask+placepos 重听=ps_place_* 全句 clip
   ④b dual 单元（flat10 dch3）：形状（三元组∈SPEC 组合表/bunnyAt=null/answer=树约束格）/
     DOM（无兔隐藏+#house g[data-scene="house"] 锚+房位=q.house+z=15）/半对干扰格（同房位
     另一组合的 tree 格）错选=wrong/二错 breathe/点对=兔 pop 出现+确认链名音=树约束+重听单 clip
   ④c flip 单元（flat16 dch4 首道 flip ask=front 非恒等——r44 修复轮 M1 自 flat15 换关）：
     形状（face='back'/answer=SPEC_FLIP_MAP[ask] 格独立复算/
     bunnyAt≠映射格+ask≠映射 非恒等断言）/DOM（背面兔 .bunny.back+格 data-face="back"+g[data-anim] 锚）/
     直觉同名格（ask 同名格≠answer）错选=wrong/点对=确认链两段 [ps_right, ps_fy_<ask>]
   ⑤ 方位全句表（契约 L）：PLACE_TTS/CONFIRM_TTS 六方位×2+DUAL_TTS 4+FLIP_TTS 6+
     FLIPY_TTS 6 全值覆盖禁 undefined（独立串对账+estMs 字符数 9/8/16/18/16）
   ⑥ 遮挡渲染断言：back 格 z 10 < 树 20 < front 格 30（getComputedStyle+DOM 顺序）
   ⑦ 帧内容断言（契约 M：渲染即引擎）：格 DOM 数==cells.len 且 data-pos 一致、
     DOM 兔子所在格 data-pos==quiz.bunnyAt（按题型分流：dual 零兔+房锚/flip 背面兔）、
     树 g[data-scene]/兔 g[data-anim] 在场——flat0（findpos 6 格）/flat10（dual 帧）/
     flat15（flip 帧）
   ⑧ 教学链三段：tutorialWatch() 真实走完（stub 存档）→ __psDemoR==='right' 且
     tut='help'（看→帮），再首题点对 → tut='solo'（帮→独），watch 折算真实时长 ≤16s
   ⑨ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 格层容器 bump（家族 D）
   ⑩ UI 冒烟：flat0 autoSolve（taps=5 恒 3★）/ flat5（dch2 两族）/ flat10（dch3）先 1 错
     再 autoSolve（2★）/ flat15（dch4 flip）autoSolve
   ⑪ 布局：双 viewport（1280×800/800×1180）×（flat0/flat10/flat15）：方位格 ≥96×96（恒 6 格）、
     树 svg 高 ≥150、描边对比度 ≥3:1、overflowX ≤0
   ⑫ clips：ps_ 36 条（T46 20+r44 新键 16 已注册 2026-09-22）+ core 3 条全注入
     + duration 辨别器（实长 ±60ms，SPEC_DUR 扩 16 新键实测值）
   ⑬ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑭ 契约 A/B/C/E/F/I/I补/J/K/N/O 源码断言（读自身合并 script 文本）+ miss≥2 答案级梯度
     在场 + 本批常量 seed 977 + 存档 v1.0（core VER='1.0'+kidsgame_ 键名+KIDS.init position）
     + r44 锚（FLIP_MAP 对合/DUAL_COMBOS 封闭表/flip 窗 7400 分支）
   ⑮ 章末预告 C7 独立硬编码对账（hint[i]↔CHAPTERS[i+1]）+ 生成关 nextHint 实算对账（新文案表）
   ⑯ estMs 语音窗动态断言：判对演出窗 5500 ≥ 2280+150+1416+150+1152+300=5448（ps_ya 实长）；
     flip 答对窗 9000 ≥ 2280+150+ps_fy est 6120+300=8850（est 口径）且 ≥ 实测链
     2280+150+4272+300=7002（注册后实测复核 2026-09-22：ps_fy 实测 4152-4272 全低于
     est——窗不调，est=保守上界+实测并列双断言）；错链豁免窗 4970 ≥ 1656+150+2856+300=4962；
     教学窗 3400/2700/2100/3020；estMs 字符数 9/16/18 独立复核
   ⑰ SPEED=0.12 提速断言
   结果写 #verify-result + window.__psVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-R44-POSITION §R4/§R7/§R8 文字独立重列（禁抄页面 POS6/POS_NAME/FLIP_MAP/
     DUAL_COMBOS/各 TTS 表/CHAPTERS/GEN_HINTS——期望值独立硬编码禁实现函数复算） */
  const SPEC_POS6 = ['front', 'back', 'left', 'right', 'up', 'down'];   // 方位封闭 6
  const SPEC_NAME = { front: '前面', back: '后面', left: '左边', right: '右边', up: '上面', down: '下面' };
  const SPEC_FLIP_MAP = { left: 'right', right: 'left', front: 'back', back: 'front', up: 'up', down: 'down' };   // 180° 对合映射
  const SPEC_DUAL_COMBOS = [                                          // dual 组合封闭表（恰 4）
    { key: 'lu', house: 'left-down',  tree: 'left',  houseDir: 'up' },
    { key: 'dr', house: 'left-down',  tree: 'down',  houseDir: 'right' },
    { key: 'ru', house: 'right-down', tree: 'right', houseDir: 'up' },
    { key: 'dl', house: 'right-down', tree: 'down',  houseDir: 'left' } ];
  const SPEC_PLACE = { front: '把兔子放到树的前面', back: '把兔子放到树的后面',   // 全句表（契约 L）
                       left: '把兔子放到树的左边', right: '把兔子放到树的右边',
                       up: '把兔子放到树的上面', down: '把兔子放到树的下面' };
  const SPEC_CONFIRM = { front: '兔子在树的前面呀', back: '兔子在树的后面呀',     // 确认句全句表
                         left: '兔子在树的左边呀', right: '兔子在树的右边呀',
                         up: '兔子在树的上面呀', down: '兔子在树的下面呀' };
  const SPEC_DUAL_TTS = { lu: '兔子藏在树的左边，也在房子的上面',                 // r44 dual 复合句 ×4（16 全字符）
                          dr: '兔子藏在树的下面，也在房子的右边',
                          ru: '兔子藏在树的右边，也在房子的上面',
                          dl: '兔子藏在树的下面，也在房子的左边' };
  const SPEC_FLIP_TTS = { front: '兔子转过身去啦，它的前面是树的哪边呀',          // r44 flip 问句 ×6（18）
                          back: '兔子转过身去啦，它的后面是树的哪边呀',
                          left: '兔子转过身去啦，它的左边是树的哪边呀',
                          right: '兔子转过身去啦，它的右边是树的哪边呀',
                          up: '兔子转过身去啦，它的上面是树的哪边呀',
                          down: '兔子转过身去啦，它的下面是树的哪边呀' };
  const SPEC_FLIPY_TTS = { front: '转身以后，它的前面就是树的后面呀',            // r44 flip 确认句 ×6（16）
                           back: '转身以后，它的后面就是树的前面呀',
                           left: '转身以后，它的左边就是树的右边呀',
                           right: '转身以后，它的右边就是树的左边呀',
                           up: '转身以后，它的上面就是树的上面呀',
                           down: '转身以后，它的下面就是树的下面呀' };
  const SPEC_DUR = { ps_tut_watch: 3024, ps_tut_turn: 1776, ps_hint: 2856, ps_right: 2280,
                     ps_wrong: 1656, ps_q1: 2328, ps_q2: 1896,
                     ps_n_front: 1392, ps_n_back: 1344, ps_n_left: 1344,
                     ps_n_right: 1368, ps_n_up: 1416, ps_n_down: 1416,   // batch33/_clipdur33.json
                     ps_place_front: 2688, ps_place_back: 2664, ps_place_left: 2688,
                     ps_place_right: 2712, ps_place_up: 2688, ps_place_down: 2688,
                     ps_ya: 1152,                                      // T46 新增（voice/clips Audio 实测 09-19）
                     ps_dual_lu: 4128, ps_dual_dr: 4176,                // r44 16 键注册后实测
                     ps_dual_ru: 4200, ps_dual_dl: 4200,                // （mutagen 2026-09-22，
                     ps_flip_front: 4512, ps_flip_back: 4488,           // F:/Cache/temp/r456_clip_ms.json；
                     ps_flip_left: 4488, ps_flip_right: 4536,           // dual 4128-4200 / flip
                     ps_flip_up: 4512, ps_flip_down: 4488,              // 4488-4536 / fy 4152-4272，
                     ps_fy_front: 4224, ps_fy_back: 4224,               // 全低于 est 口径——窗不调）
                     ps_fy_left: 4200, ps_fy_right: 4272,
                     ps_fy_up: 4152, ps_fy_down: 4152 };
  const SPEC_FY_EST = 6120;                     // ps_fy_* est 口径 estMs(16)（SPEC-R44 §R8，
                                                // 保守上界——实测 max 4272 < est，窗断言 est+实测并列）
  const SPEC_CHAPTER_HINTS = { 1: '要放兔子啦，你来试试', 2: '小房子也来啦，两个一起找',
                               3: '小兔子会转身哦，想想它的左右', 4: '新一轮方位小侦探' };
  const SPEC_GEN_HINTS = ['前后上下左右找到它', '你来放一放', '小房子也来啦', '小兔子转个身'];
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const unlocked = async () => {                  // 等错防重入/演出窗结束（verify 提速后 ≤1s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（key 空缺带 text）播完即
     return 丢弃后续段——T46 化后本款语音全 clip（零 keyless 政策），hasKeyless 用于链断言恒 false */
  const hasKeyless = parts => !!(parts && parts.length && parts.some(p => p && p.key === null));
  /* 遍历推进直到目标题型出现（r44：dch2 两族混出翻 1 保两族在场；dch3 dual=3/dch4 flip=3
     恒 ≥3/关——seekKind 逐题点 answer 推进，≤10 步内必达） */
  const seekKind = async kind => {
    for (let g = 0; g < 10; g++) {
      const q = window.PS.quiz;
      if (!q) return null;
      if (q.kind === kind) return q;
      if (!(await unlocked())) return null;
      const r = await window.PS.tapCell(q.answer);
      if (r === 'done' || r === false) return null;
    }
    return null;
  };

  /* ---- ①①b 40 关全量审计 + SPEC 表独立对账（r44 四型谱） ---- */
  const genDch = {}, kindBad = [];
  const dualComboN = {}, flipAskN = {}, ansBucket = { front: 0, back: 0, left: 0, right: 0, up: 0, down: 0 };
  let tableOk = true, badCase = null;
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
    /* 引擎直驱：逐题点应选格 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapCell(L3, q.answer);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
      if (q.kind === 'placepos' && q.bunnyAt !== q.ask) { driveOk = false; break; }   // placepos 放对 bunnyAt=ask
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;

    /* SPEC 表独立对账（每题：恒 6 格/四型形状独立复算/构成律/相邻互异/锚点） */
    let specOk = true;
    let nFP = 0, nDu = 0, nFl = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (flat === 0 && k === 0) {                                // 教学演示锚点：兔子在树前面
        if (q.kind !== 'findpos' || q.ask !== 'front') { badCase = 'anchor ' + flat; specOk = false; break; }
      }
      /* cells 恒 6 格固定序（r44：域分裂退役——ch1 起含左右） */
      if (q.cells.length !== 6 ||
          !q.cells.every((c, j) => c.pos === SPEC_POS6[j])) { badCase = 'dom6 ' + flat + '/' + k; specOk = false; break; }
      if (SPEC_POS6.indexOf(q.ask) < 0) { badCase = 'askPool ' + flat + '/' + k; specOk = false; break; }
      let target = null;                                          // 目标格独立取（按题型）
      if (q.kind === 'findpos') {
        nFP++;
        if (q.bunnyAt !== q.ask) { badCase = 'fpBunny ' + flat + '/' + k; specOk = false; break; }   // 兔子位=问句方位
        target = q.ask;
      } else if (q.kind === 'placepos') {
        if (q.bunnyAt === q.ask || SPEC_POS6.indexOf(q.bunnyAt) < 0) { badCase = 'ppBunny ' + flat + '/' + k; specOk = false; break; }   // 目标≠当前位
        target = q.ask;
      } else if (q.kind === 'dual') {
        nDu++;
        const c = SPEC_DUAL_COMBOS.find(x => x.house === q.house && x.tree === q.ask && x.houseDir === q.ask2);
        if (!c) { badCase = 'duCombo ' + flat + '/' + k; specOk = false; break; }   // 三元组∈组合封闭表
        if (q.bunnyAt !== null) { badCase = 'duHide ' + flat + '/' + k; specOk = false; break; }   // 兔子隐藏
        dualComboN[c.key] = (dualComboN[c.key] || 0) + 1;
        target = q.ask;                                           // answer=树约束格
      } else if (q.kind === 'flip') {
        nFl++;
        if (q.face !== 'back') { badCase = 'flFace ' + flat + '/' + k; specOk = false; break; }   // 背面态
        const m = SPEC_FLIP_MAP[q.ask];
        if (!m) { badCase = 'flMap ' + flat + '/' + k; specOk = false; break; }
        if (q.bunnyAt === m || SPEC_POS6.indexOf(q.bunnyAt) < 0) { badCase = 'flBunny ' + flat + '/' + k; specOk = false; break; }   // 兔≠映射格
        flipAskN[q.ask] = (flipAskN[q.ask] || 0) + 1;
        target = m;                                               // answer=映射格独立复算
      } else { badCase = 'kind ' + flat + '/' + k; specOk = false; break; }
      let expAns = -1;                                            // answer 独立复算
      for (let j = 0; j < q.cells.length; j++) if (q.cells[j].pos === target) expAns = j;
      if (expAns < 0 || q.answer !== expAns) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
      ansBucket[target]++;                                        // answer 位直方图（②下界断言）
      if (k > 0 && L1.quizzes[k - 1].kind === q.kind &&
          L1.quizzes[k - 1].ask === q.ask &&
          L1.quizzes[k - 1].ask2 === q.ask2) { badCase = 'adjacent ' + flat + '/' + k; specOk = false; break; }
    }
    /* 章构成律（SPEC-R44 §R2）：dch1 恒 findpos / dch2 两族在场 / dch3 dual=3+fp≥1 / dch4 flip=3+fp≥1 */
    if (specOk) {
      if (L1.dch === 1 && (nFP !== CH_LEN)) { kindBad.push(flat); specOk = false; }
      else if (L1.dch === 2 && (nFP === 0 || nFP === CH_LEN)) { kindBad.push(flat); specOk = false; }
      else if (L1.dch === 3 && (nDu !== 3 || nFP < 1)) { kindBad.push(flat); specOk = false; }
      else if (L1.dch === 4 && (nFl !== 3 || nFP < 1)) { kindBad.push(flat); specOk = false; }
    }
    if (!specOk) tableOk = false;
    if (flat >= 20) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk;
    if (ok) npass++;
    const KTAG = { findpos: 'f', placepos: 'p', dual: 'd', flip: 't' };
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  kinds: L1.quizzes.map(q => KTAG[q.kind] + ':' + q.ask + (q.kind === 'dual' ? '/' + q.ask2 : '')) };
    if (flat < 20) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 聚合独占票：生成关四型全现 + dual 组合/flip ask 全域覆盖 ≥1 + answer 位直方图下界
     （下界从均匀期望独立推导：200 题/6 桶，dual 组合 tree 无 up/back→up 桶先验期望 ≈28，
     取 14=期望半；确定性谱精确值另由 pycheck 对账——r39-bis 教训①禁抄观测） ---- */
  total++;
  const comboCover = SPEC_DUAL_COMBOS.every(c => (dualComboN[c.key] || 0) >= 1);
  const flipCover = SPEC_POS6.every(p => (flipAskN[p] || 0) >= 1);
  const ansOk = SPEC_POS6.every(p => ansBucket[p] >= 14);
  const aggOk = tableOk && kindBad.length === 0 && comboCover && flipCover && ansOk &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, kindBad: kindBad, genDch: genDch,
                  dualComboN: dualComboN, flipAskN: flipAskN, ansBucket: ansBucket };

  /* ---- ③ tapCell 单元（flat0 findpos/front 6 候选格——r44 起恒 6 格含左右）---- */
  total++;
  startLevel(0);
  const q3 = window.PS.quiz;
  const initOk = q3 && q3.kind === 'findpos' && q3.ask === 'front' &&
                 q3.cells.length === 6 &&
                 q3.cells.every(c => SPEC_POS6.indexOf(c.pos) >= 0) &&
                 q3.cells[q3.answer].pos === 'front' &&
                 q3.bunnyAt === 'front' &&
                 q3.step === 0 && q3.miss === 0;
  const badTap = (await window.PS.tapCell(99)) === null;           // 非法下标=null（不炸）
  const wA = q3.cells.findIndex((c, i) => i !== q3.answer);        // 错格（4 选 1 的任一非兔格）
  const pW = window.PS.tapCell(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await window.PS.tapCell(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue.length === 2 &&
                window.__lastQueue[0] === 'ps_wrong' &&            // 错链头=wrong clip（manifest 文案）
                window.__lastQueue[1] === 'ps_hint' &&             // 语义句 clip「再看看，兔子在哪边」
                !hasKeyless(window.__lastQueue);                   // 两段全 clip 无 keyless（契约 N 天然安全）
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             window.PS.quiz.miss === 1 && window.PS.currentLevel.miss === 1;
  const rR = await window.PS.tapCell(q3.answer);
  const chainR = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'ps_right' &&           // 确认链头=right clip
                 window.__lastQueue[1] === 'ps_n_front' &&         // 方位名音段
                 window.__lastQueue[2] === 'ps_ya' &&              // 「呀」clip 尾段（T46 化全 clip 链）
                 !hasKeyless(window.__lastQueue);
  replayQuiz(false);                                // 重听路径：问句单 clip
  const chainQ = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] === 'ps_q1';
  const s2 = rR === 'right' && chainR && chainQ && window.PS.quiz.step === 1 && window.PS.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1,
                chain: chainA, right: s2, chainR: chainR, chainReplay: chainQ };

  /* ---- ④ placepos 单元（flat5 dch2 两族混出，遍历寻 placepos 题——r44 章谱前移）---- */
  total++;
  startLevel(5);
  const qp = await seekKind('placepos');
  const ppShape = !!qp && qp.kind === 'placepos' &&
                  SPEC_POS6.indexOf(qp.ask) >= 0 &&
                  qp.cells.length === 6 &&
                  qp.bunnyAt !== qp.ask &&                          // 先验：目标≠兔子当前位
                  SPEC_POS6.indexOf(qp.bunnyAt) >= 0 &&
                  qp.cells[qp.answer].pos === qp.ask;
  /* 点兔子当前位格=wrong（SPEC §0.80：点错格=wrong 含当前位） */
  const bi = qp ? qp.cells.findIndex(c => c.pos === qp.bunnyAt) : -1;
  const rCur = qp && bi !== qp.answer ? await window.PS.tapCell(bi) : null;
  await new Promise(w => setTimeout(w, 5100));   // 等错链豁免窗（真时钟 4970）——窗内二错被吞（b31 家族口径），窗后二错照计 miss=2（梯度可达）
  /* 二错：miss=2+正确格 breathe（答案级梯度——placepos 同 findpos 恒用，SPEC §0.80 定版） */
  const wB = qp ? qp.cells.findIndex((c, i) => i !== qp.answer && i !== bi) : -1;
  const rB = qp ? await window.PS.tapCell(wB) : null;
  const brEl = qp ? cellEl(qp.answer) : null;
  const breathe2 = !!brEl && brEl.classList.contains('breathe');
  const miss2 = rB === 'wrong' && window.PS.quiz.miss === 2;
  /* 放对：bunnyAt 更新为 ask（契约 M 帧内容）+DOM 兔子移格+确认链名音=ask。
     DOM 断言在 1600ms 演出主窗内取样（fire-and-forget+600*SPEED 进窗——答对后 renderQuiz
     切新题重建格层，兔位=新题 bunnyAt（≠本题 ask），窗后取样=谱耦合 seed 巧合断言
     （r44 换谱即红——v1 旧谱巧合绿是假覆盖，r43 M4 同族教训：采样面勿耦合题序） */
  const askPos = qp && qp.ask;
  const pP = qp ? window.PS.tapCell(qp.answer) : null;             // fire-and-forget
  await new Promise(w => setTimeout(w, Math.round(600 * SPEED)));  // 进 1600ms 演出主窗
  const domBunny = cellsWrapEl.querySelector('.cell .bunny') ?
    cellsWrapEl.querySelector('.cell .bunny').closest('.cell') : null;
  const domOk = !!domBunny && domBunny.dataset.pos === askPos;     // 演出窗内兔在目标格
  const rP = pP ? await pP : null;
  await unlocked();
  const placedQ = cur.quizzes[cur.step - 1];                       // 刚答完的 placepos 题
  const bunnyAtUpd = !!placedQ && placedQ.bunnyAt === askPos;      // 引擎位更新
  const chainP = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'ps_right' &&
                 window.__lastQueue[1] === 'ps_n_' + askPos &&
                 window.__lastQueue[2] === 'ps_ya' &&
                 !hasKeyless(window.__lastQueue);
  /* placepos 重听=ps_place_* 全句 clip（T46 化）；末题（quiz=null）则重寻一道 */
  let qNext = window.PS.quiz;
  if (!qNext || qNext.kind !== 'placepos') {
    startLevel(5);
    qNext = await seekKind('placepos');
  }
  let ppReplayOk = false;
  if (qNext && qNext.kind === 'placepos') {
    replayQuiz(false);
    ppReplayOk = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] === 'ps_place_' + qNext.ask;
  }
  const ppOk = ppShape && rCur === 'wrong' && miss2 && breathe2 &&
               (rP === 'right' || rP === 'done') &&
               bunnyAtUpd && domOk && chainP && ppReplayOk;
  if (ppOk) npass++;
  units.placepos = { ok: ppOk, shape: ppShape, curWrong: rCur === 'wrong', miss2: miss2,
                     breathe2: breathe2, placed: rP === 'right', bunnyAtUpd: bunnyAtUpd,
                     domOk: domOk, chain: chainP, replay: ppReplayOk };

  /* ---- ④b dual 单元（flat10 dch3：双参照复合——兔子隐藏纯听觉推理）----
     形状：三元组∈SPEC 组合表/bunnyAt=null/answer=树约束格；
     DOM：零兔+#house g[data-scene="house"] 锚+房位=q.house+z=15（遮挡序不干扰格层）；
     半对干扰格=同房位另一组合的 tree 格（只解了房参照一半的孩子会点它）→wrong 实测；
     二错 breathe（答案级）；点对=藏兔 pop 出现（answer 格 .bunny 在场）+确认链名音=树约束；
     重听=ps_dual_<combokey> 单 clip（SPEC 表独立推导 key——combokey=tree+houseDir 缩写按
     SPEC_DUAL_COMBOS 的 key 字段，非实现函数复算） ---- */
  total++;
  startLevel(10);
  const qd = await seekKind('dual');
  const duSpec = qd ? SPEC_DUAL_COMBOS.find(x => x.house === qd.house && x.tree === qd.ask && x.houseDir === qd.ask2) : null;
  const duShape = !!qd && qd.kind === 'dual' && !!duSpec &&
                  qd.cells.length === 6 &&
                  qd.bunnyAt === null &&                             // 兔子隐藏（防读图绕过）
                  qd.cells[qd.answer].pos === qd.ask &&              // answer=树约束格
                  qd.ask2 === duSpec.houseDir && qd.house === duSpec.house;
  const noBunny = !cellsWrapEl.querySelector('.cell .bunny');       // 场上零兔
  const houseAnchor = houseEl.querySelector('g[data-scene="house"]');   // 房 SVG 锚（契约 M）
  const housePosOk = !!houseAnchor && houseEl.dataset.on === '1' &&
                     parseInt(getComputedStyle(houseEl).zIndex, 10) === 15;   // z=15（树 20 下）
  /* 半对干扰格：同房位另一组合的 tree 格（combo lu→另一组合 dr 的 tree=down 格） */
  const halfIdx = duSpec ? qd.cells.findIndex(c => c.pos === SPEC_DUAL_COMBOS.find(x => x.house === duSpec.house && x.key !== duSpec.key).tree) : -1;
  const rHalf = (duSpec && halfIdx >= 0 && halfIdx !== qd.answer) ? await window.PS.tapCell(halfIdx) : null;
  await new Promise(w => setTimeout(w, 5100));    // 等错链豁免窗（真时钟 4970）——窗内二错被吞
  const wD = duSpec ? qd.cells.findIndex((c, i) => i !== qd.answer && i !== halfIdx) : -1;   // 二错（普通干扰格）
  const rD2 = duSpec ? await window.PS.tapCell(wD) : null;
  const brD = duSpec ? cellEl(qd.answer).classList.contains('breathe') : false;   // miss=2 答案级 breathe
  const missD2 = rD2 === 'wrong' && window.PS.quiz.miss === 2;
  /* 点对：藏兔出现在答案格（pop 演出=「找到啦」）+确认链名音=树约束方位。
     DOM 断言在演出窗内取样（fire-and-forget+600ms 进窗——答对后 renderQuiz 切新题会重建
     格层，窗内取样=pop 兔在场唯一观测窗；r43 M4 教训：采样面勿耦合题序） */
  const pD = duSpec ? window.PS.tapCell(qd.answer) : null;          // fire-and-forget
  await new Promise(w => setTimeout(w, Math.round(600 * SPEED)));   // 进 1600ms 演出主窗
  const popCell = duSpec ? cellsWrapEl.querySelector('.cell[data-pos="' + qd.ask + '"] .bunny') : null;
  const popOk = !!popCell;                                          // 藏兔 pop 出现（契约 M：演出即验算）
  const rD = pD ? await pD : null;
  const chainD = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'ps_right' &&
                 window.__lastQueue[1] === 'ps_n_' + qd.ask &&      // 名音=树约束方位
                 window.__lastQueue[2] === 'ps_ya' &&
                 !hasKeyless(window.__lastQueue);
  /* dual 重听=ps_dual_<key> 单 clip（已注册 2026-09-22；queue stub 记录键名非播放，注册前后断言同构） */
  let qdNext = window.PS.quiz;
  if (!qdNext || qdNext.kind !== 'dual') {
    startLevel(10);
    qdNext = await seekKind('dual');
  }
  let duReplayOk = false;
  if (qdNext && qdNext.kind === 'dual') {
    const spec2 = SPEC_DUAL_COMBOS.find(x => x.house === qdNext.house && x.tree === qdNext.ask && x.houseDir === qdNext.ask2);
    replayQuiz(false);
    duReplayOk = !!spec2 && window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] === 'ps_dual_' + spec2.key;
  }
  const duOk = duShape && noBunny && housePosOk && rHalf === 'wrong' && missD2 && brD &&
               (rD === 'right' || rD === 'done') && popOk && chainD && duReplayOk;
  if (duOk) npass++;
  units.dual = { ok: duOk, shape: duShape, hidden: noBunny, house: housePosOk,
                 halfWrong: rHalf === 'wrong', miss2: missD2, breathe: brD,
                 pop: popOk, chain: chainD, replay: duReplayOk, combo: duSpec && duSpec.key };

  /* ---- ④c flip 单元（flat16 dch4：视角转换——兔子背面态绝对→相对方位映射）----
     形状：face='back'/answer=SPEC_FLIP_MAP[ask] 格独立复算/bunnyAt≠映射格（防点兔绕过）；
     采样=flat16 首道 flip ask=front（→back 非恒等）——r44 修复轮 M1：原 flat15 首道
     ask=down 恒等（FLIP_MAP(down)=down），直觉同名格=answer 退化分支实测不到专项面
     （r43 M4 同族）；flShape 加非恒等断言（谱/种子变更致恒等采样必红非静默退化）；
     DOM：背面兔 .bunny.back+格 data-face="back"+g[data-anim="bunny"] 根锚在场；
     直觉同名格（ask 同名格，非恒等映射时≠answer）错选=wrong 实测；
     点对=确认链两段 [ps_right, ps_fy_<ask>]（教育句承载映射律——键已注册 2026-09-22，
     stub 记录键名非播放注册前后同构）；flip 窗 1600+7400 源码断言在 ⑭ ---- */
  total++;
  startLevel(16);
  const qf = await seekKind('flip');
  const fSpec = qf ? SPEC_FLIP_MAP[qf.ask] : null;
  const flShape = !!qf && qf.kind === 'flip' && !!fSpec &&
                  qf.face === 'back' &&
                  qf.cells.length === 6 &&
                  qf.ask !== fSpec &&                                // 非恒等映射（直觉格专项有效性前提——r44 M1）
                  qf.cells[qf.answer].pos === fSpec &&              // answer=映射格独立复算
                  qf.bunnyAt !== fSpec &&                            // 兔≠映射格（防点兔读图）
                  SPEC_POS6.indexOf(qf.bunnyAt) >= 0;
  const backBunny = cellsWrapEl.querySelector('.cell[data-face="back"] .bunny.back');   // 背面兔朝向锚
  const animOk = !!backBunny && !!backBunny.querySelector('g[data-anim="bunny"]');      // 兔 SVG 根锚（契约 M）
  const bunnyCellPos = backBunny ? backBunny.closest('.cell').dataset.pos : null;
  const backAt = bunnyCellPos === qf.bunnyAt;                        // 背面兔所在格==bunnyAt
  /* 直觉同名格：ask 同名格（孩子不转身直觉点它）；恒等映射（up/down）时同名格=answer，
     改点任一其他格验 wrong 判定路径 */
  const intIdx = qf ? qf.cells.findIndex(c => c.pos === qf.ask) : -1;
  const wrongF = qf ? (intIdx !== qf.answer ? intIdx
                     : qf.cells.findIndex((c, i) => i !== qf.answer)) : -1;   // 恒等兜底（flShape 非恒等断言下恒不达——纯防御）
  const rInt = qf ? await window.PS.tapCell(wrongF) : null;          // 直觉格/普通干扰格=wrong
  await unlocked();                                                  // 等错点 1000ms 防重入窗解除
  const rF = qf ? await window.PS.tapCell(qf.answer) : null;         // 点对（I 补：豁免窗内对选放行）
  const chainF = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'ps_right' &&
                 window.__lastQueue[1] === 'ps_fy_' + qf.ask &&      // 教育句承载映射律
                 !hasKeyless(window.__lastQueue);
  const flOk = flShape && animOk && backAt && rInt === 'wrong' &&
               (rF === 'right' || rF === 'done') && chainF;
  if (flOk) npass++;
  units.flip = { ok: flOk, shape: flShape, backBunny: animOk, backAt: backAt,
                 intuitionWrong: rInt === 'wrong', chain: chainF, ask: qf && qf.ask,
                 map: fSpec };

  /* ---- ⑤ TTS 全句表（契约 L：PLACE/CONFIRM 六方位×2 + r44 DUAL 4/FLIP 6/FLIPY 6
     全值覆盖禁 undefined——五表独立串对账+estMs 字符数 9/8/16/18/16）---- */
  total++;
  let ttsOk = true;
  for (const p of SPEC_POS6) {
    if (PLACE_TTS[p] !== SPEC_PLACE[p]) ttsOk = false;             // 指令全句独立串对账
    if (CONFIRM_TTS[p] !== SPEC_CONFIRM[p]) ttsOk = false;         // 确认句全句独立串对账
    if (FLIP_TTS[p] !== SPEC_FLIP_TTS[p]) ttsOk = false;           // flip 问句独立串对账
    if (FLIPY_TTS[p] !== SPEC_FLIPY_TTS[p]) ttsOk = false;         // flip 确认句独立串对账
    if (typeof PLACE_TTS[p] !== 'string' || typeof CONFIRM_TTS[p] !== 'string' ||
        typeof FLIP_TTS[p] !== 'string' || typeof FLIPY_TTS[p] !== 'string') ttsOk = false;
  }
  for (const c of SPEC_DUAL_COMBOS) {
    if (DUAL_TTS[c.key] !== SPEC_DUAL_TTS[c.key]) ttsOk = false;   // dual 复合句独立串对账
    if (typeof DUAL_TTS[c.key] !== 'string') ttsOk = false;
  }
  const estOk = estMs(SPEC_PLACE.front.length) === 3705 &&          // 9 字口径（家族 T）
                SPEC_PLACE.front.length === 9 &&
                SPEC_DUAL_TTS.lu.length === 16 && estMs(16) === 6120 &&   // r44 新表字符数（SPEC-R44 §R8）
                SPEC_FLIP_TTS.left.length === 18 && estMs(18) === 6810 &&
                SPEC_FLIPY_TTS.left.length === 16;
  const ttsAll = ttsOk && estOk && Object.keys(PLACE_TTS).length === 6 &&
                 Object.keys(CONFIRM_TTS).length === 6 &&
                 Object.keys(DUAL_TTS).length === 4 &&
                 Object.keys(FLIP_TTS).length === 6 &&
                 Object.keys(FLIPY_TTS).length === 6;
  if (ttsAll) npass++;
  units.tts = { ok: ttsAll, table: ttsOk, est: estOk };

  /* ---- ⑥ 遮挡渲染断言：back 格 z < 树 z < front 格 z（DOM 顺序+computed z-index）+
     兔子定格实测（renderCells 纯渲染直调——构造 back/front 定格：back 格兔在场被树盖/
     front 格兔在场盖树干下段） ---- */
  total++;
  renderCells({ kind: 'findpos', ask: 'back', cells: cellsOf(3).map(p => ({ pos: p })),
                bunnyAt: 'back', answer: 1 });                        // 兔子定格在后面格
  const backCell = cellsWrapEl.querySelector('.cell[data-pos="back"]');
  const frontCell = cellsWrapEl.querySelector('.cell[data-pos="front"]');
  const zOf = el => parseInt(getComputedStyle(el).zIndex, 10) || 0;
  /* 栈上下文回归锁：#cells 必须 z-index:auto（≠auto 自建栈上下文→整格层被树 20 盖，
     前格兔盖树干语义失效——曾发的跨上下文 z 比较假通过即此病） */
  const zWrapAuto = getComputedStyle(cellsWrapEl).zIndex === 'auto';
  /* 树 svg viewBox 回归锁（SPEC 独立串）：缺 viewBox 时 TREE_INNER 按 1:1 像素渲染，
     树不随场景缩放→树干偏离中轴、前后遮挡错位（像素实测曾检出） */
  const vbOk = treeSvgEl.getAttribute('viewBox') === '0 0 330 490' &&
               treeSvgEl.getAttribute('preserveAspectRatio') === 'none';
  const zBack = backCell ? zOf(backCell) : -1;
  const zTree = zOf(treeSvgEl);
  const zFront = frontCell ? zOf(frontCell) : -1;
  const zOk = zWrapAuto && vbOk && !!backCell && !!frontCell && zBack < zTree && zTree < zFront;   // 同栈上下文 10<20<30（遮挡主通道=computed z-index）
  /* DOM 层级结构：格层与树层分离（#cells 容器承载全部格、树 svg 为场景直接子）——
     遮挡由 z-index 承载（DOM 内格子恒后于树=被树层包裹，z 10/20/30 分层为其语义依据） */
  const kids = Array.from(sceneEl.children);
  const orderTree = kids.indexOf(treeSvgEl);
  const orderCells = kids.indexOf(cellsWrapEl);
  const orderOk = orderTree === 0 && orderCells === 1 &&              // [tree-svg, cells] 两层结构
                  backCell && cellsWrapEl.contains(backCell) &&
                  frontCell && cellsWrapEl.contains(frontCell);       // 格恒在格层容器内
  const backHasBunny = !!(backCell && backCell.querySelector('.bunny'));       // 后格兔在场（被树盖=树 z 更高；远景 0.58x 由 head .pos-back .bunny{width:58%} 承载——build 静态断言）
  renderCells({ kind: 'findpos', ask: 'front', cells: cellsOf(3).map(p => ({ pos: p })),
                bunnyAt: 'front', answer: 0 });                       // 兔子定格在前面格
  const frontCell2 = cellsWrapEl.querySelector('.cell[data-pos="front"]');
  const frontHasBunny = !!(frontCell2 && frontCell2.querySelector('.bunny'));   // 前格兔在场（盖树干下段=格 z 30 > 树 20；近景 0.90x 由 head .pos-front .bunny{width:90%} 承载）
  const occlOk = zOk && orderOk && backHasBunny && frontHasBunny;
  if (occlOk) npass++;
  units.occlusion = { ok: occlOk, z: zOk, zWrapAuto: zWrapAuto, vbOk: vbOk, order: orderOk, backBunny: backHasBunny,
                     frontBunny: frontHasBunny, zVal: [zBack, zTree, zFront] };

  /* ---- ⑦ 帧内容断言（契约 M：渲染即引擎——r44 三档：flat0 findpos 6 格正面兔 /
     flat10 dual 帧零兔+房锚 / flat15 flip 帧背面兔+朝向锚）---- */
  total++;
  const frameBase = q => {
    const cells = Array.from(cellsWrapEl.querySelectorAll('.cell'));
    const domOkF = cells.length === q.cells.length && cells.length === 6 &&
      cells.every((c, i) => c.dataset.pos === q.cells[i].pos);
    const tree = treeSvgEl.querySelector('g[data-scene="tree"]');
    return domOkF && !!tree;
  };
  startLevel(0);                                        // dch1 findpos 6 格（含左右）
  const qA = window.PS.quiz;
  const bnA = cellsWrapEl.querySelector('.cell .bunny');
  const fA = frameBase(qA) && !!bnA &&
             bnA.closest('.cell').dataset.pos === qA.bunnyAt &&    // 兔子所在格==bunnyAt
             !!bnA.querySelector('g[data-anim="bunny"]') &&
             !cellsWrapEl.querySelector('.bunny.back') &&
             houseEl.dataset.on === '0';                            // 非 dual 无房
  startLevel(10);                                       // dch3 → 推进到 dual 帧
  const qB = await seekKind('dual');
  const fB = frameBase(qB) &&
             !cellsWrapEl.querySelector('.cell .bunny') &&          // dual 零兔（隐藏）
             !!houseEl.querySelector('g[data-scene="house"]') &&    // 房 SVG 锚在场
             houseEl.dataset.on === '1';
  startLevel(15);                                       // dch4 → 推进到 flip 帧
  const qC = await seekKind('flip');
  const bnC = cellsWrapEl.querySelector('.cell[data-face="back"] .bunny.back');
  const fC = frameBase(qC) && !!bnC &&
             bnC.closest('.cell').dataset.pos === qC.bunnyAt &&    // 背面兔所在格==bunnyAt
             !!bnC.querySelector('g[data-anim="bunny"]') &&         // 兔 SVG 根锚（契约 M 不断朝向）
             houseEl.dataset.on === '0';                            // 非 dual 无房
  const frameOk = fA && fB && fC;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, findpos: fA, dual: fB, flip: fC };

  /* ---- ⑧ 教学链三段（看→帮→独）：tutorialWatch 真实走完 → __psDemoR='right'（演示点
     前面格=兔子位）→ tut='help'（帮）；再首题点对 → tut='solo'（独） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutHelp = window.__psDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'placepos' &&   // turn 首题=定制 placepos/front
                cur.quizzes[0].ask === 'front' &&                          // （SPEC §2 修复后口径 2026-09-11：
                cur.quizzes[0].bunnyAt === 'back' && tw <= 16000;          //  两族各教一次，兔子在后面点前面格）
  await unlocked();
  const qT = window.PS.quiz;                                // "帮"阶段放手题（重发同关题 0）
  const rT = await window.PS.tapCell(qT.answer);             // 首次选对 → tut='solo'（独）
  const tutSolo = rT === 'right' && state.tut === 'solo';
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__psDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑨ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 格层容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await window.PS.tapCell(0)) === false && sceneEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await window.PS.tapCell(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && window.PS.quiz.step === 0 && window.PS.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑩ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await window.PS.autoSolve();
  const lv0 = window.PS.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 B：flat5（dch2 4 域纯看图）autoSolve 通关 ---- */
  total++;
  startLevel(5);
  const a5 = await window.PS.autoSolve();
  const smokeB = a5.done && a5.taps === 5 && window.PS.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat5 = { ok: smokeB, taps: a5.taps };

  /* ---- ⑩ UI 冒烟 C：flat10（dch3 dual 主载）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const q10 = window.PS.quiz;
  const wrongC = q10.cells.findIndex((c, i) => i !== q10.answer);
  const r10 = await window.PS.tapCell(wrongC);
  const a10 = await window.PS.autoSolve();
  const lv10 = window.PS.currentLevel;
  const smokeC = r10 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat10 = { ok: smokeC, r10: r10, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 D：flat15（dch4 flip 主载+两族混出）autoSolve 通关 ---- */
  total++;
  startLevel(15);
  const a15 = await window.PS.autoSolve();
  const lv15 = window.PS.currentLevel;
  const kinds15 = {};
  for (const q of cur.quizzes) kinds15[q.kind] = (kinds15[q.kind] || 0) + 1;   // flip 在场复证
  const smokeD = a15.done && a15.taps === 5 && lv15.done && lv15.dch === 4 &&
                 !!kinds15.findpos && !!kinds15.flip && (kinds15.dual || 0) === 0;
  if (smokeD) npass++;
  smokes.flat15 = { ok: smokeD, taps: a15.taps, kinds: kinds15 };

  /* ---- ⑪ 布局：双 viewport ×（flat0 4 格 / flat10 6 格） ---- */
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
    const need = window.PS.quiz ? window.PS.quiz.cells.length : 6;   // r44 恒 6 格（v1 域注释销账——题面恒六方位格）
    const cells = Array.prototype.map.call(cellsWrapEl.querySelectorAll('.cell'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const treeR = treeSvgEl.getBoundingClientRect();
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cells.length === need && cells.every(b => b.w >= 96 && b.h >= 96);   // 方位格=主答案按钮
    const treeOk = treeR.height >= 150 && sc.w >= 64 && sc.h >= 64;
    const cScene = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const cText = ratioOf(cssToHex(getComputedStyle(qbarEl.querySelector('.q-text')).borderLeftColor), '#FFF9EE') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cells: cells.length, treeH: Math.round(treeR.height),
             hitOk: hitOk, treeOk: treeOk, contrast: cScene && cText, ox: ox,
             pass: hitOk && treeOk && cScene && cText && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 10, 15]) {
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

  /* ---- ⑫ clips：ps_ 36 条（T46 20+r44 16 已注册）+ core 3 条全注入 + duration 辨别器（实长 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const psKeys = ['ps_tut_watch', 'ps_tut_turn', 'ps_hint', 'ps_right', 'ps_wrong',
                  'ps_q1', 'ps_q2'].concat(SPEC_POS6.map(p => 'ps_n_' + p))
                 .concat(SPEC_POS6.map(p => 'ps_place_' + p)).concat(['ps_ya'])
                 .concat(SPEC_DUAL_COMBOS.map(c => 'ps_dual_' + c.key))     // r44 段二：16 新键
                 .concat(SPEC_POS6.map(p => 'ps_flip_' + p))                // （键名从 verify 独立
                 .concat(SPEC_POS6.map(p => 'ps_fy_' + p));                 // SPEC 表推导）
  const needAll = psKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 39 &&
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

  /* ---- ⑬ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑭ 契约 A/B/C/E/F/I/I补/J/K/N/O 源码断言（读自身合并 script 文本——第 3 个 script 块）
     + miss≥2 答案级梯度 + 本批常量 seed 977 + 存档 v1.0（家族 C） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'position'") >= 0;           // C：本款存档键 kidsgame_position
  const srcE = src.indexOf('sv.position && sv.position.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 4970') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcI2 = src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0;   // I 补：豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcN = src.indexOf('window.PS =') >= 0 && src.indexOf('__psDemoR') >= 0;   // N 配套：钩子真实页暴露+教学实证
  const srcSeed = src.indexOf('flat * 7919 + 977') >= 0;                  // 本批常量 seed 977（SPEC §0.80）
  const srcG2 = src.indexOf('q._miss >= 2') >= 0;         // miss≥2=正确格 breathe（答案级梯度在场）
  /* r44 锚（SPEC-R44 §R3/§R8）：FLIP_MAP 对合映射/DUAL_COMBOS 封闭表/flip 答对窗 7400 分支
     （检索串拼接式防 verify 源码自匹配——SPEC_FLIP_MAP/SPEC_DUAL_COMBOS 前缀不同名，双保险） */
  const srcR44 = src.indexOf('const ' + 'FLIP_MAP = {') >= 0 &&
                 src.indexOf('const ' + 'DUAL_COMBOS = [') >= 0 &&
                 src.indexOf("q.kind === 'flip' ? 7400 : 3900") >= 0;
  const cellBtn = cellsWrapEl.querySelector('.cell');                     // O：自建 button 显式 color
  const srcO = !!cellBtn && cellBtn.tagName === 'BUTTON' &&
               getComputedStyle(cellBtn).color === 'rgb(74, 59, 46)';
  const srcOk = srcA && srcB && srcC && srcE && srcF && srcI && srcI2 && srcJ && srcK &&
                srcN && srcSeed && srcG2 && srcR44 && srcO;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, C: srcC, E: srcE, F: srcF,
                     I: srcI, I2: srcI2, J: srcJ, K: srcK, N: srcN, O: srcO,
                     seed: srcSeed, grad: srcG2, r44: srcR44 };

  /* ---- ⑮ 章末预告 C7 独立硬编码对账 + 生成关 nextHint 实算对账 ---- */
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

  /* ---- ⑯ estMs 语音窗动态断言（b25 定版：窗 ≥ estMs/链实长；clip 实长 _clipdur33.json+T46 实测+
     r44 16 键注册后实测 F:/Cache/temp/r456_clip_ms.json；flip 答对窗=1600+7400 ≥ est 链
     2280+150+6120+300=8850 且 ≥ 实测链 2280+150+4272+300=7002——注册后实测复核 2026-09-22：
     ps_fy 实测 4152-4272 全低于 est，窗不调，est=保守上界+实测并列双断言）
     确认链=ps_right 2280+150+名音 max 1416+150+ps_ya 1152=5148 → 演出窗 5500（1600+3900）≥ +300=5448；
     错链=1656+150+2856=4662 → 豁免窗 4970 ≥ +300=4962（SPEC §4 算式下界；任务书 4960 舍入口径） ---- */
  total++;
  const maxName = SPEC_DUR.ps_n_up;                    // 名音全集 max 1416（up/down，_clipdur33）
  const maxPlace = Math.max.apply(null, SPEC_POS6.map(p => SPEC_DUR['ps_place_' + p]));  // 全句 clip max 2712
  const maxFy = Math.max.apply(null, SPEC_POS6.map(p => SPEC_DUR['ps_fy_' + p]));  // ps_fy 实测 max 4272
  const winOk = (1600 + 3900) >= SPEC_DUR.ps_right + 150 + maxName + 150 + SPEC_DUR.ps_ya + 300 &&   // 判对窗 5500 ≥ 5448
                (1600 + 7400) >= SPEC_DUR.ps_right + 150 + SPEC_FY_EST + 300 &&                 // r44 flip 窗 9000 ≥ est 链 8850
                (1600 + 7400) >= SPEC_DUR.ps_right + 150 + maxFy + 300 &&                       // 同窗 ≥ 实测链 7002（并列）
                4970 >= SPEC_DUR.ps_wrong + 150 + SPEC_DUR.ps_hint + 300 &&                     // 错链豁免 ≥ 4962
                3400 >= SPEC_DUR.ps_tut_watch + 300 &&                                          // 教学名音演示延 ≥ 3324
                2700 >= SPEC_DUR.ps_q1 + 300 &&                                                 // 教学问句窗 ≥ 2628
                2100 >= SPEC_DUR.ps_tut_turn + 300 &&                                           // turn 后读题延 ≥ 2076
                (2620 + 400) >= SPEC_DUR.ps_right + 300 &&                                      // winFlow ≥ 2580
                estMs(SPEC_PLACE.front.length) === 3705 &&                                      // 视觉文案 9 字口径
                SPEC_FY_EST === estMs(SPEC_FLIPY_TTS.left.length);                              // ps_fy est=estMs(16)
  /* T46 化 placepos 开题 clip 实长窗：救援重读节拍（14s 方向级）与开题读题不设短窗，
     clip 实长只须 ≤ 原 TTS estMs(9)=3705 预算（更短=更安全）——独立断言 */
  const clipOk = maxPlace <= 3705 && SPEC_DUR.ps_ya === 1152;
  const estData = { confirmWin: 5500, confirmNeed: SPEC_DUR.ps_right + 150 + maxName + 150 + SPEC_DUR.ps_ya + 300,
                    flipWin: 9000, flipNeed: SPEC_DUR.ps_right + 150 + SPEC_FY_EST + 300,
                    flipNeedMeas: SPEC_DUR.ps_right + 150 + maxFy + 300, maxFyMeas: maxFy,
                    wrongChain: 4970, chainNeed: SPEC_DUR.ps_wrong + 150 + SPEC_DUR.ps_hint + 300,
                    watchT: 3400, quizWin: 2700, turnDelay: 2100, rightFlow: 3020,
                    ttsCmd: estMs(9), maxPlaceClip: maxPlace };
  if (winOk && clipOk) npass++;
  units.estWin = { ok: winOk && clipOk, est: estData };

  /* ---- ⑰ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'position', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__psVlog = out;                          // 外部断言挂点（任务书钩子）
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
