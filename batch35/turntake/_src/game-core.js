/* ================= turntake 纯引擎：确定性回合序列生成 + 渴度梯度分配 + 兔子对错 + 点花判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 419)（本款常量 turntake=419，SPEC-BATCH35 §0.85 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   回合序列 turnSeq（§0.85 数学先验，封闭域已验算——2026-09-13 改造沿用不动）：
     每关孩子回合恒 5（=5 题），兔子回合 4-6；
     dch1-2 = 严格交替 [K,R]*4+[K]（K,R,K,R,K,R,K,R,K——§0.85 括注枚举，末题=孩子）；
     dch3-4 = 不规则 seeded 构造：基架内空位 4 各 1 基座 R + 尾空位 0，额外 R m=ri(rnd,0,2)
       插入 5 空位（每空 ≤1 额外→连 2 R 可达、连 3 禁）。
   渴度梯度（2026-09-13 改造核心）：每回合 3 盆 thirsts∈{1,2,3}^3 seeded——
     dch1 多重集 {1,1,3}（档差大）/ dch2 {2,2,3}（档差细微，相邻档）/
     dch3-4 shuffled([1,2,3])（三盆互异=可排序）；最渴恒唯一；
     相邻回合 argmax 互异（重掷 ≤8 兜底：dch≤2 换 pos / dch≥3 换 perm，仍同则确定性回退）。
   兔子回合实质化：rabbitWrong=ri(rnd,1,3)===1（seeded 约 1/3 浇错）；浇错时 rabbitPos=
     非 argmax 两盆（升序）中 ri(rnd,0,1) 选一；浇对时 rabbitPos=argmax。纠错回合=UI 层
     置 q._fix=true（quiz.turn 报 'k'），孩子点 target 纠正='right' 推进（不计题号 step）。
   铁律：3 盆花恒全摆；孩子回合答对才推进（错不罚可重选，排序错不罚退已浇）；
     兔子演出期引擎层恒 'wait'（抢点不罚不计 miss——社交学习低挫败定版）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章取材（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 回合序列（dch≤2 严格交替定版串；dch≥3 seeded 不规则构造，见头注验算式）
   取数序（verify 独立复算同构锚）：dch≥3 时 nR=ri(4,6) → m=nR-4>0 时 shuffled([0,1,2,3,4]) 取前 m
   作额外 R 空位；dch≤2 零取数。 ---------- */
function turnSeqOf(dch, rnd) {
  if (dch <= 2) return ['k', 'r', 'k', 'r', 'k', 'r', 'k', 'r', 'k'];
  const nR = ri(rnd, 4, 6);                       // 兔子回合 4-6（§0.85）
  const slots = [1, 1, 1, 1, 0];                  // 5 空位：4 内空位基座 1 + 尾空位基座 0
  const m = nR - 4;                               // 额外 R 数 0-2
  if (m > 0) {
    const pick = shuffled([0, 1, 2, 3, 4], rnd).slice(0, m);
    for (let s = 0; s < pick.length; s++) slots[pick[s]]++;
  }
  const seq = [];
  for (let k = 0; k < 5; k++) {                   // 5 个孩子回合（恒定）
    seq.push('k');
    for (let r = 0; r < slots[k]; r++) seq.push('r');
  }
  return seq;
}

/* ---------- 渴度三元组（章型定版：dch1 {1,1,3} 档差大 / dch2 {2,2,3} 档差细微 /
   dch≥3 shuffled([1,2,3]) 三盆互异；argmax 与 prevArg 相同重掷 ≤8，兜底确定性回退）
   取数序（verify 独立复算同构锚）：dch≤2 先 ri(0,2) 掷 pos（相邻同则重掷）；dch≥3 整组掷 perm。 ---------- */
function thirstsOf(dch, rnd, prevArg) {
  if (dch <= 2) {
    let pos = ri(rnd, 0, 2), g = 0;
    while (pos === prevArg && g++ < 8) pos = ri(rnd, 0, 2);
    if (pos === prevArg) pos = (prevArg + 1) % 3; // 兜底换花（3 花域恒可满足）
    const lo = dch === 1 ? 1 : 2;
    const th = [lo, lo, lo]; th[pos] = 3;
    return th;
  }
  let th = shuffled([1, 2, 3], rnd), g = 0;
  while (argmaxOf(th) === prevArg && g++ < 8) th = shuffled([1, 2, 3], rnd);
  if (argmaxOf(th) === prevArg) th = [th[1], th[2], th[0]];   // 兜底左旋（3 必换位→argmax 必变）
  return th;
}
const argmaxOf = t => { let b = 0; for (let i = 1; i < t.length; i++) if (t[i] > t[b]) b = i; return b; };

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   取数序：dch（flat≥20 时 ri(1,4) 先取保确定性）→ turnSeqOf → 逐回合 thirstsOf →（r 回合）
   rabbitWrong=ri(1,3)===1 → 浇错时 wrongPos=ri(0,1)（非 argmax 两盆升序中选一） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 419);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数
  const seq = turnSeqOf(dch, rnd);
  const turns = [];
  let prevArg = -1;
  for (let t = 0; t < seq.length; t++) {
    const thirsts = thirstsOf(dch, rnd, prevArg);
    const arg = argmaxOf(thirsts);
    let rabbitWrong = false, rabbitPos = arg;
    if (seq[t] === 'r') {
      rabbitWrong = ri(rnd, 1, 3) === 1;                     // seeded 约 1/3 浇错
      if (rabbitWrong) {
        const others = [0, 1, 2].filter(j => j !== arg);     // 非 argmax 两盆（升序）
        rabbitPos = others[ri(rnd, 0, 1)];
      }
    }
    prevArg = arg;
    turns.push({ turn: seq[t], thirsts: thirsts, watered: [false, false, false],
                 rabbitWrong: rabbitWrong, rabbitPos: rabbitPos,
                 _miss: 0, _waitSaid: false, _answered: false, _fix: false, _taps: 0 });
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, turns: turns,
           turnIdx: 0, step: 0, retries: 0, done: false };
}

/* ---------- 当前应点盆（verify 独立复核锚）：未浇盆中渴度最大者
   （ch1-2/纠错=thirst 最大者；ch3-4=剩余未浇中最渴者；水过的盆渴度视 0 不再入选） ---------- */
function engTarget(L) {
  if (!L || L.done) return -1;
  const q = L.turns[L.turnIdx];
  if (!q) return -1;
  let best = -1;
  for (let i = 0; i < 3; i++)
    if (!q.watered[i] && (best < 0 || q.thirsts[i] > q.thirsts[best])) best = i;
  return best;
}

/* ---------- 点花引擎（无 DOM）：engTapFlower(L, i) —— 点第 i 盆花（0-2）
   'right'  孩子有效回合（题面或兔子纠错）点中当前应点盆：
            排序中间步（dch≥3 孩子题 _taps<3）不推进仅记浇；
            回合收口（排序末步/单步题/纠错步）推进 turnIdx（纠错不计题号 step）
   'done'   该次点击收口了最后一回合=通关（ch1-2 末题=孩子；ch3-4 尾随 R 由 engAdvance 收口）
   'wrong'  孩子有效回合点非应点盆：该回合 miss+1（retries 全关累计=星级口径），
            排序错不罚退已浇（watered 保留可续点）
   'wait'   兔子演出期（未开纠错）任意点=抢点（不罚不计 miss；每回合提醒 1 次由 UI 层承载）
   null     非法下标或关卡已结束 ---------- */
function engTapFlower(L, i) {
  if (!L || L.done) return null;
  const q = L.turns[L.turnIdx];
  if (!q) return null;
  const kidNow = q.turn === 'k' || q._fix;         // 纠错回合（_fix）视孩子有效回合
  if (!kidNow) return 'wait';                      // 兔子演出期抢点（引擎层恒 wait）
  if (!Number.isInteger(i) || i < 0 || i >= 3) return null;
  if (i === engTarget(L)) {
    q.watered[i] = true;
    const need = (L.dch >= 3 && q.turn === 'k') ? 3 : 1;   // 排序题=3 步；单步题/纠错=1 步
    q._taps++;
    if (q._taps >= need) {
      q._answered = true;
      if (!q._fix) L.step++;                       // 题号=孩子题收口（纠错不计——b33 坑①口径）
      L.turnIdx++;
      if (L.turnIdx >= L.turns.length) { L.done = true; return 'done'; }
      return 'right';
    }
    return 'right';                                // 排序中间步（UI 走短确认窗）
  }
  q._miss++;
  L.retries++;                                     // 星级口径：孩子有效回合点非应点盆
  return 'wrong';
}

/* ---------- 回合推进（兔子回合演出完成由 UI 调用——浇错回合先经纠错再推进；
   孩子回合点中在 engTapFlower 内联推进）
   'done'=通关 / 'k'|'r'=下一回合方 ---------- */
function engAdvance(L) {
  if (!L || L.done) return null;
  L.turnIdx++;
  if (L.turnIdx >= L.turns.length) { L.done = true; return 'done'; }
  return L.turns[L.turnIdx].turn;
}
const engWon = L => !!L && L.done;
/* 星级口径：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星（抢点不计） */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- 结构校验（verify 用，返回失败原因或 null）：回合序列规则 / 渴度规则 /
   兔子对错规则 / 章映射 / 初始态干净 ---------- */
function structWhy(L) {
  if (!L || !L.turns || !L.turns.length) return 'null';
  const seq = L.turns.map(t => t.turn);
  if (seq.length < 9 || seq.length > 11) return 'seqLen';       // 5K+4R=9 .. 5K+6R=11
  if (seq.some(s => s !== 'k' && s !== 'r')) return 'side';
  if (seq[0] !== 'k') return 'first';                            // 首=K
  if (seq.filter(s => s === 'k').length !== 5) return 'kCount';  // 孩子回合恒 5
  const nR = seq.filter(s => s === 'r').length;
  if (nR < 4 || nR > 6) return 'rCount';                         // 兔子回合 4-6
  for (let t = 2; t < seq.length; t++)
    if (seq[t] === seq[t - 1] && seq[t - 1] === seq[t - 2]) return 'run3';   // 连续同方≤2
  if (L.dch <= 2) {                                              // ch1-2 严格交替定版串
    const alt = ['k', 'r', 'k', 'r', 'k', 'r', 'k', 'r', 'k'];
    if (seq.length !== alt.length || seq.some((s, t) => s !== alt[t])) return 'alt';
  }
  let prevArg = -1;
  for (let t = 0; t < L.turns.length; t++) {                     // 渴度：三元组章型+argmax 相邻互异
    const q = L.turns[t], th = q.thirsts;
    if (!Array.isArray(th) || th.length !== 3 || th.some(v => !Number.isInteger(v) || v < 1 || v > 3))
      return 'thirstsRange';
    if (th.indexOf(Math.max.apply(null, th)) !== th.lastIndexOf(Math.max.apply(null, th)))
      return 'thirstsTie';                                       // 最渴恒唯一（无并列）
    const s = th.slice().sort((a, b) => a - b).join(',');
    if (L.dch === 1 && s !== '1,1,3') return 'thShape1';         // 档差大
    if (L.dch === 2 && s !== '2,2,3') return 'thShape2';         // 档差细微
    if (L.dch >= 3 && s !== '1,2,3') return 'thShapeSort';       // 三盆互异=可排序
    const arg = argmaxOf(th);
    if (arg === prevArg) return 'thirstsAdj';                    // 相邻回合 argmax 互异
    prevArg = arg;
    if (q.turn === 'r') {                                        // 兔子：对错与浇点位
      if (typeof q.rabbitWrong !== 'boolean') return 'rwType';
      if (!Number.isInteger(q.rabbitPos) || q.rabbitPos < 0 || q.rabbitPos > 2) return 'rposRange';
      if (q.rabbitWrong ? q.rabbitPos === arg : q.rabbitPos !== arg) return 'rposMatch';
    }
    if (q.watered.some(w => w) || q._fix || q._taps !== 0) return 'initTurns';   // 初始态干净
  }
  if (L.step !== 0 || L.retries !== 0 || L.done) return 'init';
  if (L.turns.some(t => t._miss !== 0 || t._waitSaid || t._answered)) return 'initFlags';
  if (L.turnIdx !== 0) return 'initIdx';
  if (L.ch !== Math.floor(L.flat / CH_LEN) + 1 || L.lv !== L.flat % CH_LEN) return 'chmap';
  const dch0 = (L.ch - 1) % 4 + 1;
  if (L.flat < STATIC_LEVELS ? L.dch !== dch0 : (L.dch < 1 || L.dch > 4)) return 'dch';
  return null;
}
