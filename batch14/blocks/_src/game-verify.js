/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     章型一致（dch1 全 count；dch2/3/4 除首题热身外全 fill/front/top；静态关=循环章，生成关 dch∈1-4）/
     数值域独立复算（verify 侧另写 refTotal/refFront/refTop，禁复用引擎 projFront/projTop——
     两套逻辑同错不可检）：ch1 3×2 无空列柱高 1-3 总块 4-12；ch2 目标盒三档高恒 2 缺 2-6
     每柱 0-目标高；ch3/4 柱高 0-3 投影正确非平凡 /
     柱高物理合法（整数 0-3、基底 ≤3×3）/ 干扰约束（count/fill=±1/±2 池互异禁 0 负；
     front=某列±1 或两列互换；top=一格翻转或对角镜像——均独立复算）/
     热身（dch2/3/4 qi0=count 型）/ 同关相邻柱高布局互异 / structOk
   ①b 引擎直驱：非法下标 null → 错卡 miss/retries 恰一次 → 正确卡 'right'/'done' 推进；
     星级三档（全对 3★/一错 2★/多错 1★）
   ② UI 单元（flat0 真实 UI）：数字卡 DOM + 场景 SVG（.cu 立方体数=总块数、地面格数=R×C）
     + tapAnswer 推进 + 场景/答案/角标渲染对账
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次=2 星，错卡晃动不灰化，verify 页不弹层）
   ④ UI 冒烟 B：flat5（ch2 fill：首题 count 热身+虚线目标盒 DOM）/ flat10（ch3 front 图卡
     真实点击通关）/ flat15（ch4 top 图卡真实点击通关）
   ⑦ 教学链（verify 直驱 tutorialWatch）：逐柱点数演示 → uiPick 演示返回值 __bkDemoR==='right'
     （§0.27 演示生效实证）→ 重发同关 → 交接链 queue([blo_tut_turn, 题面]) → tut='help'
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15）：答案卡（数字卡/图卡）≥96、
     全按钮 ≥64（.k-parentbtn 豁免）、场景 SVG 尺寸非零、overflowX ≤0
   ⑥ 分布与专项：VOICE 表文案独立字面量对账（SPEC §1 定稿）/ blo_* 20 条 clips 注入 clipOk /
     开场顺序链 queue([blo_hint, 题面 clip]) 单通道 / answerIdx 三位置均出现且首位 <60%
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0];

  /* ---- verify 侧独立复算（不调引擎 projFront/projTop/sumOf，防两套逻辑同错） ---- */
  function refTotal(cols) {                      // 独立总块数
    let s = 0;
    for (let r = 0; r < cols.length; r++) for (let c = 0; c < cols[r].length; c++) s += cols[r][c];
    return s;
  }
  function refFront(cols) {                      // 独立正视图：每列 c 取 max over r
    const out = [];
    for (let c = 0; c < cols[0].length; c++) {
      let m = 0;
      for (let r = 0; r < cols.length; r++) if (cols[r][c] > m) m = cols[r][c];
      out.push(m);
    }
    return out;
  }
  function refTop(cols) {                        // 独立俯视图：h>0 亮格二值
    const out = [];
    for (let r = 0; r < cols.length; r++) {
      const row = [];
      for (let c = 0; c < cols[r].length; c++) row.push(cols[r][c] > 0 ? 1 : 0);
      out.push(row);
    }
    return out;
  }
  const sameArr = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function refNumCands(ans) {                    // count/fill 干扰池：±1/±2 滤 0 负/同答案
    const out = [];
    [ans - 2, ans - 1, ans + 1, ans + 2].forEach(v => { if (v > 0 && v !== ans && out.indexOf(v) < 0) out.push(v); });
    return out;
  }
  function isFrontDistractor(ans, d) {           // front 干扰独立判别：恰一列 ±1 / 两列互换
    if (ans.length !== d.length) return false;
    let diffs = [];
    for (let c = 0; c < ans.length; c++) if (ans[c] !== d[c]) diffs.push(c);
    if (diffs.length === 1) { const c = diffs[0]; return d[c] === ans[c] + 1 || d[c] === ans[c] - 1; }
    if (diffs.length === 2) {                                    // 两列互换（值互为对方）
      const [a, b] = diffs;
      return d[a] === ans[b] && d[b] === ans[a];
    }
    return false;
  }
  function isTopDistractor(ans, d, R, C) {        // top 干扰独立判别：一格翻转 / 对角镜像
    if (d.length !== R || d[0].length !== C) return false;
    let flips = 0, valid = true;
    for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
      if (d[r][c] !== (ans[r][c] ? 1 : 0) && d[r][c] !== (ans[r][c] ? 0 : 1)) valid = false;
      if (d[r][c] !== ans[r][c]) flips++;
    }
    if (valid && flips === 1) return true;                       // 一格翻转
    if (R === C) {                                               // 对角镜像 transpose
      let t = true;
      for (let r = 0; r < R && t; r++) for (let c = 0; c < C && t; c++)
        if (d[r][c] !== ans[c][r]) t = false;
      if (t) return true;
    }
    return false;
  }
  /* 数值域独立审计（含 SPEC §1 全约束） */
  function refRangeOk(dch, qi, q) {
    if (q.R < 1 || q.R > 3 || q.C < 1 || q.C > 3) return false;   // 基底 ≤3×3
    if (q.cols.length !== q.R || q.cols.some(row => row.length !== q.C)) return false;
    for (let r = 0; r < q.R; r++) for (let c = 0; c < q.C; c++)
      if (!Number.isInteger(q.cols[r][c]) || q.cols[r][c] < 0 || q.cols[r][c] > 3) return false;  // 柱高物理合法
    if (q.kind === 'count') {
      if (q.R !== 3 || q.C !== 2) return false;                   // 3×2 基底
      if (q.cols.some(row => row.some(h => h < 1))) return false; // 无空列每格 h≥1
      const t = refTotal(q.cols);
      return t === q.ans && t >= 6 && t <= 12;                    // 总块 6-12（SPEC 定稿，审查 m4 统一口径）
    }
    if (q.kind === 'fill') {
      if (!q.goal || q.goal.length !== q.R) return false;
      if (q.goal.some(row => row.some(v => v !== 2))) return false;               // 目标高恒 2
      const cap = refTotal(q.goal);
      if (!((q.R === 2 && q.C === 2 && cap === 8) || (q.R === 3 && q.C === 2 && cap === 12) ||
            (q.R === 2 && q.C === 3 && cap === 12))) return false;                // 目标盒三档
      for (let r = 0; r < q.R; r++) for (let c = 0; c < q.C; c++)
        if (q.cols[r][c] < 0 || q.cols[r][c] > q.goal[r][c]) return false;        // 每柱 0-目标高
      const holes = cap - refTotal(q.cols);
      return holes === q.ans && holes >= 2 && holes <= 6;                         // 缺 2-6
    }
    if (q.kind === 'front') {
      if (!sameArr(q.ans, refFront(q.cols))) return false;       // 投影正确（独立复算）
      if (q.ans.some(v => v < 0 || v > 3)) return false;
      return q.ans.some(v => v > 0);                             // 非全 0（投影可辨）
    }
    if (q.kind === 'top') {
      if (!sameArr(q.ans, refTop(q.cols))) return false;         // 投影正确（独立复算）
      let lit = 0;
      q.ans.forEach(row => row.forEach(v => { if (v) lit++; }));
      return lit >= 2 && lit <= q.R * q.C - 1;                   // 翻转干扰可行前提
    }
    return false;
  }

  /* ---- ① 40 关全量审计 + ①b 引擎直驱（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, kindAll = true, warmOk = true, adjOk = true,
        structAll = true, distrAll = true, driveOk = true;
    let prevSer = null;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;   // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    const wantKind = qi => qi === 0 && L1.dch !== 1 ? 'count' :       // dch2/3/4 首题=count 热身
      (L1.dch === 1 ? 'count' : L1.dch === 2 ? 'fill' : L1.dch === 3 ? 'front' : 'top');
    L1.quizzes.forEach((q, i) => { if (q.kind !== wantKind(i)) kindAll = false; });     // 章型一致
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refRangeOk(L1.dch, k, q)) rangeAll = false;
      if (!structOk(q)) structAll = false;
      const serNow = q.cols.map(r => r.join('')).join('/');
      if (serNow === prevSer) adjOk = false;                          // 同关相邻堆互异
      prevSer = serNow;
      /* 干扰约束（独立复算） */
      q.items.forEach((v, idx) => {
        if (idx === q.answerIdx) return;
        if (q.kind === 'count' || q.kind === 'fill') {
          if (v === q.ans || refNumCands(q.ans).indexOf(v) < 0) distrAll = false;     // ±1/±2 池禁 0 负
        } else if (q.kind === 'front') {
          if (sameArr(v, q.ans) || !isFrontDistractor(q.ans, v)) distrAll = false;
        } else {
          if (sameArr(v, q.ans) || !isTopDistractor(q.ans, v, q.R, q.C)) distrAll = false;
        }
      });
      idxDist[q.answerIdx]++;
    }
    if (L1.dch !== 1) {                                               // 热身=count 型（SPEC §1）
      const w = L1.quizzes[0];
      warmOk = w.kind === 'count' && w.warm === true && w.R === 3 && w.C === 2;
    } else warmOk = L1.quizzes[0].warm === false;

    /* 引擎直驱（retries 为关级累计：断言用题内增量，base=本题起始 retries） */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (engPick(Ld, 99) !== null || engPick(Ld, 0.5) !== null) driveOk = false;   // 非法下标
      let wi = 0; while (wi === q.answerIdx) wi++;
      if (engPick(Ld, wi) !== 'wrong' || q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;  // 错卡恰一次
      if (engPick(Ld, q.answerIdx) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) driveOk = false;
    }
    /* 星级三档独立驱动 */
    const s1 = Ld.done && Ld.retries >= 5 && engStars(Ld) === 1;      // 每题一错（5 题=5 错=1★）
    const L2x = genLevel(flat);
    let g2 = 0;
    while (!L2x.done && g2++ < 30) {
      const q = L2x.quizzes[L2x.step];
      if (L2x.step === 0) { let wi = 0; while (wi === q.answerIdx) wi++; engPick(L2x, wi); }
      engPick(L2x, q.answerIdx);
    }
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L3 = genLevel(flat);
    let guard = 0;
    while (!L3.done && guard++ < 30) engPick(L3, L3.quizzes[L3.step].answerIdx);
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;
    const ok = det && L1.quizzes.length === CH_LEN && rangeAll && kindAll && warmOk &&
      adjOk && structAll && distrAll && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, kindAll: kindAll,
      warmOk: warmOk, adjOk: adjOk, structAll: structAll, distrAll: distrAll, driveOk: driveOk,
      stars: { many1: engStars(Ld), wrong1: engStars(L2x), clean: engStars(L3) },
      qs: L1.quizzes.map(q => q.kind === 'count' ? 'c' + q.ans + '(' + q.cols.map(r => r.join('')).join('/') + ')'
        : q.kind === 'fill' ? 'f' + q.ans + '(' + q.cols.map(r => r.join('')).join('/') + '/' + q.goal.map(r => r.join('')).join('/') + ')'
        : q.kind === 'front' ? 'F' + q.ans.join('') + '(' + q.cols.map(r => r.join('')).join('/') + ')'
        : 'T' + q.ans.map(r => r.join('')).join('') + '(' + q.cols.map(r => r.join('')).join('/') + ')') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② UI 单元（flat0 真实 UI）：场景 SVG 立方体数对账 + 数字卡 DOM + tapAnswer 推进 ---- */
  total++;
  startLevel(0);
  const q0 = BK.quiz;
  const svgEl = sceneEl.querySelector('svg.scene');
  const cuN = sceneEl.querySelectorAll('.cu').length;
  const gndN = sceneEl.querySelectorAll('.ground path').length;
  const optN = answersEl.querySelectorAll('.opt').length;
  const cuOk = q0 && q0.kind === 'count' && !!svgEl && cuN === refTotal(q0.cols) && gndN === q0.R * q0.C;
  const domOk = optN === 3 && answersEl.querySelectorAll('.opt.card').length === 0;   // count=数字卡非图卡
  const ansTxt = q0 ? answersEl.querySelectorAll('.opt')[q0.answerIdx].textContent : '';
  const txtOk = q0 && ansTxt === String(q0.options[q0.answerIdx]);
  /* 真实点一张错卡 + 正确卡推进 */
  let w0 = 0; if (q0) { while (w0 === q0.answerIdx) w0++; }
  const rw = await BK.tapAnswer(w0);
  const rr = await BK.tapAnswer(q0 ? q0.answerIdx : 0);
  const flowOk = rw === 'wrong' && rr === 'right' && BK.currentLevel.step === 1 && BK.currentLevel.retries === 1;
  const selfOk = !!(cuOk && domOk && txtOk && flowOk);
  if (selfOk) npass++;
  units.ui = { ok: selfOk, cuOk: cuOk, cuN: cuN, gndN: gndN, optN: optN, txtOk: txtOk, flowOk: flowOk };

  /* ---- ②a 几何审计（§0.15 本款最大难点）：等轴测共享顶点精确 + 画序遮挡 + 三面色阶
     + front/top 投影卡渲染对账（DOM path 数字解析独立复算，不信生成器自述） ---- */
  total++;
  startLevel(0);
  let geoOk = true, geoN = 0, orderOk = true, fillOk = true;
  const pts = d => (d.match(/-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/g) || []).map(s => s.split(',').map(Number));
  const sameP = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  const fills = new Set();
  sceneEl.querySelectorAll('.cu').forEach(g => {
    const t = pts(g.querySelector('.f-top').getAttribute('d'));
    const rt = pts(g.querySelector('.f-right').getAttribute('d'));
    const lf = pts(g.querySelector('.f-left').getAttribute('d'));
    geoN++;
    if (t.length !== 4 || rt.length !== 4 || lf.length !== 4) { geoOk = false; return; }
    /* 共享顶点：right 上边 e'/s' = top 东/南；left 上边 w'/s' = top 西/南；left 底 s = right 底 s */
    if (!sameP(rt[3], t[1]) || !sameP(rt[2], t[2]) || !sameP(lf[2], t[3]) ||
        !sameP(lf[3], t[2]) || !sameP(lf[0], rt[1])) geoOk = false;
    /* 公式精确复算（isoFaces 同构独立写）：n' = ((c-r)ux, (c+r)uy-(k+1)uz) */
    const r = Number(g.dataset.r), c = Number(g.dataset.c), k = Number(g.dataset.k);
    if (Math.abs(t[0][0] - (c - r) * 34) > 1e-6 ||
        Math.abs(t[0][1] - ((c + r) * 17 - (k + 1) * 38)) > 1e-6) geoOk = false;
    /* 三面色阶互异（§0.10 面间可辨识） */
    const ft = g.querySelector('.f-top').getAttribute('fill'),
          fr = g.querySelector('.f-right').getAttribute('fill'),
          fl = g.querySelector('.f-left').getAttribute('fill');
    if (ft === fr || fr === fl || ft === fl) fillOk = false;
    fills.add(ft); fills.add(fr); fills.add(fl);
  });
  { /* 画序遮挡：DOM 序 depth=r+c 单调不减（后排先画被前排正确遮挡，SPEC §1） */
    let prevD = -1;
    sceneEl.querySelectorAll('.cu').forEach(g => {
      const d = Number(g.dataset.r) + Number(g.dataset.c);
      if (d < prevD) orderOk = false;
      prevD = d;
    });
  }
  /* fill 题（flat5 第二题）虚线目标盒：目标顶菱形数=Σ(gt>0)、缺口竖围栏=3*Σ(gt>h) */
  startLevel(5);
  await BK.tapAnswer(BK.quiz.answerIdx);
  const q5g = BK.quiz;
  let goalN = 0;
  if (q5g.kind === 'fill') {
    let diamonds = 0, fences = 0;
    for (let r = 0; r < q5g.R; r++) for (let c = 0; c < q5g.C; c++) {
      if (q5g.goal[r][c] > 0) diamonds++;
      if (q5g.goal[r][c] > q5g.cols[r][c]) fences++;
    }
    const paths = sceneEl.querySelectorAll('.goalbox path').length;
    goalN = paths === diamonds + 3 * fences ? paths : -1;
    /* 审查 M3 复发断言：虚线目标盒全部顶点在 viewBox 内（goal 高计入包围盒——原只按当前柱高被裁剪） */
    const vb2 = sceneEl.querySelector('svg.scene').getAttribute('viewBox').split(' ').map(Number);
    sceneEl.querySelectorAll('.goalbox path').forEach(pp => {
      pts(pp.getAttribute('d')).forEach(pt => {
        if (pt[0] < vb2[0] || pt[0] > vb2[0] + vb2[2] || pt[1] < vb2[1] || pt[1] > vb2[1] + vb2[3]) goalN = -2;
      });
    });
  }
  /* 审查 M3 复发断言：教学角标圆（最南柱 dbadge）整体在 viewBox 内（含默认隐藏态——display 不裁剪 viewBox 判定） */
  {
    const vbA = sceneEl.querySelector('svg.scene').getAttribute('viewBox').split(' ').map(Number);
    sceneEl.querySelectorAll('.dbadge').forEach(bg => {
      const cx = Number(bg.querySelector('circle').getAttribute('cx')),
            cy = Number(bg.querySelector('circle').getAttribute('cy'));
      if (cx - 14 < vbA[0] || cx + 14 > vbA[0] + vbA[2] || cy - 14 < vbA[1] || cy + 14 > vbA[1] + vbA[3]) goalN = -3;
    });
  }
  /* top 投影卡（flat15 第二题）：每卡 rect 数=R*C 且亮/暗 fill 与 foot 对账 */
  startLevel(15);
  await BK.tapAnswer(BK.quiz.answerIdx);
  const q15g = BK.quiz;
  let cardOk2 = false;
  if (q15g.kind === 'top') {
    cardOk2 = true;
    answersEl.querySelectorAll('.opt.card').forEach(card => {
      const rects = card.querySelectorAll('rect');
      if (rects.length !== q15g.R * q15g.C) { cardOk2 = false; return; }
      let i = 0;
      for (let r = 0; r < q15g.R && cardOk2; r++) for (let c = 0; c < q15g.C; c++, i++) {
        const want = q15g.options[Number(card.dataset.i)][r][c] ? '#E8975A' : '#F3E7D0';
        if (rects[i].getAttribute('fill') !== want) cardOk2 = false;
        if (Math.abs(Number(rects[i].getAttribute('x')) - (7 + c * 30)) > 1e-6 ||
            Math.abs(Number(rects[i].getAttribute('y')) - (7 + r * 30)) > 1e-6) cardOk2 = false;
      }
    });
  }
  /* front 投影卡（flat10 第二题）：每列条形从底往上堆叠（y 递减 ch=26）+ 基线存在 */
  startLevel(10);
  await BK.tapAnswer(BK.quiz.answerIdx);
  const q10g = BK.quiz;
  let frontOk = false;
  if (q10g.kind === 'front') {
    frontOk = true;
    answersEl.querySelectorAll('.opt.card').forEach(card => {
      const prof = q10g.options[Number(card.dataset.i)];
      const rects = card.querySelectorAll('rect');
      if (rects.length !== prof.reduce((s, v) => s + v, 0)) { frontOk = false; return; }
      let i = 0;
      for (let c = 0; c < prof.length && frontOk; c++) {
        let prevY = Infinity;
        for (let b = 0; b < prof[c]; b++, i++) {
          const y = Number(rects[i].getAttribute('y'));
          if (!(y < prevY) || Math.abs((y + 26) % 26 - 8) > 6) frontOk = false;   /* 向上堆叠且贴 26 网格 */
          if (Math.abs(Number(rects[i].getAttribute('x')) - (8 + c * 42)) > 1e-6) frontOk = false;
          prevY = y;
        }
      }
    });
  }
  const geoAll = geoOk && orderOk && fillOk && fills.size === 3 && goalN > 0 && cardOk2 && frontOk;
  if (geoAll) npass++;
  units.geo = { ok: geoAll, cubes: geoN, vertexOk: geoOk, orderOk: orderOk, fillOk: fillOk,
    fills: Array.from(fills), goalbox: goalN, topCards: cardOk2, frontCards: frontOk };
  startLevel(0);                                // 还原 flat0

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'blo_wrong').length;
  startLevel(0);                                          // flat0：每错必播
  await BK.tapAnswer((() => { const q = BK.quiz; let i = 0; while (i === q.answerIdx) i++; return i; })());
  await BK.tapAnswer((() => { const q = BK.quiz; let i = 0; while (i === q.answerIdx) i++; return i; })());
  const sayA = wrongPlays();                              // → 2
  startLevel(3);                                          // flat3：10s 节流
  lastWrongVoice = Date.now();                            /* 显式进入节流窗口内 */
  await BK.tapAnswer((() => { const q = BK.quiz; let i = 0; while (i === q.answerIdx) i++; return i; })());
  const sayB = wrongPlays() - 2;                          // 增量 → 0
  startLevel(3);                                          // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                                     /* 隔离上一子用例时间戳 */
  await BK.tapAnswer((() => { const q = BK.quiz; let i = 0; while (i === q.answerIdx) i++; return i; })());   // miss=1 → 播（窗口外）
  await BK.tapAnswer((() => { const q = BK.quiz; let i = 0; while (i === q.answerIdx) i++; return i; })());   // miss=2 → force → 播
  const sayC = wrongPlays() - 2 - sayB;                   // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = BK.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                                        // 首错：卡晃动不灰化可重点；首错不 pulse
      let wi = 0; while (wi === q.answerIdx) wi++;
      const r = await BK.tapAnswer(wi);
      const el = answersEl.querySelectorAll('.opt')[wi];
      const wig = el.classList.contains('wrong');         /* 晃动类挂上（不灰化款） */
      const pe = getComputedStyle(el).pointerEvents !== 'none';
      wrongOk = r === 'wrong' && wig && pe &&
        BK.currentLevel.retries === 1 && BK.currentLevel.step === 0 &&
        !optEl(q.answerIdx).classList.contains('breathe');   /* 首错不 pulse 正确卡（miss=1）参与判定（审查 M4：原空体 if 恒真） */
    }
    const q2 = BK.quiz;
    const r = await BK.tapAnswer(q2.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    quizzesA++;
  }
  const lvA = BK.currentLevel;
  const smokeOkA = smokeA && wrongOk && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, quizzes: quizzesA,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat5（ch2 fill）首题 count 热身 + 虚线目标盒 DOM + autoSolve 3 星 ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const warm5 = cur.dch === 2 && L5.quizzes[0].kind === 'count' && L5.quizzes[0].warm;
  const q5a = BK.quiz;
  const warmScene = q5a.kind === 'count' && !sceneEl.querySelector('.goalbox');   // 热身期无虚线盒
  await BK.tapAnswer(q5a.answerIdx);                     // 进第二题（fill）
  const q5b = BK.quiz;
  const goalboxOk = q5b.kind === 'fill' && !!sceneEl.querySelector('.goalbox') &&
    !!sceneEl.querySelector('.goalbox path');
  const fillCard = q5b && !answersEl.querySelector('.opt.card');   // fill=数字卡
  const a5 = await BK.autoSolve();
  const lv5 = BK.currentLevel;
  const smokeOkB1 = warm5 && warmScene && goalboxOk && fillCard && a5.done && lv5.done && lv5.won &&
    lv5.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, warm: warm5, goalbox: goalboxOk, picks: a5.picks, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat10（ch3 front）首题热身 + 正视图图卡真实点击通关 ---- */
  total++;
  startLevel(10);
  const L10 = genLevel(10);
  const warm10 = cur.dch === 3 && L10.quizzes[0].kind === 'count' && L10.quizzes[0].warm;
  await BK.tapAnswer(BK.quiz.answerIdx);                 // 首题热身（count）
  const q10 = BK.quiz;
  const cardOk = q10.kind === 'front' && answersEl.querySelectorAll('.opt.card').length === 3 &&
    answersEl.querySelectorAll('.opt.card svg rect').length >= 3;   // 图卡（非文字卡）
  let playB2 = true, quizzesB = 1;
  for (let s = 1; s < CH_LEN && playB2; s++) {
    const q = BK.quiz;
    if (!q) { playB2 = false; break; }
    const r = await BK.tapAnswer(q.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB2 = false;
    quizzesB++;
  }
  const lv10 = BK.currentLevel;
  const smokeOkB2 = warm10 && cardOk && playB2 && quizzesB === CH_LEN && lv10.done && lv10.won &&
    lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB2) npass++;
  smokes.flat10 = { ok: smokeOkB2, warm: warm10, card: cardOk, quizzes: quizzesB, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B3：flat15（ch4 top）首题热身 + 俯视图图卡真实点击通关 ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const warm15 = cur.dch === 4 && L15.quizzes[0].kind === 'count' && L15.quizzes[0].warm;
  await BK.tapAnswer(BK.quiz.answerIdx);
  const q15 = BK.quiz;
  const topOk = q15.kind === 'top' && answersEl.querySelectorAll('.opt.card').length === 3 &&
    answersEl.querySelectorAll('.opt.card svg rect').length === q15.R * q15.C * 3;   // 每卡 R×C 格
  let playB3 = true, quizzesC = 1;
  for (let s = 1; s < CH_LEN && playB3; s++) {
    const q = BK.quiz;
    if (!q) { playB3 = false; break; }
    const r = await BK.tapAnswer(q.answerIdx);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB3 = false;
    quizzesC++;
  }
  const lv15 = BK.currentLevel;
  const smokeOkB3 = warm15 && topOk && playB3 && quizzesC === CH_LEN && lv15.done && lv15.won &&
    lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB3) npass++;
  smokes.flat15 = { ok: smokeOkB3, warm: warm15, top: topOk, quizzes: quizzesC, stars: engStars(cur) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch）：逐柱演示 → demoR 实证 → 重发同关 → 交接链 ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  window.__bkDemoR = null;
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → 逐柱点数 → 演示答对 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = BK.quiz;
  const demoR = window.__bkDemoR;
  const tutOk = pLog7.indexOf('blo_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    demoR === 'right' &&                                                   /* §0.27 演示真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&               /* 帮：解锁等孩子动手 */
    BK.currentLevel && BK.currentLevel.flat === 0 &&                      /* 重发同关 */
    BK.quiz && BK.quiz.step === 0 && BK.quiz.miss === 0 &&                /* 新题面初态 */
    lastQ7 && lastQ7.length === 2 && lastQ7[0] === 'blo_tut_turn' &&      /* 交接顺序链单通道 */
    lastQ7[1] === 'blo_q_count';
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('blo_tut_watch') >= 0,
    demoR: demoR, handoff: !!lastQ7, parts: lastQ7, tut: state.tut };

  /* ---- ⑤ 布局：双 viewport ×（flat0/5/10/15）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：opt-in scale(0) 起帧） ---- */
  async function simLevel(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 答案卡入场动画 .38s+delay .14s（真实 ms，不吃 SPEED）
    const de = document.documentElement;
    const opts = Array.prototype.slice.call(answersEl.querySelectorAll('.opt'));
    const optOk = opts.length === 3 &&
      opts.every(b => { const r = b.getBoundingClientRect(); return r.width >= 96 && r.height >= 96; });
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const sv = sceneEl.querySelector('svg.scene');
    const sr = sv ? sv.getBoundingClientRect() : null;
    const sceneOk = !!sr && sr.width >= 100 && sr.height >= 80;   // 场景 SVG 可见非零
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, optOk: optOk, btnOk: btnOk, sceneOk: sceneOk,
      ox: ox, pass: optOk && btnOk && sceneOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simLevel(1280, 800, f));
    sims.push(await simLevel(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / 覆盖率 ---- */
  total++;
  /* SPEC §1 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！方块叠叠高' &&
    VOICE.turn.text === '你来数一数' && VOICE.hint.text === '看不见的也要数一数' &&
    VOICE.wrong.text === '再想一想，数一数' &&
    VOICE.qcount.text === '数一数，一共有几个方块' && VOICE.qfill.text === '数一数，还缺几个方块' &&
    VOICE.qfront.text === '从前面看，是哪一个呀' && VOICE.qtop.text === '从上面往下看，是哪一个呀';
  const numCnOk = numCn(3) === '三' && numCn(10) === '十' && numCn(12) === '十二';
  /* blo_* 全部 20 条 clips 注入对账（build 注入后 KIDS.voice.clips 应含全部）+ core 3 条 */
  const BLO_KEYS = ['blo_tut_watch', 'blo_tut_turn', 'blo_hint', 'blo_wrong',
    'blo_q_count', 'blo_q_fill', 'blo_q_front', 'blo_q_top']
    .concat(Array.from({ length: 12 }, (_, i) => 'blo_n_' + (i + 1)));
  const clipOk = BLO_KEYS.every(k => !!KIDS.voice.clips[k]);
  const coreOk = ['core_chapter_end', 'core_day_end', 'core_rest'].every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([blo_hint, 题面 clip]) 单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const q0v = genLevel(0).quizzes[0];
  const openChain = qLog.length >= 1 && lastQ.length === 2 && lastQ[0] === 'blo_hint' &&
    lastQ[1] === qVoice(q0v).key;
  /* 四题型题面 clip 键全在场（封闭句，无 TTS 拼接） */
  const quizClipOk = ['count', 'fill', 'front', 'top'].every(k => !!KIDS.voice.clips[qVoice({ kind: k }).key]);
  speakQuiz(q0v);                               // 救援/重听：题面单 clip 播
  const lastP = playLog[playLog.length - 1];
  const rescueChain = lastP === qVoice(q0v).key;
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  /* 答案位置分布：三位置均出现、首位不恒定（<60%，按实际计数） */
  const idxN = idxDist[0] + idxDist[1] + idxDist[2];
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[0] < idxN * 0.6;
  const specOk = refVoice && numCnOk && clipOk && coreOk && openChain && quizClipOk && rescueChain && distOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, numCn: numCnOk, clips: clipOk, core: coreOk,
    openChain: openChain, quizClip: quizClipOk, rescueChain: rescueChain, idx: idxDist,
    n: idxN };

  const out = { game: 'blocks', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
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
