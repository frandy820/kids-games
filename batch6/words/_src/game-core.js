/* ================= words 纯引擎：确定性关卡生成 + 拼字槽位判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   题字序列 = 章字库（ch1-3 12 字 / ch4 19 字）从 start=(flat*5)%pool.length 连续取 5 个：
   相邻题不同字、跨关自然错开、每章 5 关 25 题次把池字全覆盖（verify 断言）
   干扰块 = r28 家族优先律：family(题字)=池内与它共用至少一个部件的其它字（同声旁/同部首家族），
   家族字的部件（排除本题正确部件、去重）先洗牌取用，不足 nDisEff 再从池内其余部件补足——
   同部首/同声旁辨析必然发生（题"晴"(日青) 的干扰含 氵讠忄，即 清/请/情 的形旁）
   拼字判定：部件块点了进第一个空槽（任意顺序）；槽满自动判定——
   每槽字==parts[i] 全对 → 解出；有误 → 错槽块弹回（对槽保留）、关 miss+1（零惩罚可重拼） */
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

/* ---------- r28 有效干扰数：nDisEff(dch, lv) = lv>=2 ? max(3, nDis) : nDis
   ch1/ch3 章内 2→3 上探坡（前两关 2 块、第三关起 3 块）；ch2/ch4 恒 3；全谱干扰恒 ≥2。
   程序可推断：verify famOk/diffOk 与 _r28_pycheck 按同一公式独立复算对账 ---------- */
function nDisEff(dch, lv) {
  const C = CHAPTERS[dch];
  return lv >= 2 ? Math.max(3, C.nDis) : C.nDis;
}

/* ---------- r28 家族优先干扰律（AUDIT-67：同声旁家族辨析）
   family(题字) = 池内与它共用至少一个部件的其它字（晴 的家族 = 清/请/情 共用"青"）
   familyParts = 家族字的部件中不属于本题正确部件者（晴 → 氵讠忄，恰为 清/请/情 的形旁）
   选取律：家族部件洗牌先取，不足 nDisEff 再从池内其余部件洗牌补足；
   家族非空 ⇒ 干扰必含 ≥1 家族部件（verify famOk 断言）；
   互异、不与正确部件同字（structOk 断言）——目标字在题面可见，无"排除法泄题"捷径，
   家族干扰恰好构成 形旁辨析（把 氵+青 拼成"清"会 fail 弹回，逼孩子看题面形旁） ---------- */
function familyParts(entry, pool) {
  const shared = {};
  entry.parts.forEach(p => { shared[p] = 1; });
  const seen = Object.assign({}, shared);
  const fam = pool.filter(e => e !== entry && e.parts.some(p => shared[p]));
  const cands = [];
  fam.forEach(e => e.parts.forEach(p => {
    if (!seen[p]) { seen[p] = 1; cands.push(p); }
  }));
  return cands;
}
function pickDistractors(dch, lv, entry, pool, rnd) {
  const n = nDisEff(dch, lv);
  const fam = shuffled(familyParts(entry, pool), rnd);
  const seen = {};
  entry.parts.forEach(p => { seen[p] = 1; });          // 排除正确部件（含重复部件字，如 林 的两个 木）
  fam.forEach(p => { seen[p] = 1; });
  const rest = [];
  pool.forEach(e => e.parts.forEach(p => {
    if (!seen[p]) { seen[p] = 1; rest.push(p); }
  }));
  return fam.slice(0, n).concat(shuffled(rest, rnd).slice(0, Math.max(0, n - fam.length)));
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const pool = CHARS[dch];
  const start = (flat * CH_LEN) % pool.length;
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const entry = pool[(start + qi) % pool.length];
    const distractors = pickDistractors(dch, lv, entry, pool, rnd);
    const tiles = shuffled(
      entry.parts.map(p => ({ ch: p, t: 'p' })).concat(distractors.map(d => ({ ch: d, t: 'd' }))),
      rnd);
    quizzes.push({
      c: entry.c, py: entry.py, w: entry.w,
      parts: entry.parts.slice(), distractors: distractors,
      tiles: tiles,                        // 池块（t:'p' 正确 / 'd' 干扰），打乱
      slots: entry.parts.map(() => null),  // 槽位 → 已入池块下标（null 空）
      solved: false, _miss: 0
    });
  }
  return { flat, ch, dch, lv, quizzes, step: 0, misses: 0, done: false };
}

/* ---------- 拼字引擎（无 DOM）
   engTapPart(L, i)：点池中块 i
     'placed' 放入空槽（未满）/ 'right' 槽满全对推进（非末题）/ 'done' 槽满全对通关
     'fail' 槽满有误：错槽块弹回（对槽保留），miss+1 / 'wrong' 干扰块：不进槽，miss+1
     false 非法（越界/已入槽块/题已解/关卡结束）
   engTapSlot(L, i)：点槽 i —— 有块撤回回池 true；空槽/已解 false ---------- */
function engTapPart(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (q.solved || i < 0 || i >= q.tiles.length) return false;
  if (q.slots.indexOf(i) >= 0) return false;           // 该块已在槽中
  const tile = q.tiles[i];
  if (tile.t === 'd') {                                // 干扰块：晃动弹回（零惩罚计数，不进槽）
    q._miss++;
    L.misses++;
    return 'wrong';
  }
  const j = q.slots.indexOf(null);                     // 第一个空槽
  if (j < 0) return false;                             // 理论不可达（槽满即判）
  q.slots[j] = i;
  if (q.slots.indexOf(null) >= 0) return 'placed';
  return engJudge(L, q);                               // 槽满自动判定
}
/* 槽满判定：全对 → 解出推进；有误 → 错槽弹回（保留位置正确的槽） */
function engJudge(L, q) {
  let allRight = true;
  for (let j = 0; j < q.parts.length; j++) {
    if (q.tiles[q.slots[j]].ch !== q.parts[j]) { allRight = false; break; }
  }
  if (allRight) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q._miss++;
  L.misses++;
  for (let j = 0; j < q.parts.length; j++) {           // 位置错的槽弹回，位置对的保留
    if (q.tiles[q.slots[j]].ch !== q.parts[j]) q.slots[j] = null;
  }
  return 'fail';
}
function engTapSlot(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (q.solved || i < 0 || i >= q.slots.length || q.slots[i] == null) return false;
  q.slots[i] = null;
  return true;
}
const engWon = L => !!L && L.done;
/* 星级：关 miss（干扰块进槽+槽满判定失败）0=3 星 / 1-2=2 星 / 更多=1 星。永不 0 星 */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：部件数合规 / 干扰数=nDisEff(dch,lv) / 干扰不与正确部件
   重复且互异 / tiles 恰为 parts+distractors 的排列 / 字属于该章字库 ---------- */
function structOk(q, dch, lv) {
  if (!q || !q.tiles) return false;
  const C = CHAPTERS[dch];
  if (q.parts.length < C.dPart || q.parts.length > C.dPartMax) return false;
  if (q.distractors.length !== nDisEff(dch, lv)) return false;
  for (let k = 0; k < q.distractors.length; k++) {
    if (q.parts.indexOf(q.distractors[k]) >= 0) return false;      // 干扰不与正确部件同字
    for (let m = k + 1; m < q.distractors.length; m++)
      if (q.distractors[k] === q.distractors[m]) return false;     // 干扰互异
  }
  if (q.tiles.length !== q.parts.length + q.distractors.length) return false;
  const want = q.parts.concat(q.distractors).sort().join();
  const got = q.tiles.map(t => t.ch).sort().join();
  if (want !== got) return false;                                  // tiles=完整排列
  return CHARS[dch].some(e => e.c === q.c && e.py === q.py && e.parts.join() === q.parts.join());
}
