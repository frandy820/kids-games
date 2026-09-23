/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① SPEC 频率表自检：8 音频率独立硬编码表 vs sing spy 实测频率（±0.5Hz）+ 音色/颜色表双录对账
   ② 40 关全量审计（flat 0-39）：确定性（同 flat 两次 JSON 全等）/ 章型规则（structWhy 全 null：
     四型结构+ch1 有序/ch2+ 乱序律+dch4 构成=find≥1+higher≥1+melody==1+iv==1）/
     章号映射（ch=flat/5+1，dch=(ch-1)%4+1；生成关随机章参数 dch∈1-4 钩子直读）/
     引擎直驱（逐题点答案卡→right/末题 done→全关 3 星；melody 三位点）
   ③ 封闭集独立对账：notes（find/higher/melody ∈ 8 表互异含答案；iv=三类目固定序）/
     sang 口径（find=[答案]；higher=对中两音随机序、音程 ≤2 度——r39-bis 唱序随机；
     melody=3 音互异⊆notes；iv=[lo,hi] 分类一致）
   ④ 四型专项聚合：higher 音程/近邻/相邻对 ≥半 + dch3 全 higher + dch4 构成律 +
     ch2+ 非全升序 100%（乱序律）+ melody/iv 计数=5×(1+生成关 dch4 数) +
     答案位直方图（r39-bis F1 防回归：find/higher 4 位各 ≥ceil(n/8)、iv 三类 ≥ceil(n/6)——
     从 SPEC 均匀分布推导半值下限，恒位/恒类回归时其余位计数≈0 必拦）
   ⑤ 点卡单元（flat5 dch2 find 真实 UI 状态机）：唱窗 locked 拦点 / 越界 null / 错=wrong+miss+1+
     1000ms 防重入窗 / 反馈链=not_wrong+not_g_hi2|lo2（r39 音序语义键独立复算）/
     对=right 推进+确认句颜色锚定 / 换题 miss 清零
   ⑥ 教学链：tutorialWatch() 真实走完（stub 存档）→ __nbDemoR='right' 且 tut='help'，
     flat0 题0 恒 find do 有序（锚点），主线句文案对账，watch ≤20s
   ⑦ 家族 A/B/F/I 源码断言：winFlow 含 nextHint(null)（A）/ rescueTick 含 lastDir+lastAct 双锚（B）/
     nextHint 含 genLevel(f+1).dch-1 且生成关预告实算对账（F）/ 豁免窗守卫+wrongChainUntil=7800+startLevel 重置（I）
   ⑧ 章末预告 C7 硬编码对账：CHAPTERS[i].hint=SPEC 全串 + GEN_HINTS[k] ↔ dch=k+1 关键词（r39 文案零改动）
   ⑨ clips：not_ 36 条 + core 3 条全注入 + duration 辨别器 ≤60ms（39 键 r39 终态——
     九新键已注册 2026-09-22，退役三键保留注入）
   ⑩ ch1 自由点鸟教学特例：点错=free（不判对错不计 miss 不进 step），点对=right；生成关 dch1 同特例
   ⑪ 合成音时序：SING_MS=700/SING_GAP=300/SING_PAIR_MS=1700/SING_TRIO_MS=2700 常量对账 +
     spy：higher 两音 ts 差=1000ms + 全记录 d=700 + ch1 顺序唱 8 音 ts 递增差≈550ms
   ⑫ 星级规则：0 错=3★ / 1-2 错=2★ / ≥3 错=1★（永不 0 星）
   ⑬ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 卡排容器 bump（家族 D）
   ⑭ AudioContext 懒创建：未手势（ctx null）sing 入队不报错；手势 flush 后队列排空
   ⑮ UI 冒烟：flat0 autoSolve（taps=5 恒 3 星）/ flat10 dch3 先错再解（1 错=2 星）
   ⑯ 语音窗动态断言（r39 §R9）：判对演出窗 6000 ≥ not_cf_max 2952+300；豁免窗 7800 ≥
     2832+150+estMs(not_g_h2 9 字=3705)+300=6987（r39-bis 9 字版文案）；melody 三音窗=3×(700+300)
   ⑰ 防泄露单元（r39 §R1 扩展一）：find/melody 唱窗+重听后 board 零 .singing（原版答案鸟
     飘音符泄答已修）；higher 唱窗两鸟先后亮（=题面信息非泄答；第二检查点 .singing ≥2——
     两鸟必都在场，r39-bis M2 收窄：类只加不删，旧 >=1 断言恒真无判别力）
   ⑱ melody 单元（flat15 dch4 驱动至 melody 题）：唱窗 3 音 ts 差 1000×2 + prog 状态机
     （step→picked 亮+prog+1 / 错点 wrong 进度保留 miss+1 / 3 位全对 right 推进）+ 唱窗零指认
   ⑲ interval 单元（flat15 dch4 驱动至 iv 题）：三文字卡固定序在板 + 分类独立复算
     （answer===ivClsOf(d)）+ 错卡 wrong + 对卡 right+确认键 not_cf_iv
   ⑳ 布局：双 viewport ×（flat0 鸟卡递增站台 / dch4 乱序等高站台 / iv 三卡 ≥96）+ 对比度
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* SPEC-R39 文字独立重列（禁抄页面 NOTES/ORDER/文案——独立双录对账） */
  const SPEC_FREQ = { do: 261.63, re: 293.66, mi: 329.63, fa: 349.23,
                      sol: 392.00, la: 440.00, si: 493.88, dop: 523.25 };   // do'=C5 用 id dop
  const SPEC_ORDER = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'dop'];
  const SPEC_COLOR = { do: '红', re: '橙', mi: '黄', fa: '绿', sol: '蓝', la: '紫', si: '粉', dop: '白' };
  const SPEC_GUIDE_FIND2 = { hi2: '再听一听，它更高些', lo2: '再听一听，它更低些' };   /* r39 find 音序语义（位置句退役） */
  const SPEC_GUIDE_H2 = '再听一遍，谁的声音高';       /* r39-bis higher 听辨引导（唱序随机后去时序明示） */
  const SPEC_GUIDE_MEL = '再听一遍，照顺序点';
  const SPEC_GUIDE_IV = '再听听，隔了多远';
  const SPEC_IV_KEYS = ['iv_near', 'iv_mid', 'iv_far'];
  const SPEC_IV_LABEL = { iv_near: '挨着', iv_mid: '隔一个', iv_far: '隔好几个' };
  const SPEC_MAIN_LINE = '电线左边低，右边高';
  const SPEC_CH_HINT = { 1: '听一听，找唱歌的小鸟', 2: '比一比，谁的声音高',
                         3: '全部混在一起，大挑战来啦', 4: '新一轮听音开始啦' };
  const SPEC_GEN_HINT = ['认识小鸟，再听一听', '听一听，找唱歌的小鸟',
                         '比一比，谁的声音高', '小鸟大集合，想好了再点'];
  const estMs = n => n * 345 + 600;               // b25 定版（r39：新键注册前按 estMs 预估界，注册后主线实长复核）
  const han = t => String(t).replace(/[^一-鿿]/g, '').length;   // 汉字计数（标点/拉丁不计）
  const si = n => SPEC_ORDER.indexOf(n);
  /* 驱动到指定题型题（SPEC-R39 ⑱⑲⑳ 布局用）：逐题解到 kind 匹配位 */
  async function driveToKind(flat, kind) {
    startLevel(flat);
    for (let g = 0; g < 8; g++) {
      let w = 0;
      while (state.singing && w++ < 120) await wait(50);   // 唱窗（melody 3000 最长，不折算）
      const q = cur && cur.quizzes[cur.step];
      if (!q) return false;
      if (q.kind === kind) return true;
      if (q.kind === 'melody') { let m = 0; while (!q._answered && m++ < 6) await uiTapBird(q.notes.indexOf(q.sang[q._prog])); }
      else await uiTapBird(q.answer);
      await wait(6200 * SPEED);                   // 判对演出窗（6000×SPEED+裕量）
    }
    return false;
  }

  /* ---- ① SPEC 频率表自检：spy 实测 vs 独立硬编码（±0.5Hz）+ 颜色表双录 ---- */
  total++;
  let freqOk = true, freqBad = '';
  for (const n of SPEC_ORDER) {
    window.__nbSang.length = 0;
    sing(n, 0);
    const rec = window.__nbSang[0];
    if (!rec || Math.abs(rec.f - SPEC_FREQ[n]) > 0.5) { freqOk = false; freqBad = n + '→' + (rec && rec.f); break; }
  }
  const tableOk = freqOk &&
    SPEC_ORDER.every(n => NOTES[n].freq === SPEC_FREQ[n] && NOTES[n].cn === SPEC_COLOR[n]) &&
    SING_MS === 700 && SING_GAP === 300 && SING_PAIR_MS === 1700 &&
    SING_TRIO_MS === 2700 && SING_TRIO_MS === 3 * SING_MS + 2 * SING_GAP;   // r39 melody 三音窗自洽（3 唱+2 间隔）
  if (tableOk) npass++;
  units.specTable = { ok: tableOk, freqOk: freqOk, bad: freqBad, consts: [SING_MS, SING_GAP, SING_PAIR_MS] };

  /* ---- ② 40 关全量审计（flat 0-39）+ ④ 四型专项聚合（r39：乱序律+dch4 构成） ---- */
  const dch1Seen = {}, dch2Seen = {}, genDch = {}, genDch1Lv = [];
  let hiCnt = 0, hiAdj = 0, melCnt = 0, ivCnt = 0, dch3All = true, dch4Mix = true, dch4BadLv = null;
  let mixCnt = 0, mixBad = 0;                     // ch2+ 乱序律：非全升序题应 100%
  const findAnsC = [0, 0, 0, 0], hiAnsC = [0, 0, 0, 0], ivClsC = [0, 0, 0];   // r39-bis 答案位直方图
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const why = structWhy(L1.quizzes[k], L1.dch, flat, k, k > 0 ? L1.quizzes[k - 1] : null);
      if (why) ruleOk = false;
      const q = L1.quizzes[k];
      if (q.kind === 'higher') {
        hiCnt++;
        if (Math.abs(si(q.sang[1]) - si(q.sang[0])) === 1) hiAdj++;   // 相邻对（r39-bis 唱序随机→abs；mi-fa/si-dop 在内）
        const nearOk = q.notes.some(x => x !== q.sang[0] && x !== q.sang[1] &&
          (Math.abs(si(x) - si(q.sang[0])) === 1 || Math.abs(si(x) - si(q.sang[1])) === 1));
        if (!nearOk) ruleOk = false;
        if (L1.dch >= 2 && q.answer >= 0 && q.answer < 4) hiAnsC[q.answer]++;
      }
      if (q.kind === 'melody') melCnt++;
      if (q.kind === 'iv') { ivCnt++; if (L1.dch >= 2 && q.answer >= 0 && q.answer < 3) ivClsC[q.answer]++; }
      if (L1.dch >= 2 && q.kind === 'find' && q.answer >= 0 && q.answer < 4) findAnsC[q.answer]++;   /* r39-bis 复审 m5：直方图仅计 dch≥2（dch1 教学升序场答案位由排序决定，不入防恒位口径） */
      /* 乱序律独立复算（structWhy 同源外再数一遍——分布口径）：ch2+ 音系题非完全升序 */
      if (L1.dch >= 2 && q.kind !== 'iv') {
        mixCnt++;
        let asc = true;
        for (let j = 1; j < q.notes.length; j++) if (si(q.notes[j]) <= si(q.notes[j - 1])) { asc = false; break; }
        if (asc) mixBad++;
      }
      if (L1.dch === 3 && q.kind !== 'higher') dch3All = false;
    }
    if (L1.dch === 4) {                                            // dch4 构成律（r39 §R2）
      const kc = k => L1.quizzes.filter(q => q.kind === k).length;
      if (!(kc('melody') === 1 && kc('iv') === 1 && kc('find') >= 1 && kc('higher') >= 1)) {
        dch4Mix = false; dch4BadLv = flat;
      }
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch)
                                       : (L1.dch >= 1 && L1.dch <= 4);       // 生成关随机章参数（钩子直读）
    /* 引擎直驱：逐题点答案卡 → right / 末题 done（melody 三位点）；全关零错=3 星 */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      const exp = k === L3.quizzes.length - 1 ? 'done' : 'right';
      let r = null;
      if (q.kind === 'melody') {
        while (!q._answered) { r = engTapBird(L3, q.notes.indexOf(q.sang[q._prog])); if (r === 'wrong') break; }
      } else r = engTapBird(L3, q.answer);
      if (r !== exp || q._miss !== 0) { driveOk = false; break; }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.retries === 0 && engStars(L3) === 3;
    /* 封闭集对账（③ 数据源）：四型分支 */
    let tabOk = true;
    for (const q of L1.quizzes) {
      const ns = q.notes;
      if (q.kind === 'iv') {                                        // iv：三类目固定序+分类独立复算
        if (ns.length !== 3 || ns[0] !== SPEC_IV_KEYS[0] || ns[1] !== SPEC_IV_KEYS[1] || ns[2] !== SPEC_IV_KEYS[2]) { tabOk = false; break; }
        const d = si(q.sang[1]) - si(q.sang[0]);
        const cls = d === 1 ? 0 : d === 2 ? 1 : 2;
        if (!(q.sang.length === 2 && d >= 1 && q.answer === cls)) { tabOk = false; break; }
        continue;
      }
      if (ns.length !== 4 || ns.filter((v, i, a) => a.indexOf(v) === i).length !== 4 ||
          !ns.every(v => si(v) >= 0)) { tabOk = false; break; }
      if (ns.indexOf(q.ansNote) < 0 || q.answer !== ns.indexOf(q.ansNote)) { tabOk = false; break; }
      if (q.kind === 'find' && !(q.sang.length === 1 && q.sang[0] === q.ansNote)) { tabOk = false; break; }
      if (q.kind === 'higher') {
        const d = Math.abs(si(q.sang[1]) - si(q.sang[0]));   // r39-bis 唱序随机：顺序无关复算
        if (!(q.sang.length === 2 && Math.max(si(q.sang[0]), si(q.sang[1])) === si(q.ansNote) &&
              d >= 1 && d <= 2)) { tabOk = false; break; }    // 答案=对中较高者；音程 ≤2 度
      }
      if (q.kind === 'melody') {                                    // melody：3 音互异⊆notes+干扰恰 1
        if (!(q.sang.length === 3 && q.sang.filter((v, i, a) => a.indexOf(v) === i).length === 3 &&
              q.sang.every(v => ns.includes(v)) && ns.filter(v => !q.sang.includes(v)).length === 1)) { tabOk = false; break; }
      }
    }
    /* 分布聚合（dch1/dch2 目标多样；生成关四型全现） */
    if (L1.dch === 1) L1.quizzes.forEach(q => { dch1Seen[q.ansNote] = (dch1Seen[q.ansNote] || 0) + 1; });
    if (L1.dch === 2) L1.quizzes.forEach(q => { dch2Seen[q.ansNote] = (dch2Seen[q.ansNote] || 0) + 1; });
    if (flat >= STATIC_LEVELS) {
      genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
      if (L1.dch === 1) genDch1Lv.push(flat);
    }
    const ok = det && ruleOk && chOk && dchOk && driveOk && solvedAll && tabOk;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, chOk: chOk, dchOk: dchOk,
                   driveOk: driveOk, solvedAll: solvedAll, tabOk: tabOk,
                   kinds: L1.quizzes.map(q => q.kind + ':' + q.ansNote) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const genDch4 = genDch[4] || 0;
  /* r39-bis F1/minor2 防回归：答案位直方图（从 SPEC 均匀分布推导半值下限，禁抄实现观测）——
     find/higher 答案位期望 n/4 → 各位 ≥ceil(n/8)（恒位回归时其余 3 位≈0 必拦）；
     iv 三类期望 n/3 → 各类 ≥ceil(n/6)（主线原案 n/4 在 40 关确定性流 12 题实测 near=2<3 假阳，
     按同款半值律取 n/6——恒类/双类回归 0<2 仍必拦） */
  const nFind = findAnsC[0] + findAnsC[1] + findAnsC[2] + findAnsC[3];
  const nHiA = hiAnsC[0] + hiAnsC[1] + hiAnsC[2] + hiAnsC[3];
  const nIvA = ivClsC[0] + ivClsC[1] + ivClsC[2];
  const histOk = findAnsC.every(c => c >= Math.ceil(nFind / 8)) &&
                 hiAnsC.every(c => c >= Math.ceil(nHiA / 8)) &&
                 ivClsC.every(c => c >= Math.ceil(nIvA / 6));
  const distOk = Object.keys(dch1Seen).length >= 5 && Object.keys(dch2Seen).length >= 5 &&
                 dch3All && dch4Mix && hiCnt > 0 && hiAdj / hiCnt >= 0.5 &&
                 melCnt === 5 + genDch4 && ivCnt === 5 + genDch4 &&   // 每关恰 1 题：静态 dch4 5 关+生成 dch4 关
                 mixCnt > 0 && mixBad === 0 &&                       // ch2+ 乱序律 100%
                 genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0 &&
                 histOk;                                             // r39-bis 答案位均匀护栏
  if (distOk) npass++;
  units.dist = { ok: distOk, dch1Distinct: Object.keys(dch1Seen).length, dch2Distinct: Object.keys(dch2Seen).length,
                 dch3All: dch3All, dch4Mix: dch4Mix, dch4BadLv: dch4BadLv,
                 higherPairs: hiCnt, adjacentRatio: +(hiAdj / hiCnt).toFixed(2),
                 melody: melCnt, iv: ivCnt, expectMelIv: 5 + genDch4,
                 mixCnt: mixCnt, mixBad: mixBad, genDch: genDch,
                 histOk: histOk, findAns: findAnsC, hiAns: hiAnsC, ivCls: ivClsC };

  /* ---- ⑤ 点鸟单元（flat5=dch2 find 真实 UI 状态机：唱窗 locked / 越界 null / 错反馈方向句独立复算 /
     1000ms 防重入 / 对=right+确认句 / 换题 miss 清零）。防重入测法（b25 坑①）：fire-and-forget 首击
     （不 await）+ 紧邻二击 ---------- */
  total++;
  startLevel(5);
  const q5 = NB.quiz;
  const initOk2 = q5 && q5.kind === 'find' && q5.notes.length === 4 &&
                  q5.sang.length === 1 && q5.notes.indexOf(q5.sang[0]) === q5.answer &&
                  q5.step === 0 && q5.miss === 0 && NB.currentLevel.dch === 2;
  await wait(400);                                // 题面唱窗内（700+300 固定，SPEED 不折算）
  const lockWin = (await NB.tapBird(q5.answer)) === false && boardEl.classList.contains('bump');
  await wait(1100);                               // 唱窗过
  const badTap = (await NB.tapBird(99)) === null; // 越界=null（不炸）
  const wIdx = q5.notes.findIndex((n, j) => j !== q5.answer);
  const expGuide = si(q5.notes[wIdx]) < si(q5.notes[q5.answer]) ? SPEC_GUIDE_FIND2.hi2 : SPEC_GUIDE_FIND2.lo2;
  const expGuideKey = si(q5.notes[wIdx]) < si(q5.notes[q5.answer]) ? 'not_g_hi2' : 'not_g_lo2';   /* r39：音序语义键独立复算（位置句退役） */
  const pW = NB.tapBird(wIdx);                    // → wrong（1000ms 防重入窗，fire-and-forget）
  const rejW = await NB.tapBird(wIdx);            // 窗内紧邻再点=被拦 false（⑫ 双错防重入）
  const rW = await pW;
  const chainA = window.__lastQueue && window.__lastQueue[0] === 'not_wrong' &&   // 反馈链=not_wrong+方向句
                window.__lastQueue[1] && window.__lastQueue[1].key === expGuideKey &&   /* T46 阶段2：链尾恒有键 */
                window.__lastQueue[1].text === expGuide;                           // 独立复算方向（音序硬编码表）
  const s1 = rW === 'wrong' && rejW === false && chainA &&
             NB.quiz.miss === 1 && NB.currentLevel.miss === 1 && NB.quiz.step === 0;
  const wIdx2 = q5.notes.findIndex((n, j) => j !== q5.answer && j !== wIdx);
  const rW2 = await NB.tapBird(wIdx2);            // 同题点另一错鸟（防重入窗过后可再选）
  const s1b = rW2 === 'wrong' && NB.quiz.miss === 2;
  const rR = await NB.tapBird(q5.answer);
  const confOk = window.__lastVoiceKey === 'not_cf_s_' + SPEC_ORDER.indexOf(q5.notes[q5.answer]) &&   /* T46：find 确认句整句键 */
                 window.__lastPlayText === '对啦，' + SPEC_COLOR[q5.notes[q5.answer]] + '小鸟在唱歌';   /* 文本对 SPEC 独立拼 */
  const s2 = rR === 'right' && NB.quiz.step === 1 && NB.quiz.miss === 0 && confOk;
  const tapOk = initOk2 && lockWin && badTap && s1 && s1b && s2;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, init: initOk2, lockWin: lockWin, badTap: badTap, wrongA: s1, wrongB: s1b,
                chain: chainA, right: s2, guide: expGuide };

  /* ---- ⑥ 教学链：tutorialWatch 真实走完 → __nbDemoR='right'（顺序唱+ghost 演示听音点 do） ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub
  KIDS.store.persist = function () {};
  startLevel(0);
  await wait(50);                                 // startLevel 首题唱窗起跑（计入段前基线）
  const segBase = window.__nbSang.length;
  const t0 = Date.now();
  await tutorialWatch();
  const tw = Date.now() - t0;                     // verify 页真实毫秒（唱窗不折算）
  const twFixed = 8 * 550 + (700 + 300 + 300) + 700;   // 固定窗（不乘 SPEED，M1 压缩后）：顺序唱 8×550+题面唱 1300+demo 清唱 700
  const twReal = (tw - twFixed) / SPEED + twFixed;      // 混合折算真实页时长（审查 M1：口径对齐 ruler/coin ≤16000）
  const demoSeg = window.__nbSang.slice(segBase, segBase + 8);   // 顺序唱 do→do' 8 记录
  let demoTsOk = demoSeg.length === 8;
  for (let j = 0; demoTsOk && j < 8; j++) {
    if (Math.abs(demoSeg[j].f - SPEC_FREQ[SPEC_ORDER[j]]) > 0.5) demoTsOk = false;
    if (j > 0) { const gap = demoSeg[j].t - demoSeg[j - 1].t; if (gap < 420 || gap > 720) demoTsOk = false; }  // M1：步长 550（450 唱+100 间隔）
  }
  const tutOk = window.__nbMainV === 'not_main' &&          /* T46：主线句走 play 通道实证 */
                window.__nbDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && cur.quizzes[0].kind === 'find' && cur.quizzes[0].ansNote === 'do' &&
                twReal <= 16000 && demoTsOk && MAIN_LINE === SPEC_MAIN_LINE;   /* 主线句双录对账
                （__lastSay 此刻已被演示确认句覆写，改验常量双录） */
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__nbDemoR, tut: state.tut, watchMs: Math.round(twReal), demoTsOk: demoTsOk };

  /* ---- ⑩ ch1 自由点鸟教学特例（flat0 dch1 + 生成关 dch1）：点错=free 不判对错不计 miss 不进 step ---- */
  total++;
  startLevel(0);
  await wait(1300);                               // 题面唱窗过
  const qf = NB.quiz;
  const fIdx = qf.notes.findIndex((n, j) => j !== qf.answer);
  const free1 = await NB.tapBird(fIdx);           // ch1 点错=free
  const freeOk1 = free1 === 'free' && NB.quiz.miss === 0 && NB.quiz.step === 0 &&
                  NB.currentLevel.miss === 0;
  const fR = await NB.tapBird(qf.answer);         // 点对=right（ch1 仍可推进）
  const freeOk2 = fR === 'right' && NB.quiz.step === 1;
  let genFreeOk = true;
  if (genDch1Lv.length) {                         // 生成关 dch1 同教学特例
    startLevel(genDch1Lv[0]);
    await wait(1300);
    const qg = NB.quiz;
    const gi = qg.notes.findIndex((n, j) => j !== qg.answer);
    const gr = await NB.tapBird(gi);
    genFreeOk = gr === 'free' && NB.quiz.miss === 0 && NB.quiz.step === 0;
  }
  const freeAll = freeOk1 && freeOk2 && genFreeOk;
  if (freeAll) npass++;
  units.free = { ok: freeAll, ch1: freeOk1, ch1Right: freeOk2, gen: genFreeOk, genLv: genDch1Lv[0] };

  /* ---- ⑦ 家族 A/B/F/I 源码断言（函数源码 toString；启动 lim-1 由 build.py 静态断言） ---- */
  total++;
  const srcA = winFlow.toString().indexOf('nextHint(null)') >= 0;
  const srcB = rescueTick.toString().indexOf('lastDir') >= 0 &&
               rescueTick.toString().indexOf('lastAct') >= 0 &&
               rescueTick.toString().indexOf('14000') >= 0 &&
               rescueTick.toString().indexOf('30000') >= 0;
  const srcF = nextHint.toString().indexOf('genLevel(f + 1).dch - 1') >= 0 &&
               [24, 29, 34, 39].every(f => nextHint(f) === SPEC_GEN_HINT[genLevel(f + 1).dch - 1]);
  const srcI = rescueTick.toString().indexOf('Date.now() < wrongChainUntil') >= 0 &&
               uiTapBird.toString().indexOf('wrongChainUntil = Date.now() + 7800') >= 0 &&
               startLevel.toString().indexOf('wrongChainUntil = 0') >= 0;
  const famOk = srcA && srcB && srcF && srcI;
  if (famOk) npass++;
  units.family = { ok: famOk, A: srcA, B: srcB, F: srcF, I: srcI };

  /* ---- ⑧ 章末预告 C7 硬编码对账（hint=SPEC 全串 + GEN_HINTS[k] ↔ dch=k+1 关键词） ---- */
  total++;
  const hintOk = [1, 2, 3, 4].every(i => CHAPTERS[i].hint === SPEC_CH_HINT[i]) &&
                 CHAPTERS[1].hint.indexOf('找') >= 0 && CHAPTERS[1].hint.indexOf('唱') >= 0 &&  // 预告 ch2 听音找鸟
                 CHAPTERS[2].hint.indexOf('高') >= 0 &&                                          // 预告 ch3 谁高谁低
                 CHAPTERS[3].hint.indexOf('混') >= 0 && CHAPTERS[3].hint.indexOf('挑战') >= 0 &&  // 预告 ch4 混合
                 CHAPTERS[4].hint.indexOf('新') >= 0 &&                                          // 预告生成关
                 GEN_HINTS[0].indexOf('认识') >= 0 &&                                            // dch1 认识小鸟
                 GEN_HINTS[1].indexOf('找') >= 0 &&                                              // dch2 find
                 GEN_HINTS[2].indexOf('高') >= 0 &&                                              // dch3 higher
                 GEN_HINTS[3].indexOf('集合') >= 0 &&                                            // dch4 混合
                 GEN_HINTS.every((s, i) => s === SPEC_GEN_HINT[i]);
  if (hintOk) npass++;
  units.hints = { ok: hintOk, chapters: [1, 2, 3, 4].map(i => CHAPTERS[i].hint), gen: GEN_HINTS };

  /* ---- ⑪ 合成音时序（spy）：higher 两音 ts 差=1000ms + 全记录 d=700ms ---- */
  total++;
  startLevel(10);                                 // dch3 higher
  await wait(2600);                               // 题面唱窗（1700+300）过
  const qh = NB.quiz;
  window.__nbSang.length = 0;
  NB.replay();                                    // 重听题面音（与 🔊 同路径）
  const pair = window.__nbSang.slice(0, 2);
  const gapPair = pair.length === 2 ? pair[1].t - pair[0].t : -1;
  const durAll = window.__nbSang.every(e => e.d === 700);
  const freqSeq = pair.length === 2 &&
                  Math.abs(pair[0].f - SPEC_FREQ[qh.sang[0]]) <= 0.5 &&
                  Math.abs(pair[1].f - SPEC_FREQ[qh.sang[1]]) <= 0.5;
  const tsOk = Math.abs(gapPair - (700 + 300)) <= 5 && durAll && freqSeq && qh.kind === 'higher';
  if (tsOk) npass++;
  units.synthTs = { ok: tsOk, gap: Math.round(gapPair), durAll700: durAll, freqSeq: freqSeq, sang: qh.sang };

  /* ---- ⑨ clips：not_ 6 条 + core 3 条全注入 + 时长身份辨别器（SPEC §4 ±60ms） ---- */
  total++;
  const keys = Object.keys(KIDS.voice.clips);
  const need = ['not_tut_watch', 'not_tut_turn', 'not_hint', 'not_right', 'not_wrong', 'not_q',
                'not_q2', 'not_main', 'not_g_higher', 'not_g_left', 'not_g_right',
                'not_cf_h_0', 'not_cf_h_4', 'not_cf_h_7', 'not_cf_s_0', 'not_cf_s_7',
                'not_g_hi2', 'not_g_h2', 'not_g_mel', 'not_q_mel', 'not_q_iv', 'not_cf_mel', 'not_cf_iv',   // r39 段二：新键族代表入 need（防错名顶替，r35 m-1）
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const preOk = keys.length === 39 &&   /* r39 终态（not_ 36+core3，九新键注册 2026-09-22；退役三键保留注入） */
    need.every(k => keys.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  /* durSpec=T46 阶段2 全键实长表（mp3 mutagen 实测 2026-09-19，运行时 new Audio ±60ms 互证） */
  const durSpec = { not_tut_watch: 3096, not_tut_turn: 1752, not_hint: 2304,
                    not_right: 2664, not_wrong: 2832, not_q: 2448,
                    not_q2: 1896, not_main: 2904,
                    not_g_higher: 4512, not_g_left: 3192, not_g_right: 3168,
                    not_cf_h_0: 2904, not_cf_h_1: 2880, not_cf_h_2: 2904, not_cf_h_3: 2880,
                    not_cf_h_4: 2952, not_cf_h_5: 2880, not_cf_h_6: 2904, not_cf_h_7: 2856,
                    not_cf_s_0: 2880, not_cf_s_1: 2880, not_cf_s_2: 2904, not_cf_s_3: 2880,
                    not_cf_s_4: 2880, not_cf_s_5: 2880, not_cf_s_6: 2880, not_cf_s_7: 2880,
                    /* r39 九键实长（主线 mutagen 实测 2026-09-22；not_g_h2 为 r39-bis 9 字版重合成值）；窗约束对账：g 族 max 2928 ≤4518（wrongChain 7800 界）/ cf 族 max 2448 ≤5700（判对窗 6000-300 界） */
                    not_g_hi2: 2808, not_g_lo2: 2784,
                    not_g_h2: 2928,   /* r39-bis 终态：9 字版（再听一遍，谁的声音高）主线重合成 mutagen 实测 2026-09-22（旧 10 字版 3144；ASR 复核文案正确）；链 2832+150+2928+300=6210≤7800 */
                    not_g_mel: 2808, not_g_iv: 2640,
                    not_q_mel: 2712, not_q_iv: 2520, not_cf_mel: 2400, not_cf_iv: 2448 };
  const durKeys = Object.keys(durSpec);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - durSpec[durKeys[i]]) <= 60);
  const clipsOk = preOk && durOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keys.length, durs: durs };

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

  /* ---- ⑬ 吞输入轻叮+可见回应：demo/locked 门拦钩子输入 + 鸟卡排容器 bump（家族 D） ---- */
  total++;
  startLevel(0);
  await wait(1300);
  state.demo = true; state.locked = true;                    // 模拟教学"看"演示期
  const swallow1 = (await NB.tapBird(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                   // 演出窗口（locked）
  const swallow2 = (await NB.tapBird(0)) === false;
  state.locked = false;                                      // 还原
  const swallowOk = swallow1 && swallow2 && NB.quiz.step === 0 && NB.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2 };

  /* ---- ⑭ AudioContext 懒创建：未手势（ctx null）sing 入队不报错；手势 flush 队列排空 ---- */
  total++;
  NB_AUDIO._fakeRunning = false;                             // 模拟无手势（ctx 挂起/未建）
  const p0 = NB_AUDIO._pending.length;
  let pendOk = true;
  try { sing('do', 0); } catch (e) { pendOk = false; }
  const grew = NB_AUDIO._pending.length === p0 + 1;
  NB_AUDIO._fakeRunning = true;                              // 模拟手势后 ctx running
  NB_AUDIO.unlockFlush();                                    // 手势解锁链（与 core unlock 同链）
  const flushed = NB_AUDIO._pending.length === p0 &&
                  Math.abs(window.__nbSang[window.__nbSang.length - 1].f - SPEC_FREQ.do) <= 0.5;
  const lazyOk = pendOk && grew && flushed;
  if (lazyOk) npass++;
  units.audioLazy = { ok: lazyOk, noThrow: pendOk, queued: grew, flushed: flushed };

  /* ---- ⑯ 语音窗动态断言（r39 §R9：在册键 clip 实测口径 + 新键 estMs 预估界——注册后主线实长复核） ---- */
  total++;
  const SPEC_CLIP = { not_cf_max: 2952, not_main: 2904 };     // 在册实测：not_cf_h_4 / not_main
  const estChainMs = 2832 + 150 + estMs(han(SPEC_GUIDE_H2));  // r39-bis 错链=not_wrong+150+not_g_h2(9 字 estMs 3705)
  const winOk = (900 + 1800 + 3300) >= SPEC_CLIP.not_cf_max + 300 &&   // 判对演出窗 6000 ≥ 2952+300（新 cf_mel/cf_iv 6 字更低）
                (900 + 2700) >= 3096 + 300 &&                // 教学顺序唱延 t=3600 ≥ watch 3096+300（m2 裕量 204）
                4100 >= SPEC_CLIP.not_main + 300 &&           // 主线句窗 4100 ≥ not_main 2904+300
                2100 >= 1752 + 300 &&                        // turn 后读题延 ≥ 1752+300
                (2620 + 400) >= 2664 + 300 &&                // winFlow celebrate+补窗 ≥ right+300
                7800 >= estChainMs + 300 &&                  // 豁免窗 7800 ≥ r39-bis 链 estChainMs+300（9 字 estMs 3705→6987；实长 2928→6210）
                SING_PAIR_MS === 700 + 300 + 700 &&          // higher/iv 两音窗 1700
                SING_TRIO_MS === 2700 && SING_TRIO_MS === 3 * 700 + 2 * 300 &&   // melody 三音窗（3 唱+2 间隔）
                (900 + 2700 + 4100 + 500 + 320 + 900) + (8 * 550 + 1300 + 700) <= 16000;  // 教学链总预算 ≤16s（零改动）
  if (winOk) npass++;
  units.estWin = { ok: winOk, cfMaxMs: SPEC_CLIP.not_cf_max, mainMs: SPEC_CLIP.not_main, chainMs: estChainMs,
                   estGuideMax: estMs(han(SPEC_GUIDE_H2)) };

  /* ---- ⑮ UI 冒烟 A：flat0（dch1）autoSolve 通关（5 题 taps=5，恒 3 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  const a0 = await NB.autoSolve();
  const lv0 = NB.currentLevel;
  const smokeA = a0.done && a0.taps === 5 && lv0.done && lv0.won &&
                 engStars(cur) === 3 && lv0.miss === 0 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, stars: engStars(cur) };

  /* ---- ⑮ UI 冒烟 B：flat10（dch3 higher）先点 1 次错鸟再 autoSolve（1 错=2 星） ---- */
  total++;
  startLevel(10);
  await wait(2600);                               // 题面唱窗过（higher 1700+300）
  const q8 = NB.quiz;
  const wrongC = q8.notes.findIndex((n, j) => j !== q8.answer);
  const r8 = await NB.tapBird(wrongC);
  const a10 = await NB.autoSolve();
  const lv10 = NB.currentLevel;
  const smokeB = r8 === 'wrong' && a10.done && a10.taps === 5 && lv10.done && lv10.won &&
                 lv10.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat10 = { ok: smokeB, r8: r8, taps: a10.taps, miss: lv10.miss, stars: engStars(cur) };

  /* ---- ⑰ 防泄露单元（r39 §R1 扩展一）：find/melody 唱窗+重听后 board 零 .singing；
     higher 唱窗两鸟先后亮（=题面信息非泄答） ---- */
  total++;
  startLevel(5);                                    // dch2 find（乱序）
  await wait(300);                                  // 唱窗内（700+300 不折算）
  const leakFind = boardEl.querySelectorAll('.bird-card.singing').length === 0;
  await wait(1100);                                 // 唱窗过
  window.__nbSang.length = 0;
  NB.replay();                                      // 重听（与 🔊 同路径）
  const leakFind2 = boardEl.querySelectorAll('.bird-card.singing').length === 0 && window.__nbSang.length === 1;
  startLevel(10);                                   // dch3 higher
  await wait(300);
  const hiLit = boardEl.querySelectorAll('.bird-card.singing').length >= 1;   // 第一只 t=0 立即亮
  await wait(1000);                                 // 第二只 t=1000 延时亮
  const hiLit2 = boardEl.querySelectorAll('.bird-card.singing').length >= 2;   // r39-bis M2：两鸟必都在场（类只加不删，旧 >=1 恒真）
  await wait(900);
  const leakOk = leakFind && leakFind2 && hiLit && hiLit2;
  if (leakOk) npass++;
  units.leak = { ok: leakOk, findQuiet: leakFind, findReplayQuiet: leakFind2, higherLit: hiLit && hiLit2 };

  /* ---- ⑱ melody 单元（flat15 dch4 驱动至 melody 题：时序+prog 状态机+零指认+唱序对账） ---- */
  total++;
  const drvMel = await driveToKind(15, 'melody');
  const qm = NB.quiz;
  let melTsOk = false, melQuiet = false, melStateOk = false, melWrongKeep = false, melDoneOk = false;
  const melInfo = {};
  if (drvMel && qm && qm.kind === 'melody') {
    const melInit = qm.sang.length === 3 && qm.sang.every(x => SPEC_ORDER.includes(x)) &&
                    qm.sang.filter((v, i, a) => a.indexOf(v) === i).length === 3 &&
                    qm.notes.includes(qm.sang[0]) && qm.prog === 0 && qm.miss === 0;
    window.__nbSang.length = 0;
    NB.replay();                                    // 重听=重唱 3 音（与 🔊 同路径）
    const trio = window.__nbSang.slice(0, 3);
    melTsOk = trio.length === 3 &&
              Math.abs(trio[1].t - trio[0].t - (700 + 300)) <= 5 &&
              Math.abs(trio[2].t - trio[1].t - (700 + 300)) <= 5 &&
              trio.every(e => e.d === 700) &&                      // 逐音 700ms
              trio.every((e, j) => Math.abs(e.f - SPEC_FREQ[qm.sang[j]]) <= 0.5);   // 唱序=答案序（频率独立对账）
    melQuiet = boardEl.querySelectorAll('.bird-card.singing').length === 0;   // 唱窗零指认（防序泄露）
    /* prog 状态机：点对第 1 位=step+prog1+picked；点错=wrong 进度保留；续点 2/3 位=right 推进 */
    let w = 0; while (state.singing && w++ < 120) await wait(50);
    const i1 = qm.notes.indexOf(qm.sang[0]);
    const r1 = await NB.tapBird(i1);
    const s1 = r1 === 'step' && NB.quiz.prog === 1 && cardEl(i1).classList.contains('picked');
    const wIdx3 = qm.notes.findIndex(n => !qm.sang.includes(n));   // 真干扰鸟（不在唱序内——必非当前位）
    const rw = await NB.tapBird(wIdx3);
    melWrongKeep = rw === 'wrong' && NB.quiz.prog === 1 && NB.quiz.miss === 1 && NB.quiz.step === qm.step;   // 进度保留
    const r2 = await NB.tapBird(qm.notes.indexOf(qm.sang[1]));
    const r3 = await NB.tapBird(qm.notes.indexOf(qm.sang[2]));
    melStateOk = melInit && s1 && r2 === 'step' && (r3 === 'right' || r3 === 'done') &&
                 (r3 === 'done' ? (NB.currentLevel.done && NB.currentLevel.step === CH_LEN)
                                : NB.currentLevel.step === qm.step + 1);       // 末题 done 分支（melody 位不定）
    melDoneOk = true;                                                          // 已并入 melStateOk（r3 双态）
    melInfo.init = melInit; melInfo.step1 = s1; melInfo.r2 = r2; melInfo.r3 = r3;
  }
  const melOk = drvMel && melTsOk && melQuiet && melStateOk && melWrongKeep && melDoneOk;
  if (melOk) npass++;
  units.melody = Object.assign({ ok: melOk, driven: drvMel, tsOk: melTsOk, quiet: melQuiet,
                                 stateOk: melStateOk, wrongKeep: melWrongKeep }, melInfo);

  /* ---- ⑲ interval 单元（dch4 关驱动至 iv 题：三卡固定序+分类独立复算+错对判定+确认键；
     iv 末位题通关句 not_right 会覆写确认键——优先驱动到非末位 iv，5 关兜底豁免） ---- */
  total++;
  let drvIv = false, qi4 = null, flatIv = null;
  for (const f of [15, 16, 17, 18, 19]) {
    const d = await driveToKind(f, 'iv');
    const q = NB.quiz;
    if (d && q && q.kind === 'iv' && q.step < CH_LEN - 1) { drvIv = true; qi4 = q; flatIv = f; break; }
  }
  if (!drvIv) {                                    // 兜底：五关 iv 全末位（概率 ~0.03%）取任意 iv 题
    const d2 = await driveToKind(15, 'iv');
    qi4 = NB.quiz;
    drvIv = d2 && qi4 && qi4.kind === 'iv';
  }
  let ivCards = false, ivCls = false, ivWrong = false, ivRight = false;
  const ivInfo = {};
  if (drvIv && qi4 && qi4.kind === 'iv') {
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.bird-card'), b => b.dataset.note);
    ivCards = cards.length === 3 && cards.every((c, j) => c === SPEC_IV_KEYS[j]);    // 三类目固定序在板
    const labels = Array.prototype.map.call(boardEl.querySelectorAll('.iv-word'), el => el.textContent);
    const labelOk = labels.length === 3 && labels.every((t, j) => t === SPEC_IV_LABEL[SPEC_IV_KEYS[j]]);
    const d = si(qi4.sang[1]) - si(qi4.sang[0]);
    const clsExp = d === 1 ? 0 : d === 2 ? 1 : 2;                   // 分类独立复算（SPEC-R39 §R3 同式）
    ivCls = d >= 1 && qi4.answer === clsExp && labelOk;
    let w = 0; while (state.singing && w++ < 120) await wait(50);
    const wIdx4 = qi4.answer === 0 ? 1 : 0;
    const rw4 = await NB.tapBird(wIdx4);
    ivWrong = rw4 === 'wrong' && NB.quiz.miss === 1 && NB.quiz.step === qi4.step;   // 错不推进（节流吞链=flat≥3 合法行为，键链断言由 ⑤ 同构覆盖）
    const rr4 = await NB.tapBird(qi4.answer);
    ivRight = (rr4 === 'right' || rr4 === 'done') &&
              (rr4 === 'done' ? (NB.currentLevel.done && NB.currentLevel.step === CH_LEN)
                              : (NB.currentLevel.step === qi4.step + 1 &&
                                 window.__lastVoiceKey === 'not_cf_iv' &&          /* r39 确认键（play 非节流通道） */
                                 window.__lastPlayText === '对啦，耳朵真准'));     /* done 位键断言豁免（通关句覆写合法） */
    ivInfo.d = d; ivInfo.clsExp = clsExp; ivInfo.labelOk = labelOk;
    ivInfo.diag = { rw4: rw4, rr4: rr4, step0: qi4.step, lvStep: NB.currentLevel && NB.currentLevel.step,
                    lvDone: NB.currentLevel && NB.currentLevel.done, key: window.__lastVoiceKey,
                    text: window.__lastPlayText };
  }
  const ivOk = drvIv && ivCards && ivCls && ivWrong && ivRight;
  if (ivOk) npass++;
  units.iv = Object.assign({ ok: ivOk, driven: drvIv, flat: flatIv, cardsOk: ivCards, clsOk: ivCls,
                             wrongOk: ivWrong, rightOk: ivRight }, ivInfo);

  /* ---- ⑳ 布局：双 viewport ×（flat0 ch1 递增站台 / flat17 dch4 乱序等高站台）+ iv 三卡腿 + 对比度 ---- */
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
  function simView(w, h, restart) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    if (restart) startLevel(g._simFlat);
    const q = cur && cur.quizzes[cur.step];
    const isIv = q && q.kind === 'iv';
    const expN = isIv ? 3 : 4;
    const cards = Array.prototype.map.call(boardEl.querySelectorAll('.bird-card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const sc = { w: sceneEl.offsetWidth, h: sceneEl.offsetHeight };
    const hitOk = cards.length === expN && cards.every(b => b.w >= 96 && b.h >= 96);   // 主答案按钮 ≥96
    const sceneOk = sc.w >= 64 && sc.h >= 64;
    const perchH = Array.prototype.map.call(boardEl.querySelectorAll('.bird-card .perch'),
      p => p.offsetHeight);
    /* 站台律（r39 §R1）：ch1 递增（freeOrder 假）/ch2+ 等高（freeOrder 真）；iv 卡无站台 */
    const perchOk = isIv ? perchH.length === 0 :
      (q.freeOrder ? (perchH.length === 4 && perchH.every(v => v === perchH[0])) :    // 等高=高度轴零线索
                   (perchH.length === 4 && perchH[3] > perchH[0]));                   // ch1 递增=教学映射
    const cB = ratioOf('#4A3B2E', '#FBF6EC') >= 3 &&
               ratioOf(cssToHex(getComputedStyle(boardEl.querySelector('.bird-card')).borderLeftColor), '#FFF9EE') >= 3;
    const cS = ratioOf(cssToHex(getComputedStyle(sceneEl).borderLeftColor), '#FBF6EC') >= 3;
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, kind: q && q.kind, cards: cards.length, hitOk: hitOk, sceneOk: sceneOk,
             perchOk: perchOk, contrast: cB && cS, ox: ox,
             pass: hitOk && sceneOk && perchOk && cB && cS && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 17]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800, true));
    sims.push(simView(800, 1180, true));
  }
  /* iv 三卡腿：驱动到 iv 题量测（宽 1280 视口，不重启） */
  const drvIv2 = await driveToKind(17, 'iv');
  let simIv = { pass: false, note: 'drive-fail' };
  if (drvIv2) simIv = simView(1280, 800, false);
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                            // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass) && simIv.pass;
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims, iv: simIv };

  const out = { game: 'notebird', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录调用 key（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）；
     voice.say 记录 TTS 拼句（__lastSay）供确认句/题面句对账 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastPlayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  KIDS.voice.say = function (t) { window.__lastSay = t || null; };
  /* 合成音 spy（SPEC §0.66/任务书：不依赖真实出声——无头 AudioContext suspended 也能全断言）：
     覆写 NB_AUDIO._tone（唯一真实调度出口）记录 (频率,时刻) 序列挂 window.__nbSang；
     ctx 以 _fakeRunning 开关模拟手势解锁（⑭ 懒创建两态可测） */
  window.__nbSang = [];
  NB_AUDIO._fakeRunning = true;
  NB_AUDIO.ctx = function () { return NB_AUDIO._fakeRunning ? { state: 'running' } : null; };
  NB_AUDIO._tone = function (f, w, d) {
    window.__nbSang.push({ f: f, t: performance.now() + w * 1000, d: Math.round(d * 1000) });
  };
  runVerify();
}
