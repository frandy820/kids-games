/* ================= coin 主逻辑（题面渲染 / 卡点选 / 钱币放大跳+兔子示范 / 教学 / 救援 / 推进）
   r38 七题型（SPEC-R38-COIN）：coin/bill 认面额 / rev 反向认币（文字牌→钱币图卡）/ sameval
   同值 / combo 数钱（2-4 枚开放）/ chg 找零（物品+价签+付出的纸币）/ min 最少几枚。
   点对 = 钱币/字牌放大跳 + 小兔子滑入示范 + 确认句（单键 play 或段链 queue——confirmPartsOf）；
   点错 = 该卡摇头 + queue 链 [coi_wrong, 引导键]（guideFor/guideKeyFor 按题面与所点项给线索）。
   语音窗（家族 G/H/I；在册实长 r38-clip-ms-baseline.json 30 条全测）：
   coi_tut_watch 2976 → 教学演示 tap 延至 3900（≥2976+300）；coi_tut_turn 1752 → 延 2200；
   coi_right 2472 → celebrate 3020 ≥2772；coi_wrong 2568 + 引导（最长 coi_g_silver 4104，
   estMs(15)=5775 上界）→ 拼播链 ≤2568+150+5775+300=8793 ≤ wrongChainUntil 9200；
   确认链全部 ≤5100（estMs 段级上界：[v_gt,v_y,v_j]=1635+1290+1290+300=4515 最长；
   整句确认实长最长 coi_cf_sv_1/2 3408+300——遗留 coi_cf_c_c_yj_j 3192 次之，r38 M7 勘正）→ 判对演出窗 1800+3600=5400 不变；
   新题型读题段链（chg 3 段/min 3-4 段/combo 3-5 段）不锁输入，救援 14s 节流自然不撞头。
   §R6 新键未注册期：queue 缺 clip=整句静默放弃（core 语义），键序仍进 __lastQueue 断言。
   验收钩子：window.CO = { get currentLevel, get quiz(){kind, face, coins?, item?, target?,
   opts[]{id,text}, answer, step, miss}, tapOpt(i), start(flat), async autoSolve() }
   tapOpt 返回：对='right' / 错='wrong' / locked·演出窗=false / 越界·已答=null+pop+bump；
   教学演示结果 window.__coDemoR */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（家族 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); }
};

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（七题型统一走 quizPartsOf 段链构造；单段=play 多段=queue） ================= */
function speakQuiz() {
  if (!cur || !cur.quizzes[cur.step]) return;
  const parts = quizPartsOf(cur.quizzes[cur.step]);
  if (parts.length === 1) KIDS.voice.play(parts[0].key, parts[0].text);
  else KIDS.voice.queue(parts);
}

/* ================= 渲染 ================= */
/* 题面 HTML：coin/bill=1 枚大图 / combo=2-4 枚并排（枚数多则缩小）/ rev·min=面额大字牌 /
   chg=物品+价签+付出的纸币 */
function faceHtml(q) {
  if (q.kind === 'combo') {
    const w = q.coins.length <= 2 ? 100 : (q.coins.length === 3 ? 88 : 78);
    return '<div class="combo-wrap">' +
      q.coins.map(c => '<span class="cm-coin">' + moneySvg(c, w) + '</span>').join('') +
      '</div>';
  }
  if (q.kind === 'rev') {
    return '<div class="tag-card">' + MONEY[q.face].text + '</div>';
  }
  if (q.kind === 'min') {
    return '<div class="tag-card">' + sumText(q.target) + '</div>';
  }
  if (q.kind === 'chg') {
    const it = ITEMS[q.item];
    return '<div class="chg-wrap"><span class="chg-item">' + ITEM_SVG[q.item] +
      '<span class="price-tag">' + sumText(it.price) + '</span></span>' +
      '<span class="chg-pay">' + moneySvg(it.pay, 150) + '</span></div>';
  }
  return '<div class="money-slot">' + (MONEY[q.face].kind === 'coin'
    ? moneySvg(q.face, 130) : moneySvg(q.face, 170)) + '</div>';
}
/* 题面句文字条（rev=动态「哪个是X硬币？」） */
const quizLineOf = q => q.kind === 'rev'
  ? '哪个是' + MONEY[q.face].n + '？' : QUIZ_TEXT[q.kind];
function renderScene(q) {                        // 题面：钱桌 + 钱币/字牌/物品 + 题面句文字条
  sceneEl.dataset.kind = q.kind;
  sceneEl.dataset.face = q.face;
  const name = q.kind === 'combo' ? q.coins.length + '枚硬币'
    : q.kind === 'chg' ? ITEMS[q.item].cn
    : q.kind === 'min' ? sumText(q.target)
    : MONEY[q.face].n;
  sceneEl.setAttribute('aria-label', name + '，点我再听一遍');
  sceneEl.innerHTML = tableSvg() + faceHtml(q) +
    '<div class="q-text">' + quizLineOf(q) + '</div>';
}
function renderBoard(q) {                        // 卡排：文字卡 / 钱币小图卡（sameval 带标签·rev 去标签）
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const money = q.kind === 'sameval' || q.kind === 'rev';
    const b = document.createElement('button');
    b.className = 'card pop' + (money ? ' m-card' : ' t-card') +
                  (q.kind === 'rev' ? ' bare' : '') +
                  (o.text.length >= 3 && !money ? ' t-long' : '');
    b.dataset.i = i;
    b.dataset.oid = o.id;                        // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', o.text + '卡');
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = money
      ? '<span class="gwrap">' + moneySvg(o.id, 82) + '</span>' +
        (q.kind === 'rev' ? '' : '<span class="m-label">' + o.text + '</span>')
      : '<span class="t-label">' + o.text + '</span>';
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();  /* 开场/换题读题；demo 门防演示收尾叠播 */
}
function renderStep() {                          // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                          // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 答对演出：钱币/字牌/物品区放大跳 + 小兔子滑入示范（确认句由 uiTapOpt 播）
   verify 页跳飞行直接落定 ---------- */
function celebrateMoney(run) {
  const slot = sceneEl.querySelector('.money-slot, .combo-wrap, .tag-card, .chg-wrap');
  if (slot) replayAnim(slot, 'jump');
  if (!sceneEl.querySelector('.demo-pet')) {
    const pet = document.createElement('div');
    pet.className = 'demo-pet';
    pet.innerHTML = KIDS.assets.rabbit('happy', 58);   /* 小兔子开心示范 */
    sceneEl.appendChild(pet);
  }
  hopRabbit();
}

/* ================= 错反馈引导句（按题面+所点项线索——GUIDE 表键序，r38 扩 rev/chg/min 三族）
   silver：银白近对错（coin 题面 jiao1↔'1元' / sameval 题 yuan1 点 jiao1 / rev 题 yuan1 点 jiao1 图）
   unit：数字同 1 角元近对错（coin 题 yuan1p 点'1角' / sameval·rev 题 yuan1p 侧点 jiao1）
   color：金色五角相关错 / num：纸币题面点错非近对 / def：认面额兜底
   kind：rev 题点了纸币（要找圆圆的硬币——同值异类陷阱的教学点）
   comboHi·comboLo：combo·chg 所点值大小方向 / minHi·minLo：枚数方向（点多了/点少了）
   seek：sameval 点非近对干扰 */
function guideFor(q, picked) {
  const pt = picked.text, pid = picked.id;
  if (q.kind === 'combo' || q.kind === 'chg') {
    const tv = textJiao(q.opts[q.answer].text), pv = textJiao(pt);
    return pv > tv ? GUIDE.comboHi : GUIDE.comboLo;
  }
  if (q.kind === 'min') {
    const pv = parseInt(pt, 10), tv = greedyOf(q.target);
    return pv > tv ? GUIDE.minHi : GUIDE.minLo;
  }
  if (q.kind === 'sameval') {
    if (pid === 'jiao1') return q.face === 'yuan1' ? GUIDE.silver : GUIDE.unit;
    return GUIDE.seek;
  }
  if (q.kind === 'rev') {
    if (pid === 'yuan1p') return GUIDE.kind;               /* 点了纸币——硬币纸币类辨析 */
    if (pid === 'jiao1') return q.face === 'yuan1' ? GUIDE.silver : GUIDE.color;
    if (pid === 'jiao5') return GUIDE.color;
    return GUIDE.def;                                       /* q.face==='yuan1' 点 jiao1 已上行 */
  }
  /* coin/bill 认面额 */
  const f = q.face;
  if ((f === 'jiao1' && pt === '1元') || (f === 'yuan1' && pt === '1角')) return GUIDE.silver;
  if (f === 'yuan1p' && pt === '1角') return GUIDE.unit;
  if (f === 'jiao5' && (pt === '1角' || pt === '1元')) return GUIDE.color;
  if ((f === 'jiao1' || f === 'yuan1') && pt === '5角') return GUIDE.color;
  return MONEY[f].kind === 'bill' ? GUIDE.num : GUIDE.def;
}
/* guideFor 同构键版（键轨：在册 coi_g_* 8 + §R6 新 3 键，分区与文案表一一对应） */
const guideKeyFor = (q, picked) => {
  const pt = picked.text, pid = picked.id;
  if (q.kind === 'combo' || q.kind === 'chg')
    return textJiao(pt) > textJiao(q.opts[q.answer].text) ? 'coi_g_combohi' : 'coi_g_combolo';
  if (q.kind === 'min')
    return parseInt(pt, 10) > greedyOf(q.target) ? 'coi_g_minhi' : 'coi_g_minlo';
  if (q.kind === 'sameval') {
    if (pid === 'jiao1') return q.face === 'yuan1' ? 'coi_g_silver' : 'coi_g_unit';
    return 'coi_g_seek';
  }
  if (q.kind === 'rev') {
    if (pid === 'yuan1p') return 'coi_g_kind';
    if (pid === 'jiao1') return q.face === 'yuan1' ? 'coi_g_silver' : 'coi_g_color';
    if (pid === 'jiao5') return 'coi_g_color';
    return 'coi_g_def';
  }
  const f = q.face;
  if ((f === 'jiao1' && pt === '1元') || (f === 'yuan1' && pt === '1角')) return 'coi_g_silver';
  if (f === 'yuan1p' && pt === '1角') return 'coi_g_unit';
  if (f === 'jiao5' && (pt === '1角' || pt === '1元')) return 'coi_g_color';
  if ((f === 'jiao1' || f === 'yuan1') && pt === '5角') return 'coi_g_color';
  return MONEY[f].kind === 'bill' ? 'coi_g_num' : 'coi_g_def';
};

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：当前题正确卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点卡主路径（真实点击 / CO.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错点 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+coi_wrong+按所点项线索的引导句 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sayW([VOICE.wrong.key, { key: guideKeyFor(q, q.opts[i]), text: guideFor(q, q.opts[i]) }]);  /* T46 阶段2：引导句 clip 化（coi_g_*，链尾段） */
    wrongChainUntil = Date.now() + 9200;         /* 链豁免：2568+150+estMs(16字符=6120)+300=9138（契约 I；m1 口径=全字符 n×345+600） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：钱币放大跳+兔子示范+确认句 TTS） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateMoney(run);          /* 钱币/字牌放大跳 + 小兔子滑入示范 */
  const cf = confirmPartsOf(q);                  /* 确认句：单键 play / 段链 queue（r38 七题型统一构造） */
  if (cf.length === 1) KIDS.voice.play(cf[0].key, cf[0].text);
  else KIDS.voice.queue(cf);
  await wait(1800 * SPEED);                      /* 钱币跳+卡亮+确认句主窗 */
  if (cur !== run) return r;
  await wait(3600 * SPEED);                      /* 确认句收尾窗：总 5400 ≥ 最长确认链 4515+300（estMs 段级
                                                    上界 [v_gt,v_y,v_j]；在册实长最长 coi_cf_sv_1 3408——
                                                    r38-clip-ms-baseline.json 双核）；错→对路径读题延防错链掐 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（钱币/卡全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致，禁 (ci+1)%4） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* coi_right：认对啦，真能干（2472ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2472+300（coi_right 判对后窗 ≥2772） */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null)（b25 形态定版） */
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                             // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);                // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.coin && sv.coin.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面 */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示认对一元硬币（flat0 题0 恒 yuan1——确定性锚点，钱币放大跳+兔子滑入）
   →帮=指向正确文字卡；独=首次选对放手（watch 全程 ≤16s）
   时序（家族 G/H）：watch clip 2976ms → 演示 tap 延至 t=900+3000=3900（≥2976+300=3276），
   确认句 TTS 不与 watch 撞头；演示演出窗 5400 罩确认句 TTS 再收束 turn ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* coi_tut_watch：看！这是多少钱（2976ms） */
  await wait(900 * SPEED);                       /* 钱桌+钱币亮相 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 yuan1（→'1元'）
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));
  await wait(3000 * SPEED);                      /* t=3900 ≥ watch 2976+300=3276：clip 播完再演示（不撞头） */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__coDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);                       /* 收尾（确认句 TTS 仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.coin = sv.coin || {};
  sv.coin.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来认一认"在重发后的题面上说（照 batch5-26） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* coi_tut_turn：你来认一认（1752ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2200);                                      /* ≥1752+300 防尾截（turn 后读题延） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：看看上面的数字 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：题面重读 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapOpt(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+题面卡 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确卡 breathe）/ 教学"帮"5s 重演示 */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却每 14-18s 重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = correctIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+题面卡 pulse（不动 lastAct） */
    speakQuiz();
    replayAnim(sceneEl, 'pulse');
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'coin', title: '硬币认钱' });   // 存档键 kidsgame_coin（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.CO = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                              /* SPEC-R38 §R2 钩子契约：七题型族 */
             face: q.face,                              /* 钱币 id / 组合 id 或 'k角值串' / 物品 id / 'm'+角值 */
             coins: q.coins || null,                    /* combo：钱币 id 数组（展示序大→小） */
             item: q.item || null,                      /* chg：物品 id */
             target: q.target || null,                  /* min：目标角值 */
             opts: q.opts.map(o => ({ id: o.id, text: o.text })),   /* {id,text}（文字卡/钱币卡） */
             answer: q.answer,                          /* 正确卡下标 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选卡，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;
      const r = await uiTapOpt(i);
      if (r === false || r === null) break;      // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
