/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计：确定性 / 数学正确（mul a×b、sum Σ==answer、miss b==c÷a）/
     章因数范围独立审计 rangeOk / 关形态（dch1 前半连加后半乘法；dch4 恰 1 缺因数+含 ×8/×9）/
     同关无重复题 / 干扰项 4 选 1 且为规则构造（口诀近邻/运算混淆，独立 candRules 复算）/
     引擎直驱 autoSolve 通关（0 重试 3 星）
   ② 单元：星级映射 / 答错灰掉可重点（引擎语义）
   ③ UI 冒烟：TIM.autoSolve 通关 / 连加→乘法转化动画 / 分组图内容（b 组×a 条）/
     高章无辅助（dch3 按钮隐藏+答错不亮起）/ aidAuto 消耗标记（首点不关闭）
   ④ 布局：数字鱼 ≥96×96、间距 ≥16、overflowX ≤0；answerIdx 四位置轮转（禁恒首位）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0, 0];

  /* verify 侧独立复算的干扰项规则池（不调用引擎 candPool，防两套逻辑同错） */
  function candRules(q) {
    const set = [];
    const add = v => { if (v >= 0 && v !== q.answer && set.indexOf(v) < 0) set.push(v); };
    if (q.type === 'miss') { add(q.b - 1); add(q.b + 1); add(q.b + 2); add(q.a); }
    else {
      add(q.a + q.b); add((q.a + 1) * q.b); add((q.a - 1) * q.b);
      add(q.a * (q.b + 1)); add(q.a * (q.b - 1)); add((q.a + 2) * q.b); add(q.a * (q.b + 2));
    }
    return set;
  }

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes); // 确定性：两次生成同关
    const n = L1.quizzes.length;
    let mathOk = true, rangeOkAll = true, noDup = true, itemsOk = true, distrOk = true;
    const texts = [];
    let missCount = 0, has89 = false;
    for (let k = 0; k < n; k++) {
      const q = L1.quizzes[k];
      if (q.type === 'mul') { if (q.a * q.b !== q.answer) mathOk = false; }            // a×b==answer
      else if (q.type === 'sum') {                                                      // 连加 Σ==answer（题面重算）
        const terms = q.pre.split(' = ')[0].split(' + ').map(Number);
        if (terms.length !== q.b || terms.some(v => v !== q.a) || terms.reduce((s, v) => s + v, 0) !== q.answer) mathOk = false;
      } else {                                                                          // 缺因数 b==c÷a
        if (!(q.c === q.a * q.b && q.answer === q.b && q.b === q.c / q.a)) mathOk = false;
        missCount++;
      }
      if (q.a === 8 || q.a === 9 || q.b === 8 || q.b === 9) has89 = true;
      if (!rangeOk(L1.dch, q)) rangeOkAll = false;                                      // 章语义独立审计
      if (texts.indexOf(q.text) >= 0) noDup = false;                                    // 同关无重复题
      texts.push(q.text);
      if (q.items.length !== 4 || new Set(q.items).size !== 4 ||
          q.items[q.answerIdx] !== q.answer || q.answerIdx < 0 || q.answerIdx > 3) itemsOk = false;
      q.items.forEach((v, idx) => {                                                     // 干扰=规则构造且≠answer
        if (idx === q.answerIdx) return;
        if (v === q.answer || candRules(q).indexOf(v) < 0) distrOk = false;
      });
      idxDist[q.answerIdx]++;
    }
    const types = L1.quizzes.map(q => q.type);
    let formOk = true;
    if (L1.dch === 1) formOk = types.join(',') === 'sum,sum,mul,mul,mul';               // 前半连加后半乘法
    if (L1.dch === 4) formOk = missCount === 1 && has89;                                // 恰 1 缺因数 + 含 ×8/×9
    if (L1.dch === 2 || L1.dch === 3) formOk = types.every(t => t === 'mul');
    let guard = 0;                                                                      // 引擎直驱：5 题全对通关
    while (!L1.done && guard++ < 10) engPick(L1, L1.quizzes[L1.step].answerIdx);
    const solvedAll = L1.done && L1.step === 5 && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && n === 5 && mathOk && rangeOkAll && noDup && itemsOk && distrOk && formOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, types: types, ok, mathOk, rangeOkAll, noDup,
      itemsOk, distrOk, formOk, solvedAll, det };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 单元：星级映射（全对 3 / 重试≤3 2星 / 否则 1，永不 0） ---- */
  total++;
  const sMap = r => engStars({ retries: r });
  const starsOk = sMap(0) === 3 && sMap(1) === 2 && sMap(3) === 2 && sMap(4) === 1 && sMap(99) === 1;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, map: { 0: sMap(0), 1: sMap(1), 3: sMap(3), 4: sMap(4), 99: sMap(99) } };

  /* ---- ② 单元：答错=灰掉可重点（计一次重试），正确鱼仍可答推进 ---- */
  total++;
  const L = genLevel(0), q0 = L.quizzes[0], wIdx = (q0.answerIdx + 1) % 4;
  const r1 = engPick(L, wIdx), r2 = engPick(L, wIdx), r3 = engPick(L, q0.answerIdx);
  const wrongOk = r1 === 'wrong' && r2 === 'again' && r3 === 'right' &&
    L.retries === 1 && L.step === 1 && q0.wrong.length === 1;
  if (wrongOk) npass++;
  units.wrongPick = { r1: r1, r2: r2, r3: r3, retries: L.retries, step: L.step, ok: wrongOk };

  /* ---- ③ UI 冒烟 1：TIM.autoSolve UI 路径通关第 1 关（真实 pick 流程，SPEED 提速） ---- */
  total++;
  startLevel(0);
  const as = await window.TIM.autoSolve();
  const lvA = window.TIM.currentLevel;
  const convFired = (convertEl.dataset.last || '').indexOf('×') >= 0;   // 连加→乘法转化动画触发过
  const uiOk = as.done && lvA.done && lvA.won && lvA.retries === 0 && engStars(cur) === 3 && convFired;
  if (uiOk) npass++;
  smokes.autoSolve = { done: as.done, picks: as.picks, won: lvA.won, retries: lvA.retries,
    convert: convertEl.dataset.last, ok: uiOk };

  /* ---- ③ UI 冒烟 2：分组图内容（flat 0 首题=连加）：组数==b、鱼总数==a*b、加号==b-1、答案气泡 4 个 ---- */
  total++;
  startLevel(0);
  groupAidToggle(true);
  const qG = cur.quizzes[0];
  const nGroups = aidEl.querySelectorAll('.a-group').length;
  const nFish = aidEl.querySelectorAll('.a-fish').length;
  const nPlus = aidEl.querySelectorAll('.a-plus').length;
  const nAns = aidEl.querySelectorAll('.aid-ans').length;
  groupAidToggle(false);
  const aidSmoke = aidState().open === false && qG.type === 'sum' &&
    nGroups === qG.b && nFish === qG.a * qG.b && nPlus === qG.b - 1 && nAns === 4;
  if (aidSmoke) npass++;
  smokes.aidGroup = { type: qG.type, groups: nGroups, expectG: qG.b, fish: nFish,
    expectF: qG.a * qG.b, plus: nPlus, ans: nAns, ok: aidSmoke };

  /* ---- ③ UI 冒烟 3：高章（flat 15=dch4）无辅助：按钮隐藏 + 答错不亮起（AID_MAX_DCH=3，评估 P1 后 dch3 也开辅助） ---- */
  total++;
  startLevel(15);
  const qH = cur.quizzes[0];
  const wH = (qH.answerIdx + 1) % 4;
  const hiddenBefore = groupsBtn.style.display === 'none';
  await uiPick(wH);
  const noAid = !aidEl.classList.contains('open');
  await window.TIM.autoSolve();                                   // 收尾通关，恢复中性状态
  const highOk = hiddenBefore && noAid && cur.dch === 4;
  if (highOk) npass++;
  smokes.aidHidden = { dch: 4, btnHidden: hiddenBefore, noAutoOpen: noAid, ok: highOk };

  /* ---- ③ UI 冒烟 4：aidAuto 消耗标记——答错自动亮起后首点不关闭、二点关闭 ---- */
  total++;
  startLevel(5);                                                  // flat 5 = ch2（低章，辅助可用）
  const qA2 = cur.quizzes[0];
  await uiPick((qA2.answerIdx + 1) % 4);                          // 先答错一次 → 辅助自动亮起
  const opened = aidEl.classList.contains('open');
  const st1 = groupAidToggle();                                   // 首次点按钮：消耗标记，不关闭
  const st2 = groupAidToggle();                                   // 二次点按钮：正常关闭
  await window.TIM.autoSolve();
  const autoOk = opened && st1.open && !st2.open;
  if (autoOk) npass++;
  smokes.aidAuto = { autoOpened: opened, firstClickOpen: st1.open, secondClickClosed: !st2.open, ok: autoOk };

  /* ---- ④ 布局抽查：4 条数字鱼 ≥96×96、间距 ≥16、无横向溢出、题面不超宽 ---- */
  total++;
  startLevel(3);
  const btns = fishGridEl.querySelectorAll('.fish-btn');
  const rs = Array.prototype.map.call(btns, b => b.getBoundingClientRect());
  const minW = Math.min.apply(null, rs.map(r => r.width));
  const minH = Math.min.apply(null, rs.map(r => r.height));
  let gapMin = 999;
  for (let a = 0; a < rs.length; a++) for (let b = 0; b < rs.length; b++) {
    if (a === b) continue;
    const dx = Math.abs(rs[a].x - rs[b].x), dy = Math.abs(rs[a].y - rs[b].y);
    if (dx > 1 && dy < 2) gapMin = Math.min(gapMin, dx - rs[a].width);
    if (dy > 1 && dx < 2) gapMin = Math.min(gapMin, dy - rs[a].height);
  }
  const de = document.documentElement;
  const layout = { overflowX: de.scrollWidth - window.innerWidth, btnW: Math.round(minW),
    btnH: Math.round(minH), gap: Math.round(gapMin), n: btns.length,
    quizW: Math.round($id('quiz-text').getBoundingClientRect().width) };
  const layoutOk = layout.overflowX <= 0 && minW >= 96 && minH >= 96 && gapMin >= 16 &&
    btns.length === 4 && layout.quizW <= window.innerWidth + 1;
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, layout: layout };

  /* ---- 分布断言：answerIdx 四位置都出现、首位不恒定（<60%） ---- */
  total++;
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[3] > 0 && idxDist[0] < 200 * 0.6;
  if (distOk) npass++;
  units.dist = { ok: distOk, idx: idxDist, n: 200 };

  const out = { game: 'times', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
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
