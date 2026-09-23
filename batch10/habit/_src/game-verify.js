/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   r5 断言族（SPEC-BATCH10 §3-r5；SPEC 语义独立重列，禁引用引擎常量互证）：
   ① 静态 20 + 生成 20 关全量审计（flat 0-39，每关一记）：确定性 / structWhy（步骤 6-8、
     shown 全排列≠恒等、cards=n+decoys≤9、干扰公平构造）/ 章型规则（ch1 熟知池 4 流程各 ≥1
     +干扰 0 / ch2 因果池 3 流程各 ≥1+干扰 0 / ch3 辨析池 3 流程各 ≥1+每题干扰 ===2
     / ch4 与生成关 5 流程互异+≥2 条 7-8 步长序列+每题干扰 0-2）/ 引擎直驱（连错 2→
     干扰卡点='wrong'→排对 'step'→已排位 'again'→全对通关；错次含干扰点时 1 星）
   ② tapCard 单元（flat0 真实 UI）：卡 data-sid 与引擎 cards 对账（含干扰卡来源 id）/
     首错晃动不灰掉+miss 计数+首错不 pulse / 同卡二错 miss=2+应点卡 breathe / 非法下标 false /
     答对一步 .gone+pos 推进+locked 窗拦截+槽 lit / 点已排位 'again' / 排完 'goal'
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ②c 方向锚反馈单元（flat10 ch3 真实 UI）：相邻交换→顺序锚 / pos0 点干扰卡→起点锚 /
     pos>0 错→依赖锚；实测播句 ∈ SPEC_FEEDBACK 且不含当前序列任何步骤名（负向）；
     SPEC 级负向：三锚句 × SPEC 12 序列步骤词+流程名 零包含
   ③ UI 冒烟 A：flat0 真实通路通关（首题错一次=2 星，verify 页不弹层）
   ④ UI 冒烟 B1：flat10（ch3 辨析池）三流程各 ≥1+每题干扰 2+autoSolve 3 星+题面 chip 对账；
     B2：flat17（ch4 混出）5 流程互异+≥2 条长序列+真实 tapCard 通关
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（6 卡题 / 9 卡满载题）：
     卡数=cards.length、卡=主答案 ≥96、槽=步骤数且 ≥64、词不溢出卡、卡两两 bbox 不相交、
     卡不溢出卡区/舞台、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0
   ⑥ 分布与专项：SPEC 12 序列表独立字面量对账（词|emoji 逐字、步数 6-8 精确）/
     q_* clip 文本=流程名（15 条）/ estMs 家族（n*345+600 定版，禁 +300 变体）/
     40 关 hid 分布 12 流程各 ≥1 / 19 条 hb_*+3 条 core_* clips 注入 clipOk + SPEC_DUR
     实长 ±60ms（Promise.all+8000ms 超时）/ 开场顺序链与救援拼句 queue stub
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const hidDist = {};
  HABIT_IDS.forEach(h => { hidDist[h] = 0; });

  /* ---- SPEC §3-r5 独立重列（零手抄对账源；禁引用引擎常量互证） ---- */
  const SPEC_POOLS = {                                     // 章型流程池（SPEC r5 章结构）
    1: ['xishou', 'qichuang', 'shuaya', 'chuanyi'],
    2: ['baojiaozi', 'zhonghua', 'jixin'],
    3: ['xizao', 'xiyi', 'kaodangao']
  };
  const SPEC_REF = {                                      // 12 序列步骤表（词|emoji 逐字+步数精确）
    xishou:   ['卷袖子|🧣', '冲湿手|🚿', '搓泡泡|🧼', '冲干净|💧', '关水|🚰', '擦干|🧺'],
    qichuang: ['坐起来|🥱', '穿衣服|👕', '穿鞋袜|🧦', '刷刷牙|🪥', '洗洗脸|💦', '吃早餐|🥣'],
    shuaya:   ['拿牙刷|🪥', '挤牙膏|🧴', '刷一刷|🦷', '漱漱口|💦', '涮杯子|🚿', '放回去|🔄'],
    chuanyi:  ['挑衣服|👕', '分前后|🔍', '穿袖子|🙌', '拉下摆|👇', '拉拉链|🧥', '照镜子|✨'],
    guomal:   ['停一停|🛑', '等绿灯|🚦', '左右看|👀', '牵好手|🤝', '走过去|🚶', '到路边|🎉'],
    shuijiao: ['收玩具|🧸', '洗洗澡|🛁', '刷刷牙|🪥', '穿睡衣|🩳', '听故事|📖', '盖被子|😴'],
    baojiaozi: ['洗青菜|🥬', '剁肉馅|🔪', '和面团|🫓', '擀饺皮|⚪', '包饺子|🥟', '煮饺子|🍲', '盛碗里|🥣', '吃饺子|😋'],
    zhonghua:  ['拿花盆|🪴', '装满土|🪣', '挖小坑|🕳', '放种子|🌱', '盖上土|⛰', '浇浇水|💧', '晒太阳|☀️', '发芽啦|🌿'],
    jixin:     ['找纸笔|✏️', '想内容|🤔', '写信|📝', '折起来|📄', '装信封|✉️', '贴邮票|🏷', '投邮箱|📮'],
    kaodangao: ['备材料|🥣', '打鸡蛋|🥚', '加面粉|🌾', '搅面糊|🥄', '倒模具|🧁', '进烤箱|🔥', '装盘|🍰'],
    xizao:     ['脱衣服|👕', '调水温|🚿', '洗头发|🫧', '洗身体|🧼', '擦干身|🧺', '穿睡衣|🩳'],
    xiyi:      ['收衣服|🧺', '翻口袋|🔍', '放进去|🌀', '放洗衣液|🧴', '开机器|▶️', '晾衣服|🎽', '叠放好|📦']
  };
  const SPEC_FEEDBACK = {                                 // r5 方向锚反馈句（delta③ 定句，独立双录）
    start: '再想一想，一开始先做什么？',
    mid:   '这一步要用到上一步的结果吗？',
    adj:   '再想想这两步，谁得等谁？'
  };
  const SPEC_DECOY = { 1: 0, 2: 0, 3: 2, full: [0, 2] };  // 干扰数规则（ch4/生成关=seeded 0-2）
  const SPEC_MAX_CARDS = 9;                               // 卡区总卡上限（布局换行临界）

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let structAll = true, ruleOk = true, driveOk = true;
    const cnt = {};
    L1.quizzes.forEach(q => { cnt[q.hid] = (cnt[q.hid] || 0) + 1; hidDist[q.hid]++; });
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const full = L1.dch === 4 || flat >= STATIC_LEVELS;
    if (!full) {                                          // 章 1-3：SPEC 池内+各 ≥1+干扰恒定
      const pool = SPEC_POOLS[L1.dch];
      const wantD = SPEC_DECOY[L1.dch];
      if (!L1.quizzes.every(q => pool.indexOf(q.hid) >= 0) ||
          !pool.every(h => cnt[h] >= 1) ||
          !L1.quizzes.every(q => q.decoys.length === wantD)) ruleOk = false;
    } else {                                              // ch4/生成关：互异+≥2 长序列+干扰 0-2
      const uniq = Object.keys(cnt);
      const longs = L1.quizzes.filter(q => SPEC_REF[q.hid].length >= 7).length;
      if (uniq.length !== CH_LEN ||
          !uniq.every(h => SPEC_REF[h] != null) || longs < 2 ||
          !L1.quizzes.every(q => q.decoys.length >= SPEC_DECOY.full[0] &&
                                 q.decoys.length <= SPEC_DECOY.full[1] &&
                                 q.cards.length <= SPEC_MAX_CARDS)) ruleOk = false;
    }
    for (let k = 0; k < L1.quizzes.length; k++) {
      if (structWhy(L1.quizzes[k])) structAll = false;
    }
    /* 引擎直驱：连错 2（可重点）→ 干扰卡点='wrong'（在样本内真实可达：ch3/ch4/生成关）→
       排对一步 → 点已排位 'again' → 全对通关（错次 2+干扰点数 → 星级 1 或 2） */
    const Ld = genLevel(flat);
    const q0 = Ld.quizzes[0];
    const n0 = q0.cards.length;
    const wi = (q0.answerIdx + 1) % n0;
    let expRetries = 2;
    if (engTap(Ld, wi) !== 'wrong' || Ld.retries !== 1 || q0.miss !== 1) driveOk = false;
    if (engTap(Ld, wi) !== 'wrong' || Ld.retries !== 2 || q0.miss !== 2) driveOk = false;
    const di = q0.cards.findIndex(c => c.d !== undefined);
    if (di >= 0) {                                        // 干扰卡：点它=错（辨析训练，r5 delta④）
      if (engTap(Ld, di) !== 'wrong' || Ld.retries !== 3 || q0.miss !== 3) driveOk = false;
      expRetries = 3;
    }
    if (engTap(Ld, q0.answerIdx) !== 'step') driveOk = false;
    if (engTap(Ld, q0.cards.findIndex(c => c.s === 0)) !== 'again') driveOk = false;   // 已排步骤零惩罚
    let last = null, guard = 0;
    while (!Ld.done && guard++ < 60) {
      last = engTap(Ld, Ld.quizzes[Ld.step].answerIdx);
      if (last === null || last === 'wrong' || last === 'again') { driveOk = false; break; }
    }
    if (!Ld.done || Ld.step !== CH_LEN || last !== 'done' || Ld.retries !== expRetries ||
        engStars(Ld) !== (expRetries <= 2 ? 2 : 1)) driveOk = false;
    const L3 = genLevel(flat);
    guard = 0;
    while (!L3.done && guard++ < 60) engTap(L3, L3.quizzes[L3.step].answerIdx);
    if (!L3.done || engStars(L3) !== 3) driveOk = false;
    const ok = det && structAll && ruleOk && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll,
      ruleOk: ruleOk, driveOk: driveOk,
      qs: L1.quizzes.map(q => q.hid + ':' + q.cards.map(c => c.d !== undefined ? 'd' : c.s).join('')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCard 单元（flat 0 真实 UI 状态机；ch1 6 卡 0 干扰） ---- */
  total++;
  startLevel(0);
  const q0 = HB.quiz;
  const n0 = q0.cards.length;
  const cards0 = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
  const slots0 = Array.prototype.slice.call(stripEl.querySelectorAll('.slot'));
  /* DOM 对账：n0 张卡 data-i 0..n-1、data-sid 与引擎 cards 对账（真实步+干扰卡来源 id）、
     槽=步骤数（干扰卡不占槽） */
  const sidOf = q => q.cards.map(c => c.d !== undefined
    ? HABITS[q.decoys[c.d].h].steps[q.decoys[c.d].s].id : q.steps[c.s]);
  const alignOk = q0 && cards0.length === n0 && slots0.length === q0.steps.length &&
    cards0.every((c, i) => Number(c.dataset.i) === i && c.dataset.sid === sidOf(q0)[i]);
  const wi2 = (q0.answerIdx + 1) % n0;
  const rW = await HB.tapCard(wi2);              // 首错：晃动不灰掉+miss 计数+首错不 pulse
  const wEl = cardEl(wi2), okEl = cardEl(q0.answerIdx);
  const wrongOk = rW === 'wrong' && HB.quiz.miss === 1 && HB.currentLevel.retries === 1 &&
    HB.quiz.step === 0 && HB.quiz.pos === 0 && wEl.classList.contains('wig') &&
    !wEl.classList.contains('dim') &&
    getComputedStyle(wEl).pointerEvents !== 'none' &&      /* 不灰掉：每张卡都可能是下一步（SPEC §3） */
    !okEl.classList.contains('breathe');                   /* 首错不 pulse */
  const rW2 = await HB.tapCard(wi2);             // 同卡二错：可重点+miss=2 → 应点卡 breathe
  const wrong2Ok = rW2 === 'wrong' && HB.quiz.miss === 2 && HB.currentLevel.retries === 2 &&
    HB.quiz.step === 0 && HB.quiz.pos === 0 && okEl.classList.contains('breathe');
  const badIdx = (await HB.tapCard(n0)) === false && (await HB.tapCard(-1)) === false &&
    (await HB.tapCard('x')) === false && (await HB.tapCard(1.5)) === false;
  /* 答对一步：演出窗内同步读源卡 .gone + pos 推进；locked 窗内 hook 拦截 */
  const pOk = HB.tapCard(q0.answerIdx);
  const goneOk = cardEl(q0.answerIdx).classList.contains('gone') &&
    HB.quiz.pos === 1 && HB.currentLevel.step === 0;
  const lockedRet = await HB.tapCard(q0.answerIdx);        // 飞入演出窗内：locked 门拦 hook
  const rStep = await pOk;                                 // 'step'（飞入 transition 已结束）
  const slotLit = slotEl(0) && slotEl(0).classList.contains('lit') &&
    slotEl(0).querySelector('.s-emoji') !== null;          // 槽亮起+emoji 填充
  const rAgain = await HB.tapCard(q0.answerIdx);           // 点已排位（旧应点位）：'again' 零惩罚
  const againOk = rAgain === 'again' && HB.quiz.miss === 2 && HB.quiz.pos === 1;
  let lastTap = null, g2 = 0;                              // 排完本题剩余步 → 主路径 'goal'
  while (HB.quiz && HB.quiz.step === 0 && g2++ < 12) lastTap = await HB.tapCard(HB.quiz.answerIdx);
  const goalOk = lastTap === 'goal' && HB.quiz && HB.quiz.step === 1 && HB.quiz.pos === 0 &&
    HB.currentLevel.retries === 2;                         // 题完成不追加错次
  const tapOk = alignOk && wrongOk && wrong2Ok && badIdx && rStep === 'step' && goneOk &&
    lockedRet === false && slotLit && againOk && goalOk;
  if (tapOk) npass++;
  units.tapCard = { ok: tapOk, align: alignOk, wrong: wrongOk, wrong2: wrong2Ok,
    badIdx: badIdx, step: rStep === 'step' && goneOk && slotLit, lockedGuard: lockedRet === false,
    again: againOk, goal: goalOk };

  /* ---- ②b sayW 三态（页面级：flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次 ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  const FB_ALL = [SPEC_FEEDBACK.start, SPEC_FEEDBACK.mid, SPEC_FEEDBACK.adj];
  /* T46 阶段2：纠错锚 clip 化——play 首参从 key:null 变 hb_w_* 键族（文本族 SPEC_FEEDBACK 不变） */
  const FB_KEYS = ['hb_w_start', 'hb_w_mid', 'hb_w_adj'];
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text)]); };
  const wrongPlays = () => wLog.filter(p => FB_KEYS.indexOf(p[0]) >= 0 && FB_ALL.indexOf(p[1]) >= 0).length;
  const wrongIdx = () => (HB.quiz.answerIdx + 1) % HB.quiz.cards.length;
  startLevel(0);                                   // flat0：每错必播
  await HB.tapCard(wrongIdx());
  await HB.tapCard(wrongIdx());
  const sayA = wrongPlays();                       // → 2
  startLevel(3);                                   // flat3：10s 节流
  lastWrongVoice = Date.now();                     /* flat0 分支不写时间戳，显式进入窗口内 */
  await HB.tapCard(wrongIdx());                    // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                   // 增量 → 0
  startLevel(3);                                   // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                              /* 隔离上一子用例时间戳（force 子用例从新窗口起算） */
  await HB.tapCard(wrongIdx());                    // miss=1 → 播
  await HB.tapCard(wrongIdx());                    // miss=2 → force === 2 → 播
  const sayC = wrongPlays() - 2 - sayB;            // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ②c 方向锚反馈单元（flat10=ch3 辨析池首题 9 卡 2 干扰，真实 UI）
     flat10≥3 走 sayW 10s 节流——每次错点前重置节流窗（本单元测方向选择，不测节流） ---- */
  total++;
  const fLog = [];
  KIDS.voice.play = function (key, text) { fLog.push(String(text)); };
  startLevel(10);
  const qc = HB.quiz;                                     // ch3 首题（确定性：干扰 2 在场）
  const stepWords = SPEC_REF[qc.hid].map(p => p.split('|')[0]);
  const adjIdx = qc.cards.findIndex(c => c.s === 1);      // 相邻交换样本：下一步卡（n≥6 恒在）
  const decIdx = qc.cards.findIndex(c => c.d !== undefined); // 干扰卡（ch3 ===2 恒在）
  let fbOk = qc.decoys.length === 2 && adjIdx >= 0 && decIdx >= 0;
  lastWrongVoice = 0;
  const rAdj = await HB.tapCard(adjIdx);                  // pos=0 点下一步 → 顺序锚
  fbOk = fbOk && rAdj === 'wrong' && fLog[fLog.length - 1] === SPEC_FEEDBACK.adj;
  lastWrongVoice = 0;
  const rDec = await HB.tapCard(decIdx);                  // pos=0 点干扰卡 → 起点锚（不揭示干扰身份）
  fbOk = fbOk && rDec === 'wrong' && fLog[fLog.length - 1] === SPEC_FEEDBACK.start;
  const rSt = await HB.tapCard(HB.quiz.answerIdx);        // 排对第一步 → pos=1
  const farIdx = HB.quiz.cards.findIndex(c => c.d !== undefined || c.s >= 3);  // 中间错样本
  lastWrongVoice = 0;
  const rFar = await HB.tapCard(farIdx);                  // pos=1 点远步/干扰 → 依赖锚
  fbOk = fbOk && rSt === 'step' && rFar === 'wrong' &&
    fLog[fLog.length - 1] === SPEC_FEEDBACK.mid;
  /* 负向断言：实测播句不含当前序列任何步骤名（r2/r4 纪律：反馈禁泄步骤名） */
  const played = fLog.filter(t => FB_ALL.indexOf(t) >= 0);
  const noLeakRuntime = played.every(t => stepWords.every(w => t.indexOf(w) < 0));
  /* SPEC 级负向：三锚句 × 全部 12 序列步骤词+流程名 零包含（独立于引擎实现） */
  let noLeakSpec = true;
  const names = { xishou: '洗手', qichuang: '起床', shuaya: '刷牙', chuanyi: '穿衣', guomal: '过马路',
    shuijiao: '睡觉', baojiaozi: '包饺子', zhonghua: '种花', jixin: '寄信', kaodangao: '烤蛋糕',
    xizao: '洗澡', xiyi: '洗衣服' };
  Object.keys(SPEC_REF).forEach(h => {
    const words = SPEC_REF[h].map(p => p.split('|')[0]);
    FB_ALL.forEach(t => {
      if (words.some(w => t.indexOf(w) >= 0) || t.indexOf(names[h]) >= 0) noLeakSpec = false;
    });
  });
  KIDS.voice.play = origPlay2;
  const fbUnitOk = fbOk && noLeakRuntime && noLeakSpec && played.length >= 3;
  if (fbUnitOk) npass++;
  units.feedback = { ok: fbUnitOk, dirOk: fbOk, noLeakRuntime: noLeakRuntime,
    noLeakSpec: noLeakSpec, played: played };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = HB.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                               // 首错：零惩罚；首错不 pulse 应点卡
      await HB.tapCard((q.answerIdx + 1) % q.cards.length);
      wrongOk2 = HB.currentLevel.retries === 1 && HB.currentLevel.step === 0 &&
        !cardEl(HB.quiz.answerIdx).classList.contains('breathe');
    }
    let g3 = 0, lastT = null;
    while (HB.quiz && HB.quiz.step === s && g3++ < 12) lastT = await HB.tapCard(HB.quiz.answerIdx);
    if (lastT !== 'goal' && lastT !== 'done') smokeA = false;
    quizzesA++;
  }
  const lvA = HB.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, quizzes: quizzesA,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat10（ch3 辨析池）三流程各 ≥1+每题干扰 2+autoSolve 3 星+题面 chip ---- */
  total++;
  startLevel(10);
  const L10 = genLevel(10);
  const c10 = {};
  SPEC_POOLS[3].forEach(h => { c10[h] = 0; });
  L10.quizzes.forEach(q => { c10[q.hid]++; });
  const chipName = chipEl.querySelector('.p-name');       // 题面行流程名大字=当前题流程名
  const chipOk = chipName && chipName.textContent === L10.quizzes[0].name &&
    chipEl.querySelector('.p-ask') !== null;
  const decoyOk10 = L10.quizzes.every(q => q.decoys.length === SPEC_DECOY[3] &&
    q.cards.length <= SPEC_MAX_CARDS);
  const a10 = await HB.autoSolve();
  const lv10 = HB.currentLevel;
  const smokeOkB1 = SPEC_POOLS[3].every(h => c10[h] >= 1) && decoyOk10 && chipOk &&
    a10.done && lv10.done && lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat10 = { ok: smokeOkB1, dist: c10, decoys: decoyOk10, chip: chipOk,
    taps: a10.taps, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat17（ch4 混出）5 流程互异+≥2 长序列+真实点击通关 ---- */
  total++;
  startLevel(17);
  const L17 = genLevel(17);
  const uniq17 = {};
  L17.quizzes.forEach(q => { uniq17[q.hid] = 1; });
  const kindsOk = Object.keys(uniq17).length === CH_LEN &&                // 5 流程互异
    Object.keys(uniq17).every(h => SPEC_REF[h] != null) &&
    L17.quizzes.filter(q => SPEC_REF[q.hid].length >= 7).length >= 2 &&   // ≥2 条 7-8 步长序列
    L17.quizzes.every(q => q.decoys.length >= 0 && q.decoys.length <= 2);
  let mixTapOk = true, quizzesB = 0;
  for (let s = 0; s < CH_LEN && mixTapOk; s++) {
    const q = HB.quiz;
    if (!q) { mixTapOk = false; break; }
    let g4 = 0, lastT = null;
    while (HB.quiz && HB.quiz.step === s && g4++ < 12) lastT = await HB.tapCard(HB.quiz.answerIdx);
    if (lastT !== 'goal' && lastT !== 'done') mixTapOk = false;
    quizzesB++;
  }
  const lv17 = HB.currentLevel;
  const smokeOkB2 = kindsOk && mixTapOk && quizzesB === CH_LEN && lv17.done && lv17.won &&
    lv17.retries === 0;
  if (smokeOkB2) npass++;
  smokes.flat17 = { ok: smokeOkB2, kinds: kindsOk, taps: quizzesB,
    hids: L17.quizzes.map(q => q.hid), retries: lv17.retries };

  /* ---- ⑤ 布局：双 viewport 模拟 ×（6 卡题 / 9 卡满载题） ---- */
  const rectsOverlap = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 &&
    a.top < b.bottom - 1 && b.top < a.bottom - 1;
  async function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                                 // 按新场地尺寸重排
    await wait(1050);                             /* 等入场 stagger（9 卡 8×70=560ms）+pop 动画结束再量 */
    const de = document.documentElement;
    const q = HB.quiz;
    const n = q.cards.length;
    const cards = Array.prototype.slice.call(boardEl.querySelectorAll('.card'));
    let countOk = cards.length === n;             // n 卡 + data-sid 与引擎对账
    const wantSid = sidOf(q);
    cards.forEach((c, i) => {
      if (Number(c.dataset.i) !== i || c.dataset.sid !== wantSid[i]) countOk = false;
    });
    const rects = cards.map(c => c.getBoundingClientRect());
    const cardOk = rects.length === n &&
      rects.every(r => r.width >= 96 && r.height >= 96);          /* 主答案按钮 ≥96（§0.9） */
    const slotRects = Array.prototype.slice.call(stripEl.querySelectorAll('.slot'))
      .map(s => s.getBoundingClientRect());
    const slotOk = slotRects.length === q.steps.length &&
      slotRects.every(r => r.width >= 64 && r.height >= 64);      /* 顺序条槽 ≥64 专项 */
    const wordOk = cards.every(c =>                             /* 步骤短词不溢出卡（nowrap 断行病害 §0.15） */
      c.querySelector('.c-word') &&
      c.querySelector('.c-word').scrollWidth <= c.clientWidth + 2);
    let sepOk = true;                             /* 换行临界：卡两两 bbox 实测不相交（r3 m3） */
    for (let i = 0; i < rects.length && sepOk; i++)
      for (let j = i + 1; j < rects.length && sepOk; j++)
        if (rectsOverlap(rects[i], rects[j])) sepOk = false;
    let btnOk = true;                             // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const bRect = boardEl.getBoundingClientRect();
    const sRect = stageEl.getBoundingClientRect();
    const insideOk = rects.every(r =>             // 卡在卡区内且不溢出舞台（overflow:hidden 不裁卡）
      r.left >= bRect.left - 1 && r.right <= bRect.right + 1 &&
      r.top >= bRect.top - 1 && r.bottom <= bRect.bottom + 1 &&
      r.top >= sRect.top - 1 && r.bottom <= sRect.bottom + 1);
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, hid: q.hid, n: n, countOk: countOk, card96: cardOk,
      slot64: slotOk, wordOk: wordOk, sepOk: sepOk, btn64: btnOk, insideOk: insideOk, ox: ox,
      pass: countOk && cardOk && slotOk && wordOk && sepOk && btnOk && insideOk && ox <= 0 };
  }
  total++;
  const sims = [];
  /* 6 卡题（ch1 首题）与 9 卡满载题（ch3 首题 7 步+2 干扰）各一关（确定性扫描首题卡数） */
  let flat6 = -1, flat9 = -1;
  for (let f = 0; f < 30 && (flat6 < 0 || flat9 < 0); f++) {
    const qq = genLevel(f).quizzes[0];
    if (qq.cards.length === 6 && flat6 < 0) flat6 = f;
    if (qq.cards.length === 9 && flat9 < 0) flat9 = f;
  }
  const layoutFound = flat6 >= 0 && flat9 >= 0;
  if (layoutFound) {
    startLevel(flat6);
    sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
    startLevel(flat9);
    sims.push(await simView(1280, 800)); sims.push(await simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                  // 还原真实 viewport 布局
  const layoutOk = layoutFound && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, found: layoutFound, flat6: flat6, flat9: flat9, sims: sims };

  /* ---- ⑥ 分布与专项：12 序列表独立对账 / estMs 家族 / clip 文本=流程名 / SPEC_DUR 实长 /
     clips 注入 / 开场链 ---- */
  total++;
  /* SPEC §3-r5 步骤表独立字面量（零手抄对账：词|emoji 逐字、步数 6-8 精确） */
  let refOk = Object.keys(SPEC_REF).length === 12 && HABIT_IDS.length === 12;
  HABIT_IDS.forEach(h => {
    const ref = SPEC_REF[h], lib = HABITS[h] && HABITS[h].steps;
    if (!ref || !lib || lib.length !== ref.length || lib.length < 6 || lib.length > 8) { refOk = false; return; }
    ref.forEach((pair, i) => { if (lib[i].t + '|' + lib[i].e !== pair) refOk = false; });
    if (VOICE['q_' + h].text !== HABITS[h].name) refOk = false;   // clip 文本=流程名（manifest 一致）
  });
  /* estMs 家族（r4 m-5 定版 n*345+600；禁 +300 变体）：数值断言+源码负向（无 + 300 家族字面） */
  const estOk = estMs(1) === 945 && estMs(TTS_MAX_CHARS) === 14 * 345 + 600 &&
    TTS_MAX_CHARS === Math.max.apply(null, FB_ALL.map(t => t.length)) &&
    estMs.toString().indexOf('345') >= 0 && estMs.toString().indexOf('+ 300') < 0 &&
    FB_ALL.every(t => t.length <= TTS_MAX_CHARS);
  /* hb_* 19 条 + core_* 3 条注入对账（T46 阶段2 +4：hb_suffix/hb_w_start/hb_w_mid/hb_w_adj） */
  const HB_KEYS = ['hb_hint', 'hb_tut_turn', 'hb_tut_watch',
    'hb_q_baojiaozi', 'hb_q_chuanyi', 'hb_q_guomal', 'hb_q_jixin', 'hb_q_kaodangao',
    'hb_q_qichuang', 'hb_q_shuaya', 'hb_q_shuijiao', 'hb_q_xishou', 'hb_q_xiyi',
    'hb_q_xizao', 'hb_q_zhonghua',
    'hb_suffix', 'hb_w_start', 'hb_w_mid', 'hb_w_adj',
    'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = HB_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* SPEC_DUR 实长断言（±60ms，Promise.all+8000ms 超时；浏览器实测真值表）
     T46 阶段2 新 4 键（hb_suffix/hb_w_*）真值=mp3 容器实测（ffprobe，2026-09-19） */
  const durSpec = { /* SPEC_DUR r5 真值表（无头 chromium Audio.metadata 实测，2026-09-13） */
    hb_tut_watch: 3384, hb_tut_turn: 1776, hb_hint: 2616,
    hb_q_xishou: 1464, hb_q_qichuang: 1344, hb_q_shuaya: 1440,
    hb_q_chuanyi: 1344, hb_q_guomal: 1536, hb_q_shuijiao: 1440,
    hb_q_baojiaozi: 1560, hb_q_zhonghua: 1368, hb_q_jixin: 1344,
    hb_q_kaodangao: 1512, hb_q_xizao: 1440, hb_q_xiyi: 1608,
    hb_suffix: 1896, hb_w_start: 3192, hb_w_mid: 3408, hb_w_adj: 3240
  };
  const durKeys = Object.keys(durSpec);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);   // 8s 超时（纪律）
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - durSpec[durKeys[i]]) <= 60);
  /* 开场顺序链（stub 记录）：queue([hb_hint, hb_q_*, hb_suffix]) 单通道全 clip
     （T46 阶段2：尾段 {key:null,text}→hb_suffix，零 keyless 段）；
     speakQuiz 救援拼句=queue 两段（[hb_q_*, hb_suffix]） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                  // flat0 首题 hid 确定性
  const h0 = genLevel(0).quizzes[0].hid;
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 3 &&
    lastQ[0] === 'hb_hint' && lastQ[1] === 'hb_q_' + h0 &&
    lastQ[2] === 'hb_suffix';
  speakQuiz(genLevel(0).quizzes[0]);              // 救援/重听拼句：两段
  const lastQ2 = qLog[qLog.length - 1];
  const rescueChain = qLog.length >= 2 && lastQ2 !== lastQ && lastQ2.length === 2 &&
    lastQ2[0] === 'hb_q_' + h0 && lastQ2[1] === 'hb_suffix';
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const distOk = refOk && estOk && preOk && durOk && openChain && rescueChain &&
    HABIT_IDS.every(h => hidDist[h] >= 1);        // 40 关 12 流程全覆盖（章 1-3 池+章 4/gen 混出）
  if (distOk) npass++;
  units.dist = { ok: distOk, stepsRef: refOk, estMs: estOk, clips: preOk, dur: durOk,
    durs: durs, openChain: openChain, rescueChain: rescueChain, hidDist: hidDist };

  /* ---- 家族 F 断言单元（r5 审查 m-1 补——运行时行为级；家族 A 的 dayEnd 传参
     lim-1 断言在 build.py 静态护栏——3 块布局下 verify 内文本搜索会自匹配恒真） ---- */
  total++;
  const statHintOk = nextHint(4) === CHAPTERS[1].hint && nextHint(9) === CHAPTERS[2].hint &&
                     nextHint(14) === CHAPTERS[3].hint && nextHint(19) === CHAPTERS[4].hint;
  const genHintOk = [24, 29, 34, 39].every(fl =>
    nextHint(fl) === GEN_HINTS[genLevel(fl + 1).dch - 1]);      // 实算对账（禁 (ci+1)%4 字面）
  const famNeg = nextHint.toString().indexOf('(ci + 1) % 4') < 0 &&
                 nextHint.toString().indexOf('genLevel(f + 1).dch') >= 0;
  const famOk = statHintOk && genHintOk && famNeg;
  if (famOk) npass++;
  units.family = { ok: famOk, staticHints: statHintOk,
                   genHints: genHintOk, negLiteral: famNeg };

  const out = { game: 'habit', total: total, pass: npass, layoutOk: layoutOk,
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
  KIDS.voice.say = function () {};
  runVerify();
}
