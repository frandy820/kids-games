/* ================= bounce 纯引擎：格点反弹模拟 / 确定性出题 / 判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 29)：同 flat 永远同关（重玩一致、verify 可检）。
   几何模型（SPEC §3 + §0.39）：格点阵 7×6（x∈[0..6]，y∈[0..5]），球/洞居格点，
   墙段=格点序列（轴对齐或 45°）。球每步走一个格点增量（8 方向），到达墙点即反弹：
   水平墙（沿 x）翻 vy / 垂直墙（沿 y）翻 vx / 45° 斜墙翻转轴向分解（沿(1,1)向 (dx,dy)->(dy,dx)、
   沿(1,-1)向 (dx,dy)->(-dy,-dx)）；方向不变（贴墙滑）不计反弹。到点即查洞：先入洞后反弹。
   边界四墙恒在（不在 q.walls 内，模拟时按 x/y 贴边自动补）。
   内部墙两两不共点、全部内藏（1..W-1 × 1..H-1）⇒ 单点多取向混合仅可能出现在边界角（翻 vx/vy 可交换）。
   步数上限：8 段反弹（第 9 次变向即止=出界口径）+80 步绝对保险丝。
   §0.39 洞唯一命中：出题即保证所有候选方向中恰 answer 入正确洞（干扰方向入别洞/出界/步上限）；
   verify 侧自带独立反射模拟器对账（禁复用本文件 simShot）。 */
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
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const sameDir = (a, b) => a[0] === b[0] && a[1] === b[1];

/* ---------- 墙段几何（游戏侧实现；verify 侧自带独立实现，禁复用 §0.39） ---------- */
/* 墙段覆盖的格点序列（端点含） */
function wallPoints(w) {
  const sx = Math.sign(w.x2 - w.x1), sy = Math.sign(w.y2 - w.y1);
  const n = Math.max(Math.abs(w.x2 - w.x1), Math.abs(w.y2 - w.y1));
  const pts = [];
  for (let k = 0; k <= n; k++) pts.push([w.x1 + sx * k, w.y1 + sy * k]);
  return pts;
}
/* 墙种类：'H' 水平（沿 x，翻 vy）/ 'V' 垂直（沿 y，翻 vx）/ 'D+' 斜(1,1) / 'D-' 斜(1,-1) */
function wallKind(w) {
  const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
  if (dx === 0) return 'V';
  if (dy === 0) return 'H';
  return (dx > 0) === (dy > 0) ? 'D+' : 'D-';
}
/* 墙点占用表：格点键 -> {k:[墙种类...], w:[墙下标...]}（内部墙两两不共点 ⇒ k/w 至多一对一） */
function buildOcc(walls) {
  const occ = {};
  walls.forEach(function (w, wi) {
    const k = wallKind(w);
    wallPoints(w).forEach(function (p) {
      const key = p[0] + ',' + p[1];
      if (!occ[key]) occ[key] = { k: [], w: [] };
      occ[key].k.push(k);
      occ[key].w.push(wi);
    });
  });
  return occ;
}

/* ---------- 反弹模拟（游戏侧）：occ=buildOcc(walls)；返回
   { pts:[[x,y]...] 逐格点轨迹, outcome:'hole'|'limit'|'out'|'steps', holeIdx, bounces,
     diagHit, bounceIdx:[反弹顶点在 pts 中的下标], hitWalls:{墙下标:true} } ---------- */
function simShot(occ, W, H, ball, dir, holes) {
  let x = ball.x, y = ball.y, dx = dir[0], dy = dir[1];
  const pts = [[x, y]];
  const bounceIdx = [];
  const hitWalls = {};
  let bounces = 0, diagHit = false, fresh = true;
  for (let s = 0; s < MAX_STEPS; s++) {
    if (fresh) {                                    // 到达新格点：先按该点墙向反弹
      const o = occ[x + ',' + y];
      let ndx = dx, ndy = dy, isDiag = false;
      if (x === 0 || x === W) ndx = -ndx;           // 边界左右墙=垂直
      if (y === 0 || y === H) ndy = -ndy;           // 边界上下墙=水平
      if (o) for (let j = 0; j < o.k.length; j++) {
        const kk = o.k[j];
        if (kk === 'H') ndy = -ndy;
        else if (kk === 'V') ndx = -ndx;
        else if (kk === 'D+') { const t = ndx; ndx = ndy; ndy = t; isDiag = true; }
        else { const t = ndx; ndx = -ndy; ndy = -t; isDiag = true; }   // 'D-'
      }
      if (ndx !== dx || ndy !== dy) {                // 贴墙滑（方向不变）不计反弹
        if (o) for (let j = 0; j < o.w.length; j++) hitWalls[o.w[j]] = true;
        if (bounces >= MAX_BOUNCE)                   // 第 9 次变向=出界口径（§0.39 步上限）
          return { pts: pts, outcome: 'limit', holeIdx: -1, bounces: bounces,
            diagHit: diagHit, bounceIdx: bounceIdx, hitWalls: hitWalls };
        bounces++;
        bounceIdx.push(pts.length - 1);
        if (isDiag) diagHit = true;
        dx = ndx; dy = ndy;
      }
      fresh = false;
    }
    x += dx; y += dy;
    if (x < 0 || x > W || y < 0 || y > H)            // 保险丝（边界恒反弹，理论不可达）
      return { pts: pts, outcome: 'out', holeIdx: -1, bounces: bounces,
        diagHit: diagHit, bounceIdx: bounceIdx, hitWalls: hitWalls };
    pts.push([x, y]);
    for (let h = 0; h < holes.length; h++)           // 到点即查洞（先入洞后反弹）
      if (holes[h].x === x && holes[h].y === y)
        return { pts: pts, outcome: 'hole', holeIdx: h, bounces: bounces,
          diagHit: diagHit, bounceIdx: bounceIdx, hitWalls: hitWalls };
    fresh = true;
  }
  return { pts: pts, outcome: 'steps', holeIdx: -1, bounces: bounces,
    diagHit: diagHit, bounceIdx: bounceIdx, hitWalls: hitWalls };
}
/* ---------- 出题配置（章域；ch4 hitNeed=按反弹数动态 min(bounces,2)） ---------- */
const QUIZ_CFG = {
  1: { nAxis: 1, nDiag: 0, nDirs: 2, nHoles: 2, bLo: 1, bHi: 1, hitNeed: 1, diagNeed: false },
  2: { nAxis: 2, nDiag: 0, nDirs: 3, nHoles: 3, bLo: 2, bHi: 2, hitNeed: 2, diagNeed: false },
  3: { nAxis: 2, nDiag: 1, nDirs: 3, nHoles: 3, bLo: 3, bHi: 3, hitNeed: 2, diagNeed: true },
  4: { nAxis: 2, nDiag: 1, nDirs: 3, nHoles: 3, bLo: 1, bHi: 3, hitNeed: 2, diagNeed: false }
};

/* ---------- 墙采样（全部内藏：格点在 1..W-1 × 1..H-1；两两不共点在外层保证） ---------- */
function sampleAxisWall(rnd, W, H) {
  const len = 1 + (rnd() < 0.6 ? 1 : 0);            // 1-2 段（覆盖 2-3 格点）
  if (rnd() < 0.5) {                                // 水平墙
    const y = ri(rnd, 1, H - 1);
    const x1 = ri(rnd, 1, W - 1 - len);
    return { x1: x1, y1: y, x2: x1 + len, y2: y };
  }
  const x = ri(rnd, 1, W - 1);                      // 垂直墙
  const y1 = ri(rnd, 1, H - 1 - len);
  return { x1: x, y1: y1, x2: x, y2: y1 + len };
}
function sampleDiagWall(rnd, W, H) {                // 45° 斜镜面（1-2 段）
  const down = rnd() < 0.5;                         // '\'(x+,y+) 或 '/'(x+,y-)
  const len = 1 + (rnd() < 0.5 ? 1 : 0);
  const x1 = ri(rnd, 1, W - 1 - len);
  const y1 = down ? ri(rnd, 1, H - 1 - len) : ri(rnd, 1 + len, H - 1);
  return { x1: x1, y1: y1, x2: x1 + len, y2: down ? y1 + len : y1 - len };
}

/* ---------- 单题生成（确定性随机搜索）：墙+球+8 向扫描取合规答案方向，
   正确洞放「目标反弹数的射段」上（洞捕获即止 ⇒ 恰 N 段反弹），干扰方向经 §0.39
   唯一命中筛除，干扰洞优先放干扰路径上。
   关键口径：无洞模拟的 bounces=全程反弹数（封闭箱内球持续弹），章级反弹数必须按
   「第 B 次反弹顶点与第 B+1 次之间的射段放洞」来构造——洞放该段 ⇒ 捕获时恰 B 次反弹；
   射段点若在更早路径上出现过（自交）会早捕，须排除。 ---------- */
function genQuiz(dch, rnd) {
  return genQuizWith(dch, rnd, false) || genQuizWith(dch, rnd, true);
}
/* relaxed=true：章形约束全放宽（任意反弹数/内墙命中≥1/2 卡 2 洞），§0.39 不放宽；
   产物标 loose:true（verify 侧视为不达标=响亮信号，理论不可达） */
function genQuizWith(dch, rnd, relaxed) {
  const W = 6, H = 5, C = QUIZ_CFG[dch];
  const nHoles = relaxed ? 2 : (dch === 2 ? 2 + (rnd() < 0.5 ? 1 : 0) : C.nHoles);
  const nDirs = relaxed ? 2 : C.nDirs;
  for (let t = 0; t < 500; t++) {
    /* 墙（两两不共点；relaxed 用 1-2 面轴墙即可成题） */
    const walls = [], wpts = {};
    let bad = false;
    const nAxis = relaxed ? 2 : C.nAxis, nDiag = relaxed ? 0 : C.nDiag;
    for (let i = 0; i < nAxis && !bad; i++) {
      const w = sampleAxisWall(rnd, W, H);
      const ps = wallPoints(w);
      if (ps.some(p => wpts[p[0] + ',' + p[1]])) { bad = true; break; }
      ps.forEach(p => { wpts[p[0] + ',' + p[1]] = true; });
      walls.push(w);
    }
    for (let i = 0; i < nDiag && !bad; i++) {
      const w = sampleDiagWall(rnd, W, H);
      const ps = wallPoints(w);
      if (ps.some(p => wpts[p[0] + ',' + p[1]])) { bad = true; break; }
      ps.forEach(p => { wpts[p[0] + ',' + p[1]] = true; });
      walls.push(w);
    }
    if (bad) continue;
    const occ = buildOcc(walls);
    /* 球起点（内藏非墙点） */
    let ball = null;
    for (let a = 0; a < 24; a++) {
      const bx = ri(rnd, 1, W - 1), by = ri(rnd, 1, H - 1);
      if (!occ[bx + ',' + by]) { ball = { x: bx, y: by }; break; }
    }
    if (!ball) continue;
    /* 答案方向+B：8 向扫描。反弹数域=[bLo, min(bHi, 实际弹数)]（relaxed=[1,8]）；
       前 B 个反弹顶点的内墙命中数+斜墙要求；洞候选=第 B 射段上的内藏非墙非球点
       （排除更早出现过的格点=防自交早捕） */
    const bLo = relaxed ? 1 : C.bLo;
    const bHi = relaxed ? 8 : C.bHi;
    const order = shuffled(DIRS8, rnd);
    let pick = null;
    for (let oi = 0; oi < order.length && !pick; oi++) {
      const d = order[oi];
      const s = simShot(occ, W, H, ball, d, []);
      const bi = s.bounceIdx;
      if (bi.length < bLo) continue;
      const bMax = Math.min(bHi, bi.length);
      for (let B = bLo; B <= bMax; B++) {
        const hitSet = {}; let diagB = false;
        for (let j = 0; j < B; j++) {
          const v = s.pts[bi[j]];
          const o = occ[v[0] + ',' + v[1]];
          if (o) {
            for (let q2 = 0; q2 < o.w.length; q2++) hitSet[o.w[q2]] = true;
            for (let q2 = 0; q2 < o.k.length; q2++)
              if (o.k[q2] === 'D+' || o.k[q2] === 'D-') diagB = true;
          }
        }
        const hits = Object.keys(hitSet).length;
        if (hits < (relaxed ? 1 : (dch === 4 ? Math.min(B, 2) : C.hitNeed))) continue;
        if (!relaxed && C.diagNeed && !diagB) continue;
        const segEnd = bi.length > B ? bi[B] : s.pts.length;   // 第 B+1 次反弹顶点前（排他）
        const seenBefore = {};
        for (let i2 = 0; i2 <= bi[B - 1]; i2++) seenBefore[s.pts[i2][0] + ',' + s.pts[i2][1]] = true;
        const cs = [];
        for (let i2 = bi[B - 1] + 1; i2 < segEnd; i2++) {
          const p = s.pts[i2];
          if (p[0] >= 1 && p[0] <= W - 1 && p[1] >= 1 && p[1] <= H - 1 &&
              !occ[p[0] + ',' + p[1]] && !seenBefore[p[0] + ',' + p[1]] &&
              !(p[0] === ball.x && p[1] === ball.y)) cs.push(p);
        }
        if (!cs.length) continue;
        pick = { d: d, B: B, cs: cs, bvert: s.pts[bi[B - 1]], path: s.pts };
        break;
      }
    }
    if (!pick) continue;
    /* 正确洞：第 B 射段取点（优先离弹点 ≥2 格）；带洞复算恰 B 次反弹（防自交早捕） */
    const pref = pick.cs.filter(p =>
      Math.max(Math.abs(p[0] - pick.bvert[0]), Math.abs(p[1] - pick.bvert[1])) >= 2);
    const pool = pref.length ? pref : pick.cs;
    const hp = pool[Math.floor(rnd() * pool.length)];
    const okHolePos = { x: hp[0], y: hp[1] };
    const chk = simShot(occ, W, H, ball, pick.d, [okHolePos]);
    if (chk.outcome !== 'hole' || chk.bounces !== pick.B) continue;
    /* 干扰方向：不得进正确洞（§0.39 洞唯一命中） */
    const dists = [];
    for (let di = 0; di < DIRS8.length; di++) {
      const d = DIRS8[di];
      if (sameDir(d, pick.d)) continue;
      const s = simShot(occ, W, H, ball, d, [okHolePos]);
      if (s.outcome === 'hole') continue;            // 会进正确洞 → 排除
      dists.push({ d: d, pts: s.pts });
    }
    if (dists.length < nDirs - 1) continue;
    const chosen = shuffled(dists, rnd).slice(0, nDirs - 1);
    /* 干扰洞：优先放干扰路径上（孩子看球入错洞的反馈），不在答案路径上 */
    const ansPts = {};
    pick.path.forEach(p => { ansPts[p[0] + ',' + p[1]] = true; });
    const taken = {};
    taken[okHolePos.x + ',' + okHolePos.y] = true;
    const holes = [okHolePos];
    const dpts = [];
    chosen.forEach(c => c.pts.forEach(p => {
      const k = p[0] + ',' + p[1];
      if (p[0] >= 1 && p[0] <= W - 1 && p[1] >= 1 && p[1] <= H - 1 &&
          !occ[k] && !ansPts[k] && !taken[k] && !(p[0] === ball.x && p[1] === ball.y))
        dpts.push({ x: p[0], y: p[1] });
    }));
    const dsh = shuffled(dpts, rnd);
    for (let i = 0; i < dsh.length && holes.length < nHoles; i++) {
      const k = dsh[i].x + ',' + dsh[i].y;
      if (taken[k]) continue;                       // 多条干扰路径共点：入列环节查重
      taken[k] = true;
      holes.push(dsh[i]);
    }
    let guard2 = 0;                                  // 不足则随机内藏空位补齐
    while (holes.length < nHoles && guard2++ < 60) {
      const x = ri(rnd, 1, W - 1), y = ri(rnd, 1, H - 1), k = x + ',' + y;
      if (occ[k] || ansPts[k] || taken[k] || (x === ball.x && y === ball.y)) continue;
      taken[k] = true;
      holes.push({ x: x, y: y });
    }
    if (holes.length < nHoles) continue;
    /* 终检（§0.39 全量重算）：answer 入正确洞且恰 B 次反弹；干扰可入别洞、禁入正确洞 */
    let okAll = true;
    const finA = simShot(occ, W, H, ball, pick.d, holes);
    if (finA.outcome !== 'hole' || finA.holeIdx !== 0 || finA.bounces !== pick.B) okAll = false;
    for (let i = 0; okAll && i < chosen.length; i++) {
      const s = simShot(occ, W, H, ball, chosen[i].d, holes);
      if (s.outcome === 'hole' && s.holeIdx === 0) okAll = false;
    }
    if (!okAll) continue;
    /* 组装：卡序/洞序随机化 */
    const dirArr = [pick.d].concat(chosen.map(c => c.d));
    const dirs = shuffled(dirArr, rnd);
    let answer = 0;
    for (let i = 0; i < dirs.length; i++) if (sameDir(dirs[i], pick.d)) answer = i;
    const hsh = shuffled(holes, rnd);
    let okHole = 0;
    for (let i = 0; i < hsh.length; i++) if (hsh[i] === okHolePos) okHole = i;
    const quiz = { kind: 'bounce', W: W, H: H,
      ball: { x: ball.x, y: ball.y },
      walls: walls.map(w => ({ x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2 })),
      holes: hsh.map(h => ({ x: h.x, y: h.y })),
      dirs: dirs.map(d => [d[0], d[1]]),
      answer: answer, okHole: okHole, miss: 0, solved: false };
    if (relaxed) quiz.loose = true;
    return quiz;
  }
  return null;   // 不可达双保险；genLevel 侧跳过 null
}

/* 题签名（同关 5 题互异判据）：台面+球+墙+洞+方向全集 */
function quizSig(q) {
  const w = q.walls.map(x => x.x1 + ',' + x.y1 + ',' + x.x2 + ',' + x.y2).sort();
  const h = q.holes.map(x => x.x + ',' + x.y).sort();
  const d = q.dirs.map(x => x[0] + ',' + x[1]).sort();
  return q.W + 'x' + q.H + ':B' + q.ball.x + ',' + q.ball.y +
    ';W' + w.join('|') + ';H' + h.join('|') + ';D' + d.join('|');
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；同关 5 题互异） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 29);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const quizzes = [];
  const seen = {};
  let guard = 0;
  while (quizzes.length < CH_LEN && guard++ < 500) {
    const q = genQuiz(dch, rnd);
    if (!q) continue;
    const sig = quizSig(q);
    if (seen[sig]) continue;                        // 同关互异：撞签名重生成
    seen[sig] = true;
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 作答引擎（无 DOM） ---------- */
/* engTapDir(L, i)：点第 i 张方向卡 → 引擎先按 §0.39 反射真值判定：
   'right'|'done'（入正确洞，step 推进）/ 'wrong'（入错洞/出界/步上限，miss 计一次）
   / null（非法：越界下标、已解题、关已结束） */
function engTapDir(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.dirs.length) return null;
  const occ = buildOcc(q.walls);
  const s = simShot(occ, q.W, q.H, q.ball, q.dirs[i], q.holes);
  if (s.outcome !== 'hole' || s.holeIdx !== q.okHole) {
    q.miss++;
    L.retries++;
    return 'wrong';
  }
  q.solved = true;
  L.step++;
  if (L.step >= L.quizzes.length) L.done = true;
  return L.done ? 'done' : 'right';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（错次口径，零惩罚=可无限重点） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 救援/教学"帮"目标（§3）：正确方向卡下标 → {i}；已解题 → null ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  return { i: q.answer };
}

/* ---------- 结构校验（verify 用）：域/墙形/不共点/洞与球位置（反弹真值由 verify 分源复算） ---------- */
function structOk(q) {
  if (!q || q.kind !== 'bounce') return false;
  if (q.W !== 6 || q.H !== 5) return false;
  if (!q.ball || !Number.isInteger(q.ball.x) || !Number.isInteger(q.ball.y) ||
      q.ball.x < 1 || q.ball.x > q.W - 1 || q.ball.y < 1 || q.ball.y > q.H - 1) return false;
  if (!Array.isArray(q.walls) || q.walls.length < 1 || q.walls.length > 3) return false;
  const occ = {};
  for (let i = 0; i < q.walls.length; i++) {
    const w = q.walls[i];
    if (![w.x1, w.y1, w.x2, w.y2].every(v => Number.isInteger(v))) return false;
    const adx = Math.abs(w.x2 - w.x1), ady = Math.abs(w.y2 - w.y1);
    if (!((w.x2 - w.x1 === 0 && ady >= 1) || (w.y2 - w.y1 === 0 && adx >= 1) ||
          (adx === ady && adx >= 1))) return false;              // 轴对齐或 45°
    for (const p of wallPoints(w)) {
      if (p[0] < 1 || p[0] > q.W - 1 || p[1] < 1 || p[1] > q.H - 1) return false;  // 全内藏
      const k = p[0] + ',' + p[1];
      if (occ[k]) return false;                                  // 墙两两不共点
      occ[k] = true;
    }
  }
  if (occ[q.ball.x + ',' + q.ball.y]) return false;              // 球不在墙上
  if (!Array.isArray(q.holes) || q.holes.length < 2 || q.holes.length > 3) return false;
  const hs = {};
  for (const h of q.holes) {
    if (!Number.isInteger(h.x) || !Number.isInteger(h.y) ||
        h.x < 1 || h.x > q.W - 1 || h.y < 1 || h.y > q.H - 1) return false;
    const k = h.x + ',' + h.y;
    if (occ[k]) return false;                                    // 洞不在墙上
    if (hs[k]) return false;                                     // 洞不重复
    if (h.x === q.ball.x && h.y === q.ball.y) return false;      // 洞不在球点
    hs[k] = true;
  }
  if (!Array.isArray(q.dirs) || q.dirs.length < 2 || q.dirs.length > 3) return false;
  const dseen = {};
  for (const d of q.dirs) {
    if (!DIRS8.some(x => x[0] === d[0] && x[1] === d[1])) return false;   // 8 方向域
    const k = d[0] + ',' + d[1];
    if (dseen[k]) return false;                                  // 方向卡互异
    dseen[k] = true;
  }
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.dirs.length) return false;
  if (!Number.isInteger(q.okHole) || q.okHole < 0 || q.okHole >= q.holes.length) return false;
  return q.miss === 0 && q.solved === false;
}
