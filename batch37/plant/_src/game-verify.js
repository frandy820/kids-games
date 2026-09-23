/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元（r47 谱）
   ① 结构：双 viewport simView（1280×800/800×1180）× flat[0,5,10,15]（n=3/4/5/6
     全档——r47 δ1 wide 紧凑布局）：网格 DOM .cell 计数===n²+每格 ≥96×96、行列标尺
     span 计数===n+文本 1..N（ch3-4 淡出态仍在 DOM）、描边对比度 ≥3:1、overflowX
     ≤0；clips 在册 59（pl_ 56+core 3，r47 段二注册后口径 manifest 5517）+duration
     辨别器（§4 实长表 ±60ms——pl 全域 50 键逐验，真值源 r4789_clip_ms.json）
   ② 教学三段（看→帮→独）：tutorialWatch() 真实走完（stub 存档）→ __plDemoR
     ==='planted'（题 0 非末题）且 tut='help'（turn 3×3 单卡迷你关）；turn 题
     点对 → __plTutSolo 且进正式关（flat=0 n=5），watch 折算真实时长 ≤16s
     （单步演示款口径——教学恒 abs，r47 谱不触教学）
   ③ 逐关驱动 flat0-19：确定性（同 flat 两次 JSON 一致）/ 章映射（ch=flat/5+1、
     dch 静态 (ch-1)%4+1、n=3/4/5/6——SPEC-R47 §R2）/ **abs+rel 双流独立复算**
     （verify 自带 mulberry32 副本：abs 流 737 逐题推坐标+撞格重抽同流；rel 流
     9973 逐题推 star+moves+target+约束重抽同流——禁读引擎期望）/ mode 按
     REL_PLAN 档位断言 / 关内 5 格互异 / 引擎直驱（逐题点目标格→planted/末题
     done→全关 3★+已种格 false 不推进）
   ④ 契约 M 帧断言（×flat0/10/15/20 四层）：数值层 mode/row/col/star/moves+card
     文案（SPEC_NUMCN/SPEC_DIRCN/SPEC_STEPCN 独立拼：abs 6 字/rel 15 字）；渲染层
     .cell 计数===n²+dataset.i+empty；**rel 层 star 徽章 DOM 锚（.star+data-star+
     g[data-anim=star]）+种对后清除**；**标尺层 dch≥3 rulers-off 淡出在场/ch1-2
     恒显**；演出层种对后 empty→tree+树苗 svg[data-anim=tree] 在场
   ⑤ 错路径（abs flat0 原链+rel flat5 新链）：开题演出锁内吞 null+错格 wrong+
     miss+1+abs 错链 [pl_wrong,pl_hint]+标尺 .lit+豁免窗三语义+miss≥2 breathe+
     已种格 false；**⑤b rel（flat5 q1）：错链 [pl_wrong,pl_rel_hint]+WRONG_CHAIN_REL
     窗内星星吞 false+窗后星星格 starbeat false 不计 miss+二错 miss=2+对选推进**
   ⑥ 先验专项 20 关全量（verify 独立推导禁读页面期望）：abs/rel 坐标域+specLevel
     逐题对账+关内互异+rel 不变量组（star∉used/净≠0/中途在格/moves 域）+渲染层
     首题 DOM（.cell 计数+标尺文本）
   ⑦ 星级口径：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ 生成关 flat20-39：dch 静态=ch 档断言+n 块恒 3/4/5/6 各 5 关+rel 计数按
     REL_PLAN+specLevel 确定性复算+**分布断言（方向 4 值/步数 3 值/行覆盖——
     下界从均匀期望独立推导+r39-bis 纪律）**
   ⑨ 源码级：读合并 script 第 3 块（b36 M1：script[2]=纯 data+engine+main）——
     契约 A/B/C/D/E/F/I/J/K/O 字面逐条检索+**r47 新锚（CH_N/REL_PLAN/rel 流 9973/
     星星拒绝/playCard 分流/WRONG_CHAIN_REL/CARD_WIN_REL/RULER_FADE_MS/wide
     toggle/DESIGN_KEYS 34 键已注册对账）**+NUMCN 1-6 表双录+CHAPTERS/GEN_HINTS
     双录+nextHint 4/9/14/19 数值断言+24/29/34/39 生成关实算
   ⑩ 确认链构成：__lastQueue===['pl_right']（单 clip）+演出窗 2400 ≥ 2244+abs
     卡句 pl_q 键文本双对账+**rel 开题链 __lastQueue===['pl_rel_from','pl_mv_X',
     'pl_mv_Y']（独立拼）**+窗算式（CARD_WIN 3315 双口径/CARD_WIN_REL 6900/
     WRONG_CHAIN_REL 6219）
   ⑪ 写档：origLS 保护——还原真函数→init plant→autoSolve 通关→localStorage
     kidsgame_plant v:'1.0' levels['1-0'] 更新；测后恢复原 localStorage
   ⑫ 真实路径：fresh 预置存档（v1.0+tutSeen）→ PL.start(0) 非教学直达题面+
     window.PL 暴露（b29 坑⑥）；try/finally 保异常时 origLS 也恢复（b36 m4）
   结果写 #verify-result + window.__plVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  window.__plOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-R47 §R4 文字独立重列（禁抄页面 NUMCN/VOICE/CHAPTERS/常量） */
  const SPEC_NUMCN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六' };   // 契约 L：行列 1-6 全量（r47 扩五六）
  const SPEC_DIRCN = { r: '右', d: '下', l: '左', u: '上' };
  const SPEC_STEPCN = { 1: '一', 2: '两', 3: '三' };                            // 步数「两」非「二」
  const SPEC_N = { 1: 3, 2: 4, 3: 5, 4: 6 };                    // 网格边长（r47 §R2 单调坡度 3/4/5/6）
  const SPEC_REL_PLAN = { 1: [], 2: [1, 3], 3: [1, 3], 4: [0, 2, 4] };   // rel 题位（§R1δ3 章谱混排）
  const SPEC_DUR = { pl_tut_watch: 3072, pl_tut_turn: 1824, pl_ask: 1872,
                     pl_hint: 2568, pl_right: 1944, pl_wrong: 2064 };
  /* T46 在册 16 键+r47 新 20 键实长独立副本（verify 自持——禁抄页面常量；build python
     侧 PL_Q_DUR 同值双录——防漂）；新 20 键为段二实测回填（真值源 r4789_clip_ms.json，
     mutagen 口径——r23 P2-1 红线 est 禁当实测） */
  const SPEC_PL_Q = { pl_q_1_1: 1992, pl_q_1_2: 1992, pl_q_1_3: 2064, pl_q_1_4: 2064,
                      pl_q_1_5: 2040, pl_q_1_6: 2064,
                      pl_q_2_1: 1944, pl_q_2_2: 1992, pl_q_2_3: 2064, pl_q_2_4: 2064,
                      pl_q_2_5: 2040, pl_q_2_6: 2040,
                      pl_q_3_1: 2088, pl_q_3_2: 2088, pl_q_3_3: 2160, pl_q_3_4: 2160,
                      pl_q_3_5: 2112, pl_q_3_6: 2136,
                      pl_q_4_1: 2064, pl_q_4_2: 2112, pl_q_4_3: 2136, pl_q_4_4: 2184,
                      pl_q_4_5: 2112, pl_q_4_6: 2160,
                      pl_q_5_1: 1992, pl_q_5_2: 2016, pl_q_5_3: 2064, pl_q_5_4: 2112,
                      pl_q_5_5: 2016, pl_q_5_6: 2064,
                      pl_q_6_1: 2040, pl_q_6_2: 2040, pl_q_6_3: 2112, pl_q_6_4: 2136,
                      pl_q_6_5: 2088, pl_q_6_6: 2112 };
  const specQWorst = Math.max.apply(null, Object.keys(SPEC_PL_Q).map(k => SPEC_PL_Q[k]));   // 2184（pl_q_4_4 在册旧键）
  /* r47 rel/mv 14 键实测实长（段二注册后回填，同真值源；SPEC §R7 窗复核依据） */
  const SPEC_REL_MV = { pl_rel_from: 1920, pl_rel_hint: 2928,
                        pl_mv_r1: 1776, pl_mv_r2: 1872, pl_mv_r3: 1920,
                        pl_mv_d1: 1776, pl_mv_d2: 1872, pl_mv_d3: 1920,
                        pl_mv_l1: 1848, pl_mv_l2: 1896, pl_mv_l3: 1920,
                        pl_mv_u1: 1776, pl_mv_u2: 1872, pl_mv_u3: 1920 };
  const specMvWorst = Math.max.apply(null, Object.keys(SPEC_REL_MV)              // 1920（仅 mv 段——
                    .filter(k => k.indexOf('pl_mv_') === 0).map(k => SPEC_REL_MV[k]));   // pl_rel_hint 2928 不入 mv worst）
  const specEst = ch => ch * 345 + 600;                        // 家族 T estMs 全字符口径（§R7 est 上界）
  const SPEC_CHAPTER_HINTS = { 1: '花园变大啦，四行四列', 2: '花园更大啦，五行五列',
                               3: '大花园大挑战，六行六列', 4: '新一轮植树开始' };
  const SPEC_GEN_HINTS = ['小花园里，再种五棵小树', '花园变大啦，四行四列',
                          '大花园里，再种五棵小树', '六行六列大花园，种满小树'];
  /* 独立 mulberry32 副本（禁调引擎同名函数——坐标域复算独立性） */
  const specMul = a => function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const specRi = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  /* r47 §R3 双流独立推导：
     abs=mulberry32(flat*7919+737+qi*131)（v1 原样）；rel=mulberry32(flat*7919+9973+qi*131)
     rel 约束重抽同流：star∉used→feasible(DIRS 序过滤 margin≥1)→d=集[floor(rnd*len)]、
     s=ri(1,min(3,margin)) 两段→中途/终点在格→净≠0→终点∉used——verify 从零复算=对账锚 */
  const SPEC_DRC = { r: [0, 1], d: [1, 0], l: [0, -1], u: [-1, 0] };
  const specMargin = (r, c, n, d) => d === 'r' ? n - c : d === 'd' ? n - r : d === 'l' ? c - 1 : r - 1;
  const specFeas = (r, c, n) => ['r', 'd', 'l', 'u'].filter(d => specMargin(r, c, n, d) >= 1);
  const specAbsOne = (flat, qi, n, used) => {
    const rnd = specMul(flat * 7919 + 737 + qi * 131);          // abs 流常量 737（v1 原样）
    let row, col, idx;
    do {
      row = specRi(rnd, 1, n);
      col = specRi(rnd, 1, n);
      idx = (row - 1) * n + (col - 1);
    } while (used.indexOf(idx) >= 0);
    used.push(idx);
    return { row: row, col: col, idx: idx };
  };
  const specRel = (flat, qi, n, used) => {
    const rnd = specMul(flat * 7919 + 9973 + qi * 131);         // rel 流常量 9973（r47 §R3）
    for (;;) {
      const sr = specRi(rnd, 1, n), sc = specRi(rnd, 1, n);
      const starI = (sr - 1) * n + (sc - 1);
      if (used.indexOf(starI) >= 0) continue;
      const f1 = specFeas(sr, sc, n);
      if (!f1.length) continue;
      const d1 = f1[Math.floor(rnd() * f1.length)];
      const s1 = specRi(rnd, 1, Math.min(3, specMargin(sr, sc, n, d1)));
      const r1 = sr + SPEC_DRC[d1][0] * s1, c1 = sc + SPEC_DRC[d1][1] * s1;
      const f2 = specFeas(r1, c1, n);
      if (!f2.length) continue;
      const d2 = f2[Math.floor(rnd() * f2.length)];
      const s2 = specRi(rnd, 1, Math.min(3, specMargin(r1, c1, n, d2)));
      const tr = r1 + SPEC_DRC[d2][0] * s2, tc = c1 + SPEC_DRC[d2][1] * s2;
      const tgtI = (tr - 1) * n + (tc - 1);
      if (tgtI === starI || used.indexOf(tgtI) >= 0) continue;
      used.push(tgtI);
      return { row: tr, col: tc, star: { row: sr, col: sc },
               moves: [[d1, s1], [d2, s2]], idx: tgtI, starIdx: starI };
    }
  };
  const specDch = flat => Math.floor(flat / 5) % 4 + 1;          // 静态 ch 档（域承诺型无 RNG）
  const specLevel = flat => {
    const dch = specDch(flat), n = SPEC_N[dch], relAt = SPEC_REL_PLAN[dch];
    const used = [], qs = [];
    for (let qi = 0; qi < 5; qi++) {
      if (relAt.indexOf(qi) >= 0) {
        const r = specRel(flat, qi, n, used);
        qs.push({ mode: 'rel', row: r.row, col: r.col, star: r.star,
                  moves: r.moves, idx: r.idx, starIdx: r.starIdx });
      } else {
        const a = specAbsOne(flat, qi, n, used);
        qs.push({ mode: 'abs', row: a.row, col: a.col, star: null,
                  moves: null, idx: a.idx, starIdx: -1 });
      }
    }
    return { dch: dch, n: n, qs: qs };
  };
  const specCardText = e => e.mode === 'rel'
    ? '从星星出发，' + ('向' + SPEC_DIRCN[e.moves[0][0]] + SPEC_STEPCN[e.moves[0][1]] + '格') +
      '，' + ('向' + SPEC_DIRCN[e.moves[1][0]] + SPEC_STEPCN[e.moves[1][1]] + '格')
    : '第' + SPEC_NUMCN[e.row] + '行' + '第' + SPEC_NUMCN[e.col] + '列';
  /* Mj-1 防回归（core voice.queue 弃尾语义）：key 空缺带 text 的 TTS 段播完即
     return 丢弃后续段——本款确认链 ['pl_right'] 单 clip 全有键（r47 rel 链 3 clip
     全键——段一未注册静默=core 缺 clip 无文本放弃整句，天然安全） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);
  const cellAt = i => gridEl.querySelector('.cell[data-i="' + i + '"]');
  const specTgt = q => (q.row - 1) * q.n + (q.col - 1);          // 独立目标格（禁读 cellIdx）
  const specWrongCell = (q, planted, starI) => {                 // 独立挑一格 ≠目标 ≠星星 ∉已种
    const nn = q.n * q.n, tgt = specTgt(q);
    for (let i = 0; i < nn; i++)
      if (i !== tgt && i !== starI && (!planted || planted.indexOf(i) < 0)) return i;
    return -1;
  };
  const unlocked = async () => {                  // 等开题/演出/错反馈锁窗结束（verify 提速后）
    let wg = 0;                                   // showUntil 含 +140 余量——尾巴也须等净
    while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= state.showUntil;
  };

  /* ---- ③ 逐关驱动 flat0-19：确定性+章映射+abs/rel 双流独立复算+互异+引擎直驱 ---- */
  total++;
  {
    let ok3 = true, bad3 = null;
    for (let flat = 0; flat < 20 && ok3; flat++) {
      const L1 = genLevel(flat), L2 = genLevel(flat);
      if (JSON.stringify(L1.quizzes) !== JSON.stringify(L2.quizzes)) { ok3 = false; bad3 = 'det ' + flat; break; }
      const expCh = Math.floor(flat / 5) + 1, exp = specLevel(flat);
      if (L1.ch !== expCh || L1.dch !== exp.dch || L1.n !== SPEC_N[exp.dch]) { ok3 = false; bad3 = 'ch ' + flat; break; }
      /* 双流独立复算：specLevel 从零推 5 题（abs 撞格重抽/rel 约束重抽同流）逐题对账 */
      const uniq = new Set(exp.qs.map(e => e.idx));
      if (uniq.size !== 5) { ok3 = false; bad3 = 'uniq ' + flat; break; }   // 关内 5 格互异
      for (let k = 0; k < 5; k++) {
        const q = L1.quizzes[k], e = exp.qs[k];
        if (q.mode !== e.mode || q.row !== e.row || q.col !== e.col || q.n !== L1.n ||
            JSON.stringify(q.star) !== JSON.stringify(e.star) ||
            JSON.stringify(q.moves) !== JSON.stringify(e.moves) ||
            structWhy(q, L1.dch, k)) { ok3 = false; bad3 = 'coord ' + flat + '/' + k; break; }
      }
      if (!ok3) break;
      /* 引擎直驱：逐题点目标格 → planted / 末题 done；已种格 false 不推进；全关零错=3 星 */
      const L3 = genLevel(flat);
      let driveOk = true, plantedSeen = [];
      for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
        if (k === 1) {                                    // 已种格拒绝：点上一题已种格（互异域内，mode 无关）
          const rj = engTapCell(L3, exp.qs[0].idx);
          if (rj !== false || L3.step !== 1 || L3.quizzes[1]._miss !== 0) driveOk = false;
        }
        const tgt = exp.qs[L3.step].idx;                  // 独立目标（specLevel 复算，禁读引擎）
        const expR = k === L3.quizzes.length - 1 ? 'done' : 'planted';
        const r = engTapCell(L3, tgt);
        plantedSeen.push(tgt);
        if (r !== expR || L3.quizzes[k]._miss !== 0) { driveOk = false; break; }
      }
      if (!driveOk || !L3.done || L3.step !== CH_LEN || L3.retries !== 0 || engStars(L3) !== 3 ||
          JSON.stringify(L3.planted) !== JSON.stringify(plantedSeen))
        { ok3 = false; bad3 = bad3 || ('drive ' + flat); }
    }
    const u3 = ok3;
    if (u3) npass++;
    units.drive = { ok: u3, bad: bad3 };
  }

  /* ---- ⑧ 生成关 flat20-39：dch 静态=ch 档+n 块恒 3/4/5/6+rel 计数+确定性复算+分布 ---- */
  total++;
  {
    let ok8 = true, bad8 = null, prevDch = 0, monoOk = true;
    const nTally = {}, relTally = {};
    const dist = { dir: {}, step: {}, rowN: {}, starRowN: {} };   // 分布聚合（全 40 关独立复算源）
    for (let flat = 20; flat < 40 && ok8; flat++) {
      const L = genLevel(flat), exp = specLevel(flat);
      if (L.dch !== exp.dch || L.n !== SPEC_N[exp.dch]) { ok8 = false; bad8 = 'dch ' + flat; break; }
      if (L.dch < prevDch) monoOk = false;                 // 3×3→6×6 单调承诺（随机破坏坡度=禁）
      prevDch = L.dch;
      const blk = Math.floor((flat - 20) / 5);             // n 块：20-24=3/25-29=4/30-34=5/35-39=6
      if (L.n !== [3, 4, 5, 6][blk]) { ok8 = false; bad8 = 'nblk ' + flat; break; }
      const L2 = genLevel(flat);
      if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) { ok8 = false; bad8 = 'det ' + flat; break; }
      if (L.ch !== Math.floor(flat / 5) + 1) { ok8 = false; bad8 = 'ch ' + flat; break; }
      let relN = 0;
      const uniq = new Set(exp.qs.map(e => e.idx));
      if (uniq.size !== 5) { ok8 = false; bad8 = 'uniq ' + flat; break; }
      for (let k = 0; k < 5; k++) {
        const q = L.quizzes[k], e = exp.qs[k];
        if (q.mode !== e.mode || q.row !== e.row || q.col !== e.col ||
            JSON.stringify(q.star) !== JSON.stringify(e.star) ||
            JSON.stringify(q.moves) !== JSON.stringify(e.moves) ||
            structWhy(q, L.dch, k)) { ok8 = false; bad8 = 'coord ' + flat + '/' + k; break; }
        if (q.mode === 'rel') relN++;
      }
      if (!ok8) break;
      if (relN !== SPEC_REL_PLAN[exp.dch].length) { ok8 = false; bad8 = 'reln ' + flat; break; }
      nTally[L.n] = (nTally[L.n] || 0) + 1;
      relTally[L.dch] = (relTally[L.dch] || 0) + relN;
    }
    /* 分布断言（r39-bis 纪律：下界从均匀期望独立推导——全 40 关 rel 70 题×2 段=140 段，
       方向 4 值均匀期望 35/值、feasible 过滤近均匀（星均匀取，边缘 1/n 概率失可行）；
       步数 1-3 受 min(3,margin) 压缩期望 ~47/35/29——下界取 8=最稀桶期望 1/4 保守口径；
       行覆盖 n=6 桶：dch4 10 关 50 题（abs 20+rel 30）行均匀期望 8.3/值——下界 2） */
    for (let flat = 0; flat < 40 && ok8; flat++) {
      const exp = specLevel(flat);
      exp.qs.forEach(e => {
        const key = 'n' + exp.n;
        dist.rowN[key] = dist.rowN[key] || {};
        dist.rowN[key][e.row] = (dist.rowN[key][e.row] || 0) + 1;
        if (e.mode === 'rel') {
          e.moves.forEach(m => {
            dist.dir[m[0]] = (dist.dir[m[0]] || 0) + 1;
            dist.step[m[1]] = (dist.step[m[1]] || 0) + 1;
          });
          dist.starRowN[key] = dist.starRowN[key] || {};
          dist.starRowN[key][e.star.row] = (dist.starRowN[key][e.star.row] || 0) + 1;
        }
      });
    }
    const dirOk = ['r', 'd', 'l', 'u'].every(d => (dist.dir[d] || 0) >= 8);
    const stepOk = [1, 2, 3].every(s => (dist.step[s] || 0) >= 8);
    const rowOk = [5, 6].every(n => {
      const t = dist.rowN['n' + n] || {};
      let ok = true;
      for (let r = 1; r <= n; r++) if ((t[r] || 0) < 2) ok = false;   // 每行 ≥2（期望 8.3 半值下界）
      return ok;
    });
    const aggOk = nTally[3] === 5 && nTally[4] === 5 && nTally[5] === 5 && nTally[6] === 5 &&
                  relTally[1] === 0 && relTally[2] === 10 && relTally[3] === 10 && relTally[4] === 15;
    const u8 = ok8 && monoOk && aggOk && dirOk && stepOk && rowOk;
    if (u8) npass++;
    units.gen = { ok: u8, bad: bad8, mono: monoOk, nTally: nTally, relTally: relTally,
                  dist: { dir: dist.dir, step: dist.step, rowN: dist.rowN, starRowN: dist.starRowN },
                  dirOk: dirOk, stepOk: stepOk, rowOk: rowOk };
  }

  /* ---- ② 教学三段（看→帮→独）：stub 存档后 tutorialWatch 真实走完 ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  window.__plTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__plWatchMs || 1e9) / SPEED;       // watch 段实测（单步演示款 ≤16s）
  const tutHelp = window.__plDemoR === 'planted' && state.tut === 'help' &&
                window.PL.currentLevel.flat === -1 && window.PL.quiz.n === 3 &&
                window.PL.quiz.mode === 'abs' &&
                window.PL.quiz.row === 3 && window.PL.quiz.col === 1 &&      // turn 迷你关题（3,1）
                twWatch <= 16000 && tw <= 24000;
  await unlocked();
  const qT = window.PL.quiz;                                // "帮"阶段放手题（turn 单卡）
  const rT = await window.PL.tapCell(specTgt(qT));          // 首次种对 → 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__plTutSolo === true &&
                window.PL.currentLevel.flat === 0 && window.PL.currentLevel.n === 5;
  const u2 = tutHelp && tutSolo;
  if (u2) npass++;
  units.tutorial = { ok: u2, demoR: window.__plDemoR, tut: state.tut,
                     solo: window.__plTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT };

  /* ---- ⑤ 错路径：abs（flat0 原链）+ ⑤b rel（flat5 q1 新链） ---- */
  total++;
  {
    /* 0 段：开题演出锁（真时钟）内正确格点选也吞 null（不判定不计 miss——感知期不作答） */
    startLevel(0);                       // 开题：ask+卡句读卡（演出锁窗内）
    const q0 = window.PL.quiz;
    const nullTap = (await window.PL.tapCell(specTgt(q0))) === null;
    await unlocked();
    const swallowShow = nullTap && window.PL.quiz.step === 0 && window.PL.quiz.miss === 0;
    /* A 段（flat0 ch1 3×3 abs）：错→标尺 lit 捕获→豁免窗内二错吞→真时钟过窗→
       二错照计 miss=2→breathe→对 */
    startLevel(0);
    await unlocked();
    const qA = window.PL.quiz;
    const wrongCell = specWrongCell(qA, null, -1);
    const prA = window.PL.tapCell(wrongCell);       // 首错（豁免窗起播 5082 真时钟）——不 await 先捕 lit
    let sawLit = false;
    for (let w = 0; w < 300 && !sawLit; w++) {
      const rr = rowRulerEl.children[qA.row - 1], cc = colRulerEl.children[qA.col - 1];
      if ((rr && rr.classList.contains('lit')) || (cc && cc.classList.contains('lit'))) sawLit = true;
      else await wait(5);
    }
    const rA = await prA;
    const chainA = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'pl_wrong' &&    // 错链头=wrong clip
                   window.__lastQueue[1] === 'pl_hint' &&     // abs 语义句=hint「先看行，再看列」
                   window.__lastQueue.every(p => typeof p === 'string') &&   // 全 clip 无 keyless
                   !keylessLast(window.__lastQueue);
    await wait(200);                                           // 出错锁 +140 演出尾（尾内 tap=null 语义正确），仍在豁免窗 5082 内
    const rejA = await window.PL.tapCell(wrongCell) === false;   // 豁免窗内二错吞（guard）
    const miss1 = window.PL.quiz.miss === 1 && window.PL.currentLevel.miss === 1;
    await new Promise(w => setTimeout(w, 5150));               // 等豁免窗（真时钟 5082）过
    const rD = await window.PL.tapCell(wrongCell);             // 窗后二错照计
    const tgtA = specTgt(qA);
    const breathe2 = cellAt(tgtA).classList.contains('breathe');   // miss≥2=正确格 breathe
    const miss2 = rD === 'wrong' && window.PL.quiz.miss === 2;
    await wait(200);                                           // 出 rD 错锁 +140 演出尾
    const rE = await window.PL.tapCell(tgtA);                  // 对选推进
    /* B 段（重开 flat0）：豁免窗内对选放行 'planted'（guard 只吞错点） */
    startLevel(0);
    await unlocked();
    const qB = window.PL.quiz;
    const wB = specWrongCell(qB, null, -1);
    await window.PL.tapCell(wB);                                // 首错（错路径完成=locked 解除）
    await wait(200);                                            // 出错锁 +140 演出尾，仍在豁免窗内
    const rPass = await window.PL.tapCell(specTgt(qB));         // 窗内对选（真时钟仍在 5082 内）
    const stepB = window.PL.currentLevel.step;                  // B 段终值即时捕获（后续 C/⑤b 段会推进他关 step）
    /* C 段：已种格 false 不计 miss（tap 上一题已种格——探索不罚家族 D） */
    startLevel(0);
    await unlocked();
    const qC = window.PL.quiz;
    await window.PL.tapCell(specTgt(qC));                       // 题 0 种对 → step 1（新卡开题）
    await unlocked();
    const planted0 = window.PL.quiz.planted[0];
    const rShake = await window.PL.tapCell(planted0);           // 点题 0 已种格
    const shakeOk = rShake === false && window.PL.quiz.step === 1 &&
                    window.PL.quiz.miss === 0 && window.PL.currentLevel.miss === 0;
    /* ⑤b rel 错路径（flat5 ch2 4×4 q1=rel——specLevel 独立复算 star/moves/target）：
       错链 [pl_wrong,pl_rel_hint]+豁免窗 6219 内星星格吞 false+窗后星星格 starbeat
       false 不计 miss+二错 miss=2+对选推进 */
    startLevel(5);
    await unlocked();
    const exp5 = specLevel(5);
    await window.PL.tapCell(exp5.qs[0].idx);                    // q0（abs）种对 → q1（rel）开题
    await unlocked();
    const qR = window.PL.quiz;
    const eR = exp5.qs[1];
    const relShape = qR.mode === 'rel' && qR.n === 4 &&
                     qR.row === eR.row && qR.col === eR.col &&
                     JSON.stringify(qR.star) === JSON.stringify(eR.star) &&
                     JSON.stringify(qR.moves) === JSON.stringify(eR.moves) &&
                     qR.card === specCardText(eR) && qR.card.length === 15;
    const starCellOk = (() => {                                 // 星星徽章 DOM 锚（rel 开放态）
      const se = cellAt(eR.starIdx);
      return !!se && se.classList.contains('star') && se.dataset.star === '1' &&
             !!se.querySelector('g[data-anim="star"]');
    })();
    const wrongR = specWrongCell(qR, qR.planted, eR.starIdx);   // 错格（≠目标 ≠星星 ∉已种）
    const rR1 = await window.PL.tapCell(wrongR);                // 首错（rel 豁免窗 6219 真时钟）
    const chainR = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'pl_wrong' &&
                   window.__lastQueue[1] === 'pl_rel_hint' &&   // rel 语义句（r47 §R6 设计键）
                   window.__lastQueue.every(p => typeof p === 'string') &&
                   !keylessLast(window.__lastQueue);
    await wait(250);                                            // 出错锁尾（2214*SPEED+140），仍在 6219 窗内
    const rejStar = await window.PL.tapCell(eR.starIdx) === false;   // 窗内星星格吞（guard）
    const missR1 = window.PL.quiz.miss === 1;
    await new Promise(w => setTimeout(w, 6300));                // 等 rel 豁免窗（真时钟 6219）过
    const rStarFree = await window.PL.tapCell(eR.starIdx);      // 窗后星星格=引擎 starbeat 拒绝
    const rR2 = await window.PL.tapCell(wrongR);                // 窗后二错照计
    const breatheR = cellAt(specTgt(qR)).classList.contains('breathe');
    const missR2 = rR2 === 'wrong' && window.PL.quiz.miss === 2;
    await wait(200);
    const rRok = await window.PL.tapCell(specTgt(qR));          // 对选推进（星星清除）
    const starCleared = !cellAt(eR.starIdx).classList.contains('star');
    const u5 = swallowShow && rA === 'wrong' && chainA && sawLit && rejA && miss1 && miss2 &&
               breathe2 && rE === 'planted' && rPass === 'planted' &&
               stepB === 1 && shakeOk &&
               relShape && starCellOk && rR1 === 'wrong' && chainR && rejStar && missR1 &&
               rStarFree === false && missR1 && rR2 === 'wrong' && missR2 && breatheR &&
               rRok === 'planted' && starCleared &&
               window.PL.quiz.step === 2 && window.PL.quiz.miss === 0;
    if (u5) npass++;
    units.wrong = { ok: u5, showSwallow: swallowShow, first: rA, chain: chainA, lit: sawLit,
                    rejInWin: rejA, miss1: miss1, miss2: miss2, breathe2: breathe2,
                    right: rE, passInWin: rPass, stepB: stepB, plantedRej: shakeOk,
                    relShape: relShape, starCell: starCellOk, relFirst: rR1, relChain: chainR,
                    starRejInWin: rejStar, starRejFree: rStarFree, missR2: missR2,
                    relRight: rRok, starCleared: starCleared };
  }

  /* ---- ④ 契约 M 帧断言（×flat0/10/15/20——数值/渲染/rel 星星/标尺淡出/演出五层） ---- */
  total++;
  {
    const fr = [];
    for (const flat of [0, 10, 15, 20]) {
      startLevel(flat);
      let rulerTiming = true;                     /* r47-fix M2 时刻断言：卡亮初期可见+越过淡出点已 off
                                                      （修复前 ASK_WIN 双重计入→淡出点 405ms，本采样 204ms 必红） */
      if (specDch(flat) >= 3) {
        const t0 = Date.now();
        while (!cardEl.classList.contains('lit') && Date.now() - t0 < 5000) await wait(40);
        await wait(20);                                          // 卡亮初期：淡出窗未到
        const early = !gardenEl.classList.contains('rulers-off');
        await wait(RULER_FADE_MS * SPEED + 60);                  // 越过淡出点
        const faded = gardenEl.classList.contains('rulers-off');
        rulerTiming = early && faded;
      }
      await unlocked();                                       // 开题开放态
      const q = window.PL.quiz;
      const exp = specLevel(flat), e = exp.qs[0];
      /* 数值层：mode/row/col 域+planted 空+card 文案（SPEC 独立拼——abs 6 字/rel 15 字） */
      const expCard = specCardText(e);
      const numOk = q.mode === e.mode && q.row === e.row && q.col === e.col &&
                    q.row >= 1 && q.row <= q.n && q.col >= 1 && q.col <= q.n &&
                    q.planted.length === 0 && q.card === expCard &&
                    expCard.length === (e.mode === 'rel' ? 15 : 6) &&
                    q.kind === 'plant' && q.step === 0 &&
                    JSON.stringify(q.star) === JSON.stringify(e.star) &&
                    JSON.stringify(q.moves) === JSON.stringify(e.moves);
      /* 渲染层：.cell 计数===n²+dataset.i 扁平对账+empty 类+树苗 DOM 预挂 */
      const cells = Array.prototype.map.call(gridEl.querySelectorAll('.cell'), c => c);
      const renderOk = cells.length === q.n * q.n &&
                       cells.every((c, i) => Number(c.dataset.i) === i) &&
                       cells[0].classList.contains('empty') &&
                       gridEl.dataset.n === String(q.n) &&
                       $id('game').classList.contains('wide') === (q.n >= 5);   // δ1 wide 布局开关
      /* 标尺层：行/列标尺 span 计数===n+文本 1..N（ch3-4 淡出态仍在 DOM——计数与文本
         恒真；rulers-off 类=dch≥3 淡出态在场断言（δ2），ch1-2 恒显=类缺席） */
      const rr = Array.prototype.map.call(rowRulerEl.children, s => s.textContent);
      const cc = Array.prototype.map.call(colRulerEl.children, s => s.textContent);
      const rulerOk = rr.length === q.n && cc.length === q.n &&
                      rr.every((t, i) => t === String(i + 1)) &&
                      cc.every((t, i) => t === String(i + 1)) &&
                      gardenEl.classList.contains('rulers-off') === (exp.dch >= 3);
      /* rel 层：星星徽章 DOM 锚（.star+data-star+g[data-anim=star]）+卡 .rel 长文案类 */
      const starOk = e.mode === 'rel'
        ? (() => { const se = cellAt(e.starIdx);
            return !!se && se.classList.contains('star') && se.dataset.star === '1' &&
                   !!se.querySelector('g[data-anim="star"]') && cardEl.classList.contains('rel'); })()
        : (!document.querySelector('.cell.star') && !document.querySelector('.cell .starbadge') &&   /* r47-fix M1：abs 关全场无残留徽章 */
           !cardEl.classList.contains('rel'));
      /* 演出层：种对后 DOM 类 empty→tree+树苗 g[data-anim=tree] 在场+rel 星星清除 */
      const tgt = e.idx;
      await window.PL.tapCell(tgt);
      const tc = cellAt(tgt);
      const animOk = tc.classList.contains('tree') && !tc.classList.contains('empty') &&
                     !!tc.querySelector('g[data-anim="tree"]') &&
                     window.PL.quiz.planted.join() === String(tgt) &&
                     cells.filter(c => c.classList.contains('tree')).length === 1 &&
                     (e.mode === 'rel' ? (!cellAt(e.starIdx).classList.contains('star') &&
                                          !cellAt(e.starIdx).querySelector('.starbadge')) : true);   /* r47-fix M1：徽章随星拆除 */
      fr.push({ flat: flat, ok: numOk && renderOk && rulerOk && starOk && animOk && rulerTiming,
                num: numOk, render: renderOk, ruler: rulerOk, star: starOk, anim: animOk, timing: rulerTiming });
    }
    const u4 = fr.every(f => f.ok);
    if (u4) npass++;
    units.frame = { ok: u4, frames: fr };
  }

  /* ---- ⑥ 先验专项 20 关全量（独立推导禁读页面期望+渲染首题 DOM） ---- */
  total++;
  {
    let ok6 = true, bad6 = null;
    for (let flat = 0; flat < 20 && ok6; flat++) {
      const exp = specLevel(flat);
      const uniq = new Set(exp.qs.map(e => e.idx));
      if (uniq.size !== 5) { ok6 = false; bad6 = 'uniq ' + flat; break; }
      for (let k = 0; k < 5; k++) {                          // 坐标域+rel 不变量组（§R3 先验）
        const e = exp.qs[k];
        if (!Number.isInteger(e.row) || e.row < 1 || e.row > exp.n ||
            !Number.isInteger(e.col) || e.col < 1 || e.col > exp.n)
          { ok6 = false; bad6 = 'dom ' + flat + '/' + k; break; }
        if (e.mode === 'rel') {
          if (e.idx === e.starIdx) { ok6 = false; bad6 = 'net0 ' + flat + '/' + k; break; }
          let r = e.star.row, c = e.star.col, mvOk = true;
          for (let mi = 0; mi < 2; mi++) {
            const m = e.moves[mi];
            if (!SPEC_DIRCN[m[0]] || m[1] < 1 || m[1] > 3) { mvOk = false; break; }
            r += SPEC_DRC[m[0]][0] * m[1]; c += SPEC_DRC[m[0]][1] * m[1];
            if (r < 1 || r > exp.n || c < 1 || c > exp.n) { mvOk = false; break; }
          }
          if (!mvOk || r !== e.row || c !== e.col) { ok6 = false; bad6 = 'mv ' + flat + '/' + k; break; }
        }
      }
      if (!ok6) break;
      /* 渲染层首题 DOM：.cell 计数+标尺文本 1..N（引擎网格渲染对账） */
      startLevel(flat);
      await unlocked();
      const q0 = window.PL.quiz;
      const domN = gridEl.querySelectorAll('.cell').length;
      const rr = Array.prototype.map.call(rowRulerEl.children, s => s.textContent);
      if (domN !== q0.n * q0.n || q0.n !== exp.n ||
          rr.length !== exp.n || rr[rr.length - 1] !== String(exp.n))
        { ok6 = false; bad6 = bad6 || ('render ' + flat); break; }
    }
    const u6 = ok6;
    if (u6) npass++;
    units.prior = { ok: u6, bad: bad6 };
  }

  /* ---- ⑦ 星级口径（引擎级构造直测：0=3★/1-2=2★/≥3=1★，永不 0 星） ---- */
  total++;
  {
    const L7 = genLevel(10);
    L7.retries = 0; const st3 = engStars(L7) === 3;
    L7.retries = 1; const st2a = engStars(L7) === 2;
    L7.retries = 2; const st2b = engStars(L7) === 2;
    L7.retries = 3; const st1 = engStars(L7) === 1;
    L7.retries = 9; const stFloor = engStars(L7) === 1;
    const u7 = st3 && st2a && st2b && st1 && stFloor;
    if (u7) npass++;
    units.stars = { ok: u7, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };
  }

  /* ---- ⑩ 确认链构成（单 clip+abs 卡句键文本+rel 开题链独立拼+窗算式） ---- */
  total++;
  {
    startLevel(10);                                            // ch3 5×5 q0=abs（REL_PLAN[3]=[1,3]）
    await unlocked();
    const exp10 = specLevel(10), e0 = exp10.qs[0];
    const expCard = specCardText(e0);
    const expQKey = 'pl_q_' + e0.row + '_' + e0.col;          // T46：卡句 clip 键独立拼
    const cardOk = window.__lastVoiceKey === expQKey &&
                   window.__lastVoiceText === expCard && expCard.length === 6;
    await window.PL.tapCell(e0.idx);
    const LQ = window.__lastQueue;
    const chainOk = LQ && LQ.length === 1 &&
                    LQ[0] === 'pl_right' &&                   // 确认链=['pl_right'] 单 clip（SPEC §2）
                    typeof LQ[0] === 'string' &&
                    !keylessLast(LQ);                         // 无 keyless 段（契约 N 天然安全）
    /* rel 开题链：flat5 q1（rel）开题后 __lastQueue===['pl_rel_from','pl_mv_X','pl_mv_Y']
       （独立拼——SPEC §R4 relClips 公式；段一未注册键 stub 照记——注册后同键接链） */
    startLevel(5);
    await unlocked();
    const exp5b = specLevel(5);
    await window.PL.tapCell(exp5b.qs[0].idx);                 // q0 abs 种对 → q1 rel 开题
    await unlocked();
    const e1 = exp5b.qs[1];
    const expRelChain = ['pl_rel_from', 'pl_mv_' + e1.moves[0][0] + e1.moves[0][1],
                         'pl_mv_' + e1.moves[1][0] + e1.moves[1][1]];
    const relChainOk = window.__lastQueue && window.__lastQueue.length === 3 &&
                       window.__lastQueue.every((p, i) => p === expRelChain[i]) &&
                       window.__lastQueue.every(p => typeof p === 'string');
    /* 窗算式：判对 2400 ≥ 2244；CARD_WIN 3315 ≥ 在册 worst 2184+300 与 6 字 est 2670+300
       双口径；CARD_WIN_REL 6900 ≥ est 链 6585+300 且 ≥ 实测链 6060+300（§R7 双口径，
       段二实测复核）；WRONG_CHAIN_REL 6219=est 错链 ≥ 实测 5442（窗不调） */
    const lenOk = 1100 + 1300 >= 1944 + 300 &&
                  CARD_WIN === 3315 && 3315 >= specQWorst + 300 &&
                  3315 >= specEst(6) + 300 &&
                  CARD_WIN_REL === 6900 &&
                  6900 >= (specEst(5) + 150 + specEst(4) + 150 + specEst(4)) + 300 &&
                  6900 >= (SPEC_REL_MV.pl_rel_from + 150 + specMvWorst + 150 + specMvWorst) + 300 &&
                  WRONG_CHAIN_REL === 2064 + 150 + specEst(9) + 300 && WRONG_CHAIN_REL === 6219 &&
                  WRONG_CHAIN_REL >= 2064 + 150 + SPEC_REL_MV.pl_rel_hint + 300;
    const u10 = chainOk && lenOk && cardOk && relChainOk;
    if (u10) npass++;
    units.confirm = { ok: u10, chain: chainOk, win: lenOk, card: cardOk, relChain: relChainOk,
                      queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)),
                      qKey: window.__lastVoiceKey, qText: window.__lastVoiceText,
                      relQueue: expRelChain };
  }

  /* ---- ⑨ 源码级断言（读自身合并 script 文本——第 3 块，b36 M1：
     script[2]=纯 data+engine+main 无 verify 字面；script[3]=verify 独立第 4 块） ---- */
  total++;
  {
    const scripts = document.querySelectorAll('script');
    const src = document.querySelectorAll('script')[2].textContent;         // b36 M1：script[2]=纯 data+engine+main
    const coreSrc = document.querySelectorAll('script')[0].textContent;
    const verifyIsolated = scripts.length === 4 &&                          // 4 块布局（core/clips/game/verify）
                          scripts[3].textContent.indexOf('runVerify') >= 0 &&
                          src.indexOf('runVerify') < 0 &&
                          src.indexOf('__plVlog') < 0;                       // script[2] 无 verify 字面（M1①）
    const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
                 src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
    const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
                 src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
                 src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
    const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&          // C：存档版本 1.0（core）
                 coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&   // C：存档键名
                 src.indexOf("KIDS.init({ game: 'plant'") >= 0;   // C：本款存档键 kidsgame_plant
    const srcD = src.indexOf("replayAnim(gridEl, 'bump')") >= 0;   // D：吞输入轻叮配容器 bump
    const srcE = src.indexOf('sv.plant && sv.plant.tutSeen') >= 0;   // E：行为分流先查教学特例
    const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
                 src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
    const srcI = src.indexOf('const WRONG_CHAIN_WIN = 5082') >= 0 &&   // I：abs 豁免窗常量 5082
                 src.indexOf('const WRONG_CHAIN_REL = 6219') >= 0 &&   // I：rel 豁免窗常量 6219（r47）
                 src.indexOf('wrongChainUntil = Date.now() + (q.mode === ' + "'rel'" + ' ? WRONG_CHAIN_REL : WRONG_CHAIN_WIN)') >= 0 &&
                 src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
                 src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：救援守卫+重置
                 src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== tgt') >= 0;   // I 补：guard
    const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
    const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
                 src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
    const styleSrc = document.querySelectorAll('style')[0].textContent;
    const srcO = styleSrc.indexOf('button{font-family:inherit;cursor:pointer;border:none;background:none;color:#4A3B2E}') >= 0;   // O：自建 button 显式 color
    /* WRONG_CHAIN_WIN/REL 算式对账（SPEC §4+§R7：5082=2064+150+2568+300 全实测精确；
       6219=est 上界设计口径（2064+150+3705+300）≥ 实测 2064+150+2928+300=5442——
       段二实测复核，窗不调余 777ms） */
    const winCalc = WRONG_CHAIN_WIN === 2064 + 150 + 2568 + 300 && WRONG_CHAIN_WIN === 5082 &&
                    WRONG_CHAIN_REL === 2064 + 150 + 3705 + 300 && WRONG_CHAIN_REL === 6219 &&
                    WRONG_CHAIN_REL >= 2064 + 150 + SPEC_REL_MV.pl_rel_hint + 300;
    /* 契约 L：NUMCN 表 6 值双录（SPEC_NUMCN 独立硬编码全量对账——r47 扩五六） */
    const srcL = Object.keys(NUMCN).length === 6 &&
                 [1, 2, 3, 4, 5, 6].every(n => NUMCN[n] === SPEC_NUMCN[n]);
    const srcM = src.indexOf('data-anim') >= 0 && src.indexOf('dataset.i') >= 0;   // M：帧内容锚素材
    const srcN = src.indexOf('window.PL =') >= 0 && src.indexOf('__plDemoR') >= 0;   // N 配套：钩子真实页暴露+教学实证
    /* r47 新锚（SPEC-R47 §R1-§R8——CH_N 网格档/REL_PLAN 章谱/rel 流 9973/星星拒绝/
     playCard 分流/CARD_WIN_REL/RULER_FADE_MS/wide toggle/DESIGN_KEYS 34 键已注册对账） */
    const srcR47 = src.indexOf('const CH_N = { 1: 3, 2: 4, 3: 5, 4: 6 }') >= 0 &&
                   src.indexOf('const REL_PLAN = { 1: [], 2: [1, 3], 3: [1, 3], 4: [0, 2, 4] }') >= 0 &&
                   src.indexOf('flat * 7919 + 9973 + qi * 131') >= 0 &&
                   src.indexOf('if (q.mode === ' + "'rel'" + ' && i === starIdx(q)) return false;') >= 0 &&
                   src.indexOf("const playCard = q => q.mode === 'rel'") >= 0 &&
                   src.indexOf('const CARD_WIN_REL = 6900') >= 0 &&
                   src.indexOf('CARD_WIN_REL * SPEED') >= 0 &&
                   src.indexOf('const RULER_FADE_MS = 1200') >= 0 &&
                   src.indexOf("classList.toggle('wide', q.n >= 5)") >= 0 &&
                   src.indexOf('function setStar(q)') >= 0 && src.indexOf('function starPulse(q)') >= 0;
    const designOk = Object.keys(DESIGN_KEYS).length === 34 &&                 // §R6 键表三源一致
                     Object.keys(DESIGN_KEYS).every(k => k.indexOf('pl_') === 0) &&
                     Object.keys(DESIGN_KEYS).every(k => !!KIDS.voice.clips[k]);   // 段二已注册全在册（manifest 5517 销账）
    /* CHAPTERS/GEN_HINTS 双录 + nextHint 数值断言（4/9/14/19 章末——预告下一章） */
    const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                   CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                   CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                   CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                   GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                   GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                   nextHint(4) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完 flat4）预告 ch2 文案
                   nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                   nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                   nextHint(19) === SPEC_CHAPTER_HINTS[4];
    /* 生成关 nextHint 实算对账：期望值独立复算 dch（域承诺型静态——specDch 复算，禁读引擎） */
    const genCalc = [24, 29, 34, 39].every(f => {
      const expDch = specDch(f + 1);
      return nextHint(f) === SPEC_GEN_HINTS[expDch - 1] &&
             nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1] &&
             genLevel(f + 1).dch === expDch;
    });
    const u9 = verifyIsolated && srcA && srcB && srcC && srcD && srcE && srcF && srcI &&
               srcJ && srcK && srcL && srcM && srcN && srcO && srcR47 && designOk &&
               winCalc && hintOk && genCalc;
    if (u9) npass++;
    units.contract = { ok: u9, layout: verifyIsolated, A: srcA, B: srcB, C: srcC, D: srcD,
                       E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK, L: srcL, M: srcM,
                       N: srcN, O: srcO, r47: srcR47, designKeys: designOk,
                       winCalc: winCalc, hints: hintOk, genCalc: genCalc };
  }

  /* ---- ① 结构：simView 双 viewport+网格/标尺+对比度+横溢 / clips 注入+实长辨别 ---- */
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
  total++;
  {
    function simView(w, h) {
      const g = $id('game');
      g.style.width = w + 'px';
      g.style.height = h + 'px';
      startLevel(g._simFlat);
      return unlocked().then(() => {
        const q = window.PL.quiz;
        const n = q.n;
        const cells = Array.prototype.map.call(gridEl.querySelectorAll('.cell'),
          b => ({ w: b.offsetWidth, h: b.offsetHeight }));
        const hitOk = cells.length === n * n && cells.every(b => b.w >= 96 && b.h >= 96);   // 格=主触达（n=5/6 wide 档同铁律）
        const rr = Array.prototype.map.call(rowRulerEl.children, s => s.textContent);
        const cc = Array.prototype.map.call(colRulerEl.children, s => s.textContent);
        const rulerOk = rr.length === n && cc.length === n &&
                        rr.every((t, i) => t === String(i + 1)) &&
                        cc.every((t, i) => t === String(i + 1));   // 标尺 1..N（ch3-4 淡出态 DOM 仍在）
        const cB = ratioOf(cssToHex(getComputedStyle(gridEl.querySelector('.cell')).borderTopColor), '#EFE2C3') >= 3 &&
                   ratioOf(cssToHex(getComputedStyle(gridEl.querySelector('.cell')).borderTopColor), '#FBF6EC') >= 3;
        const de = document.documentElement;
        /* r47 wide：程序卡 fixed 挂视口中央（出流）——fixed 元素随真实视口定位，仿真缩
           #game 不改变其参照系，故 wide 档对真实视口宽 de.clientWidth 判界（真 800px
           竖屏实测 566≤800 通过；非 wide 档卡在流内随仿真宽 w 判界） */
        const wideOn = $id('game').classList.contains('wide');
        const cardR = cardEl.getBoundingClientRect();
        const cardOk = cardR.left >= 0 && cardR.right <= (wideOn ? de.clientWidth : w);
        const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
        return { vp: w + 'x' + h, flat: g._simFlat, n: n, cells: cells.length, hitOk: hitOk,
                 ruler: rulerOk, contrast: cB, card: cardOk, ox: ox,
                 pass: hitOk && rulerOk && cB && cardOk && ox <= 0 };
      });
    }
    const sims = [];
    for (const flat of [0, 5, 10, 15]) {                       // n=3/4/5/6 全档（r47 §R9）
      $id('game')._simFlat = flat;
      sims.push(await simView(1280, 800));
      sims.push(await simView(800, 1180));
    }
    const g0 = $id('game');
    g0.style.width = '';
    g0.style.height = '';
    startLevel(0);                                            // 还原真实 viewport 布局
    await unlocked();
    /* clips：在册 59（pl_ 56+core 3，段二注册后口径——r47 34 设计键已全在册）
       + duration 辨别器（±60ms，pl 全域 50 键逐验） */
    const keys = Object.keys(KIDS.voice.clips);
    const plKeys = Object.keys(SPEC_DUR).concat(Object.keys(SPEC_PL_Q), Object.keys(SPEC_REL_MV));
    const needAll = plKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
    const preOk = keys.length === 59 &&
                  needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
    const durs = await Promise.all(plKeys.map(k => new Promise(res => {
      let done = false;
      const a = new Audio(KIDS.voice.clips[k]);
      const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
      a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
      a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
    })));
    const specDurOf = k => SPEC_DUR[k] != null ? SPEC_DUR[k] :                  // 三表合并查值（段二扩 rel/mv）
                        (SPEC_PL_Q[k] != null ? SPEC_PL_Q[k] : SPEC_REL_MV[k]);
    const durOk = durs.every((d, i) => Math.abs(d - specDurOf(plKeys[i])) <= 60);
    const u1 = preOk && durOk && sims.every(s => s.pass);
    if (u1) npass++;
    units.struct = { ok: u1, clips: preOk, durs: durs, sims: sims };
  }

  /* ---- ⑪ save：真实写档链（init plant→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__plOrig.save, origPersist = window.__plOrig.persist;
  const origLS = localStorage.getItem('kidsgame_plant');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_plant');
    KIDS.init({ game: 'plant', title: '植树程序' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.PL.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_plant');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'plant' &&
                j.levels && j.levels['1-0'] && j.levels['1-0'].stars === 3);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_plant');
  else localStorage.setItem('kidsgame_plant', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → PL.start(0) 非教学直达题面（契约 E 分流；
     审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  {
    const today = new Date();
    const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const pre = { v: '1.0', game: 'plant', firstDay: tstr, lastDay: tstr, levels: {},
                  dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                  restTip: { day: '', shown: 0 }, plant: { tutSeen: true } };
    let q12 = null, realOk = false;
    try {
      localStorage.setItem('kidsgame_plant', JSON.stringify(pre));
      KIDS.store.load();                             // 重读预置档
      window.__plDemoR = null;                       // 教学实证清零（非教学路径不应重设）
      window.PL.start(0);
      await unlocked();
      q12 = window.PL.quiz;
      realOk = state.tut === 'none' && window.__plDemoR === null &&
               q12 && q12.n === 3 && q12.kind === 'plant' && q12.mode === 'abs' &&
               q12.row >= 1 && q12.row <= 3 && q12.col >= 1 && q12.col <= 3 &&
               q12.card === '第' + SPEC_NUMCN[q12.row] + '行' + '第' + SPEC_NUMCN[q12.col] + '列' &&
               q12.planted.length === 0 && q12.step === 0 && q12.miss === 0 &&
               window.PL.currentLevel.flat === 0 && window.PL.currentLevel.n === 5 &&
               window.PL.currentLevel.grid === 3 &&
               (KIDS._save() || {}).v === '1.0';
    } finally {
      /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
      if (origLS === null) localStorage.removeItem('kidsgame_plant');
      else localStorage.setItem('kidsgame_plant', origLS);
      KIDS._save = function () { return { levels: {} }; };
      KIDS.store.persist = function () {};
    }
    if (realOk) npass++;
    units.realPath = { ok: realOk, tut: state.tut, quiz: q12 && { row: q12.row, col: q12.col, n: q12.n } };
  }

  const out = { game: 'plant', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__plVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass) + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）并留播报历史
     （__voiceHist）；voice.queue 记录拼播链（__lastQueue——r47 rel 链断言源） */
  window.__voiceHist = [];
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) {
    window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null;
    if (k) window.__voiceHist.push(k);
  };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
