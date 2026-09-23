/* ================= tictac 引擎（纯函数无 DOM）：关卡生成 / 胜负扫描 / 兔子 AI / 残局题库 /
   4×4 与限子变体 / minimax 复盘回溯 / 时长模型
   ─ 关卡确定性（SPEC-BATCH36 §0.90）
   种子 = mulberry32(flat * 7919 + 911)（本款常量 tictac=911）：dch=ri(1,4) 仅生成关 flat≥42
   消耗此流（同 flat 永远同 dch，重玩一致）。
   ─ 局内 RNG 分流（SPEC §0.90/§3 定版）
   每局兔子随机档用独立 mulberry32(flat * 7919 + 911 + round * 77)（round=1-3 局号），
   与 dch RNG 分流；残局题库第三分流 mulberry32(flat*7919+911+7777+qi*131)（§-r18 §2）。
   ─ 关型（§-r18 §1）：battle=classic 3×3 四档；puzzle=残局三类题；
   v44=4×4 得 3 连（LINES16 24 线，AI=engV44 确定性 depth-4，零 rng）；
   vroll=限子滚动（每方 ≤3 子 FIFO 移出，AI=engRollPick 确定性，零 rng）。
   ─ 兔子 AI 四档（rng 消耗序——verify 独立复算锚；仅 battle 用 rng）
   dch1 random  ：empties[floor(rnd()*empties.length)]（每次应手恰 1 次 rnd()）
   dch2 block   ：先堵孩子成三连格（0 次 rnd()）；否则同 dch1 随机（1 次 rnd()）
   dch3 smart   ：①自己一步杀（0 次）→②堵孩子一步杀（0 次）→③漏率 rnd()<0.2 走随机
                  （此分支共 2 次 rnd()：判定 1 次+选格 1 次）→④中心空则占中（0 次）
                  →⑤角 [0,2,6,8] 升序首个空角（0 次）→⑥随机（1 次 rnd()）
   dch4 perfect ：minimax 全展开，不消耗 rnd()（全谱遍历断言：X 全策略×O perfect 无 X 胜）
   ─ minimax 平分裁决（verify 独立复算同格锚）
   深度计分：O 胜=10-depth / X 胜=depth-10 / 平=0（O 视角）；候选格升序遍历，
   严格更优才替换（平分取最小下标）——同局面恒同应手（确定性）。v44 同裁决公约。
   ─ 星级（§-r18 §1 分题型）：battle/v44/vroll 分值制（≥2.5=3★/≥1.5=2★/完成=1★）；
   puzzle miss 制（0=3★/1-2=2★/≥3=1★），永不 0★。
   miss 口径（§-r18 §5）：对战关恒 0（I 豁免备案）；残局题答错计 miss（契约 I 全量适用）。 */
'use strict';

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数

const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
/* 关型（§-r18 §1）：静态关按章映射；生成关 flat≥42 恒 battle（dch=ri(1,4) 四档） */
const kindOfFlat = flat => flat < STATIC_LEVELS ? KIND_OF_CH[chOfFlat(flat)] : 'battle';

/* ---------- 八条胜线（井字棋 3×3 全量） ---------- */
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],    // 三横
  [0, 3, 6], [1, 4, 7], [2, 5, 8],    // 三竖
  [0, 4, 8], [2, 4, 6]                // 两对角
];

/* ---------- 胜负扫描：返回 { who:'X'|'O', line:[a,b,c] } 或 null ---------- */
function engScanWin(b) {
  for (let k = 0; k < LINES.length; k++) {
    const L = LINES[k];
    if (b[L[0]] && b[L[0]] === b[L[1]] && b[L[1]] === b[L[2]])
      return { who: b[L[0]], line: [L[0], L[1], L[2]] };
  }
  return null;
}
/* ---------- 某方一步成三连的格集合（升序） ---------- */
function winPoints(b, p) {
  const out = [];
  for (let k = 0; k < LINES.length; k++) {
    const L = LINES[k];
    const vals = [b[L[0]], b[L[1]], b[L[2]]];
    if (vals.filter(v => v === p).length === 2 && vals.indexOf('') >= 0)
      out.push(L[vals.indexOf('')]);
  }
  return out;
}
const emptiesOf = b => { const e = []; for (let i = 0; i < b.length; i++) if (!b[i]) e.push(i); return e; };

/* ---------- 兔子 AI 四档（纯函数；rng 消耗序见头注——verify 复算锚） ---------- */
function engRandomPick(b, rnd) {
  const e = emptiesOf(b);
  return e.length ? e[Math.floor(rnd() * e.length)] : null;      // 恰 1 次 rnd()
}
function engBlockPick(b, rnd) {
  const fw = winPoints(b, 'X');
  if (fw.length) return fw[0];                                   // 必堵孩子成三连格（0 次 rnd()）
  return engRandomPick(b, rnd);                                  // 否则 seeded 随机（会挡不会杀）
}
function engSmartPick(b, rnd) {
  const ow = winPoints(b, 'O');
  if (ow.length) return ow[0];                                   // ① 自己一步杀
  const fw = winPoints(b, 'X');
  if (fw.length) return fw[0];                                   // ② 堵孩子一步杀
  if (rnd() < 0.2) return engRandomPick(b, rnd);                 // ③ 漏率 20%：seeded 走随机（2 次 rnd()）
  if (b[4] === '') return 4;                                     // ④ 中心启发
  const CORNERS = [0, 2, 6, 8];
  for (let k = 0; k < 4; k++) if (b[CORNERS[k]] === '') return CORNERS[k];   // ⑤ 空角启发（升序）
  return engRandomPick(b, rnd);                                  // ⑥ 随机（1 次 rnd()）
}
/* ---------- minimax（O 视角：O 胜=10-depth / X 胜=depth-10 / 平=0） ---------- */
function mm(b, turn, depth) {
  const w = engScanWin(b);
  if (w) return w.who === 'O' ? 10 - depth : depth - 10;
  const e = emptiesOf(b);
  if (!e.length) return 0;
  let best = turn === 'O' ? -99 : 99;
  for (let k = 0; k < e.length; k++) {
    b[e[k]] = turn;
    const s = mm(b, turn === 'O' ? 'X' : 'O', depth + 1);
    b[e[k]] = '';
    if (turn === 'O' ? s > best : s < best) best = s;
  }
  return best;
}
/* ch4 perfect：minimax 全展开永不输（全盘谱遍历断言——X 全策略×O perfect 无 X 胜，
   verify 单元⑰+selftest 独立 minimax 全谱对账）；候选升序严格更优才替换（确定性） */
function engPerfectPick(b) {
  const e = emptiesOf(b);
  if (!e.length) return null;
  let best = -99, pick = e[0];
  for (let k = 0; k < e.length; k++) {
    b[e[k]] = 'O';
    const s = mm(b, 'X', 1);
    b[e[k]] = '';
    if (s > best) { best = s; pick = e[k]; }
  }
  return pick;
}
/* 孩子方最优（autoSolve / 救援答案级提示共用）：X 视角=最小化 O 分 */
function engBestX(b) {
  const e = emptiesOf(b);
  if (!e.length) return null;
  let best = 99, pick = e[0];
  for (let k = 0; k < e.length; k++) {
    b[e[k]] = 'X';
    const s = mm(b, 'O', 1);
    b[e[k]] = '';
    if (s < best) { best = s; pick = e[k]; }
  }
  return pick;
}
/* autoSolve 通关策略：minimax 最优集合内优先制造双威胁（对随机/弱兔子胜率最大，
   对 ch4 仍恒最优=平局保障）；升序严格更优（分数或威胁数）才替换 */
function engAutoPick(b) {
  const e = emptiesOf(b);
  if (!e.length) return null;
  let best = 99, pick = e[0], bestTh = -1;
  for (let k = 0; k < e.length; k++) {
    b[e[k]] = 'X';
    const s = mm(b, 'O', 1);
    const th = winPoints(b, 'X').length;                         // 落后己方一步杀点数（双威胁）
    b[e[k]] = '';
    if (s < best || (s === best && th > bestTh)) { best = s; bestTh = th; pick = e[k]; }
  }
  return pick;
}
/* 四档总入口（dch 1-4；dch=1 随机在无胜线局面恒消耗 1 次 rnd） */
function engAiPick(b, dch, rnd) {
  if (emptiesOf(b).length === 0) return null;
  if (dch <= 1) return engRandomPick(b, rnd);
  if (dch === 2) return engBlockPick(b, rnd);
  if (dch === 3) return engSmartPick(b, rnd);
  return engPerfectPick(b);
}

/* ---------- v44：4×4 得 3 连（§-r18 §3 判定器——24 条胜线全枚举）
   横 8（4 行×2 窗）+竖 8（4 列×2 窗）+↘对角 4+↗对角 4；同色 3 连即胜；棋满无三连=平局。 */
const LINES16 = [
  [0, 1, 2], [1, 2, 3], [4, 5, 6], [5, 6, 7],            // 四横×2 窗
  [8, 9, 10], [9, 10, 11], [12, 13, 14], [13, 14, 15],
  [0, 4, 8], [4, 8, 12], [1, 5, 9], [5, 9, 13],          // 四竖×2 窗
  [2, 6, 10], [6, 10, 14], [3, 7, 11], [7, 11, 15],
  [0, 5, 10], [5, 10, 15], [1, 6, 11], [4, 9, 14],       // ↘对角 4
  [3, 6, 9], [6, 9, 12], [2, 5, 8], [7, 10, 13]          // ↗对角 4
];
function engScanWin16(b) {
  for (let k = 0; k < LINES16.length; k++) {
    const L = LINES16[k];
    if (b[L[0]] && b[L[0]] === b[L[1]] && b[L[1]] === b[L[2]])
      return { who: b[L[0]], line: [L[0], L[1], L[2]] };
  }
  return null;
}
function winPoints16(b, p) {
  const out = [];
  for (let k = 0; k < LINES16.length; k++) {
    const L = LINES16[k];
    const vals = [b[L[0]], b[L[1]], b[L[2]]];
    if (vals.filter(v => v === p).length === 2 && vals.indexOf('') >= 0)
      out.push(L[vals.indexOf('')]);
  }
  return out;
}
/* v44 启发估值（§-r18 §3）：Σ线 2 己+1 空=+50 / 1 己+2 空=+5；对方对称负分（混线不计） */
function eval16(b, me) {
  const op = me === 'O' ? 'X' : 'O';
  let s = 0;
  for (let k = 0; k < LINES16.length; k++) {
    const L = LINES16[k];
    let m = 0, o = 0;
    for (let j = 0; j < 3; j++) { if (b[L[j]] === me) m++; else if (b[L[j]] === op) o++; }
    if (m && o) continue;
    if (m === 2) s += 50; else if (m === 1) s += 5;
    if (o === 2) s -= 50; else if (o === 1) s -= 5;
  }
  return s;
}
/* v44 depth-4 minimax（§-r18 §3）：胜=±(1000-depth)；平=0；到深=eval16 */
function mm16(b, turn, me, depth) {
  const w = engScanWin16(b);
  if (w) return w.who === me ? 1000 - depth : depth - 1000;
  if (depth >= 4) return eval16(b, me);
  const e = emptiesOf(b);
  if (!e.length) return 0;
  let best = turn === me ? -9999 : 9999;
  for (let k = 0; k < e.length; k++) {
    b[e[k]] = turn;
    const s = mm16(b, turn === 'O' ? 'X' : 'O', me, depth + 1);
    b[e[k]] = '';
    if (turn === me ? s > best : s < best) best = s;
  }
  return best;
}
/* v44 AI（§-r18 §3，确定性零 rng）：①己方一步杀（升序首格）→②堵对方一步杀→
   ③depth-4 minimax（升序严格更优，平分取最小下标——verify 独立复算锚） */
function engV44(b, me) {
  const op = me === 'O' ? 'X' : 'O';
  const mw = winPoints16(b, me);
  if (mw.length) return mw[0];
  const ow = winPoints16(b, op);
  if (ow.length) return ow[0];
  const e = emptiesOf(b);
  if (!e.length) return null;
  let best = -9999, pick = e[0];
  for (let k = 0; k < e.length; k++) {
    b[e[k]] = me;
    const s = mm16(b, op, me, 1);
    b[e[k]] = '';
    if (s > best) { best = s; pick = e[k]; }
  }
  return pick;
}

/* ---------- vroll：限子滚动（§-r18 §3 判定器——与 classic 差异全枚举）
   每方场上 ≤3 子（ROLL_CAP_PIECES）：落子时己方已满 3 ⇒ 先移出己方最旧子（FIFO）再落子；
   胜负判定在移出+落子完成后整盘扫描；对方一步杀=模拟对方含自身移子的成线集合；
   棋满不可能（3+3=6<9），平局唯一来源=总手数 ROLL_MOVE_CAP 收束。 ---------- */
const ROLL_CAP_PIECES = 3;    // 每方场上最多 3 子（「6 子摆满后」=双方 3+3）
const ROLL_MOVE_CAP = 36;     // 总手数上限→平局收束（X 最多 18 手）
/* 落子原子（含移出）：g={board,xq,oq}；返回被移出格或 -1 */
function engRollApply(g, me, i) {
  const myq = me === 'X' ? g.xq : g.oq;
  let removed = -1;
  if (myq.length >= ROLL_CAP_PIECES) { removed = myq.shift(); g.board[removed] = ''; }
  g.board[i] = me; myq.push(i);
  return removed;
}
/* p 方当前一步可胜格集合（升序；含 p 自身移子模拟——滚动杀） */
function engRollThreats(g, p) {
  const out = [];
  for (let i = 0; i < 9; i++) {
    if (g.board[i]) continue;
    const sim = { board: g.board.slice(), xq: g.xq.slice(), oq: g.oq.slice() };
    engRollApply(sim, p, i);
    const w = engScanWin(sim.board);
    if (w && w.who === p) out.push(i);
  }
  return out;
}
/* vroll AI（§-r18 §3，确定性零 rng）：①己方含移子一步杀→②堵对方一步杀格（占位即堵）→
   ③启发（中心+3/角+1/落后己方威胁数×2，升序严格更优）——verify 独立复算锚 */
function engRollPick(g, me) {
  const op = me === 'X' ? 'O' : 'X';
  const mw = engRollThreats(g, me);
  if (mw.length) return mw[0];
  const ow = engRollThreats(g, op);
  if (ow.length) return ow[0];
  let best = -1, pick = -1;
  for (let i = 0; i < 9; i++) {
    if (g.board[i]) continue;
    let sc = 0;
    if (i === 4) sc += 3;
    if (i === 0 || i === 2 || i === 6 || i === 8) sc += 1;
    const sim = { board: g.board.slice(), xq: g.xq.slice(), oq: g.oq.slice() };
    engRollApply(sim, me, i);
    sc += winPoints(sim.board, me).length * 2;
    if (sc > best) { best = sc; pick = i; }
  }
  return pick;
}

/* ---------- 残局题库（§-r18 §2：30 题封闭，确定性生成，三型谓词唯一解） ----------
   谓词（数学先验写前验算 ✓）：
   win1   |winPoints(X)|==1 ∧ |winPoints(O)|==0 ⇒ 答案=该格；
   block1 |winPoints(O)|==1 ∧ |winPoints(X)|==0 ⇒ 答案=该格；
   fork   双方均无一步杀 ∧ 恰一格 c 落 X 后 winPoints(X)≥2 ⇒ 答案=c（无一步杀在先
          ⇒ c 不可能直接成三连，威胁恒为开放双线）。 */
function puzAnswerOf(b, ptype) {
  const xw = winPoints(b, 'X'), ow = winPoints(b, 'O');
  if (ptype === 'win1') return xw.length === 1 && ow.length === 0 ? xw[0] : null;
  if (ptype === 'block1') return ow.length === 1 && xw.length === 0 ? ow[0] : null;
  if (xw.length || ow.length) return null;
  let fork = -1;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = 'X';
    const t = winPoints(b, 'X').length;
    b[i] = '';
    if (t >= 2) { if (fork >= 0) return null; fork = i; }        // 双解=废题
  }
  return fork >= 0 ? fork : null;
}
/* 题型日程（§-r18 §2）：lv0 win1(k=2)/lv1 win1(k=3)/lv2 block1(k=2)/lv3 fork(k=2)/
   lv4 win1+block1 混(k=3)/lv5 三型混(k=3)——k=每方子数（X 到手 kX==kO） */
function puzSched(lv) {
  return [
    { types: ['win1'], k: 2 },
    { types: ['win1'], k: 3 },
    { types: ['block1'], k: 2 },
    { types: ['fork'], k: 2 },
    { types: ['win1', 'block1'], k: 3 },
    { types: ['win1', 'block1', 'fork'], k: 3 }
  ][lv];
}
/* 静态兜底题（生成 4000 次未中时用——三题均人工验算唯一解；确定性恒同） */
const PUZ_FALLBACK = {
  win1:   { board: ['O', '', '', 'X', 'X', '', '', '', 'O'], ptype: 'win1',   answer: 5 },
  block1: { board: ['O', 'O', '', '', 'X', '', '', '', 'X'], ptype: 'block1', answer: 2 },
  fork:   { board: ['X', 'X', 'O', 'O', '', '', '', '', ''], ptype: 'fork',   answer: 4 }
};
/* 残局 5 题生成（种子=flat*7919+911+7777+qi*131——与 dch/局 RNG 三重分流） */
function genPuzzles(flat) {
  const lv = flat % CH_LEN, sch = puzSched(lv), out = [];
  for (let qi = 0; qi < PUZZLES; qi++) {
    const ptype = sch.types.length === 1 ? sch.types[0] : sch.types[qi % sch.types.length];
    const rnd = mulberry32(flat * 7919 + 911 + 7777 + qi * 131);
    let made = null;
    for (let att = 0; att < 4000 && !made; att++) {
      const b = ['', '', '', '', '', '', '', '', ''];
      const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8];
      for (let c = 8; c > 0; c--) {                              // seeded 洗牌（Fisher-Yates）
        const j = Math.floor(rnd() * (c + 1));
        const t = cells[c]; cells[c] = cells[j]; cells[j] = t;
      }
      for (let m = 0; m < sch.k * 2; m++) b[cells[m]] = m % 2 === 0 ? 'X' : 'O';   // X 先手交替=可达局面
      if (engScanWin(b)) continue;
      const a = puzAnswerOf(b, ptype);
      if (a != null) made = { board: b, ptype: ptype, answer: a };
    }
    const f = made || PUZ_FALLBACK[ptype];
    out.push({ board: f.board.slice(), ptype: f.ptype, answer: f.answer, solved: false });
  }
  return out;
}

/* ---------- 局 RNG 种子（SPEC §3：flat*7919+911+round*77，round=1-3） ---------- */
const roundSeed = (flat, round) => (flat * 7919 + 911 + round * 77) | 0;

/* ---------- 关卡生成（静态 42 关与生成关同一确定性通道）
   取数序：dch（flat≥42 时 ri(1,4) 先取保确定性）；局 RNG 在 UI startRound 时
   按局号独立播种（与 dch RNG 分流）。rounds 三局占位（battle/v44/vroll）；
   puzzle 关装载 puzzles 5 题。 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 911);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);       // 生成关随机章参数
  const kind = kindOfFlat(flat);
  const L = { flat: flat, ch: ch, dch: dch, lv: lv, kind: kind,
              roundIdx: 0, rounds: [null, null, null], puzzles: null,
              score: 0, step: 0, miss: 0, results: [], done: false,
              lastFinal: null, rng: null, review: null };
  if (kind === 'puzzle') L.puzzles = genPuzzles(flat);
  return L;
}

/* ---------- 星级（§-r18 §1 分题型）：分值制/miss 制，永不 0★ ---------- */
function engStars(L) {
  if (L.kind === 'puzzle') return L.miss === 0 ? 3 : L.miss <= 2 ? 2 : 1;
  return L.score >= 2.5 ? 3 : L.score >= 1.5 ? 2 : 1;
}

/* ---------- r18 时长模型（§-r18 §4；verify+selftest 双端独立重列对账） ----------
   battle=3*(4*7000+3*800+2820)=99660 / puzzle=5*(3000+12000+2604)=88020（全 42 关最低）/
   v44=vroll=3*(6*8000+6*800+2820)=166860；生成关=battle 值；全关 ≥LEVEL_MIN_MS 40000。 */
function modeled(flat) {
  const kind = kindOfFlat(flat);
  if (kind === 'puzzle') return PUZZLES * (PROMPT_WIN_MS + DECIDE_MS.puzzle + RIGHT_WIN_MS);
  const n = NOMINAL[kind];
  return ROUNDS * (n.moves * DECIDE_MS[kind] + n.rabbit * RABBIT_MS + END_WIN_MS);
}

/* ---------- 负局复盘回溯（§-r18 delta3：首误步=minimax 视角首个「局面前最优值非负、
   实际落子后转入必败」的 X 手；先手最优≥平局⇒任何负局必存在——数学先验） ---------- */
function engReview(hist) {
  const b = ['', '', '', '', '', '', '', '', ''];
  for (let t = 0; t < hist.length; t++) {
    const mv = hist[t];
    if (mv.p === 'O') { b[mv.i] = 'O'; continue; }
    let bestV = 99, bestC = -1;                                  // X 视角=最小化 O 分（升序严格更优）
    for (let c = 0; c < 9; c++) {
      if (b[c]) continue;
      b[c] = 'X';
      const s = mm(b, 'O', 1);
      b[c] = '';
      if (s < bestV) { bestV = s; bestC = c; }
    }
    b[mv.i] = 'X';
    const actV = mm(b, 'O', 1);                                  // 与 bestV 同深同侧（O 到手）
    if (actV > bestV)                                            // 严格更差=失误（首处即返）
      return { moveNo: Math.floor(t / 2) + 1, missCell: mv.i, bestCell: bestC,
               boardBefore: b.slice() };
  }
  return null;
}

/* ---------- 结构校验（verify 用，返回失败原因或 null）：章映射 / dch 域 / 关型 / 初始态干净 ---------- */
function structWhy(L) {
  if (!L) return 'null';
  if (L.rounds.length !== ROUNDS) return 'rounds';
  if (L.ch !== Math.floor(L.flat / CH_LEN) + 1 || L.lv !== L.flat % CH_LEN) return 'chmap';
  const dch0 = (L.ch - 1) % 4 + 1;
  if (L.flat < STATIC_LEVELS ? L.dch !== dch0 : (L.dch < 1 || L.dch > 4)) return 'dch';
  if (L.flat < STATIC_LEVELS ? L.kind !== KIND_OF_CH[L.ch] : L.kind !== 'battle') return 'kind';
  if (L.score !== 0 || L.step !== 0 || L.done) return 'init';
  if (L.miss !== 0) return 'initMiss';
  if (L.results.length !== 0 || L.lastFinal !== null || L.rng !== null || L.review !== null) return 'initRounds';
  if (L.roundIdx !== 0) return 'initIdx';
  if (L.kind === 'puzzle') {
    if (!Array.isArray(L.puzzles) || L.puzzles.length !== PUZZLES) return 'puzLen';
    for (let k = 0; k < L.puzzles.length; k++) {
      const q = L.puzzles[k];
      if (!q || q.solved !== false || puzAnswerOf(q.board.slice(), q.ptype) !== q.answer) return 'puzQ' + k;
    }
  } else if (L.puzzles !== null) return 'puzNull';
  return null;
}
