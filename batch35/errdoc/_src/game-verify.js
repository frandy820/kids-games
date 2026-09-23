/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元
   ① structure：题库 15 题双录对账（SPEC §4 全表硬编码进本页禁抄页面：shown 四元/
      errType/fix 逐字段+ch3 origA；ch1-3 各章 5 关同表同序 JSON 对账）+NUMCN 0-20
      全量 21 值+三部位 DOM（b/= 非按钮）+DOM 无 undefined+clips 12 条（ed_ 9+core 3）
      全注入+duration 辨别（±60ms）+双 viewport（1280×800/800×1180）×（flat0/flat10）
      布局（部位 ≥56×56、药卡 ≥72×60、描边对比度 ≥3:1、overflowX ≤0）+契约 O 显式 color
   ② tutorial：教学三段（watch 完整三步 13-5=9→__edDemoR='done'；turn 首题定制形态
      断言 shown 7+6=12/ans/fix13/phase spot；步1起帮→整题走完 __edTutSolo+进正式关
      flat=0 n=5；watch 段实测 ≤24000+容差（T46 clip 口径帽）
   ③ drive：flat0-19 逐关驱动+SPEC 独立对账（ch1-3 按 SPEC 表逐字段；ch4 及全部按
      构造公式独立复算 fix——num 型 reverseV(shown.a) 原式/op 型错符互换/ans 型原式
      直算，禁读 quiz.fix 当期望源——读表后等值对账）+引擎直驱三步全返回值+全关 3 星
   ④ frameM（契约 M 帧内容三层）：步1 病灶高亮 DOM===errType 映射部位（SPEC_LESION）
      /提示泡 num·op 型文案·ans 型无泡/步2 药卡 DOM 值===quiz.pills+选中断言
      （.ok+病历卡 cured 打勾+小兔子康复）/phase 序 spot→fix→why+ED.pills getter
      （fix 阶段显示序数值数组===DOM·fix 恰一张·indexOf(fx)===DOM 下标·spot/why null）
   ⑤ wrongPath：步1 点正常部位 wrong+miss+错链 [ed_wrong,ed_hint] 全 clip；豁免窗
      （真时钟 5274）内二击吞 false 且 miss 不变；窗后第二错照计 miss=2；步2 选错药
      wrong 照计 miss=3（契约 I 补）；对选恒放行收尾
   ⑥ gradient：首错=整卡 wiggle 方向级（病灶无 breathe）；miss≥2=步2 正确药卡
      breathe（答案级）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32(flat*7919+631)
      ——verify 独立复算第一个随机数==dch）+四档全现+ch4（dch4）三型全现+构造确定性
      （同 flat 两次 JSON 一致）+fix 独立复算+dch 域型一致+生成题不撞静态 sig（新式）
   ⑨ windows+contract：错链豁免窗 ==5274（≥5274）+确认链窗 ≥max(5697 SPEC 锚,
      T46 clip 口径：2232+750+段链 worst 7492+300=10146 ≤ CONFIRM_WIN 10200+spot 链 worst 6432 ≤6450+rx 窗 ≥2964+契约 A/B/C/
      E/F/I/I补/J/K/O 源码断言（读自身合并 script 文本）+章末 hint 独立硬编码对账
   ⑩ chains：链构成——确认链 [ed_right,ed_n_a,ed_op_*,ed_n_b,ed_s_eq,ed_n_fix]（T46 全键·NUMCN
      全式独立复算）/spot 链 num·op 型双段 vs ans 型单 clip（提示句独立复算）/rx 药方
      三选播对应 clip（tapWhy 0/1/2 → ed_rx_careful/calc/slow）
   ⑪ save：真实写档链（init errdoc→autoSolve 通关→winFlow verify 分支 persistWin→
      localStorage kidsgame_errdoc v:'1.0' levels['1-0'] 更新）；origLS 模式：测前
      保存 localStorage.getItem、测后恢复（b34 坑②，防毁真实玩家档）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E 行为分流
      +freshTut 分支源码）+quiz 形态（shown 13-5=9/ans/fix8/phase spot）+window.ED
      真实页暴露（b29 坑⑥）
   驱动纪律：演出窗吞 null → driveTap 轮询重试带 300ms 间隔（b34 坑④）；相位门驱动
   （tapFix 前须 phase=='fix'）。
   结果写 #verify-result + window.__edVlog + document.title='VERIFY PASS n/n' /
   'VERIFY FAIL n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH35 §0.87/§3/§4 文字独立重列（禁抄页面 QZ_BANK/NUMCN/VOICE/常量） */
  /* T46 化（2026-09-19）：段键实长独立副本（verify 自持；build python 同值双录） */
  const SPEC_ED_N = {0: 1128, 1: 1128, 2: 1176, 3: 1224, 4: 1224, 5: 1128, 6: 1152, 7: 1176,
                      8: 1152, 9: 1128, 10: 1248, 11: 1416, 12: 1368, 13: 1416, 14: 1440,
                      15: 1440, 16: 1464, 17: 1440, 18: 1392, 19: 1464, 20: 1416};   // dur json 实测（09-19）——worst 1464@16/19
  const SPEC_ED_OP = { add: 1152, sub: 1152, mul: 1152 };
  const SPEC_ED_SEG = { here: 1872, eq: 1320 };
  const SPEC_DUR = { ed_tut_watch: 3216, ed_tut_turn: 1680, ed_hint: 3168,
                     ed_right: 2232, ed_wrong: 1656, ed_spot: 2496,
                     ed_rx_careful: 2664, ed_rx_calc: 2400, ed_rx_slow: 2664 };
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  /* 静态 15 题全表（§4 照录）：rows=[a,op,b,r,fix,(num 型 origA)]；type=章错型 */
  const SPEC_BANK = {
    1: { type: 'ans', rows: [[13, '-', 5, 9, 8], [7, '+', 6, 12, 13], [15, '-', 8, 8, 7],
                             [9, '+', 9, 17, 18], [16, '-', 7, 10, 9]] },
    2: { type: 'ans', rows: [[3, '×', 4, 14, 12], [2, '×', 7, 12, 14], [4, '×', 4, 18, 16],
                             [5, '×', 3, 16, 15], [3, '×', 3, 8, 9]] },
    3: { type: 'num', rows: [[31, '-', 5, 26, 8, 13], [51, '+', 4, 55, 19, 15], [61, '-', 9, 52, 7, 16],
                             [21, '+', 6, 27, 18, 12], [31, '-', 9, 22, 4, 13]] }
  };
  const SPEC_NUMCN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
                      '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
  const SPEC_OP_WORD = { '+': '加', '-': '减', '×': '乘' };
  const SPEC_LESION = { ans: 2, num: 0, op: 1 };            // 病灶映射（§0.87 定版三部位）
  const SPEC_CHAPTER_HINTS = { 1: '乘法算式也生病啦', 2: '有的数字被抄错了',
                               3: '三种病混着来，大挑战', 4: '新的病历本来啦' };
  const SPEC_GEN_HINTS = ['加减答案找一找', '乘法答案找一找', '抄错的数字找一找', '三种病都要看'];
  const SPEC_TUT_ROW = [13, '-', 5, 9, 8];                  // watch 演示题 13-5=9→fix8
  const SPEC_TURN_ROW = [7, '+', 6, 12, 13];                // turn 帮→独题 7+6=12→fix13
  /* 独立推导（SPEC §0.87 错型定义——禁读页面 orig/fix 当期望源）：
     num=数字抄错（origA=reverseV(shown.a)）/op=符号看错（origOp=+/- 互换）/ans=原式直算 */
  const calcV = (a, op, b) => op === '+' ? a + b : (op === '-' ? a - b : a * b);
  const reverseV = n => (n % 10) * 10 + Math.floor(n / 10);
  const deriveFixV = q => q.errType === 'num' ? calcV(reverseV(q.shown.a), q.shown.op, q.shown.b)
                       : q.errType === 'op' ? calcV(q.shown.a, q.shown.op === '+' ? '-' : '+', q.shown.b)
                       : calcV(q.shown.a, q.shown.op, q.shown.b);
  const deriveOrigA = q => q.errType === 'num' ? reverseV(q.shown.a) : q.shown.a;
  const deriveOrigOp = q => q.errType === 'op' ? (q.shown.op === '+' ? '-' : '+') : q.shown.op;
  /* 静态 sig 集（生成题新式拒撞域——与页面 STATIC_SIGS 同规则独立重列） */
  const SPEC_STATIC_SIGS = { A: {}, M: {}, N: {} };
  for (let k = 0; k < 5; k++) {
    const r1 = SPEC_BANK[1].rows[k], r2 = SPEC_BANK[2].rows[k], r3 = SPEC_BANK[3].rows[k];
    SPEC_STATIC_SIGS.A[r1[0] + r1[1] + r1[2]] = 1;
    SPEC_STATIC_SIGS.M[r2[0] + '×' + r2[2]] = 1;
    SPEC_STATIC_SIGS.N[r3[0] + r3[1] + r3[2]] = 1;
  }
  /* 独立 rng（SPEC §0.87 生成关策略）：mulberry32(flat*7919+631)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
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
    while (wg++ < 400) {
      const q = window.ED.quiz;
      if (q && q.phase === want && !state.locked && !state.demo && Date.now() >= (state.showUntil || 0)) return true;
      await wait(300);
    }
    return false;
  };
  /* Mj-1 防回归（core voice.queue 弃尾语义）：key 空缺带 text 的 TTS 段播完即 return
     丢弃后续段——T46 化后全款零 keyless，断言器留作防回归 */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);
  const partBtnV = i => document.querySelector('#eq .part[data-part="' + i + '"]');
  const pillIdxByFix = fx => {                     // 药卡下标按 verify 独立 fix 从 DOM 解析（渲染即引擎）
    const bs = Array.from(document.querySelectorAll('#pills .pill'));
    for (let i = 0; i < bs.length; i++) if (Number(bs[i].textContent) === fx) return i;
    return -1;
  };
  /* 引擎直驱一关（fix 全部 verify 独立复算——禁读 q.fix 当期望源） */
  function driveLevelEngine(L) {
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const fx = deriveFixV(q);                    // 独立复算 fix（SPEC 公式）
      if (q.fix !== fx) return false;              // 等值对账（读表/公式后与页面值比对）
      if (q.errType === 'num' && q.shown.r !== calcV(q.shown.a, q.shown.op, q.shown.b)) return false;
      if (q.errType === 'op' && q.shown.r !== calcV(q.shown.a, q.shown.op, q.shown.b)) return false;
      if (engTapPart(L, SPEC_LESION[q.errType]) !== 'spot') return false;   // 病灶=verify 映射
      const pi = q.pills.indexOf(fx);              // 正确药卡下标按独立 fix 解析
      if (pi < 0 || engTapFix(L, pi) !== 'fix') return false;
      const r = engTapWhy(L, k % 3);               // 归因任选恒过（末题 done）
      if (r !== (k === L.quizzes.length - 1 ? 'done' : 'why_done')) return false;
    }
    return L.done && L.step === 5 && L.retries === 0 && engStars(L) === 3;
  }

  /* ---- ① structure：题库 15 题双录对账+NUMCN 21 值+三部位 DOM+clips+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.ED.quiz;
  /* 三部位 DOM：恰 3 个按钮 data-part 0/1/2；b 与 = 为纯 span（不设部位） */
  const partDoms = Array.from(document.querySelectorAll('#eq .part'));
  const domOk = !!q1 && partDoms.length === 3 &&
    partDoms.every(p => p.tagName === 'BUTTON' && ['0', '1', '2'].indexOf(p.dataset.part) >= 0) &&
    !!document.querySelector('#eq-b') && document.querySelector('#eq-b').tagName === 'SPAN' &&
    partBtnV(0).textContent === String(q1.shown.a) &&
    partBtnV(2).textContent === String(q1.shown.r) &&
    document.querySelector('#eq-b').textContent === String(q1.shown.b) &&
    partBtnV(1).textContent.length === 1 &&
    !!document.querySelector('#logo svg') && !!document.querySelector('#patient svg') &&
    document.getElementById('q-text').textContent.length > 0;
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* 题库 15 题双录对账：SPEC_BANK 硬编码 vs genLevel（ch1-3 各章 5 关同表同序） */
  let bankOk = true; let bankBad = '';
  for (let dch = 1; dch <= 3 && bankOk; dch++) {
    const base = genLevel((dch - 1) * 5);
    for (let k = 0; k < 5 && bankOk; k++) {
      const q = base.quizzes[k], row = SPEC_BANK[dch].rows[k];
      if (q.errType !== SPEC_BANK[dch].type) { bankOk = false; bankBad = 'type ' + dch + '/' + k; break; }
      if (q.shown.a !== row[0] || q.shown.op !== row[1] || q.shown.b !== row[2] ||
          q.shown.r !== row[3] || q.fix !== row[4]) { bankOk = false; bankBad = 'field ' + dch + '/' + k; break; }
      if (dch === 3 && q.orig.a !== row[5]) { bankOk = false; bankBad = 'origA ' + dch + '/' + k; break; }
    }
    const baseJson = JSON.stringify(base.quizzes);
    for (let f = (dch - 1) * 5 + 1; f < dch * 5; f++) {    // 同章各关同表同序
      if (JSON.stringify(genLevel(f).quizzes) !== baseJson) { bankOk = false; bankBad = 'seq ' + f; break; }
    }
  }
  /* NUMCN 0-20 全量 21 值（契约 L——含 0 零） */
  const numcnOk = Object.keys(NUMCN).length === 21 &&
    Array.from({ length: 21 }, (_, i) => i).every(i => NUMCN[i] === SPEC_NUMCN[i]);
  /* clips：ed_ 9+core 3 全注入+ed 实长辨别（±60ms；core 3 条只验在场——core 实长不在本批实长表禁猜值） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR).concat(Object.keys(SPEC_ED_N).map(n => 'ed_n_' + n))
    .concat(Object.keys(SPEC_ED_OP).map(o => 'ed_op_' + o)).concat(Object.keys(SPEC_ED_SEG).map(x => 'ed_s_' + x));
  const preOk = keysAll.length === 38 &&   // T46：SPEC_DUR 9+ed_n 21+ed_op 3+ed_s 2+core 3=38
    specKeys.concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const specDurOf = k => { const m = /^ed_(n_\d+|op_\w+|s_\w+)$/.exec(k);
    if (!m) return SPEC_DUR[k];
    if (m[1].indexOf('n_') === 0) return SPEC_ED_N[m[1].slice(2)];
    if (m[1].indexOf('op_') === 0) return SPEC_ED_OP[m[1].slice(3)];
    return SPEC_ED_SEG[m[1].slice(2)]; };
  const durOk = durs.every((d, i) => Math.abs(d - specDurOf(specKeys[i])) <= 60);
  /* 布局：双 viewport ×（flat0 ans/flat10 num）——部位 ≥56×56、药卡 ≥72×60、对比度 ≥3、overflowX ≤0 */
  function lum(hexStr) {
    const m = hexStr.match(/#?([0-9a-f]{6})/i);
    if (!m) return null;
    const n = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255)
      .map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2];
  }
  const ratioOf = (a, b) => { const x = lum(a), y = lum(b);
    return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function simView(w, h, flat) {
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    const parts = Array.from(document.querySelectorAll('#eq .part'));
    const pills = Array.from(document.querySelectorAll('#pills .pill'));
    const partOk = parts.length === 3 && parts.every(p => p.offsetWidth >= 56 && p.offsetHeight >= 56);
    const pillOk = pills.length === 3 && pills.every(p => p.offsetWidth >= 72 && p.offsetHeight >= 60);
    const sceneOk = document.getElementById('scene').offsetWidth >= 64 &&
                    document.getElementById('scene').offsetHeight >= 64;
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, partOk: partOk, pillOk: pillOk,
             sceneOk: sceneOk, contrast: cB, ox: ox,
             pass: partOk && pillOk && sceneOk && cB && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10]) {
    sims.push(simView(1280, 800, flat));
    sims.push(simView(800, 1180, flat));
  }
  const g0 = document.getElementById('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);
  const layoutOk = sims.every(s => s.pass);
  /* 契约 O：款内自建 button 显式 color（computed=INK 暖棕，不依赖 core 兜底） */
  const oOk = getComputedStyle(partBtnV(0)).color === 'rgb(74, 59, 46)';
  const s1ok = domOk && cleanDom && bankOk && numcnOk && preOk && durOk && layoutOk && oOk;
  if (s1ok) npass++;
  units.structure = { ok: s1ok, dom: domOk, clean: cleanDom, bank: bankOk, bankBad: bankBad,
                      numcn: numcnOk, clips: preOk, dur: durOk, layout: layoutOk, o: oOk,
                      sims: sims, durs: durs };

  /* ---- ② tutorial：教学三段（watch 完整三步 → turn 帮→独 → 正式关） ---- */
  total++;
  window.__edOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__edTutSolo = false;
  window.__edDemoR = null;
  startLevel(0);
  await tutorialWatch();
  const twWatch = (window.__edWatchMs || 1e9) / SPEED;        // watch 段实测（预算 ≤24000 T46 帽只罩 watch）
  const tutHelp = window.__edDemoR === 'done' && state.tut === 'help' &&
                window.ED.currentLevel.flat === -1 &&
                window.ED.quiz.errType === 'ans' &&
                window.ED.quiz.shown.a === SPEC_TURN_ROW[0] && window.ED.quiz.shown.op === SPEC_TURN_ROW[1] &&
                window.ED.quiz.shown.b === SPEC_TURN_ROW[2] && window.ED.quiz.shown.r === SPEC_TURN_ROW[3] &&
                window.ED.quiz.fix === SPEC_TURN_ROW[4] && window.ED.quiz.phase === 'spot' &&
                window.ED.quiz.step === 0 &&
                twWatch <= 24000 + 2500;   // T46 帽重定 23826≤24000+SPEED 调度容差（原 22000 estMs 口径）
  await unlocked();
  /* turn 题三步走完（步1 起帮：ghost 已指病灶；此处 UI 路径驱动） */
  const rT1 = await driveTap(() => window.ED.tapPart(SPEC_LESION.ans));         // 7+6=12 病灶=答案
  const rT2 = await driveTap(() => window.ED.tapFix(pillIdxByFix(SPEC_TURN_ROW[4])));
  const rT3 = await driveTap(() => window.ED.tapWhy(0));
  const tutSolo = rT1 === 'spot' && rT2 === 'fix' && rT3 === 'done' &&
                window.__edTutSolo === true &&
                window.ED.currentLevel.flat === 0 && window.ED.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__edDemoR, tut: state.tut,
                     solo: window.__edTutSolo, watchMs: Math.round(twWatch),
                     turns: [rT1, rT2, rT3], helpForm: tutHelp };

  /* ---- ③ drive：flat0-19 逐关驱动+SPEC 独立对账（ch1-3 表/ch4 公式独立复算 fix） ---- */
  total++;
  const levelsRec = {};
  let badCase = null;
  let driveOkAll = true;
  for (let flat = 0; flat < 20; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);      // 确定性
    let ruleOk = true;
    const expCh = Math.floor(flat / 5) + 1;
    const chOk = L1.ch === expCh;
    const dchOk = L1.dch === expCh;                       // 静态四档（flat0-19 dch=章号）
    let specOk = true;
    for (let k = 0; k < L1.quizzes.length && specOk; k++) {
      const q = L1.quizzes[k];
      const why = structWhy(q);
      if (why) { badCase = 'struct ' + flat + '/' + k + ':' + why; specOk = false; break; }
      /* 独立复算 fix（SPEC 公式——num reverseV/op 互换/ans 原式；ch1-3 与表再逐字段对账） */
      const fx = deriveFixV(q);
      if (q.fix !== fx) { badCase = 'fix ' + flat + '/' + k + ' ' + q.fix + '!=' + fx; specOk = false; break; }
      if (q.orig.a !== deriveOrigA(q) || q.orig.op !== deriveOrigOp(q)) { badCase = 'orig ' + flat + '/' + k; specOk = false; break; }
      if (q.errType === 'num' || q.errType === 'op') {
        if (q.shown.r !== calcV(q.shown.a, q.shown.op, q.shown.b)) { badCase = 'shownR ' + flat + '/' + k; specOk = false; break; }
      }
      if (flat <= 14) {                                    // ch1-3 按 SPEC 表逐字段（双录对账）
        const row = SPEC_BANK[L1.dch].rows[k];
        if (q.shown.a !== row[0] || q.shown.op !== row[1] || q.shown.b !== row[2] ||
            q.shown.r !== row[3] || q.fix !== row[4] ||
            q.errType !== SPEC_BANK[L1.dch].type ||
            (L1.dch === 3 && q.orig.a !== row[5])) { badCase = 'bank ' + flat + '/' + k; specOk = false; break; }
      }
    }
    const engOk = driveLevelEngine(L1);                    // 引擎直驱三步+全关 3 星
    const ok = det && ruleOk && chOk && dchOk && specOk && engOk;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
    if (!ok) driveOkAll = false;
  }
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase,
                  flats: Object.keys(levelsRec).filter(f => !levelsRec[f]) };

  /* ---- ④ frameM（契约 M：病灶高亮 DOM/提示泡/药卡选中/phase 序——渲染即引擎） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await phaseReady('spot');
    const q = window.ED.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    const les = SPEC_LESION[q.errType];                    // verify 映射（ans2/num0/op1）
    const fx = deriveFixV(q);
    const ph0 = window.ED.quiz.phase;                      // 'spot'（phaseReady 已保证）
    const pillsSpotNull = window.ED.pills === null;        // spot 阶段 pills getter=null（复验定版）
    const rS = await driveTap(() => window.ED.tapPart(les));   // 步1 点病灶
    const ph1 = window.ED.quiz ? window.ED.quiz.phase : '?';
    await phaseReady('fix');
    /* 步1 病灶高亮：唯一 .part.lesion 的 data-part === errType 映射部位 */
    const hi = document.querySelector('#eq .part.lesion');
    const hiOk = rS === 'spot' && !!hi && Number(hi.dataset.part) === les &&
      Array.from(document.querySelectorAll('#eq .part.lesion')).length === 1;
    /* 提示泡：num=这里应该是 原数 / op=这里应该是 原符（卡面阿拉伯数字·符号）/ans 无泡 */
    const bub = document.getElementById('bubble');
    const expBub = q.errType === 'num' ? '这里应该是 ' + deriveOrigA(q)
                 : q.errType === 'op' ? '这里应该是 ' + deriveOrigOp(q) : null;
    const bubOk = expBub === null ? !bub.classList.contains('show')
                : bub.classList.contains('show') && bub.textContent === expBub;
    /* 药卡 DOM 值 === 引擎 pills 真值（渲染即引擎）+含 verify 独立 fix 恰一张 */
    const qPage = cur && cur.quizzes[cur.step];
    const pillsDom = Array.from(document.querySelectorAll('#pills .pill')).map(b => Number(b.textContent));
    const pillOk = !!qPage && JSON.stringify(pillsDom) === JSON.stringify(qPage.pills) &&
      pillsDom.filter(v => v === fx).length === 1 && pillIdxByFix(fx) >= 0;
    /* ED.pills getter（复验定版 2026-09-12）：fix 阶段返回显示序数值数组——与 DOM
       同序同值·fix 恰一张·getter 推导下标 indexOf(fx) 与 DOM 解析 pillIdxByFix 一致 */
    const pillsG = window.ED.pills;
    const pillsGetOk = Array.isArray(pillsG) && pillsG.length === 3 &&
      pillsG.every(v => Number.isInteger(v)) &&
      JSON.stringify(pillsG) === JSON.stringify(pillsDom) &&
      pillsG.filter(v => v === fx).length === 1 &&
      pillsG.indexOf(fx) === pillIdxByFix(fx);
    const pi = pillIdxByFix(fx);
    const rF = await driveTap(() => window.ED.tapFix(pi));     // 步2 选对药
    const ph2 = window.ED.quiz ? window.ED.quiz.phase : '?';
    await phaseReady('why');
    /* 步2 选中断言：选中 .ok+病历卡 cured（打勾✓）+小兔子康复跳 */
    const selOk = rF === 'fix' &&
      document.querySelector('#pills .pill.ok') &&
      Number(document.querySelector('#pills .pill.ok').dataset.pill) === pi &&
      document.getElementById('chart').classList.contains('cured') &&
      document.getElementById('patient').classList.contains('cured');
    const rW = await driveTap(() => window.ED.tapWhy(1));      // 步3 归因任选
    const pillsWhyNull = window.ED.pills === null;             // why 阶段 pills getter=null
    const whyOk = rW === 'why_done' || rW === 'done';
    const seq = [ph0, ph1, ph2].join('>');
    const seqOk = seq === 'spot>fix>why';                      // phase 序（步内相位推进）
    const pGetOk = pillsSpotNull && pillsGetOk && pillsWhyNull;
    return { ok: hiOk && bubOk && pillOk && selOk && whyOk && seqOk && pGetOk,
             why: JSON.stringify({ hiOk: hiOk, bubOk: bubOk, pillOk: pillOk,
                                   selOk: selOk, whyOk: whyOk, seq: seq,
                                   pillsGet: pGetOk }) };
  }
  const fA = await frameCheck(0);      // ans 型（ch1）
  const fB = await frameCheck(10);     // num 型（ch3 静态）
  const fC = await frameCheck(20);     // 生成关 dch2 ans 乘法
  /* op 型帧检查：15-19 搜索首题为 op 型的 flat（页面构造真值定位，期望仍 verify 独立推导） */
  let opFlat = -1;
  for (let f = 15; f < 20 && opFlat < 0; f++) {
    if (genLevel(f).quizzes[0].errType === 'op') opFlat = f;
  }
  const fD = opFlat >= 0 ? await frameCheck(opFlat) : { ok: false, why: 'no op flat' };
  const frameOk = fA.ok && fB.ok && fC.ok && fD.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat20: fC, flatOp: fD, opFlat: opFlat };

  /* ---- ⑤ wrongPath：错路径+豁免窗（真时钟 5274：窗内二错吞/窗后二错照计/对选放行） ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.ED.quiz;                                // 13-5=9（病灶=2，正常部位 0/1）
  const badTap = (await window.ED.tapPart(99)) === null;    // 非法下标=null（不炸）
  const wA = 0;                                             // 正常部位（左数 13 是对的）
  const pW = window.ED.tapPart(wA);                         // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                      // 等摇头演出毕（locked=false）
  await unlocked();                                         // 等视觉锁过——豁免窗（真时钟 5274）仍在
  const rejW = await window.ED.tapPart(wA);                 // 豁免窗内二击=被吞 false（I 补：不计 miss）
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'ed_wrong' &&
                 h[1] === 'ed_hint' &&                      // 错链两段全 clip（契约 N 无 keyless）
                 h.every(p => typeof p === 'string') &&
                 !keylessLast(h));
  const miss1 = rW === 'wrong' && rejW === false && window.ED.quiz.miss === 1;
  await new Promise(w => setTimeout(w, 5400));              // 等豁免窗（真时钟 5274）过——窗后二错照计
  const rD = await window.ED.tapPart(wA);
  const miss2 = rD === 'wrong' && window.ED.quiz.miss === 2;
  await unlocked();
  const rE = await driveTap(() => window.ED.tapPart(2));    // 对选放行（豁免窗不拦对）
  await phaseReady('fix');
  const fx5 = deriveFixV(window.ED.quiz);                   // verify 独立 fix（=8）
  const piW = [0, 1, 2].filter(i => i !== pillIdxByFix(fx5))[0];   // 错药下标
  await new Promise(w => setTimeout(w, 5400));              // 等第二错的链窗过——步2 错药照计（miss=3）
  const rF = await window.ED.tapFix(piW);
  const miss3 = rF === 'wrong' && window.ED.quiz.miss === 3;
  await unlocked();
  const rG = await driveTap(() => window.ED.tapFix(pillIdxByFix(fx5)));   // 窗内对药放行
  const rH = await driveTap(() => window.ED.tapWhy(2));
  const wrongOk = badTap && miss1 && chainW && miss2 && rE === 'spot' && miss3 &&
                  rG === 'fix' && rH === 'why_done';
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, miss1: miss1, chain: chainW,
                      rejInWin: rejW === false, miss2: miss2, spot: rE,
                      fixWrong: miss3, fixRight: rG, why: rH };

  /* ---- ⑥ gradient：首错方向级（整卡 wiggle 不指病灶）/miss≥2 步2 正确药卡 breathe ---- */
  total++;
  startLevel(5);
  await unlocked();
  const q6 = window.ED.quiz;                                // ch2 首题 3×4=14（病灶=2）
  const r6a = await window.ED.tapPart(0);                   // 首错（flat5≥3：链 10s 节流起播）
  const wigFirst = document.getElementById('chart').classList.contains('wig') &&
                   !partBtnV(SPEC_LESION[q6.errType]).classList.contains('breathe');   // 不指病灶
  const r6b = await driveTap(() => window.ED.tapPart(SPEC_LESION[q6.errType]));   // 步1 过
  await phaseReady('fix');
  await new Promise(w => setTimeout(w, 5400));              // 等首错链窗过——错药照计（miss=2）
  const fx6 = deriveFixV(window.ED.quiz);
  const pi6 = [0, 1, 2].filter(i => i !== pillIdxByFix(fx6))[0];
  const r6c = await window.ED.tapFix(pi6);                  // 二错（miss=2）
  const okPill = document.querySelector('#pills .pill[data-pill="' + pillIdxByFix(fx6) + '"]');
  const breathe2 = !!okPill && okPill.classList.contains('breathe');   // miss≥2=正确药卡 breathe
  const gradOk = r6a === 'wrong' && wigFirst && r6b === 'spot' && r6c === 'wrong' &&
                 window.ED.quiz.miss === 2 && breathe2;
  if (gradOk) npass++;
  units.gradient = { ok: gradOk, wigFirst: wigFirst, spot: r6b, fixWrong: r6c,
                     breathe2: breathe2, miss: window.ED.quiz.miss };

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

  /* ---- ⑧ gen：生成关 flat20+（seeded 独立复算+四档全现+dch4 三型全现+确定性+新式） ---- */
  total++;
  const genBad = [];
  const genDch = {};
  const mixedTypes = {};
  const typeCensus = {};
  for (let flat = 15; flat < 40; flat++) {
    const rnd = mulberry32V(flat * 7919 + 631);      // SPEC §0.87：独立重写 rng
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性；flat15-19 恒 4）
    const L = genLevel(flat);
    if (flat >= 20 && L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (flat < 20 && L.dch !== 4) genBad.push(flat + ':ch4dch ' + L.dch);
    const L2 = genLevel(flat);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      const why = structWhy(q);
      if (why) { genBad.push(flat + '/' + k + ':struct ' + why); continue; }
      if (q.fix !== deriveFixV(q)) genBad.push(flat + '/' + k + ':fix');
      typeCensus[q.errType] = (typeCensus[q.errType] || 0) + 1;
      if (L.dch === 4) mixedTypes[q.errType] = 1;                     // ch4 合关三型池化
      /* dch 域型一致：dch1 ans±/dch2 ans×/dch3 num/dch4 三型任一（ans 只 ±） */
      if (L.dch === 1 && !(q.errType === 'ans' && (q.shown.op === '+' || q.shown.op === '-')))
        genBad.push(flat + '/' + k + ':d1dom');
      if (L.dch === 2 && !(q.errType === 'ans' && q.shown.op === '×'))
        genBad.push(flat + '/' + k + ':d2dom');
      if (L.dch === 3 && q.errType !== 'num') genBad.push(flat + '/' + k + ':d3dom');
      if (L.dch === 4 && ['ans', 'num', 'op'].indexOf(q.errType) < 0) genBad.push(flat + '/' + k + ':d4dom');
      if (L.dch === 4 && q.errType === 'ans' && q.shown.op === '×') genBad.push(flat + '/' + k + ':d4mul');
      /* 新式：生成题不撞静态 sig（同型域） */
      const sig = q.shown.a + q.shown.op + q.shown.b;
      const dom = q.errType === 'ans' ? (q.shown.op === '×' ? 'M' : 'A') : (q.errType === 'num' ? 'N' : null);
      if (dom && SPEC_STATIC_SIGS[dom][sig]) genBad.push(flat + '/' + k + ':staticsig ' + sig);
    }
    if (!driveLevelEngine(genLevel(flat))) genBad.push(flat + ':drive');   // 引擎直驱（fix 独立复算）
    if (flat >= 20) genDch[L.dch] = (genDch[L.dch] || 0) + 1;
  }
  const distOk = [1, 2, 3, 4].every(d => genDch[d] > 0);          // 四档全现（域全档成立型）
  const mixedOk = mixedTypes.ans && mixedTypes.num && mixedTypes.op;   // ch4 三型全现（20-39 池化）
  const genOk = genBad.length === 0 && distOk && mixedOk;
  if (genOk) npass++;
  units.gen = { ok: genOk, bad: genBad.slice(0, 6), dist: genDch,
                mixed: Object.keys(mixedTypes), census: typeCensus };

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §4 实长表）+契约源码断言 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const edNWorst = Math.max.apply(null, Object.keys(SPEC_ED_N).map(k => SPEC_ED_N[k]));   // 1464
  /* T46 确认链 worst：right+5×150+3×ed_n worst+ed_op worst+ed_s_eq+300 */
  const edConfirmWorst = D.ed_right + 5 * 150 + 3 * edNWorst + SPEC_ED_OP.add + SPEC_ED_SEG.eq + 300;
  const edSpotWorst = D.ed_spot + 150 + SPEC_ED_SEG.here + 150 + edNWorst + 300;
  const winOk = WRONG_CHAIN_WIN === 5274 &&                                     // 错链豁免窗 ==精确
                5274 === D.ed_wrong + 150 + D.ed_hint + 300 &&
                CONFIRM_WIN >= edConfirmWorst &&                                // T46 clip：6 段链 worst 10146（estMs 口径 6042 退役）
                SPOT_WIN_HINT >= edSpotWorst &&                                 // T46 clip：3 段链 worst 6432（estMs 口径 5961 退役）
                SPOT_WIN_ANS >= D.ed_spot + 300 &&                              // ans 型单 clip ≥2796
                RX_WIN >= D.ed_rx_careful + 300 &&                              // rx 单发 ≥2964
                TUT_WATCH_WAIT >= D.ed_tut_watch + 300 &&
                TUT_TURN_WAIT >= D.ed_tut_turn + 300 &&
                (2620 + 400) >= D.ed_right + 300;                               // celebrate+400 ≥2532（家族 H）
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'errdoc'") >= 0;              // C：本款存档键 kidsgame_errdoc
  const srcE = src.indexOf('sv.errdoc && sv.errdoc.tutSeen') >= 0;   // E：行为分流先查教学特例（freshTut 源码）
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== lesionOf(q)') >= 0 &&   // I 补：步1 guard
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && q.pills[i] !== q.fix') >= 0;  // I 补：步2 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;          // J：语义句 10s 节流在场
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcStep = src.indexOf('step: cur.step') >= 0 &&                   // b33 硬性①：step=全关题号语义显式
                  src.indexOf('全关题号') >= 0;
  const srcN = src.indexOf('[VOICE.spot.key].concat(hintParts(q))') >= 0 &&   // N（T46）：提示链 3 段全 clip
               src.indexOf('[VOICE.right.key].concat(eqParts(q))') >= 0;     // N（T46）：确认链 6 段全 clip
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
  const contractOk = srcA && srcB && srcC && srcE && srcF && srcI && srcJ && srcK &&
                     srcStep && srcN && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, step: srcStep, N: srcN, hints: srcHint };

  /* ---- ⑩ chains：链构成（确认链 keyless 尾 NUMCN 全式/spot 双段 vs 单链/rx 三选） ---- */
  total++;
  /* ans 型 spot 单链（flat0 首题 13-5=9） */
  startLevel(0);
  await phaseReady('spot');
  let h0 = window.__queueHist.length;
  const r10a = await driveTap(() => window.ED.tapPart(2));
  let spotAns = r10a === 'spot' && window.__queueHist.slice(h0).some(h =>
    h.length === 1 && h[0] === 'ed_spot' && !keylessLast(h));
  /* num 型 spot 双段链+确认链全式（flat10 首题 31-5=26，原 13-5=8） */
  startLevel(10);
  await phaseReady('spot');
  const qn = window.ED.quiz;
  const expHintNum = '这里应该是' + SPEC_NUMCN[deriveOrigA(qn)];
  const expEqNum = SPEC_NUMCN[deriveOrigA(qn)] + SPEC_OP_WORD[deriveOrigOp(qn)] +
                   SPEC_NUMCN[qn.shown.b] + '等于' + SPEC_NUMCN[deriveFixV(qn)];
  h0 = window.__queueHist.length;
  const r10b = await driveTap(() => window.ED.tapPart(SPEC_LESION.num));
  const expHintKeys = ['ed_spot', 'ed_s_here', 'ed_n_' + deriveOrigA(qn)];   // T46：3 段全键（原 keyless 提示句拆段）
  const spotNum = r10b === 'spot' && window.__queueHist.slice(h0).some(h =>
    h.length === 3 && h.join('|') === expHintKeys.join('|') &&
    h.every(x => typeof x === 'string'));
  await phaseReady('fix');
  h0 = window.__queueHist.length;
  const r10c = await driveTap(() => window.ED.tapFix(pillIdxByFix(deriveFixV(qn))));
  const expEqKeys = ['ed_right', 'ed_n_' + deriveOrigA(qn), 'ed_op_' + deriveOrigOp(qn).replace('+', 'add').replace('-', 'sub').replace('×', 'mul'),
                     'ed_n_' + qn.shown.b, 'ed_s_eq', 'ed_n_' + deriveFixV(qn)];   // T46：6 段全键
  const confirmNum = r10c === 'fix' && window.__queueHist.slice(h0).some(h =>
    h.length === 6 && h.join('|') === expEqKeys.join('|') &&
    h.every(x => typeof x === 'string'));
  await phaseReady('why');
  /* rx 药方三选播对应 clip（连续三题各选 0/1/2） */
  const rxGot = [];
  for (let w = 0; w < 3; w++) {
    const rr = await driveTap(() => window.ED.tapWhy(w));
    if (rr !== 'why_done' && rr !== 'done') break;
    rxGot.push(window.__lastVoiceKey);
    if (w < 2) { await phaseReady('spot'); await driveTap(() => window.ED.tapPart(SPEC_LESION[window.ED.quiz.errType])); await phaseReady('fix'); await driveTap(() => window.ED.tapFix(pillIdxByFix(deriveFixV(window.ED.quiz)))); await phaseReady('why'); }
  }
  const rxOk = rxGot.length === 3 &&
    rxGot[0] === 'ed_rx_careful' && rxGot[1] === 'ed_rx_calc' && rxGot[2] === 'ed_rx_slow';
  /* op 型 spot 双段链（15-19 定位首题 op 型 flat；期望独立推导：这里应该是加/减） */
  let opFlat2 = -1;
  for (let f = 15; f < 20 && opFlat2 < 0; f++) {
    if (genLevel(f).quizzes[0].errType === 'op') opFlat2 = f;
  }
  let spotOp = false;
  if (opFlat2 >= 0) {
    startLevel(opFlat2);
    await phaseReady('spot');
    const qo = window.ED.quiz;
    const expHintOpKeys = ['ed_spot', 'ed_s_here', 'ed_op_' + deriveOrigOp(qo).replace('+', 'add').replace('-', 'sub').replace('×', 'mul')];
    h0 = window.__queueHist.length;
    const rOp = await driveTap(() => window.ED.tapPart(SPEC_LESION.op));
    spotOp = rOp === 'spot' && window.__queueHist.slice(h0).some(h =>
      h.length === 3 && h.join('|') === expHintOpKeys.join('|') &&
      h.every(x => typeof x === 'string'));   // T46：op 型提示链 3 段全键
  }
  const chainUnitOk = spotAns && spotNum && confirmNum && rxOk && spotOp;
  if (chainUnitOk) npass++;
  units.chains = { ok: chainUnitOk, spotAns: spotAns, spotNum: spotNum,
                   confirmNum: confirmNum, rx: rxGot, spotOp: spotOp, opFlat: opFlat2,
                   expEq: expEqNum, expHint: expHintNum };

  /* ---- ⑪ save：真实写档链（origLS 模式：测前保存、测后恢复——b34 坑②） ---- */
  total++;
  const origSave = window.__edOrig.save, origPersist = window.__edOrig.persist;
  const origLS = localStorage.getItem('kidsgame_errdoc');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_errdoc');
    KIDS.init({ game: 'errdoc', title: '错题小医生' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.ED.autoSolve();     // 真实判定链通关（5 题×三步=15 taps）→ persistWin
    const raw = localStorage.getItem('kidsgame_errdoc');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 15 && j && j.v === '1.0' && j.game === 'errdoc' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_errdoc');
  else localStorage.setItem('kidsgame_errdoc', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面+window.ED 真实页暴露 ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'errdoc', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, errdoc: { tutSeen: true } };
  localStorage.setItem('kidsgame_errdoc', JSON.stringify(pre));
  KIDS.store.load();                             // 重读预置档
  window.__edDemoR = null;                       // 教学实证清零（非教学路径不应重设）
  const hookOk = typeof window.ED === 'object' && typeof window.ED.tapPart === 'function' &&
                 typeof window.ED.tapFix === 'function' && typeof window.ED.tapWhy === 'function' &&
                 typeof window.ED.start === 'function' && typeof window.ED.autoSolve === 'function' &&
                 !!window.ED.currentLevel;                     // b29 坑⑥：真实页暴露（quiz 在关末合法为 null）
  window.ED.start(0);
  await unlocked();
  const q12 = window.ED.quiz;
  const realOk = hookOk && state.tut === 'none' && window.__edDemoR === null &&
                 q12 && q12.shown.a === SPEC_TUT_ROW[0] && q12.shown.op === SPEC_TUT_ROW[1] &&
                 q12.shown.b === SPEC_TUT_ROW[2] && q12.shown.r === SPEC_TUT_ROW[3] &&
                 q12.errType === SPEC_BANK[1].type && q12.fix === deriveFixV(q12) &&
                 q12.phase === 'spot' && q12.step === 0 && q12.miss === 0 &&
                 window.ED.currentLevel.flat === 0 && window.ED.currentLevel.n === 5 &&
                 (KIDS._save() || {}).v === '1.0';
  if (realOk) npass++;
  units.realPath = { ok: realOk, hook: hookOk, tut: state.tut,
                     quiz: q12 && { a: q12.shown.a, op: q12.shown.op, b: q12.shown.b,
                                    r: q12.shown.r, fix: q12.fix, phase: q12.phase } };
  /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写） */
  if (origLS === null) localStorage.removeItem('kidsgame_errdoc');
  else localStorage.setItem('kidsgame_errdoc', origLS);
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};

  const out = { game: 'errdoc', total: total, pass: npass, units: units };
  document.getElementById('verify-result').textContent = JSON.stringify(out);
  window.__edVlog = out;                          // 外部断言挂点（任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total
                                     : 'VERIFY FAIL ' + npass + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史；voice.queue 记录拼播链（__lastQueue+
     __queueHist 全史——链断言用全史防覆盖） */
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
