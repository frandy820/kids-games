/* ================= ?verify=1 自检 r5（仅 verify 分支加载执行）
   SPEC 真值源：SPEC-BATCH24 §7（r5 版本块）+ §0.56 承袭锚点表。独立对账纪律：本文件内
   SPEC_* 系列表从 SPEC 文字独立重列（禁引用引擎常量互证），断言从 SPEC 语义推导。
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性 / 章型闭合（dch1 全 trace-ends、
     dch2 全 trace-start、dch3 全 listen、dch4 型序 [mirror,listen,trace,mirror,trace]）/
     同型相邻互异（dch1/2/3 轮转 + dch4 mirror 对/trace 对互异）/ 引擎直驱（选对卡→逐锚推进
     → done/won → missTotal=0 → 3 星）
   ② SPEC 独立表对账：笔顺锚点表（10 数字 anchors/strokes 从 SPEC 重列）/ LISTEN_NEAR
     封闭 6 对 / MIRROR_POOL 封闭 5 —— 与引擎常量逐项 deep equal
   ③ 自推负向断言（防退化回跟点模式，r5 核心）：flat 0/5/10/15 逐题逐锚手动推进，每步后断言
     中间锚点无 current/无呼吸动画；current 仅允许 idx0 且 pos===0；endmark 仅 ends 模式末锚；
     pick 相位零锚点元素
   ④ 错型方向对账：engWrongType 全数字×全 pos×全错点 vs verify 侧从 SPEC 锚点表独立重算；
     UI 侧 flat0 实点：跳笔→tra_w_wait、逆笔→tra_w_down（stub play log）
   ⑤ 不重头（引擎级）+ 选卡期点板无效（engTapAnchor pick 相位 null）
   ⑥ 选卡语义（真实 UI）：flat10 listen 选错 miss+1 相位不变 / 选对 phase→write；flat15 mirror
     型序+变体集封闭+right 指正体+选错 tra_w_mir
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=Σ锚，miss 0 → 3 星，不弹层不写档）
   ⑧ UI 冒烟 B：flat0 先错 1 次再 autoSolve（miss=1 → 2 星）
   ⑨ 星级规则：失败尝试总数 0=3★/1-2=2★/≥3=1★（引擎构造直测）
   ⑩ 救援钟：write 方向级=已写锚 flash+hint2 / pick 方向级=重读题面+卡行 pulse /
     答案级=下一锚/正确卡 rescued（动作即清）
   ⑪ 布局：双 viewport × flat 0/5/10/15：锚点与卡 ≥64、镜像变体 glyph bbox 在卡内、
     #ask pick 显 write 隐、overflowX ≤0
   ⑫ clips：tra_ 25 + core 3 = 28 全注入 + SPEC_DUR 实长断言（±60ms，逐条 8000ms 超时）+
     WIN 窗常量断言（PICK_RIGHT=600/WRONG=1000/DONE=4100 ≥ tra_right+150+tra_n_10+300 下界）
   ⑬ 章末 hint=预告下一章 + GEN_HINTS[k]↔dch=k+1 关键词（C7 型断言）
   ⑭ verify 提速断言：SPEED=0.12；verify 页零写档
   ⑮ 数词朗读对拍：flat0 autoSolve 每题完成播 [tra_right, tra_n_<num>]（题序 [1,2,3,4,5]）
   ⑯ 听数/镜像题面链对拍：stub queue/play log → 题面链 [tra_l_q|tra_m_q, tra_n_<num>] 逐题在场；
     选对后 hint2 在场
   ⑰ 单关净时长 modeled 下界 ≥40s（40 关全量）：Σ题[Σ锚(1200 自推决策下界+200 反馈窗)+4100
     完成窗]（不含题面语音/选卡决策/演出——只会更长）
   ⑱ 吞输入轻叮+可见回应：write（demo/locked/busy 拦+板 bump）/ pick（busy 拦+卡行 bump）
   ⑲ 教学链：tutorialWatch 真实走完（stub 存档）→ __trDemoR='right' 且 tut='help' ≤16s
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const quizSnap = () => JSON.stringify(TR.quiz);

  /* ---- SPEC 独立重列表（§0.56 承袭 + §7 r5；与引擎常量互证=违规，此处为唯一真值副本） ---- */
  const SPEC_DIGITS = {                                   // 笔顺锚点表（[x,y] 0-100 + strokes 笔首索引）
    1:  { anchors: [[50, 8], [50, 92]], strokes: [0] },
    2:  { anchors: [[30, 16], [64, 44], [28, 88]], strokes: [0] },
    3:  { anchors: [[28, 20], [52, 52], [30, 90]], strokes: [0] },
    4:  { anchors: [[28, 16], [54, 74], [82, 74], [54, 16], [54, 66]], strokes: [0, 3] },
    5:  { anchors: [[30, 12], [30, 42], [72, 42], [72, 56], [32, 82]], strokes: [0, 3] },
    6:  { anchors: [[30, 16], [28, 44], [44, 80], [76, 70], [52, 40]], strokes: [0] },
    7:  { anchors: [[24, 16], [78, 16], [64, 24], [36, 88]], strokes: [0, 2] },
    8:  { anchors: [[36, 12], [26, 34], [52, 58], [24, 78], [46, 93], [40, 42]], strokes: [0] },
    9:  { anchors: [[58, 12], [33, 34], [54, 55], [69, 40], [58, 88]], strokes: [0] },
    10: { anchors: [[14, 16], [14, 88], [46, 17], [67, 50], [46, 86], [26, 50]], strokes: [0, 2] }
  };
  const SPEC_NEAR = { 4: [10], 10: [4], 6: [9], 9: [6], 2: [5], 5: [2] };   // 听数干扰伙伴（6 对封闭）
  const SPEC_MIRROR_POOL = [2, 3, 5, 6, 9];                                  // 镜像题目标池（5 封闭）
  const SPEC_MIRROR_VARS = ['', 'm', 'r', 'f'];                             // 正体+3 变体（m/r/f）
  const SPEC_KINDS4 = ['mirror', 'listen', 'trace', 'mirror', 'trace'];     // dch4 型序
  /* SPEC_DUR 实长真值表（浏览器 new Audio onloadedmetadata 实测 2026-09-13） */
  const SPEC_DUR = { tra_hint2: 3912, tra_l_q: 2352, tra_m_q: 1824, tra_w_pick: 2568,
                     tra_w_mir: 2424, tra_w_wait: 2112, tra_w_down: 2040, tra_w_right: 2040,
                     tra_w_up: 2064, tra_w_left: 1992, tra_right: 2280, tra_n_10: 1248,
                     tra_tut_watch: 3552, tra_tut_turn: 1824 };

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  const chStat = { 1: { kinds: {}, nums: [] }, 2: { kinds: {}, nums: [] },
                   3: { kinds: {}, nums: [] }, 4: { kinds: {}, nums: [] } };
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const snap = q => [q.kind, q.num, q.cards, q.right, q.pos, q.phase, q.hintMode];
    const det = JSON.stringify(L1.quizzes.map(snap)) === JSON.stringify(L2.quizzes.map(snap));
    let ruleOk = true;
    for (let k = 0; k < L1.quizzes.length; k++) {
      if (structWhy(L1.quizzes[k], L1.dch, flat, k, L1.pool)) ruleOk = false;
    }
    if (L1.quizzes.length !== CH_LEN) ruleOk = false;
    /* 同型相邻互异：dch1/2/3 轮转相邻必异；dch4 mirror 对（q0,q3）/trace 对（q2,q4）互异
       （跨型允许同数——决策维度不同，§7） */
    let adjOk = true;
    if (L1.dch !== 4) {
      for (let k = 0; k + 1 < L1.quizzes.length; k++) {
        if (L1.quizzes[k].num === L1.quizzes[k + 1].num) adjOk = false;
      }
    } else {
      if (L1.quizzes[0].num === L1.quizzes[3].num) adjOk = false;
      if (L1.quizzes[2].num === L1.quizzes[4].num) adjOk = false;
    }
    /* 引擎直驱：pick 选对→逐锚推进 → (n-1)×'right' + 末锚 done/won */
    const L3 = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < L3.quizzes.length && driveOk; k++) {
      const q = L3.quizzes[k];
      if (q.phase === 'pick' && engPickCard(L3, q.right) !== 'right') driveOk = false;
      if (L3.quizzes[k].phase !== 'write') driveOk = false;
      for (let s = 0; s < q.anchors.length; s++) {
        const last = s === q.anchors.length - 1;
        const exp = last ? (k === L3.quizzes.length - 1 ? 'won' : 'done') : 'right';
        if (engTapAnchor(L3, s) !== exp) { driveOk = false; break; }
      }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.missTotal === 0 && engStars(L3) === 3;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1 && L1.dch === (L1.ch - 1) % 4 + 1;
    L1.quizzes.forEach(q => {
      chStat[L1.dch].kinds[q.kind] = (chStat[L1.dch].kinds[q.kind] || 0) + 1;
      chStat[L1.dch].nums.push(q.num);
    });
    const ok = det && ruleOk && adjOk && chOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, adjOk: adjOk,
                   chOk: chOk, driveOk: driveOk, solvedAll: solvedAll,
                   kinds: L1.quizzes.map(q => q.kind), nums: L1.quizzes.map(q => q.num) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  /* 章型聚合：dch1 全 trace 1-5 / dch2 全 trace 6-10 / dch3 全 listen 1-10 / dch4 型比 2:1:2 且 mirror 池封闭 */
  total++;
  const inRange = (arr, lo, hi) => arr.every(n => n >= lo && n <= hi);
  const mirPoolOnly = genLevel(15).quizzes
    .filter(q => q.kind === 'mirror')
    .every(q => SPEC_MIRROR_POOL.indexOf(q.num) >= 0);
  const distOk = Object.keys(chStat[1].kinds).join() === 'trace' && inRange(chStat[1].nums, 1, 5) &&
                 Object.keys(chStat[2].kinds).join() === 'trace' && inRange(chStat[2].nums, 6, 10) &&
                 Object.keys(chStat[3].kinds).join() === 'listen' && inRange(chStat[3].nums, 1, 10) &&
                 chStat[4].kinds.mirror === 20 && chStat[4].kinds.listen === 10 && chStat[4].kinds.trace === 20 &&
                 mirPoolOnly;
  if (distOk) npass++;
  units.dist = { ok: distOk, k1: chStat[1].kinds, k2: chStat[2].kinds, k3: chStat[3].kinds,
                 k4: chStat[4].kinds };

  /* ---- ② SPEC 独立表对账（锚点表/近伙伴表/镜像池/变体集——禁互引引擎常量） ---- */
  total++;
  const keysD = Object.keys(DIGITS).map(Number).sort((a, b) => a - b);
  let tabOk = keysD.length === 10 && keysD.every((n, i) => n === i + 1);
  for (const n of keysD) {
    const d = DIGITS[n], s = SPEC_DIGITS[n];
    if (JSON.stringify(d.anchors) !== JSON.stringify(s.anchors)) tabOk = false;
    if (JSON.stringify(d.strokes) !== JSON.stringify(s.strokes)) tabOk = false;
  }
  const nearOk = JSON.stringify(LISTEN_NEAR) === JSON.stringify(SPEC_NEAR);
  const mirOk = JSON.stringify(MIRROR_POOL) === JSON.stringify(SPEC_MIRROR_POOL) &&
                JSON.stringify(['', 'm', 'r', 'f']) === JSON.stringify(SPEC_MIRROR_VARS);
  /* 锚点基础真值承 §0.56：2-6 锚 / 首锚方向（上部或左部）/ 多笔 4/5/7/10 */
  let nOk = true, dirOk = true, strokeOk = true;
  for (const n of keysD) {
    const d = DIGITS[n];
    if (!(d.anchors.length >= 2 && d.anchors.length <= 6)) nOk = false;
    const a0 = d.anchors[0];
    if (!(a0[1] < 50 || a0[0] < 50)) dirOk = false;
    const multi = [4, 5, 7, 10].indexOf(n) >= 0;
    if (multi !== (d.strokes.length >= 2)) strokeOk = false;
  }
  const specTabOk = tabOk && nearOk && mirOk && nOk && dirOk && strokeOk;
  if (specTabOk) npass++;
  units.specTable = { ok: specTabOk, digits: tabOk, near: nearOk, mirror: mirOk,
                      n2to6: nOk, startDir: dirOk, strokes: strokeOk };

  /* ---- ③ 自推负向断言（防退化回跟点：中间锚点永不发光——class/animation 缺席断言） ---- */
  total++;
  const selfPushBad = [];
  const checkSelfPush = tag => {
    const q = cur.quizzes[cur.step];
    if (!q) return;
    if (q.phase === 'write') {
      anchorsEls.forEach((el, i) => {
        if (el.classList.contains('current') && !(i === 0 && q.pos === 0)) {
          selfPushBad.push(tag + ' current@' + i + '/pos' + q.pos);
        }
        if (el.classList.contains('endmark') && !(q.hintMode === 'ends' && i === q.anchors.length - 1)) {
          selfPushBad.push(tag + ' endmark@' + i);
        }
        if (i > 0 && i < q.anchors.length - 1) {         // 中间锚点：呼吸/救援动画必须缺席
          const an = getComputedStyle(el.querySelector('.dot')).animationName;
          if (an === 'tr-breathe' || an === 'tr-resc' || an === 'tr-flash') {
            selfPushBad.push(tag + ' anim@' + i + '=' + an);
          }
        }
      });
    } else {
      if (document.querySelectorAll('.anchor').length) {
        selfPushBad.push(tag + ' anchors-in-pick');
      }
      if (document.querySelectorAll('.card').length !== 4) {
        selfPushBad.push(tag + ' cards!=4');
      }
    }
  };
  /* r5 审查 m-5：扩生成关抽样（flat≥20）——覆盖 dch 循环下全部章型的自推形态 */
  for (const flat of [0, 5, 10, 15, 21, 27, 33, 39]) {
    TR.start(flat);
    let guard = 0;
    while (cur && !cur.done && guard++ < 60) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (state.busy || state.won || state.demo || state.locked) { await wait(40); continue; }
      checkSelfPush('f' + flat);
      if (q.phase === 'pick') await TR.tapCard(q.right);
      else await TR.tapAnchor(q.pos);
    }
  }
  /* 正向对照：ends 模式末锚有 endmark（特性在场）；start 模式末锚无 */
  TR.start(0);
  const endmarkPos = anchorsEls[TR.quiz.anchors.length - 1].classList.contains('endmark');
  TR.start(5);
  const endmarkNeg = !anchorsEls[TR.quiz.anchors.length - 1].classList.contains('endmark');
  const startLit = anchorsEls[0].classList.contains('current') && TR.quiz.pos === 0;
  const negOk = selfPushBad.length === 0 && endmarkPos && endmarkNeg && startLit;
  if (negOk) npass++;
  units.selfpush = { ok: negOk, bad: selfPushBad.slice(0, 5), endmarkPos: endmarkPos,
                     endmarkNeg: endmarkNeg, startLit: startLit };

  /* ---- ④ 错型方向对账（verify 从 SPEC_DIGITS 独立重算，§7 方向规则） ---- */
  total++;
  const specWrongType = (num, pos, i) => {
    const a = SPEC_DIGITS[num].anchors;
    if (i === pos) return null;
    if (i > pos) return 'skip';
    const j = pos + 1 < a.length ? pos + 1 : a.length - 1;
    const k = j === pos ? pos - 1 : pos;
    const dx = a[j][0] - a[k][0], dy = a[j][1] - a[k][1];
    return 'back:' + (Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'down' : 'up') : (dx > 0 ? 'right' : 'left'));
  };
  let wtOk = true;
  for (const num of keysD) {
    const n = SPEC_DIGITS[num].anchors.length;
    for (let pos = 0; pos < n; pos++) {
      for (let i = 0; i < n; i++) {
        const L = genLevel(0);
        const q = L.quizzes[0];
        q.num = num; q.anchors = DIGITS[num].anchors.map(x => x.slice()); q.pos = pos; q.phase = 'write';
        const got = engWrongType(q, i);
        const want = specWrongType(num, pos, i);
        const g = got ? (got.type + (got.dir ? ':' + got.dir : '')) : null;
        if (g !== want) { wtOk = false; break; }
      }
      if (!wtOk) break;
    }
    if (!wtOk) break;
  }
  /* UI 侧实证（stub play log）：flat0 数字1 pos0 点锚1=跳笔→tra_w_wait；pos1 回点锚0=逆笔→tra_w_down */
  const origPlay = KIDS.voice.play, origQ = KIDS.voice.queue;
  const plog = [];
  KIDS.voice.play = function (k) { plog.push(typeof k === 'string' ? k : k.key); };
  TR.start(0);
  await TR.tapAnchor(1);                              // 跳笔（i=1 > pos=0）
  await TR.tapAnchor(0);                              // 点对 → pos=1
  await TR.tapAnchor(0);                              // 逆笔（i=0 < pos=1；末段方向 down）
  KIDS.voice.play = origPlay;
  const uiWtOk = plog.indexOf('tra_w_wait') >= 0 && plog.indexOf('tra_w_down') >= 0;
  const wrongTypeOk = wtOk && uiWtOk;
  if (wrongTypeOk) npass++;
  units.wrongType = { ok: wrongTypeOk, engineParity: wtOk, uiLog: plog };

  /* ---- ⑤ 不重头（引擎级）+ 选卡期点板无效 ---- */
  total++;
  const LN = genLevel(0);                        // 题 0 恒数字 1（两锚点）
  const qN = LN.quizzes[0];
  const n1 = engTapAnchor(LN, 1);                // 点错（点非当前锚点）
  const c51 = n1 === 'wrong' && qN.miss === 1 && qN.pos === 0 && LN.missTotal === 1;
  const n2 = engTapAnchor(LN, 0);                // 当前锚点重试点对 → pos 进 1
  const c52 = n2 === 'right' && qN.pos === 1 && qN.miss === 1;
  const n3 = engTapAnchor(LN, 0);                // 再错：pos 不进（不重头）
  const c53 = n3 === 'wrong' && qN.pos === 1 && qN.miss === 2 && LN.missTotal === 2;
  const n4 = engTapAnchor(LN, 1);                // 题完成
  const c54 = n4 === 'done' && qN.solved && LN.step === 1 && LN.quizzes[1].pos === 0;
  const L10 = genLevel(10);                       // dch3 听数：选卡期点板无效
  const c55 = L10.quizzes[0].phase === 'pick' && engTapAnchor(L10, 0) === null &&
              L10.quizzes[0].pos === 0 && engPickCard(L10, L10.quizzes[0].right) === 'right' &&
              L10.quizzes[0].phase === 'write';
  const c56 = engPickCard(L10, (L10.quizzes[0].right + 1) % 4) === null;   // write 相位选卡无效
  const noReset = c51 && c52 && c53 && c54 && c55 && c56;
  if (noReset) npass++;
  units.noreset = { ok: noReset, c51: c51, c52: c52, c53: c53, c54: c54,
                    pickGuard: c55, writeGuard: c56 };

  /* ---- ⑥ 选卡语义（真实 UI：flat10 listen / flat15 mirror） ---- */
  total++;
  TR.start(10);
  const q10 = TR.quiz;
  const cardsS = q10.cards.map(String);
  const stListen = q10.kind === 'listen' && q10.phase === 'pick' &&
                   q10.cards.length === 4 && cardsS.indexOf(String(q10.num)) === q10.right;
  const nearArr = SPEC_NEAR[q10.num] || [];
  const nearIn = nearArr.length ? nearArr.some(p => cardsS.indexOf(String(p)) >= 0) : true;
  const wI = (q10.right + 1) % 4;
  const rw6 = await TR.tapCard(wI);
  const c61 = rw6 === 'wrong' && TR.quiz.miss === 1 && TR.quiz.phase === 'pick' &&
              TR.quiz.right === q10.right && TR.currentLevel.miss === 1;
  const rr6 = await TR.tapCard(q10.right);
  const c62 = rr6 === 'right' && TR.quiz.phase === 'write' && TR.quiz.kind === 'listen' &&
              TR.quiz.anchors.join() === Array.from({ length: DIGITS[q10.num].anchors.length }, (_, i) => i).join();
  TR.start(15);
  const kinds15 = [];
  const L15 = genLevel(15);
  L15.quizzes.forEach(q => kinds15.push(q.kind));
  const q15 = TR.quiz;
  const mirSet = new Set([String(q15.num), q15.num + 'm', q15.num + 'r', q15.num + 'f']);
  const c63 = JSON.stringify(kinds15) === JSON.stringify(SPEC_KINDS4) &&
              q15.kind === 'mirror' && SPEC_MIRROR_POOL.indexOf(q15.num) >= 0 &&
              q15.cards.every(c => mirSet.has(c)) && String(q15.cards[q15.right]) === String(q15.num);
  /* r5 试玩 P1 防回归：变体 computed transform 实测（CSS 选择器错配时数据层全对但视觉全 none——
     v-* 挂内层 .g，选择器须 .g.v-*；正体恒 none，m=matrix(-1,0,0,1 / r=matrix(-1,0,0,-1 / f=matrix(1,0,0,-1） */
  const mirTf = { m: 'matrix(-1, 0, 0, 1', r: 'matrix(-1, 0, 0, -1', f: 'matrix(1, 0, 0, -1' };
  const gEls = Array.prototype.map.call(document.querySelectorAll('.card'), b => b.querySelector('.g'));
  const c65 = gEls.length === 4 && gEls.every((gEl, i) => {
    const cs = String(q15.cards[i]).match(/([mrf])$/);
    const tf = getComputedStyle(gEl).transform;
    return cs ? tf.indexOf(mirTf[cs[1]]) === 0 : tf === 'none';
  });
  KIDS.voice.play = function (k) { plog.push(typeof k === 'string' ? k : k.key); };
  await TR.tapCard((q15.right + 1) % 4);
  KIDS.voice.play = origPlay;
  const c64 = plog.indexOf('tra_w_mir') >= 0 && TR.quiz.miss === 1;
  const pickOk = stListen && nearIn && c61 && c62 && c63 && c64 && c65;
  if (pickOk) npass++;
  units.pick = { ok: pickOk, listen: stListen && nearIn, wrong: c61, right: c62,
                 mirror: c63, mirTf: c65, mirWrongClip: c64, kinds15: kinds15 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（taps=Σ锚，3 星不弹层不写档） ---- */
  total++;
  TR.start(0);
  const wantTaps = cur.quizzes.reduce((s, q) => s + (q.phase === 'pick' ? 1 : 0) + q.anchors.length, 0);
  const a0 = await TR.autoSolve();
  const lv0 = TR.currentLevel;
  const smokeA = a0.done && a0.taps === wantTaps && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, want: wantTaps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat0 先点错 1 次再 autoSolve（miss=1 → 2 星） ---- */
  total++;
  TR.start(0);
  const wrongIdx = TR.quiz.anchors[TR.quiz.pos] + 1;
  const rw = await TR.tapAnchor(wrongIdx);
  const a1 = await TR.autoSolve();
  const lv1 = TR.currentLevel;
  const smokeB = rw === 'wrong' && a1.done && lv1.done && lv1.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat0miss1 = { ok: smokeB, rw: rw, miss: lv1.miss, stars: engStars(cur) };

  /* ---- ⑨ 星级规则（引擎构造直测：失败尝试总数 0=3★/1-2=2★/≥3=1★） ---- */
  total++;
  const LS = genLevel(5);
  const s9 = [];
  [0, 1, 2, 3, 7].forEach(m => { LS.missTotal = m; s9.push(engStars(LS)); });
  const starsOk = s9[0] === 3 && s9[1] === 2 && s9[2] === 2 && s9[3] === 1 && s9[4] === 1;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, got: s9, want: [3, 2, 2, 1, 1] };

  /* ---- ⑩ 救援钟：方向级/答案级（相位分流；动作即清） ---- */
  total++;
  TR.start(0);
  const wantAnchor = () => anchorsEls[TR.quiz.pos];
  const dOkW = rescueDir() && anchorsEls[0].classList.contains('flash');   // pos0=起点 flash
  const aOkW = rescueAns() && wantAnchor().classList.contains('rescued');
  const actClear = await (async () => {
    await TR.tapAnchor(TR.quiz.pos);
    return !wantAnchor().classList.contains('rescued');
  })();
  TR.start(10);                                    // pick 相位：方向级=卡行 pulse；答案级=正确卡 rescued
  const dOkP = rescueDir() && cardsEl.classList.contains('pulse');
  const aOkP = rescueAns() && cardEls()[TR.quiz.right].classList.contains('rescued');
  const rescueOk = dOkW && aOkW && actClear && dOkP && aOkP;
  if (rescueOk) npass++;
  units.rescue = { ok: rescueOk, dirW: dOkW, ansW: aOkW, clearOnAct: actClear,
                   dirP: dOkP, ansP: aOkP };

  /* ---- ⑪ 布局：双 viewport × flat 0/5/10/15（锚点/卡 ≥64 + 镜像 glyph bbox 在卡内 + ask 显隐） ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    TR.start(g._simFlat);
    const qz = TR.quiz;
    const ans = Array.prototype.map.call(document.querySelectorAll('.anchor'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const cards = Array.prototype.map.call(document.querySelectorAll('.card'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const btns = [rabbitBtn, demoBtn].map(b => ({ w: b.offsetWidth, h: b.offsetHeight }));
    /* 镜像/倒置变体 glyph bbox：transform 后仍在卡盒内（±1px 容差） */
    const cardDom = document.querySelectorAll('.card');
    const bboxOk = Array.prototype.every.call(cardDom, cEl => {
      const gEl = cEl.querySelector('.g');
      if (!gEl) return false;
      const cr = cEl.getBoundingClientRect(), gr = gEl.getBoundingClientRect();
      return gr.width > 8 && gr.height > 8 &&
             gr.left >= cr.left - 1 && gr.right <= cr.right + 1 &&
             gr.top >= cr.top - 1 && gr.bottom <= cr.bottom + 1;
    });
    const askOk = qz.phase === 'pick' ? askEl.style.display === 'flex' &&
                                         askEl.offsetWidth >= 64 : askEl.style.display === 'none';
    const ansOk = qz.phase === 'write' ? ans.length >= 2 && ans.every(b => b.w >= 64 && b.h >= 64)
                                       : ans.length === 0;
    const cardsOk = qz.phase === 'pick' ? cards.length === 4 && cards.every(b => b.w >= 64 && b.h >= 64)
                                        : cards.length === 0;
    const btnOk = btns.every(b => b.w >= 64 && b.h >= 64);
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: g._simFlat, phase: qz.phase, anchors: ans.length, cards: cards.length,
             ansOk: ansOk, cardsOk: cardsOk, bboxOk: bboxOk, askOk: askOk, btnOk: btnOk, ox: ox,
             pass: ansOk && cardsOk && bboxOk && askOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 5, 10, 15]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  TR.start(0);                                    // 还原
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑫ clips 28 全注入 + SPEC_DUR ±60ms 实长断言 + WIN 窗常量 ---- */
  total++;
  const keysC = Object.keys(KIDS.voice.clips);
  const need = ['tra_tut_watch', 'tra_tut_turn', 'tra_hint', 'tra_right', 'tra_wrong']
               .concat(Array.from({ length: 10 }, (_, i) => 'tra_n_' + (i + 1)))
               .concat(['tra_hint2', 'tra_l_q', 'tra_m_q', 'tra_w_pick', 'tra_w_mir',
                        'tra_w_wait', 'tra_w_down', 'tra_w_right', 'tra_w_up', 'tra_w_left'])
               .concat(['core_chapter_end', 'core_day_end', 'core_rest']);
  const preOk = keysC.length === 28 &&
    need.every(k => keysC.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);   // 8s 超时（纪律）
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60);
  const winOk = WIN.WRONG === 1000 && WIN.PICK_RIGHT === 600 && WIN.DONE === 4100 &&
                WIN.DONE >= SPEC_DUR.tra_right + 150 + SPEC_DUR.tra_n_10 + 300;   // 数词链窗下界
  const clipsOk = preOk && durOk && winOk;
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keysC.length, durs: durs, winOk: winOk };

  /* ---- ⑬ 章末 hint=预告下一章 + GEN_HINTS[k]↔dch=k+1（C7 型关键词断言） ---- */
  total++;
  const hintMapOk = nextHint(4) === CHAPTERS[1].hint && nextHint(9) === CHAPTERS[2].hint &&
                    nextHint(14) === CHAPTERS[3].hint && nextHint(19) === CHAPTERS[4].hint &&
                    [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);
  /* r5 审查 m-1：实算对账替代原 (ci+1)%4 巧合等值断言（原式循环论证无判别力）+
     负向禁字面（habitat r4 M-1 同型防御） */
  const negHint = nextHint.toString().indexOf('(ci + 1) % 4') < 0 &&
                  nextHint.toString().indexOf('genLevel(f + 1).dch') >= 0;
  const kwOk = CHAPTERS[1].hint.indexOf('6') >= 0 && CHAPTERS[1].hint.indexOf('起点') >= 0 &&
               CHAPTERS[2].hint.indexOf('听') >= 0 &&
               CHAPTERS[3].hint.indexOf('镜子') >= 0 && CHAPTERS[3].hint.indexOf('正') >= 0 &&
               CHAPTERS[4].hint.indexOf('挑战') >= 0 &&
               GEN_HINTS[0].indexOf('1') >= 0 && GEN_HINTS[0].indexOf('终点') >= 0 &&
               GEN_HINTS[1].indexOf('6') >= 0 && GEN_HINTS[1].indexOf('起点') >= 0 &&
               GEN_HINTS[2].indexOf('听') >= 0 &&
               GEN_HINTS[3].indexOf('挑战') >= 0;
  const hintOk = hintMapOk && kwOk && negHint;
  if (hintOk) npass++;
  units.hint = { ok: hintOk, map: hintMapOk, kw: kwOk, neg: negHint,
                 n4: nextHint(4), n24: nextHint(24), n34: nextHint(34) };

  /* ---- ⑭ verify 提速 + verify 页零写档 ---- */
  total++;
  let lsTrace = null;
  try { lsTrace = localStorage.getItem('kidsgame_trace'); } catch (e) {}
  const speedOk = SPEED === 0.12 && lsTrace === null;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED, lsTrace: lsTrace === null };

  /* ---- ⑮ 数词朗读对拍（完成朗读按题内数字取 tra_n_<num>，逐题序对拍） ---- */
  total++;
  const qGroups = [];
  KIDS.voice.queue = function (parts) {
    qGroups.push(parts.map(p => typeof p === 'string' ? p : p.key));
  };
  TR.start(0);
  const a15 = await TR.autoSolve();
  KIDS.voice.queue = origQ;
  /* flat0 题序恒 [1,2,3,4,5]（offset=0 轮转）：第 k 题完成恰播 [tra_right, tra_n_<第k题num>] */
  const wantSeq = [1, 2, 3, 4, 5];
  const gotSeq = cur.quizzes.map(q => q.num);
  const wantLog = wantSeq.map(n => ['tra_right', 'tra_n_' + n]);
  const numOk = JSON.stringify(qGroups) === JSON.stringify(wantLog);
  const numOkAll = a15.done && JSON.stringify(gotSeq) === JSON.stringify(wantSeq) && numOk;
  if (numOkAll) npass++;
  units.numword = { ok: numOkAll, done: a15.done, seq: gotSeq, groups: qGroups };

  /* ---- ⑯ 听数/镜像题面链对拍（stub queue/play log；题面必播=不播不可解） ---- */
  total++;
  const sGroups = [];
  KIDS.voice.queue = function (parts) { sGroups.push(parts.map(p => typeof p === 'string' ? p : p.key)); };
  const sPlay = [];
  KIDS.voice.play = function (k) { sPlay.push(typeof k === 'string' ? k : k.key); };
  TR.start(10);
  playCue();                                        // 真实页 startLevel 走 playCue（verify 页早退，此处补走）
  const a16 = await TR.autoSolve();
  KIDS.voice.queue = origQ; KIDS.voice.play = origPlay;
  const seq10 = genLevel(10).quizzes.map(q => q.num);
  const wantStems = seq10.map(n => ['tra_l_q', 'tra_n_' + n]);
  const gotStems = sGroups.filter(g => g[0] === 'tra_l_q');
  const done16 = sGroups.filter(g => g[0] === 'tra_right').length;
  const hint2N = sPlay.filter(k => k === 'tra_hint2').length;
  const stemOk = a16.done && JSON.stringify(gotStems) === JSON.stringify(wantStems) &&
                 done16 === 5 && hint2N === 5;
  if (stemOk) npass++;
  units.stem = { ok: stemOk, seq: seq10, stems: gotStems, doneChains: done16, hint2: hint2N };

  /* ---- ⑰ 单关净时长 modeled 下界 ≥40s（40 关全量；§7 时序分账保守下界口径） ---- */
  total++;
  const modeledMs = L => L.quizzes.reduce(
    (m, q) => m + q.anchors.length * (1200 + 200) + 4100, 0);
  let minMod = Infinity, minFlat = -1;
  for (let flat = 0; flat < 40; flat++) {
    const m = modeledMs(genLevel(flat));
    if (m < minMod) { minMod = m; minFlat = flat; }
  }
  const modeledOk = minMod >= 40000;
  if (modeledOk) npass++;
  units.modeled = { ok: modeledOk, minMs: minMod, minFlat: minFlat };

  /* ---- ⑱ 吞输入轻叮+可见回应（write：demo/locked/busy 拦+板 bump；pick：busy 拦+卡行 bump） ---- */
  total++;
  TR.start(0);
  state.demo = true; state.locked = true;                          // 模拟教学"看"演示期
  const swallow1 = (await TR.tapAnchor(0)) === false && boardEl.classList.contains('bump');
  state.demo = false; state.locked = true;                         // 演出窗口（locked）
  const swallow2 = (await TR.tapAnchor(0)) === false;
  state.locked = false; state.busy = true;                         // 反馈占位锁（busy）
  const swallow3 = (await TR.tapAnchor(0)) === false;
  TR.start(10);                                                    // pick 相位 busy 拦（卡行 bump）
  state.busy = true;
  const swallow4 = (await TR.tapCard(0)) === false && cardsEl.classList.contains('bump');
  state.busy = false;                                              // 还原（后续单元自行 start）
  const swallowOk = swallow1 && swallow2 && swallow3 && swallow4 &&
                    TR.currentLevel.step === 0 && TR.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2, busy: swallow3, pickBusy: swallow4 };

  /* ---- ⑲ 教学链：tutorialWatch 真实走完 → __trDemoR='right' ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};
  TR.start(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;           // 折算真实页时长
  const tutOk = window.__trDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__trDemoR, tut: state.tut, watchMs: Math.round(tw) };

  const out = { game: 'trace', total: total, pass: npass, layoutOk: layoutOk,
                levels: levels, gen: gen, units: units, smokes: smokes };
  $id('verify-result').textContent = JSON.stringify(out);
  document.title = (npass === total && layoutOk) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     听数/镜像题面断言走 stub 语音文本/key log（非真播放——纪律） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function () {};
  KIDS.voice.queue = function () {};
  runVerify();
}
