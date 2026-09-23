/* ================= memduel 纯引擎：确定性关卡生成 + 三相位记忆判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   §0.44 记忆真值（生成期即保证，verify 侧分源复算）：
   - 同题串内值互异（重复=倒背多解=非法题）——shuffled(池).slice(0,len) 互异抽样；
   - 倒背 answer = seq 精确逆序（fwd=原序）；
   - 展示期/延迟期输入锁定（engTapNum/engTapSlot 拒绝，无副作用不吞题）；
   - 相位转移唯一：engCover 为 show 离开唯一入口（delay 型 → 'gap'，其余 → 'recall'），
     engGapDone 为 gap→recall 唯一入口（重复调用拒绝）。
   数据模型：q._built[j]（卡位 j ← opts 下标或 null 按位对应目标序）、q._used[i]（候选卡 i
   已入位）；拼满由 UI/引擎显式 engJudge 判定（值比较 opts[idx].v === answer[k]，
   承 b19 cipher P1 口径——判错对位保留同判据）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
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
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关 seeded 随机 1-4（§0.3/§1-r17） */
const chOfFlat = flat => Math.floor(flat / LEVELS_PER_CH) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const poolOfMat = mat => mat === 'let' ? LETTERS : (mat === 'col' ? COLORS : DIGITS);

/* ---------- 单题生成（§1-r17 五型）：互异串 + 按章 kind/mat/mode/delay + 干扰卡池
   位数=章规格闭区间；ch3 素材（let/col）与 ch4 方向（fwd/rev）按题 seeded 随机；
   干扰卡数：len=7 → 2 / 其余 → 3（数字池 1-9 的 len7 上限；verify refChapOk 同口径）
   showMs=展示窗（ms）：每卡 680ms + 首尾余量 920ms（6 位≈5.0s / 7 位≈5.68s，
   与 UI runShow 同源=300 首程+末尾 620 停留）；gapMs=dx 延迟干扰窗（GAP_MS，其余 0） ---------- */
function genQuiz(dch, rnd) {
  const spec = CH_SPEC[dch] || CH_SPEC[1];
  const len = ri(rnd, spec.lo, spec.hi);
  let mat = spec.mat, kind = spec.kinds[0], mode = spec.mode, delay = false;
  if (dch === 3) {                                   /* ch3：字母/颜色按题随机 */
    mat = rnd() < 0.5 ? 'let' : 'col';
    kind = mat === 'let' ? 'lf' : 'cf';
  } else if (dch === 4) {                            /* ch4：延迟+正倒按题随机（§1-r17） */
    mode = rnd() < 0.5 ? 'fwd' : 'rev';
    delay = true;
  }
  const pool = poolOfMat(mat);
  const seq = shuffled(pool, rnd).slice(0, len);     // 互异抽样（池容量 ≥ len+nDis 恒成立）
  const nDis = len >= 7 ? 2 : 3;
  const distract = shuffled(pool.filter(v => seq.indexOf(v) < 0), rnd).slice(0, nDis);
  return finishQuiz(seq, kind, mat, mode, delay, distract, rnd);
}
/* ---------- 组装（候选池=answer+干扰洗牌；卡位/用态/相位初始化） ---------- */
function finishQuiz(seq, kind, mat, mode, delay, distract, rnd) {
  const answer = mode === 'fwd' ? seq.slice() : seq.slice().reverse();
  const opts = shuffled(answer.concat(distract), rnd);
  return { kind: kind, mat: mat, seq: seq.slice(), mode: mode, delay: delay, answer: answer,
    opts: opts.map(v => ({ v: v })),
    _built: seq.map(function () { return null; }),
    _used: opts.map(function () { return false; }),
    phase: 'show', showMs: SHOW_BASE + seq.length * SHOW_PER, gapMs: delay ? GAP_MS : 0,
    miss: 0, solved: false };
}

/* ---------- 单题生成入口（确定性；章分支） ---------- */
function genQuizByChapter(dch, rnd, flat) {
  return genQuiz(dch, rnd);
}

/* ---------- 手解安全网模板（genLevel 极端防御；verify 侧 REF_FALLBACKS 双写对账）
   seq 互异 + 干扰 ∉ seq 且互异（§0.44 同口径）；ch4 兜底=rev+delay（确定性） ---------- */
const FALLBACKS = {
  1: { kind: 'df', mat: 'dgt', mode: 'fwd', delay: false, seq: [3, 7, 5, 1, 9, 2],  distract: [4, 8] },
  2: { kind: 'dr', mat: 'dgt', mode: 'rev', delay: false, seq: [8, 2, 6, 4, 1],     distract: [3, 7, 9] },
  3: { kind: 'lf', mat: 'let', mode: 'fwd', delay: false, seq: ['B', 'E', 'A', 'D', 'F'], distract: ['C', 'H', 'J'] },
  4: { kind: 'dx', mat: 'dgt', mode: 'rev', delay: true,  seq: [5, 9, 1, 6, 3],     distract: [2, 7, 4] }
};
function fallbackQuiz(dch) {
  const f = FALLBACKS[dch] || FALLBACKS[1];
  const opts = shuffled(f.seq.concat(f.distract), { next: function () { return 0.9; } });
  return { kind: f.kind, mat: f.mat, seq: f.seq.slice(), mode: f.mode, delay: f.delay,
    answer: f.mode === 'fwd' ? f.seq.slice() : f.seq.slice().reverse(),
    opts: opts.map(v => ({ v: v })),
    _built: f.seq.map(function () { return null; }),
    _used: opts.map(function () { return false; }),
    phase: 'show', showMs: SHOW_BASE + f.seq.length * SHOW_PER, gapMs: f.delay ? GAP_MS : 0,
    miss: 0, solved: false };
}

/* ---------- 关卡生成（静态 40 关与生成关同一确定性通道；同关 8 题签名互异）
   sig=串+题型+mode（体验维度：孩子看到的串素材/长度与背诵方向/延迟结构） ---------- */
const sigOf = q => q.seq.join('') + '|' + q.kind + '|' + q.mode;
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % LEVELS_PER_CH;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // 生成关难度 seeded 随机回落（§0.3）
  const quizzes = [], sigs = {};
  let guard = 0;
  while (quizzes.length < CH_LEN && guard++ < 200) {
    const q = genQuizByChapter(dch, rnd, flat);
    const sig = sigOf(q);
    if (sigs[sig]) continue;
    sigs[sig] = 1;
    quizzes.push(q);
  }
  while (quizzes.length < CH_LEN) quizzes.push(fallbackQuiz(dch));   // 不可达防御
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 遮盖转移（§0.44/§1-r17 唯一入口）：展示期→延迟期（dx）或作答期 ---------- */
function engCover(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'show') return false;
  q.phase = q.delay ? 'gap' : 'recall';
  return true;
}
/* ---------- 延迟干扰窗结束（gap→recall 唯一入口；非 gap 态拒绝） ---------- */
function engGapDone(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'gap') return false;
  q.phase = 'recall';
  return true;
}

/* ---------- 拼答引擎（无 DOM）：点候选卡填首空位 / 点已填卡位退回
   engTapNum(L,i)：点候选卡 i → 填入第一个空卡位，返回卡位 j；
   非法（展示期/延迟期锁定/越界/已用/已满/关已结束）→ null。
   锁定期拒绝=无副作用不吞题（§0.44：miss/step/相位均不动，verify 强断言）。
   填卡=作答动作但不重置救援钟（§0.7a 唯答对推进重置） ---------- */
function engTapNum(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'recall') return null;   // 展示/延迟期输入锁定（§0.44/§1-r17）
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.opts.length) return null;
  if (q._used[i]) return null;
  const j = q._built.indexOf(null);
  if (j < 0) return null;
  q._used[i] = true;
  q._built[j] = i;
  return j;
}
/* engTapSlot(L,j)：点卡位 j=退回该卡回池（按位退回，后继不动）；空位/非法下标/
   锁定期 → null。退回=改答零惩罚（§0.7a 不重置） ---------- */
function engTapSlot(L, j) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.phase !== 'recall') return null;
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q._built.length) return null;
  if (q._built[j] == null) return null;
  q._used[q._built[j]] = false;
  q._built[j] = null;
  return 'emptied';
}
/* 空闲池中第一个值为 v 的卡（教学演示/帮/救援/autoSolve 共用） */
function freeOptFor(q, v) {
  for (let i = 0; i < q.opts.length; i++) if (!q._used[i] && q.opts[i].v === v) return i;
  return -1;
}
/* engJudge(L)：拼满判定纯算——built 值序列与 answer 逐位比对 → {win}；未满 → null */
function engJudge(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q._built.some(x => x == null)) return null;
  const vals = q._built.map(i => q.opts[i].v);
  return { win: vals.every((v, k) => v === q.answer[k]) };
}
/* engCommitJudge(L,plan)：提交判定。win → solved+推进，返回 'right'/'done'；
   不等 → miss/retries 各 +1 返回 'wrong'（错次口径 §2：答错=1 错） ---------- */
function engCommitJudge(L, plan) {
  const q = L.quizzes[L.step];
  if (plan.win) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q.miss++;
  L.retries++;
  return 'wrong';
}
/* 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（永不 0 星） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 救援/教学"帮"目标（§2：首空位 breathe 方向级恒给 + 下一张应点卡
   答案级 miss≥2 才出——b18 梯度定案；延迟期（gap）无目标——干扰任务不是卡壳）
   dirTarget=方向级：首个空卡位 j（「从这一位开始」——指位置不给答案）；
   rescueTarget=答案级：首空卡位 j 的应点值 → 未用候选卡 i（{act:'opt'}）。
   两目标同源策略，UI 与 verify 共用 ---------- */
function dirTarget(q) {
  if (!q || q.solved || q.phase !== 'recall') return null;
  const j = q._built.indexOf(null);
  if (j < 0) return null;
  return { act: 'slot', j: j };
}
function rescueTarget(q) {
  if (!q || q.solved || q.phase !== 'recall') return null;
  const j = q._built.indexOf(null);
  if (j < 0) return null;
  const i = freeOptFor(q, q.answer[j]);
  if (i < 0) return null;
  return { act: 'opt', i: i, j: j };
}

/* ---------- 结构校验（verify 用）：题型/串/池/相位约束
   （answer=逆序精确性/章位数/mode/kind 由 verify 侧独立倒填循环计算器分源复算 §0.44） ---------- */
function structOk(q) {
  const KINDS = ['df', 'dr', 'lf', 'cf', 'dx'];
  if (KINDS.indexOf(q.kind) < 0) return false;
  const wantMat = q.kind === 'lf' ? 'let' : (q.kind === 'cf' ? 'col' : 'dgt');
  if (q.mat !== wantMat) return false;
  if (q.kind === 'dr' && q.mode !== 'rev') return false;
  if ((q.kind === 'df' || q.kind === 'lf' || q.kind === 'cf') && q.mode !== 'fwd') return false;
  if (q.kind === 'dx' && q.mode !== 'fwd' && q.mode !== 'rev') return false;
  const delayWant = q.kind === 'dx';
  if (!!q.delay !== delayWant) return false;
  const spec = { df: [6, 7], dr: [5, 6], lf: [5, 6], cf: [5, 6], dx: [5, 6] }[q.kind];
  if (!Array.isArray(q.seq) || q.seq.length < spec[0] || q.seq.length > spec[1]) return false;
  const pool = poolOfMat(q.mat);
  if (q.seq.some(v => pool.indexOf(v) < 0)) return false;                // 值域按素材池
  if (new Set(q.seq).size !== q.seq.length) return false;                // §0.44 串内值互异
  if (!Array.isArray(q.answer) || q.answer.length !== q.seq.length) return false;
  const revAns = q.seq.slice().reverse();
  const fwdOk = q.mode === 'fwd' && q.answer.every((v, k) => v === q.seq[k]);
  const revOk = q.mode === 'rev' && q.answer.every((v, k) => v === revAns[k]);
  if (!fwdOk && !revOk) return false;                                    // answer=原序/精确逆序
  if (q.phase !== 'show' && q.phase !== 'gap' && q.phase !== 'recall') return false;
  if (q.showMs !== SHOW_BASE + q.seq.length * SHOW_PER) return false;    // 展示窗与 UI 同源精确值
  if (q.gapMs !== (q.delay ? GAP_MS : 0)) return false;
  if (!Array.isArray(q.opts) || q.opts.some(o => pool.indexOf(o.v) < 0)) return false;
  const need = {}, have = {};
  q.answer.forEach(v => { need[v] = (need[v] || 0) + 1; });
  q.opts.forEach(o => { have[o.v] = (have[o.v] || 0) + 1; });
  for (const k of Object.keys(need)) if (have[k] !== need[k]) return false;   // 池 ⊇ answer 多重集
  const extra = q.opts.length - q.answer.length;
  const extraWant = q.seq.length >= 7 ? 2 : 3;
  if (extra !== extraWant) return false;                                 // 干扰 len7→2 / 其余 3
  const extraList = [];
  const need2 = {};
  q.answer.forEach(v => { need2[v] = (need2[v] || 0) + 1; });
  q.opts.forEach(o => { if (need2[o.v] > 0) need2[o.v]--; else extraList.push(o.v); });
  if (new Set(extraList).size !== extraList.length) return false;        // 干扰互异
  if (extraList.some(v => need[v])) return false;                        // 干扰 ∉ answer（§0.44）
  if (q._built.length !== q.seq.length || q._used.length !== q.opts.length) return false;
  return true;
}
