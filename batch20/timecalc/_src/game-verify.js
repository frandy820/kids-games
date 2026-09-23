/* ================= ?verify=1 自检（仅 verify 分支加载执行·r16）
   ① 40 关全量审计（flat 0-39，每关 8 题）：确定性（同 flat 双生成 JSON 一致）/
     章约束（ch1 clock5 认刻梯度+elapse 不越上午界；ch2 plus/minus/span 按题号轮换；
     ch3 comp/compd/night 轮换+compd 跨日跨周域；ch4 sched 三问型轮换）/
     结构 structOk（恰 4 卡互异、answer idx 域、格式合法）/ §0.43 分源独立计算器
     refAnswer 对账（独立星期字面量数组+分钟制换算实现，禁复用游戏侧公式）/
     干扰项合法性（非 answer 卡全为合法星期名/时刻/天数/小时/分钟/活动名格式且互异）/
     同关 8 题签名互异 / 手解安全网 FALLBACKS 双写对账
   ①b 引擎直驱：非法下标拒绝；错选=miss 恰一次可重点；正选=right/done 推进；
     星级三档独立驱动（3/1/0 错）
   ①c 救援目标闭环：rescueTarget=正确卡 idx 步进收敛 solved；已解题无救援目标
   ①d 生成关抽样（flat 40-44）：确定性+结构+真值+签名互异+dch∈1-4+章池型数（ch1 ≥2 / 其余 ≥3）
   ①e sched 行唯一解专项（Python verify_one 第三源同口径）：dur 干扰≠任何行真值 /
     find 问刻属恰一行 / long 严格唯一最大
   ⑭ 时长模型（r16 estMs 定版）：独立副本 EST2 分源复算每题 voiceWin ≤ DECIDE[kind] /
     40+5 关 modeled 最低精确断言（91040@flat0 防回漂双钉）/ 游戏侧 levelDurMs 全量对账 /
     LEVEL_MIN_MS=40000 门禁
   ② tapOpt/tapDay/tapRow 单元（flat0/flat11/flat30 真实 UI）：错=卡抖+1000ms 防重入窗内
     二连点拒绝+窗后可重点；对=ok 推进；非法下标 false；时钟题 tapDay 拒绝/星期题通过/
     作息表题 tapRow 通过
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次；
     r16 分型 wrongOf——clock5 题播 tc_wrong2）
   ③ UI 冒烟 A：flat0 真实通路通关（首题错 1 次=1 miss+零惩罚可重选→重选 answer
     →autoSolve 余 7 题；1 错=2 星；verify 页不弹层）
   ④ UI 冒烟 B：flat30（ch4 sched）autoSolve 全对 3 星 + flat21（ch3）逐题分源真值
     对账（comp/compd/night 三型齐）+ flat11（ch2）tapDay 朗读
   ④b 指针角度对账（§0.43）：flat0 八题 DOM transform rotate vs 独立计算
     （时针 hour%12*30+min*0.5 / 分针 min*6——5 分钟刻全域）+ 大刻/小刻/数字各 12
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 读题+指钟+选卡
     __tcDemoR==='right'（§0.27）→ 重发同关 → 交接链 queue([tc_tut_turn]) →
     tut='help' 解锁
   ⑤ 布局：三通道（1280×800 横 / 800×1180 竖真 @media / 1280×800+body.port 类通道）
     ×（flat0/11/21/31）：答案卡 ≥64、日历块 ≥58、时钟盘 ≥140、night 牌 ≥96、
     作息表行 ≥44、全按钮 ≥64（.k-parentbtn 豁免）、overflowX ≤0
   ⑥ 分布与专项：VOICE 文案独立字面量对账（SPEC §1+r16 定稿）/ tc_ 224 条 clips
     clipOk / 开场链分型单通道（clock5 首题=tc_hint2）/ 点卡时刻词 clip 化（T46 拆段）/
     读题面 hintOf 分型+题面段链 / tapDay·tapRow 朗读 clip 链 / 救援视觉（方向级 kw pulse+
     答案级 miss≥2 breathe）
   ⑧ span M1 消歧义对账（ch2 span 题面含「不算出发那天」+from 块角标）
   结果写 #verify-result + document.title='VERIFY PASS n/n'（全部单元完成后才设 title） */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- verify 侧独立复算实现（SPEC §0.43 分源：独立字面量+异构实现，
     禁复用游戏侧公式——同语义不同实现，笔误即 fail） ---- */
  const RW = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const RM5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const RT5 = /^(1[0-2]|[1-9]):[0-5][05]$/;     // 合法 5 刻时刻卡（分钟两位）
  const RAFT = /^下午(1[0-2]|[1-9]):[0-5][05]$/;// 合法下午时刻卡
  const RCPD = /^星期[日一二三四五六] 12:[0-5][05]$/;   // 合法跨日组合卡
  const RHR = /^(1[0-2]|[1-9]) 小时$/;          // 合法小时卡（1-12）
  const RMIN = /^([1-9]|[1-4][0-9]|50) 分钟$/;  // 合法分钟卡（5-50）
  const RDN = /^[1-6] 天$/;                     // 合法天数卡
  function refFmt(h, m) {                        // 时间文本：字符串逐段拼接（异于模板串）
    let s = String(h) + ':';
    s += (m < 10 ? '0' : '') + String(m);
    return s;
  }
  function refDays(q) {                          // 区间差 B−A 不含今天：补 7 循环（异于 %7）
    let d = q.to - q.from;
    while (d <= 0) d += 7;
    return d % 7 === 0 ? 7 : d % 7;
  }
  function refAnswer(q) {
    if (q.kind === 'clock5') return refFmt(q.hour, q.minute);
    if (q.kind === 'elapse') { const t = q.hour * 60 + q.minute + q.dur; return refFmt(Math.floor(t / 60), t % 60); }
    if (q.kind === 'plus') { let t = q.today + q.plus; while (t >= 7) t -= 7; return RW[t]; }
    if (q.kind === 'minus') { let t = q.today - q.back; while (t < 0) t += 7; return RW[t]; }
    if (q.kind === 'span') return refDays(q) + ' 天';
    if (q.kind === 'comp') { const t = q.hour * 60 + q.minute + q.dur; return '下午' + refFmt(Math.floor(t / 60), t % 60); }
    if (q.kind === 'compd') { let d = q.today + 1; if (d > 6) d -= 7; return RW[d] + ' ' + refFmt(12, q.minute + q.dur - 60); }
    if (q.kind === 'night') return (12 - q.startH + q.endH) + ' 小时';
    const r = q.table[q.askRow];                 // sched：dur=行分钟差 / find·long=行名
    if (q.stype === 'dur') return ((r.eh * 60 + r.em) - (r.sh * 60 + r.sm)) + ' 分钟';
    return r.name;
  }
  /* 干扰合法性（分源）：非 answer 卡全为合法格式（§0.43 禁非法项） */
  function refDistractOk(q) {
    const ansV = q.opts[q.answer].v;
    for (let i = 0; i < q.opts.length; i++) {
      if (i === q.answer) continue;
      const v = q.opts[i].v;
      if (v === ansV) return false;
      if (q.kind === 'clock5' || q.kind === 'elapse') { if (!RT5.test(v)) return false; }
      else if (q.kind === 'plus' || q.kind === 'minus') { if (RW.indexOf(v) < 0) return false; }
      else if (q.kind === 'span') { if (!RDN.test(v)) return false; }
      else if (q.kind === 'comp') { if (!RAFT.test(v)) return false; }
      else if (q.kind === 'compd') { if (!RCPD.test(v)) return false; }
      else if (q.kind === 'night') { if (!RHR.test(v)) return false; }
      else if (q.stype === 'dur') { if (!RMIN.test(v)) return false; }
      else if (ACTS.indexOf(v) < 0) return false;
    }
    const vs = q.opts.map(o => o.v);
    return new Set(vs).size === 4;               // 卡值互异（干扰亦互异）
  }
  /* 章约束分源复算（SPEC §1 r16 题型定稿） */
  function refChapOk(dch, q, flat, ext) {
    if (dch === 1) {
      if (q.kind !== 'clock5' && q.kind !== 'elapse') return false;
      if (q.kind === 'clock5') {
        if (!(q.hour >= 1 && q.hour <= 12) || RM5.indexOf(q.minute) < 0) return false;
      } else {
        if (!(q.dur >= 5 && q.dur <= 75 && q.dur % 5 === 0)) return false;
        if (q.hour * 60 + q.minute + q.dur > 715) return false;   // 经过时间不越上午界（11:55）
      }
      if (!ext && flat % LEVELS_PER_CH < 2 && q.kind !== 'clock5') return false;   // ch1 前 2 关认刻梯度
    } else if (dch === 2) {
      const hi = ext ? 9 : 4, lo = ext ? 5 : 2, dlo = ext ? 3 : 2, dhi = ext ? 6 : 4;
      if (q.kind === 'plus') return q.plus >= lo && q.plus <= hi && q.today >= 0 && q.today <= 6;
      if (q.kind === 'minus') return q.back >= lo && q.back <= hi && q.today >= 0 && q.today <= 6;
      if (q.kind === 'span') { const d = refDays(q); return d >= dlo && d <= dhi && q.from !== q.to; }
      return false;
    } else if (dch === 3) {
      if (q.kind === 'comp') {
        if (!(q.dur >= 10 && q.dur <= 60 && q.dur % 5 === 0)) return false;
        return q.hour * 60 + q.minute + q.dur <= 715;
      }
      if (q.kind === 'compd') {
        if (!(q.today === 0 || q.today === 5 || q.today === 6)) return false;      // 跨日跨周覆盖域
        if (!(q.dur >= 20 && q.dur <= 55 && q.dur % 5 === 0)) return false;        // dur 20-55（朗读域）
        return q.minute + q.dur > 60 && q.minute + q.dur < 120;
      }
      if (q.kind === 'night') return q.startH >= 8 && q.startH <= 10 && q.endH >= 6 && q.endH <= 8;
      return false;
    } else {
      if (q.kind !== 'sched') return false;
      if (q.table.length !== (ext ? 5 : 4)) return false;                          // 生成关 5 行表
      const lens = q.table.map(r => (r.eh * 60 + r.em) - (r.sh * 60 + r.sm));
      if (lens.some(v => v < 15 || v > 40 || v % 5 !== 0)) return false;
      if (new Set(lens).size !== lens.length) return false;                        // 行时长互异
      return q.stype === 'dur' || q.stype === 'find' || q.stype === 'long';
    }
    return true;
  }
  /* 各章题内轮换分源（ch1 偶 clock5 奇 elapse（lv≥2）/ ch2·ch3·ch4 k%3；fallback 同口径） */
  const ROT3 = { 2: ['plus', 'minus', 'span'], 3: ['comp', 'compd', 'night'], 4: ['sched', 'sched', 'sched'] };
  function refAltOk(dch, quizzes, flat) {
    if (dch === 1) {
      if (flat % LEVELS_PER_CH < 2) return quizzes.every(q => q.kind === 'clock5');
      return quizzes.every((q, k) => q.kind === (k % 2 === 0 ? 'clock5' : 'elapse'));
    }
    if (dch === 4) return quizzes.every((q, k) => q.stype === ['dur', 'find', 'long'][k % 3]);
    if (dch === 2 || dch === 3) return quizzes.every((q, k) => q.kind === ROT3[dch][k % 3]);
    return true;
  }
  /* sched 行唯一解专项（①e）：dur 干扰≠任何行真值 / find 问刻属恰一行（问刻=行起点，
     连续表+互异起点→唯一）/ long 严格唯一最大 */
  function refSchedUniqueOk(q) {
    const lens = q.table.map(r => (r.eh * 60 + r.em) - (r.sh * 60 + r.sm));
    if (q.stype === 'dur') {
      const ans = lens[q.askRow];
      for (let i = 0; i < q.opts.length; i++) {
        if (i === q.answer) continue;
        const n = parseInt(q.opts[i].v, 10);                  // 干扰分钟数 ≠ 任何行真值
        if (lens.indexOf(n) >= 0) return false;
      }
      return q.opts[q.answer].v === ans + ' 分钟';
    }
    if (q.stype === 'find') {
      const r = q.table[q.askRow];
      const t = r.sh * 60 + r.sm;
      let cnt = 0;                                            // 问刻=恰一行起点（连续表唯一）
      for (const w of q.table) if (w.sh * 60 + w.sm === t) cnt++;
      return cnt === 1 && q.opts[q.answer].v === r.name;
    }
    const mx = Math.max.apply(null, lens);                    // long 严格唯一最大
    return lens.indexOf(mx) === lens.lastIndexOf(mx) && q.opts[q.answer].v === q.table[lens.indexOf(mx)].name;
  }
  /* 手解安全网双写字面量（与 game-core FALLBACKS 分源对账；genLevel 极端防御路） */
  const REF_FB = {
    clock5: { hour: 3, minute: 5, dis: ['4:05', '2:05', '3:10'] },
    elapse: { hour: 3, minute: 50, dur: 20, dis: ['3:50', '3:10', '5:10'] },
    plus:   { today: 3, plus: 2, dis: ['星期四', '星期六', '星期三'] },
    minus:  { today: 5, back: 3, dis: ['星期一', '星期三', '星期五'] },
    span:   { from: 3, to: 6, dis: ['2 天', '4 天', '5 天'] },
    comp:   { hour: 3, minute: 20, dur: 40, today: 3, dis: ['下午3:20', '下午5:00', '下午4:05'] },
    compd:  { today: 6, minute: 40, dur: 40, hour: 11, dis: ['星期六 12:20', '星期日 12:15', '星期日 12:25'] },
    night:  { startH: 9, endH: 7, dis: ['2 小时', '9 小时', '11 小时'] },
    sched:  { stype: 'dur', askRow: 1, rowS: 440, rowE: 470, rowName: '早读',
              table: [['起床', 7, 0, 7, 20], ['早读', 7, 20, 7, 50], ['游戏', 7, 50, 8, 30], ['学习', 8, 30, 9, 5]],
              dis: ['25 分钟', '15 分钟', '50 分钟'] }
  };
  function fbDualityOk() {
    const numFields = ['hour', 'minute', 'today', 'plus', 'back', 'from', 'to', 'dur', 'startH', 'endH', 'askRow', 'rowS', 'rowE'];
    for (const k of Object.keys(REF_FB)) {
      const a = FALLBACKS[k], b = REF_FB[k];
      if (!a || !b) return false;
      for (const f of numFields) {
        if ((a[f] == null ? 0 : a[f]) !== (b[f] == null ? 0 : b[f])) return false;
      }
      if ((a.distract || []).length !== b.dis.length ||
        (a.distract || []).some((v, i) => v !== b.dis[i])) return false;
      if (k === 'sched' && (a.stype !== b.stype || a.rowName !== b.rowName)) return false;
    }
    /* fallbackQuiz 产物真值+结构（4 章×8 题号全驱） */
    for (let d = 1; d <= 4; d++) for (let k = 0; k < CH_LEN; k++) {
      const q = fallbackQuiz(d, k);
      if (!structOk(q) || q.opts[q.answer].v !== refAnswer(q) || !refDistractOk(q)) return false;
      if (q.kind === 'sched' && !refSchedUniqueOk(q)) return false;
    }
    return true;
  }
  /* 独立工具：错误卡索引（answer 顺时针下一张，恒 ≠ answer；禁复用游戏侧） */
  const vWrongIdx = q => (q.answer + 1) % q.opts.length;

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援闭环（flat 0-39） ---- */
  const fbOk = fbDualityOk();
  for (let flat = 0; flat < STATIC_LEVELS; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, structAll = true, driveOk = true, rescueOk = true, schedAll = true;
    const seen = {};
    if (L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;      // 静态关=循环章
    if (L1.quizzes.length !== CH_LEN) rangeAll = false;
    if (!refAltOk(L1.dch, L1.quizzes, flat)) rangeAll = false;      // 章内轮换
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!refChapOk(L1.dch, q, flat, false)) rangeAll = false;     // 章约束
      if (!structOk(q)) structAll = false;
      if (q.opts[q.answer].v !== refAnswer(q)) rangeAll = false;    // §0.43 独立计算器真值
      if (!refDistractOk(q)) structAll = false;                     // 干扰合法+互异
      if (q.kind === 'sched' && !refSchedUniqueOk(q)) schedAll = false;   // ①e 唯一解
      const sig = sigOf(q);                                         // 同关 8 题签名互异
      if (seen[sig]) rangeAll = false;
      seen[sig] = 1;
    }
    if (!fbOk) structAll = false;                                   // 安全网双写并入结构档

    /* ①b 引擎直驱 */
    const Ld = genLevel(flat);
    if (engCommit(Ld, -1) !== null || engCommit(Ld, 99) !== null) driveOk = false;   // 非法下标
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (engCommit(Ld, vWrongIdx(q)) !== 'wrong') { driveOk = false; break; }      // 错选
      if (q.miss !== 1 || Ld.retries !== base + 1) { driveOk = false; break; }      // 错一次=1 miss
      if (engCommit(Ld, q.answer) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) { driveOk = false; break; }
      if (Ld.step !== k + 1) { driveOk = false; break; }
    }
    if (Ld.done !== true) driveOk = false;                          // 8 题全解=关完成
    /* 星级三档独立驱动（3/1/0 错 → 1★/2★/3★） */
    const La = genLevel(flat);
    const qa = La.quizzes[0];
    for (let g = 0; g < 3; g++) {                                  // 首题连错 3 次
      engCommit(La, vWrongIdx(qa));
    }
    let g2 = 0;
    while (!La.done && g2++ < 30) engCommit(La, La.quizzes[La.step].answer);
    const s1 = La.done && La.retries === 3 && engStars(La) === 1;
    const Lb = genLevel(flat);
    engCommit(Lb, vWrongIdx(Lb.quizzes[0]));                       // 仅首题错一次
    let g3 = 0;
    while (!Lb.done && g3++ < 30) engCommit(Lb, Lb.quizzes[Lb.step].answer);
    const s2 = Lb.done && Lb.retries === 1 && engStars(Lb) === 2;
    const Lc = genLevel(flat);
    let g4 = 0;
    while (!Lc.done && g4++ < 30) engCommit(Lc, Lc.quizzes[Lc.step].answer);
    const s3 = Lc.done && Lc.retries === 0 && engStars(Lc) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;

    /* ①c 救援目标闭环：rescueTarget 步进选卡收敛 solved；已解题无救援目标 */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes[0];
    let chainOk = true, steps = 0;
    const t0 = rescueTarget(qr);
    if (!t0 || t0.act !== 'opt' || t0.i !== qr.answer) chainOk = false;
    while (chainOk && !qr.solved && steps++ < 40) {
      const t = rescueTarget(qr);
      if (!t) { chainOk = false; break; }
      if (engCommit(Lr, t.i) !== 'right' && engCommit(Lr, t.i) !== 'done') { chainOk = false; break; }
    }
    if (!qr.solved) chainOk = false;
    if (rescueTarget(qr) !== null) chainOk = false;                 // 已解题无救援目标
    rescueOk = chainOk;

    const ok = det && rangeAll && structAll && driveOk && rescueOk && schedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll,
      structAll: structAll, driveOk: driveOk, rescueOk: rescueOk, schedAll: schedAll,
      stars: { many1: engStars(La), wrong1: engStars(Lb), clean: engStars(Lc) },
      qs: L1.quizzes.map(q => q.kind[0] + (q.kind === 'sched' ? q.stype[0] : '') + ':' + q.opts[q.answer].v) };
    levels[keyOf(flat)] = rec;
  }

  /* ---- ①d 生成关抽样（flat 40-44：dch 随机但确定性同关同题组+扩档参数） ---- */
  total++;
  let genOk = true;
  const genSeen = {};
  for (let flat = STATIC_LEVELS; flat < STATIC_LEVELS + 5; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    if (JSON.stringify(L1) !== JSON.stringify(L2)) genOk = false;
    if (L1.dch < 1 || L1.dch > 4) genOk = false;
    if (L1.ch !== Math.floor(flat / LEVELS_PER_CH) + 1) genOk = false;
    const pool2 = new Set(L1.quizzes.map(q => q.kind));
    const needKinds = L1.dch === 1 ? 2 : 3;                        // ch1 章池 2 型，余 3 型
    if (L1.dch !== 4 && pool2.size < needKinds) genOk = false;     // 混出（ch4 三问型）
    if (L1.dch === 4 && new Set(L1.quizzes.map(q => q.stype)).size < 3) genOk = false;
    const seen2 = {};
    for (const q of L1.quizzes) {
      if (!structOk(q) || !refDistractOk(q)) genOk = false;
      if (q.opts[q.answer].v !== refAnswer(q)) genOk = false;
      if (!refChapOk(L1.dch, q, flat, true)) genOk = false;        // ext 扩档口径
      if (q.kind === 'sched' && !refSchedUniqueOk(q)) genOk = false;
      const sig = sigOf(q);
      if (seen2[sig]) genOk = false;
      seen2[sig] = 1;
    }
    genSeen[flat] = { dch: L1.dch, ok: genOk, qs: L1.quizzes.map(q => q.kind[0] + ':' + q.opts[q.answer].v).join(',') };
    if (!genOk) break;
  }
  if (genOk) npass++;
  gen.sample = genSeen;

  /* ---- ⑭ 时长模型（r16 estMs 定版四方；独立副本分源复算——EST2 字面与 data 源同） ---- */
  total++;
  const EST2 = s => s.length * 345 + 600;          // estMs 独立副本（build 四方字面断言之 verify 侧）
  const ENTER2 = 400, TAIL2 = 300, TAP2 = 1500, ADV2 = 880;
  const DEC2 = { clock5: 9000, elapse: 14000, plus: 11000, minus: 12000, span: 13000,
    comp: 15000, compd: 19000, night: 15000, sched_dur: 16000, sched_find: 12000, sched_long: 13000 };
  function askRef(q) {                             // 题面句分源重拼（异于 main askText 模板）
    if (q.kind === 'clock5') return '看看钟，现在是几点几分？';
    const CNR = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const num = n => n < 10 ? '零' + CNR[n] : n === 10 ? '十' : n < 20 ? '十' + CNR[n % 10] :
      CNR[Math.floor(n / 10)] + '十' + (n % 10 ? CNR[n % 10] : '');
    const hr = h => h < 10 ? CNR[h] : num(h);       // 小时 1-12（11/12 两位数，分源同 cnHour）
    const tim = (h, m) => hr(h) + '点' + (m === 0 ? '整' : (m < 10 ? '零' + CNR[m] : num(m)) + '分');
    if (q.kind === 'elapse') return '现在是' + tim(q.hour, q.minute) + '，再过' + num(q.dur) + '分钟，是几点几分？';
    if (q.kind === 'plus') return '今天是' + RW[q.today] + '，再过' + CNR[q.plus] + '天，是星期几？';
    if (q.kind === 'minus') return '今天是' + RW[q.today] + '，' + CNR[q.back] + '天前，是星期几？';
    if (q.kind === 'span') return '从' + RW[q.from] + '到' + RW[q.to] + '，不算出发的那天，要经过几天？';
    if (q.kind === 'comp') return '星期' + RW[q.today].slice(2) + '下午' + tim(q.hour, q.minute) + '开始，过' + num(q.dur) + '分钟，是几点几分？';
    if (q.kind === 'compd') return '星期' + RW[q.today].slice(2) + '晚上' + tim(11, q.minute) + '开始，过' + num(q.dur) + '分钟，过了半夜十二点，是星期几的几点几分？';
    if (q.kind === 'night') return '晚上' + hr(q.startH) + '时睡觉，早上' + hr(q.endH) + '时起床，睡了几个小时？';
    const r = q.table[q.askRow];
    if (q.stype === 'dur') return '作息表里，' + r.name + '用了多长时间？';
    if (q.stype === 'find') return '作息表里，' + tim(r.sh, r.sm) + '开始的活动是什么？';
    return '作息表里，哪个活动用的时间最长？';
  }
  const durRef = q => Math.max(ENTER2 + EST2(askRef(q)) + TAIL2, DEC2[q.kind === 'sched' ? 'sched_' + q.stype : q.kind]) + TAP2 + ADV2;
  let winOk = true, durMin = Infinity, durFlat = -1, parityOk = true, worst = null;
  for (let flat = 0; flat < STATIC_LEVELS + 5; flat++) {
    const L = genLevel(flat);
    let sum = 0, sumRef = 0;
    for (const q of L.quizzes) {
      const vw = ENTER2 + EST2(askRef(q)) + TAIL2;
      if (vw > DEC2[q.kind === 'sched' ? 'sched_' + q.stype : q.kind]) { winOk = false; worst = worst || { flat: flat, kind: q.kind, vw: vw }; }
      sumRef += durRef(q);
      sum += quizDurMs(q);                         // 游戏侧 levelDurMs 逐题对账
    }
    if (Math.abs(sum - levelDurMs(L)) > 0.001) parityOk = false;
    if (sumRef !== sum) parityOk = false;          // 分源复算与游戏侧全等（同 askText 语义）
    if (flat < STATIC_LEVELS && sumRef < durMin) { durMin = sumRef; durFlat = flat; }
  }
  const durOk = winOk && parityOk && durMin === 91040 && durFlat === 0 && durMin >= 40000;
  if (durOk) npass++;
  units.duration = { ok: durOk, minMs: durMin, minFlat: durFlat, winOk: winOk, parity: parityOk, worst: worst };

  /* ---- ② tapOpt/tapDay/tapRow 单元（flat0/flat11/flat30 真实 UI）：防重入窗+抖动+推进 ---- */
  total++;
  startLevel(0);
  const q0 = cur.quizzes[0];
  let domOk = true;
  if (!q0 || q0.kind !== 'clock5') domOk = false;                   // flat0=ch1 认刻
  if ((await TC.tapOpt(-1)) !== false || (await TC.tapOpt(99)) !== false) domOk = false;   // 非法下标
  const wIdx = vWrongIdx(q0);
  /* 防重入窗测试用并发时序（b18 纪律：await 返回时窗已关，测不到窗内）——
     发起错选不 await（同步段已至 locked=true），窗内并发二连点应 false */
  const p1 = TC.tapOpt(wIdx);
  const inWin = await TC.tapOpt(q0.answer);                        // 窗内二连点 → false（§0.26）
  const wres = await p1;                                           // 'wrong'
  if (wres !== 'wrong') domOk = false;                             // 错选=wrong
  if (inWin !== false) domOk = false;                              // 窗内拒绝+不吞题（miss 不多计）
  const st1 = TC.quiz;
  if (st1.miss !== 1 || TC.currentLevel.retries !== 1) domOk = false;
  const wigEl = cardEl(wIdx);
  if (!wigEl || !wigEl.classList.contains('wig')) domOk = false;   // 错卡抖动
  await wait(1300 * SPEED);                                        // 窗后（verify 提速 120ms）
  if (uiTapDay(3) !== false) domOk = false;                        // 时钟题日历未渲染=拒绝
  if (TC.tapRow(0) !== false) domOk = false;                       // 时钟题表行未渲染=拒绝
  if ((await TC.tapOpt(q0.answer)) !== 'right') domOk = false;     // 窗后可重点（零惩罚）
  if (TC.currentLevel.step !== 1) domOk = false;                   // 推进
  const quizCopy = TC.quiz;
  if (quizCopy.opts.length !== 4 || quizCopy.answer < 0 || quizCopy.answer > 3) domOk = false;
  quizCopy.opts[0].v = 'MUTATED';                                  // 拷贝非活引用（§0.9）
  if (TC.quiz.opts[0].v === 'MUTATED') domOk = false;
  startLevel(11);                                                  // flat11=ch2 关 1（minus+tapDay）
  if (cur.quizzes[0].kind !== 'plus') domOk = false;               // flat11 k%3=0=plus
  if (uiTapDay(cur.quizzes[0].today) !== true) domOk = false;      // 星期题日历块可点
  startLevel(30);                                                  // flat30=ch4 sched
  if (cur.quizzes[0].kind !== 'sched') domOk = false;
  if (TC.tapRow(0) !== true) domOk = false;                        // 作息表行朗读通过（r16）
  if (TC.quiz.step !== 0) domOk = false;                           // 朗读不推进
  const selfOk = domOk;
  if (selfOk) npass++;
  units.tapOpt = { ok: selfOk, wigOk: !!wigEl, missOk: st1 ? st1.miss === 1 : false,
    step: TC.currentLevel ? TC.currentLevel.step : -1, copyOk: true };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次；
          r16 分型：flat0=clock5 → tc_wrong2；flat3 若首题=elapse → tc_wrong2 同键） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play, origQueue2 = KIDS.voice.queue, origSay2 = KIDS.voice.say;
  KIDS.voice.play = function (key) { wLog.push(['p', String(key)]); };
  KIDS.voice.queue = function (parts) { wLog.push(['q'].concat(parts)); };
  KIDS.voice.say = function (t) { wLog.push(['s', String(t)]); };
  const cnt = k => wLog.filter(p => p.indexOf(k) >= 0).length;
  async function wrongOnce() {
    const q = cur.quizzes[cur.step];
    await TC.tapOpt(vWrongIdx(q));
    await wait(1100 * SPEED);                                      // 过防重入窗
  }
  startLevel(0);                                                  // flat0：每错必播（clock5→tc_wrong2）
  await wrongOnce();                                              // 错 1
  await wrongOnce();                                              // 错 2（零惩罚可再选）
  const sayA = cnt('tc_wrong2');                                  // → 2
  const sayAOld = cnt('tc_wrong');                                // → 0（分型不误播日历键）
  startLevel(10);                                                 // flat10=ch2 plus：日历类 → tc_wrong
  await wrongOnce();
  const sayCal = cnt('tc_wrong');                                 // → 1
  startLevel(13);                                                 // flat13：10s 节流
  lastWrongVoice = Date.now();                                    /* 显式进入节流窗口内 */
  await wrongOnce();
  const sayB = cnt('tc_wrong') - 1;                               // 增量 → 0
  startLevel(13);                                                 // 同关重发 fresh：force 豁免链
  lastWrongVoice = 0;                                             /* 隔离上一子用例时间戳 */
  const qc3 = cur.quizzes[0];
  const base3 = qc3.miss;
  await wrongOnce();                                              // miss=1 窗口外 → 播
  await wrongOnce();                                              // miss=2 → force → 播
  const sayC = cnt('tc_wrong') - 1 - sayB;                        // 增量 → 2
  const missOk = qc3.miss === base3 + 2;
  KIDS.voice.play = origPlay2; KIDS.voice.queue = origQueue2; KIDS.voice.say = origSay2;
  const sayWOk = sayA === 2 && sayAOld === 0 && sayCal === 1 && sayB === 0 && sayC === 2 && missOk;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat0OldKey: sayAOld, flat10Cal: sayCal,
    flat13Throttle: sayB, flat13Force: sayC, missOk: missOk };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题错 1 次 → 窗后重选 → autoSolve 余 7 题；
     1 错=2 星；verify 页不弹层） ---- */
  total++;
  startLevel(0);
  const qA = cur.quizzes[0];
  let smokeA = true, failOk = false;
  await TC.tapOpt(vWrongIdx(qA));                                 // 错选 1 次
  await wait(1300 * SPEED);                                       /* 等 1000ms 防重入窗 */
  const stAfter = TC.quiz;
  failOk = stAfter.miss === 1 && TC.currentLevel.retries === 1;
  if ((await TC.tapOpt(qA.answer)) !== 'right') smokeA = false;   // 窗后可重选（零惩罚）
  const rest = await TC.autoSolve();                              // 余 7 题自动通关
  await wait(900 * SPEED);
  const lvA = TC.currentLevel;
  const smokeOkA = smokeA && failOk && rest.done && rest.ok && rest.quizzes >= 1 &&
    lvA.done && lvA.won && lvA.retries === 1 && engStars(cur) === 2 &&
    !document.querySelector('.k-celebrate');                      // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, failOk: failOk, autoSolve: rest,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B：flat30（ch4 sched）autoSolve 全对 3 星 + flat21（ch3）逐题
     分源真值对账（comp/compd/night 三型齐）+ flat11（ch2）tapDay 朗读 ---- */
  total++;
  startLevel(30);
  const shapeOk = cur.dch === 4 &&
    new Set(cur.quizzes.map(q => q.stype)).size === 3;            // 三问型齐
  const restB = await TC.autoSolve();
  await wait(900 * SPEED);
  const lv20 = TC.currentLevel;
  const stars30 = engStars(cur);                                  // flat30 星级（换关前算）
  startLevel(21);                                                 // flat21=ch3（三型轮换）
  let spanOk = true, sawCompd = false, sawNight = false, sawComp = false;
  for (let k = 0; k < CH_LEN; k++) {
    const q = cur.quizzes[cur.step];
    if (!q) { spanOk = false; break; }
    if (q.kind === 'comp') {
      sawComp = true;
      if (q.opts[q.answer].v !== refAnswer(q)) spanOk = false;
    } else if (q.kind === 'compd') {
      sawCompd = true;
      if (q.opts[q.answer].v !== refAnswer(q)) spanOk = false;
      let d = q.today + 1; if (d > 6) d -= 7;                     // 跨日星期分源环回
      if (q.opts[q.answer].v.indexOf(RW[d]) !== 0) spanOk = false;
    } else {
      if (q.kind !== 'night') spanOk = false;
      sawNight = true;
      if (q.opts[q.answer].v !== (12 - q.startH + q.endH) + ' 小时') spanOk = false;
    }
    await TC.tapOpt(q.answer);
  }
  const smokeOkB = shapeOk && restB.done && restB.ok && restB.quizzes === CH_LEN &&
    lv20.done && lv20.retries === 0 && stars30 === 3 && spanOk && sawCompd && sawNight && sawComp;
  if (smokeOkB) npass++;
  smokes.flat30 = { ok: smokeOkB, shapeOk: shapeOk, autoSolve: restB, stars: stars30,
    ch3Ok: spanOk, sawCompd: sawCompd, sawNight: sawNight };

  /* ---- ④b 指针角度对账（§0.43）：flat0（纯 clock5）/flat2（混出仅测 clock5 位）八题
     DOM transform rotate vs 独立计算（时针 hour%12*30+min*0.5 / 分针 min*6——5 分钟刻全域）
     + 大刻/小刻/数字各 12；非 clock5 位直接推进不测 ---- */
  total++;
  let angOk = true, m5Seen = {}, tested = 0;
  for (const fl of [0, 2]) {
    startLevel(fl);
    for (let k = 0; k < CH_LEN && cur && !cur.done; k++) {
      const q = cur.quizzes[cur.step];
      if (q.kind === 'clock5') {
        tested++;
        const hh = clockBoxEl.querySelector('.hand-h'), hm = clockBoxEl.querySelector('.hand-m');
        if (!hh || !hm) { angOk = false; break; }
        m5Seen[q.minute] = 1;
        const rotH = Number((hh.getAttribute('transform') || '').match(/rotate\(([-\d.]+)/)[1]);
        const rotM = Number((hm.getAttribute('transform') || '').match(/rotate\(([-\d.]+)/)[1]);
        const refH = (q.hour % 12) * 30 + q.minute * 0.5;         // §0.43 时针角度公式
        const refM = q.minute * 6;                                // §0.43 分针角度公式
        if (Math.abs(rotH - refH) > 0.001 || Math.abs(rotM - refM) > 0.001) { angOk = false; break; }
        const ticks = clockBoxEl.querySelectorAll('line:not(.hand)').length;
        const nums = clockBoxEl.querySelectorAll('text').length;
        if (ticks !== 24 || nums !== 12) { angOk = false; break; }  // 12 大刻+12 小刻（r16）
      }
      if ((await TC.tapOpt(q.answer)) !== (k === CH_LEN - 1 ? 'done' : 'right')) { angOk = false; break; }
      await wait(60);
    }
    if (!angOk) break;
  }
  const m5cov = Object.keys(m5Seen).length;
  if (angOk && tested >= 12) npass++; else angOk = false;
  units.angles = { ok: angOk, m5Cover: m5cov, tested: tested };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play, origS7 = KIDS.voice.say;
  const qLog7 = [], pLog7 = [], sLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  KIDS.voice.say = function (t) { sLog7.push(String(t)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → 读题 → 指钟 → demo 选卡判对 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7; KIDS.voice.say = origS7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = TC.quiz;
  const tutOk = pLog7.indexOf('tc_tut_watch') >= 0 &&                 /* 看=演示配 watch clip */
    window.__tcDemoR === 'right' &&                                  /* §0.27 演示判对真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&          /* 帮：解锁等孩子动手 */
    TC.currentLevel && TC.currentLevel.flat === 0 &&                  /* 重发同关 */
    q0t && q0t.step === 0 && q0t.miss === 0 &&                        /* 新题面初态 */
    qLog7.some(p => p.length === 1 && p[0] === 'tc_k_clock5') &&     /* 题面句 clip 化（T46：clock5 整句键） */
    pLog7.indexOf('tc_guide_clock') >= 0 &&                           /* 指钟演示句 clip（r16 clock5） */
    lastQ7 && lastQ7.length === 1 && lastQ7[0] === 'tc_tut_turn';     /* 交接链单通道 */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('tc_tut_watch') >= 0,
    demoR: window.__tcDemoR, handoff: !!lastQ7, parts: lastQ7,
    askSaid: sLog7.length, tut: state.tut };

  /* ---- ⑤ 布局：三通道（横 / 竖真 @media / 横+body.port 类）×（flat0/11/21/31）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：card-in scale(0) 起帧） ---- */
  async function simLayout(w, h, flat, forcePort) {
    startLevel(flat);
    if (forcePort) document.body.classList.add('port');           // 竖屏类通道（与 @media 逐条等值）
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 卡入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const cards = Array.prototype.slice.call(cardPoolEl.querySelectorAll('.card'));
    const cardOk = cards.length === 4 &&
      cards.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const tipOk = tipEl.getBoundingClientRect().height >= 20;      // 题面可见
    let showOk = true, portAnchor = null, anchorKind = null;
    const q = cur.quizzes[cur.step];
    if (q.kind === 'clock5' || q.kind === 'elapse' || q.kind === 'comp') {   // 时钟盘在场且够大
      const r = clockBoxEl.getBoundingClientRect();
      showOk = clockBoxEl.classList.contains('show') && r.width >= 140 && r.height >= 140;
      portAnchor = r.width;                                        // 竖屏锚：172 vs 横 196
      anchorKind = 'clock';
    } else if (q.kind === 'night') {
      const ns = Array.prototype.slice.call(nightBoxEl.querySelectorAll('.ncard'));
      showOk = nightBoxEl.classList.contains('show') && ns.length === 2 &&
        ns.every(b => { const r = b.getBoundingClientRect(); return r.width >= 96 && r.height >= 96; });
    } else if (q.kind === 'sched') {
      const rows = Array.prototype.slice.call(schedBoxEl.querySelectorAll('.srow'));
      showOk = schedBoxEl.classList.contains('show') && rows.length === q.table.length &&
        rows.every(b => { const r = b.getBoundingClientRect(); return r.height >= 44; });
    } else {                                                        // 日历条 7 块 ≥58
      const days = Array.prototype.slice.call(weekBoxEl.querySelectorAll('.wday'));
      showOk = weekBoxEl.classList.contains('show') && days.length === 7 &&
        days.every(b => { const r = b.getBoundingClientRect(); return r.width >= 58 && r.height >= 58; });
      portAnchor = days.length ? days[0].getBoundingClientRect().width : null;   // 竖屏锚 62 vs 横 64
      anchorKind = 'wday';
    }
    const cardW = cards.length ? cards[0].getBoundingClientRect().width : null;   // 竖屏锚 98 vs 横 110
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(document.getElementById('game').scrollWidth - document.getElementById('game').clientWidth,
      de.scrollWidth - de.clientWidth);
    if (forcePort) document.body.classList.remove('port');
    return { vp: (forcePort ? 'port' : w + 'x' + h), flat: flat, cardOk: cardOk, tipOk: tipOk, showOk: showOk,
      btnOk: btnOk, ox: ox, cardW: cardW, showAnchor: portAnchor, anchorKind: anchorKind,
      pass: cardOk && tipOk && showOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 11, 21, 31]) {
    sims.push(await simLayout(1280, 800, f, false));
    sims.push(await simLayout(800, 1180, f, false));
    sims.push(await simLayout(1280, 800, f, true));                 // body.port 类通道
  }
  const g0 = document.getElementById('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  /* 竖屏锚（三件套·simView 锚，按视口实况动态分档）：
     横视口：port 类通道=竖屏 CSS（卡 98/钟 172），800x1180=横屏 CSS 小尺寸模拟
     （@media 不触发：卡 110/钟 196），1280x800=横屏基准——port 与 800x1180 差异证 body.port 通道生效；
     真竖视口：三通道 @media 全触发（全 98/172），证 @media 通道在真实竖屏下生效 */
  const realPort = !!(window.matchMedia && window.matchMedia('(orientation:portrait)').matches);
  const wantCard = s => (s.vp === 'port' || realPort) ? 98 : 110;
  const wantAnchor = s => ((s.vp === 'port' || realPort)
    ? (s.anchorKind === 'clock' ? 172 : 64)
    : (s.anchorKind === 'clock' ? 196 : 64));
  const anchorOk = sims.every(s => Math.abs(s.cardW - wantCard(s)) <= 2) &&
    sims.filter(s => s.vp !== '1280x800' && s.showAnchor != null)
      .every(s => Math.abs(s.showAnchor - wantAnchor(s)) <= 0.5);
  const layoutOk = sims.length === 12 && sims.every(s => s.pass) && anchorOk;
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims, anchorOk: anchorOk };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链分型 / TTS 豁免 / 读题面 / 救援视觉 ---- */
  total++;
  /* SPEC §1+r16 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！算一算时间' &&
    VOICE.turn.text === '你来算一算' &&
    VOICE.hint.text === '想想过了几天' && VOICE.hint2.text === '看看表，算一算' &&
    VOICE.right.text === '算对啦，真棒' &&
    VOICE.wrong.text === '再想想日历' && VOICE.wrong2.text === '再想一想时间';
  /* tc_ clips 注入对账（T46 阶段2+09-19 补 8：232 条=r16 基础 7+拆段 225；core_ 3 条 §0.13） */
  const TC_KEYS = ['tc_tut_watch', 'tc_tut_turn', 'tc_hint', 'tc_hint2', 'tc_right', 'tc_wrong', 'tc_wrong2'];
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 235 && TC_KEYS.every(k => !!KIDS.voice.clips[k]) &&
    !!KIDS.voice.clips['tc_s_eve'] && !!KIDS.voice.clips['tc_num_75'];   /* tc_232+core_3 含 09-19 补 8 */
  /* 开场链分型 / 点卡值词 clip 化 / 读题面 / tapDay·tapRow 朗读 / 救援视觉（stub 记录） */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key, text) { playLog.push([String(key), text === undefined ? null : String(text)]); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链（flat0=clock5 时刻类）
  const lastQ = qLog[qLog.length - 1];
  const openChain = qLog.length >= 1 && lastQ.length === 1 && lastQ[0] === 'tc_hint2';   // 开场=[hint2] 单通道（分型）
  const qw0 = cur.quizzes[0];
  const vWrong = qw0.opts[vWrongIdx(qw0)].v;
  const vm = /^(\d+):(\d+)$/.exec(vWrong);      // clock5 错卡='h:mm' 时刻词
  const valBase = qLog.length;
  await TC.tapOpt(vWrongIdx(qw0));              // 点卡（错）→ 卡值时刻词 clip 单段链
  const valSaid = vm && qLog.slice(valBase).some(parts =>
    parts.length === 1 && parts[0] === 'tc_t_' + (+vm[1]) + '_' + (+vm[2])) &&
    !sayLog.some(t => t === vWrong);            // TTS 豁免通道退役：同值零 say 记录
  await wait(1100 * SPEED);
  /* T46 阶段2 readAsk=queue 单通道全 clip：[hint 分型 clip, ...askChain 段]——
     flat0=clock5 整句键 tc_k_clock5（原 T-M2 keyless 尾形态仅存于缺段回退分支） */
  const hearOk = readAsk() === true &&
    qLog.some(parts => parts.length === 2 && parts[0] === 'tc_hint2' && parts[1] === 'tc_k_clock5');
  startLevel(11);
  const qw10 = cur.quizzes[0];
  const dayBase = qLog.length;
  const daySaid = uiTapDay(qw10.today) === true &&                // 日历块朗读=主动学习（tc_w_ clip）
    qLog.slice(dayBase).some(parts => parts.length === 1 && parts[0] === 'tc_w_' + qw10.today) &&
    !sayLog.some(t => t === WEEK[qw10.today]);
  const baseQ = qLog.length;                                     // 段基线（按段切片）
  const readCal = readAsk() === true &&                          // 日历类题读题面=tc_hint（分型，qLog 口径）
    qLog.slice(baseQ).some(parts => parts[0] === 'tc_hint') &&
    !qLog.slice(baseQ).some(parts => parts[0] === 'tc_hint2');
  startLevel(30);
  const qw30 = cur.quizzes[0];
  const w30 = qw30.table[0];
  const rowBase = qLog.length;
  const rowSaid = TC.tapRow(0) === true &&                        // 表行朗读拆段（act+时刻+到+时刻）
    qLog.slice(rowBase).some(parts => parts.length === 4 &&
      parts[0] === 'tc_act_' + ACTS.indexOf(w30.name) &&
      parts[1] === 'tc_t_' + w30.sh + '_' + w30.sm &&
      parts[2] === 'tc_s_to' && parts[3] === 'tc_t_' + w30.eh + '_' + w30.em) &&
    !sayLog.some(t => t === w30.name + '，' + fmtTime(w30.sh, w30.sm) + '到' + fmtTime(w30.eh, w30.em));
  /* 救援视觉：方向级 kw pulse 恒给 + 答案级正确卡 breathe 仅 miss≥2（§1 梯度定案） */
  const qr10 = cur.quizzes[0];
  rescueAct(qr10);                              // miss=0 救援：只有方向级
  const kwPulsed = tipTextEl.querySelectorAll('.kw.pulse').length > 0;
  const rowsPulsed = schedBoxEl.querySelectorAll('.srow.pulse').length > 0;
  const ansB0 = cardEl(qr10.answer).classList.contains('breathe');
  await TC.tapOpt(vWrongIdx(qr10));
  await wait(1100 * SPEED);
  await TC.tapOpt(vWrongIdx(qr10));
  await wait(1100 * SPEED);                     // miss=2
  clearRescueVisual();
  rescueAct(qr10);                              // miss≥2 救援：方向级+答案级
  const kwPulsed2 = tipTextEl.querySelectorAll('.kw.pulse').length > 0;
  const ansB2 = cardEl(qr10.answer).classList.contains('breathe');
  const rescueVisOk = kwPulsed && !ansB0 && kwPulsed2 && ansB2 && TC.rescues >= 2;
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  startLevel(0);                                // 还原
  const specOk = refVoice && clipOk && openChain && valSaid && hearOk && daySaid && rowSaid && readCal && rescueVisOk;
  if (specOk) npass++;
  units.dist = { ok: specOk, refVoice: refVoice, clips: clipOk, nClips: nClips,
    openChain: openChain, valSaid: valSaid, hearOk: hearOk, daySaid: daySaid,
    rowSaid: rowSaid, readCal: readCal, rescueVisOk: rescueVisOk, rowsPulsed: rowsPulsed,
    missing: TC_KEYS.filter(k => !KIDS.voice.clips[k]) };

  /* ---- ⑧ M1 消歧义对账：span 题面文案含「不算出发那天」+from 块角标「不算」（§0.43 文案同口径）
     r16 span 移 ch2（flat10-19 轮换位 k%3==2） ---- */
  total++;
  let spanM1 = true, spanSeen = 0;
  for (const fl of [11, 12, 13, 14, 15]) {
    startLevel(fl);
    for (let k = 0; k < CH_LEN && cur && !cur.done; k++) {
      const q = cur.quizzes[cur.step];
      if (q && q.kind === 'span') {
        spanSeen++;
        if (!(tipTextEl.textContent.indexOf('不算出发那天') >= 0)) spanM1 = false;
        const fb = weekBoxEl.querySelector('.wday.from');
        if (!fb || fb.textContent.indexOf('不算') < 0) spanM1 = false;
        if ((q.to - q.from + 7) % 7 > 0 && q.to < q.from) {
          const tb = weekBoxEl.querySelector('.wday.to');
          if (!tb || tb.textContent.indexOf('下周') < 0) spanM1 = false;   /* 跨周角标 */
        }
      }
      if (k < CH_LEN - 1) { cur.step++; renderQuiz(); }      /* 引擎级跳题+重渲染（DOM 须跟题面） */
    }
  }
  startLevel(0);
  if (spanSeen > 0 && spanM1) npass++;
  units.spanM1 = { ok: spanSeen > 0 && spanM1, seen: spanSeen };

  const out = { game: 'timecalc', total: total, pass: npass, layoutOk: layoutOk,
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
