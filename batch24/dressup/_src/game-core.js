/* ================= dressup 纯引擎：确定性关卡生成 + 三族判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   r10 题型三族（SPEC-BATCH24 §8；进度章号单调递增、难度章号 (ch-1)%4+1 循环）：
     dch1 conflict 主题冲突池：主题=3 配对 seeded 轮换（flat0 题0 锚 rain 全 2 件——教学演示沿 v1）；
       need=主题全集；候选 7=need+配对主题干扰 ≥min(3,配对件数)+补位（封闭池内）
     dch2 budget 装备预算：主题∈BUDGET_THEMES（5 个 3 件主题）；need=全集 3；budget=3；
       候选 6=need+配对干扰 2+补位 1；装包无即时对错反馈，满 3 即检（对留错退）
     dch3 anti 反向排除：主题 6 池 seeded；need=[错位件]∈MISFIT[主题]（相邻错位件互异）；
       候选=主题全集+错位件（3-4 片）；单击即判
     dch4 混合：题型序=三族轮转(seeded 偏移)+2 seeded（每关三族各 ≥1）；主题按各族规则
   铁律：need ⊆ 主题封闭表；贴纸候选 ⊆ 19 片封闭池且 need 片全在场；干扰不含 need 片；
   候选互异；相邻主题互异（anti 连题再叠加错位件互异）。
   判定（r10）：
     两击制（conflict/budget，share 同构）：tapSticker=选中/取消（同步），tapRabbit=贴上判定；
     anti 单击即判（weather r9 anti 同构）：tapSticker=对('right'/'done')/错('wrong')。
     budget 满员即检：错件自动退回（对件保留）——「取舍」而非「全选」；
     engPeel=budget 专属揭回（零惩罚，不计数）。 */
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
const dr_ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;

/* ---------- 题型序（mix 章：三族轮转+2 seeded——每关三族各 ≥1）
   rnd 消耗序=Python 对拍真值：off 1 次 + 尾 2 次（各 1 次），固定 ---------- */
function kindSeqOf(rnd) {
  const off = dr_ri(rnd, 0, 2);
  const seq = KINDS.map((k, i) => KINDS[(i + off) % 3]);
  seq.push(KINDS[dr_ri(rnd, 0, 2)], KINDS[dr_ri(rnd, 0, 2)]);
  return seq;
}

/* ---------- 每关主题序（rnd 同流保确定性；相邻主题互异 ≤8 掷兜底）
   conflict：3 配对池 seeded 掷（flat0 题0 恒 rain 教学锚——取数后覆写，消耗数不变）；
   budget：5 主题池 seeded 掷；anti：6 主题池 seeded 掷 ---------- */
function pickTheme(kind, rnd, flat, qi, prev) {
  let t;
  if (kind === 'conflict') {
    const pi = dr_ri(rnd, 0, 2), si = dr_ri(rnd, 0, 1);
    t = CONFLICT_PAIRS[pi][si];
    if (flat === 0 && qi === 0) t = 'rain';                 // 教学锚（v1 沿用：题面恒雨衣+雨靴）
  } else if (kind === 'budget') {
    t = BUDGET_THEMES[dr_ri(rnd, 0, BUDGET_THEMES.length - 1)];
  } else {
    t = THEME_IDS[Math.floor(rnd() * THEME_IDS.length)];
  }
  for (let k = 0; k < 8 && t === prev; k++) {
    if (kind === 'conflict') t = CONFLICT_PAIRS[dr_ri(rnd, 0, 2)][dr_ri(rnd, 0, 1)];
    else if (kind === 'budget') t = BUDGET_THEMES[dr_ri(rnd, 0, BUDGET_THEMES.length - 1)];
    else t = THEME_IDS[Math.floor(rnd() * THEME_IDS.length)];
  }
  return t;
}

/* ---------- 单题构建（按 kind；stem=题面句快照，时长模型与 UI 读它） ---------- */
function buildQuiz(theme, kind, misfit, rnd) {
  if (kind === 'anti') {
    const need = [misfit];
    const ids = shuffled(THEMES[theme].items.concat(need), rnd);
    const stickers = ids.map(id => ({ id: id, theme: STICKERS[id].theme, right: id === misfit }));
    return { kind: kind, theme: theme, stem: quizSpeech({ kind: kind, theme: theme }),
             need: need, stickers: stickers, placed: [], sel: null, budget: null,
             _miss: 0, _answered: false };
  }
  const need = THEMES[theme].items.slice();                 // conflict/budget：need=主题全集
  const pairItems = THEMES[PAIR_OF[theme]].items;
  if (kind === 'budget') {
    /* 预算：候选 6=need 3+配对干扰 2+补位 1（配对近形干扰保证取舍负荷） */
    const pairDs = shuffled(pairItems, rnd).slice(0, 2);
    const rest = STICKER_IDS.filter(id => need.indexOf(id) < 0 && pairDs.indexOf(id) < 0);
    const fill = shuffled(rest, rnd).slice(0, POOL_OF_KIND.budget - need.length - pairDs.length);
    const ids = shuffled(need.concat(pairDs, fill), rnd);
    const stickers = ids.map(id => ({ id: id, theme: STICKERS[id].theme, right: need.indexOf(id) >= 0 }));
    return { kind: kind, theme: theme, stem: quizSpeech({ kind: kind, theme: theme }),
             need: need, stickers: stickers, placed: [], sel: null, budget: BUDGET_N,
             _miss: 0, _answered: false };
  }
  /* conflict：候选 7=need+配对干扰 min(3,配对件数)+补位（跨主题干扰筛负荷） */
  const pairDs = shuffled(pairItems, rnd).slice(0, Math.min(3, pairItems.length));
  const rest = STICKER_IDS.filter(id => need.indexOf(id) < 0 && pairDs.indexOf(id) < 0);
  const fill = shuffled(rest, rnd).slice(0, POOL_OF_KIND.conflict - need.length - pairDs.length);
  const ids = shuffled(need.concat(pairDs, fill), rnd);
  const stickers = ids.map(id => ({ id: id, theme: STICKERS[id].theme, right: need.indexOf(id) >= 0 }));
  return { kind: kind, theme: theme, stem: quizSpeech({ kind: kind, theme: theme }),
           need: need, stickers: stickers, placed: [], sel: null, budget: null,
           _miss: 0, _answered: false };
}

/* ---------- 错位件序（anti：相邻错位件互异——确定性直选：prev 在池内则从余集取，池全 ≥2 恒可异） ---------- */
function pickMisfit(theme, rnd, prev) {
  const pool = MISFIT[theme];
  const cands = prev != null && pool.indexOf(prev) >= 0 ? pool.filter(x => x !== prev) : pool;
  return cands[dr_ri(rnd, 0, cands.length - 1)];
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道；生成关 flat≥20 每关随机章参数）
   rnd 消耗序（Python 对拍真值）：[dch(仅 flat≥20)] → 每题 [kind 序(mix：off+尾2)]
   →[theme 掷(+互异兜底掷)]→[misfit 掷(anti)]→[干扰构造+洗牌] ---------- */
const sigOfQ = q => q.kind + '|' + q.theme + '|' + q.need.join(',') + '|' + q.stickers.map(s => s.id).join(',');

function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), dch0 = diffOfCh(ch), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? dch0 : dr_ri(rnd, 1, 4);   // 生成关随机章参数（先取数保确定性）
  const kSeq = dch === 4 ? kindSeqOf(rnd) : null;
  const quizzes = [], sigs = new Set();                          // 关内签名互异（v1 同关 5 题互异沿袭）
  let prevTheme = null, prevMisfit = null;
  for (let qi = 0; qi < CH_LEN; qi++) {
    const kind = dch === 4 ? kSeq[qi] : KINDS[dch - 1];
    let t = pickTheme(kind, rnd, flat, qi, prevTheme);
    let misfit = kind === 'anti' ? pickMisfit(t, rnd, prevMisfit) : null;
    let q = buildQuiz(t, kind, misfit, rnd);
    let k = 0;
    while (sigs.has(sigOfQ(q)) && k++ < 8) {                     // 签名重复（同题面同栏序）→ 整题重掷（确定性有界）
      t = pickTheme(kind, rnd, flat, qi, prevTheme);
      misfit = kind === 'anti' ? pickMisfit(t, rnd, prevMisfit) : null;
      q = buildQuiz(t, kind, misfit, rnd);
    }
    sigs.add(sigOfQ(q));
    quizzes.push(q);
    prevTheme = t; prevMisfit = misfit;
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv,
           quizzes: quizzes, step: 0, retries: 0, done: false };
}

/* ---------- 第一击引擎（无 DOM）：engTapSticker(L, i) —— 点贴纸栏第 i 片
   anti（单击即判，weather r9 同构）：
   'right'  点中错位件 → 本题完成推进（非末题）
   'done'   末题点中 = 整关通关
   'wrong'  点中合适件：该题 miss+1（retries 全关累计=星级口径），片摇头不推进
   conflict/budget（两击制，share 同构）：
   'sel'    选中（高亮，等第二击点兔子）
   'unsel'  再点同一片=取消选中
   'again'  点已贴上的片（早退零惩罚不计数，防御层）
   null     非法下标 / 关卡已结束 ---------- */
function engTapSticker(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.stickers.length) return null;
  if (q.kind === 'anti') {
    if (q.stickers[i].right) {
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    q._miss++;
    L.retries++;
    return 'wrong';
  }
  if (q.placed.indexOf(q.stickers[i].id) >= 0) return 'again';
  q.sel = (q.sel === i) ? null : i;
  return q.sel === i ? 'sel' : 'unsel';
}

/* ---------- 第二击引擎（无 DOM）：engTapRabbit(L) —— 把选中片贴上（conflict/budget）
   'hold'   conflict：贴对一件 need 未齐挂起 / budget：装入未满员（对错都不判——预算取舍核心）
   'right'  conflict：need 全贴齐 / budget：满员检查全对 → 本题完成推进（非末题）
   'done'   末题完成 = 整关通关
   'wrong'  conflict：贴错（非 need 片）弹回 / budget：满员检查有错件（miss+1，错件自动
            退回对件保留——「放回去再挑一挑」）
   'full'   budget：槽满（防御层——满员即检下 placed 恒 <budget，正常不可达）
   'nosel'  无选中 / anti 题点兔子（反向题无第二击语义）
   null     关卡已结束 ---------- */
function engTapRabbit(L) {
  if (!L || L.done || L.step >= L.quizzes.length) return null;
  const q = L.quizzes[L.step];
  if (!q || q._answered) return null;
  if (q.kind === 'anti') return 'nosel';
  if (q.sel == null) return 'nosel';
  const st = q.stickers[q.sel];
  q.sel = null;
  if (q.kind === 'budget') {
    if (q.placed.length >= q.budget) return 'full';
    q.placed.push(st.id);
    if (q.placed.length < q.budget) return 'hold';          // 未满员：无即时对错反馈
    const hasWrong = q.placed.some(id => q.need.indexOf(id) < 0);
    if (!hasWrong) {                                        // 恰满且全对
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    q._miss++;
    L.retries++;
    q.placed = q.placed.filter(id => q.need.indexOf(id) >= 0);   // 错件退回，对件保留
    return 'wrong';
  }
  /* conflict（v1） */
  if (st.right && q.placed.indexOf(st.id) < 0) {
    q.placed.push(st.id);
    if (q.need.every(id => q.placed.indexOf(id) >= 0)) {
      q._answered = true;
      L.step++;
      if (L.step >= L.quizzes.length) { L.done = true; return 'done'; }
      return 'right';
    }
    return 'hold';
  }
  q._miss++;
  L.retries++;
  return 'wrong';
}

/* ---------- 揭回引擎（budget 专属）：engPeel(L, idx) —— 揭回已装第 idx 件（零惩罚）
   返回揭回的贴纸 id；非 budget / 越界 / 已答 → false ---------- */
function engPeel(L, idx) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.kind !== 'budget' || q._answered) return false;
  if (!Number.isInteger(idx) || idx < 0 || idx >= q.placed.length) return false;
  const id = q.placed[idx];
  q.placed.splice(idx, 1);
  return id;
}
const engWon = L => !!L && L.done;
/* 星级（§0.57 口径沿 v1）：全关贴错 0=3 星 / 1-2=2 星 / ≥3=1 星。永不 0 星 */
const engStars = L => !L ? 1 : (L.retries === 0 ? 3 : (L.retries <= 2 ? 2 : 1));
/* 救援/教学用：下一件未完成目标片下标（conflict/budget=未贴 need 片；anti=错位件） */
const nextNeededIdx = q => {
  if (!q) return -1;
  for (let i = 0; i < q.stickers.length; i++) {
    if (q.stickers[i].right && q.placed.indexOf(q.stickers[i].id) < 0) return i;
  }
  return -1;
};

/* ---------- 结构校验（verify 用，返回失败原因或 null）：题型/封闭表/件数/干扰构成/
   贴纸池封闭 19/need 片在场/干扰不含 need/候选互异/相邻互异/初始态干净 ---------- */
function structWhy(q, dch, flat, qi, prevQ) {
  if (!q || !THEMES[q.theme]) return 'theme';
  if (KINDS.indexOf(q.kind) < 0) return 'kind';
  if (dch === 1 && q.kind !== 'conflict') return 'dch1kind';
  if (dch === 2 && q.kind !== 'budget') return 'dch2kind';
  if (dch === 3 && q.kind !== 'anti') return 'dch3kind';
  const items = THEMES[q.theme].items;
  const isAnchor = flat === 0 && qi === 0;                  // 教学演示题（贴雨衣雨靴）锚点
  if (isAnchor && (q.theme !== 'rain' || q.kind !== 'conflict')) return 'anchor';
  /* 封闭表：need ⊆ 主题表（anti 除外——错位件按定义跨主题，由下方 antiMisfit 校验） */
  if (q.kind !== 'anti') {
    for (let k = 0; k < q.need.length; k++) if (items.indexOf(q.need[k]) < 0) return 'needTable';
  }
  const ids = q.stickers.map(s => s.id);
  const poolOk = q.stickers.length === (q.kind === 'anti' ? items.length + 1 : POOL_OF_KIND[q.kind]);
  if (!poolOk) return 'poolLen:' + q.stickers.length;
  if (ids.filter((v, i, a) => a.indexOf(v) === i).length !== ids.length) return 'poolDup';
  if (!ids.every(v => STICKERS[v])) return 'poolLib';
  for (let k = 0; k < q.need.length; k++) if (ids.indexOf(q.need[k]) < 0) return 'needMissing';
  const rights = q.stickers.filter(s => s.right);
  if (rights.length !== q.need.length) return 'rightCount';
  for (let k = 0; k < q.stickers.length; k++) {
    const inNeed = q.need.indexOf(q.stickers[k].id) >= 0;
    if (q.stickers[k].right !== inNeed) return 'rightFlag';
    if (q.stickers[k].theme !== STICKERS[q.stickers[k].id].theme) return 'themeField';
  }
  if (q.kind === 'anti') {
    /* 反向：need=[错位件]∈MISFIT 表；其余片=主题全集（对件）；相邻错位件互异 */
    if (q.need.length !== 1) return 'antiLen';
    if (MISFIT[q.theme].indexOf(q.need[0]) < 0) return 'antiMisfit';
    if (!items.every(id => ids.indexOf(id) >= 0)) return 'antiItems';
    if (prevQ && prevQ.kind === 'anti' && prevQ.need[0] === q.need[0]) return 'adjMisfit';
  } else {
    /* conflict/budget：need=主题全集（rain 2/其余 3）；配对主题干扰下限 */
    const setEq = q.need.length === items.length && items.every(v => q.need.indexOf(v) >= 0);
    if (!setEq) return 'needFull';
    const pairN = q.stickers.filter(s => s.theme === PAIR_OF[q.theme] && !s.right).length;
    const wantPair = q.kind === 'budget' ? 2 : Math.min(3, THEMES[PAIR_OF[q.theme]].items.length);
    if (pairN < wantPair) return 'pairDistract:' + pairN;
    if (q.kind === 'budget') {
      if (BUDGET_THEMES.indexOf(q.theme) < 0) return 'budgetTheme';   // rain 2 件不入预算章
      if (q.budget !== BUDGET_N) return 'budgetN';
    }
  }
  /* 相邻主题互异（防同关连题同主题单调） */
  if (prevQ && prevQ.theme === q.theme) return 'adjacent';
  /* 初始态干净 */
  if (q.placed.length !== 0 || q.sel !== null || q._miss !== 0 || q._answered) return 'init';
  if (q.stem !== quizSpeech({ kind: q.kind, theme: q.theme })) return 'stem';
  return null;
}
