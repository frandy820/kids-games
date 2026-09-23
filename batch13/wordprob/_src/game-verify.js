/* ================= ?verify=1 自检（仅 verify 分支加载执行——独立第 4 script 块）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 两次生成 JSON 一致）/
     运算正确性独立复算（V_ANS 按 form 逐式；sd 整除校验）/ 数值域独立审计（V_TPL 硬编码
       dom+约束：操作数 2-35、as c≤a+b-8 / sa 系 b≤a-8 / ms 系 c≤a×b-4 / sd a=b×商+c 商 5-8）/
     热身（dch1 首题=bus1 单步桥接 one；dch2/3/4 首题=上一章主型池 two/extra）/
     模板归属（非热身题 tpl∈本章池 V_POOL；相邻题模板互异）/ structOk（4 选项互异禁 0 负）/
     干扰三元组独立验算（d1=中间量真值 / d2∈可算量全集 V_COMPUT / d3∈±1±2±3 近误族——
       禁随机近误充当全部干扰，r13 定案"算得对但答非所问"）/
     反启发式锚（同数值跨题在正解集与干扰集双现 ≥5）/ 引擎直驱（首题同卡连错 2=不灰化
       可重点 miss/retries 递增 → 带错通关 2 星；另全对 3 星）
   ② tapAnswer 单元（flat0 真实 UI）：quiz 钩子形状（kind/tpl/form/nums/4 选项）/ 4 卡 DOM /
     错点晃动可重点 pointer-events ≠ none / 首错不 pulse 正确卡 / miss 计数 / 答对推进
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ②c 错答 clip 窗（契约 I）：wrongChainUntil=起播+4200（wor_wrong 10 字 estMs+150）/
     startLevel 重置 0
   ③ UI 冒烟 A：flat0 真实通路通关（首题错一次=2 星，verify 页不弹层）
   ④ UI 冒烟 B1/B2：flat5（dch2）首题热身=ch1 两步型+其余乘加乘减；flat15（dch4）热身=ch3
     多余条件型+rowex/candy2 轮换+autoSolve 3 星
   ⑤ 教学链（verify 直驱 tutorialWatch）：watch clip 播出 → demo 答对 → 重发同关 →
     tut='help' 解锁 + turn clip 交接（qTimer ≥1.8s 接力，单通道不叠音）
   ⑥ clip 与拼接段序：VOICE 表文案独立字面量对账 / TPL_VOICE 38 段 V_SEGS 全文镜像 + key 全
     ASCII + 与 TPLS 引用一致（合成前后两种状态都不 FAIL）/ wor_n_1..35 注入 clipOk + numCn
     对 V_CN 独立数词构造 1..35 全对账 / 注入伪 clip 后开场链 queue([wor_hint, …段/数词交替])
     段序精确（数词恒在奇数位）/ 缺 clip 整句 TTS 兜底（say(speechOf)）/ answerIdx 四位置均
     出现且首位 <60%
   ⑦ 布局（M3 竖屏三件）：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）——
     body.port 类通道 toggle / 答案卡落 #answers 容器 / portStyle=#logo 固定宽横 42 竖 34 判别锚；
     4 卡 offsetWidth/Height ≥96（坑5：量测避 transform）/ 全按钮 ≥64 / overflowX ≤0
   ⑭ duration（r13 门禁）：模型常量对账（estMs/ADV/ENTER/TAIL/DECIDE/LEVEL_MIN/WRRONG_CHAIN）
     + 40 关 modeled ≥40000 + levelDurMs 逐关独立副本对账 + 每题 DECIDE≥voiceWin +
     全模板全域枚举最坏句长 ≤ DECIDE（SPEC 先验验算）+ 40 关最低=91400 精确（防回漂）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0, 0];

  /* ============ verify 侧独立真值表（SPEC-BATCH13 §2 r13 定稿；禁引引擎 game-core 逻辑） ============ */
  /* 模板表：tpl → [kind, form, 槽域 dom]（槽序=题面语序；sd=[a,c,b]） */
  const V_TPL = {
    bus1:     ['one',   'add', [[15, 24], [13, 20]]],
    bus2:     ['two',   'as',  [[16, 25], [9, 16], [6, 15]]],
    cookie2:  ['two',   'sa',  [[17, 28], [6, 16], [9, 18]]],
    plate2:   ['two',   'ma',  [[3, 5], [6, 9], [10, 24]]],
    row2:     ['two',   'ms',  [[4, 5], [7, 9], [10, 26]]],
    busex:    ['extra', 'sad', [[18, 26], [5, 12], [7, 14], [20, 30]]],
    cookieex: ['extra', 'sad', [[18, 28], [6, 15], [8, 16], [6, 9]]],
    rowex:    ['extra', 'mad', [[4, 5], [7, 9], [10, 24], [4, 9]]],
    candy2:   ['two',   'sd',  [[15, 33], [5, 9], [2, 3]]]
  };
  const V_POOL = { 1: ['bus2', 'cookie2'], 2: ['plate2', 'row2'], 3: ['busex', 'cookieex'], 4: ['rowex', 'candy2'] };
  const V_WARM = { 1: ['bus1'], 2: ['bus2', 'cookie2'], 3: ['plate2', 'row2'], 4: ['busex', 'cookieex'] };
  /* 模板段全文镜像（38 条；与 TPL_VOICE 及 manifest 严格一致的独立字面量） */
  const V_SEGS = {
    wor_tpl2_bus1_1: '早上，公交车到站啦。车上有',  wor_tpl2_bus1_2: '人，上来了',  wor_tpl2_bus1_3: '人。现在车上有多少人呀',
    wor_tpl2_bus2_1: '下午，公交车到站啦。车上有',  wor_tpl2_bus2_2: '人，上来了',  wor_tpl2_bus2_3: '人，又下去了',  wor_tpl2_bus2_4: '人。现在车上有多少人呀',
    wor_tpl2_cookie2_1: '小兔子在吃饼干。盘子里有',  wor_tpl2_cookie2_2: '块，它吃掉了',  wor_tpl2_cookie2_3: '块，妈妈又放上去',  wor_tpl2_cookie2_4: '块。现在盘子里有多少块呀',
    wor_tpl2_plate2_1: '去野餐啦。桌上摆了',  wor_tpl2_plate2_2: '盘草莓，每盘都有',  wor_tpl2_plate2_3: '个，又拿来',  wor_tpl2_plate2_4: '个。一共有多少个草莓呀',
    wor_tpl2_row2_1: '小花园真漂亮。种了',  wor_tpl2_row2_2: '行向日葵，每行都有',  wor_tpl2_row2_3: '棵，搬走了',  wor_tpl2_row2_4: '棵到花盆里。还剩多少棵呀',
    wor_tpl2_busex_1: '傍晚，公交车到站。车上有',  wor_tpl2_busex_2: '人，下去了',  wor_tpl2_busex_3: '人，又上来了',  wor_tpl2_busex_4: '人。车上有',  wor_tpl2_busex_5: '个座位。现在车上有多少人呀',
    wor_tpl2_cookieex_1: '小兔子在吃饼干，盘子里有',  wor_tpl2_cookieex_2: '块，它吃掉了',  wor_tpl2_cookieex_3: '块，妈妈又放上去',  wor_tpl2_cookieex_4: '块。它今年',  wor_tpl2_cookieex_5: '岁。现在盘子里有多少块呀',
    wor_tpl2_rowex_1: '小花园里种了',  wor_tpl2_rowex_2: '行向日葵，每行都有',  wor_tpl2_rowex_3: '棵，搬走了',  wor_tpl2_rowex_4: '棵到花盆里。花园里还飞来',  wor_tpl2_rowex_5: '只蝴蝶。还剩多少棵向日葵呀',
    wor_tpl2_candy2_1: '联欢会分糖啦。袋子里有',  wor_tpl2_candy2_2: '颗糖，送给老师',  wor_tpl2_candy2_3: '颗，剩下的平均分给',  wor_tpl2_candy2_4: '个小朋友。每人分到几颗呀'
  };
  const V_SEG_OF = {   /* tpl → 段 key 序（SPEC 槽序交替：段1 数词1 段2 数词2 …） */
    bus1: ['wor_tpl2_bus1_1', 'wor_tpl2_bus1_2', 'wor_tpl2_bus1_3'],
    bus2: ['wor_tpl2_bus2_1', 'wor_tpl2_bus2_2', 'wor_tpl2_bus2_3', 'wor_tpl2_bus2_4'],
    cookie2: ['wor_tpl2_cookie2_1', 'wor_tpl2_cookie2_2', 'wor_tpl2_cookie2_3', 'wor_tpl2_cookie2_4'],
    plate2: ['wor_tpl2_plate2_1', 'wor_tpl2_plate2_2', 'wor_tpl2_plate2_3', 'wor_tpl2_plate2_4'],
    row2: ['wor_tpl2_row2_1', 'wor_tpl2_row2_2', 'wor_tpl2_row2_3', 'wor_tpl2_row2_4'],
    busex: ['wor_tpl2_busex_1', 'wor_tpl2_busex_2', 'wor_tpl2_busex_3', 'wor_tpl2_busex_4', 'wor_tpl2_busex_5'],
    cookieex: ['wor_tpl2_cookieex_1', 'wor_tpl2_cookieex_2', 'wor_tpl2_cookieex_3', 'wor_tpl2_cookieex_4', 'wor_tpl2_cookieex_5'],
    rowex: ['wor_tpl2_rowex_1', 'wor_tpl2_rowex_2', 'wor_tpl2_rowex_3', 'wor_tpl2_rowex_4', 'wor_tpl2_rowex_5'],
    candy2: ['wor_tpl2_candy2_1', 'wor_tpl2_candy2_2', 'wor_tpl2_candy2_3', 'wor_tpl2_candy2_4']
  };
  /* 独立中文数词构造（与 game-data NUM_CN 表不同代码路径）：1..35 全对账 */
  const V_CN = n => {
    const U = '零一二三四五六七八九';
    if (n < 10) return U[n];
    if (n === 10) return '十';
    if (n < 20) return '十' + U[n - 10];
    const t = Math.floor(n / 10);
    return (t > 1 ? U[t] : '') + '十' + (n % 10 ? U[n % 10] : '');
  };
  function vSpeech(q) {                          /* 段/数词交替全文（独立拼装） */
    const segs = V_SEG_OF[q.tpl];
    let s = '';
    for (let i = 0; i < segs.length; i++) {
      s += V_SEGS[segs[i]];
      if (i < q.nums.length) s += V_CN(q.nums[i]);
    }
    return s;
  }
  function refAns(q) {                           /* 答案独立复算（form 逐式） */
    const n = q.nums;
    if (q.form === 'add') return n[0] + n[1];
    if (q.form === 'as') return n[0] + n[1] - n[2];
    if (q.form === 'sa' || q.form === 'sad') return n[0] - n[1] + n[2];
    if (q.form === 'ma') return n[0] * n[1] + n[2];
    if (q.form === 'ms' || q.form === 'mad') return n[0] * n[1] - n[2];
    return n[2] > 0 && (n[0] - n[1]) % n[2] === 0 ? (n[0] - n[1]) / n[2] : -1;   /* sd 必须整除 */
  }
  function refMid(q) {                           /* 两步中间量（add 无中间量=镜像 |a-b|） */
    const n = q.nums;
    if (q.form === 'as') return n[0] + n[1];
    if (q.form === 'sa' || q.form === 'sad') return n[0] - n[1];
    if (q.form === 'ma' || q.form === 'ms' || q.form === 'mad') return n[0] * n[1];
    if (q.form === 'sd') return n[0] - n[1];
    return Math.abs(n[0] - n[1]);
  }
  function refDom(q) {                           /* 数值域独立审计（V_TPL 硬编码域+约束） */
    const dom = V_TPL[q.tpl][2], n = q.nums;
    if (n.length !== dom.length) return false;
    for (let i = 0; i < n.length; i++) if (n[i] < dom[i][0] || n[i] > dom[i][1]) return false;
    if (q.form === 'as' && !(n[2] <= n[0] + n[1] - 8)) return false;
    if ((q.form === 'sa' || q.form === 'sad') && !(n[1] <= n[0] - 8)) return false;
    if ((q.form === 'ms' || q.form === 'mad') && !(n[2] <= n[0] * n[1] - 4)) return false;
    if (q.form === 'sd') {
      if ((n[0] - n[1]) % n[2] !== 0) return false;
      const qq = (n[0] - n[1]) / n[2];
      if (qq < 5 || qq > 8) return false;
    }
    return n.every(v => v >= 2 && v <= 35);      /* 数词域（wor_n_1..35）且无 1（域下界≥2） */
  }
  function refComput(q) {                        /* 可算量全集（干扰 d2 合法域——独立枚举） */
    const n = q.nums, a = n[0], b = n[1], c = n[2], d = n[3];
    const all = [a, b, c, d, a + b, a - b, b - a, b - c, a - c, a + b + c, a - b - c,
                 a * b, a * b + c, a * b - c];
    if (q.form === 'sd') all.push(a - c, a + c, a / b);
    const set = [];
    all.forEach(v => { if (Number.isInteger(v) && v > 0 && v !== q.answer && set.indexOf(v) < 0) set.push(v); });
    return set;
  }
  const nearOf = q => [q.answer + 1, q.answer - 1, q.answer + 2, q.answer - 2, q.answer + 3, q.answer - 3]
    .filter(v => v > 0 && v !== q.answer);

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const ansSeen = [], distSeen = [];             /* 反启发式锚采集（正解集/干扰集） */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);      // 确定性
    let rangeAll = true, warmOk = true, tplAll = true, rotOk = true,
        structAll = true, distrAll = true, ansOk = true;
    let prevTpl = null;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (refAns(q) !== q.answer) ansOk = false;             // 运算正确性独立复算
      if (!refDom(q)) rangeAll = false;                      // 数值域独立审计
      /* 热身：首题=上一章主型（dch1=bus1 单步桥接） */
      if (k === 0) {
        if (!(q.warm === true && V_WARM[L1.dch].indexOf(q.tpl) >= 0)) warmOk = false;
        if (q.kind !== V_TPL[q.tpl][0]) warmOk = false;
      } else {
        if (q.warm !== false) warmOk = false;
        if (V_POOL[L1.dch].indexOf(q.tpl) < 0) tplAll = false;   // 模板归属本章池
      }
      if (q.kind !== V_TPL[q.tpl][0] || q.form !== V_TPL[q.tpl][1]) tplAll = false;
      if (prevTpl === q.tpl) rotOk = false;                     // 相邻题模板互异（防连发）
      prevTpl = q.tpl;
      if (!structOk(q)) structAll = false;                      // 4 选 1 互异禁 0 负
      /* 干扰三元组独立验算（选项已洗牌→按集合验，禁按位序）：
         恰 1 个=中间量真值（算得对但答非所问）+ ≥2 个∈可算量全集 + ≥1 个∈近误族
         （禁随机近误充当全部干扰——r13 定案） */
      const ds = q.options.filter((v, i) => i !== q.answerIdx);
      const midN = ds.filter(v => v === refMid(q)).length;
      const computN = ds.filter(v => refComput(q).indexOf(v) >= 0).length;
      const nearN = ds.filter(v => nearOf(q).indexOf(v) >= 0).length;
      if (ds.length !== 3 || midN !== 1 || computN < 2 || nearN < 1) distrAll = false;
      ds.forEach(v => distSeen.push(v));
      ansSeen.push(q.answer);
      idxDist[q.answerIdx]++;
    }
    /* 引擎直驱：首题同卡连错 2（不灰化可重点）→ 带错通关 2 星；另全对 3 星 */
    const Ld = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      if (k === 0) {
        let wi = 0; while (wi === q.answerIdx) wi++;
        if (engTap(Ld, wi) !== 'wrong' || q.miss !== 1 || Ld.retries !== 1) driveOk = false;
        if (engTap(Ld, wi) !== 'wrong' || q.miss !== 2 || Ld.retries !== 2) driveOk = false;   // 同卡可重复点
      }
      if (engTap(Ld, 99) !== null || engTap(Ld, -1) !== null || engTap(Ld, 0.5) !== null) driveOk = false;  // 非法下标
      const want = k === Ld.quizzes.length - 1 ? 'done' : 'right';
      if (engTap(Ld, q.answerIdx) !== want) driveOk = false;
    }
    const stars2 = Ld.done && Ld.step === CH_LEN && Ld.retries === 2 && engStars(Ld) === 2;
    const L3 = genLevel(flat);
    let guard = 0;
    while (!L3.done && guard++ < 30) engTap(L3, L3.quizzes[L3.step].answerIdx);
    const stars3 = L3.done && L3.retries === 0 && engStars(L3) === 3;           // 全对 3 星（永不 0）
    if (!stars2 || !stars3) driveOk = false;
    const ok = det && L1.quizzes.length === CH_LEN && rangeAll && warmOk && tplAll && rotOk &&
      structAll && distrAll && ansOk && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, warmOk: warmOk,
      tplAll: tplAll, rotOk: rotOk, structAll: structAll, distrAll: distrAll, ansOk: ansOk,
      driveOk: driveOk, stars: { wrong2: engStars(Ld), clean: engStars(L3) },
      qs: L1.quizzes.map(q => q.kind + ':' + q.tpl + ':' + q.nums.join(',') + '=' + q.answer) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* 反启发式锚（SPEC §2 r13）：同数值跨题在正解集与干扰集双现 ≥5（防背答案策略） */
  const aSet = {}, dSet = {};
  ansSeen.forEach(v => aSet[v] = 1);
  distSeen.forEach(v => dSet[v] = 1);
  const anchorVals = Object.keys(aSet).map(Number).filter(v => dSet[v]);
  const anchorOk = anchorVals.length >= 5;

  /* ---- ② tapAnswer 单元（flat0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = WP.quiz;
  const shapeOk = q0 && ['one', 'two', 'extra'].indexOf(q0.kind) >= 0 &&
    V_TPL[q0.tpl] && q0.kind === V_TPL[q0.tpl][0] && q0.form === V_TPL[q0.tpl][1] &&
    q0.warm === true && q0.options.length === 4 &&
    q0.options[q0.answerIdx] === q0.answer && q0.step === 0 && q0.miss === 0;
  const optN0 = answersEl.querySelectorAll('.opt').length;       // 4 张答案卡 DOM
  const widx = q0.options.findIndex((v, i) => i !== q0.answerIdx);
  const wR = await WP.tapAnswer(widx);                           // 首错：晃动不灰掉可重点
  await wait(560 * SPEED);
  const wEl = answersEl.querySelector('.opt[data-i="' + widx + '"]');
  const okEl0 = answersEl.querySelector('.opt[data-i="' + q0.answerIdx + '"]');
  const wrongOk = wR === 'wrong' && !!wEl && wEl.classList.contains('wrong') &&
    getComputedStyle(wEl).pointerEvents !== 'none' &&            /* 不灰化：可重点（SPEC §2） */
    !okEl0.classList.contains('breathe') &&                      /* 首错不 pulse 正确卡 */
    WP.quiz.miss === 1 && WP.currentLevel.step === 0 && WP.currentLevel.retries === 1;
  const badIdx = (await WP.tapAnswer(99)) === false && (await WP.tapAnswer(-1)) === false &&
    (await WP.tapAnswer('x')) === false;                         // 非法下标防御
  const r0 = await WP.tapAnswer(q0.answerIdx);                   // 答对推进
  const advOk = r0 === 'right' && WP.currentLevel.step === 1 && WP.currentLevel.retries === 1;
  const tapOk = shapeOk && optN0 === 4 && wrongOk && badIdx && advOk;
  if (tapOk) npass++;
  units.tapAnswer = { ok: tapOk, shape: shapeOk, optN: optN0, wrong: wrongOk, badIdx: badIdx, adv: advOk,
    quiz0: { kind: q0.kind, tpl: q0.tpl, nums: q0.nums, options: q0.options, answerIdx: q0.answerIdx } };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'wor_wrong').length;
  const wrongIdx = () => { const q = WP.quiz; let i = 0; while (i === q.answerIdx) i++; return i; };
  startLevel(0);                                 // flat0：每错必播
  await WP.tapAnswer(wrongIdx());
  await WP.tapAnswer(wrongIdx());
  const sayA = wrongPlays();                     // → 2
  startLevel(3);                                 // flat3：10s 节流
  lastWrongVoice = Date.now();                   /* 显式进入节流窗口内 */
  await WP.tapAnswer(wrongIdx());                // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                 // 增量 → 0
  startLevel(3);                                 // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                            /* 隔离上一子用例时间戳 */
  await WP.tapAnswer(wrongIdx());                // miss=1 → 播（10s 窗口外）
  await WP.tapAnswer(wrongIdx());                // miss=2 → force === 2 → 播
  const sayC = wrongPlays() - 2 - sayB;          // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ②c 错答 clip 窗（契约 I）：wrong 起播设窗 4200 / startLevel 重置 0 ---- */
  total++;
  startLevel(3);
  wrongChainUntil = 0;                           // 从零态起测
  const tBefore = Date.now();
  await WP.tapAnswer(wrongIdx());
  const winVal = wrongChainUntil;                // 记录后再测重置
  const winLow = tBefore + WRONG_CHAIN_WIN - 150, winHigh = Date.now() + WRONG_CHAIN_WIN + 150;
  const winSetOk = winVal >= winLow && winVal <= winHigh;      /* 窗≈now+4200 */
  const winConstOk = WRONG_CHAIN_WIN === 4200;    /* =wor_wrong 10 字 estMs 4050+150（常量×口径全算） */
  startLevel(3);
  const winResetOk = wrongChainUntil === 0;       /* startLevel 清窗 */
  const chainOk = winSetOk && winConstOk && winResetOk;
  if (chainOk) npass++;
  units.wrongChain = { ok: chainOk, set: winSetOk, const: winConstOk, reset: winResetOk, win: winVal };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, quizzesA = 0, firstWrongDone = false;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = WP.quiz;
    if (!q) { smokeA = false; break; }
    if (!firstWrongDone) {                        // 首错已由单元②验证语义，此处计一次错（星级）
      await WP.tapAnswer((q.answerIdx + 1) % 4);  // 4 选 1 中 +1 轮转恒为错卡
      firstWrongDone = true;
    }
    const q2 = WP.quiz;
    const r = await WP.tapAnswer(q2.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    quizzesA++;
  }
  const lvA = WP.currentLevel;
  const smokeOkA = smokeA && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, quizzes: quizzesA, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat5（dch2 乘加乘减）首题热身=ch1 两步型 + 其余乘加乘减 ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const q5s = L5.quizzes;
  const warm5 = cur.dch === 2 && q5s[0].warm && q5s[0].kind === 'two' &&
    V_POOL[1].indexOf(q5s[0].tpl) >= 0 && refDom(q5s[0]) &&
    q5s.slice(1).every(q => q.kind === 'two' && V_POOL[2].indexOf(q.tpl) >= 0 && refDom(q));
  let playB1 = true, quizzesB = 0;
  for (let s = 0; s < CH_LEN && playB1; s++) {
    const q = WP.quiz;
    if (!q) { playB1 = false; break; }
    const r = await WP.tapAnswer(q.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB1 = false;
    quizzesB++;
  }
  const lv5 = WP.currentLevel;
  const smokeOkB1 = warm5 && playB1 && quizzesB === CH_LEN && lv5.done && lv5.won &&
    lv5.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, warm: warm5, warmTpl: q5s[0].tpl, quizzes: quizzesB, stars: engStars(cur),
    qs: q5s.map(q => q.kind + ':' + q.tpl) };

  /* ---- ④ UI 冒烟 B2：flat15（dch4 综合）热身=ch3 多余条件型 + rowex/candy2 轮换 + autoSolve 3 星 ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const q15s = L15.quizzes;
  const warm15 = cur.dch === 4 && q15s[0].warm && q15s[0].kind === 'extra' &&
    V_POOL[3].indexOf(q15s[0].tpl) >= 0 && refDom(q15s[0]) &&
    q15s.slice(1).every(q => V_POOL[4].indexOf(q.tpl) >= 0 && refDom(q) && refAns(q) === q.answer);
  const hasCandy = q15s.slice(1).some(q => q.tpl === 'candy2');          // 除法两步在场（sd 整除真值）
  const as15 = await WP.autoSolve();             // UI 路径自动通关（含首题热身）
  const lv15 = WP.currentLevel;
  const smokeOkB2 = warm15 && hasCandy && as15.done && lv15.done && lv15.won &&
    lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB2) npass++;
  smokes.flat15 = { ok: smokeOkB2, warm: warm15, warmTpl: q15s[0].tpl, candy: hasCandy,
    taps: as15.taps, stars: engStars(cur), qs: q15s.map(q => q.kind + ':' + q.tpl) };

  /* ---- ⑤ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play, origS7 = KIDS.voice.say;
  const qLog7 = [], pLog7 = [], sLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  KIDS.voice.say = function (t) { sLog7.push(String(t)); };
  startLevel(0);
  await tutorialWatch();                         // 看：watch clip → demo 答对 → 重发同关 → 帮
  const q1v = genLevel(0).quizzes[0];
  const stateOk7 = pLog7.indexOf('wor_tut_watch') >= 0 &&                      /* 看=演示配 watch clip */
    pLog7.indexOf('wor_tut_turn') >= 0 &&                                      /* 交接 turn clip 播出 */
    state.tut === 'help' && !state.demo && !state.locked &&                    /* 帮：解锁等孩子动手 */
    WP.currentLevel && WP.currentLevel.flat === 0 &&                           /* 重发同关 */
    WP.quiz && WP.quiz.step === 0 && WP.quiz.miss === 0 &&                     /* 新题面初态 */
    window.__wpDemoR === 'right';                                              /* 演示答对真实生效（审查 M2） */
  await wait(2200);                              // 等 qTimer 2000ms 交接接力题面（真实 ms，不吃 SPEED）
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7; KIDS.voice.say = origS7;
  /* 交接题面两分支（§0.6 单通道）：全 clip 态=queue 段/数词交替链；缺模板 clip 态=整句 TTS 兜底。
     两分支都断言"turn 先、题面后"；合成前后 rebuild 两种状态均须 PASS */
  const expectParts7 = [];
  {
    const segs = V_SEG_OF[q1v.tpl];
    for (let i = 0; i < segs.length; i++) {
      expectParts7.push(segs[i]);
      if (i < q1v.nums.length) expectParts7.push('wor_n_' + q1v.nums[i]);
    }
  }
  const lastQ7 = qLog7.length ? qLog7[qLog7.length - 1] : null;
  const chainQ = !!lastQ7 && JSON.stringify(lastQ7) === JSON.stringify(expectParts7);
  const chainT = sLog7.length >= 1 && sLog7[sLog7.length - 1] === qSpeech(q1v);
  const tutOk = stateOk7 && (chainQ || chainT);
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('wor_tut_watch') >= 0,
    turnClip: pLog7.indexOf('wor_tut_turn') >= 0, chainQ: chainQ, chainTTS: chainT,
    demoR: window.__wpDemoR, tut: state.tut, handoffQueue: lastQ7, expect: expectParts7, lastSay: sLog7.slice(-1) };

  /* ---- ⑥ clip 与拼接段序：文案对账 / TPL_VOICE 镜像 / clip 注入 / 数词独立构造 / 开场链段序 / TTS 兜底 / 覆盖率 ---- */
  total++;
  /* SPEC §2 r13 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！听一听算一算' &&
    VOICE.turn.text === '你来算一算' && VOICE.hint.text === '听一听题目再算' &&
    VOICE.wrong.text === '再想一想，听一听题目';
  /* 数词独立构造全对账 1..35（numCn 表 vs V_CN 构造式——两条代码路径互证） */
  let numCnOk = true;
  for (let n = 1; n <= 35; n++) if (numCn(n) !== V_CN(n)) numCnOk = false;
  /* wor_* 注入对账：4 通用 + 数词 1-35（build 注入后应全在场） */
  const WOR_KEYS = ['wor_tut_watch', 'wor_tut_turn', 'wor_hint', 'wor_wrong']
    .concat(Array.from({ length: 35 }, (_, i) => 'wor_n_' + (i + 1)));
  const clipOk = WOR_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 模板段表：38 条 key 全 ASCII、V_SEGS 全文镜像一致、与 TPLS 引用恰好一致（合成前后都不 FAIL） */
  const tplKeys = Object.keys(TPL_VOICE);
  const tplRef = [];
  Object.keys(TPLS).forEach(id => TPLS[id].segs.forEach(s => tplRef.push(s)));
  const tplOk = tplKeys.length === 38 && Object.keys(V_SEGS).length === 38 &&
    tplKeys.every(k => /^wor_tpl2_[a-z0-9_]+$/.test(k)) &&
    tplKeys.every(k => TPL_VOICE[k] === V_SEGS[k]) &&           /* 全文镜像（零手抄偏差在此拦） */
    tplKeys.every(k => tplRef.indexOf(k) >= 0) && tplRef.every(k => tplKeys.indexOf(k) >= 0) &&
    Object.keys(V_SEG_OF).every(t => JSON.stringify(TPLS[t].segs) === JSON.stringify(V_SEG_OF[t]));
  /* 段序精确断言：注入伪模板 clip → 全 clip 态走 queue 单通道，开场链=wor_hint+段/数词交替 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], pLog = [], sLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog.push(String(key)); };
  KIDS.voice.say = function (t) { sLog.push(String(t)); };
  const savedTpl = {};
  tplKeys.forEach(k => { savedTpl[k] = KIDS.voice.clips[k]; KIDS.voice.clips[k] = 'data:audio/mpeg,stub'; });
  startLevel(0);                                 // 全 clip 态：queue([wor_hint, seg1, n1, seg2, …])
  const q0v = genLevel(0).quizzes[0];
  const expect = [VOICE.hint.key];
  {
    const segs = V_SEG_OF[q0v.tpl];
    for (let i = 0; i < segs.length; i++) {
      expect.push(segs[i]);
      if (i < q0v.nums.length) expect.push('wor_n_' + q0v.nums[i]);
    }
  }
  const lastQ = qLog.length ? qLog[qLog.length - 1] : null;
  const openChain = !!lastQ && JSON.stringify(lastQ) === JSON.stringify(expect);
  const numSlots = lastQ ? lastQ.filter((k, i) => i >= 2 && i % 2 === 0) : [];  /* 数词恒在 ≥2 的偶数位（0=hint 1=段1） */
  tplKeys.forEach(k => {                                    // 还原：回到真实 clip 态
    if (savedTpl[k]) KIDS.voice.clips[k] = savedTpl[k]; else delete KIDS.voice.clips[k];
  });
  const savedTpl2 = {};                          // 显式制造缺 clip 态
  tplKeys.forEach(k => { savedTpl2[k] = KIDS.voice.clips[k]; delete KIDS.voice.clips[k]; });
  speakQuiz(q0v);                                // 缺 clip 态：整句 TTS 兜底（say(speechOf)）
  const lastS = sLog.length ? sLog[sLog.length - 1] : null;
  const rescueChain = lastS === vSpeech(q0v) && lastS === qSpeech(q0v);   /* 兜底文本=独立拼装全文 */
  tplKeys.forEach(k => { if (savedTpl2[k]) KIDS.voice.clips[k] = savedTpl2[k]; });
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  /* 答案位置分布：四位置均出现、首位不恒定（<60%） */
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[3] > 0 &&
    idxDist[0] < 200 * 0.6;
  const specOk = refVoice && numCnOk && clipOk && tplOk && openChain && anchorOk &&
    numSlots.length === q0v.nums.length &&
    numSlots.every((k, i) => k === 'wor_n_' + q0v.nums[i]) && rescueChain && distOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, numCn: numCnOk, clips: clipOk, tpl: tplOk,
    openChain: openChain, expect: expect, got: lastQ, numSlots: numSlots, rescueChain: rescueChain,
    antiAnchor: { ok: anchorOk, n: anchorVals.length, sample: anchorVals.slice(0, 8) },
    idx: idxDist, n: idxDist[0] + idxDist[1] + idxDist[2] + idxDist[3] };

  /* ---- ⑦ 布局（M3 竖屏三件）：双 viewport ×（flat0/5/10/15） ---- */
  async function simView(w, h, port, flat) {
    const g = $id('game');
    document.body.classList.toggle('port', !!port);       // 竖屏类通道（与 @media 逐条等值——M3 之一）
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    await wait(620);                              // 入场动画 .38s+delay（真实 ms 不吃 SPEED；rect 量测须待稳定）
    const opts = Array.prototype.slice.call(answersEl.querySelectorAll('.opt'));
    const hitOk = opts.length === 4 &&
      opts.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);   /* 坑5：offset 系避 transform */
    let btnOk = true;                            // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      if (b.offsetWidth > 4 && b.offsetHeight > 4 && (b.offsetWidth < 64 || b.offsetHeight < 64)) btnOk = false;
    });
    const box = answersEl.getBoundingClientRect();          // 答案卡落容器（M3 之二）
    const inBox = opts.every(b => {
      const r = b.getBoundingClientRect();
      return r.left >= box.left - 2 && r.right <= box.right + 2 &&
             r.top >= box.top - 2 && r.bottom <= box.bottom + 2;
    });
    /* 竖屏样式通道生效实锤（M3 之三）：#logo 固定宽（横 42/竖 34）判别力最强、与内容无关。
       横屏 sim 仅当真实视口也横屏才断言 42（真竖屏外层下 @media 覆盖量测无意义——
       thanks r12 形态；真通道由 P1b 真竖视口轮+logoW=34 外部断言兜底） */
    const realPort = window.innerHeight > window.innerWidth;
    const lw = $id('logo').offsetWidth;
    const portStyle = port ? (lw >= 33 && lw <= 35) : (realPort || (lw >= 41 && lw <= 43));
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');
    return { vp: w + 'x' + h + (port ? 'P' : ''), flat: flat, opts: opts.length, hitOk: hitOk, btnOk: btnOk,
             inBox: inBox, portStyle: portStyle, logoW: lw, ox: ox,
             pass: hitOk && btnOk && inBox && portStyle && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simView(1280, 800, false, f));
    sims.push(await simView(800, 1180, true, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                 // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑭ duration（r13 门禁）：模型常量对账 + 40 关 modeled + 独立副本逐关对账 +
       语音窗从不撑时长 + 全模板全域枚举最坏句长先验验算（SPEC 数学先验，坑 13） ---- */
  total++;
  const V_ENTER = 400, V_TAIL = 300, V_ADV = 880, V_MIN = 40000;
  const V_DECIDE = { one: 15000, two: 18000, extra: 19500 };
  const vEst = s => s.length * 345 + 600;
  const vVoice = q => V_ENTER + vEst(vSpeech(q)) + V_TAIL;
  const vQuiz = q => Math.max(vVoice(q), V_DECIDE[V_TPL[q.tpl][0]]) + V_ADV;
  const vDur = L => L.quizzes.reduce((s, q) => s + vQuiz(q), 0);
  /* 模型常量对账（源常量 vs verify 独立字面量；estMs 数值求值四方同步之一） */
  const modelOk = estMs('12345') === 5 * 345 + 600 && vEst('12345') === 5 * 345 + 600 &&
    ENTER_MS === V_ENTER && TAIL_MS === V_TAIL && ADV_MS === V_ADV && LEVEL_MIN_MS === V_MIN &&
    DECIDE_MS.one === V_DECIDE.one && DECIDE_MS.two === V_DECIDE.two && DECIDE_MS.extra === V_DECIDE.extra &&
    quizDurMs(genLevel(0).quizzes[0]) === vQuiz(genLevel(0).quizzes[0]);      /* 单题公式对账 */
  let dMin = Infinity, dFlat = -1, parityOk = true, voiceOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;             // 独立副本与源模型逐关对账
    if (d < V_MIN) voiceOk = false;                        // 40 关 modeled ≥ 40000（门禁本体）
    for (const q of L.quizzes)
      if (V_DECIDE[V_TPL[q.tpl][0]] < vVoice(q)) voiceOk = false;   // 每题决策 ≥ 语音窗
  }
  /* 全模板全域枚举最坏句长 ≤ DECIDE（SPEC §2 r13 域表先验验算；12272 有效组合——r13 审查 m1 复核勘正，原注释 12238 不可复现） */
  let enumOk = true, enumWorst = 0, enumTpl = '';
  Object.keys(V_TPL).forEach(tpl => {
    const kind = V_TPL[tpl][0], form = V_TPL[tpl][1], dom = V_TPL[tpl][2];
    const ranges = dom.map(d => { const r = []; for (let v = d[0]; v <= d[1]; v++) r.push(v); return r; });
    const valid = n => {
      if (form === 'as') return n[2] <= n[0] + n[1] - 8;
      if (form === 'sa' || form === 'sad') return n[1] <= n[0] - 8;
      if (form === 'ms' || form === 'mad') return n[2] <= n[0] * n[1] - 4;
      if (form === 'sd') return (n[0] - n[1]) % n[2] === 0 && (n[0] - n[1]) / n[2] >= 5 && (n[0] - n[1]) / n[2] <= 8;
      return true;
    };
    const walk = (i, cur) => {
      if (i === ranges.length) {
        if (!valid(cur)) return;
        const vw = vVoice({ tpl: tpl, nums: cur });
        if (vw > enumWorst) { enumWorst = vw; enumTpl = tpl; }
        if (vw > V_DECIDE[kind]) enumOk = false;
        return;
      }
      ranges[i].forEach(v => walk(i + 1, cur.concat(v)));
    };
    walk(0, []);
  });
  const durUnitOk = modelOk && dMin >= V_MIN && parityOk && voiceOk && enumOk &&
    dMin === 91400;   /* M 防回漂：40 关 modeled 最低=dch1 关（one 热身+4×two）15880+4×18880 精确 */
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
                     model: modelOk, parity: parityOk, voiceNeverDominates: voiceOk,
                     enum: { ok: enumOk, worstMs: enumWorst, tpl: enumTpl },
                     decide: V_DECIDE, adv: V_ADV };

  const out = { game: 'wordprob', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__wpVlog = out;                         // __vlog 计数（外部断言挂点）
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
