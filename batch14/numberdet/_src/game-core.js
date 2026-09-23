/* ================= numberdet 纯引擎：确定性关卡生成 + 猜数二分判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（SPEC-BATCH14 §3）：
     dch1 1-20 base=5 / dch2 1-30 base=5 / dch3 1-50 base=6 / dch4 1-99 base=7
   base 口径：SPEC §3 表值 {20:5, 30:5, 50:6, 99:7}——恰为恒猜中点二分的最坏步数
     worst(N) = ceil(log2(N+1))（20→5 / 30→5 / 50→6 / 99：log2(100)=6.64→7，四值全对账）；
     SPEC 括注"ceil(log2(N))+1"按字面给 6/6/7/8 与表值不符——表值为准（SPEC 内部冲突取具体定稿值），
     且字面式恒 ≥ 表值，"二分 ≤base"断言在两种读法下均成立（verify 独立复算双证）。
   secret ∈ [1,N] 确定性随机；同关 5 题互异（优先未用值，60 次重试后线性兜底）
   判定（engOK）：每猜必有信息反馈，无 wrong 路径（§0.24 显式豁免）：
     'big' 猜大（区间 hi 收紧到 g-1）/ 'small' 猜小（lo 收紧到 g+1）/
     'got' 猜中推进（非末题）/ 'done' 猜中且末题（通关）/
     'gone' 范围外（<1 或 >N）或已排除数（<lo 或 >hi）——不计猜测次数（无害探索 §0.7a）/
     'empty' 未输入就确认（不计次数）/ null 关已结束或非法
   星级=超基准口径（SPEC §3）：每题超次 miss = max(0, guesses-base)（≥0，实时维护）；
     关星=Σ各题超次：0=3★ / 1-2=2★ / 更多=1★（二分策略好=满星——星级本身教二分；永不 0 星 §0.14）
   L.retries 仅为合法猜测总次数统计（不进星级，防与 miss 语义混淆） */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增；难度章号：静态关 (ch-1)%4+1 循环，生成关随机 1-4（§0.3） */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 章参数：范围 N 与基准 base（SPEC §3 定稿表） ---------- */
const RANGE_N = { 1: 20, 2: 30, 3: 50, 4: 99 };
const BASE_N = { 20: 5, 30: 5, 50: 6, 99: 7 };
const baseOf = N => BASE_N[N];

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 batch11 M1 定版
  const N = RANGE_N[dch];
  const used = [], quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    let s = ri(rnd, 1, N), tries = 0;             // 同关 5 题互异：优先抽未用值
    while (used.indexOf(s) >= 0 && tries++ < 60) s = ri(rnd, 1, N);
    if (used.indexOf(s) >= 0) {                   // 兜底：线性找首个未用值（确定性成立）
      for (let v = 1; v <= N; v++) if (used.indexOf(v) < 0) { s = v; break; }
    }
    used.push(s);
    quizzes.push({ kind: 'hunt', N: N, secret: s, base: baseOf(N),
      lo: 1, hi: N, guesses: 0, miss: 0, input: null, solved: false });
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
    quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 键入引擎：engKey(L, d) —— 数字键 0-9
   返回新拼数（number）；满 2 位/非法数字/关末 → null（不变）
   输入 ≤2 位（ch1-4 全 2 位封顶：99 为最大 N）；首位 0 再按 d → 归并为 d（标准键盘行为） ---------- */
function engKey(L, d) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.kind !== 'hunt' || q.solved) return null;
  if (!Number.isInteger(d) || d < 0 || d > 9) return null;
  if (q.input == null) { q.input = d; return d; }
  if (q.input >= 10) return null;                 // 已 2 位，满
  q.input = q.input === 0 ? d : q.input * 10 + d; // 前导 0 归并
  return q.input;
}

/* ---------- 删除引擎：engDel(L)
   有输入 → 退一位，返回新拼数（number 或 null=已清空）；无输入 → false（无变化） ---------- */
function engDel(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (q.kind !== 'hunt' || q.solved) return false;
  if (q.input == null) return false;
  q.input = q.input >= 10 ? Math.floor(q.input / 10) : null;
  return q.input;
}

/* ---------- 确认引擎：engOK(L) —— 主判定（§3 玩法）
   'big'/'small' 信息反馈（区间收紧，计一次猜测）/'got'/'done' 猜中（计一次猜测并推进）/
   'gone' 范围外或已排除（不计猜测次数，无害探索）/'empty' 空输入（不计）/
   null 关已结束。合法猜测（big/small/got/done）才 guesses++ 并实时维护 miss=max(0,guesses-base) ---------- */
function engOK(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q.kind !== 'hunt' || q.solved) return null;
  if (q.input == null) return 'empty';
  const g = q.input;
  if (g < 1 || g > q.N || g < q.lo || g > q.hi) {
    q.input = null;                               // 拒绝后拼数清空（状态机干净：抖动后从 ? 重拼）
    return 'gone';                                // 范围外/已排除：不计数
  }
  q.input = null;                                 // 合法确认即消耗拼数
  q.guesses++;
  q.miss = Math.max(0, q.guesses - q.base);        // 当前题超次（实时，钩子可观测）
  L.retries++;                                    // 合法猜测总次数（统计，不进星级）
  if (g === q.secret) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'got';
  }
  if (g < q.secret) { q.lo = Math.max(q.lo, g + 1); return 'small'; }
  q.hi = Math.min(q.hi, g - 1);
  return 'big';
}

/* ---------- 剩余区间中点（救援视觉/教学"帮"/autoSolve 二分共用；恒猜中点口径一致） ---------- */
const engMid = q => Math.floor((q.lo + q.hi) / 2);

/* ---------- 星级：超基准口径（SPEC §3）——Σ各题超次 0=3★ / 1-2=2★ / 更多=1★（永不 0 星） ---------- */
const engStars = L => {
  const over = L.quizzes.reduce((s, q) => s + q.miss, 0);
  return over === 0 ? 3 : (over <= 2 ? 2 : 1);
};

/* ---------- 结构校验（verify 用）：初始态值域/base/secret 域 ---------- */
function structOk(q) {
  if (!q || q.kind !== 'hunt') return false;
  if (q.secret < 1 || q.secret > q.N) return false;
  if (q.base !== baseOf(q.N)) return false;
  if (q.lo !== 1 || q.hi !== q.N) return false;
  if (q.guesses !== 0 || q.miss !== 0 || q.input !== null || q.solved) return false;
  return true;
}
