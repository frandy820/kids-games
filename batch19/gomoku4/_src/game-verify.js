/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致 + 同 flat 双局
     对弈 AI 应手序列一致）/ 章约束（ch1 4×4 先手 block·ch2 5×5 先手 full·ch3 5×5 后手 full·
     ch4 5×5 交替先手 mid）/ sig 互异（5 局唯一）/ 同关 5 局棋谱互异（体验互异）/
     引擎直驱：solver 对 AI 每局 result∈{win,draw}（负局=FAIL 暴露策略不足）+ AI 每步合法
     （engPlayGame 内置空位/界内断言，ERR=FAIL）+ 关级 retries=0（3★ 前提）
   ② 恰四连口径断言组（构造局面，§0.41）：横/竖/正斜/反斜四连皆胜；三连不胜；
     五连不判胜（极大段==4 恰四口径）——独立扫描器 indepScan 与游戏侧 engScanWin 全对账
   ③ AI 必备两断言（§0.41，构造局面，两漏一=FAIL）：AI 己方活三 → full/mid 必下第四子
     （block 跳①不攻=负断言）；玩家双端开放活三 → block/full/mid 必堵（返回 ∈ 玩家制胜点）
   ④ sayW 三态（单元直驱：flat<3 每呼必播 / flat>=3 10s 节流 / force 豁免）
   ⑤ UI 冒烟：A flat0 教学链（demoR='right' §0.27 + watch 期真 AI 零应手 + 交接 gk_tut_turn +
     重发同关棋盘清零）；B flat10 负局路径（suicide 驱动 → 'wrong' + miss/retries 计一次 +
     零惩罚重下棋盘清零不推进）；C autoSolve flat5/10/15 全 3★（AI 弱于 verify 驱动）
   ⑥ 救援行为直驱：可制胜局面 rescueAct → breathe 在场 + rescues 计数（14s 计时口径由
     真实页冒烟另验，verify 不等真实钟）
   ⑦ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）棋格 ≥64、全按钮 ≥64
     （.k-parentbtn 豁免）、overflowX ≤0
   ⑧ 文案与 clips：VOICE 六条字面量对账（SPEC §2 定稿）+ gk_ 6 条注入 + core 3 条注入
     （恰 9 条）+ 开场链 play(gk_hint)
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立棋盘扫描器（§0.41 禁复用游戏侧胜负判定）：
       线枚举法（行/列/两向对角线逐条切段）——与游戏侧「段首+方向增量」不同实现 ---- */
  function indepScan(board, n) {
    const lines = [];
    for (let y = 0; y < n; y++) lines.push(Array.from({ length: n }, (_, x) => y * n + x));         // 行
    for (let x = 0; x < n; x++) lines.push(Array.from({ length: n }, (_, y) => y * n + x));         // 列
    for (let s = 0; s < 2 * n - 1; s++) {                                                          // 主对角（x-y=s-（n-1））
      const L = [];
      for (let y = 0; y < n; y++) { const x = y + (s - (n - 1)); if (x >= 0 && x < n) L.push(y * n + x); }
      if (L.length >= 4) lines.push(L);
    }
    for (let s = 0; s < 2 * n - 1; s++) {                                                          // 反对角（x+y=s）
      const L = [];
      for (let y = 0; y < n; y++) { const x = s - y; if (x >= 0 && x < n) L.push(y * n + x); }
      if (L.length >= 4) lines.push(L);
    }
    for (const line of lines) {
      let i = 0;
      while (i < line.length) {
        const c = board[line[i]];
        if (!c) { i++; continue; }
        let j = i + 1;
        while (j < line.length && board[line[j]] === c) j++;
        if (j - i >= 4) return { who: c, line: line.slice(i, j).sort((a, b) => a - b) };  // ≥4 即胜（M1）
        i = j;
      }
    }
    return null;
  }
  const sameWin = (a, b) => {                     // 对账：同 null 或 who 同且线集合同（排序比较）
    if (!a && !b) return true;
    if (!a || !b || a.who !== b.who) return false;
    const la = a.line.slice().sort((x, y) => x - y), lb = b.line.slice().sort((x, y) => x - y);
    return la.length === lb.length && la.every((v, i) => v === lb[i]);
  };

  /* ---- ① 40 关全量审计 + 引擎直驱（flat 0-39） ---- */
  const CH_EXPECT = {                             // 章约束（SPEC §2 定稿）
    1: { n: 4, first: 1, aiMode: 'block' },
    2: { n: 5, first: 1, aiMode: 'full' },
    3: { n: 5, first: 2, aiMode: 'full' },
    4: { n: 5, aiMode: 'mid', alt: true }
  };
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let chOk = true, sigOk = true, driveOk = true, repOk = true, aiDet = true, agree = true;
    /* 章约束 */
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) chOk = false;
    if (L1.dch < 1 || L1.dch > 4) chOk = false;
    for (const g of L1.games) {
      const e = CH_EXPECT[L1.dch];
      if (g.n !== e.n || g.aiMode !== e.aiMode) chOk = false;
      if (e.alt) { if (g.first !== (L1.games.indexOf(g) % 2 === 0 ? 1 : 2)) chOk = false; }
      else if (g.first !== e.first) chOk = false;
    }
    /* sig 互异 */
    sigOk = new Set(L1.games.map(g => g.sig)).size === CH_LEN;
    /* 引擎直驱：双跑对弈（AI 应手确定性）+ 独立扫描器对账 + 关级全胜平 */
    const results = [], moveSigs = [];
    for (let k = 0; k < L1.games.length; k++) {
      const r1 = engPlayGame(L1.games[k]);
      const r2 = engPlayGame(L1.games[k]);
      if (r1.result !== r2.result || JSON.stringify(r1.aiMoves) !== JSON.stringify(r2.aiMoves)) aiDet = false;
      if (r1.result === 'ERR' || r1.result === 'lose') driveOk = false;          // AI 每步合法 + solver 不许输
      const w = indepScan(r1.board, L1.games[k].n);                              // 独立扫描器对账胜负（§0.41）
      const agreeOne = r1.result === 'draw' ? w === null :
        (w !== null && ((r1.result === 'win' && w.who === 1) || (r1.result === 'lose' && w.who === 2)));
      if (!agreeOne || !sameWin(w, engScanWin(r1.board, L1.games[k].n))) agree = false;
      results.push(r1.result);
      moveSigs.push(JSON.stringify(r1.moves));
    }
    if (results.filter(r => r === 'lose').length !== 0) driveOk = false;          // retries=0（3★ 前提）
    repOk = new Set(moveSigs).size === CH_LEN;                                   // 同关 5 局棋谱互异（体验互异）
    const ok = det && chOk && sigOk && driveOk && repOk && aiDet && agree;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, chOk: chOk, sigOk: sigOk,
      driveOk: driveOk, repOk: repOk, aiDet: aiDet, agree: agree, results: results,
      games: L1.games.map(g => g.sig) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 恰四连口径断言组（构造局面 + 双扫描器对账） ---- */
  total++;
  const mkB = (n, ones, twos) => {
    const b = new Array(n * n).fill(0);
    ones.forEach(i => b[i] = 1); twos.forEach(i => b[i] = 2);
    return b;
  };
  const fourCases = [                             // [说明, n, 玩家格, AI 格, 期望谁胜]
    ['横四', 5, [0, 1, 2, 3], [], 1],
    ['竖四', 5, [1, 6, 11, 16], [], 1],
    ['主斜四', 5, [0, 6, 12, 18], [], 1],
    ['反斜四', 5, [4, 8, 12, 16], [], 1],
    ['AI竖四', 5, [], [2, 7, 12, 17], 2],
    ['三连不胜', 5, [0, 1, 2], [], 0],
    ['五连即胜', 5, [10, 11, 12, 13, 14], [], 1],     // ≥4 连即胜（审查 M1 裁决：五连补满空档应奖励）
    ['五连斜即胜', 5, [0, 6, 12, 18, 24], [], 1]      // 主对角五连=胜
  ];
  fourCases.push(['四斜胜4x4', 4, [0, 5, 10, 15], [], 1]);
  let fourOk = true, agreeCnt = 0;
  for (const [name, n, ones, twos, who] of fourCases) {
    const b = mkB(n, ones, twos);
    const g = engScanWin(b, n), r = indepScan(b, n);
    if (!sameWin(g, r)) fourOk = false;           // 双扫描器对账
    else agreeCnt++;
    if (who === 0 && (g !== null)) fourOk = false;
    if (who !== 0 && (!g || g.who !== who)) fourOk = false;
  }
  if (fourOk) npass++;
  units.exactFour = { ok: fourOk, cases: fourCases.length, agree: agreeCnt };

  /* ---- ③ AI 必备两断言（构造局面，§0.41：两漏一=FAIL） ---- */
  total++;
  let mustOk = true;
  { /* 局面 A：AI(2) 活三（row1 c1-3，两端 5/9 空）→ full/mid 必下第四子（∈ AI 制胜点）；block 跳①不攻 */
    const b = mkB(5, [18, 22], [6, 7, 8]);
    const aiWin = winPointsFor(b.slice(), 5, 2);
    if (aiWin.indexOf(5) < 0 || aiWin.indexOf(9) < 0 || aiWin.length !== 2) mustOk = false;  // 局面自检
    for (const mode of ['full', 'mid']) {
      const mv = engAiPick(b.slice(), 5, mode, 1);
      if (aiWin.indexOf(mv) < 0) mustOk = false;                          // 必下第四子成四
    }
    const mvB = engAiPick(b.slice(), 5, 'block', 1);
    if (aiWin.indexOf(mvB) >= 0) mustOk = false;                          // block 跳①（章约束行为差异）
  }
  { /* 局面 B：玩家双端开放活三（row1 c1-3，5/9 空）→ 三档 AI 必堵（∈ 玩家制胜点） */
    const b = mkB(5, [6, 7, 8], [18, 22]);
    const pWin = winPointsFor(b.slice(), 5, 1);
    if (pWin.indexOf(5) < 0 || pWin.indexOf(9) < 0 || pWin.length !== 2) mustOk = false;
    for (const mode of ['block', 'full', 'mid']) {
      const mv = engAiPick(b.slice(), 5, mode, 2);
      if (pWin.indexOf(mv) < 0) mustOk = false;                           // 必堵
    }
  }
  { /* 局面 C：玩家单端活三（9 被 AI 占）→ 唯一制胜点 5 必堵 */
    const b = mkB(5, [6, 7, 8], [9, 22]);
    const mv = engAiPick(b.slice(), 5, 'full', 3);
    if (mv !== 5) mustOk = false;
  }
  if (mustOk) npass++;
  units.aiMust = { ok: mustOk };

  /* ---- ④ sayW 三态（单元直驱：gomoku 负局在 ch1 不可达——block AI 永不制胜，
       每负必播分支用直调验证；真实负局路径在 ⑤B 另测 gk_lose 播报在场） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const losePlays = () => wLog.filter(p => p[0] === 'gk_lose').length;
  startLevel(0);                                          // flat0：每呼必播
  sayW(VOICE.lose.key, VOICE.lose.text, false);
  sayW(VOICE.lose.key, VOICE.lose.text, false);
  const sayA = losePlays();                               // → 2
  startLevel(10);                                         // flat10：10s 节流
  lastWrongVoice = Date.now();                            /* 显式进入节流窗口内 */
  sayW(VOICE.lose.key, VOICE.lose.text, false);           // 窗口内 → 不播
  const sayB = losePlays() - 2;                           // 增量 → 0
  sayW(VOICE.lose.key, VOICE.lose.text, true);            // force 豁免 → 播
  const sayC = losePlays() - 2 - sayB;                    // 增量 → 1
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 1;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, force: sayC };

  /* ---- ⑤A 教学链（verify 直驱 tutorialWatch）：watch clip → demo 真实成四（demoR 实证）→
       重发同关棋盘清零 → 交接 gk_tut_turn → help 解锁；watch 期真 AI 零应手 ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const pLog7 = [];
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  KIDS.voice.queue = function (keys) { (keys || []).forEach(k => pLog7.push(String(k))); };  /* m2 开场改 queue 后日志双通道 */
  KIDS.voice.say = function (t) { pLog7.push('say:' + String(t).slice(0, 12)); };
  startLevel(0);
  const aiBefore = window.__gkAiMoves || 0;
  const demoSamples = [];
  const tw = tutorialWatch();                    // 不 await：watch 进行中采样（真 AI 计数/局面态）
  for (let i = 0; i < 3; i++) {
    demoSamples.push(GK.quiz ? GK.quiz.phase : null);
    await wait(90);
  }
  await tw;
  KIDS.voice.play = origP7; KIDS.voice.queue = origQ7;
  const q0 = GK.quiz;
  const tutOk = pLog7.indexOf('gk_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    window.__gkDemoR === 'right' &&                                     /* 演示真实生效（§0.27） */
    state.tut === 'help' && !state.demo && !state.locked &&             /* 帮：解锁等孩子动手 */
    GK.currentLevel && GK.currentLevel.flat === 0 &&                    /* 重发同关 */
    q0 && q0.step === 0 && q0.board.every(v => v === 0) &&              /* 重发后棋盘清零 */
    pLog7.indexOf('gk_tut_turn') >= 0 &&                                /* 交接=你来下一局（§0.6） */
    (window.__gkAiMoves || 0) === aiBefore &&                           /* watch 期真 AI 零应手（demo 配步不算） */
    demoSamples.every(v => v === 'play');                               /* watch 期无终局态泄漏 */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__gkDemoR, tut: state.tut,
    aiMoves: (window.__gkAiMoves || 0) - aiBefore, handoff: pLog7.indexOf('gk_tut_turn') >= 0,
    samples: demoSamples };

  /* ---- ⑤B 负局路径（flat10=ch3 AI 先手 full）：suicide 驱动 → 'wrong' + miss/retries 恰一次 +
       零惩罚重下（棋盘清零、step 不推进、phase 回 play）+ gk_lose 播报在场 ---- */
  total++;
  startLevel(10);
  const pLogB = [];
  KIDS.voice.play = function (key) { pLogB.push(String(key)); };
  let guardB = 0, rB = null;
  while (guardB++ < 60) {
    const q = GK.quiz;
    if (!q) break;
    if (q.phase === 'play' && q.turn === 1 && !state.locked) {
      rB = await uiPlay(engSuicidePick(q.board, q.N));
      if (rB === 'wrong') break;
    } else await wait(80);
  }
  KIDS.voice.play = origPlay2;
  const qB = GK.quiz;
  const loseOk = rB === 'wrong' && !!qB && qB.step === 0 &&                       /* 不推进 */
    qB.phase === 'play' && qB.board.every(v => v === 0) &&                        /* 重开棋盘清零 */
    qB.miss === 1 && GK.currentLevel.retries === 1 &&                             /* miss/retries 恰一次 */
    pLogB.indexOf('gk_lose') >= 0 &&                                              /* 负局播报在场 */
    window.__gkLoseSeen === true;
  if (loseOk) npass++;
  units.losePath = { ok: loseOk, r: rB, miss: qB ? qB.miss : null, step: qB ? qB.step : null,
    phase: qB ? qB.phase : null, boardEmpty: qB ? qB.board.every(v => v === 0) : null,
    retries: GK.currentLevel.retries, voice: pLogB.indexOf('gk_lose') >= 0,
    loseSeen: window.__gkLoseSeen === true };

  /* ---- ⑤C autoSolve 冒烟：flat5（ch2 玩家先手 full）整关 3★——UI 通路（tapCell 演出+推进链）
     flat10/15 的全胜性已由 ① 引擎直驱覆盖（retries=0 断言），UI 层单关冒烟控制 verify 总时长 ---- */
  total++;
  startLevel(5);
  const a = await GK.autoSolve();
  const lv = GK.currentLevel;
  const okC = a.done && lv.done && lv.retries === 0 && a.stars === 3 &&
    (a.taps >= 20   /* 审查 m5：5 局×每局≥4 子=≥20 下界 */);                                       /* 至少每局一子（5 局×≥4 子下界） */
  if (okC) npass++;
  smokes.flat5 = { ok: okC, done: a.done, retries: a.retries, stars: a.stars, taps: a.taps };

  /* ---- ⑥ 救援行为直驱：可制胜局面 rescueAct → breathe 在场 + rescues 计数 ---- */
  total++;
  startLevel(5);
  await wait(50);
  placeStone(1, 6); placeStone(1, 7); placeStone(1, 8);     /* 手摆玩家活三（row1 c1-3） */
  curGame.turn = 1; curGame.phase = 'play'; state.locked = false; aiRun = false;
  const resBefore = GK.rescues;
  rescueAct();
  const rescueOk = GK.rescues === resBefore + 1 &&
    (cellEl(5).classList.contains('breathe') || cellEl(9).classList.contains('breathe'));   /* 可制胜点 breathe */
  if (rescueOk) npass++;
  units.rescue = { ok: rescueOk, count: GK.rescues };

  /* ---- ⑦ 布局：双 viewport ×（flat0/5/10/15）；棋格 ≥64、全按钮 ≥64、overflowX ≤0 ---- */
  async function simView(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                             /* 入场稳定（真实 ms，不吃 SPEED） */
    const de = document.documentElement;
    const cells = Array.prototype.slice.call(bgridEl.querySelectorAll('.cell'));
    const cellOk = cells.length >= 16 &&
      cells.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    let btnOk = true;                            // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, cellOk: cellOk, btnOk: btnOk, ox: ox,
      pass: cellOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simView(1280, 800, f));
    sims.push(await simView(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                 // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑧ 文案与 clips：VOICE 六条字面量对账 + 恰 9 条注入 + 开场链 ---- */
  total++;
  /* SPEC §2 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！连成四个子' &&
    VOICE.turn.text === '你来下一局' && VOICE.hint.text === '想想哪里能连四个' &&
    VOICE.right.text === '四个连上啦，你赢了' && VOICE.lose.text === '兔子赢啦，再来一局' &&
    VOICE.draw.text === '平局，再来一局';
  /* gk_ 6 条 + core 3 条 = 恰 9 条注入对账（build 断言同口径，verify 侧复检） */
  const GK_KEYS = ['gk_tut_watch', 'gk_tut_turn', 'gk_hint', 'gk_right', 'gk_lose', 'gk_draw'];
  const CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 9 &&
    GK_KEYS.concat(CORE_KEYS).every(k => !!KIDS.voice.clips[k]);
  /* 开场链：verify 页 startLevel 恒走 openingSpeak（stub 记录 play(gk_hint)） */
  const pLog8 = [];
  KIDS.voice.play = function (key) { pLog8.push(String(key)); };
  KIDS.voice.queue = function (keys) { (keys || []).forEach(k => pLog8.push(String(k))); };  /* m2 同 */
  startLevel(0);
  KIDS.voice.play = origPlay2;
  const openOk = pLog8.length >= 1 && pLog8[0] === 'gk_hint';
  const specOk = refVoice && clipOk && openOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, clips: nClips, openChain: openOk };

  const out = { game: 'gomoku4', total: total, pass: npass, layoutOk: layoutOk,
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
  KIDS.voice.say = function () {};
  runVerify();
}
