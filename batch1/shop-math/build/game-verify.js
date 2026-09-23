/* ================= ?verify=1 自检（仅 verify 分支加载执行；r6 补建——b1 老结构原无独立 verify 文件）
   ① 关卡全量审计（静态 20 + 生成 20-29）：确定性/结构/数域/总价重算/预算构造独立枚举
     （多解 ≥2 + 买不起组合 ≥1——构造保证，非注释声称）/按群阈值/干扰在场
   ② 状态机单元：count(ok/hint/notwant) / sum(ok→付钱 less·more·ok) / budget(need/cheap/ok→找零 less·more·ok)
     篮子保留、零惩罚（星级 ≥1）、错误计数
   ③ 按群单元：n≥10 策略条在场 / n<10 不在场 / 分组点亮 / 组末报数 play shop_cn 键（T46）/ 切换策略重渲染
   ④ 硬币引擎：非 paying 拒绝 / 加减硬币与合计不变式 / 超量上限拒绝
   ⑤ 语音链独立重列：roundChain/changeAskChain 与 SPEC 副本全等 + 全部 SPEC keys 已注入 clips
   ⑥ SPEC_DUR：新 clip 浏览器实长（new Audio onloadedmetadata，Promise.all+8000ms 超时）±60ms
   ⑦ estMs 家族定版断言（n*345+600，禁 +300 变体）+ SAY_PAD
   ⑧ 时序分账：每关模型净时长 ≥40000ms（1-0 教学关豁免）+ 互动占比 ≥0.55
   ⑨ 布局：双 viewport ×（count 按群/sum 付钱/budget 找零）——货架 ≥96、硬币/完成/策略条 ≥72、
     paying 态结账让位、预算条在场且不与气泡/门重叠、价签显隐随模式、overflowX ≤0（bbox 实测定案）
   结果写 #verify-result + document.title='VERIFY PASS n/n' / 'VERIFY FAIL' */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;
  const okUnit = (name, ok, detail) => { total++; if (ok) npass++; units[name] = { ok, detail }; };

  /* ---- SPEC r6 独立重列（真值源=README「SPEC r6」块；禁引用引擎常量互证） ---- */
  const SPEC_P = { apple: 2, banana: 3, pear: 5, orange: 7 };   // 价格表
  const SPEC_COINS = [1, 2, 5];                                  // 硬币面额
  const SPEC_GROUP_AT = 10;                                      // 按群阈值
  const SPEC_BUDGET_SET = ['2,8', '2,10', '3,12', '3,14'];       // (want,B) 封闭集
  const SPEC_T = { TAP: 2000, SEL: 2500, COIN: 3500, COMPUTE: 3000, // 时序模型（5.5 岁实测人设：每步 2-5s 下限）
                   LISTEN_PAD: 2000, CHG_PAD: 1000, CONFIRM: 2500,
                   ENTER: 3000, ROUND_T: 3000, GAP: 150, CHANGE_COINS: 1, MIN_MS: 40000, SHARE: 0.55 };
  const SPEC_TEXTS = {
    shop_want: '我要', shop_and: '和', shop_recount: '再数一数呀',
    shop_ask_total: '一共几元呀，点点硬币付钱吧', shop_total_all: '一共',
    shop_group_hint: '大数字来啦，可以两个两个数，也可以五个五个数哦',
    shop_have: '我有', shop_buy2: '，想买两样', shop_buy3: '，想买三样',
    shop_paid: '付了', shop_chg_q2: '，买了两样，找他几元呀', shop_chg_q3: '，买了三样，找他几元呀',
    shop_need2: '他想买两样哦', shop_need3: '他想买三样哦',
    shop_cheap: '钱不够哦，换一样试试', shop_notwant: '这个不是它想要的哦',
    shop_pay_less: '还差一点点，再放一枚', shop_pay_more: '付多了，拿回去一枚',
    shop_chg_less: '少找了，再给他一枚', shop_chg_more: '多找了，拿回去一枚'
  };
  /* SPEC_DUR：新 clip 浏览器实测时长真值表（ms；probe 后回填，±60ms 断言） */
  const SPEC_DUR = {
    'shop_want': 1344, 'shop_and': 1176, 'shop_name_apple': 1440, 'shop_name_banana': 1416, 'shop_name_pear': 1104, 'shop_name_orange': 1368, 'shop_n_6': 1416, 'shop_n_7': 1416, 'shop_n_8': 1392, 'shop_n_9': 1344, 'shop_n_10': 1464, 'shop_n_11': 1584, 'shop_n_12': 1584, 'shop_n_13': 1656, 'shop_n_14': 1680, 'shop_n_15': 1584, 'shop_n_16': 1656, 'shop_n_17': 1632, 'shop_n_18': 1632, 'shop_n_19': 1632, 'shop_n_20': 1512, 'shop_ask_total': 3432, 'shop_total_all': 1320, 'shop_group_hint': 4968, 'shop_have': 1344, 'shop_buy2': 1824, 'shop_buy3': 1824, 'shop_paid': 1320, 'shop_chg_q2': 2904, 'shop_chg_q3': 2880, 'shop_need2': 2064, 'shop_need3': 2088, 'shop_cheap': 2928, 'shop_notwant': 2352, 'shop_pay_less': 2904, 'shop_pay_more': 2688, 'shop_chg_less': 2760, 'shop_chg_more': 2592, 'shop_g_apple_6': 1728, 'shop_g_apple_7': 1704, 'shop_g_apple_8': 1704, 'shop_g_apple_9': 1728, 'shop_g_apple_10': 1776, 'shop_g_apple_11': 1944, 'shop_g_apple_12': 1872, 'shop_g_apple_13': 1992, 'shop_g_apple_14': 1968, 'shop_g_apple_15': 1920, 'shop_g_apple_16': 1968, 'shop_g_apple_17': 1992, 'shop_g_apple_18': 1944, 'shop_g_apple_19': 1968, 'shop_g_apple_20': 1872, 'shop_g_banana_6': 1776, 'shop_g_banana_7': 1776, 'shop_g_banana_8': 1776, 'shop_g_banana_9': 1776, 'shop_g_banana_10': 1872, 'shop_g_banana_11': 1992, 'shop_g_banana_12': 1968, 'shop_g_banana_13': 2064, 'shop_g_banana_14': 2064, 'shop_g_banana_15': 1992, 'shop_g_banana_16': 2064, 'shop_g_banana_17': 2064, 'shop_g_banana_18': 2016, 'shop_g_banana_19': 2064, 'shop_g_banana_20': 1968, 'shop_g_pear_6': 1440, 'shop_g_pear_7': 1512, 'shop_g_pear_8': 1464, 'shop_g_pear_9': 1488, 'shop_g_pear_10': 1560, 'shop_g_pear_11': 1776, 'shop_g_pear_12': 1656, 'shop_g_pear_13': 1776, 'shop_g_pear_14': 1800, 'shop_g_pear_15': 1680, 'shop_g_pear_16': 1728, 'shop_g_pear_17': 1800, 'shop_g_pear_18': 1728, 'shop_g_pear_19': 1728, 'shop_g_pear_20': 1680, 'shop_g_orange_6': 1656, 'shop_g_orange_7': 1680, 'shop_g_orange_8': 1656, 'shop_g_orange_9': 1704, 'shop_g_orange_10': 1752, 'shop_g_orange_11': 1872, 'shop_g_orange_12': 1848, 'shop_g_orange_13': 1968, 'shop_g_orange_14': 1944, 'shop_g_orange_15': 1872, 'shop_g_orange_16': 1920, 'shop_g_orange_17': 1944, 'shop_g_orange_18': 1920, 'shop_g_orange_19': 1944, 'shop_g_orange_20': 1848
  };
  /* r6 全量 clip key 集（98）：订单链/找零链/反馈锚/数词——probe 与 ±60 断言共用 */
  const R6_KEYS = ['shop_want', 'shop_and'].concat(
    ['apple', 'banana', 'pear', 'orange'].map(k => 'shop_name_' + k),
    Array.from({ length: 15 }, (_, i) => 'shop_n_' + (i + 6)),
    ['ask_total', 'total_all', 'group_hint', 'have', 'buy2', 'buy3', 'paid',
     'chg_q2', 'chg_q3', 'need2', 'need3', 'cheap', 'notwant',
     'pay_less', 'pay_more', 'chg_less', 'chg_more'].map(s => 'shop_' + s),
    ['apple', 'banana', 'pear', 'orange'].reduce((a, k) =>
      a.concat(Array.from({ length: 15 }, (_, i) => 'shop_g_' + k + '_' + (i + 6))), []));

  /* 静态 20 关表（README SPEC r6 封闭表文字重列） */
  const SPEC_LEVELS = [
    { rounds: [{ m: 'count', k: 'apple', n: 1 }] },
    { rounds: [{ m: 'count', k: 'banana', n: 6 }, { m: 'count', k: 'apple', n: 7 }] },
    { rounds: [{ m: 'count', k: 'pear', n: 8 }, { m: 'count', k: 'apple', n: 10 }] },
    { rounds: [{ m: 'count', k: 'orange', n: 9 }, { m: 'count', k: 'banana', n: 10 }] },
    { rounds: [{ m: 'count', k: 'pear', n: 10 }, { m: 'count', k: 'orange', n: 6 }] },
    { rounds: [{ m: 'sum', ks: ['apple', 'banana'] }, { m: 'sum', ks: ['pear', 'orange'] }] },
    { rounds: [{ m: 'sum', ks: ['banana', 'pear'] }, { m: 'sum', ks: ['apple', 'banana', 'orange'] }] },
    { rounds: [{ m: 'sum', ks: ['apple', 'orange'] }, { m: 'sum', ks: ['banana', 'orange'] }] },
    { rounds: [{ m: 'sum', ks: ['apple', 'banana', 'pear'] }, { m: 'sum', ks: ['apple', 'pear'] }] },
    { rounds: [{ m: 'sum', ks: ['apple', 'pear', 'orange'] }, { m: 'sum', ks: ['banana', 'pear', 'orange'] }] },
    { rounds: [{ m: 'budget', want: 2, B: 8 }, { m: 'budget', want: 2, B: 10 }] },
    { rounds: [{ m: 'budget', want: 3, B: 12 }, { m: 'budget', want: 2, B: 8 }] },
    { rounds: [{ m: 'budget', want: 3, B: 14 }, { m: 'budget', want: 3, B: 12 }] },
    { rounds: [{ m: 'budget', want: 2, B: 10 }, { m: 'budget', want: 3, B: 14 }] },
    { rounds: [{ m: 'budget', want: 2, B: 8 }, { m: 'budget', want: 3, B: 12 }] },
    { rounds: [{ m: 'count', k: 'orange', n: 12 }, { m: 'budget', want: 2, B: 10 }] },
    { rounds: [{ m: 'sum', ks: ['apple', 'banana', 'pear'] }, { m: 'count', k: 'banana', n: 11 }] },
    { rounds: [{ m: 'budget', want: 3, B: 12 }, { m: 'sum', ks: ['pear', 'orange'] }] },
    { rounds: [{ m: 'count', k: 'apple', n: 14 }, { m: 'budget', want: 2, B: 8 }] },
    { rounds: [{ m: 'sum', ks: ['banana', 'pear', 'orange'] }, { m: 'count', k: 'pear', n: 13 }] }
  ];
  const D = k => SPEC_DUR[k] || 0;
  function minCoinsV(t) { let c = 0; for (const d of [5, 2, 1]) while (t >= d) { t -= d; c++; } return c; }
  /* 预算组合枚举（可重复选同款）：返回 {sols:[Σ≤B], overs:[Σ>B]}——构造保证独立判 */
  function combosV(want) {
    const ps = Object.values(SPEC_P).sort((a, b) => a - b), out = [];
    (function rec(start, left, acc) {
      if (left === 0) { out.push(acc.slice()); return; }
      for (let i = start; i < ps.length; i++) { acc.push(ps[i]); rec(i, left - 1, acc); acc.pop(); }
    })(0, want, []);
    return out;
  }
  function budgetSplitV(want, B) {
    const sols = [], overs = [];
    combosV(want).forEach(c => { const s = c.reduce((a, b) => a + b, 0); (s <= B ? sols : overs).push(s); });
    return { sols, overs };
  }
  /* 期望语音链（独立重列，不调用引擎 roundChain） */
  function expChainV(r) {
    if (r.m === 'count') {
      const ks = ['shop_want', 'shop_g_' + r.k + '_' + r.n];
      if (r.n >= SPEC_GROUP_AT) ks.push('shop_group_hint');
      return ks;
    }
    if (r.m === 'sum') {
      const ks = ['shop_want'];
      r.ks.forEach((k, i) => { if (i) ks.push('shop_and'); ks.push('shop_name_' + k); });
      ks.push('shop_ask_total');
      return ks;
    }
    return ['shop_have', 'shop_n_' + r.B, r.want === 2 ? 'shop_buy2' : 'shop_buy3'];
  }

  /* ---- ① 关卡全量审计（静态 20 + 生成 20-29） ---- */
  const audit = { levels: {}, gen: {} };
  let auditOk = true;
  for (let i = 0; i < 30; i++) {
    const L1 = getOrder(i), L2 = getOrder(i);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let roundOk = true, notes = [];
    if (i < 20 && L1.rounds.length !== (i === 0 ? 1 : 2)) { roundOk = false; notes.push('rounds=' + L1.rounds.length); }
    if (i >= 20 && L1.rounds.length !== 2) { roundOk = false; notes.push('gen rounds=' + L1.rounds.length); }
    if (i < 20) { /* 静态关与 SPEC 表逐一全等（who 不在 SPEC 契约内，参数域才是） */
      const exp = SPEC_LEVELS[i].rounds;
      if (exp.length !== L1.rounds.length) roundOk = false;
      else exp.forEach((er, ri) => {
        const ar = L1.rounds[ri];
        if (er.m !== ar.m) { roundOk = false; notes.push('L' + i + 'r' + ri + ' m'); return; }
        if (er.m === 'count' && (er.k !== ar.k || er.n !== ar.n || ar.grouped !== ar.n >= SPEC_GROUP_AT)) { roundOk = false; notes.push('L' + i + 'r' + ri + ' count'); }
        if (er.m === 'sum') {
          const tot = er.ks.reduce((s, k) => s + SPEC_P[k], 0);
          if (JSON.stringify(er.ks) !== JSON.stringify(ar.ks) || ar.total !== tot) { roundOk = false; notes.push('L' + i + 'r' + ri + ' sum'); }
        }
        if (er.m === 'budget' && (er.want !== ar.want || er.B !== ar.B)) { roundOk = false; notes.push('L' + i + 'r' + ri + ' budget'); }
      });
    }
    L1.rounds.forEach((r, ri) => {
      if (r.m === 'count') {
        const dom = i < 20 ? (i < 5 ? [1, 10] : (i < 15 ? [6, 10] : [11, 14])) : [6, 14];
        if (!(SPEC_P[r.k] != null)) { roundOk = false; notes.push('r' + ri + ' bad good'); }
        if (i > 0 && (r.n < dom[0] || r.n > dom[1])) { roundOk = false; notes.push('r' + ri + ' n=' + r.n + ' dom=' + dom); }
        if (r.grouped !== (r.n >= SPEC_GROUP_AT)) { roundOk = false; notes.push('r' + ri + ' grouped'); }
      } else if (r.m === 'sum') {
        if (!(r.ks.length === 2 || r.ks.length === 3) || new Set(r.ks).size !== r.ks.length) { roundOk = false; notes.push('r' + ri + ' ks'); }
        const tot = r.ks.reduce((s, k) => s + (SPEC_P[k] || 0), 0);
        if (r.total !== tot || tot < 5 || tot > 15) { roundOk = false; notes.push('r' + ri + ' total=' + r.total + '/' + tot); }
        if (!Object.keys(SPEC_P).some(g => r.ks.indexOf(g) < 0)) { roundOk = false; notes.push('r' + ri + ' no distractor'); }
      } else {
        if (SPEC_BUDGET_SET.indexOf(r.want + ',' + r.B) < 0) { roundOk = false; notes.push('r' + ri + ' B set'); }
        const sp = budgetSplitV(r.want, r.B);
        if (sp.sols.length < 2) { roundOk = false; notes.push('r' + ri + ' sols=' + sp.sols.length); }
        if (sp.overs.length < 1) { roundOk = false; notes.push('r' + ri + ' no overspend'); }
      }
    });
    const rec = { ok: det && roundOk, det: det, notes: notes };
    if (i < 20) audit.levels[keyOf(i)] = rec; else audit.gen[i] = rec;
    if (!rec.ok) auditOk = false;
  }
  okUnit('audit', auditOk, { bad: Object.keys(audit.levels).filter(k => !audit.levels[k].ok).concat(Object.keys(audit.gen).filter(k => !audit.gen[k].ok)) });

  /* ---- 预算构造独立判（四组封闭集全枚举：多解 ≥2 + 买不起 ≥1 + 全部解找零 ≥0） ---- */
  const btab = {};
  let bok = true;
  SPEC_BUDGET_SET.forEach(s => {
    const [w, B] = s.split(',').map(Number);
    const sp = budgetSplitV(w, B);
    btab[s] = { sols: sp.sols.length, overs: sp.overs.length };
    if (sp.sols.length < 2 || sp.overs.length < 1) bok = false;
  });
  okUnit('budgetConstruct', bok, btab);

  /* ---- 驱动器：直接进入某关某轮 shopping 态（不动画、不播声） ---- */
  function loadLevelDirect(i, r) {
    cur = getOrder(i); S.round = r; curR = cur.rounds[r];
    S.basket = {}; S.coins = []; S.errors = 0; S.helped = false; S.payPhase = null;
    S.selTotal = 0; S.strategy = 1; S.state = 'shopping';
    endPaying(); renderModeUI(); renderBasket(); renderBubble();
    bubble.classList.add('show');
  }
  const addN = (k, n) => { for (let i = 0; i < n; i++) addItem(k); };

  /* ---- ② 状态机单元：count（1-1 r0 = banana×6） ---- */
  {
    loadLevelDirect(1, 0);
    addN('banana', 6);
    const okPath = checkout() === 'ok' && S.state === 'paying';   /* 2 轮关：round ok → 过渡态 */
    loadLevelDirect(1, 0);
    addN('banana', 7);                                            /* 多拿 1 → 数量不对 */
    const r1 = checkout(), st1 = S.state, kept1 = S.basket.banana === 7;
    const pen1 = S.errors === 1 && starsFor(S.errors) >= 1;
    loadLevelDirect(1, 0);
    addN('apple', 1);                                             /* 非所要商品 */
    const r2 = checkout(), st2 = S.state, kept2 = S.basket.apple === 1;
    okUnit('smCount', okPath && r1 === 'hint' && st1 === 'hint' && kept1 && pen1 &&
      r2 === 'notwant' && st2 === 'notwant' && kept2 && S.errors === 1,
      { okPath, r1, st1, kept1, pen1, r2, st2, kept2 });
  }
  /* ---- ② 状态机单元：sum（2-0 r0 = apple+banana = 5 元） ---- */
  {
    loadLevelDirect(5, 0);
    const preCoin = addCoin(1);                                   /* 非 paying 拒绝 */
    addN('apple', 1); addN('banana', 1);
    const sel = checkout();
    const inPay = S.state === 'paying' && S.payPhase === 'sum' && S.selTotal === 5;
    const less = confirmPay();                                    /* 空付 → 还差 */
    const stLess = S.state;                                       /* payerr 态（真实路径 1.4s 后回落，此处驱动器复位） */
    S.state = 'paying';
    addCoin(5); addCoin(2);
    const more = confirmPay();                                    /* 7 元 → 付多 */
    const stMore = S.state;
    S.state = 'paying';
    removeCoin(1);                                                /* 拿回 2 元 → 5 正好 */
    const fin = confirmPay();
    okUnit('smSum', preCoin === false && sel === 'ok' && inPay &&
      less === 'less' && stLess === 'payerr' && more === 'more' && stMore === 'payerr' &&
      fin === 'ok' && S.state === 'leaving',
      { preCoin, sel, inPay, less, stLess, more, stMore, fin });
  }
  /* ---- ② 状态机单元：budget（3-0 r0 = 8 元买两样） ---- */
  {
    loadLevelDirect(10, 0);
    addN('pear', 1); addN('orange', 1);                           /* 5+7=12 > 8 → 买不起 */
    const cheap = checkout(), stC = S.state, keptC = S.basket.pear === 1 && S.basket.orange === 1;
    loadLevelDirect(10, 0);
    addN('apple', 1);                                             /* 只拿 1 样 → 件数不对 */
    const need = checkout(), stN = S.state;
    loadLevelDirect(10, 0);
    addN('apple', 1); addN('pear', 1);                            /* 2+5=7 ≤ 8 → 找零 1 元 */
    const sel = checkout();
    const inPay = S.state === 'paying' && S.payPhase === 'change' && S.selTotal === 7;
    const less = confirmPay();                                    /* 0 枚 → 少找 */
    S.state = 'paying';
    addCoin(2);
    const more = confirmPay();                                    /* 2 元 → 多找 */
    S.state = 'paying';
    removeCoin(0); addCoin(1);
    const fin = confirmPay();                                     /* 1 元 → 正好 */
    okUnit('smBudget', cheap === 'cheap' && stC === 'cheap' && keptC &&
      need === 'need' && stN === 'need' &&
      sel === 'ok' && inPay && less === 'less' && more === 'more' && fin === 'ok' && S.state === 'leaving',
      { cheap, stC, keptC, need, stN, sel, inPay, less, more, fin });
  }
  /* ---- ③ 按群单元（1-2 r1 = apple×10；1-1 r0 = banana×6 对照） ---- */
  {
    loadLevelDirect(2, 1);
    const barOn = groupBar.classList.contains('show') && groupBar.querySelectorAll('button').length === 3;
    setStrategy(5);
    const grps5 = bubble.querySelectorAll('.b-grp').length;       /* 10/5 = 2 组 */
    const dots5 = Array.from(bubble.querySelectorAll('.b-grp')).map(g => g.querySelectorAll('i').length).join(',');
    window.__lastSayText = null;
    window.__lastPlayKey = null;
    onShelfTap('apple');                                          /* 组模式一次一组 + 组末报数 */
    const add5 = S.basket.apple === 5;
    const play5 = window.__lastPlayKey === 'shop_cn_5';
    const lit1 = bubble.querySelectorAll('.b-grp.lit').length;
    onShelfTap('apple');
    const add10 = S.basket.apple === 10;
    const play10 = window.__lastPlayKey === 'shop_cn_10';
    const lit2 = bubble.querySelectorAll('.b-grp.lit').length;
    setStrategy(2);
    const grps2 = bubble.querySelectorAll('.b-grp').length;       /* 10/2 = 5 组 */
    const curBtn = groupBar.querySelector('button[data-g="2"]').classList.contains('cur');
    loadLevelDirect(1, 0);                                        /* n=6 无策略条 */
    const barOff = !groupBar.classList.contains('show');
    okUnit('groupUnit', barOn && grps5 === 2 && dots5 === '5,5' && add5 && play5 && lit1 === 1 &&
      add10 && play10 && lit2 === 2 && grps2 === 5 && curBtn && barOff,
      { barOn, grps5, dots5, add5, play5, lit1, add10, play10, lit2, grps2, curBtn, barOff });
  }
  /* ---- ④ 硬币引擎 ---- */
  {
    loadLevelDirect(5, 0);
    S.state = 'shopping';
    const guardShop = addCoin(1) === false;
    S.state = 'paying'; S.payPhase = 'sum'; S.coins = [];
    let capOk = true;
    while (paidSum() < 30) if (!addCoin(5)) { capOk = false; break; }
    const capGuard = addCoin(1) === false && paidSum() === 30;
    removeCoin(0);
    const inv = paidSum() === 25 && S.coins.length === 5;
    okUnit('coinEngine', guardShop && capOk && capGuard && inv, { guardShop, capOk, capGuard, inv });
  }
  /* ---- ⑤ 语音链独立对账 + clips 注入 ---- */
  {
    const clipKeys = Object.keys(KIDS.voice.clips);
    let chainOk = true, missKeys = [], injOk = true;
    for (let i = 0; i < 20; i++) {
      getOrder(i).rounds.forEach(r => {
        const mine = expChainV(r), eng = roundChain(r, true);
        if (JSON.stringify(mine) !== JSON.stringify(eng)) { chainOk = false; missKeys.push('chain@' + i); }
        if (r.m === 'budget') {
          const em = ['shop_paid', 'shop_n_' + r.B, r.want === 2 ? 'shop_chg_q2' : 'shop_chg_q3'];
          if (JSON.stringify(em) !== JSON.stringify(changeAskChain(r))) { chainOk = false; missKeys.push('chg@' + i); }
        }
        mine.forEach(k => { if (clipKeys.indexOf(k) < 0) { injOk = false; missKeys.push(k); } });
      });
    }
    /* 生成关数域内 key（n 6-14、B 8-14）全部已注入 */
    for (const n of [6, 7, 8, 9, 10, 11, 12, 13, 14]) {
      Object.keys(SPEC_P).forEach(k => { if (clipKeys.indexOf('shop_g_' + k + '_' + n) < 0) { injOk = false; missKeys.push('g_' + k + '_' + n); } });
      if (clipKeys.indexOf('shop_n_' + n) < 0) { injOk = false; missKeys.push('shop_n_' + n); }
    }
    /* T46 拆段键全注入：组末报数 shop_cn_1..20 / 付钱 shop_put+shop_try+shop_n_{1,2,5} / 找零 shop_chg+shop_n_1..19 */
    for (let n = 1; n <= 20; n++) {
      if (clipKeys.indexOf('shop_cn_' + n) < 0) { injOk = false; missKeys.push('shop_cn_' + n); }
      if (n <= 19 && clipKeys.indexOf('shop_n_' + n) < 0) { injOk = false; missKeys.push('shop_n_' + n); }
    }
    ['shop_put', 'shop_try', 'shop_chg'].forEach(k => { if (clipKeys.indexOf(k) < 0) { injOk = false; missKeys.push(k); } });
    okUnit('chains', chainOk && injOk, { missKeys: missKeys.slice(0, 8), clipCount: clipKeys.length });
  }
  /* ---- ⑥ SPEC_DUR：r6 全量 clip 实长（±60ms；表空=probe 阶段该单元 FAIL 占位） ---- */
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(R6_KEYS.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const measured = R6_KEYS.reduce((o, k, i) => (o[k] = durs[i], o), {});
  const durBad = durKeys.filter(k => Math.abs(measured[k] - SPEC_DUR[k]) > 60);
  okUnit('specDur', durKeys.length === R6_KEYS.length && durBad.length === 0,
    { n: R6_KEYS.length, table: durKeys.length, bad: durBad.slice(0, 6) });

  /* ---- ⑦ estMs 家族定版 + SAY_PAD ---- */
  {
    const src = estMs.toString();
    const famOk = estMs('一二三四五') === 5 * 345 + 600 &&
      src.indexOf('345') >= 0 && src.indexOf('600') >= 0 && src.indexOf('+ 300') < 0 &&
      SAY_PAD === 300;
    okUnit('estMsFamily', famOk, { estMs5: estMs('一二三四五'), SAY_PAD });
  }

  /* ---- ⑧ 时序分账：净时长 ≥40000 + 互动占比 ≥0.55（1-0 教学关豁免） ---- */
  function modelRoundV(r) {
    if (r.m === 'count') {
      const chain = D('shop_want') + D('shop_g_' + r.k + '_' + r.n) + SPEC_T.GAP + SPEC_T.LISTEN_PAD;
      const act = r.n * SPEC_T.TAP;
      return { t: chain + act + SPEC_T.CONFIRM, listen: chain, act };
    }
    if (r.m === 'sum') {
      const ks = r.ks, total = ks.reduce((s, k) => s + SPEC_P[k], 0);
      const chain = D('shop_want') + ks.reduce((s, k) => s + D('shop_name_' + k), 0) +
        (ks.length - 1) * D('shop_and') + D('shop_ask_total') + (ks.length + 1) * SPEC_T.GAP + SPEC_T.LISTEN_PAD;
      const act = ks.length * SPEC_T.SEL + SPEC_T.COMPUTE + minCoinsV(total) * SPEC_T.COIN;
      return { t: chain + act + SPEC_T.CONFIRM, listen: chain, act };
    }
    const chain = D('shop_have') + D('shop_n_' + r.B) + D(r.want === 2 ? 'shop_buy2' : 'shop_buy3') +
      2 * SPEC_T.GAP + SPEC_T.LISTEN_PAD;
    const chg = D('shop_paid') + D('shop_n_' + r.B) + D(r.want === 2 ? 'shop_chg_q2' : 'shop_chg_q3') +
      2 * SPEC_T.GAP + SPEC_T.CHG_PAD;
    const act = r.want * SPEC_T.SEL + SPEC_T.COMPUTE + SPEC_T.CHANGE_COINS * SPEC_T.COIN;
    return { t: chain + chg + act + SPEC_T.CONFIRM, listen: chain + chg, act };
  }
  {
    const timing = {};
    let timeOk = durKeys.length > 0;   /* SPEC_DUR 未回填前不判（probe 阶段） */
    for (let i = 0; i < 30; i++) {
      if (i === 0) continue;           /* 教学关豁免（README SPEC r6 注明） */
      const rounds = i < 20 ? SPEC_LEVELS[i].rounds : getOrder(i).rounds;
      const passive = SPEC_T.ENTER + (rounds.length - 1) * SPEC_T.ROUND_T;  /* 演出=进场+轮过渡 */
      let t = passive, listen = 0, act = 0;
      rounds.forEach(r => { const m = modelRoundV(r); t += m.t; listen += m.listen; act += m.act; });
      const share = (listen + act) / t;   /* 思考/操作占比=（听题理解+操作决策）/全关 */
      const rec = { ms: Math.round(t), share: +share.toFixed(3) };
      if (i < 20) timing[keyOf(i)] = rec; else timing['gen' + i] = rec;
      if (t < SPEC_T.MIN_MS || share < SPEC_T.SHARE) { timeOk = false; rec.bad = true; }
    }
    okUnit('timing', timeOk, timing);
  }

  /* ---- ⑨ 布局：双 viewport ×（按群 count / sum 付钱 / budget 找零）---- */
  function rectOf(el) { return el.getBoundingClientRect(); }
  const overlap = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0;
  };
  const gameEl = $id('game');
  const sims = {};
  let layoutOkAll = true;
  for (const [w, h] of [[1280, 800], [800, 1180]]) {
    gameEl.style.width = w + 'px'; gameEl.style.height = h + 'px';
    const vp = 'vp' + w;
    sims[vp] = {};
    /* A：count 按群（1-2 r1 apple×10） */
    loadLevelDirect(2, 1);
    let pass = true, notes = [];
    const gbtns = Array.from(groupBar.querySelectorAll('button'));
    const gRects = gbtns.map(rectOf);
    if (!groupBar.classList.contains('show') || gbtns.length !== 3 ||
        gRects.some(r => r.width < 72 || r.height < 72)) { pass = false; notes.push('groupbar'); }
    const cells = Array.from(shelfEl.querySelectorAll('.shelf-cell')).map(rectOf);
    if (cells.length !== 4 || cells.some(r => r.width < 96 || r.height < 96)) { pass = false; notes.push('shelf'); }
    const tagDisp = getComputedStyle(shelfEl.querySelector('.shelf-cell .price-tag')).display;
    if (tagDisp !== 'none') { pass = false; notes.push('priceTag should hide'); }
    const co0 = rectOf($id('btn-checkout'));
    if (co0.width < 96 || co0.height < 96 || co0.top + co0.height / 2 <= h / 2) { pass = false; notes.push('checkout'); }
    /* B：sum 付钱（2-0 r0） */
    loadLevelDirect(5, 0);
    enterPaying('sum');
    const tagDisp2 = getComputedStyle(shelfEl.querySelector('.shelf-cell .price-tag')).display;
    const coinBtns = Array.from($id('coin-dock').querySelectorAll('button')).map(rectOf);
    const doneR = rectOf($id('btn-done'));
    const coHide = getComputedStyle($id('btn-checkout')).display === 'none';
    const panelOn = payPanel.classList.contains('show');
    if (tagDisp2 !== 'flex' || coinBtns.length !== 3 || coinBtns.some(r => r.width < 72 || r.height < 72) ||
        doneR.width < 72 || doneR.height < 72 || !coHide || !panelOn) {
      pass = false; notes.push('sumPay tag=' + tagDisp2 + ' coins=' + coinBtns.length +
        '[' + (coinBtns.map(r => Math.round(r.width) + 'x' + Math.round(r.height)).join(';') || 'none') + ']' +
        ' done=' + Math.round(doneR.width) + 'x' + Math.round(doneR.height) +
        ' coHide=' + coHide + ' panel=' + panelOn);
    }
    /* C：budget 找零（3-0 r0） */
    loadLevelDirect(10, 0);
    if (!budgetBar.classList.contains('show')) { pass = false; notes.push('budgetBar off'); }
    const bbR = rectOf(budgetBar), bubR = rectOf(bubble), doorR = rectOf(door);
    if (overlap(bbR, bubR) || overlap(bbR, doorR)) { pass = false; notes.push('budgetBar overlap'); }
    S.basket = { apple: 1, pear: 1 }; S.state = 'shopping';
    enterPaying('change');
    if (!payPanel.querySelector('.pp-paid') || payPanel.querySelectorAll('.pp-items .pi').length !== 2) { pass = false; notes.push('changePanel'); }
    const ox = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (ox > 0) { pass = false; notes.push('ox=' + ox); }
    if (bubR.left < 0 || bubR.right > w) { pass = false; notes.push('bubble out'); }
    sims[vp] = { ok: pass, notes: notes };
    if (!pass) layoutOkAll = false;
  }
  gameEl.style.width = ''; gameEl.style.height = '';
  okUnit('layout', layoutOkAll, sims);

  const out = { game: 'shop-math', mode: 'r6', total: total, pass: npass,
                units: units, audit: audit, durs: measured };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k) { window.__lastPlayKey = k; };
  KIDS.voice.queue = function (parts) { window.__lastQueue = parts; };
  KIDS.voice.say = function (t) { window.__lastSayText = t; };
  runVerify();
}
