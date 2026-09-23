/* ================= ?verify=1 自检（仅 verify 分支加载执行；r12 拆独立第 4 script 块）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章规则（ch1 全图→字+干扰非同族 / ch2 全字→图+干扰恒形近 / ch3 双模式交替+干扰恒形近 /
     ch4 三题型谱 [图→字,字→图,evo,图→字,evo]+干扰恒形近）/ structOk /
     选项数（ch1 lv0-1 两选、lv2-4 三选；ch2 起恒 3-4——dch3 峰 fam≥3 恒 4）/ 相邻题不同字 /
     r12 时长硬断言（独立副本模型 vLevelDur 与源 levelDurMs 对账一致且每关 ≥40s）/ 引擎直驱通关 0 错 3 星
   ② 选项单元：错点（灰掉可重点+零惩罚）/ 已灰卡 'again' / 非法下标 false / 点对推进
   ② 附：toChar 同源（题面 svg data-k=target；汉字卡文本 === PICTO.ch）
   ③ toPic 结构单元（flat5=章2 字→图）：题面大汉字 === PICTO.ch；选项=象形图卡（svg data-k 同源）
   ③b evo 字源推演单元（flat15=章4）：题面=两段演变 [data-k0 古形, data-k 甲骨] + 问号收尾、
     题面不含答案字形（无 .zi）——判定=推演非匹配；EVO 池 12 字 ev!==svg 实锤
   ④ sayW 节流（flat<3 每错必播 / flat≥3 10s 一条）+ 首错不 pulse / 二错 breathe
   ⑤ UI 冒烟：flat0 首错零惩罚+通关（1 错=2 星）；flat10（章 3 形近）干扰全 sameFam+autoSolve 3 星；
     flat15（章 4 混合）三题型必现+autoSolve 3 星
   ⑥ 布局：双 viewport（模拟 1280×800 / 800×1180+body.port 通道）×（章1 三选字卡 / 章2 图卡 /
     章3 四选 / 章4 evo）：选项卡 ≥96、象形图 SVG ≥64、题面卡 ≥140、汉字 ≥80px、按钮 ≥64
     （排除 .k-parentbtn）、overflowX ≤0、竖屏 portStyle 生效（.opt 宽 118）+ 选项卡落容器内
   ⑦ 字库+形近族+推演+时长+契约（r12 delta 单元——全部 SPEC 独立副本，禁引实现互证）：
     40 键定稿序 / NEAR 19 对实锤（新对 ≥14 含未/末、鸟/乌）+ 非对哨兵 / sameFam 判别力 /
     覆盖（dch1 两轮=40 全库、dch2/3=DEEP 18、dch4 两轮=18、evo 两轮=12）/ 46 条 clip 内嵌 /
     estMs 家族 / nextHint 章末逐点独立副本+off-by-one 哨兵
   ⑧ 教学/演出吞输入单元：demo+locked 门拦真实与钩子输入
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const targetsByDch = { 1: {}, 2: {}, 3: {}, 4: {} };       // 分章目标累计（覆盖断言）
  const evoSeen = {};                                        // evo 目标累计（两轮并集）
  let n4 = 0;                                                // 4 选题出现数（恒 3-4 的高位实锤）

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let ruleOk = true, structAll = true, adjOk = true, driveOk = true, durOk = true;
    const modesSeen = {};
    let evoCnt = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q, L1.dch)) structAll = false;
      modesSeen[q.mode] = 1;
      targetsByDch[L1.dch][q.target] = 1;
      if (q.mode === 'evo') { evoCnt++; evoSeen[q.target] = 1; }
      if (q.nOpt !== nOptOf(L1.dch, L1.lv, q.target)) ruleOk = false;        // 选项数口径
      if (L1.dch >= 2 && (q.nOpt < 3 || q.nOpt > 4)) ruleOk = false;         // r12 delta②：ch2 起恒 3-4 选
      if (L1.dch === 1 && (q.nOpt < 2 || q.nOpt > 3)) ruleOk = false;        // ch1 入门渐进
      if (q.nOpt === 4) n4++;
      if (L1.dch === 1 && q.mode !== 'toChar') ruleOk = false;               // ch1 全图→字
      if (L1.dch === 2 && q.mode !== 'toPic') ruleOk = false;                // ch2 全字→图
      if (L1.dch === 3 && q.mode === 'evo') ruleOk = false;                  // ch3 无推演
      if (L1.dch === 4 && evoCnt > 2) ruleOk = false;
      if (k > 0 && L1.quizzes[k - 1].target === q.target) adjOk = false;     // 相邻题不同字
    }
    if (L1.dch === 4 && evoCnt !== 2) ruleOk = false;                        // ch4 evo 恰 2 题
    if (L1.dch === 3 && !(modesSeen.toChar && modesSeen.toPic)) ruleOk = false;  // ch3 双模式
    if (L1.dch === 4 && !(modesSeen.toChar && modesSeen.toPic && modesSeen.evo)) ruleOk = false;
    if (L1.dch <= 2 && Object.keys(modesSeen).length !== 1) ruleOk = false;
    const durMs = vLevelDur(L1);                                            // 独立副本模型
    if (durMs !== levelDurMs(L1) || durMs < V_MIN_MS) durOk = false;        // 对账一致 + r12 时长硬断言 ≥40s
    /* 引擎直驱：每题点正确卡 → 前 4 题 'right'、末题 'done' → 0 错 3 星 */
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const r = engTapOption(L1, L1.quizzes[k].answerIdx);
      const wantR = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (r !== wantR) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.misses === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && adjOk && driveOk && durOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, structAll: structAll,
      adjOk: adjOk, driveOk: driveOk, durOk: durOk, durMs: durMs, solvedAll: solvedAll,
      qs: L1.quizzes.map(q => q.mode + ':' + PIC_BY[q.target].ch + (q.near ? '*' : '') + q.nOpt) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 选项单元（flat0 真实 UI；toChar 同源断言） ---- */
  total++;
  startLevel(0);
  const q0 = PIC.quiz;
  const promptSvg = document.querySelector('#prompt-card .pic');
  const charCards = Array.prototype.map.call(document.querySelectorAll('#opts .opt .zi'), e => e.textContent);
  const srcOk = q0.mode === 'toChar' && q0.nOpt === 2 &&
    !!promptSvg && promptSvg.getAttribute('data-k') === q0.target &&          // 题面象形图同源
    charCards.length === q0.options.length &&
    charCards.every((t, i) => t === PIC_BY[q0.options[i]].ch);               // 汉字卡文本与 PICTO 表严格同源
  const wi = q0.options.findIndex((k, i) => i !== q0.answerIdx);
  const rWrong = await PIC.tapOption(wi);
  const wEl = optEl(wi);
  const wrongOk = rWrong === 'wrong' && PIC.currentLevel.misses === 1 &&
    PIC.currentLevel.step === 0 && wEl.classList.contains('dim') &&
    getComputedStyle(wEl).pointerEvents === 'none';                          // 已灰卡不可点（§0.7）
  const rAgain = await PIC.tapOption(wi);                                    // 已灰卡再点：早退零惩罚
  const againOk = rAgain === 'again' && PIC.currentLevel.misses === 1 && PIC.currentLevel.step === 0;
  const badIdx = (await PIC.tapOption(99)) === false && (await PIC.tapOption(-1)) === false;
  const rRight = await PIC.tapOption(q0.answerIdx);
  await wait(300);                                                           // 演出窗（SPEED 提速）
  const rightOk = rRight === 'right' && PIC.currentLevel.step === 1 && PIC.currentLevel.misses === 1;
  const tapOk = srcOk && wrongOk && againOk && badIdx && rightOk;
  if (tapOk) npass++;
  units.tapOption = { ok: tapOk, srcOk: srcOk, wrong: wrongOk, again: againOk,
    badIdx: badIdx, right: rightOk, grey: wEl ? wEl.className : null };

  /* ---- ③ toPic 结构单元（flat5=章2 字→图）：题面大汉字+象形图卡同源 ---- */
  total++;
  startLevel(5);
  const qp = PIC.quiz;
  const promptZi = document.querySelector('#prompt-card .zi');
  const picCards = Array.prototype.map.call(document.querySelectorAll('#opts .opt .pic'),
    e => e.getAttribute('data-k'));
  const toPicOk = qp.mode === 'toPic' && qp.nOpt >= 3 && !!promptZi &&
    promptZi.textContent === PIC_BY[qp.target].ch &&
    picCards.length === qp.options.length &&
    picCards.every((k, i) => k === qp.options[i]) &&
    !document.querySelector('#opts .opt .zi');                               // 字→图模式选项不含汉字卡
  if (toPicOk) npass++;
  units.toPicDom = { ok: toPicOk, target: qp.target, prompt: promptZi ? promptZi.textContent : null,
    cards: picCards, nOpt: qp.nOpt };

  /* ---- ③b evo 字源推演单元（flat15=章4，step2=evo 题）：判定=推演非匹配 ---- */
  total++;
  startLevel(15);
  const qeIdx = cur.quizzes.findIndex(x => x.mode === 'evo');
  const qe = qeIdx >= 0 ? cur.quizzes[qeIdx] : null;
  let evoOk = false, evoDom = null;
  if (qe) {
    cur.step = qeIdx; renderQuiz();                                          // 白盒渲染 evo 题（免时序）
    const stage0 = document.querySelector('#prompt-card .pic.p0');
    const stage1 = document.querySelector('#prompt-card .pic[data-k]');
    const qmark = document.querySelector('#prompt-card .evo-q');
    const leakZi = document.querySelector('#prompt-card .zi');               // 题面不得含答案字形
    const optZis = Array.prototype.map.call(document.querySelectorAll('#opts .opt .zi'), e => e.textContent);
    evoOk = PIC.quiz.evo === true && PIC.quiz.nOpt >= 3 &&
      !!stage0 && stage0.getAttribute('data-k0') === qe.target &&            // 第一段=古形（data-k0）
      !!stage1 && stage1.getAttribute('data-k') === qe.target &&             // 第二段=甲骨形
      !!qmark && !leakZi &&                                                  // ? 收尾 + 零字形泄漏（推演非匹配）
      optZis.length === qe.options.length &&
      optZis.every((t, i) => t === PIC_BY[qe.options[i]].ch) &&              // 选项=汉字卡
      qe.distractors.every(d => sameFam(d, qe.target)) &&                    // 干扰恒同形近族
      PIC_BY[qe.target].ev !== PIC_BY[qe.target].svg;                        // 古形≠甲骨（两段可辨）
    evoDom = { target: qe.target, nOpt: qe.nOpt, chars: optZis };
  }
  if (evoOk) npass++;
  units.evoDom = { ok: evoOk, dom: evoDom };

  /* ---- ④ sayW 节流（flat2 三选两错卡：flat<3 每错必播 / flat3：10s 一条）+ pulse 阶梯 ---- */
  total++;
  let playLog = [];
  const origPlay = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { playLog.push(key); };
  startLevel(2);                                 /* flat2（flat<3，lv2 三选）：每错必播 */
  const qw = PIC.quiz;
  const wrongs = qw.options.map((k, i) => i).filter(i => i !== qw.answerIdx);
  const t0 = optEl(qw.answerIdx);
  const noPulse1 = !t0.classList.contains('breathe');
  await PIC.tapOption(wrongs[0]);                /* 首错：不 pulse 正确卡 */
  const noPulse2 = !optEl(qw.answerIdx).classList.contains('breathe');
  await PIC.tapOption(wrongs[1]);                /* 二错：正确卡 breathe 高亮出现 */
  await wait(500);
  const pulse2 = optEl(qw.answerIdx).classList.contains('breathe');
  const wrong4 = PIC.currentLevel.misses === 2 && PIC.currentLevel.step === 0 &&
    noPulse1 && noPulse2 && pulse2;
  const sayA = playLog.filter(k2 => k2 === 'pic_wrong').length;   // flat2 两错 → 2 条
  startLevel(3);                                 /* flat3（flat≥3，三选）：10s 节流+miss≥2 豁免（试玩 P1②） */
  const qw3 = PIC.quiz;
  const wrongs3 = qw3.options.map((k, i) => i).filter(i => i !== qw3.answerIdx);
  playLog = [];
  await PIC.tapOption(wrongs3[0]);               /* 首错：节流窗外 → 播 */
  await PIC.tapOption(wrongs3[1]);               /* 二错 miss=2 豁免 → 也播（与 breathe 高亮同步） */
  const sayB = playLog.filter(k2 => k2 === 'pic_wrong').length;   // 两错 → 2 条
  startLevel(3);                                 /* 重发同关（新题 miss=1，10s 窗内）→ 节流静默 */
  const qw3b = PIC.quiz;
  const wrongs3b = qw3b.options.map((k, i) => i).filter(i => i !== qw3b.answerIdx);
  await PIC.tapOption(wrongs3b[0]);
  const sayC = playLog.filter(k2 => k2 === 'pic_wrong').length;   // 跨题第三错 → 仍 2 条（静默）
  KIDS.voice.play = origPlay;
  const sayWOk = sayA === 2 && sayB === 2 && sayC === 2 && wrong4;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat2Plays: sayA, flat3Plays: sayB, flat3Cross: sayC, wrong: wrong4 };

  /* ---- ⑤ UI 冒烟 A：flat0 首错零惩罚 + 通关（1 错=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongDone = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = PIC.quiz;
    if (!q) { smokeA = false; break; }
    if (!wrongDone) {                            /* 首题先错一次：灰掉零惩罚，不推进不弹层 */
      const w = q.options.findIndex((k, i) => i !== q.answerIdx);
      const r = await PIC.tapOption(w);
      wrongDone = r === 'wrong' && PIC.currentLevel.step === 0 && PIC.currentLevel.misses === 1;
      if (!wrongDone) smokeA = false;
    }
    const r = await PIC.tapOption(q.answerIdx);
    if (r !== 'right' && r !== 'done') { smokeA = false; break; }
    await wait(60);
    steps++;
  }
  const lvA = PIC.currentLevel;
  const smokeOkA = smokeA && wrongDone && steps === CH_LEN && lvA.done && lvA.won && lvA.misses === 1 &&
    engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongDone: wrongDone, steps: steps, misses: lvA.misses, stars: engStars(cur) };

  /* ---- ⑤ UI 冒烟 B：flat10（章 3 形近辨析）干扰全 sameFam + autoSolve 3 星 ---- */
  total++;
  startLevel(10);
  let nearOk = true, n4Lv = 0;
  for (const q of cur.quizzes) {                 // 全关每题干扰都是目标的同形近族字
    if (!q.distractors.every(k => sameFam(k, q.target))) nearOk = false;
    if (!q.near) nearOk = false;
    if (q.nOpt === 4) n4Lv++;
  }
  const a10 = await PIC.autoSolve();
  const lv10 = PIC.currentLevel;
  const smokeOkB = nearOk && n4Lv >= 1 && cur.dch === 3 && a10.done && lv10.done && lv10.won &&
    lv10.misses === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat10 = { ok: smokeOkB, nearOk: nearOk, n4: n4Lv, taps: a10.taps, stars: engStars(cur) };

  /* ---- ⑤ UI 冒烟 C：flat15（章 4 混合）三题型必现 + autoSolve 3 星 ---- */
  total++;
  startLevel(15);
  const modes15 = {};
  cur.quizzes.forEach(q => { modes15[q.mode] = 1; });
  const mixOk = modes15.toChar && modes15.toPic && modes15.evo && cur.dch === 4;
  const a15 = await PIC.autoSolve();
  const lv15 = PIC.currentLevel;
  const smokeOkC = mixOk && a15.done && lv15.done && lv15.won && lv15.misses === 0 && engStars(cur) === 3;
  if (smokeOkC) npass++;
  smokes.flat15 = { ok: smokeOkC, mix: mixOk, modes: Object.keys(modes15), taps: a15.taps, stars: engStars(cur) };

  /* ---- ⑥ 布局：双 viewport 模拟（800x1180 挂 body.port 通道——坑⑥）× 四章型 ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    const portrait = h > w;
    document.body.classList.toggle('port', portrait);       // 竖屏通道（与 @media portrait 等值段）
    const bad = [];
    document.querySelectorAll('button').forEach(e => {
      if (e.classList.contains('k-parentbtn')) return;                       // core 家长按钮豁免（§0.9）
      const r = e.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
        bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const optRects = Array.prototype.map.call(document.querySelectorAll('.opt'), e => e.getBoundingClientRect());
    const optOk = optRects.length >= 2 && optRects.every(r => r.width >= 96 && r.height >= 96);   // 主答案 ≥96
    const gr = g.getBoundingClientRect();                   // 选项卡落容器内（rect 落 #game）
    const inBox = optRects.every(r => r.left >= gr.left - 1 && r.right <= gr.right + 1 &&
      r.top >= gr.top - 1 && r.bottom <= gr.bottom + 1);
    const optEl0 = document.querySelector('.opt');
    const optW = optEl0 ? Math.round(parseFloat(getComputedStyle(optEl0).width)) : 0;
    /* portStyle 生效断言（body.port 等值段）：竖屏模拟挂 body.port 恒验 118；
       横屏模拟按真视口方向分支——真竖屏页内 @media portrait 仍生效（两段等值 → 同为 118），
       真横屏页（主验 1280×800）验 132 横屏值 */
    const realPortrait = window.innerHeight > window.innerWidth;
    const portOk = portrait ? optW === 118 : (realPortrait ? optW === 118 : optW === 132);
    const svgRects = Array.prototype.map.call(document.querySelectorAll('.opt .pic'), e => e.getBoundingClientRect());
    const svgOk = svgRects.length === 0 || svgRects.every(r => r.width >= 64 && r.height >= 64);  // 象形图 ≥64
    const promptSvgR = document.querySelector('#prompt-card .pic');
    const svgP = promptSvgR ? promptSvgR.getBoundingClientRect() : { width: 100 };
    const pr = $id('prompt-card').getBoundingClientRect();
    const promptOk = pr.width >= 140 && pr.height >= 140 && svgP.width >= 64;                     // 题面卡+题面象形图
    const zi = document.querySelector('.opt .zi');
    const fontOk = !zi || parseFloat(getComputedStyle(zi).fontSize) >= 80;                         // 汉字卡大字 ≥80px（§0.19）
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, nOpt: optRects.length, optOk: optOk, svgOk: svgOk, promptOk: promptOk,
      fontOk: fontOk, inBox: inBox, optW: optW, portOk: portOk, bad: bad, ox: ox,
      pass: optOk && svgOk && promptOk && fontOk && inBox && portOk && bad.length === 0 && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [2, 7, 10, 15]) {            // 章1 三选字卡 / 章2 图卡 / 章3 四选 / 章4 evo
    startLevel(flat);
    if (flat === 10) {                           // 章 3 模拟推进到首个 4 选题（步 0 目标 fam=2 是 3 选）
      cur.step = cur.quizzes.findIndex(x => x.nOpt === 4);
      renderQuiz();
    }
    if (flat === 15) {                           // 章 4 模拟推进到 evo 题（步 0 是图→字）——竖屏 evo 布局实测
      cur.step = cur.quizzes.findIndex(x => x.mode === 'evo');
      renderQuiz();
    }
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  document.body.classList.remove('port');
  startLevel(0);                                 // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass) &&
    sims.some(s => s.nOpt === 4);                // 四选布局实摆过（恒 3-4 的高位端）
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑦ 字库+形近族+推演+时长+契约（r12 delta 单元；SPEC 独立副本，禁引实现互证） ---- */
  total++;
  /* 40 键定稿序独立副本（前 20=b8 v1 序零改动，后 20=r12 追加序） */
  const SPEC_KEYS = ['ri', 'yue', 'shan', 'shui', 'huo', 'mu', 'ren', 'kou', 'tian', 'niao', 'ma',
    'yu', 'yu2', 'yun', 'men', 'shi', 'mu2', 'he2', 'zhu', 'zhou',
    'wu', 'wei', 'mo', 'ben', 'bai', 'tian2', 'da', 'tai', 'dao', 'li',
    'san', 'chuan', 'wang', 'yu3', 'xiao', 'shao', 'shou', 'mao', 'jia', 'you'];
  const keysOk = PICTO.length === 40 && PICTO_KEYS.join() === SPEC_KEYS.join() &&
    new Set(PICTO_KEYS).size === 40 &&
    PICTO.every(e => e.ch && e.wd && e.svg && picW(e.k) === e.ch + '，' + e.wd + '的' + e.ch);
  /* NEAR 19 对独立副本（旧 5+新 14；AUDIT-67:62 点名未/末、鸟/乌）；新对（涉 r12 字）≥6 实锤 */
  const SPEC_PAIRS = [['ri', 'mu2'], ['ri', 'tian'], ['kou', 'tian'], ['mu', 'he2'], ['niao', 'ma'],
    ['niao', 'wu'], ['wei', 'mo'], ['wei', 'mu'], ['mu', 'ben'], ['ri', 'bai'],
    ['da', 'tian2'], ['da', 'tai'], ['dao', 'li'], ['san', 'chuan'], ['wang', 'yu3'],
    ['xiao', 'shao'], ['shou', 'mao'], ['tian', 'jia'], ['tian', 'you']];
  const NEW_SET = {}; SPEC_KEYS.slice(20).forEach(k => { NEW_SET[k] = 1; });
  const newPairs = SPEC_PAIRS.filter(p => NEW_SET[p[0]] || NEW_SET[p[1]]);
  const pairsOk = SPEC_PAIRS.length === 19 && SPEC_PAIRS.every(p => isNearPair(p[0], p[1])) &&
    newPairs.length >= 6;
  /* 判别力哨兵（坑⑦/⑨）：非对/非同族必须判否——防 sameFam 恒真 */
  const sentinelOk = !isNearPair('yue', 'ri') && !isNearPair('shan', 'huo') &&
    !sameFam('yue', 'ri') && !sameFam('mo', 'he2') &&
    sameFam('mo', 'mu') && sameFam('mu2', 'tian') &&      // dist-2 同族（共伙伴）判是
    !sameFam('ri', 'ri');                                  // 自身恒否
  /* 覆盖独立副本：dch1 两轮=40 全库 / dch2、dch3 各=DEEP 18 / dch4 两轮=18 / evo 两轮=12 */
  const SPEC_DEEP_LEN = 18, SPEC_EVO_LEN = 12;
  const cov = {
    d1: Object.keys(targetsByDch[1]).length, d2: Object.keys(targetsByDch[2]).length,
    d3: Object.keys(targetsByDch[3]).length, d4: Object.keys(targetsByDch[4]).length,
    evo: Object.keys(evoSeen).length };
  const covOk = cov.d1 === 40 && cov.d2 === SPEC_DEEP_LEN && cov.d3 === SPEC_DEEP_LEN &&
    cov.d4 === SPEC_DEEP_LEN && cov.evo === SPEC_EVO_LEN;
  const poolOk = DEEP_KEYS.length === SPEC_DEEP_LEN && EVO_KEYS.length === SPEC_EVO_LEN &&
    DEEP_KEYS.every(k => famOf(k).length >= 2) &&
    EVO_KEYS.every(k => !!PIC_BY[k].ev && PIC_BY[k].ev !== PIC_BY[k].svg);
  /* 46 条 clip（5 指令+pic_q3+40 组词）全部内嵌 */
  const needClips = ['pic_tut_watch', 'pic_tut_turn', 'pic_hint', 'pic_q1', 'pic_q2', 'pic_q3']
    .concat(PICTO_KEYS.map(k => 'pic_ch_' + k));
  const clipsOk = needClips.length === 46 &&
    needClips.every(k => !!(KIDS.voice.clips && KIDS.voice.clips[k]));
  /* estMs 家族定版独立副本（禁 +300 变体——与源模型对账在 ① 已做） */
  const vEstMs = n => n * 345 + 600;
  const estOk = estMs(1) === 945 && estMs(15) === 5775 && vEstMs(14) === estMs(14) &&
    estMs.toString().indexOf('345') >= 0 && estMs.toString().indexOf('+ 300') < 0;
  /* nextHint 章末逐点独立副本（SPEC §2-r12 文案重列，禁引 CHAPTERS/GEN_HINTS 互证）；
     哨兵=nextHint(4) 不得等于 ch3 预告（off-by-one 回归哨兵） */
  const SPEC_HINT = { 4: '反过来啦，看汉字找出它古时候的画',
                      9: '小心长得像的字，火眼金睛分清它们',
                      14: '字的演变小剧场来啦，猜猜画变成了什么字' };
  const hintOk = Object.keys(SPEC_HINT).every(f => nextHint(+f) === SPEC_HINT[f]) &&
    nextHint(19) === '新一轮看图猜字挑战' &&      /* flat19→生成关 flat20=ch5 dch1 */
    nextHint(29) === '形近字火眼金睛';             /* flat29→生成关 flat30=ch7 dch3（实算路径） */
  const hintNeg = nextHint(4) !== SPEC_HINT[9];
  /* 时长模型报数（① 已对账+硬断言；此处报最小值供 selftest 复核） */
  let durMin = Infinity;
  for (let flat = 0; flat < 40; flat++) {
    const d = levelDurMs(genLevel(flat));
    if (d < durMin) durMin = d;
  }
  const deltaOk = keysOk && pairsOk && sentinelOk && covOk && poolOk && clipsOk && estOk &&
    hintOk && hintNeg && n4 >= 5 && durMin >= V_MIN_MS;
  if (deltaOk) npass++;
  units.delta = { ok: deltaOk, keys40: keysOk, pairs: pairsOk, newPairs: newPairs.length,
    sentinel: sentinelOk, coverage: covOk, cov: cov, pools: poolOk, clips46: clipsOk,
    estMs: estOk, hint: hintOk, hintNeg: hintNeg, n4Levels: n4, durMin: durMin };

  /* ---- ⑧ 教学/演出吞输入单元：demo+locked 门拦真实与钩子输入 ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;        // 模拟教学"看"演示期（locked 吞输入）
  const swallow1 = (await PIC.tapOption(0)) === false;
  state.demo = false; state.locked = true;       // 演出窗口（locked）
  const swallow2 = (await PIC.tapOption(0)) === false;
  state.locked = false;                          // 还原
  const swallowOk = swallow1 && swallow2 && PIC.currentLevel.step === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  const out = { game: 'picto', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

/* ---------- r12 时长模型独立副本（SPEC §2-r12 常量自列，禁引实现互证；① 与源 levelDurMs 对账） ---------- */
const V_EST = n => n * 345 + 600;
const V_LOOK = { m1: 4800, m2: 6200, m3: 6800, m4: 6200, evo: 8400 };
const V_MOTOR = 800, V_RIGHT = 1900, V_MIN_MS = 40000;
const V_QTEXT = { toChar: '看一看，古时候的画是哪个字呀', toPic: '看一看，哪个是它古时候的画',
                  evo: '看一看，它一步一步变成了什么字' };
function vDur(q, dch) {
  const look = q.mode === 'evo' ? V_LOOK.evo
    : dch === 1 ? V_LOOK.m1 : dch === 2 ? V_LOOK.m2 : dch === 3 ? V_LOOK.m3 : V_LOOK.m4;
  return V_EST(V_QTEXT[q.mode].length) + look + V_MOTOR + V_RIGHT;
}
const vLevelDur = L => L.quizzes.reduce((s, q) => s + vDur(q, L.dch), 0);

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  runVerify();
}
