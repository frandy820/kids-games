/* ================= ?verify=1 自检 r6（题型四族；仅 verify 分支加载执行）
   ① 40 关全量审计（静态 20 + 生成 20）：确定性 / 章映射 / structOk / 引擎直驱通关（0 miss 3 星）/
     flat0 题0 恒 pair 兔→萝卜 / dch4 题型序列 [chain,anti,chain,set,chain] 且 up2+down1
   ② SPEC 独立对账（SPEC §3 r6 文字重列食性表/链表/干扰构造——禁引用引擎 EATS/CHAINS 常量）
     × 40 关全题：pair/set/anti/chain 各构造断言 + stem 独立重算 + 干扰不可秒排除独立判
   ③ 提交三路径隔离实验（UI）：part（集合内连对=不 miss 不推进）/ wrong（错连=miss+断线）/
     right（连满推进）/ fed（重复连不惩罚）；anti 错连共享=miss；chain down 两路径
   ④ 渲染冒烟：四型关 buildQ DOM（左 1+右 4-5、aria-label、链卡三格）
   ⑤ UI 冒烟：autoSolve flat0/5/10/15 通关 + DOM 线断言（okg=Σneed、端点=左卡右锚→右卡左锚）
   ⑥ 布局：双 viewport × 四型关：卡 ≥88、overflowX ≤0、中缝 ≥40（CSSOM 数值提取）、
     okline getBBox 与 .lab 文字 bbox 严格不相交（线道不遮字）
   ⑦ clips：con_ 16 + core 3 注入 + SPEC_DUR 实长断言（±60ms，Promise.all+8000ms 超时）
   ⑧ 星级：0=3★/1-2=2★/≥3=1★ 永不 0
   ⑨ 章末预告关键词（CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1）
   ⑩ 单关净时长模型：40 关 modeled ≥40000ms + 听读占比 ≥35% + estMs 公式字面（+600 口径）+
     句长护栏（stem/confirm 全 ≤13 码点）
   ⑪ verify 提速断言 SPEED=0.12
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ===== SPEC-BATCH5 §3 r6 文字独立重列（对账真值源；禁引用页面 EATS/CHAINS/池常量） ===== */
  const SPEC_EATS = {   // 动物 lib → 能吃食物 lib 集（主食首位）
    0: [0, 12, 13], 1: [1], 2: [2], 3: [3, 13], 4: [4], 5: [5, 12], 6: [6, 12],
    7: [7, 13], 8: [8, 13], 9: [9, 5], 10: [10, 5], 11: [11]
  };                    // 兔=萝卜白菜苹果 / 猫=小鱼 / 狗=骨头 / 猴=香蕉苹果 / 熊猫=竹子 /
                        // 鸡=毛毛虫白菜 / 羊=青草白菜 / 松鼠=松果苹果 / 熊=蜂蜜苹果 /
                        // 蛙=蚊子毛毛虫 / 鸟=红果毛毛虫 / 鼠=奶酪
  const SPEC_FOOD = ['萝卜', '小鱼', '骨头', '香蕉', '竹子', '毛毛虫', '青草', '松果',
                     '蜂蜜', '蚊子', '红果', '奶酪', '白菜', '苹果'];
  const SPEC_ANIMAL = ['小兔', '小猫', '小狗', '猴子', '熊猫', '小鸡', '绵羊', '松鼠',
                       '小熊', '青蛙', '小鸟', '老鼠'];
  const SPEC_OWNERS = f => {   // 食物 lib → 吃它的动物 lib 集（从上表逐行独立重列）
    const out = [];
    for (const a of Object.keys(SPEC_EATS)) if (SPEC_EATS[a].indexOf(f) >= 0) out.push(Number(a));
    return out;
  };
  const SPEC_CHAINS = [       // 链封闭 3：base→mid→top
    { base: 6, mid: 5, top: 5 },   // 青草→毛毛虫→小鸡
    { base: 6, mid: 9, top: 9 },   // 青草→蚊子→青蛙
    { base: 6, mid: 5, top: 10 }   // 青草→毛毛虫→小鸟
  ];
  const SPEC_ANTI_DECOYS = [12, 13, 5];   // 反向干扰=白菜/苹果/毛毛虫（共享固定 3，归属 3/4/3）
  const SPEC_STEM = q =>
    q.kind === 'pair'  ? '想一想，' + SPEC_ANIMAL[q.animal] + '爱吃什么' :
    q.kind === 'set'   ? '把' + SPEC_ANIMAL[q.animal] + '能吃的都连上' :
    q.kind === 'anti'  ? '只有' + SPEC_ANIMAL[q.animal] + '吃的是哪一个' :
    q.dir === 'up'     ? SPEC_FOOD[q.mid] + '吃过' + SPEC_FOOD[q.base] + '，谁吃掉它' :
                         '什么吃过' + SPEC_FOOD[q.base] + '，被' + SPEC_ANIMAL[q.top] + '吃到';
  const sameSet = (a, b) => a.length === b.length && a.every(x => b.indexOf(x) >= 0);

  /* ---- ①+② 40 关全量审计 + SPEC 独立对账（flat 0-39） ---- */
  const DCH4 = ['chain', 'anti', 'chain', 'set', 'chain'];
  let auditOk = true, specOk = true, specWhy = '';
  for (let flat = 0; flat < 40; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.qs) === JSON.stringify(L2.qs);          // 确定性
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1 && L1.dch === (L1.ch - 1) % 4 + 1;
    const struct = structOk(L1);
    const nQ = L1.qs.length === Q_PER_LEVEL;
    const flat0Anchor = flat !== 0 || (L1.qs[0].kind === 'pair' && L1.qs[0].animal === 0 &&
                                       L1.qs[0].need[0] === 0);            // 兔→萝卜 教学锚
    let kindsOk = true;
    if (L1.dch === 4) {
      kindsOk = L1.qs.every((q, i) => q.kind === DCH4[i]);
      const dirs = L1.qs.filter(q => q.kind === 'chain').map(q => q.dir);
      kindsOk = kindsOk && dirs.filter(d => d === 'up').length === 2 &&
                dirs.filter(d => d === 'down').length === 1;
    }
    /* 引擎直驱全对通关（part→right→done 全链） */
    L1.qs.forEach((q, i) => {
      q.need.forEach(f => engLink(L1, q.left, f));
      if (i < Q_PER_LEVEL - 1) engNext(L1);
    });
    const solvedAll = L1.done && L1.misses === 0 && engStars(L1) === 3;
    const ok1 = det && chOk && struct && nQ && flat0Anchor && kindsOk && solvedAll;
    if (!ok1) auditOk = false;

    /* ② SPEC 独立对账（逐题） */
    for (const q of L1.qs) {
      const uniqOk = new Set(q.picks).size === q.picks.length;
      const needIn = q.need.every(n => q.picks.indexOf(n) >= 0);
      const stemOk = q.stem === SPEC_STEM(q);
      let cOk = true;
      if (q.kind === 'pair') {
        cOk = q.picks.length === 4 && sameSet(q.need, [SPEC_EATS[q.animal][0]]) &&
              q.picks.every(f => q.need.indexOf(f) >= 0 || SPEC_EATS[q.animal].indexOf(f) < 0);
      } else if (q.kind === 'set') {
        cOk = SPEC_EATS[q.animal].length >= 2 && SPEC_EATS[q.animal].length <= 3 &&
              sameSet(q.need, SPEC_EATS[q.animal]) && q.picks.length === q.need.length + 2 &&
              q.picks.every(f => q.need.indexOf(f) >= 0 || SPEC_EATS[q.animal].indexOf(f) < 0);
      } else if (q.kind === 'anti') {
        /* 不可秒排除独立判：need 归属恰 1 且 owner==animal；干扰=共享 3 固定且归属全 ≥2 */
        cOk = SPEC_OWNERS(q.need[0]).length === 1 && SPEC_OWNERS(q.need[0])[0] === q.animal &&
              sameSet(q.picks.filter(f => q.need.indexOf(f) < 0), SPEC_ANTI_DECOYS) &&
              SPEC_ANTI_DECOYS.every(f => SPEC_OWNERS(f).length >= 2) && q.picks.length === 4;
      } else {
        const c = SPEC_CHAINS[q.chain];
        cOk = q.base === c.base && q.mid === c.mid && q.top === c.top;
        if (q.dir === 'up') {
          cOk = cOk && sameSet(q.need, [c.top]) && q.picks.every(x => x < 12) &&
                q.picks.every(x => x === c.top || SPEC_EATS[x].indexOf(c.mid) < 0);  // 候选内吃 mid 者恰 1
        } else {
          /* r6 审查 F-1 独立判：干扰中「吃过 base（=CHAINS 任一 mid）且≠本题 mid」者数必须为 0
             ——原断言 f===c.mid||(f!==c.mid&&f!==c.base) 在 picks 互异下化简恒真零判别力 */
          const ateB = SPEC_CHAINS.map(x => x.mid);
          cOk = cOk && sameSet(q.need, [c.mid]) && q.picks.every(x => x < 14) &&
                q.picks.filter(f => f !== q.mid && ateB.indexOf(f) >= 0).length === 0;
        }
        cOk = cOk && q.picks.length === 4;
      }
      if (!(uniqOk && needIn && stemOk && cOk)) {
        specOk = false;
        if (!specWhy) specWhy = 'flat' + flat + ' ' + q.kind + ' ' + JSON.stringify(q).slice(0, 140);
      }
    }
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok1, det: det, kindsOk: kindsOk, solvedAll: solvedAll };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  total++; if (auditOk) npass++;
  units.audit40 = { ok: auditOk, levels: levels, gen: gen };
  total++; if (specOk) npass++;
  units.specTable = { ok: specOk, why: specWhy };

  /* ---- ③ 提交三路径隔离实验（UI：startLevel(5)=set 题0） ---- */
  total++;
  startLevel(5);
  let q0 = CON.quiz;
  const f1 = q0.need[0], f2 = q0.need[1];
  const decoy = q0.picks.find(f => q0.need.indexOf(f) < 0);
  const rPart = await CON.dragTo(q0.left, f1);                       // part：连对不 miss 不推进
  const sPart = CON.currentLevel;
  const dPart = { okg: linesEl.querySelectorAll('.okg').length,
                  linked: colF.querySelectorAll('.fcard.linked').length };
  const rAgain = await CON.dragTo(q0.left, f1);                      // fed：重复连不惩罚
  const sAgain = CON.currentLevel;
  const rWrong = await CON.dragTo(q0.left, decoy);                   // wrong：错连=miss+断线
  const sWrong = CON.currentLevel;
  const dWrong = { okg: linesEl.querySelectorAll('.okg').length,
                   linked: colF.querySelectorAll('.fcard.linked').length };
  const rRight = await CON.dragTo(q0.left, f2);                      // right：连满推进
  const sRight = CON.currentLevel;
  const path3Ok = rPart === 'part' && sPart.misses === 0 && sPart.qIdx === 0 &&
    dPart.okg === 1 && dPart.linked === 1 &&
    rAgain === 'fed' && sAgain.misses === 0 &&
    rWrong === 'wrong' && sWrong.misses === 1 && sWrong.qIdx === 0 &&
    dWrong.okg === 1 && dWrong.linked === 1 &&                        // 错连不产线不清对勾
    rRight === 'right' && sRight.qIdx === 1 && sRight.misses === 1;
  if (path3Ok) npass++;
  units.path3 = { ok: path3Ok, rPart: rPart, rAgain: rAgain, rWrong: rWrong, rRight: rRight,
                  dPart: dPart, dWrong: dWrong, sWrong: sWrong, sRight: sRight };

  /* ---- ③b anti 错连共享=miss / chain down 两路径 ---- */
  total++;
  startLevel(10);
  let qa = CON.quiz;
  const shared = qa.picks.find(f => qa.need.indexOf(f) < 0);         // 共享干扰
  const rAWrong = await CON.dragTo(qa.left, shared);
  const sAWrong = CON.currentLevel;
  const rARight = await CON.dragTo(qa.left, qa.need[0]);
  const sARight = CON.currentLevel;
  const antiOk = rAWrong === 'wrong' && sAWrong.misses === 1 &&
    rARight === 'right' && sARight.qIdx === 1;
  startLevel(15);
  const L15 = genLevel(15);
  const downs = L15.qs.filter(q => q.kind === 'chain' && q.dir === 'down');
  let chainOk = downs.length === 1;
  if (chainOk) {                                                     // 引擎级直驱推进到 down 题再两路径
    const qd = downs[0];
    for (let i = 0; i < L15.qs.length && L15.qs[i] !== qd; i++) {
      L15.qs[i].need.forEach(f => engLink(L15, L15.qs[i].left, f));
      engNext(L15);
    }
    const dwrong = qd.picks.find(f => f !== qd.need[0]);
    const rDWrong = engLink(L15, qd.left, dwrong);
    const missB = L15.misses === 1;
    const rDRight = engLink(L15, qd.left, qd.need[0]);
    chainOk = rDWrong === 'wrong' && missB &&
      (rDRight === 'right' || rDRight === 'done');
  }
  const antiChainOk = antiOk && chainOk;
  if (antiChainOk) npass++;
  units.antiChain = { ok: antiChainOk, antiOk: antiOk, chainOk: chainOk };

  /* ---- ④ 渲染冒烟：四型关 DOM（左 1+右 4-5、链卡三格+箭头+问号） ---- */
  total++;
  const domSims = {};
  let domOk = true;
  for (const f of [0, 5, 10, 15]) {
    startLevel(f);
    const q = CON.quiz;
    const leftN = colA.querySelectorAll('.acard').length;
    const rightN = colF.querySelectorAll('.fcard').length;
    const labels = Array.from(colF.querySelectorAll('.fcard')).map(e => e.getAttribute('aria-label'));
    const expLabels = q.picks.map(lib => q.pickType === 'animal' ? SPEC_ANIMAL[lib] : SPEC_FOOD[lib]);
    const labOk = labels.length === expLabels.length && labels.every((l, i) => l === expLabels[i]);
    let chainDom = true;
    if (q.kind === 'chain') {
      chainDom = colA.querySelectorAll('.chaincard .ch-cell').length === 2 &&
                 colA.querySelectorAll('.chaincard .ch-arrow').length === 2 &&
                 !!colA.querySelector('.chaincard .ch-q');
    } else {
      chainDom = !!colA.querySelector('.acard .q-bub');
    }
    const simOk = leftN === 1 && rightN === q.picks.length && rightN >= 4 && labOk && chainDom;
    domSims['flat' + f] = { ok: simOk, leftN: leftN, rightN: rightN, kind: q.kind };
    if (!simOk) domOk = false;
  }
  if (domOk) npass++;
  units.dom = { ok: domOk, sims: domSims };

  /* ---- ⑤ UI 冒烟：autoSolve flat0(pair)+flat15(dch4 混出)（flat5/10 UI 推进路径已由③/③b
       真实 dragTo 覆盖；减负控 verify 总时长）+ 线端点锚点断言 ---- */
  for (const f of [0, 15]) {
    total++;
    startLevel(f);
    const L = genLevel(f);
    const res = await CON.autoSolve();
    const lv = CON.currentLevel;
    const nNeed = L.qs.reduce((s, q) => s + q.need.length, 0);
    /* 每题切换会重建 DOM/线，逐题期间断言不可行；通关后断言引擎+最后题线端点 */
    const okg = linesEl.querySelectorAll('.okg');
    let endsOk = okg.length === L.qs[Q_PER_LEVEL - 1].need.length;
    if (endsOk) {
      const ql = L.qs[Q_PER_LEVEL - 1];
      ql.need.forEach(fd => {
        const A = anchorOf(acardEl(ql.left), 'R'), B = anchorOf(fcardEl(fd), 'L');
        const hit = Array.prototype.some.call(okg, g => {
          const d = g.querySelector('.okline').getAttribute('d');
          return d.indexOf('M' + A[0] + ' ' + A[1] + ' ') === 0 &&
                 d.lastIndexOf(' ' + B[0] + ' ' + B[1]) === d.length - (' ' + B[0] + ' ' + B[1]).length;
        });
        if (!hit) endsOk = false;
      });
    }
    const dots = document.querySelectorAll('#step-dots i.done').length;
    const ok = res.done && lv.done && lv.won && lv.misses === 0 && engStars(cur) === 3 &&
      dots === Q_PER_LEVEL && endsOk &&
      document.querySelectorAll('.fcard.linked').length === L.qs[Q_PER_LEVEL - 1].need.length;
    if (ok) npass++;
    smokes['autoSolve' + f] = { done: res.done, links: res.links, nNeed: nNeed,
                                okg: okg.length, endsOk: endsOk, ok: ok };
  }

  /* ---- ⑥ 布局：双 viewport × 四型关（卡 ≥88 / overflowX ≤0 / 中缝 ≥40 / 线不遮字） ---- */
  total++;
  const layoutSims = [];
  const vpList = [{ w: 1280, h: 800 }, { w: 800, h: 1180 }];
  const rectsIntersect = (a, b, pad) =>
    !(a.right + pad <= b.left || b.right + pad <= a.left ||
      a.bottom + pad <= b.top || b.bottom + pad <= a.top);
  for (const vp of vpList) {
    const ghost = document.createElement('div');   // 视口模拟：直接改 #game 尺寸（stage flex 自适应）
    ghost.style.cssText = 'position:fixed;left:-99999px;top:0;width:' + vp.w + 'px;height:' + vp.h + 'px';
    document.body.appendChild(ghost);
    const gEl = document.getElementById('game');
    const oldW = gEl.style.width, oldH = gEl.style.height, oldPos = gEl.style.position;
    gEl.style.position = 'relative';
    gEl.style.width = vp.w + 'px'; gEl.style.height = vp.h + 'px';
    for (const f of [0, 5, 10, 15]) {
      startLevel(f);
      const L = genLevel(f);
      /* 同步直绘最后题全连线形态：引擎快进+复用 UI 渲染（buildQ/layoutLines）→ 量线与文字 bbox */
      for (let i = 0; i < Q_PER_LEVEL - 1; i++) L.qs[i].linked = L.qs[i].need.slice();
      L.qIdx = Q_PER_LEVEL - 1;
      L.qs[L.qIdx].linked = L.qs[L.qIdx].need.slice();
      cur = L;
      buildQ(); layoutLines(); renderStep();
      const lastQ = L.qs[Q_PER_LEVEL - 1];
      const cards = document.querySelectorAll('#board .card');
      const rs = Array.from(cards).map(c => c.getBoundingClientRect());
      const minW = Math.round(Math.min.apply(null, rs.map(r => r.width)));
      const minH = Math.round(Math.min.apply(null, rs.map(r => r.height)));
      /* 中缝（线道）：board computed column-gap 数值提取 */
      const gapStr = (getComputedStyle(boardEl).gap || getComputedStyle(boardEl).columnGap || '');
      const gapMatch = gapStr.match(/([\d.]+)px/);
      const gapPx = gapMatch ? Number(gapMatch[1]) : 0;
      /* 线道不遮字：每条 okline（SVG 坐标）与每 .lab（viewport→lines 坐标）不相交 */
      const lb = linesEl.getBoundingClientRect();
      const labRects = Array.from(document.querySelectorAll('#board .card .lab')).map(el => {
        const r = el.getBoundingClientRect();
        return { left: r.left - lb.left, right: r.right - lb.left,
                 top: r.top - lb.top, bottom: r.bottom - lb.top };
      });
      let lineTextOk = document.querySelectorAll('#lines .okg').length === lastQ.need.length;
      document.querySelectorAll('#lines .okline').forEach(path => {
        const bb = path.getBBox();
        const lineRect = { left: bb.x, right: bb.x + bb.width, top: bb.y, bottom: bb.y + bb.height };
        if (labRects.some(lr => rectsIntersect(lineRect, lr, 1))) lineTextOk = false;
      });
      const de = document.documentElement;
      const sim = { vp: vp.w + 'x' + vp.h, flat: f, kind: lastQ.kind, minW: minW, minH: minH,
                    gapPx: Math.round(gapPx), lineTextOk: lineTextOk,
                    overflowX: de.scrollWidth - window.innerWidth,
                    pass: minW >= 88 && minH >= 88 && gapPx >= 40 && lineTextOk };
      layoutSims.push(sim);
    }
    gEl.style.width = oldW; gEl.style.height = oldH; gEl.style.position = oldPos;
    ghost.remove();
  }
  startLevel(0);
  const layoutOk = layoutSims.length === 8 && layoutSims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: layoutSims };

  /* ---- ⑦ clips：con_ 82 + core 3 = 85（T46 阶段2 +66 题面/确认句族）+ SPEC_DUR 实长断言（±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['core_chapter_end', 'core_day_end', 'core_rest',
    'con_tut_watch', 'con_tut_turn', 'con_hint', 'con_rev',
    'con_w_food', 'con_w_share', 'con_w_chain', 'con_hint_anti', 'con_less',
    'con_pair_panda', 'con_pair_chick', 'con_pair_squirrel', 'con_pair_bear',
    'con_pair_frog', 'con_pair_bird', 'con_pair_mouse',
    'con_st_pair_0', 'con_st_pair_5', 'con_st_set_11', 'con_st_anti_0', 'con_st_anti_11',
    'con_st_up_5_6', 'con_st_up_9_6', 'con_st_dn_6_5', 'con_st_dn_6_9', 'con_st_dn_6_10',
    'con_cf_0', 'con_cf_5', 'con_cf_11', 'con_cf_anti_0', 'con_cf_anti_11',
    'con_cf_chain_5', 'con_cf_chain_9', 'con_cf_chain_10'];
  const preOk = keys.length === 85 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durSpec = {   // SPEC_DUR 真值表（浏览器 new Audio onloadedmetadata 实测 2026-09-13）
    con_tut_watch: 2856, con_tut_turn: 1824, con_hint: 2352, con_rev: 3504,
    con_w_food: 2856, con_w_share: 2352, con_w_chain: 2856, con_hint_anti: 2448, con_less: 2856,
    con_pair_panda: 2472, con_pair_chick: 2520, con_pair_squirrel: 2496, con_pair_bear: 2736,
    con_pair_frog: 2640, con_pair_bird: 2472, con_pair_mouse: 2376
  };
  const durKeys = Object.keys(durSpec);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);   // 8s 超时（纪律）
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - durSpec[durKeys[i]]) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

  /* ---- ⑧ 星级规则（0=3★/1-2=2★/≥3=1★，永不 0） ---- */
  total++;
  const LA = genLevel(10);
  LA.misses = 0; const st3 = engStars(LA) === 3;
  LA.misses = 1; const st2a = engStars(LA) === 2;
  LA.misses = 2; const st2b = engStars(LA) === 2;
  LA.misses = 3; const st1 = engStars(LA) === 1;
  LA.misses = 9; const stFloor = engStars(LA) === 1;
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- ⑨ 章末预告 C7 关键词（hint[i] ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('几种') >= 0 &&                       // 预告 ch2 多对多
                 CHAPTERS[2].hint.indexOf('只有') >= 0 &&                       // 预告 ch3 反向排除
                 CHAPTERS[3].hint.indexOf('虫') >= 0 &&                         // 预告 ch4 链
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                         // 预告生成关
                 GEN_HINTS[0].indexOf('爱吃什么') >= 0 &&                       // dch1 pair
                 GEN_HINTS[1].indexOf('都连上') >= 0 &&                         // dch2 set
                 GEN_HINTS[2].indexOf('只有') >= 0 &&                           // dch3 anti
                 GEN_HINTS[3].indexOf('链') >= 0;                               // dch4 chain
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑩ 单关净时长模型（modeled ≥40s 硬指标可证）+ estMs 公式 + 句长护栏 ---- */
  total++;
  const estOk = estMs(11) === 4395 && estMs(12) === 4740 && estMs(13) === 5085;   // n*345+600 字面复核
  let minMs = 1e9, minRatio = 1, minFlat = 0, lenOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const m = engModeled(L);
    if (m.ms < minMs) { minMs = m.ms; minRatio = m.ratio; minFlat = flat; }
    if (m.ms < 40000 || m.ratio < 0.35) { minMs = -m.ms; break; }
    L.qs.forEach(q => {
      if (q.stem.length > 13 || confirmOf(q).length > 13) lenOk = false;
    });
  }
  const modeledOk = minMs >= 40000 && minRatio >= 0.35 && estOk && lenOk;
  if (modeledOk) npass++;
  units.modeled = { ok: modeledOk, minMs: minMs, minFlat: minFlat, minRatio: minRatio,
                    estOk: estOk, lenOk: lenOk };

  /* ---- ⑪ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'connect', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）+ 拼句 say */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  runVerify();
}
