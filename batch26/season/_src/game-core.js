/* ================= season 纯引擎 r4（双约束整套装）：确定性生成 + 勾选/提交判定（无 DOM）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   章型 r4（SPEC-BATCH26 §0.62 r4 块）：
     dch1 双约束两件套：kind='outfit' size=2（OUT2 变体池；场合 4 全含 sleep）
     dch2 三件套：size=3（OUT3 含配件；sleep 无三件套不进池）
     dch3 近季陷阱主场：变体必含陷阱成员（对件 !fits 强制入干扰）
     dch4 反向混出：anti ≥2 + outfit 混排；生成关 flat≥20 每关随机章参数
   唯一性铁律（构造保证）：候选干扰恒 !fits(band,occ)——候选中满足双约束的物品恰=need；
   反向题 need=!fits(band)（温度维）+ 干扰 3 件全 fits(band)（穿着物）。
   flat0 题0 锚定 cold|school [heavycoat,pants]（教学演示：watch clip 与勾选→提交动作一致）。 */
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

/* ---------- 变体陷阱资格：变体成员中存在 item 使 trapMate(item) 非空且对件 !fits
   （对件当题不适配才可入干扰——ch3 出题从合格变体池取） ---------- */
function trapEligibleVariants(key, size) {
  const parts = key.split('|');
  const table = size === 2 ? OUT2 : OUT3;
  const out = [];
  (table[key] || []).forEach((v, vi) => {
    for (let k = 0; k < v.length; k++) {
      const mate = trapMate(v[k]);
      if (mate && !fits(mate, parts[0], parts[1])) { out.push(vi); return; }
    }
  });
  return out;
}

/* ---------- 每关题序表（genLevel 预生成；rnd 同流保确定性）
   相邻题 (kind+band+occ+need) 签名互异（防同关连题同型单调）；
   dch3 size=2/3 交替（[2,3,2,3,2] 定序保覆盖）；
   dch4 anti 恰 2 或 3（seeded）+ outfit 补足，相邻 kind 互异（≤8 掷） ---------- */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  const pickPair = (occPool, prevKey) => {
    for (let t = 0; t < 8; t++) {
      const band = ALL_BANDS[Math.floor(rnd() * 3)];
      const occ = occPool[Math.floor(rnd() * occPool.length)];
      if (kindKey('outfit', band, occ) !== prevKey) return { band: band, occ: occ };
    }
    return { band: ALL_BANDS[Math.floor(rnd() * 3)], occ: occPool[Math.floor(rnd() * occPool.length)] };
  };
  const kindKey = (kd, band, occ) => kd + '|' + band + '|' + occ;
  if (dch === 1 || dch === 2) {
    const size = dch === 1 ? 2 : 3;
    const occPool = dch === 1 ? ALL_OCCS : OCC3_POOL;
    if (flat === 0) {
      seq.push({ kind: 'outfit', band: 'cold', occ: 'school', size: size, vIdx: 0 });   // 教学锚定
    }
    let prev = seq.length ? kindKey('outfit', 'cold', 'school') : null;
    while (seq.length < CH_LEN) {
      const p = pickPair(occPool, prev);
      prev = kindKey('outfit', p.band, p.occ);
      seq.push({ kind: 'outfit', band: p.band, occ: p.occ, size: size });
    }
    return seq;
  }
  if (dch === 3) {
    const sizes = [2, 3, 2, 3, 2];
    let prev = null;
    for (let qi = 0; qi < CH_LEN; qi++) {
      const size = sizes[qi];
      let key, parts;
      for (let t = 0; t < 8; t++) {
        const band = ALL_BANDS[Math.floor(rnd() * 3)];
        const occ = OCC_TRAP_POOL[Math.floor(rnd() * OCC_TRAP_POOL.length)];
        if (kindKey('outfit', band, occ) !== prev && trapEligibleVariants(band + '|' + occ, size).length > 0) {
          key = kindKey('outfit', band, occ); parts = { band: band, occ: occ }; break;
        }
      }
      if (!key) {                                    // 兜底：定表首个合格 cell（≤8 掷未中）
        outer3:
        for (const band of ALL_BANDS) for (const occ of OCC_TRAP_POOL) {
          if (trapEligibleVariants(band + '|' + occ, size).length > 0) { key = kindKey('outfit', band, occ); parts = { band: band, occ: occ }; break outer3; }
        }
      }
      prev = key;
      seq.push({ kind: 'outfit', band: parts.band, occ: parts.occ, size: size, trap: true });
    }
    return seq;
  }
  /* dch4 反向混出：anti 恰 2-3 + outfit 补足（相邻 kind 互异 ≤8 掷；outfit size 混排） */
  const nAnti = ri(rnd, 2, 3);
  const kinds = [];
  for (let k = 0; k < nAnti; k++) kinds.push('anti');
  for (let k = kinds.length; k < CH_LEN; k++) kinds.push('outfit');
  const order = shuffled(kinds, rnd);
  for (let k = 1; k < order.length; k++) {
    for (let t = 0; t < 8 && order[k] === order[k - 1]; t++) {
      const j = ri(rnd, k, order.length - 1);
      const tmp = order[k]; order[k] = order[j]; order[j] = tmp;
    }
  }
  let prev = null;
  order.forEach(kd => {
    if (kd === 'anti') {
      let band = ALL_BANDS[Math.floor(rnd() * 3)];
      for (let t = 0; t < 8 && kindKey('anti', band, '') === prev; t++) band = ALL_BANDS[Math.floor(rnd() * 3)];
      prev = kindKey('anti', band, '');
      seq.push({ kind: 'anti', band: band });
    } else {
      const size = rnd() < 0.5 ? 2 : 3;
      const occPool = size === 2 ? ALL_OCCS : OCC3_POOL;
      let p = pickPair(occPool, prev);
      for (let t = 0; t < 8 && kindKey('outfit', p.band, p.occ) === prev; t++) p = pickPair(occPool, prev);
      prev = kindKey('outfit', p.band, p.occ);
      seq.push({ kind: 'outfit', band: p.band, occ: p.occ, size: size });
    }
  });
  return seq;
}

/* ---------- 反向题干扰池排除（非穿着物不当「哪件穿上不合适」的适配件：风筝=放/雨伞=带） ---------- */
const ANTI_NOT_WORN = ['kite', 'umbrella'];

/* ---------- 场景季节（band→季节景：cold=冬 / hot=夏 / cool=春或秋 seeded） ---------- */
const sceneSeasonOf = (band, rnd) => {
  const ss = TEMPS[band].seasons;
  return ss[Math.floor(rnd() * ss.length)];
};

/* ---------- 单题构建（rnd 同流；卡数 outfit=need+3（5-6）/ anti=4）
   outfit：need=表内变体；干扰=!fits 池 seeded 抽 3（dch3 陷阱对件强制入干扰）
   anti：need=ANTI_NEED_POOL 中 !fits(band) 一件；干扰=fits(band) 穿着物 3 件
   卡 id='w'+最终位置下标（位置稳定实例 id），item=物品 id ---------- */
function buildQuiz(spec, rnd) {
  if (spec.kind === 'anti') {
    const band = spec.band;
    const needPool = ANTI_NEED_POOL.filter(k => ITEMS[k].temp.indexOf(band) < 0);
    const need = needPool[Math.floor(rnd() * needPool.length)];
    const dsPool = ALL30.filter(k => k !== need && ITEMS[k].temp.indexOf(band) >= 0 &&
                                     ANTI_NOT_WORN.indexOf(k) < 0);
    const ds = shuffled(dsPool, rnd).slice(0, 3);
    const cards = shuffled([need].concat(ds), rnd).map((k, j) => ({ id: 'w' + j, item: k }));
    return { kind: 'anti', band: band, occ: null, season: sceneSeasonOf(band, rnd), need: [need], items: cards,
             stem: stemAntiOf(band), picked: [], _miss: 0, _answered: false };
  }
  const band = spec.band, occ = spec.occ, size = spec.size;
  const key = band + '|' + occ;
  const table = size === 2 ? OUT2 : OUT3;
  const variants = table[key];
  let vIdx;
  if (spec.trap) {                                   // ch3：陷阱合格变体池内 seeded 选
    const elig = trapEligibleVariants(key, size);
    vIdx = elig[Math.floor(rnd() * elig.length)];
  } else if (typeof spec.vIdx === 'number') {
    vIdx = spec.vIdx;                                // flat0 锚定变体
  } else {
    vIdx = Math.floor(rnd() * variants.length);
  }
  const need = variants[vIdx].slice();
  /* 干扰：!fits 池；ch3 陷阱对件优先（need 成员的 mate 且 !fits） */
  let forced = [];
  if (spec.trap) {
    need.forEach(k => {
      const mate = trapMate(k);
      if (mate && !fits(mate, band, occ) && need.indexOf(mate) < 0 && forced.indexOf(mate) < 0) forced.push(mate);
    });
  }
  const rest = shuffled(ALL30.filter(k => !fits(k, band, occ) && need.indexOf(k) < 0 && forced.indexOf(k) < 0), rnd);
  const ds = forced.concat(rest).slice(0, 3);
  const cards = shuffled(need.concat(ds), rnd).map((k, j) => ({ id: 'w' + j, item: k }));
  return { kind: 'outfit', band: band, occ: occ, season: sceneSeasonOf(band, rnd), need: need, items: cards,
           stem: stemOf(band, occ), picked: [], _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapItem(L, i) —— 点第 i 张物品卡（items 数组下标）
   反向题（anti，单件即时判定）：
     'right' 答对推进 / 'done' 末题答对=通关 / 'wrong' 点适配件=miss+1（方向锚反馈）
   套装题（outfit，判定在 engSubmit）：
     'pick' 勾选 / 'unpick' 取消勾选（零惩罚）
   null 非法下标或关卡已结束 ---------- */
function engTapItem(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.items.length) return null;
  if (q.kind === 'anti') {
    if (q.items[i].item === q.need[0]) {
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    q._miss++;
    L.retries++;
    return 'wrong';
  }
  const p = q.picked.indexOf(i);
  if (p >= 0) { q.picked.splice(p, 1); return 'unpick'; }
  q.picked.push(i);
  return 'pick';
}

/* ---------- 提交引擎（outfit「穿好啦」；weather v2 / bubble r1 先例）：
   'right' 勾选集==need 推进 / 'done' 末题提交成=通关
   'wrong_more' 勾选含非 need 件（选错件/多点）：清空重选 + miss+1（真实错误路径）
   'wrong_less' 勾选 ⊂ need 且未选满：保留勾选继续找（合法路径不算 miss）
   null 关卡已结束 / 反向题不适用 ---------- */
function engSubmit(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q.kind !== 'outfit') return null;
  const ids = q.picked.map(i => q.items[i].item);
  for (let k = 0; k < ids.length; k++) {
    if (q.need.indexOf(ids[k]) < 0) {
      q.picked = [];
      q._miss++;
      L.retries++;
      return 'wrong_more';
    }
  }
  if (ids.length < q.need.length) return 'wrong_less';
  q._answered = true;
  L.step++;
  if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
  return 'right';
}
const engWon = L => !!L && L.done;
/* 星级（口径承 v1）：全关错选/多点 0=3★ / 1-2=2★ / ≥3=1★（wrong_less 合法不算）。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 救援/教学帮指用：下一件应选卡下标（anti=need 卡；outfit=未勾选的 need 卡；勾满=-1 指提交钮） */
function nextNeededIdx(q) {
  if (!q) return -1;
  if (q.kind === 'anti') {
    for (let i = 0; i < q.items.length; i++) if (q.items[i].item === q.need[0]) return i;
    return -1;
  }
  for (let i = 0; i < q.items.length; i++) {
    if (q.need.indexOf(q.items[i].item) >= 0 && q.picked.indexOf(i) < 0) return i;
  }
  return -1;
}

/* ---------- 结构校验（verify 用，返回失败原因或 null）：题型/双约束真值/need 表内变体/
   卡数/互异/干扰恒 !fits（唯一性）/陷阱在场（ch3）/反向题结构/flat0 锚点/初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  if (q.kind !== 'outfit' && q.kind !== 'anti') return 'kind';
  if (ALL_BANDS.indexOf(q.band) < 0) return 'band';
  const isAnchor = flat === 0 && qi === 0;                     // 教学演示题（cold|school 两件套）锚点
  if (isAnchor) {
    if (q.kind !== 'outfit' || q.band !== 'cold' || q.occ !== 'school' ||
        q.need.join() !== 'heavycoat,pants') return 'anchor';
  }
  if (q.kind === 'anti') {
    if (dch !== 4) return 'antiDch';                           // 反向题只在 ch4/生成关 dch4
    if (q.need.length !== 1 || ANTI_NEED_POOL.indexOf(q.need[0]) < 0) return 'antiNeed';
    if (ITEMS[q.need[0]].temp.indexOf(q.band) >= 0) return 'antiFits';   // need 必不适配带（温度维）
    if (q.items.length !== 4) return 'antiLen';
    const ks = q.items.map(t => t.item);
    if (ks.filter((v, i, a) => a.indexOf(v) === i).length !== 4) return 'antiDup';
    let nFit = 0;
    for (let k = 0; k < 4; k++) {
      if (!ITEMS[ks[k]]) return 'antiLib';
      if (ks[k] !== q.need[0] && ITEMS[ks[k]].temp.indexOf(q.band) >= 0) nFit++;
      if (ks[k] !== q.need[0] && ITEMS[ks[k]].temp.indexOf(q.band) < 0) return 'antiDistr';  // 干扰全适配带
    }
    if (nFit !== 3) return 'antiDistrN';
    if (q._miss !== 0 || q._answered || q.picked.length !== 0) return 'init';
    if (prevQ && prevQ.kind === q.kind && prevQ.band === q.band) return 'adjacent';
    return null;
  }
  /* ---- outfit ---- */
  if (ALL_OCCS.indexOf(q.occ) < 0) return 'occ';
  const size = q.need.length;
  if (dch === 1 && size !== 2) return 'dch1size';
  if (dch === 2 && size !== 3) return 'dch2size';
  if (dch === 2 && OCC3_POOL.indexOf(q.occ) < 0) return 'dch2occ';
  if (dch === 3 && OCC_TRAP_POOL.indexOf(q.occ) < 0) return 'dch3occ';
  const table = size === 2 ? OUT2 : OUT3;
  const variants = table[q.band + '|' + q.occ];
  if (!variants) return 'outKey';
  if (!variants.some(v => v.slice().join() === q.need.slice().join())) return 'outVariant';
  for (let k = 0; k < size; k++) if (!fits(q.need[k], q.band, q.occ)) return 'needFits';
  if (q.items.length !== size + 3) return 'itemsLen';
  const ks = q.items.map(t => t.item);
  if (ks.filter((v, i, a) => a.indexOf(v) === i).length !== ks.length) return 'itemsDup';
  if (!ks.every(v => ITEMS[v])) return 'itemsLib';
  for (let k = 0; k < q.need.length; k++) if (ks.indexOf(q.need[k]) < 0) return 'needIn';
  for (let k = 0; k < ks.length; k++) {                        // 干扰恒 !fits（唯一性铁律）
    if (q.need.indexOf(ks[k]) < 0 && fits(ks[k], q.band, q.occ)) return 'distrFits';
  }
  if (dch === 3) {                                             // 陷阱对件必在干扰（对件 !fits 时）
    let hasTrap = false;
    for (let k = 0; k < q.need.length; k++) {
      const mate = trapMate(q.need[k]);
      if (mate && !fits(mate, q.band, q.occ)) {
        hasTrap = true;
        if (ks.indexOf(mate) < 0) return 'dch3trapMiss';
      }
    }
    if (!hasTrap) return 'dch3noTrap';
  }
  if (prevQ && prevQ.kind === q.kind && prevQ.band === q.band && prevQ.occ === q.occ &&
      prevQ.need.slice().join() === q.need.slice().join()) return 'adjacent';
  if (q._miss !== 0 || q._answered || q.picked.length !== 0) return 'init';
  return null;
}
