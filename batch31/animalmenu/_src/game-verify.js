/* ================= ?verify=1 自检（仅 verify 分支加载执行）——v2（r11 难度改造）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch 静态 1+flat//5、生成 1-4）/
     引擎直驱（单答案点真值卡→right / 提交题勾满+提交→末题 done→全关 3 星）/
     r11 modeled 时长下界（Σ题 listen 实测 clip+nOpts×1500+taps×1200 ≥40000——认知步
     主体非演出窗，SPEC §0.76 r11 难度门槛）
   ② SPEC 表独立对账（SPEC_PAIRS8/SPEC_MULTI/SPEC_DIET/SPEC_CHAIN/SPEC_DISTRACT_OK/
     SPEC_NAMES——verify 内从 SPEC-BATCH31 §0.76 r11 文字独立重列，不引用引擎表）
     × 40 关全题：候选长度（pair=4/multi=4/diet=3/chain=2）互异含全部真值 ⊆对应集 /
     need 独立复算（五题型各对表）/ 干扰公平性（multifood ⊆ DISTRACT_OK）/ answer 复算
     （multifood=-1）/ 章型硬约束（dch1 两族/dch2 multi/dch3 diet/dch4 chain）/
     flat0q0=findfood/rabbit（教学锚）/ chaindir pair ∈ CHAIN 17 对表
   ③ 聚合独占票：ch1 每关两族在场 / ch2 动物 10 全覆盖 / ch3 每关 ≥1 肉食+≥1 草食
     （SPEC_DIET 独立复算）/ ch4 每关 ≥2 动物-动物对（SPEC_PREY 4 行独立重列）/
     生成关 dch1-4 全现 / 40 关五题型全现 / modeled 40 关全 ≥40000
   ④ tapOpt 单元（flat0 findfood/rabbit 4 卡）：越界=null；错=wrong+miss+1+1000ms
     防重入（首击 fire-and-forget+窗内紧邻二击 false）+错链三段（anm_hint+anm_n_rabbit
     名音+anm_again_food clip 键段——T46 阶段2 语义句 clip 化）；对=right 推进+确认链
     （anm_right+anm_n_carrot 两段全 clip）；重听链（名音+题面句两 clip 无 keyless）
   ⑤ tapSubmit 单元（flat5 ch2 multifood）：勾错件+提交=wrong_more 清空+miss+1+
     anm_more 单段；勾 1 件+提交=wrong_less 保留+anm_less；取消勾选零惩罚；
     勾满+提交=right+确认链 anm_right+两真值名音三段；goBtn 勾满 .ready 计数驱动
   ⑥ tapDiet 单元（flat10 ch3 dietclass）：三盘候选全出示（set 对账）/ answer=
     SPEC_DIET_PLATE[SPEC_DIET[ask]] 下标 / 错链=anm_hint+名音+anm_again_diet clip
     键段尾（T46 阶段2）/ 确认链名=动物名（盘 id 无名音）/ 对=right
   ⑦ tapChain 单元（flat15 ch4 chaindir）：双卡出示序=听序 / pair ∈ SPEC_CHAIN /
     answer 卡=eater / 错链=两名音回锚+anm_again_chain clip 键段尾（无 clip 头，T46）/ 二错
     miss=2（链豁免窗 7800 真时钟窗后） / 对=right
   ⑧ 帧内容断言（契约 M：渲染即引擎）：图卡 DOM 数==opts.len、每卡 data-anim==
     opts[i].anim 且 1 幅 SVG、multifood 卡带 check 徽章、题面 scene data-ask==出示
     id 串（chaindir=a+b / 其余=ask）、g[data-anim] 逐个对账、chaindir .ask-mini==2+
     .chain-arrow 在场、q-text 按题型、goBtn 提交题型恒现单答案隐藏——flat0/5/10/15
   ⑨ 教学链：tutorialWatch() 真实走完（stub 存档）→ __anDemoR==='right' 且
     tut='help'，watch 折算真实时长 ≤16s
   ⑩ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑪ UI 冒烟：flat0 autoSolve（taps=5 恒 3★）/ flat5（multifood 提交关）autoSolve /
     flat10 先 1 错再 autoSolve（miss=1 → 2★）
   ⑫ 布局：双 viewport（1280×800/800×1180）×（flat0/5/10/15）：候选卡 ≥96×96、
     题面 SVG ≥120（chaindir 双 mini ≥100）、提交题型 goBtn ≥100×70（单答案隐藏）、
     描边对比度 ≥3:1、overflowX ≤0、卡 rect 落 #game 容器、body.port 类通道竖屏
     样式生效实锤（portStyle 竖屏卡 ≤132）——REPORT-REVIEW-r10 M-1 口径
   ⑬ clips：anm_ 43 条（v1+r11 39+T46 语义句 4）+ core 3 条全注入 + duration
     辨别器（SPEC §4 v1+r11+T46 实长表 ±60ms，Promise.all+Audio——bubble ⑦ 先例）
   ⑭ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑮ 契约 A/B/E/F/I/J/K/estMs 源码断言（读 script[2] 纯源码块 data+engine+main——r11 审查 m-1：
     A=两处 nextHint(lim-1) r11 升级；estMs 定版字面 n*345+600）
   ⑯ 章末预告 C7 独立硬编码对账（hint[i]↔CHAPTERS[i+1]）+ 生成关 nextHint 实算对账
     （禁 (ci+1)%4——off-by-one 哨兵）
   ⑰ estMs 语音窗动态断言：判对窗单名 4400 ≥ 2256+150+1632+300=4338 / multifood
     6400 ≥ 2256+150+3048+300=5754；错链四式 ≤7800（T46 clip 化实长：findfood 6744/
     findwho 6600/dietclass 6480/chaindir 6504）；教学链四窗；提交反馈锁 500/600（视觉锁）
   ⑱ wall-clock：三关节奏驱动实测 ×(1/SPEED) 折算 ≥Σ判对窗×0.95（演出窗完整在场；
     认知时长门槛在 ① modeled——机器人即时点击测不到浏览/思考时间）
   ⑲ SPEED=0.12 提速断言
   结果写 #verify-result + window.__anVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH31 §0.76 r11/§4 文字独立重列（禁抄页面 PAIRS8/MULTI/DIET 等表） */
  const SPEC_PAIRS8 = { rabbit: 'carrot', panda: 'bamboo', monkey: 'banana', cat: 'fish',
                        dog: 'bone', mouse: 'cheese', bear: 'honey', squirrel: 'pinecone' };
  const SPEC_ANIMALS8 = ['rabbit', 'panda', 'monkey', 'cat', 'dog', 'mouse', 'bear', 'squirrel'];
  const SPEC_FOODS8 = ['carrot', 'bamboo', 'banana', 'fish', 'bone', 'cheese', 'honey', 'pinecone'];
  const SPEC_INV8 = {};                                  // 食物 → 动物（findwho 真值逆表）
  for (const a in SPEC_PAIRS8) SPEC_INV8[SPEC_PAIRS8[a]] = a;
  const SPEC_WOLF = ['wolf', 'sheep'];                   // r11 新动物 2
  const SPEC_NEWFOODS = ['apple', 'greens', 'berry', 'meat', 'grass', 'corn', 'acorn'];   // r11 新食物 7
  const SPEC_ANIMALS10 = SPEC_ANIMALS8.concat(SPEC_WOLF);
  const SPEC_FOODS15 = SPEC_FOODS8.concat(SPEC_NEWFOODS);
  const SPEC_DIET = { cat: 'meat', wolf: 'meat',
                      rabbit: 'grass', panda: 'grass', sheep: 'grass',
                      monkey: 'mix', dog: 'mix', mouse: 'mix', bear: 'mix', squirrel: 'mix' };
  const SPEC_DIET_PLATE = { meat: 'plmeat', grass: 'plgrass', mix: 'plmix' };
  const SPEC_PLATES = ['plmeat', 'plgrass', 'plmix'];
  const SPEC_MULTI = {                                   // ch2 多食表（每动物恰 2 食）
    rabbit: ['carrot', 'greens'],  panda: ['bamboo', 'apple'],
    monkey: ['banana', 'apple'],   cat: ['fish', 'meat'],
    dog: ['bone', 'meat'],         mouse: ['cheese', 'corn'],
    bear: ['honey', 'berry'],      squirrel: ['pinecone', 'acorn'],
    wolf: ['meat', 'bone'],        sheep: ['grass', 'greens'] };
  const SPEC_DISTRACT_OK = {                             // multifood 干扰白名单（半有效排除）
    rabbit: ['fish', 'bone', 'cheese', 'meat'],
    panda: ['fish', 'bone', 'cheese', 'meat'],
    sheep: ['fish', 'bone', 'cheese', 'meat'],
    cat: ['carrot', 'bamboo', 'banana', 'pinecone'],
    wolf: ['carrot', 'banana', 'apple', 'corn'],
    monkey: ['cheese', 'bone', 'fish'],
    dog: ['bamboo', 'cheese', 'pinecone'],
    mouse: ['bone', 'bamboo', 'honey'],
    bear: ['cheese', 'bamboo', 'carrot'],
    squirrel: ['fish', 'cheese', 'meat'] };
  const SPEC_CHAIN = [                                   // ch4 食物链 17 对（eater→eaten）
    ['wolf', 'sheep'], ['cat', 'mouse'], ['cat', 'fish'], ['bear', 'fish'],
    ['bear', 'honey'], ['sheep', 'grass'], ['panda', 'bamboo'], ['rabbit', 'carrot'],
    ['monkey', 'banana'], ['mouse', 'cheese'], ['dog', 'bone'], ['squirrel', 'pinecone'],
    ['squirrel', 'acorn'], ['monkey', 'apple'], ['mouse', 'corn'], ['wolf', 'meat'],
    ['rabbit', 'greens'] ].map(p => ({ eater: p[0], eaten: p[1] }));
  const SPEC_PREY = SPEC_CHAIN.filter(p =>               // 动物-动物子集（鱼计猎物）
    SPEC_ANIMALS10.indexOf(p.eaten) >= 0 || p.eaten === 'fish');
  const SPEC_NAMES = { rabbit: '兔子', carrot: '胡萝卜', panda: '熊猫', bamboo: '竹子',
                       monkey: '猴子', banana: '香蕉', cat: '小猫', fish: '小鱼',
                       dog: '小狗', bone: '骨头', mouse: '老鼠', cheese: '奶酪',
                       bear: '小熊', honey: '蜂蜜', squirrel: '松鼠', pinecone: '松果',
                       wolf: '大灰狼', sheep: '小绵羊', apple: '苹果', greens: '青菜',
                       berry: '小浆果', meat: '肉肉', grass: '青草', corn: '玉米',
                       acorn: '橡果', plmeat: '肉肉盘', plgrass: '青草盘', plmix: '都吃盘' };
  const SPEC_FOOD_AGAIN = '再看看它爱吃什么';             // findfood 错链尾（8 字）
  const SPEC_WHO_AGAIN = '再想想谁爱吃这个';             // findwho 错链尾（8 字）
  const SPEC_DIET_AGAIN = '再想想它吃什么';              // dietclass 错链尾（7 字——不泄答案）
  const SPEC_CHAIN_AGAIN = '再想一想，谁吃谁';           // chaindir 错链尾（8 字含逗号）
  const SPEC_DUR = {                                     // SPEC §4 v1+r11 实长（_clipdur31 实测）+ T46 四键
    anm_tut_watch: 3096, anm_tut_turn: 1824, anm_hint: 2016, anm_right: 2256,
    anm_wrong: 1656, anm_q1: 1968, anm_q2: 1944,
    anm_q_multi: 2160, anm_q_diet: 2184, anm_q_chain: 1776, anm_less: 2832,
    anm_more: 3072, anm_h_diet: 2736, anm_h_chain: 2544,                 // r11 句 7
    anm_again_food: 2664, anm_again_who: 2496, anm_again_diet: 2232, anm_again_chain: 2688,   // T46 阶段2 语义句
    anm_n_rabbit: 1368, anm_n_panda: 1392, anm_n_monkey: 1368, anm_n_cat: 1368,
    anm_n_dog: 1416, anm_n_mouse: 1416, anm_n_bear: 1440, anm_n_squirrel: 1464,
    anm_n_carrot: 1560, anm_n_bamboo: 1368, anm_n_banana: 1416, anm_n_fish: 1416,
    anm_n_bone: 1344, anm_n_cheese: 1344, anm_n_honey: 1368, anm_n_pinecone: 1440,
    anm_n_wolf: 1584, anm_n_sheep: 1632, anm_n_apple: 1440, anm_n_greens: 1392,
    anm_n_berry: 1680, anm_n_meat: 1392, anm_n_grass: 1416, anm_n_corn: 1344,
    anm_n_acorn: 1464 };                                                 // r11 名音 9（合计 39）
  const SPEC_CHAPTER_HINTS = { 1: '爱吃的可能不止一样哦', 2: '有的吃肉，有的吃草',
                               3: '谁吃谁，想一想', 4: '新一轮帮小动物点餐' };
  const SPEC_GEN_HINTS = ['正着问反着问都要会', '爱吃的都要点上哦',
                          '想想它吃肉还是吃草', '谁吃谁，想一想'];
  /* r11 modeled 时长常量（SPEC §0.76 r11：认知步主体非演出窗）：
     listen=开题链 clip 实测+150 间隔 / 每候选浏览 1500 / 每次点击 1200（multifood 3 击） */
  const M_OPT = 1500, M_TAP = 1200, M_LEVEL_MIN = 40000;
  const estMs = n => n * 345 + 600;                      // b25 定版：SAPI ~345ms/字 + 600 落地余量
  const unlocked = async () => {                         // 等错防重入/演出窗结束（verify 提速后 ≤1s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* Mj-1 语义句 clip 化（T46 阶段2）：四题型错链尾段均为 anm_again_* 键段
     （{key,text}，text=TTS 兜底），全款拼播链无 keyless 段——链尾断言改键段直断 */
  /* 单题最优驱动（提交题=勾满+提交；单答案=点真值卡）——返回 'right'/'done'/null */
  const driveQ = async q => {
    if (isSubmitKind(q.kind)) {
      for (const g of q.need) {
        const i = q.opts.findIndex(o => o.anim === g);
        if (i >= 0 && q.picked.indexOf(i) < 0) {
          const r = await window.AN.tapOpt(i);
          if (r !== 'pick') return null;
        }
      }
      return await window.AN.tapSubmit();
    }
    return await window.AN.tapOpt(q.answer);
  };
  /* 单题 modeled 下界（认知步主体：听题+浏览候选+点击；不含演出窗 1600+2800/4800） */
  const listenMs = q => {
    const D = SPEC_DUR;
    if (q.kind === 'findfood') return D['anm_n_' + q.ask] + 150 + D.anm_q1;
    if (q.kind === 'findwho') return D['anm_n_' + q.ask] + 150 + D.anm_q2;
    if (q.kind === 'multifood') return D['anm_n_' + q.ask] + 150 + D.anm_q_multi;
    if (q.kind === 'dietclass') return D['anm_n_' + q.ask] + 150 + D.anm_q_diet;
    return D['anm_n_' + q.opts[0].anim] + 150 + D['anm_n_' + q.opts[1].anim] + 150 + D.anm_q_chain;
  };
  const modeledOf = L => L.quizzes.reduce((s, q) => {
    const nOpts = q.kind === 'dietclass' ? 3 : q.kind === 'chaindir' ? 2 : 4;
    const taps = isSubmitKind(q.kind) ? 3 : 1;           // multifood=2 勾+1 提交
    return s + listenMs(q) + nOpts * M_OPT + taps * M_TAP;
  }, 0);

  /* ---- ①② 40 关全量审计 + SPEC 表独立对账 + modeled 时长下界 ---- */
  const genDch = {}, kindAll = new Set(), durBad = [], kindBad2 = [], dietBad = [], preyBad = [];
  const ch2Animals = new Set();
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
    /* r11 modeled 时长下界（认知步主体非演出窗） */
    const modeled = modeledOf(L1);
    if (modeled < M_LEVEL_MIN) durBad.push(flat + ':' + modeled);

    /* SPEC 表独立对账（每题：域/长度/真值/干扰公平/answer 复算/章型） */
    let specOk = true;
    const kindsSeen = new Set();
    let meatN = 0, grassN = 0, preyN = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      const kind = q.kind, vals = q.opts.map(o => o.anim);
      kindsSeen.add(kind); kindAll.add(kind);
      /* 章型硬约束（SPEC §0.76 r11 章表） */
      if (L1.dch === 1 && kind !== 'findfood' && kind !== 'findwho') { badCase = 'dch1 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 2 && kind !== 'multifood') { badCase = 'dch2 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 3 && kind !== 'dietclass') { badCase = 'dch3 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 4 && kind !== 'chaindir') { badCase = 'dch4 ' + flat + '/' + k; specOk = false; break; }
      /* flat0 q0 教学锚：findfood/rabbit */
      if (flat === 0 && k === 0 && (kind !== 'findfood' || q.ask !== 'rabbit')) {
        badCase = 'anchor ' + flat; specOk = false; break;
      }
      /* 候选长度：pair=4 / multi=4 / diet=3 / chain=2；互异 */
      const wantLen = kind === 'dietclass' ? 3 : kind === 'chaindir' ? 2 : 4;
      if (vals.length !== wantLen) { badCase = 'optLen ' + flat + '/' + k; specOk = false; break; }
      if (new Set(vals).size !== vals.length) { badCase = 'optDup ' + flat + '/' + k; specOk = false; break; }
      /* 出示域 + need 真值独立换算（按题型对表） + 候选 ⊆ 对应集 */
      let expNeed = null, pool = null;
      if (kind === 'findfood') {
        if (SPEC_ANIMALS8.indexOf(q.ask) < 0) { badCase = 'askA8 ' + flat + '/' + k; specOk = false; break; }
        expNeed = [SPEC_PAIRS8[q.ask]]; pool = SPEC_FOODS8;
      } else if (kind === 'findwho') {
        if (SPEC_FOODS8.indexOf(q.ask) < 0) { badCase = 'askF8 ' + flat + '/' + k; specOk = false; break; }
        expNeed = [SPEC_INV8[q.ask]]; pool = SPEC_ANIMALS8;
      } else if (kind === 'multifood') {
        if (SPEC_ANIMALS10.indexOf(q.ask) < 0) { badCase = 'askA10 ' + flat + '/' + k; specOk = false; break; }
        expNeed = SPEC_MULTI[q.ask].slice(); pool = SPEC_FOODS15;
      } else if (kind === 'dietclass') {
        if (SPEC_ANIMALS10.indexOf(q.ask) < 0) { badCase = 'askA10 ' + flat + '/' + k; specOk = false; break; }
        expNeed = [SPEC_DIET_PLATE[SPEC_DIET[q.ask]]]; pool = SPEC_PLATES;
        if (SPEC_DIET[q.ask] === 'meat') meatN++;
        if (SPEC_DIET[q.ask] === 'grass') grassN++;
        if (vals.slice().sort().join() !== SPEC_PLATES.slice().sort().join()) { badCase = 'plateSet ' + flat + '/' + k; specOk = false; break; }
      } else {
        if (!q.pair || q.pair.length !== 2) { badCase = 'pair ' + flat + '/' + k; specOk = false; break; }
        const hit = SPEC_CHAIN.filter(p => p.eater === q.pair[0] && p.eaten === q.pair[1]);
        if (!hit.length) { badCase = 'chainTab ' + flat + '/' + k; specOk = false; break; }   // 对 ∈ 17 对表
        expNeed = [q.pair[0]]; pool = [q.pair[0], q.pair[1]];
        if (SPEC_PREY.some(p => p.eater === q.pair[0] && p.eaten === q.pair[1])) preyN++;
      }
      for (const v of vals) if (pool.indexOf(v) < 0) { badCase = 'optPool ' + flat + '/' + k; specOk = false; break; }
      if (!specOk) break;
      if (!expNeed || q.need.length !== expNeed.length ||
          !expNeed.every(x => q.need.indexOf(x) >= 0)) { badCase = 'need ' + flat + '/' + k; specOk = false; break; }
      if (!expNeed.every(x => vals.indexOf(x) >= 0)) { badCase = 'optTruth ' + flat + '/' + k; specOk = false; break; }
      const inters = vals.filter(v => expNeed.indexOf(v) < 0);       // 干扰=去真值
      if (inters.length !== vals.length - expNeed.length) { badCase = 'distract ' + flat + '/' + k; specOk = false; break; }
      /* 干扰公平性（r11）：multifood 干扰 ⊆ SPEC_DISTRACT_OK（半有效排除） */
      if (kind === 'multifood') {
        for (const v of inters) if (SPEC_DISTRACT_OK[q.ask].indexOf(v) < 0) {
          badCase = 'fairBan ' + flat + '/' + k; specOk = false; break;
        }
        if (!specOk) break;
      }
      /* answer 独立复算：单答案=真值卡下标；multifood=-1 */
      if (isSubmitKind(kind)) { if (q.answer !== -1) { badCase = 'ansSubmit ' + flat + '/' + k; specOk = false; break; } }
      else {
        let expAns = -1;
        for (let j = 0; j < vals.length; j++) if (vals[j] === expNeed[0]) expAns = j;
        if (expAns < 0 || q.answer !== expAns) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
      }
      if (flat < 20 && L1.dch === 2) ch2Animals.add(q.ask);         // ch2 动物覆盖素材
    }
    if (!specOk) tableOk = false;
    /* 聚合：ch1 每关两族在场 / ch3 每关 ≥1 肉食+≥1 草食 / ch4 每关 ≥2 动物-动物对 */
    if (L1.dch === 1 && kindsSeen.size !== 2) kindBad2.push(flat);
    if (L1.dch === 3 && (meatN < 1 || grassN < 1)) dietBad.push(flat);
    if (L1.dch === 4 && preyN < 2) preyBad.push(flat);
    if (flat >= 20) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk && modeled >= M_LEVEL_MIN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  modeled: modeled, kinds: L1.quizzes.map(q => q.kind) };
    if (flat < 20) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ③ 聚合独占票：两族/覆盖/两类在场/生成关四型全现/五题型全现/时长 modeled ---- */
  total++;
  const aggOk = tableOk && durBad.length === 0 && kindBad2.length === 0 &&
    dietBad.length === 0 && preyBad.length === 0 &&
    ch2Animals.size === 10 && kindAll.size === 5 &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, durBad: durBad, kindBad2: kindBad2,
                  dietBad: dietBad, preyBad: preyBad, ch2Animals: ch2Animals.size,
                  kinds: kindAll.size, genDch: genDch };

  /* ---- ④ tapOpt 单元（flat0 findfood/rabbit 4 候选）---- */
  total++;
  startLevel(0);
  const q4 = window.AN.quiz;
  const initOk = q4 && q4.kind === 'findfood' && q4.ask === 'rabbit' &&
                 q4.opts.length === 4 &&
                 q4.opts.every(o => SPEC_FOODS8.indexOf(o.anim) >= 0) &&
                 q4.opts[q4.answer].anim === 'carrot' &&
                 q4.need.length === 1 && q4.picked.length === 0 &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await window.AN.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex((o, i) => i !== q4.answer);        // 错卡
  const pW = window.AN.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await window.AN.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue.length === 3 &&
                window.__lastQueue[0] === 'anm_hint' &&            // 错链=anm_hint+兔子名音+语义句 clip 键段（T46 阶段2）
                window.__lastQueue[1] === 'anm_n_rabbit' &&
                window.__lastQueue[2] && window.__lastQueue[2].key === 'anm_again_food' &&
                window.__lastQueue[2].text === SPEC_FOOD_AGAIN;
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             window.AN.quiz.miss === 1 && window.AN.currentLevel.miss === 1;
  const rR = await window.AN.tapOpt(q4.answer);
  const chainR = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'anm_right' &&          // 确认链=anm_right+点中食物名音（全 clip 无 keyless）
                 window.__lastQueue[1] === 'anm_n_carrot';
  replayQuiz(false);                              // 重听路径：名音+题面句（两 clip 无 keyless）
  const chainQ = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'anm_n_' + window.AN.quiz.ask &&
                 window.__lastQueue[1] === 'anm_q1';
  const s2 = rR === 'right' && chainR && chainQ && window.AN.quiz.step === 1 && window.AN.quiz.miss === 0;
  /* findwho 错链（T46 阶段2 anm_again_who 键段）——flat0 ch1 两族混出（kindsSeen.size==2
     保证 5 题内必有 findwho），④ 已推进 1 题，逐题做对直到 findwho 题型在场再点错 */
  let chainW = false, whoAsk = null;
  for (let k = 1; k < 5 && !whoAsk; k++) {
    const qk = window.AN.quiz;
    if (!qk) break;
    if (qk.kind === 'findwho') { whoAsk = qk.ask; break; }
    await unlocked();
    const rr = await window.AN.tapOpt(qk.answer);   // 做对推进（right/done）
    if (rr !== 'right' && rr !== 'done') break;
  }
  if (whoAsk) {
    while (Date.now() < wrongChainUntil) await wait(100);    // 让净首错豁免窗（真时钟 7800，q0 错所设——窗内错点吞）
    const qw = window.AN.quiz;
    const wIdx2 = qw.opts.findIndex((o, i) => i !== qw.answer);
    const rW2 = await window.AN.tapOpt(wIdx2);              // → wrong：错链=anm_q2+食物名音+anm_again_who
    chainW = rW2 === 'wrong' && window.__lastQueue && window.__lastQueue.length === 3 &&
             window.__lastQueue[0] === 'anm_q2' &&
             window.__lastQueue[1] === 'anm_n_' + whoAsk &&
             window.__lastQueue[2] && window.__lastQueue[2].key === 'anm_again_who' &&
             window.__lastQueue[2].text === SPEC_WHO_AGAIN;
  }
  const tapOk = initOk && badTap && s1 && s2 && chainW;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1,
                chain: chainA, right: s2, chainR: chainR, chainReplay: chainQ, chainWho: chainW };

  /* ---- ⑤ tapSubmit 单元（flat5 ch2 multifood：提交状态机全路径） ---- */
  total++;
  startLevel(5);
  await unlocked();
  const q5 = window.AN.quiz;
  const subShape = q5 && q5.kind === 'multifood' && q5.opts.length === 4 && q5.need.length === 2 &&
                   q5.answer === -1 && q5.picked.length === 0 && q5.pair === null &&
                   SPEC_ANIMALS10.indexOf(q5.ask) >= 0 &&
                   SPEC_MULTI[q5.ask].every(n => q5.need.indexOf(n) >= 0);
  const wI = q5.opts.findIndex(o => q5.need.indexOf(o.anim) < 0);      // 错件下标
  const nI = q5.opts.map((o, i) => q5.need.indexOf(o.anim) >= 0 ? i : -1).filter(i => i >= 0);
  const goShow = goBtn.classList.contains('show');                     // 提交题型恒现
  const pW5 = await window.AN.tapOpt(wI);                              // 勾错件（判定在提交）
  const readyHalf = goBtn.classList.contains('ready');                 // 勾 1/2：未满不呼吸
  const cardHeld = cardEl(wI) && cardEl(wI).classList.contains('held');
  const checkBadge = cardEl(wI) && !!cardEl(wI).querySelector('.check');
  const sW5 = await window.AN.tapSubmit();                             // 含错件=wrong_more 清空+miss
  const moreVoice = window.__lastVoiceKey === 'anm_more';              // 单段 clip 反馈
  const m5 = window.AN.quiz;
  const moreOk = sW5 === 'wrong_more' && m5.picked.length === 0 && m5.miss === 1 &&
                 !cardEl(wI).classList.contains('held') && moreVoice;
  const p1 = await window.AN.tapOpt(nI[0]);                            // 勾 1 件
  const sL5 = await window.AN.tapSubmit();                             // 少选=wrong_less 保留
  /* anm_less 语音 flat≥3 走家族 J 10s 节流（anm_more 刚播过→本次静默属设计，
     不断言——iftrain v2 先例同口径；状态机本身全断言） */
  const lessOk = p1 === 'pick' && sL5 === 'wrong_less' &&
                 window.AN.quiz.picked.length === 1 && window.AN.quiz.miss === 1;
  const pU = await window.AN.tapOpt(nI[0]);                            // 取消勾选零惩罚
  const unpickOk = pU === 'unpick' && window.AN.quiz.picked.length === 0 &&
                   window.AN.quiz.miss === 1;
  const pA = await window.AN.tapOpt(nI[0]);
  const pB = await window.AN.tapOpt(nI[1]);
  const readyFull = goBtn.classList.contains('ready');                 // 勾满 2/2=.ready（计数驱动）
  const sR5 = await window.AN.tapSubmit();                             // 勾对全集=right
  const chainM = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'anm_right' &&              // 两件确认链（全 clip 无 keyless）
                 window.__lastQueue.slice(1).every(k => q5.need.some(n => 'anm_n_' + n === k));
  const subOk = subShape && goShow && checkBadge && pW5 === 'pick' && !readyHalf && cardHeld &&
                moreOk && lessOk && unpickOk && pA === 'pick' && pB === 'pick' &&
                readyFull && (sR5 === 'right' || sR5 === 'done') && chainM;
  if (subOk) npass++;
  units.tapSubmit = { ok: subOk, shape: subShape, badge: checkBadge, more: moreOk,
                      less: lessOk, unpick: unpickOk, ready: readyFull, right: sR5, chain: chainM };

  /* ---- ⑥ tapDiet 单元（flat10 ch3 dietclass：三盘域+错链+确认链名=动物名） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const qc = window.AN.quiz;
  const cfShape = qc && qc.kind === 'dietclass' &&
                   SPEC_ANIMALS10.indexOf(qc.ask) >= 0 &&
                   qc.opts.length === 3 &&
                   qc.opts.map(o => o.anim).slice().sort().join() === SPEC_PLATES.slice().sort().join() &&
                   qc.need.length === 1 &&
                   qc.need[0] === SPEC_DIET_PLATE[SPEC_DIET[qc.ask]] &&
                   qc.opts[qc.answer].anim === SPEC_DIET_PLATE[SPEC_DIET[qc.ask]];
  const wC = qc.opts.findIndex((o, i) => i !== qc.answer);
  const rC = await window.AN.tapOpt(wC);
  const chainC = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'anm_hint' &&               // 错链=anm_hint+动物名音+语义句 clip 键段（T46 阶段2）
                 window.__lastQueue[1] === 'anm_n_' + qc.ask &&
                 window.__lastQueue[2] && window.__lastQueue[2].key === 'anm_again_diet' &&
                 window.__lastQueue[2].text === SPEC_DIET_AGAIN;
  const missC = window.AN.quiz.miss === 1;                  // 取值须在推进前（right 后 quiz 换题 miss 归零）
  const rE5 = await window.AN.tapOpt(qc.answer);
  const chainCR = window.__lastQueue && window.__lastQueue.length === 2 &&
                  window.__lastQueue[0] === 'anm_right' &&             // 确认链名=动物名（盘 id 无名音）
                  window.__lastQueue[1] === 'anm_n_' + qc.ask;
  const cfOk = cfShape && rC === 'wrong' && chainC && missC && rE5 === 'right' && chainCR;
  if (cfOk) npass++;
  units.tapDiet = { ok: cfOk, shape: cfShape, chain: chainC, miss1: missC, right: rE5, chainR: chainCR };

  /* ---- ⑦ tapChain 单元（flat15 ch4 chaindir：方向判定+双名错链+二错 miss=2） ---- */
  total++;
  startLevel(15);
  await unlocked();
  const qrb = window.AN.quiz;
  const rbShape = qrb && qrb.kind === 'chaindir' &&
                  SPEC_CHAIN.some(p => p.eater === qrb.pair[0] && p.eaten === qrb.pair[1]) &&
                  qrb.opts.length === 2 &&
                  qrb.need.length === 1 && qrb.need[0] === qrb.pair[0] &&
                  qrb.opts[qrb.answer].anim === qrb.pair[0];           // 点「吃的一方」
  const wD = qrb.opts.findIndex((o, i) => i !== qrb.answer);
  const rD = await window.AN.tapOpt(wD);
  const chainB = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0] === 'anm_n_' + qrb.opts[0].anim &&   // 双名回锚（出示序=听序，无 clip 头）
                 window.__lastQueue[1] === 'anm_n_' + qrb.opts[1].anim &&
                 window.__lastQueue[2] && window.__lastQueue[2].key === 'anm_again_chain' &&   // T46 阶段2 clip 键段尾
                 window.__lastQueue[2].text === SPEC_CHAIN_AGAIN;
  const miss1 = window.AN.quiz.miss === 1;
  await new Promise(w => setTimeout(w, 7900));                   // 等出错链豁免窗（真时钟 7800）——窗内二错被吞，窗后二错照计 miss=2
  const wE = qrb.opts.findIndex((o, i) => i !== qrb.answer && i !== wD);   // 另一错卡（2 候选只有 1 错卡——重指同卡窗后）
  const rE = await window.AN.tapOpt(wE >= 0 ? wE : wD);
  const miss2 = rE === 'wrong' && window.AN.quiz.miss === 2;       // 第二次错=miss 2（卡不灰可重选）
  const rF = await window.AN.tapOpt(qrb.answer);
  const rbOk = rbShape && rD === 'wrong' && chainB && miss1 && miss2 && rF === 'right';
  if (rbOk) npass++;
  units.tapChain = { ok: rbOk, shape: rbShape, chain: chainB, miss1: miss1, miss2: miss2, right: rF };

  /* ---- ⑧ 帧内容断言（契约 M：渲染即引擎——图卡 DOM 数==opts.len+大图出示对账） ---- */
  total++;
  const frameCheck = q => {
    const cards = Array.from(boardEl.querySelectorAll('.card'));
    const multi = isSubmitKind(q.kind);
    const domOk = cards.length === q.opts.length &&
      cards.every((c, i) => c.dataset.anim === q.opts[i].anim &&
                            c.querySelectorAll(':scope > svg').length === 1 &&
                            c.getAttribute('aria-label') === SPEC_NAMES[q.opts[i].anim] + '卡' &&
                            (multi ? !!c.querySelector('.check') : !c.querySelector('.check')));
    const shown = q.kind === 'chaindir' ? q.opts.map(o => o.anim) : [q.ask];
    const gs = Array.from(sceneEl.querySelectorAll('.ask-slot svg > g[data-anim]'));
    const sceneOk = sceneEl.dataset.ask === shown.join('+') &&
                    gs.length === shown.length &&
                    gs.every((g, i) => g.dataset.anim === shown[i]);
    const txt = sceneEl.querySelector('.q-text').textContent;
    const txtOk = q.kind === 'findfood' ? txt.indexOf('爱吃什么') >= 0
                : q.kind === 'findwho' ? txt.indexOf('谁爱吃') >= 0
                : q.kind === 'multifood' ? txt.indexOf('都要') >= 0
                : q.kind === 'dietclass' ? txt.indexOf('哪一盘') >= 0
                : txt.indexOf('谁吃谁') >= 0;
    const chainDom = q.kind !== 'chaindir' ||
                     (sceneEl.querySelectorAll('.ask-mini').length === 2 &&
                      !!sceneEl.querySelector('.chain-arrow'));     // 双卡并排+问号分隔
    const goOk = multi ? goBtn.classList.contains('show')
                       : !goBtn.classList.contains('show');   // 单答案题型隐藏
    return domOk && sceneOk && txtOk && chainDom && goOk;
  };
  startLevel(0);                                        // dch1 findfood：单图 4 卡
  const fA = frameCheck(window.AN.quiz) && boardEl.querySelectorAll('.card').length === 4;
  startLevel(5);                                        // dch2 multifood：勾选卡+提交钮
  const fB = frameCheck(window.AN.quiz);
  startLevel(10);                                       // dch3 dietclass：三盘卡
  const fC = frameCheck(window.AN.quiz) && boardEl.querySelectorAll('.card').length === 3;
  startLevel(15);                                       // dch4 chaindir：双卡并排
  const fD = frameCheck(window.AN.quiz) && boardEl.querySelectorAll('.card').length === 2;
  const frameOk = fA && fB && fC && fD;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, findfood: fA, multifood: fB, dietclass: fC, chaindir: fD };

  /* ---- ⑨ 教学链：tutorialWatch 真实走完 → __anDemoR='right'（演示点胡萝卜图卡） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__anDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'findfood' &&
                cur.quizzes[0].ask === 'rabbit' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__anDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑩ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await window.AN.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await window.AN.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && window.AN.quiz.step === 0 && window.AN.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑪ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await window.AN.autoSolve();
  const lv0 = window.AN.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑪ UI 冒烟 B：flat5（dch2 multifood 提交关）autoSolve 通关 ---- */
  total++;
  startLevel(5);
  const a5 = await window.AN.autoSolve();
  const smokeB = a5.done && a5.taps === 5 && window.AN.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat5 = { ok: smokeB, taps: a5.taps };

  /* ---- ⑪ UI 冒烟 C：flat10（dch3 dietclass）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const q10 = window.AN.quiz;
  const wrongC = q10.opts.findIndex((o, i) => i !== q10.answer);
  const r10 = await window.AN.tapOpt(wrongC);
  const r10ok = r10 === 'wrong';                            // 单答案=wrong（miss+1）
  const a10 = await window.AN.autoSolve();
  const lv10 = window.AN.currentLevel;
  const smokeC = r10ok && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat10 = { ok: smokeC, r10: r10, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑫ 布局：双 viewport ×（flat0 / flat5 / flat10 / flat15）+ body.port 类通道 ---- */
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
    /* M-1：竖屏模拟须注入 .port 类吃到竖屏 CSS（媒体查询跟视口不跟元素） */
    document.body.classList.toggle('port', h > w);
    startLevel(g._simFlat);
    const q = window.AN.quiz;
    const need = q ? q.opts.length : 4;                    // diet=3 / chain=2 / 其余=4
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const svg = sceneEl.querySelector('.ask-slot svg');
    const svgh = svg ? Math.round(svg.getBoundingClientRect().height) : 0;   // SVGElement 无 offsetHeight
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    /* M-1：rect 落容器断言（overflow:hidden 吞 scrollWidth 溢出，几何才是可见性真值）+
       竖屏样式生效实锤（窄卡 132<横屏卡宽，portStyle 与 @media 逐条等值） */
    const gr = g.getBoundingClientRect();
    const rectOk = Array.prototype.every.call(boardEl.querySelectorAll('.card'), b => {
      const r = b.getBoundingClientRect();
      return r.left >= gr.left - 0.5 && r.right <= gr.right + 0.5 &&
             r.top >= gr.top - 0.5 && r.bottom <= gr.bottom + 0.5;
    });
    const portStyleOk = !(h > w) || (cards.length > 0 && Math.max.apply(null, cards.map(b => b.w)) <= 132);
    const hitOk = cards.length === need && cards.every(b => b.w >= 96 && b.h >= 96);   // 候选卡=主答案按钮
    const svgMin = q && q.kind === 'chaindir' ? 100 : 120;  // chaindir 双 mini 100-118 / 单大图 124-150
    const sceneOk = svgh >= svgMin && sc.w >= 64 && sc.h >= 64;
    const goVis = q && isSubmitKind(q.kind) ? (goBtn.offsetWidth >= 100 && goBtn.offsetHeight >= 70)
                                            : goBtn.offsetWidth === 0;      // 单答案题型不占位
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');       // 清理，不泄漏到下一单元
    return { vp: w + 'x' + h, flat: g._simFlat, cards: cards.length, svgH: svgh, goVis: goVis,
             hitOk: hitOk, sceneOk: sceneOk, contrast: cB && cS, rect: rectOk,
             portStyle: portStyleOk, ox: ox,
             pass: hitOk && sceneOk && goVis && cB && cS && rectOk && portStyleOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10, 15]) {
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

  /* ---- ⑬ clips：anm_ 43 条 + core 3 条全注入 + duration 辨别器（SPEC §4 v1+r11+T46 实长 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const anmKeys = Object.keys(SPEC_DUR);
  const needAll = anmKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 46 &&
    needAll.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = anmKeys;
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durBad13 = durKeys.filter((k, i) => Math.abs(durs[i] - SPEC_DUR[k]) > 60);
  const clipsOk = preOk && durBad13.length === 0;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durBad: durBad13 };

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

  /* ---- ⑮ 契约 A/B/E/F/I/J/K/estMs 源码断言（script[2]=纯 data+engine+main——verify 独立第 4 块，无自匹配恒真，审查 m-1） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const limNeedle = 'nextHint(lim' + ' - 1)';                 // 拼接防 verify 源码自匹配（家族坑：命令行自匹配）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim' + ' - 1) })') >= 0 &&
               src.split(limNeedle).length === 3;   // A：两处 dayEnd 均实算 lim-1（r11 升级，恰 2 处）
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.animalmenu && sv.animalmenu.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 7800') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcT = src.indexOf('const estMs = n => n * 345 + 600;') >= 0;     // estMs 定版字面（r11 统一）
  const srcOk = srcA && srcB && srcE && srcF && srcI && srcJ && srcK && srcT;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK, estMs: srcT };

  /* ---- ⑯ 章末预告 C7 独立硬编码对账 + 生成关 nextHint 实算对账（off-by-one 哨兵） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                 CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                 CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                 CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                 GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                 GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                 nextHint(4) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完）预告 ch2 文案（非 ch1 文案）
                 nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                 nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                 nextHint(19) === SPEC_CHAPTER_HINTS[4];
  const offByOne = nextHint(4) !== SPEC_CHAPTER_HINTS[4] &&      // off-by-one 哨兵：预告≠本章文案
                   nextHint(19) !== SPEC_CHAPTER_HINTS[3];
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  if (hintOk && genOk && offByOne) npass++;
  units.hints = { ok: hintOk && genOk && offByOne, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint),
                  gen: GEN_HINTS, offByOne: offByOne };

  /* ---- ⑰ estMs 语音窗动态断言（b25 定版：窗 ≥ 链实长；clip 实长 SPEC §4 v1+r11+T46——
     语义句 clip 化后错链下界改按 anm_again_* 实长推导，禁从实现归纳）
     判对窗单名（dietclass/chaindir 域动物 max=sheep 1632）=2256+150+1632+300=4338 ≤4400；
     multifood 双名 max=bear honey+berry=3048 → 2256+150+3048+300=5754 ≤6400；
     错链四式（150 间隔+300 落定）：findfood 2016+150+1464+150+2664+300=6744 /
     findwho 1944+150+1560+150+2496+300=6600 / dietclass 2016+150+1632+150+2232+300=6480 /
     chaindir 1584+150+1632+150+2688+300=6504（均 ≤7800） ---- */
  total++;
  const winOk = (1600 + 2800) >= SPEC_DUR.anm_right + 150 + SPEC_DUR.anm_n_sheep + 300 &&   // 单名判对窗 4400 ≥ 4338
                (1600 + 4800) >= SPEC_DUR.anm_right + 150 + SPEC_DUR.anm_n_honey + 150 + SPEC_DUR.anm_n_berry + 300 &&   // 提交窗 6400 ≥ 5754
                3500 >= SPEC_DUR.anm_tut_watch + 300 &&                        // 教学名音演示延 ≥ 3396
                3900 >= SPEC_DUR.anm_n_rabbit + 150 + SPEC_DUR.anm_q1 + 300 &&   // 教学开题链演示窗 ≥ 3786
                2150 >= SPEC_DUR.anm_tut_turn + 300 &&                         // turn 后读题延 ≥ 2124
                (2620 + 400) >= SPEC_DUR.anm_right + 300 &&                    // winFlow ≥ 2556
                7800 >= SPEC_DUR.anm_hint + 150 + SPEC_DUR.anm_n_squirrel + 150 + SPEC_DUR.anm_again_food + 300 &&   // findfood ≥6744
                7800 >= SPEC_DUR.anm_q2 + 150 + SPEC_DUR.anm_n_carrot + 150 + SPEC_DUR.anm_again_who + 300 &&       // findwho ≥6600
                7800 >= SPEC_DUR.anm_hint + 150 + SPEC_DUR.anm_n_sheep + 150 + SPEC_DUR.anm_again_diet + 300 &&     // dietclass ≥6480
                7800 >= SPEC_DUR.anm_n_wolf + 150 + SPEC_DUR.anm_n_sheep + 150 + SPEC_DUR.anm_again_chain + 300;    // chaindir ≥6504
  const estData = { confirmWin1: 4400, confirmNeed1: SPEC_DUR.anm_right + 150 + SPEC_DUR.anm_n_sheep + 300,
                    confirmWin2: 6400,
                    confirmNeed2: SPEC_DUR.anm_right + 150 + SPEC_DUR.anm_n_honey + 150 + SPEC_DUR.anm_n_berry + 300,
                    tutWatch: 3500, tutChainWin: 3900,
                    tutChainNeed: SPEC_DUR.anm_n_rabbit + 150 + SPEC_DUR.anm_q1 + 300,
                    turnDelay: 2150, rightFlow: 3020, wrongChain: 7800,
                    chainFood: SPEC_DUR.anm_hint + 150 + SPEC_DUR.anm_n_squirrel + 150 + SPEC_DUR.anm_again_food + 300,
                    chainWho: SPEC_DUR.anm_q2 + 150 + SPEC_DUR.anm_n_carrot + 150 + SPEC_DUR.anm_again_who + 300,
                    chainDiet: SPEC_DUR.anm_hint + 150 + SPEC_DUR.anm_n_sheep + 150 + SPEC_DUR.anm_again_diet + 300,
                    chainChain: SPEC_DUR.anm_n_wolf + 150 + SPEC_DUR.anm_n_sheep + 150 + SPEC_DUR.anm_again_chain + 300,
                    submitLess: SPEC_DUR.anm_less, submitMore: SPEC_DUR.anm_more };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑱ wall-clock：三关节奏驱动实测 ×(1/SPEED) 折算 ≥Σ判对窗×0.95（演出窗完整在场）。
     认知时长门槛在 ① modeled（listen+nOpts×1500+taps×1200 ≥40000，认知步主体非演出窗）——
     机器人即时点击天然测不到浏览/思考时间，此处只验演出窗（判对 4400/提交 6400）未被削减：
     若 finishWait 窗被删/缩水，实测将低于每关 5 题×窗之和×0.95 ---- */
  total++;
  const wcOf = async flat => {
    startLevel(flat);
    const t = Date.now();
    let guard = 0;
    while (cur && !cur.done && guard++ < 200) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const q = window.AN.quiz;
      if (!q) break;
      const r = await driveQ(q);                     // 单答案=真值卡 / 提交=勾满+提交
      if (r === 'done') break;
    }
    return Math.round((Date.now() - t) / SPEED);
  };
  const wc0 = await wcOf(0), wc5 = await wcOf(5), wc15 = await wcOf(15);
  const needWC = flat => flat === 5 ? 5 * 6400 : 5 * 4400;   // ch2 提交窗 / 其余单名窗
  const wcOk = wc0 >= needWC(0) * 0.95 && wc5 >= needWC(5) * 0.95 && wc15 >= needWC(15) * 0.95;
  if (wcOk) npass++;
  smokes.wallClock = { ok: wcOk, flat0: wc0, flat5: wc5, flat15: wc15,
                       need0: needWC(0), need5: needWC(5), need15: needWC(15) };

  /* ---- ⑲ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'animalmenu', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__anVlog = out;                          // 外部断言挂点（任务书钩子）
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
