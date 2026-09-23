/* ================= ?verify=1 自检（仅 verify 分支加载执行；r15 独立第 4 script 块）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/
     章型一致（dch1 全 gather、dch2=gather 热身+4 pair、dch3/4=change/jiao 键盘型；
     静态关=循环章，生成关 dch∈1-4）/ 数值域独立审计（refRangeOk 复算，断言从 SPEC §1 r15 推导：
     ch1 价池 角{2.5,3.5,5.5,6.5,7.5}+整{3,4,6,7,8} 且 qi0/2/4 角价，币 0.5/1/5；
     ch2 两件各 2.5-9.5 元合计 8-17 元（拆型无 10 元币池 15 档/含 10 型池 10 档，qi1/2 拆 qi3/4 含 10）；
     ch3 付 10/20 价 3-18 差 2-17 整元；ch4 付 10/20 价 X.5 差 1.5-7.5 或 11.5-17.5）/
     凑钱可凑性独立 DP（refCanReach）+ 最少解币数上限（ch1 ≤4/ch2 ≤5，儿童工作记忆先验）+
     structOk / 键盘域（答案元位数 ≤2，jiao 型差恒奇半元）/ 热身（dch2 qi0=dch1 角价型；
     dch4 qi0=ch3 型）/ 同关相邻价不同
   ①b 引擎直驱：防御层（gather 期按键='again' / 键盘期提交='again' / change 期 5 角键=null）→
     凑钱：放币=探索不计 miss → 提交错 miss++/retries++ → 移除回落 → 独立解（refSolve）放齐 →
     提交 'right'/'done'；键盘：错确认 miss++ → 救援阶梯（clr/key/chip/ok）复核 → 正确键序推进；
     带 2 错通关 2 星 / 全对 3 星
   ①c 救援目标正确性：gather/pair 用独立 DP 复核（含超付态 remove）；键盘型阶梯独立复算
   ② tapCoin 单元（flat0 真实 UI）：放币 sum 推进+币 DOM .gone+篮内 .tcoin 递增+
     合计 DOM 更新（含"X元5角"角位格式）+非法面值 false+键盘期 false
   ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次）
   ③ UI 冒烟 A：flat0 真实通路通关（首题提交错一次=2 星，verify 页不弹层）
   ④ UI 冒烟 B1 flat5（ch2 买两件）：首题热身=dch1 角价型+拆 10 题（无 10 币）+autoSolve 3 星
     B2 flat10（ch3 键盘找零）：黑板 DOM+键盘真实打字通关
     B3 flat15（ch4 键盘+5 角）：首题整元热身+5 角键 DOM+缺角错一次+带角键序通关
   ⑦ 教学链（verify 直驱 tutorialWatch）：watch clip → demo 凑钱+提交 → 重发同关 →
     交接链 queue([men_tut_turn, ...题面段]) → tut='help' 解锁
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（flat0/5 凑钱期 / flat10/15 键盘期含 5 角键）
     币 ≥64、键盘键 ≥64、"给钱啦"/"算好啦"/答案显示/5 角键 ≥96 高、全按钮 ≥64（.k-parentbtn 豁免）、
     overflowX ≤0
   ⑥ 分布与专项：VOICE 表文案独立字面量对账（SPEC 定稿，含 r15 新 3 键）/ men_* 33 条 clips 注入
     clipOk / 开场顺序链（queue([men_hint, ...题面段]) 单通道）/ 四型题面段链独立复算 /
     生成关 dch 1-4 全现
   ⑧ duration（r15 门禁）：模型常量独立副本对账 + 40 关 modeled ≥40000 + levelDurMs 逐关对账 +
     每题 DECIDE≥voiceWin + 40 关最低=86900 精确（防回漂，dch3 关全 1 位答案 5×17380）
   ⑨ 源码断言：script 块数=4（verify 独立第 4 块）/ estMs·DECIDE_MS·LEVEL_MIN_MS·TAP_MS·
     CONFIRM_MS 字面 / 家族 F 实算式在场+取模推进形态绝迹 / script[2] 纯游戏逻辑
   ⑩ 键盘单元：位数上限 2（第 3 位拒收 capped）/ 首位 0 替换 / 退格·清空·5 角 toggle /
     空输入确认=miss / MN.tapKey 数字 DOM 同步
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const genDch = [0, 0, 0, 0, 0];

  /* ---- verify 侧独立复算（不调引擎生成器/生成常量，防两套逻辑同错；SPEC §1 r15 推导） ---- */
  const R_G1_HALF = [5, 7, 11, 13, 15];                    // ch1 角价（半元）2.5/3.5/5.5/6.5/7.5
  const R_G1_INT = [6, 8, 12, 14, 16];                     // ch1 整价 3/4/6/7/8
  const R_SPLIT = [16, 17, 18, 20, 21, 22, 23, 24, 25, 26, 30, 31, 32, 33, 34];   // ch2 拆型合计（8-17 元缺 14 档）
  const R_TEN = [24, 25, 26, 27, 28, 30, 31, 32, 33, 34];  // ch2 含 10 型合计（12-17 元缺 14.5 档）
  function refCanReach(avail, target) {                    // 独立子集和 DP
    if (target < 0) return false;
    const dp = new Array(target + 1).fill(false);
    dp[0] = true;
    for (const v of avail) for (let t = target; t >= v; t--) if (dp[t - v]) dp[t] = true;
    return !!dp[target];
  }
  function refMinCoins(avail, target) {                    // 独立最少解币数 DP
    if (target < 0) return 99;
    const INF = 99;
    const dp = new Array(target + 1).fill(INF);
    dp[0] = 0;
    for (const v of avail) for (let t = target; t >= v; t--) if (dp[t - v] + 1 < dp[t]) dp[t] = dp[t - v] + 1;
    return dp[target];
  }
  function refSolve(coins, target) {                       // 独立 DFS 找一个子集解
    const pick = [];
    const dfs = (start, left) => {
      if (left === 0) return true;
      if (left < 0 || start >= coins.length) return false;
      for (let i = start; i < coins.length; i++) {
        pick.push(i);
        if (dfs(i + 1, left - coins[i])) return true;
        pick.pop();
      }
      return false;
    };
    return dfs(0, target) ? pick.slice() : null;
  }
  function refRangeOk(dch, qi, q) {
    if (q.kind === 'gather' || q.kind === 'pair') {
      const P = q.price;
      if (!Array.isArray(q.coins) || q.coins.length < 3 || q.coins.length > 7) return false;
      if (q.coins.reduce((s, v) => s + v, 0) < P) return false;
      if (q.kind === 'gather') {
        if (dch !== 1 && !(dch === 2 && qi === 0)) return false;      // gather 只在 ch1/ch2 热身
        const half = P % 2 === 1;
        if ((half ? R_G1_HALF : R_G1_INT).indexOf(P) < 0) return false;
        if (q.coins.some(v => v !== 1 && v !== 2 && v !== 10)) return false;   // 币 0.5/1/5 元
        if (dch === 1 && ((qi % 2 === 0) !== half)) return false;      // qi0/2/4 角价（起步含五角）
        return refMinCoins(q.coins, P) <= 4 && refCanReach(q.coins, P);
      }
      if (dch !== 2 || qi === 0) return false;                         // pair 只在 ch2 qi1-4
      if (q.priceA + q.priceB !== P) return false;
      if (q.priceA < 5 || q.priceA > 19 || q.priceB < 5 || q.priceB > 19) return false;   // 各 2.5-9.5 元
      const hasTen = q.coins.indexOf(20) >= 0;
      if ((hasTen ? R_TEN : R_SPLIT).indexOf(P) < 0) return false;
      if ((qi <= 2) === hasTen) return false;                          // qi1/2 拆型无 10 币 / qi3/4 含 10 币
      return refMinCoins(q.coins, P) <= 5 && refCanReach(q.coins, P);
    }
    if (q.kind === 'change') {
      if (dch !== 3 && !(dch === 4 && qi === 0)) return false;         // 整元键盘：ch3（含 ch4 热身）
      if (q.pay !== 20 && q.pay !== 40) return false;                  // 付 10/20 元
      if (q.price % 2 !== 0 || q.price < 6 || q.price > 36) return false;   // 整元价 3-18
      if (q.pay === 20 && q.price > 16) return false;                  // 付 10 → 价 3-8
      if (q.ans !== q.pay - q.price || q.ans < 4 || q.ans > 34) return false;   // 差 2-17
      return String(q.ans / 2).length <= 2;                           // 键盘位数域
    }
    if (q.kind === 'jiao') {                                            // 带角键盘：ch4 qi1-4
      if (dch !== 4 || qi === 0) return false;
      if (q.pay !== 20 && q.pay !== 40) return false;
      if (q.price % 2 === 0 || q.price < 5 || q.price > 17) return false;   // 价 X.5（X∈2-8）
      if (q.ans !== q.pay - q.price) return false;
      if (q.pay === 20 && (q.ans < 3 || q.ans > 15)) return false;     // 差 1.5-7.5
      if (q.pay === 40 && (q.ans < 23 || q.ans > 35)) return false;    // 差 11.5-17.5
      return String(Math.floor(q.ans / 2)).length <= 2;
    }
    return false;
  }
  const wrongDigitsOf = ansY => String((Number(ansY) + 1) % 18 + 1);   // 1-18 域内恒 ≠ansY

  /* ---- ① 40 关全量审计 + ①b 引擎直驱 + ①c 救援目标复核（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    let rangeAll = true, kindAll = true, warmOk = true, adjOk = true,
        structAll = true, driveOk = true, rescueOk = true;
    let prevP = -1;
    if (flat < STATIC_LEVELS && L1.dch !== diffOfCh(chOfFlat(flat))) rangeAll = false;  // 静态关=循环章
    if (L1.dch < 1 || L1.dch > 4) rangeAll = false;
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    const wantKind = (dch, qi) => dch === 1 ? 'gather'
      : dch === 2 ? (qi === 0 ? 'gather' : 'pair')
      : dch === 3 ? 'change' : (qi === 0 ? 'change' : 'jiao');
    L1.quizzes.forEach((q, qi) => {
      if (q.kind !== wantKind(L1.dch, qi)) kindAll = false;             // 章型一致（热身=前章型）
      if (!refRangeOk(L1.dch, qi, q)) rangeAll = false;
      if (!structOk(q)) structAll = false;
      if (q.price === prevP) adjOk = false;                            // 相邻价不同
      prevP = q.price;
    });
    if (L1.dch === 2) {                                                // 热身=dch1 角价型
      const w = L1.quizzes[0];
      warmOk = w.warm === true && w.kind === 'gather' && R_G1_HALF.indexOf(w.price) >= 0 && !w.coins.some(v => v === 20);
    } else if (L1.dch === 4) {                                         // 热身=ch3 型
      const w = L1.quizzes[0];
      warmOk = w.warm === true && w.kind === 'change' && w.price % 2 === 0 && w.ans === w.pay - w.price;
    } else warmOk = L1.quizzes[0].warm === false;

    /* 引擎直驱（retries 为关级累计：断言一律用题内增量，base=本题起始 retries） */
    const Ld = genLevel(flat);
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const base = Ld.retries;
      if (q.kind === 'gather' || q.kind === 'pair') {
        if (engKey(Ld, '5') !== 'again') driveOk = false;              // gather 期按键=防御层
        if (engConfirm(Ld) !== 'again') driveOk = false;               // gather 期确认=防御层
        const sol = refSolve(q.coins, q.price);
        if (!sol) { driveOk = false; break; }
        /* 放一枚"不在本解内"的币=探索：miss/retries 零增量（错币不计数） */
        const extraIdx = q.coins.findIndex((v, i) => sol.indexOf(i) < 0);
        if (extraIdx >= 0) {
          if (engTapCoin(Ld, extraIdx) === null) driveOk = false;
          if (q.miss !== 0 || Ld.retries !== base) driveOk = false;    // 探索零计数
          if (engTapTray(Ld, 0) === null) driveOk = false;             // 移除回落
        }
        if (engOK(Ld) !== 'wrong' || q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;  // 不满提交=miss 恰一次
        if (engTapCoin(Ld, 99) !== null || engTapCoin(Ld, 0.5) !== null) driveOk = false; // 非法下标
        let sum = 0;
        for (const i of sol) { const r = engTapCoin(Ld, i); if (r === null) { driveOk = false; break; } sum = r; }
        if (driveOk && sum !== q.price) driveOk = false;                // 解放齐=价
        const rt = rescueTarget(q);                                    // 篮内=解即待提交态
        if (!rt || rt.act !== 'ok') rescueOk = false;
        if (engOK(Ld) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) driveOk = false;
      } else {
        const ansY = String(Math.floor(q.ans / 2));
        const wd = ansY[0] === '9' ? '8' : '9';                        // 单位错值：恒非前缀恒错（域 ≤17）
        if (engOK(Ld) !== 'again') driveOk = false;                    // 键盘期提交币=防御层
        if (engTapCoin(Ld, 0) !== null || engTapTray(Ld, 0) !== null) driveOk = false;  // 键盘期币路径防御
        if (q.kind === 'change' && engKey(Ld, 'jiao') !== null) driveOk = false;   // 整元章 5 角键拒收
        let rt0 = rescueTarget(q);                                     // 阶梯①空输入→指首位正确键
        if (!rt0 || rt0.act !== 'key' || rt0.k !== ansY[0]) rescueOk = false;
        if (ansY.length === 2) {                                       // 阶梯②前缀→指下一位
          engKey(Ld, ansY[0]);
          const rt1 = rescueTarget(q);
          if (!rt1 || rt1.act !== 'key' || rt1.k !== ansY[1]) rescueOk = false;
        }
        engKey(Ld, wd);                                                // 阶梯③非前缀→指清空键
        const rt2 = rescueTarget(q);
        if (!rt2 || rt2.act !== 'clr') rescueOk = false;
        if (engConfirm(Ld) !== 'wrong' || q.miss !== 1 || Ld.retries !== base + 1) driveOk = false;  // 错确认=miss 恰一次
        engKey(Ld, 'clr');
        if (engConfirm(Ld) !== 'wrong' || q.miss !== 2 || Ld.retries !== base + 2) driveOk = false;  // 空输入确认=miss（与空篮提交同口径）
        for (const ch of ansY) engKey(Ld, ch);
        if (q.kind === 'jiao') {
          const rt3 = rescueTarget(q);                                 // 阶梯④元位齐缺角→指 5 角键
          if (!rt3 || rt3.act !== 'chip') rescueOk = false;
          engKey(Ld, 'jiao');
        }
        const rt4 = rescueTarget(q);                                   // 阶梯⑤全对→指确认
        if (!rt4 || rt4.act !== 'ok') rescueOk = false;
        if (engConfirm(Ld) !== (k === Ld.quizzes.length - 1 ? 'done' : 'right')) driveOk = false;
      }
    }
    /* 救援目标复核二：歧途篮（超付态）→ remove 指引可行（gather 型关；键盘关跳过） */
    const Lr = genLevel(flat);
    const qr = Lr.quizzes.find(q => q.kind === 'gather' || q.kind === 'pair');
    if (qr) {
      const sol = refSolve(qr.coins, qr.price);
      const extraIdx = qr.coins.findIndex((v, i) => sol.indexOf(i) < 0);
      if (extraIdx >= 0) engTapCoin(Lr, extraIdx);                     // 放一枚多余币（sum≠价）
      const rt2 = rescueTarget(qr);
      if (!rt2 || (rt2.act === 'add' && !refCanReach(
            qr.coins.filter((v, i) => i !== rt2.i && !qr._taken[i]), qr.price - sumOf(qr) - qr.coins[rt2.i]))) rescueOk = false;
      if (rt2 && rt2.act === 'remove') {
        const ci = qr._tray[rt2.j];
        const rest = qr.coins.filter((v, i) => !qr._taken[i] || i === ci);
        if (!refCanReach(rest, qr.price - (sumOf(qr) - qr.coins[ci]))) rescueOk = false;
      }
    }
    /* 星级三档独立驱动：Ld=每题一错（更多=1★）/ L2x=仅首题一错（1-2 错=2★）/ L3=全对（0 错=3★） */
    const solveKeys = (Lx, q) => {
      engKey(Lx, 'clr');
      for (const ch of String(Math.floor(q.ans / 2))) engKey(Lx, ch);
      if (q.ans % 2 === 1) engKey(Lx, 'jiao');
      return engConfirm(Lx);
    };
    const s1 = Ld.done && Ld.retries >= 3 && engStars(Ld) === 1;
    const L2x = genLevel(flat);
    let g2 = 0;
    while (!L2x.done && g2++ < 30) {
      const q = L2x.quizzes[L2x.step];
      if (q.kind === 'gather' || q.kind === 'pair') {
        if (L2x.step === 0) engOK(L2x);                 // 仅首题空篮错一次
        refSolve(q.coins, q.price).forEach(i => engTapCoin(L2x, i));
        engOK(L2x);
      } else {
        if (L2x.step === 0) { const wd = String(Math.floor(q.ans / 2))[0] === '9' ? '8' : '9';
          engKey(L2x, wd); engConfirm(L2x); }         // 仅首题键盘错一次
        solveKeys(L2x, q);
      }
    }
    const s2 = L2x.done && L2x.retries === 1 && engStars(L2x) === 2;
    const L3 = genLevel(flat);
    let guard = 0;
    while (!L3.done && guard++ < 30) {
      const q = L3.quizzes[L3.step];
      if (q.kind === 'gather' || q.kind === 'pair') {
        refSolve(q.coins, q.price).forEach(i => engTapCoin(L3, i));
        engOK(L3);
      } else solveKeys(L3, q);
    }
    const s3 = L3.done && L3.retries === 0 && engStars(L3) === 3;
    if (!s1 || !s2 || !s3) driveOk = false;
    const ok = det && L1.quizzes.length === CH_LEN && rangeAll && kindAll && warmOk &&
      adjOk && structAll && driveOk && rescueOk;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, rangeAll: rangeAll, kindAll: kindAll,
      warmOk: warmOk, adjOk: adjOk, structAll: structAll, driveOk: driveOk, rescueOk: rescueOk,
      stars: { many1: engStars(Ld), wrong1: engStars(L2x), clean: engStars(L3) },
      qs: L1.quizzes.map(q => (q.kind === 'gather' || q.kind === 'pair')
        ? q.kind[0] + (q.price / 2) + '[' + q.coins.map(c => c / 2).join(',') + ']'
        : q.kind[0] + (q.pay / 2) + '-' + fmtTxt(q.price) + '=' + fmtTxt(q.ans)) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapCoin 单元（flat0 真实 UI 状态机）：合计 DOM 同步实时 + 币 gone/篮内币落地 ---- */
  total++;
  startLevel(0);
  const q0 = MN.quiz;
  const sol0 = refSolve(q0 ? q0.coins.map(Y) : [], q0 ? Y(q0.price) : 0);   // 钩子元 → 半元
  const taps = [];
  let domOk = true;
  for (const v of (sol0 ? sol0.map(i => q0.coins[i]) : [])) {              // 按解逐枚点（钩子面值）
    const before = MN.quiz.sum;
    const r = MN.tapCoin(v);
    taps.push(r);
    if (r !== before + v) domOk = false;                                    // 返回新合计（元）
    if (coinTrayEl.querySelectorAll('.coin.gone').length !== taps.length) domOk = false;  // 币 .gone 同步
    const sTxt = MN.quiz.sum;
    const sumB = sumboxEl.querySelector('b').textContent;
    if (sTxt % 1 === 0.5) {                                                 // 角位合计="X元5角"格式（禁小数连写）
      if (sumB !== String(Math.floor(sTxt))) domOk = false;
      if (!sumboxEl.querySelector('.j5')) domOk = false;
    } else if (sumB !== String(sTxt)) domOk = false;                        // 合计 DOM 实时（同步渲染）
  }
  await wait(620 * SPEED);                                                   // 等飞行落地篮内币渲染
  const tkN = basketEl.querySelectorAll('.tcoin').length;
  if (tkN !== taps.length) domOk = false;                                   // 篮内币=已放枚数
  const sumDone = MN.quiz.sum === q0.price && MN.quiz.miss === 0 && MN.currentLevel.retries === 0;
  const badVal = MN.tapCoin(7) === false && MN.tapCoin(0) === false;        // 非法面值（无 7 元/0 元币）
  const selfOk = taps.every(t => typeof t === 'number') && domOk && sumDone && badVal;
  if (selfOk) npass++;
  units.tapCoin = { ok: selfOk, taps: taps, sum: MN.quiz ? MN.quiz.sum : null,
    domOk: domOk, tkN: tkN, badVal: badVal, coins: q0.coins, sol: sol0 };

  /* ---- ②b sayW 三态（flat<3 每错必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  total++;
  const wLog = [];
  const origPlay2 = KIDS.voice.play;
  KIDS.voice.play = function (key, text) { wLog.push([key, String(text).slice(0, 4)]); };
  const wrongPlays = () => wLog.filter(p => p[0] === 'men_wrong').length;
  const gatherSome = async () => {                        // 放 1 枚币（不满价，供提交错）
    const q = MN.quiz;
    if (q && (q.kind === 'gather' || q.kind === 'pair')) MN.tapCoin(q.coins[0]);
  };
  startLevel(0);                                          // flat0：每错必播
  await gatherSome();
  await MN.tapOK();
  await MN.tapOK();
  const sayA = wrongPlays();                              // → 2
  startLevel(3);                                          // flat3：10s 节流
  await gatherSome();
  lastWrongVoice = Date.now();                            /* 显式进入节流窗口内 */
  await MN.tapOK();                                       // miss=1 窗口内 → 节流不播
  const sayB = wrongPlays() - 2;                          // 增量 → 0
  startLevel(3);                                          // 同关重发 fresh quiz：miss===2 force 豁免
  await gatherSome();
  lastWrongVoice = 0;                                     /* 隔离上一子用例时间戳 */
  await MN.tapOK();                                       // miss=1 → 播（10s 窗口外）
  await MN.tapOK();                                       // miss=2 → force === 2 → 播
  const sayC = wrongPlays() - 2 - sayB;                   // 增量 → 2
  KIDS.voice.play = origPlay2;
  const sayWOk = sayA === 2 && sayB === 0 && sayC === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0Plays: sayA, flat3Throttle: sayB, flat3Force: sayC };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题提交错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk = false, quizzesA = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = MN.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                                        // 首错：篮晃动零惩罚可调整；首错不 pulse
      MN.tapCoin(q.coins[0]);                             // 放 1 枚（合计≠价）
      const r = await MN.tapOK();
      const wig = basketEl.classList.contains('wig');
      const payOk = !!payBtnEl() && getComputedStyle(payBtnEl()).pointerEvents !== 'none';
      const alive = coinTrayEl.querySelector('.coin:not(.gone)');
      const coinOk = !!alive && getComputedStyle(alive).pointerEvents !== 'none';   /* 不灰化：币仍可点 */
      wrongOk = r === 'wrong' && wig && payOk && coinOk &&
        MN.currentLevel.retries === 1 && MN.currentLevel.step === 0 &&
        !sumboxEl.classList.contains('ok');
      MN.tapTray(0);                                      // 移除回落（零惩罚可调整）
      if (MN.quiz.sum !== 0) smokeA = false;
    }
    const q2 = MN.quiz;
    const sol = refSolve(q2.coins.map(Y), Y(q2.price));
    for (const i in sol) MN.tapCoin(q2.coins[sol[i]]);
    const r = await MN.tapOK();
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) smokeA = false;
    quizzesA++;
  }
  const lvA = MN.currentLevel;
  const smokeOkA = smokeA && wrongOk && quizzesA === CH_LEN && lvA.done && lvA.won &&
    lvA.retries === 1 && engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk, quizzes: quizzesA,
    retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat5（ch2 买两件）首题热身=dch1 角价型+拆 10 题+autoSolve 3 星 ---- */
  total++;
  startLevel(5);
  const L5 = genLevel(5);
  const warm5 = cur.dch === 2 && L5.quizzes[0].warm && L5.quizzes[0].kind === 'gather' &&
    R_G1_HALF.indexOf(L5.quizzes[0].price) >= 0 && !L5.quizzes[0].coins.some(v => v === 20);
  const splitN = L5.quizzes.filter(q => (q.kind === 'gather' || q.kind === 'pair') && !q.coins.some(v => v === 20)).length;
  const splitOk = splitN >= 3;                            // qi0 热身+qi1/2 拆 10 ≥3 题无 10 币
  const pairN = L5.quizzes.filter(q => q.kind === 'pair').length;
  const pairSumOk = L5.quizzes.filter(q => q.kind === 'pair')
    .every(q => q.priceA + q.priceB === q.price);
  const a5 = await MN.autoSolve();
  const lv5 = MN.currentLevel;
  const smokeOkB1 = warm5 && splitOk && pairN === 4 && pairSumOk && a5.done && lv5.done && lv5.won &&
    lv5.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat5 = { ok: smokeOkB1, warm: warm5, splitN: splitN, pairN: pairN, picks: a5.picks, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat10（ch3 键盘找零）黑板 DOM+键盘打字通关 ---- */
  total++;
  startLevel(10);
  const q10 = genLevel(10).quizzes[0];
  const chalkEl = document.getElementById('chalk');
  const boardOk = cur.dch === 3 && !!chalkEl &&
    chalkEl.textContent.indexOf('付了') >= 0 && chalkEl.textContent.indexOf('买了') >= 0 &&
    chalkEl.textContent.indexOf(String(fmtYuan(q10.pay))) >= 0;
  const kbOk0 = keypadEl.classList.contains('show') && !!$id('confirm-btn') && !$id('jiao-chip');
  let playB2 = true, quizzesB = 0;
  for (let s = 0; s < CH_LEN && playB2; s++) {
    const q = MN.quiz;
    if (!q || q.kind !== 'change') { playB2 = false; break; }
    MN.tapKey('clr');
    for (const ch of String(q.answer)) MN.tapKey(ch);       // q.answer=元数值（整数）
    const r = await MN.tapConfirm();
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB2 = false;
    quizzesB++;
  }
  const lv10 = MN.currentLevel;
  const smokeOkB2 = boardOk && kbOk0 && playB2 && quizzesB === CH_LEN && lv10.done && lv10.won &&
    lv10.retries === 0 && engStars(cur) === 3;
  if (smokeOkB2) npass++;
  smokes.flat10 = { ok: smokeOkB2, board: boardOk, kb: kbOk0, quizzes: quizzesB, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B3：flat15（ch4 键盘+5 角）首题整元热身+5 角键+缺角错一次+通关 ---- */
  total++;
  startLevel(15);
  const L15 = genLevel(15);
  const warm15 = cur.dch === 4 && L15.quizzes[0].warm && L15.quizzes[0].kind === 'change';
  const noChip0 = !$id('jiao-chip');                        // 首题（整元热身）无 5 角键
  MN.tapKey('clr');
  for (const ch of String(MN.quiz.answer)) MN.tapKey(ch);
  await MN.tapConfirm();                                    // 进第二题（带角）
  const jq = MN.quiz;
  const chipOk = jq.kind === 'jiao' && !!$id('jiao-chip') && keypadEl.classList.contains('show');
  MN.tapKey('clr');
  for (const ch of String(Math.floor(jq.answer))) MN.tapKey(ch);   // 只输元位（缺角）
  const rJ = await MN.tapConfirm();                         // → wrong（角位缺失=miss）
  const missJ = MN.quiz ? MN.quiz.miss : -1;
  let playB3 = true, quizzesC = 0;
  for (let s = 1; s < CH_LEN && playB3; s++) {
    const q = MN.quiz;
    if (!q) { playB3 = false; break; }
    MN.tapKey('clr');
    for (const ch of String(Math.floor(q.answer))) MN.tapKey(ch);
    if (q.answer % 1 === 0.5) MN.tapKey('jiao');            // 差含 5 角→5 角键
    const r = await MN.tapConfirm();
    if (r !== (s === CH_LEN - 1 ? 'done' : 'right')) playB3 = false;
    quizzesC++;
  }
  const lv15 = MN.currentLevel;
  const smokeOkB3 = warm15 && noChip0 && chipOk && rJ === 'wrong' && missJ === 1 && playB3 &&
    quizzesC === CH_LEN - 1 && lv15.done && lv15.won && lv15.retries === 1 && engStars(cur) === 2;
  if (smokeOkB3) npass++;
  smokes.flat15 = { ok: smokeOkB3, warm: warm15, chip: chipOk, missJiao: missJ, quizzes: quizzesC, stars: engStars(cur) };

  /* ---- ⑦ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const origQ7 = KIDS.voice.queue, origP7 = KIDS.voice.play;
  const qLog7 = [], pLog7 = [];
  KIDS.voice.queue = function (parts) { qLog7.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog7.push(String(key)); };
  startLevel(0);
  await tutorialWatch();                        // 看：watch clip → demo 凑钱+提交 → 重发同关 → 帮
  KIDS.voice.queue = origQ7; KIDS.voice.play = origP7;
  const lastQ7 = qLog7[qLog7.length - 1];
  const q0t = MN.quiz;
  const tutOk = pLog7.indexOf('men_tut_watch') >= 0 &&                    /* 看=演示配 watch clip */
    state.tut === 'help' && !state.demo && !state.locked &&               /* 帮：解锁等孩子动手 */
    MN.currentLevel && MN.currentLevel.flat === 0 &&                      /* 重发同关 */
    MN.quiz && MN.quiz.step === 0 && MN.quiz.sum === 0 &&                 /* 新题面空篮初态 */
    lastQ7 && lastQ7.length === 4 && lastQ7[0] === 'men_tut_turn' &&      /* 交接顺序链单通道 */
    lastQ7[1].key === 'men_q_buy' && lastQ7[2].key === 'men_n_' + Math.floor(q0t.price) &&
    lastQ7[3].key === 'men_q_buy_j';                                      /* flat0 qi0=角价→buyj 尾句 */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog7.indexOf('men_tut_watch') >= 0,
    handoff: !!lastQ7, parts: lastQ7, tut: state.tut, sum: q0t ? q0t.sum : null };

  /* ---- ⑤ 布局：双 viewport ×（flat0/5 凑钱期 / flat10/15 键盘期含 5 角键）
     量测前等入场 stagger 动画结束（§0.11 transform 中途陷阱：coin-in scale(0) 起帧） ---- */
  async function simGather(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 币入场动画 .4s+delay .12s（真实 ms，不吃 SPEED）
    const de = document.documentElement;
    const q = cur.quizzes[cur.step];
    const coins = Array.prototype.slice.call(coinTrayEl.querySelectorAll('.coin'));
    const coinOk = coins.length === q.coins.length &&
      coins.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const tks = Array.prototype.slice.call(basketEl.querySelectorAll('.tcoin'));
    const tkOk = tks.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const pb = payBtnEl();
    const payOk = !!pb && pb.getBoundingClientRect().height >= 96;
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, phase: 'gather', coinOk: coinOk, tkOk: tkOk,
      payOk: payOk, btnOk: btnOk, ox: ox, pass: coinOk && tkOk && payOk && btnOk && ox <= 0 };
  }
  async function simKeyboard(w, h, flat) {
    startLevel(flat);
    if (flat === 15) {                          // flat15 首题=整元热身：打进 jiao 题量 5 角键
      MN.tapKey('clr');
      for (const ch of String(MN.quiz.answer)) MN.tapKey(ch);
      await MN.tapConfirm();
    }
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    await wait(620);                            // 键入场动画结束再量（§0.11）
    const de = document.documentElement;
    const keys = Array.prototype.slice.call(keypadEl.querySelectorAll('.key'));
    const keyOk = keys.length === 12 && keypadEl.classList.contains('show') &&
      keys.every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
    const disp = $id('ans-display'), cb = confirmBtnEl(), jc = $id('jiao-chip');
    const dispOk = !!disp && disp.getBoundingClientRect().height >= 96;
    const confOk = !!cb && cb.getBoundingClientRect().height >= 96;
    const chipOk = flat === 15 ? (!!jc && jc.getBoundingClientRect().width >= 96) : !jc;
    let btnOk = true;
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, phase: 'keyboard', keyOk: keyOk, dispOk: dispOk,
      confOk: confOk, chipOk: chipOk, btnOk: btnOk, ox: ox,
      pass: keyOk && dispOk && confOk && chipOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 5]) {                     // gather 型章量币+提交钮
    sims.push(await simGather(1280, 800, f));
    sims.push(await simGather(800, 1180, f));
  }
  for (const f of [10, 15]) {                   // 键盘型章量键盘+显示+5 角键+确认
    sims.push(await simKeyboard(1280, 800, f));
    sims.push(await simKeyboard(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.length === 8 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：文案对账 / clip 注入 / 开场链 / 四型题面段链 / 生成关章覆盖 ---- */
  total++;
  /* SPEC §1 r15 定稿文案独立字面量（manifest 一致，禁改） */
  const refVoice = VOICE.watch.text === '看！钱币点一点' &&
    VOICE.turn.text === '你来付一付' && VOICE.hint.text === '算一算，正好的钱' &&
    VOICE.qbuy.text === '买' && VOICE.qbuy2.text === '元的东西，点出正好的钱' &&
    VOICE.buyj.text === '元五角的东西，点出正好的钱' &&
    VOICE.and.text === '元的和' && VOICE.andj.text === '元五角的和' &&
    VOICE.qpay.text === '付了' && VOICE.qpay2.text === '元，买' &&
    VOICE.qpay3.text === '元的东西，找回几元呀' && VOICE.qjiao.text === '元五角的东西，找回几元呀' &&
    VOICE.wrong.text === '再想一想，算一算多少钱';
  const numCnOk = numCn(3) === '三' && numCn(10) === '十' && numCn(13) === '十三' && numCn(20) === '二十';
  /* men_* 全部 33 条 clips 注入对账（build 注入后 KIDS.voice.clips 应含全部） */
  const MEN_KEYS = ['men_tut_watch', 'men_tut_turn', 'men_hint', 'men_wrong',
    'men_q_buy', 'men_q_buy2', 'men_q_buy_j', 'men_q_and', 'men_q_and_j',
    'men_q_pay', 'men_q_pay2', 'men_q_pay3', 'men_q_jiao']
    .concat(Array.from({ length: 20 }, (_, i) => 'men_n_' + (i + 1)));
  const clipOk = MEN_KEYS.every(k => !!KIDS.voice.clips[k]);
  /* 开场顺序链（stub 记录）：queue([men_hint, ...题面段]) 单通道不叠音 */
  const origQ = KIDS.voice.queue, origP = KIDS.voice.play, origS = KIDS.voice.say;
  const qLog = [], playLog = [], sayLog = [];
  KIDS.voice.queue = function (parts) { qLog.push(parts.slice()); };
  KIDS.voice.play = function (key) { playLog.push(String(key)); };
  KIDS.voice.say = function (t) { sayLog.push(String(t)); };
  startLevel(0);                                // verify 页恒走开场链
  const lastQ = qLog[qLog.length - 1];
  const q0v = genLevel(0).quizzes[0];
  const openChain = qLog.length >= 1 && lastQ.length === 4 && lastQ[0] === 'men_hint' &&
    lastQ[1].key === 'men_q_buy' && lastQ[2].key === 'men_n_' + Math.floor(q0v.price / 2) &&
    lastQ[3].key === 'men_q_buy_j';             /* flat0 qi0=角价（起步含五角）→ buyj 尾句 */
  /* pair 题面 5 段链（flat5 qi1=pair）——独立复算段 key 序 */
  const q5v = genLevel(5).quizzes[1];
  const parts5 = quizParts(q5v);
  const pairChain = q5v.kind === 'pair' && parts5.length === 5 &&
    parts5[0].key === 'men_q_buy' &&
    parts5[1].key.indexOf('men_n_') === 0 &&
    (parts5[2].key === 'men_q_and' || parts5[2].key === 'men_q_and_j') &&
    parts5[3].key.indexOf('men_n_') === 0 &&
    (parts5[4].key === 'men_q_buy2' || parts5[4].key === 'men_q_buy_j') &&
    parts5.every(p => !!KIDS.voice.clips[p.key]);
  /* ch4 带角题面（6 段文案 5 段 clip 含 men_q_jiao 整条尾句）——flat15 第二题 */
  const q15v = genLevel(15).quizzes[1];
  const parts15 = quizParts(q15v);
  const jiaoChain = q15v.kind === 'jiao' && q15v.price % 2 === 1 && parts15.length === 5 &&
    parts15[0].key === 'men_q_pay' && parts15[1].key === 'men_n_' + (q15v.pay / 2) &&
    parts15[2].key === 'men_q_pay2' && parts15[3].key.indexOf('men_n_') === 0 &&
    parts15[4].key === 'men_q_jiao' &&
    parts15.every(p => !!KIDS.voice.clips[p.key]);                        // 全段 clip 在场（§0.23）
  /* ch3 整元题面 5 段（qpay3 尾句）——flat10 第一题 */
  const q10v = genLevel(10).quizzes[0];
  const parts10 = quizParts(q10v);
  const changeChain = q10v.kind === 'change' && parts10.length === 5 &&
    parts10[4].key === 'men_q_pay3' &&
    parts10.every(p => !!KIDS.voice.clips[p.key]);
  speakQuiz(q0v);                               // 救援/重听拼句：题面 3 段（clip 在场走 queue）
  const lastQ2 = qLog[qLog.length - 1];
  const rescueChain = qLog.length >= 2 && lastQ2 !== lastQ && lastQ2.length === 3 &&
    lastQ2[0] === 'men_q_buy' && lastQ2[2] === 'men_q_buy_j';
  KIDS.voice.queue = origQ; KIDS.voice.play = origP; KIDS.voice.say = origS;
  const distOk = refVoice && numCnOk && clipOk && openChain && pairChain && jiaoChain &&
    changeChain && rescueChain &&
    genDch[1] >= 1 && genDch[2] >= 1 && genDch[3] >= 1 && genDch[4] >= 1;   /* 生成关随机章全覆盖 */
  if (distOk) npass++;
  units.dist = { ok: distOk, refVoice: refVoice, numCn: numCnOk, clips: clipOk,
    openChain: openChain, pairChain: pairChain, jiaoChain: jiaoChain,
    changeChain: changeChain, rescueChain: rescueChain, genDch: genDch };

  /* ---- ⑧ duration（r15 门禁）：模型常量对账 + 40 关 modeled ≥40000 + 独立副本逐关对账 +
     每题 DECIDE≥voiceWin + 最低精确值防回漂 ---- */
  total++;
  const estMsV = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）
  const V_DECIDE = { gather: 12000, pair: 15000, change: 13000, jiao: 16000 };   /* 独立副本常量（禁引引擎） */
  const V_TAP = 1500, V_CONF = 2000, V_ADV = 880, V_MIN = 40000, V_ENTER = 400, V_TAIL = 300;
  const V_TXT = { qbuy: '买', qbuy2: '元的东西，点出正好的钱', buyj: '元五角的东西，点出正好的钱',
    and: '元的和', andj: '元五角的和', qpay: '付了', qpay2: '元，买',
    qpay3: '元的东西，找回几元呀', qjiao: '元五角的东西，找回几元呀' };   /* 独立文案副本（与 ⑥ 对账交叉） */
  const vSpeech = q => {                          // 独立拼句（镜像 quizParts，禁调 data 函数）
    const nc = n => n <= 20 ? [,'一','二','三','四','五','六','七','八','九','十','十一','十二','十三',
      '十四','十五','十六','十七','十八','十九','二十'][n] : String(n);
    if (q.kind === 'gather') {
      const h = q.price % 2 === 1;
      return V_TXT.qbuy + nc((q.price - (h ? 1 : 0)) / 2) + (h ? V_TXT.buyj : V_TXT.qbuy2);
    }
    if (q.kind === 'pair') {
      const ha = q.priceA % 2 === 1, hb = q.priceB % 2 === 1;
      return V_TXT.qbuy + nc((q.priceA - (ha ? 1 : 0)) / 2) + (ha ? V_TXT.andj : V_TXT.and) +
        nc((q.priceB - (hb ? 1 : 0)) / 2) + (hb ? V_TXT.buyj : V_TXT.qbuy2);
    }
    const h = q.price % 2 === 1;
    return V_TXT.qpay + nc(q.pay / 2) + V_TXT.qpay2 + nc((q.price - (h ? 1 : 0)) / 2) +
      (h ? V_TXT.qjiao : V_TXT.qpay3);
  };
  const vMinCoins = (avail, target) => {          // 独立最少币数 DP（nInput 复算）
    if (target < 0) return 0;
    const INF = 99;
    const dp = new Array(target + 1).fill(INF);
    dp[0] = 0;
    for (const v of avail) for (let t = target; t >= v; t--) if (dp[t - v] + 1 < dp[t]) dp[t] = dp[t - v] + 1;
    return dp[target] >= INF ? 0 : dp[target];
  };
  const vNInput = q => (q.kind === 'gather' || q.kind === 'pair')
    ? vMinCoins(q.coins, q.price)
    : String(Math.floor(q.ans / 2)).length + (q.kind === 'jiao' ? 1 : 0);
  const vDur = L => L.quizzes.reduce((s, q) =>
    s + Math.max(V_ENTER + estMsV(vSpeech(q)) + V_TAIL, V_DECIDE[q.kind]) + vNInput(q) * V_TAP + V_CONF + V_ADV, 0);
  let dMin = Infinity, dFlat = -1, parityOk = true, voiceOkD = true, speechParity = true;
  for (let flat = 0; flat < 40; flat++) {
    const L = genLevel(flat);
    const d = vDur(L);
    if (d < dMin) { dMin = d; dFlat = flat; }
    if (levelDurMs(L) !== d) parityOk = false;             // 独立副本与源模型逐关对账
    for (const q of L.quizzes) {
      if (vSpeech(q) !== qSpeech(q)) speechParity = false; // 拼句镜像与源逐题对账（文案双保险）
      if (V_DECIDE[q.kind] < V_ENTER + estMsV(vSpeech(q)) + V_TAIL) voiceOkD = false;   // 决策 ≥ 语音窗
    }
  }
  const durUnitOk = dMin >= V_MIN && parityOk && voiceOkD && speechParity &&
    dMin === 86900 && dFlat === 10;   /* 防回漂：40 关 modeled 最低=86900@flat10（dch3 关全 1 位答案 5×17380） */
  if (durUnitOk) npass++;
  units.duration = { ok: durUnitOk, minMs: dMin, minFlat: dFlat, want: V_MIN,
    parity: parityOk, speechParity: speechParity, voiceNeverDominates: voiceOkD,
    decide: V_DECIDE, tap: V_TAP, confirm: V_CONF };

  /* ---- ⑨ 源码断言：script 块数=4 + r15 字面（verify 独立第 4 块；b36 M1① 判别力） ---- */
  total++;
  const scripts = document.querySelectorAll('script');
  const nScripts = scripts.length;
  const src2 = scripts[2] ? scripts[2].textContent : '';
  const src3 = scripts[3] ? scripts[3].textContent : '';
  const src0 = scripts[0] ? scripts[0].textContent : '';
  const srcOk = nScripts === 4 &&                                           /* verify 独立第 4 块 */
    src2.indexOf('const estMs = s => s.length * 345 + 600') >= 0 &&
    src2.indexOf('const DECIDE_MS = { gather: 12000, pair: 15000, change: 13000, jiao: 16000 }') >= 0 &&
    src2.indexOf('const LEVEL_MIN_MS = 40000') >= 0 &&
    src2.indexOf('const TAP_MS = 1500') >= 0 &&
    src2.indexOf('const CONFIRM_MS = 2000') >= 0 &&
    src2.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&              /* 家族 F：实算下一关难度章 */
    src2.indexOf('GEN_HINTS[(ci + 1) % 4]') < 0 &&                           /* 禁取模推进形态（两种空格） */
    src2.indexOf('GEN_HINTS[(ci+1)%4]') < 0 &&
    src2.indexOf('CHAPTERS[(ci + 1) % 4]') < 0 &&
    src2.indexOf('runVerify') < 0 &&                                       /* script[2] 纯游戏逻辑（b37 R4 对称） */
    src3.indexOf('runVerify') >= 0 &&                                      /* script[3]=verify 本体 */
    src0.indexOf('settle()') >= 0;                                         /* script[0]=core 源锚 */
  if (srcOk) npass++;
  units.srcLit = { ok: srcOk, nScripts: nScripts };

  /* ---- ⑩ 键盘单元：位数上限/首位 0 替换/退格·清空·5 角 toggle/空输入确认/tapKey DOM 同步 ---- */
  total++;
  const Lk = genLevel(10);                         // ch3 键盘关（确定性）
  const qk = Lk.quizzes[0];
  engKey(Lk, '0'); engKey(Lk, '7');                // 首位 0 替换 → '7'
  const leadZero = qk.digits === '7';
  engKey(Lk, '2');                                 // 第 2 位 → '72'
  const twoDigits = qk.digits === '72';
  const capR = engKey(Lk, '9');                    // 第 3 位拒收
  const capOk = capR.capped === true && qk.digits === '72';
  engKey(Lk, 'del');                               // 退格 → '7'
  const delOk = qk.digits === '7';
  engKey(Lk, 'clr');                               // 清空 → ''
  const clrOk = qk.digits === '' && qk.jiao === false;
  const jiaoNull = engKey(Lk, 'jiao') === null;    // 整元章 5 角键拒收
  const emptyConfirm = engConfirm(Lk) === 'wrong' && qk.miss === 1;   // 空输入确认=miss
  startLevel(10);                                  // 真实 UI：tapKey 数字 DOM 同步
  const dq = MN.quiz;
  MN.tapKey('clr');
  for (const ch of String(dq.answer)) MN.tapKey(ch);
  const dispTxt = $id('ans-display') ? $id('ans-display').querySelector('b').textContent : '';
  const domKeyOk = dispTxt === String(dq.answer) && !$id('ans-display').querySelector('b').classList.contains('ph');
  const keyUnitOk = leadZero && twoDigits && capOk && delOk && clrOk && jiaoNull && emptyConfirm && domKeyOk;
  if (keyUnitOk) npass++;
  units.keyboard = { ok: keyUnitOk, leadZero: leadZero, twoDigits: twoDigits, cap: capOk,
    del: delOk, clr: clrOk, jiaoNull: jiaoNull, emptyConfirm: emptyConfirm, domKey: domKeyOk };

  const out = { game: 'money', total: total, pass: npass, layoutOk: layoutOk, genDch: genDch,
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
