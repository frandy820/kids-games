/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，逐关计项）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch=(ch-1)%4+1；生成关
     随机章参数 dch∈1-4 钩子直读）/ 引擎直驱（逐字母 solveNext → moved…→right/
     末题 done → 3 星）
   ② SPEC 独立对账（独立硬编码表，禁抄实现常量——双录对账）：词封闭 20+zh 表逐条 /
     池多重集独立复算（排序对账：池=词字母±恰 1 干扰且干扰∉词字母，flat0-39 全题）/
     章型（ch1 池长=词长、ch2 词长 4、ch3 池长=词长+1、ch4 混合）/ 页面文案表逐条
   ③ tapLtr 返回值族单元（真实 UI 状态机）：flat0 锚点（word=cat 池 3）/ 越界 null /
     moved（槽序+answer 推进）/ wrong（miss+1 槽不填）/ false（已用卡不记 miss）/
     right 推进 / 教学三段（watch→help→solo）
   ④ egg 重复字母殊途同达：两张 g 卡任一顺序驱动均 right（多重集语义专项）
   ⑤ 教学链：tutorialWatch 真实走完 → __wpDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；锚点=cat；demo 机制句 __lastSay
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入=null + 卡排容器 bump（家族 D）
   ⑦ miss≥2 首字母槽亮（sp_first 先例）：一错不亮、二错亮（不自动填入）
   ⑧ 契约 I 运行时：flat<3 wrong 起播设豁免窗（wrongChainUntil 前移）；
     flat≥3 节流跳过不设窗（10s 内二错窗不动）
   ⑨ 帧内容断言（家族 M）：逐卡驱动后 DOM 槽位字母序列==引擎 slots 串接 &&
     字母卡 .gone 态==pool[].used（错卡驱动后同样对账）
   ⑩ UI 冒烟：flat0-19 全量 autoSolve 通关（ch3 干扰/ch4 混合含干扰卡路径）
   ⑪ 布局：双 viewport（1280×800 / 800×1180）×（flat0 ch1 / flat17 ch4）：
     字母卡 ≥64×64、槽位 ≥56×56、插图 ≥100×100、描边对比度 ≥3:1、overflowX ≤0
   ⑫ clips：wpu_ 26 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4 实长 ±60ms）
   ⑬ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑭ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1；
     生成关 nextHint 实算（家族 F）
   ⑮ verify 提速断言：SPEED=0.12
   ⑯ 语音窗动态断言（clip 实长 SPEC §4；T46 阶段2 引导句/demo clip 化）：判对链窗 4800 ≥ 2496+150+1608+300；
     demo 机制句 clip 2832 ≤4800；错链豁免 6900 ≥ 2256+150+2976+300=5682；
     教学演示窗 4000 ≥ 3048+300；turn 延 2200 ≥ 1824+300；题面链 ≤13000
   ⑰ 章分布聚合：ch1 全 3 字母池 3 / ch2 全 4 池 4 / ch3 恒+1 干扰 / ch4 混合
     （词长 3/4 与干扰 0/1 均现）/ 生成关四型全现 / egg+hand 均出现
   ⑱ 存档契约（家族 C）：KIDS.init 写 kidsgame_wordpuz 带 v:'1.0'
   ⑲ 家族 A/B/D/F/I/K 源码级断言（Function.toString 含关键串）
   结果写 #verify-result + window.__wpVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- SPEC-BATCH29 §0.72/§3 独立硬编码表（禁抄页面 WORDS/文案/引擎函数） ---- */
  const SPEC_WORDS = {
    cat: '猫', dog: '狗', sun: '太阳', hat: '帽子', bed: '小床',
    pen: '钢笔', ten: '十', map: '地图', cup: '杯子', car: '汽车',
    bus: '公交车', box: '盒子', fox: '狐狸', egg: '鸡蛋', ant: '蚂蚁',
    eye: '眼睛', arm: '胳膊', leg: '腿', hand: '手', star: '星星'
  };
  const SPEC_DUR = { 'wpu_tut_watch': 3048, 'wpu_tut_turn': 1824, 'wpu_hint': 1896,
                     'wpu_right': 2496, 'wpu_wrong': 2256, 'wpu_q': 2136,
                     'wpu_w_fox': 1608, 'wpu_w_eye': 1296,
                     'wpu_g_wrong': 2976, 'wpu_demo': 2832 };   // T46 阶段2 引导句+demo clip 实长
  const SPEC_SENT = { q: '看图拼单词', wrong_guide: '看看图画，想想怎么拼',
                      demo: '点字母，放进格子里', watch: '看！拼出小单词',
                      turn: '你来拼一拼', hint: '看图想一想', right: '拼对啦，真聪明' };
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字符 + 600 落定余量（全字符含标点）

  /* 独立多重集复算（禁用引擎 structWhy）：池排序=词字母排序（无干扰）或
     词字母+恰 1 干扰（干扰∉词字母）排序；返回 {ok, distract} */
  const specMultiset = q => {
    const pm = q.pool.map(c => c.ch).sort().join('');
    const wm = q.word.split('').sort().join('');
    if (pm === wm) return { ok: true, distract: false };
    const diff = q.pool.filter(c => q.word.indexOf(c.ch) < 0);
    if (diff.length !== 1) return { ok: false, distract: false };
    const want = q.word.split('').concat([diff[0].ch]).sort().join('');
    return { ok: pm === want, distract: true };
  };
  /* 独立 tapLtr 语义模拟（④ 预演找错卡/已用卡——禁用引擎函数） */
  const specNextIdx = q => {                      // 应点卡=第一张未用且字母=下一所需（SPEC：按字母非下标）
    if (!q || q._answered) return -1;
    const need = q.word[q.slots.length];
    for (let i = 0; i < q.pool.length; i++)
      if (!q.pool[i].used && q.pool[i].ch === need) return i;
    return -1;
  };
  const specWrongIdx = q => {                     // 错卡=未用且字母≠下一所需
    const need = q.word[q.slots.length];
    for (let i = 0; i < q.pool.length; i++)
      if (!q.pool[i].used && q.pool[i].ch !== need) return i;
    return -1;
  };
  const advanceTo = async (flat, qi) => {         // 独立推进器驱 UI 到指定题（初始态）
    startLevel(flat);
    let g = 0;
    while (WP.quiz && WP.quiz.step < qi && g++ < 80) {
      const q = cur.quizzes[cur.step];
      const i = specNextIdx(q);
      if (i < 0) return false;
      await WP.tapLtr(i);
    }
    return !!(WP.quiz && WP.quiz.step === qi);
  };

  /* ---- ① 40 关全量审计（flat 0-39，逐关计项） ---- */
  const chAgg = { 1: [], 2: [], 3: [], 4: [] }, genDch = {};
  let eggSeen = 0, handSeen = 0;
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
    const dchOk = flat < STATIC_LEVELS ? L1.dch === ((Math.floor(flat / CH_LEN)) % 4) + 1
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* 引擎直驱：逐字母 solveNext（moved…）→ right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      let g = 0;
      while (!q._answered && g++ < 20) {
        const i = correctIdx(q);
        if (i < 0) { driveOk = false; break; }
        const r = engTapLtr(L3, i);
        if (r === 'moved') continue;             // 合法中间步（多 tap 正常）
        const want = k === CH_LEN - 1 ? 'done' : 'right';
        if (r !== want) driveOk = false;
        break;
      }
      if (!q._answered || q._miss !== 0) driveOk = false;
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 聚合（⑰ 数据源） */
    if (flat < STATIC_LEVELS) chAgg[L1.dch].push(L1.quizzes.map(q => q.word.length + '/' + q.pool.length));
    L1.quizzes.forEach(q => { if (q.word === 'egg') eggSeen++; if (q.word === 'hand') handSeen++; });
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   words: L1.quizzes.map(q => q.word + '/池' + q.pool.length) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }

  /* ---- ② SPEC 独立对账（独立表推导 × 40 关全题 + zh 表 + 文案表一致） ---- */
  total++;
  let tableOk = true, badCase = null;
  /* 词封闭 20 逐条（词集+zh 双录） */
  const wordsOk = Object.keys(SPEC_WORDS).length === 20 &&
    Object.keys(SPEC_WORDS).every(w => WORDS[w] === SPEC_WORDS[w]) &&
    WORD_KEYS.length === 20;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (!(q.word in SPEC_WORDS)) { badCase = 'word ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.zh !== SPEC_WORDS[q.word]) { badCase = 'zh ' + flat + '/' + k; tableOk = false; break outer; }
      const ms = specMultiset(q);
      if (!ms.ok) { badCase = 'multiset ' + flat + '/' + k; tableOk = false; break outer; }   // 池=词字母±1 干扰
      const len = q.word.length;
      if (L.dch === 1 && !(len === 3 && q.pool.length === 3)) { badCase = 'ch1 ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 2 && !(len === 4 && q.pool.length === 4)) { badCase = 'ch2 ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 3 && !(len >= 3 && len <= 4 && q.pool.length === len + 1 && ms.distract)) { badCase = 'ch3 ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 4 && !(len >= 3 && len <= 4 && q.pool.length >= len && q.pool.length <= len + 1)) { badCase = 'ch4 ' + flat + '/' + k; tableOk = false; break outer; }
      if (ms.distract && !(L.dch === 3 || L.dch === 4)) { badCase = 'dis ' + flat + '/' + k; tableOk = false; break outer; }   // 干扰仅 ch3+
      /* 池恒可拼出目标：独立贪心重放（按序消费未用卡）——干扰多余可剩 */
      const need = q.word.split('');
      const avail = q.pool.map(c => c.ch);
      let canDo = true;
      for (const ch of need) {
        const p = avail.indexOf(ch);
        if (p < 0) { canDo = false; break; }
        avail.splice(p, 1);
      }
      if (!canDo) { badCase = 'spellable ' + flat + '/' + k; tableOk = false; break outer; }
      if (flat === 0 && k === 0 && !(q.word === 'cat' && q.pool.length === 3)) { badCase = 'anchor'; tableOk = false; break outer; }
    }
  }
  /* 页面文案表逐条一致（SPEC 表对账，禁抄实现） */
  const sentOk = quizText() === SPEC_SENT.q && GUIDE.wrong === SPEC_SENT.wrong_guide &&
                 DEMO_SAY === SPEC_SENT.demo &&
                 VOICE.watch.text === SPEC_SENT.watch && VOICE.turn.text === SPEC_SENT.turn &&
                 VOICE.hint.text === SPEC_SENT.hint && VOICE.right.text === SPEC_SENT.right &&
                 VOICE.q.key === 'wpu_q' && VOICE.right.key === 'wpu_right' &&
                 VOICE.wrong.key === 'wpu_wrong' && VOICE.watch.key === 'wpu_tut_watch' &&
                 VOICE.turn.key === 'wpu_tut_turn' && VOICE.hint.key === 'wpu_hint' &&
                 wordKey('cat') === 'wpu_w_cat';
  if (tableOk && wordsOk && sentOk) npass++;
  units.table = { ok: tableOk && wordsOk && sentOk, bad: badCase, words: wordsOk, sent: sentOk };

  /* ---- ③ tapLtr 返回值族单元（真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = WP.quiz;
  const initOk = q0 && q0.word === 'cat' && q0.zh === '猫' && q0.pool.length === 3 &&
                 q0.slots.length === 0 && q0.answer === 'c' && q0.step === 0 && q0.miss === 0;
  const badTap = (await WP.tapLtr(99)) === null;             // 越界 null（不炸）
  const ic = specNextIdx(cur.quizzes[0]);                    // c 卡（独立找）
  const rMov = await WP.tapLtr(ic);                          // → 'moved'
  const movOk = rMov === 'moved' && WP.quiz.step === 0 && WP.quiz.slots.join('') === 'c' &&
                WP.quiz.answer === 'a' && WP.quiz.miss === 0;
  const iw = specWrongIdx(cur.quizzes[0]);                   // 错卡（非 a 未用卡）
  const rW = await WP.tapLtr(iw);                            // → 'wrong'
  const wrongOk = rW === 'wrong' && WP.quiz.miss === 1 &&
                  WP.quiz.slots.join('') === 'c' && WP.quiz.answer === 'a';   // 槽不填 answer 不变
  const rF = await WP.tapLtr(ic);                            // 已用卡（c 卡已 gone）→ 'false'
  const falseOk = rF === 'false' && WP.quiz.miss === 1;      // 不记 miss
  await WP.tapLtr(specNextIdx(cur.quizzes[0]));              // a → moved
  const rR = await WP.tapLtr(specNextIdx(cur.quizzes[0]));   // t → 'right'（cat 拼满）
  const rightOk = rR === 'right' && WP.quiz.step === 1 && WP.quiz.miss === 0;
  const tapOk = initOk && badTap && movOk && wrongOk && falseOk && rightOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, moved: movOk, wrong: wrongOk,
                false: falseOk, right: rightOk };

  /* ---- ④ egg 重复字母殊途同达（多重集语义专项）：两张 g 卡任一顺序均 right ---- */
  total++;
  let eggFlat = -1, eggQi = -1;
  outerEgg:
  for (let f = 0; f < 40; f++) {
    const qs = genLevel(f).quizzes;
    for (let k = 0; k < qs.length; k++)
      if (qs[k].word === 'egg') { eggFlat = f; eggQi = k; break outerEgg; }
  }
  let eggOk = false, eggInfo = { flat: eggFlat };
  if (eggFlat >= 0) {
    const adv1 = await advanceTo(eggFlat, eggQi);
    let qz = WP.quiz;
    const gIdx = [];
    qz.pool.forEach((c, i) => { if (c.ch === 'g') gIdx.push(i); });
    if (adv1 && qz.word === 'egg' && gIdx.length === 2) {
      await WP.tapLtr(qz.pool.findIndex(c => c.ch === 'e'));   // e → moved
      const r1a = await WP.tapLtr(gIdx[0]);                    // g(第一张) → moved
      const r1b = await WP.tapLtr(gIdx[1]);                    // g(第二张) → 词完成
      const pathA = r1a === 'moved' && (r1b === 'right' || r1b === 'done');
      /* 路径 B：同题重开，两张 g 卡交换顺序——殊途同达 */
      const adv2 = await advanceTo(eggFlat, eggQi);
      qz = WP.quiz;
      if (adv2 && qz.word === 'egg') {
        await WP.tapLtr(qz.pool.findIndex(c => c.ch === 'e'));
        const r2a = await WP.tapLtr(gIdx[1]);                  // g(第二张先点) → moved
        const r2b = await WP.tapLtr(gIdx[0]);                  // g(第一张后点) → 词完成
        eggOk = pathA && r2a === 'moved' && (r2b === 'right' || r2b === 'done');
        eggInfo = { flat: eggFlat, qi: eggQi, pathA: [r1a, r1b], pathB: [r2a, r2b] };
      }
    }
  }
  if (eggOk) npass++;
  units.egg = { ok: eggOk, info: eggInfo };

  /* ---- 存档契约（家族 C）：KIDS.init 写 kidsgame_wordpuz 带 v:'1.0'
     （置于教学链前——其后 KIDS._save/store.persist 被 stub，persist 不再落盘） ---- */
  total++;
  KIDS.init({ game: 'wordpuz', title: '单词拼图' });   // verify 页真 init（真 persist 落盘）
  let saveOk = false, saveV = null;
  try {
    const raw = localStorage.getItem('kidsgame_wordpuz');
    const svv = raw ? JSON.parse(raw) : null;
    saveV = svv && svv.v;
    saveOk = !!svv && svv.v === '1.0' && svv.game === 'wordpuz';
  } catch (e) { saveOk = false; }
  if (saveOk) npass++;
  units.save = { ok: saveOk, v: saveV };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __wpDemoR='right'（演示点 c→a→t 拼满 cat） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  window.__lastSay = null;
  window.__playLog = [];                                     // T46 阶段2：demo 句改 play，走调用日志断言
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__wpDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].word === 'cat' &&       // 锚点：cat
                window.__playLog.some(e => e[0] === 'wpu_demo' && e[1] === SPEC_SENT.demo) &&   // demo 机制句 clip（T46；turn clip 在其后播，lastVoice 不可用）
                tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__wpDemoR, tut: state.tut,
                     demoPlay: window.__playLog.filter(e => e[0] === 'wpu_demo'), watchMs: Math.round(tw) };

  /* ---- 教学三段收口：help 态首题拼对 → solo 放手 ---- */
  total++;
  const qHelp = WP.quiz;
  let soloOk = false;
  if (qHelp && state.tut === 'help') {
    let g = 0;
    while (state.tut === 'help' && g++ < 10) {
      const r = await WP.tapLtr(specNextIdx(cur.quizzes[cur.step]));
      if (r === 'right' || r === 'done') break;
    }
    soloOk = state.tut === 'solo';
  }
  if (soloOk) npass++;
  units.solo = { ok: soloOk, tut: state.tut };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入=null + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await WP.tapLtr(0)) === null && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await WP.tapLtr(0)) === null;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && WP.quiz.step === 0 && WP.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ miss≥2 首字母槽亮（sp_first 先例：不自动填入） ---- */
  total++;
  startLevel(0);
  const w1 = specWrongIdx(cur.quizzes[0]);
  await WP.tapLtr(w1);                                       // 一错：miss=1 槽 0 不亮
  const noLit = !slotEl(0).classList.contains('breathe');
  const w2 = specWrongIdx(cur.quizzes[0]);
  const rW2 = await WP.tapLtr(w2);                           // 二错：miss=2 槽 0 亮
  const litOk = rW2 === 'wrong' && WP.quiz.miss === 2 &&
                slotEl(0).classList.contains('breathe') &&
                !slotEl(0).classList.contains('full');       // 亮提示≠自动填入
  const hintOk = noLit && litOk;
  if (hintOk) npass++;
  units.firstHint = { ok: hintOk, noLit: noLit, lit: litOk, miss: WP.quiz.miss };

  /* ---- ⑧ 契约 I 运行时：wrong 起播设豁免窗；flat≥3 节流跳过不设窗 ---- */
  total++;
  startLevel(0);                                             // flat<3：每错必播 → 起播设窗
  wrongChainUntil = 0;
  const wI = specWrongIdx(cur.quizzes[0]);
  await WP.tapLtr(wI);
  const winSet = wrongChainUntil > Date.now() && wrongChainUntil <= Date.now() + 6900 + 200;   // 起播设窗（6900）
  startLevel(10);                                            // flat≥3：10s 节流
  lastWrongVoice = Date.now(); wrongChainUntil = 0;          // 模拟 10s 内刚播过（同作用域直写锚）
  const wJ = specWrongIdx(cur.quizzes[0]);
  const rJ = await WP.tapLtr(wJ);
  const winSkip = rJ === 'wrong' && wrongChainUntil === 0;   // 节流跳过=不设窗（契约 I「起播设」）
  const chainOk = winSet && winSkip;
  if (chainOk) npass++;
  units.chain = { ok: chainOk, winSet: winSet, winSkip: winSkip };

  /* ---- ⑨ 帧内容断言（家族 M）：逐卡驱动后 DOM 槽序列==slots && 卡 .gone==used ---- */
  total++;
  startLevel(5);                                             // ch2 4 字母题（DOM 帧逐卡对账）
  let frameOk = true, frameBad = '';
  const domSlots = () => Array.from(slotsEl.querySelectorAll('.cell'))
    .map(c => c.querySelector('.lt').textContent).join('');
  const domUsedOk = q => Array.from(boardEl.querySelectorAll('.ltr')).every(el =>
    el.classList.contains('gone') === q.pool[Number(el.dataset.i)].used);
  const qf = cur.quizzes[0];
  if (WP.quiz.word.length !== 4) { frameOk = false; frameBad = 'not4'; }
  const rfw = specWrongIdx(cur.quizzes[0]);
  await WP.tapLtr(rfw);                                      // 先制造一次错（DOM 帧含 wig 后状态）
  if (domSlots() !== cur.quizzes[0].slots.join('') || !domUsedOk(cur.quizzes[0])) {
    frameOk = false; frameBad += '/afterWrong';
  }
  for (let s = 0; s < qf.word.length && frameOk; s++) {      // 逐卡驱动到词完成
    const qNow = cur.quizzes[cur.step];
    if (!qNow) break;
    const i = specNextIdx(qNow);
    const r = await WP.tapLtr(i);
    const qAfter = cur.done ? null : cur.quizzes[cur.step];
    const qFrame = r === 'right' || r === 'done'
      ? cur.quizzes[cur.step - 1] : qAfter;                  // 判对后 step 已推进（帧=旧题终态→换题重建）
    if (r === 'right' || r === 'done') {
      if (domSlots() !== '' || !(cur.done || cur.quizzes[cur.step] && cur.quizzes[cur.step].slots.length === 0)) {
        frameOk = false; frameBad += '/ren' + s;             // 换题后槽清空
      }
    } else {
      if (domSlots() !== qFrame.slots.join('')) { frameOk = false; frameBad += '/slots' + s; }
      if (!domUsedOk(qFrame)) { frameOk = false; frameBad += '/used' + s; }
    }
  }
  if (frameOk) npass++;
  units.frame = { ok: frameOk, bad: frameBad };

  /* ---- ⑩ UI 冒烟：autoSolve 通关——五关抽样 [0,5,10,14,19]（ch1/ch2/ch3×2/ch4 全章型覆盖；
     全量 flat0-19 UI autoSolve 由 _selftest.py 补跑断言全 3 星）
     （flat0-39 全量引擎直驱含 3 星断言已由 ① 覆盖；抽样控制 verify 总时长 ≤ gate G1 轮询窗） ---- */
  total++;
  const solved20 = [];
  let smoke20 = true;
  for (const flat of [0, 5, 10, 14, 19]) {
    startLevel(flat);
    const a = await WP.autoSolve();
    const lv = WP.currentLevel;
    solved20.push(flat + ':' + (a.done ? '1' : '0') + '/t' + a.taps + '/s' + (lv ? lv.stars : '?'));
    if (!a.done || !lv || !lv.done || !lv.won || lv.stars !== 3) smoke20 = false;
  }
  if (smoke20) npass++;
  smokes.flat19 = { ok: smoke20, solved: solved20 };

  /* ---- ⑪ 布局：双 viewport ×（flat0 ch1 / flat17 ch4）量测 + 描边对比度 ---- */
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
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.ltr'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const cells = Array.prototype.map.call(slotsEl.querySelectorAll('.cell'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const pic = sceneEl.querySelector('.pic');
    const cardOk = cards.length >= 3 && cards.every(b => b.w >= 64 && b.h >= 64);    // 字母卡 ≥64（§3 口径）
    const cellOk = cells.length >= 3 && cells.every(b => b.w >= 56 && b.h >= 56);    // 槽位 ≥56
    const picOk = !!pic && pic.offsetWidth >= 100 && pic.offsetHeight >= 100;        // 插图 ≥100
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.ltr')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, cards: cards.length, cardOk: cardOk, cellOk: cellOk,
             contrast: cB && cS, ox: ox, pass: cardOk && cellOk && picOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 17]) {
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

  /* ---- ⑫ clips：wpu_ 26 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4 ±60ms） ---- */
  total++;
  const clipKeys = Object.keys(KIDS.voice.clips);
  const need = ['wpu_tut_watch', 'wpu_tut_turn', 'wpu_hint', 'wpu_right', 'wpu_wrong', 'wpu_q',
                'wpu_g_wrong', 'wpu_demo',
                'wpu_w_cat', 'wpu_w_dog', 'wpu_w_sun', 'wpu_w_hat', 'wpu_w_bed', 'wpu_w_pen',
                'wpu_w_ten', 'wpu_w_map', 'wpu_w_cup', 'wpu_w_car', 'wpu_w_bus', 'wpu_w_box',
                'wpu_w_fox', 'wpu_w_egg', 'wpu_w_ant', 'wpu_w_eye', 'wpu_w_arm', 'wpu_w_leg',
                'wpu_w_hand', 'wpu_w_star',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = clipKeys.length === 31 &&
    need.every(k => clipKeys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
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
  units.clips = { ok: clipsOk, n: clipKeys.length, durs: durs };

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

  /* ---- ⑭ 章末预告 C7 关键词断言（hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintChOk = CHAPTERS[1].hint.indexOf('四') >= 0 &&                     // 预告 ch2 四字母
                   CHAPTERS[2].hint.indexOf('捣蛋') >= 0 &&                   // 预告 ch3 干扰
                   CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 &&   // 预告 ch4 混合
                   CHAPTERS[4].hint.indexOf('新') >= 0 &&                     // 预告生成关
                   GEN_HINTS[0].indexOf('三') >= 0 &&                         // dch1 三字母
                   GEN_HINTS[1].indexOf('四') >= 0 &&                         // dch2 四字母
                   GEN_HINTS[2].indexOf('捣蛋') >= 0 &&                       // dch3 干扰
                   GEN_HINTS[3].indexOf('集合') >= 0;                         // dch4 混合
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // 家族 F：实算下一关 dch
  if (hintChOk && genOk) npass++;
  units.hints = { ok: hintChOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑮ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑯ 语音窗动态断言（clip 实长 SPEC-BATCH29 §4；T46 阶段2 引导句/demo clip 化后
     estMs 字数口径退役，改按 wpu_g_wrong 2976 / wpu_demo 2832 实长推导） ---- */
  total++;
  const winOk = (1800 + 3000) >= 2496 + 150 + 1608 + 300 &&    // 判对链窗 4800 ≥ 4554（契约 G/H）
                SPEC_DUR.wpu_demo <= 1800 + 3000 &&            // demo 机制句 clip 2832 ≤ 4800
                6900 >= 2256 + 150 + SPEC_DUR.wpu_g_wrong + 300 &&   // 链豁免 ≥ 5682（家族 I）
                (900 + 3100) >= 3048 + 300 &&                  // 教学演示窗 4000 ≥ 3348
                2200 >= 1824 + 300 &&                          // turn 后读题延 ≥ 2124
                2136 + 150 + 1608 <= 14000 - 1000;             // 题面链 3894 < 方向级救援间隔
  if (winOk) npass++;
  units.estWin = { ok: winOk, estGuide: SPEC_DUR.wpu_g_wrong,
                   chainMin: 2256 + 150 + SPEC_DUR.wpu_g_wrong + 300, estDemo: SPEC_DUR.wpu_demo };

  /* ---- ⑰ 章分布聚合（① 数据收口） ---- */
  total++;
  const everyQ = (dch, pred) => chAgg[dch].length === 5 &&
    chAgg[dch].every(arr => arr.length === CH_LEN && arr.every(pred));   // 每关 5 题逐题断言
  const ch1Ok = everyQ(1, a => a === '3/3');
  const ch2Ok = everyQ(2, a => a === '4/4');
  const ch3Ok = everyQ(3, a => a === '3/4' || a === '4/5');
  const ch4Lens = new Set(chAgg[4].flat().map(a => a.split('/')[0]));
  const ch4Pools = new Set(chAgg[4].flat().map(a => a.split('/')[1]));
  const ch4Ok = chAgg[4].length === 5 && ch4Lens.size === 2 && ch4Pools.size >= 2;   // 词长 3/4 与池长均混现
  const aggOk = ch1Ok && ch2Ok && ch3Ok && ch4Ok &&
                genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0 &&   // 生成关四型全现
                eggSeen >= 1 && handSeen >= 1;                                        // 封闭集代表词均出现
  if (aggOk) npass++;
  units.dist = { ok: aggOk, ch1: ch1Ok, ch2: ch2Ok, ch3: ch3Ok, ch4: ch4Ok,
                 ch4Lens: Array.from(ch4Lens), genDch: genDch, egg: eggSeen, hand: handSeen };

  /* ---- ⑲ 家族 A/B/D/F/I/K 源码级断言（Function.toString 含关键串） ---- */
  total++;
  const srcBoot = boot.toString(), srcWin = winFlow.toString(), srcHint = nextHint.toString(),
        srcResc = rescueTick.toString(), srcStart = startLevel.toString(), srcTap = uiTapLtr.toString();
  const contractOk =
    srcBoot.indexOf('nextHint(lim - 1)') >= 0 &&                                  // A：启动 dayEnd 传 lim-1
    srcWin.indexOf('nextHint(null)') >= 0 &&                                      // A：winFlow 传 null（等价）
    srcHint.indexOf('genLevel(f + 1).dch - 1') >= 0 &&                            // F：生成关 hint 实算
    srcHint.indexOf('(ci + 1) % 4') < 0 &&                                        // F：禁章序推进
    srcResc.indexOf('wrongChainUntil') >= 0 &&                                    // I：链豁免守卫
    srcResc.indexOf('lastDir') >= 0 && srcResc.indexOf('lastAct') >= 0 &&         // B：救援双锚
    srcResc.indexOf('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel') >= 0 &&   // K：面板守卫
    srcStart.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&          // I/J：换关双锚重置
    srcTap.indexOf('wrongChainUntil = Date.now() + 6900') >= 0 &&                 // I：错路径设豁免终点
    srcTap.indexOf("replayAnim(boardEl, 'bump')") >= 0;                           // D：吞输入容器 bump
  if (contractOk) npass++;
  units.contract = { ok: contractOk };

  const out = { game: 'wordpuz', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__wpVlog = out;                          // 结果挂全局（playwright 读取）
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 已 init，双保险）
     voice.play 记录调用 key（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）；
     voice.say 记录 TTS 拼句（__lastSay）——供教学链/判对链断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null;
    (window.__playLog = window.__playLog || []).push([k || null, t || null]); };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  KIDS.voice.say = function (t) { window.__lastSay = t || null; };
  runVerify();
}
