/* ================= ?verify=1 自检（仅 verify 分支加载执行；r31 断言联动 SPEC-R31 §R8）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成 JSON 一致）/
     structWhy(q,dch)（8 型公式+域+候选 3 张互异含答案域 1-20+hidden 藏牌律派生复算）/
     章结构合规（ch1 plus n1-9；ch2 minus n2-10；ch3 n10-19+跨十 19→20 与 10→9 各 1+±2 恰 1；
     ch4 plus/minus/mid 各 1+X 族（plus2/minus2/mid4）恰 1+dual 恰 1）/
     相邻题不重样（mode+n）/ 引擎直驱（wrong 计一次错→again 早退→逐题答对通关 2 星）
   ② tapOption 单元：wrong=晃动+灰掉(pointer-events:none)+miss 计数+首错不 pulse /
     已灰牌 hook 点击=again 零惩罚 / 非法下标 false / 答对 step 推进+空房挂上号
   ③ UI 冒烟 A：flat0 真实通路通关（1 错=2 星，verify 页不弹层）；空房 DOM ? → 填后亮号
   ④ UI 冒烟 B1：flat12（dch3）街道 8-20 十三房+跨十专项+±2 在场+盲牌 DOM+autoSolve 3 星；
     B2：flat17（dch4）mid 题空房居中+两侧锚点房 .ref+dual 在场+盲牌 DOM+dual 答对两跳
     （__dualJumpN）+真实 tapOption 通关；B3（r31 新）：dual miss≥2 支架演示链
     （连错 2→650ms 街道两跳演示计数递增→s 牌揭示→复盲）
   ⑤ 布局：双 viewport（1280×800 / 800×1180）×（dch3 / dch4）：房数齐全、门牌 DOM 数字
     与房号一致（空房=?、盲牌='·'——r31 双向断言）、空房恰 1 且=answer、问号旗可见、
     候选门牌 ≥96、按钮 ≥64、空房左右邻亮藏与 hidden 律一致、overflowX ≤0
   ⑥ 分布与专项：40 关 mode 分布（ch1 全 plus 50/ch2 全 minus 50/ch3 双向+±2 共 10/
     ch4 plus=minus=mid=10+X 族 10+dual 10 精确值）/ 跨十 19→20 与 10→9 各 ≥10（保底下界，
     与断言 crossUp/crossDown >=10 一致——普通 ±1 槽随机可再中 19/10，实测 crossUp=11） /
     numCn 1-20 与独立字表逐一相符且互异（门牌↔TTS 数词一致）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const MD0 = () => ({ plus: 0, minus: 0, plus2: 0, minus2: 0, mid: 0, mid4: 0, dualA: 0, dualB: 0 });
  const modeDist = { 1: MD0(), 2: MD0(), 3: MD0(), 4: MD0() };
  let crossUp = 0, crossDown = 0;               // 19→20 / 10→9 计数（每关各 1 → 40 关各 10）

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    let structAll = true, ruleOk = true, adjOk = true, driveOk = true, hideOk = true;
    let has19 = false, has10 = false, has22 = 0, hasP = false, hasM = false, hasMid = false;
    let newX = 0, dualN = 0;
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (structWhy(q, L1.dch)) structAll = false;
      if (L1.dch === 1 && !(q.mode === 'plus' && q.n >= 1 && q.n <= 9)) ruleOk = false;
      if (L1.dch === 2 && !(q.mode === 'minus' && q.n >= 2 && q.n <= 10)) ruleOk = false;
      if (L1.dch === 3) {
        if (!(q.n >= 10 && q.n <= 19)) ruleOk = false;                        // ±1/±2 大数字域
        if (q.mode === 'plus2' && !(q.n >= 10 && q.n <= 18)) ruleOk = false;
        if (q.mode === 'minus2' && !(q.n >= 12 && q.n <= 19)) ruleOk = false;
        if (q.mode === 'plus2' || q.mode === 'minus2') has22++;
        /* r31 藏牌律独立复算：hidden=空房两邻中非 refs（域内），dch<3 恒空 */
        const hh = hiddenNums(q, 3);
        const hhOk = (q.hidden || []).length === hh.length && (q.hidden || []).every(v => hh.indexOf(v) >= 0);
        if (!hhOk) hideOk = false;
      }
      if (L1.dch === 4) {
        if (q.mode === 'mid' && !(q.n >= 1 && q.n <= 18)) ruleOk = false;
        if (q.mode === 'plus2' && !(q.n >= 1 && q.n <= 18)) ruleOk = false;
        if (q.mode === 'minus2' && !(q.n >= 3 && q.n <= 20)) ruleOk = false;
        if (q.mode === 'mid4' && !(q.n >= 1 && q.n <= 16)) ruleOk = false;
        if (q.mode === 'dualA' || q.mode === 'dualB') {
          if (!(q.n >= 12 && q.n <= 18)) ruleOk = false;
          dualN++;
          if (!(q.options.indexOf(q.s) >= 0)) ruleOk = false;                 // s 恒为候选（忘第二步捕获器）
        }
        if (q.mode === 'plus2' || q.mode === 'minus2' || q.mode === 'mid4') newX++;
        const hh = hiddenNums(q, 4);
        const hhOk = (q.hidden || []).length === hh.length && (q.hidden || []).every(v => hh.indexOf(v) >= 0);
        if (!hhOk) hideOk = false;
      }
      if (L1.dch < 3 && (q.hidden || []).length !== 0) hideOk = false;        // ch1/2 恒全亮
      if (q.mode === 'plus' && q.n === 19) has19 = true;                     // 19→20 跨十
      if (q.mode === 'minus' && q.n === 10) has10 = true;                    // 10→9 退十
      if (q.mode === 'plus') hasP = true;
      if (q.mode === 'minus') hasM = true;
      if (q.mode === 'mid') hasMid = true;
      modeDist[L1.dch][q.mode]++;
      if (L1.dch === 3 && (q.mode === 'plus' && q.n === 19)) crossUp++;
      if (L1.dch === 3 && (q.mode === 'minus' && q.n === 10)) crossDown++;
      if (k > 0) {
        const p = L1.quizzes[k - 1];
        if (p.mode === q.mode && p.n === q.n) adjOk = false;                 // 相邻题不重样
      }
    }
    if (L1.dch === 3 && !(has19 && has10 && has22 === 1)) ruleOk = false;    // 跨十×2+±2 恰 1
    if (L1.dch === 4 && !(hasP && hasM && hasMid && newX === 1 && dualN === 1)) ruleOk = false;   // 五槽结构
    /* 引擎直驱：先错一次（wrong 计一次错+灰牌）→ 已灰牌 again 早退 → 逐题答对通关（2 星） */
    const Ld = genLevel(flat);
    const q0 = Ld.quizzes[0];
    const w0 = q0.options.findIndex(v => v !== q0.answer);
    if (engTap(Ld, w0) !== 'wrong' || Ld.retries !== 1 || q0._miss !== 1 || !q0._dim[w0]) driveOk = false;
    if (engTap(Ld, w0) !== 'again' || Ld.retries !== 1) driveOk = false;     // 已灰牌防御层
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const want = k === Ld.quizzes.length - 1 ? 'done' : 'goal';
      if (engTap(Ld, q.options.indexOf(q.answer)) !== want) driveOk = false;
      if (!q._filled) driveOk = false;
    }
    const solvedAll = Ld.done && Ld.step === CH_LEN && Ld.retries === 1 && engStars(Ld) === 2;
    const ok = det && L1.quizzes.length === CH_LEN && structAll && ruleOk && adjOk && hideOk &&
      driveOk && Ld.done;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, ruleOk: ruleOk,
      hideOk: hideOk, adjOk: adjOk, driveOk: driveOk && solvedAll,
      qs: L1.quizzes.map(q => q.mode + 'n' + q.n + '→' + q.answer + '[h:' + (q.hidden || []).join(',') + '][' + q.options.join(',') + ']') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapOption 单元（flat 0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = NEB.quiz;
  const emptyDom0 = houseEl(q0.answer);
  const emptyIsQ = emptyDom0 && emptyDom0.classList.contains('empty') &&
    emptyDom0.querySelector('.plate').textContent === '?';
  const wIdx = q0.options.findIndex(v => v !== q0.answer);
  const okIdx = q0.options.indexOf(q0.answer);
  const rW = await NEB.tapOption(wIdx);         // 答错：晃动灰掉+miss 计数+首错不 pulse
  const wEl = plateEl(wIdx), okEl = plateEl(okIdx);
  const wrongOk = rW === 'wrong' && NEB.quiz.miss === 1 && NEB.currentLevel.retries === 1 &&
    NEB.quiz.step === 0 && wEl.classList.contains('dim') && wEl.classList.contains('wig') &&
    getComputedStyle(wEl).pointerEvents === 'none' && !okEl.classList.contains('breathe');
  const rA = await NEB.tapOption(wIdx);         // 已灰牌 hook 点击：again 早退零惩罚
  const againOk = rA === 'again' && NEB.quiz.miss === 1 && NEB.currentLevel.retries === 1;
  const badIdx = (await NEB.tapOption(3)) === false && (await NEB.tapOption(-1)) === false &&
    (await NEB.tapOption('x')) === false;
  const pOk = NEB.tapOption(okIdx);             // 答对：step 推进+空房挂上号亮灯
  /* uiTapOption 同步前缀内已完成 fillHouse（随后才进 950ms 演出窗）——此处同步读 DOM 恰在窗内 */
  const fillDom = houseEl(q0.answer);
  const fillOk = fillDom.classList.contains('filled') && !fillDom.classList.contains('empty') &&
    fillDom.querySelector('.plate').textContent === String(q0.answer) &&
    !!fillDom.querySelector('.win svg');
  const rOk = await pOk;
  const stepOk = rOk === 'goal' && NEB.quiz && NEB.quiz.step === 1 && fillOk;
  const tapOk = emptyIsQ && wrongOk && againOk && badIdx && stepOk;
  if (tapOk) npass++;
  units.tapOption = { ok: tapOk, emptyIsQ: emptyIsQ, wrong: wrongOk, again: againOk,
    badIdx: badIdx, step: stepOk };

  /* ---- ③ UI 冒烟 A：flat0 真实通路通关（首题先错一次 → 1 错=2 星，verify 页不弹层） ---- */
  total++;
  startLevel(0);
  let smokeA = true, wrongOk2 = false, steps = 0;
  for (let s = 0; s < CH_LEN && smokeA; s++) {
    const q = NEB.quiz;
    if (!q) { smokeA = false; break; }
    if (s === 0) {                             // 首错：灰牌零惩罚；首错不 pulse 正确牌
      const w = q.options.findIndex(v => v !== q.answer);
      await NEB.tapOption(w);
      wrongOk2 = NEB.currentLevel.retries === 1 && NEB.currentLevel.step === 0 &&
        !plateEl(q.options.indexOf(q.answer)).classList.contains('breathe');
    }
    const r = await NEB.tapOption(q.options.indexOf(q.answer));
    if (r !== 'goal' && r !== 'done') smokeA = false;
    steps++;
  }
  const lvA = NEB.currentLevel;
  const smokeOkA = smokeA && wrongOk2 && steps === CH_LEN && lvA.done && lvA.won && lvA.retries === 1 &&
    engStars(cur) === 2 && !document.querySelector('.k-celebrate');   // verify 页不弹层
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, wrongOk: wrongOk2, steps: steps, retries: lvA.retries, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B1：flat12（dch3）街道 8-20 + 跨十专项 + ±2 在场 + 盲牌 DOM + autoSolve 3 星 ---- */
  total++;
  startLevel(12);
  const q12 = NEB.quiz;
  const nums12 = Array.prototype.map.call(streetEl.querySelectorAll('.house'), h => +h.dataset.n);
  const L12 = genLevel(12);
  const crossOk = L12.quizzes.some(q => q.mode === 'plus' && q.n === 19) &&
    L12.quizzes.some(q => q.mode === 'minus' && q.n === 10);
  const pm2Ok = L12.quizzes.some(q => q.mode === 'plus2' || q.mode === 'minus2');   // r31 ±2 恰 1
  const streetOk12 = nums12.length === 13 && nums12[0] === 8 && nums12[12] === 20 &&
    streetEl.querySelectorAll('.house.empty').length === 1 &&
    houseEl(q12.answer).classList.contains('empty');
  /* r31 盲牌 DOM（视觉诚实）：盲牌数=hidden 数、牌面恒 '·'、房号∈hidden、ref 房恒亮数字 */
  const bl12 = streetEl.querySelectorAll('.house.blind');
  const blindOk12 = bl12.length === q12.hidden.length &&
    Array.prototype.every.call(bl12, h =>
      h.querySelector('.plate').textContent === '·' && q12.hidden.indexOf(+h.dataset.n) >= 0) &&
    refNums(q12).every(r => {
      const h = houseEl(r);
      return h && h.classList.contains('ref') && h.querySelector('.plate').textContent === String(r);
    });
  const a12 = await NEB.autoSolve();
  const lv12 = NEB.currentLevel;
  const smokeOkB1 = crossOk && pm2Ok && streetOk12 && blindOk12 && a12.done && lv12.done && lv12.won &&
    lv12.retries === 0 && engStars(cur) === 3;
  if (smokeOkB1) npass++;
  smokes.flat12 = { ok: smokeOkB1, cross: crossOk, pm2: pm2Ok, street: streetOk12, blind: blindOk12,
    qs: L12.quizzes.map(q => q.mode + ':' + q.n), taps: a12.taps, stars: engStars(cur) };

  /* ---- ④ UI 冒烟 B2：flat17（dch4）五槽结构+mid refs+dual 两跳（__dualJumpN）+盲牌+真实通关 ---- */
  total++;
  startLevel(17);
  const L17 = genLevel(17);
  const modes17 = L17.quizzes.map(q => q.mode);
  const kindsOk = modes17.indexOf('plus') >= 0 && modes17.indexOf('minus') >= 0 &&
    modes17.indexOf('mid') >= 0 && (modes17[4] === 'dualA' || modes17[4] === 'dualB');
  let midDomOk = false, blindOk17 = true;
  const midIdx = modes17.indexOf('mid');
  const jump0 = window.__dualJumpN;
  let dualJumped = false;
  for (let s = 0; s < CH_LEN; s++) {
    const q = NEB.quiz;
    if (!q) break;
    /* r31 盲牌 DOM + refs 恒亮（每题校验——mid 零藏例外自动通过 0===0） */
    const bl17 = streetEl.querySelectorAll('.house.blind');
    if (bl17.length !== q.hidden.length) blindOk17 = false;
    Array.prototype.forEach.call(bl17, h => {
      if (h.querySelector('.plate').textContent !== '·' || q.hidden.indexOf(+h.dataset.n) < 0) blindOk17 = false;
    });
    refNums(q).forEach(r => {
      const h = houseEl(r);
      if (!h || !h.classList.contains('ref') || h.querySelector('.plate').textContent !== String(r)) blindOk17 = false;
    });
    if (s === midIdx) {                        // mid 题：空房=n+1 居中，两侧锚点房 .ref 恒亮
      const eDom = houseEl(q.answer), lDom = houseEl(q.n), rDom = houseEl(q.n + 2);
      midDomOk = !!eDom && eDom.classList.contains('empty') &&
        !!lDom && lDom.classList.contains('ref') && lDom.querySelector('.plate').textContent === String(q.n) &&
        !!rDom && rDom.classList.contains('ref') && rDom.querySelector('.plate').textContent === String(q.n + 2);
    }
    if (q.mode === 'dualB') {                  // dualB 的 s=n+2 恒藏（演示/答对前盲）
      const sH = houseEl(q.s);
      if (!sH || sH.querySelector('.plate').textContent !== '·') blindOk17 = false;
    }
    await NEB.tapOption(q.options.indexOf(q.answer));
    if (s === 4 && window.__dualJumpN > jump0) dualJumped = true;   // dual 答对两跳演出取证
  }
  const lv17 = NEB.currentLevel;
  const smokeOkB2 = kindsOk && (midIdx < 0 || midDomOk) && blindOk17 && dualJumped &&
    lv17.done && lv17.won && lv17.retries === 0;
  if (smokeOkB2) npass++;
  smokes.flat17 = { ok: smokeOkB2, kinds: kindsOk, midDom: midDomOk, blind: blindOk17,
    dualJump: dualJumped, modes: modes17, retries: lv17.retries };

  /* ---- ④ UI 冒烟 B3（r31 新）：dual miss≥2 支架演示链（pulse+两跳街道演示+s 复盲+通关） ---- */
  total++;
  startLevel(15);
  let b3run = true, demoSeen = false, reblindOk = true, pulseOk = false;
  for (let s = 0; s < 4 && b3run; s++) {        // 逐题答对推进到 qi4=dual
    const q = NEB.quiz;
    if (!q) { b3run = false; break; }
    await NEB.tapOption(q.options.indexOf(q.answer));
  }
  const qd = NEB.quiz;
  if (!b3run || !qd || (qd.mode !== 'dualA' && qd.mode !== 'dualB')) b3run = false;
  let b3retries = -1;
  if (b3run) {
    const j0 = window.__dualJumpN;
    const wrongs = [0, 1, 2].filter(i => qd.options[i] !== qd.answer);
    await NEB.tapOption(wrongs[0]);             // miss=1：首错不 pulse
    await NEB.tapOption(wrongs[1]);             // miss=2：pulse 正确牌 + 650ms 后两跳演示
    pulseOk = plateEl(qd.options.indexOf(qd.answer)).classList.contains('breathe');
    await wait(650 * SPEED + 420 * SPEED + 200);
    demoSeen = window.__dualJumpN > j0;         // 演示已起跳
    await wait(820 * SPEED + 250 * SPEED + 100);   // 演示收尾
    if (qd.hidden.indexOf(qd.s) >= 0) {         // dualB：s 藏牌 → 演示揭示后必须复盲（揭示→复盲往返）
      const sH = houseEl(qd.s);
      if (!sH || sH.querySelector('.plate').textContent !== '·') reblindOk = false;
    } else {                                    // dualA（r31 修复 M1）：s=n+1 亮牌 → 演示仅 reveal 高亮，牌面恒真数字不被写 '·'
      const sH = houseEl(qd.s);
      if (!sH || sH.querySelector('.plate').textContent !== String(qd.s)) reblindOk = false;
    }
    const r15 = await NEB.tapOption(qd.options.indexOf(qd.answer));   // 演示后答对（两跳再演）
    b3retries = NEB.currentLevel.retries;
    b3run = r15 === 'done' && NEB.currentLevel.done && b3retries === 2 && engStars(cur) === 2;   // retries=2 → 2 星（值域核对）
  }
  const smokeOkB3 = b3run && demoSeen && pulseOk && reblindOk;
  if (smokeOkB3) npass++;
  smokes.flat15 = { ok: smokeOkB3, demo: demoSeen, pulse: pulseOk, reblind: reblindOk,
    retries: b3retries, stars: b3run ? engStars(cur) : 0 };

  /* ---- ⑤ 布局：双 viewport 模拟 ×（dch3 十三房 / dch4 二十房） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();                               // 按新场地尺寸重排
    const de = document.documentElement;
    const q = NEB.quiz;
    const lo = STREET[cur.dch][0], hi = STREET[cur.dch][1];
    const houses = Array.prototype.slice.call(streetEl.querySelectorAll('.house'));
    const countOk = houses.length === hi - lo + 1 &&
      houses.every(h => { const n = +h.dataset.n; return n >= lo && n <= hi; });
    let platesOk = true;                        // 门牌 DOM 与房号一致（空房=? 恰 1；盲牌='·' 恒不泄号）
    houses.forEach(h => {
      const t = h.querySelector('.plate').textContent;
      if (h.classList.contains('empty')) { if (t !== '?') platesOk = false; }
      else if (h.classList.contains('blind')) { if (t !== '·') platesOk = false; }
      else if (t !== String(h.dataset.n)) platesOk = false;
    });
    const emptyOk = streetEl.querySelectorAll('.house.empty').length === 1 &&
      houseEl(q.answer).classList.contains('empty');
    const flag = streetEl.querySelector('.house.empty .qflag');
    const fr = flag ? flag.getBoundingClientRect() : null;
    const flagOk = !!fr && fr.width >= 12 && fr.height >= 14;
    let anchorOk = true;                        /* r31 藏牌律双向：空房左右邻（域内者）
                                                   藏者恒 '·'、亮者恒数字——与 q.hidden 一致 */
    [q.answer - 1, q.answer + 1].forEach(n => {
      if (n < lo || n > hi) return;
      const h = houseEl(n);
      const hid = (q.hidden || []).indexOf(n) >= 0;
      const t = h ? h.querySelector('.plate').textContent : '';
      if (!h || (hid ? t !== '·' : t !== String(n))) anchorOk = false;
    });
    const plates = Array.prototype.map.call(platesEl.querySelectorAll('.platebtn'), b => b.getBoundingClientRect());
    const hitOk = plates.length === 3 && plates.every(r => r.width >= 96 && r.height >= 96);
    let btnOk = true;                           // 全部按钮 ≥64（.k-parentbtn 家长按钮豁免）
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const fRect = fieldEl.getBoundingClientRect();
    const insideOk = houses.every(h => {
      const r = h.getBoundingClientRect();
      return r.left >= fRect.left - 1 && r.right <= fRect.right + 1 &&
        r.top >= fRect.top - 1 && r.bottom <= fRect.bottom + 1;
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, dch: cur.dch, countOk: countOk, platesOk: platesOk, emptyOk: emptyOk,
      flagOk: flagOk, anchorOk: anchorOk, hit96: hitOk, btn64: btnOk, insideOk: insideOk, ox: ox,
      pass: countOk && platesOk && emptyOk && flagOk && anchorOk && hitOk && btnOk && insideOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [12, 17]) {                // dch3 十三房 / dch4 二十房
    startLevel(flat);
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                // 还原真实 viewport 布局
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑥ 分布与专项：mode 分布 / 跨十计数 / numCn 独立字表对账 / clips 注入（T46） ---- */
  total++;
  const NUMCN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];   // 独立字表（零手抄对账）
  let cnOk = true;
  const seenCn = {};
  for (let i = 1; i <= 20; i++) {
    if (numCn(i) !== NUMCN[i]) cnOk = false;
    if (seenCn[numCn(i)]) cnOk = false;         // 互异（门牌号↔数词一一对应）
    seenCn[numCn(i)] = 1;
  }
  /* T46 阶段2（2026-09-19）：题面段链 39（neb_mid_1-18 整段对+neb_n_1-20 数词+neb_wrong 纠错）
     +既有 6=45 neb_，加 core 3=48；r31 5 新键主线已注册（manifest 5109→5114）→53。
     r31 修复 m2：5 新键（neb_qp2/neb_qm2/neb_and/neb_dual_a/neb_dual_b）并入 NEB_KEYS
     ——clipOk 的 every 存在性断言随 nClips===53 同步锁新键 */
  const NEB_KEYS = ['neb_tut_watch', 'neb_tut_turn', 'neb_hint', 'neb_q1', 'neb_q2', 'neb_q4',
    'neb_qp2', 'neb_qm2', 'neb_and', 'neb_dual_a', 'neb_dual_b', 'neb_wrong']
    .concat(Array.from({ length: 18 }, (_, i) => 'neb_mid_' + (i + 1)))
    .concat(Array.from({ length: 20 }, (_, i) => 'neb_n_' + (i + 1)));
  const coreKeys = Object.keys(KIDS.voice.clips).filter(k => k.indexOf('core_') === 0);
  const nClips = Object.keys(KIDS.voice.clips).length;
  const clipOk = nClips === 53 && NEB_KEYS.every(k => !!KIDS.voice.clips[k]) && coreKeys.length === 3;
  /* r31 分布精确值（确定性谱推导，SPEC-R31 §R3）：ch1 全 plus 50/ch2 全 minus 50；
     ch3 双向±1 共 40+±2 共 10（每关恰 1）+跨十专项每关各 ≥1（普通槽随机可再中 19/10
     ——crossUp=11 实测即此，断言下界 10=专项保底）；ch4 plus=minus=mid=10（每关各 1）
     +X 族共 10+dual 共 10 */
  const distOk = cnOk && clipOk && crossUp >= 10 && crossDown >= 10 &&
    modeDist[1].plus === 50 && modeDist[1].minus === 0 && modeDist[1].mid === 0 &&
    modeDist[2].minus === 50 && modeDist[2].plus === 0 && modeDist[2].mid === 0 &&
    modeDist[3].plus > 0 && modeDist[3].minus > 0 && modeDist[3].mid === 0 &&
    modeDist[3].plus + modeDist[3].minus === 40 &&
    modeDist[3].plus2 + modeDist[3].minus2 === 10 &&
    modeDist[4].plus === 10 && modeDist[4].minus === 10 && modeDist[4].mid === 10 &&
    modeDist[4].plus2 + modeDist[4].minus2 + modeDist[4].mid4 === 10 &&
    modeDist[4].dualA + modeDist[4].dualB === 10;
  if (distOk) npass++;
  units.dist = { ok: distOk, numCn: cnOk, clips: clipOk, nClips: nClips,
    missing: NEB_KEYS.filter(k => !KIDS.voice.clips[k]),
    crossUp: crossUp, crossDown: crossDown, modeDist: modeDist };

  const out = { game: 'neighbors', total: total, pass: npass, layoutOk: layoutOk,
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
