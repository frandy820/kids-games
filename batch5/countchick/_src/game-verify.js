/* ================= ?verify=1 自检（仅 verify 分支加载执行——独立第 4 script 块，E-M2）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章域规则（dch1 count 11-14 / dch2 count 15-20+干扰 2-4 / dch3 compare 小鸡 7-12-差 1-5 / dch4 flash 8-16+窗公式）/
     structOk（answer 唯一+干扰按题型）/ 相邻题关键量互异 / 引擎直驱通关（0 重试 3 星）
   ② count 单元（flat0）：角标递增/重数清零/非法下标/十加几 chip（满10→'10 + k'→recount 灭）
   ③ compare 单元（flat10）：tally 双群并排/小鸭独立计数/越界/重数清两群/首错+窗内吞错(pulse 通道保留,retries 不增)
   ④ flash 单元（flat15）：呈现期吞选吞点/呈现窗后遮盖+再看一眼/重播计数/答对推进
   ⑤ 布局：双 viewport ×（ch1 / ch2 最密混养 / ch3 双群最多）：热区 ≥64、答案 ≥96×96、
     overflowX ≤0、动物两两中心距 ≥90px；scatterPts 确定性单元
   ⑥ 契约源码扫描（querySelectorAll('script')[2]=纯游戏块，禁自匹配；高风险串拼接）：
     家族 A（双 nextHint(lim - 1)+禁 null 形态）/F（生成关实算禁 (ci+1)%4）/D（吞配 bump）/
     E（教学子键先查）/I（链窗重置+让路守卫）/J（10s 节流）/K（rescueTick 命名+面板守卫）
   ⑦ clips：≥7 条全 chk_/core_ 前缀+四条旧键在场
   ⑧ estMs 动态：全字符口径 3015/3705/4395 + WRONG_WIN {3465,4155,4845}
   ⑨ modeled 双钉：modeled(0)===81765（SPEC_MODELED_MIN）+ 0-39 全域 min===56840 + DECIDE_MS 字面
   ⑩ 分布：answerIdx 三位置均出现、首位 <60%
   ⑪ UI 冒烟：flat0 全链（首错零惩罚+二错吞）通关 2 星 / flat15 flash autoSolve 3 星 / flat10 compare autoSolve 3 星
   结果写 #verify-result + document.title='VERIFY PASS n/n'（墙钟 <100s，SPEC §-r19 注记） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0];
  /* SPEC 独立口径（§-r19 §4/§5——从 SPEC 推导的期望值，禁从实现归纳） */
  const estMsV = n => n * 345 + 600;
  const SPEC_MODELED_MIN = 81765;               /* flat0（ch1 count [13,12,13,12,11]）模型分账 */
  const SPEC_MODELED_GLOBAL_MIN = 56840;        /* 0-39 全域最小（flat18 flash 关无点数链） */
  const SPEC_WRONG_WIN = { count: 3465, compare: 4155, flash: 4845 };
  const keyOfV = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const C = CHAPTERS[L1.dch];
    let ruleOk = true, structAll = true, adjOk = true, rangeOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q)) structAll = false;
      if (q.type !== C.kind) ruleOk = false;                                   // 章型一致
      if (C.kind === 'count') {
        if (q.n < C.nMin || q.n > C.nMax || q.chicks.length !== q.n) rangeOk = false;
        const ndOk = C.mix
          ? (q.others.length >= D_MIN && q.others.length <= D_MAX &&
             q.others.every(o => o.kind === 'duck' || o.kind === 'bunny'))
          : q.others.length === 0;
        if (!ndOk) ruleOk = false;
      } else if (C.kind === 'compare') {
        if (q.n < C.nMin || q.n > C.nMax) rangeOk = false;
        if (q.chicks.length !== q.n || (q.ducks || []).length !== q.m) rangeOk = false;
        if (q.n - q.m !== q.diff || q.diff < C.dMin || q.diff > C.dMax || q.m < 2) ruleOk = false;
        if (q.dir !== 'more' && q.dir !== 'less') ruleOk = false;
      } else {
        if (q.n < C.nMin || q.n > C.nMax || q.chicks.length !== q.n) rangeOk = false;
        if (q.flashMs !== 1200 + q.n * 100) ruleOk = false;                    // 呈现窗公式
        if ((q.ducks || []).length !== 0 || q.others.length !== 0) ruleOk = false;
      }
      const prev = L1.quizzes[k - 1];
      if (prev) {                                                              // 相邻题关键量互异
        const key = x => x.type === 'compare' ? x.n + '-' + x.diff : x.type[0] + x.n;
        if (key(prev) === key(q)) adjOk = false;
      }
      idxDist[q.answer]++;
    }
    /* 引擎直驱：count/compare 逐只点数（含小鸭组）→已数过返 0→重数清零→再点满→答对；flash 直接作答 */
    let driveOk = true;
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      if (q.type !== 'flash') {
        for (let i = 0; i < q.chicks.length; i++) {
          if (engTap(L1, i, 'c') !== i + 1) { driveOk = false; break; }
        }
        if (!driveOk) break;
        if (q.type === 'compare') {
          for (let j = 0; j < q.ducks.length; j++) {
            if (engTap(L1, j, 'd') !== j + 1) { driveOk = false; break; }
          }
          if (!driveOk) break;
        }
        if (engTap(L1, 0, 'c') !== 0) driveOk = false;                         // 已数过：只跳不增号
        if (q.type === 'compare' && engTap(L1, 0, 'd') !== 0) driveOk = false;
        if (!engRecount(L1)) driveOk = false;                                  // 重数清零（两群一起）
        for (let i = 0; i < q.chicks.length; i++) {
          if (engTap(L1, i, 'c') !== i + 1) { driveOk = false; break; }
        }
        if (!driveOk) break;
        if (q.type === 'compare') {
          for (let j = 0; j < q.ducks.length; j++) {
            if (engTap(L1, j, 'd') !== j + 1) { driveOk = false; break; }
          }
          if (!driveOk) break;
        }
      }
      const r = engPick(L1, q.answer);
      const want = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (r !== want) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && L1.quizzes.length === CH_LEN && ruleOk && structAll && adjOk && rangeOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, structAll: structAll,
      adjOk: adjOk, rangeOk: rangeOk, driveOk: driveOk, solvedAll: solvedAll,
      ns: L1.quizzes.map(q => q.type === 'compare' ? q.n + 'v' + q.m : q.type === 'flash' ? 'f' + q.n : q.n + (q.others.length ? '+' + q.others.length : '')) };
    if (flat < STATIC_LEVELS) levels[keyOfV(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② count 单元（flat0 真实 UI 状态机）+ 十加几 chip ---- */
  total++;
  startLevel(0);
  const q0 = CHK.quiz;
  const tenEl = document.getElementById('ten-chip');
  const taps = [], badSeq = [];
  let ten10 = true;
  for (let i = 0; i < 9; i++) {                  // 前 9 只：chip 不出现
    taps.push(CHK.tapChick(i));
    badSeq.push(CHK.currentLevel.counted);
  }
  ten10 = ten10 && !tenEl.classList.contains('on') && CHK.quiz.ten === null;
  taps.push(CHK.tapChick(9));                    // 第 10 只：「满 10 啦」
  badSeq.push(CHK.currentLevel.counted);
  ten10 = ten10 && tenEl.classList.contains('on') && tenEl.textContent === '满 10 啦';
  const ten11k = CHK.tapChick(10);               // 第 11 只起：「10 + k」
  taps.push(ten11k);
  badSeq.push(CHK.currentLevel.counted);
  const ten11 = tenEl.textContent === '10 + 1' && CHK.quiz.ten === '10 + 1' && ten11k === 11;
  for (let i = 11; i < q0.chicks; i++) {
    taps.push(CHK.tapChick(i));
    badSeq.push(CHK.currentLevel.counted);
  }
  const incOk = taps.every((v, i) => v === i + 1) && badSeq.every((v, i) => v === i + 1);
  const retap = CHK.tapChick(0);                 // 已数过 → 0，总数不变
  const retapOk = retap === 0 && CHK.currentLevel.counted === q0.chicks;
  const domBadges = fieldEl.querySelectorAll('.badge.on').length;
  const domOk = domBadges === q0.chicks;         // 每只小鸡一个角标
  CHK.recount();
  const tenOff = !tenEl.classList.contains('on') && CHK.quiz.ten === null;
  const recOk = CHK.currentLevel.counted === 0 && fieldEl.querySelectorAll('.badge.on').length === 0;
  const badIdx = CHK.tapChick(99) === false && CHK.tapChick(-1) === false;
  const tapOk = incOk && retapOk && domOk && recOk && badIdx && ten10 && ten11 && tenOff;
  if (tapOk) npass++;
  units.tapChick = { ok: tapOk, retap: retap, domBadges: domBadges, recount: recOk,
    badIdx: badIdx, ten10: ten10, ten11: ten11, tenOff: tenOff, n: q0.chicks };

  /* ---- ③ compare 单元（flat10）：tally/小鸭组/吞错窗 ---- */
  total++;
  startLevel(10);
  const qc = CHK.quiz;
  const tallyC0 = document.getElementById('tally-c'), tallyD0 = document.getElementById('tally-d');
  const shapeOk = qc.type === 'compare' && qc.m === qc.n - qc.diff && qc.diff >= 1 && qc.diff <= 5 &&
    qc.answer === qc.diff && qc.ducks === qc.m && !!tallyC0 && !!tallyD0 && tallyC0.textContent === '0';
  CHK.tapChick(0); CHK.tapChick(1); CHK.tapChick(2);
  CHK.tapDuck(0); CHK.tapDuck(1);
  const tallyOk = tallyC0.textContent === '3' && tallyD0.textContent === '2' &&
    CHK.quiz.counted === 3 && CHK.quiz.countedD === 2;
  const duckBad = CHK.tapDuck(99) === false && CHK.tapDuck(-1) === false;
  CHK.recount();
  const recBoth = CHK.quiz.counted === 0 && CHK.quiz.countedD === 0 &&
    tallyC0.textContent === '0' && tallyD0.textContent === '0';
  /* 首错零惩罚 + 窗内二错吞（pulse 通道保留、retries 不增） */
  const w1 = qc.items.findIndex((v, i2) => i2 !== qc.answerIdx);
  const r1 = await CHK.pick(w1);
  const w2 = qc.items.findIndex((v, i2) => i2 !== qc.answerIdx && i2 !== w1);
  const r2 = await CHK.pick(w2);
  const okEl = answersEl.querySelector('.opt[data-i="' + qc.answerIdx + '"]');
  const swallowOk = r1 === 'wrong' && r2 === false &&
    CHK.currentLevel.retries === 1 && CHK.currentLevel.step === 0 &&
    okEl.classList.contains('pulse');
  const cmpOk = shapeOk && tallyOk && duckBad && recBoth && swallowOk;
  if (cmpOk) npass++;
  units.compare = { ok: cmpOk, shape: shapeOk, tally: tallyOk, recount: recBoth, swallow: swallowOk,
    n: qc.n, m: qc.m, diff: qc.diff, dir: qc.dir };

  /* ---- ④ flash 单元（flat15）：呈现期吞→遮盖→再看一眼→答对 ---- */
  total++;
  startLevel(15);
  const qf = CHK.quiz;
  const flashStartOk = qf.type === 'flash' && qf.flashing && fieldEl.classList.contains('hid') &&
    qf.flashMs === 1200 + qf.n * 100;
  const tapSw = CHK.tapChick(0) === false;                        // 估计任务禁逐格数
  const pickSw = await CHK.pick(qf.answerIdx);                    // 呈现期吞选 → false
  await wait(1600);                                               // SPEED=0.12：问句窗+呈现窗+遮盖
  const qf2 = CHK.quiz;
  const hidOk = !qf2.flashing && fieldEl.classList.contains('hid') &&
    document.getElementById('btn-resee').classList.contains('on');
  const reseeR = CHK.resee();
  await wait(1200);
  const reseeOk = reseeR === true && CHK.quiz.flashing === false && CHK.quiz.resees === 1;
  const pickR = await CHK.pick(qf2.answerIdx);
  const flashOk = flashStartOk && tapSw === true && pickSw === false && hidOk && reseeOk &&
    (pickR === 'right' || pickR === 'done');
  if (flashOk) npass++;
  units.flash = { ok: flashOk, start: flashStartOk, tapSwallow: tapSw, pickSwallow: pickSw === false,
    hid: hidOk, resee: reseeOk, n: qf.n, flashMs: qf.flashMs };

  /* ---- ⑤ 布局：双 viewport 模拟 ×（ch1 / ch2 最密混养 / ch3 双群最多） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                               // 按新场地尺寸重新撒点（同 seed 同尺寸同布局）
    const de = document.documentElement;
    const ans = Array.prototype.map.call(answersEl.querySelectorAll('.opt'), b => b.getBoundingClientRect());
    const ansOk = ans.length === 3 && ans.every(r => r.width >= 96 && r.height >= 96);
    const animals = Array.prototype.map.call(fieldEl.querySelectorAll('.animal'), b => {
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    });
    const hitOk = animals.length > 0 && animals.every(a => a.w >= 64 && a.h >= 64);
    let distOk = true, minD = 1e9;
    for (let i = 0; i < animals.length; i++) {
      for (let j = i + 1; j < animals.length; j++) {
        const d = Math.hypot(animals[i].x - animals[j].x, animals[i].y - animals[j].y);
        if (d < minD) minD = d;
        if (d < 90) distOk = false;             // 撒点中心距 ≥90px：防重叠不可点
      }
    }
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, ansOk: ansOk, hitOk: hitOk, distOk: distOk, minD: Math.round(minD),
      animals: animals.length, ox: ox, pass: ansOk && hitOk && distOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10]) {              // ch1 基线 / ch2 最密混养 / ch3 双群最多
    startLevel(flat);
    await wait(90);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑤ 附：scatterPts 确定性单元（同参数两次同布局） ---- */
  total++;
  const sc1 = scatterPts(mulberry32(987654), 900, 460, 24, 90, 42);
  const sc2 = scatterPts(mulberry32(987654), 900, 460, 24, 90, 42);
  const scDet = JSON.stringify(sc1) === JSON.stringify(sc2) && sc1.length === 24;
  let scMin = 1e9;
  for (let i = 0; i < sc1.length; i++) for (let j = i + 1; j < sc1.length; j++) {
    const d = Math.hypot(sc1[i].x - sc1[j].x, sc1[i].y - sc1[j].y);
    if (d < scMin) scMin = d;
  }
  const scOk = scDet && scMin >= 90;
  if (scOk) npass++;
  units.scatter = { ok: scOk, det: scDet, minD: Math.round(scMin) };

  /* ---- ⑥ 契约源码扫描（纯游戏块 [2]；高风险串拼接防同文） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const LIM1 = ['nextHint', '(lim - 1)'].join('');        // 家族 A
  const NULLF = ['nextHint', '(null)'].join('');
  const F1 = ['GEN_HINTS[genLevel(f + 1)', '.dch - 1]'].join('');   // 家族 F
  const F2 = ['(ci + 1)', ' % 4'].join('');
  const ctrOk = src.split(LIM1).length - 1 === 2 && src.indexOf(NULLF) < 0 &&
    src.indexOf('Math.max(0, lim - 1)') >= 0 &&
    src.indexOf(F1) >= 0 && src.indexOf(F2) < 0 &&
    src.indexOf("replayAnim(answersEl, 'bump')") >= 0 &&           // 家族 D
    src.indexOf('sv.chk && sv.chk.tutSeen') >= 0 &&                // 家族 E
    src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&// 家族 I
    src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
    src.indexOf('now - lastWrongVoice > 10000') >= 0 &&             // 家族 J
    src.indexOf('function rescueTick()') >= 0 &&                   // 家族 K
    src.indexOf('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel') >= 0;
  if (ctrOk) npass++;
  units.contract = { ok: ctrOk,
    nLim: src.split(LIM1).length - 1, noNull: src.indexOf(NULLF) < 0, genReal: src.indexOf(F1) >= 0 };

  /* ---- ⑦ clips 注入对账（前缀封闭：chk_/core_；r19 二轮定值 13=core3+旧4+新6）
         + SPEC_DUR 链句实长 ±60ms（r19 审查 m3：estMs 上界假设的运行时证据——实长恒 ≤ estMs 才窗安全） ---- */
  const SPEC_DUR = { chk_hint: 2496, chk_cmp_hint: 2880, chk_flash_hint: 3096 };   // 实测 2026-09-19（主线 headless metadata 读取）
  total++;
  const clipKeys = Object.keys(KIDS.voice.clips);
  let clipsOk = clipKeys.length === 13 &&
    clipKeys.every(k => k.indexOf('chk_') === 0 || k.indexOf('core_') === 0) &&
    ['chk_tut_watch', 'chk_tut_turn', 'chk_hint', 'chk_rec',
     'chk_ten', 'chk_cmp_more', 'chk_cmp_less', 'chk_cmp_hint', 'chk_flash_q', 'chk_flash_hint']
      .every(k => clipKeys.indexOf(k) >= 0);
  if (clipsOk) {
    clipsOk = await Promise.all(Object.keys(SPEC_DUR).map(k => new Promise(res => {
      const a = new Audio(KIDS.voice.clips[k]);   // metadata 读取不出声（无 autoplay）
      a.onloadedmetadata = () => res(Math.abs(a.duration * 1000 - SPEC_DUR[k]) <= 60);
      a.onerror = () => res(false);
    }))).then(v => v.every(Boolean));
  }
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: clipKeys.length };

  /* ---- ⑧ estMs 动态四方之一（全字符口径）+ WRONG_WIN ---- */
  total++;
  const estOk = estMs('点一点，数一数') === 3015 && estMs('满10只啦，接着数') === 3705 &&
    estMs('别急着数，看一眼猜一猜') === 4395 && estMsV(7) === 3015 &&
    WRONG_WIN.count === SPEC_WRONG_WIN.count && WRONG_WIN.compare === SPEC_WRONG_WIN.compare &&
    WRONG_WIN.flash === SPEC_WRONG_WIN.flash;
  if (estOk) npass++;
  units.estWin = { ok: estOk, w: [WRONG_WIN.count, WRONG_WIN.compare, WRONG_WIN.flash] };

  /* ---- ⑨ modeled 双钉（SPEC_MODELED_MIN 精确一致禁约数） ---- */
  total++;
  let mMin = Infinity;
  for (let f = 0; f < 40; f++) mMin = Math.min(mMin, CHK.modeled(f));
  const modOk = CHK.modeled(0) === SPEC_MODELED_MIN && mMin === SPEC_MODELED_GLOBAL_MIN &&
    DECIDE_MS.count === 2600 && DECIDE_MS.compare === 4200 && DECIDE_MS.flash === 3000 &&
    TAP_MS === 950 && FLASH_A === 1200 && FLASH_B === 100 && INTRO_MS === 3415;
  if (modOk) npass++;
  units.modeled = { ok: modOk, flat0: CHK.modeled(0), min: mMin,
    decide: [DECIDE_MS.count, DECIDE_MS.compare, DECIDE_MS.flash] };

  /* ---- ⑩ 分布断言：answerIdx 三位置都出现、首位不恒定（<60%） ---- */
  total++;
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[0] < 200 * 0.6;
  if (distOk) npass++;
  units.dist = { ok: distOk, idx0: idxDist[0], idx1: idxDist[1], idx2: idxDist[2], n: idxDist[0] + idxDist[1] + idxDist[2] };

  /* ---- ⑪ UI 冒烟 A：flat0 全链（首错+窗内吞错）通关（1 重试=2 星） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = CHK.quiz;
    if (!q) { smokeA = false; break; }
    for (let i = 0; i < q.chicks; i++) {
      if (CHK.tapChick(i) !== i + 1) smokeA = false;
    }
    if (s === 0) {                              // 首错零惩罚；窗内二错吞（pulse 出、retries 不增）
      const widx = q.items.findIndex((v, i2) => i2 !== q.answerIdx);
      await CHK.pick(widx);
      const w2idx = q.items.findIndex((v, i2) => i2 !== q.answerIdx && i2 !== widx);
      const r2 = await CHK.pick(w2idx);
      const okEl2 = answersEl.querySelector('.opt[data-i="' + q.answerIdx + '"]');
      wrongOk = r2 === false && CHK.currentLevel.retries === 1 && CHK.currentLevel.step === 0 &&
        okEl2.classList.contains('pulse');
      await wait(3600);                         // 等错链窗过（3465）再答对
    }
    const r = await CHK.pick(q.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    steps++;
  }
  const lvA = CHK.currentLevel;
  const smokeOkA = smokeA && wrongOk && steps === CH_LEN && lvA.done && lvA.won && lvA.retries === 1 &&
    engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ⑪ UI 冒烟 B：flat15（ch4 flash）autoSolve UI 通路通关 ---- */
  total++;
  startLevel(15);
  const a15 = await CHK.autoSolve();
  const lv15 = CHK.currentLevel;
  const smokeOkB = a15.done && lv15.done && lv15.won && lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, picks: a15.picks, retries: lv15.retries, stars: engStars(cur) };

  /* ---- ⑪ UI 冒烟 C：flat10（ch3 compare）autoSolve UI 通路通关 ---- */
  total++;
  startLevel(10);
  const a10 = await CHK.autoSolve();
  const lv10 = CHK.currentLevel;
  const smokeOkC = a10.done && lv10.done && lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkC) npass++;
  smokes.flat10 = { ok: smokeOkC, picks: a10.picks, retries: lv10.retries, stars: engStars(cur) };

  const out = { game: 'countchick', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
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
