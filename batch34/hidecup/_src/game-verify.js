/* ================= ?verify=1 自检（仅 verify 分支加载执行）——15 单元（r25）
   ① structure：SVG 杯/动物图标全定义（g[data-anim] 渲染即引擎）、DOM 无 undefined
      文本、clips ≥14 条（hc_ 11+core 3 必备，r25 零新键子集式）+duration 辨别器
      （±60ms）、双 viewport（1280×800/800×1180）×（flat0 2 杯/flat10 3 杯/
      flat15 4 杯——r25）布局（杯 ≥96×96、描边对比度 ≥3:1、overflowX ≤0）
   ② tutorial：教学三段（watch=2 杯 1 换慢速演示→__hcDemoR='right'；turn 首题
      定制形态断言 cups=2/swaps=[[0,1]]/start=1/anim='cat'；帮→首对独 __hcTutSolo
      +进正式关 flat=0 n=5；watch 段实测 ≤16s）——教学链零改动
   ③ drive：40 关全量审计（flat0-39）：确定性/structWhy 全 null/章号映射/
      SPEC §0.82+r25 独立对账（dch4 谱：qi0/2/4 hide c=4 s=4 + qi1/3 hidedual
      c=3 s=3 双动物双答案复算互异；dch1-3 真值表原样；swaps 域 a≠b、相邻对
      非全等、answer=独立复算 from start+swaps——禁读 quiz.answer 直比、动物池
      封闭+每关一主）/谱构成聚合（dch4 恰 3 hide+2 hidedual qi 位对应）/
      引擎直驱（hidedual 两步 half→right）/末题 done→全关 3 星
   ④ frameM（契约 M 帧内容三层）：换位演出结束后（flat0/10/15）
      数值层 __hcPerm==独立推算最终排列 / 相位层 dataset.pos 逐杯 / 帧内容层
      getBoundingClientRect().x 排序后 data-cup 序列==排列 / 动物挂
      data-cup===start 的 wrap 且其 data-pos===answer
   ⑤ wrongPath：tapCup 非答案杯 → 'wrong'+miss 计数+错链 [hc_wrong,hc_hint]
      全 clip；豁免窗（真时钟 5154）内二击被吞 false 且 miss 不变；窗后第二错
      照计 miss=2（契约 I 补）
   ⑥ gradient：首错=杯阵整体 wiggle（容器类，不指杯——正确杯无 breathe）；
      miss≥2=正确杯 breathe（答案级）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32(flat*7919+311)）
      ——verify 独立复算第一个随机数==dch +四档全现+每关 c/s 按 r25 谱域一致
   ⑨ windows+contract：错链豁免窗静态 ≥5154（==精确）+确认链窗 4600 ≥ 4122+
      亮相链窗 4300 ≥ 名音 1440+150+hc_show 1848+300=3738（T46 化全 clip 链口径）
      +r25 双窗（SHOW_WIN_DUAL 5400 ≥ 5328/HALF_WIN 5800 ≥ 5712）+提速档
      （swapMsOf 1100/900/700+教学 1600）+教学窗+契约 A/B/C/E/F/I/J/K 源码断言
      +r25 锚（half 相位推进/M1 防回归/浮点整串/q-text 动态）——读自身合并 script 文本
   ⑩ showChain：亮相链构成=[名音 hc_n_<id>(clip), hc_show(clip)]（T46 化全 clip
      ——原 keyless 尾段改引用）；确认链全 clip（keylessLast 恒 false）
   ⑪ save：真实写档链（init hidecup→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_hidecup v:'1.0' levels['1-0'] 更新；
      测后恢复原 localStorage，不污染真实存档）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（kind='hide'/cups=2/swaps 1 对/step=0）+answer 独立复算
   ⑬ dual（r25）：hidedual 两步作答真实 UI——flat15 推进 qi1：形态（kind/
      phase=0/answer=answerA/startA≠startB/animA≠animB）+q-text 双名+亮相链
      3 段 [hc_n_A,hc_n_B,hc_show]+第一步 tapCup(answerA)='half'（phase=1/
      answer 切 answerB/step 未推/miss=0/A 杯 found+确认链 3 段尾=hc_n_B/
      q-text 切 B 名）+第二步错（点 A 杯）wrong miss=1 不换步+第二步对
      'right' 推进 qi2
   ⑭ swapSpeed（r25）：提速档实读——flat5/flat10/flat15 开题后**参与换位的 wrap**
      （末次 swap 对两 pos——m4 修复，原 wraps[0] 隐含依赖首杯在 swap 对中）
      transitionDuration=='132ms'/'108ms'/'84ms'（=1100/900/700×SPEED 0.12
      精确整串）+swapMsOf 档位函数断言（dch1=1100/dch3=900/dch4=700/教学 1600）
   ⑮ dualFrame（r25）：hidedual 帧内容+重演回归——flat15 qi1 双动物两 host
      挂杯对位对账（data-cup∈{startA,startB}/data-pos=derive 复算/svg
      g[data-anim] 对应）+half 后 A found+replay() 重演毕 found 恢复+
      __hcPerm 排列对账+第二步对推进 qi2
   结果写 #verify-result + window.__hcVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH34 §0.82/§1/§4 + SPEC-R25 文字独立重列（禁抄页面 ANIMALS/VOICE/CH_CFG/常量） */
  const SPEC_DUR = { hc_tut_watch: 3264, hc_tut_turn: 1824, hc_hint: 3048,
                     hc_right: 2232, hc_wrong: 1656, hc_show: 1848,
                     hc_n_rabbit: 1368, hc_n_cat: 1368, hc_n_bear: 1440,
                     hc_n_dog: 1416, hc_n_duck: 1392 };
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_CH = { 1: { c: 2, s: 1 }, 2: { c: 2, s: 2 }, 3: { c: 3, s: 2 }, 4: { c: 4, s: 4 } };   /* r25：dch4 hide 腿口径（dual 腿 c3s3 在 SPEC_DUAL） */
  const SPEC_DUAL = { c: 3, s: 3 };              /* r25 dch4 双动物腿 */
  const SPEC_KINDS = ['hide', 'hidedual', 'hide', 'hidedual', 'hide'];   /* r25 dch4 固定谱 */
  const SPEC_ANIMALS = ['rabbit', 'cat', 'bear', 'dog', 'duck'];
  const SPEC_SHOW_TEXT = '要躲猫猫啦';
  const SPEC_CHAPTER_HINTS = { 1: '杯子要换两次啦，跟紧看', 2: '三个杯杯来啦，仔细看',
                               3: '四个杯杯来啦，藏两只', 4: '新一轮藏猫猫开始' };
  const SPEC_GEN_HINTS = ['两个杯子换一次', '两个杯子换两次', '三个杯子换两次', '四个杯子换四次'];
  const estMs = n => n.length * 345 + 600;         // b25 定版：SAPI ~345ms/字+600（全字符口径）
  const SPEC_NAME_MAX = 1440;                      // 名音全集 max（hc_n_bear，_clipdur34）
  /* 独立推导（SPEC §0.82 answer 口径）：动物随杯走，swap [a,b] 互换位置 a、b 两杯 */
  function deriveV(start, swaps) {
    let p = start;
    for (const sw of swaps) { if (p === sw[0]) p = sw[1]; else if (p === sw[1]) p = sw[0]; }
    return p;
  }
  /* 独立 rng（SPEC §0.82 生成关策略）：mulberry32(flat*7919+311)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const unlocked = async () => {                   // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（key 空缺带 text）播完即
     return 丢弃后续段——T46 化后本款零 keyless，keylessLast 用于链断言恒 false */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);

  /* ---- ① structure：SVG 定义+DOM 干净+clips 全注入+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.HC.quiz;
  const cupsDom = Array.from(cupsEl.querySelectorAll('.cup-wrap'));
  const svgOk = q1 && cupsDom.length === q1.cups &&
    cupsDom.every(w => {
      const g = w.querySelector('.cup svg > g[data-anim]');
      return !!g && g.dataset.anim === 'cup';
    }) &&
    SPEC_ANIMALS.every(id => animalSvg(id, 10).indexOf('data-anim="' + id + '"') >= 0) &&   // 池 5 SVG 全定义
    !!sceneEl.querySelector('#q-text') && sceneEl.querySelector('#q-text').textContent.length > 0 &&
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* clips：hc_ 11+core 3 必备注入（r25 零新键，子集式 ≥14——SPEC-R25 §R6）+
     hc 实长辨别（_clipdur34 实测 ±60ms；core 3 条只验在场
     ——core 实长不在本批实长表，禁猜值断言） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const preOk = keysAll.length >= 14 &&
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 2 杯/flat10 3 杯）——杯 wrap=主答案目标 ≥96×96 */
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
    const wraps = Array.from(cupsEl.querySelectorAll('.cup-wrap'));
    if (g._simFlat >= 20)   /* m4 守卫：生成关 dch 随机禁按 dch1 硬算 need（防假阴性）——直接判不过 */
      return { vp: w + 'x' + h, flat: g._simFlat, cups: wraps.length, hitOk: false, sceneOk: false,
               contrast: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    const need = SPEC_CH[Math.floor(g._simFlat / 5) + 1].c;
    const hitOk = wraps.length === need && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    /* 杯面高度用 wrap offsetHeight（layout 值不受 pop 动画 transform 影响） */
    const sceneOk = wraps.length > 0 && wraps[0].offsetHeight >= 150 &&
                    sceneEl.offsetWidth >= 64 && sceneEl.offsetHeight >= 64;
    const cB = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cups: wraps.length, hitOk: hitOk,
             sceneOk: sceneOk, contrast: cB, ox: ox,
             pass: hitOk && sceneOk && cB && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10, 15]) {           /* r25：+flat15（dch4 qi0 c=4——4 杯布局双视口实证） */
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);
  const layoutOk = sims.every(s => s.pass);
  const s1ok = svgOk && cleanDom && preOk && durOk && layoutOk;
  if (s1ok) npass++;
  units.structure = { ok: s1ok, svg: svgOk, dom: cleanDom, clips: preOk, dur: durOk,
                      layout: layoutOk, sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（看→帮→独） ---- */
  total++;
  window.__hcOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__hcTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__hcWatchMs || 1e9) / SPEED;       // watch 段实测（家族预算 ≤16s 只罩 watch）
  const tutHelp = window.__hcDemoR === 'right' && state.tut === 'help' &&
                window.HC.currentLevel.flat === -1 &&
                window.HC.quiz.cups === 2 && window.HC.quiz.kind === 'hide' &&
                JSON.stringify(window.HC.quiz.swaps) === '[[0,1]]' &&   // turn 首题定制形态（2 杯 1 换）
                window.HC.quiz.start === 1 && window.HC.quiz.anim === 'cat' &&
                twWatch <= 16000 && tw <= 26000;
  await unlocked();
  const qT = window.HC.quiz;                                // "帮"阶段放手题（turn 猫猫）
  const rT = await window.HC.tapCup(qT.answer);             // 首次选对 → 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__hcTutSolo === true &&
                window.HC.currentLevel.flat === 0 && window.HC.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__hcDemoR, tut: state.tut,
                     solo: window.__hcTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT };

  /* ---- ③ drive：40 关全量审计+SPEC §0.82 独立对账（answer=独立复算，禁读直比） ---- */
  total++;
  const levelsRec = {}, genDch = {};
  let badCase = null;
  for (let flat = 0; flat < 40; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, k);
      if (why) { badCase = 'struct ' + flat + '/' + k + ':' + why; ruleOk = false; }
    }
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = flat < 20 ? L1.dch === Math.floor(flat / 5) + 1   // 静态四档
                           : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* SPEC §0.82+r25 独立对账（每题）：dch4 谱（qi0/2/4 hide c=4 s=4 + qi1/3
       hidedual c=3 s=3 双答案复算互异）/dch1-3 真值表原样/swap 域/相邻对非全等/
       answer 独立复算/动物池封闭+每关一主（hide 全题 anim 相同；dual animA=主 animB=副） */
    let specOk = true;
    let nHide = 0, nDual = 0;                       /* r25 谱构成聚合（恰 3+2） */
    for (let k = 0; k < L1.quizzes.length && specOk; k++) {
      const q = L1.quizzes[k];
      if (L1.dch === 4 && q.kind !== SPEC_KINDS[k]) { badCase = 'kind谱 ' + flat + '/' + k; specOk = false; break; }
      if (q.kind === 'hidedual') {
        nDual++;
        if (q.cups !== SPEC_DUAL.c || q.swaps.length !== SPEC_DUAL.s) { badCase = 'dualCs ' + flat + '/' + k; specOk = false; break; }
        if (!Number.isInteger(q.startA) || q.startA < 0 || q.startA >= q.cups ||
            !Number.isInteger(q.startB) || q.startB < 0 || q.startB >= q.cups || q.startA === q.startB)
          { badCase = 'dualStart ' + flat + '/' + k; specOk = false; break; }
        for (let j = 0; j < q.swaps.length; j++) {
          const sw = q.swaps[j];
          if (sw[0] === sw[1] || sw[0] < 0 || sw[0] >= q.cups || sw[1] < 0 || sw[1] >= q.cups)
            { badCase = 'swapDom ' + flat + '/' + k + '/' + j; specOk = false; break; }
          if (j > 0 && ((sw[0] === q.swaps[j - 1][0] && sw[1] === q.swaps[j - 1][1]) ||
                       (q.cups >= 3 && sw[0] === q.swaps[j - 1][1] && sw[1] === q.swaps[j - 1][0])))
            { badCase = 'swapRepeat ' + flat + '/' + k + '/' + j; specOk = false; break; }
        }
        if (!specOk) break;
        const expA = deriveV(q.startA, q.swaps), expB = deriveV(q.startB, q.swaps);   // 双答案独立复算
        if (q.answerA !== expA || q.answerB !== expB || q.answerA === q.answerB)
          { badCase = 'dualAns ' + flat + '/' + k; specOk = false; break; }
        if (SPEC_ANIMALS.indexOf(q.animA) < 0 || SPEC_ANIMALS.indexOf(q.animB) < 0 ||
            q.animA === q.animB || q.animA !== L1.anim || q.animB !== L1.anim2)
          { badCase = 'dualAnim ' + flat + '/' + k; specOk = false; break; }   // 一主一副关级共用
        if (q.phase !== 0 || q.answer !== q.answerA)
          { badCase = 'dualInit ' + flat + '/' + k; specOk = false; break; }
      } else {
        nHide++;
        const cfg = SPEC_CH[L1.dch];
        if (q.kind !== 'hide') { badCase = 'kind ' + flat + '/' + k; specOk = false; break; }
        if (q.cups !== cfg.c || q.swaps.length !== cfg.s) { badCase = 'cs ' + flat + '/' + k; specOk = false; break; }
        if (!Number.isInteger(q.start) || q.start < 0 || q.start >= q.cups) { badCase = 'start ' + flat + '/' + k; specOk = false; break; }
        for (let j = 0; j < q.swaps.length; j++) {
          const sw = q.swaps[j];
          if (sw[0] === sw[1] || sw[0] < 0 || sw[0] >= q.cups || sw[1] < 0 || sw[1] >= q.cups)
            { badCase = 'swapDom ' + flat + '/' + k + '/' + j; specOk = false; break; }
          if (j > 0 && ((sw[0] === q.swaps[j - 1][0] && sw[1] === q.swaps[j - 1][1]) ||
                       (q.cups >= 3 && sw[0] === q.swaps[j - 1][1] && sw[1] === q.swaps[j - 1][0])))
            { badCase = 'swapRepeat ' + flat + '/' + k + '/' + j; specOk = false; break; }   // 同序重复/c>=3 同集合反向=假换（SPEC §5 裁决）
        }
        if (!specOk) break;
        const expAns = deriveV(q.start, q.swaps);               // 独立复算（SPEC §0.82 对账锚）
        if (q.answer !== expAns) { badCase = 'answer ' + flat + '/' + k; specOk = false; break; }
        if (SPEC_ANIMALS.indexOf(q.anim) < 0 || q.anim !== L1.anim)
          { badCase = 'anim ' + flat + '/' + k; specOk = false; break; }   // 每关一主
      }
    }
    if (specOk && L1.dch === 4 && (nHide !== 3 || nDual !== 2)) {   /* r25 谱构成聚合（恰 3 hide+2 hidedual） */
      badCase = '谱构成 ' + flat + ' hide=' + nHide + ' dual=' + nDual; specOk = false;
    }
    if (specOk && L1.dch !== 4 && (nHide !== 5 || nDual !== 0)) {
      badCase = '非dch4 出 dual ' + flat; specOk = false;
    }
    /* 引擎直驱：逐题点正确杯 → right / 末题 done（r25 dual 两步：half→再点=right/done）；
       全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      let r = engTapCup(L3, deriveV(q.start, q.swaps));        // 驱动位置=独立复算 answer（dual=A）
      if (r === 'half') r = engTapCup(L3, deriveV(q.startB, q.swaps));   // dual 第二步（B 独立复算）
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && ruleOk && chOk && dchOk && specOk && driveOk && solvedAll;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
    if (flat >= 20) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
  }
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]);
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase, genDch: genDch };

  /* ---- ④ frameM（契约 M 帧内容三层：数值/相位/帧内容——换位结束后杯排列断言） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.HC.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 独立推算最终排列：perm[pos]=杯身份，逐次互换 */
    const perm = [];
    for (let k = 0; k < q.cups; k++) perm.push(k);
    for (const sw of q.swaps) { const t = perm[sw[0]]; perm[sw[0]] = perm[sw[1]]; perm[sw[1]] = t; }
    const numOk = Array.isArray(window.__hcPerm) && window.__hcPerm.length === q.cups &&
                  window.__hcPerm.every((c, p) => c === perm[p]);                       // 数值层
    const phaseOk = perm.every((c, p) => {
      const w = cupsEl.querySelector('.cup-wrap[data-pos="' + p + '"]');
      return !!w && Number(w.dataset.cup) === c;
    });                                                                                 // 相位层
    const byX = Array.from(cupsEl.querySelectorAll('.cup-wrap'))
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const rectOk = byX.length === q.cups && byX.every((w, p) => Number(w.dataset.cup) === perm[p]);   // 帧内容层
    /* 动物帧：挂 data-cup===start 的 wrap 且其 data-pos===answer（渲染即引擎） */
    const host = Array.from(cupsEl.querySelectorAll('.cup-wrap'))
      .find(w => w.querySelector('.peek') && w.querySelector('.peek').innerHTML !== '');
    const hostOk = !!host && Number(host.dataset.cup) === q.start &&
                   Number(host.dataset.pos) === deriveV(q.start, q.swaps) &&
                   !!host.querySelector('.peek svg > g[data-anim="' + q.anim + '"]');
    const cupsOk = Number(cupsEl.dataset.cups) === q.cups;
    return { ok: numOk && phaseOk && rectOk && hostOk && cupsOk,
             why: JSON.stringify({ numOk, phaseOk, rectOk, hostOk, cupsOk, perm, got: window.__hcPerm }) };
  }
  const fA = await frameCheck(0);      // dch1 c=2 s=1
  const fB = await frameCheck(10);     // dch3 c=3 s=2
  const fC = await frameCheck(15);     // dch4 c=3 s=3
  const frameOk = fA.ok && fB.ok && fC.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat15: fC };

  /* ---- ⑤ wrongPath：错路径+豁免窗（真时钟 5154：窗内二击吞/窗后二错照计 miss） ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.HC.quiz;
  const badTap = (await window.HC.tapCup(99)) === null;           // 非法位置=null（不炸）
  const wA = (q5.answer + 1) % q5.cups;                           // 非答案位置
  const pW = window.HC.tapCup(wA);                                // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                            // 等首错空开盖回演出毕（locked=false）
  await unlocked();                                               // 等演出锁（showUntil 余窗）过——豁免窗（真时钟 5154）仍在
  const rejW = await window.HC.tapCup(wA);                        // 豁免窗内二错=被吞 false（I 补：不计 miss）
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'hc_wrong' &&         // 错链头=wrong clip
                 h[1] === 'hc_hint' &&                            // 首错语义句=hint「再想一想，看杯子怎么动」
                 h.every(p => typeof p === 'string') &&           // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const miss1 = rW === 'wrong' && rejW === false && window.HC.quiz.miss === 1;
  await new Promise(w => setTimeout(w, 5300));                    // 等豁免窗（真时钟 5154）过——
                                                                 // 窗后第二错照计 miss=2（I 补）
  const rD = await window.HC.tapCup(wA);
  const miss2 = rD === 'wrong' && window.HC.quiz.miss === 2;      // 卡不灰可重点（探索不罚）
  await unlocked();                                               // 等二错空开盖回演出锁过
  const rE = await window.HC.tapCup(q5.answer);
  const wrongOk = badTap && miss1 && chainW && miss2 && rE === 'right';
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, miss1: miss1, chain: chainW,
                      rejInWin: rejW === false, miss2: miss2, right: rE };

  /* ---- ⑥ gradient：首错=三杯整体 wiggle（不指杯）/miss≥2=正确杯 breathe（答案级） ---- */
  total++;
  startLevel(5);
  await unlocked();
  const q6 = window.HC.quiz;
  const w6 = (q6.answer + 1) % q6.cups;
  const r6a = await window.HC.tapCup(w6);                         // 首错（flat5≥3：链 10s 节流起播）
  const wigFirst = cupsEl.classList.contains('wig') &&            // 方向级=容器整体 wiggle
                   !(cupWrapAt(q6.answer).classList.contains('breathe'));   // 不指杯（正确杯无 breathe）
  await new Promise(w => setTimeout(w, 5300));                    // 等豁免窗过（二错不重设窗：10s 节流内）
  const r6b = await window.HC.tapCup(w6);                         // 二错（miss=2）
  const brEl = cupWrapAt(q6.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');  // miss≥2=正确杯 breathe（答案级）
  const gradOk = r6a === 'wrong' && wigFirst && r6b === 'wrong' &&
                 window.HC.quiz.miss === 2 && breathe2;
  if (gradOk) npass++;
  units.gradient = { ok: gradOk, wigFirst: wigFirst, secondR: r6b,
                     breathe2: breathe2, miss: window.HC.quiz.miss };

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

  /* ---- ⑧ gen：生成关 flat20+（seeded ri(rnd,1,4) 独立复算+四档全现+c/s 按 r25 谱域一致） ---- */
  total++;
  const genBad = [];
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 311);      // SPEC §0.82：独立重写 rng
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    const cfg = SPEC_CH[L.dch];
    if (!L.quizzes.every((q, idx) => L.dch !== 4
          ? (q.cups === cfg.c && q.swaps.length === cfg.s)                       // dch1-3 原域
          : (SPEC_KINDS[idx] === 'hidedual'                                       // r25 dch4 谱域
              ? (q.kind === 'hidedual' && q.cups === SPEC_DUAL.c && q.swaps.length === SPEC_DUAL.s)
              : (q.kind === 'hide' && q.cups === cfg.c && q.swaps.length === cfg.s))))
      genBad.push(flat + ':cs');
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  const genOk = genBad.length === 0 && distOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §4 实长表）+契约源码断言 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = WRONG_CHAIN_WIN >= D.hc_wrong + 150 + D.hc_hint + 300 &&   // 豁免窗 ≥5154（==精确）
                WRONG_CHAIN_WIN === 5154 &&
                (1600 + 3000) >= D.hc_right + 150 + SPEC_NAME_MAX + 300 &&  // 判对窗 4600 ≥ 4122
                SHOW_WIN >= D.hc_show + 300 &&                              // ≥2148（hc_show+300 下界）
                SHOW_WIN >= SPEC_NAME_MAX + 150 + D.hc_show + 300 &&        // ≥3738（T46 化全 clip 链口径）
                SHOW_WIN_TUT >= D.hc_n_rabbit + 150 + D.hc_show + 300 &&    // 教学亮相窗 ≥3666（clip 链）
                (1600 + 2450) >= D.hc_right + 150 + D.hc_n_rabbit + 300 &&  // 教学演示窗 ≥4050
                3564 >= D.hc_tut_watch + 300 &&                             // watch 延 ≥3564
                2124 >= D.hc_tut_turn + 300 &&                              // turn 延 ≥2124
                (2620 + 400) >= D.hc_right + 300 &&                         // celebrate ≥2532
                SHOW_WIN_DUAL >= SPEC_NAME_MAX * 2 + 150 * 2 + D.hc_show + 300 &&   // r25 双动物亮相链窗 ≥5328
                HALF_WIN >= D.hc_right + 150 + SPEC_NAME_MAX + 150 + SPEC_NAME_MAX + 300 &&   // r25 half 过渡窗 ≥5712
                swapMsOf(1) === 1100 && swapMsOf(2) === 1100 && swapMsOf(3) === 900 &&
                swapMsOf(4) === 700 && SWAP_MS_TUT === 1600 && SWAP_MS === 1100;      // r25 提速档（dch1/2 基线不动+教学慢速）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'hidecup'") >= 0;             // C：本款存档键 kidsgame_hidecup
  const srcE = src.indexOf('sv.hidecup && sv.hidecup.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0;   // I 补：豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
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
  /* r25 源码锚（SPEC-R25 §R4/§R5/§R8）：half 相位推进/档位接入/M1 防回归（救援
     重演不动 lastAct——方向级不得饿死答案级，r24 soundcount 实锤同型坑防回归）/
     浮点整串/q-text 动态/anim2 仅 dch4 取数 */
  const srcR25 = src.indexOf('q.answer = q.answerB') >= 0 &&
                 src.indexOf('swapMsOf(cur.dch)') >= 0 &&
                 src.indexOf('if (user) lastAct = Date.now();') >= 0 &&
                 src.indexOf('Math.round(durMs * SPEED)') >= 0 &&
                 src.indexOf('setQText') >= 0 && src.indexOf('藏在哪里呀') >= 0 &&
                 src.indexOf('if (dch === 4)') >= 0 && src.indexOf('anim2') >= 0 &&
                 src.indexOf('KIDS.voice.queue([VOICE.right.key, nameClip(q.animA), nameClip(q.animB)])') >= 0;
  const contractOk = srcA && srcB && srcC && srcE && srcF && srcI && srcJ && srcK && srcHint && srcSpeed && srcR25;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, hints: srcHint, r25: srcR25 };

  /* ---- ⑩ showChain：亮相链构成（[名音 clip, hc_show clip]——T46 化全 clip）+确认链全 clip ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q10 = window.HC.quiz;
  const LQ = window.__lastQueue;
  const showOk = LQ && LQ.length === 2 &&
                 typeof LQ[0] === 'string' && LQ[0] === 'hc_n_' + q10.anim &&   // 名音段（clip，前置）
                 LQ[1] === 'hc_show' &&                                        // '要躲猫猫啦'（clip 尾段）
                 LQ.every(p => typeof p === 'string') &&                       // 全 clip 链（零 keyless）
                 keylessLast(LQ) === false;
  const chainOk2 = await (async () => {                                        // 确认链全 clip 无 keyless
    const h0 = window.__queueHist.length;      // 订阅起点（right 后下一题亮相链会覆盖 __lastQueue）
    const r = await window.HC.tapCup(q10.answer);
    const hs = window.__queueHist.slice(h0);
    return r === 'right' && hs.some(h =>
           h.length === 2 && h[0] === 'hc_right' &&
           h[1] === 'hc_n_' + q10.anim &&
           h.every(p => typeof p === 'string') &&
           !keylessLast(h));
  })();
  const chainUnitOk = showOk && chainOk2;
  if (chainUnitOk) npass++;
  units.showChain = { ok: chainUnitOk, show: showOk, confirm: chainOk2,
                      queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑪ save：真实写档链（init hidecup→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__hcOrig.save, origPersist = window.__hcOrig.persist;
  const origLS = localStorage.getItem('kidsgame_hidecup');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_hidecup');
    KIDS.init({ game: 'hidecup', title: '藏猫猫摄像头' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.HC.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_hidecup');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'hidecup' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_hidecup');
  else localStorage.setItem('kidsgame_hidecup', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'hidecup', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, hidecup: { tutSeen: true } };
  localStorage.setItem('kidsgame_hidecup', JSON.stringify(pre));
  KIDS.store.load();                             // 重读预置档
  window.__hcDemoR = null;                       // 教学实证清零（非教学路径不应重设）
  window.HC.start(0);
  await unlocked();
  const q12 = window.HC.quiz;
  const realOk = state.tut === 'none' && window.__hcDemoR === null &&
                 q12 && q12.kind === 'hide' && q12.cups === 2 &&
                 Array.isArray(q12.swaps) && q12.swaps.length === 1 &&
                 q12.step === 0 && q12.miss === 0 &&
                 q12.answer === deriveV(q12.start, q12.swaps) &&        // answer 独立复算
                 window.HC.currentLevel.flat === 0 && window.HC.currentLevel.n === 5 &&
                 (KIDS._save() || {}).v === '1.0';
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut, quiz: q12 && { cups: q12.cups, s: q12.swaps.length } };
  /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写） */
  if (origLS === null) localStorage.removeItem('kidsgame_hidecup');
  else localStorage.setItem('kidsgame_hidecup', origLS);
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};

  /* ---- ⑬ dual（r25）：hidedual 两步作答真实 UI（flat15 推进到 qi1） ---- */
  total++;
  startLevel(15);                                  // dch4：qi0=hide c4s4
  await unlocked();
  const q13a = window.HC.quiz;
  const r13a = await window.HC.tapCup(q13a.answer);   // qi0 点对 → 推进 qi1（hidedual）
  await unlocked();                                // 等 qi1 开题演出（亮相 3 段+3 换+静止）
  const q13 = window.HC.quiz;
  const dualForm = r13a === 'right' && q13 && q13.kind === 'hidedual' && q13.phase === 0 &&
    q13.answer === q13.answerA && q13.cups === 3 && q13.swaps.length === 3 &&
    q13.startA !== q13.startB && q13.animA !== q13.animB &&
    window.HC.currentLevel.step === 1;
  const qt0 = qTextEl.textContent === (ANIMAL_NAME[q13.animA] + '和' + ANIMAL_NAME[q13.animB] + '藏在哪里呀');
  const showDual = window.__queueHist.some(h => h.length === 3 &&
    h[0] === 'hc_n_' + q13.animA && h[1] === 'hc_n_' + q13.animB && h[2] === 'hc_show' &&
    h.every(p => typeof p === 'string') && !keylessLast(h));          // 亮相链 3 段全 clip
  const hq0 = window.__queueHist.length;
  const rH = await window.HC.tapCup(q13.answerA);  // 第一步对 → 'half'
  const halfChain = window.__queueHist.slice(hq0).some(h => h.length === 3 &&
    h[0] === 'hc_right' && h[1] === 'hc_n_' + q13.animA && h[2] === 'hc_n_' + q13.animB &&
    h.every(p => typeof p === 'string') && !keylessLast(h));          // 确认链 3 段（链尾名音=第二问预告）
  await unlocked();                                // 等 HALF_WIN 演出锁过
  const q13b = window.HC.quiz;
  const wa13 = cupWrapAt(q13b.answerA);
  const halfOk = rH === 'half' && q13b.phase === 1 && q13b.answer === q13b.answerB &&
    window.HC.currentLevel.step === 1 && q13b.miss === 0 && window.HC.currentLevel.miss === 0 &&
    qTextEl.textContent === (ANIMAL_NAME[q13b.animB] + '藏在哪里呀') &&
    !!wa13 && wa13.classList.contains('found');    // A 杯蹦出态（half 不推 step 不计 miss）
  const rW13 = await window.HC.tapCup(q13b.answerA);   // 第二步错：点 A 已开杯（≠answerB 双射恒）
  await unlocked();
  const wrongB = rW13 === 'wrong' && window.HC.quiz.miss === 1 &&
    window.HC.currentLevel.miss === 1 && window.HC.currentLevel.step === 1;
  const hq1 = window.__queueHist.length;
  const rR13 = await window.HC.tapCup(window.HC.quiz.answer);   // 第二步对（豁免窗内对选放行）→ 推进 qi2
  const rightChain = window.__queueHist.slice(hq1).some(h => h.length === 2 &&
    h[0] === 'hc_right' && h[1] === 'hc_n_' + q13b.animB &&          /* 试玩P1 r25 补断言：
                                                                       末步名音=B（q.anim 兼容字段恒=A，
                                                                       错用则链尾=A 名——修复前盲区） */
    h.every(p => typeof p === 'string') && !keylessLast(h));
  const rightB = rR13 === 'right' && window.HC.currentLevel.step === 2 && rightChain;
  const dualOk = dualForm && qt0 && showDual && halfChain && halfOk && wrongB && rightB;
  if (dualOk) npass++;
  units.dual = { ok: dualOk, form: dualForm, qt0: qt0, showChain: showDual, half: halfOk,
                 chain3: halfChain, wrongB: wrongB, rightB: rightB, rightChain: rightChain, rH: rH };

  /* ---- ⑭ swapSpeed（r25）：提速档实读——doSwapAnim 设定 transitionDuration 终值
     =档位×SPEED 精确整串（1100/900/700×0.12=132/108/84ms——Math.round 配套）。
     m4 修复（r25 审查挂账③）：改取**参与换位的 wrap**（末次 swap 对的两只，
     data-pos 定位）——原 wraps[0] 取 DOM 首杯，首杯不在任一 swap 对中则
     transitionDuration 未被设定（现谱三档首杯恰都参与首换=碰巧通过，隐含依赖） ---- */
  total++;
  async function swapDurCheck(flat, wantMs) {
    startLevel(flat);
    await unlocked();
    const q = window.HC.quiz;                       /* 演毕当前题（swaps 全播完，dataset.pos=终位） */
    const last = q && q.swaps[q.swaps.length - 1];  /* 末次换位对：其两 pos 的 wrap 必被设过 duration */
    const wa = last ? cupWrapAt(last[0]) : null, wb = last ? cupWrapAt(last[1]) : null;
    const want = Math.round(wantMs * SPEED) + 'ms';
    return !!wa && !!wb && wa.style.transitionDuration === want &&
           wb.style.transitionDuration === want;
  }
  const sp2 = await swapDurCheck(5, 1100);         // dch2 基线 1100
  const sp3 = await swapDurCheck(10, 900);         // dch3 提速 900
  const sp4 = await swapDurCheck(15, 700);         // dch4 提速 700（qi0 hide c4s4）
  const spFn = swapMsOf(1) === 1100 && swapMsOf(3) === 900 && swapMsOf(4) === 700;
  const speedOk = sp2 && sp3 && sp4 && spFn;
  if (speedOk) npass++;
  units.swapSpeed = { ok: speedOk, d2: sp2, d3: sp3, d4: sp4, fn: spFn };

  /* ---- ⑮ dualFrame（r25）：hidedual 帧内容（双 host 对位）+重演回归（found 恢复） ---- */
  total++;
  startLevel(15);
  await unlocked();
  await window.HC.tapCup(window.HC.quiz.answer);   // qi0 → qi1（hidedual）
  await unlocked();
  const q15 = window.HC.quiz;
  const perm15 = [];
  for (let k = 0; k < q15.cups; k++) perm15.push(k);
  for (const sw of q15.swaps) { const t = perm15[sw[0]]; perm15[sw[0]] = perm15[sw[1]]; perm15[sw[1]] = t; }
  const hosts15 = Array.from(cupsEl.querySelectorAll('.cup-wrap'))
    .filter(w => w.querySelector('.peek') && w.querySelector('.peek').innerHTML !== '');
  const hostOk15 = hosts15.length === 2 && hosts15.every(w => {          // 双动物挂杯对位（渲染即引擎）
    const cup = Number(w.dataset.cup);
    const expPos = cup === q15.startA ? deriveV(q15.startA, q15.swaps)
                 : (cup === q15.startB ? deriveV(q15.startB, q15.swaps) : -1);
    const expAnim = cup === q15.startA ? q15.animA : q15.animB;
    return Number(w.dataset.pos) === expPos &&
           !!w.querySelector('.peek svg > g[data-anim="' + expAnim + '"]');
  });
  await window.HC.tapCup(q15.answerA);             // half → A found
  await unlocked();
  const waF1 = cupsEl.querySelector('.cup-wrap[data-cup="' + q15.startA + '"]');
  const found1 = !!waF1 && waF1.classList.contains('found');
  const rp15 = await window.HC.replay();           // 重演（user 通道，lastReplayAt=0 开关重置不节流）
  await unlocked();
  const waF2 = cupsEl.querySelector('.cup-wrap[data-cup="' + q15.startA + '"]');
  const found2 = !!waF2 && waF2.classList.contains('found');   // 演毕恢复已开 A 杯视觉
  const permOk15 = Array.isArray(window.__hcPerm) &&
    window.__hcPerm.every((c, p) => c === perm15[p]);           // 重演后排列对账
  const r15 = await window.HC.tapCup(window.HC.quiz.answer);    // 第二步对 → 推进 qi2
  const adv15 = r15 === 'right' && window.HC.currentLevel.step === 2;
  const frameOk15 = hostOk15 && found1 && rp15 === true && found2 && permOk15 && adv15;
  if (frameOk15) npass++;
  units.dualFrame = { ok: frameOk15, hosts: hostOk15, found1: found1, replay: rp15,
                      found2: found2, perm: permOk15, adv: adv15 };

  const out = { game: 'hidecup', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__hcVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史；voice.queue 记录拼播链（__lastQueue+
     __queueHist 全史——right 后下一题亮相链会即时覆盖 __lastQueue，链断言用全史） */
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
