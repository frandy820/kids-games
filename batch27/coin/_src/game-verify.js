/* ================= ?verify=1 自检（仅 verify 分支加载执行；r38 新谱口径 SPEC-R38-COIN）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射 / 引擎直驱（逐题点应选卡→right/末题 done→全关 3 星）
   ② SPEC 表独立对账（七题型：coin/bill/rev/sameval/combo/chg/min——verify 内从 SPEC-R38
     §R1/§R3 文字独立重列：SPEC_JIAO/SPEC_ITEMS/物品价/贪心/和值文字独立复算，禁引用引擎
     MONEY/ITEMS/sumText/greedyOf）× 40 关全题：面额/和值/找零/最少枚独立复算 + 恰 1 卡=答案 +
     候选互异 + 各 kind 候选构型（coin 3 硬币文+纸币文 / bill 3 纸币文+币文近对或第 4 纸币 /
     rev=R4C 四币图全 / combo 和值+3 近值(≥1 |Δ|≤5) / chg 找零+3 近值(≥1 |Δ|≤2) / min 四枚卡全）
   ③ 近对必在专项（flat10-14 全题 + 生成关 dch==3）：sameval→jiao1 / combo→|Δ|≤5 / chg→|Δ|≤2
   ④ sameval 答案互指表硬编码对账（SPEC_SAMEVAL：yuan1↔yuan1p 双向）
   ⑥ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑦ 家族 A/B/F/I 源码断言（读自身合并 script 文本）
   ⑧ 章末预告 C7 独立硬编码关键词（r38 新章名）+ 生成关 nextHint(f)===GEN_HINTS[genLevel(f+1).dch-1]
   ⑨ clips：coi_ 69 条 + core 3 条全注入（=72 终态，主线 2026-09-22 注册 39 键；filter 32）
     + duration 辨别器 ≤60ms（SPEC §4 实长）
   ⑩ 键链纯函数直调（r37 M1 范式）：quizPartsOf/confirmPartsOf/guideKeyFor 期望链从 SPEC §R6
     推导硬编码（combo 遗留快径/开放枚举/chg 三段/min 三段/引导三分支）
   ⑪ 双错防重入 1000ms（fire-and-forget 首击+窗内二击 false）+ 错反馈链绑定（__lastQueue）
   ⑫ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑬ 章构成律聚合：dch1=coin/rev 且 rev≥2 / dch2=3bill+2chg(yuan5 池) / dch3=2sameval 双向+
     3combo(遗留 1+开放 2、多重集互异、和值互异、≥1 深水) / dch4=3 难题(≥1 ∈ chg/min)+2 易题
   附：教学链 __coDemoR / ch3 流（combo 方向引导+sameval 近对引导） / UI 冒烟 flat0·flat10 /
     布局双 viewport 逐题步进（flat0/5/10/15 四关全 5 题七 kind 卡尺寸+场景+对比度+溢出） /
     SPEED / estMs 窗（新确认链段级上界+在册实长双核）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-R38 §R1/§R3 文字独立重列（禁抄页面 MONEY/ITEMS/COMBOS/表/函数） */
  const SPEC_JIAO = { jiao1: 1, jiao5: 5, yuan1: 10, yuan1p: 10, yuan5: 50, yuan10: 100, yuan20: 200 }; // 角值
  const SPEC_TEXT = { jiao1: '1角', jiao5: '5角', yuan1: '1元', yuan1p: '1元',
                      yuan5: '5元', yuan10: '10元', yuan20: '20元' };
  const SPEC_COIN3 = ['jiao1', 'jiao5', 'yuan1'];
  const SPEC_BILL4 = ['yuan1p', 'yuan5', 'yuan10', 'yuan20'];
  const SPEC_R4C = ['jiao1', 'jiao5', 'yuan1', 'yuan1p'];                       // rev 候选封闭 4
  const SPEC_COMBO = { c_yj_j: { coins: ['yuan1', 'jiao5'], jiao: 15 },
                       c_j5j5: { coins: ['jiao5', 'jiao5'], jiao: 10 },
                       c_yy:   { coins: ['yuan1', 'yuan1'], jiao: 20 } };
  const SPEC_NEAR = { jiao1: ['yuan1', 'yuan1p'], yuan1: ['jiao1'], yuan1p: ['jiao1'] };   // 近对 2 对
  const SPEC_SAMEVAL = { yuan1: 'yuan1p', yuan1p: 'yuan1' };                   // 同值互指
  const SPEC_ITEMS = { soda: { cn: '汽水', price: 6, pay: 'yuan1p' },
                       candy: { cn: '棒棒糖', price: 8, pay: 'yuan1p' },
                       sticker: { cn: '贴纸', price: 9, pay: 'yuan1p' },
                       balloon: { cn: '气球', price: 3, pay: 'yuan1p' },
                       book: { cn: '绘本', price: 30, pay: 'yuan5' },
                       blocks: { cn: '积木', price: 40, pay: 'yuan5' } };
  const SPEC_CHG_JIAO = ['soda', 'candy', 'sticker', 'balloon'];
  const SPEC_CHG_YUAN = ['book', 'blocks'];
  /* 和值文字/解析/贪心——SPEC §R3 独立实现（阿拉伯口径） */
  const specSumText = v => { const y = Math.floor(v / 10), j = v % 10;
    return y ? (y + '元' + (j ? j + '角' : '')) : (j + '角'); };
  const specJiaoOf = t => { const m = /^(\d+)元(\d+)角$|^(\d+)元$|^(\d+)角$/.exec(t);
    if (!m) return 0; if (m[1]) return (+m[1]) * 10 + (+m[2]);
    if (m[3]) return (+m[3]) * 10; return +m[4]; };
  const specGreedy = v => Math.floor(v / 10) + Math.floor((v % 10) / 5) + (v % 5);
  const SPEC_DUR = { coi_tut_watch: 2976, coi_tut_turn: 1752, coi_hint: 2232,
                     coi_right: 2472, coi_wrong: 2568, coi_q: 1944,             // SPEC §4 clip 实长
                     coi_n1: 1704,
                     coi_n5: 1752,
                     coi_n10: 1704,
                     coi_q_sum: 2136,
                     coi_v_gt: 1584,
                     coi_v_y1: 1344,
                     coi_v_y2: 1344,
                     coi_v_y3: 1440,
                     coi_v_y4: 1440,
                     coi_v_j1: 1392,
                     coi_v_j2: 1416,
                     coi_v_j3: 1464,
                     coi_v_j4: 1416,
                     coi_v_j5: 1392,
                     coi_v_j6: 1416,
                     coi_v_j7: 1392,
                     coi_v_j8: 1392,
                     coi_q_r1: 2208,
                     coi_q_r5: 2256,
                     coi_q_r10: 2160,
                     coi_it_soda: 2184,
                     coi_it_candy: 2352,
                     coi_it_sticker: 2184,
                     coi_it_balloon: 2208,
                     coi_it_book: 2184,
                     coi_it_blocks: 2184,
                     coi_q_pay1: 1656,
                     coi_q_pay5: 1680,
                     coi_q_chg: 2328,
                     coi_cf_chg: 1344,
                     coi_q_min0: 1416,
                     coi_q_min1: 2352,
                     coi_cf_min1: 1824,
                     coi_cf_min2: 1872,
                     coi_cf_min3: 1920,
                     coi_cf_min4: 2472,
                     coi_g_minhi: 2184,
                     coi_g_minlo: 2712,
                     coi_g_kind: 2280 };   // r38 段二 39 键实长（主线 mutagen 实测 2026-09-22，±60ms 对账）
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const nearSvIn = q => q.opts.some(o => o.id === 'jiao1' && o.id !== q.opts[q.answer].id);   // sameval 近对
  const nearValIn = (q, lim) => {                 // combo/chg 近值近对（|Δ|≤lim 的干扰 ≥1）
    const a = specJiaoOf(q.opts[q.answer].text);
    return q.opts.some((o, i) => i !== q.answer && specJiaoOf(o.text) > 0 &&
               Math.abs(specJiaoOf(o.text) - a) <= lim);
  };

  /* ---- ①②⑤⑬ 40 关全量审计 + SPEC 表独立对账 + 章构成律聚合 ---- */
  const ch3ComboSeen = {}, ch3SvSeen = {}, dch2Seen = {}, genDch = {}, genDch3Lv = [];
  const kindSeen = {};
  let tableOk = true, compOk = true, badCase = null, badComp = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // ⑤ 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === ((L1.ch - 1) % 4) + 1
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* 引擎直驱：逐题点应选卡 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapOpt(L3, q.answer);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;

    /* SPEC 表独立对账（每题） */
    let specOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const ids = q.opts.map(o => o.id), texts = q.opts.map(o => o.text);
      if (q.opts.length !== 4 || ids.filter((v, i, a) => a.indexOf(v) === i).length !== 4) {
        badCase = 'len/dup ' + flat + '/' + k; specOk = false; break;
      }
      if (q.answer < 0 || q.answer > 3) { badCase = 'ansIdx ' + flat + '/' + k; specOk = false; break; }
      kindSeen[q.kind] = (kindSeen[q.kind] || 0) + 1;
      if (q.kind === 'coin') {
        if (!(q.face in SPEC_JIAO) || SPEC_COIN3.indexOf(q.face) < 0) { badCase = 'coinPool ' + flat + '/' + k; specOk = false; break; }
        if (MONEY[q.face].jiao !== SPEC_JIAO[q.face] || MONEY[q.face].text !== SPEC_TEXT[q.face]) {
          badCase = 'value ' + flat + '/' + k; specOk = false; break;
        }
        if (texts[q.answer] !== SPEC_TEXT[q.face]) { badCase = 'ansText ' + flat + '/' + k; specOk = false; break; }
        const need = SPEC_COIN3.map(c => SPEC_TEXT[c]);          // ch1 候选=3 硬币面额全+1 纸币面额干扰
        if (!need.every(t => texts.indexOf(t) >= 0)) { badCase = 'coinSet ' + flat + '/' + k; specOk = false; break; }
        const d = texts.filter(t => need.indexOf(t) < 0);
        if (d.length !== 1 || ['5元', '10元', '20元'].indexOf(d[0]) < 0) { badCase = 'coinD ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'bill') {
        if (SPEC_BILL4.indexOf(q.face) < 0) { badCase = 'billPool ' + flat + '/' + k; specOk = false; break; }
        if (texts[q.answer] !== SPEC_TEXT[q.face]) { badCase = 'ansText ' + flat + '/' + k; specOk = false; break; }
        const billTexts = SPEC_BILL4.map(c => SPEC_TEXT[c]);
        const inBills = texts.filter(t => billTexts.indexOf(t) >= 0);
        const others = inBills.filter(t => t !== SPEC_TEXT[q.face]);
        /* r38：yuan1p/yuan5 = 3 纸币文（答案+2 非答案）+ 数字同币文近对（'1角'/'5角'）；
           yuan10/yuan20 无数字同币文 → 4 纸币文全集（SPEC §R3 bill 候选构型两分支） */
        const near = q.face === 'yuan1p' ? '1角' : (q.face === 'yuan5' ? '5角' : null);
        const billOk = near
          ? (inBills.length === 3 && others.length === 2 && texts.indexOf(near) >= 0 &&
             texts.filter(t => billTexts.indexOf(t) < 0).length === 1)
          : (inBills.length === 4 && texts.every(t => billTexts.indexOf(t) >= 0));
        if (!billOk) { badCase = 'billSet ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'rev') {
        if (SPEC_COIN3.indexOf(q.face) < 0) { badCase = 'revPool ' + flat + '/' + k; specOk = false; break; }
        if (ids.slice().sort().join() !== SPEC_R4C.slice().sort().join()) { badCase = 'revSet ' + flat + '/' + k; specOk = false; break; }
        if (ids[q.answer] !== q.face) { badCase = 'revAns ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'sameval') {
        if (!(q.face in SPEC_SAMEVAL)) { badCase = 'svFace ' + flat + '/' + k; specOk = false; break; }
        if (ids[q.answer] !== SPEC_SAMEVAL[q.face]) { badCase = 'svAns ' + flat + '/' + k; specOk = false; break; }   // ④ 互指表
        if (!ids.every(x => x in SPEC_JIAO)) { badCase = 'svOpt ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'combo') {
        const coins = q.coins;
        if (!coins || coins.length < 2 || coins.length > 4 || !coins.every(c => SPEC_COIN3.indexOf(c) >= 0)) {
          badCase = 'cbCoins ' + flat + '/' + k; specOk = false; break;
        }
        const v = coins.reduce((s, c) => s + SPEC_JIAO[c], 0);                   // ② 组合值独立复算
        if (texts[q.answer] !== specSumText(v)) { badCase = 'cbVal ' + flat + '/' + k; specOk = false; break; }
        const ds = texts.filter((t, i) => i !== q.answer);
        const dv = ds.map(specJiaoOf);
        if (!ds.every(t => specJiaoOf(t) > 0) || !nearValIn(q, 5) ||
            !dv.every(x => [1, 5, 10].some(d => Math.abs(x - v) === d))) {
          badCase = 'cbNear ' + flat + '/' + k; specOk = false; break;           // 干扰=±1/±5/±10 且 ≥1 |Δ|≤5
        }
        const sig = coins.map(c => SPEC_JIAO[c]).join('-');
        const lg = Object.keys(SPEC_COMBO).find(id => SPEC_COMBO[id].coins.map(c => SPEC_JIAO[c]).join('-') === sig);
        if ((lg || ('k' + sig)) !== q.face) { badCase = 'cbFace ' + flat + '/' + k; specOk = false; break; }
      } else if (q.kind === 'chg') {
        if (!(q.item in SPEC_ITEMS) || q.item !== q.face) { badCase = 'itFace ' + flat + '/' + k; specOk = false; break; }
        const it = SPEC_ITEMS[q.item];
        const change = SPEC_JIAO[it.pay] - it.price;                             // ② 找零独立复算
        if (change <= 0 || texts[q.answer] !== specSumText(change)) { badCase = 'chVal ' + flat + '/' + k; specOk = false; break; }
        const dv = texts.filter((t, i) => i !== q.answer).map(specJiaoOf);
        if (!dv.every(x => x > 0) || !nearValIn(q, 2) ||
            !dv.every(x => [1, 2, 5, 10].some(d => Math.abs(x - change) === d))) {
          badCase = 'chNear ' + flat + '/' + k; specOk = false; break;           // 干扰=±1/±2/±5/±10 且 ≥1 |Δ|≤2
        }
      } else if (q.kind === 'min') {
        if (q.target < 1 || q.target > 40 || specGreedy(q.target) > 4 || q.face !== 'm' + q.target) {
          badCase = 'minT ' + flat + '/' + k; specOk = false; break;
        }
        if (texts.slice().sort().join() !== ['1枚', '2枚', '3枚', '4枚'].join()) { badCase = 'minSet ' + flat + '/' + k; specOk = false; break; }
        if (texts[q.answer] !== specGreedy(q.target) + '枚') { badCase = 'minAns ' + flat + '/' + k; specOk = false; break; }
      } else { badCase = 'kind ' + flat + '/' + k; specOk = false; break; }
    }
    if (!specOk) { tableOk = false; }
    /* ⑬ 章构成律聚合（SPEC-R38 §R1） */
    const ks = L1.quizzes.map(q => q.kind);
    if (L1.dch === 1) {
      if (!ks.every(k => k === 'coin' || k === 'rev') || ks.filter(k => k === 'rev').length < 2) {
        compOk = false; badComp = badComp || 'dch1 ' + flat;
      }
    } else if (L1.dch === 2) {
      const nBill = ks.filter(k => k === 'bill').length, nChg = ks.filter(k => k === 'chg').length;
      const chgItems = L1.quizzes.filter(q => q.kind === 'chg').map(q => q.item);
      const billFaces = L1.quizzes.filter(q => q.kind === 'bill').map(q => q.face);
      if (nBill !== 3 || nChg !== 2 || chgItems.slice().sort().join() !== SPEC_CHG_YUAN.slice().sort().join() ||
          billFaces.filter((v, i, a) => a.indexOf(v) === i).length !== 3) {
        compOk = false; badComp = badComp || 'dch2 ' + flat;
      }
      L1.quizzes.forEach(q => { if (q.kind === 'bill') dch2Seen[q.face] = (dch2Seen[q.face] || 0) + 1; });
    } else if (L1.dch === 3) {
      const nSv = ks.filter(k => k === 'sameval').length, nCb = ks.filter(k => k === 'combo').length;
      const svFaces = L1.quizzes.filter(q => q.kind === 'sameval').map(q => q.face).sort();
      const cbs = L1.quizzes.filter(q => q.kind === 'combo');
      const sigs = cbs.map(q => q.coins.map(c => SPEC_JIAO[c]).join('-'));
      const sums = cbs.map(q => q.coins.reduce((s, c) => s + SPEC_JIAO[c], 0));
      const nLegacy = cbs.filter(q => q.face in SPEC_COMBO).length;
      const deep = cbs.some(q => q.coins.length >= 3);
      if (nSv !== 2 || nCb !== 3 || svFaces.join() !== ['yuan1', 'yuan1p'].sort().join() ||
          sigs.filter((v, i, a) => a.indexOf(v) === i).length !== 3 ||
          sums.filter((v, i, a) => a.indexOf(v) === i).length !== 3 || nLegacy !== 1 || !deep) {
        compOk = false; badComp = badComp || 'dch3 ' + flat;
      }
      cbs.forEach(q => { ch3ComboSeen[q.face] = (ch3ComboSeen[q.face] || 0) + 1; });
      L1.quizzes.forEach(q => { if (q.kind === 'sameval') ch3SvSeen[q.face] = (ch3SvSeen[q.face] || 0) + 1; });
    } else if (L1.dch === 4) {
      const hard = ks.filter(k => k !== 'coin' && k !== 'bill' && k !== 'rev');
      const app = ks.filter(k => k === 'chg' || k === 'min');
      const chgItems = L1.quizzes.filter(q => q.kind === 'chg').map(q => q.item);
      /* r38 M8 防回归：关内 min 答案互异（SPEC §R3 律——greedyOf 枚数级去重，独立 SPEC 表复算） */
      const minAs = L1.quizzes.filter(q => q.kind === 'min').map(q => specGreedy(q.target));
      if (hard.length !== 3 || app.length < 1 ||
          !chgItems.every(x => SPEC_CHG_JIAO.indexOf(x) >= 0) ||
          minAs.filter((v, i, a) => a.indexOf(v) === i).length !== minAs.length) {
        compOk = false; badComp = badComp || 'dch4 ' + flat;
      }
    }
    if (flat >= STATIC_LEVELS) {
      genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
      if (L1.dch === 3) genDch3Lv.push(flat);
    }
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                  driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  kinds: L1.quizzes.map(q => q.kind[0] + q.kind.slice(1, 3) + ':' + q.face) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  /* 聚合：七 kind 全现 + 生成关四型全现 + ch2 取材多样（40 关口径） */
  const kindsAll = ['coin', 'bill', 'rev', 'sameval', 'combo', 'chg', 'min']
    .every(k => kindSeen[k] > 0);
  const distOk = kindsAll && Object.keys(dch2Seen).length >= 3 &&
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  total++;
  const aggOk = tableOk && compOk && distOk;
  if (aggOk) npass++;
  units.table = { ok: aggOk, bad: badCase, badComp: badComp, kinds: kindSeen,
                  ch3Combo: ch3ComboSeen, ch3Sv: ch3SvSeen, genDch: genDch };

  /* ---- ③ 近对必在专项（flat10-14 五关全题 + 生成关 dch==3 亦在场） ---- */
  total++;
  const nearDetail = [];
  let near3Ok = true;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    if (L.dch !== 3) { near3Ok = false; break; }
    const pairs = L.quizzes.map(q => {
      const inOpt = q.kind === 'sameval' ? nearSvIn(q) : nearValIn(q, 5);
      return q.kind + ':' + q.face + ':' + (inOpt ? 'in' : 'MISS');
    });
    if (!pairs.every(p => p.endsWith(':in'))) near3Ok = false;
    nearDetail.push(pairs);
  }
  for (const flat of genDch3Lv) {                // 生成关 dch==3 的关：近对同样必在场（b25 坑④扩展）
    const L = genLevel(flat);
    if (!L.quizzes.every(q => q.kind === 'sameval' ? nearSvIn(q)
                       : (q.kind === 'combo' ? nearValIn(q, 5) : true))) {
      near3Ok = false; nearDetail.push(['gen' + flat + ' MISS']);
    }
  }
  if (near3Ok) npass++;
  units.near3 = { ok: near3Ok, detail: nearDetail, genDch3: genDch3Lv };

  /* ---- ④ sameval 互指表硬编码专项：flat10-14 每道 sameval 题 answer=SPEC_SAMEVAL[face] ---- */
  total++;
  let svOk = true;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => {
      if (q.kind === 'sameval' && q.opts[q.answer].id !== SPEC_SAMEVAL[q.face]) svOk = false;
    });
  }
  if (svOk) npass++;
  units.sameval = { ok: svOk, table: SPEC_SAMEVAL };

  /* ---- ⑩ 键链纯函数直调（r37 M1：期望链从 SPEC §R6 推导硬编码） ---- */
  total++;
  const keysOf = ps => JSON.stringify(ps.map(p => p.key));
  const kc = [];
  kc.push(keysOf(quizPartsOf({ kind: 'combo', coins: ['yuan1', 'jiao1', 'jiao1'] })) ===
          JSON.stringify(['coi_n10', 'coi_n1', 'coi_n1', 'coi_q_sum']));                    // 开放 3 枚读题链
  kc.push(keysOf(quizPartsOf({ kind: 'combo', coins: ['yuan1', 'jiao5'] })) ===
          JSON.stringify(['coi_say_c_yj_j']));                                              // 遗留快径整句
  kc.push(keysOf(confirmPartsOf({ kind: 'combo', coins: ['jiao5', 'jiao5'] })) ===
          JSON.stringify(['coi_cf_c_c_j5j5']));                                            // 遗留确认快径（双 c 前缀）
  kc.push(keysOf(confirmPartsOf({ kind: 'combo', coins: ['yuan1', 'jiao5', 'jiao1'] })) ===
          JSON.stringify(['coi_v_gt', 'coi_v_y1', 'coi_v_j6']));                           // 开放确认值链 16 角
  kc.push(keysOf(quizPartsOf({ kind: 'chg', item: 'soda' })) ===
          JSON.stringify(['coi_it_soda', 'coi_q_pay1', 'coi_q_chg']));                     // 角级找零读题 3 段
  kc.push(keysOf(quizPartsOf({ kind: 'chg', item: 'blocks' })) ===
          JSON.stringify(['coi_it_blocks', 'coi_q_pay5', 'coi_q_chg']));                   // 元级找零读题（付 5 元）
  kc.push(keysOf(confirmPartsOf({ kind: 'chg', item: 'book' })) ===
          JSON.stringify(['coi_cf_chg', 'coi_v_y2']));                                     // 找回 2 元
  kc.push(keysOf(quizPartsOf({ kind: 'min', target: 15 })) ===
          JSON.stringify(['coi_q_min0', 'coi_v_y1', 'coi_v_j5', 'coi_q_min1']));           // min 读题 4 段
  kc.push(keysOf(confirmPartsOf({ kind: 'min', target: 26 })) ===
          JSON.stringify(['coi_cf_min4']));                                                // 2元6角贪心 4 枚
  kc.push(keysOf(confirmPartsOf({ kind: 'min', target: 10 })) ===
          JSON.stringify(['coi_cf_min1']));                                                // 1 元贪心 1 枚
  kc.push(guideKeyFor({ kind: 'min', target: 10, opts: [{ text: '3枚' }, { text: '1枚' }] }, { text: '3枚' }) === 'coi_g_minhi');
  kc.push(guideKeyFor({ kind: 'min', target: 15, opts: [{ text: '1枚' }, { text: '2枚' }] }, { text: '1枚' }) === 'coi_g_minlo');
  kc.push(guideKeyFor({ kind: 'rev', face: 'yuan1' }, { id: 'yuan1p', text: '1元' }) === 'coi_g_kind');
  kc.push(guideKeyFor({ kind: 'rev', face: 'yuan1' }, { id: 'jiao1', text: '1角' }) === 'coi_g_silver');
  kc.push(guideKeyFor({ kind: 'chg', item: 'soda', answer: 0, opts: [{ text: '4角' }, { text: '6角' }] }, { text: '6角' }) === 'coi_g_combohi');
  const kcOk = kc.every(Boolean) && kc.length === 15;
  if (kcOk) npass++;
  units.keychains = { ok: kcOk, n: kc.length };

  /* ---- ⑦ 家族 A/B/F/I 源码断言（读自身合并 script 文本——第 3 个 script 块） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0;   // B：双锚
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0;    // F：生成关实算 dch-1
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 9200') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcOk = srcA && srcB && srcF && srcI && srcJ;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, F: srcF, I: srcI, J: srcJ };

  /* ---- 点卡单元（flat0 真实 UI 状态机：⑪ 双错防重入 / 反馈链绑定 / miss 口径 / ⑫ 越界 null）
     防重入测法（b25 坑①）：tapX 的 promise 在错窗结束才 resolve——测窗内二击必须
     fire-and-forget 首击（不 await）+ 紧邻二击 ---------- */
  total++;
  startLevel(0);
  const q4 = CO.quiz;
  const initOk = q4 && q4.kind === 'coin' && q4.face === 'yuan1' && q4.opts.length === 4 &&
                 q4.opts[q4.answer].text === '1元' &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await CO.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex(o => o.text === '1角');     // 银白近对错（yuan1 点'1角'）
  const wB = q4.opts.findIndex(o => o.text === '5角');     // 另一错卡（颜色引导句）
  const pW = CO.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await CO.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue[0] === 'coi_wrong' &&   // 反馈链=coi_wrong+引导句
                window.__lastQueue[1] && window.__lastQueue[1].key === 'coi_g_silver' &&
                window.__lastQueue[1].text === GUIDE.silver;     // 近对错→银白大小引导（绑所点项）
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             CO.quiz.miss === 1 && CO.currentLevel.miss === 1;
  const pW2 = CO.tapOpt(wB);                               // 同题点另一错卡（'5角'→颜色引导句）
  const rW2 = await pW2;
  const chainB = window.__lastQueue && window.__lastQueue[1] && window.__lastQueue[1].text === GUIDE.color;
  const s1b = rW2 === 'wrong' && CO.quiz.miss === 2 && chainB;   // 第二次错=miss 2（卡不灰可重选）
  const rR = await CO.tapOpt(q4.answer);
  const s2 = rR === 'right' && CO.quiz.step === 1 && CO.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s1b && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1, wrongB: s1b,
                chain: chainA, chainColor: chainB, right: s2 };

  /* ---- ch3 全题型单元（flat10：combo 大小方向引导 + sameval 近对引导 + 通关） ---- */
  total++;
  startLevel(10);
  let ch3Ok = true, comboDirOk = false, svGuideOk = false, comboCalc = null, taps10 = 0;
  for (let guard = 0; guard < 10 && cur && !cur.done; guard++) {
    const q = CO.quiz;
    if (!q) { ch3Ok = false; break; }
    if (q.kind === 'combo' && !comboDirOk) {           // combo：先点一个错组合→大小方向引导句
      lastWrongVoice = 0;                              // flat≥3 错反馈 10s 节流锚重置（契约 J 单测场景）
      const wrongIdx = q.opts.findIndex((o, i) => i !== q.answer);
      const truth = specJiaoOf(q.opts[q.answer].text);       // verify 独立算真值
      const picked = specJiaoOf(q.opts[wrongIdx].text);
      const expectHi = picked > truth;
      comboCalc = { truth: truth, picked: picked, expectHi: expectHi };
      const rw = await CO.tapOpt(wrongIdx);
      const chainOk = window.__lastQueue && window.__lastQueue[1] &&
        window.__lastQueue[1].text === (expectHi ? GUIDE.comboHi : GUIDE.comboLo);
      if (rw !== 'wrong' || !chainOk) ch3Ok = false;
      comboDirOk = chainOk;
    } else if (q.kind === 'sameval' && !svGuideOk) {   // sameval：点 jiao1（近对）→silver/unit 引导
      lastWrongVoice = 0;                              // 节流锚重置（同上：连错链断言前置）
      const jIdx = q.opts.findIndex(o => o.id === 'jiao1');
      if (jIdx >= 0 && jIdx !== q.answer) {
        const expect = q.face === 'yuan1' ? GUIDE.silver : GUIDE.unit;   // 按题面近对对
        const rw = await CO.tapOpt(jIdx);
        const chainOk = window.__lastQueue && window.__lastQueue[1] && window.__lastQueue[1].text === expect;
        if (rw !== 'wrong' || !chainOk) ch3Ok = false;
        svGuideOk = chainOk;
      }
    }
    const r = await CO.tapOpt(CO.quiz ? CO.quiz.answer : q.answer);
    if (r === 'right' || r === 'done') taps10++;
    else { ch3Ok = false; break; }
  }
  const done10 = !!(cur && cur.done);
  if (ch3Ok && done10 && comboDirOk && svGuideOk) npass++;
  units.ch3flow = { ok: ch3Ok && done10 && comboDirOk && svGuideOk, taps: taps10,
                    comboDir: comboDirOk, svGuide: svGuideOk, comboCalc: comboCalc };

  /* ---- 教学链：tutorialWatch 真实走完 → __coDemoR='right'（演示认一元硬币） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__coDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].face === 'yuan1' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__coDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑫ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await CO.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await CO.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && CO.quiz.step === 0 && CO.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await CO.autoSolve();
  const lv0 = CO.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- UI 冒烟 B：flat10（dch3）先点 1 次错卡再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = CO.quiz;
  const wrongC = q8.opts.findIndex((o, i) => i !== q8.answer);
  const r8 = await CO.tapOpt(wrongC);
  const a10 = await CO.autoSolve();
  const lv10 = CO.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- 布局：双 viewport × 逐题步进（flat0=coin+rev / flat5=bill+chg / flat10=sameval+combo /
     flat15=ch4 混合）全 5 题卡尺寸+场景+对比度+溢出（r38 七 kind 全覆盖） ---- */
  function lum(hexStr) {
    const m = hexStr.match(/#?([0-9a-f]{6})/i);
    if (!m) return null;
    const n = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
  }
  const ratioOf = (a, b) => { const x = lum(a), y = lum(b);
    return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cssToHex = c => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    return m ? '#' + [1, 2, 3].map(i => ('0' + (+m[i]).toString(16)).slice(-2)).join('') : c; };
  async function simLevel(w, h, flat) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    const steps = [];
    for (let k = 0; k < CH_LEN; k++) {
      const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
        w: b.offsetWidth, h: b.offsetHeight }));
      const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
      const face = sceneEl.querySelector('.money-slot, .combo-wrap, .tag-card, .chg-wrap');
      const hitOk = cards.length === 4 && cards.every(b => b.w >= 96 && b.h >= 96);
      const sceneOk = sc.w >= 64 && sc.h >= 64 && !!face && face.offsetWidth >= 40;
      const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&                        // 卡描边 INK 对底
                 ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
      const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
      const de = document.documentElement;
      const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
      steps.push({ kind: cur.quizzes[k].kind, hitOk: hitOk, sceneOk: sceneOk,
                   contrast: cB && cS, ox: ox,
                   pass: hitOk && sceneOk && cB && cS && ox <= 0 });
      await CO.tapOpt(CO.quiz ? CO.quiz.answer : cur.quizzes[k].answer);      // 步进下一题
    }
    return { vp: w + 'x' + h, flat: flat, steps: steps,
             pass: steps.every(s => s.pass) };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10, 15]) {
    sims.push(await simLevel(1280, 800, flat));
    sims.push(await simLevel(800, 1180, flat));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims.map(s => ({ vp: s.vp, flat: s.flat,
    kinds: s.steps.map(t => t.kind), pass: s.pass })) };

  /* ---- ⑨ clips：coi 69 + core 3 = 72 条全注入 + duration 辨别器（SPEC §4 实长 ±60ms）
     ——r38 终态=72 条（主线注册 39 键 2026-09-22；r38 M6 勘正旧文案「coi_ 30 条」）/ filter 32（cf_/say_/g_ 族+q2，含新 cf_chg/min/g_kind 等 8 键） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['coi_tut_watch', 'coi_tut_turn', 'coi_hint', 'coi_right', 'coi_wrong', 'coi_q',
                'coi_q_sum', 'coi_v_gt', 'coi_q_r1', 'coi_it_soda', 'coi_q_min0', 'coi_g_kind',   // r38 段二：新六族代表键入 need（防错名顶替，r35 m-1 先例）
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = keys.length === 72 &&
    keys.filter(k => /^(coi_cf_|coi_say_|coi_g_)/.test(k) || k === 'coi_q2').length === 32 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

  /* ---- ⑥ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
  total++;
  const LA = genLevel(10);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;   // 永不 0 星
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  /* ---- ⑧ 章末预告 C7 关键词断言（r38 新章名；hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1）
     + 生成关 nextHint(f)===GEN_HINTS[genLevel(f+1).dch-1] 实算对账（家族 F） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('纸币') >= 0 && CHAPTERS[1].hint.indexOf('找零') >= 0 &&  // 预告 ch2 纸币+买东西
                 CHAPTERS[2].hint.indexOf('一样多') >= 0 && CHAPTERS[2].hint.indexOf('数') >= 0 &&  // 预告 ch3 同值+数钱
                 CHAPTERS[3].hint.indexOf('算钱') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 &&  // 预告 ch4 找零+最少几枚
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                      // 预告生成关
                 GEN_HINTS[0].indexOf('硬币') >= 0 &&                        // dch1 硬币正反认
                 GEN_HINTS[1].indexOf('纸币') >= 0 &&                        // dch2 纸币+找零
                 GEN_HINTS[2].indexOf('数钱') >= 0 &&                        // dch3 同值+开放数钱
                 GEN_HINTS[3].indexOf('集合') >= 0;                          // dch4 混合
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算下一关 dch
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- 语音窗动态断言（b25 estMs 定版 + r38 段级链上界 + 在册实长双核 r35 M-1） ---- */
  total++;
  const maxConfChain = SPEC_DUR.coi_v_gt +
    Math.max(SPEC_DUR.coi_v_y1, SPEC_DUR.coi_v_y2, SPEC_DUR.coi_v_y3, SPEC_DUR.coi_v_y4) +
    Math.max(SPEC_DUR.coi_v_j1, SPEC_DUR.coi_v_j2, SPEC_DUR.coi_v_j3, SPEC_DUR.coi_v_j4,
             SPEC_DUR.coi_v_j5, SPEC_DUR.coi_v_j6, SPEC_DUR.coi_v_j7, SPEC_DUR.coi_v_j8) + 2 * 150;   // r38 段二实测口径（max）：4788（estMs 段级在 2-3 字段低估 ~105ms，r35 M-1 铁律换实测；r38 M1 勘正——4620 为 y1/j1 代表链非 max）
  const maxConfClip = 3408;                                       // 在册确认句实长最长 coi_cf_sv_1/2
  const winOk = (1800 + 3600) >= maxConfChain + 300 &&            // 判对演出窗 5400 ≥ 开放确认链+300
                (1800 + 3600) >= maxConfClip + 300 &&             // ≥ 在册整句确认实长+300
                (900 + 3000) >= SPEC_DUR.coi_tut_watch + 300 &&   // 教学演示窗 t=3900 ≥ 2976+300=3276
                2200 >= SPEC_DUR.coi_tut_turn + 300 &&            // turn 后读题延 ≥ 1752+300=2052
                (2620 + 400) >= SPEC_DUR.coi_right + 300 &&       // winFlow celebrate+补窗 ≥ 2472+300=2772
                9200 >= SPEC_DUR.coi_wrong + 150 + estMs(16) + 300;  // 链豁免窗 ≥ 2568+150+estMs(silver16)+300=9138（r38 M1 口径统一：与 game-main 278 同 16 字符）
  const estData = { maxConfChain: maxConfChain, maxConfClip: maxConfClip, rightWin: 5400,
                    watchT: 3900, turnDelay: 2200, rightFlow: 3020, wrongChain: 9200 };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  const out = { game: 'coin', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；voice.say 记录 TTS 拼句
     （__lastSayText）；voice.queue 记录拼播链（__lastQueue）供反馈链/键链断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
