/* ================= storybed 纯引擎 v2（r10）：确定性关卡生成 + 依赖图「合理序」状态机（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 59)（batch30 本批常量 59，注明）：同 flat 永远同关（重玩一致、verify 可检）。
   章型 v2（SPEC-BATCH30 §6 r10；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 可换序多解（order：4 步依赖图判定——DEPS 判「合理序」非唯一序；flat0q0=sleep 前 3 步教学特例）
     dch2 order+1 干扰卡（干扰=其他流程步骤且文本∉本流程文本集，点干扰=wrong+miss）
     dch3 条件分支（题0 恒 rain=flat10q0 确定性锚点；关内 rain 题 nRain=ri(2,3) 均 out+「带小伞」5 步，
       其余位 order+干扰、流程取非 out 的 5 流程互异）
     dch4 缺步补卡（miss：流程 4 步链缺 1 步+4 候选卡=真值+3 干扰，找缺+补对双步认知）
   玩法铁律（§6 逐点制 v2）：点当前合法步骤（未完成∧前置全完成，miss 题=缺失步）='step'
   （placed 追加=槽序=点选次序）→末步='right'（末题='done'）；点非法步骤（前置未完成/已点
   .done 卡/干扰卡/miss 错卡）='wrong'+miss；越界/结束=null。
   已点步骤卡 .done 淡化保留（再点=wrong 同口径——SPEC 定版）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 合法步骤集（r10 依赖图判定核心）：未完成 ∧ 前置集 ⊆ 已完成集
   miss 题合法集=单元素 [missingId]（兼容单答案语义） ---------- */
function legalSteps(q) {
  if (!q || q.solved) return [];
  if (q.kind === 'miss') return [q.missingId];
  const doneSet = new Set(q.placed);
  return q.stepIds.filter(id => {
    if (doneSet.has(id)) return false;
    const n = +id.split('_')[1];
    return (q.deps[n] || []).every(d => doneSet.has(q.flow + '_' + d));
  });
}
/* 应点卡下标（救援/autoSolve/教学用：合法集首步在卡池中的展示位） */
function engAnswerIdx(q) {
  const ls = legalSteps(q);
  if (!ls.length) return -1;
  for (let i = 0; i < q.pool.length; i++) if (q.pool[i].stepId === ls[0]) return i;
  return -1;
}

/* ---------- 卡池乱序：洗牌后若完成步骤在池中的出现序恰=SPEC 正序（过滤干扰位）则重洗
   （乱序卡≠已排好的序——保排序挑战在场；干扰卡任意位均合法；miss 候选池无正序概念直接洗） ---------- */
function genPoolOrder(stepIds, distractId, rnd) {
  const ids = stepIds.concat(distractId ? [distractId] : []);
  let pool = shuffled(ids, rnd), guard = 0;
  const inOrder = p => p                              // 完成序出现位=正序？
    .map(id => stepIds.indexOf(id))
    .filter(x => x >= 0)
    .every((x, i, a) => a[i] === i);
  while (inOrder(pool) && guard++ < 24) pool = shuffled(ids, rnd);
  return pool;
}

/* ---------- 单题生成 v2：mkQuiz(flow, roll, rnd, opt) → 三型题
   opt.short=true → 前 3 步短流程（flat0q0 教学特例，仅 sleep 锚点用）
   opt.distract=true → order 题加 1 干扰卡；opt.miss=true → 缺步补卡题 ---------- */
function mkQuiz(flow, roll, rnd, opt) {
  opt = opt || {};
  const full = FLOWS[flow].steps.map((s, n) => ({
    stepId: stepIdOf(flow, n), text: s.t }));
  /* miss 型：链=4 步去 1（缺口位 seeded），候选 4=真值+3 干扰 */
  if (opt.miss) {
    const gapIdx = ri(rnd, 0, 3);
    const missing = full[gapIdx];
    const others = [];                                   // 干扰池：其他流程步骤且文本∉本流程
    FLOW_IDS.forEach(of => {
      if (of === flow) return;
      FLOWS[of].steps.forEach((s, n) => {
        if (full.map(f => f.text).indexOf(s.t) < 0) others.push(stepIdOf(of, n));
      });
    });
    const ds = shuffled(others, rnd).slice(0, 3);
    const pool = shuffled([missing.stepId].concat(ds), rnd).map(id => {
      const f = id.split('_');
      return { stepId: id, text: FLOWS[f[0]].steps[+f[1]].t, done: false };
    });
    return { kind: 'miss', flow: flow, name: FLOWS[flow].name, dch: roll,
             stepIds: full.map(f => f.stepId), texts: full.map(f => f.text),
             deps: null, pool: pool, placed: [], pos: 0, miss: 0, solved: false,
             chainSteps: full.filter((x, i) => i !== gapIdx).map(x => x.stepId),
             gapIdx: gapIdx, missingId: missing.stepId, missingText: missing.text };
  }
  /* rain 型：out 五步（4=带小伞），依赖=RAIN_DEPS */
  if (opt.rain) {
    const ids = full.map(f => f.stepId).concat([stepIdOf(flow, 4)]);
    const pool = genPoolOrder(ids, null, rnd).map(id => {
      const f = id.split('_');
      const t = +f[1] === 4 ? COND.rain.text : FLOWS[f[0]].steps[+f[1]].t;
      return { stepId: id, text: t, done: false };
    });
    return { kind: 'rain', flow: flow, name: FLOWS[flow].name, dch: roll,
             stepIds: ids, texts: ids.map(id => {
               const f = id.split('_');
               return +f[1] === 4 ? COND.rain.text : FLOWS[f[0]].steps[+f[1]].t;
             }),
             deps: RAIN_DEPS, pool: pool, placed: [], pos: 0, miss: 0, solved: false };
  }
  /* order 型：短流程（前 3 步，仅 flat0q0）或全 4 步（+可选 1 干扰） */
  const useN = opt.short ? 3 : 4;
  const steps = full.slice(0, useN);
  const stepIds = steps.map(s => s.stepId);
  const texts = steps.map(s => s.text);
  let distractId = null;
  if (opt.distract) {
    const others = [];
    FLOW_IDS.forEach(of => {
      if (of === flow) return;
      FLOWS[of].steps.forEach((s, n) => {
        if (texts.indexOf(s.t) < 0) others.push(stepIdOf(of, n));   // 文本∉本流程
      });
    });
    distractId = others[ri(rnd, 0, others.length - 1)];
  }
  const pool = genPoolOrder(stepIds, distractId, rnd).map(id => {
    const f = id.split('_');
    return { stepId: id, text: FLOWS[f[0]].steps[+f[1]].t, done: false };
  });
  /* 依赖图：子流程裁剪（short 时前置∩保留集——sleep 前 3 步无前置，裁剪为防御性） */
  const depFull = DEPS[flow];
  const deps = {};
  steps.forEach(s => {
    const n = +s.stepId.split('_')[1];
    deps[n] = (depFull[n] || []).filter(d => stepIds.indexOf(stepIdOf(flow, d)) >= 0);
  });
  return { kind: 'order', flow: flow, name: FLOWS[flow].name, dch: roll,
           stepIds: stepIds, texts: texts, deps: deps,
           pool: pool, placed: [], pos: 0, miss: 0, solved: false };
}

/* ---------- 关卡生成 v2（静态 20 关与生成关同一确定性通道）
   flat0 题0 恒 sleep+3 步（教学演示锚点：__sbDemoR='right' 终值语义）
   dch3 题0 恒 rain（flat10q0=确定性锚点：verify 布局/驱动/题面断言） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 59);
  if (flat >= STATIC_LEVELS) rnd();                        // burn：mulberry32 首掷对 4 系统偏差（b25 坑④）
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4); // 生成关随机章参数（家族统一，先取数保确定性）
  const quizzes = [];
  if (dch === 1 || dch === 2) {                            // order 关：封闭 6 洗牌取 5 流程互异
    const seq = shuffled(FLOW_IDS, rnd).slice(0, CH_LEN);
    if (flat === 0 && seq[0] !== 'sleep') {                // 教学锚点：题0 恒 sleep
      const i = seq.indexOf('sleep');
      seq[i] = seq[0]; seq[0] = 'sleep';
    }
    seq.forEach((f, qi) => quizzes.push(mkQuiz(f, dch, rnd, {
      short: flat === 0 && qi === 0, distract: dch === 2 })));
  } else if (dch === 3) {                                  // rain 混合关：题0 恒 rain，其余位 seeded
    const nRain = ri(rnd, 2, 3);
    const others = shuffled(FLOW_IDS.filter(f => f !== COND.rain.flow), rnd).slice(0, CH_LEN - nRain);
    const tail = shuffled(
      Array(nRain - 1).fill('rain').concat(Array(CH_LEN - nRain).fill('order')), rnd);
    const slots = ['rain'].concat(tail);
    slots.forEach(kind => quizzes.push(kind === 'rain'
      ? mkQuiz(COND.rain.flow, dch, rnd, { rain: true })
      : mkQuiz(others.pop(), dch, rnd, { distract: true })));
  } else {                                                 // miss 关：封闭 6 洗牌取 5 流程互异
    shuffled(FLOW_IDS, rnd).slice(0, CH_LEN)
      .forEach(f => quizzes.push(mkQuiz(f, dch, rnd, { miss: true })));
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎 v2：engTap(L, i) —— 点卡池展示位 i
   'step' 点对一步（题未完，placed 追加） / 'right' 末步完成本题 / 'done' 末题完成=通关
   / 'wrong' 非法点（前置未完成/已点 .done 卡/干扰卡/miss 错卡，miss+1）
   / null 越界/关已结束/本题已判 ---------- */
function engTap(L, i) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.pool.length) return null;
  const p = q.pool[i];
  if (q.kind === 'miss') {                               // 缺步题：点缺失步=一次补对
    if (p.stepId === q.missingId) {
      p.done = true;
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    q.miss++; L.retries++;
    return 'wrong';
  }
  const doneSet = new Set(q.placed);
  const n = +p.stepId.split('_')[1];
  const legal = !p.done && q.stepIds.indexOf(p.stepId) >= 0 &&
    (q.deps[n] || []).every(d => doneSet.has(q.flow + '_' + d));
  if (legal) {                                           // 当前合法步骤（多解题合法集内任一）
    p.done = true;
    q.placed.push(p.stepId);
    q.pos++;
    if (q.pos >= q.stepIds.length) {                     // 本题全部排对
      q.solved = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    return 'step';
  }
  q.miss++;                                              // 前置未完/已点/干扰卡同口径
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（miss 口径同族）：一关零错=3★ / 总错 ≤2=2★ / 否则 1★。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- 结构校验 v2（verify 用，返回失败原因或 null）：题型/依赖图/章型池深/
   干扰规则/卡池互异（stepId+text 双口径）/乱序非正序/初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prev) {
  if (!q || !FLOWS[q.flow]) return 'flow';
  if (q.dch !== dch) return 'dch';
  if (['order', 'rain', 'miss'].indexOf(q.kind) < 0) return 'kind';
  const ref = FLOWS[q.flow].steps;
  const short = flat === 0 && qi === 0 && dch === 1;     // 教学特例：sleep 前 3 步
  if (q.kind === 'miss') {                               // ---- miss 型 ----
    if (dch !== 4) return 'missDch';
    const want = 4;
    if (q.stepIds.length !== want) return 'stepN';
    for (let i = 0; i < want; i++) {
      if (q.stepIds[i] !== stepIdOf(q.flow, i)) return 'stepIds';
      if (q.texts[i] !== ref[i].t) return 'texts';
    }
    if (q.gapIdx < 0 || q.gapIdx > 3) return 'gap';
    if (q.missingId !== stepIdOf(q.flow, q.gapIdx)) return 'missingId';
    if (q.missingText !== ref[q.gapIdx].t) return 'missingText';
    if (q.chainSteps.length !== 3) return 'chainN';
    for (let i = 0; i < 3; i++) {                        // 链去缺口后保序
      const wantI = i < q.gapIdx ? i : i + 1;
      if (q.chainSteps[i] !== stepIdOf(q.flow, wantI)) return 'chain' + i;
    }
    if (q.chainSteps.some(id => id === q.missingId)) return 'chainHasMissing';
    if (q.pool.length !== 4) return 'poolN';
    const ids = q.pool.map(p => p.stepId), ts = q.pool.map(p => p.text);
    if (new Set(ids).size !== 4) return 'poolDupId';
    if (new Set(ts).size !== 4) return 'poolDupText';
    if (ids.indexOf(q.missingId) < 0) return 'poolMiss';
    const ext = q.pool.filter(p => q.stepIds.indexOf(p.stepId) < 0);
    if (ext.length !== 3) return 'distractN';
    if (ext.some(p => p.stepId.split('_')[0] === q.flow)) return 'distractSelf';
    if (ext.some(p => q.texts.indexOf(p.text) >= 0)) return 'distractText';
  } else if (q.kind === 'rain') {                        // ---- rain 型 ----
    if (dch !== 3) return 'rainDch';
    if (q.flow !== COND.rain.flow) return 'rainFlow';
    if (q.stepIds.length !== 5) return 'stepN';
    for (let i = 0; i < 4; i++) {
      if (q.stepIds[i] !== stepIdOf(q.flow, i)) return 'stepIds';
      if (q.texts[i] !== ref[i].t) return 'texts';
    }
    if (q.stepIds[4] !== stepIdOf(q.flow, 4) || q.texts[4] !== COND.rain.text) return 'umbrella';
    /* m-7：q.deps 即 RAIN_DEPS 同引用，比它=恒真互证。改为与 SPEC §6 重列字面比
       （真值另由 verify ② SPEC_RAIN_DEPS 独立表对账兜底） */
    if (JSON.stringify(q.deps) !== JSON.stringify({ 0: [], 1: [0], 2: [0], 4: [0], 3: [1, 2, 4] })) return 'rainDeps';
    if (q.pool.length !== 5) return 'poolN';
    const rids = q.pool.map(p => p.stepId), rts = q.pool.map(p => p.text);
    if (new Set(rids).size !== 5) return 'poolDupId';
    if (new Set(rts).size !== 5) return 'poolDupText';
    for (const id of q.stepIds) if (rids.indexOf(id) < 0) return 'poolMiss';
    /* 乱序非正序（保排序挑战在场） */
    const rp = rids.map(id => q.stepIds.indexOf(id));
    if (rp.every((x, i) => x === i)) return 'inOrder';
  } else {                                               // ---- order 型 ----
    if (dch === 4) return 'orderDch';
    const wantN = short ? 3 : 4;
    if (q.stepIds.length !== wantN) return 'stepN';
    for (let i = 0; i < wantN; i++) {
      if (q.stepIds[i] !== stepIdOf(q.flow, i)) return 'stepIds';
      if (q.texts[i] !== ref[i].t) return 'texts';
    }
    const wantPool = wantN + (dch === 2 || dch === 3 ? 1 : 0);
    if (q.pool.length !== wantPool) return 'poolN';
    const ids = q.pool.map(p => p.stepId), ts = q.pool.map(p => p.text);
    if (new Set(ids).size !== ids.length) return 'poolDupId';
    if (new Set(ts).size !== ts.length) return 'poolDupText';
    for (const id of q.stepIds) if (ids.indexOf(id) < 0) return 'poolMiss';
    const wantD = dch === 2 || dch === 3 ? 1 : 0;
    const ext = q.pool.filter(p => q.stepIds.indexOf(p.stepId) < 0);
    if (ext.length !== wantD) return 'distractN';
    if (wantD === 1) {
      if (ext[0].stepId.split('_')[0] === q.flow) return 'distractSelf';
      if (q.texts.indexOf(ext[0].text) >= 0) return 'distractText';
    }
    /* 依赖图与 DEPS 子图一致（short 裁剪） */
    const depFull = DEPS[q.flow];
    for (let i = 0; i < wantN; i++) {
      const want = (depFull[i] || []).filter(d => q.stepIds.indexOf(stepIdOf(q.flow, d)) >= 0);
      if (JSON.stringify(q.deps[i]) !== JSON.stringify(want)) return 'deps';
    }
    /* 乱序：完成步骤出现序 ≠ 正序（排序挑战在场） */
    const seqPos = ids.map(id => q.stepIds.indexOf(id)).filter(x => x >= 0);
    if (seqPos.every((x, i) => x === i)) return 'inOrder';
  }
  if (prev != null && q.kind !== 'rain' && prev.flow === q.flow) return 'adjFlow';   // order/miss 关流程互异（rain 题恒 out 允许相邻）   // 同型相邻重复（order/miss 关全互异）
  if (q.pos !== 0 || q.miss !== 0 || q.solved || q.placed.length !== 0) return 'init';
  if (q.pool.some(p => p.done)) return 'initDone';
  return null;
}
