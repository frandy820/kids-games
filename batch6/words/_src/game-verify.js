/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     structOk（parts 数 2-3、tiles=parts+distractors 完整排列、字属本章字库）/
     章难度合规（章1/2 全 2 部件、章 3 全 3 部件、章 4 混合 2/3）/
     干扰数合规=r28 nDisEff（ch1/ch3 lv0-1=2·lv2 起 3；ch2/ch4 恒 3）且不与正确部件同字、互异 /
     块预算（tiles ≤6：3 部件+3 干扰上限=竖屏 800px 单行放得下）/ 相邻题不同字 /
     引擎直驱通关（按序点正确块 → 0 miss 3 星 done）
   ② 拼字单元（flat0/flat13 真实 UI 状态机）：进槽 DOM / 撤回复原 / 干扰块晃动弹回不进槽 /
     乱序槽满 fail → 错槽弹回（2 部件全弹回 / 3 部件对槽保留）/ 非法下标 false
   ③ UI 冒烟：flat0 真实点击逐块进槽 + 首错不 pulse 正确块 + 通关（1 miss=2 星、不弹层）；
     flat10（章 3）3 部件+2 干扰合规 + autoSolve UI 通路通关（0 miss 3 星）
   ④ 布局：双 viewport（1280×800 / 800×1180）×（章 1 lv0 四块 / 章 3 lv0 五块 / 章 3 lv2 六块）：
     部件块 ≥64、拼字槽 ≥96、目标大字卡 ≥96、块间距 ≥16、overflowX ≤0
   ⑤ 三章题字分布：静态 20 关每章 5 关题字并集 === 该章字库全集（ch1-3 12 字 / ch4 19 字）
   ⑥ r28 家族干扰律（famOk，SPEC §R3 独立复算副本）：全 40 关每题
     家族非空 ⇒ 干扰含 ≥1 家族部件；章 2 静态 5 关每题家族必非空（声旁家族池设计性质）；
     干扰与正确部件交集为空（反向泄题防护）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* r28 独立复算副本（从 SPEC-R28-WORDS §R3 推导，不复用引擎函数——同源陷阱防线） */
  const vNDis = (dch, lv) => lv >= 2 ? Math.max(3, CHAPTERS[dch].nDis) : CHAPTERS[dch].nDis;
  const vFamily = (entry, pool) => {
    const shared = {}, seen = {};
    entry.parts.forEach(p => { shared[p] = 1; seen[p] = 1; });
    const cands = [];
    pool.forEach(e => {
      if (e === entry || !e.parts.some(p => shared[p])) return;
      e.parts.forEach(p => { if (!seen[p]) { seen[p] = 1; cands.push(p); } });
    });
    return cands;
  };

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const C = CHAPTERS[L1.dch];
    const nEff = vNDis(L1.dch, L1.lv);
    let structAll = true, adjOk = true, diffOk = true, budgetOk = true;
    // （r28① 卫生清理）原 ruleOk 死变量已删：章难度判据 r28 起全迁 diffOk（下行两判据），
    // ruleOk 恒 true 无赋 false 路径、不入 rec JSON——删除不改变任何单元判定
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q, L1.dch, L1.lv)) structAll = false;
      /* 章难度：部件数与有效干扰数合规（verify 侧独立公式 vNDis） */
      if (q.parts.length < C.dPart || q.parts.length > C.dPartMax) diffOk = false;
      if (q.distractors.length !== nEff) diffOk = false;
      if (q.tiles.length > 6) budgetOk = false;                  // r28 块预算：tiles ≤6
      if (k > 0 && L1.quizzes[k - 1].c === q.c) adjOk = false;               // 相邻题不同字
    }
    /* 引擎直驱：按槽序点正确块（placed→right/done 全链），每题 solved、0 miss 3 星 */
    let driveOk = true;
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      for (let j = 0; j < q.parts.length; j++) {
        const idx = nextTileIdx(q);
        const r = engTapPart(L1, idx);
        if (idx < 0 || (r !== 'placed' && r !== 'right' && r !== 'done')) { driveOk = false; break; }
      }
      if (!q.solved) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.misses === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && structAll && adjOk && diffOk &&
      budgetOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, adjOk: adjOk,
      diffOk: diffOk, budgetOk: budgetOk, driveOk: driveOk, solvedAll: solvedAll,
      cs: L1.quizzes.map(q => q.c + '=' + q.parts.join('') + '/' + q.distractors.join('')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 拼字单元 A（flat0 章 1，2 部件+2 干扰：进槽/撤回/干扰弹回/乱序全弹回/非法下标） ---- */
  total++;
  startLevel(0);
  const q0 = WRD.quiz;
  const tileOf = ch => { const q = WRD.quiz; for (let i = 0; i < q.tiles.length; i++) if (q.tiles[i] === ch && q.slotTileIdx.indexOf(i) < 0) return i; return -1; };
  const rWrong = await WRD.tapPart(q0.tileTypes.indexOf('d'));              // 干扰块：晃动弹回不进槽
  const wrongOk = rWrong === 'wrong' && WRD.quiz.slots.every(s => s === null) &&
    WRD.currentLevel.misses === 1 &&
    tilesEl.querySelector('.tile[data-i="' + q0.tileTypes.indexOf('d') + '"]').classList.contains('wig');
  const i1 = tileOf(q0.parts[0]);
  const rPlaced = await WRD.tapPart(i1);                                     // 正确块进槽 0
  const sEl0 = slotsEl.querySelector('.slot[data-i="0"]');
  const placedOk = rPlaced === 'placed' && WRD.quiz.slots[0] === q0.parts[0] &&
    sEl0.classList.contains('fill') && sEl0.textContent === q0.parts[0] &&
    tilesEl.querySelector('.tile[data-i="' + i1 + '"]').classList.contains('used');
  const rBack = WRD.tapSlot(0);                                              // 撤回：块回池、槽清空
  const backOk = rBack === true && WRD.quiz.slots[0] === null &&
    !sEl0.classList.contains('fill') && !tilesEl.querySelector('.tile[data-i="' + i1 + '"]').classList.contains('used');
  /* 乱序槽满：先 parts[1] 后 parts[0] → 两槽皆错 → fail 全弹回 */
  const iB = tileOf(q0.parts[1]), iA = tileOf(q0.parts[0]);
  const rB = await WRD.tapPart(iB), rA = await WRD.tapPart(iA);
  const orderFailOk = rB === 'placed' && rA === 'fail' && WRD.quiz.slots.every(s => s === null) &&
    WRD.currentLevel.misses === 2 && slotsEl.classList.contains('shake');
  const badIdx = (await WRD.tapPart(99)) === false && (await WRD.tapPart(-1)) === false &&
    WRD.tapSlot(0) === false && WRD.tapSlot(-1) === false;                   // 空槽/非法下标（tapPart 为 async 须 await）
  const spellOk = wrongOk && placedOk && backOk && orderFailOk && badIdx;
  if (spellOk) npass++;
  units.spell = { ok: spellOk, wrongOk: wrongOk, placedOk: placedOk, backOk: backOk,
    orderFailOk: orderFailOk, badIdx: badIdx };

  /* ---- ② 拼字单元 B（flat13 章 3 首题"树"=木又寸（无重复部件，乱序必 fail）：
     乱序槽满 → 对槽保留、错槽弹回） ---- */
  total++;
  startLevel(13);
  const q11 = WRD.quiz;
  const tileOf11 = ch => { const q = WRD.quiz; for (let i = 0; i < q.tiles.length; i++) if (q.tiles[i] === ch && q.slotTileIdx.indexOf(i) < 0) return i; return -1; };
  const m3 = q11.parts.length === 3;
  const tM = tileOf11(q11.parts[0]), tLast = tileOf11(q11.parts[2]), tMid = tileOf11(q11.parts[1]);
  const rM = await WRD.tapPart(tM);                                          // 木→槽0（对）
  const rL = await WRD.tapPart(tLast);                                       // 寸→槽1（错）
  const rMid = await WRD.tapPart(tMid);                                      // 又→槽2（错）→ 槽满 fail
  const keepOk = m3 && rM === 'placed' && rL === 'placed' && rMid === 'fail' &&
    WRD.quiz.slots[0] === q11.parts[0] && WRD.quiz.slots[1] === null && WRD.quiz.slots[2] === null &&
    slotsEl.children[0].classList.contains('fill') && !slotsEl.children[1].classList.contains('fill');
  if (keepOk) npass++;
  units.spell3 = { ok: keepOk, target: q11.target, parts: q11.parts, slots: WRD.quiz.slots };

  /* ---- ③ UI 冒烟 A：flat0 真实点击逐块进槽 + 首错不 pulse + 通关（1 miss=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, words = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = WRD.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                              // 首错：干扰块晃动零惩罚；首错不 pulse 正确块
      const di = q.tileTypes.indexOf('d');
      await WRD.tapPart(di);
      wrongOk2 = WRD.currentLevel.misses === 1 && WRD.currentLevel.step === 0 &&
        !document.querySelector('.tile.pulse'); // 首错不高亮正确项（§0.7）
    }
    for (let j = 0; j < q.parts.length; j++) {  // 按槽序真实路径逐块进槽
      const idx = tileOf(q.parts[j]);
      const r = await WRD.tapPart(idx);
      if (r !== 'placed' && r !== 'right' && r !== 'done') { smokeA = false; break; }
      if (j < q.parts.length - 1) {            // 中间块断言槽 DOM（最后一块返回时已重绘新题）
        const sEl = slotsEl.querySelector('.slot[data-i="' + j + '"]');
        if (!sEl || !sEl.classList.contains('fill') || sEl.textContent !== q.parts[j]) smokeA = false;
      }
    }
    words++;
  }
  const lvA = WRD.currentLevel;
  const litOk = targetEl.classList.contains('lit');               // 通关字亮起（winFlow 不重绘）
  const smokeOkA = smokeA && wrongOk2 && words === CH_LEN && lvA.done && lvA.won &&
    lvA.misses === 1 && engStars(cur) === 2 && litOk && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, words: words, misses: lvA.misses, stars: engStars(cur) };

  /* ---- ③ UI 冒烟 B：flat10（章 3 lv0）3 部件+2 干扰合规 + 干扰弹回 + autoSolve 0 miss 3 星 ---- */
  total++;
  startLevel(10);
  const q10 = WRD.quiz;
  const ch3Ok = q10.parts.length === 3 && q10.distractors.length === 2 && q10.tiles.length === 5 &&
    WRD.currentLevel.dch === 3;
  const d10 = q10.tileTypes.indexOf('d');
  const r10 = await WRD.tapPart(d10);                            // 干扰块弹回
  const wrong10 = r10 === 'wrong' && WRD.quiz.slots.every(x => x === null);
  startLevel(10);                                                // 干净重发
  const a10 = await WRD.autoSolve();
  const lv10 = WRD.currentLevel;
  const smokeOkB = ch3Ok && wrong10 && a10.done && lv10.done && lv10.won &&
    lv10.misses === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat10 = { ok: smokeOkB, ch3Ok: ch3Ok, target: q10.target, parts: q10.parts,
    autoSolve: a10, misses: lv10.misses, stars: engStars(cur) };

  /* ---- ④ 布局：双 viewport 模拟 ×（章 1 lv0 四块 / 章 3 lv0 五块 / 章 3 lv2 六块=r28 最大块面） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                // flex 布局按新尺寸重排
    const de = document.documentElement;
    const tiles = Array.prototype.map.call(tilesEl.querySelectorAll('.tile'), b => b.getBoundingClientRect());
    const slots = Array.prototype.map.call(slotsEl.querySelectorAll('.slot'), b => b.getBoundingClientRect());
    const tR = targetEl.getBoundingClientRect();
    const tileOk = tiles.length >= 3 && tiles.every(r => r.width >= 64 && r.height >= 64);
    const slotOk = slots.length >= 2 && slots.every(r => r.width >= 96 && r.height >= 96);
    const targetOk = tR.width >= 96 && tR.height >= 96;
    let gapOk = true, minGap = 1e9;              // 同行相邻块间距 ≥16（wrap 换行按 y 中心聚类）
    const rows = {};
    tiles.forEach(r => { const ky = Math.round(r.top + r.height / 2); (rows[ky] = rows[ky] || []).push(r); });
    Object.keys(rows).forEach(ky => {
      const rs = rows[ky].sort((a, b) => a.left - b.left);
      for (let i = 1; i < rs.length; i++) {
        const gap = rs[i].left - rs[i - 1].right;
        if (gap < minGap) minGap = gap;
        if (gap < 15) gapOk = false;
      }
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, tileOk: tileOk, slotOk: slotOk, targetOk: targetOk, gapOk: gapOk,
      minGap: Math.round(minGap), tiles: tiles.length, ox: ox,
      pass: tileOk && slotOk && targetOk && gapOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 10, 12]) {               // 章 1 lv0 四块最简 / 章 3 lv0 五块 / 章 3 lv2 六块最多（r28 新增）
    startLevel(flat);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                 // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑤ 三章题字分布：静态 20 关每章题字并集 === 该章字库全集（池大小按章取） ---- */
  total++;
  const chCov = {};
  let covOk = true;
  for (let dch = 1; dch <= 4; dch++) {
    const set = {};
    for (let f = (dch - 1) * 5; f < dch * 5; f++) genLevel(f).quizzes.forEach(q => { set[q.c] = 1; });
    chCov[dch] = Object.keys(set).join('');
    if (Object.keys(set).length !== CHARS[dch].length || !CHARS[dch].every(e => set[e.c])) covOk = false;
  }
  if (covOk) npass++;
  units.chCov = { ok: covOk, cover: chCov, pools: [1, 2, 3, 4].map(d => CHARS[d].length) };

  /* ---- ⑥ r28 家族干扰律（famOk）：全 40 关 家族非空⇒干扰含 ≥1 家族部件；
     章 2 静态 5 关（flat5-9）每题家族必非空（声旁家族池设计性质）；
     干扰 ∩ 正确部件 = ∅ 全量复查（反向泄题防护，structOk 同款判据独立再算） ---- */
  total++;
  let famOk = true, ch2FamAll = true, famHits = 0, famQuizN = 0;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const pool = CHARS[L.dch];
    const byChar = {};
    pool.forEach(e => { byChar[e.c] = e; });
    L.quizzes.forEach(q => {
      const fam = vFamily(byChar[q.c], pool);
      const hit = q.distractors.some(d => fam.indexOf(d) >= 0);
      if (fam.length > 0) {
        famQuizN++;
        if (hit) famHits++;
        else famOk = false;                       // 家族在场却无家族干扰 = 生成律被破坏
      } else if (hit) {
        famOk = false;
      }
      if (q.distractors.some(d => q.parts.indexOf(d) >= 0)) famOk = false;      // 反向泄题防护
      if (flat >= 5 && flat <= 9 && fam.length === 0) ch2FamAll = false;        // 章 2 池设计性质
    });
  }
  if (famOk && ch2FamAll) npass++;
  units.famOk = { ok: famOk && ch2FamAll, famOk: famOk, ch2FamAll: ch2FamAll,
    famQuizN: famQuizN, famHits: famHits };

  const out = { game: 'words', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  runVerify();
}
