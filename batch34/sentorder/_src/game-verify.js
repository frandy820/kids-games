/* ================= ?verify=1 自检（仅 verify 分支加载执行；13 单元——r45 扩容后）
   U1  struct  结构：句库 40 句静态表完整（SPEC 独立硬编码双录对账，每章 10=存量 5+新增 5）/
              干扰表完整（dist ∈ 远域池 12 ∪ 近对池 4 且 ∉ 本句词；ch3 新增句 dist[0]∈近对）/
              句内词互异 / 陷阱句 tp≥3 / flat0-39 genLevel structWhy 全 null + dch≥3
              词卡相对序恒等零违例（r45 §R3 拒入律）/ 词卡与槽 DOM 在场且无 undefined 文本
   U2  tut    教学三段：watch 真走完（__soDemoR=='done' 锚点「小兔子吃萝卜」）→
              help 态（首题=本章句库首句定制形态）→ 句拼满放手 solo
   U3  drive  逐关驱动 flat0-19：tapWord 按 words 序通关；每步 picked 断言=verify
              独立比对 words 前缀（禁从实现函数复算——独立 specNext 找卡）
   U4  frame  契约 M 帧内容断言（三层）：数值层 picked==独立前缀 / DOM 序槽词文本逐槽
              ===picked / 帧内容卡 gone==used；候选池恒全摆 L+d（错点后卡数不变）
   U5  wrong2 错路径两级：点语序跳前的本句词 → 'wrong'+so_wrong_order 链头；点干扰词
              → 'wrong'+so_wrong_word 链头（__lastQueue 取证区分）；miss 计数
   U6  ladder 错反馈梯度：首错方向级（无 breathe）；miss≥2 下一正确词卡 breathe
   U7  stars  星级口径：0 错 3★ / 1-2 错 2★ / ≥3 错 1★（永不 0★）
   U8  gen    生成关 flat20-59：dch=独立复算 mulberry32(flat*7919+601) 首掷 ri(1,4)
              对账；域 [1,4]；四型全现；滑窗取句 10 句全用 + 恒等零违例
   U9  chain  错链豁免窗：静态 6000 ≥ max(order 2424,word 2784)+150+2760+300=5994；
              运行时起播设窗 / flat≥3 节流跳过不设窗 / startLevel 重置
   U10 confirm 确认链构成：done → [so_right(clip), 'so_s_N'(整句 clip)]——两段全键
              零 keyless（T46 化 2026-09-19）；窗 7100 ≥ 2520+150+全 40 句实长 worst
              2952+300=5922（r45 段二实测口径——新 20 句 worst 2904<存量 s20，est 6675 退役）
   U11 save   写档：KIDS.init 写 kidsgame_sentorder v:'1.0'；level.pass 后 rec 更新
   U12 real   真实路径：预置存档 v:'1.0' + SO.start(0) 首关钩子形态 + 重入幂等
   U13 layout r45 新面布局：flat18 含六词句 s40（8 卡/6 槽）渲染无横向溢出 +
              已用卡再点='false' 不记 miss（r43 M4 作答形态补面）
   结果写 #verify-result + window.VERIFY（units {name,ok,note}）+ document.title */
async function runVerify() {
  /* title 协议：初始=游戏名（禁先设 'VERIFY'——gate 判据 'VERIFY' in title 会首轮假触发），
     跑完设 'VERIFY PASS n/n' / 'VERIFY FAIL n/n'（外部脚本先等 title 再驱动，b17 坑） */
  document.body.classList.add('verify');
  const units = [];
  let npass = 0;
  const U = (name, ok, note) => { units.push({ name: name, ok: !!ok, note: note == null ? '' : String(note) }); if (ok) npass++; };

  /* ---- SPEC-BATCH34 §0.83/§2 + SPEC-R45 §R4 独立硬编码表（禁抄页面常量——双录对账） ---- */
  const SPEC_BANK = {
    1: [['小兔子', '吃', '萝卜'], ['小猫', '钓', '鱼'], ['小狗', '啃', '骨头'],
        ['小鸡', '吃', '米'], ['小熊', '喝', '牛奶'],
        ['妈妈', '洗', '衣服'], ['爸爸', '看', '报纸'], ['哥哥', '搭', '积木'],
        ['妹妹', '踢', '毽子'], ['老师', '讲', '故事']],
    2: [['小鱼', '在', '水里', '游', ['石头', '帽子']], ['小鸟', '在', '树上', '唱', ['雨伞', '书包']],
        ['小狗', '在', '门口', '坐', ['灯', '星星']], ['小马', '在', '草地', '跑', ['桌子', '雨伞']],
        ['小鸡', '在', '窝里', '叫', ['书包', '月亮']],
        ['妹妹', '在', '屋里', '跳舞', ['飞机', '灯']], ['爷爷', '在', '公园', '打拳', ['桌子', '星星']],
        ['天气', '真', '好', '呀', ['帽子', '汽车']], ['我', '把', '作业', '写完', ['椅子', '月亮']],
        ['大家', '一起', '做', '操', ['书包', '太阳']]],
    3: [['小猴子', '在', '树上', '吃', '桃', ['月亮', '帽子']], ['小鸭子', '在', '水里', '捉', '鱼', ['帽子', '星星']],
        ['小蜜蜂', '在', '花园', '采', '蜜', ['石头', '灯']], ['小兔子', '在', '草地', '上', '跳', ['书包', '月亮']],
        ['小猫', '用', '爪子', '抓', '球', ['月亮', '太阳']],
        ['我', '先', '洗手', '再', '吃饭', ['然后', '月亮']], ['四只', '小羊', '在', '坡上', '吃草', ['坡下', '月亮']],
        ['小猴子', '在', '山下', '爬', '树', ['山上', '灯']], ['小螃蟹', '在', '桥下', '吹', '泡泡', ['桥上', '星星']],
        ['小猫', '先', '洗脸', '再', '睡觉', ['然后', '太阳']]],
    4: [['小熊', '吃', '蜂蜜', ['石头', '书包']], ['小猪', '在', '泥里', '打滚', ['星星', '灯']],
        ['小朋友', '在', '教室', '读', '书', ['雨伞', '帽子']], ['小鸡', '在', '窝里', '睡觉', ['石头', '帽子']],
        ['小松鼠', '在', '树上', '藏', '果子', ['月亮', '汽车']],
        ['我', '扶', '奶奶', '下楼', ['雨伞', '书包']], ['小鸭子', '背', '小鸡', '过河', ['月亮', '汽车']],
        ['小蝴蝶', '飞', '到', '哪里', '了', ['石头', '帽子']], ['小青蛙', '唱', '得', '真', '棒', ['飞机', '桌子']],
        ['小猴子', '先', '爬', '树', '再', '摘桃', ['然后', '书包']]]
  };
  const SPEC_TP = ['我扶奶奶下楼', '小鸭子背小鸡过河', '小猴子先爬树再摘桃'];   /* r45 陷阱句（tp 标记 ≥3） */
  const SPEC_POOL = ['太阳', '月亮', '星星', '石头', '雨伞', '帽子', '书包', '灯', '汽车', '飞机', '桌子', '椅子'];
  const SPEC_NEAR = ['然后', '山上', '桥上', '坡下'];                            /* r45 近对干扰封闭池 */
  const SPEC_DUR = { right: 2520, order: 2424, word: 2784, hint: 2760, watch: 2952, turn: 1824 };
  /* T46 化（2026-09-19）+ r45 扩容（2026-09-22）+ 段二实测回填（2026-09-22 注册后）：
     整句 so_s 1-40 全注册实长独立副本（verify 自持；21-40=mutagen 实测，真值源 r456_clip_ms.json，
     est 3705 口径退役——与 build.SO_S_DUR 双录同值）。specSWorst=2952（全 40 句 worst=存量 s20，
     新 20 句 worst 2904<s20）；字数档 worst 1248/1440/1704 不变（=存量在册档 worst，WORD_WIN 锚定；
     新词各档实测 1224/1464/1632——2 字档 1464 超 1440 达 24ms，窗余量 276ms 无尾截，SPEC-R45 §R8 复核行） */
  const SPEC_S_DUR = { 1: 2112, 2: 1848, 3: 1992, 4: 1848, 5: 2064, 6: 2136, 7: 2256, 8: 2184,
                       9: 2256, 10: 2328, 11: 2544, 12: 2592, 13: 2760, 14: 2544, 15: 2496,
                       16: 1968, 17: 2352, 18: 2640, 19: 2472, 20: 2952,
                       21: 1968, 22: 1872, 23: 1944, 24: 1968, 25: 2016, 26: 2304, 27: 2376,
                       28: 1944, 29: 2040, 30: 2112, 31: 2280, 32: 2904, 33: 2640, 34: 2904,
                       35: 2688, 36: 2112, 37: 2616, 38: 2424, 39: 2304, 40: 2880 };
  const specSWorst = Math.max.apply(null, Object.keys(SPEC_S_DUR).map(k => SPEC_S_DUR[k]));
  const SPEC_WLEN = { 1: 1248, 2: 1440, 3: 1704 };   // 词字数档 worst clip（1字 worst=so_w_50 书）
  /* 独立 mulberry32 复刻（SPEC §0.83：rng=mulberry32(flat*7919+601)，禁调引擎函数） */
  function vMul32(a) {
    return function() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const specDch = flat => { const r = vMul32(flat * 7919 + 601); return 1 + Math.floor(r() * 4); };
  /* 独立找卡/驱动器（禁用 solveNext/correctIdx——从 SO.quiz 快照独立推导） */
  const specNext = qz => qz.opts.findIndex(c => !c.used && c.w === qz.words[qz.picked.length]);
  /* r45 §R3 恒等拒入独立判据：句词在池中的出现序是否严格递增（= 零重排挑战面） */
  const specRelIdent = (words, opts) => {
    const pos = words.map(w => opts.findIndex(c => c.w === w));
    return pos.every((p, k) => k === 0 || p > pos[k - 1]);
  };
  const tapRetry = async i => {                   // 演出窗/错链窗吞 false → 轮询重试（错链窗=真时钟 6000ms——间隔等待覆盖，无间隔会瞬间烧尽循环）
    for (let g = 0; g < 40; g++) { const r = await SO.tapWord(i); if (r !== false) return r; await new Promise(w => setTimeout(w, 300)); }
    return false;
  };

  /* ---- U11 save 先真跑（写档契约 C：之后 _save/persist 转 stub 供教学链） ---- */
  const origLS = localStorage.getItem('kidsgame_sentorder');   /* 保存真实档（init 真跑前——审查 M1：测后恢复，防毁玩家档） */
  KIDS.init({ game: 'sentorder', title: '句子拼拼乐' });   // 真 init（真 persist 落盘）
  {
    let ok = false, note = '';
    try {
      const raw = localStorage.getItem('kidsgame_sentorder');
      const sv = raw ? JSON.parse(raw) : null;
      const vOk = !!sv && sv.v === '1.0' && sv.game === 'sentorder';
      KIDS.level.pass(1, 0, 3, [0, 1, 2, 3, 4]);            // 通关写档 rec
      const rec = (JSON.parse(localStorage.getItem('kidsgame_sentorder')).levels || {})['1-0'];
      ok = vOk && !!rec && rec.stars === 3;
      note = 'v=' + (sv && sv.v) + ' rec.stars=' + (rec && rec.stars);
      localStorage.removeItem('kidsgame_sentorder');       // 清测试档（不破坏真实页 freshTut）
    } catch (e) { note = 'ex:' + e.message; }
    if (origLS !== null) localStorage.setItem('kidsgame_sentorder', origLS);   /* 恢复真实档（审查 M1——hidecup 同模式） */
    U('save', ok, note);
  }
  KIDS._save = function () { return { levels: {} }; };     // verify 页存档 stub
  KIDS.store.persist = function () {};

  /* ---- U1 struct 结构 ---- */
  {
    let ok = true, note = [];
    /* 句库 40 句双录对账（词序/句条/干扰表逐字段；每章 10 = 存量 5 前 + 新增 5 后——键稳定律） */
    const poolOk = JSON.stringify(DIST_POOL.slice().sort()) === JSON.stringify(SPEC_POOL.slice().sort());
    const nearOk = JSON.stringify((typeof NEAR_POOL !== 'undefined' ? NEAR_POOL : []).slice().sort()) === JSON.stringify(SPEC_NEAR.slice().sort());
    if (!poolOk) { ok = false; note.push('pool'); }
    if (!nearOk) { ok = false; note.push('near'); }
    let nSent = 0, nTp = 0;
    [1, 2, 3, 4].forEach(c => {
      if ((SENT_BANK[c] || []).length !== 10) { ok = false; note.push('bank' + c + 'n'); }
      (SENT_BANK[c] || []).forEach((s, i) => {
        const sp = SPEC_BANK[c][i];
        nSent++;
        if (!sp) { ok = false; note.push('sp' + c + i); return; }
        const dist = sp[sp.length - 1];
        const words = sp.slice(0, sp.length - (c === 1 ? 0 : 1));
        const words1 = c === 1 ? sp : words;                // ch1 无 dist 尾
        if (JSON.stringify(s.w) !== JSON.stringify(words1)) { ok = false; note.push('w' + c + i); }
        if (s.t !== words1.join('')) { ok = false; note.push('t' + c + i); }
        if (c === 1) {
          if (s.dist) { ok = false; note.push('d0' + i); }  // ch1 无干扰表
        } else {
          if (JSON.stringify(s.dist || []) !== JSON.stringify(dist)) { ok = false; note.push('d' + c + i); }
          (s.dist || []).forEach(w => {
            if (SPEC_POOL.indexOf(w) < 0 && SPEC_NEAR.indexOf(w) < 0) { ok = false; note.push('dp' + w); }   // ∈ 远域∪近对封闭池
            if (s.w.indexOf(w) >= 0) { ok = false; note.push('dh' + w); }                                    // ≠ 本句词
          });
          if (c === 2 && (s.dist || []).some(w => SPEC_NEAR.indexOf(w) >= 0)) { ok = false; note.push('n2' + i); }   // ch2 全远域（下限不动）
          if (c === 3 && i >= 5 && SPEC_NEAR.indexOf((s.dist || [])[0]) < 0) { ok = false; note.push('n3' + i); }    // ch3 新增句 dist[0]∈近对
        }
        if (new Set(s.w).size !== s.w.length) { ok = false; note.push('dup' + c + i); }   // 句内词互异
        if (c === 4 && s.tp) { if (SPEC_TP.indexOf(s.t) < 0) { ok = false; note.push('tpx' + i); } else nTp++; }   // 陷阱句标记核对
      });
    });
    if (nSent !== 40 || SENT_ALL.length !== 40) { ok = false; note.push('n40:' + nSent); }
    if (nTp !== SPEC_TP.length) { ok = false; note.push('tpN:' + nTp); }                   // 陷阱句恰 3（≥3 SPEC 律）
    /* flat0-39 引擎产物 structWhy 全 null + 恒等零违例 + 关结构（ch/dch/题数/滑窗句） */
    for (let flat = 0; flat < 40 && ok; flat++) {
      const L = genLevel(flat);
      if (L.quizzes.length !== 5) { ok = false; note.push('q5@' + flat); break; }
      if (L.ch !== Math.floor(flat / 5) + 1) { ok = false; note.push('ch@' + flat); break; }
      const dchWant = flat < 20 ? ((Math.floor(flat / 5)) % 4) + 1 : L.dch;
      if (L.dch !== dchWant) { ok = false; note.push('dch@' + flat); break; }
      const gotSet = new Set(L.quizzes.map(q => q.words.join('/')));
      if (gotSet.size !== 5) { ok = false; note.push('rot@' + flat); break; }   // 每关 5 句互异（滑窗）
      for (let k = 0; k < 5; k++) {
        const why = structWhy(L.quizzes[k], L.dch, flat, k, L.lv);
        if (why) { ok = false; note.push('why@' + flat + '/' + k + ':' + why); break; }
        if (L.dch >= 3 && specRelIdent(L.quizzes[k].words, L.quizzes[k].opts)) {   // r45 §R3 拒入律
          ok = false; note.push('ident@' + flat + '/' + k); break;
        }
      }
      if (!ok) break;
    }
    /* DOM：startLevel(0) 后词卡/槽/题面在场，无 undefined 文本 */
    SO.start(0);
    const nCard = boardEl.querySelectorAll('.wcard').length;
    const nCell = slotsEl.querySelectorAll('.cell').length;
    const lineTxt = (sceneEl.querySelector('.line') || {}).textContent;
    const noUndef = !$id('game').textContent.match(/undefined|NaN/);   // 只扫游戏容器（script 源码自身含词面）
    if (nCard !== 3 || nCell !== 3 || lineTxt !== '小兔子吃萝卜' || !noUndef) {
      ok = false; note.push('dom:' + nCard + '/' + nCell + '/' + lineTxt);
    }
    U('struct', ok, note.length ? note.join(',') : '40 sents + pool12+near4 + flat0-39 why-null/ident0 + dom3/3');
  }

  /* ---- U2 tut 教学三段（watch → help → solo） ---- */
  {
    SO.start(0);
    window.__lastSay = null; window.__lastQueue = null;
    const t0 = Date.now();
    await tutorialWatch();
    const tw = (Date.now() - t0) / SPEED;         // 折算真实页时长
    const q0 = SO.quiz;
    const watchOk = window.__soDemoR === 'done' && state.tut === 'help' &&
      cur.flat === 0 && q0 && q0.words.join('/') === '小兔子/吃/萝卜' && q0.opts.length === 3;
    /* help 首题定制形态：本章句库首句 + 池 3 卡（SPEC §2 turn=本章句库首句） */
    let soloOk = false;
    if (watchOk && state.tut === 'help') {
      let g = 0;
      while (state.tut === 'help' && g++ < 12) {
        const qz = SO.quiz;
        const i = specNext(qz);
        if (i < 0) break;
        await tapRetry(i);
      }
      soloOk = state.tut === 'solo';              // 句拼满（末词 done）放手
    }
    U('tut', watchOk && soloOk, 'demoR=' + window.__soDemoR + ' tut=' + state.tut + ' watchMs=' + Math.round(tw));
  }

  /* ---- U3 drive 逐关驱动 flat0-19（每步 picked=独立 words 前缀比对） ---- */
  {
    let ok = true, note = [];
    for (let flat = 0; flat < 20 && ok; flat++) {
      SO.start(flat);
      const lv = SO.currentLevel;
      const dchW = ((Math.floor(flat / 5)) % 4) + 1;
      if (!lv || lv.ch !== Math.floor(flat / 5) + 1 || lv.dch !== dchW || lv.n !== 5) {
        ok = false; note.push('lv@' + flat); break;
      }
      for (let qi = 0; qi < 5 && ok; qi++) {
        const qz0 = SO.quiz;                      // 题快照（words/opts 本题恒定）
        if (!qz0) { ok = false; note.push('qz@' + flat + '/' + qi); break; }
        const dW = qz0.opts.length - qz0.words.length;
        if (!(dW === 0 || dW === 1 || dW === 2)) { ok = false; note.push('d@' + flat + '/' + qi); break; }
        for (let k = 0; k < qz0.words.length && ok; k++) {
          const qz = SO.quiz;                     // 步内新快照（picked 实时）
          if (!qz || JSON.stringify(qz.picked) !== JSON.stringify(qz0.words.slice(0, k))) {
            ok = false; note.push('pre@' + flat + '/' + qi + '/' + k); break;      // 驱动前前缀比对
          }
          const i = specNext(qz);
          if (i < 0) { ok = false; note.push('next@' + flat + '/' + qi + '/' + k); break; }
          const want = k === qz.words.length - 1 ? 'done' : 'fill';
          const r = await tapRetry(i);
          /* 驱动后 picked：fill=当前题快照；done=step 已推进 → 刚拼满题的终态 */
          const pickedNow = r === 'done'
            ? cur.quizzes[cur.done ? 4 : cur.step - 1].picked
            : (SO.quiz ? SO.quiz.picked : null);
          if (r !== want) { ok = false; note.push('r@' + flat + '/' + qi + '/' + k + ':' + r); break; }
          if (JSON.stringify(pickedNow) !== JSON.stringify(qz.words.slice(0, k + 1))) {
            ok = false; note.push('post@' + flat + '/' + qi + '/' + k); break;     // 驱动后前缀比对
          }
        }
        const lvNow = SO.currentLevel;
        if (ok && qi < 4 && lvNow.step !== qi + 1) { ok = false; note.push('step@' + flat + '/' + qi); }
      }
      const lvEnd = SO.currentLevel;
      if (ok && (!lvEnd.done || !lvEnd.won || lvEnd.stars !== 3)) { ok = false; note.push('end@' + flat); }
    }
    U('drive', ok, note.length ? note.slice(0, 4).join(',') : 'flat0-19 all 3-star, picked==prefix every step');
  }

  /* ---- U4 frame 契约 M 帧内容断言（三层）+ 候选池恒全摆 ---- */
  {
    let ok = true, note = [];
    SO.start(10);                                 // ch3 五词+2 干扰（池 7）
    const qz0 = SO.quiz;
    if (!qz0 || qz0.opts.length !== qz0.words.length + 2) { ok = false; note.push('pool7'); }
    const domSlots = () => Array.from(slotsEl.querySelectorAll('.cell')).map(c => c.querySelector('.wd').textContent);
    const domGone = () => Array.from(boardEl.querySelectorAll('.wcard')).map(el => el.classList.contains('gone') ? '1' : '0').join('');
    const domN = () => boardEl.querySelectorAll('.wcard').length;
    if (ok && domN() !== qz0.opts.length) { ok = false; note.push('n0'); }
    if (ok) {
      const iD = qz0.opts.findIndex(c => qz0.words.indexOf(c.w) < 0);   // 干扰卡
      const rW = await tapRetry(iD);             // 先制造一次错（帧含错后状态）
      const qz1 = SO.quiz;
      if (rW !== 'wrong' || domN() !== qz0.opts.length) { ok = false; note.push('keep:' + rW + '/' + domN()); }   // 池恒全摆
      if (ok && JSON.stringify(domSlots()) !== JSON.stringify(qz1.picked.concat(['', '', '', '', '']).slice(0, qz1.words.length))) {
        ok = false; note.push('slots0');          // 数值层 vs DOM 序：空槽恒 ''
      }
      if (ok) {
        const words0 = qz0.words;
        for (let k = 0; k < words0.length && ok; k++) {
          const qzN = SO.quiz;
          const i = specNext(qzN);
          if (i < 0) { ok = false; note.push('fn@' + k); break; }
          const r = await tapRetry(i);
          if (r !== (k === words0.length - 1 ? 'done' : 'fill')) { ok = false; note.push('fr@' + k + ':' + r); break; }
          /* 三层对账（fill 步）：数值层（独立前缀）/ DOM 槽序 / 帧内容 gone==used */
          const pickedWant = words0.slice(0, k + 1);
          if (r === 'fill') {
            const pickedNum = cur.quizzes[cur.step].picked;    // fill 时 step 未推进=当前题
            if (JSON.stringify(pickedNum) !== JSON.stringify(pickedWant)) { ok = false; note.push('num@' + k); break; }
            const slotsWant = pickedWant.concat(Array(words0.length - pickedWant.length).fill(''));
            if (JSON.stringify(domSlots()) !== JSON.stringify(slotsWant)) { ok = false; note.push('dom@' + k); break; }
            const usedFlags = SO.quiz ? SO.quiz.opts.map(c => c.used ? '1' : '0').join('') : '';
            if (domGone() !== usedFlags) { ok = false; note.push('gone@' + k); break; }
          } else {                               // done：换题后槽清空重建
            const qNew = SO.quiz;
            if (qNew && JSON.stringify(domSlots()) !== JSON.stringify(Array(qNew.words.length).fill(''))) {
              ok = false; note.push('ren@' + k);
            }
          }
        }
      }
    }
    U('frame', ok, note.length ? note.join(',') : 'num/dom/gone 3-layer + pool all-laid after wrong');
  }

  /* ---- U5 wrong2 错路径两级（vlog __lastQueue 取证 clip key 区分） ---- */
  {
    let ok = true, note = [];
    SO.start(5);                                  // ch2 四词+1 干扰
    let qz = SO.quiz;
    let iJump = qz.opts.findIndex(c => !c.used && c.w === qz.words[1]);   // 语序跳前（第二词）
    if (iJump < 0) { ok = false; note.push('noJump'); }
    if (ok) {
      window.__lastQueue = null;
      const r1 = await tapRetry(iJump);
      const qz1 = SO.quiz;
      ok = r1 === 'wrong' && qz1.miss === 1 && qz1.picked.length === 0 &&
        window.__lastQueue && window.__lastQueue[0] === 'so_wrong_order' &&
        window.__lastQueue[1] === 'so_hint';
      if (!ok) note.push('order:' + r1 + '/' + qz1.miss + '/' + (window.__lastQueue || []).join('|'));
    }
    if (ok) {
      SO.start(5);                                // 重开（重置节流锚——两级分开取证）
      qz = SO.quiz;
      const iDist = qz.opts.findIndex(c => !c.used && qz.words.indexOf(c.w) < 0);   // 干扰词卡
      if (iDist < 0) { ok = false; note.push('noDist'); }
      else {
        window.__lastQueue = null;
        const r2 = await tapRetry(iDist);
        const qz2 = SO.quiz;
        ok = r2 === 'wrong' && qz2.miss === 1 &&
          window.__lastQueue && window.__lastQueue[0] === 'so_wrong_word' &&
          window.__lastQueue[1] === 'so_hint';
        if (!ok) note.push('word:' + r2 + '/' + qz2.miss + '/' + (window.__lastQueue || []).join('|'));
      }
    }
    U('wrong2', ok, note.length ? note.join(',') : 'order->so_wrong_order / word->so_wrong_word');
  }

  /* ---- U6 ladder 错反馈梯度（首错方向级 / miss≥2 答案级 breathe） ---- */
  {
    let ok = true, note = '';
    SO.start(6);                                  // ch2
    const qz = SO.quiz;
    const iJump = qz.opts.findIndex(c => !c.used && c.w === qz.words[1]);
    await tapRetry(iJump);                        // 一错：miss=1 无 breathe（方向级）
    const noLit = !boardEl.querySelector('.wcard.breathe') && SO.quiz.miss === 1;
    const iOk1 = specNext(SO.quiz);               // 下一正确词（点对推进 picked，再错一次制造 miss=2）
    await tapRetry(iOk1);
    const qz2 = SO.quiz;
    const iJump2 = qz2.opts.findIndex(c => !c.used && c.w === qz2.words[qz2.picked.length + 1]);   // 再跳前
    const r2 = await tapRetry(iJump2);            // 二错：miss=2 下一正确词卡 breathe
    const elOk = boardEl.querySelector('.wcard.breathe');
    const litOk = r2 === 'wrong' && SO.quiz.miss === 2 && !!elOk &&
      elOk.dataset.w === SO.quiz.words[SO.quiz.picked.length];   // breathe 的恰是下一正确词卡
    ok = noLit && litOk;
    note = 'noLit@1=' + noLit + ' lit@2=' + litOk + ' litW=' + (elOk ? elOk.dataset.w : null);
    U('ladder', ok, note);
  }

  /* ---- U7 stars 星级口径 ---- */
  {
    const LA = genLevel(10);
    LA.retries = 0; const st3 = engStars(LA) === 3;
    LA.retries = 1; const st2a = engStars(LA) === 2;
    LA.retries = 2; const st2b = engStars(LA) === 2;
    LA.retries = 3; const st1 = engStars(LA) === 1;
    LA.retries = 9; const stFloor = engStars(LA) === 1;   // 永不 0 星
    U('stars', st3 && st2a && st2b && st1 && stFloor, '3/2/2/1/floor1');
  }

  /* ---- U8 gen 生成关 flat20-59（独立复算 dch + 四型全现 + 5 句全用） ---- */
  {
    let ok = true, note = [];
    const seen = new Set();
    for (let flat = 20; flat < 60 && ok; flat++) {
      const L = genLevel(flat);
      const dchSpec = specDch(flat);              // 独立复算（mulberry32(flat*7919+601) 首掷 ri(1,4)）
      if (!(L.dch >= 1 && L.dch <= 4) || L.dch !== dchSpec) {
        ok = false; note.push('dch@' + flat + ':' + L.dch + '!=' + dchSpec); break;
      }
      seen.add(L.dch);
      const bankSet = new Set(SENT_BANK[L.dch].map(s => s.w.join('/')));
      const gotSet = new Set(L.quizzes.map(q => q.words.join('/')));
      if (gotSet.size !== 5 || bankSet.size !== 10) { ok = false; note.push('rot@' + flat + ':' + bankSet.size); break; }   // 滑窗 5 句互异 ⊆ 章库 10
      for (const g of gotSet) if (!bankSet.has(g)) { ok = false; note.push('out@' + flat); break; }
      for (let k = 0; k < 5; k++) {
        const why = structWhy(L.quizzes[k], L.dch, flat, k, L.lv);
        if (why) { ok = false; note.push('why@' + flat + '/' + k + ':' + why); break; }
        if (L.dch >= 3 && specRelIdent(L.quizzes[k].words, L.quizzes[k].opts)) {   // r45 §R3 拒入律
          ok = false; note.push('ident@' + flat + '/' + k); break;
        }
      }
      if (!ok) break;
    }
    if (seen.size !== 4) { ok = false; note.push('seen:' + Array.from(seen).join(',')); }
    U('gen', ok, note.length ? note.join(',') : 'flat20-59 dch==specDch, 4 types, window5 of bank10, ident0');
  }

  /* ---- U9 chain 错链豁免窗（静态 ≥5994 两链 max + 运行时起播/节流/重置） ---- */
  {
    let ok = true, note = [];
    const chainOrder = SPEC_DUR.order + 150 + SPEC_DUR.hint + 300;   // 2424+150+2760+300=5634
    const chainWord = SPEC_DUR.word + 150 + SPEC_DUR.hint + 300;     // 2784+150+2760+300=5994
    const staticOk = 6000 >= Math.max(chainOrder, chainWord);        // 窗 ≥ 两链 max
    if (!staticOk) { ok = false; note.push('static:' + Math.max(chainOrder, chainWord)); }
    if (ok) {                                     // 运行时①：flat<3 起播设窗
      SO.start(0);
      wrongChainUntil = 0;
      const qz = SO.quiz;
      let iW = qz.opts.findIndex(c => !c.used && qz.words.indexOf(c.w) < 0);          // 优先干扰卡
      if (iW < 0) iW = qz.opts.findIndex(c => !c.used && c.w !== qz.words[qz.picked.length]);   // ch1 无干扰退跳前词
      await tapRetry(iW);
      const winSet = wrongChainUntil > Date.now() && wrongChainUntil <= Date.now() + 6200;
      if (!winSet) { ok = false; note.push('winSet:' + wrongChainUntil); }
    }
    if (ok) {                                     // 运行时②：flat≥3 节流跳过不设窗（契约 I「起播设」）
      SO.start(10);
      lastWrongVoice = Date.now(); wrongChainUntil = 0;              // 模拟 10s 内刚播过
      const qz = SO.quiz;
      const iJ = qz.opts.findIndex(c => !c.used && c.w !== qz.words[0]);
      const rJ = await tapRetry(iJ);
      if (!(rJ === 'wrong' && wrongChainUntil === 0)) { ok = false; note.push('winSkip:' + wrongChainUntil); }
    }
    if (ok) {                                     // 运行时③：startLevel 双锚重置
      wrongChainUntil = 99; lastWrongVoice = 99;
      SO.start(11);
      if (wrongChainUntil !== 0 || lastWrongVoice !== 0) { ok = false; note.push('reset:' + wrongChainUntil); }
    }
    U('chain', ok, note.length ? note.join(',') : 'static 6000>=5994; set/skip/reset ok');
  }

  /* ---- U10 confirm 确认链构成（right clip + 整句 TTS keyless 恒尾） ---- */
  {
    let ok = true, note = [];
    SO.start(0);
    window.__lastQueue = null;
    const qz = SO.quiz;
    for (let k = 0; k < qz.words.length; k++) {
      const i = specNext(SO.quiz);
      if (i < 0) { ok = false; note.push('fn@' + k); break; }
      await tapRetry(i);
    }
    const q = window.__lastQueue;
    const chainOk = !!q && q.length === 2 && q[0] === 'so_right' &&
      q[1] === 'so_s_1' &&                        // T46 化：尾段=整句 clip 键（s1=小兔子吃萝卜——全键零 keyless）
      typeof q[1] === 'string';
    const winOk = (2600 + 4500) >= SPEC_DUR.right + 150 + specSWorst + 300 &&    // 7100 ≥ 2520+150+2952+300=5922（r45 段二实测口径，est 6675 退役）
                  WORD_WIN[1] === SPEC_WLEN[1] + 300 &&   // 词窗档=在册档 worst+300（T46 口径；r45 新词实测各档 1224/1464/1632——窗不动，2 字档 1464 超 1440 达 24ms 余 276ms 无尾截 §R8）
                  WORD_WIN[2] === SPEC_WLEN[2] + 300 &&
                  WORD_WIN[3] === SPEC_WLEN[3] + 300;
    if (!chainOk) note.push('chain:' + JSON.stringify(q));
    if (!winOk) note.push('win');
    ok = chainOk && winOk;
    U('confirm', ok, note.length ? note.join(',') : "[so_right,'so_s_1'] tail + win 7100>=" +
      (SPEC_DUR.right + 150 + specSWorst + 300));
  }

  /* ---- U12 real 真实路径（预置存档 v:'1.0' + start(0) 首关钩子形态） ---- */
  {
    let ok = true, note = [];
    KIDS._save = function () { return { v: '1.0', game: 'sentorder', levels: {}, sentorder: {} }; };   // 预置存档 v:'1.0'
    SO.start(0);                                  // 首关（freshTut 条件读预置档——verify 页直驱形态）
    const lv = SO.currentLevel;
    const qz = SO.quiz;
    const lvOk = !!lv && lv.flat === 0 && lv.ch === 1 && lv.dch === 1 && lv.lv === 0 &&
      lv.n === 5 && lv.step === 0 && !lv.done && !lv.won && lv.miss === 0;
    const qOk = !!qz && qz.words.join('/') === '小兔子/吃/萝卜' && qz.opts.length === 3 &&
      qz.picked.length === 0 && qz.step === 0 && qz.miss === 0;     // step=全关题号（b33 坑①）
    if (!lvOk) note.push('lv:' + JSON.stringify(lv));
    if (!qOk) note.push('qz:' + JSON.stringify(qz && qz.words));
    if (ok && lvOk && qOk) {
      SO.start(0);                                // 重入幂等（第二次 start 同形态）
      const lv2 = SO.currentLevel, qz2 = SO.quiz;
      if (!lv2 || lv2.flat !== 0 || !qz2 || qz2.words.join('/') !== '小兔子/吃/萝卜') {
        ok = false; note.push('reentry');
      }
    } else ok = false;
    U('real', ok, note.length ? note.join(',') : 'preset v1.0 + start(0) hook shape + reentry idempotent');
  }

  /* ---- U13 layout r45 新面布局：flat18 推进到六词句 s40（8 卡/6 槽）渲染无横向溢出 +
              已用卡再点=吞 false 不记 miss（r43 M4 作答形态补面：谱投影面全形态有采样关） ---- */
  {
    let ok = true, note = [];
    SO.start(18);                                   // ch4 lv3 滑窗 [6,7,8,9,0]——qi3 = s40 六词句
    let qz = SO.quiz;
    for (let g = 0; g < 5 && !(qz && qz.words.length === 6); g++) {   // 逐题拼满推进到 6 词题
      if (!qz) { ok = false; note.push('noq'); break; }
      for (let k = 0; k < qz.words.length && ok; k++) {
        const i = specNext(SO.quiz);
        if (i < 0) { ok = false; note.push('fn@' + g + '/' + k); break; }
        await tapRetry(i);
      }
      qz = SO.quiz;
    }
    if (ok) {
      const d = qz.opts.length - qz.words.length;
      if (qz.words.join('/') !== '小猴子/先/爬/树/再/摘桃' || d !== 2) {   // 独立复算谱：flat18/qi3 d=2 → 8 卡
        ok = false; note.push('q:' + qz.words.join('/') + '/d' + d);
      }
      let rendered = false;                          // 等演出窗后新题渲染（SO.quiz 先于 DOM 翻题——poll 卡数对齐）
      for (let w = 0; w < 40 && !rendered; w++) {
        rendered = boardEl.querySelectorAll('.wcard').length === qz.opts.length;
        if (!rendered) await new Promise(r => setTimeout(r, 300));
      }
      if (!rendered) { ok = false; note.push('render-timeout'); }
      const nCard = boardEl.querySelectorAll('.wcard').length;
      const nCell = slotsEl.querySelectorAll('.cell').length;
      const nGone = boardEl.querySelectorAll('.wcard.gone').length;
      if (nCard !== 8 || nCell !== 6 || nGone !== 0) { ok = false; note.push('dom:' + nCard + '/' + nCell + '/' + nGone); }
      const noUndef = !$id('game').textContent.match(/undefined|NaN/);
      if (!noUndef) { ok = false; note.push('undef'); }
      /* 横向溢出：卡池/槽行/文档三层都不许超出可视宽（+1px 圆整容差） */
      const ovf = (boardEl.scrollWidth > boardEl.clientWidth + 1) ||
                  (slotsEl.scrollWidth > slotsEl.clientWidth + 1) ||
                  (document.documentElement.scrollWidth > window.innerWidth + 1);
      if (ovf) { ok = false; note.push('ovf:' + boardEl.scrollWidth + '/' + slotsEl.scrollWidth + '/' + document.documentElement.scrollWidth); }
      /* 已用卡再点：点下一正确词（fill 入槽灰化）→ 再点同卡 = 吞 false 且 miss 恒 0 */
      const i1 = specNext(SO.quiz);
      const r1 = await tapRetry(i1);
      const missB = SO.quiz ? SO.quiz.miss : -1;
      const r2 = await SO.tapWord(i1);
      const qz2 = SO.quiz;
      if (!(r1 === 'fill' && r2 === false && missB === 0 && qz2 && qz2.miss === 0)) {
        ok = false; note.push('used:' + r1 + '/' + r2 + '/' + missB + '/' + (qz2 && qz2.miss));
      }
    }
    U('layout', ok, note.length ? note.join(',') : 's40 8cards/6slots, no-overflow, used-retap false+miss0');
  }

  const out = { game: 'sentorder', total: units.length, pass: npass,
                units: units };
  $id('verify-result').textContent = JSON.stringify(out);
  window.VERIFY = out;                            // 结果挂全局（playwright 读取）
  document.title = npass === units.length ? ('VERIFY PASS ' + npass + '/' + units.length)
                                          : ('VERIFY FAIL ' + (units.length - npass) + '/' + units.length);
}

if (VERIFY) {
  /* verify 模式：stub 全部发声 API（KIDS 已 init，双保险）
     voice.play 记录调用 key（__lastVoiceKey）；voice.queue 记录拼播链（__lastQueue）；
     voice.say 记录 TTS 拼句（__lastSay）——供教学链/确认链/两级错链断言 */
  KIDS.audio.note = function () {};
  KIDS.audio.sfx = function () {};
  KIDS.speak = function () {};
  KIDS.voice.play = function (k) { window.__lastVoiceKey = k || null; };
  KIDS.voice.queue = function (parts) {
    window.__lastQueue = parts;
    window.__lastVoiceKey = parts && parts.length ? parts[0] : null;
  };
  KIDS.voice.say = function (t) { window.__lastSay = t || null; };
  runVerify();
}
