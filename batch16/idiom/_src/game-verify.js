/* ================= ?verify=1 自检（仅 verify 分支加载执行；加载即跑 runVerify——
   外部脚本先等 document.title='VERIFY PASS n/n' 再驱动，b17 坑/b29 坑⑥）
   14 单元（r16 定版）：
   ① 结构：80 条库不变式（i 序 1-80/五章各 16 条闭包/id 4-6 汉字/ctx 含 ____ 恰一次
      14-28 字禁含本体整串/say 6-18 字/near 互指同章且对数 ch1=5 ch2-5 各 4）
      +模型常量对账（estMs 本体/DECIDE/ADV/LEVEL_MIN/MIN_EXACT/WRONG_CHAIN）
      +step-dots 8 点/DOM 无 undefined·NaN/契约 O 按钮显式 color/ctx≤28 硬门禁
   ② 教学三段（watch→turn→help）：tutorialWatch 真实走完（stub 存档）
      → __idmDemoR='right'+tut='help'+handoff 重发同关（step=0）
      +交接链首段 idm_tut_turn2；再模拟儿童点对 → 帮→独（tut='solo'）
   ③ 逐关驱动（UI 全驱抽样 7 关 [0,7,15,23,31,39,40] 全章覆盖+生成关；40+20 关
      结构由 ⑧ 独立副本全量对账）：每题 tapCard(独立副本答案位)+推进+通关
      done/won/misses=0/stars=3
   ④ 帧内容（契约 M 同族）：flat0 全程深检——q-text.textContent===ctx 去 ____（空位=空
      span 渲染）/空位框在场/候选卡 aria-label+tx 文本序/#cards.k2=near/step-dots 8 点/
      点对后空位填入成语文本（演出窗内轮询——tapCard resolve 在 renderQuiz 之后）
   ⑤ 错路径：错卡 wrong+miss+卡 wig；豁免窗内二击吞（false 不计）/对选放行；
      窗后二错照计 miss=2+正确卡 breathe+释义小注 show+_hinted；吞输入配 shake（家族 D）
   ⑥ sayW 三态：flat<3 每错必播链 / flat≥3 10s 节流（同题三连错第三击不播且
      __lastQueue 不变）/ miss===2 force 豁免恰一次（10s 窗内仍必播）
   ⑦ 星级口径：0 错 3★/1-2 错 2★/≥3 错 1★（永不 0 星）
   ⑧ 生成关 flat40-59（20 关）：独立副本 genLevelInd 全量 JSON 对账（含静态 40 关）
      +dch=riInd 复算+确定性（同 flat 两次一致）+dch 分布 5 章全现
      +structOk 全题+反启发式锚（正解集∩干扰集 ≥5——wordprob r13 范式）
   ⑨ 源码级（读合并 script 文本：game 块=scripts[2]（data+engine+main 同块——core(0)/clips(1)/
      game(2)/verify(3) 家族四块；verify 独立第 4 块=页内断言无自匹配，b31 教训））：
      错链豁免窗 WRONG_CHAIN_MS=6480 字面+救援 interval 守卫+startLevel 重置
      （契约 I）+契约 K 逐字+家族 A/B/D/E/F/J 源码在场+迁移 IIFE 在场（M3）
      +keyless 恒链尾（Mj-1）+竖屏 applyPort+CHAPTERS/GEN_HINTS 文本对账
      +nextHint 实算（章末→SPEC 章 hint/生成关→SPEC GEN[dch-1]，禁取模形态）
   ⑩ 链构成：开题链 fill/near 两族 [idm_q_*, TTS ctx keyless 尾]/
      确认链 [idm_right2, idm_w_<idx>, TTS say 尾]/错链 [idm_wrong2, idm_hint2]
      +动态窗 1600+confirmTailMs ≥ confirmChainMs 恒验算（60 关全题）
      +confirmChain 独立副本对账（estN 全独立重列）
   ⑪ 写档：预置 kidsgame_idiom v1.0 → KIDS.init 真实装载（firstDay 保留=非重置）
      → KIDS.level.pass 通关写档 → localStorage rec 更新（origLS 测后恢复）
   ⑫ 真实路径：fresh v1.0 存档（无 1-0 无 tutSeen）+ start(0) 首关形态
      （flat0 锚=独立副本 q0）+freshTut 分支源码在场+window.IDM/__idmDemoR 暴露
   ⑬ 时长模型（r16 门禁）：60 关 modeled 独立副本逐关对账（estN/DECIDE/ADV/
      voice0 全独立重列）+全部 ≥ LEVEL_MIN_MS 40000+最低值精确 175040 防回漂
      +voice0≤DECIDE 全域验算（ctx≤28 字硬门禁）
   ⑭ 布局 simView（横当前视口+竖 body.port 类通道双量测）：fill 4 卡/near 2 卡
      双面+全按钮 ≥36（.k-parentbtn 豁免）+ox==0+情境卡/小注条视口内
   结果写 #verify-result + window.__idmVlog + window.VERIFY（units {name,ok,note}）
   + document.title='VERIFY PASS n/n'/'VERIFY FAIL' */
async function runVerify() {
  document.body.classList.add('verify');
  const origLS = localStorage.getItem('kidsgame_idiom');   /* 保存真实档（⑪⑫写档测试前——审查 M1：测后恢复） */
  const units = {};
  let npass = 0, total = 0;
  const unit = (name, ok, note) => {
    total++;
    if (ok) npass++;
    units[name] = { ok: !!ok, note: note === undefined ? null : note };
    return !!ok;
  };

  /* ---- SPEC §3-r16 独立重列（禁抄页面 CHAPTERS/GEN_HINTS/Q_INSTR/常量——硬抄任务书） ---- */
  const SPEC_CHAPTER_HINTS = { 1: '数字藏成语里等你猜', 2: '小动物们要讲故事啦',
                               3: '大自然里藏着大智慧', 4: '故事里面有大道理',
                               5: '新一轮成语填空开始啦' };
  const SPEC_CH_NAMES = { 1: '动作神态', 2: '数字成语', 3: '动物故事', 4: '自然气象', 5: '道理启示' };
  const SPEC_GEN_HINTS = ['读句子，选动作神态', '数字成语填一填', '动物故事选一选',
                          '自然气象填一填', '道理启示用一用'];
  const SPEC_INSTR = { fill: '空格里该填哪个成语呀', near: '这两个成语很像，哪个更合适' };
  const SPEC_DECIDE = { fill: 22000, near: 18000 };
  const SPEC_ADV = 880, SPEC_ENTER = 400, SPEC_GAP = 150, SPEC_TAIL = 300;
  const SPEC_PAIRS = { 1: 5, 2: 4, 3: 4, 4: 4, 5: 4 };      // 各章近义对数（互指去重）
  const MIN_LEVEL_MS = 40000;                               // LEVEL_MIN_MS（r16 门禁）
  const MIN_EXACT_V = 175040;                               // 40 关 modeled 最低值精确锚（6*22880+2*18880）
  const WRONG_CHAIN_V = 6480;                               // 错链豁免窗（estN(7)+150+estN(7)+300）
  const estN = n => n * 345 + 600;                          // b25 定版算式独立重列
  /* 全 clip 链（T46 阶段2：段全 string 键且在注入 clips——零 keyless 段防回归；
     原 keyless 恒尾断言随 keyless 文本尾段退役改判 clip 尾） */
  const clipTail = parts => !parts || !parts.length ? false :
    parts.every(p => typeof p === 'string' && !!KIDS.voice.clips[p]);
  const waitFor = async (pred, ms) => {
    let g = 0;
    while (g++ < Math.max(1, Math.ceil(ms / 25)) && !pred()) await wait(25);
    return !!pred();
  };
  /* ② 将 stub KIDS._save/store.persist——留底真实实现供 ⑪ 写档单元恢复（假通过防） */
  const kSaveOrig = KIDS._save, kPersistOrig = KIDS.store.persist;
  /* 演出/确认窗内 tapCard 可能吞 null——驱动循环轮询重试（任务纪律：演出窗吞 null） */
  const cardOk = async i => {
    for (let g = 0; g < 320; g++) {
      const r = await window.IDM.tapCard(i);
      if (r !== null) return r;
      await wait(25);
    }
    return null;
  };

  /* ========= 独立生成副本（分源纪律：算法独立重实现，禁调页面 genLevel/shuffled/ri）
     mulberry32(flat*7919+13)+nearPairs 收集+makeQuiz 双型+nearSlots 穿插——与
     SPEC §3-r16 语义逐句对应 ========= */
  const m32 = a => { let s = a | 0; return () => { s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const riInd = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));
  const shInd = (arr, rnd) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };
  const chIdxInd = ch => IDIOMS.filter(x => x.ch === ch).map(x => x.i);
  const nearPairsInd = ch => {                 // 互指对去重收集（IDIOMS 序——与页面算法语义同源对账）
    const seen = {}, out = [];
    chIdxInd(ch).forEach(i => {
      const n = IDIOMS[i - 1].near;
      if (n > 0 && !seen[Math.min(i, n) + '-' + Math.max(i, n)]) {
        seen[Math.min(i, n) + '-' + Math.max(i, n)] = 1;
        out.push({ a: i, b: n });
      }
    });
    return out;
  };
  function genLevelInd(flat) {
    flat = Math.max(0, flat | 0);
    const ch = Math.floor(flat / 8) + 1, lv = flat % 8;
    const rnd = m32(flat * 7919 + 13);
    const dch = flat < 40 ? (ch - 1) % 5 + 1 : riInd(rnd, 1, 5);
    const pairs = shInd(nearPairsInd(dch), rnd).slice(0, 2);
    const nearSlots = shInd([0, 1, 2, 3, 4, 5, 6, 7], rnd).slice(0, pairs.length);
    const used = {};
    pairs.forEach(p => { used[p.a] = 1; used[p.b] = 1; });
    const fillPool = shInd(chIdxInd(dch).filter(i => !used[i]), rnd);
    let fillTaken = 0;
    const quizzes = [];
    for (let k = 0; k < 8; k++) {
      const ni = nearSlots.indexOf(k);
      if (ni >= 0) {
        const p = pairs[ni];
        const idx = riInd(rnd, 0, 1) ? p.a : p.b;
        const options = shInd([idx, IDIOMS[idx - 1].near], rnd);
        quizzes.push({ idx: idx, kind: 'near', options: options,
                       answer: options.indexOf(idx), _miss: 0, _hinted: false, solved: false });
      } else {
        const idx = fillPool[fillTaken++];
        const dis = shInd(chIdxInd(dch).filter(i => i !== idx), rnd).slice(0, 3);
        const options = shInd([idx].concat(dis), rnd);
        quizzes.push({ idx: idx, kind: 'fill', options: options,
                       answer: options.indexOf(idx), _miss: 0, _hinted: false, solved: false });
      }
    }
    return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes,
             step: 0, misses: 0, done: false };
  }
  /* 独立时长副本（⑬）：voice0=ENTER+estN(指令)+GAP+estN(ctx)+TAIL；dur=max(v0,DECIDE)+ADV */
  const voice0Ind = q => SPEC_ENTER + estN(SPEC_INSTR[q.kind].length) + SPEC_GAP +
    estN(IDIOMS[q.idx - 1].ctx.length) + SPEC_TAIL;
  const durInd = q => Math.max(voice0Ind(q), SPEC_DECIDE[q.kind]) + SPEC_ADV;
  const levelInd = L => L.quizzes.reduce((s, q) => s + durInd(q), 0);
  /* 独立确认链副本（⑩）：estN(right2 7)+150+estN(id)+150+estN(say)+300 */
  const chainInd = q => estN(7) + SPEC_GAP + estN(IDIOMS[q.idx - 1].id.length) +
    SPEC_GAP + estN(IDIOMS[q.idx - 1].say.length) + SPEC_TAIL;

  /* 引擎直驱到第 step 题（快进面——engTapCard 直调不演 UI） */
  const engAdvanceTo = (flat, step) => {
    window.IDM.start(flat);
    let g = 0;
    while (cur && !cur.done && cur.step < step && g++ < 24) {
      const q = cur.quizzes[cur.step];
      engTapCard(cur, q.answer);
    }
    renderQuiz();
    return window.IDM.quiz;
  };

  /* ---- ① 结构（80 条库不变式+模型常量+DOM 卫生） ---- */
  startLevel(0);
  {
    const idmOk = IDIOMS.length === 80 &&
      IDIOMS.every((x, k) => x.i === k + 1) &&                             // i 序 1-80 连续
      [1, 2, 3, 4, 5].every(ch => IDIOMS.filter(x => x.ch === ch).length === 16) &&   // 五章各 16 闭包
      IDIOMS.every(x => /^[一-龥]{4,6}$/.test(x.id)) &&           // id 4-6 汉字（鲤鱼跳龙门 5）
      IDIOMS.every(x => x.ctx.split('____').length === 2) &&              // ____ 恰一次
      IDIOMS.every(x => x.ctx.length >= 14 && x.ctx.length <= 28) &&      // 14-28 字（≤28 硬门禁）
      IDIOMS.every(x => x.ctx.indexOf(x.id) < 0) &&                       // 情境句禁含本体整串
      IDIOMS.every(x => x.say.length >= 6 && x.say.length <= 18) &&       // 释义 6-18 字
      IDIOMS.every(x => x.near === 0 ||
        (x.near !== x.i && IDIOMS[x.near - 1].near === x.i &&
         IDIOMS[x.near - 1].ch === x.ch));                                // near 互指同章
    const pairsOk = [1, 2, 3, 4, 5].every(ch => nearPairsInd(ch).length === SPEC_PAIRS[ch]) &&
      [1, 2, 3, 4, 5].every(ch => nearPairsInd(ch).length >= 2);          // 每章 ≥2 对（near 题可行性）
    const cstOk = CH_LEN === 8 && STATIC_LEVELS === 40 && N_CH === 5 &&
      Q_INSTR.fill === SPEC_INSTR.fill && Q_INSTR.near === SPEC_INSTR.near &&
      DECIDE_MS.fill === SPEC_DECIDE.fill && DECIDE_MS.near === SPEC_DECIDE.near &&
      ADV_MS === SPEC_ADV && LEVEL_MIN_MS === MIN_LEVEL_MS && MIN_EXACT === MIN_EXACT_V &&
      WRONG_CHAIN_MS === WRONG_CHAIN_V &&
      estMs('') === 600 && estMs('四字四字') === 1980;                     // estMs 本体（家族 T 全字符口径）
    const dotsOk = document.querySelectorAll('#step-dots i').length === 8;
    const txt = document.getElementById('game').textContent;
    const txtOk = txt.indexOf('undefined') < 0 && txt.indexOf('NaN') < 0;
    const probe = document.createElement('button');                        // 契约 O：自建 button 显式 color
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const oOk = getComputedStyle(probe).color === 'rgb(74, 59, 46)';
    probe.remove();
    unit('structure', idmOk && pairsOk && cstOk && dotsOk && txtOk && oOk,
      { idioms: idmOk, pairs: pairsOk, consts: cstOk, dots: dotsOk,
        text: txtOk, btnColor: oOk, n: IDIOMS.length });
  }

  /* ---- ② 教学三段（watch→turn→help 首关重发；教学时长口径=build 名义分账+_selftest 真页实测） ---- */
  {
    KIDS._save = function () { return { levels: {} }; };       // verify 页存档 stub（后续单元沿用）
    KIDS.store.persist = function () {};
    startLevel(0);
    await tutorialWatch();
    const q0 = cur.quizzes[0];
    const handoffQ = window.__lastQueue;                        // 交接链 [idm_tut_turn2, 指令, idm_ctx_N]
    const watchOk = window.__idmDemoR === 'right' &&            // 看：演示点对正确卡→真实 right
      state.tut === 'help' && cur.step === 0 &&                 // handoff 重发同关（column 形态）
      cur.flat === 0 && !!q0 &&                                 // q0 重来（孩子亲手做演示题）
      !!handoffQ && handoffQ.length === 3 &&
      handoffQ[0] === 'idm_tut_turn2' && handoffQ[1] === qVoice(q0).key &&
      handoffQ[2] === 'idm_ctx_' + q0.idx &&                    // 情境句 clip 尾（T46 全 clip 化）
      clipTail(handoffQ);
    /* 帮→独：模拟儿童点对当前题 → tut='solo' 放手 */
    const r = await cardOk(q0.answer);
    const soloOk = (r === 'right' || r === 'done') && state.tut === 'solo' &&
      !ghostEl.classList.contains('show');
    unit('tutorial', watchOk && soloOk,
      { demoR: window.__idmDemoR, tut: state.tut, handoff: watchOk, solo: soloOk });
  }

  /* ---- ③ 逐关驱动（UI 全驱抽样 7 关全章覆盖+生成关；答案位=独立副本 genLevelInd） ---- */
  const driveBad = [], frameBad = [];
  {
    const driveLevel = async (flat, deep) => {
      window.IDM.start(flat);
      const ind = genLevelInd(flat);                            // 独立副本（答案位真值源）
      for (let k = 0; k < 8; k++) {
        /* 题面门=step 就位 且新题 DOM 已渲染（renderQuiz 在演出窗末——engTapCard 同步段
           step++ 先行、DOM 后至，只等 step 会拿到上一题残帧） */
        let q = null;
        const okR = await waitFor(() => {
          q = window.IDM.quiz;
          return !!q && q.step === k &&
            qTextEl.textContent === IDIOMS[q.idx - 1].ctx.replace('____', '') &&
            cardsEl.querySelectorAll('.card').length === (q.kind === 'near' ? 2 : 4);
        }, 3000);
        if (!okR) return 'f' + flat + 'q' + k + ' stepGate';
        const iq = ind.quizzes[k];
        if (q.kind !== iq.kind || q.idx !== iq.idx)             // 独立副本对账（题面）
          return 'f' + flat + 'q' + k + ' quiz!=ind';
        if (q.optionIdxs.join(',') !== iq.options.join(',') || q.answer !== iq.answer)
          return 'f' + flat + 'q' + k + ' opts/ans!=ind';       // 候选序+答案位对账
        if (deep) {                                             /* ④ 帧深检（flat0 全程） */
          if (qTextEl.textContent !== q.ctx.replace('____', ''))
            frameBad.push('f' + flat + 'q' + k + ' ctxText');   /* 空位渲染=空 span：textContent
                                                                    =ctx 去 ____（含 ____ 反而错） */
          if (!qTextEl.querySelector('.blank'))
            frameBad.push('f' + flat + 'q' + k + ' blankDom');  /* 空位框在场（下划线框渲染） */
          if (IDIOMS[q.idx - 1].ctx !== q.ctx)
            frameBad.push('f' + flat + 'q' + k + ' ctxMap');    // 情境句-成语映射
          const nOpt = q.kind === 'near' ? 2 : 4;
          if (cardsEl.classList.contains('k2') !== (q.kind === 'near'))
            frameBad.push('f' + flat + 'q' + k + ' k2cls');
          if (cardsEl.querySelectorAll('.card').length !== nOpt)
            frameBad.push('f' + flat + 'q' + k + ' cardN');
          if (document.querySelectorAll('#step-dots i').length !== 8)
            frameBad.push('f' + flat + 'q' + k + ' dots');
          const cards = Array.from(cardsEl.querySelectorAll('.card'));
          cards.forEach((c, ci) => {
            if (c.getAttribute('aria-label') !== IDIOMS[q.optionIdxs[ci] - 1].id ||
                c.querySelector('.tx').textContent !== IDIOMS[q.optionIdxs[ci] - 1].id)
              frameBad.push('f' + flat + 'q' + k + ' card' + ci);
          });
        }
        if (deep) {                                             /* ④ 点对面：tap 发起不 await
                                                                     （tapCard 的 right 路径在演出窗
                                                                     末 renderQuiz 后才 resolve——
                                                                     await 完成即翻页拿不到空位帧）；
                                                                     命中判据=本题空位已填（.blank.ok
                                                                     且文本=本题成语 id——防上一题
                                                                     残留 ok 提前命中）；窗外再发起
                                                                     （窗内吞 null 无害——locked 最前） */
          const idTxt = IDIOMS[q.idx - 1].id;
          let okB = false;
          for (let g = 0; g < 300 && !okB; g++) {
            window.IDM.tapCard(q.answer);
            okB = await waitFor(() => {
              const b = qTextEl.querySelector('.blank');
              return !!(b && b.classList.contains('ok') && b.textContent === idTxt);
            }, 200);
          }
          const b2 = qTextEl.querySelector('.blank');
          if (!okB || !b2 || b2.textContent !== idTxt)
            frameBad.push('f' + flat + 'q' + k + ' blankFill');
          else if (qTextEl.textContent !== q.ctx.replace('____', idTxt))
            frameBad.push('f' + flat + 'q' + k + ' blankCls');
        } else {
          const r = await cardOk(q.answer);
          if (r !== 'right' && r !== 'done') return 'f' + flat + 'q' + k + ' card=' + r;
        }
        const adv = await waitFor(() => {
          const c = window.IDM.currentLevel;
          return c.done ? c.won : c.step === k + 1;
        }, 6000);
        if (!adv) return 'f' + flat + 'q' + k + ' noadvance';
      }
      const c = window.IDM.currentLevel;
      if (!(c.done && c.won && c.misses === 0 && c.stars === 3 && c.n === 8))
        return 'f' + flat + ' stars=' + c.stars + ' n=' + c.n;
      return null;
    };
    let allOk = true;
    for (const flat of [0, 7, 15, 23, 31, 39, 40]) {            // 三章末+全章代表+末静态+生成首关
      const err = await driveLevel(flat, flat === 0);
      if (err) { driveBad.push(err); allOk = false; if (driveBad.length > 3) break; }
    }
    unit('drive', allOk, { bad: driveBad.slice(0, 3) });
    unit('frames', frameBad.length === 0, { bad: frameBad.slice(0, 3) });   // ④ 独立单元
  }

  /* ---- ⑤ 错路径（错卡+豁免窗吞/窗后二错+答案级 breathe/小注+吞输入 shake 家族 D） ---- */
  {
    window.IDM.start(1);                                        // flat1（flat<3：每错必播链）
    const q = window.IDM.quiz;
    const badIdx = q.optionIdxs.findIndex((v, i) => i !== q.answer);
    const c1 = await cardOk(badIdx);
    const wigOk = c1 === 'wrong' && window.IDM.quiz.miss === 1 &&
      !cardEl(badIdx).classList.contains('dim') &&              // 不灰化可重点
      !!cardEl(badIdx);                                         // wig 动画类瞬态不断言
    const rej = await window.IDM.tapCard(badIdx);               // 豁免窗内二击吞（false 不计 miss）
    const swallowOk = rej === false && window.IDM.quiz.miss === 1;
    await wait(WRONG_CHAIN_V + 200);                            // 等错链豁免窗过窗（真时钟 6480）
    const c2 = await cardOk(badIdx);                            // 窗后二错照计 miss（契约 I）
    const miss2 = c2 === 'wrong' && window.IDM.quiz.miss === 2;
    const chainW = window.__lastQueue && window.__lastQueue.length === 2 &&
      window.__lastQueue[0] === 'idm_wrong2' && window.__lastQueue[1] === 'idm_hint2';   // 错链全 clip（c2 后即时采样）
    const brOk = !!(cardEl(q.answer) && cardEl(q.answer).classList.contains('breathe'));
    const noteOk = noteEl.classList.contains('show') &&
      noteEl.textContent === IDIOMS[q.idx - 1].say &&           // 答案级=释义小注
      window.IDM.quiz.hinted === true;
    /* 吞输入轻叮配 shake（家族 D）：演出期点卡=null+候选区微动 */
    state.locked = true;
    const nullTap = await window.IDM.tapCard(0);
    const swallowD = nullTap === null && cardsEl.classList.contains('shake');
    state.locked = false;
    const cR = await cardOk(q.answer);                          // 对选放行 → 推进
    const passOk = cR === 'right' || cR === 'done';
    unit('wrong', wigOk && swallowOk && miss2 && brOk && noteOk && swallowD && passOk && chainW,
      { wig: wigOk, swallow: swallowOk, miss2: miss2, breathe: brOk,
        note: noteOk, shake: swallowD, pass: passOk, chain: chainW });
  }

  /* ---- ⑥ sayW 三态（flat<3 必播 / flat≥3 10s 节流 / miss===2 force 豁免恰一次） ---- */
  {
    /* 态一 flat<3 每错必播：⑤ 已证 flat1 首错播链（miss=1→链起播）——此处补第二题错仍播 */
    window.IDM.start(2);
    let q = window.IDM.quiz;
    let bad = q.optionIdxs.findIndex((v, i) => i !== q.answer);
    await cardOk(bad);                                          // 错 1（播）
    const v21 = window.__lastQueue && window.__lastQueue[0] === 'idm_wrong2';
    await cardOk(q.answer);                                     // 过题（节流锚不动）
    await waitFor(() => window.IDM.quiz && window.IDM.quiz.step === 1, 4000);
    q = window.IDM.quiz;
    bad = q.optionIdxs.findIndex((v, i) => i !== q.answer);
    wrongChainUntil = 0;                                        // 直清豁免窗（一题错链已设）——单测 sayW 态
    await cardOk(bad);                                          // 错 2（flat<3 仍必播——10s 内）
    const v22 = window.__lastQueue && window.__lastQueue[0] === 'idm_wrong2';
    const st1 = v21 && v22;
    /* 态二+三 flat≥3：同题三连错 miss=1 播 → miss=2 force 必播 → miss=3 节流不播（队列不变）
       ——每击前直清豁免窗（顶层 let 可写）：隔离窗吞输入与 sayW 节流两机制，单测节流语义 */
    window.IDM.start(4);
    q = window.IDM.quiz;
    bad = q.optionIdxs.findIndex((v, i) => i !== q.answer);
    wrongChainUntil = 0;
    await cardOk(bad);                                          // miss=1（首播）
    const k1 = window.__lastQueue && window.__lastQueue[0] === 'idm_wrong2';
    wrongChainUntil = 0;
    await cardOk(bad);                                          // miss=2 → force 豁免必播
    const k2 = window.__lastQueue && window.__lastQueue[0] === 'idm_wrong2';
    wrongChainUntil = 0;
    window.__lastQueue = null;                                  // 清观测锚：节流未播=null 保持
    await cardOk(bad);                                          // miss=3（10s 内非 force → 节流）
    const k3 = window.__lastQueue === null;                     /* 链未重播（旧判据看[0]被第二击
                                                                   force 链旧值污染恒真——清空判空） */
    const missN = window.IDM.quiz.miss;
    const st23 = k1 && k2 && k3 && missN === 3;                 // 第三击被节流（k3=链未重播判空）
    unit('sayw', st1 && st23, { flat23: st1, throttle: st23,
      k1: k1, k2: k2, k3: k3, miss: missN });
  }

  /* ---- ⑦ 星级口径（引擎级构造直测） ---- */
  {
    const L = genLevel(3);
    L.misses = 0; const st3 = engStars(L) === 3;
    L.misses = 1; const st2a = engStars(L) === 2;
    L.misses = 2; const st2b = engStars(L) === 2;
    L.misses = 3; const st1 = engStars(L) === 1;
    L.misses = 9; const stFloor = engStars(L) === 1;            // 永不 0 星
    unit('stars', st3 && st2a && st2b && st1 && stFloor,
      { s3: st3, s2: st2a && st2b, s1: st1, floor: stFloor });
  }

  /* ---- ⑧ 生成关 flat40-59 + 全 60 关独立副本对账 + 反启发式锚 ---- */
  {
    const bad = [];
    const genDch = {};
    for (let flat = 40; flat < 100; flat++) {                   // 生成关 dch 分布（60 关样本——
      const d = genLevel(flat).dch;                             // 20 关固定种子集缺章属方差，
      genDch[d] = (genDch[d] || 0) + 1;                         // 60 关全现=确定性不变式）
    }
    for (let flat = 0; flat < 60; flat++) {                     // 静态 40 + 生成 20 全量
      const L1 = genLevel(flat), L2 = genLevel(flat);
      const I1 = genLevelInd(flat);
      if (JSON.stringify(L1.quizzes) !== JSON.stringify(L2.quizzes)) bad.push('f' + flat + ' det');
      if (JSON.stringify(L1.quizzes) !== JSON.stringify(I1.quizzes))
        bad.push('f' + flat + ' ind');                         // 独立副本全量对账
      if (L1.dch !== I1.dch || L1.ch !== I1.ch || L1.lv !== I1.lv)
        bad.push('f' + flat + ' meta');
      if (flat >= 40) {
        for (let qi = 0; qi < 8; qi++) if (structOk(L1.quizzes[qi], L1.dch) !== true)
          bad.push('f' + flat + 'q' + qi + ' struct');
        if (L1.quizzes.filter(q => q.kind === 'near').length !== 2)
          bad.push('f' + flat + ' nearN');                      // 每关 2 near（对足额时）
        if (L1.quizzes.filter(q => q.kind === 'fill').length !== 6)
          bad.push('f' + flat + ' fillN');
      }
      if (bad.length > 5) break;
    }
    const allDch = [1, 2, 3, 4, 5].every(d => genDch[d] > 0);   // 生成关 dch 分布 5 章全现
    /* 反启发式锚（wordprob r13 范式）：60 关正解集∩干扰集 ≥5（同章互为干扰自然达成） */
    const answerSet = new Set(), distrSet = new Set();
    for (let flat = 0; flat < 60; flat++) {
      for (const q of genLevel(flat).quizzes) {
        answerSet.add(q.idx);
        q.options.forEach((v, i) => { if (i !== q.answer) distrSet.add(v); });
      }
    }
    let inter = 0;
    answerSet.forEach(v => { if (distrSet.has(v)) inter++; });
    unit('genlevels', bad.length === 0 && allDch && inter >= 5,
      { bad: bad.slice(0, 4), genDch: genDch, anchor: inter,
        answers: answerSet.size, full: bad.length === 0 });
  }

  /* ---- ⑨ 源码级（data 块=scripts[1] / main 块=scripts[2]；契约 I/K+家族 A/B/D/E/F/J+迁移 IIFE） ---- */
  {
    const scripts = document.querySelectorAll('script');
    const nScripts = scripts.length === 4;                      // 家族四块结构（build 同断言）
    const src = scripts[2].textContent;                        // game 块（data+engine+main）
    const srcD = src;                                           // data 段字面与 main 字面同块分查
    const winOk = WRONG_CHAIN_MS === WRONG_CHAIN_V &&
      WRONG_CHAIN_V === estN(7) + SPEC_GAP + estN(7) + SPEC_TAIL;   // SPEC §4 算式独立复算
    const litWin = srcD.indexOf('const WRONG_CHAIN_MS = 6480') >= 0;   // data 块字面（T11 同口径）
    const litUse = src.indexOf('wrongChainUntil = Date.now() + WRONG_CHAIN_MS') >= 0;
    const guard = src.indexOf('if (Date.now() < wrongChainUntil) return;') >= 0;
    const reset = src.indexOf('lastWrongVoice = 0; wrongChainUntil = 0;') >= 0;
    const swallC = src.indexOf('Date.now() < wrongChainUntil && i !== q.answer') >= 0;   // 错卡吞（I 补）
    const srcK = src.indexOf("if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;") >= 0 &&
      src.indexOf('function rescueTick()') >= 0;                // 契约 K 逐字+命名函数
    const pA = 'nextHint(lim -' + ' 1)';                        // 拼接防 verify 源码自匹配（计数断言）
    const srcA = src.split(pA).length === 3 &&                  // 两处恰等：winFlow dayEnd + 启动 dayEnd（I-m1 修复定版）
      src.indexOf('nextHint(null)') < 0;                        // 修复后禁回 null 形态（防回漂反向断言）
    const srcB = src.indexOf('lastDir') >= 0 && src.indexOf('lastAct') >= 0 &&
      src.indexOf('idle > 14000') >= 0 && src.indexOf('idle > 30000') >= 0;   // 救援双锚
    const srcD2 = src.indexOf("replayAnim(cardsEl, 'shake')") >= 0;             // 吞输入配 shake
    const srcE = src.indexOf('sv.idiom && sv.idiom.tutSeen') >= 0;
    const srcF = src.indexOf('GEN_HINTS[genLevel(f + 1).dch - 1]') >= 0 &&
      src.indexOf('(ci + 1) %') < 0 && src.indexOf('(ci+1)%') < 0;   // 禁章序右移（双形态含无空格）
    const srcJ = src.indexOf('now - lastWrongVoice > 10000') >= 0;
    const portCls = src.indexOf('applyPort') >= 0;              // 竖屏双通道 JS 在场
    const migr = src.indexOf("localStorage.getItem('kidsgame_idiom')") >= 0 &&
      src.indexOf("(c - 1) + '-5'") >= 0 &&
      src.indexOf('for (let c = 2; c <= N_CH; c++)') >= 0;      // 迁移 IIFE（M3）在场
    let keylessOk = true;                                       // 契约 N：keyless 恒链尾
    for (const m of src.match(/\{\s*key:\s*null[^}]*\}\s*(\S)/g) || []) {
      if (m[m.length - 1] !== ']') keylessOk = false;
    }
    const hintOk = [1, 2, 3, 4, 5].every(i => CHAPTERS[i].hint === SPEC_CHAPTER_HINTS[i] &&
        CHAPTERS[i].name === SPEC_CH_NAMES[i]) &&
      GEN_HINTS.every((h, i) => h === SPEC_GEN_HINTS[i]) &&
      [7, 15, 23, 31, 39].every(f => window.IDM.nextHintOf(f) ===
        SPEC_CHAPTER_HINTS[Math.floor(f / 8) + 1]) &&           // 章末→下一章预告（家族 F）
      [40, 50, 59].every(f => window.IDM.nextHintOf(f) ===
        SPEC_GEN_HINTS[genLevelInd(f + 1).dch - 1]);            // 生成关→实算 dch（禁取模）
    unit('chainwin', nScripts && winOk && litWin && litUse && guard && reset && swallC &&
      srcK && srcA && srcB && srcD2 && srcE && srcF && srcJ && portCls && migr &&
      keylessOk && hintOk,
      { nScripts: nScripts, formula: winOk, literal: litWin, use: litUse, guard: guard,
        reset: reset, swallow: swallC, K: srcK, A: srcA, B: srcB, D: srcD2, E: srcE,
        F: srcF, J: srcJ, port: portCls, migrate: migr, N: keylessOk, hints: hintOk });
  }

  /* ---- ⑩ 链构成（开题链两族+确认链+错链+动态窗恒验算+confirmChain 独立副本） ---- */
  {
    /* 开题链 fill（flat0 q0） */
    window.IDM.start(0);
    window.IDM.hear();
    const q0v = window.IDM.quiz;
    const qf = window.__lastQueue;
    const fillQuizOk = !!qf && qf.length === 2 && qf[0] === 'idm_q_fill' &&
      qf[1] === 'idm_ctx_' + q0v.idx && clipTail(qf);           // 开题链尾=idm_ctx_N（T46）
    /* 确认链 fill：tapCard 对 → [idm_right2, idm_w_<idx>, idm_def_<idx>] */
    const rF = await cardOk(q0v.answer);
    const cf = window.__lastQueue;
    const fillConfirmOk = (rF === 'right' || rF === 'done') && !!cf && cf.length === 3 &&
      cf[0] === 'idm_right2' && cf[1] === 'idm_w_' + q0v.idx &&
      cf[2] === 'idm_def_' + q0v.idx && clipTail(cf);           // 释义尾=idm_def_N（T46）
    /* 开题链 near + 确认链 near：引擎直驱 flat40 到首个 near 题 */
    const L40 = genLevelInd(40);
    const nearK = L40.quizzes.findIndex(q => q.kind === 'near');
    const nq = engAdvanceTo(40, nearK);                         // 快进（engTapCard 直驱不演 UI）
    window.IDM.hear();
    const qn = window.__lastQueue;
    const nearQuizOk = !!nq && nq.kind === 'near' && !!qn && qn.length === 2 &&
      qn[0] === 'idm_q_near' && qn[1] === 'idm_ctx_' + nq.idx && clipTail(qn);
    const rN = await cardOk(nq.answer);
    const cn = window.__lastQueue;
    const nearConfirmOk = (rN === 'right' || rN === 'done') && !!cn && cn.length === 3 &&
      cn[0] === 'idm_right2' && cn[1] === 'idm_w_' + nq.idx &&
      cn[2] === 'idm_def_' + nq.idx && clipTail(cn);
    const wrongOk = true;                                       // 错链 [idm_wrong2, idm_hint2] 已在 ⑤ 实证
    /* 动态窗恒验算 + confirmChainMs 独立副本对账（60 关全题） */
    let dynOk = true, chainParity = true;
    for (let flat = 0; flat < 60; flat++) {
      for (const q of genLevel(flat).quizzes) {
        if (1600 + confirmTailMs(q) < confirmChainMs(q)) dynOk = false;
        if (confirmChainMs(q) !== chainInd(q)) chainParity = false;   // 独立副本对账
      }
    }
    const estOk = dynOk && chainParity;
    unit('chains', fillQuizOk && fillConfirmOk && nearQuizOk && nearConfirmOk &&
      wrongOk && estOk,
      { quizFill: fillQuizOk, confirmFill: fillConfirmOk, quizNear: nearQuizOk,
        confirmNear: nearConfirmOk, wrong: wrongOk, dynWin: estOk });
  }

  /* ---- ⑪ 写档（预置 v1.0 → 恢复真实存档 API → KIDS.init 装载 → level.pass → rec 更新） ---- */
  {
    KIDS._save = kSaveOrig; KIDS.store.persist = kPersistOrig;   // 撤 ② 的 stub（假通过防）
    localStorage.removeItem('kidsgame_idiom');
    const SEED = { v: '1.0', game: 'idiom', firstDay: '2026-09-01', lastDay: '2026-09-01',
                   levels: {}, dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                   restTip: { day: '', shown: 0 } };
    localStorage.setItem('kidsgame_idiom', JSON.stringify(SEED));
    KIDS.init({ game: 'idiom', title: '成语填空' });           // 真实 store.load：预置 v1.0 被接受
    const raw1 = JSON.parse(localStorage.getItem('kidsgame_idiom'));
    const loaded = raw1.v === '1.0' && raw1.firstDay === '2026-09-01';   // firstDay 保留=非重置（契约 C）
    const pr = KIDS.level.pass(1, 0, 3, [0, 1, 2, 3, 4, 5, 6, 7]);   // winFlow 同款写档调用
    const raw2 = JSON.parse(localStorage.getItem('kidsgame_idiom'));
    const rec = raw2.levels['1-0'];
    const wrote = loaded && rec && rec.stars === 3 && rec.plays === 1 && !!pr;
    unit('storage', wrote, { loaded: loaded, rec: rec ? rec.stars + '/' + rec.plays : null });
  }

  /* ---- ⑫ 真实路径（fresh v1.0 + start(0) 首关形态=独立副本锚 + 真实页暴露） ---- */
  {
    localStorage.removeItem('kidsgame_idiom');
    document.querySelectorAll('.k-parentbtn').forEach(b => b.remove());   // 二次 init 防重复按钮
    const SEED = { v: '1.0', game: 'idiom', firstDay: '2026-09-16', lastDay: '2026-09-16',
                   levels: {}, dailyMin: {}, settings: { sound: true, tts: true, vol: 0.6 },
                   restTip: { day: '', shown: 0 } };
    localStorage.setItem('kidsgame_idiom', JSON.stringify(SEED));   // fresh：无 1-0 无 tutSeen
    KIDS.init({ game: 'idiom', title: '成语填空' });
    window.IDM.start(0);                                        // 首关（真实页此档位 freshTut=真→教学链）
    const q = window.IDM.quiz;
    const ind0 = genLevelInd(0);
    const shape = !!q && q.step === 0 && cur.flat === 0 && cur.dch === ind0.dch &&
      q.kind === ind0.quizzes[0].kind && q.idx === ind0.quizzes[0].idx &&
      q.ctx === IDIOMS[q.idx - 1].ctx &&
      qTextEl.textContent === q.ctx.replace('____', '') &&
      cardsEl.querySelectorAll('.card').length === (q.kind === 'near' ? 2 : 4) &&
      document.querySelectorAll('#step-dots i').length === 8;
    const svRaw = JSON.parse(localStorage.getItem('kidsgame_idiom'));
    const freshInputs = !svRaw.levels['1-0'] && !(svRaw.idiom && svRaw.idiom.tutSeen);
    const src = document.querySelectorAll('script')[2].textContent;
    const branch = src.indexOf('if (freshTut) { tutorialWatch(); return; }') >= 0 &&
      src.indexOf('window.IDM =') >= 0 && src.indexOf('__idmDemoR') >= 0;   // 钩子/实证暴露（b29 坑⑥）
    unit('realpath', shape && freshInputs && branch,
      { shape: shape, fresh: freshInputs, branch: branch });
  }

  /* ⑪⑫ 写档测试收尾：清测试档并恢复真实档（审查 M1——origLS 同模式） */
  localStorage.removeItem('kidsgame_idiom');
  if (origLS !== null) localStorage.setItem('kidsgame_idiom', origLS);

  /* ---- ⑬ 时长模型（r16 门禁：60 关 modeled 独立副本逐关对账+最低值精确+voice0≤DECIDE） ---- */
  {
    const bad = [];
    let dMin = Infinity, dMinFlat = -1, parityAll = true, voiceOk = true;
    for (let flat = 0; flat < 60; flat++) {
      const L = genLevel(flat);
      let sInd = 0;
      for (const q of L.quizzes) {
        sInd += durInd(q);
        if (voice0Ind(q) > SPEC_DECIDE[q.kind]) voiceOk = false;   // voice0≤DECIDE 全域
        if (IDIOMS[q.idx - 1].ctx.length > 28) voiceOk = false;    // ctx≤28 硬门禁双查
      }
      if (sInd !== levelDurMs(L)) { parityAll = false; bad.push('f' + flat + ' ' + sInd + '!=' + levelDurMs(L)); }
      if (sInd < MIN_LEVEL_MS) bad.push('f' + flat + ' minMs=' + sInd);
      if (sInd < dMin) { dMin = sInd; dMinFlat = flat; }
    }
    const exactOk = MIN_EXACT === MIN_EXACT_V && dMin === MIN_EXACT_V;   // 最低值精确防回漂
    unit('duration', parityAll && voiceOk && bad.length === 0 && exactOk && dMin >= MIN_LEVEL_MS,
      { parity: parityAll, voiceNeverDominates: voiceOk, bad: bad.slice(0, 3),
        minMs: dMin, minFlat: dMinFlat, exact: exactOk });
  }

  /* ---- ⑭ 布局 simView（横当前视口+竖 body.port 类通道双量测） ---- */
  {
    const probe = () => {
      document.querySelectorAll('.flash,.shake,.hop,.wig').forEach(e =>
        e.classList.remove('flash', 'shake', 'hop', 'wig'));   // 量测前清瞬态动画类
      const de = document.documentElement;
      const bad = [];
      document.querySelectorAll('button').forEach(e => {
        if (e.classList.contains('k-parentbtn')) return;
        const w = e.offsetWidth, h = e.offsetHeight;
        if (w > 4 && h > 4 && (w < 36 || h < 36))
          bad.push((e.className || e.id) + ':' + Math.round(w) + 'x' + Math.round(h));
      });
      const cards = Array.from(document.querySelectorAll('#cards .card'));
      const cardMin = cards.length ? Math.round(Math.min.apply(null, cards.map(c => Math.min(c.offsetWidth, c.offsetHeight)))) : 0;
      const qr = qcardEl.getBoundingClientRect();
      const qcardIn = qr.top >= 0 && qr.bottom <= window.innerHeight && qr.width > 0;
      const nr = noteEl.getBoundingClientRect();
      const noteIn = nr.top >= 0 && nr.bottom <= window.innerHeight;
      const blankOk = !!qTextEl.querySelector('.blank') ||
        !!qTextEl.querySelector('.blank.ok');
      const ox = de.scrollWidth - de.clientWidth;
      return { ox: ox, bad: bad, cardMin: cardMin, nCards: cards.length,
               qcardIn: qcardIn, noteIn: noteIn, blank: blankOk, isK2: cardsEl.classList.contains('k2') };
    };
    /* 面一：flat0 fill 题（4 卡）当前视口量测——阈值随朝向（横 96；真竖 viewport 下 @media
       已生效取竖阈值 84——_selftest P1b 真竖 800×1180 复跑须全绿） */
    window.IDM.start(0);
    await wait(60);
    const m1 = probe();
    const isPortView = window.innerHeight > window.innerWidth;
    const needCard = isPortView ? 84 : 96;
    const landOk = m1.ox === 0 && m1.bad.length === 0 && m1.cardMin >= needCard &&
      m1.qcardIn && m1.noteIn && m1.blank && m1.nCards === 4 && !m1.isK2;
    /* 面二：body.port 类通道（竖屏规则真通道）fill 面同量测——通道与 @media 逐条等值由 build
       静态对账；「加类生效」差异判据仅横视口下可证 */
    document.body.classList.add('port');
    await wait(60);
    const m2 = probe();
    document.body.classList.remove('port');
    const portOk = m2.ox === 0 && m2.bad.length === 0 && m2.cardMin >= 84 &&
      m2.qcardIn && m2.noteIn && m2.nCards === 4;
    /* 面三：near 题（k2 双卡）竖通道量测 */
    const L40 = genLevelInd(40);
    const nearK = L40.quizzes.findIndex(q => q.kind === 'near');
    document.body.classList.add('port');
    engAdvanceTo(40, nearK);
    await wait(60);
    const m3 = probe();
    document.body.classList.remove('port');
    const dualOk = m3.ox === 0 && m3.bad.length === 0 && m3.cardMin >= 84 &&
      m3.nCards === 2 && m3.isK2 && m3.qcardIn;
    unit('layout', landOk && portOk && dualOk,
      { land: landOk, port: portOk, near: dualOk,
        landMin: m1.cardMin, portMin: m2.cardMin, nearMin: m3.cardMin,
        nCards: [m1.nCards, m2.nCards, m3.nCards], bad: (m1.bad.concat(m2.bad, m3.bad)).slice(0, 3) });
  }

  const out = { game: 'idiom', total: total, pass: npass, units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.__idmVlog = out;                          // 外部断言挂点（任务书钩子）
  window.VERIFY = out;                             // window.VERIFY 对象含 units {name, ok, note}
  document.title = (npass === total) ? 'VERIFY PASS ' + npass + '/' + total : 'VERIFY FAIL';
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 未 init，audio.ctx 为 null，双保险）
     voice.play 记录 key+text（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）
     供反馈链/确认链绑定断言；KIDS.audio.note/sfx 静默 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k, t) { window.__lastVoiceKey = k || null; window.__lastVoiceText = t || null; };
  KIDS.voice.say = function (t) { window.__lastSayText = t || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  runVerify();
}
