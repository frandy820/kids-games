/* ================= plant 纯引擎：确定性关卡生成 + 点格种树判定（无 DOM，UI 与 verify 共用）
   生成流（SPEC-R47 §R3 定版）：
   abs 题（v1 原样不变）：每题独立 seeded mulberry32(flat*7919+737+qi*131)
   （本款 abs 流常量 737）——同 flat 永远同关（重玩一致、verify 可检）；
   row,col∈[1,n] 均匀取，撞 used 重抽同流（确定性）。
   rel 题（r47 δ3 新增）：独立流 mulberry32(flat*7919+9973+qi*131)（rel 流常量
   9973）——星星 sr,sc 均匀取（starIdx∈used 重抽）；feasible 方向集=DIRS['r','d',
   'l','u'] 序过滤 margin≥1（n≥3 恒非空——SPEC-R47 §R1δ3 验算）；d=集[floor(rnd*len)]、
   s=ri(1,min(3,margin)) 两段连取；中途位/终点在格内（每段单调⇒段末在格内即可）、
   净位移≠0（禁环形回起点）、终点∉used（关内 5 格互异）——违者整组重抽同流。
   章型（SPEC-R47 §R2）：进度章号单调递增；难度章号 dch=diffOfCh(ch) 静态四档
   （域承诺型无 RNG）；n=CH_N[dch]={1:3,2:4,3:5,4:6}；rel 题位=REL_PLAN[dch]。
   ch1（flat0-4）全 abs ⇒ 谱与 v1 逐字节一致（锚面——SPEC-R47 §R5）。
   quiz 结构：{ kind('plant' 恒), mode('abs'|'rel'), n(网格边长 3-6), row/col(本题
   目标格——abs=卡坐标/rel=位移终点), star({row,col}|null rel 星星起点),
   moves([[dir,step]×2]|null dir∈'rdlu' step 1-3), _miss, _answered }
   level 结构：{ ..., planted[](已种格扁平下标——进度真值), step, retries, done }
   铁律：每关 5 题 5 张程序卡 5 棵树（每题一步——step=全关题号 0-4，b33 坑①）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 目标格扁平下标（对账锚：verify 从 row/col 独立复算=禁读引擎期望） ---------- */
const cellIdx = q => (q.row - 1) * q.n + (q.col - 1);
const starIdx = q => q.mode === 'rel' && q.star ? (q.star.row - 1) * q.n + (q.star.col - 1) : -1;

/* ---------- rel 几何（SPEC-R47 §R3：feasible 过滤序=DIRS 固定序——rnd 索引确定性锚） ---------- */
const marginOf = (r, c, n, d) => d === 'r' ? n - c : d === 'd' ? n - r : d === 'l' ? c - 1 : r - 1;
const feasDirs = (r, c, n) => DIRS.filter(d => marginOf(r, c, n, d) >= 1);

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 dch=静态 ch 档
   （域承诺型无 RNG——SPEC §0.89 显式声明）；abs=737 流逐题独立+撞格重抽同流（v1
   原样）；rel=9973 流逐题独立+约束重抽同流（r47）） ---------- */
function absQuiz(flat, qi, n, used) {
  const rnd = mulberry32(flat * 7919 + 737 + qi * 131);   // abs 流常量 737（v1 原样）
  let row, col, idx;
  do {
    row = ri(rnd, 1, n);
    col = ri(rnd, 1, n);
    idx = (row - 1) * n + (col - 1);
  } while (used.indexOf(idx) >= 0);                       // 关内 5 格互异（重抽同流=确定性）
  used.push(idx);
  return { kind: 'plant', mode: 'abs', n: n, row: row, col: col,
           star: null, moves: null, _miss: 0, _answered: false };
}
function relQuiz(flat, qi, n, used) {
  const rnd = mulberry32(flat * 7919 + 9973 + qi * 131);  // rel 流常量 9973（r47）
  let sr, sc, d1, s1, d2, s2, tr, tc, starI, tgtI;
  for (;;) {
    sr = ri(rnd, 1, n); sc = ri(rnd, 1, n);
    starI = (sr - 1) * n + (sc - 1);
    if (used.indexOf(starI) >= 0) continue;               // 星星不上树/不复用已种格
    const f1 = feasDirs(sr, sc, n);
    if (!f1.length) continue;                             // n≥3 恒非空（防御性保留）
    d1 = f1[Math.floor(rnd() * f1.length)];
    s1 = ri(rnd, 1, Math.min(3, marginOf(sr, sc, n, d1)));
    const r1 = sr + DRC[d1][0] * s1, c1 = sc + DRC[d1][1] * s1;   // 段 1 末（单调⇒中途在格内）
    const f2 = feasDirs(r1, c1, n);
    if (!f2.length) continue;
    d2 = f2[Math.floor(rnd() * f2.length)];
    s2 = ri(rnd, 1, Math.min(3, marginOf(r1, c1, n, d2)));
    tr = r1 + DRC[d2][0] * s2; tc = c1 + DRC[d2][1] * s2;         // 段 2 末=目标格
    tgtI = (tr - 1) * n + (tc - 1);
    if (tgtI === starI) continue;                         // 净位移≠0（禁环形回起点）
    if (used.indexOf(tgtI) >= 0) continue;                // 关内 5 格互异
    break;
  }
  used.push(tgtI);
  return { kind: 'plant', mode: 'rel', n: n, row: tr, col: tc,
           star: { row: sr, col: sc }, moves: [[d1, s1], [d2, s2]],
           _miss: 0, _answered: false };
}
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const n = CH_N[dch];
  const relAt = REL_PLAN[dch] || [];
  const quizzes = [], used = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    quizzes.push(relAt.indexOf(qi) >= 0 ? relQuiz(flat, qi, n, used)
                                        : absQuiz(flat, qi, n, used));
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, n: n,
           quizzes: quizzes, step: 0, retries: 0, done: false, planted: [] };
}

/* ---------- 点格种树引擎（无 DOM）：engTapCell(L, i) —— 点扁平下标 i 的格
   'planted' 点对且本题完成推进 / 'done' 点对且末题=通关
   'wrong'   点错格：该题 miss+1（retries 全关累计=星级口径），可重点（探索不罚）
   false     已种格：拒绝（家族 D——树苗轻摇，不计 miss——探索不罚）
             rel 题星星格：拒绝（星星摇 starbeat，不计 miss——r47 δ3 家族 D 变体：
             星星是 salient 参照物，儿童首点星星是自然探索）
   null      非法下标 / 关卡已结束 / 本题已答 ---------- */
function engTapCell(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.n * q.n) return null;
  if (L.planted.indexOf(i) >= 0) return false;              // 已种格=拒绝（不泄、不罚）
  if (q.mode === 'rel' && i === starIdx(q)) return false;   // 星星格=拒绝（r47 同语义）
  if (i === cellIdx(q)) {
    q._answered = true;
    L.planted.push(i);                                      // 进度真值（渲染层 tree 态之源）
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'planted';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.89 miss 口径）：全关点错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题目标格扁平下标（=cellIdx，独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : cellIdx(q);

/* ---------- 结构校验（verify 用，返回失败原因或 null）：章型网格边长真值表 /
   mode 域+rel 不变量组（star 域/moves 域/位移合成=目标格）/ 初始态干净
   （互异校验在 verify genLevel 层对账） ---------- */
function structWhy(q, dch, qi) {
  if (!q) return 'quiz';
  if (q.kind !== 'plant') return 'kind';
  if (!CH_N[dch]) return 'dch';
  if (q.n !== CH_N[dch]) return 'n';
  if (q.mode !== 'abs' && q.mode !== 'rel') return 'mode';
  if (!Number.isInteger(q.row) || q.row < 1 || q.row > q.n) return 'row';
  if (!Number.isInteger(q.col) || q.col < 1 || q.col > q.n) return 'col';
  if (q.mode === 'rel') {
    if (!q.star || !Number.isInteger(q.star.row) || q.star.row < 1 || q.star.row > q.n ||
        !Number.isInteger(q.star.col) || q.star.col < 1 || q.star.col > q.n)
      return 'star';
    if (!Array.isArray(q.moves) || q.moves.length !== 2) return 'moves';
    let r = q.star.row, c = q.star.col;
    for (let k = 0; k < 2; k++) {
      const m = q.moves[k];
      if (!Array.isArray(m) || m.length !== 2 || !DIRCN[m[0]] ||
          !Number.isInteger(m[1]) || m[1] < 1 || m[1] > 3) return 'moves';
      r += DRC[m[0]][0] * m[1]; c += DRC[m[0]][1] * m[1];
      if (r < 1 || r > q.n || c < 1 || c > q.n) return 'path';   // 中途/终点在格内
    }
    if ((r - 1) * q.n + (c - 1) !== (q.row - 1) * q.n + (q.col - 1)) return 'target';
    if ((q.row - 1) * q.n + (q.col - 1) === (q.star.row - 1) * q.n + (q.star.col - 1))
      return 'netzero';                                           // 净位移≠0
  } else {
    if (q.star !== null || q.moves !== null) return 'modefield';  // abs 题零 rel 字段
  }
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
