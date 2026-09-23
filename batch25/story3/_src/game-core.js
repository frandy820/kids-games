/* ================= story3 纯引擎：确定性关卡生成 + 槽位状态机判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 25)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R34-STORY3 §R2；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 生活 routine：ch1 池（wake/meal/laundry/night）3 帧、无干扰、无 why（教学锚）
     dch2 自然因果：ch2 池（seed/cate/rain/chick）4 帧+每题 1 干扰帧
     dch3 时间线：ch3 池（sunwalk/bird/meals/shadow）5 帧+干扰帧+qi1/qi3 因果问句
     dch4 生成混合：全库 12 池（3/4/5 帧随故事）+干扰帧+qi1/qi3 因果问句
   池 4 池取 5 题：全库/≥5 池洗牌取前 5（全互异）；4 池=4 互异 + 1 尾非邻重复（确定性）。
   铁律：自有帧子列乱序（禁恒正序——恒等确定翻「交换前二」，N=3 与 v1 [1,0,2] 同）；
   相邻题故事互异；frames[] = 洗牌后的候选卡（pos=该帧正确槽 0..N-1；pos=-1=干扰帧
   不属于本故事，放任何槽都算错；placed=已飞入槽）。why 待答时 step 不推（判定链收尾）。 */
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

/* ---------- 每关故事序表（genLevel 预生成；rnd 同流保确定性）
   池 ≥5：洗牌取前 5（全互异→相邻必互异）；池 4：4 互异 + 从「非末位」里补 1（非邻重复） */
function storySeqOf(dch, rnd) {
  const pool = dch === 1 ? CH_IDS(1) : dch === 2 ? CH_IDS(2) : dch === 3 ? CH_IDS(3) : ALL_IDS;
  if (pool.length >= CH_LEN) return shuffled(pool, rnd).slice(0, CH_LEN);
  const order = shuffled(pool, rnd);
  const rest = pool.filter(s => s !== order[order.length - 1]);
  order.push(rest[Math.floor(rnd() * rest.length)]);
  return order;
}

/* ---------- 单题构建（r34：帧数 N=故事本体 3/4/5；dch≥2 加 1 干扰帧 pos=-1；
   dch3/4 qi∈WHY_QI 挂因果问句）
   rnd 消耗序固定（SPEC-R34 §R3）：①shuffled 自有帧序（恒等确定翻「交换前二」——
   N=3 翻 [1,0,2] 与 v1 逐字节同）②干扰源故事 ③干扰帧号 ④插入位 ⑤why 选项洗牌 */
function buildQuiz(storyId, rnd, dch, qi) {
  const N = STORY_LIB[storyId].art.length;
  let order = shuffled(Array.from({ length: N }, (_, k) => k), rnd);
  if (order.every((v, k) => v === k)) { const t = order[0]; order[0] = order[1]; order[1] = t; }
  const frames = order.map(p => ({ id: storyId + '-f' + p, pos: p, placed: false }));
  if (dch >= 2) {                                 // 干扰帧：同 dch 池另一故事的一帧（dch4=全库）
    const pool = (dch === 4 ? ALL_IDS : CH_IDS(dch)).filter(s => s !== storyId);
    const ds = pool[Math.floor(rnd() * pool.length)];
    const df = Math.floor(rnd() * STORY_LIB[ds].art.length);
    const at = Math.floor(rnd() * (N + 1));
    frames.splice(at, 0, { id: ds + '-f' + df, pos: -1, placed: false });
  }
  const why = (WHY_QI[dch] || []).indexOf(qi) >= 0
            ? { opts: shuffled(['a', 'b'], rnd), done: false } : null;
  return { story: storyId, frames: frames, slot: 0, _miss: 0, _answered: false, why: why };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 25);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const seq = storySeqOf(dch, rnd);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(seq[qi], rnd, dch, qi));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点帧引擎（无 DOM）：engTapFrame(L, i) —— 点第 i 张帧卡（frames 数组下标）
   'right' 点对：帧 placed=true、slot 推进（故事未完成或 why 待答=不推 step）
   'done'  点对：末题故事完成且无 why 待答 = 整关通关
   'wrong' 点错（非当前槽正确帧，含 pos=-1 干扰帧）：该题 miss+1（retries 全关累计
           =星级口径），已放帧不清（槽位不清已对的——探索不罚）
   null    非法下标 / 已放置帧 / 故事已答完（why 相位走 engTapWhy）/ 关卡已结束 */
function engTapFrame(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.frames.length) return null;
  if (q.frames[i].placed) return null;
  if (q.frames[i].pos === q.slot) {
    q.frames[i].placed = true;
    q.slot++;
    if (q.slot >= q.frames.filter(f => f.pos >= 0).length) {   // 自有槽全对：故事完成
      q._answered = true;
      if (q.why && !q.why.done) return 'right';   // r34：why 待答=本题判定链未收尾，step 不推
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    }
    return 'right';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
/* ---------- 因果问句引擎（r34 维度三）：engTapWhy(L, i) —— 点第 i 张选项卡（0/1）
   'right'/'done' 选项为真因果（opts[i]==='a'）：why.done=true+此时才推 step/通关
   'wrong' 傻干扰选项：miss+1（星级口径含因果问句）
   null    非 why 相位 / 已答 / 非法下标 / 关卡已结束 */
function engTapWhy(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || !q.why || q.why.done || !q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i > 1) return null;
  if (q.why.opts[i] !== 'a') {
    q._miss++;
    L.retries++;
    return 'wrong';
  }
  q.why.done = true;
  L.step++;
  if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
  return 'right';
}
const engWon = L => !!L && L.done;
/* 星级（§0.58 口径）：全关错点 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指/autoSolve 用：当前槽正确帧下标（未放置且 pos===slot；无则 -1；
   pos=-1 干扰帧永不命中——r34 天然免疫） */
const correctIdx = q => {
  if (!q || q._answered) return -1;
  for (let i = 0; i < q.frames.length; i++) {
    if (!q.frames[i].placed && q.frames[i].pos === q.slot) return i;
  }
  return -1;
};
/* 因果问句正确选项卡下标（opts.indexOf('a')；非 why 相位=-1） */
const correctWhyIdx = q => (q && q.why && !q.why.done && q._answered) ? q.why.opts.indexOf('a') : -1;

/* ---------- 结构校验（verify 用，返回失败原因或 null，r34 新律）：封闭集 / 章池 /
   帧形状（自有帧=0..N-1 置换且自有子列非恒等；dch≥2 恰 1 干扰帧 pos=-1 源故事互异）/
   why 开关律（dch∈{3,4} 且 qi∈WHY_QI）/ id-pos 自洽 / 初始态干净 / 相邻题故事互异 */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q || !STORY_LIB[q.story]) return 'story';
  if (dch !== 4 && STORY_LIB[q.story].ch !== dch) return 'chPool';   // dch4 全库不限章
  const N = STORY_LIB[q.story].art.length;
  const own = q.frames.filter(f => f.pos >= 0);
  const dis = q.frames.filter(f => f.pos === -1);
  if (q.frames.length !== N + (dch >= 2 ? 1 : 0)) return 'framesLen';
  if (dis.length !== (dch >= 2 ? 1 : 0)) return 'distractN';
  if (own.map(f => f.pos).slice().sort().join() !== Array.from({ length: N }, (_, k) => k).join()) return 'perm';
  const ownSeq = own.map(f => f.pos);
  if (ownSeq.every((v, k) => v === k)) return 'identity';            // 自有子列禁恒正序呈现
  for (const f of own) {
    if (f.id !== q.story + '-f' + f.pos) return 'idPos';
    if (f.placed) return 'init';
  }
  if (dis.length === 1) {
    const m = /^(.*)-f(\d+)$/.exec(dis[0].id);
    if (!m || m[1] === q.story || !STORY_LIB[m[1]] || +m[2] >= STORY_LIB[m[1]].art.length) return 'distractSrc';
    if (dch !== 4 && STORY_LIB[m[1]].ch !== dch) return 'distractPool';   /* r34 审查 m3：干扰帧同 dch 池律（dch4=全池） */
    if (q.frames.some((f, k) => f.id === dis[0].id && k !== q.frames.indexOf(dis[0]))) return 'distractDup';
  }
  const whyWant = (WHY_QI[dch] || []).indexOf(qi) >= 0;
  if (whyWant !== !!q.why) return 'whyFlag';
  if (q.why && (q.why.opts.length !== 2 || q.why.opts.slice().sort().join() !== 'a,b' || q.why.done)) return 'whyOpts';
  if (q.slot !== 0 || q._miss !== 0 || q._answered) return 'init';
  if (prevQ && prevQ.story === q.story) return 'adjacent';
  return null;
}
