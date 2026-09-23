/* ================= ?verify=1 自检（仅 verify 分支加载执行；r21 §R8 适配）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null：池/jars/相邻不同/ch2 恰 2 二级+3 浅原色/ch3 恰 2 棕+3 浅二级/
     ch4 反推结构 picks 恰 3+正确恰 1+干扰混出≠目标/flat0 题0 恒 green）/
     引擎直驱（正推逐题按配方点罐→par×'wrong'+末步 right/done→tries==par；
     反推选正确卡→right/done→tries==0（par=0）→0 额外 miss=3 星）
   ② 混色表独立对账：specMix()（从 SPEC-R21 §R3 规则文字独立重算，不引用引擎 MIX 表）
     vs engMix()：{红,黄,蓝,白}全部非空子集 + 带重复样例全对拍（含白+两原色=浅二级）；
     结果色全在色板
   ③ FIFO 缸语义：缸深 3；第 4/5 罐替换最早球；超深后结果色按新 contents 重算
   ④ 试调计数：判非目标=1 试调（missTotal++）；重复色集合未变='same' 不判不罚；
     判非目标缸不清空可继续；切题 tries 归零
   ⑤ 点罐单元（flat0 真实 UI 状态机）：入缸/pot/tries/miss/切题清缸/非法罐 false/
     650ms 演出窗防重入（right 判定中紧邻点罐=拒绝不推进）
   ⑥ 教学链：tutorialWatch() 真实走完（stub 存档）→ __cmDemoR==='right'（演示调绿黄+蓝→变绿）
     且 tut='help'；watch 折算真实时长 ≤16s
   ⑦ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 罐排容器 bump 微动效（b21 定版）
   ⑧ UI 冒烟 A：flat0 autoSolve 通关（dch1 恒 3 星，verify 页不弹层）
   ⑨ UI 冒烟 B：flat7（dch2 恰 2 二级+3 浅原色，4 罐含白——配方 ≤3 罐必有非配方杂罐）
     先点 1 次杂罐再 autoSolve（miss 落 (par, par+CH_LEN] → 恒 2 星）
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（ch1 3 罐 / ch4 反推 3 配方卡）：
     罐/卡/目标卡 offsetWidth/offsetHeight ≥64、缸高 ≥120、overflowX ≤0、
     罐/卡与目标卡描边色对底色对比度 ≥3:1（浅色色块的对比由 INK 深描边承担）
   ⑪ clips：23 必备键精确注入 + 总数 ≥23（子集式，r21 §R6：主线注册 4 新键后 27 亦过）
   ⑫ 星级规则：dch1 恒 3★；miss≤par=3★ / ≤par+5=2★ / 否则 1★
   ⑬ verify 提速断言：SPEED=0.12
   ⑭ 反推题单元（flat15 真实 UI 状态机）：mode/picks/pot 恒空/result=目标/
     tapJar 反推守卫 false/选错 wrong 不换题可重选/重复选同卡 same 不罚/选对推进
   ⑮ 首次反推视觉预告：3 卡次第 bounce（.tease 在场，预告可点不指示答案）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  let sawPool2 = { orange: 0, green: 0, purple: 0, lightred: 0, lightyellow: 0, lightblue: 0 };
  let brownPerLv = [], secPerLv = [], revLv = 0;   /* 审查 m2：ch2 补关级构成断言（对称 brownPerLv） */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1].target : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    /* 章分布：flat0-9 dch1 … flat30-39 dch4；ch=flat/5+1（生成关 ch5-8 循环取材） */
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1 &&
                 L1.dch === (L1.ch - 1) % 4 + 1;
    /* 引擎直驱：正推=每题按配方点罐 → 返回序列 = par×'wrong' + 末步 right/done；
       反推=选正确卡 → right/done，tries==0（par=0） */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      if (q.mode === 'reverse') {
        let idx = -1;
        for (let i = 0; i < q.picks.length; i++) if (engMix(q.picks[i]) === q.target) idx = i;
        const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
        const r = engPickRecipe(L3, idx);
        if (r !== exp || q.tries !== 0) driveOk = false;
        continue;
      }
      const rec = RECIPE[q.target], par = PAR[q.target];
      for (let s = 0; s < rec.length; s++) {
        const last = s === rec.length - 1;
        const exp = last ? (k === L3.quizzes.length - 1 ? 'done' : 'right') : 'wrong';
        const r = engTapJar(L3, rec[s]);
        if (r !== exp) { driveOk = false; break; }
      }
      if (!driveOk || q.tries !== par || q.pot.length !== rec.length) driveOk = false;
    }
    /* 反推关最优=一次选对（missTotal 0）；正推最优=engPar（配方中间步各计 1 试调）。
       par 收官定夺 0→1 后 engPar(反推关)=5≠最优 0——断言按各模式最优口径（SPEC §R4） */
    const missOpt = L3.quizzes.every(q => q.mode === 'reverse') ? 0 : engPar(L3);
    const solvedAll = L3.done && L3.step === CH_LEN && L3.missTotal === missOpt && engStars(L3) === 3;
    /* 聚合：ch2 三二级+三浅原色全覆盖+每关恰 2 二级（审查 m2）；ch3 每关恰 2 棕 3 浅二级；ch4 全反推 */
    if (L1.dch === 2) {
      L1.quizzes.forEach(q => { sawPool2[q.target]++; });
      secPerLv.push(L1.quizzes.filter(q => ['orange', 'green', 'purple'].indexOf(q.target) >= 0).length);
    }
    if (L1.dch === 3) {
      const nb = L1.quizzes.filter(q => q.target === 'brown').length;
      brownPerLv.push(nb);
    }
    if (L1.dch === 4 && L1.quizzes.every(q => q.mode === 'reverse')) revLv++;
    const ok = det && ruleOk && chOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
      driveOk: driveOk, solvedAll: solvedAll, targets: L1.quizzes.map(q => q.target),
      jars: L1.quizzes[0].jars, modes: L1.quizzes.map(q => q.mode || 'mix') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const revCh4 = gen[35].modes[0] === 'reverse' && gen[35].modes.every(m => m === 'reverse');
  const distOk = ['orange', 'green', 'purple', 'lightred', 'lightyellow', 'lightblue']
                   .every(c => sawPool2[c] > 0) &&
                 brownPerLv.length === 10 && brownPerLv.every(n => n === 2) &&
                 secPerLv.length === 10 && secPerLv.every(n => n === 2) &&
                 revLv === 10 && revCh4;
  if (distOk) npass++;
  units.dist = { ok: distOk, pool2: sawPool2, brownPerLv: brownPerLv, secPerLv: secPerLv, revLv: revLv, revCh4: revCh4 };

  /* ---- ② 混色表独立对账（selftest 内重算：SPEC-R21 §R3 文字口径独立实现，不引用引擎 MIX） ---- */
  total++;
  function specMix(set) {            /* set=去重颜色数组；SPEC-R21 §R3 规则逐条转译 */
    const has = c => set.indexOf(c) >= 0;
    if (set.length === 1) return set[0];                            // 单色=原色
    if (has('white')) {
      if (set.length === 2) return 'light' + set.filter(c => c !== 'white')[0];  // 白+单原色=浅原色
      if (set.length === 3) {                                       // 白+两原色=浅二级（传递组合律）
        if (has('red') && has('yellow')) return 'lightorange';      // 白+红黄=浅橙
        if (has('yellow') && has('blue')) return 'lightgreen';      // 白+黄蓝=浅绿
        if (has('red') && has('blue')) return 'lightpurple';        // 白+红蓝=浅紫
      }
      return 'mud';                                                 // 白+三原色（4 色）=表外兜底
    }
    if (set.length === 2) {                                         // 三原色两两：红黄橙/黄蓝绿/红蓝紫
      if (has('red') && has('yellow')) return 'orange';
      if (has('yellow') && has('blue')) return 'green';
      if (has('red') && has('blue')) return 'purple';
    }
    if (set.length === 3 && has('red') && has('yellow') && has('blue')) return 'brown';  // 三原色=棕
    return 'mud';
  }
  const BASE = ['red', 'yellow', 'blue', 'white'];
  let mixOk = true, nCase = 0, badCase = null;
  const dupSamples = [['red', 'red'], ['red', 'red', 'blue'], ['white', 'white'],
                      ['red', 'yellow', 'red'], ['blue', 'yellow', 'yellow']];
  for (let mask = 1; mask < 16; mask++) {          // 15 个非空子集
    const set = [];
    for (let b = 0; b < 4; b++) if (mask & (1 << b)) set.push(BASE[b]);
    const want = specMix(set), got = engMix(set);
    nCase++;
    if (want !== got || !COLORS[got]) { mixOk = false; badCase = set.join('+') + '→' + got + '≠' + want; break; }
  }
  for (let i = 0; i < dupSamples.length && mixOk; i++) {   // 重复数组=去重集合语义
    const want = specMix(Array.from(new Set(dupSamples[i]))), got = engMix(dupSamples[i]);
    nCase++;
    if (want !== got) { mixOk = false; badCase = dupSamples[i].join('+') + '→' + got + '≠' + want; }
  }
  if (mixOk) npass++;
  units.mix = { ok: mixOk, nCase: nCase, bad: badCase };

  /* ---- ③ FIFO 缸语义（引擎级，genLevel(0) 题0=green：全序列无中途 right） ---- */
  total++;
  const LF = genLevel(0);                          // 题0=green（中途 red/orange/brown 均非目标）
  engTapJar(LF, 'red'); engTapJar(LF, 'yellow'); engTapJar(LF, 'blue');
  const qF = LF.quizzes[0];
  const fifo3 = qF.pot.join() === 'red,yellow,blue' && qF.result === 'brown';
  const t4r = engTapJar(LF, 'red');                // 第 4 罐：替换最早（red 出）→ 集合未变
  const fifo4 = t4r === 'same' && qF.pot.join() === 'yellow,blue,red';
  const t5r = engTapJar(LF, 'red');                // 第 5 罐：yellow 出 → {blue,red}=紫 重算
  const fifo5 = t5r === 'wrong' && qF.pot.join() === 'blue,red,red' && qF.pot.length === 3 &&
                qF.result === 'purple';
  const fifoOk = fifo3 && fifo4 && fifo5 && POT_DEPTH === 3;
  if (fifoOk) npass++;
  units.fifo = { ok: fifoOk, fifo3: fifo3, fifo4: fifo4, fifo5: fifo5, pot: qF.pot };

  /* ---- ④ 试调计数（引擎级：判非目标=1 试调 / same 不罚 / 缸不清空 / 切题归零） ---- */
  total++;
  const LT = genLevel(0);                          // 题0=green（黄+蓝）
  const t41 = engTapJar(LT, 'yellow');             // yellow≠green → 1 试调
  const qT = LT.quizzes[0];
  const c41 = t41 === 'wrong' && qT.tries === 1 && LT.missTotal === 1 &&
              qT.pot.join() === 'yellow' && qT.result === 'yellow';
  const t42 = engTapJar(LT, 'yellow');             // 重复黄：集合未变 → same 不判不罚
  const c42 = t42 === 'same' && qT.tries === 1 && LT.missTotal === 1 && qT.pot.length === 2;
  const t43 = engTapJar(LT, 'red');                // 红≠green → 第 2 试调；pot 保留=缸不清空继续试
  const c43 = t43 === 'wrong' && qT.tries === 2 && LT.missTotal === 2 &&
              qT.pot.join() === 'yellow,yellow,red' && qT.result === 'orange';
  const LR = genLevel(0);                          // 干净实例直驱配方：right 后切题归零
  engTapJar(LR, 'yellow');
  const t44 = engTapJar(LR, 'blue');               // {yellow,blue}=green 成
  const c44 = t44 === 'right' && LR.step === 1 && LR.quizzes[1].tries === 0 &&
              LR.quizzes[1].pot.length === 0 && LR.quizzes[1].result === null &&
              LR.quizzes[0].pot.join() === 'yellow,blue';
  const triesOk = c41 && c42 && c43 && c44;
  if (triesOk) npass++;
  units.tries = { ok: triesOk, c41: c41, c42: c42, c43: c43, c44: c44 };

  /* ---- ⑤ 点罐单元（flat0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q5 = CM.quiz;
  const initOk = q5 && q5.target === 'green' && q5.jars.length === 3 &&
                 q5.jars[0].color === 'red' && q5.pot.length === 0 && q5.result === null &&
                 q5.tries === 0 && q5.miss === 0;
  const badJar = (await CM.tapJar('white')) === false;            // ch1 无白罐=非法 false
  const r1 = await CM.tapJar('yellow');
  const s1 = r1 === 'wrong' && CM.quiz.pot.join() === 'yellow' &&
             CM.quiz.result === 'yellow' && CM.quiz.tries === 1 && CM.quiz.miss === 1 &&
             CM.currentLevel.miss === 1;
  const r2 = await CM.tapJar('blue');
  const s2 = r2 === 'right' && CM.quiz.step === 1 && CM.quiz.pot.length === 0 &&
             CM.quiz.tries === 0 && CM.quiz.target !== 'green';
  /* 防重入窗：新题（ch1 原色单罐直击）right 判定窗内紧邻点罐=拒绝不推进
     （busy 占位锁同步置位→紧邻调用必被拦，§0.47） */
  const nt = CM.quiz.target;
  const pR = CM.tapJar(nt);                       // → right（240ms 占位锁+650ms 演出窗）
  const rejW = await CM.tapJar(CM.quiz.jars[0].color);   // 窗内紧邻发起=拒绝
  const rR = await pR;
  const winOk = rejW === false && rR === 'right' &&
                CM.quiz.step === 2 && CM.quiz.pot.length === 0 && CM.quiz.tries === 0;
  const tapOk = initOk && badJar && s1 && s2 && winOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badJar: badJar, r1: r1, r2: r2, rR: rR, winReject: winOk };

  /* ---- ⑥ 教学链：tutorialWatch 真实走完 → __cmDemoR='right'（演示调绿） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };            // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;            // 折算真实页时长
  const tutOk = window.__cmDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].target === 'green' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__cmDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑦ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 罐排 bump 微动效 ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                          // 模拟教学"看"演示期
  const swallow1 = (await CM.tapJar('yellow')) === false && jarsEl.classList.contains('bump');
  state.demo = false; state.locked = true;                         // 演出窗口（locked）
  const swallow2 = (await CM.tapJar('yellow')) === false;
  state.locked = false;                                            // 还原
  const swallowOk = swallow1 && swallow2 && CM.quiz.pot.length === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑧ UI 冒烟 A：flat0 autoSolve 通关（dch1 恒 3 星，不弹层） ---- */
  total++;
  startLevel(0);
  const wantTaps = cur.quizzes.reduce((s, q) => s + RECIPE[q.target].length, 0);
  const a0 = await CM.autoSolve();
  const lv0 = CM.currentLevel;
  const smokeA = a0.done && a0.taps === wantTaps && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, want: wantTaps, stars: engStars(cur) };

  /* ---- ⑨ UI 冒烟 B：flat7（r21 dch2=恰 2 二级+3 浅原色，4 罐含白）先点 1 次杂罐再 autoSolve
     杂球=「不在配方里」的罐（dch2 配方恒 2 罐（二级对/原色+白），4 罐必有非配方杂罐；
     防杂球被配方吸收致 miss 不增）；杂球参与 FIFO 收敛：额外试调 ≥1 ≤3/题
     （杂球+首配方罐=二级色 1 错；杂球+两配方罐=浅二级 1 错；FIFO 换出杂球收敛）
     → miss 落 (par, par+CH_LEN] → 恒 2 星 ---- */
  total++;
  startLevel(7);
  const q9 = CM.quiz;
  const rec9 = RECIPE[q9.target];
  const wrongC = q9.jars.map(j => j.color).find(c => rec9.indexOf(c) < 0) ||
                 q9.jars.map(j => j.color).find(c => c !== rec9[0]);   // 全罐配方退路（防御性，dch2 不触发）
  const r9 = await CM.tapJar(wrongC);
  const par9 = engPar(cur);
  const a12 = await CM.autoSolve();
  const lv12 = CM.currentLevel;
  const smokeB = r9 === 'wrong' && a12.done && lv12.done && lv12.won &&
                 lv12.miss > par9 && lv12.miss <= par9 + CH_LEN && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat7 = { ok: smokeB, r9: r9, target0: q9.target, wrongC: wrongC,
                   miss: lv12.miss, par: par9, stars: engStars(cur) };

  /* ---- ⑩ 布局：双 viewport ×（ch1 3 罐 / ch4 4 罐含白）量测 + 描边对比度 ---- */
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
    /* r21：正推关量 .jar 罐 / 反推关（flat35=dch4）量 .recipick 配方卡——触摸目标同为 ≥64 */
    const jars = Array.prototype.map.call(jarsEl.querySelectorAll('.jar, .recipick'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const tgt = { w: targetCard.offsetWidth, h: targetCard.offsetHeight };
    const hitOk = jars.length >= 3 && jars.every(b => b.w >= 64 && b.h >= 64);
    const tgtOk = tgt.w >= 64 && tgt.h >= 64;
    const tankOk = tankEl.offsetHeight >= 120;
    /* 罐/卡描边在 SVG stroke（非按钮 border）：罐身/罐口沿 stroke 全 INK 且对底色 ≥3:1 */
    const strokes = Array.from(jarsEl.querySelectorAll('.jar svg [stroke], .recipick svg [stroke]'))
      .map(el => el.getAttribute('stroke')).filter(Boolean);
    const cJ = strokes.length >= 2 && strokes.every(s => ratioOf(s, '#FBF6EC') >= 3);
    const cT = ratioOf(cssToHex(getComputedStyle(targetCard).borderLeftColor), '#FBF6EC') >= 3 &&
               parseFloat(getComputedStyle(targetCard).borderTopWidth) >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, jars: jars.length, hitOk: hitOk, tgtOk: tgtOk, tankOk: tankOk,
             contrast: cJ && cT, ox: ox, pass: hitOk && tgtOk && tankOk && cJ && cT && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 35]) {
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

  /* ---- ⑪ clips：23 必备键精确注入 + 总数 ≥23（r21 §R6 子集式——主线注册 4 新键
     （col_q_lightorange/lightgreen/lightpurple + col_rev_q）后 27 亦过，防注册前后断言漂移） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['col_tut_watch', 'col_tut_turn', 'col_hint', 'col_right', 'col_wrong'];
  /* T46 阶段2 新键族：题面 10 目标色+颜料名 4 罐+col_green（SPEC §0.51 域——白/浑浊非目标） */
  const T46 = ['red', 'yellow', 'blue', 'orange', 'green', 'purple', 'brown',
               'lightred', 'lightyellow', 'lightblue'].map(c => 'col_q_' + c)
    .concat(['red', 'yellow', 'blue', 'white'].map(c => 'col_paint_' + c))
    .concat(['col_green']);
  const clipsOk = keys.length >= 23 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0) &&
    T46.every(k => !!KIDS.voice.clips[k] && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, t46: T46.length, keys: keys };

  /* ---- ⑫ 星级规则（引擎级构造直测） ---- */
  total++;
  const LA = genLevel(12);                          // dch3：par=engPar 动态（r21 域恒 10；审查 m4 注释陈旧修正）
  LA.missTotal = engPar(LA);
  const st3 = engStars(LA) === 3;
  LA.missTotal = engPar(LA) + CH_LEN;
  const st2 = engStars(LA) === 2;
  LA.missTotal = engPar(LA) + CH_LEN + 1;
  const st1 = engStars(LA) === 1;
  const LB = genLevel(0);                           // dch1 单罐直击恒 3★（miss 再大也不降）
  LB.missTotal = 99;
  const stCh1 = engStars(LB) === 3;
  const starsOk = st3 && st2 && st1 && stCh1;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2, st1: st1, ch1Always3: stCh1 };

  /* ---- ⑬ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑭ 反推题单元（flat15=dch4 首，真实 UI 状态机，r21 §R4） ---- */
  total++;
  startLevel(15);
  const q14 = CM.quiz;
  const init14 = q14 && q14.mode === 'reverse' && q14.jars.length === 0 &&
                 q14.picks.length === 3 && q14.pot.length === 0 &&
                 q14.result === q14.target && q14.tries === 0;
  const guardJar = (await CM.tapJar('red')) === false;      // 反推题点罐=吞输入 false（engTapJar null）
  let wrongIdx = -1, rightIdx = -1;
  for (let i = 0; i < q14.picks.length; i++) {
    if (engMix(q14.picks[i]) === q14.target) rightIdx = i; else if (wrongIdx < 0) wrongIdx = i;
  }
  const rw = await CM.pickRecipe(wrongIdx);                 // 选错=wrong，不换题可重选
  const w14 = rw === 'wrong' && CM.quiz.step === 0 && CM.quiz.tries === 1 &&
              CM.quiz.picked === wrongIdx && CM.currentLevel.miss === 1;
  const rs = await CM.pickRecipe(wrongIdx);                 // 重复选同卡=same 不判不罚
  const s14 = rs === 'same' && CM.quiz.tries === 1 && CM.currentLevel.miss === 1;
  const rr = await CM.pickRecipe(rightIdx);                 // 选对=推进（题0 非末题 → right）
  const r14 = rr === 'right' && CM.quiz.step === 1 && CM.quiz.tries === 0;
  const badPick = (await CM.pickRecipe(99)) === false;      // 非法索引=吞输入 false
  const revOk = init14 && guardJar && w14 && s14 && r14 && badPick && rightIdx >= 0 && wrongIdx >= 0;
  if (revOk) npass++;
  units.reverse = { ok: revOk, init: init14, guardJar: guardJar, wrong: w14, same: s14,
                    right: r14, badPick: badPick, target: q14 && q14.target,
                    picks: q14 && q14.picks, rightIdx: rightIdx, wrongIdx: wrongIdx };

  /* ---- ⑮ 首次反推视觉预告（r21 §R4：3 卡次第 bounce .tease 在场；预告可点不指示答案） ---- */
  total++;
  startLevel(15);                                           // state 重置 → revTeased 清零 → 再触发
  let teased = false;
  for (let t = 0; t < 20 && !teased; t++) {
    await wait(100);
    teased = !!document.querySelector('.recipick.tease');
  }
  const introOk = teased && jarsEl.querySelectorAll('.recipick').length === 3;
  if (introOk) npass++;
  units.revIntro = { ok: introOk, teased: teased };

  const out = { game: 'colormix', total: total, pass: npass, layoutOk: layoutOk,
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
