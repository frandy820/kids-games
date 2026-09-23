/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元
   （r50 难度改造：全程三选灰阶——fair 次优卡并入对账面）
   ① structure：主角/策略卡/道具 SVG 全定义（data-anim 渲染即引擎）、DOM 无
      undefined 文本、clips 39 条（cbx_ 36+core 3）全注入+全 36 条实长辨别器（r50-fix m-4 勘正）
      （±60ms）、answer 独立推导（=picks.indexOf(SPEC 表 good 列)——r50 锚，
      fair 同为好池卡，kind 口径作废）、双 viewport（1280×800/800×1180）×
      （flat0/flat10 均 3 卡）布局（策略卡 ≥96×96、描边对比度 ≥3:1、overflowX ≤0）
   ② tutorial：教学三段（watch=情境→幽灵手指点好卡→主角平静→__cbxDemoR
      ='picked'；turn=scene0 首题你来选一选（r50 起三选）；帮→首对独
      __cbxTutSolo+进正式关 flat=0 n=5；watch 段实测折算 ≤16s——单步演示款）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null（r50 恒
      三选+fair 类互异）/章号映射/N1 取题独立复算（rotate 公式 (ch-1)*5+
      ((lv+qi)%5)）/情境句对账（SPEC 独立表逐句）/好卡唯一性对账（answer=
      SPEC 表 good 列独立推导禁读直比）/引擎直驱 tapPick(answer)→picked/
      末题 done→3 星
   ④ frameM（契约 M 帧内容三层 ×flat0/10/20）：数值层 sceneEl.dataset.scene+
      dataset.emo+卡 DOM 数（恒 3）+题面 say 真值（play 锚 __lastVoiceText===
      quiz.say——T46 clip 化）/DOM 类层 #friend.emo-<族>（题面态）/演出层
      点好卡后 #friend.calm+好卡 .good（平静）
   ⑤ wrongPath（r50 三链）：fair 次优卡 'wrong'+miss+辨析链 [cbx_hint,
      cbx_sc_N 情境重播]全 clip+fair 卡 .fair 本体在场（r47 M1：元素本体在
      场性，演出中段采样）+豁免窗内 fair 二击吞 false；窗内好卡放行 'picked'；
      坏卡 'wrong'+错链 [cbx_wrong, cbx_b_<id>] 按所点卡取后果句；中性卡同
      路径链尾 cbx_n_<id>；窗后第二错照计 miss=2（契约 I 补）+好卡 breathe
   ⑥ pool：题库 20 题对账（SPEC §2+R50 全表独立硬编码——情境句逐句+emo+
      good/fair/bad/neutral id）+策略池 11 结构对账（kind+label 独立表）+
      fair 律对账（fair∈好池+≠good+类互异（SPEC_CLASS 独立表）+同章 fair
      互异+全局每张恰 4 次）+同章句互异+句长 8-14 全字符（禁读页面真值当期望源）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32
      (flat*7919+897) python 式 JS 复刻）——verify 独立复算第一个随机数==dch
      +四档全现+恒 3 卡/scene 池域一致（dch≤2 scene<10 / dch≥3 scene≥10）+
      确定性（同 flat 两次生成 JSON 相等）+答案位分布（静态+生成 200 题三桶
      下界独立推导：均匀期望 66.7−3σ6.7≈46——r39-bis 纪律①洗牌配分布断言）
   ⑨ windows+contract：错链豁免窗 ==6834（=2160+150+4224+300 窗按 max——N2
      总窗口径）恒 ≥ 坏/中性实链 6258 与 fair 辨析链 6258（hint 2208+150+
      sc max 3600+300——r50 双族断言）+首错锁 SHAKE_MS 1100 ≤ wrong+150=2310
      且 ≤ hint+150=2358（N2）+确认链锁窗动态式 celeWinOf==2592+150+dur(g)+
      300 恒 ≥CELE_WIN 2892==2592+300+教学延窗+celebrate 窗+契约 A/B/C/D/E/
      F/I/J/K 源码断言（读自身合并 script 文本）+wrongChainOf 三分流源码断言+
      CHAPTERS/GEN_HINTS 双录（r50 新文案）+nextHint 4/9/14/19 数值断言+
      24/29/34/39 实算（b35 m5 范式）
   ⑩ confirmChain：确认链构成 __lastQueue===['cbx_right','cbx_g_<好卡id>']
      （两段全 clip 无 keyless——好卡句承载策略指导 SPEC §2；题面 say 走
      voice.say 不动 __lastQueue）
   ⑪ save：真实写档链（init cbx→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_cbx v:'1.0' levels['1-0'] 更新；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（scene0/3 卡/step=0/answer 独立推导）+window.CBX
      真实页暴露（b29 坑⑥）
   结果写 #verify-result + window.__cbxVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH40 §2 文字独立重列（禁抄页面 VOICE/CLIP_DUR/POOL/SCENES/CHAPTERS/常量） */
  const SPEC_DUR = {
    cbx_tut_watch: 3000, cbx_tut_turn: 1872, cbx_hint: 2208, cbx_right: 2592, cbx_wrong: 2160,
    cbx_g_breath: 4224, cbx_g_countten: 3168, cbx_g_hugbunny: 3360, cbx_g_sayout: 2328, cbx_g_drinkwater: 3240,
    cbx_b_throw: 3336, cbx_b_shout: 3408, cbx_b_hit: 3648, cbx_b_tear: 3144,
    cbx_n_cryonly: 3384, cbx_n_hide: 3144,
    // T46 阶段2：情境句 cbx_sc_1..20（mutagen 实测=浏览器口径）
    cbx_sc_1: 3408, cbx_sc_2: 3456, cbx_sc_3: 3384, cbx_sc_4: 3600, cbx_sc_5: 3192,
    cbx_sc_6: 3528, cbx_sc_7: 3168, cbx_sc_8: 3312, cbx_sc_9: 3264, cbx_sc_10: 3432,
    cbx_sc_11: 3432, cbx_sc_12: 3168, cbx_sc_13: 3048, cbx_sc_14: 3240, cbx_sc_15: 3072,
    cbx_sc_16: 3120, cbx_sc_17: 3192, cbx_sc_18: 3168, cbx_sc_19: 3576, cbx_sc_20: 3240
  };
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  /* 策略池 11（SPEC §2 定表独立硬编码——kind+label 对账） */
  const SPEC_POOL = {
    breath: { kind: 'good', label: '深呼吸' }, countten: { kind: 'good', label: '慢慢数到十' },
    hugbunny: { kind: 'good', label: '抱抱小兔子' }, sayout: { kind: 'good', label: '说出来' },
    drinkwater: { kind: 'good', label: '喝口水' },
    throw: { kind: 'bad', label: '摔玩具' }, shout: { kind: 'bad', label: '大喊大叫' },
    hit: { kind: 'bad', label: '打人' }, tear: { kind: 'bad', label: '撕书' },
    cryonly: { kind: 'neutral', label: '一直哭' }, hide: { kind: 'neutral', label: '躲起来不理人' }
  };
  const SPEC_CH = { 1: { n: 3 }, 2: { n: 3 }, 3: { n: 3 }, 4: { n: 3 } };   // r50：恒三选
  /* r50 好卡功能类表（SPEC-R50 §R2 类约束独立硬编码——fair 类互异对账锚）：
     A 降温（breath/countten）/ B 安抚（hugbunny/drinkwater）/ C 表达（sayout） */
  const SPEC_CLASS = { breath: 'A', countten: 'A', hugbunny: 'B', drinkwater: 'B', sayout: 'C' };
  const SPEC_CHAPTER_HINTS = { 1: '难过的时候，也有好办法', 2: '害怕时三张都像好办法，挑最帮你的',
                               3: '做不好别灰心，工具箱还能用', 4: '新的心情来了，工具接着帮你' };
  const SPEC_GEN_HINTS = ['三种工具，选让心里舒服的', '心里难受，三张挑最帮你的',
                          '三张都像好办法，选最帮自己的', '三个里挑一个，让心里舒服'];
  /* SPEC §2+R50 20 题全表（情境句=题面 clip 真值源；good=最佳/fair=次优/bad/neutral id） */
  const SPEC_SCENES = [
    { emo: 'angry', say: '弟弟推倒你的积木，你好生气', good: 'breath',     fair: 'drinkwater', bad: 'throw' },
    { emo: 'angry', say: '同学抢走你的画笔，你气坏了', good: 'countten',   fair: 'sayout',     bad: 'hit' },
    { emo: 'angry', say: '排队时有人插队，气鼓鼓的',   good: 'sayout',     fair: 'hugbunny',   bad: 'shout' },
    { emo: 'angry', say: '妹妹弄坏你的小车，好想发火', good: 'drinkwater', fair: 'countten',   bad: 'tear' },
    { emo: 'angry', say: '游戏输了，你气得直跺脚',     good: 'hugbunny',   fair: 'breath',     bad: 'shout' },
    { emo: 'sad',   say: '心爱的气球飞走了，你好难过', good: 'breath',     fair: 'hugbunny',   bad: 'tear' },
    { emo: 'sad',   say: '好朋友转学了，你好难过',     good: 'hugbunny',   fair: 'countten',   bad: 'shout' },
    { emo: 'sad',   say: '画好的画弄脏了，你很难过',   good: 'drinkwater', fair: 'sayout',     bad: 'throw' },
    { emo: 'sad',   say: '小金鱼不动了，你心里难过',   good: 'sayout',     fair: 'breath',     bad: 'hit' },
    { emo: 'sad',   say: '下雨天去不了公园，好难过',   good: 'countten',   fair: 'drinkwater', bad: 'tear' },
    { emo: 'fear',  say: '半夜听到怪声音，你有点害怕', good: 'breath',     fair: 'hugbunny',   neutral: 'hide' },
    { emo: 'fear',  say: '打雷声好响，你吓得发抖',     good: 'hugbunny',   fair: 'countten',   neutral: 'hide' },
    { emo: 'fear',  say: '房间黑黑的，你不敢进去',     good: 'sayout',     fair: 'breath',     neutral: 'hide' },
    { emo: 'fear',  say: '看牙医的时候，你心里害怕',   good: 'countten',   fair: 'drinkwater', neutral: 'cryonly' },
    { emo: 'fear',  say: '大狗汪汪叫，你吓得后退',     good: 'drinkwater', fair: 'sayout',     neutral: 'cryonly' },
    { emo: 'frus',  say: '鞋带总系不好，你好灰心',     good: 'breath',     fair: 'sayout',     neutral: 'cryonly' },
    { emo: 'frus',  say: '跳绳总绊脚，你有点泄气',     good: 'countten',   fair: 'drinkwater', neutral: 'cryonly' },
    { emo: 'frus',  say: '拼图好难，你拼得直叹气',     good: 'hugbunny',   fair: 'breath',     neutral: 'hide' },
    { emo: 'frus',  say: '写的字歪歪扭扭，你好泄气',   good: 'sayout',     fair: 'hugbunny',   neutral: 'cryonly' },
    { emo: 'frus',  say: '学骑车总摔倒，你灰心了',     good: 'drinkwater', fair: 'countten',   neutral: 'hide' }
  ];
  const estMsV = n => n.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* 独立 rng（SPEC §0 生成关策略）：mulberry32(flat*7919+897)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* 独立推导（SPEC-R50 钩子契约）：answer=picks.indexOf(SPEC 表 good 列)
     ——r50 起候选含 2 张好池卡（good 最佳+fair 次优），「唯一 kind=good」
     旧口径作废；独立锚=SPEC_SCENES[scene].good（题表真值，禁读 quiz.answer） */
  const deriveAnswerV = (scene, picks) => picks.indexOf(SPEC_SCENES[scene].good);
  const deriveFairV = (scene, picks) => picks.indexOf(SPEC_SCENES[scene].fair);   // fair 位独立推导
  /* 独立推导补集：picks 中 kind==='bad'/'neutral' 的下标 */
  const findKindV = (picks, kind) => picks.findIndex(id => (SPEC_POOL[id] || {}).kind === kind);
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链豁免窗（真时钟 6834）过
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

  /* ---- ① structure：SVG 定义+DOM 干净+clips 全注入+全实长辨别+answer 独立推导+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.CBX.quiz;
  const cardDom = Array.from(cardsEl.querySelectorAll('.pick'));
  const svgOk = q1 && cardDom.length === q1.picks.length &&
    cardDom.every(w => {
      const g = w.querySelector('.art svg > g[data-anim]');
      return !!g && typeof g.dataset.anim === 'string' && g.dataset.anim.length > 0;
    }) &&
    !!friendEl.querySelector('svg > g[data-anim="friend"]') &&                   // 主角根组锚
    !!propEl.querySelector('svg > g[data-anim]') &&                              // 道具根组锚
    friendSvg().indexOf('<svg') === 0 &&                                         // 主角可渲（含 5 表情组）
    Object.keys(SPEC_POOL).every(id => cardIconSvg(POOL[id].icon).indexOf('<svg') === 0) &&   // 池 11 图标全可渲
    SPEC_SCENES.every((s, i) => propSvg(PROP_OF[i]).indexOf('<svg') === 0) &&    // 20 题道具全可渲
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answer 独立推导（SPEC-R50 唯一解锚=SPEC 表 good 列——禁读 quiz.answer 直比） */
  const ansDeriveOk = q1 && q1.answer === deriveAnswerV(q1.scene, q1.picks) &&
                      q1.picks.length === 3 &&
                      q1.picks[q1.answer] === SPEC_SCENES[q1.scene].good;
  /* clips：cbx_ 36+core 3 全注入+全 36 条实长辨别（SPEC §2 实长表 ±60ms（r50-fix m-4）；
     core 3 条只验在场——core 实长不在本批实长表，禁猜值断言） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const preOk = keysAll.length === 39 &&
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0/flat10 均 3 卡——r50 恒三选）——策略卡=主答案目标 ≥96×96 */
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
    const wraps = Array.from(cardsEl.querySelectorAll('.pick'));
    if (g._simFlat >= 20)   /* m4 守卫：生成关 dch 随机禁按静态档硬算 need（防假阴性）——直接判不过 */
      return { vp: w + 'x' + h, flat: g._simFlat, cards: wraps.length, hitOk: false, contrast: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    const need = SPEC_CH[Math.floor(g._simFlat / 5) + 1].n;    // 静态档卡数独立复算
    const hitOk = wraps.length === need && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 卡描边对比度
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, cards: wraps.length, hitOk: hitOk,
             contrast: cB, ox: ox, pass: hitOk && cB && ox <= 0 };
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

  /* ---- ② tutorial：教学三段（看→帮→独） ---- */
  total++;
  window.__cbxOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__cbxTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__cbxWatchMs || 1e9) / SPEED;      // watch 段实测（家族预算 ≤16s 只罩 watch）
  const tutHelp = window.__cbxDemoR === 'picked' && state.tut === 'help' &&
                window.CBX.currentLevel.flat === -1 &&
                window.CBX.quiz.scene === 0 && window.CBX.quiz.picks.length === 3 &&
                twWatch <= 16000 && tw <= 26000;
  await unlocked();
  const qT = window.CBX.quiz;                                // "帮"阶段放手题（scene0 首题，r50 三选）
  const rT = await window.CBX.tapPick(deriveAnswerV(qT.scene, qT.picks));   // 首次选对（独立推导好卡）→ 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__cbxTutSolo === true &&
                window.CBX.currentLevel.flat === 0 && window.CBX.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__cbxDemoR, tut: state.tut,
                     solo: window.__cbxTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT };

  /* ---- ③ drive：静态 20 关全量审计+N1 取题独立复算（answer=独立推导，禁读直比） ---- */
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
    const dchOk = L1.dch === expCh;                               // 静态四档 dch===ch（SPEC §0.3）
    /* N1 取题独立复算：scene=(ch-1)*5+((lv+qi)%5)（章池 rotate 定版语义） */
    const lv = flat % 5;
    let sceneOk = true;
    for (let qi = 0; qi < 5; qi++) {
      const expScene = (expCh - 1) * 5 + ((lv + qi) % 5);
      if (L1.quizzes[qi].scene !== expScene) { badCase = 'scene ' + flat + '/' + qi; sceneOk = false; break; }
      if (L1.quizzes[qi].say !== SPEC_SCENES[expScene].say) { badCase = 'say ' + flat + '/' + qi; sceneOk = false; break; }
    }
    /* 引擎直驱：逐题点好卡（独立推导 SPEC 表 good 列）→ picked / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const goodI = deriveAnswerV(q.scene, q.picks);             // 独立推导（SPEC-R50 对账锚）
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'picked';
      if (goodI < 0 || q.answer !== goodI) { driveOk = false; break; }
      const r = engTapPick(L3, goodI);
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

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0/10/20：数值/DOM 类/演出层） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.CBX.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 数值层：scene+emo 锚+卡 DOM 数+题面 say 真值（play 锚 __lastVoiceText===quiz.say——T46 clip 化） */
    const numOk = Number(sceneEl.dataset.scene) === q.scene &&
                  sceneEl.dataset.emo === q.emo &&
                  cardsEl.querySelectorAll('.pick').length === q.picks.length &&
                  Number(cardsEl.dataset.n) === q.picks.length &&
                  window.__lastVoiceText === q.say &&
                  window.__lastVoiceKey === q.sayKey &&
                  Array.from(cardsEl.querySelectorAll('.pick')).every((w, i) =>
                    !!cardsEl.querySelector('.pick[data-i="' + i + '"]') && Number(w.dataset.i) === i);
    /* DOM 类层：题面态=主角情绪族（容器类 emo-<族>，非 calm）+五表情组在场 */
    const emoOk = friendEl.classList.contains('emo-' + q.emo) && !friendEl.classList.contains('calm') &&
                  !!friendEl.querySelector('.fx-' + q.emo) && !!friendEl.querySelector('.fx-calm');
    /* 演出层：点好卡（独立推导）→ 演出中段采样平静（calm）+好卡 .good
       （tapPick resolve 后非末题会 presentQuiz 新题重置 DOM——断言须在演出窗内做） */
    const goodI = deriveAnswerV(q.scene, q.picks);
    const pF = window.CBX.tapPick(goodI);       // fire（演出开始）
    await wait(250);                            // 演出中段（动态窗 643-872ms@SPEED.12 内中点）
    const calmOk = friendEl.classList.contains('calm') && !friendEl.classList.contains('emo-' + q.emo);
    const wrapOk = (function () { const w = pickAt(goodI); return !!w && w.classList.contains('good'); })();
    const r = await pF;
    const joyOk = r === 'picked' || r === 'done';
    return { ok: numOk && emoOk && joyOk && calmOk && wrapOk,
             why: JSON.stringify({ numOk, emoOk, joyOk, calmOk, wrapOk, r }) };
  }
  const fA = await frameCheck(0);      // dch1（生气，r50 恒 3 卡）
  const fB = await frameCheck(10);     // dch3（害怕，纯灰阶）
  const fC = await frameCheck(20);     // 生成关（卡数随 dch——帧断言不依赖卡数）
  const frameOk = fA.ok && fB.ok && fC.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat20: fC };

  /* ---- ⑤ wrongPath（r50 三链）：fair 次优卡（题0）→辨析链 [cbx_hint, cbx_sc_N]+
       .fair 本体在场；坏卡（题1）→[cbx_wrong, cbx_b_<id>]；中性卡（flat10）；豁免窗
       （真时钟 6834：窗内错点吞/窗内好卡放行/窗后二错照计 miss） ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.CBX.quiz;
  const badTap = (await window.CBX.tapPick(99)) === null;           // 非法下标=null（不炸）
  /* fair 段（题0 scene0：good=breath/fair=drinkwater/bad=throw——SPEC 表推导） */
  const fairI = deriveFairV(q5.scene, q5.picks);                    // fair 位独立推导
  const fairEl5 = pickAt(fairI);                                    // r47 M1：元素本体在场性（节点存在）
  const pF = window.CBX.tapPick(fairI);                             // fire（演出开始）
  const fairCls = !!fairEl5 && fairEl5.classList.contains('fair') && !fairEl5.classList.contains('bad');   // 同步采样：fair 轻摆非 bad 摇头
  const rF = await pF;                                              // → wrong（fair=非最佳计 miss）
  await unlocked();
  const chainF = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'cbx_hint' &&           // 辨析链头=hint（非否定——SEL 诚实红线）
                 h[1] === q5.sayKey &&                              // 尾段=情境句重播（cbx_sc_N 辨析教学闭环）
                 h.every(p => typeof p === 'string') && !keylessLast(h));
  const rejF = await window.CBX.tapPick(fairI);                     // 豁免窗内 fair 二击=被吞 false（不计 miss）
  const missF = rF === 'wrong' && rejF === false && window.CBX.quiz.miss === 1;
  const passF = await window.CBX.tapPick(deriveAnswerV(q5.scene, q5.picks));   // 窗内好卡放行（I 补）→ 推进
  const passOk = passF === 'picked' && window.CBX.quiz.step === 1;
  await unlocked();                                                 // 等新题开题演出完
  await waitChainOver();                                            // 等 fair 链豁免窗（真时钟）过
  /* 坏卡段（题1 rotate 取题=scene1：bad=hit） */
  const q5b = window.CBX.quiz;
  const badIb = findKindV(q5b.picks, 'bad');
  const badId1 = q5b.picks[badIb];
  const h0W = window.__queueHist.length;
  const rD1 = await window.CBX.tapPick(badIb);                      // 题 1 首错（miss=1，错链起播）
  await unlocked();
  const chainW = rD1 === 'wrong' && window.__queueHist.slice(h0W).some(h =>
                 h.length === 2 && h[0] === 'cbx_wrong' &&          // 错链头=wrong clip
                 h[1] === 'cbx_b_' + badId1 &&                      // 尾段=按所点坏卡取后果句（SPEC §2）
                 h.every(p => typeof p === 'string') && !keylessLast(h));
  await waitChainOver();                                            // 等本错豁免窗过——窗后二错照计 miss
  const rD2 = await window.CBX.tapPick(badIb);                      // 题 1 二错（miss=2）
  await unlocked();                                                 // 等二错演出锁过
  const missAfter2 = window.CBX.quiz.miss;                          // rE 前记录（好卡推进会换题清零）
  const brEl = pickAt(q5b.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');    // miss≥2=好卡 breathe（答案级）
  const rE = await window.CBX.tapPick(q5b.answer);                  // 卡不灰可重点（探索不罚）
  /* 中性卡路径（三选题 flat10 dch3）：点中性卡=wrong+错链尾段 cbx_n_<id>（SPEC §2） */
  startLevel(10);
  await unlocked();
  const q5c = window.CBX.quiz;
  const neuI = findKindV(q5c.picks, 'neutral');                     // 中性卡下标（独立推导）
  const neuId = neuI >= 0 ? q5c.picks[neuI] : null;
  const h0n = window.__queueHist.length;
  const rN = neuI >= 0 ? await window.CBX.tapPick(neuI) : null;     // → wrong（中性卡错点）
  const chainN = neuI >= 0 && rN === 'wrong' && window.CBX.quiz.miss === 1 &&
                 window.__queueHist.slice(h0n).some(h =>
                   h.length === 2 && h[0] === 'cbx_wrong' &&
                   h[1] === 'cbx_n_' + neuId &&                     // 尾段=按所点中性卡取温和引导句
                   h.every(p => typeof p === 'string') && !keylessLast(h));
  const wrongOk = badTap && missF && chainF && fairCls && passOk &&
                  rD1 === 'wrong' && rD2 === 'wrong' && chainW &&
                  missAfter2 === 2 && breathe2 && rE === 'picked' && chainN;
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, fairR: rF, fairCls: fairCls,
                      chainFair: chainF, rejFairInWin: rejF === false, missF: missF,
                      passInWin: passOk, chainBad: chainW, badId: badId1,
                      miss2: rD2 === 'wrong' && missAfter2 === 2,
                      breathe2: breathe2, right: rE, chainNeutral: chainN, neuId: neuId };

  /* ---- ⑥ pool：题库 20 题对账+池结构（SPEC §2+R50 全表独立硬编码——情境句逐句+
       good/fair/bad/neutral id+fair 四律+同章句互异+句长 8-14 全字符） ---- */
  total++;
  let poolBad = null;
  for (let i = 0; i < 20 && !poolBad; i++) {
    const spec = SPEC_SCENES[i], row = SCENES[i];
    if (row.say !== spec.say) { poolBad = 'say ' + i; break; }
    if (row.emo !== spec.emo) { poolBad = 'emo ' + i; break; }
    if (row.good !== spec.good || row.bad !== spec.bad) { poolBad = 'goodbad ' + i; break; }
    if (row.fair !== spec.fair) { poolBad = 'fair ' + i; break; }
    if ((row.neutral || null) !== (spec.neutral || null)) { poolBad = 'neutral ' + i; break; }
    const n = row.say.length;
    if (n < 8 || n > 14) { poolBad = 'len ' + i + '=' + n; break; }   // 情境句 8-14 字符（SPEC §2）
  }
  /* 同章 5 题情境句互异（SPEC §2）+全局 20 句互异 */
  for (let c = 0; c < 4 && !poolBad; c++) {
    const says = SPEC_SCENES.slice(c * 5, c * 5 + 5).map(s => s.say);
    if (new Set(says).size !== 5) { poolBad = 'chDup ' + (c + 1); break; }
  }
  if (!poolBad && new Set(SPEC_SCENES.map(s => s.say)).size !== 20) poolBad = 'globalDup';
  /* 池结构对账：11 卡 kind+label 逐张（SPEC 定表）+三档计数（好 5/坏 4/中性 2）+互异 */
  for (const id in SPEC_POOL) {
    if (!POOL[id]) { poolBad = 'poolMiss ' + id; break; }
    if (POOL[id].kind !== SPEC_POOL[id].kind || POOL[id].label !== SPEC_POOL[id].label) {
      poolBad = 'pool ' + id; break;
    }
  }
  const kindsCnt = Object.keys(SPEC_POOL).reduce((m, id) => { m[SPEC_POOL[id].kind] = (m[SPEC_POOL[id].kind] || 0) + 1; return m; }, {});
  const poolStructOk = (kindsCnt.good === 5 && kindsCnt.bad === 4 && kindsCnt.neutral === 2) &&
                       Object.keys(SPEC_POOL).length === 11;
  /* 好卡唯一解锚（r50 口径：ch1-2=good+fair+bad / ch3-4=good+fair+neutral 互斥）：
     good ∈ 好集+bad(若有)∈ 坏集+neutral(若有)∈ 中性集+候选 id 全互异+档位对齐 */
  const goodSet = Object.keys(SPEC_POOL).filter(id => SPEC_POOL[id].kind === 'good');
  const badSet = Object.keys(SPEC_POOL).filter(id => SPEC_POOL[id].kind === 'bad');
  const neuSet = Object.keys(SPEC_POOL).filter(id => SPEC_POOL[id].kind === 'neutral');
  const uniqOk = SPEC_SCENES.every((s, i) =>
    goodSet.indexOf(s.good) >= 0 &&
    (!s.bad || badSet.indexOf(s.bad) >= 0) &&
    (!s.neutral || neuSet.indexOf(s.neutral) >= 0) &&
    s.good !== s.bad && s.good !== s.neutral && s.bad !== s.neutral &&
    (i < 10 ? (!!s.bad && !s.neutral) : (!s.bad && !!s.neutral)));
  /* fair 四律（SPEC-R50 §R2 灰阶可教锚——独立类表推导，实现坏成同类双好必红）：
     ①fair ∈ 好池 ②fair≠good ③类互异（SPEC_CLASS）④同章互异+全局每张恰 4 次 */
  const fairOk = SPEC_SCENES.every(s =>
    goodSet.indexOf(s.fair) >= 0 && s.fair !== s.good &&
    SPEC_CLASS[s.fair] !== SPEC_CLASS[s.good] &&
    s.fair !== s.bad && s.fair !== (s.neutral || s.bad)) &&
    [0, 1, 2, 3].every(c => new Set(SPEC_SCENES.slice(c * 5, c * 5 + 5).map(s => s.fair)).size === 5);
  const fairCnt = SPEC_SCENES.reduce((m, s) => { m[s.fair] = (m[s.fair] || 0) + 1; return m; }, {});
  const fairDistOk = goodSet.every(id => fairCnt[id] === 4);        // 20 题/5 张=每张恰 4 次（均衡推导）
  /* 20 题覆盖审计：静态 20 关 rotate 各题恰现 5 次（N1 取题域全档成立） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.scene] = (cnt[q.scene] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 && SPEC_SCENES.every((s, i) => cnt[i] === 5);
  const poolOk = !poolBad && poolStructOk && uniqOk && fairOk && fairDistOk && coverOk;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, struct: poolStructOk, uniq: uniqOk,
                 fair: fairOk, fairDist: fairDistOk, cover: coverOk };

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

  /* ---- ⑧ gen：生成关 flat20+（seeded ri(rnd,1,4) 独立复算+四档全现+恒三选+
       域一致+确定性+fair 域+答案位分布） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 897);      // SPEC §0：独立重写 rng（python 式复刻，seed 897）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    const cfgN = SPEC_CH[L.dch].n;                   // r50：恒 3 卡（四档同构）
    if (!L.quizzes.every(q => q.picks.length === cfgN)) genBad.push(flat + ':picksN');
    if (!L.quizzes.every(q => q.scene < 10) && L.dch <= 2) genBad.push(flat + ':poolLow');   // dch≤2 池 scene0-9
    if (!L.quizzes.every(q => q.scene >= 10) && L.dch >= 3) genBad.push(flat + ':poolHigh');  // dch≥3 池 scene10-19
    if (!L.quizzes.every(q => q.picks.indexOf(SPEC_SCENES[q.scene].fair) >= 0)) genBad.push(flat + ':fairMiss');   // fair 恒在候选
    const set = {};
    L.quizzes.forEach(q => { set[q.scene] = 1; });
    if (Object.keys(set).length !== 5) genBad.push(flat + ':dupScene');             // 章池 rotate 全 5 题互异
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  /* 答案位分布（r39-bis 纪律①：picks 洗牌声明必配分布断言+下界独立推导——
     静态 20 关+生成 20 关=200 题三桶；均匀期望 200/3≈66.7、二项 σ=√(200·⅓·⅔)≈6.7，
     下界=期望−3σ≈46（推导值非观测值——实现坏成 good 恒位 0 时桶 1/2=0 必红） */
  const posCnt = { 0: 0, 1: 0, 2: 0 };
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { posCnt[q.answer] = (posCnt[q.answer] || 0) + 1; });
  }
  const posOk = posCnt[0] >= 46 && posCnt[1] >= 46 && posCnt[2] >= 46 &&
                (posCnt[0] + posCnt[1] + posCnt[2]) === 200;
  const genOk = genBad.length === 0 && distOk && posOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch, ansPos: posCnt };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §2 实长表+N2 总窗口径）+契约源码断言+
       双录+nextHint 实算 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const scMaxV = SPEC_SCENES.reduce((m, s, i) => Math.max(m, D['cbx_sc_' + (i + 1)]), 0);   // 情境句实长 max=3600（sc_4）
  const winOk = WRONG_CHAIN_WIN === 6834 &&                            // 豁免窗 ==6834 精确（窗按 max）
                WRONG_CHAIN_WIN === D.cbx_wrong + 150 + D.cbx_g_breath + 300 &&   // =2160+150+4224+300（N2 总窗口径）
                WRONG_CHAIN_WIN >= D.cbx_wrong + 150 + Math.max(D.cbx_b_hit, D.cbx_n_cryonly) + 300 &&   // 恒 ≥ 实播错链（6258）
                WRONG_CHAIN_WIN >= D.cbx_hint + 150 + scMaxV + 300 &&  // r50：恒 ≥ fair 辨析链（2208+150+3600+300=6258）
                CELE_WIN === 2892 && CELE_WIN === D.cbx_right + 300 &&  // 确认窗下界=2592+300 精确
                celeWinOf('sayout') === D.cbx_right + 150 + D.cbx_g_sayout + 300 &&   // 动态锁窗=right+150+好卡句+300 全链
                Object.keys(CLIP_DUR.g).every(id =>
                  celeWinOf(id) === D.cbx_right + 150 + D['cbx_g_' + id] + 300 &&
                  celeWinOf(id) >= CELE_WIN) &&                         // 动态窗恒 ≥ SPEC 下界 2892
                SHAKE_MS * 1 + 140 <= D.cbx_wrong + 150 &&              // 首错锁总窗 1240 ≤2310（N2 总窗口径，审查 m-1 修）
                SHAKE_MS * 1 + 140 <= D.cbx_hint + 150 &&               // r50：≤ fair 链首段 hint+150=2358（N2 同口径）
                TUT_WATCH_WAIT >= D.cbx_tut_watch + 300 &&              // watch 延 ≥3300
                TUT_TURN_WAIT >= D.cbx_tut_turn + 300 &&                // turn 延 ≥2172
                (2620 + 400) >= D.cbx_right + 300 &&                    // celebrate 3020 ≥ 2892
                estMsV('弟弟推倒你的积木，你好生气') === 13 * 345 + 600;   // estMs 全字符口径（13 字最长句：8 字+逗号+4 字）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'cbx'") >= 0;                 // C：本款存档键 kidsgame_cbx
  const srcE = src.indexOf('sv.cbx && sv.cbx.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0 &&   // I 补：豁免窗 guard
               src.indexOf('const wrongChainOf = (q, id) =>') >= 0 &&            // r50：三分流链构造在场
               src.indexOf("[VOICE.hint.key, q.sayKey]") >= 0;                   // r50：fair 辨析链=[hint, 情境句]
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcD = src.indexOf("replayAnim(cardsEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
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
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ && srcK && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, hints: srcHint };

  /* ---- ⑩ confirmChain：确认链构成（__lastQueue===['cbx_right','cbx_g_<好卡id>']
       两段全 clip——好卡句承载策略指导 SPEC §2；题面 say 走 voice.say 不动
       __lastQueue） ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q10 = window.CBX.quiz;
  const goodI10 = deriveAnswerV(q10.scene, q10.picks);
  const h0 = window.__queueHist.length;      // 订阅起点
  const r10 = await window.CBX.tapPick(goodI10);
  const LQ = window.__lastQueue;
  const gId10 = q10.picks[goodI10];
  const chainOk10 = r10 === 'picked' &&
                    LQ && LQ.length === 2 && LQ[0] === 'cbx_right' &&
                    LQ[1] === 'cbx_g_' + gId10 &&                // 确认链=right+按好卡取好卡句两段
                    JSON.stringify(LQ) === JSON.stringify(['cbx_right', 'cbx_g_' + gId10]) &&
                    !keylessLast(LQ) &&                                     // 全 clip 无 keyless（契约 N）
                    window.__queueHist.slice(h0).some(h =>
                      h.length === 2 && h[0] === 'cbx_right' && h[1] === 'cbx_g_' + gId10);
  if (chainOk10) npass++;
  units.confirmChain = { ok: chainOk10, r: r10, goodId: gId10,
                         queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑪ save：真实写档链（init cbx→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__cbxOrig.save, origPersist = window.__cbxOrig.persist;
  const origLS = localStorage.getItem('kidsgame_cbx');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_cbx');
    KIDS.init({ game: 'cbx', title: '冷静工具箱' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.CBX.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_cbx');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'cbx' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_cbx');
  else localStorage.setItem('kidsgame_cbx', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
       审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'cbx', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, cbx: { tutSeen: true } };
  let q12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_cbx', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__cbxDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.CBX.start(0);
    await unlocked();
    q12 = window.CBX.quiz;
    realOk = state.tut === 'none' && window.__cbxDemoR === null &&
             q12 && q12.scene === 0 && q12.picks.length === 3 &&
             q12.step === 0 && q12.miss === 0 &&
             q12.say === SPEC_SCENES[0].say &&
             q12.answer === deriveAnswerV(q12.scene, q12.picks) &&        // answer 独立推导（SPEC 表 good 列）
             window.CBX.currentLevel.flat === 0 && window.CBX.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.CBX === 'object' && typeof window.CBX.tapPick === 'function' &&
             typeof window.CBX.autoSolve === 'function';        // b29 坑⑥：钩子真实页同暴露
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_cbx');
    else localStorage.setItem('kidsgame_cbx', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { scene: q12.scene, n: q12.picks.length } };

  const out = { game: 'cbx', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__cbxVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史（T46 题面 clip 化后题面锚=play）；voice.say 记录题面情境句（__lastSayText
     ——SPEC §2 题面 say 非队列链，不进 __lastQueue）；voice.queue 记录拼播链
     （__lastQueue+__queueHist 全史） */
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
