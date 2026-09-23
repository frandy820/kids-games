/* ================= ruler 纯引擎：确定性关卡生成 + 数字/物品卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 17)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH27 §0.64/§1；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 回形针数一数：CH1_POOL（clip×6）轮换 5 题（flat0 题0 恒 pencil|clip——
           教学演示锚点「用回形针量铅笔」；起点 s0=flat%6，五关并集恒覆盖 6 组合）
     dch2 换个单位量：CH2_POOL（stick×4+block×2）轮换 5 题（起点 (flat+1)%6）
     dch3 单位比一比：TRAPS 陷阱对 4 轮换 5 题（起点 (flat+2)%4）——每题必为陷阱对，
           两卡单位互异（数字与长度脱钩辨析）
     dch4 混合：掷硬币标 cmp 题，每关 ≥2 cmp（全 cmp 时翻 1 题保混合）；cmp=陷阱对
           随机、count=全 12 组合随机（相邻题同型互异）
   生成关（flat≥20）：每关随机章参数 dch=ri(1,4)（先取数保确定性——b25 坑④ verify 钩子直读）。
   铁律：合法组合封闭 12（整除才合法，表外禁出题）；数字卡 4 张互异且含真值 ±1 与
   ±2 至少各一；cmp 答案=基准长大者（独立复算）；相邻题同型互异（防同关连题单调）。 */
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

/* ---------- 数字卡干扰：真值 v 的 3 个干扰（数字域 1-6，互异，禁与真值同数）
   d1=±1 位（优先 +1）、d2=±2 位（优先 +2，越界回退 -2）、d3=其余近邻
   —— 恒满足「±1 与 ±2 至少各一」（verify 独立断言 |d1-v|=1、|d2-v|=2） */
function numDistract(v) {
  const ok = n => n >= 1 && n <= 6 && n !== v;
  const d1 = ok(v + 1) ? v + 1 : v - 1;
  const d2 = ok(v + 2) ? v + 2 : v - 2;
  const d3 = [v - 1, v + 1, v - 2, v + 2, v - 3, v + 3].find(n => ok(n) && n !== d1 && n !== d2);
  return [d1, d2, d3];
}

/* ---------- 每关题序表 {kind:'count'|'cmp', combo?/trapIdx?}（genLevel 预生成；rnd 同流保确定性）
   轮换池起点确定性铺开（dch1 flat%6 / dch2 (flat+1)%6 / dch3 (flat+2)%4）：
   五关并集恒覆盖全池；轮换取 5<6/5<6/5>4 相邻天然互异（dch3 池 4<5 时尾题回头与
   首题同、与第 4 题异——相邻互异仍成立）；dch4 [掷×5] cmp 标记：<2 补足 2，
   全 5 翻 1（保混合）；同型相邻题身份互异（≤8 掷兜底） */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  if (dch === 1) {
    const s0 = flat % CH1_POOL.length;                    // flat0 → pencil|clip（教学锚点）
    for (let qi = 0; qi < CH_LEN; qi++) seq.push({ kind: 'count', combo: CH1_POOL[(s0 + qi) % CH1_POOL.length] });
    return seq;
  }
  if (dch === 2) {
    const s0 = (flat + 1) % CH2_POOL.length;
    for (let qi = 0; qi < CH_LEN; qi++) seq.push({ kind: 'count', combo: CH2_POOL[(s0 + qi) % CH2_POOL.length] });
    return seq;
  }
  if (dch === 3) {
    const s0 = (flat + 2) % TRAPS.length;
    for (let qi = 0; qi < CH_LEN; qi++) seq.push({ kind: 'cmp', trapIdx: (s0 + qi) % TRAPS.length });
    return seq;
  }
  /* dch4 混合 */
  const flags = [];
  for (let qi = 0; qi < CH_LEN; qi++) flags.push(rnd() < 0.5);
  let cnt = flags.filter(Boolean).length;
  if (cnt < 2) {                                          // cmp 陷阱题 <2 → 补足（每关 ≥2）
    for (let i = 0; i < CH_LEN && cnt < 2; i++) if (!flags[i]) { flags[i] = true; cnt++; }
  } else if (cnt === CH_LEN) {                            // 全 cmp → 翻 1 题 count（保"混合"）
    flags[1] = false;
  }
  let prevCount = null, prevTrap = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    if (flags[qi]) {
      let t = TRAPS[Math.floor(rnd() * TRAPS.length)];
      let g = 0;
      while (g < 8 && 't' + TRAPS.indexOf(t) === prevTrap) { t = TRAPS[Math.floor(rnd() * TRAPS.length)]; g++; }
      seq.push({ kind: 'cmp', trapIdx: TRAPS.indexOf(t) });
      prevTrap = 't' + TRAPS.indexOf(t);
    } else {
      let c = COMBOS12[Math.floor(rnd() * COMBOS12.length)];
      let g = 0;
      while (g < 8 && comboKeyOf(c) === prevCount) { c = COMBOS12[Math.floor(rnd() * COMBOS12.length)]; g++; }
      seq.push({ kind: 'count', combo: c });
      prevCount = comboKeyOf(c);
    }
  }
  return seq;
}

/* ---------- 单题构建
   count：合法组合 → 真值 v=base/unitBase；数字卡=shuffle([v]+numDistract(v))；
          answer=v 所在下标
   cmp：陷阱对 → 两卡 shuffle；answer=基准长大者下标（真长恒不相等——陷阱对设计）；
        item/unit/units 钩子字段=答案卡三元组（count/cmp 钩子契约统一） */
function buildQuiz(spec, dch, rnd) {
  if (spec.kind === 'count') {
    const c = spec.combo, v = ITEMS[c.item].base / UNITS[c.unit].base;
    const nums = shuffled([v].concat(numDistract(v)), rnd);
    const opts = nums.map(n => ({ num: n }));
    return { kind: 'count', item: c.item, unit: c.unit, units: v,
             comboId: comboKeyOf(c), opts: opts, answer: nums.indexOf(v),
             trap: false, _miss: 0, _answered: false };
  }
  const t = TRAPS[spec.trapIdx];
  const cards = shuffled([t.a, t.b], rnd).map(c => ({ id: c.item, unit: c.unit, units: c.units }));
  const la = cards[0].units * UNITS[cards[0].unit].base;
  const lb = cards[1].units * UNITS[cards[1].unit].base;
  const answer = lb > la ? 1 : 0;
  return { kind: 'cmp', item: cards[answer].id, unit: cards[answer].unit, units: cards[answer].units,
           trapIdx: spec.trapIdx, opts: cards, answer: answer,
           trap: true, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 pencil|clip（§1 教学演示锚点——specSeqOf flat%6 分支保确定性） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 17);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张卡（opts 数组下标）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (i === q.answer) {
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
/* 星级（§0.64 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标 */
const correctIdx = q => q ? q.answer : -1;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 /
   陷阱对在场与异单位 / 数字卡互异与 ±1±2 / 答案自洽 / 相邻题同型互异 /
   flat0q0 锚点 / 初始态干净 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'q';
  const isAnchor = flat === 0 && qi === 0;              // 教学演示题（用回形针量铅笔）锚点
  if (isAnchor && !(q.kind === 'count' && q.item === 'pencil' && q.unit === 'clip')) return 'anchor';
  if (q.kind === 'count') {
    if (!ITEMS[q.item] || !UNITS[q.unit]) return 'combo';
    if (ITEMS[q.item].base % UNITS[q.unit].base !== 0) return 'notDiv';   // 表外组合禁出题
    if (q.units !== ITEMS[q.item].base / UNITS[q.unit].base) return 'units';
    if (q.opts.length !== 4) return 'len';
    const nums = q.opts.map(o => o.num);
    if (nums.filter((v2, i2, a2) => a2.indexOf(v2) === i2).length !== 4) return 'dup';
    if (!nums.every(n => n >= 1 && n <= 6)) return 'range';
    if (nums.filter(n => n === q.units).length !== 1) return 'ansN';
    if (q.answer !== nums.indexOf(q.units)) return 'ansIdx';
    const ds = nums.filter(n => n !== q.units);
    if (!ds.some(n => Math.abs(n - q.units) === 1)) return 'd1';   // ±1 至少一
    if (!ds.some(n => Math.abs(n - q.units) === 2)) return 'd2';   // ±2 至少一
    if (dch === 1 && q.unit !== 'clip') return 'dch1unit';         // ch1 恒回形针
    if (dch === 2 && q.unit === 'clip') return 'dch2unit';         // ch2 恒 stick/block
  } else if (q.kind === 'cmp') {
    if (q.opts.length !== 2) return 'len2';
    if (q.opts[0].unit === q.opts[1].unit) return 'sameUnit';      // 干扰禁全同单位
    const keys = q.opts.map(o => o.id + '|' + o.unit).sort().join('&');
    if (TRAP_KEYS.indexOf(keys) < 0) return 'trapPair';            // 陷阱对封闭 4
    const la = q.opts[0].units * UNITS[q.opts[0].unit].base;
    const lb = q.opts[1].units * UNITS[q.opts[1].unit].base;
    if (la === lb || q.answer !== (lb > la ? 1 : 0)) return 'ansCmp';   // 答案=真长大者
    if (q.item !== q.opts[q.answer].id || q.unit !== q.opts[q.answer].unit ||
        q.units !== q.opts[q.answer].units) return 'hdr';          // 钩子三元组=答案卡
    if (dch !== 3 && dch !== 4) return 'cmpCh';                    // cmp 只出现在 ch3/ch4
  } else return 'kind';
  if (dch === 3 && q.kind !== 'cmp') return 'dch3kind';            // ch3 全为陷阱比较题
  if (prevQ && prevQ.kind === q.kind) {                            // 同型相邻互异
    const ka = prevQ.kind === 'count' ? prevQ.comboId : 't' + prevQ.trapIdx;
    const kb = q.kind === 'count' ? q.comboId : 't' + q.trapIdx;
    if (ka === kb) return 'adjacent';
  }
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
