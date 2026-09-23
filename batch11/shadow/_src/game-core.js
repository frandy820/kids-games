/* ================= shadow 纯引擎（r8）：确定性关卡生成 + 连解/重叠点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   r8 题型（章进阶见 game-data 头注；dch=难度章号 (ch-1)%4+1 循环，生成关随机 1-4）：
     multi   多物同框连解：targets 2-4 物 + 1 干扰卡；逐物连对（连对消显 _pick，_phase 推进）；
             点"未来目标卡"= 晃动零惩罚不灰（该卡接下来还要连）——wrong 但不 _dim
     overlap 两物重叠拆解：pair 同组 2 物 + 2 同组干扰；双选（选对 2 张完成本题）
   旋转（机制①）：全卡随机（multi qi1+ 于 dch2/3：目标卡恒 ∈{90,180,270}、干扰卡含 0 随机）；
     热身题（各章 qi0）与 dch1 全 0——新维度首现给无新维度样本（§1 承 batch10 P1②）
   遮蔽（机制①叠加）：q.veil 全卡一致（只遮答案卡会反向泄题）；dch3 qi1+ 与 dch4 qi3+ 开启
   干扰：同组优先（round 组恰 4 物：multi4 时组内不足补邻组）；相邻题主目标互异（首目标代表） */
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
const pick1 = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const GROUPS = ['quad', 'round', 'feat'];

/* ---------- 目标组选取：随机起组轮询，组内（排除上题主目标 avoidOne）够 cnt 物则取。
   avoidOne=上题首目标单 id（组容量 quad6/feat5/round4，排 1 后恒有组可选——
   "相邻题主目标互异"原口径，multi 下取首目标代表，避免全集不交约束击穿小组容量） */
function pickGroupIds(rnd, cnt, avoidOne) {
  const g0 = Math.floor(rnd() * GROUPS.length);
  for (let k = 0; k < GROUPS.length; k++) {
    const pool = LIB_IDS.filter(id => groupOf(id) === GROUPS[(g0 + k) % GROUPS.length] && id !== avoidOne);
    if (pool.length >= cnt) return shuffled(pool, rnd).slice(0, cnt);
  }
  return shuffled(LIB_IDS.filter(id => id !== avoidOne), rnd).slice(0, cnt);   // 理论不可达兜底
}

/* ---------- 单题生成（rnd 同流保证确定性；avoidOne=上题首目标，相邻题主目标互异）
   返回 {mode, targets[](multi 连解目标序/overlap=pair 双选), options[](库 id 含全部目标+干扰，互异),
   rot[](各卡旋转), veil[](各卡遮蔽——全卡一致), _dim[](灰化), _pick[](连对消显), _phase(子步), _miss, _answered} */
function genOne(dch, qi, rnd, avoidOne) {
  const warm = qi === 0;                                // 各章首题热身：无本章新维度（§1 承 batch10 P1②）
  if (dch === 4 && !warm && qi <= 2) {                  // ---- overlap 两物重叠拆解（dch4 qi1-2）----
    /* pair 同组 2 物 + 2 同组干扰，零旋转零遮蔽（重叠本身即本章新维度）；组内排除首目标后 ≥4 则取 */
    const g0 = Math.floor(rnd() * GROUPS.length);
    let pool = [];
    for (let k = 0; k < GROUPS.length; k++) {
      const cand = LIB_IDS.filter(id => groupOf(id) === GROUPS[(g0 + k) % GROUPS.length] && id !== avoidOne);
      if (cand.length >= 4) { pool = shuffled(cand, rnd); break; }
    }
    if (pool.length < 4) pool = shuffled(LIB_IDS.filter(id => groupOf(id) === 'quad' && id !== avoidOne), rnd);
    const options = shuffled(pool.slice(0, 4), rnd);
    return { mode: 'overlap', targets: null, pair: pool.slice(0, 2),
             options: options, rot: options.map(() => 0), veil: options.map(() => false),
             _dim: options.map(() => 0), _pick: options.map(() => 0), _phase: 0,
             _miss: 0, _answered: false };
  }
  /* ---- multi 多物连解：dch1 qi0=2 物热身 / dch1 qi1-4=3-4 物 / dch2-4 qi0=3 物热身 / 其余 3 物 ---- */
  const cnt = dch === 1 ? (warm ? 2 : ri(rnd, 3, 4)) : 3;
  const targets = pickGroupIds(rnd, cnt, avoidOne);
  const tg = groupOf(targets[0]);
  /* 干扰 1 张：同组优先（组内非目标剩余），不足补邻组（multi4 round 组场景） */
  let ds = shuffled(LIB_IDS.filter(id => groupOf(id) === tg && targets.indexOf(id) < 0), rnd).slice(0, 1);
  if (!ds.length) {
    ds = shuffled(LIB_IDS.filter(id => groupOf(id) !== tg && targets.indexOf(id) < 0), rnd).slice(0, 1);
  }
  const options = shuffled(targets.concat(ds), rnd);
  /* 旋转：热身/dch1 全 0；dch2/3 qi1-4 与 dch4 qi3-4——目标卡恒非 0（每题必有旋转样本），
     干扰卡含 0 随机（全卡随机=公平无元线索，不泄答案） */
  const spin = !warm && dch !== 1 && !(dch === 4 && qi <= 2);
  const rot = options.map(id => {
    if (!spin) return 0;
    return targets.indexOf(id) >= 0 ? pick1(rnd, [90, 180, 270]) : pick1(rnd, [0, 90, 180, 270]);
  });
  /* 遮蔽 70%（全卡一致）：dch3 qi1+ 与 dch4 qi3+ 开启（机制①叠加态） */
  const veilOn = !warm && (dch === 3 || (dch === 4 && qi >= 3));
  return { mode: 'multi', targets: targets, pair: null,
           options: options, rot: rot, veil: options.map(() => veilOn),
           _dim: options.map(() => 0), _pick: options.map(() => 0), _phase: 0,
           _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const quizzes = [];
  let avoidOne = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, avoidOne);
    avoidOne = (q.targets || q.pair)[0];           // 相邻题主目标互异（首目标代表）
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 当前应点卡下标（multi=当前 phase 目标卡 / overlap=pair 中第一张未选卡）
   UI 高亮、救援 breathe、autoSolve、verify 驱动共用同一真值源 */
function wantOf(q) {
  if (!q) return -1;
  if (q.mode === 'overlap') {
    return q.options.findIndex((id, i) => q.pair.indexOf(id) >= 0 && !q._pick[i]);
  }
  return q.options.indexOf(q.targets[q._phase]);
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点第 i 张剪影卡
   'right' 连对一步（本题未完）/ 'done' 最后一步完成且本关通关（right 的完成态超集在题末返回）
   'wrong' 答错（干扰卡灰掉排除法保底；未来目标卡晃动零惩罚不灰——还要连）
   'again' 已灰/已消显卡（早退零惩罚不计数，防御层；真实点击被 pointer-events:none 拦，hook 兜底）
   null 非法下标或关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!Number.isInteger(i) || i < 0 || i >= q.options.length) return null;
  if (q._dim[i] || q._pick[i]) return 'again';
  const hit = q.mode === 'overlap'
    ? q.pair.indexOf(q.options[i]) >= 0
    : i === wantOf(q);
  if (hit) {
    q._pick[i] = 1;
    q._phase++;                                    // multi=已连对物数 / overlap=已选对数
    if (q._phase >= (q.mode === 'overlap' ? 2 : q.targets.length)) {
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return L.done ? 'done' : 'right';
    }
    return 'right';                                // 连对一步，本题未完（消显后连下一物）
  }
  /* wrong：multi 未来目标卡不灰（该卡接下来还要连——"连错零惩罚"不破坏后续连解） */
  const future = q.mode === 'multi' && q.targets.indexOf(q.options[i]) >= 0;
  if (!future) q._dim[i] = 1;
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点（retries=0）=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星（SPEC §1） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：mode 合法 / 目标在库互异 / 候选含全部目标互异
   / 旋转 ∈{0,90,180,270} / veil 布尔全卡一致 / 初始态干净。返回具体失败原因便于审计 */
function structWhy(q) {
  if (!q) return 'q';
  if (q.mode !== 'multi' && q.mode !== 'overlap') return 'mode';
  const tg = q.targets, n = q.options.length;
  if (q.mode === 'multi') {
    if (!Array.isArray(tg) || tg.length < 2 || tg.length > 4) return 'tgtLen';
    if (tg.some(id => !LIB[id])) return 'tgtLib';
    if (tg.filter((v, i, a) => a.indexOf(v) === i).length !== tg.length) return 'tgtDup';
    if (n !== tg.length + 1) return 'optLen';             // multi = targets + 1 干扰
  } else {
    if (!Array.isArray(q.pair) || q.pair.length !== 2) return 'pairLen';
    if (q.pair.some(id => !LIB[id])) return 'pairLib';
    if (q.pair[0] === q.pair[1]) return 'pairDup';
    if (groupOf(q.pair[0]) !== groupOf(q.pair[1])) return 'pairGrp';   // 重叠双物同组
    if (n !== 4) return 'optLen';                        // overlap = pair + 2 干扰
  }
  const uniq = q.options.filter((v, i, a) => a.indexOf(v) === i);
  if (uniq.length !== n) return 'optDup';
  if (!q.options.every(v => LIB[v])) return 'optLib';
  if (!(q.mode === 'multi' ? tg.every(id => q.options.indexOf(id) >= 0)
                           : q.pair.every(id => q.options.indexOf(id) >= 0))) return 'optCover';
  if (!Array.isArray(q.rot) || q.rot.length !== n) return 'rotLen';
  for (let i = 0; i < n; i++) {
    if ([0, 90, 180, 270].indexOf(q.rot[i]) < 0) return 'rotVal';
  }
  if (!Array.isArray(q.veil) || q.veil.length !== n) return 'veilLen';
  if (!q.veil.every(v => v === q.veil[0])) return 'veilMix';    // 全卡一致（公平无元线索）
  if (q._miss !== 0) return 'miss';
  if (!q._dim.every(v => !v)) return 'dim';
  if (!q._pick.every(v => !v)) return 'pick';
  if (q._phase !== 0) return 'phase';
  if (q._answered) return 'answered';
  return null;
}
