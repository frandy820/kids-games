/* ================= read 纯引擎：确定性出题 + 点选判定（无 DOM，UI 与 verify 共用）
   种子 = mulberry32(flat * 7919 + 13)：同 flat 永远同关（重玩一致、verify 可检）。
   数据模型（SPEC §1）：quiz = { dch, askKey, question(上屏问句), askSegs[](问句 queue 段),
   passage(短文全文), sents[](句数组，渲染/听读/关键句高亮用), keyLine(关键句 idx：答错
   回看指向), options[3](选项显示文本), optKeys[3](选项 clip key；ch3 短句=null 走 TTS
   兜底 §0.31/§0.13), answer(正确选项下标), _miss, solved }。
   §0.31 铁律（生成门）：正确项在文中唯一成立、两干扰项在文中必不成立——
   ch1 干扰=文中出现过的其他颜色（答非所问）/ ch2 干扰=事件中的其他地点（后去的/最后
   回的）/ ch3 干扰=文中直述不构成因果 + 文中未提 / ch4 干扰=文中没有的其他感受词。
   game-verify 另带纯文本级判定器分源复算（不读本层 answer 字段）。 */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffled(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}
/* 进度章号单调递增（与 keyOf/写档一致）；难度章号四章循环取材 */
const chOfFlat = flat => Math.floor(flat / CH_LEN) + 1;
const diffOfCh = ch => (ch - 1) % 4 + 1;
const ri = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1)); // [lo,hi] 闭区间整数
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];

/* ---------- ch1 事实细节：问"小兔子的{X}是什么颜色"（queue 拼 rd_q1+物品词+rd_q1b）
   句 0=小兔子的{X}是{cA}（唯一含"小兔子+{cX}的{X}"的句 → 正确项唯一成立）
   句 1/2=小猫/小熊各持互异物品互异颜色（干扰色来源：文中出现但答非所问）
   sentKeys=T46 正文句 clip 键（voice/task46-enumerate/extract_read.py 命名同源） ---------- */
function genCh1(rnd) {
  const items = shuffled(ITEM_IDS, rnd);          // 3 物品互异（i1=小兔子的）
  const cols = shuffled(COLOR_IDS, rnd);          // 3 颜色互异（cA=答案）
  const pals = shuffled(['cat', 'bear'], rnd);
  const W = WORDS;
  const s0 = '小兔子有一' + QUANT[items[0]] + W[cols[0]].cn + '的' + W[items[0]].cn + '，可喜欢它啦。';
  const s1 = W[pals[0]].cn + VERB[items[1]] + '一' + QUANT[items[1]] + W[cols[1]].cn + '的' + W[items[1]].cn + '，好看极了。';
  const s2 = W[pals[1]].cn + VERB[items[2]] + '一' + QUANT[items[2]] + W[cols[2]].cn + '的' + W[items[2]].cn + '，也很漂亮。';
  return {
    dch: 1, askKey: null,
    askSegs: ['rd_q1', W[items[0]].key, 'rd_q1b'],
    question: '小兔子的' + W[items[0]].cn + '是什么颜色呀？',
    sents: [s0, s1, s2], passage: s0 + s1 + s2,
    sentKeys: ['rd_s_c1s0_' + items[0] + '_' + cols[0],
               'rd_s_c1s1_' + pals[0] + '_' + items[1] + '_' + cols[1],
               'rd_s_c1s2_' + pals[1] + '_' + items[2] + '_' + cols[2]],
    keyLine: 0,
    options: [cols[0], cols[1], cols[2]].map(c => W[c].cn),
    optKeys: [cols[0], cols[1], cols[2]].map(c => W[c].key),
    _optIds: [cols[0], cols[1], cols[2]],          /* 词表 id（渲染 icon 用） */
    _sig: 'c1|' + items.join() + '|' + cols.join()
  };
}

/* ---------- ch2 顺序因果：问"先去了哪里"（rd_q2）/ "然后去了哪里"（rd_q2b）
   句 0=先去{A}（"先去"唯一）；句 1=然后又去{B}（"然后"唯一）；句 2=回到{家里}
   干扰=事件中的其他地点（问先→B+家里；问然后→A+家里） ---------- */
function genCh2(rnd) {
  const two = shuffled(['park', 'river', 'school', 'shop', 'yard'], rnd);  // A,B 非家互异
  const A = two[0], B = two[1];
  const askFirst = rnd() < 0.5;
  const W = WORDS;
  const s0 = '早上，小兔子先去' + W[A].cn + PLACE_ACT[A] + '。';
  const s1 = '玩了一会儿，然后又去' + W[B].cn + PLACE_ACT[B] + '。';
  const s2 = '最后，小兔子回到家里吃点心。';
  const opts = [W[A].cn, W[B].cn, W.home.cn];
  const keys = [W[A].key, W[B].key, W.home.key];
  const ids = [A, B, 'home'];
  const ansIdx = askFirst ? 0 : 1;
  const ent = [opts[ansIdx], opts[1 - ansIdx], opts[2]];   /* [答案, 另一途中地点, 家里] */
  const entK = [keys[ansIdx], keys[1 - ansIdx], keys[2]];
  const entI = [ids[ansIdx], ids[1 - ansIdx], ids[2]];
  return {
    dch: 2, askKey: askFirst ? 'rd_q2' : 'rd_q2b',
    askSegs: [askFirst ? 'rd_q2' : 'rd_q2b'],
    question: askFirst ? '小兔子先去了哪里呀？' : '然后小兔子去了哪里呀？',
    sents: [s0, s1, s2], passage: s0 + s1 + s2,
    sentKeys: ['rd_s_c2a_' + A, 'rd_s_c2b_' + B, 'rd_s_c2c'],
    keyLine: askFirst ? 0 : 1,
    options: ent, optKeys: entK, _optIds: entI,
    _sig: 'c2|' + A + '|' + B + '|' + (askFirst ? 1 : 0)
  };
}

/* ---------- ch3 简单推断：三条固定问句（rd_q3a 天为什么变暗 / rd_q3b 为什么不高兴 /
   rd_q3c 为什么跑回家）。选项=原因短句（4-8 字，无词表 clip → optKey=null，
   tapOption 反馈只走 rd_right；§0.31 正文与原因短句均 TTS 通道豁免 clip）
   干扰 1=文中直述不构成因果（SPEC ch3 干扰定义）+ 干扰 2=文中未提（阅读理解经典
   "文中没说"型）——两者均不含原因关键词 → 在文中必不成立 ---------- */
function genCh3(rnd) {
  const W = WORDS;
  const t = ri(rnd, 1, 3);
  if (t === 1) {                                   /* q3a 乌云遮太阳→天变暗 */
    const pl = pick(rnd, ['park', 'yard', 'river']);
    const s0 = '小兔子和小猫在' + W[pl].cn + '放风筝，玩得正开心。';
    const s1 = '天上飘来一大片乌云，把太阳遮住了。';
    const s2 = '天一下子变暗了，快要下雨啦。';
    return finish(3, 'rd_q3a', '天为什么会变暗呀？', [s0, s1, s2], 1,
      ['乌云把太阳遮住了', '小兔子和小猫在一起玩', '小兔子闭上眼睛啦'],
      ['rd_s_c3t1a_' + pl, 'rd_s_c3t1b', 'rd_s_c3t1c'], 'c3a|' + pl);
  }
  if (t === 2) {                                   /* q3b 物品够不着→不高兴 */
    const it = pick(rnd, ['kite', 'hat', 'umbrella', 'book']);   /* 能被风吹上树的轻物 */
    const pl = pick(rnd, ['park', 'yard', 'river', 'school']);
    const s0 = '小兔子心爱的' + W[it].cn + '被大风吹到了高高的树上。';
    const s1 = '它跳了好多次，都够不着。';
    const s2 = '小兔子很不高兴，坐在' + W[pl].cn + '的草地上。';
    return finish(3, 'rd_q3b', '小兔子为什么不高兴呀？', [s0, s1, s2], 0,
      [W[it].cn + '够不着了', '它坐在草地上', W[it].cn + '找回来了'],
      ['rd_s_c3t2a_' + it, 'rd_s_c3t2b', 'rd_s_c3t2c_' + pl], 'c3b|' + it + '|' + pl);
  }
  const pl = pick(rnd, ['park', 'yard', 'river']);   /* q3c 要下雨→跑回家 */
  const s0 = '小兔子在' + W[pl].cn + '玩，玩得真开心。';
  const s1 = '天上的乌云越来越多，快要下雨啦。';
  const s2 = '小兔子赶快跑回家躲雨去。';
  return finish(3, 'rd_q3c', '小兔子为什么跑回家呀？', [s0, s1, s2], 1,
    ['快要下雨了', '小兔子玩得很开心', '太阳晒得眼睛疼'],
    ['rd_s_c3t3a_' + pl, 'rd_s_c3t3b', 'rd_s_c3t3c'], 'c3c|' + pl);
}
function finish(dch, askKey, question, sents, keyLine, options, sentKeys, sig) {
  return {
    dch: dch, askKey: askKey, askSegs: [askKey], question: question,
    sents: sents, passage: sents.join(''), sentKeys: sentKeys, keyLine: keyLine,
    options: options.slice(), optKeys: options.map(() => null),   /* ch3 短句无 clip → TTS */
    _optIds: null, _sig: sig
  };
}

/* ---------- ch4 人物感受：q4a"为什么笑了"（答案恒=开心，笑=帮人/分享的快乐）/
   q4b"心里是怎么想的"（4 情节各配 1 感受）。全文感受词唯一（verify 独立复断言），
   干扰=文中没有的另两感受词（感受词族天然相近 §0.17） ---------- */
function genCh4(rnd) {
  const W = WORDS;
  const pals = shuffled(['cat', 'bear'], rnd);
  const p0 = W[pals[0]].cn;
  let feel, sents, decoyIds, sig, sentKeys;
  if (rnd() < 0.5) {                               /* q4a 笑了 → 开心（答案恒 happy） */
    feel = 'happy';
    const it = pick(rnd, ['book', 'carrot']);
    sents = [p0 + '手里的' + W[it].cn + '掉到了地上，小兔子帮忙捡了起来。',
      p0 + '高兴地说：谢谢你！',
      '小兔子笑了，心里' + W.happy.cn + '极了。'];
    decoyIds = shuffled(['sad', 'angry', 'worried'], rnd).slice(0, 2);
    return mkCh4('rd_q4a', '小兔子为什么笑了呀？', sents, feel, decoyIds,
      ['rd_s_c4a0_' + pals[0] + '_' + it, 'rd_s_c4a1_' + pals[0], 'rd_s_c4a2'],
      'c4a|' + it + '|' + pals.join());
  }
  const t = ri(rnd, 1, 4);                         /* q4b 心里怎么想 → 各情节配感受 */
  if (t === 1) {
    feel = 'worried';
    sents = ['放学啦，小兔子在操场等' + p0 + '一起回家。', '等了好久' + p0 + '都没有来。',
      '小兔子心里' + W.worried.cn + '极了，要不要去找老师呢。'];
    sentKeys = ['rd_s_c4b1a_' + pals[0], 'rd_s_c4b1b_' + pals[0], 'rd_s_c4b1c'];
    decoyIds = ['sad', 'happy'];
    sig = 'c4b1|' + pals.join();
  } else if (t === 2) {
    feel = 'sad';
    const it = pick(rnd, ['kite', 'umbrella']);
    sents = ['小兔子心爱的' + W[it].cn + '坏了，再也不能玩了。', '它低着头坐在公园的草地上。',
      '小兔子心里' + W.sad.cn + '极了，眼睛都湿了。'];
    sentKeys = ['rd_s_c4b2a_' + it, 'rd_s_c4b2b', 'rd_s_c4b2c'];
    decoyIds = ['worried', 'angry'];
    sig = 'c4b2|' + it;
  } else if (t === 3) {
    feel = 'happy';
    sents = [p0 + '送了小兔子一本崭新的' + W.book.cn + '，这正是它最想要的礼物。',
      '小兔子心里' + W.happy.cn + '极了，抱着' + W.book.cn + '蹦蹦跳。'];
    sentKeys = ['rd_s_c4b3a_' + pals[0], 'rd_s_c4b3b'];
    decoyIds = ['angry', 'worried'];
    sig = 'c4b3|' + pals.join();
  } else {
    feel = 'angry';
    const it = pick(rnd, ['kite', 'hat']);
    sents = [p0 + '不小心把小兔子的' + W[it].cn + '弄坏了，马上说了对不起。',
      '可是小兔子心里还是' + W.angry.cn + '极了，嘴巴翘得高高的。'];
    sentKeys = ['rd_s_c4b4a_' + pals[0] + '_' + it, 'rd_s_c4b4b'];
    decoyIds = ['sad', 'happy'];
    sig = 'c4b4|' + it;
  }
  return mkCh4('rd_q4b', '小兔子心里是怎么想的呀？', sents, feel, decoyIds, sentKeys, sig);
}
/* ch4 统一组装（选项=感受词 clip 化；_optIds 供渲染 icon） */
function mkCh4(askKey, question, sents, feel, decoyIds, sentKeys, sig) {
  const W = WORDS;
  const ids = [feel, decoyIds[0], decoyIds[1]];
  return {
    dch: 4, askKey: askKey, askSegs: [askKey], question: question,
    sents: sents, passage: sents.join(''), sentKeys: sentKeys, keyLine: sents.length - 1,
    options: ids.map(i => W[i].cn), optKeys: ids.map(i => W[i].key),
    _optIds: ids, _sig: sig
  };
}

/* ---------- 单题生成（章配方 + 同关互异重生成循环）
   出题后按模板确定性摆位（ch1 答案恒在 0 位等）→ shuffle 摆位并跟踪 answer 下标 */
function genQuiz(rnd, dch, usedSigs) {
  for (let att = 0; att < 500; att++) {
    let q;
    if (dch === 1) q = genCh1(rnd);
    else if (dch === 2) q = genCh2(rnd);
    else if (dch === 3) q = genCh3(rnd);
    else q = genCh4(rnd);
    if (usedSigs && usedSigs.indexOf(q._sig) >= 0) continue;   /* 同关 5 题互异（SPEC §1） */
    /* 摆位 shuffle：跟踪正确项下标（answer 由此产生；verify 分源对账） */
    const order = shuffled([0, 1, 2], rnd);
    const opts = order.map(i => q.options[i]);
    const keys = order.map(i => q.optKeys[i]);
    const ids = q._optIds ? order.map(i => q._optIds[i]) : null;
    const answer = order.indexOf(0);               /* 生成序 0 位=正确项 */
    q.options = opts; q.optKeys = keys; q._optIds = ids; q.answer = answer;
    q._miss = 0; q.solved = false;
    return q;
  }
  return null;   /* 理论不可达（各章参数空间 >> 5） */
}

/* ---------- 关卡生成（静态 20 关与生成关同一确定性通道） ---------- */
function genLevel(flat) {
  flat = Math.max(0, flat | 0);
  const ch = chOfFlat(flat), lv = flat % CH_LEN;
  const rnd = mulberry32(flat * 7919 + 13);
  const dch = flat < STATIC_LEVELS ? diffOfCh(ch) : ri(rnd, 1, 4);   // §0.3 生成关难度随机
  const quizzes = [];
  const used = [];
  for (let qi = 0; qi < CH_LEN; qi++) {
    const q = genQuiz(rnd, dch, used);
    used.push(q._sig);
    quizzes.push(q);
  }
  return { flat: flat, ch: ch, dch: dch, lv: lv, quizzes: quizzes, step: 0, misses: 0, done: false };
}

/* ---------- 点选选项卡引擎（无 DOM）
   'right' 答对推进（非末题）/ 'done' 通关 / 'wrong' 答错（miss+1，零惩罚可重点）/
   false 非法（越界/已解/关卡结束） ---------- */
function engTapOption(L, i) {
  if (!L || L.done || L.step >= L.quizzes.length) return false;
  const q = L.quizzes[L.step];
  if (!q || q.solved || i < 0 || i >= q.options.length) return false;
  if (i === q.answer) {
    q.solved = true;
    L.step++;
    if (L.step >= L.quizzes.length) L.done = true;
    return L.done ? 'done' : 'right';
  }
  q._miss++;
  L.misses++;
  return 'wrong';
}
const engWon = L => !!L && L.done;
/* 星级：关 miss（错点）0=3 星 / 1-2=2 星 / 更多=1 星。永不 0 星 */
const engStars = L => L.misses === 0 ? 3 : (L.misses <= 2 ? 2 : 1);

/* ---------- 结构校验（引擎侧自检；verify 侧另有纯文本级判定器分源 §0.31）
   短文长度 40-80 字（含标点）/ 问句=段 clip 文本拼接（去？）/ 问句封闭 9 段 /
   选项互异 / ch1 三色互异且都在文中 / ch2 三地点互异且都在文中+"先去""然后"各一次 /
   ch3 关键词在场（乌云/变暗/不高兴/够不着/下雨/跑回家）/ ch4 感受词全文唯一且=正确项 /
   keyLine 句含正确项核心词 ---------- */
function structOk(q, dch) {
  if (!q || !q.sents || !q.options || q.options.length !== 3) return false;
  const len = q.passage.length;
  if (len < 40 || len > 80) return false;
  const SEG_TXT = {
    rd_q1: '小兔子的', rd_q1b: '是什么颜色呀', rd_q2: '小兔子先去了哪里呀',
    rd_q2b: '然后小兔子去了哪里呀', rd_q3a: '天为什么会变暗呀', rd_q3b: '小兔子为什么不高兴呀',
    rd_q3c: '小兔子为什么跑回家呀', rd_q4a: '小兔子为什么笑了呀', rd_q4b: '小兔子心里是怎么想的呀'
  };
  Object.keys(WORDS).forEach(k => { SEG_TXT[WORDS[k].key] = WORDS[k].cn; });   /* ch1 题句含物品词段 */
  if (q.question !== q.askSegs.map(k => SEG_TXT[k]).join('') + '？') return false;
  if (new Set(q.options).size !== 3) return false;
  if (q.answer < 0 || q.answer > 2 || q.options[q.answer] == null) return false;
  const W = WORDS;
  if (dch === 1) {
    const cs = q.options.map(o => COLOR_IDS.find(c => W[c].cn === o));
    if (cs.some(c => !c) || new Set(cs).size !== 3) return false;
    if (!cs.every(c => q.passage.indexOf(W[c].cn) >= 0)) return false;          /* 干扰色都在文中 */
    if (!q.sents[0].includes(W[cs[q.answer]].cn + '的') ||
      q.sents[0].indexOf('小兔子') < 0) return false;                            /* 答案色在关键句 */
  } else if (dch === 2) {
    const ps = q.options.map(o => PLACE_IDS.find(p => W[p].cn === o));
    if (ps.some(p => !p) || new Set(ps).size !== 3) return false;
    if (!ps.every(p => q.passage.indexOf(W[p].cn) >= 0)) return false;
    if (q.passage.indexOf('先去') < 0 || q.passage.indexOf('然后') < 0) return false;
    if (q.passage.split('然后').length !== 2) return false;                      /* "然后"恰一次 */
  } else if (dch === 3) {
    if (q.optKeys.some(k => k !== null)) return false;                           /* ch3 全 TTS */
    if (q.askKey === 'rd_q3a' && !(q.passage.includes('乌云') && q.passage.includes('变暗'))) return false;
    if (q.askKey === 'rd_q3b' && !(q.passage.includes('不高兴') && q.passage.includes('够不着'))) return false;
    if (q.askKey === 'rd_q3c' && !(q.passage.includes('下雨') && q.passage.includes('跑回家'))) return false;
  } else {
    const f = FEEL_IDS.find(k => W[k].cn === q.options[q.answer]);
    if (!f) return false;
    if (q.passage.indexOf(q.options[q.answer]) < 0) return false;                /* 正确感受词在文中 */
    const inPass = FEEL_IDS.filter(k => q.passage.indexOf(W[k].cn) >= 0);
    if (inPass.length !== 1 || inPass[0] !== f) return false;                    /* 感受词全文唯一 */
    if (!q.options.every((o, i) => i === q.answer || q.passage.indexOf(o) < 0)) return false;  /* 干扰不在文中 */
    if (!q.optKeys.every(k => typeof k === 'string' && k.indexOf('rd_w_') === 0)) return false; /* 感受词 clip 化 */
  }
  if (q.keyLine < 0 || q.keyLine >= q.sents.length) return false;
  return q.sents.join('') === q.passage;
}
