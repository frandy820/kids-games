/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章规则（SPEC-R32 §R2/§R3：dch1 pic2word 恒 3 选 / dch2 sound2pic lv0 两选 lv1-4 三选 /
     dch3 qi0-1-3 pic2word 形近 3 选+qi2/4 blank / dch4 qi0-1 word2pic+qi2 blank+qi3-4 混合 3 选）/
     structOk（options 含判定真值且互异；图题选项全在词库；blank 全律）/ 相邻题 target 不同 /
     blank 专项（词长 ≥4/缺位非首/pick=词缺位字母/3 字母卡互异含 pick/干扰字母 ^[a-z]$ 互异≠pick
     ——NEAR→词内→高频池三级取序本身不可断言，r32 审查 minor4 收窄口径）/
     引擎直驱通关（每题点正确卡 right→末题 done→0 错 3 星——blank 点 pick 字母卡）
   ② 词库覆盖（r32 联动）：40 关 target 并集 ⊇ 全部 48 词；章 3 十二个形近基词全覆盖
   ③ 形近干扰专项：干扰卡 ∈12 形近值且 ∉48 词库（≠库内词）
   ④ 点选单元（flat0 3 选，r32 升级）：首错零惩罚不 pulse / 已灰 pe:none+再点 again /
     二错 pulse 正确卡 / 点对推进换题
   ⑤ sayW 节流：flat<3 每错必播 / flat≥3 10s 一条
   ⑥ 听音题开题自动播 en clip（stub 计数 parts[0]=wen_w_<target>）+ replay() 重播
   ⑦ 卡文本与引擎严格同源（DOM 文本==options 零手抄：词卡/图卡/字母卡三分支）
   ⑧ 教学/演出吞输入单元：demo+locked 门拦真实与钩子输入
   ⑨ 布局：双 viewport（模拟 1280×800 / 800×1180）× 四章代表关 + blank 题（flat10 qi2）：
     选项/题面按钮 ≥96、SVG 热区 ≥64、底栏按钮 ≥64、overflowX ≤0
   ⑩ UI 冒烟：flat0 首错零惩罚+通关（1 错=2 星）；flat15（章 4 混合+blank）autoSolve 3 星
   ⑪ blank 专项（r32 新增）：点错字母灰零惩罚不推进 / 点对 gap 填入 DOM==pick+词完整==target+
     播整词 en（stub 计数 wen_w_<target>）+推进
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const targetHist = {};
  const confValsAll = Object.keys(CONFUSE).map(k2 => CONFUSE[k2]);

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let ruleOk = true, structAll = true, adjOk = true, dchOk = true, driveOk = true;
    if (L1.ch !== Math.floor(flat / CH_LEN) + 1 || L1.dch !== (L1.ch - 1) % 4 + 1) dchOk = false;
    let w2p = 0, blankN = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q)) structAll = false;
      targetHist[q.target] = (targetHist[q.target] || 0) + 1;
      if (L1.dch === 1) {                                    // 章 1（r32）：图→词 恒 3 选
        if (q.mode !== 'pic2word' || q.options.length !== 3) ruleOk = false;
        if (q.options.some(w => !WORDS[w])) ruleOk = false;  // 词卡全在库
      } else if (L1.dch === 2) {                             // 章 2（r32）：听音→图 lv0=2/lv1-4=3
        if (q.mode !== 'sound2pic') ruleOk = false;
        const want = L1.lv === 0 ? 2 : 3;
        if (q.options.length !== want) ruleOk = false;
        if (q.options.some(w => !WORDS[w])) ruleOk = false;  // 图选项全在库（有 SVG）
      } else if (L1.dch === 3) {                             // 章 3（r32）：qi2/4=blank，qi0/1/3=形近 3 选
        if (k === 2 || k === 4) {
          if (q.mode !== 'blank') ruleOk = false;
          blankN++;
          if (CONFUSE_KEYS.indexOf(q.target) < 0) ruleOk = false;   // blank target 也 ∈形近基词牌库
        } else {
          if (q.mode !== 'pic2word' || q.options.length !== 3) ruleOk = false;
          if (CONFUSE_KEYS.indexOf(q.target) < 0) ruleOk = false;   // target=形近基词
          const outside = q.options.filter(w => !WORDS[w]);
          if (outside.length !== 1 || confValsAll.indexOf(outside[0]) < 0) ruleOk = false;
          if (outside[0] !== CONFUSE[q.target]) ruleOk = false;     // 恰为该词的形近对
          if (q.options.filter(w => WORDS[w] && w !== q.target).length !== 1) ruleOk = false;
        }
      } else {                                               // 章 4（r32）：qi0-1 word2pic+qi2 blank+qi3-4 混合，3 选
        if (k <= 1 && q.mode !== 'word2pic') ruleOk = false;
        if (k === 2 && q.mode !== 'blank') ruleOk = false;
        if (k >= 3 && ['pic2word', 'sound2pic', 'word2pic'].indexOf(q.mode) < 0) ruleOk = false;
        if (q.mode === 'word2pic') w2p++;
        if (q.mode === 'blank') blankN++;
        if (q.mode !== 'blank' && q.options.some(w => !WORDS[w])) ruleOk = false;  // 图/词选项全在库
      }
      if (k > 0 && L1.quizzes[k - 1].target === q.target) adjOk = false;   // 相邻题不同词
    }
    if (L1.dch === 3 && blankN !== 2) ruleOk = false;         // 章 3 blank 恰 2（qi2/4 固定谱）
    if (L1.dch === 4 && blankN !== 1) ruleOk = false;         // 章 4 blank 恰 1（qi2 固定谱）
    if (L1.dch === 4 && w2p < 2) ruleOk = false;              // 章 4 认读题保底 2 道
    /* 引擎直驱：每题点正确卡（末题 done；blank=点 pick 字母卡）→ 0 错 3 星 */
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      const r = engTap(L1, correctIdx(q));
      const want = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (r !== want) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && adjOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, structAll: structAll,
      adjOk: adjOk, dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll,
      qs: L1.quizzes.map(q => q.mode + ':' + q.target + (q.mode === 'blank' ? '[' + q.pick + '@' + q.blankPos + ']' : '') + '(' + q.options.join('|') + ')') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 48 词库覆盖 40 关（r32 联动 SPEC §R1） ---- */
  total++;
  const coverOk = WORD_KEYS.every(w => targetHist[w] >= 1) &&
    CONFUSE_KEYS.every(w => targetHist[w] >= 1);             // 章 3 基词（含 blank 题 target）经 ch3 牌库保障
  if (coverOk) npass++;
  units.cover = { ok: coverOk, nWords: WORD_KEYS.length, hist: targetHist };

  /* ---- ③ 形近干扰专项（r32：12 组）：干扰卡 ≠库内词（并入 ① dch3 规则，此处全量复核） ---- */
  total++;
  let confuseOk = true;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    for (const q of L.quizzes) {
      if (q.mode !== 'pic2word') continue;                   // blank 题无干扰卡
      const outside = q.options.filter(w => !WORDS[w]);
      if (outside.length !== 1 || confValsAll.indexOf(outside[0]) < 0) confuseOk = false;
      if (WORDS[q.target] && q.options.indexOf(CONFUSE[q.target]) < 0) confuseOk = false;
    }
  }
  if (confuseOk) npass++;
  units.confuse = { ok: confuseOk, values: confValsAll };

  /* ---- ④ 点选单元（r32：flat0 恒 3 选——一错/again/二错 pulse/点对推进全在本关测） ---- */
  total++;
  startLevel(0);
  const q0 = WEN.quiz;
  const wrongs0 = q0.options.map((w, i) => ({ w: w, i: i })).filter(o => o.w !== q0.target);
  const tIdx = q0.options.indexOf(q0.target);
  const noPulse1 = !(optEl(tIdx) && optEl(tIdx).classList.contains('pulse'));
  const r1 = await WEN.tapOption(wrongs0[0].i);              // 首错：灰掉零惩罚
  await wait(80);
  const greyEl = optEl(wrongs0[0].i);
  const peNone = getComputedStyle(greyEl).pointerEvents === 'none';
  const missState = WEN.currentLevel.retries === 1 && WEN.currentLevel.step === 0;
  const r2 = await WEN.tapOption(wrongs0[0].i);              // 再点已灰卡：'again' 零惩罚
  const againOk = r2 === 'again' && WEN.currentLevel.retries === 1 && WEN.currentLevel.step === 0;
  const noPulse2 = !(optEl(tIdx) && optEl(tIdx).classList.contains('pulse'));  // 一错后仍不 pulse
  await WEN.tapOption(wrongs0[1].i);                         // 二错（3 选第二张错卡）：正确卡 pulse
  const pulse2 = !!(optEl(tIdx) && optEl(tIdx).classList.contains('pulse'));
  const r3 = await WEN.tapOption(tIdx);                      // 点对：推进换题（仍在 flat0）
  await wait(200);                                            // 推进演出窗（SPEED 提速）
  const advOk = r3 === 'right' && WEN.currentLevel.step === 1 && WEN.quiz && WEN.quiz.step === 1;
  const tapOk = noPulse1 && r1 === 'wrong' && peNone && missState && againOk && noPulse2 &&
    pulse2 && advOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, wrong: r1, peNone: peNone, again: r2, pulse2: pulse2, advance: advOk };

  /* ---- ⑤ sayW 节流：flat<3 每错必播 / flat≥3 10s 一条 ---- */
  total++;
  let playLog = [];
  const origPlay = KIDS.voice.play;
  KIDS.voice.play = function (key) { playLog.push(key); };
  startLevel(0);                                             // flat0：每错必播
  let qw = WEN.quiz;
  let wi = qw.options.findIndex(w => w !== qw.target);
  await WEN.tapOption(wi);                                   // 首错已灰 → 需换关重测
  startLevel(0);
  qw = WEN.quiz;
  wi = qw.options.findIndex(w => w !== qw.target);
  playLog = [];
  await WEN.tapOption(wi);
  await WEN.tapOption(wi);                                   // 已灰卡=again 不播
  const sayA = playLog.filter(k => k === 'wen_wrong').length;    // flat0 一错 → 1 条
  lastWrongVoice = 0;                                        /* 隔离 ④ 单元 flat10 错点的时间戳污染 */
  startLevel(3);                                             // flat3：10s 节流
  const qw3 = WEN.quiz;
  const wi3 = qw3.options.findIndex(w => w !== qw3.target);
  playLog = [];
  const rw1 = await WEN.tapOption(wi3);
  startLevel(3);                                             // 重发同关（首卡未灰）
  const qw3b = WEN.quiz;
  const wi3b = qw3b.options.findIndex(w => w !== qw3b.target && !qw3b.dead[qw3b.options.indexOf(w)]);
  const rw2 = await WEN.tapOption(wi3b);
  const sayB = playLog.filter(k => k === 'wen_wrong').length;    // flat3 两错 → 1 条
  KIDS.voice.play = origPlay;
  const sayWOk = sayA === 1 && sayB === 1 && rw1 === 'wrong' && rw2 === 'wrong';
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Plays: sayB };

  /* ---- ⑥ 听音题开题自动播 en clip（stub 计数）+ replay() 重播 ---- */
  total++;
  const qLog = [];
  const origQueue = KIDS.voice.queue;
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(key); };
  startLevel(5);                                             // dch2 lv0（sound2pic 2 选）
  let q5 = WEN.quiz;
  /* 开场顺序链（审查 M1 修复后形态）：queue([wen_hint, wen_w_<target>, wen_q2])——hint 不切断 en 发音 */
  let auto1 = qLog.length === 1 && qLog[0][0] === 'wen_hint' &&
              qLog[0][1] === 'wen_w_' + q5.target && qLog[0][2] === 'wen_q2';
  const rep1 = WEN.replay() === true;                        // 测试钩子：无视节流直通
  startLevel(7);                                             // dch2 lv2（3 选）
  const q7 = WEN.quiz;
  /* 开场链 [wen_hint, wen_w_*, wen_q2] 单词在第 1 位；replay 旧形态 ['wen_w_*', q2] 在第 0 位——全元素包含两形态通吃 */
  const auto2 = qLog.some(p => p.indexOf('wen_w_' + q7.target) >= 0) && q7.options.length === 3;
  KIDS.voice.queue = origQueue;
  KIDS.voice.play = origPlay;
  const autoOk = auto1 && auto2 && rep1 && q5.mode === 'sound2pic';
  if (autoOk) npass++;
  units.autoplay = { ok: autoOk, open: qLog.length, first: qLog[0] || null };

  /* ---- ⑦ 卡文本与引擎严格同源（DOM 文本==引擎 options，零手抄；r32 三分支：词卡/图卡/字母卡） ---- */
  total++;
  let domOk = true;
  for (const flat of [0, 10]) {
    startLevel(flat);
    for (let s = 0; s < 4; s++) {                            // 抽查每关前四题（flat10 含 qi2 blank）
      const q = WEN.quiz;
      if (!q) break;
      const cards = optsEl.querySelectorAll('.opt');
      if (cards.length !== q.options.length) domOk = false;
      cards.forEach((c, i) => {
        if (c.textContent !== q.options[i]) domOk = false;   // DOM 文本严格同源
      });
      if (q.mode === 'pic2word') {
        cards.forEach(c => { if (c.querySelector('.word') === null) domOk = false; });
      }
      if (q.mode === 'blank') {                              // r32：字母卡 .letter 且题面 gap 在场
        cards.forEach(c => { if (c.querySelector('.letter') === null) domOk = false; });
        if (!qCardEl.querySelector('.gapword .gap')) domOk = false;
      }
      if (s === 3) break;
      await WEN.tapOption(correctIdx(q));                    // 推进（blank=点 pick 字母卡）
      await wait(150);
    }
  }
  const lowerOk = WORD_KEYS.every(w => w === w.toLowerCase());         // 词库全小写（教材惯例）
  const lenOk = WORD_KEYS.length === 48;                               // r32 词库 48 联动断言
  if (domOk && lowerOk && lenOk) npass++;
  units.domText = { ok: domOk && lowerOk && lenOk, domOk: domOk, lowerOk: lowerOk, lenOk: lenOk };

  /* ---- ⑧ 教学/演出吞输入单元：demo+locked 门拦真实与钩子输入 ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期（locked 吞输入）
  const swallow1 = (await WEN.tapOption(0)) === false;
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await WEN.tapOption(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && WEN.currentLevel.step === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑨ 布局：双 viewport 模拟 × 四章代表关 ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();
    const de = document.documentElement;
    const bad = [];
    document.querySelectorAll('button').forEach(e => {
      if (e.classList.contains('k-parentbtn')) return;       // core 家长按钮豁免（§0.9）
      const r = e.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
        bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const mainBad = [];
    document.querySelectorAll('#q-card, .opt').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width < 96 || r.height < 96)
        mainBad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const svgs = Array.prototype.map.call(document.querySelectorAll('#q-card svg, .opt svg'),
      s => { const r = s.getBoundingClientRect(); return { w: r.width, h: r.height }; });
    const svgOk = svgs.length > 0 && svgs.every(a => a.w >= 64 && a.h >= 64);
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, bad: bad, mainBad: mainBad, svgOk: svgOk, ox: ox,
      pass: !bad.length && !mainBad.length && svgOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [5, 7, 10, 15]) {                       // 四章代表关（含 3 图选/3 词选/认读）
    startLevel(flat);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  /* r32 blank 布局面：flat10 推进 2 题至 qi2（blank 固定位）双视口模拟 */
  startLevel(10);
  for (let s = 0; s < 2; s++) {
    await WEN.tapOption(correctIdx(cur.quizzes[s]));
    await wait(150);
  }
  sims.push(Object.assign(simView(1280, 800), { vpTag: 'blank' }));
  sims.push(Object.assign(simView(800, 1180), { vpTag: 'blank' }));
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                             // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑩ UI 冒烟 A：flat0 首错零惩罚 + 通关（1 错=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongDone = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = WEN.quiz;
    if (!q) { smokeA = false; break; }
    if (!wrongDone) {                                        // 首题先错一次：灰掉零惩罚不推进
      const w = q.options.findIndex(o => o !== q.target);
      const r = await WEN.tapOption(w);
      wrongDone = r === 'wrong' && WEN.currentLevel.step === 0 && WEN.currentLevel.retries === 1;
      if (!wrongDone) smokeA = false;
    }
    const q2 = WEN.quiz;
    const r = await WEN.tapOption(q2.options.indexOf(q2.target));
    if (r !== 'right' && r !== 'done') { smokeA = false; break; }
    await wait(150);
    steps++;
  }
  const lvA = WEN.currentLevel;
  const smokeOkA = smokeA && wrongDone && steps === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongDone: wrongDone, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 B：flat15（章 4 混合+blank qi2）autoSolve UI 通路通关 3 星 ---- */
  total++;
  startLevel(15);
  const q15s = cur.quizzes;
  const w2p15 = q15s.filter(q => q.mode === 'word2pic').length;
  const blank15 = q15s.filter(q => q.mode === 'blank').length;
  const a15 = await WEN.autoSolve();
  const lv15 = WEN.currentLevel;
  const smokeOkB = w2p15 >= 2 && blank15 === 1 && a15.done && lv15.done && lv15.won &&
    lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, w2p: w2p15, blank: blank15, taps: a15.taps, stars: engStars(cur) };

  /* ---- ⑪ blank 专项（r32 新增）：点错字母灰零惩罚不推进 / 点对 gap 填入+词完整+播整词 en ---- */
  total++;
  window.__blankFill = null;                                 // 清锚（⑦/⑨ 段曾推进 flat10 blank 题——防旧值假绿，坏代码必红）
  startLevel(10);
  for (let s = 0; s < 2; s++) {                              // 推进至 qi2=blank（固定谱）
    await WEN.tapOption(correctIdx(cur.quizzes[s]));
    await wait(150);
  }
  const qb = WEN.quiz;
  const blankStruct = qb && qb.mode === 'blank' && qb.pick && qb.blankPos >= 1 &&
    qb.target[qb.blankPos] === qb.pick && qb.options.length === 3 &&
    qb.options.indexOf(qb.pick) >= 0;
  const bi = qb.options.indexOf(qb.pick);
  const bw = qb.options.findIndex((c, k) => k !== bi);       // 点错字母（首张非 pick 卡）
  const bwR = await WEN.tapOption(bw);
  await wait(80);
  const bwEl = optEl(bw);
  const wrongOk = bwR === 'wrong' && bwEl.classList.contains('wrong') &&
    getComputedStyle(bwEl).pointerEvents === 'none' &&
    WEN.currentLevel.step === 2 && WEN.currentLevel.retries === 1 &&    // 不推进+计一次错
    qCardEl.querySelector('.gap').textContent === '_';                  // 缺位未被污染
  const plog = [];
  const origP2 = KIDS.voice.play;
  KIDS.voice.play = function (key) { plog.push(key); };
  const bR = await WEN.tapOption(bi);                        // 点对字母卡（走真实 uiPick）
  KIDS.voice.play = origP2;
  await wait(120);
  /* 填入取证走 __blankFill 运行锚（uiPick 演出窗后 renderQuiz 已重建题面，DOM 态不可事后查——
     r30 __dualJumpN 同范式；锚记录 pick+word=「字母填入+词完整」动作证据） */
  const bf = window.__blankFill;
  const fillOk = !!bf && bf.pick === qb.pick && bf.word === qb.target && bf.n >= 1;
  const voiceOk = plog.indexOf('wen_w_' + qb.target) >= 0;   // 补全后播整词 en（r32 §R1 闭环）
  const advB = bR === 'right' && WEN.currentLevel.step === 3;
  const blankOk = blankStruct && wrongOk && fillOk && voiceOk && advB;
  if (blankOk) npass++;
  units.blank = { ok: blankOk, struct: blankStruct, wrongOk: wrongOk, fillOk: fillOk,
    voiceOk: voiceOk, advance: advB,
    q: { mode: qb.mode, target: qb.target, pick: qb.pick, blankPos: qb.blankPos, options: qb.options.slice() } };

  const out = { game: 'worden', total: total, pass: npass, layoutOk: layoutOk,
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
