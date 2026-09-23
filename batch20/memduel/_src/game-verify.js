/* ================= ?verify=1 自检（仅 verify 分支加载执行——独立第 4 script 块）
   r17 五型结构（§1-r17-memduel）：df 数字正背 6-7 / dr 数字倒背 5-6 /
   lf 字母正背 5-6 + cf 颜色正背 5-6（ch3 混出）/ dx 数字 5-6+延迟 gap 3.8s+正倒随机。
   ① 45 关全量审计（flat 0-44，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     结构 structOk（五型 kind/mat/mode/delay/串长 5-7 互异/answer=原序·逆序/池=
     answer 多重集+干扰 len7→2 其余 3 互异 ∉answer/相位三态/showMs=920+len*680 精确/
     gapMs 0|3800）/ 章约束 refChapOk（独立五型表分源）/ §0.44 分源独立复算 refTruth
     （双重循环互异+倒填循环逆序对账，禁复用游戏侧 Set/reverse/structOk）/
     同关 8 题签名互异 / ch3 双素材在场+ch4 双方向在场 / 手解安全网 FALLBACKS 双写对账
   ①b 引擎直驱：展示期 tapNum/tapSlot 拒绝且不吞题（前后 JSON 全等强断言）/
     engCover 转移唯一（二次拒绝）/ dx：gap 相位（engGapDone 唯一 gap→recall，二次
     拒绝；gap 态 tapNum 拒绝）/ 非法下标 / 未满判定拒绝 / 错误序列拼满=miss 恰一次 /
     正确重拼=right/done 推进 / 星级三档独立驱动（3/1/0 错）
   ①c 救援目标闭环：展示期与延迟期均无目标（锁定期）→ 干扰卡起步 → rescueTarget
     步进逐位填 → 收敛 solved；已解题无救援目标
   ② tapNum/tapSlot 单元（flat0 真实 UI）：展示期拒绝（不吞题）+入位 DOM 同步
     （池卡 .gone+卡位 .filled+值）+ 退回复活 + 非法下标 false
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0（ch1 df）真实通路通关（首题错误序列拼满=1 miss+晃动+错位清空
     对位保留强断言 → 重拼 answer 到达；autoSolve 余题；1 错=2 星；verify 页不弹层）
   ④ UI 冒烟 B：flat10（ch2 dr 倒背）autoSolve 全对通关 3 星（倒填独立对账+遮盖→
     逆序作答路径走通）
   ④b UI 冒烟 C：flat30（ch4 dx 延迟+正倒随机）真实相位链 show→gap（兔子 gapcall+
     tip=md_gap 文案+md_gap 播放+gap 态点卡拒绝）→recall（方向指令 md_dir_* 双通道
     文案+池解锁）→autoSolve 通关 3 星
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 看串+逐位拼+拼满判对
     __mdDemoR==='right'（§0.27）→ 值词 TTS 豁免在场 → 重发同关 → 交接链
     queue([md_tut_turn]) → tut='help' 解锁
   ⑤ 布局：三通道（1280×800 横 / 800×1180 竖真 @media / 1280×800+body.port 类）
     ×（flat0/10/20/30）记忆卡/候选卡 ≥64、全按钮 ≥64（.k-parentbtn 豁免）、
     卡可见、overflowX ≤0、竖屏卡宽锚 86（横 104）
   ⑥ 分布与专项：VOICE 文案独立字面量对账（§1-r17 定稿 9 条）/ 12 条 clips
     （md_ 41+core 3=44，T46 阶段2 值词 32）clipOk / 开场链 queue 单通道（df=md_hint / dr=md_hint_rev 分流）/
     展示期值词 TTS 豁免（逐卡 say）/ showMs 精确复算
   ⑬ 时长模型（r17 estMs 定版四方；独立副本 EST2 分源复算）：gap 提示窗 vw≤GAP_MS /
     dx 方向指令窗 vw≤DECIDE.dx / 45 关 modeled 最低精确断言（138760@flat24 防回漂
     双钉）/ 游戏侧 levelDurMs 全量对账 / LEVEL_MIN_MS 门禁
   结果写 #verify-result + document.title='VERIFY PASS n/n'（全部单元完成后才设 title） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立复算实现（SPEC §0.44 分源：双重循环互异 + 倒填循环逆序，
     禁复用游戏侧 Set/slice.reverse/structOk——同语义不同实现，笔误即 fail） ---- */
  const REF_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const REF_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
  const REF_COLORS = ['红', '橙', '黄', '绿', '蓝', '紫', '粉', '棕', '灰', '黑'];
  function refPoolOf(mat) {
    if (mat === 'let') return REF_LETTERS;
    if (mat === 'col') return REF_COLORS;
    return REF_DIGITS;
  }
  function refSeqDistinct(q) {
    const pool = refPoolOf(q.mat);
    for (let a = 0; a < q.seq.length; a++) {
      if (pool.indexOf(q.seq[a]) < 0) return false;                  // 值域按素材池（分源）
      for (let b = a + 1; b < q.seq.length; b++) if (q.seq[a] === q.seq[b]) return false;   // 重复=倒背多解=非法题
    }
    return true;
  }
  function refAnswer(q) {                          // 倒填循环（禁 reverse 方法）
    const out = [];
    for (let k = q.seq.length - 1; k >= 0; k--) out.push(q.seq[k]);
    return q.mode === 'fwd' ? q.seq.slice() : out;
  }
  /* 章约束分源复算（SPEC §1-r17 五型独立表——禁复用 CH_SPEC） */
  const REF_SPEC = {
    1: { kinds: ['df'], mat: 'dgt', mode: 'fwd', lo: 6, hi: 7 },
    2: { kinds: ['dr'], mat: 'dgt', mode: 'rev', lo: 5, hi: 6 },
    3: { kinds: ['lf', 'cf'], mat: null, mode: 'fwd', lo: 5, hi: 6 },
    4: { kinds: ['dx'], mat: 'dgt', mode: null, lo: 5, hi: 6 }
  };
  function refChapOk(dch, q) {
    const s = REF_SPEC[dch];
    if (!s) return false;
    if (s.kinds.indexOf(q.kind) < 0) return false;
    if (s.mat && q.mat !== s.mat) return false;
    if (q.kind === 'lf' && q.mat !== 'let') return false;            // kind↔mat 绑定（分源）
    if (q.kind === 'cf' && q.mat !== 'col') return false;
    if (q.kind === 'dx' && q.mat !== 'dgt') return false;
    if (q.kind === 'dr' && q.mode !== 'rev') return false;           // mode 约束（dx 双向合法）
    if (q.kind !== 'dx' && q.kind !== 'dr' && q.mode !== 'fwd') return false;
    if (!!q.delay !== (q.kind === 'dx')) return false;               // 延迟结构仅 dx
    if (q.seq.length < s.lo || q.seq.length > s.hi) return false;
    const extra = q.opts.length - q.seq.length;
    if (extra !== (q.seq.length >= 7 ? 2 : 3)) return false;         // 干扰 len7→2 / 其余 3（同口径）
    return true;
  }
  /* 手解安全网双写字面量（与 game-core FALLBACKS 分源对账；genLevel 极端防御路） */
  const REF_FALLBACKS = {
    1: { kind: 'df', mode: 'fwd', delay: false, seq: [3, 7, 5, 1, 9, 2], dis: [4, 8] },
    2: { kind: 'dr', mode: 'rev', delay: false, seq: [8, 2, 6, 4, 1], dis: [3, 7, 9] },
    3: { kind: 'lf', mode: 'fwd', delay: false, seq: ['B', 'E', 'A', 'D', 'F'], dis: ['C', 'H', 'J'] },
    4: { kind: 'dx', mode: 'rev', delay: true, seq: [5, 9, 1, 6, 3], dis: [2, 7, 4] }
  };
  function fallbackDualityOk() {
    for (let d = 1; d <= 4; d++) {
      const a = FALLBACKS[d], b = REF_FALLBACKS[d];
      if (!a || !b) return false;
      if (a.seq.length !== b.seq.length || a.seq.some((v, i) => v !== b.seq[i])) return false;
      if (a.distract.length !== b.dis.length ||
          a.distract.some((v, i) => v !== b.dis[i])) return false;
      if (a.kind !== b.kind || a.mode !== b.mode || !!a.delay !== !!b.delay) return false;
      if (!refSeqDistinct({ seq: a.seq, mat: a.mat })) return false; // 安全网也守互异+值域（§0.44）
    }
    return true;
  }
  /* 独立工具：干扰卡索引（禁复用游戏侧；干扰=池中 ∉ answer 的卡） */
  function vDistrIdx(q) {
    const ansSet = {};
    q.answer.forEach(v => { ansSet[v] = 1; });
    for (let i = 0; i < q.opts.length; i++) if (!ansSet[q.opts[i].v]) return i;
    return -1;
  }
  function vFreeIdx(q, v) {
    for (let i = 0; i < q.opts.length; i++) if (!q._used[i] && q.opts[i].v === v) return i;
    return -1;
  }
  /* 引擎直驱：错误序列拼满（位 0 换干扰卡，其余按 answer）——错一次 */
  function vFillWrong(L, q) {
    const di = vDistrIdx(q);
    if (di < 0) return false;
    engTapNum(L, di);
    for (let k = 1; k < q.answer.length; k++) {
      const i = vFreeIdx(q, q.answer[k]);
      if (i < 0) return false;
      engTapNum(L, i);
    }
    return true;
  }
  function vClearBuilt(L, q) {
    for (let k = q._built.length - 1; k >= 0; k--) {
      if (q._built[k] != null) engTapSlot(L, k);
    }
  }
  /* 引擎直驱：按 answer 正确填满（前置：已到 recall——dx 先过 gap） */
  function vSolve(L, q) {
    vClearBuilt(L, q);
    for (let k = 0; k < q.answer.length; k++) {
      const i = vFreeIdx(q, q.answer[k]);
      if (i < 0 || engTapNum(L, i) === null) return false;
    }
    return true;
  }
  /* 引擎直驱：当前题推进到 recall（dx 过 gap 窗） */
  function vToRecall(L, q) {
    if (q.phase === 'show') { if (!engCover(L)) return false; }
    if (q.phase === 'gap') { if (!engGapDone(L)) return false; }
    return q.phase === 'recall';
  }
  /* UI 路径辅助：等当前题展示期动画[+延迟窗]完成（相位到 recall） */
  async function waitRecall(timeout) {
    const q = cur.quizzes[cur.step];
    if (!q) return false;
    let g = 0, lim = timeout || 900;
    while (q.phase !== 'recall' && g++ < lim) await wait(20);
    return q.phase === 'recall';
  }

  /* ---- ① 45 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-44） ---- */
  const fbOk = fallbackDualityOk();
  let ch3Mats = {}, ch4Modes = {};
  for (let flat = 0; flat < 45; flat++) {
    total++;
    const isGen = flat >= STATIC_LEVELS;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, structAll = true, driveOk = true, rescueOk = true;
    const seen = {};
    if (!isGen && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;   // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    if (L1.quizzes.length !== CH_LEN) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refChapOk(L1.dch, q)) rangeAll = false;                   // 章约束（五型独立表）
      if (!structOk(q)) structAll = false;
      if (!refSeqDistinct(q)) rangeAll = false;                       // §0.44 互异+值域分源
      const ra = refAnswer(q);                                        // §0.44 逆序/原序分源对账
      if (ra.length !== q.answer.length || ra.some((v, i) => v !== q.answer[i])) rangeAll = false;
      const disList = [];                                             // 干扰分源：池中去 answer 多重集
      const needC = {};
      q.answer.forEach(v => { needC[v] = (needC[v] || 0) + 1; });
      q.opts.forEach(o => { if (needC[o.v] > 0) needC[o.v]--; else disList.push(o.v); });
      if (disList.some(v => needC[v])) rangeAll = false;              // 干扰 ∉ answer（§0.44）
      const sig = sigOf(q);                                           // 同关 8 题签名互异
      if (seen[sig]) rangeAll = false;
      seen[sig] = 1;
      if (L1.dch === 3) ch3Mats[q.mat] = 1;                           // ch3 双素材在场
      if (L1.dch === 4) ch4Modes[q.mode] = 1;                         // ch4 双方向在场
    }
    if (!fbOk) structAll = false;                                     // 安全网双写并入结构档
    if (flat === 39) {                                                // 10 关 ch3/ch4 各自混出（章节跨度聚合）
      if (!ch3Mats.let || !ch3Mats.col) rangeAll = false;
      if (!ch4Modes.fwd || !ch4Modes.rev) rangeAll = false;
    }
    if (!isGen && L1.ch !== chOfFlat(flat)) rangeAll = false;         // 进度章=分母 10（键基）

    /* ①b 引擎直驱 */
    const Ld = genLevel(flat);
    /* §0.44 展示期锁定：tapNum/tapSlot 拒绝（返 null）且不吞题——调用前后题对象
       JSON 全等（强断言区分新旧行为：弱断言（只查返回值）对"误记 miss/误推进"均过） */
    const snap0 = JSON.stringify(Ld.quizzes[0]);
    const rejTap = engTapNum(Ld, 0) === null;
    const rejSlot = engTapSlot(Ld, 0) === null;
    const noSwallow = JSON.stringify(Ld.quizzes[0]) === snap0;
    /* engCover 转移唯一：一次 true、二次 false（§0.44 相位转移唯一出口） */
    const coverOnce = engCover(Ld) === true;
    const coverTwice = engCover(Ld) === false;
    if (!rejTap || !rejSlot || !noSwallow || !coverOnce || !coverTwice) driveOk = false;
    if (engTapNum(Ld, -1) !== null || engTapNum(Ld, 99) !== null) driveOk = false;   // 非法下标
    if (engJudge(Ld) !== null) driveOk = false;                           // 未满判定=拒绝
    /* dx：gap 相位链（engGapDone 唯一 gap→recall；gap 态点卡拒绝不吞题） */
    if (Ld.quizzes[0].delay) {
      const qg = Ld.quizzes[0];
      if (qg.phase !== 'gap') driveOk = false;                        // cover 后 delay 型落 gap
      const gapNoTgt = dirTarget(qg) === null && rescueTarget(qg) === null;   // 锁定期无救援目标
      const snapG = JSON.stringify(qg);
      const rejGapTap = engTapNum(Ld, 0) === null && engTapSlot(Ld, 0) === null;
      const gapNoSwallow = JSON.stringify(qg) === snapG;
      const gapOnce = engGapDone(Ld) === true;
      const gapTwice = engGapDone(Ld) === false;
      const coverAtRecall = engCover(Ld) === false;                   // recall 态 cover 拒绝
      if (!gapNoTgt || !rejGapTap || !gapNoSwallow || !gapOnce || !gapTwice || !coverAtRecall) driveOk = false;
      vClearBuilt(Ld, qg);                                            // 防御清位（gap 态本就空）
    }
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (!vToRecall(Ld, q)) { driveOk = false; break; }              // 每题到 recall（dx 过 gap）
      if (!vFillWrong(Ld, q)) { driveOk = false; break; }             // 错误序列拼满
      const p1 = engJudge(Ld);
      if (!p1 || p1.win) { driveOk = false; break; }
      if (engCommitJudge(Ld, p1) !== 'wrong') { driveOk = false; break; }
      if (q.miss !== 1 || Ld.retries !== base + 1) { driveOk = false; break; }   // 错一次=1 miss
      vClearBuilt(Ld, q);                                             // 引擎无清空语义（UI 层错后自动清，直驱手动）
      if (!vSolve(Ld, q)) { driveOk = false; break; }                 // 正确重填
      const p2 = engJudge(Ld);
      if (!p2 || !p2.win) { driveOk = false; break; }
      if (engCommitJudge(Ld, p2) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) { driveOk = false; break; }
      if (Ld.step !== k + 1) { driveOk = false; break; }
    }
    if (Ld.done !== true) driveOk = false;                            // 8 题全解=关完成
    /* 星级三档独立驱动（3/1/0 错 → 1★/2★/3★） */
    const La = genLevel(flat);
    const qa = La.quizzes[0];
    vToRecall(La, qa);
    for (let g = 0; g < 3; g++) {                                     // 首题连错 3 次
      if (!vFillWrong(La, qa)) break;
      engCommitJudge(La, engJudge(La));
      vClearBuilt(La, qa);
    }
    let g2 = 0;
    while (!La.done && g2++ < 40) { vToRecall(La, La.quizzes[La.step]); vSolve(La, La.quizzes[La.step]); engCommitJudge(La, engJudge(La)); }
    const s1 = La.done && La.retries === 3 && engStars(La) === 1;
    const Lb = genLevel(flat);
    const qb = Lb.quizzes[0];
    vToRecall(Lb, qb);
    if (vFillWrong(Lb, qb)) { engCommitJudge(Lb, engJudge(Lb)); vClearBuilt(Lb, qb); }   // 仅首题错一次
    let g3 = 0;
    while (!Lb.done && g3++ < 40) { vToRecall(Lb, Lb.quizzes[Lb.step]); vSolve(Lb, Lb.quizzes[Lb.step]); engCommitJudge(Lb, engJudge(Lb)); }
    const s2 = Lb.done && Lb.retries === 1 && engStars(Lb) === 2;
    const Lc = genLevel(flat);
    let g4 = 0;
    while (!Lc.done && g4++ < 40) { vToRecall(Lc, Lc.quizzes[Lc.step]); vSolve(Lc, Lc.quizzes[Lc.step]); engCommitJudge(Lc, engJudge(Lc)); }
    const s3 = Lc.done && Lc.retries === 0 && engStars(Lc) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环：展示期[与延迟期]无目标（§0.44/§1-r17）→ 遮盖[过窗]后干扰卡起步
       → rescueTarget 步进逐位填（分源 refAnswer 语义）→ 满判对收敛；已解题无救援目标 */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    const showNoTgt = rescueTarget(qr) === null && dirTarget(qr) === null;   // 展示期锁定态
    let gapNoTgt2 = true;
    if (qr.delay) {
      engCover(Lr);
      gapNoTgt2 = rescueTarget(qr) === null && dirTarget(qr) === null;       // 延迟期锁定态
      engGapDone(Lr);
    } else engCover(Lr);
    const dr2 = vDistrIdx(qr);
    let chainOk = true, steps = 0;
    if (dr2 >= 0) {
      engTapNum(Lr, dr2);                                                // 干扰卡起步
      const t1 = rescueTarget(qr);
      if (!t1 || t1.act !== 'opt' || t1.j !== 1) chainOk = false;         // 首空位=位 1（位 0 被干扰占）
      const d1 = dirTarget(qr);
      if (!d1 || d1.act !== 'slot' || d1.j !== 1) chainOk = false;        // 方向级同位
      vClearBuilt(Lr, qr);
    }
    while (chainOk && !qr.solved && steps++ < 40) {
      const t = rescueTarget(qr);
      if (!t) { chainOk = false; break; }
      if (qr._used[t.i] || engTapNum(Lr, t.i) === null) { chainOk = false; break; }
      const plan = engJudge(Lr);
      if (plan) {                                                         // 满：按 rescueTarget 填=必对
        if (!plan.win) { chainOk = false; break; }
        engCommitJudge(Lr, plan);
        break;
      }
    }
    if (!qr.solved) chainOk = false;
    if (rescueTarget(qr) !== null) chainOk = false;                       // 已解题无救援目标
    rescueOk = showNoTgt && gapNoTgt2 && chainOk;

    const ok = det && rangeAll && structAll && driveOk && rescueOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll,
      structAll: structAll, driveOk: driveOk, rescueOk: rescueOk,
      stars: { many1: engStars(La), wrong1: engStars(Lb), clean: engStars(Lc) },
      qs: L1.quizzes.map(q => q.seq.join('') + '|' + q.kind + '|' + q.mode + '>' + q.answer.join('')) };
    if (!isGen) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }
  const genSampleOk = Object.keys(gen).length === 5 && Object.keys(gen).every(k => gen[k].ok);

  /* ---- ② tapNum/tapSlot 单元（flat0 真实 UI）：展示期拒绝（不吞题）+入位/退回 DOM 同步+非法下标 ---- */
  total++;
  startLevel(0);
  const q0 = cur.quizzes[0];
  let domOk = true;
  /* 展示期锁定（真实 UI 路径，§0.44）：拒绝且不吞题——钩子快照全等强断言 */
  const snapUI = JSON.stringify(MD.quiz);
  const rej1 = await MD.tapNum(0);
  const rej2 = await MD.tapNum(0);
  const showRej = rej1 === false && rej2 === false && JSON.stringify(MD.quiz) === snapUI;
  if (!(await waitRecall())) domOk = false;
  const seq = [];
  for (let k = 0; k < 2; k++) {                                           // 填 answer 前 2 张
    const i = vFreeIdx(q0, q0.answer[k]);
    seq.push(i);
    const r = await MD.tapNum(i);
    if (r !== 'placed') domOk = false;
    const qz = MD.quiz;
    if (qz.built[k] !== i || qz.built.filter(x => x != null).length !== k + 1) domOk = false;
    const cEl = cardEl(i);
    if (!cEl || !cEl.classList.contains('gone')) domOk = false;          // 池卡 .gone
    const mEl = memoEl(k);
    if (!mEl || !mEl.classList.contains('filled') || mEl.dataset.j !== String(k)) domOk = false;   // 卡位 .filled
    if (mEl && mEl.textContent !== String(q0.answer[k])) domOk = false;  // 卡位值=answer[k]（数字/字母字面）
  }
  if (MD.tapSlot(0) !== 'emptied') domOk = false;                        // 退回位 0（按位）
  const c0 = cardEl(seq[0]);
  if (c0 && c0.classList.contains('gone')) domOk = false;                // 首卡复活
  const m0 = memoEl(0);
  if (!m0 || m0.classList.contains('filled')) domOk = false;             // 位 0 已空
  if (MD.quiz.built[0] !== null || MD.quiz.built[1] !== seq[1]) domOk = false;
  const badIdx = (await MD.tapNum(-1)) === false && (await MD.tapNum(99)) === false &&
    MD.tapSlot(-1) === false && MD.tapSlot(99) === false;                // 非法下标
  const reUse = (await MD.tapNum(seq[0])) !== false;                     // 复位后再点同卡（此刻未用）应成功
  startLevel(0);                                                         // 重发还原 DOM
  const selfOk = domOk && showRej && badIdx && reUse;
  if (selfOk) npass++;
  units.tapNum = { ok: selfOk, domOk: domOk, showRej: showRej, badIdx: badIdx, reUse: reUse,
    ans: q0.answer.join(''), opts: q0.opts.map(o => o.v).join(',') };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue, origSay2 = KIDS.voice.say;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  KIDS.voice.say = function (t) { wLog.push(['s', String(t)]); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  async function wrongOnce() {
    if (!(await waitRecall())) return;
    const q = cur.quizzes[0];
    const di = vDistrIdx(q);
    if (di >= 0) await MD.tapNum(di);
    for (let k = 1; k < q.answer.length; k++) {
      await MD.tapNum(vFreeIdx(q, q.answer[k]));
    }
  }
  startLevel(0);                                                         // flat0：每错必播
  await wrongOnce();                                                     // 错 1
  await wrongOnce();                                                     // 错 2（错后 UI 已清空可再拼）
  const sayA = cnt('md_wrong');                                          // → 2
  startLevel(3);                                                         // flat3：10s 节流
  lastWrongVoice = Date.now();                                           /* 显式进入节流窗口内 */
  await wrongOnce();
  const sayB = cnt('md_wrong') - 2;                                      // 增量 → 0
  startLevel(3);                                                         // 同关重发 fresh：force 豁免链
  lastWrongVoice = 0;                                                    /* 隔离上一子用例时间戳 */
  const qc3 = cur.quizzes[0];
  const base3 = qc3.miss;
  await wrongOnce();                                                     // miss=1 窗口外 → 播
  await wrongOnce();                                                     // miss=2 → force → 播
  const sayC = cnt('md_wrong') - 2 - sayB;                               // 增量 → 2
  const missOk = qc3.miss === base3 + 2;
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2; KIDS.voice.say = origSay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && missOk;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, missOk: missOk };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错误序列拼满=1 miss+错位清空对位保留
     零惩罚卡可重选 → 重拼 answer 到达；1 错=2 星；verify 页不弹层） ---- */
  total++;
  startLevel(0);
  const qA = cur.quizzes[0];
  let smokeA = true, failOk = false;
  if (!(await waitRecall())) smokeA = false;
  const dA2 = vDistrIdx(qA);
  await MD.tapNum(dA2);                                                  // 位 0=干扰卡
  for (let k = 1; k < qA.answer.length; k++) {
    await MD.tapNum(vFreeIdx(qA, qA.answer[k]));
  }
  await wait(1300 * SPEED);                                              /* 等 1000ms 防重入窗+清空 */
  const stAfter = MD.quiz;
  failOk = stAfter.miss === 1 && MD.currentLevel.retries === 1;
  const clearedOk = stAfter.built[0] === null &&                         // 错位（位 0 干扰）清空回池
    stAfter.built.every((x, k) => x === null || qA.opts[x].v === qA.answer[k]);   // 对位保留（b19 P1：按值对位）
  const keptIdx = stAfter.built.filter(x => x != null);
  const poolBack = qA.opts.every((o, i) => {
    const el = cardEl(i);
    return !el || keptIdx.indexOf(i) >= 0 || !el.classList.contains('gone');   // 非保留卡必回池
  }) && keptIdx.length === qA.answer.length - 1;                         // 恰保留 answer-1 张（位 0 错）
  for (let k = 0; k < qA.answer.length; k++) {                           // 半程重拼（P1 对位保留：只补空位）
    if (stAfter.built[k] != null) continue;
    const r = await MD.tapNum(vFreeIdx(qA, qA.answer[k]));
    if (r !== 'placed' && r !== 'right' && r !== 'done') smokeA = false; // 末空位补上即拼满判对
  }
  const rest = await MD.autoSolve();                                     // 余 7 题自动通关
  await wait(900 * SPEED);
  const lvA = MD.currentLevel;
  const smokeOkA = smokeA && failOk && clearedOk && poolBack &&
    rest.done && rest.ok && rest.quizzes >= 1 &&
    lvA.done && lvA.won && lvA.retries === 1 && engStars(cur) === 2 &&
    !document.querySelector('.k-celebrate');                             // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, failOk: failOk, clearedOk: clearedOk, poolBack: poolBack,
    autoSolve: rest, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B：flat10（ch2 dr 倒背）autoSolve 全对通关 3 星（倒填分源+逆序作答路径） ---- */
  total++;
  startLevel(10);
  const q10 = MD.quiz;
  const shapeOk = q10 && cur.dch === 2 && q10.kind === 'dr' && q10.mode === 'rev' &&
    q10.seq.length >= 5 && q10.seq.length <= 6 && q10.phase === 'show';
  const revTruth = q10 && q10.answer.every((v, k) => v === q10.seq[q10.seq.length - 1 - k]);   // 倒填独立对账
  const restB = await MD.autoSolve();
  await wait(900 * SPEED);
  const lv10 = MD.currentLevel;
  const smokeOkB = shapeOk && revTruth && restB.done && restB.ok && restB.quizzes === CH_LEN &&
    lv10.done && lv10.won && lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat10 = { ok: smokeOkB, shapeOk: shapeOk, revTruth: revTruth,
    seq: q10 ? q10.seq.join('') : '', ans: q10 ? q10.answer.join('') : '',
    autoSolve: restB, stars: engStars(cur) };

  /* ---- ④b UI 冒烟 C：flat30（ch4 dx 延迟+正倒随机）真实相位链 show→gap→recall ---- */
  total++;
  const pLogC = [];
  const origPC = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLogC.push(String(key)); };
  startLevel(30);
  const q30s = MD.quiz;
  const shapeC = q30s && cur.dch === 4 && q30s.kind === 'dx' && q30s.delay === true &&
    q30s.gapMs === 3800 && q30s.seq.length >= 5 && q30s.seq.length <= 6;
  let gC = 0;
  while (MD.quiz && MD.quiz.phase !== 'gap' && gC++ < 900) await wait(20);   // 等 gap 相位（展示窗提速后 ~0.6s）
  const q30g = MD.quiz;
  const rabbitG = rabbitBtn.classList.contains('gapcall');
  const tipG = tipTextEl.textContent === TIP_GAP;
  const gapSaid = pLogC.indexOf('md_gap') >= 0;
  const snapC = JSON.stringify(q30g);
  const gapRej = (await MD.tapNum(0)) === false && JSON.stringify(MD.quiz) === snapC;   // gap 态点卡拒绝不吞题
  let gC2 = 0;
  while (MD.quiz && MD.quiz.phase !== 'recall' && gC2++ < 900) await wait(20);  // 等延迟窗结束
  const q30r = MD.quiz;
  const dirKey = q30r.mode === 'rev' ? 'md_dir_rev' : 'md_dir_fwd';
  const dirSaid = pLogC.indexOf(dirKey) >= 0;                          // 方向指令语音通道（遮盖后公布）
  const tipR = tipTextEl.textContent === TIP_ANSWER[q30r.mode];        // 文字通道
  const poolOpen = !cardPoolEl.classList.contains('locked');
  const rabbitCalm = !rabbitBtn.classList.contains('gapcall');
  const dxTruth = q30r.answer.every((v, k) => v === (q30r.mode === 'rev' ? q30r.seq[q30r.seq.length - 1 - k] : q30r.seq[k]));   // 方向真值分源
  KIDS.voice.play = origPC;
  const restC = await MD.autoSolve();
  await wait(900 * SPEED);
  const lv30 = MD.currentLevel;
  const smokeOkC = shapeC && rabbitG && tipG && gapSaid && gapRej && dirSaid && tipR &&
    poolOpen && rabbitCalm && dxTruth && restC.done && restC.ok && restC.quizzes === CH_LEN &&
    lv30.done && lv30.won && lv30.retries === 0 && engStars(cur) === 3;
  if (smokeOkC) npass++;
  smokes.flat30 = { ok: smokeOkC, shapeC: shapeC, rabbitG: rabbitG, tipG: tipG, gapSaid: gapSaid,
    gapRej: gapRej, dirSaid: dirSaid, mode: q30r ? q30r.mode : '', tipR: tipR, dxTruth: dxTruth,
    autoSolve: restC, stars: engStars(cur) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play, origS7 = KIDS.voice.say;
  const qLog7 = [], pLog7 = [], sLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  KIDS.voice.say = function (t) { sLog7.push(String(t)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → 看串 → 遮盖 → demo 逐位拼 → 判对 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7; KIDS.voice.say = origS7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = MD.quiz;
  const tutOk = pLog7.indexOf('md_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    window.__mdDemoR === 'right' &&                                     /* §0.27 演示判对真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    MD.currentLevel && MD.currentLevel.flat === 0 &&                     /* 重发同关 */
    q0t && q0t.step === 0 && q0t.miss === 0 &&                           /* 新题面初态 */
    q0t.built.every(x => x === null) &&
    qLog7.some(p => p.length === 1 && p[0] === valKey(q0t.seq[0])) &&    /* 值词=md_v_* 单段链（T46 阶段2） */
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'md_tut_turn';        /* 交接链单通道 */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('md_tut_watch') >= 0,
    demoR: window.__mdDemoR, handoff: !!lastQ7, parts: lastQ7,
    valSaid: qLog7.filter(p => p.length === 1 && /^md_v_/.test(p[0])).length, tut: state.tut };

  /* ---- ⑤ 布局：三通道（横 / 竖真 @media / 横+body.port 类）×（flat0/10/20/30）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：card-in scale(0) 起帧） ---- */
  async function simLayout(w, h, flat, forcePort) {
    startLevel(flat);
    if (forcePort) document.body.classList.add('port');           // 竖屏类通道（与 @media 逐条等值）
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 卡入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const cards = Array.prototype.slice.call(memoAreaEl.querySelectorAll('.mcard'));
    /* §0.11 transform 中途陷阱：遮盖 flip 动画（rotateY 90deg 中间帧）会把
       getBoundingClientRect 投影压扁——卡尺寸用 offsetWidth/offsetHeight 布局真值 */
    const cardOk = cards.length >= 5 &&
      cards.every(b => b.offsetWidth >= 64 && b.offsetHeight >= 64);
    const cardW = cards.length ? cards[0].offsetWidth : 0;
    const pool = Array.prototype.slice.call(cardPoolEl.querySelectorAll('.card'));
    const poolOk = pool.length >= 7 &&
      pool.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const visible = memoAreaEl.getBoundingClientRect().height > 40 &&
      tipEl.getBoundingClientRect().height > 20;                       // 主区可见
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      /* §0.11 transform 中途陷阱（按钮同坑——bounce/replayAnim scale 中间帧压扁 rect 投影，
         b19 后半漏修：卡改了 offsetWidth 按钮没改=800 窄视口闪失复现） */
      if (b.offsetWidth > 4 && b.offsetHeight > 4 && (b.offsetWidth < 64 || b.offsetHeight < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(document.getElementById('game').scrollWidth - document.getElementById('game').clientWidth,
      de.scrollWidth - de.clientWidth);
    if (forcePort) document.body.classList.remove('port');
    return { vp: (forcePort ? 'port' : w + 'x' + h), flat: flat, cardOk: cardOk, poolOk: poolOk,
      visible: visible, btnOk: btnOk, ox: ox, cardW: cardW,
      pass: cardOk && poolOk && visible && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 10, 20, 30]) {
    sims.push(await simLayout(1280, 800, f, false));
    sims.push(await simLayout(800, 1180, f, false));
    sims.push(await simLayout(1280, 800, f, true));                 // body.port 类通道
  }
  const g0 = document.getElementById('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  /* 竖屏卡宽锚（三件套·simView 锚，按视口实况动态分档）：
     横视口：port 类通道=竖屏 CSS（86），800x1180=横屏 CSS 小尺寸模拟（@media 不触发：
     104），1280x800=横屏基准——port 与 800x1180 差异证 body.port 通道生效；
     真竖视口：三通道 @media 全触发（全 86），证 @media 通道在真实竖屏下生效（selftest P1b） */
  const realPort = !!(window.matchMedia && window.matchMedia('(orientation:portrait)').matches);
  const wantCard = s => (s.vp === 'port' || realPort) ? 86 : 104;
  const layoutOk = sims.length === 12 && sims.every(s => s.pass) &&
    sims.every(s => Math.abs(wantCard(s) - s.cardW) <= 2);             // 竖屏卡宽锚 86（横 104）
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链（方向分流）/ TTS 豁免 / showMs 精确 ---- */
  total++;
  /* SPEC §1-r17 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！记住小数字' &&
    VOICE.turn.text === '你来背一背' && VOICE.hint.text === '从第一位开始想' &&
    VOICE.hintRev.text === '从最后一位开始想' && VOICE.dirFwd.text === '顺着背' &&
    VOICE.dirRev.text === '倒着背' && VOICE.gap.text === '先点一下小兔子' &&
    VOICE.right.text === '全背对啦，记性真好' && VOICE.wrong.text === '再想一想刚才的数';
  /* 展示/方向文案同源（§0.18/§1-r17 明文） */
  const refTip = TIP_SHOW.dgt === '看数字，记住它' && TIP_SHOW.let === '看字母，记住它' &&
    TIP_SHOW.col === '看颜色，记住它' && TIP_DIR.fwd === '，等下顺着背' &&
    TIP_DIR.rev === '，等下倒着背' && TIP_GAP === '先点一下小兔子' &&
    TIP_ANSWER.fwd === '照刚才的顺序，拼出来' && TIP_ANSWER.rev === '从最后一张开始，倒着拼';
  /* 44 条 clips 注入对账（md_ 41=9 句+T46 阶段2 32 值词 + core 3，manifest games:['memduel']）
     T46 值词段族：md_v_d1-9 / md_v_lA-M（LETTERS 12 子集用，I 备用键在册）/ md_v_<色>（COLORS 全集） */
  const MD_KEYS = ['md_tut_watch', 'md_tut_turn', 'md_hint', 'md_hint_rev', 'md_dir_fwd',
    'md_dir_rev', 'md_gap', 'md_right', 'md_wrong']
    .concat(DIGITS.map(d => 'md_v_d' + d))
    .concat(LETTERS.map(c => 'md_v_l' + c))
    .concat(COLORS.map(c => 'md_v_c' + c));
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 44 && MD_KEYS.every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;
  /* 开场链（方向分流：df=md_hint / dr=md_hint_rev）/ 展示期值词 TTS 豁免（stub 记录） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push([String(key), text === undefined ? null : String(text)]); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链（flat0=df 顺背）
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'md_hint';   // 开场=[hint] 单通道
  startLevel(10);                               // ch2 倒背：开场键分流 md_hint_rev
  const lastQ2 = qLog[qLog.length - 1];
  const openChainRev = lastQ2.length === 1 && lastQ2[0] === 'md_hint_rev';
  startLevel(0);
  const qw0 = cur.quizzes[0];
  await state.showP;                            // 等展示期动画全程（逐卡翻亮）
  const numsSaid = qw0.seq.every(v => qLog.some(p => p.length === 1 && p[0] === valKey(v)));   // 值词逐卡 md_v_* 单段链（T46 阶段2）
  const showMsOk = qw0.showMs === 920 + qw0.seq.length * 680;            // 展示窗精确复算（独立字面）
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  startLevel(0);                                // 还原
  const specOk = refVoice && refTip && clipOk && openChain && openChainRev && numsSaid && showMsOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, refTip: refTip, clips: clipOk, nClips: nClips,
    openChain: openChain, openChainRev: openChainRev, numsSaid: numsSaid, showMsOk: showMsOk,
    showMs: qw0.showMs, missing: MD_KEYS.filter(k => !KIDS.voice.clips[k]) };

  /* ---- ⑬ 时长模型（r17 estMs 定版四方；独立副本分源复算——EST2 字面与 data 源同） ---- */
  total++;
  const EST2 = s => s.length * 345 + 600;          // estMs 独立副本（build 四方字面断言之 verify 侧）
  const ENTER2 = 400, TAIL2 = 300, ADV2 = 2100, GAP2 = 3800;
  const DEC2 = { df: 11000, dr: 13000, lf: 12000, cf: 10000, dx: 16000 };
  const durRef = q => (920 + q.seq.length * 680) + (q.delay ? GAP2 : 0) + DEC2[q.kind] + ADV2;
  let winOk = true, durMin = Infinity, durFlat = -1, parityOk = true, worst = null;
  /* 指令句窗（SPEC §1-r17 验算式；EST2 全字符口径） */
  const vwGap = ENTER2 + EST2('先点一下小兔子') + TAIL2;      // ≤ GAP2=3800
  const vwDirF = ENTER2 + EST2('顺着背') + TAIL2;             // ≤ DEC2.dx
  const vwDirR = ENTER2 + EST2('倒着背') + TAIL2;
  if (!(vwGap <= GAP2 && vwDirF <= DEC2.dx && vwDirR <= DEC2.dx)) winOk = false;
  for (let flat = 0; flat < STATIC_LEVELS + 5; flat++) {
    const L = genLevel(flat);
    let sum = 0, sumRef = 0;
    for (const q of L.quizzes) {
      sumRef += durRef(q);
      sum += quizDurMs(q);                         // 游戏侧 quizDurMs 逐题对账
      if (q.delay && vwGap > GAP2) { winOk = false; worst = worst || { flat: flat, kind: q.kind }; }
      if (q.kind === 'dx') {
        const vw = q.mode === 'rev' ? vwDirR : vwDirF;
        if (vw > DEC2.dx) { winOk = false; worst = worst || { flat: flat, kind: q.kind, vw: vw }; }
      }
    }
    if (Math.abs(sum - levelDurMs(L)) > 0.001) parityOk = false;
    if (sumRef !== sum) parityOk = false;          // 分源复算与游戏侧全等
    if (flat < STATIC_LEVELS && sumRef < durMin) { durMin = sumRef; durFlat = flat; }
  }
  const durOk = winOk && parityOk && durMin === 138760 && durFlat === 24 && durMin >= LEVEL_MIN_MS;
  if (durOk) npass++;
  units.duration = { ok: durOk, minMs: durMin, minFlat: durFlat, winOk: winOk, parity: parityOk,
    worst: worst, vwGap: vwGap, vwDirF: vwDirF, vwDirR: vwDirR };

  const out = { game: 'memduel', total: total, pass: npass, layoutOk: layoutOk,
    genSampleOk: genSampleOk, levels: levels, gen: gen, units: units, smokes: smokes };
  document.getElementById('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk && genSampleOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
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
