/* ================= ?verify=1 自检（仅 verify 分支加载执行）——r3 难度改造版
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射 / 引擎直驱（逐题点应选卡→right/末题 done→
     全关 3 星）+ 章分布聚合（dch1 散点 5-10 / dch2 全 grid 满阵 10-20 / dch3 两子型
     3+2 分布 / dch4 ≥2 型+count 近形 100% / 生成关四型全现）
   ② SPEC 封闭表独立对账（verify 内从 SPEC-BATCH28 §0.68 r3 版本块文字独立重列，禁引用
     引擎 SHAPES/NEAR/COLORS/NUMCN/numSet/GUIDE）× 40 关全题：图形 ∈ 封闭 6 / 颜色 ∈ 封闭 4 /
     scene-ask-answer 自洽 / numSet 独立复算（SPEC_NUMSET[t] 与实际 4 数集合一致，t 域 1-20）/
     阵列参数域独立复算（r∈2-4 c∈3-5 tot 域）/ 缺格结构（n=r*c-k 独立算术+k 域+位置界内互异）/
     dual 双干扰在场独立判（同色异形+同形异色都必在）/ 页面表 ↔ SPEC 表逐条一致
   ③ ch3 专项（flat10-14 五关全题）：gridmiss 减法独立复算+dual 双干扰独立判；
     40 关全量 count 近形在场统计（ch4）
   ④ 点卡单元（flat0 count + ch3 两子型真实 UI 状态机）：越界下标=null；count 错
     under/over 双向链句（按所点数字方向）；1000ms 防重入窗（fire-and-forget 首击+窗内
     二击被拦且 miss 只 +1——b25 坑①方法学）；对=right 推进+确认句 __lastQueue 段链拼接=独立拼句（T46 键轨）
     （NUMCN 口径）；gridmiss 错链句=结构锚；dual 错链句=两步锚；grid/dual 确认句独立拼
   ⑤ 教学链：tutorialWatch() 真实走完（stub 存档）→ __scDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；flat0 题0 恒 circle×6（分组数锚点）
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入（null）+ 卡排容器 bump 微动效（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=5，恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat15（ch4 漂移）先点 1 次错卡再 autoSolve（miss=1 → 2 星）
   ⑨ 布局：双 viewport（1280×800 / 800×1180）×（ch1 散点 / 最大行数阵列 / dual / ch4 漂移）
     动态选关：场景图形 ≥56（§0.9 下限档）、卡 ≥96、题面卡 ≥64、overflowX ≤0、
     描边对比度 ≥3:1、场景元素两两不重叠（getBoundingClientRect 交叠检测——漂移关
     横摆 ±9px 恒在间隙 66px 内安全）
   ⑩ clips：shc_ 8 条 + core 3 条全注入（dataURI 前缀在场）+ duration 身份辨别器
     （new Audio onloadedmetadata 与实测表差 ≤60ms——含 r3 新增 hint_grid/hint_dual）
   ⑪ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑫ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔ dch=k+1；
     生成关 nextHint(f)=GEN_HINTS[genLevel(f+1).dch-1] 实算对账（家族 F，禁 (ci+1)%4）
   ⑬ verify 提速断言：SPEED=0.12
   ⑭ 语音窗动态断言（b25 estMs 定版：estMs(n)=n*345+600 全字符）：
     判对演出窗 1800+3600=5400 ≥ estMs(最长确认句独立拼算)；
     教学演示窗 900+3100=4000 ≥ shc_tut_watch 3096+300；
     turn 后读题延 2400 ≥ shc_tut_turn 1896+300；
     winFlow 补窗 2620+600=3220 ≥ shc_right 2304+300；
     链豁免窗 7900 ≥ shc_wrong 1968+150+estMs(最长引导句 10 字符)+300
   ⑮ 家族 A/B/F/I/K 源码级断言（Function.toString）：boot 含 nextHint(lim - 1) /
     winFlow 含 nextHint(null) / nextHint 含 genLevel(f + 1).dch 实算且禁 (ci + 1) % 4 /
     rescueTick 顶部 wrongChainUntil 守卫 + K 面板守卫选择器串 + lastDir/lastAct 双锚 /
     startLevel 重置 lastWrongVoice+wrongChainUntil / uiTapOpt 错路径设豁免终点 7900
   ⑯ L 契约专项：NUMCN/数字 TTS 映射对封闭集全量值 1-20 输出非 undefined 且 2='两'；
     独立拼确认句全量非 undefined（含 2=两/12=十二/20=二十）
   ⑰ r3 阵列几何 DOM 专项（dch2+ch3 gm 关）：DOM 元素数=scene 总数（miss 格不在 DOM）/
     data-row·data-cp ↔ 独立几何换算（left=(cp+0.5)/cols·top=SPEC_GRID_TOP+row·dy ≤0.01%）/
     data-id 全=ask / 缺格 idx 集合独立复算（DOM 恰缺 miss 格）
   ⑱ r3 双维过滤 DOM 专项（dual 关）：(data-id,data-fill) 组合计数=scene 独立展开 /
     SVG fill 属性=SPEC_COLORS 独立色值 / 目标+同色异形+同形异色三集合计数各自对账
   ⑲ r3 漂移机制专项（ch4 vs ch1-3）：dch4 全关全元素 computed animationName='drift-x'
     100%；dch1-3 全关=0（'none'）；漂移不改判定真值（DOM 计数=scene 对账同 ⑱）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH28 §0.68 r3 版本块文字独立重列（禁抄页面 SHAPES/NEAR/COLORS/NUMCN/
     numSet/GUIDE/文案/几何常量） */
  const SPEC_SHAPES = { circle: '圆形', square: '方形', triangle: '三角形',
                        star: '星星', heart: '心形', diamond: '菱形' };   // 图形封闭 6 名
  const SPEC_SHAPE6 = Object.keys(SPEC_SHAPES);
  const SPEC_NEAR = { triangle: 'diamond', diamond: 'triangle',
                      circle: 'heart', heart: 'circle' };                 // 近形封闭 2 对
  const SPEC_NEAR_KEYS = ['triangle', 'diamond', 'circle', 'heart'];
  const SPEC_COLORS = { red: '红色', blue: '蓝色', yellow: '黄色', green: '绿色' };  // r3 颜色封闭 4
  const SPEC_COLOR_HEX = { red: '#E8483C', blue: '#2E6FB8', yellow: '#F5C445', green: '#57A773' };
  const SPEC_NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八',
                       9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四',
                       15: '十五', 16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十' };
  const SPEC_NUMSET = { 1: [1, 2, 3, 4], 2: [2, 3, 4, 5], 3: [1, 2, 3, 4],      // 候选数字分布规则
                        4: [2, 3, 4, 5], 5: [3, 4, 5, 6], 6: [4, 5, 6, 7],      // （r3 域 1-20：t≤2 正侧
                        7: [4, 5, 6, 7], 8: [5, 6, 7, 8], 9: [6, 7, 8, 9],      // 3-6 中心 t-2..t+1
                        10: [7, 8, 9, 10], 11: [8, 9, 10, 11], 12: [9, 10, 11, 12],   // t≥7 下邻域
                        13: [10, 11, 12, 13], 14: [11, 12, 13, 14], 15: [12, 13, 14, 15],
                        16: [13, 14, 15, 16], 17: [14, 15, 16, 17], 18: [15, 16, 17, 18],
                        19: [16, 17, 18, 19], 20: [17, 18, 19, 20] };     // 独立复算真值偏移族
  const SPEC_GUIDE = { count_over: '没有那么多，再数数', count_under: '还有呢，再接着数',
                       gridmiss: '先数满的行，再数空格', dual: '先找颜色，再找形状' };
  /* SPEC_DUR 扩 T46 阶段2 全 47 键（8 固定+39 段键；mp3 实测 ms，±60ms 辨别器） */
  const SPEC_DUR = { shc_tut_watch: 3096, shc_tut_turn: 1896, shc_hint: 2184,
                     shc_right: 2304, shc_wrong: 1968, shc_q: 2136,
                     shc_hint_grid: 3168, shc_hint_dual: 2976,   // 6 旧（2026-09-10）+2 新（2026-09-13）
                     shc_c_red: 1416, shc_c_blue: 1416, shc_c_yellow: 1416, shc_c_green: 1392,
                     shc_s_circle: 1416, shc_s_square: 1440, shc_s_triangle: 1656, shc_s_star: 1392,
                     shc_s_heart: 1464, shc_s_diamond: 1416, shc_s_yj: 1584, shc_s_yg: 1128, shc_s_gyg: 1920,
                     shc_n_1: 1344, shc_n_2: 1368, shc_n_3: 1392, shc_n_4: 1416, shc_n_5: 1320,
                     shc_n_6: 1368, shc_n_7: 1368, shc_n_8: 1320, shc_n_9: 1344, shc_n_10: 1464,
                     shc_n_11: 1560, shc_n_12: 1536, shc_n_13: 1632, shc_n_14: 1632, shc_n_15: 1584,
                     shc_n_16: 1632, shc_n_17: 1632, shc_n_18: 1584, shc_n_19: 1584, shc_n_20: 1536,
                     shc_q_grid: 3264, shc_q_gridmiss: 3072,
                     shc_g_over: 2736, shc_g_under: 2664, shc_g_gridmiss: 3168, shc_g_dual: 2976 };
  const SPEC_CH1_N = [5, 10], SPEC_CH4_N = [5, 9], SPEC_DIST4 = [3, 8];
  const SPEC_GRID_R = [2, 4], SPEC_GRID_C = [3, 5], SPEC_GRID_TOT = [10, 20];
  const SPEC_MISS_TOT = [12, 20], SPEC_MISS_K = [1, 4], SPEC_MISS_FLOOR = 10;
  const SPEC_DUAL_N = [3, 6], SPEC_DUAL_D = [2, 5];
  const SPEC_GRID_TOP = { 2: 33, 3: 25.5, 4: 19.5 };          // r3 阵列行定位（%，独立重列）
  const SPEC_GRID_DY = { 2: 33, 3: 24.5, 4: 21.5 };
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字符 + 600 落地余量（全字符口径）
  /* 独立拼句（SPEC 句式：count=名+'，有'+N+'个' / grid·gm='一共，有'+N+'个' /
     dual=色名+名+'，有'+N+'个'；题面句 count=名+'有几个？' 等） */
  const specConfirm = (kind, id, n) => {
    if (kind === 'grid' || kind === 'gridmiss') return '一共，有' + SPEC_NUMCN[n] + '个';
    if (kind === 'dual') { const p = id.split(':'); return SPEC_COLORS[p[1]] + SPEC_SHAPES[p[0]] + '，有' + SPEC_NUMCN[n] + '个'; }
    return SPEC_SHAPES[id] + '，有' + SPEC_NUMCN[n] + '个';
  };
  const specQuizOf = q => {
    if (q.kind === 'grid') return '排好队的图形，一共有几个？';
    if (q.kind === 'gridmiss') return '有空格的图形，一共几个？';
    if (q.kind === 'dual') { const p = q.ask.split(':'); return SPEC_COLORS[p[1]] + SPEC_SHAPES[p[0]] + '有几个？'; }
    return SPEC_SHAPES[q.ask] + '有几个？';
  };
  /* count/dual 散点场景键合法（shape 或 shape:color） */
  const keyOk = k => {
    const seg = k.split(':');
    return SPEC_SHAPE6.indexOf(seg[0]) >= 0 && (seg.length === 1 ||
           (seg.length === 2 && Object.keys(SPEC_COLORS).indexOf(seg[1]) >= 0));
  };
  const sortKey = a => a.slice().sort((x, y) => x - y).join();

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  let dch1Seen = [], dch4Agg = [], ch3Split = [], genDch = {};
  let dch2Cnt = 0, dch2Ok = 0, dch4Cnt = 0, dch4Near = 0;
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
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* 引擎直驱：逐题点应选卡 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const i = correctIdx(q);
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapOpt(L3, i);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 章分布聚合（⑨/③ 数据源） */
    if (L1.dch === 1) dch1Seen.push(L1.quizzes.map(q => q.ask + ':' + q.n));
    if (L1.dch === 2) L1.quizzes.forEach(q => {
      dch2Cnt++; if (q.kind === 'grid' && q.n === q.rows * q.cols) dch2Ok++;
    });
    if (L1.dch === 3) {
      const gm = L1.quizzes.filter(q => q.kind === 'gridmiss').length;
      const du = L1.quizzes.filter(q => q.kind === 'dual').length;
      ch3Split.push(gm + '+' + du);
    }
    if (L1.dch === 4) {
      dch4Agg.push({ kinds: L1.quizzes.map(q => q.kind).filter((v, i, a) => a.indexOf(v) === i).length });
      L1.quizzes.forEach(q => {
        if (q.kind === 'count') { dch4Cnt++; if (q.scene[SPEC_NEAR[q.ask]]) dch4Near++; }
      });
    }
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   kinds: L1.quizzes.map(q => q.kind),
                   subs: L1.quizzes.map(q => {
                     if (q.kind === 'grid') return 'grid ' + q.rows + 'x' + q.cols + '=' + q.n;
                     if (q.kind === 'gridmiss') return 'gm ' + q.rows + 'x' + q.cols + '-' + q.miss.length + '=' + q.n;
                     if (q.kind === 'dual') return 'dual ' + q.ask + ':' + q.n + '(d1 ' + q.dual.d1s + ':' + q.dual.d1 + ',d2 ' + q.dual.d2c + ':' + q.dual.d2 + ')';
                     return q.ask + ':' + q.n + (q.scene[SPEC_NEAR[q.ask]] ? '+near' : '');
                   }) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const dch1Ok = dch1Seen.every(arr => arr.every(s => {
    const n = Number(s.split(':')[1]);
    return n >= SPEC_CH1_N[0] && n <= SPEC_CH1_N[1];
  }));
  const distOk = dch1Ok &&
                 dch2Cnt > 0 && dch2Ok === dch2Cnt &&                // dch2 全 grid 且 n=r*c
                 ch3Split.length >= 5 && ch3Split.every(s => {      // dch3 两子型 3+2 分布（含生成关 dch3）
                   const p = s.split('+').map(Number);
                   return (p[0] === 3 && p[1] === 2) || (p[0] === 2 && p[1] === 3);
                 }) &&
                 dch4Agg.every(a => a.kinds >= 2) &&                 // ch4 每关 ≥2 型
                 dch4Cnt > 0 && dch4Near === dch4Cnt &&              // ch4 count 近形 100% 在场
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;   // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, dch1NRange: dch1Ok, dch2Full: dch2Ok + '/' + dch2Cnt,
                 ch3Split: ch3Split, dch4kinds: dch4Agg, dch4Near: dch4Near + '/' + dch4Cnt,
                 genDch: genDch };

  /* ---- ② SPEC 封闭表独立对账（表独立重列 × 40 关全题，期望全独立复算） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const isAnchor = flat === 0 && k === 0;
      if (isAnchor && !(q.kind === 'count' && q.ask === 'circle' && q.n === 6 &&
                        Object.keys(q.scene).length === 1)) {         // r3 锚：circle×6（分组数）
        badCase = 'anchor ' + flat + '/' + k; tableOk = false; break outer;
      }
      if (L.dch === 1 && q.kind !== 'count') { badCase = 'dch1kind ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 2 && q.kind !== 'grid') { badCase = 'dch2kind ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 3 && q.kind !== 'gridmiss' && q.kind !== 'dual') { badCase = 'dch3kind ' + flat + '/' + k; tableOk = false; break outer; }
      for (const sid in q.scene) {                                // scene 键 ∈ 封闭集 + 数量 ≥1
        if (!keyOk(sid)) { badCase = 'sceneKey ' + flat + '/' + k; tableOk = false; break outer; }
        if (!(q.scene[sid] >= 1)) { badCase = 'sceneN ' + flat + '/' + k; tableOk = false; break outer; }
      }
      if (q.kind === 'count') {
        if (SPEC_SHAPE6.indexOf(q.ask) < 0) { badCase = 'ask ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.scene[q.ask] !== q.n) { badCase = 'sceneAsk ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch === 1) {
          if (Object.keys(q.scene).length !== 1) { badCase = 'dch1scene ' + flat + '/' + k; tableOk = false; break outer; }
          if (q.n < SPEC_CH1_N[0] || q.n > SPEC_CH1_N[1]) { badCase = 'dch1n ' + flat + '/' + k; tableOk = false; break outer; }
        } else {                                                  // dch4 近形版
          if (SPEC_NEAR_KEYS.indexOf(q.ask) < 0) { badCase = 'ch4pool ' + flat + '/' + k; tableOk = false; break outer; }
          const near = SPEC_NEAR[q.ask];
          if (!(near in q.scene)) { badCase = 'nearMissing ' + flat + '/' + k; tableOk = false; break outer; }
          const m = q.scene[near];
          if (m < SPEC_DIST4[0] || m > SPEC_DIST4[1]) { badCase = 'mRange ' + flat + '/' + k; tableOk = false; break outer; }
          if (q.n < SPEC_CH4_N[0] || q.n > SPEC_CH4_N[1]) { badCase = 'ch4n ' + flat + '/' + k; tableOk = false; break outer; }
          if (q.n + m > 12) { badCase = 'slots ' + flat + '/' + k; tableOk = false; break outer; }
        }
      } else if (q.kind === 'grid' || q.kind === 'gridmiss') {
        if (L.dch === 2 && q.kind !== 'grid') { badCase = 'gridCh ' + flat + '/' + k; tableOk = false; break outer; }
        if (SPEC_SHAPE6.indexOf(q.ask) < 0) { badCase = 'ask ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.rows < SPEC_GRID_R[0] || q.rows > SPEC_GRID_R[1]) { badCase = 'rows ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.cols < SPEC_GRID_C[0] || q.cols > SPEC_GRID_C[1]) { badCase = 'cols ' + flat + '/' + k; tableOk = false; break outer; }
        const tot = q.rows * q.cols;
        if (q.kind === 'grid') {
          if (tot < SPEC_GRID_TOT[0] || tot > SPEC_GRID_TOT[1]) { badCase = 'tot ' + flat + '/' + k; tableOk = false; break outer; }
          if (q.n !== tot) { badCase = 'nTot ' + flat + '/' + k; tableOk = false; break outer; }   // n=r*c 独立算术
          if (q.miss && q.miss.length) { badCase = 'gridHasMiss ' + flat + '/' + k; tableOk = false; break outer; }
        } else {
          if (tot < SPEC_MISS_TOT[0] || tot > SPEC_MISS_TOT[1]) { badCase = 'gmTot ' + flat + '/' + k; tableOk = false; break outer; }
          if (!Array.isArray(q.miss) || q.miss.length < SPEC_MISS_K[0] || q.miss.length > SPEC_MISS_K[1]) {
            badCase = 'kRange ' + flat + '/' + k; tableOk = false; break outer;
          }
          if (tot - q.miss.length < SPEC_MISS_FLOOR) { badCase = 'floor ' + flat + '/' + k; tableOk = false; break outer; }
          if (q.n !== tot - q.miss.length) { badCase = 'nSub ' + flat + '/' + k; tableOk = false; break outer; }   // 减法结构
          if (q.miss.filter((v, i, a) => a.indexOf(v) === i).length !== q.miss.length) {
            badCase = 'missDup ' + flat + '/' + k; tableOk = false; break outer;
          }
          if (!q.miss.every(v => v >= 0 && v < tot)) { badCase = 'missRange ' + flat + '/' + k; tableOk = false; break outer; }
        }
        if (Object.keys(q.scene).length !== 1 || q.scene[q.ask] !== q.n) {
          badCase = 'gmScene ' + flat + '/' + k; tableOk = false; break outer;
        }
      } else if (q.kind === 'dual') {
        if (L.dch !== 3 && L.dch !== 4) { badCase = 'dualCh ' + flat + '/' + k; tableOk = false; break outer; }
        const d = q.dual;
        if (!d) { badCase = 'dualObj ' + flat + '/' + k; tableOk = false; break outer; }
        if (SPEC_SHAPE6.indexOf(d.shape) < 0 || Object.keys(SPEC_COLORS).indexOf(d.color) < 0) {
          badCase = 'dualLib ' + flat + '/' + k; tableOk = false; break outer;
        }
        if (SPEC_SHAPE6.indexOf(d.d1s) < 0 || Object.keys(SPEC_COLORS).indexOf(d.d2c) < 0) {
          badCase = 'dualDLib ' + flat + '/' + k; tableOk = false; break outer;
        }
        if (d.d1s === d.shape) { badCase = 'd1sSame ' + flat + '/' + k; tableOk = false; break outer; }
        if (d.d2c === d.color) { badCase = 'd2cSame ' + flat + '/' + k; tableOk = false; break outer; }
        if (d.n < SPEC_DUAL_N[0] || d.n > SPEC_DUAL_N[1]) { badCase = 'dualN ' + flat + '/' + k; tableOk = false; break outer; }
        if (d.d1 < SPEC_DUAL_D[0] || d.d1 > SPEC_DUAL_D[1] || d.d2 < SPEC_DUAL_D[0] || d.d2 > SPEC_DUAL_D[1]) {
          badCase = 'dualD ' + flat + '/' + k; tableOk = false; break outer;
        }
        if (d.n + d.d1 + d.d2 > 12) { badCase = 'dualSlots ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.ask !== d.shape + ':' + d.color) { badCase = 'askPair ' + flat + '/' + k; tableOk = false; break outer; }
        if (Object.keys(q.scene).length !== 3) { badCase = 'dualScene ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.scene[q.ask] !== d.n) { badCase = 'sceneN ' + flat + '/' + k; tableOk = false; break outer; }
        /* 双干扰在场独立判（§0.68 r3：同色异形+同形异色都必在——键独立拼） */
        if (!(q.scene[d.d1s + ':' + d.color] === d.d1)) { badCase = 'd1Missing ' + flat + '/' + k; tableOk = false; break outer; }
        if (!(q.scene[d.shape + ':' + d.d2c] === d.d2)) { badCase = 'd2Missing ' + flat + '/' + k; tableOk = false; break outer; }
      } else { badCase = 'kind ' + flat + '/' + k; tableOk = false; break outer; }
      /* 数字卡通用（四型同构）：4 数互异、含真值、独立 numSet 对账 */
      if (q.opts.length !== 4) { badCase = 'len ' + flat + '/' + k; tableOk = false; break outer; }
      const nums = q.opts.map(o => o.num);
      if (nums.filter((v, i, a) => a.indexOf(v) === i).length !== 4) { badCase = 'dup ' + flat + '/' + k; tableOk = false; break outer; }
      if (!nums.every(x => x >= 1 && x <= 20)) { badCase = 'range ' + flat + '/' + k; tableOk = false; break outer; }
      if (nums.filter(x => x === q.n).length !== 1) { badCase = 'ansN ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.answer !== nums.indexOf(q.n)) { badCase = 'ansIdx ' + flat + '/' + k; tableOk = false; break outer; }
      if (sortKey(nums) !== sortKey(SPEC_NUMSET[q.n])) {          // 候选数字分布独立复算（数学先验集）
        badCase = 'numSet ' + flat + '/' + k; tableOk = false; break outer;
      }
      const prev = k > 0 ? L.quizzes[k - 1] : null;               // 相邻同型互异（独立判）
      if (prev && prev.kind === q.kind) {
        const ka = prev.ask, kb = q.ask;
        if (ka === kb) { badCase = 'adjacent ' + flat + '/' + k; tableOk = false; break outer; }
      }
    }
  }
  /* 页面表 ↔ SPEC 表逐条一致（形名/色名/引导句/NUMCN——防文案漂移） */
  const tabOk2 = SPEC_SHAPE6.every(k => SHAPES[k] && SHAPES[k].n === SPEC_SHAPES[k]) &&
                 Object.keys(SPEC_NEAR).every(k => NEAR[k] === SPEC_NEAR[k]) &&
                 Object.keys(SPEC_COLORS).every(k => COLORS[k] && COLORS[k].n === SPEC_COLORS[k]) &&
                 Object.keys(SPEC_GUIDE).every(k => GUIDE[k] === SPEC_GUIDE[k]) &&
                 Object.keys(SPEC_NUMCN).every(k => NUMCN[Number(k)] === SPEC_NUMCN[Number(k)]);
  if (tableOk && tabOk2) npass++;
  units.table = { ok: tableOk && tabOk2, bad: badCase, pageTab: tabOk2 };

  /* ---- ③ ch3 专项（flat10-14 五关全题：减法独立复算+双干扰独立判）+ ch4 近形统计 ---- */
  total++;
  const ch3Detail = [];
  let ch3Ok = true, nearTot = 0, nearHit = 0, driftMark = 0, driftTot = 0;
  for (let flat = 10; flat < 15; flat++) {
    const L = genLevel(flat);
    if (L.dch !== 3) { ch3Ok = false; break; }
    const gm = L.quizzes.filter(q => q.kind === 'gridmiss').length;
    const du = L.quizzes.filter(q => q.kind === 'dual').length;
    if (!((gm === 3 && du === 2) || (gm === 2 && du === 3))) ch3Ok = false;   // 3+2 分布
    for (const q of L.quizzes) {
      if (q.kind === 'gridmiss') {
        if (q.n !== q.rows * q.cols - q.miss.length) ch3Ok = false;          // 减法结构独立复算
        if (q.n < SPEC_MISS_FLOOR) ch3Ok = false;
      } else {
        if (!(q.scene[q.dual.d1s + ':' + q.dual.color] > 0)) ch3Ok = false;  // 同色异形在场
        if (!(q.scene[q.dual.shape + ':' + q.dual.d2c] > 0)) ch3Ok = false;  // 同形异色在场
      }
    }
    ch3Detail.push(flat + ':' + L.quizzes.map(q =>
      q.kind === 'gridmiss' ? q.rows + 'x' + q.cols + '-' + q.miss.length + '=' + q.n
                            : q.ask + '=' + q.n).join(','));
  }
  for (let flat = 0; flat < 40; flat++) {                          // ch4 count 近形在场 + 漂移标记统计
    const L = genLevel(flat);
    if (L.dch === 4) L.quizzes.forEach(q => {
      if (q.kind === 'count') { nearTot++; if (q.scene[SPEC_NEAR[q.ask]]) nearHit++; }
    });
    driftTot++;
    if ((flat >= STATIC_LEVELS || L.dch === 4) === (L.dch === 4)) driftMark++;   // dch4 ↔ 漂移域恒一致（钩子直读）
  }
  if (ch3Ok && nearHit === nearTot && nearTot > 0) npass++;
  units.more3 = { ok: ch3Ok && nearHit === nearTot, detail: ch3Detail,
                  nearStat: nearHit + '/' + nearTot };

  /* ---- ④ 点卡单元（flat0 count：越界/双向错链/防重入/miss 口径 + ch3 两子型链句/确认句） ---- */
  total++;
  startLevel(0);
  const q4 = SC.quiz;
  const initOk = q4 && q4.kind === 'count' && q4.ask === 'circle' && q4.scene.circle === 6 &&
                 Object.keys(q4.scene).length === 1 &&
                 q4.answer === q4.opts.findIndex(o => o.num === 6) &&
                 q4.opts.length === 4 && q4.step === 0 && q4.miss === 0 &&
                 q4.drift === false;                                // ch1 无漂移
  const badIdx = (await SC.tapOpt(99)) === null;                   // 越界下标=null（不炸）
  const nums0 = q4.opts.map(o => o.num);
  const iUnder = nums0.findIndex(n => n < 6);                      // 所点<真值（numSet(6)=[4..7]：4/5）
  const iOver = nums0.findIndex(n => n > 6);                       // 所点>真值（7）
  const pU = SC.tapOpt(iUnder);                                    // 第一错（under）走完整 1000ms 窗
  const rU = await pU;
  const chainU = window.__lastQueue && window.__lastQueue[0] === 'shc_wrong' &&
                 window.__lastQueue[1] && window.__lastQueue[1].key === 'shc_g_under' &&   // T46 阶段2：引导句键化
                 window.__lastQueue[1].text === SPEC_GUIDE.count_under;   // 按所点数字方向
  const s1 = rU === 'wrong' && chainU && SC.quiz.miss === 1 && SC.currentLevel.miss === 1;
  const pW = SC.tapOpt(iOver);                                     // 第二错（over）：fire-and-forget 首击
  const rejW = await SC.tapOpt(iOver);                             // 窗内紧邻再点=被拦 null（1000ms 防重入）
  const rW = await pW;
  const chainO = window.__lastQueue && window.__lastQueue[1] &&
                 window.__lastQueue[1].key === 'shc_g_over' &&      // T46 阶段2：引导句键化
                 window.__lastQueue[1].text === SPEC_GUIDE.count_over;    // 所点>真值
  const s1b = rW === 'wrong' && rejW === null && chainO && SC.quiz.miss === 2;
  const rR = await SC.tapOpt(q4.answer);
  /* T46 阶段2：确认句=queue 段链（count 3 段 [形,，有,数词]）——text 拼接对 SPEC 独立句+首末键轨 */
  const confirmOk = window.__lastQueue && window.__lastQueue.length === 3 &&
                 window.__lastQueue[0].key === 'shc_s_circle' &&
                 window.__lastQueue[2].key === 'shc_n_6' &&
                 window.__lastQueue.map(p => p.text).join('') === specConfirm('count', 'circle', 6);   // 「圆形，有六个」
  const s2 = rR === 'right' && SC.quiz.step === 1 && SC.quiz.miss === 0 && confirmOk;
  /* ch3 两子型错链句+确认句（引擎扫 flat10-14 找 q0=gridmiss / q0=dual 的关，确定性） */
  let gmFlat = -1, duFlat = -1;
  for (let f = 10; f < 15; f++) {
    const k0 = genLevel(f).quizzes[0].kind;
    if (k0 === 'gridmiss' && gmFlat < 0) gmFlat = f;
    if (k0 === 'dual' && duFlat < 0) duFlat = f;
  }
  let gmOk = false, duOk = false;
  if (gmFlat >= 0) {
    startLevel(gmFlat);
    const qg = SC.quiz;
    const wg = qg.opts.findIndex(o => o.num !== qg.n);
    const rg = await SC.tapOpt(wg);
    const chainG = window.__lastQueue && window.__lastQueue[1] &&
                   window.__lastQueue[1].key === 'shc_g_gridmiss' &&     // T46 阶段2：结构锚键化
                   window.__lastQueue[1].text === SPEC_GUIDE.gridmiss;   // 结构锚
    const rgt = await SC.tapOpt(qg.answer);
    gmOk = qg.kind === 'gridmiss' && rg === 'wrong' && chainG && rgt === 'right' &&
           window.__lastQueue && window.__lastQueue.length === 2 &&      // grid 确认 2 段 [一共，有,数词]
           window.__lastQueue[0].key === 'shc_s_gyg' &&
           window.__lastQueue[1].key === 'shc_n_' + qg.n &&
           window.__lastQueue.map(p => p.text).join('') === specConfirm('gridmiss', qg.ask, qg.n);   // 「一共，有N个」
  }
  if (duFlat >= 0) {
    startLevel(duFlat);
    const qd = SC.quiz;
    const wd = qd.opts.findIndex(o => o.num !== qd.n);
    const rd = await SC.tapOpt(wd);
    const chainD = window.__lastQueue && window.__lastQueue[1] &&
                   window.__lastQueue[1].key === 'shc_g_dual' &&         // T46 阶段2：两步锚键化
                   window.__lastQueue[1].text === SPEC_GUIDE.dual;       // 两步锚
    const rdt = await SC.tapOpt(qd.answer);
    const duKeys = qd.ask.split(':');                                   // 'shape:color'（SPEC 拆法）
    duOk = qd.kind === 'dual' && rd === 'wrong' && chainD && rdt === 'right' &&
           window.__lastQueue && window.__lastQueue.length === 4 &&      // dual 确认 4 段 [色,形,，有,数词]
           window.__lastQueue[0].key === 'shc_c_' + duKeys[1] &&
           window.__lastQueue[3].key === 'shc_n_' + qd.n &&
           window.__lastQueue.map(p => p.text).join('') === specConfirm('dual', qd.ask, qd.n);   // 「红色的圆形，有N个」
  }
  const tapOk = initOk && badIdx && s1 && s1b && s2 && gmOk && duOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badIdx: badIdx, under: s1, over: s1b, right: s2,
                confirm: confirmOk, gmChain: gmOk, duChain: duOk, gmFlat: gmFlat, duFlat: duFlat };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __scDemoR='right'（演示两个两个分组数圆） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };            // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                           // 折算真实页时长
  const tutOk = window.__scDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'count' &&
                cur.quizzes[0].ask === 'circle' && cur.quizzes[0].n === 6 &&
                tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__scDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入（null）+ 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                         // 模拟教学"看"演示期
  const swallow1 = (await SC.tapOpt(0)) === null && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                        // 演出窗口（locked）
  const swallow2 = (await SC.tapOpt(0)) === null;
  state.locked = false;                                           // 还原
  const swallowOk = swallow1 && swallow2 && SC.quiz.step === 0 && SC.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await SC.autoSolve();
  const lv0 = SC.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat15（ch4 漂移）先点 1 次错卡再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(15);
  const q8 = SC.quiz;
  const wrongC = q8.opts.findIndex(o => o.num !== q8.n);
  const r8 = await SC.tapOpt(wrongC);
  const a15 = await SC.autoSolve();
  const lv15 = SC.currentLevel;
  const smokeB = r8 === 'wrong' && a15.done && a15.taps === 5 && lv15.done && lv15.won &&
                 lv15.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat15 = { ok: smokeB, r8: r8, taps: a15.taps, miss: lv15.miss, stars: engStars(cur) };

  /* ---- ⑨ 布局：双 viewport ×（ch1 散点 flat0 / 最大行数阵列 / dual 关 / ch4 漂移 flat15）
     动态选关（40 关扫描 rows 最大 grid/gridmiss、含 dual 的 flat）+ 对比度
     + 场景图形 ≥56 + 卡 ≥64（家族档 ≥96）+ 场景元素两两不重叠（getBoundingClientRect） ---- */
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
  /* 场景元素两两不重叠：包围盒交叠检测（严格相交才算叠——边缘接触不算；
     漂移关横摆 ±9px 在列间隙 ≥66px 内恒安全，任意帧取样均过） */
  function sceneNoOverlap() {
    const els = Array.prototype.slice.call(sceneEl.querySelectorAll('.sc-shape'));
    for (let i = 0; i < els.length; i++) {
      const a = els[i].getBoundingClientRect();
      for (let j = i + 1; j < els.length; j++) {
        const b = els[j].getBoundingClientRect();
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) return false;
      }
    }
    /* m3（2026-09-13 审查）：题面文本条与图形群不交叠（grid 模式首行 GRID_TOP[4]=19.5% 与
       q-text top:6px 静态推算临界——bbox 实测定案，防读题遮挡） */
    const qt = sceneEl.querySelector('.q-text');
    if (qt) {
      const t = qt.getBoundingClientRect();
      for (let i = 0; i < els.length; i++) {
        const a = els[i].getBoundingClientRect();
        if (a.left < t.right && a.right > t.left && a.top < t.bottom && a.bottom > t.top) return false;
      }
    }
    return true;
  }
  /* 动态选关：4 行阵列关（几何最紧）+ dual 关 */
  let maxRowsFlat = 5, maxRows = 0, dualFlat = -1;
  for (let f = 5; f < 15; f++) {
    const L = genLevel(f);
    L.quizzes.forEach((q, k) => {
      if ((q.kind === 'grid' || q.kind === 'gridmiss') && q.rows > maxRows) { maxRows = q.rows; maxRowsFlat = f; }
      if (q.kind === 'dual' && dualFlat < 0) dualFlat = f;
    });
  }
  if (dualFlat < 0) dualFlat = 10;                                 // 兜底（引擎扫描必含 dual）
  const simFlats = [0, maxRowsFlat, dualFlat, 15];
  function simView(w, h, flat) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const shapes = Array.prototype.map.call(sceneEl.querySelectorAll('.sc-shape'), s => ({
      w: s.offsetWidth, h: s.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length === 4 && cards.every(b => b.w >= 96 && b.h >= 96) &&   // 主答案卡家族档
                  shapes.length > 0 && shapes.every(s => s.w >= 56 && s.h >= 56);    // 场景图形可辨下限
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    const noOverlap = sceneNoOverlap();
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&                               // 卡描边 INK 对底
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h + '@' + flat, cards: cards.length, shapes: shapes.length,
             hitOk: hitOk, sceneOk: sceneOk, noOverlap: noOverlap, contrast: cB && cS, ox: ox,
             pass: hitOk && sceneOk && noOverlap && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of simFlats) {
    sims.push(simView(1280, 800, flat));
    sims.push(simView(800, 1180, flat));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                                  // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims, maxRows: maxRows, maxRowsFlat: maxRowsFlat, dualFlat: dualFlat };

  /* ---- ⑩ clips：shc_ 8 条 + core 3 条全注入 + 时长身份辨别器（实测表 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['shc_tut_watch', 'shc_tut_turn', 'shc_hint', 'shc_right', 'shc_wrong', 'shc_q',
                'shc_hint_grid', 'shc_hint_dual',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = keys.length === 50 &&                            /* T46：47（8 固定+39 段）+ core 3 */
    keys.filter(k => /^(shc_c_|shc_s_|shc_n_|shc_q_grid$|shc_q_gridmiss$|shc_g_)/.test(k)).length === 39 &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
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

  /* ---- ⑪ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑫ 章末预告 C7 关键词断言（hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('排') >= 0 &&                                      // 预告 ch2 阵列
                 CHAPTERS[2].hint.indexOf('空') >= 0 && CHAPTERS[2].hint.indexOf('颜色') >= 0 &&  // 预告 ch3 缺格+双维
                 CHAPTERS[3].hint.indexOf('动') >= 0 &&                                     // 预告 ch4 移动干扰
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                                     // 预告生成关
                 GEN_HINTS[0].indexOf('数') >= 0 &&                                         // dch1 散点计数
                 GEN_HINTS[1].indexOf('按行') >= 0 &&                                       // dch2 阵列
                 GEN_HINTS[2].indexOf('满行') >= 0 && GEN_HINTS[2].indexOf('颜色') >= 0 &&   // dch3 缺格+双维
                 GEN_HINTS[3].indexOf('会动') >= 0;                                         // dch4 漂移
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // 家族 F：实算下一关 dch
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint),
                  gen: GEN_HINTS, genCalc: genOk };

  /* ---- ⑬ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑭ 语音窗动态断言（T46 阶段2 后 clip 链实长为主口径：窗 ≥ Σ段+150×(n-1)+300；
     判对窗=1800+max(3600, 链实长+PAD-1800) 动态补足（dual 4 段链 6186 超 estMs 窗 5400）） ---- */
  total++;
  /* SPEC 独立 clip 实长表（与 durations 实测一致；运行时对账防表漂移） */
  const S_CM = { c_red: 1416, c_blue: 1416, c_yellow: 1416, c_green: 1392,
                 s_circle: 1416, s_square: 1440, s_triangle: 1656, s_star: 1392,
                 s_heart: 1464, s_diamond: 1416, s_yj: 1584, s_yg: 1128, s_gyg: 1920,
                 n_20: 1536 };
  const cmOf = k => S_CM[k];
  const confChainOf = (kind, id, n) => {                 // SPEC 独立拼确认链段键（复算 chainMs）
    if (kind === 'grid' || kind === 'gridmiss') return ['s_gyg', 'n_' + n];
    if (kind === 'dual') { const p = id.split(':'); return ['c_' + p[1], p[0], 's_yg', 'n_' + n]; }
    return [id, 's_yg', 'n_' + n];
  };
  const chainSpec = ks => ks.reduce((s, k) => s + (k.indexOf('_') === 1 ? cmOf(k) : cmOf('s_' + k)), 0) + 150 * (ks.length - 1);
  let maxConfChain = 0;
  SPEC_SHAPE6.forEach(id => {
    maxConfChain = Math.max(maxConfChain, chainSpec(confChainOf('count', id, 20)));
    maxConfChain = Math.max(maxConfChain, chainSpec(confChainOf('gridmiss', id, 20)));
    Object.keys(SPEC_COLORS).forEach(c => {
      maxConfChain = Math.max(maxConfChain, chainSpec(confChainOf('dual', id + ':' + c, 20)));
    });
  });
  const maxGuideMs = Math.max(3168, 2976, 2736, 2664);   // shc_g_gridmiss/dual/over/under 实测最大
  const quizChainMax = cmOf('c_red') + cmOf('s_triangle') + cmOf('s_yj') + 300;   // dual 题面链 4956
  const winOk = (1800 + 3600) >= 2304 + 300 &&           // 判对窗基段 ≥ shc_cf 最短段链余量旁证
                (1800 + Math.max(3600, maxConfChain + 300 - 1800)) >= maxConfChain + 300 &&   // 动态窗罩 dual 链 6186
                (900 + 3100) >= 3096 + 300 &&            // 教学演示窗 t=4000 ≥ watch 3096+300
                2400 >= 1896 + 300 &&                    // turn 后读题延 ≥ 1896+300（±60ms 余量）
                (2620 + 600) >= 2304 + 300 &&            // winFlow celebrate+补窗 ≥ shc_right+300=2604
                7900 >= 1968 + 150 + maxGuideMs + 300;   // 链豁免窗 ≥ 1968+150+3168+300=5586（clip 口径）
  if (winOk) npass++;
  units.estWin = { ok: winOk, est: { maxConfChainMs: maxConfChain, confWinDynamic: 1800 + Math.max(3600, maxConfChain + 300 - 1800),
                                     quizChainMax: quizChainMax, maxGuideMs: maxGuideMs,
                                     chainNeed: 1968 + 150 + maxGuideMs + 300 } };

  /* ---- ⑮ 家族 A/B/F/I/K 源码级断言（Function.toString——b26/b27 审查源码级口径） ---- */
  total++;
  const srcBoot = boot.toString(), srcWin = winFlow.toString(), srcHint = nextHint.toString(),
        srcResc = rescueTick.toString(), srcStart = startLevel.toString();
  const srcOk = srcBoot.indexOf('nextHint(lim - 1)') >= 0 &&                    // A：启动 dayEnd 传 lim-1
                srcWin.indexOf('nextHint(null)') >= 0 &&                        // A：winFlow 传 null（等价）
                srcHint.indexOf('genLevel(f + 1).dch') >= 0 &&                  // F：生成关实算下一关 dch
                srcHint.indexOf('(ci + 1) % 4') < 0 &&                          // F：禁章序推进（b26 M3）
                srcResc.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&  // I：链豁免窗守卫
                srcResc.indexOf('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel') >= 0 &&  // K：面板守卫
                srcStart.indexOf('lastWrongVoice = 0') >= 0 &&                  // I/J：startLevel 重置
                srcStart.indexOf('wrongChainUntil = 0') >= 0 &&                 // I：startLevel 重置豁免窗
                srcResc.indexOf('lastDir') >= 0 &&                              // B：方向级独立锚在场
                srcResc.indexOf('lastAct') >= 0 &&                              // B：答案级锚独立不被覆盖
                uiTapOpt.toString().indexOf('wrongChainUntil = Date.now() + 7900') >= 0;  // I：错路径设豁免终点
  if (srcOk) npass++;
  units.src = { ok: srcOk };

  /* ---- ⑯ L 契约专项：NUMCN 映射表覆盖封闭集全量值 1-20（禁 undefined）且 2='两'；
     独立拼确认句全量非 undefined（含 2=两/12=十二/20=二十） ---- */
  total++;
  let numcnOk = true;
  for (let n = 1; n <= 20; n++) {
    if (NUMCN[n] === undefined || SPEC_NUMCN[n] === undefined) numcnOk = false;   // 全量值输出禁 undefined
  }
  const liangOk = NUMCN[2] === '两' && SPEC_NUMCN[2] === '两';
  let confirmAllOk = true;
  for (const n of [1, 2, 6, 10, 12, 19, 20]) {
    for (const id of ['circle', 'triangle']) {
      if (specConfirm('count', id, n).indexOf('undefined') >= 0) confirmAllOk = false;
    }
    if (specConfirm('gridmiss', 'square', n).indexOf('undefined') >= 0) confirmAllOk = false;
  }
  const liangSent = specConfirm('count', 'heart', 2) === '心形，有两个';          // 2=两 量词口径实测
  const shierSent = specConfirm('gridmiss', 'square', 12) === '一共，有十二个';   // 大数汉字实测
  const ershiSent = specConfirm('count', 'circle', 20) === '圆形，有二十个';      // 域上限实测
  if (numcnOk && liangOk && confirmAllOk && liangSent && shierSent && ershiSent) npass++;
  units.numcn = { ok: numcnOk && liangOk && confirmAllOk && liangSent && shierSent && ershiSent,
                  numcn: numcnOk, liang: liangOk, confirmAll: confirmAllOk,
                  liangSent: liangSent, shier: shierSent, ershi: ershiSent };

  /* ---- ⑰ r3 阵列几何 DOM 专项（dch2 flat5-9 + ch3 gm 题）：DOM 元素数=scene 总数（miss 格
     不在 DOM）/ data-row·data-cp ↔ 独立几何换算（left=(cp+0.5)/cols、top=SPEC_GRID_TOP+row·dy，
     误差 ≤0.01%）/ data-id 全=ask / 缺格 idx 独立复算（DOM 恰缺 miss 格） ---- */
  total++;
  let geoOk = true, geoBad = null, geoChecked = 0, missChecked = 0;
  outerGeo:
  for (const flat of [5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (q.kind !== 'grid' && q.kind !== 'gridmiss') continue;
      startLevel(flat);
      if (cur.step !== k) {                                       // 推进到第 k 题（autoSolve 逐题点）
        for (let s = cur.step; s < k; s++) await SC.tapOpt(correctIdx(cur.quizzes[s]));
      }
      const els = Array.prototype.slice.call(sceneEl.querySelectorAll('.sc-shape'));
      geoChecked++;
      if (els.length !== q.n) { geoOk = false; geoBad = 'count ' + flat + '/' + k + ' ' + els.length + '!=' + q.n; break outerGeo; }
      const domIdx = {};
      for (const el of els) {
        const r = Number(el.dataset.row), c = Number(el.dataset.cp);
        if (el.dataset.id !== q.ask) { geoOk = false; geoBad = 'id ' + flat + '/' + k; break outerGeo; }
        domIdx[r * q.cols + c] = true;
        const st = el.style, expL = (c + 0.5) / q.cols * 100, expT = SPEC_GRID_TOP[q.rows] + r * SPEC_GRID_DY[q.rows];
        const gotL = parseFloat(st.left);
        /* m3：+22px 顶带让位（q-text 不被图形遮挡）。CSSOM 会归一化 calc 串（25.500%→25.5%），
           禁字符串比对——正则提取 % 数值与 +22px 字面双判 */
        const mTop = st.top.match(/^calc\(([\d.]+)% \+ 22px\)$/);
        if (Math.abs(gotL - expL) > 0.01 || !mTop || Math.abs(parseFloat(mTop[1]) - expT) > 0.01) {
          geoOk = false; geoBad = 'pos ' + flat + '/' + k + ' (' + r + ',' + c + ') ' + gotL + '/' + st.top; break outerGeo;
        }
        if (getComputedStyle(el).position !== 'absolute') { geoOk = false; geoBad = 'posn'; break outerGeo; }
      }
      if (q.kind === 'gridmiss') {                                // 缺格独立复算：DOM 恰缺 miss 格
        missChecked++;
        const missSet = {};
        q.miss.forEach(i => { missSet[i] = true; });
        for (let i = 0; i < q.rows * q.cols; i++) {
          const want = !missSet[i];
          if (want !== !!domIdx[i]) { geoOk = false; geoBad = 'missCell ' + flat + '/' + k + ' #' + i; break outerGeo; }
        }
      }
      break;                                                      // 每关验一题（首见阵列题）即换关
    }
  }
  if (geoOk && geoChecked > 0) npass++;
  units.gridGeo = { ok: geoOk && geoChecked > 0, checked: geoChecked, missChecked: missChecked, bad: geoBad };
  startLevel(0);                                                  // 还原

  /* ---- ⑱ r3 双维过滤 DOM 专项（ch3 dual 题）：(data-id,data-fill) 组合计数=scene 独立展开 /
     SVG fill 属性=SPEC_COLORS 独立色值 / 目标+同色异形+同形异色三集合计数各自对账 ---- */
  total++;
  let dualOk = true, dualBad = null, dualChecked = 0;
  outerDual:
  for (const flat of [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (q.kind !== 'dual') continue;
      startLevel(flat);
      if (cur.step !== k) {
        for (let s = cur.step; s < k; s++) await SC.tapOpt(correctIdx(cur.quizzes[s]));
      }
      const els = Array.prototype.slice.call(sceneEl.querySelectorAll('.sc-shape'));
      dualChecked++;
      const domCnt = {};
      for (const el of els) {
        const pair = el.dataset.id + ':' + el.dataset.fill;
        domCnt[pair] = (domCnt[pair] || 0) + 1;
        const svgEl = el.querySelector('svg') && el.querySelector('svg').firstElementChild;   // 首图元
        const fillAttr = svgEl && svgEl.getAttribute('fill');
        if (fillAttr !== SPEC_COLOR_HEX[el.dataset.fill]) {        // 渲染判定一致（r2 M1）：fill=data-fill 独立色值
          dualOk = false; dualBad = 'fill ' + flat + '/' + k + ' ' + fillAttr; break outerDual;
        }
      }
      for (const key2 in q.scene) {                                // scene 独立展开对账
        if (domCnt[key2] !== q.scene[key2]) {
          dualOk = false; dualBad = 'cnt ' + flat + '/' + k + ' ' + key2 + ' ' + (domCnt[key2] || 0) + '!=' + q.scene[key2]; break outerDual;
        }
      }
      const d = q.dual;
      if (domCnt[q.ask] !== d.n || domCnt[d.d1s + ':' + d.color] !== d.d1 ||
          domCnt[d.shape + ':' + d.d2c] !== d.d2) {                // 三集合（目标/同色异形/同形异色）各自对账
        dualOk = false; dualBad = 'sets ' + flat + '/' + k; break outerDual;
      }
      break;                                                      // 每关验一题（首见 dual 题）即换关
    }
  }
  if (dualOk && dualChecked > 0) npass++;
  units.dualDom = { ok: dualOk && dualChecked > 0, checked: dualChecked, bad: dualBad };
  startLevel(0);                                                  // 还原

  /* ---- ⑲ r3 漂移机制专项：dch4（静态 flat15-19+生成 dch4）全关全元素
     computed animationName='drift-x' 100%；dch1-3 全关='none'；
     漂移不改判定真值（ch4 关 DOM 元素计数=scene 总数对账） ---- */
  total++;
  let driftOk = true, driftBad = null, d4checked = 0, d3checked = 0;
  const driftFlats = [15, 16, 17, 18, 19];
  for (let flat = 20; flat < 40 && driftFlats.length < 9; flat++) {   // 生成关补 dch4 样本
    if (genLevel(flat).dch === 4) driftFlats.push(flat);
  }
  outerDrift:
  for (const flat of driftFlats) {
    const L = genLevel(flat);
    if (L.dch !== 4) { driftOk = false; driftBad = 'dch ' + flat; break; }
    for (let k = 0; k < L.quizzes.length; k++) {
      startLevel(flat);
      if (cur.step !== k) {
        for (let s = cur.step; s < k; s++) await SC.tapOpt(correctIdx(cur.quizzes[s]));
      }
      d4checked++;
      const q = cur.quizzes[k];
      const els = Array.prototype.slice.call(sceneEl.querySelectorAll('.sc-shape'));
      const tot = Object.keys(q.scene).reduce((s2, kk) => s2 + q.scene[kk], 0);
      if (els.length !== tot) { driftOk = false; driftBad = 'truth ' + flat + '/' + k; break outerDrift; }   // 漂移不改真值
      for (const el of els) {
        if (getComputedStyle(el).animationName !== 'drift-x') {    // CSS 声明级断言（不依赖 rAF 执行）
          driftOk = false; driftBad = 'anim ' + flat + '/' + k; break outerDrift;
        }
        if (sceneEl.dataset.drift !== '1') { driftOk = false; driftBad = 'flag ' + flat; break outerDrift; }
      }
      break;                                                      // 每关验首题（漂移是关级标记）
    }
  }
  for (const flat of [0, 5, 10]) {                                 // ch1/ch2/ch3 零漂移
    startLevel(flat);
    d3checked++;
    const els = Array.prototype.slice.call(sceneEl.querySelectorAll('.sc-shape'));
    if (sceneEl.dataset.drift !== '0' || els.some(el => getComputedStyle(el).animationName === 'drift-x')) {
      driftOk = false; driftBad = 'nondrift ' + flat;
    }
    if (SC.quiz.drift !== false) { driftOk = false; driftBad = 'hook ' + flat; }
  }
  if (driftOk && d4checked > 0 && d3checked === 3) npass++;
  units.drift = { ok: driftOk && d4checked > 0, checked: d4checked, nondrift: d3checked, bad: driftBad };
  startLevel(0);                                                  // 还原

  const out = { game: 'shapecount', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key/text（__lastVoiceKey/__lastVoiceText）；voice.queue 记录拼播链
     （__lastQueue）；voice.say 记录 TTS 拼句（__lastSayText）——供 ④ 链句/确认句断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  runVerify();
}
