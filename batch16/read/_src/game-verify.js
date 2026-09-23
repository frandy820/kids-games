/* ================= ?verify=1 自检（仅 verify 分支加载执行）
   ① 40 关全量审计（flat 0-39，每关一记）：确定性（同 flat 双生成 JSON 一致）/ 章号 1 基+
     静态关难度章循环+生成关 dch∈1-4 / **§0.31 命门：verify 侧独立文本级判定器 verJudge**
     （独立词表副本+模式匹配，从上屏 passage/question/options 出发推导每个选项真假，
     不读引擎 answer/facts 字段——分源防两套逻辑同错）：正确项唯一成立+两干扰项必不
     成立+verJudge 真项下标===引擎 answer（对账）/ 问句文本=段 clip 文本拼接（VER_TXT
     独立段表对账，text↔segs 严格同源）/ 同关 5 题（passage+question）互异 / keyLine 句
     含正确项核心词（独立复算）/ SPEC 干扰定义复核（ch1/ch2 干扰词在文中、ch4 干扰感受
     词不在文中）/ 短文 40-80 字 / 引擎直驱三档星级（0 错 3★/1 错 2★/3 错 1★）
   ② tapOption 单元（flat0 真实 UI）：错点=晃动+miss+关键句高亮+不推进+不重置救援钟+
     首错不 pulse 正确卡；二错=正确卡 pulse（miss≥2 口径 §0.7）；点对=短文卡打勾收起
     +选项卡跳+推进；locked 吞输入=false+nudge+状态不变（§0.22）；非法下标 false
   ③ 教学链（verify 直驱 tutorialWatch）：watch clip → 演示听读（rd_listen+首句 rd_s_ clip）
     → 题句段 queue → 排除划暗 → __rdDemoR==='right'（§0.27 演示真实生效）→ 重发同关
     tut='help' → 交接 queue [rd_tut_turn, 题句段]（§0.6 单通道）
   ④ sayW 三态（§0.5）：flat<3 每错必播（两错两播）/ flat≥3 10s 节流+miss===2 豁免（两错两播）
   ⑤ 分布与专项：VOICE 表文案独立字面量对账（manifest 一致）/ rd_+core 41+rd_s_ 174=215 条
     clips 注入 clipOk（SENT_KEYS 域=独立 id 域字面量构造，双向封闭）/ 开场链 queue([rd_hint,
     题句段]) / 重听题面=题句段 / 点句跟读=rd_s_ clip play / 听读=rd_listen+逐句 rd_s_ play
     （T46 正文 clip 化）/ 数据 key 覆盖（人物 3 词=预合成冗余无播放点，记 unused）/
     40 关 sentKeys 全 ⊆ SENT_KEYS 域 / ch3 三子型与 ch4 双形态分布
   ⑥ UI 冒烟 A：flat0 真实点击通关（首题一错+全对收尾）→ done+won+1 miss 2★+verify 页不弹层
   ⑦ UI 冒烟 B：flat10（ch3 推断）/flat15（ch4 感受）/flat25（生成关）autoSolve 3★
   ⑧ 布局：双 viewport（1280×800 / 800×1180）×（flat0/10/15）：选项卡 ≥96、全按钮 ≥64
     （.k-parentbtn 豁免）、短文句行 ≥64、overflowX ≤0
   ⑨ 救援与 §0.7a：错点不重置救援钟；救援=题句重读+正确选项卡 breathe（§0.21 两件）；
     听读/点句跟读/重听题面=主动学习动作重置
   结果写 #verify-result + document.title='VERIFY PASS n/n' */
async function runVerify() {
  document.body.classList.add('verify');
  const levels = {}, gen = {}, units = {}, smokes = {};
  let npass = 0, total = 0;
  const genDch = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const askDist = { rd_q3a: 0, rd_q3b: 0, rd_q3c: 0, rd_q4a: 0, rd_q4b: 0, rd_q2: 0, rd_q2b: 0 };

  /* ---- verify 侧独立真值源（不调引擎判定/词表，防两套逻辑同错 §0.31） ---- */
  const V_COLORS = ['红色', '蓝色', '绿色', '黄色'];
  const V_PLACES = ['家里', '公园', '河边', '学校', '商店', '操场'];
  const V_ITEMS = ['萝卜', '书', '雨鞋', '帽子', '风筝', '雨伞'];
  const V_FEELS = ['开心', '难过', '生气', '着急'];
  const V_SENTS = p => p.split(/[。！？]/).filter(s => s.length > 0);   // 句级切分（独立实现）
  /* §0.31 分源核心：纯文本级判定器——从上屏文本+问句出发推导选项真假
     返回 true/false；题面异常（问句不匹配/依据句缺失/依据句多义）返回 null */
  function verJudge(dch, askKey, question, passage, opt) {
    const sents = V_SENTS(passage);
    if (dch === 1) {                       /* "小兔子的X是什么颜色"：小兔子所在句"{色}的{X}" */
      const m = question.match(/小兔子的(.+?)是什么颜色/);
      if (!m) return null;
      const hits = V_COLORS.filter(c => sents.some(s => s.includes('小兔子') && s.includes(c + '的' + m[1])));
      if (hits.length !== 1) return null;  /* 唯一成立铁律：恰一色命中（0 或多=题面无效） */
      return opt === hits[0];
    }
    if (dch === 2) {                       /* "先去了哪里"→"先去"句地点 / "然后"→"然后"句地点 */
      const key = askKey === 'rd_q2' ? '先去' : '然后';
      const s = sents.find(x => x.includes(key));
      if (!s) return null;
      const ps = V_PLACES.filter(p => s.includes(p));
      if (ps.length !== 1) return null;
      return opt === ps[0];
    }
    if (dch === 3) {                       /* 推断原因项：含原因关键词且文中依据在场 */
      if (askKey === 'rd_q3a')
        return passage.includes('乌云') && passage.includes('变暗') && opt.includes('乌云');
      if (askKey === 'rd_q3b')
        return passage.includes('不高兴') && passage.includes('够不着') &&
          opt.includes('够不着') && V_ITEMS.some(i => passage.includes(i) && opt.includes(i));
      return passage.includes('下雨') && passage.includes('跑回家') && opt.includes('下雨');
    }
    /* ch4：q4a"笑"句中的感受词 / q4b 全文唯一感受词 */
    if (askKey === 'rd_q4a') {
      const s = sents.find(x => x.includes('笑'));
      if (!s) return null;
      const fs = V_FEELS.filter(f => s.includes(f));
      if (fs.length !== 1) return null;
      return opt === fs[0];
    }
    const allF = V_FEELS.filter(f => passage.includes(f));
    if (allF.length !== 1) return null;    /* 感受词全文唯一（多义=题面无效） */
    return opt === allF[0];
  }
  /* keyLine 独立复算：关键句必须含正确项核心词（错点回看指向有效） */
  function verKeyLine(dch, askKey, question, passage, keyLine, rightOpt) {
    const sents = V_SENTS(passage);
    if (!sents[keyLine]) return false;
    const s = sents[keyLine];
    if (dch === 1) return s.includes('小兔子') && s.includes(rightOpt + '的');
    if (dch === 2) return s.includes(rightOpt);
    if (askKey === 'rd_q3a') return s.includes('乌云');
    if (askKey === 'rd_q3b') return V_ITEMS.some(i => s.includes(i));
    if (askKey === 'rd_q3c') return s.includes('下雨');
    return s.includes(rightOpt);           /* ch4 */
  }
  /* 拼接段文本独立段表（与 manifest 逐条一致；题句文本必须等于段文本顺序拼接+？） */
  const VER_TXT = {
    rd_q1: '小兔子的', rd_q1b: '是什么颜色呀', rd_q2: '小兔子先去了哪里呀',
    rd_q2b: '然后小兔子去了哪里呀', rd_q3a: '天为什么会变暗呀', rd_q3b: '小兔子为什么不高兴呀',
    rd_q3c: '小兔子为什么跑回家呀', rd_q4a: '小兔子为什么笑了呀', rd_q4b: '小兔子心里是怎么想的呀',
    rd_w_rabbit: '小兔子', rd_w_cat: '小猫', rd_w_bear: '小熊',
    rd_w_home: '家里', rd_w_park: '公园', rd_w_river: '河边', rd_w_school: '学校',
    rd_w_shop: '商店', rd_w_yard: '操场',
    rd_w_carrot: '萝卜', rd_w_book: '书', rd_w_boots: '雨鞋', rd_w_hat: '帽子',
    rd_w_kite: '风筝', rd_w_umbrella: '雨伞',
    rd_w_red: '红色', rd_w_blue: '蓝色', rd_w_green: '绿色', rd_w_yellow: '黄色',
    rd_w_happy: '开心', rd_w_sad: '难过', rd_w_angry: '生气', rd_w_worried: '着急'
  };
  const usedKeys = {};                            // 数据 key 覆盖（⑤ 用）
  const usedWords = {};

  /* ---- ① 40 关全量审计（flat 0-39） ---- */
  for (let flat = 0; flat < 40; flat++) {
    total++;
    const L1 = genLevel(flat), L2 = genLevel(flat);
    const det = JSON.stringify(L1) === JSON.stringify(L2);                     // 确定性
    const chOk = L1.ch === Math.floor(flat / CH_LEN) + 1;
    const dchOk = flat < STATIC_LEVELS ? L1.dch === diffOfCh(L1.ch) : (L1.dch >= 1 && L1.dch <= 4);
    if (flat >= STATIC_LEVELS) genDch[L1.dch]++;
    let structAll = true, uniqAll = true, textJoinOk = true, klOk = true,
        decoyOk = true, adjOk = true, lenOk = true;
    const seenPQ = {};
    for (let k = 0; k < L1.quizzes.length; k++) {
      const q = L1.quizzes[k];
      if (!structOk(q, L1.dch)) structAll = false;                             // 引擎侧结构（次检）
      /* §0.31 分源复算：每选项独立判真假——恰一真 + 真项下标===answer（对账） */
      const verdicts = q.options.map(o => verJudge(L1.dch, q.askKey, q.question, q.passage, o));
      const nTrue = verdicts.filter(v => v === true).length;
      const rightIdx = verdicts.indexOf(true);
      if (nTrue !== 1 || rightIdx < 0 || verdicts.some(v => v == null) || rightIdx !== q.answer) uniqAll = false;
      /* 问句=段 clip 文本拼接+？（text↔segs 同源） */
      if (q.question !== q.askSegs.map(s => VER_TXT[s] || ' ').join('') + '？') textJoinOk = false;
      /* keyLine 独立复算 */
      if (!verKeyLine(L1.dch, q.askKey, q.question, q.passage, q.keyLine, q.options[q.answer])) klOk = false;
      /* SPEC 干扰定义复核 */
      if (L1.dch === 1) {                        /* ch1 干扰=文中出现过的其他颜色 */
        for (let i = 0; i < 3; i++) if (i !== q.answer && !q.passage.includes(q.options[i])) decoyOk = false;
      } else if (L1.dch === 2) {                 /* ch2 干扰=事件中的其他地点 */
        for (let i = 0; i < 3; i++) if (i !== q.answer && !q.passage.includes(q.options[i])) decoyOk = false;
      } else if (L1.dch === 4) {                 /* ch4 干扰=文中没有的其他感受词 */
        for (let i = 0; i < 3; i++) if (i !== q.answer && q.passage.includes(q.options[i])) decoyOk = false;
      }
      /* 短文长度 40-80 字（含标点） */
      if (q.passage.length < 40 || q.passage.length > 80) lenOk = false;
      /* 同关 5 题互异（passage+question 上屏组合互异——独立于引擎 sig） */
      const pk = q.passage + '|' + q.question;
      if (seenPQ[pk]) adjOk = false;
      seenPQ[pk] = 1;
      /* 覆盖与分布 */
      q.askSegs.forEach(s => { usedKeys[s] = 1; });
      q.sentKeys.forEach(s => { usedKeys[s] = 1; });   /* T46：正文句键计入覆盖（⊆ SENT_KEYS 域断言） */
      q.optKeys.forEach(s => { if (s) { usedKeys[s] = 1; usedWords[s] = 1; } });
      if (q.askKey) askDist[q.askKey]++;
    }
    /* 引擎直驱 A：全对 → done 0 miss 3★ */
    const Ld = genLevel(flat);
    let driveOk = true;
    for (let k = 0; k < Ld.quizzes.length && driveOk; k++) {
      const q = Ld.quizzes[k];
      const r = engTapOption(Ld, q.answer);
      if ((k === Ld.quizzes.length - 1 ? r !== 'done' : r !== 'right') || !q.solved) driveOk = false;
    }
    const s3 = Ld.done && Ld.misses === 0 && engStars(Ld) === 3;
    /* 引擎直驱 B：首题先错后对 → 1 miss 2★ 通关 */
    const Lw = genLevel(flat);
    const wi0 = Lw.quizzes[0].options.findIndex((o, i) => i !== Lw.quizzes[0].answer);
    if (engTapOption(Lw, wi0) !== 'wrong' || Lw.misses !== 1) driveOk = false;
    for (let k = 0; k < Lw.quizzes.length && driveOk; k++) {
      const q = Lw.quizzes[k];
      const r = engTapOption(Lw, q.answer);
      if ((k === Lw.quizzes.length - 1 ? r !== 'done' : r !== 'right') || !q.solved) driveOk = false;
    }
    const s2 = Lw.done && Lw.misses === 1 && engStars(Lw) === 2;
    /* 引擎直驱 C：首题连错 3 次 → 3 miss 1★ 通关（错次口径三档全实证） */
    const L1s = genLevel(flat);
    for (let m = 0; m < 3; m++) engTapOption(L1s, wi0);
    for (let k = 0; k < L1s.quizzes.length; k++) engTapOption(L1s, L1s.quizzes[k].answer);
    const s1 = L1s.done && L1s.misses === 3 && engStars(L1s) === 1;
    const ok = det && chOk && dchOk && structAll && uniqAll && textJoinOk && klOk &&
      decoyOk && adjOk && lenOk && driveOk && s3 && s2 && s1 &&
      L1.quizzes.length === CH_LEN;
    if (ok) npass++;
    const rec = { ch: L1.ch, dch: L1.dch, ok: ok, det: det, structAll: structAll, uniqAll: uniqAll,
      textJoin: textJoinOk, klOk: klOk, decoyOk: decoyOk, adjOk: adjOk, lenOk: lenOk,
      driveOk: driveOk && s3 && s2 && s1,
      cs: L1.quizzes.map(q => q.passage + ' ⇒ ' + q.question + ' [' + q.options.join('/') + ']') };
    if (flat < STATIC_LEVELS) levels[keyOf(flat)] = rec;
    else gen[flat] = rec;
  }

  /* ---- ② tapOption 单元（flat0 真实 UI 状态机） ---- */
  total++;
  startLevel(0);
  const q0 = RD.quiz;
  const wrongs0 = [0, 1, 2].filter(i => i !== q0.answer);
  const pLog2 = [];
  const op2 = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLog2.push(String(key)); };
  lastAct = Date.now() - 13000;                                    // 回拨救援钟（§0.7a 断言用）
  const rW1 = await RD.tapOption(wrongs0[0]);
  const wrongOk = rW1 === 'wrong' && RD.currentLevel.misses === 1 && RD.currentLevel.step === 0 &&
    RD.quiz.miss === 1 &&
    !!cardsEl.querySelector('.card[data-i="' + wrongs0[0] + '"].wig') &&       // 晃动零惩罚可重点
    !!passageEl.querySelector('.psent[data-i="' + q0.keyLine + '"].flash') &&  // 短文关键句高亮一下
    pLog2.indexOf('rd_wrong') >= 0 &&                                          // sayW 播出
    Date.now() - lastAct > 12800 &&                                            // 错点不重置救援钟
    !cardsEl.querySelector('.card.pulse') && !cardsEl.querySelector('.card.breathe');  // 首错不 pulse（§0.7）
  const rW2 = await RD.tapOption(wrongs0[1]);
  const secondOk = rW2 === 'wrong' && RD.currentLevel.misses === 2 &&
    !!cardsEl.querySelector('.card[data-i="' + q0.answer + '"].pulse');        // miss≥2 才高亮正确卡
  KIDS.voice.play = op2;
  /* 点对：演出窗内断言短文卡打勾收起+选项卡跳，然后推进 */
  const pR = RD.tapOption(q0.answer);
  await wait(80);
  const okCard = pcardEl.classList.contains('ok') && !!pcheckEl.querySelector('svg') &&
    !!cardsEl.querySelector('.card.hop');
  const rR = await pR;
  const rightOk = rR === 'right' && RD.quiz && RD.quiz.step === 1 &&
    RD.currentLevel.misses === 2 && okCard && !pcardEl.classList.contains('ok');   // 新题打勾已复位
  /* locked 吞输入（§0.22 主答案同规）：false+nudge+状态不变 */
  state.locked = true;
  const missB = RD.currentLevel.misses, stepB = RD.currentLevel.step;
  const rS = await RD.tapOption(0);
  const swallowOk = rS === false && RD.currentLevel.misses === missB && RD.currentLevel.step === stepB &&
    !!cardsEl.querySelector('.card.nudge');
  state.locked = false;
  const badIdx = (await RD.tapOption(99)) === false && (await RD.tapOption(-1)) === false;
  const unitOk = wrongOk && secondOk && rightOk && swallowOk && badIdx;
  if (unitOk) npass++;
  units.taps = { ok: unitOk, wrongOk: wrongOk, secondOk: secondOk, rightOk: rightOk,
    okCard: okCard, swallowOk: swallowOk, badIdx: badIdx };

  /* ---- ③ 教学链（verify 直驱 tutorialWatch；真实页看-帮-独链路由无头自测覆盖） ---- */
  total++;
  const qLog3 = [], pLog3 = [], sLog3 = [];
  const oq3 = KIDS.voice.queue, op3 = KIDS.voice.play, os3 = KIDS.voice.say;
  KIDS.voice.queue = function (parts) { qLog3.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog3.push(String(key)); };
  KIDS.voice.say = function (t) { sLog3.push(String(t)); };
  startLevel(0);
  const q0s = genLevel(0).quizzes[0];
  await tutorialWatch();
  const lastQ3 = qLog3[qLog3.length - 1];
  const q3 = RD.quiz;
  const readAll = pLog3.indexOf(q0s.sentKeys[0]) >= 0 &&             /* 演示听读只读首句（rd_s_ clip 通道，b16 试玩 P3-1） */
    q0s.sentKeys.slice(1).every(k => pLog3.indexOf(k) < 0);       /* 第 2+ 句不读（断言随设计更新） */
  const tutOk = pLog3.indexOf('rd_tut_watch') >= 0 &&               /* 看=演示配 watch clip */
    pLog3.indexOf('rd_listen') >= 0 &&                              /* 演示读文走听读通道 */
    readAll &&                                                      /* 正文首句 clip 播报真实发生 */
    qLog3.some(p => p.join() === q0s.askSegs.join()) &&             /* 题句段 queue 真实发生 */
    window.__rdDemoR === 'right' &&                                 /* §0.27 演示点选真实生效 */
    state.tut === 'help' && !state.demo && !state.locked &&         /* 帮：解锁等孩子动手 */
    RD.currentLevel && RD.currentLevel.flat === 0 &&                /* 重发同关 */
    q3 && q3.step === 0 && q3.miss === 0 &&                         /* 新题面初态 */
    lastQ3 && lastQ3[0] === 'rd_tut_turn' &&                        /* 交接顺序链单通道 */
    lastQ3.slice(1).join() === q3.askSegs.join() &&
    !cardsEl.querySelector('.card.dim');                            /* 重发后无划暗残留 */
  KIDS.voice.queue = oq3; KIDS.voice.play = op3; KIDS.voice.say = os3;
  if (tutOk) npass++;
  units.tutorial = { ok: tutOk, watchClip: pLog3.indexOf('rd_tut_watch') >= 0,
    listenClip: pLog3.indexOf('rd_listen') >= 0, readAll: readAll,
    demoR: window.__rdDemoR, handoff: lastQ3, tut: state.tut };

  /* ---- ④ sayW 三态（§0.5）：flat<3 每错必播 / flat≥3 10s 节流+miss2 豁免 ---- */
  total++;
  const pLog4 = [];
  const op4 = KIDS.voice.play;
  KIDS.voice.play = function (key) { pLog4.push(String(key)); };
  startLevel(0);
  let qa = RD.quiz;
  let wa = [0, 1, 2].filter(i => i !== qa.answer);
  await RD.tapOption(wa[0]);
  await RD.tapOption(wa[1]);
  const saysFlat0 = pLog4.filter(k => k === 'rd_wrong').length;        /* 两错两播 */
  startLevel(10);                                                      /* flat≥3 */
  lastWrongVoice = 0;                                                  /* 节流表清零（模块变量直写） */
  qa = RD.quiz;
  wa = [0, 1, 2].filter(i => i !== qa.answer);
  await RD.tapOption(wa[0]);
  await RD.tapOption(wa[1]);                                           /* 10s 内第二错=miss2 豁免恰一次 → 仍播 */
  const saysFlat10 = pLog4.filter(k => k === 'rd_wrong').length - saysFlat0;   /* 两错两播（首发+豁免，§0.5） */
  KIDS.voice.play = op4;
  const sayWOk = saysFlat0 === 2 && saysFlat10 === 2;
  if (sayWOk) npass++;
  units.sayW = { ok: sayWOk, flat0: saysFlat0, flat10: saysFlat10 };

  /* ---- ⑤ 分布与专项：文案对账 / clip 注入 / 开场链 / 重听与听读通道 / key 覆盖 / 子型分布 ---- */
  total++;
  const refVoice = VOICE.watch.text === '看！读一读小故事' &&
    VOICE.turn.text === '你来当小侦探' && VOICE.hint.text === '读一读故事想一想' &&
    VOICE.wrong.text === '再读一读故事' && VOICE.right.text === '答对啦，你真会读' &&
    VOICE.listen.text === '我读给你听';
  const RD_KEYS = ['core_chapter_end', 'core_day_end', 'core_rest',
    'rd_tut_watch', 'rd_tut_turn', 'rd_hint', 'rd_wrong', 'rd_right', 'rd_listen',
    'rd_q1', 'rd_q1b', 'rd_q2', 'rd_q2b', 'rd_q3a', 'rd_q3b', 'rd_q3c', 'rd_q4a', 'rd_q4b',
    'rd_w_rabbit', 'rd_w_cat', 'rd_w_bear', 'rd_w_home', 'rd_w_park', 'rd_w_river',
    'rd_w_school', 'rd_w_shop', 'rd_w_yard', 'rd_w_carrot', 'rd_w_book', 'rd_w_boots',
    'rd_w_hat', 'rd_w_kite', 'rd_w_umbrella', 'rd_w_red', 'rd_w_blue', 'rd_w_green',
    'rd_w_yellow', 'rd_w_happy', 'rd_w_sad', 'rd_w_angry', 'rd_w_worried'];
  /* T46 正文句 clip 域（174）：独立 id 域字面量 + extract_read.py 同规则构造（分源，禁引引擎）。
     命名口径与 genCh1-4 sentKeys 同源对账——引擎侧构造错键在此双向断言拦截 */
  const V_ITEM_IDS = ['carrot', 'book', 'boots', 'hat', 'kite', 'umbrella'];
  const V_COLOR_IDS = ['red', 'blue', 'green', 'yellow'];
  const V_PL5 = ['park', 'river', 'school', 'shop', 'yard'];
  const V_PAL_IDS = ['cat', 'bear'];
  const SENT_KEYS = [];
  V_ITEM_IDS.forEach(it => V_COLOR_IDS.forEach(c => SENT_KEYS.push('rd_s_c1s0_' + it + '_' + c)));
  V_PAL_IDS.forEach(p => V_ITEM_IDS.forEach(it => V_COLOR_IDS.forEach(c => {
    SENT_KEYS.push('rd_s_c1s1_' + p + '_' + it + '_' + c, 'rd_s_c1s2_' + p + '_' + it + '_' + c);
  })));
  V_PL5.forEach(pl => SENT_KEYS.push('rd_s_c2a_' + pl, 'rd_s_c2b_' + pl));
  SENT_KEYS.push('rd_s_c2c');
  ['park', 'yard', 'river'].forEach(pl => SENT_KEYS.push('rd_s_c3t1a_' + pl));
  SENT_KEYS.push('rd_s_c3t1b', 'rd_s_c3t1c');
  ['kite', 'hat', 'umbrella', 'book'].forEach(it => SENT_KEYS.push('rd_s_c3t2a_' + it));
  SENT_KEYS.push('rd_s_c3t2b');
  ['park', 'yard', 'river', 'school'].forEach(pl => SENT_KEYS.push('rd_s_c3t2c_' + pl));
  ['park', 'yard', 'river'].forEach(pl => SENT_KEYS.push('rd_s_c3t3a_' + pl));
  SENT_KEYS.push('rd_s_c3t3b', 'rd_s_c3t3c');
  V_PAL_IDS.forEach(p => ['book', 'carrot'].forEach(it => SENT_KEYS.push('rd_s_c4a0_' + p + '_' + it)));
  V_PAL_IDS.forEach(p => SENT_KEYS.push('rd_s_c4a1_' + p));
  SENT_KEYS.push('rd_s_c4a2');
  V_PAL_IDS.forEach(p => SENT_KEYS.push('rd_s_c4b1a_' + p, 'rd_s_c4b1b_' + p));
  SENT_KEYS.push('rd_s_c4b1c');
  ['kite', 'umbrella'].forEach(it => SENT_KEYS.push('rd_s_c4b2a_' + it));
  SENT_KEYS.push('rd_s_c4b2b', 'rd_s_c4b2c');
  V_PAL_IDS.forEach(p => SENT_KEYS.push('rd_s_c4b3a_' + p));
  SENT_KEYS.push('rd_s_c4b3b');
  V_PAL_IDS.forEach(p => ['kite', 'hat'].forEach(it => SENT_KEYS.push('rd_s_c4b4a_' + p + '_' + it)));
  SENT_KEYS.push('rd_s_c4b4b');
  const clipOk = RD_KEYS.every(k => !!KIDS.voice.clips[k]) &&
    SENT_KEYS.length === 174 && SENT_KEYS.every(k => !!KIDS.voice.clips[k]) &&
    Object.keys(KIDS.voice.clips).every(k => k.indexOf('rd_') !== 0 ||
      RD_KEYS.indexOf(k) >= 0 || SENT_KEYS.indexOf(k) >= 0);
  const qLog5 = [], pLog5 = [], sLog5 = [];
  const oq5 = KIDS.voice.queue, op5 = KIDS.voice.play, os5 = KIDS.voice.say;
  KIDS.voice.queue = function (parts) { qLog5.push(parts.slice()); };
  KIDS.voice.play = function (key) { pLog5.push(String(key)); };
  KIDS.voice.say = function (t) { sLog5.push(String(t)); };
  startLevel(0);                                    /* verify 页恒走开场链 */
  const q0v = genLevel(0).quizzes[0];
  const lastQ5 = qLog5[qLog5.length - 1];
  const openChain = !!lastQ5 && lastQ5[0] === 'rd_hint' &&
    lastQ5.slice(1).join() === q0v.askSegs.join();   /* 开场顺序链：hint → 题句段（单通道） */
  replayAsk(true);                                  /* 重听题面=题句段 */
  const askReplay = qLog5.length >= 2 &&
    qLog5[qLog5.length - 1].join() === q0v.askSegs.join();
  sentTap(0);                                       /* 点句跟读=rd_s_ 正文 clip（T46） */
  const sentSay = pLog5[pLog5.length - 1] === q0v.sentKeys[0];
  await hearPassage();                              /* 听读=rd_listen+逐句 rd_s_ clip（T46） */
  const hearOk = pLog5.indexOf('rd_listen') >= 0 &&
    q0v.sentKeys.every(k => pLog5.indexOf(k) >= 0) &&
    sLog5.length === 0 &&                           /* 正文零 TTS keyless（决定性） */
    !passageEl.querySelector('.reading');           /* 朗读完毕高亮复位 */
  KIDS.voice.queue = oq5; KIDS.voice.play = op5; KIDS.voice.say = os5;
  /* 数据 key 覆盖：人物 3 词（rd_w_rabbit/cat/bear）=预合成冗余（主角固定小兔子，
     问句 clip 自带"小兔子"，配角名只入正文 TTS）——记 unused 不计失败 */
  const DATA_KEYS = RD_KEYS.filter(k => k.indexOf('rd_q') !== 0 && ['core_chapter_end',
    'core_day_end', 'core_rest', 'rd_tut_watch', 'rd_tut_turn', 'rd_hint', 'rd_wrong',
    'rd_right', 'rd_listen'].indexOf(k) < 0);
  const unusedWords = DATA_KEYS.filter(k => !usedWords[k] && !usedKeys[k]);
  const wordCov = Object.keys(usedWords).length;
  const coverOk = Object.keys(usedKeys).concat(Object.keys(usedWords))
    .every(k => RD_KEYS.indexOf(k) >= 0 || SENT_KEYS.indexOf(k) >= 0) && wordCov >= 14;   /* 用到的 ⊆ 注入集（41+174）+ 词覆盖 ≥14 */
  const distOk2 = askDist.rd_q3a >= 2 && askDist.rd_q3b >= 2 && askDist.rd_q3c >= 2 &&
    askDist.rd_q4a >= 2 && askDist.rd_q4b >= 2 && askDist.rd_q2 >= 2 && askDist.rd_q2b >= 2;
  const distOk = refVoice && clipOk && openChain && askReplay && sentSay && hearOk &&
    coverOk && distOk2;
  if (distOk) npass++;
  units.dist = { ok: distOk, refVoice: refVoice, clips: clipOk, openChain: openChain,
    askReplay: askReplay, sentSay: sentSay, hearOk: hearOk, coverOk: coverOk,
    wordCov: wordCov, unusedWords: unusedWords, askDist: askDist };

  /* ---- ⑥ UI 冒烟 A：flat0 真实点击通关（首题一错+全对收尾 → 1 miss 2★） ---- */
  total++;
  startLevel(0);
  let smA = true, quizzesA = 0, lastR = null;
  for (let s = 0; s < CH_LEN; s++) {
    const q = RD.quiz;
    if (!q) { smA = false; break; }
    if (s === 0) {
      const wi = [0, 1, 2].find(i => i !== q.answer);
      if (await RD.tapOption(wi) !== 'wrong') { smA = false; break; }
    }
    lastR = await RD.tapOption(q.answer);
    if (lastR !== 'right' && lastR !== 'done') { smA = false; break; }
    quizzesA++;
  }
  const lvA = RD.currentLevel;
  const smokeOkA = smA && quizzesA === CH_LEN && lvA.done && lvA.won && lastR === 'done' &&
    lvA.misses === 1 && engStars(cur) === 2 &&
    !document.querySelector('.k-celebrate');       /* verify 页不弹层（§0.2） */
  if (smokeOkA) npass++;
  smokes.flat0 = { ok: smokeOkA, quizzes: quizzesA, misses: lvA.misses, stars: engStars(cur) };

  /* ---- ⑦ UI 冒烟 B：flat10（ch3 推断）/flat15（ch4 感受）/flat25（生成关）autoSolve 3★ ---- */
  total++;
  const chapOut = {};
  let smB = true;
  for (const f of [10, 15, 25]) {
    startLevel(f);
    const qf = RD.quiz;
    const lvf = RD.currentLevel;
    let domOk = !!qf && (f < STATIC_LEVELS ? lvf.dch === diffOfCh(Math.floor(f / CH_LEN) + 1)
      : (lvf.dch >= 1 && lvf.dch <= 4));                         /* 生成关难度随机 → 范围断言 */
    if (f === 10) domOk = domOk && lvf.dch === 3 && qf.optKeys.every(k => k === null) &&
      !!qf.askKey;                                               /* ch3=推断短句选项（TTS 通道） */
    if (f === 15) domOk = domOk && lvf.dch === 4 && qf.optKeys.every(k => k !== null);   /* ch4=感受词 clip */
    const a = await RD.autoSolve();
    const lv2 = RD.currentLevel;
    const solveOk = a.done && lv2.done && lv2.won && lv2.misses === 0 && engStars(cur) === 3;
    chapOut[f] = { ok: domOk && solveOk, dch: lvf.dch, taps: a.taps };
    if (!domOk || !solveOk) smB = false;
  }
  if (smB) npass++;
  smokes.chapters = { ok: smB, flats: chapOut };

  /* ---- ⑧ 布局：双 viewport ×（flat0/10/15）量测 ---- */
  function simView(w, h, flat) {
    startLevel(flat);
    const g = $id('game');
    g.style.width = w + 'px';
    g.style.height = h + 'px';
    const cards = Array.prototype.map.call(cardsEl.querySelectorAll('.card'), b => b.getBoundingClientRect());
    const sents = Array.prototype.map.call(passageEl.querySelectorAll('.psent'), b => b.getBoundingClientRect());
    const cardOk = cards.length === 3 && cards.every(r => r.width >= 96 && r.height >= 96);   /* 主答案 ≥96（§0.9） */
    const sentOk = sents.length >= 2 && sents.every(r => r.height >= 64 && r.width >= 64);    /* 句跟读行 ≥64 */
    let btnOk = true;                              /* 全部按钮 ≥64（.k-parentbtn 家长按钮豁免） */
    document.querySelectorAll('button').forEach(b => {
      if (b.classList.contains('k-parentbtn')) return;
      const r = b.getBoundingClientRect();
      if (r.width > 4 && r.height > 4 && (r.width < 64 || r.height < 64)) btnOk = false;
    });
    const de = document.documentElement;
    const ox = Math.max(g.scrollWidth - g.clientWidth, de.scrollWidth - de.clientWidth);
    return { vp: w + 'x' + h, flat: flat, cardOk: cardOk, sentOk: sentOk,
      btnOk: btnOk, ox: ox, pass: cardOk && sentOk && btnOk && ox <= 0 };
  }
  total++;
  const sims = [];
  for (const f of [0, 10, 15]) {
    sims.push(simView(1280, 800, f));
    sims.push(simView(800, 1180, f));
  }
  const g0 = $id('game');
  g0.style.width = '';
  g0.style.height = '';
  startLevel(0);                                   /* 还原真实 viewport 布局 */
  const layoutOk = sims.length === 6 && sims.every(s => s.pass);
  if (layoutOk) npass++;
  smokes.layout = { ok: layoutOk, sims: sims };

  /* ---- ⑨ 救援与 §0.7a：错点不重置；救援两件（题句重读+正确卡 breathe §0.21）；
     听读/点句跟读/重听题面=主动学习动作重置 ---- */
  total++;
  const pLog9 = [], qLog9 = [];
  const op9 = KIDS.voice.play, oq9 = KIDS.voice.queue;
  KIDS.voice.play = function (key) { pLog9.push(String(key)); };
  KIDS.voice.queue = function (parts) { qLog9.push(parts.slice()); };
  startLevel(0);
  const q9 = RD.quiz;
  const nQ9AfterOpen = qLog9.length;                                /* 开场链已 queue 一条 */
  lastAct = Date.now() - 13000;
  const wi9 = [0, 1, 2].find(i => i !== q9.answer);
  await RD.tapOption(wi9);
  const noReset = Date.now() - lastAct > 12800;                     /* 错点不重置救援钟 */
  rescueAct(cur.quizzes[cur.step]);                                 /* 行为本体直驱（interval 由无头自测覆盖） */
  const firedOk = RD.rescues === 1 &&
    qLog9.length === nQ9AfterOpen + 1 &&
    qLog9[qLog9.length - 1].join() === q9.askSegs.join() &&         /* 题句重读=新增一次段 queue */
    !!cardsEl.querySelector('.card[data-i="' + q9.answer + '"].breathe');   /* 正确卡 breathe */
  sentTap(0);
  const sentReset = Date.now() - lastAct < 600;                     /* 点句跟读=主动学习重置 */
  lastAct = Date.now() - 13000;
  replayAsk(true);
  const hearReset = Date.now() - lastAct < 600;                     /* 重听题面=主动学习重置 */
  lastAct = Date.now() - 13000;
  await hearPassage();
  const readReset = Date.now() - lastAct < 600;                     /* 听读=主动学习重置（§0.7a 例外） */
  KIDS.voice.play = op9; KIDS.voice.queue = oq9;
  const rescueOk9 = noReset && firedOk && sentReset && hearReset && readReset;
  if (rescueOk9) npass++;
  units.rescue = { ok: rescueOk9, expNoReset: noReset, fired: firedOk,
    sentReset: sentReset, hearReset: hearReset, readReset: readReset };

  const out = { game: 'read', total: total, pass: npass, layoutOk: layoutOk,
    levels: levels, gen: gen, units: units, smokes: smokes, genDch: genDch };
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
