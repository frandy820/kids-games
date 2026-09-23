/* ================= ?verify=1 自检（r14；仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     章映射（静态关 dch=循环章）/章型构成（dch1 全 calc 子型 [area×3,perim×2]；
     dch2/3/4 首题 count 热身外全 samearea/combo/unit2）/
     数值域+可解性独立复算（verify 侧自带 ref* 实现——禁复用引擎 canonCells/normCells/
     numCards，两套同错不可检，§0.35 禁生成器 answer 自证）：
       通用 hole=整数坐标 0-4 域（5×5 内）/无重复格/单连通（BFS）/<GW,GH；combo hole=null；
       count answer=len(hole)、hole 1-8 格、数字卡 1-10 互异、干扰=±1/±2 池；
       calc L,W∈2..5 积≤20、ans=area?L*W:2(L+W)、hole=完整 L×W 矩形（bbox+连通+等数）、
         干扰=典型错 {L+W,L*W,2(L+W)} 恒在场 + 近误 ±1/±2 恰一张、三卡互异恰 1 真值；
       samearea hole 3-4 格、3 砖卡合法姿态互异、恰 1 卡面积=hole 且 canonical 异形（防轮廓
         匹配）、answer=该卡、干扰面积≠hole 面积；
       combo 砖 3-4 块互异 kind、总面积 6-12、ans=Σ、干扰=部分和（漏一块）恒在场+近误 ±1/±2；
       unit2 hole 2-8 格、ans=2G、干扰恒含 G（忘换算典型错，非答案）+2G±2；
     同关 5 题 sig 互异（verify 独立构造 sig）/ structOk / 反启发式锚（数值跨题正解+干扰
     双现 ≥5——记数+样本）
   ①b 引擎直驱：非法下标 false → 错卡 miss+retries 恰一次 → 正确卡 'right'/'done' 推进；
     星级三档（5 错=1★ / 1 错=2★ / 0 错=3★）
   ② UI 单元（flat0 真实 UI，dch1 calc 首题）：工地 SVG（.hole-cell 数=len(hole)、
     .gnd 数=GW*GH-len）+ 长宽标注（text.dim-long='长 N'/text.dim-wide='宽 N'）+
     数字卡 DOM + tapCard 推进
   ②a 几何审计（§0.35）：工地/砖卡/组合砖全部 rect 格线整数坐标对齐（x,y 为格宽整数倍、
     w=h=格宽）+ hole-cell data-x/y 与 hole 对账 + samearea 卡 rect 与 cells 对账（DOM 序=cells 序）
     + combo 砖排 rect CCELL 对账
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次=2 星，错卡晃动红边不灰化，verify 页不弹层）
   ④ UI 冒烟 B：flat5（dch2 samearea：首题 count 热身工地在→3 砖卡+工地+数格子钮在场+
     autoSolve 3 星+通关定格逐格点亮）/ flat10（dch3 combo：砖排场景 .scene.combos 在场+
     无 .hole-cell+数字卡+数格子钮 hidden+通关）/ flat15（dch4 unit2：数字卡+G 陷阱在场+
     autoSolve+通关后全 filled）
   ⑥ countCells 单元：逐格点亮+逐格播 ar_count_1..N（SPEC §7 数数句）
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → 快速数格子（ar_count 序列）→
     演示答对 __arDemoR==='right'（§0.27）→ 重发同关 → 交接链 queue([ar_tut_turn, ar_tip])
     → watch ≤16s
   ⑤ 布局（竖屏三件套 M3）：双 viewport（1280×800 / 800×1180 body.port 类通道——与 @media
     真竖屏通道逐条等值，_selftest P1b 真竖轮独立验）×（flat0/5/10/15 四形态）：
     答案卡 ≥96 且 rect 落 #answers 容器、portStyle 判别锚=.opt computed min-height
     （横 96/竖 104）、全按钮 ≥64（.k-parentbtn 豁免）、场景 SVG 尺寸非零、overflowX ≤0；
     量测前等入场动画结束（§0.11 transform 中途陷阱）
   ⑧ 分布与专项：VOICE 六键文案独立字面量对账 / ASK 四型+calcAsk 两句式对账（SPEC §7 定稿）/
     ar_* 16 条+core 3 条注入 / 开场顺序链 queue([ar_hint, ar_tip]) 单通道 / 读题=题面句
     TTS 兜底 / 单选 answer 三位置均出现且首位 <60%
   ⑭ duration：独立副本 estMsV+DECIDE_MSV+advSayV（verify 侧重写文本拼装，禁调 data 的
     advSayOf/quizDurMs）逐关对账 levelDurMs + 每关 ≥LEVEL_MIN_MS 40000 +
     40 关最低值精确防回漂（AR_DMIN_MIN === dMin）
   结果写 #verify-result + window.__arVlog + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0];

  /* ---- verify 侧独立复算（与引擎分源：独立 norm/旋转/canonical 实现） ---- */
  const rkey = p => p[0] + ',' + p[1];
  function refNorm(cells) {                      // 独立 norm（平移原点+字典序排序）
    let mx = Infinity, my = Infinity;
    cells.forEach(p => { if (p[0] < mx) mx = p[0]; if (p[1] < my) my = p[1]; });
    return cells.map(p => [p[0] - mx, p[1] - my]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
  }
  function refRot(cells) {                       // 独立旋转（逆时针 (x,y)→(y,-x)，4 次同旋转群）
    return refNorm(cells.map(p => [p[1], -p[0]]));
  }
  function refCanon(cells) {                     // 4 旋转 sorted 签名取字典序最小（形状身份）
    let best = null, c = refNorm(cells);
    for (let i = 0; i < 4; i++) {
      const s = c.map(p => p.join(',')).join(';');
      if (best === null || s < best) best = s;
      c = refRot(c);
    }
    return best;
  }
  function refConnected(hole) {                  // 单连通（BFS）
    const st = [hole[0].slice()], vis = {};
    vis[rkey(hole[0])] = 1;
    let cnt = 1;
    while (st.length) {
      const p = st.pop();
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
        const k = (p[0] + d[0]) + ',' + (p[1] + d[1]);
        if (hole.some(q => rkey(q) === k) && !vis[k]) { vis[k] = 1; cnt++; st.push([p[0] + d[0], p[1] + d[1]]); }
      });
    }
    return cnt === hole.length;
  }
  function refGridOk(q) {                        // 5×5 域+坐标合法+无重复
    if (!Number.isInteger(q.GW) || !Number.isInteger(q.GH) || q.GW < 1 || q.GW > 5 || q.GH < 1 || q.GH > 5) return false;
    const seen = {};
    for (const p of q.hole) {
      if (!Number.isInteger(p[0]) || !Number.isInteger(p[1]) || p[0] < 0 || p[0] >= q.GW || p[1] < 0 || p[1] >= q.GH) return false;
      const k = rkey(p);
      if (seen[k]) return false;
      seen[k] = 1;
    }
    return true;
  }
  const refShapeOk = c => {                      // 砖卡/砖=合法 kind 的某旋转姿态（平移原点）
    if (!c || KINDS.indexOf(c.kind) < 0 || !Array.isArray(c.cells) ||
        c.cells.length !== SHAPES[c.kind].length) return false;
    if (refCanon(c.cells) !== refCanon(SHAPES[c.kind])) return false;      // 形状身份=池内 kind
    const mx = Math.min.apply(null, c.cells.map(p => p[0]));
    const my = Math.min.apply(null, c.cells.map(p => p[1]));
    return mx === 0 && my === 0;                                            // 已平移到原点（排序不约束）
  };
  function refCardsAllOk(cards) {                // 3 张合法+互异（samearea 砖卡 / combo 砖组扩展）
    if (!Array.isArray(cards) || cards.length < 3) return false;
    const sers = cards.map(c => refCanon(c.cells));
    for (let i = 0; i < sers.length; i++) for (let j = i + 1; j < sers.length; j++)
      if (sers[i] === sers[j]) return false;
    return cards.every(refShapeOk);
  }
  function refSig(q) {                           // 独立 sig（§0.35：kind+子型+挖空区+砖组+卡组+answer）
    const hs = q.hole ? q.hole.map(p => p.join(',')).sort().join(';') : '-';
    const bs = q.bricks ? q.bricks.map(b => b.kind + ':' + refCanon(b.cells)).join('+') + '|' : '';
    const cs = q.cards.map(c => typeof c === 'number' ? String(c) : c.kind + ':' + refCanon(c.cells)).join('/');
    return q.kind + (q.sub ? ':' + q.sub : '') + '|' + hs + '|' + bs + cs + '|' + JSON.stringify(q.answer);
  }
  const refNumCands = ans => {                   // count 干扰池：±1/±2 滤 0/负/同答案
    const out = [];
    [ans - 2, ans - 1, ans + 1, ans + 2].forEach(v => { if (v > 0 && v !== ans && out.indexOf(v) < 0) out.push(v); });
    return out;
  };
  /* 数值域+可解性独立审计（SPEC §7 全约束，分源推导——不读生成器实现细节） */
  function refRangeOk(q) {
    if (q.hole !== null) {
      if (!refGridOk(q) || !refConnected(q.hole)) return false;
    } else if (q.GW !== 0 || q.GH !== 0) return false;
    if (q.kind === 'count') {
      if (q.hole.length < 1 || q.hole.length > 8) return false;                    // 数数域 1-8
      if (q.cards.length !== 3 || !q.cards.every(v => Number.isInteger(v) && v >= 1 && v <= 10)) return false;
      if (q.cards.indexOf(q.hole.length) !== q.answer) return false;
      if (q.cards.filter(v => v === q.hole.length).length !== 1) return false;      // 恰 1 真值
      return q.cards.every(v => v === q.hole.length || refNumCands(q.hole.length).indexOf(v) >= 0);
    }
    if (q.kind === 'calc') {
      if (q.sub !== 'area' && q.sub !== 'perim') return false;
      if (!Number.isInteger(q.L) || !Number.isInteger(q.W) || q.L < 2 || q.W < 2 || q.L > 5 || q.W > 5) return false;
      if (q.L * q.W > 20) return false;                                            // 工地域+教学窗
      const A = q.L * q.W, P = 2 * (q.L + q.W), ans = q.sub === 'area' ? A : P;
      if (q.ans !== ans) return false;
      if (q.hole.length !== A) return false;                                       // 格数=积
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;                               // 完整矩形（SPEC：矩形挖空区）
      q.hole.forEach(p => {
        if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
      });
      if (x1 - x0 + 1 !== q.L || y1 - y0 + 1 !== q.W) return false;
      const typ = [q.L + q.W, A, P].filter(v => v !== ans);                        // 典型错池
      const dis = q.cards.filter((v, i) => i !== q.answer);
      if (q.cards.length !== 3 || !q.cards.every(v => Number.isInteger(v) && v >= 1 && v <= 30)) return false;
      if (q.cards.filter(v => v === ans).length !== 1 || q.cards[q.answer] !== ans) return false;
      if (!dis.some(v => typ.indexOf(v) >= 0)) return false;                       // 典型错恒在场
      if (!dis.some(v => Math.abs(v - ans) >= 1 && Math.abs(v - ans) <= 2)) return false;   // 近误在场
      return dis.every(v => typ.indexOf(v) >= 0 || (Math.abs(v - ans) >= 1 && Math.abs(v - ans) <= 2));
    }
    if (q.kind === 'samearea') {
      if (q.hole.length < 3 || q.hole.length > 4) return false;                    // 形状池 3/4 格
      if (!refCardsAllOk(q.cards) || q.cards.length !== 3) return false;
      const hits = q.cards.filter(c => c.cells.length === q.hole.length);
      if (hits.length !== 1) return false;                                         // 恰 1 卡同面积
      if (refCanon(hits[0].cells) === refCanon(q.hole)) return false;              // 正解异形状（防轮廓匹配）
      if (q.cards[q.answer].cells.length !== q.hole.length) return false;
      if (refCanon(q.cards[q.answer].cells) === refCanon(q.hole)) return false;
      return q.ans === q.hole.length;
    }
    if (q.kind === 'combo') {
      if (q.hole !== null) return false;                                           // 无挖空区（防数整体）
      if (!Array.isArray(q.bricks) || q.bricks.length < 3 || q.bricks.length > 4) return false;
      if (!refCardsAllOk(q.bricks)) return false;                                  // 砖组合法互异
      const T = q.bricks.reduce((s, b) => s + b.cells.length, 0);
      if (T < 6 || T > 12) return false;
      if (q.ans !== T) return false;
      if (q.cards.length !== 3 || !q.cards.every(v => Number.isInteger(v) && v >= 1 && v <= 30)) return false;
      if (q.cards.filter(v => v === T).length !== 1 || q.cards[q.answer] !== T) return false;
      const partials = q.bricks.map(b => T - b.cells.length);
      const dis = q.cards.filter((v, i) => i !== q.answer);
      if (!dis.some(v => partials.indexOf(v) >= 0)) return false;                  // 部分和典型错在场
      return dis.every(v => partials.indexOf(v) >= 0 || Math.abs(v - T) <= 2);     // 另一干扰=近误
    }
    if (q.kind === 'unit2') {
      if (q.hole.length < 2 || q.hole.length > 8) return false;
      const G = q.hole.length, ans = 2 * G;
      if (q.ans !== ans) return false;
      if (q.cards.length !== 3 || !q.cards.every(v => Number.isInteger(v) && v >= 1 && v <= 30)) return false;
      if (q.cards.filter(v => v === ans).length !== 1 || q.cards[q.answer] !== ans) return false;
      const gi = q.cards.indexOf(G);
      if (gi < 0 || gi === q.answer) return false;                                 // G 陷阱在场且非答案
      const other = q.cards[3 - q.answer - gi];                                    // 第三卡=2G±2
      return Math.abs(other - ans) === 2;
    }
    return false;
  }
  const wiOf = q => { let wi = 0; while (wi === q.answer) wi++; return wi; };

  /* ---- ① 40 关全量审计 + 反启发式锚收集（数值跨题正解+干扰双现 ≥5） ---- */
  const ansAt = {}, disAt = {};                   // 值 -> 题标识数组（flat*8+qi）
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, kindAll = true, warmOk = true, sigAll = true,
        structAll = true, driveOk = true;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;   // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    if (L1.quizzes.length !== CH_LEN) rangeAll = false;
    const wantKind = (qi, dch) => dch === 1 ? 'calc' :                       // dch1 全 calc（无热身）
      (qi === 0 ? 'count' : dch === 2 ? 'samearea' : dch === 3 ? 'combo' : 'unit2');
    L1.quizzes.forEach((q, i) => {
      if (q.kind !== wantKind(i, L1.dch)) kindAll = false;
      if (L1.dch === 1 && q.sub !== CALC_COMPOSE[i]) kindAll = false;        // 子型构成 [a,a,a,p,p]
    });
    const sigs = [];
    L1.quizzes.forEach((q, i) => {
      if (!refRangeOk(q)) rangeAll = false;
      if (!structOk(q)) structAll = false;
      sigs.push(refSig(q));
      idxDist[q.answer]++;
      const tid = flat * 8 + i;
      if (typeof q.cards[0] === 'number') {                                  // 数值题收集锚（samearea 砖卡无数值）
        (ansAt[q.ans] = ansAt[q.ans] || []).push(tid);
        q.cards.forEach((v, k) => { if (k !== q.answer) (disAt[v] = disAt[v] || []).push(tid); });
      }
    });
    if (new Set(sigs).size !== CH_LEN) sigAll = false;              // 同关 5 题 sig 互异（§0.35）
    if (L1.dch !== 1) {                                             // 热身=count 型（家族惯例）
      const w = L1.quizzes[0];
      warmOk = w.kind === 'count' && w.warm === true;
    } else warmOk = L1.quizzes.every(q => q.warm === false);

    /* 引擎直驱（retries 为关级累计：断言用题内增量，base=本题起始 retries） */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (engTap(Ld, 99) !== false || engTap(Ld, 0.5) !== false || engTap(Ld, -1) !== false) driveOk = false;   // 非法下标
      if (engTap(Ld, wiOf(q)) !== 'wrong' || q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;          // 错卡恰一次
      if (engTap(Ld, q.answer) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) driveOk = false;           // 正确卡推进
    }
    const s1 = Ld.done && Ld.retries >= 5 && engStars(Ld) === 1;      // 每题一错（5 题=5 错=1★）
    const L2x = genLevel(flat);
    let g2 = 0;
    while (!L2x.done && g2++ < 30) {
      const q = L2x.quizzes[L2x.step];
      if (L2x.step === 0) engTap(L2x, wiOf(q));                       // 首题一错
      engTap(L2x, q.answer);
    }
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L3 = genLevel(flat);
    let guard = 0;
    while (!L3.done && guard++ < 30) engTap(L3, L3.quizzes[L3.step].answer);
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;
    const ok = det && rangeAll && kindAll && warmOk && sigAll && structAll && driveOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, kindAll: kindAll,
      warmOk: warmOk, sigAll: sigAll, structAll: structAll, driveOk: driveOk,
      qs: L1.quizzes.map(q => q.kind === 'count' ? 'c' + q.hole.length
        : q.kind === 'calc' ? (q.sub === 'area' ? 'A' : 'P') + q.L + 'x' + q.W + '=' + q.ans
        : q.kind === 'samearea' ? 'S' + q.hole.length + '->' + q.cards[q.answer].kind
        : q.kind === 'combo' ? 'M' + q.ans : 'U' + q.hole.length + 'x2=' + q.ans) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  /* 反启发式锚：值 v 在题 A 为正解且在题 B（≠A）为干扰（防"记住某数=对"启发式） */
  const anchors = [];
  Object.keys(ansAt).forEach(v => {
    if (disAt[v] && disAt[v].some(t2 => ansAt[v].some(t1 => t1 !== t2))) anchors.push(Number(v));
  });
  const anchorOk = anchors.length >= 5;
  total++;
  if (anchorOk) npass++;
  units.anchors = { ok: anchorOk, n: anchors.length, sample: anchors.slice(0, 10) };

  /* ---- ② UI 单元（flat0 真实 UI，dch1 calc 首题）：工地+长宽标注+数字卡+推进 ---- */
  total++;
  startLevel(0);
  const q0 = AR.quiz;
  const qc0 = cur.quizzes[0];                                  // 引擎侧细字段（L/W/hole 真值）
  const svgEl = sceneEl.querySelector('svg.scene');
  const holeN = sceneEl.querySelectorAll('.hole-cell').length;
  const gndN = sceneEl.querySelectorAll('.gnd').length;
  const optN = answersEl.querySelectorAll('.opt').length;
  const dimL = sceneEl.querySelector('text.dim-long');
  const dimW = sceneEl.querySelector('text.dim-wide');
  const numOk = q0 && q0.kind === 'calc' && qc0.sub === 'area' && !!svgEl &&
    holeN === q0.hole.length && gndN === q0.GW * q0.GH - q0.hole.length &&
    optN === 3 && answersEl.querySelectorAll('.opt.card').length === 0 &&      // 数字卡非图卡
    !!dimL && dimL.textContent === '长 ' + qc0.L &&                             // 长宽标注=题面数据
    !!dimW && dimW.textContent === '宽 ' + qc0.W;
  const ansTxt = q0 ? answersEl.querySelectorAll('.opt')[q0.answer].textContent : '';
  const txtOk = q0 && ansTxt === String(q0.cards[q0.answer]);
  let w0 = 0; if (q0) w0 = wiOf(q0);
  const rw = await AR.tapCard(w0);
  const rr = await AR.tapCard(q0 ? q0.answer : 0);
  const flowOk = rw === 'wrong' && rr === 'right' &&
    AR.currentLevel.step === 1 && AR.currentLevel.retries === 1;
  const selfOk = !!(numOk && txtOk && flowOk);
  if (selfOk) npass++;
  units.ui = { ok: selfOk, numOk: numOk, dimOk: !!dimL && !!dimW, txtOk: txtOk, flowOk: flowOk };

  /* ---- ②a 几何审计（§0.35 本款铁律）：格线整数坐标精确
     + hole-cell data 坐标对账 + samearea 卡 rect 与 cells 对账（DOM 序=cells 序）
     + combo 砖排 rect CCELL 对账 ---- */
  total++;
  startLevel(0);
  let geoOk = true;
  sceneEl.querySelectorAll('rect').forEach(r => {                 // 工地格：x,y 为 CELL 整数倍、w=h=CELL
    const x = Number(r.getAttribute('x')), y = Number(r.getAttribute('y'));
    const w = Number(r.getAttribute('width')), h = Number(r.getAttribute('height'));
    if (x % CELL !== 0 || y % CELL !== 0 || w !== CELL || h !== CELL) geoOk = false;
  });
  { /* hole-cell data-x/data-y 与 hole 集合一一对应 */
    const want = {};
    AR.quiz.hole.forEach(p => { want[p[0] + ',' + p[1]] = 1; });
    if (Object.keys(want).length !== sceneEl.querySelectorAll('.hole-cell').length) geoOk = false;
    sceneEl.querySelectorAll('.hole-cell').forEach(c => {
      if (!want[c.getAttribute('data-x') + ',' + c.getAttribute('data-y')]) geoOk = false;
    });
  }
  /* flat5 第二题（samearea）：三砖卡 rect 数=cells 数、格坐标=BCELL 倍数、DOM 序=cells 序 */
  startLevel(5);
  await AR.tapCard(AR.quiz.answer);                              // 首题热身（count）
  const q5g = AR.quiz;
  let cardOk5 = false;
  if (q5g.kind === 'samearea') {
    cardOk5 = true;
    answersEl.querySelectorAll('.opt.card').forEach(card => {
      const cells = q5g.cards[Number(card.dataset.i)].cells;
      const rects = card.querySelectorAll('rect');
      if (rects.length !== cells.length) { cardOk5 = false; return; }
      for (let i = 0; i < rects.length; i++) {
        if (Number(rects[i].getAttribute('x')) !== cells[i][0] * BCELL ||
            Number(rects[i].getAttribute('y')) !== cells[i][1] * BCELL ||
            Number(rects[i].getAttribute('width')) !== BCELL ||
            Number(rects[i].getAttribute('height')) !== BCELL) cardOk5 = false;
      }
    });
  }
  /* flat10 第二题（combo）：砖排 rect 格坐标=CCELL 倍数、rect 数=砖格总数 */
  startLevel(10);
  await AR.tapCard(AR.quiz.answer);                              // 首题热身（count）
  const q10g = AR.quiz;
  let comboOk10 = false;
  if (q10g.kind === 'combo') {
    comboOk10 = true;
    const cbRects = sceneEl.querySelectorAll('svg.scene.combos rect.cb');
    const tot = cur.quizzes[cur.step].bricks.reduce((s, b) => s + b.cells.length, 0);
    if (cbRects.length !== tot) comboOk10 = false;
    cbRects.forEach(r => {
      const x = Number(r.getAttribute('x')), y = Number(r.getAttribute('y'));
      const w = Number(r.getAttribute('width')), h = Number(r.getAttribute('height'));
      if (x % CCELL !== 0 || y % CCELL !== 0 || w !== CCELL || h !== CCELL) comboOk10 = false;
    });
  }
  const geoAll = geoOk && cardOk5 && comboOk10;
  if (geoAll) npass++;
  units.geo = { ok: geoAll, siteGrid: geoOk, sameareaCards: cardOk5, comboRects: comboOk10 };
  startLevel(0);                                // 还原 flat0

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'ar_wrong').length;
  startLevel(0);                                          // flat0：每错必播
  await AR.tapCard(wiOf(AR.quiz));
  await AR.tapCard(wiOf(AR.quiz));
  const sayA = wrongPlays();                              // -> 2
  startLevel(3);                                          // flat3：10s 节流
  lastWrongVoice = Date.now();                            /* 显式进入节流窗口内 */
  await AR.tapCard(wiOf(AR.quiz));
  const sayB = wrongPlays() - 2;                          // 增量 -> 0
  startLevel(3);                                          // 同关重发 fresh quiz：miss===2 force 豁免
  lastWrongVoice = 0;                                     /* 隔离上一子用例时间戳 */
  await AR.tapCard(wiOf(AR.quiz));                        // miss=1 -> 播（窗口外）
  await AR.tapCard(wiOf(AR.quiz));                        // miss=2 -> force -> 播
  const sayC = wrongPlays() - 2 - sayB;                   // 增量 -> 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 -> 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = AR.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                                        // 首错：卡晃动红边不灰化可重点；首错不 pulse
      const wi = wiOf(q);
      const r = await AR.tapCard(wi);
      const el = answersEl.querySelectorAll('.opt')[wi];
      const wig = el.classList.contains('wrong');         /* 晃动类挂上（不灰化款） */
      const pe = getComputedStyle(el).pointerEvents !== 'none';
      wrongOk = r === 'wrong' && wig && pe &&
        AR.currentLevel.retries === 1 && AR.currentLevel.step === 0 &&
        !cardEl(q.answer).classList.contains('breathe');  /* 首错不 pulse 正确卡（miss=1） */
    }
    const q2 = AR.quiz;
    const r = await AR.tapCard(q2.answer);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    quizzesA++;
  }
  const lvA = AR.currentLevel;
  const smokeOkA = smokeA && wrongOk && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, quizzes: quizzesA,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat5（dch2 samearea）首题热身 + 3 砖卡 + 工地在 + autoSolve 3 星 ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const warm5 = cur.dch === 2 && L5.quizzes[0].kind === 'count' && L5.quizzes[0].warm;
  const q5a = AR.quiz;
  const warmScene = q5a.kind === 'count' && !sceneAreaEl.classList.contains('noscene');   // 热身期工地在
  await AR.tapCard(q5a.answer);                     // 进第二题（samearea）
  const q5b = AR.quiz;
  const sameOk = q5b.kind === 'samearea' &&
    answersEl.querySelectorAll('.opt.card').length === 3 &&   // 3 砖卡
    answersEl.querySelectorAll('.opt.card svg rect').length >= 3 &&
    !sceneAreaEl.classList.contains('noscene') &&              // 工地在（挖空区）
    countBtn.hidden === false;                                 // 数格子钮在场
  const a5 = await AR.autoSolve();
  const lv5 = AR.currentLevel;
  const fillN5 = sceneEl.querySelectorAll('.hole-cell.filled').length;   // 通关定格：末题逐格点亮
  const smokeOkB1 = warm5 && warmScene && sameOk && a5.done && lv5.done && lv5.won &&
    lv5.retries === 0 && engStars(cur) === 3 &&
    fillN5 === L5.quizzes[CH_LEN - 1].hole.length;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, warm: warm5, samearea: sameOk, taps: a5.taps,
    filled: fillN5, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat10（dch3 combo）砖排场景 + 无挖空格 + 数字卡 + 通关 ---- */
  total++;
  startLevel(10);
  const L10 = genLevel(10);
  const warm10 = cur.dch === 3 && L10.quizzes[0].kind === 'count' && L10.quizzes[0].warm;
  await AR.tapCard(AR.quiz.answer);                 // 首题热身（count）
  const q10 = AR.quiz;
  const comboOk = q10.kind === 'combo' &&
    !!sceneEl.querySelector('svg.scene.combos') &&             // 砖排场景在场
    sceneEl.querySelectorAll('.hole-cell').length === 0 &&     // 无工地挖空格（防数整体）
    answersEl.querySelectorAll('.opt').length === 3 &&
    answersEl.querySelectorAll('.opt.card').length === 0 &&    // 数字卡
    countBtn.hidden === true;                                  // 数格子钮 hidden
  let playB2 = true, quizzesB = 1;
  for (let s = 1; s < CH_LEN && playB2; s++) {
    const q = AR.quiz;
    if (!q) { playB2 = false; break; }
    const r = await AR.tapCard(q.answer);
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB2 = false;
    quizzesB++;
  }
  const lv10 = AR.currentLevel;
  const smokeOkB2 = warm10 && comboOk && playB2 && quizzesB === CH_LEN &&
    lv10.done && lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB2) npass++;
  smokes.flat10 = { ok: smokeOkB2, warm: warm10, combo: comboOk, quizzes: quizzesB, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B3：flat15（dch4 unit2）数字卡 + G 陷阱在场 + autoSolve + 通关后全 filled ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const warm15 = cur.dch === 4 && L15.quizzes[0].kind === 'count' && L15.quizzes[0].warm;
  await AR.tapCard(AR.quiz.answer);                 // 首题热身（count）
  const q15 = AR.quiz;
  const u15 = cur.quizzes[cur.step];
  const trapOk = q15.kind === 'unit2' &&
    q15.cards.indexOf(u15.hole.length) >= 0 &&                 // G 陷阱在场
    q15.cards.indexOf(u15.hole.length) !== q15.answer &&       // 且非答案
    q15.cards[q15.answer] === 2 * u15.hole.length;             // 真值=2G
  const a15 = await AR.autoSolve();
  const lv15 = AR.currentLevel;
  const fillN15 = sceneEl.querySelectorAll('.hole-cell.filled').length;
  const smokeOkB3 = warm15 && trapOk && a15.done && lv15.done && lv15.won &&
    lv15.retries === 0 && engStars(cur) === 3 &&
    fillN15 === L15.quizzes[CH_LEN - 1].hole.length;
  if (smokeOkB3) npass++;
  smokes.flat15 = { ok: smokeOkB3, warm: warm15, trap: trapOk, taps: a15.taps,
    filled: fillN15, stars: engStars(cur) };

  /* ---- ⑥ countCells 单元（SPEC §7）：逐格点亮 + 逐格播 ar_count_1..N ---- */
  total++;
  startLevel(5);                                  // dch2 首题=count 热身（hole 1-8）
  const qc = AR.quiz;
  const cntLog = [];
  const origP6 = KIDS.voice.play;
  KIDS.voice.play = function (key) { cntLog.push(String(key)); };
  const cntR = await AR.countCells();
  KIDS.voice.play = origP6;
  const wantSeq = Array.from({ length: qc.hole.length }, (_, i) => 'ar_count_' + (i + 1));
  const cntLit = sceneEl.querySelectorAll('.hole-cell.counted').length;
  const cntOk = cntR === true && JSON.stringify(cntLog) === JSON.stringify(wantSeq) &&
    cntLit === qc.hole.length;
  if (cntOk) npass++;
  units.countCells = { ok: cntOk, r: cntR, seq: cntLog.slice(0, 3), lit: cntLit, hole: qc.hole.length };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip -> 数格子 -> demoR -> 重发 -> 交接 ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  window.__arDemoR = null;
  const t7a = Date.now();
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip -> 数格子 -> 演示答对 -> 重发同关 -> 帮
  const tutMs = Date.now() - t7a;
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const cntN7 = pLog7.filter(k => k.indexOf('ar_count_') === 0).length;
  const tutOk = pLog7.indexOf('ar_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    cntN7 === genLevel(0).quizzes[0].hole.length &&                      /* 演示数格子=逐格数数句 */
    window.__arDemoR === 'right' &&                                     /* §0.27 演示真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&             /* 帮：解锁等孩子动手 */
    AR.currentLevel && AR.currentLevel.flat === 0 &&                    /* 重发同关 */
    AR.quiz && AR.quiz.step === 0 && AR.quiz.miss === 0 &&              /* 新题面初态 */
    lastQ7 && lastQ7.length === 2 && lastQ7[0] === 'ar_tut_turn' &&     /* 交接顺序链单通道 */
    lastQ7[1] === 'ar_tip' &&
    tutMs < 16000;                                                      /* watch <=16s（b16 P3-1） */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('ar_tut_watch') >= 0,
    countSaid: cntN7, demoR: window.__arDemoR, handoff: !!lastQ7, parts: lastQ7,
    tut: state.tut, tutMs: tutMs };

  /* ---- ⑤ 布局（竖屏三件套 M3）：双 viewport ×（flat0/5/10/15 四形态）
     通道 B=body.port 类模拟竖屏（与 @media 逐条等值——_selftest P1b 真竖轮独立验通道 A）；
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：opt-in .38s+delay .14s） ---- */
  async function simView(w, h, port, flat) {
    startLevel(flat);
    if (flat > 0) {                             /* flat5/10/15 首题恒 count 热身——解掉再量主形态 */
      const q0 = AR.quiz;
      if (q0 && q0.kind === 'count') {
        await AR.tapCard(q0.answer);
        await wait(900 * SPEED);
      }
    }
    document.body.classList.toggle('port', !!port);       /* 竖屏类通道（M3 双通道之 B） */
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 入场动画 .38s+delay .14s（真实 ms，不吃 SPEED）
    const box = answersEl.getBoundingClientRect();       /* 答案区容器 rect（落容器判别） */
    const opts = Array.prototype.slice.call(answersEl.querySelectorAll('.opt'));
    let inBox = opts.length >= 3;                        /* 三卡全落 #answers 容器内（容差 2px） */
    const optOk = opts.length >= 3 &&
      opts.every(b => {
        const r = b.getBoundingClientRect();
        if (!(r.left >= box.left - 2 && r.right <= box.right + 2 &&
              r.top >= box.top - 2 && r.bottom <= box.bottom + 2)) inBox = false;
        return r.width >= 96 && r.height >= 96;
      });
    const askEl = chipEl.querySelector('.ask');                 /* 判别锚=题面字号（不随题型变：横 26/竖 22） */
    const fs = askEl ? getComputedStyle(askEl).fontSize : '';
    const realPort = window.matchMedia('(orientation: portrait)').matches;
    const portStyle = port ? fs === '22px' : (realPort || fs === '26px');
    let btnOk = true;                           // 全部按钮 >=64（.k-parentbtn 家长按钮豁免；hidden rect 0 跳过）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const sv = sceneEl.querySelector('svg.scene');
    const sr = sv ? sv.getBoundingClientRect() : null;
    const sceneOk = !!sr && sr.width >= 100 && sr.height >= 80;   // 场景 SVG 可见非零（四形态均有场景）
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h + (port ? 'P' : ''), flat: flat, optOk: optOk, inBox: inBox,
      portStyle: portStyle, askFs: fs, btnOk: btnOk, sceneOk: sceneOk, ox: ox,
      pass: optOk && inBox && portStyle && btnOk && sceneOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15]) {
    sims.push(await simView(1280, 800, false, f));
    sims.push(await simView(800, 1180, true, f));
  }
  document.body.classList.remove('port');
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑧ 分布与专项：文案对账 / clip 注入 / 开场链 / 读题兜底 / 覆盖率 ---- */
  total++;
  /* SPEC §7 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！数一数格子' &&
    VOICE.turn.text === '你来铺一铺' && VOICE.hint.text === '数一数格子想一想' &&
    VOICE.right.text === '铺好啦，真整齐' && VOICE.wrong.text === '再数一数格子' &&
    VOICE.tip.text === '数数格子再选砖';
  const REF_ASK = { count: '挖空区有几格？', samearea: '哪块砖和挖空区一样大？',
    combo: '这些砖拼在一起，一共几格？', unit2: '每格住 2 只小蚂蚁，一共住几只？' };
  const refAsk = ASK.count === REF_ASK.count && ASK.samearea === REF_ASK.samearea &&
    ASK.combo === REF_ASK.combo && ASK.unit2 === REF_ASK.unit2 &&
    calcAsk('area', 3, 4) === '长 3 宽 4，铺满要几格？' &&
    calcAsk('perim', 2, 5) === '长 2 宽 5，一圈是几格边？';
  /* ar_* clips 注入对账（T46 阶段2 后 109 条=ar_ 106+core 3：题面 ar_ask_4+ar_calc_30+确认 ar_cf_56 含 11..20 补齐） */
  const AR_KEYS = ['ar_tut_watch', 'ar_tut_turn', 'ar_hint', 'ar_right', 'ar_wrong', 'ar_tip']
    .concat(Array.from({ length: 10 }, (_, i) => 'ar_count_' + (i + 1)))
    .concat(['ar_ask_count', 'ar_ask_samearea', 'ar_ask_combo', 'ar_ask_unit2',
             'ar_calc_area_2_2', 'ar_calc_area_5_4', 'ar_calc_peri_2_2', 'ar_calc_peri_5_4',
             'ar_cf_p_8', 'ar_cf_p_20', 'ar_cf_c_2', 'ar_cf_c_20', 'ar_cf_u_2', 'ar_cf_u_20',
             'ar_cf_s_1', 'ar_cf_s_10', 'ar_cf_s_11', 'ar_cf_s_20']);
  const clipOk = AR_KEYS.every(k => !!KIDS.voice.clips[k]) &&
    Object.keys(KIDS.voice.clips).length === 109;   /* 条数=109 由 build 计数断言+verify_voice 复核 */
  const coreOk = ['core_chapter_end', 'core_day_end', 'core_rest'].every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([ar_hint, ar_tip]) 单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 2 && lastQ[0] === 'ar_hint' && lastQ[1] === 'ar_tip';
  speakQuiz(genLevel(0).quizzes[0]);            // 读题：题面句 clip（T46 前整句 TTS 兜底）
  const qA0 = genLevel(0).quizzes[0];           /* 期望键独立推导（注册域 SPEC），禁引实现 askKeyOf */
  const wantKey0 = qA0.kind === 'calc'
    ? 'ar_calc_' + (qA0.sub === 'area' ? 'area' : 'peri') + '_' + qA0.L + '_' + qA0.W
    : 'ar_ask_' + qA0.kind;
  const rescueChain = playLog[playLog.length - 1] === wantKey0 && !!KIDS.voice.clips[wantKey0];
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  /* 答案位置分布：单选 3 卡全题型三位置均出现、首位不恒定（<60%） */
  const idxN = idxDist[0] + idxDist[1] + idxDist[2];
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[0] < idxN * 0.6;
  const specOk = refVoice && refAsk && clipOk && coreOk && openChain && rescueChain && distOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, refAsk: refAsk, clips: clipOk, core: coreOk,
    openChain: openChain, rescueChain: rescueChain, idx: idxDist, n: idxN };

  /* ---- ⑭ duration：独立副本复算（estMsV/DECIDE_MSV/advSayV 全 verify 侧重写——分源）
     + 逐关对账 levelDurMs + 40 关最低值精确防回漂（AR_DMIN_MIN === dMin） ---- */
  total++;
  const estMsV = s => s.length * 345 + 600;                /* b25 定版（与 data estMs 四方同步） */
  const DECIDE_MSV = { count: 8000, calcarea: 11000, calcperim: 11500,
    samearea: 9000, combo: 10500, unit2: 11000 };          /* SPEC §7 认知步常量（独立副本） */
  const AR_DMIN_MIN = 77975;                               /* 40 关最低=dch2 关恒值：count 14795+4xsamearea 15795 */
  const RIGHT_TXT = '铺好啦，真整齐';                       /* 独立字面（禁引 VOICE.right.text） */
  const CUE_V = q => q.kind === 'calc'
    ? (q.sub === 'area' ? '长 ' + q.L + ' 宽 ' + q.W + '，铺满要几格？'
                        : '长 ' + q.L + ' 宽 ' + q.W + '，一圈是几格边？')
    : REF_ASK[q.kind];
  const ADV_V = q => {
    if (q.kind === 'calc' && q.sub === 'perim') return '一圈 ' + q.ans + ' 格，' + RIGHT_TXT;
    if (q.kind === 'combo') return '一共 ' + q.ans + ' 格，' + RIGHT_TXT;
    if (q.kind === 'unit2') return '一共 ' + q.ans + ' 只，' + RIGHT_TXT;
    return String(q.kind === 'samearea' ? q.ans : q.hole.length) + ' 格，' + RIGHT_TXT;
  };
  const quizDurV = q => {
    const kind = q.kind === 'calc' ? (q.sub === 'perim' ? 'calcperim' : 'calcarea') : q.kind;
    const vw = 400 + estMsV(CUE_V(q)) + 300;                /* 首步语音窗（ENTER=400 独立字面，分源） */
    return Math.max(vw, DECIDE_MSV[kind]) + (2000 + estMsV(ADV_V(q)) + 400);
  };
  let durAll = true, dMin = Infinity, dMinFlat = -1;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    let sumV = 0;
    L.quizzes.forEach(q => { sumV += quizDurV(q); });
    if (sumV !== levelDurMs(L)) durAll = false;            /* 独立副本 vs data 模型逐关对账 */
    if (sumV < LEVEL_MIN_MS) durAll = false;               /* 硬门禁 >=40000 */
    if (sumV < dMin) { dMin = sumV; dMinFlat = flat; }
  }
  if (!(AR_DMIN_MIN === dMin && LEVEL_MIN_MS <= dMin)) durAll = false;   /* 精确防回漂 */
  if (durAll) npass++;
  units.duration = { ok: durAll, dMin: dMin, dMinFlat: dMinFlat, expect: AR_DMIN_MIN,
    minGate: LEVEL_MIN_MS };

  const out = { game: 'area', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
    levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__arVlog = out;                                  /* _selftest P1/P1b 抓取口 */
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
