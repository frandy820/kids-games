/* ================= ?verify=1 自检（仅 verify 分支加载执行）——r12 14 单元
   ① structure：元素/候选 SVG 全定义（pickSvg 三列十七元素 bg4+st8+wish5+
      data-el 渲染即引擎）、贺卡层位 DOM 与引擎真值一致（dataset.scene/stage/
      occ/kind/who）、DOM 无 undefined 文本、clips 11 条（crd_ 8+core 3）全注入+
      duration 辨别器（±60ms）、answer 独立推导（=picks 中 SPEC_TABLE 行步
      correct 下标）、双 viewport（1280×800/800×1180）×（flat0 两步/flat10 三步）
      布局（候选 ≥96×96、描边对比度 ≥3:1、overflowX ≤0）
   ② tutorial：教学三段（watch=线索句→幽灵手指点契合项→落位→__crdDemoR
      ='placed'（§4 教学末步）；turn=行 0 偏好卡你来做完两步；帮→首对独
      __crdTutSolo+进正式关 flat=0 n=5；watch 段实测折算 ≤16s——单步演示款）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null（含 r12
      语义四规则）/章号映射 ch=flat/5+1/取材域=scene 落本章程（题表行 kind/occ/
      who/nstage 对账）/逐步 answer 独立复算/引擎直驱 engTapPick(answer)→placed/
      末题末步 done→3 星 +UI 一题多步链（flat10 首卡=row10 三步：stage 推进
      step 不动（每步重读 quiz——b38 坑③假卡死防线）+中途落位 DOM 留存+
      卡完成入贺卡集）
   ④ frameM（契约 M 帧内容三层 ×flat0/10/20）：数值层 card.dataset.scene/
      stage/occ/kind/who+层位数+题面 say 真值（play 锚 __lastVoiceText===quiz.say——T46 clip 化）+盘数/
      DOM 类层（唯一 .slot.cur 落当前 col+已落层数=stage+贺卡集=step）/演出层
      选对后目标层 .placed+svg[data-el]=契合元素（落位永久留存）+候选 .good
   ⑤ wrongPath：干扰项 'wrong'+miss 计数+错链 [crd_wrong,crd_hint_步型]（r12
      分流——flat0 首步 h='like'→[crd_wrong,crd_hint_like]）全 clip+虚影消散
      不落位（目标层无 data-el）；豁免窗（真时钟 CHAIN_WIN.like 4626）内干扰项
      二击吞 false 且 miss 不变；窗内契合项放行 'placed'（stage 推进）；窗后
      第二错照计 miss（契约 I 补）+契合候选 breathe（答案级）
   ⑥ pool：题表 20 行对账（SPEC_TABLE r12 全表独立硬编码——kind/occ/who/
      nstage/say/每步三元组+h 逐项，禁读页面真值当期望源）+数学先验复算
      （三元组互异+属列封闭集+冲突项 tree/mum/horn 恒非 correct+like 步偏好
      per 题反直配 likeMutex（非全局互斥——M2 口径）+theme 步**干扰项**排除
      收卡人偏好元素（M2 收窄口径））+20 静态关 rotate 覆盖审计
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32
      (flat*7919+857) python 式 JS 复刻）——verify 独立复算第一个随机数==dch
      +四档全现+每步盘数=3/池域一致（dch≤2 恒两步 行 0-9 / dch≥3 恒三步
      行 10-19）+确定性（同 flat 两次生成 JSON 相等）+无放回（同关 5 题互异）
   ⑨ windows+contract：错链豁免窗四链精确（CHAIN_WIN.like=4626
      =1968+150+2208+300 / clash=4554=1968+150+2136+300 / wish=4674
      =1968+150+2256+300 / theme=5010=1968+150+2592+300）+选对窗
      ==2316（=2016+300）+首错锁总窗口径（SHAKE_MS×1+140=1240 ≤1968+150
      ——b39 定版）+锁窗运行时公式在场+教学延窗+celebrate 窗+契约 A/B/C/D/
      E/F/I/J/K 源码断言（读 script[2] 合并文本——b36 M1 分离后恢复判别力）+
      r12 分流源码断言（HINT_OF/CHAIN_WIN[st.h]/sayDirHint/DECIDE_MS/
      levelDurMs）+CHAPTERS/GEN_HINTS 双录+nextHint 4/9/14/19 数值断言
      +24/29/34/39 实算（b35 m5 范式）
   ⑩ confirmChain：确认链构成 __lastQueue===['crd_right']（right 单 clip 全 clip
      无 keyless——题面线索句走 voice.say 不动 __lastQueue，SPEC §1 明示）
   ⑪ save：真实写档链（init crd→autoSolve 通关 5 卡 10 步→winFlow verify 分支
      persistWin→localStorage kidsgame_crd v:'1.0' levels['1-0'] 更新；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（row0 偏好题/两步/col=bg/h='like'/step=0/answer
      独立推导）+window.CRD 真实页暴露（b29 坑⑥）；try/finally 保异常时
      origLS 也恢复（b36 m4）
   ⑬ deltaAnchors（r12 门禁）：三 delta 反启发式实锤断言——
      静态：翻转锚集（同元素跨题在正解集与干扰集双现——SPEC_TABLE 独立推导
      ≥5 元素+四点名锚 cake/bear/wbd/flags）+冲突项 tree/mum/horn 恒非
      correct+flower 恒 grandma 偏好正解+wbd 行10 正解/行11 干扰（同收卡人
      grandma 跨场合=delta③ 表级实锤）；
      运行时：a.反直配（start(0) 行0 bg 步盘含 flags 生日默认→点 flags=
      'wrong'——主题直配失败，点 clouds（奶奶偏好）='placed'）；b.冲突排除
      （start(5) 行5 st 步盘含 lant2+tree 同屏→点 tree='wrong'+miss，点
      lant2='placed'）；c.语用翻转（start(10) 做到 wish 步点 wbd='placed'；
      start(11) 同收卡人 sick 卡 wish 步点 wbd='wrong'——同祝福语判定随场合
      翻转，点 wkang='placed'）
   ⑭ duration（r12 门禁）：40 关 modeled 时长硬断言——独立副本常量重列（禁引
      引擎：V_DECIDE/V_ADV/V_MIN/V_ENTER/V_STAGE/V_FIN）≥40000+与源模型
      levelDurMs 逐关对账+每步 DECIDE≥voiceWin（认知步主体——语音窗从不撑时长）
   结果写 #verify-result + window.__crdVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH39 §1 r12 文字独立重列（禁抄页面 VOICE/CHAPTERS/常量/题表） */
  const SPEC_DUR = { crd_tut_watch: 2928, crd_tut_turn: 1728, crd_hint: 2592,
                     crd_right: 2016, crd_wrong: 1968,
                     crd_hint_like: 2208, crd_hint_no: 2136, crd_hint_wish: 2256,
                     // T46 阶段2：情境句 crd_sc_1..20（mutagen 实测=浏览器口径）
                     crd_sc_1: 4008, crd_sc_2: 4176, crd_sc_3: 4032, crd_sc_4: 4176, crd_sc_5: 3552,
                     crd_sc_6: 3288, crd_sc_7: 3144, crd_sc_8: 3120, crd_sc_9: 3216, crd_sc_10: 3168,
                     crd_sc_11: 3432, crd_sc_12: 3480, crd_sc_13: 3624, crd_sc_14: 3528, crd_sc_15: 3216,
                     crd_sc_16: 3768, crd_sc_17: 3144, crd_sc_18: 3480, crd_sc_19: 3384, crd_sc_20: 3576 };
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  /* r12 三封闭表（SPEC §1 r12——独立对账依据） */
  const SPEC_OCC_EL = { birthday: { bg: 'flags',  st: 'cake',   wish: 'wbd' },
                        newyear:  { bg: 'lant',   st: 'lant2',  wish: 'wny' },
                        thanks:   { bg: 'hearts', st: 'heart',  wish: 'wth' },
                        sorry:    { bg: 'clouds', st: 'bear',   wish: 'wsr' },
                        sick:     { bg: 'hearts', st: 'heart',  wish: 'wkang' } };
  const SPEC_WHO_LIKE = { grandma: { bg: 'clouds', st: 'flower' },
                          monkey:  { bg: 'hearts', st: 'bear' } };
  const SPEC_CONFLICT = { newyear: 'tree', birthday: 'mum' };
  const SPEC_COL_EL = { bg: ['flags', 'lant', 'hearts', 'clouds'],
                        st: ['cake', 'lant2', 'heart', 'bear', 'flower', 'horn', 'tree', 'mum'],
                        wish: ['wbd', 'wny', 'wth', 'wsr', 'wkang'] };
  const SPEC_COLS = nstage => nstage === 3 ? ['bg', 'st', 'wish'] : ['bg', 'st'];
  /* SPEC_TABLE 20 行 r12 全表（kind/occ/who/nstage/say/steps [col,correct,d1,d2,h]） */
  const SPEC_TABLE = [
    { kind: 'like', occ: 'birthday', who: 'grandma', nstage: 2, say: '奶奶喜欢云朵和花，做张生日贺卡',
      steps: [['bg', 'clouds', 'flags', 'lant', 'like'], ['st', 'flower', 'cake', 'heart', 'like']] },
    { kind: 'like', occ: 'newyear', who: 'monkey', nstage: 2, say: '小猴喜欢爱心和熊，做张新年贺卡',
      steps: [['bg', 'hearts', 'lant', 'flags', 'like'], ['st', 'bear', 'lant2', 'heart', 'like']] },
    { kind: 'like', occ: 'newyear', who: 'grandma', nstage: 2, say: '奶奶喜欢云朵和花，做张新年贺卡',
      steps: [['bg', 'clouds', 'lant', 'hearts', 'like'], ['st', 'flower', 'lant2', 'bear', 'like']] },
    { kind: 'like', occ: 'birthday', who: 'monkey', nstage: 2, say: '小猴喜欢爱心和熊，做张生日贺卡',
      steps: [['bg', 'hearts', 'flags', 'lant', 'like'], ['st', 'bear', 'cake', 'heart', 'like']] },
    { kind: 'like', occ: 'birthday', who: 'friend', nstage: 2, say: '朋友怕吵闹，做张生日贺卡',
      steps: [['bg', 'flags', 'clouds', 'hearts', 'theme'], ['st', 'cake', 'horn', 'heart', 'like']] },
    { kind: 'clash', occ: 'newyear', who: 'friend', nstage: 2, say: '过新年啦，做张新年贺卡',
      steps: [['bg', 'lant', 'flags', 'hearts', 'theme'], ['st', 'lant2', 'tree', 'cake', 'clash']] },
    { kind: 'clash', occ: 'newyear', who: 'friend', nstage: 2, say: '新年到，做张新年贺卡',
      steps: [['bg', 'lant', 'hearts', 'clouds', 'theme'], ['st', 'lant2', 'tree', 'heart', 'clash']] },
    { kind: 'clash', occ: 'birthday', who: 'friend', nstage: 2, say: '生日到，做张生日贺卡',
      steps: [['bg', 'flags', 'lant', 'clouds', 'theme'], ['st', 'cake', 'mum', 'lant2', 'clash']] },
    { kind: 'clash', occ: 'birthday', who: 'friend', nstage: 2, say: '好朋友过生日，做张贺卡',
      steps: [['bg', 'flags', 'hearts', 'clouds', 'theme'], ['st', 'cake', 'mum', 'bear', 'clash']] },
    { kind: 'clash', occ: 'newyear', who: 'friend', nstage: 2, say: '过年啦，做张过年的贺卡',
      steps: [['bg', 'lant', 'clouds', 'flags', 'theme'], ['st', 'lant2', 'tree', 'bear', 'clash']] },
    { kind: 'wish', occ: 'birthday', who: 'grandma', nstage: 3, say: '奶奶过生日，做张生日贺卡',
      steps: [['bg', 'flags', 'lant', 'hearts', 'theme'], ['st', 'cake', 'heart', 'bear', 'theme'], ['wish', 'wbd', 'wny', 'wth', 'wish']] },
    { kind: 'wish', occ: 'sick', who: 'grandma', nstage: 3, say: '奶奶生病住院了，做张贺卡',
      steps: [['bg', 'hearts', 'flags', 'lant', 'theme'], ['st', 'heart', 'cake', 'lant2', 'theme'], ['wish', 'wkang', 'wbd', 'wth', 'wish']] },
    { kind: 'wish', occ: 'thanks', who: 'teacher', nstage: 3, say: '老师帮我捡画，做张感谢贺卡',
      steps: [['bg', 'hearts', 'flags', 'clouds', 'theme'], ['st', 'heart', 'cake', 'lant2', 'theme'], ['wish', 'wth', 'wbd', 'wsr', 'wish']] },
    { kind: 'wish', occ: 'sick', who: 'monkey', nstage: 3, say: '小猴生病了，做张贺卡送他',
      steps: [['bg', 'hearts', 'clouds', 'lant', 'theme'], ['st', 'heart', 'cake', 'lant2', 'theme'], ['wish', 'wkang', 'wny', 'wbd', 'wish']] },
    { kind: 'wish', occ: 'newyear', who: 'grandma', nstage: 3, say: '新年到，给奶奶做张贺卡',
      steps: [['bg', 'lant', 'flags', 'hearts', 'theme'], ['st', 'lant2', 'heart', 'bear', 'theme'], ['wish', 'wny', 'wbd', 'wkang', 'wish']] },
    { kind: 'mix', occ: 'birthday', who: 'grandma', nstage: 3, say: '奶奶喜欢云朵和花，做生日贺卡',
      steps: [['bg', 'clouds', 'flags', 'lant', 'like'], ['st', 'flower', 'cake', 'heart', 'like'], ['wish', 'wbd', 'wkang', 'wth', 'wish']] },
    { kind: 'mix', occ: 'newyear', who: 'friend', nstage: 3, say: '过新年，做张新年贺卡',
      steps: [['bg', 'lant', 'flags', 'hearts', 'theme'], ['st', 'lant2', 'tree', 'cake', 'clash'], ['wish', 'wny', 'wbd', 'wkang', 'wish']] },
    { kind: 'mix', occ: 'sick', who: 'monkey', nstage: 3, say: '小猴生病了，他喜欢抱抱熊',
      steps: [['bg', 'hearts', 'clouds', 'lant', 'theme'], ['st', 'bear', 'heart', 'cake', 'like'], ['wish', 'wkang', 'wny', 'wth', 'wish']] },
    { kind: 'mix', occ: 'birthday', who: 'friend', nstage: 3, say: '生日派对，做张生日贺卡',
      steps: [['bg', 'flags', 'lant', 'clouds', 'theme'], ['st', 'cake', 'mum', 'heart', 'clash'], ['wish', 'wbd', 'wny', 'wsr', 'wish']] },
    { kind: 'mix', occ: 'newyear', who: 'monkey', nstage: 3, say: '小猴喜欢爱心和熊，过新年',
      steps: [['bg', 'hearts', 'lant', 'flags', 'like'], ['st', 'bear', 'lant2', 'heart', 'like'], ['wish', 'wny', 'wbd', 'wkang', 'wish']] }
  ];
  const SPEC_CHAPTER_HINTS = { 1: '节日贺卡来啦，想想这个节日用不用', 2: '要做三步的贺卡啦，祝福语也要选对',
                               3: '综合贺卡来啦，样样都要想一想', 4: '新的贺卡做不完，动动脑筋继续做' };
  const SPEC_GEN_HINTS = ['听听他喜欢什么，做张贺卡', '节日贺卡，这个节日不用它',
                          '祝福语也要选，想想现在什么事', '综合贺卡，样样都要想一想'];
  const estMsV = n => n.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* r14 时长模型独立副本（SPEC r12；DECIDE/ADV/MIN/ENTER/STAGE/FIN 全重列禁引引擎） */
  const V_DECIDE = { like: 10000, clash: 9000, wish: 9000, mix: 11000 };
  const V_ADV = 2316, V_MIN = 40000, V_ENTER = 400, V_STAGE = 400, V_FIN = 700 + 600;
  const vVoice = (q, k) => k === 0 ? (V_ENTER + estMsV(SPEC_TABLE[q.scene].say) + 300) : V_STAGE;
  const vDur = L => L.quizzes.reduce((s, q, i) => {
    const row = SPEC_TABLE[q.scene];
    let d = 0;
    for (let k = 0; k < row.steps.length; k++) d += Math.max(vVoice(q, k), V_DECIDE[row.kind]) + V_ADV;
    return s + d + (i === L.quizzes.length - 1 ? 0 : V_FIN);   // 末题卡不送出（§5.0 ⑤）
  }, 0);
  /* 独立 rng（SPEC §0.94 生成关策略）：mulberry32(flat*7919+857)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* 独立推导（SPEC §1 钩子契约）：answer=picks 中 SPEC_TABLE 行步 correct 的下标
     ——禁读 quiz.answer 直比推导依据 */
  const deriveAnswerV = quiz => quiz.picks.indexOf(SPEC_TABLE[quiz.scene].steps[quiz.stage][1]);
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链豁免窗（真时钟 CHAIN_WIN[h]）过
    let g = 0;
    while (wrongChainUntil && Date.now() < wrongChainUntil && g++ < 80) await wait(250);
    return !(wrongChainUntil && Date.now() < wrongChainUntil);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段（{key:null}）播完即
     return 丢弃后续段——凡含 keyless 段的 queue 链中该段必须居末元素（本款确认链/
     错链全 clip 天然安全；断言器留作防回归） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);

  /* ---- ① structure：SVG 定义+层位 DOM 真值+DOM 干净+clips 全注入+answer 独立推导+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.CRD.quiz;
  const pickDoms = Array.from(trayEl.querySelectorAll('.pick-wrap'));
  const svgOk = q1 && pickDoms.length === q1.picks.length &&
    pickDoms.every(w => {
      const g = w.querySelector('.art svg > g[data-anim]');
      return !!g && typeof g.dataset.anim === 'string' && g.dataset.anim.length > 0;
    }) &&
    cardEl.querySelectorAll('.layer').length === SPEC_COLS(q1.nstage).length &&
    SPEC_COL_EL.bg.every(e => bgCard(e).indexOf('<svg') === 0 && bgCard(e).indexOf('data-el="' + e + '"') >= 0) &&
    SPEC_COL_EL.st.every(e => stSvg(e).indexOf('<svg') === 0 && stSvg(e).indexOf('data-el="' + e + '"') >= 0) &&
    SPEC_COL_EL.wish.every(e => wishSvg(e).indexOf('<svg') === 0 && wishSvg(e).indexOf('data-el="' + e + '"') >= 0) &&
    SPEC_COL_EL.bg.every(e => bgCardLayer(e).indexOf('<svg') === 0) &&               // 底纹层四纹全可渲
    SPEC_TABLE.every(r => {                          // 题表行全可渲（每步三元组三元素+贺卡集缩略）
      const cols = SPEC_COLS(r.nstage);
      const rowOk = r.steps.every((sp, k) =>
        [sp[1], sp[2], sp[3]].every(e => pickSvg(cols[k], e).indexOf('<svg') === 0));
      return rowOk;   /* m2 删恒真死代码（原 indexOf(r)===0?true:true）——行级对账归 pool 单元 */
    }) &&
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answer 独立推导（SPEC §1 r12 唯一契合锚——表三元组互斥保证唯一） */
  const ansDeriveOk = q1 && q1.answer === deriveAnswerV(q1) &&
                      q1.picks[q1.answer] === SPEC_TABLE[q1.scene].steps[q1.stage][1];
  /* clips：crd_ 28（T46 阶段2 情境句 +20）+core 3 全注入+crd 实长辨别（SPEC §4 实长表 ±60ms；core 3 条只验
     在场——core 实长不在本批实长表，禁猜值断言） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const preOk = keysAll.length === 31 &&
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 两步/flat10 三步）——候选=主答案目标 ≥96×96
     （crd 候选恒 3 枚——5-6 候选≤3，盘数不随章变） */
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
  function simView(w, h, port) {
    const g = $id('game');
    document.body.classList.toggle('port', !!port);       // 竖屏类通道（与 @media 逐条等值——M3）
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(g._simFlat);
    const wraps = Array.from(trayEl.querySelectorAll('.pick-wrap'));
    if (g._simFlat >= 20) {   /* m4 守卫：生成关 dch 随机禁按静态档硬算（防假阴性）——直接判不过 */
      document.body.classList.remove('port');
      return { vp: w + 'x' + h + (port ? 'P' : ''), flat: g._simFlat, picks: wraps.length, hitOk: false, contrast: false, inBox: false, portStyle: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    }
    const hitOk = wraps.length === 3 && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);   // 候选恒 3 枚
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 候选描边对比度
    wraps.forEach(b => b.classList.remove('pop'));   /* 入场动画 transform 使 rect 失真（探针实锤
                                                        pick bottom 超 tray 8px）——量测前清动画类（startLevel 每轮重建 DOM 无残留） */
    const pr = wraps[0].getBoundingClientRect(), tr = trayEl.getBoundingClientRect();
    const inBox = pr.left >= tr.left - 2 && pr.right <= tr.right + 2 &&
                  pr.top >= tr.top - 2 && pr.bottom <= tr.bottom + 2;   // 候选落盘容器（M3 三件之二）
    const aw = wraps[0].querySelector('.art').offsetWidth;
    /* 竖屏样式通道生效实锤（M3 三件之三）：.art 固定宽（横 80/竖 72）判别力最强。
       横屏 sim 仅当真实视口也横屏才断言 80（真竖屏外层下 @media 覆盖量测无意义
       ——thanks r12 形态；真通道由 P1b 真竖视口轮+artW=72 外部断言兜底） */
    const realPort = window.innerHeight > window.innerWidth;
    const portStyle = port ? (aw >= 70 && aw <= 74) : (realPort || (aw >= 78 && aw <= 82));
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');
    return { vp: w + 'x' + h + (port ? 'P' : ''), flat: g._simFlat, picks: wraps.length, hitOk: hitOk,
             contrast: cB, inBox: inBox, portStyle: portStyle, aw: Math.round(aw),
             ox: ox, pass: hitOk && cB && inBox && portStyle && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800, false));
    sims.push(simView(800, 1180, true));
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

  /* ---- ② tutorial：教学三段（看→帮→独；turn 卡两步连做——一题多步重读 quiz） ---- */
  total++;
  window.__crdOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__crdTutSolo = false;
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__crdWatchMs || 1e9) / SPEED;      // watch 段实测（家族预算 ≤16s 只罩 watch）
  const tutHelp = window.__crdDemoR === 'placed' && state.tut === 'help' &&
                window.CRD.currentLevel.flat === -1 &&
                window.CRD.quiz.kind === 'like' && window.CRD.quiz.occ === 'birthday' &&
                window.CRD.quiz.who === 'grandma' &&
                window.CRD.quiz.picks.length === 3 &&
                window.CRD.quiz.stage === 0 && window.CRD.quiz.col === 'bg' &&
                window.CRD.quiz.h === 'like' &&
                window.CRD.quiz.nstage === 2 &&
                twWatch <= 16000 && tw <= 26000;
  await unlocked();
  const qT = window.CRD.quiz;                                // "帮"阶段放手卡（行 0 偏好题两步）
  const rT1 = await window.CRD.tapPick(deriveAnswerV(qT));   // 首步选对（独立推导契合项）→ 帮→独 → stage 推进
  await unlocked();
  const qT2 = window.CRD.quiz;                               // 重读 quiz（一题多步：step 不动 stage+1）
  const rT2 = await window.CRD.tapPick(deriveAnswerV(qT2));  // 末步 → done → 进正式关
  const tutSolo = rT1 === 'placed' && rT2 === 'done' && window.__crdTutSolo === true &&
                window.CRD.currentLevel.flat === 0 && window.CRD.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__crdDemoR, tut: state.tut,
                     solo: window.__crdTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR1: rT1, turnR2: rT2 };

  /* ---- ③ drive：静态 20 关全量审计+SPEC 取材域对账（answer=独立推导，禁读直比） ---- */
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
    /* SPEC §1 r12 取材域对账：每题 scene 落本章程（(ch-1)*5..ch*5-1）且题表行
       kind/occ/who/nstage/say 与 SPEC 全表一致（scene 即题表行号——直接对账） */
    let sceneOk = true;
    for (let qi = 0; qi < 5; qi++) {
      const q = L1.quizzes[qi];
      const row = SPEC_TABLE[q.scene];
      if (!Number.isInteger(q.scene) || q.scene < (expCh - 1) * 5 || q.scene >= expCh * 5 ||
          q.kind !== row.kind || q.occ !== row.occ || q.who !== row.who ||
          q.nstage !== row.nstage || q.say !== row.say) {
        badCase = 'scene ' + flat + '/' + qi + ' s=' + q.scene; sceneOk = false; break;
      }
    }
    /* 引擎直驱：逐步点契合项（独立复算 SPEC_TABLE 步 correct）→ placed / 末题末步 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      while (!q._answered && driveOk) {
        const st = q.stages[q.stage];
        const expEl = SPEC_TABLE[q.scene].steps[q.stage][1];        // 独立复算契合元素
        const expIdx = st.picks.indexOf(expEl);
        const isLast = k === L3.quizzes.length - 1 && q.stage === q.stages.length - 1;
        if (expIdx < 0 || st.answer !== expIdx) { driveOk = false; break; }   // answer=独立推导对账
        const r = engTapPick(L3, expIdx);
        if (r !== (isLast ? 'done' : 'placed') || q._miss !== 0) { driveOk = false; break; }
      }
      if (driveOk && q.stage !== q.stages.length) driveOk = false;
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && ruleOk && chOk && dchOk && sceneOk && driveOk && solvedAll;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
  }
  /* UI 一题多步链（flat10 首卡=row10·wish 三步）：stage 推进 step 不动+中途落位
     DOM 留存+卡完成入贺卡集（b38 坑③：每步重读 quiz——单步后 step 不动=假卡死） */
  startLevel(10);
  await unlocked();
  const q10 = window.CRD.quiz;
  const m1 = q10 && q10.kind === 'wish' && q10.occ === 'birthday' && q10.who === 'grandma' &&
             q10.nstage === 3 &&
             q10.stage === 0 && q10.col === 'bg' && q10.step === 0;
  const r1c = await window.CRD.tapPick(deriveAnswerV(q10));     // 第一步 → bg 底纹（flags）落位
  const keepBg = !!cardEl.querySelector('.layer[data-col="bg"].placed svg[data-el="flags"]');
  const m2 = r1c === 'placed' && window.CRD.quiz.stage === 1 && window.CRD.quiz.step === 0 &&
             window.CRD.quiz.col === 'st' && keepBg &&
             window.CRD.quiz.answer === deriveAnswerV(window.CRD.quiz);
  await unlocked();
  const q10b = window.CRD.quiz;                                 // 重读（step 不动）
  const r2c = await window.CRD.tapPick(deriveAnswerV(q10b));    // 第二步 → st 贴纸（cake）落位
  const keepSt = !!cardEl.querySelector('.layer[data-col="st"].placed svg[data-el="cake"]');
  const m3 = r2c === 'placed' && window.CRD.quiz.stage === 2 && window.CRD.quiz.col === 'wish' && keepSt;
  await unlocked();
  const q10c = window.CRD.quiz;
  const r3c = await window.CRD.tapPick(deriveAnswerV(q10c));    // 末步 → 卡完成 → step+1+成品演出
  const gal1 = galleryEl.children[0];
  const m4 = r3c === 'placed' && window.CRD.quiz.step === 1 &&
             galleryEl.children.length === 1 && !!gal1;
  const multiOk = m1 && m2 && m3 && m4;
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]) && multiOk;
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase, multi: multiOk, m1: m1, m2: m2, m3: m3, m4: m4, keepBg: keepBg, keepSt: keepSt };

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0/10/20：数值/DOM 类/演出层） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.CRD.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 数值层：scene/stage/occ/kind/who 锚+层数+盘数+题面 say 真值+候选下标语义+盘内同列封闭集 */
    const pickDoms = Array.from(trayEl.querySelectorAll('.pick-wrap'));
    const eng0 = genLevel(flat).quizzes[0];
    const numOk = Number(cardEl.dataset.scene) === eng0.scene &&
                  Number(cardEl.dataset.stage) === q.stage &&
                  cardEl.dataset.occ === q.occ &&
                  cardEl.dataset.kind === q.kind &&
                  cardEl.dataset.who === q.who &&
                  cardEl.querySelectorAll('.layer').length === q.nstage &&
                  Number(trayEl.dataset.n) === q.picks.length &&
                  window.__lastVoiceText === q.say &&
                  window.__lastVoiceKey === q.sayKey &&
                  pickDoms.length === q.picks.length &&
                  pickDoms.every((w, j) => w.dataset.j === String(j)) &&
                  q.picks.every(p => SPEC_COL_EL[q.col].indexOf(p) >= 0);
    /* DOM 类层：题面态=唯一当前目标位（.slot.cur 恰落当前 col）+已落层数=stage
       +贺卡集=已完卡数 */
    const curLayer = cardEl.querySelector('.layer[data-col="' + q.col + '"]');
    const clsOk = cardEl.querySelectorAll('.layer.slot.cur').length === 1 &&
                  !!curLayer && curLayer.classList.contains('cur') &&
                  cardEl.querySelectorAll('.layer.placed').length === q.stage &&
                  galleryEl.children.length === q.step;
    /* 演出层：选对（独立推导）→ 演出中段采样目标层 .placed+svg[data-el]=契合元素
       （落位永久留存）+契合候选 .good（tapPick resolve 后非末步会换盘重绘 DOM
       ——断言须在演出窗内做） */
    const goodI = deriveAnswerV(q);
    const colNow = q.col;
    const pF = window.CRD.tapPick(goodI);       // fire（演出开始）
    await wait(250);                            // 演出中段（CARD_WIN 278ms@SPEED.12 中点）
    const lyr = cardEl.querySelector('.layer[data-col="' + colNow + '"]');
    const gw = trayEl.querySelector('.pick-wrap[data-j="' + goodI + '"]');
    const placeOk = !!lyr && lyr.classList.contains('placed') &&
                    !!lyr.querySelector('svg[data-el="' + q.picks[goodI] + '"]') &&
                    !!gw && gw.classList.contains('good');
    const r = await pF;
    const rOk = r === 'placed' || r === 'done';
    return { ok: numOk && clsOk && rOk && placeOk,
             why: JSON.stringify({ numOk, clsOk, rOk, placeOk, r }) };
  }
  const fA = await frameCheck(0);      // 两步章首卡（偏好题）
  const fB = await frameCheck(10);     // 三步章首卡（语用题）
  const fC = await frameCheck(20);     // 生成关（帧断言不依赖盘数——恒 3）
  const frameOk = fA.ok && fB.ok && fC.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat20: fC };

  /* ---- ⑤ wrongPath：错路径+豁免窗（真时钟 CHAIN_WIN.like 4626：窗内干扰项吞/
       窗内契合项放行/窗后二错照计 miss）---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.CRD.quiz;
  const badTap = (await window.CRD.tapPick(99)) === null;           // 非法下标=null（不炸）
  const badI = (q5.answer + 1) % q5.picks.length;                   // 干扰项下标（盘内互异→补集）
  const pW = window.CRD.tapPick(badI);                              // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                             // 等虚影演出毕（locked=false）
  await unlocked();                                                // 等演出锁（showUntil 余窗）过——豁免窗仍在
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'crd_wrong' &&          // 错链头=wrong clip
                 h[1] === 'crd_hint_like' &&                        // r12 分流：行0 bg 步 h='like'→hint_like
                 h.every(p => typeof p === 'string') &&            // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const chainWinOk = wrongChainUntil - Date.now() <= CHAIN_WIN.like + 50 &&   // 豁免窗按步型取值（运行时余窗 ≤ like 窗+余量）
                     CHAIN_WIN.like === SPEC_DUR.crd_wrong + 150 + SPEC_DUR.crd_hint_like + 300;
  const curLyr = cardEl.querySelector('.layer[data-col="' + q5.col + '"]');
  const ghostGone = !!curLyr && !curLyr.querySelector('svg[data-el]') &&
                    !curLyr.querySelector('.ghost');               // 虚影抖动消散不落位（虚线位仍在）
  const rejW = await window.CRD.tapPick(badI);                      // 豁免窗内干扰项二击=被吞 false（I 补：不计 miss）
  const miss1 = rW === 'wrong' && rejW === false && window.CRD.quiz.miss === 1;
  const passW = await window.CRD.tapPick(q5.answer);                // 豁免窗内契合项=放行（I 补：缓解吞输入）→ stage 推进
  const passOk = passW === 'placed' && window.CRD.quiz.stage === 1 &&
                 window.CRD.quiz.step === 0 && window.CRD.quiz.col === 'st';
  await unlocked();                                                // 等步推进换盘演出完
  await waitChainOver();                                           // 等首错豁免窗（真时钟）过
  const q5b = window.CRD.quiz;                                      // 本卡第 2 步（同卡 miss 续算）
  const badIb = (q5b.answer + 1) % q5b.picks.length;
  const rD1 = await window.CRD.tapPick(badIb);                      // 第 2 步首错（miss=2）
  await unlocked();
  await waitChainOver();                                           // 等本错豁免窗过——窗后二错照计 miss
  const rD2 = await window.CRD.tapPick(badIb);                      // 第 2 步二错（miss=3）
  await unlocked();                                                // 等二错演出锁过
  const missAfter2 = window.CRD.quiz.miss;                          // rE 前记录（好项推进会换卡清零）
  const brEl = pickWrapAt(q5b.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');   // miss≥2=契合候选 breathe（答案级）
  const rE = await window.CRD.tapPick(q5b.answer);                  // 候选不灰可重点（探索不罚）
  const wrongOk = badTap && miss1 && chainW && chainWinOk && ghostGone && passOk &&
                  rD1 === 'wrong' && rD2 === 'wrong' &&
                  missAfter2 === 3 && breathe2 && rE === 'placed';
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, miss1: miss1, chain: chainW, chainWin: chainWinOk,
                      ghostGone: ghostGone,
                      rejInWin: rejW === false, passInWin: passOk, miss3: rD2 === 'wrong' && missAfter2 === 3,
                      breathe2: breathe2, right: rE };

  /* ---- ⑥ pool：题表 20 行对账（SPEC_TABLE r12 全表独立硬编码——kind/occ/who/
       say/nstage/每步三元组+h 逐项）+r12 数学先验复算+20 静态关 rotate 覆盖审计 ---- */
  total++;
  let poolBad = null;
  const rowOf = i => SPEC_TABLE[i].steps.map(sp => sp.slice(1, 4));
  for (let i = 0; i < 20 && !poolBad; i++) {
    const spec = SPEC_TABLE[i], eng = SPEC_TABLE[i];   // eng 侧由页面源核对（下方 readback）
    if (spec.nstage !== spec.steps.length) { poolBad = 'nstage ' + i; break; }
    if (spec.steps.some((sp, k) => sp[0] !== SPEC_COLS(spec.nstage)[k])) { poolBad = 'colSeq ' + i; break; }
    if (spec.steps.some(sp => new Set([sp[1], sp[2], sp[3]]).size !== 3)) { poolBad = 'dup ' + i; break; }   // 三元组互异
  }
  /* 页面题表逐行读回对账（SPEC 独立表 vs 实现源——scene 索引即行号） */
  for (let i = 0; i < 20 && !poolBad; i++) {
    const spec = SPEC_TABLE[i];
    const L = genLevel((Math.floor(i / 5)) * 5);        // 章首关必含本章程 5 行（rotate 覆盖）
    const q = L.quizzes.find(x => x.scene === i);
    if (!q || q.kind !== spec.kind || q.occ !== spec.occ || q.who !== spec.who ||
        q.nstage !== spec.nstage || q.say !== spec.say) { poolBad = 'row ' + i; break; }
    for (let k = 0; k < spec.steps.length; k++) {
      const sp = spec.steps[k], st = q.stages[k];
      if (st.col !== sp[0] || st.h !== sp[4] || st.answer !== st.picks.indexOf(sp[1]) ||
          st.picks.length !== 3 || new Set(st.picks).size !== 3 ||
          st.picks.filter(p => p === sp[1]).length !== 1) { poolBad = 'step ' + i + '/' + k; break; }
      for (const e of [sp[1], sp[2], sp[3]])
        if (SPEC_COL_EL[sp[0]].indexOf(e) < 0) { poolBad = 'colSet ' + i + '/' + k; break; }
    }
    if (poolBad) break;
  }
  /* r12 数学先验复算（SPEC 表级——反启发式与歧义防线）：
     ①冲突项 tree/mum/horn 恒非 correct；②flower 恒 grandma 偏好正解（like 步）；
     ③翻转锚：同元素跨题在正解集与干扰集双现（≥5 元素）；④theme 步**干扰项**
     [sp[2],sp[3]] ∩ WHO_LIKE[who] 偏好元素=∅（M2 收窄口径——正解可∈偏好：
     行 13/17 sick×monkey 正解 hearts=双理由一致，SPEC §M2 例外登记）；
     ⑤偏好表元素与任何场合默认不同（WHO_LIKE 互斥性）；
     ⑥say 句长 10-15 字（estMs 预算域） */
  const correctSet = {}, distractSet = {};
  const anchorsOk6 = SPEC_TABLE.every((r, i) => r.steps.every((sp, k) => {
    if (sp[1] === 'tree' || sp[1] === 'mum' || sp[1] === 'horn') return false;       // ①
    correctSet[sp[1]] = 1; [sp[2], sp[3]].forEach(e => { distractSet[e] = 1; });
    if (sp[4] === 'theme' && SPEC_WHO_LIKE[r.who]) {                                 // ④
      const likes = Object.keys(SPEC_WHO_LIKE[r.who]).map(c => SPEC_WHO_LIKE[r.who][c]);
      if ([sp[2], sp[3]].some(e => likes.indexOf(e) >= 0)) return false;
    }
    return true;
  }));
  const flowerOk = SPEC_TABLE.every((r, i) => r.steps.every(sp =>
    sp[4] === 'like' && r.who === 'grandma' && sp[0] === 'st' ? sp[1] === 'flower' : true)) &&
    !SPEC_TABLE.some(r => r.steps.some(sp => sp[1] === 'flower' && r.who !== 'grandma'));   // ②
  const flipSet = Object.keys(correctSet).filter(e => distractSet[e]);               // ③
  const flipOk = flipSet.length >= 5 &&
                 ['cake', 'bear', 'wbd', 'flags', 'hearts'].every(e => flipSet.indexOf(e) >= 0);
  /* ⑤偏好判别力（per-题语义——bg 列 4 元素被 5 场合默认占满，全局互斥不可能）：
     每个 like 正面偏好步 WHO_LIKE[who][col] ≠ OCC_EL[本题 occ][col]（同题场合下
     偏好≠默认→「按偏好选」与「按场合直配」可区分——反直配锚成立） */
  const likeMutex = SPEC_TABLE.every(r => r.who in SPEC_WHO_LIKE ? r.steps.every(sp =>
    sp[4] === 'like' ? SPEC_WHO_LIKE[r.who][sp[0]] !== SPEC_OCC_EL[r.occ][sp[0]] : true) : true);
  const sayLenOk = SPEC_TABLE.every(r => r.say.length >= 10 && r.say.length <= 15);  // ⑥
  /* 20 题覆盖审计：静态 20 关每行恰现 5 次（§0.94 取题域全档成立——覆盖口径
     不锁取材序：只数每行出现次数，不验出现位置） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.scene] = (cnt[q.scene] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 && SPEC_TABLE.every((s, i) => cnt[i] === 5);
  const poolOk = !poolBad && anchorsOk6 && flowerOk && flipOk && likeMutex && sayLenOk && coverOk;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, clashNever: anchorsOk6, flowerAnchor: flowerOk,
                 flipN: flipSet.length, flipOk: flipOk, likeMutex: likeMutex,
                 sayLen: sayLenOk, cover: coverOk };

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

  /* ---- ⑧ gen：生成关 flat20+（seeded ri(rnd,1,4) 独立复算+四档全现+域一致+确定性+无放回） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 857);      // SPEC §0.94：独立重写 rng（python 式复刻）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    if (!L.quizzes.every(q => q.stages.every(st => st.picks.length === 3))) genBad.push(flat + ':picksN');
    if (!L.quizzes.every(q => q.nstage === (L.dch <= 2 ? 2 : 3))) genBad.push(flat + ':nstage');   // 域守恒
    if (!L.quizzes.every(q => {                                     // 池域：dch≤2 行 0-9 / dch≥3 行 10-19
      return L.dch <= 2 ? q.scene < 10 : q.scene >= 10;             /* m3 删同源恒真子句（row 即同引用
                                                                     row.kind===SPEC_TABLE[q.scene].kind 恒真）——
                                                                     kind 判别归 verify_final39 R8 CRD_KIND */
    })) genBad.push(flat + ':pool');
    const set = {};
    L.quizzes.forEach(q => { set[q.scene] = 1; });
    if (Object.keys(set).length !== 5) genBad.push(flat + ':dupScene');             // 无放回抽 5 卡
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  const genOk = genBad.length === 0 && distOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §4 实长表）+契约源码断言+双录+nextHint 实算 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = CHAIN_WIN.like === 4626 &&
                CHAIN_WIN.like === D.crd_wrong + 150 + D.crd_hint_like + 300 &&      // r12 链豁免窗=wrong+150+hint_like+300
                CHAIN_WIN.clash === 4554 &&
                CHAIN_WIN.clash === D.crd_wrong + 150 + D.crd_hint_no + 300 &&
                CHAIN_WIN.wish === 4674 &&
                CHAIN_WIN.wish === D.crd_wrong + 150 + D.crd_hint_wish + 300 &&
                CHAIN_WIN.theme === 5010 &&
                CHAIN_WIN.theme === D.crd_wrong + 150 + D.crd_hint + 300 &&
                CARD_WIN === 2316 && CARD_WIN === D.crd_right + 300 &&  // 选对窗=2016+300 精确
                SHAKE_MS * 1 + 140 <= D.crd_wrong + 150 &&            // b39 定版：首错锁总窗口径（常量×SPEED(实页=1)+尾窗 140 全算=1240 ≤ 2118）
                src.indexOf('Date.now() + SHAKE_MS * SPEED + 140') >= 0 &&   // 锁窗运行时公式在场（总窗口径）
                TUT_WATCH_WAIT >= D.crd_tut_watch + 300 &&              // watch 延 ≥3228
                TUT_TURN_WAIT >= D.crd_tut_turn + 300 &&                // turn 延 ≥2028
                (2620 + 400) >= D.crd_right + 300 &&                    // celebrate 3020 ≥ 2316
                estMsV('奶奶喜欢云朵和花，做张生日贺卡') === 15 * 345 + 600 &&   // estMs 全字符口径（行0 线索句 15 字）
                typeof levelDurMs === 'function' && LEVEL_MIN_MS === 40000 &&    // r12 时长模型在场（判卫 r7①）
                typeof DECIDE_MS === 'object' && DECIDE_MS.like === 10000;
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'crd'") >= 0;                // C：本款存档键 kidsgame_crd
  const srcD = src.indexOf("replayAnim(trayEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
  const srcE = src.indexOf('sv.crd && sv.crd.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + CHAIN_WIN[st.h]') >= 0 &&   // I：r12 链豁免窗按步型赋值
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== st.answer') >= 0;   // I 补：豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0 &&          // J：语义句 10s 节流在场
               src.indexOf('cur.flat < 3') >= 0;   // J：flat<3 每错必播（b36 m3 教学迷你关 flat=-1 字面）
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcR12 = src.indexOf('VOICE[HINT_OF[st.h]].key') >= 0 &&            // r12：错链尾段按步型分流
                 src.indexOf('function sayDirHint()') >= 0 &&               // r12：方向提示分流（戳兔子/空白）
                 src.indexOf('SPEC_TABLE') >= 0 &&                          // r12：题表驱动在场
                 src.indexOf('HINT_OF = { like:') >= 0;                     // r12：步型→提示映射表
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
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ && srcK && srcR12 && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, r12: srcR12, hints: srcHint };

  /* ---- ⑩ confirmChain：确认链构成（__lastQueue===['crd_right'] 单 clip；题面线索句走
       voice.say 不动 __lastQueue——SPEC §1 明示 say 非队列链） ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q10g = window.CRD.quiz;
  const goodI10 = deriveAnswerV(q10g);
  const h0 = window.__queueHist.length;      // 订阅起点
  const r10 = await window.CRD.tapPick(goodI10);
  const LQ = window.__lastQueue;
  const chainOk10 = r10 === 'placed' &&
                    LQ && LQ.length === 1 && LQ[0] === 'crd_right' &&        // 确认链=right 单 clip
                    JSON.stringify(LQ) === JSON.stringify(['crd_right']) &&
                    !keylessLast(LQ) &&                                     // 全 clip 无 keyless（契约 N）
                    window.__queueHist.slice(h0).some(h =>
                      h.length === 1 && h[0] === 'crd_right');
  if (chainOk10) npass++;
  units.confirmChain = { ok: chainOk10, r: r10,
                         queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑪ save：真实写档链（init crd→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__crdOrig.save, origPersist = window.__crdOrig.persist;
  const origLS = localStorage.getItem('kidsgame_crd');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_crd');
    KIDS.init({ game: 'crd', title: '贺卡工坊' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.CRD.autoSolve();     // 真实判定链通关（5 卡×2 步=10 放）→ winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_crd');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 10 && j && j.v === '1.0' && j.game === 'crd' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_crd');
  else localStorage.setItem('kidsgame_crd', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
       审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'crd', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, crd: { tutSeen: true } };
  let q12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_crd', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__crdDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.CRD.start(0);
    await unlocked();
    q12 = window.CRD.quiz;
    realOk = state.tut === 'none' && window.__crdDemoR === null &&
             q12 && q12.scene === 0 && q12.kind === 'like' && q12.occ === 'birthday' &&
             q12.who === 'grandma' && q12.nstage === 2 &&
             q12.col === 'bg' && q12.stage === 0 && q12.step === 0 && q12.h === 'like' &&
             q12.picks.length === 3 && q12.miss === 0 &&
             q12.say === SPEC_TABLE[0].say &&
             q12.answer === deriveAnswerV(q12) &&        // answer 独立推导
             window.CRD.currentLevel.flat === 0 && window.CRD.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.CRD === 'object' && typeof window.CRD.tapPick === 'function' &&
             typeof window.CRD.autoSolve === 'function';  // b29 坑⑥：钩子真实页同暴露
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_crd');
    else localStorage.setItem('kidsgame_crd', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { scene: q12.scene, kind: q12.kind, occ: q12.occ, col: q12.col, n: q12.picks.length } };

  /* ---- ⑬ deltaAnchors（r12 门禁）：三 delta 反启发式实锤——表级翻转锚+运行时三点 ---- */
  total++;
  /* 表级：wbd 行10 正解/行11 干扰（同收卡人 grandma 跨场合=delta③）；tree/mum
     与主题项同屏（行5/行7 候选含 CONFLICT_EL）；horn 行4 在场且非正解 */
  const wbd10 = SPEC_TABLE[10].steps[2][1] === 'wbd' &&
                SPEC_TABLE[11].steps[2].slice(1, 4).indexOf('wbd') >= 0 &&    // 行11 wish 干扰位含 wbd
                SPEC_TABLE[11].steps[2][1] !== 'wbd';
  const sameWho = SPEC_TABLE[10].who === SPEC_TABLE[11].who && SPEC_TABLE[10].who === 'grandma' &&
                  SPEC_TABLE[10].occ !== SPEC_TABLE[11].occ;               // 同收卡人异场合
  const clashPair = SPEC_TABLE[5].steps[1].slice(1, 4).indexOf('lant2') >= 0 &&
                    SPEC_TABLE[5].steps[1].slice(1, 4).indexOf('tree') >= 0 &&
                    SPEC_TABLE[7].steps[1].slice(1, 4).indexOf('cake') >= 0 &&
                    SPEC_TABLE[7].steps[1].slice(1, 4).indexOf('mum') >= 0;   // 冲突项与主题项同屏
  const hornRow = SPEC_TABLE[4].steps[1].slice(1, 4).indexOf('horn') >= 0 &&
                  SPEC_TABLE[4].steps[1][1] !== 'horn';                    // 负面偏好排除项在场且非正解
  /* 运行时 a：反直配（行0 bg 步：盘含 flags 生日默认→点它=wrong；点 clouds 奶奶偏好=placed） */
  startLevel(0);
  await unlocked();
  const qa = window.CRD.quiz;
  const flagsI = qa.picks.indexOf('flags');
  const cloudsI = qa.picks.indexOf('clouds');
  const antiDirect = qa.col === 'bg' && flagsI >= 0 && cloudsI >= 0;
  const rFlags = await window.CRD.tapPick(flagsI);                 // 主题直配（生日默认彩旗）→ wrong
  await unlocked();
  await waitChainOver();
  const antiOk = antiDirect && rFlags === 'wrong' &&
                 (await window.CRD.tapPick(cloudsI)) === 'placed'; // 偏好正解 → placed
  await unlocked();
  /* 运行时 b：冲突排除（行5 st 步：盘含 lant2+tree→点 tree=wrong+miss；点 lant2=placed） */
  startLevel(5);
  await unlocked();
  const qb = window.CRD.quiz;
  if (qb.step === 0 && qb.stage === 0) {          // 行5 首步 bg（theme）→ 先做对进 st 步
    await window.CRD.tapPick(deriveAnswerV(qb));
    await unlocked();
  }
  const qs5 = window.CRD.quiz;
  const treeI = qs5.picks.indexOf('tree');
  const lant2I = qs5.picks.indexOf('lant2');
  const clashOn = qs5.col === 'st' && treeI >= 0 && lant2I >= 0;
  const mBefore = qs5.miss;
  const rTree = await window.CRD.tapPick(treeI);                   // 冲突项 → wrong
  await unlocked();
  await waitChainOver();
  const missAfterTree = window.CRD.quiz.miss;                      // 卡未完成时读（placed 会推进换卡清零）
  const rLant2 = await window.CRD.tapPick(lant2I);                 // 主题项 → placed
  const clashOk = clashOn && rTree === 'wrong' && missAfterTree === mBefore + 1 &&
                  rLant2 === 'placed';
  await unlocked();
  /* 运行时 c：语用翻转（行10 wish wbd=placed；行11 同收卡人 sick 卡 wish wbd=wrong→wkang=placed） */
  startLevel(10);
  await unlocked();
  for (let s = 0; s < 2; s++) {                   // 做完 bg/st 两步到 wish 步
    const q = window.CRD.quiz;
    await window.CRD.tapPick(deriveAnswerV(q));
    await unlocked();
  }
  const qw10 = window.CRD.quiz;
  const wbdI10 = qw10.picks.indexOf('wbd');
  const rWbd10 = await window.CRD.tapPick(wbdI10);
  startLevel(11);
  await unlocked();
  for (let s = 0; s < 2; s++) {
    const q = window.CRD.quiz;
    await window.CRD.tapPick(deriveAnswerV(q));
    await unlocked();
  }
  const qw11 = window.CRD.quiz;
  const wbdI11 = qw11.picks.indexOf('wbd');
  const kangI11 = qw11.picks.indexOf('wkang');
  const sameWho11 = qw11.who === 'grandma' && qw11.occ === 'sick' && qw11.col === 'wish';
  const rWbd11 = await window.CRD.tapPick(wbdI11);                 // 同祝福语异场合 → wrong（判定翻转）
  await unlocked();
  await waitChainOver();
  const rKang11 = await window.CRD.tapPick(kangI11);               // 场合祝福语 → placed
  const wishOk = qw10.col === 'wish' && rWbd10 === 'placed' && sameWho11 &&
                 rWbd11 === 'wrong' && rKang11 === 'placed';
  const deltaOk = wbd10 && sameWho && clashPair && hornRow && antiOk && clashOk && wishOk;
  if (deltaOk) npass++;
  units.deltaAnchors = { ok: deltaOk, tbl: { wbdFlip: wbd10, sameWho: sameWho, clashPair: clashPair, hornRow: hornRow },
                         run: { antiDirect: antiOk, clash: clashOk, wishFlip: wishOk,
                                rFlags: rFlags, rTree: rTree, rWbd11: rWbd11 } };

  /* ---- ⑭ duration（r12 门禁）：40 关 modeled ≥40000+逐关对账+语音窗从不撑时长 ---- */
  total++;
  let dMin = Infinity, dFlat = -1, parityOk = true, voiceOk = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;             // 独立副本与源模型逐关对账
    for (const q of L.quizzes) {
      const row = SPEC_TABLE[q.scene];
      for (let k = 0; k < row.steps.length; k++)
        if (V_DECIDE[row.kind] < vVoice(q, k)) voiceOk = false;   // 逐步：决策 ≥ 语音窗（认知主体）
    }
  }
  const durUnitOk = dMin >= V_MIN && parityOk && voiceOk && dMin === 118360;   /* M1 防回漂：40 关 modeled 最低=clash 关 118360 精确（SPEC §1 r12） */
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
                     parity: parityOk, voiceNeverDominates: voiceOk,
                     decide: V_DECIDE, adv: V_ADV };

  const out = { game: 'crd', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__crdVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史（T46 题面 clip 化后题面锚=play）；voice.say 记录题面线索句（__lastSayText
     ——SPEC §1 题面 say 非队列链，不进 __lastQueue）；voice.queue 记录拼播链
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
