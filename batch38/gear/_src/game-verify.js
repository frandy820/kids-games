/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元（v3）
   ① 结构：双 viewport simView（1280×800/800×1180）×（flat0 三槽/flat7 六槽）：
     槽位 DOM 计数===slots 长+槽/候选/预判按钮触摸目标、固定轮 data-dir=转向律、
     对比度 ≥3:1、overflowX ≤0（六槽链收窄适配）；clips gr_ 11+core 3 全注入+
     duration 辨别器（§4 实长表 ±60ms——v3 新增 dir_wrong 2760/speed_wrong 2664，
     T46 阶段2 题面观察句 gr_obs_1..4=2712/3048/2256/2304）
   ② 教学三段（看→帮→独，v3 双答两步演示）：tutorialWatch() 真实走完（stub 存档）
     → __grDemoR==='meshed'（题 0 非末题——先 tapDir 'ok' 再 tapGear）且 tut='help'；
     turn 单题先答预判再放对 → __grTutSolo 且进正式关（flat=0），watch 折算真实时长
     ≤16s（单步演示款口径）
   ③ 逐关驱动 flat0-19：确定性 / 章映射 / SPEC 20 题表独立复算（specTable 双录+
     章池 rotate (lv+k)%5+specPicks seeded 打散复算——禁读引擎期望）/ 引擎两段直驱
     （tapDir(dirAns)→'ok'→tapGear(answer)→meshed/末题 done→全关 3★）
   ④ 契约 M 帧断言（×flat0/7/10/16/20 五层：3 槽 dir/6 槽 dir/speed/conflict-jam/
     生成关）：数值层 slots[].gear/teeth/dir 真值（独立复算）+dirAns/jam/phase+
     blank+picks+answer 独立推导；渲染层槽位 DOM 计数+dataset.k 扁平对账+blank 类型+
     固定轮 data-dir+开口虚框在场+预判行按钮组按 kind（dir2/speed3/conflict3）；
     演出层放对后判定槽 .meshed+data-dir===转向律+--dur 转速=齿数×70（传动比断言：
     D 槽/空槽 duration 比=齿数比）+全链 .spin 联动+**转向视觉对账（r2 M1：data-dir
     与 computed animationDirection 一致——ccw=reverse）**+jam 题 .jammed 在场无 .spin
   ⑤ 错路径：开题演出锁内预判答吞 null+阶段1 错（tapDir 干扰→'wrong'+miss+错链
     [gr_dir_wrong,gr_hint]）+豁免窗 5538 内二错吞 false+窗后二错照计 miss=2+正确
     预判按钮 breathe+顺序守卫（phase1 点正确齿轮也吞 null 不泄答案）+阶段2 错
     （tapGear 干扰→'wrong'+错链 [gr_wrong,gr_hint]+首错锁 2334 后豁免窗内对选放行
     'meshed'——b37 R3）+窗后二错 miss=2+判定槽 breathe
   ⑥ 先验专项 20 题全量（verify 独立推导禁读页面期望）：奇偶律全链复算（独立 k%2
     副本）+冲突律独立重列（jam=(blank%2)!=((n-1-blank)%2) iff n 偶）+传动比独立
     复算（dteeth==need?'same':'small'）+**候选去恒等断言（|干扰齿数-正确齿数|
     ∈{2,4} 且互异含正确恰 1）**+域封闭（D 首/尾 W|B/恰 1 空/fixes 覆盖 x 位）
   ⑦ 星级口径：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ 生成关 flat20-39：dch 独立复算（specMul 副本首随机数）+确定性+域全档成立
     （dch 1-4 档行池封闭+specRows 抽序复算）+specPicks 逐题对账
   ⑨ 源码级：读合并 script 第 3 块（b36 M1：script[2]=纯 data+engine+main，
     script[3]=verify 独立第 4 块）——契约 A/B/C/D/E/F/I/J/K/O 字面逐条检索+
     WRONG_CHAIN_WIN===2184+150+2328+300===4962 算式+WRONG_LOCK_1===2184+150
     ===2334（b37 R3）+**DIR_CHAIN_WIN===2760+150+2328+300===5538+DIR_LOCK_1
     ===2910+SPEED_CHAIN_WIN===2664+150+2328+300===5442+SPEED_LOCK_1===2814（v3）**
     +MESH_MS+CHAIN_MS≥2388+转向律字面+冲突律字面+传动比字面+TOOTH_MS=70+
     CHAPTERS/GEN_HINTS/题面句双录+nextHint 4/9/14/19 数值断言+24/29/34/39 生成关
     nextHint 实算
   ⑩ 确认链构成：__lastQueue===['gr_right']（单 clip 全 clip 无 keyless——契约 N）
     +演出窗 1100+1500=2600 ≥ 2088+300=2388（家族 G/H）+题面句 __lastVoiceText===
     章档句（SPEC_OBS 独立录，T46 clip 化 play 锚）+ch3 obsWin=estMs(7)+300=3315（家族 T）
   ⑪ 写档：origLS 保护——还原真函数→init gear→autoSolve 通关（两段 tap×5 题=10
     taps）→localStorage kidsgame_gear v:'1.0' levels['1-0'] 更新；测后恢复
   ⑫ 真实路径：fresh 预置存档（v1.0+tutSeen）→ GR.start(0) 非教学直达题面+
     window.GR 暴露（b29 坑⑥）；try/finally 保异常时 origLS 也恢复（b36 m4）
   结果写 #verify-result + window.__grVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  window.__grOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH38 §3 v3 独立重列（禁抄页面 SPEC_TABLE/VOICE/CHAPTERS/常量） */
  /* SPEC 20 题全表双录（kind/layout/blank/need/fixes{x:档}/dteeth） */
  const specTable = [
    { kind: 'dir', layout: 'D_W', blank: 1, need: 't10', fixes: {} },
    { kind: 'dir', layout: 'Dx_W', blank: 2, need: 't12', fixes: { 1: 't10' } },
    { kind: 'dir', layout: 'D_W', blank: 1, need: 't14', fixes: {} },
    { kind: 'dir', layout: 'Dx_W', blank: 2, need: 't8', fixes: { 1: 't16' } },
    { kind: 'dir', layout: 'D_W', blank: 1, need: 't12', fixes: {} },
    { kind: 'dir', layout: 'Dx_W', blank: 2, need: 't10', fixes: { 1: 't14' } },
    { kind: 'dir', layout: 'D_xxW', blank: 1, need: 't16', fixes: { 2: 't8', 3: 't12' } },
    { kind: 'dir', layout: 'Dxxx_W', blank: 4, need: 't14', fixes: { 1: 't12', 2: 't8', 3: 't16' } },
    { kind: 'dir', layout: 'D_W', blank: 1, need: 't12', fixes: {} },
    { kind: 'dir', layout: 'Dxx_W', blank: 3, need: 't8', fixes: { 1: 't12', 2: 't16' } },
    { kind: 'speed', layout: 'D_W', blank: 1, need: 't8', dteeth: 't16' },
    { kind: 'speed', layout: 'D_W', blank: 1, need: 't16', dteeth: 't8' },
    { kind: 'speed', layout: 'D_W', blank: 1, need: 't12', dteeth: 't12' },
    { kind: 'speed', layout: 'D_W', blank: 1, need: 't10', dteeth: 't16' },
    { kind: 'speed', layout: 'D_W', blank: 1, need: 't10', dteeth: 't10' },
    { kind: 'dir', layout: 'Dxx_W', blank: 3, need: 't12', fixes: { 1: 't8', 2: 't14' } },
    { kind: 'conflict', layout: 'D_xB', blank: 1, need: 't10', fixes: { 2: 't14' } },
    { kind: 'conflict', layout: 'Dxx_B', blank: 3, need: 't8', fixes: { 1: 't12', 2: 't16' } },
    { kind: 'conflict', layout: 'Dxxx_B', blank: 4, need: 't16', fixes: { 1: 't10', 2: 't8', 3: 't14' } },
    { kind: 'dir', layout: 'Dx_W', blank: 2, need: 't10', fixes: { 1: 't16' } }
  ];
  const SPEC_DUR = { gr_tut_watch: 3024, gr_tut_turn: 1776,
                     gr_hint: 2328, gr_right: 2088, gr_wrong: 2184,
                     gr_dir_wrong: 2760, gr_speed_wrong: 2664,
                     gr_obs_1: 2712, gr_obs_2: 3048, gr_obs_3: 2256, gr_obs_4: 2304 };   // §4 实长表（v3 扩 2 键+T46 观察句 4 键）
  const SPEC_CHAPTER_HINTS = { 1: '机器变长了，猜猜转向', 2: '大轮带小轮，谁转得快',
                               3: '两根手柄，转得动吗', 4: '新一轮修机器开始' };
  const SPEC_GEN_HINTS = ['小机器转起来，再修五台', '长链猜转向，再装齿轮',
                          '大轮小轮转起来', '两根手柄的机器，转得动吗'];
  const SPEC_OBS = { 1: '看一看手柄往哪转', 2: '猜猜这个轮子往哪边转',
                     3: '哪个齿轮转得快', 4: '这个轮子转得动吗' };   // 题面句表（§3 v3 定版）
  /* 齿数制 5 档+邻档干扰池双录（去恒真值源——独立于页面 NEIGHBOR/TEETH） */
  const specTeeth = { t8: 8, t10: 10, t12: 12, t14: 14, t16: 16 };
  const specNeighbor = { t8: ['t10', 't12'], t10: ['t8', 't12'], t12: ['t10', 't14'],
                         t14: ['t12', 't16'], t16: ['t12', 't14'] };
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  /* 转向律独立副本（SPEC §0.93 数学锚：k%2==0?'cw':'ccw'——禁调引擎 dirAt） */
  const specDirAt = k => (k % 2 === 0 ? 'cw' : 'ccw');
  /* 阶段1 真值独立重列（v3 判据三式——禁调引擎 deriveDirAns）：
     speed=传动比（齿少者恒快，'big' 恒干扰）；conflict=双驱两路奇偶冲突 iff n 偶 */
  const specDirAnsOf = row => {
    if (row.kind === 'speed') return row.dteeth === row.need ? 'same' : 'small';
    const n = row.layout.length, k = row.blank;
    if (row.kind === 'conflict') {
      const jam = (k % 2) !== ((n - 1 - k) % 2);
      return jam ? 'jam' : specDirAt(k);
    }
    return specDirAt(k);
  };
  /* 独立 mulberry32 副本（禁调引擎同名函数——生成关 dch/picks 复算独立性） */
  const specMul = a => function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const specRi = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  /* 独立 seeded 打散副本（Fisher-Yates 与引擎 shuffled 同构——picks 序对账） */
  const specShuffle = (arr, rnd) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = specRi(rnd, 0, i);
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  /* 关题行序独立复算（SPEC §0.93：静态关章池 rotate (lv+k)%5；生成关 dch=
     mulberry32(flat*7919+847) 首随机数+档池 seeded 无放回抽 5——先取数保确定性）
     返回流状态 rnd：已消耗到**题 0 picks 打散起点**（与引擎 genLevel 严格同构——
     静态关零消耗；生成关首数耗 dch+5 数耗抽序） */
  const specFlow = flat => {
    const rnd = specMul(flat * 7919 + 847);
    const d0 = Math.floor(flat / 5) % 4 + 1;
    const dch = flat < 20 ? d0 : specRi(rnd, 1, 4);
    const lv = flat % 5;
    let rows;
    if (flat < 20) {
      const base = (dch - 1) * 5;
      rows = [];
      for (let k = 0; k < 5; k++) rows.push(base + (lv + k) % 5);
    } else {
      const pool = [(dch - 1) * 5, (dch - 1) * 5 + 1, (dch - 1) * 5 + 2, (dch - 1) * 5 + 3, (dch - 1) * 5 + 4];
      const a = pool.slice();
      rows = [];
      for (let k = 0; k < 5; k++) rows.push(a.splice(specRi(rnd, 0, a.length - 1), 1)[0]);
    }
    return { dch: dch, rows: rows, rnd: rnd };
  };
  /* 单题期望独立推导（行→槽位真值+阶段1 真值+picks 打散+answer；从 SPEC 表+
     奇偶/冲突/传动比三判据复算——禁读引擎期望） */
  const specQuiz = (rowIdx, rnd) => {
    const row = specTable[rowIdx];
    const dt = row.dteeth || 't12';                // 驱动轮齿数（非 speed 恒 t12）
    const dirAns = specDirAnsOf(row);
    const slots = [];
    for (let k = 0; k < row.layout.length; k++) {
      const c = row.layout.charAt(k);
      if (c === '_') slots.push({ k: k, type: 'blank', gear: null, teeth: null, dir: null });
      else if (c === 'D') slots.push({ k: k, type: 'D', gear: 'D', teeth: specTeeth[dt], dir: 'cw' });
      else if (c === 'B') slots.push({ k: k, type: 'B', gear: 'B', teeth: specTeeth.t12, dir: 'cw' });
      else if (c === 'W') slots.push({ k: k, type: 'W', gear: 'W', teeth: null, dir: specDirAt(k) });
      else slots.push({ k: k, type: 'fix', gear: row.fixes[k], teeth: specTeeth[row.fixes[k]], dir: specDirAt(k) });
    }
    const picks = specShuffle([row.need].concat(specNeighbor[row.need]), rnd);
    return { row: row, slots: slots, picks: picks, answer: picks.indexOf(row.need),
             dirAns: dirAns, jam: dirAns === 'jam' };
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：本款确认链 ['gr_right'] 单 clip
     无 keyless（天然安全）；题面句走 voice.say 非队列链（承 b36/b37 明示） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);
  const slotElAt = k => wallEl.querySelector('.slot[data-k="' + k + '"]');
  const pickElAt = i => picksEl.querySelector('.pick[data-i="' + i + '"]');
  const dirElAt = d => guessbarEl.querySelector('.guess-btn[data-guess="' + d + '"]');
  const unlocked = async () => {                  // 等开题/演出/错反馈锁窗结束（verify 提速后）
    let wg = 0;                                   // showUntil 含 +140 余量——尾巴也须等净
    while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= state.showUntil;
  };

  /* ---- ③ 逐关驱动 flat0-19：确定性+章映射+SPEC 表独立复算+引擎两段直驱 ---- */
  total++;
  {
    let ok3 = true, bad3 = null;
    for (let flat = 0; flat < 20 && ok3; flat++) {
      const L1 = genLevel(flat), L2 = genLevel(flat);
      if (JSON.stringify(L1.quizzes) !== JSON.stringify(L2.quizzes)) { ok3 = false; bad3 = 'det ' + flat; break; }
      const expCh = Math.floor(flat / 5) + 1, expDch = Math.floor(flat / 5) % 4 + 1;
      if (L1.ch !== expCh || L1.dch !== expDch || L1.quizzes.length !== 5) { ok3 = false; bad3 = 'ch ' + flat; break; }
      /* SPEC 表独立复算：行序 rotate+逐题槽位真值+阶段1 真值+picks 打散+answer */
      const sf = specFlow(flat);
      for (let qi = 0; qi < 5; qi++) {
        const q = L1.quizzes[qi];
        const exp = specQuiz(sf.rows[qi], sf.rnd);
        if (q.kind !== exp.row.kind || q.layout !== exp.row.layout || q.blank !== exp.row.blank ||
            q.need !== exp.row.need ||
            q.dteeth !== (exp.row.dteeth || 't12') ||
            q.dirAns !== exp.dirAns || q.jam !== exp.jam ||
            JSON.stringify(q.picks) !== JSON.stringify(exp.picks) ||
            q.answer !== exp.answer || structWhy(q, L1.dch, qi)) {
          ok3 = false; bad3 = 'quiz ' + flat + '/' + qi; break;
        }
        for (let si = 0; si < exp.slots.length; si++) {          // 槽位真值（转向律独立复算）
          const s = q.slots[si], e = exp.slots[si];
          if (s.k !== e.k || s.type !== e.type || s.gear !== e.gear ||
              s.teeth !== e.teeth || s.dir !== e.dir) {
            ok3 = false; bad3 = 'slot ' + flat + '/' + qi + '/' + si; break;
          }
        }
        if (!ok3) break;
      }
      if (!ok3) break;
      /* 引擎两段直驱：tapDir(dirAns)→'ok'→tapGear(answer)→meshed/末题 done；全关零错=3 星 */
      const L3 = genLevel(flat);
      let driveOk = true;
      for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
        const q = L3.quizzes[L3.step];
        const rd = engTapDir(L3, q.dirAns);
        if (rd !== 'ok' || q.phase !== 2 || !q._dirOk) { driveOk = false; break; }
        const exp = k === L3.quizzes.length - 1 ? 'done' : 'meshed';
        const r = engTapGear(L3, correctPick(q));
        if (r !== exp || q._miss !== 0 || !q._answered) { driveOk = false; break; }
        /* 放对后槽位真值落位（判定槽 gear/teeth/dir=转向律——渲染层之源） */
        const bs = q.slots[q.blank];
        if (bs.gear !== q.need || bs.teeth !== specTeeth[q.need] || !bs.meshed) { driveOk = false; break; }
        if (bs.dir !== (q.jam ? 'jam' : specDirAt(bs.k))) { driveOk = false; break; }
      }
      if (!driveOk || !L3.done || L3.step !== CH_LEN || L3.retries !== 0 || engStars(L3) !== 3)
        { ok3 = false; bad3 = bad3 || ('drive ' + flat); }
    }
    const u3 = ok3;
    if (u3) npass++;
    units.drive = { ok: u3, bad: bad3 };
  }

  /* ---- ⑧ 生成关 flat20-39：dch 独立复算+确定性+域全档成立+specRows/picks 对账 ---- */
  total++;
  {
    let ok8 = true, bad8 = null;
    const dchTally = {};
    for (let flat = 20; flat < 40 && ok8; flat++) {
      const L = genLevel(flat);
      const sf = specFlow(flat);                            // 独立复算（首随机数 dch+抽序+流到 picks 起点）
      if (L.dch !== sf.dch) { ok8 = false; bad8 = 'dch ' + flat; break; }
      if (L.dch < 1 || L.dch > 4) { ok8 = false; bad8 = 'dchDom ' + flat; break; }
      dchTally[L.dch] = (dchTally[L.dch] || 0) + 1;
      const L2 = genLevel(flat);
      if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) { ok8 = false; bad8 = 'det ' + flat; break; }
      if (L.ch !== Math.floor(flat / 5) + 1) { ok8 = false; bad8 = 'ch ' + flat; break; }
      /* 行序+逐题域对账（specFlow 流严格同构引擎：首数耗 dch+抽 5 后逐题 picks） */
      for (let qi = 0; qi < 5; qi++) {
        const q = L.quizzes[qi];
        const exp = specQuiz(sf.rows[qi], sf.rnd);
        if (q.kind !== exp.row.kind || q.layout !== exp.row.layout || q.blank !== exp.row.blank ||
            q.need !== exp.row.need || q.dirAns !== exp.dirAns || q.jam !== exp.jam ||
            structWhy(q, L.dch, qi) ||
            JSON.stringify(q.picks) !== JSON.stringify(exp.picks)) {
          ok8 = false; bad8 = 'quiz ' + flat + '/' + qi; break;
        }
      }
      if (!ok8) break;
    }
    const domOk = Object.keys(dchTally).every(d => d >= 1 && d <= 4);   // 域全档成立型
    const u8 = ok8 && domOk;
    if (u8) npass++;
    units.gen = { ok: u8, bad: bad8, dchTally: dchTally, dom: domOk };
  }

  /* ---- ② 教学三段（看→帮→独，v3 双答两步）：stub 存档后 tutorialWatch 真实走完 ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  window.__grTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__grWatchMs || 1e9) / SPEED;       // watch 段实测（单步演示款 ≤16s）
  const tutHelp = window.__grDemoR === 'meshed' && state.tut === 'help' &&
                window.GR.currentLevel.flat === -1 && window.GR.quiz.layout === 'D_W' &&
                window.GR.quiz.blank === 1 && window.GR.quiz.need === 't10' &&
                window.GR.quiz.phase === 1 && window.GR.quiz.dirAns === 'ccw' &&
                twWatch <= 16000 && tw <= 24000;
  await unlocked();
  const qT = window.GR.quiz;                                // "帮"阶段放手题（turn 单题）
  const rTd = await window.GR.tapDir(qT.dirAns);            // 先答预判 → 'ok'（帮两步分流）
  const qT2 = window.GR.quiz;
  await wait(300);                                           // 钉住演出尾（DIR_OK_MS+140）净过再放齿轮
  const rT = await window.GR.tapGear(qT2.answer);           // 再放对 → 帮→独 → 进正式关
  const tutSolo = rTd === 'ok' && rT === 'done' && window.__grTutSolo === true &&
                window.GR.currentLevel.flat === 0 && window.GR.currentLevel.n === 5;
  const u2 = tutHelp && tutSolo;
  if (u2) npass++;
  units.tutorial = { ok: u2, demoR: window.__grDemoR, tut: state.tut,
                     solo: window.__grTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), dirR: rTd, turnR: rT };
  await unlocked();

  /* ---- ⑤ 错路径（v3 双答两段）：开题锁吞+阶段1 错链/豁免窗/锁+顺序守卫+
     阶段2 错链/首错锁对选放行（b37 R3）+breathe 梯度 ---- */
  total++;
  {
    /* 0 段：开题演出锁（真时钟）内正确预判答也吞 null（不判定不计 miss——感知期不作答） */
    startLevel(0);                       // 开题：题面句（演出锁窗内）
    const q0 = window.GR.quiz;
    const nullTapDir = (await window.GR.tapDir(q0.dirAns)) === null;
    await unlocked();
    const swallowShow = nullTapDir && window.GR.quiz.step === 0 && window.GR.quiz.miss === 0;
    /* C 段（顺序守卫）：phase1 点正确齿轮=吞 null（不泄答案不计 miss——先答预判） */
    const qC = window.GR.quiz;
    const orderGuard = (await window.GR.tapGear(qC.answer)) === null &&
                       window.GR.quiz.miss === 0 && window.GR.quiz.step === 0 &&
                       window.GR.quiz.phase === 1;
    /* A 段（阶段1 错路径）：错→相邻 lit 捕获→错链两段→豁免窗内二错吞→真时钟过窗→
       二错照计 miss=2→正确按钮 breathe→对答 'ok'→放对 meshed */
    startLevel(0);
    await unlocked();
    const qA = window.GR.quiz;
    const wrongDir = qA.dirAns === 'cw' ? 'ccw' : 'cw';      // 独立挑一枚干扰预判
    const prA = window.GR.tapDir(wrongDir);       // 首错（豁免窗起播 5538 真时钟）——不 await 先捕 lit
    let sawLit = false;
    for (let w = 0; w < 300 && !sawLit; w++) {
      const nb = qA.blank - 1;                      // 左邻最近固定轮（0 号驱动轮——flat0 布局 D_W）
      const el = nb >= 0 ? slotElAt(nb) : null;
      if (el && el.classList.contains('lit')) sawLit = true;
      else await wait(5);
    }
    const rA = await prA;
    const chainA = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'gr_dir_wrong' &&  // 阶段1 错链头=dir_wrong clip
                   window.__lastQueue[1] === 'gr_hint' &&       // 语义句=hint「看看旁边的齿轮」
                   window.__lastQueue.every(p => typeof p === 'string') &&   // 全 clip 无 keyless
                   !keylessLast(window.__lastQueue);
    await wait(200);                                           // 出错锁演出尾（尾内 tap=null 语义正确），仍在豁免窗 5538 内
    const rejA = await window.GR.tapDir(wrongDir) === false;   // 豁免窗内二错吞（guard）
    const miss1 = window.GR.quiz.miss === 1 && window.GR.currentLevel.miss === 1;
    await new Promise(w => setTimeout(w, 5750));               // 等豁免窗（真时钟 5538）过
    const rD = await window.GR.tapDir(wrongDir);               // 窗后二错照计
    const breathe2 = dirElAt(qA.dirAns).classList.contains('breathe');   // miss≥2=正确预判按钮 breathe
    const miss2 = rD === 'wrong' && window.GR.quiz.miss === 2;
    await wait(200);                                           // 出 rD 错锁演出尾
    const rOk = await window.GR.tapDir(window.GR.quiz.dirAns); // 对答推进（'ok'——phase→2）
    const phase2 = rOk === 'ok' && window.GR.quiz.phase === 2;
    await wait(300);                                           // 钉住演出尾净过
    const rE = await window.GR.tapGear(window.GR.quiz.answer); // 放对（尺寸阶段）
    /* B 段（阶段2 错路径——重开 flat0 先答对再错）：首错锁 2334 过后、豁免窗 4962 内
       对选放行（b37 R3——锁收窄留活跃段） */
    startLevel(0);
    await unlocked();
    const qB = window.GR.quiz;
    await window.GR.tapDir(qB.dirAns);                         // 先答对（进阶段2）
    await wait(300);                                           // 钉住演出尾净过再错选
    const wB = qB.answer === 0 ? 2 : 1;             // 独立挑一枚干扰齿轮
    const rB = await window.GR.tapGear(wB);                                // 尺寸首错（锁 2334）
    const chainB = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'gr_wrong' &&     // 阶段2 错链头=wrong clip
                   window.__lastQueue[1] === 'gr_hint';
    await wait(200);                                            // 出错锁 +140 演出尾净过，真时钟仍在豁免窗 4962 内
    const rPass = await window.GR.tapGear(window.GR.quiz.answer);   // 窗内对选放行（真时钟仍在 4962 内）
    const stepAfterB = window.GR.currentLevel.step;             // B 段末推进实证（flat0 step 1）
    const u5 = swallowShow && orderGuard && rA === 'wrong' && chainA && sawLit && rejA &&
               miss1 && miss2 && breathe2 && phase2 && rE === 'meshed' &&
               rPass === 'meshed' && chainB && stepAfterB === 1;
    if (u5) npass++;
    units.wrong = { ok: u5, showSwallow: swallowShow, orderGuard: orderGuard,
                    dirFirst: rA, dirChain: chainA, lit: sawLit, rejInWin: rejA,
                    miss1: miss1, miss2: miss2, dirBreathe2: breathe2,
                    dirOk: rOk, phase2: phase2, right: rE, passInWin: rPass,
                    sizeChain: chainB, stepB: stepAfterB };
  }

  /* ---- ④ 契约 M 帧断言（×flat0/7/10/16/20——3槽dir/6槽dir/speed/conflict-jam/生成）
     数值/渲染/演出三层+answerbar 按钮组+--dur 传动比+转向视觉对账（r2 M1） ---- */
  total++;
  {
    const fr = [];
    for (const flat of [0, 7, 10, 16, 20]) {
      startLevel(flat);
      await unlocked();                                       // 开题开放态（阶段1）
      const q = window.GR.quiz;
      const sf4 = specFlow(flat);
      const exp = specQuiz(sf4.rows[0], sf4.rnd);             // 流已耗到题 0 picks 起点
      /* 数值层：kind/槽位真值（转向律独立复算）+blank/picks/answer/dirAns/jam/phase 独立对账 */
      const numOk = q.kind === exp.row.kind && q.layout === exp.row.layout &&
                    q.blank === exp.row.blank && q.need === exp.row.need &&
                    q.dteeth === (exp.row.dteeth || 't12') &&
                    q.dirAns === exp.dirAns && q.jam === exp.jam && q.phase === 1 &&
                    q.picks.length === 3 && JSON.stringify(q.picks) === JSON.stringify(exp.picks) &&
                    q.answer === exp.answer &&
                    q.slots.length === exp.row.layout.length &&
                    q.slots.every((s, i) => s.i === exp.slots[i].k && s.fixed === !!exp.slots[i].gear &&
                                           s.gear === exp.slots[i].gear && s.dir === exp.slots[i].dir &&
                                           s.teeth === exp.slots[i].teeth &&
                                           (s.dir === null ? s.gear === null : true)) &&
                    q.step === 0 && q.miss === 0;
      /* 渲染层：槽位 DOM 计数===slots 长+dataset.k 扁平对账+blank 类型+开口虚框在场+
         固定轮 data-dir===转向律 */
      const els = Array.prototype.map.call(wallEl.querySelectorAll('.slot'), c => c);
      const renderOk = els.length === q.slots.length && wallEl.dataset.n === String(q.slots.length) &&
                       els.every((c, i) => Number(c.dataset.k) === i) &&
                       els.every((c, i) => c.dataset.type === exp.slots[i].type) &&
                       !!els[q.blank].querySelector('.mouth') &&
                       els.every((c, i) => exp.slots[i].dir ? c.dataset.dir === exp.slots[i].dir : !c.dataset.dir);
      /* 预判行渲染层：按钮组按 kind（dir=2/speed=3/conflict=3）+选项集对账 */
      const abtns = Array.prototype.map.call(guessbarEl.querySelectorAll('.guess-btn'), c => c);
      const wantDirs = exp.row.kind === 'dir' ? ['cw', 'ccw'] :
                       (exp.row.kind === 'speed' ? ['small', 'same', 'big'] : ['cw', 'ccw', 'jam']);
      const barOk = guessbarEl.classList.contains('show') && !guessbarEl.classList.contains('done') &&
                    abtns.length === wantDirs.length &&
                    abtns.every((c, i) => c.dataset.guess === wantDirs[i]) &&
                    picksEl.classList.contains('dim');        // 阶段1 齿轮库降透明（顺序引导）
      /* 候选渲染层：3 枚+触摸目标 aria+齿轮 SVG 在场 */
      const picks = Array.prototype.map.call(picksEl.querySelectorAll('.pick'), c => c);
      const picksOk = picks.length === 3 &&
                      picks.every((c, i) => Number(c.dataset.i) === i && !!c.querySelector('g[data-anim="gear"]'));
      /* 演出层：两段放对（tapDir ok→pindir 钉住→tapGear answer）中途轮询抓 DOM
         ——判定槽 .meshed+data-dir+--dur=齿数×70（传动比）+全链 .spin（jam=卡住）+
         转向视觉对账（r2 M1：animationDirection 与 data-dir 一致） */
      const prd = await window.GR.tapDir(q.dirAns);
      const pindOk = prd === 'ok' && window.GR.quiz.phase === 2 &&
                     !picksEl.classList.contains('dim') && guessbarEl.classList.contains('done');
      await wait(300);                           // 钉住演出尾（DIR_OK_MS+140）净过再放齿轮
      const pr = window.GR.tapGear(q.answer);
      let meshOk = false, spinAll = false, jamOk = true, durOk = false, dirVisOk = true;
      for (let w = 0; w < 900; w++) {
        const bs = slotElAt(q.blank);
        if (!meshOk && bs && bs.classList.contains('meshed') &&
            bs.dataset.dir === (q.jam ? 'jam' : specDirAt(q.blank)) &&
            !!bs.querySelector('g[data-anim="gear"]'))
          meshOk = true;
        if (q.jam) {
          if (wallEl.querySelectorAll('.slot.jammed').length === q.slots.length &&
              wallEl.querySelectorAll('.slot.spin').length === 0) jamOk = true;
          else if (wallEl.querySelectorAll('.slot.jammed').length === 0) jamOk = false;
        }
        if (!q.jam && wallEl.querySelectorAll('.slot.spin').length === q.slots.length) spinAll = true;
        /* 传动比断言（speed 题）：D 槽 --dur=dteeth×70 / 空槽 --dur=need×70（齿数正比） */
        if (q.kind === 'speed' && meshOk) {
          const dd = slotElAt(0).style.getPropertyValue('--dur');
          const bd = slotElAt(q.blank).style.getPropertyValue('--dur');
          durOk = dd === (specTeeth[q.dteeth] * 70) + 'ms' && bd === (specTeeth[q.need] * 70) + 'ms';
        } else if (q.kind !== 'speed') durOk = true;
        /* 转向视觉对账（r2 M1）：ccw 槽 computed animationDirection=reverse / cw=normal */
        if (!q.jam && spinAll) {
          dirVisOk = exp.slots.every(e => {
            const rot = slotElAt(e.k) && slotElAt(e.k).querySelector('.rot');
            if (!rot) return false;
            const dir = getComputedStyle(rot).animationDirection;
            const want = (e.type === 'D' || e.type === 'B') ? 'cw'
                       : (e.type === 'blank' ? specDirAt(e.k) : e.dir);
            return want === 'ccw' ? dir.indexOf('reverse') >= 0
                                   : dir.split(',').every(x => x.trim() === 'normal');
          });
        }
        if (meshOk && (q.jam ? jamOk : (spinAll && dirVisOk)) && durOk) break;
        await wait(10);
      }
      const r4 = await pr;
      const animOk = r4 === 'meshed' && meshOk && (q.jam ? jamOk : (spinAll && dirVisOk)) && durOk;
      fr.push({ flat: flat, ok: numOk && renderOk && barOk && picksOk && pindOk && animOk,
                num: numOk, render: renderOk, bar: barOk, picks: picksOk, pin: pindOk, anim: animOk });
    }
    const u4 = fr.every(f => f.ok);
    if (u4) npass++;
    units.frame = { ok: u4, frames: fr };
  }

  /* ---- ⑥ 先验专项 20 题全量（独立推导禁读页面期望+奇偶/冲突/传动比三判据+
     候选去恒等齿数差断言+域封闭） ---- */
  total++;
  {
    let ok6 = true, bad6 = null;
    for (let flat = 0; flat < 20 && ok6; flat++) {
      const rr = specFlow(flat);
      for (let qi = 0; qi < 5; qi++) {
        const row = specTable[rr.rows[qi]];
        const L = genLevel(flat);
        const q = L.quizzes[qi];
        const lay = row.layout, n = lay.length;
        /* SPEC 先验（§3 v3 验算）：布局域封闭+恰 1 空槽+blank 在 '_' 位非两端+
           fixes 恰覆盖 x 位+尾位 W|B 与 kind 匹配 */
        if (lay.charAt(0) !== 'D') { ok6 = false; bad6 = 'dw ' + flat + '/' + qi; break; }
        const tail6 = lay.charAt(n - 1);
        if (row.kind === 'conflict' ? tail6 !== 'B' : tail6 !== 'W') { ok6 = false; bad6 = 'tail ' + flat + '/' + qi; break; }
        if (lay.split('').filter(c => c === '_').length !== 1) { ok6 = false; bad6 = 'blanks'; break; }
        if (lay.charAt(row.blank) !== '_' || row.blank < 1 || row.blank >= n - 1) { ok6 = false; bad6 = 'blankAt'; break; }
        const xs = [];
        for (let i = 0; i < n; i++) if (lay.charAt(i) === 'x') xs.push(i);
        if (JSON.stringify(xs) !== JSON.stringify(Object.keys(row.fixes || {}).map(Number).sort((a, b) => a - b)))
          { ok6 = false; bad6 = 'fixes ' + flat + '/' + qi; break; }
        /* 候选去恒等：picks=need+邻档（互异+含 need 恰 1+|齿数差|∈{2,4}） */
        if (q.picks.length !== 3) { ok6 = false; bad6 = 'picksN'; break; }
        if (q.picks.filter(p => p === row.need).length !== 1 ||
            q.answer !== q.picks.indexOf(row.need)) { ok6 = false; bad6 = 'uniq ' + flat + '/' + qi; break; }
        for (const p of q.picks) {
          if (p === row.need) continue;
          const d = Math.abs(specTeeth[p] - specTeeth[row.need]);
          if (d !== 2 && d !== 4) { ok6 = false; bad6 = 'teethDiff ' + flat + '/' + qi + ' ' + d; break; }
        }
        if (!ok6) break;
        /* 阶段1 真值三判据独立重列（禁调引擎 deriveDirAns/dirAt） */
        if (q.dirAns !== specDirAnsOf(row)) { ok6 = false; bad6 = 'dirAns ' + flat + '/' + qi; break; }
        if (q.jam !== (q.dirAns === 'jam')) { ok6 = false; bad6 = 'jam ' + flat + '/' + qi; break; }
        if (row.kind === 'conflict') {
          /* 冲突律代数等价双验：jam iff n 偶（verify 独立重列——双驱两路奇偶冲突） */
          const jamDirect = (row.blank % 2) !== ((n - 1 - row.blank) % 2);
          if (jamDirect !== (n % 2 === 0) || q.jam !== jamDirect)
            { ok6 = false; bad6 = 'jamAlg ' + flat + '/' + qi; break; }
        }
        /* 转向律全链复算（固定槽——引擎直驱前 dir 真值） */
        for (const s of q.slots) {
          if (s.type === 'blank') continue;
          if (s.type === 'D' || s.type === 'B') { if (s.dir !== 'cw') { ok6 = false; bad6 = 'driveDir'; break; } }
          else if (s.dir !== specDirAt(s.k)) { ok6 = false; bad6 = 'dir ' + flat + '/' + qi + '/' + s.k; break; }
        }
        if (!ok6) break;
        /* 齿数真值对账（D=驱动齿数/fix=表齿数——数齿通道渲染锚） */
        for (const s of q.slots) {
          if (s.type === 'fix' && s.teeth !== specTeeth[row.fixes[s.k]]) { ok6 = false; bad6 = 'fixTeeth'; break; }
          if (s.type === 'D' && s.teeth !== specTeeth[row.dteeth || 't12']) { ok6 = false; bad6 = 'dTeeth'; break; }
        }
        if (!ok6) break;
      }
      if (!ok6) break;
    }
    const u6 = ok6;
    if (u6) npass++;
    units.prior = { ok: u6, bad: bad6 };
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

  /* ---- ⑩ 确认链构成（单 clip 全 clip 无 keyless+窗口数值+题面句独立拼） ---- */
  total++;
  {
    startLevel(10);
    await unlocked();
    const q10 = window.GR.quiz;
    const obsOk = window.__lastVoiceText === SPEC_OBS[3] &&  // 开题题面句（ch3 章档句——T46 clip 化走 play）
                  window.__lastVoiceKey === 'gr_obs_3' &&
                  SPEC_OBS[3].length === 7 && CHAPTERS[3].obsWin === estMs(7) + 300;
    await window.GR.tapDir(q10.dirAns);                     // 先答预判（speed 题）
    await window.GR.tapGear(q10.answer);
    const LQ = window.__lastQueue;
    const chainOk = LQ && LQ.length === 1 &&
                    LQ[0] === 'gr_right' &&                   // 确认链=['gr_right'] 单 clip（SPEC §3）
                    typeof LQ[0] === 'string' &&
                    !keylessLast(LQ);                         // 无 keyless 段（契约 N 天然安全）
    const lenOk = 1100 + 1500 >= 2088 + 300 &&                // 演出窗 2600 ≥ 确认链 2388（家族 G/H）
                  MESH_MS === 1100 && CHAIN_MS === 1500 &&
                  estMs(SPEC_OBS[3].length) + 300 <= CHAPTERS[3].obsWin;   // 家族 T：题面句窗=estMs(7)+300=3315（ch3 七字句）
    const u10 = chainOk && lenOk && obsOk;
    if (u10) npass++;
    units.confirm = { ok: u10, chain: chainOk, win: lenOk, obs: obsOk,
                      queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)),
                      sayText: window.__lastVoiceText };
  }

  /* ---- ⑨ 源码级断言（读自身合并 script 文本——第 3 个 script 块，b36 M1：
     script[2]=纯 data+engine+main 无 verify 字面；script[3]=verify 独立第 4 块） ---- */
  total++;
  {
    const scripts = document.querySelectorAll('script');
    const src = document.querySelectorAll('script')[2].textContent;         // b36 M1：script[2]=纯 data+engine+main
    const coreSrc = document.querySelectorAll('script')[0].textContent;
    const verifyIsolated = scripts.length === 4 &&                          // 4 块布局（core/clips/game/verify）
                          scripts[3].textContent.indexOf('runVerify') >= 0 &&
                          src.indexOf('runVerify') < 0 &&
                          src.indexOf('__grVlog') < 0;                       // script[2] 无 verify 字面（M1①）
    const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
                 src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
    const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
                 src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
                 src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
    const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&          // C：存档版本 1.0（core）
                 coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&   // C：存档键名
                 src.indexOf("KIDS.init({ game: 'gear'") >= 0;   // C：本款存档键 kidsgame_gear
    const srcD = src.indexOf("replayAnim(wallEl, 'bump')") >= 0 &&   // D：吞输入轻叮配容器 bump
                 src.indexOf("replayAnim(sceneEl, 'bump')") >= 0;    // D：阶段1 预判行 bump（v3）
    const srcE = src.indexOf('sv.gear && sv.gear.tutSeen') >= 0;   // E：行为分流先查教学特例
    const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
                 src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
    const srcI = src.indexOf('const WRONG_CHAIN_WIN = 4962') >= 0 &&   // I：尺寸错链豁免窗常量 4962
                 src.indexOf('const DIR_CHAIN_WIN = 5538') >= 0 &&     // I：转向错链豁免窗 5538（v3）
                 src.indexOf('const SPEED_CHAIN_WIN = 5442') >= 0 &&   // I：快慢错链豁免窗 5442（v3）
                 src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
                 src.indexOf('wrongChainUntil = Date.now() + chainWin') >= 0 &&
                 src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
                 src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：救援守卫+重置
                 src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0;   // I 补：guard（阶段2）
    const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0 &&   // J：语义句 10s 节流在场
                 src.indexOf('cur.flat < 3') >= 0;                     // J：flat<3（含教学 -1）每错必播
    const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
                 src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
    const styleSrc = document.querySelectorAll('style')[0].textContent;
    const srcO = styleSrc.indexOf('button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}') >= 0;   // O：自建 button 显式 color
    /* WRONG_CHAIN_WIN 算式对账（SPEC §4：wrong 2184+150+hint 2328+300=4962）
       +首错锁收窄算式（b37 R3：WRONG_LOCK_1=2184+150=2334 ≤ 豁免窗——对选放行活跃段）
       +v3 两链算式（DIR 5538=2760+150+2328+300/锁 2910；SPEED 5442=2664+150+2328+300/锁 2814） */
    const winCalc = WRONG_CHAIN_WIN === 2184 + 150 + 2328 + 300 && WRONG_CHAIN_WIN === 4962 &&
                    WRONG_LOCK_1 === 2184 + 150 && WRONG_LOCK_1 === 2334 && WRONG_LOCK_1 < WRONG_CHAIN_WIN &&
                    DIR_CHAIN_WIN === 2760 + 150 + 2328 + 300 && DIR_CHAIN_WIN === 5538 &&
                    DIR_LOCK_1 === 2760 + 150 && DIR_LOCK_1 === 2910 && DIR_LOCK_1 < DIR_CHAIN_WIN &&
                    SPEED_CHAIN_WIN === 2664 + 150 + 2328 + 300 && SPEED_CHAIN_WIN === 5442 &&
                    SPEED_LOCK_1 === 2664 + 150 && SPEED_LOCK_1 === 2814 && SPEED_LOCK_1 < SPEED_CHAIN_WIN &&
                    src.indexOf('WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED + 140') < 0;   /* b38 R1 总窗：锁禁叠尾窗（2474>2334 越界防回归） */
    /* 转向律字面（§0.93 verify 复算依据：k%2==0?'cw':'ccw' 引擎真源在场）
       +冲突律字面（双驱两路奇偶）+传动比字面（齿少者恒快）+转速周期常量 */
    const dirLit = src.indexOf("k % 2 === 0 ? 'cw' : 'ccw'") >= 0 &&
                   src.indexOf('(k % 2) !== ((n - 1 - k) % 2)') >= 0 &&
                   src.indexOf("=== row.need ? 'same' : 'small'") >= 0 &&
                   src.indexOf('const TOOTH_MS = 70') >= 0 && TOOTH_MS === 70;
    const srcM = src.indexOf('data-anim') >= 0 && src.indexOf('dataset.k') >= 0 &&
                 src.indexOf('dataset.dir') >= 0;   // M：帧内容锚素材（data-k/data-dir）
    const srcN = src.indexOf('window.GR =') >= 0 && src.indexOf('__grDemoR') >= 0;   // N 配套：钩子真实页暴露+教学实证
    /* CHAPTERS/GEN_HINTS/题面句双录 + nextHint 数值断言（4/9/14/19 章末——预告下一章） */
    const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                   CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                   CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                   CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                   GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                   GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                   nextHint(4) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完 flat4）预告 ch2 文案
                   nextHint(9) === SPEC_CHAPTER_HINTS[2] &&        // （预告文案存 CHAPTERS[章].hint——家族 F 形态）
                   nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                   nextHint(19) === SPEC_CHAPTER_HINTS[4] &&
                   CHAPTERS[1].obs === SPEC_OBS[1] && CHAPTERS[2].obs === SPEC_OBS[2] &&
                   CHAPTERS[3].obs === SPEC_OBS[3] && CHAPTERS[4].obs === SPEC_OBS[4] &&
                   CHAPTERS[2].obsWin === estMs(SPEC_OBS[2].length) + 300 &&   // 十字句窗=estMs(10)+300
                   CHAPTERS[3].obsWin === estMs(SPEC_OBS[3].length) + 300;     // 七字句窗=estMs(7)+300=3315（v3）
    /* 生成关 nextHint 实算对账：期望值独立复算 dch（specMul 首随机数——禁读引擎） */
    const genCalc = [24, 29, 34, 39].every(f => {
      const expDch = specFlow(f + 1).dch;
      return nextHint(f) === SPEC_GEN_HINTS[expDch - 1] &&
             nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1] &&
             genLevel(f + 1).dch === expDch;
    });
    const u9 = verifyIsolated && srcA && srcB && srcC && srcD && srcE && srcF && srcI &&
               srcJ && srcK && srcM && srcN && srcO && winCalc && dirLit && hintOk && genCalc;
    if (u9) npass++;
    units.contract = { ok: u9, layout: verifyIsolated, A: srcA, B: srcB, C: srcC, D: srcD,
                       E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK, M: srcM,
                       N: srcN, O: srcO, winCalc: winCalc, dirLit: dirLit,
                       hints: hintOk, genCalc: genCalc };
  }

  /* ---- ① 结构：simView 双 viewport+槽位/候选/预判按钮触摸目标+对比度+横溢 /
     clips 注入+实长辨别 ---- */
  function lum(hexStr) {
    const m = hexStr.match(/#?([0-9a-f]{6})/i);
    if (!m) return null;
    const n = [1, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255)
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
        const q = window.GR.quiz;
        const els = Array.prototype.map.call(wallEl.querySelectorAll('.slot'), b => ({ w: b.offsetWidth, h: b.offsetHeight }));
        const pks = Array.prototype.map.call(picksEl.querySelectorAll('.pick'), b => ({ w: b.offsetWidth, h: b.offsetHeight }));
        const abs = Array.prototype.map.call(guessbarEl.querySelectorAll('.guess-btn'), b => ({ w: b.offsetWidth, h: b.offsetHeight }));
        const hitOk = els.length === q.slots.length && els.every(b => b.w >= 96 && b.h >= 96) &&   // 槽位=主触达
                      pks.length === 3 && pks.every(b => b.w >= 96 && b.h >= 96) &&                // 候选=判定触达
                      abs.length >= 2 && abs.every(b => b.w >= 56 && b.h >= 56);                   // 预判按钮=阶段1 触达
        const cB = ratioOf(cssToHex(getComputedStyle(wallEl.querySelector('.slot')).borderTopColor), '#EFE2C3') >= 3 &&
                   ratioOf(cssToHex(getComputedStyle(wallEl.querySelector('.slot')).borderTopColor), '#FBF6EC') >= 3;
        const de = document.documentElement;
        const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
        return { vp: w + 'x' + h, flat: g._simFlat, n: q.slots.length, hitOk: hitOk,
                 contrast: cB, ox: ox, pass: hitOk && cB && ox <= 0 };
      });
    }
    const sims = [];
    for (const flat of [0, 7]) {                 // 3 槽 + 6 槽（v3 长链收窄适配）
      $id('game')._simFlat = flat;
      sims.push(await simView(1280, 800));
      sims.push(await simView(800, 1180));
    }
    const g0 = $id('game');
    g0.style.width = '';
    g0.style.height = '';
    startLevel(0);                                            // 还原真实 viewport 布局
    await unlocked();
    /* clips：gr_ 7 条（v3）+ core 3 条全注入 + duration 辨别器（±60ms） */
    const keys = Object.keys(KIDS.voice.clips);
    const grKeys = Object.keys(SPEC_DUR);
    const needAll = grKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
    const preOk = keys.length === 14 &&
                  needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
    const durs = await Promise.all(grKeys.map(k => new Promise(res => {
      let done = false;
      const a = new Audio(KIDS.voice.clips[k]);
      const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
      a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
      a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
    })));
    const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[grKeys[i]]) <= 60);
    const u1 = preOk && durOk && sims.every(s => s.pass);
    if (u1) npass++;
    units.struct = { ok: u1, clips: preOk, durs: durs, sims: sims };
  }

  /* ---- ⑪ save：真实写档链（init gear→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__grOrig.save, origPersist = window.__grOrig.persist;
  const origLS = localStorage.getItem('kidsgame_gear');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_gear');
    KIDS.init({ game: 'gear', title: '齿轮转起来' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.GR.autoSolve();     // 真实判定链通关（两段×5 题）→ winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_gear');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 10 && j && j.v === '1.0' && j.game === 'gear' &&
                j.levels && j.levels['1-0'] && j.levels['1-0'].stars === 3);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_gear');
  else localStorage.setItem('kidsgame_gear', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → GR.start(0) 非教学直达题面（契约 E 分流；
     审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  {
    const today = new Date();
    const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const pre = { v: '1.0', game: 'gear', firstDay: tstr, lastDay: tstr, levels: {},
                  dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                  restTip: { day: '', shown: 0 }, gear: { tutSeen: true } };
    let q12 = null, realOk = false;
    try {
      localStorage.setItem('kidsgame_gear', JSON.stringify(pre));
      KIDS.store.load();                             // 重读预置档
      window.__grDemoR = null;                       // 教学实证清零（非教学路径不应重设）
      window.GR.start(0);
      await unlocked();
      q12 = window.GR.quiz;
      const sf12 = specFlow(0);
      const exp12 = specQuiz(sf12.rows[0], sf12.rnd);
      realOk = state.tut === 'none' && window.__grDemoR === null &&
               q12 && q12.kind === 'dir' && q12.layout === exp12.row.layout && q12.blank === exp12.row.blank &&
               q12.dirAns === exp12.dirAns && q12.answer === exp12.answer && q12.picks.length === 3 &&
               q12.phase === 1 && q12.step === 0 && q12.miss === 0 &&
               window.GR.currentLevel.flat === 0 && window.GR.currentLevel.n === 5 &&
               window.GR.currentLevel.dch === 1 &&
               typeof window.GR.tapDir === 'function' &&   // v3 阶段1 钩子（b29 坑⑥）
               typeof window.GR.tapGear === 'function' &&  // b29 坑⑥：真实页钩子暴露
               (KIDS._save() || {}).v === '1.0';
    } finally {
      /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
      if (origLS === null) localStorage.removeItem('kidsgame_gear');
      else localStorage.setItem('kidsgame_gear', origLS);
      KIDS._save = function () { return { levels: {} }; };
      KIDS.store.persist = function () {};
    }
    if (realOk) npass++;
    units.realPath = { ok: realOk, tut: state.tut, quiz: q12 && { layout: q12.layout, blank: q12.blank } };
  }

  const out = { game: 'gear', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__grVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass) + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）并留播报历史
     （__voiceHist）；voice.say 记录 keyless 题面句（__lastSayText——T46 题面句 clip 化
     后题面锚=play 的 __lastVoiceKey/__lastVoiceText）；
     voice.queue 记录拼播链（__lastQueue） */
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
