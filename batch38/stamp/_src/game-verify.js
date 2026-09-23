/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元（v3 升档）
   ① structure：图案/印章 SVG 全定义（单属性 4+双属性 8——svg[data-motif] 渲染即
      引擎）、格位 DOM 与示范段真值一致、DOM 无 undefined 文本、clips 12 条
      （spm_ 9+core 3）全注入+9 条实测实长辨别器（±60ms；2026-09-13 重合成
      后 4 条任务句已从在场断言升级为实长断言）、answer 独立推导
      （单属性=seq[blank%plen]；双属性=colors[blank%3]+shapes[blank%6]）、
      双 viewport（1280×800/800×1180）×（flat0 3 章/flat10 4 章）布局
      （印章 ≥96×96、描边对比度 ≥3:1、overflowX ≤0——ch3-4 13 格 wide 档）
   ② tutorial：教学三段（watch=任务句→幽灵手指点正确章→盖印留格→__stDemoR
      ='stamped'；turn=row0 首题你来盖一盖（3 枚盘）；帮→首对独 __stTutSolo
      +进正式关 flat=0 n=5；watch 段实测折算 ≤16s——单步演示款）
   ③ drive：静态 20 关全量审计（flat0-19）：确定性/structWhy 全 null/章号映射
      ch=flat/5+1/取材域=seq 反查 SPEC 全表行号落章池（单属性全串·双属性 6 位
      前缀——ch4 含错章但首组合周期 0-5 恒真值）/每判定 answer 独立复算/
      ch4 双周期性质（错章≠真值·其余格全真值·badIdx∈[6,10]）/引擎直驱
      （fix 先 engTapCell(found) 再 engTapStamp）→ stamped·fixed/末题 done→3 星
      +UI ch4 找错修章链（flat15 首题：found→suspect 标记→fixed 留格→推进）
   ④ frameM（契约 M 帧内容三层 ×flat0/10/20 + flat15 fix 型）：数值层
      strip.dataset.scene/kind+格位数+示范格 svg[data-motif] 真值+题面任务句
      （__lastVoiceKey===sayKey+__lastVoiceText===sayText）+盘数/DOM 类层
      （唯一 .cell.cur+作品栏=step）/演出层 盖对后目标格 .stamped+
      svg[data-motif]=正确章图案（盖印留格；ch4=错章位替换）
   ⑤ wrongPath：ch1-3 干扰章 'wrong'+miss+错链 [spm_wrong,spm_hint] 全 clip+
      虚影消散不留格+豁免窗（真时钟 6066）内干扰章二击吞 false/正确章放行/
      窗后二错照计 miss=2（契约 I 补）+正确章 breathe；ch4 找错期：未 found
      点盘=null、点非错章 'wrong'+miss+链 [spm_fix_wrong]（豁免窗 4452）
   ⑥ pool：题库 20 行对账（SPEC §1 v3 全表独立硬编码——kind/unit/period/colors/
      shapes/seqLen/sayKey 逐项+双周期推导复算，禁读页面真值当期望源）+20 静态关
      rotate 覆盖审计（每行恰现 5 次）
   ⑦ stars：星级口径 0=3★/1-2=2★/≥3=1★（永不 0 星）
   ⑧ gen：生成关 flat20-39 dch=seeded 随机 ri(rnd,1,4)（mulberry32
      (flat*7919+827) python 式 JS 复刻）——verify 独立复算第一个随机数==dch
      +四档全现+盘数/池域一致（dch≤2 恒 3 枚 行 0-9 / dch≥3 恒 4 枚 行 10-19）
      +确定性（同 flat 两次生成 JSON 相等）+无放回（同关 5 题互异）
   ⑨ windows+contract：错链豁免窗 ==4698（=2016+150+2232+300）+ch4 找错链窗
      ==2316（=spm_fix_wrong 占位 2016+300）+盖对窗 ==2316（=2016+300）+首错锁
      ≤2166（b37 R3）+教学延窗+celebrate 窗+契约 A/B/C/D/E/F/I/J/K 源码断言
      （读 script[2] 合并文本——b36 M1 分离后恢复判别力；肯定断言检索字面逐条
      与 main 真源核对）+CHAPTERS/GEN_HINTS 双录+nextHint 4/9/14/19 数值断言
      +24/29/34/39 实算（b35 m5 范式）
   ⑩ confirmChain：确认链构成 __lastQueue===['spm_right']（right 单 clip 全 clip
      无 keyless——题面任务句走 voice.play 不动 __lastQueue，SPEC v3 明示）
   ⑪ save：真实写档链（init stamp→autoSolve 通关→winFlow verify 分支
      persistWin→localStorage kidsgame_stamp v:'1.0' levels['1-0'] 更新；
      origLS 模式测后恢复原 localStorage，不污染真实存档——b34 坑②）
   ⑫ realPath：预置存档 v:'1.0'+tutSeen → start(0) 非教学直达题面（契约 E
      行为分流）+ quiz 形态（row0 FSHFSH/blank=6/3 章/kind=next/unit='ABC'/
      answer 独立推导/tapCell 钩子在场）+window.ST 真实页暴露（b29 坑⑥）；
      try/finally 保异常时 origLS 也恢复（b36 m4）
   结果写 #verify-result + window.__stVlog（__vlog 计数）+document.title=
   'VERIFY PASS n/n'（初始=游戏名，跑完才设——title 协议） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC-BATCH38 §1 v3 文字独立重列（禁抄页面 VOICE/CHAPTERS/常量/题库） */
  const SPEC_DUR = { spm_tut_watch: 3192, spm_tut_turn: 1752, spm_hint: 3600,
                     spm_right: 2016, spm_wrong: 2016,
                     spm_task_next: 3264, spm_task_dual: 3384, spm_task_fix: 3504, spm_fix_wrong: 4152 };
  const SPEC_NEW_KEYS = [];   // 4 条任务句已并入 SPEC_DUR 实长断言（2026-09-13 重合成后实测）
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_CH = { 1: { n: 3 }, 2: { n: 3 }, 3: { n: 4 }, 4: { n: 4 } };   // 印章盘数档
  const SPEC_TASK_SAY = ['看看花边的规律，盖下一个', '颜色和形状都有自己的规律哦', '花边里有一枚盖错啦，找出来'];
  const SPEC_SAYKEY = ['spm_task_next', 'spm_task_dual', 'spm_task_fix'];
  const SPEC_MOTIFS = ['F', 'S', 'H', 'O'];
  const SPEC_DUAL = ['RT', 'YC', 'BS', 'GH', 'RC', 'YS', 'BT', 'GC'];
  /* SPEC §1 v3 20 行全表（独立硬编码）：
     单属性 {kind:'next', unit:'ABC'|'AABB'|'ABCC', period, seqLen}
     双属性 {kind:'next'|'fix', colors:[3], shapes:[6], seqLen:12}
     真值：单=period[c%plen]；双=colors[c%3]+shapes[c%6]（ch4 badIdx∈[6,10] 位
     为错章——首组合周期 0-5 恒真值=公平锚） */
  const SPEC_ROWS = [
    { kind: 'next', unit: 'ABC',  period: 'FSH',  seqLen: 6 },
    { kind: 'next', unit: 'ABC',  period: 'FSH',  seqLen: 7 },
    { kind: 'next', unit: 'ABC',  period: 'SHO',  seqLen: 6 },
    { kind: 'next', unit: 'ABC',  period: 'SHO',  seqLen: 8 },
    { kind: 'next', unit: 'ABC',  period: 'HOF',  seqLen: 9 },
    { kind: 'next', unit: 'AABB', period: 'FFSS', seqLen: 8 },
    { kind: 'next', unit: 'AABB', period: 'HHOO', seqLen: 8 },
    { kind: 'next', unit: 'ABCC', period: 'FHOO', seqLen: 9 },
    { kind: 'next', unit: 'AABB', period: 'OOFF', seqLen: 8 },
    { kind: 'next', unit: 'ABCC', period: 'SHOO', seqLen: 10 },
    { kind: 'next', unit: 'd', colors: ['R', 'Y', 'B'], shapes: ['T', 'C', 'S', 'C', 'S', 'T'], seqLen: 12 },
    { kind: 'next', unit: 'd', colors: ['B', 'Y', 'R'], shapes: ['S', 'C', 'T', 'T', 'S', 'C'], seqLen: 12 },
    { kind: 'next', unit: 'd', colors: ['B', 'R', 'Y'], shapes: ['S', 'T', 'C', 'T', 'C', 'S'], seqLen: 12 },
    { kind: 'next', unit: 'd', colors: ['R', 'Y', 'B'], shapes: ['C', 'S', 'T', 'T', 'C', 'S'], seqLen: 12 },
    { kind: 'next', unit: 'd', colors: ['G', 'R', 'Y'], shapes: ['C', 'T', 'C', 'H', 'C', 'S'], seqLen: 12 },
    { kind: 'fix',  unit: 'd', colors: ['Y', 'B', 'R'], shapes: ['C', 'S', 'T', 'S', 'T', 'C'], seqLen: 12 },
    { kind: 'fix',  unit: 'd', colors: ['B', 'G', 'R'], shapes: ['S', 'C', 'T', 'T', 'C', 'C'], seqLen: 12 },
    { kind: 'fix',  unit: 'd', colors: ['R', 'G', 'Y'], shapes: ['T', 'C', 'S', 'T', 'C', 'C'], seqLen: 12 },
    { kind: 'fix',  unit: 'd', colors: ['G', 'Y', 'R'], shapes: ['C', 'S', 'T', 'C', 'C', 'T'], seqLen: 12 },
    { kind: 'fix',  unit: 'd', colors: ['Y', 'B', 'G'], shapes: ['C', 'S', 'C', 'S', 'T', 'H'], seqLen: 12 }
  ];
  /* 独立推导（SPEC §1 v3 钩子契约）：真值位函数+seq 串反查（单属性全串唯一/
     双属性 6 位前缀唯一——ch4 含错章但首组合周期恒真值） */
  const specVal = (r, c) => r.period ? r.period[c % r.period.length]
                                     : r.colors[c % 3] + r.shapes[c % 6];
  const specSeq = r => { const a = []; for (let i = 0; i < r.seqLen; i++) a.push(specVal(r, i)); return a; };
  const rowOfV = seqArr => {
    const full = seqArr.join(''), pre = full.slice(0, 6), hit = [];
    for (let i = 0; i < SPEC_ROWS.length; i++) {
      const s = specSeq(SPEC_ROWS[i]).join('');
      if (s === full || (SPEC_ROWS[i].period == null && s.slice(0, 6) === pre)) hit.push(i);
    }
    return hit.length === 1 ? hit[0] : -1;       // 非唯一=域约束失败
  };
  const deriveAnswerV = quiz => {
    const row = SPEC_ROWS[rowOfV(quiz.seq)];
    if (!row) return -1;
    const exp = specVal(row, quiz.blank);        // blank=当前判定真值位（ch4=badIdx）
    return quiz.picks.indexOf(exp);
  };
  const estMsV = s => s.length * 345 + 600;      // b25 定版：SAPI ~345ms/字+600（全字符口径）
  /* 独立 rng（SPEC §0.91 生成关策略）：mulberry32(flat*7919+827)，dch=1+floor(r()*4) */
  function mulberry32V(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const unlocked = async () => {                  // 等演出锁（真时钟 showUntil）/演出/演示结束
    let wg = 0;
    while ((state.locked || state.demo || Date.now() < (state.showUntil || 0)) && wg++ < 3000) await wait(50);
    return !(state.locked || state.demo) && Date.now() >= (state.showUntil || 0);
  };
  const waitChainOver = async () => {             // 等错链豁免窗（真时钟）过
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

  /* ---- ① structure：SVG 定义+格位 DOM 真值+DOM 干净+clips 全注入+answer 独立推导+双 viewport 布局 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q1 = window.ST.quiz;
  const stampDom = Array.from(trayEl.querySelectorAll('.stamp-wrap'));
  const svgOk = q1 && stampDom.length === q1.picks.length &&
    stampDom.every(w => {
      const g = w.querySelector('.art svg > g[data-anim="stamp"]');
      return !!g && typeof g.dataset.anim === 'string' && g.dataset.anim.length > 0;
    }) &&
    stripEl.children.length === q1.seq.length + q1.blanks &&
    q1.seq.every((m, i) => {                      // 示范格真值（渲染即引擎——svg[data-motif]）
      const c = stripEl.children[i];
      return c.classList.contains('done') && !!c.querySelector('svg[data-motif="' + m + '"]');
    }) &&
    SPEC_MOTIFS.every(m => motifSvg(m).indexOf('<svg') === 0 && motifSvg(m).indexOf('data-motif="' + m + '"') >= 0) &&
    SPEC_DUAL.every(m => motifSvg(m).indexOf('<svg') === 0 && motifSvg(m).indexOf('data-motif="' + m + '"') >= 0) &&   // 双属性 8 种全定义
    SPEC_MOTIFS.concat(SPEC_DUAL).every(m => stampSvg(m).indexOf('<svg') === 0) &&     // 印章 12 种全定义
    !!document.querySelector('#logo svg');
  const cleanDom = !document.body.innerText.match(/undefined|NaN|null\b/);
  /* answer 独立推导（SPEC §1 v3 唯一解锚——禁读 quiz.answer 直比推导依据） */
  const ansDeriveOk = q1 && q1.answer === deriveAnswerV(q1) &&
                      q1.picks[q1.answer] === specVal(SPEC_ROWS[0], q1.blank);
  /* clips：spm_ 9+core 3 全注入；5 条实测实长辨别（SPEC §4 实长表 ±60ms）；
     4 条新增占位 clip 只验在场（占位实长=复制源实长，主线重合成后回更） */
  const keysAll = Object.keys(KIDS.voice.clips);
  const specKeys = Object.keys(SPEC_DUR);
  const preOk = keysAll.length === 12 &&
    specKeys.concat(SPEC_NEW_KEYS).concat(SPEC_CORE_KEYS).every(k => keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durs = await Promise.all(specKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 4000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[specKeys[i]]) <= 60);
  /* 布局：双 viewport ×（flat0 3 章/flat10 4 章）——印章=主答案目标 ≥96×96
     （ch3-4 13 格走 wide 收窄档，竖屏不溢出） */
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
    const wraps = Array.from(trayEl.querySelectorAll('.stamp-wrap'));
    if (g._simFlat >= 20)   /* m4 守卫：生成关 dch 随机禁按静态档硬算盘数（防假阴性）——直接判不过 */
      return { vp: w + 'x' + h, flat: g._simFlat, stamps: wraps.length, hitOk: false, contrast: false, ox: 0, pass: false, note: 'simFlat>=20 不支持' };
    const need = SPEC_CH[Math.floor(g._simFlat / 5) + 1].n;    // 静态档盘数独立复算
    const hitOk = wraps.length === need && wraps.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const cB = ratioOf(cssToHex(getComputedStyle(wraps[0]).borderLeftColor), '#FBF6EC') >= 3;   // 印章描边对比度
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, stamps: wraps.length, hitOk: hitOk,
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

  /* ---- ② tutorial：教学三段（看→帮→独；3 枚盘） ---- */
  total++;
  window.__stOrig = { save: KIDS._save, persist: KIDS.store.persist };   // U11 还原用
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（沙盒）
  KIDS.store.persist = function () {};
  window.__stTutSolo = false;
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 教学（watch+turn）全程折算
  const twWatch = (window.__stWatchMs || 1e9) / SPEED;       // watch 段实测（家族预算 ≤16s 只罩 watch）
  const tutHelp = window.__stDemoR === 'stamped' && state.tut === 'help' &&
                window.ST.currentLevel.flat === -1 &&
                window.ST.quiz.scene === 0 && window.ST.quiz.picks.length === 3 &&
                window.ST.quiz.kind === 'next' &&
                twWatch <= 16000 && tw <= 30000;
  await unlocked();
  const qT = window.ST.quiz;                                // "帮"阶段放手题（row0 首题）
  const rT = await window.ST.tapStamp(deriveAnswerV(qT));   // 首次盖对（独立推导正确章）→ 帮→独 → 进正式关
  const tutSolo = rT === 'done' && window.__stTutSolo === true &&
                window.ST.currentLevel.flat === 0 && window.ST.currentLevel.n === 5;
  const tutOk = tutHelp && tutSolo;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__stDemoR, tut: state.tut,
                     solo: window.__stTutSolo, watchMs: Math.round(twWatch),
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
    /* SPEC §1 v3 取材域对账（b36 坑③禁 idx 公式锁取材序）：每题 seq 反查 SPEC 全表
       行号 → 行号必须落本章程（(ch-1)*5..ch*5-1）——单属性全串/双属性 6 位前缀
       唯一反查定位，既验域又不锁实现取材序 */
    let sceneOk = true;
    for (let qi = 0; qi < 5; qi++) {
      const q = L1.quizzes[qi];
      const row = rowOfV(q.seq);
      if (row < 0 || row < (expCh - 1) * 5 || row >= expCh * 5) {
        badCase = 'scene ' + flat + '/' + qi + ' row=' + row; sceneOk = false; break;
      }
    }
    /* 引擎直驱：ch4 先 engTapCell(found) 再逐判定点正确章（独立复算真值）→
       stamped/fixed / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const row = SPEC_ROWS[q.scene];
      if (row.kind === 'fix') {                       /* ch4：性质复算+找错+修章 */
        if (q.badIdx < 6 || q.badIdx > 10) { driveOk = false; break; }
        const truth = specVal(row, q.badIdx);
        let okBad = q.seq[q.badIdx] !== truth;
        for (let i = 0; i < q.seq.length; i++) {
          if (i !== q.badIdx && q.seq[i] !== specVal(row, i)) okBad = false;
        }
        if (!okBad || engTapCell(L3, q.badIdx) !== 'found' || q.answer !== q.picks.indexOf(truth)) {
          driveOk = false; break;
        }
      }
      let cell = row.seqLen;
      while (!q._answered && driveOk) {
        const expMotif = row.kind === 'fix' ? specVal(row, q.badIdx) : specVal(row, cell);   // 独立复算真值
        const expIdx = q.picks.indexOf(expMotif);
        const isLast = k === L3.quizzes.length - 1;              // blanks=1：每题单判定
        if (expIdx < 0 || q.answer !== expIdx) { driveOk = false; break; }     // answer=独立推导对账
        const r = engTapStamp(L3, q.answer);
        if (r !== (isLast ? 'done' : (row.kind === 'fix' ? 'fixed' : 'stamped')) || q._miss !== 0) { driveOk = false; break; }
        cell++;
      }
      if (driveOk && cell !== row.seqLen + 1) driveOk = false;   // blanks=1：每题恰 1 判定
    }
    const solvedAll = L3.done && L3.step === 5 && L3.retries === 0 && engStars(L3) === 3;
    const ok = det && ruleOk && chOk && dchOk && sceneOk && driveOk && solvedAll;
    if (!ok && !badCase) badCase = 'drive ' + flat;
    levelsRec[flat] = ok;
  }
  /* UI ch4 找错修章链（flat15 首题=fix 型）：找错期盘未开（tapStamp null）→
     点非错章 wrong → 点错章 found+suspect 标记+盘弹出 → 修章 fixed+错章位替换留格 */
  startLevel(15);
  await unlocked();
  const q15 = window.ST.quiz;
  const row15 = SPEC_ROWS[15];
  const fix0 = q15 && q15.kind === 'fix' && q15.badIdx >= 6 && q15.badIdx <= 10 &&
               q15.badIdx === window.ST.quiz.badIdx && q15.found === false &&
               trayEl.querySelectorAll('.stamp-wrap').length === 0;      // 找错期盘未开
  const gateNull = (await window.ST.tapStamp(0)) === null;               // 未 found 先点盘=null
  const wrongCell = (q15.badIdx + 3) % 12;                               // 非错章位（+3 mod 12 恒≠badIdx）
  const rCellW = await window.ST.tapCell(wrongCell);                     // 点非错章 → wrong+miss
  const cellWrongOk = rCellW === 'wrong' && window.ST.quiz.miss === 1 && window.ST.quiz.found === false;
  await unlocked();
  await waitChainOver();
  const rFound = await window.ST.tapCell(q15.badIdx);                    // 点错章位 → found
  await unlocked();
  const badCellEl = stripEl.children[q15.badIdx];
  const foundOk = rFound === 'found' && window.ST.quiz.found === true &&
                  !!badCellEl && badCellEl.classList.contains('suspect') &&
                  trayEl.querySelectorAll('.stamp-wrap').length === 4;   // suspect 标记+盘弹出 4 枚
  const rFix = await window.ST.tapStamp(window.ST.quiz.answer);          // 修章 → fixed+错章位替换
  const fixOk = rFix === 'fixed' && window.ST.quiz && window.ST.quiz.step === 1 &&
                !!badCellEl && badCellEl.classList.contains('stamped') &&
                !!badCellEl.querySelector('svg[data-motif="' + specVal(row15, q15.badIdx) + '"]');
  const multiOk = fix0 && gateNull && cellWrongOk && foundOk && fixOk;
  const driveOkAll = Object.keys(levelsRec).every(f => levelsRec[f]) && multiOk;
  if (driveOkAll) npass++;
  units.drive = { ok: driveOkAll, bad: badCase, fixChain: multiOk, fix0: fix0, gateNull: gateNull,
                  cellWrong: cellWrongOk, found: foundOk, fixed: fixOk };

  /* ---- ④ frameM（契约 M 帧内容三层 ×flat0/10/20 next 型 + flat15 fix 型） ---- */
  total++;
  async function frameCheck(flat) {
    startLevel(flat);
    await unlocked();
    const q = window.ST.quiz;
    if (!q) return { ok: false, why: 'quiz' };
    /* 数值层：scene/kind 锚+格位 DOM 数+示范格 svg[data-motif] 真值+题面任务句真值
       （voice.play 双录：__lastVoiceKey=按 scene 推导的 SPEC 任务句键+__lastVoiceText=say）+盘数 */
    const stampDoms = Array.from(trayEl.querySelectorAll('.stamp-wrap'));
    const expSayKey = q.scene < 10 ? SPEC_SAYKEY[0] : (q.scene < 15 ? SPEC_SAYKEY[1] : SPEC_SAYKEY[2]);
    const numOk = Number(stripEl.dataset.scene) === q.scene &&
                  stripEl.dataset.kind === q.kind &&
                  stripEl.children.length === q.seq.length + q.blanks &&
                  Number(trayEl.dataset.n) === q.picks.length &&
                  window.__lastVoiceKey === expSayKey &&
                  window.__lastVoiceText === q.say &&
                  stampDoms.length === q.picks.length &&
                  stampDoms.every((w, j) => w.dataset.j === String(j)) &&   // 章下标语义
                  q.seq.every((m, i) => {
                    const c = stripEl.children[i];
                    return !!c && c.dataset.i === String(i) &&
                           !!c.querySelector('svg[data-motif="' + m + '"]');
                  });
    /* DOM 类层：题面态=唯一当前空位格（.cell.cur 恰落 blank 格）+空位数=续盖位数
       +作品栏=已完题数 */
    const clsOk = stripEl.querySelectorAll('.cell.cur').length === 1 &&
                  !!stripEl.children[q.blank] && stripEl.children[q.blank].classList.contains('cur') &&
                  stripEl.querySelectorAll('.cell.blank').length === q.blanks &&
                  galleryEl.children.length === q.step;
    /* 演出层：盖对（独立推导）→ 演出中段采样目标格 .stamped+svg[data-motif]=正确章
       图案（盖印永久留格）+正确章 .good 闪亮 */
    const goodI = deriveAnswerV(q);
    const cellIdx = q.blank;
    const pF = window.ST.tapStamp(goodI);       // fire（演出开始）
    await wait(250);                            // 演出中段（cele 窗 278ms@SPEED.12 中点）
    const c = stripEl.children[cellIdx];
    const gw = trayEl.querySelector('.stamp-wrap[data-j="' + goodI + '"]');
    const stampOk = !!c && c.classList.contains('stamped') &&
                    !!c.querySelector('svg[data-motif="' + q.picks[goodI] + '"]') &&
                    !!gw && gw.classList.contains('good');
    const r = await pF;
    const rOk = r === 'stamped' || r === 'done';
    return { ok: numOk && clsOk && rOk && stampOk,
             why: JSON.stringify({ numOk, clsOk, rOk, stampOk, r }) };
  }
  const fA = await frameCheck(0);      // dch1 3 章
  const fB = await frameCheck(10);     // dch3 4 章（13 格 wide 档）
  const fC = await frameCheck(25);     // 生成关 dch=1（seeded 定值；flat20 dch=4 属 fix 型——
                                       // next 型帧链走 flat25；fix 型帧链已由单元③ flat15 UI 链覆盖）
  const frameOk = fA.ok && fB.ok && fC.ok;
  if (frameOk) npass++;
  units.frameM = { ok: frameOk, flat0: fA, flat10: fB, flat25: fC };

  /* ---- ⑤ wrongPath：ch1-3 错路径+豁免窗（真时钟 4698）+ch4 找错期错路径 ---- */
  total++;
  startLevel(0);
  await unlocked();
  const q5 = window.ST.quiz;
  const badTap = (await window.ST.tapStamp(99)) === null;           // 非法下标=null（不炸）
  const badI = (q5.answer + 1) % q5.picks.length;                   // 干扰章下标（盘内互异→补集）
  const pW = window.ST.tapStamp(badI);                              // → wrong（首错链起播，fire-and-forget）
  const rW = await pW;                                             // 等虚影演出毕（locked=false）
  await unlocked();                                                // 等演出锁（showUntil 余窗）过——豁免窗仍在
  const chainW = window.__queueHist && window.__queueHist.some(h =>
                 h.length === 2 && h[0] === 'spm_wrong' &&          // 错链头=wrong clip
                 h[1] === 'spm_hint' &&                            // 语义句=hint（占位文案待重合成）
                 h.every(p => typeof p === 'string') &&            // 全 clip 无 keyless（契约 N）
                 !keylessLast(h));
  const curCell = stripEl.children[q5.blank];
  const ghostGone = !!curCell && !curCell.querySelector('svg[data-motif]') &&
                    !curCell.querySelector('.ghost');               // 虚影抖动消散不留格（空位仍在）
  const rejW = await window.ST.tapStamp(badI);                      // 豁免窗内干扰章二击=被吞 false（I 补：不计 miss）
  const miss1 = rW === 'wrong' && rejW === false && window.ST.quiz.miss === 1;
  const passW = await window.ST.tapStamp(q5.answer);                // 豁免窗内正确章=放行（I 补）→ 推进
  const passOk = passW === 'stamped' && window.ST.quiz.step === 1;
  await unlocked();                                                // 等新题开题演出完
  await waitChainOver();                                           // 等首错豁免窗（真时钟）过
  const q5b = window.ST.quiz;                                      // 题 1（域池内下一题）
  const badIb = (q5b.answer + 1) % q5b.picks.length;
  const rD1 = await window.ST.tapStamp(badIb);                      // 题 1 首错（miss=1）
  await unlocked();
  await waitChainOver();                                           // 等本错豁免窗过——窗后二错照计 miss
  const rD2 = await window.ST.tapStamp(badIb);                      // 题 1 二错（miss=2）
  await unlocked();                                                // 等二错演出锁过
  const missAfter2 = window.ST.quiz.miss;                          // rE 前记录（好章推进会换题清零）
  const brEl = stampWrapAt(q5b.answer);
  const breathe2 = !!brEl && brEl.classList.contains('breathe');   // miss≥2=正确章 breathe（答案级）
  const rE = await window.ST.tapStamp(q5b.answer);                  // 章不灰可重点（探索不罚）
  const wrongNext = badTap && miss1 && chainW && ghostGone && passOk &&
                  rD1 === 'wrong' && rD2 === 'wrong' &&
                  missAfter2 === 2 && breathe2 && rE === 'stamped';
  /* ch4 找错期错路径：点非错章链=[spm_fix_wrong] 单 clip+miss 计 */
  startLevel(15);
  await unlocked();
  const q5f = window.ST.quiz;
  const h0f = window.__queueHist.length;
  const wCell = (q5f.badIdx + 5) % 12;
  const rFw = await window.ST.tapCell(wCell);                       // 点非错章 → wrong
  await unlocked();
  const chainF = window.__queueHist.slice(h0f).some(h =>
                 h.length === 1 && h[0] === 'spm_fix_wrong' &&      // ch4 找错链=fixWrong 单 clip
                 h.every(p => typeof p === 'string') && !keylessLast(h));
  const fixWrongOk = rFw === 'wrong' && window.ST.quiz.miss === 1 && chainF &&
                     window.ST.quiz.found === false;                // 找错进度不受影响
  const wrongOk = wrongNext && fixWrongOk;
  if (wrongOk) npass++;
  units.wrongPath = { ok: wrongOk, badTap: badTap, miss1: miss1, chain: chainW, ghostGone: ghostGone,
                      rejInWin: rejW === false, passInWin: passOk, miss2: rD2 === 'wrong' && missAfter2 === 2,
                      breathe2: breathe2, right: rE, fixChain: fixWrongOk };

  /* ---- ⑥ pool：题库 20 行对账（SPEC §1 v3 全表独立硬编码+双周期推导复算） ---- */
  total++;
  let poolBad = null;
  for (let i = 0; i < 20 && !poolBad; i++) {
    const spec = SPEC_ROWS[i], row = ROWS[i];
    if (row.kind !== spec.kind) { poolBad = 'kind ' + i; break; }
    if (spec.period) {                            // 单属性行（unit/period/seqLen 逐项对账=推导锚）
      if (row.unit !== spec.unit) { poolBad = 'unit ' + i; break; }
      if (row.period !== spec.period) { poolBad = 'period ' + i; break; }
      if (row.seqLen !== spec.seqLen) { poolBad = 'seqLen ' + i; break; }
      if (spec.seqLen < spec.period.length * 2) { poolBad = 'periods ' + i; break; }   // 示范段 ≥2 周期
    } else {                                      // 双属性行
      if (!row.unit || row.unit.colors.join('') !== spec.colors.join('') ||
          row.unit.shapes.join('') !== spec.shapes.join('')) { poolBad = 'unit ' + i; break; }
      if (row.seqLen !== 12) { poolBad = 'seqLen ' + i; break; }
      let rot = true;                             // 双周期不塌缩：形状周期恰 6
      for (let c = 0; c < 3; c++) if (spec.shapes[c] !== spec.shapes[c + 3]) rot = false;
      if (rot) { poolBad = 'shapeCollapse ' + i; break; }
      const items = specSeq(spec);
      if (items.some(m => SPEC_DUAL.indexOf(m) < 0)) { poolBad = 'pool ' + i; break; }   // 封闭池 8
    }
    if (row.sayKey !== (i < 10 ? SPEC_SAYKEY[0] : i < 15 ? SPEC_SAYKEY[1] : SPEC_SAYKEY[2]))
      { poolBad = 'sayKey ' + i; break; }         // 题面任务句映射（去泄题锚）
  }
  /* 唯一性：单属性全 seq 互异；双属性 6 位前缀互异（反查定位锚） */
  const uniqOk = new Set(SPEC_ROWS.filter(r => r.period).map(r => specSeq(r).join(''))).size === 10 &&
                 new Set(SPEC_ROWS.filter(r => !r.period).map(r => specSeq(r).join('').slice(0, 6))).size === 10;
  /* 20 题覆盖审计：静态 20 关每行恰现 5 次（覆盖口径不锁取材序） */
  const cnt = {};
  for (let flat = 0; flat < 20; flat++) {
    const L = genLevel(flat);
    L.quizzes.forEach(q => { cnt[q.scene] = (cnt[q.scene] || 0) + 1; });
  }
  const coverOk = Object.keys(cnt).length === 20 && SPEC_ROWS.every((s, i) => cnt[i] === 5);
  const poolOk = !poolBad && uniqOk && coverOk;
  if (poolOk) npass++;
  units.pool = { ok: poolOk, bad: poolBad, uniq: uniqOk, cover: coverOk };

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
    const rnd = mulberry32V(flat * 7919 + 827);      // SPEC §0.91：独立重写 rng（python 式复刻）
    const expDch = 1 + Math.floor(rnd() * 4);        // dch=第一个随机数（先取数保确定性）
    const L = genLevel(flat), L2 = genLevel(flat);
    if (L.dch !== expDch) genBad.push(flat + ':dch ' + L.dch + '!=' + expDch);
    if (JSON.stringify(L.quizzes) !== JSON.stringify(L2.quizzes)) genBad.push(flat + ':det');
    const cfgN = SPEC_CH[L.dch].n;                   // 盘数域：dch≤2 恒 3 枚/≥3 恒 4 枚
    if (!L.quizzes.every(q => q.picks.length === cfgN)) genBad.push(flat + ':picksN');
    /* 池域：seq 反查 SPEC 行号（dch≤2 行 0-9 / dch≥3 行 10-19）——b36 坑③反查口径 */
    if (!L.quizzes.every(q => {
      const row = rowOfV(q.seq);
      return row >= 0 && (L.dch <= 2 ? row < 10 : row >= 10);
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

  /* ---- ⑨ windows+contract：窗静态断言（SPEC §4 实长表+占位口径）+契约源码断言+双录+nextHint 实算 ---- */
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const D = SPEC_DUR;
  const winOk = WRONG_CHAIN_WIN === 6066 &&                            // 豁免窗 ==6066 精确
                WRONG_CHAIN_WIN === D.spm_wrong + 150 + D.spm_hint + 300 &&   // =2016+150+3600+300（重合成实长）
                FIX_WRONG_WIN === 4452 &&                              // ch4 找错链窗=spm_fix_wrong 4152+300
                STAMP_WIN === 2316 && STAMP_WIN === D.spm_right + 300 &&  // 盖对窗=2016+300 精确
                SHAKE_MS <= D.spm_wrong + 150 &&                        // b37 R3：首错演出锁 ≤2166（禁覆盖豁免窗）
                TUT_WATCH_WAIT >= D.spm_tut_watch + 300 &&              // watch 延 ≥3492
                TUT_TURN_WAIT >= D.spm_tut_turn + 300 &&                // turn 延 ≥2052
                (2620 + 400) >= D.spm_right + 300 &&                    // celebrate 3020 ≥ 2316
                estMsV(SPEC_TASK_SAY[1]) === 13 * 345 + 600 &&          // estMs 全字符口径（13 字最长任务句）
                estMsV(SPEC_TASK_SAY[0]) === 12 * 345 + 600;            // 12 字次长任务句
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
               src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;   // A：启动 lim-1+winFlow null
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
               src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
               src.indexOf('idle > 30000') >= 0;   // B：救援双锚（14s 方向级独立节流/30s 答案级）
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&                       // C：存档版本 1.0（core）
               coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&            // C：存档键名
               src.indexOf("KIDS.init({ game: 'stamp'") >= 0;              // C：本款存档键 kidsgame_stamp
  const srcE = src.indexOf('sv.stamp && sv.stamp.tutSeen') >= 0;   // E：行为分流先查教学特例
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&   // F：生成关实算 dch-1
               src.indexOf('(ci + 1)' + ' % 4') < 0;   // 禁章序右移（检索串拼接防 verify 源码自匹配）
  const srcI = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_WIN') >= 0 &&
               src.indexOf('wrongChainUntil = Date.now() + FIX_WRONG_WIN') >= 0 &&   // I：双链豁免窗赋值
               src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
               src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&   // I：豁免窗+救援守卫+重置
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer') >= 0 &&   // I 补：盖印豁免窗 guard
               src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && j !== q.badIdx') >= 0;     // I 补：找错豁免窗 guard
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0 &&          // J：语义句 10s 节流在场
               src.indexOf('cur.flat < 3') >= 0;   // J：flat<3 每错必播（b36 m3 教学迷你关 flat=-1 字面）
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
               src.indexOf('function rescueTick()') >= 0;   // K：面板守卫+命名函数
  const srcD = src.indexOf("replayAnim(trayEl, 'bump')") >= 0;           // D：吞输入轻叮配容器 bump
  const srcN = src.indexOf('KIDS.voice.play(q.sayKey, q.sayText)') >= 0 &&   // 题面任务句=voice.play（clip 优先/TTS 回退——去泄题）
               src.indexOf('{ key' + ': null') < 0;   // N 防误用：queue 链无 keyless 段（检索串拼接防 verify 源码自匹配）
  const SPEC_CHAPTER_HINTS = { 1: '花边升级啦，一样的图案也会手拉手排队', 2: '下一种花边，颜色和形状都有自己的规律哦',
                               3: '花边里会藏一枚盖错的章，把它找出来', 4: '新的花边来啦，看清规律继续盖' };
  const SPEC_GEN_HINTS = ['三色花边转着排，看清再盖', '双同花边手拉手，找对规律',
                          '颜色形状两条线，都要看清', '花边医生查错章，把它找出来'];
  const srcHint = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   // 双录独立硬编码对账
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
  const contractOk = srcA && srcB && srcC && srcD && srcE && srcF && srcI && srcJ && srcK && srcN && srcHint && srcSpeed;
  const winUnitOk = winOk && contractOk;
  if (winUnitOk) npass++;
  units.windows = { ok: winUnitOk, win: winOk, A: srcA, B: srcB, C: srcC, D: srcD, E: srcE, F: srcF,
                    I: srcI, J: srcJ, K: srcK, N: srcN, hints: srcHint };

  /* ---- ⑩ confirmChain：确认链构成（__lastQueue===['spm_right'] 单 clip；题面任务句走
       voice.play 不动 __lastQueue——SPEC v3 明示；flat25 dch=1 next 型——flat20 dch=4
       fix 型先找错链不适用单拍断言） ---- */
  total++;
  startLevel(25);
  await unlocked();
  const q10 = window.ST.quiz;
  const goodI10 = deriveAnswerV(q10);
  const h0 = window.__queueHist.length;      // 订阅起点
  const r10 = await window.ST.tapStamp(goodI10);
  const LQ = window.__lastQueue;
  const chainOk10 = r10 === 'stamped' &&
                    LQ && LQ.length === 1 && LQ[0] === 'spm_right' &&        // 确认链=right 单 clip
                    JSON.stringify(LQ) === JSON.stringify(['spm_right']) &&
                    !keylessLast(LQ) &&                                     // 全 clip 无 keyless（契约 N）
                    window.__queueHist.slice(h0).some(h =>
                      h.length === 1 && h[0] === 'spm_right');
  if (chainOk10) npass++;
  units.confirmChain = { ok: chainOk10, r: r10,
                         queue: LQ && LQ.map(p => typeof p === 'string' ? p : JSON.stringify(p)) };

  /* ---- ⑪ save：真实写档链（init stamp→autoSolve 通关→localStorage 更新，测后还原） ---- */
  total++;
  const origSave = window.__stOrig.save, origPersist = window.__stOrig.persist;
  const origLS = localStorage.getItem('kidsgame_stamp');
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       // 还原真函数（init 用）
    KIDS.store.persist = origPersist;
    localStorage.removeItem('kidsgame_stamp');
    KIDS.init({ game: 'stamp', title: '规律画画' });   // 真实 init：store.load 新档 v1.0
    startLevel(0);                               // verify 页 freshTut 恒 false → 直接开题
    const a11 = await window.ST.autoSolve();     // 真实判定链通关 → winFlow verify 分支 persistWin
    const raw = localStorage.getItem('kidsgame_stamp');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps === 5 && j && j.v === '1.0' && j.game === 'stamp' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——U12 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_stamp');
  else localStorage.setItem('kidsgame_stamp', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  /* ---- ⑫ realPath：预置存档 v1.0+tutSeen → start(0) 非教学直达题面（契约 E 分流；
       审查 m4：try/finally 保异常时 origLS 也恢复） ---- */
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'stamp', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, stamp: { tutSeen: true } };
  let q12 = null, realOk = false;
  try {
    localStorage.setItem('kidsgame_stamp', JSON.stringify(pre));
    KIDS.store.load();                             // 重读预置档
    window.__stDemoR = null;                       // 教学实证清零（非教学路径不应重设）
    window.ST.start(0);
    await unlocked();
    q12 = window.ST.quiz;
    realOk = state.tut === 'none' && window.__stDemoR === null &&
             q12 && q12.kind === 'next' && q12.unit === 'ABC' && q12.seq.join('') === 'FSHFSH' &&
             q12.blank === 6 && q12.picks.length === 3 &&
             q12.step === 0 && q12.miss === 0 && q12.badIdx === -1 &&
             q12.say === SPEC_TASK_SAY[0] &&
             q12.answer === deriveAnswerV(q12) &&        // answer 独立推导
             window.ST.currentLevel.flat === 0 && window.ST.currentLevel.n === 5 &&
             (KIDS._save() || {}).v === '1.0' &&
             typeof window.ST === 'object' && typeof window.ST.tapStamp === 'function' &&
             typeof window.ST.tapCell === 'function' &&  // ch4 找错钩子在场（b29 坑⑥ 同暴露）
             typeof window.ST.autoSolve === 'function';
  } finally {
    /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写）——异常路径也执行 */
    if (origLS === null) localStorage.removeItem('kidsgame_stamp');
    else localStorage.setItem('kidsgame_stamp', origLS);
    KIDS._save = function () { return { levels: {} }; };
    KIDS.store.persist = function () {};
  }
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { seq: q12.seq.join(''), blank: q12.blank, n: q12.picks.length } };

  const out = { game: 'stamp', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__stVlog = out;                          // __vlog 计数（外部断言挂点，任务书钩子）
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL ' + (total - npass);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text 并留播报历史（题面任务句走 play——双录 __lastVoiceKey/
     __lastVoiceText）；voice.queue 记录拼播链（__lastQueue+__queueHist 全史） */
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
