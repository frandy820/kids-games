/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     结构 structOk（3≤W,H≤6、起终异格、障碍在界内不压起终点）/ 分源独立模拟器复算
     （refExpand 递归实现 + refSim 方位名称角度制——与游戏侧 DIRV 数值向量体系分源，
     SPEC §0.37 禁复用游戏侧执行器）：REF 到达 / 展开后 ≤24 基本步 / 池精确覆盖 REF
     多重集（干扰恰 1/1/2/2 且类型 ∉ REF）/ 章约束（ch1 无循环 3-4 步直角；ch2 恰 rep2；
     ch3 恰 rep3+障碍 1-2；ch4 重复块子序列含前进+转向+障碍 2-3）/ 障碍不在 REF 路径上
     （refSim 途经格复算）/ 同关 5 题签名互异 / 手解安全网 FALLBACKS 双写对账
   ①b 引擎直驱：非法下标/空程序拒绝；运行未达=miss 恰一次（撞墙/出界/未到三路）；
     退回=探索零计数；REF 程序运行=right/done 推进；星级三档独立驱动（3/1/0 错）
   ①c 救援目标闭环：干扰程序起步 → rescueTarget 步进（undo/prog/run）→ 程序=REF
     前缀时独立模拟器复算到达 → 收敛 solved；已解题无救援目标
   ② tapPool/tapProg 单元（flat0 真实 UI）：入槽 DOM 同步（卡 .gone+槽 .full+类型）+
     退回紧缩（后继前移+卡复活）+非法下标 false
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题干扰程序运行失败一次=1 miss+回起点零惩罚
     程序保留 → 退回不计 → REF 排卡运行到达；逐帧轨迹 q._trace 与独立模拟器对账；
     1 错=2 星；verify 页不弹层）
   ④ UI 冒烟 B：flat10（ch3：rep3+障碍 1-2）autoSolve 全对通关 3 星
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 排卡+运行到达
     __cd2DemoR==='right'（§0.27）→ 指令词 TTS 豁免在场 → 重发同关 → 交接链
     queue([cd2_tut_turn]) → tut='help' 解锁
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）
     指令卡/程序槽 ≥64、运行按钮 ≥96、全按钮 ≥64（.k-parentbtn 豁免）、
     地图格可见、overflowX ≤0
   ⑥ 分布与专项：VOICE 文案独立字面量对账（SPEC §1 定稿）/ 16 条 clips
     （cd2_ 13=教学反馈 7+T46 指令词 cd2_i_ 5+循环块 1+core 3）clipOk /
     开场链 queue([cd2_hint]) 单通道 / 运行播 cd2_run /
     撞障碍播 cd2_wall / 指令词·读程序=cd2_i_ clip/段链 queue（T46 阶段2，say 恒零）
   结果写 #verify-result + document.title='VERIFY PASS n/n'（全部单元完成后才设 title） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立复算实现（SPEC §0.37 分源：递归展开 + 方位名称制模拟，
     禁复用游戏侧 expandProg/simSteps/DIRV——同语义不同实现，笔误即 fail） ---- */
  function refExpand(prog) {
    function take(i) {
      if (i >= prog.length) return [];
      const t = prog[i];
      if (t !== 'rep2' && t !== 'rep3') return [t].concat(take(i + 1));
      const n = (t === 'rep2') ? 2 : 3;
      const k = Math.min(2, prog.length - 1 - i);
      const body = prog.slice(i + 1, i + 1 + k);
      let seq = [];
      for (let r = 0; r < n; r++) seq = seq.concat(body);
      return seq.concat(take(i + 1 + k));
    }
    return take(0);
  }
  const V_NAME = ['up', 'right', 'down', 'left'];          // dir 数值→方位名（分源编码）
  const V_MOVE = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  function refSim(q, prog) {
    let cx = q.start.x, cy = q.start.y, face = V_NAME[q.start.dir];
    const blocked = {};
    for (const w of q.walls) blocked[w[0] + '/' + w[1]] = true;
    const path = [{ x: cx, y: cy, dir: q.start.dir }];
    for (const t of refExpand(prog)) {
      const fi = V_NAME.indexOf(face);
      if (t === 'l') face = V_NAME[(fi + 3) % 4];
      else if (t === 'r') face = V_NAME[(fi + 1) % 4];
      else {
        const nx = cx + V_MOVE[face][0], ny = cy + V_MOVE[face][1];
        if (nx < 0 || ny < 0 || nx >= q.W || ny >= q.H) return { hit: 1, x: cx, y: cy, win: false, path: path };
        if (blocked[nx + '/' + ny]) return { hit: 2, x: cx, y: cy, win: false, path: path };
        cx = nx; cy = ny;
      }
      path.push({ x: cx, y: cy, dir: V_NAME.indexOf(face) });
    }
    return { hit: 0, x: cx, y: cy, win: cx === q.goal.x && cy === q.goal.y, path: path };
  }
  /* 手解安全网双写字面量（与 game-core FALLBACKS 分源对账；genLevel 极端防御路） */
  const REF_FALLBACKS = {
    1: { W: 4, H: 3, start: [0, 1, 1], goal: [2, 2], walls: [], ref: ['f', 'f', 'r', 'f'] },
    2: { W: 4, H: 4, start: [1, 2, 0], goal: [0, 1], walls: [], ref: ['rep2', 'f', 'l'] },
    3: { W: 4, H: 4, start: [2, 1, 3], goal: [2, 2], walls: [[0, 0], [3, 0]], ref: ['rep3', 'f', 'l'] },
    4: { W: 5, H: 5, start: [1, 1, 1], goal: [1, 0], walls: [[3, 3], [0, 3], [4, 1]], ref: ['f', 'rep2', 'l', 'f'] }
  };
  /* 独立工具：池空闲卡/干扰卡索引（禁复用游戏侧 freePoolFor） */
  function vFreeIdx(q, t) {
    for (let i = 0; i < q.pool.length; i++) if (!q._used[i] && q.pool[i].t === t) return i;
    return -1;
  }
  function vDistrIdx(q) {
    for (let i = 0; i < q.pool.length; i++) if (q.ref.indexOf(q.pool[i].t) < 0) return i;
    return -1;
  }
  /* 引擎直驱：排 REF 通关（独立实现） */
  function vSolveRef(L, q) {
    while (q._prog.length) engTapProg(L, q._prog.length - 1);
    for (const t of q.ref) engTapPool(L, vFreeIdx(q, t));
  }
  /* 章约束分源复算（SPEC §1 题型定稿） */
  function refChapOk(dch, q) {
    const r = q.ref;
    const cnt = t => r.filter(x => x === t).length;
    const nf = r.filter(x => x === 'f').length;
    if (dch === 1) {
      if (cnt('rep2') || cnt('rep3')) return false;                    // ch1 无循环
      if (nf < 3 || nf > 4 || cnt('l') + cnt('r') !== 1) return false; // 3-4 步直角路径
      if (q.walls.length !== 0) return false;
    } else if (dch === 2) {
      if (cnt('rep2') !== 1 || cnt('rep3')) return false;              // ch2 恰 1 个 rep2
      if (q.walls.length !== 0) return false;
    } else if (dch === 3) {
      if (cnt('rep3') !== 1 || cnt('rep2')) return false;              // ch3 恰 1 个 rep3
      if (q.walls.length < 1 || q.walls.length > 2) return false;      // +障碍 1-2
    } else {
      if (cnt('rep2') + cnt('rep3') !== 1) return false;               // ch4 恰 1 个重复块
      if (q.walls.length < 2 || q.walls.length > 3) return false;      // +障碍 2-3
      const rp = r.findIndex(t => t === 'rep2' || t === 'rep3');
      const k = Math.min(2, r.length - 1 - rp);
      const body = r.slice(rp + 1, rp + 1 + k);
      if (body.indexOf('f') < 0 || !body.some(t => t === 'l' || t === 'r')) return false;  // 子序列含前进+转向
    }
    /* 池精确覆盖 REF 多重集 + 干扰数定版（≤2：1/1/2/2）+ 干扰类型 ∉ REF */
    const need = {}, have = {};
    r.forEach(t => { need[t] = (need[t] || 0) + 1; });
    q.pool.forEach(c => { have[c.t] = (have[c.t] || 0) + 1; });
    const expect = dch <= 2 ? 1 : 2;
    if (q.pool.length - r.length !== expect) return false;
    for (const k of Object.keys(need)) if (have[k] !== need[k]) return false;
    return true;
  }
  /* FALLBACKS 双写对账（手解 REF 独立复算，任务书"定稿先手解写进 REF"） */
  function fallbackDualityOk() {
    for (let d = 1; d <= 4; d++) {
      const a = FALLBACKS[d], b = REF_FALLBACKS[d];
      if (!a || !b) return false;
      if (a.W !== b.W || a.H !== b.H) return false;
      if (a.start.x !== b.start[0] || a.start.y !== b.start[1] || a.start.dir !== b.start[2]) return false;
      if (a.goal.x !== b.goal[0] || a.goal.y !== b.goal[1]) return false;
      if (a.walls.length !== b.walls.length ||
          a.walls.some((w, i) => w[0] !== b.walls[i][0] || w[1] !== b.walls[i][1])) return false;
      if (a.ref.length !== b.ref.length || a.ref.some((t, i) => t !== b.ref[i])) return false;
      const sim = refSim(a, a.ref);
      if (!sim.win || refExpand(a.ref).length > 24) return false;      // 手解到达（独立模拟器）
    }
    return true;
  }

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-39） ---- */
  const fbOk = fallbackDualityOk();
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, structAll = true, driveOk = true, rescueOk = true;
    const seen = {};
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    if (L1.quizzes.length !== CH_LEN) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refChapOk(L1.dch, q)) rangeAll = false;                       // 章约束+池覆盖+干扰数
      if (!structOk(q)) structAll = false;
      const sim = refSim(q, q.ref);                                      // §0.37 独立模拟器复算
      if (!sim.win) rangeAll = false;                                    // REF 到达
      if (refExpand(q.ref).length > 24) rangeAll = false;                // 展开后 ≤24 基本步
      const sig = sigOf(q);                                              // 同关 5 题签名互异
      if (seen[sig]) rangeAll = false;
      seen[sig] = 1;
      /* 障碍不在 REF 路径上（独立途经格复算；start/goal 恒在路径上） */
      const onPath = {};
      sim.path.forEach(p => { onPath[p.x + ',' + p.y] = 1; });
      if (q.walls.some(w => onPath[w[0] + ',' + w[1]])) rangeAll = false;
      /* 池全点展开上限（§0.37 防死循环口径） */
      if (refExpand(q.pool.map(c => c.t)).length > 24) rangeAll = false;
    }
    if (!fbOk) structAll = false;                                        // 安全网双写并入结构档

    /* ①b 引擎直驱 */
    const Ld = genLevel(flat);
    if (engTapPool(Ld, -1) !== null || engTapPool(Ld, 99) !== null) driveOk = false;   // 非法下标
    if (engTapProg(Ld, 0) !== null) driveOk = false;                    // 空程序退回=拒绝
    if (engRun(Ld) !== null) driveOk = false;                           // 空程序运行=拒绝
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      const di = vDistrIdx(q);
      if (di < 0) { driveOk = false; break; }
      if (engTapPool(Ld, di) === null) { driveOk = false; break; }
      if (engTapPool(Ld, di) !== null) { driveOk = false; break; }      // 已用卡再点=拒绝
      const p1 = engRun(Ld);
      if (!p1 || p1.win) { driveOk = false; break; }                    // 干扰单卡程序必未达
      const r1 = engCommitRun(Ld, p1);
      if (r1 !== 'short' && r1 !== 'wall') { driveOk = false; break; }
      if (q.miss !== 1 || Ld.retries !== base + 1) { driveOk = false; break; }   // 运行未达=1 错
      if (engRun(Ld) === null) { driveOk = false; break; }              // 程序保留可再运行
      engCommitRun(Ld, engRun(Ld));
      if (q.miss !== 2 || Ld.retries !== base + 2) { driveOk = false; break; }
      if (engTapProg(Ld, 0) !== 0) { driveOk = false; break; }          // 退回（程序空）
      if (q.miss !== 2 || Ld.retries !== base + 2) { driveOk = false; break; }   // 退回=探索零计数
      vSolveRef(Ld, q);                                                 // 排 REF 运行
      const p2 = engRun(Ld);
      if (!p2 || !p2.win) { driveOk = false; break; }
      if (engCommitRun(Ld, p2) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) { driveOk = false; break; }
      if (Ld.step !== k + 1) { driveOk = false; break; }
    }
    if (Ld.done !== true) driveOk = false;                              // 5 题全解=关完成
    /* ①b-2 嵌套拦截（审查 F2）：rep 卡前 1-2 位有 rep=放置拒绝（玩家排不出嵌套程序） */
    const Ln = genLevel(flat);
    {
      const q = Ln.quizzes[0];
      const reps = q.pool.map((c, idx) => (c.t === 'rep2' || c.t === 'rep3') ? idx : -1).filter(i => i >= 0);
      if (reps.length >= 2) {                                           // ch2+ 池恒有 rep+另一 rep 干扰
        if (engTapPool(Ln, reps[0]) !== 'placed') driveOk = false;
        if (engTapPool(Ln, reps[1]) !== null) driveOk = false;          // 紧随 rep=落作用域，必拒
        if (q._prog.length !== 1) driveOk = false;
        if (engTapProg(Ln, 0) !== 0) driveOk = false;                   // 清场
        if (engTapPool(Ln, reps[0]) !== 'placed') driveOk = false;
        const basic = q.pool.findIndex((c, idx) => !q._used[idx] && c.t === 'f');
        if (basic >= 0 && engTapPool(Ln, basic) !== 'placed') driveOk = false;
        if (engTapPool(Ln, reps[1]) !== null) driveOk = false;          // 隔 1 张基本卡仍=作用域内，必拒
      }
    }
    /* ①b-3 救援前缀+尾卡（审查 M1）：REF 排满后再补干扰卡 → rescueTarget 指退回非运行 */
    const Lr2 = genLevel(flat);
    {
      const q = Lr2.quizzes[0];
      vSolveRef(Lr2, q);
      if (q._prog.length === q.ref.length) {                            // REF 已满
        const di = vDistrIdx(q);
        if (di >= 0) {
          engTapPool(Lr2, di);                                           // 尾巴多一张
          const rt = rescueTarget(q);
          if (!rt || rt.act !== 'undo' || rt.j !== q._prog.length - 1) driveOk = false;
          engTapProg(Lr2, q._prog.length - 1);                           // 清尾
          const rt2 = rescueTarget(q);
          if (!rt2 || rt2.act !== 'run') driveOk = false;               // 清尾后恢复指运行
        }
      }
    }
    /* 星级三档独立驱动（3/1/0 错 → 1★/2★/3★） */
    const La = genLevel(flat);
    const qa = La.quizzes[0];
    let ga = 0;
    while (qa.miss < 3 && ga++ < 12) {                                  // 首题连错 3 次
      const di = vDistrIdx(qa);
      if (di < 0) break;
      engTapPool(La, di);
      engCommitRun(La, engRun(La));
      engTapProg(La, 0);
    }
    let g2 = 0;
    while (!La.done && g2++ < 30) { vSolveRef(La, La.quizzes[La.step]); engCommitRun(La, engRun(La)); }
    const s1 = La.done && La.retries === 3 && engStars(La) === 1;
    const Lb = genLevel(flat);
    const qb = Lb.quizzes[0];
    const db = vDistrIdx(qb);
    if (db >= 0) { engTapPool(Lb, db); engCommitRun(Lb, engRun(Lb)); engTapProg(Lb, 0); }  // 仅首题错一次
    let g3 = 0;
    while (!Lb.done && g3++ < 30) { vSolveRef(Lb, Lb.quizzes[Lb.step]); engCommitRun(Lb, engRun(Lb)); }
    const s2 = Lb.done && Lb.retries === 1 && engStars(Lb) === 2;
    const Lc = genLevel(flat);
    let g4 = 0;
    while (!Lc.done && g4++ < 30) { vSolveRef(Lc, Lc.quizzes[Lc.step]); engCommitRun(Lc, engRun(Lc)); }
    const s3 = Lc.done && Lc.retries === 0 && engStars(Lc) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环：干扰程序起步 → rescueTarget 步进 → 收敛（act=run 时独立复算到达） */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    const dr = vDistrIdx(qr);
    if (dr >= 0) engTapPool(Lr, dr);
    let chainOk = true, steps = 0;
    while (!qr.solved && steps++ < 40) {
      const t = rescueTarget(qr);
      if (!t) { chainOk = false; break; }
      if (t.act === 'prog') {
        if (engTapPool(Lr, t.i) === null) { chainOk = false; break; }
      } else if (t.act === 'undo') {
        if (engTapProg(Lr, t.j) === null) { chainOk = false; break; }
      } else {                                                          // act=run：程序=REF 前缀
        const types = qr._prog.map(i => qr.pool[i].t);
        if (!refSim(qr, types).win) { chainOk = false; break; }         // 独立模拟器复算到达
        engCommitRun(Lr, engRun(Lr));
        break;
      }
    }
    if (!qr.solved) chainOk = false;
    if (rescueTarget(qr) !== null) chainOk = false;                     // 已解题无救援目标
    rescueOk = chainOk;

    const ok = det && rangeAll && structAll && driveOk && rescueOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll,
      structAll: structAll, driveOk: driveOk, rescueOk: rescueOk,
      stars: { many1: engStars(La), wrong1: engStars(Lb), clean: engStars(Lc) },
      qs: L1.quizzes.map(q => q.W + 'x' + q.H + '[' + q.ref.join('') + ']' +
        (q.walls.length ? '{' + q.walls.map(w => w.join(':')).join(';') + '}' : '')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapPool/tapProg 单元（flat0 真实 UI）：入槽/退回 DOM 同步 + 非法下标 ---- */
  total++;
  startLevel(0);
  const q0 = cur.quizzes[0];
  let domOk = true;
  const seq = [];
  for (let k = 0; k < 2; k++) {                                          // 排 REF 前 2 张
    const i = vFreeIdx(q0, q0.ref[k]);
    seq.push(i);
    const r = await CD2.tapPool(i);
    if (r !== 'placed') domOk = false;
    const qz = CD2.quiz;
    if (qz.prog[k] !== q0.ref[k] || qz.prog.filter(x => x !== null).length !== k + 1) domOk = false;
    const cEl = cardEl(i);
    if (!cEl || !cEl.classList.contains('gone')) domOk = false;         // 池卡 .gone
    const pEl = progSlotEl(k);
    if (!pEl || !pEl.classList.contains('full') || pEl.dataset.j !== String(k)) domOk = false;  // 槽 .full
  }
  if (CD2.tapProg(0) !== 1) domOk = false;                              // 退回首条（后继前移）
  const c0 = cardEl(seq[0]);
  if (c0 && c0.classList.contains('gone')) domOk = false;               // 首卡复活
  const p0 = progSlotEl(0);
  if (!p0 || !p0.classList.contains('full')) domOk = false;             // 槽 0=原第 2 条前移
  if (CD2.quiz.prog[0] !== q0.ref[1] || CD2.quiz.prog[1] !== null) domOk = false;
  if (CD2.tapProg(0) !== 0) domOk = false;                              // 退回末条（程序空）
  const badIdx = (await CD2.tapPool(-1)) === false && (await CD2.tapPool(99)) === false &&
    CD2.tapProg(-1) === false && CD2.tapProg(99) === false;             // 非法下标
  const emptyOk = (await CD2.run()) === false;                          // 空程序运行=拒绝（轻提示不计数）
  const reUse = (await CD2.tapPool(seq[0])) === 'placed' &&
    (await CD2.tapPool(seq[0])) === false;                              // 已用卡再点=拒绝
  startLevel(0);                                                        // 重发还原 DOM
  const selfOk = domOk && badIdx && emptyOk && reUse;
  if (selfOk) npass++;
  units.tapPool = { ok: selfOk, domOk: domOk, badIdx: badIdx, emptyOk: emptyOk, reUse: reUse,
    ref: q0.ref.join(''), slots: q0.slots };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue, origSay2 = KIDS.voice.say;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  KIDS.voice.say = function (t) { wLog.push(['s', String(t)]); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  startLevel(0);                                                        // flat0：每错必播
  const qa0 = cur.quizzes[0];
  const dA = vDistrIdx(qa0);
  await CD2.tapPool(dA);
  await CD2.run();                                                      // 错 1（未达）
  await CD2.run();                                                      // 错 2（同程序再运行）
  const sayA = cnt('cd2_wrong');                                        // → 2
  startLevel(3);                                                        // flat3：10s 节流
  lastWrongVoice = Date.now();                                          /* 显式进入节流窗口内 */
  const qb3 = cur.quizzes[0];
  const dB = vDistrIdx(qb3);
  await CD2.tapPool(dB);
  await CD2.run();
  const sayB = cnt('cd2_wrong') - 2;                                    // 增量 → 0
  startLevel(3);                                                        // 同关重发 fresh：miss===2 force 豁免
  lastWrongVoice = 0;                                                   /* 隔离上一子用例时间戳 */
  const qc3 = cur.quizzes[0];
  const base3 = qc3.miss;
  const dC = vDistrIdx(qc3);
  await CD2.tapPool(dC);
  await CD2.run();                                                      // miss=1 窗口外 → 播
  await CD2.run();                                                      // miss=2 → force → 播
  const sayC = cnt('cd2_wrong') - 2 - sayB;                             // 增量 → 2
  const missOk = qc3.miss === base3 + 2;
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2; KIDS.voice.say = origSay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && missOk;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, missOk: missOk };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题运行失败一次 → 退回 → REF 到达 = 1 错 2 星） ---- */
  total++;
  startLevel(0);
  const qA = cur.quizzes[0];
  let smokeA = true, failOk = false;
  const dA2 = vDistrIdx(qA);
  const traceQ = qA;
  await CD2.tapPool(dA2);
  const rFail = await CD2.run();                                        // 运行未达=1 miss+回起点
  const stAfter = CD2.quiz;
  const bunn = document.getElementById('bunny');
  const norm = s => String(s).replace(/\s+/g, '');                     // Chromium 规范化 transform 会补空格
  const homeT = 'translate(' + (stAfter.start.x * 60) + 'px,' + (stAfter.start.y * 60) + 'px)';
  const failOk1 = rFail === 'short' && stAfter.miss === 1 && stAfter.runState === 'idle';
  const progKept = stAfter.prog.some(x => x !== null);                  // 程序保留可改
  const bunnHome = !!bunn && norm(bunn.style.transform) === norm(homeT);    // 小兔回起点
  await wait(120);
  failOk = failOk1 && progKept && bunnHome && CD2.currentLevel.retries === 1;
  if (CD2.tapProg(0) !== 0) smokeA = false;                             // 退回干扰卡
  if (CD2.quiz.miss !== 1 || CD2.currentLevel.retries !== 1) smokeA = false;  // 退回零计数
  for (const t of traceQ.ref) {                                         // 依 REF 真实排卡
    const r = await CD2.tapPool(vFreeIdx(traceQ, t));
    if (r !== 'placed') smokeA = false;
  }
  const rWin = await CD2.run();                                         // 运行到达
  const typesRun = traceQ._prog.map(i => traceQ.pool[i].t);
  const simT = refSim(traceQ, typesRun);
  const traceOk = rWin === 'right' && traceQ._trace && simT.win &&
    traceQ._trace.length === simT.path.length &&
    traceQ._trace.every((f, k) => f.x === simT.path[k].x && f.y === simT.path[k].y &&
      f.dir === simT.path[k].dir);                                      // 逐帧轨迹与独立模拟器对账
  const rest = await CD2.autoSolve();                                   // 余 4 题自动通关
  await wait(900 * SPEED);
  const lvA = CD2.currentLevel;
  const smokeOkA = smokeA && failOk && traceOk && rest.done && rest.ok &&
    lvA.done && lvA.won && lvA.retries === 1 && engStars(cur) === 2 &&
    !document.querySelector('.k-celebrate');                            // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, failOk: failOk, failOk1: failOk1, bunnHome: bunnHome,
    rFail: rFail, traceOk: traceOk, progKept: progKept,
    autoSolve: rest, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B：flat10（ch3：rep3+障碍 1-2）autoSolve 全对通关 3 星 ---- */
  total++;
  startLevel(10);
  const q10 = CD2.quiz;
  const shapeOk = q10 && cur.dch === 3 && q10.walls.length >= 1 && q10.walls.length <= 2 &&
    q10.pool.some(c => c.t === 'rep3');
  const restB = await CD2.autoSolve();
  await wait(900 * SPEED);
  const lv10 = CD2.currentLevel;
  const smokeOkB = shapeOk && restB.done && restB.ok && restB.quizzes === CH_LEN &&
    lv10.done && lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat10 = { ok: smokeOkB, shapeOk: shapeOk, walls: q10 ? q10.walls.length : -1,
    autoSolve: restB, stars: engStars(cur) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play, origS7 = KIDS.voice.say;
  const qLog7 = [], pLog7 = [], sLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  KIDS.voice.say = function (t) { sLog7.push(String(t)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → 看地图 → demo 排卡 → 运行到达 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7; KIDS.voice.say = origS7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const ref0 = genLevel(0).quizzes[0].ref;
  const q0t = CD2.quiz;
  const tutOk = pLog7.indexOf('cd2_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    pLog7.indexOf('cd2_run') >= 0 &&                                     /* 演示运行=出发 clip */
    window.__cd2DemoR === 'right' &&                                     /* §0.27 演示到达真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    CD2.currentLevel && CD2.currentLevel.flat === 0 &&                   /* 重发同关 */
    q0t && q0t.step === 0 && q0t.miss === 0 &&                           /* 新题面初态 */
    q0t.prog.every(x => x === null) &&
    pLog7.indexOf('cd2_i_' + ref0[0]) >= 0 &&                            /* 指令词=cd2_i_ clip 在场（T46，期望从 INSTR_TEXT 静态域推导） */
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'cd2_tut_turn';       /* 交接链单通道 */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('cd2_tut_watch') >= 0,
    runClip: pLog7.indexOf('cd2_run') >= 0, demoR: window.__cd2DemoR,
    handoff: !!lastQ7, parts: lastQ7,
    instrSaid: pLog7.filter(k => k.indexOf('cd2_i_') === 0).length, tut: state.tut };

  /* ---- ⑤ 布局：双 viewport ×（flat0/5/10/15）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：card-in scale(0) 起帧） ---- */
  async function simLayout(w, h, flat) {
    startLevel(flat);
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 卡入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const cards = Array.prototype.slice.call(cardPoolEl.querySelectorAll('.card'));
    const cardOk = cards.length > 0 &&
      cards.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const slots = Array.prototype.slice.call(progBarEl.querySelectorAll('.pslot'));
    const slotOk = slots.length > 0 &&
      slots.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const rb = runBtnEl.getBoundingClientRect();
    const runOk = rb.width >= 96 && rb.height >= 96;
    const gr = gridEl.getBoundingClientRect();
    const gridOk = gr.width >= 3 * 60 && gr.height >= 3 * 60 && gr.width <= 6 * 60 + 8;
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(document.getElementById('game').scrollWidth - document.getElementById('game').clientWidth,
      de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, cardOk: cardOk, slotOk: slotOk, runOk: runOk,
      gridOk: gridOk, btnOk: btnOk, ox: ox,
      pass: cardOk && slotOk && runOk && gridOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simLayout(1280, 800, f));
    sims.push(await simLayout(800, 1180, f));
  }
  const g0 = document.getElementById('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / 运行·撞墙 clip / 读程序·指令词 ---- */
  total++;
  /* SPEC §1 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！排好指令走一走' &&
    VOICE.turn.text === '你来排一排' && VOICE.hint.text === '想一想小兔怎么走' &&
    VOICE.right.text === '到达啦，真厉害' && VOICE.wrong.text === '再看看路线改一改' &&
    VOICE.run.text === '出发喽' && VOICE.wall.text === '前面走不通啦';
  /* 16 条 clips 注入对账（cd2_ 13=教学反馈 7+T46 指令词 5+循环块 1+core 3） */
  const CD2_KEYS = ['cd2_tut_watch', 'cd2_tut_turn', 'cd2_hint', 'cd2_right', 'cd2_wrong', 'cd2_run', 'cd2_wall',
                    'cd2_i_f', 'cd2_i_l', 'cd2_i_r', 'cd2_i_rep2', 'cd2_i_rep3', 'cd2_loop'];
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 16 && CD2_KEYS.every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;
  /* 开场链 / 运行 clip / 撞墙 clip / 指令词·读程序（stub 记录） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push([String(key), text === undefined ? null : String(text)]); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'cd2_hint';   // 开场=[hint] 单通道
  const qw0 = cur.quizzes[0];
  const dw0 = vDistrIdx(qw0);
  await CD2.tapPool(dw0);
  await CD2.run();
  const runClip = playLog.some(p => p[0] === 'cd2_run');                       // 运行=出发 clip
  const instrSaid = playLog.some(p => p[0] === 'cd2_i_' + qw0.pool[dw0].t);    // 指令词=cd2_i_ clip（T46）
  const hearOk = uiHear() === true && sayLog.length === 0 &&
    qLog.length >= 2 && qLog[qLog.length - 1].length === 1 &&
    qLog[qLog.length - 1][0] === 'cd2_i_' + qw0.pool[dw0].t;                   // 读程序=段链 queue 拼播（T46，单卡程序=1 段）
  startLevel(10);                               // 撞障碍=cd2_wall（UI mock：正前方临时塞墙，重发还原）
  const qw10 = cur.quizzes[0];
  const MV10 = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const fx = qw10.start.x + MV10[qw10.start.dir][0], fy = qw10.start.y + MV10[qw10.start.dir][1];
  playLog.length = 0;
  qw10.walls.push([fx, fy]);
  const f10 = vFreeIdx(qw10, 'f');
  await CD2.tapPool(f10);
  const rWall = await CD2.run();
  const wallClip = rWall === 'wall' && playLog.some(p => p[0] === 'cd2_wall'); // 撞障碍专属句
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  startLevel(0);                                // 还原
  const specOk = refVoice && clipOk && openChain && runClip && instrSaid && hearOk && wallClip;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, clips: clipOk, nClips: nClips,
    openChain: openChain, runClip: runClip, wallClip: wallClip,
    instrSaid: instrSaid, hearOk: hearOk,
    missing: CD2_KEYS.filter(k => !KIDS.voice.clips[k]) };

  const out = { game: 'coder2', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes };
  document.getElementById('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  runVerify();
}
