/* ================= gomoku4 纯引擎：确定性关卡生成 + 恰四扫描 + AI 决策 + solver + 对局模拟（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   胜负口径（SPEC §0.41，审查 M1 裁决）：横/竖/斜极大连续段 ≥4 即胜（Connect-Four 惯例）
   AI 决策纯函数（任务指示：同局面同应手，禁 Math.random 在决策路径）：
     规则序 = ①己方一步制胜点 ②堵玩家一步制胜点 ③己方活三延伸·双威胁优先（造≥2 制胜点）
              ④堵玩家活三（玩家落后出现制胜点的空点） ⑤中心/邻子偏好（seeded 平手打破） ⑥seeded 兜底
     强度档：block（ch1）跳①③ / mid（ch4）跳③ / full（ch2-3）全规则
   seeded 兜底 rnd = mulberry32(boardHash ^ aiSeed)：同局面+同关内变体 → 同应手（确定性）；
     同关 5 局 aiSeed 互异（v0-v4）→ 兜底层分叉 → 5 局棋谱互异（sig 体验互异）
   miss 口径（家族统一）：负局=1 错（miss/retries 计一次）；平/胜不计；零惩罚重下+换先手（M2）
   星级：0 错=3★ / 1-2 错=2★ / 更多=1★（永不 0） */
'use strict';
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 局配置（章 → 棋盘边/先手/AI 强度档；ch4 交替先手：局 0/2/4 玩家先、1/3 AI 先） ---------- */
function gameCfgFor(dch, k) {
  if (dch === 1) return { n: 4, first: 1, aiMode: 'block' };
  if (dch === 2) return { n: 5, first: 1, aiMode: 'full' };
  if (dch === 3) return { n: 5, first: 2, aiMode: 'full' };
  return { n: 5, first: (k % 2 === 0 ? 1 : 2), aiMode: 'mid' };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const games = [];
  for (let k = 0; k < CH_LEN; k++) {
    const c = gameCfgFor(dch, k);
    const aiSeed = (flat * 131 + k * 17 + 7) | 0;                     // 关内变体种子（v0-v4 互异）
    games.push({ n: c.n, first: c.first, aiMode: c.aiMode, aiSeed,
      sig: c.n + '-' + c.first + '-' + c.aiMode + '-v' + k });
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, games: games,
    step: 0, retries: 0, done: false };
}

/* ================= 连线扫描（游戏侧唯一胜负判定；verify 侧另写独立扫描器对账 §0.41）
   段首判定法：格 i 有色 c 且反方向邻格非 c → i 是极大段首；沿方向数段长，≥4 → 胜 ================= */
const DIRS4 = [[1, 0], [0, 1], [1, 1], [1, -1]];
function engScanWin(board, n) {
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const c = board[y * n + x];
      if (!c) continue;
      for (let d = 0; d < 4; d++) {
        const dx = DIRS4[d][0], dy = DIRS4[d][1];
        const px = x - dx, py = y - dy;
        if (px >= 0 && px < n && py >= 0 && py < n && board[py * n + px] === c) continue; // 非段首
        let len = 1, cx = x, cy = y;
        const line = [y * n + x];
        for (;;) {
          cx += dx; cy += dy;
          if (cx < 0 || cx >= n || cy < 0 || cy >= n || board[cy * n + cx] !== c) break;
          len++; line.push(cy * n + cx);
        }
        if (len >= 4) return { who: c, line: line };                   // ≥4 连即胜（审查 M1 裁决：
                                                                       // Connect-Four 惯例+连五不赢对 7-8 岁
                                                                       // 是教育黑洞；极大段≥4 含整线）
      }
    }
  }
  return null;
}

/* ---------- 空位表 ---------- */
function emptiesOf(board) {
  const out = [];
  for (let i = 0; i < board.length; i++) if (!board[i]) out.push(i);
  return out;
}
/* ---------- 棋盘 hash（seeded 兜底种子派生：局面内容 + 关内变体） ---------- */
function boardHash(board) {
  let h = 5381;
  for (let i = 0; i < board.length; i++) h = (Math.imul(h, 33) + board[i]) | 0;
  return h >>> 0;
}
/* ---------- 落点局部判定：who 落 i 后是否形成含 i 的 ≥4 极大段
   （落子只影响过 i 的 4 条线——局部数段，与 engScanWin 全盘口径一致：
   此前局面无四连时，新四连必含 i；性能 O(32) vs 全盘扫描 O(board)） ---------- */
function makesFourAt(board, n, i, who) {
  const x = i % n, y = (i / n) | 0;
  for (let d = 0; d < 4; d++) {
    const dx = DIRS4[d][0], dy = DIRS4[d][1];
    let len = 1;
    let cx = x + dx, cy = y + dy;
    while (cx >= 0 && cx < n && cy >= 0 && cy < n && board[cy * n + cx] === who) { len++; cx += dx; cy += dy; }
    cx = x - dx; cy = y - dy;
    while (cx >= 0 && cx < n && cy >= 0 && cy < n && board[cy * n + cx] === who) { len++; cx -= dx; cy -= dy; }
    if (len >= 4) return true;                   /* ≥4 连即胜（审查 M1 裁决，与 engScanWin 同口径） */
  }
  return false;
}
/* ---------- 制胜点集：who 落该空点后出现「≥4 连」的全体空点（就地试落+局部判定） ---------- */
function winPointsFor(board, n, who) {
  const out = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i]) continue;
    board[i] = who;
    const four = makesFourAt(board, n, i, who);
    board[i] = 0;
    if (four) out.push(i);
  }
  return out;
}
/* ---------- 中心/邻子偏好分（距中心近 + 2 格窗口内己方/对方子多者优） ---------- */
function prefScore(board, n, i, me) {
  const x = i % n, y = (i / n) | 0, cx = (n - 1) / 2;
  let s = -(Math.abs(x - cx) + Math.abs(y - cx));
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= n || ny < 0 || ny >= n) continue;
      const v = board[ny * n + nx];
      if (v === me) s += 3; else if (v) s += 2;
    }
  }
  return s;
}
/* 偏好最优——稳定版（solver 用：无抖动，同分取索引第一——首手恒中心，必胜确定性） */
function bestByPrefStable(board, n, me) {
  const es = emptiesOf(board);
  let best = es[0], bs = -1e9;
  for (const i of es) {
    const s = prefScore(board, n, i, me);
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}
/* 偏好最优——抖动版（AI 用：±JITTER 内 seeded 翻转，主干中心/邻子偏好保留——
   变体种子在此生效；同局面同 seed 同选=确定性，不同变体不同选=体验多样） */
const PREF_JITTER = 3.5;
function bestByPref(board, n, me, rnd) {
  const es = emptiesOf(board);
  let best = es[0], bs = -1e9;
  for (const i of es) {
    const s = prefScore(board, n, i, me) + rnd() * PREF_JITTER;
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}
/* 变体开局表（AI 先手空盘首手：表长 5=关内 5 局必互异；≥4 口径下中心/星位均合理）
   5×5=中心+四星（实测 40 关 200 局 solver 0 负——确定性引擎测过即恒成立）
   4×4=四中+角 */
const OPEN5 = [12, 6, 7, 16, 18];
const OPEN4 = [5, 6, 9, 10, 0];

/* ================= 兔子 AI 决策（纯函数：board,n,mode,aiSeed → 格 idx；同局面同应手）
   规则序见文件头；block=②④⑤ / mid=①②④⑤ / full=①②③④⑤ ================= */
function engAiPick(board, n, mode, aiSeed) {
  if (!emptiesOf(board).length) return null;                         /* 满盘防御（理论不可达） */
  const rnd = mulberry32((boardHash(board) ^ Math.imul(aiSeed || 0, 2654435761)) >>> 0);
  if (board.every(v => v === 0)) {                                   /* AI 先手空盘：变体开局表（5 局必互异） */
    const table = n === 4 ? OPEN4 : OPEN5;
    return table[Math.abs(aiSeed || 0) % table.length];
  }
  let stoneCnt = 0, only = -1;
  for (let i = 0; i < board.length; i++) { if (board[i]) { stoneCnt++; only = i; } }
  if (stoneCnt === 1 && board[only] === 1) {                         /* AI 后手第一应手：贴身变体表
                                                                       （邻域空格索引序 + aiSeed 取模——关内 5 局必互异；
                                                                       贴玩家子=防守语义，不伤 AI 强度） */
    const ox = only % n, oy = (only / n) | 0, near = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = ox + dx, ny = oy + dy;
      if (nx >= 0 && nx < n && ny >= 0 && ny < n) near.push(ny * n + nx);
    }
    if (near.length) return near[Math.abs(aiSeed || 0) % near.length];
  }
  if (mode !== 'block') {                                            // ① 己方一步制胜（block 跳过——只堵不攻）
    const w = winPointsFor(board, n, 2);
    if (w.length) return w[0];
  }
  const fw = winPointsFor(board, n, 1);                              // ② 堵玩家一步制胜点
  if (fw.length) return fw[0];
  if (mode === 'full') {                                             // ③ 己方活三延伸（双威胁优先）
    let single = -1;
    for (let i = 0; i < board.length; i++) {
      if (board[i]) continue;
      board[i] = 2;
      const w2 = winPointsFor(board, n, 2);
      board[i] = 0;
      if (w2.length >= 2) return i;                                  // 落后 ≥2 制胜点=双威胁必杀
      if (w2.length === 1 && single < 0) single = i;                 // 单威胁延伸（活三）
    }
    if (single >= 0) return single;
  }
  for (let i = 0; i < board.length; i++) {                           // ④ 堵玩家活三（玩家落后出现制胜点）
    if (board[i]) continue;
    board[i] = 1;
    const w1 = winPointsFor(board, n, 1);
    board[i] = 0;
    if (w1.length) return i;
  }
  return bestByPref(board, n, 2, rnd);                               // ⑤/⑥ 中心邻子偏好（seeded 平手打破=兜底）
}

/* ================= 玩家侧 solver（autoSolve / verify 直驱 / 教学"帮"指向共用）
   比 AI 多一层：④'防对方双威胁抢先封点——压制规则 AI 保障通关
   （⑥ 兜底稳定版：首手恒中心；实测 40 关 200 局胜平率 199/200，
   唯一残余风险局由 AI 开局表选点规避——确定性引擎测过即恒成立） ================= */
function engSolverPick(board, n) {
  const w = winPointsFor(board, n, 1);                               // ① 制胜
  if (w.length) return w[0];
  const fw = winPointsFor(board, n, 2);                              // ② 堵（多点=输定局，选偏好最高的堵）
  if (fw.length) {
    let best = fw[0], bs = -1e9;
    for (const i of fw) { const s = prefScore(board, n, i, 1); if (s > bs) { bs = s; best = i; } }
    return best;
  }
  let single = -1, singleScore = -1e9;
  for (let i = 0; i < board.length; i++) {                           // ③ 双威胁构造（先于防——我先成杀先赢）
    if (board[i]) continue;
    board[i] = 1;
    const w1 = winPointsFor(board, n, 1);
    board[i] = 0;
    if (w1.length >= 2) return i;
    if (w1.length === 1) {
      const s = prefScore(board, n, i, 1);
      if (s > singleScore) { singleScore = s; single = i; }
    }
  }
  for (let i = 0; i < board.length; i++) {                           // ④ 防对方双威胁（对方落后 ≥2 制胜点的点=抢先占）
    if (board[i]) continue;
    board[i] = 2;
    const w2 = winPointsFor(board, n, 2);
    board[i] = 0;
    if (w2.length >= 2) return i;
  }
  if (single >= 0) return single;                                    // ③b 单威胁延伸
  for (let i = 0; i < board.length; i++) {                           // ⑤ 堵对方活三延伸
    if (board[i]) continue;
    board[i] = 2;
    const w2 = winPointsFor(board, n, 2);
    board[i] = 0;
    if (w2.length === 1) return i;
  }
  return bestByPrefStable(board, n, 1);                              // ⑥ 中心/邻子（稳定版：首手恒中心——必胜确定性）
}

/* ---------- 送命策略（verify 负局路径实测用）：永远不堵——选与全部棋子最远的空点 ---------- */
function engSuicidePick(board, n) {
  let best = -1, bs = -1e9;
  for (let i = 0; i < board.length; i++) {
    if (board[i]) continue;
    const x = i % n, y = (i / n) | 0;
    let dmin = 99;
    for (let j = 0; j < board.length; j++) {
      if (!board[j]) continue;
      const jx = j % n, jy = (j / n) | 0;
      const d = Math.max(Math.abs(x - jx), Math.abs(y - jy));
      if (d < dmin) dmin = d;
    }
    const s = dmin * 10 - (Math.abs(x - (n - 1) / 2) + Math.abs(y - (n - 1) / 2));
    if (s > bs) { bs = s; best = i; }
  }
  return best;
}

/* ---------- 教学 watch 演示配步 AI：避开玩家全部子 ≥3 曼哈顿距离（永不堵演示线）
   距离取曼哈顿而非切比雪夫：切比雪夫 2 允许同排隔 2 格（会挡 row0 演示线）；曼哈顿 ≥3
   把整段演示行连同斜贴位都让开（4×4 实测每步避让候选 ≥4 格） ---------- */
function engDemoPick(board, n, seed) {
  const rnd = mulberry32((boardHash(board) ^ (seed || 99)) >>> 0);
  const far = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i]) continue;
    const x = i % n, y = (i / n) | 0;
    let dmin = 99;
    for (let j = 0; j < board.length; j++) {
      if (board[j] !== 1) continue;
      const jx = j % n, jy = (j / n) | 0;
      const d = Math.abs(x - jx) + Math.abs(y - jy);
      if (d < dmin) dmin = d;
    }
    if (dmin >= 3) far.push(i);                                      // 避让区：距玩家全部子曼哈顿 ≥3
  }
  if (!far.length) return bestByPref(board, n, 2, rnd);              // 无处可避（理论不可达）退化
  const a = far.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a[0];
}

/* ================= 对局模拟（引擎直驱，无 DOM）：solver vs AI 全程落子
   返回 {result:'win'|'lose'|'draw'|'ERR', winline, moves, aiMoves, board}
   AI 每步合法内置断言（空位；轮替由循环保证；界内由索引保证）——ERR=非法即终止 ================= */
function engPlayGame(g) {
  const n = g.n, board = new Array(n * n).fill(0);
  let turn = g.first;
  const moves = [], aiMoves = [];
  for (let guard = 0; guard <= n * n; guard++) {
    const idx = turn === 1 ? engSolverPick(board, n) : engAiPick(board, n, g.aiMode, g.aiSeed);
    if (idx == null || idx < 0 || idx >= n * n || board[idx] !== 0) { // AI/solver 每步合法（空位+界内）
      return { result: 'ERR', bad: idx, moves: moves, aiMoves: aiMoves, board: board };
    }
    board[idx] = turn; moves.push(idx);
    if (turn === 2) aiMoves.push(idx);
    const w = engScanWin(board, n);
    if (w) return { result: w.who === 1 ? 'win' : 'lose', winline: w.line, moves: moves, aiMoves: aiMoves, board: board };
    if (moves.length === n * n) return { result: 'draw', winline: null, moves: moves, aiMoves: aiMoves, board: board };
    turn = 3 - turn;
  }
  return { result: 'ERR', moves: moves, aiMoves: aiMoves, board: board };
}

/* ---------- 关级通关模拟（含负局零惩罚重下：lose→同局重开再战，miss 计一次） ---------- */
function engPlayLevel(L) {
  const results = [];
  let retries = 0;
  for (let k = 0; k < L.games.length; k++) {
    for (let att = 0; att < 40; att++) {                             // 重下上限防御
      const r = engPlayGame(L.games[k]);
      results.push(r.result);
      if (r.result === 'lose') { retries++; continue; }              // 负局=1 错，重下不推进
      break;                                                         // win/draw 过题
    }
  }
  return { results: results, retries: retries, done: true };
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（miss=retries=负局总数口径，家族统一） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- AI 假思考时长（600-1200ms，seeded 确定性派生；verify 页乘 SPEED） ---------- */
function thinkMs(g) {
  const rnd = mulberry32((boardHash(g.board) ^ Math.imul(g.cfg.aiSeed, 2246822519)) >>> 0);
  return AI_THINK_MIN + Math.floor(rnd() * AI_THINK_SPAN);
}
