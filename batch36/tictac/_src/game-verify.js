/* ================= ?verify=1 自检（仅 verify 分支加载执行）——20 单元（r18）
   ① 结构：格 DOM（battle/puzzle 9 格·v44 16 格）/双头像亮灯/契约 O button 显式 color/
     触摸目标 ≥96×96/clips tk_ 13+core 3=16 全注入+实长辨别（±60ms）/四型双档 simView
     布局（flat 0/24/30/36 × 1280×800/800×1180）+关常量域（CH_LEN 6/STATIC 42 等）
   ② 教学三段：watch 幽灵手指看一局走完 __tkDemoR='done'→演示期 tapCell=null→turn 帮→独
     →迷你局走完自动 startLevel(0)；watch 折算 ≤16s；教学局无复盘
   ③ 逐关驱动 flat0-23（classic 四章，自写 minimax 走最优）：board 演化合法/round 推进/
     score 记分/step=flat*3+round-1/final() 快照/通关 stars 复算/无负局（review 恒 null）
   ④ 契约 M 帧内容断言三层 ×四型（battle flat0/v44 flat30 tap 后，puzzle flat24 静态）：
     数值层↔渲染层；演出层胜线 .wincell===final().line
   ⑤ 终局路径专项（classic）：胜=ch1 随机兔 DFS/平=ch4(flat18) 最优=3 平/负=ch4 完美兔 DFS
   ⑥ AI 档位专项（classic）：ch4 perfect 独立 minimax ≥20 局面同格+ch3 漏率 seeded+ch2 必堵+ch1 随机域
   ⑦ 星级双口径（引擎直测）：battle 分值制；puzzle miss 制（0→3★/1,2→2★/≥3→1★）永不 0★
   ⑧ 生成关 flat42-61：kind 恒 battle+dch 独立复算+确定性+局 RNG 分流实驱+两次全驱一致+dch1-4 全现
   ⑨ 源码级：契约族 A(r17 双 lim-1)/B/C/D/E/F/I(r18 四字面+guard 前置+让路+重置)/J/K(+复盘层守卫)/
     MIG(三字面+先于 init)/T(estMs 单定义)/窗常量族/DECIDE_MS 字面/新引擎族在场
   ⑩ 链构成：胜/平/负三链单发+残局判对/判错链——全 clip 无 keyless（契约 N 天然）
   ⑪ 写档（origLS 模式）：KIDS.init 真跑+autoSolve 通关→levels['1-0'] 写档 v1.0 对账
   ⑫ 真实路径：fresh v1.0 档 start(0) battle 形态+已占格 false+四型 kind 域（battle/v44/vroll）
   ⑬ 残局专项：30 题独立复算（vPuzAnswer 谓词+答案+题型日程+k 平衡）+确定性+miss/豁免窗
     （窗内吞/窗后计）/J 节流（miss 照计链不重播）/miss≥2 答案 breathe/step=flat*5+题号-1
   ⑭ v44 专项：LINES16 双录（SPEC §3 24 条独立重列）+flat30-35 结构确定性+参考 AI 逐手对账
     （兔子应手=独立 vV44 复算同格）+合法性+整关 3 局 stars+两次全驱一致
   ⑮ vroll 专项：参考引擎独立复算（含移子 FIFO/收束）lockstep 逐手对账+oldest DOM 标记+
     整关 3 局+stars
   ⑯ 复盘专项：负局 TK.review=独立 vReview 回溯首误步对账（moveNo/missCell/bestCell/
     boardBefore）+复盘层 DOM（红=miss/绿=best）+胜局无复盘
   ⑰ 全谱实证：空盘起 X 全策略×O=页面 engPerfectPick 整树 DFS——任何叶局无 X 胜+独立
     vPerfect 全 O 位同格+总节点 ≥1500（O 决策节点 ≥500——python 先验 768）
   ⑱ 时长模型：DECIDE_MS 字面+modeled 四型精确钉（battle 99660/puzzle 88020/v44=vroll
     166860——SPEC §-r18 §4 禁约数）+全 42 静态关最低=88020+全关 ≥40000+生成关=battle 值
     +verify 独立重列 vModeled 逐关对账（flat0-61）
   ⑲ 章预告：CHAPTERS 7 章名+hint 双录+nextHint 章末逐点（5/11/17/23/29/35/41）+生成关
     （47/53/59）实算 GEN_HINTS[dch-1]+禁右移哨兵
   ⑳ SPEED=0.12（verify 页演出提速口径）
   期望值全独立硬编码（SPEC-BATCH36 §0.90/§3/§4/§-r18 文字重列，禁从实现归纳）；
   结果写 #verify-result + window.__tkVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH36 §0.90/§3/§4/§-r18 文字独立重列（禁抄页面 VOICE/文案/表） */
  const SPEC_VOICE = {
    tk_tut_watch: '看！三个连一线', tk_tut_turn: '你来下一局', tk_hint: '想办法连成三个',
    tk_right: '赢啦，小冠军', tk_draw: '平局啦，打得真棒', tk_lose: '兔子赢啦，再来一局',
    tk_puz_win: '一步就能赢，找那一格', tk_puz_block: '兔子快连成啦，堵住它',
    tk_puz_fork: '好棋，一步造两条线', tk_wrong: '再看看棋盘想一想',
    tk_review: '这一步，下这里更好', tk_v44: '大棋盘，三个连一线', tk_vroll: '只有三颗子，下新的收旧的'
  };
  const SPEC_DUR = { tk_tut_watch: 2952, tk_tut_turn: 1752, tk_hint: 2400,   // _clipdur36.json 实测
                     tk_right: 2304, tk_draw: 2544, tk_lose: 2712,
                     tk_puz_win: 2904, tk_puz_block: 2952, tk_puz_fork: 2856,
                     tk_wrong: 2448, tk_review: 2712, tk_v44: 2856, tk_vroll: 3336 };
  const SPEC_WINS = { win: 2604, draw: 2844, lose: 3012 };   // §4：实长+300（三链独立单发）
  const SPEC_WRONG_CHAIN = 2748;                              // §-r18 §5：tk_wrong 2448+300
  const SPEC_REVIEW_MS = 4512;                                // §-r18 §7：tk_review 2712+300+1500
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_CHAPTERS = { 1: '兔子随便下', 2: '兔子会防守', 3: '聪明兔登场', 4: '冠军大挑战',
                          5: '残局小侦探', 6: '大棋盘三连', 7: '三子滚动' };
  const SPEC_CHAPTER_HINTS = { 1: '兔子学会防守啦', 2: '兔子会动脑筋啦', 3: '最厉害的兔子来啦',
                               4: '残局小侦探开始啦', 5: '更大的棋盘来啦', 6: '棋子会滚动回家啦',
                               7: '新一轮井字棋开始' };
  const SPEC_GEN_HINTS = ['兔子随便下', '兔子会防守', '聪明兔登场', '冠军大挑战'];
  const SPEC_KINDS = { 1: 'battle', 2: 'battle', 3: 'battle', 4: 'battle',
                       5: 'puzzle', 6: 'v44', 7: 'vroll' };
  const SPEC_CONSTS = { CH_LEN: 6, N_CHAPTERS: 7, STATIC_LEVELS: 42, ROUNDS: 3,
                        PUZZLES: 5, ROLL_CAP_PIECES: 3, ROLL_MOVE_CAP: 36 };
  const SPEC_DECIDE = { battle: 7000, puzzle: 12000, v44: 8000, vroll: 8000 };
  const SPEC_NOMINAL = { battle: { moves: 4, rabbit: 3 }, v44: { moves: 6, rabbit: 6 },
                         vroll: { moves: 6, rabbit: 6 } };
  const SPEC_MODELED = { battle: 99660, puzzle: 88020, v44: 166860, vroll: 166860 };
  const SPEC_LEVEL_MIN = 40000;
  const SPEC_PUZ_SCHED = [
    { types: ['win1'], k: 2 }, { types: ['win1'], k: 3 }, { types: ['block1'], k: 2 },
    { types: ['fork'], k: 2 }, { types: ['win1', 'block1'], k: 3 },
    { types: ['win1', 'block1', 'fork'], k: 3 }];
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落地余量

  /* ---- verify 独立复算件（SPEC 文字口径自写，禁抄 engine）---- */
  const sleep = ms => new Promise(w => setTimeout(w, ms));
  const m32v = a => function () {                // mulberry32 复刻（家族取数器）
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  function M32(seed) { this.a = seed | 0; }      // 可克隆态（DFS 构造用）
  M32.prototype.n = function () {
    this.a = this.a + 0x6D2B79F5 | 0;
    let t = Math.imul(this.a ^ this.a >>> 15, 1 | this.a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const riV = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  const LINES_V = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const vEmpties = bd => { const e = []; for (let i = 0; i < bd.length; i++) if (!bd[i]) e.push(i); return e; };
  function vScan(bd) {
    for (const L of LINES_V)
      if (bd[L[0]] && bd[L[0]] === bd[L[1]] && bd[L[1]] === bd[L[2]])
        return { who: bd[L[0]], line: L.slice() };
    return null;
  }
  function vWinPts(bd, p) {
    const out = [];
    for (const L of LINES_V) {
      const v = [bd[L[0]], bd[L[1]], bd[L[2]]];
      if (v.filter(x => x === p).length === 2 && v.indexOf('') >= 0) out.push(L[v.indexOf('')]);
    }
    return out;
  }
  /* 独立 minimax（O 视角：O 胜=10-depth / X 胜=depth-10 / 平=0；升序严格更优，平分取
     最小下标——SPEC §0.90「minimax 全展开」+ §3 复算锚公约） */
  function vMm(bd, turn, depth) {
    const w = vScan(bd);
    if (w) return w.who === 'O' ? 10 - depth : depth - 10;
    const e = vEmpties(bd);
    if (!e.length) return 0;
    let best = turn === 'O' ? -99 : 99;
    for (const i of e) {
      bd[i] = turn;
      const s = vMm(bd, turn === 'O' ? 'X' : 'O', depth + 1);
      bd[i] = '';
      if (turn === 'O' ? s > best : s < best) best = s;
    }
    return best;
  }
  function vPerfect(bd) {                        // O 完美应手（ch4 复算+全谱锚）
    let best = -99, pick = -1;
    for (const i of vEmpties(bd)) {
      bd[i] = 'O'; const s = vMm(bd, 'X', 1); bd[i] = '';
      if (s > best) { best = s; pick = i; }
    }
    return pick;
  }
  function vBestX(bd) {                          // X 最优应手（逐关驱动/平局构造）
    let best = 99, pick = -1;
    for (const i of vEmpties(bd)) {
      bd[i] = 'X'; const s = vMm(bd, 'O', 1); bd[i] = '';
      if (s < best) { best = s; pick = i; }
    }
    return pick;
  }
  /* 兔子四档 SPEC 序复算（rng 消耗序=SPEC §3 头注口径：ch1 随机 1 次/ch2 堵否则 1 次/
     ch3 杀→堵→漏率(2 次)→中→角→随机(1 次)/ch4 minimax 零消耗） */
  function vRabbit(dch, bd, r) {
    const e = vEmpties(bd);
    if (dch <= 1) return e[Math.floor(r() * e.length)];
    if (dch === 2) {
      const fw = vWinPts(bd, 'X');
      if (fw.length) return fw[0];
      return e[Math.floor(r() * e.length)];
    }
    if (dch === 3) {
      const ow = vWinPts(bd, 'O'); if (ow.length) return ow[0];
      const fw = vWinPts(bd, 'X'); if (fw.length) return fw[0];
      if (r() < 0.2) return e[Math.floor(r() * e.length)];
      if (!bd[4]) return 4;
      for (const c of [0, 2, 6, 8]) if (!bd[c]) return c;
      return e[Math.floor(r() * e.length)];
    }
    return vPerfect(bd);
  }
  const vStars = s => (s >= 2.5 ? 3 : s >= 1.5 ? 2 : 1);   // 对战分值制（§0.90）
  const vStarsPuz = m => (m === 0 ? 3 : m <= 2 ? 2 : 1);   // 残局 miss 制（§-r18 §1）
  const vRoundSeed = (flat, round) => (flat * 7919 + 911 + round * 77) | 0;   // §3 局种子

  /* ---- v44 独立复算件（SPEC §-r18 §3 判定器文字重列）---- */
  const vLINES16 = [
    [0, 1, 2], [1, 2, 3], [4, 5, 6], [5, 6, 7], [8, 9, 10], [9, 10, 11], [12, 13, 14], [13, 14, 15],
    [0, 4, 8], [4, 8, 12], [1, 5, 9], [5, 9, 13], [2, 6, 10], [6, 10, 14], [3, 7, 11], [7, 11, 15],
    [0, 5, 10], [5, 10, 15], [1, 6, 11], [4, 9, 14], [3, 6, 9], [6, 9, 12], [2, 5, 8], [7, 10, 13]];
  function vScan16(bd) {
    for (const L of vLINES16)
      if (bd[L[0]] && bd[L[0]] === bd[L[1]] && bd[L[1]] === bd[L[2]])
        return { who: bd[L[0]], line: L.slice() };
    return null;
  }
  function vWinPts16(bd, p) {
    const out = [];
    for (const L of vLINES16) {
      const v = [bd[L[0]], bd[L[1]], bd[L[2]]];
      if (v.filter(x => x === p).length === 2 && v.indexOf('') >= 0) out.push(L[v.indexOf('')]);
    }
    return out;
  }
  function vEval16(bd, me) {                     // §3：2己+1空 ±50/1己+2空 ±5（混线不计）
    const op = me === 'O' ? 'X' : 'O';
    let s = 0;
    for (const L of vLINES16) {
      let m = 0, o = 0;
      for (let j = 0; j < 3; j++) { if (bd[L[j]] === me) m++; else if (bd[L[j]] === op) o++; }
      if (m && o) continue;
      if (m === 2) s += 50; else if (m === 1) s += 5;
      if (o === 2) s -= 50; else if (o === 1) s -= 5;
    }
    return s;
  }
  function vMm16(bd, turn, me, depth) {          // §3：depth-4；胜=±(1000-depth)；平=0；到深=eval
    const w = vScan16(bd);
    if (w) return w.who === me ? 1000 - depth : depth - 1000;
    if (depth >= 4) return vEval16(bd, me);
    const e = vEmpties(bd);
    if (!e.length) return 0;
    let best = turn === me ? -9999 : 9999;
    for (const i of e) {
      bd[i] = turn;
      const s = vMm16(bd, turn === 'O' ? 'X' : 'O', me, depth + 1);
      bd[i] = '';
      if (turn === me ? s > best : s < best) best = s;
    }
    return best;
  }
  function vV44(bd, me) {                        // §3：杀→堵→depth-4（升序严格更优）
    const op = me === 'O' ? 'X' : 'O';
    const mw = vWinPts16(bd, me);
    if (mw.length) return mw[0];
    const ow = vWinPts16(bd, op);
    if (ow.length) return ow[0];
    const e = vEmpties(bd);
    if (!e.length) return null;
    let best = -9999, pick = e[0];
    for (const i of e) {
      bd[i] = me; const s = vMm16(bd, op, me, 1); bd[i] = '';
      if (s > best) { best = s; pick = i; }
    }
    return pick;
  }

  /* ---- vroll 独立复算件（SPEC §-r18 §3 判定器文字重列）---- */
  function vRollApply(g, me, i) {                // 先移最旧（FIFO，cap 3）再落子；返回移出格
    const myq = me === 'X' ? g.xq : g.oq;
    let removed = -1;
    if (myq.length >= SPEC_CONSTS.ROLL_CAP_PIECES) { removed = myq.shift(); g.board[removed] = ''; }
    g.board[i] = me; myq.push(i);
    return removed;
  }
  function vRollThreats(g, p) {                  // 含自身移子模拟的一步杀格集合（滚动杀）
    const out = [];
    for (let i = 0; i < 9; i++) {
      if (g.board[i]) continue;
      const sim = { board: g.board.slice(), xq: g.xq.slice(), oq: g.oq.slice() };
      vRollApply(sim, p, i);
      const w = vScan(sim.board);
      if (w && w.who === p) out.push(i);
    }
    return out;
  }
  function vRollPick(g, me) {                    // §3：杀→堵→启发（中+3/角+1/落后威胁×2）
    const op = me === 'X' ? 'O' : 'X';
    const mw = vRollThreats(g, me);
    if (mw.length) return mw[0];
    const ow = vRollThreats(g, op);
    if (ow.length) return ow[0];
    let best = -1, pick = -1;
    for (let i = 0; i < 9; i++) {
      if (g.board[i]) continue;
      let sc = 0;
      if (i === 4) sc += 3;
      if (i === 0 || i === 2 || i === 6 || i === 8) sc += 1;
      const sim = { board: g.board.slice(), xq: g.xq.slice(), oq: g.oq.slice() };
      vRollApply(sim, me, i);
      sc += vWinPts(sim.board, me).length * 2;
      if (sc > best) { best = sc; pick = i; }
    }
    return pick;
  }

  /* ---- 残局独立复算件（SPEC §-r18 §2 谓词文字重列）---- */
  function vPuzAnswer(bd, ptype) {
    const xw = vWinPts(bd, 'X'), ow = vWinPts(bd, 'O');
    if (ptype === 'win1') return xw.length === 1 && ow.length === 0 ? xw[0] : null;
    if (ptype === 'block1') return ow.length === 1 && xw.length === 0 ? ow[0] : null;
    if (xw.length || ow.length) return null;
    let fork = -1;
    for (let i = 0; i < 9; i++) {
      if (bd[i]) continue;
      bd[i] = 'X';
      const t = vWinPts(bd, 'X').length;
      bd[i] = '';
      if (t >= 2) { if (fork >= 0) return null; fork = i; }
    }
    return fork >= 0 ? fork : null;
  }
  /* ---- 复盘独立复算件（SPEC §-r18 delta3：首误步=minimax 视角首个严格更差 X 手）---- */
  function vReview(hist) {
    const bd = ['', '', '', '', '', '', '', '', ''];
    for (let t = 0; t < hist.length; t++) {
      const mv = hist[t];
      if (mv.p === 'O') { bd[mv.i] = 'O'; continue; }
      let bestV = 99, bestC = -1;
      for (let c = 0; c < 9; c++) {
        if (bd[c]) continue;
        bd[c] = 'X'; const s = vMm(bd, 'O', 1); bd[c] = '';
        if (s < bestV) { bestV = s; bestC = c; }
      }
      bd[mv.i] = 'X';
      const actV = vMm(bd, 'O', 1);
      if (actV > bestV)
        return { moveNo: Math.floor(t / 2) + 1, missCell: mv.i, bestCell: bestC, boardBefore: bd.slice() };
    }
    return null;
  }
  /* ---- 时长模型独立重列（SPEC §-r18 §4；禁引引擎常量）---- */
  const vKind = f => f < SPEC_CONSTS.STATIC_LEVELS ? SPEC_KINDS[Math.floor(f / SPEC_CONSTS.CH_LEN) + 1] : 'battle';
  const vModeled = f => {
    const k = vKind(f);
    if (k === 'puzzle') return SPEC_CONSTS.PUZZLES * (3000 + SPEC_DECIDE.puzzle + 2604);
    const n = SPEC_NOMINAL[k];
    return SPEC_CONSTS.ROUNDS * (n.moves * SPEC_DECIDE[k] + n.rabbit * 800 + 2820);
  };

  /* ---- 驱动件 ---- */
  /* 等可交互态（兔子思考/结算演出/复盘窗自动推进——只等待）；done/won 视为解锁 */
  const unlockedT = async () => {
    let wg = 0;
    while (wg++ < 4000) {
      if (!cur || cur.done || state.won) return true;
      if (state.review) { await sleep(50); continue; }
      if (cur.kind === 'puzzle') {
        const q = cur.puzzles && cur.puzzles[cur.step];
        if (q && !q.solved && !state.roundEnd) return true;
        await sleep(50); continue;
      }
      const g = cur.rounds && cur.rounds[cur.roundIdx];
      if (g && !g.over && !state.rabbit && !state.roundEnd && !state.demo) return true;
      await sleep(50);
    }
    return false;
  };
  /* 走完当前一局 classic（moveFn=按局面取 X 落子格）；返回局终字串（win/draw/lose） */
  async function playRound(moveFn) {
    for (let guard = 0; guard < 300; guard++) {
      const ok = await unlockedT();
      if (!ok || !cur || cur.done || cur.flat < 0) return null;
      const q = window.TK.quiz;
      if (!q) return null;
      const prev = q.board.slice();
      const i = moveFn(q.board);
      if (i == null || prev[i] !== '') { await sleep(60); continue; }
      const r = await window.TK.tapCell(i);
      if (r === 'win' || r === 'draw' || r === 'lose') return { r: r, i: i, prev: prev };
      if (r !== 'moved') { await sleep(60); continue; }
      /* 'moved'：恰两枚新子（X 在 i + O 一枚），不覆写 */
      const now = window.TK.quiz ? window.TK.quiz.board : null;
      if (!now) return null;
      const diff = [];
      for (let k = 0; k < 9; k++) if (prev[k] !== now[k]) diff.push(k);
      if (diff.length !== 2 || now[i] !== 'X' || prev[i] !== '') return { r: 'boardBad', i: i, diff: diff };
    }
    return null;
  }
  /* DFS 构造（胜=vs ch1 确定性随机兔；负=vs ch4 完美兔不堵被杀）——X 手序独立搜出 */
  function dfsWin(bd, st, depth) {
    if (depth > 6) return null;
    for (const i of vEmpties(bd)) {
      bd[i] = 'X';
      let found = null;
      if (vScan(bd)) found = [i];
      else if (bd.indexOf('') >= 0) {
        const r2 = new M32(st.a);
        const ei = vEmpties(bd);
        const oi = ei[Math.floor(r2.n() * ei.length)];
        bd[oi] = 'O';
        if (!vScan(bd)) { const sub = dfsWin(bd, r2, depth + 1); if (sub) found = [i].concat(sub); }
        bd[oi] = '';
      }
      bd[i] = '';
      if (found) return found;
    }
    return null;
  }
  function dfsLose(bd, depth) {
    if (depth > 7) return null;
    for (const i of vEmpties(bd)) {
      bd[i] = 'X';
      let found = null;
      if (!vScan(bd) && bd.indexOf('') >= 0) {   // X 不自胜（构造负局）
        const oi = vPerfect(bd);                 // ch4 完美应手（零 rng）
        bd[oi] = 'O';
        if (vScan(bd)) found = [i];
        else if (bd.indexOf('') >= 0) { const sub = dfsLose(bd, depth + 1); if (sub) found = [i].concat(sub); }
        bd[oi] = '';
      }
      bd[i] = '';
      if (found) return found;
    }
    return null;
  }
  /* 胜局构造：flat0-4 各局（确定性随机兔）搜可胜 X 手序（SPEC 独立推演，禁观察实现） */
  function constructWin() {
    for (let flat = 0; flat < 5; flat++) {
      for (let round = 1; round <= 3; round++) {
        const mv = dfsWin(['', '', '', '', '', '', '', '', ''], new M32(vRoundSeed(flat, round)), 0);
        if (mv) return { flat: flat, round: round, moves: mv };
      }
    }
    return null;
  }

  window.__tkProg = 'U1';
  /* ---- ① 结构 ---- */
  total++;
  startLevel(0);
  await unlockedT();
  const q1 = window.TK.quiz;
  const cellsDom = Array.from(boardEl.querySelectorAll('.cell'));
  const quizJson = JSON.stringify(q1) + JSON.stringify(window.TK.currentLevel);
  const constsOk = CH_LEN === SPEC_CONSTS.CH_LEN && N_CHAPTERS === SPEC_CONSTS.N_CHAPTERS &&
    STATIC_LEVELS === SPEC_CONSTS.STATIC_LEVELS && ROUNDS === SPEC_CONSTS.ROUNDS &&
    PUZZLES === SPEC_CONSTS.PUZZLES && ROLL_CAP_PIECES === SPEC_CONSTS.ROLL_CAP_PIECES &&
    ROLL_MOVE_CAP === SPEC_CONSTS.ROLL_MOVE_CAP;
  const structOk1 = !!q1 && q1.kind === 'battle' && q1.turn === 'k' && q1.round === 1 &&
    q1.score === 0 && q1.step === 0 && q1.miss === 0 &&
    Array.isArray(q1.board) && q1.board.length === 9 && q1.board.every(v => v === '') &&
    cellsDom.length === 9 && cellsDom.every(c => c.classList.contains('empty')) &&
    constsOk && quizJson.indexOf('undefined') < 0 && quizJson.indexOf('NaN') < 0;
  /* 指示头像：孩子侧亮（孩子执子恒亮；未思考期兔子侧灭） */
  const activeWho = document.querySelector('#turn-bar .who.active');
  const indOk = !!activeWho && activeWho.dataset.side === 'k' &&
    !document.querySelector('.who-r').classList.contains('active');
  /* 契约 O：自建格 button 显式 color；触摸目标 ≥96×96 */
  const oBtn = cellsDom[0];
  const sizeOk = cellsDom.every(c => c.offsetWidth >= 96 && c.offsetHeight >= 96);
  const contrOk = !!oBtn && oBtn.tagName === 'BUTTON' &&
    getComputedStyle(oBtn).color === 'rgb(74, 59, 46)' && sizeOk;
  /* clips：tk_ 13+core 3=16 全注入+实长辨别（±60ms） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const preClips = keysAll.length === 16 &&
    Object.keys(SPEC_VOICE).concat(SPEC_CORE_KEYS).every(k =>
      keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60);
  /* 四型双档布局断言（flat 0/24/30/36 × 1280×800+800×1180：格 ≥96×96+棋盘/指示条在场+
     格钮 color 对 #FBF6EC 对比度 ≥3+无横向溢出；v44=16 格） */
  const _lum = c => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null; const f = i => { const v = +m[i] / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(1) + 0.7152 * f(2) + 0.0722 * f(3); };
  const _ratioOf = (a, b) => { const x = _lum(a), y = _lum(b);
    return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function simView(w, h, flat) {
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    /* 棋盘宽级联公式独立复算（SPEC §-r18 布局表重列——真实 vh 不可页内模拟：#game 定 px 改不了
       vh 项，内联钉宽消除与真实窗口高的耦合；竖屏（@media orientation 同判据）去 vh 项+base 帽 410）*/
    const isPort = h > w;
    const vw = Math.floor(w * 0.94);
    const wrapW = flat === 30
      ? Math.min(508, vw, isPort ? Infinity : h - 330)
      : Math.min(isPort ? 410 : 430, vw, isPort ? Infinity : Math.floor((h - 330) * 1.06));
    boardWrapEl.style.width = wrapW + 'px';
    const expN = flat === 30 ? 16 : 9;           /* v44=16 格，其余 9 格 */
    const cls = Array.from(boardEl.querySelectorAll('.cell'));
    const hitOk = cls.length === expN && cls.every(c => c.offsetWidth >= 96 && c.offsetHeight >= 96);
    const sceneOk = boardWrapEl.offsetWidth >= 64 && boardWrapEl.offsetHeight >= 64 &&
                    turnBarEl.offsetWidth >= 96 && turnBarEl.offsetHeight >= 40;
    const contrast = _ratioOf(getComputedStyle(cls[0]).color, 'rgb(251, 246, 236)') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, n: cls.length, hitOk: hitOk, sceneOk: sceneOk,
             contrast: contrast, ox: ox, pass: hitOk && sceneOk && contrast && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 24, 30, 36]) {
    sims.push(simView(1280, 800, flat));
    sims.push(simView(800, 1180, flat));
  }
  const gEl = document.getElementById('game');
  gEl.style.width = '';
  gEl.style.height = '';
  boardWrapEl.style.width = '';                  /* 清 simView 内联钉宽（防污染后续单元）*/
  startLevel(0);
  const layoutOk = sims.every(s => s.pass);
  const s1 = structOk1 && indOk && contrOk && preClips && durOk && layoutOk;
  if (s1) npass++;
  units.struct = { ok: s1, dom: structOk1, consts: constsOk, indicator: indOk, contractO: contrOk,
                   clips: preClips, dur: durOk, durs: durs, sizes: sizeOk,
                   layout: layoutOk, sims: sims };

  window.__tkProg = 'U2';
  /* ---- ② 教学三段 ---- */
  total++;
  window.__tkDemoR = null; window.__tkTutSolo = null; window.__tkWatchMs = null;
  startLevel(0);                                  // verify 页 freshTut 恒 false → 直接备局
  await unlockedT();
  const pTut = tutorialWatch();                   // fire-and-forget（演示期 null 探针在途中插）
  await sleep(400);
  const rDemo = await window.TK.tapCell(4);       // 演示期（state.demo）→ null（SPEC §3）
  await pTut;                                     // watch 段走完 → turn 阶段（tut='help'）
  const watchOk = window.__tkDemoR === 'done' &&  /* 整局演示走完（gate 口径） */
    state.tut === 'help' && !!cur && cur.flat === -1 && rDemo === null &&
    window.TK.review === null;                    /* 教学局无复盘（§-r18 delta3 口径） */
  const tw = window.__tkWatchMs != null ? window.__tkWatchMs / SPEED : 1e9;
  /* turn 阶段：首合法子 → 帮→独 */
  const qT = window.TK.quiz;
  const i0 = qT && qT.board[4] === '' ? 4 : 0;
  const rT = qT ? await window.TK.tapCell(i0) : null;
  const soloOk = rT === 'moved' && window.__tkTutSolo === true;
  /* 迷你局走完 → 自动 startLevel(firstFlat=0) */
  let miniR = null, guard2 = 0;
  while (guard2++ < 120) {
    if (!cur || cur.done || cur.flat >= 0) break;
    const ok = await unlockedT();
    if (!ok || !cur || cur.flat >= 0) break;
    const qq = window.TK.quiz;
    if (!qq) break;
    const r2 = await window.TK.tapCell(vBestX(qq.board));
    if (r2 === 'win' || r2 === 'draw' || r2 === 'lose') { miniR = r2; break; }
    if (r2 !== 'moved') await sleep(60);
  }
  const miniDone = !!miniR && !!cur && cur.flat === 0 &&
    !!window.TK.quiz && window.TK.quiz.round === 1;
  const tutOk = watchOk && soloOk && miniDone && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watch: watchOk, demoR: window.__tkDemoR, demoNull: rDemo,
                     solo: window.__tkTutSolo === true, miniR: miniR, miniDone: miniDone,
                     watchMs: Math.round(tw) };

  window.__tkProg = 'U3';
  /* ---- ③ 逐关驱动 flat0-23（classic 四章，verify 自写 minimax 走最优） ---- */
  total++;
  const driveRec = {};
  let driveBad = null, driveOk = true;
  for (let flat = 0; flat < 24 && driveOk; flat++) {
    window.__tkProg = 'U3 flat' + flat;
    window.TK.start(flat);
    const lvlResults = [];
    let expScore = 0, bad = null;
    for (let round = 1; round <= 3 && !bad; round++) {
      const q = window.TK.quiz;
      if (!q || q.round !== round) { bad = 'round ' + round + '/' + (q && q.round); break; }
      if (q.step !== flat * 3 + round - 1) { bad = 'step ' + round; break; }   /* 全关局号 */
      if (q.miss !== 0 || window.TK.currentLevel.miss !== 0) { bad = 'miss'; break; }   /* 恒 0 备案 */
      if (window.TK.currentLevel.score !== expScore) { bad = 'score ' + round; break; }
      /* 孩子可操作态棋盘合法：X 恒 = O（先手落子前）——交替落子先验 */
      const xs0 = q.board.filter(v => v === 'X').length, os0 = q.board.filter(v => v === 'O').length;
      if (xs0 !== os0) { bad = 'turn-balance ' + xs0 + '/' + os0; break; }
      let rr = null;
      for (let t = 0; t < 60 && !rr; t++) {
        const pr = await playRound(bd => vBestX(bd));
        if (!pr) { await sleep(80); continue; }
        if (pr.r === 'boardBad') { bad = 'board ' + JSON.stringify(pr.diff); break; }
        rr = pr.r;
      }
      if (bad) break;
      if (rr !== 'win' && rr !== 'draw' && rr !== 'lose') { bad = 'roundend ' + rr; break; }
      const fin = window.TK.final;
      if (!fin || fin.result !== rr) { bad = 'final ' + rr; break; }           /* 终局快照对账 */
      if (rr === 'draw' && fin.line !== null) { bad = 'drawline'; break; }
      if ((rr === 'win' || rr === 'lose') &&
          (!Array.isArray(fin.line) || fin.line.length !== 3 ||
           !LINES_V.some(L => L.every((x, k) => x === fin.line[k])))) { bad = 'line ' + rr; break; }
      lvlResults.push(rr);
      expScore += rr === 'win' ? 1 : rr === 'draw' ? 0.5 : 0;                  /* 胜 1 平 0.5 负 0 */
    }
    const lv = window.TK.currentLevel;
    const okLv = !bad && !!(cur && cur.done && lv && lv.kind === 'battle' &&
      lv.results.length === 3 &&
      JSON.stringify(lv.results) === JSON.stringify(lvlResults) &&
      lv.score === expScore && lv.stars === vStars(expScore) && lv.miss === 0 && lv.n === 3) &&
      window.TK.review === null;                 /* 最优对弈无负局=无复盘（先验） */
    driveRec[flat] = { dch: lv && lv.dch, results: lvlResults, score: expScore, ok: okLv };
    if (!okLv && driveOk) { driveBad = bad || ('level ' + flat); driveOk = false; }
  }
  if (driveOk) npass++;
  units.drive = { ok: driveOk, bad: driveBad, rec: driveRec };

  window.__tkProg = 'U4';
  /* ---- ④ 契约 M 帧内容断言（三层 ×四型） ---- */
  total++;
  const frameCheck = () => {                      /* 数值层↔渲染层：DOM 类===board（9/16 通用） */
    const q = window.TK.quiz;
    if (!q) return false;
    const cls = Array.from(boardEl.querySelectorAll('.cell'));
    if (cls.length !== q.board.length) return false;
    return cls.every((c, k) =>
      (q.board[k] === 'X' && c.classList.contains('x') && !c.classList.contains('o')) ||
      (q.board[k] === 'O' && c.classList.contains('o') && !c.classList.contains('x')) ||
      (q.board[k] === '' && c.classList.contains('empty') && !c.classList.contains('x') && !c.classList.contains('o')));
  };
  const fFrames = {};
  for (const flat of [0, 30]) {                   /* battle/v44：摆两子后对账 */
    window.TK.start(flat);
    const okw = await unlockedT();
    const q4 = window.TK.quiz;
    const mv4 = q4 ? (flat === 30 ? vV44(q4.board.slice(), 'X') : vBestX(q4.board)) : null;
    const r4 = mv4 != null ? await window.TK.tapCell(mv4) : null;
    fFrames[flat] = okw && r4 === 'moved' && frameCheck();
  }
  {                                              /* puzzle：静态题面直接对账（无需 tap） */
    window.TK.start(24);
    await unlockedT();
    fFrames[24] = frameCheck();
  }
  /* 演出层：胜线三格 .wincell===final().line（fire-and-forget 窗内捕获） */
  const cw = constructWin();
  let wincellOk = false, wincellDetail = null;
  if (cw) {
    window.TK.start(cw.flat);
    for (let r = 1; r < cw.round; r++) await playRound(bd => vEmpties(bd)[0]);
    await unlockedT();
    const queue2 = cw.moves.slice();
    const pWin = (async () => {                   /* 走到终局（不 await——窗内并行捕获） */
      let rr = null;
      for (const m of queue2) {
        const okw = await unlockedT();
        if (!okw || !cur || cur.done) break;
        const qq = window.TK.quiz;
        if (!qq || qq.board[m] !== '') break;
        rr = await window.TK.tapCell(m);
        if (rr === 'win' || rr === 'draw' || rr === 'lose') break;
      }
      return rr;
    })();
    let cellsW = [];
    for (let g = 0; g < 40; g++) {                /* 结算窗内轮询（SPEED 折算 312ms） */
      cellsW = Array.from(boardEl.querySelectorAll('.cell.wincell'));
      if (cellsW.length === 3) break;
      await sleep(25);
    }
    const rW = await pWin;
    const finW = window.TK.final;
    const domLine = cellsW.map(c => Number(c.dataset.i)).sort();
    const finLine = finW && finW.line ? finW.line.slice().sort() : null;
    wincellOk = rW === 'win' && cellsW.length === 3 && !!finLine &&
      JSON.stringify(domLine) === JSON.stringify(finLine);
    wincellDetail = { r: rW, cells: domLine, line: finLine };
  }
  const frameOk = fFrames[0] && fFrames[24] && fFrames[30] && wincellOk;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, f0: fFrames[0], f24: fFrames[24], f30: fFrames[30],
                  wincell: wincellOk, detail: wincellDetail, cw: cw };

  window.__tkProg = 'U5';
  /* ---- ⑤ 终局路径专项（classic：胜/平/负三态构造+平局不判负） ---- */
  total++;
  let winR = null;
  if (cw) {
    window.TK.start(cw.flat);
    for (let r = 1; r < cw.round; r++) await playRound(bd => vEmpties(bd)[0]);
    await unlockedT();
    for (const m of cw.moves) {
      const okw = await unlockedT();
      if (!okw || !cur || cur.done) break;
      const qq = window.TK.quiz;
      if (!qq || qq.board[m] !== '') break;
      winR = await window.TK.tapCell(m);
      if (winR === 'win' || winR === 'draw' || winR === 'lose') break;
    }
  }
  const finWin = window.TK.final;
  const winOk = winR === 'win' && !!finWin && finWin.result === 'win' &&
    Array.isArray(finWin.line) && finWin.line.length === 3 &&
    LINES_V.some(L => L.every((x, k) => x === finWin.line[k]));
  /* 平：ch4 完美兔（flat18）最优对弈=3 平局（数学先验：先手最优至少平）——离线先验 */
  const simDraw = (() => {
    const bd = ['', '', '', '', '', '', '', '', ''];
    for (;;) {
      bd[vBestX(bd)] = 'X';
      if (vScan(bd)) return vScan(bd).who === 'X' ? 'win' : 'lose';
      if (bd.indexOf('') < 0) return 'draw';
      bd[vPerfect(bd)] = 'O';
      if (vScan(bd)) return vScan(bd).who === 'O' ? 'lose' : 'win';
      if (bd.indexOf('') < 0) return 'draw';
    }
  })();
  window.TK.start(18);
  const drawResults = [];
  for (let r = 1; r <= 3; r++) {
    const pr = await playRound(bd => vBestX(bd));
    drawResults.push(pr && pr.r);
  }
  const lvD = window.TK.currentLevel;
  const drawOk = simDraw === 'draw' &&                            /* 离线先验：最优=平 */
    drawResults.every(x => x === 'draw') &&                       /* 平局不判负 */
    JSON.stringify(drawResults) === JSON.stringify(['draw', 'draw', 'draw']) &&
    !!lvD && lvD.score === 1.5 && lvD.stars === vStars(1.5) && lvD.done === true &&
    lvD.miss === 0;
  /* 负：ch4 完美兔 DFS 构造（孩子不堵被杀） */
  const cl = dfsLose(['', '', '', '', '', '', '', '', ''], 0);
  let loseR = null;
  if (cl) {
    window.TK.start(18);
    await unlockedT();
    for (const m of cl) {
      const okw = await unlockedT();
      if (!okw || !cur || cur.done) break;
      const qq = window.TK.quiz;
      if (!qq || qq.board[m] !== '') break;
      loseR = await window.TK.tapCell(m);
      if (loseR === 'win' || loseR === 'draw' || loseR === 'lose') break;
    }
  }
  const finLose = window.TK.final;
  const loseOk = loseR === 'lose' && !!finLose && finLose.result === 'lose' &&
    Array.isArray(finLose.line) && finLose.line.length === 3 &&
    LINES_V.some(L => L.every((x, k) => x === finLose.line[k])) &&
    window.TK.currentLevel.miss === 0;                            /* 负局不计 miss（备案） */
  const endOk = winOk && drawOk && loseOk;
  if (endOk) npass++;
  units.endPath = { ok: endOk, win: winOk, draw: drawOk, lose: loseOk, simDraw: simDraw,
                    cw: cw, cl: cl, drawResults: drawResults };

  window.__tkProg = 'U6';
  /* ---- ⑥ AI 档位专项（classic） ---- */
  total++;
  const pos6 = [
    ['X', '', '', '', '', '', '', '', ''],        // 先手角开局（O 应手）
    ['', 'X', '', '', '', '', '', '', ''],        // 先手边开局
    ['', '', '', '', 'X', '', '', '', '']         // 先手中开局
  ];
  const pr6 = m32v(777);
  let g6 = 0;
  while (pos6.length < 26 && g6++ < 600) {        // 随机合法局面（O 到_move）补充
    const bd = ['', '', '', '', '', '', '', '', ''];
    for (;;) {
      if (vScan(bd) || vEmpties(bd).length === 0) break;
      const xs = bd.filter(v => v === 'X').length, os = bd.filter(v => v === 'O').length;
      const e = vEmpties(bd);
      bd[e[Math.floor(pr6() * e.length)]] = xs === os ? 'X' : 'O';
      if (!vScan(bd)) {
        const xs2 = bd.filter(v => v === 'X').length, os2 = bd.filter(v => v === 'O').length;
        if (xs2 === os2 + 1 && vEmpties(bd).length >= 1) pos6.push(bd.slice());   /* O 行动位 */
      }
    }
  }
  let ch4Ok = pos6.length >= 20;
  const ch4Bad = [];
  for (const bd of pos6) {
    const a1 = engPerfectPick(bd.slice());
    const a2 = vPerfect(bd.slice());
    if (a1 !== a2) { ch4Ok = false; ch4Bad.push({ bd: bd.slice(), a1: a1, a2: a2 }); if (ch4Bad.length > 3) break; }
  }
  /* ch1 纯随机域：∈empties+seeded 复算同格 */
  let ch1Ok = true;
  for (let s = 1; s <= 10 && ch1Ok; s++) {
    const bd = pos6[s % pos6.length];
    const rA = m32v(s * 131), rB = m32v(s * 131);
    const pick = engAiPick(bd.slice(), 1, rA);
    const e = vEmpties(bd);
    const vp = e[Math.floor(rB() * e.length)];
    if (pick !== vp || e.indexOf(pick) < 0) ch1Ok = false;
  }
  /* ch2 必堵：构造孩子两连必堵（有己杀仍先堵——会挡不会杀） */
  const blockCases = [
    { bd: ['X', 'X', '', '', '', '', '', '', ''], at: 2 },
    { bd: ['', '', '', '', 'X', '', '', '', 'X'], at: 0 },
    { bd: ['X', 'X', '', 'O', 'O', '', '', '', ''], at: 2 },
    { bd: ['', 'X', '', '', 'X', '', '', '', ''], at: 7 }
  ];
  const ch2Ok = blockCases.every(c => engAiPick(c.bd.slice(), 2, m32v(5)) === c.at);
  /* ch3 漏率 seeded 确定性+SPEC 序复算 */
  let ch3Ok = true, ch3Det = true;
  for (let s = 1; s <= 12 && ch3Ok; s++) {
    const bd = pos6[(s + 3) % pos6.length];
    const rA = m32v(s * 977), rB = m32v(s * 977);
    const pick1 = engAiPick(bd.slice(), 3, m32v(s * 977));
    const pick2 = engAiPick(bd.slice(), 3, rA);
    const vp = vRabbit(3, bd.slice(), rB);
    if (pick1 !== pick2) ch3Det = false;
    if (pick1 !== vp || vEmpties(bd).indexOf(pick1) < 0) ch3Ok = false;
  }
  const aiOk = ch4Ok && ch1Ok && ch2Ok && ch3Ok && ch3Det;
  if (aiOk) npass++;
  units.aiTiers = { ok: aiOk, ch4: ch4Ok, nPos: pos6.length, ch4Bad: ch4Bad.slice(0, 3),
                    ch1: ch1Ok, ch2: ch2Ok, ch3: ch3Ok, ch3Det: ch3Det };

  window.__tkProg = 'U7';
  /* ---- ⑦ 星级双口径（引擎直测，独立硬编码期望） ---- */
  total++;
  const LB = genLevel(10);                        /* battle 关 */
  const st3a = engStars({ kind: 'battle', score: 3 }) === 3;
  const st3b = engStars({ kind: 'battle', score: 2.5 }) === 3;
  const st2a = engStars({ kind: 'battle', score: 2 }) === 2;
  const st2b = engStars({ kind: 'battle', score: 1.5 }) === 2;
  const st1a = engStars({ kind: 'battle', score: 1 }) === 1;
  const st1b = engStars({ kind: 'battle', score: 0.5 }) === 1;
  const stFloor = engStars({ kind: 'battle', score: 0 }) === 1;
  const battleStars = st3a && st3b && st2a && st2b && st1a && st1b && stFloor;
  /* 变体同分值制（v44/vroll 与 battle 同口径） */
  const v44Stars = engStars({ kind: 'v44', score: 2.5 }) === 3 &&
                   engStars({ kind: 'vroll', score: 1.5 }) === 2 &&
                   engStars({ kind: 'vroll', score: 0 }) === 1;
  /* puzzle miss 制：0→3★/1,2→2★/3,7→1★ */
  const pz3 = engStars({ kind: 'puzzle', miss: 0 }) === 3;
  const pz2a = engStars({ kind: 'puzzle', miss: 1 }) === 2;
  const pz2b = engStars({ kind: 'puzzle', miss: 2 }) === 2;
  const pz1a = engStars({ kind: 'puzzle', miss: 3 }) === 1;
  const pz1b = engStars({ kind: 'puzzle', miss: 7 }) === 1;
  const puzStars = pz3 && pz2a && pz2b && pz1a && pz1b;
  const starsOk = battleStars && v44Stars && puzStars && !!LB && LB.kind === 'battle';   /* 永不 0★ */
  if (starsOk) npass++;
  units.stars = { ok: starsOk, battle: battleStars, v44vroll: v44Stars, puzzle: puzStars };

  window.__tkProg = 'U8';
  /* ---- ⑧ 生成关 flat42-61 ---- */
  total++;
  const genDch = {};
  let genOk = true, genBad = null;
  for (let flat = 42; flat < 62 && genOk; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);          /* 确定性 */
    const vd = riV(m32v(flat * 7919 + 911), 1, 4);                  /* dch 独立复算 */
    const why = structWhy(L1);
    genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    if (!det || L1.dch !== vd || L1.kind !== 'battle' || why) {     /* 生成关恒 battle（§-r18 §1） */
      genBad = 'flat' + flat + ' det=' + det + ' dch=' + L1.dch + '/' + vd +
               ' kind=' + L1.kind + ' why=' + why;
      genOk = false;
    }
  }
  const dchAll = genOk && genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  /* 局序 RNG 分流：dch1 生成关实驱一局——兔子应手逐手=独立复算 roundSeed 流 */
  let splitOk = false, splitDetail = null;
  const dch1Flats = [];
  for (let flat = 42; flat < 62; flat++) if (genLevel(flat).dch === 1) dch1Flats.push(flat);
  if (dch1Flats.length) {
    const f8 = dch1Flats[0];
    window.TK.start(f8);
    await unlockedT();
    const simBd = ['', '', '', '', '', '', '', '', ''];
    const r8 = m32v(vRoundSeed(f8, 1));
    const obsO = [], expO = [];
    let splitBad = null;
    for (let g = 0; g < 40; g++) {
      const okw = await unlockedT();
      if (!okw || !cur || cur.done) break;
      const qq = window.TK.quiz;
      if (!qq) break;
      const prev = qq.board.slice();
      const xi = vBestX(simBd);
      const r = await window.TK.tapCell(xi);
      if (r === 'win' || r === 'draw' || r === 'lose') break;
      if (r !== 'moved') { await sleep(60); continue; }
      simBd[xi] = 'X';
      const oi = vRabbit(1, simBd.slice(), r8);
      simBd[oi] = 'O';
      expO.push(oi);
      const now = window.TK.quiz ? window.TK.quiz.board : null;
      if (!now) { splitBad = 'now'; break; }
      const diff = [];
      for (let k = 0; k < 9; k++) if (prev[k] !== now[k]) diff.push(k);
      const oCell = diff.filter(k => now[k] === 'O')[0];
      obsO.push(oCell);
    }
    splitOk = !splitBad && obsO.length > 0 && JSON.stringify(obsO) === JSON.stringify(expO);
    splitDetail = { flat: f8, obs: obsO, exp: expO, bad: splitBad };
    /* 同关两次全驱结果一致（确定性端到端） */
    const driveTwice = async () => {
      window.TK.start(f8);
      const rs = [];
      for (let r = 0; r < 3; r++) { const pr = await playRound(bd => vBestX(bd)); rs.push(pr && pr.r); }
      return { rs: rs, score: window.TK.currentLevel.score };
    };
    const dA = await driveTwice(), dB = await driveTwice();
    const twiceOk = JSON.stringify(dA) === JSON.stringify(dB);
    splitOk = splitOk && twiceOk;
    splitDetail.twice = [dA, dB];
  }
  const genOkAll = genOk && dchAll && splitOk;
  if (genOkAll) npass++;
  units.gen = { ok: genOkAll, bad: genBad, genDch: genDch, split: splitDetail };

  window.__tkProg = 'U9';
  /* ---- ⑨ 源码级契约族（script[2]=data+engine+main 纯游戏块——M1 分离后有判别力） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const cnt = (s, lit) => s.split(lit).length - 1;              /* 子串计数助手 */
  /* A（r17 双 lim-1）：启动+winFlow 两处均传 lim-1，无 null 形态；日末停留 Math.max */
  const srcA = cnt(src, 'nextHint(lim - 1)') === 2 &&
    src.indexOf('Math.max(0, lim - 1)') >= 0 &&
    src.indexOf('nextHint(null)') < 0;
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
    src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
    src.indexOf('idle > 30000') >= 0;                                         /* B：救援双锚 */
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&
    coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&
    src.indexOf("KIDS.init({ game: 'tictac'") >= 0;                           /* C：存档 v1.0 */
  const srcD = src.indexOf("sfx('pop')") >= 0 &&
    src.indexOf("'wig'") >= 0;                                                /* D：拒绝轻叮配 wig */
  const srcE = src.indexOf('sv.tictac && sv.tictac.tutSeen') >= 0;            /* E：教学特例先查 */
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&
    src.indexOf('(ci + 1)' + ' % 4') < 0;                                     /* F：实算+禁章序右移 */
  /* I（r18 残局全量）：窗常量字面+guard 挂判定前+窗设锚+救援让路+startLevel 重置 */
  const srcI = src.indexOf('WRONG_CHAIN_WIN = 2448 + 300') >= 0 &&
    src.indexOf('if (wrongChainUntil && Date.now() < wrongChainUntil)') >= 0 &&
    src.indexOf('wrongChainUntil = now + WRONG_CHAIN_WIN') >= 0 &&
    src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
    src.indexOf('wrongChainUntil = 0; lastWrongVoice = 0;') >= 0;
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;              /* J：语义句 10s 节流 */
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
    src.indexOf('function rescueTick()') >= 0 &&
    src.indexOf("document.querySelector('.k-review')") >= 0;                 /* K：面板守卫+复盘层守卫 */
  const srcMig = src.indexOf("localStorage.getItem('kidsgame_" + "tictac')") >= 0 &&
    src.indexOf("lv[(c - 1) + '-5']") >= 0 &&
    src.indexOf('> CH_LEN - 1') >= 0 &&
    src.indexOf("KIDS.init({ game: 'tictac'") > src.indexOf("localStorage.getItem('kidsgame_" + "tictac')");
    /* MIG：迁移 IIFE 读档先于 KIDS.init 调用（build 同锚） */
  const srcT = src.indexOf('const estMs = s => s.length * 345 + 600') >= 0 &&
    src.split('const estMs').length - 1 === 1;                               /* T：estMs 单定义（data） */
  const srcWin = src.indexOf('WIN_MS = 2604') >= 0 && src.indexOf('DRAW_MS = 2844') >= 0 &&
    src.indexOf('LOSE_MS = 3012') >= 0 && src.indexOf('800 * SPEED') >= 0 &&
    src.indexOf('3300 * SPEED') >= 0 &&
    src.indexOf('REVIEW_MS = 2712 + 300 + 1500') >= 0;                        /* 窗常量族 */
  const srcMm = src.indexOf('function engPerfectPick') >= 0 &&
    src.indexOf('minimax') >= 0;                                              /* minimax 在场（ch4） */
  const srcSeed = src.indexOf('flat * 7919 + ' + '911') >= 0 &&
    src.indexOf('const ' + 'roundSeed') >= 0;                                 /* 种子锚（U8 功能复算为主证） */
  const srcDecide = src.indexOf('const DECIDE_MS = { battle: 7000, puzzle: 12000, v44: 8000, vroll: 8000 }') >= 0;
  const srcEng = src.indexOf('function engV44') >= 0 && src.indexOf('LINES16') >= 0 &&
    src.indexOf('function engRollPick') >= 0 && src.indexOf('ROLL_MOVE_CAP = 36') >= 0 &&
    src.indexOf('function genPuzzles') >= 0 && src.indexOf('PUZ_FALLBACK') >= 0 &&
    src.indexOf('function engReview') >= 0 && src.indexOf('function modeled(flat)') >= 0;
  const flowBtn = boardEl.querySelector('.cell');
  const srcO = !!flowBtn && flowBtn.tagName === 'BUTTON' &&
    getComputedStyle(flowBtn).color === 'rgb(74, 59, 46)';                    /* O：显式 color */
  const winI = SPEC_WINS.win === SPEC_DUR.tk_right + 300 &&
    SPEC_WINS.draw === SPEC_DUR.tk_draw + 300 &&
    SPEC_WINS.lose === SPEC_DUR.tk_lose + 300 &&
    SPEC_WRONG_CHAIN === SPEC_DUR.tk_wrong + 300 &&
    SPEC_REVIEW_MS >= SPEC_DUR.tk_review + 300 &&
    3300 >= SPEC_DUR.tk_tut_watch + 300 &&
    2100 >= SPEC_DUR.tk_tut_turn + 300 &&
    (2620 + 400) >= SPEC_DUR.tk_right + 300;                                 /* 窗=实长+300 算式恒等 */
  const srcOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ &&
    srcK && srcMig && srcT && srcWin && srcMm && srcSeed && srcDecide &&
    srcEng && srcO && winI;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                     I: srcI, J: srcJ, K: srcK, MIG: srcMig, T: srcT, winConst: srcWin,
                     mm: srcMm, seed: srcSeed, DECIDE: srcDecide, eng: srcEng,
                     O: srcO, winI: winI };

  window.__tkProg = 'U10';
  /* ---- ⑩ 链构成：胜/平/负三链单发+残局判对/判错链 ---- */
  total++;
  let chainWin = null;
  if (cw) {                                       /* 胜局链（重驱构造局） */
    window.TK.start(cw.flat);
    for (let r = 1; r < cw.round; r++) await playRound(bd => vEmpties(bd)[0]);
    await unlockedT();
    for (const m of cw.moves) {
      const okw = await unlockedT();
      if (!okw || !cur || cur.done) break;
      const qq = window.TK.quiz;
      if (!qq || qq.board[m] !== '') break;
      const rr = await window.TK.tapCell(m);
      if (rr === 'win' || rr === 'draw' || rr === 'lose') break;
    }
    chainWin = window.__lastQueue ? window.__lastQueue.slice() : null;
  }
  window.TK.start(18);                            /* 平局链（最优对弈=平） */
  const prD1 = await playRound(bd => vBestX(bd));
  const chainDraw = window.__lastQueue ? window.__lastQueue.slice() : null;
  let chainLose = null;
  if (cl) {                                       /* 负局链（DFS 构造；复盘层 say 不进链） */
    window.TK.start(18);
    await unlockedT();
    for (const m of cl) {
      const okw = await unlockedT();
      if (!okw || !cur || cur.done) break;
      const qq = window.TK.quiz;
      if (!qq || qq.board[m] !== '') break;
      const rr = await window.TK.tapCell(m);
      if (rr === 'win' || rr === 'draw' || rr === 'lose') break;
    }
    chainLose = window.__lastQueue ? window.__lastQueue.slice() : null;
  }
  /* 残局链：判错=['tk_wrong']（窗设链）/判对=['tk_right'] */
  let chainPzWrong = null, chainPzRight = null;
  window.TK.start(24);                            /* startLevel 重置错链窗/节流锚 */
  await unlockedT();
  {
    const qp = window.TK.quiz;
    const wI2 = qp.board.findIndex((v, i) => v === '' && i !== qp.answer);
    if (wI2 >= 0) {
      const rw = await window.TK.tapCell(wI2);
      if (rw === 'wrong') chainPzWrong = window.__lastQueue ? window.__lastQueue.slice() : null;
    }
    const qr = window.TK.quiz;
    if (qr) {
      const rr2 = await window.TK.tapCell(qr.answer);
      if (rr2 === 'right') chainPzRight = window.__lastQueue ? window.__lastQueue.slice() : null;
    }
  }
  const chainOk = prD1 && prD1.r === 'draw' &&
    JSON.stringify(chainWin) === JSON.stringify(['tk_right']) &&
    JSON.stringify(chainDraw) === JSON.stringify(['tk_draw']) &&
    JSON.stringify(chainLose) === JSON.stringify(['tk_lose']) &&
    JSON.stringify(chainPzWrong) === JSON.stringify(['tk_wrong']) &&
    JSON.stringify(chainPzRight) === JSON.stringify(['tk_right']) &&
    [chainWin, chainDraw, chainLose, chainPzWrong, chainPzRight].every(c =>
      c.every(p => typeof p === 'string'));       /* 全 clip 无 keyless（N 天然） */
  if (chainOk) npass++;
  units.confirm = { ok: chainOk, win: chainWin, draw: chainDraw, lose: chainLose,
                    pzWrong: chainPzWrong, pzRight: chainPzRight };
  window.__tkProg = 'U11';
  /* ---- ⑪ 写档（origLS 模式——b34 坑②防毁真实档） ---- */
  total++;
  const origSave = window.__tkOrig.save, origPersist = window.__tkOrig.persist,
        origPass = window.__tkOrig.pass;
  const origLS = localStorage.getItem('kidsgame_tictac');      /* b34 坑②：防毁真实玩家档 */
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       /* 还原真函数（init 用） */
    KIDS.store.persist = origPersist;
    KIDS.level.pass = origPass;
    localStorage.removeItem('kidsgame_tictac');
    KIDS.init({ game: 'tictac', title: '井字棋小冠军' });      /* 真实 init：store.load 新档 v1.0 */
    startLevel(0);                               /* verify 页 freshTut 恒 false → 直接备局 */
    const a11 = await window.TK.autoSolve();     /* 真实判定链通关 → winFlow verify 分支 persistWin */
    const raw = localStorage.getItem('kidsgame_tictac');
    const j = raw ? JSON.parse(raw) : null;
    const lv11 = window.TK.currentLevel;
    saveOk = !!(a11.done && a11.taps >= 9 && j && j.v === '1.0' && j.game === 'tictac' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === lv11.stars &&        /* 写档星=钩子星（一致性对账） */
                j.levels['1-0'].plays === 1 &&
                lv11.stars === 3 && lv11.score >= 2.5);        /* autoSolve 最优通关=3★ */
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, lv: lv11, raw: raw && raw.slice(0, 160) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——⑫ 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_tictac');
  else localStorage.setItem('kidsgame_tictac', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  window.__tkProg = 'U12';
  /* ---- ⑫ 真实路径（审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') +
               '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'tictac', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, tictac: { tutSeen: true } };
  let q12 = null, lv12 = null, r12a = null, r12b = null, kind12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_tictac', JSON.stringify(pre));
    KIDS.store.load();                             /* 重读预置档（真实函数） */
    window.__tkDemoR = null;                       /* 教学实证清零（非教学路径不应重设） */
    window.TK.start(0);
    const ok12 = await unlockedT();
    q12 = window.TK.quiz;
    lv12 = window.TK.currentLevel;
    /* 首手落子+已占格拒绝实测 */
    const i12 = q12 && q12.board[4] === '' ? 4 : 0;
    r12a = q12 ? await window.TK.tapCell(i12) : null;
    r12b = q12 ? await window.TK.tapCell(i12) : null;      /* 已占格 → false（bump 家族 D） */
    /* 变体型真实路径形态（v44 16 格/vroll FIFO 队列字段） */
    window.TK.start(30);
    const okA = await unlockedT();
    const qA = window.TK.quiz;
    window.TK.start(36);
    const okB = await unlockedT();
    const qB = window.TK.quiz;
    kind12 = { v44: qA && qA.kind, vroll: qB && qB.kind };
    realOk = ok12 && state.tut === 'none' && window.__tkDemoR === null &&
      !!q12 && q12.kind === 'battle' && q12.turn === 'k' && q12.round === 1 &&
      q12.score === 0 && q12.step === 0 && q12.miss === 0 &&
      Array.isArray(q12.board) && q12.board.length === 9 &&
      !!lv12 && lv12.flat === 0 && lv12.n === 3 && lv12.dch === 1 && lv12.round === 1 &&
      r12a === 'moved' && r12b === false &&
      okA && !!qA && qA.kind === 'v44' && qA.board.length === 16 && qA.miss === 0 &&
      okB && !!qB && qB.kind === 'vroll' && qB.board.length === 9 &&
      Array.isArray(qB.xq) && Array.isArray(qB.oq) && qB.moves === 0 && qB.miss === 0 &&
      typeof window.TK.tapCell === 'function' && typeof window.TK.autoSolve === 'function' &&
      typeof window.TK.start === 'function' && typeof window.TK.final !== 'undefined' &&
      typeof window.TK.review !== 'undefined' &&
      src.indexOf('window.TK =') >= 0 &&                        /* 真实页同暴露（b29 坑⑥） */
      src.indexOf('sv.tictac && sv.tictac.tutSeen') >= 0 &&     /* freshTut 教学分支源码在场 */
      src.indexOf('async function tutorialWatch') >= 0 &&
      (KIDS._save() || {}).v === '1.0';
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_tictac');
    else localStorage.setItem('kidsgame_tictac', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
    KIDS.level.pass = function () { return { chapterDone: false }; };
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut, r12a: r12a, r12b: r12b, kinds: kind12,
                     quiz: q12 && { round: q12.round, step: q12.step },
                     lv: lv12 && { flat: lv12.flat, n: lv12.n, dch: lv12.dch } };

  window.__tkProg = 'U13';
  /* ---- ⑬ 残局专项（30 题独立复算+miss/豁免窗/答案级/J 节流驱动） ---- */
  total++;
  let puzOk = true, puzBad = null;
  for (let flat = 24; flat < 30 && puzOk; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    if (JSON.stringify(L1) !== JSON.stringify(L2) || structWhy(L1)) {   /* 确定性+结构 */
      puzBad = 'flat' + flat + ' det/struct'; puzOk = false; break;
    }
    const sch = SPEC_PUZ_SCHED[flat % SPEC_CONSTS.CH_LEN];
    for (let qi = 0; qi < SPEC_CONSTS.PUZZLES; qi++) {
      const q = L1.puzzles[qi];
      const expType = sch.types.length === 1 ? sch.types[0] : sch.types[qi % sch.types.length];
      const kX = q.board.filter(v => v === 'X').length;
      const kO = q.board.filter(v => v === 'O').length;
      if (q.ptype !== expType || kX !== sch.k || kO !== sch.k ||      /* 题型日程+k 平衡 */
          vScan(q.board.slice()) ||                                    /* 无既有三连 */
          q.board[q.answer] !== '' ||                                  /* 答案在空格 */
          vPuzAnswer(q.board.slice(), q.ptype) !== q.answer) {         /* 谓词+答案独立复算 */
        puzBad = 'flat' + flat + ' q' + qi + ' type=' + q.ptype + '/' + expType +
                 ' k=' + kX + '/' + kO + ' ans=' + q.answer +
                 ' vp=' + vPuzAnswer(q.board.slice(), q.ptype);
        puzOk = false; break;
      }
    }
  }
  /* 驱动：flat24 首题 miss/豁免窗/J 节流/答案级 breathe → 整关通关 */
  let drivePz = null;
  if (puzOk) {
    window.TK.start(24);
    await unlockedT();
    const q0 = window.TK.quiz;
    const wrong1 = q0.board.findIndex((v, i) => v === '' && i !== q0.answer);
    const wrong2 = q0.board.findIndex((v, i) => v === '' && i !== q0.answer && i !== wrong1);
    const wrong3 = q0.board.findIndex((v, i) => v === '' && i !== q0.answer && i !== wrong1 && i !== wrong2);
    const rW1 = wrong1 >= 0 ? await window.TK.tapCell(wrong1) : null;
    const m1 = window.TK.quiz && window.TK.quiz.miss;
    const rW2 = wrong2 >= 0 ? await window.TK.tapCell(wrong2) : null;      /* 窗内错点吞 */
    const m2 = window.TK.quiz && window.TK.quiz.miss;
    await sleep(SPEC_WRONG_CHAIN + 200);                                    /* 过窗（真时钟） */
    const qAfter = window.TK.quiz;
    const wrong3b = qAfter.board.findIndex((v, i) => v === '' && i !== qAfter.answer &&
                                               i !== wrong1 && i !== wrong2);
    const rW3 = wrong3b >= 0 ? await window.TK.tapCell(wrong3b) : null;    /* 窗后二错照计 */
    const m3 = window.TK.quiz && window.TK.quiz.miss;
    const ansEl = boardEl.querySelector('.cell[data-i="' + qAfter.answer + '"]');
    const breatheOk = !!ansEl && ansEl.classList.contains('breathe');      /* miss≥2 答案级 */
    const q2d = window.TK.quiz;
    const rR = q2d ? await window.TK.tapCell(q2d.answer) : null;           /* 判对放行 */
    const stepOk = window.TK.quiz && window.TK.quiz.step === 24 * 5 + 2 - 1;
    let lastR = null;
    for (let t = 0; t < 8; t++) {                                          /* 解剩余 4 题 */
      const okw = await unlockedT();
      if (!cur || cur.done) break;
      const qn = window.TK.quiz;
      if (!qn) break;
      lastR = await window.TK.tapCell(qn.answer);
      if (lastR === 'done') break;
      if (lastR !== 'right') await sleep(60);
    }
    const lvP = window.TK.currentLevel;
    drivePz = { rW1: rW1, m1: m1, rW2: rW2, m2: m2, rW3: rW3, m3: m3,
                breathe: breatheOk, rR: rR, stepOk: stepOk, lastR: lastR,
                lv: lvP && { done: lvP.done, miss: lvP.miss, stars: lvP.stars, n: lvP.n } };
    puzOk = rW1 === 'wrong' && m1 === 1 && rW2 === false && m2 === 1 &&    /* 窗内吞：false+miss 不增 */
            rW3 === 'wrong' && m3 === 2 && breatheOk &&                     /* 窗后照计+答案级 */
            rR === 'right' && stepOk && lastR === 'done' &&
            !!lvP && lvP.done === true && lvP.miss === 2 && lvP.stars === 2 &&
            lvP.n === 5;                                                    /* miss=2→2★（§-r18 §1） */
    if (!puzOk) puzBad = 'drive';
  }
  if (puzOk) npass++;
  units.puzzle = { ok: puzOk, bad: puzBad, drive: drivePz };

  window.__tkProg = 'U14';
  /* ---- ⑭ v44 专项（LINES16 双录+参考 AI 逐手对账+两次全驱一致） ---- */
  total++;
  const l16Ok = JSON.stringify(LINES16.map(L => L.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1])) ===
    JSON.stringify(vLINES16.map(L => L.slice()).sort((a, b) => a[0] - b[0] || a[1] - b[1])) &&
    LINES16.length === 24;
  let v44Ok = l16Ok, v44Bad = null;
  for (let flat = 30; flat < 36 && v44Ok; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    if (JSON.stringify(L1) !== JSON.stringify(L2) || structWhy(L1) || L1.kind !== 'v44') {
      v44Bad = 'flat' + flat; v44Ok = false;
    }
  }
  /* playRound16：走完一局 v44（X=独立 vV44；兔子应手=复算对账+合法性） */
  async function playRound16() {
    for (let guard = 0; guard < 300; guard++) {
      const ok = await unlockedT();
      if (!ok || !cur || cur.done || cur.flat < 0) return null;
      const q = window.TK.quiz;
      if (!q || q.board.length !== 16) return null;
      const prev = q.board.slice();
      const xs0 = prev.filter(v => v === 'X').length, os0 = prev.filter(v => v === 'O').length;
      if (xs0 !== os0) return { r: 'balance ' + xs0 + '/' + os0 };      /* 先手交替先验 */
      const i = vV44(prev, 'X');
      if (i == null || prev[i] !== '') { await sleep(60); continue; }
      const r = await window.TK.tapCell(i);
      if (r === 'win' || r === 'draw' || r === 'lose') return { r: r };
      if (r !== 'moved') { await sleep(60); continue; }
      const now = window.TK.quiz ? window.TK.quiz.board : null;
      if (!now) return null;
      const diff = [];
      for (let k = 0; k < 16; k++) if (prev[k] !== now[k]) diff.push(k);
      if (diff.length !== 2 || now[i] !== 'X') return { r: 'boardBad', diff: diff };
      const sim = prev.slice(); sim[i] = 'X';
      const expO = vV44(sim, 'O');                                       /* 参考兔应手复算 */
      const oCell = diff.filter(k => now[k] === 'O')[0];
      if (oCell !== expO) return { r: 'rabbit ' + oCell + '/' + expO };  /* 逐手对账 */
    }
    return null;
  }
  let v44Drive = null;
  if (v44Ok) {
    const driveA = async () => {
      window.TK.start(30);
      const rs = [];
      for (let r = 1; r <= 3; r++) {
        let rr = null;
        for (let t = 0; t < 40 && !rr; t++) {
          const pr = await playRound16();
          if (!pr) { await sleep(80); continue; }
          rr = pr.r;
        }
        rs.push(rr);
      }
      return { rs: rs, score: window.TK.currentLevel.score,
               stars: window.TK.currentLevel.stars, done: window.TK.currentLevel.done };
    };
    const dA = await driveA();
    const dB = await driveA();                                           /* 两次全驱一致 */
    v44Drive = { A: dA, B: dB };
    v44Ok = dA.done === true && dA.rs.every(x => x === 'win' || x === 'draw' || x === 'lose') &&
      dA.score >= 0 && dA.stars === vStars(dA.score) &&
      JSON.stringify(dA) === JSON.stringify(dB);
    if (!v44Ok) v44Bad = 'drive';
  }
  if (v44Ok) npass++;
  units.v44 = { ok: v44Ok, lines: l16Ok, bad: v44Bad, drive: v44Drive };

  window.__tkProg = 'U15';
  /* ---- ⑮ vroll 专项（参考引擎 lockstep 逐手对账+oldest DOM+整关） ---- */
  total++;
  let vrOk = true, vrBad = null;
  for (let flat = 36; flat < 42 && vrOk; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    if (JSON.stringify(L1) !== JSON.stringify(L2) || structWhy(L1) || L1.kind !== 'vroll') {
      vrBad = 'flat' + flat; vrOk = false;
    }
  }
  /* 引擎级移子语义直测：满 3 未移 → 第 4 子落下=最旧子移出（FIFO）+格回空 */
  const gSem = { board: Array(9).fill(''), xq: [], oq: [], moves: 0 };
  vRollApply(gSem, 'X', 0); vRollApply(gSem, 'O', 1); vRollApply(gSem, 'X', 2);
  vRollApply(gSem, 'O', 3); vRollApply(gSem, 'X', 4);
  const capReached = gSem.xq.length === 3 && gSem.board[0] === 'X';   /* 满 3 仍在场 */
  const rm = vRollApply(gSem, 'X', 6);                                 /* 第 4 子=移最旧 0 */
  const semOk = capReached && rm === 0 &&
    JSON.stringify(gSem.xq) === JSON.stringify([2, 4, 6]) &&
    gSem.board[0] === '' && gSem.board[6] === 'X' && gSem.oq.length === 2;
  /* lockstep 驱动一局：X/O 全走独立 vRollPick，页面引擎逐手对账（board/xq/oq/moves） */
  async function driveVrollRound() {
    const sim = { board: Array(9).fill(''), xq: [], oq: [], moves: 0 };
    let oldestSeen = false;
    for (let guard = 0; guard < 120; guard++) {
      const ok = await unlockedT();
      if (!ok || !cur || cur.done) return { r: null, oldestSeen: oldestSeen };
      const q = window.TK.quiz;
      if (!q || q.kind !== 'vroll') return { r: 'kind', oldestSeen: oldestSeen };
      if (JSON.stringify(q.board) !== JSON.stringify(sim.board) ||
          JSON.stringify(q.xq) !== JSON.stringify(sim.xq) ||
          JSON.stringify(q.oq) !== JSON.stringify(sim.oq) || q.moves !== sim.moves)
        return { r: 'sim', oldestSeen: oldestSeen };
      if (sim.xq.length >= SPEC_CONSTS.ROLL_CAP_PIECES) {             /* oldest DOM 标记 */
        const el = boardEl.querySelector('.cell[data-i="' + sim.xq[0] + '"]');
        if (!el || !el.classList.contains('oldest')) return { r: 'oldestDom', oldestSeen: false };
        oldestSeen = true;
      }
      const xi = vRollPick({ board: sim.board.slice(), xq: sim.xq.slice(), oq: sim.oq.slice() }, 'X');
      if (xi == null || sim.board[xi] !== '') return { r: 'noMove', oldestSeen: oldestSeen };
      const r = await window.TK.tapCell(xi);
      if (r === 'win' || r === 'draw' || r === 'lose') return { r: r, oldestSeen: oldestSeen };
      if (r !== 'moved') { await sleep(60); continue; }
      vRollApply(sim, 'X', xi); sim.moves++;
      const oi = vRollPick({ board: sim.board.slice(), xq: sim.xq.slice(), oq: sim.oq.slice() }, 'O');
      if (oi == null) return { r: 'noRabbit', oldestSeen: oldestSeen };
      vRollApply(sim, 'O', oi); sim.moves++;
    }
    return { r: null, oldestSeen: oldestSeen };
  }
  let vrDrive = null;
  if (vrOk && semOk) {
    window.TK.start(36);
    const rs = [];
    let oldestAny = false, bad = null;
    for (let r = 1; r <= 3; r++) {
      let rr = null;
      for (let t = 0; t < 60 && !rr; t++) {
        const pr = await driveVrollRound();
        if (pr.oldestSeen) oldestAny = true;
        if (!pr.r) { await sleep(80); continue; }
        if (pr.r !== 'win' && pr.r !== 'draw' && pr.r !== 'lose') { bad = pr.r; break; }
        rr = pr.r;
      }
      if (bad) break;
      rs.push(rr);
    }
    const lvV = window.TK.currentLevel;
    vrDrive = { rs: rs, bad: bad, oldest: oldestAny,
                lv: lvV && { done: lvV.done, score: lvV.score, stars: lvV.stars } };
    vrOk = !bad && rs.every(x => x === 'win' || x === 'draw' || x === 'lose') &&
      !!lvV && lvV.done === true && lvV.stars === vStars(lvV.score) && oldestAny;
    if (!vrOk) vrBad = bad || 'drive';
  } else if (!semOk) {
    vrOk = false; vrBad = 'sem';
  }
  if (vrOk) npass++;
  units.vroll = { ok: vrOk, bad: vrBad, sem: semOk, drive: vrDrive };

  window.__tkProg = 'U16';
  /* ---- ⑯ 复盘专项（负局=独立回溯对账+DOM 红绿格+胜局无复盘） ---- */
  total++;
  /* 胜局无复盘：重驱构造胜局 → review null */
  let rvWinOk = false;
  if (cw) {
    window.TK.start(cw.flat);
    for (let r = 1; r < cw.round; r++) await playRound(bd => vEmpties(bd)[0]);
    await unlockedT();
    for (const m of cw.moves) {
      const okw = await unlockedT();
      if (!okw || !cur || cur.done) break;
      const qq = window.TK.quiz;
      if (!qq || qq.board[m] !== '') break;
      const rr = await window.TK.tapCell(m);
      if (rr === 'win' || rr === 'draw' || rr === 'lose') break;
    }
    rvWinOk = window.TK.review === null;
  }
  /* 负局：独立重建手序（cl X 手+vPerfect O 应手）→ vReview 首误步 → TK.review 对账 */
  let rvOk = false, rvDetail = null;
  if (cl) {
    const histV = [];
    const bdS = ['', '', '', '', '', '', '', '', ''];
    for (let k = 0; k < cl.length; k++) {
      histV.push({ p: 'X', i: cl[k] });
      bdS[cl[k]] = 'X';
      if (vScan(bdS)) break;
      const oi = vPerfect(bdS.slice());
      histV.push({ p: 'O', i: oi });
      bdS[oi] = 'O';
      if (vScan(bdS)) break;
    }
    const expRv = vReview(histV);
    window.TK.start(18);
    await unlockedT();
    /* 走到最后一手前（复盘层在末手结算窗内出现——fire-and-forget 捕获） */
    for (let k = 0; k < cl.length - 1; k++) {
      const okw = await unlockedT();
      if (!okw || !cur || cur.done) break;
      const qq = window.TK.quiz;
      if (!qq || qq.board[cl[k]] !== '') break;
      const rr = await window.TK.tapCell(cl[k]);
      if (rr === 'win' || rr === 'draw' || rr === 'lose') break;
    }
    const pFinal = window.TK.tapCell(cl[cl.length - 1]);        /* 末手不 await——先捕层 */
    let ov = null;
    for (let g = 0; g < 160; g++) {
      ov = document.querySelector('.k-review');
      if (ov) break;
      await sleep(25);
    }
    let domRv = null;
    if (ov) {
      const missEl = ov.querySelector('.rv-cell.rev-miss');
      const bestEl = ov.querySelector('.rv-cell.rev-best');
      domRv = { miss: missEl ? Number(missEl.dataset.i) : -1,
                best: bestEl ? Number(bestEl.dataset.i) : -1,
                cells: ov.querySelectorAll('.rv-cell').length };
    }
    const rFinal = await pFinal;
    const tkRv = window.TK.review;
    rvDetail = { exp: expRv, got: tkRv, dom: domRv, rFinal: rFinal };
    rvOk = rFinal === 'lose' && !!expRv && !!tkRv &&
      tkRv.moveNo === expRv.moveNo && tkRv.missCell === expRv.missCell &&
      tkRv.bestCell === expRv.bestCell &&
      JSON.stringify(tkRv.boardBefore) === JSON.stringify(expRv.boardBefore) &&
      !!domRv && domRv.cells === 9 && domRv.miss === expRv.missCell &&
      domRv.best === expRv.bestCell;
  }
  const reviewOk = rvWinOk && rvOk;
  if (reviewOk) npass++;
  units.review = { ok: reviewOk, winNoReview: rvWinOk, lose: rvDetail };

  window.__tkProg = 'U17';
  /* ---- ⑰ 全谱实证（§-r18 delta4：X 全策略×O=页面 engPerfectPick 整树 DFS） ---- */
  total++;
  let spTotal = 0, spONodes = 0, spXWin = false, spAgree = true;
  const dfs17 = (bd, turn) => {
    spTotal++;
    const w = vScan(bd);
    if (w) { if (w.who === 'X') spXWin = true; return; }
    const e = vEmpties(bd);
    if (!e.length) return;
    if (turn === 'X') {
      for (const i of e) { bd[i] = 'X'; dfs17(bd, 'O'); bd[i] = ''; }
    } else {
      spONodes++;
      const pg = engPerfectPick(bd.slice());      /* 页面引擎（被验对象） */
      const vg = vPerfect(bd.slice());            /* verify 独立复算 */
      if (pg !== vg || e.indexOf(pg) < 0) spAgree = false;
      bd[pg] = 'O'; dfs17(bd, 'X'); bd[pg] = '';
    }
  };
  dfs17(['', '', '', '', '', '', '', '', ''], 'X');
  const spOk = !spXWin && spAgree && spTotal >= 1500 && spONodes >= 500;   /* python 先验 768 */
  if (spOk) npass++;
  units.fullSpectrum = { ok: spOk, xWin: spXWin, agree: spAgree,
                        totalNodes: spTotal, oNodes: spONodes };

  window.__tkProg = 'U18';
  /* ---- ⑱ 时长模型（§-r18 §4 精确值钉死，禁约数） ---- */
  total++;
  let mdOk = true, mdBad = null;
  const pinFlats = { 0: SPEC_MODELED.battle, 6: SPEC_MODELED.battle,
                     18: SPEC_MODELED.battle, 24: SPEC_MODELED.puzzle, 29: SPEC_MODELED.puzzle,
                     30: SPEC_MODELED.v44, 35: SPEC_MODELED.v44,
                     36: SPEC_MODELED.vroll, 41: SPEC_MODELED.vroll,
                     42: SPEC_MODELED.battle, 61: SPEC_MODELED.battle };
  for (const f of Object.keys(pinFlats)) {
    if (modeled(Number(f)) !== pinFlats[f]) {
      mdOk = false; mdBad = 'pin flat' + f + '=' + modeled(Number(f)) + '/' + pinFlats[f]; break;
    }
  }
  let minMd = Infinity;
  for (let f = 0; f < SPEC_CONSTS.STATIC_LEVELS; f++) {
    const m = modeled(f), vm = vModeled(f);
    if (m !== vm) { mdOk = false; mdBad = 'vmodeled flat' + f + '=' + m + '/' + vm; break; }
    if (m < SPEC_LEVEL_MIN) { mdOk = false; mdBad = 'min flat' + f + '=' + m; break; }
    if (m < minMd) minMd = m;
  }
  for (let f = SPEC_CONSTS.STATIC_LEVELS; f < 62; f++) {
    if (modeled(f) !== vModeled(f)) { mdOk = false; mdBad = 'gen flat' + f; break; }
  }
  if (minMd !== SPEC_MODELED.puzzle) { mdOk = false; mdBad = 'min=' + minMd; }
  if (mdOk) npass++;
  units.modeled = { ok: mdOk, bad: mdBad, min: minMd,
                    pins: SPEC_MODELED };

  window.__tkProg = 'U19';
  /* ---- ⑲ 章预告（7 章名+hint 双录+nextHint 章末逐点+生成关实算） ---- */
  total++;
  const chOk = Object.keys(SPEC_CHAPTERS).every(c =>
    CHAPTERS[Number(c)].name === SPEC_CHAPTERS[c] && CHAPTERS[Number(c)].hint === SPEC_CHAPTER_HINTS[c]);
  const nhOk = [5, 11, 17, 23, 29, 35, 41].every((f, k) =>
    nextHint(f) === SPEC_CHAPTER_HINTS[k + 1]);                 /* 章末预告=下一章 hint */
  const genHintOk = [47, 53, 59].every(f =>
    nextHint(f) === SPEC_GEN_HINTS[genLevel(f + 1).dch - 1]) && /* 生成关实算（家族 F） */
    GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
    GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3];
  const hintOk = chOk && nhOk && genHintOk;
  if (hintOk) npass++;
  units.hints = { ok: hintOk, chapters: chOk, nextHint: nhOk, gen: genHintOk };

  window.__tkProg = 'U20';
  /* ---- ⑳ SPEED 口径 ---- */
  total++;
  const sp20 = SPEED === 0.12;
  if (sp20) npass++;
  units.speed = { ok: sp20, speed: SPEED };

  const out = { game: 'tictac', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__tkVlog = out;                          /* 外部断言挂点（任务书钩子） */
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total
                                     : 'VERIFY FAIL ' + (total - npass) + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；
     voice.queue 记录拼播链（__lastQueue——胜/平/负/残局链绑定断言） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  /* 沙盒三件（b34 教训族）：_save stub / persist no-op / level.pass no-op——
     单元③在 KIDS.init 前通关 24 次，persistWin→KIDS.level.pass 在 core 内部 save=null
     上必炸（本款 verify 必须 stub，⑪ 再还原真函数） */
  window.__tkOrig = { save: KIDS._save, persist: KIDS.store.persist, pass: KIDS.level.pass };
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};
  KIDS.level.pass = function () { return { chapterDone: false }; };
  runVerify();
}
