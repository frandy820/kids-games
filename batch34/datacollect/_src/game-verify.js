/* ================= ?verify=1 自检（仅 verify 分支加载执行；加载即跑 runVerify——
   外部脚本先等 document.title='VERIFY PASS n/n' 再驱动，b17 坑/b29 坑⑥）
   14 单元（任务书 §verify r14 定版）：
   ① 结构：场景 DOM 动物全类只数===scene 真值（含 g[data-cat] 锚/成对布点）
      /图表行 15 格槽+图例徽章「1格=2只」+dch4 双条带（上次淡格数=scene1/2）
      /TTS 数字 2-60 偶映射表全量 30 条/DOM 无 undefined·NaN 文本/契约 O 按钮显式 color
   ② 教学三段（watch→turn→help 首题定制形态）：tutorialWatch 真实走完（stub 存档）
      → __dcDemoR='right'+tut='help'+q1=chick 10（SPEC §3-r14 定版：rabbit 8→4 格演示）
      +watch 折算 ≤16s；再模拟儿童点亮 q1 → 帮→独（tut='solo'）
   ③ 逐关驱动 flat0-19：count 逐格 tapCell 0..answer/2-1 → 'lit' → 点满自动 right 推进；
      数值题（sum/diff/mostdiff/change/totalchange）tapCard(answerIdx)。answer 断言=从
      quiz.scene/scene1 独立推导（sum=和/diff=差/mostdiff=max-min/change=Δ 符号同 up/
      totalchange=ΣΔ），禁读 quiz.answer 直比（推导后等值对账）
   ④ 契约 M 帧内容断言：数值层（scene/scene1）/场景 DOM（beast 只数）/图表 DOM（点亮格）
      三层逐题对账 + 累积行（已完类=其真值/2 格）+ 点亮格 svg g[data-cat]===ask
      + dch4 上次条带淡格静态数===scene1/2
   ⑤ 错路径：count 超点第 n+1 格 → wrong+miss+错格熄灭已点保留；豁免窗内二击被吞
      （false 不计）；窗后二错照计 miss（契约 I 补）+answer/2 格 breathe；
      数值题错卡 → wrong+miss（可重点不灰化）；吞输入配 bump（家族 D）
   ⑥ 撤回路径：点亮格再点 → 'off' 不计 miss、grid 减一、settle 取消（点满后撤回
      一格不自动判对）；重亮恢复自动判对；撤回不响叮（__dcDing 只记点亮）
   ⑦ 星级口径：0 错 3★/1-2 错 2★/≥3 错 1★（永不 0 星）
   ⑧ 生成关 flat20-39：dch=seeded ri(1,4)（mulberry32(flat*7919+809) verify 独立复算）
      +题型序列按章+值域先验+structWhy 全 5 题+确定性（同 flat 两次 JSON 一致）
      +UI 全驱 flat20+反启发式锚（40 关正解集∩干扰集 ≥5——wordprob r13 范式）
   ⑨ 错链豁免窗静态值：wrongChainUntil=Date.now()+4146 ≥ 1800+150+1896+300=4146
      +救援 interval 守卫+startLevel 重置（契约 I/I 补源码级）+家族 A/B/D/E/F/J/K/N 源码级
   ⑩ 确认链构成（家族 G/H 动态窗；T46 化全 clip）：count=[dc_right,名音,dc_n_N]/
      change=[dc_right,名音,dc_s_duo|shao,dc_n_N]/其余=[dc_right,dc_s_yg|xc(/duo|shao),dc_n_N]
      +题面链六族+错链=[dc_wrong,dc_hint]+动态窗 ≥ 链实长恒验算
   ⑪ 写档：预置 kidsgame_datacollect v1.0 → KIDS.init 真实装载（firstDay 保留=非重置）
      → KIDS.level.pass 通关写档 → localStorage rec 更新（origLS 测后恢复——审查 M1 前科）
   ⑫ 真实路径：fresh v1.0 存档（无 1-0 无 tutSeen）+ start(0) 首关教学链形态
      （flat0 锚：scene={rabbit:8,chick:10}/ask=rabbit/qbar/DOM）+教学分支源码在场
      +window.DC/__dcDemoR 真实页暴露（b29 坑⑥）
   ⑬ 时长模型（r14 门禁）：40 关 modeled 独立副本逐关对账（estMs/DECIDE/步式全独立重列）
      +全部 ≥ LEVEL_MIN_MS 40000 + 最低值精确防回漂（dMin === <精确值>）+voiceWin≤DECIDE 全域验算
   ⑭ 布局 simView（横当前视口+竖 body.port 类通道双量测）：图例在场且视口内
      +格 15/行（8 列 grid 两行）+横格 ≥40/竖 ≥36+数值卡横 ≥96/竖 ≥84
      +dch4 双条带两带格数锚+ox==0+全按钮 ≥36（.k-parentbtn 豁免）；量测前清 .pop
   结果写 #verify-result + window.__dcVlog + window.VERIFY（units {name,ok,note}）
   + document.title='VERIFY PASS n/n'/'VERIFY FAIL' */
async function runVerify() {
  document.body.classList.add('verify');
  const origLS = localStorage.getItem('kidsgame_datacollect');   /* 保存真实档（⑪⑫写档测试前——审查 M1：测后恢复，防毁玩家档） */
  const units = {};
  let npass = 0, total = 0;
  const unit = (name, ok, note) => {
    total++;
    if (ok) npass++;
    units[name] = { ok: !!ok, note: note === undefined ? null : note };
    return !!ok;
  };

  /* SPEC-BATCH34 §0.84/§3-r14 文字独立重列（禁抄页面 ANIMALS6/CATNAME/NUMCN/文案） */
  const SPEC_CATS = ['rabbit', 'bird', 'cat', 'chick', 'sheep', 'duck'];   // 类目封闭 6
  const SPEC_NAMES = { rabbit: '兔子', bird: '小鸟', cat: '小猫',
                       chick: '小鸡', sheep: '小羊', duck: '小鸭' };
  /* 契约 L：偶 2-60 全量 30 条——中文数词规则独立推导（非抄页面表；2=两 特例） */
  const SPEC_NUMCN = {};
  {
    const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    for (let v = 2; v <= 60; v += 2) {
      if (v === 2) SPEC_NUMCN[v] = '两';
      else if (v < 10) SPEC_NUMCN[v] = D[v];
      else if (v === 10) SPEC_NUMCN[v] = '十';
      else if (v < 20) SPEC_NUMCN[v] = '十' + D[v % 10];
      else if (v % 10 === 0) SPEC_NUMCN[v] = D[v / 10] + '十';
      else SPEC_NUMCN[v] = D[Math.floor(v / 10)] + '十' + D[v % 10];
    }
  }
  const SPEC_DUR = { dc_tut_watch: 3264, dc_tut_turn: 1896, dc_hint: 1896, dc_right: 2448,
                     dc_wrong: 1800, dc_q_count: 1752, dc_q_most: 1992,
                     dc_q_sum: 1848, dc_q_diff: 1992, dc_q_change_up: 2448, dc_q_change_dn: 2496,
                     dc_q_total_up: 2160, dc_q_total_dn: 2184, dc_scale: 2208,
                     dc_n_rabbit: 1368, dc_n_bird: 1440, dc_n_cat: 1368,
                     dc_n_chick: 1440, dc_n_sheep: 1392, dc_n_duck: 1392,   // _clipdur34.json 实长
                     dc_s_yg: 1320, dc_s_xc: 1440, dc_s_duo: 1296, dc_s_shao: 1344,
                     dc_n_34: 1848 };                                       // T46 尾段（voice/clips 实测 09-19；n_34=数词 max）
  const SPEC_CHAPTER_HINTS = { 1: '数完算一算，一共几只', 2: '比一比谁多谁少，相差几只',
                               3: '再调查一次，看看变化', 4: '新的调查开始啦，接着数' };
  const SPEC_GEN_HINTS = ['两个两个数，点亮表格', '数一数，算一算一共几只',
                          '比一比，相差几只', '两次调查，比比变化'];
  const SPEC_LEGEND = '1格=2只';                               // r14 换算图例徽章句
  const SPEC_KIND_SEQ = {                                      // 章型题序（数值题恒居制表完成后）
    1: ['count', 'count', 'count', 'count', 'count'],
    2: ['count', 'count', 'count', 'sum', 'diff'],
    3: ['count', 'count', 'count', 'sum', 'mostdiff'],
    4: ['count', 'count', 'change', 'change', 'totalchange']
  };
  const CHAIN_GAP = 150, WIN_PAD = 300;          // core queue 段间 150ms / 窗余量 300（家族 G/H）
  const WRONG_CHAIN = SPEC_DUR.dc_wrong + CHAIN_GAP + SPEC_DUR.dc_hint + WIN_PAD;   // =4146（SPEC §4）
  const MIN_LEVEL_MS = 40000;                                  // LEVEL_MIN_MS（r14 门禁）
  const MIN_EXACT = 98040;                                     // 40 关 modeled 最低值精确锚（2026-09-15 实测 flat18；防回漂禁改）
  /* 生成关 dch 独立复算（SPEC §0.84 公式重实现，禁调页面 genLevel） */
  const m32 = a => { let s = a | 0; return () => { s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const riInd = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const expDch = flat => flat < 20 ? (Math.floor(flat / 5) % 4) + 1 : riInd(m32(flat * 7919 + 809), 1, 4);
  const estN = n => n * 345 + 600;              // b25 定版算式独立重列（main 的 estMs 为字符串口径——①直用其本体断言）
  /* Mj-1 防回归（core voice.queue 弃尾语义）：keyless TTS 段播完即 return 丢弃后续段
     ——凡含 keyless 段的拼播链该段必须居末位 */
  const keylessLast = parts => !parts || !parts.length ? false :
    !!(parts[parts.length - 1] && parts[parts.length - 1].key === null &&
       parts[parts.length - 1].text);
  const sceneMax = sc => { let best = null; for (const k in sc) if (best === null || sc[k] > sc[best]) best = k; return best; };
  const sceneMin = sc => { let best = null; for (const k in sc) if (best === null || sc[k] < sc[best]) best = k; return best; };
  const sceneDomCount = cat => sceneEl.querySelectorAll('.beast[data-cat="' + cat + '"]').length;
  const waitFor = async (pred, ms) => {
    let g = 0;
    while (g++ < Math.max(1, Math.ceil(ms / 25)) && !pred()) await wait(25);
    return !!pred();
  };
  const capture = { confirmCount: null, confirmChange: null, wrong: null };
  /* ② 将 stub KIDS._save/store.persist——留底真实实现供 ⑪ 写档单元恢复（stub 下 level.pass
     写进抛弃对象=假通过，验证假阴性坑总集「hidden 假通过」同族） */
  const kSaveOrig = KIDS._save, kPersistOrig = KIDS.store.persist;
  /* 演出/确认窗内 tapCell/tapCard 可能吞 null——驱动循环轮询重试（任务纪律：演出窗吞 null） */
  const tapOk = async i => {
    for (let g = 0; g < 240; g++) {
      const r = await window.DC.tapCell(i);
      if (r !== null) return r;
      await wait(25);
    }
    return null;
  };
  const cardOk = async i => {
    for (let g = 0; g < 240; g++) {
      const r = await window.DC.tapCard(i);
      if (r !== null) return r;
      await wait(25);
    }
    return null;
  };
  /* 数值题 answer 独立推导（SPEC §3-r14 运算定义——禁读 q.answer 当期望源） */
  const expectAnswer = q => {
    if (q.kind === 'sum') return q.scene[q.ask[0]] + q.scene[q.ask[1]];
    if (q.kind === 'diff') return Math.abs(q.scene[q.ask[0]] - q.scene[q.ask[1]]);
    if (q.kind === 'mostdiff') return q.scene[sceneMax(q.scene)] - q.scene[sceneMin(q.scene)];
    if (q.kind === 'change') return Math.abs(q.scene[q.ask] - q.scene1[q.ask]);
    let s = 0;
    for (const c in q.scene) s += Math.abs(q.scene[c] - q.scene1[c]);
    return s;                                                  // totalchange
  };
  /* verify 内引擎直驱到第 step 题（快进面——count 直驱点满+engSettle / 数值题 engTapCard） */
  const engAdvanceTo = (flat, step) => {
    window.DC.start(flat);
    let g = 0;
    while (cur && !cur.done && cur.step < step && g++ < 24) {
      const q = cur.quizzes[cur.step];
      if (q.kind === 'count') {
        q._opened = true;
        cur.rowsLit[q.ask] = [];
        for (let i = 0; i < countSteps(q); i++) cur.rowsLit[q.ask].push(i);
        engSettle(cur);
      } else engTapCard(cur, q.answerIdx);
    }
    renderQuiz();
    return window.DC.quiz;
  };

  /* ---- ① 结构（场景成对 SVG 动物全类/图表 15 格+图例+双条带/TTS 数字表/DOM 无 undefined） ---- */
  startLevel(0);
  {
    const q = window.DC.quiz;
    const sceneOk = !!q && Object.keys(q.scene).length === 2 &&
      q.scene[SPEC_CATS[0]] === 8 && q.scene['chick'] === 10 &&              // flat0 锚真值
      Object.keys(q.scene).every(c => SPEC_CATS.indexOf(c) >= 0) &&
      Object.keys(q.scene).every(c => sceneDomCount(c) === q.scene[c]) &&
      sceneEl.querySelectorAll('.beast').length === 18 &&                    // 总只数 8+10（成对布点）
      Array.from(sceneEl.querySelectorAll('.beast')).every(b => {
        const g = b.querySelector('svg > g[data-cat]');
        return !!g && g.dataset.cat === b.dataset.cat;                        // 契约 M 场景锚
      });
    const rows = Array.from(chartEl.querySelectorAll('.row'));
    const legendOk = chartEl.querySelectorAll('.legend').length === 1 &&
      chartEl.querySelector('.legend').textContent.indexOf(SPEC_LEGEND) >= 0;
    const chartOk = rows.length === 2 &&
      rows.every(r => SPEC_CATS.indexOf(r.dataset.cat) >= 0 &&
        r.querySelectorAll('.band.cur .cell').length === CELLS &&           // 15 格槽
        r.querySelectorAll('.band').length === 1 &&                          // dch1-3 单条带
        Number(r.dataset.v) === q.scene[r.dataset.cat] &&
        r.querySelector('.rlabel .rn').textContent === SPEC_NAMES[r.dataset.cat]) &&
      chartEl.dataset.kind === 'count' &&
      chartEl.querySelectorAll('.row.ask').length === 1 &&
      chartEl.querySelector('.row.ask').dataset.cat === q.ask;
    const numKeys = Object.keys(NUMCN).map(Number).sort((a, b) => a - b);
    const numOk = numKeys.length === 30 &&                                   // 契约 L 全量偶 2-60
      numKeys.every((v, i) => v === i * 2 + 2) &&
      numKeys.every(v => NUMCN[v] === SPEC_NUMCN[v]) && NUMCN[2] === '两' &&
      estMs('两只') === 1290;                                                // 家族 T 全字符口径
    const txt = document.getElementById('game').textContent;
    const txtOk = txt.indexOf('undefined') < 0 && txt.indexOf('NaN') < 0;
    const probe = document.createElement('button');                          // 契约 O：自建 button 显式 color
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const oOk = getComputedStyle(probe).color === 'rgb(74, 59, 46)';
    probe.remove();
    unit('structure', sceneOk && chartOk && legendOk && numOk && txtOk && oOk,
      { scene: sceneOk, chart: chartOk, legend: legendOk, numcn: numOk,
        text: txtOk, btnColor: oOk });
  }

  /* ---- ② 教学三段（watch→turn→help 首题定制形态）
     教学时长口径（r13 wordprob 范式）：wall 预算不走 verify 折算（SPEED 缩放噪声）——
     由 build.py TUT_SUM 名义分账（15920≤16000）+ _selftest P2 真实页（SPEED=1）实测把关 ---- */
  {
    KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（后续单元沿用）
    KIDS.store.persist = function () {};
    startLevel(0);
    const t0 = Date.now();
    await tutorialWatch();
    const tw = (Date.now() - t0) / SPEED;                      // 折算值仅 note 参考（非判据）
    const q1 = cur.quizzes[1];
    const watchOk = window.__dcDemoR === 'right' &&           // 看：演示数兔 8 只点亮 4 格→自动 right
      state.tut === 'help' && cur.step === 1 &&
      q1.kind === 'count' && q1.ask === 'chick' && q1.answer === 10 &&   // turn：你来数一数（鸡 10 只）
      window.__lastVoiceKey === 'dc_tut_turn';
    /* 帮→独：模拟儿童点满 q1（chick 10→5 格）→ settle 自动判对 → tut='solo' 放手 */
    const n1 = q1.answer / 2;
    const lits = [];
    for (let i = 0; i < n1; i++) lits.push(await window.DC.tapCell(i));
    const adv = await waitFor(() => cur.step === 2, 4000);
    const soloOk = lits.every(r => r === 'lit') && adv &&
      state.tut === 'solo' && !ghostEl.classList.contains('show');
    unit('tutorial', watchOk && soloOk,
      { demoR: window.__dcDemoR, tut: state.tut, turnQ: q1.ask + ':' + q1.answer,
        watchMsRef: Math.round(tw), solo: soloOk });
  }

  /* ---- ③ 逐关驱动 flat0-19（answer 从 scene/scene1 独立推导；演出窗 tap 吞 null 轮询重试） ---- */
  const driveBad = [], frameBad = [];
  {
    const driveQ = async (flat, k, deep) => {
      const q = window.DC.quiz;
      if (!q || q.step !== k) return 'f' + flat + 'q' + k + ' notready';
      /* 独立推导（禁读 quiz.answer 当期望源）：count=scene[ask] / 数值题=expectAnswer */
      if (q.kind === 'count') {
        const exp = q.scene[q.ask];
        if (q.answer !== exp) return 'f' + flat + 'q' + k + ' ans=' + q.answer + ' exp=' + exp;
        for (let i = 0; i < exp / 2; i++) {
          const r = await tapOk(i);
          if (r !== 'lit') return 'f' + flat + 'q' + k + ' tap' + i + '=' + r;
          if (deep) {   /* ④ 点亮格数===grid 长度 + 点亮格 svg g[data-cat]===ask（逐格） */
            const g2 = window.DC.quiz.grid;
            const row = chartEl.querySelector('.row[data-cat="' + q.ask + '"]');
            const litEls = row.querySelectorAll('.band.cur .cell.lit');
            if (litEls.length !== g2.length) frameBad.push('f' + flat + 'q' + k + ' litN!=grid');
            const anchors = row.querySelectorAll('.band.cur .cell.lit svg > g[data-cat]');
            if (anchors.length !== g2.length || !Array.from(anchors).every(a => a.dataset.cat === q.ask))
              frameBad.push('f' + flat + 'q' + k + ' litAnchor');
          }
        }
        return null;
      }
      const exp = expectAnswer(q);                            // 数值题独立推导
      if (q.answer !== exp) return 'f' + flat + 'q' + k + ' ' + q.kind + ' ans=' + q.answer + ' exp=' + exp;
      if (!q.options || q.options.length !== 4 || q.options[q.answerIdx] !== exp)
        return 'f' + flat + 'q' + k + ' cardBad';
      const r = await cardOk(q.answerIdx);
      if (r !== 'right' && r !== 'done') return 'f' + flat + 'q' + k + ' card=' + r;
      if (deep) {                                              /* ④ 数值题：图表行保持已完类点亮 */
        const asked = genLevel(flat).quizzes.slice(0, k).filter(x => x.kind === 'count').map(x => x.ask);
        for (const c in q.scene) {
          const row = chartEl.querySelector('.row[data-cat="' + c + '"]');
          const litN = row.querySelectorAll('.band.cur .cell.lit').length;
          const isDone = asked.indexOf(c) >= 0;
          if (isDone && litN !== q.scene[c] / 2) frameBad.push('f' + flat + 'q' + k + ' accum ' + c + '=' + litN);
        }
      }
      return null;
    };
    const driveLevel = async (flat, deep) => {
      window.DC.start(flat);
      const q0 = window.DC.quiz;
      if (!q0) return 'f' + flat + ' noquiz';
      const kinds = genLevel(flat).quizzes.map(x => x.kind);   // 结构信息（序列对账非 answer 源）
      if (kinds.join(',') !== SPEC_KIND_SEQ[genLevel(flat).dch].join(','))
        return 'f' + flat + ' kinds=' + kinds.join(',');
      /* 场景 DOM vs scene 真值（每关一次；beast 总数=各类和——成对布点全只在场） */
      let sum = 0;
      for (const c in q0.scene) {
        sum += q0.scene[c];
        if (sceneDomCount(c) !== q0.scene[c]) return 'f' + flat + ' sceneDom ' + c;
      }
      if (sceneEl.querySelectorAll('.beast').length !== sum) return 'f' + flat + ' beastTotal';
      if (deep && q0.scene1) {                                 /* ④ dch4 上次条带淡格静态锚 */
        const rows = Array.from(chartEl.querySelectorAll('.row'));
        for (const r of rows) {
          const n1 = Math.max(1, q0.scene1[r.dataset.cat] / 2);
          const soft = r.querySelectorAll('.band.old .cell.softlit').length;
          if (soft !== n1) return 'f' + flat + ' oldBand ' + r.dataset.cat + '=' + soft + '/' + n1;
        }
        if (chartEl.querySelectorAll('.band.old').length !== 2) return 'f' + flat + ' oldBandN';
      }
      for (let k = 0; k < 5; k++) {
        const okR = await waitFor(() => window.DC.quiz && window.DC.quiz.step === k, 1500);
        if (!okR) return 'f' + flat + 'q' + k + ' stepGate';
        const err = await driveQ(flat, k, deep);
        if (err) return err;
        const adv = await waitFor(() => {
          const c = window.DC.currentLevel;
          return c.done ? c.won : c.step === k + 1;   /* 末题 won 在确认窗后由 winFlow 置位——等它 */
        }, 6000);
        if (!adv) return 'f' + flat + 'q' + k + ' noadvance';
        if (deep && k < 4) {
          if (flat === 6 && k === 0) capture.confirmCount = window.__lastQueue;   // ⑩ count 确认链素材
          if (flat === 16 && k === 2) capture.confirmChange = window.__lastQueue; // ⑩ change 确认链素材
        }
      }
      const c = window.DC.currentLevel;
      if (!(c.done && c.won && c.miss === 0 && c.stars === 3)) return 'f' + flat + ' stars=' + c.stars;
      return null;
    };
    let allOk = true;
    for (let flat = 0; flat < 20; flat++) {
      const err = await driveLevel(flat, flat === 6 || flat === 16);   // flat6(dch2)/16(dch4) 深检
      if (err) { driveBad.push(err); allOk = false; if (driveBad.length > 4) break; }
    }
    unit('drive', allOk, { bad: driveBad.slice(0, 4) });
    const deepOk = capture.qCount !== null;                    // 深检素材采到（帧断言已并入 frameBad）
    unit('frames', frameBad.length === 0 && deepOk,            // ④ 独立单元（契约 M 三层帧对账）
      { bad: frameBad.slice(0, 4), probes: deepOk });
  }

  /* ---- ⑤ 错路径（count 超点+豁免窗吞/窗后二错；数值题错卡；吞输入 bump 家族 D） ---- */
  {
    window.DC.start(1);                                        // flat1 q0 count（dch1 值 10-20 → 5-10 格）
    const q = window.DC.quiz;
    const n = q.scene[q.ask] / 2;                              // 独立推导=格数
    for (let i = 0; i < n; i++) await window.DC.tapCell(i);
    const pW = window.DC.tapCell(n);                           // 超点第 n+1 格（settle 待决窗内）
    const wrongEl = chartEl.querySelector('.row[data-cat="' + q.ask + '"] .band.cur .cell[data-i="' + n + '"]');
    const rW = await pW;
    const miss1 = window.DC.quiz.miss === 1 && window.DC.currentLevel.miss === 1;
    const keepOk = window.DC.quiz.grid.length === n;           // 已点 n 格保留（判错不清零）
    const badNotLit = wrongEl && !wrongEl.classList.contains('lit');   // 错格熄灭（不点亮）
    const chainW = window.__lastQueue && window.__lastQueue.length === 2 &&
      window.__lastQueue[0] === 'dc_wrong' && window.__lastQueue[1] === 'dc_hint';   // 错链全 clip
    const rej = await window.DC.tapCell(n);                    // 豁免窗内二击被吞（false 不计 miss）
    const swallowOk = rej === false && window.DC.quiz.miss === 1;
    await wait(4400);                                          // 等错链豁免窗（4146+余量）过窗
    const rW2 = await window.DC.tapCell(n);                    // 窗后二错照计 miss（契约 I 补）
    await waitFor(() => window.DC.quiz.miss === 2, 3000);
    const miss2 = rW2 === 'wrong' && window.DC.quiz.miss === 2;
    const brEls = chartEl.querySelectorAll('.row[data-cat="' + q.ask + '"] .band.cur .cell.breathe');
    const breatheOk = brEls.length === n;                      // miss≥2=answer/2 格虚线框 breathe
    /* 吞输入轻叮配 bump（家族 D）：演出期点格=null+容器 bump 可见回应（恢复前取样防演出窗竞态） */
    state.locked = true;
    const nullTap = await window.DC.tapCell(0);
    const swallowD = nullTap === null && chartEl.classList.contains('bump');
    state.locked = false;
    /* 对选放行：窗内撤回+重亮（合法操作不吞）→ 自动判对推进 */
    const off = await window.DC.tapCell(0);
    const on = await window.DC.tapCell(0);
    const adv = await waitFor(() => window.DC.currentLevel.step === 1, 4000);
    const passOk = off === 'off' && on === 'lit' && adv;
    /* 数值题错卡（flat6 sum——dcStartNumeric 快进；startLevel 重置节流锚=首错必播）
       miss2C 快照须在 cR 前取：cR 答对即推进下一题（miss 归 0），cR 后再读恒 false */
    const sq = window.DC.dcStartNumeric(6);
    let cardOkW = false;
    if (sq && sq.kind !== 'count' && sq.options) {
      const badIdx = sq.options.findIndex((v, i) => i !== sq.answerIdx);
      const c1 = await window.DC.tapCard(badIdx);
      const rejC = await window.DC.tapCard(badIdx);            // 豁免窗内二击吞（false 不计 miss）
      await wait(4400);                                        // 等错链豁免窗过窗
      const c2 = await window.DC.tapCard(badIdx);              // 窗后二错照计 miss
      await waitFor(() => window.DC.quiz.miss === 2, 3000);
      const miss2C = window.DC.quiz && window.DC.quiz.miss === 2;   // cR 前快照（推进即失效）
      const brCard = !!(cardEl(sq.answerIdx) && cardEl(sq.answerIdx).classList.contains('breathe'));
      const cR = await window.DC.tapCard(sq.answerIdx);        // 对选放行 → 推进
      cardOkW = c1 === 'wrong' && rejC === false && c2 === 'wrong' &&
        miss2C && brCard && (cR === 'right' || cR === 'done');
    }
    unit('wrong', miss1 && keepOk && badNotLit && chainW && swallowOk && miss2 &&
      breatheOk && passOk && swallowD && cardOkW,
      { miss1: miss1, keep: keepOk, badCell: !!badNotLit, chain: chainW, swallow: swallowOk,
        miss2: miss2, breathe: breatheOk, relight: passOk, card: cardOkW });
    capture.wrong = ['dc_wrong', 'dc_hint'];
  }

  /* ---- ⑥ 撤回路径 ---- */
  {
    window.DC.start(4);                                        // flat4 q0 count（dch1）
    const q = window.DC.quiz;
    const n = q.scene[q.ask] / 2;
    const ding0 = window.__dcDing || 0;
    const a = await window.DC.tapCell(0);
    const b = await window.DC.tapCell(0);                      // 撤回
    const ding1 = window.__dcDing || 0;
    const offOk = a === 'lit' && b === 'off' &&
      window.DC.quiz.grid.length === 0 &&                      // grid 减一
      window.DC.quiz.miss === 0 && window.DC.currentLevel.miss === 0 &&   // 不计 miss
      ding1 - ding0 === 1;                                     // 撤回不响叮（只点亮记数）
    for (let i = 0; i < n; i++) await window.DC.tapCell(i);    // 点满
    const c = await window.DC.tapCell(0);                      // 待决窗内撤回一格→settle 取消
    const noAdv = await waitFor(() => window.DC.currentLevel.step === 1, 1200);
    const cancelOk = c === 'off' && !noAdv && window.DC.quiz.grid.length === n - 1;
    const d = await window.DC.tapCell(0);                      // 重亮→点满→自动判对
    const adv = await waitFor(() => window.DC.currentLevel.step === 1, 4000);
    unit('withdraw', offOk && cancelOk && d === 'lit' && adv,
      { off: offOk, cancel: cancelOk, relight: adv });
  }

  /* ---- ⑦ 星级口径（引擎级构造直测） ---- */
  {
    const L = genLevel(3);
    L.retries = 0; const st3 = engStars(L) === 3;
    L.retries = 1; const st2a = engStars(L) === 2;
    L.retries = 2; const st2b = engStars(L) === 2;
    L.retries = 3; const st1 = engStars(L) === 1;
    L.retries = 9; const stFloor = engStars(L) === 1;          // 永不 0 星
    unit('stars', st3 && st2a && st2b && st1 && stFloor,
      { s3: st3, s2: st2a && st2b, s1: st1, floor: stFloor });
  }

  /* ---- ⑧ 生成关 flat20-39（dch 独立复算+先验静态验算+确定性+反启发式锚+UI 全驱 flat20） ---- */
  {
    const bad = [];
    const genDch = {};
    for (let flat = 20; flat < 40; flat++) {
      const L1 = genLevel(flat), L2 = genLevel(flat);
      genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
      if (JSON.stringify(L1.quizzes) !== JSON.stringify(L2.quizzes)) bad.push('f' + flat + ' det');
      if (L1.dch !== expDch(flat)) bad.push('f' + flat + ' dch=' + L1.dch + ' exp=' + expDch(flat));
      if (L1.quizzes.map(x => x.kind).join(',') !== SPEC_KIND_SEQ[L1.dch].join(','))
        bad.push('f' + flat + ' kinds');
      if (L1.place.length !== L1.values.reduce((a, b) => a + b, 0)) bad.push('f' + flat + ' placeN');
      for (let qi = 0; qi < 5; qi++) { const why = structWhy(L1, qi); if (why) bad.push('f' + flat + 'q' + qi + ' ' + why); }
      if (bad.length > 5) break;
    }
    const allDch = [1, 2, 3, 4].every(d => genDch[d] > 0);
    /* 反启发式锚（wordprob r13 范式）：40 关正解集∩干扰集 ≥5——干扰池含类别值
       （类别值=他题 count 正解）与运算混淆值（=sum/diff 题正解），双现自然达成 */
    const answerSet = new Set(), distrSet = new Set();
    for (let flat = 0; flat < 40; flat++) {
      for (const q of genLevel(flat).quizzes) if (q.options) {
        answerSet.add(q.answer);
        q.options.forEach((v, i) => { if (i !== q.answerIdx) distrSet.add(v); });
      }
    }
    let inter = 0;                                             // 正解集∩干扰集（40 关口径）
    answerSet.forEach(v => { if (distrSet.has(v)) inter++; });
    const anchorOk = inter >= 5;
    /* UI 全驱 flat20（生成关 hook 路径） */
    window.DC.start(20);
    let genDriveOk = true, genReason = 'ok';
    for (let k = 0; k < 5; k++) {
      const q = window.DC.quiz;
      if (!q || q.step !== k) { genDriveOk = false; genReason = 'gate' + k; break; }
      if (q.kind === 'count') {
        const exp = q.scene[q.ask];
        if (q.answer !== exp) { genDriveOk = false; genReason = 'ans' + k; break; }
        for (let i = 0; i < exp / 2; i++) {
          const r = await tapOk(i);
          if (r !== 'lit') { genDriveOk = false; genReason = 'tap' + k + '.' + i + '=' + r; break; }
        }
        if (!genDriveOk) break;
      } else {
        const exp = expectAnswer(q);
        if (q.answer !== exp || q.options[q.answerIdx] !== exp) { genDriveOk = false; genReason = 'num' + k; break; }
        const r = await cardOk(q.answerIdx);
        if (r !== 'right' && r !== 'done') { genDriveOk = false; genReason = 'card' + k + '=' + r; break; }
      }
      if (k < 4) {
        if (!(await waitFor(() => { const c = window.DC.currentLevel; return c.done ? c.won : c.step === k + 1; }, 6000)))
          { genDriveOk = false; genReason = 'adv' + k; break; }
      }
    }
    const genDone = genDriveOk && window.DC.currentLevel.done && window.DC.currentLevel.stars === 3;
    unit('genlevels', bad.length === 0 && allDch && anchorOk && genDone,
      { bad: bad.slice(0, 4), genDch: genDch, anchor: inter, drive: genDone, reason: genReason });
  }

  /* ---- ⑨ 错链豁免窗静态值 + 契约 I/I 补源码级（读 game 合并 script 文本——第 3 个 script 块） ---- */
  {
    const src = document.querySelectorAll('script')[2].textContent;
    const winOk = WRONG_CHAIN === 4146 &&                                     // SPEC §4 算式独立复算
      4146 >= SPEC_DUR.dc_wrong + CHAIN_GAP + SPEC_DUR.dc_hint + WIN_PAD &&
      /* T46 化确认链最坏值（change 4 段）独立复算：2448+150+1440+150+1344+150+1848+300=7830 */
      SPEC_DUR.dc_right + CHAIN_GAP + SPEC_DUR.dc_n_bird + CHAIN_GAP +
        SPEC_DUR.dc_s_shao + CHAIN_GAP + SPEC_DUR.dc_n_34 + WIN_PAD === 7830;
    const litWin = src.indexOf('wrongChainUntil = Date.now() + 4146') >= 0;   // 静态字面（T11 同口径）
    const guard = src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0;
    const reset = src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;
    const swall = src.indexOf('Date.now() < wrongChainUntil && exceed') >= 0;   // 错点吞（I 补）
    const swallC = src.indexOf('Date.now() < wrongChainUntil && i !== q.answerIdx') >= 0;   // 错卡吞（I 补）
    const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
      src.indexOf('function rescueTick()') >= 0;
    const pA = 'nextHint(lim -' + ' 1)';                        // 拼接防 verify 源码自匹配（计数断言）
    const srcA = src.indexOf(pA) >= 0 && src.indexOf('nextHint(null)') >= 0 &&
      src.split(pA).length === 2;                              // 启动处恰 1
    const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
      src.indexOf('idle > 14000') >= 0 && src.indexOf('idle > 30000') >= 0;   // 救援双锚
    const srcD = src.indexOf("replayAnim(chartEl, 'bump')") >= 0;             // 吞输入配 bump
    const srcE = src.indexOf('sv.datacollect && sv.datacollect.tutSeen') >= 0;
    const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&
      src.indexOf('(ci + 1)' + ' % 4') < 0;                                   // 禁章序右移（拼接防自匹配）
    const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;
    const portCls = src.indexOf('applyPort') >= 0;                            // 竖屏双通道 JS 在场
    /* 契约 N T46 化：零 keyless（确认尾段=dc_n_/dc_s_ clip 拼播）——出现即 fail */
    const keylessOk = (src.match(/\{\s*key:\s*null/g) || []).length === 0 &&
      src.indexOf('.concat(numSegs(q))') >= 0;                                // 尾段拼播素材在场
    const hintOk = [1, 2, 3, 4].every(i => CHAPTERS[i].hint === SPEC_CHAPTER_HINTS[i]) &&
      GEN_HINTS.every((h, i) => h === SPEC_GEN_HINTS[i]) &&
      [4, 9, 14, 19].every(f => nextHint(f) === SPEC_CHAPTER_HINTS[Math.floor(f / 5) + 1]) &&
      [24, 29, 34, 39].every(f => nextHint(f) === SPEC_GEN_HINTS[genLevel(f + 1).dch - 1]);   // F 实算
    unit('chainwin', winOk && litWin && guard && reset && swall && swallC &&
      srcK && srcA && srcB && srcD && srcE && srcF && srcJ && portCls && keylessOk && hintOk,
      { formula: winOk, literal: litWin, guard: guard, reset: reset, swallow: swall,
        swallowCard: swallC, K: srcK, A: srcA, B: srcB, D: srcD, E: srcE, F: srcF,
        J: srcJ, port: portCls, N: keylessOk, hints: hintOk });
  }

  /* ---- ⑩ 链构成（确认链动态窗+题面链六族+错链） ---- */
  {
    const cc = capture.confirmCount;                          // ③ 采得的 count 确认链（flat6 q0）
    const q6 = genLevel(6).quizzes[0];
    const countOk = !!cc && cc.length === 3 &&
      cc[0] === 'dc_right' && cc[1] === 'dc_n_' + q6.ask &&
      cc[2] === 'dc_n_' + q6.answer &&                        // T46 化：数词段 clip（'N只'）
      !keylessLast(cc);                                       // 全 clip 链（零 keyless）
    const cch = capture.confirmChange;                        // ③ 采得的 change 确认链（flat16 q2）
    const q16c = genLevel(16).quizzes[2];
    const changeOk = !!cch && cch.length === 4 &&
      cch[0] === 'dc_right' && cch[1] === 'dc_n_' + q16c.ask &&
      cch[2] === (q16c.up ? 'dc_s_duo' : 'dc_s_shao') &&      // 骨架段 clip（'多了'/'少了'）
      cch[3] === 'dc_n_' + q16c.answer &&
      !keylessLast(cch);
    /* sum 确认链（无中段名音）+ 题面链六族采样（replayQuiz 直调采样） */
    window.DC.start(6);
    replayQuiz(false);
    const qc = window.__lastQueue;
    const q2 = window.DC.quiz;
    const qCountOk = qc && qc.length === 2 && qc[0] === 'dc_n_' + q2.ask &&
      qc[1] === 'dc_q_count';
    const sq = window.DC.dcStartNumeric(6);                   // flat6 第 4 题=sum
    replayQuiz(false);
    const qs = window.__lastQueue;
    const sumQuizOk = sq && sq.kind === 'sum' &&
      qs && qs.length === 3 && qs[0] === 'dc_n_' + sq.ask[0] &&
      qs[1] === 'dc_n_' + sq.ask[1] && qs[2] === 'dc_q_sum';
    const rS = await window.DC.tapCard(sq.answerIdx);         // sum 判对→确认链采样
    await waitFor(() => window.DC.quiz && window.DC.quiz.step === 4, 4000);
    const cs = window.__lastQueue;
    const sAns = genLevel(6).quizzes[3].answer;
    const sumOk = !!cs && cs.length === 3 && cs[0] === 'dc_right' &&
      cs[1] === 'dc_s_yg' && cs[2] === 'dc_n_' + sAns &&      // T46 化：一共+数词段 clip
      !keylessLast(cs) && rS === 'right';
    /* diff/mostdiff/totalchange 题面链（引擎直驱到题后 replayQuiz 采样） */
    const dq = engAdvanceTo(6, 4);
    replayQuiz(false);
    const qd = window.__lastQueue;
    const diffOk = dq && dq.kind === 'diff' && qd && qd.length === 3 &&
      qd[0] === 'dc_n_' + dq.ask[0] && qd[1] === 'dc_n_' + dq.ask[1] && qd[2] === 'dc_q_diff';
    const mq = engAdvanceTo(10, 4);
    replayQuiz(false);
    const qm = window.__lastQueue;
    const mostOk = mq && mq.kind === 'mostdiff' && qm && qm.length === 3 &&
      qm[0] === 'dc_n_' + mq.ask[0] && qm[1] === 'dc_n_' + mq.ask[1] && qm[2] === 'dc_q_diff';
    const tq = engAdvanceTo(16, 4);
    replayQuiz(false);
    const qt = window.__lastQueue;
    const totalOk = tq && tq.kind === 'totalchange' && qt && qt.length === 1 &&
      qt[0] === (tq.up ? 'dc_q_total_up' : 'dc_q_total_dn');
    const cq2 = engAdvanceTo(16, 2);
    replayQuiz(false);
    const qcg = window.__lastQueue;
    const chgQuizOk = cq2 && cq2.kind === 'change' && qcg && qcg.length === 2 &&
      qcg[0] === 'dc_n_' + cq2.ask &&
      qcg[1] === (cq2.up ? 'dc_q_change_up' : 'dc_q_change_dn');
    const wrongOk = !!capture.wrong && capture.wrong[0] === 'dc_wrong' && capture.wrong[1] === 'dc_hint';
    /* estMs 动态窗恒验算：CONFIRM_BASE+confirmTailMs(q) ≥ confirmChainMs(q)（数学恒等）
       + 全 40 关数值/计数题确认链 ≤ 窗（verify 页面公式副本全量复算） */
    let dynOk = true;
    for (let flat = 0; flat < 40; flat++) {
      for (const q of genLevel(flat).quizzes) {
        if (1600 + confirmTailMs(q) < confirmChainMs(q)) dynOk = false;
      }
    }
    const estOk = dynOk &&
      (SPEC_DUR.dc_wrong + CHAIN_GAP + SPEC_DUR.dc_hint + WIN_PAD) === 4146;
    unit('chains', countOk && changeOk && sumOk && qCountOk && sumQuizOk && diffOk &&
      mostOk && totalOk && chgQuizOk && wrongOk && estOk,
      { confirmCount: countOk, confirmChange: changeOk, confirmSum: sumOk,
        quizCount: qCountOk, quizSum: sumQuizOk, quizDiff: diffOk, quizMostdiff: mostOk,
        quizTotal: totalOk, quizChange: chgQuizOk, wrong: wrongOk, dynWin: estOk });
  }

  /* ---- ⑪ 写档（预置 v1.0 → 恢复真实存档 API → KIDS.init 装载 → level.pass → rec 更新） ---- */
  {
    KIDS._save = kSaveOrig; KIDS.store.persist = kPersistOrig;   // 撤 ② 的 stub（否则 pass 写抛弃对象=假通过）
    localStorage.removeItem('kidsgame_datacollect');
    const SEED = { v: '1.0', game: 'datacollect', firstDay: '2026-09-01', lastDay: '2026-09-01',
                   levels: {}, dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                   restTip: { day: '', shown: 0 } };
    localStorage.setItem('kidsgame_datacollect', JSON.stringify(SEED));
    KIDS.init({ game: 'datacollect', title: '数据收集员' });   // 真实 store.load：预置 v1.0 被接受
    const raw1 = JSON.parse(localStorage.getItem('kidsgame_datacollect'));
    const loaded = raw1.v === '1.0' && raw1.firstDay === '2026-09-01';   // firstDay 保留=非重置（契约 C）
    const pr = KIDS.level.pass(1, 0, 3, [0, 1, 2, 3, 4]);      // winFlow 同款写档调用
    const raw2 = JSON.parse(localStorage.getItem('kidsgame_datacollect'));
    const rec = raw2.levels['1-0'];
    const wrote = loaded && rec && rec.stars === 3 && rec.plays === 1 && !!pr;
    unit('storage', wrote, { loaded: loaded, rec: rec ? rec.stars + '/' + rec.plays : null });
  }

  /* ---- ⑫ 真实路径（fresh v1.0 + start(0) 首关教学链形态 + 真实页暴露） ---- */
  {
    localStorage.removeItem('kidsgame_datacollect');
    document.querySelectorAll('.k-parentbtn').forEach(b => b.remove());   // 二次 init 防重复按钮
    const SEED = { v: '1.0', game: 'datacollect', firstDay: '2026-09-12', lastDay: '2026-09-12',
                   levels: {}, dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                   restTip: { day: '', shown: 0 } };
    localStorage.setItem('kidsgame_datacollect', JSON.stringify(SEED));   // fresh：无 1-0 无 tutSeen
    KIDS.init({ game: 'datacollect', title: '数据收集员' });
    window.DC.start(0);                                        // 首关（真实页此档位 freshTut=真→教学链）
    const q = window.DC.quiz;
    const shape = !!q && q.kind === 'count' && q.ask === 'rabbit' && q.answer === 8 &&
      q.scene[SPEC_CATS[0]] === 8 && q.scene['chick'] === 10 &&
      Object.keys(q.scene).length === 2 && q.grid.length === 0 && q.step === 0 &&
      sceneDomCount('rabbit') === 8 && sceneDomCount('chick') === 10 &&
      chartEl.querySelectorAll('.row').length === 2 &&
      qbarEl.querySelector('.q-text').textContent === SPEC_NAMES.rabbit + '有几只呀？' &&
      window.DC.labels && window.DC.labels.length === 2 && window.DC.labels[0] === 'rabbit';
    /* freshTut 输入复算：levels 无 1-0 + tutSeen 缺 → 首次进关必走教学（真实页由 ② 实证链形态） */
    const svRaw = JSON.parse(localStorage.getItem('kidsgame_datacollect'));
    const freshInputs = !svRaw.levels['1-0'] && !(svRaw.datacollect && svRaw.datacollect.tutSeen);
    const src = document.querySelectorAll('script')[2].textContent;
    const branch = src.indexOf('if (freshTut) { tutorialWatch(); return; }') >= 0 &&
      src.indexOf('window.DC =') >= 0 && src.indexOf('__dcDemoR') >= 0;   // 真实页钩子/实证暴露（b29 坑⑥）
    unit('realpath', shape && freshInputs && branch,
      { shape: shape, fresh: freshInputs, branch: branch });
  }

  /* ⑪⑫ 写档测试收尾：清测试档并恢复真实档（审查 M1——origLS 同模式） */
  localStorage.removeItem('kidsgame_datacollect');
  if (origLS !== null) localStorage.setItem('kidsgame_datacollect', origLS);

  /* ---- ⑬ 时长模型（r14 门禁：40 关 modeled 独立副本逐关对账+最低值精确+voiceWin≤DECIDE） ---- */
  {
    /* 独立副本：estN/DECIDE/步式/句式全独立重列（SPEC §3-r14 推导——禁抄页面 quizDurMs 实现） */
    const DECIDE_IND = { count: 4000, sum: 16000, diff: 14000, mostdiff: 15000,
                         change: 13000, totalchange: 17000 };
    const sayInd = q => {
      const nm = id => SPEC_NAMES[id];
      if (q.kind === 'count') return nm(q.ask) + '，有几只呀';
      if (q.kind === 'sum') return nm(q.ask[0]) + nm(q.ask[1]) + '一共几只呀';
      if (q.kind === 'diff' || q.kind === 'mostdiff') return nm(q.ask[0]) + nm(q.ask[1]) + '相差几只呀';
      if (q.kind === 'change') return nm(q.ask) + (q.up ? '比第一次多了几只' : '比第一次少了几只');
      return q.up ? '一共多了几只呀' : '一共少了几只呀';
    };
    const stepVoiceInd = (q, k) => k === 0 ? 400 + estN(sayInd(q).length) + 300 : 400;
    const stepsInd = q => q.kind === 'count' ? q.answer / 2 : 1;   // count=answer/2 步 / 数值题 1 步
    const quizDurInd = q => q.kind === 'count'
      ? Math.max(stepVoiceInd(q, 0), DECIDE_IND.count) + 600 +
        (stepsInd(q) - 1) * (Math.max(400, DECIDE_IND.count) + 600) + 900
      : Math.max(stepVoiceInd(q, 0), DECIDE_IND[q.kind]) + 880;
    const bad = [];
    let dMin = Infinity, dMinFlat = -1, parityAll = true, voiceOk = true;
    for (let flat = 0; flat < 40; flat++) {
      const L = genLevel(flat);
      let sInd = 0;
      for (const q of L.quizzes) {
        sInd += quizDurInd(q);
        if (stepVoiceInd(q, 0) > DECIDE_IND[q.kind]) voiceOk = false;   // voiceWin≤DECIDE 全域
      }
      if (sInd !== levelDurMs(L)) { parityAll = false; bad.push('f' + flat + ' ' + sInd + '!=' + levelDurMs(L)); }
      if (sInd < MIN_LEVEL_MS) bad.push('f' + flat + ' minMs=' + sInd);
      if (sInd < dMin) { dMin = sInd; dMinFlat = flat; }
    }
    const exactOk = MIN_EXACT > 0 && dMin === MIN_EXACT;      // 最低值精确防回漂（build 后实测回填）
    unit('duration', parityAll && voiceOk && bad.length === 0 && exactOk && dMin >= MIN_LEVEL_MS,
      { parity: parityAll, voiceNeverDominates: voiceOk, bad: bad.slice(0, 3),
        minMs: dMin, minFlat: dMinFlat, exact: exactOk });
  }

  /* ---- ⑭ 布局 simView（横当前视口+竖 body.port 类通道；量测前清 .pop） ---- */
  {
    const probe = () => {
      document.querySelectorAll('.pop').forEach(e => e.classList.remove('pop'));   // 量测前清 .pop
      const de = document.documentElement;
      const bad = [];
      /* 尺寸量测走 offsetWidth/offsetHeight（布局尺寸）——getBoundingClientRect 受
         .cell.lit 点亮动画（dc-lit scale 0.3→1）瞬时变换影响会量出 30-39px 假值 */
      document.querySelectorAll('button').forEach(e => {
        if (e.classList.contains('k-parentbtn')) return;
        if (e.classList.contains('cell') || e.classList.contains('ncard')) return;   // 格/卡有专项指标（cellMin/cardMin）
        const w = e.offsetWidth, h = e.offsetHeight;
        if (w > 4 && h > 4 && (w < 36 || h < 36))
          bad.push((e.className || e.id) + ':' + Math.round(w) + 'x' + Math.round(h));
      });
      const cells = Array.from(document.querySelectorAll('.band.cur .cell'));
      const cellMin = cells.length ? Math.round(Math.min.apply(null, cells.map(c => Math.min(c.offsetWidth, c.offsetHeight)))) : 0;
      const cards = Array.from(document.querySelectorAll('.ncard'));
      /* 卡阈值口径=宽（SPEC §3-r14：横 96/竖 84 均 width 定版；height 74/64 非点击域判据） */
      const cardMin = cards.length ? Math.round(Math.min.apply(null, cards.map(c => c.offsetWidth))) : 0;
      const legend = chartEl.querySelector('.legend');
      const lr = legend ? legend.getBoundingClientRect() : null;
      const legendIn = !!lr && lr.top >= 0 && lr.bottom <= window.innerHeight && lr.width > 0;
      const ox = de.scrollWidth - de.clientWidth;
      return { ox: ox, bad: bad, cellMin: cellMin, cardMin: cardMin,
               legendIn: legendIn, nCells: cells.length,
               oldBands: document.querySelectorAll('.band.old').length };
    };
    /* 面一：flat6 数值题（4 卡在场）当前视口量测——阈值随朝向（横 40/96；真竖 viewport
       下 @media 已生效取竖阈值 36/84——_selftest P1b 真竖 800×1180 复跑须全绿） */
    window.DC.dcStartNumeric(6);
    await wait(60);
    const m1 = probe();
    const isPortView = window.innerHeight > window.innerWidth;
    const need1Cell = isPortView ? 36 : 40, need1Card = isPortView ? 84 : 96;
    const landOk = m1.ox === 0 && m1.bad.length === 0 && m1.cellMin >= need1Cell &&
      m1.cardMin >= need1Card && m1.legendIn && m1.nCells === 30;    // 2 行 ×15 格
    /* 面二：body.port 类通道（竖屏规则真通道）同量测——通道与 @media 逐条等值由 build
       静态对账；「加类生效」差异判据（36<40）仅横视口下可证（真竖下两面同为竖尺寸） */
    document.body.classList.add('port');
    await wait(60);
    const m2 = probe();
    document.body.classList.remove('port');
    const portOk = m2.ox === 0 && m2.bad.length === 0 && m2.cellMin >= 36 &&
      m2.cardMin >= 84 && m2.legendIn && (isPortView || m2.cellMin < m1.cellMin);   // 竖通道确实生效
    /* 面三：flat16 dch4 双条带（竖通道下双带在场+行内格数锚） */
    document.body.classList.add('port');
    window.DC.dcStartNumeric(16);                              // 快进 2 count → change 题（双条带全显）
    await wait(60);
    const m3 = probe();
    document.body.classList.remove('port');
    const dualOk = m3.ox === 0 && m3.bad.length === 0 && m3.legendIn &&
      m3.oldBands === 2 && m3.cellMin >= 36;
    unit('layout', landOk && portOk && dualOk,
      { land: landOk, port: portOk, dual: dualOk,
        landMin: [m1.cellMin, m1.cardMin], portMin: [m2.cellMin, m2.cardMin],
        oldBands: m3.oldBands, bad: (m1.bad.concat(m2.bad, m3.bad)).slice(0, 3),
        m3: { ox: m3.ox, badN: m3.bad.length, legendIn: m3.legendIn, cellMin: m3.cellMin } });
  }

  const out = { game: 'datacollect', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__dcVlog = out;                          // 外部断言挂点（任务书钩子）
  window.VERIFY = out;                            // window.VERIFY 对象含 units {name, ok, note}
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）
     供反馈链/确认链绑定断言；KIDS.audio.note/sfx 静默（ding 计数走 __dcDing 口） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
