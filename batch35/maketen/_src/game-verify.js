/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元
   ① structure：NUMCN 表 1-20 全量 20 值双录对账（契约 L）/卡池 DOM 互异且渲染
      即引擎（.cv 文本===pool[i].v）/target 大字（≥40px）/DOM 无 undefined/
      契约 O（自建 button 显式 color）/clips 31 条（mt_ 6+mt_s 2+mt_n 20+core 3）
      全注入+duration 辨别器（±60ms）/双 viewport×（flat0 池 4/flat10 池 4/flat15 池 5）
      布局（卡 ≥96×96、伙伴卡 ≥96 宽、描边对比度 ≥3:1、overflowX ≤0）
   ② tutorial：教学三段（watch=3+7 收银演示→__mtDemoR='right'；turn 首题定制
      形态断言 target=10/a=2/池 3 张[9,8,7]/answer 独立复算；帮→首对独
      __mtTutSolo+进正式关 flat=0 n=5；watch 段实测 ≤16s）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null/章号映射/
      SPEC §0.86 独立对账（answer=独立复算池中唯一 a+v=target 的 i——禁读
      quiz.answer 当期望源/池互异含补数唯一/干扰域 1-9|2-18+禁 a 本身/
      a 域按章/ch4 关内三 target 全现）/引擎直驱 tapCard(answer)→right/
      末题 done→全关 3 星
   ④ frameM（契约 M 帧内容三层）：题面帧（target 大字===quiz.target/伙伴卡值
      ===quiz.a/卡池 .cv===pool[i].v 互异恒全摆）/收银后卡 gone/错点后卡数
      不变（池恒全摆）
   ⑤ wrongPath：tapCard 非补数卡→'wrong'+miss 计数+两级链头区分（__lastQueue[0]
      =mt_wrong_more（和>target）/mt_wrong_less（和<target）取证）+错链
      [head,mt_hint] 全 clip；豁免窗（真时钟 6018）内二击被吞 false 且 miss
      不变；窗后第二错照计 miss=2（契约 I 补）
   ⑥ gradient：首错=方向级（错卡 wig+题面重锚 pulse，正确卡无 breathe）；
      miss≥2=正确卡 breathe（答案级）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32(flat*
      7919+523) 独立复算）+四档全现+每关池张数与 dch 域一致+先验静态验算
      （同 ③ 全量）+ch4 关内三 target 全现+确定性；ch4 flat20-24 三 target
      分布记录（汇报用）
   ⑨ windows+contract：错链豁免窗静态=6018（两链 max：more 5970/less 6018）
      +确认链窗 10100 ≥ 全域最坏链 10098（T46 clip 口径：SPEC_MT_N 表按 a 域
      全枚举独立复算）+demo 窗 9700 ≥ 9642+教学延窗+
      契约 A/B/C/E/F/I/J/K 源码断言（读自身合并 script 文本）
   ⑩ confirmChain：确认链构成（T46 化）=[mt_right, mt_n_A, mt_s_add, mt_n_X,
      mt_s_eq, mt_n_T] 6 段全 string clip 拼播（零 keyless）——段键与 quiz
      a/target 独立推导对账；题面大字===quiz.target
   ⑪ save：真实写档链（init maketen→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_maketen v:'1.0' levels['1-0'] 更新；
      **origLS 模式：测前保存 localStorage.getItem('kidsgame_maketen')，测后
      恢复——b34 坑②，防毁真实玩家档**）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+quiz 形态（target=10/a∈2-8/池 4/step=0）+answer 独立复算
      +freshTut 分支源码在场+window.MT 真实页暴露（b29 坑⑥）
   结果写 #verify-result + window.__mtVlog + document.title='VERIFY PASS n/n'
   驱动细节：演出窗吞 null → tapRetry 轮询重试带 300ms 间隔（b34 坑④） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH35 §0.86/§2/§4 文字独立重列（禁抄页面 NUMCN/VOICE/CH_CFG/常量） */
  const SPEC_DUR = { mt_tut_watch: 3264, mt_tut_turn: 1776, mt_hint: 2496,
                     mt_right: 2472, mt_wrong_more: 3024, mt_wrong_less: 3072,
                     mt_s_add: 1152, mt_s_eq: 1320 };   /* T46 段键（voice/clips 实测 09-19） */
  const SPEC_MT_N = { 1: 1128, 2: 1128, 3: 1224, 4: 1224, 5: 1128, 6: 1152, 7: 1176,
                      8: 1152, 9: 1128, 10: 1248, 11: 1416, 12: 1368, 13: 1416, 14: 1440,
                      15: 1440, 16: 1464, 17: 1440, 18: 1392, 19: 1464, 20: 1416 };   /* T46 数词段实长 */
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_CH = { 1: { pool: 4, target: 10 }, 2: { pool: 5, target: 10 },
                    3: { pool: 4, target: 15 }, 4: { pool: 5, target: 0 } };   /* ch4 target=0 表混合 */
  const SPEC_A = { 10: [1, 9], 15: [6, 9], 20: [11, 18] };                     /* a 域按 target */
  const SPEC_DD = { 10: [1, 9], 15: [2, 18], 20: [2, 18] };                    /* 干扰域 */
  const SPEC_NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六',
                       7: '七', 8: '八', 9: '九', 10: '十', 11: '十一', 12: '十二',
                       13: '十三', 14: '十四', 15: '十五', 16: '十六', 17: '十七',
                       18: '十八', 19: '十九', 20: '二十' };
  const SPEC_CHAPTER_HINTS = { 1: '所有数字都要来凑十啦', 2: '这次要凑十五咯，先看题面',
                               3: '目标会换来换去，看清楚再凑', 4: '新一轮凑卡开店开始' };
  const SPEC_GEN_HINTS = ['四张卡里凑十', '五张卡里凑十', '这次凑十五', '目标会换，看清再凑'];
  /* T46 clip 链实长独立复算（SPEC 域推导——estMs TTS 估长口径退役 09-19）：
     6 段链=mt_right+5×gap+mt_n[a]+mt_s_add+mt_n[x]+mt_s_eq+mt_n[t]+pad */
  const CHAIN_GAP = 150, WIN_PAD = 300;           /* core queue 段间 150ms / 窗余量 300（家族 G/H） */
  const chainMs = (a, x, t) => SPEC_DUR.mt_right + 5 * CHAIN_GAP + SPEC_MT_N[a] +
    SPEC_DUR.mt_s_add + SPEC_MT_N[x] + SPEC_DUR.mt_s_eq + SPEC_MT_N[t] + WIN_PAD;
  /* 独立推导（SPEC §0.86 验证锚）：answer=池中唯一满足 a+v=target 的 i（无唯一解=-1）
     ——禁读 quiz.answer 当期望源 */
  function deriveAnswerV(a, target, poolVs) {
    let idx = -1, cnt = 0;
    for (let i = 0; i < poolVs.length; i++) if (a + poolVs[i] === target) { idx = i; cnt++; }
    return cnt === 1 ? idx : -1;
  }
  /* 独立 rng（SPEC §0.86 生成关策略）：mulberry32(flat*7919+523)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  /* b34 坑④：演出窗吞 null → 轮询重试带 300ms 间隔（禁紧循环重试） */
  const tapRetry = async i => {
    for (let t = 0; t < 300; t++) {
      const r = await window.MT.tapCard(i);
      if (r !== null) return r;
      await wait(300);
    }
    return null;
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：key 空缺带 text 的 TTS 段播完即
     return 丢弃后续段——T46 化零 keyless 政策后本款链恒全 string，出现 keyless
     段即违背政策（①⑩ 段键全 string 断言+本谓词恒 false 复核） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);

  /* ---- ① structure：NUMCN 双录对账+DOM 干净+契约 O+clips 全注入+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.MT.quiz;
  /* NUMCN 1-20 全量 20 值双录对账（契约 L：2=两/1-20 常规十一..二十） */
  const cnOk = Object.keys(NUMCN).length === 20 &&
    Array.from({ length: 20 }, (_, i) => i + 1).every(n => NUMCN[n] === SPEC_NUMCN[n]);
  /* 卡池 DOM 互异且渲染即引擎：.cv 文本===pool[i].v */
  const cardsDom1 = Array.from(poolEl.querySelectorAll('.card'));
  const poolOk1 = q1 && cardsDom1.length === q1.pool.length &&
    cardsDom1.every((c, i) => Number(c.querySelector('.cv').textContent) === q1.pool[i].v) &&
    new Set(cardsDom1.map(c => c.querySelector('.cv').textContent)).size === cardsDom1.length;
  const buddyOk1 = document.getElementById('buddy-num').textContent === String(q1.a);
  const tnum = document.getElementById('target-num');
  const tOk1 = tnum.textContent === String(q1.target) &&
    parseFloat(getComputedStyle(tnum).fontSize) >= 40;                  /* target 大字 */
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  const oOk = getComputedStyle(rabbitBtn).color === 'rgb(74, 59, 46)';  /* 契约 O：自建 button 显式 color */
  /* clips：mt_ 6+mt_s 2+mt_n 20+core 3=31 全注入+实长辨别（SPEC §4 实长表 ±60ms；
     core 3 条只验在场——core 实长不在本批实长表，禁猜值断言） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const specNumKeys = Array.from({ length: 20 }, (_, i) => 'mt_n_' + (i + 1));   /* T46 数词段 20 键 */
  const preOk = keysAll.length === 31 &&
    specKeys.concat(SPEC_CORE_KEYS, specNumKeys).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 池 4/flat10 池 4·凑 15/flat15 池 5·混合）——卡=主答案目标 ≥96×96 */
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
    const wraps = Array.from(poolEl.querySelectorAll('.card'));
    if (g._simFlat >= 20)   /* m4 守卫：生成关 dch 随机禁按章硬算池数（防假阴性）——直接判不过 */
      return { vp: w + 'x' + h, flat: g._simFlat, cards: wraps.length, hitOk: false, sceneOk: false,
               contrast: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    const need = SPEC_CH[Math.floor(g._simFlat / 5) + 1].pool;
    const hitOk = wraps.length === need && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const sceneOk = buddyEl.offsetWidth >= 96 && buddyEl.offsetHeight >= 110 &&
                    sceneEl.offsetWidth >= 64 && sceneEl.offsetHeight >= 64;
    const cB = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FFF9EE') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cards: wraps.length, hitOk: hitOk,
             sceneOk: sceneOk, contrast: cB, ox: ox,
             pass: hitOk && sceneOk && cB && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10, 15]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);
  const layoutOk = sims.every(s => s.pass);
  const s1ok = cnOk && poolOk1 && buddyOk1 && tOk1 && cleanDom && oOk && preOk && durOk && layoutOk;
  if (s1ok) npass++;
  units.structure = { ok: s1ok, numcn: cnOk, poolDom: poolOk1, buddy: buddyOk1, targetBig: tOk1,
                      dom: cleanDom, contractO: oOk, clips: preOk, dur: durOk,
                      layout: layoutOk, sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（看→帮→独） ---- */
  total++;
  window.__mtOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__mtTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__mtWatchMs || 1e9) / SPEED;       // watch 段实测（家族预算 ≤16s 只罩 watch）
  const qT0 = window.MT.quiz;
  const tutHelp = window.__mtDemoR === 'right' && state.tut === 'help' &&
                window.MT.currentLevel.flat === -1 &&
                qT0 && qT0.kind === 'ten' && qT0.target === 10 && qT0.a === 2 &&
                qT0.pool.length === 3 &&
                qT0.pool.map(c => c.v).join(',') === '9,8,7' &&            // turn 首题定制形态（2+□=10 池 3 张）
                qT0.answer === deriveAnswerV(2, 10, [9, 8, 7]) &&          // answer 独立复算
                twWatch <= 16000 && tw <= 26000;
  await unlocked();
  const qT = window.MT.quiz;                                // "帮"阶段放手题（turn 2+□=10）
  const rT = await tapRetry(qT.answer);                     // 首次选对 → 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__mtTutSolo === true &&
                window.MT.currentLevel.flat === 0 && window.MT.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__mtDemoR, tut: state.tut,
                     solo: window.__mtTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT };

  /* ---- ③ drive：静态 20 关全量审计+SPEC §0.86 独立对账（answer=独立复算，禁读直比） ---- */
  total++;
  const levelsRec = {};
  let badCase = null;
  const ch4Targets = {};
  for (let flat = 0; flat < 20; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, k);
      if (why) { badCase = 'struct ' + flat + '/' + k + ':' + why; ruleOk = false; }
    }
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = L1.dch === expCh;                               // 静态四档（flat<20）
    /* SPEC §0.86 独立对账（每题）：target/池张数/a 域按章/池互异含补数唯一
       （answer 独立复算）/干扰域+禁 a 本身 */
    let specOk = true;
    for (let k = 0; k < L1.quizzes.length && specOk; k++) {
      const q = L1.quizzes[k];
      const cfg = SPEC_CH[L1.dch];
      if (q.kind !== 'ten') { badCase = 'kind ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch !== 4 && q.target !== cfg.target) { badCase = 'target ' + flat + '/' + k; specOk = false; break; }
      if (q.pool.length !== cfg.pool) { badCase = 'poolN ' + flat + '/' + k; specOk = false; break; }
      const aLo = L1.dch === 1 ? 2 : SPEC_A[q.target][0];
      const aHi = L1.dch === 1 ? 8 : SPEC_A[q.target][1];
      if (q.a < aLo || q.a > aHi) { badCase = 'aRange ' + flat + '/' + k + ' a=' + q.a; specOk = false; break; }
      const vs = q.pool.map(c => c.v);
      if (new Set(vs).size !== vs.length) { badCase = 'poolDup ' + flat + '/' + k; specOk = false; break; }
      const expAns = deriveAnswerV(q.a, q.target, vs);            // 独立复算（SPEC §0.86 对账锚）
      if (expAns < 0 || q.answer !== expAns) { badCase = 'answer ' + flat + '/' + k; specOk = false; break; }
      const dom = SPEC_DD[q.target];
      for (let j = 0; j < vs.length; j++) {
        if (j === expAns) continue;
        if (vs[j] < dom[0] || vs[j] > dom[1]) { badCase = 'dDom ' + flat + '/' + k; specOk = false; break; }
        if (vs[j] === q.a) { badCase = 'dIsA ' + flat + '/' + k; specOk = false; break; }   // 禁 a 本身
      }
      if (!specOk) break;
    }
    /* ch4 关内三 target 全现（三目标切换=认知坡度主体） */
    const t3Ok = L1.dch !== 4 ||
      [10, 15, 20].every(t => L1.quizzes.some(q => q.target === t));
    if (!t3Ok && !badCase) badCase = 'ch4targets ' + flat;
    if (L1.dch === 4) ch4Targets[flat] = L1.quizzes.map(q => q.target);
    /* 引擎直驱：逐题点补数卡 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapCard(L3, deriveAnswerV(q.a, q.target, q.pool.map(c => c.v)));   // 驱动=独立复算 answer
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && ruleOk && chOk && dchOk && specOk && t3Ok && driveOk && solvedAll;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
  }
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]);
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase, genDch: {}, ch4: ch4Targets };

  /* ---- ④ frameM（契约 M 帧内容三层：题面帧/收银 gone/池恒全摆） ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q4 = window.MT.quiz;
  const cards4 = Array.from(poolEl.querySelectorAll('.card'));
  const frameQuiz = cards4.length === q4.pool.length && Number(poolEl.dataset.n) === q4.pool.length &&
    cards4.every((c, i) => Number(c.querySelector('.cv').textContent) === q4.pool[i].v) &&  /* 帧内容层 */
    document.getElementById('buddy-num').textContent === String(q4.a) &&                     /* 伙伴卡===quiz.a */
    document.getElementById('target-num').textContent === String(q4.target);                 /* 题面===quiz.target */
  const iW4 = (q4.answer + 1) % q4.pool.length;                       // 非补数卡（flat0 池 4 恒存在）
  const rW4 = await tapRetry(iW4);                                    // → wrong（错点）
  const poolStay = Array.from(poolEl.querySelectorAll('.card')).length === q4.pool.length;   /* 错点后卡数不变（恒全摆） */
  const el4 = poolCardAt(q4.answer);                                  // 收银前捕获补数卡元素引用
  const rR4 = await tapRetry(q4.answer);                              // → right（收银）
  const goneOk = el4.classList.contains('gone');                      /* 收银后卡 gone（飞进店里） */
  const q4n = window.MT.quiz;                                         // 新题（渲染即引擎）
  const buddyNext = q4n && document.getElementById('buddy-num').textContent === String(q4n.a);
  const frameOk = frameQuiz && rW4 === 'wrong' && poolStay && rR4 === 'right' && goneOk && buddyNext;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, quiz: frameQuiz, wrongR: rW4, poolStay: poolStay,
                   rightR: rR4, gone: goneOk, buddyNext: buddyNext };

  /* ---- ⑤ wrongPath：错路径+两级链头区分+豁免窗（真时钟 6018：窗内二击吞/窗后二错照计） ---- */
  total++;
  let f5 = -1, q5 = null, iMore = -1, iLess = -1;
  for (let flat = 0; flat < 3; flat++) {                // flat<3=每错必播链（两级链头均可取证）
    startLevel(flat);
    await unlocked();
    const q = window.MT.quiz;
    const vs = q.pool.map(c => c.v);
    let m = -1, l = -1;
    for (let i = 0; i < vs.length; i++) {
      if (i === q.answer) continue;
      if (q.a + vs[i] > q.target) m = i;
      if (q.a + vs[i] < q.target) l = i;
    }
    if (m >= 0 && l >= 0) { f5 = flat; q5 = q; iMore = m; iLess = l; break; }
  }
  const badTap = f5 >= 0 && (await window.MT.tapCard(99)) === null;   // 非法下标=null（不炸）
  const rM = await tapRetry(iMore);                      // 一错（和>target）→ mt_wrong_more 链头
  const headMore = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'mt_wrong_more' &&
                   window.__lastQueue[1] === 'mt_hint' &&
                   window.__lastQueue.every(p => typeof p === 'string');   // 错链全 clip 无 keyless
  await unlocked();                                     // 等首错演出锁尾窗（showUntil+140）过——豁免窗（真时钟 6018）仍在
  const rejW = await window.MT.tapCard(iLess);           // 豁免窗内二错（和<target）=被吞 false（I 补：不计 miss）
  const miss1 = rM === 'wrong' && rejW === false && window.MT.quiz.miss === 1;   /* 立即求值（二错前） */
  await new Promise(w => setTimeout(w, 6200));           // 等豁免窗（真时钟 6018）过——窗后二错照计
  const rL = await tapRetry(iLess);                      // 二错（和<target）→ mt_wrong_less 链头
  const headLess = window.__lastQueue && window.__lastQueue.length === 2 &&
                   window.__lastQueue[0] === 'mt_wrong_less' &&
                   window.__lastQueue[1] === 'mt_hint';
  const miss2 = rL === 'wrong' && window.MT.quiz.miss === 2;      // 卡不灰可重点（探索不罚）
  await unlocked();
  const rE = await tapRetry(q5.answer);
  const wrongOk = badTap && miss1 && headMore && miss2 && headLess && rE === 'right';
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, flat: f5, badTap: badTap, miss1: miss1, headMore: headMore,
                      rejInWin: rejW === false, miss2: miss2, headLess: headLess, right: rE };

  /* ---- ⑥ gradient：首错=方向级（错卡 wig+题面重锚，正确卡无 breathe）/miss≥2=正确卡 breathe ---- */
  total++;
  startLevel(5);
  await unlocked();
  const q6 = window.MT.quiz;
  let i6 = -1;
  for (let i = 0; i < q6.pool.length; i++) if (i !== q6.answer) { i6 = i; break; }
  const r6a = await tapRetry(i6);                         // 首错（flat5≥3：链 10s 节流起播）
  const wigFirst = poolCardAt(i6).classList.contains('wig') &&       // 错卡摇头（方向级视觉）
                   targetBarEl.classList.contains('pulse') &&        // 题面重锚（不指正确卡）
                   !poolCardAt(q6.answer).classList.contains('breathe');   /* 正确卡无 breathe */
  await new Promise(w => setTimeout(w, 6200));            // 等豁免窗过（二错不重设窗：10s 节流内）
  const r6b = await tapRetry(i6);                         // 二错（miss=2）
  const brEl = poolCardAt(q6.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');  // miss≥2=正确卡 breathe（答案级）
  const gradOk = r6a === 'wrong' && wigFirst && r6b === 'wrong' &&
                 window.MT.quiz.miss === 2 && breathe2;
  if (gradOk) npass++;
  units.gradient = { ok: gradOk, wigFirst: wigFirst, secondR: r6b,
                     breathe2: breathe2, miss: window.MT.quiz.miss };

  /* ---- ⑦ stars：星级口径（0=3★/1-2=2★/≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑧ gen：生成关 flat20+（seeded ri(rnd,1,4) 独立复算+四档全现+先验静态验算+ch4 三 target） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  const ch4Gen = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 523);      // SPEC §0.86：独立重写 rng
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
    const det = JSON.stringify(L.quizzes) === JSON.stringify(genLevel(flat).quizzes);   // 确定性
    if (!det) genBad.push(flat + ':det');
    const cfg = SPEC_CH[L.dch];
    let priorOk = true;
    for (let k = 0; k < L.quizzes.length && priorOk; k++) {
      const q = L.quizzes[k];
      const vs = q.pool.map(c => c.v);
      const expAns = deriveAnswerV(q.a, q.target, vs);          // answer 独立复算
      const aLo = L.dch === 1 ? 2 : SPEC_A[q.target][0];
      const aHi = L.dch === 1 ? 8 : SPEC_A[q.target][1];
      const dom = SPEC_DD[q.target];
      const okQ = q.kind === 'ten' && q.pool.length === cfg.pool &&
        (L.dch === 4 || q.target === cfg.target) &&
        (L.dch === 4 ? [10, 15, 20].indexOf(q.target) >= 0 : true) &&
        q.a >= aLo && q.a <= aHi &&
        new Set(vs).size === vs.length && expAns >= 0 && q.answer === expAns &&
        vs.every((v, j) => j === expAns ? true : (v >= dom[0] && v <= dom[1] && v !== q.a));
      if (!okQ) { genBad.push(flat + ':prior ' + k); priorOk = false; }
      if (structWhy(q, L.dch, k)) { genBad.push(flat + ':struct ' + k); priorOk = false; }
    }
    /* ch4 关内三 target 全现 */
    if (L.dch === 4) {
      const tOk = [10, 15, 20].every(t => L.quizzes.some(q => q.target === t));
      if (!tOk) genBad.push(flat + ':ch4targets');
      ch4Gen[flat] = L.quizzes.map(q => q.target);
    }
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  const genOk = genBad.length === 0 && distOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch, ch4: ch4Gen };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §4 实长表）+契约源码断言 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const wrongMoreChain = D.mt_wrong_more + 150 + D.mt_hint + 300;    // 5970
  const wrongLessChain = D.mt_wrong_less + 150 + D.mt_hint + 300;    // 6018
  /* T46 确认链全域最坏值独立复算（a 域按 target：10→1-9/15→6-9/20→11-18，
     ch1 a∈2-8 为子集不另列——超集上界恒安全） */
  let worstChain = 0, worstQ = null;
  for (const t of [10, 15, 20]) {
    for (let a = SPEC_A[t][0]; a <= SPEC_A[t][1]; a++) {
      const c = chainMs(a, t - a, t);
      if (c > worstChain) { worstChain = c; worstQ = { a: a, x: t - a, t: t }; }
    }
  }
  const demoChain = chainMs(3, 7, 10);                        // 教学演示题 3+7=10（tutWatchLevel 定版锚）
  const winOk = WRONG_CHAIN_WIN === Math.max(wrongMoreChain, wrongLessChain) &&   // 两链取 max（==6018 精确）
                WRONG_CHAIN_WIN === 6018 &&
                WRONG_CHAIN_WIN >= 6018 &&                              // 豁免窗 ≥6018（SPEC §4）
                worstChain === 10098 && worstQ.a === 16 && worstQ.t === 20 &&   // 最坏锚=t20/a16（精确防漂）
                (CELE_MAIN + CELE_TAIL) >= worstChain &&                // 10100 ≥ 10098（T46 clip 口径）
                demoChain === 9642 && (CELE_MAIN + TUT_CELE_TAIL) >= demoChain &&  // demo 9700 ≥ 9642
                TUT_WATCH_WIN >= D.mt_tut_watch + 300 &&                 // watch 延 ≥3564
                TUT_TURN_WIN >= D.mt_tut_turn + 300 &&                   // turn 延 ≥2076
                (2620 + 400) >= D.mt_right + 300;                        // celebrate ≥2772
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'maketen'") >= 0;             // C：本款存档键 kidsgame_maketen
  const srcE = src.indexOf('sv.maketen && sv.maketen.tutSeen') >= 0;   // E：行为分流先查教学特例（freshTut 源码）
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0;   // I 补：豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcL = src.indexOf('const NUMCN') >= 0 && src.indexOf("2: '两'") >= 0 &&
               src.indexOf("20: '二十'") >= 0 &&
               NUMCN[2] === '两' && NUMCN[20] === '二十' &&
               formulaText({ a: 18, target: 20 }) === '十八加两等于二十' &&   /* NUMCN 全式输出（契约 L 实算——x=2 读「两」，8 字） */
               formulaText({ a: 3, target: 10 }) === '三加七等于十';          /* 「+」读「加」「=」读「等于」 */
  const srcHint = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // C7 独立硬编码对账
                  CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                  CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                  CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                  GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                  GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                  nextHint(4) === SPEC_CHAPTER_HINTS[1] && nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                  nextHint(14) === SPEC_CHAPTER_HINTS[3] && nextHint(19) === SPEC_CHAPTER_HINTS[4] &&
                  [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  const srcSpeed = SPEED === 0.12;                       // ⑯ verify 提速
  const srcMT = src.indexOf('window.MT =') >= 0;         // b29 坑⑥：真实页同暴露（main 无 VERIFY 包裹）
  const contractOk = srcA && srcB && srcC && srcE && srcF && srcI && srcJ && srcK && srcL &&
                     srcHint && srcSpeed && srcMT;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, L: srcL, hints: srcHint, mtHook: srcMT };

  /* ---- ⑩ confirmChain：确认链构成（T46 化 6 段全 string clip）+题面 ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q10 = window.MT.quiz;
  const faceOk = document.getElementById('target-num').textContent === String(q10.target);   /* 题面大字 */
  const h0 = window.__queueHist.length;      // 订阅起点（right 后换题渲染不会重播链）
  const r10 = await tapRetry(q10.answer);
  const hs = window.__queueHist.slice(h0);
  const expParts = ['mt_right', 'mt_n_' + q10.a, 'mt_s_add',
                    'mt_n_' + (q10.target - q10.a), 'mt_s_eq', 'mt_n_' + q10.target];   // 段键独立推导
  const chainOk10 = r10 === 'right' && hs.some(h =>
           h.length === 6 && h.every((p, i) => p === expParts[i]) &&       /* 6 段全 clip 拼播 */
           h.every(p => typeof p === 'string') &&                          /* 零 keyless（T46 政策） */
           !keylessLast(h));                                               /* 全 string 恒真复核（Mj-1） */
  const chainUnitOk = chainOk10 && faceOk;
  if (chainUnitOk) npass++;
  units.confirmChain = { ok: chainUnitOk, rightR: r10, face: faceOk,
                         queue: (window.__queueHist[h0] || []).map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑪ save：真实写档链（init maketen→autoSolve 通关→localStorage 更新，测后还原）
           origLS 模式（b34 坑②）：测前保存原档，测后恢复——防毁真实玩家档 ---- */
  total++;
  const origSave = window.__mtOrig.save, origPersist = window.__mtOrig.persist;
  const origLS = localStorage.getItem('kidsgame_maketen');      /* b34 坑②：origLS 保存 */
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_maketen');
    KIDS.init({ game: 'maketen', title: '凑十小铺' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接题面
    const a11 = await window.MT.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_maketen');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'maketen' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_maketen');
  else localStorage.setItem('kidsgame_maketen', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'maketen', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, maketen: { tutSeen: true } };
  localStorage.setItem('kidsgame_maketen', JSON.stringify(pre));
  KIDS.store.load();                             // 重读预置档
  window.__mtDemoR = null;                       // 教学实证清零（非教学路径不应重设）
  window.MT.start(0);
  await unlocked();
  const q12 = window.MT.quiz;
  const realOk = state.tut === 'none' && window.__mtDemoR === null &&
                 q12 && q12.kind === 'ten' && q12.target === 10 &&
                 q12.a >= 2 && q12.a <= 8 &&                             /* 首关 ch1 a∈2-8 */
                 q12.pool.length === 4 &&                                /* 池 4 */
                 Array.isArray(q12.pool) && q12.step === 0 && q12.miss === 0 &&
                 q12.answer === deriveAnswerV(q12.a, 10, q12.pool.map(c => c.v)) &&  /* answer 独立复算 */
                 window.MT.currentLevel.flat === 0 && window.MT.currentLevel.n === 5 &&
                 (KIDS._save() || {}).v === '1.0' &&
                 typeof window.MT === 'object' && !!window.MT.tapCard && !!window.MT.autoSolve;   /* b29 坑⑥ 真实页暴露（!! 归一布尔，防函数引用 JSON 序列化成 null 的假失败） */
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut, quiz: q12 && { t: q12.target, a: q12.a, n: q12.pool.length } };
  /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写） */
  if (origLS === null) localStorage.removeItem('kidsgame_maketen');
  else localStorage.setItem('kidsgame_maketen', origLS);
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};

  const out = { game: 'maketen', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__mtVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total
                                     : 'VERIFY FAIL ' + (total - npass) + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史；voice.queue 记录拼播链（__lastQueue+
     __queueHist 全史——right 后链头取证用全史）；voice.say 记 __lastSayText */
  window.__voiceHist = [];
  window.__queueHist = [];
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
    if (parts) window.__queueHist.push(parts);
    window.__lastVoiceKey = parts && parts.length
      ? (typeof parts[0] === 'string' ? parts[0] : parts[0].key) : null;
  };
  runVerify();
}
