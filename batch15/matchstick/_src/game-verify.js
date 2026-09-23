/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     章型一致（静态关=循环章，生成关 dch∈1-4）/
     **§0.30 命门分源穷举**——verify 侧独立实现段集表/求值/全量单根移动枚举（禁复用引擎
     SEGSET/evalCells/engSolve，两套逻辑同错不可检）：
       a 谜面可读（每位恰为某数字段集+符号有横）/ b 谜面不成立（左≠右）/
       c 全部单根移动复算 ≥1 解 / d 存储解应用后成立 / e ch1-3 存储解=数字间移动（§3）/
       f ch4 每关 ≥1 题存在符号参与解（src/dst 在符号位）
     数值域独立复算（ch1 A,B∈2-9 加法 C≤10 / ch2 A∈5-9 减法 / ch3 A/C 恰一两位 /
       ch4 一位数混合）/ 数字段元 ≤4（布局界）/ 同关相邻谜面互异 / structOk
   ①b 引擎直驱：非法槽 null（等号段/空段/未拿起乱放）/ 拿起→held / 放回原位='back'
     零惩罚（miss/retries 不动+cells 复原）/ 浪费放置='wrong'（miss+1+cells 复原回原位）/
     解答='right'/'done' 推进 / 星级三档（全对 3★/一错 2★/多错 1★，中间态不计）
   ② UI 单元（flat0 真实 UI）：火柴 DOM 数=ΣON 段（数字+符号）+2（等号）/ 空槽 DOM 数=Σ空段 /
     拿起 held 类+钩子 held / 放回零惩罚 / 错放 miss+1 / 解答推进
   ②a 段集渲染对账（§0.30）：每数字位火柴 DOM 数=|SEGSET[d]|、段名一致；'-'=1 杆
     '+'=2 杆；等号=2 杆 locked（flat0/5/10/15 实测）
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟：flat0 真实通路（首题先错一次=2 星）；flat5/10/15 autoSolve 3 星通关
   ⑦ 教学链（verify 直驱 tutorialWatch）：演示完整移动 → __msDemoR==='right'（§0.27）→
     重发同关 → 交接链 queue([ms_tut_turn, ms_q]) → tut='help'
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）：全部火柴/槽命中矩形
     ≥64×64（M5 透明外扩）、按钮 ≥64（.k-parentbtn 豁免）、场景 SVG 非零、overflowX ≤0；
     横屏视口 elementFromPoint 火柴中心采样命中自家（采样验证）
   ⑥ 分布与专项：VOICE 表文案独立字面量对账（SPEC §3 定稿）/ ms_* 8 条+core 3 条 clipOk /
     开场顺序链 queue([ms_hint, ms_q]) 单通道 / 救援重读=ms_q /
     6↔9/0↔9/5↔6/2↔3 族变换在解空间出现（ch2 偏好复算）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  $id('verify-result').style.pointerEvents = 'none';   // 防悬浮结果层截胡 elementFromPoint
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立实现（§0.30 分源：不复用引擎 SEGSET/evalCells/engSolve/onSlots） ---- */
  const RSEG = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const RSET = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
    5: 'afgcd', 6: 'afgcde', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const rmask = d => {                             // 数字 → 7 位掩码串（"1011010"）
    let s = '';
    for (let i = 0; i < 7; i++) s += RSET[d].indexOf(RSEG[i]) >= 0 ? '1' : '0';
    return s;
  };
  const RMASKS = {};                               // 掩码串 → 数字（查表反向）
  for (let d = 0; d <= 9; d++) RMASKS[rmask(d)] = d;
  const rMask = segs => segs.map(v => v ? '1' : '0').join('');
  const rDigit = segs => (RMASKS.hasOwnProperty(rMask(segs)) ? RMASKS[rMask(segs)] : null);
  function rEval(cells) {                          // 独立求值（两遍扫描：分段+计算）
    const parts = [[], [], []]; let op = null, seg = 0;   // seg: 0=A 区 1=B 区 2=C 区
    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      if (c.kind === 'd') {
        const d = rDigit(c.segs);
        if (d == null) return { valid: false, ok: false, left: null, right: null, A: null, B: null, C: null, op: null };
        parts[seg].push(d);
      } else if (c.kind === 'op') {
        if (op || seg !== 0 || !c.segs[0]) return { valid: false, ok: false, left: null, right: null, A: null, B: null, C: null, op: null };
        op = c.segs[1] ? '+' : '-'; seg = 1;
      } else {
        if (seg !== 1) return { valid: false, ok: false, left: null, right: null, A: null, B: null, C: null, op: null };
        seg = 2;
      }
    }
    if (!op || seg !== 2 || !parts[0].length || !parts[1].length || !parts[2].length)
      return { valid: false, ok: false, left: null, right: null, A: null, B: null, C: null, op: null };
    const val = a => a.reduce((s, d) => s * 10 + d, 0);
    const A = val(parts[0]), B = val(parts[1]), C = val(parts[2]);
    const left = op === '+' ? A + B : A - B;
    return { valid: true, ok: left === C, left: left, right: C, A: A, B: B, C: C, op: op };
  }
  const rSlots = (cells, wantOn) => {              // 独立槽枚举（等号除外）
    const out = [];
    for (let i = 0; i < cells.length; i++) {
      if (cells[i].kind === 'eq') continue;
      for (let j = 0; j < cells[i].segs.length; j++)
        if (!!cells[i].segs[j] === !!wantOn) out.push([i, j]);
    }
    return out;
  };
  const rSet = (cells, i, j, v) => { cells[i].segs[j] = v; };
  function rSolutions(expr) {                      // 全量单根移动枚举（无上限，含符号参与标记）
    const cells = expr.map(c => ({ kind: c.kind, segs: c.segs.slice() }));
    const out = [];
    const srcs = rSlots(cells, true);
    for (let a = 0; a < srcs.length; a++) {
      const [si, sj] = srcs[a];
      rSet(cells, si, sj, false);
      const dsts = rSlots(cells, false);           // 含 src 原槽（下方跳过）
      for (let b = 0; b < dsts.length; b++) {
        const [di, dj] = dsts[b];
        if (si === di && sj === dj) continue;
        rSet(cells, di, dj, true);
        const ev = rEval(cells);
        rSet(cells, di, dj, false);
        if (ev.valid && ev.ok) out.push({
          src: si * 8 + sj, dst: di * 8 + dj,
          opInvolved: cells[si].kind === 'op' || cells[di].kind === 'op'
        });
      }
      rSet(cells, si, sj, true);
    }
    return out;
  }
  /* 独立非解移动（错放/星级驱动用）：应用后不成立的第一个 {src,dst} */
  function rNonSolution(expr) {
    const cells = expr.map(c => ({ kind: c.kind, segs: c.segs.slice() }));
    const srcs = rSlots(cells, true);
    for (let a = 0; a < srcs.length; a++) {
      const [si, sj] = srcs[a];
      rSet(cells, si, sj, false);
      const dsts = rSlots(cells, false);
      for (let b = 0; b < dsts.length; b++) {
        const [di, dj] = dsts[b];
        if (si === di && sj === dj) continue;
        rSet(cells, di, dj, true);
        const ev = rEval(cells);
        rSet(cells, di, dj, false);
        if (!(ev.valid && ev.ok)) {
          rSet(cells, si, sj, true);
          return { src: si * 8 + sj, dst: di * 8 + dj };
        }
      }
      rSet(cells, si, sj, true);
    }
    return null;
  }
  /* 谜面数值域独立审计（SPEC §3 数值域；结构域不要求成立——谜面必不成立）：
     ch1 '+' A,B∈2-9 C≤10 / ch2 '-' A∈5-9 B∈1..A-1 C≤9 /
     ch3 A/C 恰一两位 / ch4 一位数混合（C≤10） */
  function refDomainOk(dch, q) {
    const ev = rEval(q.cells);
    if (!ev.valid) return false;
    const nD = q.cells.filter(c => c.kind === 'd').length;
    const op = q.cells.filter(c => c.kind === 'op').length;
    const eq = q.cells.filter(c => c.kind === 'eq').length;
    if (op !== 1 || eq !== 1 || nD < 3 || nD > 4) return false;      // 布局界：A op B = C，段元 ≤4
    if (dch === 1) return ev.op === '+' && ev.A >= 2 && ev.A <= 9 && ev.B >= 2 && ev.B <= 9 && ev.C <= 10;
    if (dch === 2) return ev.op === '-' && ev.A >= 5 && ev.A <= 9 && ev.B >= 1 && ev.B < ev.A && ev.C <= 9;
    if (dch === 3) {                                                 // A/C 恰一为两位（§3）
      const aTwo = ev.A >= 10, cTwo = ev.C >= 10;
      if (aTwo === cTwo) return false;
      if (ev.op === '+') return ev.A >= 2 && ev.A <= 9 && ev.B >= 2 && ev.B <= 9 && ev.C >= 10 && ev.C <= 19;
      return ev.A >= 10 && ev.A <= 19 && ev.B >= 2 && ev.B <= 9 && ev.C <= 9;
    }
    if (ev.A < 2 || ev.A > 9 || ev.B < 1 || ev.B > 9 || ev.C > 10) return false;   // ch4 一位数
    if (ev.op === '+') return ev.B >= 2;
    return ev.B < ev.A;
  }
  /* 6↔9/0↔9/5↔6/2↔3 族变换是否在解空间出现（ch2 偏好复算） */
  const FAM = { '6>9': 1, '9>6': 1, '0>9': 1, '9>0': 1, '5>6': 1, '6>5': 1, '2>3': 1, '3>2': 1 };
  function rFamilyIn(expr) {
    const sols = rSolutions(expr);
    for (let k = 0; k < sols.length; k++) {
      const cells = expr.map(c => ({ kind: c.kind, segs: c.segs.slice() }));
      const s = sols[k];
      const before = [], idx = [];
      for (let i = 0; i < cells.length; i++) if (cells[i].kind === 'd') { before.push(rDigit(cells[i].segs)); idx.push(i); }
      rSet(cells, Math.floor(s.src / 8), s.src % 8, false);
      rSet(cells, Math.floor(s.dst / 8), s.dst % 8, true);
      for (let i = 0; i < idx.length; i++) {
        const after = rDigit(cells[idx[i]].segs);
        if (after != null && before[i] != null && FAM[before[i] + '>' + after]) return true;
      }
    }
    return false;
  }

  /* ---- ① 40 关全量审计 + ①b 引擎直驱（flat 0-39） ---- */
  let familyN = 0, opSolN = 0;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, readableAll = true, falseAll = true, solveAll = true,
        storedAll = true, digitMoveAll = true, structAll = true, driveOk = true, adjOk = true;
    let ch4Op = 0;
    let prevSer = null;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const ev = rEval(q.cells);
      if (!ev.valid) readableAll = false;                            // a 可读
      if (!ev.valid || ev.ok) falseAll = false;                      // b 谜面不成立
      const sols = rSolutions(q.cells);
      if (sols.length < 1) solveAll = false;                         // c 分源穷举 ≥1 解
      const tc = q.cells.map(c => ({ kind: c.kind, segs: c.segs.slice() }));
      tc[Math.floor(q.solution.src / 8)].segs[q.solution.src % 8] = false;
      tc[Math.floor(q.solution.dst / 8)].segs[q.solution.dst % 8] = true;
      const tev = rEval(tc);
      if (!(tev.valid && tev.ok)) storedAll = false;                 // d 存储解成立
      if (L1.dch !== 4 &&                                              // e ch1-3 存储解=数字间移动
        (q.cells[Math.floor(q.solution.src / 8)].kind !== 'd' ||
         q.cells[Math.floor(q.solution.dst / 8)].kind !== 'd')) digitMoveAll = false;
      if (sols.some(s => s.opInvolved)) ch4Op++;                      // f 符号参与解
      if (rFamilyIn(q.cells)) familyN++;
      if (!refDomainOk(L1.dch, q)) rangeAll = false;                  // 数值域独立复算
      if (!structOk(q)) structAll = false;
      const serNow = JSON.stringify(q.cells);
      if (serNow === prevSer) adjOk = false;                         // 同关相邻谜面互异
      prevSer = serNow;
    }
    if (L1.dch === 4 && ch4Op < 1) solveAll = false;                 // ch4 每关 ≥1 符号参与解
    if (L1.dch === 4) opSolN += ch4Op;

    /* 引擎直驱（纯引擎，无 DOM；retries 为关级累计：断言用题内增量 base） */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      const eqIdx = q.cells.findIndex(c => c.kind === 'eq');
      if (engPick(Ld, eqIdx * 8) !== null) driveOk = false;          // 等号段不可拿
      const emptyProbe = (function () {                              // 任一空段不可拿
        for (let i = 0; i < q.cells.length; i++)
          for (let j = 0; j < q.cells[i].segs.length; j++)
            if (!q.cells[i].segs[j]) return i * 8 + j;
        return -1;
      })();
      if (emptyProbe >= 0 && engPick(Ld, emptyProbe) !== null) driveOk = false;
      if (engPlace(Ld, emptyProbe) !== null) driveOk = false;        // 未拿起乱放
      const ser0 = JSON.stringify(q.cells);
      const on0 = (function () {
        for (let i = 0; i < q.cells.length; i++)
          for (let j = 0; j < q.cells[i].segs.length; j++)
            if (q.cells[i].kind !== 'eq' && q.cells[i].segs[j]) return i * 8 + j;
        return -1;
      })();
      if (engPick(Ld, on0) !== 'held' || q.held !== on0) driveOk = false;   // 拿起
      if (engPlace(Ld, on0) !== 'back' || q.miss !== 0 || Ld.retries !== base ||
          JSON.stringify(q.cells) !== ser0) driveOk = false;         // 放回原位零惩罚+复原
      const non = rNonSolution(q.cells);
      if (!non) driveOk = false;
      else {
        engPick(Ld, non.src);
        if (engPlace(Ld, non.dst) !== 'wrong' || q.miss !== 1 || Ld.retries !== base + 1 ||
            JSON.stringify(q.cells) !== ser0) driveOk = false;       // 错放计一次+火柴回原位
      }
      if (engPick(Ld, q.solution.src) !== 'held') driveOk = false;   // 解答=拿存储解源杆
      if (engPlace(Ld, q.solution.dst) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) driveOk = false;
    }
    /* 星级三档独立驱动（中间态零惩罚） */
    const L3 = genLevel(flat);
    let g3 = 0;
    while (!L3.done && g3++ < 30) {
      const q = L3.quizzes[L3.step];
      engPick(L3, q.solution.src); engPlace(L3, q.solution.src);     // 先拿起放回（零惩罚）
      engPick(L3, q.solution.src);
      engPlace(L3, q.solution.dst);
    }
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    const L2x = genLevel(flat);
    const wq = L2x.quizzes[0], wn = rNonSolution(wq.cells);
    engPick(L2x, wn.src); engPlace(L2x, wn.dst);                     // 全关恰一错
    let g2 = 0;
    while (!L2x.done && g2++ < 30) {
      const q = L2x.quizzes[L2x.step];
      engPick(L2x, q.solution.src); engPlace(L2x, q.solution.dst);
    }
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L1x = genLevel(flat);
    for (let k = 0; k < 3; k++) {                                   // ≥3 错=1★
      const q = L1x.quizzes[L1x.step];
      const nn = rNonSolution(q.cells);
      engPick(L1x, nn.src); engPlace(L1x, nn.dst);
      engPick(L1x, q.solution.src); engPlace(L1x, q.solution.dst);
    }
    const s1 = L1x.retries >= 3 && engStars(L1x) === 1;
    if (!s1 || !s2 || !s3) driveOk = false;
    const ok = det && L1.quizzes.length === CH_LEN && rangeAll && readableAll &&
      falseAll && solveAll && storedAll && digitMoveAll && adjOk && structAll && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll,
      readableAll: readableAll, falseAll: falseAll, solveAll: solveAll, storedAll: storedAll,
      digitMoveAll: digitMoveAll, adjOk: adjOk, structAll: structAll, driveOk: driveOk,
      stars: { many1: engStars(L1x), wrong1: engStars(L2x), clean: engStars(L3) },
      qs: L1.quizzes.map(q => { const ev = rEval(q.cells); return ev.A + ev.op + ev.B + '=' + ev.C; }) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② UI 单元（flat0 真实 UI）：火柴/空槽 DOM 对账 + 拿放流 ---- */
  total++;
  startLevel(0);
  const q0 = MS.quiz;
  const expOn = q0.expr.reduce((s, c) => s + (c.kind === 'eq' ? 0 : c.segs.filter(Boolean).length), 0);
  const expOff = q0.expr.reduce((s, c) => s + (c.kind === 'eq' ? 0 : c.segs.filter(v => !v).length), 0);
  const stkN = sceneEl.querySelectorAll('.stk').length;             // 含等号 2 杆
  const slotN = sceneEl.querySelectorAll('.slot').length;
  const domOk = stkN === expOn + 2 && slotN === expOff &&
    sceneEl.querySelectorAll('.stk.locked').length === 2;           // 等号=2 杆 locked
  /* 拿起→held 类+钩子；放回=零惩罚 */
  const s0 = rSlots(q0.expr, true)[0];
  const s0id = s0[0] * 8 + s0[1];
  const rp = await MS.tapStick(s0id);
  const heldOk = rp === 'held' && MS.quiz.held === s0id &&
    stickEl(s0id).classList.contains('held') &&
    sceneEl.querySelectorAll('.slot.hot').length === expOff;        // 空槽亮虚线
  const rb = await MS.tapSlot(s0id);
  const backOk = rb === 'back' && MS.quiz.held === null && MS.quiz.miss === 0 &&
    MS.currentLevel.retries === 0;
  /* 错放=miss+1+状态复原（火柴回原位） */
  const non0 = rNonSolution(q0.expr);
  await MS.tapStick(non0.src);
  const rw = await MS.tapSlot(non0.dst);
  const wrongOk = rw === 'wrong' && MS.quiz.miss === 1 && MS.currentLevel.retries === 1 &&
    JSON.stringify(MS.quiz.expr) === JSON.stringify(q0.expr);
  /* 解答推进（分源穷举首解，非存储解） */
  const sol0 = rSolutions(q0.expr)[0];
  await MS.tapStick(sol0.src);
  const rr = await MS.tapSlot(sol0.dst);
  const flowOk = rr === 'right' && MS.currentLevel.step === 1;
  const selfOk = !!(domOk && heldOk && backOk && wrongOk && flowOk);
  if (selfOk) npass++;
  units.ui = { ok: selfOk, domOk: domOk, stkN: stkN, expOn: expOn, slotN: slotN, expOff: expOff,
    heldOk: heldOk, backOk: backOk, wrongOk: wrongOk, flowOk: flowOk };

  /* ---- ②a 段集渲染对账（§0.30）：每数字位火柴 DOM=段集基数+段名一致（flat0/5/10/15 实测） ---- */
  total++;
  let segOk = true, segN = 0;
  const cellSticksOf = idx => {                   // 按 slotId 区间（cellIdx*8+seg）精确收集
    const out = [];
    sceneEl.querySelectorAll('.stk:not(.locked)').forEach(el => {
      if (Math.floor(Number(el.dataset.slot) / 8) === idx) out.push(el);
    });
    return out;
  };
  for (const f of [0, 5, 10, 15]) {
    startLevel(f);
    const q = MS.quiz;
    if (!q) { segOk = false; continue; }
    q.expr.forEach((c, idx) => {
      if (c.kind === 'd') {                       // 数字位：杆数=|RSET[d]| 且段名一致
        const d = rDigit(c.segs);
        const names = d == null ? [] : RSET[d].split('');
        const inCell = cellSticksOf(idx);
        segN++;
        if (d == null || inCell.length !== names.length ||
            !inCell.every(el => names.indexOf(el.dataset.seg) >= 0)) segOk = false;
      } else if (c.kind === 'op') {               // 符号位：'+'=2 杆 / '-'=1 杆
        const inCell = cellSticksOf(idx);
        segN++;
        if (c.segs[1] ? inCell.length !== 2 : inCell.length !== 1) segOk = false;
      }
    });
    if (sceneEl.querySelectorAll('.stk.locked').length !== 2) segOk = false;   // 等号=2 locked 杆
  }
  if (segOk) npass++;
  units.segRender = { ok: segOk, cells: segN };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key) { wLog.push(String(key)); };
  const wrongPlays = () => wLog.filter(k => k === 'ms_wrong').length;
  async function doWrong() {                       // 真实路径错放一次
    const q = MS.quiz;
    const non = rNonSolution(q.expr);
    await MS.tapStick(non.src);
    await MS.tapSlot(non.dst);
  }
  startLevel(0);                                   // flat0：每错必播
  await doWrong(); await doWrong();
  const sayA = wrongPlays();                       // → 2
  startLevel(3);                                   // flat3：10s 节流
  lastWrongVoice = Date.now();                     /* 显式进入节流窗口内 */
  await doWrong();
  const sayB = wrongPlays() - 2;                   // 增量 → 0
  startLevel(3);                                   // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                              /* 隔离上一子用例时间戳 */
  await doWrong();                                 // miss=1 → 播（窗口外）
  await doWrong();                                 // miss=2 → force → 播
  const sayC = wrongPlays() - 2 - sayB;            // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongShown = false, quizzesA = 0;
  {
    const q = MS.quiz;
    const non = rNonSolution(q.expr);
    await MS.tapStick(non.src);
    const r = await MS.tapSlot(non.dst);
    const el = stickEl(non.src);
    wrongShown = r === 'wrong' && el && !el.classList.contains('held') &&   /* 火柴已回原位（不拿着） */
      MS.currentLevel.retries === 1 && MS.currentLevel.step === 0 &&
      getComputedStyle(el).pointerEvents !== 'none';                        /* 不灰化可再点 */
  }
  const a0 = await MS.autoSolve();
  const lvA = MS.currentLevel;
  const smokeOkA = smokeA && wrongShown && a0.done && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongShown: wrongShown, moves: a0.moves, retries: lvA.retries };

  /* ---- ③ UI 冒烟 B：flat5（ch2）/ flat10（ch3 两位数）/ flat15（ch4 符号参与）autoSolve 3 星 ---- */
  for (const f of [5, 10, 15]) {
    total++;
    startLevel(f);
    const want = { 5: 2, 10: 3, 15: 4 }[f];
    let chOk = cur.dch === want;
    if (f === 10) {                                              /* ch3：每题数字段元=4（两位参与） */
      const L10v = genLevel(10);
      chOk = chOk && L10v.quizzes.every(q => q.cells.filter(c => c.kind === 'd').length === 4);
    }
    const a = await MS.autoSolve();
    const lv = MS.currentLevel;
    const okB = chOk && a.done && lv.done && lv.won && lv.retries === 0 && engStars(cur) === 3;
    if (okB) npass++;
    smokes['flat' + f] = { ok: okB, dch: cur.dch, moves: a.moves, stars: engStars(cur) };
  }

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch）：演示完整移动 → demoR 实证 → 重发同关 → 交接链 ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  window.__msDemoR = null;
  startLevel(0);
  await tutorialWatch();                          // 看：watch clip → 拿起→落位→成立演出 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const demoR = window.__msDemoR;
  const tutOk = pLog7.indexOf('ms_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    demoR === 'right' &&                                                   /* §0.27 演示真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&               /* 帮：解锁等孩子动手 */
    MS.currentLevel && MS.currentLevel.flat === 0 &&                      /* 重发同关 */
    MS.quiz && MS.quiz.step === 0 && MS.quiz.miss === 0 && MS.quiz.held === null &&   /* 新题面初态 */
    lastQ7 && lastQ7.length === 2 && lastQ7[0] === 'ms_tut_turn' &&      /* 交接顺序链单通道 */
    lastQ7[1] === 'ms_q';
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('ms_tut_watch') >= 0,
    demoR: demoR, handoff: !!lastQ7, parts: lastQ7, tut: state.tut };

  /* ---- ⑤ 布局：双 viewport ×（flat0/5/10/15）
     全部火柴/槽透明命中矩形 ≥64×64（M5）、按钮 ≥64（家长钮豁免）、SVG 非零、overflowX ≤0；
     横屏视口 elementFromPoint 中心采样命中自家 ---- */
  async function simLevel(w, h, flat, sample) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    await wait(360);                              // 布局稳定（无入场动画，纯保险）
    const de = document.documentElement;
    let hitOk = true, hitN = 0, minW = 1e9, minH = 1e9;
    sceneEl.querySelectorAll('.hit').forEach(hr => {
      const r = hr.getBoundingClientRect();
      if (r.width < 1) return;
      hitN++;
      minW = Math.min(minW, r.width); minH = Math.min(minH, r.height);
      if (r.width < 64 || r.height < 64) hitOk = false;
    });
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const sv = sceneEl.querySelector('svg.eq');
    const sr = sv ? sv.getBoundingClientRect() : null;
    const sceneOk = !!sr && sr.width >= 200 && sr.height >= 150;   // 场景 SVG 可见非零
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    /* elementFromPoint 采样（M5）：每根可点火柴命中矩形内 9 候选点（中心+轴向+近端角）
       至少一点命中自家（'+' 横竖交叉处归后画者属正常叠压，opL≥78 杆端露出命中带） */
    let sampled = 0, sampleOk = true;
    if (sample) {
      sceneEl.querySelectorAll('.stk:not(.locked)').forEach(el => {
        const r = el.querySelector('.hit').getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = r.width * 0.42, dy = r.height * 0.42;
        const cands = [[cx, cy], [cx - dx, cy], [cx + dx, cy], [cx, cy - dy], [cx, cy + dy],
          [cx - dx, cy - dy], [cx + dx, cy - dy], [cx - dx, cy + dy], [cx + dx, cy + dy]];
        let self = false, inVp = false;
        cands.forEach(pt => {
          if (pt[0] < 0 || pt[1] < 0 || pt[0] >= innerWidth || pt[1] >= innerHeight) return;
          inVp = true;
          const hitEl = document.elementFromPoint(pt[0], pt[1]);
          if (hitEl && hitEl.closest && hitEl.closest('.stk') === el) self = true;
        });
        if (inVp) { sampled++; if (!self) sampleOk = false; }
      });
    }
    return { vp: w + 'x' + h, flat: flat, hitOk: hitOk, hitN: hitN, minHit: [Math.round(minW), Math.round(minH)],
      btnOk: btnOk, sceneOk: sceneOk, ox: ox, sampled: sampled, sampleOk: sampleOk,
      pass: hitOk && hitN > 0 && btnOk && sceneOk && ox <= 0 && (!sample || (sampled >= 8 && sampleOk)) };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simLevel(1280, 800, f, true));
    sims.push(await simLevel(800, 1180, f, false));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / 族变换 / 救援重读 ---- */
  total++;
  /* SPEC §3 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！火柴动一动' &&
    VOICE.turn.text === '你来移一移' && VOICE.hint.text === '想一想，动哪一根' &&
    VOICE.wrong.text === '再移一移试试' && VOICE.right.text === '成立啦，你真聪明' &&
    VOICE.q.text === '移一根火柴，让算式成立' &&
    VOICE.pick.text === '拿起了一根' && VOICE.drop.text === '放好啦';
  /* ms_* 全部 8 条 clips 注入对账 + core 3 条 */
  const MS_KEYS = ['ms_tut_watch', 'ms_tut_turn', 'ms_hint', 'ms_wrong', 'ms_right', 'ms_q', 'ms_pick', 'ms_drop'];
  const clipOk = MS_KEYS.every(k => !!KIDS.voice.clips[k]);
  const coreOk = ['core_chapter_end', 'core_day_end', 'core_rest'].every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([ms_hint, ms_q]) 单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play;
  const qLog = [], playLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  startLevel(0);
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 2 && lastQ[0] === 'ms_hint' && lastQ[1] === 'ms_q';
  speakQuiz();                                    // 救援/重听：题面单 clip 播
  const rescueChain = playLog[playLog.length - 1] === 'ms_q';
  KIDS.voice.queue = origQ; KIDS.voice.play = origP;
  /* 族变换在解空间出现（ch2 偏好复算，阈值见实测） */
  const familyOk = familyN >= 5;
  const specOk = refVoice && clipOk && coreOk && openChain && rescueChain && familyOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, clips: clipOk, core: coreOk,
    openChain: openChain, rescueChain: rescueChain, familyN: familyN, opSolN: opSolN };

  const out = { game: 'matchstick', total: total, pass: npass, layoutOk: layoutOk,
    familyN: familyN, opSolN: opSolN,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
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
