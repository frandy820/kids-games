/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/ 章号 1 基+
     静态关难度章循环+生成关 dch∈1-4 / **§0.29 命门：verify 侧独立穷举 6 排列复算恰一解**
     （独立线索判定器 verClueTrue + 独立排列枚举 verPerms，不调引擎 clueTrueEng/PERMS6/solveCheck）/
     线索全真（独立判定器在真值排列下逐条复算）/ 线索文本=语音段文本逐段拼接（VER_TXT 独立
     段表对账，text↔segs 严格同源）/ 问句与属性分配一致（answer=问句属性所在座位独立复算）/
     问句封闭 6 clip / 相邻题排列互异 / 章配方构成（ch1=1正 ch2=1正1负 ch3=相对+绝对+1负
     ch4=帽正+物正+帽负）/ kc 选择独立复算（问句属性相关（承重优先）> 承重 > 位置 > 第一条）/
     引擎直驱
     （全对 0 miss 3★ + 先错后对 1 miss 2★）
   ② tapAnimal 单元（flat0 真实 UI）：错点=晃动+miss+关键线索卡高亮+不推进+不重置救援钟+
     首错不 pulse 正确卡；二错=正确卡 pulse（miss≥2 口径 §0.7）；点对=座位揭幕（?身体→动物）
     +动物卡跳+推进；locked 吞输入=false+nudge+状态不变（§0.22）；非法下标 false
   ③ 教学链（verify 直驱 tutorialWatch）：watch clip → 线索逐条读（queue 段句）→ 排除划暗 →
     __lwDemoR==='right'（§0.27 演示真实生效）→ 重发同关 tut='help' → 交接 queue
     [lgw_tut_turn, 问句 clip]（§0.6 单通道）
   ④ sayW 三态（§0.5）：flat<3 每错必播（两错两播）/ flat≥3 10s 节流（两错一播）
   ⑤ 分布与专项：VOICE 表文案独立字面量对账（manifest 一致）/ lgw_* 30 条 clips 注入 clipOk /
     开场链 queue([lgw_hint, 问句]) / 重听题面=问句 clip / 重听线索=段句 queue /
     数据 key 覆盖（26 条数据 key 全用到）/ ch4 问句帽/物双形态分布
   ⑥ UI 冒烟 A：flat0 真实点击通关（首题一错+全对收尾）→ done+won+1 miss 2★+verify 页不弹层
   ⑦ UI 冒烟 B：flat10（ch3 位置线索）/flat15（ch4 双属性）/flat25（生成关）autoSolve 3★
   ⑧ 布局：双 viewport（1280×800 / 800×1180）×（flat0/10/15）：动物卡 ≥96、全按钮 ≥64
     （.k-parentbtn 豁免）、座位 ≥64、overflowX ≤0
   ⑨ 救援与 §0.7a：错点不重置救援钟；救援=问句重读+正确动物卡 breathe+关键线索卡 pulse 三连
     （§0.21）；重听线索/重听题面=主动学习动作重置
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0 };

  /* ---- verify 侧独立真值源（不调引擎判定/枚举函数，防两套逻辑同错 §0.29） ---- */
  const VER_IDS = ['rabbit', 'cat', 'bear'];
  const VER_HAT_CN = { red: '红', yellow: '黄', blue: '蓝' };
  const VER_ITEM_CN = { ball: '球', book: '书', umbrella: '雨伞' };
  const VER_AN_NAME = { rabbit: '小兔', cat: '小猫', bear: '小熊' };
  /* 拼接段文本独立段表（与 manifest 逐条一致；线索 text 必须等于段文本顺序拼接） */
  const VER_TXT = {
    lgw_c_a: '戴', lgw_c_b: '帽子的是', lgw_c_nb: '帽子的不是', lgw_c_l: '住在',
    lgw_c_left: '左边', lgw_c_ll: '最左边的是', lgw_c_rr: '最右边的是',
    lgw_c_h: '拿', lgw_c_i: '的是',
    lgw_red: '红', lgw_yellow: '黄', lgw_blue: '蓝',
    lgw_ball: '球', lgw_book: '书', lgw_umbrella: '雨伞',
    lgw_n_tu: '小兔', lgw_n_mao: '小猫', lgw_n_xiong: '小熊'
  };
  function verPerms() {                          // 独立 6 排列枚举（递归构造）
    const out = [], used = [false, false, false], cur = [];
    (function rec() {
      if (cur.length === 3) { out.push(cur.slice()); return; }
      for (let k = 0; k < 3; k++) if (!used[k]) { used[k] = true; cur.push(VER_IDS[k]); rec(); cur.pop(); used[k] = false; }
    })();
    return out;
  }
  function verClueTrue(c, perm, hats, items) {   // 独立线索判定器（语义按 SPEC §2 逐型实现）
    if (c.t === 'pos') return perm[hats.indexOf(c.hat)] === c.X;
    if (c.t === 'neg') return perm[hats.indexOf(c.hat)] !== c.W;
    if (c.t === 'rel') return perm.indexOf(c.X) === perm.indexOf(c.Y) - 1;   /* 相邻左=屏幕左 */
    if (c.t === 'abs') return c.edge === 'L' ? perm[0] === c.X : perm[2] === c.X;
    if (c.t === 'ipos') return perm[items.indexOf(c.item)] === c.X;
    return false;
  }
  const verSeatOfAsk = q => q.ask.kind === 'hat' ? q.hats.indexOf(q.ask.value) : (q.items || []).indexOf(q.ask.value);
  function verAnswers(q) {                       // 独立穷举：满足全部线索的排列 → 问句座位动物
    const out = [];
    verPerms().forEach(perm => {
      if (q.clues.every(c => verClueTrue(c, perm, q.hats, q.items)))
        out.push(perm[verSeatOfAsk(q)]);
    });
    return out;
  }
  const ASK_KEYS = ['lgw_q_red', 'lgw_q_yellow', 'lgw_q_blue', 'lgw_q_ball', 'lgw_q_book', 'lgw_q_umbrella'];
  const usedKeys = {};                           // 数据 key 覆盖（⑤ 用）
  let ch4HatAsks = 0, ch4ItemAsks = 0;

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);                     // 确定性
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch) : (L1.dch >= 1 && L1.dch <= 4);
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    let structAll = true, adjOk = true, uniqAll = true, trueAll = true,
        textJoinOk = true, askOk = true, closedOk = true, kcOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q, L1.dch)) structAll = false;                             // 引擎侧结构（次检）
      /* §0.29 独立穷举恰一解 + 线索全真 */
      const ans = verAnswers(q);
      const uniq = ans.length > 0 && ans.every(a => a === ans[0]) && ans[0] === q.animals[q.answer];
      if (!uniq) uniqAll = false;
      if (!q.clues.every(c => verClueTrue(c, q.animals, q.hats, q.items))) trueAll = false;
      /* 文本=语音段文本拼接（text↔segs 同源） */
      if (!q.clues.every(c => c.text === c.segs.map(s => VER_TXT[s] || '').join(''))) textJoinOk = false;
      /* 问句与属性分配一致（独立复算座位）+ 问句文本 + 封闭 clip */
      if (q.answer !== verSeatOfAsk(q)) askOk = false;
      if (q.animals[q.answer] !== verAnswers(q)[0]) askOk = false;
      const expText = q.ask.kind === 'hat'
        ? '戴' + VER_HAT_CN[q.ask.value] + '帽子的是谁呀？'
        : '拿着' + VER_ITEM_CN[q.ask.value] + '的是谁呀？';
      if (q.askText !== expText || q.askKey !== 'lgw_q_' + q.ask.value) askOk = false;
      if (ASK_KEYS.indexOf(q.askKey) < 0) closedOk = false;
      /* kc 选择独立复算（同款优先级：问句属性相关（承重优先）> 承重 > 位置线索 > 第一条） */
      const rel = c => q.ask.kind === 'hat'
        ? ((c.t === 'pos' || c.t === 'neg') && c.hat === q.ask.value)
        : (c.t === 'ipos' && c.item === q.ask.value);
      const breaks = i => {
        const s2 = q.clues.filter((_, j) => j !== i);
        const a2 = verAnswers({ hats: q.hats, items: q.items, clues: s2, ask: q.ask });
        return !(a2.length > 0 && a2.every(x => x === a2[0]) && a2[0] === q.animals[q.answer]);
      };
      let ekc = -1;
      q.clues.forEach((c, i) => { if (ekc < 0 && rel(c) && breaks(i)) ekc = i; });
      if (ekc < 0) ekc = q.clues.findIndex(rel);
      if (ekc < 0) q.clues.forEach((c, i) => { if (ekc < 0 && breaks(i)) ekc = i; });
      if (ekc < 0) ekc = q.clues.findIndex(c => c.t === 'rel' || c.t === 'abs');
      if (ekc < 0) ekc = 0;
      if (q.kc !== ekc || !q.clues[q.kc] || !q.clues[q.kc].keyClue) kcOk = false;
      /* 相邻题排列互异 */
      if (k > 0 && L1.quizzes[k - 1].animals.join() === q.animals.join()) adjOk = false;
      /* 覆盖与 ch4 问句形态计数 */
      usedKeys[q.askKey] = 1;
      q.clues.forEach(c => c.segs.forEach(s => { usedKeys[s] = 1; }));
      if (L1.dch === 4) { if (q.ask.kind === 'hat') ch4HatAsks++; else ch4ItemAsks++; }
    }
    /* 引擎直驱 A：全对 → done 0 miss 3★ */
    const Ld = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const r = engTapAnimal(Ld, q.choices.indexOf(q.animals[q.answer]));
      if ((k === Ld.quizzes.length - 1 ? r !== 'done' : r !== 'right') || !q.solved) driveOk = false;
    }
    const s3 = Ld.done && Ld.misses === 0 && engStars(Ld) === 3;
    /* 引擎直驱 B：首题先错后对 → 1 miss 2★ 通关 */
    const Lw = genLevel(flat);
    const qw = Lw.quizzes[0];
    const wi = qw.choices.findIndex(a => a !== qw.animals[qw.answer]);
    if (engTapAnimal(Lw, wi) !== 'wrong' || Lw.misses !== 1) driveOk = false;
    for (let k = 0; k < Lw.quizzes.length && driveOk; k++) {
      const q = Lw.quizzes[k];
      const r = engTapAnimal(Lw, q.choices.indexOf(q.animals[q.answer]));
      if ((k === Lw.quizzes.length - 1 ? r !== 'done' : r !== 'right') || !q.solved) driveOk = false;
    }
    const s2 = Lw.done && Lw.misses === 1 && engStars(Lw) === 2;
    /* 引擎直驱 C：首题连错 3 次 → 3 miss 1★ 通关（错次口径 0/1-2/更多→3/2/1 三档全实证） */
    const L1s = genLevel(flat);
    const qs = L1s.quizzes[0];
    for (let m = 0; m < 3; m++) engTapAnimal(L1s, qs.choices.findIndex(a => a !== qs.animals[qs.answer]));
    for (let k = 0; k < L1s.quizzes.length; k++) {
      const q = L1s.quizzes[k];
      engTapAnimal(L1s, q.choices.indexOf(q.animals[q.answer]));
    }
    const s1 = L1s.done && L1s.misses === 3 && engStars(L1s) === 1;
    const ok = det && chOk && dchOk && structAll && adjOk && uniqAll && trueAll &&
      textJoinOk && askOk && closedOk && kcOk && driveOk && s3 && s2 && s1 &&
      L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, adjOk: adjOk,
      uniqAll: uniqAll, trueAll: trueAll, textJoin: textJoinOk, askOk: askOk, kcOk: kcOk,
      driveOk: driveOk && s3 && s2 && s1,
      cs: L1.quizzes.map(q => q.clues.map(c => c.text).join(' / ') + ' ⇒ ' + q.askText) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapAnimal 单元（flat0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = LW.quiz;
  const wrongs0 = [0, 1, 2].filter(i => q0.choices[i] !== q0.answerAnimal);
  const right0 = q0.choices.indexOf(q0.answerAnimal);
  const pLog2 = [];
  const op2 = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLog2.push(String(key)); };
  lastAct = Date.now() - 13000;                                    // 回拨救援钟（§0.7a 断言用）
  const rW1 = await LW.tapAnimal(wrongs0[0]);
  const wrongOk = rW1 === 'wrong' && LW.currentLevel.misses === 1 && LW.currentLevel.step === 0 &&
    LW.quiz.miss === 1 &&
    !!cardsEl.querySelector('.card[data-i="' + wrongs0[0] + '"].wig') &&       // 晃动零惩罚可重点
    !!cluesEl.querySelector('.clue[data-i="' + q0.kc + '"].flash') &&          // 关键线索卡高亮一下
    pLog2.indexOf('lgw_wrong') >= 0 &&                                          // sayW 播出
    Date.now() - lastAct > 12800 &&                                             // 错点不重置救援钟
    !cardsEl.querySelector('.card.pulse') && !cardsEl.querySelector('.card.breathe');  // 首错不 pulse（§0.7）
  const rW2 = await LW.tapAnimal(wrongs0[1]);
  const secondOk = rW2 === 'wrong' && LW.currentLevel.misses === 2 &&
    !!cardsEl.querySelector('.card[data-i="' + right0 + '"].pulse');           // miss≥2 才高亮正确卡
  KIDS.voice.play = op2;
  /* 点对：演出窗内断言座位揭幕（?→动物）+动物卡跳，然后推进 */
  const pR = LW.tapAnimal(right0);
  await wait(80);
  const litSeat = benchEl.querySelector('.seat.lit');
  const revealOk = !!litSeat && !!litSeat.querySelector('.s-body svg') &&
    litSeat.querySelector('.s-body svg').getAttribute('viewBox') === '0 0 100 100' &&   // 动物替换 ?（96 体）
    !!cardsEl.querySelector('.card.hop');
  const rR = await pR;
  const rightOk = rR === 'right' && LW.quiz && LW.quiz.step === 1 &&
    LW.currentLevel.misses === 2 && revealOk;
  /* locked 吞输入（§0.22 主答案同规）：false+nudge+状态不变 */
  state.locked = true;
  const missB = LW.currentLevel.misses, stepB = LW.currentLevel.step;
  const rS = await LW.tapAnimal(0);
  const swallowOk = rS === false && LW.currentLevel.misses === missB && LW.currentLevel.step === stepB &&
    !!cardsEl.querySelector('.card.nudge');
  state.locked = false;
  const badIdx = (await LW.tapAnimal(99)) === false && (await LW.tapAnimal(-1)) === false;
  const unitOk = wrongOk && secondOk && rightOk && swallowOk && badIdx;
  if (unitOk) npass++;
  units.taps = { ok: unitOk, wrongOk: wrongOk, secondOk: secondOk, rightOk: rightOk,
    revealOk: revealOk, swallowOk: swallowOk, badIdx: badIdx };

  /* ---- ③ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const qLog3 = [], pLog3 = [];
  const oq3 = KIDS.voice.queue, op3 = KIDS.voice.play;
  KIDS.voice.queue = function (parts) { qLog3.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog3.push(String(key)); };
  startLevel(0);
  await tutorialWatch();
  const lastQ3 = qLog3[qLog3.length - 1];
  const q3 = LW.quiz;
  /* 线索逐条读：queue 里出现过 ch1 正线索的完整 4 段句（演示"读线索"真实发生） */
  const q0clue = genLevel(0).quizzes[0].clues[0];
  const clueRead = q0clue.segs.length === 4 &&
    qLog3.some(p => p.join() === q0clue.segs.join());
  const tutOk = pLog3.indexOf('lgw_tut_watch') >= 0 &&                  /* 看=演示配 watch clip */
    clueRead &&                                                          /* 线索逐条读=4 段句（ch1） */
    window.__lwDemoR === 'right' &&                                     /* §0.27 演示点选真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&             /* 帮：解锁等孩子动手 */
    LW.currentLevel && LW.currentLevel.flat === 0 &&                    /* 重发同关 */
    q3 && q3.step === 0 && q3.miss === 0 &&                             /* 新题面初态 */
    lastQ3 && lastQ3.length === 2 && lastQ3[0] === 'lgw_tut_turn' &&    /* 交接顺序链单通道 */
    lastQ3[1] === q3.askKey &&
    !cardsEl.querySelector('.card.dim');                                /* 重发后无划暗残留 */
  KIDS.voice.queue = oq3; KIDS.voice.play = op3;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog3.indexOf('lgw_tut_watch') >= 0,
    demoR: window.__lwDemoR, clueRead: clueRead, handoff: lastQ3, tut: state.tut };

  /* ---- ④ sayW 三态（§0.5）：flat<3 每错必播 / flat≥3 10s 节流 ---- */
  total++;
  const pLog4 = [];
  const op4 = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLog4.push(String(key)); };
  startLevel(0);
  let qa = LW.quiz;
  let wa = [0, 1, 2].filter(i => qa.choices[i] !== qa.answerAnimal);
  await LW.tapAnimal(wa[0]);
  await LW.tapAnimal(wa[1]);
  const saysFlat0 = pLog4.filter(k => k === 'lgw_wrong').length;        /* 两错两播 */
  startLevel(10);                                                      /* flat≥3 */
  lastWrongVoice = 0;                                                  /* 节流表清零（模块变量直写） */
  qa = LW.quiz;
  wa = [0, 1, 2].filter(i => qa.choices[i] !== qa.answerAnimal);
  await LW.tapAnimal(wa[0]);
  await LW.tapAnimal(wa[1]);                                           /* 10s 内第二错=miss2 豁免恰一次 → 仍播 */
  const saysFlat10 = pLog4.filter(k => k === 'lgw_wrong').length - saysFlat0;   /* 两错两播（首发+豁免，§0.5） */
  KIDS.voice.play = op4;
  const sayWOk = saysFlat0 === 2 && saysFlat10 === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0: saysFlat0, flat10: saysFlat10 };

  /* ---- ⑤ 分布与专项：文案对账 / clip 注入 / 开场链 / 重听通道 / key 覆盖 / ch4 形态 ---- */
  total++;
  const refVoice = VOICE.watch.text === '看！小线索有大秘密' &&
    VOICE.turn.text === '你来想一想' && VOICE.hint.text === '听一听线索想一想' &&
    VOICE.wrong.text === '再听一听线索';
  const LGW_KEYS = ['lgw_tut_watch', 'lgw_tut_turn', 'lgw_hint', 'lgw_wrong',
    'lgw_q_red', 'lgw_q_yellow', 'lgw_q_blue', 'lgw_q_ball', 'lgw_q_book', 'lgw_q_umbrella',
    'lgw_c_a', 'lgw_c_b', 'lgw_c_nb', 'lgw_c_l', 'lgw_c_left', 'lgw_c_ll', 'lgw_c_rr',
    'lgw_c_h', 'lgw_c_i', 'lgw_red', 'lgw_yellow', 'lgw_blue',
    'lgw_ball', 'lgw_book', 'lgw_umbrella', 'lgw_n_tu', 'lgw_n_mao', 'lgw_n_xiong'];
  const clipOk = LGW_KEYS.every(k => !!KIDS.voice.clips[k]) &&
    Object.keys(KIDS.voice.clips).every(k => k.indexOf('lgw_') !== 0 || LGW_KEYS.indexOf(k) >= 0);
  const qLog5 = [], pLog5 = [];
  const oq5 = KIDS.voice.queue, op5 = KIDS.voice.play;
  KIDS.voice.queue = function (parts) { qLog5.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog5.push(String(key)); };
  startLevel(0);                                    /* verify 页恒走开场链 */
  const q0v = genLevel(0).quizzes[0];
  const lastQ5 = qLog5[qLog5.length - 1];
  const openChain = !!lastQ5 && lastQ5.length === 2 && lastQ5[0] === 'lgw_hint' &&
    lastQ5[1] === q0v.askKey;                       /* 开场顺序链：hint → 问句（单通道） */
  replayAsk(true);                                  /* 重听题面=问句 clip */
  const askReplay = pLog5[pLog5.length - 1] === q0v.askKey;
  clueTap(0);                                       /* 重听线索=段句 queue */
  const clueChain = qLog5.length >= 2 &&
    qLog5[qLog5.length - 1].join() === q0v.clues[0].segs.join();
  KIDS.voice.queue = oq5; KIDS.voice.play = op5;
  const DATA_KEYS = LGW_KEYS.filter(k => ['lgw_tut_watch', 'lgw_tut_turn', 'lgw_hint', 'lgw_wrong'].indexOf(k) < 0);
  const coverOk = DATA_KEYS.every(k => usedKeys[k]);            /* 26 条数据 key 全用到 */
  const closedAll = Object.keys(usedKeys).filter(k => k.indexOf('lgw_q_') === 0)
    .every(k => ASK_KEYS.indexOf(k) >= 0);                      /* 问句封闭 6 clip */
  const ch4MixOk = ch4HatAsks >= 5 && ch4ItemAsks >= 5;         /* ch4 问句帽/物双形态分布 */
  const distOk = refVoice && clipOk && openChain && askReplay && clueChain &&
    coverOk && closedAll && ch4MixOk;
  if (distOk) npass++;
  units.dist = { ok: distOk, refVoice: refVoice, clips: clipOk, openChain: openChain,
    askReplay: askReplay, clueChain: clueChain, cover: coverOk, closedAll: closedAll,
    ch4Asks: { hat: ch4HatAsks, item: ch4ItemAsks } };

  /* ---- ⑥ UI 冒烟 A：flat0 真实点击通关（首题一错+全对收尾 → 1 miss 2★） ---- */
  total++;
  startLevel(0);
  let smA = true, quizzesA = 0, lastR = null;
  for (let s = 0; s < CH_LEN; s++) {
    const q = LW.quiz;
    if (!q) { smA = false; break; }
    if (s === 0) {
      const wi = [0, 1, 2].find(i => q.choices[i] !== q.answerAnimal);
      if (await LW.tapAnimal(wi) !== 'wrong') { smA = false; break; }
    }
    lastR = await LW.tapAnimal(q.choices.indexOf(q.answerAnimal));
    if (lastR !== 'right' && lastR !== 'done') { smA = false; break; }
    quizzesA++;
  }
  const lvA = LW.currentLevel;
  const smokeOkA = smA && quizzesA === CH_LEN && lvA.done && lvA.won && lastR === 'done' &&
    lvA.misses === 1 && engStars(cur) === 2 &&
    !document.querySelector('.k-celebrate');       /* verify 页不弹层（§0.2） */
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, quizzes: quizzesA, misses: lvA.misses, stars: engStars(cur) };

  /* ---- ⑦ UI 冒烟 B：flat10（ch3）/flat15（ch4）/flat25（生成关）autoSolve 3★ ---- */
  total++;
  const chapOut = {};
  let smB = true;
  for (const f of [10, 15, 25]) {
    startLevel(f);
    const qf = LW.quiz;
    const lvf = LW.currentLevel;
    let domOk = !!qf && (f < STATIC_LEVELS ? lvf.dch === diffOfCh(Math.floor(f / CH_LEN) + 1)
      : (lvf.dch >= 1 && lvf.dch <= 4));                         /* 生成关难度随机（§0.3 b15 审查 M1）→ 范围断言 */
    if (f === 10) domOk = domOk && qf.clues.filter(c => c.t === 'rel').length === 1 &&
      qf.clues.filter(c => c.t === 'abs').length === 1;          /* ch3=位置线索在场 */
    if (f === 15) domOk = domOk && !!qf.items &&
      qf.clues.some(c => c.t === 'ipos');                        /* ch4=双属性在场 */
    const a = await LW.autoSolve();
    const lv2 = LW.currentLevel;
    const solveOk = a.done && lv2.done && lv2.won && lv2.misses === 0 && engStars(cur) === 3;
    chapOut[f] = { ok: domOk && solveOk, dch: lvf.dch, taps: a.taps };
    if (!domOk || !solveOk) smB = false;
  }
  if (smB) npass++;
  smokes.chapters = { ok: smB, flats: chapOut };

  /* ---- ⑧ 布局：双 viewport ×（flat0/10/15）量测 ---- */
  function simView(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    const cards = Array.prototype.map.call(cardsEl.querySelectorAll('.card'), b => b.getBoundingClientRect());
    const clues = Array.prototype.map.call(cluesEl.querySelectorAll('.clue'), b => b.getBoundingClientRect());
    const seats = Array.prototype.map.call(benchEl.querySelectorAll('.seat'), b => b.getBoundingClientRect());
    const cardOk = cards.length === 3 && cards.every(r => r.width >= 96 && r.height >= 96);   /* 主答案 ≥96（§0.9） */
    const clueOk = clues.length >= 1 && clues.every(r => r.width >= 64 && r.height >= 64);
    const seatOk = seats.length === 3 && seats.every(r => r.width >= 64 && r.height >= 64);
    let btnOk = true;                              /* 全部按钮 ≥64（.k-parentbtn 家长按钮豁免） */
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, cardOk: cardOk, clueOk: clueOk, seatOk: seatOk,
      btnOk: btnOk, ox: ox, pass: cardOk && clueOk && seatOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 10, 15]) {
    sims.push(simView(1280, 800, f));
    sims.push(simView(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                   /* 还原真实 viewport 布局 */
  const layoutOk = sims.length === 6 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑨ 救援与 §0.7a：错点不重置；救援三件（问句重读+正确卡 breathe+关键线索 pulse3）；
     重听线索/题面=主动学习动作重置 ---- */
  total++;
  const pLog9 = [];
  const op9 = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLog9.push(String(key)); };
  startLevel(0);
  const q9 = LW.quiz;
  lastAct = Date.now() - 13000;
  const wi9 = [0, 1, 2].find(i => q9.choices[i] !== q9.answerAnimal);
  await LW.tapAnimal(wi9);
  const noReset = Date.now() - lastAct > 12800;                     /* 错点不重置救援钟 */
  rescueAct(cur.quizzes[cur.step]);                                 /* 行为本体直驱（interval 由无头自测覆盖） */
  const ri9 = cur.quizzes[0].choices.indexOf(cur.quizzes[0].animals[cur.quizzes[0].answer]);
  const firedOk = LW.rescues === 1 && pLog9.indexOf(q9.askKey) >= 0 &&                     /* 问句重读 */
    !!cardsEl.querySelector('.card[data-i="' + ri9 + '"].breathe') &&                     /* 正确卡 breathe */
    !!cluesEl.querySelector('.clue[data-i="' + q9.kc + '"].pulse3');                      /* 关键线索 pulse 三连 */
  clueTap(0);
  const clueReset = Date.now() - lastAct < 600;                     /* 重听线索=主动学习重置 */
  lastAct = Date.now() - 13000;
  replayAsk(true);
  const hearReset = Date.now() - lastAct < 600;                     /* 重听题面=主动学习重置 */
  KIDS.voice.play = op9;
  const rescueOk9 = noReset && firedOk && clueReset && hearReset;
  if (rescueOk9) npass++;
  units.rescue = { ok: rescueOk9, expNoReset: noReset, fired: firedOk,
    clueReset: clueReset, hearReset: hearReset };

  const out = { game: 'logicwho', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes, genDch: genDch };
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
  KIDS.voice.say = function () {};
  runVerify();
}
