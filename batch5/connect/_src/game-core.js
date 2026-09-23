/* ================= connect 纯引擎 r6：确定性逐题制关卡生成与连线判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   难度章 dch=(ch-1)%4+1 → 章题型（SPEC §3 r6）：
     dch1 pair  一对一热身×5（need=EATS[动物][0] 主食；候选=need+3 干扰∉EATS；flat0 题0 恒 兔→萝卜 教学锚）
     dch2 set   多对多集合×5（动物池=EATS≥2 共 8 只；need=EATS 全集；候选=need+2 干扰∉EATS）
     dch3 anti  反向排除×5（动物池=11 专属 owner；need=归属恰 1 的专属食物；干扰=白菜+苹果+毛毛虫=共享 3 固定）
     dch4 混出  [chain,anti,chain,set,chain]（chain up2+down1 seeded）
   判定：'part' 集合内连对未满（不 miss）/ 'right' 题完成 / 'done' 末题通关 /
         'wrong' 错连（miss+1）/ 'fed' 该题已完成 / null 非法 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 题池（从 EATS/CHAINS 派生；verify 从 SPEC 文字独立重列对账） ---------- */
const SET_POOL = EATS.reduce((acc, e, a) => { if (e.length >= 2) acc.push(a); return acc; }, []);          // 多对多动物（8 只）
const ANTI_POOL = [];                                                                                     // 专属食物 owner（11 只）
for (let f = 0; f < 14; f++) { const o = ownersOf(f); if (o.length === 1) ANTI_POOL.push({ a: o[0], f: f }); }
const ANTI_DECOYS = [12, 13, 5];                                                                          // 反向干扰=白菜/苹果/毛毛虫（共享 3 固定）
const DCH4_KINDS = ['chain', 'anti', 'chain', 'set', 'chain'];                                            // dch4 题型序列

/* ---------- 单题构造（确定性：同一 rnd 流顺序消耗；动物/链由 genLevel 预抽保证同关互异） ---------- */
function genPairQ(rnd, a) {
  const need = EATS[a][0];                              // 主食在 EATS 首位
  const pool = [];
  for (let f = 0; f < 14; f++) if (f !== need && EATS[a].indexOf(f) < 0) pool.push(f);
  const decoys = shuffled(pool, rnd).slice(0, 3);       // 干扰 ∉ EATS（保证 need 在候选内无歧义）
  const picks = shuffled([need].concat(decoys), rnd);
  return { kind: 'pair', animal: a, left: a, pickType: 'food', need: [need],
           picks: picks, linked: [], stem: stemOf({ kind: 'pair', animal: a }) };
}
function genSetQ(rnd, a) {
  const pool = [];
  for (let f = 0; f < 14; f++) if (EATS[a].indexOf(f) < 0) pool.push(f);
  const decoys = shuffled(pool, rnd).slice(0, 2);       // 干扰 ∉ EATS
  const picks = shuffled(EATS[a].slice().concat(decoys), rnd);
  return { kind: 'set', animal: a, left: a, pickType: 'food', need: EATS[a].slice(),
           picks: picks, linked: [], stem: stemOf({ kind: 'set', animal: a }) };
}
function genAntiQ(rnd, pick) {                          // pick={a 专属 owner, f 专属食物}
  const picks = shuffled([pick.f].concat(ANTI_DECOYS), rnd);
  return { kind: 'anti', animal: pick.a, left: pick.a, pickType: 'food', need: [pick.f],
           picks: picks, linked: [],
           stem: stemOf({ kind: 'anti', animal: pick.a }) };
}
function genChainQ(rnd, ci, dir) {
  const c = CHAINS[ci];
  if (dir === 'up') {                                   // 显示 base→mid→?，答案=top 动物
    const others = shuffled(Array.from({ length: 12 }, (_, i) => i)
      .filter(x => x !== c.top && EATS[x].indexOf(c.mid) < 0), rnd).slice(0, 3);   // 候选内吃 mid 者恰 1
    const picks = shuffled([c.top].concat(others), rnd);
    return { kind: 'chain', dir: 'up', chain: ci, base: c.base, mid: c.mid, top: c.top,
             left: 100 + ci, pickType: 'animal', need: [c.top], picks: picks, linked: [],
             stem: stemOf({ dir: 'up', mid: c.mid, base: c.base }) };
  }
  /* down：显示 base→?→top，答案=mid 食物；干扰≠mid 且非 base 且非「吃过 base 的其他链中段」
     （r6 审查 F-1 根除：CHAINS 各 mid=吃过青草者，任何入干扰即构成第二合法解——青蛙吃毛毛虫
     +毛毛虫吃青草 → 连毛毛虫推理成立却判错。候选内「吃过 base」者须恰=答案本身） */
  const ateBase = CHAINS.map(x => x.mid);
  const others = shuffled(Array.from({ length: 14 }, (_, i) => i)
    .filter(f => f !== c.mid && f !== c.base && ateBase.indexOf(f) < 0), rnd).slice(0, 3);
  const picks = shuffled([c.mid].concat(others), rnd);
  return { kind: 'chain', dir: 'down', chain: ci, base: c.base, mid: c.mid, top: c.top,
           left: 100 + ci, pickType: 'food', need: [c.mid], picks: picks, linked: [],
           stem: stemOf({ dir: 'down', base: c.base, top: c.top }) };
}

/* ---------- 关卡生成（flat → 5 题；同关动物/链互异：一次洗池逐题 pop） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const qs = [];
  if (dch === 1) {
    let pool = shuffled(Array.from({ length: 12 }, (_, i) => i), rnd);
    if (flat === 0) pool = [0].concat(pool.filter(x => x !== 0));   // flat0 题0 恒 兔→萝卜（教学锚）
    for (let i = 0; i < Q_PER_LEVEL; i++) qs.push(genPairQ(rnd, pool[i]));
  } else if (dch === 2) {
    const pool = shuffled(SET_POOL, rnd);
    for (let i = 0; i < Q_PER_LEVEL; i++) qs.push(genSetQ(rnd, pool[i]));
  } else if (dch === 3) {
    const pool = shuffled(ANTI_POOL, rnd);
    for (let i = 0; i < Q_PER_LEVEL; i++) qs.push(genAntiQ(rnd, pool[i]));
  } else {
    const chainPool = shuffled([0, 1, 2], rnd);         // dch4 链 3 题互异
    const antiPool = shuffled(ANTI_POOL, rnd);
    const setPool = shuffled(SET_POOL, rnd);
    let ci = 0;
    for (let i = 0; i < Q_PER_LEVEL; i++) {
      const k = DCH4_KINDS[i];
      if (k === 'chain') { qs.push(genChainQ(rnd, chainPool[ci], ci === 0 ? 'up' : (ci === 1 ? 'up' : 'down'))); ci++; }  // up2+down1
      else if (k === 'anti') qs.push(genAntiQ(rnd, antiPool[0]));
      else qs.push(genSetQ(rnd, setPool[0]));
    }
  }
  return { flat, ch, dch, lv, qIdx: 0, qs: qs, misses: 0, done: false };
}

/* ---------- 连线判定（无 DOM）：aIdx=左卡 lib（动物或 100+链号），bIdx=右列卡 lib
   'part' 集合内连对但未连满（不 miss）/'right' 题完成/'done' 末题通关
   'wrong' 错连（miss+1）/ 'fed' 该题已完成 / null 非法或已结束 ---------- */
function engLink(L, aIdx, bIdx) {
  if (!L || L.done) return null;
  const q = L.qs[L.qIdx];
  if (!q) return null;
  if (aIdx !== q.left) return null;                     // 只能从当前题左卡起拖
  if (q.linked.length >= q.need.length) return 'fed';   // 该题已完成（直驱兜底）
  if (q.linked.indexOf(bIdx) >= 0) return 'fed';         // 该项已连过（重复连不惩罚，直驱兜底）
  if (q.need.indexOf(bIdx) >= 0) {
    q.linked.push(bIdx);
    if (q.linked.length < q.need.length) return 'part';
    if (L.qIdx >= L.qs.length - 1) { L.done = true; return 'done'; }
    return 'right';
  }
  L.misses++;
  return 'wrong';
}
/* 题推进（UI 在 'right' 演出后调；引擎级供 verify 直驱） */
function engNext(L) {
  if (!L || L.done) return false;
  if (L.qIdx < L.qs.length - 1) { L.qIdx++; return true; }
  return false;
}
const engWon = L => !!L && L.done;
/* 星级：错连 0 次=3 星 / 1-2 次=2 星 / 更多=1 星。永不 0 星 */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：题数=5、题型按章、候选/need 自洽 ---------- */
function structOk(L) {
  if (!L || !L.qs || L.qs.length !== Q_PER_LEVEL) return false;
  for (let i = 0; i < L.qs.length; i++) {
    const q = L.qs[i];
    const uniq = new Set(q.picks);
    if (uniq.size !== q.picks.length) return false;                    // 候选互异
    if (q.need.some(n => q.picks.indexOf(n) < 0)) return false;        // need 全在场
    if (q.linked.some(x => q.need.indexOf(x) < 0)) return false;
    const expect = { 1: 'pair', 3: 'anti' };
    if (expect[L.dch] && q.kind !== expect[L.dch]) return false;
    if (L.dch === 2 && q.kind !== 'set') return false;
    if (L.dch === 4 && q.kind !== DCH4_KINDS[i]) return false;
    if (q.kind === 'set' && (q.need.length < 2 || q.need.length > 3)) return false;
    if ((q.kind === 'pair' || q.kind === 'anti') && q.need.length !== 1) return false;
  }
  return true;
}

/* ---------- 单关净时长模型（SPEC §3 r6：modeled ≥40s 硬指标；verify 全关断言）
   modeled = Σ题[ estMs(题面码点) + (|need|-1)×880 + max(880, estMs(确认句码点)+300) ] + 3020 celebrate
   听读占比 = Σ estMs(题面) / modeled ≥ 35% ---------- */
function engModeled(L) {
  let total = 3020, listen = 0;
  L.qs.forEach(q => {
    const stem = estMs(q.stem.length);
    const conf = estMs(confirmOf(q).length) + 300;
    total += stem + (q.need.length - 1) * 880 + Math.max(880, conf);
    listen += stem;
  });
  return { ms: total, listen: listen, ratio: listen / total };
}
