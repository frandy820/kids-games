/* ================= ?verify=1 自检（仅 verify 分支加载执行；SPEC-R35-EMO 口径）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     章型规则（structWhy 全 null——含 mode 域/近对恒在/rev 情境互异）/ 章号映射
     （ch=flat/5+1，dch=(ch-1)%4+1；生成关随机章）/ 引擎直驱（逐题点应选卡→right/末题 done→全关 3 星）
   ② 封闭集独立对账：SPEC_6/SPEC_NEAR（3 对）/SPEC_HARD4/SPEC_SCENES（verify 内从 SPEC-R35-EMO
     文字独立重列，不引用引擎 EMOS/NEAR/SCENES）× 40 关全题：答案情绪 ∈ 封闭 6 且=情境表唯一答案 /
     候选 ∈ 封闭 6 且 4 张互异 / 恰 1 right（fwd=其情绪答案 / rev=其情境=答案情境）/
     近伙伴恒在场（全题）/ dch3 目标 ∈ HARD4 / rev 候选情境互异且映射=候选情绪
   ③ 近对恒在专项（flat0-4 五关全题）：三对近情绪表逐题断言（SPEC 封闭三对——r35 全域律）
   ④ 点候选卡单元（flat0 真实 UI 状态机）：非法下标=false；错=wrong+miss+1+1000ms
     防重入窗（窗内点卡被拦）；对=right 推进；换题 miss 清零
   ⑤ 教学链：tutorialWatch() 真实走完（stub 存档）→ __emDemoR==='right' 且 tut='help'，
     watch 折算真实时长 ≤16s；flat0 题0 恒 {fwd, happy}（锚点）
   ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 候选卡容器 bump 微动效（家族 D）
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=5，恒 3 星，verify 页不弹层）
   ⑧ UI 冒烟 B：flat10（dch3 rev 主载）先点 1 次干扰卡再 autoSolve（miss=1 → 2 星）
   ⑨ 章分布聚合：dch1 全 fwd+目标 5 情绪互异 / dch2 rev=2 / dch3 目标 ∈ HARD4+rev=3 /
     dch4 rev∈[2,3] / 生成关四型全现
   ⑩ 布局：双 viewport（1280×800 / 800×1180）×（flat0 ch1 fwd / flat10 ch3 rev / flat17 ch4 混合）：
     候选卡 ≥96×96（主答案两向同守）、题面卡 ≥64、overflowX ≤0、卡与题面描边色对底色对比度 ≥3:1
   ⑪ clips：emo_ 60 条 + core 3 条全注入=63（emo_rev_q 注册后定版——r35 审查 m-6 注释勘正）
   ⑫ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★
   ⑬ 章末预告 C7 关键词断言：CHAPTERS[i].hint ↔ 下一章特征（r35 新文案）；GEN_HINTS[k] ↔ dch=k+1（家族 F）
   ⑭ 表情脸六型互异：SVG 结构签名（brow|eye|mouth）六型互异且两两 ≥2 维不同（同脸不同情）
   ⑮ verify 提速断言：SPEED=0.12
   ⑯ rev 语义单元（r35 新增）：quiz.mode/faces.scene 契约 + 题面 DOM（大表情脸+2×2 情境卡）
     + tap wrong/right 推进 + 换题重置
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-R35-EMO 文字独立重列（禁抄页面 EMOS/NEAR/SCENES） */
  const SPEC_6 = ['happy', 'sad', 'angry', 'scared', 'surprised', 'worried'];
  const SPEC_NEAR = { sad: 'worried', worried: 'sad', angry: 'scared', scared: 'angry',
                      happy: 'surprised', surprised: 'happy' };      /* r35 扩第三对 */
  const SPEC_HARD4 = ['sad', 'worried', 'angry', 'scared'];          /* ch3 目标域 */
  const nearInFaces = (q, e) => q.faces.some(f => f.emo === SPEC_NEAR[e]);
  /* 情境→情绪独立重列（24 条封闭表；每情境唯一答案） */
  const SPEC_SCENES = {
    h_gift: 'happy', h_icecream: 'happy', h_sticker: 'happy', h_park: 'happy',
    s_icecream: 'sad', s_balloon: 'sad', s_teddy: 'sad', s_flower: 'sad',
    a_grab: 'angry', a_blocks: 'angry', a_queue: 'angry', a_laugh: 'angry',
    c_dark: 'scared', c_thunder: 'scared', c_bdog: 'scared', c_shot: 'scared',
    w_test: 'worried', w_mom: 'worried', w_rain: 'worried', w_path: 'worried',
    su_party: 'surprised', su_snow: 'surprised', su_egg: 'surprised', su_balls: 'surprised'
  };

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const dch1AllFwd = [], dch1Distinct = [], dch2Rev = [], dch3Agg = [], dch4Rev = [], genDch = {};
  const scenesAll = new Set();
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    const seen = [];                                  // 同关情境账（rev 全候选+fwd 题面同账——§R3）
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, seen, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
      if (L1.quizzes[k].mode === 'rev') L1.quizzes[k].faces.forEach(f => seen.push(f.scene));
      else seen.push(L1.quizzes[k].scene);
      (L1.quizzes[k].mode === 'rev' ? L1.quizzes[k].faces.map(f => f.scene) : [L1.quizzes[k].scene])
        .forEach(s => scenesAll.add(s));
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（照 shaperoof）
    /* 引擎直驱：逐题点应选卡 → right / 末题 done；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const i = correctIdx(q);
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      const r = engTapFace(L3, i);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 章分布聚合（⑨ 数据源） */
    const revN = L1.quizzes.filter(q => q.mode === 'rev').length;
    if (L1.dch === 1) {
      dch1AllFwd.push(L1.quizzes.every(q => q.mode === 'fwd'));
      dch1Distinct.push(new Set(L1.quizzes.map(q => q.emo)).size === CH_LEN);   // 全池互异供给
    }
    if (L1.dch === 2) dch2Rev.push(revN);
    if (L1.dch === 3) dch3Agg.push({
      hard: L1.quizzes.every(q => SPEC_HARD4.indexOf(q.emo) >= 0), rev: revN });
    if (L1.dch === 4) dch4Rev.push(revN);
    if (flat >= STATIC_LEVELS) genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll,
                   emos: L1.quizzes.map(q => q.emo),
                   modes: L1.quizzes.map(q => q.mode),
                   nearCount: L1.quizzes.filter(q => nearInFaces(q, q.emo)).length };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const distOk = dch1AllFwd.every(Boolean) && dch1Distinct.every(Boolean) &&   // dch1 全 fwd+全池互异
                 dch2Rev.every(n => n === 2) &&                                // dch2 rev=2/关
                 dch3Agg.every(a => a.hard && a.rev === 3) &&                  // dch3 硬对域+rev=3/关
                 dch4Rev.every(n => n >= 2 && n <= 3) &&                       // dch4 rev∈[2,3]
                 scenesAll.size >= 20 &&                                       // 情境覆盖 ≥20（池 24）
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;  // 生成关四型全现
  if (distOk) npass++;
  units.dist = { ok: distOk, dch1AllFwd: dch1AllFwd.every(Boolean), dch1Distinct: dch1Distinct.every(Boolean),
                 dch2Rev: dch2Rev, dch3: dch3Agg, dch4Rev: dch4Rev,
                 scenesCovered: scenesAll.size, genDch: genDch };

  /* ---- ② 封闭集+情境映射独立对账（SPEC_6/SPEC_NEAR 3 对/SPEC_SCENES 独立重列 × 40 关全题） ---- */
  total++;
  let tableOk = true, badCase = null;
  outer:
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const scSeen = [];
    for (let k = 0; k < L.quizzes.length; k++) {
      const q = L.quizzes[k];
      if (SPEC_6.indexOf(q.emo) < 0) { badCase = 'emo ' + flat + '/' + k; tableOk = false; break outer; }
      if (q.mode !== 'fwd' && q.mode !== 'rev') { badCase = 'mode ' + flat + '/' + k; tableOk = false; break outer; }
      if (!SPEC_SCENES.hasOwnProperty(q.scene)) { badCase = 'scene ' + flat + '/' + k; tableOk = false; break outer; }
      if (SPEC_SCENES[q.scene] !== q.emo) { badCase = 'sceneMap ' + flat + '/' + k; tableOk = false; break outer; }   // 映射唯一
      if (q.faces.length !== 4) { badCase = 'len ' + flat + '/' + k; tableOk = false; break outer; }
      const ems = q.faces.map(f => f.emo);
      if (ems.filter((v, i, a) => a.indexOf(v) === i).length !== 4) { badCase = 'dup ' + flat + '/' + k; tableOk = false; break outer; }
      for (let j = 0; j < 4; j++) {
        if (SPEC_6.indexOf(ems[j]) < 0) { badCase = 'face ' + flat + '/' + k + '/' + j; tableOk = false; break outer; }
      }
      const rights = q.faces.filter(f => f.right);
      if (rights.length !== 1) { badCase = 'rightN ' + flat + '/' + k; tableOk = false; break outer; }
      if (!nearInFaces(q, q.emo)) { badCase = 'nearMiss ' + flat + '/' + k; tableOk = false; break outer; }   // 近对恒在（全域）
      if (q.mode === 'rev') {
        if (rights[0].scene !== q.scene || SPEC_SCENES[rights[0].scene] !== q.emo) { badCase = 'revRight ' + flat + '/' + k; tableOk = false; break outer; }
        const scn = q.faces.map(f => f.scene);
        if (scn.filter((v, i, a) => a.indexOf(v) === i).length !== 4) { badCase = 'revDup ' + flat + '/' + k; tableOk = false; break outer; }
        for (let j = 0; j < 4; j++) {
          if (!SPEC_SCENES.hasOwnProperty(scn[j]) || SPEC_SCENES[scn[j]] !== ems[j]) { badCase = 'revMap ' + flat + '/' + k + '/' + j; tableOk = false; break outer; }
          if (q.faces[j].right !== (scn[j] === q.scene)) { badCase = 'right ' + flat + '/' + k + '/' + j; tableOk = false; break outer; }
          if (scSeen.indexOf(scn[j]) >= 0) { badCase = 'sceneDup ' + flat + '/' + k; tableOk = false; break outer; }
          scSeen.push(scn[j]);
        }
      } else {
        for (let j = 0; j < 4; j++) {
          if (q.faces[j].right !== (ems[j] === q.emo)) { badCase = 'right ' + flat + '/' + k + '/' + j; tableOk = false; break outer; }
        }
        if (rights[0].emo !== q.emo) { badCase = 'fwdRight ' + flat + '/' + k; tableOk = false; break outer; }
        if (scSeen.indexOf(q.scene) >= 0) { badCase = 'sceneDup ' + flat + '/' + k; tableOk = false; break outer; }
        scSeen.push(q.scene);
      }
      const ds = q.faces.filter(f => !f.right);
      if (ds.length !== 3 || ds.some(f => f.emo === q.emo)) { badCase = 'distr ' + flat + '/' + k; tableOk = false; break outer; }
      if (L.dch === 3 && SPEC_HARD4.indexOf(q.emo) < 0) { badCase = 'dch3pool ' + flat + '/' + k; tableOk = false; break outer; }
    }
  }
  if (tableOk) npass++;
  units.table = { ok: tableOk, bad: badCase };

  /* ---- ③ 近对恒在专项（flat0-4 五关全题，封闭三对逐题断言——r35 全域律） ---- */
  total++;
  const nearDetail = [];
  let near3Ok = true;
  for (let flat = 0; flat < 5; flat++) {
    const L = genLevel(flat);
    if (L.dch !== 1) { near3Ok = false; break; }
    const pairs = L.quizzes.map(q => q.emo + '>' + SPEC_NEAR[q.emo] + ':' + (nearInFaces(q, q.emo) ? 'in' : 'MISS'));
    if (!pairs.every(p => p.endsWith(':in'))) near3Ok = false;
    nearDetail.push(pairs);
  }
  if (near3Ok) npass++;
  units.near3 = { ok: near3Ok, detail: nearDetail };

  /* ---- ④ 点表情脸单元（flat0 真实 UI 状态机：错窗防重入 / 对推进 / miss 口径） ---- */
  total++;
  startLevel(0);
  const q4 = EM.quiz;
  const initOk = q4 && q4.emo === 'happy' && q4.faces.length === 4 &&
                 q4.faces.filter(f => f.emo === q4.emo).length === 1 &&
                 q4.step === 0 && q4.miss === 0 && q4.faces[0].id === 'f0';
  const badTap = (await EM.tapFace(99)) === false;           // 非法下标=false（不炸）
  const wrongIdx = q4.faces.findIndex(f => f.emo !== q4.emo);
  const pW = EM.tapFace(wrongIdx);                           // → wrong（1000ms 防重入窗）
  const rejW = await EM.tapFace(wrongIdx);                   // 窗内紧邻再点=被拦 false
  const rW = await pW;
  const s1 = rW === 'wrong' && rejW === false &&
             EM.quiz.miss === 1 && EM.currentLevel.miss === 1;
  const rR = await EM.tapFace(q4.faces.findIndex(f => f.emo === q4.emo));
  const s2 = rR === 'right' && EM.quiz.step === 1 && EM.quiz.miss === 0;
  const tapOk = initOk && badTap && s1 && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk, badTap: badTap, wrong: s1, winReject: rejW, right: s2 };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __emDemoR='right'（演示选开心脸） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;                      // 折算真实页时长
  const tutOk = window.__emDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].emo === 'happy' && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__emDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 脸卡排容器 bump ---- */
  total++;
  startLevel(0);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await EM.tapFace(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await EM.tapFace(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && EM.quiz.step === 0 && EM.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（5 题 taps=5，恒 3 星） ---- */
  total++;
  startLevel(0);
  const a0 = await EM.autoSolve();
  const lv0 = EM.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat10（dch3 rev 主载）先点 1 次干扰卡再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  const q8 = EM.quiz;
  const wrongC = q8.faces.findIndex(f => f.emo !== q8.emo);
  const r8 = await EM.tapFace(wrongC);
  const a10 = await EM.autoSolve();
  const lv10 = EM.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑯ rev 语义单元（r35 新增）：flat10 进 rev 题（dch3 rev=3/关，首题可能 fwd——
     逐题步进至 rev 题再断言）：quiz.mode/faces.scene 契约 + 题面 DOM=大表情脸 +
     board.rev 2×2 情境卡（data-scene=faces.scene）+ tap 错（miss+1）/对（right 推进） ---- */
  total++;
  startLevel(10);
  let revQ = null, revOk = true, revTried = 0;
  for (let s = 0; s < CH_LEN && !revQ; s++) {             // 步进至第一道 rev 题（错窗不触发——直点对推进）
    const qq = EM.quiz;
    if (qq && qq.mode === 'rev') { revQ = qq; break; }
    if (!qq) { revOk = false; break; }
    const i = correctIdx(cur.quizzes[cur.step]);
    await EM.tapFace(i);
    revTried++;
  }
  if (!revQ) revOk = false;
  if (revQ) {
    const domOk = sceneEl.querySelector('.revface svg') !== null &&          // 题面=大表情脸
                  boardEl.classList.contains('rev') &&                        // 2×2 网格类
                  boardEl.querySelectorAll('.card .swrap svg').length === 4;  // 4 情境图
    const contractOk = revQ.faces.every(f => f.scene && revQ.faces.filter(x => x.scene === f.scene).length === 1) &&
                       revQ.faces.some(f => f.scene === revQ.scene);
    const domScenes = Array.prototype.map.call(boardEl.querySelectorAll('.card'),
      c => c.dataset.scene || null);
    const domMatch = contractOk && domScenes.filter(Boolean).length === 4 &&
                     revQ.faces.every(f => domScenes.indexOf(f.scene) >= 0);
    /* 点 1 次错误情境（情绪≠目标且非答案情境）→ wrong+miss；再点答案情境 → right 推进 */
    const wIdx = revQ.faces.findIndex(f => f.scene !== revQ.scene);
    const rW2 = await EM.tapFace(wIdx);
    const missOk = EM.quiz && EM.quiz.miss === 1 && EM.quiz.step === revQ.step;
    const rIdx = revQ.faces.findIndex(f => f.scene === revQ.scene);
    const rR2 = await EM.tapFace(rIdx);
    const stepOk = rR2 === 'right' && EM.currentLevel.step === revQ.step + 1;
    revOk = domOk && domMatch && missOk && stepOk && rW2 === 'wrong' && revTried < CH_LEN;
  }
  if (revOk) npass++;
  units.rev = { ok: revOk, mode: revQ && revQ.mode, steppedTo: revTried };

  /* ---- ⑩ 布局：双 viewport ×（flat0 ch1 fwd / flat10 ch3 rev / flat17 ch4 混合）量测 + 描边对比度 ---- */
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
    const lv = cur;
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length === 4 && cards.every(b => b.w >= 96 && b.h >= 96);   // 两向候选卡同守 ≥96
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    const isRev = lv && lv.quizzes[lv.step] && lv.quizzes[lv.step].mode === 'rev';
    const revDomOk = !isRev || (sceneEl.querySelector('.revface svg') !== null &&
                                 boardEl.querySelectorAll('.card .swrap svg').length === 4);
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&                        // 候选卡描边 INK 对底
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, mode: isRev ? 'rev' : 'fwd', cards: cards.length,
             hitOk: hitOk, sceneOk: sceneOk, revDomOk: revDomOk,
             contrast: cB && cS, ox: ox, pass: hitOk && sceneOk && revDomOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 10, 17]) {
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

  /* ---- ⑪ clips：emo_ 59 条 + core 3 条全注入（62=注册前现状口径；emo_rev_q 注册后 63
       ——SPEC-R35-EMO §R7：TODO 键由主线 gen_clips 统一注册，届时本断言与 build.py 联动改 63） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['emo_tut_watch', 'emo_tut_turn', 'emo_hint', 'emo_right', 'emo_wrong',
                'emo_w_happy', 'emo_w_sad', 'emo_w_angry', 'emo_w_scared', 'emo_w_surprised', 'emo_w_worried',
                'emo_rev_q',
                'core_chapter_end', 'core_day_end', 'core_rest'];   // r35 审查 m-1：need 补注册键
  const t46ok = keys.filter(k => k.indexOf('emo_s_') === 0 || k.indexOf('emo_cf_') === 0).length === 48;
  const clipsOk = keys.length === 63 && t46ok &&
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length };

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

  /* ---- ⑬ 章末预告 C7 关键词断言（SPEC-R35-EMO §R2 新文案；hint[i] ↔ CHAPTERS[i+1]；
     GEN_HINTS[k] ↔ dch=k+1——断言从 SPEC 推导） ---- */
  total++;
  const hintOk = CHAPTERS[1].hint.indexOf('哪件事') >= 0 &&                        // 预告 ch2 rev 逆向
                 CHAPTERS[2].hint.indexOf('像') >= 0 && CHAPTERS[2].hint.indexOf('仔细') >= 0 &&   // 预告 ch3 硬对辨析
                 CHAPTERS[3].hint.indexOf('正') >= 0 && CHAPTERS[3].hint.indexOf('反') >= 0 &&     // 预告 ch4 双向
                 CHAPTERS[3].hint.indexOf('挑战') >= 0 &&
                 CHAPTERS[4].hint.indexOf('挑战') >= 0 &&                         // 预告生成关
                 GEN_HINTS[0].indexOf('六') >= 0 &&                               // dch1 全池
                 GEN_HINTS[1].indexOf('哪件事') >= 0 &&                           // dch2 rev
                 GEN_HINTS[2].indexOf('像') >= 0 &&                               // dch3 硬对
                 GEN_HINTS[3].indexOf('正') >= 0 && GEN_HINTS[3].indexOf('反') >= 0;   // dch4 双向混合
  if (hintOk) npass++;
  units.hints = { ok: hintOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑭ 表情脸六型互异（§2 同脸不同情）：SVG 结构签名互异 + 两两 ≥2 维不同 ---- */
  total++;
  const dims = {};
  SPEC_6.forEach(e => {
    const f = FACE_ELS[e];
    dims[e] = { brow: f.brow, eye: f.eye, mouth: f.mouth };
  });
  let faceOk = true, faceBad = '';
  for (let a = 0; a < SPEC_6.length && faceOk; a++) {
    for (let b = a + 1; b < SPEC_6.length && faceOk; b++) {
      const A = dims[SPEC_6[a]], B = dims[SPEC_6[b]];
      const diff = ['brow', 'eye', 'mouth'].filter(k => A[k] !== B[k]).length;
      if (diff < 2) { faceOk = false; faceBad = SPEC_6[a] + '/' + SPEC_6[b] + ' diff=' + diff; }
    }
  }
  /* 基座恒同（禁用颜色/装饰代替表情——变体只允许在眉/眼/嘴三维） */
  const baseSame = SPEC_6.every(e => faceSvg(e).indexOf(FACE_BASE.head) >= 0 &&
                                    faceSvg(e).indexOf(FACE_BASE.blush) >= 0);
  /* faceSig 六型签名互异 */
  const sigSet = new Set(SPEC_6.map(faceSig));
  const sigOk = sigSet.size === 6;
  if (faceOk && baseSame && sigOk) npass++;
  units.faces = { ok: faceOk && baseSame && sigOk, hamming: faceOk, baseSame: baseSame, sigDistinct: sigOk, bad: faceBad };

  /* ---- ⑮ verify 提速断言 ---- */
  total++;
  const speedOk = SPEED === 0.12;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED };

  const out = { game: 'emo', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  KIDS.voice.say = function () {};
  runVerify();
}
