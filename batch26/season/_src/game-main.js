/* ================= season 主逻辑 r4（双约束整套装 / 勾选+提交制 / 教学演示 / 救援 / 推进）
   玩法：题面 = 双条件 chips（气温带+场合）+ 季节场景卡（band 映射冬/春秋/夏景+小兔衣着）
   + 题面句（动态 TTS 拼句，weather v2 stem 豁免先例）+ 文字条（识字萌芽），
   下方 4-6 张物品卡。套装题（outfit）：点卡=勾选切换（飞挂小兔 badge），勾满点
   「穿好啦」提交——勾对全集=推进 / 含错件=清空重选+miss（wrong_more）/ 未选满=
   保留继续找（wrong_less）。反向题（anti）：单选即时判定，错=方向锚反馈不泄答案。
   救援两级（§0/家族 B 定版）：14s 方向级=按题型 hint clip（outfit=sea_hint_outfit/
   anti=sea_hint_anti，r4 新增）+ 条件区 pulse（lastDir 独立节流锚，不重置 lastAct）；
   30s 答案级=下一件应选卡 breathe（勾满=提交钮 breathe）。
   语音窗（家族 G/H，clip 实长 2026-09-13 浏览器实测=SPEC r4 真值表）：
   sea_tut_watch 3216 → 演示首动作延至 t≥3516（900+900+900+700+320=3720 起，禁撞头）；
   sea_tut_turn 1752 → turn 后无接力读题（题面句 TTS fire-and-forget，防尾截窗不需要）；
   sea_right 2544 → winFlow celebrate(2620)+wait(400)=3020 ≥ 2844（判对后窗）；
   提交成演出窗 620+430=1050（weather v2 先例：成功路径无 TTS 拼句）；
   错反馈链豁免 wrongChainUntil=4750 ≥ estMs(TTS_MAX_CHARS=11)+300=4695（审查 M4 配套；
   r4 审查 m-5：estMs 统一家族 b25 定版 +600 口径，窗 4600→4750 同步）；
   错点防重入窗 1000ms（batch21 §0 L9）。
   验收钩子：window.SE = { get currentLevel, get quiz(){kind,band,occ,need[],picks[],picked[],
   step,miss}, tapItem(i), tapSubmit(), start(flat), async autoSolve(), get tutorial }（getter 拷贝） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音 clip（救援/教学/任务句不受 flat 门限制 §0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 错反馈/提交反馈 TTS：flat<3 每次播 / flat≥3 10s 节流（审查 M2：节流对象=语义句本身） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，审查 M4） */
const sayWKey = (key, t) => {                  /* T46 阶段2：错/提交反馈 clip 化（sea_anchor_/sea_sub_） */
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, t); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, t); }
};

const sceneEl = $id('scene'), condsEl = $id('conds'), boardEl = $id('board'),
      wearBtn = $id('btn-wear'),
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
const condChip = i => condsEl.querySelector('.chip[data-ci="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  wearBtn.innerHTML = ICONS.wear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：勾选轻音=单清音 / 答对=双音上行 / 答错=低柔单音 */
const chimeHold = () => { if (!VERIFY) KIDS.audio.note(740, 0.14, 0, 0.45); };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（动态句 TTS；重听/救援共用） ================= */
function speakStem(q) {
  if (!q) return;
  KIDS.voice.play(q.kind === 'anti' ? 'sea_sta_' + q.band : 'sea_st_' + q.band + '_' + q.occ,
                  q.stem);                      /* T46 阶段2：题面句 clip 化（sea_st_* 12+sea_sta_* 3） */
}
/* 按题型方向 hint（14s 救援/戳兔子）：outfit=双约束 hint / anti=反向 hint（r4 新 clip） */
function speakDirHint(q) {
  if (!q) return;
  if (q.kind === 'anti') sayR(VOICE.hintAnti.key, VOICE.hintAnti.text);
  else sayR(VOICE.hintOutfit.key, VOICE.hintOutfit.text);
}

/* ================= 渲染 ================= */
function renderScene(q) {                        // 季节场景：band→季节景（q.season 由引擎 seeded）
  sceneEl.dataset.season = q.season;
  sceneEl.setAttribute('aria-label', nameOfBand(q.band) + '的天' + (q.occ ? nameOfOcc(q.occ) : '，挑衣服') + '，点我再听一遍');
  const acc = rabbitAccSvg(q.season);
  sceneEl.innerHTML = seasonSvg(q.season) +
    '<div class="bunny-slot"><div id="bunny-wear" aria-hidden="true"></div>' +
    '<div id="bunny">' + KIDS.assets.rabbit('normal', 88) +
    (acc ? '<div class="bunny-acc">' + acc + '</div>' : '') + '</div></div>' +
    '<div class="q-text">' + q.stem + '</div>';
  renderWear(q);
}
function renderWear(q) {                         // 已勾选 badge = 勾选态同步（提交后清空）
  const wear = sceneEl.querySelector('#bunny-wear');
  if (!wear) return;
  wear.innerHTML = '';
  (q.picked || []).forEach(i => {
    const b = document.createElement('span');
    b.className = 'wear';
    b.innerHTML = itemSvg(q.items[i].item, 34);
    wear.appendChild(b);
  });
}
function renderConds(q) {                        // 条件区 chips：气温带（图标+大数字°）+ 场合（反问题=仅带 chip）
  condsEl.innerHTML = '';
  condsEl.dataset.kind = q.kind;
  const bchip = document.createElement('div');
  bchip.className = 'chip isband';
  bchip.dataset.ci = 0;
  bchip.setAttribute('aria-label', TEMPS[q.band].n + '，' + TEMPS[q.band].deg + '度');
  bchip.innerHTML = bandChipHtml(q.band);
  condsEl.appendChild(bchip);
  if (q.kind === 'outfit') {
    const ochip = document.createElement('div');
    ochip.className = 'chip';
    ochip.dataset.ci = 1;
    ochip.setAttribute('aria-label', OCCS[q.occ].n);
    ochip.innerHTML = occChipSvg(q.occ);
    condsEl.appendChild(ochip);
  }
}
function renderBoard(q) {                        // 物品卡排（SVG 零文字标签，图形即语义；勾选态复绘）
  boardEl.innerHTML = '';
  q.items.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'card pop' + (q.picked.indexOf(i) >= 0 ? ' held' : '');
    b.dataset.i = i;
    b.dataset.item = t.item;                     // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', nameOfItem(t.item) + '卡');
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="gwrap">' + itemSvg(t.item) + '</span>' +
      '<span class="check" aria-hidden="true">' + ICONS.check + '</span>';
    boardEl.appendChild(b);
  });
}
function updateWearBtn(q) {                      // 「穿好啦」：套装题才出现；勾满 need=pulse 呼吸邀请
  if (!q || q.kind !== 'outfit') { wearBtn.classList.remove('show', 'ready'); return; }
  wearBtn.classList.add('show');
  const got = q.picked.filter(i => q.need.indexOf(q.items[i].item) >= 0).length;
  wearBtn.classList.toggle('ready', got >= q.need.length);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderConds(q);
  renderBoard(q);
  renderStep();
  updateWearBtn(q);
  if (!VERIFY && !state.demo && !state.quiet) speakStem(q);   /* 开场/换题读题面；demo 门防演示收尾叠播 */
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

/* ================= 换装动画：物品从卡飞到小兔 badge（.flywear 克隆体 CSS transition §0.11） */
function flyWear(el, item, run) {
  const addBadge = () => {
    if (run && cur !== run) return;                       // 演出窗内重玩已重建关卡：丢弃迟到 badge
    const q = cur && cur.quizzes[cur.step];
    renderWear(q || { picked: [], items: [] });           // badge 与勾选态同步（幂等重绘）
    const bun = sceneEl.querySelector('#bunny');
    if (bun) replayAnim(bun, 'hop');
  };
  if (VERIFY || !el) { addBadge(); return; }
  const wear = sceneEl.querySelector('#bunny-wear');
  if (!wear) { addBadge(); return; }
  const from = el.getBoundingClientRect();
  const to = wear.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'flywear';
  fly.innerHTML = itemSvg(item, 52);
  fly.style.left = from.left + 'px';
  fly.style.top = from.top + 'px';
  fly.style.transitionDuration = '430ms';
  document.body.appendChild(fly);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  requestAnimationFrame(() => {
    fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.8)';
  });
  setTimeout(() => { fly.remove(); addBadge(); }, 450);
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
function ghostToWear() {                          // 幽灵手指指向「穿好啦」提交钮（教学提交步）
  if (VERIFY) return;
  const r = wearBtn.getBoundingClientRect();
  ghostEl.style.left = (r.left + r.width / 2) + 'px';
  ghostEl.style.top = (r.top + r.height / 2) + 'px';
  ghost.show();
}
/* 教学"帮"阶段指向：套装题未勾满指 need 卡 / 勾满指「穿好啦」；反向题指 need 卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = nextNeededIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
  else if (q.kind === 'outfit') ghostToWear();
}

/* ================= 点卡主路径（真实点击 / SE.tapItem / autoSolve / 教学演示共用）
   套装题：pick/unpick=勾选切换（badge 同步）——判定在 uiSubmit
   反向题：right/done=推进+换装 / wrong=摇头+方向锚反馈+1000ms 防重入窗
   吞输入轻叮必配可见回应（物品卡排容器 bump——家族 D）========== */
async function uiTapItem(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapItem(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  const el = cardEl(i);

  if (r === 'unpick') {                          /* 取消勾选：零惩罚（badge 同步移除） */
    sfx('pop');
    if (el) el.classList.remove('held');
    renderWear(cur.quizzes[cur.step]);
    updateWearBtn(cur.quizzes[cur.step]);
    return 'unpick';
  }
  if (r === 'pick') {                            /* 勾选：挂起+轻音+换装飞行（奖励钩子前置） */
    lastAct = Date.now();
    if (el) el.classList.add('held');
    chimeHold();
    sfx('coin');
    flyWear(el, q.items[i].item, run);
    updateWearBtn(q);
    await wait(300 * SPEED);
    if (state.tut === 'help') pointHelpNext();
    return 'pick';
  }
  if (r === 'wrong') {                           /* 反向题答错：摇头+方向锚（不泄答案），卡不灰可重选 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sayWKey('sea_anchor_' + q.band, ANTI_ANCHOR[q.band]);   /* T46 阶段2：方向锚 clip 化（sea_anchor_* 3） */
    wrongChainUntil = Date.now() + 4750;         /* 链豁免：estMs(11)=4395+300+裕量（审查 M4；m-5 统一 +600 口径） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms（batch21 §0 L9） */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（反向题答对：亮卡+换装飞行+推进） ---- */
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
  flyWear(el, q.items[i].item, run);
  KIDS.voice.play('sea_cf_a_' + q.band, confirmOf(q));   /* T46 阶段2：反向确认 clip 化 */
  await wait(620 * SPEED);                       /* 亮卡停半拍 */
  if (cur !== run) return r;
  await wait(430 * SPEED);                       /* 换装飞行窗 */
  if (cur !== run) return r;
  await wait(4350 * SPEED);                      /* 确认句 TTS 罩窗：总 620+430+4350=5400
                                                    ≥ estMs(TTS_MAX_CHARS=11)=4395（b25 定版 +600，
                                                    build.py 静态断言「窗≥estMs」） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（场景/条件/卡/badge 全换）+读题 */
  return r;
}

/* ================= 提交主路径（「穿好啦」/ SE.tapSubmit / autoSolve / 教学演示共用）
   返回：'right'（含末题 done 内部走 winFlow）/ 'wrong_more'（含错件：清空重选+miss）/
   'wrong_less'（未选满：保留继续）/ false（吞输入/反向题不适用） ---------- */
async function uiSubmit(demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) { sfx('pop'); replayAnim(wearBtn, 'bump'); return false; }
  const run = cur;                               /* 身份守卫（同上） */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engSubmit(cur);
  if (r === null) return false;

  if (r === 'wrong_less') {                      /* 少选：保留勾选继续找（合法路径不算 miss） */
    lastAct = Date.now();
    state.locked = true;                         /* 短窗防连点提交刷语音 */
    dodgeLo();
    hopRabbit();
    sayWKey('sea_sub_less', SUBMIT_TEXT.less);   /* T46 阶段2：提交反馈 clip 化 */
    wrongChainUntil = Date.now() + 4750;         /* 链豁免（审查 M4；m-5 统一 +600 口径） */
    await wait(500 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') pointHelpNext();
    return 'wrong_less';
  }
  if (r === 'wrong_more') {                      /* 含错件：清空重选+miss（真实错误路径） */
    lastAct = Date.now();
    state.locked = true;
    dodgeLo();
    replayAnim(boardEl, 'bump');
    renderBoard(q);                              /* 清勾选态（held 全撤） */
    renderWear(q);                               /* badge 清空 */
    updateWearBtn(q);
    sayWKey('sea_sub_more', SUBMIT_TEXT.more);   /* T46 阶段2：提交反馈 clip 化 */
    wrongChainUntil = Date.now() + 4750;
    await wait(600 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') pointHelpNext();
    return 'wrong_more';
  }
  /* right / done：提交成 */
  lastAct = Date.now();
  if (state.tut === 'help') {                    /* 教学"独"：提交成 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  chimeGoal();
  sfx('coin');
  q.picked.forEach(i => { const el = cardEl(i); if (el) el.classList.add('lit'); });
  wearBtn.classList.remove('ready');
  const bun = sceneEl.querySelector('#bunny');
  if (bun) replayAnim(bun, 'hop');
  KIDS.voice.play('sea_cf_' + q.band + '_' + q.occ, confirmOf(q));   /* T46 阶段2：确认句 clip 化（sea_cf_* 12） */
  await wait(620 * SPEED);
  if (cur !== run) return r;
  await wait(430 * SPEED);
  if (cur !== run) return r;
  await wait(4350 * SPEED);                      /* 确认句 TTS 罩窗：总 5400 ≥ estMs(11)=4395（同上） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（审查 M3：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* sea_right：穿好啦，正合适（2544ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2544+300（sea_right 判对后窗 ≥2844） */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null)（任务书定版） */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（审查 M2/M4 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.season && sv.season.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakStem(cur.quizzes[cur.step]);              /* 开场读题面（动态 TTS） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=套装题演示（flat0 题0 恒锚定 cold|school [heavycoat,pants]）：
   幽灵手指圈注题面两条件 chips（温度→场合）→ 勾厚外套 → 勾长裤 → 按「穿好啦」提交成
   （watch 全程 ≤16s）→帮=指向下一件应选卡（勾满指提交钮）；独=提交成/反向题答对放手
   时序（家族 G/H）：watch clip 3216ms → 演示首 tap 在 t=3720（900+900+900+700+320
   ≥ 3216+300 不撞头）；提交演出窗 620+430+4350=5400 罩确认句 TTS 再收束 turn
   （watch 全程 ≈13.5s ≤16s） ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* sea_tut_watch：看！这个季节穿什么（3216ms） */
  await wait(900 * SPEED);                       /* 季节场景亮相 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 outfit cold|school [heavycoat,pants]
  /* 条件圈注 ×2（题面双条件各指一次：很冷 0° → 去上学） */
  pointGhostAt(condChip(0));
  await wait(900 * SPEED);
  pointGhostAt(condChip(1));
  await wait(900 * SPEED);
  /* 勾第 1 件（厚外套） */
  const iA = q.items.map(t => t.item).indexOf(q.need[0]);
  pointGhostAt(cardEl(iA));
  await wait(700 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r1 = await uiTapItem(iA, true);          /* demo 通道豁免 locked 门（演示吞真实输入） */
  await wait(520 * SPEED);
  /* 勾第 2 件（长裤） */
  const iB = q.items.map(t => t.item).indexOf(q.need[1]);
  pointGhostAt(cardEl(iB));
  await wait(700 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r2 = await uiTapItem(iB, true);
  await wait(520 * SPEED);
  /* 提交（勾满两件 → 穿好啦） */
  ghostToWear();
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiSubmit(true);            /* 演示提交 → 'right'（题 0 成） */
  window.__seDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  window.__seDemoSteps = [r1, r2, demoR];
  await wait(600 * SPEED);
  const sv = KIDS._save() || {};
  sv.season = sv.season || {};
  sv.season.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来挑一挑"在重发后的题面上说（照 batch5-25） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* sea_tut_turn：你来挑一挑（1752ms） */
  setTimeout(() => { if (state.tut === 'help') speakStem(cur.quizzes[cur.step]); },
    2100);                                       /* turn 1752+300 防尾截（turn 后读题延） */
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
  const q = cur.quizzes[cur.step];
  if (q) speakDirHint(q);                        /* 戳兔子=按题型方向提示 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 四门（r4 审查 m-7：补 demo/won 对齐 replayBtn） */
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  speakStem(cur.quizzes[cur.step]);              /* 再听一遍：题面句重读（动态 TTS） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点季节场景=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  replayAnim(sceneEl, 'bounce');
  speakStem(cur.quizzes[cur.step]);
});
wearBtn.addEventListener('pointerdown', e => {   /* 「穿好啦」提交（判定门在 uiSubmit） */
  e.preventDefault();
  if (!cur) return;
  lastAct = Date.now();
  replayAnim(wearBtn, 'press');
  uiSubmit();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapItem(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene') || e.target.closest('#btn-wear')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    const q = cur.quizzes[cur.step];
    if (q) speakDirHint(q);                      /* 空白探索=按题型方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（题型 hint clip + 条件区 pulse，lastDir 独立
   节流锚不重置 lastAct）/ 30s 答案级（下一件应选卡 breathe / 勾满=提交钮 breathe）
   / 教学"帮"5s 重演示 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（审查 M4）：链播完前救援不掐断 */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = nextNeededIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      else if (q.kind === 'outfit') replayAnim(wearBtn, 'breathe');
      speakStem(q);
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：题型 hint+条件区 pulse（不动 lastAct） */
    const q = cur.quizzes[cur.step];
    if (q) {
      speakDirHint(q);
      replayAnim(condsEl, 'pulse');
    }
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
  KIDS.init({ game: 'season', title: '季节衣橱' });   // 存档键 kidsgame_season（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1（winFlow 传 null） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口）
   r4 契约（SPEC r4 块）：tapItem→'pick'/'unpick'/'right'/'done'/'wrong'/false；
   tapSubmit→'right'/'done'/'wrong_more'/'wrong_less'/false ---------- */
window.SE = {
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
    return { kind: q.kind,                              /* 'outfit' | 'anti' */
             band: q.band,                              /* 气温带 id（cold/cool/hot） */
             occ: q.occ,                                /* 场合 id（anti=null） */
             season: q.season,                          /* 场景季节（cool=春/秋 seeded） */
             need: q.need.slice(),                      /* 应选物品 id 集 */
             picks: q.items.map(t => t.item),           /* 候选物品 id */
             picked: q.picked.slice(),                  /* 已勾卡下标 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapItem(i) { return uiTapItem(i); },
  tapSubmit() { return uiSubmit(); },
  async autoSolve() {                    // UI 路径自动点完当前关（套装=勾满 need→提交；反向=点 need 卡）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = nextNeededIdx(q);
      if (q.kind === 'outfit' && i < 0) {              /* 勾满 → 提交 */
        const r = await uiSubmit();
        if (r === false || r === null) break;
        continue;
      }
      if (i < 0) break;
      const r = await uiTapItem(i);
      if (r === false || r === null) break;            // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
