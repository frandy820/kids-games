/* ================= grid 纯引擎（r13：8×8 相对导航版——无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）；
   生成关 flat≥20 难度章 dch=ri(rnd,1,4)（首抽——Python verify 独立 mulberry32 复刻对账）。
   章型（SPEC-BATCH13 §3 r13 真值现行版）：
     dch1 exec1：qi0 热身 [fwd1,T]；qi1-4 seq=2 移动命令+T，0 墙 1 箱，句 ≤14 字
     dch2 exec2：qi0 热身 exec1 型（1 移动命令）；qi1-4 seq=3 移动命令+T，墙 0-2 离路径，句 ≤20 字
     dch3 plan ：qi0 热身 exec 型；qi1-4 自由规划依序 2 箱，墙 2-4
     dch4 maze ：qi0 热身 plan 型 1 箱；qi1-4 依序 3 箱，墙 6-10，含死端格+绕行段
   朝向状态机：N/E/S/W；左转 N→W→S→E→N（TURN_L），右转反向；fwd 沿朝向走（遇界/墙=bump
   不移动零惩罚不计 miss——§0.7a 物理探索口径）；L/R 改朝向不动步；T=到访拿宝箱。
   多目标依序：站 next 宝箱+T=收集（撤销栈清空=检查点）；站未来宝箱+T='order' 错序 miss+
   方向级反馈不罚死；非宝箱格+T='nope' 探索不罚。全序收集完=该题完成。
   撤销：LIFO 回退上一原子动作（fwd 回一格不退步数/转向反转/exec 同步回卷指令条）；
   T 后栈清空（已收集不可撤销）；空栈=null 摇晃反馈。步数 _steps=累计前进格数只增不减。 */
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
const inGrid = (r, c) => r >= 1 && r <= GRID_N && c >= 1 && c <= GRID_N;
const wallKey = (r, c) => r * 8 + c;

/* ---------- BFS：最短步数（-1=不可达）；扩展序=DIRS 固定（确定性） ---------- */
function engBfs(from, to, walls) {
  const wl = new Set(walls.map(w => wallKey(w.r, w.c)));
  const dist = {};
  dist[wallKey(from.r, from.c)] = 0;
  let q = [{ r: from.r, c: from.c }], head = 0;
  while (head < q.length) {
    const p = q[head++];
    const d0 = dist[wallKey(p.r, p.c)];
    if (p.r === to.r && p.c === to.c) return d0;
    for (let k = 0; k < 4; k++) {
      const dd = DIR_D[DIRS[k]], nr = p.r + dd[0], nc = p.c + dd[1];
      if (!inGrid(nr, nc) || wl.has(wallKey(nr, nc))) continue;
      const key = wallKey(nr, nc);
      if (dist[key] != null) continue;
      dist[key] = d0 + 1;
      q.push({ r: nr, c: nc });
    }
  }
  return -1;
}
/* 沿朝向最多可走几格（fwd 指令生成用；cap=3 指令格数上限） */
function engClearAhead(pos, h, walls, cap) {
  const d = DELTA_H[h], wl = new Set(walls.map(w => wallKey(w.r, w.c)));
  let n = 0;
  for (let k = 1; k <= cap; k++) {
    const nr = pos.r + d[0] * k, nc = pos.c + d[1] * k;
    if (!inGrid(nr, nc) || wl.has(wallKey(nr, nc))) break;
    n = k;
  }
  return n;
}
/* 全对执行指令序列（exec 题自证/verify 独立复算共用语义）；遇界/墙=null */
function engRunSeq(start, h0, seq, walls) {
  let r = start.r, c = start.c, h = h0;
  const wl = new Set(walls.map(w => wallKey(w.r, w.c)));
  for (let i = 0; i < seq.length; i++) {
    const cm = seq[i];
    if (cm.t === 'L') h = TURN_L[h];
    else if (cm.t === 'R') h = TURN_R[h];
    else if (cm.t === 'fwd') {
      const d = DELTA_H[h];
      for (let k = 0; k < cm.n; k++) {
        r += d[0]; c += d[1];
        if (!inGrid(r, c) || wl.has(wallKey(r, c))) return null;
      }
    }
  }
  return { r: r, c: c, h: h };
}
/* 参考指令序列（plan/maze autoSolve+时长模型）：逐段 BFS 绝对路径 → 相对指令；
   连续同向步合并为 fwd n；转向沿路取单次 90°（反向=两次同侧转）；段尾 T。
   BFS 首父回溯确定性（扩展序 DIRS 固定）。无路=null */
function engPlanRef(q) {
  const wl = new Set(q.walls.map(w => wallKey(w.r, w.c)));
  const seq = [];
  let pr = q.fr, pc = q.fc, h = q.h0;
  for (let ci = 0; ci < q.chests.length; ci++) {
    const to = q.chests[ci];
    if (pr === to.r && pc === to.c) { seq.push({ t: 'T' }); continue; }   /* 已站目标：段仅 T
                                                           （BFS 起点即目标不触发扩展会误判无路） */
    const prev = {}, dist = {};
    const fk = wallKey(pr, pc);
    dist[fk] = 0;
    let qu = [{ r: pr, c: pc }], head = 0, found = false;
    while (head < qu.length && !found) {
      const p = qu[head++];
      const d0 = dist[wallKey(p.r, p.c)];
      for (let k = 0; k < 4; k++) {
        const dd = DIR_D[DIRS[k]], nr = p.r + dd[0], nc = p.c + dd[1];
        if (!inGrid(nr, nc) || wl.has(wallKey(nr, nc))) continue;
        const key = wallKey(nr, nc);
        if (dist[key] != null) continue;
        dist[key] = d0 + 1;
        prev[key] = { fk: wallKey(p.r, p.c), h: DIRS[k] === 'up' ? 'N' : DIRS[k] === 'down' ? 'S'
          : DIRS[k] === 'left' ? 'W' : 'E' };
        if (nr === to.r && nc === to.c) { found = true; break; }
        qu.push({ r: nr, c: nc });
      }
    }
    if (!found) return null;
    /* 回溯绝对朝向步序列（起点→宝箱） */
    const dirs = [];
    let key = wallKey(to.r, to.c);
    while (key !== fk) {
      const st = prev[key];
      if (!st) return null;
      dirs.unshift(st.h);
      key = st.fk;
    }
    /* 相对化：连续同向合并 fwd n；对齐朝向再计步 */
    let run = 0, lastDir = null;
    for (let i = 0; i < dirs.length; i++) {
      const want = dirs[i];
      if (want !== lastDir && run > 0) { seq.push({ t: 'fwd', n: run }); run = 0; }
      while (h !== want) {                     /* 单次 90° 或反向两次同侧 */
        if (TURN_L[h] === want || TURN_L[TURN_L[h]] === want) { seq.push({ t: 'L' }); h = TURN_L[h]; }
        else { seq.push({ t: 'R' }); h = TURN_R[h]; }
      }
      run++;
      lastDir = want;
      pr += DELTA_H[want][0]; pc += DELTA_H[want][1];
    }
    if (run > 0) seq.push({ t: 'fwd', n: run });
    seq.push({ t: 'T' });
  }
  return seq;
}
/* 最短总格数（依序分段 BFS 之和——「最短 Y 步」基准与 optFwd 对账） */
function engOptFwd(q) {
  let s = 0, ar = q.fr, ac = q.fc;
  for (let i = 0; i < q.chests.length; i++) {
    const d = engBfs({ r: ar, c: ac }, { r: q.chests[i].r, c: q.chests[i].c }, q.walls);
    if (d < 0) return -1;
    s += d;
    ar = q.chests[i].r; ac = q.chests[i].c;
  }
  return s;
}
/* 死端格判定（maze 结构断言）：可达自由格、4 邻自由度=1、非起点/宝箱、距起点 ≥2 */
function engDeadEnds(q) {
  const wl = new Set(q.walls.map(w => wallKey(w.r, w.c)));
  const chestKeys = new Set(q.chests.map(ch => wallKey(ch.r, ch.c)));
  const out = [];
  for (let r = 1; r <= GRID_N; r++) for (let c = 1; c <= GRID_N; c++) {
    const k = wallKey(r, c);
    if (wl.has(k) || (r === q.fr && c === q.fc) || chestKeys.has(k)) continue;
    let deg = 0;
    for (const h of HEADS) {
      const nr = r + DELTA_H[h][0], nc = c + DELTA_H[h][1];
      if (inGrid(nr, nc) && !wl.has(wallKey(nr, nc))) deg++;
    }
    if (deg === 1 && engBfs({ r: q.fr, c: q.fc }, { r: r, c: c }, q.walls) >= 2) out.push({ r: r, c: c });
  }
  return out;
}
/* 绕行段判定（maze）：某依序分段 BFS 距离 > 曼哈顿距离（墙强制非单调路径） */
function engDetour(q) {
  let ar = q.fr, ac = q.fc;
  for (let i = 0; i < q.chests.length; i++) {
    const d = engBfs({ r: ar, c: ac }, { r: q.chests[i].r, c: q.chests[i].c }, q.walls);
    if (d > Math.abs(ar - q.chests[i].r) + Math.abs(ac - q.chests[i].c)) return true;
    ar = q.chests[i].r; ac = q.chests[i].c;
  }
  return false;
}

/* ---------- 单题生成（rnd 同流保证确定性；last=上一题 (start,首箱) 互异键） ---------- */
function genExec(rnd, last, mvLo, mvHi, nWall, cap, warm) {
  for (let t = 0; t < 80; t++) {
    let pr = ri(rnd, 1, GRID_N), pc = ri(rnd, 1, GRID_N);
    let h = HEADS[ri(rnd, 0, 3)];
    const fr = pr, fc = pc, h0 = h;
    const seq = [], path = [wallKey(fr, fc)];
    let ok = true;
    const nmv = warm ? 1 : ri(rnd, mvLo, mvHi);
    for (let i = 0; i < nmv; i++) {
      let placed = false;
      for (let tt = 0; tt < 12 && !placed; tt++) {
        if (i === nmv - 1 || rnd() < 0.55) {              /* 末命令偏向前进（保证离开起点） */
          const n = engClearAhead({ r: pr, c: pc }, h, [], warm ? 1 : 3);
          if (n > 0) {
            const nn = warm ? 1 : ri(rnd, 1, n);
            seq.push({ t: 'fwd', n: nn });
            for (let k = 0; k < nn; k++) {
              pr += DELTA_H[h][0]; pc += DELTA_H[h][1];
              path.push(wallKey(pr, pc));
            }
            placed = true;
          }
        } else {
          const turn = rnd() < 0.5 ? 'L' : 'R';
          seq.push({ t: turn });
          h = turn === 'L' ? TURN_L[h] : TURN_R[h];
          placed = true;
        }
      }
      if (!placed) { ok = false; break; }
    }
    if (!ok || (pr === fr && pc === fc)) continue;        /* 宝箱=终点格，禁与起点重合 */
    seq.push({ t: 'T' });
    if (sentenceOf({ seq: seq }).length > cap) continue;  /* 句长 cap（voiceWin≤DECIDE 托底） */
    if (last && last[0] === wallKey(fr, fc) && last[1] === wallKey(pr, pc)) continue;
    let walls = [];
    if (nWall > 0) {                                      /* exec2 离路径干扰墙（不压路径/端点） */
      const cand = [];
      for (let r = 1; r <= GRID_N; r++) for (let c = 1; c <= GRID_N; c++) {
        const k = wallKey(r, c);
        if (path.indexOf(k) < 0 && !(r === fr && c === fc) && !(r === pr && c === pc)) cand.push({ r: r, c: c });
      }
      walls = shuffled(cand, rnd).slice(0, nWall);
    }
    return mkExec(cap === CAP_EXEC1 ? 'exec1' : 'exec2', fr, fc, h0, pr, pc, seq, walls);
  }
  /* 兜底模板（静态板面；80 次随机全败概率极低，确定性保 verify） */
  return cap === CAP_EXEC1
    ? mkExec('exec1', 1, 1, 'N', 1, 3, [{ t: 'R' }, { t: 'fwd', n: 2 }, { t: 'T' }], [])
    : mkExec('exec2', 3, 3, 'S', 8, 3, [{ t: 'fwd', n: 3 }, { t: 'fwd', n: 2 }, { t: 'T' }], [{ r: 6, c: 2 }]);
}
function mkExec(kind, fr, fc, h0, tr, tc, seq, walls) {
  return { kind: kind, fr: fr, fc: fc, h0: h0, chests: [{ r: tr, c: tc }], seq: seq,
           walls: walls, opt: engOptFwd({ fr: fr, fc: fc, chests: [{ r: tr, c: tc }], walls: walls }),
           _pr: fr, _pc: fc, _h: h0, _si: 0, _fn: seq[0].t === 'fwd' ? seq[0].n : 0,
           _col: 0, _steps: 0, _miss: 0, _stack: [] };
}
function genPlan(rnd, last, nChest, wLo, wHi, maze) {
  for (let t = 0; t < 80; t++) {
    const fr = ri(rnd, 1, GRID_N), fc = ri(rnd, 1, GRID_N);
    const cand = [];
    for (let r = 1; r <= GRID_N; r++) for (let c = 1; c <= GRID_N; c++)
      if (!(r === fr && c === fc)) cand.push({ r: r, c: c });
    const walls = shuffled(cand, rnd).slice(0, ri(rnd, wLo, wHi));
    const wl = new Set(walls.map(w => wallKey(w.r, w.c)));
    const chests = [];
    let ar = fr, ac = fc, ok = true;
    for (let k = 0; k < nChest; k++) {
      let got = null;
      for (let tt = 0; tt < 24 && !got; tt++) {
        const r = ri(rnd, 1, GRID_N), c = ri(rnd, 1, GRID_N), kk = wallKey(r, c);
        if (wl.has(kk) || (r === fr && c === fc)) continue;
        if (chests.some(ch => Math.abs(ch.r - r) + Math.abs(ch.c - c) < 2)) continue;
        if (Math.abs(fr - r) + Math.abs(fc - c) < 2) continue;
        if (engBfs({ r: ar, c: ac }, { r: r, c: c }, walls) < 2) continue;   /* 段距 ≥2 非平凡 */
        got = { r: r, c: c };
      }
      if (!got) { ok = false; break; }
      chests.push(got);
      ar = got.r; ac = got.c;
    }
    if (!ok) continue;
    const h0 = HEADS[ri(rnd, 0, 3)];
    if (maze) {                                            /* maze 双结构断言：死端格+绕行段 */
      if (!engDeadEnds({ fr: fr, fc: fc, chests: chests, walls: walls }).length) continue;
      if (!engDetour({ fr: fr, fc: fc, chests: chests, walls: walls })) continue;
    }
    if (last && last[0] === wallKey(fr, fc) && last[1] === wallKey(chests[0].r, chests[0].c)) continue;
    return mkPlan(maze ? 'maze' : 'plan', fr, fc, h0, chests, walls);
  }
  /* 兜底模板（静态板面，BFS/死路/绕行均原型验算；参考解动态生成） */
  return maze
    ? mkPlan('maze', 3, 6, 'S',
             [{ r: 8, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 5 }],
             [{ r: 2, c: 3 }, { r: 4, c: 2 }, { r: 4, c: 8 }, { r: 2, c: 7 },
              { r: 5, c: 6 }, { r: 5, c: 1 }, { r: 4, c: 4 }, { r: 6, c: 2 }])
    : mkPlan('plan', 8, 6, 'S', [{ r: 5, c: 1 }, { r: 2, c: 4 }], [{ r: 5, c: 6 }, { r: 8, c: 2 }]);
}
function mkPlan(kind, fr, fc, h0, chests, walls) {
  const q = { kind: kind, fr: fr, fc: fc, h0: h0, chests: chests, seq: [], walls: walls,
              opt: 0, _pr: fr, _pc: fc, _h: h0, _si: 0, _fn: 0, _col: 0, _steps: 0, _miss: 0, _stack: [] };
  q.seq = engPlanRef(q);                                   /* 参考解（autoSolve/时长模型） */
  q.opt = engOptFwd(q);
  return q;
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // 生成关随机章参数（首抽保确定性）
  const quizzes = [];
  let last = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    let q;
    if (dch === 1) q = genExec(rnd, last, 2, 2, 0, CAP_EXEC1, qi === 0);
    else if (dch === 2) q = qi === 0 ? genExec(rnd, last, 1, 1, 0, CAP_EXEC1, true)
                                     : genExec(rnd, last, 2, 3, ri(rnd, 0, 2), CAP_EXEC2, false);
    else if (dch === 3) q = qi === 0 ? genExec(rnd, last, 1, 2, 0, CAP_EXEC1, false)
                                     : genPlan(rnd, last, 2, 2, 4, false);
    else q = qi === 0 ? genPlan(rnd, last, 1, 2, 4, false)
                      : genPlan(rnd, last, 3, 6, 10, true);
    last = [wallKey(q.fr, q.fc), wallKey(q.chests[0].r, q.chests[0].c)];
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 指令引擎（pad 主路径）：engCmd(L, c) —— c='fwd'|'L'|'R'|'T'
   exec 章（指令任务）：指令条高亮当前命令，错配='wrong' miss（晃动可重点零惩罚）；
     fwd 命令期撞界/墙='bump'（不移动零惩罚不计 miss，指令不推进——§0.7a 物理探索）。
   plan/maze 章（自由规划）：任意合法动作放行；T 站 next 箱='take'（终箱='goal'/'done'），
     站未来箱='order'（miss+方向级反馈不罚死），非箱格='nope'（探索不罚）。
   返回：'step' 前进一格 / 'turn' 转向 / 'take' 到访非终箱 / 'goal' 终箱收集（本题完成）
     / 'done' 末题终箱（本关通关）/ 'bump' / 'wrong' / 'order' / 'nope'
     / null 非本期·非法指令·已锁态 ---------- */
function engCmd(L, c) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  if (c !== 'fwd' && c !== 'L' && c !== 'R' && c !== 'T') return null;
  const q = L.quizzes[L.step];
  const isExec = q.kind === 'exec1' || q.kind === 'exec2';
  if (isExec) {
    const act = q.seq[q._si];
    if (!act) return null;
    /* 指令错配判定：非当前命令类型的按键=wrong（miss 晃动零惩罚可重点） */
    if ((act.t === 'fwd' && c !== 'fwd') || (act.t === 'L' && c !== 'L') ||
        (act.t === 'R' && c !== 'R') || (act.t === 'T' && c !== 'T')) {
      q._miss++;
      L.retries++;
      return 'wrong';
    }
    if (c === 'fwd') {                                     /* fwd 命令逐格执行 */
      const d = DELTA_H[q._h], nr = q._pr + d[0], nc = q._pc + d[1];
      if (!inGrid(nr, nc) || q.walls.some(w => w.r === nr && w.c === nc)) {
        L.retries++;                                       /* bump=探索：不计 miss（§0.7a） */
        return 'bump';
      }
      q._pr = nr; q._pc = nc; q._steps++;
      q._stack.push({ k: 'fwd' });
      q._fn--;
      if (q._fn <= 0) { q._si++; q._fn = q.seq[q._si] && q.seq[q._si].t === 'fwd' ? q.seq[q._si].n : 0; }
      return 'step';
    }
    if (c === 'T') {                                       /* 到访=末命令；指令全对执行必达箱 */
      if (q._pr !== q.chests[q._col].r || q._pc !== q.chests[q._col].c) return null;  /* 防御层：指令带不变式破缺 */
      q._col++;
      q._stack = [];                                       /* 检查点：撤销栈清空 */
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return L.done ? 'done' : 'goal';
    }
    q._h = c === 'L' ? TURN_L[q._h] : TURN_R[q._h];        /* 转向：改朝向不动步 */
    q._stack.push({ k: c });
    q._si++;
    q._fn = q.seq[q._si] && q.seq[q._si].t === 'fwd' ? q.seq[q._si].n : 0;
    return 'turn';
  }
  /* ---- plan/maze 自由规划 ---- */
  if (c === 'fwd') {
    const d = DELTA_H[q._h], nr = q._pr + d[0], nc = q._pc + d[1];
    if (!inGrid(nr, nc) || q.walls.some(w => w.r === nr && w.c === nc)) {
      L.retries++;
      return 'bump';
    }
    q._pr = nr; q._pc = nc; q._steps++;
    q._stack.push({ k: 'fwd' });
    return 'step';
  }
  if (c === 'L' || c === 'R') {
    q._h = c === 'L' ? TURN_L[q._h] : TURN_R[q._h];
    q._stack.push({ k: c });
    return 'turn';
  }
  /* T：站 next 箱=收集；站未来箱=错序 miss 方向级反馈；非箱格=探索不罚 */
  const nx = q.chests[q._col];
  if (q._pr === nx.r && q._pc === nx.c) {
    q._col++;
    q._stack = [];
    if (q._col >= q.chests.length) {
      L.step++;
      if (L.step >= L.quizzes.length) L.done = true;
      return L.done ? 'done' : 'goal';
    }
    return 'take';
  }
  const fut = q.chests.findIndex((ch, i) => i > q._col && ch.r === q._pr && ch.c === q._pc);
  if (fut >= 0) {
    q._miss++;                                             /* 错序=主动认领错序号：miss 不罚死 */
    L.retries++;
    return 'order';
  }
  return 'nope';                                           /* 非箱格 T=探索轻反馈 */
}

/* ---------- 撤销引擎：engUndo(L) —— LIFO 回退上一原子动作
   fwd→回一格（朝向不变；步数不减=错步留痕「最少步意识」）；L/R→反转朝向；
   exec 同步回卷指令条（_si/_fn 与动作带一致）；T 已清栈=空栈 null。
   'undo' 成功 / null 空栈·终态（UI 摇晃轻反馈；retries 计统计不进 miss） ---------- */
function engUndo(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  const st = q._stack.pop();
  if (!st) return null;
  if (st.k === 'fwd') {
    const d = DELTA_H[q._h];                               /* 栈上无未回退转向→朝向即当时朝向 */
    q._pr -= d[0]; q._pc -= d[1];
    if (q.kind === 'exec1' || q.kind === 'exec2') {        /* 指令条回卷 */
      if (q._fn > 0) q._fn++;
      else {
        q._si--;
        q._fn = q.seq[q._si].t === 'fwd' ? 1 : 0;
      }
    }
  } else {
    q._h = st.k === 'L' ? TURN_R[q._h] : TURN_L[q._h];
    if (q.kind === 'exec1' || q.kind === 'exec2') { q._si--; q._fn = 0; }
  }
  L.retries++;                                             /* 统计试探；不计 miss（探索） */
  return 'undo';
}

const engWon = L => !!L && L.done;
/* 星级：按真错点（exec 指令错配 + plan/maze 错序 take；bump/撤销/非箱格 T 不计）。
   零错点=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星（§0.14）。retries 仅统计不进星级 */
const engStars = L => {
  const m = L.quizzes.reduce((s, q) => s + (q._miss || 0), 0);
  return m === 0 ? 3 : (m <= 2 ? 2 : 1);
};

/* ---------- 结构校验（verify 用）：按题型分支，返回具体失败原因便于审计 ---------- */
function structWhy(q) {
  if (!q) return 'null';
  if (['exec1', 'exec2', 'plan', 'maze'].indexOf(q.kind) < 0) return 'kind';
  if (!inGrid(q.fr, q.fc) || q.h0 == null || HEADS.indexOf(q.h0) < 0) return 'range';
  if (q.walls.some(w => !inGrid(w.r, w.c))) return 'wallRange';
  const wallSeen = new Set();
  if (!q.walls.every(w => { const k = wallKey(w.r, w.c); if (wallSeen.has(k)) return false; wallSeen.add(k); return true; })) return 'wallDup';
  const chestCount = q.kind === 'exec1' || q.kind === 'exec2' ? 1 : (q.kind === 'plan' ? -1 : 3);
  if (q.kind === 'plan' && (q.chests.length < 1 || q.chests.length > 2)) return 'chestCount';
  if (chestCount > 0 && q.chests.length !== chestCount) return 'chestCount';
  if (q.chests.some(ch => !inGrid(ch.r, ch.c))) return 'chestRange';
  if (q.chests.some(ch => ch.r === q.fr && ch.c === q.fc)) return 'chestOnStart';
  if (q.chests.some((ch, i) => q.chests.some((ch2, j) => i < j &&
      Math.abs(ch.r - ch2.r) + Math.abs(ch.c - ch2.c) < 2))) return 'chestAdj';
  if (q.walls.some(w => (w.r === q.fr && w.c === q.fc) ||
      q.chests.some(ch => ch.r === w.r && ch.c === w.c))) return 'wallOnEnd';
  const nw = q.walls.length;
  if (q.kind === 'exec1' && nw !== 0) return 'wallN';
  if (q.kind === 'exec2' && (nw < 0 || nw > 2)) return 'wallN';
  if (q.kind === 'plan' && (nw < 2 || nw > 4)) return 'wallN';
  if (q.kind === 'maze' && (nw < 6 || nw > 10)) return 'wallN';
  if (q._pr !== q.fr || q._pc !== q.fc || q._h !== q.h0 || q._col !== 0 ||
      q._steps !== 0 || q._miss !== 0 || (q._stack && q._stack.length)) return 'initDirty';
  const opt = engOptFwd(q);
  if (opt < 0) return 'sealed';                            /* 依序分段全可达（SPEC §3 r13） */
  if (opt !== q.opt) return 'optMismatch';
  if (q.kind === 'exec1' || q.kind === 'exec2') {
    const cap = q.kind === 'exec1' ? CAP_EXEC1 : CAP_EXEC2;
    const sentence = sentenceOf({ seq: q.seq });
    if (sentence.length > cap) return 'sentenceCap';
    const mv = q.seq.filter(cm => cm.t !== 'T').length;
    if (q.kind === 'exec1' && (mv < 1 || mv > 2)) return 'exec1Mv';
    if (q.kind === 'exec2' && (mv < 1 || mv > 3)) return 'exec2Mv';
    if (q.seq[q.seq.length - 1].t !== 'T') return 'execTailT';
    if (q.seq.some(cm => cm.t === 'fwd' && (cm.n < 1 || cm.n > 3))) return 'fwdN';
    if (q.seq.some((cm, i) => cm.t === 'T' && i !== q.seq.length - 1)) return 'midT';
    const end = engRunSeq({ r: q.fr, c: q.fc }, q.h0, q.seq, q.walls);
    if (!end || end.r !== q.chests[0].r || end.c !== q.chests[0].c) return 'seqMismatch';
    if (q._fn !== (q.seq[0].t === 'fwd' ? q.seq[0].n : 0) || q._si !== 0) return 'siDirty';
    return null;
  }
  /* plan/maze：参考解执行复算（位置+朝向状态机+依序收集）与 fwd 总数=opt 对账 */
  if (!q.seq || !q.seq.length) return 'refMissing';
  for (let i = 0; i < q.chests.length; i++) {              /* 段距 ≥2 非平凡（仅规划题；
                                                               exec 热身题 [fwd1,T]=1 格合法） */
    const a = i === 0 ? { r: q.fr, c: q.fc } : q.chests[i - 1];
    if (optSeg(a, q.chests[i], q.walls) < 2) return 'segTrivial';
  }
  let r = q.fr, c = q.fc, h = q.h0, col = 0, fwd = 0;
  const wl = new Set(q.walls.map(w => wallKey(w.r, w.c)));
  for (const cm of q.seq) {
    if (cm.t === 'L') h = TURN_L[h];
    else if (cm.t === 'R') h = TURN_R[h];
    else if (cm.t === 'fwd') {
      if (cm.n < 1 || cm.n > 7) return 'refFwdN';
      const d = DELTA_H[h];
      for (let k = 0; k < cm.n; k++) {
        r += d[0]; c += d[1];
        if (!inGrid(r, c) || wl.has(wallKey(r, c))) return 'refBump';
      }
      fwd += cm.n;
    } else {
      if (r !== q.chests[col].r || c !== q.chests[col].c) return 'refTake';
      col++;
    }
  }
  if (col !== q.chests.length) return 'refCol';
  if (fwd !== opt) return 'refFwdOpt';
  if (q.kind === 'maze') {
    if (!engDeadEnds(q).length) return 'noDeadEnd';
    if (!engDetour(q)) return 'noDetour';
  }
  return null;
}
/* 分段 BFS 距离（structWhy 段距断言用） */
function optSeg(a, b, walls) { return engBfs(a, b, walls); }
