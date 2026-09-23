/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39，每关一记）：确定性（同 flat 两次生成
     JSON 一致）/ 章号 1 基+难度章循环（生成关 dch∈[1,4] 随机）/ 盘型-K 章约束
     （dch1 全 2×2 K∈[3,6] / dch2 全 2×3 K∈[6,12] / dch3 全 3×3 K∈[12,20] /
     dch4 每关 ≥2 种盘型轮换）/ structWhy（posOf 互异且与 blank 互补、初始非完成态、
     非 opt=1 模式、path 长=K）/ 可解性双求解器（BFS 全表距离 opt≤K 且 ≥2 +
     IDA* solveStep 交叉验证 opt 相等且 first 滑入后距离恰减 1——SPEC §0.50
     构造即证明可解的独立复核）/ K 步构造对账（replayHome：path 重放回完成态）/
     引擎直驱（'wig' 非相邻拒绝不改盘不加 moves / 非法下标 null / 沿 path 全滑
     通关 moveTot=kTot=3★ / 带 wig 通关星级不变=零惩罚 / flat0 超步星级边界
     +2 次=3★ 边界、+4 次=2★）
   ② tapTile 单元（flat0 真实 UI）：DOM 与引擎对账（tile 数=n-1、data-i 序、
     块上无数字文本=textContent 空）/ wig=该块 wig 类+盘面不变+wigs 计数 /
     防重入窗内并发点=拒绝 / 有效滑=块位移+offsetLeft 变化+blank 移动 /
     复原一题=#reveal.show 闪现 + step 推进 / 非法下标 false
   ②b sayW 三态（页面单元）：flat<3 每次 'wig' 必播 / flat≥3 10s 节流 /
     wigs===2 豁免恰一次
   ②c 教学链单元：直调 tutorialWatch——watch clip → 演示滑 1 块（__slDemoR='slide'）
     →「空格旁边的，才能滑」→ 重发同关 → turn clip 接题面 TTS（queue 单通道）→
     state 'help'（钩子契约）
   ③ UI 冒烟 A：flat0 真实通路通关（含 1 次 wig=零惩罚 3★，verify 页不弹层）
   ④ UI 冒烟 B1：flat5（ch2）全 2×3 + SPEC 侧独立走法（BFS 贪心降距，不读引擎
     path）真实点击通关 3★；B2：flat10（ch3）全 3×3（8 块）+ autoSolve 3★；
     B3：flat15（ch4 盘型轮换 ≥2 种）+ autoSolve 3★
   ⑤ 布局：双 viewport（1280×800 / 800×1180）× flat{0,5,10,17}：tile=主答案 ≥64、
     全按钮 ≥64（.k-parentbtn 豁免）、mini 在场、blankcell 在场、#reveal 不显、
     overflowX ≤0 —— 量测全用 offsetWidth/offsetHeight
   ⑥ 分布与专项：VOICE 五条与 SPEC §2 文案逐字对账 / sli_* 5 + core 3 条 clips
     注入 / quizSpeech SPEC 例句 / 开场顺序链 stub（queue 首段 sli_hint 接题面）/
     生成关 dch 1-4 全覆盖 / 40 关三盘型全覆盖 / 图片 4 张按关轮换全覆盖
   结果写 #verify-result + document.title='VERIFY PASS n/n'（全部单元完成后才设 title） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const boardCov = {};

  /* ---- BFS 全表距离（从完成态反向；按盘型缓存）+ 参数版查询 ---- */
  const distTables = {};
  function distTable(W, H) {
    const tk = W + 'x' + H;
    if (distTables[tk]) return distTables[tk];
    const n = W * H;
    const enc = a => { let c = 0; for (let i = n - 1; i >= 0; i--) c = c * 9 + (a[i] + 1); return c; };
    const goal = Array.from({ length: n }, (_, p) => p < n - 1 ? p : -1);
    const dist = new Map([[enc(goal), 0]]);
    const qu = [goal];
    for (let head = 0; head < qu.length; head++) {
      const s = qu[head], d = dist.get(enc(s)), b = s.indexOf(-1);
      const cand = neighborsOf(b, W, H);
      for (let ci = 0; ci < cand.length; ci++) {
        const p = cand[ci];
        const t = s.slice(); t[b] = t[p]; t[p] = -1;
        const k2 = enc(t);
        if (!dist.has(k2)) { dist.set(k2, d + 1); qu.push(t); }
      }
    }
    distTables[tk] = dist;
    return dist;
  }
  function optFrom(posOf, blank, W, H) {
    const n = W * H, occ = Array.from({ length: n }, () => -1);
    posOf.forEach((p, id) => { occ[p] = id; });
    let c = 0;
    for (let i = n - 1; i >= 0; i--) c = c * 9 + (occ[i] + 1);
    const d = distTable(W, H).get(c);
    return d === undefined ? -1 : d;
  }
  const bfsOpt = q => optFrom(q.posOf, q.blank, q.W, q.H);
  /* 钩子快照辅助：非相邻块 id / 空格相邻块 id */
  const snap = q => ({ posOf: q.tiles.map(t => t.pos), blank: q.blank, W: q.W, H: q.H });
  const nonAdjIds = sq => {
    const out = [];
    for (let id = 0; id < sq.W * sq.H - 1; id++) {
      const p = sq.posOf[id], b = sq.blank;
      if (Math.abs(p % sq.W - b % sq.W) + Math.abs(Math.floor(p / sq.W) - Math.floor(b / sq.W)) !== 1) out.push(id);
    }
    return out;
  };
  const adjIdsOf = sq => {
    const occ = Array.from({ length: sq.W * sq.H }, () => -1);
    sq.posOf.forEach((p, id) => { occ[p] = id; });
    return [sq.blank - 1, sq.blank + 1, sq.blank - sq.W, sq.blank + sq.W]
      .filter(p => p >= 0 && p < sq.W * sq.H &&
        Math.abs(p % sq.W - sq.blank % sq.W) + Math.abs(Math.floor(p / sq.W) - Math.floor(sq.blank / sq.W)) === 1)
      .map(p => occ[p]);
  };
  /* 沿 path 全滑驱动器（直驱/autoSolve 同源逻辑） */
  function drivePath(L) {
    let last = null, guard = 0, qi = -1, pi = 0;
    while (!L.done && guard++ < 130) {
      if (L.step !== qi) { qi = L.step; pi = 0; }
      const q = L.quizzes[qi];
      last = engTap(L, q.path[pi]);
      if (last === 'slide') pi++;
      if (last !== 'slide' && last !== 'goal' && last !== 'done') return last;
    }
    return last;
  }

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  let starsEdgeOk = true;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch) : (L1.dch >= 1 && L1.dch <= 4);
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    const sizes = L1.quizzes.map(q => q.W + 'x' + q.H);
    sizes.forEach(s => { boardCov[s] = (boardCov[s] || 0) + 1; });
    /* 盘型-K 章约束（SPEC §2 试玩P1 勘误：ch1 2×2 K∈[3,6]/ch2 2×3 K∈[6,12]/ch3 3×3 K∈[8,12]；
       dch4 生成关盘型轮换 ≥2 种且去 3×3） */
    const BAND = { 1: { s: '2x2', lo: 3, hi: 6 }, 2: { s: '3x2', lo: 6, hi: 12 }, 3: { s: '3x3', lo: 8, hi: 12 } };
    let planOk = true;
    if (L1.dch <= 2 || (L1.dch === 3 && flat < STATIC_LEVELS)) {
      const B = BAND[L1.dch];                       /* 静态章全同盘型（dch3 静态=3×3 K∈[8,12]） */
      planOk = L1.quizzes.every(q => q.W + 'x' + q.H === B.s && q.K >= B.lo && q.K <= B.hi);
    } else {
      planOk = L1.quizzes.every(q => ['2x2', '3x2'].indexOf(q.W + 'x' + q.H) >= 0) &&
               new Set(sizes).size >= 2;            /* 生成关（dch4+生成 dch3）无 3×3（试玩P1 勘误） */
    }
    let structAll = true, solveAll = true, pathAll = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q)) structAll = false;
      /* 可解性双求解器：BFS 全表 opt ≤ K（构造即证明可解的独立复核）且 ≥2（K 下限防平凡）
         + IDA* 交叉验证（opt 相等 + first 滑入后距离恰减 1） */
      const opt = bfsOpt(q);
      const s = solveStep(q);
      if (opt < 2 || opt > q.K || !s || s.opt !== opt) { solveAll = false; continue; }
      const posOf2 = q.posOf.slice();
      const p0 = posOf2[s.first];
      posOf2[s.first] = q.blank;
      if (optFrom(posOf2, p0, q.W, q.H) !== opt - 1) solveAll = false;
      if (!replayHome(q)) pathAll = false;                          // K 步构造对账
    }
    /* 引擎直驱：wig 拒绝（盘面不变/零惩罚仅计 wigs）/ 非法下标 null / path 全滑通关 3★
       / 带 wig 通关星级不变（wig 非错误零惩罚） */
    const Ld = genLevel(flat);
    const q0 = Ld.quizzes[0];
    const before = JSON.stringify(q0.posOf);
    const na = nonAdjIds({ posOf: q0.posOf, blank: q0.blank, W: q0.W, H: q0.H });
    let driveOk = true;
    if (na.length) {
      if (engTap(Ld, na[0]) !== 'wig' || JSON.stringify(q0.posOf) !== before ||
          q0.moves !== 0 || q0.wigs !== 1 || Ld.moveTot !== 0) driveOk = false;
    } else driveOk = false;                                         // 任何盘型恒存在非相邻块
    if (engTap(Ld, 99) !== null || engTap(Ld, -1) !== null) driveOk = false;
    if (drivePath(Ld) !== 'done' || !Ld.done || Ld.moveTot !== Ld.kTot || engStars(Ld) !== 3) driveOk = false;
    const Lw = genLevel(flat);                                      // 带 3 次 wig 通关：星级不变
    const naw = nonAdjIds({ posOf: Lw.quizzes[0].posOf, blank: Lw.quizzes[0].blank, W: Lw.quizzes[0].W, H: Lw.quizzes[0].H });
    for (let w = 0; w < 3 && naw.length; w++) engTap(Lw, naw[0]);
    if (drivePath(Lw) !== 'done' || !Lw.done || engStars(Lw) !== 3 || Lw.quizzes[0].wigs !== 3) driveOk = false;
    if (flat === 0) {                                               // 星级口径边界（仅 flat0）
      const Lx = genLevel(0);
      const qx = Lx.quizzes[0];
      const a = qx.path[0];
      engTap(Lx, a); engTap(Lx, a);                                 // 1 次往返（+2 moves 零进展）
      drivePath(Lx);
      if (!Lx.done || Lx.moveTot !== Lx.kTot + 2 || engStars(Lx) !== 3) starsEdgeOk = false;  // 边界=3★
      const Ly = genLevel(0);
      const qy = Ly.quizzes[0];
      const b = qy.path[0];
      engTap(Ly, b); engTap(Ly, b); engTap(Ly, b); engTap(Ly, b);   // 2 次往返（+4）
      drivePath(Ly);
      if (!Ly.done || Ly.moveTot !== Ly.kTot + 4 || engStars(Ly) !== 2) starsEdgeOk = false;  // 超 2=2★
    }
    const ok = det && chOk && dchOk && planOk && structAll && solveAll && pathAll && driveOk &&
               L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, planOk: planOk, structAll: structAll,
                  solveAll: solveAll, pathAll: pathAll, driveOk: driveOk,
                  qs: L1.quizzes.map(q => q.W + 'x' + q.H + 'K' + q.K + '[' + bfsOpt(q) + ']') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  total++;                                                          // 星级边界独立记
  if (starsEdgeOk) npass++;
  units.starsEdge = { ok: starsEdgeOk };

  /* ---- ② tapTile 单元（flat0 真实 UI 状态机，ch1 2×2） ---- */
  total++;
  startLevel(0);
  const q0 = SL.quiz;
  const els = Array.prototype.slice.call(boardEl.querySelectorAll('.tile'));
  /* DOM 对账：tile 数=n-1、data-i 序、块上禁数字标号（textContent 空+aria 无数字）、
     blankcell 在场、每块含 .art（完整 SVG 对应区域） */
  const sub = {
    n: !!q0 && els.length === q0.tiles.length,
    ids: !!q0 && els.every((e, i) => Number(e.dataset.id) === i),
    text: els.every(e => e.textContent === ''),
    aria: els.every(e => !/\d/.test(e.getAttribute('aria-label') || '')),
    art: els.every(e => !!e.querySelector('.art')),
    blank: !!blankEl(),
    grid: !!q0 && q0.grid.W === 2 && q0.grid.H === 2
  };
  const alignOk = sub.n && sub.ids && sub.text && sub.aria && sub.art && sub.blank && sub.grid;
  const sq0 = snap(q0);
  const na0 = nonAdjIds(sq0);
  const before2 = JSON.stringify(sq0.posOf.concat([sq0.blank]));
  const pW = SL.tapTile(na0[0]);                          // 非相邻块：'wig' 拒绝（异步开窗）
  const pW2 = SL.tapTile(adjIdsOf(sq0)[0]);               // 防重入窗内并发：应拒绝
  const rW2 = await pW2, rW = await pW;
  const sqAfterWig = snap(SL.quiz);
  const wigOk = rW === 'wig' && rW2 === false &&
    JSON.stringify(sqAfterWig.posOf.concat([sqAfterWig.blank])) === before2 &&
    SL.quiz.moves === 0 && SL.quiz.wigs === 1 &&
    tileEl(na0[0]).classList.contains('wig');
  /* 有效滑入：块位移指令已下达（style.left/top 同步终值——SPEED 提速下 transition
     可能未离起始帧，offset 读取不稳；px 布局量测由 ⑤ tile64 覆盖）+ blank 移动 + moves=1 */
  const slideId = adjIdsOf(sq0)[0];
  const elS = tileEl(slideId), sl0 = elS.style.left, st0 = elS.style.top;
  const rS = await SL.tapTile(slideId);
  const slideSub = { r: rS, moves: SL.quiz && SL.quiz.moves,
    pos: SL.quiz ? SL.quiz.tiles.find(t => t.id === slideId).pos : null,
    wantPos: sq0.blank, blank: SL.quiz ? SL.quiz.blank : null, wantBlank: sq0.posOf[slideId],
    moved: elS.style.left !== sl0 || elS.style.top !== st0 };
  const slideOk = slideSub.r === 'slide' && slideSub.moves === 1 &&
    slideSub.pos === slideSub.wantPos && slideSub.blank === slideSub.wantBlank && slideSub.moved;
  const badIdx = (await SL.tapTile(99)) === false && (await SL.tapTile(-1)) === false &&
    (await SL.tapTile('x')) === false && (await SL.tapTile(1.5)) === false;
  /* 沿 path 滑完本盘：最后一步 goal——#reveal.show 闪现 + 换盘 step 推进
     （重发干净盘，path 进度锚=moves；最后一步拆出捕获 reveal 窗口 ~126ms） */
  startLevel(0);
  const qd = SL.quiz;
  const path0 = genLevel(0).quizzes[0].path;
  let moved = 0, restOk = true, revealShown = false;
  while (SL.quiz && SL.quiz.step === 0 && moved < qd.K - 1) {
    const r = await SL.tapTile(path0[SL.quiz.moves]);
    moved++;
    if (r !== 'slide') { restOk = false; break; }
  }
  if (restOk) {
    const pLast = SL.tapTile(path0[SL.quiz.moves]);
    await wait(60);                                       // 滑入动画(25ms)后 revealShow 同步已发生，换盘(151ms)未到
    const rv = boardEl.querySelector('#reveal');
    revealShown = !!rv && rv.classList.contains('show');
    const rLast = await pLast;
    moved++;
    if (rLast !== 'goal') restOk = false;
  }
  const nextOk = restOk && moved === qd.K && revealShown &&
    SL.quiz && SL.quiz.step === 1 && SL.quiz.moves === 0 &&
    document.querySelectorAll('#step-dots i.done').length === 1;
  const tapOk = alignOk && wigOk && slideOk && badIdx && nextOk;
  if (tapOk) npass++;
  units.tapTile = { ok: tapOk, align: alignOk, alignSub: sub, wig: wigOk, slideSub: slideSub, badIdx: badIdx,
    next: nextOk, reveal: revealShown };

  /* ---- ②b sayW 三态（页面单元）：flat<3 每次 wig 必播 / flat≥3 10s 节流 / 豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 3)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'sli_wrong').length;
  const wigIdx = () => nonAdjIds(snap(SL.quiz))[0];
  startLevel(0);                                          // flat0：每次 wig 必播（连 wig 两次）
  await SL.tapTile(wigIdx());
  await SL.tapTile(wigIdx());
  const sayA = wrongPlays();                              // → 2
  startLevel(3);                                          // flat3：10s 节流
  lastWrongVoice = Date.now();
  await SL.tapTile(wigIdx());                             // wigs=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                          // 增量 → 0
  startLevel(3);                                          // 同关重发 fresh quiz：豁免恰一次（wigs===2）
  lastWrongVoice = 0;
  await SL.tapTile(wigIdx());                             // wigs=1 → 播（节流窗外）
  await SL.tapTile(wigIdx());                             // wigs=2 → force → 播
  const sayC = wrongPlays() - 2 - sayB;                   // 增量 → 2
  startLevel(5);                                          // ch2 2×3：第三次 wig 不再豁免
  lastWrongVoice = 0;
  const w5 = [wigIdx(), wigIdx(), wigIdx()];
  for (const w of w5) await SL.tapTile(w);                // wigs=1,2,3
  const sayD = wrongPlays() - 2 - sayB - sayC;            // 增量 → 2（第三次 force=false 窗内静默）
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && sayD === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, thirdWig: sayD };

  /* ---- ②c 教学链单元：直调 tutorialWatch（watch clip→演示滑 1 块→say→重发→turn 接力） ---- */
  total++;
  const qLog = [], pLog3 = [], sLog3 = [];
  const origQ3 = KIDS.voice.queue, origP3 = KIDS.voice.play, origS3 = KIDS.voice.say;
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog3.push(String(key)); };
  KIDS.voice.say = function (t) { sLog3.push(String(t)); };
  startLevel(0);                                          // 干净起点（openingSpeak 走 stub 不入对账段）
  await tutorialWatch();                                  // SPEED=0.12 提速：看-演示很快完成
  const lastParts = qLog[qLog.length - 1];
  const q0t = SL.quiz;
  const tutOk = pLog3.indexOf('sli_tut_watch') >= 0 &&    /* 看=演示配 watch clip */
    window.__slDemoR === 'slide' &&                      /* §0.27 演示判对真实生效（滑 1 块） */
    pLog3.indexOf('sli_adj') >= 0 &&                     /* 演示配「空格旁边的，才能滑」（T46 clip） */
    state.tut === 'help' && !state.demo && !state.locked &&   /* 帮：解锁等孩子动手 */
    SL.currentLevel && SL.currentLevel.flat === 0 &&      /* 重发同关（确定性同盘） */
    q0t && q0t.step === 0 && q0t.moves === 0 && q0t.wigs === 0 &&   /* 新盘初态零污染 */
    lastParts && lastParts[0] === 'sli_tut_turn' &&       /* 交接链=turn clip 单通道 */
    lastParts[1] && lastParts[1].key === 'sli_q' &&       /* 接题面 clip（T46 补键后链尾 sli_q 在册） */
    lastParts[1].text === quizSpeech();
  KIDS.voice.queue = origQ3; KIDS.voice.play = origP3; KIDS.voice.say = origS3;
  startLevel(0);                                          // 还原正常状态（后续单元用）
  if (tutOk) npass++;
  units.tutChain = { ok: tutOk, demoR: window.__slDemoR, handoff: lastParts ? lastParts[0] : null,
    say: pLog3.filter(k => k === 'sli_adj').slice(0, 1), tut: state.tut };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（含 1 次 wig=零惩罚 3★，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wigOk2 = false, quizzes = 0;
  const LA = genLevel(0);
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = SL.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                                        // 首盘先 wig 一次：轻晃+盘面不变+零惩罚
      const wi = nonAdjIds(snap(q))[0];
      await SL.tapTile(wi);
      wigOk2 = SL.currentLevel.moves === 0 && SL.currentLevel.step === 0 &&
        SL.quiz.moves === 0 && SL.quiz.wigs === 1;
    }
    let g2 = 0;
    while (SL.quiz && SL.quiz.step === s && g2++ < 30) {  // path 真源驱动（同 flat 确定性）
      const r = await SL.tapTile(LA.quizzes[s].path[SL.quiz.moves]);
      if (r !== 'slide' && r !== 'goal' && r !== 'done') { smokeA = false; break; }
    }
    if (SL.quiz && SL.quiz.step === s) smokeA = false;
    quizzes++;
  }
  const lvA = SL.currentLevel;
  const smokeOkA = smokeA && wigOk2 && quizzes === CH_LEN && lvA.done && lvA.won &&
    lvA.moves === lvA.kTot && engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wigOk: wigOk2, quizzes: quizzes, moves: lvA.moves, kTot: lvA.kTot, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat5（ch2）全 2×3 + SPEC 侧独立走法（BFS 贪心降距）通关 ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const b3Ok = L5.dch === 2 && L5.quizzes.every(q => q.W === 3 && q.H === 2 && q.K >= 6 && q.K <= 12);
  /* SPEC 侧独立走法走的是最优解：总 moves 应=Σopt（≠ΣK=构造步数——贪心降距不重走构造弯路） */
  const optSum5 = L5.quizzes.reduce((s, q) => s + bfsOpt(q), 0);
  let tap5 = true, sawBad = 0;
  for (let s = 0; s < CH_LEN && tap5; s++) {
    let g5 = 0;
    while (SL.quiz && SL.quiz.step === s && g5++ < 26) {
      const q = SL.quiz;
      if (q.grid.W !== 3 || q.grid.H !== 2) { sawBad++; tap5 = false; break; }
      /* SPEC 侧走法：空格相邻块中选招「滑入后 BFS 距离恰减 1」——独立求解器驱动，
         不读引擎 path/IDA* */
      const curOpt = optFrom(q.tiles.map(t => t.pos), q.blank, q.W, q.H);
      let pick = -1;
      for (const t of q.tiles) {
        const dd = Math.abs(t.pos % q.W - q.blank % q.W) + Math.abs(Math.floor(t.pos / q.W) - Math.floor(q.blank / q.W));
        if (dd !== 1) continue;
        const posOf2 = q.tiles.map(x => x.id === t.id ? q.blank : x.pos);
        if (optFrom(posOf2, t.pos, q.W, q.H) === curOpt - 1) { pick = t.id; break; }
      }
      if (pick < 0) { tap5 = false; break; }
      const r = await SL.tapTile(pick);
      if (r !== 'slide' && r !== 'goal' && r !== 'done') { tap5 = false; break; }
    }
  }
  const lv5 = SL.currentLevel;
  const smokeOkB1 = b3Ok && tap5 && sawBad === 0 && lv5.done && lv5.won &&
    lv5.moves === optSum5 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, boards: b3Ok, moves: lv5.moves, optSum: optSum5, kTot: lv5.kTot, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat10（ch3）全 3×3（8 块）+ autoSolve 3★ ---- */
  total++;
  startLevel(10);
  const L10 = genLevel(10);
  const tiles9 = boardEl.querySelectorAll('.tile').length;
  const nineOk = L10.dch === 3 && L10.quizzes.every(q => q.W === 3 && q.H === 3 && q.K >= 8 && q.K <= 12) &&
    tiles9 === 8;                                   /* 试玩P1 勘误：3×3 K∈[8,12] */
  const a10 = await SL.autoSolve();
  const lv10 = SL.currentLevel;
  const smokeOkB2 = nineOk && a10.done && lv10.done && lv10.won &&
    lv10.moves === lv10.kTot && engStars(cur) === 3;
  if (smokeOkB2) npass++;
  smokes.flat10 = { ok: smokeOkB2, nine: nineOk, tiles: tiles9, taps: a10.taps, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B3：flat15（ch4 生成关盘型轮换 ≥2 种）+ autoSolve 3★ ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const mixOk = L15.dch === 4 && new Set(L15.quizzes.map(q => q.W + 'x' + q.H)).size >= 2;
  const a15 = await SL.autoSolve();
  const lv15 = SL.currentLevel;
  const smokeOkB3 = mixOk && a15.done && lv15.done && lv15.won &&
    lv15.moves === lv15.kTot && engStars(cur) === 3;
  if (smokeOkB3) npass++;
  smokes.flat15 = { ok: smokeOkB3, mix: mixOk, plan: L15.quizzes.map(q => q.W + 'x' + q.H),
    taps: a15.taps, stars: engStars(cur) };

  /* ---- ⑤ 布局：双 viewport × flat{0,5,10,17}（量测 offsetWidth/offsetHeight；
     百分比布局 resize 免重排，仍等入场 stagger 动画结束再量（§0.11 防御） ---- */
  async function simView(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();
    await wait(850);
    const de = document.documentElement;
    const q = SL.quiz;
    const sts = Array.prototype.slice.call(boardEl.querySelectorAll('.tile'));
    let countOk = sts.length === q.tiles.length;                     // n 块 + data 对账
    sts.forEach((e, i) => { if (Number(e.dataset.id) !== i) countOk = false; });
    const tileOk = sts.every(e => e.offsetWidth >= 64 && e.offsetHeight >= 64);   /* 主答案 ≥64 */
    let btnOk = true;                                                // 全部按钮 ≥64（家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      if (b.offsetWidth > 4 && b.offsetHeight > 4 &&
          (b.offsetWidth < 64 || b.offsetHeight < 64)) btnOk = false;
    });
    const miniOk = $id('mini').offsetWidth > 80 && !!miniArtEl.querySelector('svg');   /* 小样恒可见 */
    const blankOk = !!blankEl() && blankEl().offsetWidth >= 64;      /* 空格软框在场 */
    const rv = boardEl.querySelector('#reveal');
    const revealHidden = !rv || rv.offsetWidth === 0;                /* 盖盘层默认不显 */
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, n: q.tiles.length, countOk: !!countOk, tile64: tileOk,
             btn64: btnOk, mini: miniOk, blank: blankOk, revealHidden: revealHidden, ox: ox,
             pass: !!countOk && tileOk && btnOk && miniOk && blankOk && revealHidden && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 17]) {
    sims.push(await simView(1280, 800, f));
    sims.push(await simView(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                       // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案同源 / clips 注入 / SPEC 例句 / 开场链 / 覆盖 ---- */
  total++;
  /* VOICE 五条与 SPEC §2 文案逐字对账（禁手抄 manifest——REF 即 SPEC 原文） */
  const REF = [['watch', 'sli_tut_watch', '看！滑一滑拼照片'],
               ['turn', 'sli_tut_turn', '你来拼一拼'],
               ['hint', 'sli_hint', '看看空格旁边'],
               ['right', 'sli_right', '拼好啦，照片真好看'],
               ['wrong', 'sli_wrong', '这块动不了，试试空格旁边的']];
  const srcOk = REF.every(r => VOICE[r[0]].key === r[1] && VOICE[r[0]].text === r[2]);
  /* sli_* 7 条（5 既有+T46 阶段2 2：sli_q 补缺键+sli_adj 演示句）+ core 3 条 clips 注入对账
     （build 断言 10 条，此处验 KIDS.voice.clips 全含且恰 10） */
  const SLI_KEYS = ['sli_tut_watch', 'sli_tut_turn', 'sli_hint', 'sli_right', 'sli_wrong',
                    'sli_q', 'sli_adj'];
  const CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const clipOk = SLI_KEYS.concat(CORE_KEYS).every(k => !!KIDS.voice.clips[k]) &&
    Object.keys(KIDS.voice.clips).length === 10;
  /* quizSpeech SPEC 例句对账（§2：把小兔子的照片拼好吧） */
  const spOk = quizSpeech() === '把小兔子的照片拼好吧';
  /* 开场顺序链（stub 记录）：queue 首段 sli_hint → 第二段=题面 TTS 文本（单通道接力） */
  const origQ6 = KIDS.voice.queue;
  const qLog6 = [];
  KIDS.voice.queue = function (parts) { qLog6.push(parts.slice()); };
  startLevel(0);
  const openParts = qLog6[qLog6.length - 1];
  const openOk = !!openParts && openParts[0] === 'sli_hint' &&
    !!openParts[1] && openParts[1].text === quizSpeech();
  KIDS.voice.queue = origQ6;
  /* 覆盖：生成关 dch 1-4 全覆盖 / 40 关三盘型全覆盖 / 图片 4 张按关轮换全覆盖 */
  const picCov = {};
  for (let f = 0; f < 40; f++) { picCov[picOf(f)] = (picCov[picOf(f)] || 0) + 1; }
  const picOk = Object.keys(picCov).length === 4 && Object.keys(PICS).length === 4 &&
    Object.values(PICS).every(v => !!v);
  const distOk = srcOk && clipOk && spOk && openOk && picOk &&
    genDch[1] >= 1 && genDch[2] >= 1 && genDch[3] >= 1 && genDch[4] >= 1 &&
    boardCov['2x2'] >= 1 && boardCov['3x2'] >= 1 && boardCov['3x3'] >= 1;
  if (distOk) npass++;
  units.dist = { ok: distOk, voiceSrc: srcOk, clips: clipOk, speech: spOk, openChain: openOk,
    pics: picOk, genDch: genDch, boardCov: boardCov };

  const out = { game: 'slide', total: total, pass: npass, levels: levels, gen: gen,
                units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
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
