/* ================= ?verify=1 自检（仅 verify 分支加载执行；?poke=1 走 runPoke）——r19
   ① 图案池审计：19 图案（8 近形族×2+3 单身）+族员结构+svg 完整性+数字脸 1..9+补数封闭域
   ② 40 关审计：确定性（同 flat 两次 JSON 一致）+ SPEC_LEVELS 逐关对账（mode/r/c/twins/peek/
     pairs/dch/modeled 精确整数）+ 生成关四 dch 全现（flat24-39）+ 双模式全现
   ③ 引擎单元：同 pairId→match / 异→miss 盖回 / <2 张 up→null / 非 down 拒翻 / engCover
   ④ 星级单元：门槛全档（pairs=6：≤9 错 3 星 / ≤15 错 2 星 / 更多 1 星，永不 0）
   ⑤ 补数域单元：sum10 关组内两面和恒 10、面域 {1..9}、无重复补数组、(5,5) 仅 5 对关
   ⑥ 近形干扰单元：same 关实际同族双员共现族数 == spec.twins（干扰恰如 SPEC，无意外共现）
   ⑦ peek 单元：peekMs 公式精确（800+对数×750）+ peek 指令窗 estMs(13 字)=5085 + 吞输入 bump
   ⑧ 教学链单元：tutorialWatch 真实走完 → __memDemoR==='match' 且 tut='help'
   ⑨ autoSolve 冒烟：flat0（same）/flat7（sum10）/flat12（peek）引擎直驱完美序列全收
   ⑩ 吞输入+容器 bump（家族 D）：判定锁定期 tapCard 吞 + #boardwrap.bump
   ⑪ 布局：三关型（2×2/2×5/4×5 最密）实建 DOM：卡 ≥96、间距 ≥16、无横向溢出
   ⑫ clips：mem 3 + core 3 全注入（6..9 兼容主线补 r19 新键）+ duration 实测 ±60ms（SPEC_DUR）
   ⑬ 契约源码断言：读第 3 script 块（纯游戏块）检索（A/B/D/E/F/I/J/K/MIG/SEED——检索串
     拼接防 verify 源码自匹配）
   ⑭ estWin 动态断言：SAME_CHAIN_WIN 3660==estMs(8)+300 / SUM10 4695==estMs(11)+300 /
     estMs(4)==1980 / peek 指令窗 5085
   ⑮ modeled 双钉：m0===12000 && 40 关 min===12000 && 逐关===SPEC_LEVELS（禁约数）
     + 全关 ≥LEVEL_MIN_MS 12000 + DECIDE_MIN 两档字面
   ⑯ nextHint 对账：章末预告 CHAPTERS[i+1] + 生成关实算 GEN_HINTS[genLevel(f+1).dch-1]
   ⑰ 迁移次序：迁移 IIFE 源码位置先于 KIDS.init（script[2] 内 index 对比）
   结果写 #verify-result + window.__memVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;
  const ok = (name, cond, detail) => { total++; if (cond) npass++; units[name] = { ok: !!cond, d: detail == null ? '' : detail }; };

  /* ---- SPEC-R19-MEMORY §2/§5 关表独立重列：[mode, r, c, twins, peek, pairs, dch, modeled]
     （_spec_calc.py 产出；禁抄页面 genLevel——verify 自持真值） ---- */
  const M = 'same', S10 = 'sum10';
  const SPEC_LEVELS = [
    [M, 2, 3, 0, 0, 3, 1, 12000], [M, 2, 3, 1, 0, 3, 1, 12000], [M, 2, 4, 1, 0, 4, 1, 15000],
    [M, 2, 4, 2, 0, 4, 1, 15000], [M, 3, 4, 2, 0, 6, 1, 21000], [M, 3, 4, 3, 0, 6, 1, 21000],
    [S10, 2, 2, 0, 0, 2, 2, 12600], [S10, 2, 3, 0, 0, 3, 2, 17400], [S10, 2, 4, 0, 0, 4, 2, 22200],
    [S10, 2, 5, 0, 0, 5, 2, 27000], [S10, 2, 5, 0, 0, 5, 2, 27000], [S10, 2, 5, 0, 0, 5, 2, 27000],
    [M, 2, 3, 1, 1, 3, 3, 15050], [M, 2, 4, 2, 1, 4, 3, 18800], [M, 3, 4, 2, 1, 6, 3, 26300],
    [M, 3, 4, 3, 1, 6, 3, 26300], [M, 4, 4, 3, 1, 8, 3, 33800], [M, 4, 4, 4, 1, 8, 3, 33800],
    [M, 4, 4, 4, 1, 8, 4, 33800], [S10, 2, 5, 0, 1, 5, 4, 31550], [M, 4, 4, 4, 1, 8, 4, 33800],
    [S10, 2, 5, 0, 1, 5, 4, 31550], [M, 4, 5, 4, 1, 10, 4, 41300], [M, 4, 5, 5, 1, 10, 4, 41300],
    [M, 4, 4, 4, 1, 8, 2, 33800], [S10, 2, 5, 0, 1, 5, 1, 31550],
    [M, 4, 5, 5, 1, 10, 4, 41300], [M, 4, 4, 4, 1, 8, 2, 33800],
    [S10, 2, 4, 0, 1, 4, 3, 26000], [S10, 2, 5, 0, 1, 5, 2, 31550],
    [M, 4, 5, 5, 1, 10, 4, 41300], [S10, 2, 4, 0, 1, 4, 3, 26000],
    [S10, 2, 5, 0, 1, 5, 1, 31550], [M, 4, 4, 4, 1, 8, 2, 33800],
    [M, 4, 5, 5, 1, 10, 4, 41300], [S10, 2, 5, 0, 1, 5, 1, 31550],
    [S10, 2, 5, 0, 1, 5, 1, 31550], [M, 4, 5, 5, 1, 10, 4, 41300],
    [M, 4, 5, 4, 1, 10, 3, 41300], [S10, 2, 4, 0, 1, 4, 3, 26000]
  ];
  /* clips 实测时长锚（mutagen ±60ms）；4 新键实长均 < estMs 实算值 → 错链窗 3660/4695 按原 estMs 口径保持不收窄 */
  const SPEC_DUR = { mem_tut_watch: 4104, mem_tut_turn: 2256, mem_hint: 2160,
                     mem_missmore: 2688, mem_sum10: 3240, mem_peek: 3384, mem_twin: 3144,
                     core_chapter_end: 3744, core_day_end: 3528, core_rest: 6048 };
  const SPEC_CHAPTER_HINTS = { 1: '数字朋友要来啦，两张合起来是十', 2: '下一章要先看清楚再翻哦',
                               3: '更大的挑战等着你', 4: '新一轮记忆挑战来啦' };
  const SPEC_GEN_HINTS = ['更多图案的大挑战哦', '双胞胎图案更多啦', '大牌阵记忆挑战哦', '超强记忆王挑战哦'];
  const SPEC_DECIDE_MIN = { same: 1500, sum10: 2400 };
  const SPEC_MODELED_MIN = 12000;              // §5：flat0（禁约数）
  const SPEC_LEVEL_MIN = 12000;                // §5：本款口径
  const SPEC_PEEK = { base: 800, perPair: 750 };
  const estMs = n => n * 345 + 600;            // b25 定版：四方同步之 verify 侧

  /* ---- ① 图案池审计 ---- */
  {
    let pOk = true, det = [];
    const keys = Object.keys(PATTERNS);
    if (keys.length !== 19) { pOk = false; det.push('n=' + keys.length); }
    FAM_KEYS.forEach(f => {
      const ms = FAM_MEMBERS[f];
      if (!ms || ms.length !== 2 || ms[0] === ms[1]) { pOk = false; det.push('fam@' + f); }
      ms.forEach(m => { if (!PATTERNS[m] || PATTERNS[m].fam !== f) { pOk = false; det.push('mem@' + f + ':' + m); } });
    });
    if (FAM_KEYS.length !== 8) { pOk = false; det.push('famN=' + FAM_KEYS.length); }
    SINGLE_KEYS.forEach(s => { if (!PATTERNS[s] || PATTERNS[s].fam !== null) { pOk = false; det.push('single@' + s); } });
    keys.forEach(k => {
      const p = PATTERNS[k];
      if (!p.name || typeof p.svg !== 'string' || p.svg.indexOf('<svg') !== 0 || p.svg.indexOf('</svg>') < 0) {
        pOk = false; det.push('svg@' + k);
      }
    });
    for (let n = 1; n <= 9; n++) {
      if (!NUM_FACES[String(n)] || NUM_FACES[String(n)].indexOf('<svg') !== 0) { pOk = false; det.push('num@' + n); }
    }
    /* 补数封闭域：恰 5 组、每组 a+b==10、域 {1..9}、无重复组 */
    const domOk = COMP_PAIRS.length === 5 && COMP_PAIRS.every(p => p[0] + p[1] === 10 && p[0] >= 1 && p[0] <= 9 && p[1] >= 1 && p[1] <= 9) &&
                  new Set(COMP_PAIRS.map(p => p[0] + '-' + p[1])).size === 5 &&
                  COMP_PAIRS_NO5.length === 4 && COMP_PAIRS_NO5.every(p => p[0] !== p[1]);
    if (!domOk) { pOk = false; det.push('comp-domain'); }
    ok('patterns', pOk && domOk, det.slice(0, 4).join('|'));
  }

  /* ---- ② 40 关审计：确定性 + SPEC_LEVELS 逐关 + 生成关四 dch 全现 + 双模式全现 ---- */
  {
    let detOk = true, specOk = true, minOk = true, genDch = {}, genMode = {}, det = [];
    const strip = L => ({ grid: L.grid, mode: L.mode, pairs: L.pairs, peek: L.peek, twins: L.twins,
                          cards: L.cards.map(c => [c.pairId, c.face]) });
    for (let f = 0; f < 40; f++) {
      const L1 = makeLevel(f), L2 = makeLevel(f);
      if (JSON.stringify(strip(L1)) !== JSON.stringify(strip(L2))) detOk = false;
      const g = genLevel(f), E = SPEC_LEVELS[f], md = modeled(f);
      const lvOk = g.mode === E[0] && g.r === E[1] && g.c === E[2] && g.twins === E[3] && !!g.peek === !!E[4] &&
                   L1.pairs === E[5] && g.dch === E[6] && md === E[7] && md >= SPEC_LEVEL_MIN &&
                   L1.cards.length === g.r * g.c && (g.r * g.c) % 2 === 0 &&
                   g.ch === Math.floor(f / 6) + 1 && g.lv === f % 6;
      if (!lvOk) { specOk = false; det.push('f' + f + ':' + [g.mode, g.r, g.c, g.twins, g.peek, L1.pairs, g.dch, md].join('/')); }
      if (md < SPEC_LEVEL_MIN) minOk = false;
      if (f >= 24) { genDch[g.dch] = (genDch[g.dch] || 0) + 1; genMode[g.mode] = (genMode[g.mode] || 0) + 1; }
    }
    const genOk = genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0 &&
                  genMode.same > 0 && genMode.sum10 > 0;
    ok('levels40', detOk && specOk && minOk && genOk,
       det.slice(0, 3).join('|') + ' genDch=' + JSON.stringify(genDch) + ' genMode=' + JSON.stringify(genMode));
  }

  /* ---- ③ 引擎单元（pairId 语义通吃两模式） ---- */
  {
    const L = makeLevel(0);                    // same 3 对
    const p0 = L.cards[0].pairId;
    const j = engPartner(L, 0);
    const sameFace = L.cards[0].face === L.cards[j].face;   // same 模式组内同面
    const k = L.cards.findIndex((c, i) => i !== 0 && i !== j && c.pairId !== p0);
    const rMatch = (engFlip(L, 0), engFlip(L, j), engJudge(L));
    const matchOk = rMatch === 'match' && L.cards[0].state === 'gone' && L.matched === 1 && L.streak === 0;
    const rMiss = (engFlip(L, k), engFlip(L, L.cards.findIndex((c, i) => i > k && c.state === 'down' && c.pairId !== L.cards[k].pairId)), engJudge(L));
    const missOk = rMiss === 'miss' && L.misses === 1 && L.streak === 1 && L.cards[k].state === 'down';
    const nullOk = engJudge(L) === null;       // 只剩 0/1 张 up → null
    const rejectOk = !engFlip(L, 0) && !engFlip(L, -1);   // gone/越下标拒翻
    const covOk = (engFlip(L, L.cards.findIndex(c => c.state === 'down')), engCover(L, L.cards.findIndex(c => c.state === 'up')) === true);   // up→down
    const L2 = makeLevel(7);                   // sum10 3 对
    const pair = L2.cards.filter(c => c.pairId === L2.cards[0].pairId);
    const sumOk = Number(pair[0].face) + Number(pair[1].face) === 10;
    ok('engine', matchOk && missOk && nullOk && rejectOk && covOk && sumOk && sameFace,
       [rMatch, rMiss, pair[0].face + '+' + pair[1].face].join('|'));
  }

  /* ---- ④ 星级单元（门槛全档；永不 0 星） ---- */
  {
    const starCase = m => engStars({ pairs: 6, misses: m });
    const starsOk = starCase(0) === 3 && starCase(9) === 3 && starCase(10) === 2 &&
      starCase(15) === 2 && starCase(16) === 1 && starCase(99) === 1 &&
      [starCase(0), starCase(9), starCase(10), starCase(15), starCase(16), starCase(99)].every(s => s >= 1);
    ok('stars', starsOk, JSON.stringify({ 0: starCase(0), 9: starCase(9), 10: starCase(10), 15: starCase(15), 16: starCase(16), 99: starCase(99) }));
  }

  /* ---- ⑤ 补数域单元：全部 sum10 关（静态 ch2 全 6 关 + 生成段动态筛 sum10——种子换档不破）---- */
  {
    let domOk = true, det = [];
    const flats = [6, 7, 8, 9, 10, 11];
    for (let f = 24; f < 40; f++) if (genLevel(f).mode === 'sum10') flats.push(f);
    for (const f of flats) {
      const L = makeLevel(f);
      const byPair = {};
      L.cards.forEach(c => { (byPair[c.pairId] = byPair[c.pairId] || []).push(c); });
      const seen = {};
      Object.keys(byPair).forEach(pid => {
        const cs = byPair[pid];
        const a = Number(cs[0].face), b = Number(cs[1].face);
        const tag = Math.min(a, b) + '-' + Math.max(a, b);
        if (cs.length !== 2 || a + b !== 10 || a < 1 || a > 9 || b < 1 || b > 9 || seen[tag]) {
          domOk = false; det.push('f' + f + ':' + a + '+' + b);
        }
        seen[tag] = true;
      });
      if (Object.keys(byPair).length !== L.pairs) { domOk = false; det.push('f' + f + ':pairs'); }
      if (L.pairs === 5 && !seen['5-5']) { domOk = false; det.push('f' + f + ':no55'); }   // 5 对关含 (5,5) 桥接
    }
    ok('sum10domain', domOk, det.slice(0, 3).join('|'));
  }

  /* ---- ⑥ 近形干扰单元：same 关实际同族共现族数 == spec.twins（静态 same 关 + 生成段动态筛 same） ---- */
  {
    let twOk = true, det = [];
    const twFlats = [1, 3, 5, 12, 13, 16, 17, 22, 23];
    for (let f = 24; f < 40; f++) if (genLevel(f).mode === 'same') twFlats.push(f);
    for (const f of twFlats) {
      const L = makeLevel(f);
      const faces = new Set(L.cards.map(c => c.face));
      const byFam = {};
      faces.forEach(fc => { const fm = patFam(fc); if (fm) byFam[fm] = (byFam[fm] || 0) + 1; });
      const actual = Object.keys(byFam).filter(fm => byFam[fm] === 2).length;
      const twinsSpec = genLevel(f).twins;
      if (actual !== twinsSpec || L.pairs * 2 !== L.cards.length) {
        twOk = false; det.push('f' + f + ':' + actual + '/' + twinsSpec);
      }
    }
    ok('twins', twOk, det.slice(0, 3).join('|'));
  }

  /* ---- ⑦ peek 单元：亮出窗公式精确 + 指令窗 + 吞输入 bump（家族 D） ---- */
  {
    const winOk = [2, 3, 4, 5, 6, 8, 10].every(p => peekMs(p) === SPEC_PEEK.base + p * SPEC_PEEK.perPair) &&
                  peekMs(10) === 8300 && peekMs(3) === 3050;
    const leadOk = estMs(VOICE.peek.text.length) === 5085 && VOICE.peek.text.length === 13;
    /* 吞输入：人为构造 peek 态 → MEM.flip 吞 + 容器 bump */
    cur = makeLevel(12); buildBoard(); renderTray();
    state = { locked: false, won: false, demo: false, peek: true, tut: 'none', tutStep: 0 };
    const r = window.MEM.flip(0);
    const bumped = wrapEl().classList.contains('bump');
    state.peek = false;
    ok('peek', winOk && leadOk && r === false && bumped, 'win=' + peekMs(10) + ' lead=' + estMs(VOICE.peek.text.length) + ' flip=' + r + ' bump=' + bumped);
  }

  /* ---- ⑧ 教学链单元：tutorialWatch 真实走完（真实计时器）→ 演示证据 ---- */
  {
    cur = makeLevel(0);
    state = { locked: false, won: false, demo: false, peek: false, tut: 'watch', tutStep: 0 };
    window.__memDemoR = null;
    tutorialWatch();
    const t0 = Date.now();
    let stage = '', demoR = '';
    while (Date.now() - t0 < 12000) {
      await wait(150);
      if (state.tut === 'help' && window.__memDemoR) { stage = state.tut; demoR = window.__memDemoR; break; }
    }
    ok('tutorial', stage === 'help' && demoR === 'match', 'stage=' + stage + ' demoR=' + demoR);
    state = { locked: false, won: false, demo: false, peek: false, tut: 'none', tutStep: 0 };
  }

  /* ---- ⑨ autoSolve 冒烟：三关型引擎直驱完美序列（0 失误全收） ---- */
  {
    const run = f => {
      const L = makeLevel(f);
      const seq = perfectSequence(L);
      seq.forEach(i => { engFlip(L, i); engJudge(L); });
      return { f: f, n: L.cards.length, steps: seq.length, won: engWon(L), misses: L.misses };
    };
    const r0 = run(0), r7 = run(7), r12 = run(12), r23 = run(23);
    ok('autoSolve', [r0, r7, r12, r23].every(r => r.won && r.steps === r.n && r.misses === 0),
       JSON.stringify([r0, r7, r12, r23]));
  }

  /* ---- ⑩ 吞输入+容器 bump（判定锁定期；家族 D） ---- */
  {
    cur = makeLevel(2); buildBoard(); renderTray();
    state = { locked: false, won: false, demo: false, peek: false, tut: 'none', tutStep: 0 };
    const i0 = 0, j0 = engPartner(cur, 0);
    window.MEM.flip(i0); window.MEM.flip(j0);          // 两张 up → state.locked
    const locked = state.locked;
    const third = cur.cards.findIndex((c, i) => i !== i0 && i !== j0);
    const r = window.MEM.flip(third);
    const bumped = wrapEl().classList.contains('bump');
    ok('swallow', locked && r === false && bumped, 'locked=' + locked + ' r=' + r + ' bump=' + bumped);
    state.locked = false; judgePromise = null; clearTimeout(judgeTimer);
  }

  /* ---- ⑪ 布局：三关型（2×2 / 2×5 最宽 / 4×5 最密）实建 DOM 量卡尺寸 ---- */
  {
    const sims = [];
    for (const f of [6, 9, 23]) {
      cur = makeLevel(f); buildBoard(); renderTray();
      const cards = boardEl.querySelectorAll('.card');
      const rs = Array.from(cards).slice(0, 6).map(c => c.getBoundingClientRect());
      const w = Math.min(...rs.map(r => r.width)), h = Math.min(...rs.map(r => r.height));
      let gapMin = 999;
      for (let a = 0; a < rs.length; a++) for (let b = 0; b < rs.length; b++) {
        if (a === b) continue;
        const dx = Math.abs(rs[a].x - rs[b].x), dy = Math.abs(rs[a].y - rs[b].y);
        if (dx > 1 && dy < 2) gapMin = Math.min(gapMin, dx - rs[a].width);
        if (dy > 1 && dx < 2) gapMin = Math.min(gapMin, dy - rs[a].height);
      }
      const de = document.documentElement;
      sims.push({ f: f, ox: de.scrollWidth - de.clientWidth, w: w, h: h, gap: gapMin,
                  ok: de.scrollWidth - de.clientWidth <= 0 && w >= 96 && h >= 96 && gapMin >= 16 });
    }
    ok('layout', sims.every(s => s.ok), JSON.stringify(sims.map(s => ({ f: s.f, ox: s.ox, w: Math.round(s.w), gap: Math.round(s.gap) }))));
  }

  /* ---- ⑫ clips：mem 7 + core 3 = 10 全注入（4 新键已主线落地）+ duration 实测 ±60ms ---- */
  {
    const keys = Object.keys(KIDS.voice.clips);
    const needMem = ['mem_tut_watch', 'mem_tut_turn', 'mem_hint', 'mem_peek', 'mem_sum10', 'mem_twin', 'mem_missmore'];
    const coreK = ['core_chapter_end', 'core_day_end', 'core_rest'];
    const preOk = keys.length === 10 &&
                  needMem.every(k => keys.indexOf(k) >= 0) &&
                  coreK.every(k => keys.indexOf(k) >= 0) &&
                  keys.every(k => k.indexOf('mem_') === 0 || coreK.indexOf(k) >= 0) &&
                  keys.every(k => KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
    const durKeys = Object.keys(SPEC_DUR);
    const durs = await Promise.all(durKeys.map(k => new Promise(res => {
      let done = false;
      const a = new Audio(KIDS.voice.clips[k]);
      const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
      a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
      a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
    })));
    const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60);
    ok('clips', preOk && durOk, 'n=' + keys.length + ' durs=' + durs.join(','));
  }

  /* ---- ⑬ 契约源码断言（读第 3 script 块=游戏块 data+engine+main；verify 独立第 4 块不自匹配） ---- */
  {
    const src = document.querySelectorAll('script')[2].textContent;
    const nLim = src.split('nextHint(lim - 1)').length - 1;
    const srcA = nLim === 2 &&                                   // A：winFlow+启动双实算
                 src.indexOf('Math.max(0, lim - 1)') >= 0 &&     // 日末停留今日末关
                 src.indexOf('nextHint(' + 'null)') < 0;         // 旧 null 实参形态禁再现（含注释；拼接防自匹配）
    const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
                 src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
                 src.indexOf('idle > 30000') >= 0;   // B：救援双锚
    const srcD = src.indexOf("replayAnim(wrapEl(), 'bump')") >= 0;   // D：吞输入容器 bump
    const srcE = src.indexOf('sv.mem && sv.mem.tutSeen') >= 0;   // E：教学特例先查
    const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算
                 src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防自匹配）
    const srcI = src.indexOf('wrongChainUntil = Date.now() + chainWin()') >= 0 &&
                 src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
                 src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&
                 src.indexOf('estMs(VOICE.missmore.text) + 300') >= 0 &&
                 src.indexOf('estMs(VOICE.sum10.text) + 300') >= 0;   // I：错链窗=链句实长+300（两模式档）
    const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;   // J：语义句 10s 节流
    const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
                 src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
    const srcN = src.indexOf('{ key:' + ' null') < 0;   // N：本款无 keyless 段（拼接防静态扫描自匹配）
    const sigMIG = "getItem('kids" + "game_memory')";
    const srcMIG = src.indexOf(sigMIG) >= 0 &&
                   src.indexOf("lv[(c - 1) + '-5'") >= 0 &&
                   src.indexOf('> CH_LEN - 1') >= 0 &&   // MIG：键基迁移 IIFE（矛盾态+脏键守卫）
                   src.indexOf(sigMIG) < src.indexOf("KIDS.init({ game: 'memory'");   // ⑰ 迁移先于 init
    const srcSEED = src.indexOf('MEM_SEED') >= 0 && src.indexOf('mulberry32(flat * 7919 + MEM_SEED)') >= 0;   // 种子同源
    ok('contract', srcA && srcB && srcD && srcE && srcF && srcI && srcJ && srcK && srcN && srcMIG && srcSEED,
       JSON.stringify({ A: srcA, n: nLim, B: srcB, D: srcD, E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK, N: srcN, MIG: srcMIG, SEED: srcSEED }));
  }

  /* ---- ⑭ estWin 动态断言（窗=实算；estMs 四方同步运行时对账） ---- */
  {
    const winOk = SAME_CHAIN_WIN === 3660 && SAME_CHAIN_WIN === estMs(VOICE.missmore.text.length) + 300 &&
                  SUM10_CHAIN_WIN === 4695 && SUM10_CHAIN_WIN === estMs(VOICE.sum10.text.length) + 300 &&
                  estMs(4) === 1980 && estMs(13) === 5085 &&
                  VOICE.missmore.text.length === 8 && VOICE.sum10.text.length === 11;
    ok('estWin', winOk, 'same=' + SAME_CHAIN_WIN + ' sum10=' + SUM10_CHAIN_WIN);
  }

  /* ---- ⑮ modeled 双钉（禁约数）+ DECIDE_MIN 两档 + LEVEL_MIN ---- */
  {
    const m0 = modeled(0);
    let mn = Infinity, dmOk = true;
    for (const k of Object.keys(SPEC_DECIDE_MIN)) if (DECIDE_MIN[k] !== SPEC_DECIDE_MIN[k]) dmOk = false;
    for (let f = 0; f < 40; f++) mn = Math.min(mn, modeled(f));
    ok('modeled', m0 === 12000 && mn === SPEC_MODELED_MIN && dmOk && mn >= SPEC_LEVEL_MIN,
       'm0=' + m0 + ' min=' + mn);
  }

  /* ---- ⑯ nextHint 对账（章末预告+生成关实算） ---- */
  {
    const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&
                   CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                   CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                   CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                   GEN_HINTS.every((g, i) => g === SPEC_GEN_HINTS[i]) &&
                   nextHint(5) === SPEC_CHAPTER_HINTS[1] && nextHint(11) === SPEC_CHAPTER_HINTS[2] &&
                   nextHint(17) === SPEC_CHAPTER_HINTS[3] && nextHint(23) === SPEC_CHAPTER_HINTS[4];
    const genOk = [24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39].every(f =>
      nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);
    ok('hints', hintOk && genOk, [nextHint(5), nextHint(24), nextHint(39)].join('|'));
  }

  const out = { game: 'memory', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__memVlog = out;                         // 外部断言挂点（任务书钩子）
  document.title = npass === total ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

/* ---------- poke：真实计时下随机翻+错（无异常即过；验收协议 §7 沿老款） ---------- */
async function runPoke() {
  document.body.classList.add('verify');
  KIDS.audio.note = function () {};               // poke 页无音频取证需求，纯防炸（KIDS 未 init）
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {}; KIDS.voice.queue = function () {}; KIDS.voice.say = function () {};
  const out = { poke: true, ok: false };
  try {
    window.MEM.start(24);                         // 生成关（peek 流不跑：poke 早退）
    await wait(400);
    for (let k = 0; k < 6; k++) {
      window.MEM.flip(k % 12);
      window.MEM.miss();
      await wait(150);
    }
    const st = window.MEM.state;
    out.state = { misses: st.misses, streak: st.streak };
    out.ok = !isNaN(st.misses) && st.misses >= 0;
  } catch (e) { out.err = String(e); }
  document.title = out.ok ? 'POKE OK' : 'POKE FAIL';
  $id('verify-result').textContent = JSON.stringify(out);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx=null 双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  runVerify();
} else if (POKE) {
  runPoke();
}
