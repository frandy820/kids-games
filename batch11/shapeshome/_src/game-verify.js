/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性 / 章题型（dch1 tri / dch2 neg / dch3 grid /
     dch4 混排 [tri,neg,grid,tri,neg]）/ 干扰恰差一维·恰违反一条件·恰对一规则（首题热身=全违反档）/
     ch4 hard 参数（tri 色维=near / neg 目标色=near(nc) / grid 列恰一近似对）/ ch2·ch3 无近似陷阱 /
     structOk（互异·恰一 match·answerIdx 有效·行形列色互异域）/ 相邻题目标不同 / 引擎直驱 0 错 3 星
   ② 覆盖：tri 目标 6 色×4 形×2 大小 / neg 禁色禁形全现 / grid 行形列色全现+缺格 9 位全现 /
     dch1-4 各 5 关 / 生成关四 dch 全现 / answerIdx 三位置 / 三题型各 ≥30 题
   ③ 点选单元：首错灰掉 pe:none + 再点 'again' + 首错不 pulse / 二错 pulse / 灰化封顶后点对推进
   ④ sayW 三态：flat<3 每错必播 / flat≥3 10s 节流 / miss≥2 豁免
   ⑤ 教学链（stub 档案直驱 tutorialWatch）：演示→tutSeen 写档→重发 step=0→help→turn→题面接力
   ⑥ clipOk：r8 新键（shp_q3_ 系列、shp_nq_ 系列、shp_gq、规则句 3）+ 既有键不丢 + core 3 条
   ⑦ 开场链（r8 改 queue 接力）：[shp_hint → 章首规则句 → 题面 clip] 顺序 + flat2 无规则句 + replay() 直通
   ⑧ 时长硬断言（r8 ≥40s/关 modeled）：estMs 家族字面验算 + 40 关 min modeled ≥40000 +
     题句独立副本逐字符对账（modeled=Σ estMs(题句)+DECIDE{tri4200,neg5600,grid7000}+980）
   ⑨ nextHint 章末逐点独立副本断言：静态章末（含 f=19）=CHAPTERS[floor(f/5)+1] 副本 + off-by-one
     哨兵 + 生成段契约 F 逐点=GEN 副本[genLevel(f+1).dch-1]（禁 (ci+1)%4 字面）
   ⑩ 吞输入轻反馈（§0.22）：locked 期真实 pointerdown 卡 → sfx('pop') + 状态不变
   ⑪ 布局：双 viewport（1280×800 / 800×1180）× 五代表关（flat0 tri/5 neg/10 grid/15 mix/20 生成）：
     卡 ≥96、按钮 ≥64（.k-parentbtn 豁免）、卡图形 SVG ≥64、neg 徽章 ×2、grid 9 格+缺格 ≥64、overflowX ≤0
   ⑫ UI 冒烟：A flat0 首错零惩罚+通关 2 星；B flat10 grid 热身+恰对一规则+autoSolve 3 星；
     C flat15 混排 kind 循环逐题验证+autoSolve 3 星
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const tcHist = {}, tsHist = {}, tzHist = {}, ncHist = {}, nsHist = {};
  const rowHist = {}, colHist = {}, missHist = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  const dchHist = {}, idxDist = [0, 0, 0], kindTotals = { tri: 0, neg: 0, grid: 0 };
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0 };
  COLOR_KEYS.forEach(c => { tcHist[c] = 0; ncHist[c] = 0; colHist[c] = 0; });
  SHAPE_KEYS.forEach(s => { tsHist[s] = 0; nsHist[s] = 0; rowHist[s] = 0; });
  SIZE_KEYS.forEach(z => { tzHist[z] = 0; });

  /* ---- 独立副本（SPEC 文字重列，禁引引擎常量互证）---- */
  const CNAME = { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色', orange: '橙色', purple: '紫色' };
  const SNAME = { circle: '圆形', square: '方形', triangle: '三角形', star: '五角星' };
  const ZNAME = { big: '大', small: '小' };
  const speechV = q => q.kind === 'tri' ? '找一找，' + CNAME[q.tc] + '的' + ZNAME[q.tz] + SNAME[q.ts]
    : q.kind === 'neg' ? '找一找，不是' + CNAME[q.nc] + '、也不是' + SNAME[q.ns] + '的'
    : '看一看，每行形状一样，每列颜色一样，问号是哪一个';
  const HINT_COPY = {
    2: '接下来要反过来找啦，不是红色也不是圆形的，才是答案哦',
    3: '接下来要看规律啦，每一行形状一样，每一列颜色一样，找问号',
    4: '接下来什么题都有，还有很像的颜色，要看仔细哦',
    5: '新一轮形状分家的挑战'
  };
  const GEN_COPY = ['颜色形状大小都要一样的新一轮', '反着找不是它的新一轮',
    '看规律找问号的新一轮', '大混战什么都有的新一轮'];
  const MIX_COPY = ['tri', 'neg', 'grid', 'tri', 'neg'];

  /* 干扰卡下标（非答案的两张） */
  const wrongsOf = q => [0, 1, 2].filter(i => i !== q.answerIdx);

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let ruleOk = true, structAll = true, adjOk = true, dchOk = true, driveOk = true;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    dchOk = chOk && (flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
      : (L1.dch >= 1 && L1.dch <= 4));                       // 生成关随机章参数（姊妹款同口径）
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    let prevKey = null;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q, L1.dch, k)) structAll = false;
      idxDist[q.answerIdx]++;
      kindTotals[q.kind]++;
      const W = wrongsOf(q);
      const hard4 = L1.dch === 4 && k > 0;                   // ch4 首题=标准（热身），第 2 题起 hard
      const warm = k === 0 && L1.dch !== 4;                  // ch1/2/3 与生成关首题热身
      if (q.kind === 'tri') {                                // 三维：干扰恰差一维（热身 ≥2 维）
        const dims = i => { const o = q.options[i]; let d = 0;
          if (o.c !== q.tc) d++; if (o.s !== q.ts) d++; if (o.z !== q.tz) d++; return d; };
        if (warm) { if (!W.every(i => dims(i) >= 2)) ruleOk = false; }
        else {
          if (!W.every(i => dims(i) === 1)) ruleOk = false;   // 近干扰：恰差一维
          if (W.filter(i => q.options[i].z !== q.tz).length !== 1) ruleOk = false;   // 恰一翻大小
          const colW = W.filter(i => q.options[i].c !== q.tc);
          if (hard4) { if (colW.length !== 1 || !isNearPair(q.options[colW[0]].c, q.tc)) ruleOk = false; }   // hard：色维=近似
          else if (colW.some(i => isNearPair(q.options[i].c, q.tc))) ruleOk = false;                        // ch1：色维非近似
        }
        tcHist[q.tc]++; tsHist[q.ts]++; tzHist[q.tz]++;
      } else if (q.kind === 'neg') {                         // 否定：唯一满足项 + 干扰恰违反一条件
        const sat = i => q.options[i].c !== q.nc && q.options[i].s !== q.ns;
        if (q.options.filter((o, i) => sat(i)).length !== 1 || !sat(q.answerIdx)) ruleOk = false;
        const violBoth = W.filter(i => q.options[i].c === q.nc && q.options[i].s === q.ns);
        const violCol = W.filter(i => q.options[i].c === q.nc && q.options[i].s !== q.ns);
        const violShape = W.filter(i => q.options[i].c !== q.nc && q.options[i].s === q.ns);
        if (warm) {
          if (violBoth.length !== 1 || violCol.length + violShape.length !== 1) ruleOk = false;   // 一全违反+一单违反
        } else {
          if (violBoth.length !== 0 || violCol.length !== 1 || violShape.length !== 1) ruleOk = false;   // 色侧/形侧各一
        }
        if (hard4) { if (!isNearPair(q.options[q.answerIdx].c, q.nc)) ruleOk = false; }   // hard：目标色=near(禁色)
        else if (q.options.some(o => o.c !== q.nc && isNearPair(o.c, q.nc))) ruleOk = false;   // ch2 无近似陷阱
        ncHist[q.nc]++; nsHist[q.ns]++;
      } else {                                               // 九宫格：行恒形列恒色 + 干扰恰对一规则
        let nearPairs = 0;
        for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) if (isNearPair(q.cols[a], q.cols[b])) nearPairs++;
        if (hard4) { if (nearPairs !== 1) ruleOk = false; }   // hard：列恰含一组近似对
        else if (nearPairs !== 0) ruleOk = false;             // ch3/gen-dch3：列色两两非近似
        const rightC = i => q.options[i].c === q.cols[q.miss.c];
        const rightS = i => q.options[i].s === q.rows[q.miss.r];
        if (!rightC(q.answerIdx) || !rightS(q.answerIdx)) ruleOk = false;
        if (warm) {
          if (!W.every(i => !rightC(i) && !rightS(i))) ruleOk = false;   // 热身：双规则全违反
        } else {
          const rc = W.filter(i => rightC(i) && !rightS(i));
          const rs = W.filter(i => !rightC(i) && rightS(i));
          if (rc.length !== 1 || rs.length !== 1) ruleOk = false;       // 各恰对一规则
        }
        q.rows.forEach(s => { rowHist[s]++; });
        q.cols.forEach(c => { colHist[c]++; });
        missHist[q.miss.r * 3 + q.miss.c]++;
      }
      if (L1.dch === 4 && q.kind !== MIX_COPY[k]) ruleOk = false;   // ch4 混排题序
      const keyNow = q.kind === 'tri' ? q.tc : q.kind === 'neg' ? q.nc   // 相邻题目标不同
        : q.rows.join() + '|' + q.cols.join();
      if (k > 0 && prevKey === keyNow) adjOk = false;
      prevKey = keyNow;
    }
    if (flat < STATIC_LEVELS) dchHist[L1.dch] = (dchHist[L1.dch] || 0) + 1;   // 仅静态 20 关（生成关见 genDch）
    /* 引擎直驱：每题送正确卡（末题 done）→ 0 错 3 星 */
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      const r = engTap(L1, q.answerIdx);
      const want = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (r !== want) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && dchOk &&
      adjOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, structAll: structAll,
      dchOk: dchOk, adjOk: adjOk, driveOk: driveOk, solvedAll: solvedAll,
      qs: L1.quizzes.map(q => q.kind + ':' +
        (q.kind === 'tri' ? CNAME[q.tc][0] + ZNAME[q.tz] + SNAME[q.ts][0]
          : q.kind === 'neg' ? '!' + CNAME[q.nc][0] + SNAME[q.ns][0]
          : '#' + q.rows.map(r => SNAME[r][0]).join('') + q.cols.map(c => CNAME[c][0]).join('') + q.miss.r + q.miss.c) +
        '[' + q.options.map(o => CNAME[o.c][0] + SNAME[o.s][0] + (o.z ? ZNAME[o.z] : '')).join('|') + ']' + q.answerIdx) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 覆盖 ---- */
  total++;
  const coverOk = COLOR_KEYS.every(c => tcHist[c] >= 1) && SHAPE_KEYS.every(s => tsHist[s] >= 1) &&
    tzHist.big >= 1 && tzHist.small >= 1 &&
    COLOR_KEYS.every(c => ncHist[c] >= 1) && SHAPE_KEYS.every(s => nsHist[s] >= 1) &&
    SHAPE_KEYS.every(s => rowHist[s] >= 1) && COLOR_KEYS.every(c => colHist[c] >= 1) &&
    missHist.every(v => v >= 1) &&                            // 缺格 9 位置全现（40 关口径）
    [1, 2, 3, 4].every(d => dchHist[d] === 5) &&              // 静态 20 关 dch1-4 各 5（恒定取材）
    genDch[1] >= 1 && genDch[2] >= 1 && genDch[3] >= 1 && genDch[4] >= 1 &&
    idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 &&
    kindTotals.tri >= 30 && kindTotals.neg >= 30 && kindTotals.grid >= 30;
  if (coverOk) npass++;
  units.cover = { ok: coverOk, tc: tcHist, ts: tsHist, tz: tzHist, nc: ncHist, ns: nsHist,
    dch: dchHist, genDch: genDch, idx: idxDist, kinds: kindTotals,
    miss: missHist, rows: rowHist, cols: colHist };

  /* ---- ③ 点选单元：首错灰掉/again/不 pulse → 二错 pulse → 灰化封顶后点对推进 ---- */
  total++;
  startLevel(0);
  const q0 = SP.quiz;
  const t0 = q0.answerIdx;
  const W0 = wrongsOf(q0);
  const noPulse1 = !(cardEl(t0) && cardEl(t0).classList.contains('pulse'));
  const r1 = await SP.tapCard(W0[0]);                       // 首错：灰掉零惩罚
  await wait(80);
  const gEl = cardEl(W0[0]);
  const peNone = getComputedStyle(gEl).pointerEvents === 'none';
  const missState = SP.currentLevel.retries === 1 && SP.currentLevel.step === 0;
  const r2 = await SP.tapCard(W0[0]);                       // 再点已灰卡：'again' 零惩罚
  const againOk = r2 === 'again' && SP.currentLevel.retries === 1 && SP.currentLevel.step === 0;
  const noPulse2 = !(cardEl(t0) && cardEl(t0).classList.contains('pulse'));
  const r3 = await SP.tapCard(W0[1]);                       // 二错（另一干扰）：正确卡 pulse 高亮
  const pulse2 = !!(cardEl(t0) && cardEl(t0).classList.contains('pulse'));
  const deadFull = SP.quiz.dead.filter(Boolean).length === 2;   // 灰化封顶：两干扰全灰（miss=2）
  const r4 = await SP.tapCard(t0);                          // 点对：推进换题
  await wait(200);                                          // 推进演出窗（SPEED 提速）
  const advOk = r4 === 'right' && SP.currentLevel.step === 1 && SP.quiz && SP.quiz.step === 1;
  const badIdx = (await SP.tapCard(99)) === false && (await SP.tapCard(-1)) === false;
  const tapOk = noPulse1 && r1 === 'wrong' && peNone && missState && againOk && noPulse2 &&
    pulse2 && r3 === 'wrong' && deadFull && advOk && badIdx;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, wrong: r1, peNone: peNone, again: r2, pulse2: pulse2,
    deadFull: deadFull, advance: advOk, badIdx: badIdx };

  /* ---- ④ sayW 三态（stub voice.play 记录） ---- */
  total++;
  const origPlay = KIDS.voice.play;
  let playLog = [];
  KIDS.voice.play = function (key) { playLog.push(key); };
  startLevel(0);                                            // flat0（<3）：每错必播
  const qa = SP.quiz;
  const Wa = wrongsOf(qa);
  await SP.tapCard(Wa[0]);
  await SP.tapCard(Wa[1]);                                  // 两干扰各错一次 → 2 条
  const sayA = playLog.filter(k2 => k2.indexOf('shp_wrong') === 0).length;   /* T46：shp_wrong 族键（tri/neg/grid） */
  lastWrongVoice = 0;                                       // 隔离时间戳污染
  playLog = [];                                             // 段间清空（各段独立计数）
  startLevel(3);                                            // flat3（≥3）：10s 节流
  const qb = SP.quiz;
  await SP.tapCard(wrongsOf(qb)[0]);
  startLevel(3);                                            // 重发同关（dead 已清）
  const qc = SP.quiz;
  await SP.tapCard(wrongsOf(qc)[0]);                        // 节流窗口内第二首错 → 拦 1 条
  const sayB = playLog.filter(k2 => k2.indexOf('shp_wrong') === 0).length;
  lastWrongVoice = 0;                                       // 隔离时间戳污染
  playLog = [];
  startLevel(3);                                            // flat3 同题连两错：miss≥2 豁免
  const qd = SP.quiz;
  const Wd = wrongsOf(qd);
  await SP.tapCard(Wd[0]);
  await SP.tapCard(Wd[1]);                                  // 二错 force 播 → 2 条（豁免恰一次语义）
  const sayC = playLog.filter(k2 => k2.indexOf('shp_wrong') === 0).length;
  KIDS.voice.play = origPlay;
  const sayWOk = sayA === 2 && sayB === 1 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0TwoWrong: sayA, flat3ReplayThrottle: sayB, flat3ForceExempt: sayC };

  /* ---- ⑤ 教学链（stub 档案直驱完整 async 链） ---- */
  total++;
  const origSay = KIDS.voice.say, origPlay5 = KIDS.voice.play;
  let sayLog = [], playLog5 = [];
  KIDS.voice.say = function (text) { sayLog.push(text); };
  KIDS.voice.play = function (key) { playLog5.push(String(key)); };
  const fakeSave = { levels: {}, shp: {} };
  const origSave = KIDS._save, origPersist = KIDS.store.persist;
  KIDS._save = () => fakeSave;
  KIDS.store.persist = () => {};
  startLevel(0);                                            // VERIFY 分支 freshTut 不自动教学
  await tutorialWatch();                                    // 看（演示送对+亮灯）→ 重发 → 帮
  await wait(1900 * SPEED + 260);                           // 等 turn→题面接力落地（题面句=晓晓 clip）
  const tutOk = fakeSave.shp.tutSeen === true && state.tut === 'help' &&
    SP.currentLevel.step === 0 && !state.demo && !state.locked &&
    (sayLog.indexOf(quizSpeech(cur.quizzes[0])) >= 0 ||     // 题面在 turn 之后由接力读出（play clip 通道）
     playLog5.indexOf(qKeyOf(cur.quizzes[0])) >= 0);        // （say 通道=缺 clip 兜底，两态任一即过）
  KIDS._save = origSave;
  KIDS.store.persist = origPersist;
  KIDS.voice.say = origSay;
  KIDS.voice.play = origPlay5;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, tutSeen: fakeSave.shp.tutSeen, tut: state.tut, step: SP.currentLevel.step };

  /* ---- ⑥ clips 注入对账（r8 新键在场 + 既有键不丢 + T46 纠错族锚） ---- */
  total++;
  const SP_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest',
    'shp_hint', 'shp_tut_turn', 'shp_tut_watch',
    'shp_q_red_circle', 'shp_q_shape_triangle',           // 既有键不丢（33 键仍注入）
    'shp_q3_red_circle_big', 'shp_q3_blue_star_small', 'shp_q3_yellow_triangle_small',
    'shp_nq_red_circle', 'shp_nq_green_triangle', 'shp_nq_purple_square',
    'shp_gq', 'shp_rule_neg', 'shp_rule_grid', 'shp_rule_mix',
    'shp_wrong_g', 'shp_wrong_tri_red_circle_big', 'shp_wrong_neg_green_triangle'];  /* T46 阶段2 纠错族 73 锚 */
  const clipOk = SP_KEYS.every(k => !!KIDS.voice.clips[k]);
  if (clipOk) npass++;
  units.clips = { ok: clipOk, n: SP_KEYS.length };

  /* ---- ⑦ 开场链（r8=queue 顺序接力）：[hint → 章首规则句 → 题面] + flat2 无规则句 + replay 直通 ---- */
  total++;
  const origQueue = KIDS.voice.queue, origPlay7 = KIDS.voice.play;
  const qLog = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.map(p => typeof p === 'string' ? p : p.key)); };
  KIDS.voice.play = function (key, text) { pLog7.push([key, text]); };
  startLevel(2);                                            // 非章首关 → [hint, 题面]
  const flat2Key = qKeyOf(genLevel(2).quizzes[0]);
  const chain2 = qLog.length === 1 && qLog[0].length === 2 &&
    qLog[0][0] === 'shp_hint' && qLog[0][1] === flat2Key;
  startLevel(5);                                            // 章 2 首关 → [hint, 规则句, 题面]
  const chain5 = qLog.length === 2 && qLog[1].length === 3 &&
    qLog[1][0] === 'shp_hint' && qLog[1][1] === 'shp_rule_neg' && qLog[1][2] === qKeyOf(genLevel(5).quizzes[0]);
  startLevel(10);                                           // 章 3 首关
  const chain10 = qLog.length === 3 && qLog[2].length === 3 &&
    qLog[2][1] === 'shp_rule_grid' && qLog[2][2] === qKeyOf(genLevel(10).quizzes[0]);
  startLevel(15);                                           // 章 4 首关
  const chain15 = qLog.length === 4 && qLog[3].length === 3 &&
    qLog[3][1] === 'shp_rule_mix' && qLog[3][2] === qKeyOf(genLevel(15).quizzes[0]);
  const rep1 = SP.replay() === true;                        // 测试钩子：无视节流直通（play 通道）
  const repOk = rep1 && pLog7.length >= 1 && pLog7[pLog7.length - 1][0] === qKeyOf(cur.quizzes[0]);
  KIDS.voice.queue = origQueue;
  KIDS.voice.play = origPlay7;
  const chainOk = chain2 && chain5 && chain10 && chain15 && repOk;
  if (chainOk) npass++;
  units.chain = { ok: chainOk, queue: qLog, flat2: chain2, rule5: chain5, rule10: chain10, rule15: chain15, replay: repOk };

  /* ---- ⑧ 时长硬断言（r8 ≥40s/关 modeled）+ estMs 家族字面验算 + 题句独立副本对账 ---- */
  total++;
  const estOk = estMs(9) === 9 * 345 + 600 && estMs(9) === 3705 &&
    estMs(0) === 600 && estMs(1) === 945;
  /* 时长模型（保守下界，不含错答重试）：题句窗 estMs(len)（家族 T）+ 题型决策 dwell
     （tri 三维扫描 4200 / neg 抑制+两条件核验 5600 / grid 行列规律追踪 7000）+ 推进演出窗 980 */
  const DECIDE = { tri: 4200, neg: 5600, grid: 7000 }, DONE_MS = 980;
  const modeledMs = L => L.quizzes.reduce((s, q) =>
    s + estMs(speechV(q).length) + DECIDE[q.kind] + DONE_MS, 0);
  const modeledAll = [];
  for (let flat = 0; flat < 40; flat++) modeledAll.push(modeledMs(genLevel(flat)));
  const minMs = Math.min.apply(null, modeledAll);
  let speechOk = true;                            // 题句独立副本 vs 引擎 quizSpeech 逐字符（防漂移）
  for (let flat = 0; flat < 40; flat++) {
    genLevel(flat).quizzes.forEach(q => { if (speechV(q) !== quizSpeech(q)) speechOk = false; });
  }
  const durOk = estOk && minMs >= 40000 && speechOk;
  if (durOk) npass++;
  units.duration = { ok: durOk, estOk: estOk, minMs: minMs, floorMs: 40000, speechOk: speechOk,
    perDch: [1, 2, 3, 4].map(d => {
      const v = [];
      for (let flat = 0; flat < 40; flat++) { const L = genLevel(flat); if (L.dch === d) v.push(modeledMs(L)); }
      return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
    }) };

  /* ---- ⑨ nextHint 章末逐点独立副本断言（r7 M1 同型坑 + 契约 F 实算） ---- */
  total++;
  const nhStatic = nextHint(4) === HINT_COPY[2] && nextHint(9) === HINT_COPY[3] &&
    nextHint(14) === HINT_COPY[4] && nextHint(19) === HINT_COPY[5] &&      // f=19 末章章末仍走静态分支
    /* 章中段（f=7/12/17，floor 不进位）也取当前章 CHAPTERS[n].hint（n=floor(f/5)+1）——
       HINT_COPY 键=预告的目标章号：f=7 在 ch2 → CHAPTERS[2].hint（完成 ch2 的预告） */
    nextHint(7) === HINT_COPY[3] && nextHint(12) === HINT_COPY[4] && nextHint(17) === HINT_COPY[5];
  const offByOne = nextHint(9) !== CHAPTERS[3].hint && nextHint(4) !== CHAPTERS[2].hint;   // 旧式 floor((f+1)/5)+1 多进一章哨兵
  let genFOk = true;                              // 生成段契约 F：逐点=GEN 副本[genLevel(f+1).dch-1]
  for (let f = 20; f < 39; f++) {
    if (nextHint(f) !== GEN_COPY[genLevel(f + 1).dch - 1]) genFOk = false;
  }
  const hintsOk = nhStatic && offByOne && genFOk;
  if (hintsOk) npass++;
  units.hints = { ok: hintsOk, nhStatic: nhStatic, offByOne: offByOne, genF: genFOk };

  /* ---- ⑩ 吞输入轻反馈（§0.22）：locked 期真实 pointerdown → sfx('pop') + 状态不变 ---- */
  total++;
  startLevel(2);
  state.locked = true;
  const sfxLog = [];
  const origSfx = KIDS.audio.sfx;
  KIDS.audio.sfx = function (n) { sfxLog.push(n); };
  cardsEl.querySelector('.card').dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  await wait(60);
  const swallowOk = sfxLog.indexOf('pop') >= 0 && SP.currentLevel.step === 0 &&
    SP.currentLevel.retries === 0 && SP.quiz.missCount === 0;
  KIDS.audio.sfx = origSfx;
  state.locked = false;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, sfx: sfxLog };

  /* ---- ⑪ 布局：双 viewport 模拟 × 五代表关（tri/neg/grid/mix/生成）---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();
    const q = cur.quizzes[cur.step];
    const kind = q ? q.kind : 'tri';
    const de = document.documentElement;
    const bad = [];
    document.querySelectorAll('button').forEach(e => {
      if (e.classList.contains('k-parentbtn')) return;       // core 家长按钮豁免（§0.9）
      const r = e.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64))
        bad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const mainBad = [];
    document.querySelectorAll('.card').forEach(e => {
      const r = e.getBoundingClientRect();
      if (r.width < 96 || r.height < 96)
        mainBad.push((e.id || e.className) + ':' + Math.round(r.width) + 'x' + Math.round(r.height));
    });
    const cardSvgs = Array.prototype.map.call(document.querySelectorAll('.card svg'),
      s => { const r = s.getBoundingClientRect(); return Math.min(r.width, r.height); });
    let qOk = true;                             // 题面区按题型断言
    if (kind === 'tri') {
      const hs = document.querySelector('#home .hshape');
      const r = hs ? hs.getBoundingClientRect() : { width: 0, height: 0 };
      /* 家内目标图形显示：大=全幅 ≥56px；小=0.6 缩放（大小维本体）≥36px（0.6 档视觉级差保清晰） */
      const need = q.tz === 'small' ? 36 : 56;
      qOk = Math.min(r.width, r.height) >= need;
    } else if (kind === 'neg') {
      const nbs = document.querySelectorAll('#home .nbadge');
      qOk = nbs.length === 2 && !!document.querySelector('#home .qmark') &&
        Array.prototype.every.call(nbs, b => {
          const r = b.getBoundingClientRect(); return Math.min(r.width, r.height) >= 40;
        });
    } else {
      const cells = document.querySelectorAll('#home .gcell');
      qOk = cells.length === 9 && document.querySelectorAll('#home .gmiss').length === 1 &&
        Array.prototype.every.call(cells, c => {
          const r = c.getBoundingClientRect(); return Math.min(r.width, r.height) >= 64;
        }) &&
        Array.prototype.every.call(document.querySelectorAll('#home .gcell svg'),
          s => { const r = s.getBoundingClientRect(); return Math.min(r.width, r.height) >= 56; });
    }
    const svgOk = cardSvgs.length > 0 && cardSvgs.every(v => v >= 64) && qOk;   // 卡图形 SVG ≥64
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, kind: kind, bad: bad, mainBad: mainBad, svgOk: svgOk, ox: ox,
      pass: !bad.length && !mainBad.length && svgOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10, 15, 20]) {
    startLevel(flat);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                             // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑫ UI 冒烟 A：flat0 首错零惩罚 + 通关（1 错=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongDone = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = SP.quiz;
    if (!q) { smokeA = false; break; }
    if (!wrongDone) {                                        // 首题先错一次：灰掉零惩罚不推进
      const r = await SP.tapCard(wrongsOf(q)[0]);
      wrongDone = r === 'wrong' && SP.currentLevel.step === 0 && SP.currentLevel.retries === 1;
      if (!wrongDone) smokeA = false;
    }
    const q2 = SP.quiz;
    const r = await SP.tapCard(q2.answerIdx);
    if (r !== 'right' && r !== 'done') { smokeA = false; break; }
    await wait(150);
    steps++;
  }
  const lvA = SP.currentLevel;
  const smokeOkA = smokeA && wrongDone && steps === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongDone: wrongDone, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑫ UI 冒烟 B：flat10（章 3 grid）热身 + 恰对一规则 + autoSolve 3 星 ---- */
  total++;
  startLevel(10);
  let dualOk = true;
  const qB = SP.quiz;
  if (SP.currentLevel.dch !== 3 || qB.kind !== 'grid') dualOk = false;
  else {
    const WB = wrongsOf(qB);                                 // 首题热身：两干扰双规则全违反
    if (WB.some(i => qB.options[i].c === qB.cols[qB.miss.c] || qB.options[i].s === qB.rows[qB.miss.r])) dualOk = false;
    if (!document.querySelector('#home .gmiss')) dualOk = false;
    await SP.tapCard(qB.answerIdx);                          // 推进到第 2 题
    await wait(200);
    const qB2 = SP.quiz;                                     // 第 2 题起：恰一同色异行 + 恰一异色同行
    const W2 = wrongsOf(qB2);
    const rc = W2.filter(i => qB2.options[i].c === qB2.cols[qB2.miss.c] && qB2.options[i].s !== qB2.rows[qB2.miss.r]);
    const rs = W2.filter(i => qB2.options[i].c !== qB2.cols[qB2.miss.c] && qB2.options[i].s === qB2.rows[qB2.miss.r]);
    if (rc.length !== 1 || rs.length !== 1) dualOk = false;
  }
  const a10 = await SP.autoSolve();
  const lv10 = SP.currentLevel;
  const smokeOkB = dualOk && a10.done && lv10.done && lv10.won && lv10.retries === 0 &&
    engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat10 = { ok: smokeOkB, grid: dualOk, taps: a10.taps, stars: engStars(cur) };

  /* ---- ⑫ UI 冒烟 C：flat15（章 4 混排）kind 循环逐题验证 + 0 错通关 ---- */
  total++;
  startLevel(15);
  let mixOk = SP.currentLevel.dch === 4;
  const kindsSeen = [];
  for (let s = 0; s < CH_LEN && mixOk; s++) {
    const q = SP.quiz;
    if (!q) { mixOk = false; break; }
    kindsSeen.push(q.kind);
    const r = await SP.tapCard(q.answerIdx);
    if (r !== 'right' && r !== 'done') { mixOk = false; break; }
    await wait(150);
  }
  const lv15 = SP.currentLevel;
  const smokeOkC = mixOk && kindsSeen.join() === MIX_COPY.join() &&
    lv15.done && lv15.won && lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkC) npass++;
  smokes.flat15 = { ok: smokeOkC, kinds: kindsSeen, retries: lv15.retries, stars: engStars(cur) };

  const out = { game: 'shapeshome', total: total, pass: npass, layoutOk: layoutOk,
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
  KIDS.voice.say = function () {};                           // §0.2 全发声 API 枚举（姊妹款同）
  runVerify();
}
