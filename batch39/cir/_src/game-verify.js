/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元（r4 双答制）
   ① 结构：双 viewport simView（1280×800/800×1180）×（flat0 twogap/flat15 SR/flat16 PR
     并联板）：槽位 g DOM 计数===slots 长+候选 ≥96×96 触摸目标+预判按钮 ≥96×60+
     底栏按钮 ≥72、导线主线对比度 ≥3:1、overflowX ≤0；clips cir_ 7+core 3 全注入+
     duration 辨别器（§3 r4 实长表 ±60ms）
   ② 教学三段（看→帮→独，r4 双答演示）：tutorialWatch() 真实走完（stub 存档）→
     __cirDemoPredR==='ok'（先猜步）且 __cirDemoR==='lit'（再连步，题 0 非末题）且
     tut='help'；turn 题双答放对 → __cirTutSolo 且进正式关（flat=0），watch 折算
     真实时长 ≤16s（双答演示款口径）
   ③ 逐关驱动 flat0-19：确定性 / 章映射（ch=flat/5+1、dch 静态 (ch-1)%4+1）/
     SPEC 20 题表独立复算（specTable 双录+章池 rotate (lv+k)%5+specQuiz seeded
     打散复算——禁读引擎期望）/ 引擎直驱（逐题先 engTapPred 真值→'ok' 再放
     answer→lit/末题 done→全关 3★+回路律终点复算=全槽 on true+F3 short 清位）
   ④ 契约 M 帧断言（渲染即引擎，×flat0/5/10/15/16 五板型各一层）：数值层全字段
     （kind/phase/blank/blankAt/need/picks/answer/deadIdx/second/branch/short/
     litAns/brightAns）独立推导；渲染层槽位 g DOM+dataset.k/类型+支路 data-bridge+
     开关/跨接线/断口毛边/结点数/灯泡数/环流路径数/预判行按钮数（2|3）+阶段 dim；
     演出层预判钉 chip+放对后 .closed+dataset.part+wirepiece+灯泡 .on（SR=.on.dim
     弱光×2 / PR 全亮）+环流 .flowing+兔子槽 .closed+F3 .jumper.gone+ch3 开关 .closed
   ⑤ 错路径：开题演出锁内预判/元件点选吞 null+顺序守卫（阶段1 未答点元件=null）+
     预判错链 [cir_pred_wrong,cir_hint]+主路流光 .trace 在场+豁免窗（真时钟 5490）
     内二错吞 false+首错锁 3222 过后窗内对答放行 'ok'+窗后二错照计 miss=2+
     亮度错链 [cir_bright_wrong,cir_hint]+元件错链 [cir_wrong,cir_hint]+死支路干扰
     （deadIdx）错选 'wrong'+悬停预览虚影非判定
   ⑥ 先验专项 20 题全量（独立推导禁读页面期望）：布局域封闭（记法串字符数=槽数
     4|5+字符域 B/L/?）+second 规则（main：i≠blank 且 size≠need）+decoy⟺second
     dead（picks 恰两根同尺寸=need+一 dead 徽记）+四题型真值律 specPredAns 独立
     复算（'up' 恒非真值）+F3 拆线卡唯一+闭合后 on 全 true（回路律独立复算）
   ⑦ 星级口径：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ 生成关 flat20-39：dch 独立复算（specMul 副本首随机数）+确定性+域全档成立
     （dch 1-4 档行池封闭+specRows 抽序复算）+specQuiz 逐题对账
   ⑨ 源码级：读合并 script 第 3 块（b36 M1：script[2]=纯 data+engine+main，
     script[3]=verify 独立第 4 块）——契约 A/B/C/D/E/F/I/J/K/M/N/O 字面逐条检索+
     三链豁免窗算式（4266=1848+150+1968+300/5490=3072+150+1968+300/4962=
     2544+150+1968+300）+三首错锁算式（1998/3222/2694=clip+150 总窗口径禁叠
     尾窗负向断言）+LIT_MS+FLOW_MS≥2268+回路律落位字面+predAnsOf 真值律字面+
     双答顺序守卫字面+CHAPTERS/GEN_HINTS/题面句双录+nextHint 4/9/14/19 数值
     断言+24/29/34/39 生成关 nextHint 实算
   ⑩ 确认链构成：__lastQueue===['cir_right']（单 clip 全 clip 无 keyless——契约
     N）+演出窗 1400+1600=3000 ≥ 1968+300=2268（家族 G/H）+题面句 __lastVoiceText
     ===章档句（SPEC_OBS 独立录）+F3 拆线窗 2600 ≥ 2268
   ⑪ 写档：origLS 保护——还原真函数→init cir→autoSolve 通关（taps=10=题数×2
     双答）→localStorage kidsgame_cir v:'1.0' levels['1-0'] 更新；测后恢复原
     localStorage
   ⑫ 真实路径：fresh 预置存档（v1.0+tutSeen）→ CIR.start(0) 非教学直达题面+
     window.CIR 暴露（b29 坑⑥）；try/finally 保异常时 origLS 也恢复（b36 m4）
   两读法分叉点断言（r4 新语义钉死，散在 ④/⑤）：SW1(支路开关跨灯)合上后灯暗
   vs SW2(跨线段)合上后灯亮——同一「合开关」动作按 litAns 分叉（darkHold≥100ms
   采样）；twogap-A(两缺口主环)接一根后灯仍暗 ≥90ms（兔子补齐 950ms 档）再亮；
   bright-SR=.on.dim×2 vs PR=.on 全亮；fault-F1 合开关灯保持暗=F2 立亮（reveal
   三态）——渲染锚与判据锚同源于 specPredAns。
   结果写 #verify-result + window.__cirVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  window.__cirOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH39 §3 r4 独立重列（禁抄页面 SPEC_TABLE/VOICE/CHAPTERS/常量） */
  /* SPEC 20 题全表双录（r4 字段：kind/blank 主环判定槽/blankAt/need 唯一正确跨距
     （F3=null）/second 第二缺口（main=兔子补主环另一位 / dead=死支路缺口=同尺寸
     干扰源）/branch 死支路（bridge='lamp'跨灯|'seg'跨线段，sw=支路带开关）/short
     跨接线短路灯/sw 主路开关） */
  const specTable = [
    { kind: 'twogap', blank: 1, need: 'M', second: { at: 'main', i: 3, size: 'L' } },
    { kind: 'twogap', blank: 2, need: 'L', second: { at: 'main', i: 0, size: 'S' } },
    { kind: 'twogap', blank: 0, need: 'S', second: { at: 'dead', size: 'S' } },
    { kind: 'twogap', blank: 3, need: 'M', second: { at: 'main', i: 1, size: 'S' } },
    { kind: 'twogap', blank: 2, need: 'M', second: { at: 'dead', size: 'M' } },
    { kind: 'fault', blank: 1, need: 'M', second: { at: 'dead', size: 'M' }, sw: true },
    { kind: 'fault', blankAt: 'dead', need: 'L', sw: true },
    { kind: 'fault', blank: 3, need: 'S', second: { at: 'dead', size: 'S' }, sw: true },
    { kind: 'fault', short: true, need: null, sw: true },
    { kind: 'fault', blankAt: 'dead', need: 'M', sw: true },
    { kind: 'switch', blank: 2, need: 'M', branch: { bridge: 'lamp', sw: true } },
    { kind: 'switch', blank: 0, need: 'S', branch: { bridge: 'seg', sw: true } },
    { kind: 'switch', blank: 1, need: 'L', branch: { bridge: 'lamp', sw: true } },
    { kind: 'switch', blank: 3, need: 'M', branch: { bridge: 'seg', sw: true } },
    { kind: 'switch', blank: 2, need: 'S', sw: true },
    { kind: 'bright', blank: 1, need: 'M' },
    { kind: 'bright', blank: 0, need: 'M', branch: { bridge: 'lamp' } },
    { kind: 'bright', blank: 3, need: 'L' },
    { kind: 'bright', blank: 0, need: 'L', branch: { bridge: 'lamp' } },
    { kind: 'bright', blank: 0, need: 'S' }
  ];
  const SPEC_DUR = { cir_tut_watch: 2856, cir_tut_turn: 1824,
                     cir_hint: 1968, cir_right: 1968, cir_wrong: 1848,
                     cir_pred_wrong: 3072, cir_bright_wrong: 2544,
                     cir_obs_1: 2880, cir_obs_2: 2856, cir_obs_3: 3288, cir_obs_4: 3072 };   // §3 r4 实长表+T46 观察句 4 键
  const SPEC_CHAPTER_HINTS = { 1: '断口还是短路，找一找', 2: '开关在哪条路上',
                               3: '两盏灯会更亮吗', 4: '新一轮修电路开始' };
  const SPEC_GEN_HINTS = ['两处断口，接好就亮', '断路短路，先找一找',
                          '开关在哪条路上', '两盏灯有多亮'];
  const SPEC_OBS = { 1: '接好这一根，灯会亮吗', 2: '闭合开关，灯会亮吗',
                     3: '修好闭合开关，灯会亮吗', 4: '两盏灯会比一盏更亮吗' };   // 题面句表（r4 定版）
  const SPEC_SPAN = { S: 56, M: 84, L: 112 };     // 跨距档独立录（唯一匹配几何锚）
  const SPEC_PRED_KINDS = { twogap: ['lit', 'dark'], fault: ['lit', 'dark'],
                            switch: ['lit', 'dark'], bright: ['up', 'same', 'down'] };
  const vEstMs = n => n * 345 + 600;              // b25 定版：SAPI ~345ms/字 + 600 落定余量
  /* 四题型真值律独立副本（SPEC §3 r4——禁调引擎 predAnsOf，两读法分叉判据锚；
     blankAt 归一化口径与引擎 buildQuiz 一致：raw F1/F3 行无 blankAt 字段=主路） */
  const specPredAns = row => {
    const blankAt = row.blankAt === 'dead' ? 'dead' : 'main';
    if (row.kind === 'bright') return row.branch ? 'same' : 'down';
    if (row.kind === 'twogap') return (row.second && row.second.at === 'main') ? 'dark' : 'lit';
    if (row.kind === 'fault') return (!row.short && blankAt !== 'main') ? 'lit' : 'dark';
    return !(row.branch && row.branch.bridge === 'lamp' && row.branch.sw) ? 'lit' : 'dark';
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

  /* 关题行序独立复算（SPEC §0.96/§3 r4：静态关章池 rotate (lv+k)%5；生成关 dch=
     mulberry32(flat*7919+877) 首随机数+档池 seeded 无放回抽 5——先取数保确定性）
     返回流状态 rnd：已消耗到**题 0 picks 构造起点**（与引擎 genLevel 严格同构） */
  const specFlow = flat => {
    const rnd = specMul(flat * 7919 + 877);
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
  /* 单题期望独立推导（行→槽位真值+候选构造+answer/deadIdx；从 SPEC 表复算——
     固定槽 part='M'/blank+bunny 槽 part=null/初始全 on=false 回路律终点前态） */
  const specQuiz = (rowIdx, rnd) => {
    const row = specTable[rowIdx];
    const layout = row.kind === 'bright' ? (row.branch ? 'B??L?' : 'B??L') : 'B??L';
    const isCut = row.kind === 'fault' && row.short;
    const blankAt = row.blankAt === 'dead' ? 'dead' : 'main';
    const deadSlot = layout.length;
    const blank = isCut ? -1 : (blankAt === 'dead' ? deadSlot : row.blank);
    const hasDeadGap = blankAt === 'dead' || (row.second && row.second.at === 'dead');
    const bunny = row.second ? (row.second.at === 'main' ? row.second.i : deadSlot) : -1;
    const slots = [];
    for (let k = 0; k < layout.length; k++) {
      slots.push({ k: k, type: k === blank ? 'blank' : (k === bunny ? 'bunny' : 'fix'),
                   part: (k === blank || k === bunny) ? null : 'M', on: false });
    }
    if (hasDeadGap) slots.push({ k: deadSlot, type: deadSlot === blank ? 'blank' : 'bunny',
                                 part: null, on: false });
    /* 候选构造独立镜像（r4：F3 拆线卡 / decoy 同尺寸死支路 / 经典三异档——
       rnd 消耗序与引擎严格同构：need==='M' 时 decoy 邻档多耗一次 rnd()） */
    let picks, answer, deadIdx = -1;
    if (isCut) {
      picks = specShuffle([{ t: 'cut', size: null }, { t: 'wire', size: 'M' }, { t: 'wire', size: 'L' }], rnd);
      answer = picks.findIndex(p => p.t === 'cut');
    } else if (row.second && row.second.at === 'dead') {
      const adj = row.need === 'M' ? (rnd() < 0.5 ? 'S' : 'L') : 'M';
      picks = specShuffle([{ t: 'wire', size: row.need }, { t: 'wire', size: row.need, dead: true },
                           { t: 'wire', size: adj }], rnd);
      deadIdx = picks.findIndex(p => p.dead);
      answer = picks.findIndex(p => p.t === 'wire' && p.size === row.need && !p.dead);
    } else {
      const others = ['S', 'M', 'L'].filter(s => s !== row.need);
      picks = specShuffle([{ t: 'wire', size: row.need }, { t: 'wire', size: others[0] },
                           { t: 'wire', size: others[1] }], rnd);
      answer = picks.findIndex(p => p.size === row.need);
    }
    const predAns = specPredAns(row);
    return { row: row, layout: layout, blank: blank, blankAt: blankAt, slots: slots,
             picks: picks, answer: answer, deadIdx: deadIdx, predAns: predAns,
             bunny: bunny };
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：本款确认链 ['cir_right'] 单 clip
     无 keyless（天然安全）；题面句走 voice.say 非队列链（承 b36/b37/b38 明示） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);
  const slotElAt = k => boardEl.querySelector('.slotg[data-k="' + k + '"]');
  const pickElAt = i => picksEl.querySelector('.pick[data-i="' + i + '"]');
  const lampCount = q => q.kind === 'bright' ? 2 : 1;                       // sgl 单灯 / sr2·tw 双灯
  const flowCount = q => q.kind === 'bright' && q.branch ? 2 : 1;           // PR 双环流 / 他单环流（独立推导）
  const unlocked = async () => {                  // 等开题/演出/错反馈锁窗结束（verify 提速后）
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= state.showUntil;
  };

  /* ---- ③ 逐关驱动 flat0-19：确定性+章映射+SPEC 表独立复算+引擎直驱+回路律 ---- */
  total++;
  {
    let ok3 = true, bad3 = null;
    for (let flat = 0; flat < 20 && ok3; flat++) {
      const L1 = genLevel(flat), L2 = genLevel(flat);
      if (JSON.stringify(L1.quizzes) !== JSON.stringify(L2.quizzes)) { ok3 = false; bad3 = 'det ' + flat; break; }
      const expCh = Math.floor(flat / 5) + 1, expDch = Math.floor(flat / 5) % 4 + 1;
      if (L1.ch !== expCh || L1.dch !== expDch || L1.quizzes.length !== 5) { ok3 = false; bad3 = 'ch ' + flat; break; }
      /* SPEC 表独立复算：行序 rotate+逐题全字段真值+候选构造+answer/deadIdx（specFlow 从零复算） */
      const sf = specFlow(flat);
      for (let qi = 0; qi < 5; qi++) {
        const q = L1.quizzes[qi];
        const exp = specQuiz(sf.rows[qi], sf.rnd);
        if (q.kind !== exp.row.kind || q.layout !== exp.layout || q.blank !== exp.blank ||
            q.blankAt !== exp.blankAt || q.need !== exp.row.need ||
            q.predAns !== exp.predAns || q.litAns !== (q.kind === 'bright' ? null : exp.predAns === 'lit') ||
            q.brightAns !== (q.kind === 'bright' ? exp.predAns : null) ||
            q.deadIdx !== exp.deadIdx || q.answer !== exp.answer ||
            JSON.stringify(q.picks) !== JSON.stringify(exp.picks) ||
            (q.second ? (q.second.at !== exp.row.second.at || q.second.size !== exp.row.second.size ||
             q.second.i !== exp.bunny) : !!(exp.row.second)) ||
            (q.branch ? (q.branch.bridge !== exp.row.branch.bridge || q.branch.sw !== !!exp.row.branch.sw) : !!(exp.row.branch)) ||
            q.short !== !!exp.row.short || q.sw !== !!exp.row.sw || structWhy(q, L1.dch, qi)) {
          ok3 = false; bad3 = 'quiz ' + flat + '/' + qi; break;
        }
        for (let si = 0; si < exp.slots.length; si++) {          // 槽位真值（type/part/on 独立复算）
          const s = q.slots[si], e = exp.slots[si];
          if (s.k !== e.k || s.type !== e.type || s.part !== e.part || s.on !== false) {
            ok3 = false; bad3 = 'slot ' + flat + '/' + qi + '/' + si; break;
          }
        }
        if (!ok3) break;
      }
      if (!ok3) break;
      /* 引擎直驱：逐题先答预判（真值）→ 'ok' 再放正确候选 → lit / 末题 done；全关零错=3 星 */
      const L3 = genLevel(flat);
      let driveOk = true;
      for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
        const q = L3.quizzes[L3.step];
        if (engTapPart(L3, correctPick(q)) !== null) { driveOk = false; break; }   // 顺序守卫：阶段1 未答点元件=null
        if (engTapPred(L3, q.predAns) !== 'ok' || q.phase !== 2 || !q._predOk) { driveOk = false; break; }
        const expR = k === L3.quizzes.length - 1 ? 'done' : 'lit';
        const r = engTapPart(L3, correctPick(q));
        if (r !== expR || q._miss !== 0 || !q._answered) { driveOk = false; break; }
        /* 放对后回路律终点复算：blank/bunny part 落位+全槽 on=true；F3=short 清位 */
        if (q.kind === 'fault' && q.need === null) {
          if (q.short !== false) { driveOk = false; break; }
        } else if (q.slots[q.blank].part !== q.need) { driveOk = false; break; }
        if (q.second && q.slots[q.second.i].part !== q.second.size) { driveOk = false; break; }
        if (!q.slots.every(s => s.on === true)) { driveOk = false; break; }
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
        if (q.kind !== exp.row.kind || q.blank !== exp.blank || q.blankAt !== exp.blankAt ||
            q.need !== exp.row.need || q.deadIdx !== exp.deadIdx || q.answer !== exp.answer ||
            q.predAns !== exp.predAns || structWhy(q, L.dch, qi) ||
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

  /* ---- ② 教学三段（看→帮→独，r4 双答演示）：stub 存档后 tutorialWatch 真实走完 ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  window.__cirTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__cirWatchMs || 1e9) / SPEED;      // watch 段实测（双答演示款 ≤16s）
  const tutHelp = window.__cirDemoPredR === 'ok' && window.__cirDemoR === 'lit' &&
                state.tut === 'help' &&
                window.CIR.currentLevel.flat === -1 && window.CIR.quiz.slots.length === 4 &&
                window.CIR.quiz.blank === 1 && window.CIR.quiz.kind === 'twogap' &&
                window.CIR.quiz.need === 'M' && window.CIR.quiz.litAns === false &&
                twWatch <= 16000 && tw <= 24000;
  await unlocked();
  const qT = window.CIR.quiz;                                // "帮"阶段放手题（turn 单题=行 0）
  const expT = specPredAns(specTable[0]);                    // twogap-A（second main）→ 'dark'
  const predT = await window.CIR.tapPart(qT.answer);         // 顺序守卫：先点元件=null
  const guardT = predT === null;
  const rTp = await window.CIR.tapPred(expT);                // 先猜步答对 → 'ok'（phase=2）
  await unlocked();                                          // 过 PRED_OK 钉住窗尾（+140 演出尾）
  const rT = await window.CIR.tapPart(qT.answer);            // 再连步放对 → 'done' → 帮→独 → 进正式关
  const tutSolo = guardT && rTp === 'ok' && rT === 'done' && window.__cirTutSolo === true &&
                window.CIR.currentLevel.flat === 0 && window.CIR.currentLevel.n === 5;
  const u2 = tutHelp && tutSolo;
  if (u2) npass++;
  units.tutorial = { ok: u2, demoPredR: window.__cirDemoPredR, demoR: window.__cirDemoR,
                     tut: state.tut, solo: window.__cirTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), guard: guardT, predR: rTp, turnR: rT };

  /* ---- ⑤ 错路径：开题演出锁吞 null+顺序守卫+三型错链+豁免窗三语义+
     首错锁后对答放行（b37 R3）+breathe 梯度+死支路干扰错选+悬停预览虚影非判定 ---- */
  total++;
  {
    /* 0 段：开题演出锁（真时钟）内预判点选也吞 null（不判定不计 miss——感知期不作答） */
    startLevel(0);
    const q0 = window.CIR.quiz;
    const nullPred = (await window.CIR.tapPred(specPredAns(specTable[0]))) === null;
    const nullPart = (await window.CIR.tapPart(q0.answer)) === null;
    await unlocked();
    const swallowShow = nullPred && nullPart && window.CIR.quiz.step === 0 && window.CIR.quiz.miss === 0;
    /* A 段（flat0 ch1 twogap-A）：顺序守卫+预判错→主路流光→豁免窗内二错吞→真时钟过窗→
       二错照计 miss=2→breathe→（B 段验窗内对答放行） */
    startLevel(0);
    await unlocked();
    const qA = window.CIR.quiz;
    const guardA = (await window.CIR.tapPart(qA.answer)) === null;   // 阶段1 未答点元件=null（顺序守卫）
    const wrongPred = qA.predAns === 'lit' ? 'dark' : 'lit';   // 独立挑干扰预判（flat0 q0 真值 dark）
    const prA = window.CIR.tapPred(wrongPred);       // 首错（豁免窗起播 5490 真时钟）——不 await 先捕 trace
    let sawTrace = false;
    for (let w = 0; w < 300 && !sawTrace; w++) {
      if (boardEl.querySelector('.trace')) sawTrace = true;    // 主路流光在场（拓扑方向级）
      else await wait(5);
    }
    const rA = await prA;
    const chainA = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'cir_pred_wrong' &&   // 预判错链头=专用 clip
                   window.__lastQueue[1] === 'cir_hint' &&         // 语义句=hint「看看哪里断了」
                   window.__lastQueue.every(p => typeof p === 'string') &&   // 全 clip 无 keyless
                   !keylessLast(window.__lastQueue);
    const rejA = await window.CIR.tapPred(wrongPred) === false;   // 豁免窗内二错吞（guard）
    const miss1 = window.CIR.quiz.miss === 1 && window.CIR.currentLevel.miss === 1;
    await new Promise(w => setTimeout(w, 5700));               // 等豁免窗（真时钟 5490）过
    const rD = await window.CIR.tapPred(wrongPred);             // 窗后二错照计
    const breathe2 = !!(predBtnAt(window.CIR.quiz.predAns) &&
                       predBtnAt(window.CIR.quiz.predAns).classList.contains('breathe'));   // miss≥2=正确预判按钮 breathe
    const miss2 = rD === 'wrong' && window.CIR.quiz.miss === 2;
    /* B 段（重开 flat0）：首错锁 3222 过后、豁免窗 5490 内对答放行（b37 R3——锁收窄留活跃段） */
    startLevel(0);
    await unlocked();
    const wB = window.CIR.quiz.predAns === 'lit' ? 'dark' : 'lit';
    await window.CIR.tapPred(wB);                                // 首错（错反馈窗完成=提速锁已过）
    const rPass = await window.CIR.tapPred(window.CIR.quiz.predAns);   // 窗内对答放行（锁后活跃段）
    const stepAfterB = window.CIR.quiz.step;                     // 放行后仍在题 0（元件未放）
    const phaseB = window.CIR.quiz.phase === 2;
    /* C 段（重开 flat0——排除 B 段豁免窗干扰：干净双答推进到题 2=B 变体干扰位）
       题序 ①A→②A→③B：预判对→选 deadIdx 干扰='wrong'+元件错链→对选推进 */
    startLevel(0);
    await unlocked();
    let gC = 0;
    while (window.CIR.quiz && window.CIR.quiz.step < 2 && gC++ < 20) {
      await unlocked();
      const qq = window.CIR.quiz;
      if (qq.phase === 1) await window.CIR.tapPred(qq.predAns);
      await unlocked();
      await window.CIR.tapPart(window.CIR.quiz.answer);
    }
    await unlocked();
    const qC = window.CIR.quiz;
    const decoyOk = !!qC && qC.step === 2 && qC.deadIdx >= 0 &&
                    qC.picks[qC.deadIdx].size === qC.need && qC.picks[qC.deadIdx].dead === true;
    await window.CIR.tapPred(qC.predAns);
    await unlocked();                                           // 过 PRED_OK 钉住窗尾（+140）
    const rejDead = await window.CIR.tapPart(qC.deadIdx);        // 死支路干扰错选（同尺寸视觉失效）
    const deadWrong = rejDead === 'wrong' && window.CIR.quiz.miss === 1;
    await wait(300);                                             // 出首错锁（1998×SPEED≈240）演出尾
    const chainD = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'cir_wrong' &&      // 元件错链头
                   window.__lastQueue[1] === 'cir_hint';
    const rE = await window.CIR.tapPart(window.CIR.quiz.answer); // 对选推进（窗内对选放行）
    /* D 段（flat15 ch4 bright-SR）：亮度错链 [cir_bright_wrong, cir_hint]+'up' 干扰项 */
    startLevel(15);
    await unlocked();
    const upWrong = await window.CIR.tapPred('up');              // 'up'=误解干扰项恒非真值
    const chainBr = window.__lastQueue && window.__lastQueue.length === 2 &&
                    window.__lastQueue[0] === 'cir_bright_wrong' &&
                    window.__lastQueue[1] === 'cir_hint';
    /* E 段：悬停预览虚影非判定（演出层不判定：hover 仅显 ghostwire 虚影） */
    startLevel(0);
    await unlocked();
    const qE = window.CIR.quiz;
    await window.CIR.tapPred(qE.predAns);                        // 进阶段2（缺口预览通道开）
    await wait(700);                                             // 过钉住窗（500+140 提速 ≈200）
    const pE = pickElAt(qE.answer === 0 ? 1 : 0);                // 悬停一枚干扰（预览档=干扰跨距）
    pE.dispatchEvent(new Event('pointerover', { bubbles: true }));
    const gsE = slotElAt(qE.blank);
    const pvOn = !!gsE && gsE.getAttribute('data-pv') === pE.dataset.size;   // 虚影显形（档=悬停线）
    pE.dispatchEvent(new Event('pointerout', { bubbles: true }));
    const pvOff = !!gsE && !gsE.hasAttribute('data-pv');          // 指针出=虚影撤
    const guessNonJudge = pvOn && pvOff &&
                          window.CIR.quiz.miss === 0 && window.CIR.quiz.step === 0 &&
                          window.CIR.quiz.answer === qE.answer;   // miss/answer/step 全不变
    const u5 = swallowShow && guardA && rA === 'wrong' && chainA && sawTrace && rejA && miss1 && miss2 &&
               breathe2 && rPass === 'ok' && stepAfterB === 0 && phaseB &&
               decoyOk && deadWrong && chainD && rE === 'lit' &&
               upWrong === 'wrong' && chainBr && guessNonJudge;
    if (u5) npass++;
    units.wrong = { ok: u5, showSwallow: swallowShow, guard: guardA, first: rA, chain: chainA,
                    trace: sawTrace, rejInWin: rejA, miss1: miss1, miss2: miss2, breathe2: breathe2,
                    passInWin: rPass, phaseB: phaseB, decoy: decoyOk, deadWrong: deadWrong,
                    deadChain: chainD, right: rE, upWrong: upWrong, brightChain: chainBr,
                    guessNonJudge: guessNonJudge };
  }

  /* ---- ④ 契约 M 帧断言（×flat0/5/10/15/16 五板型——数值/渲染/演出三层+两读法分叉点）
     flat0=twogap-A(sgl) / flat5=fault-F1(sgl+开关) / flat6=fault-F2(sgl+开关，立亮态——r4 审查
     M-3 补) / flat10=switch-SW1(sgl+支路) /
     flat15=bright-SR(sr2 串联弱光) / flat16=bright-PR(tw 并联双环流) ---- */
  total++;
  {
    const fr = [];
    for (const flat of [0, 5, 6, 10, 15, 16]) {
      startLevel(flat);
      await unlocked();                                       // 开题开放态（阶段1）
      const q = window.CIR.quiz;
      const sf4 = specFlow(flat);
      const exp = specQuiz(sf4.rows[0], sf4.rnd);             // 流已耗到题 0 picks 起点（specFlow 同构）
      /* 数值层：全字段独立复算（hook picks 含 dead 布尔拷贝——逐字段比对非 JSON） */
      const numOk = q.kind === exp.row.kind && q.blank === exp.blank && q.blankAt === exp.blankAt &&
                    q.need === exp.row.need && q.predAns === exp.predAns &&
                    q.litAns === (exp.row.kind === 'bright' ? null : exp.predAns === 'lit') &&
                    q.brightAns === (exp.row.kind === 'bright' ? exp.predAns : null) &&
                    q.deadIdx === exp.deadIdx && q.answer === exp.answer &&
                    q.picks.length === 3 &&
                    q.picks.every((p, i) => p.t === exp.picks[i].t && p.size === exp.picks[i].size &&
                                            !!p.dead === !!exp.picks[i].dead) &&
                    q.phase === 1 && q.miss === 0 && q.step === 0 &&
                    q.slots.length === exp.slots.length &&
                    q.slots.every((s, i) => s.i === exp.slots[i].k && s.fixed === !!exp.slots[i].part &&
                                           s.part === exp.slots[i].part && s.on === false && s.type === exp.slots[i].type);
      /* 渲染层：槽位 g DOM 计数+dataset.k 扁平对账+类型+支路/开关/跨接线/断口/结点+
         灯泡数+环流数+预判行按钮数+阶段 dim（sw/branchDom 期望从 SPEC 行推导——
         bright-PR 的 branch=拓扑标记非渲染支路） */
      const els = Array.prototype.map.call(boardEl.querySelectorAll('.slotg'), c => c);
      const gbtns = Array.prototype.map.call(answerbarEl.querySelectorAll('.guess-btn'), c => c);
      const expBranchDom = !!(exp.row.branch && exp.row.kind !== 'bright');
      const expJunc = (exp.row.kind === 'bright' && exp.row.branch) ? 2 :
                      (exp.row.branch && exp.row.branch.bridge === 'seg' ? 2 : 0);
      const renderOk = els.length === q.slots.length && boardEl.dataset.n === String(q.slots.length) &&
                       els.every((c, i) => Number(c.dataset.k) === i) &&
                       els.every((c, i) => c.dataset.type === exp.slots[i].type) &&
                       gbtns.length === SPEC_PRED_KINDS[q.kind].length &&
                       gbtns.every((c, i) => c.dataset.guess === SPEC_PRED_KINDS[q.kind][i]) &&
                       picksEl.classList.contains('dim') &&
                       boardEl.querySelectorAll('.lamp').length === lampCount(q) &&
                       boardEl.querySelectorAll('.flowpath').length === flowCount(q) &&
                       boardEl.querySelectorAll('.flowpath.flowing').length === 0 &&
                       boardEl.querySelectorAll('.junction').length === expJunc &&
                       (expBranchDom === !!boardEl.querySelector('.branchg')) &&
                       (!expBranchDom || boardEl.querySelector('.branchg').dataset.bridge === exp.row.branch.bridge) &&
                       (!!exp.row.sw === !!boardEl.querySelector('.swmaing')) &&
                       (q.short ? !!boardEl.querySelector('.jumper') : !boardEl.querySelector('.jumper')) &&
                       (q.kind === 'fault'
                         ? els.filter((c, i) => exp.slots[i].type !== 'fix').every(c => c.dataset.frayed === '1') &&
                           els.filter((c, i) => exp.slots[i].type === 'fix').every(c => !c.dataset.frayed)
                         : els.every(c => !c.dataset.frayed)) &&
                       (q.blank >= 0 ? !!els[q.blank].querySelector('.gapline') &&
                                       els[q.blank].querySelectorAll('.pad').length === 2 : true);
      /* 候选渲染层：3 枚+data-anim 锚+dead 徽记+cut 卡 */
      const picks = Array.prototype.map.call(picksEl.querySelectorAll('.pick'), c => c);
      const picksOk = picks.length === 3 &&
                      picks.every((c, i) => Number(c.dataset.i) === i &&
                        (q.picks[i].t === 'wire'
                          ? !!c.querySelector('g[data-anim="wire"]') && c.dataset.size === q.picks[i].size
                          : !!c.querySelector('g[data-anim="cut"]')) &&
                        c.classList.contains('pick-dead') === !!q.picks[i].dead);
      /* 阶段1→2：预判答对=钉 chip+picks.dim 解除（顺序视觉态） */
      const predR = await window.CIR.tapPred(q.predAns);
      let pinOk = false;
      for (let w = 0; w < 200 && !pinOk; w++) {
        if (boardEl.querySelector('.pindir.show') && !picksEl.classList.contains('dim') &&
            predBtnAt(q.predAns).classList.contains('picked')) pinOk = true;
        else await wait(5);
      }
      /* ch2 特有：合开关亮真相两读法分叉（F2 立亮 / F1·F3 保持暗——三态采样） */
      let revealOk = true;
      if (q.kind === 'fault') {
        let swClosed = false, lampOn = false;
        for (let w = 0; w < 400; w++) {
          if (!swClosed && boardEl.querySelector('.swmaing .sw.closed')) swClosed = true;
          if (boardEl.querySelectorAll('.lamp.on').length > 0) { lampOn = true; break; }
          await wait(5);
        }
        revealOk = swClosed && (lampOn === q.litAns);         // 分叉：开关合上后灯态=litAns
      }
      await unlocked();
      /* 演出层：放对后（tap 中途轮询抓 DOM）判定槽 .closed+dataset.part+wirepiece+
         灯泡 .on（SR=.on.dim）+环流 .flowing+兔子槽 .closed+F3 .jumper.gone+
         switch 合闸（SW1=合上后暗窗 ≥100ms 再亮 / SW2-3=立亮）+
         twogap-A（接一根后仍暗 ≥90ms——兔子 950ms 档补齐后才亮） */
      const pr = window.CIR.tapPart(q.answer);
      let meshOk = q.blank < 0, litOk = false, flowOk = false, bunnyOk = q.second === null,
          cutOk = q.kind !== 'fault' || q.need !== null,
          swClosedSeen = q.kind !== 'switch', darkHold = false, swClosedAt = 0,
          placedAt = 0, litAt = 0;
      for (let w = 0; w < 900; w++) {
        if (!meshOk && q.blank >= 0) {
          const bs = slotElAt(q.blank);
          if (bs && bs.classList.contains('closed') &&
              bs.dataset.part === q.need && !!bs.querySelector('.wirepiece')) meshOk = true;
        }
        if (q.kind === 'switch' && !swClosedSeen) {
          if (boardEl.querySelector('.branchg .sw.closed') || boardEl.querySelector('.swmaing .sw.closed')) {
            swClosedSeen = true; swClosedAt = Date.now();
          }
        }
        if (swClosedSeen && !darkHold && q.kind === 'switch' &&
            boardEl.querySelectorAll('.lamp.on').length === 0 && Date.now() - swClosedAt >= 100)
          darkHold = true;                                    // 合闸后暗窗 ≥100ms（SW1 分叉采样）
        if (q.kind === 'twogap' && !placedAt) {
          const bs = slotElAt(q.blank);
          if (bs && bs.classList.contains('closed')) placedAt = Date.now();
        }
        if (!litAt && boardEl.querySelectorAll('.lamp.on').length >= lampCount(q) &&
            Array.prototype.every.call(boardEl.querySelectorAll('.lamp'), l => l.classList.contains('on'))) {
          litAt = Date.now(); litOk = true;
        }
        if (!flowOk && boardEl.querySelectorAll('.flowpath.flowing').length === flowCount(q)) flowOk = true;
        if (q.second && !bunnyOk) {
          const by = slotElAt(exp.bunny);
          if (by && by.classList.contains('closed') && by.dataset.part === q.second.size) bunnyOk = true;
        }
        if (q.kind === 'fault' && q.need === null && boardEl.querySelector('.jumper.gone')) cutOk = true;
        if (meshOk && litOk && flowOk && bunnyOk && cutOk && swClosedSeen) break;
        await wait(10);
      }
      /* 两读法分叉终判：渲染锚=litAns（判据锚=specPredAns 独立推导） */
      let forkOk = true;
      if (q.kind === 'switch') forkOk = swClosedSeen && (q.litAns === false ? darkHold : true);
      if (q.kind === 'twogap') forkOk = litOk && placedAt > 0 && litAt > placedAt &&
                                        (q.litAns === false ? (litAt - placedAt) >= 90 : (litAt - placedAt) <= 400);
      if (q.kind === 'bright') {
        const dimN = boardEl.querySelectorAll('.lamp.on.dim').length;
        forkOk = (q.branch ? dimN === 0 : dimN === 2);        // SR 弱光×2 / PR 全亮
      }
      const r4r = await pr;
      const animOk = r4r === 'lit' && meshOk && litOk && flowOk && bunnyOk && cutOk && swClosedSeen && forkOk;
      fr.push({ flat: flat, ok: numOk && renderOk && picksOk && predR === 'ok' && pinOk && revealOk && animOk,
                num: numOk, render: renderOk, picks: picksOk, pin: pinOk, reveal: revealOk, anim: animOk,
                fork: forkOk });
    }
    const u4 = fr.every(f => f.ok);
    if (u4) npass++;
    units.frame = { ok: u4, frames: fr };
  }

  /* ---- ④b F3 拆线演出专项（r4 审查 M-3：F3 位于 flat5 题3（表行⑨），④ 五板直断言从未
     触达——.jumper.gone 拆线演出与「合开关保持暗」第三 reveal 态在此钉死）。
     推进=钩子逐题答对（tapPred+tapPart）；期望=specFlow(5) 顺序 specQuiz 同流消耗（与引擎
     rnd 消耗严格同构），题3 期望=F3：kind=fault/need=null/blank=-1/answer=cut 卡 ---- */
  total++;
  {
    let okB = true, badB = null;
    const sfB = specFlow(5);
    const exps = [0, 1, 2, 3, 4].map(k => specQuiz(sfB.rows[k], sfB.rnd));   // rnd 同流顺序消耗
    const e3 = exps[3];
    if (!(e3.row.kind === 'fault' && e3.row.short && e3.row.need === null && e3.blank === -1 &&
          e3.picks[e3.answer].t === 'cut')) { okB = false; badB = 'spec '; }   // 独立表先自证=F3
    const pinWait = async q => {                               // 钉 chip+picks.dim 解除（与 ④ 同款轮询）
      for (let w = 0; w < 200; w++) {
        if (boardEl.querySelector('.pindir.show') && !picksEl.classList.contains('dim') &&
            predBtnAt(q.predAns).classList.contains('picked')) return true;
        await wait(5);
      }
      return false;
    };
    if (okB) {
      startLevel(5);
      for (let k = 0; k < 3 && okB; k++) {                     // 钩子推进 3 题（每题预判对+接对）
        await unlocked();
        const qk = window.CIR.quiz;
        if (qk.step !== k) { okB = false; badB = 'step ' + k; break; }
        await window.CIR.tapPred(qk.predAns);
        if (!(await pinWait(qk))) { okB = false; badB = 'pin ' + k; break; }
        const rk = await window.CIR.tapPart(qk.answer);
        if (rk !== 'lit') { okB = false; badB = 'adv ' + k + '=' + rk; }
      }
    }
    if (okB) {
      await unlocked();
      const q3 = window.CIR.quiz;
      /* 数值层：题3 期望全字段（与 ④ 同口径） */
      if (q3.step !== 3 || q3.kind !== 'fault' || q3.need !== null || q3.blank !== -1 ||
          q3.picks.length !== 3 || q3.answer !== e3.answer ||
          !q3.picks.every((p, i) => p.t === e3.picks[i].t && p.size === e3.picks[i].size)) {
        okB = false; badB = 'num ';
      }
      /* 拆线前态：跨接线在场未拆（.jumper 无 .gone）+预判答对钉住 */
      if (okB && (!boardEl.querySelector('.jumper') || boardEl.querySelector('.jumper.gone'))) {
        okB = false; badB = 'preJumper ';
      }
      if (okB) {
        await window.CIR.tapPred(q3.predAns);
        if (!(await pinWait(q3))) { okB = false; badB = 'pin3 '; }
        /* reveal 第三态：F3 合开关后灯保持暗（短路分流——lampOn === litAns === false） */
        let swSeen = false, lampEarly = false;
        for (let w = 0; w < 400; w++) {
          if (!swSeen && boardEl.querySelector('.swmaing .sw.closed')) swSeen = true;
          if (boardEl.querySelectorAll('.lamp.on').length > 0) { lampEarly = true; break; }
          await wait(5);
        }
        if (!swSeen || lampEarly) { okB = false; badB = 'reveal '; }
        /* 演出层：点拆线卡 → .jumper.gone + 灯亮 + 环流（④ 原断言在此型短路恒过的真覆盖） */
        if (okB) {
          const prB = window.CIR.tapPart(q3.answer);
          let goneOk = false, litB = false, flowB = false;
          for (let w = 0; w < 900; w++) {
            if (!goneOk && boardEl.querySelector('.jumper.gone')) goneOk = true;
            if (!litB && boardEl.querySelectorAll('.lamp.on').length >= 1) litB = true;
            if (!flowB && boardEl.querySelectorAll('.flowpath.flowing').length >= 1) flowB = true;
            if (goneOk && litB && flowB) break;
            await wait(10);
          }
          const rB = await prB;
          if (rB !== 'lit' || !goneOk || !litB || !flowB) { okB = false; badB = 'anim g' + goneOk + 'l' + litB + 'f' + flowB; }
        }
      }
    }
    if (okB) npass++;
    units.f3cut = { ok: okB, bad: badB };
  }

  /* ---- ⑥ 先验专项 20 题全量（独立推导禁读页面期望+四题型真值律+decoy 唯一性） ---- */
  total++;
  {
    let ok6 = true, bad6 = null;
    for (let flat = 0; flat < 20 && ok6; flat++) {
      const rr = specFlow(flat);
      for (let qi = 0; qi < 5; qi++) {
        const row = specTable[rr.rows[qi]];
        const L = genLevel(flat);
        const q = L.quizzes[qi];
        const layout = row.kind === 'bright' ? (row.branch ? 'B??L?' : 'B??L') : 'B??L';
        /* SPEC 先验（§3 r4 验算）：布局域封闭（字符数=槽数 4|5+字符域 B/L/?）+
           真值律独立复算（'up' 恒非真值）+second 规则+decoy⟺second dead+picks 构造 */
        if (layout.length !== (row.kind === 'bright' && row.branch ? 5 : 4)) { ok6 = false; bad6 = 'layLen ' + flat + '/' + qi; break; }
        for (let ci = 0; ci < layout.length; ci++) {
          const ch = layout.charAt(ci);
          if (ch !== 'B' && ch !== 'L' && ch !== '?') { ok6 = false; bad6 = 'chr ' + flat + '/' + qi; break; }
        }
        if (!ok6) break;
        const predE = specPredAns(row);
        if (q.predAns !== predE || SPEC_PRED_KINDS[row.kind].indexOf(predE) < 0) { ok6 = false; bad6 = 'pred ' + flat + '/' + qi; break; }
        if (predE === 'up') { ok6 = false; bad6 = 'upTrue'; break; }        // 'up'=误解干扰恒非真值
        if (row.kind === 'bright' && q.brightAns !== predE) { ok6 = false; bad6 = 'bright ' + flat + '/' + qi; break; }
        if (row.kind !== 'bright' && q.litAns !== (predE === 'lit')) { ok6 = false; bad6 = 'lit ' + flat + '/' + qi; break; }
        if (row.second && row.second.at === 'main') {
          if (row.second.i === row.blank || row.second.size === row.need) { ok6 = false; bad6 = 'second ' + flat + '/' + qi; break; }
        }
        const hasDead = !!(row.second && row.second.at === 'dead');
        if ((q.deadIdx >= 0) !== hasDead) { ok6 = false; bad6 = 'decoyEquiv ' + flat + '/' + qi; break; }
        if (hasDead) {
          const wireSame = q.picks.filter(p => p.t === 'wire' && p.size === row.need).length;
          if (wireSame !== 2 || !q.picks[q.deadIdx].dead || q.picks[q.deadIdx].size !== row.need ||
              q.answer === q.deadIdx) { ok6 = false; bad6 = 'decoyPair ' + flat + '/' + qi; break; }
        } else if (!(row.kind === 'fault' && row.short)) {
          if (q.picks.filter(p => p.t === 'wire' && p.size === row.need).length !== 1 ||
              q.answer !== q.picks.findIndex(p => p.size === row.need)) { ok6 = false; bad6 = 'uniq ' + flat + '/' + qi; break; }
        } else if (q.picks.filter(p => p.t === 'cut').length !== 1 ||
                   q.answer !== q.picks.findIndex(p => p.t === 'cut')) { ok6 = false; bad6 = 'cutUniq ' + flat + '/' + qi; break; }
        if (q.blank >= 0 && q.slots[q.blank].part !== null) { ok6 = false; bad6 = 'blankPart ' + flat + '/' + qi; break; }
        if (!(SPEC_SPAN.S < SPEC_SPAN.M && SPEC_SPAN.M < SPEC_SPAN.L &&
              SPAN.S === SPEC_SPAN.S && SPAN.M === SPEC_SPAN.M && SPAN.L === SPEC_SPAN.L))
          { ok6 = false; bad6 = 'span'; break; }
        /* 回路律独立复算：初始全 false→双答放对后全 true（引擎直驱验证）+F3 short 清位 */
        if (!q.slots.every(s => s.on === false)) { ok6 = false; bad6 = 'initOn ' + flat + '/' + qi; break; }
        const L6 = genLevel(flat);
        for (let pre = 0; pre < qi; pre++) {
          engTapPred(L6, L6.quizzes[pre].predAns);
          engTapPart(L6, correctPick(L6.quizzes[pre]));
        }
        const q6 = L6.quizzes[qi];
        engTapPred(L6, q6.predAns);
        engTapPart(L6, correctPick(q6));
        if (!q6.slots.every(s => s.on === true)) { ok6 = false; bad6 = 'loopLaw ' + flat + '/' + qi; break; }
        if (q6.kind === 'fault' && q6.need === null && q6.short !== false) { ok6 = false; bad6 = 'cutClear ' + flat + '/' + qi; break; }
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
    const q10 = window.CIR.quiz;
    const obsOk = window.__lastVoiceText === SPEC_OBS[3] &&  // 开题题面句（ch3 章档句——T46 clip 化走 play）
                  window.__lastVoiceKey === 'cir_obs_3' &&
                  SPEC_OBS[3].length === 11 && CHAPTERS[3].obsWin === vEstMs(11) + 300;
    await window.CIR.tapPred(q10.predAns);
    await unlocked();
    await window.CIR.tapPart(q10.answer);
    const LQ = window.__lastQueue;
    const chainOk = LQ && LQ.length === 1 &&
                    LQ[0] === 'cir_right' &&                // 确认链=['cir_right'] 单 clip（SPEC §3 r4）
                    typeof LQ[0] === 'string' &&
                    !keylessLast(LQ);                       // 无 keyless 段（契约 N 天然安全）
    const lenOk = LIT_MS + FLOW_MS >= 1968 + 300 &&          // 演出窗 3000 ≥ 确认链 2268（家族 G/H）
                  LIT_MS === 1400 && FLOW_MS === 1600 &&
                  CUT_MS + FLOW_MS >= 1968 + 300 &&           // F3 拆线窗 2600 ≥ 2268
                  PRED_OK_MS === 500 && REVEAL_MS === 1800 && BUNNY_MS === 700 &&
                  vEstMs(SPEC_OBS[3].length) + 300 <= CHAPTERS[3].obsWin;   // 家族 T：题面句窗=estMs(11)+300=4695
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
    const src = document.querySelectorAll('script')[2].textContent;   // b36 M1：script[2]=纯 data+engine+main
    const coreSrc = document.querySelectorAll('script')[0].textContent;
    const verifyIsolated = scripts.length === 4 &&            // 4 块布局（core/clips/game/verify）
                          scripts[3].textContent.indexOf('runVerify') >= 0 &&
                          src.indexOf('runVerify') < 0 &&
                          src.indexOf('__cirVlog') < 0;       // script[2] 无 verify 字面（M1①）
    const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
                 src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
    const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
                 src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
                 src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
    const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&       // C：存档版本 1.0（core）
                 coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&   // C：存档键名
                 src.indexOf("KIDS.init({ game: 'cir'") >= 0;   // C：本款存档键 kidsgame_cir
    const srcD = src.indexOf("replayAnim(boardEl, 'bump')") >= 0;   // D：吞输入轻叮配容器 bump
    const srcE = src.indexOf('sv.cir && sv.cir.tutSeen') >= 0;   // E：行为分流先查教学特例
    const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
                 src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
    const srcI = src.indexOf('const WRONG_CHAIN_WIN = 4266') >= 0 &&   // I：三链豁免窗常量（r4）
                 src.indexOf('const PRED_CHAIN_WIN = 5490') >= 0 &&
                 src.indexOf('const BRIGHT_CHAIN_WIN = 4962') >= 0 &&
                 src.indexOf('wrongChainUntil = Date.now() + chainWin') >= 0 &&
                 src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
                 src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
                 src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：救援守卫+重置
                 src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0 &&   // I 补：元件 guard
                 src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && d !== q.predAns') >= 0;   // I 补：预判 guard（r4）
    const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0 &&   // J：语义句 10s 节流在场
                 src.indexOf('cur.flat < 3') >= 0;                     // J：flat<3（含教学 -1）每错必播
    const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
                 src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
    const styleSrc = document.querySelectorAll('style')[0].textContent;
    const srcO = styleSrc.indexOf('button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}') >= 0;   // O：自建 button 显式 color
    /* 三链豁免窗算式对账（SPEC §3 r4：4266=1848+150+1968+300 / 5490=3072+150+1968+300 /
       4962=2544+150+1968+300）+三首错锁收窄算式（b37 R3+b38 R1：锁=clip+150 顶格 ≤
       豁免窗——总窗口径，锁表达式禁叠尾窗常数） */
    const winCalc = WRONG_CHAIN_WIN === 1848 + 150 + 1968 + 300 && WRONG_CHAIN_WIN === 4266 &&
                    PRED_CHAIN_WIN === 3072 + 150 + 1968 + 300 && PRED_CHAIN_WIN === 5490 &&
                    BRIGHT_CHAIN_WIN === 2544 + 150 + 1968 + 300 && BRIGHT_CHAIN_WIN === 4962 &&
                    WRONG_LOCK_1 === 1848 + 150 && WRONG_LOCK_1 === 1998 && WRONG_LOCK_1 < WRONG_CHAIN_WIN &&
                    PRED_LOCK_1 === 3072 + 150 && PRED_LOCK_1 === 3222 && PRED_LOCK_1 < PRED_CHAIN_WIN &&
                    BRIGHT_LOCK_1 === 2544 + 150 && BRIGHT_LOCK_1 === 2694 && BRIGHT_LOCK_1 < BRIGHT_CHAIN_WIN &&
                    WRONG_LOCK_2 === 1000 &&
                    LIT_MS + FLOW_MS >= 1968 + 300 && LIT_MS === 1400 && FLOW_MS === 1600 &&
                    src.indexOf('WRONG_LOCK_1 : WRONG_LOCK_2) * SPEED + 140') < 0 &&   /* b38 R1 总窗：锁禁叠尾窗（越界防回归） */
                    src.indexOf('lock1 : WRONG_LOCK_2;') >= 0;                         /* r4 三链分档锁三元在场 */
    /* 回路律落位字面（§0.96 verify 复算依据：闭合=全槽有件→全槽 on 真源在场）
       +r4 双答制引擎字面（predAnsOf 真值律+顺序守卫） */
    const loopLit = src.indexOf('q.slots[s].on = true') >= 0 &&
                    src.indexOf('function litGapEnds(q)') >= 0 &&   // 方向级=缺口两端触点（不泄答案）
                    src.indexOf('function predAnsOf(row)') >= 0 &&  // 四题型真值律（r4）
                    src.indexOf('q._answered || !q._predOk) return null') >= 0 &&   // 双答顺序守卫
                    src.indexOf('powerOn(q)') >= 0;                 // 灯亮+环流通电主演出
    const srcM = src.indexOf('data-anim') >= 0 && src.indexOf('dataset.k') >= 0 &&
                 src.indexOf('dataset.part') >= 0;   // M：帧内容锚素材（data-k/data-part）
    const srcN = src.indexOf('window.CIR =') >= 0 && src.indexOf('__cirDemoR') >= 0;   // N 配套：钩子真实页暴露+教学实证
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
                   CHAPTERS[1].obsWin === vEstMs(SPEC_OBS[1].length) + 300 &&   // 十字句窗=vEstMs(10)+300=4350
                   CHAPTERS[2].obsWin === vEstMs(SPEC_OBS[2].length) + 300 &&   // 九字句窗=vEstMs(9)+300=4005
                   CHAPTERS[3].obsWin === vEstMs(SPEC_OBS[3].length) + 300 &&   // 十一字句窗=vEstMs(11)+300=4695
                   CHAPTERS[4].obsWin === vEstMs(SPEC_OBS[4].length) + 300;     // 十字句窗=4350
    /* 生成关 nextHint 实算对账：期望值独立复算 dch（specMul 首随机数——禁读引擎） */
    const genCalc = [24, 29, 34, 39].every(f => {
      const expDch = specFlow(f + 1).dch;
      return nextHint(f) === SPEC_GEN_HINTS[expDch - 1] &&
             nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1] &&
             genLevel(f + 1).dch === expDch;
    });
    const u9 = verifyIsolated && srcA && srcB && srcC && srcD && srcE && srcF && srcI &&
               srcJ && srcK && srcM && srcN && srcO && winCalc && loopLit && hintOk && genCalc;
    if (u9) npass++;
    units.contract = { ok: u9, layout: verifyIsolated, A: srcA, B: srcB, C: srcC, D: srcD,
                       E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK, M: srcM,
                       N: srcN, O: srcO, winCalc: winCalc, loopLit: loopLit,
                       hints: hintOk, genCalc: genCalc };
  }

  /* ---- ① 结构：simView 双 viewport+候选/预判触摸目标+对比度+横溢 / clips 注入+实长辨别 ---- */
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
        const q = window.CIR.quiz;
        const els = Array.prototype.map.call(boardEl.querySelectorAll('.slotg'), b => b.getBoundingClientRect());
        const pks = Array.prototype.map.call(picksEl.querySelectorAll('.pick'), b => ({ w: b.offsetWidth, h: b.offsetHeight }));
        const gbs = Array.prototype.map.call(answerbarEl.querySelectorAll('.guess-btn'), b => ({ w: b.offsetWidth, h: b.offsetHeight }));
        const hitOk = els.length === q.slots.length &&                              // 槽位 g=渲染即引擎对账
                      els.every(r => r.width + r.height > 0) &&                     // 槽位在版面（非空联合盒）
                      pks.length === 3 && pks.every(b => b.w >= 96 && b.h >= 96) &&    // 候选=判定触达 ≥96
                      gbs.length === SPEC_PRED_KINDS[q.kind].length &&
                      gbs.every(b => b.w >= 96 && b.h >= 60);                       // 预判按钮触达（r4 阶段1）
        const dockOk = $id('btn-rabbit').offsetWidth >= 72 && $id('btn-replay').offsetWidth >= 72;
        const wm = boardEl.querySelector('.wmain');                                 // 导线主线对比度（暖棕 vs 板底/页底）
        const cB = ratioOf(cssToHex(getComputedStyle(wm).stroke), '#F0E7CC') >= 3 &&
                   ratioOf(cssToHex(getComputedStyle(wm).stroke), '#FBF6EC') >= 3;
        const de = document.documentElement;
        const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
        return { vp: w + 'x' + h, flat: g._simFlat, n: q.slots.length, hitOk: hitOk, dock: dockOk,
                 contrast: cB, ox: ox, pass: hitOk && dockOk && cB && ox <= 0 };
      });
    }
    const sims = [];
    for (const flat of [0, 15, 16]) {                 // sgl 4 槽 / sr2 串联 / tw 并联 5 槽三种板型
      $id('game')._simFlat = flat;
      sims.push(await simView(1280, 800));
      sims.push(await simView(800, 1180));
    }
    const g0 = $id('game');
    g0.style.width = '';
    g0.style.height = '';
    startLevel(0);                                            // 还原真实 viewport 布局
    await unlocked();
    /* clips：cir_ 11 条（T46 观察句 +4）+ core 3 条全注入 + duration 辨别器（±60ms——SPEC_DUR 实长表） */
    const keys = Object.keys(KIDS.voice.clips);
    const cirKeys = Object.keys(SPEC_DUR);
    const needAll = cirKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
    const preOk = keys.length === 14 &&
                  needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
    const durs = await Promise.all(cirKeys.map(k => new Promise(res => {
      let done = false;
      const a = new Audio(KIDS.voice.clips[k]);
      const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);
      a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
      a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
    })));
    const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[cirKeys[i]]) <= 60);
    const u1 = preOk && durOk && sims.every(s => s.pass);
    if (u1) npass++;
    units.struct = { ok: u1, clips: preOk, durs: durs, sims: sims };
  }

  /* ---- ⑪ save：真实写档链（init cir→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__cirOrig.save, origPersist = window.__cirOrig.persist;
  const origLS = localStorage.getItem('kidsgame_cir');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_cir');
    KIDS.init({ game: 'cir', title: '电路小灯泡' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.CIR.autoSolve();     // 真实判定链通关（双答 2 taps/题）→ winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_cir');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 10 && j && j.v === '1.0' && j.game === 'cir' &&
                j.levels && j.levels['1-0'] && j.levels['1-0'].stars === 3);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11 && a11.taps, done: a11 && a11.done,
                                               raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_cir');
  else localStorage.setItem('kidsgame_cir', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → CIR.start(0) 非教学直达题面（契约 E 分流；
     审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  {
    const today = new Date();
    const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const pre = { v: '1.0', game: 'cir', firstDay: tstr, lastDay: tstr, levels: {},
                  dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                  restTip: { day: '', shown: 0 }, cir: { tutSeen: true } };
    let q12 = null, realOk = false;
    try {
      localStorage.setItem('kidsgame_cir', JSON.stringify(pre));
      KIDS.store.load();                             // 重读预置档
      window.__cirDemoR = null;                      // 教学实证清零（非教学路径不应重设）
      window.CIR.start(0);
      await unlocked();
      q12 = window.CIR.quiz;
      const sf12 = specFlow(0);
      const exp12 = specQuiz(sf12.rows[0], sf12.rnd);
      realOk = state.tut === 'none' && window.__cirDemoR === null &&
               !!q12 && q12.kind === 'twogap' && q12.blank === exp12.blank &&
               q12.need === exp12.row.need && q12.blankAt === 'main' &&
               q12.slots.length === exp12.slots.length &&
               q12.answer === exp12.answer && q12.picks.length === 3 &&
               q12.phase === 1 && q12.step === 0 && q12.miss === 0 &&
               window.CIR.currentLevel.flat === 0 && window.CIR.currentLevel.n === 5 &&
               window.CIR.currentLevel.dch === 1 &&
               typeof window.CIR.tapPart === 'function' &&   // b29 坑⑥：真实页钩子暴露
               typeof window.CIR.tapPred === 'function' &&
               (KIDS._save() || {}).v === '1.0';
    } finally {
      /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
      if (origLS === null) localStorage.removeItem('kidsgame_cir');
      else localStorage.setItem('kidsgame_cir', origLS);
      KIDS._save = function () { return { levels: {} }; };
      KIDS.store.persist = function () {};
    }
    if (realOk) npass++;
    units.realPath = { ok: realOk, tut: state.tut, quiz: q12 && { blank: q12.blank, need: q12.need } };
  }

  const out = { game: 'cir', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__cirVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass) + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）并留播报历史
     （__voiceHist）；voice.say 记录 keyless 题面句（__lastSayText——T46 clip 化后题面锚=play）；
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
