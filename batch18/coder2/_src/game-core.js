/* ================= coder2 纯引擎：确定性关卡生成 + 指令执行（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   方向编码 dir：0=上 1=右 2=下 3=左（左转=(dir+3)%4，右转=(dir+1)%4）
   重复块单卡语义（SPEC §1）：repN 是单卡，展开时重复其后紧邻的 min(2, 后继数) 条指令 N 次；
   尾部无后继=空块无操作。展开为基本步序列后逐格执行；§0.37 展开后 ≤24 基本步。
   生成路线（先程序后地图）：按章模板出 REF 指令序列 → 无限网格模拟得相对跨幅 →
   加随机 padding 得 3-6 尺寸地图与起点（路径必在界内，零重试）→ 不在路径上的格
   放障碍（ch3 1-2 / ch4 2-3）→ 池=REF 卡+干扰卡 ≤2（恒 ⊇ REF 多重集 ⇒ 池内必可解 §0.37）。
   数据模型：q._prog[]（池索引紧缩序列，点序列指令=移除后继前移）；q._used[i]=卡已入程序。
   引擎纯算 engRun 返回逐帧轨迹与胜负；engCommitRun 提交 miss/推进（UI 动画层与其对账）。 */
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

/* ---------- 方向向量与移动模拟（生成器与游戏执行共用；verify 侧另立 refSim 分源） ---------- */
const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function wallKeySet(q) {
  const s = {};
  for (const w of q.walls) s[w[0] + ',' + w[1]] = 1;
  return s;
}
/* simSteps：从 start 逐步执行基本指令；越界 hit=1 / 撞障碍 hit=2（停在撞前格，末帧 bump 标记）
   path=逐帧轨迹（含起始帧；转向帧与移动帧都记录） */
function simSteps(start, steps, wallSet, W, H) {
  let x = start.x, y = start.y, dir = start.dir;
  const path = [{ x: x, y: y, dir: dir }];
  let hit = 0;
  for (const t of steps) {
    if (t === 'l') dir = (dir + 3) % 4;
    else if (t === 'r') dir = (dir + 1) % 4;
    else {
      const nx = x + DIRV[dir][0], ny = y + DIRV[dir][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) { hit = 1; path.push({ x: x, y: y, dir: dir, bump: true }); break; }
      if (wallSet[nx + ',' + ny]) { hit = 2; path.push({ x: x, y: y, dir: dir, bump: true }); break; }
      x = nx; y = ny;
    }
    path.push({ x: x, y: y, dir: dir });
  }
  return { end: { x: x, y: y, dir: dir }, hit: hit, path: path };
}
/* expandProg：程序类型序列 → 基本指令序列（repN 单卡：重复其后 min(2,后继数) 条 N 次，消耗它们） */
function expandProg(prog) {
  const out = [];
  let i = 0;
  while (i < prog.length) {
    const t = prog[i];
    if (t === 'rep2' || t === 'rep3') {
      const n = t === 'rep2' ? 2 : 3;
      const k = Math.min(2, prog.length - 1 - i);
      const body = prog.slice(i + 1, i + 1 + k);
      for (let r = 0; r < n; r++) out.push.apply(out, body);
      i += 1 + k;
    } else { out.push(t); i++; }
  }
  return out;
}

/* ---------- 章模板（先程序后地图的 REF 来源；turn 镜像 + dir 四向 + 随机 padding 出多样性）
   dch1 纯序列：f×a turn f×b，a+b∈[3,4]
   dch2 一个 rep2：A[rep2,f,t] 半方 / B[f,rep2,f,t]
   dch3 一个 rep3：A[rep3,f,t] 四三方 / B[f,rep3,f,t] / C[f,rep2,f,f] 直线（5 格）
   dch4 生成形：A[repN,f,t] / B[f,rep2,t,f] 之字 / C[t,rep3,f,t] 方形圈 ---------- */
function refPattern(dch, rnd) {
  const turn = rnd() < 0.5 ? 'l' : 'r';
  if (dch === 1) {
    const total = ri(rnd, 3, 4);
    const a = ri(rnd, 1, total - 1), b = total - a;
    const ref = [];
    for (let k = 0; k < a; k++) ref.push('f');
    ref.push(turn);
    for (let k = 0; k < b; k++) ref.push('f');
    return ref;
  }
  if (dch === 2) {
    return ri(rnd, 0, 1) === 0 ? ['rep2', 'f', turn] : ['f', 'rep2', 'f', turn];
  }
  if (dch === 3) {
    /* ch3 恒 rep3（SPEC §1：重复 3 次）——直线型 (f f)×3 跨 7 格超 6×6 地图，不入模板 */
    return ri(rnd, 0, 1) === 0 ? ['rep3', 'f', turn] : ['f', 'rep3', 'f', turn];
  }
  const v = ri(rnd, 0, 2);
  if (v === 0) return [ri(rnd, 0, 1) === 0 ? 'rep2' : 'rep3', 'f', turn];
  if (v === 1) return ['f', 'rep2', turn, 'f'];
  return [turn, 'rep3', 'f', turn];
}

/* ---------- 干扰指令（≤2，SPEC §0.37）：类型不在 REF 内的候选拦洗牌取 n 个
   ch1=1（对面转向卡）/ ch2=1 / ch3=2 / ch4=2；池恒 ⊇ REF ⇒ 池内可解性不受干扰影响 ---------- */
function pickDistracts(dch, rnd, ref) {
  const n = (dch <= 2) ? 1 : 2;
  const inRef = {};
  ref.forEach(t => { inRef[t] = 1; });
  const cands = [];
  if (!inRef.f) cands.push('f');
  if (!inRef.l) cands.push('l');
  if (!inRef.r) cands.push('r');
  if (dch >= 2 && !inRef.rep2) cands.push('rep2');
  if (dch >= 2 && !inRef.rep3) cands.push('rep3');
  if (!cands.length) return [];
  return shuffled(cands, rnd).slice(0, Math.min(n, cands.length));
}

/* ---------- 单题生成（确定性；span 定位保证路径在界内，零重试路径） ---------- */
function genQuiz(dch, rnd) {
  const ref = refPattern(dch, rnd);
  const dir = ri(rnd, 0, 3);
  const steps = expandProg(ref);
  /* 无限网格模拟：相对坐标极值 + 途经格集合 */
  let x = 0, y = 0, d = dir, minX = 0, maxX = 0, minY = 0, maxY = 0;
  const relCells = { '0,0': 1 };
  for (const t of steps) {
    if (t === 'l') d = (d + 3) % 4;
    else if (t === 'r') d = (d + 1) % 4;
    else {
      x += DIRV[d][0]; y += DIRV[d][1];
      relCells[x + ',' + y] = 1;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const spanW = maxX - minX + 1, spanH = maxY - minY + 1;
  const maxPadW = Math.max(0, Math.floor((6 - spanW) / 2)), maxPadH = Math.max(0, Math.floor((6 - spanH) / 2));
  const padL = ri(rnd, 0, maxPadW), padR = ri(rnd, 0, maxPadW);
  const padT = ri(rnd, 0, maxPadH), padB = ri(rnd, 0, maxPadH);
  const W = Math.max(3, spanW + padL + padR), H = Math.max(3, spanH + padT + padB);
  const extraL = W - (spanW + padL + padR), extraT = H - (spanH + padT + padB);
  const start = { x: -minX + padL + extraL, y: -minY + padT + extraT, dir: dir };
  const goal = { x: start.x + x, y: start.y + y };
  /* 路径格集合（平移到真实坐标；start/goal 恒在集合内 ⇒ 障碍避让完整路径） */
  const pathSet = {};
  Object.keys(relCells).forEach(k => {
    const p = k.split(',');
    pathSet[(Number(p[0]) + start.x) + ',' + (Number(p[1]) + start.y)] = 1;
  });
  const nWalls = dch === 1 ? 0 : dch === 2 ? 0 : dch === 3 ? ri(rnd, 1, 2) : ri(rnd, 2, 3);
  const cands = [];
  for (let wy = 0; wy < H; wy++) for (let wx = 0; wx < W; wx++) {
    if (!pathSet[wx + ',' + wy]) cands.push([wx, wy]);
  }
  const walls = shuffled(cands, rnd).slice(0, Math.min(nWalls, cands.length));
  const pool = shuffled(ref.concat(pickDistracts(dch, rnd, ref)), rnd)
    .map(t => ({ t: t }));
  return { kind: 'coder2', W: W, H: H, start: start, goal: goal, walls: walls,
    pool: pool, slots: pool.length, ref: ref,
    _prog: [], _used: pool.map(function () { return false; }),
    miss: 0, solved: false };
}

/* ---------- 手解安全网模板（genLevel 极端防御；verify 侧 REF_FALLBACKS 双写对账） ---------- */
const FALLBACKS = {
  1: { W: 4, H: 3, start: { x: 0, y: 1, dir: 1 }, goal: { x: 2, y: 2 }, walls: [], ref: ['f', 'f', 'r', 'f'] },
  2: { W: 4, H: 4, start: { x: 1, y: 2, dir: 0 }, goal: { x: 0, y: 1 }, walls: [], ref: ['rep2', 'f', 'l'] },
  3: { W: 4, H: 4, start: { x: 2, y: 1, dir: 3 }, goal: { x: 2, y: 2 }, walls: [[0, 0], [3, 0]], ref: ['rep3', 'f', 'l'] },
  4: { W: 5, H: 5, start: { x: 1, y: 1, dir: 1 }, goal: { x: 1, y: 0 }, walls: [[3, 3], [0, 3], [4, 1]], ref: ['f', 'rep2', 'l', 'f'] }
};
function fallbackQuiz(dch) {
  const f = FALLBACKS[dch] || FALLBACKS[1];
  const pool = f.ref.concat(pickDistracts(dch, { next: function () { return 0.9; } }, f.ref))
    .map(t => ({ t: t }));
  return { kind: 'coder2', W: f.W, H: f.H, start: { x: f.start.x, y: f.start.y, dir: f.start.dir },
    goal: { x: f.goal.x, y: f.goal.y },
    walls: f.walls.map(w => [w[0], w[1]]), pool: pool, slots: pool.length, ref: f.ref.slice(),
    _prog: [], _used: pool.map(function () { return false; }), miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；同关 5 题签名互异）
   sig 不含 W/H：地图尺寸差不参与路径=玩法同构（b18 复验实锤 flat2 同构题），按体验互异从严 ---------- */
const sigOf = q => [q.start.x, q.start.y, q.start.dir, q.goal.x, q.goal.y,
  q.walls.map(w => w.join(':')).sort().join('|'), q.pool.map(c => c.t).sort().join('')].join(',');
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);
  const quizzes = [], sigs = {};
  let guard = 0;
  while (quizzes.length < CH_LEN && guard++ < 120) {
    const q = genQuiz(dch, rnd);
    const sig = sigOf(q);
    if (sigs[sig]) continue;
    sigs[sig] = 1;
    quizzes.push(q);
  }
  while (quizzes.length < CH_LEN) quizzes.push(fallbackQuiz(dch));   // 不可达防御
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 指令编排引擎（无 DOM）：点池卡入程序 / 点程序卡退回 ---------- */
/* engTapPool(L,i)：点池中第 i 张卡 → 追加到程序序列末尾；返回 'placed'，
   非法（越界/已用/关已结束/嵌套循环）→ null。放卡=探索不计 miss 不重置救援钟（§0.7a）
   嵌套拦截（审查 F2）：rep 卡的前 1-2 位存在 rep 卡=将落入其重复作用域——
   展开（重复其后 min(2,后继) 条）会让内层 rep 被当作前进执行，卡面语义失真，
   故放置期直接阻止（玩家排不出嵌套程序，expandProg 恒见平坦序列） */
function engTapPool(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.pool.length) return null;
  if (q._used[i]) return null;
  if (q._prog.length >= q.slots) return null;
  const t = q.pool[i].t;
  if (t === 'rep2' || t === 'rep3') {
    const n = q._prog.length;
    for (let k = n - 1; k >= n - 2 && k >= 0; k--) {
      const pt = q.pool[q._prog[k]].t;
      if (pt === 'rep2' || pt === 'rep3') return null;
    }
  }
  q._used[i] = true;
  q._prog.push(i);
  return 'placed';
}
/* engTapProg(L,j)：点程序序列第 j 指令=退回池（后继前移紧缩）→ 返回新程序长度；
   非法下标/空位 → null。退回=探索不计 miss 不重置救援钟（§0.7a） */
function engTapProg(L, j) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q._prog.length) return null;
  q._used[q._prog[j]] = false;
  q._prog.splice(j, 1);
  return q._prog.length;
}
/* 空闲池中第一个类型 t 的卡（教学演示/帮/救援/autoSolve 共用） */
function freePoolFor(q, t) {
  for (let i = 0; i < q.pool.length; i++) if (!q._used[i] && q.pool[i].t === t) return i;
  return -1;
}
/* engRun(L)：纯算执行当前程序 → {types,steps,frames,end,hit,win}（UI 逐帧动画对账用）；
   空程序/已解题/关尾 → null */
function engRun(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q._prog.length === 0) return null;
  const types = q._prog.map(i => q.pool[i].t);
  const steps = expandProg(types);
  const sim = simSteps(q.start, steps, wallKeySet(q), q.W, q.H);
  const win = sim.hit === 0 && sim.end.x === q.goal.x && sim.end.y === q.goal.y;
  return { types: types, steps: steps, frames: sim.path, end: sim.end, hit: sim.hit, win: win };
}
/* engCommitRun(L,plan)：提交运行结果。win → solved+推进，返回 'right'/'done'；
   未达（含撞墙/出界）→ miss/retries 各 +1 返回 'wall'/'short'（错次口径 §1：运行未达=1 错） */
function engCommitRun(L, plan) {
  const q = L.quizzes[L.step];
  if (plan.win) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;
  return plan.hit > 0 ? 'wall' : 'short';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（运行未达口径，退回不计，永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 救援/教学"帮"目标（§1：目标格 breathe+首条应放指令卡 pulse 的目标计算）
   程序序列与 REF 逐位比对：首个不一致处之前已一致——
   该位有错卡 → {act:'undo', j}（先退回）；空 → {act:'prog', i}（点应放的池卡）；
   程序已是 REF 前缀 → {act:'run'}（指运行按钮）；已解题 → null。
   池 ⊇ REF 多重集 ⇒ 所需卡必有空闲（数学保证，见注释收敛性） ---------- */
function rescueTarget(q) {
  if (!q || q.solved) return null;
  const cur = q._prog.map(i => q.pool[i].t);
  for (let j = 0; j < q.ref.length; j++) {
    if (j >= cur.length) {
      const i = freePoolFor(q, q.ref[j]);
      if (i >= 0) return { act: 'prog', i: i, j: j };
      return { act: 'undo', j: cur.length - 1 };
    }
    if (cur[j] !== q.ref[j]) return { act: 'undo', j: j };
  }
  /* REF 前缀一致但尾长超出（审查 M1）：多余尾卡会让运行多走必 miss——先退回尾卡 */
  if (cur.length > q.ref.length) return { act: 'undo', j: cur.length - 1 };
  return { act: 'run' };
}

/* ---------- 结构校验（verify 用）：地图域+池约束（可解性由 verify 侧 refSim 分源复算） ---------- */
function structOk(q) {
  if (!q || q.kind !== 'coder2') return false;
  if (!(q.W >= 3 && q.W <= 6 && q.H >= 3 && q.H <= 6)) return false;
  const inB = p => p.x >= 0 && p.y >= 0 && p.x < q.W && p.y < q.H;
  if (!inB(q.start) || !inB(q.goal)) return false;
  if (q.start.dir == null || Math.floor(q.start.dir) !== q.start.dir || q.start.dir < 0 || q.start.dir > 3) return false;
  if (q.start.x === q.goal.x && q.start.y === q.goal.y) return false;
  if (!Array.isArray(q.walls) || q.walls.some(w => !inB({ x: w[0], y: w[1] }))) return false;
  if (q.walls.some(w => (w[0] === q.start.x && w[1] === q.start.y) ||
                        (w[0] === q.goal.x && w[1] === q.goal.y))) return false;
  if (!Array.isArray(q.pool) || q.pool.some(c => !INSTR_TEXT[c.t])) return false;
  if (q.slots !== q.pool.length) return false;
  return true;
}
