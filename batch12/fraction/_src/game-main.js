/* ================= fraction 主逻辑（四题型题面 / 点选卡 / 教学 / 推进）
   r15 难度改造（2026-09-16，AUDIT-78:78）：5 章×8 题 + eq 等值题型 + cut 4 选 1（非平均切干扰）。
   玩法：cut = 题面文字（大数字）+ 4 披萨卡；read = 题面涂色披萨 + 3 分数大字卡；
   cmp = 题面"哪一块大" + 2 披萨块卡；eq = 题面参照披萨块 + "哪一块和它一样大" + 3 披萨块卡。
   点对 = 卡 lit + 题面 paired + (read/cmp/eq 念分数词强化)；
   点错 = 晃动灰掉零惩罚（排除法保底——灰化款；cut 4 选 1 干扰 3 张，read/eq 三选一干扰 2 张，
   cmp 两选一干扰 1 张——豁免拍：cmp miss>=1 恰一次，其余 ===2 恰一次（§0.5 四选一及以上同 ===2）），
   首错不 pulse，miss≥2 正确卡 pulse（1s ease 2 两遍，math/worden 家族）。
   题面句语音：cut = queue([fra_q_cut, fra_num_n, fra_q_cut2]) 全 clip 拼接（审查 M1）；
   read/cmp/eq = 整句 clip（fra_q_read / fra_q_cmp / fra_q_eq，§0.23 题面 clip 化）。
   开场/交接语音走顺序链：play(fra_hint) 后 2000ms 接力题面（qTimer，禁双通道叠音）。
   救援 = 重读题面 + 正确卡 breathe 循环（§0.21；interval 头部面板守卫——契约 K）。
   验收钩子：window.FR = { get currentLevel, get quiz(){kind,n,k,ref,options,answerIdx,step,miss,dead},
   tapCard(i), async autoSolve(), get tutorial }（ref=eq 参照块 {k,n}，r15 钩子契约扩展） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题/答对分数词强化不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流 + 豁免恰一次；
   灰化款豁免拍：cmp 两选一错 1 次即剩排除法（miss 封顶 1）传 >=1；
   cut 4 选一（r15 干扰 3 张）/read/eq 三选一（干扰 2 张）miss 封顶后 ===2 与 >=2 等价，
   家族统一写 ===2（§0.5 四选一及以上候选同 ===2） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const stageEl = $id('stage'), boardEl = $id('board'), chipEl = $id('prompt-chip'),
      ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'
let qTimer = null;                              // 开场/教学链 clip→题面的接力定时器

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
/* r15 审查 M3：旧档基迁移——CH_LEN 5→8 使 r12 存量档（5 基 '1-0'..'4-4'）键位错位（旧 '2-0'=旧 flat5
   误作新 flat8→跳关+章语义错乱）。新基顺序解锁下「有跨章首关 C-0 而缺前章第 6 键 (C-1)-5」=旧基残留矛盾态
   →一次性整档重置（赶在 KIDS.init 读档前删 localStorage，教学关 ~5min 成本优于静默跳关）。 */
try {
  const raw = localStorage.getItem('kidsgame_fraction');
  if (raw) {
    const lv = (JSON.parse(raw) || {}).levels || {};
    let legacy = false;
    for (let c = 2; c <= 5; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { legacy = true; break; }
    }
    if (legacy) localStorage.removeItem('kidsgame_fraction');
  }
} catch (e) { /* 迁移失败不阻断启动 */ }
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（读题 sayR 级不受 flat 门）
   cut = queue 拼接全 clip：fra_q_cut + fra_num_n 数词 + fra_q_cut2'份'（审查 M1 定版，禁 key:null TTS 段）
   read/cmp/eq = 整句 clip（r15：eq 用 fra_q_eq 等值题面句）；
   重入先清接力定时器（防旧题残留切断新题面） */
function speakQuiz(q) {
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  if (q.kind === 'cut') KIDS.voice.queue(['fra_q_cut', 'fra_num_' + q.n, 'fra_q_cut2']);
  else KIDS.voice.queue([q.kind === 'read' ? 'fra_q_read' : q.kind === 'cmp' ? 'fra_q_cmp' : 'fra_q_eq']);
}

/* ================= 开场顺序链（§0.5/§0.6：quiet 标志防渲染插播）
   play(fra_hint) 后 2000ms 接力题面（hint clip 主体窗 3705ms 估>2s，留白防叠音；禁 play 直接切断题面） */
function openingSpeak() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }   /* 防上一关接力残留切断本关 */
  sayR(VOICE.hint.key, VOICE.hint.text);
  qTimer = setTimeout(() => {
    qTimer = null;
    speakQuiz(cur.quizzes[cur.step]);
  }, 2000);
}

/* ================= 渲染 ================= */
function renderChip(q) {                        // 题面卡：cut=问句大数字 / read=涂色披萨+小问句 / cmp=问句 / eq=参照块+小问句
  chipEl.classList.remove('paired');
  if (q.kind === 'read') {
    const colored = [];
    for (let i = 0; i < q.k; i++) colored.push((q.c0 + i) % q.n);
    chipEl.innerHTML = '<span class="pwrap">' + pizzaSvg({ t: 'eq', n: q.n, w: uniformW(q.n), rot: q.rot }, colored) + '</span>' +
      '<span class="qtext small">涂色部分是几分之几？</span>';
  } else if (q.kind === 'eq') {                 // r15：参照披萨块 + 问句（等值题面）
    chipEl.innerHTML = '<span class="pwrap">' + wedgeSvg(q.rk, q.rn) + '</span>' +
      '<span class="qtext small">哪一块和它一样大？</span>';
  } else if (q.kind === 'cut') {
    chipEl.innerHTML = '<span class="qtext">哪一个是平均分成了<b>' + q.n + '</b>份？</span>';
  } else {
    chipEl.innerHTML = '<span class="qtext">哪一块<b>大</b>？</span>';
  }
  chipEl.setAttribute('aria-label', quizText(q) + '，点我再听一遍');
}
function renderBoard(q) {                       // 答案卡：披萨卡(4) / 分数字卡(3) / 披萨块卡(cmp 2·eq 3)（渲染即引擎）
  boardEl.innerHTML = '';
  boardEl.dataset.k = q.kind;
  q.options.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop' + (q._dim[i] ? ' dim' : '');
    b.dataset.i = i;
    let inner;
    if (q.kind === 'cut') {
      b.dataset.opt = o.t + o.n;                // verify 对账（eq3/un3/un4…）
      b.dataset.rot = o.rot;
      b.setAttribute('aria-label', '披萨卡');
      inner = '<span class="gwrap">' + pizzaSvg(o, null) + '</span>';
    } else if (q.kind === 'read') {
      b.dataset.num = o.num;
      b.dataset.den = o.den;
      b.setAttribute('aria-label', '分数 ' + o.den + ' 分之 ' + o.num);  /* 中文读法分母在前（审查 m2） */
      inner = '<span class="frac"><b>' + o.num + '</b><span class="fbar"></span><b>' + o.den + '</b></span>';
    } else {
      b.dataset.val = o.k + '-' + o.n;          // cmp/eq 披萨块卡共用 data-val 对账（r15）
      b.setAttribute('aria-label', '披萨块');
      inner = '<span class="gwrap">' + wedgeSvg(o.k, o.n) + '</span>';
    }
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = inner;
    boardEl.appendChild(b);
  });
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip(q);
  renderBoard(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);  /* 开场/换题读题；demo 门防演示收尾叠播；quiet=开场/教学交接改顺序链 */
}
function renderStep() {                         // HUD 本关 8 题进度点（r15）
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                         // 章节点（1 基，生成关循环章画到当前章；r15 5 章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(N_CHAPTERS, cur.ch); c++) {
    const i = document.createElement('i');
    const done = LVS.every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(el, reason) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show(reason);
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向：当前题的正确卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(q.answerIdx), 'tut');
}

/* ================= 点选主路径（真实点击 / FR.tapCard / autoSolve 共用） ================= */
async function uiTapCard(i, demo) {
  /* locked 门拦真实输入；demo 通道仅 tutorialWatch 内部传 true（豁免 locked）。
     吞输入期轻反馈（§0.22）：真实点击被 locked/demo/won 吞时 sfx('pop') 轻叮，返回值/状态不变 */
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    sfx('pop');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) return false;
  if (r === 'again') return 'again';            /* 已灰卡：早退零惩罚不计数（§0.7 防御层） */
  const el = cardEl(i);

  if (r === 'wrong') {                          /* 答错：晃动+灰掉（pointer-events:none）零惩罚，排除法保底 */
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig', 'dim'); }
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.kind === 'cmp' ? q._miss >= 1 : q._miss === 2);  /* cmp 两选一 miss 封顶 1 >=1 豁免恰一次（审查 m1）；cut 4 选 1/read/eq 三选一 ===2 与 >=2 等价（§0.5 家族统一 ===2） */
    if (q._miss >= 2) {                         /* 首错不 pulse：连错 2 次才高亮正确卡（两遍） */
      const ok = cardEl(q.answerIdx);
      if (ok) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    }
    await wait(480 * SPEED);
    return r;
  }

  /* ---- 答对：卡 lit + 题面 paired →（read/cmp/eq 念分数词强化，clip 在场）→ 推进 ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次答对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('pulse', 'breathe'); el.classList.add('lit'); }
  chipEl.classList.add('paired');               // 题面亮绿（同步前缀，供验收窗内读 DOM）
  chimeGoal();
  sfx('coin');
  if (q.kind !== 'cut') {                       /* 分数词强化：'三分之二'…（六条 clip 全组合在库；cmp/eq 取答案块，r15 eq 同） */
    const fk = q.kind === 'read' ? [q.k, q.n] : [q.options[q.answerIdx].k, q.options[q.answerIdx].n];
    sayR(fracKey(fk[0], fk[1]), FRAC_NAME[fk[0] + '/' + fk[1]]);
    await wait(1450 * SPEED);                   /* 等分数词播完再换题（单通道不叠音） */
  }
  await wait(620 * SPEED);                      /* lit 停半拍（看清答对反馈） */
  if (cur !== run) return r;                    /* 演出窗内重玩已重建关卡：丢弃旧续体 */
  state.locked = false;
  if (cur.done) winFlow();
  else renderQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;      /* r15 审查 F1 修复：契约伪码变量 f 照抄漏声明——生成关（flat≥40）ReferenceError 含启动黑屏路径；照 column/money 补别名 */
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<5，r15 五章）；生成关（flat≥40→ci≥5）实算下一关难度章取 GEN 文案
     （genLevel(f+1).dch 由种子确定性给出——禁按章序取模推进，家族契约 F 定版） */
  return ci < N_CHAPTERS ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, LVS);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars8 = LVS.reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars8, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                            // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);               // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  /* verify 页恒走 openingSpeak（stub 记录开场链供断言，教学由真实页自测覆盖） */
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.fraction && sv.fraction.tutSeen);
  if (VERIFY) { openingSpeak(); return; }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；hint 不得切断题面） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指点出正确卡（lit+paired 演出，locked 吞输入）→帮=指向正确卡；独=首次答对放手 */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  const idx = q.answerIdx;
  pointGhostAt(cardEl(idx), 'tut');
  await wait(900 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiTapCard(idx, true);                    // demo 通道豁免 locked（演示吞真实输入）
  await wait(1000 * SPEED);                      // lit+paired 演出窗口
  const sv = KIDS._save() || {};                 // verify 页 _save()=null 时空档（教学链单元直调）
  sv.fraction = sv.fraction || {};
  sv.fraction.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来挑一挑"在重发后的题面上说（照 batch5-11） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  /* 交接顺序链：turn clip 播完再读题面——题面为 queue 拼接，qTimer 2000ms 接力（§0.6，禁双通道叠音） */
  sayR(VOICE.turn.key, VOICE.turn.text);
  qTimer = setTimeout(() => {
    qTimer = null;
    if (state.tut === 'help') speakQuiz(cur.quizzes[cur.step]);
  }, 2000);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) {   /* §0.20 三件门；教学/演出期点兔子=pop+hop 轻反馈不静默（§0.16） */
    sfx('pop');
    hopRabbit();
    return;
  }
  hopRabbit();                                   /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20：教学/演出/通关期重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查口径：对齐重玩门/题面卡防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：题面整段重读 */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  speakQuiz(cur.quizzes[cur.step]);              /* 题面卡可点重听（点题卡=儿童高发探索动作） */
});
stageEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (p) {                                       // 答案卡：主答路径（吞输入轻叮由 uiTapCard 内统一给）
    e.preventDefault();
    uiTapCard(Number(p.dataset.i));
    return;
  }
  if (e.target.closest('#prompt-chip')) return;  // 题面卡走自己的 handler
  /* 空白/探索点击（含已灰卡 pointer-events:none 落穿）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（重读题面+正确卡 breathe 循环 §0.21）/ 教学"帮"5s 重演示一次
   interval 头部面板守卫（契约 K，r13 grid/poemfill 双犯后定版——r15 补装）：章末/日末/休息/庆祝/家长
   面板在屏时静默，防面板语音被救援重读切断 */
setInterval(() => {
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援=重读题面（§0.7a，非通用催促句） */
    if (q) speakQuiz(q); else sayR(VOICE.hint.key, VOICE.hint.text);
    if (q) {                                    /* 视觉重现（§0.21）：正确卡 breathe 循环在屏，静音也能看见答案线索 */
      const ok = cardEl(q.answerIdx);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    lastAct = Date.now();
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
  KIDS.init({ game: 'fraction', title: '分数披萨' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（审查 m6：整章边界不跳章） */ });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.FR = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, retries: cur.retries, done: cur.done, won: state.won };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                                   /* SPEC §2 钩子契约（r15 扩展 ref） */
             n: q.kind === 'cmp' || q.kind === 'eq' ? null : q.n,   /* cut=问句份数 / read=总份数 / cmp·eq=值在 options */
             k: q.kind === 'read' ? q.k : null,
             ref: q.kind === 'eq' ? { k: q.rk, n: q.rn } : null,    /* r15：eq 参照块 {k,n} */
             options: q.options.map(o => {                   /* 题对象拷贝（含 w 数组深拷贝） */
               const c = Object.assign({}, o);
               if (o.w) c.w = o.w.slice();
               return c;
             }),
             answerIdx: q.answerIdx, step: cur.step, miss: q._miss || 0,
             dead: q._dim.map((v, i) => v ? i : -1).filter(i => i >= 0) };   /* 灰化卡下标 */
  },
  tapCard(i) { return uiTapCard(i); },
  async autoSolve() {                           // UI 路径自动点完当前关（逐题点正确卡）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 40) {   // r15 8 题每题 1 tap，guard 40 余量
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapCard(q.answerIdx);
      taps++;
      if (r === false || r === null) break;     // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
