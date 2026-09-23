/* ================= habitat 主逻辑（r4：六族题型渲染 / 候选点选 / 动画 / 教学 / 救援 / 推进）
   玩法框架沿 v1：题面卡（动画+题面句 TTS 拼句）+ 下方 4 张候选卡。
   r4 题型六族（game-data quizText/confirmText 按 kind 拼句）：
     home 动物找家（动物飞进场景卡）/ feed 它吃什么（动物飞向所选食物卡）/
     chain 链式推理（题面只显 基食物→链中动物→?，链顶不显示——答案不可见，推理必需）/
     hib 冬眠判断（冬夜雪地题面，无动物显示——无视觉捷径）/ struct 结构-功能（特征特写图标）/
     dual 多条件交集（两枚条件芯片，无动物显示——无视觉捷径）。
   点对：home/feed=动物飞进所选卡（flypet+入住 pop）；其余题型=卡亮+星星 pop（无主体动物）；
   确认句 TTS（全 ≤15 字=v1 界，判对演出窗 5400 ≥ 15 字 SAPI 实测 4899+300）。
   点错：卡摇头 + 语义反馈——home=hab_w_<所点环境>（绑定所点环境，沿 v1）；
   新题型=hab_w_<题型>（绑定题型非所点候选），1000ms 防重入窗（b16 定案）后可重选。
   提示（兔子按钮/空白探索）按题型选播 hab_hint_<kind>（home=hab_hint）。
   救援两级（§0.60/家族 B 定版）：14s 方向级=重读题面+题面卡 pulse（lastDir 独立节流锚）；
   30s 答案级=正确候选卡 breathe（六族通用 correctIdx）。
   语音窗（家族 G/H；clip 实长浏览器 Audio 实测，habitat r4 真值表见 game-data 头注/SPEC）：
   hab_tut_watch 3144 → 教学演示 tap 延至 t=3444（3144+300，禁与收束 TTS 撞头）；
   hab_tut_turn 1776 → turn 后读题延 2100（≥1776+300 防尾截）；
   hab_right 2544 → winFlow celebrate(2620)+wait(400)=3020 ≥2850（判对后窗）；
   hab_w_* 系 2016-4440 → 错窗 1000ms 防重入可被对选打断=容忍（错反馈已播 ≥1000ms）；
   错→对路径：判对演出窗 3600ms（罩确认句 TTS ≤15 字 SAPI 4899 + 读题延 ≥1200）。
   验收钩子：window.HB = { get currentLevel, get quiz(){kind, animal, home, scenes[]{id,kind},
   step, miss, (+near|chain|hibDir|feat|conds 按题型)}, tapScene(i), start(flat),
   async autoSolve(), get tutorial }（getter 返回拷贝） */
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
/* 纠错语义反馈（hab_w_<所点环境>）：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩 P1 沉淀） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
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

/* ================= 题面语音（TTS 拼句——SPEC §3 豁免题面 clip 化，动态名不入 clip 集） ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue(quizKeys(q));                 /* T46 阶段2：题面段链/整句 clip 化（home·feed=2 段，其余整句键） */
}

/* ================= 渲染（r4 题型化题面；无捷径铁律：hib/struct/dual 题面不显示任何候选动物，
   chain 题面只显 基食物→链中动物——答案（链顶/链中）不进题面，推理必需） ================= */
function renderScene(q) {
  sceneEl.dataset.kind = q.kind;
  if (q.kind === 'home' || q.kind === 'feed') {  // 有主体动物：草地+出场+题面句
    sceneEl.dataset.animal = q.animal;
    sceneEl.setAttribute('aria-label', nameOfAnimal(q.animal) +
      (q.kind === 'feed' ? '饿了，点我再听一遍' : '在找家，点我再听一遍'));
    sceneEl.innerHTML = meadowSvg() +
      '<div class="animal-slot"><div id="pet">' + animalSvg(q.animal, 118) + '</div></div>' +
      '<div class="q-text">' + quizText(q) + '</div>';
  } else if (q.kind === 'chain') {               // 链行（无捷径铁律：答案永不进题面）：
    const c = chainById(q.chain);                // up=显 基食物→链中→?（答案=链顶隐藏）；
    const shown = q.dir === 'up' ? c.mid : c.top; // down=显 基食物→?→链顶（答案=链中隐藏）
    sceneEl.dataset.animal = shown;
    sceneEl.setAttribute('aria-label', '谁吃谁的问题，点我再听一遍');
    sceneEl.innerHTML = meadowSvg() +
      '<div class="chain-row"><span class="ch-ico">' + foodSvg(c.base, 62) + '</span>' + ARROW_R +
      (q.dir === 'up'
        ? '<span class="ch-ico ch-animal" data-animal="' + c.mid + '">' + animalSvg(c.mid, 70) + '</span>' + ARROW_R +
          '<span class="ch-q">?</span>'
        : '<span class="ch-q">?</span>' + ARROW_R +
          '<span class="ch-ico ch-animal" data-animal="' + c.top + '">' + animalSvg(c.top, 70) + '</span>') +
      '</div>' +
      '<div class="q-text">' + quizText(q) + '</div>';
  } else if (q.kind === 'hib') {                 // 冬夜雪地 + 月牙Zz（无动物——无捷径）
    sceneEl.dataset.animal = '';
    sceneEl.setAttribute('aria-label', '冬天睡觉的问题，点我再听一遍');
    sceneEl.innerHTML = nightSvg() +
      '<div class="sleep-ico">' + sleepSvg() + '</div>' +
      '<div class="q-text">' + quizText(q) + '</div>';
  } else if (q.kind === 'struct') {              // 特征特写图标（无动物）
    sceneEl.dataset.animal = '';
    sceneEl.setAttribute('aria-label', '身体特点的问题，点我再听一遍');
    sceneEl.innerHTML = meadowSvg() +
      '<div class="feat-ico">' + featSvg(q.feat, 92) + '</div>' +
      '<div class="q-text">' + quizText(q) + '</div>';
  } else {                                       /* dual：两枚条件芯片（无动物） */
    const d = dualById(q.pair);
    sceneEl.dataset.animal = '';
    sceneEl.setAttribute('aria-label', '两个条件找动物，点我再听一遍');
    sceneEl.innerHTML = meadowSvg() +
      '<div class="cond-chips"><span class="chip">' + condSvg(d.a, 52) + '<i>' + CONDS[d.a].text + '</i></span>' +
      '<span class="chip-plus">＋</span>' +
      '<span class="chip">' + condSvg(d.b, 52) + '<i>' + CONDS[d.b].text + '</i></span></div>' +
      '<div class="q-text">' + quizText(q) + '</div>';
  }
}
function renderBoard(q) {                        // 候选卡排（按题型：环境/食物/动物/能力卡）
  boardEl.innerHTML = '';
  q.scenes.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'card pop';
    b.dataset.i = i;
    b.dataset.kind = s.kind;                     // verify 对账（渲染即引擎）
    let inner, label = '';
    if (q.kind === 'home') {
      inner = '<span class="gwrap env">' + envSvg(s.kind) + '</span>';
      b.setAttribute('aria-label', nameOfEnv(s.kind) + '场景卡');
    } else if (q.kind === 'feed') {
      inner = '<span class="gwrap gen">' + foodSvg(s.kind, 86) + '</span>';
      label = nameOfFood(s.kind);
      b.setAttribute('aria-label', nameOfFood(s.kind) + '食物卡');
    } else if (q.kind === 'struct') {
      inner = '<span class="gwrap gen">' + abilitySvg(s.kind, 78) + '</span>';
      label = ABILITY[s.kind].n;
      b.setAttribute('aria-label', ABILITY[s.kind].n + '本领卡');
    } else {                                     // chain/hib/dual：动物卡（无文字——物种辨识即考查）
      inner = '<span class="gwrap gen">' + animalSvg(s.kind, 92) + '</span>';
      b.setAttribute('aria-label', nameOfAnimal(s.kind) + '动物卡');
    }
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = inner + (label ? '<i class="lbl">' + label + '</i>' : '');
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

/* ================= 动物回家动画：动物从题面飞到所选候选卡（.flypet 克隆体 CSS transition §0.11）
   飞行结束后：入住小动物 pop 置于卡内（.pet-in）；verify 页跳飞行直接入住。
   r4：home/feed 有主体动物走飞行；chain/hib/struct/dual 无主体（或不许露答案）
   → starCard 星星 pop（同一 .pet-in 槽位动画） ---------- */
function flyAnimal(el, animal, run) {
  const settle = () => {
    if (run && cur !== run) return;                        // 演出窗内重玩已重建关卡：丢弃迟到入住
    if (!el || !el.isConnected) return;                    // 场景已换题重建：丢弃迟到入住
    if (!el.querySelector('.pet-in')) {
      const inw = document.createElement('div');
      inw.className = 'pet-in';
      inw.innerHTML = animalSvg(animal, 48);
      el.appendChild(inw);
    }
    const pet = sceneEl.querySelector('#pet');
    if (pet) replayAnim(pet, 'hop');                       // 题面动物开心跳一下
  };
  if (VERIFY || !el) { settle(); return; }
  const pet = sceneEl.querySelector('#pet');
  if (!pet) { settle(); return; }
  const from = pet.getBoundingClientRect();
  const to = el.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'flypet';
  fly.innerHTML = animalSvg(animal, 58);
  fly.style.left = from.left + 'px';
  fly.style.top = from.top + 'px';
  fly.style.transitionDuration = '560ms';
  document.body.appendChild(fly);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  requestAnimationFrame(() => {
    fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.4)';
  });
  setTimeout(() => { fly.remove(); settle(); }, 580);
}
/* 无主体题型答对：星星 pop 进所选卡（chain/hib/struct/dual） */
function starCard(el, run) {
  if (run && cur !== run) return;
  if (!el || !el.isConnected) return;
  if (!el.querySelector('.pet-in')) {
    const inw = document.createElement('div');
    inw.className = 'pet-in';
    inw.innerHTML = ICONS.star;
    el.appendChild(inw);
  }
}
/* r4 题型化提示语音（兔子按钮/空白探索按当前题 kind 选播；home=基础 hint） */
const hintVoiceOf = q => (q && HINT_VOICE[q.kind]) || VOICE.hint;

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
/* 教学"帮"阶段指向：当前题正确场景卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点场景主路径（真实点击 / HB.tapScene / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（场景卡排容器 bump 微动效——家族 D）；
   错点 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）========== */
async function uiTapScene(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapScene(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  const el = cardEl(i);

  if (r === 'wrong') {                           /* 答错：摇头+语义反馈 clip，卡不灰可重选 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    if (q.kind === 'home') {                     /* home：绑定所点环境（SPEC §3 沿 v1） */
      const tapped = q.scenes[i].kind;
      sayW(WVOICE[tapped].key, WVOICE[tapped].text);
    } else {                                     /* r4 新题型：绑定题型（hab_w_feed 等） */
      sayW(WVOICE_KIND[q.kind].key, WVOICE_KIND[q.kind].text);
    }
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms（b16 定案） */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：动物飞进所选卡入住/星星 pop+确认句 TTS） ---- */
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
  if (q.animal) flyAnimal(el, q.animal, run);    /* home/feed：主体动物飞入 */
  else starCard(el, run);                        /* chain/hib/struct/dual：星星 pop */
  const cKeys = confirmKeys(q);
  KIDS.voice.queue(cKeys);                       /* T46 阶段2：确认段链 clip 化（home 5 段/feed·hib·dual 3 段/整句单键） */
  await wait(1800 * SPEED);                      /* 飞行动物+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait(Math.max(3600, chainMs(cKeys) + CONFIRM_PAD - 1800) * SPEED);
                                                /* T46 确认链收尾窗：max(estMs 窗 5400, 链实长+PAD)——home 5 段链
                                                   最长 8232 超 5400，clip 链口径动态补足（calendar/shapecount 先例）；
                                                   错→对路径读题延 ≥5400 防错反馈链掐在 <500ms */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（动物/场景全换）+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致；禁 (ci+1)%4 章序推进，
     r4 审查 M-1：按 flat 位置推算约 75% 生成关预告与实际章型不符——cir/season 同构修正） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* hab_right：到家啦，真开心（2544ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2544+300（hab_right 判对后窗 ≥2850） */
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
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.habitat && sv.habitat.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面（TTS 拼句） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示送小鱼回池塘（flat0 题0 恒 fish——确定性锚点，动物飞进池塘卡+入住）
   →帮=指向正确场景卡；独=首次选对放手（watch 全程 ≤16s）
   时序（家族 G/H）：watch clip 3144ms → 演示 tap 延至 t=3444（900+2544 ≥ 3144+300），
   判对确认句 TTS 不与 watch 撞头；演示演出窗 3600 罩确认句 TTS 再收束 turn ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* hab_tut_watch：看！送小动物回家（3144ms） */
  await wait(900 * SPEED);                       /* 动物出场亮相 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 animal=fish（→pond）
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));
  await wait(2544 * SPEED);                      /* t=3444 ≥ watch 3144+300：clip 播完再演示（不撞头） */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapScene(idx, true);     /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__hbDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  await wait(500 * SPEED);                       /* 收尾（确认句 TTS 仍在播，由 uiTapScene 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.habitat = sv.habitat || {};
  sv.habitat.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来送一送"在重发后的题面上说（照 batch5-24） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* hab_tut_turn：你来送一送（1776ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2100);                                      /* ≥1776+300 防尾截（turn 后读题延） */
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
  const hv = hintVoiceOf(cur.quizzes[cur.step]); /* 戳兔子=按题型方向提示（r4 选播） */
  sayR(hv.key, hv.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 四门（r4 审查 m-12：补 demo/won 对齐 replayBtn） */
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  speakQuiz();                                   /* 再听一遍：题面 TTS 重读 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  replayAnim(sceneEl, 'bounce');
  speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapScene(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    const hv = hintVoiceOf(cur.quizzes[cur.step]);   /* 空白探索=按题型方向提示（r4 选播） */
    sayR(hv.key, hv.text);
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+题面卡 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确场景卡 breathe）/ 教学"帮"5s 重演示 */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
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
  KIDS.init({ game: 'habitat', title: '动物家园' });   // 存档键 kidsgame_habitat（core VER 1.0，家族 C）
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
window.HB = {
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
    const o = { kind: q.kind,                              /* r4 题型（home|feed|chain|hib|struct|dual） */
             animal: q.animal || null,                     /* 题面主体动物 id（home/feed；其余 null） */
             home: q.home,                                 /* 正确候选 id（空间随 kind：环境/食物/动物/能力） */
             scenes: q.scenes.map(s => ({ id: s.id, kind: s.kind })),   /* {id,kind} 契约字段 */
             step: cur.step,
             miss: q._miss || 0 };
    if (q.kind === 'home') o.near = !!q.near;
    if (q.kind === 'chain') { const c = chainById(q.chain); o.chain = { base: c.base, mid: c.mid, top: c.top, dir: q.dir }; }
    if (q.kind === 'hib') o.hibDir = q.dir;
    if (q.kind === 'struct') o.feat = q.feat;
    if (q.kind === 'dual') { const d = dualById(q.pair); o.conds = { a: d.a, b: d.b }; }
    return o;
  },
  tapScene(i) { return uiTapScene(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点应选场景，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const i = correctIdx(q);
      if (i < 0) break;
      const r = await uiTapScene(i);
      if (r === false || r === null) break;      // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
