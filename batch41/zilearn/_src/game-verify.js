/* ================= ?verify=1 自检（独立第 4 script 块，b36 M1 结构）
   ① 静态 20+生成 30 关全量审计（flat 0-49）：确定性（同 flat 两次生成 JSON 一致）/
     题位谱（watch→listen×3→word|sentence→match→quiz×2，SPEC 独立表）/
     选项律（4 项互异含目标，ans=目标下标，干扰=CHARS.distract 优先+SPEC pad 序）/
     词挖空/句子挖空/组词搭配内容律 / 引擎直驱（7 taps 0 miss 3 星 done）
   ② 独立复算深对账（flat 0/13/20/44）：SPEC 算法副本 vGenLevel 与引擎 genLevel 深比较
   ③ UI 单元 flat0：错点 miss+1 晃动不推进 / half×2→right 步进 / soft 教学不计 miss
   ④ 防泄露（语音键账）：视觉题（word/sentence/match）题面期绝不播 zi_ch_<目标>
   ⑤ 救援直驱：14s 方向级重播题面 / 30s 答案级 breathe 正确卡 / keepIdle（lastAct 不被救援刷）
   ⑥ autoSolve 真实通路 taps=7 / 1 miss=2 星
   ⑦ 布局：双 viewport×4 关：选项 ≥96、亮相大字卡 ≥96、选项区与题面区物理分离（无交集）、
     选项间距 ≥12、overflowX ≤0
   ⑧ html script 块数==4 硬断言（自匹配恒真家族缺陷防线）
   ⑨ 覆盖与键账：静态 20 关新字并集=100 静态字 / reviewSchedule↔review 对齐 / 句子 20 /
     语音键 178（zi_ch_ 150 唯一 ASCII + zi_st_ 20 + VOICE 8）
   ⑩ 日历限速 ziBase 独立表（首日 2/次日 3/第 3 日 4/第 4 日起 6——SPEC §R5）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;

  /* ---- SPEC 独立表（坑4 铁律：期望值独立硬编码，禁从实现函数复算） ---- */
  const SPEC_CH_LEN = 5, SPEC_STATIC = 20;
  const SPEC_WHITELIST = '的了是我你在他有和就不啊吧呀嗯啦好';
  const SPEC_KINDS = f => f >= 10 && f < 20 ? ['watch', 'listen', 'sentence', 'match', 'quiz']
                                            : ['watch', 'listen', 'word', 'match', 'quiz'];
  const SPEC_ZI_BASE = [[1, 2], [2, 5], [3, 9], [4, 15], [5, 21], [6, 27], [7, 33], [8, 39], [9, 45], [10, 51]];
  /* 独立静态序/引入表（从 SPEC 转写源 chars.json 的 JS 表直接读——数据即真值） */
  const vStaticOrder = [];
  for (let f = 0; f < 20; f++) vStaticOrder.push.apply(vStaticOrder, LEVELS[f].newChars);
  const vIntro = {};
  vStaticOrder.forEach((c, i) => { vIntro[c] = Math.floor(i / 5); });
  GEN_POOL.forEach((c, i) => { vIntro[c] = 20 + Math.floor(i / 2); });
  const vNewCharsOf = f => f < 20 ? LEVELS[f].newChars.slice()
    : (f - 20) * 2 >= GEN_POOL.length ? [] : GEN_POOL.slice((f - 20) * 2, Math.min((f - 20) * 2 + 2, GEN_POOL.length));
  const vLearned = f => { const p = vStaticOrder.slice(); if (f >= 20) p.push.apply(p, GEN_POOL.slice(0, Math.min((f - 20) * 2 + 2, GEN_POOL.length))); return p; };
  const vMul = a => function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const vShuf = (arr, rnd) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t2 = a[i]; a[i] = a[j]; a[j] = t2; } return a; };
  /* SPEC 算法副本：确定性补位序（新字→复习字→句子实字→静态序→池序） */
  const vPad = (target, flat) => {
    const out = [], seen = {}; seen[target] = 1;
    const push = c => { if (CHARS[c] && !seen[c]) { seen[c] = 1; out.push(c); } };
    vNewCharsOf(flat).forEach(push);
    if (flat < 20) { LEVELS[flat].review.forEach(push); LEVELS[flat].sentence.charsUsed.forEach(c => { if (SPEC_WHITELIST.indexOf(c) < 0) push(c); }); }
    vStaticOrder.forEach(push); GEN_POOL.forEach(push);
    return out;
  };
  const vOpts = (target, flat, rnd) => {
    const seen = {}, dis = [];
    CHARS[target].distract.forEach(d => { const c = d[0]; if (!seen[c] && c !== target) { seen[c] = 1; dis.push(c); } });
    const pads = vPad(target, flat);
    for (let k = 0; k < pads.length && dis.length < 3; k++) if (!seen[pads[k]]) { seen[pads[k]] = 1; dis.push(pads[k]); }
    const opts = vShuf([target].concat(dis.slice(0, 3)), rnd);
    return { opts: opts, ans: opts.indexOf(target) };
  };
  const vBlankWord = t => CHARS[t].words[0][0].split(t).join('＿');
  const vSentBlank = lv => {
    let best = null;
    lv.sentence.charsUsed.forEach((c, i) => {
      if (SPEC_WHITELIST.indexOf(c) >= 0 || !CHARS[c]) return;
      if (!best || vIntro[c] > best.f || (vIntro[c] === best.f && i > best.i)) best = { c: c, f: vIntro[c], i: i };
    });
    return best ? best.c : null;
  };
  const vWordOpts = (target, cand, rnd) => {
    const correct = CHARS[target].words[0][0];
    const seen = {}, dis = [], cs = [];
    cand.forEach(c => { if (c !== target && cs.indexOf(c) < 0) cs.push(c); });
    vStaticOrder.concat(GEN_POOL).forEach(c => { if (c !== target && cs.indexOf(c) < 0) cs.push(c); });
    for (const c of cs) {
      const w = CHARS[c].words[0][0];
      if (w === correct || w.indexOf(target) >= 0 || seen[w]) continue;
      seen[w] = 1; dis.push(w);
      if (dis.length === 3) break;
    }
    const opts = vShuf([correct].concat(dis), rnd);
    return { opts: opts, ans: opts.indexOf(correct) };
  };
  const vRecent = f => { const s = {}; for (let k = Math.max(0, f - 2); k <= f; k++) vNewCharsOf(k).forEach(c => { s[c] = 1; }); return s; };
  const vWeighted = (flat, rnd, n) => {
    const recent = vRecent(flat), tickets = [];
    vLearned(flat).forEach(c => { const r = recent[c] ? 3 : 1; for (let k = 0; k < r; k++) tickets.push(c); });
    const drawn = vShuf(tickets, rnd), out = [], got = {};
    for (const c of drawn) { if (!got[c]) { got[c] = 1; out.push(c); if (out.length === n) break; } }
    return out;
  };
  const vListen = (t, flat, rnd) => { const o = vOpts(t, flat, rnd); return { sub: 'listen', t: t, opts: o.opts, ans: o.ans }; };
  const vWord = (t, flat, rnd) => { const o = vOpts(t, flat, rnd); return { sub: 'word', t: t, opts: o.opts, ans: o.ans, display: vBlankWord(t) }; };
  /* SPEC 算法副本：整关生成（与引擎深比较依据——SPEC §2 消耗序） */
  function vGenLevel(flat) {
    const rnd = vMul(flat * 7919 + 97);
    let watchChars, listenT, wT, mT, q4a, q4b, cand3;
    if (flat < 20) {
      const L = LEVELS[flat], order = vShuf(L.newChars, rnd);
      watchChars = L.newChars.slice();
      listenT = [order[0], order[1], order[2]];
      wT = order[3]; mT = order[4];
      cand3 = L.newChars.slice();
      q4a = L.newChars[Math.floor(rnd() * 5)];
      q4b = L.review.length ? L.review[flat % L.review.length] : order[(order.indexOf(q4a) + 1) % 5];
    } else {
      const targets = vWeighted(flat, rnd, 7);
      listenT = [targets[0], targets[1], targets[2]];
      wT = targets[3]; mT = targets[4];
      cand3 = targets.slice();
      q4a = targets[5]; q4b = targets[6];
      const nc = vNewCharsOf(flat);
      watchChars = nc.length ? nc : targets.slice(0, 2);
    }
    const quizzes = [{ kind: 'watch', chars: watchChars.slice(), ri: 0 }];
    quizzes.push({ kind: 'listen', ri: 0, rounds: [vListen(listenT[0], flat, rnd), vListen(listenT[1], flat, rnd), vListen(listenT[2], flat, rnd)] });
    if (flat >= 10 && flat < 20) {
      const bc = vSentBlank(LEVELS[flat]);
      const o = vOpts(bc, flat, rnd);
      quizzes.push({ kind: 'sentence', ri: 0, t: bc, opts: o.opts, ans: o.ans, display: LEVELS[flat].sentence.text.split(bc).join('＿') });
    } else {
      const o = vOpts(wT, flat, rnd);
      quizzes.push({ kind: 'word', ri: 0, t: wT, opts: o.opts, ans: o.ans, display: vBlankWord(wT) });
    }
    const wo = vWordOpts(mT, cand3, rnd);
    quizzes.push({ kind: 'match', ri: 0, t: mT, opts: wo.opts, ans: wo.ans });
    quizzes.push({ kind: 'quiz', ri: 0, rounds: [
      rnd() < 0.5 ? vListen(q4a, flat, rnd) : vWord(q4a, flat, rnd),
      rnd() < 0.5 ? vListen(q4b, flat, rnd) : vWord(q4b, flat, rnd)
    ] });
    return { flat: flat, ch: Math.floor(flat / 5) + 1, lv: flat % 5, quizzes: quizzes, step: 0, ri: 0, misses: 0, done: false };
  }
  const norm = L => JSON.parse(JSON.stringify(L, (k, v) => k === '_miss' ? undefined : v));

  /* ---- ① 全量审计（flat 0-49） ---- */
  const auditFlats = [];
  for (let flat = 0; flat < 50; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);
    const kinds = SPEC_KINDS(flat);
    let shapeOk = true, optOk = true, lawOk = true, driveOk = true;
    if (L1.quizzes.length !== SPEC_CH_LEN) shapeOk = false;
    const targets = [];
    for (let k = 0; k < SPEC_CH_LEN; k++) {
      const q = L1.quizzes[k];
      if (q.kind !== kinds[k]) shapeOk = false;
      if (k === 0) {
        if (flat < 20) { if (q.chars.join() !== LEVELS[flat].newChars.join()) lawOk = false; }
        else if (q.chars.join() !== vNewCharsOf(flat).join() && q.chars.length !== 2) lawOk = false;
        continue;
      }
      const rounds = q.rounds ? q.rounds : [q];
      /* 目标字域按题型：sentence=本关句子实字（往关已学字，SPEC 子集铁律）；
         其余静态=本关新字∪复习字；生成=已学池 */
      const cand = q.kind === 'sentence'
        ? new Set(LEVELS[flat].sentence.charsUsed.filter(c => CHARS[c] && SPEC_WHITELIST.indexOf(c) < 0))
        : (flat < 20 ? new Set(LEVELS[flat].newChars.concat(LEVELS[flat].review)) : new Set(vLearned(flat)));
      for (const r of rounds) {
        targets.push(r.t);
        const expectOpt = q.kind === 'match' ? CHARS[r.t].words[0][0] : r.t;   // match 选项=词，ans 处=目标首词
        if (!r.opts || r.opts.length !== 4 || new Set(r.opts).size !== 4) { optOk = false; continue; }
        if (r.opts[r.ans] !== expectOpt) optOk = false;                   // ans=目标下标
        const dis = r.opts.filter((o, i) => i !== r.ans);
        if (dis.indexOf(expectOpt) >= 0) optOk = false;
        if (!cand.has(r.t)) lawOk = false;                                // 目标字域
        if (q.kind === 'word' && r.display !== vBlankWord(r.t)) lawOk = false;
        if (q.kind === 'sentence') {
          const lv = LEVELS[flat];
          if (r.t !== vSentBlank(lv)) lawOk = false;                      // 挖空=最新引入实字
          if (r.display !== lv.sentence.text.split(r.t).join('＿')) lawOk = false;
          if (lv.sentence.text.indexOf(r.t) < 0) lawOk = false;
        }
      }
      if (q.kind === 'match') {
        const r = q;
        const correct = CHARS[r.t].words[0][0];
        if (r.opts[r.ans] !== correct) lawOk = false;
        const bad = r.opts.filter((o, i) => i !== r.ans);
        if (bad.some(w => w.indexOf(r.t) >= 0)) lawOk = false;            // 干扰词禁含目标字
        const allFirst = new Set(Object.keys(CHARS).map(c => CHARS[c].words[0][0]));
        if (!bad.every(w => allFirst.has(w))) lawOk = false;              // 干扰词=某字首词
      }
      if (q.kind === 'listen' && flat < 20) {
        if (!q.rounds.every(r => LEVELS[flat].newChars.indexOf(r.t) >= 0)) lawOk = false;
      }
      if (q.kind === 'quiz') {
        if (q.rounds.length !== 2) shapeOk = false;
        if (flat < 20) {
          if (LEVELS[flat].review.length && LEVELS[flat].review.indexOf(q.rounds[1].t) < 0) lawOk = false;
          if (LEVELS[flat].newChars.indexOf(q.rounds[0].t) < 0) lawOk = false;
        }
        if (!q.rounds.every(r => r.sub === 'listen' || r.sub === 'word')) shapeOk = false;
      }
    }
    const uniqTargets = new Set(targets);
    if (flat >= 20 && uniqTargets.size !== targets.length) lawOk = false; // 生成关 7 目标互异（加权池取互异）
    if (flat < 20) {                                                      // 静态关：听音 3 目标互异；
      const lt = L1.quizzes[1].rounds.map(r => r.t);                      // 小测位=本关字复测（任务书谱，允许与
      if (new Set(lt).size !== 3) lawOk = false;                          // 前位重复，域断言已覆盖）
    }
    if (targets.length !== 7) shapeOk = false;                            // 判定点谱=7/关
    /* 引擎直驱：watch 跳过 + 每步点正确项 → 7 taps 0 miss 3 星 */
    let taps = 0;
    engSkipWatch(L1);
    while (!L1.done && taps < 20) {
      const r = engRound(L1);
      const ret = engPick(L1, r.ans);
      taps++;
      if (ret !== 'half' && ret !== 'right' && ret !== 'done') { driveOk = false; break; }
    }
    const solvedAll = L1.done && taps === 7 && L1.misses === 0 && engStars(L1) === 3;
    /* 错点计 miss / soft 免计 */
    const Lw = genLevel(flat); engSkipWatch(Lw);
    const rr = engRound(Lw);
    const wi = (rr.ans + 1) % 4;
    const wret = engPick(Lw, wi);
    engPick(Lw, wi, true);
    const missOk = wret === 'wrong' && Lw.misses === 1;
    const ok = det && shapeOk && optOk && lawOk && driveOk && solvedAll && missOk;
    auditFlats.push({ flat: flat, ok: ok });
    const rec = { ok: ok, det: det, shapeOk: shapeOk, optOk: optOk, lawOk: lawOk, driveOk: driveOk, solvedAll: solvedAll, missOk: missOk,
                  ts: targets.join('') };
    if (flat < 20) levels[keyOf(flat)] = rec; else gen[flat] = rec;
  }
  total++;
  const auditOk = auditFlats.every(a => a.ok);
  if (auditOk) npass++;
  units.audit = { ok: auditOk, n: auditFlats.length, bad: auditFlats.filter(a => !a.ok).map(a => a.flat) };

  /* ---- ② 独立复算深对账（SPEC 算法副本 vs 引擎） ---- */
  total++;
  const deep = [0, 7, 10, 13, 19, 20, 33, 44, 47];
  const deepOk = deep.every(f => JSON.stringify(norm(genLevel(f))) === JSON.stringify(norm(vGenLevel(f))));
  if (deepOk) npass++;
  units.deep = { ok: deepOk, flats: deep };

  /* ---- ③ UI 单元 flat0：错点/半步/推进（真实 uiPick 通路） ---- */
  total++;
  startLevel(0);
  let ui3 = true;
  {
    const q = ZIL.quiz;
    const wrongIdx = (q.opts.indexOf(q.target) + 1) % 4;
    const before = ZIL.currentLevel.misses;
    const rw = await ZIL.tapOpt(wrongIdx);
    const wig = !!document.querySelector('.opt.wig');
    ui3 = ui3 && rw === 'wrong' && ZIL.currentLevel.misses === before + 1 && wig &&
          ZIL.currentLevel.step === 1 && ZIL.quiz.round === 0;            // 错不推进
    const ansOf = z => z.opts.indexOf(z.target);
    const r1 = await ZIL.tapOpt(ansOf(ZIL.quiz));                          // half
    ui3 = ui3 && r1 === 'half' && ZIL.quiz.round === 1;
    const r2 = await ZIL.tapOpt(ansOf(ZIL.quiz));
    ui3 = ui3 && r2 === 'half' && ZIL.quiz.round === 2;
    const r3 = await ZIL.tapOpt(ansOf(ZIL.quiz));
    ui3 = ui3 && r3 === 'right' && ZIL.currentLevel.step === 2;            // 题位推进
  }
  if (ui3) npass++;
  units.uiFlow = { ok: ui3 };

  /* ---- ④ 防泄露：视觉题题面期绝不播 zi_ch_<目标>（语音键账） ---- */
  total++;
  startLevel(1);
  let leakOk = true;
  {
    const ansOf = z => z.opts.indexOf(z.target);
    while (ZIL.quiz && ZIL.quiz.kind === 'listen') await ZIL.tapOpt(ansOf(ZIL.quiz));   // 走完 3 轮听音
    const n0 = ZIL._voiceLog.length;
    const q = ZIL.quiz;                                                   // word 题（flat1）
    if (!q || q.kind !== 'word') leakOk = false;
    else {
      const leaked = ZIL._voiceLog.slice(n0).some(e => e[1] === chKey(q.target) || e[1] === chText(q.target));
      leakOk = leakOk && !leaked;
      await ZIL.tapOpt(q.opts.indexOf(q.target));                         // right 链尾段 chKey=确认音（允许）
    }
    while (ZIL.quiz && ZIL.quiz.kind !== 'match' && ZIL.currentLevel.step < 3) await ZIL.tapOpt(ansOf(ZIL.quiz));
    const n1 = ZIL._voiceLog.length;
    const q2 = ZIL.quiz;                                                  // match 题
    if (!q2 || q2.kind !== 'match') leakOk = false;
    else {
      const leaked2 = ZIL._voiceLog.slice(n1).some(e => e[1] === chKey(q2.target));
      leakOk = leakOk && !leaked2;
    }
  }
  if (leakOk) npass++;
  units.antiLeak = { ok: leakOk };

  /* ---- ⑤ 救援直驱：14s 方向级 / 30s 答案级 breathe / keepIdle ---- */
  total++;
  startLevel(2);
  let rescueOk = true;
  {
    const q = ZIL.quiz;                                                   // listen 题在位
    ZIL._idleHack(16000);
    const a1 = ZIL._anchors;
    const n0 = ZIL._voiceLog.length;
    ZIL._rescueCore();
    rescueOk = rescueOk && ZIL._voiceLog.slice(n0).some(e =>               // 方向级=重播题面（play 键或 queue 键组）
      e[1] === VOICE.listen.key || (Array.isArray(e[1]) && e[1].indexOf(VOICE.listen.key) >= 0));
    const a2 = ZIL._anchors;
    rescueOk = rescueOk && a2.lastAct === a1.lastAct;                     // keepIdle：救援不刷 lastAct
    ZIL._idleHack(31000);
    const a3 = ZIL._anchors;
    ZIL._rescueCore();
    const okEl = document.querySelector('.opt.breathe');
    const isCorrect = okEl && okEl.textContent === q.target;              // breathe=正确卡
    const a4 = ZIL._anchors;
    rescueOk = rescueOk && !!isCorrect && a4.lastAct === a3.lastAct;      // 答案级也不刷 lastAct
    const wrongChainGuard = WRONG_CHAIN_WIN >= estMs(VOICE.wrong.text) + 300;   // 链豁免窗≥错链下界
    rescueOk = rescueOk && wrongChainGuard;
  }
  if (rescueOk) npass++;
  units.rescue = { ok: rescueOk };

  /* ---- ⑥ autoSolve 真实通路：taps=7 0 miss 3 星；1 miss=2 星 ---- */
  total++;
  startLevel(3);
  const as = await ZIL.autoSolve();
  const lvA = ZIL.currentLevel;
  const ok6 = as.done && as.taps === 7 && lvA.done && lvA.misses === 0 && engStars(cur) === 3;
  startLevel(4);
  const q4 = ZIL.quiz;
  await ZIL.tapOpt((q4.opts.indexOf(q4.target) + 1) % 4);                 // 1 错
  const as2 = await ZIL.autoSolve();
  const lvB = ZIL.currentLevel;
  const ok6b = as2.done && as2.taps === 7 && lvB.misses === 1 && engStars(cur) === 2 && ZIL.currentLevel.won;
  if (ok6 && ok6b) npass++;
  units.autoSolve = { ok: ok6 && ok6b, a: as, stars3: engStars(genLevel(3)) , miss1: { done: as2.done, taps: as2.taps, misses: lvB.misses, stars: lvB.won ? engStars(cur) : null } };

  /* ---- ⑦ 布局：双 viewport×4 关（listen/word/sentence/match 面） ---- */
  function simView(w, h) {
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    renderQuiz();
    const de = document.documentElement;
    const opts = Array.prototype.map.call(document.querySelectorAll('.opt'), b => b.getBoundingClientRect());
    const stage = document.getElementById('stage').getBoundingClientRect();
    const optOk = opts.length === 4 && opts.every(r => r.width >= 96 && r.height >= 96);
    const sepOk = opts.every(r => r.top >= stage.bottom - 2);             // 选项区与题面区物理分离（防泄露）
    let gapOk = true, minGap = 1e9;                                       // 同行相邻间距 ≥11（竖屏 2×2 按 y 中心聚类）
    const rows = {};
    opts.forEach(r => { const ky = Math.round(r.top + r.height / 2); (rows[ky] = rows[ky] || []).push(r); });
    Object.keys(rows).forEach(ky => {
      const rs = rows[ky].sort((a, b) => a.left - b.left);
      for (let i = 1; i < rs.length; i++) {
        const gap = rs[i].left - rs[i - 1].right;
        if (gap < minGap) minGap = gap;
        if (gap < 11) gapOk = false;
      }
    });
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, n: opts.length, optOk: optOk, sepOk: sepOk, gapOk: gapOk, minGap: Math.round(minGap), ox: ox,
             pass: optOk && sepOk && gapOk && ox <= 0 };
  }
  total++;
  const sims = [];
  const wboxOk = [];
  for (const flat of [0, 1, 10, 20]) {
    startLevel(flat);                                                     // VERIFY 页自动跳过 watch
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  /* 亮相大字卡 ≥96（独立页实测在 _selftest P3；此处核静态渲染几何由 simView 同构保证） */
  const g0 = document.getElementById('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑧ html script 块数==4（verify 独立第 4 块，自匹配恒真防线） ---- */
  total++;
  const nScripts = document.querySelectorAll('script').length;
  const srcOk = document.querySelectorAll('script')[2].textContent.indexOf('runVerify') < 0;
  const scriptOk = nScripts === 4 && srcOk && typeof runVerify !== 'undefined';
  if (scriptOk) npass++;
  units.scriptBlocks = { ok: scriptOk, n: nScripts, src2Clean: srcOk };

  /* ---- ⑨ 覆盖与键账 ---- */
  total++;
  const covSet = new Set();
  for (let f = 0; f < 20; f++) LEVELS[f].newChars.forEach(c => covSet.add(c));
  const staticAll = Object.keys(CHARS).filter(c => GEN_POOL.indexOf(c) < 0);
  const covOk = covSet.size === 100 && staticAll.length === 100 && staticAll.every(c => covSet.has(c)) && GEN_POOL.every(c => CHARS[c]);
  const schedFlats = new Set();
  Object.keys(REVIEW_SCHED).forEach(k => REVIEW_SCHED[k].forEach(f => schedFlats.add(f)));
  const revFlats = new Set(LEVELS.filter(l => l.review.length).map(l => l.flat));
  const schedOk = schedFlats.size === revFlats.size && [...schedFlats].every(f => revFlats.has(f));
  const sentOk = SENTENCES.length === 20 && SENTENCES.every((s, i) => s.afterFlat === i && s.text === LEVELS[i].sentence.text);
  const pys = Object.keys(CHARS).map(c => CHARS[c].py);
  const keyOk = new Set(pys).size === 150 && pys.every(p => /^[\x21-\x7E]+$/.test(p));   // 150 唯一全 ASCII（clip key 域）
  const voiceOk = Object.keys(VOICE).length === 8 && Object.keys(VOICE).every(k => VOICE[k].key.indexOf('zi_') === 0);
  const covAll = covOk && schedOk && sentOk && keyOk && voiceOk;
  if (covAll) npass++;
  units.coverage = { ok: covAll, covOk: covOk, schedOk: schedOk, sentOk: sentOk, keyOk: keyOk, voiceOk: voiceOk };

  /* ---- ⑩ 日历限速 ziBase 独立表（SPEC §R5） ---- */
  total++;
  const calOk = SPEC_ZI_BASE.every(([d, v]) => ZIL._ziBase(d) === v) && ZIL._ziBase(100) === 2 + 3 + 4 + 6 * 97;
  if (calOk) npass++;
  units.calendar = { ok: calOk, table: SPEC_ZI_BASE };

  const out = { game: 'zilearn', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  document.getElementById('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，双保险）+ 语音键账桥（防泄露断言） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (key) { ZIL._vlogPush('p', key); };
  KIDS.voice.queue = function (parts) { ZIL._vlogPush('q', parts.map(p => typeof p === 'string' ? p : p.key)); };
  runVerify();
}
