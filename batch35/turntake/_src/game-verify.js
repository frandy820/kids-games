/* ================= ?verify=1 自检（仅 verify 分支加载执行）——12 单元
   2026-09-13 难度升级改造同步：渴度三级+比较判定（ch1-2 点最渴）/排序浇（ch3-4 三步）/
   兔子 seeded 约 1/3 浇错（纠错回合 turn='k' 不计题号）。
   ① 结构：花 DOM/渴度三档类 t1-t3↔quiz.thirsty 数组/水滴气泡=所有渴盆/指示头像亮灯↔有效回合方/
     大箭头 ch1-2 在场 ch3+ 隐藏/quiz 钩子无 undefined/契约 O 花盆 button 显式 color/触摸目标 ≥96×96/
     clips tt_ 9+core 3 全注入+6 条旧 clip 实长辨别（_clipdur35 实测 ±60ms；tut_watch/hint 文案已改
     待主线复算，新三条占位仅验在场）+双档 simView 布局（flat 0/10/15 × 1280×800/800×1180）
   ② 教学三段：tutorialWatch 真实走完（watch=渴度圈注+看孩子点最渴盆→等兔子浇一盆手收回）→
     __ttDemoR='right'（教学末步=孩子回合点中——gate 口径）→ turn 阶段 tut='help' →
     首题点对 __ttTutSolo+tut='solo'（帮→独）→ 迷你关 done 自动 startLevel(0)；
     watch 段折算真实时长 ≤16s
   ③ 逐关驱动 flat0-19（逐步重读 quiz——b38 坑③连选家族；每有效孩子回合等 turn=='k' 再
     tapFlower(target)——target 断言 verify 独立 argmax(thirsty) 复算）：每题 turn/thirsty 形状
     （ch1 {1,1,3}/ch2 {2,2,3}/ch3-4 三盆互异，最渴恒唯一）/排序题 3 步（中间步 step 不动）/
     纠错回合（rabbitWrong=true：step 不增、turnIdx 推进）/step 孩子题收口序/miss=0；
     dch≤2 非纠错回合 turnIdx===step*2（严格交替）；通关 5 题 0 错 3★
   ④ 契约 M 帧内容断言（渴度 DOM 类===quiz.thirsty 三层）：数值层（quiz.thirsty 1-3）/
     DOM 类层（.flower.tN 与数组逐盆对账）/演出层（水滴气泡=所有渴盆+花头姿态 transform 非 none+
     土色三档递变）× flat0/flat10/flat20
   ⑤ 错路径：ch1 点非应点盆 wrong+miss+1+错链两段 [tt_wrong, tt_hint]+首错方向级=应点花 pulse+
     豁免窗内二击吞 false+对选放行 'right'（I 补）+窗后（真时钟 5217）二错照计 miss=2+
     应点花 breathe（答案级）；ch3 排序错链 [tt_wrong, tt_order_wrong] 分款
   ⑥ 抢点+纠错路径：兔子演出期 tapFlower→'wait'（tt_wait 单发提醒）不罚 miss=0；同回合再点→false；
     兔子浇错（seeded）→纠错回合（turn='k'+rabbitWrong+tt_rabbit_wrong 单发）点 target='right'
     推进且 step 不增
   ⑦ 星级口径（引擎构造直测）：0 错=3★/1-2=2★/≥3=1★ 永不 0★
   ⑧ 生成关 flat20-39：dch 独立复算（mulberry32 python 式 JS 复刻——取数序 dch→nR→空位→逐回合
     渴度+兔子对错全序列对账）+turnSeq 先验+渴度先验（章型多重集+最渴唯一+相邻 argmax 互异）+
     确定性（同 flat 两次 JSON 一致）+引擎直驱通关（含纠错回合模拟）+dch1-4 全现
   ⑨ 错链豁免窗静态值 ≥5217（=1752+150+estMs(7 字 3015)+300，estMs 口径待主线回填）+源码级
     （wrongChainUntil 真时字面/救援 guard/startLevel 重置/I 补 guard 条件式）+契约族
     A/B/C/E/F/K/N/O/G/H/T+兔子演出 500+700=1200+SPEED=0.12+渴度引擎锚+hint 双录
     （CHAPTERS/GEN_HINTS 独立硬编码对账+nextHint 4/9/14/19 数值断言+24/29/34/39 实算）
   ⑩ 确认链构成：回合收口步 right 单 clip（__lastQueue===['tt_right']，无 keyless——契约 N；
     排序中间步无 clip 不入链）
   ⑪ 写档（origLS 模式——防毁真实档）：保存 localStorage.getItem('kidsgame_turntake')→
     KIDS.init 真跑+autoSolve 通关→localStorage 写档 v1.0/levels['1-0'].stars=3/plays=1→测后恢复
   ⑫ 真实路径：fresh v1.0 存档（tutSeen）+start(0) 首关钩子形态（turn/thirsty[3]/target/step/
     turnIdx/rabbitWrong/n=9/K=5/R=4）+freshTut 教学分支源码在场+window.TT 真实页暴露
   结果写 #verify-result + window.__ttVlog + document.title='VERIFY PASS n/n'（初始 title=
   游戏名，跑完才设——禁先设 'VERIFY'） */
async function runVerify() {
  document.body.classList.add('verify');
  const units = {};
  let npass = 0, total = 0;

  /* SPEC 文字独立重列（禁抄页面 VOICE/文案/表）——2026-09-13 改造定版句 */
  const SPEC_VOICE = {
    tt_tut_watch: '看！给最渴的花浇水', tt_tut_turn: '你来浇一浇', tt_hint: '找找最渴的那盆',
    tt_right: '浇对啦，花开咯', tt_wrong: '这盆不渴哦', tt_wait: '该小兔子浇啦，等等它',
    tt_order_hint: '按最渴到最不渴的顺序浇', tt_order_wrong: '先浇更渴的那盆',
    tt_rabbit_wrong: '小兔子浇错啦，帮帮它'
  };
  /* 实长（2026-09-13 主线重合成后 ffprobe 实测，verify 同 ±60ms 口径）：9 条全罩
     （tut_watch/hint 为 v2 新文案实测；order/rabbit 三条已从占位在场断言升级为实长断言） */
  const SPEC_DUR = { tt_tut_watch: 3384, tt_tut_turn: 1776, tt_hint: 2280,
                     tt_right: 2472, tt_wrong: 1752, tt_wait: 2976,
                     tt_order_hint: 2928, tt_order_wrong: 2328, tt_rabbit_wrong: 3048 };
  const SPEC_DUR_NEW = [];   // 已全部并入 SPEC_DUR 实长断言（2026-09-13）
  const SPEC_CORE_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest'];
  const SPEC_CHAPTER_HINTS = { 1: '还是你一次我一次，稳稳浇', 2: '箭头要休息啦，看谁亮灯',
                               3: '顺序会变啦，大挑战', 4: '新一轮轮流浇花' };
  const SPEC_GEN_HINTS = ['你一次我一次', '小小花园', '看灯等一等', '轮流大挑战'];
  const SPEC_WRONG_CHAIN = 5217;                  // 改造算式：wrong 1752+150+estMs(7 字 3015)+300
  const estMs = n => n * 345 + 600;               // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径；
                                                   // 新句窗按此口径，主线实测后回填）
  const amax = a => a.reduce((b, v, i) => v > a[b] ? i : b, 0);   // 独立 argmax（verify 口径）

  /* 等可交互有效孩子回合（兔子演出/浇水演出/教学演示自动推进——只等待）；done/won 视为解锁 */
  const unlocked2 = async () => {
    let wg = 0;
    while (wg++ < 3000) {
      if (!cur || cur.done || state.won) return true;
      const q = cur.turns[cur.turnIdx];
      if (q && (q.turn === 'k' || q._fix) && !state.locked && !state.watering && !state.rabbit && !state.demo) return true;
      await wait(50);
    }
    return false;
  };
  const sleep = ms => new Promise(w => setTimeout(w, ms));

  window.__ttProg = 'U1';
  /* ---- ① 结构 ---- */
  total++;
  startLevel(0);
  await unlocked2();
  const q1 = window.TT.quiz;
  const flowersDom = Array.from(flowersEl.querySelectorAll('.flower'));
  const quizJson = JSON.stringify(q1) + JSON.stringify(window.TT.currentLevel);
  const tiersDom = flowersDom.map(f => (f.className.match(/\bt([123])\b/) || [, '0'])[1]);
  const dropsDom = flowersDom.map(f => !!f.querySelector('.drop'));
  const thOk1 = Array.isArray(q1.thirsty) && q1.thirsty.length === 3 &&
    q1.thirsty.every(v => Number.isInteger(v) && v >= 1 && v <= 3) &&
    q1.thirsty.indexOf(Math.max.apply(null, q1.thirsty)) === q1.thirsty.lastIndexOf(Math.max.apply(null, q1.thirsty)) &&
    q1.thirsty[amax(q1.thirsty)] === Math.max.apply(null, q1.thirsty) &&
    q1.target === amax(q1.thirsty);                               /* target=独立 argmax 复算 */
  const structOk1 = !!q1 && q1.turn === 'k' && flowersDom.length === 3 &&
    q1.flowers === undefined &&                                   /* 旧单下标/flowers 字段已删（breaking） */
    q1.thirsty && thOk1 &&
    tiersDom.every((t, i) => t === String(q1.thirsty[i])) &&      /* DOM 类层↔数值层逐盆对账 */
    dropsDom.every((d, i) => d === (q1.thirsty[i] > 0)) &&        /* 水滴气泡=所有渴盆（不再单标答案） */
    q1.rabbitWrong === false &&
    q1.step === 0 && q1.miss === 0 && q1.turnIdx === 0 &&
    quizJson.indexOf('undefined') < 0 && quizJson.indexOf('NaN') < 0;
  /* 指示头像：亮灯方===有效回合方；大箭头 ch1-2 在场指向当前方 */
  const activeWho = document.querySelector('#turn-bar .who.active');
  const indOk = !!activeWho && activeWho.dataset.side === 'k' &&
    !document.querySelector('.who-r').classList.contains('active') &&
    getComputedStyle(arrowEl).display !== 'none' && arrowEl.classList.contains('at-k');
  /* 契约 O：自建花盆 button 显式 color；触摸目标 ≥96×96 */
  const oBtn = flowersDom[0];
  const sizeOk = flowersDom.every(f => f.offsetWidth >= 96 && f.offsetHeight >= 96);
  const contrOk = !!oBtn && oBtn.tagName === 'BUTTON' &&
    getComputedStyle(oBtn).color === 'rgb(74, 59, 46)' && sizeOk;
  /* clips：tt_ 9+core 3 全注入+旧 clip 实长辨别（±60ms）+新三条在场 */
  const keysAll = Object.keys(KIDS.voice.clips);
  const preClips = keysAll.length === 12 &&
    Object.keys(SPEC_VOICE).concat(SPEC_CORE_KEYS).every(k =>
      keysAll.indexOf(k) >= 0 && KIDS.voice.clips[k].indexOf('data:audio/mpeg;base64,') === 0);
  const durKeys = Object.keys(SPEC_DUR);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 3000);
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - SPEC_DUR[durKeys[i]]) <= 60) &&
    SPEC_DUR_NEW.every(k => keysAll.indexOf(k) >= 0);
  /* 双档布局断言（照 mt/ed simView——flat 0/10/15 × 1280×800+800×1180：
     花盆 ≥96×96+场景/轮到条在场+花钮 color 对 #FBF6EC 对比度 ≥3+无横向溢出；
     教学已过后 startLevel 不重播，直查即稳态） */
  const _lum = c => { const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null; const f = i => { const v = +m[i] / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(1) + 0.7152 * f(2) + 0.0722 * f(3); };
  const _ratioOf = (a, b) => { const x = _lum(a), y = _lum(b);
    return x == null || y == null ? 0 : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  function simView(w, h, flat) {
    const g = document.getElementById('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    startLevel(flat);
    if (flat >= 20)   /* 生成关 dch seeded 禁按章硬算（照 mt 守卫）——直接判不过 */
      return { vp: w + 'x' + h, flat: flat, hitOk: false, sceneOk: false,
               contrast: false, ox: 0, pass: false, note: 'flat>=20 不支持' };
    const fls = Array.from(flowersEl.querySelectorAll('.flower'));
    const hitOk = fls.length === 3 && fls.every(b => b.offsetWidth >= 96 && b.offsetHeight >= 96);
    const sceneOk = sceneEl.offsetWidth >= 64 && sceneEl.offsetHeight >= 64 &&
                    turnBarEl.offsetWidth >= 96 && turnBarEl.offsetHeight >= 40;
    const contrast = _ratioOf(getComputedStyle(fls[0]).color, 'rgb(251, 246, 236)') >= 3;   /* 花钮 #4A3B2E vs 底 #FBF6EC */
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, hitOk: hitOk, sceneOk: sceneOk,
             contrast: contrast, ox: ox, pass: hitOk && sceneOk && contrast && ox <= 0 };
  }
  const sims = [];
  for (const flat of [0, 10, 15]) {
    sims.push(simView(1280, 800, flat));
    sims.push(simView(800, 1180, flat));
  }
  const gEl = document.getElementById('game');
  gEl.style.width = '';
  gEl.style.height = '';
  startLevel(0);
  const layoutOk = sims.every(s => s.pass);
  const s1 = structOk1 && indOk && contrOk && preClips && durOk && layoutOk;
  if (s1) npass++;
  units.struct = { ok: s1, dom: structOk1, tiers: tiersDom, indicator: indOk, contractO: contrOk,
                   clips: preClips, dur: durOk, durs: durs, sizes: sizeOk,
                   layout: layoutOk, sims: sims };

  window.__ttProg = 'U2';
  /* ---- ② 教学三段 ---- */
  total++;
  window.__ttDemoR = null; window.__ttTutSolo = null; window.__ttDemoWait = null;
  startLevel(0);
  await unlocked2();
  const t0 = Date.now();
  await tutorialWatch();
  const tutHelp = window.__ttDemoR === 'right' &&           /* watch 演示末步=孩子回合点最渴盆 'right'（gate 口径） */
    !!window.__ttDemoWait && window.__ttDemoWait.ghostHidden === true &&
    window.__ttDemoWait.turn === 'r' &&                     /* 等兔子浇 1 盆：手收回（ghost 隐去）+轮到兔子 */
    state.tut === 'help' && cur.flat === -1 && cur.turns.length === 3;
  const tw = window.__ttWatchMs != null ? window.__ttWatchMs / SPEED : 1e9;   /* 折算真实页 watch 段时长 */
  const tutSoloT = await unlocked2();
  const qT = window.TT.quiz;
  const rT = qT ? await window.TT.tapFlower(qT.target) : null;   /* "帮"放手题点对应点盆 → 独+startLevel(0) */
  const tutSolo = tutHelp && tutSoloT && rT === 'done' &&
    window.__ttTutSolo === true && tw <= 16000 &&
    window.TT.quiz && window.TT.quiz.turn === 'k' && window.TT.currentLevel.flat === 0;
  if (tutSolo) npass++;
  units.tutorial = { ok: tutSolo, watch: tutHelp, demoR: window.__ttDemoR,
                     demoWait: window.__ttDemoWait, solo: window.__ttTutSolo === true,
                     doneR: rT, watchMs: Math.round(tw) };

  window.__ttProg = 'U3';
  total++;
  const driveRec = {};
  let driveBad = null, driveOk = true, corrSeen = 0, sortSteps = 0;
  for (let flat = 0; flat < 20 && driveOk; flat++) {
    window.__ttProg = 'U3 flat' + flat;
    window.TT.start(flat);
    let expectedStep = 0, taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 900) {
      const ok = await unlocked2();
      if (!ok || !cur || cur.done) break;
      const q = window.TT.quiz;
      if (!q || q.turn !== 'k') { driveBad = 'turn ' + flat; driveOk = false; break; }
      if (q.step !== expectedStep) { driveBad = 'step ' + flat + '/' + expectedStep; driveOk = false; break; }
      if (!Array.isArray(q.thirsty) || q.thirsty.length !== 3 ||
          q.thirsty.some(v => !Number.isInteger(v) || v < 0 || v > 3) ||
          q.target !== amax(q.thirsty)) { driveBad = 'quiz ' + flat; driveOk = false; break; }   /* target=独立 argmax */
      const mx = Math.max.apply(null, q.thirsty);
      if (q.thirsty.indexOf(mx) !== q.thirsty.lastIndexOf(mx)) { driveBad = 'tie ' + flat; driveOk = false; break; }
      if (!q.rabbitWrong && q.thirsty.every(v => v >= 1)) {    /* 题首全盆未浇：章型多重集独立验 */
        const s = q.thirsty.slice().sort((a, b) => a - b).join(',');
        const want = cur.dch === 1 ? '1,1,3' : cur.dch === 2 ? '2,2,3' : '1,2,3';
        if (s !== want) { driveBad = 'shape ' + flat + ' ' + s; driveOk = false; break; }
      }
      if (q.rabbitWrong) {                                     /* 纠错回合：恰一盆已被（错）浇=0 */
        if (q.thirsty.filter(v => v === 0).length !== 1) { driveBad = 'corr0 ' + flat; driveOk = false; break; }
        corrSeen++;
      }
      if (cur.dch <= 2 && !q.rabbitWrong && q.turnIdx !== q.step * 2) { driveBad = 'turnIdx ' + flat; driveOk = false; break; }   /* 严格交替：题 i 在回合 2i（纠错回合豁免） */
      if (cur.dch >= 3 && !q.rabbitWrong && q.thirsty.every(v => v >= 1)) sortSteps++;   /* 排序题首（3 步题）计数 */
      const r = await window.TT.tapFlower(q.target);           /* target 从 quiz 独立读，逐步重读（b38 坑③） */
      if (r === 'right' || r === 'done') {
        taps++;
        const st = window.TT.currentLevel.step;
        if (st === expectedStep + 1) expectedStep = st;        /* 题收口才推进（排序中间步/纠错不动） */
        continue;
      }
      await sleep(300);                                       /* 演出窗吞 null→300ms 间隔重试（b34 坑④） */
    }
    const lv = window.TT.currentLevel;
    const okLv = !!(cur && cur.done && lv && lv.step === 5 && lv.miss === 0 &&
                    engStars(cur) === 3 && taps >= 5);
    driveRec[flat] = { dch: lv && lv.dch, n: lv && lv.n, taps: taps, ok: okLv };
    if (!okLv && driveOk) { driveBad = driveBad || ('level ' + flat); driveOk = false; }
  }
  /* 纠错与排序题确有发生（题表 seeded 已保证——此处防机制静默退化为纯等待） */
  const corrOk = corrSeen >= 10 && sortSteps >= 15;
  if (driveOk && corrOk) npass++;
  units.drive = { ok: driveOk && corrOk, bad: driveBad, corrSeen: corrSeen, sortQs: sortSteps,
                  rec: driveRec };

  window.__ttProg = 'U4';
  total++;
  const frameCheck = () => {
    const q = window.TT.quiz;
    if (!q || q.turn !== 'k') return false;
    const els = Array.from(flowersEl.querySelectorAll('.flower'));
    if (els.length !== 3) return false;
    const tierN = flowersEl.querySelectorAll('.flower.t1, .flower.t2, .flower.t3').length;
    if (tierN !== q.thirsty.filter(v => v > 0).length) return false;   /* 渴盆数↔DOM 类数对账 */
    for (let i = 0; i < 3; i++) {                              /* 逐盆三层对账：数值↔DOM 类↔演出 */
      const t = q.thirsty[i];
      const el = els[i];
      if (Number(el.dataset.i) !== i) return false;            /* 帧内容锚：data-i=盆位（契约 M） */
      const cls = (el.className.match(/\bt([123])\b/) || [, '0'])[1];
      if (cls !== String(t)) return false;                     /* DOM 类层 */
      const hasDrop = !!el.querySelector('.drop');
      if (hasDrop !== (t > 0)) return false;                   /* 演出层：水滴=所有渴盆 */
      const head = el.querySelector('[data-anim="head"]');
      if (!head) return false;
      const tr = getComputedStyle(head).transform;
      if (t > 0 && tr === 'none') return false;                /* 姿态通道：渴盆花头必垂 */
      if (t === 0 && tr !== 'none') return false;              /* 已浇盆复原 */
      const soil = el.querySelector('.soil');
      if (!soil) return false;
      const fill = getComputedStyle(soil).fill;
      if (t === 3 && fill === 'rgb(138, 90, 43)') return false;   /* 土色通道：t3 必变（非健康土色） */
    }
    const act = document.querySelector('#turn-bar .who.active');
    if (!act || act.dataset.side !== q.turn) return false;     /* 指示头像↔有效回合方 */
    return !!bgSvgEl.querySelector('g[data-scene="garden"]');  /* 场景锚在场 */
  };
  const fFrames = {};
  for (const flat of [0, 10, 20]) {
    window.TT.start(flat);
    await unlocked2();
    fFrames[flat] = frameCheck();
  }
  /* 大箭头分章：dch1 在场 / dch3 隐藏（轮到指示亮灯恒在） */
  window.TT.start(10);
  await unlocked2();
  const arrowOff = turnBarEl.classList.contains('no-arrow') && getComputedStyle(arrowEl).display === 'none';
  const frameOk = fFrames[0] && fFrames[10] && fFrames[20] && arrowOff;
  if (frameOk) npass++;
  units.frame = { ok: frameOk, f0: fFrames[0], f10: fFrames[10], f20: fFrames[20], arrowOff: arrowOff };

  window.__ttProg = 'U5';
  total++;
  startLevel(0);
  await unlocked2();
  const q5 = window.TT.quiz;
  const wA = (q5.target + 1) % 3;
  const pW = window.TT.tapFlower(wA);                    /* fire-and-forget（1000ms 防重入窗） */
  const rejW = await window.TT.tapFlower(wA);            /* 窗内紧邻再点=被拦 false */
  const rW = await pW;
  const chainW = window.__lastQueue && window.__lastQueue.length === 2 &&
    window.__lastQueue[0] === 'tt_wrong' && window.__lastQueue[1] === 'tt_hint' &&
    window.__lastQueue.every(p => typeof p === 'string');   /* ch1-2 错链两段全 clip 无 keyless（契约 N） */
  const pulse1 = flowerEl(q5.target) && flowerEl(q5.target).classList.contains('pulse');   /* 首错方向级=应点花 pulse 一轮 */
  const wrongA = rW === 'wrong' && rejW === false && chainW && pulse1 &&
    window.TT.quiz.miss === 1 && window.TT.currentLevel.miss === 1;
  /* 窗后二错照计 miss=2+应点花 breathe（答案级梯度——同题两错；豁免窗=关级真时钟，
     先等窗过再犯二错） */
  await sleep(SPEC_WRONG_CHAIN + 300);                    /* 等首错豁免窗过（真时钟 5217） */
  const wB2 = (q5.target + 2) % 3;
  const rW2 = await window.TT.tapFlower(wB2);            /* 窗后二错照计（miss=2，重设新窗） */
  const breathe2 = flowerEl(q5.target) && flowerEl(q5.target).classList.contains('breathe');
  const wrongB = rW2 === 'wrong' && window.TT.quiz.miss === 2 &&
    window.TT.currentLevel.miss === 2 && breathe2;
  /* I 补：二错新设豁免窗内对选放行（错点吞/对选放行两半齐全） */
  const rPass = await window.TT.tapFlower(q5.target);
  const passOk = rPass === 'right';
  await unlocked2();
  /* ch3 排序错链分款：[tt_wrong, tt_order_wrong]（先浇更渴的那盆） */
  startLevel(10);
  await unlocked2();
  const q5b = window.TT.quiz;
  const wOrd = await window.TT.tapFlower((q5b.target + 1) % 3);
  const chainOrd = wOrd === 'wrong' && window.__lastQueue && window.__lastQueue.length === 2 &&
    window.__lastQueue[0] === 'tt_wrong' && window.__lastQueue[1] === 'tt_order_wrong' &&
    window.__lastQueue.every(p => typeof p === 'string');
  const wrongOk = wrongA && wrongB && passOk && chainOrd;
  if (wrongOk) npass++;
  units.wrong = { ok: wrongOk, first: wrongA, chain: chainW, pulse: pulse1,
                  passInWin: passOk, second: wrongB, breathe: breathe2,
                  orderChain: chainOrd };

  window.__ttProg = 'U6';
  total++;
  /* 6a 抢点（浇对兔子，f0 兔子全浇对）：演出期点花='wait'+不罚；同回合再点 false */
  startLevel(0);
  await unlocked2();
  const q6 = window.TT.quiz;
  await window.TT.tapFlower(q6.target);                 /* 首题点对→浇水→兔子回合接续 */
  let caught = false;
  for (let g = 0; g < 240 && !caught; g++) {            /* 快轮询捕获兔子演出窗（verify ~144ms） */
    const qq = window.TT.quiz;
    if (qq && qq.turn === 'r' && state.rabbit) { caught = true; break; }
    if (!cur || cur.done) break;
    await sleep(10);
  }
  let waitOk = false, waitDetail = {};
  if (caught) {
    const missBefore = window.TT.currentLevel.miss;
    const rWt1 = await window.TT.tapFlower(0);           /* 抢点：点任意花→'wait' */
    const vk = window.__lastVoiceKey;
    const rWt2 = await window.TT.tapFlower(1);           /* 同回合重复抢点→false 轻吞 */
    await unlocked2();                                    /* 兔子演出完→推进正常 */
    const after = window.TT.quiz;
    waitDetail = { r1: rWt1, r2: rWt2, vk: vk };
    waitOk = rWt1 === 'wait' && rWt2 === false && vk === 'tt_wait' &&
      missBefore === 0 && window.TT.currentLevel.miss === 0 &&
      !!after && after.turn === 'k' && after.step === 1 && after.turnIdx === 2 &&
      window.TT.currentLevel.turnIdx === 2;              /* K(0)→R(1)→K(2)：turnSeq 推进正常 */
  }
  /* 6b 兔子浇错→纠错回合（f2 首只兔子 seeded 浇错）：演出期仍 'wait'，错后开纠错
     （turn='k'+rabbitWrong+tt_rabbit_wrong），点 target='right' 推进且 step 不增 */
  startLevel(2);
  await unlocked2();
  const q6b = window.TT.quiz;
  await window.TT.tapFlower(q6b.target);                /* 首题点对→浇错的兔子回合接续 */
  let fixQ = null;
  for (let g = 0; g < 400 && !fixQ; g++) {              /* 等纠错回合开放（演出 1.2s 后） */
    const qq = window.TT.quiz;
    if (qq && qq.rabbitWrong === true && qq.turn === 'k') fixQ = qq;
    else { if (!cur || cur.done) break; await sleep(15); }
  }
  let corrOk2 = false, corrDetail = {};
  if (fixQ) {
    const vkFix = window.__lastVoiceKey;
    const stepBefore = window.TT.currentLevel.step;
    const zeros = fixQ.thirsty.filter(v => v === 0).length;
    const rC = await window.TT.tapFlower(fixQ.target);  /* 纠错=点应点盆 */
    const after = window.TT.quiz;
    corrDetail = { vk: vkFix, r: rC, zeros: zeros };
    corrOk2 = vkFix === 'tt_rabbit_wrong' && zeros === 1 && rC === 'right' &&
      window.TT.currentLevel.step === stepBefore &&      /* 纠错不计题号 */
      (!after || after.step === stepBefore) && (!after || after.rabbitWrong === false) &&
      window.TT.currentLevel.miss === 0;                 /* 纠错不罚 */
  }
  const grabOk = waitOk && corrOk2 && caught && !!fixQ;
  if (grabOk) npass++;
  units.grab = { ok: grabOk, caught: caught, detail: waitDetail, corr: corrDetail, fixSeen: !!fixQ };

  window.__ttProg = 'U7';
  total++;
  const LA = genLevel(10);
  LA.retries = 0; const st3 = engStars(LA) === 3;
  LA.retries = 1; const st2a = engStars(LA) === 2;
  LA.retries = 2; const st2b = engStars(LA) === 2;
  LA.retries = 3; const st1 = engStars(LA) === 1;
  LA.retries = 9; const stFloor = engStars(LA) === 1;    /* 永不 0 星 */
  const starsOk = st3 && st2a && st2b && st1 && stFloor;
  if (starsOk) npass++;
  units.stars = { ok: starsOk, st3: st3, st2: st2a && st2b, st1: st1, floor: stFloor };

  window.__ttProg = 'U8';
  total++;
  /* python 式 JS 复刻（SPEC 口径独立实现，禁抄页面 turnSeqOf/thirstsOf）：
     种子 mulberry32(flat*7919+419)；dch=ri(1,4)；dch≤2=[K,R]*4+[K]；dch≥3=基架内空位各 1
     R+尾 0、额外 m=ri(4,6)-4 个 R 插 5 空位（每空 ≤1）；逐回合渴度（dch≤2 pos=ri(0,2) 相邻
     argmax 不同重掷≤8 兜底 (prev+1)%3 置 3；dch≥3 shuffled([1,2,3]) 同口径兜底左旋）；
     r 回合 rabbitWrong=ri(1,3)===1，错时 rabbitPos=非 argmax 两盆[ri(0,1)] */
  const m32V = a => function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const riV = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const shufV = (arr, rnd) => { const x = arr.slice();
    for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1));
      const tmp = x[i]; x[i] = x[j]; x[j] = tmp; } return x; };
  const amaxV = a => { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; };
  const vLevel = flat => {
    const rnd = m32V(flat * 7919 + 419);
    const dch = flat < 20 ? (Math.floor(flat / 5) % 4) + 1 : riV(rnd, 1, 4);
    let seq;
    if (dch <= 2) seq = ['k', 'r', 'k', 'r', 'k', 'r', 'k', 'r', 'k'];
    else {
      const nR = riV(rnd, 4, 6);
      const slots = [1, 1, 1, 1, 0];
      const m = nR - 4;
      if (m > 0) { const pick = shufV([0, 1, 2, 3, 4], rnd).slice(0, m);
        for (const s of pick) slots[s]++; }
      seq = [];
      for (let k = 0; k < 5; k++) { seq.push('k'); for (let r = 0; r < slots[k]; r++) seq.push('r'); }
    }
    const turns = [];
    let prevArg = -1;
    for (let t = 0; t < seq.length; t++) {
      let th;
      if (dch <= 2) {
        let pos = riV(rnd, 0, 2), g = 0;
        while (pos === prevArg && g++ < 8) pos = riV(rnd, 0, 2);
        if (pos === prevArg) pos = (prevArg + 1) % 3;
        const lo = dch === 1 ? 1 : 2;
        th = [lo, lo, lo]; th[pos] = 3;
      } else {
        th = shufV([1, 2, 3], rnd); let g = 0;
        while (amaxV(th) === prevArg && g++ < 8) th = shufV([1, 2, 3], rnd);
        if (amaxV(th) === prevArg) th = [th[1], th[2], th[0]];
      }
      const arg = amaxV(th);
      let rabbitWrong = false, rabbitPos = arg;
      if (seq[t] === 'r') {
        rabbitWrong = riV(rnd, 1, 3) === 1;
        if (rabbitWrong) {
          const others = [0, 1, 2].filter(j => j !== arg);
          rabbitPos = others[riV(rnd, 0, 1)];
        }
      }
      prevArg = arg;
      turns.push({ turn: seq[t], thirsts: th, rabbitWrong: rabbitWrong, rabbitPos: rabbitPos });
    }
    return { dch: dch, turns: turns };
  };
  const genDch = {};
  let genOk = true, genBad = null, rwCnt = 0, rTot = 0;
  for (let flat = 20; flat < 40 && genOk; flat++) {
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const V = vLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);          /* 确定性：同 flat 两次 JSON 一致 */
    const dchOk = L1.dch === V.dch;
    const seqOk = L1.turns.every((t, k) => t.turn === V.turns[k].turn &&
      t.thirsts.join() === V.turns[k].thirsts.join() &&
      t.rabbitWrong === V.turns[k].rabbitWrong &&
      t.rabbitPos === V.turns[k].rabbitPos);                        /* 全序列对账（含渴度+兔子对错） */
    for (const t of L1.turns) if (t.turn === 'r') { rTot++; if (t.rabbitWrong) rwCnt++; }
    /* turnSeq+渴度先验（独立验算）：structWhy 全规则（序列/章型多重集/最渴唯一/相邻 argmax 互异） */
    let why = structWhy(L1);
    /* 引擎直驱通关（R 回合 engAdvance 收口；浇错回合模拟 UI 置 _fix 后纠错） */
    let drive = true;
    let guard = 0;
    while (!L1.done && guard++ < 60) {
      const t = L1.turns[L1.turnIdx];
      if (t.turn === 'r') {
        if (t.rabbitWrong) { t._fix = true;                          /* 模拟 UI 开纠错 */
          const r = engTapFlower(L1, engTarget(L1));
          if (r !== 'right' && r !== 'done') { drive = false; break; }
          continue;
        }
        engAdvance(L1); continue;
      }
      const r = engTapFlower(L1, engTarget(L1));
      if (r !== 'right' && r !== 'done') { drive = false; break; }
    }
    drive = drive && L1.done && L1.step === 5 && L1.retries === 0 && engStars(L1) === 3;
    genDch[L1.dch] = (genDch[L1.dch] || 0) + 1;
    if (!det || !dchOk || !seqOk || why || !drive) {
      genBad = 'flat' + flat + ' det=' + det + ' dch=' + dchOk + ' seq=' + seqOk +
               ' why=' + why + ' drive=' + drive;
      genOk = false;
    }
  }
  const dchAll = genOk && genDch[1] > 0 && genDch[2] > 0 && genDch[3] > 0 && genDch[4] > 0;   /* 四型全现 */
  const rwOk = rwCnt > 0 && rwCnt < rTot;                           /* 浇错/浇对两态都现（约 1/3） */
  if (genOk && dchAll && rwOk) npass++;
  units.gen = { ok: genOk && dchAll && rwOk, bad: genBad, genDch: genDch,
                rw: rwCnt + '/' + rTot };

  window.__ttProg = 'U9';
  total++;
  const src = document.querySelectorAll('script')[2].textContent;
  const coreSrc = document.querySelectorAll('script')[0].textContent;
  const srcI = src.indexOf('wrongChainUntil = Date.now() + 5217') >= 0 &&
    src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0 &&
    src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0 &&          /* I：豁免窗+救援守卫+重置 */
    src.indexOf('wrongChainUntil && Date.now() < wrongChainUntil && i !== engTarget(cur)') >= 0;   /* I 补：guard 条件式 */
  const winI = SPEC_WRONG_CHAIN >= SPEC_DUR.tt_wrong + 150 + estMs(7) + 300 &&   /* 5217 ≥ 5217（estMs 口径==精确，主线回填） */
    (1500 + 1400) >= SPEC_DUR.tt_right + 300 &&                            /* G/H：浇水窗 2900 ≥ 2772 */
    4100 >= estMs(9) + 300 &&                                              /* watch 延 ≥ 新句 estMs 3705+300 */
    2100 >= SPEC_DUR.tt_tut_turn + 300 &&                                  /* turn 后读题延 ≥2076 */
    (2620 + 400) >= SPEC_DUR.tt_right + 300 &&                             /* celebrate ≥2772 */
    500 + 700 === 1200;                                                    /* 兔子演出 1.2s（缩短无效等待） */
  const srcA = src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })') >= 0 &&
    src.indexOf('KIDS.ui.dayEnd({ nextHint: nextHint(null) })') >= 0;       /* A：启动 lim-1+winFlow null */
  const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
    src.indexOf('if (idle > 14000 && Date.now() - lastDir > 14000)') >= 0 &&
    src.indexOf('idle > 30000') >= 0;                                      /* B：救援双锚 */
  const srcC = coreSrc.indexOf("VER = '1.0'") >= 0 &&
    coreSrc.indexOf("'kidsgame_' + cfg.game") >= 0 &&
    src.indexOf("KIDS.init({ game: 'turntake'") >= 0;                      /* C：存档 v1.0+kidsgame_turntake */
  const srcE = src.indexOf('sv.turntake && sv.turntake.tutSeen') >= 0;     /* E：教学特例先查 */
  const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&
    src.indexOf('(ci + 1)' + ' % 4') < 0;                                  /* F：生成关实算+禁章序右移 */
  const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;           /* J：语义句 10s 节流 */
  const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
    src.indexOf('function rescueTick()') >= 0;                             /* K：面板守卫+命名函数 */
  const srcN = src.indexOf('key:' + ' null') < 0;                          /* N：本款全 clip 无 keyless 段（拼接防自匹配） */
  const srcSeed = src.indexOf('flat * 7919 + 419') >= 0;                   /* 本批常量 seed 419（§0.85） */
  const srcGrad = src.indexOf('q._miss >= 2') >= 0;                        /* miss≥2=应点花 breathe 梯度在场 */
  const srcT = src.indexOf('s.length * 345 + 600') >= 0;                   /* T：estMs 全字符口径在场 */
  const flowBtn = flowersEl.querySelector('.flower');                      /* O：自建 button 显式 color */
  const srcO = !!flowBtn && flowBtn.tagName === 'BUTTON' &&
    getComputedStyle(flowBtn).color === 'rgb(74, 59, 46)';
  const srcThirst = src.indexOf('thirstsOf') >= 0 &&                       /* 渴度引擎锚（改造核心） */
    src.indexOf('rabbitWrong = ri(rnd, 1, 3) === 1') >= 0 &&
    src.indexOf("need = (L.dch >= 3 && q.turn === 'k') ? 3 : 1") >= 0 &&
    src.indexOf('function engTarget(L)') >= 0;
  const srcHint = CHAPTERS[1].hint === SPEC_CHAPTER_HINTS[1] &&   /* hint 双录+数值断言（照 mt/ed） */
                  CHAPTERS[2].hint === SPEC_CHAPTER_HINTS[2] &&
                  CHAPTERS[3].hint === SPEC_CHAPTER_HINTS[3] &&
                  CHAPTERS[4].hint === SPEC_CHAPTER_HINTS[4] &&
                  GEN_HINTS[0] === SPEC_GEN_HINTS[0] && GEN_HINTS[1] === SPEC_GEN_HINTS[1] &&
                  GEN_HINTS[2] === SPEC_GEN_HINTS[2] && GEN_HINTS[3] === SPEC_GEN_HINTS[3] &&
                  nextHint(4) === SPEC_CHAPTER_HINTS[1] && nextHint(9) === SPEC_CHAPTER_HINTS[2] &&
                  nextHint(14) === SPEC_CHAPTER_HINTS[3] && nextHint(19) === SPEC_CHAPTER_HINTS[4] &&
                  [24, 29, 34, 39].every(f => nextHint(f) === GEN_HINTS[genLevel(f + 1).dch - 1]);   /* F：实算 */
  const speedOk = SPEED === 0.12;
  const srcOk = srcI && winI && srcA && srcB && srcC && srcE && srcF &&
    srcJ && srcK && srcN && srcSeed && srcGrad && srcT && srcO && srcHint &&
    srcThirst && speedOk;
  if (srcOk) npass++;
  units.contract = { ok: srcOk, I: srcI, winI: winI, A: srcA, B: srcB, C: srcC,
                     E: srcE, F: srcF, J: srcJ, K: srcK, N: srcN, O: srcO,
                     seed: srcSeed, grad: srcGrad, T: srcT, hints: srcHint,
                     thirst: srcThirst, speed: speedOk };

  window.__ttProg = 'U10';
  total++;
  startLevel(5);
  await unlocked2();
  const q10 = window.TT.quiz;
  const r10 = await window.TT.tapFlower(q10.target);
  const chainR = r10 === 'right' && window.__lastQueue && window.__lastQueue.length === 1 &&
    window.__lastQueue[0] === 'tt_right' &&
    typeof window.__lastQueue[0] === 'string';           /* 确认链=right 单 clip（SPEC §4 窗 2772；排序中间步无 clip 不入链） */
  if (chainR) npass++;
  units.confirm = { ok: chainR, r: r10, chain: window.__lastQueue };

  window.__ttProg = 'U11';
  total++;
  const origSave = window.__ttOrig.save, origPersist = window.__ttOrig.persist,
        origPass = window.__ttOrig.pass;
  const origLS = localStorage.getItem('kidsgame_turntake');      /* 防毁真实玩家档 */
  let saveOk = false, saveDetail = '';
  try {
    KIDS._save = origSave;                       /* 还原真函数（init 用） */
    KIDS.store.persist = origPersist;
    KIDS.level.pass = origPass;
    localStorage.removeItem('kidsgame_turntake');
    KIDS.init({ game: 'turntake', title: '轮流浇花' });   /* 真实 init：store.load 新档 v1.0 */
    startLevel(0);                               /* verify 页 freshTut 恒 false → 直接开题 */
    const a11 = await window.TT.autoSolve();     /* 真实判定链通关 → winFlow verify 分支 persistWin */
    const raw = localStorage.getItem('kidsgame_turntake');
    const j = raw ? JSON.parse(raw) : null;
    saveOk = !!(a11.done && a11.taps >= 5 && j && j.v === '1.0' && j.game === 'turntake' &&
                j.levels && j.levels['1-0'] &&
                j.levels['1-0'].stars === 3 && j.levels['1-0'].plays === 1);
    if (!saveOk) saveDetail = JSON.stringify({ taps: a11.taps, raw: raw && raw.slice(0, 200) });
  } catch (err) {
    saveDetail = 'ERR ' + (err && err.message);
  }
  /* 清理：恢复原 localStorage（不污染真实存档）——⑫ 继续用真实函数 */
  if (origLS === null) localStorage.removeItem('kidsgame_turntake');
  else localStorage.setItem('kidsgame_turntake', origLS);
  if (saveOk) npass++;
  units.save = { ok: saveOk, detail: saveDetail };

  window.__ttProg = 'U12';
  total++;
  const today = new Date();
  const tstr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') +
               '-' + String(today.getDate()).padStart(2, '0');
  const pre = { v: '1.0', game: 'turntake', firstDay: tstr, lastDay: tstr, levels: {},
                dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                restTip: { day: '', shown: 0 }, turntake: { tutSeen: true } };
  localStorage.setItem('kidsgame_turntake', JSON.stringify(pre));
  KIDS.store.load();                             /* 重读预置档（真实函数） */
  window.__ttDemoR = null;                       /* 教学实证清零（非教学路径不应重设） */
  window.TT.start(0);
  await unlocked2();
  const q12 = window.TT.quiz;
  const lv12 = window.TT.currentLevel;
  const realOk = state.tut === 'none' && window.__ttDemoR === null &&
    !!q12 && q12.turn === 'k' && Array.isArray(q12.thirsty) && q12.thirsty.length === 3 &&
    q12.thirsty.every(v => Number.isInteger(v) && v >= 1 && v <= 3) &&
    q12.thirsty.indexOf(Math.max.apply(null, q12.thirsty)) ===
      q12.thirsty.lastIndexOf(Math.max.apply(null, q12.thirsty)) &&
    q12.target === amax(q12.thirsty) && q12.rabbitWrong === false &&
    q12.step === 0 && q12.miss === 0 && q12.turnIdx === 0 && q12.flowers === undefined &&
    !!lv12 && lv12.flat === 0 && lv12.n === 9 && lv12.kTurns === 5 && lv12.rTurns === 4 &&
    lv12.dch === 1 &&
    typeof window.TT.tapFlower === 'function' && typeof window.TT.autoSolve === 'function' &&
    typeof window.TT.start === 'function' &&
    src.indexOf('window.TT =') >= 0 &&                        /* 真实页同暴露（b29 坑⑥） */
    src.indexOf('sv.turntake && sv.turntake.tutSeen') >= 0 && /* freshTut 教学分支源码在场 */
    src.indexOf('async function tutorialWatch') >= 0 &&
    (KIDS._save() || {}).v === '1.0';
  if (realOk) npass++;
  units.realPath = { ok: realOk, tut: state.tut,
                     quiz: q12 && { turn: q12.turn, thirsty: q12.thirsty, target: q12.target },
                     lv: lv12 && { flat: lv12.flat, n: lv12.n, k: lv12.kTurns, r: lv12.rTurns } };
  /* 收尾清理：恢复原 localStorage + 沙盒 stub（防真实页误写） */
  if (origLS === null) localStorage.removeItem('kidsgame_turntake');
  else localStorage.setItem('kidsgame_turntake', origLS);
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};
  KIDS.level.pass = function () { return { chapterDone: false }; };

  const out = { game: 'turntake', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__ttVlog = out;                          /* 外部断言挂点（任务书钩子） */
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total
                                     : 'VERIFY FAIL ' + (total - npass) + '/' + total;
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey/__lastVoiceText）；
     voice.queue 记录拼播链（__lastQueue——错链/确认链绑定断言） */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  /* 沙盒三件（教训族）：_save stub / persist no-op / level.pass no-op——
     单元③在 KIDS.init 前通关 20 次，persistWin→KIDS.level.pass 在 core 内部 save=null
     上必炸（hidecup 无 init 前通关故幸免——本款 verify 必须 stub，⑪ 再还原真函数） */
  window.__ttOrig = { save: KIDS._save, persist: KIDS.store.persist, pass: KIDS.level.pass };
  KIDS._save = function () { return { levels: {} }; };
  KIDS.store.persist = function () {};
  KIDS.level.pass = function () { return { chapterDone: false }; };
  runVerify();
}
