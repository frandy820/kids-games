/* ================= ?verify=1 自检（仅 verify 分支加载执行）——15 单元
   ① structure：10 动物 SVG 全定义+**腿数知识锚**（每只 [data-leg] 计数==SPEC_LEGS
      ——昆虫恒 6/蛛形纲恒 8/蜗牛 0/蜈蚣 20；r26）+**身体分段锚**（BODY_POOL
      6 只 [data-seg] 计数==SPEC_SEGS——3/2/15；维度②渲染即知识真值）、
      候选 7 型 SVG（judge/judge3=瓢虫/圆蛛实物小图·legs/legs3=六/八腿排+
      「都不是」蜗牛小图 0 腿·bodyseg=三/两/七节分段图标）腿数/节数同锚、
      mixfind 动物小图 10 种 data-leg 同锚、DOM 无 undefined 文本、clips
      子集式 ≥20（17 实长键+core 3 精确在册+r26 新 8 键在册数∈{0,8}）+
      duration 辨别器（±60ms，17 实长键）、answer 独立推导（deriveV 全 kind
      ——禁读 quiz.answer 直比）、三 viewport 采样（1280×800/800×1180）×
      （flat0 judge 两选/flat10 legs 两选/flat15 dch4 三选）布局（按钮 ≥96×96、
      描边对比度 ≥3:1、overflowX ≤0）
   ② tutorial：教学三段（watch=看昆虫蜘蛛→开题→幽灵手指点昆虫按钮→
      __insDemoR='picked'（§4 教学末步）；turn=ant 题你来点一点；帮→首对独
      __insTutSolo+进正式关 flat=0 n=5；watch 段实测折算 ≤16s——单步演示款）
      ——r26 教学链零改动（教学题恒两选 row0 ant judge）
   ③ drive：静态 20 关全量审计（flat0-19）分档——dch1-3（flat0-14）：确定性/
      structWhy 全 null/章号映射 ch=flat/5+1/取材域=N1 rotate 复算（题(flat,k)=
      表行[(dch-1)*5+((flat%5)+k)%5]——verify 独立表同口径）/逐步 answer 独立
      复算/引擎直驱/anim 互异；dch4（flat15-19）：DCH4_KINDS 谱位逐 qi+
      structWhy null+rotate 行号+deriveV 独立推导+直驱+3★（anim 互异断言
      退役——r26 掷币主角可重复）；UI 连做链（flat10 三题：step 逐题推进+
      legs 题腿高亮恒在+q-text 随题换）
   ④ frameM（契约 M 帧内容三层 ×flat0/10/15/20——动态链形/盘数按 kind）：
      数值层 animal.dataset.anim（mixfind='search'）/kind+盘数+题面链
      __lastQueue 结构（具名题 2 段 ins_a_*+ins_t_* / mixfind 1 段
      ins_t_mix*——r26）/DOM 类层（盘数按 kind+leg-focus（legs）/
      leg-hide（legs3 撤锚——SPEC-R26 §R4））/演出层点选后按钮 .good+
      动物 .happy
   ⑤ wrongPath：干扰项 'wrong'+miss 计数+错链 [ins_wrong,ins_sci_x] 全 clip
      （科普句按动物类——ant→sci_insect）；豁免窗（真时钟 6638）内干扰项
      二击吞 false 且 miss 不变；窗内契合项放行 'picked'（step 推进）；
      窗后第二错照计 miss（契约 I 补）+miss≥2 契合候选 breathe（答案级）
   ⑥ pool：题表 20 行对账（SPEC §1 分布律独立硬编码——逐行 kind+anim、
      ch1 judge 昆虫3+蜘蛛2/ch2 judge 蜘蛛3+昆虫2/ch3 legs 昆虫3+蜘蛛2/
      ch4 legs3+judge2、每章池 anim 互异、8 动物全覆盖）+LEGS 推导律扩
      （10 键：6 腿 4+8 腿 4+干扰 2——r26）+SEGS 分段表双录+BODY_POOL
      诚实池双录+DCH4_KINDS 谱双录+SAY_T4/MIX_SAY 尾段双录+sciNone
      知识红线+20 静态关 rotate 覆盖审计（每行恰现 5 次——dch4 row 照赋）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32
      (flat*7919+887) python 式 JS 复刻——SPEC §0 seed 887）——verify 独立
      复算第一个随机数==dch+四档全现+取材=N1 rotate 口径（dch1-3 关：
      章池=(dch-1)*5 逐行 kind/anim+两选+anim 互异；dch4 关（25/27/29/37/39）：
      谱+deriveV+三选）+确定性（同 flat 两次生成 JSON 相等）
   ⑨ windows+contract：错链豁免窗 ==6638（SPEC §1 字面值；实算下界=
      1944+150+3744+300=6138）+r26 干扰动物错链窗 WRONG_CHAIN_WIN4==6738
      （=1944+150+SCI_NONE_DUR 4344 clip 实测+300——主线注册回填后口径）
      +MIX_WIN==4554（=2664+150+1440 实测+300）+选对窗
      ==2964（=2664+300）+首错锁总窗口径（SHAKE_MS×1+140=1240 ≤1944+150
      ——b39/b40 定版）+题面窗公式在场（ENTER+名 clip 实长+150+
      estMs(SAY_T4‖SAY_T 尾段)+300；mixfind=ENTER+estMs(mix 尾)+300）+
      锁窗运行时公式在场+教学延窗+celebrate 窗+契约 A/B/C/D/E/F/I/J/K/N
      源码断言（读 script[2] 合并文本）+r26 源码锚（leg-hide 撤锚/掀叶/
      mixfind 链与确认链尾名音/sciNone 分流/rescueCore 抽取）+CHAPTERS/
      GEN_HINTS 双录（r26：[3] 随 ch4 内容更新）+nextHint 4/9/14/19 数值
      断言+20/24/29/34/39 实算（b35 m5 范式）+NAME_DUR 实长表双录
      （+snail/centipede 实测回填 1344/1248）
   ⑩ confirmChain：确认链构成（__queueHist 增段含 ['ins_right'] 单 clip 全
      clip 无 keyless）+题面链结构（具名题两段=ins_a_* clip+ins_t_* 尾段——
      契约 N；题面走 queue 非 say；mixfind 单段链由 ⑬ 覆盖）
   ⑪ save：真实写档链（init ins→autoSolve 通关 5 题 5 点→winFlow verify 分支
      persistWin→localStorage kidsgame_ins v:'1.0' levels['1-0'] 更新；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（row0 ant judge/text 完整句/step=0/answer 独立
      推导）+window.INS 真实页暴露（b29 坑⑥）；try/finally 保异常时 origLS
      也恢复（b36 m4）
   ⑬ dch4UI（r26）：flat15 全关真实 UI 驱动——谱序 5 题 [judge3,legs3,
      bodyseg,judge3,mixfind] 逐题 3 选盘 tapPick 推进+legs3 叶挡腿在场
      （.leg-hide+computed visibility hidden）+bodyseg 主角域+mixfind
      search 场景/cond/唯一契合/text=MIX_SAY+确认链 [ins_right,ins_a_契合
      动物]+done 3★（每题判定点 1——单步）
   ⑭ rescueLayers（r26）：flat15 qi1 legs3 救援分层直驱（_idleHack/
      _rescueCore——VERIFY 页专用）——14s 方向级=科普句键按主角类三向+
      腿**仍藏**+无 breathe；30s 答案级=契合候选 breathe+**掀叶**（leg-hide
      移除）+重播题面链；任一层被删该单元红（分层判别力）
   ⑮ dch4Sweep（r26）：dch4 全 10 关（静态 15-19+生成 25/27/29/37/39）
      谱聚合——structWhy 全 null+deriveV 独立复算+mixfind 恒含干扰动物
      候选+cond 6/8 双现+judge3/legs3 主角三分类（昆虫/蜘蛛/都不是）全现
      +干扰动物主角 ≥1+确定性双跑+b40 挂账③ bodyseg 答案三向 tally
      （three/two/many 三向实存——谱推导精确值 5/4/1，many 唯一实存=flat16）
   结果写 #verify-result + window.__insVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH40 §0/§1/§4 + SPEC-R26-INS §R2-R4 文字独立重列（禁抄页面
     VOICE/CHAPTERS/常量/题库） */
  const SPEC_DUR = { ins_tut_watch: 3072, ins_tut_turn: 1824, ins_hint: 2304,
                     ins_right: 2664, ins_wrong: 1944,
                     ins_a_ant: 1344, ins_a_bee: 1368, ins_a_butterfly: 1416,
                     ins_a_jumpspider: 1416, ins_a_ladybird: 1440, ins_a_scorpion: 1416,
                     ins_a_spider: 1344, ins_a_wolfspider: 1368,
                     ins_sci_insect: 3744, ins_sci_spider: 3504,
                     // T46 阶段2：题面尾段 clip 化（mutagen 实测=浏览器口径）
                     ins_t_judge: 3000, ins_t_legs: 3528,
                     // r26 新 8 键（主线注册后 mutagen 实测回填——实长辨别罩住新键）
                     ins_a_snail: 1344, ins_a_centipede: 1248,
                     ins_t_judge3: 4392, ins_t_legs3: 3408, ins_t_bodyseg: 3744,
                     ins_t_mix6: 3144, ins_t_mix8: 3096, ins_sci_none: 4344 };
  const SPEC_KEYS4 = ['ins_a_snail', 'ins_a_centipede', 'ins_t_judge3', 'ins_t_legs3',
                      'ins_t_bodyseg', 'ins_t_mix6', 'ins_t_mix8', 'ins_sci_none'];   // r26 新 8 键（注册前不在册）
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  /* SPEC §1 LEGS 封闭表（推导律即真值——独立硬编码，禁 import 实现）；
     r26 扩 10 键（SPEC-R26 §R3）：干扰动物 snail 0 / centipede 20 */
  const SPEC_LEGS = { ant: 6, butterfly: 6, bee: 6, ladybird: 6,
                      spider: 8, wolfspider: 8, jumpspider: 8, scorpion: 8,
                      snail: 0, centipede: 20 };
  const SPEC_SEGS = { ant: 3, butterfly: 3, bee: 3, ladybird: 3,
                      spider: 2, wolfspider: 2, jumpspider: 2, scorpion: 2,
                      snail: 0, centipede: 15 };          // r26 分段判据封闭表
  const SPEC_ANIMALS = ['ant', 'butterfly', 'bee', 'ladybird', 'spider', 'wolfspider', 'jumpspider', 'scorpion'];
  const SPEC_EXTRA = ['snail', 'centipede'];
  const SPEC_BODY_POOL = ['ant', 'bee', 'spider', 'wolfspider', 'jumpspider', 'centipede'];   // 视觉诚实池
  const SPEC_DCH4_KINDS = ['judge3', 'legs3', 'bodyseg', 'judge3', 'mixfind'];                 // dch4 固定谱
  /* SPEC §1 题面模板尾段（keyless 尾——完整题面句=动物名+尾段）+r26 dch4 尾段 */
  const SPEC_TAIL = { judge: '呀，它是昆虫还是蜘蛛？', legs: '的腿有几条呀？数一数' };
  const SPEC_SAY4 = { judge3: '呀，它是昆虫、蜘蛛，还是都不是呀？',
                      legs3: '的腿有几条呀？想一想',
                      bodyseg: '的身体分几段呀？数一数' };
  const SPEC_MIX = { 6: '找一找呀，六条腿的昆虫', 8: '找一找呀，八条腿的蜘蛛' };
  const SPEC_SCI_NONE = '蜗牛和蜈蚣呀，不是昆虫也不是蜘蛛';
  const SPEC_NAME = { ant: '蚂蚁', butterfly: '蝴蝶', bee: '蜜蜂', ladybird: '瓢虫',
                      spider: '蜘蛛', wolfspider: '狼蛛', jumpspider: '跳蛛', scorpion: '蝎子',
                      snail: '蜗牛', centipede: '蜈蚣' };
  /* SPEC §1 20 行题表独立硬编码（分布律实现定版——双录对账锚；r26 表原样） */
  const SPEC_ROWS = [
    { kind: 'judge', anim: 'ant' }, { kind: 'judge', anim: 'butterfly' },
    { kind: 'judge', anim: 'spider' }, { kind: 'judge', anim: 'bee' },
    { kind: 'judge', anim: 'wolfspider' },
    { kind: 'judge', anim: 'jumpspider' }, { kind: 'judge', anim: 'ladybird' },
    { kind: 'judge', anim: 'scorpion' }, { kind: 'judge', anim: 'butterfly' },
    { kind: 'judge', anim: 'spider' },
    { kind: 'legs', anim: 'bee' }, { kind: 'legs', anim: 'wolfspider' },
    { kind: 'legs', anim: 'ladybird' }, { kind: 'legs', anim: 'ant' },
    { kind: 'legs', anim: 'scorpion' },
    { kind: 'legs', anim: 'jumpspider' }, { kind: 'judge', anim: 'spider' },
    { kind: 'legs', anim: 'butterfly' }, { kind: 'legs', anim: 'bee' },
    { kind: 'judge', anim: 'ant' }
  ];
  /* r26：ch4 内容更新→章末预告随更（hint[i]↔CHAPTERS[i+1] 口径不变） */
  const SPEC_CHAPTER_HINTS = { 1: '蜘蛛也来啦，看看它有几条腿', 2: '要数腿啦，数一数再选哦',
                               3: '大考验来啦，还有新朋友蜗牛和蜈蚣', 4: '新的动物看不完，继续当小科学家' };
  const SPEC_GEN_HINTS = ['认一认，昆虫还是蜘蛛', '再看蜘蛛，它不是昆虫哦',
                          '数一数腿，再选一选', '大考验，认认蜗牛和蜈蚣'];
  /* 动物名 clip 实长（_clipdur40.json——题面窗动态计算依据，独立对账；
     r26 snail/centipede 实测回填 1344/1248——原占位 1500 已收严） */
  const SPEC_NAME_DUR = { ant: 1344, bee: 1368, butterfly: 1416, jumpspider: 1416,
                          ladybird: 1440, scorpion: 1416, spider: 1344, wolfspider: 1368,
                          snail: 1344, centipede: 1248 };
  const estMsV = n => n.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* 独立 rng（SPEC §0 生成关策略）：mulberry32(flat*7919+887)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* 独立推导（SPEC §1 推导律+r26 三向扩——禁读 quiz.answer 直比）：
     judge LEGS==6→'insect'/==8→'spider'；legs ==6→'six'/==8→'eight'；
     judge3 三向（其余→'none'）；legs3 三向；bodyseg SEGS==3→'three'/
     ==2→'two'/≥4→'many'；mixfind=picks 中 LEGS==cond 唯一契合下标 */
  const clsOfV = anim => SPEC_LEGS[anim] === 6 ? 'insect'
    : (SPEC_LEGS[anim] === 8 ? 'spider' : 'none');
  const pickIdOf3V = (kind, anim) => kind === 'judge3' ? clsOfV(anim)
    : kind === 'legs3' ? (SPEC_LEGS[anim] === 6 ? 'six' : (SPEC_LEGS[anim] === 8 ? 'eight' : 'none'))
    : (SPEC_SEGS[anim] === 3 ? 'three' : (SPEC_SEGS[anim] === 2 ? 'two' : 'many'));
  const deriveV = quiz => {
    if (quiz.kind === 'judge' || quiz.kind === 'legs') {
      const want = quiz.kind === 'judge'
        ? (SPEC_LEGS[quiz.anim] === 6 ? 'insect' : 'spider')
        : (SPEC_LEGS[quiz.anim] === 6 ? 'six' : 'eight');
      return quiz.picks.indexOf(want);
    }
    if (quiz.kind === 'mixfind')
      return quiz.picks.findIndex(p => SPEC_LEGS[p] === quiz.cond);
    return quiz.picks.indexOf(pickIdOf3V(quiz.kind, quiz.anim));
  };
  const specSayV = q => q.kind === 'mixfind' ? SPEC_MIX[q.cond]
    : SPEC_NAME[q.anim] + (SPEC_SAY4[q.kind] || SPEC_TAIL[q.kind]);   // 完整题面句独立拼
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链豁免窗（真时钟）过
    let g = 0;
    while (wrongChainUntil && Date.now() < wrongChainUntil && g++ < 80) await wait(250);
    return !(wrongChainUntil && Date.now() < wrongChainUntil);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即
     return 丢弃后续段——凡含 keyless 段的 queue 链中该段必须居末元素（本款题面链
     即此形——尾段模板；确认链/错链全 clip 天然安全；断言器留作防回归） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);

  /* ---- ① structure：动物 SVG 腿数+分段知识锚+候选 7 型+DOM 干净+clips+answer 独立推导+三档双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.INS.quiz;
  const pickDoms = Array.from(trayEl.querySelectorAll('.pick'));
  /* 腿数知识锚：10 动物每只 [data-leg] 计数==SPEC_LEGS（渲染即知识真值——
     昆虫 6/蛛形纲 8/蜗牛 0/蜈蚣 20；触角/翅/钳须/尾/眼柄不带 data-leg） */
  const legsOk = SPEC_ANIMALS.concat(SPEC_EXTRA).every(id => {
    const s = animSvg(id);
    if (s.indexOf('<svg') !== 0 || s.indexOf('data-anim="' + id + '"') < 0) return false;
    return (s.match(/data-leg="/g) || []).length === SPEC_LEGS[id];
  });
  /* r26 身体分段锚：BODY_POOL 6 只 [data-seg] 计数==SPEC_SEGS（维度②渲染即
     知识真值；butterfly/ladybird/scorpion/snail 不入池=无 data-seg） */
  const segAnchorOk = SPEC_BODY_POOL.every(id => {
    const s = animSvg(id);
    return (s.match(/data-seg="/g) || []).length === SPEC_SEGS[id];
  });
  /* 候选 7 型：judge/judge3=瓢虫/圆蛛实物小图（6/8 腿同锚）；legs/legs3=六/八
     腿排图标（6/8 条）+「都不是」蜗牛小图（0 腿）；bodyseg=分段图标（节数）；
     mixfind=动物实物小图 10 种（腿数同锚） */
  const pickLegsOk = [['judge', 'insect', 6], ['judge', 'spider', 8],
                      ['legs', 'six', 6], ['legs', 'eight', 8],
                      ['judge3', 'insect', 6], ['judge3', 'spider', 8], ['judge3', 'none', 0],
                      ['legs3', 'six', 6], ['legs3', 'eight', 8], ['legs3', 'none', 0]].every(pp => {
    const s = pickSvg(pp[0], pp[1]);
    return s.indexOf('<svg') === 0 && s.indexOf('data-pick="' + pp[1] + '"') >= 0 &&
           (s.match(/data-leg="/g) || []).length === pp[2];
  });
  const pickSegOk = [['three', 3], ['two', 2], ['many', 7]].every(pp => {
    const s = pickSvg('bodyseg', pp[0]);
    return s.indexOf('<svg') === 0 && s.indexOf('data-pick="' + pp[0] + '"') >= 0 &&
           (s.match(/data-seg="/g) || []).length === pp[1];
  });
  const pickAnimOk = SPEC_ANIMALS.concat(SPEC_EXTRA).every(a => {
    const s = pickSvg('mixfind', a);
    return s.indexOf('<svg') === 0 && s.indexOf('data-pick="' + a + '"') >= 0 &&
           s.indexOf('data-anim="' + a + '"') >= 0 &&
           (s.match(/data-leg="/g) || []).length === SPEC_LEGS[a];
  });
  const svgOk = q1 && pickDoms.length === q1.picks.length &&
    pickDoms.every(b => {
      const g = b.querySelector('.art svg');
      return !!g && typeof g.dataset.pick === 'string' && g.dataset.pick.length > 0;
    }) && !!document.querySelector('#animal svg') &&
    !!document.querySelector('#logo svg') && legsOk && segAnchorOk && pickLegsOk && pickSegOk && pickAnimOk;
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answer 独立推导（SPEC §1 推导律+r26 三向——LEGS/SEGS 封闭表） */
  const ansDeriveOk = q1 && q1.answer === deriveV(q1) &&
                      q1.picks[q1.answer] === (q1.kind === 'judge'
                        ? (SPEC_LEGS[q1.anim] === 6 ? 'insect' : 'spider')
                        : (SPEC_LEGS[q1.anim] === 6 ? 'six' : 'eight'));
  /* clips：子集式（25 实长键=17 既有+8 新回填+core 3 精确在册+总数 ≥25；
     r26 新 8 键已注册（manifest 5083→5091）——在册数恰 8（禁部分注册，
     0 已不可接受——注册后收严，防回退到无新键 build 假绿）；实长辨别
     罩住全部 25 键（新键实长入 SPEC_DUR——r26 回填锚） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const reqKeys = specKeys.concat(SPEC_CORE_KEYS);
  const newInClips = SPEC_KEYS4.filter(k => keysAll.indexOf(k) >= 0);
  const preOk = keysAll.length >= 25 &&
    reqKeys.every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0) &&
    newInClips.length === 8;
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 judge 两选/flat10 legs 两选/flat15 dch4 三选）
     ——按钮=主答案目标 ≥96×96（盘数随档：dch4 静态档 15-19=3 枚） */
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
    const wraps = Array.from(trayEl.querySelectorAll('.pick'));
    if (g._simFlat >= 20)   /* m4 守卫：生成关 dch 随机禁按静态档硬算（防假阴性）——直接判不过 */
      return { vp: w + 'x' + h, flat: g._simFlat, picks: wraps.length, hitOk: false, contrast: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    const expN = g._simFlat >= 15 ? 3 : 2;   /* r26：dch4 静态档（15-19）=三选盘 */
    const hitOk = wraps.length === expN && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 按钮描边对比度
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, picks: wraps.length, hitOk: hitOk,
             contrast: cB, ox: ox, pass: hitOk && cB && ox <= 0 };
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
  units.structure = { ok: s1ok, svg: svgOk, legs: legsOk, segs: segAnchorOk,
                      pickLegs: pickLegsOk, pickSeg: pickSegOk, pickAnim: pickAnimOk, dom: cleanDom,
                      ansDerive: ansDeriveOk, clips: preOk, newKeys: newInClips.length, dur: durOk, layout: layoutOk,
                      sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（看→帮→独；turn 单题一击即完——单步款） ---- */
  total++;
  window.__insOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__insTutSolo = false;
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__insWatchMs || 1e9) / SPEED;      // watch 段实测（家族预算 ≤16s 只罩 watch）
  const tutHelp = window.__insDemoR === 'picked' && state.tut === 'help' &&
                window.INS.currentLevel.flat === -1 &&
                window.INS.quiz.kind === 'judge' && window.INS.quiz.anim === 'ant' &&
                window.INS.quiz.picks.length === 2 &&
                window.INS.quiz.step === 0 &&
                twWatch <= 16000 && tw <= 26000;
  await unlocked();
  const qT = window.INS.quiz;                                // "帮"阶段放手题（ant 辨类）
  const rT1 = await window.INS.tapPick(deriveV(qT));   // 首题选对（独立推导契合项）→ 帮→独 → done 进正式关
  const tutSolo = rT1 === 'done' && window.__insTutSolo === true &&
                window.INS.currentLevel.flat === 0 && window.INS.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__insDemoR, tut: state.tut,
                     solo: window.__insTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR1: rT1 };

  /* ---- ③ drive：静态 20 关全量审计（dch1-3 全套+dch4 谱——answer=独立推导，禁读直比） ---- */
  total++;
  const levelsRec = {};
  let badCase = null;
  for (let flat = 0; flat < 20; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, L1.lv, k);
      if (why) { badCase = 'struct ' + flat + '/' + k + ':' + why; ruleOk = false; }
    }
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算（ch=flat/5+1）
    const chOk = L1.ch === expCh;
    const dchOk = L1.dch === expCh;                               // 静态四档 dch===ch
    const isDch4 = flat >= 15;                                    // r26：静态 dch4=15-19
    /* 取材域对账：dch1-3=N1 rotate 逐行 kind/anim（SPEC §0）；dch4=rotate 行号
       （row 照赋——SPEC-R26 §R2）+谱位 kind（SPEC_DCH4_KINDS）+主角域 */
    let sceneOk = true;
    for (let k = 0; k < 5; k++) {
      const expRow = (L1.dch - 1) * 5 + (L1.lv + k) % 5;
      const q = L1.quizzes[k];
      if (q.row !== expRow) { badCase = 'rotate ' + flat + '/' + k; sceneOk = false; break; }
      if (isDch4) {
        if (q.kind !== SPEC_DCH4_KINDS[k]) { badCase = 'dch4kind ' + flat + '/' + k; sceneOk = false; break; }
        if (q.kind === 'bodyseg' && SPEC_BODY_POOL.indexOf(q.anim) < 0) { badCase = 'bodyPool ' + flat + '/' + k; sceneOk = false; break; }
        if ((q.kind === 'judge3' || q.kind === 'legs3') &&
            SPEC_ANIMALS.concat(SPEC_EXTRA).indexOf(q.anim) < 0) { badCase = 'subj ' + flat + '/' + k; sceneOk = false; break; }
      } else if (q.kind !== SPEC_ROWS[expRow].kind || q.anim !== SPEC_ROWS[expRow].anim) {
        badCase = 'rotate ' + flat + '/' + k + ' row=' + q.row + ' exp=' + expRow; sceneOk = false; break;
      }
    }
    /* 引擎直驱：逐题点契合项（独立推导 SPEC_LEGS/SEGS）→ picked / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const expIdx = deriveV(q);
      const isLast = k === L3.quizzes.length - 1;
      if (expIdx < 0 || q.answer !== expIdx) { driveOk = false; break; }   // answer=独立推导对账
      const r = engTapPick(L3, expIdx);
      if (r !== (isLast ? 'done' : 'picked') || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const animSet = {};
    L1.quizzes.forEach(q => { animSet[q.anim] = 1; });
    const uniqOk = isDch4 ? true : Object.keys(animSet).length === 5;   // dch1-3 anim 互异（r26 dch4 掷币主角可重复）
    const ok = det && ruleOk && chOk && dchOk && sceneOk && driveOk && solvedAll && uniqOk;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
  }
  /* UI 连做链（flat10 首题=row10·bee legs）：step 逐题推进+legs 题腿高亮恒在+
     q-text 随题换（单步题无 stage 概念——每题一击） */
  startLevel(10);
  await unlocked();
  const q10 = window.INS.quiz;
  const m1 = q10 && q10.kind === 'legs' && q10.anim === 'bee' && q10.step === 0 &&
             animalEl.classList.contains('leg-focus') &&           // 腿高亮视觉锚恒在（legs 族）
             qTextEl.textContent === specSayV(q10) &&
             window.INS.currentLevel.dch === 3;
  const r1c = await window.INS.tapPick(deriveV(q10));        // 第一题 → picked → step+1
  const m2 = r1c === 'picked' && window.INS.quiz.step === 1 &&
             window.INS.quiz.kind === SPEC_ROWS[11].kind &&        // row11=wolfspider legs（章池 rotate 续行）
             window.INS.quiz.anim === SPEC_ROWS[11].anim;
  await unlocked();
  const q10b = window.INS.quiz;                                    // 重读（新题）
  const r2c = await window.INS.tapPick(deriveV(q10b));       // 第二题 → picked
  const m3 = r2c === 'picked' && window.INS.quiz.step === 2 &&
             window.INS.quiz.answer === deriveV(window.INS.quiz);
  await unlocked();
  const q10c = window.INS.quiz;
  const r3c = await window.INS.tapPick(deriveV(q10c));       // 第三题 → picked
  const m4 = r3c === 'picked' && window.INS.quiz.step === 3 &&
             window.INS.currentLevel.step === 3;
  const multiOk = m1 && m2 && m3 && m4;
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]) && multiOk;
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase, multi: multiOk, m1: m1, m2: m2, m3: m3, m4: m4 };

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0/10/15/20：数值/DOM 类/演出层——链形盘数动态按 kind） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.INS.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 数值层：anim/kind 锚+盘数+题面链结构（r26：具名题=ins_a_*+ins_t_* 双段
       / mixfind=ins_t_mix* 单段——全 clip 字符串链）+完整句真值+候选下标语义 */
    const pickDoms = Array.from(trayEl.querySelectorAll('.pick'));
    const eng0 = genLevel(flat).quizzes[0];
    const LQ0 = window.__lastQueue;
    const chainExp = q.kind === 'mixfind' ? ['ins_t_mix' + q.cond]
                                   : ['ins_a_' + eng0.anim, 'ins_t_' + eng0.kind];
    const numOk = animalEl.dataset.anim === (q.kind === 'mixfind' ? 'search' : eng0.anim) &&
                  animalEl.dataset.kind === eng0.kind &&
                  Number(trayEl.dataset.n) === q.picks.length &&
                  q.text === specSayV(q) && q.say === q.text &&
                  pickDoms.length === q.picks.length &&
                  pickDoms.every((b, j) => b.dataset.i === String(j)) &&
                  LQ0 && LQ0.length === chainExp.length &&
                  LQ0.every((x, i) => x === chainExp[i]) &&
                  LQ0.every(x => typeof x === 'string') && !keylessLast(LQ0);   // 全 clip 字符串链（零 keyless）
    /* DOM 类层：盘数按 kind+腿高亮（legs 恒挂）/叶挡腿（legs3 恒挂——r26 撤锚） */
    const clsOk = trayEl.querySelectorAll('.pick').length === q.picks.length &&
                  animalEl.classList.contains('leg-focus') === (q.kind === 'legs') &&
                  animalEl.classList.contains('leg-hide') === (q.kind === 'legs3');
    /* 演出层：点选（独立推导）→ 演出中段采样契合按钮 .good+动物图 .happy
       （tapPick resolve 后 presentQuiz 会重绘 DOM——断言须在演出窗内做） */
    const goodI = deriveV(q);
    const pF = window.INS.tapPick(goodI);       // fire（演出开始）
    await wait(250);                            // 演出中段（PICK_WIN 356ms@SPEED.12 中点）
    const gw = trayEl.querySelector('.pick[data-i="' + goodI + '"]');
    const placeOk = !!gw && gw.classList.contains('good') &&
                    animalEl.classList.contains('happy');
    const r = await pF;
    const rOk = r === 'picked' || r === 'done';
    return { ok: numOk && clsOk && rOk && placeOk,
             why: JSON.stringify({ numOk, clsOk, rOk, placeOk, r }) };
  }
  const fA = await frameCheck(0);      // judge 章首题（两选）
  const fB = await frameCheck(10);     // legs 章首题（两选+腿高亮）
  const fC = await frameCheck(15);     // r26 dch4 谱首题（judge3 三选）
  const fD = await frameCheck(20);     // 生成关（dch=1 seed 887 实算——两选域）
  const frameOk = fA.ok && fB.ok && fC.ok && fD.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat15: fC, flat20: fD };

  /* ---- ⑤ wrongPath：错路径+豁免窗（真时钟 6638：窗内干扰项吞/窗内契合项放行/窗后二错照计 miss） ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.INS.quiz;
  const badTap = (await window.INS.tapPick(99)) === null;           // 非法下标=null（不炸）
  const badI = (q5.answer + 1) % q5.picks.length;                   // 干扰项下标（两选→补集）
  const pW = window.INS.tapPick(badI);                              // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                             // 等摇头演出毕（locked=false）
  await unlocked();                                                // 等演出锁（showUntil 余窗）过——豁免窗仍在
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'ins_wrong' &&          // 错链头=wrong clip
                 h[1] === 'ins_sci_insect' &&                       // ant=昆虫→科普句 sci_insect（SPEC §1 按动物类取）
                 h.every(p => typeof p === 'string') &&            // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const miss1 = rW === 'wrong' && window.INS.quiz.miss === 1;
  const rejW = await window.INS.tapPick(badI);                      // 豁免窗内干扰项二击=被吞 false（I 补：不计 miss）
  const missStill = window.INS.quiz.miss === 1;
  const passW = await window.INS.tapPick(q5.answer);                // 豁免窗内契合项=放行（I 补：缓解吞输入）→ step 推进
  const passOk = passW === 'picked' && window.INS.currentLevel.step === 1 &&
                 window.INS.quiz.step === 1;                 // 新题（第 2 题）全关题号=1
  await unlocked();                                                // 等新题开题演出完
  await waitChainOver();                                           // 等首错豁免窗（真时钟）过
  const q5b = window.INS.quiz;                                      // 第 2 题（row1 butterfly judge——昆虫→sci_insect）
  const badIb = (q5b.answer + 1) % q5b.picks.length;
  const rD1 = await window.INS.tapPick(badIb);                      // 第 2 题首错（题级 miss=1，全关 retries=2）
  await unlocked();
  await waitChainOver();                                           // 等本错豁免窗过——窗后二错照计 miss
  const rD2 = await window.INS.tapPick(badIb);                      // 第 2 题二错（题级 miss=2）
  await unlocked();                                                // 等二错演出锁过
  const missAfter2 = window.INS.quiz.miss;                          // rE 前记录（好项推进会换题清零）
  const brEl = pickAt(q5b.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');   // miss≥2=契合候选 breathe（答案级）
  const rE = await window.INS.tapPick(q5b.answer);                  // 候选不灰可重点（探索不罚）
  const wrongOk = badTap && miss1 && missStill && chainW && passOk &&
                  rD1 === 'wrong' && rD2 === 'wrong' &&
                  missAfter2 === 2 && window.INS.currentLevel.miss === 3 &&
                  breathe2 && rE === 'picked';
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, miss1: miss1, chain: chainW,
                      rejInWin: rejW === false, passInWin: passOk,
                      d1: rD1, d2: rD2, missAfter2: missAfter2, breathe2: breathe2, right: rE };

  /* ---- ⑥ pool：题表 20 行对账+r26 封闭表/谱/尾段双录+20 静态关 rotate 覆盖审计 ---- */
  total++;
  let poolBad = null;
  for (let i = 0; i < 20 && !poolBad; i++) {
    const spec = SPEC_ROWS[i], row = ROWS[i];
    if (row.kind !== spec.kind) { poolBad = 'kind ' + i; break; }
    if (row.anim !== spec.anim) { poolBad = 'anim ' + i; break; }
  }
  /* SPEC §1 分布律复算（独立硬编码口径）：
     ch1 行 0-4 全 judge+昆虫(LEGS==6) 3+蜘蛛(==8) 2；
     ch2 行 5-9 全 judge+蜘蛛 3+昆虫 2；
     ch3 行 10-14 全 legs+昆虫 3+蜘蛛 2；
     ch4 行 15-19 legs 3+judge 2；每章池 anim 互异；8 动物全覆盖 */
  const clsOf = a => SPEC_LEGS[a] === 6 ? 'insect' : 'spider';
  const pool = lo => SPEC_ROWS.slice(lo * 5, lo * 5 + 5);
  const distOk = pool(0).every(r => r.kind === 'judge') &&
                 pool(0).filter(r => clsOf(r.anim) === 'insect').length === 3 &&
                 pool(0).filter(r => clsOf(r.anim) === 'spider').length === 2 &&
                 pool(1).every(r => r.kind === 'judge') &&
                 pool(1).filter(r => clsOf(r.anim) === 'spider').length === 3 &&
                 pool(1).filter(r => clsOf(r.anim) === 'insect').length === 2 &&
                 pool(2).every(r => r.kind === 'legs') &&
                 pool(2).filter(r => clsOf(r.anim) === 'insect').length === 3 &&
                 pool(2).filter(r => clsOf(r.anim) === 'spider').length === 2 &&
                 pool(3).filter(r => r.kind === 'legs').length === 3 &&
                 pool(3).filter(r => r.kind === 'judge').length === 2;
  const uniqOk = [0, 1, 2, 3].every(lo => {
    const set = {};
    pool(lo).forEach(r => { set[r.anim] = 1; });
    return Object.keys(set).length === 5;                          // 章池 5 行 anim 互异（同关取池天然互异）
  });
  const coverAnimals = SPEC_ANIMALS.every(a => SPEC_ROWS.some(r => r.anim === a));   // 8 动物全覆盖
  /* LEGS 推导律复算（SPEC §1 数学先验+r26 扩）：10 键、6 腿 4+8 腿 4+干扰 2；
     SEGS 双录；类目一致性引理（腿数唯一决定类目——mixfind 双条件逻辑相容）；
     BODY_POOL/DCH4_KINDS/SAY_T4/MIX_SAY 双录；sciNone 知识红线 */
  const legsLaw = Object.keys(SPEC_LEGS).length === 10 &&
    SPEC_ANIMALS.filter(a => SPEC_LEGS[a] === 6).length === 4 &&
    SPEC_ANIMALS.filter(a => SPEC_LEGS[a] === 8).length === 4 &&
    SPEC_EXTRA.every(a => SPEC_LEGS[a] !== 6 && SPEC_LEGS[a] !== 8) &&
    SPEC_ANIMALS.concat(SPEC_EXTRA).every(a => LEGS[a] === SPEC_LEGS[a]) &&           // 页面表对账（10 键）
    SPEC_ANIMALS.concat(SPEC_EXTRA).every(a => SEGS[a] === SPEC_SEGS[a]) &&           // r26 分段表对账
    SPEC_ANIMALS.concat(SPEC_EXTRA).every(a => ANIMAL_NAME[a] === SPEC_NAME[a]) &&    // 动物名双录（manifest text）
    BODY_POOL.every(a => SPEC_BODY_POOL.indexOf(a) >= 0) && BODY_POOL.length === SPEC_BODY_POOL.length &&
    DCH4_KINDS.every((k, i) => k === SPEC_DCH4_KINDS[i]) &&                           // dch4 谱双录
    VOICE.sciSpider.text.indexOf('它不是昆虫') >= 0 &&              // 知识红线（SPEC §1）：蛛形纲科普句必为「它不是昆虫」句式
    VOICE.sciSpider.text.indexOf('另一种昆虫') < 0 &&              // 禁「另一种昆虫」表述
    VOICE.sciInsect.text.indexOf('六条腿') >= 0 &&                 // 昆虫科普句=六条腿锚
    VOICE.sciNone.text === SPEC_SCI_NONE &&                        // r26 干扰动物科普句双录
    VOICE.sciNone.text.indexOf('不是昆虫') >= 0 &&
    VOICE.sciNone.text.indexOf('不是蜘蛛') >= 0 && VOICE.sciNone.text.indexOf('另一种') < 0;
  const sayLenOk = SPEC_TAIL.judge.length === 11 && SPEC_TAIL.legs.length === 10 &&   // 尾段字数（estMs 预算锚）
                   SAY_T.judge === SPEC_TAIL.judge && SAY_T.legs === SPEC_TAIL.legs &&  // 尾段双录
                   SAY_T4.judge3 === SPEC_SAY4.judge3 &&           // r26 dch4 尾段双录（17/10/11 字）
                   SAY_T4.legs3 === SPEC_SAY4.legs3 &&
                   SAY_T4.bodyseg === SPEC_SAY4.bodyseg &&
                   SPEC_SAY4.judge3.length === 17 && SPEC_SAY4.legs3.length === 10 && SPEC_SAY4.bodyseg.length === 11 &&
                   MIX_SAY[6] === SPEC_MIX[6] && MIX_SAY[8] === SPEC_MIX[8] &&        // mixfind 尾段双录
                   SPEC_MIX[6].length === 11 && SPEC_MIX[8].length === 11;
  /* 20 题覆盖审计：静态 20 关每行恰现 5 次（N1 rotate——每关取章池 5 行的轮换；
     r26 dch4 row 照赋=口径不变） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.row] = (cnt[q.row] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 && SPEC_ROWS.every((s, i) => cnt[i] === 5);
  const poolOk = !poolBad && distOk && uniqOk && coverAnimals && legsLaw && sayLenOk && coverOk;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, dist: distOk, uniq: uniqOk,
                 coverAnimals: coverAnimals, legsLaw: legsLaw, say: sayLenOk, cover: coverOk };

  /* ---- ⑦ stars：星级口径（0=3★/1-2=2★/≥3=1★，永不 0 星——SPEC §0 miss 计数款） ---- */
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

  /* ---- ⑧ gen：生成关 flat20+（seeded ri(rnd,1,4) 独立复算 seed=887+dch1-3/dch4 分档+确定性） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 887);      // SPEC §0：独立重写 rng（python 式复刻，seed 887）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    const isG4 = L.dch === 4;
    if (!L.quizzes.every(q => q.picks.length === (isG4 ? 3 : 2))) genBad.push(flat + ':picksN');
    if (!isG4) {
      const set = {};
      L.quizzes.forEach(q => { set[q.anim] = 1; });
      if (Object.keys(set).length !== 5) genBad.push(flat + ':dupAnim');             // dch1-3 同关 5 题 anim 互异
      for (let k = 0; k < 5; k++) {                                                  // N1 rotate 口径（章池域）
        const expRow = (L.dch - 1) * 5 + (flat % 5 + k) % 5;
        const q = L.quizzes[k];
        if (q.row !== expRow || q.kind !== SPEC_ROWS[expRow].kind || q.anim !== SPEC_ROWS[expRow].anim)
          genBad.push(flat + '/' + k + ':pool');
      }
    } else {
      for (let k = 0; k < 5; k++) {                                                  // r26 dch4 谱（SPEC-R26 §R3）
        const q = L.quizzes[k];
        if (q.kind !== SPEC_DCH4_KINDS[k]) { genBad.push(flat + '/' + k + ':kind'); continue; }
        if (q.row !== (L.dch - 1) * 5 + (flat % 5 + k) % 5) genBad.push(flat + '/' + k + ':row');
        if (q.answer !== deriveV(q)) genBad.push(flat + '/' + k + ':derive');
        if (q.kind === 'mixfind' && q.picks.filter(p => SPEC_LEGS[p] === q.cond).length !== 1)
          genBad.push(flat + '/' + k + ':matchUnique');
      }
    }
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distG = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  const genOk = genBad.length === 0 && distG;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §1 实长表+SPEC-R26 §R9）+契约源码断言+双录+nextHint 实算 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const SCI_MAX = Math.max(D.ins_sci_insect, D.ins_sci_spider);   // 3744=sci_insect（SPEC 括注 sci_spider 为笔误）
  const winOk = WRONG_CHAIN_WIN === 6638 &&                            // 豁免窗 ==6638（SPEC §1 字面值）
                WRONG_CHAIN_WIN >= D.ins_wrong + 150 + SCI_MAX + 300 &&  // ≥ 错链实算下界 6138（SPEC 加法笔误 6638——窗取宽者保豁免不早掐）
                WRONG_CHAIN_WIN4 === 6738 &&                            // r26 干扰动物错链窗（clip 实长回填后口径）
                WRONG_CHAIN_WIN4 === D.ins_wrong + 150 + SCI_NONE_DUR + 300 &&
                WRONG_CHAIN_WIN4 === D.ins_wrong + 150 + D.ins_sci_none + 300 &&   // clip 实长双录（estMs 占位断言已随回填收严为实长==）
                MIX_WIN === 4554 && MIX_WIN === D.ins_right + 150 + 1440 + 300 &&   // r26 mixfind 确认链窗（1440=名 clip 实长 max 实测口径）
                PICK_WIN === 2964 && PICK_WIN === D.ins_right + 300 &&  // 选对窗=2664+300 精确
                SHAKE_MS * 1 + 140 <= D.ins_wrong + 150 &&            // 首错锁总窗口径（常量×SPEED(实页=1)+尾窗 140 全算=1240 ≤ 2094）
                src.indexOf('Date.now() + SHAKE_MS * SPEED + 140') >= 0 &&   // 首错锁运行时公式在场（总窗口径）
                src.indexOf('NAME_DUR[q.anim] + 150 + estMs(SAY_T4[q.kind] || SAY_T[q.kind]) + 300') >= 0 &&   // 题面窗动态公式在场（家族 T+r26 尾段分流）
                src.indexOf('ENTER_MS + estMs(MIX_SAY[q.cond]) + 300') >= 0 &&   // r26 mixfind 题面窗公式在场
                TUT_WATCH_WAIT >= D.ins_tut_watch + 300 &&            // watch 延 ≥3372
                TUT_TURN_WAIT >= D.ins_tut_turn + 300 &&              // turn 延 ≥2124
                (2620 + 400) >= D.ins_right + 300 &&                  // celebrate 3020 ≥ 2964
                estMsV('呀，它是昆虫还是蜘蛛？') === 11 * 345 + 600 && // estMs 全字符口径（judge 尾 11 字）
                estMsV('的腿有几条呀？数一数') === 10 * 345 + 600 &&   // legs 尾 10 字
                estMsV(SPEC_SAY4.judge3) === 17 * 345 + 600 &&        // r26 judge3 尾 17 字=6465
                estMsV(SPEC_MIX[6]) === 11 * 345 + 600 &&             // r26 mix 尾 11 字=4395
                SPEC_ANIMALS.every(a => NAME_DUR[a] === SPEC_NAME_DUR[a]) &&   // 名 clip 实长表双录
                NAME_DUR.snail === 1344 && NAME_DUR.centipede === 1248;       // r26 实测回填（原占位 1500——_clipdur40 mutagen 口径）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'ins'") >= 0;                // C：本款存档键 kidsgame_ins
  const srcD = src.indexOf("replayAnim(trayEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
  const srcE = src.indexOf('sv.ins && sv.ins.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('WRONG_CHAIN_WIN4') >= 0 &&                      // r26 干扰动物错链分流窗在场
               src.indexOf("sciKeyOf(q.anim) === 'sciNone'") >= 0 &&        // r26 分流判据=科普句三向
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0;   // I 补：豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0 &&          // J：语义句 10s 节流在场
               src.indexOf('cur.flat < 3') >= 0;   // J：flat<3 每错必播（b36 m3 教学迷你关 flat=-1 字面）
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  /* 题面链/确认链素材（SPEC §1+r26）：具名题=动物名 clip+尾段 clip 双段；mixfind=
   单段防泄+确认链尾名音；确认链 right 单 clip（非 mixfind）；错链科普句三向取 */
  const srcN = src.indexOf("['ins_a_' + q.anim, 'ins_t_' + q.kind]") >= 0 &&
               src.indexOf("['ins_t_mix' + q.cond]") >= 0 &&                // r26 mixfind 单段链（防泄主角名）
               src.indexOf('KIDS.voice.queue([VOICE.right.key])') >= 0 &&   // 确认链 right 单 clip
               src.indexOf("[VOICE.right.key, 'ins_a_' + q.anim]") >= 0 &&  // r26 mixfind 确认链尾名音
               src.indexOf('sciKeyOf(q.anim)') >= 0;                        // 错链科普句按动物类取
  /* r26 撤锚/救援分层锚：叶挡腿 toggle+30s 掀叶+救援核心体抽取+VERIFY 驱动 */
  const srcR = src.indexOf("classList.toggle('leg-hide', q.kind === 'legs3')") >= 0 &&
               src.indexOf("if (q.kind === 'legs3') animalEl.classList.remove('leg-hide');") >= 0 &&
               src.indexOf('function rescueCore()') >= 0 &&
               src.indexOf('_rescueCore()') >= 0 && src.indexOf('_idleHack') >= 0;
  const srcHint = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // 双录独立硬编码对账（r26：[3] 随 ch4 更新）
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
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ && srcK && srcN && srcR && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, N: srcN, R: srcR, hints: srcHint };

  /* ---- ⑩ confirmChain：确认链构成（['ins_right'] 单 clip 全 clip）+题面链结构
       （题面走 queue 非 say——SPEC §1 拼接链；picked 后 presentQuiz 重发题面链，
       __lastQueue 末态可为题面链——以 __queueHist 增段为准；mixfind 链形由 ⑬ 覆盖） ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q10g = window.INS.quiz;
  const goodI10 = deriveV(q10g);
  const h0 = window.__queueHist.length;      // 订阅起点
  const r10 = await window.INS.tapPick(goodI10);
  const segs = window.__queueHist.slice(h0);
  const hasRight = segs.some(h => h.length === 1 && h[0] === 'ins_right' &&    // 确认链=right 单 clip
                    h.every(p => typeof p === 'string') && !keylessLast(h));   // 全 clip 无 keyless（契约 N）
  const qNext = window.INS.quiz;                             // tapPick 后新题（picked 非末题——题面链属新题）
  const chainExpN = qNext && qNext.kind === 'mixfind' ? ['ins_t_mix' + qNext.cond]
                                                 : (qNext && ['ins_a_' + qNext.anim, 'ins_t_' + qNext.kind]);
  const hasQuizChain = segs.some(h => chainExpN && h.length === chainExpN.length &&   // 题面链=具名双段/mixfind 单段
                    h.every((x, i) => x === chainExpN[i]) &&
                    h.every(x => typeof x === 'string') && !keylessLast(h));   // 全 clip 字符串链（零 keyless）
  const chainOk10 = r10 === 'picked' && hasRight && hasQuizChain;
  if (chainOk10) npass++;
  units.confirmChain = { ok: chainOk10, r: r10,
                         segs: segs.map(h => h.map(p => typeof p === 'string' ? p : ('{' + p.key + '|' + p.text + '}')).join('+')) };

  /* ---- ⑪ save：真实写档链（init ins→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__insOrig.save, origPersist = window.__insOrig.persist;
  const origLS = localStorage.getItem('kidsgame_ins');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_ins');
    KIDS.init({ game: 'ins', title: '昆虫还是蜘蛛' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.INS.autoSolve();     // 真实判定链通关（5 题 5 点）→ winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_ins');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'ins' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_ins');
  else localStorage.setItem('kidsgame_ins', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
       审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'ins', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, ins: { tutSeen: true } };
  let q12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_ins', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__insDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.INS.start(0);
    await unlocked();
    q12 = window.INS.quiz;
    realOk = state.tut === 'none' && window.__insDemoR === null &&
             q12 && q12.kind === 'judge' && q12.anim === 'ant' &&
             q12.step === 0 && q12.miss === 0 && q12.picks.length === 2 &&
             q12.text === '蚂蚁呀，它是昆虫还是蜘蛛？' &&        // 完整题面句（SPEC_TAIL 拼装）
             q12.answer === deriveV(q12) &&        // answer 独立推导
             window.INS.currentLevel.flat === 0 && window.INS.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.INS === 'object' && typeof window.INS.tapPick === 'function' &&
             typeof window.INS.autoSolve === 'function';  // b29 坑⑥：钩子真实页同暴露
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_ins');
    else localStorage.setItem('kidsgame_ins', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { kind: q12.kind, anim: q12.anim, n: q12.picks.length, text: q12.text } };

  /* ---- ⑬ dch4UI（r26）：flat15 全关真实 UI 驱动——谱序/三选盘/叶挡腿/mixfind/确认链/3★ ---- */
  total++;
  startLevel(15);
  await unlocked();
  let d4ok = window.INS.currentLevel.dch === 4;
  const d4notes = [];
  for (let k = 0; k < 5 && d4ok; k++) {
    const q = window.INS.quiz;
    if (!q) { d4ok = false; d4notes.push('q' + k + ':null'); break; }
    if (q.kind !== SPEC_DCH4_KINDS[k] || q.picks.length !== 3) { d4ok = false; d4notes.push('q' + k + ':kind/n ' + q.kind); break; }
    if (q.answer !== deriveV(q)) { d4ok = false; d4notes.push('q' + k + ':derive'); break; }
    if (q.text !== specSayV(q)) { d4ok = false; d4notes.push('q' + k + ':text'); break; }
    if (q.kind === 'legs3') {
      /* 叶挡腿：.leg-hide 在场+渲染腿 visibility hidden（撤锚实证） */
      const leg1 = animalEl.querySelector('[data-leg]');
      const hidOk = animalEl.classList.contains('leg-hide') && !!animalEl.querySelector('.leafcover') &&
                    leg1 && getComputedStyle(leg1).visibility === 'hidden';
      if (!hidOk) { d4ok = false; d4notes.push('q' + k + ':leg-hide'); break; }
    } else if (animalEl.classList.contains('leg-hide')) {
      d4ok = false; d4notes.push('q' + k + ':legHideLeak'); break;
    }
    if (q.kind === 'bodyseg' && SPEC_BODY_POOL.indexOf(q.anim) < 0) { d4ok = false; d4notes.push('q' + k + ':pool'); break; }
    if (q.kind === 'mixfind') {
      /* search 场景+cond+唯一契合+干扰动物在场 */
      const mixOk = animalEl.dataset.anim === 'search' &&
                    (q.cond === 6 || q.cond === 8) &&
                    q.picks.filter(p => SPEC_LEGS[p] === q.cond).length === 1 &&
                    q.picks.some(p => SPEC_EXTRA.indexOf(p) >= 0) &&
                    q.anim === q.picks[deriveV(q)];
      if (!mixOk) { d4ok = false; d4notes.push('q' + k + ':mix'); break; }
    }
    const hPre = window.__queueHist.length;
    const r = await window.INS.tapPick(q.answer);
    if (r !== (k === 4 ? 'done' : 'picked')) { d4ok = false; d4notes.push('q' + k + ':r=' + r); break; }
    if (q.kind === 'mixfind') {
      const segsM = window.__queueHist.slice(hPre);          /* mixfind 确认链=[right, 名音] 两段 */
      const chainM = segsM.some(h => h.length === 2 && h[0] === 'ins_right' &&
                         h[1] === 'ins_a_' + q.anim && !keylessLast(h));
      if (!chainM) { d4ok = false; d4notes.push('q' + k + ':chain'); break; }
    }
    if (k < 4) await unlocked();
  }
  const d4done = d4ok && window.INS.currentLevel.done && window.INS.currentLevel.won &&
                 window.INS.currentLevel.stars === 3 && window.INS.currentLevel.miss === 0;
  if (d4done) npass++;
  units.dch4UI = { ok: d4done, notes: d4notes, lv: window.INS.currentLevel };

  /* ---- ⑭ rescueLayers（r26）：flat15 qi1 legs3 救援分层直驱（14s 方向级不掀叶/
       30s 答案级掀叶+breathe——分层判别力：任一层被删该单元红） ---- */
  total++;
  startLevel(15);
  await unlocked();
  const r14a = await window.INS.tapPick(deriveV(window.INS.quiz));   // qi0 judge3 对 → 进 qi1
  await unlocked();
  const q14 = window.INS.quiz;
  let lv14 = r14a === 'picked' && q14 && q14.kind === 'legs3' &&
             animalEl.classList.contains('leg-hide');
  /* 14s 方向级：科普句按主角类三向（insect→sci_insect / spider→sci_spider /
     干扰动物→sci_none）+腿仍藏+契合候选无 breathe */
  const sciExp14 = 'ins_sci_' + clsOfV(q14.anim);
  window.INS._idleHack(15000);
  window.INS._rescueCore();
  await wait(80);
  const dir14 = window.__lastVoiceKey === sciExp14 &&
                animalEl.classList.contains('leg-hide') &&
                !pickAt(q14.answer).classList.contains('breathe');
  /* 30s 答案级：契合候选 breathe+掀叶（视锚回归）+重播题面链 */
  window.INS._idleHack(31000);
  window.INS._rescueCore();
  await wait(80);
  const ans14 = pickAt(q14.answer).classList.contains('breathe') &&
                !animalEl.classList.contains('leg-hide') &&
                window.__lastQueue && window.__lastQueue.length === 2 &&
                window.__lastQueue[0] === 'ins_a_' + q14.anim &&
                window.__lastQueue[1] === 'ins_t_legs3';
  /* 掀叶后仍可作答（救援不锁盘） */
  const r14b = await window.INS.tapPick(q14.answer);
  const lv14ok = lv14 && dir14 && ans14 && r14b === 'picked';
  if (lv14ok) npass++;
  units.rescueLayers = { ok: lv14ok, atLegs3: lv14, dir: dir14, ans: ans14, sciExp: sciExp14, next: r14b };

  /* ---- ⑮ dch4Sweep（r26）：dch4 全 10 关（静态 15-19+生成 25/27/29/37/39）谱聚合 ---- */
  total++;
  const F4 = [15, 16, 17, 18, 19, 25, 27, 29, 37, 39];
  const sweepBad = [];
  const subjCls = { insect: 0, spider: 0, none: 0 };
  /* b40 维护挂账③：bodyseg 答案三向 tally（此前无聚合一盲区：BODY_POOL seeded
     取 1，若 many 向全不现（P(centipede 十关全不中)≈16% 随机口径）many 推导通道
     被删不红）。F4 seed 确定 → tally 为谱推导精确值（非观测）：主角序列
     bee/centipede/spider/bee/jumpspider/ant/jumpspider/bee/bee/spider =
     three×5 / two×4 / many×1（many 唯一实存=flat16 centipede）——断言取谱
     推导下界「三向各 ≥1」（禁抄运行观测值） */
  const segTally = { three: 0, two: 0, many: 0 };
  let distrSubj = 0, decoyAll = true, cond6 = 0, cond8 = 0, sweepDet = true;
  for (const f of F4) {
    const L = genLevel(f), L2 = genLevel(f);
    if (JSON.stringify(L) !== JSON.stringify(L2)) sweepDet = false;   // 含 cond/row 全字段确定性
    L.quizzes.forEach((q, qi) => {
      const why = structWhy(q, L.dch, L.lv, qi);
      if (why) sweepBad.push(f + '/' + qi + ':' + why);
      if (q.kind !== SPEC_DCH4_KINDS[qi]) sweepBad.push(f + '/' + qi + ':kind');
      if (q.answer !== deriveV(q)) sweepBad.push(f + '/' + qi + ':derive');
      if (q.kind === 'judge3' || q.kind === 'legs3') {
        const pid = pickIdOf3V(q.kind, q.anim);
        const cls = pid === 'insect' || pid === 'six' ? 'insect'
                  : (pid === 'spider' || pid === 'eight' ? 'spider' : 'none');
        subjCls[cls]++;
        if (SPEC_EXTRA.indexOf(q.anim) >= 0) distrSubj++;
      } else if (q.kind === 'bodyseg') {
        segTally[pickIdOf3V('bodyseg', q.anim)]++;   // 三向计数（SEGS 推导：3→three/2→two/其余→many）
      } else if (q.kind === 'mixfind') {
        if (!q.picks.some(p => SPEC_EXTRA.indexOf(p) >= 0)) decoyAll = false;   // 恒含干扰动物候选
        if (q.cond === 6) cond6++; else if (q.cond === 8) cond8++; else sweepBad.push(f + '/' + qi + ':cond');
      }
    });
  }
  const sweepOk = sweepBad.length === 0 && sweepDet && decoyAll &&
                  subjCls.insect > 0 && subjCls.spider > 0 && subjCls.none > 0 &&   // 三分类全现
                  distrSubj > 0 && cond6 > 0 && cond8 > 0 &&                        // 干扰主角/双条件全现
                  segTally.three > 0 && segTally.two > 0 && segTally.many > 0;      // 挂账③：bodyseg 三向实存（谱推导 5/4/1）
  if (sweepOk) npass++;
  units.dch4Sweep = { ok: sweepOk, bad: sweepBad.slice(0, 5), subjCls: subjCls,
                      distrSubj: distrSubj, decoyAll: decoyAll, cond: { 6: cond6, 8: cond8 },
                      segTally: segTally, det: sweepDet };

  const out = { game: 'ins', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__insVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史；voice.say 记录文本（__lastSayText）；
     voice.queue 记录拼播链（__lastQueue+__queueHist 全史——本款题面链走 queue） */
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
