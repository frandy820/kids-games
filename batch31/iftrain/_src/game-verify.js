/* ================= ?verify=1 自检（仅 verify 分支加载执行）——v2（r3 难度改造）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch 静态 1+flat//5+生成 1-4）/
     引擎直驱（单答案点真值卡→right/提交题勾满+提交→末题 done→全关 3 星）
   ② SPEC 表独立对账（SPEC_PRIMARY/SPEC_SECONDARY/SPEC_COMBOS/SPEC_CONFLICTS/SPEC_INV/
     SPEC_VALID——verify 内从 SPEC-BATCH31 §0.77 v2 文字独立重列，不引用引擎表）× 40 关全题：
     候选恒 4 互异含全部真值 ⊆对应集 / answer 独立复算（multi/best=-1）/ 干扰公平性
     （single 恒含 SECONDARY 近义 / conflict 恒含 tempt 且 ∉ key 次配 / multi 干扰 ∉ 次配集 /
     ruleback 干扰 ∉ valid_sits）/ ch1 恒 single / ch2 恒 multi / ch3 恒 best·conflict /
     ch4 五型各 1 / flat0q0=single/rain/umbrella（教学锚）
   ③ 聚合独占票：ch1 五关 6 情境全现 / ch2 每关 5 组合全现 / ch3 每关 best≥1+conflict≥1、
     五关 best 6 sit 与 conflict 3 行全现 / dch4 每关五型各 1 / 生成关 dch1-4 全现
   ④ tapOpt 单元（flat0 single/rain 4 卡）：越界=null；错=wrong+miss+1+1000ms 防重入
     （首击 fire-and-forget+窗内二击 false）+错链三段（rai_wrong+rai_n_<sit> 名音+keyless
     语义句恒居链尾——Mj-1）+窗后二错照计 miss=2；对=right 推进+确认链（rai_right+
     rai_n_umbrella 两段全 clip）；重听链（名音+题面句两 clip 无 keyless）
   ⑤ tapSubmit 单元（flat5 ch2 multi）：勾错件+提交=wrong_more 清空+miss+1+rai_more 单段；
     勾 1 件+提交=wrong_less 保留+rai_less；取消勾选零惩罚；勾满+提交=right+确认链
     rai_right+两真值名音三段；goBtn 勾满 .ready 计数驱动
   ⑥ tapConflict 单元（flat10 ch3 遍历寻 conflict 题）：诱惑项恒在候选；错链=
     rai_wrong+rai_n_<key 情境>+rai_again_apply clip 键段尾（T46）；对=right
   ⑦ tapRuleback 单元（flat15 ch4 遍历寻 ruleback 题）：错链=rai_wrong+rai_n_<装备>+
     rai_again_back clip 键段尾（T46）；二错 miss=2（错链豁免窗 8000 真时钟）；对=right
   ⑧ 帧内容断言（契约 M：渲染即引擎）：图卡 DOM 数==4、每卡 data-anim==opts[i].anim
     且内含 1 幅 SVG+小字名==SPEC_NAMES[anim]+勾选徽章、题面大图 scene data-ask==出示
     id 串（multi=cond+cond / ruleback=装备）且 svg g[data-anim] 逐个对账+ask-name 小字
     ==名串、q-text 按题型（带什么/两样/什么时候）——flat0 单情境 / flat5 双情境+提交钮
     / flat10 ruleback 三态
   ⑨ 教学链：tutorialWatch() 真实走完（stub 存档）→ __ifDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s
   ⑩ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑪ UI 冒烟：flat0 autoSolve（taps=5 恒 3★）/ flat5（multi 关）autoSolve / flat10 先 1 错
     再 autoSolve（miss=1 → 2★）
   ⑫ 布局：双 viewport（1280×800/800×1180）×（flat0/flat5/flat10）：候选卡恒 4 ≥96×96、
     题面 SVG ≥120px 高、提交题型 goBtn 可见 ≥100×70（单答案题型隐藏）、描边对比度 ≥3:1、
     overflowX ≤0
   ⑬ clips：rai_ 25 条 + core 3 条全注入 + duration 辨别器（SPEC §4 v1+r3 实长表 ±60ms，
     Promise.all+Audio——bubble ⑦ 先例）
   ⑭ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑮ 契约 A/B/E/F/I/J/K 源码断言（读自身合并 script 文本；A=两处 nextHint(lim-1)——r3 统一；
     B 含救援双锚 14s/30s 节流）
   ⑯ 章末预告 C7 独立硬编码对账（hint[i]↔CHAPTERS[i+1]）+ 生成关 nextHint 实算对账
   ⑰ estMs 语音窗动态断言：判对窗 6400 ≥ 2544+150+1632+150+1536+300=6312（两件确认链）；
     教学开题链演示窗 3700 ≥ 1416+150+1824+300=3690；watch 延 3700 ≥ 3360+300=3660；
     turn 延 2200 ≥ 1872+300=2172；celebrate 3020 ≥ 2544+300=2844；链豁免 8000 ≥
     1656+150+1584+150+2904+300=6744（single/conflict 同构）/ ≥ 1656+150+1632+150+
     2856+300=6744（ruleback）——T46 clip 实长口径；提交反馈窗 500/600（视觉锁）
   ⑱ SPEED=0.12 提速断言
   结果写 #verify-result + window.__ifVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH31 §0.77 v2/§2/§4 文字独立重列（禁抄页面 IF_PRIMARY 等表/文案） */
  const SPEC_PRIMARY = { rain: 'umbrella', sun: 'sunhat', snow: 'scarf',
                         cold: 'coat', hot: 'fan', wind: 'kite' };          // 主配 6
  const SPEC_SECONDARY = { rain: 'coat', sun: 'umbrella', snow: 'coat',
                           cold: 'scarf', hot: 'sunhat', wind: 'scarf' };   // 次配 6（封闭 12）
  const SPEC_SITS = ['rain', 'sun', 'snow', 'cold', 'hot', 'wind'];
  const SPEC_GEARS = ['umbrella', 'sunhat', 'scarf', 'coat', 'fan', 'kite'];
  const SPEC_INV = { umbrella: 'rain', sunhat: 'sun', scarf: 'snow',
                     coat: 'cold', fan: 'hot', kite: 'wind' };              // 主配逆
  const SPEC_VALID = {};                          // 装备 → 主∪次情境集（ruleback 干扰禁区）
  for (const s in SPEC_PRIMARY) {
    (SPEC_VALID[SPEC_PRIMARY[s]] = SPEC_VALID[SPEC_PRIMARY[s]] || []).push(s);
    (SPEC_VALID[SPEC_SECONDARY[s]] = SPEC_VALID[SPEC_SECONDARY[s]] || []).push(s);
  }
  const SPEC_COMBOS = [                           // ch2 组合表（两条件 → 两件；口播序）
    ['rain', 'wind', 'umbrella', 'coat'],
    ['cold', 'rain', 'coat', 'umbrella'],
    ['snow', 'wind', 'scarf', 'coat'],
    ['sun', 'wind', 'sunhat', 'kite'],
    ['sun', 'hot', 'sunhat', 'fan'] ].map(a => ({ conds: [a[0], a[1]], need: [a[2], a[3]] }));
  const SPEC_CONFLICTS = [                        // ch3 冲突表（conds, key 必须条件, gear 答案, tempt 诱惑）
    { conds: ['hot', 'rain'], key: 'rain', gear: 'umbrella', tempt: 'fan' },
    { conds: ['rain', 'sun'], key: 'rain', gear: 'umbrella', tempt: 'sunhat' },
    { conds: ['cold', 'wind'], key: 'cold', gear: 'coat', tempt: 'kite' } ];
  const SPEC_NAMES = { rain: '下雨', umbrella: '雨伞', sun: '大太阳', sunhat: '太阳帽',
                       snow: '下雪', scarf: '围巾', cold: '天冷冷', coat: '外套',
                       hot: '天热热', fan: '小扇子', wind: '刮大风', kite: '小风筝' };
  const SPEC_APPLY_AGAIN = '再看看外面是什么天气';     // 正向错语义句（10 字）
  const SPEC_BACK_AGAIN = '再想想什么时候用它';        // ruleback 错语义句（9 字）
  const SPEC_DUR = { rai_tut_watch: 3360, rai_tut_turn: 1872, rai_hint: 2016, rai_right: 2544,
                     rai_wrong: 1656, rai_q1: 1824, rai_q2: 2136,
                     rai_q_two: 1944, rai_multi_hint: 2496, rai_best_hint: 2232,
                     rai_conflict_hint: 2280, rai_less: 2832, rai_more: 3096,   // r3 新增 6 条
                     rai_n_rain: 1416, rai_n_umbrella: 1368, rai_n_sun: 1560,
                     rai_n_sunhat: 1536, rai_n_snow: 1440, rai_n_scarf: 1344,
                     rai_n_cold: 1560, rai_n_coat: 1368, rai_n_hot: 1584,
                     rai_n_fan: 1632, rai_n_wind: 1536, rai_n_kite: 1608,   // SPEC §4 实长
                     rai_again_apply: 2904, rai_again_back: 2856 };   // T46 阶段2 语义句
  const SPEC_CHAPTER_HINTS = { 1: '两个天气一起想，要带两样', 2: '有时带两样，有时只带一样',
                               3: '正着问反着问，全都来', 4: '新一轮如果下雨选一选' };
  const SPEC_GEN_HINTS = ['四张卡里，选一样', '两个天气，带两样',
                          '两样还是一样，想一想', '正反都来，大集合'];
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const unlocked = async () => {                  // 等错防重入/演出窗结束（verify 提速后 ≤1s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* Mj-1 语义句 clip 化（T46 阶段2）：错链尾段=rai_again_apply/back 键段（text=TTS 兜底），
     全款拼播链无 keyless 段——链尾断言改键段直断 */
  /* 遍历推进直到目标题型出现（ch4 五型各 1 保证必经；ch3 best·conflict 必在场） */
  const seekKind = async kind => {
    for (let g = 0; g < 10; g++) {
      const q = window.IF.quiz;
      if (!q) return null;
      if (q.kind === kind) return q;
      if (!(await unlocked())) return null;
      const r = await driveQ(q);
      if (r === null || r === false) return null;
    }
    return null;
  };
  /* 单题最优驱动（提交题=勾满+提交；单答案=点真值卡）——返回 'right'/'done'/null */
  const driveQ = async q => {
    if (isSubmitKind(q.kind)) {
      for (const g of q.need) {
        const i = q.opts.findIndex(o => o.anim === g);
        if (i >= 0 && q.picked.indexOf(i) < 0) {
          const r = await window.IF.tapOpt(i);
          if (r !== 'pick') return null;
        }
      }
      return await window.IF.tapSubmit();
    }
    return await window.IF.tapOpt(q.answer);
  };

  /* ---- ①② 40 关全量审计 + SPEC 表独立对账 ---- */
  const genDch = {}, mixBad3 = [], covBad = [], kindBad4 = [];
  const ch1Sits = new Set(), ch3Best = new Set(), ch3Cf = new Set();
  let tableOk = true, badCase = null;
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
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = flat < 20 ? L1.dch === Math.floor(flat / 5) + 1   // 静态四档
                           : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数
    /* 引擎直驱：单答案点真值 / 提交题勾满+提交 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      let r;
      if (isSubmitKind(q.kind)) {
        for (const g of q.need) { r = engTapOpt(L3, q.opts.findIndex(o => o.anim === g)); }
        r = engSubmit(L3);
      } else r = engTapOpt(L3, q.answer);
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;

    /* SPEC 表独立对账（每题：候选恒 4 互异含全部真值/answer 复算/干扰公平性/章型规则） */
    let specOk = true;
    const kindsSeen = [];
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const kind = q.kind;
      kindsSeen.push(kind);
      const vals = q.opts.map(o => o.anim);
      const isApply = kind !== 'ruleback';
      /* 章型硬约束（SPEC §0.77 v2 章表） */
      if (L1.dch === 1 && kind !== 'single') { badCase = 'dch1 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 2 && kind !== 'multi') { badCase = 'dch2 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 3 && kind !== 'best' && kind !== 'conflict') { badCase = 'dch3 ' + flat + '/' + k; specOk = false; break; }
      /* flat0 q0 教学锚：single/rain/umbrella */
      if (flat === 0 && k === 0 &&
          (kind !== 'single' || q.conds[0] !== 'rain' || q.need[0] !== 'umbrella')) {
        badCase = 'anchor ' + flat; specOk = false; break;
      }
      /* 出示域独立复算：正向 conds ⊆情境集（multi/conflict 恰 2）/ ruleback ask ∈装备集 */
      if (isApply) {
        const want = (kind === 'multi' || kind === 'conflict') ? 2 : 1;
        if (q.conds.length !== want || !q.conds.every(c => SPEC_SITS.indexOf(c) >= 0)) {
          badCase = 'conds ' + flat + '/' + k; specOk = false; break;
        }
      } else if (SPEC_GEARS.indexOf(q.ask) < 0) { badCase = 'askDomain ' + flat + '/' + k; specOk = false; break; }
      /* 候选恒 4 互异 ⊆ 对应集 */
      const pool = isApply ? SPEC_GEARS : SPEC_SITS;
      if (vals.length !== 4) { badCase = 'optLen ' + flat + '/' + k; specOk = false; break; }
      if (!vals.every(v => pool.indexOf(v) >= 0)) { badCase = 'optPool ' + flat + '/' + k; specOk = false; break; }
      if (new Set(vals).size !== 4) { badCase = 'optDup ' + flat + '/' + k; specOk = false; break; }
      /* need 真值独立换算（按题型对表） */
      let expNeed = null;
      if (kind === 'single') expNeed = [SPEC_PRIMARY[q.conds[0]]];
      else if (kind === 'multi') {
        const cb = SPEC_COMBOS.find(c => c.conds.join() === q.conds.join());
        expNeed = cb ? cb.need : null;
      } else if (kind === 'best') expNeed = [SPEC_PRIMARY[q.conds[0]], SPEC_SECONDARY[q.conds[0]]];
      else if (kind === 'conflict') {
        const cf = SPEC_CONFLICTS.find(c => c.conds.join() === q.conds.join());
        expNeed = cf ? [cf.gear] : null;
      } else expNeed = [SPEC_INV[q.ask]];
      if (!expNeed || q.need.length !== expNeed.length || !expNeed.every(x => q.need.indexOf(x) >= 0)) {
        badCase = 'need ' + flat + '/' + k; specOk = false; break;
      }
      if (!expNeed.every(x => vals.indexOf(x) >= 0)) { badCase = 'optTruth ' + flat + '/' + k; specOk = false; break; }
      const inters = vals.filter(v => expNeed.indexOf(v) < 0);       // 干扰=去真值
      if (inters.length !== 4 - expNeed.length) { badCase = 'distract ' + flat + '/' + k; specOk = false; break; }
      /* 干扰公平性（§0.77 v2 独立断言） */
      if (kind === 'single' && inters.indexOf(SPEC_SECONDARY[q.conds[0]]) < 0) {
        badCase = 'nearMiss ' + flat + '/' + k; specOk = false; break;          // 近义恒在
      }
      if (kind === 'conflict') {
        const cf = SPEC_CONFLICTS.find(c => c.conds.join() === q.conds.join());
        if (!cf || vals.indexOf(cf.tempt) < 0) { badCase = 'temptMiss ' + flat + '/' + k; specOk = false; break; }
        if (inters.indexOf(SPEC_SECONDARY[cf.key]) >= 0) { badCase = 'temptBan ' + flat + '/' + k; specOk = false; break; }
      }
      if (kind === 'multi' && q.conds.some(c => inters.indexOf(SPEC_SECONDARY[c]) >= 0)) {
        badCase = 'multiBan ' + flat + '/' + k; specOk = false; break;          // 半有效排除
      }
      if (kind === 'ruleback' && inters.some(v => SPEC_VALID[q.ask].indexOf(v) >= 0)) {
        badCase = 'backInvalid ' + flat + '/' + k; specOk = false; break;       // 反向干扰禁区
      }
      /* answer 独立复算：单答案=真值卡下标；multi/best=-1 */
      if (isSubmitKind(kind)) { if (q.answer !== -1) { badCase = 'ansSubmit ' + flat + '/' + k; specOk = false; break; } }
      else {
        let expAns = -1;
        for (let j = 0; j < vals.length; j++) if (vals[j] === expNeed[0]) expAns = j;
        if (expAns < 0 || q.answer !== expAns) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
      }
      /* 覆盖素材收集（静态关） */
      if (flat < 20) {
        if (L1.dch === 1) ch1Sits.add(q.conds[0]);
        if (L1.dch === 3 && kind === 'best') ch3Best.add(q.conds[0]);
        if (L1.dch === 3 && kind === 'conflict') ch3Cf.add(q.conds.join());
      }
    }
    if (!specOk) tableOk = false;
    /* 聚合：ch3 每关 best≥1+conflict≥1；ch4 每关五型各 1；ch2 每关 5 组合全现 */
    if (L1.dch === 3 && (kindsSeen.indexOf('best') < 0 || kindsSeen.indexOf('conflict') < 0))
      mixBad3.push(flat);
    if (L1.dch === 4 && new Set(kindsSeen).size !== 5) kindBad4.push(flat);
    if (L1.dch === 2 && new Set(L1.quizzes.map(q => q.conds.join())).size !== SPEC_COMBOS.length)
      covBad.push(flat);
    if (flat >= 20) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  kinds: L1.quizzes.map(q => q.kind + ':' + (q.kind === 'ruleback' ? q.ask : q.conds.join())) };
    if (flat < 20) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ③ 聚合独占票：覆盖/两族在场/生成关四型全现 ---- */
  total++;
  const aggOk = tableOk && mixBad3.length === 0 && covBad.length === 0 && kindBad4.length === 0 &&
    ch1Sits.size === 6 && ch3Best.size === 6 && ch3Cf.size === 3 &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, mixBad3: mixBad3, covBad: covBad, kindBad4: kindBad4,
                  ch1Sits: ch1Sits.size, ch3Best: ch3Best.size, ch3Cf: ch3Cf.size, genDch: genDch };

  /* ---- ④ tapOpt 单元（flat0 single/rain 4 候选）---- */
  total++;
  startLevel(0);
  const q4 = window.IF.quiz;
  const initOk = q4 && q4.kind === 'single' && q4.conds[0] === 'rain' &&
                 q4.opts.length === 4 &&
                 q4.opts.every(o => typeof o.anim === 'string' && SPEC_GEARS.indexOf(o.anim) >= 0) &&
                 q4.opts[q4.answer].anim === 'umbrella' &&
                 q4.opts.some(o => o.anim === SPEC_SECONDARY.rain) &&   // 近义干扰恒在（coat）
                 q4.step === 0 && q4.miss === 0 && q4.answer >= 0;
  const badTap = (await window.IF.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex((o, i) => i !== q4.answer);        // 错卡（4 选 1 的异对装备）
  const pW = window.IF.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await window.IF.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue.length === 3 &&
                window.__lastQueue[0] === 'rai_wrong' &&           // 错链=rai_wrong+情境名音+语义句 clip 键段（T46）
                window.__lastQueue[1] === 'rai_n_rain' &&
                window.__lastQueue[2] && window.__lastQueue[2].key === 'rai_again_apply' &&
                window.__lastQueue[2].text === SPEC_APPLY_AGAIN;
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             window.IF.quiz.miss === 1 && window.IF.currentLevel.miss === 1;
  const rR = await window.IF.tapOpt(q4.answer);
  const chainR = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'rai_right' &&          // 确认链=rai_right+真值名音尾段（全 clip 无 keyless）
                 window.__lastQueue[1] === 'rai_n_umbrella';
  replayQuiz(false);                              // 重听路径：名音+题面句（两 clip 无 keyless）
  const chainQ = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'rai_n_' + window.IF.quiz.conds[0] &&
                 window.__lastQueue[1] === 'rai_q1';
  const s2 = rR === 'right' && chainR && chainQ && window.IF.quiz.step === 1 && window.IF.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1,
                chain: chainA, right: s2, chainR: chainR, chainReplay: chainQ };

  /* ---- ⑤ tapSubmit 单元（flat5 ch2 multi：提交状态机全路径） ---- */
  total++;
  startLevel(5);
  await unlocked();
  const q5 = window.IF.quiz;
  const subShape = q5 && q5.kind === 'multi' && q5.opts.length === 4 && q5.need.length === 2 &&
                   q5.answer === -1 && q5.picked.length === 0 &&
                   SPEC_COMBOS.some(c => c.conds.join() === q5.conds.join() &&
                                         q5.need.every(n => c.need.indexOf(n) >= 0));
  const wI = q5.opts.findIndex(o => q5.need.indexOf(o.anim) < 0);      // 错件下标
  const nI = q5.opts.map((o, i) => q5.need.indexOf(o.anim) >= 0 ? i : -1).filter(i => i >= 0);
  const goShow = goBtn.classList.contains('show');                     // 提交题型恒现
  const pW5 = await window.IF.tapOpt(wI);                              // 勾错件（判定在提交）
  const readyHalf = goBtn.classList.contains('ready');                 // 勾 1/2：未满不呼吸
  const cardHeld = cardEl(wI) && cardEl(wI).classList.contains('held');
  const sW5 = await window.IF.tapSubmit();                             // 含错件=wrong_more 清空+miss
  const moreVoice = window.__lastVoiceKey === 'rai_more';              // 单段 clip 反馈
  const m5 = window.IF.quiz;
  const moreOk = sW5 === 'wrong_more' && m5.picked.length === 0 && m5.miss === 1 &&
                 !cardEl(wI).classList.contains('held') && moreVoice;
  const p1 = await window.IF.tapOpt(nI[0]);                            // 勾 1 件
  const sL5 = await window.IF.tapSubmit();                             // 少选=wrong_less 保留
  const lessOk = p1 === 'pick' && sL5 === 'wrong_less' &&
                 window.IF.quiz.picked.length === 1 && window.IF.quiz.miss === 1;
                 /* rai_less 语音 flat≥3 走家族 J 10s 节流（wrong_more 刚播过→本次静默属设计，
                    不断言——voice 断言仅在 more 首次未节流时成立） */
  const pU = await window.IF.tapOpt(nI[0]);                            // 取消勾选零惩罚
  const unpickOk = pU === 'unpick' && window.IF.quiz.picked.length === 0 &&
                   window.IF.quiz.miss === 1;
  const pA = await window.IF.tapOpt(nI[0]);
  const pB = await window.IF.tapOpt(nI[1]);
  const readyFull = goBtn.classList.contains('ready');                 // 勾满 2/2=.ready（计数驱动）
  const sR5 = await window.IF.tapSubmit();                             // 勾对全集=right
  const chainM = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'rai_right' &&              // 两件确认链（全 clip 无 keyless）
                 q5.need.indexOf(null) < 0 &&
                 window.__lastQueue.slice(1).every(k => q5.need.some(n => 'rai_n_' + n === k));
  const subOk = subShape && goShow && pW5 === 'pick' && !readyHalf && cardHeld &&
                moreOk && lessOk && unpickOk && pA === 'pick' && pB === 'pick' &&
                readyFull && (sR5 === 'right' || sR5 === 'done') && chainM;
  if (subOk) npass++;
  units.tapSubmit = { ok: subOk, shape: subShape, more: moreOk, less: lessOk, unpick: unpickOk,
                      ready: readyFull, right: sR5, chain: chainM };

  /* ---- ⑥ tapConflict 单元（flat10 ch3，遍历寻 conflict：诱惑在候选+key 名音错链） ---- */
  total++;
  startLevel(10);
  const qc = await seekKind('conflict');
  const cfRow = qc && SPEC_CONFLICTS.find(c => c.conds.join() === qc.conds.join());
  const cfShape = qc && cfRow && qc.need.length === 1 && qc.answer >= 0 &&
                  qc.opts[qc.answer].anim === cfRow.gear &&
                  qc.opts.some(o => o.anim === cfRow.tempt);          // 诱惑项恒在候选
  const wC = qc.opts.findIndex((o, i) => i !== qc.answer);
  const rC = await window.IF.tapOpt(wC);
  const chainC = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'rai_wrong' &&
                 window.__lastQueue[1] === 'rai_n_' + cfRow.key &&    // 回锚=必须条件（key）情境名
                 window.__lastQueue[2] && window.__lastQueue[2].key === 'rai_again_apply' &&
                 window.__lastQueue[2].text === SPEC_APPLY_AGAIN;
  const missC = window.IF.quiz.miss === 1;                  // 取值须在推进前（right 后 quiz 换题 miss 归零）
  const rE5 = await window.IF.tapOpt(qc.answer);
  const cfOk = cfShape && rC === 'wrong' && chainC && missC && rE5 === 'right';
  if (cfOk) npass++;
  units.tapConflict = { ok: cfOk, shape: cfShape, chain: chainC, miss1: missC, right: rE5 };

  /* ---- ⑦ tapRuleback 单元（flat15 ch4，遍历寻 ruleback：错链+二错 miss=2） ---- */
  total++;
  startLevel(15);
  const qrb = await seekKind('ruleback');
  const rbShape = qrb && qrb.kind === 'ruleback' &&
                  SPEC_GEARS.indexOf(qrb.ask) >= 0 &&
                  qrb.opts.length === 4 &&
                  qrb.opts.every(o => SPEC_SITS.indexOf(o.anim) >= 0) &&
                  qrb.opts[qrb.answer].anim === SPEC_INV[qrb.ask];
  const wD = qrb.opts.findIndex((o, i) => i !== qrb.answer);
  const rD = await window.IF.tapOpt(wD);
  const chainB = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'rai_wrong' &&
                 window.__lastQueue[1] === 'rai_n_' + qrb.ask &&
                 window.__lastQueue[2] && window.__lastQueue[2].key === 'rai_again_back' &&   // T46 键段
                 window.__lastQueue[2].text === SPEC_BACK_AGAIN;
  const miss1 = window.IF.quiz.miss === 1;
  await new Promise(w => setTimeout(w, 8100));                   // 等出错链豁免窗（真时钟 8000）——窗内二错被吞（b31 家族口径），窗后二错照计 miss=2（梯度可达）（m4：原两行重复手误，删一行）
  const wE = qrb.opts.findIndex((o, i) => i !== qrb.answer && i !== wD);   // 另一错卡
  const rE = await window.IF.tapOpt(wE);
  const miss2 = rE === 'wrong' && window.IF.quiz.miss === 2;       // 第二次错=miss 2（卡不灰可重选）
  const rF = await window.IF.tapOpt(qrb.answer);
  const rbOk = rbShape && rD === 'wrong' && chainB && miss1 && miss2 && rF === 'right';
  if (rbOk) npass++;
  units.tapRuleback = { ok: rbOk, shape: rbShape, chain: chainB, miss1: miss1, miss2: miss2, right: rF };

  /* ---- ⑧ 帧内容断言（契约 M：渲染即引擎——图卡 DOM 数==opts.len+大图出示对账+小字名对账） ---- */
  total++;
  const frameCheck = q => {
    const cards = Array.from(boardEl.querySelectorAll('.card'));
    const domOk = cards.length === q.opts.length &&
      cards.every((c, i) => c.dataset.anim === q.opts[i].anim && c.querySelectorAll(':scope > svg').length === 1 &&
                  c.querySelector('.c-name').textContent === SPEC_NAMES[q.opts[i].anim] &&
                  !!c.querySelector('.check'));                    // 卡=主图 1 幅+小字名+勾选徽章
    const shown = q.kind === 'ruleback' ? [q.ask] : q.conds;
    const gs = Array.from(sceneEl.querySelectorAll('.ask-slot svg > g[data-anim]'));
    const sceneOk = sceneEl.dataset.ask === shown.join('+') &&
                    gs.length === shown.length &&
                    gs.every((g, i) => g.dataset.anim === shown[i]) &&
                    sceneEl.querySelector('.ask-name').textContent === shown.map(s => SPEC_NAMES[s]).join('，');
    const txt = sceneEl.querySelector('.q-text').textContent;
    const txtOk = q.kind === 'ruleback' ? txt.indexOf('什么时候') >= 0
                : isSubmitKind(q.kind) ? txt.indexOf('两样') >= 0
                : txt.indexOf('带什么') >= 0;
    const goOk = isSubmitKind(q.kind) ? goBtn.classList.contains('show')
                                     : !goBtn.classList.contains('show');   // 单答案题型隐藏
    return domOk && sceneOk && txtOk && goOk;
  };
  startLevel(0);                                        // dch1 single：单情境 4 卡
  const fA = frameCheck(window.IF.quiz) && boardEl.querySelectorAll('.card').length === 4;
  startLevel(5);                                        // dch2 multi：双情境+提交钮
  const fB = frameCheck(window.IF.quiz) &&
             sceneEl.querySelectorAll('.ask-mini').length === 2;
  startLevel(15);                                       // dch4 ruleback（遍历寻题）
  const qf = await seekKind('ruleback');
  const fC = !!qf && frameCheck(qf) && window.IF.quiz.kind === 'ruleback';
  const frameOk = fA && fB && fC;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, single: fA, multi: fB, ruleback: fC };

  /* ---- ⑨ 教学链：tutorialWatch 真实走完 → __ifDemoR='right'（演示点雨伞图卡） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__ifDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'single' &&
                cur.quizzes[0].conds[0] === 'rain' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__ifDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑩ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await window.IF.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await window.IF.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && window.IF.quiz.step === 0 && window.IF.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑪ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await window.IF.autoSolve();
  const lv0 = window.IF.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑪ UI 冒烟 B：flat5（dch2 multi 提交关）autoSolve 通关 ---- */
  total++;
  startLevel(5);
  const a5 = await window.IF.autoSolve();
  const smokeB = a5.done && a5.taps === 5 && window.IF.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat5 = { ok: smokeB, taps: a5.taps };

  /* ---- ⑪ UI 冒烟 C：flat10（dch3）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const q10 = window.IF.quiz;
  const wrongC = q10.kind === 'ruleback' ? q10.opts.findIndex((o, i) => i !== q10.answer)
               : q10.need.length > 1 ? q10.opts.findIndex(o => q10.need.indexOf(o.anim) < 0)
               : q10.opts.findIndex((o, i) => i !== q10.answer);
  let r10;
  if (isSubmitKind(q10.kind)) {                     // 提交题：勾错件+提交=wrong_more（miss+1）
    await window.IF.tapOpt(wrongC);
    r10 = await window.IF.tapSubmit();
  } else r10 = await window.IF.tapOpt(wrongC);
  const r10ok = r10 === 'wrong' || r10 === 'wrong_more';   // 单答案=wrong / 提交=wrong_more（均 miss+1）
  const a10 = await window.IF.autoSolve();
  const lv10 = window.IF.currentLevel;
  const smokeC = r10ok && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat10 = { ok: smokeC, r10: r10, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑫ 布局：双 viewport ×（flat0 / flat5 / flat10） ---- */
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
    const q = window.IF.quiz;
    const need = q ? q.opts.length : 4;                    // 候选恒 4（§0.77 v2）
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const svg = sceneEl.querySelector('.ask-slot svg');
    const svgh = svg ? Math.round(svg.getBoundingClientRect().height) : 0;   // SVGElement 无 offsetHeight
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const goVis = q && isSubmitKind(q.kind) ? (goBtn.offsetWidth >= 100 && goBtn.offsetHeight >= 70)
                                            : goBtn.offsetWidth === 0;      // 单答案题型不占位
    const hitOk = cards.length === need && cards.every(b => b.w >= 96 && b.h >= 96);   // 候选卡=主答案按钮
    const sceneOk = svgh >= 100 && sc.w >= 64 && sc.h >= 64;                 // 双情境图 100px/单 144px
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cards: cards.length, svgH: svgh, goVis: goVis,
             hitOk: hitOk, sceneOk: sceneOk, contrast: cB && cS, ox: ox,
             pass: hitOk && sceneOk && goVis && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10]) {
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

  /* ---- ⑬ clips：rai_ 27 条（v1+r3 25+T46 语义句 2）+ core 3 条全注入 + duration 辨别器（±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const raiKeys = ['rai_tut_watch', 'rai_tut_turn', 'rai_hint', 'rai_right', 'rai_wrong',
                   'rai_q1', 'rai_q2', 'rai_q_two', 'rai_multi_hint', 'rai_best_hint',
                   'rai_conflict_hint', 'rai_less', 'rai_more',
                   'rai_again_apply', 'rai_again_back']
                   .concat(SPEC_SITS.concat(SPEC_GEARS).map(w => 'rai_n_' + w));
  const needAll = raiKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 30 &&
    needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
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

  /* ---- ⑭ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑮ 契约 A/B/E/F/I/J/K 源码断言（读自身合并 script 文本——第 3 个 script 块） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const limNeedle = 'nextHint(lim' + ' - 1)';                 // 拼接防 verify 源码自匹配（家族坑：命令行自匹配）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim' + ' - 1) })') >= 0 &&
               src.split(limNeedle).length === 3;   // A：两处 dayEnd 均实算 lim-1（r3 统一，恰 2 处）
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.iftrain && sv.iftrain.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 8000') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcOk = srcA && srcB && srcE && srcF && srcI && srcJ && srcK;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK };

  /* ---- ⑯ 章末预告 C7 独立硬编码对账 + 生成关 nextHint 实算对账 ---- */
  total++;
  const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                 CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                 CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                 CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                 GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                 GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                 nextHint(4) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完）预告 ch2 文案
                 nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                 nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                 nextHint(19) === SPEC_CHAPTER_HINTS[4];
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑰ estMs 语音窗动态断言（b25 定版：窗 ≥ estMs/链实长；clip 实长 SPEC §4 v1+r3）
     判对窗（两件确认链最长，同题共存 fan+sunhat）=2544+150+1632+150+1536+300=6312 ≤ 6400 ---- */
  total++;
  const maxName = SPEC_DUR.rai_n_fan;                      // 装备名音 max 1632（SPEC §4）
  const maxSit = SPEC_DUR.rai_n_hot;                       // 情境名音 max 1584（正向回锚域）
  const winOk = (1600 + 4800) >= SPEC_DUR.rai_right + 150 + maxName + 150 + SPEC_DUR.rai_n_sunhat + 300 &&   // 判对窗 6400 ≥ 6312
                3700 >= SPEC_DUR.rai_n_rain + 150 + SPEC_DUR.rai_q1 + 300 &&   // 教学开题链演示窗 ≥ 3690
                3700 >= SPEC_DUR.rai_tut_watch + 300 &&                        // 教学名音演示延 ≥ 3660
                2200 >= SPEC_DUR.rai_tut_turn + 300 &&                         // turn 后读题延 ≥ 2172
                (2620 + 400) >= SPEC_DUR.rai_right + 300 &&                    // winFlow ≥ 2844
                8000 >= SPEC_DUR.rai_wrong + 150 + maxSit + 150 + SPEC_DUR.rai_again_apply + 300 &&   // single/conflict 链 ≥ 6744（T46 实长）
                8000 >= SPEC_DUR.rai_wrong + 150 + maxName + 150 + SPEC_DUR.rai_again_back + 300;    // ruleback 链 ≥ 6744
  const estData = { confirmWin: 6400,
                    confirmNeed: SPEC_DUR.rai_right + 150 + maxName + 150 + SPEC_DUR.rai_n_sunhat + 300,
                    tutChainWin: 3700, tutChainNeed: SPEC_DUR.rai_n_rain + 150 + SPEC_DUR.rai_q1 + 300,
                    watchT: 3700, turnDelay: 2200, rightFlow: 3020,
                    wrongChain: 8000,
                    chainNeedApply: SPEC_DUR.rai_wrong + 150 + maxSit + 150 + SPEC_DUR.rai_again_apply + 300,
                    chainNeedBack: SPEC_DUR.rai_wrong + 150 + maxName + 150 + SPEC_DUR.rai_again_back + 300,
                    submitLess: SPEC_DUR.rai_less, submitMore: SPEC_DUR.rai_more };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑱ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'iftrain', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__ifVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；
     voice.queue 记录拼播链（__lastQueue）供反馈链/确认链绑定断言 */
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
