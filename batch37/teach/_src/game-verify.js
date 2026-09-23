/* ================= ?verify=1 自检（仅 verify 分支加载执行）——13 单元（r5 难度改造版）
   ① structure：碗/托盘/兔子 SVG+任务句 DOM===SPEC 复算+托盘渲染（n<10 单颗 n+2/
      n≥10 逐个档 .sm 或组块）+诊断 4 卡双录+NUMCN 2-20 全量 19 值+DOM 无 undefined
      +clips 9 条（tch_ 6+core 3）全注入+实长辨别（±60ms）+双 viewport（1280×800/
      800×1180）×（flat0 ch1/flat10 ch3 大数/flat15 ch4）布局（诊断 4 卡 ≥96×96
      两两 bbox 严格不相交+tray/fixcards 行不相交+托盘苹果 ≥44/组块 ≥64×64+
      描边对比度 ≥3:1+overflowX ≤0）+契约 O
   ② tutorial：教学三段（watch 完整三步 N=4/skip 缺3 演示→__tchDemoR='done'+watch 段
      实测 ≤22000；turn N=5/dup 重3 首题形态断言；示范步起帮→整题走完 __tchTutSolo
      +进正式关 flat=0）
   ③ drive：flat0-19 逐关驱动+RNG 副本独立复算（mulberry32(flat*7919+747) 题序连取
      每题 N→复现位→etype→errAt→errAt2→4 卡洗牌）+确定性+章映射+引擎直驱三步全返回值
      +全关 3 星+autoSolve（UI 路径 flat0 通关 taps=Σ(n+1)）
   ④ frameM（契约 M 帧内容三层）：phase 真值序 show→rabbit→fix+示范碗苹果 DOM
      计数===quiz.bowl+序号徽章 .num===1..bowl+学习碗 DOM===quiz.m 且 .num 序列===
      quiz.seq（读过程锚）+诊断 4 卡 label 双录+修正演出三分支（skip/swap 重渲 1..n
      .fixed 在场/dup away 后非 away===n）+学会 hop；flat 按 SPEC 副本挑选覆盖
      skip/dup/swap 三型（分支真实可达——r4 M-3 教训）
   ⑤ wrongPath：tapFix 非 fix 相位 null（phase 吞输入）+tapApple 碗满 false+fix
      错卡 wrong+miss+错链 [tch_wrong,tch_hint] 全 clip；豁免窗（真时钟 4866）内
      二击吞 false 且 miss 不变；窗后第二错照计 miss=2；miss≥2 好卡 breathe；
      窗内好卡放行（下一题验证——豁免窗不拦对选）
   ⑥ prior：先验专项 20 关（N 域按 dch 章域/etype 按章池/errAt 按型域/seq 构造同构/
      m=n∓1|n 按型/4 卡恰一张 good+**卡语义真假独立验证器**（label→描述真假应与 good
      全等——从 SPEC 语义推导非从实现归纳）/同型干扰参数≠errAt/唯一解锚 answer 推导）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（verify 独立重写 rng 取第一
      个随机数）+四档全现+域全档成立+混合多样+确定性（同 flat 两次 JSON 一致）+引擎直驱
   ⑨ windows+contract：窗静态断言（WRONG_CHAIN_WIN===4866/CONFIRM_WIN===3420 精确/
      任务句窗下限 4005=estMs(9 字)+300+动态式 max(TASK_SAY_MIN,estMs)+300 在场/
      按群引导句窗 5040=estMs(12 字)+300/兔子句窗 3660/兔子步重叠式 max(3360,m×250)
      在场/celebrate 2620+800≥3420）+契约 A/B/C/D/E/F/I/J/K 源码断言（读 script[2]
      纯 data+engine+main——b36 M1 恢复判别力；字面逐条与 main 真源核对）+r5 新契约
      字面（uiSetGroup/engResetBowl/mhits/sv.teach.hits/addGroupTo/groupTTS/renderGroupBar/
      fixRep）+NUMCN 19 值/CHAPTERS/GEN_HINTS 双录+nextHint 数值断言（4/9/14/19+24/29/34/39 实算）
   ⑩ chains：确认链 ['tch_right'] 单 clip 全 clip（无 keyless——契约 N）；任务句/
      兔子句=T46 全句 clip（__lastVoiceKey/Text 三态断言：开题=任务句、兔子步=
      兔子句、纠错对=不变）
   ⑪ save：真实写档链（init teach→autoSolve 通关→localStorage kidsgame_teach
      v:'1.0' levels['1-0'] 更新+r5 教到会 hits/mastered 写档——5 题全首选对
      hits.skip===5 且 mastered.skip===true）；origLS 模式：测前保存、测后恢复（b34 坑②）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E 行为
      分流）+quiz 形态（n/etype/errAt/seq=RNG 副本复算/phase show/bowl 0/group 1/
      answer 独立推导）+window.TCH 真实页暴露（b29 坑⑥）；origLS+try/finally（b36 m4）
   ⑬ lifecycle（r5 教到会+按群+两读法分叉）：(a) swap 两读法分叉——swap 题 m===n
      数量读法必失效（「多/少」比较式给不出答案）且序列含降序对+无错卡在场为干扰；
      (b) 同型干扰分叉——好卡与同型干扰卡 parse 后 kind 同 x 异（视觉匹配失效证明）；
      (c) 复现语义——池化存在 repeat 题且 etype===前题+fixRep 相位句文案断言；
      (d) mhits 生命周期——引擎直驱错→对（断连续清 0）→对（1）→对（2 两轮达成）+
      TCH.mastered 快照；(e) 按群交互——setGroup 无效值 null/小数 null/切换 'reset'
      碗清零+托盘重渲（组块数=ceil(n/g)）/组 tap 'group'+bowl 按组跳+组末计数 say
      （T46 __lastVoiceKey='tch_n_N'+文本=NUMCN[累计]+'个'）/组模式 fillBowl 到 fix
   驱动纪律：演出窗吞 null → driveTap 轮询重试带 300ms 间隔（b34 坑④）；相位门驱动
   （tapFix 前须 phase=='fix'）；组感知 fillBowl（n≥10 先 setGroup(5)——autoSolve
   优等生路径同款）。
   结果写 #verify-result + window.__tchVlog + document.title='VERIFY PASS n/n' /
   'VERIFY FAIL n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH37 §0.90/§3/§4 + §6 r5 文字独立重列（禁抄页面 NUMCN/VOICE/常量） */
  const SPEC_DUR = { tch_tut_watch: 2832, tch_tut_turn: 1752, tch_task: 2160,
                     tch_hint: 2352, tch_right: 3120, tch_wrong: 2064 };
  /* T46 化（2026-09-19）：全句 clip 实长独立副本（verify 自持；build python 同值双录） */
  const SPEC_TCH_TASK = { 2: 2760, 3: 2808, 4: 2736, 5: 2688, 6: 2952, 7: 2760, 8: 2976, 9: 2688, 10: 2712, 11: 3096, 12: 3000, 13: 3072, 14: 3072, 15: 3024, 16: 3048, 17: 3072, 18: 3072, 19: 3096, 20: 3096 };
  const SPEC_TCH_N = { 2: 1368, 3: 1392, 4: 1416, 5: 1320, 6: 1368, 7: 1368, 8: 1320, 9: 1344, 10: 1464, 11: 1560, 12: 1536, 13: 1632, 14: 1632, 15: 1584, 16: 1632, 17: 1632, 18: 1584, 19: 1584, 20: 1536 };
  const SPEC_TCH_GM = { 1: 1824, 2: 1848, 5: 1776 };
  const SPEC_TCH_MISC = { tch_ghint: 3120, tch_rabbit: 2592 };
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_NUMCN = { 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九',
                       10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
                       16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十' };   // 契约 L 全量 19 值
  const SPEC_NDOM = { 1: [4, 9], 2: [4, 9], 3: [10, 20], 4: [6, 20] };                // r5 章 N 域
  const SPEC_EPOOL = { 1: ['skip'], 2: ['dup', 'swap'], 3: ['skip', 'dup', 'swap'],
                       4: ['skip', 'dup', 'swap'] };                                   // r5 章错误型池
  const SPEC_ERR_LO = { skip: 2, dup: 2, swap: 1 };                                    // 错误参数域下界
  const SPEC_ERR_OFF = { skip: -1, dup: -1, swap: -1 };                                // 上界=n+off
  const SPEC_CROSS = { skip: 'dup', dup: 'skip', swap: 'dup' };                        // 异型干扰映射
  const SPEC_CHAPTER_HINTS = { 1: '兔子还会犯别的错', 2: '大数字来啦，几个几个数',
                               3: '各种错混着来，大挑战', 4: '新的小课要开始啦' };
  const SPEC_GEN_HINTS = ['漏数先教一教', '重复换序教一教', '大数按群教一教', '各种错都要教'];
  const SPEC_TASK_9 = '教小兔子数二个苹果';        // 任务句 9 字锚（教学关 N=2 极值——estMs 3705）
  const SPEC_GROUP_12 = '大数字，可以几个几个数哦';  // r5 按群引导句 12 字含标点（estMs 4740）
  const SPEC_RABBIT_8 = '兔子说：我来试试';        // 兔子句 8 字含冒号（estMs 3360）
  const SPEC_FIXREP = '又犯了老毛病，帮它找出来';  // r5 复现题相位句
  const SPEC_TUT = { watch: { n: 4, etype: 'skip', errAt: 3, m: 3 },
                     turn: { n: 5, etype: 'dup', errAt: 3, m: 6 } };   // r5 教学迷你关锚
  const estMs = s => s.length * 345 + 600;         // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* 独立 rng（SPEC §6 r5 取数序：seed=flat*7919+747，dch（仅 flat≥20）=第一个随机数，
     题序连取每题：N=ri(rnd,dom) → [i>0: rep=rnd()<0.45 命中则复现前题型不消耗池随机数]
     → etype=池[floor(rnd()*len)] → errAt=ri(rnd,域) → errAt2=域内排除 errAt 取
     → 4 卡 Fisher-Yates 洗牌 3 次 rnd） */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const riV = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  function riExclV(rnd, lo, hi, excl) {           // [lo,hi] 排除 excl（域 ≥2 恒非空）
    const span = hi - lo + 1;
    const k = Math.floor(rnd() * (span - 1));
    return lo + k + (k >= excl - lo ? 1 : 0);
  }
  /* 序列构造副本（SPEC §6 r5：skip 去数/dup 插重/swap 相邻交换） */
  function mkSeqV(n, etype, errAt) {
    const s = [];
    for (let k = 1; k <= n; k++) {
      if (etype === 'skip' && k === errAt) continue;
      s.push(k);
      if (etype === 'dup' && k === errAt) s.push(k);
    }
    if (etype === 'swap') {
      const i = s.indexOf(errAt);
      s[i] = errAt + 1; s[i + 1] = errAt;
    }
    return s;
  }
  /* 卡 label 生成副本（SPEC §6 r5 封闭表） */
  function cardLabelV(kind, x) {
    return kind === 'skip' ? '漏数了' + x : kind === 'dup' ? x + '数了两遍' :
           kind === 'swap' ? x + '和' + (x + 1) + '数反了' : '它数对啦';
  }
  function mkCardsV(etype, errAt, errAt2, rnd) {  // 4 卡+洗牌（消耗 3 次 rnd——副本取数序一致）
    const arr = [
      { good: true,  label: cardLabelV(etype, errAt) },
      { good: false, label: cardLabelV(etype, errAt2) },
      { good: false, label: cardLabelV(SPEC_CROSS[etype], errAt2) },
      { good: false, label: '它数对啦' }
    ];
    for (let i = 3; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  /* 第 qi 题独立复算（与页面取数序严格同构的副本——含洗牌消耗） */
  function expQuiz(flat, qi) {
    const rnd = mulberry32V(flat * 7919 + 747);
    const ch = Math.floor(flat / 5) + 1;
    const dch = flat < 20 ? ((ch - 1) % 4 + 1) : riV(rnd, 1, 4);
    const dom = SPEC_NDOM[dch], pool = SPEC_EPOOL[dch];
    let prev = null, out = null;
    for (let k = 0; k <= qi; k++) {
      const n = riV(rnd, dom[0], dom[1]);
      let etype, repeat = false;
      if (k > 0 && rnd() < 0.45) { etype = prev; repeat = true; }
      else etype = pool[Math.floor(rnd() * pool.length)];
      const errAt = riV(rnd, SPEC_ERR_LO[etype], n + SPEC_ERR_OFF[etype]);
      const errAt2 = riExclV(rnd, SPEC_ERR_LO[etype], n + SPEC_ERR_OFF[etype], errAt);
      const cards = mkCardsV(etype, errAt, errAt2, rnd);
      prev = etype;
      out = { dch: dch, n: n, etype: etype, errAt: errAt, errAt2: errAt2, repeat: repeat,
              seq: mkSeqV(n, etype, errAt), m: (etype === 'skip' ? n - 1 : etype === 'dup' ? n + 1 : n),
              cards: cards, answer: cards.findIndex(c => c.good) };
    }
    return out;
  }
  const deriveAnswerV = q => q.cards.findIndex(c => c.good);   // 唯一解锚独立推导
  const deriveTaskV = q => '教小兔子数' + SPEC_NUMCN[q.n] + '个苹果';
  /* 卡语义真假独立验证器（⑥/⑬ 用——从 SPEC 语义推导，非从实现归纳）：
     「漏数了X」真 ⟺ X∉seq；「X数了两遍」真 ⟺ seq 中 X 出现 ≥2；
     「X和Y数反了」真 ⟺ X,Y 都在场且 X 的下标 > Y 的下标（相邻对）；「它数对啦」真 ⟺
     seq===1..n 严格完整递增 */
  function parseCard(label) {
    let m = label.match(/^漏数了(\d+)$/);
    if (m) return { kind: 'skip', x: +m[1] };
    m = label.match(/^(\d+)数了两遍$/);
    if (m) return { kind: 'dup', x: +m[1] };
    m = label.match(/^(\d+)和(\d+)数反了$/);
    if (m) return { kind: 'swap', x: +m[1], y: +m[2] };
    if (label === '它数对啦') return { kind: 'none' };
    return null;
  }
  function cardTruth(p, seq) {
    if (!p) return null;
    if (p.kind === 'skip') return seq.indexOf(p.x) < 0;
    if (p.kind === 'dup') return seq.filter(v => v === p.x).length >= 2;
    if (p.kind === 'swap') {
      const ix = seq.indexOf(p.x), iy = seq.indexOf(p.y);
      return ix >= 0 && iy >= 0 && ix > iy;
    }
    return seq.every((v, i) => v === i + 1);      // none：序列严格 1..n
  }
  const unlocked = async () => {                   // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const driveTap = async (fn, timeoutMs) => {      // 演出窗吞 null → 300ms 间隔轮询重试（b34 坑④：禁零间隔连打）
    const t0 = Date.now(); let r = null;
    while (Date.now() - t0 < (timeoutMs || 20000)) {
      r = await fn();
      if (r !== null && r !== undefined) return r;
      await wait(300);
    }
    return r;
  };
  const phaseReady = async want => {               // 相位门驱动：tapFix 前须 phase=='fix'
    let wg = 0;
    while (wg++ < 500) {
      const q = window.TCH.quiz;
      if (q && q.phase === want && !state.locked && !state.demo && Date.now() >= (state.showUntil || 0)) return true;
      await wait(300);
    }
    return false;
  };
  const teachDots = () => document.querySelectorAll('#teach-dots .apple').length;
  const learnDotsAll = () => document.querySelectorAll('#learn-dots .apple').length;
  const learnDotsN = () => document.querySelectorAll('#learn-dots .apple:not(.away)').length;
  const teachNums = () => Array.from(document.querySelectorAll('#teach-dots .apple .num')).map(e => +e.textContent);
  const learnNums = () => Array.from(document.querySelectorAll('#learn-dots .apple .num')).map(e => +e.textContent);
  /* 引擎直驱一关（副本对账+碗满转 rabbit+演出毕转 fix+好卡通关=3★） */
  function driveLevelEngine(L, flat) {
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const e = expQuiz(flat, k);
      if (q.n !== e.n || q.etype !== e.etype || q.errAt !== e.errAt ||
          JSON.stringify(q.seq) !== JSON.stringify(e.seq) || q.m !== e.m || q.repeat !== e.repeat) return false;   // 副本对账
      const trayN = q.n + 2;                        // 托盘 N+2 颗（引擎层恒逐个驱动）
      for (let a = 0; a < q.n; a++) {
        if (engTapApple(L, a, trayN) !== (a === q.n - 1 ? 'confirmed' : 'in')) return false;
      }
      if (engTapApple(L, 0, trayN) !== null) return false;   // 碗满（phase 已 rabbit）→null（core 层）
      if (!engRabbitDone(L)) return false;                   // 兔子步演出结束→fix
      const ans = deriveAnswerV(q);                          // verify 独立推导好卡
      const r = engTapFix(L, ans);
      if (r !== (k === L.quizzes.length - 1 ? 'done' : 'right')) return false;
    }
    return L.done && L.step === 5 && L.retries === 0 && engStars(L) === 3;
  }
  /* UI 路径点满示范碗（driveTap 轮询；r5 组感知：n≥10 先 setGroup(5)——autoSolve
     优等生路径同款）→ confirmed → 等 fix 相位 */
  async function fillBowl() {
    let q0 = window.TCH.quiz;
    if (q0 && q0.n >= 10 && q0.group === 1) {
      await driveTap(() => window.TCH.setGroup(5));
    }
    let wg = 0;
    while (wg++ < 80) {
      const q = window.TCH.quiz;
      if (!q || q.phase !== 'show') break;
      const idx = q.group > 1 ? Math.floor(q.bowl / q.group) : q.bowl;
      const r = await driveTap(() => window.TCH.tapApple(idx));
      if (r === 'confirmed') break;
      if (r === null && wg > 60) break;
    }
    return phaseReady('fix');
  }

  /* ---- ① structure：SVG/任务句/托盘/卡双录+NUMCN+clips+三 viewport×三 flat 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.TCH.quiz;
  const e0 = expQuiz(0, 0);
  /* 三碗/兔子/托盘 DOM：碗 SVG×2+兔子 SVG+logo+托盘渲染（ch1 n<10 单颗 n+2） */
  const domOk = !!q1 &&
    !!document.querySelector('#teach-bowl svg') && !!document.querySelector('#learn-bowl svg') &&
    !!document.querySelector('#rabbit-body svg') && !!document.querySelector('#logo svg') &&
    document.querySelectorAll('#tray .t-apple').length === e0.n + 2 &&
    Array.from(document.querySelectorAll('#tray .t-apple')).every((b, i) => b.tagName === 'BUTTON' && Number(b.dataset.apple) === i) &&
    document.querySelectorAll('#teach-dots .apple').length === 0 &&
    document.querySelectorAll('#learn-dots .apple').length === 0 &&
    document.getElementById('q-text').textContent === deriveTaskV(q1) &&
    !!document.querySelector('#rabbit-say') &&
    document.getElementById('groupbar').classList.contains('off');   /* 小数无策略条 */
  /* 诊断 4 卡双录：4 卡 data-fix 0-3 + label 与 SPEC 副本全等（off 态只隐不删可量） */
  const fxDoms = Array.from(document.querySelectorAll('#fixcards .fixcard'));
  const fxOk = fxDoms.length === 4 &&
    fxDoms.every((b, i) => b.dataset.fix === String(i) &&
      b.querySelector('.fx-label').textContent === e0.cards[i].label);
  const cleanDom = !document.body.innerText.match(/undefined|NaN|\bnull\b/);
  /* NUMCN 2-20 全量 19 值（契约 L） */
  const numcnOk = Object.keys(NUMCN).length === 19 &&
    Array.from({ length: 19 }, (_, i) => i + 2).every(i => NUMCN[i] === SPEC_NUMCN[i]);
  /* clips：tch_ 6+core 3 全注入+tch 实长辨别（±60ms；core 3 条只验在场） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR).concat(Object.keys(SPEC_TCH_TASK).map(n => 'tch_task_' + n))
    .concat(Object.keys(SPEC_TCH_N).map(n => 'tch_n_' + n))
    .concat(Object.keys(SPEC_TCH_GM).map(g => 'tch_gm_' + g))
    .concat(Object.keys(SPEC_TCH_MISC));
  const preOk = keysAll.length === 52 &&
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const specDurOf = k => { const m = /^tch_(task|n|gm)_(\w+)$/.exec(k);
    if (!m) return SPEC_DUR[k] != null ? SPEC_DUR[k] : SPEC_TCH_MISC[k];
    if (m[1] === 'task') return SPEC_TCH_TASK[m[2]];
    if (m[1] === 'n') return SPEC_TCH_N[m[2]];
    return SPEC_TCH_GM[m[2]]; };
  const durOk = durs.every((d, i) => Math.abs(d - specDurOf(specKeys[i])) <= 60);
  /* 布局：双 viewport ×（flat0 ch1/flat10 ch3 大数/flat15 ch4 混合）——诊断 4 卡
     ≥96×96 且两两 bbox 严格不相交+tray/fixcards 行不相交+托盘苹果 ≥44（大数缩档）/
     组块 ≥64×64+对比度 ≥3+overflowX ≤0（bbox 实测定案——静态推算临界交叠零容忍） */
  function lum(hexStr) {
    const m = hexStr.match(/#?([0-9a-f]{6})/i);
    if (!m) return null;
    const n = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
  }
  const ratioOf = (a, b) => { const x = lum(a), y = lum(b);
    return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const rectOverlap = (a, b) => {                    // 严格相交面积>0（贴边不算交叠）
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  };
  function simView(w, h, flat) {
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    const cards = Array.from(document.querySelectorAll('#fixcards .fixcard'));
    const apples = Array.from(document.querySelectorAll('#tray .t-apple'));
    const groups = Array.from(document.querySelectorAll('#tray .t-group'));
    const qv = window.TCH.quiz;
    const expApples = qv ? qv.n + 2 : 0;   /* 开题默认逐个档（group=1）：托盘恒 n+2（大数 .sm wrap） */
    const cardOk = cards.length === 4 && cards.every(c => c.offsetWidth >= 96 && c.offsetHeight >= 96);
    let pairBad = 0;
    for (let i = 0; i < cards.length; i++)
      for (let j = i + 1; j < cards.length; j++)
        if (rectOverlap(cards[i].getBoundingClientRect(), cards[j].getBoundingClientRect()) > 0) pairBad++;
    const rowsOk = rectOverlap(document.getElementById('tray').getBoundingClientRect(),
                               document.getElementById('fixcards').getBoundingClientRect()) === 0;
    const appleOk = apples.length > 0 && apples.every(a => a.offsetWidth >= 44 && a.offsetHeight >= 44) &&
                    (qv && qv.n < 10 ? apples.every(a => a.offsetWidth >= 56)
                                     : apples.length === expApples);
    const groupOk = groups.length === 0 || groups.every(b => b.offsetWidth >= 64 && b.offsetHeight >= 64);
    const sceneOk = document.getElementById('scene').offsetWidth >= 64 &&
                    document.getElementById('scene').offsetHeight >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, n: qv && qv.n, cardOk: cardOk, pairBad: pairBad,
             rowsOk: rowsOk, appleOk: appleOk, groupOk: groupOk,
             sceneOk: sceneOk, contrast: cB, ox: ox,
             pass: cardOk && pairBad === 0 && rowsOk && appleOk && groupOk && sceneOk && cB && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10, 15]) {
    sims.push(simView(1280, 800, flat));
    sims.push(simView(800, 1180, flat));
  }
  const g0 = document.getElementById('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);
  const layoutOk = sims.every(s => s.pass);
  /* 契约 O：款内自建 button 显式 color（computed=INK 暖棕，不依赖 core 兜底） */
  const oOk = getComputedStyle(document.querySelector('#tray .t-apple')).color === 'rgb(74, 59, 46)';
  const s1ok = domOk && fxOk && cleanDom && numcnOk && preOk && durOk && layoutOk && oOk;
  if (s1ok) npass++;
  units.structure = { ok: s1ok, dom: domOk, fx: fxOk, clean: cleanDom, numcn: numcnOk,
                      clips: preOk, dur: durOk, layout: layoutOk, o: oOk,
                      sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（watch 完整三步 → turn 帮→独 → 正式关） ---- */
  total++;
  window.__tchOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__tchTutSolo = false;
  window.__tchDemoR = null;
  startLevel(0);
  await tutorialWatch();
  const twWatch = (window.__tchWatchMs || 1e9) / SPEED;        // watch 段实测折算（真实页 ≤22000 严格——P2 断言）
  const tq = window.TCH.quiz;
  const tutHelp = window.__tchDemoR === 'done' && state.tut === 'help' &&
                window.TCH.currentLevel.flat === -1 &&
                tq && tq.n === SPEC_TUT.turn.n && tq.etype === SPEC_TUT.turn.etype &&
                tq.errAt === SPEC_TUT.turn.errAt && tq.m === SPEC_TUT.turn.m &&
                JSON.stringify(tq.seq) === JSON.stringify(mkSeqV(5, 'dup', 3)) &&
                tq.phase === 'show' && tq.bowl === 0 && tq.step === 0 && tq.repeat === false &&
                tq.answer === 0 && tq.cards[0].label === '3数了两遍' &&   // r5 教学关卡序固定不洗牌：卡 0=正确「3数了两遍」
                /* SPEED 折算容差：verify 页 100ms 轮询步进+setTimeout clamp 不随 SPEED
                   缩放，折算名义值固有 +2s 级噪声（真实页实测 ≤22000 由 P2 严格断言）；
                   分账名义 20677+容差 2500=23177 上界 */
                twWatch <= 22000 + 2500;
  await unlocked();
  /* turn 题三步走完（示范步起帮：ghost 已指托盘苹果；此处 UI 路径驱动 5 颗） */
  const turnTaps = [];
  for (let a = 0; a < SPEC_TUT.turn.n; a++) {
    turnTaps.push(await driveTap(() => window.TCH.tapApple(a)));
  }
  const tFixReady = await phaseReady('fix');
  const rT3 = await driveTap(() => window.TCH.tapFix(window.TCH.quiz.answer));   // 好卡=唯一 good
  const tutSolo = turnTaps[0] === 'in' && turnTaps.slice(0, 4).every(r => r === 'in') &&
                turnTaps[4] === 'confirmed' && tFixReady &&
                rT3 === 'done' &&
                window.__tchTutSolo === true &&
                window.TCH.currentLevel.flat === 0 && window.TCH.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__tchDemoR, tut: state.tut,
                     solo: window.__tchTutSolo, watchMs: Math.round(twWatch),
                     turns: turnTaps, fixR: rT3, helpForm: tutHelp };

  /* ---- ③ drive：flat0-19 逐关驱动+RNG 副本独立对账+确定性+章映射+引擎直驱 ---- */
  total++;
  const levelsRec = {};
  let badCase = null;
  let driveOkAll = true;
  for (let flat = 0; flat < 20; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    const expCh = Math.floor(flat / 5) + 1;
    const chOk = L1.ch === expCh;
    const dchOk = L1.dch === expCh;                       // 静态四档（flat0-19 dch=章号）
    let specOk = true;
    for (let k = 0; k < L1.quizzes.length && specOk; k++) {
      const q = L1.quizzes[k];
      const e = expQuiz(flat, k);                         // RNG 副本独立复算（r5 取数序全链）
      if (q.n !== e.n || q.etype !== e.etype || q.errAt !== e.errAt || q.repeat !== e.repeat ||
          JSON.stringify(q.seq) !== JSON.stringify(e.seq) || q.m !== e.m) {
        badCase = 'rng ' + flat + '/' + k; specOk = false; break;
      }
      if (JSON.stringify(q.cards.map(c => c.label)) !== JSON.stringify(e.cards.map(c => c.label)) ||
          answerOf(q) !== e.answer) {
        badCase = 'cards ' + flat + '/' + k; specOk = false; break;
      }
      const why = structPrior(q, L1.dch);
      if (why) { badCase = 'struct ' + flat + '/' + k + ':' + why; specOk = false; break; }
    }
    const engOk = driveLevelEngine(genLevel(flat), flat); // 引擎直驱三步+全关 3 星
    const ok = det && chOk && dchOk && specOk && engOk;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
    if (!ok) driveOkAll = false;
  }
  /* autoSolve（UI 路径 flat0 一轮）：done+taps=Σ(n+1)（ch1 n<10 恒逐个：n 颗+1 卡/题）+3★ */
  startLevel(0);
  await unlocked();
  const expTaps = genLevel(0).quizzes.reduce((s, q) => s + q.n + 1, 0);
  const a3 = await window.TCH.autoSolve();
  const autoOk = !!(a3.done && a3.taps === expTaps &&
                    window.TCH.currentLevel.stars === 3 && window.TCH.currentLevel.won);
  if (driveOkAll && autoOk) npass++;
  units.drive = { ok: driveOkAll && autoOk, bad: badCase, auto: autoOk,
                  expTaps: expTaps, gotTaps: a3.taps,
                  flats: Object.keys(levelsRec).filter(f => !levelsRec[f]) };

  /* ---- ④ frameM（契约 M：phase 序/碗苹果 DOM===bowl·m/序号徽章===seq/4 卡/修正三分支） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.TCH.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    const e = expQuiz(flat, 0);                       // RNG 副本独立复算首题
    const ph0 = q.phase;                              // 'show'
    const trayOk = document.querySelectorAll('#tray .t-apple').length === e.n + 2;
    const bowl0 = teachDots() === 0 && q.bowl === 0 && learnDotsAll() === 0;
    const rA1 = await driveTap(() => window.TCH.tapApple(0));   // 第 1 颗入碗
    const oneOk = rA1 === 'in' && window.TCH.quiz.bowl === 1 && teachDots() === 1 &&
                  JSON.stringify(teachNums()) === JSON.stringify([1]);   // 序号徽章=已数到 1
    /* 点满 → confirmed → rabbit → fix（兔子步演出；组感知 fillBowl——大数切 5 群） */
    let cf = null;
    if (q.n >= 10) {
      cf = await fillBowl();                          // 组路径（'group' 返回链在 ⑬ 专项）
    } else {
      let wg = 0;
      while (wg++ < 60) {
        const qq = window.TCH.quiz;
        if (!qq || qq.phase !== 'show') break;
        cf = await driveTap(() => window.TCH.tapApple(qq.bowl));
        if (cf === 'confirmed') break;
      }
    }
    const ph1 = window.TCH.quiz ? window.TCH.quiz.phase : '?';   // 'rabbit'（演出期）
    await phaseReady('fix');
    const qF = window.TCH.quiz;
    /* fix 相位帧：学习碗 DOM===quiz.m+序号徽章序列===quiz.seq（读过程锚）+4 卡在场 */
    const learnOk = qF && learnDotsAll() === qF.m && learnDotsAll() === e.m &&
                    JSON.stringify(learnNums()) === JSON.stringify(e.seq);
    const cardsDom = Array.from(document.querySelectorAll('#fixcards .fixcard'));
    const cardsOk = qF && cardsDom.length === 4 && !document.getElementById('fixcards').classList.contains('off') &&
      cardsDom.every((b, i) => b.querySelector('.fx-label').textContent === e.cards[i].label) &&
      qF.cards[qF.answer].good === true && qF.cards.filter(c => c.good).length === 1 &&
      qF.answer === deriveAnswerV(e);
    /* 好卡：tapFix 调用同步段即完成修正动画 DOM（dup away/重渲 .fixed+hop 均在首个
       await 前）——先发 promise 立即同步快照，再 await（resolve 后 presentQuiz 已清
       DOM 不可再测）；修正三分支按 etype 断言（skip/swap=重渲 1..n+.fixed/dup=away） */
    const pF = window.TCH.tapFix(deriveAnswerV(qF));
    let fixedOk;
    if (qF.etype === 'dup') {
      fixedOk = document.querySelectorAll('#learn-dots .apple.away').length === 1 &&
                learnDotsN() === e.n &&
                JSON.stringify(learnNums()) === JSON.stringify(e.seq);   // 拿走重复后序列不变（天然有序）
    } else {
      fixedOk = learnDotsAll() === e.n &&
                JSON.stringify(learnNums()) === JSON.stringify(Array.from({ length: e.n }, (_, i) => i + 1)) &&
                document.querySelectorAll('#learn-dots .apple.fixed').length >= 1;   // 补颗/换位颗高亮
    }
    const hopOk = document.getElementById('rabbit-wrap').classList.contains('hop');
    const rF = await pF;
    const seq = [ph0, ph1, 'fix'].join('>');
    const seqOk = seq === 'show>rabbit>fix';
    return { ok: trayOk && bowl0 && oneOk && !!cf && learnOk && cardsOk && rF === 'right' &&
                 fixedOk && hopOk && seqOk,
             etype: e.etype, flat: flat,
             why: JSON.stringify({ trayOk: trayOk, bowl0: bowl0, oneOk: oneOk, cf: cf,
                                   learnOk: learnOk, cardsOk: cardsOk, rF: rF,
                                   fixedOk: fixedOk, hopOk: hopOk, seq: seq }) };
  }
  /* 三型分支覆盖：按 SPEC 副本挑选题 0 恰为各型的 flat（分支真实可达——r4 M-3 教训） */
  const flatOf = {};
  for (let f = 0; f < 20 && Object.keys(flatOf).length < 3; f++) {
    const et = expQuiz(f, 0).etype;
    if (!(et in flatOf)) flatOf[et] = f;
  }
  const fA = await frameCheck(flatOf.skip !== undefined ? flatOf.skip : 0);   // ch1 恒 skip（flat0 必中）
  const fB = await frameCheck(flatOf.dup !== undefined ? flatOf.dup : 6);
  const fC = await frameCheck(flatOf.swap !== undefined ? flatOf.swap : 5);
  const coverOk = [fA, fB, fC].every(fr => fr.etype) &&
                  new Set([fA.etype, fB.etype, fC.etype]).size === 3;
  const frameOk = fA.ok && fB.ok && fC.ok && coverOk;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, cover: coverOk, flatSkip: fA, flatDup: fB, flatSwap: fC };

  /* ---- ⑤ wrongPath：phase 吞输入+碗满 false+错卡 miss+豁免窗 4866 三语义+breathe ---- */
  total++;
  startLevel(0);
  await unlocked();
  /* show 相位 tapFix=null（b33 坑① phase 吞输入语义）；越界 tapApple=null */
  const fixNull = (await window.TCH.tapFix(0)) === null;
  const appleBad = (await window.TCH.tapApple(99)) === null;
  const fixBad = (await window.TCH.tapFix(4)) === null;          // r5 4 卡越界（i>3）
  /* 点满 → 碗满后 tapApple=false（吞输入轻叮——家族 D） */
  const fill0 = await fillBowl();
  const bowlFullFalse = fill0 && (await window.TCH.tapApple(0)) === false;
  /* fix 首错：错卡 wrong+miss=1+错链 [tch_wrong,tch_hint] 全 clip */
  const q5 = window.TCH.quiz;
  const badI = [0, 1, 2, 3].find(i => i !== deriveAnswerV(q5));
  let h0 = window.__queueHist.length;
  const pW = window.TCH.tapFix(badI);                         // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                        // 等摇头演出毕（locked=false）
  await unlocked();
  const chainW = window.__queueHist.slice(h0).some(h =>
                 h.length === 2 && h[0] === 'tch_wrong' && h[1] === 'tch_hint' &&
                 h.every(p => typeof p === 'string'));
  const miss1 = rW === 'wrong' && window.TCH.quiz.miss === 1;
  /* 豁免窗（真时钟 4866）内二击错卡=被吞 false（I 补：不计 miss） */
  const rejW = await window.TCH.tapFix(badI);
  const rejOk = rejW === false && window.TCH.quiz.miss === 1;
  await new Promise(w => setTimeout(w, 5400));                // 等豁免窗过——窗后二错照计
  const rD = await window.TCH.tapFix(badI);
  const miss2 = rD === 'wrong' && window.TCH.quiz.miss === 2;
  await unlocked();
  const okBreathe = document.querySelector('#fixcards .fixcard[data-fix="' + deriveAnswerV(q5) + '"]').classList.contains('breathe');
  const rG = await driveTap(() => window.TCH.tapFix(deriveAnswerV(q5)));   // 对选放行收尾
  /* 下一题：错卡 wrong（窗起）→窗内好卡放行（豁免窗不拦对选）。
     先等第一题第二错设置的豁免窗（真时钟 4866）过——否则第二题错卡被窗吞 false
     （全局窗跨题生效=契约 I 语义，非缺陷；此处测的是「窗内好卡放行」须自设新窗） */
  await new Promise(w => setTimeout(w, 5400));
  await phaseReady('show');
  await unlocked();
  const filled1 = await fillBowl();
  const q5b = window.TCH.quiz;
  const badIb = [0, 1, 2, 3].find(i => i !== deriveAnswerV(q5b));
  const rP = await window.TCH.tapFix(badIb);                  // wrong（miss=1，窗起播）
  await unlocked();
  const rQ = await driveTap(() => window.TCH.tapFix(deriveAnswerV(q5b)));  // 窗内好卡放行
  const wrongOk = fixNull && appleBad && fixBad && bowlFullFalse && miss1 && chainW && rejOk &&
                  miss2 && okBreathe && rG === 'right' && rP === 'wrong' && rQ === 'right';
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, fixNull: fixNull, appleBad: appleBad, fixBad: fixBad,
                      bowlFullFalse: bowlFullFalse, miss1: miss1, chain: chainW,
                      rejInWin: rejOk, miss2: miss2, breathe2: okBreathe,
                      right: rG, rP: rP, rQ: rQ,
                      winRight: rP === 'wrong' && rQ === 'right' };

  /* ---- ⑥ prior：先验专项 20 关（N 域/etype 域/errAt 域/seq 同构/m 按型/4 卡语义真假
     独立验证——SPEC §6 r5 验算；卡语义真假的期望从 SPEC 语义推导非从实现归纳） ---- */
  total++;
  const priorBad = [];
  const etypeCensus = { skip: 0, dup: 0, swap: 0 };
  const nCensus = {};
  const repCensus = { rep: 0, fresh: 0 };
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const e = expQuiz(flat, k);
      const dom = SPEC_NDOM[L.dch], pool = SPEC_EPOOL[L.dch];
      if (!(q.n >= dom[0] && q.n <= dom[1])) priorBad.push(flat + '/' + k + ':nDom ' + q.n);
      if (pool.indexOf(q.etype) < 0) priorBad.push(flat + '/' + k + ':etypeDom');
      if (q.etype !== e.etype || q.errAt !== e.errAt) priorBad.push(flat + '/' + k + ':rng');
      if (q.errAt < SPEC_ERR_LO[q.etype] || q.errAt > q.n + SPEC_ERR_OFF[q.etype]) priorBad.push(flat + '/' + k + ':errDom');
      if (JSON.stringify(q.seq) !== JSON.stringify(mkSeqV(q.n, q.etype, q.errAt))) priorBad.push(flat + '/' + k + ':seqCalc');
      if (q.m !== q.seq.length) priorBad.push(flat + '/' + k + ':mCalc');
      if (q.etype === 'skip' && q.m !== q.n - 1) priorBad.push(flat + '/' + k + ':mSkip');
      if (q.etype === 'dup' && q.m !== q.n + 1) priorBad.push(flat + '/' + k + ':mDup');
      if (q.etype === 'swap' && q.m !== q.n) priorBad.push(flat + '/' + k + ':mSwap');
      if (q.repeat !== (k > 0 && q.etype === L.quizzes[k - 1].etype && e.repeat)) priorBad.push(flat + '/' + k + ':rep');
      if (q.repeat && q.etype !== L.quizzes[k - 1].etype) priorBad.push(flat + '/' + k + ':repChain');
      /* 唯一解锚：恰一张 good+卡语义真假独立验证（每张卡 label→parse→truth 应与 good 全等） */
      if (q.cards.filter(c => c.good).length !== 1) priorBad.push(flat + '/' + k + ':good');
      const ansV = deriveAnswerV(q);
      if (q.answer !== undefined) priorBad.push(flat + '/' + k + ':quizAnswerLeak');    // quiz 对象无 answer 字段（钩子层推导）
      q.cards.forEach((c, ci) => {
        const p = parseCard(c.label);
        if (!p) { priorBad.push(flat + '/' + k + ':parse ' + c.label); return; }
        const truth = cardTruth(p, q.seq);
        if (truth !== c.good) priorBad.push(flat + '/' + k + ':truth' + ci);
        /* 同型干扰参数≠errAt（视觉匹配失效前提） */
        if (!c.good && p.kind === q.etype && p.x === q.errAt) priorBad.push(flat + '/' + k + ':nearDup');
      });
      if (q.cards[ansV].good !== true) priorBad.push(flat + '/' + k + ':ansMap');
      etypeCensus[q.etype]++;
      nCensus[q.n] = (nCensus[q.n] || 0) + 1;
      repCensus[q.repeat ? 'rep' : 'fresh']++;
    }
  }
  const etypeOk = etypeCensus.skip > 0 && etypeCensus.dup > 0 && etypeCensus.swap > 0;   // 三型全现（20 关池化）
  const nOk = Object.keys(nCensus).every(v => v >= 4 && v <= 20);   // N 域 4-20
  const repOk = repCensus.rep > 0 && repCensus.fresh > 0;           // 复现位双向都现
  const priorOk = priorBad.length === 0 && etypeOk && nOk && repOk;
  if (priorOk) npass++;
  units.prior = { ok: priorOk, bad: priorBad.slice(0, 6), etype: etypeCensus,
                  nDist: nCensus, rep: repCensus };

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

  /* ---- ⑧ gen：生成关 flat20+（dch 副本独立复算+四档全现+域成立+混合多样+确定性） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  const nByDch4 = {};
  for (let flat = 20; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 747);      // SPEC §6 r5：独立重写 rng
    const expDch = riV(rnd, 1, 4);                   // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    const L2 = genLevel(flat);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const e = expQuiz(flat, k);                    // 副本连取对账（含 dch/洗牌消耗一致）
      if (q.n !== e.n || q.etype !== e.etype || q.errAt !== e.errAt ||
          JSON.stringify(q.seq) !== JSON.stringify(e.seq) || q.m !== e.m) genBad.push(flat + '/' + k + ':rng');
      if (JSON.stringify(q.cards.map(c => c.label)) !== JSON.stringify(e.cards.map(c => c.label))) genBad.push(flat + '/' + k + ':cards');
      const why = structPrior(q, L.dch);
      if (why) { genBad.push(flat + '/' + k + ':struct ' + why); continue; }
      if (L.dch === 4) nByDch4[q.n] = 1;             // dch4 混合池
    }
    if (!driveLevelEngine(genLevel(flat), flat)) genBad.push(flat + ':drive');   // 引擎直驱
    genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);          // 四档全现（域全档成立型）
  const mixOk = Object.keys(nByDch4).length >= 2;                 // dch4 N 域混合（多样性）
  const genOk = genBad.length === 0 && distOk && mixOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 6), dist: genDch,
                mixN: Object.keys(nByDch4).map(Number).sort() };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §4/§6 实长表）+契约源码断言
     （读 script[2]=纯 data+engine+main——b36 M1 4 块布局恢复判别力；检索字面
     逐条与 main 真源核对，禁自造） ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = WRONG_CHAIN_WIN === 4866 &&                            // 错链豁免窗 ==精确
                4866 === D.tch_wrong + 150 + D.tch_hint + 300 &&       // 算式（SPEC §4）
                CONFIRM_WIN === 3420 &&                                // 判对窗=3120+300 精确（b37 裁决）
                3420 === D.tch_right + 300 &&
                TASK_CLIP_WIN === D.tch_task + 300 &&                  // 开题 clip 窗 2460
                TASK_SAY_MIN === estMs(SPEC_TASK_9) + 300 &&           // 任务句窗下限 9 字 3705+300=4005
                GROUP_SAY_WIN === estMs(SPEC_GROUP_12) + 300 &&        // r5 按群引导句 12 字 4740+300=5040
                RABBIT_SAY_WIN === estMs(SPEC_RABBIT_8) + 300 &&       // 兔子句 8 字 3360+300=3660
                Object.keys(SPEC_TCH_TASK).every(n => estMs('教小兔子数' + SPEC_NUMCN[n] + '个苹果') + 300 >= SPEC_TCH_TASK[n]) &&   // T46：19 句 clip 全 ≤ estMs+300（窗不动充分性）
                estMs(SPEC_GROUP_12) + 300 >= SPEC_TCH_MISC.tch_ghint &&   // T46：引导句 clip 3120 ≤ 窗 5040
                RABBIT_SAY_WIN >= SPEC_TCH_MISC.tch_rabbit + 300 &&      // T46：兔子句 clip 2592+300 ≤ 3660
                TUT_WATCH_WAIT >= D.tch_tut_watch + 300 &&
                TUT_TURN_WAIT >= D.tch_tut_turn + 300 &&
                (2620 + 800) >= D.tch_right + 300;                     // celebrate 层 2620+800=3420 ≥3420（家族 H）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'teach'") >= 0;               // C：本款存档键 kidsgame_teach
  const srcD = src.indexOf("replayAnim(sceneEl, 'bump')") >= 0;   // D：吞输入轻叮配 bump（碗满/吞点）
  const srcE = src.indexOf('sv.teach && sv.teach.tutSeen') >= 0;   // E：行为分流先查教学特例（freshTut 源码）
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（4 块布局下 script[2] 无 verify 自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== answerOf(q)') >= 0;   // I 补：guard 同构预判
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcStep = src.indexOf('step: cur.step') >= 0 &&                   // b33 硬性①：step=全关题号语义显式
                  src.indexOf('全关题号') >= 0;
  const srcN = src.indexOf("KIDS.voice.play(taskClipOf(q), taskTTS(q))") >= 0 &&   // N（T46）：任务句全句 clip play
               src.indexOf("KIDS.voice.play('tch_rabbit', rabbitTTS)") >= 0 &&   // T46：兔子句 clip
               src.indexOf('KIDS.voice.queue([VOICE.right.key])') >= 0;   // 确认链=right 单 clip（全 clip 无 keyless）
  const srcR5 = src.indexOf('function uiSetGroup(g)') >= 0 &&             // r5：策略切换入口
                src.indexOf('engResetBowl(cur)') >= 0 &&                  // r5：切组引擎层碗清零
                src.indexOf('Math.max(TASK_SAY_MIN, estMs(taskTTS(q)) + 300)') >= 0 &&   // r5：任务句动态窗式
                src.indexOf('Math.max(RABBIT_SAY_WIN, APPLE_POP_MS * q.m)') >= 0 &&     // r5：兔子步重叠式
                src.indexOf('addGroupTo(teachDotsEl') >= 0 &&             // r5：分组点亮
                src.indexOf('KIDS.voice.play(groupClipOf(q.bowl), groupTTS(q.bowl))') >= 0 &&   // T46：组末计数 clip
                src.indexOf('sv.teach.hits') >= 0 &&                      // r5：教到会写档
                src.indexOf("PHASE_TEXT[key]") >= 0 &&                    // r5：fixRep 相位句
                src.indexOf("L.mhits[q.etype] = 0") >= 0 &&               // r5：错选断连续（engine 在 script[2] 内）
                src.indexOf('renderGroupBar(q)') >= 0;                    // r5：策略条渲染
  const srcNumcn = Object.keys(NUMCN).length === 19 &&
                   Array.from({ length: 19 }, (_, i) => i + 2).every(i => NUMCN[i] === SPEC_NUMCN[i]);   // NUMCN 双录（契约 L 19 值）
  const srcHint = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // C7 独立硬编码对账
                  CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                  CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                  CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                  GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                  GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                  nextHint(4) === SPEC_CHAPTER_HINTS[1] && nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                  nextHint(14) === SPEC_CHAPTER_HINTS[3] && nextHint(19) === SPEC_CHAPTER_HINTS[4] &&
                  [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // F：实算
  const srcSpeed = SPEED === 0.12;                       // ⑯ verify 提速
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ &&
                     srcK && srcStep && srcN && srcR5 && srcNumcn && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE,
                    F: srcF, I: srcI, J: srcJ, K: srcK, step: srcStep, N: srcN, r5: srcR5,
                    numcn: srcNumcn, hints: srcHint };

  /* ---- ⑩ chains：确认链 ['tch_right'] 单 clip +keyless say 三态（任务句/兔子句/纠错不变） ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q10 = window.TCH.quiz;
  /* 开题任务句（T46：play 全句 clip——键+文本双对账） */
  const sayTask = window.__lastVoiceKey === 'tch_task_' + q10.n &&
                  window.__lastVoiceText === deriveTaskV(q10);
  const q10fix = await fillBowl();
  /* 兔子步=兔子句（T46：tch_rabbit clip） */
  const sayRabbit = q10fix && window.__lastVoiceKey === 'tch_rabbit' &&
                    window.__lastVoiceText === SPEC_RABBIT_8;
  await phaseReady('fix');
  h0 = window.__queueHist.length;
  const beforeSay = window.__lastSayText;    // T46：say 槽基线（纠错链零 keyless say——契约 N）
  const r10 = await driveTap(() => window.TCH.tapFix(deriveAnswerV(window.TCH.quiz)));
  const chainOk10 = r10 === 'right' && window.__queueHist.slice(h0).some(h =>
    h.length === 1 && h[0] === 'tch_right' &&
    h.every(p => typeof p === 'string'));
  /* 纠错对走 queue（right）非 say——say 槽恒不被写（T46 契约 N 零 keyless；
     注：__lastVoiceText 会被下一题 presentQuiz 开题 play 合法覆写，不作稳定性锚） */
  const sayStable = window.__lastSayText === beforeSay && beforeSay == null;
  const chainUnitOk = sayTask && sayRabbit && chainOk10 && sayStable;
  if (chainUnitOk) npass++;
  units.confirmChain = { ok: chainUnitOk, r: r10, sayTask: sayTask, sayRabbit: sayRabbit,
                         sayStable: sayStable,
                         queue: window.__lastQueue && window.__lastQueue.map(p =>
                           typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑪ save：真实写档链（init teach→autoSolve 通关→localStorage 更新+r5 hits 写档，测后还原） ---- */
  total++;
  const origSave = window.__tchOrig.save, origPersist = window.__tchOrig.persist;
  const origLS = localStorage.getItem('kidsgame_teach');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_teach');
    KIDS.init({ game: 'teach', title: '教会小兔子' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.TCH.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const expTaps11 = genLevel(0).quizzes.reduce((s, q) => s + q.n + 1, 0);
    const raw = localStorage.getItem('kidsgame_teach');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === expTaps11 && j && j.v === '1.0' && j.game === 'teach' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1 &&
                j.teach && j.teach.hits && j.teach.hits.skip === 5 &&   /* r5：5 题全首选对（ch1 全 skip） */
                j.teach.mastered && j.teach.mastered.skip === true);    /* r5：两轮达成（5>=2） */
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, exp: expTaps11,
                                               teach: j && j.teach, raw: raw && raw.slice(0, 260) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_teach');
  else localStorage.setItem('kidsgame_teach', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
     审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'teach', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, teach: { tutSeen: true } };
  let q12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_teach', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__tchDemoR = null;                      // 教学实证清零（非教学路径不应重设）
    const hookOk = typeof window.TCH === 'object' && typeof window.TCH.tapApple === 'function' &&
                   typeof window.TCH.tapFix === 'function' && typeof window.TCH.start === 'function' &&
                   typeof window.TCH.autoSolve === 'function' && typeof window.TCH.setGroup === 'function' &&
                   typeof window.TCH.mastered === 'object' &&                // r5：教到会钩子
                   !!window.TCH.currentLevel;                     // b29 坑⑥：真实页暴露
    window.TCH.start(0);
    await unlocked();
    q12 = window.TCH.quiz;
    const e12 = expQuiz(0, 0);                     // RNG 副本独立复算首题
    realOk = hookOk && state.tut === 'none' && window.__tchDemoR === null &&
             q12 && q12.n === e12.n && q12.etype === e12.etype && q12.errAt === e12.errAt &&
             JSON.stringify(q12.seq) === JSON.stringify(e12.seq) && q12.m === e12.m &&
             q12.phase === 'show' && q12.step === 0 && q12.miss === 0 && q12.bowl === 0 &&
             q12.group === 1 && q12.repeat === false &&
             q12.answer === deriveAnswerV(e12) &&
             document.getElementById('q-text').textContent === deriveTaskV(q12) &&
             window.TCH.currentLevel.flat === 0 && window.TCH.currentLevel.n === 5 &&
             window.TCH.mastered && window.TCH.mastered.skip === 0 &&      // r5：新关 mhits 归零
             (KIDS._save() || {}).v === '1.0';
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_teach');
    else localStorage.setItem('kidsgame_teach', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { n: q12.n, etype: q12.etype, m: q12.m, phase: q12.phase, answer: q12.answer } };

  /* ---- ⑬ lifecycle：r5 教到会两轮跟踪+按群交互+两读法分叉（新语义专项） ---- */
  total++;
  /* (a) swap 两读法分叉：swap 题 m===n——「多/少」数量读法给不出答案（旧二选一语义
     失效证明），序列含降序对（读过程才可判）且「它数对啦」恒为干扰在场 */
  let forkBad = [];
  let swapSeen = 0;
  for (let flat = 0; flat < 40 && swapSeen < 3; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length && swapSeen < 3; k++) {
      const q = L.quizzes[k];
      if (q.etype !== 'swap') continue;
      swapSeen++;
      if (q.m !== q.n) forkBad.push('swap m!=n ' + flat + '/' + k);
      const desc = q.seq.some((v, i) => i > 0 && v < q.seq[i - 1]);
      if (!desc) forkBad.push('swap seq 无降序对 ' + flat + '/' + k);
      if (!q.cards.some(c => !c.good && c.label === '它数对啦')) forkBad.push('swap 无错卡缺 ' + flat + '/' + k);
      const pNone = parseCard('它数对啦');
      if (cardTruth(pNone, q.seq) !== false) forkBad.push('swap none 卡语义为真 ' + flat + '/' + k);
    }
  }
  if (swapSeen === 0) forkBad.push('无 swap 题样本');
  /* (b) 同型干扰分叉：每题好卡与同型干扰卡 parse 后 kind 同 x 异——「漏数了4」vs
     「漏数了5」——视觉匹配失效须读序列定位 */
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const goodP = parseCard(q.cards[deriveAnswerV(q)].label);
      const near = q.cards.filter(c => !c.good).map(c => parseCard(c.label))
                     .find(p => p && p.kind === goodP.kind);
      if (!near) { forkBad.push('同型干扰缺 ' + flat + '/' + k); continue; }
      if (near.x === q.errAt) forkBad.push('同型干扰参数=真参 ' + flat + '/' + k);
    }
  }
  const forkOk = forkBad.length === 0;
  /* (c) 复现语义：repeat 题 etype===前题（池化已在 ⑥ 断言）；UI 相位句文案（fixRep） */
  setQText('fix', { repeat: true });
  const repTextOk = document.getElementById('q-text').textContent === SPEC_FIXREP;
  setQText('fix', { repeat: false });
  const freshTextOk = document.getElementById('q-text').textContent === '兔子摆对了吗？选一张帮帮它';
  /* (d) mhits 生命周期（引擎直驱 genLevel(0)=ch1 全 skip 连续同型链）：
     题 0 错→对（断连续清 0——_miss>0 不 ++）→题 1 对（1）→题 2 对（2 两轮达成） */
  const L13 = genLevel(0);
  const life = [];
  for (let k = 0; k < 3; k++) {
    const q = L13.quizzes[k];
    for (let a = 0; a < q.n; a++) engTapApple(L13, a, q.n + 2);
    engRabbitDone(L13);
    if (k === 0) {
      const badIdx = [0, 1, 2, 3].find(i => i !== deriveAnswerV(q));
      engTapFix(L13, badIdx);                     // 错选→mhits 清 0
      engTapFix(L13, deriveAnswerV(q));           // 对（但 _miss>0 不 ++）
    } else {
      engTapFix(L13, deriveAnswerV(q));           // 首选对→++
    }
    life.push(L13.mhits.skip);
  }
  const lifeOk = JSON.stringify(life) === JSON.stringify([0, 1, 2]);
  /* (e) 按群交互（flat10=ch3 大数）：setGroup 无效值/小数 null/切换 reset 碗清零+
     托盘重渲组块/组 tap 'group'+bowl 按组跳+组末计数 say/组模式到 fix */
  startLevel(10);
  await unlocked();
  const gq0 = window.TCH.quiz;
  const gBadN = (await window.TCH.setGroup(9)) === null;          // 非 GROUP_MODES 无效
  const gSame = (await window.TCH.setGroup(1)) === null;          // 同策略无效（默认 1）
  const rS5 = await driveTap(() => window.TCH.setGroup(5));
  const after5 = window.TCH.quiz;
  const blocks5 = document.querySelectorAll('#tray .t-group').length;
  const barActive5 = document.querySelector('#groupbar .gmode.active') &&
                     document.querySelector('#groupbar .gmode.active').dataset.g === '5';
  /* r5 审查 M-1：乱序点末块 take=块实际颗数（inBlock），非全局剩余——点 1 颗的
     末块飞 5 颗破坏碗点阵数感锚；空碗态点末块不触发 confirmed（bowl<n 恒成立） */
  const lastB = blocks5 - 1;
  const inBlockLast = Math.min(5, after5.n - lastB * 5);
  const bowlOO0 = window.TCH.quiz.bowl;
  const rOO = await driveTap(() => window.TCH.tapApple(lastB));
  const ooTake = window.TCH.quiz.bowl - bowlOO0;
  const ooOk = rOO === 'group' && ooTake === inBlockLast && window.TCH.quiz.bowl < after5.n;
  const rRs1 = await driveTap(() => window.TCH.setGroup(1));      // 双切恢复空碗组5态
  const rRs5 = await driveTap(() => window.TCH.setGroup(5));
  const ooReset = rRs1 === 'reset' && rRs5 === 'reset' && window.TCH.quiz.bowl === 0;
  const rG1 = await driveTap(() => window.TCH.tapApple(0));       // 第 1 组飞入
  const bowlAfterG1 = window.TCH.quiz.bowl;                       // tap 后重取（quiz getter=快照拷贝）
  const sayG1 = window.__lastVoiceKey === 'tch_n_' + Math.min(5, after5.n) &&
                 window.__lastVoiceText === SPEC_NUMCN[Math.min(5, after5.n)] + '个';   // 组末计数（T46：tch_n clip）
  const rG2 = await driveTap(() => window.TCH.tapApple(1));       // 第 2 组
  const grpDots = document.querySelectorAll('#teach-dots .grp').length;   // 分组点亮在场（重置前量——切组清碗）
  const rS2 = await driveTap(() => window.TCH.setGroup(2));       // 切 2 群=重置重数
  const after2 = window.TCH.quiz;
  const blocks2 = document.querySelectorAll('#tray .t-group').length;
  const trayReset = blocks2 === Math.ceil(after2.n / 2);
  /* 小数无策略条（flat0=ch1 n<10）：setGroup null+groupbar off */
  startLevel(0);
  await unlocked();
  const smallOk = (await window.TCH.setGroup(5)) === null &&
                  document.getElementById('groupbar').classList.contains('off');
  /* 组模式 fillBowl 到 fix（flat10 重开走完一题） */
  startLevel(10);
  await unlocked();
  const gFill = await fillBowl();                                  // 组感知（切 5 群驱动）
  const gFixOk = gFill && window.TCH.quiz.phase === 'fix' &&
                 learnDotsAll() === window.TCH.quiz.m;
  const grpOk = gBadN && gSame && rS5 === 'reset' && after5.group === 5 &&
                blocks5 === Math.ceil(after5.n / 5) && barActive5 &&
                rG1 === 'group' && bowlAfterG1 === Math.min(5, after5.n) && sayG1 &&
                rG2 === 'group' && rS2 === 'reset' && after2.bowl === 0 && after2.group === 2 &&
                trayReset && grpDots >= 1 && smallOk && gFixOk &&
                ooOk && ooReset;
  const life13Ok = forkOk && repTextOk && freshTextOk && lifeOk && grpOk;
  if (life13Ok) npass++;
  units.lifecycle = { ok: life13Ok, fork: forkOk, forkBad: forkBad.slice(0, 5),
                      swapSeen: swapSeen,
                      repText: repTextOk, freshText: freshTextOk,
                      mhitsLife: life, group: grpOk,
                      groupDetail: { rS5: rS5, blocks5: blocks5, rG1: rG1, rG2: rG2,
                                     rS2: rS2, bowl5: bowlAfterG1,
                                     sayG1: sayG1, small: smallOk, gFix: gFixOk,
                                     ooTake: ooTake, inBlockLast: inBlockLast,
                                     ooOk: ooOk, ooReset: ooReset } };

  const out = { game: 'teach', total: total, pass: npass, units: units };
  document.getElementById('verify-result').textContent = JSON.stringify(out);
  window.__tchVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total
                                     : 'VERIFY FAIL ' + npass + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史（T46 全句 clip 化——键/文本双锚
     ——任务句/兔子句/组末计数=题面 say 非队列链，不进 __lastQueue）；voice.queue 记录
     拼播链（__lastQueue+__queueHist 全史） */
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
