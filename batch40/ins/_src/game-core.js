/* ================= ins 纯引擎：确定性关卡生成 + LEGS 推导判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 887)（本款常量 887，SPEC-BATCH40 §0 定版）：
   同 flat 永远同关（重玩一致、verify 可检）。
   LEGS 封闭表（SPEC §1——推导律即真值，answer 禁另写）：
     昆虫 4（6 腿）：ant / butterfly / bee / ladybird
     蛛形纲 4（8 步足）：spider / wolfspider / jumpspider / scorpion
   推导律：judge 族 LEGS==6→'insect'（昆虫） / ==8→'spider'（蜘蛛）；
           legs 族 LEGS==6→'six' / ==8→'eight'。verify 按 LEGS 表独立复算。
   取题（N1 定版语义：题表 20 行=4 章池×5 行，关内 rotate）：
     静态关 flat<20：dch=flat//5+1；题(flat,k)=表行[(dch-1)*5+((flat%5)+k)%5]
     生成关 flat≥20：dch=ri(rnd,1,4) seeded 随机（域全档成立型——SPEC §0 生成关
     策略显式声明：mulberry32 第一个随机数，先取数保确定性）；题(flat,k) 同式
     以 dch 代章池基（(dch-1)*5+((flat%5)+k)%5）。
   候选盘（恒两选——SPEC §1 降坡①）：judge={insect,spider} / legs={six,eight}，
   seeded 打乱（契合位不恒定）；rnd 消耗顺序恒定：生成关先取 dch → 逐题
   shuffled(2) 各 1 次。
   quiz 结构：{ row(0-19 题表行号), kind('judge'|'legs'), anim(8 动物 id),
   picks(2 枚 id), answer(契合下标——LEGS 推导), _miss, _answered }
   铁律：每关 5 题；同关 5 题 anim 互异（章池 rotate 天然成立——题表每章池
   5 行互异，structWhy 校验）；miss 在本判定层计（b34 坑①：UI guard 判定前拦
   +预判与 core 严格同构）。 */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号取材档（§0.4） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- LEGS 封闭表（SPEC §1 逐字——judge/legs answer 唯一推导律；
   r26 SPEC-R26 §R3 扩：干扰动物入表——snail 蜗牛 0 腿（软体动物）/
   centipede 蜈蚣 20 腿（多足纲，封闭表征「腿很多≠6≠8」）——两域三分类推导 ---------- */
const LEGS = { ant: 6, butterfly: 6, bee: 6, ladybird: 6,
               spider: 8, wolfspider: 8, jumpspider: 8, scorpion: 8,
               snail: 0, centipede: 20 };
const ANIMALS = ['ant', 'butterfly', 'bee', 'ladybird', 'spider', 'wolfspider', 'jumpspider', 'scorpion'];
const EXTRA_ANIMALS = ['snail', 'centipede'];           // r26 干扰动物（dch4 专属域）
/* r26 身体分段封闭表（维度②推导律）：昆虫=3（头胸腹）/蛛形纲=2（头胸部+腹部）/
   蜈蚣=15（很多段）/蜗牛=0（不分段——惰性值：snail 不入 bodyseg 池） */
const SEGS = { ant: 3, butterfly: 3, bee: 3, ladybird: 3,
               spider: 2, wolfspider: 2, jumpspider: 2, scorpion: 2,
               snail: 0, centipede: 15 };
/* r26 bodyseg 视觉诚实池：仅入 SVG 分段逐节可数且与 SEGS 一致的 6 种
   （butterfly/ladybird 存量 SVG 身体画两大块、scorpion 尾节易误数——不入池，
   SPEC-R26 §R1「图在说谎」规避） */
const BODY_POOL = ['ant', 'bee', 'spider', 'wolfspider', 'jumpspider', 'centipede'];
/* r26 dch4 固定题型谱（qi 位确定性——4 形态每关恒在场；judge3×2+legs3+
   bodyseg+mixfind） */
const DCH4_KINDS = ['judge3', 'legs3', 'bodyseg', 'judge3', 'mixfind'];
const isBug = anim => LEGS[anim] === 6;                 // 6 腿=昆虫
/* r26 类目三向推导（封闭表内腿数唯一决定类目——无例外）：
   ==6→昆虫 / ==8→蛛形纲答案=蜘蛛 / 其余（0/20）→都不是 */
const clsOf = anim => LEGS[anim] === 6 ? 'insect' : (LEGS[anim] === 8 ? 'spider' : 'none');
/* 两选候选集（SPEC §1 恒两选，dch1-3）与推导律（LEGS→pick id——verify 独立复算依据） */
const PICKS_OF = kind => kind === 'judge' ? ['insect', 'spider'] : ['six', 'eight'];
const pickIdOf = (kind, anim) => kind === 'judge'
  ? (isBug(anim) ? 'insect' : 'spider')
  : (isBug(anim) ? 'six' : 'eight');
/* r26 三选候选集与推导律（dch4 谱——verify 独立复算依据，answer 禁另写魔数）：
   judge3 {昆虫,蜘蛛,都不是}=clsOf / legs3 {六,八,都不是}=LEGS 三向 /
   bodyseg {三段,两段,很多段}=SEGS 三向（==3→three / ==2→two / ≥4→many） */
const PICKS3_OF = { judge3: ['insect', 'spider', 'none'],
                    legs3: ['six', 'eight', 'none'],
                    bodyseg: ['three', 'two', 'many'] };
const pickIdOf3 = (kind, anim) => kind === 'judge3' ? clsOf(anim)
  : kind === 'legs3' ? (LEGS[anim] === 6 ? 'six' : (LEGS[anim] === 8 ? 'eight' : 'none'))
  : (SEGS[anim] === 3 ? 'three' : (SEGS[anim] === 2 ? 'two' : 'many'));
/* 科普句键（知识红线：蛛形纲→「它不是昆虫」句式；r26 三向——干扰动物
   →sciNone「不是昆虫也不是蜘蛛」） */
const sciKeyOf = anim => isBug(anim) ? 'sciInsect' : (LEGS[anim] === 8 ? 'sciSpider' : 'sciNone');

/* ---------- 单题构建（dch1-3 题表行+seeded 两选盘——**逐字节原样**；
   r26：dch4 在旧消耗之前整支分流 buildQuiz4——dch1-3 rnd 消耗序列与
   r26 前逐位一致（SPEC-R26 §R6 基线双证据①源码锚）） ---------- */
function buildQuiz(rowIdx, dch, qi, rnd) {
  if (dch === 4) return buildQuiz4(rowIdx, qi, rnd);    // r26 dch4 谱（rnd 消耗专属本分支）
  const row = ROWS[rowIdx];
  const picks = shuffled(PICKS_OF(row.kind), rnd);      // seeded 打乱（契合位不恒定）
  return { row: rowIdx, kind: row.kind, anim: row.anim,
           picks: picks, answer: picks.indexOf(pickIdOf(row.kind, row.anim)),
           _miss: 0, _answered: false };
}
/* ---------- r26 dch4 谱单题构建（SPEC-R26 §R3 生成律） ---------- */
function buildQuiz4(rowIdx, qi, rnd) {
  const kind = DCH4_KINDS[qi];
  const rowAnim = ROWS[rowIdx].anim;
  if (kind === 'judge3' || kind === 'legs3') {
    /* 主角=题表行动物（核心 8 种）；seeded 掷币换干扰动物主角
       （rnd()>=0.5 换，再掷定 snail/centipede——约半数答案=「都不是」） */
    let anim = rowAnim;
    if (rnd() >= 0.5) anim = rnd() < 0.5 ? 'snail' : 'centipede';
    const picks = shuffled(PICKS3_OF[kind], rnd);
    return { row: rowIdx, kind: kind, anim: anim,
             picks: picks, answer: picks.indexOf(pickIdOf3(kind, anim)),
             _miss: 0, _answered: false };
  }
  if (kind === 'bodyseg') {
    /* 主角=视觉诚实池 seeded 取 1（ant/bee/spider/wolfspider/jumpspider=三段·两段
       /centipede=很多段——三分支全档成立） */
    const anim = BODY_POOL[Math.floor(rnd() * BODY_POOL.length)];
    const picks = shuffled(PICKS3_OF.bodyseg, rnd);
    return { row: rowIdx, kind: kind, anim: anim,
             picks: picks, answer: picks.indexOf(pickIdOf3(kind, anim)),
             _miss: 0, _answered: false };
  }
  /* mixfind：cond 双条件（6=六条腿的昆虫/8=八条腿的蜘蛛）；契合 1+异类核心 1+
     干扰动物 1（每道恒含干扰动物——审计①候选盘落点）；封闭表内 LEGS==cond
     的 pick 唯一（恒一性）；anim=match（确认链尾名音取用——题面链禁念名防泄） */
  const cond = rnd() < 0.5 ? 6 : 8;
  const pool6 = ['ant', 'butterfly', 'bee', 'ladybird'];
  const pool8 = ['spider', 'wolfspider', 'jumpspider', 'scorpion'];
  const matchPool = cond === 6 ? pool6 : pool8;
  const otherPool = cond === 6 ? pool8 : pool6;
  const match = matchPool[Math.floor(rnd() * 4)];
  const wrongCore = otherPool[Math.floor(rnd() * 4)];
  const decoy = rnd() < 0.5 ? 'snail' : 'centipede';
  const picks = shuffled([match, wrongCore, decoy], rnd);
  return { row: rowIdx, kind: 'mixfind', anim: match, cond: cond,
           picks: picks, answer: picks.indexOf(match),
           _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   N1 rotate：题(flat,k)=表行[(dch-1)*5+((flat%5)+k)%5]（章池 5 行 rotate——
   同关 5 题取同池 5 行天然互异；20 静态关每行恰现 5 次。r26：dch4 仍按本式
   取 row 号（quiz.row 照赋——20 行覆盖审计口径不变），kind/anim 由谱覆盖） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 887);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const base = (dch - 1) * 5;
  const rows = [];
  for (let k = 0; k < CH_LEN; k++) rows.push(base + (lv + k) % 5);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(rows[qi], dch, qi, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv, rows: rows,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点选引擎（无 DOM）：engTapPick(L, i) —— 点当前题第 i 枚候选
   'picked'  选对（本题完成 step+1；非末题）
   'done'    选对且末题=通关（SPEC §1 tapPick 枚举）
   'wrong'   选错：该题 miss+1（retries 全关累计=星级口径），候选回可重点（探索不罚）
   null      非法下标 / 关卡已结束 / 本题已答完 ---------- */
function engTapPick(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.picks.length) return null;
  if (i === q.answer) {
    q._answered = true;                                 // 单步题：一步一答
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'picked';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（SPEC §0 miss 计数款：全关选错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星） */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题契合项下标（独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：row 域 / kind·anim
   与题表行一致（dch1-3）/ anim 属 LEGS 封闭集 / 盘 2 枚恰为该 kind 候选集（互异）/
   answer=LEGS 推导下标复算（禁读直比）/ 同关 5 题行号=章池 rotate 复算 /
   初始态干净。r26 dch4 分支：谱位校验（dch===4 且 DCH4_KINDS[k] 匹配）+
   封闭表推导复算（三选集/三向推导/mixfind 唯一契合）——关级谱构成聚合
   断言在 game-verify ③（r24/r25 同范式） ---------- */
function structWhy(q, dch, lv, k) {
  if (!q) return 'quiz';
  if (!Number.isInteger(q.row) || q.row < 0 || q.row >= ROWS.length) return 'row';
  if (q.kind === 'judge3' || q.kind === 'legs3' || q.kind === 'bodyseg' || q.kind === 'mixfind') {
    if (dch !== 4 || DCH4_KINDS[k] !== q.kind) return 'dch4Pos';      // 谱位（qi 位对应）
    if (!Array.isArray(q.picks) || q.picks.length !== 3) return 'picksN';
    if (new Set(q.picks).size !== 3) return 'picksDup';
    if (q.kind === 'mixfind') {
      if (q.cond !== 6 && q.cond !== 8) return 'cond';
      if (!q.picks.every(p => LEGS[p] !== undefined)) return 'pickAnimSet';   // 候选=动物 id 封闭集
      if (q.picks.filter(p => LEGS[p] === q.cond).length !== 1) return 'matchUnique';   // 唯一契合（恒一性）
      if (q.anim !== q.picks.find(p => LEGS[p] === q.cond)) return 'anim';    // anim=契合动物
      if (q.answer !== q.picks.indexOf(q.anim)) return 'answer';
    } else {
      if (LEGS[q.anim] === undefined) return 'animSet';
      if (q.kind === 'bodyseg' && BODY_POOL.indexOf(q.anim) < 0) return 'bodyPool';   // 视觉诚实池域
      const want = PICKS3_OF[q.kind];
      if (q.picks.slice().sort().join('|') !== want.slice().sort().join('|')) return 'picksSet';
      if (q.answer !== q.picks.indexOf(pickIdOf3(q.kind, q.anim))) return 'answer';   // 三向推导复算
    }
  } else {
    const row = ROWS[q.row];
    if (q.kind !== row.kind) return 'kind';
    if (q.kind !== 'judge' && q.kind !== 'legs') return 'kindSet';
    if (dch === 4) return 'dch4Kind';                       // 旧 kind 不得出现在 dch4 谱位
    if (q.anim !== row.anim) return 'anim';
    if (LEGS[q.anim] === undefined) return 'animSet';
    if (!Array.isArray(q.picks) || q.picks.length !== 2) return 'picksN';
    if (new Set(q.picks).size !== 2) return 'picksDup';
    const want = PICKS_OF(q.kind);
    if (q.picks.slice().sort().join('|') !== want.slice().sort().join('|')) return 'picksSet';
    if (q.answer !== q.picks.indexOf(pickIdOf(q.kind, q.anim))) return 'answer';
  }
  if (k !== undefined && lv !== undefined && dch !== undefined) {
    if (q.row !== (dch - 1) * 5 + (lv + k) % 5) return 'rotate';   // N1 取材复算（dch4 row 照赋同式）
  }
  if (q._miss !== 0 || q._answered) return 'dirty';
  return null;
}
