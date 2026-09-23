/* ================= bubble 纯引擎 v2/r9：确定性关卡生成 + 泡泡场模拟 + 颜色子集点数 + 提交判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)（关卡题面/场色板）/ mulberry32(flat * 7919 + 71)（泡泡场独立流）：
   同 flat 永远同关同场（重玩一致、verify 可检）。
   章难度 v2（2026-09-13 家长审计改造——去计数器+颜色子集+提交制）：
   dch1 单色场 N∈[3,5] 泡慢 / dch2 两色场（蓝+黄）N∈[4,6] / dch3 三色场（+粉）N∈[5,8] 泡快 /
   dch4 生成关 seeded 色组合（2-3 色）+数量 N∈[3,8] 混速+偶发大泡
   r9（2026-09-14 AUDIT-56 #17）：genLevel 增 timed 字段（lv>=TIMED_FROM_LV=每章第 4/5 关）——
   倒计时状态机在 UI 层（game-main advance，走 field.t 模拟钟），引擎直驱（engFieldTick
   批量模拟）不涉计时，保 verify ①⑨ 大批量模拟的确定性。
   规则铁律 v2：顶部无计数显示——判定全靠提交（tapSubmit）；
   只点目标色泡才计数；点非目标色=不破不计数（探索）；点灰云=破但不计数（只记 cloudPops）；
   提交 ==N→right / >N→wrong_more（计数清零+submitErr+1）/ <N→wrong_less（保留计数）；
   屏上目标色泡恒 ≥2（respawn 秒级）；泡飘出顶=自然消失不罚；
   miss=submitErr + (cloudPops≥3 折 1)；星级 0=3★/1-2=2★/≥3=1★ */
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致，杜绝生成关软锁）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 关色板（dch1 单色 seeded / dch2-3 定版 / dch4 2-3 色 seeded；flat0 恒蓝=教学演示色） ---------- */
function genPalette(dch, flat, rnd) {
  let palette;
  if (dch === 1) palette = [ALL_COLORS[ri(rnd, 0, 2)]];                    // 单色场：每关抽 1 色
  else if (dch === 4) {                                                    // 生成关：2 或 3 色
    const k = ri(rnd, 2, 3);
    palette = k === 3 ? ALL_COLORS.slice() : COLOR_PAIRS[ri(rnd, 0, 2)].slice();
  } else palette = CHAPTERS[dch].colors.slice();
  if (flat === 0) palette = ['blue'];                                      // 教学关：演示=点 3 个蓝泡
  return palette;
}

/* ---------- 单题生成（rnd 同流保证确定性；lastN=避免与上一题目标数相同；color=palette 内抽） ---------- */
function genOne(dch, rnd, lastN, palette) {
  const C = CHAPTERS[dch];
  let n = ri(rnd, C.nMin, C.nMax);
  for (let t = 0; t < 8 && lastN != null && n === lastN; t++) n = ri(rnd, C.nMin, C.nMax);  // 相邻题目标数不同
  const color = palette[ri(rnd, 0, palette.length - 1)];
  return { type: 'bubble', n: n, color: color, seed: 0, _cnt: 0, solved: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   flat0 题0 恒 n=3 color='blue'（§2 v2 教学"演示点 3 个蓝泡"=恰好演示完整一题） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const colors = genPalette(dch, flat, rnd);
  const quizzes = [];
  let lastN = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, rnd, lastN, colors);
    if (flat === 0 && qi === 0) { q.n = 3; q.color = 'blue'; lastN = 3; }   // 教学演示定数（先改 lastN 再进下一题去重）
    else lastN = q.n;
    q.seed = (flat * 5 + qi) * 7919 + 13;                 // 题 seed（家族字段惯例）
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, colors: colors, quizzes: quizzes, step: 0, done: false,
    timed: lv >= TIMED_FROM_LV,                           // r9 章后段（每章第 4/5 关）启用温和倒计时（确定性规则）
    cloudPops: 0, totalPops: 0, submitErr: 0 };           // cloudPops=干扰云点破数 / totalPops=累计点破含云 / submitErr=多点提交错次
}

/* ---------- 泡泡场（纯逻辑模拟，坐标归一化 0-1：x 左→右，y 底 0 → 顶 1，与视口尺寸无关）
   bubbles: { id, kind:'color'|'cloud', color('blue'|'yellow'|'pink'|null), x, y, v(每秒穿屏比=1/riseSec),
             big, hue, wobA/wobP/wobF(左右摆幅/相位/频率) }
   sawCloud/sawBig=verify 审计用（是否出现过云朵/大泡） ---------- */
function engField(L) {
  const C = CHAPTERS[L.dch];
  const rnd = mulberry32(L.flat * 7919 + 71);
  const F = { L: L, t: 0, nextId: 1, bubbles: [], spawnAt: 0, cloudAt: 0, rnd: rnd, cfg: C,
    colors: L.colors, popTarget: ri(rnd, C.popMin, C.popMax), sawCloud: false, sawBig: false };
  for (let i = 0; i < F.popTarget; i++) {                 // 初始彩泡错峰铺屏（0.14-0.9，即刻可点）
    engSpawn(F, 'color', 0.14 + 0.76 * (i + 1) / (F.popTarget + 1));
  }
  for (let k = 0; k < C.cloudMax; k++) engSpawn(F, 'cloud', 0.12 + rnd() * 0.7);
  engEnsure(F);                                            // 目标色保底 ≥2
  return F;
}

/* 生成一只泡（x 含摆幅护栏收敛在场内；forceColor=保底补目标色时指定，rnd 消耗与随机路径一致；
   大泡仅章 4 概率出现且计数仍 1） */
function engSpawn(F, kind, y, forceColor) {
  const rnd = F.rnd, C = F.cfg;
  const big = kind === 'color' && rnd() < (C.bigP || 0);
  const wobA = rnd() * 0.022;
  let x = 0.1 + rnd() * 0.8;
  x = Math.min(0.92 - wobA, Math.max(0.08 + wobA, x));
  const rise = C.riseMin + rnd() * (C.riseMax - C.riseMin);   // 章 4 riseMin-riseMax 宽区间=混速
  const ci = Math.floor(rnd() * F.colors.length);             // 色抽签恒消耗（确定性不受 force 影响）
  const color = kind === 'color' ? (forceColor || F.colors[ci]) : null;
  const b = { id: F.nextId++, kind: kind, color: color, x: x, y: y == null ? -0.08 : y,
    v: 1 / rise, big: big, hue: color != null ? HUE_OF[color] : -1,
    wobA: wobA, wobP: rnd() * Math.PI * 2, wobF: 0.7 + rnd() * 1.1 };
  if (kind === 'cloud') { F.sawCloud = true; b.v = 1 / (rise * 1.25); }   // 云朵略慢更耐看
  if (big) F.sawBig = true;
  F.bubbles.push(b);
  return b;
}

/* ---------- 目标色保底（提交制核心不变量：场上目标色泡恒 ≥2——孩子随时点得到） ---------- */
function engTargetColor(F) {
  const L = F.L;
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  return q ? q.color : null;
}
function engEnsure(F) {
  const c = engTargetColor(F);
  if (!c) return;
  let n = 0;
  for (let i = 0; i < F.bubbles.length; i++) {
    const b = F.bubbles[i];
    if (b.kind === 'color' && b.color === c) n++;
  }
  let g = 0;
  while (n < 2 && g++ < 4) { engSpawn(F, 'color', -0.08, c); n++; }
}

/* ---------- 场推进（dt=模拟秒；UI 以 dt/SPEED 喂入 → verify 页 8.3 倍速）
   铁律：目标色彩泡恒 ≥2（跌破立即补）；飘出顶 y>1.1 自然移除不罚；respawn 秒级 ---------- */
function engFieldTick(F, dt) {
  F.t += dt;
  for (let i = F.bubbles.length - 1; i >= 0; i--) {
    const b = F.bubbles[i];
    b.y += b.v * dt;
    if (b.y > 1.1) F.bubbles.splice(i, 1);               // 飘出顶=自然消失不扣不罚
  }
  engEnsure(F);                                            // 目标色保底（换题换色后同样生效）
  let colors = 0;
  for (let i = 0; i < F.bubbles.length; i++) if (F.bubbles[i].kind === 'color') colors++;
  if (colors < F.popTarget && F.t >= F.spawnAt) {        // 常规补给：0.45-1.1s 一只（秒级 respawn）
    engSpawn(F, 'color', -0.08);
    F.spawnAt = F.t + 0.45 + F.rnd() * 0.65;
  }
  if (F.cfg.cloudMax > 0) {
    let clouds = 0;
    for (let i = 0; i < F.bubbles.length; i++) if (F.bubbles[i].kind === 'cloud') clouds++;
    if (clouds < F.cfg.cloudMax && F.t >= F.cloudAt) {
      engSpawn(F, 'cloud', -0.08);
      F.cloudAt = F.t + 0.9 + F.rnd() * 1.2;
    }
  }
}
const engLiveColors = F => F.bubbles.reduce((n, b) => n + (b.kind === 'color' ? 1 : 0), 0);
const engLiveTarget = F => {
  const c = engTargetColor(F);
  if (!c) return 0;
  return F.bubbles.reduce((n, b) => n + (b.kind === 'color' && b.color === c ? 1 : 0), 0);
};
/* 最早出场（y 最小=余量最足）的目标色彩泡（color 省略=任意彩泡）：教学指向/autoSolve 取泡共用 */
function engFirstColor(F, color) {
  let best = null;
  for (let i = 0; i < F.bubbles.length; i++) {
    const b = F.bubbles[i];
    if (b.kind === 'color' && (color == null || b.color === color) && (!best || b.y < best.y)) best = b;
  }
  return best;
}

/* ---------- 点泡引擎 v2（无 DOM）：engTapBubble(F, id) —— 点场上一只泡
   'pop' = 目标色彩泡点破（计数+1，无自动判定——提交制）；
   'nope' = 点非目标色彩泡（不破不计数不移除——探索，UI 抖动提示）；
   'cloud' = 点破灰云朵（不计数，cloudPops+1，探索≠错误）；
   null = 非法 id / 泡已不在场 / 关卡已结束 ---------- */
function engTapBubble(F, id) {
  const L = F.L;
  if (!L || L.done) return null;
  let idx = -1;
  for (let i = 0; i < F.bubbles.length; i++) if (F.bubbles[i].id === id) { idx = i; break; }
  if (idx < 0) return null;
  const b = F.bubbles[idx];
  const q = L.quizzes[L.step];
  if (!q) return null;
  if (b.kind === 'cloud') {
    F.bubbles.splice(idx, 1);
    L.totalPops++;
    L.cloudPops++;                                       // 只记 cloudPops 入星级折算（≥3 次=1 miss）
    return 'cloud';
  }
  if (b.color !== q.color) return 'nope';                // 非目标色：泡不破、计数不动
  F.bubbles.splice(idx, 1);
  L.totalPops++;
  q._cnt++;
  return 'pop';                                          // 点满不再自动判——孩子自己数自己提交
}

/* ---------- 提交引擎 v2：engSubmit(F) —— 点「好了」按钮的判定真值
   'right' = 计数==N 本题成（step 前进）；
   'done' = 末题提交成=通关；
   'wrong_more' = 计数>N：计数清零重数（UI 侧另重置泡场）+submitErr+1（真实错误路径）；
   'wrong_less' = 计数<N：不清空继续点（合法路径，不算 miss）；
   null = 关卡已结束 ---------- */
function engSubmit(F) {
  const L = F.L;
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q) return null;
  if (q._cnt > q.n) {
    L.submitErr++;
    q._cnt = 0;
    q.solved = false;
    return 'wrong_more';
  }
  if (q._cnt === q.n) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  return 'wrong_less';
}
const engWon = L => !!L && L.done;
/* miss = 多点提交错次 + 干扰云点破 ≥3 次折 1（承宽容口径）；星级 0=3★/1-2=2★/≥3=1★ */
const engMiss = L => (L.submitErr || 0) + ((L.cloudPops || 0) >= 3 ? 1 : 0);
const engStars = L => { const m = engMiss(L); return m === 0 ? 3 : (m <= 2 ? 2 : 1); };

/* ---------- 结构校验（verify 用）：题数 5 / n 落章区间 / color ∈ 关色板 / 相邻题 n 不同 / flat0 题0 恒 3 蓝 ---------- */
function structOk(q, dch, flat, qi, prevN, palette) {
  const C = CHAPTERS[dch];
  if (!q || q.n < C.nMin || q.n > C.nMax) return false;
  if (prevN != null && q.n === prevN) return false;
  if (flat === 0 && qi === 0 && !(q.n === 3 && q.color === 'blue')) return false;
  if (ALL_COLORS.indexOf(q.color) < 0) return false;
  if (palette.indexOf(q.color) < 0) return false;
  return true;
}
