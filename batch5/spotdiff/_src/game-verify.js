/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关（flat 0-39）全量审计：确定性 / K 与元素数在章区间 /
     差异类型合法（类型在元素白名单，color 必换色 / size 必变径 / move 必位移 ≥50 /
     del 上图有下图无 / add 下图有上图无）/ 非差异元素两图一致 / 差异点位两两 ≥120 /
     点位在图内 / 元素中心在 viewBox 内 / 下图元素两两不重叠 / 引擎直驱 autoSolve 通关
   ② tapAt 判定单元：正例（diff 坐标 ±60 内命中）/ 负例（远离全部差异不命中、计罚）
   ③ UI 冒烟：autoSolve UI 路径通关 flat0（K=2）与 flat17（K=5）+ 进度点 DOM 断言
   ④ 布局：上下图各 ≥200px 高、命中热区（透明 hit 圆）直径 ≥127px、overflowX ≤0
   ⑤ 零惩罚：点空白计 miss 不锁关；首错不出高亮圈，连错 2 次才出
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const RAD2 = (a, b, c, d) => { const x = a - c, y = b - d; return Math.sqrt(x * x + y * y); };
  const N_RANGE = { 1: [6, 8], 2: [8, 10], 3: [10, 12], 4: [12, 13] };   // 元素数章区间（含太阳+小兔）

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const typeDist = {};
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const strip = L => ({ k: L.k, els: L.els, diffs: L.diffs });
    const det = JSON.stringify(strip(L1)) === JSON.stringify(strip(L2));   // 确定性
    const dch = L1.dch;
    const kOk = L1.k === CHAPTERS[dch].k && L1.diffs.length === L1.k;
    const nOk = L1.els.length >= N_RANGE[dch][0] && L1.els.length <= N_RANGE[dch][1];
    let typesOk = true, posOk = true, spaceOk = true, elsInOk = true, topBotOk = true;
    const bot = bottomEls(L1);
    const byEi = ei => bot.filter(b => b.ei === ei);
    L1.diffs.forEach(d => {
      typeDist[d.type] = (typeDist[d.type] || 0) + 1;
      if (d.x < 62 || d.x > VB_W - 62 || d.y < 52 || d.y > VB_H - 34) posOk = false;   // 点位在图内
      if (d.type === 'add') {
        if (ADD_KINDS.indexOf(d.el.kind) < 0) typesOk = false;
        if (byEi(-1).filter(b => b.x === d.el.x && b.y === d.el.y).length < 1) topBotOk = false;
      } else {
        const e = L1.els[d.ei];
        if (!e || DIFFABLE[e.kind].indexOf(d.type) < 0) { typesOk = false; return; }
        const be = byEi(d.ei)[0];
        if (d.type === 'color') { if (!be || be.c === e.c) topBotOk = false; }
        if (d.type === 'size') { if (!be || Math.abs(be.s - e.s) < 0.3 || be.s !== d.s2) topBotOk = false; }
        if (d.type === 'move') { if (!be || Math.abs(be.x - e.x) < 50) topBotOk = false; }
        if (d.type === 'del') { if (be) topBotOk = false; }
      }
    });
    for (let a = 0; a < L1.diffs.length; a++)                                  // 差异点位两两 ≥120
      for (let b = a + 1; b < L1.diffs.length; b++) {
        const p = L1.diffs[a], q = L1.diffs[b];
        if (RAD2(p.x, p.y, q.x, q.y) < 119.5) spaceOk = false;
      }
    L1.els.forEach(e => {                                                      // 元素视觉边界在图内（VIS 含描边/花茎/兔耳）
      const vw = VIS[e.kind][0], vh = VIS[e.kind][1];
      if (e.x - vw < 4 || e.x + vw > VB_W - 4 || e.y - vh < 4 || e.y + vh > VB_H - 4) elsInOk = false;
      if ((e.kind === 'flower' || e.kind === 'mushroom' || e.kind === 'rabbit') && e.y < 262) elsInOk = false;   // 草带在草上
      if ((e.kind === 'butterfly') && e.y > 226) elsInOk = false;              // 蝴蝶在空中
    });
    bot.forEach(e => {                                                         // 下图元素（放大/新增）同受图内约束
      const vw = VIS[e.kind][0] * Math.max(1, e.s), vh = VIS[e.kind][1] * Math.max(1, e.s);
      if (e.x - vw < 2 || e.x + vw > VB_W - 2 || e.y - vh < 2 || e.y + vh > VB_H - 2) elsInOk = false;
    });
    let overlapOk = true, ovDetail = '';                                        // 下图元素两两不重叠（抖动/移动余量）
    for (let a = 0; a < bot.length && overlapOk; a++)
      for (let b = a + 1; b < bot.length && overlapOk; b++) {
        const need = RAD[bot[a].kind] * Math.max(1, bot[a].s) + RAD[bot[b].kind] * Math.max(1, bot[b].s) - 22;
        if (RAD2(bot[a].x, bot[a].y, bot[b].x, bot[b].y) < need) {
          overlapOk = false; ovDetail = bot[a].kind + '/' + bot[b].kind + '=' + RAD2(bot[a].x, bot[a].y, bot[b].x, bot[b].y).toFixed(0);
        }
      }
    const countOk = bot.length === L1.els.length - L1.diffs.filter(d => d.type === 'del').length +
      L1.diffs.filter(d => d.type === 'add').length;
    L1.els.forEach(e => {                                                      // 非差异元素两图一致
      if (L1.diffs.some(d => d.ei === e.ei)) return;
      const be = byEi(e.ei)[0];
      if (!be || be.x !== e.x || be.y !== e.y || be.s !== e.s || be.c !== e.c) topBotOk = false;
    });
    /* 引擎直驱：逐差异中心点击 → 全找到通关（0 错点 3 星）；远离点计罚不推进 */
    L1.diffs.forEach(d => engTap(L1, d.x, d.y, 60));
    const solved = engWon(L1) && L1.foundCount === L1.k && L1.misses === 0 && engStars(L1) === 3;
    const ok = det && kOk && nOk && typesOk && posOk && spaceOk && elsInOk && overlapOk && countOk && topBotOk && solved;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: dch, k: L1.k, els: L1.els.length, ok: ok, det: det, kOk: kOk, nOk: nOk,
      typesOk: typesOk, posOk: posOk, spaceOk: spaceOk, elsInOk: elsInOk, overlapOk: overlapOk,
      countOk: countOk, topBotOk: topBotOk, solved: solved, types: L1.diffs.map(d => d.type) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapAt 判定单元：负例先行（远离全部差异不命中、计罚不推进）+ 正例（±60 邻域命中） ---- */
  total++;
  startLevel(0);
  const qz = SPD.quiz;
  let far = null;
  outer:
  for (let gy = 90; gy <= 420; gy += 30) {
    for (let gx = 80; gx <= 720; gx += 30) {
      if (qz.diffs.every(d => RAD2(gx, gy, d.x, d.y) >= 150)) { far = [gx, gy]; break outer; }
    }
  }
  let negOk = false;
  const negCase = [];
  if (far) {
    const res = await SPD.tapAt(far[0], far[1]);
    const lv = SPD.currentLevel;
    negOk = res.r === 'miss' && lv.misses === 1 && lv.foundCount === 0 && !lv.done;
    negCase.push({ p: far, r: res.r, misses: lv.misses, found: lv.foundCount });
  }
  const posCases = [];
  const offs = [[-60, 0], [0, 60], [42, -42]];
  let posOk = true;
  for (let i = 0; i < qz.k; i++) {
    for (let oi = 0; oi < offs.length; oi++) {
      startLevel(0);                              // 每例独立新关（同一确定性关）
      const d = SPD.quiz.diffs[i];
      const res = await SPD.tapAt(d.x + offs[oi][0], d.y + offs[oi][1]);
      const lv = SPD.currentLevel;
      const good = (res.r === 'right' || res.r === 'done') && lv.foundCount === 1 && lv.misses === 0;
      posCases.push({ i: i, off: offs[oi], r: res.r, found: lv.foundCount, good: good });
      if (!good) posOk = false;
    }
  }
  const tapOk = posOk && negOk && posCases.length === qz.k * 3;
  if (tapOk) npass++;
  units.tapAt = { ok: tapOk, posOk: posOk, negOk: negOk, pos: posCases, neg: negCase };

  /* ---- ③ UI 冒烟：autoSolve UI 路径通关 flat0（K=2）/ flat17（K=5）+ 进度点 DOM ---- */
  for (const f of [0, 17]) {
    total++;
    startLevel(f);
    const a = await SPD.autoSolve();
    const lv = SPD.currentLevel;
    const dots = document.querySelectorAll('#found-dots i');
    const dotsOn = document.querySelectorAll('#found-dots i.done').length;
    const rings = document.querySelectorAll('#pic-bottom .ring').length;
    const ok = a.done && lv && lv.done && lv.won && lv.misses === 0 && engStars(cur) === 3 &&
      dots.length === lv.k && dotsOn === lv.k && rings === lv.k;
    if (ok) npass++;
    smokes['autoSolve' + f] = { done: a.done, taps: a.taps, k: lv && lv.k, misses: lv && lv.misses,
      dots: dots.length, dotsOn: dotsOn, rings: rings, won: lv && lv.won, ok: ok };
  }

  /* ---- ④ 布局：上下图 ≥200 高、命中热区直径 ≥127、overflowX ≤0 ---- */
  total++;
  startLevel(0);
  const de = document.documentElement;
  const tr = topWrapEl.querySelector('svg').getBoundingClientRect();
  const br = bottomWrapEl.querySelector('svg').getBoundingClientRect();
  const hzs = document.querySelectorAll('#pic-bottom .hotzone');
  const hzRects = Array.prototype.map.call(hzs, h => h.getBoundingClientRect());
  const hzMin = hzRects.length ? Math.min.apply(null, hzRects.map(r => Math.min(r.width, r.height))) : 0;
  const layout = { topW: Math.round(tr.width), topH: Math.round(tr.height),
    botW: Math.round(br.width), botH: Math.round(br.height), hotzones: hzs.length,
    hzMin: Math.round(hzMin), overflowX: de.scrollWidth - window.innerWidth };
  const layoutOk = tr.height >= 200 && br.height >= 200 && tr.width <= 800 && br.width <= 800 &&
    hzs.length === cur.k && hzMin >= 127 && layout.overflowX <= 0;
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, layout: layout };

  /* ---- ⑤ 零惩罚单元：点空白计 miss 不锁关；首错无高亮圈、二错才出 ---- */
  total++;
  startLevel(2);                                  // 非 flat0（无教学路径干扰）
  const svgB = bottomWrapEl.querySelector('svg');
  const rectB = svgB.getBoundingClientRect();
  const toPage = (x, y) => [rectB.left + x / VB_W * rectB.width, rectB.top + y / VB_H * rectB.height];
  let far2 = null;
  outer2:
  for (let gy = 90; gy <= 420; gy += 30) {
    for (let gx = 80; gx <= 720; gx += 30) {
      const q = SPD.quiz;
      if (q.diffs.every((d, i) => q.found[i] || RAD2(gx, gy, d.x, d.y) >= 150)) { far2 = [gx, gy]; break outer2; }
    }
  }
  const pen = { far: far2 };
  let penOk = false;
  if (far2) {
    /* 真实指针事件点空白（page 坐标）→ 轻摆 + miss 计数；首错不出现高亮圈 */
    const el = document.elementFromPoint(toPage(far2[0], far2[1])[0], toPage(far2[1], far2[1])[1]);
    pen.target = el ? (el.id || el.tagName) : null;
    const r1 = await SPD.tapAt(far2[0], far2[1]);
    await wait(600);
    const lv1 = SPD.currentLevel;
    pen.first = { r: r1.r, misses: lv1.misses, found: lv1.foundCount,
      hintring: document.querySelectorAll('#pic-bottom .hintring').length,
      locked: state.locked, dots: document.querySelectorAll('#found-dots i.done').length };
    const r2 = await SPD.tapAt(far2[0], far2[1]);
    await wait(600);
    const lv2 = SPD.currentLevel;
    pen.second = { r: r2.r, misses: lv2.misses,
      hintring: document.querySelectorAll('#pic-bottom .hintring').length };
    penOk = pen.first.r === 'miss' && pen.first.misses === 1 && pen.first.found === 0 &&
      pen.first.hintring === 0 && !pen.first.locked &&                                    // 首错：零惩罚不锁、不高亮
      pen.second.r === 'miss' && pen.second.misses === 2 && pen.second.hintring === 1;    // 二错：支架高亮出现
    /* 点一个已圈中处（先找到一处）不重复计罚 */
    startLevel(2);
    const q2 = SPD.quiz;
    await SPD.tapDiff(0);
    const again = await SPD.tapAt(q2.diffs[0].x, q2.diffs[0].y);
    const lv3 = SPD.currentLevel;
    pen.again = { r: again.r, misses: lv3.misses, found: lv3.foundCount };
    penOk = penOk && pen.again.r === 'again' && pen.again.misses === 0 && pen.again.found === 1;
  }
  if (penOk) npass++;
  units.penalty = { ok: penOk, pen: pen };

  /* ---- 分布断言：四类差异在 40 关语料里都出现 ---- */
  total++;
  const distOk = ['color', 'move', 'size', 'del', 'add'].every(t => (typeDist[t] || 0) > 0);
  if (distOk) npass++;
  units.dist = { ok: distOk, dist: typeDist };

  const out = { game: 'spotdiff', total: total, pass: npass, layoutOk: layoutOk,
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
