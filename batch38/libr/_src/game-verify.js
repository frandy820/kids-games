/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元
   （R48 难度批改造：恒四格+维度句去泄漏+跨维二级题 pick 双题型）
   ① structure：图卡 32/标签牌 4 SVG 全定义（data-anim 渲染即引擎）、DOM 无
      undefined 文本、clips 16 条（lb_ 13+core 3——段二注册后口径，r48-fix m4 注释
      销账：原「12 条段一未注册」时态过时）+duration 辨别器（±60ms）、
      answer 独立推导（sort=shelf.indexOf(卡主题)/pick=盘内唯一目标卡下标）、
      双 viewport（1280×800/800×1180）×（flat0 sort/flat10 维度/flat15 pick
      布局——书架格 ≥96×96、pick 盘卡 ≥96×96、描边对比度 ≥3:1、overflowX ≤0）
   ② tutorial：教学三段（watch=卡出→幽灵手指点正确格→书立起→__lbDemoR
      ='shelved'；turn=row0 首题你来放一放；帮→首对独 __lbTutSolo+进正式关
      flat=0 n=5；教学迷你关恒两格（降坡锚——正式关四格的坡度缓冲）；
      watch 段实测折算 ≤16s——单步演示款）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null（含 pick
      分支定约）/章号映射 ch=flat/5+1/取材域=kind+card+hint 联合反查 SPEC 全表
      行号落章池（b36 坑③：禁 idx 公式锁实现取材序）/answer 唯一性对账（双题型
      独立推导禁读直比）/引擎直驱（sort→engTapShelf/pick→engTapCard）→
      shelved/末题 done→3 星
   ④ frameM（契约 M 帧内容三层 ×flat0/10/15/20）：数值层 sceneEl.dataset.scene+
      格 DOM 数+题面 say 真值（play 锚 __lastVoiceText/__lastVoiceKey===quiz.say/
      sayKey——R48 含 lb_d2_* 与 lb_pick_*）/DOM 类层 sort=题面态 #card-big 无
      fly/back；pick=.tray 盘 3 卡 data-anim=盘序卡+目标格 .target/演出层
      sort=点正确格→目标格 .good+.bk 入列+#card-big.fly；pick=点正确卡→
      卡 .fly+目标格 .good+.bk 入列（格内堆叠 DOM 断言——SPEC §2 契约 M libr 锚）
   ⑤ wrongPath：错路径+豁免窗（真时钟 4170）双题型——sort 错格 'wrong'+miss 计数
      +错链 [lb_wrong,lb_hint] 全 clip；豁免窗内二击吞 false 且 miss 不变；窗内
      正确放行 'shelved'；窗后第二错照计 miss=2（契约 I 补）+答案体 breathe；
      pick 干扰卡错击同构+**点干扰卡不播词**（__voiceHist 全集 ⊆ 封闭键宇宙
      ——R48 任务书#11：干扰词无键不点的基线规则保持）
   ⑥ pool：题库 20 题对账（SPEC-R48 §R4 全表独立硬编码——sort 行 card+hint/
      pick 行 target+cards 逐条，禁读页面真值当期望源）+维度裁定定约（hint 行
      CARDS.theme===DIM2_TARGET[hint] 全枚举）+冲突行计数 11/20>半（AUDIT-67
      「冲突卡升半数以上」）+pick 候选定约（恰一张属目标格/干扰主题互异）+
      20 静态关 rotate 覆盖审计（每题恰现 5 次）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32
      (flat*7919+837) python 式 JS 复刻）——verify 独立复算第一个随机数==dch
      +四档全现+格数恒 4+池域=本章 rows[(dch-1)*5..dch*5-1]（R48 四型池分章）
      +确定性（同 flat 两次生成 JSON 相等）+无放回（同关 5 题互异）
      +分布断言（r39-bis 纪律：洗牌必配直方图，下界从均匀期望独立推导）：
      sort 答案位 4 桶各 ≥17（期望 140/4=35，取半）/pick 答案位 3 桶各 ≥10
      （期望 60/3=20，取半）/pick 目标 4 主题各 ≥5（静态 rotate 数学下界——
      每行恰现 5 次，可证非统计）
   ⑨ windows+contract：错链豁免窗 ==4170（=1728+150+1992+300）+确认窗
      ==1836（=1536+300）+书立起窗 1000+确认 2836+首错锁 ≤1878（b37 R3）+
      教学延窗+celebrate 窗+契约 A/B/C/D/E/F/I/J/K 源码断言
      （读 script[2] 合并文本——b36 M1 分离后恢复判别力；肯定断言检索字面逐条
      与 main 真源核对）+R48 双题型引擎锚（engTapCard/tapCard/DIM2_TARGET/
      tray-card 事件分流）+CHAPTERS/GEN_HINTS 双录+nextHint 4/9/14/19
      数值断言+24/29/34/39 实算（b35 m5 范式）
   ⑩ confirmChain：确认链构成 __lastQueue===['lb_right']（right 单 clip 全 clip
      无 keyless——题面提示句走 voice.play 不动 __lastQueue，SPEC §2 明示）
   ⑪ save：真实写档链（init libr→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_libr v:'1.0' levels['1-0'] 更新；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（row0 小猫/**恒 4 格**（R48）/step=0/answer 独立推导）
      +window.LB 真实页暴露含 tapCard（b29 坑⑥）；try/finally 保异常时 origLS
      也恢复（b36 m4）
   结果写 #verify-result + window.__lbVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-R48 §R4 文字独立重列（禁抄页面 VOICE/CHAPTERS/常量/题库） */
  const SPEC_DUR = { lb_tut_watch: 2976, lb_tut_turn: 1776, lb_hint: 1992,
                     lb_right: 1536, lb_wrong: 1728,
                     lb_d2_farm: 2064, lb_d2_eat: 1752, lb_d2_pet: 2256, lb_d2_wear: 2568,
                     lb_pick_animal: 2688, lb_pick_food: 2664, lb_pick_clothes: 2664,
                     lb_pick_vehicle: 2760 };   // 在册 13（R48 段二注册后实长——真值源 r4789_clip_ms.json
                                             // mutagen 口径回填；旧 lb_dim_* 4 键已退役清退）
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_CH = { 1: { n: 4 }, 2: { n: 4 }, 3: { n: 4 }, 4: { n: 4 } };   // R48 恒四格
  const SPEC_CHAPTER_HINTS = { 1: '听一听提示，想一想它住哪一格', 2: '有些书有两个家，听提示再放哦',
                               3: '反过来，帮书格挑一本新书啦', 4: '新的书来啦，继续帮它回家' };
  const SPEC_GEN_HINTS = ['四个书格，看清标签牌', '听提示，想想它是哪一类',
                          '两个家的书，听提示再放', '帮书格挑一本新书'];
  /* SPEC-R48 §R4 提示句表独立重列（普通句 6 字/维度句 5-8 字去泄漏/pick 句 9 字——r48-fix m5 勘正） */
  const SPEC_NORM = '它住哪一格呢';
  const SPEC_DIM2 = { farm: '它住在农场里', eat: '我们能吃它',
                      pet: '它是我们的好朋友', wear: '天冷了要穿上它' };
  /* 维度裁定定约（SPEC-R48 §R4：hint→唯一归属格——两义性收口） */
  const SPEC_DIM2_TARGET = { farm: 'animal', eat: 'food', pet: 'animal', wear: 'clothes' };
  const SPEC_PICK = { animal: '帮动物格挑一本新书', food: '帮食物格挑一本新书',
                      clothes: '帮衣物格挑一本新书', vehicle: '帮交通格挑一本新书' };
  /* SPEC §2 卡池归属独立硬编码（32 卡主题互斥；R48 维度行归属=定约裁定后格） */
  const SPEC_THEME = { cat: 'animal', dog: 'animal', cow: 'animal', chick: 'animal',
                       goldfish: 'animal', elephant: 'animal', rabbit: 'animal', bird: 'animal',
                       apple: 'food', carrot: 'food', bread: 'food', egg: 'food',
                       milk: 'food', banana: 'food', rice: 'food', cake: 'food',
                       coat: 'clothes', shoe: 'clothes', hat: 'clothes', skirt: 'clothes',
                       glove: 'clothes', scarf: 'clothes', sock: 'clothes', sweater: 'clothes',
                       car: 'vehicle', bus: 'vehicle', bike: 'vehicle', plane: 'vehicle',
                       ship: 'vehicle', train: 'vehicle', ambulance: 'vehicle', firetruck: 'vehicle' };
  /* SPEC-R48 §R4 20 题全表（sort 行 card+hint / pick 行 pick+cards 逐行——联合
     反查唯一定位；冲突行 11/20>半） */
  const SPEC_QUESTIONS = [
    { card: 'cat',      hint: 'none' }, { card: 'apple',    hint: 'none' },
    { card: 'coat',     hint: 'none' }, { card: 'car',      hint: 'none' },
    { card: 'chick',    hint: 'farm' },
    { card: 'goldfish', hint: 'pet' },  { card: 'banana',   hint: 'eat' },
    { card: 'hat',      hint: 'wear' }, { card: 'cow',      hint: 'farm' },
    { card: 'rice',     hint: 'eat' },
    { card: 'egg',      hint: 'eat' },  { card: 'dog',      hint: 'pet' },
    { card: 'scarf',    hint: 'wear' }, { card: 'milk',     hint: 'eat' },
    { card: 'rabbit',   hint: 'pet' },
    { pick: 'food',    cards: ['apple', 'rabbit', 'train'] },
    { pick: 'clothes', cards: ['scarf', 'dog', 'bus'] },
    { pick: 'animal',  cards: ['elephant', 'bread', 'shoe'] },
    { pick: 'vehicle', cards: ['plane', 'milk', 'hat'] },
    { pick: 'food',    cards: ['carrot', 'bird', 'sweater'] }
  ];
  const SPEC_SHELF_SET4 = ['animal', 'clothes', 'food', 'vehicle'];   // 恒四格主题集（排序比对）
  /* 封闭键宇宙（⑤ pick 段「点干扰卡不播词」断言：全史 ⊆ 本集=无卡词键可播） */
  const SPEC_KEY_UNIVERSE = ['lb_tut_watch', 'lb_tut_turn', 'lb_hint', 'lb_right', 'lb_wrong',
    'lb_d2_farm', 'lb_d2_eat', 'lb_d2_pet', 'lb_d2_wear',
    'lb_pick_animal', 'lb_pick_food', 'lb_pick_clothes', 'lb_pick_vehicle'].concat(SPEC_CORE_KEYS);
  const estMsV = n => n.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* 独立 rng（SPEC §0.92 生成关策略）：mulberry32(flat*7919+837)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* 独立推导（SPEC-R48 §R5 钩子契约）：
     sort → answer=shelf.indexOf(SPEC 卡归属主题)；pick → answer=盘内唯一属目标格卡下标 */
  const deriveAnswerV = quiz => {
    if (!quiz || !quiz.shelf) return -1;
    if (quiz.kind === 'pick')
      return quiz.cards.findIndex(c => SPEC_THEME[c] === quiz.target);
    return quiz.shelf.indexOf(SPEC_THEME[quiz.card]);
  };
  /* 联合反查 SPEC 全表行号（b36 坑③：不写 idx 公式锁实现取材序）：sort=card+
     hint（同卡不同 hint 唯一定位）；pick=target+cards 集合（同目标不同候选集唯一定位） */
  const rowOfV = (quiz) => {
    const hit = [];
    for (let i = 0; i < SPEC_QUESTIONS.length; i++) {
      const s = SPEC_QUESTIONS[i];
      if (quiz.kind === 'pick') {
        if (s.pick === quiz.target &&
            s.cards.slice().sort().join('|') === quiz.cards.slice().sort().join('|')) hit.push(i);
      } else if (!s.pick && s.card === quiz.card && s.hint === quiz.hint) hit.push(i);
    }
    return hit.length === 1 ? hit[0] : -1;       // 非唯一=域约束失败
  };
  const specSayV = row => {
    const s = SPEC_QUESTIONS[row];
    if (s.pick) return SPEC_PICK[s.pick];
    return s.hint === 'none' ? SPEC_NORM : SPEC_DIM2[s.hint];
  };
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链豁免窗（真时钟 4170）过
    let g = 0;
    while (wrongChainUntil && Date.now() < wrongChainUntil && g++ < 60) await wait(250);
    return !(wrongChainUntil && Date.now() < wrongChainUntil);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即
     return 丢弃后续段——凡含 keyless 段的 queue 链中该段必须居末元素（本款确认链/
     错链全 clip 天然安全；断言器留作防回归） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);

  /* ---- ① structure：SVG 定义+DOM 干净+clips 全注入+answer 独立推导+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.LB.quiz;
  const slotDom = Array.from(shelfEl.querySelectorAll('.shelf-slot'));
  const SPEC_CARDS = Object.keys(SPEC_THEME);
  const svgOk = q1 && slotDom.length === q1.shelf.length &&
    slotDom.every((s, i) => {
      const g = s.querySelector('.slot-tag svg');
      return Number(s.dataset.i) === i && !!g && !!s.querySelector('.slot-tag b');
    }) &&
    !!cardBigEl.querySelector('svg > g[data-anim]') &&                    // 当前卡根组锚
    cardBigEl.querySelector('svg > g[data-anim]').dataset.anim === q1.card &&   // 渲染即引擎
    SPEC_CARDS.every(id => cardSvg(id).indexOf('<svg') === 0) &&          // 图卡 32 张全定义
    THEMES.every(t => tagSvg(t.id).indexOf('<svg') === 0) &&              // 标签牌 4 主题全定义
    SPEC_QUESTIONS.every(row => (row.pick ? row.cards : [row.card]).every(c => cardSvg(c).indexOf('<svg') === 0)) &&   // 题库行卡全可渲（含 pick 候选）
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answer 独立推导（SPEC-R48 唯一解锚——禁读 quiz.answer 直比推导依据） */
  const ansDeriveOk = q1 && q1.kind === 'sort' && q1.answer === deriveAnswerV(q1) &&
                      q1.shelf.length === 4 &&
                      q1.shelf.slice().sort().join('|') === SPEC_SHELF_SET4.join('|');
  /* clips：在册 16（lb_ 13+core 3）全注入+lb 实长辨别（SPEC §4 实长表 ±60ms；core 3 条只验
     在场——core 实长不在本批实长表，禁猜值断言；R48 新键 8 条段二已注册——实长真值源
     r4789_clip_ms.json（mutagen）回填 SPEC_DUR；lb_dim_* 4 旧键退役，keysAll 内不得再在） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const preOk = keysAll.length === 16 &&
    keysAll.every(k => k.indexOf('lb_dim_') !== 0) &&
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 sort/flat10 维度句/flat15 pick）——书架格=主答案
     目标 ≥96×96；pick 盘卡 ≥96×96（R48 新增量测面） */
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
    const wraps = Array.from(shelfEl.querySelectorAll('.shelf-slot'));
    const trayCards = Array.from(cardBigEl.querySelectorAll('.tray-card'));
    if (g._simFlat >= 20)   /* m4 守卫：生成关 dch 随机禁按静态档硬算 need（防假阴性）——直接判不过 */
      return { vp: w + 'x' + h, flat: g._simFlat, slots: wraps.length, hitOk: false, contrast: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    const need = SPEC_CH[Math.floor(g._simFlat / 5) + 1].n;    // 静态档格数独立复算（R48 恒 4）
    const hitOk = wraps.length === need && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const trayOk = trayCards.length === 0 || (trayCards.length === 3 &&
                   trayCards.every(b => Math.min(b.offsetWidth, b.offsetHeight) >= 96));
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 格描边对比度
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, slots: wraps.length, hitOk: hitOk,
             contrast: cB, ox: ox, pass: hitOk && trayOk && cB && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10, 15]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);
  await unlocked();
  const layoutOk = sims.every(s => s.pass);
  const s1ok = svgOk && cleanDom && ansDeriveOk && preOk && durOk && layoutOk;
  if (s1ok) npass++;
  units.structure = { ok: s1ok, svg: svgOk, dom: cleanDom, ansDerive: ansDeriveOk,
                      clips: preOk, dur: durOk, layout: layoutOk, sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（看→帮→独）——迷你关恒两格（R48 降坡锚） ---- */
  total++;
  window.__lbOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__lbTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__lbWatchMs || 1e9) / SPEED;       // watch 段实测（家族预算 ≤16s 只罩 watch）
  const tutHelp = window.__lbDemoR === 'shelved' && state.tut === 'help' &&
                window.LB.currentLevel.flat === -1 &&
                window.LB.quiz.card === 'cat' && window.LB.quiz.shelf.length === 2 &&
                twWatch <= 16000 && tw <= 26000;
  await unlocked();
  const qT = window.LB.quiz;                                // "帮"阶段放手题（row0 小猫）
  const rT = await window.LB.tapShelf(deriveAnswerV(qT));   // 首次归对（独立推导正确格）→ 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__lbTutSolo === true &&
                window.LB.currentLevel.flat === 0 && window.LB.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__lbDemoR, tut: state.tut,
                     solo: window.__lbTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT };

  /* ---- ③ drive：静态 20 关全量审计+SPEC 取材域反查对账（双题型独立推导，禁读直比） ---- */
  total++;
  const levelsRec = {};
  let badCase = null;
  for (let flat = 0; flat < 20; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch);
      if (why) { badCase = 'struct ' + flat + '/' + k + ':' + why; ruleOk = false; }
    }
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算（ch=flat/5+1）
    const chOk = L1.ch === expCh;
    const dchOk = L1.dch === expCh;                               // 静态四档 dch===ch
    /* SPEC-R48 取材域对账（b36 坑③禁 idx 公式锁取材序）：每题联合反查 SPEC 全表
       行号 → 行号必须落本章程（(ch-1)*5..ch*5-1）——pick 行 target+cards、sort 行
       card+hint 联合反查唯一定位，既验域又不锁实现取材序 */
    let sceneOk = true;
    for (let qi = 0; qi < 5; qi++) {
      const q = L1.quizzes[qi];
      const proj = { kind: q.kind, card: q.card, hint: q.hint, target: q.target, cards: q.cards };
      const row = rowOfV(proj);
      if (row < 0 || row < (expCh - 1) * 5 || row >= expCh * 5) {
        badCase = 'scene ' + flat + '/' + qi + ' row=' + row; sceneOk = false; break;
      }
    }
    /* 引擎直驱（双题型）：逐题点答案体（独立推导）→ shelved / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const goodI = q.kind === 'pick'
        ? q.cards.findIndex(c => SPEC_THEME[c] === q.target)     // pick：盘内唯一目标卡（独立推导）
        : q.shelf.indexOf(SPEC_THEME[q.card]);                   // sort：shelf.indexOf(卡主题)（独立推导）
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'shelved';
      if (goodI < 0 || q.answer !== goodI) { driveOk = false; break; }
      const r = q.kind === 'pick' ? engTapCard(L3, goodI) : engTapShelf(L3, goodI);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && ruleOk && chOk && dchOk && sceneOk && driveOk && solvedAll;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
  }
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]);
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase };

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0/10/15/20：数值/DOM 类/演出层·双题型） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.LB.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    const row = rowOfV({ kind: q.kind, card: q.card, hint: q.hint, target: q.target, cards: q.cards });
    /* 数值层：row 锚+格 DOM 数+题面 say 真值（play 锚 __lastVoiceText/__lastVoiceKey） */
    const numOk = Number(sceneEl.dataset.scene) === row &&
                  shelfEl.querySelectorAll('.shelf-slot').length === q.shelf.length &&
                  Number(shelfEl.dataset.n) === q.shelf.length &&
                  window.__lastVoiceText === q.say &&
                  window.__lastVoiceKey === q.sayKey &&
                  q.say === specSayV(row) &&
                  Array.from(shelfEl.querySelectorAll('.shelf-slot')).every((s, i) =>
                    !!shelfEl.querySelector('.shelf-slot[data-i="' + i + '"]') && Number(s.dataset.i) === i);
    /* DOM 类层：sort=题面态（容器无 fly/back）；pick=.tray 盘 3 卡 data-anim=盘序卡+
       目标格 .target 标记+提示牌文本=题面真值 */
    const cardOk = q.kind === 'pick'
      ? cardBigEl.classList.contains('tray') &&
        Array.from(cardBigEl.querySelectorAll('.tray-card')).length === 3 &&
        Array.from(cardBigEl.querySelectorAll('.tray-card')).every((el, i) => {
          const g = el.querySelector('svg > g[data-anim]');
          return Number(el.dataset.i) === i && g && g.dataset.anim === q.cards[i];
        }) && !!shelfEl.querySelector('.shelf-slot.target') &&
        shelfSlotAt(q.shelf.indexOf(q.target)).classList.contains('target')
      : !cardBigEl.classList.contains('fly') && !cardBigEl.classList.contains('back') &&
        hintEl.textContent === q.say;
    /* 演出层：点答案体（独立推导）→ 演出中段采样——sort=目标格 .good+书立起 .bk 入列
       +#card-big.fly；pick=正确卡 .fly+目标格 .good+.bk 入列（契约 M libr 锚：
       格内已归卡堆叠可视化）（tapX resolve 后非末题会 presentQuiz 新题重置 DOM
       ——断言须在演出窗内做） */
    const goodI = deriveAnswerV(q);
    const tgtSlot = q.kind === 'pick' ? shelfSlotAt(q.shelf.indexOf(q.target)) : shelfSlotAt(goodI);
    const bk0 = tgtSlot ? tgtSlot.querySelectorAll('.bk').length : -1;
    const pF = q.kind === 'pick' ? window.LB.tapCard(goodI) : window.LB.tapShelf(goodI);   // fire（演出开始）
    await wait(250);                            // 演出中段（书立起+确认窗 ~340ms@SPEED.12 内）
    const goodOk = !!tgtSlot && tgtSlot.classList.contains('good');
    const bookOk = !!tgtSlot && tgtSlot.querySelectorAll('.bk').length === bk0 + 1 &&    // 书立起 DOM 断言
                   !!tgtSlot.querySelector('.bk.book-in');
    const flyOk = q.kind === 'pick'
      ? !!(trayCardAt(goodI) && trayCardAt(goodI).classList.contains('fly'))
      : cardBigEl.classList.contains('fly');
    const r = await pF;
    const joyOk = r === 'shelved' || r === 'done';
    return { ok: numOk && cardOk && joyOk && goodOk && bookOk && flyOk,
             why: JSON.stringify({ numOk, cardOk, joyOk, goodOk, bookOk, flyOk, r }) };
  }
  const fA = await frameCheck(0);      // ch1 sort 普通句（四格）
  const fB = await frameCheck(10);     // ch3 维度句（egg/eat——lb_d2_eat 帧）
  const fC = await frameCheck(15);     // ch4 pick（跨维二级题帧）
  const fD = await frameCheck(20);     // 生成关（dch3——帧断言不依赖章型）
  const frameOk = fA.ok && fB.ok && fC.ok && fD.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat15: fC, flat20: fD };

  /* ---- ⑤ wrongPath：错路径+豁免窗（真时钟 4170）双题型 + pick 干扰卡不播词 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.LB.quiz;
  const badTap = (await window.LB.tapShelf(99)) === null;           // 非法下标=null（不炸）
  const badI = q5.shelf.findIndex((t, i) => i !== q5.answer);       // 错格下标（独立推导补集）
  const pW = window.LB.tapShelf(badI);                              // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                             // 等卡弹回演出毕（locked=false）
  await unlocked();                                                // 等演出锁（showUntil 余窗）过——豁免窗仍在
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'lb_wrong' &&          // 错链头=wrong clip
                 h[1] === 'lb_hint' &&                             // 语义句=hint「它住哪一格呢」
                 h.every(p => typeof p === 'string') &&            // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const rejW = await window.LB.tapShelf(badI);                      // 豁免窗内错格二击=被吞 false（I 补：不计 miss）
  const miss1 = rW === 'wrong' && rejW === false && window.LB.quiz.miss === 1;
  const passW = await window.LB.tapShelf(q5.answer);                // 豁免窗内正确格=放行（I 补：缓解吞输入）→ 推进
  const passOk = passW === 'shelved' && window.LB.quiz.step === 1;
  await unlocked();                                                // 等新题开题演出完
  await waitChainOver();                                           // 等首错豁免窗（真时钟）过
  const q5b = window.LB.quiz;                                      // 题 1（域池内下一题）
  const badIb = q5b.shelf.findIndex((t, i) => i !== q5b.answer);
  const rD1 = await window.LB.tapShelf(badIb);                      // 题 1 首错（miss=1）
  await unlocked();
  await waitChainOver();                                           // 等本错豁免窗过——窗后二错照计 miss
  const rD2 = await window.LB.tapShelf(badIb);                      // 题 1 二错（miss=2）
  await unlocked();                                                // 等二错演出锁过
  const missAfter2 = window.LB.quiz.miss;                          // rE 前记录（好格推进会换题清零）
  const brEl = shelfSlotAt(q5b.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');   // miss≥2=正确格 breathe（答案级）
  const rE = await window.LB.tapShelf(q5b.answer);                  // 格不灰可重点（探索不罚）
  const sortWrongOk = badTap && miss1 && chainW && passOk &&
                  rD1 === 'wrong' && rD2 === 'wrong' &&
                  missAfter2 === 2 && breathe2 && rE === 'shelved';
  /* ⑤b pick 段：干扰卡错击同构 + 点干扰卡不播词（键宇宙断言） */
  startLevel(15);
  await unlocked();
  const hist0 = (window.__voiceHist || []).length;
  const qP = window.LB.quiz;
  const pickShape = qP && qP.kind === 'pick' && qP.cards.length === 3;
  const badP = qP.cards.findIndex((c, i) => i !== qP.answer);       // 干扰卡下标（补集）
  const pPW = window.LB.tapCard(badP);                              // 干扰卡 → wrong（fire）
  await wait(60);                                                   // 弹回窗内采样（.miss 于 BOUNCE_MS*SPEED=132ms 清除——采样须早于该点，r43 M4 同族口径）
  const wigP = !!(trayCardAt(badP) && trayCardAt(badP).classList.contains('miss'));   // 错卡轻晃
  const rP1 = await pPW;
  await unlocked();
  const missP1 = window.LB.quiz.miss === 1;
  const rejP = await window.LB.tapCard(badP);                       // 豁免窗内二击吞 false
  const passP = await window.LB.tapCard(qP.answer);                 // 窗内正确卡放行 → 推进
  const pickWrongOk = pickShape && rP1 === 'wrong' && rejP === false && missP1 &&
                      wigP && passP === 'shelved';
  const keyUnivOk = (window.__voiceHist || []).every(k => SPEC_KEY_UNIVERSE.indexOf(k) >= 0);
  const wrongOk = sortWrongOk && pickWrongOk && keyUnivOk;
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, miss1: miss1, chain: chainW,
                      rejInWin: rejW === false, passInWin: passOk, miss2: missAfter2 === 2,
                      breathe2: breathe2, right: rE,
                      pick: { shape: pickShape, r: rP1, rej: rejP === false, wig: wigP, pass: passP },
                      keyUniverse: keyUnivOk };

  /* ---- ⑥ pool：题库 20 题对账（SPEC-R48 §R4 全表独立硬编码——sort/pick 双形态逐条
       +维度定约+冲突计数>半+pick 候选定约） ---- */
  total++;
  let poolBad = null;
  for (let i = 0; i < 20 && !poolBad; i++) {
    const spec = SPEC_QUESTIONS[i], row = QUESTIONS[i];
    if (spec.pick) {
      if (!row.pick || row.pick !== spec.pick ||
          row.cards.slice().sort().join('|') !== spec.cards.slice().sort().join('|')) { poolBad = 'pick ' + i; break; }
      const th = spec.cards.map(c => SPEC_THEME[c]);
      if (th.filter(t => t === spec.pick).length !== 1 ||         // 恰一张属目标格
          new Set(th).size !== 3) { poolBad = 'pickTheme ' + i; break; }   // 三卡主题互异（干扰跨维）
    } else {
      if (row.card !== spec.card || row.hint !== spec.hint) { poolBad = 'row ' + i; break; }
      if (CARDS[row.card].theme !== SPEC_THEME[spec.card]) { poolBad = 'theme ' + i; break; }
      if (spec.hint !== 'none' && SPEC_THEME[spec.card] !== SPEC_DIM2_TARGET[spec.hint]) { poolBad = 'dimtarget ' + i; break; }   // 维度裁定定约全枚举
    }
    const say = sayOfRow(i);
    if (say !== specSayV(i)) { poolBad = 'say ' + i; break; }
    if (!spec.pick && spec.hint === 'none' && say !== SPEC_NORM) { poolBad = 'norm ' + i; break; }
  }
  /* 冲突行计数（AUDIT-67「冲突卡升半数以上」——独立从 SPEC 表数，非读实现） */
  const conflictN = SPEC_QUESTIONS.filter(s => !s.pick && s.hint !== 'none').length;
  const conflictOk = conflictN === 11 && conflictN > 10 &&
                     QUESTIONS.filter(q => !q.pick && q.hint !== 'none').length === conflictN;
  /* 维度句表+挑书句表双录（SPEC_DIM2/SPEC_PICK 独立硬编码对账） */
  const dimOk = DIM2_HINTS.farm === SPEC_DIM2.farm && DIM2_HINTS.eat === SPEC_DIM2.eat &&
                DIM2_HINTS.pet === SPEC_DIM2.pet && DIM2_HINTS.wear === SPEC_DIM2.wear &&
                DIM2_TARGET.farm === SPEC_DIM2_TARGET.farm && DIM2_TARGET.eat === SPEC_DIM2_TARGET.eat &&
                DIM2_TARGET.pet === SPEC_DIM2_TARGET.pet && DIM2_TARGET.wear === SPEC_DIM2_TARGET.wear &&
                PICK_HINTS.animal === SPEC_PICK.animal && PICK_HINTS.food === SPEC_PICK.food &&
                PICK_HINTS.clothes === SPEC_PICK.clothes && PICK_HINTS.vehicle === SPEC_PICK.vehicle;
  /* 20 题覆盖审计：静态 20 关每题恰现 5 次（§0.92 取题域全档成立——覆盖口径
     不锁取材序：只数每行出现次数，不验出现位置） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.row] = (cnt[q.row] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 && SPEC_QUESTIONS.every((s, i) => cnt[i] === 5);
  const poolOk = !poolBad && conflictOk && dimOk && coverOk;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, conflict: conflictOk, conflictN: conflictN,
                 dims: dimOk, cover: coverOk };

  /* ---- ⑦ stars：星级口径（0=3★/1-2=2★/≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑧ gen：生成关 flat20+（seeded ri(rnd,1,4) 独立复算+四档全现+本章池域+确定性
       +无放回+分布断言（r39-bis：洗牌必配直方图，下界独立推导）） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 837);      // SPEC §0.92：独立重写 rng（python 式复刻）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    const cfgN = SPEC_CH[L.dch].n;                   // 格数域：恒 4
    if (!L.quizzes.every(q => q.shelf.length === cfgN)) genBad.push(flat + ':slotsN');
    /* 池域：联合反查 SPEC 行号落本章池 rows[(dch-1)*5..dch*5-1]（R48 四型池分章）——b36 坑③反查口径 */
    if (!L.quizzes.every(q => {
      const row = rowOfV({ kind: q.kind, card: q.card, hint: q.hint, target: q.target, cards: q.cards });
      return row >= 0 && row >= (L.dch - 1) * 5 && row < L.dch * 5;
    })) genBad.push(flat + ':pool');
    const set = {};
    L.quizzes.forEach(q => { set[q.row] = 1; });
    if (Object.keys(set).length !== 5) genBad.push(flat + ':dupRow');             // 无放回抽 5 题
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  /* 分布断言（全域 40 关谱确定性直方图——下界从均匀期望独立推导）：
     sort 答案位 4 桶：期望 140/4=35，下界=floor(35/2)=17；
     pick 盘序答案位 3 桶：期望 60/3=20，下界=floor(20/2)=10；
     pick 目标 4 主题：静态 rotate 数学下界=每行恰现 5 次（可证）→ 每目标 ≥5 */
  const sortHist = [0, 0, 0, 0], pickHist = [0, 0, 0], pickTgt = {};
  let pickTotal = 0;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => {
      if (q.kind === 'pick') {
        pickHist[q.answer]++; pickTotal++;
        pickTgt[q.target] = (pickTgt[q.target] || 0) + 1;
      } else sortHist[q.answer]++;
    });
  }
  const histOk = sortHist.every(v => v >= 17) && pickHist.every(v => v >= 10) &&
                 ['animal', 'food', 'clothes', 'vehicle'].every(t => (pickTgt[t] || 0) >= 5);
  const genOk = genBad.length === 0 && distOk && histOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch,
                hist: { sort: sortHist, pick: pickHist, pickTgt: pickTgt, pickTotal: pickTotal } };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §4 实长表）+契约源码断言+双录+nextHint 实算 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = WRONG_CHAIN_WIN === 4170 &&                            // 豁免窗 ==4170 精确
                WRONG_CHAIN_WIN === D.lb_wrong + 150 + D.lb_hint + 300 &&   // =1728+150+1992+300
                CELE_WIN === 1836 && CELE_WIN === D.lb_right + 300 &&  // 确认窗=1536+300 精确
                SHELVE_MS === 1000 && SHELVE_MS + CELE_WIN === 2836 &&  // 书立起+确认=归对演出锁
                BOUNCE_MS <= D.lb_wrong + 150 &&                        // 首错锁 ≤1878（b37 R3）
                TUT_WATCH_WAIT >= D.lb_tut_watch + 300 &&              // watch 延 ≥3276
                TUT_TURN_WAIT >= D.lb_tut_turn + 300 &&                // turn 延 ≥2076
                (2620 + 400) >= D.lb_right + 300 &&                    // celebrate 3020 ≥ 1836
                estMsV('它住哪一格呢') === 6 * 345 + 600 &&        // estMs 全字符口径（普通句 6 字）
                estMsV('它住在农场里') === 6 * 345 + 600 &&        // R48 维度句（去泄漏版）
                estMsV('我们能吃它') === 5 * 345 + 600 &&          // R48 维度句最短
                estMsV('它是我们的好朋友') === 8 * 345 + 600 &&    // R48 维度句最长
                estMsV('天冷了要穿上它') === 7 * 345 + 600 &&
                estMsV('帮动物格挑一本新书') === 9 * 345 + 600;    // R48 pick 句 9 字
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'libr'") >= 0;               // C：本款存档键 kidsgame_libr
  const srcE = src.indexOf('sv.libr && sv.libr.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0;   // I 补：豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0 &&          // J：语义句 10s 节流在场
               src.indexOf('cur.flat < 3') >= 0;                            // J b36 m3：教学迷你关每错必播
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcD = src.indexOf("replayAnim(shelfEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
  /* SPEC §2/R48 方向级反馈=错链播毕重读题面句（clip 化 play——检索锚与 main 真源核对） */
  const srcDir = src.indexOf('KIDS.voice.play(q.sayKey, q.say)') >= 0 &&
                 src.indexOf('hintResayTimer') >= 0 &&
                 src.indexOf('WRONG_CHAIN_WIN + 60') >= 0;
  /* R48 双题型引擎锚：点卡入口/盘事件分流/答案体定位/维度定约（检索字面与真源核对） */
  const srcR48 = src.indexOf('function engTapCard(L, i)') >= 0 &&
                 src.indexOf('tapCard(i) { return uiTapCard(i); }') >= 0 &&
                 src.indexOf("e.target.closest('.tray-card')") >= 0 &&
                 src.indexOf('const answerElOf') >= 0 &&
                 src.indexOf('DIM2_TARGET[qs.hint]') >= 0 &&
                 src.indexOf("q.kind === 'pick' ? await uiTapCard(q.answer) : await uiTapShelf(q.answer)") >= 0;
  const srcHint = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // 双录独立硬编码对账
                  CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                  CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                  CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                  GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                  GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                  nextHint(4) === SPEC_CHAPTER_HINTS[1] && nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                  nextHint(14) === SPEC_CHAPTER_HINTS[3] && nextHint(19) === SPEC_CHAPTER_HINTS[4] &&   // 章末关 ci<4 → CHAPTERS[ci+1].hint（hint 字段语义=预告下一章）
                  nextHint(20) === GEN_HINTS[genLevel(21).dch - 1] &&
                  [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算（b35 m5 范式）
  const srcSpeed = SPEED === 0.12;                       // verify 提速
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ && srcK && srcDir && srcR48 && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, dir: srcDir, r48: srcR48, hints: srcHint };

  /* ---- ⑩ confirmChain：确认链构成（__lastQueue===['lb_right'] 单 clip；题面提示句走
       voice.play 不动 __lastQueue——SPEC §2 明示 say 非队列链；flat20 生成关 dch3 首题
       egg/eat 维度句——双题型确认链同构验证由 ⑤b pick 段 passP 补充） ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q10 = window.LB.quiz;
  const goodI10 = deriveAnswerV(q10);
  const h0 = window.__queueHist.length;      // 订阅起点
  const r10 = q10.kind === 'pick' ? await window.LB.tapCard(goodI10) : await window.LB.tapShelf(goodI10);
  const LQ = window.__lastQueue;
  const chainOk10 = r10 === 'shelved' &&
                    LQ && LQ.length === 1 && LQ[0] === 'lb_right' &&        // 确认链=right 单 clip
                    JSON.stringify(LQ) === JSON.stringify(['lb_right']) &&
                    !keylessLast(LQ) &&                                     // 全 clip 无 keyless（契约 N）
                    window.__queueHist.slice(h0).some(h =>
                      h.length === 1 && h[0] === 'lb_right');
  if (chainOk10) npass++;
  units.confirmChain = { ok: chainOk10, r: r10,
                         queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑪ save：真实写档链（init libr→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__lbOrig.save, origPersist = window.__lbOrig.persist;
  const origLS = localStorage.getItem('kidsgame_libr');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_libr');
    KIDS.init({ game: 'libr', title: '分类归档小图书' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.LB.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_libr');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'libr' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_libr');
  else localStorage.setItem('kidsgame_libr', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
     R48 恒四格——shelf.length===4；审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'libr', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, libr: { tutSeen: true } };
  let q12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_libr', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__lbDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.LB.start(0);
    await unlocked();
    q12 = window.LB.quiz;
    realOk = state.tut === 'none' && window.__lbDemoR === null &&
             q12 && q12.kind === 'sort' && q12.card === 'cat' && q12.shelf.length === 4 &&
             q12.step === 0 && q12.miss === 0 &&
             q12.say === SPEC_NORM &&
             q12.answer === deriveAnswerV(q12) &&        // answer 独立推导
             window.LB.currentLevel.flat === 0 && window.LB.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.LB === 'object' && typeof window.LB.tapShelf === 'function' &&
             typeof window.LB.tapCard === 'function' &&   // R48 双题型钩子真实页同暴露（b29 坑⑥）
             typeof window.LB.autoSolve === 'function';        // b29 坑⑥：钩子真实页同暴露
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_libr');
    else localStorage.setItem('kidsgame_libr', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { kind: q12.kind, card: q12.card, n: q12.shelf.length } };

  const out = { game: 'libr', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__lbVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史（题面句锚=（__lastVoiceKey/
     __lastVoiceText——R48 含未注册新键 lb_d2_* 与 lb_pick_*，stub 照记）；voice.say
     记录 keyless 残留句（__lastSayText——防回归锚，改造后应恒 undefined）；
     voice.queue 记录拼播链（__lastQueue+__queueHist 全史） */
  window.__voiceHist = [];
  window.__queueHist = [];
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) {
    window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null;
    if (k) window.__voiceHist.push(k);
  };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    if (parts) window.__queueHist.push(parts);
    window.__lastVoiceKey = parts && parts.length
      ? (typeof parts[0] === 'string' ? parts[0] : parts[0].key) : null;
  };
  runVerify();
}
