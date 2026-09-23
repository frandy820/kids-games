/* ================= weather 纯引擎 v2（条件推理）：确定性生成 + 点选/提交判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关。
   章型 v2（SPEC-BATCH23 §1 v2，2026-09-13 家长审计改造——单条件配对升级条件推理）：
     dch1 'one'   双条件单选（场景+天气 → 核心 1 件；干扰 ∉ 当题天气类 → 候选唯一正确）
     dch2 'multi' 多条件叠加（两条件 → 2 件；选满点「穿好啦」提交：多点=清空重选+miss / 少点=继续）
     dch3 'temp'  温度计区间（9 档温度 5 区间 + 边界题 8/16/24；区间正装=need）
     dch4 'who'+'anti'+混合（家人差异化=厚薄梯子升降档 / 反向题=唯一「不用带」/ 夹 one·multi·temp）
   唯一性铁律（每题恰 need 数个正确候选）：
     one=候选中当题天气类唯一 / multi=候选中满足条件的恰 2 件=need /
     temp=候选中当区间衣物恰=outfit / who=梯子 5 件唯一正确档 / anti=候选中∉场景恰 1 件=need。
   flat0 题0 锚定 cm0（雨+风 [raincoat,jacket]——教学演示：wea_tut_watch「看！下雨要穿雨衣」与动作一致）。 */
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

/* ---------- 静态题序真值表（确定性+覆盖保证；顺序再 seeded 洗牌求变化）
   dch1 行集（flat0 q0=锚定 multi，q1-4 用 ROW_SETS[0] 的 4 行；跨 5 关 9 行全覆盖 ≥2 次） */
const ROW_SETS = [
  ['r1', 'r2', 'r3', 'r4'],
  ['r0', 'r1', 'r5', 'r6', 'r7'],
  ['r2', 'r3', 'r8', 'r0', 'r5'],
  ['r4', 'r6', 'r7', 'r8', 'r1'],
  ['r3', 'r5', 'r6', 'r7', 'r8']
];
/* dch3 温度表（每关 ≥1 边界题 8/16/24 + 相邻区间互异；跨 5 关 9 档全覆盖） */
const TEMP_LISTS = [
  [-5, 8, 25, 12, 32],
  [5, 16, 18, -5, 24],
  [24, 5, 12, -5, 25],
  [32, 8, 16, 5, 18],
  [12, 25, 8, 24, -5]
];
/* dch4 题型表（每关 who/anti 各 ≥1 + 三型齐备 + 相邻题型互异） */
const KIND_LISTS = [
  ['who', 'one', 'anti', 'temp', 'multi'],
  ['anti', 'multi', 'who', 'one', 'temp'],
  ['temp', 'who', 'multi', 'anti', 'one'],
  ['who', 'temp', 'anti', 'multi', 'one'],
  ['anti', 'one', 'who', 'multi', 'temp']
];

/* ---------- 题序生成（rnd 同流保确定性） ---------- */
function specSeqOf(dch, rnd, flat) {
  const seq = [];
  if (dch === 1) {
    const rows = flat < STATIC_LEVELS
      ? ROW_SETS[flat % CH_LEN] : [];                              // 静态关内索引（flat0-4；0 关仅 4 行——q0 锚定））
    let pool = rows.length ? rows.slice() : null;
    if (!pool) {                                                  // 生成关：seeded 抽 5 行互异
      pool = shuffled(CH1_ROWS.map(r => r.id), rnd).slice(0, CH_LEN);
    }
    let order = shuffled(pool, rnd);
    for (let t = 0; t < 8 && order.length > 1 && order[0] === order[1]; t++) order = shuffled(pool, rnd);
    if (flat === 0) seq.push({ kind: 'multi', combo: COMBOS[0] });   // 教学锚定（cm0）
    order.forEach(id => seq.push({ kind: 'one', row: CH1_ROWS.find(r => r.id === id) }));
    return seq;
  }
  if (dch === 2) {
    shuffled(COMBOS, rnd).forEach(c => seq.push({ kind: 'multi', combo: c }));
    return seq;
  }
  if (dch === 3) {
    let temps;
    if (flat < STATIC_LEVELS) {
      temps = TEMP_LISTS[flat % CH_LEN].slice();                   // 静态关内索引（flat10-14）
    } else {
      temps = null;                                               // 生成关：seeded 抽（互异+边界+相邻区间互异）
      for (let att = 0; att < 40 && !temps; att++) {
        const cand = shuffled(TEMPS, rnd).slice(0, CH_LEN);
        const hasB = cand.some(t => BOUNDARY_TEMPS.indexOf(t) >= 0);
        let adjOk = true;
        for (let k = 1; k < cand.length; k++) if (zoneOfTemp(cand[k]) === zoneOfTemp(cand[k - 1])) adjOk = false;
        if (hasB && adjOk) temps = cand;
      }
      if (!temps) temps = TEMP_LISTS[flat % 5].slice();           // 兜底（40 掷未中→定表）
    }
    temps.forEach(t => seq.push({ kind: 'temp', temp: t }));
    return seq;
  }
  /* dch4：题型表（who/anti 各 ≥1 + 三型齐备 + 相邻互异）+ 同关参数互异（行/组合/温度不重复） */
  let kinds;
  if (flat < STATIC_LEVELS) {
    kinds = KIND_LISTS[flat % CH_LEN].slice();                   // 静态关内索引（flat15-19）
  } else {
    kinds = ['who', 'anti'];
    const rest = ['one', 'multi', 'temp'];
    for (let k = 0; k < 3; k++) kinds.push(rest[Math.floor(rnd() * 3)]);
    for (let k = 1; k < kinds.length; k++) {                      // 相邻题型互异修复（≤8 掷）
      for (let t = 0; t < 8 && kinds[k] === kinds[k - 1]; t++) kinds[k] = rest[Math.floor(rnd() * 3)];
    }
  }
  const seen = {};                                                // 同关参数去重（one 行/multi 组合/temp 温度）
  kinds.forEach(kd => {
    if (kd === 'one') {
      let r = CH1_ROWS[Math.floor(rnd() * CH1_ROWS.length)];
      for (let t = 0; t < 8 && seen['r:' + r.id]; t++) r = CH1_ROWS[Math.floor(rnd() * CH1_ROWS.length)];
      seen['r:' + r.id] = 1;
      seq.push({ kind: 'one', row: r });
    } else if (kd === 'multi') {
      let c = COMBOS[Math.floor(rnd() * COMBOS.length)];
      for (let t = 0; t < 8 && seen['m:' + c.id]; t++) c = COMBOS[Math.floor(rnd() * COMBOS.length)];
      seen['m:' + c.id] = 1;
      seq.push({ kind: 'multi', combo: c });
    } else if (kd === 'temp') {
      let tv = TEMPS[Math.floor(rnd() * TEMPS.length)];
      for (let t = 0; t < 8 && seen['t:' + tv]; t++) tv = TEMPS[Math.floor(rnd() * TEMPS.length)];
      seen['t:' + tv] = 1;
      seq.push({ kind: 'temp', temp: tv });
    } else seq.push({ kind: kd });                                // who/anti 参数在 buildQuiz 内 seeded
  });
  return seq;
}

/* ---------- 单题构建（rnd 同流；卡数 one/multi/temp=6 / who=5 / anti=4） ---------- */
function buildQuiz(spec, rnd) {
  if (spec.kind === 'one') {
    const row = spec.row;
    const wCls = row.weather;                                     /* weather 值==cls（sun/rain/snow/wind） */
    const elig = Object.keys(CLOTHES).filter(id => CLOTHES[id].cls !== wCls);
    const ds = shuffled(elig, rnd).slice(0, 5);
    const cards = shuffled([row.need].concat(ds), rnd)
      .map(id => ({ id: id }));
    return { kind: 'one', id: row.id, conds: [{ k: 'weather', v: row.weather }, { k: 'scene', v: row.scene }],
             stem: row.stem, scene: row.weather, need: [row.need], cards: cards,
             picked: [], _miss: 0, _answered: false };
  }
  if (spec.kind === 'multi') {
    const cb = spec.combo;
    const nCls = {}; cb.need.forEach(id => nCls[CLOTHES[id].cls] = 1);
    const elig = Object.keys(CLOTHES).filter(id => !nCls[CLOTHES[id].cls]);
    const ds = shuffled(elig, rnd).slice(0, 4);
    const cards = shuffled(cb.need.slice().concat(ds), rnd)
      .map(id => ({ id: id }));
    return { kind: 'multi', id: cb.id, conds: cb.conds.slice(), stem: cb.stem, scene: cb.scene,
             need: cb.need.slice(), cards: cards, picked: [], _miss: 0, _answered: false };
  }
  if (spec.kind === 'temp') {
    const t = spec.temp, Z = zoneOfTemp(t);
    const outfit = ZONES[Z].outfit.slice();
    const elig = Object.keys(CLOTHES).filter(id => CLOTHES[id].zone !== Z);
    const ds = shuffled(elig, rnd).slice(0, 6 - outfit.length);
    const cards = shuffled(outfit.concat(ds), rnd)
      .map(id => ({ id: id }));
    return { kind: 'temp', id: 't' + t, conds: [{ k: 'temp', v: t }],
             stem: '今天' + tempCn(t) + '，穿什么', scene: 'temp', temp: t,
             need: outfit, cards: cards, picked: [], _miss: 0, _answered: false };
  }
  if (spec.kind === 'who') {
    const pk = rnd() < 0.5 ? 'mom' : 'bunny';
    const t = WHO_TEMPS[Math.floor(rnd() * WHO_TEMPS.length)];
    const Z = zoneOfTemp(t);
    const need = LADDER[Math.max(0, Math.min(4, Z - 1 + PERSONS[pk].shift))];
    const cards = shuffled(LADDER.slice(), rnd).map(id => ({ id: id }));
    return { kind: 'who', id: 'w_' + pk + '_' + t, conds: [{ k: 'temp', v: t }, { k: 'person', v: pk }],
             stem: '今天' + tempCn(t) + '，' + PERSONS[pk].n + (pk === 'mom' ? '怕冷，给妈妈选一件' : '怕热，给小兔子选一件'),
             scene: 'who:' + pk, temp: t, person: pk, need: [need], cards: cards,
             picked: [], _miss: 0, _answered: false };
  }
  /* anti */
  const sc = ANTI_SCENES[Math.floor(rnd() * ANTI_SCENES.length)];
  const nonUsed = Object.keys(CLOTHES).filter(id => sc.used.indexOf(id) < 0);
  const need = shuffled(nonUsed, rnd)[0];
  const cards = shuffled(shuffled(sc.used, rnd).slice(0, 3).concat([need]), rnd)
    .map(id => ({ id: id }));
  return { kind: 'anti', id: 'a_' + sc.id, conds: [{ k: 'scene', v: sc.id }],
           stem: sc.stem, scene: sc.id, need: [need], cards: cards,
           picked: [], _miss: 0, _answered: false };
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 随机章参数） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : ri(rnd, 1, 4);        // 生成关随机章参数（先取数保确定性）
  const specs = specSeqOf(dch, rnd, flat);
  const quizzes = [];
  for (let qi = 0; qi < CH_LEN; qi++) quizzes.push(buildQuiz(specs[qi], rnd));
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 点卡引擎（无 DOM）：engTapCloth(L, i) —— 点第 i 张衣物卡
   单件题（one/temp 单装/who/anti）即时判定：
     'right' 答对推进 / 'done' 末题答对=通关 / 'wrong' 错选（miss+1，卡不灰可重选）
   多件题（multi / temp 两件装）：点卡=勾选切换（提交制——判定在 engSubmit）：
     'pick' 勾选 / 'unpick' 取消勾选（零惩罚）
   null 非法下标或关卡已结束 ---------- */
function engTapCloth(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) return null;
  if (q.need.length === 1) {
    if (q.cards[i].id === q.need[0]) {
      q.picked = [i];
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

/* ---------- 提交引擎（multi/两件 temp 题「穿好啦」；bubble r1 先例）：
   'right' 勾选集==need 推进 / 'done' 末题提交成=通关
   'wrong_more' 勾选含非 need 件（多点/选错件）：清空重选 + miss+1（真实错误路径）
   'wrong_less' 勾选 ⊂ need 且未选满：保留勾选继续找（合法路径不算 miss）
   null 关卡已结束 / 单件题不适用 ---------- */
function engSubmit(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered || q.need.length < 2) return null;
  const ids = q.picked.map(i => q.cards[i].id);
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
/* 星级（口径承 v1）：全关错选/多点 0=3★ / 1-2=2★ / ≥3=1★。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 救援/教学用：下一件应选卡下标（单件题=right 卡；多件题=未勾选的 need 卡；勾满=-1 指提交钮） */
function nextNeededIdx(q) {
  if (!q) return -1;
  if (q.need.length === 1) {
    for (let i = 0; i < q.cards.length; i++) if (q.cards[i].id === q.need[0]) return i;
    return -1;
  }
  for (let i = 0; i < q.cards.length; i++) {
    if (q.need.indexOf(q.cards[i].id) >= 0 && q.picked.indexOf(i) < 0) return i;
  }
  return -1;
}

/* ---------- 结构校验（verify 用，返回失败原因或 null）：题型/条件/need 真值/唯一正确/卡数/互异/初始态 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q) return 'quiz';
  const KINDS = ['one', 'multi', 'temp', 'who', 'anti'];
  if (KINDS.indexOf(q.kind) < 0) return 'kind';
  if (!Array.isArray(q.conds) || q.conds.length < 1) return 'conds';
  const isAnchor = flat === 0 && qi === 0;
  if (isAnchor) {
    if (q.kind !== 'multi' || q.id !== 'cm0' || q.need.join() !== COMBOS[0].need.join()) return 'anchor';
  } else if (dch === 1 && q.kind !== 'one') return 'dch1kind';
  else if (dch === 2 && q.kind !== 'multi') return 'dch2kind';
  else if (dch === 3 && q.kind !== 'temp') return 'dch3kind';
  else if (dch === 4 && KINDS.indexOf(q.kind) < 0) return 'dch4kind';
  /* need 真值（按题型对表） */
  if (q.kind === 'one') {
    const row = CH1_ROWS.find(r => r.id === q.id);
    if (!row) return 'rowId';
    if (q.need.length !== 1 || q.need[0] !== row.need) return 'rowNeed';
    if (q.conds[0].k !== 'weather' || q.conds[0].v !== row.weather) return 'rowW';
    if (q.conds[1].k !== 'scene' || q.conds[1].v !== row.scene) return 'rowS';
  } else if (q.kind === 'multi') {
    const cb = COMBOS.find(c => c.id === q.id);
    if (!cb) return 'comboId';
    if (q.need.length !== 2 || q.need.slice().sort().join() !== cb.need.slice().sort().join()) return 'comboNeed';
    if (JSON.stringify(q.conds) !== JSON.stringify(cb.conds)) return 'comboConds';
  } else if (q.kind === 'temp') {
    const Z = zoneOfTemp(q.conds[0].v);
    if (q.conds[0].k !== 'temp') return 'tempCond';
    if (q.temp !== q.conds[0].v) return 'tempField';
    if (q.need.slice().sort().join() !== ZONES[Z].outfit.slice().sort().join()) return 'tempOutfit';
  } else if (q.kind === 'who') {
    const t = q.conds[0].v, pk = q.conds[1].v, Z = zoneOfTemp(t);
    if (q.conds[0].k !== 'temp' || q.conds[1].k !== 'person') return 'whoCond';
    if (!PERSONS[pk]) return 'whoPerson';
    if (WHO_TEMPS.indexOf(t) < 0) return 'whoTemp';
    const exp = LADDER[Math.max(0, Math.min(4, Z - 1 + PERSONS[pk].shift))];
    if (q.need.length !== 1 || q.need[0] !== exp) return 'whoNeed';
  } else {
    const sc = ANTI_SCENES.find(s => s.id === q.id.slice(2));
    if (!sc) return 'antiId';
    if (q.conds[0].k !== 'scene' || q.conds[0].v !== sc.id) return 'antiCond';
    if (q.need.length !== 1 || sc.used.indexOf(q.need[0]) >= 0) return 'antiNeed';
  }
  /* 卡池：数量/互异/在库/唯一正确（真值按题型独立推导，不从 right 标志读） */
  const wantN = q.kind === 'anti' ? 4 : (q.kind === 'who' ? 5 : 6);
  if (q.cards.length !== wantN) return 'cardsLen:' + q.kind;
  const ids = q.cards.map(c => c.id);
  if (ids.filter((v, i, a) => a.indexOf(v) === i).length !== ids.length) return 'cardsDup';
  if (!ids.every(v => CLOTHES[v])) return 'cardsLib';
  let nRight = 0;
  if (q.kind === 'one') {
    const row = CH1_ROWS.find(r => r.id === q.id);
    ids.forEach(id => { if (CLOTHES[id].cls === row.weather) nRight++; });
    if (nRight !== 1 || ids.indexOf(q.need[0]) < 0) return 'oneUnique';
  } else if (q.kind === 'multi') {
    const cb = COMBOS.find(c => c.id === q.id);
    const nCls = {}; cb.need.forEach(id => nCls[CLOTHES[id].cls] = 1);
    ids.forEach(id => { if (nCls[CLOTHES[id].cls]) nRight++; });
    if (nRight !== 2) return 'multiUnique';
    for (let k = 0; k < 2; k++) if (ids.indexOf(cb.need[k]) < 0) return 'multiNeedIn';
  } else if (q.kind === 'temp') {
    const Z = zoneOfTemp(q.conds[0].v);
    ids.forEach(id => { if (CLOTHES[id].zone === Z) nRight++; });
    if (nRight !== ZONES[Z].outfit.length) return 'tempUnique';
    ZONES[Z].outfit.forEach(id => { if (ids.indexOf(id) < 0) nRight = -1; });
    if (nRight === -1) return 'tempNeedIn';
  } else if (q.kind === 'who') {
    if (ids.slice().sort().join() !== LADDER.slice().sort().join()) return 'whoLadder';
    if (ids.indexOf(q.need[0]) < 0) return 'whoNeedIn';
  } else {
    const sc = ANTI_SCENES.find(s => s.id === q.id.slice(2));
    ids.forEach(id => { if (sc.used.indexOf(id) < 0) nRight++; });
    if (nRight !== 1 || ids.indexOf(q.need[0]) < 0) return 'antiUnique';
  }
  /* 相邻 (题型+签名) 互异（防同关连题同型单调） */
  if (prevQ && prevQ.kind === q.kind && prevQ.id === q.id) return 'adjacent';
  /* 初始态干净 */
  if (q.picked.length !== 0 || q._miss !== 0 || q._answered) return 'init';
  return null;
}
