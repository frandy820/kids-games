/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计：确定性 / 钟面角度与 clockMin 一致（角度函数=渲染真值源）/
     answer 在 items 且唯一（structOk）/ 干扰项规则合规（章 1=时针近邻+半点混淆、章 2=镜像必含+相邻刻度、
     章 4=±5 分钟+整点混淆）/ 引擎直驱 autoSolve 通关（0 重试 3 星）
   ② setDial 判定单元：正/负例各 4（负例=错误刻度计重试不推进，正例=吸附归位推进）
   ③ UI 冒烟：autoSolve UI 路径通关 read(flat0)/dial(flat10)/elapsed(flat15) + DOM 针角一致性
   ④ 布局：钟面 ≥200px、答案按钮 ≥80px、overflowX ≤0；答案位置分布不恒首位
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const idxDist = [0, 0, 0];
  const parseT = s => {                         // '3:05' → 185（独立解析，审计不抄生成器）
    const p = String(s).split(':');
    return ((parseInt(p[0], 10) % 12) * 60 + parseInt(p[1], 10)) % 720;
  };
  const hourNbrs = m => { const H = Math.floor(m / 60), mm = m % 60; return [((H + 1) % 12) * 60 + mm, ((H + 11) % 12) * 60 + mm]; };
  const halfConfOf = m => Math.floor(m / 60) * 60 + (m % 60 === 0 ? 30 : 0);

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.quizzes) === JSON.stringify(L2.quizzes);   // 确定性
    const n = L1.quizzes.length;
    let ruleOk = true, angOk = true, structAll = true;
    for (let k = 0; k < n; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q)) structAll = false;
      /* 角度一致性：渲染真值源 angleHour/angleMin 与 clockMin 互推闭合（12 小时制往返无漂移） */
      const h = angleHour(q.clockMin), m = Math.round(h / 360 * 720);
      if (m !== q.clockMin || angleMin(q.clockMin) !== (q.clockMin % 60) * 6) angOk = false;
      if (q.type === 'read') {
        if (q.items[q.answer] !== fmtClock(q.clockMin)) ruleOk = false;      // 答案即钟面时间
        const others = q.items.filter((v, i2) => i2 !== q.answer).map(parseT);
        if (L1.dch === 1) {
          if (q.clockMin % 30 !== 0) ruleOk = false;                         // 整点/半点
          const hn = hourNbrs(q.clockMin), hc = halfConfOf(q.clockMin);
          if (!((others[0] === hc || others[1] === hc) &&
                (hn.indexOf(others[0]) >= 0 || hn.indexOf(others[1]) >= 0))) ruleOk = false;
        } else {
          if (q.clockMin % 5 !== 0 || q.clockMin % 60 === 0) ruleOk = false; // 任意 ×5 分钟（非整点）
          const mir = mirrorOf(q.clockMin);
          if (others.indexOf(mir) < 0) ruleOk = false;                       // 镜像干扰必含
          const other = others[0] === mir ? others[1] : others[0];
          if (Math.abs(other - q.clockMin) !== 5) ruleOk = false;            // 另一干扰=相邻刻度
        }
        idxDist[q.answer]++;
      } else if (q.type === 'dial') {
        if (q.items.length !== 1 || q.answer !== 0 || q.items[0] !== fmtClock(q.clockMin) || q.clockMin % 5 !== 0) ruleOk = false;
      } else {                                                               // elapsed
        if ((q.clockMin + q.dur) % 720 !== q.endMin) ruleOk = false;
        if (q.items[q.answer] !== q.dur + '分钟' || q.dur < 5 || q.dur > 55 || q.dur % 5 !== 0) ruleOk = false;
        const ds = q.items.filter((v, i2) => i2 !== q.answer).map(s => parseInt(s, 10));
        const pm5 = d => Math.abs(d - q.dur) === 5, hourConf = d => d + q.dur === 60;
        if (!((pm5(ds[0]) && hourConf(ds[1])) || (pm5(ds[1]) && hourConf(ds[0])) ||
              (pm5(ds[0]) && pm5(ds[1])))) ruleOk = false;                    // dur=30 退化：双 ±5
        idxDist[q.answer]++;
      }
    }
    let guard = 0;                                                            // 引擎直驱全对通关
    while (!L1.done && guard++ < 12) {
      const q = L1.quizzes[L1.step];
      if (q.type === 'dial') engDial(L1, q.clockMin % 60);
      else engPick(L1, q.answer);
    }
    const solvedAll = L1.done && L1.step === CH_LEN && L1.retries === 0 && engStars(L1) === 3;
    const ok = det && n === CH_LEN && ruleOk && angOk && structAll && solvedAll;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, angOk: angOk,
      structAll: structAll, solvedAll: solvedAll, types: L1.quizzes.map(q => q.type) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② setDial 判定单元：负例 4（错误刻度=计重试不推进）+ 正例 4（目标刻度=吸附推进） ---- */
  total++;
  const dialNeg = [], dialPos = [];
  for (let i = 0; i < 4; i++) {
    startLevel(10 + i);                       // 章 3 dial 关（10-13 均为 dch3）
    const t = cur.quizzes[0].clockMin % 60;
    let w = (t + 5 * (i + 1)) % 60;
    if (w === t) w = (t + 10) % 60;
    const rw = await CLK.setDial(w);
    dialNeg.push({ t: t, w: w, r: rw, step: cur.step, retries: cur.retries });
    const rr = await CLK.setDial(t);
    dialPos.push({ t: t, r: rr, step: cur.step, retries: cur.retries });
  }
  const dialOk = dialNeg.every(d => d.r === 'wrong' && d.step === 0 && d.retries === 1) &&
    dialPos.every(d => (d.r === 'right' || d.r === 'done') && d.step === 1 && d.retries === 1);
  if (dialOk) npass++;
  units.setDial = { ok: dialOk, neg: dialNeg, pos: dialPos };

  /* ---- ③ UI 冒烟：autoSolve UI 路径通关 read/dial/elapsed 三形态 ---- */
  for (const f of [0, 10, 15]) {
    total++;
    startLevel(f);
    const a = await CLK.autoSolve();
    const lv = CLK.currentLevel;
    const ok = a.done && lv.done && lv.won && lv.retries === 0 && engStars(cur) === 3;
    if (ok) npass++;
    smokes['autoSolve' + f] = { done: a.done, picks: a.picks, won: lv.won, retries: lv.retries, type: cur.quizzes[0].type, ok: ok };
  }

  /* ---- ③ DOM 针角一致性：渲染出的指针 transform 与 clockMin 角度逐一相符 ---- */
  total++;
  const angDom = [];
  const rotOf = el => {
    const m = /rotate\((-?[\d.]+)/.exec(el.getAttribute('transform') || '');
    return m ? Math.round(parseFloat(m[1]) * 10) / 10 : null;
  };
  const chk = () => {
    const card = zoneEl.querySelectorAll('.clock-card')[0];
    const q = cur.quizzes[cur.step];
    if (!card || !q) return false;
    let ok = rotOf(card.querySelector('.clk-h')) === Math.round(angleHour(q.clockMin) * 10) / 10 &&
             rotOf(card.querySelector('.clk-m')) === Math.round(angleMin(q.clockMin) * 10) / 10;
    angDom.push({ type: q.type, clockMin: q.clockMin, ok: ok });
    return ok;
  };
  startLevel(0);                               // read：钟面=目标时间
  let domA = chk();
  startLevel(15);                              // elapsed：两钟面（起/止）均需一致
  const cards = zoneEl.querySelectorAll('.clock-card');
  const q4 = cur.quizzes[0];
  const rot4h = rotOf(cards[1].querySelector('.clk-h')), rot4m = rotOf(cards[1].querySelector('.clk-m'));
  let domB = rot4h === Math.round(angleHour(q4.endMin) * 10) / 10 && rot4m === Math.round(angleMin(q4.endMin) * 10) / 10;
  angDom.push({ type: 'elapsed-end', clockMin: q4.endMin, ok: domB });
  startLevel(10);                              // dial：setDial 到位后针角=完整目标时间（时针含联动分量）
  for (let k = 0; k < 4; k++) await CLK.setDial(cur.quizzes[cur.step].clockMin % 60);   // 推进到末题
  const t3 = cur.quizzes[4].clockMin;
  await CLK.setDial(t3 % 60);                  // 末题 → done → verify 不重渲，指针停在目标时间
  const card3 = clockCardEl();
  const rot3h = rotOf(card3.querySelector('.clk-h')), rot3m = rotOf(card3.querySelector('.clk-m'));
  let domC = rot3h === Math.round(angleHour(t3) * 10) / 10 && rot3m === Math.round(angleMin(t3) * 10) / 10;
  angDom.push({ type: 'dial-set', clockMin: t3, ok: domC });
  const domOk = domA && domB && domC && angDom.every(a => a.ok);
  if (domOk) npass++;
  units.anglesDom = { ok: domOk, checks: angDom };

  /* ---- ④ 布局：钟面 ≥200、答案按钮 ≥80×80、overflowX ≤0（read 与 elapsed 双钟面两种形态） ---- */
  total++;
  startLevel(0);
  const clk1 = clockCardEl().querySelector('svg.clock').getBoundingClientRect();
  const opts = answersEl.querySelectorAll('.opt');
  const rs = Array.prototype.map.call(opts, b => b.getBoundingClientRect());
  const de = document.documentElement;
  const layoutRead = { w: Math.round(clk1.width), h: Math.round(clk1.height),
    optW: Math.round(Math.min.apply(null, rs.map(r => r.width))), optH: Math.round(Math.min.apply(null, rs.map(r => r.height))),
    n: opts.length, overflowX: de.scrollWidth - window.innerWidth };
  startLevel(15);
  const cs = zoneEl.querySelectorAll('svg.clock');
  const rs2 = Array.prototype.map.call(cs, s => s.getBoundingClientRect());
  const layoutEl = { w: Math.round(Math.min.apply(null, rs2.map(r => r.width))),
    h: Math.round(Math.min.apply(null, rs2.map(r => r.height))), n: cs.length,
    optW: Math.round(Math.min.apply(null, Array.prototype.map.call(answersEl.querySelectorAll('.opt'), b => b.getBoundingClientRect().width)) )};
  /* 反方审查 m7：阈值对齐 SPEC 头部公约 ≥96px（原 80 偏松，CSS 回归到 80-95 区间会漏报） */
  const layoutOk = layoutRead.w >= 200 && layoutRead.h >= 200 && layoutRead.optW >= 96 && layoutRead.optH >= 96 &&
    layoutRead.n === 3 && layoutRead.overflowX <= 0 && layoutEl.w >= 200 && layoutEl.h >= 200 && layoutEl.n === 2;
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, layout: layoutRead, layoutElapsed: layoutEl };

  /* ---- 分布断言：answerIdx 三位置都出现、首位不恒定（<60%） ---- */
  total++;
  const distOk = idxDist[0] > 0 && idxDist[1] > 0 && idxDist[2] > 0 && idxDist[0] < 200 * 0.6;
  if (distOk) npass++;
  units.dist = { ok: distOk, idx0: idxDist[0], idx1: idxDist[1], idx2: idxDist[2], n: idxDist[0] + idxDist[1] + idxDist[2] };

  const out = { game: 'clock', total: total, pass: npass, layoutOk: layoutOk, dist: idxDist,
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
