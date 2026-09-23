/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 静态 20 + 生成 20 关全量审计（flat 0-39）：确定性（同 flat 两次生成一致）/
     章型（structWhy 全 null：长度按章（r23：dch3=5）/域 0-7/ch1-3 无连弹/
     dch4 mode↔qi 题型谱+rhythm 互异+chord 间距≥2+qi0 首两音重复+qi4 尾 dosi）/
     同关 5 序列有序签名互异（§3 禁同序列重复）/ 引擎直驱（r23 按 mode 分支：
     echo 逐音 right→done/won；rhythm 点长音键；chord 两键 pick+判定；missTotal=0 → 3 星）/
     dch4 聚合：恰 1 rhythm+恰 1 chord+echo 腿含重复音+跨八度 dosi+长度 ≥2 种
   ② 频率表独立对账：SPEC 定值（本文件独立常量）vs 页面 FREQ ±0.01Hz + DOM 琴键
     8 键 id/data-freq/键序全对齐
   ③ 序列不重头（引擎级）：弹错 miss+1 且 pos 不进，当前音重试可续（§0.54 定版）
   ④ tapKey 语义（flat0 真实 UI）：对='right'/序列完='done'/关完='won'/错='wrong'；
     free 模式='free' 零计数（quiz 快照不变）；start(flat) 外部切关生效
   ⑤ 教学链：tutorialWatch 真实走完（stub 存档）→ __piDemoR='right' 且 tut='help'，
     watch 折算真实时长 ≤16s
   ⑥ 吞输入轻叮+可见回应：demo/locked/听音相位拦钩子输入 + 琴键容器 bump 微动效
   ⑦ UI 冒烟 A：flat0 autoSolve 通关（miss 0 → 3 星，verify 页不弹层不写档）
   ⑧ UI 冒烟 B：flat0 先弹错 1 次再 autoSolve（miss=1 → 2 星）
   ⑨ 星级规则：miss 0=3★/1-2=2★/≥3=1★（引擎构造直测）
   ⑩ 救援钟：14s 方向级=当前应弹键 flash+重听 / 30s 答案级=应弹键 breathe 循环
   ⑪ 布局：双 viewport ×（ch1/ch4）：琴键/模式钮/底栏钮 ≥64、overflowX ≤0、
     琴键描边对底色对比度 ≥3:1
   ⑫ clips：pia_ 6 条 + core 3 条必备全注入+总数 ≥9（r23 子集式——注册 3 新键后 12 亦过）
   ⑬ 章末 hint=预告下一章 + GEN_HINTS[k]↔dch=k+1 关键词（C7 型断言，b22 教训；
     r23 文案：五个音/长音/双音）
   ⑭ verify 提速断言：SPEED=0.12；verify 页零写档（r23 适配：MUTE 种子档首末快照相等
     ——verify 流程零写档语义不变；无前置时 null===null 同过）
   ⑮ r23 作答语义（flat15 真实 UI）：rhythm wrong 不换题可重选+答案键 done 推进；
     chord pick 选中 .sel 在场/same 取消/错集合 wrong 清空可重选/正确集合 done
     （.sel/.good 断言在反馈窗内采样——挂账②判别力）；救援两级直调（挂账⑤）：
     方向级 rescueDir=重弹全曲（phase 转 listen）/答案级 rescueAns=正确键 breathe
     （rhythm 长音键/chord 两答案键齐，SPEC §R4 分层）；
     autoSolve 收尾 won
   ⑯ r23 首次新作答预告：start(dch4 关) .tease 在场（verify 页不写档每次重触发）
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  let lsBase = null;                            // r23：MUTE 种子档基线（verify 零写档=首末快照相等；
  try { lsBase = localStorage.getItem('kidsgame_piano'); } catch (e) {}   // 无前置时 null===null 同过）
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const until = async (fn, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < (ms || 8000)) {
      if (fn()) return true;
      await wait(40);
    }
    return fn();
  };
  const quizSnap = () => JSON.stringify(PI.quiz);

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  let dch4Stat = [];
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1.seqs) === JSON.stringify(L2.seqs);
    let ruleOk = true;
    for (let k = 0; k < L1.seqs.length; k++) {
      if (structWhy(L1.seqs[k], L1.dch, flat, k)) ruleOk = false;
    }
    if (L1.seqs.length !== CH_LEN) ruleOk = false;
    /* 同关有序签名互异（§3 铁律） */
    const sigs = L1.seqs.map(q => q.seq.join(','));
    const uniq = new Set(sigs).size === CH_LEN;
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1 && L1.dch === (L1.ch - 1) % 4 + 1;
    /* 引擎直驱（r23 按 mode 分支）：echo 逐音 → (len-1)×'right'+末音 'done'/'won'；
       rhythm=点长音键 → 'done'/'won'；chord=点两答案键 → 'pick'+'done'/'won' */
    const L3 = genLevel(flat);
    let driveOk = true;                             /* 挂账⑨：expect 数组只写不读=死变量，删除 */
    for (let k = 0; k < L3.seqs.length && driveOk; k++) {
      const q = L3.seqs[k];
      const final = k === L3.seqs.length - 1;
      if (q.mode === 'rhythm') {
        const exp = final ? 'won' : 'done';
        if (engTapKey(L3, NOTE_IDS[q.seq[q.longIdx]]) !== exp) driveOk = false;
      } else if (q.mode === 'chord') {
        if (engTapKey(L3, NOTE_IDS[q.seq[0]]) !== 'pick') { driveOk = false; break; }
        const exp = final ? 'won' : 'done';
        if (engTapKey(L3, NOTE_IDS[q.seq[1]]) !== exp) driveOk = false;
      } else {
        for (let s = 0; s < q.seq.length; s++) {
          const last = s === q.seq.length - 1;
          const exp = last ? (final ? 'won' : 'done') : 'right';
          if (engTapKey(L3, NOTE_IDS[q.seq[s]]) !== exp) { driveOk = false; break; }
        }
      }
    }
    const solvedAll = L3.done && L3.step === CH_LEN && L3.missTotal === 0 && engStars(L3) === 3;
    /* dch4 聚合（r23）：恰 1 rhythm+恰 1 chord（qi1/qi3 定位）+echo 腿含重复音+
       跨八度 dosi+echo 长度 ≥2 种（6/5） */
    if (L1.dch === 4) {
      const echoQs = L1.seqs.filter(q => q.mode === 'echo');
      const hasRep = echoQs.some(q => q.seq.some((v, i) => i > 0 && v === q.seq[i - 1]));
      const hasHi = echoQs.some(q => q.seq.indexOf(7) >= 0);
      const echoLens = new Set(echoQs.map(q => q.seq.length));
      const rhyN = L1.seqs.filter(q => q.mode === 'rhythm').length;
      const choN = L1.seqs.filter(q => q.mode === 'chord').length;
      dch4Stat.push({ flat: flat, rep: hasRep, hi: hasHi, echoLens: echoLens.size >= 2,
                      rhyN: rhyN, choN: choN,
                      m1: L1.seqs[1].mode === 'rhythm', m3: L1.seqs[3].mode === 'chord' });
    }
    const ok = det && ruleOk && uniq && chOk && driveOk && solvedAll;
    if (ok) npass++;
    const rec1 = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, ruleOk: ruleOk, uniq: uniq,
                   chOk: chOk, driveOk: driveOk, solvedAll: solvedAll,
                   seqs: L1.seqs.map(q => (q.mode === 'echo' ? '' : q.mode + ':') +
                                          q.seq.map(i => NOTE_IDS[i]).join(' ')) };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec1;
    else gen[flat] = rec1;
  }
  total++;
  const dch4Ok = dch4Stat.length === 10 && dch4Stat.every(s =>
    s.rep && s.hi && s.echoLens && s.rhyN === 1 && s.choN === 1 && s.m1 && s.m3);
  if (dch4Ok) npass++;
  units.dch4 = { ok: dch4Ok, n: dch4Stat.length, stat: dch4Stat };

  /* ---- ② 频率表独立对账（SPEC §0.54 定值独立常量 + DOM 键对齐） ---- */
  total++;
  const SPEC_FREQ = { do: 261.63, re: 293.66, mi: 329.63, fa: 349.23,
                      sol: 392.00, la: 440.00, si: 493.88, dosi: 523.25 };
  let freqOk = Object.keys(SPEC_FREQ).length === 8 && NOTE_IDS.length === 8;
  for (const k of Object.keys(SPEC_FREQ)) {
    if (Math.abs(FREQ[k] - SPEC_FREQ[k]) > 0.01) freqOk = false;
  }
  /* DOM：8 键 id=key-<name>、data-freq 与 FREQ 一致、键序 = NOTE_IDS */
  const domKeys = keysEl.querySelectorAll('.key');
  let domOk = domKeys.length === 8;
  for (let i = 0; i < 8 && domOk; i++) {
    const el = domKeys[i], nm = NOTE_IDS[i];
    if (el.id !== 'key-' + nm || el.dataset.name !== nm ||
        Math.abs(parseFloat(el.dataset.freq) - SPEC_FREQ[nm]) > 0.01) domOk = false;
  }
  const freqAll = freqOk && domOk;
  if (freqAll) npass++;
  units.freq = { ok: freqAll, freqOk: freqOk, domOk: domOk };

  /* ---- ③ 序列不重头（引擎级，§0.54 防挫败定版） ---- */
  total++;
  const LN = genLevel(0);                        // 序列0 恒 do-sol
  const qN = LN.seqs[0];
  const n1 = engTapKey(LN, 'mi');                // 弹错
  const c31 = n1 === 'wrong' && qN.miss === 1 && qN.pos === 0 && LN.missTotal === 1;
  const n2 = engTapKey(LN, 'do');                // 当前音重试弹对 → pos 进 1
  const c32 = n2 === 'right' && qN.pos === 1 && qN.miss === 1;
  const n3 = engTapKey(LN, 're');                // 再错：pos 不进（不重头）
  const c33 = n3 === 'wrong' && qN.pos === 1 && qN.miss === 2 && LN.missTotal === 2;
  const n4 = engTapKey(LN, 'sol');               // 序列完成
  const c34 = n4 === 'done' && qN.solved && LN.step === 1 && LN.seqs[1].pos === 0;
  const noReset = c31 && c32 && c33 && c34;
  if (noReset) npass++;
  units.noreset = { ok: noReset, c31: c31, c32: c32, c33: c33, c34: c34 };

  /* ---- ④ tapKey 语义（flat0 真实 UI 状态机） ---- */
  total++;
  const modeFollow0 = PI.mode() === 'follow';
  PI.start(0);
  const stOk0 = PI.currentLevel.flat === 0 && PI.currentLevel.ch === 1 && PI.quiz.seq.join() === 'do,sol';
  await until(() => PI.phase === 'play' && !state.locked);
  const snap0 = quizSnap();
  const w1 = await PI.tapKey('mi');              // 错：'wrong'+miss+1+pos 不进
  const c41 = w1 === 'wrong' && PI.quiz.miss === 1 && PI.quiz.pos === 0 &&
              PI.currentLevel.miss === 1 && quizSnap() !== snap0;
  const r1 = await PI.tapKey('do');              // 对：'right' pos+1
  const c42 = r1 === 'right' && PI.quiz.pos === 1;
  const r2 = await PI.tapKey('sol');             // 序列完成：'done' step+1 新序列归零
  const c43 = r2 === 'done' && PI.currentLevel.step === 1 &&
              PI.quiz.step === 1 && PI.quiz.pos === 0 && PI.quiz.miss === 0;
  /* 自由模式：'free' 零计数（quiz 快照不变） */
  const lvBefore = JSON.stringify(PI.currentLevel);
  PI.setMode('free');
  const c44 = PI.mode() === 'free' && PI.phase === 'free';
  const snapF = quizSnap();
  const f1 = PI.tapKey('mi');
  const f2 = PI.tapKey('dosi');
  const lvAfter = JSON.stringify(PI.currentLevel);
  const c45 = f1 === 'free' && f2 === 'free' && quizSnap() === snapF && lvAfter === lvBefore;
  PI.setMode('follow');
  const c46 = PI.mode() === 'follow' && PI.currentLevel.flat === 0 &&
              PI.currentLevel.step === 0 && PI.quiz.seq.join() === 'do,sol';
  const tapOk = modeFollow0 && stOk0 && c41 && c42 && c43 && c44 && c45 && c46;
  if (tapOk) npass++;
  units.tap = { ok: tapOk, follow0: modeFollow0, st0: stOk0, c41: c41, c42: c42, c43: c43,
                freeMode: c44 && c45, backFollow: c46 };

  /* ---- ⑤ 教学链：tutorialWatch 真实走完 → __piDemoR='right' ---- */
  total++;
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};
  PI.start(0);
  const t0 = Date.now();
  await tutorialWatch();
  const tw = (Date.now() - t0) / SPEED;           // 折算真实页时长
  const tutOk = window.__piDemoR === 'right' && state.tut === 'help' &&
                cur.flat === 0 && tw <= 16000;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, demoR: window.__piDemoR, tut: state.tut, watchMs: Math.round(tw) };

  /* ---- ⑥ 吞输入轻叮+可见回应：demo/locked/听音相位拦钩子输入 + bump ---- */
  total++;
  PI.start(0);
  state.demo = true; state.locked = true;                          // 模拟教学"看"演示期
  const swallow1 = (await PI.tapKey('do')) === false && keysEl.classList.contains('bump');
  state.demo = false; state.locked = true;                         // 演出窗口（locked）
  const swallow2 = (await PI.tapKey('do')) === false;
  state.locked = false;
  cancelRuns(); state.phase = 'listen'; state.locked = true;       // 兔子弹（听音相位）
  const swallow3 = (await PI.tapKey('do')) === false;
  state.locked = false;                                            // 还原（后续单元自行 start）
  const swallowOk = swallow1 && swallow2 && swallow3 && PI.currentLevel.step === 0 &&
                    PI.quiz.pos === 0 && PI.quiz.miss === 0;
  if (swallowOk) npass++;
  units.swallow = { ok: swallowOk, demo: swallow1, locked: swallow2, listen: swallow3 };

  /* ---- ⑦ UI 冒烟 A：flat0 autoSolve 通关（miss 0 → 3 星，不弹层不写档） ---- */
  total++;
  PI.start(0);
  const wantTaps = cur.seqs.reduce((s, q) => s + q.seq.length, 0);
  const a0 = await PI.autoSolve();
  const lv0 = PI.currentLevel;
  const smokeA = a0.done && a0.taps === wantTaps && lv0.done && lv0.won &&
                 engStars(cur) === 3 && !document.querySelector('.k-celebrate');
  if (smokeA) npass++;
  smokes.flat0 = { ok: smokeA, taps: a0.taps, want: wantTaps, stars: engStars(cur) };

  /* ---- ⑧ UI 冒烟 B：flat0 先弹错 1 次再 autoSolve（miss=1 → 2 星） ---- */
  total++;
  PI.start(0);
  await until(() => PI.phase === 'play' && !state.locked);
  const rw = await PI.tapKey(PI.quiz.seq[PI.quiz.pos] === 'do' ? 'mi' : 'do');
  const a1 = await PI.autoSolve();
  const lv1 = PI.currentLevel;
  const smokeB = rw === 'wrong' && a1.done && lv1.done && lv1.miss === 1 && engStars(cur) === 2;
  if (smokeB) npass++;
  smokes.flat0miss1 = { ok: smokeB, rw: rw, miss: lv1.miss, stars: engStars(cur) };

  /* ---- ⑨ 星级规则（引擎构造直测：0=3★/1-2=2★/≥3=1★） ---- */
  total++;
  const LS = genLevel(5);
  const s9 = [];
  [0, 1, 2, 3, 7].forEach(m => { LS.missTotal = m; s9.push(engStars(LS)); });
  const starsOk = s9[0] === 3 && s9[1] === 2 && s9[2] === 2 && s9[3] === 1 && s9[4] === 1;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, got: s9, want: [3, 2, 2, 1, 1] };

  /* ---- ⑩ 救援钟：方向级 flash / 答案级 breathe（应弹键 DOM 断言） ---- */
  total++;
  PI.start(0);
  await until(() => PI.phase === 'play' && !state.locked);
  const wantKey = () => document.getElementById('key-' + PI.quiz.seq[PI.quiz.pos]);
  const dOk = rescueDir() && wantKey().classList.contains('flash');
  const aOk = rescueAns() && wantKey().classList.contains('breathe');
  const actClear = await (async () => {           // 有效动作清 breathe（回到等待态）
    await PI.tapKey(PI.quiz.seq[PI.quiz.pos]);
    return !wantKey().classList.contains('breathe');
  })();
  const rescueOk = dOk && aOk && actClear;
  if (rescueOk) npass++;
  units.rescue = { ok: rescueOk, dir: dOk, ans: aOk, clearOnAct: actClear };

  /* ---- ⑪ 布局：双 viewport ×（ch1 flat0 / ch4 flat15）量测 ---- */
  function simView(w, h) {
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    PI.start(g._simFlat);
    const keys = Array.prototype.map.call(keysEl.querySelectorAll('.key'), b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const btns = [btnFree, btnFollow, rabbitBtn, replayBtn].map(b => ({
      w: b.offsetWidth, h: b.offsetHeight }));
    const keyOk = keys.length === 8 && keys.every(b => b.w >= 64 && b.h >= 64);
    const btnOk = btns.every(b => b.w >= 64 && b.h >= 64);
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, keys: keys.length, keyOk: keyOk, btnOk: btnOk, ox: ox,
             pass: keyOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const flat of [0, 15]) {
    $id('game')._simFlat = flat;
    sims.push(simView(1280, 800));
    sims.push(simView(800, 1180));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  PI.start(0);                                    // 还原
  const layoutOk = sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑫ clips：pia_ 6 + core 3 必备全注入 + 总数 ≥9（r23 子集式——注册 3 新键后 12 亦过） ---- */
  total++;
  const keysC = Object.keys(KIDS.voice.clips);
  const need = ['pia_tut_watch', 'pia_tut_turn', 'pia_hint', 'pia_right', 'pia_wrong', 'pia_like',
                'core_chapter_end', 'core_day_end', 'core_rest'];
  const clipsOk = keysC.length >= 9 &&
    need.every(k => keysC.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  if (clipsOk) npass++;
  units.clips = { ok: clipsOk, n: keysC.length, keys: keysC };

  /* ---- ⑬ 章末 hint=预告下一章 + GEN_HINTS[k]↔dch=k+1（C7 型关键词断言） ---- */
  total++;
  /* 语义：flat4=ch1 末关 → CHAPTERS[1].hint（挂在 ch1 上、预告 ch2），依次类推；
     生成关 flat24=ch5(dch1) 末 → 下一章 ch6=dch2 → GEN_HINTS[1]（k↔dch=k+1，禁右移） */
  const hintMapOk = nextHint(4) === CHAPTERS[1].hint && nextHint(9) === CHAPTERS[2].hint &&
                    nextHint(14) === CHAPTERS[3].hint && nextHint(19) === CHAPTERS[4].hint &&
                    nextHint(24) === GEN_HINTS[1] && nextHint(34) === GEN_HINTS[3];
  /* r23 新文案：dch3=五个音；dch4=重复+小do+长音+双音（C7 型关键词断言） */
  const kwOk = GEN_HINTS[0].indexOf('两个音') >= 0 && GEN_HINTS[1].indexOf('三个音') >= 0 &&
               GEN_HINTS[2].indexOf('五个音') >= 0 && GEN_HINTS[3].indexOf('重复') >= 0 &&
               GEN_HINTS[3].indexOf('小do') >= 0 && GEN_HINTS[3].indexOf('长音') >= 0 &&
               GEN_HINTS[3].indexOf('双音') >= 0 &&
               CHAPTERS[1].hint.indexOf('三个音') >= 0 && CHAPTERS[2].hint.indexOf('五个音') >= 0 &&
               CHAPTERS[3].hint.indexOf('重复') >= 0 && CHAPTERS[3].hint.indexOf('双音') >= 0;
  const hintOk = hintMapOk && kwOk;
  if (hintOk) npass++;
  units.hint = { ok: hintOk, map: hintMapOk, kw: kwOk,
                 n4: nextHint(4), n24: nextHint(24), n34: nextHint(34) };

  /* ---- ⑭ verify 提速 + verify 页零写档（r23 适配：MUTE 种子档在场时=首末快照相等，
     语义=verify 流程零写档；无前置（主线直跑）时 null===null 同过） ---- */
  total++;
  let lsPiano = null;
  try { lsPiano = localStorage.getItem('kidsgame_piano'); } catch (e) {}
  const speedOk = SPEED === 0.12 && lsPiano === lsBase;
  if (speedOk) npass++;
  units.speed = { ok: speedOk, SPEED: SPEED, lsUnchanged: lsPiano === lsBase };

  /* ---- ⑮ r23 作答语义（flat15=dch4 真实 UI：echo 长曲+rhythm+chord） ---- */
  total++;
  PI.start(15);
  await until(() => PI.phase === 'play' && !state.locked);
  const L15 = genLevel(15);                      // 独立实例推导答案（确定性=题面一致）
  const driveEcho = async (q, final) => {        // echo 腿逐音驱动
    for (let s = 0; s < q.seq.length; s++) {
      const exp = s === q.seq.length - 1 ? (final ? 'won' : 'done') : 'right';
      if (await PI.tapKey(NOTE_IDS[q.seq[s]]) !== exp) return false;
    }
    return true;
  };
  const e0 = await driveEcho(L15.seqs[0], false);      // qi0 echo6 → step1
  await until(() => PI.phase === 'play' && !state.locked);   // done→runSequence listen 等待
  const rq15 = L15.seqs[1];                            // qi1 rhythm
  const ansName = NOTE_IDS[rq15.seq[rq15.longIdx]];
  const rhyWrongName = NOTE_IDS[(rq15.seq[rq15.longIdx] + 3) % 8];   // 恒异于答案
  /* 挂账⑤：作答题救援两级直调（SPEC §R4 救援分层推导——14s 方向级=重弹全曲 /
     30s 答案级=正确键 breathe；verify 直驱函数测不等真实钟摆阈值，⑩ 已测 echo 侧）。
     直调无 miss/step 副作用，后续 miss 断言（k1/k5/k7）不受污染 */
  const rDir = rescueDir() === true && PI.phase === 'listen' && state.locked;
  await until(() => PI.phase === 'play' && !state.locked);   // 重弹全曲完成回作答面
  const rAns = rescueAns() === true &&
               document.getElementById('key-' + ansName).classList.contains('breathe');
  clearBreathe();                                      // 还原（「动作即清」语义 ⑩ 已测）
  const rw1 = await PI.tapKey(rhyWrongName);           // 错选：wrong+miss+1+不换题可重选
  const k1 = rw1 === 'wrong' && PI.quiz.miss === 1 && PI.quiz.step === 1 &&
             PI.quiz.mode === 'rhythm' && PI.currentLevel.miss === 1;
  const rr1 = await PI.tapKey(ansName);                // 答案键：done 推进
  const k2 = rr1 === 'done' && PI.currentLevel.step === 2;
  await until(() => PI.phase === 'play' && !state.locked);   // qi3 listen 等待
  const e2 = await driveEcho(L15.seqs[2], false);      // qi2 echo5 → step3
  await until(() => PI.phase === 'play' && !state.locked);   // qi3 作答等待
  const cq15 = L15.seqs[3];                            // qi3 chord
  const ca = NOTE_IDS[cq15.seq[0]], cb = NOTE_IDS[cq15.seq[1]];
  const cxi = (cq15.seq[0] + 1) % 8;                   // 恒非答案（间距≥2 ⇒ b≥a+2 ⇒ a+1≠b）
  const cx = NOTE_IDS[cxi];
  const p1 = await PI.tapKey(ca);                      // 选中第 1 键：.sel 在场
  const k3 = p1 === 'pick' && document.getElementById('key-' + ca).classList.contains('sel');
  const p2 = await PI.tapKey(ca);                      // 取消选择：same+.sel 灭
  const k4 = p2 === 'same' && !document.getElementById('key-' + ca).classList.contains('sel');
  /* 挂账⑤ chord 侧：方向级=重弹全曲 / 答案级=两答案键齐 breathe（SPEC §R4 分层） */
  const cDir = rescueDir() === true && PI.phase === 'listen' && state.locked;
  await until(() => PI.phase === 'play' && !state.locked);   // 重弹完成回作答面（sel 本空幂等）
  const cAns = rescueAns() === true &&
               document.getElementById('key-' + ca).classList.contains('breathe') &&
               document.getElementById('key-' + cb).classList.contains('breathe');
  clearBreathe();                                      // 还原
  const p3 = await PI.tapKey(cx);                      // 错集合 {x,a}：pick 后 wrong 清空
  const p4 = await PI.tapKey(ca);
  const k5 = p3 === 'pick' && p4 === 'wrong' && PI.quiz.miss === 1 &&
             PI.currentLevel.miss === 2 &&                 /* 本序列 1 错+前题 1 错=总 2 */
             !document.querySelector('.key.sel') && PI.currentLevel.step === 3;
  const p5 = await PI.tapKey(ca);                      // 重选：pick+补 b=集合对 → done
  /* 审查M1(r23)+挂账②：.sel/.good 断言采样点=反馈窗内（tapKey 发起后 wait(50*SPEED)，
     早于 busy 窗 200*SPEED 与 runSequence 重发的 clearSel）——原版稳态采样时
     runSequence 已 clearSel 洗掉 .sel，删 clearSel 修复照样绿=无判别力；窗内断言
     才锁死「chord 答对先清 .sel 再上 .good」这一修复面 */
  const p6p = PI.tapKey(cb);
  await wait(50 * SPEED);                              // 反馈窗内采样（busy 窗未出）
  const gElA = document.getElementById('key-' + ca), gElB = document.getElementById('key-' + cb);
  const wSel = !document.querySelector('.key.sel');    // 窗内 .sel 必须已清（M1 修复面）
  const wGood = gElA.classList.contains('good') && gElB.classList.contains('good');
  const p6 = await p6p;
  const k6 = p5 === 'pick' && p6 === 'done' && PI.currentLevel.step === 4 && wSel && wGood;
  const a15 = await PI.autoSolve();                    // qi4 echo5 收尾（autoSolve mode 分支）
  const k7 = a15.done && PI.currentLevel.done && PI.currentLevel.won &&
             PI.currentLevel.miss === 2 && engStars(cur) === 2;   /* 两次探索错选=2★（口径实证） */
  const ansOk = e0 && k1 && k2 && e2 && k3 && k4 && k5 && k6 && k7 &&
                rDir && rAns && cDir && cAns;          /* 挂账⑤：救援两级直调并入单元判据 */
  if (ansOk) npass++;
  units.answer = { ok: ansOk, e0: e0, rhyWrongKeep: k1, rhyDone: k2, e2: e2, pick: k3,
                   same: k4, chWrongClear: k5, chDone: k6, wonMiss2Stars2: k7,
                   rhyRescueDir: rDir, rhyRescueAns: rAns,
                   choRescueDir: cDir, choRescueAns: cAns };

  /* ---- ⑯ r23 首次新作答预告：start(dch4 关) .tease 在场（verify 页不写档每次重触发） ---- */
  total++;
  PI.start(15);
  const teaseOk = await until(() => !!document.querySelector('.key.tease'), 4000);
  if (teaseOk) npass++;
  units.tease = { ok: teaseOk };

  const out = { game: 'piano', total: total, pass: npass, layoutOk: layoutOk,
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
