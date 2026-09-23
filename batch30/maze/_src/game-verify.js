/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关×3 局全量审计（flat 0-39，120 局）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null）/ 章号映射（ch=flat/5+1，dch=(ch-1)%4+1；生成关
     随机章参数 dch∈1-4 钩子直读）/ 引擎 BFS 直驱（solveNext 逐步 moved…→right/
     末局 done → 3 星零 miss）
   ② SPEC 独立对账（独立硬编码表，禁抄实现常量——双录对账）：章型规则独立推导
     （sub→尺寸/墙域/距离域）/ 墙格界内互异不压要点 / **生成可解性独立 DFS 复算**
     （sub1/2 entry→goal 连通；sub3 分段三验：门关 entry→key 连通 + 门开 key→goal
     连通 + 门关 entry→goal **不连通**=门必经）/ 相邻局布局互异 / 文案表逐条一致
   ③ tapCell 返回值族单元（真实 UI 状态机）：flat0 锚点（entry(1,1)→goal(1,3)
     无墙）/ 非法坐标 null 族 / 不相邻 wrong+miss+错链 __lastQueue=
     [maz_wrong,{key:'maz_guide','点小兔旁边的格子'}]（clip 键段尾，T46 阶段2）/ 点墙 wrong /
     moved（pos/step 推进）/ back（回退不记 miss，step 截断变小）/ right（局推进）/
     ch3 未拿钥匙点门 wrong+__lastQueue=['maz_key'] / 拾钥匙 moved+hasKey+
     playLog 含 ['maz_keyget','拿到钥匙啦']（T46 阶段2 clip 化）/ 过门 moved / 末局 done
   ④ 回退专测：走 2 步 → back 回退 1 步（miss 恒 0，step 减）→ 重新走通本局 right
   ⑤ 教学链：tutorialWatch 真实走完（stub 存档）→ __mzDemoR==='right' 且
     tut='help'，锚点重建（走 2 步到萝卜），demo 机制句 playLog 含 ['maz_demo','点旁边的格子走路']
     （T46 阶段2 clip 化），
     折算真实时长 ≤16s
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入=null + 网格容器 bump（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=3 局合计，恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3）先制造 1 次 wrong 再 autoSolve（miss=1 → 2 星）
   ⑨ ch3 钥匙路径驱动（flat10-14 五关）：autoSolve 逐 tap 真实链全通 + 每关
     hasKey false→true 转变 + 过门 moved 发生（BFS 先钥后门）
   ⑩ 帧内容断言（契约 M）：flat 0/6/10/16 四关每局——格子 DOM 数==size²、
     墙格类==walls.length、door/key 格类在场、小兔 data-r/c==pos；逐 tap 后
     小兔位置格==quiz.pos
   ⑪ 布局：双 viewport（1280×800 / 800×1180）×（flat0 5×5 / flat6 7×7 /
     flat10 7×7 门 / flat17 混合）：格 ≥72×72、描边对比度 ≥3:1、overflowX ≤0
   ⑫ clips：maz_ 7 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4 实长 ±60ms）
   ⑬ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑭ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征；GEN_HINTS[k] ↔
     dch=k+1（家族 F）
   ⑮ verify 提速断言：SPEED=0.12
   ⑯ 语音窗动态断言（clip 实长 SPEC §4；T46 阶段2 三句 clip 化）：教学演示窗 3900≥3264+300；
     turn 延 2200≥1800+300；局终窗 2800≥2424+300；demo 窗 3700≥maz_demo 2472+300；
     winFlow 3020≥2424+300；错链豁免 6500≥2664+150+2544+300=5658；
     钥匙链豁免 2400≥1896+300=2196；拾钥匙句 maz_keyget 1824 ≤局间自然窗
   ⑰ 家族 A/B/F/I/K/N 源码级断言（Function.toString）：boot 含 nextHint(lim - 1) /
     winFlow 含 nextHint(null) / nextHint 含 genLevel(f+1).dch-1 实算且禁 (ci+1)%4 /
     rescueTick 顶部链豁免守卫+双锚+K 面板守卫 / startLevel 双锚重置 /
     uiTapCell 错链豁免 6500+钥匙链 2400 / keyless 恒尾源码形态
   ⑱ 章分布聚合（① 数据收口）：dch1 全 5×5 墙[2,4] 无门 / dch2 全 7×7 墙[6,10] /
     dch3 全带 key+door+门必经 / ch4（静态+生成）三子型全现 / 生成关 dch1-4 全现
   附：__mzMazeDump 导出 120 局迷宫数据（_selftest.py python 侧独立 DFS 复算对账）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- SPEC-BATCH30 §0.75/§3/§4 独立硬编码表（禁抄页面 SUB_ 常量/VOICE/文案/引擎函数） ---- */
  const SPEC_DUR = { 'maz_tut_watch': 3264, 'maz_tut_turn': 1800, 'maz_hint': 2304,
                     'maz_right': 2424, 'maz_wrong': 2664, 'maz_q': 2424, 'maz_key': 1896,
                     'maz_guide': 2544, 'maz_keyget': 1824, 'maz_demo': 2472 };   // T46 阶段2 三键（ffprobe 同口径）
  const SPEC_SENT = {
    q: '帮小兔子吃到萝卜', demo: '点旁边的格子走路', getKey: '拿到钥匙啦',
    guide: '点小兔旁边的格子',
    watch: '看！帮小兔子走迷宫', turn: '你来走一走', hint: '看看旁边的格子',
    right: '走到啦，真聪明', wrong: '看看旁边能走的格子', key: '先找钥匙哦'
  };
  const SPEC_SIZE = { 1: 5, 2: 7, 3: 7 };
  const SPEC_WALL = { 1: [2, 4], 2: [6, 10], 3: [6, 10] };
  const SPEC_DIST = { 1: [4, 6], 2: [8, 12], 3: [8, 12] };
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字符 + 600 落定余量
  const key = p => p.r + ',' + p.c;
  const specDist = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
  /* 独立 BFS（禁用引擎 bfsReach/bfsPath）：block=额外障碍格集（门关=[door]） */
  const specBfs = (size, walls, block, from, to) => {
    const bad = {};
    walls.forEach(w => { bad[w.r + ',' + w.c] = 1; });
    (block || []).forEach(w => { bad[w.r + ',' + w.c] = 1; });
    if (bad[to.r + ',' + to.c]) return false;
    const seen = { };
    seen[from.r + ',' + from.c] = 1;
    const qq = [from];
    while (qq.length) {
      const p = qq.shift();
      if (p.r === to.r && p.c === to.c) return true;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => {
        const nr = p.r + d[0], nc = p.c + d[1], k2 = nr + ',' + nc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size || bad[k2] || seen[k2]) return;
        seen[k2] = 1;
        qq.push({ r: nr, c: nc });
      });
    }
    return false;
  };
  /* 独立 BFS 最短路（驱动预演/回退路径源——供 ③④ 找应走序） */
  const specPath = (size, walls, block, from, to) => {
    const bad = {};
    walls.forEach(w => { bad[w.r + ',' + w.c] = 1; });
    (block || []).forEach(w => { bad[w.r + ',' + w.c] = 1; });
    if (bad[to.r + ',' + to.c]) return null;
    const prev = {}, k0 = from.r + ',' + from.c, seen = {};
    seen[k0] = 1;
    const qq = [from];
    while (qq.length) {
      const p = qq.shift();
      if (p.r === to.r && p.c === to.c) break;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => {
        const nr = p.r + d[0], nc = p.c + d[1], k2 = nr + ',' + nc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size || bad[k2] || seen[k2]) return;
        seen[k2] = 1;
        prev[k2] = p.r + ',' + p.c;
        qq.push({ r: nr, c: nc });
      });
    }
    const tk = to.r + ',' + to.c;
    if (!seen[tk]) return null;
    const path = [];
    let cur = tk;
    while (cur !== k0) { const pp = cur.split(','); path.unshift({ r: +pp[0], c: +pp[1] }); cur = prev[cur]; }
    path.unshift({ r: from.r, c: from.c });
    return path;
  };

  /* ---- ① 40 关×3 局全量审计（flat 0-39） ---- */
  const agg = { subAll: {}, genDch: {}, dchOk: { 1: true, 2: true, 3: true }, doorMust: true };
  const dump = {};                                // python 侧独立复算数据
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.mazes) === JSON.stringify(L2.mazes);
    let ruleOk = true;
    for (let k = 0; k < L1.mazes.length; k++) {
      const why = structWhy(L1.mazes[k], L1.dch, flat, k, k > 0 ? L1.mazes[k - 1] : null);
      if (why) ruleOk = false;
    }
    if (L1.mazes.length !== RUNS_PER_LEVEL) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / LEVELS_PER_CH) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* 引擎 BFS 直驱：solveNext 逐步 moved → right / 末局 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.mazes.length && driveOk; k++) {
      const q = L3.mazes[k];
      let g = 0;
      while (!q._answered && g++ < 80) {
        const p = solveNext(q);
        if (!p) { driveOk = false; break; }
        const r = engTapCell(L3, p.r, p.c);
        if (r === 'moved' || r === 'back') continue;             // 合法中间步（含拾钥匙/过门）
        const want = k === RUNS_PER_LEVEL - 1 ? 'done' : 'right';
        if (r !== want) driveOk = false;
        break;
      }
      if (!q._answered || q._miss !== 0) driveOk = false;
    }
    const solvedAll = L3.done && L3.step === RUNS_PER_LEVEL && L3.retries === 0 && engStars(L3) === 3;
    /* 聚合（⑱ 数据源）+ python dump */
    L1.mazes.forEach(q => {
      agg.subAll[q.sub] = (agg.subAll[q.sub] || 0) + 1;
      if (L1.dch === 1 && !(q.size === 5 && !q.key && !q.door)) agg.dchOk[1] = false;
      if (L1.dch === 2 && !(q.size === 7 && !q.key && !q.door)) agg.dchOk[2] = false;
      if (L1.dch === 3 && !(q.size === 7 && q.key && q.door)) agg.dchOk[3] = false;
      if (q.door && specBfs(q.size, q.walls, [q.door], q.entry, q.goal)) agg.doorMust = false;   // 门必经独立复算
    });
    if (flat >= STATIC_LEVELS) agg.genDch[L1.dch] = (agg.genDch[L1.dch] || 0) + 1;
    dump[flat] = L1.mazes.map(q => ({ sub: q.sub, size: q.size,
      entry: { r: q.entry.r, c: q.entry.c }, goal: { r: q.goal.r, c: q.goal.c },
      walls: q.walls.map(w => ({ r: w.r, c: w.c })),
      key: q.key ? { r: q.key.r, c: q.key.c } : null,
      door: q.door ? { r: q.door.r, c: q.door.c } : null }));
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   subs: L1.mazes.map(q => q.sub + ':' + q.size + '×' + q.size + '/墙' + q.walls.length +
                     (q.door ? '/钥门' : '')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }

  /* ---- ② SPEC 独立对账（独立表推导 × 120 局 + 文案表一致） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    for (let k = 0; k < L.mazes.length; k++) {
      const q = L.mazes[k];
      const sub = q.sub;
      if ([1, 2, 3].indexOf(sub) < 0) { badCase = 'sub ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch !== 4 && sub !== L.dch) { badCase = 'subDch ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.size !== SPEC_SIZE[sub]) { badCase = 'size ' + flat + '/' + k; tableOk = false; break outer; }
      const d = specDist(q.entry, q.goal);
      const anchor = flat === 0 && k === 0;
      if (!anchor && (d < SPEC_DIST[sub][0] || d > SPEC_DIST[sub][1])) { badCase = 'dist ' + flat + '/' + k; tableOk = false; break outer; }
      if (anchor && d !== 2) { badCase = 'anchor ' + flat + '/' + k; tableOk = false; break outer; }
      const ws = q.walls;
      if (!anchor && (ws.length < SPEC_WALL[sub][0] || ws.length > SPEC_WALL[sub][1])) { badCase = 'wallN ' + flat + '/' + k; tableOk = false; break outer; }
      if (anchor && ws.length !== 0) { badCase = 'anchorWall ' + flat + '/' + k; tableOk = false; break outer; }
      const kset = new Set(ws.map(key));
      if (kset.size !== ws.length) { badCase = 'wallDup ' + flat + '/' + k; tableOk = false; break outer; }
      if (ws.some(w => w.r < 0 || w.r >= q.size || w.c < 0 || w.c >= q.size ||
          key(w) === key(q.entry) || key(w) === key(q.goal))) { badCase = 'wallCell ' + flat + '/' + k; tableOk = false; break outer; }
      if (sub < 3) {
        if (q.key || q.door) { badCase = 'doorCh ' + flat + '/' + k; tableOk = false; break outer; }
        if (!specBfs(q.size, ws, [], q.entry, q.goal)) { badCase = 'unreach ' + flat + '/' + k; tableOk = false; break outer; }   // 生成可解性独立 DFS 复算
      } else {
        if (!q.key || !q.door || kset.has(key(q.key)) || kset.has(key(q.door)) ||
            key(q.key) === key(q.entry) || key(q.key) === key(q.goal) || key(q.key) === key(q.door) ||
            key(q.door) === key(q.entry) || key(q.door) === key(q.goal)) { badCase = 'kdCell ' + flat + '/' + k; tableOk = false; break outer; }
        if (!specBfs(q.size, ws, [q.door], q.entry, q.key)) { badCase = 'segKey ' + flat + '/' + k; tableOk = false; break outer; }        // 门关 entry→key
        if (!specBfs(q.size, ws, [], q.key, q.goal)) { badCase = 'segGoal ' + flat + '/' + k; tableOk = false; break outer; }              // 门开 key→goal
        if (specBfs(q.size, ws, [q.door], q.entry, q.goal)) { badCase = 'doorBypass ' + flat + '/' + k; tableOk = false; break outer; }    // 门关 entry→goal 必不通
      }
      if (k > 0) {
        const pf = genLevel(flat).mazes;           // 相邻局互异（指纹独立重算）
        const sig = m => m.size + '|' + key(m.entry) + '>' + key(m.goal) + '|' + m.walls.map(key).sort().join(';') +
          (m.key ? '|K' + key(m.key) + 'D' + key(m.door) : '');
        if (sig(pf[k - 1]) === sig(pf[k])) { badCase = 'adjacent ' + flat + '/' + k; tableOk = false; break outer; }
      }
    }
  }
  /* 页面文案表逐条一致（禁抄实现——SPEC 表对账） */
  const sentOk = quizText() === SPEC_SENT.q &&
                 DEMO_SENT === SPEC_SENT.demo &&
                 GETKEY_SENT === SPEC_SENT.getKey &&
                 GUIDE.guide === SPEC_SENT.guide &&
                 VOICE.watch.text === SPEC_SENT.watch && VOICE.turn.text === SPEC_SENT.turn &&
                 VOICE.hint.text === SPEC_SENT.hint && VOICE.right.text === SPEC_SENT.right &&
                 VOICE.wrong.text === SPEC_SENT.wrong && VOICE.q.text === SPEC_SENT.q &&
                 VOICE.key.text === SPEC_SENT.key &&
                 VOICE.watch.key === 'maz_tut_watch' && VOICE.turn.key === 'maz_tut_turn' &&
                 VOICE.hint.key === 'maz_hint' && VOICE.right.key === 'maz_right' &&
                 VOICE.wrong.key === 'maz_wrong' && VOICE.q.key === 'maz_q' && VOICE.key.key === 'maz_key';
  if (tableOk && sentOk) npass++;
  units.table = { ok: tableOk && sentOk, bad: badCase, sent: sentOk };

  /* ---- ③ tapCell 返回值族单元（真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q3 = MZ.quiz;
  const initOk = q3 && q3.maze.size === 5 &&
                 q3.maze.entry.r === 1 && q3.maze.entry.c === 1 &&
                 q3.maze.goal.r === 1 && q3.maze.goal.c === 3 &&
                 q3.maze.walls.length === 0 && q3.maze.key === null && q3.maze.door === null &&
                 q3.pos.r === 1 && q3.pos.c === 1 && q3.hasKey === false &&
                 q3.step === 0 && q3.miss === 0;
  /* 非法坐标族：负数/超界/非整数/非数 → null（不炸） */
  const bad1 = (await MZ.tapCell(-1, 0)) === null;
  const bad2 = (await MZ.tapCell(0, 5)) === null;
  const bad3 = (await MZ.tapCell(1.5, 2)) === null;
  const bad4 = (await MZ.tapCell('1', 2)) === null;
  /* 不相邻（对角/跳格）wrong + miss + 错链 keyless 恒尾（契约 N） */
  window.__lastQueue = null;
  const rW = await MZ.tapCell(3, 3);
  const chainW = window.__lastQueue && window.__lastQueue.length === 2 &&
                 window.__lastQueue[0] === 'maz_wrong' &&
                 window.__lastQueue[1] && window.__lastQueue[1].key === 'maz_guide' &&   // T46 阶段2 键段
                 window.__lastQueue[1].text === SPEC_SENT.guide;
  const wrongOk = rW === 'wrong' && MZ.quiz.miss === 1 && MZ.currentLevel.miss === 1 && chainW;
  /* moved + back（回退不记 miss，step 随足迹截断变小） */
  const rM1 = await MZ.tapCell(1, 2);
  const movOk = rM1 === 'moved' && MZ.quiz.pos.r === 1 && MZ.quiz.pos.c === 2 &&
                MZ.quiz.step === 1 && MZ.quiz.miss === 1;
  const rB = await MZ.tapCell(1, 1);
  const backOk = rB === 'back' && MZ.quiz.pos.r === 1 && MZ.quiz.pos.c === 1 &&
                 MZ.quiz.step === 0 && MZ.quiz.miss === 1;        // miss 不增（回退=死路自救）
  /* right：走 2 步到萝卜（局 0 → 局 1） */
  await MZ.tapCell(1, 2);
  const rR = await MZ.tapCell(1, 3);
  const rightOk = rR === 'right' && MZ.currentLevel.step === 1 && MZ.quiz.miss === 0;   // 新局 miss 清零
  /* 点墙 wrong（墙判定优先于相邻性——点任意墙格恒 wrong） */
  const advanceRunTo = async (flat, qi) => {                     // 独立推进器驱 UI 到指定局（初始态）
    startLevel(flat);
    let g = 0;
    while (cur.step < qi && g++ < 200) {
      const q = curMaze();
      if (!q) return false;
      const p = solveNext(q);
      if (!p) return false;
      await MZ.tapCell(p.r, p.c);
    }
    return cur.step === qi;
  };
  const adv1 = await advanceRunTo(0, 1);                         // flat0 局1（ch1 墙 2-4）
  const wallP = MZ.quiz && MZ.quiz.maze.walls[0];
  const rWall = wallP ? await MZ.tapCell(wallP.r, wallP.c) : 'n/a';
  const wallOk = adv1 && wallP && rWall === 'wrong' && MZ.quiz.miss === 1;
  /* ch3 未拿钥匙点门 wrong + maz_key 单段链 → 拾钥匙 moved+hasKey+「拿到钥匙啦」 → 过门 → done */
  startLevel(10);                                                // dch3 钥匙门
  const qd = MZ.quiz;
  window.__lastQueue = null; window.__lastSay = null;
  const rDoor = await MZ.tapCell(qd.maze.door.r, qd.maze.door.c);
  const chainK = window.__lastQueue && window.__lastQueue.length === 1 &&
                 window.__lastQueue[0] === 'maz_key';
  const doorWrongOk = rDoor === 'wrong' && MZ.quiz.miss === 1 && MZ.quiz.hasKey === false && chainK;
  let keyOk = false, passOk = false, doneOk = false;
  {
    let g = 0, sawSay = false, passed = false, keyTurn = false;
    while (cur && !cur.done && g++ < 300) {
      const q = curMaze();
      const p = solveNext(q);
      if (!p) break;
      const had = q.hasKey;
      const atDoor = q.door && p.r === q.door.r && p.c === q.door.c;
      const r = await MZ.tapCell(p.r, p.c);
      if (r === null) break;
      if (!had && q.hasKey) { keyTurn = true; if (window.__playLog.some(e => e[0] === 'maz_keyget' && e[1] === SPEC_SENT.getKey)) sawSay = true; }
      if (atDoor && r === 'moved') passed = true;
    }
    keyOk = keyTurn && sawSay;
    passOk = passed;
    doneOk = !!(cur && cur.done);
  }
  const tapOk = initOk && bad1 && bad2 && bad3 && bad4 && wrongOk && movOk && backOk &&
                rightOk && wallOk && doorWrongOk && keyOk && passOk && doneOk;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, coord: bad1 && bad2 && bad3 && bad4, wrong: wrongOk,
                moved: movOk, back: backOk, right: rightOk, wall: wallOk,
                doorWrong: doorWrongOk, getKey: keyOk, doorPass: passOk, done: doneOk };

  /* ---- ④ 回退专测：走 2 步 → back → 重走通（全程 miss 不增） ---- */
  total++;
  startLevel(0);
  await MZ.tapCell(1, 2);                                        // 局0 走通（此前已 right 过一次，确定性同局）
  await MZ.tapCell(1, 3);
  const adv4 = await advanceRunTo(0, 1);                         // 局1：路径长 ≥4
  const q4 = MZ.quiz;
  const path4 = q4 ? specPath(q4.maze.size, q4.maze.walls, [], q4.maze.entry, q4.maze.goal) : null;
  let reOk = false;
  if (adv4 && path4 && path4.length >= 4) {
    const m0 = MZ.quiz.miss;
    await MZ.tapCell(path4[1].r, path4[1].c);                    // 走 2 步
    await MZ.tapCell(path4[2].r, path4[2].c);
    const s2 = MZ.quiz.step;
    const rb = await MZ.tapCell(path4[1].r, path4[1].c);         // 回退 1 步（已走格相邻）
    const s1 = MZ.quiz.step;
    const m1 = MZ.quiz.miss;
    let rr = null;
    for (let i = 1; i < path4.length; i++) rr = await MZ.tapCell(path4[i].r, path4[i].c);   // 重走通
    reOk = rb === 'back' && s2 === 2 && s1 === 1 && m1 === m0 && rr === 'right' && MZ.quiz.miss === m0;
  }
  if (reOk) npass++;
  units.retreat = { ok: reOk, pathLen: path4 ? path4.length : -1 };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __mzDemoR='right'（走 2 步到萝卜） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };           // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  window.__lastSay = null;
  window.__playLog = [];                                         // T46 阶段2：demo 句改 play，走调用日志断言
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                          // 折算真实页时长
  const tutOk = window.__mzDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.mazes[0].entry.r === 1 && cur.mazes[0].entry.c === 1 &&
                cur.mazes[0].goal.r === 1 && cur.mazes[0].goal.c === 3 &&   // 锚点重建
                window.__playLog.some(e => e[0] === 'maz_demo' && e[1] === SPEC_SENT.demo) &&   // demo 机制句 clip（T46）
                tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__mzDemoR, tut: state.tut,
                     demoPlay: window.__playLog.filter(e => e[0] === 'maz_demo'), watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入=null + 网格容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                        // 模拟教学"看"演示期
  const sw1 = (await MZ.tapCell(1, 2)) === null &&
              gridEl0().classList.contains('bump');
  state.demo = false; state.locked = true;                       // 演出窗口（locked）
  const sw2 = (await MZ.tapCell(1, 2)) === null;
  state.locked = false;                                          // 还原
  const swallowOk = sw1 && sw2 && MZ.quiz.step === 0 && MZ.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: sw1, locked: sw2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=3 局合计，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await MZ.autoSolve();
  const lv0 = MZ.currentLevel;
  const smokeA = a0.done && a0.taps >= 6 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3）先制造 1 次 wrong 再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = MZ.quiz;
  const r8 = await MZ.tapCell(q8.maze.door.r, q8.maze.door.c);   // 未拿钥匙点门=wrong
  const a10 = await MZ.autoSolve();
  const lv10 = MZ.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑨ ch3 钥匙路径驱动（flat10-14 五关）：全通+每关钥匙转变+过门 ---- */
  total++;
  let k9 = 0, d9 = 0, ok9 = true, stars9 = [];
  for (const flat of [10, 11, 12, 13, 14]) {
    startLevel(flat);
    let g = 0, turn = false, pass = false;
    while (cur && !cur.done && g++ < 300) {
      const q = curMaze();
      const p = solveNext(q);
      if (!p) { ok9 = false; break; }
      const had = q.hasKey;
      const atDoor = q.door && p.r === q.door.r && p.c === q.door.c;
      const r = await MZ.tapCell(p.r, p.c);
      if (r === null) { ok9 = false; break; }
      if (!had && q.hasKey) turn = true;
      if (atDoor && r === 'moved') pass = true;
    }
    if (!(cur && cur.done && turn && pass && engStars(cur) === 3)) ok9 = false;
    if (turn) k9++;
    if (pass) d9++;
    stars9.push(cur && cur.done ? engStars(cur) : 0);
  }
  if (ok9 && k9 === 5 && d9 === 5) npass++;
  smokes.keydrive = { ok: ok9 && k9 === 5 && d9 === 5, keyTurns: k9, doorPasses: d9, stars: stars9 };

  /* ---- ⑩ 帧内容断言（契约 M）：四关每局 DOM 数/类对账 + 逐 tap 小兔位置==pos ---- */
  total++;
  let frameOk = true, frameBad = '';
  for (const flat of [0, 6, 10, 16]) {
    startLevel(flat);
    for (let run = 0; run < RUNS_PER_LEVEL && frameOk; run++) {
      const q = MZ.quiz;
      if (!q) { frameOk = false; frameBad = 'quiz' + flat + '/' + run; break; }
      const g = gridEl0();
      const cells = g.querySelectorAll('.cell');
      const cellN = cells.length === q.maze.size * q.maze.size;
      const wallN = g.querySelectorAll('.cell.wall').length === q.maze.walls.length;
      const doorN = g.querySelectorAll('.cell.door-cell').length === (q.maze.door ? 1 : 0);
      const keyN = g.querySelectorAll('.cell.key-cell').length === (q.maze.key && !q.hasKey ? 1 : 0);
      const bun = g.querySelector('.bun');
      const bunOk = bun && +bun.dataset.r === q.pos.r && +bun.dataset.c === q.pos.c;
      if (!(cellN && wallN && doorN && keyN && bunOk)) {
        frameOk = false; frameBad = 'init ' + flat + '/' + run + ' ' + [cellN, wallN, doorN, keyN, bunOk]; break;
      }
      let guard = 0;
      while (cur.step === run && !cur.done && frameOk && guard++ < 100) {   // 局内逐 tap 小兔位置对账
        const qq = curMaze();
        const p = solveNext(qq);
        if (!p) { frameOk = false; frameBad = 'solve ' + flat + '/' + run; break; }
        const r = await MZ.tapCell(p.r, p.c);
        if (r === null) { frameOk = false; frameBad = 'tap ' + flat + '/' + run; break; }
        if (r === 'done') break;                          // 末局通关：winFlow 接管（quiz 归 null）
        const b2 = gridEl0().querySelector('.bun');
        const pz = MZ.quiz;
        if (!b2 || !pz || +b2.dataset.r !== pz.pos.r || +b2.dataset.c !== pz.pos.c) {
          frameOk = false; frameBad = 'bun ' + flat + '/' + run; break;
        }
      }
    }
  }
  if (frameOk) npass++;
  units.frame = { ok: frameOk, bad: frameBad };

  /* ---- ⑪ 布局：双 viewport ×（flat0 5×5 / flat6 7×7 / flat10 门 / flat17 混合）量测 ---- */
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
    const cells = Array.prototype.map.call(gridEl0().querySelectorAll('.cell'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const q = MZ.quiz;
    const cellOk = cells.length === q.maze.size * q.maze.size &&
                   cells.every(b => b.w >= 72 && b.h >= 72);     // 格 ≥72（本款触摸口径）
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(gridEl0().querySelector('.cell')).borderLeftColor), '#EAF2DC') >= 2;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, cells: cells.length, size: q.maze.size, cellOk: cellOk,
             contrast: cB && cS, ox: ox, pass: cellOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 6, 10, 17]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                                 // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑫ clips：maz_ 10 条（T46 阶段2 +guide/keyget/demo）+ core 3 条全注入 + 时长身份辨别器（SPEC §4 ±60ms） ---- */
  total++;
  const clipKeys = Object.keys(KIDS.voice.clips);
  const need = ['maz_tut_watch', 'maz_tut_turn', 'maz_hint', 'maz_right', 'maz_wrong', 'maz_q', 'maz_key',
                'maz_guide', 'maz_keyget', 'maz_demo',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = clipKeys.length === 13 &&
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

  /* ---- ⑬ 星级规则（引擎级构造直测：0=3★ / 1-2=2★ / ≥3=1★，永不 0 星） ---- */
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

  /* ---- ⑭ 章末预告 C7 关键词断言（hint[i] ↔ CHAPTERS[i+1]；GEN_HINTS[k] ↔ dch=k+1） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('大') >= 0 &&                          // 预告 ch2 7×7 大迷宫
                 CHAPTERS[2].hint.indexOf('钥匙') >= 0 &&                        // 预告 ch3 钥匙门
                 CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 &&   // 预告 ch4
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                          // 预告生成关
                 GEN_HINTS[0].indexOf('小') >= 0 &&                              // dch1 小迷宫
                 GEN_HINTS[1].indexOf('大') >= 0 &&                              // dch2 大迷宫
                 GEN_HINTS[2].indexOf('钥匙') >= 0 &&                            // dch3 钥匙门
                 GEN_HINTS[3].indexOf('集合') >= 0;                             // dch4 混合
  const genOk = [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   // 家族 F：实算下一关 dch
  if (hintOk && genOk) npass++;
  units.hints = { ok: hintOk && genOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑮ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  /* ---- ⑯ 语音窗动态断言（clip 实长 SPEC-BATCH30 §4；T46 阶段2 guide/keyget/demo clip 化后
     estMs 字数口径退役，改按实长 2544/1824/2472 推导） ---- */
  total++;
  const winOk = (900 + 3000) >= SPEC_DUR.maz_tut_watch + 300 &&          // 教学演示窗 3900 ≥ 3564
                2200 >= SPEC_DUR.maz_tut_turn + 300 &&                   // turn 后读题延 ≥ 2100
                2800 >= SPEC_DUR.maz_right + 300 &&                      // 局终演出窗 ≥ 2724
                3700 >= SPEC_DUR.maz_demo + 300 &&                       // demo 窗 ≥ 2772（T46 clip 实长）
                (2620 + 400) >= SPEC_DUR.maz_right + 300 &&              // winFlow 3020 ≥ 2724（契约 H）
                6500 >= SPEC_DUR.maz_wrong + 150 + SPEC_DUR.maz_guide + 300 &&   // 错链豁免 ≥ 5658（家族 I）
                2400 >= SPEC_DUR.maz_key + 300 &&                        // 钥匙链豁免 ≥ 2196
                SPEC_DUR.maz_keyget <= 2800;                             // 拾钥匙句 1824 ≤ 局间自然窗
  if (winOk) npass++;
  units.estWin = { ok: winOk, estGuide: SPEC_DUR.maz_guide,
                   chainMin: SPEC_DUR.maz_wrong + 150 + SPEC_DUR.maz_guide + 300,
                   keyChainMin: SPEC_DUR.maz_key + 300, estGetKey: SPEC_DUR.maz_keyget };

  /* ---- ⑰ 家族 A/B/F/I/K/N 源码级断言（Function.toString 含关键串） ---- */
  total++;
  const srcBoot = boot.toString(), srcWin = winFlow.toString(), srcHint = nextHint.toString(),
        srcResc = rescueTick.toString(), srcStart = startLevel.toString(), srcTap = uiTapCell.toString();
  const contractOk =
    srcBoot.indexOf('nextHint(lim - 1)') >= 0 &&                                  // A：启动 dayEnd 传 lim-1
    srcWin.indexOf('nextHint(null)') >= 0 &&                                      // A：winFlow 传 null（等价）
    srcHint.indexOf('genLevel(f + 1).dch - 1') >= 0 &&                            // F：生成关 hint 实算
    srcHint.indexOf('(ci + 1) % 4') < 0 &&                                        // F：禁章序推进
    srcResc.indexOf('wrongChainUntil') >= 0 &&                                    // I：链豁免守卫
    srcResc.indexOf('lastDir') >= 0 && srcResc.indexOf('lastAct') >= 0 &&         // B：救援双锚
    srcResc.indexOf('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel') >= 0 &&   // K：面板守卫
    srcStart.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&          // I/J：换关双锚重置
    srcTap.indexOf('wrongChainUntil = Date.now() + 6500') >= 0 &&                 // I：错路径设豁免终点
    srcTap.indexOf('wrongChainUntil = Date.now() + 2400') >= 0 &&                 // I：钥匙链豁免终点
    srcTap.indexOf("{ key: 'maz_guide', text: GUIDE.guide }") >= 0 &&             // T46：引导句 clip 键段（原 keyless 已退役）
    srcTap.indexOf("[VOICE.key.key]") >= 0;                                       // N：钥匙链单段
  if (contractOk) npass++;
  units.contract = { ok: contractOk };

  /* ---- ⑱ 章分布聚合（① 数据收口） ---- */
  total++;
  const distOk = agg.dchOk[1] && agg.dchOk[2] && agg.dchOk[3] &&          // 章型全域一致
                 agg.doorMust &&                                          // 120 局门必经独立复算全过
                 agg.subAll[1] > 0 && agg.subAll[2] > 0 && agg.subAll[3] > 0 &&   // 三子型全现（含 ch4 混出）
                 agg.genDch[1] > 0 && agg.genDch[2] > 0 && agg.genDch[3] > 0 && agg.genDch[4] > 0;   // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, dchOk: agg.dchOk, doorMust: agg.doorMust,
                 subAll: agg.subAll, genDch: agg.genDch };

  const out = { game: 'maze', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  window.__mzMazeDump = dump;                    // python 侧独立 DFS 复算对账（_selftest.py）
  window.__mzVlog = out;
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录调用 key（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）；
     voice.say 记录 TTS 拼句（__lastSay）——供 ③ 链句/确认句断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null;
    (window.__playLog = window.__playLog || []).push([k || null, t || null]); };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  KIDS.voice.say = function (t) { window.__lastSay = t || null; };
  runVerify();
}
