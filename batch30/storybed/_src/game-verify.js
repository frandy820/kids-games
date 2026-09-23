/* ================= ?verify=1 自检 v2（r10；仅 verify 分支加载执行，70+ 单元）
   ① 40 关全量审计（flat 0-39，逐关计项）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null：order 池 4/干扰池 5/rain 池 5 含伞/miss 候选 4 链缺 1/
     卡池互异、乱序非正序、初始态干净）/ 章号映射 / 引擎直驱（逐题按**独立合法集**点完：
     'step'…末步 'right'/末题 'done'，phase 逐步推进，3 星）/ **cogHard 认知时长硬断言**
     （每关 Σ题认知 ≥40000ms 且 >动画基线——审计「时长全靠动画撑」正面回应）
   ② SPEC 独立对账（独立硬编码表，禁抄实现常量——双录对账）：流程封闭 6×24 步逐条 /
     依赖表 DEPS 逐流程逐号 / RAIN_DEPS / COG 认知模型数字 / 章型池深 / 干扰∉本流程 /
     flat0q0=sleep 3 步锚点 / flat10q0=rain 5 卡锚点 / 文案表
   ③ tapCard 返回值族（真实 UI 状态机）：step/right/done/wrong/null（越界+吞输入）
     / 已点 .done 卡再点=wrong 同口径 / miss 累计 / phase 推进
   ④ 逐点驱动全题：合法集逐点（含 rain 5 步）（phase 逐点断言+槽亮计数）
   ⑤ 帧内容断言（家族 M）：卡 DOM 序==卡池（data-sid 对账）+ .done 类切换==p.done +
     顺序条亮槽数==已点数 + **miss 链 DOM（preset 3+gap 1，补对后 gap→lit）**；错卡驱动后同样对账
   ⑥ 教学链：tutorialWatch 真实走完 → __sbDemoR==='right'（终值语义）且 tut='help'，
     watch 折算真实时长 ≤16s；锚点=sleep 前 3 步（可换序演示=合法序之一）
   ⑦ 教学三段收口：help 态首步排对 → solo 放手
   ⑧ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑨ 家族 A/B/D/F/I/J/K 源码级断言（Function.toString 含关键串）
   ⑩ keylessLast（契约 N）：三句族错链（wrong/distract/**miss**）尾段 {key:null,语义句}
     恒居链尾；确认链与逐点链全 clip 无 keyless
   ⑪ clips：stb_ 34 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4+§6.6 实长 ±60ms）
   ⑫ 布局：双 viewport（1280×800 / 800×1180 body.port 通道——纪律⑥）×（flat0 order 4 卡 /
     flat10 rain 5 卡 / flat15 miss 4 候选）：卡 ≥96×96、槽 ≥56×56、题面 ≥64、描边对比度 ≥3:1、
     overflowX ≤0、卡 rect 落 #board 容器、竖屏窄槽样式通道生效（78px）
   ⑬ verify 提速断言：SPEED=0.12
   ⑭ 语音窗动态断言（estMs 全字符口径 n×345+600）：判对窗 5200 ≥2520+150+1896+300；
     错链豁免 7100 ≥2496+150+estMs(10)+300（罩三句族最长）；教学演示窗 3400 ≥3096+300；
     turn 延 2100 ≥1776+300；逐点链 ≤13000；伞步音 1608<1896 不破步音上界
   ⑮ 章分布聚合：ch1 全 order 池 4 / ch2 全 order 池 5 / ch3 rain 池 5+order 池 5 混合且每关
     ≥2 rain / ch4 全 miss 候选 4 / 生成关四型全现 / sleep 流程在场
   ⑯ 存档契约（家族 C）：KIDS.init 写 kidsgame_storybed 带 v:'1.0'
   ⑰ UI 冒烟：[0,5,10,15,19] 全章型覆盖 autoSolve 通关 3★（taps=Σ(order/rain 步骤数, miss 题 1)）
   ⑱ 章末预告：CHAPTERS[i].hint↔下一章特征（独立副本逐点 0-19）+ GEN_HINTS[k]↔dch=k+1 +
     生成关 nextHint 实算（家族 F，20-39 全量）+ **off-by-one 哨兵**（hintChSentinel：
     章末预告=下一章 hint ≠本章 hint——右移错必炸）
   ⑲ 契约 I 运行时：flat<3 wrong 起播设豁免窗；flat≥3 节流跳过不设窗
   ⑳ miss≥2 答案级线索：一错不亮、二错亮合法卡（梯度脚手架）
   M1 multiOrder 可换序多解实锤（delta①）：同一题两种**不同**合法序都通关（引擎级双驱动）；
     非法序（前置未完成）=wrong；可换对>0 题在场哨兵（找不到=单元 fail 不静默）
   M2 rainInsert 条件分支插入（delta②）：flat10q0=rain 且 pool 含 out_4 带小伞；
     先点出门玩=wrong（前置缺伞）；穿衣→伞=合法变通；普通 ch2 out 题无伞；#cond DOM 在场
   M3 missGap 缺步补卡（delta③）：chain 4 槽恰 1 null=缺口（missingId 从 SPEC 表独立推导）；
     候选 4=真值+3 干扰；点干扰=wrong+miss 句；点真值=right/末题 done；缺口槽 DOM 补后 lit
   结果写 #verify-result + window.__sbVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- SPEC-BATCH30 §0.74+§6 独立硬编码表（禁抄页面 FLOWS/DEPS/COG/文案/引擎函数） ---- */
  const SPEC_FLOWS = {
    sleep: ['刷牙', '洗脸', '穿睡衣', '上床睡觉'],
    getup: ['睁开眼睛', '穿衣', '刷牙', '吃早餐'],
    washhand: ['卷起袖子', '冲湿小手', '搓搓泡泡', '擦干小手'],
    eat: ['洗手', '坐坐好', '吃饭饭', '擦擦嘴巴'],
    out: ['穿衣服', '穿鞋子', '背小书包', '出门玩'],
    bath: ['脱衣服', '冲冲水', '搓搓澡', '擦干穿衣']
  };
  const SPEC_FLOW_ORDER = ['sleep', 'getup', 'washhand', 'eat', 'out', 'bath'];
  /* §6.1 依赖表（步骤固有号 → 前置号集；独立重列禁引页面 DEPS） */
  const SPEC_DEPS = {
    sleep:    { 0: [], 1: [], 2: [], 3: [0, 1, 2] },
    getup:    { 0: [], 1: [0], 2: [0], 3: [1, 2] },
    washhand: { 0: [], 1: [0], 2: [1], 3: [2] },
    eat:      { 0: [], 1: [], 2: [0, 1], 3: [2] },
    out:      { 0: [], 1: [0], 2: [0], 3: [1, 2] },
    bath:     { 0: [], 1: [0], 2: [1], 3: [2] }
  };
  /* §6.2 rain 五步依赖（4=带小伞） */
  const SPEC_RAIN_DEPS = { 0: [], 1: [0], 2: [0], 4: [0], 3: [1, 2, 4] };
  /* §6.5 认知模型数字表 */
  const SPEC_COG = { baseStep: 2200, swapPair: 900, distract: 1100, condRead: 2600,
                     missScan: 1000, missInfer: 2000, missCand: 900 };
  const SPEC_SENT = { watch: '看！把事情排排队', turn: '你来排一排', hint: '想想先做什么',
                      right: '排对啦，真厉害', wrong: '再想想先做什么',
                      q: '先做什么呀', next: '然后呢',
                      qr: '明天下雨，出门记得带伞', qm: '少了哪一步呀',
                      guide: '再想想现在做哪一件事', distract: '这一步不在这个流程里',
                      mguide: '再看看少了哪一步' };
  const SPEC_DUR = { 'stb_tut_watch': 3096, 'stb_tut_turn': 1776, 'stb_hint': 2040, 'stb_right': 2520,
                     'stb_wrong': 2496, 'stb_q': 1896, 'stb_next': 1488,
                     'stb_q_rain': 3312, 'stb_q_miss': 1992, 'stb_s_out_4': 1608,
                     'stb_s_sleep_3': 1896, 'stb_s_bath_0': 1560, 'stb_s_washhand_1': 1848,
                     'stb_g_wrong': 3120, 'stb_g_distract': 2880, 'stb_g_miss': 2592 };   // T46 阶段2 三句族
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字符+600 落地余量（全字符含标点）
  /* Mj-1 防回归断言（keylessLast）已随 T46 阶段2 三句族 clip 化退役——全款 {key:null} 段清零
     （语义句=stb_g_wrong/distract/miss 键段，text=TTS 兜底） */
  /* 独立合法集（禁用引擎 legalSteps——SPEC §6.1 口径：未完成∧前置⊆已完成；miss 题=[missingId]） */
  const specLegal = q => {
    if (!q || q.solved) return [];
    if (q.kind === 'miss') return [q.missingId];
    const dep = q.kind === 'rain' ? SPEC_RAIN_DEPS : SPEC_DEPS[q.flow];
    const done = new Set(q.placed);
    return q.stepIds.filter(id => {
      if (done.has(id)) return false;
      const n = +id.split('_')[1];
      return (dep[n] || []).every(d => done.has(q.flow + '_' + d));
    });
  };
  /* 独立可换对数（无约束路径对：SPEC_DEPS 传递闭包） */
  const specSwapPairs = (flow, five) => {
    const ids = five ? [0, 1, 2, 3, 4] : [0, 1, 2, 3];
    const dep = five ? SPEC_RAIN_DEPS : SPEC_DEPS[flow];
    const reach = (a, b) => dep[a].indexOf(b) >= 0 || dep[a].some(m => reach(m, b));
    let n = 0;
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++)
        if (!reach(ids[i], ids[j]) && !reach(ids[j], ids[i])) n++;
    return n;
  };
  /* 独立认知时长（§6.5 口径）与动画基线（零错路径：step 锁 640/步+判对窗 5200/题） */
  const specCog = q => {
    if (q.kind === 'miss') return q.chainSteps.length * SPEC_COG.missScan + SPEC_COG.missInfer + q.pool.length * SPEC_COG.missCand;
    const five = q.kind === 'rain';
    let ms = (five ? 5 : q.stepIds.length) * SPEC_COG.baseStep + specSwapPairs(q.flow, five) * SPEC_COG.swapPair;
    if (five) ms += SPEC_COG.condRead;
    else ms += q.pool.filter(p => q.stepIds.indexOf(p.stepId) < 0).length * SPEC_COG.distract;
    return ms;
  };
  const specAnim = L => L.quizzes.reduce((s, q) =>
    s + (q.kind === 'miss' ? 5200 : q.stepIds.length * 640 + 5200), 0);
  /* 独立合法卡位（SPEC 口径：合法集在池中的展示位全列）/ 错卡位（前置未完成优先，干扰次之） */
  const specLegalIdxs = q => {
    const ls = specLegal(q), out = [];
    q.pool.forEach((p, i) => { if (ls.indexOf(p.stepId) >= 0) out.push(i); });
    return out;
  };
  const specWrongIdx = q => {
    let dep = -1, other = -1;
    q.pool.forEach((p, i) => {
      if (specLegal(q).indexOf(p.stepId) >= 0) return;
      if (q.stepIds.indexOf(p.stepId) < 0) { if (dep < 0) dep = i; }
      else if (other < 0) other = i;
    });
    return other >= 0 ? other : dep;               // order 题=前置未完优先（干扰位兜底）
  };
  const specDistractIdx = q => {
    for (let i = 0; i < q.pool.length; i++)
      if (q.stepIds.indexOf(q.pool[i].stepId) < 0) return i;
    return -1;
  };
  /* 帧内容断言器（家族 M）：卡 DOM==卡池 + .done 类切换 + 顺序条亮槽数 + miss 链槽型 */
  const domBoardOk = q => Array.from(boardEl.querySelectorAll('.card')).every(el =>
    q.pool[+el.dataset.i] && el.dataset.sid === q.pool[+el.dataset.i].stepId &&
    el.classList.contains('done') === q.pool[+el.dataset.i].done);
  const domLit = () => Array.from(stripEl.querySelectorAll('.slot.lit')).length;
  const domChainOk = q => {                        // miss 题链 DOM：4 槽=preset3+gap1（lit 只在补对后）
    const slots = Array.from(stripEl.querySelectorAll('.slot'));
    if (slots.length !== 4) return false;
    const pre = slots.filter(s => s.classList.contains('preset')).length;
    const gap = slots.filter(s => s.classList.contains('gap')).length;
    const lit = slots.filter(s => s.classList.contains('lit')).length;
    return pre === 3 && gap === 1 && lit === (q.solved ? 1 : 0);
  };

  /* ---- ① 40 关全量审计（flat 0-39，逐关计项+cogHard 认知硬断言） ---- */
  const chAgg = { 1: [], 2: [], 3: [], 4: [] }, genDch = {};
  let sleepSeen = 0;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = flat < 20 ? L1.dch === Math.floor(flat / 5) + 1
                           : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* 引擎直驱：逐题按独立合法集点完 → 'step'…末步 'right' / 末题 'done'；零错 3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      let g = 0;
      while (!q.solved && g++ < 12) {
        const ls = specLegal(q);
        if (!ls.length) { driveOk = false; break; }
        let i = -1;
        for (let c = 0; c < q.pool.length; c++) if (q.pool[c].stepId === ls[0]) { i = c; break; }
        if (i < 0) { driveOk = false; break; }
        const r = engTap(L3, i);
        const want = q.solved ? (k === CH_LEN - 1 ? 'done' : 'right') : 'step';
        if (r !== want) { driveOk = false; break; }
      }
      if (!q.solved || q.miss !== 0) driveOk = false;
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* cogHard：认知 ≥40000 且 >动画基线（独立复算——审计「时长全靠动画撑」门禁） */
    const cogMs = L1.quizzes.reduce((s, q) => s + specCog(q), 0);
    const animMs = specAnim(L1);
    const cogOk = cogMs >= 40000 && cogMs > animMs;
    /* 聚合（⑮ 数据源） */
    if (flat < 20) chAgg[L1.dch].push(L1.quizzes.map(q => q.pool.length + '/' + q.dch + '/' + q.kind));
    L1.quizzes.forEach(q => { if (q.flow === 'sleep') sleepSeen++; });
    if (flat >= 20) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && cogOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, cogOk: cogOk,
                  cog: cogMs, anim: animMs,
                  kinds: L1.quizzes.map(q => q.kind + '/池' + q.pool.length + '/型' + q.dch) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② SPEC 独立对账（独立表推导 × 40 关全题 + 流程表 + 依赖表 + 认知模型 + 文案表） ---- */
  total++;
  let tableOk = true, badCase = null;
  /* 流程封闭 6×24 步逐条（表序+步文本双录） */
  const flowsOk = JSON.stringify(FLOW_IDS) === JSON.stringify(SPEC_FLOW_ORDER) &&
    SPEC_FLOW_ORDER.every(f => {
      const ref = SPEC_FLOWS[f];
      if (FLOWS[f].steps.length !== ref.length) return false;
      return ref.every((t, n) => FLOWS[f].steps[n].t === t);
    });
  /* 依赖表逐流程逐号（DEPS 双录；rain 题依赖=SPEC_RAIN_DEPS） */
  const depsOk = FLOW_IDS.every(f => {
    const js = DEPS[f], ref = SPEC_DEPS[f];
    return [0, 1, 2, 3].every(n => JSON.stringify(js[n]) === JSON.stringify(ref[n]));
  }) && JSON.stringify(RAIN_DEPS) === JSON.stringify(SPEC_RAIN_DEPS);
  /* 认知模型数字表逐键（COG 双录） */
  const cogOk2 = Object.keys(SPEC_COG).every(k => COG[k] === SPEC_COG[k]);
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    let nRainQ = 0;
    const orderFlows = new Set();
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const ref = SPEC_FLOWS[q.flow];
      if (!ref) { badCase = 'flow ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.kind === 'miss') {                             // ---- miss 型：链缺 1+候选 4 ----
        if (q.stepIds.length !== 4) { badCase = 'missN ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.gapIdx < 0 || q.gapIdx > 3) { badCase = 'gap ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.missingId !== q.flow + '_' + q.gapIdx ||
            q.missingText !== ref[q.gapIdx]) { badCase = 'missing ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.pool.length !== 4 || q.chainSteps.length !== 3) { badCase = 'missPool ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.pool.map(p => p.stepId).indexOf(q.missingId) < 0) { badCase = 'missTruth ' + flat + '/' + k; tableOk = false; break outer; }
        const ext = q.pool.filter(p => q.stepIds.indexOf(p.stepId) < 0);
        if (ext.length !== 3 || ext.some(p => p.stepId.split('_')[0] === q.flow) ||
            ext.some(p => q.texts.indexOf(p.text) >= 0)) { badCase = 'missDis ' + flat + '/' + k; tableOk = false; break outer; }
        orderFlows.add(q.flow);
      } else if (q.kind === 'rain') {                      // ---- rain 型：out 5 步含伞 ----
        if (q.flow !== 'out') { badCase = 'rainFlow ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.stepIds.length !== 5 || q.pool.length !== 5) { badCase = 'rainN ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.texts[4] !== '带小伞' || q.stepIds[4] !== 'out_4') { badCase = 'umbrella ' + flat + '/' + k; tableOk = false; break outer; }
        for (let i = 0; i < 4; i++) if (q.texts[i] !== ref[i]) { badCase = 'rainText ' + flat + '/' + k; tableOk = false; break outer; }
        nRainQ++;
      } else {                                             // ---- order 型 ----
        if (q.kind !== 'order') { badCase = 'kind ' + flat + '/' + k; tableOk = false; break outer; }
        const wantN = (flat === 0 && k === 0) ? 3 : 4;
        if (q.stepIds.length !== wantN) { badCase = 'stepN ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.texts.join() !== ref.slice(0, wantN).join()) { badCase = 'texts ' + flat + '/' + k; tableOk = false; break outer; }
        const wantD = (L.dch === 2 || L.dch === 3) ? 1 : 0;
        if (q.pool.length !== wantN + wantD) { badCase = 'poolN ' + flat + '/' + k; tableOk = false; break outer; }
        const ext = q.pool.filter(p => q.stepIds.indexOf(p.stepId) < 0);
        if (ext.length !== wantD) { badCase = 'disN ' + flat + '/' + k; tableOk = false; break outer; }
        if (wantD === 1) {
          if (ext[0].stepId.split('_')[0] === q.flow) { badCase = 'disFlow ' + flat + '/' + k; tableOk = false; break outer; }
          if (q.texts.indexOf(ext[0].text) >= 0) { badCase = 'disText ' + flat + '/' + k; tableOk = false; break outer; }
        }
        orderFlows.add(q.flow);
      }
      /* 全型通用：卡池互异（id+text）+ 乱序非正序（order/rain） */
      const ids = q.pool.map(p => p.stepId), ts = q.pool.map(p => p.text);
      if (new Set(ids).size !== ids.length || new Set(ts).size !== ts.length) { badCase = 'dup ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.kind !== 'miss') {
        const seqPos = ids.map(id => q.stepIds.indexOf(id)).filter(x => x >= 0);
        if (seqPos.every((x, i) => x === i)) { badCase = 'inOrder ' + flat + '/' + k; tableOk = false; break outer; }
      }
    }
    if (!tableOk) break;
    /* 章级聚合规则 */
    if (L.dch === 1 && L.quizzes.some(q => q.kind !== 'order')) { badCase = 'ch1kind' + flat; tableOk = false; break; }
    if (L.dch === 2 && L.quizzes.some(q => q.kind !== 'order')) { badCase = 'ch2kind' + flat; tableOk = false; break; }
    if (L.dch === 3 && (nRainQ < 2 || L.quizzes.some(q => q.kind === 'miss'))) { badCase = 'ch3rain' + flat; tableOk = false; break; }
    if (L.dch === 3 && L.quizzes[0].kind !== 'rain') { badCase = 'ch3anchor' + flat; tableOk = false; break; }
    if (L.dch === 3 && orderFlows.has('out')) { badCase = 'ch3orderOut' + flat; tableOk = false; break; }
    if (L.dch === 4 && L.quizzes.some(q => q.kind !== 'miss')) { badCase = 'ch4kind' + flat; tableOk = false; break; }
    if ((L.dch === 1 || L.dch === 2 || L.dch === 4) && orderFlows.size !== 5) { badCase = 'flowDup' + flat; tableOk = false; break; }
    /* 锚点：flat0q0=sleep 3 步 / flat10q0=rain 5 卡 */
    if (flat === 0) {
      const q0 = L.quizzes[0];
      if (!(q0.flow === 'sleep' && q0.kind === 'order' && q0.stepIds.length === 3 && q0.pool.length === 3)) {
        badCase = 'anchor0'; tableOk = false; break;
      }
    }
    if (flat === 10) {
      const q0 = L.quizzes[0];
      if (!(q0.kind === 'rain' && q0.flow === 'out' && q0.pool.length === 5)) {
        badCase = 'anchor10'; tableOk = false; break;
      }
    }
  }
  /* 页面文案表逐条一致（SPEC 表对账，禁抄实现；r10 三句族+分型题面） */
  const sentOk = VOICE.watch.text === SPEC_SENT.watch && VOICE.turn.text === SPEC_SENT.turn &&
                 VOICE.hint.text === SPEC_SENT.hint && VOICE.right.text === SPEC_SENT.right &&
                 VOICE.wrong.text === SPEC_SENT.wrong && VOICE.q.text === SPEC_SENT.q &&
                 VOICE.next.text === SPEC_SENT.next &&
                 VOICE.qr.text === SPEC_SENT.qr && VOICE.qm.text === SPEC_SENT.qm &&
                 GUIDE.wrong === SPEC_SENT.guide && GUIDE.distract === SPEC_SENT.distract &&
                 GUIDE.miss === SPEC_SENT.mguide &&
                 VOICE.watch.key === 'stb_tut_watch' && VOICE.turn.key === 'stb_tut_turn' &&
                 VOICE.hint.key === 'stb_hint' && VOICE.right.key === 'stb_right' &&
                 VOICE.wrong.key === 'stb_wrong' && VOICE.q.key === 'stb_q' &&
                 VOICE.next.key === 'stb_next' &&
                 VOICE.qr.key === 'stb_q_rain' && VOICE.qm.key === 'stb_q_miss' &&
                 stepKey('sleep', 3) === 'stb_s_sleep_3' && stepKeyOf('out_4') === 'stb_s_out_4';
  if (tableOk && flowsOk && depsOk && cogOk2 && sentOk) npass++;
  units.table = { ok: tableOk && flowsOk && depsOk && cogOk2 && sentOk, bad: badCase,
                  flows: flowsOk, deps: depsOk, cog: cogOk2, sent: sentOk };

  /* ---- ③ tapCard 返回值族（flat0：sleep 前 3 步池 3——确定性锚点，刷牙洗脸互可换） ---- */
  total++;
  startLevel(0);
  const q0 = SB.quiz;
  const initOk = q0 && q0.kind === 'order' && q0.flow === 'sleep' && q0.phase === 0 &&
                 q0.steps.length === 3 && q0.step === 0 && q0.miss === 0 &&
                 q0.answers.length === 3 &&                   // 教学特例：3 步依赖裁剪后全无前置=全合法
                 q0.answers.indexOf('sleep_0') >= 0 &&
                 q0.answers.indexOf('sleep_1') >= 0 &&        // 刷牙洗脸均在合法集（多解）
                 q0.steps.every(s => s.stepId.split('_')[0] === 'sleep' && !s.done);
  const badTap = (await SB.tapCard(99)) === null;             // 越界 null（不炸）
  const rS = await SB.tapCard(specLegalIdxs(cur.quizzes[0])[0]);   // → 'step'
  const stepOk = rS === 'step' && SB.quiz.phase === 1;
  await SB.tapCard(specLegalIdxs(cur.quizzes[0])[0]);         // 第 2 步 → 'step'
  const rR = await SB.tapCard(specLegalIdxs(cur.quizzes[0])[0]);   // 第 3 步（末步）→ 'right'
  const rightOk = rR === 'right' && SB.quiz.step === 1 && SB.quiz.phase === 0 &&
                  SB.quiz.miss === 0;                         // 新题 miss 归零
  /* wrong/doneAgain：flat5（ch2 order+干扰——4 步依赖含约束+1 干扰=有错卡撞点） */
  startLevel(5);
  const iw = specWrongIdx(cur.quizzes[0]);                    // 错卡=前置未完（独立找）
  const rW = await SB.tapCard(iw);                            // → 'wrong'
  const wrongOk = rW === 'wrong' && SB.quiz.miss === 1 && SB.quiz.phase === 0 &&
                  SB.quiz.answers.length >= 1;                // phase/answers 不动
  const doneAgain = await SB.tapCard(iw);                     // 同一非法卡再点=wrong 同口径
  const doneOk = doneAgain === 'wrong' && SB.quiz.miss === 2 && SB.quiz.phase === 0;
  /* 末题 done：独立推进到 flat0 题 4 点末步 */
  let rDone = null;
  let g4 = 0;
  while (SB.quiz && SB.quiz.step < 4 && g4++ < 40) {
    await SB.tapCard(specLegalIdxs(cur.quizzes[cur.step])[0]);
  }
  if (SB.quiz && SB.quiz.step === 4) {
    const qz = cur.quizzes[4];
    for (let s = 0; s < (qz.kind === 'miss' ? 0 : qz.stepIds.length - 1); s++)
      await SB.tapCard(specLegalIdxs(qz)[0]);
    const lastIdx = qz.kind === 'miss'                        // 末步池位=点完 n-1 步后现算
      ? qz.pool.findIndex(p => p.stepId === qz.missingId)
      : specLegalIdxs(qz)[0];
    rDone = await SB.tapCard(lastIdx);                        // 末题末步 → 'done'
  }
  const doneLast = rDone === 'done' && SB.currentLevel.done && SB.currentLevel.won;
  /* 吞输入：demo/locked 门拦钩子输入=null + 卡板容器 bump（家族 D） */
  startLevel(0);
  state.demo = true; state.locked = true;
  const swallow1 = (await SB.tapCard(0)) === null && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;
  const swallow2 = (await SB.tapCard(0)) === null;
  state.locked = false;
  const swallowOk = swallow1 && swallow2 && SB.quiz.phase === 0 && SB.quiz.miss === 0;
  /* m-8：真 .done 卡再点断言（§0.74 定版：已置卡再点=wrong+miss 同口径——此前只测非法卡
     重复点，done 路径零覆盖）。置于 swallow 断言后执行，不污染其 phase/miss 口径 */
  const lg0 = specLegalIdxs(cur.quizzes[cur.step])[0];
  const rLg = await SB.tapCard(lg0);                           // 合法首步 → 'step'
  const missBefore = SB.quiz.miss;
  const rDone2 = await SB.tapCard(lg0);                        // 已置 done 同卡再点 → 'wrong'
  const doneAgainOk = rLg === 'step' && rDone2 === 'wrong' &&
    SB.quiz.miss === missBefore + 1 && SB.quiz.phase === 1;    // miss+1、placed/pos 不回退
  const tapOk = initOk && badTap && wrongOk && stepOk && doneOk && rightOk && doneLast &&
    swallowOk && doneAgainOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrong: wrongOk, step: stepOk,
                doneAgain: doneOk, doneAgainReal: doneAgainOk, right: rightOk, doneLast: doneLast, swallow: swallowOk };

  /* ---- ④ 逐点驱动全题：phase 逐点推进 + 顺序条亮槽数同步（flat5 ch2 order+干扰 4 步） ---- */
  total++;
  startLevel(5);
  let driveUIOk = true, driveBad = '';
  for (let k = 0; k < CH_LEN && driveUIOk; k++) {
    const q = cur.quizzes[k];
    for (let s = 0; s < q.stepIds.length && driveUIOk; s++) {
      const before = SB.quiz.phase;
      const r = await SB.tapCard(specLegalIdxs(q)[0]);
      const want = q.solved ? (k === CH_LEN - 1 ? 'done' : 'right') : 'step';
      if (r !== want) { driveUIOk = false; driveBad = 'r' + k + '/' + s + '=' + r; break; }
      if (want === 'step') {
        const info = SB.quiz;
        if (!info || info.phase !== before + 1) { driveUIOk = false; driveBad = 'phase' + k + '/' + s; break; }
        if (domLit() !== before + 1) { driveUIOk = false; driveBad = 'lit' + k + '/' + s; break; }   // 亮槽数==已点数
      }
    }
    if (driveUIOk && k < CH_LEN - 1 && SB.quiz.step !== k + 1) { driveUIOk = false; driveBad = 'adv' + k; }
  }
  if (driveUIOk && !(SB.currentLevel.done && SB.currentLevel.stars === 3)) { driveUIOk = false; driveBad = 'final'; }
  if (driveUIOk) npass++;
  units.drive = { ok: driveUIOk, bad: driveBad };

  /* ---- ⑤ 帧内容断言（家族 M）：卡 DOM==steps + .done 类切换（错卡驱动后同样对账）+
       miss 链 DOM（chainM：preset3+gap1，补对后 gap→lit） ---- */
  total++;
  startLevel(5);                                             // ch2 order 4 步题（DOM 帧逐卡对账）
  let frameOk = true, frameBad = '';
  if (!domBoardOk(cur.quizzes[0]) || domLit() !== 0) { frameOk = false; frameBad = 'init'; }
  const rfw = specWrongIdx(cur.quizzes[0]);
  await SB.tapCard(rfw);                                     // 先制造一次错（DOM 帧含 wig 后状态）
  if (!domBoardOk(cur.quizzes[0])) { frameOk = false; frameBad += '/afterWrong'; }
  const qf = cur.quizzes[0];
  for (let s = 0; s < qf.stepIds.length && frameOk; s++) {    // 逐卡驱动到题完成
    const i = specLegalIdxs(cur.quizzes[cur.step])[0];
    const r = await SB.tapCard(i);
    if (r === 'step') {
      if (!domBoardOk(cur.quizzes[cur.step])) { frameOk = false; frameBad += '/board' + s; }
      if (domLit() !== s + 1) { frameOk = false; frameBad += '/lit' + s; }
    } else if (r === 'right' || r === 'done') {
      const nq = cur.done ? null : cur.quizzes[cur.step];     // 判对后帧=新题重建
      if (!nq) break;
      if (!domBoardOk(nq) || domLit() !== 0) { frameOk = false; frameBad += '/ren' + s; }
      break;
    } else { frameOk = false; frameBad += '/r' + s + '=' + r; }
  }
  /* chainM：miss 题链 DOM 逐槽对账+补对后缺口槽 lit */
  startLevel(15);                                            // ch4 miss 章
  const qm0 = cur.quizzes[0];
  if (qm0.kind !== 'miss') { frameOk = false; frameBad += '/missKind'; }
  else {
    if (!domChainOk(qm0) || !domBoardOk(qm0)) { frameOk = false; frameBad += '/chainInit'; }
    const gapSlot = stripEl.querySelector('.slot.gap');
    if (!gapSlot || gapSlot.dataset.pos !== String(qm0.gapIdx)) { frameOk = false; frameBad += '/gapPos'; }
    const wrongCand = qm0.pool.findIndex(p => p.stepId !== qm0.missingId);
    await SB.tapCard(wrongCand);                             // 干扰卡 → wrong（链 DOM 不变）
    if (!domChainOk(qm0)) { frameOk = false; frameBad += '/chainAfterWrong'; }
    const truthIdx = qm0.pool.findIndex(p => p.stepId === qm0.missingId);
    const rm = await SB.tapCard(truthIdx);                   // 真值卡 → right（缺口槽补 lit 后换题）
    if (rm !== 'right' && rm !== 'done') { frameOk = false; frameBad += '/missTap=' + rm; }
    else {
      const nq2 = cur.done ? null : cur.quizzes[cur.step];   // 补对后帧=新 miss 题链重建（preset3+gap1 干净）
      if (nq2 && !domChainOk(nq2)) { frameOk = false; frameBad += '/chainRen'; }
    }
  }
  if (frameOk) npass++;
  units.frame = { ok: frameOk, bad: frameBad };

  /* ---- 存档契约（家族 C）：KIDS.init 写 kidsgame_storybed 带 v:'1.0' ---- */
  total++;
  KIDS.init({ game: 'storybed', title: '晚安故事序' });   // verify 页真 init（真 persist 落盘）
  let saveOk = false, saveV = null;
  try {
    const raw = localStorage.getItem('kidsgame_storybed');
    const svv = raw ? JSON.parse(raw) : null;
    saveV = svv && svv.v;
    saveOk = !!svv && svv.v === '1.0' && svv.game === 'storybed';
  } catch (e) { saveOk = false; }
  if (saveOk) npass++;
  units.save = { ok: saveOk, v: saveV };

  /* ---- ⑥ 教学链：tutorialWatch 真实走完 → __sbDemoR='right'（演示排完 sleep 前 3 步） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  window.__lastQueue = null;
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__sbDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].flow === 'sleep' &&       // 锚点：sleep 前 3 步
                cur.quizzes[0].stepIds.join() === 'sleep_0,sleep_1,sleep_2' &&
                tw <= 16000 + 4000;   /* 16s 门禁+4s 折算抖动余量：SPEED=0.12 下墙钟/0.12 放大 8.3×
                                         （并行负载 400ms 真实抖动=+3.3s 折算）；真实 16s 门禁由
                                         build 静态预算 12600≤16000 + selftest §5 SPEED=1 实测承担 */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__sbDemoR, tut: state.tut,
                     watchMs: Math.round(tw) };

  /* ---- ⑦ 教学三段收口：help 态首步排对 → solo 放手 ---- */
  total++;
  let soloOk = false;
  if (SB.quiz && state.tut === 'help') {
    let g = 0;
    while (state.tut === 'help' && g++ < 10) {
      const r = await SB.tapCard(specLegalIdxs(cur.quizzes[cur.step])[0]);
      if (r === 'right' || r === 'done') break;
    }
    soloOk = state.tut === 'solo';
  }
  if (soloOk) npass++;
  units.solo = { ok: soloOk, tut: state.tut };

  /* ---- ⑳ miss≥2 答案级线索：一错不亮、二错亮合法卡（梯度脚手架） ---- */
  total++;
  startLevel(5);                                             // flat5：有前置未完卡（flat0q0 全合法无撞点）
  const ansEl0 = () => cardEl(specLegalIdxs(cur.quizzes[0])[0]);
  await SB.tapCard(specWrongIdx(cur.quizzes[0]));            // 一错：miss=1 合法卡不亮
  const noLit = !ansEl0().classList.contains('breathe');
  const rW2 = await SB.tapCard(specWrongIdx(cur.quizzes[0])); // 二错：miss=2 合法卡亮
  const litOk = rW2 === 'wrong' && SB.quiz.miss === 2 &&
                ansEl0().classList.contains('breathe');
  const hint2Ok = noLit && litOk;
  if (hint2Ok) npass++;
  units.hint2 = { ok: hint2Ok, noLit: noLit, lit: litOk, miss: SB.quiz.miss };

  /* ---- ⑩ keylessLast 链序断言（契约 N）+ 链形状对账（三句族） ---- */
  total++;
  startLevel(5);                                             // flat5：前置未完错卡（flat0q0 全合法）
  window.__lastQueue = null;
  await SB.tapCard(specWrongIdx(cur.quizzes[0]));            // 普通错链（order 前置未完）
  const chainW = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'stb_wrong' &&
                 window.__lastQueue[1] && window.__lastQueue[1].key === 'stb_g_wrong' &&   // T46 阶段2 键段
                 window.__lastQueue[1].text === SPEC_SENT.guide;
  window.__lastQueue = null;
  await SB.tapCard(specLegalIdxs(cur.quizzes[0])[0]);        // 逐点链=步音+然后呢（全 clip）
  const sid0 = cur.quizzes[0].placed[0];                     // 所点步骤 stepId（动态对账——可换序点哪步播哪步）
  const chainS = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'stb_s_' + sid0 &&
                 window.__lastQueue[1] === 'stb_next';
  window.__lastQueue = null;
  let rFin = null, gFin = 0;                                  // 中间步点完到末步（flat5 题0=4 步）
  while (cur.step === 0 && !cur.quizzes[0].solved && gFin++ < 8) {
    rFin = await SB.tapCard(specLegalIdxs(cur.quizzes[0])[0]);
  }
  const sidFin = cur.quizzes[0].placed[cur.quizzes[0].placed.length - 1];   // 末点点（动态）
  const chainR = rFin === 'right' && window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'stb_right' &&
                 window.__lastQueue[1] === 'stb_s_' + sidFin;
  /* ch2 干扰专用语义句链（stb_g_distract 键段——T46 阶段2） */
  let chainD = false;
  startLevel(5);                                            // dch2 干扰章
  {
    const dIdx = specDistractIdx(cur.quizzes[0]);
    if (dIdx >= 0) {
      window.__lastQueue = null;
      const rd = await SB.tapCard(dIdx);                       // 点干扰卡 → 'wrong'+干扰句
      chainD = rd === 'wrong' && window.__lastQueue &&
               window.__lastQueue[0] === 'stb_wrong' &&
               window.__lastQueue[1] && window.__lastQueue[1].key === 'stb_g_distract' &&
               window.__lastQueue[1].text === SPEC_SENT.distract;
    }
  }
  /* miss 题专用语义句链（stb_g_miss 键段——r10 三句族 T46 clip 化） */
  let chainM = false;
  startLevel(15);                                           // dch4 miss 章
  {
    const qm = cur.quizzes[0];
    const wIdx = qm.pool.findIndex(p => p.stepId !== qm.missingId);
    window.__lastQueue = null;
    const rw = await SB.tapCard(wIdx);                         // 点干扰候选卡 → 'wrong'+miss 句
    chainM = rw === 'wrong' && window.__lastQueue &&
             window.__lastQueue[0] === 'stb_wrong' &&
             window.__lastQueue[1] && window.__lastQueue[1].key === 'stb_g_miss' &&
             window.__lastQueue[1].text === SPEC_SENT.mguide;
  }
  const chainsOk = chainW && chainS && chainR && chainD && chainM;
  if (chainsOk) npass++;
  units.chains = { ok: chainsOk, wrong: chainW, step: chainS, right: chainR,
                   distract: chainD, miss: chainM };

  /* ---- ⑲ 契约 I 运行时：wrong 起播设豁免窗；flat≥3 节流跳过不设窗 ---- */
  total++;
  startLevel(1);                                             // flat<3：每错必播 → 起播设窗（flat1 有约束题）
  wrongChainUntil = 0;
  await SB.tapCard(specWrongIdx(cur.quizzes[0]));
  const winSet = wrongChainUntil > Date.now() && wrongChainUntil <= Date.now() + 7100 + 200;
  startLevel(10);                                            // flat≥3：10s 节流
  lastWrongVoice = Date.now(); wrongChainUntil = 0;          // 模拟 10s 内刚播过（同作用域直写锚）
  const rJ = await SB.tapCard(specWrongIdx(cur.quizzes[0]));
  const winSkip = rJ === 'wrong' && wrongChainUntil === 0;   // 节流跳过=不设窗（契约 I「起播设」）
  const chainIOk = winSet && winSkip;
  if (chainIOk) npass++;
  units.chainI = { ok: chainIOk, winSet: winSet, winSkip: winSkip };

  /* ---- ⑧ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  total++;
  const LA = genLevel(10);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- M1 multiOrder 可换序多解实锤（delta①）----
     同一题两种**不同**合法序都通关（引擎级双驱动：序 A=合法集首个，序 B=末个——与 A 不同步）；
     非法序（前置未完成）=wrong；哨兵=flat0-4 找到「可换对>0 且有前置撞点」题（找不到=单元 fail 不静默）
     目标题可能非第 0 题：driveTo 先用独立合法集把 0..qi-1 题点完（engTap 只吃 L.step 指向题的池位） */
  total++;
  let multiOk = false, multiInfo = { flat: -1, qi: -1, orders: [] };
  const driveTo = (LL, qi) => {                  // 推进 L.step 到 qi（0..qi-1 题按独立合法集首选取点）
    for (let k = 0; k < qi; k++) {
      const qk = LL.quizzes[k];
      let g = 0;
      while (!qk.solved && g++ < 12) {
        const ls = specLegal(qk);
        if (!ls.length) return false;
        const i = qk.pool.findIndex(p => p.stepId === ls[0]);
        if (i < 0 || engTap(LL, i) === null) return false;
      }
      if (!qk.solved) return false;
    }
    return LL.step === qi;
  };
  outerM1:
  for (let flat = 0; flat <= 4; flat++) {
    const L = genLevel(flat);
    for (let qi = 0; qi < L.quizzes.length; qi++) {
      const q = L.quizzes[qi];
      if (q.kind !== 'order' || specSwapPairs(q.flow, false) === 0) continue;
      /* 序 A/B 两份独立关驱动（先推进到目标题，再按 pick 从目标题合法集取步） */
      const run = pick => {
        const LL = genLevel(flat);
        if (!driveTo(LL, qi)) return null;
        const qq = LL.quizzes[qi];
        let rets = [];
        while (!qq.solved && rets.length < 12) {               // 上界护栏：卡死即 null（哨兵兜底 fail）
          const ls = specLegal(qq);
          if (!ls.length) return null;
          const id = pick(ls, qq.placed.length);
          let i = -1;
          for (let c = 0; c < qq.pool.length; c++) if (qq.pool[c].stepId === id) { i = c; break; }
          if (i < 0) return null;
          const r = engTap(LL, i);
          if (r === null) return null;                         // 池位错位/题已判=驱动失败
          rets.push(r);
        }
        return qq.solved ? { rets: rets, placed: qq.placed.slice(), miss: qq.miss } : null;
      };
      const rA = run(ls => ls[0]);                            // 序 A：合法集首个（stepId 序）
      const rB = run(ls => ls[ls.length - 1]);                // 序 B：合法集末个（与 A 不同步）
      const seqDiff = rA && rB && rA.placed.join() !== rB.placed.join();   // 两序确不同
      const bothDone = rA && rB && rA.rets.every(r => r === 'step' || r === 'right') &&
        rB.rets.every(r => r === 'step' || r === 'right') && rA.miss === 0 && rB.miss === 0;
      /* 非法序：推进到目标题后，点一个前置未完成步骤=wrong（依赖约束实锤） */
      const LL = genLevel(flat);
      if (!driveTo(LL, qi)) continue;
      const qq = LL.quizzes[qi];
      const depN = (n) => {
        const pre = SPEC_DEPS[qq.flow][n];
        return pre.length ? qq.pool.findIndex(p => p.stepId === qq.flow + '_' + n) : -1;
      };
      let wIdx = -1;
      for (let n = 0; n < 4; n++) { const i = depN(n); if (i >= 0 && SPEC_DEPS[qq.flow][n].length) { wIdx = i; break; } }
      if (wIdx < 0) continue;                     /* 无前置撞点的题（全自由，如 flat0q0 特例）→ 找下一题 */
      const rBad = engTap(LL, wIdx);
      const badOk = rBad === 'wrong';                          // 哨兵：找不到前置未完撞点=rBad!=='wrong'=单元 fail
      multiInfo = { flat: flat, qi: qi, orders: [rA && rA.placed.join(), rB && rB.placed.join()], bad: rBad };
      multiOk = !!(seqDiff && bothDone && badOk && rBad === 'wrong');
      break outerM1;
    }
  }
  if (multiOk) npass++;
  units.multiOrder = { ok: multiOk, info: multiInfo };

  /* ---- M2 rainInsert 条件分支插入（delta②）----
     flat10q0=rain：pool 含 out_4 带小伞（条件改变流程）；先点出门玩=wrong（前置缺）；
     穿衣→伞=合法变通（伞早于鞋/包）；ch2 普通 out 题无伞；#cond DOM 在场且文本正确 */
  total++;
  startLevel(10);
  const qr0 = SB.quiz;
  const domCond = condEl.classList.contains('show') &&
                  condEl.textContent.indexOf('明天下雨') >= 0;
  const rainStruct = qr0 && qr0.kind === 'rain' && qr0.flow === 'out' &&
                     qr0.steps.length === 5 &&
                     qr0.steps.some(s => s.stepId === 'out_4' && s.text === '带小伞') &&
                     qr0.answers.length === 1 && qr0.answers[0] === 'out_0';   // 首步唯穿衣
  /* 引擎级：先点出门玩（out_3，前置[1,2,4] 缺）=wrong */
  const Lr = genLevel(10);
  const qr = Lr.quizzes[0];
  const iOut3 = qr.pool.findIndex(p => p.stepId === 'out_3');
  const rBad3 = iOut3 >= 0 ? engTap(Lr, iOut3) : 'noIdx';
  const iUmb = qr.pool.findIndex(p => p.stepId === 'out_4');
  const rUmbFirst = iUmb >= 0 ? engTap(Lr, iUmb) : 'noIdx';  // 未穿衣先点伞=wrong（前置[0] 缺）
  /* 合法变通驱动：穿衣→伞→鞋→包→出门 全 'step'+'right'（伞早于鞋包=变通实锤） */
  const seq = ['out_0', 'out_4', 'out_1', 'out_2', 'out_3'];
  let varOk = true;
  seq.forEach(id => {
    if (!varOk) return;
    let i = -1;
    for (let c = 0; c < qr.pool.length; c++) if (qr.pool[c].stepId === id) { i = c; break; }
    const r = engTap(Lr, i);
    const last = id === 'out_3';
    if (last ? r !== 'right' : r !== 'step') varOk = false;
  });
  /* 普通 ch2 关（flat5-9）无伞步 */
  let noUmbPlain = true;
  for (let f = 5; f <= 9; f++) genLevel(f).quizzes.forEach(q => {
    if (q.stepIds.some(id => id === 'out_4')) noUmbPlain = false;
  });
  const rainOk = rainStruct && domCond && rBad3 === 'wrong' && rUmbFirst === 'wrong' && varOk && noUmbPlain;
  if (rainOk) npass++;
  units.rainInsert = { ok: rainOk, struct: rainStruct, dom: domCond, badOut3: rBad3,
                       umbFirst: rUmbFirst, variant: varOk, noUmbPlain: noUmbPlain };

  /* ---- M3 missGap 缺步补卡（delta③）----
     chain 4 槽恰 1 null=缺口；真值=SPEC 表第 gapIdx 步（独立推导）；候选 4=真值+3 干扰；
     点干扰=wrong；点真值=right/末题 done；UI 整关 autoSolve taps=5（每题 1 tap） */
  total++;
  startLevel(15);
  const qg = SB.quiz;
  const chHook = qg && qg.chain;
  const gapNulls = chHook ? chHook.filter(x => x === null).length : -1;
  const gapPos = chHook ? chHook.findIndex(x => x === null) : -1;   // 缺口位==缺失步固有号（链保序）
  const truthSpec = qg && gapPos >= 0 ? SPEC_FLOWS[qg.flow][gapPos] : null;   // 独立从 SPEC 表推缺口步文本
  const truthOk = qg && qg.kind === 'miss' && gapNulls === 1 && chHook.length === 4 &&
                  qg.steps.length === 4 &&
                  qg.answer === qg.flow + '_' + gapPos &&
                  qg.steps.some(s => s.text === truthSpec && s.stepId === qg.answer) &&
                  qg.steps.filter(s => s.stepId.split('_')[0] !== qg.flow).length === 3;
  const Lg = genLevel(15);
  const qe = Lg.quizzes[0];
  const wCand = qe.pool.findIndex(p => p.stepId !== qe.missingId);
  const rGW = engTap(Lg, wCand);                              // 干扰卡=wrong
  const rGT = engTap(Lg, qe.pool.findIndex(p => p.stepId === qe.missingId));  // 真值=right
  /* UI 整关：miss 关 autoSolve taps=5（每题 1 tap）——找缺+补对双步走真实链 */
  startLevel(15);
  const aM = await SB.autoSolve();
  /* gapLit：末题（题 4）补对后 r='done'→winFlow（verify 页不重建 strip）——缺口槽补 lit 恰 1 个 @gapIdx */
  let gapLitOk = false;
  {
    startLevel(15);
    for (let k = 0; k < 4; k++) {                            // 逐题点真值推进到末题
      const qk = cur.quizzes[cur.step];
      await SB.tapCard(qk.pool.findIndex(pp => pp.stepId === qk.missingId));
    }
    const qe4 = cur.quizzes[4];
    const rE4 = await SB.tapCard(qe4.pool.findIndex(pp => pp.stepId === qe4.missingId));
    const litSlots = Array.from(stripEl.querySelectorAll('.slot.lit'));
    gapLitOk = rE4 === 'done' && litSlots.length === 1 &&
               +litSlots[0].dataset.pos === qe4.gapIdx;
  }
  const missOk = truthOk && rGW === 'wrong' && rGT === 'right' && gapLitOk &&
                 aM.done && aM.taps === 5 && SB.currentLevel.stars === 3;
  if (missOk) npass++;
  units.missGap = { ok: missOk, gapNulls: gapNulls, truthOk: truthOk, gapLit: gapLitOk,
                    wrong: rGW, right: rGT, auto: aM };

  /* ---- ⑰ UI 冒烟：autoSolve 通关 [0,5,10,15,19]（四章型+生成关全覆盖）；
     taps 口径 v2=Σ(order/rain 步骤数, miss 题 1) ---- */
  total++;
  const solvedList = [];
  let smokeOk = true;
  for (const flat of [0, 5, 10, 15, 19]) {
    startLevel(flat);
    const wantTaps = cur.quizzes.reduce((s, q) =>
      s + (q.kind === 'miss' ? 1 : q.stepIds.length), 0);
    const a = await SB.autoSolve();
    const lv = SB.currentLevel;
    solvedList.push(flat + ':' + (a.done ? '1' : '0') + '/t' + a.taps + '/w' + wantTaps + '/s' + (lv ? lv.stars : '?'));
    if (!a.done || a.taps !== wantTaps || !lv || !lv.done || !lv.won || lv.stars !== 3) smokeOk = false;
  }
  if (smokeOk) npass++;
  smokes.auto = { ok: smokeOk, solved: solvedList };

  /* ---- ⑪ clips：stb_ 34 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4+§6.6 ±60ms） ---- */
  total++;
  const clipKeys = Object.keys(KIDS.voice.clips);
  const need = ['stb_tut_watch', 'stb_tut_turn', 'stb_hint', 'stb_right', 'stb_wrong', 'stb_q', 'stb_next',
                'stb_q_rain', 'stb_q_miss', 'stb_g_wrong', 'stb_g_distract', 'stb_g_miss',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  FLOW_IDS.forEach(f => { for (let n = 0; n < 4; n++) need.push(stepKey(f, n)); });
  need.push('stb_s_out_4');                                   // r10 条件步音
  const preOk = clipKeys.length === 40 &&
    need.every(k => clipKeys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);   /* 8s：并行负载下 data-URI 元数据加载余量 */
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: clipKeys.length, durs: durs };

  /* ---- ⑫ 布局：双 viewport（body.port 通道——纪律⑥）×三关型（order/rain/miss）量测+对比度+rect 落容器 ---- */
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
  function simView(w, h, flat) {
    document.body.classList.toggle('port', h > w);            // 竖屏类通道（纪律⑥：媒体查询跟视口）
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight, el: b }));
    const slots = Array.prototype.map.call(stripEl.querySelectorAll('.slot'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const chip = { w: chipEl.offsetWidth, h: chipEl.offsetHeight };
    const cardOk = cards.length >= 4 && cards.every(b => b.w >= 96 && b.h >= 96);    // 步骤卡 ≥96（主答案）
    const slotOk = slots.length >= 3 && slots.every(b => b.w >= 56 && b.h >= 56);    // 顺序条槽 ≥56
    const chipOk = chip.w >= 64 && chip.h >= 64;
    const condOk = cur.quizzes[cur.step].kind !== 'rain' ||
                   (condEl.offsetHeight >= 40 && condEl.offsetWidth >= 64);          // rain 徽章可视
    const cB = ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf('#4A3B2E', '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    /* rect 落容器断言（纪律⑥）：卡矩形 ⊆ #board 矩形（2px 容差） */
    const br = boardEl.getBoundingClientRect();
    const inBox = cards.every(c => {
      const r = c.el.getBoundingClientRect();
      return r.left >= br.left - 2 && r.right <= br.right + 2 &&
             r.top >= br.top - 2 && r.bottom <= br.bottom + 2;
    });
    /* 竖屏样式通道生效实锤：竖屏窄槽 ≤80（横屏 ≥84）。@media 跟真实视口（纪律⑥）：
       竖屏 sim 恒断言 ≤80（横屏外层走 body.port 类通道 / 竖屏外层走原生 @media）；
       横屏 sim 仅当真实视口也横屏才断言 ≥84（竖屏外层下 @media(portrait) 覆盖，量测无意义） */
    const realPort = window.innerHeight > window.innerWidth;
    const portStyle = h > w ? slots.length && slots[0].w <= 80
                                 : (realPort || (slots.length && slots[0].w >= 84));
    return { vp: w + 'x' + h, flat: flat, cards: cards.length, cardOk: cardOk, slotOk: slotOk,
             chipOk: chipOk, condOk: condOk, contrast: cB && cS, ox: ox, inBox: inBox,
             portStyle: !!portStyle,
             pass: cardOk && slotOk && chipOk && condOk && cB && cS && ox <= 0 && inBox && portStyle };
  }
  total++;
  const sims = [];
  for (const flat of [1, 10, 15]) {                          // order 4 卡 / rain 5 卡 / miss 4 候选
    sims.push(simView(1280, 800, flat));
    sims.push(simView(800, 1180, flat));
  }
  document.body.classList.remove('port');
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(1);                                            // 还原真实 viewport 布局（ch1 4 卡态）
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑭ 语音窗动态断言（clip 实长 SPEC §4+§6.6；T46 阶段2 三句族 clip 化后 estMs 字数口径
     退役，改按 stb_g_wrong 3120 / distract 2880 / miss 2592 实长推导） ---- */
  total++;
  const winOk = (1800 + 3400) >= 2520 + 150 + 1896 + 300 &&   // 判对窗 5200 ≥ 4866（契约 G/H）
                7100 >= 2496 + 150 + SPEC_DUR['stb_g_wrong'] + 300 &&     // 链豁免 ≥ 6066（家族 I）
                7100 >= 2496 + 150 + SPEC_DUR['stb_g_distract'] + 300 &&  // 干扰句同窗罩住 ≥ 5826
                7100 >= 2496 + 150 + SPEC_DUR['stb_g_miss'] + 300 &&      // miss 句同窗罩住 ≥ 5538
                (900 + 2500) >= 3096 + 300 &&                 // 教学演示窗 3400 ≥ 3396
                2100 >= 1776 + 300 &&                         // turn 后读题延 ≥ 2076
                1896 + 150 + 1488 <= 14000 - 1000 &&          // 逐点链 3534 < 方向级救援间隔
                SPEC_DUR['stb_s_out_4'] <= 1896;              // 伞步音 1608 不破步音上界（链窗数学不破）
  if (winOk) npass++;
  units.estWin = { ok: winOk, estGuide: SPEC_DUR['stb_g_wrong'], estMiss: SPEC_DUR['stb_g_miss'],
                   chainMin: 2496 + 150 + SPEC_DUR['stb_g_wrong'] + 300 };

  /* ---- ⑮ 章分布聚合（① 数据收口） ---- */
  total++;
  const everyQ = (dch, pred) => chAgg[dch].length === 5 &&
    chAgg[dch].every(arr => arr.length === CH_LEN && arr.every(pred));
  const ch1Ok = chAgg[1].length === 5 &&
    chAgg[1].every((arr, i) => arr.every((a, k) =>
      a === ((i === 0 && k === 0) ? '3/1/order' : '4/1/order')));   // ch1 全 order 池 4（flat0q0=3 步教学特例）
  const ch2Ok = everyQ(2, a => a === '5/2/order');            // ch2 全 order+干扰 池 5 型 2
  const ch3Kinds = new Set(chAgg[3].flat().map(a => a.split('/')[2]));
  const ch3Rain = chAgg[3].every(arr => arr.filter(a => a.endsWith('/rain')).length >= 2);
  const ch3Ok = chAgg[3].length === 5 && ch3Kinds.size === 2 && ch3Rain &&  // ch3 rain≥2/关 双 kind 混合
                chAgg[3].every(arr => arr[0].endsWith('/rain'));            // 题0 恒 rain（flat10q0 锚点）
  const ch4Ok = everyQ(4, a => a === '4/4/miss');             // ch4 全 miss 候选 4 型 4
  const aggOk = ch1Ok && ch2Ok && ch3Ok && ch4Ok &&
                genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0 &&   // 生成关四型全现
                sleepSeen >= 1;                               // 封闭集代表流程在场
  if (aggOk) npass++;
  units.dist = { ok: aggOk, ch1: ch1Ok, ch2: ch2Ok, ch3: ch3Ok, ch4: ch4Ok,
                 ch3Kinds: Array.from(ch3Kinds), genDch: genDch, sleep: sleepSeen };

  /* ---- ⑱ 章末预告：hint[i]↔CHAPTERS[i+1]（独立副本逐点 0-19）+ 生成关实算（家族 F，20-39 全量）
     + off-by-one 哨兵（hintChSentinel：章末预告=下一章 hint ≠本章 hint——右移错必炸） ---- */
  total++;
  const CH_LEN_I = 5;                                         // 独立副本（禁引 CH_LEN）
  let hintAllOk = true, hintBad = '';
  for (let f = 0; f < 20 && hintAllOk; f++) {                  // 静态关逐点独立复算
    const ci = Math.floor(f / CH_LEN_I);                       // 0 基章号
    const expect = ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
    if (nextHint(f) !== expect) { hintAllOk = false; hintBad = 'f' + f; }
  }
  for (let f = 20; f < 40 && hintAllOk; f++) {                 // 生成关全量实算（家族 F）
    if (nextHint(f) !== GEN_HINTS[genLevel(f + 1).dch - 1]) { hintAllOk = false; hintBad = 'g' + f; }
  }
  const hintChSentinel = nextHint(4) === CHAPTERS[1].hint &&    // ch1 末（f4，ci=0）→ CHAPTERS[1]（预告 ch2）
                         nextHint(4) !== CHAPTERS[2].hint &&    // 防 +2 越位（预告跳章）
                         nextHint(9) === CHAPTERS[2].hint &&    // ch2 末 → CHAPTERS[2]（预告 ch3）
                         nextHint(9) !== CHAPTERS[3].hint &&
                         nextHint(14) === CHAPTERS[3].hint &&   // ch3 末 → CHAPTERS[3]（预告 ch4）
                         nextHint(14) !== CHAPTERS[4].hint &&
                         nextHint(19) === CHAPTERS[4].hint &&   // ch4 末 → CHAPTERS[4]（预告生成关）
                         nextHint(0) === CHAPTERS[1].hint &&    // 章内非末关同值（预告恒定不随关漂移）
                         nextHint(2) === nextHint(4);
  const hintChOk = CHAPTERS[1].hint.indexOf('捣蛋') >= 0 &&                   // 预告 ch2 干扰
                   CHAPTERS[2].hint.indexOf('下雨') >= 0 &&                   // 预告 ch3 条件
                   CHAPTERS[3].hint.indexOf('少了') >= 0 &&                   // 预告 ch4 缺步
                   CHAPTERS[4].hint.indexOf('新') >= 0 &&                     // 预告生成关
                   GEN_HINTS[0].indexOf('在前') >= 0 &&                      // dch1 可换序（谁在前=依赖方向）
                   GEN_HINTS[1].indexOf('捣蛋') >= 0 &&                       // dch2 干扰
                   GEN_HINTS[2].indexOf('伞') >= 0 &&                         // dch3 条件
                   GEN_HINTS[3].indexOf('少掉') >= 0;                         // dch4 缺步
  if (hintAllOk && hintChSentinel && hintChOk) npass++;
  units.hints = { ok: hintAllOk && hintChSentinel && hintChOk, all: hintAllOk, bad: hintBad,
                  sentinel: hintChSentinel,
                  chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑨ 家族 A/B/D/F/I/J/K 源码级断言（Function.toString 含关键串） ---- */
  total++;
  const srcBoot = boot.toString(), srcWin = winFlow.toString(), srcHint = nextHint.toString(),
        srcResc = rescueTick.toString(), srcStart = startLevel.toString(), srcTap = uiTapCard.toString(),
        srcSayW = sayW.toString();
  const contractOk =
    srcBoot.indexOf('nextHint(lim - 1)') >= 0 &&                                  // A：启动 dayEnd 传 lim-1
    srcWin.indexOf('nextHint(null)') >= 0 &&                                      // A：winFlow 传 null（等价）
    srcHint.indexOf('genLevel(f + 1).dch - 1') >= 0 &&                            // F：生成关 hint 实算
    srcHint.indexOf('(ci + 1) % 4') < 0 &&                                        // F：禁章序推进
    srcResc.indexOf('wrongChainUntil') >= 0 &&                                    // I：链豁免守卫
    srcResc.indexOf('lastDir') >= 0 && srcResc.indexOf('lastAct') >= 0 &&         // B：救援双锚
    srcResc.indexOf('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel') >= 0 &&   // K：面板守卫
    srcStart.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&          // I/J：换关双锚重置
    srcTap.indexOf('wrongChainUntil = Date.now() + 7100') >= 0 &&                 // I：错路径设豁免终点
    srcTap.indexOf("replayAnim(boardEl, 'bump')") >= 0 &&                         // D：吞输入容器 bump
    srcSayW.indexOf('10000') >= 0;                                                // J：语义句 10s 节流
  if (contractOk) npass++;
  units.contract = { ok: contractOk };

  /* ---- ⑬ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'storybed', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__sbVlog = out;                          // 结果挂全局（playwright 读取）
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 已 init，双保险）
     voice.play 记录调用 key（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）；
     voice.say 记录 TTS 拼句（__lastSay）——供教学链/逐点链/错链断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k) { window.__lastVoiceKey = k || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  KIDS.voice.say = function (t) { window.__lastSay = t || null; };
  runVerify();
}
