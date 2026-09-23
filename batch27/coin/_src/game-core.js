/* ================= coin 纯引擎：确定性关卡生成 + 文字卡/钱币卡点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型（SPEC-R38-COIN §R1；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 硬币三兄弟：[coin,rev,coin,rev,coin] 交替，COIN3 轮换（flat0 题0 恒 coin/yuan1——
           教学演示锚点保留）；rev 反向认币（文字牌→钱币图卡，候选=R4C 封闭 4）
     dch2 纸币和买东西：3 bill（BILL4 轮换取 3）+2 chg 元级（book/blocks 各一，付 5 元）
     dch3 一样多和数一数：2 sameval（双向各一）+3 combo（1 遗留+2 开放；关内多重集互异+
           和值互异；≥1 题 3-4 枚深水）
     dch4 算钱大挑战：3 难题（sameval/combo/chg/min，≥1 ∈ {chg,min}）+2 易题（coin/bill/rev）洗牌
   生成关（flat≥20）：每关随机章参数 dch=ri(1,4)（先取数保确定性——b25 坑④ verify 钩子直读）。
   铁律：候选卡 4 张互异（§0.17）；相邻题 face 互异（跨题型也查）；combo/chg 干扰=近值文字
   （combo ≥1 个 |Δ|≤5、chg ≥1 个 |Δ|≤2——近对必在）；chg 角级用 CHG_JIAO 池、元级用 CHG_YUAN 池。 */
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

/* ---------- 每关题序表 {kind, face, near, coins?, item?, target?}（genLevel 预生成；rnd 同流） */
/* 开放组合多重集：掷 n∈[2,4] 枚 COIN3 → 按角值降序（展示大→小）；
   关内多重集互异（sigs）+和值互异（sums）去重，重掷 ≤64 次后走 3 枚固定表鸽笼兜底 */
function drawCombo(rnd, sigs, sums, minN) {
  const n = minN ? Math.max(minN, ri(rnd, 2, 4)) : ri(rnd, 2, 4);
  for (let g = 0; g < 64; g++) {
    const coins = [];
    for (let c = 0; c < n; c++) coins.push(COIN3[Math.floor(rnd() * COIN3.length)]);
    const desc = coins.slice().sort((a, b) => MONEY[b].jiao - MONEY[a].jiao);
    const sig = comboSig(desc), sum = desc.reduce((s, x) => s + MONEY[x].jiao, 0);
    if (sigs.indexOf(sig) >= 0 || sums.indexOf(sum) >= 0) continue;
    sigs.push(sig); sums.push(sum);
    const lg = legacyOf(desc);
    return { kind: 'combo', face: lg || ('k' + sig), coins: desc, near: true };
  }
  /* 兜底：3 枚固定表扫第一个不撞的（10 个 3 枚多重集 vs 关内已占 ≤4——鸽笼必得） */
  const T3 = [[10, 10, 10], [10, 10, 5], [10, 10, 1], [10, 5, 5], [10, 5, 1], [10, 1, 1],
              [5, 5, 5], [5, 5, 1], [5, 1, 1], [1, 1, 1]];
  for (const t of T3) {
    const sig = t.join('-'), sum = t.reduce((s, x) => s + x, 0);
    if (sigs.indexOf(sig) >= 0 || sums.indexOf(sum) >= 0) continue;
    sigs.push(sig); sums.push(sum);
    const desc = t.map(j => COIN3[[1, 5, 10].indexOf(j)]);
    const lg = legacyOf(desc);
    return { kind: 'combo', face: lg || ('k' + sig), coins: desc, near: true };
  }
  return null;   /* 不可达（10>4 鸽笼）；调用处兜底 */
}
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  const pickDiff = (pool, prev) => {
    let s = pool[Math.floor(rnd() * pool.length)];
    for (let g = 0; g < 8 && s === prev; g++) s = pool[Math.floor(rnd() * pool.length)];
    return s;
  };
  if (dch === 1) {
    const s0 = flat === 0 ? COIN3.indexOf('yuan1') : ri(rnd, 0, COIN3.length - 1);   // flat0 题0 恒 yuan1（教学锚点）
    for (let qi = 0; qi < CH_LEN; qi++) {
      seq.push({ kind: qi % 2 === 0 ? 'coin' : 'rev', face: COIN3[(s0 + qi) % COIN3.length], near: false });
    }
    return seq;
  }
  if (dch === 2) {
    const s0 = ri(rnd, 0, BILL4.length - 1);
    const items = shuffled(CHG_YUAN, rnd);              // book/blocks 各一（元级找零，付 5 元）
    for (let qi = 0; qi < CH_LEN; qi++) {
      if (qi === 1 || qi === 3) seq.push({ kind: 'chg', face: items[(qi - 1) / 2], item: items[(qi - 1) / 2], near: true });
      else seq.push({ kind: 'bill', face: BILL4[(s0 + (qi >> 1)) % BILL4.length], near: false });
    }
    return seq;
  }
  if (dch === 3) {
    const pool = ['yuan1', 'yuan1p'].map(f => ({ kind: 'sameval', face: f, near: true }));
    const legacy = COMBO_IDS[Math.floor(rnd() * COMBO_IDS.length)];   // 遗留组合 3 选 1（快径 clip 恒在册）
    pool.push({ kind: 'combo', face: legacy, coins: COMBOS[legacy].coins.slice(), near: true });
    const sigs = [comboSig(COMBOS[legacy].coins)], sums = [COMBOS[legacy].jiao];
    const deep = drawCombo(rnd, sigs, sums, 3);         // 开放①：≥3 枚深水（兜底表全 3 枚——恒满足）
    if (deep) pool.push(deep);
    while (pool.length < CH_LEN) {                      // 开放②：2-4 枚任意（含 2 枚新面）
      const c = drawCombo(rnd, sigs, sums, 0);
      if (c) pool.push(c); else break;
    }
    return shuffled(pool, rnd);                         // face 互异（多重集互异 ⇒ face 互异）——洗牌即相邻安全
  }
  /* dch4 算钱大挑战：3 难题（≥1 ∈ {chg,min}）+2 易题（coin/bill/rev 取 2）洗牌 */
  const hardPool = ['sameval', 'combo', 'chg', 'min'];
  const h1 = rnd() < 0.5 ? 'sameval' : 'combo';
  const h2 = rnd() < 0.5 ? 'chg' : 'min';
  const h3 = hardPool[Math.floor(rnd() * hardPool.length)];
  const easies = shuffled(['coin', 'bill', 'rev'], rnd).slice(0, 2);
  const kinds = shuffled([h1, h2, h3, easies[0], easies[1]], rnd);
  const sigs = [], sums = [], minAns = [];
  let prev = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const k = kinds[qi];
    if (k === 'sameval') {
      const f = pickDiff(['yuan1', 'yuan1p'], prev);
      seq.push({ kind: 'sameval', face: f, near: true }); prev = f;
    } else if (k === 'combo') {
      let c = drawCombo(rnd, sigs, sums, 0);
      for (let g = 0; g < 8 && c && c.face === prev; g++) c = drawCombo(rnd, sigs, sums, 0);
      if (!c) c = { kind: 'combo', face: 'k1-1', coins: ['jiao1', 'jiao1'], near: true };  // 不可达兜底
      seq.push(c); prev = c.face;
    } else if (k === 'chg') {
      const f = pickDiff(CHG_JIAO, prev);               // ch4 角级找零（付 1 元）
      seq.push({ kind: 'chg', face: f, item: f, near: true }); prev = f;
    } else if (k === 'min') {
      let t = MIN_TARGETS[Math.floor(rnd() * MIN_TARGETS.length)];
      for (let g = 0; g < 8 && (minAns.indexOf(greedyOf(t)) >= 0 || 'm' + t === prev); g++)
        t = MIN_TARGETS[Math.floor(rnd() * MIN_TARGETS.length)];   // 关内 min 答案互异（族内重掷：保 kind 只掷行参数——r42 先例）
      /* r38 M8 兜底：8 掷仍撞（~1e-4）续掷至 64 上限（对齐 drawCombo 64 掷口径）；
         仍撞=接受并 console.warn（禁静默破 SPEC §R3 律）。谱内 40 关零触发=前 8 掷恒收敛，
         本兜底不耗确定性（verify ⑬ dch4 min 答案互异断言防回归） */
      for (let g = 8; g < 64 && (minAns.indexOf(greedyOf(t)) >= 0 || 'm' + t === prev); g++)
        t = MIN_TARGETS[Math.floor(rnd() * MIN_TARGETS.length)];
      if (minAns.indexOf(greedyOf(t)) >= 0 || 'm' + t === prev)
        console.warn('coin min 互异兜底：64 掷后仍撞，接受 target=' + t + '（SPEC §R3 min 答案互异律被破）');
      minAns.push(greedyOf(t));
      seq.push({ kind: 'min', face: 'm' + t, target: t, near: true }); prev = 'm' + t;
    } else {
      const f = pickDiff(k === 'bill' ? BILL4 : COIN3, prev);
      seq.push({ kind: k, face: f, near: false }); prev = f;
    }
  }
  return seq;
}

/* ---------- 近值干扰文字（combo/chg 共用）：pool=a±deltas ∩(0,50]，恰 3 个=钉 1 小 |Δ|+2 补位
   补位优先大 |Δ|（辨析负荷）再回补小 |Δ|——pool 恒 ≥3（combo a∈[2,40] 最小 4 个 / chg 域最小 4 个，
   均验证过），保证 picked 恒 3 条（r38 自测坑：小 a 时 pool 多数落 smallMax 内致 rest 不足 2） */
function nearTexts(a, deltas, smallMax, rnd) {
  const pool = [];
  deltas.forEach(d => { [a - d, a + d].forEach(v => { if (v > 0 && v <= 50 && pool.indexOf(v) < 0) pool.push(v); }); });
  const smalls = shuffled(pool.filter(v => Math.abs(v - a) <= smallMax), rnd);
  const bigs = shuffled(pool.filter(v => Math.abs(v - a) > smallMax), rnd);
  return [smalls[0]].concat(bigs.slice(0, 2), smalls.slice(1, 3 - bigs.length))
    .slice(0, 3).map(sumText);
}

/* ---------- 单题构建：题面 + 候选 → 洗牌 4 卡 + answer 下标
   coin：候选=3 硬币面额文字全（1角/5角/1元）+1 纸币面额干扰（5元/10元/20元 随机）
   bill：候选=answer 面额文字+2 非答案纸币面额+1 币文近对（yuan1p↔'1角'/yuan5↔'5角'；
         yuan10/yuan20 无数字同币文——取第 4 纸币面额，保持「非封闭小集」的辨认负荷）
   rev：候选=R4C 钱币图卡全（jiao1/jiao5/yuan1/yuan1p——1元纸币=同值异类陷阱）
   sameval：候选=答案币（SAMEVAL[face] 同值对方）+jiao1（近对必在）+2 随机干扰钱币卡
   combo：候选=和值文字+3 近值文字（±1/±5/±10，≥1 |Δ|≤5；遗留/开放同律）
   chg：候选=找零文字+3 近值文字（±1/±2/±5/±10，≥1 |Δ|≤2）
   min：候选='1枚'-'4枚' 封闭四卡（答案=贪心最少枚）
   卡 id：文字卡 id='t:'+text / 钱币卡 id=钱币 id（verify 渲染对账） */
function buildQuiz(spec, dch, rnd) {
  const k = spec.kind;
  let opts, answerId;
  if (k === 'coin') {
    const d = ['5元', '10元', '20元'][Math.floor(rnd() * 3)];   // '1元' 已在硬币面额集
    opts = COIN3.map(c => ({ id: 't:' + MONEY[c].text, text: MONEY[c].text }))
      .concat([{ id: 't:' + d, text: d }]);
    answerId = 't:' + MONEY[spec.face].text;
  } else if (k === 'bill') {
    /* r38：非答案纸币取 2（不再是全 4 封闭集），第 4 卡=数字同币文近对（有则）或剩余纸币面额 */
    const near = spec.face === 'yuan1p' ? '1角' : (spec.face === 'yuan5' ? '5角' : null);
    const others = shuffled(BILL4.filter(x => x !== spec.face), rnd).slice(0, 2);
    const texts = [MONEY[spec.face].text].concat(others.map(x => MONEY[x].text))
      .concat([near || MONEY[BILL4.filter(x => others.indexOf(x) < 0 && x !== spec.face)[0]].text]);
    opts = texts.map(t => ({ id: 't:' + t, text: t }));
    answerId = 't:' + MONEY[spec.face].text;
  } else if (k === 'rev') {
    opts = R4C.map(x => ({ id: x, text: MONEY[x].text }));       // 钱币图卡（renderBoard 去标签）
    answerId = spec.face;
  } else if (k === 'sameval') {
    const ans = SAMEVAL[spec.face];                             // 同值对方（互指表）
    const pool = ALL7.filter(x => x !== spec.face && x !== ans && x !== 'jiao1');
    const ds = shuffled(pool, rnd).slice(0, 2);                 // 2 随机干扰（jiao1=近对必占 1 席）
    opts = [ans, 'jiao1'].concat(ds).map(x => ({ id: x, text: MONEY[x].text }));
    answerId = ans;
  } else if (k === 'combo') {
    const coins = spec.coins || COMBOS[spec.face].coins;
    const sum = coins.reduce((s, c) => s + MONEY[c].jiao, 0);
    const ds = nearTexts(sum, [1, 5, 10], 5, rnd);              // 3 近值文字（≥1 |Δ|≤5）
    opts = [sumText(sum)].concat(ds).map(t => ({ id: 't:' + t, text: t }));
    answerId = 't:' + sumText(sum);
  } else if (k === 'chg') {
    const it = ITEMS[spec.item];
    const change = MONEY[it.pay].jiao - it.price;
    const ds = nearTexts(change, [1, 2, 5, 10], 2, rnd);        // 3 近值文字（≥1 |Δ|≤2）
    opts = [sumText(change)].concat(ds).map(t => ({ id: 't:' + t, text: t }));
    answerId = 't:' + sumText(change);
  } else { /* min */
    opts = ['1枚', '2枚', '3枚', '4枚'].map(t => ({ id: 't:' + t, text: t }));
    answerId = 't:' + greedyOf(spec.target) + '枚';
  }
  const order = shuffled(opts, rnd);
  const cards = order.map((o, j) => ({ id: o.id, text: o.text }));
  let answer = -1;
  for (let j = 0; j < cards.length; j++) if (cards[j].id === answerId) answer = j;
  return { kind: k, face: spec.face, near: !!spec.near,
           coins: spec.coins || null, item: spec.item || null, target: spec.target || null,
           opts: cards, answer: answer, _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   flat0 题0 恒 coin/yuan1（§2 教学演示锚点——specSeqOf flat===0 分支保确定性） */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], dch, rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapOpt(L, i) —— 点第 i 张候选卡（opts 数组下标）
   'right' 答对且本题完成推进 / 'done' 答对且末题=通关
   'wrong' 点错：该题 miss+1（retries 全关累计=星级口径），卡不灰可重选（探索不罚）
   null    非法下标或关卡已结束 ---------- */
function engTapOpt(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.opts.length) return null;
  if (i === q.answer) {
    q._answered = true;
    L.step++;
    if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
    return 'right';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级（§0.65 口径）：全关错选 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 答案级救援/教学帮指用：当前题正确卡下标（=q.answer，独立函数供 verify 复核） */
const correctIdx = q => !q ? -1 : q.answer;

/* ---------- 结构校验（verify 用，返回失败原因或 null）：封闭表 / 章型规则 / 答案自洽 /
   近对在场 / 候选互异 / 相邻题 face 互异 / flat0q0 锚点 / 初始态干净（SPEC-R38 §R1/§R3） */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  if (q.kind === 'coin' || q.kind === 'bill' || q.kind === 'rev') {
    if (!MONEY[q.face]) return 'face';
    if (q.kind === 'rev') {
      if (MONEY[q.face].kind !== 'coin' || COIN3.indexOf(q.face) < 0) return 'revFace';
    } else if (MONEY[q.face].kind !== (q.kind === 'coin' ? 'coin' : 'bill')) return 'faceKind';
  } else if (q.kind === 'sameval') {
    if (q.face !== 'yuan1' && q.face !== 'yuan1p') return 'svFace';
  } else if (q.kind === 'combo') {
    if (!q.coins || q.coins.length < 2 || q.coins.length > 4) return 'cbLen';
    if (!q.coins.every(c => COIN3.indexOf(c) >= 0)) return 'cbCoin';
    for (let i = 1; i < q.coins.length; i++)
      if (MONEY[q.coins[i - 1]].jiao < MONEY[q.coins[i]].jiao) return 'cbOrder';
    const lg = legacyOf(q.coins);
    if (lg !== q.face && q.face !== 'k' + comboSig(q.coins)) return 'cbFace';
  } else if (q.kind === 'chg') {
    if (!ITEMS[q.item] || q.item !== q.face) return 'itFace';
    if (MONEY[ITEMS[q.item].pay].jiao - ITEMS[q.item].price <= 0) return 'itVal';
  } else if (q.kind === 'min') {
    if (q.target < 1 || q.target > 40 || greedyOf(q.target) > 4) return 'minT';
    if (q.face !== 'm' + q.target) return 'minFace';
  } else return 'kind';
  const isAnchor = flat === 0 && qi === 0;              // 教学演示题（认一元硬币）锚点
  if (isAnchor && (q.kind !== 'coin' || q.face !== 'yuan1')) return 'anchor';
  if (dch === 1 && q.kind !== 'coin' && q.kind !== 'rev') return 'dch1kind';   // ch1 硬币正反认
  if (dch === 2 && q.kind !== 'bill' && q.kind !== 'chg') return 'dch2kind';   // ch2 纸币+元级找零
  if (dch === 3 && q.kind !== 'sameval' && q.kind !== 'combo') return 'dch3kind';
  if (q.opts.length !== 4) return 'len';
  const ids = q.opts.map(o => o.id);
  if (ids.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'dup';
  if (q.answer < 0 || q.answer >= 4 || ids.indexOf(ids[q.answer]) !== q.answer) return 'ansIdx';
  /* 答案自洽（按 kind 引擎复算——verify 另有 SPEC 表独立复判，不信本函数） */
  if (q.kind === 'coin' || q.kind === 'bill') {
    if (q.opts[q.answer].text !== MONEY[q.face].text) return 'ansText';
  } else if (q.kind === 'rev') {
    if (q.opts[q.answer].id !== q.face) return 'ansRev';
    if (ids.slice().sort().join() !== R4C.slice().sort().join()) return 'revSet';
  } else if (q.kind === 'chg') {
    const it = ITEMS[q.item];
    if (q.opts[q.answer].text !== sumText(MONEY[it.pay].jiao - it.price)) return 'ansChg';
  } else if (q.kind === 'min') {
    if (q.opts[q.answer].text !== greedyOf(q.target) + '枚') return 'ansMin';
    if (ids.slice().sort().join() !== ['t:1枚', 't:2枚', 't:3枚', 't:4枚'].join()) return 'minSet';
  }
  /* 近对必在场（near 题统一断言；verify 另有 SPEC 独立断言） */
  if (q.near && !nearInOpts(q)) return 'nearMissing';
  if (prevQ && prevQ.face === q.face) return 'adjacent';
  if (q._miss !== 0 || q._answered) return 'init';
  return null;
}
/* 近对在场引擎侧判定（verify 用 SPEC 表独立复判，不信本函数）：
   sameval → 干扰含 jiao1；combo → 干扰含 |Δ|≤5 近值；chg → 干扰含 |Δ|≤2 近值；
   rev/min → 结构性（R4C 全场/四枚卡全集，structWhy 已查） */
function nearInOpts(q) {
  if (q.kind === 'sameval') return q.opts.some(o => o.id === 'jiao1' && o.id !== q.opts[q.answer].id);
  if (q.kind === 'combo' || q.kind === 'chg') {
    const a = textJiao(q.opts[q.answer].text), lim = q.kind === 'combo' ? 5 : 2;
    return q.opts.some((o, i) => i !== q.answer && textJiao(o.text) > 0 &&
               Math.abs(textJiao(o.text) - a) <= lim);
  }
  return true;
}
