/* ================= memory 纯引擎（无 DOM）：确定性关卡映射 + pairId 牌组构造 + 判定引擎
   真值源 SPEC-R19-MEMORY §2-§4；python 复算 _spec_calc.py（mulberry32 int32 位级对照验证）。
   种子 = mulberry32(flat * 7919 + MEM_SEED)（本批常量 mem=1056）——同 flat 永远同关。
   统一配对语义：cards[i] = { id, pairId, face, state }——同 pairId 即配对
   （same 模式 pairId 组内两面相同；sum10 模式组内两面互补，如 3/7）。
   生成关消费序：先 dch=ri(1,4) 后 mode=ri(0,1)（同流保确定性）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));   // [lo,hi] 闭区间
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/* ---------- 关卡映射（静态 24 与生成关同一确定性通道；静态关不消费 rnd）
   flat≥24：dch=seeded ri(1,4)（难度档）+ mode=seeded ri(0,1)（same/sum10）。
   same 生成档：dch1=4×4/3 近形族、dch2=4×4/4、dch3=4×5/4、dch4=4×5/5；
   sum10 生成档：dch≤2=5 对（含 (5,5) 桥接对）、dch≥3=4 对（去桥接，纯互补面）；peek 恒 1。 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  if (flat < STATIC_LEVELS) {
    const s = LEVEL_SPECS[flat];
    return { flat: flat, ch: ch, lv: lv, dch: Math.min(4, ch),
             r: s.r, c: s.c, mode: s.mode, twins: s.twins, peek: s.peek };
  }
  const rnd = mulberry32(flat * 7919 + MEM_SEED);
  const dch = ri(rnd, 1, 4);
  const mode = ri(rnd, 0, 1) === 0 ? 'same' : 'sum10';
  if (mode === 'same') {
    const cfg = { 1: [4, 4, 3], 2: [4, 4, 4], 3: [4, 5, 4], 4: [4, 5, 5] }[dch];
    return { flat: flat, ch: ch, lv: lv, dch: dch,
             r: cfg[0], c: cfg[1], mode: 'same', twins: cfg[2], peek: 1 };
  }
  const five = dch <= 2;
  return { flat: flat, ch: ch, lv: lv, dch: dch,
           r: 2, c: five ? 5 : 4, mode: 'sum10', twins: 0, peek: 1 };
}

/* ---------- 牌组构造（同一确定性通道）
   same：twins 个近形族双员齐上（每员自成一对——干扰即同族不同面），
   其余对从「单身图案+每族至多一员」的填充池取（防非指定族意外共现）；
   sum10：按 SUM10_TAKE/生成档取补数组，face=数字字符串。 ---------- */
function makeLevel(flat) {
  const g = genLevel(flat);
  const pairs = g.r * g.c / 2;
  const rnd = mulberry32(flat * 7919 + MEM_SEED);
  let groups = [];                                   // groups[k] = [faceA, faceB]
  if (g.mode === 'sum10') {
    let comps;
    if (flat < STATIC_LEVELS) {
      const take = flat >= 18 ? COMP_PAIRS.length : SUM10_TAKE[flat - 6];   // ch4 sum10 关取全域（显式——r19 审查 m6：原 slice(0,undefined) 巧合正确，阵型一改即静默错配）
      comps = COMP_PAIRS.slice(0, take);
    }
    else comps = (g.c === 5) ? COMP_PAIRS : COMP_PAIRS_NO5;
    groups = comps.map(p => [String(p[0]), String(p[1])]);
  } else {
    const fams = shuffled(FAM_KEYS, rnd).slice(0, g.twins);
    const used = {};
    fams.forEach(f => used[f] = true);
    const fillPool = [];
    FAM_KEYS.forEach(f => { if (!used[f]) fillPool.push(FAM_MEMBERS[f][0], FAM_MEMBERS[f][1]); });
    SINGLE_KEYS.forEach(s => fillPool.push(s));
    const seenFam = {};
    const fillCand = shuffled(fillPool, rnd).filter(k => {
      const f = patFam(k);
      if (f == null) return true;                    // 单身图案无族约束
      if (seenFam[f]) return false;
      seenFam[f] = true; return true;
    });
    fams.forEach(f => FAM_MEMBERS[f].forEach(m => groups.push([m, m])));
    fillCand.slice(0, Math.max(0, pairs - groups.length)).forEach(k => groups.push([k, k]));
  }
  const deck = [];
  groups.forEach((gr, gi) => {
    deck.push({ pairId: gi, face: gr[0], state: 'down' }, { pairId: gi, face: gr[1], state: 'down' });
  });
  const order = shuffled(deck, rnd);
  order.forEach((c, i) => { c.id = i; });
  return {
    flat: flat, grid: { r: g.r, c: g.c }, pairs: pairs, mode: g.mode, peek: g.peek,
    twins: g.twins, dch: g.dch, ch: g.ch, lv: g.lv,
    misses: 0, streak: 0, matched: 0,
    cards: order, seenIds: [], donePairs: []
  };
}

/* ---------- 纯引擎（无 DOM） ---------- */
function engFlip(L, i) { // 翻牌：down→up；其余状态拒绝。记忆脚印 seenIds（支架依据）
  const c = L.cards[i];
  if (!c || c.state !== 'down') return false;
  c.state = 'up';
  if (L.seenIds.indexOf(c.id) < 0) L.seenIds.push(c.id);
  return true;
}
function engCover(L, i) { // 盖回（peek 收尾用）：up→down，seenIds 保留（翻回后再找的训练闭环）
  const c = L.cards[i];
  if (!c || c.state !== 'up') return false;
  c.state = 'down';
  return true;
}
function engUps(L) { return L.cards.filter(c => c.state === 'up'); }
function engJudge(L) { // 两张朝上时判定：同 pairId→gone（配对收走）/ 异→盖回计失误。否则 null
  const ups = engUps(L);
  if (ups.length !== 2) return null;
  if (ups[0].pairId === ups[1].pairId) {
    ups[0].state = 'gone'; ups[1].state = 'gone';
    L.streak = 0; L.matched++;
    if (L.donePairs.indexOf(ups[0].pairId) < 0) L.donePairs.push(ups[0].pairId);
    return 'match';
  }
  ups[0].state = 'down'; ups[1].state = 'down';
  L.misses++; L.streak++;
  return 'miss';
}
function engWon(L) { return L.cards.every(c => c.state === 'gone'); }
/* 星级：失误 ≤ 对数×1.5 = 3 星；≤ 对数×2.5 = 2 星；否则 1 星。永不 0 星 */
function engStars(L) {
  return L.misses <= L.pairs * 1.5 ? 3 : (L.misses <= L.pairs * 2.5 ? 2 : 1);
}
/* 已知配对：某组两张都被翻过（seenIds）且当前都盖着 → 支架指向候选（peek 后全场皆 seen） */
function engKnownPair(L) {
  const byPair = {};
  L.cards.forEach(c => { (byPair[c.pairId] = byPair[c.pairId] || []).push(c); });
  for (let k = 0; k < L.seenIds.length; k++) {
    const c = L.cards[L.seenIds[k]];
    const cs = byPair[c.pairId];
    if (cs && cs.length === 2 && cs[0].state === 'down' && cs[1].state === 'down') {
      return { pairId: c.pairId, cards: cs };
    }
  }
  return null;
}
/* 任意完整对（救援答案级兜底：未翻过的对也指第一张） */
function engAnyPair(L) {
  const byPair = {};
  L.cards.forEach(c => { (byPair[c.pairId] = byPair[c.pairId] || []).push(c); });
  for (let k = 0; k < L.cards.length; k++) {
    const cs = byPair[L.cards[k].pairId];
    if (cs && cs.length === 2 && cs[0].state === 'down' && cs[1].state === 'down') {
      return { pairId: L.cards[k].pairId, cards: cs };
    }
  }
  return null;
}
function engPartner(L, i) { // 第 i 张的配对牌下标
  const p = L.cards[i].pairId;
  for (let j = 0; j < L.cards.length; j++) if (j !== i && L.cards[j].pairId === p) return j;
  return -1;
}
/* 完美记忆序列：按牌序逐张翻，遇未配对先翻它再翻其配对（0 失误；pairId 语义通吃两模式） */
function perfectSequence(L) {
  const pos = {};
  L.cards.forEach((c, i) => { (pos[c.pairId] = pos[c.pairId] || []).push(i); });
  const down = L.cards.map(c => c.state === 'down');
  const seq = [];
  for (let i = 0; i < L.cards.length; i++) {
    if (!down[i]) continue;
    const j = pos[L.cards[i].pairId].find(x => x !== i && down[x]);
    if (j == null) continue;
    seq.push(i, j);
    down[i] = false; down[j] = false;
  }
  return seq;
}
