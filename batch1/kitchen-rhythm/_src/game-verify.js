/* ================= ?verify=1 自检（仅 verify 分支加载执行；?poke=1 走 runPoke）——r18
   ① 曲库审计：10 曲 auditSong（密度/间隔/t 域/段序/lane 域/bpm 域）+ SPEC 表逐值对账
     （SPEC_T 拍序列表/SPEC_SEG 变速段/SPEC_LANE 双轨表——独立硬编码不引用页面 SONGS）
   ② 40 关审计：确定性（同 flat 两次 JSON 一致）+ SPEC_LEVELS 逐关对账（song/dch/N/gate2/gate3
     /modeled 精确整数）+ 生成关四 dch 全现（flat32-39）+ 章号独立复算
   ③ 判定引擎单元：三档域（Perfect ±0.15@BPM88 / Good ±0.30 / 变速曲 BPM110 窗 0.12/0.24
     ——perfectWOf/goodWOf 独立同式复算）+ 窗界（0.31s 早/迟=swipe）
   ④ 连击星级单元：engStars 全档（<gate2=1 / gate2=2 / gate3=3 / 永不 0——SPEC §4 门槛独立复算）
   ⑤ 双轨单元：s8 lane 分流（lane0 tap 只中 lane0 音符）+ 每 lane 独立冷却
   ⑥ 变速 secAt 复算：s3 secAt(16)==16*60/88、secAt(24)==secAt(16)+8*60/110（独立分段积分）
   ⑦ 音频合成音取证（notebird 模式）：__noteLog 命中条数==hitN、频率序列==melody 全序、
     miss 通道 146.83/v=0.2
   ⑧ autoRun 冒烟：flat0（28 音全中 perfect）+ flat24（双轨交替）加速模拟时钟跑完 → .k-song-end
   ⑨ 教学链单元：startSong(tut) 真实走完 → __krDemoR==='perfect' 且 tutStage='help'
   ⑩ 吞输入+容器 bump：冷却期 tryCut={r:'cooling'} + #stage-wrap.bump（家族 D）
   ⑪ 布局：双视口模拟（1280×800 / 800×1180）× flat0/8/24：overflowX=0、按钮≥48、切钮≥96、
     竖屏通道（body.port == @media 逐行全等由 build 断言，此处真竖模拟）
   ⑫ clips：kitchen 34（含零值 kitchen_n_0）+ kr 35（含 T46 结算拆段 kr_combo/kr_dn_0..30）+ core 3 = 72 条全注入
     + duration 实测 ±60ms（SPEC_DUR）
   ⑬ 契约源码断言：读第 3 script 块（纯游戏块）检索（A/B/D/E/F/I/J/K/MIG/KR 特有——检索串
     拼接防 verify 源码自匹配）
   ⑭ estWin 动态断言：教学窗 4300 ≥ kitchen_tut 3960+300；双轨 lead 3300 ≥ kr_dual 2640+300；
     错链窗 3516 == kr_missmore 3216+300 == WRONG_CHAIN_WIN 常量自证
   ⑮ modeled 双钉：modeled(0)===24177 && 40 关 min===17170 && 逐关===SPEC_LEVELS（禁约数）
     + 全关 ≥LEVEL_MIN_MS 17000 + DECIDE_MIN 四档字面
   ⑯ nextHint 对账：章末预告 hint[i]↔CHAPTERS[i+1] + 生成关实算 GEN_HINTS[genLevel(f+1).dch-1]
   ⑰ SPEED 提速断言
   结果写 #verify-result + window.__krVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;
  const ok = (name, cond, detail) => { total++; if (cond) npass++; units[name] = { ok: !!cond, d: detail == null ? '' : detail }; };

  /* ---- SPEC-R18-KITCHEN §1 曲表独立重列（禁抄页面 SONGS——verify 自持真值） ---- */
  const SPEC_T = {
    star: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30],
    tiger: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29],
    ode: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
    bee: [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 20, 21, 22],
    brush: [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21],
    bridge: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22],
    jingle: [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
    birthday: [0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 14, 16, 17, 18, 19, 20, 22, 24, 25, 26, 27, 28, 30, 32],
    symph: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    chef: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 26, 27, 28, 29, 30, 31]
  };
  const SPEC_SEG = {
    star: [[88]], tiger: [[92]], ode: [[84]],
    bee: [[88], [110, 16]], brush: [[104], [84, 12]], bridge: [[96], [120, 16]],
    jingle: [[96]], birthday: [[84], [100, 24]],
    symph: [[90]], chef: [[88], [104, 24]]
  };
  const SPEC_STYLE = { star: 'steady', tiger: 'steady', ode: 'steady', bee: 'tempo', brush: 'tempo',
                       bridge: 'tempo', jingle: 'long', birthday: 'long', symph: 'dual', chef: 'dual' };
  const SPEC_BEATS = { star: 36, tiger: 36, ode: 32, bee: 24, brush: 24, bridge: 28,
                       jingle: 32, birthday: 40, symph: 32, chef: 40 };
  const SPEC_LANE = {
    symph: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    chef: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0]
  };
  /* §2/§4/§5 关表独立重列：[song, dch, N, gate2, gate3, modeled]（_spec_calc.py 产出） */
  const SPEC_LEVELS = [
    [0, 1, 28, 9, 14, 24177], [1, 1, 26, 8, 13, 22591], [2, 1, 24, 8, 12, 23057], [0, 1, 28, 9, 14, 24177],
    [1, 1, 26, 8, 13, 22591], [2, 1, 24, 8, 12, 23057], [0, 1, 28, 9, 14, 24177], [1, 1, 26, 8, 13, 22591],
    [3, 2, 19, 9, 12, 17998], [4, 2, 18, 9, 12, 17511], [5, 2, 20, 10, 13, 17170], [3, 2, 19, 9, 12, 17998],
    [4, 2, 18, 9, 12, 17511], [5, 2, 20, 10, 13, 17170], [3, 2, 19, 9, 12, 17998], [4, 2, 18, 9, 12, 17511],
    [6, 3, 24, 16, 18, 21138], [7, 3, 25, 16, 18, 25623], [6, 3, 24, 16, 18, 21138], [7, 3, 25, 16, 18, 25623],
    [6, 3, 24, 16, 18, 21138], [7, 3, 25, 16, 18, 25623], [6, 3, 24, 16, 18, 21138], [7, 3, 25, 16, 18, 25623],
    [8, 4, 24, 18, 19, 23300], [9, 4, 28, 21, 22, 27447], [8, 4, 24, 18, 19, 23300], [9, 4, 28, 21, 22, 27447],
    [8, 4, 24, 18, 19, 23300], [9, 4, 28, 21, 22, 27447], [8, 4, 24, 18, 19, 23300], [9, 4, 28, 21, 22, 27447],
    [7, 4, 25, 18, 20, 25623], [0, 3, 28, 18, 21, 24177], [2, 1, 24, 8, 12, 23057], [1, 1, 26, 8, 13, 22591],
    [3, 3, 19, 12, 14, 17998], [2, 2, 24, 12, 16, 23057], [5, 2, 20, 10, 13, 17170], [3, 4, 19, 14, 15, 17998]
  ];
  const SPEC_DUR = { kr_hint: 2856, kr_missmore: 3216, kr_dual: 2640, kitchen_tut: 3960,
                     kitchen_cut: 1536, kitchen_cat: 1968, kitchen_n_1: 1344, kitchen_n_28: 1560,
                     kr_combo: 1416, kr_dn_1: 1320, kr_dn_28: 1728 };   /* T46 结算拆段抽检（实测回填） */
  const SPEC_CHAPTER_HINTS = { 1: '曲子会变快哦', 2: '曲子要变长啦', 3: '两只手一起上', 4: '新一轮曲子来啦' };
  const SPEC_GEN_HINTS = ['连击小目标', '连击过半', '连击大挑战', '连击大集合'];
  const SPEC_DECIDE_MIN = { steady: 550, tempo: 620, long: 620, dual: 800 };
  const SPEC_MODELED_MIN = 17170;              // §5：flat10 伦敦桥（禁约数）
  const SPEC_LEVEL_MIN = 17000;                // §5：本款单曲一关口径
  const estMs = n => n * 345 + 600;            // b25 定版：四方同步之 verify 侧
  const GATE2 = [1 / 3, 1 / 2, 2 / 3, 3 / 4];
  const GATE3 = [1 / 2, 2 / 3, 3 / 4, 4 / 5];

  /* ---- ① 曲库审计 + SPEC 逐值对账 ---- */
  {
    let auditOk = true, specOk = true, det = [];
    SONGS.forEach((s, i) => {
      const errs = auditSong(s, i);
      if (errs.length) { auditOk = false; det.push(s.id + ':' + errs.join(',')); }
      if (SPEC_T[s.id] === undefined) { specOk = false; det.push('spec-id?' + s.id); return; }
      if (JSON.stringify(s.t) !== JSON.stringify(SPEC_T[s.id])) { specOk = false; det.push('t@' + s.id); }
      if (s.beats !== SPEC_BEATS[s.id]) { specOk = false; det.push('beats@' + s.id); }
      if (s.style !== SPEC_STYLE[s.id]) { specOk = false; det.push('style@' + s.id); }
      const segOk = s.seg.length === SPEC_SEG[s.id].length && s.seg.every((g, j) =>
        g.bpm === SPEC_SEG[s.id][j][0] && (j === 0 || g.from === SPEC_SEG[s.id][j][1]));
      if (!segOk) { specOk = false; det.push('seg@' + s.id); }
      const expLane = SPEC_LANE[s.id];
      if (expLane) {
        if (!s.lane || JSON.stringify(s.lane) !== JSON.stringify(expLane)) { specOk = false; det.push('lane@' + s.id); }
      } else if (s.lane) { specOk = false; det.push('lane-extra@' + s.id); }
      if (s.melody.length !== s.t.length) { specOk = false; det.push('melody@' + s.id); }
    });
    if (SONGS.length !== 10) { specOk = false; det.push('n=' + SONGS.length); }
    ok('songs', auditOk && specOk, det.slice(0, 5).join('|'));
  }

  /* ---- ② 40 关审计：确定性 + SPEC_LEVELS 逐关 + 生成关四 dch 全现 ---- */
  {
    let detOk = true, specOk = true, minOk = true, genDch = {}, det = [];
    for (let f = 0; f < 40; f++) {
      const L1 = genLevel(f), L2 = genLevel(f);
      if (JSON.stringify(L1) !== JSON.stringify(L2)) detOk = false;
      const E = SPEC_LEVELS[f];
      const g = gatesOf(L1);
      const md = modeled(f);
      const lvOk = L1.song === E[0] && L1.dch === E[1] && g.n === E[2] &&
                   g.gate2 === E[3] && g.gate3 === E[4] && md === E[5] &&
                   L1.ch === Math.floor(f / 8) + 1 && L1.lv === f % 8;
      if (!lvOk) { specOk = false; det.push('f' + f + ':' + [L1.song, L1.dch, g.n, g.gate2, g.gate3, md].join('/')); }
      if (md < SPEC_LEVEL_MIN) minOk = false;
      if (f >= 32) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    }
    const genOk = genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
    ok('levels40', detOk && specOk && minOk && genOk,
       det.slice(0, 3).join('|') + ' genDch=' + JSON.stringify(genDch));
  }

  /* ---- ③ 判定引擎单元（三档域+窗界；窗宽独立同式复算） ---- */
  {
    const pw = b => Math.max(0.09, Math.min(0.15, 0.22 * b));
    const L0 = genLevel(0);                       // star BPM88
    const T0Of = R => noteT(R, R.notes[0]);       // t=0 → =t0
    const tap0 = (dtMs, lane) => engTap(mkRun(L0, 100), lane, T0Of(mkRun(L0, 100)) + dtMs).r;
    const jPerfect = tap0(0, 0);                            // dt=0 → perfect
    const jEarly = tap0(-pw(60 / 88) * 0.99, 0);            // 早 0.1485 → perfect
    const jGood = tap0(0.25, 0);                            // 迟 0.25 ≤0.30 → good
    const jSwipeLate = tap0(0.31, 0);                       // 迟 0.31 >0.30 → swipe
    const jSwipeEarly = tap0(-0.31, 0);                     // 早 0.31 → swipe
    /* 变速曲 s3（bee）：t=16 起段 BPM110，perfectW=0.22*60/110=0.12、goodW=0.24（每 case 独立实例防 done 污染） */
    const tap3 = dt => {
      const R = mkRun(genLevel(8), 200);          // flat8 = s3 bee
      const n16 = R.notes.find(n => n.t === 16);
      return engTap(R, 0, noteT(R, n16) + dt).r;
    };
    const w110 = pw(60 / 110);
    const vPerfect = tap3(-w110 * 0.9);           // 窗内早 → perfect
    const vGood = tap3(0.2);                      // 0.2 ≤ 0.24 → good
    const vSwipe = tap3(0.25);                    // 0.25 > 0.24 → swipe
    /* miss 档：过窗未击 */
    const Rm = mkRun(L0, 100);
    engMissCheck(Rm, noteT(Rm, Rm.notes[0]) + 0.31);
    const missOk = Rm.notes[0].done && !Rm.notes[0].hit && Rm.missN === 1 && Rm.combo === 0;
    ok('judge', jPerfect === 'perfect' && jEarly === 'perfect' && jGood === 'good' &&
       jSwipeLate === 'swipe' && jSwipeEarly === 'swipe' &&
       vPerfect === 'perfect' && vGood === 'good' && vSwipe === 'swipe' && missOk &&
       Math.abs(w110 - 0.12) < 1e-9 && Math.abs(pw(60 / 88) - 0.15) < 1e-9,
       [jPerfect, jEarly, jGood, jSwipeLate, vPerfect, vGood, vSwipe].join(','));
  }

  /* ---- ④ 连击星级单元（门槛独立复算全档；永不 0 星） ---- */
  {
    const L = genLevel(24);                       // symph N=24 dch4
    const expG2 = Math.floor(24 * GATE2[3]);      // verify 自持表复算：floor(24*3/4)=18
    const expG3 = Math.floor(24 * GATE3[3]);      // floor(24*4/5)=19
    const gg = gatesOf(L);
    const mk = mc => { const R = mkRun(L, 0); R.maxCombo = mc; return engStars(R); };
    const s1 = mk(gg.gate2 - 1), s2 = mk(gg.gate2), s3 = mk(gg.gate3), s0 = mk(0);
    ok('stars', expG2 === 18 && expG3 === 19 && gg.gate2 === expG2 && gg.gate3 === expG3 &&
       s1 === 1 && s2 === 2 && s3 === 3 && s0 === 1,
       'g=' + gg.gate2 + '/' + gg.gate3 + ' stars=' + [s0, s1, s2, s3].join(''));
  }

  /* ---- ⑤ 双轨单元：lane 分流（lane0 tap 只中 lane0 音符；lane 序 [0,1]交替） ---- */
  {
    const L = genLevel(24);                       // symph lane [0,1,0,1...]
    const R = mkRun(L, 100);
    const lane0T = noteT(R, R.notes[0]);          // note0 lane=0
    const hitWrongLane = engTap(R, 1, lane0T).r;  // lane1 打 lane0 音符 → swipe
    const hitRightLane = engTap(mkRun(L, 100), 0, lane0T).r;
    const laneSeqOk = R.notes.slice(0, 6).every((n, i) => n.l === i % 2);
    ok('dual', hitWrongLane === 'swipe' && hitRightLane === 'perfect' && laneSeqOk,
       hitWrongLane + '/' + hitRightLane);
  }

  /* ---- ⑥ 变速 secAt 独立复算（分段积分） ---- */
  {
    const seg = SONGS[3].seg;                     // bee [88, 110@16]
    const s16 = secAt(seg, 16), s24 = secAt(seg, 24);
    const e16 = 16 * 60 / 88;
    const e24 = e16 + 8 * 60 / 110;
    const segB = SONGS[9].seg;                    // chef [88, 104@24]
    const c32 = secAt(segB, 32), e32 = 24 * 60 / 88 + 8 * 60 / 104;
    const monoOk = SONGS.every(s => {
      let prev = -1;
      return s.t.every(t => { const v = secAt(s.seg, t); const m = v > prev; prev = v; return m; });
    });
    ok('secAt', Math.abs(s16 - e16) < 1e-9 && Math.abs(s24 - e24) < 1e-9 &&
       Math.abs(c32 - e32) < 1e-9 && monoOk,
       [s16.toFixed(4), s24.toFixed(4), c32.toFixed(4)].join('/'));
  }

  /* ---- ⑨ 教学链单元：tut 关真实走完（模拟时钟）→ 演示生效证据 ---- */
  {
    ST.verifySim = true; ST.simT0 = performance.now();
    ST.simRate = (60 / SONGS[0].seg[0].bpm) / ST.simBeat;
    startSong(genLevel(0), { tut: true });
    const t0 = Date.now();
    let stage = '', demoR = '';
    while (Date.now() - t0 < 15000) {
      await wait(120);
      if (G.tutStage === 'help' && window.__krDemoR) { stage = G.tutStage; demoR = window.__krDemoR; break; }
      if (G.ended) break;
    }
    const tutOk = stage === 'help' && (demoR === 'perfect' || demoR === 'good');
    ok('tutorial', tutOk, 'stage=' + stage + ' demoR=' + demoR);
    G.auto = false; G.tutAuto = 0; G.tutHelp = 0; G.tutStage = 'none';
  }

  /* ---- ⑧ autoRun 冒烟：flat0 + flat24（双轨）→ 结算层（⑦ 音频取证同跑；
     先清 __noteLog——教学单元的演示命中也会记账，防计数串档） ---- */
  {
    window.__noteLog.length = 0;
    const r0 = await window.RHY.autoRun(0);
    const end0 = !!document.querySelector('.k-song-end');
    const hitLog = window.__noteLog.filter(e => e.v === 1).map(e => e.f);
    const freqOk = r0.ok && r0.hit === r0.total && hitLog.length === r0.total &&
                   hitLog.every((f, i) => f === SONGS[0].melody[i]);
    document.querySelector('.k-song-end') && document.querySelector('.k-song-end').remove();
    const r24 = await window.RHY.autoRun(24);
    const end24 = !!document.querySelector('.k-song-end');
    document.querySelector('.k-song-end') && document.querySelector('.k-song-end').remove();
    ok('autoRun', r0.ok && end0 && r24.ok && end24 && freqOk && r24.hit === r24.total,
       'f0=' + r0.hit + '/' + r0.total + ' f24=' + r24.hit + '/' + r24.total + ' freq=' + freqOk);
  }

  /* ---- ⑦b miss 通道取证：146.83 低闷音 ---- */
  {
    window.__noteLog.length = 0;
    ST.verifySim = true; ST.simT0 = performance.now(); ST.simRate = 1;
    startSong(genLevel(2), {});                   // ode 单轨
    await wait(150);
    window.RHY.miss();                            // 强制下一音符 miss
    const missTone = window.__noteLog.filter(e => e.f === 146.83 && e.v === 0.2).length;
    ok('missTone', missTone === 1, 'n=' + missTone);
  }

  /* ---- ⑩ 吞输入+容器 bump+每 lane 独立冷却（lane0 冷却不拦 lane1） ---- */
  {
    ST.verifySim = true; ST.simT0 = performance.now(); ST.simRate = 1;
    startSong(genLevel(2), {});
    await wait(100);
    G.laneCd[0] = nowSec() + 5;                   // 仅 lane0 强制冷却窗
    const r = tryCut(0);
    const r1 = tryCut(1);                         // lane1 无冷却 → 正常走判定（ode 单轨 lane 全 0 → swipe 非 cooling）
    const bumped = wrapEl().classList.contains('bump');
    ok('swallow', r.r === 'cooling' && bumped && r1.r !== 'cooling', r.r + '/' + r1.r);
  }

  /* ---- ⑪ 布局：双视口 × flat0/8/24（模拟视口） ---- */
  {
    const sims = [];
    for (const flat of [0, 8, 24]) {
      for (const [w, h] of [[1280, 800], [800, 1180]]) {
        const app = $id('app');
        app.style.width = w + 'px'; app.style.height = h + 'px';
        startSong(genLevel(flat), {});
        fitCanvas();
        const de = document.documentElement;
        const badBtns = [];
        document.querySelectorAll('button').forEach(b => {
          if (b.classList.contains('k-parentbtn')) return;
          if (b.offsetWidth > 4 && b.offsetHeight > 4 && (b.offsetWidth < 48 || b.offsetHeight < 48))
            badBtns.push((b.id || b.className) + ':' + b.offsetWidth + 'x' + b.offsetHeight);
        });
        const cut = $id('btn-cut');
        const ox = Math.max(app.scrollWidth - app.clientWidth, de.scrollWidth - de.clientWidth);
        sims.push({ flat: flat, vp: w + 'x' + h, ok: ox <= 0 && !badBtns.length && cut.offsetWidth >= 96,
                    bad: badBtns, cutW: cut.offsetWidth });
      }
    }
    $id('app').style.width = ''; $id('app').style.height = '';
    ok('layout', sims.every(s => s.ok),
       sims.filter(s => !s.ok).map(s => s.flat + '@' + s.vp + ':' + s.bad.join(',')).join('|') || 'all-ok');
  }

  /* ---- ⑫ clips：70 条全注入（kitchen 33 + kr 34 含 T46 拆段 + core 3）+ duration 实测 ±60ms ---- */
  {
    const keys = Object.keys(KIDS.voice.clips);
    const needKr = ['kr_hint', 'kr_missmore', 'kr_dual'];
    const t46 = ['kr_combo'].concat(Array.from({ length: 31 }, (_, i) => 'kr_dn_' + i));   // 0..30（0=零值键 09-19 补）
    const coreK = ['core_chapter_end', 'core_day_end', 'core_rest'];
    const nKitchen = keys.filter(k => k.indexOf('kitchen_') === 0).length;
    const nKr = keys.filter(k => k.indexOf('kr_') === 0).length;
    const preOk = keys.length === 72 && nKitchen === 34 && nKr === 35 &&
                  needKr.every(k => keys.indexOf(k) >= 0) &&
                  t46.every(k => keys.indexOf(k) >= 0) &&
                  coreK.every(k => keys.indexOf(k) >= 0) &&
                  keys.indexOf('kitchen_n_0') >= 0 &&      // 零值键（完美局/AFK 结算恒全 clip）
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
    ok('clips', preOk && durOk, 'n=' + keys.length + ' k=' + nKitchen + ' durs=' + durs.join(','));
  }

  /* ---- ⑬ 契约源码断言（读第 3 script 块=游戏块 data+engine+main；verify 独立第 4 块不自匹配） ---- */
  {
    const src = document.querySelectorAll('script')[2].textContent;
    const nLim = src.split('nextHint(lim - 1)').length - 1;
    const srcA = nLim === 2 &&                                   // A：winFlow+启动双实算
                 src.indexOf('Math.max(0, lim - 1)') >= 0 &&     // 日末停留今日末关
                 src.indexOf('nextHint(null)') < 0;              // 旧 null 实参形态禁再现（含注释）
    const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
                 src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
                 src.indexOf('idle > 30000') >= 0;   // B：救援双锚
    const srcD = src.indexOf("replayAnim(wrapEl(), 'bump')") >= 0;   // D：吞输入容器 bump
    const srcE = src.indexOf('sv.kitchen && sv.kitchen.tutSeen') >= 0;   // E：教学特例先查
    const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算
                 src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防自匹配）
    const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
                 src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
                 src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&
                 src.indexOf('3216 + 300') >= 0;    // I：错链窗常量 3516+救援让路+换关重置
    const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;   // J：语义句 10s 节流
    const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel,.k-song-end')) return;") >= 0 &&
                 src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
    const srcN = src.indexOf('{ key:' + ' null') < 0;   // N：本款 queue 链全 clip（拼接防静态扫描自匹配）
    const sigMIG = "getItem('kids" + "game_kitchen')";
    const srcMIG = src.indexOf(sigMIG) >= 0 &&
                   src.indexOf("lv[(c - 1) + '-5'") >= 0 &&
                   src.indexOf('> CH_LEN - 1') >= 0;   // MIG：键基迁移 IIFE（矛盾态+脏键守卫）
    const srcKR = src.indexOf('KR_SEED') >= 0 && src.indexOf('mulberry32(flat * 7919 + KR_SEED)') >= 0;   // KR：种子同源
    ok('contract', srcA && srcB && srcD && srcE && srcF && srcI && srcJ && srcK && srcN && srcMIG && srcKR,
       JSON.stringify({ A: srcA, n: nLim, B: srcB, D: srcD, E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK, N: srcN, MIG: srcMIG, KR: srcKR }));
  }

  /* ---- ⑭ estWin 动态断言（窗 ≥ clip 实长+300；SPEC_DUR 实测表） ---- */
  {
    const winOk = 4300 >= SPEC_DUR.kitchen_tut + 300 &&      // 教学看窗（lead 4.3）
                  3300 >= SPEC_DUR.kr_dual + 300 &&          // 双轨首教 lead 3.3
                  (SPEC_DUR.kr_missmore + 300) === 3516 &&   // 错链豁免窗
                  WRONG_CHAIN_WIN === 3516 &&                // 常量自证
                  estMs(4) === 1980;                          // estMs 口径（四方同步运行时对账）
    ok('estWin', winOk, 'tut=' + (SPEC_DUR.kitchen_tut + 300) + ' dual=' + (SPEC_DUR.kr_dual + 300) +
       ' chain=' + WRONG_CHAIN_WIN);
  }

  /* ---- ⑮ modeled 双钉（禁约数）+ DECIDE_MIN 四档 + LEVEL_MIN ---- */
  {
    const m0 = modeled(0);
    let mn = Infinity, dmOk = true;
    for (const k of Object.keys(SPEC_DECIDE_MIN)) if (DECIDE_MIN[k] !== SPEC_DECIDE_MIN[k]) dmOk = false;
    for (let f = 0; f < 40; f++) mn = Math.min(mn, modeled(f));
    ok('modeled', m0 === 24177 && mn === SPEC_MODELED_MIN && dmOk && mn >= SPEC_LEVEL_MIN,
       'm0=' + m0 + ' min=' + mn);
  }

  /* ---- ⑯ nextHint 对账（章末预告+生成关实算） ---- */
  {
    const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&
                   CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                   CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                   CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                   GEN_HINTS.every((g, i) => g === SPEC_GEN_HINTS[i]) &&
                   nextHint(7) === SPEC_CHAPTER_HINTS[1] && nextHint(15) === SPEC_CHAPTER_HINTS[2] &&
                   nextHint(23) === SPEC_CHAPTER_HINTS[3] && nextHint(31) === SPEC_CHAPTER_HINTS[4];
    const genOk = [32, 33, 34, 35, 36, 37, 38, 39].every(f =>
      nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);
    ok('hints', hintOk && genOk, [nextHint(7), nextHint(32), nextHint(39)].join('|'));
  }

  /* ---- ⑰ SPEED 提速断言 ---- */
  ok('speed', SPEED === 0.12, 'SPEED=' + SPEED);

  const out = { game: 'kitchen-rhythm', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__krVlog = out;                         // 外部断言挂点（任务书钩子）
  document.title = npass === total ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

/* ---------- poke：模拟时钟 1x 下随机 5 击（含双轨 lane）无异常（验收协议 §7 沿老款） ---------- */
async function runPoke() {
  document.body.classList.add('verify');
  KIDS.audio.note = function () {};               // poke 页无音频取证需求，纯防炸（KIDS 未 init）
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {}; KIDS.voice.queue = function () {}; KIDS.voice.say = function () {};
  ST.verifySim = true; ST.simT0 = performance.now(); ST.simRate = 1;
  const out = { poke: true, ok: false };
  try {
    window.RHY.start(24);                        // 双轨关（含 lane 分流路径）
    await wait(1400);
    const t0p = performance.now();
    const times = [1900, 3100, 4300, 5600, 7200];
    for (const t of times) {
      await wait(Math.max(50, t - (performance.now() - t0p)));
      window.RHY.hit(t % 800 < 400 ? 0 : 1);     // 随机 lane（固定序列可复现）
      window.RHY.miss();
    }
    await wait(600);
    const s = window.RHY.state;
    out.state = { hit: s.hit, miss: s.miss, total: s.total, dual: s.dual };
    out.ok = s.scene === 'play' && !isNaN(s.hit) && !isNaN(s.miss) && s.hit + s.miss <= s.total + 5;
  } catch (e) { out.err = String(e); }
  document.title = out.ok ? 'POKE OK' : 'POKE FAIL';
  $id('verify-result').textContent = JSON.stringify(out);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx=null 双保险）；
     audio.note 记 __noteLog（合成音取证——notebird 模式：频率/时长/音量/时刻全记录） */
  window.__noteLog = [];
  KIDS.audio.note = function (f, d, w, v) { window.__noteLog.push({ f: f, d: d, w: w, v: v }); };
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) { window.__lastQueue = parts; };
  showHome();                                    // 背景非空白（截图校验）
  runVerify();
} else if (POKE) {
  runPoke();
}
