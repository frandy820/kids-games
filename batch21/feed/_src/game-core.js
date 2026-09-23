/* ================= feed 纯引擎：确定性关卡生成 + 碗计数状态机判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）
   章难度（r8 六章；进度章号单调递增、难度章号 (ch-1)%N_CH+1 循环）：
     dch1 pick 6-7 单堆 / dch2 pick 6-8 单堆 / dch3 pick 8-10 单堆 / dch4 pick 6-9 双堆选食 /
     dch5 left 剩题（n∈[7,10] 先取 → 吃 eaten∈[2,4] → 剩 rem=n-eaten∈[3,8] 点数后取物镜像作答）/
     dch6 combo 双食物合计订单（a,b∈[2,5]、合计∈[6,10]、三堆=两类目标+1 干扰）
   §0.46 判定真值（r8 承用）：提交判定 = 碗内各目标食物计数逐一 == 当前阶段需求
   （combo 逐类匹配=合计判定；点非目标堆不计入且轻反馈=探索≠错）；提交时机 = 「喂给小兔」
   按钮或点满自动判（需求满足时按钮亮起脉冲）；错 = 零惩罚，碗不清空，可点碗内取回
   （计数-1+数词倒读）。left 两阶段：阶段一取 n → 'eat'（兔兔吃掉 eaten 件、不清屏——
   剩 rem 件搬到餐垫，碗清空供作答）→ 阶段二问「还剩几根」chip 显 '?'，取 rem 件镜像作答。 */
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
/* 进度章号单调递增（与 keyOf/写档一致，杜绝生成关软锁）；难度章号六章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % N_CH + 1;

/* ---------- 当前阶段目标量（pick→n；left 阶段一→n、阶段二→rem；combo→a+b 合计）
   精确需求用 needOf（data 侧镜像）；本函数供 chip 数字/FD.target 观测 */
function phaseTarget(q) {
  if (q.kind === 'combo') return q.a + q.b;
  return q.kind === 'left' && q.phase === 2 ? q.rem : q.n;
}
/* left 问句阶段（chip 显 '?'、剩物上垫、点数支持开） */
const isAsk = q => q.kind === 'left' && q.phase === 2;
/* 就绪判定：碗内各目标食物计数逐一匹配当前需求（combo 合计判定=逐类严格匹配） */
function engReady(q) {
  const nd = needOf(q);
  return Object.keys(nd).every(f => (q._bowl[f] || 0) === nd[f]);
}

/* ---------- 单题生成（rnd 全程同流保证确定性；last=上一题签名，避免相邻题全同）
   flat0-qi0 特例 n=6/胡萝卜/pick：教学 watch 按 r8 固定"演示取 6 根→喂"（ch1 量域下限），
   首题钉 n=6 使演示路径恰好为正解（演示不得示范错误答案——countchick 演示全对先例） */
function genOne(dch, qi, rnd, last) {
  let kind = 'pick', food, n = 0, eaten = 0, foods = null, a = 0, b = 0;
  if (dch === 1) n = ri(rnd, 6, 7);
  else if (dch === 2) n = ri(rnd, 6, 8);
  else if (dch === 3) n = ri(rnd, 8, 10);
  else if (dch === 4) n = ri(rnd, 6, 9);
  else if (dch === 5) {                          // left 剩题：n∈[7,10]、eaten∈[2,4]、rem≥3
    kind = 'left';
    n = ri(rnd, 7, 10);
    eaten = ri(rnd, 2, Math.min(4, n - 3));
  } else {                                       // combo 合计订单：a,b∈[2,5]、合计∈[6,10]
    kind = 'combo';
    foods = shuffled(FOOD_KEYS.slice(), rnd).slice(0, 2);
    a = ri(rnd, 2, 5);
    b = ri(rnd, Math.max(2, 6 - a), Math.min(5, 10 - a));
  }
  food = kind === 'combo' ? foods[0] : FOOD_KEYS[Math.floor(rnd() * FOOD_KEYS.length)];
  /* 相邻题签名互异（食物+量+题型；combo 用食物对+合计） */
  const sig = kind + ':' + (kind === 'combo'
    ? foods[0] + foods[1] + '=' + (a + b)
    : food + '@' + n + (kind === 'left' ? '-' + eaten : ''));
  for (let t = 0; t < 8 && last === sig; t++) {
    food = FOOD_KEYS[Math.floor(rnd() * FOOD_KEYS.length)];
    if (kind === 'combo') {
      foods = shuffled(FOOD_KEYS.slice(), rnd).slice(0, 2);
      a = ri(rnd, 2, 5);
      b = ri(rnd, Math.max(2, 6 - a), Math.min(5, 10 - a));
      food = foods[0];
    } else if (kind === 'left') {
      n = ri(rnd, 7, 10);
      eaten = ri(rnd, 2, Math.min(4, n - 3));
    } else if (dch === 1) n = ri(rnd, 6, 7);
    else if (dch === 2) n = ri(rnd, 6, 8);
    else if (dch === 3) n = ri(rnd, 8, 10);
    else if (dch === 4) n = ri(rnd, 6, 9);
    last = kind + ':' + (kind === 'combo'
      ? foods[0] + foods[1] + '=' + (a + b)
      : food + '@' + n + (kind === 'left' ? '-' + eaten : ''));
  }
  /* 堆布置：dch1-3/5 单堆 / dch4 双堆（目标+1 干扰）/ dch6 三堆（两类目标+1 干扰） */
  let piles;
  if (dch === 4) piles = shuffled([food].concat([shuffled(FOOD_KEYS.filter(k => k !== food), rnd)[0]]), rnd);
  else if (dch === 6) piles = shuffled(foods.concat([FOOD_KEYS.find(k => k !== foods[0] && k !== foods[1])]), rnd);
  else piles = [food];
  const rem = n - eaten;
  const q = { kind: kind, food: food, n: n, eaten: eaten, rem: rem, piles: piles, phase: 1,
              _bowl: {}, _lc: 0, _miss: 0, _judged: false };
  if (kind === 'combo') { q.foods = foods; q.a = a; q.b = b; }
  else q._bowl[food] = 0;
  if (kind === 'combo') { q._bowl = {}; q._bowl[foods[0]] = 0; q._bowl[foods[1]] = 0; }
  return q;
}
/* flat0-qi0 判定（genLevel 传入；纯函数便于 verify 复算） */
function flat0Hot(dch, flat, qi) { return dch === 1 && flat === 0 && qi === 0; }

/* ---------- 关卡生成（静态 30 关与生成关同一确定性通道；生成关 flat≥30 按章号循环六章取材） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = diffOfCh(ch);                      // 生成关亦循环（确定性，禁随机章参数漂移）
  const quizzes = [];
  let last = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genOne(dch, qi, rnd, last);
    if (flat0Hot(dch, flat, qi)) {                // 教学演示题：n=6 胡萝卜（演示取 6 根=正解）
      q.kind = 'pick'; q.food = 'carrot'; q.n = 6; q.eaten = 0; q.rem = 6;
      q.piles = ['carrot']; q._bowl = { carrot: 0 };
    }
    last = q.kind + ':' + (q.kind === 'combo'
      ? q.foods[0] + q.foods[1] + '=' + (q.a + q.b)
      : q.food + '@' + q.n + (q.kind === 'left' ? '-' + q.eaten : ''));
    quizzes.push(q);
  }
  return { flat, ch, dch, lv, quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 取物引擎（无 DOM）：engTapFood(L, foodKey) —— 点食物堆取 1 件入碗
   返回新计数（该食物碗内 1..；==需求时 UI 起"按钮亮起+点满自动判"通道）
   'miss-food' 点非目标堆（不计入不算错——数错堆是探索，§0.46）
   null 非法/关已结束/本题已判 */
function engTapFood(L, food) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q._judged) return null;
  if (!(food in needOf(q))) return 'miss-food';
  q._bowl[food] = (q._bowl[food] || 0) + 1;
  return q._bowl[food];
}
/* ---------- 取回引擎：engTake(L, foodKey) —— 点碗内食物取回 1 件（自助修正通道）
   返回取回后计数（0 也报，UI 倒读数词含'零'）；null 碗内无该食物/非法 */
function engTake(L, food) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q._judged || !(q._bowl[food] > 0)) return null;
  q._bowl[food]--;
  return q._bowl[food];
}
/* ---------- 喂食推进引擎：engFeed(L) —— 需求满足时的推进提交
   （按钮点亮后点按、或点满自动判两通道共用；UI 保证只在就绪时调，引擎二次校验）
   'eat'  left 阶段一完成（兔兔吃掉 eaten 件：碗清空 phase 1→2，剩 rem 件上垫不清屏）
   'right' 各题最终判定对（本题完成推进）/ 'done' 最后一题答对（本关通关）
   null 未就绪 或已判 */
function engFeed(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q._judged || !engReady(q)) return null;
  if (q.kind === 'left' && q.phase === 1) {
    q.phase = 2;
    q._bowl = {};
    q._bowl[q.food] = 0;
    q._lc = 0;
    return 'eat';
  }
  q._judged = true;
  L.step++;
  if (L.step >= L.quizzes.length) L.done = true;
  return L.done ? 'done' : 'right';
}
/* ---------- 提交引擎：engSubmit(L) —— 点「喂给小兔」按钮
   就绪 → 走 engFeed 推进（点按钮判）；未就绪 → 'wrong'（提交时≠需求/多点后提交，
   miss+1 计 1 错——零惩罚：碗不清空由引擎状态天然保证（_bowl 不动），UI 不灰化不锁碗）
   null 非法/已判/已结束 */
function engSubmit(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q._judged) return null;
  if (engReady(q)) return engFeed(L);
  q._miss++;
  L.retries++;
  return 'wrong';
}
/* 点数剩物支持：engCount(L, i) —— left 问句阶段点第 i 件剩物（0 基）
   未点过的 → 亮圆点+返回已点数（1..rem）；点过/非问句阶段 → null（UI 轻反馈不重复计数） */
function engCount(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (q._judged || !isAsk(q) || !(i >= 0 && i < q.rem)) return null;
  if (q._lc > i) return null;                    // 该件已点过（_lc 单调=已点亮前缀件数）
  if (i !== q._lc) return null;                  // 只允许顺序点数（从第一件起）
  q._lc++;
  return q._lc;
}
const engWon = L => !!L && L.done;
/* 星级：一关全对（retries=0）=3 星；总错 ≤2=2 星；否则 1 星。永不 0 星（SPEC §1） */
const engStars = L => L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1);

/* ---------- 结构校验（verify 用）：返回具体失败原因便于审计，null=通过
   覆盖 r8 全部生成真值：章区间/题型独占/堆数/目标食物在堆/参数域/初始态干净 */
function structWhy(q, dch) {
  if (!q) return 'null';
  if (q.kind !== 'pick' && q.kind !== 'left' && q.kind !== 'combo') return 'kind';
  if (q.kind === 'pick') {
    if (!FOODS[q.food]) return 'food';
    if (q.phase !== 1) return 'pickPhase';
    if (q.eaten !== 0 || q.rem !== q.n) return 'pickRem';
    if (dch === 1 && (q.n < 6 || q.n > 7)) return 'nRange1';
    if (dch === 2 && (q.n < 6 || q.n > 8)) return 'nRange2';
    if (dch === 3 && (q.n < 8 || q.n > 10)) return 'nRange3';
    if (dch === 4 && (q.n < 6 || q.n > 9)) return 'nRange4';
    if (dch === 5 || dch === 6) return 'pickCh';  // pick 仅 dch1-4（r8 题型独占）
  } else if (q.kind === 'left') {
    if (!FOODS[q.food]) return 'food';
    if (dch !== 5) return 'leftCh';               // left 仅 dch5
    if (q.n < 7 || q.n > 10) return 'nRange5';
    if (q.eaten < 2 || q.eaten > 4) return 'eatenRange';
    if (q.rem !== q.n - q.eaten) return 'remCalc';
    if (q.rem < 3 || q.rem > 8) return 'remRange';
    if (q.phase !== 1) return 'leftPhase';
  } else {
    if (dch !== 6) return 'comboCh';              // combo 仅 dch6
    if (!Array.isArray(q.foods) || q.foods.length !== 2 ||
        !FOODS[q.foods[0]] || !FOODS[q.foods[1]] || q.foods[0] === q.foods[1]) return 'foods';
    if (q.food !== q.foods[0]) return 'foodHead';
    if (q.a < 2 || q.a > 5 || q.b < 2 || q.b > 5) return 'abRange';
    if (q.a + q.b < 6 || q.a + q.b > 10) return 'totalRange';
    if (q.phase !== 1) return 'comboPhase';
  }
  const want = dch === 4 ? 2 : (dch === 6 ? 3 : 1);
  if (q.piles.length !== want) return 'pileLen';
  const targets = q.kind === 'combo' ? q.foods : [q.food];
  if (!targets.every(f => q.piles.indexOf(f) >= 0)) return 'pileTarget';       // 目标食物必须在堆内
  if (q.piles.filter((v, i, a) => a.indexOf(v) === i).length !== q.piles.length) return 'pileDup';
  if (!q.piles.every(k => FOODS[k])) return 'pileLib';
  if (q.kind !== 'combo' && Object.keys(q._bowl).length !== 1) return 'bowlKeys';
  if (q.kind === 'combo' && Object.keys(q._bowl).length !== 2) return 'bowlKeys';
  if (!Object.keys(q._bowl).every(f => q._bowl[f] === 0)) return 'bowl';
  if (q._lc !== 0) return 'lc';
  if (q._miss !== 0) return 'miss';
  if (q._judged) return 'judged';
  return null;
}
