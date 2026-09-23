/* ================= ?verify=1 自检（仅 verify 分支加载执行）——16 单元（r12 难度改造）
   ① structure：朋友/回应卡/道具 SVG 全定义（data-anim 渲染即引擎，含 fx-meh 半好组）、
      DOM 无 undefined 文本、clips 12 条（th_ 5+tha_ 4+core 3）全注入+duration 辨别器
      （±60ms）、answer 独立推导（r12 kind 分流：fit/size=唯一 best / anti=唯一 bad）、
      三 flat（0 fit 2 卡/10 size 3 卡/15 anti 3 卡）× 双 viewport（1280×800 横 +
      800×1180 竖 body.port 类通道）布局（回应卡 ≥96×96、描边对比度 ≥3:1、
      overflowX ≤0、#friend rect 落 #scene 容器、portStyle 固定尺寸判别锚 140/168）
   ② tutorial：教学三段（watch=情景→框架锚 tha_fit→幽灵手指点感谢卡→朋友开心→
      __thDemoR='right'；turn=scene0 首题你来试一试；帮→首对独 __thTutSolo+进正式关
      flat=0 n=5；watch 段实测折算 ≤16s——单步演示款；教学期框架锚 tha_fit 在场）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null（含 kind 域+
      tier 分布先验）/章号映射 ch=flat/5+1/取材域=say+卡数反查 SPEC 全表行号落章池
      （b36 坑③：禁 idx 公式锁实现取材序）/kind-pure（关内 5 题全=本章题型）/
      答案唯一性对账（answer=kind 分流独立推导禁读直比）/引擎直驱 tapCard(answer)→
      right/末题 done→3 星
   ④ frameM（契约 M 帧内容三层 ×flat0 fit/flat10 size/flat15 anti/flat20 生成关）：
      数值层 sceneEl.dataset.scene+**dataset.kind 新锚**+卡 DOM 数+题面情景句真值
      （T46 化：voiceHist 末次 th_sc_*===specKeyOf(quiz.say)）+框架锚真值
      （__lastVoiceKey==='tha_fit'/'tha_not' 按 kind）/DOM 类层 #friend.sad（题面期待态）/演出层 点答案卡后 #friend.happy+
      .good（朋友开心演出）
   ⑤ grayPath（r12 delta①②）：灰卡 'wrong'+miss 计+半好态 meh（容器类+.fx-meh 组+
      卡 .gray 类）+灰链 [tha_gray] 单 clip；灰链豁免窗（真时钟 GRAY_WIN 3180）内
      二击吞 false 且 miss 不变；窗后第二灰照计 miss=2（契约 I 补）+答案卡 breathe
   ⑥ badPath：bad 卡 'wrong'+miss+错链 [th_wrong,th_hint] 全 clip；豁免窗（真时钟
      4434）内 bad 二击吞 false 且 miss 不变；窗内答案卡放行 'right'；窗后第二错
      照计 miss=2+好卡 breathe（答案级）
   ⑦ antiPath（r12 delta③ 反向题）：题面后反向框架锚 tha_not+sceneEl.dataset.kind
      ='anti'+ok 卡 'wrong'+miss+meh+[tha_ok] 单 clip 消除式反馈（不指认其余）+
      豁免窗内 ok 二击吞 false+答案卡（=唯一 bad）right+happy
   ⑧ delta 实锤断言：反启发式 tier 翻转表（鞠躬 best@0-4/gray@5,7,8,9；击掌 gray@1,4/
      best@7,9；大声 gray@0,3/best@8,12；小声 best@11,13/gray@10,12,14；抱抱它
      best@10,14/gray@13）+anti 恰 1 bad+2 ok+0 best/gray+审计双例（题15 谢对手=ok+
      题16 被抢说谢谢=bad）+aria 统一「做法 」不泄 tier+框架锚文本与全部卡 label
      无子串交集（不指认）
   ⑨ pool：题库 20 题对账（SPEC §7 全表独立硬编码——情景句+kind+tier/label 多重集，
      禁读页面真值当期望源）+20 静态关 rotate 覆盖审计（每题恰现 5 次）
   ⑩ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑪ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32(flat*7919+727)
      python 式 JS 复刻）——verify 独立复算第一个随机数==dch+四档全现+**per-chapter
      kind-pure 池**（dch k→行 (k-1)*5..k*5-1，关内 5 题全=SPEC 章 kind——r12 口径）
      +卡数档+确定性（同 flat 两次生成 JSON 相等）+无放回（同关 5 题互异）
   ⑫ windows+contract：六窗静态断言（错链 4434/确认 2124/择优锚 3108/反向锚 3060/
      灰链 3180/反向错反馈 3492——全=实长+300 精确式）+教学延窗+celebrate 窗+
      契约 A/B/C/D/E/F/I/J/K 源码断言（读 script[2] 合并文本——b36 M1 分离后恢复
      判别力；肯定断言检索字面逐条与 main 真源核对）+灰链豁免窗族字面+CHAPTERS/
      GEN_HINTS 双录+nextHint 4/9/14/19 数值断言+24/29/34/39 实算（b35 m5 范式）
   ⑬ confirmChain：确认链构成 __lastQueue===['th_right']（right 单 clip 全 clip
      无 keyless——题面 say/框架锚走 voice.say·play 不动 __lastQueue，SPEC §7 明示）
   ⑭ save：真实写档链（init thanks→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_thanks v:'1.0' levels['1-0'] 更新；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑮ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（scene0/fit/2 卡/step=0/answer 独立推导）+window.TH
      真实页暴露（b29 坑⑥）；try/finally 保异常时 origLS 也恢复（b36 m4）
   ⑯ duration（r12 时长模型门禁）：独立副本 V_DECIDE/V_ADV/V_MIN/V_PICK/V_NOT/
      V_ENTER 重列（禁引引擎常量）——全 20 题 voiceWin ≤ DECIDE（语音窗从不撑时长）+
      40 关 modeled ≥40000+页面 levelDurMs 与独立复算逐关对账
   结果写 #verify-result + window.__thVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH37 §7 文字独立重列（禁抄页面 VOICE/CHAPTERS/常量/题库） */
  const SPEC_DUR = { th_tut_watch: 2904, th_tut_turn: 1824, th_hint: 1944,
                     th_right: 1824, th_wrong: 2040,
                     tha_fit: 2808, tha_not: 2760, tha_gray: 2880, tha_ok: 3192 };   // r12 增 4（2026-09-15 实测）
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  /* T46 化（2026-09-19）：题面情景句 20 键实长独立副本（verify 自持；build python 同值双录） */
  const SPEC_TH_SC = { th_sc_1: 2856, th_sc_2: 2880, th_sc_3: 2784, th_sc_4: 2832, th_sc_5: 3120,
                       th_sc_6: 2544, th_sc_7: 2544, th_sc_8: 2784, th_sc_9: 2376, th_sc_10: 2664,
                       th_sc_11: 2784, th_sc_12: 2616, th_sc_13: 2808, th_sc_14: 2376, th_sc_15: 2736,
                       th_sc_16: 2688, th_sc_17: 2856, th_sc_18: 2832, th_sc_19: 2400, th_sc_20: 2328 };
  const specKeyOf = say => 'th_sc_' + (SPEC_SCENES.findIndex(r => r.say === say) + 1);   // 行序注册（无重复句）
  const SPEC_CH = { 1: { n: 2, kind: 'fit' }, 2: { n: 2, kind: 'fit' },
                    3: { n: 3, kind: 'size' }, 4: { n: 3, kind: 'anti' } };   // 章档：卡数+题型
  const SPEC_CHAPTER_HINTS = { 1: '对奶奶和朋友，感谢会变哦', 2: '帮忙有大小，感谢有轻重',
                               3: '有的话现在不该说，找出来', 4: '新的情景来啦，样样考考你' };
  const SPEC_GEN_HINTS = ['想一想，对谁说，怎么说',      // dch1 fit 对师长
                          '对谁说，感谢会不一样哦',      // dch2 fit 家人同伴
                          '帮忙有大小，感谢有轻重',      // dch3 size 强度匹配
                          '哪一句不该说，找出来'];       // dch4 anti 反向辨析
  /* SPEC §7 20 题全表（情景句=题面 keyless TTS 真值源；kind+tier/label 多重集；
     全部 say 两两相异——say+卡数联合反查天然唯一定位） */
  const SPEC_SCENES = [
    { kind: 'fit',  say: '小鹿老师帮你捡蜡笔',   cards: [['best', '鞠躬说谢谢'], ['gray', '大声说谢谢']] },
    { kind: 'fit',  say: '小鹿老师帮你修小车',   cards: [['best', '鞠躬说谢谢'], ['gray', '击掌说谢谢']] },
    { kind: 'fit',  say: '小鹿老师递给你一本书', cards: [['best', '鞠躬说谢谢'], ['gray', '说声谢谢']] },
    { kind: 'fit',  say: '小鹿老师帮你搬积木',   cards: [['best', '鞠躬说谢谢'], ['gray', '大声说谢谢']] },
    { kind: 'fit',  say: '下雨小鹿老师给你撑伞', cards: [['best', '鞠躬说谢谢'], ['gray', '击掌说谢谢']] },
    { kind: 'fit',  say: '熊奶奶帮你找帽子',     cards: [['best', '抱抱奶奶'], ['gray', '鞠躬说谢谢']] },
    { kind: 'fit',  say: '熊奶奶给你留了蛋糕',   cards: [['best', '抱抱奶奶'], ['gray', '说声谢谢']] },
    { kind: 'fit',  say: '小猴陪你搭好了积木',   cards: [['best', '击掌说谢谢'], ['gray', '鞠躬说谢谢']] },
    { kind: 'fit',  say: '小狗帮你推秋千',       cards: [['best', '大声说谢谢'], ['gray', '鞠躬说谢谢']] },
    { kind: 'fit',  say: '小猴帮你修好了小车',   cards: [['best', '击掌说谢谢'], ['gray', '鞠躬说谢谢']] },
    { kind: 'size', say: '小兔帮你找回了玩具球', cards: [['best', '抱抱它'], ['gray', '小声说谢谢'], ['bad', '转身就走']] },
    { kind: 'size', say: '小羊递给你一张纸',     cards: [['best', '小声说谢谢'], ['gray', '送朵小花'], ['bad', '一声不吭']] },
    { kind: 'size', say: '小狗陪你等到了妈妈',   cards: [['best', '大声说谢谢'], ['gray', '小声说谢谢'], ['bad', '说好无聊']] },
    { kind: 'size', say: '小鸡借你一支蜡笔',     cards: [['best', '小声说谢谢'], ['gray', '抱抱它'], ['bad', '嫌它小气']] },
    { kind: 'size', say: '小猪分给你半块蛋糕',   cards: [['best', '抱抱它'], ['gray', '小声说谢谢'], ['bad', '嫌蛋糕小']] },
    { kind: 'anti', say: '赛跑你输给了小狗',     cards: [['ok', '对他说谢谢'], ['ok', '说恭喜你呀'], ['bad', '说我不玩了']] },
    { kind: 'anti', say: '小松鼠抢走了你的玩具', cards: [['ok', '大声说还给我'], ['ok', '请老师帮忙'], ['bad', '对他说谢谢']] },
    { kind: 'anti', say: '小马排队插到你前面',   cards: [['ok', '说请你排队'], ['ok', '请老师帮忙'], ['bad', '说谢谢你呀']] },
    { kind: 'anti', say: '小猪弄脏了你的画',     cards: [['ok', '说没关系'], ['ok', '和她再画'], ['bad', '叫她小笨蛋']] },
    { kind: 'anti', say: '下棋小猫赢了你',       cards: [['ok', '说恭喜你呀'], ['ok', '约下次再玩'], ['bad', '说她耍赖了']] }
  ];
  const estMsV = n => n.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* 独立 rng（SPEC §0.88 生成关策略）：mulberry32(flat*7919+727)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* 独立推导（SPEC §7 钩子契约）：answer=fit/size 唯一 tier==='best' / anti 唯一 tier==='bad' */
  const answerTierV = kind => (kind === 'anti' ? 'bad' : 'best');
  const deriveAnswerV = (cards, kind) => {
    const want = answerTierV(kind);
    let f = -1;
    for (let i = 0; i < cards.length; i++) if (cards[i].tier === want) { f = i; break; }
    return f;
  };
  /* say+卡数联合反查 SPEC 全表行号（b36 坑③：不写 idx 公式锁实现取材序） */
  const rowOfV = (say, nCards) => {
    const hit = [];
    for (let i = 0; i < SPEC_SCENES.length; i++)
      if (SPEC_SCENES[i].say === say && SPEC_SCENES[i].cards.length === nCards) hit.push(i);
    return hit.length === 1 ? hit[0] : -1;       // 非唯一=域约束失败
  };
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链豁免窗（真时钟 4434）过
    let g = 0;
    while (wrongChainUntil && Date.now() < wrongChainUntil && g++ < 60) await wait(250);
    return !(wrongChainUntil && Date.now() < wrongChainUntil);
  };
  const waitGrayOver = async () => {              // 等灰链/反向错反馈豁免窗（真时钟）过
    let g = 0;
    while (grayChainUntil && Date.now() < grayChainUntil && g++ < 60) await wait(250);
    return !(grayChainUntil && Date.now() < grayChainUntil);
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：key 空缺带 text 的 TTS 段播完即
     return 丢弃后续段——凡含该段的 queue 链中该段必须居末元素（本款确认链/
     错链/灰链全 clip 天然安全——T46 化后全款零 keyless；断言器留作防回归） */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);

  /* ---- ① structure：SVG 定义+DOM 干净+clips 全注入+answer 独立推导+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.TH.quiz;
  const cardDom = Array.from(cardsEl.querySelectorAll('.card-wrap'));
  const SPEC_ANIMS = ['bear', 'rabbit', 'cat', 'dog', 'sheep', 'monkey', 'chick', 'pig', 'deer', 'squirrel', 'horse'];
  const svgOk = q1 && cardDom.length === q1.cards.length &&
    cardDom.every(w => {
      const g = w.querySelector('.art svg > g[data-anim]');
      return !!g && typeof g.dataset.anim === 'string' && g.dataset.anim.length > 0;
    }) &&
    !!friendEl.querySelector('svg > g[data-anim="friend"]') &&                   // 朋友根组锚
    !!friendEl.querySelector('.fx-sad') && !!friendEl.querySelector('.fx-meh') &&  // 三表情组全渲染（r12 含 meh）
    !!friendEl.querySelector('.fx-happy') &&
    !!propEl.querySelector('svg > g[data-anim]') &&                              // 道具根组锚
    SPEC_ANIMS.every(id => friendSvg(id).indexOf('<svg') === 0) &&               // 朋友 11 种全定义
    SPEC_SCENES.every((s, i) => friendSvg(SCENES[i].anim).indexOf('<svg') === 0 &&   // 题库行 anim 全可渲
      propSvg(SCENES[i].prop).indexOf('<svg') === 0 &&                            // 题库行 prop 全可渲
      SCENES[i].cards.every(c => cardIconSvg(c.icon).indexOf('<svg') === 0)) &&  // 题库行 icon 全可渲（含 r12 新 14 图标）
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answer 独立推导（SPEC §7 kind 分流唯一解锚——禁读 quiz.answer 直比推导依据） */
  const ansDeriveOk = q1 && q1.kind === 'fit' &&
                      q1.answer === deriveAnswerV(q1.cards, q1.kind) &&
                      q1.cards[q1.answer] && q1.cards[q1.answer].tier === 'best';
  /* clips：th_ 5+tha_ 4+core 3 全注入+实长辨别（SPEC §4/§7 实长表 ±60ms；core 3 条
     只验在场——core 实长不在本批实长表，禁猜值断言） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR).concat(Object.keys(SPEC_TH_SC));   // T46：th_sc 20 并入探测
  const preOk = keysAll.length === 32 &&
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const specDurOf = k => SPEC_DUR[k] != null ? SPEC_DUR[k] : SPEC_TH_SC[k];   // T46：两表合并查值
  const durOk = durs.every((d, i) => Math.abs(d - specDurOf(specKeys[i])) <= 60);
  /* 布局：三 flat（0 fit 2 卡/10 size 3 卡/15 anti 3 卡）× 双 viewport
     （横 1280×800 / 竖 800×1180 body.port 类通道——r9 M-A1 双通道）；
     回应卡=主答案目标 ≥96×96；#friend rect 落 #scene 容器（overflow:hidden 吞
     scrollWidth 防假阴性）；portStyle 固定尺寸判别锚（横 168/竖 140） */
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
    document.body.classList.toggle('port', !!port);       // 竖屏类通道（与 @media 逐条等值）
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(g._simFlat);
    const wraps = Array.from(cardsEl.querySelectorAll('.card-wrap'));
    if (g._simFlat >= 20) {   /* m4 守卫：生成关 dch 随机禁按静态档硬算 need（防假阴性） */
      document.body.classList.remove('port');
      return { vp: w + 'x' + h + (port ? 'P' : ''), flat: g._simFlat, cards: wraps.length, hitOk: false, contrast: false, inBox: false, portStyle: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    }
    const chIdx = Math.floor(g._simFlat / 5) + 1;         // 静态档卡数独立复算
    const need = SPEC_CH[chIdx].n;
    const hitOk = wraps.length === need && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 卡描边对比度
    const fr = friendEl.getBoundingClientRect(), sr = sceneEl.getBoundingClientRect();
    const inBox = fr.left >= sr.left - 1 && fr.right <= sr.right + 1 &&
                  fr.top >= sr.top - 1 && fr.bottom <= sr.bottom + 1;   // rect 落容器
    const fw = fr.width;
    /* 竖屏样式通道生效实锤：#friend 固定尺寸（横 168/竖 140）判别力最强。横屏 sim 仅当
       真实视口也横屏才断言 168（真竖屏外层下 @media(portrait) 覆盖，量测无意义——
       comfort r11 先例；真通道由 P1b 真竖视口轮+friendW=140 外部断言兜底） */
    const realPort = window.innerHeight > window.innerWidth;
    const portStyle = port ? (fw >= 138 && fw <= 142) : (realPort || (fw >= 166 && fw <= 170));
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    document.body.classList.remove('port');
    return { vp: w + 'x' + h + (port ? 'P' : ''), flat: g._simFlat, cards: wraps.length, hitOk: hitOk,
             contrast: cB, inBox: inBox, portStyle: portStyle, fw: Math.round(fw),
             ox: ox, pass: hitOk && cB && inBox && portStyle && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10, 15]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800, false));
    sims.push(simView(800, 1180, true));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  document.body.classList.remove('port');
  startLevel(0);
  await unlocked();
  const layoutOk = sims.every(s => s.pass);
  const s1ok = svgOk && cleanDom && ansDeriveOk && preOk && durOk && layoutOk;
  if (s1ok) npass++;
  units.structure = { ok: s1ok, svg: svgOk, dom: cleanDom, ansDerive: ansDeriveOk,
                      clips: preOk, dur: durOk, layout: layoutOk, sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（看→帮→独；r12 框架锚 tha_fit 教学期在场） ---- */
  total++;
  window.__thOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U14 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__thTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__thWatchMs || 1e9) / SPEED;       // watch 段实测（家族预算 ≤16s 只罩 watch）
  const anchorTut = window.__voiceHist.indexOf('tha_fit') >= 0;   // 框架锚教学期在场（presentQuiz 串播）
  const tutHelp = window.__thDemoR === 'right' && state.tut === 'help' &&
                window.TH.currentLevel.flat === -1 &&
                window.TH.quiz.scene === 0 && window.TH.quiz.kind === 'fit' &&
                window.TH.quiz.cards.length === 2 &&
                twWatch <= 16000 && tw <= 26000 && anchorTut;
  await unlocked();
  const qT = window.TH.quiz;                                // "帮"阶段放手题（scene0 首题）
  const rT = await window.TH.tapCard(deriveAnswerV(qT.cards, qT.kind));   // 首次选对（独立推导答案卡）→ 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__thTutSolo === true &&
                window.TH.currentLevel.flat === 0 && window.TH.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__thDemoR, tut: state.tut,
                     solo: window.__thTutSolo, anchorTut: anchorTut,
                     watchMs: Math.round(twWatch), totalMs: Math.round(tw), turnR: rT };

  /* ---- ③ drive：静态 20 关全量审计+SPEC 取材域反查对账（answer=kind 分流独立推导） ---- */
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
    /* SPEC §7 取材域对账（b36 坑③禁 idx 公式锁取材序）：每题 say+卡数联合反查
       SPEC 全表行号 → 行号必须落本章程（(ch-1)*5..ch*5-1）+kind-pure（关内 5 题
       全=本章题型——r12 生成关池同口径前置审计） */
    let sceneOk = true, kindPure = true;
    for (let qi = 0; qi < 5; qi++) {
      const q = L1.quizzes[qi];
      const row = rowOfV(q.say, q.cards.length);
      if (row < 0 || row < (expCh - 1) * 5 || row >= expCh * 5) {
        badCase = 'scene ' + flat + '/' + qi + ' row=' + row; sceneOk = false; break;
      }
      if (q.kind !== SPEC_SCENES[row].kind || q.kind !== SPEC_CH[expCh].kind) { kindPure = false; break; }
    }
    /* 引擎直驱：逐题点答案卡（kind 分流独立推导）→ right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const goodI = deriveAnswerV(q.cards, q.kind);               // 独立推导（SPEC §7 对账锚）
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      if (goodI < 0 || q.answer !== goodI) { driveOk = false; break; }
      const r = engTapCard(L3, goodI);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && ruleOk && chOk && dchOk && sceneOk && kindPure && driveOk && solvedAll;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
  }
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]);
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase };

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0 fit/flat10 size/flat15 anti/flat20 生成关） ---- */
  total++;
  async function frameCheck(flat) {
    const vh0 = window.__voiceHist.length;       // 本关语音史订阅起点（末位播框架锚覆盖 __lastVoiceKey——hist 免疫）
    startLevel(flat);
    await unlocked();
    const q = window.TH.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 数值层：scene 锚+kind 锚（r12）+卡 DOM 数+题面情景句真值（T46 化：voiceHist
       末次 th_sc_*===specKeyOf(quiz.say)——presentQuiz 末位播框架锚覆盖末值，禁读
       __lastVoiceKey）+框架锚真值（__lastVoiceKey 按 kind） */
    const ancKey = q.kind === 'anti' ? 'tha_not' : 'tha_fit';
    const numOk = Number(sceneEl.dataset.scene) === q.scene &&
                  sceneEl.dataset.kind === q.kind &&
                  cardsEl.querySelectorAll('.card-wrap').length === q.cards.length &&
                  Number(cardsEl.dataset.n) === q.cards.length &&
                  window.__voiceHist.slice(vh0).filter(k => k.indexOf('th_sc_') === 0).pop() === specKeyOf(q.say) &&
                  window.__lastVoiceKey === ancKey &&
                  Array.from(cardsEl.querySelectorAll('.card-wrap')).every((w, i) =>
                    !!cardsEl.querySelector('.card-wrap[data-i="' + i + '"]') && Number(w.dataset.i) === i);
    /* DOM 类层：题面态=朋友期待（容器类 sad，非 happy/meh——fx-sad 组显+期待小星） */
    const sadOk = friendEl.classList.contains('sad') && !friendEl.classList.contains('happy') &&
                  !friendEl.classList.contains('meh') &&
                  !!friendEl.querySelector('.fx-sad') && !!friendEl.querySelector('.fx-happy');
    /* 演出层：点答案卡（独立推导）→ 演出中段采样朋友开心（happy）+答案卡 .good
       （tapCard resolve 后非末题会 presentQuiz 新题重置 DOM——断言须在演出窗内做） */
    const goodI = deriveAnswerV(q.cards, q.kind);
    const pF = window.TH.tapCard(goodI);       // fire（演出开始）
    await wait(250);                            // 演出中段（cele 窗 255ms@SPEED.12 中点）
    const happyOk = friendEl.classList.contains('happy') && !friendEl.classList.contains('sad');
    const wrapOk = (function () { const w = cardWrapAt(goodI); return !!w && w.classList.contains('good'); })();
    const r = await pF;
    const joyOk = r === 'right' || r === 'done';
    return { ok: numOk && sadOk && joyOk && happyOk && wrapOk,
             why: JSON.stringify({ numOk, sadOk, joyOk, happyOk, wrapOk, r }) };
  }
  const fA = await frameCheck(0);      // dch1 fit 2 卡
  const fB = await frameCheck(10);     // dch3 size 3 卡
  const fC = await frameCheck(15);     // dch4 anti 3 卡（反向框架锚 tha_not）
  const fD = await frameCheck(20);     // 生成关（kind/卡数随 dch——帧断言不依赖卡数）
  const frameOk = fA.ok && fB.ok && fC.ok && fD.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat15: fC, flat20: fD };

  /* ---- ⑤ grayPath（r12）：灰卡半好态+灰链豁免窗（吞/照计梯度） ---- */
  total++;
  startLevel(5);                                // ch2 fit：题5 熊奶奶（best 抱抱奶奶/gray 鞠躬说谢谢）
  await unlocked();
  const q5 = window.TH.quiz;
  const grayI = q5.cards.findIndex(c => c.tier === 'gray');   // 灰卡下标（独立推导）
  const pG = window.TH.tapCard(grayI);                        // → wrong（fire，演出中段采样）
  await wait(200);
  const mehMid = friendEl.classList.contains('meh') && !!friendEl.querySelector('.fx-meh');
  const grayMid = (function () { const w = cardWrapAt(grayI); return !!w && w.classList.contains('gray'); })();
  const rG = await pG;
  await unlocked();
  const chainG = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 1 && h[0] === 'tha_gray' &&                // 灰链=tha_gray 单 clip
                 h.every(p => typeof p === 'string') && !keylessLast(h));
  const winSet = grayChainUntil > Date.now() - 100;                      // 豁免窗已设（GRAY_WIN 真时钟）
  const rejG = await window.TH.tapCard(grayI);                           // 窗内灰二击=吞 false（不计 miss）
  const miss1 = rG === 'wrong' && rejG === false && window.TH.quiz.miss === 1 &&
                mehMid && grayMid && chainG && winSet;
  await waitGrayOver();                                                  // 等灰链豁免窗过
  const rG2 = await window.TH.tapCard(grayI);                            // 窗后二灰照计 miss=2（I 补）
  await unlocked();
  const missAfter2 = window.TH.quiz.miss;
  const brG = cardWrapAt(window.TH.quiz.answer);
  const breatheG = !!brG && brG.classList.contains('breathe');           // miss≥2=答案卡 breathe
  const rE5 = await window.TH.tapCard(window.TH.quiz.answer);            // 答案卡可重点推进
  const grayOk = miss1 && rG2 === 'wrong' && missAfter2 === 2 && breatheG && rE5 === 'right';
  if (grayOk) npass++;
  units.grayPath = { ok: grayOk, mehMid: mehMid, grayMid: grayMid, chain: chainG, winSet: winSet,
                     rejInWin: rejG === false, miss2: missAfter2 === 2, breathe: breatheG, right: rE5 };

  /* ---- ⑥ badPath：bad 卡错路径+豁免窗（真时钟 4434：窗内吞/窗内答案放行/窗后二错照计） ---- */
  total++;
  startLevel(10);                               // ch3 size：题10 小兔（bad 转身就走在场）
  await unlocked();
  const q6 = window.TH.quiz;
  const badTap = (await window.TH.tapCard(99)) === null;           // 非法下标=null（不炸）
  const badI = q6.cards.findIndex(c => c.tier === 'bad');          // bad 卡下标（独立推导）
  const pW = window.TH.tapCard(badI);                              // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                             // 等坏卡演出毕（locked=false）
  await unlocked();                                                // 等演出锁（showUntil 余窗）过——豁免窗仍在
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'th_wrong' &&          // 错链头=wrong clip
                 h[1] === 'th_hint' &&                             // 语义句=hint「怎么说谢谢呢」
                 h.every(p => typeof p === 'string') &&            // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const rejW = await window.TH.tapCard(badI);                      // 豁免窗内 bad 二击=被吞 false（I 补：不计 miss）
  const miss1b = rW === 'wrong' && rejW === false && window.TH.quiz.miss === 1;
  const passW = await window.TH.tapCard(q6.answer);                // 豁免窗内答案卡=放行（I 补）→ 推进
  const passOk = passW === 'right' && window.TH.quiz.step === 1;
  await unlocked();                                                // 等新题开题演出完
  await waitChainOver();                                           // 等首错豁免窗（真时钟）过
  const q6b = window.TH.quiz;                                      // 题 1（章池内下一题）
  const badIb = q6b.cards.findIndex(c => c.tier === 'bad');
  const rD1 = await window.TH.tapCard(badIb);                      // 题 1 首错（miss=1）
  await unlocked();
  await waitChainOver();                                           // 等本错豁免窗过——窗后二错照计 miss
  const rD2 = await window.TH.tapCard(badIb);                      // 题 1 二错（miss=2）
  await unlocked();                                                // 等二错演出锁过
  const missAfter2b = window.TH.quiz.miss;                         // 推进前记录（答案卡推进会换题清零）
  const brEl = cardWrapAt(q6b.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');   // miss≥2=答案卡 breathe（答案级）
  const rE = await window.TH.tapCard(q6b.answer);                  // 卡不灰可重点（探索不罚）
  const wrongOk = badTap && miss1b && chainW && passOk &&
                  rD1 === 'wrong' && rD2 === 'wrong' &&
                  missAfter2b === 2 && breathe2 && rE === 'right';
  if (wrongOk) npass++;
  units.badPath = { ok: wrongOk, badTap: badTap, miss1: miss1b, chain: chainW,
                    rejInWin: rejW === false, passInWin: passOk,
                    miss2: rD2 === 'wrong' && missAfter2b === 2, breathe2: breathe2, right: rE };

  /* ---- ⑦ antiPath（r12 delta③）：反向框架锚+ok 卡消除式反馈+bad 卡=答案 ---- */
  total++;
  startLevel(15);                               // ch4 anti：题15 赛跑（ok 对他说谢谢/ok 说恭喜你呀/bad 说我不玩了）
  await unlocked();
  const q7 = window.TH.quiz;
  const ancOk = window.__lastVoiceKey === 'tha_not' && sceneEl.dataset.kind === 'anti';
  const okI = q7.cards.findIndex(c => c.tier === 'ok');            // ok 卡下标（独立推导）
  const pO = window.TH.tapCard(okI);                               // → wrong（fire，演出中段采样）
  await wait(200);
  const mehO = friendEl.classList.contains('meh');
  const rO = await pO;
  await unlocked();
  const chainO = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 1 && h[0] === 'tha_ok' &&                 // 反向错反馈=tha_ok 单 clip（消除不指认）
                 h.every(p => typeof p === 'string') && !keylessLast(h));
  const rejO = await window.TH.tapCard(okI);                           // 窗内 ok 二击=吞 false（不计 miss）
  const anti1 = ancOk && rO === 'wrong' && rejO === false && window.TH.quiz.miss === 1 &&
                mehO && chainO;
  await waitGrayOver();                                                // 等反向错反馈豁免窗（ANTI_OK_WIN）过
  const badI7 = q7.cards.findIndex(c => c.tier === 'bad');             // anti 答案=唯一 bad（独立推导）
  const ansOk = badI7 >= 0 && badI7 === window.TH.quiz.answer &&
                badI7 === deriveAnswerV(q7.cards, 'anti');
  const pR7 = window.TH.tapCard(badI7);                                // 点「不该说的」=对
  await wait(200);
  const happyO = friendEl.classList.contains('happy');
  const rR7 = await pR7;
  const antiOk = anti1 && ansOk && rR7 === 'right' && happyO;
  if (antiOk) npass++;
  units.antiPath = { ok: antiOk, anchor: ancOk, okWrong: rO, meh: mehO, chain: chainO,
                     rejInWin: rejO === false, ansBad: ansOk, right: rR7, happy: happyO };

  /* ---- ⑦b antiRescue（P2-1 修复实证，试玩实锤回归锚）：anti 二错后 bad 答案卡
     零 breathe（旧版 miss≥2 会 breathe 落 bad 卡=同形反义）+ok 卡错后保持灰
     （排除法视觉：两 ok 全灰→bad 唯一亮）+bad 仍可点完成（灰只视觉不锁卡） ---- */
  total++;
  startLevel(15);                               // ch4 anti 同题确定性重建（题15 赛跑）
  await unlocked();
  const q7b = window.TH.quiz;
  const okIs = [];                              // 两张 ok 卡下标（独立推导——不用 quiz.answer）
  q7b.cards.forEach((c, i) => { if (c.tier === 'ok') okIs.push(i); });
  const bad7b = q7b.cards.findIndex(c => c.tier === 'bad');
  const pB1 = window.TH.tapCard(okIs[0]);       // ok 一错（miss=1）
  await wait(200);
  await pB1; await unlocked(); await waitGrayOver();
  const grayB1 = cardWrapAt(okIs[0]).classList.contains('gray');   // 一错后灰保持（不回弹——排除法第一笔）
  const pB2 = window.TH.tapCard(okIs[1]);       // ok 二错（miss=2，豁免窗外照计）
  await wait(200);
  const brBadB = cardWrapAt(bad7b).classList.contains('breathe');  /* 修复判别点：旧版此处 breathe 已加在
                                                                      bad 卡（试玩 P2-1 复现坐标）——须 false */
  const rB2 = await pB2;
  await unlocked();
  const missB2 = window.TH.quiz.miss;                              // 推进前记录（答案卡推进会清零）
  const grayB1b = cardWrapAt(okIs[0]).classList.contains('gray');  // 两 ok 全灰=bad 唯一亮
  const grayB2b = cardWrapAt(okIs[1]).classList.contains('gray');
  const brBadB2 = cardWrapAt(bad7b).classList.contains('breathe'); // 演出完仍零 breathe
  const rB3 = await window.TH.tapCard(bad7b);                      // 点 bad=对（灰卡不锁点）
  const rescueB = grayB1 && !brBadB && !brBadB2 && rB2 === 'wrong' &&
                  missB2 === 2 && grayB1b && grayB2b && rB3 === 'right';
  if (rescueB) npass++;
  units.antiRescue = { ok: rescueB, grayKept1: grayB1, grayKeptBoth: grayB1b && grayB2b,
                       noBreatheBad: !brBadB && !brBadB2, miss2: missB2 === 2, right: rB3 };

  /* ---- ⑧ delta 实锤断言：反启发式 tier 翻转+anti 分布+审计双例+不泄答案 ---- */
  total++;
  /* 翻转表（SPEC §7 设计定版硬编码）：label → {行号: 期望 tier}——「永远鞠躬/永远大声」
     策略必失分的实证（同 label 跨情景 tier 翻转） */
  const FLIP = {
    '鞠躬说谢谢': { 0: 'best', 1: 'best', 2: 'best', 3: 'best', 4: 'best', 5: 'gray', 7: 'gray', 8: 'gray', 9: 'gray' },
    '击掌说谢谢': { 1: 'gray', 4: 'gray', 7: 'best', 9: 'best' },
    '大声说谢谢': { 0: 'gray', 3: 'gray', 8: 'best', 12: 'best' },
    '小声说谢谢': { 10: 'gray', 11: 'best', 12: 'gray', 13: 'best', 14: 'gray' },
    '抱抱它':     { 10: 'best', 13: 'gray', 14: 'best' }
  };
  let flipBad = null, flipHits = 0;
  const lblRows = {};                            // 实测：label → {行号: tier}（全 20 题扫）
  for (let i = 0; i < 20; i++) SCENES[i].cards.forEach(c => {
    lblRows[c.label] = lblRows[c.label] || {};
    lblRows[c.label][i] = c.tier;
  });
  Object.keys(FLIP).forEach(lbl => {
    const exp = FLIP[lbl], got = lblRows[lbl] || {};
    Object.keys(exp).forEach(r => {
      if (got[r] !== exp[r]) flipBad = 'flip ' + lbl + '@' + r + '=' + got[r];
      else flipHits++;
    });
    if (Object.keys(got).length !== Object.keys(exp).length)
      flipBad = 'flipN ' + lbl + ' got ' + Object.keys(got).length;   // 出现次数全对账（无漏列）
  });
  /* anti 分布先验：题 15-19 恰 1 bad+2 ok+0 best/gray（防双真值） */
  let antiBad = null;
  for (let i = 15; i < 20 && !antiBad; i++) {
    const t = SCENES[i].cards.map(c => c.tier).sort().join('|');
    if (t !== 'bad|ok|ok') antiBad = 'dist ' + i + '=' + t;
  }
  /* 审计双例（AUDIT-56:85 示例逐条）：比赛输了谢对手=合时宜（题15 ok「对他说谢谢」）/
     被抢了玩具还说谢谢=不合时宜（题16 bad「对他说谢谢」） */
  const auditOk = SCENES[15].cards.some(c => c.tier === 'ok' && c.label === '对他说谢谢') &&
                  SCENES[15].cards.some(c => c.tier === 'bad' && c.label === '说我不玩了') &&
                  SCENES[16].cards.some(c => c.tier === 'bad' && c.label === '对他说谢谢');
  /* 不泄答案：aria 统一「做法 」前缀（tier 不进 DOM 可读层）+框架锚文本与全部卡
     label（≥2 字）无子串交集（不指认） */
  startLevel(0);
  await unlocked();
  const ariaOk = Array.from(cardsEl.querySelectorAll('.card-wrap')).every((w, i) =>
    w.getAttribute('aria-label') === '做法 ' + window.TH.quiz.cards[i].label &&
    !/best|gray|bad|ok/.test(w.getAttribute('aria-label')));
  const anchors = [VOICE.fit.text, VOICE.not.text];
  const allLabels = [];
  SPEC_SCENES.forEach(s => s.cards.forEach(c => allLabels.push(c[1])));
  const noLeak = anchors.every(a => allLabels.every(l => l.length < 2 || a.indexOf(l) < 0));
  const deltaOk = !flipBad && !antiBad && auditOk && ariaOk && noLeak && flipHits === 25;   /* m1：SPEC 25 锚精确（flipN 全量对账兜底——判别力无损） */
  if (deltaOk) npass++;
  units.delta = { ok: deltaOk, flipBad: flipBad, flipHits: flipHits, antiBad: antiBad,
                  audit: auditOk, aria: ariaOk, noLeak: noLeak };

  /* ---- ⑨ pool：题库 20 题对账（SPEC §7 全表独立硬编码——情景句+kind+tier/label 多重集） ---- */
  total++;
  let poolBad = null;
  for (let i = 0; i < 20 && !poolBad; i++) {
    const spec = SPEC_SCENES[i], row = SCENES[i];
    if (row.say !== spec.say) { poolBad = 'say ' + i; break; }
    if (row.kind !== spec.kind) { poolBad = 'kind ' + i; break; }
    if (row.cards.length !== spec.cards.length) { poolBad = 'n ' + i; break; }
    const got = row.cards.map(c => c.tier + '\t' + c.label).sort().join('|');       // 多重集（卡序无关）
    const exp = spec.cards.map(p => p[0] + '\t' + p[1]).sort().join('|');
    if (got !== exp) { poolBad = 'cards ' + i; break; }
  }
  /* 20 题覆盖审计：静态 20 关每题恰现 5 次（§0.88 取题域全档成立——覆盖口径
     不锁取材序：只数每行出现次数，不验出现位置） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.scene] = (cnt[q.scene] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 && SPEC_SCENES.every((s, i) => cnt[i] === 5);
  const poolOk = !poolBad && coverOk;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, cover: coverOk };

  /* ---- ⑩ stars：星级口径（0=3★/1-2=2★/≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑪ gen：生成关 flat20+（seeded ri(rnd,1,4) 独立复算+四档全现+per-chapter 池+确定性+无放回） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 727);      // SPEC §0.88：独立重写 rng（python 式复刻）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    const cfg = SPEC_CH[L.dch];                      // 章档：卡数+题型
    if (!L.quizzes.every(q => q.cards.length === cfg.n)) genBad.push(flat + ':cardsN');
    /* r12 池域 per-chapter kind-pure：say+卡数反查 SPEC 行号落单章池
       （dch k→行 (k-1)*5..k*5-1）+关内 5 题全=章 kind——b36 坑③反查口径 */
    if (!L.quizzes.every(q => {
      const row = rowOfV(q.say, q.cards.length);
      return row >= 0 && row >= (L.dch - 1) * 5 && row < L.dch * 5 && q.kind === cfg.kind;
    })) genBad.push(flat + ':pool');
    const set = {};
    L.quizzes.forEach(q => { set[q.scene] = 1; });
    if (Object.keys(set).length !== 5) genBad.push(flat + ':dupScene');             // 无放回抽 5 题
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);   // 四档全现（域全档成立型）
  const genOk = genBad.length === 0 && distOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch };

  /* ---- ⑫ windows+contract：六窗静态断言（SPEC §4/§7 实长表）+契约源码断言+双录+nextHint 实算 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = WRONG_CHAIN_WIN === 4434 &&                            // 坏链豁免窗 ==4434 精确
                WRONG_CHAIN_WIN === D.th_wrong + 150 + D.th_hint + 300 &&   // =2040+150+1944+300
                CELE_WIN === 2124 && CELE_WIN === D.th_right + 300 &&  // 确认窗=1824+300 精确
                PICK_WIN === 3108 && PICK_WIN === D.tha_fit + 300 &&   // r12 择优锚窗=2808+300
                NOT_WIN === 3060 && NOT_WIN === D.tha_not + 300 &&     // r12 反向锚窗=2760+300
                GRAY_WIN === 3180 && GRAY_WIN === D.tha_gray + 300 &&  // r12 灰链窗=2880+300
                ANTI_OK_WIN === 3492 && ANTI_OK_WIN === D.tha_ok + 300 &&   // r12 反向错反馈窗=3192+300
                TUT_WATCH_WAIT >= D.th_tut_watch + 300 &&              // watch 延 ≥3204
                TUT_TURN_WAIT >= D.th_tut_turn + 300 &&                // turn 延 ≥2124
                (2620 + 400) >= D.th_right + 300 &&                    // celebrate 3020 ≥ 2124
                estMsV('下雨小鹿老师给你撑伞') === 10 * 345 + 600 &&   // estMs 全字符口径（10 字最长句）
                SPEC_SCENES.every((s, i) => estMsV(s.say) + 300 >= SPEC_TH_SC['th_sc_' + (i + 1)]);   // T46：20 句 clip 全 ≤ estMs+300（窗不动充分性——逐句上界）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'thanks'") >= 0;             // C：本款存档键 kidsgame_thanks
  const srcE = src.indexOf('sv.thanks && sv.thanks.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('grayChainUntil = Date.now() + gWin') >= 0 &&   // r12 灰链豁免窗起播设
               src.indexOf('if (Date.now() < wrongChainUntil || Date.now() < grayChainUntil) return;') >= 0 &&   // I：救援双窗守卫
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0; grayChainUntil = 0;') >= 0 &&   // I：换关重置双窗
               src.indexOf('grayChainUntil && Date.now() < grayChainUntil') >= 0;   // I 补：灰链豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcD = src.indexOf("replayAnim(cardsEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
  const srcMeh = src.indexOf("setFriendMood('meh')") >= 0 &&              // r12：半好态分流在场
                 src.indexOf('anchorOf(q.kind)') >= 0 &&                  // r12：框架锚按题型分流
                 src.indexOf('function dirVoice()') >= 0;                 // r12：提示按题型分流
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
                     srcMeh && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, meh: srcMeh, hints: srcHint };

  /* ---- ⑬ confirmChain：确认链构成（__lastQueue===['th_right'] 单 clip；题面 say/框架锚
       走 voice.say·play 不动 __lastQueue——SPEC §7 明示） ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q13 = window.TH.quiz;
  const goodI13 = deriveAnswerV(q13.cards, q13.kind);
  const h0 = window.__queueHist.length;      // 订阅起点
  const r13 = await window.TH.tapCard(goodI13);
  const LQ = window.__lastQueue;
  const chainOk13 = r13 === 'right' &&
                    LQ && LQ.length === 1 && LQ[0] === 'th_right' &&        // 确认链=right 单 clip
                    JSON.stringify(LQ) === JSON.stringify(['th_right']) &&
                    !keylessLast(LQ) &&                                     // 全 clip 无 keyless（契约 N）
                    window.__queueHist.slice(h0).some(h =>
                      h.length === 1 && h[0] === 'th_right');
  if (chainOk13) npass++;
  units.confirmChain = { ok: chainOk13, r: r13,
                         queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑭ save：真实写档链（init thanks→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__thOrig.save, origPersist = window.__thOrig.persist;
  const origLS = localStorage.getItem('kidsgame_thanks');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_thanks');
    KIDS.init({ game: 'thanks', title: '感谢的话' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a14 = await window.TH.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_thanks');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a14.done && a14.taps === 5 && j && j.v === '1.0' && j.game === 'thanks' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a14.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U15 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_thanks');
  else localStorage.setItem('kidsgame_thanks', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑮ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
       审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'thanks', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, thanks: { tutSeen: true } };
  let q15 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_thanks', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__thDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.TH.start(0);
    await unlocked();
    q15 = window.TH.quiz;
    realOk = state.tut === 'none' && window.__thDemoR === null &&
             q15 && q15.scene === 0 && q15.kind === 'fit' && q15.cards.length === 2 &&
             q15.step === 0 && q15.miss === 0 &&
             q15.say === SPEC_SCENES[0].say &&
             q15.answer === deriveAnswerV(q15.cards, q15.kind) &&        // answer 独立推导
             window.TH.currentLevel.flat === 0 && window.TH.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.TH === 'object' && typeof window.TH.tapCard === 'function' &&
             typeof window.TH.autoSolve === 'function';        // b29 坑⑥：钩子真实页同暴露
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_thanks');
    else localStorage.setItem('kidsgame_thanks', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q15 && { scene: q15.scene, kind: q15.kind, n: q15.cards.length } };

  /* ---- ⑯ duration（r12 时长模型门禁）：独立副本复算+逐关对账（V_* 禁引引擎常量） ---- */
  total++;
  const V_DECIDE = { fit: 10000, size: 10000, anti: 11500 };   // SPEC §7 认知决策时长
  const V_ADV = 2124, V_MIN = 40000, V_PICK = 3108, V_NOT = 3060, V_ENTER = 400;
  const voiceWinV = (say, kind) => V_ENTER + estMsV(say) + 300 + (kind === 'anti' ? V_NOT : V_PICK);
  const quizDurV = (say, kind) => Math.max(voiceWinV(say, kind), V_DECIDE[kind]) + V_ADV;
  /* 全 20 题：语音窗恒 ≤ DECIDE（语音窗从不撑时长——r12 模型前提） */
  const noVoiceDrive = SPEC_SCENES.every(s => voiceWinV(s.say, s.kind) <= V_DECIDE[s.kind]);
  /* 40 关：modeled ≥40000 +页面 levelDurMs 与独立复算逐关对账（同引用 JSON.stringify
     互比恒真禁用——对账用数值和比较，非 stringify） */
  let durBad = null, minDur = Infinity;
  for (let flat = 0; flat < 40 && !durBad; flat++) {
    const L = genLevel(flat);
    const mySum = L.quizzes.reduce((s, q) => s + quizDurV(q.say, q.kind), 0);
    const pageSum = levelDurMs(L);
    if (mySum !== pageSum) durBad = 'mismatch ' + flat + ' ' + mySum + '!=' + pageSum;
    if (mySum < V_MIN) durBad = 'min ' + flat + ' ' + mySum;
    if (mySum < minDur) minDur = mySum;
  }
  const advOk = ADV_MS === 2124 && LEVEL_MIN_MS === 40000;    // 页面常量与独立值等值（交叉锚）
  const durUnitOk = noVoiceDrive && !durBad && advOk;
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, noVoiceDrive: noVoiceDrive, bad: durBad,
                     minModeled: minDur, adv: advOk };

  const out = { game: 'thanks', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__thVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史（框架锚 tha_fit/tha_not 亦经此——锚真值
     断言依据）；题面情景句 T46 化走 play（__lastVoiceKey/__lastVoiceText+voiceHist——SPEC §7 题面
     链，不进 __lastQueue）；voice.queue 记录拼播链（__lastQueue+__queueHist 全史） */
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
