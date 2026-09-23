/* ================= whereistand 纯引擎：确定性关卡生成 + 场景动物点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   坐标约定：line[0] 恒 = 最左（横排）/ 最上（竖排），line[4] = 最右 / 最下
   题型（SPEC-R33-WHEREISTAND §R1-§R3，r33 谱定稿——与 SPEC-BATCH9 §1 冲突处以 SPEC-R33 为准）：
   edge    最边上：dir=up→answerIdx=0（最上）/ down→4（最下）/ left→0（最左）/ right→4（最右）
   ordinal 序数方位：k∈1-5，up/left→answerIdx=k-1（从起点数第 k 位）/ down/right→answerIdx=5-k
   two     两步指令（r33 新增，ch3 主载）：「从 dir 边数第 k 只的 dir2 边那只」——k∈2-4（参照
           不在端点，d1×k×d2 全组合合法）；refIdx=ordinal 公式；dir/dir2 同 orient；
           answerIdx=（dir2 为 up/left 起点 side）? refIdx-1 : refIdx+1
   flip    参照物翻转（r33 新增，ch4/生成关）：「line[refIdx] 的 dir2 边」=动物自身方位
           （正面朝观察者）：横排镜像 left→refIdx+1 / right→refIdx-1（它的左=屏幕右）；
           竖排上下不镜像 up→refIdx-1 / down→refIdx+1；refIdx∈1-3（两侧邻位恒在）
   章型（r33）：dch1 最边上：edge×5 四向混出（qi0 恒 up 教学锚+热身，qi1-4=shuffled([down,left,right,up])）
        / dch2 数一数：qi0 恒 edge 热身；qi1-4=shuffled([edge,ordinal,ordinal,ordinal])，方向四向随机
        / dch3 转个弯：qi0 恒 ordinal 热身；qi1-4=shuffled([two,two,two,ordinal])
        / dch4 全都要：qi0-3=shuffled([edge,ordinal,two,flip])+qi4=四型随机一
   生成关（flat≥20）：每题 mode=四型随机+参数随机（dch 字段仍 (ch-1)%4+1 供进度显示）
   排列：每题独立 line = 8 只全库洗牌取前 5（互异由洗牌保证，verify 断言） */
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
const ALL_DIRS = ['up', 'down', 'left', 'right'];
const DIRS_OF_ORIENT = { horiz: ['left', 'right'], vert: ['up', 'down'] };

/* 方位答案数学（verify 断言同源调用）：edge 最边位 / ordinal 从方向起点数第 k 位 */
function answerIdxOf(mode, dir, k) {
  const fromStart = (dir === 'up' || dir === 'left');   // 上/左 = line[0] 侧起点
  if (mode === 'edge') return fromStart ? 0 : CH_LEN - 1;
  return fromStart ? k - 1 : CH_LEN - k;
}
/* two 答案（r33）：参照位 = ordinal 公式，answerIdx = 起点侧邻 / 末点侧邻 */
function twoAnswerIdx(dir, k, dir2) {
  const ref = answerIdxOf('ordinal', dir, k);
  return (dir2 === 'up' || dir2 === 'left') ? ref - 1 : ref + 1;
}
/* flip 答案（r33）：横排镜像（它的左=屏幕右）/ 竖排上下不镜像 */
function flipAnswerIdx(orient, dir2, refIdx) {
  return orient === 'horiz'
    ? (dir2 === 'left' ? refIdx + 1 : refIdx - 1)
    : (dir2 === 'up' ? refIdx - 1 : refIdx + 1);
}

/* ---------- 单题生成（rnd 同流保证确定性；modeSeq/dirSeq = 静态章预排序，genLevel 统一洗牌）
   rnd 消耗次序=实现序（pycheck 逐位对拍，SPEC-R33 §R3）：参数位在前、line 洗牌（7 次）恒在尾 ---------- */
function genOne(dch, qi, rnd, modeSeq, dirSeq) {
  let mode, dir = null, k = null, dir2 = null, refIdx = null;
  if (dch === 1) {                                 // 章 1 最边上：edge 四向混出（qi0 恒 up 教学锚）
    mode = 'edge'; dir = qi === 0 ? 'up' : dirSeq[qi - 1];
  } else if (modeSeq) {                            // 章 2/3/4：预排序定型（qi0 热身锚在 genLevel 拼）
    mode = modeSeq[qi];
  } else {                                         // 生成关：四型随机（SPEC-R33 §R3）
    mode = ['edge', 'ordinal', 'two', 'flip'][ri(rnd, 0, 3)];
  }
  if (mode === 'edge') {
    if (!dir) dir = ALL_DIRS[ri(rnd, 0, 3)];
  } else if (mode === 'ordinal') {
    dir = ALL_DIRS[ri(rnd, 0, 3)]; k = ri(rnd, 1, 5);
  } else if (mode === 'two') {                     // 两步：o→d1→k→d2 逐位消耗
    const o = ['horiz', 'vert'][ri(rnd, 0, 1)];
    dir = DIRS_OF_ORIENT[o][ri(rnd, 0, 1)];
    k = ri(rnd, 2, 4);
    dir2 = DIRS_OF_ORIENT[o][ri(rnd, 0, 1)];
  } else {                                         // flip：o→dir2→refIdx
    const o = ['horiz', 'vert'][ri(rnd, 0, 1)];
    dir2 = DIRS_OF_ORIENT[o][ri(rnd, 0, 1)];
    refIdx = ri(rnd, 1, 3);
  }
  const line = shuffled(ANIMAL_IDS, rnd).slice(0, 5);   // 每题独立排列（8 选 5 洗牌，互异天然保证）
  const orient = mode === 'flip' ? DIRS[dir2].orient : DIRS[dir].orient;
  const answerIdx = mode === 'two' ? twoAnswerIdx(dir, k, dir2)
    : mode === 'flip' ? flipAnswerIdx(orient, dir2, refIdx)
    : answerIdxOf(mode, dir, k);
  return { mode: mode, dir: mode === 'flip' ? null : dir,
    k: mode === 'edge' || mode === 'flip' ? null : k,
    dir2: dir2, refIdx: refIdx,
    orient: orient, line: line, answerIdx: answerIdx, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  let modeSeq = null, dirSeq = null;
  if (flat < STATIC_LEVELS) {
    if (dch === 1) {                               // ch1：qi0 恒 up；qi1-4 四向洗牌（up 再现一次）
      dirSeq = shuffled(['down', 'left', 'right', 'up'], rnd);
    } else if (dch === 2) {                        // ch2：qi0 恒 edge 热身；qi1-4 = 1 edge + 3 ordinal
      modeSeq = ['edge'].concat(shuffled(['edge', 'ordinal', 'ordinal', 'ordinal'], rnd));
    } else if (dch === 3) {                        // ch3：qi0 恒 ordinal 热身；qi1-4 = 3 two + 1 ordinal
      modeSeq = ['ordinal'].concat(shuffled(['two', 'two', 'two', 'ordinal'], rnd));
    } else {                                       // ch4：四型各一定型洗牌 + qi4 四型随机一
      modeSeq = shuffled(['edge', 'ordinal', 'two', 'flip'], rnd);
      modeSeq.push(['edge', 'ordinal', 'two', 'flip'][ri(rnd, 0, 3)]);
    }
  }
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    quizzes.push(genOne(flat >= STATIC_LEVELS ? null : dch, qi, rnd, modeSeq, dirSeq));
  }
  return { flat, ch, dch, lv, quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTap(L, i) —— 点排队中第 i 个位置（0-4）
   'goal' 答对（本题完成）/ 'done' 答对且最后一题（本关通关）
   'wrong' 答错（该动物晃动不灰掉——场景卡全可点，同卡可再点，每次计一次错）
   'again' 已答完的题（防御层；UI 演出窗 locked 先拦，引擎兜底零惩罚）
   null 非法下标或关卡已结束 ---------- */
function engTap(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  if (!Number.isInteger(i) || i < 0 || i >= CH_LEN) return null;
  const q = L.quizzes[L.step];
  if (q._answered) return 'again';
  if (i === q.answerIdx) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'goal';
  }
  q._miss = (q._miss || 0) + 1;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：一关零错点（retries=0）=3 星；总错点 ≤2=2 星；否则 1 星。永不 0 星 */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：mode/dir/orient 自洽、k 域、line 5 只互异且在库、
   answerIdx 与"edge 最边位 / ordinal 方向起点第 k 位 / two 参照邻位 / flip 镜像律"一致。
   返回具体失败原因便于审计（two/flip 独立字面复算另在 verify ① 与 pycheck 双重覆盖） ---------- */
function structWhy(q) {
  if (!q || ['edge', 'ordinal', 'two', 'flip'].indexOf(q.mode) < 0) return 'mode';
  if (q.mode === 'flip') {
    if (ALL_DIRS.indexOf(q.dir2) < 0) return 'dir2';
    if (q.orient !== DIRS[q.dir2].orient) return 'orient';
    if (!(q.refIdx >= 1 && q.refIdx <= 3)) return 'refRange';
    if (q.dir != null || q.k != null) return 'dirNotNull';
  } else {
    if (ALL_DIRS.indexOf(q.dir) < 0) return 'dir';
    if (q.orient !== DIRS[q.dir].orient) return 'orient';
    if (q.mode === 'edge' && q.k != null) return 'kNotNull';
    if (q.mode === 'ordinal' && !(q.k >= 1 && q.k <= 5)) return 'kRange';
    if (q.mode === 'two') {
      if (ALL_DIRS.indexOf(q.dir2) < 0) return 'dir2';
      if (DIRS[q.dir2].orient !== q.orient) return 'dir2Orient';
      if (!(q.k >= 2 && q.k <= 4)) return 'kRange2';
    }
  }
  if (!Array.isArray(q.line) || q.line.length !== CH_LEN) return 'lineLen';
  const uniq = q.line.filter((v, i, a) => a.indexOf(v) === i);
  if (uniq.length !== CH_LEN) return 'lineDup';
  if (!q.line.every(id => ANIMAL_IDS.indexOf(id) >= 0)) return 'lineAnimal';
  const want = q.mode === 'two' ? twoAnswerIdx(q.dir, q.k, q.dir2)
    : q.mode === 'flip' ? flipAnswerIdx(q.orient, q.dir2, q.refIdx)
    : answerIdxOf(q.mode, q.dir, q.k);
  if (q.answerIdx !== want) return 'answerIdx';
  return null;
}
