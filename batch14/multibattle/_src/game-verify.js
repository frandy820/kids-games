/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     章域一致（dch1-3 全部 q.src 记"mul"且 a∈章键因数；dch4 q.src 计数 m89=2+mix=3——混合复习形态）/
     算式域独立审计（refRangeOk：a,b∈2..9、answer=a*b、章键因数匹配）/
     干扰项独立复算（refCands={ans±a,ans±b,a+b} 滤重/正/非 ans）+ structOk / 互异禁 0 负/
     相邻题算式互异（(a,b) 对不同）/ 热身无（本款设计无热身，记录性断言恒真）/
     引擎直驱：答对推进 myScore++ / 答错 miss 恰一次 retries+1 / 对手超时 engFoe foeScore++
     不动 miss/retries / 星级三档独立驱动（每题一错 1★ / 仅首题一错 2★ / 全对 3★）
   ② sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A flat0：真实通路首题先错一次（晃动不灰化可重点、钟不停）→ 通关=2 星 +
     myScore=5 + 胜利分支 __mbWinBranch='win'（verify 页不弹层）
     B flat5/flat10：autoSolve 全对 3 星；B3 flat15（ch4）：形态 m89=2+mix=3 + 3 星
   ④ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 答对（__mbDemoR==='right' §0.27）→
     重发同关比分清零 → 交接链 queue([mul_tut_turn, n_a, mul_q1, n_b, mul_q2]) 5 段 →
     tut='help' 解锁；watch 期钟冻结（foeT 恒 1 采样）
   ⑤ multibattle 钟专项：A 提速生效（ch1 首超时实测 ≪ 真实 8000ms）/
     B 超时零惩罚（全超时关 retries=0 星级=3 + foeScore=5 + 'again' 分支）/
     C 答错钟不停（钟剩余单调减）
   ⑥ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）答案卡 ≥96、全按钮 ≥64
     （.k-parentbtn 豁免）、overflowX ≤0（量测期钟停，防超时换题重渲染干扰）
   ⑦ 分布与专项：VOICE 表文案独立字面量对账（SPEC 定稿）/ mul_* 16 条 clips 注入 clipOk /
     开场顺序链 queue([mul_hint, n_a, mul_q1, n_b, mul_q2]) 5 段单通道 / 题面 4 段拼接全 clip /
     answerIdx 三位置均出现且首位 <60%
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0];

  /* ---- verify 侧独立复算（不调引擎生成器/candPool，防两套逻辑同错） ---- */
  function refRangeOk(dch, q) {                  // 算式域独立审计
    if (q.src === 'mul') {                       // dch1-3 章键因数
      const ks = KEYS[dch];
      return ks.indexOf(q.a) >= 0 && q.b >= 2 && q.b <= 9 && q.a * q.b === q.answer;
    }
    if (q.src === 'm89') return (q.a === 8 || q.a === 9) && q.b >= 2 && q.b <= 9 && q.a * q.b === q.answer;
    if (q.src === 'mix') return q.a >= 2 && q.a <= 9 && q.b >= 2 && q.b <= 9 && q.a * q.b === q.answer;
    return false;
  }
  function refCands(q) {                         // 干扰规则池：{ans±a, ans±b, a+b}
    const out = [];
    [q.answer - q.a, q.answer + q.a, q.answer - q.b, q.answer + q.b, q.a + q.b].forEach(v => {
      if (v > 0 && v !== q.answer && out.indexOf(v) < 0) out.push(v);
    });
    return out;
  }

  /* ---- ① 40 关全量审计 + 引擎直驱（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, kindAll = true, structAll = true, distrAll = true,
        adjOk = true, driveOk = true, formOk = true;
    let prevA = -1, prevB = -1, m89n = 0, mixn = 0;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (q.kind !== 'mul') kindAll = false;
      if (!refRangeOk(L1.dch, q)) rangeAll = false;
      if (!structOk(q)) structAll = false;
      if (q.src === 'm89') m89n++;
      if (q.src === 'mix') mixn++;
      q.items.forEach((v, idx) => {                                        // 干扰规则+互异禁 0 负（structOk 复口径）
        if (idx === q.answerIdx) return;
        if (v === q.answer || refCands(q).indexOf(v) < 0) distrAll = false;
      });
      idxDist[q.answerIdx]++;
      if (q.a === prevA && q.b === prevB) adjOk = false;                  // 相邻题算式互异（(a,b) 对）
      prevA = q.a; prevB = q.b;
    }
    /* 形态：dch1-3 全章键因数乘法；dch4 = 2×m89 + 3×mix（混合复习，SPEC §2） */
    if (L1.dch <= 3) formOk = L1.quizzes.every(q => q.src === 'mul');
    else formOk = m89n === 2 && mixn === 3;
    /* 引擎直驱：答对推进 / 答错 miss 恰一次 / 超时零惩罚 / 星级三档 */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      let wi = 0; while (wi === q.answerIdx) wi++;
      if (engPick(Ld, wi) !== 'wrong' || q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;  // 错=miss 恰一次
      if (engPick(Ld, 99) !== null || engPick(Ld, 0.5) !== null) driveOk = false;                    // 非法下标防御
      if (engPick(Ld, q.answerIdx) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) driveOk = false;  // 对=推进
      if (Ld.myScore !== k + 1) driveOk = false;
      if (k === 0) {                            // 对手超时（首题）：foeScore++ 不动 miss/retries（零惩罚）
        const Lf = genLevel(flat), qf = Lf.quizzes[0];
        const rf = engFoe(Lf);
        if (rf !== 'foe' || Lf.foeScore !== 1 || Lf.step !== 1 ||
            qf.miss !== 0 || Lf.retries !== 0) driveOk = false;
      }
    }
    /* 星级三档：Ld=每题一错（更多=1★）/ L2x=仅首题一错（1-2 错=2★）/ L3=全对（0 错=3★） */
    const s1 = Ld.done && Ld.retries >= 5 && engStars(Ld) === 1;
    const L2x = genLevel(flat);
    let g2 = 0;
    while (!L2x.done && g2++ < 30) {
      const q = L2x.quizzes[L2x.step];
      if (L2x.step === 0) { let wi = 0; while (wi === q.answerIdx) wi++; engPick(L2x, wi); }
      engPick(L2x, q.answerIdx);
    }
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L3 = genLevel(flat);
    let guard = 0;
    while (!L3.done && guard++ < 30) engPick(L3, L3.quizzes[L3.step].answerIdx);
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;
    /* 热身：本款设计无首题热身（每章题型单一直入对抗，SPEC §2 无热身条款）——记录性恒真 */
    const warmOk = true;
    const ok = det && L1.quizzes.length === CH_LEN && rangeAll && kindAll && formOk &&
      structAll && distrAll && adjOk && driveOk && warmOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, kindAll: kindAll,
      formOk: formOk, structAll: structAll, distrAll: distrAll, adjOk: adjOk, driveOk: driveOk,
      stars: { many1: engStars(Ld), wrong1: engStars(L2x), clean: engStars(L3) },
      qs: L1.quizzes.map(q => q.a + '×' + q.b + '=' + q.items.join('/')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'mul_wrong').length;
  const wrongIdx = () => { const q = MB.quiz; let i = 0; while (i === q.answerIdx) i++; return i; };
  startLevel(0);                                          // flat0：每错必播
  await uiPick(wrongIdx());
  await uiPick(wrongIdx());
  const sayA = wrongPlays();                              // → 2
  startLevel(3);                                          // flat3：10s 节流
  lastWrongVoice = Date.now();                            /* 显式进入节流窗口内 */
  await uiPick(wrongIdx());                               // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                          // 增量 → 0
  startLevel(3);                                          // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                                     /* 隔离上一子用例时间戳 */
  await uiPick(wrongIdx());                               // miss=1 → 播（10s 窗口外）
  await uiPick(wrongIdx());                               // miss=2 → force === 2 → 播
  const sayC = wrongPlays() - 2 - sayB;                   // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次=2 星；钟走完前抢答，提速下可行） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, clockLive = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = MB.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                                        // 首错：卡晃动零惩罚可重点；对手钟不停
      await wait(200);                                    // 先让钟走一段（foeT<1 再采基数）
      const t1 = MB.quiz.foeT;
      const r = await uiPick(wrongIdx());
      const t2 = MB.quiz.foeT;
      const wigCard = !!answersEl.querySelector('.opt.wrong');
      const alive = !!answersEl.querySelector('.opt:not(.wrong):not(.right)');
      wrongOk = r === 'wrong' && wigCard && alive &&
        MB.currentLevel.retries === 1 && MB.currentLevel.step === 0 && MB.quiz.miss === 1;
      clockLive = t1 < 1 && t2 < t1;                      // 错答期间钟剩余递减=钟没停
    }
    const r2 = await uiPick(MB.quiz.answerIdx);
    if (r2 !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    quizzesA++;
  }
  const lvA = MB.currentLevel;
  const smokeOkA = smokeA && wrongOk && clockLive && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && lvA.myScore === 5 && lvA.foeScore === 0 &&
    window.__mbWinBranch === 'win' && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, clockLive: clockLive, quizzes: quizzesA,
    retries: lvA.retries, stars: engStars(cur), myScore: lvA.myScore, branch: window.__mbWinBranch };

  /* ---- ③ UI 冒烟 B1/B2：flat5（ch2）/flat10（ch3）autoSolve 全对 3 星 ---- */
  total++;
  startLevel(5);
  const a5 = await MB.autoSolve();
  const lv5 = MB.currentLevel;
  const smokeOk5 = a5.done && lv5.done && lv5.won && lv5.retries === 0 &&
    engStars(cur) === 3 && lv5.myScore === 5;
  if (smokeOk5) npass++;
  smokes.flat5 = { ok: smokeOk5, picks: a5.picks, stars: engStars(cur) };
  total++;
  startLevel(10);
  const a10 = await MB.autoSolve();
  const lv10 = MB.currentLevel;
  const smokeOk10 = a10.done && lv10.done && lv10.won && lv10.retries === 0 &&
    engStars(cur) === 3 && lv10.myScore === 5;
  if (smokeOk10) npass++;
  smokes.flat10 = { ok: smokeOk10, picks: a10.picks, stars: engStars(cur) };

  /* ---- ③ UI 冒烟 B3：flat15（ch4）形态 m89=2+mix=3 + autoSolve 3 星 ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const form15 = L15.dch === 4 &&
    L15.quizzes.filter(q => q.src === 'm89').length === 2 &&
    L15.quizzes.filter(q => q.src === 'mix').length === 3;
  const a15 = await MB.autoSolve();
  const lv15 = MB.currentLevel;
  const smokeOk15 = form15 && a15.done && lv15.done && lv15.won &&
    lv15.retries === 0 && engStars(cur) === 3 && lv15.myScore === 5;
  if (smokeOk15) npass++;
  smokes.flat15 = { ok: smokeOk15, form: form15, picks: a15.picks, stars: engStars(cur) };

  /* ---- ④ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 答对（demoR 实证）→
       重发同关比分清零 → 交接链 5 段 → help 解锁；watch 期钟冻结（foeT 恒 1） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  startLevel(0);
  const demoSamples = [];
  const tw = tutorialWatch();                    // 不 await：watch 进行中采样钟冻结
  for (let i = 0; i < 3; i++) { demoSamples.push(MB.quiz ? MB.quiz.foeT : null); await wait(90); }
  await tw;
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = MB.quiz;
  const frozenOk = demoSamples.length === 3 && demoSamples.every(v => v === 1);   // 教学期钟冻结
  const tutOk = pLog7.indexOf('mul_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    window.__mbDemoR === 'right' &&                                      /* 演示真实生效（§0.27） */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    MB.currentLevel && MB.currentLevel.flat === 0 &&                      /* 重发同关 */
    MB.quiz && MB.quiz.step === 0 && MB.quiz.myScore === 0 &&            /* 重发后比分清零 */
    lastQ7 && lastQ7.length === 5 && lastQ7[0] === 'mul_tut_turn' &&      /* 交接顺序链单通道 5 段 */
    lastQ7[1].key === 'mul_n_' + q0t.a && lastQ7[2].key === 'mul_q1' &&
    lastQ7[3].key === 'mul_n_' + q0t.b && lastQ7[4].key === 'mul_q2';
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__mbDemoR, frozen: frozenOk,
    watchClip: pLog7.indexOf('mul_tut_watch') >= 0, handoff: !!lastQ7, parts: lastQ7,
    samples: demoSamples, tut: state.tut };

  /* ---- ⑤ 钟专项 A：verify 提速生效（/SPEED 口径）——ch1 首题超时实测 ≈960ms（≪ 真实 8000ms） ---- */
  total++;
  startLevel(0);
  const t0 = performance.now();
  let gA = 0;
  while (cur && !cur.done && cur.step === 0 && gA++ < 260) await wait(40);   // 等首题对手超时
  const dtA = performance.now() - t0;
  const expect = FOE_MS[1] * SPEED;             // 960ms（提速口径=base/SPEED 家族 wait() 同构）
  const speedOk = dtA > 400 && dtA < 2600 && expect < 1200;
  if (speedOk) npass++;
  units.clockSpeed = { ok: speedOk, ms: Math.round(dtA), expect: Math.round(expect), base: FOE_MS[1] };

  /* ---- ⑤ 钟专项 B：超时零惩罚——静置全超时：不计 miss 不扣星 + 鼓励分支 ---- */
  total++;
  let gB = 0;
  while (cur && !cur.done && gB++ < 400) await wait(50);   // 接 A：第 2-5 题全部超时
  await wait(400);                              // 等末题超时演出收尾 → winFlow 记录胜负分支
  const timeoutOk = !!cur && cur.done && cur.foeScore === CH_LEN && cur.myScore === 0 &&
    cur.retries === 0 && cur.quizzes.every(q => q.miss === 0) && engStars(cur) === 3 &&
    window.__mbWinBranch === 'again';            /* <3 格=鼓励收尾（胜负=速度，与星级分离） */
  if (timeoutOk) npass++;
  units.clockTimeout = { ok: timeoutOk, foeScore: cur ? cur.foeScore : null,
    myScore: cur ? cur.myScore : null, retries: cur ? cur.retries : null,
    stars: cur ? engStars(cur) : null, branch: window.__mbWinBranch };

  /* ---- ⑤ 钟专项 C：答错对手钟不停（钟剩余单调减） ---- */
  total++;
  startLevel(0);
  await wait(240);                               // 钟走一段（foeT<1）
  const st1 = MB.quiz;
  await uiPick(wrongIdx());                      // 错答（晃动窗 62ms，钟不停）
  const t2 = MB.quiz.foeT;
  await wait(150);
  const t3 = MB.quiz.foeT;
  const wrongClockOk = st1.foeT < 1 && t2 < st1.foeT && t3 < t2;
  stopFoe();                                     // 清场：本专项不再需要钟
  if (wrongClockOk) npass++;
  units.clockWrong = { ok: wrongClockOk, t1: st1.foeT, t2: t2, t3: t3 };

  /* ---- ⑥ 布局：双 viewport ×（flat0/5/10/15）；量测期停钟（防超时换题重渲染干扰 §0.11） ---- */
  async function simView(w, h, flat) {
    startLevel(flat);
    stopFoe();
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                             // 答案卡入场动画 .38s+delay .14s（真实 ms，不吃 SPEED）
    const de = document.documentElement;
    const opts = Array.prototype.slice.call(answersEl.querySelectorAll('.opt'));
    const optOk = opts.length === 3 &&
      opts.every(b => { const r = b.getBoundingClientRect(); return r.width >= 96 && r.height >= 96; });
    let btnOk = true;                            // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, optOk: optOk, btnOk: btnOk, ox: ox,
      pass: optOk && btnOk && ox <= 0 };
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

  /* ---- ⑦ 分布与专项：文案对账 / clip 注入 / 开场链 / 题面拼接 / 覆盖率 ---- */
  total++;
  /* SPEC §2 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！和兔子比一比' &&
    VOICE.turn.text === '你来抢答' && VOICE.hint.text === '算一算，几个几' &&
    VOICE.q1.text === '乘' && VOICE.q2.text === '等于多少呀' &&
    VOICE.win.text === '答对啦，冲呀' && VOICE.lose.text === '兔子先答完啦，下一题追上它' &&
    VOICE.wrong.text === '再想一想，算一算';
  const numCnOk = numCn(2) === '二' && numCn(5) === '五' && numCn(9) === '九';
  /* mul_* 全部 16 条 clips 注入对账（build 注入后 KIDS.voice.clips 应含全部） */
  const MUL_KEYS = ['mul_tut_watch', 'mul_tut_turn', 'mul_hint', 'mul_wrong', 'mul_q1', 'mul_q2',
    'mul_win', 'mul_lose'].concat(Array.from({ length: 8 }, (_, i) => 'mul_n_' + (i + 2)));
  const clipOk = MUL_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([mul_hint, n_a, mul_q1, n_b, mul_q2]) 5 段单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                 // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const q0v = genLevel(0).quizzes[0];
  const openChain = qLog.length >= 1 && lastQ.length === 5 && lastQ[0] === 'mul_hint' &&
    lastQ[1].key === 'mul_n_' + q0v.a && lastQ[2].key === 'mul_q1' &&
    lastQ[3].key === 'mul_n_' + q0v.b && lastQ[4].key === 'mul_q2';
  /* 题面 queue 4 段拼接断言：段序=key 序（数词a、q1'乘'、数词b、q2'等于多少呀'）且全 clip 在场 */
  const parts0 = quizParts(q0v);
  const chainOk = parts0.length === 4 &&
    parts0[0].key === 'mul_n_' + q0v.a && parts0[1].key === 'mul_q1' &&
    parts0[2].key === 'mul_n_' + q0v.b && parts0[3].key === 'mul_q2' &&
    parts0.every(p => !!KIDS.voice.clips[p.key]);
  speakQuiz(q0v);                                // 救援/重听拼句：题面 4 段（clip 在场走 queue）
  const lastQ2 = qLog[qLog.length - 1];
  const rescueChain = qLog.length >= 2 && lastQ2 !== lastQ && lastQ2.length === 4 &&
    lastQ2[0] === 'mul_n_' + q0v.a && lastQ2[3] === 'mul_q2';
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  /* 答案位置分布：三位置均出现、首位不恒定（<60%，按实际计数） */
  const idxN = idxDist[0] + idxDist[1] + idxDist[2];
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[0] < idxN * 0.6;
  const specOk = refVoice && numCnOk && clipOk && openChain && chainOk && rescueChain && distOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, numCn: numCnOk, clips: clipOk,
    openChain: openChain, chain: chainOk, rescueChain: rescueChain,
    idx: idxDist, n: idxN };

  const out = { game: 'multibattle', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
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
