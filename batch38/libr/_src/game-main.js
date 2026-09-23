/* ================= libr 主逻辑（当前卡/挑书盘+书架 → 点格/点卡归档 → 书立起/卡弹回）
   R48 难度批（AUDIT-67 段序 38）：ch1 起恒四格；维度句去泄漏（lb_d2_* 新键
   段一只设计不注册——未注册期 core.voice.play 落空=静默+hint-line 文字承载，
   r37/r44 先例）；ch4 跨维二级题 pick（三卡盘=答案卡+两张他维干扰卡，点干扰
   卡=wrong 弹回——干扰卡无词键不播词，基线「无键不点」规则保持）。
   开题演出（presentQuiz）：题面出场+提示句 clip 播报（KIDS.voice.play
   lb_hint/lb_d2_* 与 lb_pick_*，落空静默+文字承载；
   窗=estMs(句长)+300+出场 400，动态按句长——家族 T：普通句 6 字 3370/
   维度句 5-8 字 3025-4060/pick 句 9 字 4405）。演出锁=真时钟 state.showUntil
   （Date.now() 比较，tapShelf/tapCard 演出期返 null——测试驱动须轮询等）。
   归对（sort=点正确格 / pick=点正确卡飞入目标格）=书立起动画（目标格 .bk
   书脊入列——格内已归卡可视化堆叠，进度可见）+确认链 [lb_right]（单 clip 窗
   CELE_WIN 1836=1536+300 精确——家族 H；书立起窗 SHELVE_MS 1000 前置，合计
   演出锁 2836）。
   归错=卡弹回（BOUNCE_MS 1100 ≤ wrong 1728+150=1878——b37 R3 首错演出锁禁
   覆盖豁免窗，留「对选放行」活跃段）+错链 [lb_wrong, lb_hint]（豁免窗 4170
   =1728+150+1992+300 真时钟，契约 I）+方向级反馈=错链播毕重读题面句（say
   提示句——不亮答案本体，维度卡须靠标准推理/pick 须跨维辨别）+首错容器
   wiggle（方向级不指答案）/ miss≥2 答案体 breathe（sort=正确格/pick=正确卡）。
   救援：14s 方向级=重播提示句+提示牌重亮（lastDir 独立节流锚，不重置
   lastAct——契约 B）/ 30s 答案级=答案体 breathe+重播；错链豁免窗让路（契约 I）。
   验收钩子：window.LB = { get currentLevel, get quiz{kind,card,label,shelf,hint,
   answer,step,miss,say,target,cards}, tapShelf(i), tapCard(i), start(flat),
   autoSolve(), get tutorial }——真实页同暴露（b29 坑⑥）。
   tapShelf（sort）/tapCard（pick）返回：正确非末题 'shelved' / 正确末题
   'done' / 错 'wrong' / 豁免窗内错吞 false / 演出期 null（真时钟锁）/
   越界·已答·题型不匹配·无题 null。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* b25 定版 estMs（data 内同源定义——此处供窗断言与教学分账引用一致） */
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip；
   b36 m3 教训：教学迷你关 flat=-1 每错必播——条件写 cur.flat < 3） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }   /* 教学迷你关 flat=-1 每错必播（契约 J flat≥3 才节流） */
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), cardBigEl = $id('card-big'), hintEl = $id('hint-line'),
      qTextEl = $id('q-text'), shelfEl = $id('shelf'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      hearBtn = $id('btn-hear'), ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastHearAt = 0;                             // 重听提示句 3s 节流锚
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重演中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）
let hintResayTimer = 0;                         // 方向级反馈延时句（错链播毕重读维度提示——SPEC §2）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const shelfSlotAt = i => shelfEl.querySelector('.shelf-slot[data-i="' + i + '"]');
const trayCardAt = i => cardBigEl.querySelector('.tray-card[data-i="' + i + '"]');
/* 答案体定位（救援/答案级 breathe 共用）：sort=正确格 / pick=正确卡 */
const answerElOf = q => q && q.kind === 'pick' ? trayCardAt(q.answer) : shelfSlotAt(q.answer);

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  qTextEl.textContent = Q_TEXT;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：归对=双音上行 / 归错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(523.25, 0.12, 0, 0.3); };

/* ================= 渲染 ================= */
/* 书立起可视化（契约 M 演出层锚）：格内 .bk 书脊列——renderQuiz 从本关已答题
   推导重放（格内已归卡堆叠=进度可见）；归对即时增量=addBookTo（book-in 弹立） */
function renderQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const shelved = cur.quizzes.filter(x => x._answered);
  /* 题面区（R48 双形态）：sort=当前卡大图（图形为主+名称小字）；pick=三卡跨维
     挑书盘（答案卡+两张他维干扰卡——盘序 seeded，data-i=盘内下标点选语义） */
  cardBigEl.classList.remove('fly', 'back');
  if (q.kind === 'pick') {
    cardBigEl.classList.add('tray');
    cardBigEl.innerHTML = q.cards.map((c, i) =>
      '<button class="tray-card pop" data-i="' + i + '" style="animation-delay:' + (i * 90) + 'ms" aria-label="' + CARDS[c].label + '">' +
      cardSvg(c) + '<b>' + CARDS[c].label + '</b></button>').join('');
    $id('card-name').textContent = '';
  } else {
    cardBigEl.classList.remove('tray');
    cardBigEl.innerHTML = cardSvg(q.card);
    $id('card-name').textContent = q.label;
  }
  hintEl.textContent = q.say;                   // 提示句真值（题面 TTS 同源——双通道）
  sceneEl.dataset.scene = q.row;                // 帧内容锚（verify 断言渲染即引擎）
  /* 书架：每格主题标签牌（小图标+主题名+主题色底）+格内已归书堆叠；
     pick 题目标格 .target 恒亮脉冲（目标格=题面已知量非答案泄漏——答案是卡） */
  shelfEl.innerHTML = '';
  shelfEl.dataset.n = q.shelf.length;
  for (let i = 0; i < q.shelf.length; i++) {
    const t = themeOf(q.shelf[i]);
    const s = document.createElement('button');
    s.className = 'shelf-slot pop';
    if (q.kind === 'pick' && q.shelf[i] === q.target) s.classList.add('target');
    s.dataset.i = i;                            // 格下标（点选语义）
    s.style.animationDelay = (i * 90) + 'ms';
    s.style.setProperty('--tcol', t.col);
    s.setAttribute('aria-label', t.name + '书格');
    s.innerHTML =
      '<span class="slot-tag">' + tagSvg(t.id) + '<b>' + t.name + '</b></span>' +
      '<span class="slot-books">' + shelved.filter(x => x.theme === t.id).map(() =>
        '<span class="bk" style="background:' + t.col + '"><i></i></span>').join('') + '</span>';
    shelfEl.appendChild(s);
  }
  renderStep();
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

/* ================= 开题演出：渲染 → 题面提示句 say（keyless TTS）→ 开放点选
   演出锁=真时钟 showUntil（tapShelf 演出期返 null）================= */
async function presentQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  clearTimeout(hintResayTimer);                  // 新题开题：中止在途维度提示重读
  renderQuiz();
  const run = cur, token = ++showRun;
  const win = ENTER_MS + estMs(q.say) + 300;     // 出场 400 与题面 TTS 并行，窗=estMs+300（家族 T）
  state.locked = true;
  state.showUntil = Date.now() + win * SPEED + 140;      // 真时钟演出锁（余量）
  KIDS.voice.play(q.sayKey, q.say);             /* 题面提示句 clip（lb_hint/lb_d2_*·lb_pick_*
                                                   全在册（段二注册 16 clips，r48-fix m4 注释销账） */
  replayAnim(cardBigEl, 'in');                  /* 当前卡出场重演（弹入） */
  await wait(win * SPEED);
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                          /* 演出完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* 书立起：目标格新增书脊（.bk.book-in 弹立动画——契约 M 演出层 DOM 锚） */
function addBookTo(slot, q) {
  if (!slot) return;
  const t = themeOf(q.theme);
  const b = document.createElement('span');
  b.className = 'bk book-in';
  b.style.background = t.col;
  b.innerHTML = '<i></i>';
  const tray = slot.querySelector('.slot-books');
  if (tray) tray.appendChild(b);
}

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
/* 教学"帮"阶段指向：当前题正确格（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(shelfSlotAt(i));
}

/* ================= 点格主路径（真实点击 / LB.tapShelf / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（书架容器 bump 微动效——家族 D）；
   演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行）========== */
async function uiTapShelf(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(shelfEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(shelfEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.shelf.length) { sfx('pop'); replayAnim(shelfEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径：错链豁免窗（真时钟）内错格点吞——pop+bump 不计 miss；
     正确格放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(shelfEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapShelf(cur, i);
  if (r === null) { sfx('pop'); replayAnim(shelfEl, 'bump'); return null; }
  const el = shelfSlotAt(i);

  if (r === 'wrong') {                           /* 错格：卡弹回+错链两段+方向级反馈+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + BOUNCE_MS * SPEED + 140;   /* 1100 ≤ 1878（b37 R3：留豁免窗活跃段） */
    dodgeLo();
    if (el) el.classList.add('miss');            /* 错格轻晃（不亮正确格本体——冲突卡须靠维度推理） */
    replayAnim(cardBigEl, 'back');               /* 卡弹回 */
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))             /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;        /* 链豁免：1728+150+1992+300=4170 真时钟（契约 I） */
    /* 方向级反馈=错链播毕重读题面句（SPEC §2/R48：普通句/维度句——say 非队列链，
       q 未答且未换关才播，防叠音/串题） */
    clearTimeout(hintResayTimer);
    hintResayTimer = setTimeout(() => {
      if (cur === run && !state.won && !q._answered) {
        KIDS.voice.play(q.sayKey, q.say);       // 重读题面句（lb_hint/lb_d2_*）
        replayAnim(hintEl, 'repop');
      }
    }, WRONG_CHAIN_WIN + 60);
    if (q._miss === 1) replayAnim(shelfEl, 'wig');           /* 方向级：书架整体 wiggle 不指格 */
    if (q._miss >= 2) {                                     /* miss≥2=正确格 breathe（答案级梯度） */
      const ok = shelfSlotAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(BOUNCE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('miss');         /* 格回可重点（探索不罚） */
    state.locked = false;
    return r;
  }

  /* ---- shelved·done（正确格：卡片飞入+书立起+确认链单 clip） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次归对 → 放手 */
    state.tut = 'solo';
    window.__lbTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  clearTimeout(hintResayTimer);                  // 已归档：中止在途维度提示重读（防叠音）
  state.locked = true;
  state.showUntil = Date.now() + (SHELVE_MS + CELE_WIN) * SPEED + 140;   /* 1000+1836（家族 H） */
  addBookTo(el, q);                              /* 书立起（目标格 .bk 弹立——契约 M DOM 锚） */
  replayAnim(cardBigEl, 'fly');                  /* 卡片飞入格演出 */
  if (el) el.classList.add('good');
  chimeGoal();
  sfx('coin');
  await wait(SHELVE_MS * SPEED);                 /* 书立起窗 */
  if (cur !== run || token !== showRun) return r;
  KIDS.voice.queue([VOICE.right.key]);           /* 确认链：lb_right 单 clip（SPEC §4） */
  await wait(CELE_WIN * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关 */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                 /* 新题开题（新卡出场+提示句） */
  return r;
}

/* ================= 点卡主路径（R48 pick 题：三卡跨维挑书盘，与 uiTapShelf 严格
   同构——演出锁/豁免窗 guard/身份守卫 token/miss 计分/错链/答案级梯度全同构；
   干扰卡无词键不播词：错路径只走错链 [lb_wrong, lb_hint]，绝不播干扰卡词音
   ——基线「干扰词无键不点」规则保持（本款卡词无键，天然满足）） ================= */
async function uiTapCard(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(shelfEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(shelfEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.kind !== 'pick') return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cards.length) { sfx('pop'); replayAnim(shelfEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* 错链豁免窗（契约 I 补，与 uiTapShelf 同构）：窗内干扰卡点吞——pop+bump 不计
     miss；正确卡放行；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(shelfEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCard(cur, i);
  if (r === null) { sfx('pop'); replayAnim(shelfEl, 'bump'); return null; }
  const el = trayCardAt(i);

  if (r === 'wrong') {                           /* 干扰卡：卡晃+错链两段+方向级反馈+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + BOUNCE_MS * SPEED + 140;   /* 1100 ≤ 1878（b37 R3：留豁免窗活跃段） */
    dodgeLo();
    if (el) el.classList.add('miss');            /* 错卡轻晃（不亮正确卡本体——须靠跨维辨别） */
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))             /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;        /* 链豁免：1728+150+1992+300=4170 真时钟（契约 I） */
    /* 方向级反馈=错链播毕重读题面句（q 未答且未换关才播，防叠音/串题） */
    clearTimeout(hintResayTimer);
    hintResayTimer = setTimeout(() => {
      if (cur === run && !state.won && !q._answered) {
        KIDS.voice.play(q.sayKey, q.say);       // 重读挑书句（lb_pick_*——R48 新键）
        replayAnim(hintEl, 'repop');
      }
    }, WRONG_CHAIN_WIN + 60);
    if (q._miss === 1) replayAnim(shelfEl, 'wig');           /* 方向级：书架整体 wiggle 不指答案 */
    if (q._miss >= 2) {                                     /* miss≥2=正确卡 breathe（答案级梯度） */
      const ok = trayCardAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(BOUNCE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('miss');         /* 卡回可重点（探索不罚） */
    state.locked = false;
    return r;
  }

  /* ---- shelved·done（正确卡：卡飞入目标格+书立起+确认链单 clip） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  clearTimeout(hintResayTimer);                  // 已归档：中止在途题面句重读（防叠音）
  state.locked = true;
  state.showUntil = Date.now() + (SHELVE_MS + CELE_WIN) * SPEED + 140;   /* 1000+1836（家族 H） */
  const slotEl = shelfSlotAt(q.shelf.indexOf(q.target));   /* 目标格（题面已知量） */
  addBookTo(slotEl, q);                          /* 书立起（目标格 .bk 弹立——契约 M DOM 锚） */
  if (el) el.classList.add('fly');               /* 挑中的卡飞入格演出 */
  if (slotEl) slotEl.classList.add('good');
  chimeGoal();
  sfx('coin');
  await wait(SHELVE_MS * SPEED);                 /* 书立起窗 */
  if (cur !== run || token !== showRun) return r;
  KIDS.voice.queue([VOICE.right.key]);           /* 确认链：lb_right 单 clip（SPEC §4） */
  await wait(CELE_WIN * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    winFlow(); return 'done';
  }
  presentQuiz();                                 /* 新题开题 */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_libr） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
}
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
  showRun++;                                     /* 通关中止在途演出 */
  clearTimeout(hintResayTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* lb_right：放对啦（1536ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 1536+300=1836 */
    const pr = persistWin(stars);
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
  showRun++;                                     /* 中止在途演出（重玩/换关） */
  clearTimeout(hintResayTimer);                  // 换关中止在途维度提示重读
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastHearAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.libr && sv.libr.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §2：watch=卡出→听提示→点
   正确格→书立起；turn=你来放一放帮/独）
   watch=播 lb_tut_watch「看！把书放回家」→ 延 3276（≥2976+300）→ 开题演出
   （row0 小猫普通句 6 字：400+2670+300=3370）→ ghost 移入 800+press 320
   → demo 点正确格演出窗 1000+1836=2836 → __lbDemoR='shelved'；
   turn=播 lb_tut_turn「你来放一放」→ 延 2076（≥1776+300）→ row0 首题开题
   （400+2670+300=3370）→ 帮（指向正确格）→首对独（solo）→进正式关。
   —— watch 段分账 3276+3370+800+320+2836=10602 ≤ 16000（单步演示款 ≤16s） ---------- */
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 点正确格返回 'shelved'）
  return { flat: -1, ch: 0, dch: 0, lv: 0, rows: [0, 1], shelf: ['animal', 'food'],
           step: 0, retries: 0, done: false,
           quizzes: [buildQuiz(0, ['animal', 'food']), buildQuiz(1, ['animal', 'food'])] };
}
function tutTurnLevel() {                        // 单题迷你关：row0 首题（小猫——正式关第一题同款）
  return { flat: -1, ch: 0, dch: 0, lv: 0, rows: [0], shelf: ['animal', 'food'],
           step: 0, retries: 0, done: false,
           quizzes: [buildQuiz(0, ['animal', 'food'])] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* lb_tut_watch：看！把书放回家（2976ms） */
  await wait(TUT_WATCH_WAIT * SPEED);            /* ≥2976+300=3276：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz();                           /* 小猫出场+提示句（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(shelfSlotAt(idx));                /* 幽灵手指指向正确格（动物格） */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapShelf(idx, true);     /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__lbDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'shelved'——终值语义） */
  window.__lbWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.libr = sv.libr || {};
  sv.libr.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立 row0 首题迷你关「你来放一放」（帮→独），首对放手进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 shelved 的 presentQuiz 新题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* lb_tut_turn：你来放一放（1776ms） */
  await wait(TUT_TURN_WAIT * SPEED);             /* ≥1776+300=2076 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 小猫出场+提示句 → 开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
/* 重播提示句（方向级救援/重听/戳兔子共用；教学迷你关禁重播） */
function sayHintAgain() {
  const q = cur && cur.quizzes[cur.step];
  if (!q || cur.flat < 0) return false;
  KIDS.voice.play(q.sayKey, q.say);             // 重播题面句（lb_hint/lb_d2_*/lb_pick_*）
  replayAnim(hintEl, 'repop');
  replayAnim(cardBigEl, 'in');
  return true;
}
/* 戳兔子=方向提示（R48：普通 sort 题播注册句 lb_hint；维度/pick 题重读题面句
   ——维度句去泄漏后语义提示=重申分类标准，非念答案） */
function rabbitHint() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'sort' && q.hint === 'none') sayR(VOICE.hint.key, VOICE.hint.text);
  else sayHintAgain();
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  rabbitHint();                                  /* 戳兔子=方向提示（按题型分流） */
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重播 */
  if (Date.now() - lastHearAt < 3000) return;    /* 重听 3s 节流 */
  lastHearAt = Date.now();
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  sayHintAgain();                                /* 重听提示句（题面真值同源） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期门 */
  lastAct = Date.now();
  startLevel(cur.flat);                          /* 再玩一次=重开本关（同 flat 确定性同题） */
});
shelfEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.shelf-slot');
  if (!p) return;                                // 格间空白走 stage 空白路径
  e.preventDefault();
  uiTapShelf(Number(p.dataset.i));
});
cardBigEl.addEventListener('pointerdown', e => {   // R48：pick 题挑书盘点卡
  const p = e.target.closest('.tray-card');
  if (!p) return;
  e.preventDefault();
  uiTapCard(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.shelf-slot') || e.target.closest('.tray-card')) return;   // 格/卡点击已由专属 handler 处理
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重播提示句+提示牌重亮，lastDir 独立
   节流锚，不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（答案体 breathe+
   重播——sort=正确格/pick=正确卡）/ 教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < state.showUntil) return;      /* 演出锁期不救援 */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const ok = answerElOf(q);                  /* 答案体（sort=正确格/pick=正确卡） */
      if (ok) replayAnim(ok, 'breathe');
      sayHintAgain();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播提示句（不动 lastAct） */
    sayHintAgain();
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言，照 b28 m4） */

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'libr', title: '分类归档小图书' });   // 存档键 kidsgame_libr（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  firstFlat = first;
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.LB——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（shelf/cards 拷贝；R48 双题型：sort——answer=正确格
   下标（verify 从 shelf.indexOf(卡主题) 独立推导对账，禁读 quiz.answer 直比）；
   pick——target=目标格主题/cards=盘序 3 卡/answer=盘内正确卡下标（verify 从
   cards+卡主题独立推导））；step=全关题号 0-4（b33 坑①：题号语义显式声明
   ——flat*5 内的第几题，非全局题号）。
   tapShelf（sort）/tapCard（pick）返回：正确非末题 'shelved' / 正确末题
   'done' / 错 'wrong' / 豁免窗内错吞 false / 演出期 null（真时钟锁）/
   越界·题型不匹配 null ================ */
window.LB = {
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
    const base = {
             kind: q.kind,                            /* 题型：'sort' 点格归档 | 'pick' 跨维挑书 */
             label: q.label,                          /* sort=卡名；pick=''（三卡盘无单卡名） */
             shelf: q.shelf.slice(),                  /* 书架格序主题 id（R48 恒 4） */
             hint: q.hint,                            /* 提示维度：'none'普通|'farm'|'eat'|'pet'|'wear'（pick 恒'none'） */
             say: q.say, sayKey: q.sayKey,            /* 提示句文本+clip 键（题面真值——verify 对账锚） */
             answer: q.answer,                        /* sort=正确格下标（=shelf.indexOf(卡主题)）；pick=盘内正确卡下标 */
             step: cur.step,                          /* 全关题号 0-4（b33 坑①语义） */
             miss: q._miss || 0 };
    if (q.kind === 'pick') {
      base.target = q.target;                         /* 目标格主题 id（题面已知量） */
      base.cards = q.cards.slice();                   /* 盘序 3 卡 id（点选语义=盘内下标） */
    } else {
      base.card = q.card;                             /* 当前卡 id（题库行卡） */
    }
    return base;
  },
  tapShelf(i) { return uiTapShelf(i); },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点答案体，走真实判定链；
    let taps = 0, guard = 0;             // 演出锁/演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 200) {
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = q.kind === 'pick' ? await uiTapCard(q.answer) : await uiTapShelf(q.answer);
      if (r === 'shelved' || r === 'done') taps++;
      else if (guard >= 198) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
