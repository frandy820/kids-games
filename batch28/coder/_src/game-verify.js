/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/ 章型规则
     （structWhy 全 null——r40 阶梯 dist 2/3/4/5 + g 3/4 + path seq (dch,lv) 坡表）/
     章号映射（ch=flat/5+1，dch=(ch-1)%4+1；生成关随机章参数 dch∈1-4 钩子直读）/
     引擎直驱（run 逐步 solveNext → moved…→right/末题 done → 3 星）
   ② SPEC 独立对账（独立硬编码表，禁抄实现常量——双录对账）：方向封闭 4 / 章型规则
     独立推导（r40 阶梯 dist 2/3/4/5（flat0q0 锚点 dist1 唯一豁免）/ g=dch≥3?4:3 /
     池长 / 石头数 / path 混出+seq 坡表+opts=seq+1+末段中间格在场）/ 卡池可达性独立
     DFS（specReach）/ 石头不挡死（specShortest）/ NUMCN 步数表全量值输出断言
     （契约 L：2=两，禁 undefined）/ 页面文案表逐条一致 / pathKeys 变长链直调期望表
     （r34 M1：seq2 回归 + seq3 新链，期望从 SPEC 推导禁抄实现拼接结果）
   ③ 卡池数学先验专项（flat0-19 全题）：正确序执行落点=goal（specSolve 独立 DFS 取序
     +SPEC_DELTA 线性重放复算落点）；path 落点=opts[answer] 独立复算（seq 2-3 通用）
   ④ tapCard 返回值族单元（真实 UI 状态机）：flat0 锚点（start(1,1)→goal(0,1) 池=[上]）/
     非法下标 null / moved（dch2 三步题首步）/ run 卡尽 wrong+miss+复位（pool 全恢复）
     +1000ms 防重入窗（fire-and-forget 首击+窗内二击吞 null）/ 撞石 'false'（卡吞不记
     miss+「往这边走不过去哦」play 键轨 cod_g_block+已吞卡再点 null）/ run 错链四段
     （__lastQueue=[cod_wrong,cod_gw1,cod_d_X,cod_gw2] 拼接=SPEC 方向句）/ path 错链
     （__lastQueue=[cod_wrong,{key:'cod_g_path',text:'再想想，先走第一步看看'}]）/ 对=right 推进
   ④b r40 seq3 深化单元：flat12（ch3 lv2 4×4）path seq3 结构（seq3/opts4/g4/末段中间格
     在场）+ UI 点错 wrong / 点对 right 推进
   ⑤ 教学链：tutorialWatch 真实走完（stub 存档）→ __cdDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；锚点=点「上」卡；demo 确认句 play 键轨 cod_demo
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入=null + 卡排容器 bump（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（r40 taps=9=锚 1+dist2×4 题×2，恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3 4×4）先制造 1 次 wrong 再 autoSolve（miss=1 → 2 星）
   ⑨ 章分布聚合（① 数据收口）：r40 阶梯 dch1 dist2（锚 1 除外）池 2 / dch2 dist3 池 3 /
     dch3 dist4 池 4-5+恒石1+g4 / dch4 dist5 池 5-6+石 1-2+g4 / path seq：flat10-11 全 2、
     flat12-14 与 dch4 全 3 / seq3 opts 全 4 / 生成关四型全现 / 干扰题（池=dist+1）出现 ≥3
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（flat0 ch1 3×3 / flat17 ch4 4×4）：
     网格格 =g×g 个且 ≥72×72、指令/候选卡 ≥64×64（含 many 紧凑档）、描边对比度 ≥3:1、
     overflowX ≤0
   ⑪ clips：T46 阶段2 后 cod_ 24 条（6 固定+18 段键）+ core 3 条全注入 + 全键时长身份辨别器（±60ms）
     （r40 零新键——seq3 链为在册键复用，总条数 27 不变）
   ⑫ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑬ 章末预告 C7 关键词断言（r40 新章表）：CHAPTERS[i].hint ↔ 下一章特征；
     GEN_HINTS[k] ↔ dch=k+1（家族 F）
   ⑭ verify 提速断言：SPEED=0.12
   ⑮ 语音窗动态断言（T46 clip 链实长口径：Σ段+150×段距+300）：判对窗 5400≥2832+300；
     教学演示窗 3900≥3504+300；turn 延 2200≥1848+300；winFlow 3020≥2424+300=2724；
     错链豁免 8800≥run 链 8418+300=8718（path 链 6138 同窗）；撞石豁免 3700≥2280+300=2580；
     path 读题 seq2 7 段链 11244+1000 ≤14000（方向级救援 14s 间隔不掐尾）；
     r40 seq3 9 段链 14136>14000 → readChainUntil=14600 豁免守卫 ≥14136+300=14436
   ⑯ 家族 A/B/F/I/K 源码级断言（Function.toString）：boot 含 nextHint(lim - 1) /
     winFlow 含 nextHint(null) / nextHint 含 genLevel(f+1).dch-1 实算且禁 (ci+1)%4 /
     rescueTick 顶部链豁免守卫（wrongChainUntil+readChainUntil）+双锚+K 面板守卫 /
     startLevel 三锚重置 / uiTapCard 豁免窗 8800 / speakQuiz seq3 设窗 14600
   结果写 #verify-result + document.title='VERIFY PASS n/n'（r40 total=56） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- SPEC-BATCH28 §0.67/§1 + SPEC-R40 §R2 独立硬编码表（禁抄页面 DIRS/NUMCN/文案/引擎函数） ---- */
  const SPEC_DIRS = ['up', 'down', 'left', 'right'];
  const SPEC_DN = { up: '上', down: '下', left: '左', right: '右' };
  const SPEC_DELTA = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };  // (dr,dc)
  const SPEC_NUMCN = { 1: '一', 2: '两', 3: '三' };                    // 步数域 1-3，2=两（契约 L）
  /* r40 阶梯独立表：dch→run dist / dch→网格档 / (dch,lv)→path seq（§R2 谱定稿独立推导） */
  const SPEC_LEN = 5;                                                  // 关长 5 题（谱定稿）
  const SPEC_LADDER = { 1: 2, 2: 3, 3: 4, 4: 5 };
  const SPEC_GOF = dch => (dch === 3 || dch === 4) ? 4 : 3;
  const SPEC_PATHSEQ = (dch, lv) => (dch === 3 && lv < 2) ? 2 : 3;
  /* SPEC_DUR T46 阶段2 全 24 键（mp3 实测 ms，时长身份辨别器防错拿/防表过期 ±60ms）——r40 零新键 */
  const SPEC_DUR = { 'cod_tut_watch': 3504, 'cod_tut_turn': 1848, 'cod_hint': 2352,
                     'cod_right': 2424, 'cod_wrong': 2568, 'cod_q': 2400,
                     'cod_ps_go': 1104, 'cod_ps_n_1': 1128, 'cod_ps_n_2': 1128, 'cod_ps_n_3': 1224,
                     'cod_ps_bu': 1920, 'cod_ps_zai': 1368, 'cod_ps_tail': 2280,
                     'cod_d_up': 1224, 'cod_d_down': 1224, 'cod_d_left': 1152, 'cod_d_right': 1176,
                     'cod_gw1': 3072, 'cod_gw2': 1104, 'cod_g_path': 3120, 'cod_g_block': 2280,
                     'cod_cf_path': 2616, 'cod_cf_run': 2424, 'cod_demo': 2832 };
  const SPEC_SENT = {
    confirm_run: '小兔子吃到萝卜啦', confirm_path: '猜对啦，走到这里',
    demo: '点箭头，小兔子就走', block: '往这边走不过去哦',
    path_wrong: '再想想，先走第一步看看', q_run: '帮小兔子走到萝卜', q_path: '小兔子会走到哪？'
  };
  const specRunWrong = d => '小兔没走到萝卜，先往' + d + '走';        // 12 字符定长
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字符 + 600 落定余量
  const key = p => p.r + ',' + p.c;
  const specDist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);

  /* 独立 DFS：方向多重集可拼出 ≥1 条合法到达路径（返回下标序或 null——供 ③ 落点重放；
     r40 g 参数化界内判定） */
  const specSolve = (start, goal, stones, dirs, g) => {
    const st = stones.map(key), used = dirs.map(() => false), seq = [];
    const go = (r, c) => {
      if (r === goal.r && c === goal.c) return true;
      for (let i = 0; i < dirs.length; i++) {
        if (used[i]) continue;
        const dl = SPEC_DELTA[dirs[i]], nr = r + dl[0], nc = c + dl[1];
        if (nr < 0 || nr > g - 1 || nc < 0 || nc > g - 1 || st.indexOf(nr + ',' + nc) >= 0) continue;
        used[i] = true; seq.push(i);
        if (go(nr, nc)) return true;
        seq.pop(); used[i] = false;
      }
      return false;
    };
    return go(start.r, start.c) ? seq.slice() : null;
  };
  /* 独立布尔版（② 用） */
  const specReach = (start, goal, stones, dirs, g) => !!specSolve(start, goal, stones, dirs, g);
  /* 独立最短路枚举（定向 DFS，绕开全部石头）——石头不挡死全部路径（r40 g 界内） */
  const specShortest = (start, goal, stones, g) => {
    const st = stones.map(key), out = [];
    const walk = (r, c, acc) => {
      if (r === goal.r && c === goal.c) { out.push(acc.slice()); return; }
      const mv = [];
      if (goal.r > r) mv.push('down'); if (goal.r < r) mv.push('up');
      if (goal.c > c) mv.push('right'); if (goal.c < c) mv.push('left');
      for (const d of mv) {
        const dl = SPEC_DELTA[d], nr = r + dl[0], nc = c + dl[1];
        if (nr < 0 || nr > g - 1 || nc < 0 || nc > g - 1) continue;
        if (st.indexOf(nr + ',' + nc) >= 0) continue;
        acc.push(d); walk(nr, nc, acc); acc.pop();
      }
    };
    walk(start.r, start.c, []);
    return out;
  };
  /* 独立 tapCard 语义模拟（④ 预演找 wrong 序/撞石卡/推进应点卡——禁用引擎函数；r40 带 g） */
  const cloneQ = q => ({ start: { r: q.start.r, c: q.start.c }, goal: { r: q.goal.r, c: q.goal.c },
    stones: q.stones.map(s => ({ r: s.r, c: s.c })), g: q.g || 3,
    pool: q.pool.map(c => ({ dir: c.dir, used: !!c.used })),
    walked: { r: q.walked.r, c: q.walked.c } });
  const specTap = (sq, i) => {                   // 复刻 engTapCard run 语义（返回值族对账）
    if (i < 0 || i >= sq.pool.length || sq.pool[i].used) return null;
    const dl = SPEC_DELTA[sq.pool[i].dir], nr = sq.walked.r + dl[0], nc = sq.walked.c + dl[1];
    if (nr < 0 || nr > sq.g - 1 || nc < 0 || nc > sq.g - 1 ||
        sq.stones.some(s => s.r === nr && s.c === nc)) {
      sq.pool[i].used = true;
      if (sq.pool.some(c => !c.used)) return 'false';       // r40 试玩 B1 修复同步：末卡撞石吞尽=wrong 复位
      sq.walked = { r: sq.start.r, c: sq.start.c };
      sq.pool.forEach(c => { c.used = false; });
      return 'wrong';
    }
    sq.pool[i].used = true; sq.walked = { r: nr, c: nc };
    if (nr === sq.goal.r && nc === sq.goal.c) return 'right';
    if (sq.pool.some(c => !c.used)) return 'moved';
    sq.walked = { r: sq.start.r, c: sq.start.c };          // 卡尽 wrong=复位
    sq.pool.forEach(c => { c.used = false; });
    return 'wrong';
  };
  const specWrongSeq = q => {                    // DFS 预演：找一条以 wrong 结尾的点卡序
    let ans = null;
    const rec = (sq, seq) => {
      if (ans) return;
      for (let i = 0; i < sq.pool.length && !ans; i++) {
        const s2 = cloneQ(sq);
        const r = specTap(s2, i);
        if (r === 'right' || r === null) continue;
        if (r === 'wrong') { ans = seq.concat([i]); return; }
        rec(s2, seq.concat([i]));                // moved / false 继续深挖
      }
    };
    rec(cloneQ(q), []);
    return ans;
  };
  const specBlockIdx = q => {                    // 预演：找一张撞石/出界卡下标
    for (let i = 0; i < q.pool.length; i++) if (specTap(cloneQ(q), i) === 'false') return i;
    return -1;
  };
  const specNextIdx = q => {                     // 独立推进器（right 优先 / moved 后可达）
    for (let pass = 0; pass < 2; pass++) for (let i = 0; i < q.pool.length; i++) {
      if (q.pool[i].used) continue;
      const s2 = cloneQ(q), r = specTap(s2, i);
      if (r === 'right') return i;
      if (pass === 1 && r === 'moved' &&
          specReach(s2.walked, s2.goal, s2.stones, s2.pool.filter(c => !c.used).map(c => c.dir), s2.g)) return i;
    }
    return -1;
  };

  /* ---- ① 40 关全量审计（flat 0-39；r40 聚合：阶梯/g/seq/opts4） ---- */
  const dch3Path = [], dch4Agg = [], genDch = {}, distractCnt = { n: 0 }, opts4Cnt = { n: 0 };
  let ladderBad = null, seqBad = null;
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* r40 聚合（⑨ 数据源）：阶梯 dist / g 档 / path seq+opts（静态 20 关逐题） */
    if (flat < STATIC_LEVELS) {
      const wantD = SPEC_LADDER[L1.dch];
      L1.quizzes.forEach((q, k) => {
        if ((q.g || 3) !== SPEC_GOF(L1.dch)) ladderBad = ladderBad || ('g ' + flat + '/' + k);
        if (q.kind !== 'run') return;
        const d = specDist(q.start, q.goal);
        if (flat === 0 && k === 0) { if (d !== 1) ladderBad = ladderBad || ('anchor ' + flat); }
        else if (d !== wantD) ladderBad = ladderBad || ('dist ' + flat + '/' + k + ' got ' + d + ' want ' + wantD);
      });
      if (L1.dch === 3 || L1.dch === 4) {
        const wantS = SPEC_PATHSEQ(L1.dch, L1.lv);
        L1.quizzes.forEach(q => {
          if (q.kind !== 'path') return;
          if (q.seq.length !== wantS) seqBad = seqBad || ('seq ' + flat + ' got ' + q.seq.length + ' want ' + wantS);
          if (q.opts.length !== wantS + 1) seqBad = seqBad || ('opts ' + flat + ' got ' + q.opts.length);
          if (wantS === 3) opts4Cnt.n++;
        });
      }
    }
    /* 引擎直驱：run 逐步 solveNext（moved…）→ right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      let g = 0;
      while (!q._answered && g++ < 20) {
        const i = correctIdx(q);
        if (i < 0) { driveOk = false; break; }
        const r = engTapCard(L3, i);
        if (r === 'moved') continue;             // 合法中间步（run 题多 tap 正常）
        const want = k === CH_LEN - 1 ? 'done' : 'right';
        if (r !== want) driveOk = false;
        break;
      }
      if (!q._answered || q._miss !== 0) driveOk = false;
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 聚合（⑨ 数据源） */
    if (L1.dch === 3 && flat >= 10 && flat < 15)
      dch3Path.push(L1.quizzes.filter(q => q.kind === 'path').length);
    if (L1.dch === 4) dch4Agg.push({ dists: L1.quizzes.filter(q => q.kind === 'run').map(q => specDist(q.start, q.goal)),
                                     paths: L1.quizzes.filter(q => q.kind === 'path').length,
                                     seq3: L1.quizzes.filter(q => q.kind === 'path' && q.seq.length === 3).length });
    L1.quizzes.forEach(q => { if (q.kind === 'run' && q.pool.length === specDist(q.start, q.goal) + 1) distractCnt.n++; });
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, g: L1.g, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   kinds: L1.quizzes.map(q => q.kind),
                   subs: L1.quizzes.map(q => q.kind === 'run'
                     ? specDist(q.start, q.goal) + '步/池' + q.pool.length + '/石' + q.stones.length + '/g' + (q.g || 3)
                     : '预测' + q.seq.length + '步/选' + q.opts.length + '/石' + q.stones.length + '/g' + (q.g || 3)) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }

  /* ---- ② SPEC 独立对账（独立表推导 × 40 关全题 + 文案表一致 + NUMCN 全量 + 键链直调） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat), lv = flat % SPEC_LEN;
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k], d = specDist(q.start, q.goal), g = q.g || 3;
      if (g !== SPEC_GOF(L.dch)) { badCase = 'g ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.kind === 'run') {
        if (!q.pool.every(c => SPEC_DIRS.indexOf(c.dir) >= 0)) { badCase = 'dir ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch === 1 && !(flat === 0 && k === 0) &&
            !(d === 2 && q.pool.length === 2 && q.stones.length === 0)) { badCase = 'd1 ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch === 1 && flat === 0 && k === 0 &&
            !(d === 1 && q.pool.length === 1 && q.stones.length === 0 && q.pool[0].dir === 'up')) { badCase = 'anchor ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch === 2 && !(d === 3 && q.pool.length === 3 && q.stones.length === 0)) { badCase = 'd2 ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch === 3 && !(d === 4 && (q.pool.length === 4 || q.pool.length === 5) && q.stones.length === 1)) { badCase = 'd3 ' + flat + '/' + k; tableOk = false; break outer; }
        if (L.dch === 4 && !(d === 5 && (q.pool.length === 5 || q.pool.length === 6) && q.stones.length >= 1 && q.stones.length <= 2)) { badCase = 'd4 ' + flat + '/' + k; tableOk = false; break outer; }
        if (!specShortest(q.start, q.goal, q.stones, g).length) { badCase = 'dead ' + flat + '/' + k; tableOk = false; break outer; }   // 石头不挡死全部路径
        if (!specReach(q.start, q.goal, q.stones, q.pool.map(c => c.dir), g)) { badCase = 'pool ' + flat + '/' + k; tableOk = false; break outer; }   // 卡池先验
      } else {
        if (L.dch !== 3 && L.dch !== 4) { badCase = 'pch ' + flat + '/' + k; tableOk = false; break outer; }
        if (!q.seq.every(x => SPEC_DIRS.indexOf(x) >= 0) || q.seq.length !== SPEC_PATHSEQ(L.dch, lv)) { badCase = 'seq ' + flat + '/' + k; tableOk = false; break outer; }
        let pr = q.start.r, pc = q.start.c;
        for (let s = 0; s < q.seq.length; s++) { pr += SPEC_DELTA[q.seq[s]][0]; pc += SPEC_DELTA[q.seq[s]][1]; }
        if (pr < 0 || pr > g - 1 || pc < 0 || pc > g - 1) { badCase = 'seqOut ' + flat + '/' + k; tableOk = false; break outer; }
        if (pr !== q.goal.r || pc !== q.goal.c) { badCase = 'seqGoal ' + flat + '/' + k; tableOk = false; break outer; }
        if (!samePos(q.opts[q.answer], { r: pr, c: pc })) { badCase = 'ans ' + flat + '/' + k; tableOk = false; break outer; }
        if (q.opts.length !== q.seq.length + 1) { badCase = 'optsN ' + flat + '/' + k; tableOk = false; break outer; }
        const ks = q.opts.map(key);
        if (new Set(ks).size !== q.opts.length || q.opts.some(o => samePos(o, q.start)) ||
            q.opts.some(o => o.r < 0 || o.r > g - 1 || o.c < 0 || o.c > g - 1) ||
            q.opts.some(o => isStone(q.stones, o))) { badCase = 'opts ' + flat + '/' + k; tableOk = false; break outer; }
        const dl = SPEC_DELTA[q.seq[q.seq.length - 1]];
        const midLast = { r: pr - dl[0], c: pc - dl[1] };
        if (!q.opts.some(o => samePos(o, midLast))) { badCase = 'mid ' + flat + '/' + k; tableOk = false; break outer; }   // 末段中间格陷阱在场
      }
    }
  }
  /* 页面文案/方向/步数表逐条一致（禁抄实现——SPEC 表对账）+ NUMCN 全量值输出断言（契约 L） */
  const dirsOk = SPEC_DIRS.every(d => DIRS[d].n === SPEC_DN[d] &&
    DIRS[d].dr === SPEC_DELTA[d][0] && DIRS[d].dc === SPEC_DELTA[d][1]);
  const sentOk = quizText({ kind: 'run' }) === SPEC_SENT.q_run &&
                 quizText({ kind: 'path' }) === SPEC_SENT.q_path &&
                 confirmText({ kind: 'run' }) === SPEC_SENT.confirm_run &&
                 confirmText({ kind: 'path' }) === SPEC_SENT.confirm_path &&
                 GUIDE.block === SPEC_SENT.block && GUIDE.path_wrong === SPEC_SENT.path_wrong;
  /* run 方向句逐方位对账：goal 在 walked 左/右/上/下 四态 */
  const gw = { r: 1, c: 1 };
  const guideOk = guideText({ kind: 'run', walked: gw, goal: { r: 1, c: 0 } }) === specRunWrong('左') &&
                  guideText({ kind: 'run', walked: gw, goal: { r: 1, c: 2 } }) === specRunWrong('右') &&
                  guideText({ kind: 'run', walked: gw, goal: { r: 0, c: 1 } }) === specRunWrong('上') &&
                  guideText({ kind: 'run', walked: gw, goal: { r: 2, c: 1 } }) === specRunWrong('下');
  const pathQ2 = { seq: ['left', 'down'] }, pathQ3 = { seq: ['left', 'down', 'right'] };
  const numcnOk = [1, 2, 3].every(n => NUMCN[n] !== undefined && NUMCN[n] === SPEC_NUMCN[n]) &&
                  NUMCN[2] === '两' &&
                  pathSpeak(pathQ2).indexOf('走' + SPEC_NUMCN[2] + '步') === 0 &&    // 「走两步」口径
                  pathSpeak(pathQ3).indexOf('走' + SPEC_NUMCN[3] + '步') === 0 &&    // r40「走三步」口径
                  pathSpeak(pathQ2).indexOf('undefined') < 0 && pathSpeak(pathQ3).indexOf('undefined') < 0;
  /* r40 键链直调（r34 M1 朗读检查+r37 M1 纯函数直调：期望链从 SPEC 推导，禁抄实现拼接）
     seq2 回归（7 段=旧链逐段一致）+ seq3 新链（9 段=cod_ps_zai 复用两次） */
  const chainText = ks => ks.map(p => p.text).join('');
  const ck2 = pathKeys(pathQ2), ck3 = pathKeys(pathQ3);
  const chainOk = ck2.length === 7 &&
    ck2[0].key === 'cod_ps_go' && ck2[1].key === 'cod_ps_n_2' && ck2[2].key === 'cod_ps_bu' &&
    ck2[3].key === 'cod_d_left' && ck2[4].key === 'cod_ps_zai' && ck2[5].key === 'cod_d_down' &&
    ck2[6].key === 'cod_ps_tail' &&
    chainText(ck2) === '走两步，先往左，再往下，小兔子会走到哪' && chainText(ck2) === pathSpeak(pathQ2) &&
    ck3.length === 9 &&
    ck3[0].key === 'cod_ps_go' && ck3[1].key === 'cod_ps_n_3' && ck3[2].key === 'cod_ps_bu' &&
    ck3[3].key === 'cod_d_left' && ck3[4].key === 'cod_ps_zai' && ck3[5].key === 'cod_d_down' &&
    ck3[6].key === 'cod_ps_zai' && ck3[7].key === 'cod_d_right' && ck3[8].key === 'cod_ps_tail' &&
    chainText(ck3) === '走三步，先往左，再往下，再往右，小兔子会走到哪' && chainText(ck3) === pathSpeak(pathQ3) &&
    ck3.every(p => SPEC_DUR[p.key] !== undefined);                       // 全键在册（缺 clip=core 弃整句）
  if (tableOk && dirsOk && sentOk && guideOk && numcnOk && chainOk) npass++;
  units.table = { ok: tableOk && dirsOk && sentOk && guideOk && numcnOk && chainOk, bad: badCase,
                  dirs: dirsOk, sent: sentOk, guide: guideOk, numcn: numcnOk, chain: chainOk };

  /* ---- ③ 卡池先验专项（flat0-19 全题）：正确序落点=goal 独立重放 + path 落点复算（seq 2-3） ---- */
  total++;
  let priorOk = true, priorBad = null;
  for (let flat = 0; flat < STATIC_LEVELS && priorOk; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.quizzes.length && priorOk; k++) {
      const q = L.quizzes[k];
      if (q.kind === 'run') {
        const dirs = q.pool.map(c => c.dir);
        const seq = specSolve(q.start, q.goal, q.stones, dirs, q.g || 3);
        if (!seq) { priorOk = false; priorBad = 'nosolve ' + flat + '/' + k; break; }
        let pr = q.start.r, pc = q.start.c;                 // 独立线性重放（SPEC_DELTA）
        for (const i of seq) { pr += SPEC_DELTA[dirs[i]][0]; pc += SPEC_DELTA[dirs[i]][1]; }
        if (pr !== q.goal.r || pc !== q.goal.c) { priorOk = false; priorBad = 'landing ' + flat + '/' + k; }
      } else {
        let pr = q.start.r, pc = q.start.c;
        for (const d of q.seq) { pr += SPEC_DELTA[d][0]; pc += SPEC_DELTA[d][1]; }
        if (!samePos(q.opts[q.answer], { r: pr, c: pc })) { priorOk = false; priorBad = 'pLanding ' + flat + '/' + k; }
      }
    }
  }
  if (priorOk) npass++;
  units.prior = { ok: priorOk, bad: priorBad };

  /* ---- ④ tapCard 返回值族单元（真实 UI 状态机；wrong 序/撞石卡=specTap 预演独立找） ---- */
  total++;
  startLevel(0);
  const q4 = CD.quiz;
  const initOk = q4 && q4.kind === 'run' && q4.g === 3 &&
                 q4.grid.start.r === 1 && q4.grid.start.c === 1 &&
                 q4.grid.goal.r === 0 && q4.grid.goal.c === 1 && q4.grid.stones.length === 0 &&
                 q4.pool.length === 1 && q4.pool[0].dir === 'up' && q4.pool[0].used === false &&
                 q4.answer === -1 && q4.step === 0 && q4.miss === 0;
  const badTap = (await CD.tapCard(99)) === null;             // 非法下标 null（不炸）
  /* moved：flat5（dch2 dist3 池3）首步 */
  startLevel(5);
  const q5 = CD.quiz;
  let iMov = -1;
  for (let i = 0; i < q5.pool.length; i++) if (specTap(cloneQ(cur.quizzes[0]), i) === 'moved') { iMov = i; break; }
  const rMov = await CD.tapCard(iMov);
  const movOk = rMov === 'moved' && CD.quiz.step === 0 && CD.quiz.miss === 0;
  /* run 卡尽 wrong+复位+防重入：dch3/dch4 找「有 wrong 序的 run 题」（预演独立找，(flat,qi) 对） */
  const advanceTo = async (flat, qi) => {                     // 独立推进器驱 UI 到指定题（初始态）
    startLevel(flat);
    let g = 0;
    while (CD.quiz && CD.quiz.step < qi && g++ < 60) {
      const q = cur.quizzes[cur.step];
      const i = q.kind === 'path' ? q.answer : specNextIdx(q);
      if (i < 0) return false;
      await CD.tapCard(i);
    }
    return !!(CD.quiz && CD.quiz.step === qi);
  };
  let wFlat = -1, wQi = -1, wseq = null;
  outer1:
  for (let f = 10; f < 20; f++) {
    const qs = genLevel(f).quizzes;
    for (let k = 0; k < qs.length; k++) {
      if (qs[k].kind !== 'run') continue;                     // path 题无卡池（cloneQ 只认 run）
      const s = specWrongSeq(qs[k]);
      if (s) { wFlat = f; wQi = k; wseq = s; break outer1; }
    }
  }
  const advW = wFlat >= 0 ? await advanceTo(wFlat, wQi) : false;
  let wRoute = [];
  if (wseq) for (let s = 0; s < wseq.length - 1; s++) wRoute.push(await CD.tapCard(wseq[s]));
  const pLast = wseq ? CD.tapCard(wseq[wseq.length - 1]) : Promise.resolve(null);   // 末击 fire-and-forget（wrong 1000ms 窗起）
  const rejW = wseq ? await CD.tapCard(wseq[wseq.length - 1]) : 'n/a';   // 窗内紧邻二击=吞 null（b25 坑①方法学）
  if (wseq) wRoute.push(await pLast);
  /* T46 阶段2：run 错链=cod_wrong+gw1+方向+gw2 四段全键化；三段 text 拼接=SPEC 方向句 */
  const rq = window.__lastQueue;
  const chainR = rq && rq.length === 4 && rq[0] === 'cod_wrong' &&
                 rq[1] && rq[1].key === 'cod_gw1' && rq[3] && rq[3].key === 'cod_gw2' &&
                 rq[2] && /^cod_d_(up|down|left|right)$/.test(rq[2].key) &&
                 Object.values(SPEC_DN).indexOf(rq[2].text) >= 0 &&
                 rq[1].text + rq[2].text + rq[3].text === specRunWrong(rq[2].text);
  const wrongOk = advW && wseq !== null && chainR &&
                  wRoute[wRoute.length - 1] === 'wrong' &&
                  wRoute.every(r => r === 'moved' || r === 'false' || r === 'wrong') &&
                  CD.quiz.miss === 1 && CD.currentLevel.miss === 1 &&
                  CD.quiz.pool.every(c => c.used === false);   // 复位：卡池全恢复
  const guardOk = rejW === null;
  /* 撞石/出界 'false'：找有撞石/出界卡的 run 题 */
  let bFlat = -1, bQi = -1, bi = -1;
  outer2:
  for (let f = 10; f < 20; f++) {
    const qs = genLevel(f).quizzes;
    for (let k = 0; k < qs.length; k++) {
      if (qs[k].kind !== 'run') continue;
      const b0 = specBlockIdx(qs[k]);
      if (b0 >= 0) { bFlat = f; bQi = k; bi = b0; break outer2; }
    }
  }
  const advB = bFlat >= 0 ? await advanceTo(bFlat, bQi) : false;
  const rB = bi >= 0 ? await CD.tapCard(bi) : 'n/a';
  const playB = window.__lastVoiceKey;                        /* T46 阶段2：撞石豁免句走 play 键轨 */
  const rB2 = bi >= 0 ? await CD.tapCard(bi) : 'n/a';         // 已吞卡再点=null
  const blockOk = advB && bi >= 0 && rB === 'false' && CD.quiz.miss === 0 &&   // 不记 miss（探索豁免）
                  playB === 'cod_g_block' && rB2 === null;
  /* path 错链：flat10 推进到首个 path 题（lv0 seq2，独立推进器）点错格 */
  startLevel(10);
  const pk = cur.quizzes.findIndex(x => x.kind === 'path');   // dch3 每关 ≥2 path（flags 补足）
  const advP = await advanceTo(10, pk);
  const qP = CD.quiz;
  const wIdx = qP ? qP.opts.findIndex((o, i) => i !== qP.answer) : -1;
  const rP = await CD.tapCard(wIdx);
  const chainP = window.__lastQueue && window.__lastQueue[0] === 'cod_wrong' &&
                 window.__lastQueue[1] && window.__lastQueue[1].key === 'cod_g_path' &&   /* T46 阶段2：引导段键化 */
                 window.__lastQueue[1].text === SPEC_SENT.path_wrong;
  const pathWrongOk = advP && pk >= 0 && qP && qP.kind === 'path' && rP === 'wrong' &&
                      CD.quiz.miss === 1 && chainP;
  /* 对=right 推进（flat10 当前 path 题点正确格） */
  const rR = await CD.tapCard(CD.quiz.answer);
  const rightOk = rR === 'right' && CD.quiz.step === pk + 1 && CD.quiz.miss === 0;
  const tapOk = initOk && badTap && movOk && wrongOk && guardOk && blockOk && pathWrongOk && rightOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, moved: movOk, wrong: wrongOk,
                guard: guardOk, block: blockOk, pathWrong: pathWrongOk, right: rightOk,
                wseq: wseq, wRoute: wRoute };

  /* ---- ④b r40 seq3 深化单元：flat12（ch3 lv2 4×4）首个 path——结构+UI 双腿 ---- */
  total++;
  startLevel(12);
  const pk3 = cur.quizzes.findIndex(x => x.kind === 'path');
  const adv3 = await advanceTo(12, pk3);
  const q3 = CD.quiz;
  let seq3Struct = false, seq3Chain = false;
  if (q3 && q3.kind === 'path') {
    const ck = pathKeys(cur.quizzes[cur.step]);               // 真题链直调（与 ② 合成题互补）
    let pr = q3.grid.start.r, pc = q3.grid.start.c;
    for (const d of q3.seq) { pr += SPEC_DELTA[d][0]; pc += SPEC_DELTA[d][1]; }
    const dl = SPEC_DELTA[q3.seq[2]];
    seq3Struct = q3.g === 4 && q3.seq.length === 3 && q3.opts.length === 4 &&
                 samePos(q3.opts[q3.answer], { r: pr, c: pc }) &&
                 q3.opts.some(o => samePos(o, { r: pr - dl[0], c: pc - dl[1] }));   // 末段中间格陷阱在场
    seq3Chain = ck.length === 9 && ck[4].key === 'cod_ps_zai' && ck[6].key === 'cod_ps_zai' &&
                ck[1].key === 'cod_ps_n_3' && ck[8].key === 'cod_ps_tail' &&
                chainText(ck) === pathSpeak(cur.quizzes[cur.step]);
  }
  const w3 = q3 ? q3.opts.findIndex((o, i) => i !== q3.answer) : -1;
  const rW3 = q3 ? await CD.tapCard(w3) : null;
  const miss3 = CD.quiz ? CD.quiz.miss : -1;                 // 错击后立即捕获（点对推进后翻题 miss 归零）
  const rR3 = await CD.tapCard(CD.quiz.answer);
  const seq3Ok = adv3 && pk3 >= 0 && seq3Struct && seq3Chain &&
                 rW3 === 'wrong' && miss3 === 1 &&
                 rR3 === 'right' && CD.quiz.step === pk3 + 1 && CD.quiz.miss === 0;
  if (seq3Ok) npass++;
  units.seq3 = { ok: seq3Ok, adv: adv3, struct: seq3Struct, chain: seq3Chain, wrongR: rW3, miss: miss3, rightR: rR3 };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __cdDemoR='right'（演示点「上」卡走到萝卜） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  window.__cdDemoV = null;
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__cdDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'run' &&
                cur.quizzes[0].pool[0].dir === 'up' &&        // 锚点：点「上」卡
                window.__cdDemoV === 'cod_demo' &&            // T46 阶段2：demo 确认句=机制句 clip 化
                window.__lastVoiceKey === 'cod_tut_turn' &&   // 收尾=turn 句（教学链完整走完）
                tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__cdDemoR, tut: state.tut,
                     demoV: window.__cdDemoV, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入=null + 卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await CD.tapCard(0)) === null && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await CD.tapCard(0)) === null;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && CD.quiz.step === 0 && CD.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（dch1：锚 1 tap + dist2×4 题×2 tap = 9，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await CD.autoSolve();
  const lv0 = CD.currentLevel;
  const smokeA = a0.done && a0.taps === 9 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3 4×4）先制造 1 次 wrong 再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = CD.quiz;
  let r8 = null;
  if (q8.kind === 'path') { r8 = await CD.tapCard(q8.opts.findIndex((o, i) => i !== q8.answer)); }
  else { const s8 = specWrongSeq(cur.quizzes[0]);
         for (let s = 0; s < s8.length; s++) r8 = await CD.tapCard(s8[s]); }
  const a10 = await CD.autoSolve();
  const lv10 = CD.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑩ 布局：双 viewport ×（flat0 ch1 3×3 / flat17 ch4 4×4）量测 + 描边对比度 ---- */
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
    const gn = (CD.quiz && CD.quiz.g) || 3;                  // r40：网格档钩子直读（渲染即引擎）
    const cells = Array.prototype.map.call(sceneEl.querySelectorAll('.cell'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const cellOk = cells.length === gn * gn && cells.every(b => b.w >= 72 && b.h >= 72);   // 格 ≥72（§1 口径，双网格档）
    const cardOk = cards.length >= 1 && cards.every(b => b.w >= 64 && b.h >= 64);    // 卡 ≥64（含 many 紧凑档 80×106）
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, g: gn, cells: cells.length, cellOk: cellOk, cardOk: cardOk,
             contrast: cB && cS, ox: ox, pass: cellOk && cardOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 17]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑪ clips：cod_ 6 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4 ±60ms；r40 零新键） ---- */
  total++;
  const clipKeys = Object.keys(KIDS.voice.clips);
  const need = ['cod_tut_watch', 'cod_tut_turn', 'cod_hint', 'cod_right', 'cod_wrong', 'cod_q',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  /* T46 阶段2：18 段键（ps 4+n 3+d 4+gw 2+g_path/block 2+cf 2+demo 1）+ 6 固定 + core 3 = 27 */
  const preOk = clipKeys.length === 27 &&
    clipKeys.filter(k => /^(cod_ps_|cod_d_|cod_gw|cod_g_path|cod_g_block|cod_cf_|cod_demo)/.test(k)).length === 18 &&
    need.every(k => clipKeys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: clipKeys.length, durs: durs };

  /* ---- ⑫ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑬ 章末预告 C7 关键词断言（r40 新章表：hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('三步') >= 0 &&                       // 预告 ch2 走三步（r40 阶梯）
                 CHAPTERS[2].hint.indexOf('大') >= 0 && CHAPTERS[2].hint.indexOf('猜') >= 0 &&   // 预告 ch3 4×4+猜一猜
                 CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 && // 预告 ch4 混合
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                          // 预告生成关
                 GEN_HINTS[0].indexOf('两步') >= 0 &&                            // dch1 两步走
                 GEN_HINTS[1].indexOf('三步') >= 0 &&                            // dch2 三步走
                 GEN_HINTS[2].indexOf('猜') >= 0 &&                              // dch3 大棋盘+预测
                 GEN_HINTS[3].indexOf('集合') >= 0;                             // dch4 混合
  const GEN_KW = ['两步', '三步', '猜', '集合'];   // dch1-4 生成关预告特征词（SPEC 章表——与上方 hintOk 同源硬编码）
  const genOk = [24, 29, 34, 39].every(f =>                       // r40 审查 m6：旧式与 nextHint 实现同表达式=恒真，改关键词对账
    nextHint(f).indexOf(GEN_KW[genLevel(f + 1).dch - 1]) >= 0);   // 实算下一关 dch → 预告文案须含该 dch 特征词
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑭ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑮ 语音窗动态断言（clip 链实长口径：窗 ≥ Σ段+150×(n-1)+300；
     estMs 口径保留为上限旁证（clip 实长恒 ≤ estMs 同句）） ---- */
  total++;
  const chainMs = ks => ks.reduce((s, k) => s + SPEC_DUR[k], 0) + 150 * (ks.length - 1);
  const rightMax = Math.max(SPEC_DUR.cod_cf_run, SPEC_DUR.cod_cf_path, SPEC_DUR.cod_demo);
  const wrongChainMs = chainMs(['cod_wrong', 'cod_gw1', 'cod_d_up', 'cod_gw2']);   // run 链最长（d_up/down 1224）
  const pathChainMs = chainMs(['cod_wrong', 'cod_g_path']);                        // path 链 5838
  const readChainMs = chainMs(['cod_ps_go', 'cod_ps_n_3', 'cod_ps_bu', 'cod_d_up',
                               'cod_ps_zai', 'cod_d_down', 'cod_ps_tail']);        // 读题 7 段（seq2 保守上界 n_3）11244
  const read3Ms = chainMs(['cod_ps_go', 'cod_ps_n_3', 'cod_ps_bu', 'cod_d_up',
                           'cod_ps_zai', 'cod_d_down', 'cod_ps_zai', 'cod_d_up',
                           'cod_ps_tail']);                                         // r40 seq3 9 段 14136
  const winOk = (1800 + 3600) >= rightMax + 300 &&           // 判对演出窗 5400 ≥ 2832+300
                (900 + 3000) >= SPEC_DUR.cod_tut_watch + 300 &&   // 教学演示窗 3900 ≥ 3804
                2200 >= SPEC_DUR.cod_tut_turn + 300 &&       // turn 后读题延 ≥ 2148
                (2620 + 400) >= SPEC_DUR.cod_right + 300 &&  // winFlow 3020 ≥ 2724（契约 H）
                8800 >= wrongChainMs + 300 &&                // 链豁免 ≥ 8418+300=8718（家族 I）
                pathChainMs + 300 <= 8800 &&                 // path 链 6138 同窗内
                3700 >= SPEC_DUR.cod_g_block + 300 &&        // 撞石豁免 ≥ 2280+300=2580
                readChainMs + 1000 <= 14000 &&               // seq2 读题 7 段链 < 方向级救援间隔
                14600 >= read3Ms + 300;                      // r40：seq3 9 段链 14136 > 14000 → readChainUntil 14600 ≥ 14436
  if (winOk) npass++;
  units.estWin = { ok: winOk, rightMax: rightMax, wrongChainMs: wrongChainMs,
                   pathChainMs: pathChainMs, readChainMs: readChainMs, read3Ms: read3Ms,
                   blockMs: SPEC_DUR.cod_g_block };

  /* ---- ⑨ 章分布聚合（① 数据收口；r40 阶梯/g/seq/opts4 断言） ---- */
  total++;
  const distOk = !ladderBad && !seqBad &&
                 dch3Path.length === 5 && dch3Path.every(n => n >= 2 && n <= 4) &&
                 dch4Agg.length >= 5 && dch4Agg.every(a => a.dists.every(d => d === 5) &&
                                                           a.paths >= 2 && a.seq3 === a.paths) &&
                 opts4Cnt.n >= 10 &&                      // seq3 path（static ch3 lv2-4+ch4 ≥10 题）
                 distractCnt.n >= 3 &&                    // ch3/4 干扰题（池=dist+1）确实出现
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;   // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, ladderBad: ladderBad, seqBad: seqBad, dch3Path: dch3Path,
                 dch4Agg: dch4Agg.slice(0, 3), opts4: opts4Cnt.n,
                 distract: distractCnt.n, genDch: genDch };

  /* ---- ⑯ 家族 A/B/F/I/K 源码级断言（Function.toString 含关键串；r40 增 readChainUntil 三处） ---- */
  total++;
  const srcBoot = boot.toString(), srcWin = winFlow.toString(), srcHint = nextHint.toString(),
        srcResc = rescueTick.toString(), srcStart = startLevel.toString(), srcTap = uiTapCard.toString(),
        srcSpeak = speakQuiz.toString();
  const contractOk =
    srcBoot.indexOf('nextHint(lim - 1)') >= 0 &&                                  // A：启动 dayEnd 传 lim-1
    srcWin.indexOf('nextHint(null)') >= 0 &&                                      // A：winFlow 传 null（等价）
    srcHint.indexOf('genLevel(f + 1).dch - 1') >= 0 &&                            // F：生成关 hint 实算
    srcHint.indexOf('(ci + 1) % 4') < 0 &&                                        // F：禁章序推进
    srcResc.indexOf('wrongChainUntil') >= 0 && srcResc.indexOf('readChainUntil') >= 0 &&   // I：链豁免双守卫（r40 读链窗）
    srcResc.indexOf('lastDir') >= 0 && srcResc.indexOf('lastAct') >= 0 &&         // B：救援双锚
    srcResc.indexOf('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel') >= 0 &&   // K：面板守卫
    srcStart.indexOf('lastWrongVoice = 0; wrongChainUntil = 0; readChainUntil = 0;') >= 0 &&  // I/J：换关三锚重置（r40）
    srcTap.indexOf('wrongChainUntil = Date.now() + 8800') >= 0 &&                 // I：错路径设豁免终点（clip 链 8418+300）
    srcSpeak.indexOf('readChainUntil = Date.now() + 14600') >= 0;                 // r40：seq3 读链设窗（14136+300=14436 ≤ 14600）
  if (contractOk) npass++;
  units.contract = { ok: contractOk };

  const out = { game: 'coder', r40: true, total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录调用 key（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）；
     voice.say 记录 TTS 拼句（__lastSay）——供 ④ 链句/确认句断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k) { window.__lastVoiceKey = k || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  KIDS.voice.say = function (t) { window.__lastSay = t || null; };
  runVerify();
}
