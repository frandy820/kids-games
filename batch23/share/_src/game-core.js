/* ================= share 纯引擎：确定性关卡生成 + 两击制分糖状态机 + 均分自动判定 + r22 作答面（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-BATCH23 §0.53/§2 + SPEC-R22-SHARE r22 修订；进度章号单调递增、难度章号
   (ch-1)%4+1 循环）：dch1 平分 2 份（N∈{2,4,6,8,10}）/ dch2 平分 3 份（N∈{3,6,9,12}）
   / dch3 剩余题 **k∈{2,3,4}**（恰 2 题 POOL_REM4+3 题 POOL_REM，N%K≠0）
   / dch4 **比较+反推新作答面**（qi0 恒 cmp-who 热身；qi1-4 掷 cmp/rev 保底各 ≥1）。
   玩法铁律（§0.53）：两击制——点糖（提起/换选/放回）→点碗（飞入）；
   自动判定=每碗相等且糖分完 celebrate（无错误路径：不等/有剩=未完成继续）；
   剩余题分到每碗相等且托盘剩 <K → 引导态（点小盘收尾）；取回=点碗里的糖退回托盘，
   零惩罚但计 miss。r22（§R4）：cmp/rev 作答选错='wrong' 不换题可重选（即时层不惩罚），
   答错计 qMiss——星级口径=takebacks+qMiss 合计（分档边界不动，探索≠错延续）。 */
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
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 判定（§0.53 文字口径的单一真值，UI 与 verify 共用）
   'complete' 每碗相等且糖分完 / 'plate' 剩余题每碗相等且 0<托盘<K（引导态） / 'none' 未完成 */
function engJudge(q) {
  if (!q || q.solved) return 'none';
  if (q.mode && q.mode !== 'split') return 'none';   /* r22：cmp/rev 判定不适用（作答驱动） */
  const counts = q._bowlIds.map(a => a.length);
  const equal = counts.every(c => c === counts[0]);
  const tray = q.trayIds.length;
  if (equal && tray === 0) return 'complete';
  if (q.n % q.k !== 0 && equal && tray > 0 && tray < q.k) return 'plate';
  return 'none';
}

/* ---------- 单题生成：糖果 id 0..n-1（色款=id%4 稳定），kinds=碗位动物（seeded） ---------- */
function mkQuiz(n, k, kinds) {
  const ids = [];
  for (let i = 0; i < n; i++) ids.push(i);
  const bowls = [];
  for (let j = 0; j < k; j++) bowls.push([]);
  return { mode: 'split', n: n, k: k, kind: n % k === 0 ? 'even' : 'rem', kinds: kinds,
           trayIds: ids, _bowlIds: bowls, plateIds: [], _sel: null, _ready: false,
           miss: 0, solved: false };
}

/* ---------- r22 cmp 题构造（§R4/§R5）：dist=不均分布（池保证唯一最多），
   _bowlIds 按 dist 预填（静态展示，不可取回）；diff 题带 opts 数字钮候选 ---------- */
function mkCmpQuiz(dist, ask, kinds, opts) {
  const bowls = [];
  let n = 0, id = 0;
  for (let j = 0; j < dist.length; j++) {
    const b = [];
    for (let t = 0; t < dist[j]; t++) b.push(id++);
    bowls.push(b);
    n += dist[j];
  }
  return { mode: 'cmp', ask: ask, n: n, k: dist.length, kind: 'cmp', kinds: kinds,
           dist: dist.slice(), opts: opts || null, picked: -1, tries: 0,
           trayIds: [], _bowlIds: bowls, plateIds: [], _sel: null, _ready: false,
           miss: 0, solved: false };
}

/* ---------- r22 rev 题构造（§R4/§R5）：每碗恰 X 颗 × K 只（乘法前概念反推） ---------- */
function mkRevQuiz(x, k, kinds, opts) {
  const bowls = [];
  let id = 0;
  for (let j = 0; j < k; j++) {
    const b = [];
    for (let t = 0; t < x; t++) b.push(id++);
    bowls.push(b);
  }
  return { mode: 'rev', ask: null, n: x * k, k: k, kind: 'rev', kinds: kinds, x: x,
           dist: Array(k).fill(x), opts: opts, picked: -1, tries: 0,
           trayIds: [], _bowlIds: bowls, plateIds: [], _sel: null, _ready: false,
           miss: 0, solved: false };
}

/* ---------- r22 数字钮候选（§R3：确定性干扰池+seeded 呈现位洗牌，恰 4 钮含正确）
   diff 题：正确 d + [d-1,d+1,d+2,d-2,d+3]∩[1,5]≠d 去序取 3
   rev 题：正确 X·K + [X+K,P-1,P+1,X·(K-1),P+2]∩[1,12]≠P 去序取 3
   （X+K 固定优先位=「乘当加」典型前概念混淆） ---------- */
function diffOpts(d, rnd) {
  const cand = [d - 1, d + 1, d + 2, d - 2, d + 3].filter(v => v >= 1 && v <= 5 && v !== d);
  return shuffled([d].concat(cand.slice(0, 3)), rnd);
}
function revOpts(x, k, rnd) {
  const P = x * k, cand = [];
  [x + k, P - 1, P + 1, x * (k - 1), P + 2].forEach(v => {
    if (v >= 1 && v <= 12 && v !== P && cand.indexOf(v) < 0) cand.push(v);
  });
  return shuffled([P].concat(cand.slice(0, 3)), rnd);
}

/* ---------- r22 dch3 位表：恰 2 题 POOL_REM4（k4）+ 3 题 POOL_REM（k2/3），seeded 洗牌
   相邻 (n,k) 交换法兜底（池内对唯一+组间 k 不同 → 两两互异，交换为纯防御） ---------- */
function genDch3List(rnd) {
  const k4 = shuffled(POOL_REM4, rnd).slice(0, 2);
  const k23 = shuffled(POOL_REM, rnd).slice(0, 3);
  const list = shuffled(k4.concat(k23), rnd);
  for (let i = 1; i < list.length; i++) {
    if (list[i][0] === list[i - 1][0] && list[i][1] === list[i - 1][1]) {
      for (let j = i + 1; j < list.length; j++) {
        if (list[j][0] !== list[i - 1][0] || list[j][1] !== list[i - 1][1]) {
          const t = list[i]; list[i] = list[j]; list[j] = t; break;
        }
      }
    }
  }
  return list;
}

/* ---------- r22 dch4 作答面位表：qi0 恒 cmp-who 热身；qi1-4 掷硬币 cmp/rev，
   全同向翻转 qi2 保底各 ≥1；cmp 腿 ask 掷 who/diff，无 diff 时末道 cmp 改 diff
   （仅 1 题 cmp=qi0 时豁免——热身恒 who） ---------- */
function dch4Plan(rnd) {
  const plan = [{ t: 'cmp', ask: 'who' }];
  for (let i = 1; i < CH_LEN; i++) plan.push(rnd() < 0.5 ? { t: 'cmp', ask: null } : { t: 'rev', ask: null });
  const rest = plan.slice(1);
  if (!rest.some(p => p.t === 'rev')) plan[2] = { t: 'rev', ask: null };        // 全 cmp → 造一道 rev
  else if (!rest.some(p => p.t === 'cmp')) plan[2] = { t: 'cmp', ask: null };   // 全 rev → 造一道 cmp
  let diffSeen = false;
  for (let i = 1; i < plan.length; i++) {
    if (plan[i].t === 'cmp') {
      plan[i].ask = rnd() < 0.5 ? 'who' : 'diff';
      if (plan[i].ask === 'diff') diffSeen = true;
    }
  }
  if (!diffSeen) {
    for (let i = plan.length - 1; i >= 1; i--) {
      if (plan[i].t === 'cmp') { plan[i].ask = 'diff'; break; }
    }
  }
  return plan;
}

/* ---------- 单题参数采样（按章型；返回 {n,k}——r22 仅 dch1/2/兜底走此通道，
   dch3 主通道=genDch3List、dch4=dch4Plan；原 isRem/dch4 混合分支随章型退役） ---------- */
function sampleParams(dch, rnd) {
  if (dch === 1) return { n: POOL_D2[ri(rnd, 0, POOL_D2.length - 1)], k: 2 };
  if (dch === 2) return { n: POOL_D3[ri(rnd, 0, POOL_D3.length - 1)], k: 3 };
  const p = POOL_REM[ri(rnd, 0, POOL_REM.length - 1)];
  return { n: p[0], k: p[1] };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   flat0 题0 恒 n=2 k=2（§2 教学定版：演示分一颗+再分一颗=演示即完整一题，
   __shDemoR='right'——「一人分一颗」恰好是本题正解）；flat0 恒 dch1=纯 split
   （教学骨架不动）；分糖题相邻 (n,k) 不同、cmp/rev 题相邻签名不同（r22 §R5） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const quizzes = [];
  if (dch === 4) {                                    /* r22 ch4：比较+反推新作答面（§R2） */
    const plan = dch4Plan(rnd);
    let prev = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      const P4 = plan[qi];
      let q = null;
      for (let guard = 0; guard < 9 && !q; guard++) { /* 相邻签名不同（guard 8 次后兜底接受） */
        if (P4.t === 'cmp') {
          const pool = P4.ask === 'who' ? CMP_WHO : CMP_DIFF;
          const dist = pool[ri(rnd, 0, pool.length - 1)];
          const same = prev && prev.mode === 'cmp' && prev.ask === P4.ask &&
                       prev.dist.length === dist.length && prev.dist.every((v, i) => v === dist[i]);
          if (same && guard < 8) continue;
          const kinds = shuffled(ANIMAL_KEYS, rnd).slice(0, dist.length);
          q = P4.ask === 'diff'
            ? mkCmpQuiz(dist, 'diff', kinds, diffOpts(Math.max.apply(null, dist) - Math.min.apply(null, dist), rnd))
            : mkCmpQuiz(dist, 'who', kinds, null);
          prev = q;
        } else {
          const xk = REV_XK[ri(rnd, 0, REV_XK.length - 1)];
          const same = prev && prev.mode === 'rev' && prev.x === xk[0] && prev.k === xk[1];
          if (same && guard < 8) continue;
          const kinds = shuffled(ANIMAL_KEYS, rnd).slice(0, xk[1]);
          q = mkRevQuiz(xk[0], xk[1], kinds, revOpts(xk[0], xk[1], rnd));
          prev = q;
        }
      }
      quizzes.push(q);
    }
  } else {
    const list = dch === 3 ? genDch3List(rnd) : null;
    let last = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      let p = list ? { n: list[qi][0], k: list[qi][1] } : sampleParams(dch, rnd);
      let guard = 0;                                  // 相邻题 (n,k) 不同（换 n 即破全同）
      while (last && last.n === p.n && last.k === p.k && guard++ < 8) {
        p = list ? { n: list[qi][0], k: list[qi][1] } : sampleParams(dch, rnd);
      }
      if (flat === 0 && qi === 0) { p = { n: 2, k: 2 }; }   // 教学演示题钉 n=2 k=2
      const kinds = shuffled(ANIMAL_KEYS, rnd).slice(0, p.k);  // 碗位动物 seeded
      quizzes.push(mkQuiz(p.n, p.k, kinds));
      last = p;
    }
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, takebacks: 0, qMiss: 0, done: false };
}

/* ---------- 点糖引擎（两击制第一击）：engTapCandy(L, i) —— 点托盘第 i 颗糖
   'pick'  无选择 → 提起第 i 颗 / 'swap' 已有选择换选第 i 颗 / 'drop' 点已提起的糖=放回
   null 非法（越界/关已结束/本题已判） ---------- */
function engTapCandy(L, i) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q.mode && q.mode !== 'split') return null;    /* r22：cmp/rev 无分糖通道 */
  if (i == null || i < 0 || i >= q.trayIds.length) return null;
  if (q._sel === i) { q._sel = null; return 'drop'; }
  const r = q._sel == null ? 'pick' : 'swap';
  q._sel = i;
  return r;
}

/* ---------- 推进：判对收题（complete → step++ / done） ---------- */
function engAdvance(L, q) {
  q.solved = true;
  q._ready = false;
  L.step++;
  if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
  return 'right';
}

/* ---------- 点碗引擎（两击制第二击）：engTapBowl(L, j) —— 已提起的糖飞入碗 j
   'moved'  入碗未完成（继续分/取回） / 'plate' 入碗后达成引导态（等点小盘收尾）
   'right'  每碗相等且分完（本题成）/ 'done' 末题成=通关
   null 非法（未选糖点碗/越界/已结束）——未选糖点碗=无效是 SPEC 定版 ---------- */
function engTapBowl(L, j) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q.mode && q.mode !== 'split') return null;    /* r22：cmp/rev 无分糖通道（点动物=uiPickAnimal 入口） */
  if (j == null || j < 0 || j >= q.k) return null;
  if (q._sel == null) return null;
  const id = q.trayIds.splice(q._sel, 1)[0];
  q._bowlIds[j].push(id);
  q._sel = null;
  const jg = engJudge(q);
  if (jg === 'complete') return engAdvance(L, q);
  q._ready = (jg === 'plate');
  return q._ready ? 'plate' : 'moved';
}

/* ---------- 取回引擎：engTakeBack(L, j, idx) —— 点碗 j 里第 idx 颗糖退回托盘
   （idx 缺省=最后一颗）；返回取回后该碗糖数（0 也报），miss+1（探索取回零惩罚但计数）
   取回同时清空选择（托盘重排后选择索引失效）；若取回后恰好达成引导态，_ready 置真
   null 碗空/越界/非法 ---------- */
function engTakeBack(L, j, idx) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved) return null;
  if (q.mode && q.mode !== 'split') return null;    /* r22：cmp/rev 碗为静态展示禁取回 */
  if (j == null || j < 0 || j >= q.k) return null;
  if (q._bowlIds[j].length === 0) return null;
  if (idx == null) idx = q._bowlIds[j].length - 1;
  if (idx < 0 || idx >= q._bowlIds[j].length) return null;
  const id = q._bowlIds[j].splice(idx, 1)[0];
  q.trayIds.push(id);
  q._sel = null;
  q.miss++;
  L.takebacks++;
  q._ready = (engJudge(q) === 'plate');            // 取回也可能补成均衡（[3,2]→[2,2] 剩 1）
  return q._bowlIds[j].length;
}

/* ---------- 点小盘引擎（ch3 收尾）：engTapPlate(L) —— 引导态下托盘剩余全部入盘收题
   'right'/'done' / null 非引导态（整除题/未均衡/已结束） ---------- */
function engTapPlate(L) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || !q._ready) return null;
  if (q.mode && q.mode !== 'split') return null;    /* r22：cmp/rev 无引导态 */
  q.plateIds = q.trayIds.slice();
  q.trayIds = [];
  q._sel = null;
  return engAdvance(L, q);
}
const engWon = L => !!L && L.done;

/* ---------- r22 点动物作答（cmp-who，§R4）：唯一最多碗=正解（池保证 unique max）
   'right'/'done' 推进 / 'wrong' 不换题可重选（tries+miss+qMiss 计数）/ 'same' 不判不罚
   null 非法（非 who 态/越界/已结束） ---------- */
function engPickAnimal(L, j) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || q.mode !== 'cmp' || q.ask !== 'who') return null;
  if (j == null || j < 0 || j >= q.k) return null;
  if (q.picked === j) return 'same';
  q.picked = j;
  const mx = Math.max.apply(null, q.dist);
  if (q.dist[j] === mx) return engAdvance(L, q);
  q.tries++; q.miss++; L.qMiss++;
  return 'wrong';
}

/* ---------- r22 数字钮作答（cmp-diff/rev，§R4）：ans=diff 题为 max−min、rev 题为 x*k
   'right'/'done' / 'wrong'（不换题可重选）/ 'same' / null 非法（无 opts=who/split 态） ---------- */
function engPickNum(L, i) {
  if (!L || L.done) return null;
  const q = L.quizzes[L.step];
  if (!q || q.solved || !q.opts) return null;
  if (i == null || i < 0 || i >= q.opts.length) return null;
  if (q.picked === i) return 'same';
  q.picked = i;
  const ans = q.mode === 'rev' ? q.x * q.k
            : Math.max.apply(null, q.dist) - Math.min.apply(null, q.dist);
  if (q.opts[i] === ans) return engAdvance(L, q);
  q.tries++; q.miss++; L.qMiss++;
  return 'wrong';
}

/* ---------- 星级（SPEC-R22 §R4 r22 修订）：探索总成本=取回 takebacks+答错 qMiss，
   0=3★ / 1-2=2★ / ≥3=1★。永不 0 星。纯分糖关 qMiss 恒 0=与 r21 前行为一致 ---------- */
const engStars = L => !L ? 1 : ((L.takebacks || 0) + (L.qMiss || 0) === 0 ? 3 :
                 ((L.takebacks || 0) + (L.qMiss || 0) <= 2 ? 2 : 1));

/* ---------- 结构校验（verify 用，返回失败原因或 null；r22 扩 cmp/rev 分支 §R5）
   split：章池/整除性/剩余性/相邻不同/初始态干净（tray 全糖·碗空·无选择·未引导）/
   flat0 题0 恒 (2,2)；cmp/rev：mode/ask/池表/opts 4 钮含正确域内无重/唯一最值/
   相邻签名不同/碗=dist 预填·无托盘·未选未试。关级构成（dch3 恰 2 题 k4、dch4 保底
   各 ≥1+qi0=who）不在本函数——game-verify ① 聚合单元。prev=上一题本体（含 mode 等字段） ---------- */
function structWhy(q, dch, flat, qi, prev) {
  if (!q) return 'null';
  if (q.mode === 'cmp' || q.mode === 'rev') {
    if (flat === 0) return 'mode0';                        /* flat0=教学关恒 split */
    if (dch !== 4) return 'modeCh';                        /* cmp/rev 仅 dch4 */
    if (q.mode === 'cmp') {
      if (q.ask !== 'who' && q.ask !== 'diff') return 'ask';
      if (qi === 0 && q.ask !== 'who') return 'q0who';     /* qi0 恒 who 热身 */
      const pool = q.ask === 'who' ? CMP_WHO : CMP_DIFF;
      const hit = pool.some(e => e.length === q.dist.length && e.every((v, i) => v === q.dist[i]));
      if (!hit) return 'cmpPool';
      const mx = Math.max.apply(null, q.dist), mn = Math.min.apply(null, q.dist);
      if (q.dist.filter(v => v === mx).length !== 1) return 'cmpMax';   /* 唯一最多 */
      if (q.ask === 'diff') {
        const d = mx - mn;
        if (d < 1 || d > 3) return 'cmpD';
        if (q.dist.filter(v => v === mn).length !== 1) return 'cmpMin'; /* 唯一最少 */
        if (!q.opts || q.opts.length !== 4) return 'opts4';
        if (new Set(q.opts).size !== 4) return 'optsDup';
        if (q.opts.indexOf(d) < 0) return 'optsAns';
        if (q.opts.some(v => v < 1 || v > 5)) return 'optsDom';
      } else if (q.opts) return 'optsWho';                 /* who 题无数字钮 */
    } else {
      if (q.x !== 2 && q.x !== 3) return 'revX';
      if (q.k !== 2 && q.k !== 3 && q.k !== 4) return 'revK';
      if (q.n !== q.x * q.k) return 'revN';
      if (!q.opts || q.opts.length !== 4) return 'opts4';
      if (new Set(q.opts).size !== 4) return 'optsDup';
      if (q.opts.indexOf(q.n) < 0) return 'optsAns';
      if (q.opts.some(v => v < 1 || v > 12)) return 'optsDom';
    }
    if (q.kinds.length !== q.k) return 'kinds';
    for (let i = 0; i < q.kinds.length; i++) if (ANIMAL_KEYS.indexOf(q.kinds[i]) < 0) return 'kindsLib';
    if (new Set(q.kinds).size !== q.kinds.length) return 'kindsDup';
    if (prev) {
      if (q.mode === 'cmp' && prev.mode === 'cmp' && prev.ask === q.ask &&
          prev.dist.length === q.dist.length && prev.dist.every((v, i) => v === q.dist[i])) return 'adj';
      if (q.mode === 'rev' && prev.mode === 'rev' && prev.x === q.x && prev.k === q.k) return 'adj';
    }
    if (q._bowlIds.length !== q.k || q.dist.some((v, j) => q._bowlIds[j].length !== v)) return 'cmpBowls';
    if (q.trayIds.length !== 0 || q.plateIds.length !== 0) return 'cmpTray';
    if (q._sel !== null || q._ready || q.picked !== -1 || q.tries !== 0 || q.miss !== 0 || q.solved) return 'init';
    return null;
  }
  if (q.mode !== 'split') return 'mode';
  if (dch === 4) return 'modeCh4';                         /* r22 dch4 恒 cmp/rev */
  if (q.k !== 2 && q.k !== 3 && q.k !== 4) return 'k';
  if (q.kind !== (q.n % q.k === 0 ? 'even' : 'rem')) return 'kind';
  if (flat === 0 && qi === 0) return (q.n === 2 && q.k === 2) ? null : 'flat0q0';
  if (dch === 1) {
    if (q.k !== 2 || POOL_D2.indexOf(q.n) < 0) return 'pool1';
  } else if (dch === 2) {
    if (q.k !== 3 || POOL_D3.indexOf(q.n) < 0) return 'pool2';
  } else if (dch === 3) {
    const pool = q.k === 4 ? POOL_REM4 : POOL_REM;         /* r22：k4 剩余入 REM4 表 */
    if (pool.findIndex(p => p[0] === q.n && p[1] === q.k) < 0) return 'pool3';
  }
  if (q.kinds.length !== q.k) return 'kinds';
  for (let i = 0; i < q.kinds.length; i++) if (ANIMAL_KEYS.indexOf(q.kinds[i]) < 0) return 'kindsLib';
  if (new Set(q.kinds).size !== q.kinds.length) return 'kindsDup';
  if (prev && prev.mode === 'split' && prev.n === q.n && prev.k === q.k) return 'adj';
  if (q.trayIds.length !== q.n) return 'tray';
  for (let i = 0; i < q.n; i++) if (q.trayIds[i] !== i) return 'trayIds';
  if (q._bowlIds.length !== q.k || q._bowlIds.some(a => a.length !== 0)) return 'bowls';
  if (q.plateIds.length !== 0 || q._sel !== null || q._ready || q.miss !== 0 || q.solved) return 'init';
  return null;
}
