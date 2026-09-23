/* ================= hidden 纯引擎：确定性关卡生成 + 场景命中检测（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关同场景（重玩一致、verify 可检）。
   章型（SPEC-BATCH22 §0.49/§1 + SPEC-R20-HIDDEN §R2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     型1（章1）单目标种 N∈[2,3] 遮蔽30-45% + 异种干扰动物 1 只（全可见，点它=「？」不算）
     型2（章2）单种 N∈[4,5] 遮蔽40-55% + 同系干扰半遮蔽[0.35,0.55] + 计数作答（countAsk）
     型3（章3）双目标种 N∈[4,5] 遮蔽35-60%（题面报数「找 2 只松鼠和 3 只刺猬」）+ 计数作答
     型4（章4）闪现混合：每题掷子型∈{2,3}（flash=true），全关 ≥2 种子型
   计数作答（SPEC-R20 §R3）：找全 → q.ansOpen=true 返回 'full' 不推进；
     engAnswer(L,num)：num==n 推进 right/done，≠ 返回 'retry'（不记 miss 不扣星）。
   铁律：目标位置互不重叠（SLOTS 位池互距 ≥256，命中圈 R=78 不相交）；
   遮蔽率逐只摇 [occMin,occMax] ⊆ [0.30,0.60]（超限重摇=采样区间天然受限）；
   miss 恒 0（无错误路径——点非目标不计数不记错，答数错=探索反馈）；星级恒 3★ */
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
const rf = (rnd, lo, hi) => lo + rnd() * (hi - lo);                 // [lo,hi) 浮点
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 章型位表（genLevel 预生成，genOne 逐题取用——型 4 混合需全关视野）
   章 1/2/3 恒定型；章 4 每题掷子型 {2,3}（型1 教学型不进混合，SPEC-R20 §R2），
   全同向时翻 qi1 保证 ≥2 种子型 ---------- */
function patFlagsOf(dch, rnd) {
  if (dch !== 4) return [dch, dch, dch, dch, dch];
  const f = [];
  for (let k = 0; k < CH_LEN; k++) f.push(2 + Math.floor(rnd() * 2));
  if (f.every(v => v === f[0])) f[1] = f[0] === 2 ? 3 : 2;   // 全同子型 → 造一题异子型
  return f;
}

/* ---------- 单题生成（rnd 同流保证确定性；lastKind/lastTheme=避免与上一题同物同景）
   返回 {theme, pattern, n, kinds[], targets[], distractor|null, seed, countAsk, flash}
   targets[]: {animal, x, y, occlusion, found} + _ok 遮挡物型 / _side 盖向（渲染用）
   r20：countAsk/flash 从 PATS 带；型2 同系干扰=SIM[目标种]+半遮蔽 distrOcc ---------- */
function genOne(pat, qi, rnd, lastKind, lastTheme, seed) {
  const P = PATS[pat];
  let theme = THEMES[Math.floor(rnd() * 4)];
  for (let t = 0; t < 8 && theme === lastTheme; t++) theme = THEMES[Math.floor(rnd() * 4)];
  const n = ri(rnd, P.nMin, P.nMax);
  let kinds;
  if (P.dual) {                                            /* 双目标种：各 ≥1，和=n */
    let a1 = ANIMAL_IDS[Math.floor(rnd() * ANIMAL_IDS.length)];
    let a2 = ANIMAL_IDS[Math.floor(rnd() * ANIMAL_IDS.length)];
    for (let t = 0; t < 8 && a2 === a1; t++) a2 = ANIMAL_IDS[Math.floor(rnd() * ANIMAL_IDS.length)];
    const k1 = ri(rnd, 1, n - 1);
    const first = rnd() < 0.5;                             /* 谁多谁少也确定摇 */
    kinds = [{ a: first ? a1 : a2, count: first ? k1 : n - k1 },
             { a: first ? a2 : a1, count: first ? n - k1 : k1 }];
  } else {
    let a = ANIMAL_IDS[Math.floor(rnd() * ANIMAL_IDS.length)];
    for (let t = 0; t < 8 && a === lastKind; t++) a = ANIMAL_IDS[Math.floor(rnd() * ANIMAL_IDS.length)];
    kinds = [{ a: a, count: n }];
  }
  /* 位池洗牌：目标占前 n 位，干扰动物（型1/型2）占下一位 */
  const slots = shuffled(SLOTS, rnd);
  const occList = OCC_KINDS[theme];
  const targets = [];
  let used = 0;
  for (let g = 0; g < kinds.length; g++) {
    for (let c = 0; c < kinds[g].count; c++) {
      const s = slots[used++];
      targets.push({ animal: kinds[g].a, x: s[0], y: s[1],
        occlusion: Math.round((rf(rnd, P.occMin, P.occMax)) * 100) / 100,
        found: false,
        _ok: occList[Math.floor(rnd() * occList.length)],
        _side: rnd() < 0.5 ? 1 : -1 });
    }
  }
  let distractor = null;
  if (P.distr) {
    const s = slots[used++];
    let da;
    if (P.simDistr) da = SIM[kinds[0].a];                  /* r20 型2：同系干扰（视觉判别负荷） */
    else {
      da = ANIMAL_IDS[Math.floor(rnd() * ANIMAL_IDS.length)];
      for (let t = 0; t < 8 && da === kinds[0].a; t++) da = ANIMAL_IDS[Math.floor(rnd() * ANIMAL_IDS.length)];
    }
    distractor = { animal: da, x: s[0], y: s[1] };
    if (P.simDistr) {                                      /* 同系干扰也半遮蔽（逼辨局部特征） */
      distractor.occlusion = Math.round((rf(rnd, P.distrOccMin, P.distrOccMax)) * 100) / 100;
      distractor._ok = occList[Math.floor(rnd() * occList.length)];
      distractor._side = rnd() < 0.5 ? 1 : -1;
    }
  }
  return { theme: theme, pattern: pat, n: n, kinds: kinds, targets: targets,
           distractor: distractor, seed: seed, _found: 0, solved: false,
           countAsk: !!P.countAsk, flash: !!P.flash, ansOpen: false, ansMiss: 0 };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const pats = patFlagsOf(dch, rnd);
  const quizzes = [];
  let lastKind = null, lastTheme = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(pats[qi], qi, rnd, lastKind, lastTheme, (flat * 5 + qi) * 7919 + 37);
    if (dch === 4) q.flash = true;          /* SPEC-R20 §R4：型4 闪现叠加在子型 {2,3} 上 */
    lastKind = q.kinds[0].a; lastTheme = q.theme;
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, done: false, missCnt: 0 };
}

/* ---------- 命中检测引擎（无 DOM，场景单位）：
   engTapScene(L, x, y) —— 在场景 (x,y) 处点一下（HIT_R=78 内最近未找到目标命中）
     'found' 点中目标（本题继续）/ 'full' 找全但计数作答待答（countAsk 题，r20）
     'right' 找全本题（还有后续题；countAsk 题=答对数字）/ 'done' 末题找全/答对=通关
     '?'     点非目标（场景元素/已找到/干扰动物）——轻反馈，不计数不记错（miss 恒 0）
     null    关卡已结束/非法
   engAnswer(L, num) —— 计数作答（r20 SPEC-R20 §R3）：ansOpen 态受理
     num==n → 'right'/'done'（推进）；≠ → 'retry'（ansMiss++ 仅统计，不记 miss 不扣星）
   engFoundIdx(L, x, y) —— 纯查找：命中则返回 targets 下标，否则 -1（UI 与 verify 共用口径） */
function engFoundIdx(L, x, y) {
  if (!L || L.done || L.step >= L.quizzes.length) return -1;
  const q = L.quizzes[L.step];
  let best = -1, bestD = HIT_R * HIT_R;
  for (let i = 0; i < q.targets.length; i++) {
    const t = q.targets[i];
    if (t.found) continue;
    const dx = x - t.x, dy = y - t.y, d = dx * dx + dy * dy;
    if (d <= bestD) { bestD = d; best = i; }
  }
  return best;
}
function engTapScene(L, x, y) {
  const i = engFoundIdx(L, x, y);
  if (i < 0) return (L && !L.done) ? '?' : null;
  return engFoundTarget(L, i);
}
function engFoundTarget(L, i) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || i < 0 || i >= q.targets.length || q.targets[i].found) return '?';
  if (q.ansOpen) return '?';                 /* 作答等待期点目标=轻反馈（探索≠错） */
  q.targets[i].found = true;
  q._found++;
  if (q._found >= q.n) {
    if (q.countAsk) { q.ansOpen = true; return 'full'; }   /* r20：找全待答（不推进） */
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  return 'found';
}
function engAnswer(L, num) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || !q.ansOpen) return null;
  if (num !== q.n) { q.ansMiss++; return 'retry'; }
  q.ansOpen = false;
  q.solved = true;
  L.step++;
  if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
  return 'right';
}
const engWon = L => !!L && L.done;
/* 星级：恒 3★（无错误路径——miss 恒 0，承 bubble §0.47 精神，SPEC §1/R20 §R3 定版：
   计数作答答错=探索反馈，不记 miss 不扣星） */
const engStars = L => 3;

/* ---------- 结构校验（verify 用）：返回具体失败原因，null=合格
   校验项：题数 5/型参数（N 区间、遮蔽区间含 30-60 全局界、双种各 ≥1、型1 必带干扰、
   型2 同系干扰+干扰遮蔽区间、countAsk 标志与 PATS 一致——r20 SPEC-R20 §R5）/
   目标数=各 kind 之和/位置互距 ≥256/位池合法/初始 found 全 false
   （flash 标志不在本题级校验：型4 叠加逻辑在 genLevel，由 verify ③ 章分布单元断言） */
function structWhy(q, pat, qi) {
  if (!q || q.pattern !== pat) return 'pattern';
  const P = PATS[pat];
  if (q.n < P.nMin || q.n > P.nMax) return 'n';
  if (q.kinds.length !== (P.dual ? 2 : 1)) return 'kindsLen';
  let sum = 0;
  for (let k = 0; k < q.kinds.length; k++) {
    const kd = q.kinds[k];
    if (!ANIMALS[kd.a]) return 'kindAnimal';
    if (kd.count < 1) return 'kindCount';
    sum += kd.count;
  }
  if (sum !== q.n) return 'kindSum';
  if (q.kinds.length === 2 && q.kinds[0].a === q.kinds[1].a) return 'kindDup';
  if (P.dual && (q.kinds[0].count < 1 || q.kinds[1].count < 1)) return 'dualMin';
  if (!!q.distractor !== P.distr) return 'distractor';
  if (q.distractor && (!ANIMALS[q.distractor.animal] || q.distractor.animal === q.kinds[0].a)) return 'distrAnimal';
  if (q.distractor && P.simDistr && SIM[q.distractor.animal] !== q.kinds[0].a) return 'distrSim';
  if (q.distractor && !!q.distractor.occlusion !== P.simDistr) return 'distrOcc';
  if (q.distractor && P.simDistr &&
      (q.distractor.occlusion < P.distrOccMin - 1e-9 || q.distractor.occlusion > P.distrOccMax + 1e-9)) return 'distrOccRange';
  if (q.countAsk !== !!P.countAsk) return 'countAsk';
  if (THEMES.indexOf(q.theme) < 0) return 'theme';
  if (q.targets.length !== q.n) return 'targetLen';
  for (let i = 0; i < q.targets.length; i++) {
    const t = q.targets[i];
    if (!ANIMALS[t.animal]) return 'tAnimal';
    if (t.occlusion < 0.30 - 1e-9 || t.occlusion > 0.60 + 1e-9) return 'tOccGlobal';
    if (t.occlusion < P.occMin - 1e-9 || t.occlusion > P.occMax + 1e-9) return 'tOccPat';
    if (t.x < 130 || t.x > 870 || t.y < 150 || t.y > 520) return 'tArea';
    if (t.found) return 'tFound';
    for (let j = 0; j < i; j++) {
      const u = q.targets[j];
      if (Math.hypot(t.x - u.x, t.y - u.y) < 256) return 'tOverlap';
    }
    if (q.distractor && Math.hypot(t.x - q.distractor.x, t.y - q.distractor.y) < 256) return 'tDistrOverlap';
  }
  if (q._found !== 0 || q.solved || q.ansOpen || q.ansMiss !== 0) return 'initState';
  return null;
}
