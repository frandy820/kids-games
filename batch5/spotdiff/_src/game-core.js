/* ================= spotdiff 纯引擎：确定性关卡生成（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章 1=2 处不同（元素 6-8）/ 章 2=3 处（8-10）/ 章 3=4 处（10-12）/ 章 4=5 处（12-13）
   差异类型：color 换色 / move 位移 / size 大小 / del 下图少 / add 下图多
   硬约束：差异点位（下图坐标）两两间距 ≥120（防一点中俩）；点位在图内（边距 ≥56）；
   移动差异落点不与其他元素重叠；所有元素中心在 viewBox 内（按各自半径留边） */
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
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 位置抖动 + 按类钳制（天带元素不越地平线 / 草带元素不出底边） ---------- */
function placeAt(kind, x, y) {
  const vw = VIS[kind][0], vh = VIS[kind][1], jx = JIT[kind][0], jy = JIT[kind][1];
  x += ri(RND, -jx, jx); y += ri(RND, -jy, jy);
  x = Math.max(vw + 8, Math.min(VB_W - vw - 8, x));
  if (kind === 'flower' || kind === 'mushroom' || kind === 'rabbit') {   // 草带：站草地、不出底边
    y = Math.max(HORIZON + 30, Math.min(VB_H - vh - 6, y));
  } else if (kind === 'sun') {                                           // 太阳：高空
    y = Math.max(vh + 8, Math.min(140, y));
  } else if (kind === 'cloud') {                                         // 云：地平线以上
    y = Math.max(vh - 6, Math.min(172, y));
  } else {                                                               // 蝴蝶：空中飞
    y = Math.max(vh + 8, Math.min(218, y));
  }
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}
let RND = null;   // genLevel 内全程同流（placeAt 依赖；verify 确定性由两跑 JSON 比对把关）

/* ---------- 元素布置：太阳固定 A 槽；小兔随机草槽；其余按配额填充 ---------- */
function layoutEls(dch, rnd) {
  const q = QUOTA[dch];
  const others = ri(rnd, q.N[0], q.N[1]) - 2;
  const free = SLOTS.slice();
  const take = slot => { free.splice(free.indexOf(slot), 1); return slot; };
  const els = [];
  /* 太阳（场景锚点，永远在） */
  let s = SLOTS[0];
  const sunP = placeAt('sun', s.x, s.y);
  els.push({ ei: 0, kind: 'sun', x: sunP[0], y: sunP[1], s: 1, c: 0 });
  take(s);
  /* 小兔（IP 形象，永远在） */
  const grassFree = () => free.filter(sl => sl.zone === 'grass');
  const skyFree = kinds => free.filter(sl => sl.zone === 'sky' && kinds.some(k => sl.kinds.indexOf(k) >= 0));
  let gs = shuffled(grassFree(), rnd)[0];
  const rbP = placeAt('rabbit', gs.x, gs.y);
  els.push({ ei: 1, kind: 'rabbit', x: rbP[0], y: rbP[1], s: 1, c: 0 });
  take(gs);
  /* 其余元素：min 起步，循环补齐到 others（容量不足提前收） */
  const cnt = { cloud: q.cloud[0], butterfly: q.butterfly[0], flower: q.flower[0], mushroom: q.mushroom[0] };
  const cap = { cloud: q.cloud[1], butterfly: q.butterfly[1], flower: q.flower[1], mushroom: q.mushroom[1] };
  const zoneOf = { cloud: 'sky', butterfly: 'sky', flower: 'grass', mushroom: 'grass' };
  const canFit = kind => (zoneOf[kind] === 'sky' ? skyFree([kind]) : free.filter(sl =>
    sl.zone === 'grass' && sl.kinds.indexOf(kind) >= 0)).length > 0;
  let total = cnt.cloud + cnt.butterfly + cnt.flower + cnt.mushroom;
  while (total < others) {
    const ks = shuffled(Object.keys(cnt), rnd).filter(k => cnt[k] < cap[k] && canFit(k));
    if (!ks.length) break;
    cnt[ks[0]]++; total++;
  }
  ['cloud', 'butterfly', 'flower', 'mushroom'].forEach(kind => {
    for (let n = 0; n < cnt[kind]; n++) {
      const cand = zoneOf[kind] === 'sky' ? skyFree([kind]) : free.filter(sl => sl.zone === 'grass' && sl.kinds.indexOf(kind) >= 0);
      if (!cand.length) return;                       // 容量兜底（配额已排布，理论不触发）
      const sl = shuffled(cand, rnd)[0];
      const p = placeAt(kind, sl.x, sl.y);
      els.push({ ei: els.length, kind: kind, x: p[0], y: p[1], s: 1, c: kind === 'cloud' ? 0 : ri(rnd, 0, 2) });
      take(sl);
    }
  });
  return { els, free };
}

/* ---------- 差异挑选：候选洗牌贪心，逐个赋型；间距 <120 或落点非法则弃选重试 ---------- */
const cntType = (diffs, t) => diffs.reduce((n, d) => n + (d.type === t ? 1 : 0), 0);
function pickDiffs(els, free, k, rnd) {
  const pts = [];                                     // 已接受差异点（下图坐标）
  const diffs = [];
  const usedEi = new Set(), usedSlot = new Set();     // 同一元素/槽位不出两个差异
  const okSpot = (x, y) => x >= 62 && x <= VB_W - 62 && y >= 52 && y <= VB_H - 34 &&
    pts.every(p => dist2(p.x, p.y, x, y) >= 120);
  const okSpace = (x, y, r, list) => list.every(e => dist2(e.x, e.y, x, y) >= r + RAD[e.kind] - 6);
  /* 基础候选（引用基础元素）+ add 候选（空闲槽新元素）；数量足够，贪心必有解 */
  for (let t = 0; t < 60 && diffs.length < k; t++) {
    const base = shuffled(els, rnd);
    const adds = shuffled(free, rnd).flatMap(sl =>
      sl.kinds.filter(kk => ADD_KINDS.indexOf(kk) >= 0).map(kk => ({ slot: sl.id, kind: kk })));
    const pool = [];
    base.forEach(e => pool.push({ ei: e.ei }));
    adds.forEach(a => pool.push({ add: a }));
    const cands = shuffled(pool, rnd);
    const types = shuffled(['color', 'move', 'size', 'del'], rnd);
    let ti = 0;
    for (let ci = 0; ci < cands.length && diffs.length < k; ci++) {
      const cd = cands[ci];
      if (cd.add) {                                   // add：下图多的新元素（落在空闲槽）
        if (usedSlot.has(cd.add.slot) || cntType(diffs, 'add') >= Math.max(1, Math.ceil(k / 2))) continue;
        const kind = cd.add.kind;
        const sl = SLOTS.find(ss => ss.id === cd.add.slot);
        const p = placeAt(kind, sl.x, sl.y);
        const others = els.concat(diffs.filter(d => d.type === 'add').map(d => d.el));
        if (!okSpot(p[0], p[1]) || !okSpace(p[0], p[1], RAD[kind] * 1.05, others)) continue;
        const el = { ei: -1, kind: kind, x: p[0], y: p[1], s: 1, c: kind === 'cloud' ? 0 : ri(rnd, 0, 2) };
        pts.push({ x: el.x, y: el.y });
        usedSlot.add(cd.add.slot);
        diffs.push({ ei: -1, type: 'add', el: el, x: el.x, y: el.y });
        continue;
      }
      if (usedEi.has(cd.ei)) continue;
      const e = els[cd.ei];
      let ty = null;
      for (let n = 0; n < 4; n++) {                   // 先取轮转型，不在白名单则退到首个可用型
        const want = types[(ti + n) % 4];
        if (DIFFABLE[e.kind].indexOf(want) >= 0) { ty = want; ti += n + 1; break; }
      }
      if (!ty) { ti++; continue; }
      if (ty === 'color') {
        const c2 = (e.c + 1 + ri(rnd, 0, 1)) % 3;     // 三色三角互换，必不重色
        if (!okSpot(e.x, e.y)) continue;
        pts.push({ x: e.x, y: e.y });
        usedEi.add(e.ei);
        diffs.push({ ei: e.ei, type: 'color', c2: c2, x: e.x, y: e.y });
      } else if (ty === 'size') {
        if (cntType(diffs, 'size') >= 2) { ty = 'color'; }                     // 同型限额（保多样性）
        if (ty === 'size') {
          const s2 = rnd() < 0.5 ? 0.62 : 1.42;
          const vw = Math.round(VIS[e.kind][0] * Math.max(1, s2)), vh = Math.round(VIS[e.kind][1] * Math.max(1, s2));
          const x2 = Math.max(vw + 8, Math.min(VB_W - vw - 8, e.x));
          const y2 = Math.max(vh + 8, Math.min(VB_H - vh - 6, e.y));
          if (Math.abs(x2 - e.x) > 8 || Math.abs(y2 - e.y) > 8) continue;   /* 反方审查 m9：放大被边缘钳出计划外位移=弃选（纯 size 差异不位移） */
          if (!okSpot(x2, y2)) continue;
          pts.push({ x: x2, y: y2 });
          usedEi.add(e.ei);
          diffs.push({ ei: e.ei, type: 'size', s2: s2, x: x2, y: y2 });
        } else {
          const c2 = (e.c + 1 + ri(rnd, 0, 1)) % 3;
          if (DIFFABLE[e.kind].indexOf('color') < 0 || !okSpot(e.x, e.y)) continue;
          pts.push({ x: e.x, y: e.y });
          usedEi.add(e.ei);
          diffs.push({ ei: e.ei, type: 'color', c2: c2, x: e.x, y: e.y });
        }
      } else if (ty === 'move') {
        const bot = bottomSnapshot(els, diffs);       // 落点不得压到其他下图元素
        let mv = null;
        for (let m = 0; m < 10 && !mv; m++) {
          const mag = 70 + ri(rnd, 0, 45), dx = (rnd() < 0.5 ? -1 : 1) * mag;
          const x2 = Math.max(RAD[e.kind] + 12, Math.min(VB_W - RAD[e.kind] - 12, e.x + dx));
          if (Math.abs(x2 - e.x) < 50) continue;      // 被钳住=位移不可见，弃
          if (!okSpot(x2, e.y)) continue;
          if (!okSpace(x2, e.y, RAD[e.kind], bot.filter(b => b.ei !== e.ei))) continue;
          mv = x2;
        }
        if (mv == null) continue;
        pts.push({ x: mv, y: e.y });
        usedEi.add(e.ei);
        diffs.push({ ei: e.ei, type: 'move', x2: mv, y2: e.y, x: mv, y: e.y });
      } else {                                        // del：下图少（点空位处）
        if (cntType(diffs, 'del') >= Math.max(1, Math.ceil(k / 2))) continue;
        if (!okSpot(e.x, e.y)) continue;
        pts.push({ x: e.x, y: e.y });
        usedEi.add(e.ei);
        diffs.push({ ei: e.ei, type: 'del', x: e.x, y: e.y });
      }
    }
    if (diffs.length < k && t >= 40) break;           // 极端兜底退出（布局留量大，理论不触发）
  }
  return diffs.slice(0, k);
}

/* ---------- 下图元素快照（move 重叠检查用：已接受差异应用后的底图） ---------- */
function bottomSnapshot(els, diffs) {
  const out = [];
  els.forEach(e => {
    const d = diffs.find(dd => dd.ei === e.ei);
    if (d && d.type === 'del') return;
    if (d && d.type === 'size') out.push({ ei: e.ei, kind: e.kind, x: d.x, y: d.y });
    else if (d && d.type === 'move') out.push({ ei: e.ei, kind: e.kind, x: d.x2, y: d.y2 });
    else out.push({ ei: e.ei, kind: e.kind, x: e.x, y: e.y });
  });
  diffs.forEach(d => { if (d.type === 'add') out.push(d.el); });
  return out;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  RND = rnd;
  const { els, free } = layoutEls(dch, rnd);
  let k = CHAPTERS[dch].k;
  const diffs = pickDiffs(els, free, k, rnd);
  /* 反方审查 m5：pickDiffs 极端兜底可能返回 <k 条（槽位近距耗尽）——k 收缩到实际条数，
     防 foundCount>=k 永不可达的理论软锁（当前槽位表 0-99 无触发，防御性收口） */
  if (diffs.length < k) k = diffs.length;
  return { flat, ch, dch, lv, k, els: els, diffs: diffs, found: diffs.map(() => false),
    foundCount: 0, misses: 0, done: false };
}

/* ---------- 下图渲染元素（渲染真值源；UI 与 verify 共用） ---------- */
function bottomEls(L) {
  const out = [];
  L.els.forEach(e => {
    const d = L.diffs.find(dd => dd.ei === e.ei);
    if (!d) { out.push({ ei: e.ei, kind: e.kind, x: e.x, y: e.y, s: e.s, c: e.c }); return; }
    if (d.type === 'del') return;
    if (d.type === 'color') out.push({ ei: e.ei, kind: e.kind, x: e.x, y: e.y, s: e.s, c: d.c2 });
    else if (d.type === 'size') out.push({ ei: e.ei, kind: e.kind, x: d.x, y: d.y, s: d.s2, c: e.c });
    else if (d.type === 'move') out.push({ ei: e.ei, kind: e.kind, x: d.x2, y: d.y2, s: e.s, c: e.c });
    else out.push({ ei: e.ei, kind: e.kind, x: e.x, y: e.y, s: e.s, c: e.c });
  });
  L.diffs.forEach(d => { if (d.type === 'add') out.push({ ei: -1, kind: d.el.kind, x: d.el.x, y: d.el.y, s: 1, c: d.el.c }); });
  return out;
}

/* ---------- 点击判定（无 DOM）：最近未找到差异且距离 ≤R 命中
   {r:'right'|'done', i} 命中 / 'again' 点已圈中处（不计惩罚）/ 'miss' 空点（计一次错点） ---------- */
function engTap(L, x, y, R) {
  if (!L || L.done) return { r: null };
  let best = -1, bd = Infinity;
  for (let i = 0; i < L.diffs.length; i++) {
    if (L.found[i]) continue;
    const d = dist2(L.diffs[i].x, L.diffs[i].y, x, y);
    if (d < bd) { bd = d; best = i; }
  }
  if (best >= 0 && bd <= R) {
    L.found[best] = true;
    L.foundCount++;
    if (L.foundCount >= L.k) L.done = true;
    return { r: L.done ? 'done' : 'right', i: best };
  }
  for (let i = 0; i < L.diffs.length; i++) {               // 点在已圈中的圈上：轻提示不计罚
    if (L.found[i] && dist2(L.diffs[i].x, L.diffs[i].y, x, y) <= R * 1.5) return { r: 'again' };
  }
  L.misses++;
  return { r: 'miss' };
}
const engWon = L => !!L && L.done;
/* 星级：错点 0 次=3 星 / 1-3 次=2 星 / 更多=1 星。永不 0 星（SPEC §2） */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 3 ? 2 : 1);
