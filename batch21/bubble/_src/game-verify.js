/* ================= ?verify=1 自检 v2/r9（去计数器+颜色子集+提交制+倒计时收尾——2026-09-14 r9 改造版；仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/ 章规则
     （ch1 N∈[3,5] 单色场 / ch2 [4,6] 蓝+黄 / ch3 [5,8] 三色 / ch4 [3,8] 2-3 色 seeded；
     相邻题 n 不同；flat0 题0 恒 n=3 blue；题色 ∈ 关色板）/ 泡场确定性（同 flat 两场并行 tick 20s 逐帧一致）/
     引擎直驱（目标色泡逐个 'pop' 至 N → engSubmit 'right'/'done'；非目标色 'nope' 不破不移除）/
     r9：timed 规则（timed === lv>=3）+ modeled 时长（独立副本 Σ[estMs(8)+n*2000+120+2400] >= 40000
     且与源模型 levelDurMs 逐关对账一致）
   ② 点泡单元（真实 UI 状态机）：flat0 目标色 'pop'+count+1 / 已破泡 false / 非法 id false /
     顶部无计数显示（#count-n 不存在）+目标色色卡与目标数正确渲染；
     flat5 非目标色 'skip'+泡不破+计数/miss 不动；flat12 灰云 'skip'+破+cloudPops+1+miss 不动
   ③ 提交单元（flat0 全路径）：少点提交 wrong_less（计数保留不 miss）→ 多点提交 wrong_more
     （计数清零+submitErr+1+miss+1+泡场重置）→ 点够提交 right（step 前进）→ autoSolve 收尾通关（2★）
   ④ UI 冒烟 A：flat0 干净 autoSolve 通关（0 错=3 星；verify 页不弹层）
   ⑤ UI 冒烟 B：flat12 连点 3 次灰云（≥3 折 1 miss）→ autoSolve（miss=1=2 星）
   ⑥ 布局：双 viewport（1280×800 / 800×1180）×（章 3 / 章 4）：泡按钮 offsetWidth/offsetHeight ≥64
     （大泡 96）、目标卡高 ≥64、「好了」按钮 ≥72、overflowX ≤0
   ⑦ clips：bub_ 7 条（r9 增 bub_timeup）+ core 3 条全注入（dataURI 前缀+实长 ±60ms）
   ⑧ 教学/演出吞输入单元：demo+locked 门拦钩子输入（tapBubble/tapSubmit 均返 null）
   ⑨ 星级规则+目标色恒 ≥2+非目标不破+出顶不罚（引擎级：miss 公式 submitErr+cloudPops≥3 折 1 →
     0/1-2/≥3 → 3/2/1★；点光目标色立即补 ≥2；60s 模拟目标色从未 <2）
   ⑩ verify 提速断言：SPEED=0.12 且模拟钟以真实钟 ≥4 倍推进（泡移动/生成按 SPEED 缩放）
   ⑪ 真实点击单元（DOM pointerdown）：点 3 只目标泡（DOM 元素）→点「好了」按钮→题成；
     多数路径：点到 N+1 再真实点击「好了」→wrong_more 清零
   ⑫ r9 倒计时收尾单元（flat8=章后段 lv3 全周期 + flat0/2 非计时 + estMs/nextHint 家族）：
     timed 规则表（flat%5>=3 全 40 关）/ quiet 静默（#timer 不显）→ count 可见（琥珀条 on+收缩+low）
     → 点泡仍可计数 → 超时 sleep（泡泡缓浮=模拟钟显著放慢、点泡/提交软吞 'sleep' 零惩罚、
     泡不破计数不动）→ 自动温和重来（计数清零+重臂 quiet+sleep 类摘除+miss/submitErr/step 全不动）；
     count 期答对=计时取消（新题 quiet 重臂）；非计时关恒 'off'；
     estMs 家族（n*345+600 定版，禁 +300 变体）/ nextHint 章末逐点独立副本断言（SPEC §2-r9 文案
     重列，含生成关章中段 off-by-one 哨兵 21 与 M1 哨兵 4）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- r9 独立副本：SPEC §2-r9 数值/文案/时长/计时模型重列（禁引 TAP_MS/QUIET_SEC/CHAPTERS 等引擎常量互证） ---- */
  const V_EST = c => c * 345 + 600;              /* estMs 家族定版（n=码点数，禁 +300 变体） */
  const V_TAP = 2000, V_SUBMIT = 120, V_RIGHT = 2400, V_MIN = 40000;
  const V_SPEECH_LEN = 8;                        /* 题句恒 8 码点：'点破'+数词1+'个'+颜色词2+'泡泡' */
  const V_TIMEDLV = 3, V_COUNT = 12;             /* 章后段=lv>=3；可见倒计时 12s */
  const vQuiet = n => 16 + 2 * n;                /* 静默数数窗（SPEC §2-r9） */
  function vDur(q) { return V_EST(V_SPEECH_LEN) + q.n * V_TAP + V_SUBMIT + V_RIGHT; }
  const vLevelDur = L => L.quizzes.reduce((s, q) => s + vDur(q), 0);
  const durAll = [];
  let durMin = Infinity, durMax = 0;

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  let sawCloudLv = 0, sawBig = false, sawNopeLv = 0;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes) &&   // 题面确定性（含色）
      JSON.stringify(L1.colors) === JSON.stringify(L2.colors);                 // 关色板确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      if (!structOk(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1].n : null, L1.colors)) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    /* 关色板章规则：ch1 单色（flat0 恒蓝）/ ch2 恰蓝+黄 / ch3 三色 / ch4 2-3 色 */
    let palOk = true;
    if (L1.dch === 1 && L1.colors.length !== 1) palOk = false;
    if (L1.dch === 2 && !(L1.colors.length === 2 && L1.colors.indexOf('blue') >= 0 &&
        L1.colors.indexOf('yellow') >= 0 && L1.colors.indexOf('pink') < 0)) palOk = false;
    if (L1.dch === 3 && L1.colors.length !== 3) palOk = false;
    if (L1.dch === 4 && !(L1.colors.length >= 2 && L1.colors.length <= 3)) palOk = false;
    if (flat === 0 && !(L1.colors.length === 1 && L1.colors[0] === 'blue')) palOk = false;
    /* 泡场确定性：同 flat 两场并行 tick 20s（无点破）逐帧一致 */
    const F1 = engField(genLevel(flat)), F2 = engField(genLevel(flat));
    let detField = true;
    for (let s = 0; s < 400; s++) {
      engFieldTick(F1, 0.05); engFieldTick(F2, 0.05);
      if (JSON.stringify(F1.bubbles) !== JSON.stringify(F2.bubbles)) { detField = false; break; }
    }
    if (F1.sawCloud) sawCloudLv++;
    if (F1.sawBig) sawBig = true;
    /* 引擎直驱：非目标色探针（dch≥2 首题一次）→ 逐题点目标色至 N → engSubmit right/done */
    const FL = engField(L1);
    let driveOk = true;
    for (let k = 0; k < L1.quizzes.length && driveOk; k++) {
      const q = L1.quizzes[k];
      if (k === 0 && L1.colors.length >= 2) {          // 非目标色探针：'nope' 不破不移除不计数
        const nb = FL.bubbles.find(b => b.kind === 'color' && b.color !== q.color);
        if (nb) {
          const c0 = q._cnt, len0 = FL.bubbles.length;
          const rn = engTapBubble(FL, nb.id);
          if (rn !== 'nope' || q._cnt !== c0 || FL.bubbles.length !== len0 ||
              !FL.bubbles.some(b => b.id === nb.id)) driveOk = false;
          else sawNopeLv++;
        }
      }
      let guard = 0;
      while (q._cnt < q.n && guard++ < 200) {
        const b = engFirstColor(FL, q.color);
        if (!b) { engFieldTick(FL, 0.3); continue; }
        if (engTapBubble(FL, b.id) !== 'pop') { driveOk = false; break; }
      }
      if (!driveOk || q._cnt !== q.n) { driveOk = false; break; }
      const exp = k === L1.quizzes.length - 1 ? 'done' : 'right';
      if (engSubmit(FL) !== exp) driveOk = false;
    }
    const solvedAll = L1.done && L1.step === CH_LEN && (L1.cloudPops || 0) === 0 &&
      (L1.submitErr || 0) === 0 &&
      (L1.totalPops || 0) === L1.quizzes.reduce((s, q) => s + q.n, 0) && engStars(L1) === 3;
    /* r9：章后段 timed 规则（lv>=3）+ modeled 时长（独立副本 >= 40s 且与源模型逐关对账一致） */
    const durMs = vLevelDur(L1);
    durAll.push(durMs);
    if (durMs < durMin) durMin = durMs;
    if (durMs > durMax) durMax = durMs;
    if (durMs < V_MIN) ruleOk = false;
    if (levelDurMs(L1) !== durMs) ruleOk = false;
    if (L1.timed !== (L1.lv >= V_TIMEDLV)) ruleOk = false;
    const ok = det && ruleOk && palOk && detField && driveOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, colors: L1.colors, ok: ok, det: det, ruleOk: ruleOk,
      palOk: palOk, detField: detField, driveOk: driveOk, solvedAll: solvedAll,
      qs: L1.quizzes.map(q => q.n + q.color.slice(0, 2)) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  /* 全章有云（ch1 cloudMax=1 起）/ 章 4 大泡出现过 / 两色以上场非目标色探针命中（dch≥2=30 关） */
  total++;
  const genOk = sawCloudLv === 40 && sawBig && sawNopeLv >= 20;
  if (genOk) npass++;
  units.genAudit = { ok: genOk, sawCloudLv: sawCloudLv, sawBig: sawBig, sawNopeLv: sawNopeLv };

  /* ---- 共用小工具 ---- */
  const HEX_OF = { blue: '#6FBCE8', yellow: '#F7CE55', pink: '#F4A3C4' };
  const tgt = () => BB.bubbles.filter(b => b.kind === 'color' && b.color === BB.quiz.color)
    .sort((a, b) => a.y - b.y);
  async function popTo(nWant) {                 // 钩子点目标色泡至 count==nWant（含等 respawn）
    let g = 0;
    while (BB.quiz && BB.quiz.count < nWant && g++ < 400) {
      const t = tgt();
      if (!t.length) { await wait(30); continue; }
      if (await BB.tapBubble(t[0].id) !== 'pop') await wait(20);
    }
    return BB.quiz ? BB.quiz.count : -1;
  }

  /* ---- ② 点泡单元（flat0 目标色 / flat5 非目标色 / flat12 灰云；含 v2 计数器移除断言） ---- */
  total++;
  startLevel(0);
  const q0 = BB.quiz;
  const noCounter = document.getElementById('count-n') === null;        // v2 关键改造：计数显示已删
  const cardOk = (function () {                                          // 目标卡=目标色色卡+目标数
    const svg = $id('bicon').innerHTML;
    return $id('target-n').textContent === '3' && svg.indexOf(HEX_OF.blue) >= 0;
  })();
  const initOk = q0 && q0.n === 3 && q0.color === 'blue' && tgt().length >= 2 && BB.bubbles.length >= 4;
  const t1 = tgt();
  const r1 = await BB.tapBubble(t1[0].id);                 // 首点：计数 1（钩子真值）
  const cntOk = r1 === 'pop' && BB.quiz.count === 1 && BB.quiz.pops === 1 && BB.quiz.miss === 0;
  const againOk = (await BB.tapBubble(t1[0].id)) === false; // 已破泡再点=轻叮 false 零惩罚
  const badIdx = (await BB.tapBubble(99999)) === false;     // 非法 id false
  /* flat5（ch2 两色场）：点非目标色='skip'+泡不破+计数/miss 不动 */
  startLevel(5);
  const q5 = BB.quiz;
  let other = null, g5 = 0;
  while (!other && g5++ < 200) {
    const o = BB.bubbles.filter(b => b.kind === 'color' && b.color !== BB.quiz.color);
    if (o.length) other = o[0]; else await wait(30);
  }
  const c5b = BB.quiz.count;
  const r5 = other ? await BB.tapBubble(other.id) : null;
  const nopeOk = !!other && r5 === 'skip' && BB.quiz.count === c5b && BB.quiz.miss === 0 &&
    BB.quiz.pops === 0 && BB.bubbles.some(b => b.id === other.id);      // 泡不破：仍在场
  const pal5 = BB.currentLevel.colors.indexOf('blue') >= 0 &&
    BB.currentLevel.colors.indexOf('yellow') >= 0 && BB.currentLevel.colors.length === 2;
  /* flat12（ch3）：点灰云='skip'+破+cloudPops+1+miss 不动（<3 不折） */
  startLevel(12);
  let cloud2 = null, g12 = 0;
  while (!cloud2 && g12++ < 200) {
    cloud2 = BB.bubbles.find(b => b.kind === 'cloud');
    if (!cloud2) await wait(30);
  }
  const rc = cloud2 ? await BB.tapBubble(cloud2.id) : null;
  const cloudOk = !!cloud2 && rc === 'skip' && BB.quiz.count === 0 && BB.quiz.cloudPops === 1 &&
    BB.quiz.miss === 0 && !BB.bubbles.some(b => b.id === cloud2.id);
  const tapOk = noCounter && cardOk && initOk && cntOk && againOk && badIdx && nopeOk && pal5 && cloudOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, noCounter: noCounter, cardOk: cardOk, init: initOk, r1: r1, cntOk: cntOk,
    again: againOk, badIdx: badIdx, nope: { ok: nopeOk, r: r5 }, cloud: { ok: cloudOk, r: rc } };

  /* ---- ③ 提交单元（flat0 四路径串测：空提交→少点→多点→点够→autoSolve 收尾） ---- */
  total++;
  startLevel(0);
  const r0 = await BB.tapSubmit();                         // 空提交（count=0 直接拍「好了」）
  const emptyOk = r0 === 'wrong_less' && BB.quiz.count === 0 && BB.quiz.submitErr === 0 &&
    BB.quiz.miss === 0 && BB.quiz.step === 0;              // 与少点同分支：不 miss 继续点（m4 补）
  await popTo(2);                                          // 题0 n=3：先点 2 个
  const rl = await BB.tapSubmit();
  const lessOk = rl === 'wrong_less' && BB.quiz.count === 2 && BB.quiz.submitErr === 0 &&
    BB.quiz.miss === 0 && BB.quiz.step === 0;              // 少点：不清空不 miss 继续点
  await popTo(4);                                          // 点到 4（N+1=多点）
  const tBefore = field.t;                                 // 泡场重置证据：模拟钟归零重启
  const rm = await BB.tapSubmit();
  const moreOk = rm === 'wrong_more' && BB.quiz.count === 0 && BB.quiz.submitErr === 1 &&
    BB.quiz.miss === 1 && BB.quiz.step === 0 && field.t < tBefore;   // 多点：清零+miss+1+泡场重置
  await popTo(3);                                          // 重新点到 3 → 提交 → right
  const rr = await BB.tapSubmit();
  const rightOk = rr === 'right' && BB.quiz.step === 1 && BB.quiz.count === 0;
  const a3 = await BB.autoSolve();                         // 收尾剩余题
  const lv3 = BB.currentLevel;
  const subOk = emptyOk && lessOk && moreOk && rightOk && a3.done && lv3.done && lv3.won &&
    lv3.submitErr === 1 && lv3.miss === 1 && engStars(cur) === 2;
  if (subOk) npass++;
  units.submit = { ok: subOk, empty: { ok: emptyOk, r: r0 }, less: { ok: lessOk, r: rl }, more: { ok: moreOk, r: rm },
    right: { ok: rightOk, r: rr }, finish: { done: lv3.done, miss: lv3.miss, stars: engStars(cur) } };

  /* ---- ④ UI 冒烟 A：flat0 干净 autoSolve 通关（0 错=3 星，不弹层） ---- */
  total++;
  startLevel(0);
  const wantTaps = cur.quizzes.reduce((s, q) => s + q.n, 0);
  const a0 = await BB.autoSolve();
  const lv0 = BB.currentLevel;
  const smokeA = a0.done && a0.taps === wantTaps && lv0.done && lv0.won &&
    lv0.miss === 0 && engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, want: wantTaps, stars: engStars(cur) };

  /* ---- ⑤ UI 冒烟 B：flat12 连点 3 次灰云（≥3 折 1 miss）→ autoSolve（2 星） ---- */
  total++;
  startLevel(12);
  let hitClouds = 0, g5b = 0;
  while (hitClouds < 3 && g5b++ < 400) {
    const c = BB.bubbles.find(b => b.kind === 'cloud');
    if (!c) { await wait(30); continue; }
    if (await BB.tapBubble(c.id) === 'skip') hitClouds++;
  }
  const foldMid = BB.quiz.cloudPops === 3 && BB.quiz.miss === 1 && BB.quiz.submitErr === 0;
  const a10 = await BB.autoSolve();
  const lv10 = BB.currentLevel;
  const smokeB = hitClouds === 3 && foldMid && a10.done && lv10.done && lv10.won &&
    lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat12 = { ok: smokeB, hitClouds: hitClouds, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑥ 布局：双 viewport ×（章 3 / 章 4）量测 offsetWidth/offsetHeight ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    /* M-A1：竖屏模拟须注入 .port 类吃到竖屏 CSS（媒体查询跟视口不跟元素） */
    document.body.classList.toggle('port', w < h);
    startLevel(g._simFlat);
    engFieldTick(field, 0.03);
    renderField();
    const bs = Array.prototype.map.call(fieldEl.querySelectorAll('.bubble'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const hitOk = bs.length >= 4 && bs.every(b => b.w >= 64 && b.h >= 64);
    /* M-A1：rect 落容器断言（overflow:hidden 吞 scrollWidth 溢出，几何才是可见性真值） */
    const gr = g.getBoundingClientRect();
    const rectOk = Array.prototype.every.call(fieldEl.querySelectorAll('.bubble'), b => {
      const r = b.getBoundingClientRect();
      return r.left >= gr.left - 0.5 && r.right <= gr.right + 0.5 &&
             r.top >= gr.top - 0.5 && r.bottom <= gr.bottom + 0.5;
    });
    const cntOk = counterEl.offsetHeight >= 64;            // 目标卡可视高度（色卡+大数字承载）
    const subOk6 = submitBtn.offsetWidth >= 72 && submitBtn.offsetHeight >= 72;   // 「好了」大按钮
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');                // 清理，不泄漏到下一单元
    return { vp: w + 'x' + h, hitOk: hitOk, cntOk: cntOk, subOk: subOk6, rect: rectOk, ox: ox,
      bubbles: bs.length, minW: bs.length ? Math.min.apply(null, bs.map(b => b.w)) : 0,
      pass: hitOk && cntOk && subOk6 && rectOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [10, 15]) {
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

  /* ---- ⑦ clips：bub_ 7 条（r9 增 bub_timeup）+ core 3 条全注入 + 实长断言（2026-09-13/09-14 合成后 ffprobe 实测，±60ms）
     T46 阶段2（2026-09-19）：题面 18（bub_q_{n}_{色} N∈3-8×蓝/黄/粉）+跟数 8（bub_n_1..8）
     +演示强调 1（bub_enough）clip 化——新键族在场断言（neighbors T46 先例），总 37=34 bub+3 core ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['bub_tut_watch', 'bub_tut_turn', 'bub_hint', 'bub_right', 'bub_wrong_more',
                'bub_wrong_less', 'bub_timeup'];
  const T46_KEYS = [3, 4, 5, 6, 7, 8].reduce((a, n) => a.concat(['blue', 'yellow', 'pink'].map(c => 'bub_q_' + n + '_' + c)), [])
    .concat(Array.from({ length: 8 }, (_, i) => 'bub_n_' + (i + 1))).concat(['bub_enough']);
  const SPEC_DUR = { bub_tut_watch: 3336, bub_tut_turn: 3696, bub_hint: 3768,
                     bub_right: 2952, bub_wrong_more: 2808, bub_wrong_less: 2712,
                     bub_timeup: 3936 };
  const durs = await Promise.all(need.map(k => new Promise(res => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; res(-1); } }, 8000);
    const a = new Audio(KIDS.voice.clips[k]);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.load();
  })));
  const clipsOk = keys.length === 37 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0) &&
    T46_KEYS.every(k => !!KIDS.voice.clips[k] && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0) &&
    durs.every((d, i) => Math.abs(d - SPEC_DUR[need[i]]) <= 60);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, t46: T46_KEYS.length, keys: keys, durs: durs };

  /* ---- ⑧ 教学/演出吞输入单元：demo+locked 门拦钩子输入（tapBubble/tapSubmit 均返 null） ---- */
  total++;
  startLevel(0);
  const cid = BB.bubbles.find(b => b.kind === 'color').id;
  state.demo = true; state.locked = true;                  // 模拟教学"看"演示期
  const swallow1 = (await BB.tapBubble(cid)) === null;
  const swallow1b = (await BB.tapSubmit()) === null;
  state.demo = false; state.locked = true;                 // 演出窗口（locked）
  const swallow2 = (await BB.tapBubble(cid)) === null;
  const swallow2b = (await BB.tapSubmit()) === null;
  state.locked = false;                                    // 还原
  const swallowOk = swallow1 && swallow1b && swallow2 && swallow2b && BB.quiz.count === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, demoSub: swallow1b,
    locked: swallow2, lockedSub: swallow2b };

  /* ---- ⑨ 星级规则 + 目标色恒 ≥2 + 非目标不破 + 出顶不罚（引擎级直驱） ---- */
  total++;
  const mkL = (se, cp) => ({ submitErr: se, cloudPops: cp });
  const starsOk = engStars(mkL(0, 0)) === 3 && engStars(mkL(1, 0)) === 2 && engStars(mkL(2, 0)) === 2 &&
    engStars(mkL(3, 0)) === 1 && engStars(mkL(9, 0)) === 1 && engStars(mkL(0, 2)) === 3 &&
    engStars(mkL(0, 3)) === 2 && engStars(mkL(0, 9)) === 2 && engStars(mkL(2, 3)) === 1;
  const L9 = genLevel(12);                                 // 章 3（三色+云朵）
  const F9 = engField(L9);
  const id0 = F9.nextId;
  let popped = 0, minT = 99, dupOk = false;
  while (engLiveTarget(F9) > 0) {                          // 点光所有目标色泡（非目标/云不动→不增 miss）
    const b = engFirstColor(F9, engTargetColor(F9));
    if (!b) break;
    if (engTapBubble(F9, b.id) !== null) popped++;
  }
  dupOk = engTapBubble(F9, (popped > 0 ? id0 : 9999)) === null;   // 已破泡/不存在 id → null
  engFieldTick(F9, 0.05);                                  // 跌破 2 → 立即补 ≥2（目标色）
  const refillOk = engLiveTarget(F9) >= 2;
  for (let s = 0; s < 1200; s++) {                         // 60s 模拟：目标色彩泡从未 <2、出顶回收
    engFieldTick(F9, 0.05);
    const c = engLiveTarget(F9);
    if (c < minT) minT = c;
  }
  const recycleOk = F9.nextId > id0;                       // 出顶移除+补位（新 id 证明循环）
  const noPen = (L9.cloudPops || 0) === 0 && (L9.submitErr || 0) === 0 &&
    (L9.totalPops || 0) === popped;
  const fieldOk = starsOk && dupOk && refillOk && minT >= 2 && recycleOk && noPen;
  if (fieldOk) npass++;
  units.field = { ok: fieldOk, stars: starsOk, refill: refillOk, minTarget: minT,
    recycle: recycleOk, noPen: noPen, popped: popped };

  /* ---- ⑩ verify 提速断言：SPEED=0.12 且模拟钟 ≥4 倍真实钟（泡移动/生成按 SPEED 缩放） ---- */
  total++;
  const vOk = () => {                                      // 引擎位移数学：v=1/riseSec（章区间内）
    const L = genLevel(2);
    const F = engField(L);
    const b = F.bubbles[0];
    const y0 = b.y, v0 = b.v;
    engFieldTick(F, 0.5);
    return Math.abs((b.y - y0) - v0 * 0.5) < 1e-9 && v0 >= 1 / CHAPTERS[L.dch].riseMax &&
      v0 <= 1 / CHAPTERS[L.dch].riseMin;
  };
  startLevel(0);
  const t0 = field.t;
  await wait(300);                                         // 真实 300ms → 模拟 ≥1.2s（=8.3 倍缩放）
  const clockOk = field.t - t0 > 1.2;
  const speedOk = SPEED === 0.12 && vOk() && clockOk;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED, simAdvanced: Math.round((field.t - t0) * 100) / 100 };

  /* ---- ⑪ 真实点击单元（DOM pointerdown 冒泡到容器/按钮处理器） ---- */
  total++;
  startLevel(0);
  const click = el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  let clicked = 0, g11 = 0;
  while (clicked < 3 && g11++ < 300) {                     // 真实点击 3 只目标色泡（DOM 元素命中）
    const t = tgt();
    if (!t.length) { await wait(30); continue; }
    const el = fieldEl.querySelector('.bubble[data-id="' + t[0].id + '"]');
    if (!el) { await wait(30); continue; }
    click(el);
    await wait(50);
    if (BB.quiz.count > clicked) clicked = BB.quiz.count;
  }
  const domTapOk = clicked === 3;
  click(submitBtn);                                        // 真实点击「好了」→ 题 0 成（step 1）
  let st1 = -1, g11b = 0;
  while (g11b++ < 120) {
    const q = BB.quiz;
    st1 = q ? q.step : 5;
    if (st1 >= 1 || BB.currentLevel.done) break;
    await wait(30);
  }
  const domSubOk = st1 === 1 && BB.quiz.count === 0;
  const n1 = BB.quiz.n;                                    // 多数路径：点到 N+1 再真实点击提交
  await popTo(n1 + 1);
  click(submitBtn);
  let mOk = false, g11c = 0;
  while (g11c++ < 120) {
    const q = BB.quiz;
    if (q && q.count === 0 && q.submitErr === 1 && q.step === 1) { mOk = true; break; }
    await wait(30);
  }
  const realOk = domTapOk && domSubOk && mOk;
  if (realOk) npass++;
  units.realclick = { ok: realOk, domTap: domTapOk, domSubmit: domSubOk, wrongMore: mOk };

  /* ---- ⑫ r9 倒计时收尾单元（flat8=章后段 lv3 全周期 / flat0+flat2 非计时 / 规则表） ---- */
  total++;
  const timEl = $id('timer');
  let timedRuleOk = true;                            /* SPEC §2-r9：timed === flat%5>=3（独立字面） */
  for (let f = 0; f < 40; f++) {
    if (genLevel(f).timed !== (f % 5 >= 3)) timedRuleOk = false;
  }
  startLevel(2);                                     /* 非计时关（lv2）：恒 off 不显条 */
  await wait(300);
  const offA = BB.timer.timed === false && BB.timer.phase === 'off' && !timEl.classList.contains('on');
  startLevel(0);
  await wait(300);
  const offB = BB.timer.timed === false && BB.timer.phase === 'off' && !timEl.classList.contains('on');
  /* 章后段全周期（flat8：ch2 lv3 题0 n=4 → 静默窗 vQuiet(4)=24s） */
  startLevel(8);
  const q8 = BB.quiz, n8 = q8.n;
  let okA = BB.timer.timed === true && BB.timer.phase === 'quiet' && !timEl.classList.contains('on') &&
    BB.timer.quietRemain != null && BB.timer.quietRemain <= vQuiet(n8) && BB.timer.quietRemain > vQuiet(n8) - 4;
  await popTo(Math.min(2, n8));                      /* quiet 期点泡仍计数（计时不打断数数） */
  const cntQuiet = BB.quiz.count;
  okA = okA && cntQuiet === Math.min(2, n8);
  let sawCount = false, w1 = 0;                      /* 等 count 相位（正常 ~2.9s 真实，兜底 15.6s） */
  while (w1++ < 260) {
    if (BB.timer.phase === 'count') { sawCount = true; break; }
    await wait(60);
  }
  const remA = BB.timer.remain, wA = timEl.firstElementChild.style.width;
  okA = okA && sawCount && timEl.classList.contains('on') &&
    remA != null && remA <= V_COUNT && remA > V_COUNT - 2 && parseFloat(wA) > 60;
  const tc = tgt();                                  /* count 期点泡仍计数 */
  if (tc.length) await BB.tapBubble(tc[0].id);
  okA = okA && BB.quiz.count === cntQuiet + 1;
  let sawLow = false, w2 = 0;                        /* 末段 remain<3.05 → .low 橙脉冲 */
  while (w2++ < 200) {
    if (timEl.classList.contains('low')) { sawLow = true; break; }
    if (BB.timer.phase !== 'count') break;
    await wait(40);
  }
  okA = okA && sawLow;
  let sawSleep = false, w3 = 0;                      /* 超时 → sleep（泡泡缓浮不爆） */
  while (w3++ < 200) {
    if (BB.timer.phase === 'sleep') { sawSleep = true; break; }
    await wait(15);
  }
  okA = okA && sawSleep && fieldEl.classList.contains('sleep') && !timEl.classList.contains('on');
  const s0 = field.t;                                /* 缓浮实证：sleep 期模拟钟显著放慢
                                                       （正常 1/SPEED≈8.33 sim/s；×DRIFT 后 ≈1.67） */
  await wait(120);
  const driftRate = (field.t - s0) / 0.12;
  okA = okA && driftRate > 0.4 && driftRate < 4.2;
  const pre = BB.quiz;                               /* 静息软吞：点泡/提交 'sleep' 零惩罚泡不破 */
  const tb = tgt()[0];
  const rSlp = tb ? await BB.tapBubble(tb.id) : null;
  const rSub = await BB.tapSubmit();
  const post = BB.quiz;
  okA = okA && rSlp === 'sleep' && rSub === 'sleep' &&
    post.count === pre.count && post.miss === pre.miss && post.submitErr === pre.submitErr &&
    post.step === pre.step && post.cloudPops === pre.cloudPops &&
    (tb ? BB.bubbles.some(b => b.id === tb.id) : false);
  let rolled = false, w4 = 0;                        /* 自动温和重来：计数清零+重臂+sleep 摘除+星级无损 */
  while (w4++ < 200) {
    if (BB.timer.phase === 'quiet') { rolled = true; break; }
    await wait(30);
  }
  const rolledOk = rolled && BB.quiz.count === 0 && !fieldEl.classList.contains('sleep') &&
    BB.quiz.miss === 0 && BB.quiz.submitErr === 0 && BB.quiz.step === 0 && engStars(cur) === 3;
  let sawCount2 = false, w5 = 0;                     /* count 期答对=计时取消（新题 quiet 重臂） */
  while (w5++ < 260) {
    if (BB.timer.phase === 'count') { sawCount2 = true; break; }
    await wait(60);
  }
  await popTo(BB.quiz.n);
  const rRight = await BB.tapSubmit();
  const cancelOk = sawCount2 && rRight === 'right' && BB.quiz.step === 1 &&
    BB.timer.phase === 'quiet' && BB.timer.timed === true && !timEl.classList.contains('on');
  const countOk = timedRuleOk && offA && offB && okA && rolledOk && cancelOk;
  if (countOk) npass++;
  units.r9count = { ok: countOk, timedRule: timedRuleOk, off: offA && offB, cycle: okA,
    driftRate: Math.round(driftRate * 100) / 100, rolled: rolledOk, cancel: cancelOk, n8: n8 };

  /* ---- ⑫b estMs 家族 + nextHint 章末逐点独立副本断言（SPEC §2 文案重列） ---- */
  total++;
  const estOk = estMs(1) === 945 && estMs(12) === 12 * 345 + 600 &&
    estMs.toString().indexOf('345') >= 0 && estMs.toString().indexOf('+ 300') < 0;
  /* 静态章末 flat∈{4,9,14} 预告下一章；19=ch4 末→生成关 flat20（dch1）；
     21=生成关章中段（dch(22)=1→GEN[0]；旧式 (ci+1)%4 会错给 GEN[1]——契约 F off-by-one 哨兵）；
     24→flat25（dch2）；29→flat30（dch3）；负哨兵=nextHint(4)≠ch3 文案（M1 同型） */
  const SPEC_HINT = { 4: '下次泡泡有两种颜色，听好点哪种', 9: '又多了一种颜色，数要更大啦',
    14: '泡泡有快有慢，数清楚了再按大对勾', 19: '新一轮泡泡数数挑战',
    21: '新一轮泡泡数数挑战', 24: '更多泡泡快点一点', 29: '听好颜色再点' };
  const hintOk = Object.keys(SPEC_HINT).every(f => nextHint(+f) === SPEC_HINT[f]);
  const hintNeg = nextHint(4) !== '泡泡有快有慢，数清楚了再按大对勾' &&
    nextHint(21) !== '更多泡泡快点一点';
  const famOk = estOk && hintOk && hintNeg;
  if (famOk) npass++;
  units.r9fam = { ok: famOk, estMs: estOk, hintOk: hintOk && hintNeg,
    durMin: durMin, durMax: durMax, durLevels: durAll.length };

  const out = { game: 'bubble', total: total, pass: npass, layoutOk: layoutOk,
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
