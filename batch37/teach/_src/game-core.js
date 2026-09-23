/* ================= teach 纯引擎：确定性关卡生成 + 三步小课判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 747)（本款常量 747，SPEC-BATCH37 §0.90 定版沿 r5）：
   同 flat 永远同关（重玩一致、verify 可检）。
   r5 逐题取数序（SPEC §6 r5 版本块定版——verify 用同式副本对账）：
   同关 RNG 题序连取（不逐题独立重播种子）：
     dch（仅生成关 flat≥20：dch=ri(rnd,1,4) 第一个随机数，先取数保确定性）
     → 每题 N=ri(rnd, dom[0], dom[1])（按 dch 章域）
     → 题 i>0 先取复现位 rep=rnd()<REP_P(0.45)：命中→etype=前题 etype（q.repeat=true，
       「又犯了同样的错」——教到会两轮跟踪出题侧；命中则不再消耗章池随机数）
       未命中→etype=章池 [floor(rnd()*pool)]（i=0 恒走章池）
     → errAt=ri(rnd, elo, ehi)（按型域：skip/dup [2,n-1]、swap [1,n-1]）
     → errAt2（干扰卡错参）：同型域排除 errAt 后 ri 取（域大小 ≥2 恒非空——n≥4 验算 ✓）
     → 4 卡 Fisher-Yates 洗牌（3 次 rnd）
   章型（SPEC §6 r5）：ch1 skip N[4,9] / ch2 dup+swap N[4,9] / ch3 全型 N[10,20] 群数
   / ch4 全型 N[6,20] 混出（域全档成立型——任意档 errAt 域恒非空，n≥4 下界验算 ✓）。
   错误类型（r5 序列=判定真值，孩子读过程非只看数量）：
     skip 漏数：seq=[1..n] 去 errAt（m=n-1）/ dup 重复：errAt 后再插一个（m=n+1）
     / swap 换序：errAt 与 errAt+1 交换（m=n——数量不变，只看数量必漏判=两读法分叉点）。
   卡生成 4 选（r5 生成化）：正确(真型真参) + 同型错参(errAt2) + 异型(skip↔dup、swap→dup，
   参数 errAt2) + 无错 none；唯一解锚=三干扰描述在 seq 上必为假（数学验算 ✓ SPEC §6）。
   quiz 结构：{ kind('teach' 恒), n(目标数 4-20；教学迷你关 4/5), etype('skip'|'dup'|'swap'),
     errAt(错误参数：skip/dup=涉及的数/swap=前一个数), seq[](兔子报数序列——fix 判定真值),
     m(=seq.length), repeat(复现前题同型), group(数数策略 1|2|5——UI 层 n≥10 可切),
     bowl(示范碗苹果数——show 进度), phase('show'|'rabbit'|'fix'|'end' 内部终态),
     cards[4](诊断卡 {good:boolean,label}——seeded 洗牌), _miss, _bowlDone }
   miss 口径（b34 坑①）：只在 fix 步选错计（show 数数自由探索+rabbit 纯演出零判定）；
   计数在本 core 判定层；UI 层豁免窗 guard 在判定前拦且预判口径（i !== answerOf(q)）
   与 core 判定严格同构。
   教到会两轮跟踪（r5 判定侧）：L.mhits={skip,dup,swap} 连续首选答对计数——
   engTapFix 错选→mhits[etype]=0（断连续）；首选对（q._miss===0 时答对）→mhits[etype]++；
   ≥2=掌握（persistWin 写档 sv.teach.hits 快照+mastered 派生）。
   演出相位语义（b33 坑①流程分步）：phase 显式 'show'|'rabbit'|'fix'；'end'=选对后的
   内部终态（step 已推进，下一题 presentQuiz 重建 'show'）。 */
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
/* 章 N 域 + 错误型池（SPEC §6 r5 章型封闭表）：
   dch1 skip{4,9} / dch2 dup+swap{4,9} / dch3 全型{10,20}（按群大数）/ dch4 全型{6,20} */
const NDOM = { 1: [4, 9], 2: [4, 9], 3: [10, 20], 4: [6, 20] };
const EPOOL = { 1: ['skip'], 2: ['dup', 'swap'], 3: ['skip', 'dup', 'swap'], 4: ['skip', 'dup', 'swap'] };
/* 错误参数域：skip/dup=漏掉/数两遍的数 ∈[2,n-1]（首尾不取——1 漏数=没开始、
   n 漏数=尾缺不可辨）；swap=颠倒对前一个数 ∈[1,n-1] */
const ERR_DOM = { skip: [2, -1], dup: [2, -1], swap: [1, -1] };
const errLo = t => ERR_DOM[t][0];
const errHi = (t, n) => n + ERR_DOM[t][1];
/* 异型映射（干扰卡 3）：skip→dup / dup→skip / swap→dup（参数同用 errAt2） */
const CROSS_TYPE = { skip: 'dup', dup: 'skip', swap: 'dup' };

/* 报数序列构造（r5 判定真值）：skip 去 errAt / dup 在 errAt 后插 errAt / swap 交换 */
function mkSeq(n, etype, errAt) {
  const s = [];
  for (let k = 1; k <= n; k++) {
    if (etype === 'skip' && k === errAt) continue;      // 漏数：跳过
    s.push(k);
    if (etype === 'dup' && k === errAt) s.push(k);      // 重复：数两遍
  }
  if (etype === 'swap') {                                // 换序：相邻两数颠倒
    const i = s.indexOf(errAt);
    s[i] = errAt + 1; s[i + 1] = errAt;
  }
  return s;
}

/* 行 → quiz 组装（4 卡 seeded 洗牌：正确+同型错参+异型+无错——恰一张 good；
   good 由卡描述与 seq 的真假推导，answerOf=findIndex——verify 独立推导同构。
   rnd=null（教学迷你关）时卡序固定不洗牌；errAt2 必传合法域值（教学关显式给） */
function mkQuiz(n, etype, errAt, rnd, errAt2, repeat) {
  const seq = mkSeq(n, etype, errAt);
  const cards = [
    { kind: etype,          x: errAt,  good: true },
    { kind: etype,          x: errAt2, good: false },   // 同型近义干扰（错参）
    { kind: CROSS_TYPE[etype], x: errAt2, good: false },// 异型干扰（视觉匹配失效）
    { kind: 'none',         x: 0,      good: false }    // 无错干扰（换序题最迷惑）
  ].map(c => ({ good: c.good, label: cardLabel(c.kind, c.x), kind: c.kind, x: c.x }));
  if (rnd) {                                            // Fisher-Yates 洗牌（3 次 rnd）
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = cards[i]; cards[i] = cards[j]; cards[j] = t;
    }
  }
  return { kind: 'teach', n: n, etype: etype, errAt: errAt,
           repeat: !!repeat,                            /* 复现前题同型（教到会出题侧） */
           seq: seq, m: seq.length, group: 1, phase: 'show', bowl: 0,
           cards: cards, _miss: 0, _bowlDone: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道）
   flat0-19：dch=章号；flat≥20：dch=ri(rnd,1,4)（第一个随机数先取数保确定性）。
   逐题连取（SPEC §6 r5 取数序，verify 同式副本对账）。 ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 747);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const dom = NDOM[dch], pool = EPOOL[dch];
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const n = ri(rnd, dom[0], dom[1]);              // 先取 N（按 dch 章域）
    let etype, repeat = false;
    if (qi > 0 && rnd() < REP_P) {                  // 复现位：同型复现（不消耗章池随机数）
      etype = quizzes[qi - 1].etype; repeat = true;
    } else {
      etype = pool[Math.floor(rnd() * pool.length)];
    }
    const eAt = ri(rnd, errLo(etype), errHi(etype, n));      // 错误参数
    const eAlt = ri2Excl(rnd, errLo(etype), errHi(etype, n), eAt);   // 干扰错参（域内排除）
    quizzes.push(mkQuiz(n, etype, eAt, rnd, eAlt, repeat));
  }
  const L = { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, retries: 0, done: false };
  L.mhits = { skip: 0, dup: 0, swap: 0 };           /* r5 教到会：连续首选答对计数 */
  return L;
}
/* [lo,hi] 闭区间排除 excl 取一个（域大小 ≥2 恒非空——n≥4 验算：skip/dup 域 [2,n-1]
   在 n=4 为 {2,3}、swap 域 [1,n-1] 在 n=4 为 {1,2,3}，排除后均非空） */
function ri2Excl(rnd, lo, hi, excl) {
  const span = hi - lo + 1;
  const k = Math.floor(rnd() * (span - 1));
  return lo + k + (k >= excl - lo ? 1 : 0);
}

/* ---------- 好卡下标（唯一解锚：4 卡恰一张 good——正确卡描述真、三干扰描述在 seq 上
   必为假（SPEC §6 验算）；verify 独立推导同式） ---------- */
const answerOf = q => q.cards.findIndex(c => c.good);

/* ---------- 三步小课引擎（无 DOM）
   engTapApple(L,i,trayCount) 示范步点托盘苹果 i（逐个模式托盘 N+2 颗；i 仅视觉锚，
   判定只看碗计数；组块模式=UI 层循环调本函数 k 次）：
     入碗 'in'（bowl+1）；第 N 颗点满自动确认 'confirmed'（bowl=n，phase→'rabbit'）；
     碗满后再点 false（防御——碗满即转 rabbit，phase 门先拦）；null=关已结束/非 show
     相位（含 rabbit/fix 演出期——UI 层吞输入 bump false 语义在此之上）/非法下标。
   engResetBowl(L) r5 切策略重置本题碗（bowl=0 重数——不罚；仅 show 相位有效）。
   engRabbitDone(L) 兔子步演出结束（纯演出零判定）：rabbit→'fix'（纠错卡入场前调用）。
   engTapFix(L,i) 纠错步点卡 i（0-3）：对（i===answerOf）→ phase 'end'+step++，末题
     'done'（L.done）/否则 'right'；**mhits 更新（r5 教到会）**：对且 q._miss===0（首选
     答对）→ L.mhits[etype]++；错 → 'wrong'（miss+1——只在 fix 步计）且
     L.mhits[etype]=0（断连续）；null=非 fix 相位/非法下标。 ---------- */
function engTapApple(L, i, trayCount) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.phase !== 'show') return null;
  if (!Number.isInteger(i) || i < 0 || i >= trayCount) return null;
  if (q.bowl >= q.n) return false;                  /* 防御（碗满即转 rabbit，常态不可达） */
  q.bowl++;
  if (q.bowl >= q.n) { q._bowlDone = true; q.phase = 'rabbit'; return 'confirmed'; }
  return 'in';
}
function engResetBowl(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.phase !== 'show') return false;
  q.bowl = 0;
  q._bowlDone = false;
  return true;
}
function engRabbitDone(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.phase !== 'rabbit') return false;
  q.phase = 'fix';
  return true;
}
function engTapFix(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q.phase !== 'fix') return null;
  if (!Number.isInteger(i) || i < 0 || i > 3) return null;
  if (i === answerOf(q)) {
    if (q._miss === 0) L.mhits[q.etype]++;          /* 首选答对→连续计数+1（r5 教到会） */
    q.phase = 'end';
    L.step++;                                       /* 题完成同步推进（下一题 presentQuiz 重建 show） */
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++;                                        /* miss 计数在 core 判定层（b34 坑①） */
  L.retries++;
  L.mhits[q.etype] = 0;                             /* 答错断连续（r5 两轮跟踪口径） */
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（miss 口径：fix 步选错累计 L.retries）：0 错 3★ / 1-2 错 2★ / ≥3 错 1★，永不 0★ */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));

/* ---------- TTS 文案（契约 L/T：estMs 按全字符含标点）
   任务句（题面 say 非队列链——契约 N 不适用 keyless 队列段）：骨架
   「教小兔子数N个苹果」（N=NUMCN 2-20——r5 全量 19 值；9-11 字动态窗按 estMs 取大）；
   兔子句（rabbit 演出内 say）：8 字含冒号「兔子说：我来试试」estMs 3360；
   组末计数（r5 按群反馈 say 非阻塞）：「四个/九个/…」（NUMCN[累计]+'个'）。 ---------- */
function taskTTS(q) {
  return '教小兔子数' + NUMCN[q.n] + '个苹果';
}
const rabbitTTS = '兔子说：我来试试';
const groupTTS = cum => NUMCN[cum] + '个';
/* T46 化（2026-09-19）：任务句/组末计数/策略 label/引导句/兔子句全句 clip——零 keyless
   （gen 侧按同文本注册：tch_task_N 19 / tch_n_N 19 / tch_gm_{1,2,5} / tch_ghint / tch_rabbit） */
const taskClipOf = q => 'tch_task_' + q.n;
const groupClipOf = cum => 'tch_n_' + cum;
const gmClipOf = g => 'tch_gm_' + g;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：先验不变量逐条
   （N 域按 dch 章域/etype 按章池/errAt 按型域/seq 构造同构/m=seq.length 按型
   n∓1|n/4 卡恰一张 good/answer 推导同构/cards label 双录/干扰假性——errAt2≠errAt/
   初始相位 show·bowl 0·miss 0）。 ---------- */
function structPrior(q, dch) {
  if (!q || q.kind !== 'teach') return 'kind';
  const dom = NDOM[dch];
  if (!Number.isInteger(q.n) || q.n < dom[0] || q.n > dom[1]) return 'nDom';
  if (EPOOL[dch].indexOf(q.etype) < 0) return 'etypeDom';
  if (!Number.isInteger(q.errAt) || q.errAt < errLo(q.etype) || q.errAt > errHi(q.etype, q.n)) return 'errDom';
  const seqE = mkSeq(q.n, q.etype, q.errAt);
  if (JSON.stringify(q.seq) !== JSON.stringify(seqE)) return 'seqCalc';
  if (q.m !== q.seq.length) return 'mCalc';
  if (q.etype === 'skip' && q.m !== q.n - 1) return 'mSkip';
  if (q.etype === 'dup' && q.m !== q.n + 1) return 'mDup';
  if (q.etype === 'swap' && q.m !== q.n) return 'mSwap';
  if (!Array.isArray(q.cards) || q.cards.length !== 4) return 'cardsLen';
  if (q.cards.filter(c => c.good).length !== 1) return 'cardsGood';
  const aI = q.cards.findIndex(c => c.good);
  if (aI < 0 || aI > 3) return 'answerMap';
  if (q.cards[aI].label !== cardLabel(q.etype, q.errAt)) return 'cardsLabel';   // 好卡=真型真参
  if (!q.cards.some(c => !c.good && c.label === '它数对啦')) return 'cardsNone'; // 无错干扰恒在场
  if (new Set(q.cards.map(c => c.label)).size !== 4) return 'cardsDup';         // 4 卡 label 互异
  if (q.phase !== 'show' || q.bowl !== 0 || q._miss !== 0 || q._bowlDone) return 'init';
  if (q.group !== 1) return 'initGroup';
  return null;
}
