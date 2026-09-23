/* ================= ?verify=1 自检（仅 verify 分支加载执行）——13 单元（r46）
   ① 结构：双 viewport simView（1280×800/800×1180）×（flat0/10/15——含 dual 全作答形态
     采样 r43 M4）：答案按钮 ≥96×96、描边对比度 ≥3:1、overflowX ≤0；圆点等大半径断言
     （rOf 参数化：n≤12→8 / n≥13→7.5）；clips qc_ 29+core 3 全注入+duration 辨别器
     （实长 ±60ms；r46 段二注册 11 新键后 32 条——mutagen 实测 09-22，SPEC §R7）
   ② 教学三段（看→帮→独）：tutorialWatch() 真实走完（stub 存档）→ __qcDemoR==='right'
     且 tut='help'（turn 2 vs 4 迷你关）；turn 题点对 → __qcTutSolo 且进正式关
     （flat=0 n=5），watch 折算真实时长 ≤18s（单步演示款口径）
   ③ 逐关驱动 flat0-19：确定性（同 flat 两次 JSON 一致）/ 章映射（ch=flat/5+1、
     dch 静态 1+flat//5）/ SPEC-R46 域独立复算对账（ch1 subitizing/ch2 比例带+等数/
     ch3 窄带/ch4 dual 档域+两段驱动 half→档→right/done→全关 3★）
   ④ 契约 M 帧断言（渲染即引擎，×flat0/10/15/20——闪现后残留计数锚）：DOM circle
     计数===nL/nR、消隐 veil 态在场（闪毕）、按钮 DOM 数==options、等大半径（rOf 参数化）、
     __qcFlashN 闪现演出锚 ≥1
   ⑤ 错路径：闪现窗吞 null+错侧 wrong+miss+1+错链两段 [qc_wrong,qc_hint]+豁免窗（真时钟
     4938）内二错吞 false+窗内对选放行 'right'+窗后二错照计 miss=2+多的一侧 breathe
     +dual 两段错路径（C 段 flat15：phase0 错→half→phase1 错档→正确档 breathe→对档 right）
   ⑥ 先验专项 20 关全量（verify 独立推导禁读页面期望）：SPEC-R46 域表+等数题 same===true
     对账（域 10-20）+ch2 等数题聚合在场（25 题 ≥1）+比例带全域复算（ch2 [0.85,0.92)/
     ch3 [0.85,0.90) 差≥2）+渲染层首题 DOM（dot 计数/等大半径 rOf）
   ⑦ 星级口径：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ 生成关 flat20-39：dch 独立复算（verify 自带 mulberry32 副本实算 ri(1,4)）+
     确定性+SPEC-R46 域对账+四型全现
   ⑨ 源码级：错链豁免窗字面 4938+契约族 A/B/C/E/F/I/J/K/O+CHAPTERS/GEN_HINTS 双录
     （r46 新文案 CHAPTERS[3].hint/GEN_HINTS[3]）+nextHint 4/9/14/19 数值断言+24/29/34/39
     实算+NUMCN 表 20 值双录（契约 L 1-20）+r46 字面族（GAP_ASK_WIN/DUAL_ISI/动态尾 7400/
     half 刷 lastAct r25 M2/__qcDualPhase/flashMs 1400/rOf 7.5）
   ⑩ 确认链构成（T46 化）：__lastQueue===[qc_right, qc_s_left, qc_n_X, qc_s_right,
     qc_n_Y] 5 段全 string clip（零 keyless）——段键与 quiz nL/nR 独立推导对账+
     最坏链 clip 实长 8796 ≤ 演出窗 8800（n≤10 档）+11-20 实测链 9132 ≤ 9400
     （r46 段二实测 09-22：max 1632/键——SPEC-R46 §R8 实测复核行）
   ⑪ 写档：origLS 保护——还原真函数→init quickcmp→autoSolve 通关→localStorage
     kidsgame_quickcmp v:'1.0' levels['1-0'] 更新；测后恢复原 localStorage
   ⑫ 真实路径：fresh 预置存档（v1.0+tutSeen）→ QC.start(0) 非教学直达题面+window.QC 暴露
   ⑬ dual 专项（r46 主新增）：静态 flat15-19 差值档直方图 {2,4,6} 各 ≥1+镜像侧 L/R 各 ≥1
     （分布断言独立推导）+双闪序列中间态捕获（__qcDualPhase 'A'/'B' fire-and-forget 密集
     轮询——SPEED=0.12 下 468ms 瞬态，b18 先例）+UI 真链两段（half→phase=1→档按钮排
     2/4/6→多侧 lit→对档 right+确认链含 qc_n_1x 段）+引擎非法 s 相位不符 null
   结果写 #verify-result + window.__qcVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  window.__qcOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-R46 文字独立重列（禁抄页面 NUMCN/VOICE/CHAPTERS/常量） */
  const SPEC_NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五',
                       6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
                       11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
                       16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十' };   // 契约 L 全量 20 值（r46 扩 11-20）
  const SPEC_DUR = { qc_tut_watch: 3072, qc_tut_turn: 1848, qc_ask: 2088,
                     qc_hint: 2496, qc_right: 2256, qc_wrong: 1992,
                     qc_s_left: 1344, qc_s_right: 1368,     /* T46 段键（voice/clips 实测 09-19） */
                     qc_ask_gap: 1656,
                     qc_n_1: 1344, qc_n_2: 1368, qc_n_3: 1392, qc_n_4: 1416, qc_n_5: 1320,
                     qc_n_6: 1368, qc_n_7: 1368, qc_n_8: 1320, qc_n_9: 1344, qc_n_10: 1464,   /* T46 数词段 1-10（实长 09-19——r46 修复轮 m5 并入辨别器升 29 键） */
                     qc_n_11: 1560, qc_n_12: 1536, qc_n_13: 1632,
                     qc_n_14: 1632, qc_n_15: 1584, qc_n_16: 1632, qc_n_17: 1632,
                     qc_n_18: 1584, qc_n_19: 1584, qc_n_20: 1536 };   /* r46 段二 11 键实测
                     （mutagen 09-22——estMs 保守上界 1650 口径退役，SPEC §R8 实测复核） */
  const SPEC_QC_N = { 1: 1344, 2: 1368, 3: 1392, 4: 1416, 5: 1320,   /* T46 数词段实长 1-10 */
                      6: 1368, 7: 1368, 8: 1320, 9: 1344, 10: 1464,
                      11: 1560, 12: 1536, 13: 1632, 14: 1632, 15: 1584,   /* r46 段二实长 11-20 */
                      16: 1632, 17: 1632, 18: 1584, 19: 1584, 20: 1536 };
  const SPEC_CHAPTER_HINTS = { 1: '有时候两边一样多哦', 2: '圆点变多啦，要看得快',
                               3: '圆点要闪两次啦，记住再比一比', 4: '新一轮快速比大小' };
  const SPEC_GEN_HINTS = ['小圆点，比一比', '留心一样多', '圆点变多了', '圆点闪两次'];
  /* T46 clip 链实长独立复算（estMs TTS 估长口径退役 09-19）：5 段链=
     right+4×gap+s_left+n[nL]+s_right+n[nR]+pad */
  const CHAIN_GAP = 150, WIN_PAD = 300;           /* core queue 段间 150ms / 窗余量 300（家族 G/H） */
  const chainMs = (nL, nR) => SPEC_DUR.qc_right + 4 * CHAIN_GAP +
    SPEC_DUR.qc_s_left + SPEC_QC_N[nL] + SPEC_DUR.qc_s_right + SPEC_QC_N[nR] + WIN_PAD;   // 定义域 1-20（r46 段二实测表）
  /* 独立 mulberry32 副本（禁调引擎同名函数——dch 复算独立性） */
  const specMul = a => function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const specRi = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  /* SPEC-R46 §R2/§R3 域表独立推导：dch1 subitizing 1-5 差≥1 禁相等/dch2 非等 10-20 差≥2
     0.85≤r<0.92+等数 10-20 混出/dch3 恒非等 0.85≤r<0.90/dch4 dual base∈[10,20-d] d∈{2,4,6} */
  const specDomainOk = (dch, q) => {
    const same = q.nL === q.nR;
    const sub = !same && q.nL >= 1 && q.nL <= 5 && q.nR >= 1 && q.nR <= 5 && Math.abs(q.nL - q.nR) >= 1;
    const ratio = Math.min(q.nL, q.nR) / Math.max(q.nL, q.nR);
    const band = hi => !same && q.nL >= 10 && q.nL <= 20 && q.nR >= 10 && q.nR <= 20 &&
                       Math.abs(q.nL - q.nR) >= 2 && ratio >= 0.85 && ratio < hi;
    const kind = q.kind || 'cmp';
    if (dch === 1) return kind === 'cmp' && sub && q.optsN === 2;    // 两按钮禁一样多
    if (dch === 2) return kind === 'cmp' &&
      (band(0.92) || (same && q.nL >= 10 && q.nL <= 20)) && q.optsN === 3;
    if (dch === 3) return kind === 'cmp' && band(0.90) && q.optsN === 3;   // 一样多=恒错干扰
    return kind === 'dual' && !same && q.nL >= 10 && q.nL <= 20 && q.nR >= 10 && q.nR <= 20 &&
           q.d === Math.abs(q.nL - q.nR) && (q.d === 2 || q.d === 4 || q.d === 6) && q.optsN === 3;
  };
  const specFlashOk = (dch, flash) => flash === (dch === 2 || dch === 4 ? 1400 : 1200);   // SPEC-R46 §R8
  const specSide = (nL, nR) => nL === nR ? 'S' : (nL > nR ? 'L' : 'R');   // 独立正确侧
  const specR = q => (Math.max(q.nL, q.nR) <= 12 ? '8' : '7.5');          // 独立 rOf 期望（渲染铁律）
  const unlocked = async () => {                  // 等闪现/演出/错反馈窗结束（verify 提速后）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：key 空缺带 text 的 TTS 段播完即
     return 丢弃后续段——T46 化零 keyless 政策后本款链恒全 string，出现 keyless
     段即违背政策（⑩ 段键全 string 断言+本谓词恒 false 复核） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);
  const panelDots = el => el.querySelectorAll('.dot');
  const dotRadii = () => {
    const rs = [];
    document.querySelectorAll('#panelL .dot, #panelR .dot').forEach(c => rs.push(c.getAttribute('r')));
    return rs;
  };

  /* ---- ③ 逐关驱动 flat0-19：确定性+章映射+SPEC 域独立复算+引擎直驱（两段） ---- */
  total++;
  {
    let ok3 = true, bad3 = null, eq2 = 0, ch2n = 0;
    for (let flat = 0; flat < 20; flat++) {
      const L1 = genLevel(flat), L2 = genLevel(flat);
      if (JSON.stringify(L1.quizzes) !== JSON.stringify(L2.quizzes)) { ok3 = false; bad3 = 'det ' + flat; break; }
      const expCh = Math.floor(flat / 5) + 1;
      if (L1.ch !== expCh || L1.dch !== expCh) { ok3 = false; bad3 = 'ch ' + flat; break; }
      let domOk = true;
      for (let k = 0; k < L1.quizzes.length; k++) {
        const q = L1.quizzes[k];
        if (!specDomainOk(L1.dch, q) || !specFlashOk(L1.dch, q.flash) ||
            (L1.dch === 1 && q.nL === q.nR)) { domOk = false; bad3 = 'dom ' + flat + '/' + k; break; }
        if (L1.dch === 2) { ch2n++; if (q.nL === q.nR) eq2++; }   // 等数题对账聚合
      }
      if (!domOk) { ok3 = false; break; }
      /* 引擎直驱：cmp 逐题点正确侧 → right/done；dual 两段（half→档）→ right/done；全关零错=3 星 */
      const L3 = genLevel(flat);
      let driveOk = true;
      for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
        const q = L3.quizzes[k];
        const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
        if (q.kind === 'dual') {
          const r1 = engTapSide(L3, specSide(q.nL, q.nR));          // 第一问（独立正确侧）
          const r2 = engTapSide(L3, String(Math.abs(q.nL - q.nR))); // 第二问（独立差值档）
          if (r1 !== 'half' || r2 !== exp || q._miss !== 0 || L3.step !== k + 1) { driveOk = false; break; }
        } else {
          const r = engTapSide(L3, specSide(q.nL, q.nR));            // 独立正确侧（禁读 correctSide）
          if (r !== exp || q._miss !== 0) { driveOk = false; break; }
        }
      }
      if (!driveOk || !L3.done || L3.step !== CH_LEN || L3.retries !== 0 || engStars(L3) !== 3)
        { ok3 = false; bad3 = bad3 || ('drive ' + flat); break; }
    }
    const aggEq = eq2 >= 1;                                       // ch2 等数题在场（25 题 ≥1）
    const u3 = ok3 && aggEq;
    if (u3) npass++;
    units.drive = { ok: u3, bad: bad3, ch2Eq: eq2, ch2N: ch2n };
  }

  /* ---- ⑧ 生成关 flat20-39：dch 独立复算+确定性+SPEC 域对账+四型全现 ---- */
  total++;
  {
    const genDch = {};
    let ok8 = true, bad8 = null;
    for (let flat = 20; flat < 40; flat++) {
      const L = genLevel(flat);
      const expDch = specRi(specMul(flat * 7919 + 887), 1, 4);    // 独立复算（seed 887 SPEC §0.89）
      if (L.dch !== expDch) { ok8 = false; bad8 = 'dch ' + flat; break; }
      const L2 = genLevel(flat);
      if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) { ok8 = false; bad8 = 'det ' + flat; break; }
      if (L.ch !== Math.floor(flat / 5) + 1) { ok8 = false; bad8 = 'ch ' + flat; break; }
      for (let k = 0; k < L.quizzes.length; k++) {
        const q = L.quizzes[k];
        if (!specDomainOk(L.dch, q) || !specFlashOk(L.dch, q.flash) ||
            structWhy(q, L.dch, k)) { ok8 = false; bad8 = 'dom ' + flat + '/' + k; break; }
      }
      if (!ok8) break;
      genDch[L.dch] = (genDch[L.dch] || 0) + 1;
    }
    const aggOk = genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
    const u8 = ok8 && aggOk;
    if (u8) npass++;
    units.gen = { ok: u8, bad: bad8, genDch: genDch };
  }

  /* ---- ② 教学三段（看→帮→独）：stub 存档后 tutorialWatch 真实走完 ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  window.__qcTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__qcWatchMs || 1e9) / SPEED;       // watch 段实测（T46 化 09-19 帽：
                                                             // 名义分账 17220+调度开销 ≤1000 → 18500；
                                                             // 旧 16000 系 estMs 口径已退役）
  const tutHelp = window.__qcDemoR === 'right' && state.tut === 'help' &&
                window.QC.currentLevel.flat === -1 && window.QC.quiz.nL === 2 &&
                window.QC.quiz.nR === 4 && window.QC.quiz.options === 2 &&
                window.QC.quiz.kind === 'cmp' &&
                twWatch <= 18500 && tw <= 26000;   // 全程名义 23270（watch 17220+turn 2150+开题 3900）
                                                 // +调度开销 ≤2700 → 26000（窄视口实测 24025-24075）
  await unlocked();
  const qT = window.QC.quiz;                                // "帮"阶段放手题（turn 2 vs 4）
  const rT = await window.QC.tapSide(specSide(qT.nL, qT.nR)); // 首次选对 → 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__qcTutSolo === true &&
                window.QC.currentLevel.flat === 0 && window.QC.currentLevel.n === 5;
  const u2 = tutHelp && tutSolo;
  if (u2) npass++;
  units.tutorial = { ok: u2, demoR: window.__qcDemoR, tut: state.tut,
                     solo: window.__qcTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT };

  /* ---- ⑤ 错路径：闪现窗吞 null+错侧 wrong+miss+1+错链两段+豁免窗三语义+breathe 梯度
          +C 段 dual 两段错（phase0 错/phase1 错档/正确档 breathe/对档 right） ---- */
  total++;
  {
    /* 0 段：闪现窗内输入吞 null（SPEC §2 钩子契约——感知期不作答，待闪毕） */
    startLevel(0);                       // 开题：ask 延后闪现（verify 提速窗 168ms——10ms 轮询可捕）
    let sawFlash = false;
    for (let wg = 0; wg < 400 && !sawFlash; wg++) {
      if (state.flashOn) sawFlash = true;
      else await wait(10);
    }
    const nullTap = sawFlash
      ? ((await window.QC.tapSide(specSide(window.QC.quiz.nL, window.QC.quiz.nR))) === null)
      : false;   // 闪现窗内正确侧点选也吞 null（不判定不计 miss——tapSide async 须 await）
    await unlocked();
    const swallowFlash = nullTap && window.QC.quiz.step === 0 && window.QC.quiz.miss === 0;
    /* A 段（flat0 ch1）：错→豁免窗内二错吞→真时钟过窗→二错照计 miss=2→breathe→对 */
    startLevel(0);
    await unlocked();
    const qA = window.QC.quiz;
    const wrongSide = qA.nL > qA.nR ? 'R' : 'L';              // ch1 无 same（specDomain 已禁）
    const rA = await window.QC.tapSide(wrongSide);            // 首错（豁免窗起播 4938 真时钟）
    const chainA = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'qc_wrong' &&    // 错链头=wrong clip
                   window.__lastQueue[1] === 'qc_hint' &&     // 语义句=hint「数一数，比一比」
                   window.__lastQueue.every(p => typeof p === 'string') &&   // 全 clip 无 keyless
                   !keylessLast(window.__lastQueue);
    const rejA = await window.QC.tapSide(wrongSide) === false; // 豁免窗内二错吞（guard）
    const miss1 = window.QC.quiz.miss === 1 && window.QC.currentLevel.miss === 1;
    await new Promise(w => setTimeout(w, 5100));               // 等豁免窗（真时钟 4938）过
    const rD = await window.QC.tapSide(wrongSide);             // 窗后二错照计
    const bigSide = qA.nL > qA.nR ? panelLEl : panelREl;       // 多的一侧面板
    const breathe2 = bigSide.classList.contains('breathe');    // miss≥2=多的一侧 breathe
    const miss2 = rD === 'wrong' && window.QC.quiz.miss === 2;
    const rE = await window.QC.tapSide(specSide(qA.nL, qA.nR)); // 对选推进
    /* B 段（重开 flat0）：豁免窗内对选放行 'right'（guard 只吞错点） */
    startLevel(0);
    await unlocked();
    const qB = window.QC.quiz;
    const wB = qB.nL > qB.nR ? 'R' : 'L';
    await window.QC.tapSide(wB);                                // 首错（错路径完成=locked 解除）
    const rPass = await window.QC.tapSide(specSide(qB.nL, qB.nR)); // 窗内对选（真时钟仍在 4938 内）
    /* C 段（flat15 dual）：phase0 错→窗后对侧 half→phase1 错档→正确档 breathe→对档 right */
    startLevel(15);
    await unlocked();
    const qC = window.QC.quiz;                                  // dual 第一问（phase=0）
    const wrongC = qC.nL > qC.nR ? 'R' : 'L';
    const rC0 = await window.QC.tapSide(wrongC);                // 第一问错（miss=1，豁免窗起播）
    const rejC = await window.QC.tapSide(wrongC) === false;     // 窗内二错吞
    await new Promise(w => setTimeout(w, 5100));                // 等豁免窗过（真时钟）
    const rHalf = await window.QC.tapSide(specSide(qC.nL, qC.nR));   // 第一问对 → 'half' 转第二问
    const ph1 = window.QC.quiz && window.QC.quiz.phase === 1 && window.QC.quiz.step === 0;
    const litC = (qC.nL > qC.nR ? panelLEl : panelREl).classList.contains('lit');   // 多侧 lit 记忆锚
    const gapBtns = Array.prototype.map.call(choicesEl.querySelectorAll('.side-btn'),
                                             b => b.dataset.side).join('');          // 第二问档按钮排
    const badGap = String(qC.d === 2 ? 4 : 2);                  // 错档（独立推导：非正确档）
    const rC1 = await window.QC.tapSide(badGap);                // 第二问错档（miss=2）
    const gapBreathe = !!(sideBtnEl(String(qC.d)) && sideBtnEl(String(qC.d)).classList.contains('breathe'));
    const rC2 = await window.QC.tapSide(String(qC.d));          // 对档 → 本题完成
    const dualChain = !!window.__lastQueue && window.__lastQueue.length === 5 &&
                      window.__lastQueue[0] === 'qc_right' &&          // dual 对档确认链 5 段（r46 m1：
                      window.__lastQueue[1] === 'qc_s_left' &&         // 头注「确认链含 qc_n_1x 段」
                      window.__lastQueue[2] === 'qc_n_' + qC.nL &&     // 原仅 ⑩ flat0 ch1 链断言，本段兑现）
                      window.__lastQueue[3] === 'qc_s_right' &&
                      window.__lastQueue[4] === 'qc_n_' + qC.nR &&
                      window.__lastQueue.every(p => typeof p === 'string');
    const u5 = swallowFlash && rA === 'wrong' && chainA && rejA && miss1 && miss2 && breathe2 &&
               rE === 'right' && rPass === 'right' && window.QC.currentLevel.step === 1 &&
               rC0 === 'wrong' && rejC && rHalf === 'half' && ph1 && litC &&
               gapBtns === '246' && rC1 === 'wrong' && gapBreathe &&
               rC2 === 'right' && dualChain && window.QC.currentLevel.step === 1;
    if (u5) npass++;
    units.wrong = { ok: u5, flashSwallow: swallowFlash, first: rA, chain: chainA,
                    rejInWin: rejA, miss1: miss1, miss2: miss2, breathe2: breathe2,
                    right: rE, passInWin: rPass,
                    dual: { p0Wrong: rC0, rej: rejC, half: rHalf, phase1: ph1, lit: litC,
                            gapBtns: gapBtns, gapWrong: rC1, gapBreathe: gapBreathe,
                            gapRight: rC2, chain: dualChain } };
  }

  /* ---- ⑬ dual 专项（r46 主新增）：分布+中间态+非法 s ——独立推导禁读引擎 ---------- */
  total++;
  {
    /* a. 静态 flat15-19：差值档直方图 {2,4,6} 各 ≥1+镜像侧 L/R 各 ≥1+域复算（pycheck 双落） */
    const dHist = { 2: 0, 4: 0, 6: 0 }, sHist = { L: 0, R: 0 };
    let domOk13 = true;
    for (let flat = 15; flat < 20; flat++) {
      const L = genLevel(flat);
      if (L.dch !== 4) { domOk13 = false; break; }
      for (const q of L.quizzes) {
        if (!specDomainOk(4, q)) { domOk13 = false; break; }
        dHist[q.d]++;
        sHist[q.nL > q.nR ? 'L' : 'R']++;
      }
      if (!domOk13) break;
    }
    const distOk = domOk13 && dHist[2] >= 1 && dHist[4] >= 1 && dHist[6] >= 1 &&
                   sHist.L >= 1 && sHist.R >= 1;
    /* b. 引擎级：dual 非法 s 相位不符=null（phase0 点档/phase1 点侧）+S 恒错干扰路径 */
    const L13 = genLevel(15);
    const q13 = L13.quizzes[0];
    const rBad1 = engTapSide(L13, String(q13.d));       // 第一问点档（相位不符）→null
    const rS = engTapSide(L13, 'S');                    // 第一问点一样多（恒错干扰）→wrong
    const rHalfE = engTapSide(L13, specSide(q13.nL, q13.nR));
    const rBad2 = engTapSide(L13, 'L');                 // 第二问点侧（相位不符）→null
    const rGap = engTapSide(L13, String(q13.d));
    const engOk = rBad1 === null && rS === 'wrong' && rHalfE === 'half' &&
                  rBad2 === null && rGap === 'right' && q13._miss === 1;
    /* c. 双闪序列中间态捕获（fire-and-forget 密集轮询——b18 先例；SPEED=0.12 序列 468ms） */
    startLevel(15);                                     // presentQuiz 异步：ask 288ms 后双闪
    let sawA = false, sawB = false, domA = false, domB = false;
    for (let wg = 0; wg < 600 && !(sawA && sawB); wg++) {
      const ph = window.__qcDualPhase;
      if (ph === 'A' && !sawA) {
        sawA = true;
        domA = !panelLEl.classList.contains('veil') && panelREl.classList.contains('veil');
      }
      if (ph === 'B' && !sawB) {
        sawB = true;
        domB = panelLEl.classList.contains('veil') && !panelREl.classList.contains('veil');
      }
      await wait(10);
    }
    await unlocked();
    const flashSeq = sawA && sawB && domA && domB && window.__qcDualPhase === null;
    const u13 = distOk && engOk && flashSeq;
    if (u13) npass++;
    units.dual = { ok: u13, dist: distOk, dHist: dHist, sideHist: sHist,
                   eng: engOk, flashSeq: flashSeq, sawA: sawA, sawB: sawB };
  }

  /* ---- ④ 契约 M 帧断言（×flat0/10/15/20——含 dual 全作答形态，闪现后残留计数锚） ---- */
  total++;
  {
    const fr = [];
    for (const flat of [0, 10, 15, 20]) {
      window.__qcFlashN = 0;
      startLevel(flat);
      await unlocked();                                       // 闪毕开放态（圆点已 veil）
      const q = window.QC.quiz;
      const nLdom = panelDots(panelLEl).length === q.nL;      // DOM circle 计数==nL（残留锚）
      const nRdom = panelDots(panelREl).length === q.nR;
      const veilOk = panelLEl.classList.contains('veil') && panelREl.classList.contains('veil');
      const sides = q.options === 2 ? ['L', 'R'] : ['L', 'S', 'R'];   // 按钮集独立推导（dual phase0 同三选）
      const btnSides = Array.prototype.map.call(choicesEl.querySelectorAll('.side-btn'),
                                                b => b.dataset.side);
      const btnN = btnSides.length === q.options && btnSides.join('') === sides.join('');
      const rs = dotRadii();
      const eqR = rs.length === q.nL + q.nR && rs.every(r => r === specR(q));   // 等大（rOf 参数化）
      const flashAnchor = window.__qcFlashN >= 1;             // 开题闪现演出锚
      fr.push({ flat: flat, ok: nLdom && nRdom && veilOk && btnN && eqR && flashAnchor,
                nL: nLdom, nR: nRdom, veil: veilOk, btn: btnN, eqR: eqR, anchor: flashAnchor });
    }
    const u4 = fr.every(f => f.ok);
    if (u4) npass++;
    units.frame = { ok: u4, frames: fr };
  }

  /* ---- ⑥ 先验专项 20 关全量（独立推导禁读页面期望+渲染首题 DOM） ---- */
  total++;
  {
    let ok6 = true, bad6 = null, sameSeen = 0, sameOk = true;
    for (let flat = 0; flat < 20; flat++) {
      const L = genLevel(flat);
      const dch = Math.floor(flat / 5) + 1;
      for (let k = 0; k < L.quizzes.length; k++) {
        const q = L.quizzes[k];
        if (!specDomainOk(dch, q) || !specFlashOk(dch, q.flash))
          { ok6 = false; bad6 = 'dom ' + flat + '/' + k; break; }
        if (q.nL === q.nR) {                                  // 等数题专项对账（r46 域 10-20）
          sameSeen++;
          if (!(q.nL >= 10 && q.nL <= 20) || q.optsN !== 3) sameOk = false;
        }
      }
      if (!ok6) break;
      /* 渲染层首题 DOM：dot 计数+等大半径（引擎坐标渲染对账） */
      startLevel(flat);
      await unlocked();
      const q0 = window.QC.quiz;
      const rs = dotRadii();
      if (panelDots(panelLEl).length !== q0.nL || panelDots(panelREl).length !== q0.nR ||
          rs.length !== q0.nL + q0.nR || rs.some(r => r !== specR(q0)))
        { ok6 = false; bad6 = bad6 || ('render ' + flat); break; }
    }
    const u6 = ok6 && sameOk && sameSeen >= 1;                // 等数题真实在场（ch2 域 10-20）
    if (u6) npass++;
    units.prior = { ok: u6, bad: bad6, sameSeen: sameSeen, sameDomain: sameOk };
  }

  /* ---- ⑦ 星级口径（引擎级构造直测：0=3★/1-2=2★/≥3=1★，永不 0 星） ---- */
  total++;
  {
    const L7 = genLevel(10);
    L7.retries = 0; const st3 = engStars(L7) === 3;
    L7.retries = 1; const st2a = engStars(L7) === 2;
    L7.retries = 2; const st2b = engStars(L7) === 2;
    L7.retries = 3; const st1 = engStars(L7) === 1;
    L7.retries = 9; const stFloor = engStars(L7) === 1;
    const u7 = st3 && st2a && st2b && st1 && stFloor;
    if (u7) npass++;
    units.stars = { ok: u7, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };
  }

  /* ---- ⑩ 确认链构成（T46 化 5 段全 string clip+最坏链窗独立复算 双档） ---- */
  total++;
  {
    startLevel(0);
    await unlocked();
    const q10 = window.QC.quiz;
    await window.QC.tapSide(specSide(q10.nL, q10.nR));
    const LQ = window.__lastQueue;
    const expParts = ['qc_right', 'qc_s_left', 'qc_n_' + q10.nL,
                      'qc_s_right', 'qc_n_' + q10.nR];        // 段键独立推导（SPEC 域 1-20）
    const chainOk = LQ && LQ.length === 5 &&
                    LQ.every((p, i) => p === expParts[i]) &&  // 5 段全 clip 拼播
                    LQ.every(p => typeof p === 'string') &&   // 零 keyless（T46 政策）
                    !keylessLast(LQ);                         // 全 string 恒真复核（Mj-1）
    /* 最坏链（n≤10 实测档）=全域 max（nL=nR=10）：2256+600+1344+1464+1368+1464+300=8796 ≤ 8800 */
    let worst = 0;
    for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) worst = Math.max(worst, chainMs(a, b));
    const lenOk = worst === 8796 && chainMs(10, 10) === 8796 &&
                  (2000 + 6800) >= worst;   // 精确防漂；n≤10 演出窗 ≥ 确认链（家族 G/H）
    /* r46 n∈11-20 实测档（段二 mutagen 09-22，SPEC §R8 实测复核行——estMs 保守上界
       1650 口径退役）：实测 max=1632/键 → 最坏 9132 ≤ 动态尾窗 2000+7400=9400 */
    let worstHi = 0;
    for (let a = 11; a <= 20; a++) for (let b = 11; b <= 20; b++) worstHi = Math.max(worstHi, chainMs(a, b));
    const lenHiOk = worstHi === 9132 && (2000 + 7400) >= worstHi;
    const u10 = chainOk && lenOk && lenHiOk;
    if (u10) npass++;
    units.confirm = { ok: u10, chain: chainOk, len: lenOk, lenHi: lenHiOk, worst: worst,
                      worstHi: worstHi,
                      queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };
  }

  /* ---- ⑨ 源码级断言（读自身合并 script 文本——第 3 个 script 块）+ 双录数值 ---- */
  total++;
  {
    const src = document.querySelectorAll('script')[2].textContent;
    const coreSrc = document.querySelectorAll('script')[0].textContent;
    const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
                 src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
    const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
                 src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
                 src.indexOf('idle > 30000') >= 0 &&   // B：救援双锚（14s 方向级独立节流/30s 答案级）
                 src.indexOf('doFlash(false, true)') >= 0 &&   // B-r46 M1：救援重放 keepIdle 实参在场（防回退饿死）
                 src.indexOf('if (!keepIdle) lastAct = Date.now();') >= 0;   // B-r46 M1：idle 锚条件刷
    const srcS1 = src.indexOf('旗标由本 ++ 点回收') >= 0 &&               // r46 S1：判定 ++ 点同步解除闪现态
                  src.indexOf('state.flashOn = false;') >= 0;             // （abort 分支不清旗标防误清新闪现者）
    const srcE = src.indexOf('sv.quickcmp && sv.quickcmp.tutSeen') >= 0;   // E：行为分流先查教学特例
    const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
                 src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
    const srcI = src.indexOf('wrongChainUntil = Date.now() + 4938') >= 0 &&   // I：豁免窗字面 4938
                 src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
                 src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：救援守卫+重置
                 src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && !sideOk') >= 0;   // I 补：guard
    const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
    const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
                 src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
    const styleSrc = document.querySelectorAll('style')[0].textContent;
    const srcO = styleSrc.indexOf('button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}') >= 0;   // O：自建 button 显式 color
    /* 契约 L：NUMCN 表 20 值双录（SPEC_NUMCN 独立硬编码全量对账——r46 扩 11-20） */
    const srcL = Object.keys(NUMCN).length === 20 &&
                 [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
                   .every(n => NUMCN[n] === SPEC_NUMCN[n]);
    const srcM = src.indexOf('__qcFlashN') >= 0;                // M：闪现演出锚
    const srcN = src.indexOf('window.QC =') >= 0 && src.indexOf('__qcDemoR') >= 0;   // N 配套：钩子真实页暴露+教学实证
    const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&          // C：存档版本 1.0（core）
                 coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&   // C：存档键名
                 src.indexOf("KIDS.init({ game: 'quickcmp'") >= 0;   // C：本款存档键 kidsgame_quickcmp
    /* r46 字面族：GAP_ASK_WIN 2700/DUAL_ISI 800/动态尾 7400/half 刷 lastAct（r25 M2）/
       __qcDualPhase 中间态锚/flashMs 新档 1400/rOf 7.5 大簇半径/档按钮 gap */
    const srcR46a = src.indexOf('GAP_ASK_WIN * SPEED') >= 0 &&
                    src.indexOf("if (r === 'half') {\n    lastAct = Date.now();") >= 0 &&   // r25 M2：half 解锁刷救援钟
                    src.indexOf('__qcDualPhase') >= 0 &&
                    src.indexOf("(q.nL > 10 || q.nR > 10) ? 7400 : 6800") >= 0 &&   // 动态尾（SPEC §R8）
                    src.indexOf("sayR(VOICE.gap.key, VOICE.gap.text)") >= 0;        // dual 第二问问句
    const srcR46b = src.indexOf('const DUAL_ISI = 800') >= 0 &&                      // data：双簇间隔
                    src.indexOf('FLASH_MID = 1400') >= 0 &&                          // data：大数域闪现档
                    src.indexOf("(dch === 2 || dch === 4 ? FLASH_MID : FLASH_EASY)") >= 0 &&   // flashMs 新档
                    src.indexOf('r="7.5"') < 0 && src.indexOf("Math.max(q.nL, q.nR) <= 12 ? 8 : 7.5") >= 0;   // rOf 大簇半径（模板字面防自匹配）
    const styleR46 = styleSrc.indexOf('.panel.lit') >= 0 &&        // head：lit 记忆锚样式
                     styleSrc.indexOf('.side-btn.gap .gapnum') >= 0;   // head：档级按钮样式
    /* CHAPTERS/GEN_HINTS 双录（r46 新文案 CHAPTERS[3].hint/GEN_HINTS[3]）+ nextHint 数值断言 */
    const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                   CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                   CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                   CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                   GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                   GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                   nextHint(4) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完 flat4）预告 ch2 文案
                   nextHint(9) === SPEC_CHAPTER_HINTS[2] &&        // （预告文案存 CHAPTERS[章].hint——家族 F 形态）
                   nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                   nextHint(19) === SPEC_CHAPTER_HINTS[4];
    /* 生成关 nextHint 实算对账：期望值独立复算 dch（verify mulberry32 副本，禁读引擎） */
    const genCalc = [24, 29, 34, 39].every(f => {
      const expDch = specRi(specMul((f + 1) * 7919 + 887), 1, 4);
      return nextHint(f) === SPEC_GEN_HINTS[expDch - 1] &&
             nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1] &&
             genLevel(f + 1).dch === expDch;
    });
    const u9 = srcA && srcB && srcS1 && srcC && srcE && srcF && srcI && srcJ && srcK && srcL &&
               srcM && srcN && srcO && srcR46a && srcR46b && styleR46 && hintOk && genCalc;
    if (u9) npass++;
    units.contract = { ok: u9, A: srcA, B: srcB, S1: srcS1, C: srcC, E: srcE, F: srcF,
                       I: srcI, J: srcJ, K: srcK, L: srcL, M: srcM, N: srcN, O: srcO,
                       r46a: srcR46a, r46b: srcR46b, styleR46: styleR46,
                       hints: hintOk, genCalc: genCalc };
  }

  /* ---- ① 结构：simView 双 viewport+对比度+横溢 / clips 注入+实长辨别 ---- */
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
  total++;
  {
    function simView(w, h) {
      const g = $id('game');
      g.style.width = w + 'px';
      g.style.height = h + 'px';
      startLevel(g._simFlat);
      return unlocked().then(() => {
        const q = window.QC.quiz;
        const need = q ? q.options : 3;   // ch1=2 / 其余=3（dual phase0 同三选——r43 M4 全形态）
        const btns = Array.prototype.map.call(choicesEl.querySelectorAll('.side-btn'),
          b => ({ w: b.offsetWidth, h: b.offsetHeight }));
        const hitOk = btns.length === need && btns.every(b => b.w >= 96 && b.h >= 96);   // 答案按钮=主触达
        const rs = dotRadii();
        const expR = q ? specR(q) : '8';
        const eqR = rs.length > 0 && rs.every(r => r === expR);   // 圆点等大（rOf 参数化渲染铁律）
        const pL = getComputedStyle(panelLEl), pR = getComputedStyle(panelREl);
        const symOk = panelLEl.offsetWidth === panelREl.offsetWidth &&
                      panelLEl.offsetHeight === panelREl.offsetHeight;   // 左右区对称
        const cB = ratioOf(cssToHex(getComputedStyle(choicesEl.querySelector('.side-btn')).borderLeftColor), '#FFF9EE') >= 3;
        const cP = ratioOf(cssToHex(pL.borderLeftColor), '#FBF6EC') >= 3 &&
                   ratioOf(cssToHex(pR.borderLeftColor), '#FBF6EC') >= 3;
        const de = document.documentElement;
        const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
        return { vp: w + 'x' + h, flat: g._simFlat, btns: btns.length, hitOk: hitOk,
                 eqR: eqR, sym: symOk, contrast: cB && cP, ox: ox,
                 pass: hitOk && eqR && symOk && cB && cP && ox <= 0 };
      });
    }
    const sims = [];
    for (const flat of [0, 10, 15]) {          // r43 M4 全作答形态采样：ch1 两选/ch3 三选/ch4 dual
      $id('game')._simFlat = flat;
      sims.push(await simView(1280, 800));
      sims.push(await simView(800, 1180));
    }
    const g0 = $id('game');
    g0.style.width = '';
    g0.style.height = '';
    startLevel(0);                                            // 还原真实 viewport 布局
    await unlocked();
    /* clips：qc_ 29 条（既有 6+T46 段 2+qc_ask_gap+数词 1-20）+ core 3 条全注入
       + duration 辨别器（±60ms，29 键全跑——r46 修复轮 m5：1-10 并入，原 19 键只盖
       新段、1-10 mp3 损坏/错配不可拦）。r46 段二注册后 32 条
       （SPEC-R46 §R7/§R13——21→32 联动已收口 09-22）+双录一致（SPEC_DUR↔SPEC_QC_N 1-20 全量） */
    const keys = Object.keys(KIDS.voice.clips);
    const qcKeys = Object.keys(SPEC_DUR);
    const needAll = qcKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
    const preOk = keys.length === 32 &&
      needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
    const durs = await Promise.all(qcKeys.map(k => new Promise(res => {
      let done = false;
      const a = new Audio(KIDS.voice.clips[k]);
      const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
      a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
      a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
    })));
    const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[qcKeys[i]]) <= 60);
    const recOk = Array.from({ length: 20 }, (_, i) =>
      SPEC_DUR['qc_n_' + (i + 1)] === SPEC_QC_N[i + 1]);   // 1-20 双录一致（两表禁漂移——r46 m5 扩全量）
    const u1 = preOk && durOk && recOk.every(Boolean) && sims.every(s => s.pass);
    if (u1) npass++;
    units.struct = { ok: u1, clips: preOk, durs: durs, rec: recOk.every(Boolean), sims: sims };
  }

  /* ---- ⑪ save：真实写档链（init quickcmp→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__qcOrig.save, origPersist = window.__qcOrig.persist;
  const origLS = localStorage.getItem('kidsgame_quickcmp');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_quickcmp');
    KIDS.init({ game: 'quickcmp', title: '快速比大小' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.QC.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_quickcmp');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'quickcmp' &&
                j.levels && j.levels['1-0'] && j.levels['1-0'].stars === 3);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_quickcmp');
  else localStorage.setItem('kidsgame_quickcmp', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
     审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  {
    const today = new Date();
    const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const pre = { v: '1.0', game: 'quickcmp', firstDay: tstr, lastDay: tstr, levels: {},
                  dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                  restTip: { day: '', shown: 0 }, quickcmp: { tutSeen: true } };
    let q12 = null, realOk = false;
    try {
      localStorage.setItem('kidsgame_quickcmp', JSON.stringify(pre));
      KIDS.store.load();                             // 重读预置档
      window.__qcDemoR = null;                       // 教学实证清零（非教学路径不应重设）
      window.QC.start(0);
      await unlocked();
      q12 = window.QC.quiz;
      realOk = state.tut === 'none' && window.__qcDemoR === null &&
               q12 && q12.flash === 1200 && q12.options === 2 && q12.kind === 'cmp' &&
               q12.nL >= 1 && q12.nL <= 5 && q12.nR >= 1 && q12.nR <= 5 &&
               q12.nL !== q12.nR && q12.same === false &&
               q12.step === 0 && q12.miss === 0 &&
               window.QC.currentLevel.flat === 0 && window.QC.currentLevel.n === 5 &&
               (KIDS._save() || {}).v === '1.0';
    } finally {
      /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
      if (origLS === null) localStorage.removeItem('kidsgame_quickcmp');
      else localStorage.setItem('kidsgame_quickcmp', origLS);
      KIDS._save = function () { return { levels: {} }; };
      KIDS.store.persist = function () {};
    }
    if (realOk) npass++;
    units.realPath = { ok: realOk, tut: state.tut, quiz: q12 && { nL: q12.nL, nR: q12.nR } };
  }

  const out = { game: 'quickcmp', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__qcVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass) + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）并留播报历史
     （__voiceHist）；voice.queue 记录拼播链（__lastQueue） */
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
