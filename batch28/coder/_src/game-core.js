/* ================= coder 纯引擎：确定性关卡生成 + 指令卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 31)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH28 §0.67/§1 + SPEC-R40-CODER §R2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 两步走（3×3）：run dist=2，卡池 2 张，无石头（flat0 题0 教学锚点 dist=1 池=[上] 唯一例外）
     dch2 三步走（3×3）：run dist=3，卡池 3 张，无石头
     dch3 四格大棋盘+预测（4×4）：run dist=4 卡池 4（题序奇数位 +1 张干扰=5）+ 恒 1 石头；
           path 预测题混出（每关 ≥2 path，全 5 翻 1 保混合），path 恒 1 石头，
           seq lv0-1=2（引入坡）/ lv2-4=3（r40 主轴：预测序列加长）
     dch4 大挑战（4×4）：run dist=5 + 石头 1-2 + 奇数位干扰；path seq 恒 3，石头 0-2，混出同 dch3
   生成关（flat≥20）：每关随机章参数 dch=ri(1,4)（先取数保确定性——b25 坑④ verify 钩子直读）。
   r25 M2 判定层单步铁律（SPEC-R40 §R1 论证）：engTapCard 单步原子判定不动，扩容只加长
   原子判定序列（run dist 2-5）与被模拟指令序列（path seq 2-3），无新中间态判定层。
   卡池数学先验（§0.67，出题器即验证——structWhy 同款校验双保险）：
     ① 卡池 = 一条最短路径的指令多重集（dist=曼哈顿距离=步数）± 干扰 1 张（ch3+ 奇数位），
        加入干扰后 DFS 复验「卡池多重集可拼出 ≥1 条合法到达路径」（poolReach）；
     ② 石头不挡死全部路径：至少一条最短路径存活（shortestPaths 非空——卡池步数=dist，
        合法到达路径必为最短路，故最短路存活即全部路径不被挡死）；
     ③ 起终点不相邻（dist≥2 天然满足；flat0 题0 锚点 dist=1 唯一例外）。
   path 题：seq 2-3 步指令（各中间格+落点均界内非石；seq3 约束 d2≠opp(d1) 保中间格2≠起点
   ——「少走一步」陷阱格恒合法在场；d3=−d2 回折落点=中间格1 为合法陷阱态）；
   opts=seq+1 格候选：seq2 3 格=落点+中间格+随机 1 格；seq3 4 格=落点+末段中间格+首段中间格
   （与落点重复则去重）+随机补足（均非 start 非石互异——「少走一步/两步」双陷阱在场）。 */
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

/* ---------- 网格工具（r40：g∈{3,4}——ch1/2 3×3，ch3 起 4×4 大草地；(r,c) r=0 顶行 c=0 左列） ---------- */
const CELLS3 = [], CELLS4 = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
  if (r < 3 && c < 3) CELLS3.push({ r: r, c: c });
  CELLS4.push({ r: r, c: c });
}
const cellsOf = g => g === 4 ? CELLS4 : CELLS3;          // 封闭两档（structWhy 对账 g∈{3,4}）
const inGrid = (p, g) => p.r >= 0 && p.r <= (g || 3) - 1 && p.c >= 0 && p.c <= (g || 3) - 1;
const samePos = (a, b) => !!a && !!b && a.r === b.r && a.c === b.c;
const isStone = (stones, p) => stones.some(s => samePos(s, p));
const distOf = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
const quizKeyOf = q => q.start.r + ',' + q.start.c + '>' + q.goal.r + ',' + q.goal.c;

/* ---------- 全部最短路径枚举（定向 DFS，不回头）：返回存活路径数组（每条=方向序列）
   石头不挡死全部路径 ⟺ 本表非空（合法到达必为 dist 步=最短路——卡池先验） ---------- */
function shortestPaths(start, goal, stones, g) {
  const out = [];
  const walk = (pos, acc) => {
    if (samePos(pos, goal)) { out.push(acc.slice()); return; }
    const moves = [];
    if (goal.r > pos.r) moves.push('down');
    if (goal.r < pos.r) moves.push('up');
    if (goal.c > pos.c) moves.push('right');
    if (goal.c < pos.c) moves.push('left');
    for (let k = 0; k < moves.length; k++) {
      const d = moves[k];
      const nv = { r: pos.r + DIRS[d].dr, c: pos.c + DIRS[d].dc };
      if (!inGrid(nv, g) || isStone(stones, nv)) continue;
      acc.push(d); walk(nv, acc); acc.pop();
    }
  };
  walk({ r: start.r, c: start.c }, []);
  return out;
}

/* ---------- 卡池可达 DFS（structWhy 同款校验）：方向多重集可拼出 ≥1 条合法到达路径
   （到达即停——殊途同达：孩子选对序即可，剩余卡闲置合法） ---------- */
function poolReach(start, goal, stones, dirs, g) {
  const used = dirs.map(() => false);
  const go = pos => {
    if (samePos(pos, goal)) return true;
    for (let i = 0; i < dirs.length; i++) {
      if (used[i]) continue;
      const nv = { r: pos.r + DIRS[dirs[i]].dr, c: pos.c + DIRS[dirs[i]].dc };
      if (!inGrid(nv, g) || isStone(stones, nv)) continue;
      used[i] = true;
      const ok = go(nv);
      used[i] = false;
      if (ok) return true;
    }
    return false;
  };
  return go({ r: start.r, c: start.c });
}

/* ---------- 每关题序表（genLevel 预生成；rnd 同流保确定性）
   r40 阶梯（SPEC §R2）：dch1 dist2 / dch2 dist3 / dch3 run dist4 / dch4 run dist5（dch4 原
   ri(2,3) 取数删除——rnd 流消耗变化=谱更新预期内；dch1/2 分支零 rnd 消耗，锚面不动）
   dch3/dch4 path 混出：掷硬币标 path 题，每关 ≥2 path（全 path 时翻 1 保混合）；
   path seq 由 (dch,lv) 表（pathSeqOf）：dch3 lv0-1=2 引入坡，lv2 起与 dch4 恒 3
   run 干扰位=题序奇数位（qi%2===1，确定性可硬断言——ch3+ 每 run 关 ≥2 干扰位） ---------- */
function specSeqOf(dch, rnd, lv) {
  const seq = [];
  if (dch === 1) {
    for (let qi = 0; qi < CH_LEN; qi++) seq.push({ kind: 'run', dist: 2, stone: 0, distract: false, g: 3 });
    return seq;
  }
  if (dch === 2) {
    for (let qi = 0; qi < CH_LEN; qi++) seq.push({ kind: 'run', dist: 3, stone: 0, distract: false, g: 3 });
    return seq;
  }
  if (dch === 3 || dch === 4) {
    const flags = [];
    for (let qi = 0; qi < CH_LEN; qi++) flags.push(rnd() < 0.5);
    let cnt = flags.filter(Boolean).length;
    if (cnt < 2) {                                        // path 题 <2 → 补足（每关 ≥2）
      for (let i = 0; i < CH_LEN && cnt < 2; i++) if (!flags[i]) { flags[i] = true; cnt++; }
    } else if (cnt === CH_LEN) {                          // 全 path → 翻 1 题 run（保"混合"）
      flags[1] = false;
    }
    for (let qi = 0; qi < CH_LEN; qi++) {
      if (flags[qi]) seq.push({ kind: 'path', stone: dch === 3 ? 1 : ri(rnd, 0, 2),
                                seqN: pathSeqOf(dch, lv), g: 4 });
      else seq.push({ kind: 'run', dist: dch === 3 ? 4 : 5,
                      stone: dch === 3 ? 1 : ri(rnd, 1, 2), distract: qi % 2 === 1, g: 4 });
    }
    return seq;
  }
  return seq;
}

/* ---------- 干扰卡注入（≤8 掷换向，复验可达；全败弃干扰=池=路径多重集仍合法） ---------- */
function tryDistract(start, goal, stones, baseDirs, rnd, g) {
  for (let t = 0; t < 8; t++) {
    const ex = DIR_KEYS[Math.floor(rnd() * 4)];
    if (poolReach(start, goal, stones, baseDirs.concat([ex]), g))
      return { dirs: baseDirs.concat([ex]), distract: true };
  }
  return { dirs: baseDirs, distract: false };
}

/* ---------- 单题构建（r40：spec 携 g/seqN；q.g 全题落盘供 UI/verify 对账） ---------- */
function buildQuiz(spec, dch, rnd, flat, qi, prevQ) {
  /* flat0 题0 教学演示锚点：start(1,1)→goal(0,1) dist=1 卡池=[上]（幽灵手指点「上」卡）——
     r40 唯一 dist=1（教学机制锚面，新 dist 阶梯在 structWhy 显式豁免本题） */
  if (flat === 0 && qi === 0 && spec.kind === 'run') {
    return { kind: 'run', start: { r: 1, c: 1 }, goal: { r: 0, c: 1 }, stones: [],
             pool: [{ id: 'p0', dir: 'up', used: false }], distract: false, g: 3,
             walked: { r: 1, c: 1 }, _miss: 0, _answered: false };
  }

  if (spec.kind === 'run') {
    const g = spec.g || 3, cells = cellsOf(g);
    let q = null;
    for (let t = 0; t < 8 && !q; t++) {
      const start = cells[Math.floor(rnd() * cells.length)];
      const cands = cells.filter(p => distOf(start, p) === spec.dist);
      if (!cands.length) continue;
      const goal = cands[Math.floor(rnd() * cands.length)];
      const key = quizKeyOf({ start: start, goal: goal });
      if (prevQ && quizKeyOf(prevQ) === key && t < 7) continue;      // 相邻题布局互异（末掷兜底放行）
      /* 石头摆放：逐块试放（非起终点），放后须有最短路径存活 */
      const stones = [];
      const freeShuffled = shuffled(cells.filter(p => !samePos(p, start) && !samePos(p, goal)), rnd);
      for (let k = 0; k < freeShuffled.length && stones.length < spec.stone; k++) {
        const trial = stones.concat([freeShuffled[k]]);
        if (shortestPaths(start, goal, trial, g).length) stones.push(freeShuffled[k]);
      }
      if (stones.length < spec.stone) continue;                      // 石头数不足 → 整题重掷
      /* 卡池源：存活最短路随机一条（指令多重集）± 干扰（奇数位，复验可达） */
      const alive = shortestPaths(start, goal, stones, g);
      if (!alive.length) continue;
      const base = alive[Math.floor(rnd() * alive.length)].slice();
      const dk = spec.distract ? tryDistract(start, goal, stones, base, rnd, g)
                               : { dirs: base, distract: false };
      const pool = shuffled(dk.dirs, rnd).map((d, j) => ({ id: 'p' + j, dir: d, used: false }));
      q = { kind: 'run', start: start, goal: goal, stones: stones, pool: pool,
            distract: dk.distract, g: g, walked: { r: start.r, c: start.c },
            _miss: 0, _answered: false };
    }
    if (q) return q;
    /* 兜底（理论不可达）：左上角起点 + 无碰撞布局 + 离路石头 + 干扰复验（r40 阶梯 2-5 全表） */
    const start = { r: 0, c: 0 };
    const goalMap = { 2: { r: 1, c: 1 }, 3: { r: 1, c: 2 }, 4: { r: 2, c: 2 }, 5: { r: 3, c: 2 } };
    const goal = goalMap[spec.dist] || goalMap[2];
    const alive = shortestPaths(start, goal, [], g);
    const onPath = {};
    alive.forEach(p => { let pp = { r: start.r, c: start.c };
      p.forEach(d => { pp = { r: pp.r + DIRS[d].dr, c: pp.c + DIRS[d].dc }; onPath[pp.r + ',' + pp.c] = 1; }); });
    const stones = cellsOf(g).filter(p => !samePos(p, start) && !samePos(p, goal) && !onPath[p.r + ',' + p.c])
                        .slice(0, spec.stone);
    const base = alive[0].slice();
    const dk = spec.distract ? tryDistract(start, goal, stones, base, rnd, g)
                             : { dirs: base, distract: false };
    return { kind: 'run', start: start, goal: goal, stones: stones,
             pool: shuffled(dk.dirs, rnd).map((d, j) => ({ id: 'p' + j, dir: d, used: false })),
             distract: dk.distract, g: g, walked: { r: start.r, c: start.c }, _miss: 0, _answered: false };
  }

  /* ---- path 预测题：seq 2-3 步指令（各中间格界内非石）+ seq+1 格候选（双陷阱在场）
         seq3 生成约束（SPEC §R2）：d2≠opp(d1)（中间格2≠起点——末段陷阱格恒合法）；
         d3 不限（d3=−d2 回折落点=中间格1 为合法陷阱态，候选去重后随机补足） ---- */
  const g = spec.g || 3, cells = cellsOf(g);
  for (let t = 0; t < 8; t++) {
    const start = cells[Math.floor(rnd() * cells.length)];
    const seq = [], walked = [{ r: start.r, c: start.c }];
    let ok = true;
    for (let s = 0; s < spec.seqN && ok; s++) {
      const pool = DIR_KEYS.filter(dk => {
        if (s === 1 && DIRS[dk].dr === -DIRS[seq[0]].dr && DIRS[dk].dc === -DIRS[seq[0]].dc)
          return false;                                              // d2≠opp(d1)（seq3 陷阱格保障）
        const nv = { r: walked[s].r + DIRS[dk].dr, c: walked[s].c + DIRS[dk].dc };
        return inGrid(nv, g);                                        // 中间格/落点界内（石后摆）
      });
      if (!pool.length) { ok = false; break; }
      const d = pool[Math.floor(rnd() * pool.length)];
      seq.push(d);
      walked.push({ r: walked[s].r + DIRS[d].dr, c: walked[s].c + DIRS[d].dc });
    }
    if (!ok) continue;
    const ans = walked[spec.seqN];
    if (samePos(ans, start)) continue;                                // 落点=起点：起终重合歧义，禁
    const key = start.r + ',' + start.c + '>' + ans.r + ',' + ans.c;
    if (prevQ && quizKeyOf(prevQ) === key && t < 7) continue;
    /* 石头：避开 start/seq 各中间格/落点——seq 合法性即保证 */
    const stones = shuffled(cells.filter(p => !walked.some(w => samePos(w, p))), rnd).slice(0, spec.stone);
    /* 候选种子：落点 + 末段中间格 + 首段中间格（seq3；去重）——「少走一步/两步」双陷阱在场 */
    const seeds = [ans, walked[spec.seqN - 1]];
    if (spec.seqN === 3 && !samePos(walked[1], ans)) seeds.push(walked[1]);   // 回折落点=中间格1 去重
    const seedKeys = seeds.map(p => p.r + ',' + p.c);
    /* 随机补足格：非 start/种子/石头格，补到 seq+1 张 */
    const fillPool = cells.filter(p => !samePos(p, start) && !isStone(stones, p) &&
                                       seedKeys.indexOf(p.r + ',' + p.c) < 0);
    if (seeds.length + fillPool.length < spec.seqN + 1) continue;    // 补足不足 → 重掷
    const opts = shuffled(seeds.concat(shuffled(fillPool, rnd).slice(0, spec.seqN + 1 - seeds.length))
                                .map(p => ({ r: p.r, c: p.c })), rnd);
    const answer = opts.findIndex(o => samePos(o, ans));
    return { kind: 'path', start: start, goal: { r: ans.r, c: ans.c }, stones: stones,
             seq: seq, opts: opts, answer: answer, g: g, _miss: 0, _answered: false };
  }
  /* 兜底 path（理论不可达）：右下两步（(0,0)→(0,1)→(1,1)，界内恒成立；石头离路摆放；
     r40：g=4 时落 (0,2) 石离路——两档网格各自合法。
     本兜底固定 seq2/opts3 与 spec.seqN 脱钩（r40 审查 m8）：dch4 恒 seq3 下若真走到此分支，
     产物会被 structWhy 拒绝=红——fail-loud 非静默放行，理论不可达故不设 seqN 感知 */
  const pStart = { r: 0, c: 0 };
  const pStones = spec.stone >= 1 ? [g === 4 ? { r: 3, c: 0 } : { r: 2, c: 0 }] : [];
  if (spec.stone >= 2) pStones.push(g === 4 ? { r: 3, c: 3 } : { r: 2, c: 2 });
  return { kind: 'path', start: pStart, goal: { r: 1, c: 1 }, stones: pStones,
           seq: ['right', 'down'], g: g,
           opts: [{ r: 1, c: 1 }, { r: 0, c: 1 }, { r: 0, c: 2 }], answer: 0,
           _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   生成关 dch 取数前 burn 一掷：mulberry32(flat*7919+31) 首掷对 4 有系统偏差
   （flat20-39 首掷 20 连 0 个 dch4 实测——ch4 型生成关绝迹）；burn 后四型全现
   （实测 2/7/6/5），burn+ri 仍是该 rnd 流固定首个消耗——确定性保持（b25 坑④） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 31);
  if (flat >= STATIC_LEVELS) rnd();                          // burn：首掷偏差修正（仅生成关消耗）
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, lv);                     // r40：lv 入参（path seq 坡表）
  const quizzes = [];
  let prev = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = buildQuiz(specs[qi], dch, rnd, flat, qi, prev);
    quizzes.push(q);
    prev = q;
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, g: specs[0] ? (specs[0].g || 3) : 3,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点指令卡引擎（无 DOM）：engTapCard(L, i) —— 点第 i 张卡（run=pool / path=opts 下标）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'moved' run 执行一步合法但未到达（内部值——autoSolve 逐步依赖）
   'wrong' run 卡池点完未到达（miss+1+复位：小兔回起点卡池全恢复）/ path 点错格（miss+1）
   'false' 撞石头或出界=该卡吞（卡消耗，不记 miss——探索性惩罚豁免）
   null    非法下标 / 已用卡 / 关卡已结束 ---------- */
function engTapCard(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (q.kind === 'path') {
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
  if (!Number.isInteger(i) || i < 0 || i >= q.pool.length) return null;
  const card = q.pool[i];
  if (card.used) return null;                               // 已吞/已用卡=无效点击
  const d = DIRS[card.dir];
  const nv = { r: q.walked.r + d.dr, c: q.walked.c + d.dc };
  if (!inGrid(nv, q.g) || isStone(q.stones, nv)) {
    card.used = true;                                       // 撞石/出界：该卡吞（不记 miss）
    if (q.pool.some(c => !c.used)) return 'false';          // 还剩卡：吞卡探索继续
    q._miss++;                                              // r40 试玩 B1：末卡撞石吞尽=卡尽死锁（池尽/救援无解/儿童无法自救）
    L.retries++;                                            // →与「移动后卡尽」同构 wrong 复位（miss+1+小兔回起点+池全恢复）
    q.walked = { r: q.start.r, c: q.start.c };
    q.pool.forEach(c => { c.used = false; });
    return 'wrong';
  }
  card.used = true;
  q.walked = nv;
  if (samePos(nv, q.goal)) {                                // 到达萝卜即 right（殊途同达合法）
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  if (q.pool.some(c => !c.used)) return 'moved';            // 还剩卡：等下一步指令
  q._miss++;                                                // 卡池尽未到达：wrong+复位重来
  L.retries++;
  q.walked = { r: q.start.r, c: q.start.c };
  q.pool.forEach(c => { c.used = false; });
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.67 口径）：全关 miss 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- run 求解器（DFS 找一条可行到达路径的首步）：教学帮指/答案级救援/autoSolve 共用
   返回应点卡的 pool 下标，无解=-1（撞石吞卡后可能死局——UI 层重走 wrong 复位兜底） ---------- */
function solveNext(q) {
  if (!q || q.kind !== 'run') return -1;
  const n = q.pool.length;
  const mask0 = q.pool.reduce((m, c, i) => m | (c.used ? (1 << i) : 0), 0);
  const go = (pos, mask) => {
    if (samePos(pos, q.goal)) return [];
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) continue;
      const d = DIRS[q.pool[i].dir];
      const nv = { r: pos.r + d.dr, c: pos.c + d.dc };
      if (!inGrid(nv, q.g) || isStone(q.stones, nv)) continue;
      const rest = go(nv, mask | (1 << i));
      if (rest) return [i].concat(rest);
    }
    return null;
  };
  const p = go({ r: q.walked.r, c: q.walked.c }, mask0);
  return p && p.length ? p[0] : -1;
}
/* 当前题应点卡下标（救援/教学帮指/verify 直驱统一入口） */
const correctIdx = q => !q ? -1 : (q.kind === 'path' ? q.answer : solveNext(q));

/* ---------- 结构校验（verify 用，返回失败原因或 null）：方向封闭 / 章型规则 /
   r40 阶梯（dist 2/3/4/5 + g 3/4 + path seq (dch,lv) 表 + opts=seq+1）/
   卡池可达（poolReach 同款 DFS）/ 石头不挡死最短路 / path 落点独立复算 /
   候选格互异非石含末段中间格强干扰 / 相邻题布局互异 / flat0q0 锚点 / 初始态干净 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'q';
  if (q.kind !== 'run' && q.kind !== 'path') return 'kind';
  const g = q.g || 3;
  if (g !== 3 && g !== 4) return 'gsize';                        // r40：网格封闭两档
  if (g !== (dch >= 3 ? 4 : 3)) return 'gCh';                    // ch1/2 3×3 / ch3+ 4×4
  if (!inGrid(q.start, g) || !inGrid(q.goal, g) || samePos(q.start, q.goal)) return 'grid';
  const st = q.stones || [];
  if (st.some(s => !inGrid(s, g) || samePos(s, q.start) || samePos(s, q.goal))) return 'stoneCell';
  if (new Set(st.map(s => s.r + ',' + s.c)).size !== st.length) return 'stoneDup';
  if (dch === 3 && st.length !== 1) return 'stoneN3';            // ch3 恒 1 石头（run/path 同）
  if ((dch === 1 || dch === 2) && st.length !== 0) return 'stoneN0';  // ch1/2 无石头
  if (dch === 4 && st.length > 2) return 'stoneN4';              // ch4 石头 0-2（run 1-2）
  if (q.kind === 'run') {
    const dist = distOf(q.start, q.goal);
    const anchor = flat === 0 && qi === 0;                       // r40：教学锚点=唯一 dist1 豁免位
    if (dch === 1 && dist !== (anchor ? 1 : 2)) return 'dist1';
    if (dch === 2 && dist !== 3) return 'dist2';
    if (dch === 3 && dist !== 4) return 'dist3';
    if (dch === 4 && dist !== 5) return 'dist4';
    if (!q.pool.every(c => DIR_KEYS.indexOf(c.dir) >= 0)) return 'dir';
    if (q.pool.length !== dist && q.pool.length !== dist + 1) return 'poolN';   // 池=dist±干扰 1
    if ((dch === 1 || dch === 2) && q.pool.length !== dist) return 'poolNoDis'; // ch1/2 无干扰
    if (anchor && !(dist === 1 && q.pool.length === 1 &&
        q.pool[0].dir === 'up' && st.length === 0)) return 'anchor';            // 教学演示锚点（点「上」卡）
    if (!shortestPaths(q.start, q.goal, st, g).length) return 'blocked';        // 石头不挡死全部最短路
    if (!poolReach(q.start, q.goal, st, q.pool.map(c => c.dir), g)) return 'unreach';  // 卡池可拼出到达路径
    if (!samePos(q.walked, q.start)) return 'walked';
    if (q.pool.some(c => c.used)) return 'used';
  } else {
    if (dch !== 3 && dch !== 4) return 'pathCh';                 // path 只出现在 ch3/ch4
    const seqN = pathSeqOf(dch, flat % CH_LEN);                  // r40 坡表：dch3 lv0-1=2 其余 3
    if (q.seq.length !== seqN || !q.seq.every(d => DIR_KEYS.indexOf(d) >= 0)) return 'seq';
    let p = { r: q.start.r, c: q.start.c };
    for (let k = 0; k < q.seq.length; k++) {
      p = { r: p.r + DIRS[q.seq[k]].dr, c: p.c + DIRS[q.seq[k]].dc };
      if (!inGrid(p, g) || isStone(st, p)) return 'seqOut';      // 中间格/落点界内非石
    }
    if (!samePos(p, q.goal)) return 'seqGoal';                   // goal=seq 落点（独立复算）
    if (q.opts.length !== q.seq.length + 1) return 'optsN';      // r40：seq2=3 格 / seq3=4 格
    if (!(q.answer >= 0 && q.answer < q.opts.length) || !samePos(q.opts[q.answer], q.goal)) return 'ansIdx';
    if (new Set(q.opts.map(o => o.r + ',' + o.c)).size !== q.opts.length) return 'optsDup';
    if (q.opts.some(o => !inGrid(o, g) || samePos(o, q.start))) return 'optCell';   // 候选格非起点
    if (q.opts.some(o => isStone(st, o))) return 'optStone';                     // 候选格非石（视觉歧义）
    const midLast = { r: p.r - DIRS[q.seq[q.seq.length - 1]].dr,
                      c: p.c - DIRS[q.seq[q.seq.length - 1]].dc };
    if (!q.opts.some(o => samePos(o, midLast))) return 'midMiss';   // 末段中间格强干扰必在场（少走一步陷阱）
  }
  if (prevQ && quizKeyOf(prevQ) === quizKeyOf(q)) return 'adjacent';   // 相邻题布局互异
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
