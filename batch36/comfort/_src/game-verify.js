/* ================= ?verify=1 自检（仅 verify 分支加载执行）——r11 14 单元
   ① structure：朋友/做法卡/道具/后果气泡 SVG 全定义（data-anim 渲染即引擎）、
      DOM 无 undefined 文本、clips 10 条（co_ 7+core 3）全注入+duration 辨别器
      （±60ms）、answer 独立推导（=cards 中唯一 tier==='best' 的 i）、锚不泄答案
      （co_pick 文本与全部卡 label 无子串交集）、双 viewport（1280×800/800×1180）
      ×（flat0 2 卡/flat10 3 卡）布局（做法卡 ≥96×96、描边对比度 ≥3:1、
      overflowX ≤0）
   ② tutorial：教学三段（watch=情景+择优锚→幽灵手指点 best 卡→朋友破涕为笑→
      __coDemoR='right'；turn=scene0 首题你来试一试；帮→首对独 __coTutSolo+进
      正式关 flat=0 n=5；watch 段实测折算 ≤16s——单步演示款；锚 co_pick 在教学
      语音史中在场=r11 择优框架先教）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null/章号映射/
      kind 域（flat0-9 恒 best2/flat10-19 恒 grad3）/scene 序列独立复算（rotate
      公式 (ch-1)*5+((lv+qi)%5)）/best 唯一性对账（answer=独立推导禁读直比）/
      引擎直驱 tapCard(answer)→right/末题 done→3 星
   ④ frameM（契约 M 帧内容三层 ×flat0/10/20）：数值层 sceneEl.dataset.scene+
      卡 DOM 数+题面句真值（T46 化：voiceHist 末次 co_sc_*===期望键——best2 串播 co_pick 覆盖末值，禁读 __lastVoiceKey）/DOM 类层 #friend.sad
      （题面态）+三表情组在场（fx-sad/fx-meh/fx-happy）/演出层 点 best 卡后
      #friend.happy+best 卡 .good+后果气泡 #outcome[data-out=best]（r11 因果链）
   ⑤ grayPath（r11 delta②）：gray 卡 'wrong'+miss 计 1+朋友半好 meh+
      #outcome[data-out=gray] 部分缓解+灰链 [co_gray] 单 clip；豁免窗（真时钟
      3540）内 gray 二击吞 false 且 miss 不变；窗内 best 放行 'right'
   ⑥ badPath：bad 卡 'wrong'+miss+错链 [co_wrong,co_hint] 全 clip+sadder；
      豁免窗（真时钟 5898）内 bad 二击吞 false；窗内 best 放行；窗后第二错照计
      miss=2（契约 I 补）+best 卡 breathe（答案级）
   ⑦ pool：题库 20 题对账（SPEC §6 全表独立硬编码——情景句逐句+best/gray/bad
      三 tier 分布，禁读页面真值当期望源）
   ⑧ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑨ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32
      (flat*7919+757) python 式 JS 复刻）——verify 独立复算第一个随机数==dch
      +四档全现+卡数/scene 池域一致（dch≤2 恒 2 卡 best2 scene<10 / dch≥3 恒
      3 卡 grad3 scene≥10）+确定性（同 flat 两次生成 JSON 相等）
   ⑩ windows+contract：错链豁免窗 ==5898（=2544+150+2904+300）+确认窗
      ==2940（=2640+300）+择优锚窗 ==3252（=2952+300）+灰链豁免窗 ==3540
      （=3240+300）+教学延窗+celebrate 窗+契约 A/B/C/E/F/I/J/K 源码断言
      （读自身合并 script 文本）+CHAPTERS/GEN_HINTS 双录+nextHint 章末逐点
      独立副本断言（静态 4/9/14/19 M1 + 生成关 24/29/34/39 实算）+off-by-one
      哨兵（左右移）+契约 F 字面哨兵（找不到撞点必须 fail——r9 m5 纪律）
   ⑪ confirmChain：确认链构成 __lastQueue===['co_right']（right 单 clip 全 clip
      无 keyless——题面句/锚 play 单发不动 __lastQueue；T46 化题面句=co_sc_* clip）
   ⑫ save：真实写档链（init comfort→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_comfort v:'1.0' levels['1-0'] 更新；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑬ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（scene0/best2 2 卡/step=0/answer 独立推导）+
      window.CO 真实页暴露（b29 坑⑥）
   ⑭ duration（r11 门禁）：40 关 modeled 时长硬断言——独立副本常量重列（禁引
      引擎 DECIDE_MS/levelDurMs）：每关 =Σ每题[max(voiceWin,DECIDE)+ADV] ≥
      LEVEL_MIN_MS 40000+与源模型 levelDurMs 逐关对账一致+逐题 DECIDE ≥
      voiceWin（语音窗从不撑时长——认知步主体非演出窗）
   结果写 #verify-result + window.__coVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH36 §6 文字独立重列（禁抄页面 VOICE/CHAPTERS/常量/题库） */
  const SPEC_DUR = { co_tut_watch: 2880, co_tut_turn: 1824, co_hint: 2904,
                     co_right: 2640, co_wrong: 2544, co_pick: 2952, co_gray: 3240 };
  /* T46 情景句实长 20 键（voice/clips Audio 实测 09-19；co_sc_i ↔ SPEC_SCENES[i-1].say
     顺序注册；重复句 4 组取首现键——specKeyOf 同口径） */
  const SPEC_CO_SC = { 1: 3504, 2: 3360, 3: 3624, 4: 3432, 5: 2472, 6: 3288, 7: 3288,
                       8: 3048, 9: 2616, 10: 3096, 11: 3504, 12: 3288, 13: 2520, 14: 3048,
                       15: 2568, 16: 2568, 17: 2616, 18: 2712, 19: 2352, 20: 3264 };
  const specKeyOf = say => 'co_sc_' + (SPEC_SCENES.findIndex(r => r.say === say) + 1);   // 首现键
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_CH = { 1: { n: 2 }, 2: { n: 2 }, 3: { n: 3 }, 4: { n: 3 } };   // 卡数档
  const SPEC_CHAPTER_HINTS = { 1: '有时候最好的办法会变，想一想', 2: '三个做法里，哪个最有用呢',
                               3: '新老情景都来啦，帮朋友想到最好', 4: '新的难过情景来啦，继续帮朋友' };
  const SPEC_GEN_HINTS = ['两个做法都很好，哪个现在最好', '帮法会变，想一想哪个最合适',
                          '三种做法，哪个最有用', '三个里挑最好的，帮朋友开心'];
  /* SPEC §6 20 题全表（情景句=题面 keyless TTS 真值源；best 恰 1+gray 恰 1+
     best2 无 bad/grad3 恰 1 bad——三 tier 分布独立硬编码） */
  const SPEC_SCENES = [
    { say: '小熊的冰淇淋掉了，好想吃', best: '递自己的', gray: '抱抱它' },
    { say: '小兔摔了一跤，膝盖流血了', best: '找老师帮', gray: '扶它起来' },
    { say: '小猫的积木塔塌了，好想搭好', best: '一起搭', gray: '说没关系' },
    { say: '小狗的风筝挂树上了，够不到', best: '找大人帮', gray: '换样玩' },
    { say: '小羊的水杯打翻了', best: '拿纸巾', gray: '等水干' },
    { say: '小猴想妈妈了，眼泪汪汪', best: '陪它等', gray: '给块糖' },
    { say: '小熊害怕打雷声，躲起来了', best: '抱抱它', gray: '陪它玩' },
    { say: '小兔跑步输了，好难过', best: '说没关系', gray: '再跑一次' },
    { say: '小猫的小汽车不见了', best: '一起找', gray: '抱抱它' },
    { say: '小狗把画画坏了，想哭', best: '夸它努力', gray: '陪它再画' },
    { say: '小熊的冰淇淋掉了，好想吃', best: '递自己的', gray: '抱抱它', bad: '笑话它' },
    { say: '小猴想妈妈了，眼泪汪汪', best: '陪它等', gray: '给块糖', bad: '催别哭' },
    { say: '小鸡的气球飞走了', best: '再送一个', gray: '陪它玩', bad: '说活该' },
    { say: '小兔跑步输了，好难过', best: '说没关系', gray: '再跑一次', bad: '嘲笑它' },
    { say: '小猪午睡被吵醒了', best: '轻声说话', gray: '拍拍它', bad: '大声吵' },
    { say: '小鹿的新鞋踩脏了', best: '帮它擦', gray: '说没关系', bad: '踩一脚' },
    { say: '小猫的小汽车不见了', best: '帮着找', gray: '抱抱它', bad: '藏起来偷笑' },
    { say: '小松鼠的拼图少一块', best: '一起找', gray: '夸它努力', bad: '推乱拼图' },
    { say: '小熊害怕打雷声', best: '抱抱它', gray: '陪它玩', bad: '关灯吓它' },
    { say: '小马摔破了膝盖，流血了', best: '找老师帮', gray: '扶它起来', bad: '说娇气' }
  ];
  /* r11 时长模型独立副本（SPEC §6；DECIDE/ADV/PICK/ENTER/MIN 全重列禁引引擎） */
  const V_DECIDE = { best2: 10000, grad3: 11000 };
  const V_ADV = 2940, V_MIN = 40000, V_PICK = 3252, V_ENTER = 400;
  const estMsV = n => n.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  const voiceWinV = q => V_ENTER + estMsV(q.say) + 300 + (q.kind === 'best2' ? V_PICK : 0);
  const vDur = L => L.quizzes.reduce((s, q) => s + Math.max(voiceWinV(q), V_DECIDE[q.kind]) + V_ADV, 0);
  /* 独立 rng（SPEC §0.88 生成关策略）：mulberry32(flat*7919+757)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* 独立推导（SPEC §6 钩子契约）：answer=cards 中唯一 tier==='best' 的 i */
  const deriveAnswerV = cards => {
    let f = -1;
    for (let i = 0; i < cards.length; i++) if (cards[i].tier === 'best') { f = i; break; }
    return f;
  };
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链/灰链豁免窗（真时钟）过
    let g = 0;
    while (wrongChainUntil && Date.now() < wrongChainUntil && g++ < 60) await wait(250);
    return !(wrongChainUntil && Date.now() < wrongChainUntil);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即
     return 丢弃后续段——凡含 keyless 段的 queue 链中该段必须居末元素（本款确认链/
     错链/灰链全 clip 天然安全；断言器留作防回归） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);

  /* ---- ① structure：SVG 定义+DOM 干净+clips 全注入+answer 独立推导+锚不泄+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.CO.quiz;
  const cardDom = Array.from(cardsEl.querySelectorAll('.card-wrap'));
  const SPEC_ANIMS = ['bear', 'rabbit', 'cat', 'dog', 'sheep', 'monkey', 'chick', 'pig', 'deer', 'squirrel', 'horse'];
  const svgOk = q1 && cardDom.length === q1.cards.length &&
    cardDom.every(w => {
      const g = w.querySelector('.art svg > g[data-anim]');
      return !!g && typeof g.dataset.anim === 'string' && g.dataset.anim.length > 0;
    }) &&
    !!friendEl.querySelector('svg > g[data-anim="friend"]') &&                   // 朋友根组锚
    !!propEl.querySelector('svg > g[data-anim]') &&                              // 道具根组锚
    SPEC_ANIMS.every(id => friendSvg(id).indexOf('<svg') === 0) &&               // 朋友 11 种全定义
    outcomeSvg('best').indexOf('<svg') === 0 && outcomeSvg('gray').indexOf('<svg') === 0 &&   // 后果气泡两档可渲
    SPEC_SCENES.every((s, i) => friendSvg(SCENES[i].anim).indexOf('<svg') === 0 &&   // 题库行 anim 全可渲
      propSvg(SCENES[i].prop).indexOf('<svg') === 0 &&                            // 题库行 prop 全可渲
      SCENES[i].cards.every(c => cardIconSvg(c.icon).indexOf('<svg') === 0)) &&  // 题库行 icon 全可渲
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answer 独立推导（SPEC §6 唯一解锚——禁读 quiz.answer 直比推导依据） */
  const ansDeriveOk = q1 && q1.answer === deriveAnswerV(q1.cards) &&
                      q1.cards[q1.answer] && q1.cards[q1.answer].tier === 'best';
  /* r11 锚不泄答案：co_pick 文本与全部卡 label 无子串交集（双向） */
  const anchorTxt = VOICE.pick.text;
  const leakOk = SPEC_SCENES.every(s =>
    [s.best, s.gray].concat(s.bad ? [s.bad] : []).every(label =>
      anchorTxt.indexOf(label) < 0 && label.indexOf(anchorTxt) < 0));
  /* clips：co_ 27（既有 7+T46 情景句 20）+core 3 全注入+实长辨别（SPEC 表 ±60ms；
     core 3 条只验在场——core 实长不在本批实长表，禁猜值断言） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const specScKeys = Object.keys(SPEC_CO_SC).map(Number).sort((a, b) => a - b).map(i => 'co_sc_' + i);
  const preOk = keysAll.length === 30 &&
    specKeys.concat(SPEC_CORE_KEYS, specScKeys).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 2 卡/flat10 3 卡）——做法卡=主答案目标 ≥96×96 */
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
    document.body.classList.toggle('port', h > w);   /* 竖屏类通道（纪律⑤：媒体查询跟视口不跟元素） */
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(g._simFlat);
    const wraps = Array.from(cardsEl.querySelectorAll('.card-wrap'));
    if (g._simFlat >= 20)   /* m4 守卫：生成关 dch 随机禁按静态档硬算 need（防假阴性）——直接判不过 */
      return { vp: w + 'x' + h, flat: g._simFlat, cards: wraps.length, hitOk: false, contrast: false,
               ox: 0, inBox: false, portStyle: false, pass: false, note: 'simFlat>=20 不支持' };
    const need = SPEC_CH[Math.floor(g._simFlat / 5) + 1].n;    // 静态档卡数独立复算
    const hitOk = wraps.length === need && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 卡描边对比度
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    /* rect 落容器断言（纪律⑤）：卡矩形 ⊆ #game 矩形（2px 容差）——overflow:hidden 吞 scrollWidth
       溢出，几何才是可见性真值 */
    const gr = g.getBoundingClientRect();
    const inBox = wraps.every(b => {
      const r = b.getBoundingClientRect();
      return r.left >= gr.left - 2 && r.right <= gr.right + 2 &&
             r.top >= gr.top - 2 && r.bottom <= gr.bottom + 2;
    });
    /* 竖屏样式通道生效实锤：#friend 固定尺寸（横 168×156/竖 140×130）判别力最强。
       横屏 sim 仅当真实视口也横屏才断言 168（竖屏外层下 @media(portrait) 覆盖，量测无意义） */
    const realPort = window.innerHeight > window.innerWidth;
    const fw = friendEl.offsetWidth;
    const portStyle = h > w ? Math.abs(fw - 140) <= 2 : (realPort || Math.abs(fw - 168) <= 2);
    return { vp: w + 'x' + h, flat: g._simFlat, cards: wraps.length, hitOk: hitOk,
             contrast: cB, ox: ox, inBox: inBox, portStyle: !!portStyle,
             pass: hitOk && cB && ox <= 0 && inBox && !!portStyle };
  }
  const sims = [];
  for (const flat of [0, 10]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  document.body.classList.remove('port');           /* 清理竖屏类通道，不泄漏到后续单元 */
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);
  await unlocked();
  const layoutOk = sims.every(s => s.pass);
  const s1ok = svgOk && cleanDom && ansDeriveOk && leakOk && preOk && durOk && layoutOk;
  if (s1ok) npass++;
  units.structure = { ok: s1ok, svg: svgOk, dom: cleanDom, ansDerive: ansDeriveOk, noLeak: leakOk,
                      clips: preOk, dur: durOk, layout: layoutOk, sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（看→帮→独；r11 择优锚在教学语音史在场） ---- */
  total++;
  window.__coOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U12 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__coTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  const vh0 = window.__voiceHist.length;         // 教学期语音史订阅起点
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__coWatchMs || 1e9) / SPEED;       // watch 段实测（家族预算 ≤16s 只罩 watch）
  const anchorHeard = window.__voiceHist.slice(vh0).indexOf('co_pick') >= 0;   // r11：择优锚已教
  const tutHelp = window.__coDemoR === 'right' && state.tut === 'help' &&
                window.CO.currentLevel.flat === -1 &&
                window.CO.quiz.scene === 0 && window.CO.quiz.cards.length === 2 &&
                twWatch <= 16000 && tw <= 29000 && anchorHeard;
  await unlocked();
  const qT = window.CO.quiz;                                // "帮"阶段放手题（scene0 首题）
  const rT = await window.CO.tapCard(deriveAnswerV(qT.cards));   // 首次选对（独立推导 best 卡）→ 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__coTutSolo === true &&
                window.CO.currentLevel.flat === 0 && window.CO.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__coDemoR, tut: state.tut,
                     solo: window.__coTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT, anchorHeard: anchorHeard };

  /* ---- ③ drive：静态 20 关全量审计+SPEC 取题独立复算（answer=独立推导，禁读直比） ---- */
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
    const expCh = Math.floor(flat / 5) + 1;                       // 章号独立复算
    const chOk = L1.ch === expCh;
    const dchOk = L1.dch === expCh;                               // 静态四档 dch===ch
    /* r11 kind 域：flat0-9 恒 best2（2 卡）/flat10-19 恒 grad3（3 卡） */
    const kindOk = L1.quizzes.every(q => q.kind === (flat < 10 ? 'best2' : 'grad3'));
    /* SPEC §0.88 取题独立复算：scene=(ch-1)*5+((lv+qi)%5)（章池 rotate） */
    const lv = flat % 5;
    let sceneOk = true;
    for (let qi = 0; qi < 5; qi++) {
      const expScene = (expCh - 1) * 5 + ((lv + qi) % 5);
      if (L1.quizzes[qi].scene !== expScene) { badCase = 'scene ' + flat + '/' + qi; sceneOk = false; break; }
      if (L1.quizzes[qi].say !== SPEC_SCENES[expScene].say) { badCase = 'say ' + flat + '/' + qi; sceneOk = false; break; }
    }
    /* 引擎直驱：逐题点 best 卡（独立推导）→ right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const goodI = deriveAnswerV(q.cards);                      // 独立推导（SPEC §6 对账锚）
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      if (goodI < 0 || q.answer !== goodI) { driveOk = false; break; }
      const r = engTapCard(L3, goodI);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && ruleOk && chOk && dchOk && kindOk && sceneOk && driveOk && solvedAll;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
  }
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]);
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase };

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0/10/20：数值/DOM 类/演出层+后果链） ---- */
  total++;
  async function frameCheck(flat) {
    const vh0 = window.__voiceHist.length;       // 本关语音史订阅起点（best2 串播 co_pick 覆盖末值——hist 免疫）
    startLevel(flat);
    await unlocked();
    const q = window.CO.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 数值层：scene 锚+卡 DOM 数+题面句真值（T46 化：末次 co_sc clip 键===specKeyOf(quiz.say)——best2 题串播 co_pick 覆盖 __lastVoiceKey，须读 hist 切片末值） */
    const numOk = Number(sceneEl.dataset.scene) === q.scene &&
                  cardsEl.querySelectorAll('.card-wrap').length === q.cards.length &&
                  Number(cardsEl.dataset.n) === q.cards.length &&
                  window.__voiceHist.slice(vh0).filter(k => k.indexOf('co_sc_') === 0).pop() === specKeyOf(q.say) &&
                  Array.from(cardsEl.querySelectorAll('.card-wrap')).every((w, i) =>
                    !!cardsEl.querySelector('.card-wrap[data-i="' + i + '"]') && Number(w.dataset.i) === i);
    /* DOM 类层：题面态=朋友伤心（容器类 sad，非 happy/meh——fx-sad 组显+眼泪）；
       三表情组全在场（fx-sad/fx-meh r11/fx-happy） */
    const sadOk = friendEl.classList.contains('sad') && !friendEl.classList.contains('happy') &&
                  !friendEl.classList.contains('meh') &&
                  !!friendEl.querySelector('.fx-sad') && !!friendEl.querySelector('.fx-happy') &&
                  !!friendEl.querySelector('.fx-meh') &&
                  !(outcomeEl.classList.contains('show'));      // 题面态无后果气泡
    /* 演出层：点 best 卡（独立推导）→ 演出中段采样破涕为笑（happy）+best 卡 .good
       +后果气泡 best（r11 因果链好档——tapCard resolve 后非末题会 presentQuiz
       新题重置 DOM，断言须在演出窗内做） */
    const goodI = deriveAnswerV(q.cards);
    const pF = window.CO.tapCard(goodI);       // fire（演出开始）
    await wait(250);                            // 演出中段（cele 窗 353ms@SPEED.12 中点）
    const happyOk = friendEl.classList.contains('happy') && !friendEl.classList.contains('sad');
    const wrapOk = (function () { const w = cardWrapAt(goodI); return !!w && w.classList.contains('good'); })();
    const outOk = outcomeEl.dataset.out === 'best' && outcomeEl.classList.contains('show') &&
                  !!outcomeEl.querySelector('g[data-anim="out-best"]');
    const r = await pF;
    const joyOk = r === 'right' || r === 'done';
    return { ok: numOk && sadOk && joyOk && happyOk && wrapOk && outOk,
             why: JSON.stringify({ numOk, sadOk, joyOk, happyOk, wrapOk, outOk, r }) };
  }
  const fA = await frameCheck(0);      // dch1 best2 2 卡
  const fB = await frameCheck(10);     // dch3 grad3 3 卡
  const fC = await frameCheck(20);     // 生成关（卡数随 dch——帧断言不依赖卡数）
  const frameOk = fA.ok && fB.ok && fC.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat20: fC };

  /* ---- ⑤ grayPath（r11 delta②）：gray 卡=wrong+miss+半好 meh+部分缓解后果+灰链单 clip ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.CO.quiz;                        // scene0（best2：递自己的/抱抱它）
  const grayI = q5.cards.findIndex(c => c.tier === 'gray');      // gray 下标（独立推导）
  const h0 = window.__queueHist.length;
  const pG = window.CO.tapCard(grayI);              // → wrong（fire-and-forget）
  const rG = await pG;                              // 等灰反馈演出毕（locked=false）
  const midG = rG === 'wrong';
  await unlocked();                                 // 等演出锁余窗过——豁免窗仍在（真时钟 3540）
  const mehOk = friendEl.classList.contains('meh') && !friendEl.classList.contains('sad') &&
                !friendEl.classList.contains('happy');           // 半好态（r11 后果链灰档）
  const outG = outcomeEl.dataset.out === 'gray' && outcomeEl.classList.contains('show') &&
               !!outcomeEl.querySelector('g[data-anim="out-gray"]');
  const chainG = window.__queueHist.slice(h0).some(h => h.length === 1 && h[0] === 'co_gray' &&
                 typeof h[0] === 'string' && !keylessLast(h));    // 灰链=co_gray 单 clip 全 clip（契约 N）
  const rejG = await window.CO.tapCard(grayI);      // 豁免窗内 gray 二击=被吞 false（I 补：不计 miss）
  const missG = window.CO.quiz.miss === 1 && rejG === false;
  const passG = await window.CO.tapCard(q5.answer); // 豁免窗内 best=放行（I 补）→ 推进
  const passOkG = passG === 'right' && window.CO.quiz.step === 1;
  const grayOk = midG && mehOk && outG && chainG && missG && passOkG;
  if (grayOk) npass++;
  units.grayPath = { ok: grayOk, r: rG, meh: mehOk, outcome: outG, chain: chainG,
                     rejInWin: rejG === false, miss1: missG, bestPass: passOkG };
  await unlocked();                                 // 等新题开题演出完
  await waitChainOver();                            // 等灰链豁免窗（真时钟）过

  /* ---- ⑥ badPath：bad 卡错路径+豁免窗（真时钟 5898：窗内 bad 二击吞/窗内 best 放行/窗后二错照计 miss） ---- */
  total++;
  startLevel(10);
  await unlocked();
  const q6 = window.CO.quiz;                        // scene10（grad3：递自己的/抱抱它/笑话它）
  const badTap = (await window.CO.tapCard(99)) === null;           // 非法下标=null（不炸）
  const badI = q6.cards.findIndex(c => c.tier === 'bad');         // bad 下标（独立推导）
  const h0b = window.__queueHist.length;
  const pW = window.CO.tapCard(badI);                              // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                             // 等坏卡演出毕（locked=false）
  await unlocked();                                                // 等演出锁（showUntil 余窗）过——豁免窗仍在
  const sadderOk = friendEl.classList.contains('sadder');          // 更难过一拍（r11 后果链坏档——类驻留至下次 mood 切换）
  const chainW = window.__queueHist.slice(h0b).some(h =>
                 h.length === 2 && h[0] === 'co_wrong' &&          // 错链头=wrong clip
                 h[1] === 'co_hint' &&                             // 语义句=hint「想想怎样朋友会开心」
                 h.every(p => typeof p === 'string') &&            // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const rejW = await window.CO.tapCard(badI);                      // 豁免窗内 bad 二击=被吞 false（I 补：不计 miss）
  const miss1 = rW === 'wrong' && rejW === false && window.CO.quiz.miss === 1;
  const passW = await window.CO.tapCard(q6.answer);                // 豁免窗内 best=放行（I 补：缓解吞输入）→ 推进
  const passOk = passW === 'right' && window.CO.quiz.step === 1;
  await unlocked();                                                // 等新题开题演出完
  await waitChainOver();                                           // 等首错豁免窗（真时钟）过
  const q6b = window.CO.quiz;                                      // 题 1（rotate 取题=scene11）
  const badIb = q6b.cards.findIndex(c => c.tier === 'bad');
  const rD1 = await window.CO.tapCard(badIb);                      // 题 1 首错（miss=1）
  await unlocked();
  await waitChainOver();                                           // 等本错豁免窗过——窗后二错照计 miss
  const rD2 = await window.CO.tapCard(badIb);                      // 题 1 二错（miss=2）
  await unlocked();                                                // 等二错演出锁过
  const missAfter2 = window.CO.quiz.miss;                          // rE 前记录（best 卡推进会换题清零）
  const brEl = cardWrapAt(q6b.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');   // miss≥2=best 卡 breathe（答案级）
  const rE = await window.CO.tapCard(q6b.answer);                  // 卡不灰可重点（探索不罚）
  const wrongOk = badTap && sadderOk && miss1 && chainW && passOk &&
                  rD1 === 'wrong' && rD2 === 'wrong' &&
                  missAfter2 === 2 && breathe2 && rE === 'right';
  if (wrongOk) npass++;
  units.badPath = { ok: wrongOk, badTap: badTap, sadder: sadderOk, miss1: miss1, chain: chainW,
                    rejInWin: rejW === false, bestPass: passOk,
                    miss2: rD2 === 'wrong' && window.CO.quiz.miss === 2,
                    breathe2: breathe2, right: rE };

  /* ---- ⑦ pool：题库 20 题对账（SPEC §6 全表独立硬编码——情景句逐句+三 tier 分布） ---- */
  total++;
  let poolBad = null;
  for (let i = 0; i < 20 && !poolBad; i++) {
    const spec = SPEC_SCENES[i], row = SCENES[i];
    if (row.say !== spec.say) { poolBad = 'say ' + i; break; }
    const bests = row.cards.filter(c => c.tier === 'best').map(c => c.label);
    const grays = row.cards.filter(c => c.tier === 'gray').map(c => c.label);
    const bads = row.cards.filter(c => c.tier === 'bad').map(c => c.label).sort().join('|');
    if (bests.length !== 1 || bests[0] !== spec.best) { poolBad = 'best ' + i; break; }
    if (grays.length !== 1 || grays[0] !== spec.gray) { poolBad = 'gray ' + i; break; }
    if (bads !== (spec.bad ? [spec.bad].sort().join('|') : '')) { poolBad = 'bad ' + i; break; }
    if (row.cards.length !== 2 + (spec.bad ? 1 : 0)) { poolBad = 'n ' + i; break; }
  }
  /* 20 题覆盖审计：静态 20 关 rotate 各题恰现 5 次（§0.88 取题域全档成立） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.scene] = (cnt[q.scene] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 && SPEC_SCENES.every((s, i) => cnt[i] === 5);
  const poolOk = !poolBad && coverOk;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, cover: coverOk };

  /* ---- ⑧ stars：星级口径（0=3★/1-2=2★/≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑨ gen：生成关 flat20+（seeded ri(rnd,1,4) 独立复算+四档全现+域一致+确定性） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 757);      // SPEC §0.88：独立重写 rng（python 式复刻）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    const cfgN = SPEC_CH[L.dch].n;                   // 卡数域：dch≤2 恒 2 卡 best2/≥3 恒 3 卡 grad3
    if (!L.quizzes.every(q => q.cards.length === cfgN)) genBad.push(flat + ':cardsN');
    if (!L.quizzes.every(q => q.kind === (L.dch <= 2 ? 'best2' : 'grad3'))) genBad.push(flat + ':kind');
    if (!L.quizzes.every(q => q.scene < 10) && L.dch <= 2) genBad.push(flat + ':poolLow');   // 2 选池 scene0-9
    if (!L.quizzes.every(q => q.scene >= 10) && L.dch >= 3) genBad.push(flat + ':poolHigh');  // 3 选池 scene10-19
    const set = {};
    L.quizzes.forEach(q => { set[q.scene] = 1; });
    if (Object.keys(set).length !== 5) genBad.push(flat + ':dupScene');             // 无放回抽 5 题
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  const genOk = genBad.length === 0 && distOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch };

  /* ---- ⑩ windows+contract：窗静态断言（SPEC §4/§6 实长表）+契约源码断言+双录+
       nextHint 章末逐点独立副本+off-by-one 哨兵+F 字面哨兵 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = WRONG_CHAIN_WIN === 5898 &&                            // 坏链豁免窗 ==5898 精确
                WRONG_CHAIN_WIN === D.co_wrong + 150 + D.co_hint + 300 &&   // =2544+150+2904+300
                CELE_WIN === 2940 && CELE_WIN === D.co_right + 300 &&  // 确认窗=2640+300 精确
                PICK_WIN === 3252 && PICK_WIN === D.co_pick + 300 &&   // r11 择优锚窗=2952+300 精确
                GRAY_WIN === 3540 && GRAY_WIN === D.co_gray + 300 &&   // r11 灰链豁免窗=3240+300 精确
                TUT_WATCH_WAIT >= D.co_tut_watch + 300 &&              // watch 延 ≥3180
                TUT_TURN_WAIT >= D.co_tut_turn + 300 &&                // turn 延 ≥2124
                (2620 + 400) >= D.co_right + 300 &&                    // celebrate 3020 ≥ 2940
                estMsV('小猫的积木塔塌了，好想搭好') === 13 * 345 + 600 &&   // estMs 全字符口径（13 字 best2 最长句）
                SPEC_SCENES.every((s, i) => SPEC_CO_SC[i + 1] <= 400 + estMsV(s.say) + 300) &&   // T46：20 句 clip 实长全部 ≤ estMs 窗上界（窗不动依据）
                typeof levelDurMs === 'function' && LEVEL_MIN_MS === 40000;   // r11 时长模型在场（判卫 r7①）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'comfort'") >= 0;             // C：本款存档键 kidsgame_comfort
  const srcE = src.indexOf('sv.comfort && sv.comfort.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('wrongChainUntil = Date.now() + GRAY_WIN') >= 0 &&   // I：r11 灰链豁免窗赋值
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0;   // I 补：豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcD = src.indexOf("replayAnim(cardsEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
  const srcR11 = src.indexOf('KIDS.voice.play(VOICE.pick.key') >= 0 &&    // r11：择优锚串播在场
                 src.indexOf("renderOutcome('best')") >= 0 &&             // r11：后果链好档演出
                 src.indexOf("renderOutcome('gray')") >= 0 &&             // r11：后果链灰档演出
                 src.indexOf("setFriendMood('meh')") >= 0 &&              // r11：半好态切换
                 src.indexOf("dirVoice()") >= 0;                          // r11：方向提示按题型分流
  /* 双录独立硬编码对账（r11 §6 文案） */
  const srcHint = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&
                  CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                  CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                  CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                  GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                  GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3];
  /* r11 nextHint 章末逐点独立副本断言（M1/F/dressup r10 范式）：
     静态章末 [4,9,14,19] → CHAPTERS[floor(f/5)+1].hint（非当前章/非下下章——off-by-one 哨兵）；
     生成关 [24,29,34,39] → GEN_HINTS[genLevel(f+1).dch-1]（实算，禁 (ci+1)%4 字面） */
  let nhOkAll = true;
  const nhPts = {};
  for (const f of [4, 9, 14, 19]) {
    const ci = Math.floor(f / 5);
    const got = nextHint(f);
    nhPts['s' + f] = got;
    if (!(got === CHAPTERS[ci + 1].hint &&                              // M1：CHAPTERS[floor(f/5)+1]
          got !== (CHAPTERS[ci] || {}).hint &&                          // 左移哨兵（ci=0 无左邻跳过）
          (ci + 2 > 4 || got !== CHAPTERS[ci + 2].hint))) nhOkAll = false;   // 右移哨兵
  }
  for (const f of [24, 29, 34, 39]) {
    const got = nextHint(f);
    nhPts['g' + f] = got;
    if (got !== GEN_HINTS[genLevel(f + 1).dch - 1]) nhOkAll = false;   // F：实算
  }
  /* 契约 F 字面哨兵：找一个生成关使实算 dch-1 ≠ 字面 (ci+1)%4，断言 nextHint 跟实算
     不跟字面（r9 m5 纪律：找不到撞点=断言失效恒真路径，必须 fail 而非静默通过） */
  let sentOk = false, sentNote = 'no-diff-found';
  for (let f = 24; f < 60; f++) {
    const ci = Math.floor(f / 5), real = genLevel(f + 1).dch - 1, lit = (ci + 1) % 4;
    if (ci >= 4 && real !== lit) {
      sentOk = nextHint(f) === GEN_HINTS[real] && nextHint(f) !== GEN_HINTS[lit];
      sentNote = 'f=' + f + ' real=' + real + ' lit=' + lit;
      break;
    }
  }
  const srcSpeed = SPEED === 0.12;                       // verify 提速
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ && srcK &&
                     srcR11 && srcHint && nhOkAll && sentOk && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, r11: srcR11, hints: srcHint,
                    nhPerPoint: nhOkAll, sentinel: sentOk, sentNote: sentNote, pts: nhPts };

  /* ---- ⑪ confirmChain：确认链构成（__lastQueue===['co_right'] 单 clip；题面句与
       锚均 voice.play 单发不动 __lastQueue——T46 化后题面同为 play，仍非队列链） ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q11 = window.CO.quiz;
  const goodI11 = deriveAnswerV(q11.cards);
  const h0c = window.__queueHist.length;      // 订阅起点
  const r11u = await window.CO.tapCard(goodI11);
  const LQ = window.__lastQueue;
  const chainOk11 = r11u === 'right' &&
                    LQ && LQ.length === 1 && LQ[0] === 'co_right' &&        // 确认链=right 单 clip
                    JSON.stringify(LQ) === JSON.stringify(['co_right']) &&
                    !keylessLast(LQ) &&                                     // 全 clip 无 keyless（契约 N）
                    window.__queueHist.slice(h0c).some(h =>
                      h.length === 1 && h[0] === 'co_right');
  if (chainOk11) npass++;
  units.confirmChain = { ok: chainOk11, r: r11u,
                         queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑫ save：真实写档链（init comfort→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__coOrig.save, origPersist = window.__coOrig.persist;
  const origLS = localStorage.getItem('kidsgame_comfort');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_comfort');
    KIDS.init({ game: 'comfort', title: '安慰选择' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a12 = await window.CO.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_comfort');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a12.done && a12.taps === 5 && j && j.v === '1.0' && j.game === 'comfort' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a12.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U13 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_comfort');
  else localStorage.setItem('kidsgame_comfort', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑬ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
       审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'comfort', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, comfort: { tutSeen: true } };
  let q13 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_comfort', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__coDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.CO.start(0);
    await unlocked();
    q13 = window.CO.quiz;
    realOk = state.tut === 'none' && window.__coDemoR === null &&
             q13 && q13.scene === 0 && q13.kind === 'best2' && q13.cards.length === 2 &&
             q13.step === 0 && q13.miss === 0 &&
             q13.say === SPEC_SCENES[0].say &&
             q13.answer === deriveAnswerV(q13.cards) &&        // answer 独立推导
             window.CO.currentLevel.flat === 0 && window.CO.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.CO === 'object' && typeof window.CO.tapCard === 'function' &&
             typeof window.CO.autoSolve === 'function';        // b29 坑⑥：钩子真实页同暴露
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_comfort');
    else localStorage.setItem('kidsgame_comfort', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q13 && { scene: q13.scene, kind: q13.kind, n: q13.cards.length } };

  /* ---- ⑭ duration（r11 门禁）：40 关 modeled ≥40000+逐关对账+语音窗从不撑时长 ---- */
  total++;
  let dMin = Infinity, dFlat = -1, parityOk = true, voiceOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;             // 独立副本与源模型逐关对账
    for (const q of L.quizzes) {
      if (V_DECIDE[q.kind] < voiceWinV(q)) voiceOk = false;   // 逐题：决策 ≥ 语音窗（认知主体）
    }
  }
  const durUnitOk = dMin >= V_MIN && parityOk && voiceOk;
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
                     parity: parityOk, voiceNeverDominates: voiceOk,
                     decide: V_DECIDE, adv: V_ADV, pick: V_PICK };

  const out = { game: 'comfort', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__coVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史（r11：择优锚 co_pick 经此通道断言在场）；
     voice.play 记录 key+text（题面句 T46 化后走 play——__lastVoiceKey 对账源）；
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
