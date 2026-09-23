/* ================= ?verify=1 自检（仅 verify 分支加载执行；r4 六族题型全量对账）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成一致）/
     章型规则（structWhy 全 null）/ 章号映射 / 章型 kind 计数独立判（dch1=1home+3feed+1chain /
     dch2=3hib+2struct 两向都有 / dch3=5dual 对覆盖全 5 / dch4=home+feed+hib+dual+chain|struct）/
     引擎直驱（逐题点应选→right/末题 done→全关 3 星）/ 生成关四型全现
   ② 封闭集独立对账：SPEC_ANIMALS24 习性标签表（home/diet/hib/swim/egg/fly/food）+
     SPEC_FOOD6/SPEC_CHAINS4/SPEC_STRUCTS4/SPEC_HIB4/SPEC_DUAL5（verify 内从 SPEC-BATCH25
     §0.60 r4 版本块文字独立重列，不引用引擎 ANIMALS/FOOD/CHAINS/STRUCTS/CONDS）× 40 关全题：
     按 kind 独立复算答案合法+干扰合法+恰 1 正确+4 卡互异（断言从 SPEC 语义推导）
   ③ ch3 多条件交集专项（flat10-14 五关全题，照 shapecount ⑱ 先例）：双干扰在场独立判
     （只满足 A 的 + 只满足 B 的都在候选）+ 恰 1 双满足 + 5 对条件每关全覆盖
   ④ 点候选单元（flat0 q0 home：错窗防重入/反馈绑定所点环境/miss 口径）
   ④b 新题型点选单元：flat5 hib / flat10 dual 无捷径 DOM 断言（题面无 .animal-slot 且
     data-animal=''——答案动物不在题面；chain 题面 data-animal=链成员 ≠ 答案——两读法分叉点钉死）+
     错反馈绑定题型（flat1<3 必播通道实测 chain→hab_w_chain + WVOICE_KIND 五族静态钉死；
     flat≥3 错反馈走 10s 节流=P1 试玩沉淀机制，不在 verify 内重放）
   ⑤ 教学链：tutorialWatch() 真实走完（stub 存档）→ __hbDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；flat0 题0 恒 home fish（锚点）
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 候选卡排容器 bump（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=5，恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3 dual）先点 1 次错再 autoSolve（miss=1 → 2 星）
   ⑨ 分布聚合：dch1 feed 题面∈SPEC FEED 集+3 题答案互异 / dch2 hib 两向+struct 特征互异 /
     dch3 答案互异 / 推理占比（非 home 题/关：dch1 4/5、dch2 5/5、dch3 5/5、dch4 ≥4/5）
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（flat0 home / flat5 hib / flat10 dual /
     chain 题面（flat0 step=4 直渲））：候选卡 ≥96×96、题面卡 ≥64、overflowX ≤0、
     对比度 ≥3:1、q-text 与题面图形 bbox 严格不相交（r3 m3 实锤——静态推算临界必须实测）
   ⑪ clips：hab_ 130 条 + core 3 条全注入（dataURI 前缀）+ 时长辨别器 126 键全对账
     （new Audio onloadedmetadata 与实测表差 ≤60ms，8000ms 超时；T46 阶段2 扩容）
   ⑫ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★
   ⑬ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1（家族 F）
   ⑭ verify 提速断言：SPEED=0.12
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH25 §0.60 r4 版本块文字独立重列（禁抄页面 ANIMALS/FOOD/CHAINS/STRUCTS/CONDS）：
     动物 24：id → [home, diet(herb|carn|omni), hib, swim, egg, fly, food(null=非 feed 题面)] */
  const SPEC_A = {
    fish:['pond','carn',0,1,1,0,null],       frog:['pond','carn',1,1,1,0,'bug'],
    bird:['sky','carn',0,0,1,1,'bug'],       hen:['farm','omni',0,0,1,0,null],
    pig:['farm','omni',0,0,0,0,null],        rabbit:['forest','herb',0,0,0,0,'grass'],
    lion:['grassland','carn',0,0,0,0,'meat'],elephant:['grassland','herb',0,0,0,0,'grass'],
    zebra:['grassland','herb',0,0,0,0,'grass'],monkey:['forest','omni',0,0,0,0,'fruit'],
    woodpecker:['forest','carn',0,0,1,1,'bug'],dolphin:['ocean','carn',0,1,0,0,'fish'],
    whale:['ocean','carn',0,1,0,0,'fish'],   camel:['desert','herb',0,0,0,0,'grass'],
    scorpion:['desert','carn',0,0,1,0,'bug'],bear:['forest','omni',1,0,0,0,'fish'],
    snake:['grassland','carn',1,0,1,0,null], turtle:['pond','omni',1,1,1,0,null],
    fox:['forest','carn',0,0,0,0,'meat'],    eagle:['sky','carn',0,0,1,1,'meat'],
    duck:['pond','omni',0,1,1,1,null],       squirrel:['forest','herb',0,0,0,0,'fruit'],
    cow:['farm','herb',0,0,0,0,'grass'],     tiger:['forest','carn',0,0,0,0,'meat']
  };
  const SPEC_ENV7 = ['forest', 'grassland', 'ocean', 'desert', 'pond', 'sky', 'farm'];
  const SPEC_NEAR = { pond: 'ocean', ocean: 'pond',
                      grassland: 'desert', desert: 'grassland',
                      forest: 'farm', farm: 'forest' };
  const SPEC_COMMON = ['fish', 'frog', 'bird', 'hen', 'pig', 'rabbit'];
  const SPEC_COMMON_ENVS = ['pond', 'sky', 'farm', 'forest'];
  const SPEC_FOOD6 = ['grass', 'meat', 'bug', 'fish', 'fruit', 'candy'];
  const SPEC_CHAINS = { c1: ['grass', 'rabbit', 'eagle'], c2: ['grass', 'zebra', 'lion'],
                        c3: ['bug', 'frog', 'snake'],     c4: ['fruit', 'monkey', 'tiger'] };
  const SPEC_HIB = ['bear', 'snake', 'turtle', 'frog'];          // 冬眠集封闭 4
  const SPEC_ABILITY4 = ['swim', 'fly', 'run', 'dig'];
  const SPEC_STRUCTS = { web: 'swim', wing: 'fly', legs: 'run', claws: 'dig' };
  /* 交集对封闭 5：[condA, condB]（谓词独立实现——禁引用页面 CONDS） */
  const SPEC_T = {
    swim: a => SPEC_A[a][3] === 1,
    hib: a => SPEC_A[a][2] === 1,
    egg: a => SPEC_A[a][4] === 1,
    nowegg: a => SPEC_A[a][4] === 0,
    water: a => SPEC_A[a][0] === 'pond' || SPEC_A[a][0] === 'ocean',
    farm: a => SPEC_A[a][0] === 'farm',
    herb: a => SPEC_A[a][1] === 'herb'
  };
  const SPEC_DUALS = { swim_hib: ['swim', 'hib'], water_nowegg: ['water', 'nowegg'],
                       hib_egg: ['hib', 'egg'], swim_egg: ['swim', 'egg'], farm_herb: ['farm', 'herb'] };
  /* SPEC_DUR 真值表（浏览器 new Audio(dataURI) onloadedmetadata 实测，2026-09-13；
     v1 11 条复测与 game-main v1 注释吻合；r4 新 10 条）
     T46 阶段2：SPEC_DUR2=题面/确认整句键 31 条（hab_st_ 19+hab_cf_ 12）；链段键（hab_an/ev/
     fd/act/dq/s 共 74）由页面 HAB_MS 表 vs mp3 实测互证（两独立信源对账，calendar 先例） */
  const SPEC_DUR = {
    hab_tut_watch: 3144, hab_tut_turn: 1776, hab_hint: 2256, hab_right: 2544,
    hab_w_forest: 3936, hab_w_grassland: 3696, hab_w_ocean: 4200, hab_w_desert: 4440,
    hab_w_pond: 3696, hab_w_sky: 3528, hab_w_farm: 4176,
    hab_hint_feed: 2280, hab_hint_chain: 2640, hab_hint_hib: 2664, hab_hint_struct: 2712, hab_hint_dual: 2544,
    hab_w_feed: 2016, hab_w_chain: 3024, hab_w_hib: 3168, hab_w_struct: 2592, hab_w_dual: 3384
  };
  const SPEC_DUR2 = {
    hab_st_dn_bug_frog_snake: 2904, hab_st_dn_fruit_monkey_tiger: 2808, hab_st_dn_grass_rabbit_eagle: 2952, hab_st_dn_grass_zebra_lion: 2880,
    hab_st_dual_farm_herb: 3816, hab_st_dual_hib_egg: 4008, hab_st_dual_swim_egg: 3600, hab_st_dual_swim_hib: 4344, hab_st_dual_water_nowegg: 3912,
    hab_st_hib_awake: 4344, hab_st_hib_sleep: 3912,
    hab_st_struct_claws: 3480, hab_st_struct_legs: 3216, hab_st_struct_web: 3168, hab_st_struct_wing: 3000,
    hab_st_up_bug_frog_snake: 7824, hab_st_up_fruit_monkey_tiger: 7512, hab_st_up_grass_rabbit_eagle: 7728, hab_st_up_grass_zebra_lion: 7200,
    hab_cf_dn_bug_frog_snake: 3888, hab_cf_dn_fruit_monkey_tiger: 3792, hab_cf_dn_grass_rabbit_eagle: 3888, hab_cf_dn_grass_zebra_lion: 3672,
    hab_cf_struct_claws: 3264, hab_cf_struct_legs: 3000, hab_cf_struct_web: 2976, hab_cf_struct_wing: 2952,
    hab_cf_up_bug_frog_snake: 3960, hab_cf_up_fruit_monkey_tiger: 3792, hab_cf_up_grass_rabbit_eagle: 3864, hab_cf_up_grass_zebra_lion: 3912
  };
  const ANIMAL_IDS = Object.keys(SPEC_A);
  const specFood = a => SPEC_A[a][6];

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dchAgg = { 1: { feedSet: {}, feedAdj: true, hibDirs: {} }, genDch: {} };
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                       : (L1.dch >= 1 && L1.dch <= 4);
    /* 章型 kind 计数独立判（SPEC r4 章型文字） */
    const ks = L1.quizzes.map(q => q.kind);
    const cnt = k => ks.filter(x => x === k).length;
    let kindOk = true;
    if (L1.dch === 1) kindOk = cnt('home') === 1 && cnt('feed') === 3 && cnt('chain') === 1;
    else if (L1.dch === 2) kindOk = cnt('hib') === 3 && cnt('struct') === 2;
    else if (L1.dch === 3) kindOk = cnt('dual') === 5;
    else kindOk = cnt('home') === 1 && cnt('feed') === 1 && cnt('hib') === 1 &&
                  cnt('dual') === 1 && (cnt('chain') + cnt('struct')) === 1;
    /* 引擎直驱：逐题点应选 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const i = correctIdx(q);
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapScene(L3, i);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 聚合（⑨ 数据源） */
    if (flat >= STATIC_LEVELS) dchAgg.genDch[L1.dch] = (dchAgg.genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && kindOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                   dchOk: dchOk, kindOk: kindOk, driveOk: driveOk, solvedAll: solvedAll,
                   kinds: ks,
                   animals: L1.quizzes.map(q => q.animal || q.home) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const distOk = dchAgg.genDch[1] > 0 && dchAgg.genDch[2] > 0 &&
                 dchAgg.genDch[3] > 0 && dchAgg.genDch[4] > 0;      // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, genDch: dchAgg.genDch };

  /* ---- ② SPEC 独立封闭表对账（× 40 关全题，按 kind 独立复算） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const kinds = q.scenes.map(s => s.kind);
      if (kinds.length !== 4 || kinds.filter((v, i, a) => a.indexOf(v) === i).length !== 4) {
        badCase = 'len/dup ' + flat + '/' + k; tableOk = false; break outer;
      }
      if (kinds.filter(v => v === q.home).length !== 1) {
        badCase = 'homeN ' + flat + '/' + k; tableOk = false; break outer;
      }
      if (q.kind === 'home') {                       // home：动物∈24 表且 home=表值；场景∈7；
        if (!SPEC_A[q.animal] || q.home !== SPEC_A[q.animal][0]) {   // ch1=常见池+常见环境 4 全集；
          badCase = 'home-table ' + flat + '/' + k; tableOk = false; break outer;   // ch4=近对必在场
        }
        if (!kinds.every(v => SPEC_ENV7.indexOf(v) >= 0)) { badCase = 'home-lib ' + flat + '/' + k; tableOk = false; break outer; }
        if (flat === 0 && k === 0 && q.animal !== 'fish') { badCase = 'anchor ' + flat; tableOk = false; break outer; }
        if (L.dch === 1) {
          if (SPEC_COMMON.indexOf(q.animal) < 0 || kinds.slice().sort().join() !== SPEC_COMMON_ENVS.slice().sort().join()) {
            badCase = 'home-ch1 ' + flat + '/' + k; tableOk = false; break outer;
          }
        } else if (SPEC_NEAR[q.home] && kinds.indexOf(SPEC_NEAR[q.home]) < 0) {
          badCase = 'home-near ' + flat + '/' + k; tableOk = false; break outer;
        }
      } else if (q.kind === 'feed') {                // feed：题面 food≠null 且=答案；candy 恒在场；候选∈6
        if (specFood(q.animal) == null || q.home !== specFood(q.animal)) {
          badCase = 'feed-ans ' + flat + '/' + k; tableOk = false; break outer;
        }
        if (!kinds.every(v => SPEC_FOOD6.indexOf(v) >= 0) || kinds.indexOf('candy') < 0) {
          badCase = 'feed-lib/candy ' + flat + '/' + k; tableOk = false; break outer;
        }
      } else if (q.kind === 'chain') {               // chain：答案=dir 对应链位；干扰=链外
        const c = SPEC_CHAINS[q.chain];              // 且 up 型禁 food==base（防草食双正确）
        if (!c) { badCase = 'chain-lib ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.home !== (q.dir === 'up' ? c[2] : c[1])) { badCase = 'chain-ans ' + flat + '/' + k; tableOk = false; break outer; }
        if (!kinds.every(v => SPEC_A[v])) { badCase = 'chain-lib2 ' + flat + '/' + k; tableOk = false; break outer; }
        for (let j = 0; j < 4; j++) {
          const v = kinds[j];
          if (v !== q.home && (v === c[1] || v === c[2])) { badCase = 'chain-member ' + flat + '/' + k; tableOk = false; break outer; }
          if (q.dir === 'up' && v !== q.home && specFood(v) === c[0]) { badCase = 'chain-base ' + flat + '/' + k; tableOk = false; break outer; }
        }
      } else if (q.kind === 'hib') {                 // hib：sleep 答案∈4 集干扰全不在；awake 反之
        if (q.dir === 'sleep' && (SPEC_HIB.indexOf(q.home) < 0 || !kinds.every(v => v === q.home || SPEC_HIB.indexOf(v) < 0))) {
          badCase = 'hib-sleep ' + flat + '/' + k; tableOk = false; break outer;
        }
        if (q.dir === 'awake' && (SPEC_HIB.indexOf(q.home) >= 0 || !kinds.every(v => v === q.home || SPEC_HIB.indexOf(v) >= 0))) {
          badCase = 'hib-awake ' + flat + '/' + k; tableOk = false; break outer;
        }
      } else if (q.kind === 'struct') {              // struct：候选=能力 4 全集；答案=特征→功能
        if (!SPEC_STRUCTS[q.feat] || q.home !== SPEC_STRUCTS[q.feat]) {
          badCase = 'struct-ans ' + flat + '/' + k; tableOk = false; break outer;
        }
        if (kinds.slice().sort().join() !== SPEC_ABILITY4.slice().sort().join()) {
          badCase = 'struct-set ' + flat + '/' + k; tableOk = false; break outer;
        }
      } else {                                       /* dual：答案双满足恰 1；干扰=A-only/B-only/双无各 ≥1 */
        const dd = SPEC_DUALS[q.pair];
        if (!dd) { badCase = 'dual-lib ' + flat + '/' + k; tableOk = false; break outer; }
        const tA = SPEC_T[dd[0]], tB = SPEC_T[dd[1]];
        const both = kinds.filter(v => tA(v) && tB(v));
        const onlyA = kinds.filter(v => tA(v) && !tB(v));
        const onlyB = kinds.filter(v => !tA(v) && tB(v));
        const never = kinds.filter(v => !tA(v) && !tB(v));
        if (both.length !== 1 || both[0] !== q.home || onlyA.length < 1 || onlyB.length < 1 || never.length < 1) {
          badCase = 'dual-set ' + flat + '/' + k + ' b' + both.length + ' A' + onlyA.length + ' B' + onlyB.length + ' N' + never.length;
          tableOk = false; break outer;
        }
      }
    }
  }
  if (tableOk) npass++;
  units.table = { ok: tableOk, bad: badCase };

  /* ---- ③ ch3 多条件交集专项（flat10-14 五关全题：双干扰在场独立判+对覆盖全 5+答案互异） ---- */
  total++;
  const nearDetail = [];
  let dual3Ok = true;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    if (L.dch !== 3) { dual3Ok = false; break; }
    const pairsSeen = {}, answersSeen = {};
    L.quizzes.forEach(q => {
      const dd = SPEC_DUALS[q.pair];
      const tA = SPEC_T[dd[0]], tB = SPEC_T[dd[1]];
      const others = q.scenes.map(s => s.kind).filter(v => v !== q.home);
      const inA = others.some(v => tA(v) && !tB(v));          // 只满足 A 在场（独立判）
      const inB = others.some(v => !tA(v) && tB(v));          // 只满足 B 在场（独立判）
      if (!inA || !inB) dual3Ok = false;
      pairsSeen[q.pair] = true;
      if (answersSeen[q.home]) dual3Ok = false;               // 答案互异
      answersSeen[q.home] = true;
    });
    if (Object.keys(pairsSeen).length !== 5) dual3Ok = false; // 5 对全覆盖
    nearDetail.push(Object.keys(pairsSeen).join(','));
  }
  if (dual3Ok) npass++;
  units.dual3 = { ok: dual3Ok, pairs: nearDetail };

  /* ---- ④ 点候选单元（flat0 q0 home：错窗防重入 / 反馈绑定所点环境 / miss 口径） ---- */
  total++;
  startLevel(0);
  const q4 = HB.quiz;
  const initOk = q4 && q4.kind === 'home' && q4.animal === 'fish' && q4.home === 'pond' &&
                 q4.scenes.length === 4 &&
                 q4.scenes.map(s => s.id).join() === 's0,s1,s2,s3' &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await HB.tapScene(99)) === false;           // 非法下标=false（不炸）
  const wrongs = q4.scenes.map((s, i) => ({ k: s.kind, i: i })).filter(x => x.k !== q4.home);
  const wA = wrongs[0], wB = wrongs[1];
  const pW = HB.tapScene(wA.i);                               // → wrong（1000ms 防重入窗）
  const rejW = await HB.tapScene(wA.i);                       // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const key1 = window.__lastVoiceKey === 'hab_w_' + wA.k;     // 反馈 clip=所点环境（home 沿 v1）
  const s1 = rW === 'wrong' && rejW === false && key1 &&
             HB.quiz.miss === 1 && HB.currentLevel.miss === 1;
  const pW2 = HB.tapScene(wB.i);
  const rW2 = await pW2;
  const key2 = window.__lastVoiceKey === 'hab_w_' + wB.k && wA.k !== wB.k;
  const s1b = rW2 === 'wrong' && key2 && HB.quiz.miss === 2;
  const rR = await HB.tapScene(q4.scenes.findIndex(s => s.kind === q4.home));
  /* T46 阶段2：判对确认 home 5 段链=[名,住在,环境,里，,动作]——首末键轨+拼接对 SPEC 句 */
  const confQ = window.__lastQueue;
  const confOk = confQ && confQ.length === 5 &&
                 confQ[0].key === 'hab_an_fish' && confQ[4].key === 'hab_act_fish' &&
                 confQ.map(p => p.text).join('') === '小鱼住在池塘里，游来游去';
  const s2 = rR === 'right' && HB.quiz.step === 1 && HB.quiz.miss === 0 && confOk;
  const tapOk = initOk && badTap && s1 && s1b && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1, wrongB: s1b,
                wrongKeys: [wA.k, wB.k], right: s2, confirm: confOk };

  /* ---- ④b 新题型反馈绑定 + 无捷径断言（两读法分叉点：答案动物不得出现在题面） ---- */
  total++;
  startLevel(5);                                              // dch2 → q0=hib(sleep)
  const q5 = HB.quiz;
  const hibKindOk = q5 && q5.kind === 'hib' && q5.hibDir === 'sleep';
  const hibNoSlot = !sceneEl.querySelector('.animal-slot') && sceneEl.dataset.animal === '';
  startLevel(10);                                             // dch3 → q0=dual
  const q10 = HB.quiz;
  const dualKindOk = q10 && q10.kind === 'dual' && SPEC_DUALS[q10.conds.a + '_' + q10.conds.b];
  const dualNoSlot = !sceneEl.querySelector('.animal-slot') && sceneEl.dataset.animal === '';
  startLevel(1);                                              // dch1 → 直驱 q4=chain（渲染后 DOM 断言）
  cur.step = 4; renderQuiz();
  const qch = HB.quiz;
  const shownEl = sceneEl.querySelector('.ch-animal');
  const chainOk = qch && qch.kind === 'chain' && shownEl &&   // 两读法分叉点：题面显示的链成员 ≠ 答案
                  shownEl.dataset.animal !== qch.home &&      // （up=显链中隐顶 / down=显顶隐中——DOM 级钉死）
                  sceneEl.dataset.animal !== qch.home;
  /* 错反馈绑定题型实测：flat1（<3 每错必播，无 10s 节流）chain 题点错 → hab_w_chain；
     五族其余键静态钉死（sayW→WVOICE_KIND 分支已被 chain 实测覆盖） */
  const wCh = qch.scenes.map((s, i) => ({ k: s.kind, i: i })).filter(x => x.k !== qch.home)[0];
  const rC = await HB.tapScene(wCh.i);
  const keyC = window.__lastVoiceKey === 'hab_w_chain';
  const wvOk = ['feed', 'chain', 'hib', 'struct', 'dual'].every(k =>
    WVOICE_KIND[k] && WVOICE_KIND[k].key === 'hab_w_' + k && WVOICE_KIND[k].text);
  const newKindOk = hibKindOk && hibNoSlot &&
                    dualKindOk && dualNoSlot && chainOk &&
                    rC === 'wrong' && keyC && wvOk;
  if (newKindOk) npass++;
  units.newKinds = { ok: newKindOk, hib: { kind: hibKindOk, noSlot: hibNoSlot },
                     dual: { kind: dualKindOk, noSlot: dualNoSlot },
                     chain: { ok: chainOk, shown: shownEl ? shownEl.dataset.animal : null, home: qch ? qch.home : null },
                     wv: { tapR: rC, key: keyC, table: wvOk } };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __hbDemoR='right'（演示送小鱼回池塘） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__hbDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].animal === 'fish' &&
                cur.quizzes[0].kind === 'home' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__hbDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 候选卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await HB.tapScene(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await HB.tapScene(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && HB.quiz.step === 0 && HB.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await HB.autoSolve();
  const lv0 = HB.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3 交集）先点 1 次错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = HB.quiz;
  const wrongC = q8.scenes.findIndex(s => s.kind !== q8.home);
  const r8 = await HB.tapScene(wrongC);
  const a10 = await HB.autoSolve();
  const lv10 = HB.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑨ 分布聚合：推理占比+feed 集合+hib 两向+特征互异（从 levels/gen 聚合再算） ---- */
  total++;
  let aggOk = true;
  const aggFail = [];
  const allLv = [];
  for (let flat = 0; flat < 40; flat++) allLv.push(genLevel(flat));
  allLv.forEach(L => {
    const reason = L.quizzes.filter(q => q.kind !== 'home').length;   // 推理题数/关
    const need = L.dch === 1 ? 4 : (L.dch === 2 || L.dch === 3 ? 5 : 4);
    if (reason < need) { aggOk = false; aggFail.push(['reason', L.flat, reason]); }
    if (L.dch === 1) {
      const feeds = L.quizzes.filter(q => q.kind === 'feed');
      if (!feeds.every(q => SPEC_A[q.animal] && specFood(q.animal) != null)) { aggOk = false; aggFail.push(['feedSet', L.flat]); }
      const homes3 = feeds.map(q => q.home);
      if (homes3.filter((v, i, a) => a.indexOf(v) === i).length !== 3) { aggOk = false; aggFail.push(['feedDist', L.flat, homes3]); }
    }
    if (L.dch === 2) {
      const dirs = L.quizzes.filter(q => q.kind === 'hib').map(q => q.dir);
      if (!dirs.some(d => d === 'sleep') || !dirs.some(d => d === 'awake')) { aggOk = false; aggFail.push(['hibDirs', L.flat, dirs]); }
      const feats = L.quizzes.filter(q => q.kind === 'struct').map(q => q.feat);
      if (feats[0] === feats[1]) { aggOk = false; aggFail.push(['featDup', L.flat, feats]); }
    }
  });
  if (aggOk) npass++;
  units.agg = { ok: aggOk, fail: aggFail.slice(0, 5) };

  /* ---- ⑩ 布局：双 viewport ×（home flat0 / hib flat5 / dual flat10 / chain flat0-q4 直渲）
     量测 + 对比度 + q-text 与题面图形 bbox 严格不相交（r3 m3：临界必实测） ---- */
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
  const overlaps = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 &&
                              a.top < b.bottom - 1 && b.top < a.bottom - 1;   // 严格相交（1px 容差防亚像素）
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(g._simFlat);
    if (g._simStep) { cur.step = g._simStep; renderQuiz(); }   // 指定题型直驱（chain=q4）
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const qt = sceneEl.querySelector('.q-text');
    const qtR = qt ? qt.getBoundingClientRect() : null;
    const sceneR = sceneEl.getBoundingClientRect();
    const graphic = sceneEl.querySelector('.animal-slot, .chain-row, .sleep-ico, .feat-ico, .cond-chips');
    const gR = graphic ? graphic.getBoundingClientRect() : null;
    const noOverlap = !qtR || !gR || !overlaps(qtR, gR);        // q-text 与题面图形不交叠
    const hitOk = cards.length === 4 && cards.every(b => b.w >= 96 && b.h >= 96);
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, step: g._simStep || 0, kind: sceneEl.dataset.kind,
             cards: cards.length, hitOk: hitOk, sceneOk: sceneOk, noOverlap: noOverlap,
             contrast: cB && cS, ox: ox,
             pass: hitOk && sceneOk && cB && cS && ox <= 0 && noOverlap };
  }
  total++;
  const sims = [];
  for (const cfg of [{ f: 0, s: 0 }, { f: 5, s: 0 }, { f: 10, s: 0 }, { f: 0, s: 4 }]) {
    $id('game')._simFlat = cfg.f;
    $id('game')._simStep = cfg.s;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  g0._simStep = 0;
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑪ clips：hab_ 130 条 + core 3 条全注入 + 时长身份辨别器（±60ms，8000ms 超时；
     SPEC_DUR 21 固定/w/hint + SPEC_DUR2 31 题面/确认整句 + HAB_MS 74 链段键 mp3 互证） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['hab_tut_watch', 'hab_tut_turn', 'hab_hint', 'hab_right',
                'hab_w_forest', 'hab_w_grassland', 'hab_w_ocean', 'hab_w_desert',
                'hab_w_pond', 'hab_w_sky', 'hab_w_farm',
                'hab_hint_feed', 'hab_hint_chain', 'hab_hint_hib', 'hab_hint_struct', 'hab_hint_dual',
                'hab_w_feed', 'hab_w_chain', 'hab_w_hib', 'hab_w_struct', 'hab_w_dual',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  /* T46 阶段2：130 hab_ 键（21 固定/w/hint + 109 段键 an24+ev7+fd6+act24+dq5+s8+st19+cf12+ab4）+ core 3 = 133 */
  const t46Ok = keys.filter(k => /^(hab_an_|hab_ev_|hab_fd_|hab_act_|hab_dq_|hab_s_|hab_st_|hab_cf_|hab_ab_)/.test(k)).length === 109;
  const preOk = keys.length === 133 && t46Ok &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR).concat(Object.keys(SPEC_DUR2)).concat(
    Object.keys(HAB_MS).reduce((a, g) => a.concat(Object.keys(HAB_MS[g]).map(id => 'hab_' + g + '_' + id)), []));
  const durExpect = k => (k in SPEC_DUR) ? SPEC_DUR[k] : ((k in SPEC_DUR2) ? SPEC_DUR2[k] : (() => {
    const i = k.indexOf('_', 4), grp = k.slice(4, i);
    return HAB_MS[grp][k.slice(i + 1)];
  })());
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - durExpect(durKeys[i])) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durN: durKeys.length, durs: durs,
                  durBad: durKeys.filter((k, i) => Math.abs(durs[i] - durExpect(k)) > 60) };

  /* ---- ⑫ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑬ 章末预告 C7 断言（r4 审查 M-2 升级：关键词之外补数值断言+生成关实算对账+禁字面
     负向断言——原关键词版在 (ci+1)%4 违约下全绿（M-1），无判别力） ---- */
  total++;
  /* SPEC §0.60 r4 章末预告文案独立重列（禁引用页面 CHAPTERS/GEN_HINTS 互证） */
  const SPEC_CH = { 2: '谁冬天要睡长觉，马上见分晓',   // ch1 末预告 ch2 冬眠+结构
                    3: '接下来要一次想两件事哦',       // ch2 末预告 ch3 多条件交集
                    4: '各种问题混在一起，大挑战来啦', // ch3 末预告 ch4 混合
                    gen: '新一轮动物大挑战来啦' };     // ch4 末预告生成关
  const SPEC_GEN = ['送小动物回家，再想想谁吃什么',   // dch1 谁吃什么
                    '冬天谁睡觉，谁有什么本领',       // dch2 冬眠+结构
                    '两个条件都要满足哦',             // dch3 多条件交集
                    '什么都可能问，想好再点'];        // dch4 混合
  /* 独立 seeded 链（mulberry32 与引擎严格同构重列，禁引用引擎 mulberry32/ri）：
     dch(f) = 1 + floor(rnd_f() * 4)，rnd_f = mulberry32(f*7919+13) 首值 */
  const specMul = a => () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const specDchOf = f => 1 + Math.floor(specMul(f * 7919 + 13)() * 4);   // 生成关 dch 独立复算
  const hintOk = CHAPTERS[1].hint.indexOf('冬') >= 0 && CHAPTERS[1].hint.indexOf('睡') >= 0 &&   // 预告 ch2 冬眠
                 CHAPTERS[2].hint.indexOf('两') >= 0 && CHAPTERS[2].hint.indexOf('件') >= 0 &&   // 预告 ch3 两条件
                 CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 && // 预告 ch4 混合
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                                          // 预告生成关
                 GEN_HINTS[0].indexOf('吃') >= 0 &&                                              // dch1 谁吃什么
                 GEN_HINTS[1].indexOf('冬') >= 0 &&                                              // dch2 冬眠+本领
                 GEN_HINTS[2].indexOf('两') >= 0 &&                                              // dch3 两条件
                 GEN_HINTS[3].indexOf('想') >= 0;                                                // dch4 混合
  /* 页面表 ↔ SPEC 表逐条一致（防文案漂移——精确等值） */
  const tabOk = [2, 3, 4].every(i => CHAPTERS[i - 1].hint === SPEC_CH[i]) &&
                CHAPTERS[4].hint === SPEC_CH.gen &&
                GEN_HINTS.every((t, i) => t === SPEC_GEN[i]);
  /* 静态章末数值断言：nextHint(章末 flat) === 下一章 SPEC 文案（非关键词含包） */
  const statOk = nextHint(4) === SPEC_CH[2] && nextHint(9) === SPEC_CH[3] &&
                 nextHint(14) === SPEC_CH[4] && nextHint(19) === SPEC_CH.gen;
  /* 生成关实算对账（家族 F）：nextHint(生成关 flat) === GEN[dch(f+1)-1]——dch 独立 seeded 复算 */
  const genCalc = [24, 29, 34, 39].every(f => nextHint(f) === SPEC_GEN[specDchOf(f + 1) - 1]);
  /* 负向断言：nextHint 禁 (ci+1)%4 章序推进（M-1 违约字面，cir verify 同款） */
  const negOk = nextHint.toString().indexOf('(ci + 1) % 4') < 0 &&
                nextHint.toString().indexOf('genLevel(f + 1).dch') >= 0;
  const hintAll = hintOk && tabOk && statOk && genCalc && negOk;
  if (hintAll) npass++;
  units.hints = { ok: hintAll, kw: hintOk, tab: tabOk, stat: statOk, genCalc: genCalc, neg: negOk,
                  chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑭ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑮ 拼句字数上限不变量（r4 审查 m-11：判对窗 5400 ≥ 15 字 SAPI 实测 4899+300 的
     前提=确认句恒 ≤15 字——用产出函数实测全 40 关取最大钉死，未来文案加长即此处红，
     静默掐尾被拦截；quizText 读题异步不占 UI 等待窗，仅记录实测最大值备查不设硬界） ---- */
  total++;
  let confMax = 0, quizMax = 0, lenOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const Lq = genLevel(flat);
    Lq.quizzes.forEach(q => {
      const cl = confirmText(q).length, ql = quizText(q).length;
      if (cl > confMax) confMax = cl;
      if (ql > quizMax) quizMax = ql;
      if (cl > 15) lenOk = false;                  // SPEC §0.60：home ≤15（v1 界）/ 新题型 ≤14
    });
  }
  if (lenOk) npass++;
  units.senLen = { ok: lenOk, confMax: confMax, quizMax: quizMax };

  /* ---- ⑯ T46 阶段2 判对窗 clip 链动态断言（窗=1800+max(3600, 链实长+PAD-1800)；
     home 5 段链最长 8232 超 estMs 窗 5400——calendar/shapecount 先例动态补足 ---- */
  total++;
  let confChainMax = 0, chainWinMax = 0;
  for (let flat = 0; flat < 40; flat++) {
    genLevel(flat).quizzes.forEach(q => {
      const cks = confirmKeys(q);
      const ms = chainMs(cks);                        /* 页面表实算（与 mp3 互证已在 ⑪） */
      const win = 1800 + Math.max(3600, ms + CONFIRM_PAD - 1800);
      if (ms > confChainMax) confChainMax = ms;
      if (win > chainWinMax) chainWinMax = win;
    });
  }
  const confWinOk = chainWinMax >= confChainMax + CONFIRM_PAD && chainWinMax >= 5400;
  if (confWinOk) npass++;
  units.confWin = { ok: confWinOk, chainMaxMs: confChainMax, winMaxMs: chainWinMax, pad: CONFIRM_PAD };

  const out = { game: 'habitat', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录调用 key（__lastVoiceKey）供 ④/④b 反馈绑定断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k) { window.__lastVoiceKey = k || null; };
  KIDS.voice.queue = function (parts) {           /* T46 阶段2：题面/确认段链记录（__lastQueue） */
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0].key : null;
  };
  runVerify();
}
