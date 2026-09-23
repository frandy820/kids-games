/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计：确定性 / 数学正确（题面==answer）/ 章范围合规（独立语义审计 rangeOk）/
     同关无重复题 / 干扰项=answer±1..3 且 ≥0 且互异 / 引擎直驱 autoSolve 通关（0 重试 3 星）
   ② 单元：星级映射 / 答错灰掉可重点（引擎语义）
   ③ UI 冒烟：autoSolve UI 路径通关 / 数轴展开冒烟（章 3）/ 苹果点数冒烟（章 1）
   ④ 布局：答案按钮 ≥80px、overflowX ≤0；answerIdx 分布不恒首位
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0];

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes); // 确定性：两次生成同关
    const n = L1.quizzes.length;
    let mathOk = true, rangeOkAll = true, noDup = true, itemsOk = true;
    const texts = [];
    for (let k = 0; k < n; k++) {
      const q = L1.quizzes[k];
      const expect = q.op === '+' ? q.a + q.b : q.op === '-' ? q.a - q.b : q.a + q.b + q.c;
      if (expect !== q.answer) mathOk = false;            // 题面与 answer 一致
      if (!rangeOk(L1.dch || L1.ch, q)) rangeOkAll = false;         // 章语义（SPEC §2）独立审计
      if (texts.indexOf(q.text) >= 0) noDup = false;      // 同关无重复题
      texts.push(q.text);
      if (q.items.length !== 3 || q.items[q.answerIdx] !== q.answer) itemsOk = false;
      const others = q.items.filter((v, idx) => idx !== q.answerIdx);
      if (others[0] === others[1] || others.indexOf(q.answer) >= 0) itemsOk = false;
      others.forEach(v => {
        const d = Math.abs(v - q.answer);
        if (v < 0 || d < 1 || d > 3) itemsOk = false;     // 干扰=±1..3 且 ≥0 且 ≠answer
      });
      idxDist[q.answerIdx]++;
    }
    let guard = 0;                                        // 引擎直驱：5 题全对通关
    while (!L1.done && guard++ < 10) engPick(L1, L1.quizzes[L1.step].answerIdx);
    const solvedAll = L1.done && L1.step === 5 && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && n === 5 && mathOk && rangeOkAll && noDup && itemsOk && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, kinds: L1.quizzes.map(q => q.op), ok, mathOk, rangeOkAll, noDup, itemsOk, solvedAll, det };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② 单元：星级映射（全对 3 / 重试≤3 2星 / 否则 1，永不 0） ---- */
  total++;
  const sMap = r => engStars({ retries: r });
  const starsOk = sMap(0) === 3 && sMap(1) === 2 && sMap(3) === 2 && sMap(4) === 1 && sMap(99) === 1;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, map: { 0: sMap(0), 1: sMap(1), 3: sMap(3), 4: sMap(4), 99: sMap(99) } };

  /* ---- ② 单元：答错=灰掉可重点（计一次重试），正确项仍可答推进 ---- */
  total++;
  const L = genLevel(0), q0 = L.quizzes[0], wIdx = (q0.answerIdx + 1) % 3;
  const r1 = engPick(L, wIdx), r2 = engPick(L, wIdx), r3 = engPick(L, q0.answerIdx);
  const wrongOk = r1 === 'wrong' && r2 === 'again' && r3 === 'right' &&
    L.retries === 1 && L.step === 1 && q0.wrong.length === 1;
  if (wrongOk) npass++;
  units.wrongPick = { r1: r1, r2: r2, r3: r3, retries: L.retries, step: L.step, ok: wrongOk };

  /* ---- ③ UI 冒烟 1：autoSolve UI 路径通关第 1 关（真实 pick 流程，SPEED 提速） ---- */
  total++;
  startLevel(0);
  const as = await window.MATH.autoSolve();
  const lvA = window.MATH.currentLevel;
  const uiOk = as.done && lvA.done && lvA.won && lvA.retries === 0 && engStars(cur) === 3;
  if (uiOk) npass++;
  smokes.autoSolve = { done: as.done, picks: as.picks, won: lvA.won, retries: lvA.retries, ok: uiOk };

  /* ---- ③ UI 冒烟 2：数轴辅助展开（章 3 = flat 10）：21 刻度 + 起点高亮 + 幂等收起 ---- */
  total++;
  startLevel(10);
  countAidToggle(true);
  const svg = aidEl.querySelector('svg.numline');
  const st1 = aidState();
  let lineDom = false;
  if (svg) {
    const nLines = svg.querySelectorAll('line').length;        // 21 刻度 + 1 主轴 = 22
    lineDom = nLines === 22 && !!svg.querySelector('.nl-start') && !!svg.querySelector('.nl-ring') &&
      svg.querySelectorAll('text').length >= 5;                // 数字 0/5/10/15/20
  }
  countAidToggle(false);
  const st2 = aidState();
  const lineSmoke = st1.open && st1.kind === 'line' && lineDom && !st2.open;
  if (lineSmoke) npass++;
  smokes.numline = { open: st1.open, kind: st1.kind, domOk: lineDom, closed: !st2.open, ok: lineSmoke };

  /* ---- ③ UI 冒烟 3：苹果点数辅助（章 1）：加法两组=a+b 个 / 减法 a 个且划掉 b 个 ---- */
  total++;
  startLevel(0);
  countAidToggle(true);
  const qA = cur.quizzes[0];
  const nAp = aidEl.querySelectorAll('.appl').length;
  const nCross = aidEl.querySelectorAll('.appl.crossed').length;
  const expAp = qA.op === '+' ? qA.a + qA.b : qA.a;
  const appleSmoke = aidState().kind === 'apple' && nAp === expAp &&
    (qA.op === '+' ? true : nCross === qA.b);
  countAidToggle(false);
  if (appleSmoke) npass++;
  smokes.apple = { op: qA.op, text: qA.text, apples: nAp, expect: expAp, crossed: nCross, ok: appleSmoke };

  /* ---- ④ 布局抽查：3 答案按钮 ≥80×80、无横向溢出 ---- */
  total++;
  startLevel(3);
  const btns = answersEl.querySelectorAll('.ans');
  const rs = Array.prototype.map.call(btns, b => b.getBoundingClientRect());
  const minW = Math.min.apply(null, rs.map(r => r.width));
  const minH = Math.min.apply(null, rs.map(r => r.height));
  const de = document.documentElement;
  const layout = { overflowX: de.scrollWidth - window.innerWidth, btnW: Math.round(minW), btnH: Math.round(minH), n: btns.length };
  const layoutOk = layout.overflowX <= 0 && minW >= 80 && minH >= 80 && btns.length === 3;
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, layout: layout };

  /* ---- 分布断言：answerIdx 三位置都出现、首位不恒定（<60%） ---- */
  total++;
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[0] < 200 * 0.6;
  if (distOk) npass++;
  units.dist = { ok: distOk, idx0: idxDist[0], idx1: idxDist[1], idx2: idxDist[2], n: 200 };

  const out = { game: 'math', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
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
  runVerify();
}
