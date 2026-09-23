/* ================= shaperoof 纯引擎：确定性关卡生成 + 分离交互判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（5.5-6.5 段 v2；进度章号单调递增、难度章号 (ch-1)%4+1 循环——静态关 dch 禁 seeded）：
     dch1 旋转对位：洞 ∈ DIR4（三角/箭头/月牙/旗子）带朝向 0-3；瓦=DIR4 全 4 形，
           正确瓦初始朝向偏 off ∈ {1,2,3}（90/180/270°——永不预解）；
           flat0 题0 锚定 triangle / 洞 dir1 / off1（教学演示=旋转一次+放置）
     dch2 镜像辨向：洞 ∈ CHIRAL6（3 手性对）；干扰必含镜像伙伴（陷阱恒在场）+2 异形；
           旋转判定叠加（正确瓦仍偏 off ∈ {1,2,3}）
     dch3 组合瓦：洞 ∈ {L,T,Z}；瓦=分解 2 块 + 干扰 2 块（SLABS 减分解）；分解集合唯一
     dch4 混合：三题型轮换（每关 rot/mirror/combo 各 ≥1 + 随机 2），相邻题互异
   生成关（flat≥20）：dch=ri(1,4) seeded（家族 dch_reseed 模式，先取数保确定性）。
   铁律：瓦片 4 片互异（§0.17）；相邻题（kind+洞）互异；miss 口径=失败尝试总数
   （形状错 wrong / 朝向错 rot / 镜像错 mir 同计——星级=retries）。 */
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

/* ---------- 每关题序表 {kind, shape(洞), dir(洞朝向), off(正确瓦偏转)}（genLevel 预生成）
   dch4 kind 列表：前三题=[rot,mirror,combo] 洗牌（三型各 ≥1）+ 尾 2 题 ri(1,3) 随机；
   相邻互异=同 kind 连题时洞形/洞 id 必异（pickNe ≤8 掷兜底） */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  const pickNe = (pool, prev) => {
    let s = pool[Math.floor(rnd() * pool.length)];
    for (let g = 0; g < 8 && s === prev; g++) s = pool[Math.floor(rnd() * pool.length)];
    return s;
  };
  const pushOriented = (kind, pool, prevSame) => {
    const shape = pickNe(pool, prevSame);
    const dir = ri(rnd, 0, 3), off = ri(rnd, 1, 3);
    seq.push({ kind: kind, shape: shape, dir: dir, off: off });
    return shape;
  };
  if (dch === 1) {
    let prev = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      if (flat === 0 && qi === 0) { seq.push({ kind: 'rot', shape: 'triangle', dir: 1, off: 1 }); prev = 'triangle'; continue; }
      prev = pushOriented('rot', DIR4, prev);
    }
    return seq;
  }
  if (dch === 2) {
    let prev = null;
    for (let qi = 0; qi < CH_LEN; qi++) prev = pushOriented('mirror', CHIRAL6, prev);
    return seq;
  }
  if (dch === 3) {
    let prev = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      const h = pickNe(HOLE_IDS, prev);
      seq.push({ kind: 'combo', shape: h });
      prev = h;
    }
    return seq;
  }
  /* dch4 混合：kind 列表前三=三型洗牌（各 ≥1）+2 随机 */
  const kinds = shuffled(['rot', 'mirror', 'combo'], rnd).concat(
    Array.from({ length: CH_LEN - 3 }, () => ['rot', 'mirror', 'combo'][ri(rnd, 0, 2)]));
  const prevByKind = { rot: null, mirror: null, combo: null };
  for (let qi = 0; qi < CH_LEN; qi++) {
    const k = kinds[qi];
    if (k === 'combo') {
      prevByKind.combo = pushHole(prevByKind.combo);
    } else {
      const pool = k === 'rot' ? DIR4 : CHIRAL6;
      prevByKind[k] = pushOriented(k, pool, prevByKind[k]);
    }
  }
  return seq;
  function pushHole(prev) {
    const h = pickNe(HOLE_IDS, prev);
    seq.push({ kind: 'combo', shape: h });
    return h;
  }
}

/* ---------- 单题构建 → 洗牌 4 瓦片
   瓦 id='w'+最终位置下标（位置稳定实例 id）；shape=形/瓦 id；right=可放（判定真值）；
   dir=瓦朝向（rot/mirror：正确瓦=(洞dir-off+4)%4，干扰瓦随机 0-3；combo 恒 0 无维度）
   combo：q.sub=两槽 [{shape,filled}]（分解真值，两块都判定） */
function buildQuiz(spec, rnd) {
  if (spec.kind === 'combo') {
    const need = HOLE_DECOMP[spec.shape];
    const ds = shuffled(SLAB_IDS.filter(x => need.indexOf(x) < 0), rnd).slice(0, 2);
    const order = shuffled(need.concat(ds), rnd);
    const tiles = order.map((sh, j) => ({ id: 'w' + j, shape: sh, right: need.indexOf(sh) >= 0, dir: 0 }));
    return { kind: 'combo', shape: spec.shape, tiles: tiles,
             sub: need.map(sh => ({ shape: sh, filled: false })),
             _miss: 0, _answered: false, _placedN: 0, _sel: -1 };
  }
  const pool = spec.kind === 'rot' ? DIR4 : CHIRAL6;
  const others = pool.filter(x => x !== spec.shape &&
    (spec.kind !== 'mirror' || x !== MIRROR[spec.shape]));
  const ds = spec.kind === 'mirror'
    ? [MIRROR[spec.shape]].concat(shuffled(others, rnd).slice(0, 2))   // 镜像陷阱恒在场
    : others;                                                          // rot=DIR4 其余 3 形互为
  const order = shuffled([spec.shape].concat(ds), rnd);
  const tiles = order.map((sh, j) => ({
    id: 'w' + j, shape: sh, right: sh === spec.shape,
    dir: sh === spec.shape ? (spec.dir - spec.off + 4) % 4 : ri(rnd, 0, 3)
  }));
  return { kind: spec.kind, shape: spec.shape, dir: spec.dir, tiles: tiles,
           _miss: 0, _answered: false, _sel: -1 };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 rot/triangle/dir1/off1（教学演示锚点——specSeqOf flat===0 分支保确定性） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 分离交互引擎（无 DOM）
   engTapPiece(L, i) 'sel' 选中第 i 片瓦（组合已用瓦/越界=false 由调用层拦，引擎返 null）
   engRotate(L)     新 dir 0-3（顺时针 +90°；无选中/combo=false 调用层拦，引擎返 null）
   engTapPlace(L, i) 放置判定：
     'right' 本题完成推进 / 'done' 末题=通关 / 'half' combo 第一块放好（题未完）
     'rot'   形状对朝向错（miss+1）/ 'mir' 镜像形错放（miss+1）/ 'wrong' 形状错（miss+1）
     null    非法下标/已用瓦/关卡已结束 ---------- */
function engTapPiece(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.tiles.length) return null;
  if (q.tiles[i]._used) return null;
  q._sel = i;
  return 'sel';
}
function engRotate(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q.kind === 'combo') return null;
  if (!Number.isInteger(q._sel) || q._sel < 0 || q._sel >= q.tiles.length) return null;
  const t = q.tiles[q._sel];
  t.dir = (t.dir + 1) % 4;
  return t.dir;
}
function engTapPlace(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.tiles.length) return null;
  const t = q.tiles[i];
  if (t._used) return null;
  if (q.kind === 'combo') {
    let slot = -1;
    for (let k = 0; k < q.sub.length; k++) if (!q.sub[k].filled && q.sub[k].shape === t.shape) slot = k;
    if (slot < 0) { q._miss++; L.retries++; return 'wrong'; }
    q.sub[slot].filled = true;
    t._used = true;
    q._placedN++;
    if (q._placedN >= q.sub.length) {
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    return 'half';
  }
  if (t.shape === q.shape) {
    if (t.dir === q.dir) {
      q._answered = true;
      t._used = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    q._miss++; L.retries++; return 'rot';           /* 形状对朝向错：转一转方向哦 */
  }
  q._miss++; L.retries++;
  return (q.kind === 'mirror' && t.shape === MIRROR[q.shape]) ? 'mir' : 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（v2 口径）：全关失败尝试 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指/autoSolve 用：当前题下一步应点瓦下标
   （combo=第一个未填槽对应未用瓦；rot/mirror=right 瓦） */
const correctIdx = q => {
  if (!q) return -1;
  if (q.kind === 'combo') {
    for (let k = 0; k < q.sub.length; k++) {
      if (!q.sub[k].filled) {
        for (let i = 0; i < q.tiles.length; i++) {
          if (q.tiles[i].shape === q.sub[k].shape && !q.tiles[i]._used) return i;
        }
      }
    }
    return -1;
  }
  for (let i = 0; i < q.tiles.length; i++) if (q.tiles[i].right) return i;
  return -1;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 /
   镜像陷阱在场 / 组合分解自洽 / 瓦片互异 / 朝向偏转合法 / 相邻互异 / flat0q0 锚点 / 初始态干净 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'q';
  const kinds = ['rot', 'mirror', 'combo'];
  if (kinds.indexOf(q.kind) < 0) return 'kind';
  if (dch === 1 && q.kind !== 'rot') return 'dch1kind';
  if (dch === 2 && q.kind !== 'mirror') return 'dch2kind';
  if (dch === 3 && q.kind !== 'combo') return 'dch3kind';
  const isAnchor = flat === 0 && qi === 0;               // 教学演示题（转一次+放置）锚点
  if (isAnchor && (q.kind !== 'rot' || q.shape !== 'triangle' || q.dir !== 1)) return 'anchor';
  if (q.tiles.length !== 4) return 'tilesLen';
  const shp = q.tiles.map(t => t.shape);
  if (shp.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'tilesDup';
  if (q._miss !== 0 || q._answered || q._sel !== -1) return 'init';
  if (q.kind === 'combo') {
    if (HOLE_IDS.indexOf(q.shape) < 0) return 'holeLib';
    if (q.dir !== undefined) return 'comboDir';
    if (!q.sub || q.sub.length !== 2 || q._placedN !== 0) return 'sub';
    const need = HOLE_DECOMP[q.shape];
    if (q.sub[0].shape !== need[0] || q.sub[1].shape !== need[1] || q.sub[0].filled || q.sub[1].filled) return 'subMatch';
    if (!shp.every(v => SLAB_IDS.indexOf(v) >= 0)) return 'slabLib';
    for (let k = 0; k < 4; k++) {
      if (q.tiles[k].right !== (need.indexOf(q.tiles[k].shape) >= 0)) return 'rightFlag';
      if (q.tiles[k].dir !== 0) return 'slabDir';
      if (q.tiles[k]._used) return 'usedInit';
    }
    if (q.tiles.filter(t => t.right).length !== 2) return 'rightN';
  } else {
    const pool = q.kind === 'rot' ? DIR4 : CHIRAL6;
    if (pool.indexOf(q.shape) < 0) return 'shapeLib';
    if (!Number.isInteger(q.dir) || q.dir < 0 || q.dir > 3) return 'holeDir';
    if (!shp.every(v => pool.indexOf(v) >= 0)) return 'tilesLib';
    const rights = q.tiles.filter(t => t.right);
    if (rights.length !== 1) return 'rightN';
    if (rights[0].shape !== q.shape) return 'rightShape';
    for (let k = 0; k < 4; k++) {
      if (q.tiles[k].right !== (q.tiles[k].shape === q.shape)) return 'rightFlag';
      const d = q.tiles[k].dir;
      if (!Number.isInteger(d) || d < 0 || d > 3) return 'tileDir';
      if (q.tiles[k]._used) return 'usedInit';
    }
    const off = (q.dir - rights[0].dir + 4) % 4;         // 正确瓦偏转 ∈ {1,2,3}（永不预解）
    if (off < 1 || off > 3) return 'offPre';
    if (isAnchor && off !== 1) return 'anchorOff';       // 演示锚=恰好旋转一次
    if (q.kind === 'mirror' && shp.indexOf(MIRROR[q.shape]) < 0) return 'mirMissing';   // 镜像陷阱必在场
  }
  if (prevQ && prevQ.kind === q.kind && prevQ.shape === q.shape) return 'adjacent';
  return null;
}
