/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ⓪ 题库独立提取对账（§0.45 分源）：正则提取 script 源文本中的 QZ_BANK 字面量
     → JSON.parse（禁手抄、禁复用运行时对象）：恰 160 题；四域分布 32/40/40/48
     （bio=动植物/weather=自然/measure=测量/reason=因果，升档定稿）；每题 cat 合法、
     opts 恰 4 项文本互异非空（=恰一正确项+3 干扰且干扰≠正确文本）、ans 唯一合法
     索引（分布均衡 30-70/档）；ic 与 opts 平行且全 key 在图标库（QZ_ICONS 运行时
     真值）；题面全库互异；题干不泄题（选项文本 ∉ 题面子串）；章域映射独立字面量
     对账（cat→domain 从 SPEC 推导，禁用运行时 DOMAINS）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     静态关 dch=diffOfCh 且 5 题 cat 全=dch（四域各归一章）/ 生成关（flat≥20）
     dch=0 且 qid 互异（四域混抽）/ structOk（运行时题与封闭题库一致：4 选集合=
     bank 选项集、opts[answer]=bank 正确文本）/ 同关 5 题签名互异 / 分源答案对账
   ①b 引擎直驱：非法下标拒绝；错选=wrong+miss/retries 各+1+零惩罚可重选（再选
     对=right 推进）；5 题=done；星级三档独立驱动（3/1/0 错）
   ①c 救援目标闭环：rescueTarget 恒指正确卡；已解题无救援目标；dirTarget 恒
     {act:'cat'}（题面类别标签，方向级）
   ①d serve 注入引擎（升档：错题隔日复现纯引擎面）：genLevel(flat,serve) 确定性
     （同 flat+同 serve 双生成一致）/ served=实际注入数 / 注入题置前按序 / 非法
     id（越界/小数/字符串）过滤+同 id 去重 / 复现题跨章（serve 不受 dch 限制）/
     关仍满 5 题且签名互异
   ①e wrongBank 机制（升档：覆写 KIDS._save 模拟存档，UI 真实通路）：隔日注入
     （serveDay≠今天→注入 ≤3 题置前+serveDay 落账）/ 答错入库 ok=0 / 答对 ok+1 /
     ok≥2 毕业（两次答对后移出）/ 同日只注入一次 / 存档兼容（_save=null 时全
     no-op 不炸，QZ.bank=[]）
   ② tapOpt 单元（flat0 真实 UI）：错卡 wig+卡不消失（单选制零惩罚）+miss 同步；
     对卡 ok+推进；非法下标 false；QZ.quiz 契约字段（q/domain/opts×4/answer/step/miss）
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题错一次=1 miss+卡可见可重点 → 选对推进；
     autoSolve 余题；1 错=2 星；verify 页不弹层）
   ④ UI 冒烟 B：flat15（ch4 因果推理专章）autoSolve 全对 3 星
   ④b UI 冒烟 C：flat20（生成关四域混抽）autoSolve 通关
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → 读题（qz_q_N clip 链 T46 阶段2）→
     排除干扰卡 → 选正确卡 __qzDemoR==='right'（§0.27）→ 重发同关 → 交接链
     queue([qz_tut_turn]) → tut='help' 解锁
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5/10/15/20）
     题面卡 ≥64 高、4 张选项卡全 ≥64、全按钮 ≥64（.k-parentbtn 豁免）、类别小标签
     可见、overflowX ≤0
   ⑥ 分布与专项：VOICE 文案独立字面量对账（SPEC §3 定稿）/ 333 条 clips（T46 阶段2：
     qz_q_160+qz_opts_160+qz_cat_4+qz_no+通用 5+core 3）clipOk / 开场链 queue([qz_hint])
     单通道 / 读题面=hint+题面+选项串三段 clip 链（qz_q_/qz_opts_ 全 clip 化，零 TTS 兜底）/
     重听节流
   结果写 #verify-result + document.title='VERIFY PASS n/n'（全部单元完成后才设 title） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- ⓪ 题库独立提取（§0.45 分源：正则+JSON.parse，禁手抄禁复用运行时对象） ---- */
  const srcAll = Array.prototype.map.call(document.querySelectorAll('script'),
    s => s.textContent).join('\n');
  const mBank = srcAll.match(/const QZ_BANK = (\[[\s\S]*?\]);/);
  let bank = null, bankErr = '';
  try { bank = JSON.parse(mBank[1]); }
  catch (e) { bankErr = String(e); }

  /* 独立工具：干扰卡下标（禁复用游戏侧 distrIdx；=池中 ≠answer 的卡） */
  const vWrongIdx = q => { for (let i = 0; i < q.opts.length; i++) if (i !== q.answer) return i; return -1; };
  /* 独立域映射字面量（SPEC 升档定稿，禁用运行时 DOMAINS=分源） */
  const vDom = { 1: 'bio', 2: 'weather', 3: 'measure', 4: 'reason' };
  /* 独立今天串（禁用游戏侧 todayStrQ） */
  const vToday = () => { const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  /* ---- ⓪ 题库结构对账（160 题/四域 32-40-40-48/4 选互异/不泄题/图标真值） ---- */
  total++;
  const iconKeys = Object.keys(QZ_ICONS);
  let libOk = !!bank && bank.length === 160;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const ansDist = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const seenQ = {};
  let leakIdx = -1;
  if (libOk) {
    for (let i = 0; i < bank.length; i++) {
      const b = bank[i];
      if (b.cat < 1 || b.cat > 4) { libOk = false; break; }
      dist[b.cat]++;
      if (typeof b.q !== 'string' || b.q.length < 6 || b.q.indexOf('？') < 0) { libOk = false; break; }  // 题面完整问句
      if (seenQ[b.q]) { libOk = false; break; }                                                       // 题面全库互异
      seenQ[b.q] = 1;
      if (!Array.isArray(b.opts) || b.opts.length !== 4) { libOk = false; break; }                     // 1 正确+3 干扰
      if (new Set(b.opts).size !== 4 || b.opts.some(v => typeof v !== 'string' || !v || v.length > 18)) { libOk = false; break; }  // 文本互异
      if (b.ans !== Math.floor(b.ans) || b.ans < 0 || b.ans > 3) { libOk = false; break; }            // ans 唯一合法索引
      ansDist[b.ans]++;
      if (b.opts.some(v => b.q.indexOf(v) >= 0)) { leakIdx = i; libOk = false; break; }               // 题干不泄题（选项∉题面）
      if (!Array.isArray(b.ic) || b.ic.length !== 4 ||
          b.ic.some(k => iconKeys.indexOf(k) < 0)) { libOk = false; break; }                          // ic 平行且全可用（运行时真值）
    }
  }
  if (dist[1] !== 32 || dist[2] !== 40 || dist[3] !== 40 || dist[4] !== 48) libOk = false;             // 四域分布（升档定稿）
  if (ansDist[0] < 30 || ansDist[1] < 30 || ansDist[2] < 30 || ansDist[3] < 30) libOk = false;         // 答案档均衡
  /* m3（2026-09-13 审查）：防「选最长」人工捷径回归线——正确项严格最长占比 ≤60%
     （题库迭代时若新增题拉高该占比即 FAIL，防无脑点过回潮） */
  const longestN = bank ? bank.filter(b => b.opts.every(v => v.length < b.opts[b.ans].length)).length : -1;
  const longestOk = bank && longestN / bank.length <= 0.60;
  if (!longestOk) libOk = false;
  if (libOk) npass++;
  units.bank = { ok: libOk, n: bank ? bank.length : 0, err: bankErr, dist: dist, ansDist: ansDist,
    icons: iconKeys.length, qUnique: Object.keys(seenQ).length, leakIdx: leakIdx,
    longestN: longestN, longestPct: bank ? Math.round(longestN / bank.length * 1000) / 10 : -1 };

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-39，无 serve 基线） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, structAll = true, driveOk = true, rescueOk = true;
    const seen = {};
    if (flat < STATIC_LEVELS) {
      if (L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;                 // 静态关=循环专章
      if (L1.quizzes.some(q => q.cat !== L1.dch)) rangeAll = false;              // 四域各归一章
      if (L1.served !== 0) rangeAll = false;                                     // 无 serve 基线=0
    } else {
      if (L1.dch !== 0) rangeAll = false;                                        // 生成关=混抽标记
      const ids = L1.quizzes.map(q => q.qid);
      if (new Set(ids).size !== CH_LEN) rangeAll = false;                        // qid 互异（混抽无重复）
    }
    if (L1.quizzes.length !== CH_LEN) rangeAll = false;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q)) structAll = false;
      const rb = bank ? bank[q.qid] : null;                                      // 分源：独立提取的 bank 对账
      if (!rb || q.cat !== rb.cat || q.text !== rb.q || q.domain !== vDom[rb.cat]) rangeAll = false;  // 域映射分源
      if (rb) {
        const setEq = q.opts.map(o => o.v).slice().sort().join(',') === rb.opts.slice().sort().join(',');
        if (!setEq) rangeAll = false;                                            // 运行时选项集=bank 选项集（4 选）
        if (q.opts[q.answer].v !== rb.opts[rb.ans]) rangeAll = false;            // 分源答案对账
      }
      const sig = [q.text, q.opts.map(o => o.v).slice().sort().join(',')].join('|');  // 同关 5 题签名互异
      if (seen[sig]) rangeAll = false;
      seen[sig] = 1;
    }

    /* ①b 引擎直驱 */
    const Ld = genLevel(flat);
    if (engTapOpt(Ld, -1) !== null || engTapOpt(Ld, 99) !== null) driveOk = false;   // 非法下标
    if (engTapOpt(Ld, 0) === null) driveOk = false;                                  // 合法首击出计划
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      const wi = vWrongIdx(q);
      const p1 = engTapOpt(Ld, wi);
      if (!p1 || p1.win) { driveOk = false; break; }
      if (engCommitJudge(Ld, p1) !== 'wrong') { driveOk = false; break; }
      if (q.miss !== 1 || Ld.retries !== base + 1) { driveOk = false; break; }       // 错一次=1 miss
      const p2 = engTapOpt(Ld, q.answer);                                            // 零惩罚可重选（单选制）
      if (!p2 || !p2.win) { driveOk = false; break; }
      if (engCommitJudge(Ld, p2) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) { driveOk = false; break; }
      if (Ld.step !== k + 1) { driveOk = false; break; }
    }
    if (Ld.done !== true) driveOk = false;                                           // 5 题全解=关完成
    /* 星级三档独立驱动（3/1/0 错 → 1★/2★/3★） */
    const La = genLevel(flat);
    const qa = La.quizzes[0];
    for (let g = 0; g < 3; g++) {                                                   // 首题连错 3 次（可重选）
      engCommitJudge(La, engTapOpt(La, vWrongIdx(qa)));
    }
    let g2 = 0;
    while (!La.done && g2++ < 30) { engCommitJudge(La, engTapOpt(La, La.quizzes[La.step].answer)); }
    const s1 = La.done && La.retries === 3 && engStars(La) === 1;
    const Lb = genLevel(flat);
    const qb = Lb.quizzes[0];
    engCommitJudge(Lb, engTapOpt(Lb, vWrongIdx(qb)));                               // 仅首题错一次
    let g3 = 0;
    while (!Lb.done && g3++ < 30) { engCommitJudge(Lb, engTapOpt(Lb, Lb.quizzes[Lb.step].answer)); }
    const s2 = Lb.done && Lb.retries === 1 && engStars(Lb) === 2;
    const Lc = genLevel(flat);
    let g4 = 0;
    while (!Lc.done && g4++ < 30) { engCommitJudge(Lc, engTapOpt(Lc, Lc.quizzes[Lc.step].answer)); }
    const s3 = Lc.done && Lc.retries === 0 && engStars(Lc) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环：rescueTarget 恒指正确卡；步进点它收敛 solved；已解题无目标 */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    let chainOk = true, steps = 0;
    const dr0 = vWrongIdx(qr);
    engCommitJudge(Lr, engTapOpt(Lr, dr0));                                         // 干扰起步（miss=1）
    if (dirTarget(qr) === null || dirTarget(qr).act !== 'cat') chainOk = false;     // 方向级恒可得
    while (chainOk && !qr.solved && steps++ < 40) {
      const t = rescueTarget(qr);
      if (!t || t.act !== 'opt' || t.i !== qr.answer) { chainOk = false; break; }   // 答案级=正确卡
      engCommitJudge(Lr, engTapOpt(Lr, t.i));                                       // 按救援目标点=必对
    }
    if (!qr.solved) chainOk = false;
    if (rescueTarget(qr) !== null || dirTarget(qr) !== null) chainOk = false;       // 已解题无救援目标
    rescueOk = chainOk;

    const ok = det && rangeAll && structAll && driveOk && rescueOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll,
      structAll: structAll, driveOk: driveOk, rescueOk: rescueOk,
      stars: { many1: engStars(La), wrong1: engStars(Lb), clean: engStars(Lc) },
      qs: L1.quizzes.map(q => q.qid + '|' + q.text.slice(0, 8) + '>' + q.opts[q.answer].v) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ①d serve 注入引擎（升档：genLevel(flat, serve) 纯引擎面） ---- */
  total++;
  const svA = genLevel(5, [10, 3]), svB = genLevel(5, [10, 3]);
  let serveOk1 = JSON.stringify(svA) === JSON.stringify(svB) &&            // 同 flat+同 serve 双生成一致
    svA.served === 2 && svA.quizzes[0].qid === 10 && svA.quizzes[1].qid === 3;   // 注入题置前按序
  const svC = genLevel(5, [10, 10, 3, 999, 'x', -1]);                   // 非法过滤+同 id 去重（10 重复只注入一次）
  serveOk1 = serveOk1 && svC.served === 2 && svC.quizzes[0].qid === 10 && svC.quizzes[1].qid === 3;
  const svD = genLevel(0, [40]);                                           // flat0=ch1 bio，serve cat2 题=跨章复现
  const crossOk = svD.served === 1 && svD.quizzes[0].cat === 2 && svD.quizzes.length === CH_LEN;
  const sigsD = {}; let sigOk = true;
  for (const q of svD.quizzes) { const s = [q.text, q.opts.map(o => o.v).sort().join(',')].join('|');
    if (sigsD[s]) sigOk = false; sigsD[s] = 1; }
  const capOk = genLevel(7, [1, 2, 3, 4, 5]).served === 3;                 // 上限 3/关
  const serveEngOk = serveOk1 && crossOk && sigOk && capOk;
  if (serveEngOk) npass++;
  units.serveEng = { ok: serveEngOk, det: serveOk1, dedup: svC.served === 2,
    cross: crossOk, sig: sigOk, cap: capOk };

  /* ---- ①e wrongBank 机制（升档：覆写 KIDS._save 模拟存档，UI 真实通路） ---- */
  total++;
  const origSave = KIDS._save, origPersist = KIDS.store.persist;
  const fakeSv = { levels: {}, quiz: { wrongBank: [{ id: 0, ok: 1 }], serveDay: '2000-01-01' } };
  KIDS._save = function () { return fakeSv; };
  KIDS.store.persist = function () {};
  let bankOk1 = true, bankNotes = [];
  startLevel(0);                                                          // serveDay≠今天 → 注入 bank[0]
  const inj0 = cur.served === 1 && cur.quizzes[0].qid === 0 &&
    fakeSv.quiz.serveDay === vToday();                                    // serveDay 落账=今天（独立串对账）
  if (!inj0) { bankOk1 = false; bankNotes.push('inj'); }
  const qe0 = cur.quizzes[0];
  await QZ.tapOpt(vWrongIdx(qe0));                                        // 答错 → 入库 ok=0
  await wait(150 * SPEED);
  const bAfterMark = QZ.bank;
  if (!(bAfterMark.length === 1 && bAfterMark[0].id === 0 && bAfterMark[0].ok === 0)) {
    bankOk1 = false; bankNotes.push('mark:' + JSON.stringify(bAfterMark));
  }
  await QZ.tapOpt(qe0.answer);                                            // 答对① → ok=1
  await wait(150 * SPEED);
  if (!(QZ.bank.length === 1 && QZ.bank[0].ok === 1)) { bankOk1 = false; bankNotes.push('pass1:' + JSON.stringify(QZ.bank)); }
  startLevel(0);                                                          // 同日再进 → 不再注入
  if (!(cur.served === 0 && fakeSv.quiz.serveDay === vToday())) { bankOk1 = false; bankNotes.push('dayguard'); }
  fakeSv.quiz.serveDay = '2000-01-01';                                    // 模拟隔日：复现题再注入置前
  startLevel(0);
  const inj2 = cur.served === 1 && cur.quizzes[0].qid === 0;
  if (!inj2) { bankOk1 = false; bankNotes.push('reinj'); }
  await QZ.tapOpt(cur.quizzes[0].answer);                                 // 答对②（隔日复现） → ok=2 毕业
  await wait(150 * SPEED);
  if (QZ.bank.length !== 0) { bankOk1 = false; bankNotes.push('grad:' + JSON.stringify(QZ.bank)); }
  KIDS._save = origSave; KIDS.store.persist = origPersist;                // 还原（verify 页 _save()=null）
  startLevel(0);                                                          // 存档兼容：无档全 no-op 不炸
  const compatOk = QZ.currentLevel !== null && QZ.served === 0 && QZ.bank.length === 0;
  const bankOk = bankOk1 && compatOk;
  if (bankOk) npass++;
  units.wrongBank = { ok: bankOk, inject: inj0, mark: bankOk1, grad: QZ.bank.length === 0,
    compat: compatOk, notes: bankNotes.join(',') };

  /* ---- ② tapOpt 单元（flat0 真实 UI）：契约字段/错卡 wig 不消失/对卡推进/非法下标 ---- */
  total++;
  startLevel(0);
  const q0 = cur.quizzes[0];
  let domOk = true;
  const wIdx = vWrongIdx(q0);
  const rW = await QZ.tapOpt(wIdx);                                                // 错选
  if (rW !== 'wrong') domOk = false;
  await wait(1300 * SPEED);                                                        /* 等 1000ms 防重入窗 */
  let qz = QZ.quiz;
  const contractOk = qz && qz.q === q0.text && qz.opts.length === 4 &&             // 升档契约：q/opts×4
    qz.domain === vDom[q0.cat] && typeof qz.answer === 'number' &&                 // domain 域字段
    qz.step === 0 && qz.miss === 1;
  const missOk2 = contractOk && QZ.currentLevel.retries === 1;
  const wigEl = optEl(wIdx);
  const cardAlive = !!wigEl && !wigEl.classList.contains('gone') &&
    !wigEl.classList.contains('dim') && wigEl.querySelectorAll('.ov').length === 1;  // 单选制：卡不消失
  const rR = await QZ.tapOpt(q0.answer);                                           // 重选正确卡（零惩罚）
  if (rR !== 'right') domOk = false;
  await wait(400 * SPEED);
  const advOk = QZ.quiz && QZ.quiz.step === 1 && QZ.quiz.miss === 0;               // 推进到第 2 题新初态
  const badIdx = (await QZ.tapOpt(-1)) === false && (await QZ.tapOpt(99)) === false;
  startLevel(0);                                                                  // 还原
  const selfOk = domOk && missOk2 && cardAlive && advOk && badIdx;
  if (selfOk) npass++;
  units.tapOpt = { ok: selfOk, domOk: domOk, contractOk: !!contractOk, missOk: missOk2,
    cardAlive: cardAlive, advOk: advOk, badIdx: badIdx, q: q0.text, ans: q0.opts[q0.answer].v };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue, origSay2 = KIDS.voice.say;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  KIDS.voice.say = function (t) { wLog.push(['s', String(t)]); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  async function wrongOnce() {
    const q = cur.quizzes[cur.step];
    await QZ.tapOpt(vWrongIdx(q));
  }
  startLevel(0);                                                                  // flat0：每错必播
  await wrongOnce();                                                              // 错 1
  await wrongOnce();                                                              // 错 2（防重入窗后可再点）
  const sayA = cnt('qz_wrong');                                                   // → 2
  startLevel(3);                                                                  // flat3：10s 节流
  lastWrongVoice = Date.now();                                                    /* 显式进入节流窗口内 */
  await wrongOnce();
  const sayB = cnt('qz_wrong') - 2;                                               // 增量 → 0
  startLevel(3);                                                                  // 同关重发 fresh：force 豁免链
  lastWrongVoice = 0;                                                             /* 隔离上一子用例时间戳 */
  const qc3 = cur.quizzes[0];
  const base3 = qc3.miss;
  await wrongOnce();                                                              // miss=1 窗口外 → 播
  await wrongOnce();                                                              // miss=2 → force → 播
  const sayC = cnt('qz_wrong') - 2 - sayB;                                        // 增量 → 2
  const missOk3 = qc3.miss === base3 + 2;
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2; KIDS.voice.say = origSay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2 && missOk3;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC, missOk: missOk3 };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错一次=1 miss+卡不消失零惩罚 → 重选
     正确推进；autoSolve 余题；1 错=2 星；verify 页不弹层） ---- */
  total++;
  startLevel(0);
  const qA = cur.quizzes[0];
  let smokeA = true, failOk = false;
  await QZ.tapOpt(vWrongIdx(qA));                                                 // 首题错一次
  await wait(1300 * SPEED);                                                       /* 等防重入窗 */
  const stAfter = QZ.quiz;
  failOk = stAfter.miss === 1 && QZ.currentLevel.retries === 1;
  const aliveA = !optEl(vWrongIdx(qA)).classList.contains('gone');
  const r2 = await QZ.tapOpt(qA.answer);                                          // 重选正确
  if (r2 !== 'right') smokeA = false;
  const rest = await QZ.autoSolve();                                              // 余 4 题自动通关
  await wait(900 * SPEED);
  const lvA = QZ.currentLevel;
  const smokeOkA = smokeA && failOk && aliveA &&
    rest.done && rest.ok && rest.quizzes >= 1 &&
    lvA.done && lvA.won && lvA.retries === 1 && engStars(cur) === 2 &&
    !document.querySelector('.k-celebrate');                                      // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, failOk: failOk, aliveA: aliveA, autoSolve: rest,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B：flat15（ch4 因果推理专章）autoSolve 全对通关 3 星 ---- */
  total++;
  startLevel(15);
  const q15 = QZ.quiz;
  const shapeOk = q15 && cur.dch === 4 && cur.quizzes.every(q => q.cat === 4) &&
    cur.quizzes.every(q => q.domain === 'reason') &&
    (!bank || cur.quizzes.every(q => bank[q.qid] && bank[q.qid].cat === 4));   // 分源对账（bank 提取失败时由 ⓪ 判 FAIL）
  const restB = await QZ.autoSolve();
  await wait(900 * SPEED);
  const lv15 = QZ.currentLevel;
  const smokeOkB = shapeOk && restB.done && restB.ok && restB.quizzes === CH_LEN &&
    lv15.done && lv15.won && lv15.retries === 0 && engStars(cur) === 3;
  if (smokeOkB) npass++;
  smokes.flat15 = { ok: smokeOkB, shapeOk: shapeOk, autoSolve: restB, stars: engStars(cur) };

  /* ---- ④b UI 冒烟 C：flat20（生成关四域混抽）autoSolve 通关 ---- */
  total++;
  startLevel(20);
  const q20 = QZ.quiz;
  const genOk = q20 && cur.dch === 0 && cur.quizzes.length === CH_LEN &&
    new Set(cur.quizzes.map(q => q.qid)).size === CH_LEN;
  const restC = await QZ.autoSolve();
  await wait(900 * SPEED);
  const lv20 = QZ.currentLevel;
  const smokeOkC = genOk && restC.done && restC.ok && lv20.done && lv20.won;
  if (smokeOkC) npass++;
  smokes.flat20 = { ok: smokeOkC, genOk: genOk, cats: cur ? cur.quizzes.map(q => q.cat) : [],
    autoSolve: restC, stars: engStars(cur) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play, origS7 = KIDS.voice.say;
  const qLog7 = [], pLog7 = [], sLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  KIDS.voice.say = function (t) { sLog7.push(String(t)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → 读题 → 类别提示 → 排除 → 选卡判对 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7; KIDS.voice.say = origS7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = QZ.quiz;
  const tutOk = pLog7.indexOf('qz_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    window.__qzDemoR === 'right' &&                                     /* §0.27 演示判对真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&              /* 帮：解锁等孩子动手 */
    QZ.currentLevel && QZ.currentLevel.flat === 0 &&                     /* 重发同关 */
    q0t && q0t.step === 0 && q0t.miss === 0 &&                           /* 新题面初态 */
    qLog7.some(a => a.indexOf('qz_q_' + (q0t.qid + 1)) >= 0) &&          /* 题面=qz_q_N clip 链（T46 阶段2 键 1 基） */
    qLog7.some(a => a.indexOf('qz_cat_' + q0t.cat) >= 0) &&              /* 类别提示句=qz_cat_N clip */
    qLog7.some(a => a.indexOf('qz_no') >= 0) &&                          /* 排除纠错=qz_no clip */
    sLog7.length === 0 &&                                               /* 全段在册=零 TTS 兜底 */
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'qz_tut_turn';        /* 交接链单通道 */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('qz_tut_watch') >= 0,
    demoR: window.__qzDemoR, handoff: !!lastQ7, parts: lastQ7,
    qClip: qLog7.some(a => a.indexOf('qz_q_' + (q0t.qid + 1)) >= 0), tut: state.tut };

  /* ---- ⑤ 布局：双 viewport ×（flat0/5/10/15/20）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：opt-in scale(0) 起帧） ---- */
  async function simLayout(w, h, flat) {
    startLevel(flat);
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 卡入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const ask = askEl.getBoundingClientRect();
    const askOk = ask.height >= 64 && ask.width >= 200 && askTextEl.textContent.length > 0;   // 题面卡
    const catOk = askCatEl.getBoundingClientRect().height >= 40;                              // 类别小标签可见
    const cards = Array.prototype.slice.call(optPoolEl.querySelectorAll('.opt'));
    const cardOk = cards.length === 4 &&                                        // 升档：4 张选项卡
      cards.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家族豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(document.getElementById('game').scrollWidth - document.getElementById('game').clientWidth,
      de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, askOk: askOk, catOk: catOk, cardOk: cardOk,
      btnOk: btnOk, ox: ox,
      pass: askOk && catOk && cardOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5, 10, 15, 20]) {
    sims.push(await simLayout(1280, 800, f));
    sims.push(await simLayout(800, 1180, f));
  }
  const g0 = document.getElementById('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 10 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / TTS 兜底 / 读题面 ---- */
  total++;
  /* SPEC §3 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！小小百科题' &&
    VOICE.turn.text === '你来答一答' && VOICE.hint.text === '想一想再说' &&
    VOICE.right.text === '答对啦，知识小达人' && VOICE.wrong.text === '再想一想哦';
  /* 333 条 clips 注入对账（T46 阶段2：qz_ 330=qz_q_160+qz_opts_160+qz_cat_4+qz_no+通用 5
     +core 3，manifest games:['quiz'] 全集） */
  const QZ_KEYS = ['qz_tut_watch', 'qz_tut_turn', 'qz_hint', 'qz_right', 'qz_wrong', 'qz_no',
    'qz_q_1', 'qz_q_160', 'qz_opts_1', 'qz_opts_160', 'qz_cat_1', 'qz_cat_2', 'qz_cat_3', 'qz_cat_4'];
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 333 && QZ_KEYS.every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;
  /* 开场链 / 读题面三段链（stub 记录；T46 阶段2：hint+题面+选项串全 clip 化） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push([String(key), text === undefined ? null : String(text)]); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'qz_hint';   // 开场=[hint] 单通道
  const qw0 = cur.quizzes[0];
  const heard = uiHear() === true;                 // 先驱动再断言（链在驱动后才入 qLog）
  const hearChain = qLog.find(a => a.length === 3 &&
    a[0] === 'qz_hint' && a[1] === 'qz_q_' + (qw0.qid + 1) && a[2] === 'qz_opts_' + (qw0.qid + 1));
  const hearOk = heard && !!hearChain && sayLog.length === 0;   // 三段全 clip 链+零 TTS 兜底
  const throttleOk = uiHear() === false;                                         // 3s 节流
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  startLevel(0);                                // 还原
  const specOk = refVoice && clipOk && openChain && hearOk && throttleOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, clips: clipOk, nClips: nClips,
    openChain: openChain, hearOk: hearOk, throttleOk: throttleOk,
    missing: QZ_KEYS.filter(k => !KIDS.voice.clips[k]) };

  const out = { game: 'quiz', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes };
  document.getElementById('verify-result').textContent = JSON.stringify(out);
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
