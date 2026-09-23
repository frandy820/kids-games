/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元
   ① structure：clips 16 条（brk 13+core 3）全注入+brk 实长辨别（±60ms）+
      目标图标 8 全定义、DOM 无 undefined 文本、answerList 独立性质推导
      （⊆SPEC 定表本目标步集+互异）、双 viewport（1280×800/800×1180）×
      （flat0 pick/flat10 order）布局（候选卡 ≥96×96、描边对比度 ≥3:1、
      overflowX ≤0）
   ② tutorial：教学三段（watch=题面链→幽灵手指三张点完首题整题——第 3 张
      fire 异步 __brkDemoR='done'（教学末步=首题整题完成）；turn=birthday
      单题「你来拆一拆」帮→首对独 __brkTutSolo+点满 3 张 done→进正式关
      flat=0 n=5；watch 段实测折算 ≤16s；turn 池手写定表独立对账）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null/章号映射
      ch=flat/5+1/N1 rotate 取行独立复算（row=(flat//5)*5+((flat%5)+k)%5+
      SPEC 题表 goal·kind 对账——既验域又锁 N1 语义）/同关 5 题目标互异/
      引擎直驱（pick 按 answerList 点 3 张=fill·fill·done/order 按定序点
      5 张=fill×4·done——每步重读 quiz 禁缓存）→通关 3 星
   ④ frameM（契约 M 帧内容三层 ×flat0/10/14/20）：数值层 sceneEl.dataset.scene
      +卡 DOM 数+槽 DOM 数+题面链真值（__lastQueue=目标名 clip+keyless 模板）/
      DOM 类层 题面态卡无 gone/演出层 点对后槽 .filled+.sc 文字+卡 .gone
   ⑤ wrongPath：pick（flat0）干扰卡 'wrong'+miss+错链 [brk_wrong] 单段全 clip；
      豁免窗（真时钟 3330）内干扰二击吞 false 且 miss 不变；窗内正确卡放行
      'fill'；窗后二错照计 miss=2（契约 I 补）+当前应点卡 breathe（答案级）+
      已选卡 false（轻摇不计 miss）；order（flat10）非当前步卡 'wrong'+
      题级 miss 跨步续算（两步错 miss=2）
   ⑥ pool：SPEC 定表+题表对账（8×5 步逐字照抄独立硬编码+20 行题表逐行）+
      40 卡唯一归属+干扰验算（全 20 静态关 quiz：干扰 ∉ 本目标步骤集+同题
      2 干扰互异+正确 3 ∈ 步骤集）+定序表完备+20 静态关 rotate 覆盖审计
      （每行恰现 5 次）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32
      (flat*7919+907) python 式 JS 复刻——本款常量 907）——verify 独立复算
      第一个随机数==dch+四档全现+kind 域（dch≤2 pick/≥3 order）+目标互异+
      确定性+题级流独立复算全对账（pickQuizV 同构重写：抽 3 正确+抽 2 干扰+
      洗牌 → cards/answerList 逐张相等）
   ⑨ windows+contract：N2 总窗口径断言（PRESENT_TTS==2232+150+estMs(6)+300/
      WRONG_CHAIN_WIN==2880+150+300=3330/CELE_WIN==2736+300=3036/首错锁
      ≤3030/教学延窗/celebrate 2620+500≥3036）+契约 A/B/C/D/E/F/I/J/K+N
      源码断言（读 script[2] 合并文本——b36 M1 分离后恢复判别力；检索字面
      逐条与 main 真源核对）+order 每步重读源码锚（answerList[picked.length]）+
      CHAPTERS/GEN_HINTS 双录+nextHint 4/9/14/19 数值断言+24/29/34/39 实算
   ⑩ confirmChain：确认链构成 __lastQueue===['brk_right']（题完成单 clip 全
      clip 无 keyless）+题面链 ['brk_t_<goal>',{key:null,模板}]（契约 N：
      keyless 段必居链尾——core queue 弃尾语义 Mj-1）
   ⑪ save：真实写档链（init brk→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_brk v:'1.0' levels['1-0'] stars=3；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（birthday/pick/answerList ⊆ 定表/step=0/say 对账）
      +window.BRK 真实页暴露（b29 坑⑥）；try/finally 保异常时 origLS 也恢复
   结果写 #verify-result + window.__brkVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH40 §3 定表+题表独立重列（禁抄页面 GOALS/QUESTIONS/常量——b38 坑②
     verify 独立表照 SPEC 抄，防实现笔误固化成预期） */
  const SPEC_GOALS = {
    birthday:   ['定个好日子', '写邀请卡', '准备蛋糕', '布置房间', '请朋友来玩'],
    picnic:     ['看看天气预报', '准备三明治', '装好水壶', '带上野餐垫', '找个好位置'],
    cardmake:   ['想对妈妈说的话', '准备彩纸', '画上爱心', '写上祝福', '送给妈妈'],
    planttree:  ['挑一棵小树苗', '挖一个小坑', '把树苗放进去', '填土浇水', '插上小名牌'],
    bagpack:    ['看清课程表', '拿出不用的书', '放好明天的书', '检查铅笔盒', '拉好拉链'],
    washhand:   ['卷起袖子', '冲湿小手', '抹肥皂搓泡泡', '冲洗干净', '用毛巾擦干'],
    feedrabbit: ['先洗洗小手', '拿新鲜的菜叶', '切成小段', '放进食盆', '添一点水'],
    bedtime:    ['收拾好玩具', '刷牙洗脸', '换上睡衣', '听一个小故事', '关灯睡觉']
  };
  const SPEC_GOAL_LABEL = {
    birthday: '办一场生日聚会', picnic: '去公园野餐',   cardmake: '给妈妈做贺卡',
    planttree: '种一棵小树',    bagpack: '整理小书包',  washhand: '洗干净小手',
    feedrabbit: '喂小兔子吃饭', bedtime: '准备上床睡觉'
  };
  const SPEC_GOAL_IDS = ['birthday', 'picnic', 'cardmake', 'planttree',
                         'bagpack', 'washhand', 'feedrabbit', 'bedtime'];
  /* SPEC §3 20 题题表（章池×5——实现定版行值；verify 独立硬编码逐行对账） */
  const SPEC_QUESTIONS = [
    { goal: 'birthday', kind: 'pick' }, { goal: 'picnic',     kind: 'pick' },
    { goal: 'cardmake', kind: 'pick' }, { goal: 'planttree',  kind: 'pick' },
    { goal: 'bagpack',  kind: 'pick' },
    { goal: 'washhand',   kind: 'pick' }, { goal: 'feedrabbit', kind: 'pick' },
    { goal: 'bedtime',    kind: 'pick' }, { goal: 'birthday',   kind: 'pick' },
    { goal: 'picnic',     kind: 'pick' },
    { goal: 'cardmake',   kind: 'order' }, { goal: 'planttree', kind: 'order' },
    { goal: 'bagpack',    kind: 'order' }, { goal: 'washhand',  kind: 'order' },
    { goal: 'feedrabbit', kind: 'order' },
    { goal: 'bedtime',    kind: 'order' }, { goal: 'birthday',  kind: 'order' },
    { goal: 'picnic',     kind: 'order' }, { goal: 'cardmake',  kind: 'order' },
    { goal: 'planttree',  kind: 'order' }
  ];
  /* 教学手写池独立重列（main tutWatchLevel/tutTurnLevel 定表对账锚） */
  const SPEC_TUT = {
    watch: { goal: 'planttree',
             answerList: ['planttree_0', 'planttree_1', 'planttree_2'],
             disr: ['picnic_0', 'picnic_2'] },
    turn:  { goal: 'birthday',
             answerList: ['birthday_0', 'birthday_1', 'birthday_2'],
             disr: ['bedtime_1', 'bedtime_4'] }
  };
  const SPEC_DUR = { brk_tut_watch: 3408, brk_tut_turn: 1776, brk_hint: 2160,
                     brk_right: 2736, brk_wrong: 2880,
                     brk_t_birthday: 2232, brk_t_picnic: 1968, brk_t_cardmake: 2136,
                     brk_t_planttree: 1872, brk_t_bagpack: 1896, brk_t_washhand: 2064,
                     brk_t_feedrabbit: 2064, brk_t_bedtime: 2160,
                     // T46 阶段2：模板 brk_tmpl+40 步序卡（mutagen 实测=浏览器口径）
                     brk_tmpl: 2256, brk_step_birthday_0: 1848, brk_step_birthday_1: 1824, brk_step_birthday_2: 1680, brk_step_birthday_3: 1680,
                     brk_step_birthday_4: 1848, brk_step_picnic_0: 2064, brk_step_picnic_1: 1968, brk_step_picnic_2: 1824, brk_step_picnic_3: 1920,
                     brk_step_picnic_4: 1848, brk_step_cardmake_0: 2280, brk_step_cardmake_1: 1824, brk_step_cardmake_2: 1752, brk_step_cardmake_3: 1896,
                     brk_step_cardmake_4: 1728, brk_step_planttree_0: 2064, brk_step_planttree_1: 1848, brk_step_planttree_2: 2088, brk_step_planttree_3: 1872,
                     brk_step_planttree_4: 1968, brk_step_bagpack_0: 2040, brk_step_bagpack_1: 2016, brk_step_bagpack_2: 2064, brk_step_bagpack_3: 2088,
                     brk_step_bagpack_4: 1776, brk_step_washhand_0: 1776, brk_step_washhand_1: 1848, brk_step_washhand_2: 2232, brk_step_washhand_3: 1752,
                     brk_step_washhand_4: 1968, brk_step_feedrabbit_0: 2064, brk_step_feedrabbit_1: 2112, brk_step_feedrabbit_2: 1776, brk_step_feedrabbit_3: 1872,
                     brk_step_feedrabbit_4: 1752, brk_step_bedtime_0: 1968, brk_step_bedtime_1: 1944, brk_step_bedtime_2: 1776, brk_step_bedtime_3: 2040,
                     brk_step_bedtime_4: 1776 };
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_TMPL = '帮小兔子拆一拆';            // 模板句（T46 阶段2 clip 化=brk_tmpl 2256）
  const SPEC_CHAPTER_HINTS = { 1: '还有好多任务，等着你拆一拆', 2: '新本领来啦：按顺序排一排',
                               3: '更多任务来啦，继续按顺序点', 4: '新的任务来啦，拆给小兔子看' };
  const SPEC_GEN_HINTS = ['点出三张小问题卡', '还是点三张，小心别的任务的卡',
                          '按顺序点，一步一步来', '还是按顺序，任务更熟悉啦'];
  const estMsV = n => n.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* 独立 rng（SPEC §0.3 生成关策略）：mulberry32(flat*7919+907)（本款常量 907） */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const riV = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  function shuffledV(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  /* 题级流独立复算（与 core buildQuiz 同构、独立重写——python 式 JS 复刻；
     rnd 消耗序：pick=抽 3+抽 2+洗牌；order=洗牌） */
  function pickQuizV(goal, kind, rnd) {
    const mk = (g, i) => ({ id: g + '_' + i, label: SPEC_GOALS[g][i] });
    if (kind === 'order') {
      const seq = [0, 1, 2, 3, 4].map(i => mk(goal, i));
      return { cards: shuffledV(seq, rnd), answerList: seq.map(c => c.id) };
    }
    const idx = [0, 1, 2, 3, 4], sel = [];
    for (let k = 0; k < 3; k++) sel.push(idx.splice(riV(rnd, 0, idx.length - 1), 1)[0]);
    sel.sort((a, b) => a - b);
    const pool = [];
    for (const g2 of SPEC_GOAL_IDS) if (g2 !== goal) for (let i = 0; i < 5; i++) pool.push(g2 + '_' + i);
    const dis = [];
    for (let k = 0; k < 2; k++) dis.push(pool.splice(riV(rnd, 0, pool.length - 1), 1)[0]);
    const cards = shuffledV(sel.map(i => mk(goal, i)).concat(dis.map(d => {
      const g = d.split('_'); return { id: d, label: SPEC_GOALS[g[0]][+g[1]] };
    })), rnd);
    return { cards: cards, answerList: sel.map(i => goal + '_' + i) };
  }
  const ownIdsV = goal => SPEC_GOALS[goal].map((_, i) => goal + '_' + i);
  /* answerList 独立性质推导（SPEC §3 干扰验算律——不读实现期望） */
  const ansDeriveOkV = q => !q || !q.answerList ? false :
    q.kind === 'order' ? JSON.stringify(q.answerList) === JSON.stringify(ownIdsV(q.goal)) :
    (q.answerList.length === 3 && new Set(q.answerList).size === 3 &&
     q.answerList.every(id => ownIdsV(q.goal).indexOf(id) >= 0));
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链豁免窗（真时钟 3330）过
    let g = 0;
    while (wrongChainUntil && Date.now() < wrongChainUntil && g++ < 60) await wait(250);
    return !(wrongChainUntil && Date.now() < wrongChainUntil);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即
     return 丢弃后续段——凡含 keyless 段的 queue 链中该段必须居末元素 */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);
  const waitFor = async (fn, ms) => {             // 轮询辅助（fire 异步实证等值）
    let g = 0;
    while (g++ < Math.max(20, Math.ceil(ms / 50)) && !fn()) await wait(50);
    return fn();
  };

  /* ---- ① structure：clips+SVG+DOM 干净+answerList 性质推导+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.BRK.quiz;
  const cardDom = Array.from(poolEl.querySelectorAll('.tcard'));
  const svgOk = q1 && cardDom.length === 5 &&
    cardDom.every((b, i) => Number(b.dataset.i) === i && b.querySelector('.tx') &&
                   b.querySelector('.tx').textContent === q1.cards[i].label) &&   // 渲染即引擎（卡文字）
    goalNameEl.textContent === q1.goalLabel &&                                   // 目标名牌
    !!goalIcEl.querySelector('svg') &&                                           // 目标图标在场
    SPEC_GOAL_IDS.every(g => goalSvg(g).indexOf('<svg') === 0) &&                // 目标图标 8 全定义
    Number(slotRowEl.dataset.n) === q1.answerList.length &&                      // 槽数=族（pick 3/order 5）
    slotRowEl.querySelectorAll('.slot').length === q1.answerList.length &&
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answerList 独立性质推导（pick=3 ⊆ 定表本目标步集互异/order=定序表） */
  const ansDeriveOk = q1 && ansDeriveOkV(q1);
  /* clips：brk 13+core 3 全注入+brk 13 实长辨别（SPEC §3 实长表 ±60ms；core 3 条
     只验在场——core 实长不在本批实长表，禁猜值断言） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const preOk = keysAll.length === 57 &&
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 pick 3 槽/flat10 order 5 槽）——候选卡=主答案目标 ≥96×96 */
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
    const wraps = Array.from(poolEl.querySelectorAll('.tcard'));
    const slots = Array.from(slotRowEl.querySelectorAll('.slot'));
    const expSlots = window.BRK.quiz ? window.BRK.quiz.answerList.length : 0;
    const hitOk = wraps.length === 5 && expSlots === (g._simFlat < 10 ? 3 : 5) &&
                  slots.length === expSlots &&
                  wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 卡描边对比度
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, hitOk: hitOk, contrast: cB, ox: ox,
             pass: hitOk && cB && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10]) {
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

  /* ---- ② tutorial：教学三段（看→帮→独；教学末步='done'——首题整题完成） ---- */
  total++;
  window.__brkOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__brkTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__brkWatchMs || 1e9) / SPEED;      // watch 段实测（家族预算 ≤16s 只罩 watch）
  /* __brkDemoR 第 3 张 fire 异步——轮询等 'done'（教学末步=首题整题完成） */
  const demoOk = await waitFor(() => window.__brkDemoR === 'done', 8000);
  /* turn 池手写定表对账（SPEC_TUT.turn：goal/answerList/干扰∉birthday 步集） */
  const qT0 = window.BRK.quiz;
  const tutPoolOk = qT0 && qT0.goal === SPEC_TUT.turn.goal &&
    JSON.stringify(qT0.answerList) === JSON.stringify(SPEC_TUT.turn.answerList) &&
    qT0.cards.filter(c => SPEC_TUT.turn.answerList.indexOf(c.id) < 0)
             .every(c => ownIdsV('birthday').indexOf(c.id) < 0);
  const tutHelp = demoOk && state.tut === 'help' &&
                window.BRK.currentLevel.flat === -1 && tutPoolOk &&
                twWatch <= 16000 && tw <= 26000;
  await unlocked();
  /* turn 驱动：帮→首对独（fill）→次张（fill）→末张（done）→进正式关 flat0 */
  const tapBy = (quiz, id) => quiz.cards.findIndex(c => c.id === id);
  let qT = window.BRK.quiz;
  const r1 = await window.BRK.tapCard(tapBy(qT, qT.answerList[0]));
  const soloOk = r1 === 'fill' && window.__brkTutSolo === true;
  await unlocked();                               /* fill resolve 后真时钟 showUntil 余窗未过——等可交互 */
  qT = window.BRK.quiz;
  const r2 = await window.BRK.tapCard(tapBy(qT, qT.answerList[1]));
  await unlocked();
  qT = window.BRK.quiz;
  const r3 = await window.BRK.tapCard(tapBy(qT, qT.answerList[2]));
  const tutSolo = soloOk && r2 === 'fill' && r3 === 'done' &&
                window.BRK.currentLevel.flat === 0 && window.BRK.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__brkDemoR, tut: state.tut,
                     solo: window.__brkTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), taps: [r1, r2, r3], pool: tutPoolOk };

  /* ---- ③ drive：静态 20 关全量审计（N1 rotate 独立复算+SPEC 题表对账+引擎直驱） ---- */
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
    /* N1 rotate 独立复算（SPEC §0 N1 定版语义）：题(flat,k)=表行
       (flat//5)*5+((flat%5)+k)%5——行号+SPEC 题表 goal·kind 三重对账 */
    let rotOk = true;
    const gs = new Set();
    for (let k = 0; k < 5; k++) {
      const rowExp = Math.floor(flat / 5) * 5 + ((flat % 5) + k) % 5;
      const q = L1.quizzes[k];
      gs.add(q.goal);
      if (q.row !== rowExp || SPEC_QUESTIONS[rowExp].goal !== q.goal ||
          SPEC_QUESTIONS[rowExp].kind !== q.kind) {
        badCase = 'rotate ' + flat + '/' + k + ' row=' + q.row + ' exp=' + rowExp;
        rotOk = false; break;
      }
    }
    const distinctOk = gs.size === 5;                             // 同关 5 题目标互异
    /* 引擎直驱：pick 按 answerList 点 3 张（fill·fill·done）/order 按定序点
       5 张（fill×4·done）——每步从 answerList 取当前应点（禁缓存） */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      for (let s = 0; s < q.answerList.length && driveOk; s++) {
        const want = q.answerList[s];                             // order=当前步；pick=正确 3 张序
        const i = q.cards.findIndex(c => c.id === want);
        const exp = s === q.answerList.length - 1 ? 'done' : 'fill';
        const r = engTapCard(L3, i);
        if (r !== exp || q._miss !== 0) driveOk = false;
      }
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && ruleOk && chOk && dchOk && rotOk && distinctOk && driveOk && solvedAll;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
  }
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]);
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase };

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0/10/14/20：数值/DOM 类/演出层） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.BRK.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 数值层：row 锚（静态=N1 公式独立复算/生成=-1——钩子不暴露 row，verify
       独立算）+卡/槽 DOM 数+题面链真值（__lastQueue=[目标名 clip, 模板 clip]——T46 全 clip） */
    const rowExp = flat < 20 ? Math.floor(flat / 5) * 5 + (flat % 5) : -1;
    const LQ = window.__lastQueue;
    const numOk = Number(sceneEl.dataset.scene) === rowExp &&
                  poolEl.querySelectorAll('.tcard').length === 5 &&
                  Number(slotRowEl.dataset.n) === q.answerList.length &&
                  poolEl.dataset.kind === q.kind &&
                  Array.isArray(LQ) && LQ.length === 2 &&
                  LQ[0] === 'brk_t_' + q.goal &&
                  LQ[1] === 'brk_tmpl' &&
                  q.say === q.goalLabel + '，' + SPEC_TMPL &&
                  Array.from(poolEl.querySelectorAll('.tcard')).every((b, i) =>
                    Number(b.dataset.i) === i && b.querySelector('.tx').textContent === q.cards[i].label);
    /* DOM 类层：题面态=卡池无 gone（新题干净）+目标名牌=目标名真值 */
    const cleanOk = !poolEl.querySelector('.tcard.gone') &&
                    goalNameEl.textContent === q.goalLabel;
    /* 演出层：点对（当前应点卡——独立从 answerList 推导）→ 槽 .filled+.sc 文字
       +卡 .gone（tapCard resolve 后非末步卡池保持——断言在演出窗内做） */
    const want = q.kind === 'order' ? q.answerList[0]
               : q.answerList.find(id => q.picked.indexOf(id) < 0);
    const gi = q.cards.findIndex(c => c.id === want);
    const pF = window.BRK.tapCard(gi);           // fire（演出开始）
    await wait(250);                             // 演出中段（飞入 ~120ms@SPEED.12 内）
    const sl = slotAt(0);
    const fillOk = !!sl && sl.classList.contains('filled') &&
                   sl.querySelector('.sc').textContent === q.cards.find(c => c.id === want).label;
    const goneOk = !!cardAt(gi) && cardAt(gi).classList.contains('gone');
    const r = await pF;
    const joyOk = r === 'fill' || r === 'done';
    return { ok: numOk && cleanOk && joyOk && fillOk && goneOk,
             why: JSON.stringify({ numOk, cleanOk, joyOk, fillOk, goneOk, r }) };
  }
  const fA = await frameCheck(0);      // ch1 pick（3 槽）
  const fB = await frameCheck(10);     // ch3 order（5 槽）
  const fC = await frameCheck(14);     // ch4 末静态关
  const fD = await frameCheck(20);     // 生成关（row=-1 锚）
  const frameOk = fA.ok && fB.ok && fC.ok && fD.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat14: fC, flat20: fD };

  /* ---- ⑤ wrongPath：pick 错路径+豁免窗（真时钟 3330）+order 跨步续算 ---- */
  total++;
  startLevel(0);                                  // ch1 pick（birthday 首题）
  await unlocked();
  const q5 = window.BRK.quiz;
  const badTap = (await window.BRK.tapCard(99)) === null;           // 非法下标=null（不炸）
  const badI = q5.cards.findIndex(c => q5.answerList.indexOf(c.id) < 0);   // 干扰卡下标（独立推导补集）
  const pW = window.BRK.tapCard(badI);                              // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                             // 等晃动演出毕（locked=false）
  await unlocked();                                                // 等演出锁（showUntil 余窗）过——豁免窗仍在
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 1 && h[0] === 'brk_wrong' &&           // 错链=wrong 单段
                 h.every(p => typeof p === 'string') &&              // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const rejW = await window.BRK.tapCard(badI);                      // 豁免窗内干扰二击=被吞 false（I 补：不计 miss）
  const miss1 = rW === 'wrong' && rejW === false && window.BRK.quiz.miss === 1;
  const g1 = q5.cards.findIndex(c => c.id === q5.answerList[0]);   // 窗内正确卡放行（独立推导）
  const passW = await window.BRK.tapCard(g1);                       // 'fill'（I 补：缓解吞输入）→ 题内步进
  const passOk = passW === 'fill' && window.BRK.quiz.picked.length === 1;
  await unlocked();                                /* fill resolve 后真时钟 showUntil 余窗未过 */
  /* 已选卡=轻摇拒绝 false（家族 D——不计 miss） */
  const rejSel = await window.BRK.tapCard(g1);
  await waitChainOver();                                            // 等首错豁免窗（真时钟）过
  const q5b = window.BRK.quiz;                                      // 同题（picked=1，干扰卡仍在）
  const badIb = q5b.cards.findIndex(c => q5b.answerList.indexOf(c.id) < 0);
  const rD1 = await window.BRK.tapCard(badIb);                      // 同题二错（miss=2——题级续算）
  await unlocked();
  await waitChainOver();
  const rD2 = await window.BRK.tapCard(badIb);                      // 同题三错（miss=3）
  await unlocked();
  const breatheEl = cardAt(correctIdx(cur.quizzes[cur.step]));
  const breatheOk = !!breatheEl && breatheEl.classList.contains('breathe');   // miss≥2=当前应点卡 breathe
  const rE = await window.BRK.tapCard(correctIdx(cur.quizzes[cur.step]));     // 点对推进（探索不罚）
  const miss3v = window.BRK.quiz.miss;             /* pick 段末值（3 错）——换关前存（order 段会重置 quiz） */
  /* order 族（flat10）：非当前步卡=wrong+题级 miss 跨步续算 */
  startLevel(10);
  await unlocked();
  const q5o = window.BRK.quiz;
  const wrongStep = q5o.cards.findIndex(c => c.id === q5o.answerList[1]);     // 非当前步（第 2 步卡）
  const rO1 = await window.BRK.tapCard(wrongStep);                 // → wrong（miss=1）
  await unlocked();
  await waitChainOver();
  const rO2 = await window.BRK.tapCard(wrongStep);                 // 窗后再错（miss=2——跨步续算）
  await unlocked();
  const orderMiss = window.BRK.quiz.miss === 2;
  const curOk = await window.BRK.tapCard(correctIdx(cur.quizzes[cur.step]));  // 当前步卡（第 1 步）→ fill
  const orderGo = curOk === 'fill' && window.BRK.quiz.picked.length === 1;
  await unlocked();                                /* fill resolve 后真时钟 showUntil 余窗未过 */
  const qNow = window.BRK.quiz;                    // 实时快照（picked 已推进——禁用 tap 前旧快照）
  const rejDone = await window.BRK.tapCard(qNow.cards.findIndex(c => c.id === qNow.picked[0]));   // 已完成步卡=轻摇 false
  const wrongOk = badTap && miss1 && chainW && passOk && rejSel === false &&
                  rD1 === 'wrong' && rD2 === 'wrong' &&
                  miss3v === 3 && breatheOk && rE === 'fill' &&
                  rO1 === 'wrong' && rO2 === 'wrong' && orderMiss && orderGo &&
                  rejDone === false;
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, miss1: miss1, chain: chainW,
                      rejInWin: rejW === false, passInWin: passOk, rejSel: rejSel === false,
                      miss3: miss3v, breathe: breatheOk,
                      orderWrong: rO1 === 'wrong' && rO2 === 'wrong', orderMiss: orderMiss,
                      orderGo: orderGo };

  /* ---- ⑥ pool：SPEC 定表+题表对账+干扰验算+覆盖审计 ---- */
  total++;
  let poolBad = null;
  /* 8×5 定表逐字对账+40 卡唯一归属（两两字面互不重名） */
  const allSpecCards = [];
  for (const g of SPEC_GOAL_IDS) {
    if (JSON.stringify(GOALS[g]) !== JSON.stringify(SPEC_GOALS[g])) { poolBad = 'goals ' + g; break; }
    if (GOAL_LABEL[g] !== SPEC_GOAL_LABEL[g]) { poolBad = 'label ' + g; break; }
    for (const s of SPEC_GOALS[g]) allSpecCards.push(s);
  }
  const uniqOk = new Set(allSpecCards).size === 40;
  /* 20 行题表逐行对账（goal+kind） */
  for (let i = 0; i < 20 && !poolBad; i++) {
    if (QUESTIONS[i].goal !== SPEC_QUESTIONS[i].goal ||
        QUESTIONS[i].kind !== SPEC_QUESTIONS[i].kind) { poolBad = 'row ' + i; break; }
  }
  /* 干扰验算（SPEC §3 律）：全 20 静态关 quiz——pick 干扰 ∉ 本目标步骤集+同题
     2 干扰互异+正确 3 ∈ 步骤集；order answerList=定序表+cards=同 5 id 排列 */
  let disrBad = null;
  for (let flat = 0; flat < 20 && !disrBad; flat++) {
    const L = genLevel(flat);
    for (const q of L.quizzes) {
      const own = ownIdsV(q.goal);
      if (q.kind === 'order') {
        if (JSON.stringify(q.answerList) !== JSON.stringify(own) ||
            q.cards.map(c => c.id).sort().join('|') !== own.slice().sort().join('|')) {
          disrBad = 'order ' + flat + ' ' + q.goal; break;
        }
      } else {
        const disr = q.cards.map(c => c.id).filter(id => q.answerList.indexOf(id) < 0);
        if (disr.length !== 2 || disr[0] === disr[1] ||
            !disr.every(id => own.indexOf(id) < 0) ||
            !q.answerList.every(id => own.indexOf(id) >= 0) ||
            new Set(q.answerList).size !== 3) {
          disrBad = 'disr ' + flat + ' ' + q.goal + ' ' + disr.join(','); break;
        }
      }
    }
  }
  /* 20 题覆盖审计：静态 20 关每行恰现 5 次（N1 rotate 全覆盖——只数次数不锁位置） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.row] = (cnt[q.row] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 && SPEC_QUESTIONS.every((s, i) => cnt[i] === 5);
  /* 每章 5 目标互异（题表静态审计——rotate 前置域约束） */
  const chDistinct = [0, 1, 2, 3].every(c =>
    new Set(SPEC_QUESTIONS.slice(c * 5, c * 5 + 5).map(r => r.goal)).size === 5);
  const poolOk = !poolBad && uniqOk && !disrBad && coverOk && chDistinct;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, uniq: uniqOk, disr: disrBad, cover: coverOk, chDistinct: chDistinct };

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

  /* ---- ⑧ gen：生成关 flat20+（dch 独立复算+题级流独立复算全对账） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 907);      // SPEC §0.3：独立重写 rng（python 式复刻）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    if (L.kind !== (L.dch <= 2 ? 'pick' : 'order')) genBad.push(flat + ':kind');   // kind 域
    if (!L.quizzes.every(q => q.kind === L.kind)) genBad.push(flat + ':kindQ');
    if (new Set(L.goals).size !== 5) genBad.push(flat + ':dupGoal');               // 同关目标互异
    if (L.quizzes.some(q => q.row !== -1)) genBad.push(flat + ':row');             // 生成关无表行
    /* 题级流独立复算（同构重写全对账：goals 抽取序+每题 cards/answerList） */
    const gs = SPEC_GOAL_IDS.slice(), expGoals = [];
    for (let k = 0; k < 5; k++) expGoals.push(gs.splice(riV(rnd, 0, gs.length - 1), 1)[0]);
    for (let qi = 0; qi < 5; qi++) {
      const expQ = pickQuizV(expGoals[qi], L.kind, mulberry32V(flat * 7919 + 907 + qi * 131));
      const got = L.quizzes[qi];
      if (got.goal !== expGoals[qi] ||
          JSON.stringify(got.cards) !== JSON.stringify(expQ.cards) ||
          JSON.stringify(got.answerList) !== JSON.stringify(expQ.answerList)) {
        genBad.push(flat + ':quiz' + qi); break;
      }
    }
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  const genOk = genBad.length === 0 && distOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch };

  /* ---- ⑨ windows+contract：N2 总窗口径断言+契约源码断言+双录+nextHint 实算 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = WRONG_CHAIN_WIN === 3330 &&                            // 豁免窗 ==3330 精确
                WRONG_CHAIN_WIN === D.brk_wrong + 150 + 300 &&         // =2880+150+300（总窗口径 N2）
                CELE_WIN === 3036 && CELE_WIN === D.brk_right + 300 && // 确认窗=2736+300 精确
                FILL_MS === 1000 &&                                    // 卡飞入演出窗
                SHAKE_MS * 1 + 140 <= D.brk_wrong + 150 &&             // 首错锁总窗 1340 ≤3030（b37 R3 总窗口径，审查 m-1 修）
                PRESENT_TTS === 5697 &&                                // 题面链窗总式
                PRESENT_TTS === GOAL_CLIP_MAX + SEG_GAP + estMsV(SPEC_TMPL) + 300 &&   // =2232+150+3015+300（N2 总窗）
                ENTER_MS + PRESENT_TTS === 6097 &&                     // presentQuiz 锁窗=出场+链窗
                TUT_WATCH_WAIT >= D.brk_tut_watch + 300 &&             // watch 延 ≥3708
                TUT_TURN_WAIT >= D.brk_tut_turn + 300 &&               // turn 延 ≥2076
                (2620 + 500) >= D.brk_right + 300 &&                   // celebrate 3120 ≥ 3036（winFlow 补窗 500）
                estMsV(SPEC_TMPL) === 7 * 345 + 600;                   // estMs 全字符口径（模板 7 字）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'brk'") >= 0;                 // C：本款存档键 kidsgame_brk
  const srcE = src.indexOf('sv.brk && sv.brk.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && !isGood') >= 0;   // I 补：豁免窗 guard（pick 逐卡 isGood）
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0 &&          // J：语义句 10s 节流在场
               src.indexOf('cur.flat < 3') >= 0;                            // J b36 m3：教学迷你关每错必播
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcD = src.indexOf("replayAnim(poolEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
  /* SPEC §3：题面链=目标名 clip+模板 keyless（契约 N keyless 居尾——检索锚逐字与 main 真源核对） */
  const srcN = src.indexOf("KIDS.voice.queue(['brk_t_' + q.goal, 'brk_tmpl']);") >= 0 &&
               src.indexOf("KIDS.voice.play('brk_step_' + qq.cards[ci].id,") >= 0;   // T46：题面链+帮读卡 clip 化
  /* SPEC §3：order 族每步重读 quiz（连选驱动——answerList[picked.length] 三处：
     uiTapCard isGood/correctIdx/autoSolve） */
  const srcReread = src.split('q.answerList[q.picked.length]').length - 1 >= 3;
  const srcWin500 = src.indexOf('await wait(500);') >= 0;                 // winFlow celebrate 补窗 500
  const srcStep = src.indexOf('step: cur.step') >= 0 &&                   // b33 硬性①：step 题号语义声明
                  src.indexOf('全关题号') >= 0;
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
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ && srcK &&
                     srcN && srcReread && srcWin500 && srcStep && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, N: srcN, reread: srcReread, w500: srcWin500,
                    step: srcStep, hints: srcHint };

  /* ---- ⑩ confirmChain：确认链+题面链构成（__lastQueue 对账；契约 N keyless 居尾） ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q10 = window.BRK.quiz;
  const faceQ = window.__lastQueue;               // 题面链（presentQuiz 已播）
  const faceOk = Array.isArray(faceQ) && faceQ.length === 2 &&
                 faceQ[0] === 'brk_t_' + q10.goal &&
                 faceQ[1] === 'brk_tmpl' &&       // T46：模板 clip 化（全 clip 双段链）
                 faceQ.every(p => typeof p === 'string') && !keylessLast(faceQ);   // 零 keyless（契约 N）
  /* 点完一题（每步重读 quiz——不缓存题初序列）：题完成确认链=['brk_right'] */
  const h0 = window.__queueHist.length;
  let r10 = null;
  for (let s = 0; s < q10.answerList.length; s++) {
    const qq = window.BRK.quiz;                   // 每步重读 quiz（连选驱动）
    if (!qq) break;
    const want = qq.kind === 'order' ? qq.answerList[qq.picked.length]
                 : qq.answerList.find(id => qq.picked.indexOf(id) < 0);
    const i = qq.cards.findIndex(c => c.id === want);
    r10 = await window.BRK.tapCard(i);
    await unlocked();
    if (r10 === 'done') break;
  }
  /* 题完成即 presentQuiz 新题（新题面链覆盖 __lastQueue）——确认链断言走
     __queueHist 历史口径（题面链断言由 faceOk 承担：faceQ 对 q10 同题比对） */
  const hist = window.__queueHist.slice(h0);
  const chainOk10 = r10 === 'done' &&
                    hist.some(h => h.length === 1 && h[0] === 'brk_right' &&  // 确认链=right 单 clip
                                 !keylessLast(h));                            // 全 clip 无 keyless（契约 N）
  if (chainOk10 && faceOk) npass++;
  units.confirmChain = { ok: chainOk10 && faceOk, r: r10, face: faceOk,
                         queue: hist.slice(-2).map(h => h.map(p => typeof p === 'string' ? p : JSON.stringify(p))) };

  /* ---- ⑪ save：真实写档链（init brk→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__brkOrig.save, origPersist = window.__brkOrig.persist;
  const origLS = localStorage.getItem('kidsgame_brk');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_brk');
    KIDS.init({ game: 'brk', title: '问题拆解小博士' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.BRK.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_brk');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 15 && j && j.v === '1.0' && j.game === 'brk' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_brk');
  else localStorage.setItem('kidsgame_brk', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
       审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'brk', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, brk: { tutSeen: true } };
  let q12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_brk', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__brkDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.BRK.start(0);
    await unlocked();
    q12 = window.BRK.quiz;
    realOk = state.tut === 'none' && window.__brkDemoR === null &&
             q12 && q12.goal === 'birthday' && q12.kind === 'pick' &&
             q12.answerList.length === 3 &&
             q12.answerList.every(id => ownIdsV('birthday').indexOf(id) >= 0) &&
             q12.step === 0 && q12.miss === 0 &&
             q12.say === '办一场生日聚会，' + SPEC_TMPL &&
             window.BRK.currentLevel.flat === 0 && window.BRK.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.BRK === 'object' && typeof window.BRK.tapCard === 'function' &&
             typeof window.BRK.autoSolve === 'function';        // b29 坑⑥：钩子真实页同暴露
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_brk');
    else localStorage.setItem('kidsgame_brk', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { goal: q12.goal, kind: q12.kind } };

  const out = { game: 'brk', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__brkVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史；voice.say 记录 keyless 文本
     （__lastSayText——T46 后防回归锚应恒 undefined）；voice.queue 记录拼播链（__lastQueue+__queueHist 全史） */
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
