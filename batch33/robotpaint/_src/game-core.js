/* ================= 机器画师 robotpaint 纯引擎：确定性关卡生成 + 五题型判定状态机
   （r18 难度改造 2026-09-18，AUDIT-78 黄款；无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 1151)（本款常量 1151，SPEC-BATCH33 §0.81 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   章型（r18：每关 6 题 CH_LEN / 静态 24 关=4 章；进度章号单调递增、难度章号
   dch=1+flat//6 静态四档，生成关 flat≥24 恒 dch=4）：
     dch1 plain 三轴组指令（无 breathe）
     dch2 neg 否定指令 + edit 两步修改（NEG/EDIT_AXES_N=1；无 breathe）
     dch3 mem 记忆复现 + dual 双画师并行（miss≥2 不一致轴块 breathe——首错不指轴）
     dch4 生成：五题型混出（seeded）+ breathe（ch3+ 同档；NEG/EDIT_AXES_N=2）
   rnd 取数顺序钉死（确定性依据，禁改序）：①kind（pool 内 ri 取一）→ ②目标三元组
   （drawTriple：先 color 后 shape 后 size）→ ③kind 附加（edit 各 to 值 / dual 第二目标
   补抽）→ ④块池（三轴组各一次组内 Fisher-Yates——每组消耗 轴长-1 次恒定）。
   铁律：属性三轴互独立（轴内值互异天然成立——封闭集 3/3/2 各取一）；
     块池 r18=轴分组恒续（色 3|形 3|大小 2 连续段）+ 组内 seeded 打乱（防位置查表），
     恒全摆不消耗——指令可编辑；
     neg 排除集=轴封闭集∖{目标值}（补集唯一=目标值——封闭集补全推理可满足）；
     edit 每处修改 from≠to（轴内重抽保证），终态=start∘edits（两步复合可满足）；
     dual 两目标 g1≠g2（seeded 重抽保证——工作记忆分叉）。
   相位：q.phase 'pick'（选块填槽）→ 'paint'（画师作画演出，吞输入）→ 'compare'
   （比对反馈）→ 判对推进（下一题 pick / 末题终态 'won'）；判错 compare→pick
   （槽保留可改——错轴可视化=画师忠实执行，painted 保留供比对）。
   dual 双任务：任务一判对（t1Done=true，painted1 留档）不推进 L.step，
   engAfterConfirm 切任务二（tIdx=1、target=goals[1]、槽复位、phase='pick'）；
   任务二判对才 solved/L.step++（quiz.miss 两任务累计）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 三元组工具 ---------- */
/* drawTriple：rnd 序钉死 color→shape→size（18 组合全域均匀） */
function drawTriple(rnd) {
  return { color: COLORS[ri(rnd, 0, 2)], shape: SHAPES[ri(rnd, 0, 2)], size: SIZES[ri(rnd, 0, 1)] };
}
const sameTriple = (a, b) => !!a && !!b && a.color === b.color && a.shape === b.shape && a.size === b.size;
const tripleInDomain = t => !!t && COLORS.indexOf(t.color) >= 0 && SHAPES.indexOf(t.shape) >= 0 &&
  SIZES.indexOf(t.size) >= 0;
const firstEmpty = slots => { for (let i = 0; i < slots.length; i++) if (!slots[i].val) return i; return slots.length; };
/* r18 块池：轴分组恒续（AXES 序）+ 组内 seeded 打乱（同轴多值干扰恒全摆、
   值-位置查表失效——组内序每题独立于基序） */
function buildBlocks(rnd) {
  const blocks = [];
  AXES.forEach(ax => {
    shuffled(AXIS_POOL[ax], rnd).forEach(v => blocks.push({ axis: ax, val: v }));
  });
  return blocks;
}

/* ---------- 单题构建（五 kind）：rnd 序=①kind ②目标 ③kind 附加 ④块池 ----------
   kind 附加形态：
     neg   negMap={axis:[排除值…]}（排除集=轴封闭集∖{target[axis]}，呈现为打叉芯片）
     edit  start=起始三元组 + edits=[{axis,from,to}…]（from=start[ax]、to 轴内异于 from；
           target=start∘edits——两步修改终态）
     mem   q.mem=true（UI 闪现窗后罩目标——引擎只标记，呈现归 UI）
     dual  goals=[g1,g2]（g1≠g2）；target=g1，任务二在 engAfterConfirm 切为 g2 */
function buildQuiz(dch, rnd) {
  const pool = KIND_POOL[dch];
  const kind = pool[ri(rnd, 0, pool.length - 1)];          /* ①kind */
  const q = {
    kind: kind, mem: kind === 'mem', flashDone: false,
    target: null,
    slots: AXES.map(ax => ({ axis: ax, val: null })),
    slotIdx: 0,
    blocks: null,
    phase: 'pick', painted: null, judged: null,
    miss: 0, solved: false,
    negMap: null, start: null, edits: null,
    goals: null, tIdx: 0, t1Done: false, painted1: null
  };
  q.target = drawTriple(rnd);                              /* ②目标 */
  if (kind === 'neg') {                                    /* ③neg：否定呈现轴 seeded 取 N 个 */
    const negAxes = shuffled(AXES.slice(), rnd).slice(0, NEG_AXES_N[dch]);
    q.negMap = {};
    negAxes.forEach(ax => {
      q.negMap[ax] = AXIS_POOL[ax].filter(v => v !== q.target[ax]);   /* 排除集=补目标 */
    });
  } else if (kind === 'edit') {                            /* ③edit：修改轴 seeded 取 N 个 */
    const edAxes = shuffled(AXES.slice(), rnd).slice(0, EDIT_AXES_N[dch]);
    q.start = { color: q.target.color, shape: q.target.shape, size: q.target.size };
    q.target = { color: q.start.color, shape: q.start.shape, size: q.start.size };
    q.edits = edAxes.map(ax => {
      const others = AXIS_POOL[ax].filter(v => v !== q.start[ax]);
      const to = others[ri(rnd, 0, others.length - 1)];    /* to≠from（轴内重抽） */
      q.target[ax] = to;                                   /* target=start∘edits */
      return { axis: ax, from: q.start[ax], to: to };
    });
  } else if (kind === 'dual') {                            /* ③dual：第二目标补抽至 g1≠g2 */
    let g2 = drawTriple(rnd), guard = 0;
    while (sameTriple(q.target, g2) && guard++ < 20) g2 = drawTriple(rnd);
    q.goals = [{ color: q.target.color, shape: q.target.shape, size: q.target.size }, g2];
  }
  q.blocks = buildBlocks(rnd);                             /* ④块池（组内打乱） */
  q.slotIdx = firstEmpty(q.slots);
  return q;
}

/* ---------- 关卡生成（静态 24 关与生成关同一确定性通道；生成关 flat≥24 恒 dch=4
   ——SPEC §-r18「ch4 生成五题型混出」，无 dch 随机） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 1151);
  const dch = flat < STATIC_LEVELS ? dch0 : 4;
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 教学关（仅 UI 层用：目标=红色大圆形三轴完整流程（点红/圆/大 三块），
   三槽全空（kind='plain' 基础形态——教学展示完整三指令）；SPEC §3 ---------- */
function genTutLevel() {
  const q = {
    kind: 'plain', mem: false, flashDone: false,
    target: { color: 'red', shape: 'cir', size: 'big' },
    slots: AXES.map(ax => ({ axis: ax, val: null })),
    slotIdx: 0,
    blocks: buildBlocks(mulberry32(1)),          /* 固定种子演示块池（轴分组+组内序稳定） */
    phase: 'pick', painted: null, judged: null,
    miss: 0, solved: false,
    negMap: null, start: null, edits: null,
    goals: null, tIdx: 0, t1Done: false, painted1: null
  };
  return { flat: -1, ch: 1, dch: 1, lv: 0, quizzes: [q],
           step: 0, retries: 0, done: false, tutLevel: true };
}

/* ---------- 点块引擎（无 DOM）：engTapBlock(L, i) —— 点第 i 块候选（blocks 下标）
   'fill'  填入当前槽（块轴==当前槽轴且当前槽空）：slots[slotIdx].val=块值、
           播块名音、slotIdx=下一个空槽
   'ready' 末槽填满（三槽满待画——「画！」亮起）
   'wrong-axis' 点异轴块（说得清楚=按槽序说——吞不填，UI 层转 false+轻叮+当前槽 flash）
   null    非法下标 / 非 pick 相位（paint/compare 演出期吞）/ 关卡已结束 ---------- */
function engTapBlock(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.blocks.length) return null;
  if (q.phase !== 'pick') return null;                       /* paint/compare 吞 */
  const b = q.blocks[i];
  const curAx = q.slots[q.slotIdx] ? q.slots[q.slotIdx].axis : null;
  if (!curAx) return null;                                   /* 三槽满（无待填槽） */
  if (b.axis !== curAx) return 'wrong-axis';                 /* 异轴块吞（方向级） */
  q.slots[q.slotIdx].val = b.val;
  q.slotIdx = firstEmpty(q.slots);
  return q.slotIdx >= q.slots.length ? 'ready' : 'fill';
}

/* ---------- 点槽引擎（无 DOM）：engTapSlot(L, i) —— 点第 i 槽（pick 相位）
   'clear' 已填可改槽：清空、slotIdx=i（回该轴选择——指令可编辑，SPEC 明示）
   null    空槽 / 非 pick 相位 / 非法下标（r18 无预填锁定槽） ---------- */
function engTapSlot(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.slots.length) return null;
  if (q.phase !== 'pick') return null;
  const s = q.slots[i];
  if (!s.val) return null;                                   /* 空槽无可清 */
  s.val = null;
  q.slotIdx = i;
  return 'clear';
}

/* ---------- 「画！」引擎相位口（无 DOM）——判定集中 tapGo（SPEC §0.81）
   engToPaint(L)：pick→paint（前置：三槽满）。UI tapGo 入口调用（守卫通过后），
     演出窗=go 1176+3×800+300 ≥3876（paint 相位锁定，SPEC §4）。
   engTapGo(L)：paint→compare + 判定（演出完调用）。产出 painted=三槽值忠实组装
     （错轴可视化依据——不像=指令不精确）：
     { r:'right', painted, last, nextTask } 三元组全对。dual 任务一：t1Done=true、
        painted1 留档、nextTask=true（L.step 不动——engAfterConfirm 切任务二）；
        其余：solved=true、L.step++/L.done 推进，last=末题——UI 返回 'done'（教学关除外）
     { r:'wrong', painted } 任一属性错（miss+1（dual 两任务累计），槽保留可改——
        engine 不清槽；UI 演出错链后 engBackToPick 回 pick 供改槽重画）
     null 相位不符 / 已解题 / 关卡已结束。
   engAfterConfirm(L)：对题确认链演出完——dual 任务一（t1Done 且未 solved 且仍在
     compare）切任务二（tIdx=1、target=goals[1]、槽/painted 复位、phase='pick'）；
     其余=已推进的末解题（quizzes[L.step-1]）本题终态 phase='won'（末题 quiz getter
     仍可读：done 后返回末题，phase='won'）。
   engBackToPick(L)：错题反馈完——compare→pick（槽保留、painted/judged 保留供比对）。 */
function engToPaint(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'pick') return false;
  if (firstEmpty(q.slots) < q.slots.length) return false;    /* 三槽未满不可画 */
  q.phase = 'paint';
  return true;
}
function engTapGo(L) {
  if (!L || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q.phase !== 'paint') return null;
  const painted = { color: q.slots[0].val, shape: q.slots[1].val, size: q.slots[2].val };
  const ok = painted.color === q.target.color &&
             painted.shape === q.target.shape &&
             painted.size === q.target.size;
  q.painted = painted;                                       /* 忠实执行（错轴可视化） */
  q.phase = 'compare';
  if (ok) {
    q.judged = 'like';
    if (q.kind === 'dual' && q.tIdx === 0) {                 /* dual 任务一：不推进 step */
      q.t1Done = true;
      q.painted1 = { color: painted.color, shape: painted.shape, size: painted.size };
      return { r: 'right', painted: painted, last: false, nextTask: true };
    }
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return { r: 'right', painted: painted, last: L.done };
  }
  q.judged = 'diff';
  q.miss++;
  L.retries++;
  return { r: 'wrong', painted: painted, last: false };
}
function engAfterConfirm(L) {
  if (!L || L.step > L.quizzes.length) return false;
  const qd = L.quizzes[L.step];                              /* dual 任务一（step 未推进） */
  if (qd && qd.kind === 'dual' && qd.t1Done && !qd.solved && qd.phase === 'compare') {
    qd.tIdx = 1;
    qd.target = { color: qd.goals[1].color, shape: qd.goals[1].shape, size: qd.goals[1].size };
    qd.slots = AXES.map(ax => ({ axis: ax, val: null }));
    qd.slotIdx = 0;
    qd.painted = null;                                       /* painted1 已留档（画布A定格） */
    qd.judged = null;
    qd.phase = 'pick';
    return true;
  }
  if (!L.step) return false;
  const q = L.quizzes[L.step - 1];                           /* 已推进的末解题 */
  if (!q || !q.solved || q.phase !== 'compare') return false;
  q.phase = 'won';
  return true;
}
function engBackToPick(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'compare') return false;
  q.phase = 'pick';
  return true;
}

/* 不一致轴清单（wrong 后 miss≥2 答案级 breathe/比对 pulse 共用：ch3+ 才启用；
   dual 任务二=对当前 target 比对——q.target 已切 goals[1]） */
function diffAxes(q) {
  if (!q || !q.painted) return [];
  return AXES.filter(ax => q.painted[ax] !== q.target[ax]);
}
/* 轴的应选块下标（答案级 breathe/教学帮指/autoSolve 共用：当前待填槽轴的目标值块） */
function correctIdx(q) {
  if (!q || q.solved || q.phase !== 'pick') return -1;
  const ax = q.slots[q.slotIdx] ? q.slots[q.slotIdx].axis : null;
  if (!ax) return -1;
  for (let j = 0; j < q.blocks.length; j++)
    if (q.blocks[j].axis === ax && q.blocks[j].val === q.target[ax]) return j;
  return -1;
}
const engWon = L => !!L && L.done;
/* 星级（miss 口径）：全关错画 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- 结构校验（verify 用，返回失败原因或 null）：题型域 / kind 先验独立复算
   （neg 排除补全唯一 / edit 复合终态 / dual g1≠g2）/ 块池轴分组恒续+组内封闭集全量 /
   槽初始态干净 / kind 字段无泄漏 ---------- */
function structWhy(q, dch) {
  if (!q) return 'quiz';
  if (q.phase !== 'pick' || q.painted !== null || q.judged !== null ||
      q.miss !== 0 || q.solved || q.tIdx !== 0 || q.t1Done || q.painted1 !== null) return 'init';
  if (q.flashDone !== false) return 'initFlash';
  if (KIND_POOL[dch].indexOf(q.kind) < 0) return 'kind';     /* 章题型池 */
  if (!tripleInDomain(q.target)) return 'targetPool';
  if (q.kind === 'neg') {
    const negAxes = Object.keys(q.negMap || {});
    if (negAxes.length !== NEG_AXES_N[dch]) return 'negCount';
    for (const ax of negAxes) {
      if (AXES.indexOf(ax) < 0) return 'negAxis';
      const excl = q.negMap[ax];
      const rest = AXIS_POOL[ax].filter(v => excl.indexOf(v) < 0);
      /* 排除集=轴封闭集∖{目标值} → 补集唯一且=目标值（推理可满足性先验） */
      if (rest.length !== 1 || rest[0] !== q.target[ax]) return 'negExcl';
      if (excl.indexOf(q.target[ax]) >= 0) return 'negSelf';
    }
  }
  if (q.kind === 'edit') {
    if (!tripleInDomain(q.start)) return 'startPool';
    if (!Array.isArray(q.edits) || q.edits.length !== EDIT_AXES_N[dch]) return 'editCount';
    const fin = { color: q.start.color, shape: q.start.shape, size: q.start.size };
    for (const e of q.edits) {
      if (AXES.indexOf(e.axis) < 0) return 'editAxis';
      if (e.from !== q.start[e.axis]) return 'editFrom';
      if (e.to === e.from || AXIS_POOL[e.axis].indexOf(e.to) < 0) return 'editTo';
      fin[e.axis] = e.to;
    }
    /* 终态=start∘edits（两步复合——verify 独立复算同构） */
    if (fin.color !== q.target.color || fin.shape !== q.target.shape ||
        fin.size !== q.target.size) return 'editCompose';
  }
  if (q.kind === 'mem' && !q.mem) return 'memFlag';
  if (q.kind === 'dual') {
    if (!q.goals || q.goals.length !== 2) return 'dualGoals';
    if (!tripleInDomain(q.goals[0]) || !tripleInDomain(q.goals[1])) return 'dualPool';
    if (sameTriple(q.goals[0], q.goals[1])) return 'dualSame';
    if (q.target.color !== q.goals[0].color || q.target.shape !== q.goals[0].shape ||
        q.target.size !== q.goals[0].size) return 'dualCur';
  }
  /* kind 字段泄漏（非本题型不得携带其结构） */
  if (q.kind !== 'neg' && q.negMap) return 'negLeak';
  if (q.kind !== 'edit' && (q.start || q.edits)) return 'editLeak';
  if (q.kind !== 'dual' && (q.goals || q.painted1)) return 'dualLeak';
  if (q.kind !== 'mem' && q.mem) return 'memLeak';
  /* 块池：轴分组恒续（AXES 序连续段）+ 组内=封闭集全量（组内序 seeded 任意） */
  if (q.blocks.length !== 8) return 'blocksLen';
  let off = 0;
  for (const ax of AXES) {
    const n = AXIS_POOL[ax].length;
    const seg = q.blocks.slice(off, off + n);
    if (seg.some(b => b.axis !== ax)) return 'blocksGroup';
    const got = seg.map(b => b.val).sort().join(',');
    const want = AXIS_POOL[ax].slice().sort().join(',');
    if (got !== want) return 'blocksSet';
    off += n;
  }
  if (firstEmpty(q.slots) !== q.slotIdx) return 'slotIdx';
  return null;
}
