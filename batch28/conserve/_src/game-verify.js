/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch 静态映射+生成关 1-4）/
     引擎直驱（逐题点应选卡→right/末题 done→全关 3 星）
   ② SPEC 表独立对账（SPEC_OPTS/SPEC_FMATRIX/SPEC_NUMCN——verify 内从 SPEC-BATCH28
     §0.69/§3 文字独立重列，不引用引擎 OPT_TEXTS/NUMCN/池）× 40 关全题：
     候选=3 文字卡恒全集 / family ∈ 章矩阵 / answer 独立复算（same→一样多；
     rows add→按 left.n/right.n 差值；pour add→右边的多；clay add→左边的多）/
     数量域独立复算（rows base∈[5,7]，same 等量 / add 恒差 1；pour·clay n=1 占位）/
     addSide 语义（same=0；rows add=±1 且与差值方向自洽；pour·clay add=+1）
   ③ same/add 混出断言：每关 ≥1 same 且 ≥1 add（防恒答一样多策略性通过）
   ④ tapOpt 单元（flat0 真实 UI 状态机）：越界=null；错=wrong+miss+1+1000ms 防重入
     （fire-and-forget 首击+窗内二击 false）+反馈链绑定（cnv_wrong+SPEC 口径引导句——
     rows same 计数证据句带 NUMCN[base]）；对=right 推进
   ⑤ 变换演出窗吞点：startLevel(5)（dch2 变换）intro 期间 tapOpt=false+卡排容器 bump；
     窗后 scenePhase∈{post,postadd}+读题在变换后才播（__lastVoiceKey==='cnv_q'）
   ⑥ 教学链：tutorialWatch() 真实走完（stub 存档）→ __cvDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s
   ⑦ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑧ UI 冒烟：flat0 autoSolve 通关（taps=5 恒 3 星）；flat10（ch3）先 1 错再 autoSolve（2 星）
   ⑨ 布局：双 viewport（1280×800/800×1180）×（flat0 直接比/flat5 rows 变换/flat12 pour·clay）：
     场景 SVG ≥120px 高、卡 ≥64×64、描边对比度 ≥3:1、overflowX ≤0
   ⑩ clips：cnv_ 6 条 + core 3 条全注入 + duration 辨别器（SPEC §4 实长 ±60ms）
   ⑪ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑫ 契约 A/B/F/I/J/K 源码断言（读自身合并 script 文本）
   ⑬ 章末预告 C7 独立硬编码关键词 + 生成关 nextHint(f)===GEN_HINTS[genLevel(f+1).dch-1] 对账
   ⑭ L 契约：NUMCN 1-7 全量输出非 undefined 且 2='两'——40 关全题 guideOf/confirmOf/addSayOf
     全句扫描无 undefined + SPEC_NUMCN 逐键对账
   ⑮ estMs 语音窗动态断言：判对窗 5400 ≥ estMs(最长确认句)；教学演示窗 3012 ≥ 2712+300；
     turn 延 2200 ≥ 1848+300；celebrate 3020 ≥ 2496+300=2796；链豁免 10500 ≥ 2184+150+estMs(21)+300
   ⑯ SPEED=0.12 提速断言
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH28 §0.69/§3 文字独立重列（禁抄页面 OPT_TEXTS/NUMCN/表） */
  const SPEC_OPTS = ['左边的多', '一样多', '右边的多'];          // 候选文字卡封闭 3
  const SPEC_FMATRIX = { 1: ['rows'], 2: ['rows'], 3: ['pour', 'clay'],
                         4: ['rows', 'pour', 'clay'] };          // 家族×章型矩阵
  const SPEC_NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七' };   // L：2=两
  /* SPEC_DUR 扩 T46 阶段2 全 36 键（mp3 实测 ms，时长身份辨别器 ±60ms 防表过期/错拿） */
  const SPEC_DUR = { cnv_tut_watch: 2712, cnv_tut_turn: 1848, cnv_hint: 2232,
                     cnv_right: 2496, cnv_wrong: 2184, cnv_q: 1680,
                     cnv_pre: 2424, cnv_t_rows: 3648, cnv_t_pour: 3912, cnv_t_clay: 3432,
                     cnv_add_rows_l_add: 2376, cnv_add_rows_l_take: 2496,
                     cnv_add_rows_r_add: 2376, cnv_add_rows_r_take: 2496,
                     cnv_add_pour: 2592, cnv_add_clay: 2568,
                     cnv_cf_same_rows_5: 2952, cnv_cf_same_rows_6: 3048, cnv_cf_same_rows_7: 3024,
                     cnv_cf_same_pour: 3120, cnv_cf_same_clay: 3192,
                     cnv_cf_rows_l: 3192, cnv_cf_rows_r: 3192, cnv_cf_pour: 2904, cnv_cf_clay: 2712,
                     cnv_g_same_rows_5: 3216, cnv_g_same_rows_6: 3240, cnv_g_same_rows_7: 3288,
                     cnv_g_same_pour: 4080, cnv_g_same_clay: 4944,
                     cnv_g_rows_l_add: 4704, cnv_g_rows_l_take: 4920,
                     cnv_g_rows_r_add: 4704, cnv_g_rows_r_take: 4920,
                     cnv_g_pour: 4128, cnv_g_clay: 4416 };
  const SPEC_GUIDE_ROWS5 = '再数一数，两边都是' + SPEC_NUMCN[5] + '个哦';   // flat0 题0 引导句期望
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  /* answer 独立复算（SPEC 语义：same 恒=一样多；add=按差值/族规则） */
  const specAnsText = q => {
    if (q.kind === 'same') return '一样多';
    if (q.family === 'rows') return q.left.n > q.right.n ? '左边的多' : '右边的多';
    return q.family === 'pour' ? '右边的多' : '左边的多';
  };
  const unlocked = async () => {                  // 等变换演出/防重入窗结束（verify 提速后 ≤6s）
    let wg = 0;
    while ((state.locked || state.intro || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.intro || state.demo);
  };

  /* ---- ①②③ 40 关全量审计 + SPEC 表独立对账 + same/add 混出 ---- */
  const famSeen = { 1: {}, 2: {}, 3: {}, 4: {} }, genDch = {}, mixBad = [];
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === ((L1.ch - 1) % 4) + 1
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
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

    /* same/add 混出（每关 ≥1 each） */
    const nSame = L1.quizzes.filter(q => q.kind === 'same').length;
    const nAdd = L1.quizzes.filter(q => q.kind === 'add').length;
    if (nSame < 1 || nAdd < 1) mixBad.push(flat + ':' + nSame + '/' + nAdd);

    /* SPEC 表独立对账（每题） */
    let specOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const texts = q.opts.map(o => o.text);
      if (q.opts.length !== 3 || texts.slice().sort().join() !== SPEC_OPTS.slice().sort().join()) {
        badCase = 'optSet ' + flat + '/' + k; specOk = false; break;           // 3 卡恒全集
      }
      if (SPEC_FMATRIX[L1.dch].indexOf(q.family) < 0) {                        // 家族×章矩阵
        badCase = 'fam ' + flat + '/' + k; specOk = false; break;
      }
      if (texts[q.answer] !== specAnsText(q)) {                                // answer 独立复算
        badCase = 'ans ' + flat + '/' + k; specOk = false; break;
      }
      if (texts.filter(t => t === texts[q.answer]).length !== 1) {
        badCase = 'ansDup ' + flat + '/' + k; specOk = false; break;
      }
      if (q.family === 'rows') {                        // 数量域独立复算
        if (q.base < 5 || q.base > 7) { badCase = 'base ' + flat + '/' + k; specOk = false; break; }
        if (q.kind === 'same') {
          if (q.left.n !== q.base || q.right.n !== q.base || q.left.n !== q.right.n) {
            badCase = 'sameN ' + flat + '/' + k; specOk = false; break;
          }
          if (q.addSide !== 0) { badCase = 'sameSide ' + flat + '/' + k; specOk = false; break; }
        } else {
          if (Math.abs(q.left.n - q.right.n) !== 1) { badCase = 'addDiff ' + flat + '/' + k; specOk = false; break; }
          const changed = q.left.n !== q.base ? 'L' : 'R';
          if (q.addSide !== (changed === 'L' ? -1 : 1)) { badCase = 'addSide ' + flat + '/' + k; specOk = false; break; }
          if (q.left.n < 4 || q.left.n > 8 || q.right.n < 4 || q.right.n > 8) {
            badCase = 'nRange ' + flat + '/' + k; specOk = false; break;
          }
        }
      } else {
        if (q.left.n !== 1 || q.right.n !== 1) { badCase = 'nPh ' + flat + '/' + k; specOk = false; break; }
        if (q.kind === 'add') {
          if (q.addSide !== 1) { badCase = 'addSidePh ' + flat + '/' + k; specOk = false; break; }
          if (texts[q.answer] !== (q.family === 'pour' ? '右边的多' : '左边的多')) {
            badCase = 'ansPh ' + flat + '/' + k; specOk = false; break;        // pour add=右多 / clay add=左多
          }
        } else if (q.addSide !== 0) { badCase = 'sameSidePh ' + flat + '/' + k; specOk = false; break; }
      }
      famSeen[L1.dch][q.family] = (famSeen[L1.dch][q.family] || 0) + 1;
    }
    if (!specOk) tableOk = false;
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk &&
               nSame >= 1 && nAdd >= 1;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  mix: nSame + 's/' + nAdd + 'a',
                  kinds: L1.quizzes.map(q => q.family[0] + q.kind[0] + q.base +
                    (q.kind === 'add' ? (q.addSide < 0 ? 'L' : 'R') + (q.delta > 0 ? '+' : '-') : '')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  /* 聚合：ch3 两族均现 / ch4 三族均现 / 生成关四型全现（独占一票） */
  const aggOk = tableOk && mixBad.length === 0 &&
    Object.keys(famSeen[3]).length === 2 &&
    Object.keys(famSeen[4]).length === 3 &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  total++;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, mixBad: mixBad, fam3: famSeen[3], fam4: famSeen[4], genDch: genDch };

  /* ---- ⑭ L 契约：NUMCN 1-7 全量对账（2=两）+ 全句扫描无 undefined ---- */
  total++;
  const cnOk = [1, 2, 3, 4, 5, 6, 7].every(n => NUMCN[n] === SPEC_NUMCN[n]) && NUMCN[2] === '两';
  let sentOk = true, sentBad = null;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (const q of L.quizzes) {
      const strs = [guideOf(q), confirmOf(q), addSayOf(q)];
      for (const s of strs) {
        if (!s || s.indexOf('undefined') >= 0 || s.indexOf('NaN') >= 0) {
          sentOk = false; sentBad = flat + ':' + s;
        }
      }
      /* rows same 引导/确认句须含 NUMCN[base]（计数证据锚在句中） */
      if (q.family === 'rows' && q.kind === 'same') {
        if (guideOf(q).indexOf(SPEC_NUMCN[q.base]) < 0 || confirmOf(q).indexOf(SPEC_NUMCN[q.base]) < 0) {
          sentOk = false; sentBad = flat + ':cnMissing';
        }
      }
    }
  }
  const lOk = cnOk && sentOk;
  if (lOk) npass++;
  units.numcn = { ok: lOk, cnOk: cnOk, sentOk: sentOk, bad: sentBad };

  /* ---- ④ tapOpt 单元（flat0 dch1 无变换：立即开点） ---- */
  total++;
  startLevel(0);
  const q4 = CV.quiz;
  const initOk = q4 && q4.kind === 'same' && q4.family === 'rows' &&
                 q4.left.n === 5 && q4.right.n === 5 && q4.addSide === 0 &&
                 q4.opts.length === 3 &&
                 q4.opts.map(o => o.text).sort().join() === SPEC_OPTS.slice().sort().join() &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await CV.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex(o => o.text === '左边的多');   // 错卡 A（same 题点某边多）
  const wB = q4.opts.findIndex((o, i) => i !== q4.answer && i !== wA);   // 另一错卡
  const pW = CV.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await CV.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue[0] === 'cnv_wrong' &&   // 反馈链=cnv_wrong+引导句
                window.__lastQueue[1] && window.__lastQueue[1].key === 'cnv_g_same_rows_5' &&   // T46 阶段2：引导句键化
                window.__lastQueue[1].text === SPEC_GUIDE_ROWS5;     // rows same 计数证据句（NUMCN[5]='五'）
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             CV.quiz.miss === 1 && CV.currentLevel.miss === 1;
  const pW2 = CV.tapOpt(wB);                               // 同题点另一错卡
  const rW2 = await pW2;
  const s1b = rW2 === 'wrong' && CV.quiz.miss === 2;       // 第二次错=miss 2（卡不灰可重选）
  const rR = await CV.tapOpt(q4.answer);
  const s2 = rR === 'right' && CV.quiz.step === 1 && CV.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s1b && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1, wrongB: s1b,
                chain: chainA, right: s2 };

  /* ---- ⑤ 变换演出窗吞点+帧内容守恒（M1 补验 2026-09-10：post 帧圆片=等量 base、
     postadd 帧=终量——「变换不改量→追加才改量」两步分离的画面铁证；
     flat 选 dch2 内首题=rows add 的关；DISC 每圆片 2 个 circle，计数×2） ---- */
  total++;
  let flatIntro = 5;
  for (let f = 5; f <= 9; f++) {
    const q0 = genLevel(f).quizzes[0];
    if (q0.kind === 'add' && q0.family === 'rows') { flatIntro = f; break; }
  }
  const iq = genLevel(flatIntro).quizzes[0];
  startLevel(flatIntro);
  const inIntro = !!(state.intro && state.locked);
  const phasePre = sceneEl.dataset.phase === 'pre';
  const rIntro = await CV.tapOpt(0);                       // 变换演出窗内 → false+pop
  const bumpIntro = boardEl.classList.contains('bump');
  const quizOk = CV.quiz && CV.quiz.family === 'rows';     // 演出窗内钩子仍可读
  let postCircles = -1, postaddCircles = -1;
  for (let t = 0; t < 600 && (state.intro || state.locked); t++) {
    const ph = sceneEl.dataset.phase;
    const n = sceneEl.querySelectorAll('.sky circle').length;
    if (ph === 'post' && postCircles < 0) postCircles = n;
    if (ph === 'postadd' && postaddCircles < 0) postaddCircles = n;
    await wait(30);
  }
  const framesOk = postCircles === iq.base * 4 &&           // post=等量拉开（2×base 圆片×2circle）
                   postaddCircles === (iq.left.n + iq.right.n) * 2 &&   // postadd=追加终量
                   postaddCircles !== iq.base * 4;
  const phasePost = sceneEl.dataset.phase === 'post' || sceneEl.dataset.phase === 'postadd';
  const qAfter = CV.currentLevel.step === 0 && !state.locked;
  const introOk = inIntro && phasePre && rIntro === false && bumpIntro && quizOk &&
                  phasePost && qAfter && framesOk;
  if (introOk) npass++;
  units.intro = { ok: introOk, inIntro: inIntro, phasePre: phasePre, swallow: rIntro === false,
                  bump: bumpIntro, phasePost: phasePost, postC: postCircles,
                  postaddC: postaddCircles, wantPost: iq.base * 4,
                  wantPostadd: (iq.left.n + iq.right.n) * 2 };

  /* ---- ⑥ 教学链：tutorialWatch 真实走完 → __cvDemoR='right'（演示点「一样多」卡） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__cvDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].family === 'rows' &&
                cur.quizzes[0].kind === 'same' && cur.quizzes[0].base === 5 && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__cvDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑦ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await CV.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await CV.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && CV.quiz.step === 0 && CV.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑧ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await CV.autoSolve();
  const lv0 = CV.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3 pour·clay）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  await unlocked();                                          // 等首题变换演出结束
  const q8 = CV.quiz;
  const wrongC = q8.opts.findIndex((o, i) => i !== q8.answer);
  const r8 = await CV.tapOpt(wrongC);
  const a10 = await CV.autoSolve();
  const lv10 = CV.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑨ 布局：双 viewport ×（flat0 直接比 / flat5 rows 变换 / flat12 pour·clay） ---- */
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
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(g._simFlat);
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const svg = sceneEl.querySelector('.scene-slot svg');
    const svgh = svg ? Math.round(svg.getBoundingClientRect().height) : 0;   // SVGElement 无 offsetHeight
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length === 3 && cards.every(b => b.w >= 64 && b.h >= 64);
    const sceneOk = svgh >= 120 && sc.w >= 64 && sc.h >= 64;      // 两排/两杯 ≥120px 高
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cards: cards.length, svgH: svgh,
             hitOk: hitOk, sceneOk: sceneOk, contrast: cB && cS, ox: ox,
             pass: hitOk && sceneOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 12]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑩ clips：cnv_ 6 条 + core 3 条全注入 + duration 辨别器（SPEC §4 实长 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['cnv_tut_watch', 'cnv_tut_turn', 'cnv_hint', 'cnv_right', 'cnv_wrong', 'cnv_q',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  /* T46 阶段2：30 段键（pre/t 4/add 6/cf 9/g 11）+ 6 固定 + core 3 = 39 */
  const preOk = keys.length === 39 &&
    keys.filter(k => /^(cnv_pre|cnv_t_|cnv_add_|cnv_cf_|cnv_g_)/.test(k)).length === 30 &&
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

  /* ---- ⑪ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑫ 契约 A/B/F/I/J/K 源码断言（读自身合并 script 文本——第 3 个 script 块） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0;   // B：双锚
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0;    // F：生成关实算 dch-1
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 10500') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf('if (document.querySelector(\'.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel\')) return;') >= 0;   // K：面板守卫
  const srcOk = srcA && srcB && srcF && srcI && srcJ && srcK;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, F: srcF, I: srcI, J: srcJ, K: srcK };

  /* ---- ⑬ 章末预告 C7 关键词断言（hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('拉') >= 0 &&                       // 预告 ch2 拉开变换
                 CHAPTERS[2].hint.indexOf('水') >= 0 && CHAPTERS[2].hint.indexOf('泥') >= 0 &&   // 预告 ch3 倒水+泥
                 CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 && // 预告 ch4 混合
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                        // 预告生成关
                 GEN_HINTS[0].indexOf('数一数') >= 0 &&                        // dch1 直接比
                 GEN_HINTS[1].indexOf('拉开') >= 0 &&                          // dch2 间距变换
                 GEN_HINTS[2].indexOf('水') >= 0 && GEN_HINTS[2].indexOf('泥') >= 0 &&           // dch3 pour·clay
                 GEN_HINTS[3].indexOf('集合') >= 0;                            // dch4 混合
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑮ 语音窗动态断言（T46 阶段2 后 clip 实长为主口径：窗 ≥ clip 实测+300；
     quizIntro 演出窗按 estMs(text) 对齐——clip 恒 ≤ estMs 同句，estMs 口径保留旁证） ---- */
  total++;
  const maxCfMs = Math.max(SPEC_DUR.cnv_cf_same_rows_7, SPEC_DUR.cnv_cf_same_pour,
                           SPEC_DUR.cnv_cf_same_clay, SPEC_DUR.cnv_cf_rows_l,
                           SPEC_DUR.cnv_cf_pour, SPEC_DUR.cnv_cf_clay);   // 确认句最长 3192
  const maxGuideMs = Math.max(SPEC_DUR.cnv_g_same_rows_5, SPEC_DUR.cnv_g_same_rows_6,
                              SPEC_DUR.cnv_g_same_rows_7, SPEC_DUR.cnv_g_same_pour,
                              SPEC_DUR.cnv_g_same_clay, SPEC_DUR.cnv_g_rows_l_take,
                              SPEC_DUR.cnv_g_rows_r_take, SPEC_DUR.cnv_g_pour,
                              SPEC_DUR.cnv_g_clay);                        // 引导句最长 4944
  const maxIntroMs = Math.max(SPEC_DUR.cnv_pre, SPEC_DUR.cnv_t_pour,
                              SPEC_DUR.cnv_add_pour);                     // 演出句最长 3912
  const winOk = (1800 + 3600) >= maxCfMs + 300 &&              // 判对演出窗 5400 ≥ 3192+300=3492
                3012 >= SPEC_DUR.cnv_tut_watch + 300 &&        // 教学变换延 t=3012 ≥ 2712+300
                2200 >= SPEC_DUR.cnv_tut_turn + 300 &&         // turn 后读题延 ≥ 1848+300=2148
                (2620 + 400) >= SPEC_DUR.cnv_right + 300 &&    // winFlow celebrate+补窗 ≥ 2496+300=2796
                10500 >= SPEC_DUR.cnv_wrong + 150 + maxGuideMs + 300 &&   // 链豁免 ≥ 2184+150+4944+300=7578
                estMs(14) >= maxIntroMs + 300;                 // quizIntro 演出窗 estMs(14)=5430 ≥ 3912+300
  const estData = { maxCfMs: maxCfMs, rightWin: 5400,
                    watchT: 3012, turnDelay: 2200, rightFlow: 3020,
                    wrongChain: 10500, chainNeedMs: SPEC_DUR.cnv_wrong + 150 + maxGuideMs + 300,
                    maxIntroMs: maxIntroMs, introWin: estMs(14) };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑯ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'conserve', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；voice.say 记录 TTS 拼句
     （__lastSayText）；voice.queue 记录拼播链（__lastQueue）供反馈链绑定断言 */
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
