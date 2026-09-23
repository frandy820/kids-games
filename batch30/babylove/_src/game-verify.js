/* ================= ?verify=1 自检（仅 verify 分支加载执行）——r10 四题型多步版
   ① 静态 25 + 生成 20 关全量审计（flat 0-44）：确定性（同 flat 两次 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch 静态 1+flat//5+生成 1-5）/
     引擎直驱（逐步点应选卡→step×2/right/末题 done→全关 3 星）
   ② SPEC 表独立对账（SPEC_PAIRS 12 对/SPEC_CONFUSABLE/SPEC_GROWTH/SPEC_HAB——verify 内
     从 SPEC-BATCH30 r10 块文字独立重列，不引用引擎 PAIRS6/CONFUSABLE/GROWTH/HAB_OF）× 45 关全步：
     配对=候选互异含真值 ⊆对应集 / answer 独立复算 / 干扰恰 3 互异 ≠真值 / dch≥2 findbaby
     近形伴在场恰 1 位 / grow=卡池链三阶段全量 / habitat=(hab×stage) 恰 2×2+want 两态在场 /
     ch1 恒 findmom / flat0q0=findmom tadpole（教学锚）
   ③ 聚合独占票：dch2 两族混出 / dch4 三生境在场 / dch5 每关 ≥3 型 / 生成关 dch1-5 全现
   ④ tapOpt 单元（flat0 findmom/tadpole）：越界=null；错=wrong+miss+1+1000ms 防重入+错链
     （bab_wrong+bab_again_mom 键段——T46 阶段2 clip 化）；对=step（第 1/2 小问）+切换链名音+对=right
     （题尾）+确认链（bab_right+名音两段全 clip）；重听链（名音+q1 两 clip 无 keyless）
   ⑤ grow 单元（flat10 dch3）：错链=bab_wrong+bab_again_grow 键段；点对=step+步链
     [bab_n_<卵>, bab_grow_next]；.card.done 递增；三步成题 right
   ⑥ habitat 单元（flat15 dch4）：view.want 两态 / 2×2 独立复算 / 错链 bab_again_hab 键段 /
     对=step+链 [bab_q4_*]
   ⑦ 帧内容断言（契约 M：渲染即引擎）：图卡 DOM 数==opts.len、每卡 data-anim==opts[i].anim
     且内含 1 幅 SVG、题面 data-ask==quiz.ask 且 g[data-anim]/g[data-hab]==ask、
     q-text 按题型（妈妈/宝宝/小时候/住在）+grow-tray 3 槽——flat0/flat5(findbaby 遍历)/
     flat10/flat15 四态
   ⑧ 教学链：tutorialWatch() 真实走完（stub 存档）→ __blDemoR==='step'（r10 步语义）且
     tut='help'，watch 折算真实时长 ≤16s
   ⑨ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑩ UI 冒烟：flat0 autoSolve（taps=15=3 步×5 题，恒 3★）/ flat10（grow taps=15）/
     flat15（habitat 先 1 错再 autoSolve：miss=1 → 2★）
   ⑪ 布局：双 viewport（1280×800/800×1180）×（flat0/flat5/flat10/flat15）：候选卡 ≥96×96、
     题面 SVG ≥120px 高、描边对比度 ≥3:1、overflowX ≤0
   ⑫ clips：bab_ 44 条 + core 3 条全注入 + duration 辨别器（r10 实测表 ±60ms）
   ⑬ 星级三档：0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑭ 契约 A/B/E/F/I/J/K 源码断言（读自身合并 script 文本；B 含救援双锚 14s/30s 节流）
   ⑮ 章末预告 C7 独立硬编码对账（五章 hint[i]↔CHAPTERS[i+1] 逐点+off-by-one 哨兵：
     5 章末 f=4/9/14/19/24 全 static 段、f=25 起走生成实算）+ 生成关 nextHint 实算对账
   ⑯ estMs 语音窗动态断言：判对窗 4800 ≥ 2280+150+1848+300=4578；教学开题链演示窗
     4100 ≥ 1368+150+2232+300=4050；watch 延 3400 ≥ 3072+300；turn 延 2150 ≥ 1824+300；
     celebrate 3020 ≥ 2280+300=2580；链豁免 6600 ≥ 四题型最长链（findmom clip 口径 5010——T46 阶段2）
   ⑰ r10 时长硬断言：(a) modeled 全 45 关——每关 Σ题（配对 2×2400+4800 / grow 2×2200+4800
     / habitat 2×2600+4800）≥40000ms；(b) wall-clock 三关（flat0/flat10/flat15）autoSolve
     实测×(1/SPEED) 折算 ≥40000ms——审计 #28 实测 22s 根治的量化证据
   ⑱ SPEED=0.12 提速断言
   结果写 #verify-result + window.__blVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH30 §0.73 r10 块文字独立重列（禁抄页面 PAIRS6/CONFUSABLE/GROWTH/HAB_OF/文案） */
  const SPEC_PAIRS = {                           // 配对封闭 12（幼体 → 成体）
    tadpole: 'frog', caterpillar: 'butterfly', chick: 'hen',
    puppy: 'dog', kitten: 'cat', calf: 'cow',
    fishfry: 'fish', duckling: 'duck', grub: 'beetle',
    lamb: 'sheep', piglet: 'pig', foal: 'horse' };
  const SPEC_BABIES = ['tadpole', 'caterpillar', 'chick', 'puppy', 'kitten', 'calf',
                       'fishfry', 'duckling', 'grub', 'lamb', 'piglet', 'foal'];   // 幼体集
  const SPEC_ADULTS = ['frog', 'butterfly', 'hen', 'dog', 'cat', 'cow',
                       'fish', 'duck', 'beetle', 'sheep', 'pig', 'horse'];         // 成体集
  const SPEC_INV = {};                           // 成体 → 幼体（SPEC_PAIRS 反查）
  for (const b in SPEC_PAIRS) SPEC_INV[SPEC_PAIRS[b]] = b;
  const SPEC_CONF = { tadpole: 'fishfry', fishfry: 'tadpole',
                      caterpillar: 'grub', grub: 'caterpillar' };   // 近形干扰对（r10）
  const SPEC_GROWTH = {                          // 发育链 6（卵→幼→成）
    frog: ['egg_frog', 'tadpole', 'frog'],
    butterfly: ['egg_butterfly', 'caterpillar', 'butterfly'],
    beetle: ['egg_beetle', 'grub', 'beetle'],
    fish: ['egg_fish', 'fishfry', 'fish'],
    hen: ['egg_hen', 'chick', 'hen'],
    duck: ['egg_duck', 'duckling', 'duck'] };
  const SPEC_HAB = {};                           // 动物 → 生境（SPEC 12 对生境列推导）
  { const M = { tadpole: 'water', fishfry: 'water', duckling: 'water',
                caterpillar: 'forest', grub: 'forest',
                chick: 'grass', puppy: 'grass', kitten: 'grass', calf: 'grass',
                lamb: 'grass', piglet: 'grass', foal: 'grass' };
    for (const b in M) { SPEC_HAB[b] = M[b]; SPEC_HAB[SPEC_PAIRS[b]] = M[b]; } }
  const SPEC_AGAIN = { findmom: '再看看它的妈妈长什么样', findbaby: '再看看这个宝宝是谁',
                       grow: '再想想长大的顺序', habitat: '再看看它住在哪里' };  // 错语义句
  const SPEC_DUR = { bab_tut_watch: 3072, bab_tut_turn: 1824, bab_hint: 2016, bab_right: 2280,
                     bab_wrong: 1656, bab_q1: 2232, bab_q2: 2184,
                     bab_q3: 2520, bab_grow_next: 1488,
                     bab_h_water: 1728, bab_h_forest: 1896, bab_h_grass: 2016,
                     bab_q4_mom: 2136, bab_q4_baby: 2064,
                     bab_n_butterfly: 1416, bab_n_calf: 1416, bab_n_cat: 1344,
                     bab_n_caterpillar: 1584, bab_n_chick: 1440, bab_n_cow: 1344,
                     bab_n_dog: 1368, bab_n_frog: 1368, bab_n_hen: 1344,
                     bab_n_kitten: 1368, bab_n_puppy: 1416, bab_n_tadpole: 1368,
                     bab_n_fishfry: 1368, bab_n_fish: 1368, bab_n_duckling: 1392,
                     bab_n_duck: 1344, bab_n_grub: 1848, bab_n_beetle: 1392,
                     bab_n_lamb: 1392, bab_n_sheep: 1368, bab_n_piglet: 1440,
                     bab_n_pig: 1368, bab_n_foal: 1416, bab_n_horse: 1344,
                     bab_n_egg_frog: 1608, bab_n_egg_butterfly: 1632, bab_n_egg_beetle: 1632,
                     bab_n_egg_fish: 1368, bab_n_egg_hen: 1344, bab_n_egg_duck: 1344,
                     bab_again_mom: 2904, bab_again_baby: 2880, bab_again_grow: 2568,
                     bab_again_hab: 2688 };  // r10 实测表 + T46 阶段2 again 四键（ffprobe 同口径实测）
  const SPEC_CHAPTER_HINTS = { 1: '宝宝变多了，还要反过来找', 2: '宝宝要按长大的样子排队啦',
                               3: '宝宝们都住在哪里呀', 4: '什么都混在一起，大挑战',
                               5: '新一轮帮宝宝找妈妈' };
  const SPEC_GEN_HINTS = ['四张卡里找妈妈', '找妈妈，也找宝宝',
                          '按长大的顺序排一排', '找找它住在哪里', '宝宝妈妈大集合'];
  /* r10 时长窗常量（SPEC §r10 窗表独立重列——与页内实现常量对拍非互证） */
  const M_SUB = 2400, M_HAB = 2600, M_GROW = 2200, M_CONF = 4800, M_LEVEL_MIN = 40000;
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量
  const unlocked = async () => {                  // 等错防重入/演出窗结束（verify 提速后 ≤1s）
    let wg = 0;
    while ((state.locked || state.demo) && wg++ < 900) await wait(50);
    return !(state.locked || state.demo);
  };
  /* T46 阶段2（2026-09-19）：四题型语义句 clip 化（bab_again_* 键段，text=TTS 兜底）——
     keyless {key:null} 段清零，Mj-1 链尾断言（keylessLast）随之退役移除 */
  /* 遍历推进直到目标题型出现（dch2 混出翻 1 保证两族在场；dch5 四型 ≥3 型在场） */
  const seekKind = async kind => {
    for (let g = 0; g < 40; g++) {
      const v = window.BL.quiz;
      if (!v) return null;
      if (v.kind === kind) return v;
      if (!(await unlocked())) return null;
      const r = await window.BL.tapOpt(v.answer);
      if (r === 'done' || r === false) return null;
    }
    return null;
  };
  const lastQ = () => window.__lastQueue;

  /* ---- ①② 45 关全量审计 + SPEC 表独立对账 ---- */
  const genDch = {}, mixBad2 = [], habBad = [], kindBad5 = [], durBad = [];
  let tableOk = true, badCase = null;
  const NF = 45;
  for (let flat = 0; flat < NF; flat++) {
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
    const dchOk = flat < 25 ? L1.dch === Math.floor(flat / 5) + 1   // 静态五档
                            : (L1.dch >= 1 && L1.dch <= 5);       // 生成关随机章参数
    /* 引擎直驱：逐步点应选卡 → step×2 / right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      for (let s = 0; s < 3 && driveOk; s++) {
        const v = quizView(L3);
        if (!v || v.step !== k || v.substep !== s) { driveOk = false; break; }
        const exp = s < 2 ? 'step' : (k === L3.quizzes.length - 1 ? 'done' : 'right');
        const r = engTapOpt(L3, v.answer);
        if (r !== exp || (v.miss !== 0)) { driveOk = false; break; }
      }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* SPEC 独立复算驱动副本 Lc（grow answer 逐点复算+全题型同步推进） */
    const Lc = genLevel(flat);

    /* SPEC 表独立对账（每题每步：域/answer 复算/干扰构成/近形/2×2/链全量） */
    let specOk = true;
    let nMom = 0;
    const kindsSeen = new Set();
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      kindsSeen.add(q.kind);
      if (flat === 0 && k === 0) {                          // 教学演示锚点：蝌蚪找妈妈
        if (q.kind !== 'findmom' || q.subs[0].ask !== 'tadpole') { badCase = 'anchor ' + flat; specOk = false; break; }
      }
      if (L1.dch === 1 && q.kind !== 'findmom') { badCase = 'dch1 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 2 && q.kind !== 'findmom' && q.kind !== 'findbaby') { badCase = 'dch2 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 3 && q.kind !== 'grow') { badCase = 'dch3 ' + flat + '/' + k; specOk = false; break; }
      if (L1.dch === 4 && q.kind !== 'habitat') { badCase = 'dch4 ' + flat + '/' + k; specOk = false; break; }
      if (q.kind === 'findmom') nMom++;
      if (q.kind === 'grow') {
        if (!SPEC_GROWTH[q.ask]) { badCase = 'growChain ' + flat + '/' + k; specOk = false; break; }
        const chain = SPEC_GROWTH[q.ask];
        const vals = q.opts.map(o => o.anim);
        if (vals.length !== 3 || new Set(vals).size !== 3 ||
            chain.some(st => vals.indexOf(st) < 0)) { badCase = 'growSet ' + flat + '/' + k; specOk = false; break; }
        /* 逐点 answer 复算（Lc 同步推进：第 p 步正确卡=chain[p] 下标） */
        for (let p = 0; p < 3; p++) {
          const v = quizView(Lc);
          if (!v || v.step !== k || v.opts[v.answer].anim !== chain[p]) { badCase = 'growAns ' + flat + '/' + k + '/' + p; specOk = false; break; }
          engTapOpt(Lc, v.answer);
        }
        if (!specOk) break;
      } else if (q.kind === 'habitat') {
        if (['water', 'forest', 'grass'].indexOf(q.ask) < 0) { badCase = 'habAsk ' + flat + '/' + k; specOk = false; break; }
        for (let s = 0; s < 3; s++) {             // Lc 同步推进（habitat 题保持步进同步——grow 复算依赖）
          const vv = quizView(Lc);
          if (vv && vv.step === k) engTapOpt(Lc, vv.answer);
        }
        const wants = q.subs.map(s => s.want);
        if (new Set(wants).size !== 2) { badCase = 'habWantMix ' + flat + '/' + k; specOk = false; break; }
        for (const sub of q.subs) {
          const vals = sub.opts.map(o => o.anim);
          if (vals.length !== 4 || new Set(vals).size !== 4) { badCase = 'habLen ' + flat + '/' + k; specOk = false; break; }
          const isMom = sub.want === 'mom';
          if (!vals.every(v => SPEC_HAB[v])) { badCase = 'habDom ' + flat + '/' + k; specOk = false; break; }
          const same = vals.filter(v => SPEC_HAB[v] === sub.hab);
          const stg = vals.filter(v => (SPEC_ADULTS.indexOf(v) >= 0) === isMom);
          const truth = vals.filter(v => SPEC_HAB[v] === sub.hab && (SPEC_ADULTS.indexOf(v) >= 0) === isMom);
          if (same.length !== 2 || stg.length !== 2 || truth.length !== 1 ||
              sub.answer < 0 || vals[sub.answer] !== truth[0]) { badCase = 'hab2x2 ' + flat + '/' + k; specOk = false; break; }
        }
        if (!specOk) break;
      } else {
        for (let s = 0; s < 3; s++) {             // Lc 同步推进（非 grow 题保持步进同步）
          const vv = quizView(Lc);
          if (vv && vv.step === k) engTapOpt(Lc, vv.answer);
        }
        const asks = q.subs.map(s => s.ask);
        if (new Set(asks).size !== 3) { badCase = 'subAskDup ' + flat + '/' + k; specOk = false; break; }
        for (const sub of q.subs) {
          const isMom = q.kind === 'findmom';
          const askOk = isMom ? SPEC_BABIES.indexOf(sub.ask) >= 0 : SPEC_ADULTS.indexOf(sub.ask) >= 0;
          if (!askOk) { badCase = 'askDomain ' + flat + '/' + k; specOk = false; break; }
          const vals = sub.opts.map(o => o.anim);
          const pool = isMom ? SPEC_ADULTS : SPEC_BABIES;
          let poolOk = true;
          for (const v of vals) if (pool.indexOf(v) < 0) poolOk = false;   // 候选恒 ∈ 对应集
          if (!poolOk || vals.length !== 4 || new Set(vals).size !== vals.length) { badCase = 'optPool ' + flat + '/' + k; specOk = false; break; }
          const truth = isMom ? SPEC_PAIRS[sub.ask] : SPEC_INV[sub.ask];   // 真值独立换算
          const inters = vals.filter(v => v !== truth);                   // 干扰=去真值
          if (inters.length !== 3 || new Set(inters).size !== 3 ||
              inters.indexOf(truth) >= 0) { badCase = 'distract ' + flat + '/' + k; specOk = false; break; }
          let expAns = -1;                                       // answer 独立复算：真值卡下标
          for (let j = 0; j < vals.length; j++) if (vals[j] === truth) expAns = j;
          if (expAns < 0 || sub.answer !== expAns) { badCase = 'ans ' + flat + '/' + k; specOk = false; break; }
          /* r10 近形干扰：dch≥2 findbaby 真值有伴 → 候选必含伴恰 1 位 */
          if (q.kind === 'findbaby' && L1.dch >= 2 && SPEC_CONF[truth]) {
            const nConf = vals.filter(v => v === SPEC_CONF[truth]).length;
            if (nConf !== 1) { badCase = 'confMiss ' + flat + '/' + k; specOk = false; break; }
          }
        }
        if (!specOk) break;
      }
    }
    if (!specOk) tableOk = false;
    /* r10 时长 modeled：关下界=Σ题窗公式（SPEC 窗常量独立重列） */
    let modeled = 0;
    for (const q of L1.quizzes)
      modeled += q.kind === 'grow' ? 2 * M_GROW + M_CONF :
                 q.kind === 'habitat' ? 2 * M_HAB + M_CONF : 2 * M_SUB + M_CONF;
    if (modeled < M_LEVEL_MIN) durBad.push(flat + ':' + modeled);
    /* 聚合素材 */
    if (L1.dch === 2 && (nMom === 0 || nMom === CH_LEN)) mixBad2.push(flat);
    if (L1.dch === 4 && new Set(L1.quizzes.map(q => q.ask)).size < 3) habBad.push(flat);
    if (L1.dch === 5 && kindsSeen.size < 3) kindBad5.push(flat);
    if (flat >= 25) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && specOk && modeled >= M_LEVEL_MIN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk,
                  dchOk: dchOk, driveOk: driveOk, solvedAll: solvedAll, specOk: specOk,
                  modeled: modeled,
                  kinds: L1.quizzes.map(q => (q.kind === 'findmom' ? 'm' : q.kind === 'findbaby' ? 'b' : q.kind === 'grow' ? 'g' : 't') + ':' + q.ask) };   // m=findmom/b=findbaby/g=grow/t=habitat
    if (flat < 25) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ③ 聚合独占票：两族混出/三生境/四型多样/生成关五型全现/时长 modeled ---- */
  total++;
  const aggOk = tableOk && mixBad2.length === 0 && habBad.length === 0 && kindBad5.length === 0 &&
    durBad.length === 0 &&
    genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0 && genDch[5] > 0;
  if (aggOk) npass++;
  units.audit = { ok: aggOk, bad: badCase, mixBad2: mixBad2, habBad: habBad,
                  kindBad5: kindBad5, durBad: durBad, genDch: genDch };

  /* ---- ④ tapOpt 单元（flat0 findmom/tadpole 4 候选，3 小问） ---- */
  total++;
  startLevel(0);
  const q4 = window.BL.quiz;
  const initOk = q4 && q4.kind === 'findmom' && q4.ask === 'tadpole' && q4.substep === 0 &&
                 q4.opts.length === 4 &&
                 q4.opts.every(o => typeof o.anim === 'string' && SPEC_ADULTS.indexOf(o.anim) >= 0) &&
                 q4.opts[q4.answer].anim === 'frog' &&
                 q4.step === 0 && q4.miss === 0;
  const badTap = (await window.BL.tapOpt(99)) === null;           // 非法下标=null（不炸）
  const wA = q4.opts.findIndex((o, i) => i !== q4.answer);        // 错卡（随机异对成体）
  const pW = window.BL.tapOpt(wA);                                // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await window.BL.tapOpt(wA);                        // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const chainA = lastQ() && lastQ().length === 2 &&
                lastQ()[0] === 'bab_wrong' &&                     // 错链=bab_wrong+语义句 clip（T46 阶段2 键段）
                lastQ()[1] && lastQ()[1].key === 'bab_again_mom' &&
                lastQ()[1].text === SPEC_AGAIN.findmom;
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             window.BL.quiz.miss === 1 && window.BL.currentLevel.miss === 1;
  /* 对=step（第 1 小问完成，substep→1，切换链=新小问动物名音） */
  const rS1 = await window.BL.tapOpt(q4.answer);
  const v1 = window.BL.quiz;
  const chainS1 = lastQ() && lastQ().length === 1 && lastQ()[0] === 'bab_n_' + v1.ask;
  const s2a = rS1 === 'step' && v1.substep === 1 && v1.step === 0 &&
              v1.kind === 'findmom' && SPEC_BABIES.indexOf(v1.ask) >= 0 &&
              v1.opts[v1.answer].anim === SPEC_PAIRS[v1.ask] && chainS1;
  const rS2 = await window.BL.tapOpt(v1.answer);                 // 第 2 小问 → step
  const v2 = window.BL.quiz;
  const s2b = rS2 === 'step' && v2.substep === 2;
  const rR = await window.BL.tapOpt(v2.answer);                  // 题尾 → right
  const chainR = lastQ() && lastQ().length === 2 &&
                 lastQ()[0] === 'bab_right' &&                    // 确认链=bab_right+名音尾段（全 clip 无 keyless）
                 lastQ()[1] === 'bab_n_' + SPEC_PAIRS[v2.ask];
  replayQuiz(false);                              // 重听路径：名音+题面句（两 clip 无 keyless）
  const chainQ = lastQ() && lastQ().length === 2 &&
                 lastQ()[0] === 'bab_n_' + window.BL.quiz.ask &&
                 lastQ()[1] === 'bab_q1';
  const s2 = s2a && s2b && rR === 'right' && chainR && chainQ &&
             window.BL.quiz.step === 1 && window.BL.quiz.substep === 0 && window.BL.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrongA: s1,
                chain: chainA, stepA: s2a, stepB: s2b, right: s2, chainR: chainR, chainReplay: chainQ };

  /* ---- ⑤ grow 单元（flat10 dch3：错链+步链+done 卡+三步成题） ---- */
  total++;
  startLevel(10);
  const gv = window.BL.quiz;
  const gShape = gv && gv.kind === 'grow' && !!SPEC_GROWTH[gv.ask] &&
                 gv.opts.length === 3 &&
                 gv.opts.map(o => o.anim).every(a => SPEC_GROWTH[gv.ask].indexOf(a) >= 0) &&
                 gv.opts[gv.answer].anim === SPEC_GROWTH[gv.ask][0];
  const gW = gv.opts.findIndex((o, i) => i !== gv.answer);        // 非当前最早阶段卡
  const rG1 = await window.BL.tapOpt(gW);
  const chainG = lastQ() && lastQ().length === 2 &&
                 lastQ()[0] === 'bab_wrong' &&
                 lastQ()[1] && lastQ()[1].key === 'bab_again_grow' &&
                 lastQ()[1].text === SPEC_AGAIN.grow;
  const gMiss = window.BL.quiz.miss === 1;
  const rG2 = await window.BL.tapOpt(window.BL.quiz.answer);      // 点卵 → step
  const chainS = lastQ() && lastQ().length === 2 &&
                 lastQ()[0] === 'bab_n_' + SPEC_GROWTH[gv.ask][0] &&   // 步链头=刚点中阶段名音
                 lastQ()[1] === 'bab_grow_next';
  const doneN1 = boardEl.querySelectorAll('.card.done').length === 1;   // 已点卡 done 淡化
  const sub2 = window.BL.quiz.substep === 1;
  const rG3 = await window.BL.tapOpt(window.BL.quiz.answer);      // 点幼体 → step
  const doneN2 = boardEl.querySelectorAll('.card.done').length === 2;   // 第三步点前：前两阶段已 done
  const rG4 = await window.BL.tapOpt(window.BL.quiz.answer);      // 点成体 → right（题尾，换题后 board 重建）
  const growOk = gShape && rG1 === 'wrong' && chainG && gMiss && rG2 === 'step' &&
                 chainS && doneN1 && sub2 && rG3 === 'step' && doneN2 && rG4 === 'right';
  if (growOk) npass++;
  units.grow = { ok: growOk, shape: gShape, chain: chainG, stepChain: chainS,
                 done1: doneN1, r: [rG1, rG2, rG3, rG4] };

  /* ---- ⑥ habitat 单元（flat15 dch4：want 两态+2×2+错链+step 链+题尾确认链） ---- */
  total++;
  startLevel(15);
  let hShape = true, h2x2 = true, stepChainOk = true, endChainOk = true;
  const hWantSeen = new Set();
  for (let g = 0; g < 3 && hShape; g++) {                         // 一题 3 小问逐轮驱动断言
    const hv = window.BL.quiz;
    if (!hv || hv.kind !== 'habitat') { hShape = false; break; }
    const vals = hv.opts.map(o => o.anim);
    const isMom = hv.want === 'mom';
    const same = vals.filter(v => SPEC_HAB[v] === hv.ask);
    const stg = vals.filter(v => (SPEC_ADULTS.indexOf(v) >= 0) === isMom);
    const truth = vals.filter(v => SPEC_HAB[v] === hv.ask && (SPEC_ADULTS.indexOf(v) >= 0) === isMom);
    if (!(hv.ask === 'water' || hv.ask === 'forest' || hv.ask === 'grass') ||
        vals.length !== 4 || new Set(vals).size !== 4 ||
        same.length !== 2 || stg.length !== 2 || truth.length !== 1 ||
        vals[hv.answer] !== truth[0]) h2x2 = false;
    hWantSeen.add(hv.want);
    if (g === 0) {                                                // 首小问：错链（keyless 尾）+miss
      const hW = hv.opts.findIndex((o, i) => i !== hv.answer);
      const rH = await window.BL.tapOpt(hW);
      const chainH = lastQ() && lastQ().length === 2 &&
                     lastQ()[0] === 'bab_wrong' &&
                     lastQ()[1] && lastQ()[1].key === 'bab_again_hab' &&
                     lastQ()[1].text === SPEC_AGAIN.habitat;
      if (!(rH === 'wrong' && chainH && window.BL.quiz.miss === 1)) hShape = false;
      await unlocked();
    }
    const vNow = window.BL.quiz;                                  // 点对前小问（answer 锚）
    const rS = await window.BL.tapOpt(vNow.answer);               // 小问 1/2=step；小问 3=right（题尾）
    const vA = window.BL.quiz;                                    // 点对后视图：g<2=同题下一小问 / g=2=下一题
    const chainOk = g < 2                                         // step 链=[新小问 want 对应 q4 键]（长度 1；
      ? !!(lastQ() && lastQ().length === 1 &&                     //  链头由 tap 后新小问的 want 决定——
           lastQ()[0] === (vA.want === 'mom' ? 'bab_q4_mom' : 'bab_q4_baby'))   // 与点对前小问可不同）
      : !!(lastQ() && lastQ().length === 2 &&                     // 题尾=确认链 bab_right+点中动物名音
           lastQ()[0] === 'bab_right' && String(lastQ()[1]).indexOf('bab_n_') === 0);
    if (g < 2 && (rS !== 'step' || !chainOk)) stepChainOk = false;
    if (g === 2 && (rS !== 'right' || !chainOk)) endChainOk = false;
    if (rS !== (g < 2 ? 'step' : 'right') || !chainOk) hShape = false;
    await unlocked();
  }
  const habOk = hShape && h2x2 && stepChainOk && endChainOk && hWantSeen.size === 2;
  if (habOk) npass++;
  units.habitat = { ok: habOk, shape: hShape, x2: h2x2, stepChain: stepChainOk,
                    endChain: endChainOk, wants: Array.from(hWantSeen) };

  /* ---- ⑦ 帧内容断言（契约 M：渲染即引擎——四题型四态） ---- */
  total++;
  const frameCheck = q => {
    const cards = Array.from(boardEl.querySelectorAll('.card'));
    const domOk = cards.length === q.opts.length &&
      cards.every((c, i) => c.dataset.anim === q.opts[i].anim && c.querySelectorAll('svg').length === 1);
    const g = q.kind === 'habitat'
      ? sceneEl.querySelector('.ask-slot svg > g[data-hab]')
      : sceneEl.querySelector('.ask-slot svg > g[data-anim]');
    const sceneOk = sceneEl.dataset.ask === q.ask && !!g &&
      (q.kind === 'habitat' ? g.dataset.hab === q.ask : g.dataset.anim === q.ask);
    const txt = sceneEl.querySelector('.q-text').textContent;
    const txtOk = q.kind === 'findmom' ? txt.indexOf('妈妈') >= 0 :
                  q.kind === 'findbaby' ? txt.indexOf('宝宝') >= 0 :
                  q.kind === 'grow' ? txt.indexOf('小时候') >= 0 : txt.indexOf('住在') >= 0;
    return domOk && sceneOk && txtOk;
  };
  startLevel(0);                                        // dch1 findmom 4 卡
  const fA = frameCheck(window.BL.quiz) && boardEl.querySelectorAll('.card').length === 4;
  startLevel(5);                                        // dch2 遍历寻 findbaby 题（近形干扰在场）
  const qfb = await seekKind('findbaby');
  const truthFb = qfb && SPEC_INV[qfb.ask];
  const fB = !!qfb && frameCheck(qfb) && window.BL.quiz.kind === 'findbaby' &&
             (!SPEC_CONF[truthFb] || qfb.opts.some(o => o.anim === SPEC_CONF[truthFb]));
  startLevel(10);                                       // dch3 grow：3 卡+grow-tray 3 槽
  const fC = frameCheck(window.BL.quiz) && boardEl.querySelectorAll('.card').length === 3 &&
             sceneEl.querySelectorAll('.grow-tray .gt-slot').length === 3;
  startLevel(15);                                       // dch4 habitat：场景图 g[data-hab]
  const fD = frameCheck(window.BL.quiz) &&
             !!sceneEl.querySelector('.ask-slot svg > g[data-hab="' + window.BL.quiz.ask + '"]');
  const frameOk = fA && fB && fC && fD;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, dch1: fA, findbabyConf: fB, grow: fC, habitat: fD };

  /* ---- ⑧ 教学链：tutorialWatch 真实走完 → __blDemoR='step'（r10 步语义） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__blDemoR === 'step' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'findmom' &&
                cur.quizzes[0].subs[0].ask === 'tadpole' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__blDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑨ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await window.BL.tapOpt(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await window.BL.tapOpt(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && window.BL.quiz.step === 0 && window.BL.quiz.substep === 0 && window.BL.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑩ UI 冒烟 A：flat0 autoSolve 通关（3 步×5 题 taps=15，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await window.BL.autoSolve();
  const lv0 = window.BL.currentLevel;
  const smokeA = a0.done && a0.taps === 15 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑩ UI 冒烟 B：flat10（dch3 grow）autoSolve 通关 ---- */
  total++;
  startLevel(10);
  const a10 = await window.BL.autoSolve();
  const smokeB = a10.done && a10.taps === 15 && window.BL.currentLevel.done;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, taps: a10.taps };

  /* ---- ⑩ UI 冒烟 C：flat15（dch4 habitat）先 1 错再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(15);
  await unlocked();
  const q15 = window.BL.quiz;
  const wrongC = q15.opts.findIndex((o, i) => i !== q15.answer);
  const r15 = await window.BL.tapOpt(wrongC);
  await unlocked();
  const a15 = await window.BL.autoSolve();
  const lv15 = window.BL.currentLevel;
  const smokeC = r15 === 'wrong' && a15.done && a15.taps === 15 && lv15.done && lv15.won &&
                 lv15.miss === 1 && engStars(cur) === 2;
  if (smokeC) npass++;
  smokes.flat15 = { ok: smokeC, r15: r15, taps: a15.taps, miss: lv15.miss, stars: engStars(cur) };

  /* ---- ⑩d r10 时长 wall-clock：三关节奏驱动实测 ×(1/SPEED) 折算 ≥40000ms ---- */
  total++;
  const wcOf = async flat => {
    startLevel(flat);
    const t = Date.now();
    let guard = 0;
    while (cur && !cur.done && guard++ < 200) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 900) await wait(50);
      const v = view();
      if (!v) break;
      const kind = v.kind;
      const r = await uiTapOpt(v.answer);
      if (r === 'step' && kind === 'grow')
        await wait(GROW_STEP_WIN * SPEED);        // grow 步 fire-and-forget：补步动画窗（试玩等动画口径）
      else if (r === 'done') break;
    }
    return Math.round((Date.now() - t) / SPEED);
  };
  const wc0 = await wcOf(0), wc10 = await wcOf(10), wc15 = await wcOf(15);
  const wcOk = wc0 >= M_LEVEL_MIN && wc10 >= M_LEVEL_MIN && wc15 >= M_LEVEL_MIN;
  if (wcOk) npass++;
  smokes.wallClock = { ok: wcOk, flat0: wc0, flat10: wc10, flat15: wc15, min: M_LEVEL_MIN };

  /* ---- ⑪ 布局：双 viewport ×（flat0 / flat5 / flat10 / flat15） ---- */
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
    const need = window.BL.quiz ? window.BL.quiz.opts.length : 4;   // grow=3 卡 / 其余=4
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
    const sceneOk = svgh >= 120 && sc.w >= 64 && sc.h >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');       // 清理，不泄漏到下一单元
    return { vp: w + 'x' + h, flat: g._simFlat, cards: cards.length, svgH: svgh,
             hitOk: hitOk, sceneOk: sceneOk, contrast: cB && cS, rect: rectOk,
             portStyle: portStyleOk, ox: ox,
             pass: hitOk && sceneOk && cB && cS && rectOk && portStyleOk && ox <= 0 };
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

  /* ---- ⑫ clips：bab_ 48 条（T46 阶段2 +again 4）+ core 3 条全注入 + duration 辨别器（r10 实测表 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const babKeys = ['bab_tut_watch', 'bab_tut_turn', 'bab_hint', 'bab_right', 'bab_wrong',
                   'bab_q1', 'bab_q2', 'bab_q3', 'bab_grow_next',
                   'bab_h_water', 'bab_h_forest', 'bab_h_grass', 'bab_q4_mom', 'bab_q4_baby',
                   'bab_again_mom', 'bab_again_baby', 'bab_again_grow', 'bab_again_hab']
                   .concat(SPEC_BABIES.concat(SPEC_ADULTS).map(w => 'bab_n_' + w))
                   .concat(Object.keys(SPEC_GROWTH).map(c => 'bab_n_egg_' + c));
  const needAll = babKeys.concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keys.length === 51 &&
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

  /* ---- ⑬ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑭ 契约 A/B/E/F/I/J/K 源码断言（读自身合并 script 文本——第 3 个 script 块） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcE = src.indexOf('sv.babylove && sv.babylove.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 5') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 6600') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;   // I：豁免窗+救援守卫+重置
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcW = src.indexOf('SUB_WIN = 2400') >= 0 && src.indexOf('HAB_SUB_WIN = 2600') >= 0 &&
               src.indexOf('GROW_STEP_WIN = 2200') >= 0 && src.indexOf('3200 * SPEED') >= 0;   // r10 窗常量
  const srcOk = srcA && srcB && srcE && srcF && srcI && srcJ && srcK && srcW;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, A: srcA, B: srcB, E: srcE, F: srcF, I: srcI, J: srcJ, K: srcK, win: srcW };

  /* ---- ⑮ 章末预告 C7 独立硬编码对账（五章逐点+off-by-one 哨兵）+ 生成关实算对账 ---- */
  total++;
  const hintOk = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // hint[i] ↔ CHAPTERS[i+1]（家族 F）
                 CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                 CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                 CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                 CHAPTERS[5].hint === SPEC_CHAPTER_HINTS[5] &&
                 GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                 GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                 GEN_HINTS[4] === SPEC_GEN_HINTS[4] &&
                 nextHint(4) === SPEC_CHAPTER_HINTS[1] &&        // 章末（ch1 打完）预告 ch2 文案
                 nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                 nextHint(14) === SPEC_CHAPTER_HINTS[3] &&
                 nextHint(19) === SPEC_CHAPTER_HINTS[4] &&
                 nextHint(24) === SPEC_CHAPTER_HINTS[5] &&
                 nextHint(3) === SPEC_CHAPTER_HINTS[1] &&        // off-by-one 哨兵：章中 f=3（ci=0）与章末 f=4 同段
                 nextHint(5) === SPEC_CHAPTER_HINTS[2] &&        // 章首 f=5（ci=1）已属 ch2 段（右边界不提前）
                 nextHint(25) === SPEC_GEN_HINTS[genLevel(26).dch - 1];   // 静态→生成分支切换首关 f=25（ci=5）即走实算
  const genOk = [25, 29, 34, 39, 44].every(f => nextHint(f) === SPEC_GEN_HINTS[genLevel(f + 1).dch - 1] &&   // F：实算（SPEC 表对拍）
                                              SPEC_GEN_HINTS.indexOf(nextHint(f)) >= 0);
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4, 5].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑯ estMs 语音窗动态断言（b25 定版：窗 ≥ estMs/链实长；clip 实长 r10 表）
     确认链=bab_right 2280+150+名音 max 1848=4278；错链（最长 findmom 11 字）=1656+150+estMs(11)+300 ---- */
  total++;
  const maxName = SPEC_DUR.bab_n_grub;                             // 名音 max 1848（r10 实测）
  const winOk = (1600 + 3200) >= SPEC_DUR.bab_right + 150 + maxName + 300 &&   // 判对窗 4800 ≥ 4578
                4100 >= SPEC_DUR.bab_n_tadpole + 150 + SPEC_DUR.bab_q1 + 300 && // 教学开题链演示窗 ≥ 4050
                3400 >= SPEC_DUR.bab_tut_watch + 300 &&                          // 教学名音演示延 ≥ 3372
                2150 >= SPEC_DUR.bab_tut_turn + 300 &&                           // turn 后读题延 ≥ 2124
                (2620 + 400) >= SPEC_DUR.bab_right + 300 &&                      // winFlow ≥ 2580
                6600 >= SPEC_DUR.bab_wrong + 150 + SPEC_DUR.bab_again_mom + 300 &&   // findmom 链 ≥ 5010（T46 clip 实长）
                6600 >= SPEC_DUR.bab_wrong + 150 + SPEC_DUR.bab_again_baby + 300 &&
                6600 >= SPEC_DUR.bab_wrong + 150 + SPEC_DUR.bab_again_grow + 300 &&      // grow 链 ≥ 4674
                6600 >= SPEC_DUR.bab_wrong + 150 + SPEC_DUR.bab_again_hab + 300 &&      // habitat 链 ≥ 4794
                SUB_WIN >= SPEC_DUR.bab_n_grub + 300 &&                          // 配对小问切换窗 ≥ 2148
                HAB_SUB_WIN >= SPEC_DUR.bab_q4_mom + 300 &&                      // habitat 小问窗 ≥ 2436
                GROW_STEP_WIN >= SPEC_DUR.bab_grow_next + 300;                   // grow 步动画窗 ≥ 1788
  const estData = { confirmWin: 4800, confirmNeed: SPEC_DUR.bab_right + 150 + maxName + 300,
                    subWin: SUB_WIN, habWin: HAB_SUB_WIN, growWin: GROW_STEP_WIN,
                    watchT: 3400, turnDelay: 2150, rightFlow: 3020, wrongChain: 6600,
                    chainNeedMom: SPEC_DUR.bab_wrong + 150 + SPEC_DUR.bab_again_mom + 300,
                    chainNeedGrow: SPEC_DUR.bab_wrong + 150 + SPEC_DUR.bab_again_grow + 300,
                    chainNeedHab: SPEC_DUR.bab_wrong + 150 + SPEC_DUR.bab_again_hab + 300 };
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: estData };

  /* ---- ⑰b modeled 汇总已在 ①（durBad 聚合）——此处独立复核窗常量与页内实现一致性 ---- */
  total++;
  const wcConst = SUB_WIN === M_SUB && HAB_SUB_WIN === M_HAB && GROW_STEP_WIN === M_GROW &&
                  (1600 + 3200) === M_CONF;          // SPEC 窗表 ↔ 页内常量（SPEC↔实现对拍，非互证）
  const modeledAll = Object.keys(levels).concat(Object.keys(gen))
    .every(k2 => (levels[k2] || gen[k2]).modeled >= M_LEVEL_MIN);
  if (wcConst && modeledAll) npass++;
  units.modeled = { ok: wcConst && modeledAll, sub: SUB_WIN, hab: HAB_SUB_WIN, grow: GROW_STEP_WIN,
                    min: M_LEVEL_MIN };

  /* ---- ⑱ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'babylove', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__blVlog = out;                          // 外部断言挂点（任务书钩子）
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
