/* ================= maze 纯引擎：确定性迷宫生成 + 逐格点选走位判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 37)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH30 §0.75/§3；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 5×5 少障碍（墙 2-4，无门）
     dch2 7×7 中障碍（墙 6-10，无门）
     dch3 7×7 钥匙门（墙 6-10 + 钥匙格 + 门格：门=分隔行唯一缺口 → 恒必经割点）
     dch4 混合：每局独立掷子型 sub∈{1,2,3}（局间混出）
   每关 3 局（RUNS_PER_LEVEL；迷宫单局时长长于选择题，破 5 题惯例——SPEC 明示）。
   生成数学先验（§0.75，出题器即验证——structWhy 同款校验双保险）：
     ① 每局必可解：生成后 BFS 验证 entry→goal 连通，不通整局重生成（同 seed 确定性）；
     ② ch3 分段三验：门关态（walls∪{door} 障碍）entry→key 连通 + 门开态 key→goal
        连通 + 门关态 entry→goal **不连通**（门必经——钥匙必要，未拿钥匙物理到不了出口）；
     ③ 墙格界内互异，不压 entry/goal/key/door；
     ④ 相邻局布局互异（maze 指纹对账）；
     ⑤ 解不要求唯一（走通即 right）；墙分布 seeded 确定（同 flat 同 rnd 流）。 */
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
const chOfFlat = flat => Math.floor(flat / LEVELS_PER_CH) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 网格工具（(r,c)：r=0 顶行，c=0 左列） ---------- */
const samePos = (a, b) => !!a && !!b && a.r === b.r && a.c === b.c;
const isWall = (walls, p) => walls.some(w => samePos(w, p));
const distOf = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
const inSize = (size, p) => p.r >= 0 && p.r < size && p.c >= 0 && p.c < size;
/* BFS 可达：block 为障碍格集（walls / walls∪{door}）；返回 from→to 可达布尔 */
function bfsReach(size, walls, from, to, block) {
  const bs = (block || []).map(w => w.r + ',' + w.c);
  const bad = p => isWall(walls, p) || bs.indexOf(p.r + ',' + p.c) >= 0;
  if (bad(to)) return false;
  const seen = {};
  const qq = [from];
  seen[from.r + ',' + from.c] = 1;
  while (qq.length) {
    const p = qq.shift();
    if (samePos(p, to)) return true;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => {
      const nv = { r: p.r + d[0], c: p.c + d[1] };
      if (!inSize(size, nv) || bad(nv) || seen[nv.r + ',' + nv.c]) return;
      seen[nv.r + ',' + nv.c] = 1;
      qq.push(nv);
    });
  }
  return false;
}
/* BFS 最短路路径（含起终点；不可达 null）：autoSolve / 教学帮指 / 答案级救援共用 */
function bfsPath(size, walls, from, to, block) {
  const bs = (block || []).map(w => w.r + ',' + w.c);
  const bad = p => isWall(walls, p) || bs.indexOf(p.r + ',' + p.c) >= 0;
  if (bad(to)) return null;
  const prev = {};
  const key0 = from.r + ',' + from.c;
  const seen = {};
  seen[key0] = 1;
  const qq = [from];
  while (qq.length) {
    const p = qq.shift();
    if (samePos(p, to)) break;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => {
      const nv = { r: p.r + d[0], c: p.c + d[1] };
      const k = nv.r + ',' + nv.c;
      if (!inSize(size, nv) || bad(nv) || seen[k]) return;
      seen[k] = 1;
      prev[k] = p.r + ',' + p.c;
      qq.push(nv);
    });
  }
  const tk = to.r + ',' + to.c;
  if (!seen[tk]) return null;
  const path = [];
  let cur = tk;
  while (cur !== key0) { const pp = cur.split(','); path.unshift({ r: +pp[0], c: +pp[1] }); cur = prev[cur]; }
  path.unshift({ r: from.r, c: from.c });
  return path;
}
const mazeKeyOf = q => q.size + '|' + q.entry.r + ',' + q.entry.c + '>' + q.goal.r + ',' + q.goal.c +
  '|' + q.walls.map(w => w.r + ',' + w.c).sort().join(';') +
  (q.key ? '|K' + q.key.r + ',' + q.key.c + 'D' + q.door.r + ',' + q.door.c : '');

/* ---------- 单局生成（确定性）：sub∈{1,2,3} 子型 ---------- */
const SUB_SIZE = { 1: 5, 2: 7, 3: 7 };
const SUB_WALL_LO = { 1: 2, 2: 6, 3: 6 };   // sub3 = 分隔行 6 墙 + 附加 0-4
const SUB_WALL_HI = { 1: 4, 2: 10, 3: 10 };
const SUB_DIST_LO = { 1: 4, 2: 8, 3: 8 };
const SUB_DIST_HI = { 1: 6, 2: 12, 3: 12 };

function buildMaze(sub, rnd, flat, qi, prevQ) {
  /* flat0 局0 教学演示锚点：5×5 entry(1,1)→goal(1,3) dist=2 无墙
     （幽灵手指点 (1,2) 走一步 → 点 (1,3) 到萝卜 = 走 2 步演示，SPEC §3） */
  if (flat === 0 && qi === 0) {
    return { sub: 1, size: 5, entry: { r: 1, c: 1 }, goal: { r: 1, c: 3 }, walls: [],
             key: null, door: null, pos: { r: 1, c: 1 }, trail: [{ r: 1, c: 1 }],
             hasKey: false, _miss: 0, _answered: false };
  }
  const size = SUB_SIZE[sub];

  /* ---- sub3 钥匙门：分隔行走廊构造（门=整行唯一缺口 → 恒必经割点） ---- */
  if (sub === 3) {
    for (let t = 0; t < 40; t++) {
      const sr = ri(rnd, 2, 4);                       // 分隔行（内部行 2-4）
      const sc = ri(rnd, 1, 5);                       // 门列（留边不贴墙）
      const door = { r: sr, c: sc };
      const walls = [];
      for (let c = 0; c < 7; c++) if (c !== sc) walls.push({ r: sr, c: c });   // 分隔行 6 墙
      /* 附加墙（0-4，分歧行上下各随机放；放后三段验证，破坏即重摆本轮） */
      const extra = ri(rnd, 0, 4);
      const upCells = [], dnCells = [];
      for (let r = 0; r < sr; r++) for (let c = 0; c < 7; c++) upCells.push({ r: r, c: c });
      for (let r = sr + 1; r < 7; r++) for (let c = 0; c < 7; c++) dnCells.push({ r: r, c: c });
      /* entry=上半（距门 ≥3）、goal=下半（对角感远距） */
      const upPool = upCells.filter(p => distOf(p, door) >= 3);
      const entry = upPool.length ? upPool[Math.floor(rnd() * upPool.length)] : { r: 0, c: 0 };
      const dnPool = dnCells.filter(p => distOf(entry, p) >= SUB_DIST_LO[3]);
      if (!dnPool.length) continue;
      const goal = dnPool[Math.floor(rnd() * dnPool.length)];
      if (distOf(entry, goal) > SUB_DIST_HI[3]) continue;
      /* key=上半（非 entry，距 entry ≥2 距门 ≥2） */
      const keyPool = upCells.filter(p => !samePos(p, entry) && distOf(p, entry) >= 2 && distOf(p, door) >= 2);
      if (!keyPool.length) continue;
      const key = keyPool[Math.floor(rnd() * keyPool.length)];
      /* 附加墙随机放（上下半，避 entry/goal/key/door），放满 extra 个 */
      const spots = shuffled(upCells.concat(dnCells).filter(p =>
        !samePos(p, entry) && !samePos(p, goal) && !samePos(p, key) && !samePos(p, door)), rnd);
      for (let k = 0; k < spots.length && walls.length - 6 < extra; k++) walls.push(spots[k]);
      const L3 = { sub: 3, size: 7, entry: entry, goal: goal, walls: walls,
                   key: key, door: door, pos: { r: entry.r, c: entry.c },
                   trail: [{ r: entry.r, c: entry.c }], hasKey: false, _miss: 0, _answered: false };
      /* 三段验证（§0.75：门关 entry→key 通 + 门开 key→goal 通 + 门关 entry→goal 不通=门必经） */
      const doorShut = bfsReach(7, walls, entry, key, [door]) &&
                       bfsReach(7, walls, key, goal, []) &&
                       !bfsReach(7, walls, entry, goal, [door]);
      if (doorShut) {
        if (prevQ && mazeKeyOf(prevQ) === mazeKeyOf(L3) && t < 39) continue;   // 相邻局互异（末掷放行）
        return L3;
      }
    }
    /* 兜底（理论不可达）：第 3 行全墙仅 (3,3) 缺口=门；key=(0,3) 顶行可达；goal=(6,6) */
    const walls = [];
    for (let c = 0; c < 7; c++) if (c !== 3) walls.push({ r: 3, c: c });
    return { sub: 3, size: 7, entry: { r: 0, c: 0 }, goal: { r: 6, c: 6 }, walls: walls,
             key: { r: 0, c: 3 }, door: { r: 3, c: 3 }, pos: { r: 0, c: 0 },
             trail: [{ r: 0, c: 0 }], hasKey: false, _miss: 0, _answered: false };
  }

  /* ---- sub1/sub2 无门：随机摆墙 + BFS 可达验证 ---- */
  for (let t = 0; t < 40; t++) {
    const cells = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) cells.push({ r: r, c: c });
    const entry = cells[Math.floor(rnd() * cells.length)];
    const goalPool = cells.filter(p => distOf(p, entry) >= SUB_DIST_LO[sub] && distOf(p, entry) <= SUB_DIST_HI[sub]);
    if (!goalPool.length) continue;
    const goal = goalPool[Math.floor(rnd() * goalPool.length)];
    const nWall = ri(rnd, SUB_WALL_LO[sub], SUB_WALL_HI[sub]);
    const free = shuffled(cells.filter(p => !samePos(p, entry) && !samePos(p, goal)), rnd);
    const walls = free.slice(0, nWall);
    if (!bfsReach(size, walls, entry, goal)) continue;                // 不可达=整局重生成
    const L2 = { sub: sub, size: size, entry: entry, goal: goal, walls: walls,
                 key: null, door: null, pos: { r: entry.r, c: entry.c },
                 trail: [{ r: entry.r, c: entry.c }], hasKey: false, _miss: 0, _answered: false };
    if (prevQ && mazeKeyOf(prevQ) === mazeKeyOf(L2) && t < 39) continue;
    return L2;
  }
  /* 兜底（理论不可达）：对角走廊 + 离路墙（确定性可解） */
  const size2 = SUB_SIZE[sub];
  const walls2 = size2 === 5 ? [{ r: 2, c: 1 }, { r: 1, c: 3 }, { r: 3, c: 3 }]
                            : [{ r: 1, c: 2 }, { r: 2, c: 4 }, { r: 3, c: 1 },
                               { r: 4, c: 5 }, { r: 5, c: 2 }, { r: 1, c: 5 }];
  return { sub: sub, size: size2, entry: { r: 0, c: 0 }, goal: { r: size2 - 1, c: size2 - 1 },
           walls: walls2, key: null, door: null, pos: { r: 0, c: 0 },
           trail: [{ r: 0, c: 0 }], hasKey: false, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关 dch 取数前 burn 一掷：mulberry32(flat*7919+37) 首掷对 4 有系统偏差
   （b25 坑④ coder 实测同源）；burn+ri 仍是该 rnd 流固定首个消耗——确定性保持 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % LEVELS_PER_CH;
  const rnd = mulberry32(flat * 7919 + 37);
  if (flat >= STATIC_LEVELS) rnd();                          // burn：首掷偏差修正（仅生成关消耗）
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const mazes = [];
  let prev = null;
  for (let qi = 0; qi < RUNS_PER_LEVEL; qi++) {
    const sub = dch === 4 ? ri(rnd, 1, 3) : dch;             // ch4 混合：局间掷子型
    const m = buildMaze(sub, rnd, flat, qi, prev);
    mazes.push(m);
    prev = m;
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           mazes: mazes, step: 0, retries: 0, done: false };
}

/* ---------- 逐格点选引擎（无 DOM）：engTapCell(L, r, c) —— 点 (r,c) 格
   'moved' 相邻可行格移动（含拾钥匙：hasKey 变真 / 过门：已拿钥匙后门格=普通格）
   'back'  回退已走格（trail 内格；不记 miss——死路自救）
   'right' 到达萝卜格=本局完成 / 'done' 末局=通关
   'wrong' 障碍格（不论远近）/ 对角 / 不相邻（含点自身）/ 未拿钥匙点门——miss+1
   null    越界 / 局已结束 / 关卡已结束 ---------- */
function engTapCell(L, r, c) {
  if (!L || L.done || L.step >= L.mazes.length) return null;
  const q = L.mazes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(r) || !Number.isInteger(c) ||
      r < 0 || r >= q.size || c < 0 || c >= q.size) return null;
  const p = { r: r, c: c };
  if (isWall(q.walls, p)) {                                   // 障碍格（含点远墙）
    q._miss++; L.retries++; return 'wrong';
  }
  if (q.door && samePos(q.door, p) && !q.hasKey) {            // 未拿钥匙点门（不论远近）
    q._miss++; L.retries++; return 'wrong';
  }
  if (distOf(p, q.pos) !== 1) {                               // 对角 / 跳格 / 不相邻（含点自身）
    q._miss++; L.retries++; return 'wrong';
  }
  if (samePos(p, q.goal)) {                                   // 到萝卜=局终（走通即 right，解不唯一）
    q._answered = true;
    L.step++;
    if (L.step >= L.mazes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  const ti = q.trail.findIndex(s => samePos(s, p));
  if (ti >= 0) {                                              // 回退已走格：截断足迹（不记 miss）
    q.trail = q.trail.slice(0, ti + 1);
    q.pos = { r: r, c: c };
    return 'back';
  }
  q.trail.push({ r: r, c: c });                               // moved（含拾钥匙）
  q.pos = { r: r, c: c };
  if (q.key && !q.hasKey && samePos(q.key, p)) q.hasKey = true;   // 拾钥匙：moved + hasKey 变真
  return 'moved';
}
const engWon = L => !!L && L.done;
/* 星级（§0.75 miss 口径同族）：全关 miss 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- 求解器：当前局下一步应点格（BFS 最短路第二格）
   未拿钥匙（sub3）→ 目标=key（门视障碍）；拿到 / 无门 → 目标=goal（门可走）
   教学帮指 / 答案级救援 / autoSolve 共用。无解=null（生成先验保证不出现） ---------- */
function solveNext(q) {
  if (!q || q._answered) return null;
  const needKey = !!(q.key && !q.hasKey);
  const dest = needKey ? q.key : q.goal;
  const block = needKey ? [q.door] : [];
  const path = bfsPath(q.size, q.walls, q.pos, dest, block);
  return path && path.length >= 2 ? path[1] : null;
}

/* ---------- 结构校验（verify 用，返回失败原因或 null）：子型/尺寸/墙域/距离域 /
   墙格界内互异不压要点 / 分段三验（sub3） / 可解性（sub1/2） / 相邻互异 /
   flat0q0 锚点 / 初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'q';
  const sub = q.sub;
  if (sub !== 1 && sub !== 2 && sub !== 3) return 'sub';
  if (dch !== 4 && sub !== dch) return 'subDch';              // ch1-3 子型=章型；ch4 局间混出
  if (q.size !== SUB_SIZE[sub]) return 'size';
  if (!inSize(q.size, q.entry) || !inSize(q.size, q.goal)) return 'grid';
  const d = distOf(q.entry, q.goal);
  if (flat === 0 && qi === 0) {                               // 教学锚点（走 2 步到萝卜）
    if (!(q.size === 5 && q.entry.r === 1 && q.entry.c === 1 &&
          q.goal.r === 1 && q.goal.c === 3 && q.walls.length === 0 &&
          !q.key && !q.door && d === 2)) return 'anchor';
  } else {
    if (d < SUB_DIST_LO[sub] || d > SUB_DIST_HI[sub]) return 'dist';
  }
  const ws = q.walls;
  const anchor = flat === 0 && qi === 0;
  if (!anchor && (ws.length < SUB_WALL_LO[sub] || ws.length > SUB_WALL_HI[sub])) return 'wallN';
  const keyset = new Set(ws.map(w => w.r + ',' + w.c));
  if (keyset.size !== ws.length) return 'wallDup';
  if (ws.some(w => !inSize(q.size, w) || samePos(w, q.entry) || samePos(w, q.goal))) return 'wallCell';
  if (sub < 3) {
    if (q.key || q.door) return 'doorCh';                     // 无门章不得带门钥
    if (!bfsReach(q.size, ws, q.entry, q.goal)) return 'unreach';
  } else {
    if (!q.key || !q.door) return 'noKeyDoor';
    if (!inSize(q.size, q.key) || !inSize(q.size, q.door)) return 'kdGrid';
    if (samePos(q.key, q.entry) || samePos(q.key, q.goal) || samePos(q.key, q.door)) return 'keyCell';
    if (samePos(q.door, q.entry) || samePos(q.door, q.goal)) return 'doorCell';
    if (keyset.has(q.key.r + ',' + q.key.c) || keyset.has(q.door.r + ',' + q.door.c)) return 'kdWall';
    if (!bfsReach(q.size, ws, q.entry, q.key, [q.door])) return 'segKey';     // 门关 entry→key
    if (!bfsReach(q.size, ws, q.key, q.goal, [])) return 'segGoal';           // 门开 key→goal
    if (bfsReach(q.size, ws, q.entry, q.goal, [q.door])) return 'doorBypass'; // 门关 entry→goal 必不通
  }
  if (prevQ && mazeKeyOf(prevQ) === mazeKeyOf(q)) return 'adjacent';          // 相邻局布局互异
  if (!samePos(q.pos, q.entry)) return 'pos';
  if (q.trail.length !== 1 || !samePos(q.trail[0], q.entry)) return 'trail';
  if (q.hasKey) return 'hasKey';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
