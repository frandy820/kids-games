/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元（r49 口径）
   ① structure：脸谱 4+档位 5+组合脸 4+情境插画 40 SVG 全定义（data-anim 渲染即
      引擎）、DOM 无 undefined 文本、clips 48 条（etm_ 45+core 3——r49 段二注册
      收口：22 新键已注册+2 孤儿键已清退）全注入+duration 辨别器（±60ms）、
      answer 独立推导（=picks.indexOf(SPEC 期望 id)）、双 viewport
      （1280×800/800×1180）×（flat0 face 4/flat10 level 5/flat15 mix 4）布局
      （脸谱/组合脸候选 ≥96×96、档位格高 ≥64px、描边对比度 ≥3:1、overflowX ≤0、
      温度计 level 族显示+5 刻度/face·mix 族隐藏）
   ② tutorial：教学三段（watch=情境卡出→幽灵手指点正确脸谱→__etmDemoR
      ='picked'；turn=row0 首题你来指一指；帮→首对独 __etmTutSolo+进正式关
      flat=0 n=5；watch 段实测折算 ≤16s——单步演示款，演示题=face 族）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null/章号映射
      ch=flat/5+1/取材域=scene 反查 SPEC 全表行号落章池（scene 唯一定位，禁 idx
      公式锁实现取材序）/answer 唯一性对账（=picks.indexOf(SPEC 期望 id) 独立
      推导禁读直比）/引擎直驱 tapPick(answer)→picked/末题 done→3 星
   ④ frameM（契约 M 帧内容三层 ×flat0/5/10/15/20）：数值层 sceneEl.dataset.scene+
      候选 DOM 数+题面 say 真值（play 锚 __lastVoiceKey===q.sayKey——r49 段二
      注册收口：新键在册播报，play 锚记录双向覆盖）/DOM 类层 题面态候选无 good/miss+
      温度计显隐随族（face·mix 隐/level 显）+水银柱归零 data-lv="0"/演出层 点正确
      项后目标项 .good+（level 族）水银柱升位 dataset.lv=档号 1-5
   ⑤ wrongPath：错项 'wrong'+miss 计数+错链 [etm_wrong,etm_hint] 全 clip；豁免窗
      （真时钟 4626）内错项二击吞 false 且 miss 不变；窗内正确项放行 'picked'；
      窗后第二错照计 miss=2（契约 I 补）+正确项 breathe（答案级）
   ⑥ pool：题库 40 题对账（SPEC §R3 全表独立硬编码——scene+kind+text+ans 逐字，
      禁读页面真值当期望源）+20 静态关 rotate 覆盖审计（静态 20 题每题恰现 5 次）
      +r49 先验双律：level 每题恰含本档签名线索类（不小心·轻轻=l1/抢走·插队=l2/
      一直·总是=l3/故意=l4/还笑·做鬼脸=l5——独立线索表推导）+mix 每题恰含其
      组合两情绪线索词零第三情绪词（独立情绪线索表推导）+族分布（face 各情绪
      ≥3/level 各档=2/mix 各组合 ≥2）+静态关答案位直方图（各位置 ≥N/2n——
      r39-bis 均匀期望独立下界）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-59 dch=seeded 随机 ri(rnd,1,4)（mulberry32
      (flat*7919+867) python 式 JS 复刻）——verify 独立复算第一个随机数==dch
      +四档全现（各 ≥4=均匀期望 10 的 0.4 下界）+dch 分池域一致（POOL_ROWS 独立
      表：dch1 行 0-4+20-24/dch2 行 5-9+25-29/dch3 行 10-14+30-34/dch4 行
      15-19+35-39）+确定性（同 flat 两次生成 JSON 相等）+无放回（同关 5 题互异）
      +生成关答案位直方图（各位置 ≥N/2n）
   ⑨ windows+contract：错链豁免窗 ==4626（=2088+150+2088+300）+确认窗
      ==1932（=1632+300）+选中演出窗 1000+确认 2932+首错锁 ≤2238（b37 R3）+
      教学延窗+celebrate 窗+契约 A/B/C/D/E/F/I/J/K 源码断言
      （读 script[2] 合并文本——b36 M1 分离后恢复判别力；肯定断言检索字面逐条
      与 main 真源核对）+CHAPTERS/GEN_HINTS 双录+nextHint 4/9/14/19
      数值断言+24/29/34/39 实算（b35 m5 范式）+estMs 17 字最长句口径
   ⑩ confirmChain：确认链构成 __lastQueue===['etm_right']（right 单 clip 全 clip
      无 keyless——题面情境句走 voice.play 不动 __lastQueue）
   ⑪ save：真实写档链（init etm→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_etm v:'1.0' levels['1-0'] 更新；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（row0 花/face 族/4 项/step=0/answer 独立推导
      ——flat0 教学锚 r49 保留实证）+window.ETM 真实页暴露（b29 坑⑥）；
      try/finally 保异常时 origLS 也恢复
   结果写 #verify-result + window.__etmVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH39 §4/SPEC-R49 §R6 文字独立重列（禁抄页面 VOICE/CHAPTERS/常量/题库） */
  const SPEC_DUR = { etm_tut_watch: 3240, etm_tut_turn: 1848, etm_hint: 2088,
                     etm_right: 1632, etm_wrong: 2088,
                     // 情境句 etm_sc_* 40（mutagen 实测=浏览器口径 ±60ms，真值源 r4789_clip_ms.json；
                     // r49 段二：22 新键实测补行，2 孤儿键 paintspill/longwait 已清退删行）
                     etm_sc_flower: 2400, etm_sc_blocksdown: 2664, etm_sc_balloonfly: 2520, etm_sc_thunder: 2184, etm_sc_singsong: 2136,
                     etm_sc_fishfloat: 3624, etm_sc_dooropen: 3624, etm_sc_coinbank: 3864, etm_sc_sacktower: 4248, etm_sc_artshow: 4056,
                     etm_sc_crayondrop: 2976, etm_sc_snatchtoy: 3024, etm_sc_swinggrab: 2640, etm_sc_castlekick: 3288, etm_sc_ruinlaugh: 3000,
                     etm_sc_bookrip: 3480, etm_sc_funfair: 4152, etm_sc_friendmove: 4488, etm_sc_bullyshout: 3984, etm_sc_stageshow: 4152,
                     etm_sc_painting: 2184, etm_sc_shoutloud: 2352, etm_sc_towertop: 2424, etm_sc_grabtoy: 2256, etm_sc_lostmom: 2208,
                     etm_sc_rainpicnic: 3912, etm_sc_darkhole: 4128, etm_sc_grandma: 4104, etm_sc_nightnoise: 3792, etm_sc_kitewin: 3792,
                     etm_sc_stepfoot: 3192, etm_sc_queuejump: 3576, etm_sc_interrupt: 2688, etm_sc_modelcrush: 3480, etm_sc_tearbook: 3504,
                     etm_sc_puzzlelost: 3672, etm_sc_gradfare: 4080, etm_sc_bigkidpush: 4128, etm_sc_legobroke: 3768, etm_sc_racefirst: 3456 };
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_CH = { 1: { k: 'face', n: 4 }, 2: { k: 'face', n: 4 },
                    3: { k: 'level', n: 5 }, 4: { k: 'mix', n: 4 } };   // r49 族档（level 五档/mix 新族）
  const SPEC_CHAPTER_HINTS = { 1: '心情藏着线索，仔细听一听', 2: '生气还有大小，温度计来啦',
                               3: '有时候心情有两个，来找一找', 4: '新的心情情境来啦，继续指一指' };
  const SPEC_GEN_HINTS = ['听一听，指一指心情脸', '心情线索藏起来啦，仔细听',
                          '生气有多大，看温度计指一指', '有两种心情的，指那张双拼脸'];
  /* SPEC-R49 §R3 情绪/档位/组合封闭集（族池全集） */
  const SPEC_FACES = ['happy', 'angry', 'sad', 'scared'];
  const SPEC_LEVELS = ['l1', 'l2', 'l3', 'l4', 'l5'];
  const SPEC_MIXES = ['happy+scared', 'happy+sad', 'angry+sad', 'angry+scared'];
  /* SPEC-R49 §R4 先验线索表（独立重列——level 签名线索类/mix 情绪线索词） */
  const SPEC_LEVEL_CUE = { l1: ['不小心', '轻轻'], l2: ['抢走', '插队'], l3: ['一直', '总是'],
                           l4: ['故意'], l5: ['还笑', '做鬼脸'] };
  const SPEC_MIX_CUE = { happy: ['开心', '高兴', '喜欢'], angry: ['生气', '气得', '又气', '很气'],
                         sad: ['难过', '伤心', '舍不得', '想哭', '掉眼泪', '心疼'],
                         scared: ['害怕', '怕', '担心', '吓'] };
  /* SPEC-R49 §R3 生成关 dch 分池（独立重列——与 core POOL_ROWS 对账） */
  const SPEC_POOL_RANGES = { 1: [[0, 4], [20, 24]], 2: [[5, 9], [25, 29]],
                             3: [[10, 14], [30, 34]], 4: [[15, 19], [35, 39]] };
  /* SPEC-R49 §R3 40 题全表（scene+kind+text+ans 逐字独立重列——情境句全文照录） */
  const SPEC_QUESTIONS = [
    { scene: 'flower',     kind: 'face',  text: '朋友送你一朵小花',             ans: 'happy' },
    { scene: 'blocksdown', kind: 'face',  text: '妹妹把你的积木推倒了',         ans: 'angry' },
    { scene: 'balloonfly', kind: 'face',  text: '心爱的气球飞走了',             ans: 'sad' },
    { scene: 'thunder',    kind: 'face',  text: '打雷轰隆隆响',                 ans: 'scared' },
    { scene: 'singsong',   kind: 'face',  text: '大家一起唱歌',                 ans: 'happy' },
    { scene: 'fishfloat',  kind: 'face',  text: '你的小金鱼不动了，浮在水面上', ans: 'sad' },
    { scene: 'dooropen',   kind: 'face',  text: '关了灯的房间，衣柜门吱呀开了', ans: 'scared' },
    { scene: 'coinbank',   kind: 'face',  text: '存钱罐里的钱，正好够买那个玩具', ans: 'happy' },
    { scene: 'sacktower',  kind: 'face',  text: '辛苦搭的高塔被人扫倒，他转身就走', ans: 'angry' },
    { scene: 'artshow',    kind: 'face',  text: '你的画被选去展览，大家都停下来看', ans: 'happy' },
    { scene: 'crayondrop', kind: 'level', text: '有人不小心碰掉了你的蜡笔',     ans: 'l1' },
    { scene: 'snatchtoy',  kind: 'level', text: '有人抢走你手里的玩具',         ans: 'l2' },
    { scene: 'swinggrab',  kind: 'level', text: '有人一直抢你的秋千',           ans: 'l3' },
    { scene: 'castlekick', kind: 'level', text: '辛苦搭的城堡被故意踢倒',       ans: 'l4' },
    { scene: 'ruinlaugh',  kind: 'level', text: '有人弄坏了你的画还笑你',       ans: 'l5' },
    { scene: 'bookrip',    kind: 'mix',   text: '绘本被撕坏了，你又气又难过',   ans: 'angry+sad' },
    { scene: 'funfair',    kind: 'mix',   text: '明天去游乐园，你开心又有点怕下雨', ans: 'happy+scared' },
    { scene: 'friendmove', kind: 'mix',   text: '好朋友要搬走了，你为他开心又舍不得', ans: 'happy+sad' },
    { scene: 'bullyshout', kind: 'mix',   text: '有人抢你玩具还凶你，你又怕又生气', ans: 'angry+scared' },
    { scene: 'stageshow',  kind: 'mix',   text: '要上台表演啦，你开心又怕忘动作', ans: 'happy+scared' },
    { scene: 'painting',   kind: 'face',  text: '你的画被弄坏了',               ans: 'sad' },
    { scene: 'shoutloud',  kind: 'face',  text: '有人对你大喊大叫',             ans: 'scared' },
    { scene: 'towertop',   kind: 'face',  text: '你搭的高塔成功了',             ans: 'happy' },
    { scene: 'grabtoy',    kind: 'face',  text: '玩具被人抢走了',               ans: 'angry' },
    { scene: 'lostmom',    kind: 'face',  text: '迷路找不到妈妈',               ans: 'scared' },
    { scene: 'rainpicnic', kind: 'face',  text: '期待好久的野餐，早上下起了大雨', ans: 'sad' },
    { scene: 'darkhole',   kind: 'face',  text: '球滚进黑黑的地下室，你不敢进去捡', ans: 'scared' },
    { scene: 'grandma',    kind: 'face',  text: '远方的奶奶坐了很久的车，来看你了', ans: 'happy' },
    { scene: 'nightnoise', kind: 'face',  text: '半夜轰隆一声响，你从梦里惊醒了', ans: 'scared' },
    { scene: 'kitewin',    kind: 'face',  text: '风筝掉下来好多次，终于飞上了天', ans: 'happy' },
    { scene: 'stepfoot',   kind: 'level', text: '排队时被轻轻踩了一脚',         ans: 'l1' },
    { scene: 'queuejump',  kind: 'level', text: '有人插队，一下站到了你的前面', ans: 'l2' },
    { scene: 'interrupt',  kind: 'level', text: '你说话总是被人打断',           ans: 'l3' },
    { scene: 'modelcrush', kind: 'level', text: '有人故意踩坏了你拼好的飞机',   ans: 'l4' },
    { scene: 'tearbook',   kind: 'level', text: '有人撕了你的故事书还做鬼脸',   ans: 'l5' },
    { scene: 'puzzlelost', kind: 'mix',   text: '拼图被弄丢了，你又气又想哭',   ans: 'angry+sad' },
    { scene: 'gradfare',   kind: 'mix',   text: '拿到毕业奖状很开心，又舍不得老师', ans: 'happy+sad' },
    { scene: 'bigkidpush', kind: 'mix',   text: '有人抢了你的球还推人，你又怕又生气', ans: 'angry+scared' },
    { scene: 'legobroke',  kind: 'mix',   text: '乐高被踩坏了，你又生气又心疼', ans: 'angry+sad' },
    { scene: 'racefirst',  kind: 'mix',   text: '明天要比赛了，你开心又怕输',   ans: 'happy+scared' }
  ];
  const SPEC_POOL = k => (k === 'face' ? SPEC_FACES : k === 'level' ? SPEC_LEVELS : SPEC_MIXES);
  const estMsV = n => n.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* 独立 rng（SPEC §0.95 生成关策略）：mulberry32(flat*7919+867)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  /* 独立推导（SPEC §R3 钩子契约）：answer=picks.indexOf(SPEC 期望 id) */
  const rowOfV = scene => {                      // scene 唯一定位 SPEC 行号（域约束失败=-1）
    const hit = [];
    for (let i = 0; i < SPEC_QUESTIONS.length; i++)
      if (SPEC_QUESTIONS[i].scene === scene) hit.push(i);
    return hit.length === 1 ? hit[0] : -1;
  };
  const specAnsV = quiz => !quiz || rowOfV(quiz.scene) < 0 ? null : SPEC_QUESTIONS[rowOfV(quiz.scene)].ans;
  const deriveAnswerV = quiz => { const a = specAnsV(quiz); return a == null ? -1 : quiz.picks.indexOf(a); };
  const specSayV = row => SPEC_QUESTIONS[row].text;
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链豁免窗（真时钟 4626）过
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
  const q1 = window.ETM.quiz;
  const pickDom = Array.from(picksEl.querySelectorAll('.pick'));
  const svgOk = q1 && pickDom.length === q1.picks.length &&
    pickDom.every((p, i) => {
      const g = p.querySelector('.art svg > g[data-anim]');
      return Number(p.dataset.i) === i && !!g && g.dataset.anim === q1.picks[i] &&   // 渲染即引擎
             !!p.querySelector('.word');
    }) &&
    !!sceneCardEl.querySelector('svg > g[data-anim]') &&                    // 情境插画根组锚
    sceneCardEl.querySelector('svg > g[data-anim]').dataset.anim === q1.scene &&
    SPEC_FACES.every(id => faceSvg(id).indexOf('<svg') === 0) &&           // 脸谱 4 张全定义
    SPEC_LEVELS.every(id => levelSvg(id).indexOf('<svg') === 0) &&         // r49 档位 5 张全定义
    SPEC_MIXES.every(id => mixSvg(id).indexOf('<svg') === 0) &&            // r49 组合脸 4 张全定义
    SPEC_QUESTIONS.every(row => sceneSvg(row.scene).indexOf('<svg') === 0) &&   // 40 情境插画全可渲
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answer 独立推导（SPEC §R3 唯一解锚——禁读 quiz.answer 直比推导依据） */
  const ansDeriveOk = q1 && q1.answer === deriveAnswerV(q1) &&
                      q1.picks.slice().sort().join('|') === SPEC_POOL(q1.kind).slice().sort().join('|') &&
                      q1.kind === SPEC_QUESTIONS[rowOfV(q1.scene)].kind;
  /* clips：etm_ 45+core 3 全注入（r49 段二注册收口 48——length 精确锁 48：
     2 孤儿键 paintspill/longwait 已清退，22 新键已注册，多/少任一变化即 FAIL）
     +etm 实长辨别（SPEC §4 实长表 ±60ms；core 3 条只验在场——core 实长不在本批
     实长表，禁猜值断言） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const preOk = keysAll.length === 48 &&
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 face 4/flat10 level 5/flat15 mix 4）——候选=主答案
     目标（SEL：脸谱/组合脸 ≥96×96/档位格高 ≥64px）；温度计显隐随族（level 显
     +5 刻度，face·mix 隐） */
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
    const wraps = Array.from(picksEl.querySelectorAll('.pick'));
    if (g._simFlat >= 20)   /* m4 守卫：生成关 dch 随机禁按静态档硬算 need（防假阴性）——直接判不过 */
      return { vp: w + 'x' + h, flat: g._simFlat, picks: wraps.length, hitOk: false, contrast: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    const spec = SPEC_CH[Math.floor(g._simFlat / 5) + 1];       // 静态族档独立复算
    const kind = spec.k;
    const hitOk = wraps.length === spec.n &&
      wraps.every(b => b.offsetWidth >= 96 && (kind === 'level' ? b.offsetHeight >= 64 : b.offsetHeight >= 96)) &&
      thermoEl.classList.contains('show') === (kind === 'level') &&          // 温度计显隐随族
      (kind === 'level' ? thermoEl.querySelectorAll('.t-tick').length === 5 &&
                          !!thermoEl.querySelector('.t-mercury') && tubeEl().dataset.lv === '0' : true);   // r49 五刻度+水银归零
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 候选描边对比度
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
  units.structure = { ok: s1ok, svg: svgOk, dom: cleanDom, ansDerive: ansDeriveOk,
                      clips: preOk, dur: durOk, layout: layoutOk, sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（看→帮→独；演示题=face 族；r49 教学链零改动） ---- */
  total++;
  window.__etmOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__etmTutSolo = false;
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__etmWatchMs || 1e9) / SPEED;      // watch 段实测（家族预算 ≤16s 只罩 watch）
  const tutHelp = window.__etmDemoR === 'picked' && state.tut === 'help' &&
                window.ETM.currentLevel.flat === -1 &&
                window.ETM.quiz.scene === 'flower' && window.ETM.quiz.kind === 'face' &&
                window.ETM.quiz.picks.length === 4 &&
                twWatch <= 16000 && tw <= 26000;
  await unlocked();
  const qT = window.ETM.quiz;                                // "帮"阶段放手题（row0 花）
  const rT = await window.ETM.tapPick(deriveAnswerV(qT));    // 首次指对（独立推导正确脸谱）→ 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__etmTutSolo === true &&
                window.ETM.currentLevel.flat === 0 && window.ETM.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__etmDemoR, tut: state.tut,
                     solo: window.__etmTutSolo, watchMs: Math.round(twWatch),
                     totalMs: Math.round(tw), turnR: rT };

  /* ---- ③ drive：静态 20 关全量审计+SPEC 取材域反查对账（answer=独立推导，禁读直比） ---- */
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
    /* SPEC §R3 取材域对账（禁 idx 公式锁取材序）：每题 scene 反查 SPEC 全表行号 →
       行号必须落本章程（(ch-1)*5..ch*5-1）——scene 唯一定位，既验域又不锁实现取材序 */
    let sceneOk = true;
    for (let qi = 0; qi < 5; qi++) {
      const row = rowOfV(L1.quizzes[qi].scene);
      if (row < 0 || row < (expCh - 1) * 5 || row >= expCh * 5) {
        badCase = 'scene ' + flat + '/' + qi + ' row=' + row; sceneOk = false; break;
      }
    }
    /* 引擎直驱：逐题点正确项（独立推导）→ picked / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const goodI = q.picks.indexOf(SPEC_QUESTIONS[rowOfV(q.scene)].ans);      // 独立推导（SPEC 对账锚）
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

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0/5/10/15/20：数值/DOM 类/演出层） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.ETM.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 数值层：row 锚+候选 DOM 数+题面 say 真值（play 锚 __lastVoiceKey===q.sayKey——
       r49 段二注册收口：新键在册播报，play 锚记录键值对双向覆盖；flat5/15/20 全新键题） */
    const numOk = Number(sceneEl.dataset.scene) === rowOfV(q.scene) &&
                  picksEl.querySelectorAll('.pick').length === q.picks.length &&
                  Number(picksEl.dataset.n) === q.picks.length &&
                  picksEl.dataset.kind === q.kind &&
                  window.__lastVoiceText === q.say &&
                  window.__lastVoiceKey === q.sayKey &&
                  q.say === specSayV(rowOfV(q.scene)) &&
                  Array.from(picksEl.querySelectorAll('.pick')).every((p, i) =>
                    !!picksEl.querySelector('.pick[data-i="' + i + '"]') && Number(p.dataset.i) === i);
    /* DOM 类层：题面态=候选无 good/miss+情境句文本=say 真值+温度计显隐随族（level 显
       其余隐）+水银归零 */
    const faceOk = Array.from(picksEl.querySelectorAll('.pick')).every(p =>
                     !p.classList.contains('good') && !p.classList.contains('miss')) &&
                   hintEl.textContent === q.say &&
                   thermoEl.classList.contains('show') === (q.kind === 'level') &&
                   (q.kind === 'level' ? tubeEl().dataset.lv === '0' : true);
    /* 演出层：点正确项（独立推导）→ 演出中段采样 目标项 .good+（level 族）水银柱
       升位 dataset.lv=档号 1-5（r49 五档；mix 族=双拼脸 .good 放大）
       （tapPick resolve 后非末题会 presentQuiz 新题重置 DOM——断言须在演出窗内做） */
    const goodI = deriveAnswerV(q);
    const lvExp = q.kind === 'level' ? String(Number(String(specAnsV(q)).slice(1))) : null;
    const pF = window.ETM.tapPick(goodI);       // fire（演出开始）
    await wait(250);                            // 演出中段（选中+确认窗 ~350ms@SPEED.12 内）
    const el = pickAt(goodI);
    const goodOk = !!el && el.classList.contains('good');
    const lvOk = q.kind !== 'level' || (!!tubeEl() && tubeEl().dataset.lv === lvExp &&
                                         !!thermoEl.querySelector('.t-mercury'));
    const r = await pF;
    const joyOk = r === 'picked' || r === 'done';
    return { ok: numOk && faceOk && joyOk && goodOk && lvOk,
             why: JSON.stringify({ numOk, faceOk, joyOk, goodOk, lvOk, r }) };
  }
  const fA = await frameCheck(0);      // dch1 face 4 脸（教学锚面）
  const fB = await frameCheck(5);      // ch2 face 间接（r49 新键回退路径）
  const fC = await frameCheck(10);     // dch3 level 5 档（温度计升位演出帧）
  const fD = await frameCheck(15);     // ch4 mix 4 组合（温度计隐+双拼脸选中）
  const fE = await frameCheck(20);     // 生成关（族随 dch——帧断言不依赖族）
  const frameOk = fA.ok && fB.ok && fC.ok && fD.ok && fE.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat5: fB, flat10: fC, flat15: fD, flat20: fE };

  /* ---- ⑤ wrongPath：错路径+豁免窗（真时钟 4626：窗内错项吞/窗内正确项放行/窗后二错照计 miss） ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.ETM.quiz;
  const badTap = (await window.ETM.tapPick(99)) === null;           // 非法下标=null（不炸）
  const badI = q5.picks.findIndex((p, i) => i !== q5.answer);       // 错项下标（独立推导补集）
  const pW = window.ETM.tapPick(badI);                              // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                             // 等摇头弹回演出毕（locked=false）
  await unlocked();                                                // 等演出锁（showUntil 余窗）过——豁免窗仍在
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'etm_wrong' &&          // 错链头=wrong clip
                 h[1] === 'etm_hint' &&                             // 语义句=hint「听听发生了什么」
                 h.every(p => typeof p === 'string') &&            // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const rejW = await window.ETM.tapPick(badI);                      // 豁免窗内错项二击=被吞 false（I 补：不计 miss）
  const miss1 = rW === 'wrong' && rejW === false && window.ETM.quiz.miss === 1;
  const passW = await window.ETM.tapPick(q5.answer);                // 豁免窗内正确项=放行（I 补：缓解吞输入）→ 推进
  const passOk = passW === 'picked' && window.ETM.quiz.step === 1;
  await unlocked();                                                // 等新题开题演出完
  await waitChainOver();                                           // 等首错豁免窗（真时钟）过
  const q5b = window.ETM.quiz;                                      // 题 1（章池内下一题）
  const badIb = q5b.picks.findIndex((p, i) => i !== q5b.answer);
  const rD1 = await window.ETM.tapPick(badIb);                      // 题 1 首错（miss=1）
  await unlocked();
  await waitChainOver();                                           // 等本错豁免窗过——窗后二错照计 miss
  const rD2 = await window.ETM.tapPick(badIb);                      // 题 1 二错（miss=2）
  await unlocked();                                                // 等二错演出锁过
  const missAfter2 = window.ETM.quiz.miss;                          // rE 前记录（正确项推进会换题清零）
  const brEl = pickAt(q5b.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');   // miss≥2=正确项 breathe（答案级）
  const rE = await window.ETM.tapPick(q5b.answer);                  // 项不灰可重点（探索不罚）
  const wrongOk = badTap && miss1 && chainW && passOk &&
                  rD1 === 'wrong' && rD2 === 'wrong' &&
                  missAfter2 === 2 && breathe2 && rE === 'picked';
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, miss1: miss1, chain: chainW,
                      rejInWin: rejW === false, passInWin: passOk, miss2: rD2 === 'wrong' && window.ETM.quiz.miss === 2,
                      breathe2: breathe2, right: rE };

  /* ---- ⑥ pool：题库 40 题对账（SPEC §R3 全表独立硬编码）+r49 先验双律+族分布
       +静态关覆盖审计+静态答案位直方图（r39-bis：下界从均匀期望独立推导 N/2n） ---- */
  total++;
  let poolBad = null;
  for (let i = 0; i < SPEC_QUESTIONS.length && !poolBad; i++) {
    const spec = SPEC_QUESTIONS[i], row = QUESTIONS[i];
    if (row.scene !== spec.scene || row.kind !== spec.kind || row.ans !== spec.ans) { poolBad = 'row ' + i; break; }
    if (row.text !== spec.text) { poolBad = 'text ' + i; break; }       // 情境句全文逐字对账
    if (SPEC_POOL(spec.kind).indexOf(spec.ans) < 0) { poolBad = 'ansDomain ' + i; break; }
  }
  /* r49 先验律 1（level）：每题文本恰命中一个签名线索类且=其 ans（独立线索表推导，
     禁抄实现） */
  let cueLvOk = true, cueLvBad = '';
  SPEC_QUESTIONS.forEach((spec, i) => {
    if (spec.kind !== 'level' || !cueLvOk) return;
    const hits = Object.keys(SPEC_LEVEL_CUE).filter(k => SPEC_LEVEL_CUE[k].some(c => spec.text.indexOf(c) >= 0));
    if (hits.length !== 1 || hits[0] !== spec.ans) { cueLvOk = false; cueLvBad = i + '→' + hits.join(','); }
  });
  /* r49 先验律 2（mix）：文本线索词命中的情绪集合==其组合两情绪（恰两个，零第三情绪） */
  let cueMixOk = true, cueMixBad = '';
  SPEC_QUESTIONS.forEach((spec, i) => {
    if (spec.kind !== 'mix' || !cueMixOk) return;
    const want = spec.ans.split('+');
    const cued = Object.keys(SPEC_MIX_CUE).filter(e => SPEC_MIX_CUE[e].some(c => spec.text.indexOf(c) >= 0));
    const same = cued.length === 2 && cued.every(e => want.indexOf(e) >= 0);
    if (!same) { cueMixOk = false; cueMixBad = i + '→[' + cued.join(',') + ']'; }
  });
  /* 封闭集对账：FACES/LEVELS/MIXES id 集合与 SPEC 一致（候选池=全集无缺漏） */
  const setOk = FACES.map(f => f.id).join('|') === SPEC_FACES.join('|') &&
                LEVELS.map(l => l.id).join('|') === SPEC_LEVELS.join('|') &&
                MIXES.map(m => m.id).join('|') === SPEC_MIXES.join('|');
  /* 族分布（SPEC §R4 先验）：face 20 题各情绪 ≥3 / level 10 题各档=2 / mix 10 题
     各组合 ≥2（独立计数，非实现归纳） */
  const faceCnt = {}, lvCnt = {}, mixCnt = {};
  SPEC_QUESTIONS.forEach(s => {
    if (s.kind === 'face') faceCnt[s.ans] = (faceCnt[s.ans] || 0) + 1;
    else if (s.kind === 'level') lvCnt[s.ans] = (lvCnt[s.ans] || 0) + 1;
    else mixCnt[s.ans] = (mixCnt[s.ans] || 0) + 1;
  });
  const distOk6 = SPEC_FACES.every(f => (faceCnt[f] || 0) >= 3) &&
                  SPEC_LEVELS.every(l => (lvCnt[l] || 0) === 2) &&
                  SPEC_MIXES.every(m => (mixCnt[m] || 0) >= 2);
  /* 20 题静态覆盖审计：静态 20 关每静态题恰现 5 次（覆盖口径不锁取材序） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.row] = (cnt[q.row] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 &&
                  SPEC_QUESTIONS.slice(0, 20).every((s, i) => cnt[i] === 5) &&
                  SPEC_QUESTIONS.every((s, i) => i >= 20 ? !cnt[i] : true);   // 扩展池不入静态关
  /* 静态关答案位直方图（r39-bis）：按族分别计数，各位置 ≥N/(2n)（N=该族静态采样
     题数、n=族候选数——均匀期望独立下界） */
  const posCnt = { face: {}, level: {}, mix: {} };
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => {
      const k = q.kind, n = q.picks.length;
      posCnt[k][q.answer] = (posCnt[k][q.answer] || 0) + 1;
    });
  }
  const histOk6 = Object.keys(posCnt).every(k => {
    const n = k === 'level' ? 5 : 4;
    const N = Object.keys(posCnt[k]).reduce((s, a) => s + posCnt[k][a], 0);
    const floor = Math.floor(N / (2 * n));
    for (let i = 0; i < n; i++)
      if ((posCnt[k][i] || 0) < floor) return false;
    return N > 0;
  });
  const poolOk = !poolBad && setOk && coverOk && cueLvOk && cueMixOk && distOk6 && histOk6;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, set: setOk, cover: coverOk, cueLv: cueLvOk, cueLvBad: cueLvBad,
                 cueMix: cueMixOk, cueMixBad: cueMixBad, dist: distOk6, hist: histOk6,
                 posCnt: posCnt, faceCnt: faceCnt, lvCnt: lvCnt, mixCnt: mixCnt };

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

  /* ---- ⑧ gen：生成关 flat20-59（seeded ri(rnd,1,4) 独立复算+四档全现+dch 分池域
       一致+确定性+无放回+答案位直方图） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  const posCnt8 = { face: {}, level: {}, mix: {} };
  for (let flat = 20; flat < 60; flat++) {
    const rnd = mulberry32V(flat * 7919 + 867);      // SPEC：独立重写 rng（python 式复刻）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    const cfg = SPEC_CH[L.dch];                      // r49 族域随 dch（独立表 SPEC_CH）
    if (!L.quizzes.every(q => q.kind === cfg.k && q.picks.length === cfg.n)) genBad.push(flat + ':picksN');
    /* 池域：scene 反查 SPEC 行号落 SPEC_POOL_RANGES[dch] 两区间（独立分池表——
       r49 每池=静态章 5+扩展池 5） */
    if (!L.quizzes.every(q => {
      const row = rowOfV(q.scene);
      const inPool = row >= 0 && SPEC_POOL_RANGES[L.dch].some(r => row >= r[0] && row <= r[1]);
      return inPool;
    })) genBad.push(flat + ':pool');
    const set = {};
    L.quizzes.forEach(q => { set[q.row] = 1; });
    if (Object.keys(set).length !== 5) genBad.push(flat + ':dupRow');             // 无放回抽 5 题
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
    L.quizzes.forEach(q => { posCnt8[q.kind][q.answer] = (posCnt8[q.kind][q.answer] || 0) + 1; });
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] >= 4);   // 四档全现（均匀期望 10×0.4 下界）
  const histOk8 = Object.keys(posCnt8).every(k => {
    const n = k === 'level' ? 5 : 4;
    const N = Object.keys(posCnt8[k]).reduce((s, a) => s + posCnt8[k][a], 0);
    if (!N) return false;
    const floor = Math.floor(N / (2 * n));
    for (let i = 0; i < n; i++)
      if ((posCnt8[k][i] || 0) < floor) return false;
    return true;
  });
  const genOk = genBad.length === 0 && distOk && histOk8;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 5), dist: genDch, hist: histOk8, posCnt: posCnt8 };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §4 实长表）+契约源码断言+双录+nextHint 实算 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = WRONG_CHAIN_WIN === 4626 &&                            // 豁免窗 ==4626 精确
                WRONG_CHAIN_WIN === D.etm_wrong + 150 + D.etm_hint + 300 &&   // =2088+150+2088+300
                CELE_WIN === 1932 && CELE_WIN === D.etm_right + 300 &&  // 确认窗=1632+300 精确
                PICK_MS === 1000 && PICK_MS + CELE_WIN === 2932 &&      // 选中演出+确认=演出锁总窗口径
                BOUNCE_MS * 1 + 140 <= D.etm_wrong + 150 &&             // 首错锁总窗 1240 ≤2238（b37 R3/b38 R1 总窗口径）
                TUT_WATCH_WAIT >= D.etm_tut_watch + 300 &&              // watch 延 ≥3540
                TUT_TURN_WAIT >= D.etm_tut_turn + 300 &&                // turn 延 ≥2148
                (2620 + 400) >= D.etm_right + 300 &&                    // celebrate 3020 ≥ 1932
                estMsV('朋友送你一朵小花') === 8 * 345 + 600 &&          // estMs 全字符口径（8 字短句）
                estMsV('有人不小心碰掉了你的蜡笔') === 12 * 345 + 600 && // 承基线 12 字句
                estMsV('好朋友要搬走了，你为他开心又舍不得') === 17 * 345 + 600;  // r49 最长句 17 字（estMs 6465）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'etm'") >= 0;                 // C：本款存档键 kidsgame_etm
  const srcE = src.indexOf('sv.etm && sv.etm.tutSeen') >= 0;   // E：行为分流先查教学特例
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
  const srcD = src.indexOf("replayAnim(picksEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
  /* SPEC §2 方向级反馈=错链播毕重播情境句（say 非队列链——检索锚与 main 真源核对） */
  const srcDir = src.indexOf('KIDS.voice.play(q.sayKey, q.say)') >= 0 &&
                 src.indexOf('hintResayTimer') >= 0 &&
                 src.indexOf('WRONG_CHAIN_WIN + 60') >= 0;
  const srcHint = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // 双录独立硬编码对账（r49 新文案）
                  CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                  CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                  CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                  GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                  GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                  nextHint(4) === SPEC_CHAPTER_HINTS[1] && nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                  nextHint(14) === SPEC_CHAPTER_HINTS[3] && nextHint(19) === SPEC_CHAPTER_HINTS[4] &&   // 章末关 ci<4 → CHAPTERS[ci+1].hint
                  nextHint(20) === GEN_HINTS[genLevel(21).dch - 1] &&
                  [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算（b35 m5 范式）
  const srcSpeed = SPEED === 0.12;                       // verify 提速
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ && srcK && srcDir && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, dir: srcDir, hints: srcHint };

  /* ---- ⑩ confirmChain：确认链构成（__lastQueue===['etm_right'] 单 clip；题面情境句走
       voice.play 不动 __lastQueue） ---- */
  total++;
  startLevel(20);
  await unlocked();
  const q10 = window.ETM.quiz;
  const goodI10 = deriveAnswerV(q10);
  const h0 = window.__queueHist.length;      // 订阅起点
  const r10 = await window.ETM.tapPick(goodI10);
  const LQ = window.__lastQueue;
  const chainOk10 = r10 === 'picked' &&
                    LQ && LQ.length === 1 && LQ[0] === 'etm_right' &&        // 确认链=right 单 clip
                    JSON.stringify(LQ) === JSON.stringify(['etm_right']) &&
                    !keylessLast(LQ) &&                                     // 全 clip 无 keyless（契约 N）
                    window.__queueHist.slice(h0).some(h =>
                      h.length === 1 && h[0] === 'etm_right');
  if (chainOk10) npass++;
  units.confirmChain = { ok: chainOk10, r: r10,
                         queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑪ save：真实写档链（init etm→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__etmOrig.save, origPersist = window.__etmOrig.persist;
  const origLS = localStorage.getItem('kidsgame_etm');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_etm');
    KIDS.init({ game: 'etm', title: '表情温度计' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.ETM.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_etm');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'etm' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_etm');
  else localStorage.setItem('kidsgame_etm', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
       r49 flat0 教学锚保留实证：row0 花/face 族/4 项/盘序与 SPEC 期望一致） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'etm', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, etm: { tutSeen: true } };
  let q12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_etm', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__etmDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.ETM.start(0);
    await unlocked();
    q12 = window.ETM.quiz;
    realOk = state.tut === 'none' && window.__etmDemoR === null &&
             q12 && q12.scene === 'flower' && q12.kind === 'face' &&
             q12.picks.length === 4 && q12.step === 0 && q12.miss === 0 &&
             q12.say === SPEC_QUESTIONS[0].text &&
             q12.answer === deriveAnswerV(q12) &&        // answer 独立推导
             window.ETM.currentLevel.flat === 0 && window.ETM.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.ETM === 'object' && typeof window.ETM.tapPick === 'function' &&
             typeof window.ETM.autoSolve === 'function';        // b29 坑⑥：钩子真实页同暴露
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_etm');
    else localStorage.setItem('kidsgame_etm', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { scene: q12.scene, kind: q12.kind, n: q12.picks.length } };

  const out = { game: 'etm', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__etmVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史（r49 段一新键未注册=clip 落空，play 仍
     记录 key/text——题面锚不受注册状态影响）；voice.say 记录题面情境句
     （__lastSayText）；voice.queue 记录拼播链（__lastQueue+__queueHist 全史） */
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
