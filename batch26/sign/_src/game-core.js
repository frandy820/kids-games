/* ================= sign 纯引擎：确定性关卡生成 + 含义卡/行为卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R36-SIGN §R1/§R2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 行走安全 5：WALK5 轮换（flat0 题0 恒 light——教学演示锚点「认红绿灯」，
           mean 不闪；含义卡=池内 4/5：正确+池内随机 3）
     dch2 红圈黄三角 15：目标 ∈ DENY15 随机相邻互异，mean×5 其中 flash×2（5 位洗牌），
           干扰=同 fam 优先（红系/黄系互为干扰强化看图案细节）+域内随机补足 3
     dch3 近对辨析 18：目标 ∈ NEAR_POOL（9 对成员；无伙伴 6 种不进），全 mean 近对题
           （伙伴必在干扰），flash×1（qi1-4 随机，qi0 恒不闪=开门题）
     dch4 大挑战：[near-mean, near-mean, act, act, boss] 洗牌（boss=near+flash+mean）；
           act 行为卡（正确=ACT[sign]，干扰=同 fam 优先+全域补足——行为互辨非好坏是非）
   生成关（flat≥20）：每关随机章参数 dch=ri(1,4)（先取数保确定性——b25 坑④ verify 钩子直读）。
   铁律：卡 4 张互异（§0.17）；相邻题标志互异（防同关连题同标志单调）；
   含义/行为映射唯一（meaning id=标志 id，1:1 映射两题型同判）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 每关题序表 {sign, kind, flash, near}（genLevel 预生成；rnd 同流保确定性）
   dch1 行走安全 5 轮换（flat0 题0 锚定 light）；dch2 闪现位=shuffled([0..4]) 前 2；
   dch3 闪现位=ri(1,4)（qi0 恒不闪）；dch4 型序=shuffled(['nm','nm','act','act','boss'])；
   相邻题标志互异（≤8 掷兜底） */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  const pickDiff = (pool, prev) => {
    let s = pool[Math.floor(rnd() * pool.length)];
    for (let g = 0; g < 8 && s === prev; g++) s = pool[Math.floor(rnd() * pool.length)];
    return s;
  };
  if (dch === 1) {
    const s0 = flat === 0 ? 0 : Math.floor(rnd() * WALK5.length);
    for (let qi = 0; qi < CH_LEN; qi++) {
      seq.push({ sign: WALK5[(s0 + qi) % WALK5.length], kind: 'mean', flash: false, near: false });
    }
    return seq;
  }
  if (dch === 2) {
    const fp = shuffled([0, 1, 2, 3, 4], rnd);            // 闪现位×2（5 位洗牌取前 2）
    let prev = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      const s = pickDiff(DENY15, prev);
      seq.push({ sign: s, kind: 'mean', flash: qi === fp[0] || qi === fp[1], near: false });
      prev = s;
    }
    return seq;
  }
  if (dch === 3) {
    const fp = ri(rnd, 1, 4);                             // 闪现位×1（qi1-4，qi0 恒不闪）
    let prev = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      const s = pickDiff(NEAR_POOL, prev);
      seq.push({ sign: s, kind: 'mean', flash: qi === fp, near: true });
      prev = s;
    }
    return seq;
  }
  /* dch4 混合：[nm, nm, act, act, boss] 洗牌（boss=near+flash+mean；每关近对 3/act 2/闪现 1） */
  const kseq = shuffled(['nm', 'nm', 'act', 'act', 'boss'], rnd);
  let prev = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const k = kseq[qi];
    const pool = k === 'act' ? ALL24 : NEAR_POOL;
    const s = pickDiff(pool, prev);
    seq.push({ sign: s, kind: k === 'act' ? 'act' : 'mean', flash: k === 'boss', near: k !== 'act' });
    prev = s;
  }
  return seq;
}

/* ---------- 单题构建：题面标志 + 干扰 → 洗牌 4 卡（含义/行为同构：meaning=标志 id）
   dch1：池内随机 3（行走安全 5 域内）
   dch2：同 fam 优先（红圈族/黄三角族互为干扰——看图案细节辨同族）+域内随机补足 3
   近对题（dch3 / dch4 nm/boss）：NEAR[sign] + 全 24 池随机 2
   act 题（dch4）：同 fam 优先（行为互辨）+全域随机补足 3
   卡 id='s'+最终位置下标（位置稳定实例 id），meaning=含义/行为 id（=标志 id，1:1） */
function buildQuiz(spec, dch, rnd) {
  const s = spec.sign;
  let ds;
  if (dch === 1) {
    ds = shuffled(WALK5.filter(x => x !== s), rnd).slice(0, 3);   // 行走安全域内 3（§R2 ch1）
  } else if (spec.kind === 'act') {
    const sys = SYSTEM[s];
    const same = shuffled(ALL24.filter(x => x !== s && SYSTEM[x] === sys), rnd);
    ds = same.slice(0, 3);                              // 同 fam 行为优先（§R1 维度三）
    if (ds.length < 3) {                                // 单员 fam（redoct/redtri/signal）→ 全域补足
      ds = ds.concat(shuffled(ALL24.filter(x => x !== s && ds.indexOf(x) < 0), rnd).slice(0, 3 - ds.length));
    }
  } else if (dch === 2) {
    const sys = SYSTEM[s];
    const same = shuffled(DENY15.filter(x => x !== s && SYSTEM[x] === sys), rnd);
    ds = same.slice(0, 3);                              // 同 fam 优先（教育：看细节辨同族）
    if (ds.length < 3) {                                // 域内同族不足 → 域内随机补足
      ds = ds.concat(shuffled(DENY15.filter(x => x !== s && ds.indexOf(x) < 0), rnd).slice(0, 3 - ds.length));
    }
  } else if (spec.near) {
    ds = [NEAR[s]];                                     // 近对必在场（§R2 ch3）
    ds = ds.concat(shuffled(ALL24.filter(x => x !== s && x !== NEAR[s]), rnd).slice(0, 2));
  } else {
    ds = shuffled(ALL24.filter(x => x !== s), rnd).slice(0, 3);   // 同集异含义任取
  }
  const order = shuffled([s].concat(ds), rnd);
  const cards = order.map((m, j) => ({ id: 's' + j, meaning: m }));
  return { sign: s, kind: spec.kind, flash: !!spec.flash, near: !!spec.near,
           cards: cards, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 light mean 不闪（§R2 教学演示锚点——specSeqOf flat===0 分支保确定性） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapCard(L, i) —— 点第 i 张卡（cards 数组下标；含义/行为同构）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapCard(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) return null;
  if (q.cards[i].meaning === q.sign) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.61 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标（含义/行为通吃——meaning=sign 判定同式） */
const correctIdx = q => {
  if (!q) return -1;
  for (let i = 0; i < q.cards.length; i++) if (q.cards[i].meaning === q.sign) return i;
  return -1;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 / 章池 /
   近对在场 / 卡互异与答案自洽 / 相邻题标志互异 / flat0q0 锚点 / 初始态干净 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q || !SIGNS[q.sign]) return 'sign';
  const isAnchor = flat === 0 && qi === 0;              // 教学演示题（认红绿灯）锚点
  if (isAnchor && q.sign !== 'light') return 'anchor';
  if (isAnchor && (q.kind !== 'mean' || q.flash)) return 'anchorKind';   // 锚点=mean 不闪（教学链零改动前提）
  if (q.kind !== 'mean' && q.kind !== 'act') return 'kind';
  if (dch === 1) {
    if (WALK5.indexOf(q.sign) < 0) return 'dch1pool';        // ch1 目标恒行走安全 5 池
    if (q.kind !== 'mean' || q.flash) return 'dch1kind';     // ch1 纯 mean 不闪（§R2）
  }
  if (dch === 2 && DENY15.indexOf(q.sign) < 0) return 'dch2pool'; // ch2 目标恒红圈黄三角 15 池
  if (dch === 3) {
    if (NEAR_POOL.indexOf(q.sign) < 0) return 'dch3pool';    // ch3 目标恒近对池 18
    if (!q.near) return 'dch3near';                          // ch3 全题近对
  }
  if (dch === 4 && q.kind !== 'act' && NEAR_POOL.indexOf(q.sign) < 0) return 'dch4nearpool';
  if (q.cards.length !== 4) return 'len';
  const ms = q.cards.map(c => c.meaning);
  if (ms.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'dup';
  if (!ms.every(v => SIGNS[v])) return 'lib';
  if (ms.filter(v => v === q.sign).length !== 1) return 'ansN';
  if (dch === 1 && !ms.every(v => WALK5.indexOf(v) >= 0)) return 'dch1set';  // ch1 卡 ⊆ 行走 5 池
  if (q.near && ms.indexOf(NEAR[q.sign]) < 0) return 'nearMissing';   // 近对必在场
  if (prevQ && prevQ.sign === q.sign) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}

/* ---------- 关级构成校验（§R2 谱构成律；verify/pycheck 与逐题 structWhy 并用）
   dch1=mean×5 不闪 / dch2=mean×5 闪×2 / dch3=mean×5 近对全 闪×1 且 qi0 不闪 /
   dch4=[nm×2, act×2, boss×1]（act 恰 2 / 闪恰 1 / 非 act 全近对 / act 不近对） */
function levelWhy(L) {
  if (!L || !L.quizzes || L.quizzes.length !== CH_LEN) return 'len';
  const qs = L.quizzes;
  const nFlash = qs.filter(q => q.flash).length;
  const nAct = qs.filter(q => q.kind === 'act').length;
  if (L.dch === 1) {
    if (nFlash !== 0) return 'dch1flash';
    if (nAct !== 0) return 'dch1act';
  } else if (L.dch === 2) {
    if (nFlash !== 2) return 'dch2flash';
    if (nAct !== 0) return 'dch2act';
  } else if (L.dch === 3) {
    if (nFlash !== 1 || qs[0].flash) return 'dch3flash';
    if (nAct !== 0 || !qs.every(q => q.near)) return 'dch3near';
  } else if (L.dch === 4) {
    if (nAct !== 2) return 'dch4act';
    if (nFlash !== 1) return 'dch4flash';
    if (!qs.every(q => q.kind === 'act' ? !q.near : q.near)) return 'dch4near';
    if (qs.filter(q => q.kind === 'mean' && !q.flash).length !== 2) return 'dch4nm';
  }
  return null;
}
