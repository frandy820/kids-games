/* ================= ?verify=1 自检 r18（独立第 4 script 块——纯游戏块=script[2] 可真断言）
   ① 静态 24 + 生成 16 关全量审计（flat 0-39，引擎级）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null——五 kind 先验）/ 章号映射（ch=flat/6+1；dch 静态
     1+flat//6（flat<24）、生成恒 4）/ 引擎直驱（含 dual 双任务两轮：填→画→判对→
     engAfterConfirm 切任务二→再填→再画→solved）/ SPEC 表独立对账（目标域 18 组合全域；
     neg 排除补全唯一性独立复算；edit 复合终态独立复算；dual g1≠g2；块池轴分组恒续+
     组内封闭集全量+组内打乱实证）/ 生成关域聚合与五 kind 覆盖
   ② tap 单元（flat0 plain UI 驱动）：pick 形态（槽 3 全空/块 8）/ 异轴点选吞 false+槽
     不变 / 越界·未满 tapGo null / 空槽 tapSlot null / 填入 'fill'/'ready'+名音绑定 /
     清槽 'clear' 回该轴 / tapGo paint 飞行中 tapBlock 吞 null / 错轴可视化（错色重画→
     'wrong'+miss+1+painted=所选≠目标（契约 M 忠实执行）+槽保留+judged diff+错链
     [rp_wrong, rp_hint] 全 clip）/ 豁免窗内重画吞 false（I 补）/ 窗后改槽重画 'right'+
     确认链 [rp_right, 名音×3]（恒三段）/ 作画分相位实录 ['color','shape','size']
   ③ neg 单元：否定卡 DOM 锚（nrow data-axis/neg 芯片 data-neg=1/正轴芯片=target 值/
     否定行不含目标值）+ 排除值填槽→wrong + 独立 flat 判对路径（比对揭示 g[data-target]）
   ④ edit 单元：pick 画布=起始画（g[data-paint]==start——契约 M）+ 修改卡锚（erow/
     from✗ data-neg/to✓ data-ok）+ 忽略修改（填 start 值）→wrong + 独立 flat 判对
   ⑤ mem 单元：闪现窗锁定（tapBlock 吞 false）+ rp_mem 闪现链单段（T46 化全 clip）+
     窗毕罩住（data-covered 在场+g[data-target] 缺席）+ 判对→比对揭示 + 错→回 pick 再罩
   ⑥ dual 单元：四框 DOM（easel.dual/gA gB data-target/pA pB）+ 任务一判对切任务二
     （tIdx=1+槽复位+painted1 定格+like 印记+pB 转活动）+ 任务二判对 solved 推进 +
     任务一错 miss 累计
   ⑦ 教学链：tutorialWatch 真实走完（stub 存档）→ __rpDemoR='right' 且 tut='help'、
     turn 首题=定制「黄色小方形」、教学填槽实录==[红,圆,大]、折算真实时长预算
   ⑧ UI 冒烟：flat0/neg/edit/mem/dual 各一关 autoSolve 通关（taps=按题型结构推导：
     每题 3 填+1 画，dual 两轮=8）+ flat12 先 1 错再 autoSolve（miss=1→2★）
   ⑨ 帧内容断言（契约 M：渲染即引擎）：块 DOM==blocks / 槽 DOM==slots / 目标侧按
     kind（plain·dual 图案卡 g[data-target]==target；neg/edit 指令卡；mem 闪现/罩）/
     画布（painted 或 edit 起始画或待命）/ 比对印记 data-judge
   ⑩ 布局：双 viewport（1280×800/800×1180）× 五题型各一 flat：块与槽 ≥48、「画！」
     ≥48、可见画框 ≥120 宽（dual mini 136）、描边对比度 ≥3:1、overflowX ≤0
   ⑪ clips：rp_ 19 条 + core 3 条=22 全注入 + duration 辨别器（SPEC §4+r18 实长 ±60ms）
   ⑫ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑬ 契约 A/B/E/F/I/I补/J/K/MIG 源码断言（读 script[2] 纯游戏块）+ 演出相位 idle 豁免
     + keyless 恒零（T46 化：mem 闪现句=rp_mem clip）+ 文案红线（词边界检测）
   ⑭ 章末预告独立硬编码对账（hint[i]↔CHAPTERS[i+1]）+ 生成关 nextHint 实算对账
   ⑮ 窗数学（SPEC §4 实长表独立复算）：paint 演出窗 3876=1176+3×800+300；like 前导
     2052；确认链 8634==3216+150+3×1656+300（恒三段）；错链 5010==1848+150+2712+300；
     mem 闪现窗 6765==estMs(17)+300（家族 T 实算）；开题窗 voiceWin=neg 3900/edit 4068/
     dual 4092/plain 2340（全 ≤DECIDE）
   ⑯ 时长模型钉死：modeled(0)===134472（=900+6×(8000+14262)）且 40 关最低=134472
     （verify+selftest 双钉精确整数）+ 全关 ≥LEVEL_MIN_MS + voiceWin≤DECIDE 全量 +
     PERF_RIGHT_MS/DECIDE_MS 恒等式
   ⑰ SPEED=0.12 + CSS --t 换算生效
   结果写 #verify-result + window.__rpVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const T = (name, cond) => {                       // 原子断言计数器（selftest ≥50 断言口径）
    total++;
    if (cond) npass++;
    else (units.__failList = units.__failList || []).push(name);
    return !!cond;
  };

  /* SPEC-BATCH33 §0.81/§-r18/§3/§4 文字独立重列（禁抄页面 COLORS/SHAPES/CHAPTERS/CLIP_DUR） */
  const SPEC_COLORS = ['red', 'yel', 'blu'];         // 颜色封闭 3（红/黄/蓝）
  const SPEC_SHAPES = ['cir', 'squ', 'tri'];         // 形状封闭 3（圆/方/三角）
  const SPEC_SIZES = ['big', 'small'];               // 大小封闭 2（大/小）——18 组合
  const SPEC_NAMES = { red: '红色', yel: '黄色', blu: '蓝色', cir: '圆形',
                       squ: '方形', tri: '三角形', big: '大大的', small: '小小的' };
  const SPEC_AXIS_POOL = { color: SPEC_COLORS, shape: SPEC_SHAPES, size: SPEC_SIZES };
  const SPEC_DUR = { rp_tut_watch: 3384, rp_tut_turn: 2016, rp_hint: 2712, rp_right: 3216,
                     rp_wrong: 1848, rp_q: 2040, rp_go: 1176, rp_like: 1752,
                     rp_neg: 3600, rp_edit: 3768, rp_dual: 3792, rp_mem: 3960,
                     rp_n_red: 1416, rp_n_yel: 1416, rp_n_blu: 1416, rp_n_cir: 1416,
                     rp_n_squ: 1440, rp_n_tri: 1656, rp_n_big: 1488, rp_n_small: 1560 };
  const SPEC_CH_LEN = 6, SPEC_STATIC = 24;           // r18：每关 6 题 / 静态 24 关
  const SPEC_KIND_POOL = { 1: ['plain'], 2: ['neg', 'edit'], 3: ['mem', 'dual'],
                           4: ['plain', 'neg', 'edit', 'mem', 'dual'] };
  const SPEC_NEG_N = { 2: 1, 4: 2 }, SPEC_EDIT_N = { 2: 1, 4: 2 };
  const SPEC_MEM_TEXT = '看清楚啦，把它记住，等一会儿画出来';   // 17 字符（含标点）
  const SPEC_CHAPTER_HINTS = { 1: '有的指令打了叉，要动动脑筋', 2: '看一眼记住它，两位小画师来啦',
                               3: '什么挑战都会出现', 4: '新一轮大挑战' };
  const SPEC_GEN_HINTS = ['说清楚三条指令', '打了叉的不能用，动动脑筋',
                          '看一眼记住它', '什么挑战都有，说清楚就画得像'];
  const SPEC_DECIDE = { plain: 8000, neg: 12000, edit: 11000, mem: 10500, dual: 17000 };
  const SPEC_MODELED_MIN = 134472;                   // =900+6*(8000+14262)（ch1 全 plain）
  const estMs = n => n * 345 + 600;                  // 家族 T 四方之一（verify 独立定义·数字口径）
  /* Mj-1（恒真式收窄——r18 mem 闪现句=全款唯一 keyless 段且恒单段尾）：clip 链段全 string */
  const noKeyless = parts => !parts || !parts.length ? true :
    parts.every(p => typeof p === 'string');
  /* UI 驱动辅助：等当前题回 pick（mem 闪现窗毕解锁 / 演出完）或关已结束 */
  const waitPickUI = async () => {
    let g = 0;
    while (g++ < 900) {
      if (!cur) return false;
      if (cur.done) return true;
      if (qPickOpen()) return true;
      await wait(50);
    }
    return !!(cur && cur.done);
  };
  const qPickOpen = () => {
    const q = window.RP.quiz;
    return !!(q && q.phase === 'pick' && !state.locked && !state.demo);
  };
  const waitFlashDone = async () => {                // mem：等闪现窗毕（解锁+罩住）
    let g = 0;
    while (g++ < 300) {
      const q = window.RP.quiz;
      if (q && (q.flashDone || q.phase !== 'pick' || q.solved)) return true;
      if (!cur) return false;
      await wait(50);
    }
    return false;
  };
  const blockIdx = (q, axis, val) => q.blocks.findIndex(b => b.axis === axis && b.val === val);
  /* 找静态 flat：其 quiz0 为指定 kind（确定性——genLevel 纯函数） */
  const findFlat = (kind, lo, hi) => {
    for (let f = lo; f <= hi; f++)
      if (genLevel(f).quizzes[0].kind === kind) return f;
    return -1;
  };
  /* 通用填槽：按槽序填目标三元组（RP.tapBlock 真实 UI 链） */
  const fillTarget = async q => {
    for (const ax of ['color', 'shape', 'size'])
      await window.RP.tapBlock(blockIdx(q, ax, q.target[ax]));
  };

  /* ---- ① 40 关全量审计 + SPEC 表独立对账（引擎级） ---- */
  const genDch = {}, kindCount = {}, chKindCount = {};
  const genCombos = new Set();
  let shuffledQ = 0;
  let auditOk = true, badCase = null;
  for (let flat = 0; flat < 40; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);       // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++)
      if (structWhy(L1.quizzes[k], L1.dch)) ruleOk = false;
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / SPEC_CH_LEN) + 1;                   // 章号独立复算
    const dchOk = flat < SPEC_STATIC ? L1.dch === Math.floor(flat / SPEC_CH_LEN) + 1
                                     : L1.dch === 4;                             // 生成恒 4
    /* 引擎直驱（dual 双任务两轮；wrong 路径另测） */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      let rounds = 0;
      while (!q.solved && rounds++ < 3) {
        for (let s = 0; s < q.slots.length; s++) {
          if (q.slots[s].val) continue;
          const ci = q.blocks.findIndex(b => b.axis === q.slots[q.slotIdx].axis &&
                                             b.val === q.target[q.slots[q.slotIdx].axis]);
          const r = engTapBlock(L3, ci);
          if (r !== 'fill' && r !== 'ready') { driveOk = false; break; }
        }
        if (!driveOk || q.slotIdx < q.slots.length || !engToPaint(L3)) { driveOk = false; break; }
        const res = engTapGo(L3);
        if (!res || res.r !== 'right' ||
            res.painted.color !== q.target.color || res.painted.shape !== q.target.shape ||
            res.painted.size !== q.target.size) { driveOk = false; break; }
        if (res.nextTask) {                        /* dual 任务一→切任务二（槽复位）再驱动 */
          if (q.tIdx !== 0 || !q.t1Done || q.solved) { driveOk = false; break; }
          if (!engAfterConfirm(L3) || q.tIdx !== 1 || q.phase !== 'pick' ||
              q.slots.some(s => s.val !== null) || q.slotIdx !== 0) { driveOk = false; break; }
          continue;
        }
        break;                                     /* 普通题/dual 任务二：solved */
      }
      if (!driveOk || !q.solved || q.phase !== 'compare' ||
          !engAfterConfirm(L3) || q.phase !== 'won') { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* SPEC 表独立对账：目标域 / kind 域 / neg 排除补全 / edit 复合终态 / dual 互异 /
       块池轴分组恒续+组内封闭集全量 / 组内打乱实证 / 槽初始态 / 初始未画 */
    let specOk = true;
    for (let k = 0; k < L1.quizzes.length && specOk; k++) {
      const q = L1.quizzes[k], t = q.target;
      const tag = flat + '/' + k;
      if (SPEC_COLORS.indexOf(t.color) < 0 || SPEC_SHAPES.indexOf(t.shape) < 0 ||
          SPEC_SIZES.indexOf(t.size) < 0) { badCase = 'pool ' + tag; specOk = false; break; }
      if (SPEC_KIND_POOL[L1.dch].indexOf(q.kind) < 0) { badCase = 'kind ' + tag; specOk = false; break; }
      if (q.slots.some(s => s.val !== null) || q.slotIdx !== 0) { badCase = 'slots ' + tag; specOk = false; break; }
      if (q.kind === 'neg') {                      /* 否定卡独立推理：补集唯一=目标值 */
        const negAxes = Object.keys(q.negMap || {});
        if (negAxes.length !== SPEC_NEG_N[L1.dch]) { badCase = 'negN ' + tag; specOk = false; break; }
        for (const ax of negAxes) {
          const rest = SPEC_AXIS_POOL[ax].filter(v => q.negMap[ax].indexOf(v) < 0);
          if (rest.length !== 1 || rest[0] !== t[ax]) { badCase = 'negExcl ' + tag; specOk = false; break; }
        }
        if (!specOk) break;
        const posAxes = ['color', 'shape', 'size'].filter(ax => negAxes.indexOf(ax) < 0);
        if (posAxes.length !== 3 - negAxes.length) { badCase = 'negPos ' + tag; specOk = false; break; }
      }
      if (q.kind === 'edit') {                     /* 两步修改独立复算：终态=start∘edits */
        if ((q.edits || []).length !== SPEC_EDIT_N[L1.dch]) { badCase = 'edN ' + tag; specOk = false; break; }
        const fin = { color: q.start.color, shape: q.start.shape, size: q.start.size };
        for (const e of q.edits) {
          if (e.from !== q.start[e.axis] || e.to === e.from ||
              SPEC_AXIS_POOL[e.axis].indexOf(e.to) < 0) { badCase = 'edVal ' + tag; specOk = false; break; }
          fin[e.axis] = e.to;
        }
        if (!specOk) break;
        if (fin.color !== t.color || fin.shape !== t.shape || fin.size !== t.size) {
          badCase = 'edCompose ' + tag; specOk = false; break;
        }
      }
      if (q.kind === 'dual' &&
          (q.goals[0].color === q.goals[1].color && q.goals[0].shape === q.goals[1].shape &&
           q.goals[0].size === q.goals[1].size)) { badCase = 'dualSame ' + tag; specOk = false; break; }
      if (q.blocks.length !== 8) { badCase = 'blocksLen ' + tag; specOk = false; break; }
      let off = 0, anyShuffled = false;            /* 轴分组恒续+组内封闭集（SPEC 基序比对） */
      for (const ax of ['color', 'shape', 'size']) {
        const seg = q.blocks.slice(off, off + SPEC_AXIS_POOL[ax].length);
        if (seg.some(b => b.axis !== ax)) { badCase = 'blocksGroup ' + tag; specOk = false; break; }
        const got = seg.map(b => b.val).join(',');
        if (got !== SPEC_AXIS_POOL[ax].join(',')) {   /* 组内序=SPEC 基序（verify 侧独立基） */
          const sorted = seg.map(b => b.val).sort().join(',');
          if (sorted !== SPEC_AXIS_POOL[ax].slice().sort().join(',')) { badCase = 'blocksSet ' + tag; specOk = false; break; }
          anyShuffled = true;
        }
        off += SPEC_AXIS_POOL[ax].length;
      }
      if (!specOk) break;
      if (anyShuffled) shuffledQ++;
      kindCount[q.kind] = (kindCount[q.kind] || 0) + 1;
      const kk = L1.dch + ':' + q.kind;
      chKindCount[kk] = (chKindCount[kk] || 0) + 1;
      if (L1.dch >= 4) genCombos.add(t.color + '/' + t.shape + '/' + t.size);   // 生成关域聚合
    }
    const paintedInit = L1.quizzes.every(q => q.painted === null);
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk && paintedInit;
    if (!ok) auditOk = false;
    T('audit:' + flat + ':det', det);
    T('audit:' + flat + ':rule', ruleOk);
    T('audit:' + flat + ':ch', chOk);
    T('audit:' + flat + ':dch', dchOk);
    T('audit:' + flat + ':drive', driveOk && solvedAll);
    T('audit:' + flat + ':spec', specOk);
    T('audit:' + flat + ':painted', paintedInit);   // 初始未画
    if (flat >= SPEC_STATIC) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok,
                  kinds: L1.quizzes.map(q => q.kind) };
    if (flat < SPEC_STATIC) levels[keyOf(flat)] = rec; else gen[flat] = rec;
  }
  /* 覆盖面：五 kind 全在场（ch2 neg+edit / ch3 mem+dual / 生成五混）+ 组内打乱实证（防位置查表） */
  const coverOk = ['plain', 'neg', 'edit', 'mem', 'dual'].every(k2 => kindCount[k2] >= 6) &&
    (chKindCount['2:neg'] || 0) >= 6 && (chKindCount['2:edit'] || 0) >= 6 &&
    (chKindCount['3:mem'] || 0) >= 6 && (chKindCount['3:dual'] || 0) >= 6;
  T('audit:kind-cover', coverOk);
  T('audit:blocks-shuffled', shuffledQ >= 225);      // 240 题组内序≠基序应近乎全量（r18 实测 230/240；下界收紧 200→225 防 seed/池常量退化静默——修复闭环 min-1）
  units.audit = { ok: auditOk && coverOk && shuffledQ >= 225, bad: badCase, genDch: genDch,
                  kinds: kindCount, shuffledQ: shuffledQ, genCombos: genCombos.size };

  /* ---- ② tap 单元（flat0 plain UI 驱动：三轴全指令） ---- */
  window.RP.start(0);
  await wait(120);                                  // 开题（startQuizFlow 400*SPEED 内）
  let q0 = window.RP.quiz;
  const swWatch = await window.RP.tapBlock(blockIdx(q0, 'shape', q0.target.shape));   // pick 首槽=颜色，点形状块
  T('tap:axis-swallow', swWatch === false && window.RP.quiz.slotIdx === 0 &&
    window.RP.quiz.slots[0].val === null);          // 异轴点选吞（方向级）+槽不变
  T('tap:bad-idx', (await window.RP.tapBlock(99)) === null);   // 越界=null
  T('tap:go-unready', (await window.RP.tapGo()) === null);     // 三槽未满 tapGo=null
  T('tap:slot-empty', window.RP.tapSlot(0) === null);          // 空槽无可清=null
  T('tap:go-btn-notready', !goBtn.classList.contains('ready')); // 未满「画！」不亮
  /* 填入：颜色→形状→大小（名音绑定+槽序+返回值族 fill/fill/ready） */
  const c0 = blockIdx(q0, 'color', q0.target.color);
  const rF1 = await window.RP.tapBlock(c0);
  T('tap:fill1', rF1 === 'fill' && window.RP.quiz.slotIdx === 1 &&
    window.RP.quiz.slots[0].val === q0.target.color);
  T('tap:fill1-name', window.__lastVoiceKey === 'rp_n_' + q0.target.color);   // 名音绑定
  const s0 = blockIdx(q0, 'shape', q0.target.shape);
  const rF2 = await window.RP.tapBlock(s0);
  T('tap:fill2', rF2 === 'fill' && window.RP.quiz.slotIdx === 2);
  const z0 = blockIdx(q0, 'size', q0.target.size);
  const rF3 = await window.RP.tapBlock(z0);
  T('tap:fill3-ready', rF3 === 'ready' && window.RP.quiz.slotIdx === 3);      // 末槽填满='ready'
  T('tap:go-btn-ready', goBtn.classList.contains('ready'));   // 三槽满「画！」亮起
  /* 清槽回该轴（指令可编辑——SPEC 明示） */
  const rC = window.RP.tapSlot(0);
  T('tap:slot-clear', rC === 'clear' && window.RP.quiz.slotIdx === 0 &&
    window.RP.quiz.slots[0].val === null && window.RP.quiz.slots[1].val === q0.target.shape);
  /* 错轴可视化：改填错色（形状/大小槽保留）→ tapGo → wrong（painted=所选≠目标——忠实执行） */
  const wrongColor = SPEC_COLORS.find(c => c !== q0.target.color);
  await window.RP.tapBlock(blockIdx(q0, 'color', wrongColor));
  const fly = window.RP.tapGo();                    // 不 await：飞行中测相位吞
  const swPaint = await window.RP.tapBlock(c0);     // paint 相位点块吞（相位守卫）
  const swGo = await window.RP.tapGo();             // paint 相位重复 tapGo 吞 null
  const rW = await fly;
  const qw = window.RP.quiz;
  T('tap:paint-swallow', swPaint === null && swGo === null);   // paint/compare 相位点选吞
  T('tap:wrong-ret', rW === 'wrong');
  T('tap:wrong-miss', qw.miss === 1 && window.RP.currentLevel.miss === 1);
  T('tap:wrong-painted-chosen', !!qw.painted && qw.painted.color === wrongColor &&
    qw.painted.color !== qw.target.color && qw.judged === 'diff');   // 忠实执行非目标
  T('tap:wrong-slots-keep', qw.slots[0].val === wrongColor &&
    qw.slots[1].val === qw.target.shape && qw.slots[2].val === qw.target.size);   // 槽保留可改
  T('tap:wrong-chain', !!(window.__lastQueue && window.__lastQueue.length === 2 &&
    window.__lastQueue[0] === 'rp_wrong' && window.__lastQueue[1] === 'rp_hint' &&
    noKeyless(window.__lastQueue)));                // 错链=wrong+hint 全 clip 无 keyless
  T('tap:paint-log', JSON.stringify(window.__rpPaintLog) === JSON.stringify(['color', 'shape', 'size']));
  /* 契约 M 帧：成品=所选（data-paint 三 data==painted 错值）/目标并排在场/印记 diff */
  const gp = paperPaint.querySelector('g[data-paint]'), gt = paperGoal.querySelector('g[data-target]');
  T('tap:frame-painted', !!gp && gp.getAttribute('data-color') === wrongColor &&
    gp.getAttribute('data-shape') === qw.target.shape && gp.getAttribute('data-size') === qw.target.size);
  T('tap:frame-target', !!gt && gt.getAttribute('data-color') === qw.target.color &&
    gt.getAttribute('data-shape') === qw.target.shape && gt.getAttribute('data-size') === qw.target.size);
  T('tap:frame-compare-dom', !!document.querySelector('.frame[data-role="target"]') &&
    !!document.querySelector('.frame[data-role="painted"]') &&
    !!framePaint.querySelector('.stamp[data-judge="diff"]'));    // 比对并排+不像印记在场
  /* 豁免窗（I 补）：真时钟 5010 内重画吞 false */
  await waitPickUI();                               // 错后回 pick（比对窗保留）
  T('tap:after-wrong-pick', window.RP.quiz.phase === 'pick' && window.RP.quiz.judged === 'diff');
  const rGuard = await window.RP.tapGo();
  T('tap:guard-swallow', rGuard === false && window.RP.quiz.miss === 1);   // 豁免窗内重画吞
  await new Promise(w => setTimeout(w, 5150));      // 真时钟等豁免窗（5010）过期
  /* 窗后改槽重画 → right：确认链三段恒（right+名音×3 槽序） */
  window.RP.tapSlot(0);
  await window.RP.tapBlock(c0);
  const fly2 = window.RP.tapGo();
  const rR = await fly2;
  T('tap:repaint-right', rR === 'right');
  const doneQ = cur.quizzes[cur.step - 1];
  T('tap:right-engine', !!doneQ && doneQ.solved && doneQ.phase === 'won' &&
    doneQ.painted.color === doneQ.target.color &&
    doneQ.painted.shape === doneQ.target.shape &&
    doneQ.painted.size === doneQ.target.size);
  T('tap:confirm-chain', !!(window.__lastQueue && window.__lastQueue.length === 4 &&
    window.__lastQueue[0] === 'rp_right' &&
    window.__lastQueue.slice(1).every((k, i) =>
      k === 'rp_n_' + [doneQ.painted.color, doneQ.painted.shape, doneQ.painted.size][i]) &&
    noKeyless(window.__lastQueue)));                // 确认链=right+三段名音（槽序）
  await waitPickUI();
  T('tap:next-q', !!(window.RP.quiz && window.RP.quiz.phase === 'pick' &&
    window.RP.quiz.slotIdx === 0 && window.RP.quiz.painted === null &&
    window.RP.currentLevel.step === 1));
  units.tap = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('tap:')) };

  /* ---- ③ neg 否定指令单元（wrong=ch2 flat[1 否定轴]；right=ch4 flat[2 否定轴——双排除推理） ---- */
  const negFlatW = findFlat('neg', 6, 11), negFlatR = findFlat('neg', 24, 39);
  T('neg:flats', negFlatW >= 0 && negFlatR >= 0);
  window.RP.start(negFlatW);
  await wait(160);                                  // 开题（rp_neg 3600 异步不锁）
  const qn = window.RP.quiz;
  const negAxes = Object.keys(qn.negMap || {});
  T('neg:card-dom', !!paperGoal.querySelector('.negcard') &&
    paperGoal.querySelectorAll('.nrow').length === 3 &&
    paperGoal.querySelectorAll('.nrow[data-axis]').length === 3);   // 三轴行在场
  /* 否定行：排除芯片 data-neg=1 且不含目标值；正轴行：芯片=target 值且无 data-neg */
  let negDomOk = negAxes.length === SPEC_NEG_N[window.RP.currentLevel.dch];
  negAxes.forEach(ax => {
    const row = paperGoal.querySelector('.nrow[data-axis="' + ax + '"]');
    const chips = Array.from(row.querySelectorAll('.nchip'));
    const vals = chips.map(ch => ch.dataset.val);
    if (vals.indexOf(qn.target[ax]) >= 0) negDomOk = false;         // 排除值≠目标值
    if (!chips.every(ch => ch.dataset.neg === '1')) negDomOk = false;
    if (vals.slice().sort().join(',') !==
        SPEC_AXIS_POOL[ax].filter(v => v !== qn.target[ax]).sort().join(',')) negDomOk = false;
  });
  ['color', 'shape', 'size'].forEach(ax => {
    if (negAxes.indexOf(ax) >= 0) return;
    const row = paperGoal.querySelector('.nrow[data-axis="' + ax + '"]');
    const chip = row.querySelector('.nchip');
    if (!chip || chip.dataset.val !== qn.target[ax] || chip.dataset.neg) negDomOk = false;
  });
  T('neg:card-values', negDomOk);
  /* 错路径：填排除值（child 信打叉值）→ wrong */
  const badAx = negAxes[0];
  const badVal = qn.negMap[badAx][0];
  for (const ax of ['color', 'shape', 'size'])
    await window.RP.tapBlock(blockIdx(qn, ax, ax === badAx ? badVal : qn.target[ax]));
  const rNegW = await window.RP.tapGo();
  T('neg:wrong', rNegW === 'wrong' && window.RP.quiz.miss === 1 &&
    window.RP.quiz.painted[badAx] === badVal);      // 忠实执行排除值
  await waitPickUI();
  T('neg:reveal-after-wrong', !!paperGoal.querySelector('g[data-target]') &&
    !paperGoal.querySelector('.negcard'));         // 已判回 pick=揭示目标（不测记忆测推理）
  /* 判对路径（ch4 flat 双否定轴——封闭集补全×2；无豁免窗残留）：按补全推理填 → right */
  window.RP.start(negFlatR);
  await wait(160);
  const qn2 = window.RP.quiz;
  await fillTarget(qn2);
  const rNegR = await window.RP.tapGo();
  const nd = cur.quizzes[cur.step - 1];
  T('neg:right', rNegR === 'right' && nd.solved && nd.phase === 'won');
  /* 判对后 step 已推进——目标侧 DOM 恒与当前活题引擎真值一致（下一题为 neg/edit/mem 罩则
     合法呈卡；否则呈 g[data-target]==活题目标——渲染即引擎，比对揭示语义已由错路径覆盖） */
  const qnNext = window.RP.quiz;
  const cardish = qnNext && qnNext.phase === 'pick' && qnNext.judged === null &&
    (qnNext.kind === 'neg' || qnNext.kind === 'edit' ||
     (qnNext.kind === 'mem' && qnNext.flashDone));
  T('neg:reveal-compare', cardish
    ? !!paperGoal.querySelector('.negcard,.editcard,.memcover')
    : !!(paperGoal.querySelector('g[data-target]') &&
         paperGoal.querySelector('g[data-target]').getAttribute('data-color') === qnNext.target.color));
  T('neg:confirm-queue', !!(window.__lastQueue && window.__lastQueue.length === 4 &&
    window.__lastQueue[0] === 'rp_right' && noKeyless(window.__lastQueue)));
  units.neg = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('neg:')) };

  /* ---- ④ edit 两步修改单元（wrong=ch2 flat[1 修改]；right=ch4 flat[2 修改——双轴复合） ---- */
  const edFlatW = findFlat('edit', 6, 11), edFlatR = findFlat('edit', 24, 39);
  T('edit:flats', edFlatW >= 0 && edFlatR >= 0);
  window.RP.start(edFlatW);
  await wait(160);
  const qe = window.RP.quiz;
  /* pick 画布=起始画（契约 M：g[data-paint] 三 data==q.start——引擎真值） */
  const gStart = paperPaint.querySelector('g[data-paint]');
  T('edit:start-canvas', !!gStart && gStart.getAttribute('data-color') === qe.start.color &&
    gStart.getAttribute('data-shape') === qe.start.shape &&
    gStart.getAttribute('data-size') === qe.start.size);
  /* 修改卡锚：erow data-axis + from✗ data-neg + to✓ data-ok；from=start 值、to=target 值 */
  let edDomOk = paperGoal.querySelectorAll('.erow').length ===
    SPEC_EDIT_N[window.RP.currentLevel.dch];
  qe.edits.forEach(e => {
    const row = paperGoal.querySelector('.erow[data-axis="' + e.axis + '"]');
    if (!row) { edDomOk = false; return; }
    const f = row.querySelector('.nchip[data-neg="1"]'), o = row.querySelector('.nchip[data-ok="1"]');
    if (!f || !o || f.dataset.val !== e.from || o.dataset.val !== e.to) edDomOk = false;
    if (e.from !== qe.start[e.axis] || e.to !== qe.target[e.axis]) edDomOk = false;
  });
  T('edit:card-dom', edDomOk && !!paperGoal.querySelector('.editcard'));
  /* 错路径：忽略修改（保留起始值）→ wrong */
  for (const ax of ['color', 'shape', 'size'])
    await window.RP.tapBlock(blockIdx(qe, ax, qe.start[ax]));
  const rEdW = await window.RP.tapGo();
  T('edit:wrong', rEdW === 'wrong' && window.RP.quiz.miss === 1);   // 起始值≠终态（from≠to 保证）
  await waitPickUI();
  T('edit:reveal-after-wrong', !!paperGoal.querySelector('g[data-target]') &&
    !paperGoal.querySelector('.editcard'));
  /* 判对路径（独立 flat）：组装终态 → right */
  window.RP.start(edFlatR);
  await wait(160);
  const qe2 = window.RP.quiz;
  await fillTarget(qe2);
  const rEdR = await window.RP.tapGo();
  T('edit:right', rEdR === 'right' && cur.quizzes[cur.step - 1].solved);
  units.edit = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('edit:')) };

  /* ---- ⑤ mem 记忆复现单元（ch3 两 flat：罩住链 + 错后再罩 + 判对揭示） ---- */
  const memFlatW = findFlat('mem', 12, 17), memFlatR = memFlatW >= 0 ? findFlat('mem', memFlatW + 1, 17) : -1;
  T('mem:flats', memFlatW >= 0 && memFlatR >= 0);
  window.RP.start(memFlatW);
  await wait(220);                                  // 闪现窗内（6765*0.12≈812ms）
  T('mem:flash-locked', window.RP.state.locked === true);
  const swFlash = await window.RP.tapBlock(0);      // 闪现窗内点块：演出锁吞 false（+bump）
  const swFlashGo = await window.RP.tapGo();        // 未满槽 tapGo=null（相位/就绪守卫）
  T('mem:flash-swallow', swFlash === false && swFlashGo === null &&
    window.RP.quiz.slots.every(s => s.val === null));   // 闪现窗零填入
  /* mem 闪现链：rp_mem 单段 clip（T46 化——原 keyless 段退役，全链 clip） */
  T('mem:flash-queue', !!(window.__lastQueue && window.__lastQueue.length === 1 &&
    window.__lastQueue[0] === 'rp_mem'));
  await waitFlashDone();                            // 窗毕：罩住+解锁
  T('mem:covered', !!paperGoal.querySelector('.memcover[data-covered="1"]') &&
    !paperGoal.querySelector('g[data-target]') && window.RP.quiz.flashDone === true &&
    window.RP.state.locked === false);
  /* 错路径：凭记忆填错 → wrong → 回 pick 再罩（记后画不退化） */
  const qm = window.RP.quiz;
  const wmColor = SPEC_COLORS.find(c => c !== qm.target.color);
  for (const ax of ['color', 'shape', 'size'])
    await window.RP.tapBlock(blockIdx(qm, ax, ax === 'color' ? wmColor : qm.target[ax]));
  const rMemW = await window.RP.tapGo();
  T('mem:wrong', rMemW === 'wrong' && window.RP.quiz.miss === 1);
  await waitPickUI();
  T('mem:recover-covered', window.RP.quiz.phase === 'pick' &&
    !!paperGoal.querySelector('.memcover[data-covered="1"]'));      // 错后回 pick=再罩
  /* 判对路径（独立 flat）：闪现→罩→凭记忆填对 → right+比对揭示 */
  window.RP.start(memFlatR);
  await waitFlashDone();
  await wait(120);
  const qm2 = window.RP.quiz;
  T('mem:covered2', !!paperGoal.querySelector('.memcover[data-covered="1"]'));
  await fillTarget(qm2);                            // 凭记忆（罩住态填）
  const rMemR = await window.RP.tapGo();
  T('mem:right', rMemR === 'right' && cur.quizzes[cur.step - 1].solved);
  T('mem:reveal-compare', !!paperGoal.querySelector('g[data-target]') &&
    !paperGoal.querySelector('.memcover'));         // 比对揭示（目标并排反馈）
  units.mem = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('mem:')) };

  /* ---- ⑥ dual 双画师单元（ch3 两 flat：任务一切换链 + 任务一错累计；判对双任务在 ⑧ 冒烟） ---- */
  const dualFlatW = findFlat('dual', 12, 17), dualFlatR = dualFlatW >= 0 ? findFlat('dual', dualFlatW + 1, 17) : -1;
  T('dual:flats', dualFlatW >= 0 && dualFlatR >= 0);
  window.RP.start(dualFlatW);
  await wait(160);
  const qd = window.RP.quiz;
  T('dual:dom', easelEl.classList.contains('dual') &&
    document.querySelectorAll('#easel .frame').length === 4 &&
    document.querySelectorAll('#easel .frame.dual-only').length === 2 &&
    !!paperGoal2.querySelector('g[data-target]') && !!paperPaint2.querySelector('.artist'));
  /* 四框在场：gA/gB 目标卡 data-target==goals[0/1]；pA 活动画布；pB 待命 */
  const gA = paperGoal.querySelector('g[data-target]'), gB = paperGoal2.querySelector('g[data-target]');
  T('dual:goals-dom', !!gA && !!gB &&
    gA.getAttribute('data-color') === qd.goals[0].color &&
    gA.getAttribute('data-shape') === qd.goals[0].shape &&
    gA.getAttribute('data-size') === qd.goals[0].size &&
    gB.getAttribute('data-color') === qd.goals[1].color &&
    gB.getAttribute('data-shape') === qd.goals[1].shape &&
    gB.getAttribute('data-size') === qd.goals[1].size &&
    qd.goals[0].color + qd.goals[0].shape + qd.goals[0].size !==
      qd.goals[1].color + qd.goals[1].shape + qd.goals[1].size);    // g1≠g2
  T('dual:pair-highlight', frameGoal.classList.contains('cur') &&
    framePaint.classList.contains('cur') && !frameGoal2.classList.contains('cur'));
  /* 任务一错：miss 累计不切任务 */
  const wdColor = SPEC_COLORS.find(c => c !== qd.goals[0].color);
  for (const ax of ['color', 'shape', 'size'])
    await window.RP.tapBlock(blockIdx(qd, ax, ax === 'color' ? wdColor : qd.goals[0][ax]));
  const rDw = await window.RP.tapGo();
  T('dual:task1-wrong', rDw === 'wrong' && window.RP.quiz.miss === 1 &&
    window.RP.quiz.tIdx === 0);                     // 错不推进任务
  /* 独立 flat 判对双任务链：任务一 right→切任务二→任务二 right→solved 推进 */
  window.RP.start(dualFlatR);
  await wait(160);
  const qd2 = window.RP.quiz;
  const step0 = window.RP.currentLevel.step;
  await fillTarget(qd2);                            // 任务一（target=goals[0]）
  const rD1 = await window.RP.tapGo();
  T('dual:task1-right', rD1 === 'right' && window.RP.quiz.tIdx === 1 &&
    window.RP.quiz.t1Done === true &&
    window.RP.quiz.slots.every(s => s.val === null) &&    // 槽复位
    window.RP.quiz.slotIdx === 0 &&
    window.RP.currentLevel.step === step0);               // 任务一不推进 step
  const pA2 = framePaint.querySelector('g[data-paint]');
  T('dual:task1-settled', !!pA2 && pA2.getAttribute('data-color') === qd2.goals[0].color &&
    !!framePaint.querySelector('.stamp[data-judge="like"]') &&
    framePaint2.classList.contains('cur'));         // 画布A定格+like；画布B转活动
  const qd2b = window.RP.quiz;                      // 任务二：target=goals[1]
  T('dual:task2-target', qd2b.target.color === qd2.goals[1].color &&
    qd2b.target.shape === qd2.goals[1].shape &&
    qd2b.target.size === qd2.goals[1].size);
  await fillTarget(qd2b);
  const rD2 = await window.RP.tapGo();
  T('dual:task2-right', rD2 === 'right' && cur.quizzes[0].tIdx === 1 &&
    cur.quizzes[0].solved && window.RP.currentLevel.step === step0 + 1);   // 任务二判对才推进（step 推进后 RP.quiz 已是下一题——读引擎真值）
  units.dual = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('dual:')) };

  /* ---- ⑦ 教学链：tutorialWatch 真实走完 → __rpDemoR='right'（SPEC §3） ---- */
  KIDS._save = function () { return { levels: {} }; };      // verify 页存档 stub
  KIDS.store.persist = function () {};
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                     // 折算真实页时长
  T('tut:demoR', window.__rpDemoR === 'right');
  T('tut:help', state.tut === 'help' && cur.flat === 0 && !cur.tutLevel);
  T('tut:real-q2', !cur.quizzes[0].slots.some(s => s.val) &&   // turn 首题=定制「黄色小方形」三槽全空
    cur.quizzes[0].target.color === 'yel' &&
    cur.quizzes[0].target.shape === 'squ' &&
    cur.quizzes[0].target.size === 'small');
  T('tut:demo-log', JSON.stringify(window.__rpDemoLog) === JSON.stringify(['red', 'cir', 'big']));
  /* 预算：真实页名义 ≈3684+3×980+1176+2400+2052+8634+2316 ≈ 24.9s（SPEC §4 无教学上限，
     verify 折算把每步 await 真实开销放大 1/0.12≈8.3 倍——放宽余量 2600ms */
  T('tut:budget', tw <= 27500);
  await waitPickUI();
  T('tut:q0-pick', !!(window.RP.quiz && window.RP.quiz.phase === 'pick'));
  units.tutorial = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('tut:')),
                     demoR: window.__rpDemoR, watchMs: Math.round(tw) };

  /* ---- ⑧ UI 冒烟：五题型各一关 autoSolve 通关（taps=结构推导）+ flat12 先 1 错再解 ---- */
  const tapsOf = f => genLevel(f).quizzes.reduce((s, q) => s + (q.kind === 'dual' ? 8 : 4), 0);
  window.RP.start(0);
  const a0 = await window.RP.autoSolve();
  T('smoke:flat0', a0.done && a0.taps === tapsOf(0) && a0.taps === 24 &&
    engStars(cur) === 3 && window.RP.currentLevel.done);
  window.RP.start(negFlatR);
  const aNeg = await window.RP.autoSolve();
  T('smoke:neg', aNeg.done && aNeg.taps === tapsOf(negFlatR));
  window.RP.start(edFlatR);
  const aEd = await window.RP.autoSolve();
  T('smoke:edit', aEd.done && aEd.taps === tapsOf(edFlatR));
  window.RP.start(memFlatR);
  const aMem = await window.RP.autoSolve();
  T('smoke:mem', aMem.done && aMem.taps === tapsOf(memFlatR));
  window.RP.start(dualFlatR);
  const aDu = await window.RP.autoSolve();
  T('smoke:dual', aDu.done && aDu.taps === tapsOf(dualFlatR) &&
    genLevel(dualFlatR).quizzes.some(q => q.kind === 'dual'));   // 结构推导：每题 3填+1画（dual×2轮）
  window.RP.start(12);
  await wait(160);
  const q12 = window.RP.quiz;
  const wc12 = SPEC_COLORS.find(c => c !== q12.target.color);
  if (q12.kind === 'mem') await waitFlashDone();    // mem 首题先等闪现毕
  await window.RP.tapBlock(blockIdx(q12, 'color', wc12));
  await window.RP.tapBlock(blockIdx(q12, 'shape', q12.target.shape));
  await window.RP.tapBlock(blockIdx(q12, 'size', q12.target.size));
  const r12w = await window.RP.tapGo();             // 先 1 错（豁免窗内 autoSolve 自旋等窗）
  const a12 = await window.RP.autoSolve();
  /* 首 1 错题 autoSolve=清错轴 1 填+1 画（该题比满分路径少 2 taps——dual 任务一错亦同） */
  T('smoke:flat12', r12w === 'wrong' && a12.done && a12.taps === tapsOf(12) - 2 &&
    window.RP.currentLevel.miss === 1 && engStars(cur) === 2);
  smokes.auto = { ok: !units.__failList || !units.__failList.some(n => n.startsWith('smoke:')),
                  taps: { flat0: a0.taps, neg: aNeg.taps, edit: aEd.taps,
                          mem: aMem.taps, dual: aDu.taps, flat12: a12.taps } };

  /* ---- ⑨ 帧内容断言（契约 M：渲染即引擎——按 kind 目标侧+画布侧 DOM 与 quiz 真值对应） ---- */
  const AXIS_ZH = { color: '颜色', shape: '形状', size: '大小' };
  const frameCheck = q => {
    const blocks = Array.from(boardEl.querySelectorAll('.block'));
    const domOk = blocks.length === q.blocks.length &&
      blocks.every(b => Number(b.dataset.i) >= 0 &&
        b.getAttribute('data-axis') === q.blocks[Number(b.dataset.i)].axis &&
        q.blocks[Number(b.dataset.i)].val === b.dataset.val &&
        b.querySelectorAll('svg').length === 1 &&
        b.querySelector('.c-name').textContent === SPEC_NAMES[b.dataset.val]);
    const slots = Array.from(slotsEl.querySelectorAll('.slot'));
    const slotOk = slots.length === 3 &&
      slots.every((s, i) => s.getAttribute('data-axis') === q.slots[i].axis &&
        s.querySelector('.s-axis').textContent === AXIS_ZH[q.slots[i].axis] &&
        (q.slots[i].val ? (s.dataset.val === q.slots[i].val && !!s.querySelector('svg'))
                        : (!s.dataset.val && !s.querySelector('.s-val svg'))));
    /* 目标侧按 kind：pattern 卡 / neg 卡 / edit 卡 / mem 罩（pick 已罩时） */
    let tgtOk;
    const covered = q.kind === 'mem' && q.phase === 'pick' && q.flashDone;
    if (q.kind === 'neg' && q.phase === 'pick' && q.judged === null) {
      tgtOk = !!paperGoal.querySelector('.negcard') && !paperGoal.querySelector('g[data-target]');
    } else if (q.kind === 'edit' && q.phase === 'pick' && q.judged === null) {
      tgtOk = !!paperGoal.querySelector('.editcard') && !paperGoal.querySelector('g[data-target]');
    } else if (covered) {
      tgtOk = !!paperGoal.querySelector('.memcover[data-covered="1"]') &&
              !paperGoal.querySelector('g[data-target]');
    } else {
      const gt2 = paperGoal.querySelector('g[data-target]');
      tgtOk = !!gt2 && gt2.getAttribute('data-color') === q.target.color &&
        gt2.getAttribute('data-shape') === q.target.shape &&
        gt2.getAttribute('data-size') === q.target.size;
    }
    /* 画布侧：painted 定格 / edit pick=起始画 / 未画=画师待命 */
    let paintOk;
    if (q.painted) {
      const gp2 = paperPaint.querySelector('g[data-paint]');
      paintOk = !!gp2 && gp2.getAttribute('data-color') === q.painted.color &&
        gp2.getAttribute('data-shape') === q.painted.shape &&
        gp2.getAttribute('data-size') === q.painted.size;
    } else if (q.kind === 'edit' && q.phase === 'pick') {
      const gs = paperPaint.querySelector('g[data-paint]');
      paintOk = !!gs && gs.getAttribute('data-color') === q.start.color &&
        gs.getAttribute('data-shape') === q.start.shape &&
        gs.getAttribute('data-size') === q.start.size;
    } else {
      paintOk = !!paperPaint.querySelector('.artist') && !paperPaint.querySelector('g[data-paint]');
    }
    return domOk && slotOk && tgtOk && paintOk;
  };
  window.RP.start(0);
  await waitPickUI(); await wait(50);
  const f0 = frameCheck(window.RP.quiz);
  await window.RP.tapBlock(blockIdx(window.RP.quiz, 'color', window.RP.quiz.target.color));
  const f0m = frameCheck(window.RP.quiz);           // plain 填一槽后（含已填槽帧）
  window.RP.start(negFlatR);
  await wait(160);
  const fNeg = frameCheck(window.RP.quiz);
  window.RP.start(edFlatR);
  await wait(160);
  const fEd = frameCheck(window.RP.quiz);
  window.RP.start(memFlatR);
  await waitFlashDone(); await wait(60);
  const fMem = frameCheck(window.RP.quiz);          // 罩住态
  window.RP.start(dualFlatR);
  await wait(160);
  const fDu = frameCheck(window.RP.quiz);
  await window.RP.tapBlock(blockIdx(window.RP.quiz, 'color', window.RP.quiz.target.color));
  const fDuM = frameCheck(window.RP.quiz);          // dual 填一槽后
  T('frame:flat0', f0);
  T('frame:flat0-filled', f0m);
  T('frame:neg', fNeg);
  T('frame:edit', fEd);
  T('frame:mem', fMem);
  T('frame:dual', fDu);
  T('frame:dual-filled', fDuM);
  units.frame = { ok: f0 && f0m && fNeg && fEd && fMem && fDu && fDuM };

  /* ---- ⑩ 布局：双 viewport × 五题型——块与槽 ≥48（SPEC 触摸下限）、「画！」≥48 ---- */
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
    window.RP.start(g._simFlat);
    if (g._simKind === 'mem') await waitFlashDone();
    else await waitPickUI();
    await wait(80);
    const blocks = Array.from(boardEl.querySelectorAll('.block')).map(b => ({ w: b.offsetWidth, h: b.offsetHeight }));
    const slots = Array.from(slotsEl.querySelectorAll('.slot')).map(s => ({ w: s.offsetWidth, h: s.offsetHeight }));
    const frames = Array.from(document.querySelectorAll('.frame'))
      .map(f => f.offsetWidth).filter(fw => fw > 0);          // 可见画框（dual-only 默认藏）
    const hitOk = blocks.length === 8 && slots.length === 3 &&
      blocks.every(b => b.w >= 48 && b.h >= 48) && slots.every(s => s.w >= 48 && s.h >= 48) &&
      goBtn.offsetWidth >= 48 && goBtn.offsetHeight >= 48;   // SPEC ≥48 触摸目标
    const frameOk = frames.length === (g._simKind === 'dual' ? 4 : 2) && frames.every(fw => fw >= 120);
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
      ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.block')).borderLeftColor), '#FFF9EE') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, kind: g._simKind, blocks: blocks.length,
             robH: Math.max.apply(null, frames), frames: frames.length,
             hitOk: hitOk, frameOk: frameOk, contrast: cB, ox: ox,
             pass: hitOk && frameOk && cB && ox <= 0 };
  }
  const sims = [];
  for (const sf of [0, negFlatR, edFlatR, memFlatR, dualFlatR]) {
    $id('game')._simFlat = sf;
    $id('game')._simKind = genLevel(sf).quizzes[0].kind;
    sims.push(await simView(1280, 800));
    sims.push(await simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  const layoutOk = sims.every(s => s.pass);
  T('layout:all', layoutOk);
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑪ clips：rp_ 20 条（T46 化+mem 1）+ core 3 条=23 全注入 + duration 辨别器（±60ms） ---- */
  const keys = Object.keys(KIDS.voice.clips);
  const rpKeys = ['rp_tut_watch', 'rp_tut_turn', 'rp_hint', 'rp_right', 'rp_wrong',
                  'rp_q', 'rp_go', 'rp_like', 'rp_neg', 'rp_edit', 'rp_dual', 'rp_mem'].concat(
                  SPEC_COLORS.map(c => 'rp_n_' + c), SPEC_SHAPES.map(s => 'rp_n_' + s),
                  SPEC_SIZES.map(s => 'rp_n_' + s));
  const needAll = rpKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 23 &&
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

  /* ---- ⑫ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  const LA = genLevel(12);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;
  T('stars:3', st3);
  T('stars:2', st2a && st2b);
  T('stars:1', st1 && stFloor);
  units.stars = { ok: st3 && st2a && st2b && st1 && stFloor };

  /* ---- ⑬ 契约源码断言（script[2]=纯游戏块——data+engine+main；verify 独立第 4 块不自匹配）
     A/B/E/F/I/I补/J/K/MIG + 演出相位 idle 豁免 + keyless 恒唯一恒尾 + 文案红线 ---- */
  const src = document.querySelectorAll('script')[2].textContent;
  const lim1Count = src.split('nextHint(lim - 1)').length - 1;
  const srcA = lim1Count === 2 &&                                  // A：winFlow+启动双 lim-1
               src.indexOf('nextHint(' + 'null)') < 0 &&           // 原 null 实参形态废止（拼接防自匹配）
               src.indexOf('Math.max(0, lim - 1)') >= 0;           // 启动日末停留
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.robotpaint && sv.robotpaint.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&     // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 5010') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcI2 = src.indexOf('!demo && wrongChainUntil && Date.now() < wrongChainUntil') >= 0;   // I 补
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;              // J：语义链 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcIdle = src.indexOf("q.phase !== 'pick') return;") >= 0;   // paint/compare 演出相位豁免 idle
  /* Mj-1 T46 化：零 keyless（mem 闪现句=rp_mem clip 单段链）——出现即 fail */
  const nkCount = src.split('{ key:' + ' null').length - 1;
  const srcNK = nkCount === 0 &&
    src.indexOf('KIDS.voice.queue([VOICE.mem.key])') >= 0;      // mem 闪现链=rp_mem clip
  const srcT = src.indexOf("setProperty('--t'") >= 0;           // CSS 动画 SPEED 换算声明在场
  /* MIG：键基迁移 IIFE（CH_LEN 5→6）——矛盾态+脏键守卫+先于 KIDS.init */
  const iMig = src.indexOf("localStorage.getItem('kidsgame_robotpaint')");
  const iInit = src.indexOf("KIDS.init(");
  const srcMIG = iMig >= 0 && iInit >= 0 && iMig < iInit &&
    src.indexOf("lv[(c - 1) + '-5']") >= 0 &&                   // 旧基矛盾态检测（c-1 章 5 关）
    src.indexOf("+m[2] > CH_LEN - 1") >= 0 &&                   // 关号域上界（章号上界放开）
    src.indexOf("+m[1] < 1") >= 0;
  /* estMs 四方：游戏块恰一处定义（data）——main 禁重复声明 */
  const srcEst = src.split('const estMs').length - 1 === 1;
  /* 文案红线（SPEC §0.81/任务书）：词边界检测——PAINT 等常量内嵌子串不误伤 */
  var REDLINE_RE = new RegExp('\\u4eba\\u5de5\\u673a\\u80fd|\\bA' + 'I\\b');
  const srcNoAI = !REDLINE_RE.test(src) && document.title === '机器画师';
  T('ctr:A', srcA); T('ctr:B', srcB); T('ctr:E', srcE); T('ctr:F', srcF);
  T('ctr:I', srcI); T('ctr:I2', srcI2); T('ctr:J', srcJ); T('ctr:K', srcK);
  T('ctr:idle-exempt', srcIdle); T('ctr:keyless-single-tail', srcNK); T('ctr:t-var', srcT);
  T('ctr:mig-iife', srcMIG); T('ctr:estms-single-def', srcEst); T('ctr:no-ai-words', srcNoAI);
  units.contract = { ok: srcA && srcB && srcE && srcF && srcI && srcI2 && srcJ && srcK &&
                             srcIdle && srcNK && srcT && srcMIG && srcEst && srcNoAI };

  /* ---- ⑭ 章末预告独立硬编码对账 + 生成关 nextHint 实算对账 ---- */
  const hintOk = [1, 2, 3, 4].every(i => CHAPTERS[i].hint === SPEC_CHAPTER_HINTS[i]) &&
    GEN_HINTS.every((h, i) => h === SPEC_GEN_HINTS[i]) &&
    nextHint(5) === SPEC_CHAPTER_HINTS[1] &&       // 章末（ch1 打完）预告 ch2 文案
    nextHint(11) === SPEC_CHAPTER_HINTS[2] &&
    nextHint(17) === SPEC_CHAPTER_HINTS[3] &&
    nextHint(23) === SPEC_CHAPTER_HINTS[4];
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  T('hints:chapters', hintOk);
  T('hints:gen', genOk);
  T('hints:gen-dch4', [24, 30, 36, 39].every(f => genLevel(f).dch === 4));   // 生成关恒 dch4
  T('hints:gen-domain', genCombos.size === 18);    // 96 题 18 组合域聚满全域（SPEC 验收⑧精确口径；修复闭环 min-1）
  units.hints = { ok: hintOk && genOk };

  /* ---- ⑮ 窗数学（SPEC §4+r18 实长表独立复算；SPEC 常量勿引页面 GO_MS/CONFIRM_WIN 等） ---- */
  const D = SPEC_DUR;
  const winPaint = 3876 >= D.rp_go + 3 * 800 + 300 && D.rp_go + 3 * 800 + 300 === 3876;   // 作画演出窗恒等
  const winLike = 2052 === D.rp_like + 300;                                       // like 前导窗
  const winConf = 8634 === D.rp_right + 150 + 3 * D.rp_n_tri + 300;               // 确认链三段（max 名音）
  const winWrong = 5010 === D.rp_wrong + 150 + D.rp_hint + 300;                   // 错链豁免窗
  const winWatch = 3684 >= D.rp_tut_watch + 300;                                  // 教学 watch 延
  const winTurn = 2316 >= D.rp_tut_turn + 300;                                    // turn 后首题延
  const memLen = SPEC_MEM_TEXT.length;                                            // 17 全字符
  const winFlash = FLASH_WIN === estMs(memLen) + 300 && estMs(memLen) === 6465 &&
                   FLASH_WIN === 6765;                                            // 家族 T 实算（§-r18）
  const winOpen = voiceWinMs({ kind: 'plain' }) === D.rp_q + 300 &&               // 开题窗=clip+300
                  voiceWinMs({ kind: 'neg' }) === D.rp_neg + 300 &&
                  voiceWinMs({ kind: 'edit' }) === D.rp_edit + 300 &&
                  voiceWinMs({ kind: 'dual' }) === D.rp_dual + 300 &&
                  voiceWinMs({ kind: 'mem' }) === FLASH_WIN;
  /* 页面常量钉死（防漂移——实现常量与 SPEC 恒等式双核对） */
  const constOk = PAINT_WIN === 3876 && LIKE_WIN === 2052 && CONFIRM_WIN === 8634 &&
                  WRONG_CHAIN_MS === 5010 && GO_MS === 1176 &&
                  PAINT_STEP_MS === 800 && MAX_NAME_DUR === D.rp_n_tri &&
                  MEM_TEXT === SPEC_MEM_TEXT;
  T('win:paint', winPaint && PAINT_WIN === 3876);
  T('win:like', winLike);
  T('win:conf', winConf && CONFIRM_WIN === 8634);
  T('win:wrong', winWrong && WRONG_CHAIN_MS === 5010);
  T('win:watch', winWatch);
  T('win:turn', winTurn);
  T('win:flash', winFlash);
  T('win:openers', winOpen);
  T('win:consts', constOk);
  units.estWin = { ok: winPaint && winLike && winConf && winWrong && winWatch &&
                          winTurn && winFlash && winOpen && constOk,
                   flash: FLASH_WIN };

  /* ---- ⑯ 时长模型钉死（verify 侧独立推导；selftest 双钉对账） ---- */
  const PERF = 1176 + 3 * 800 + 2052 + 8634;                 // PERF_RIGHT_MS=14262（判对演出链实码）
  const m0 = modeled(0);
  let minModeled = Infinity;
  const voiceOkAll = [], levelMinOk = [];
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const m = levelDurMs(L);
    if (m < minModeled) minModeled = m;
    levelMinOk.push(m >= LEVEL_MIN_MS);
    for (const q of L.quizzes) voiceOkAll.push(voiceWinMs(q) <= DECIDE_MS[q.kind]);
  }
  const mdOk = m0 === SPEC_MODELED_MIN && minModeled === SPEC_MODELED_MIN &&   // 最低=ch1 全 plain 关
    m0 === 900 + SPEC_CH_LEN * (SPEC_DECIDE.plain + PERF) &&                   // 独立推导恒等式
    PERF_RIGHT_MS === PERF &&
    DECIDE_MS.plain === SPEC_DECIDE.plain && DECIDE_MS.neg === SPEC_DECIDE.neg &&
    DECIDE_MS.edit === SPEC_DECIDE.edit && DECIDE_MS.mem === SPEC_DECIDE.mem &&
    DECIDE_MS.dual === SPEC_DECIDE.dual &&
    voiceOkAll.every(Boolean) && levelMinOk.every(Boolean);
  T('modeled:flat0', m0 === SPEC_MODELED_MIN);
  T('modeled:min40', minModeled === SPEC_MODELED_MIN);
  T('model:identity', PERF_RIGHT_MS === PERF &&
    m0 === 900 + SPEC_CH_LEN * (SPEC_DECIDE.plain + PERF));
  T('model:decide-voiceWin', voiceOkAll.every(Boolean) && levelMinOk.every(Boolean));
  units.modeled = { ok: mdOk, flat0: m0, min: minModeled, perfect: PERF_RIGHT_MS };

  /* ---- ⑰ verify 提速断言（SPEED + CSS --t 换算生效） ---- */
  const tVar = getComputedStyle(document.documentElement).getPropertyValue('--t').trim();
  const speedOk = SPEED === 0.12 && (tVar === '0.12' || Math.abs(parseFloat(tVar) - 0.12) < 1e-6);
  T('speed', speedOk);
  units.speed = { ok: speedOk, SPEED: SPEED, tVar: tVar };

  const out = { game: 'robotpaint', total: total, pass: npass, layoutOk: layoutOk,
                failList: units.__failList || [], levels: levels, gen: gen,
                units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__rpVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；
     voice.queue 记录拼播链（__lastQueue，含 keyless 对象段）供反馈链/确认链/闪现链断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length
      ? (typeof parts[0] === 'string' ? parts[0] : (parts[0] && parts[0].key)) : null;
  };
  runVerify();
}
