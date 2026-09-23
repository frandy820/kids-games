/* ================= weather 主逻辑 v2（条件推理 / 提交制 / 教学演示 / 救援 / 推进）
   玩法：题面 = 条件区 chips（天气/体感/场景/温度/人物）+ 场景卡（天气动画/温度计/角色）+ TTS 题面句，
   下方 4-6 张衣物卡。单件题（one/temp 单装/who/anti）点对即换装推进、点错=摇头+语义反馈；
   多件题（multi/temp 两件装）点卡=勾选切换（飞到角色身上挂 badge），选满点「穿好啦」提交：
   勾对全集=推进 / 含错件=清空重选+miss（wrong_more）/ 未选满=保留继续找（wrong_less）。
   救援两级（§0 独立节流锚）：14s 方向级=按题型 hint clip（multi/temp/who/anti 新 4 条；one=wea_q_*）
   + 条件区 pulse；30s 答案级=下一件应选卡 breathe（选满=提交钮 breathe）。
   验收钩子：window.WE = { get currentLevel, get quiz(){kind,conds[],picks[],need,picked[],step,miss},
   tapCloth(i), tapSubmit(), tapCard(i)(既有别名), start(flat), async autoSolve(), get tutorial }
   r9：单关时长硬断言 estMs 家族定版 n*345+600（game-data 定义 quizDurMs/levelDurMs 源模型，
   verify 独立副本+build 字面四处同步）；nextHint 生成关实算 genLevel(f+1).dch（契约 F） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 动态句（temp/who 题面句，含温度数词无 clip）：TTS 兜底（bubble 先例） */
const sayTextR = t => { if (cur) KIDS.voice.say(t); };
let lastWrongVoice = 0;                          // 纠错语义反馈：flat<3 每错必播；flat≥3 走 10s 节流
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const sceneEl = $id('scene'), condsEl = $id('conds'), boardEl = $id('board'),
      wearBtn = $id('btn-wear'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

/* 'one' 方向级救援用天气题面 clip（文案与 manifest 严格一致） */
const Q_CLIP = {
  sun:  { key: 'wea_q_sun',  text: '太阳晒晒，穿什么' },
  rain: { key: 'wea_q_rain', text: '下雨啦，穿什么' },
  snow: { key: 'wea_q_snow', text: '下雪啦，穿什么' },
  wind: { key: 'wea_q_wind', text: '刮风啦，穿什么' }
};

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastDir = Date.now();                       /* 方向级节流锚（独立于 lastAct——30s 答案级可达） */
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

/* ================= 题面语音（T46：静态 17 句 wea_st_ + temp/who 封闭域 21 句 wea_tt_/wea_tw_ 全 clip 化） ================= */
function speakStem(q) {
  if (!q) return;
  const k = stemKeyOf(q);                        /* 静态 stem（one/multi/anti）→ wea_st_{i} */
  if (k) sayR(k, q.stem);
  else sayTextR(q.stem);                         /* 理论不可达（全题型有键）；防御兜底 */
}
/* 按题型方向 hint（14s 救援）：one=天气题面 clip（scene 由条件区 pulse 补充）；余=新 4 条 hint clip */
function speakDirHint(q) {
  if (!q) return;
  if (q.kind === 'one') {
    const c = Q_CLIP[q.conds[0].v];
    if (c) sayR(c.key, c.text);
  } else if (q.kind === 'multi') sayR(VOICE.hintMulti.key, VOICE.hintMulti.text);
  else if (q.kind === 'temp') sayR(VOICE.hintTemp.key, VOICE.hintTemp.text);
  else if (q.kind === 'who') sayR(VOICE.hintWho.key, VOICE.hintWho.text);
  else sayR(VOICE.hintAnti.key, VOICE.hintAnti.text);
}
/* 单件题错选语义反馈：one=wea_w_* 天气错配；temp/who/anti=题型 hint（温和引导非评判） */
function speakWrong(q) {
  if (q.kind === 'one') {
    const w = q.conds[0].v;
    const key = VOICE.wrongKeyOf(w);
    const TXT = { sun: '天热穿这么多会出汗哦', rain: '下雨穿这个会淋湿哦',
                  snow: '天冷穿这个会冻着哦', wind: '刮风啦，穿件小外套正合适' };
    if (TXT[w]) sayW(key, TXT[w]);
  } else if (q.kind === 'temp') sayW(VOICE.hintTemp.key, VOICE.hintTemp.text);
  else if (q.kind === 'who') sayW(VOICE.hintWho.key, VOICE.hintWho.text);
  else sayW(VOICE.hintAnti.key, VOICE.hintAnti.text);
}

/* ================= 渲染 ================= */
const COND_NAME = {
  sun: '晴天', rain: '下雨', snow: '下雪', wind: '刮风', cold: '很冷', hot: '很热',
  school: '去上学', puddle: '踩水坑', beach: '去沙滩', swim: '去游泳',
  snowman: '堆雪人', snowwalk: '踩雪', park: '去公园'
};
function renderScene(q) {                        // 场景卡：天气动画 / 温度计 / 反向场景 + 角色 + 换装 badge 槽
  sceneEl.dataset.kind = q.kind;
  let sky = '', who = 'bunny';
  if (q.kind === 'temp') sky = thermoSvg(q.temp);
  else if (q.kind === 'who') { sky = thermoSvg(q.temp); who = q.person; }
  else if (q.kind === 'anti') sky = sceneSvg(q.scene);
  else sky = sceneSvg(q.scene);                  // one/multi：天气动画
  const charHtml = who === 'mom'
    ? momSvg(92)
    : KIDS.assets.rabbit('normal', 96);
  sceneEl.setAttribute('aria-label', '题目场景，点我再听一遍');
  sceneEl.innerHTML = sky +
    '<div class="bunny-slot"><div id="bunny-wear" aria-hidden="true"></div>' +
    '<div id="bunny" class="' + (who === 'mom' ? 'is-mom' : '') + '">' + charHtml + '</div></div>';
  renderWear(q);
}
function renderWear(q) {                         // 换装 badge = 当前已勾选衣物（multi 同步勾选态）
  const wear = sceneEl.querySelector('#bunny-wear');
  if (!wear) return;
  wear.innerHTML = '';
  (q.picked || []).forEach(i => {
    const b = document.createElement('span');
    b.className = 'wear';
    b.innerHTML = clothSvg(q.cards[i].id, 36);
    wear.appendChild(b);
  });
}
function renderConds(q) {                        // 条件区 chips：题面条件的图形化（幽灵手教学圈注锚点）
  condsEl.innerHTML = '';
  condsEl.dataset.kind = q.kind;
  q.conds.forEach((c, idx) => {
    const d = document.createElement('div');
    d.className = 'chip';
    d.dataset.ci = idx;
    if (c.k === 'weather') {
      d.setAttribute('aria-label', COND_NAME[c.v] || c.v);
      d.innerHTML = chipSvg('weather', c.v);
    } else if (c.k === 'scene') {
      d.setAttribute('aria-label', COND_NAME[c.v] || c.v);
      d.innerHTML = chipSvg('scene', c.v);
    } else if (c.k === 'temp') {
      d.classList.add('istemp');
      d.setAttribute('aria-label', '温度' + c.v + '度');
      d.innerHTML = tempChipHtml(c.v);
    } else {                                     // person：头像+怕冷/怕热 badge
      d.classList.add('isper');
      const p = PERSONS[c.v];
      d.setAttribute('aria-label', p.n + (p.feel === 'cold' ? '怕冷' : '怕热'));
      d.innerHTML = (c.v === 'mom' ? momSvg(46) : KIDS.assets.rabbit('normal', 46)) +
        '<span class="pbadge">' + chipSvg('weather', p.badge).replace('width="44" height="44"', 'width="24" height="24"') + '</span>';
    }
    condsEl.appendChild(d);
  });
}
function renderBoard(q) {                        // 衣物卡排（4-6 张；SVG 零文字标签 §0.19；勾选态复绘）
  boardEl.innerHTML = '';
  q.cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card pop' + (q.picked.indexOf(i) >= 0 ? ' held' : '');
    b.dataset.i = i;
    b.dataset.cid = c.id;                        // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', nameOf(c.id));
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="gwrap">' + clothSvg(c.id) + '</span>' +
      '<span class="check" aria-hidden="true">' + ICONS.check + '</span>';
    boardEl.appendChild(b);
  });
}
function updateWearBtn(q) {                      // 「穿好啦」：多件题才出现；勾满 need=pulse 呼吸邀请
  if (!q) { wearBtn.classList.remove('show', 'ready'); return; }
  const multi = q.need.length > 1;
  wearBtn.classList.toggle('show', multi);
  if (!multi) { wearBtn.classList.remove('ready'); return; }
  const got = q.picked.filter(i => q.need.indexOf(q.cards[i].id) >= 0).length;
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

/* ================= 换装动画：衣物从卡飞到角色身上（.flywear 克隆体 CSS transition §0.11） */
function flyWear(el, id, run) {
  const addBadge = () => {
    if (run && cur !== run) return;                       // 演出窗内重玩已重建关卡：丢弃迟到 badge
    const q = cur && cur.quizzes[cur.step];
    renderWear(q || { picked: [], cards: [] });           // badge 与勾选态同步（幂等重绘）
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
  fly.innerHTML = clothSvg(id, 52);
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
/* 教学"帮"阶段指向：多件题未勾满指 need 卡 / 勾满指「穿好啦」；单件题指 right 卡 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.need.length > 1) {
    const i = nextNeededIdx(q);
    if (i >= 0) pointGhostAt(cardEl(i));
    else ghostToWear();
  } else {
    const i = nextNeededIdx(q);
    if (i >= 0) pointGhostAt(cardEl(i));
  }
}

/* ================= 点卡主路径（真实点击 / WE.tapCloth / autoSolve / 教学演示共用）
   单件题：right/done=推进+换装 / wrong=摇头+语义反馈+1000ms 防重入窗
   多件题：pick/unpick=勾选切换（badge 同步）——判定在 uiSubmit ---------- */
async function uiTapCloth(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCloth(cur, i);
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
    flyWear(el, q.cards[i].id, run);
    updateWearBtn(q);
    await wait(300 * SPEED);
    if (state.tut === 'help') pointHelpNext();
    return 'pick';
  }
  if (r === 'wrong') {                           /* 单件题答错：摇头+语义反馈，卡不灰可重选 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    speakWrong(q);
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms（b16 定案） */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right / done（单件题答对：亮卡+换装飞行+推进） ---- */
  lastAct = Date.now();
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  chimeGoal();
  sfx('coin');
  flyWear(el, q.cards[i].id, run);
  await wait(620 * SPEED);                       /* 亮卡停半拍 */
  if (cur !== run) return r;
  await wait(430 * SPEED);                       /* 换装飞行窗 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（场景/条件/卡/badge 全换）+读题 */
  return r;
}

/* ================= 提交主路径（「穿好啦」/ WE.tapSubmit / autoSolve / 教学演示共用）
   返回：'right'（含末题 done 内部走 winFlow）/ 'wrong_more'（含错件：清空重选+miss）/
   'wrong_less'（未选满：保留继续）/ false（吞输入/单件题不适用） ---------- */
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
    sayW(SUBMIT_TEXT.less.key, SUBMIT_TEXT.less.text);   /* wea_sub_less（T46 阶段2 clip 化） */
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
    sayW(SUBMIT_TEXT.more.key, SUBMIT_TEXT.more.text);   /* wea_sub_more（T46 阶段2 clip 化） */
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
  await wait(620 * SPEED);
  if (cur !== run) return r;
  await wait(430 * SPEED);
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();
  return 'right';
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4 静态=CHAPTERS[floor(f/5)+1]，契约 M1）；
     生成关禁 (ci+1)%N 字面——实算下一关 genLevel(f+1).dch（契约 F，r9 修复） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* wea_right：穿得刚刚好，出门啦 */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* M2 修复（2026-09-13 审查）：null 会按重玩关算章=错章预告，统一 lim-1 与启动处同款 */
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.weather && sv.weather.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakStem(cur.quizzes[cur.step]);              /* 开场读题面（§0.5） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=ch2 型双条件演示（flat0 题0 恒锚定 cm0=雨+风 [raincoat,jacket]）：
   幽灵手指出题面两条件圈注（chip0 雨→chip1 风）→ 先勾雨衣（与 wea_tut_watch 文案一致）
   → 再勾小外套 → 按「穿好啦」提交成（watch 全程 ≤16s）
   →帮=指向下一件应选卡（勾满指提交钮）；独=提交成/单件题答对放手（勾选不触发，审查 m2 勘误） */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* wea_tut_watch：看！下雨要穿雨衣 */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                      // flat0 题0 恒 multi cm0 need=[raincoat,jacket]
  /* 条件圈注 ×2（题面两条件各指一次） */
  pointGhostAt(condChip(0));
  await wait(900 * SPEED);
  pointGhostAt(condChip(1));
  await wait(900 * SPEED);
  /* 勾选雨衣（首件——与 watch clip 文案动作一致） */
  const iRain = q.cards.map(c => c.id).indexOf('raincoat');
  pointGhostAt(cardEl(iRain));
  await wait(700 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r1 = await uiTapCloth(iRain, true);      /* demo 通道豁免 locked 门（演示吞真实输入） */
  await wait(520 * SPEED);
  /* 勾选小外套（第二件——另一个条件） */
  const iJack = q.cards.map(c => c.id).indexOf('jacket');
  pointGhostAt(cardEl(iJack));
  await wait(700 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r2 = await uiTapCloth(iJack, true);
  await wait(520 * SPEED);
  /* 提交（选满两件 → 穿好啦） */
  ghostToWear();
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiSubmit(true);            /* 演示提交 → 'right'（题 0 成） */
  window.__weDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  window.__weDemoSteps = [r1, r2, demoR];
  await wait(600 * SPEED);
  const sv = KIDS._save() || {};
  sv.weather = sv.weather || {};
  sv.weather.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来选一选"在重发后的题面上说（照 batch5-22） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);
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
  if (q) speakStem(q);                           /* 戳兔子重读题面 */
  else sayP(VOICE.hint.key, VOICE.hint.text);
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
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  speakStem(cur.quizzes[cur.step]);              /* 再听一遍：题面重读（TTS） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点场景=重听题面（儿童高发探索动作） */
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
  uiTapCloth(Number(p.dataset.i));
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
    if (q && q.kind === 'one' && q.conds[0].v === 'rain') sayR(VOICE.hint.key, VOICE.hint.text);   /* 雨题=hint clip（雨语境句） */
    else if (q) speakStem(q);
  }
});

/* ================= 无操作看护：14s 方向级（题型 hint clip + 条件区 pulse）
   / 30s 答案级（下一件应选卡 breathe / 勾满=提交钮 breathe）/ 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = nextNeededIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      else if (q.need.length > 1) replayAnim(wearBtn, 'breathe');
      speakStem(q);
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：题型 hint+条件区 pulse（不重置 lastAct） */
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
  KIDS.init({ game: 'weather', title: '天气穿衣' });   // 存档键 kidsgame_weather（core VER 1.0）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })          /* §0.4 防跳章（winFlow 同款） */;
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.WE = {
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
    return { kind: q.kind,                                  /* SPEC v2 钩子契约 */
             conds: q.conds.map(c => ({ k: c.k, v: c.v })),
             picks: q.cards.map(c => c.id),                 /* 候选衣物 id */
             need: q.need.length === 1 ? q.need[0] : q.need.slice(),   /* 单件=id / 多件=id 集 */
             picked: q.picked.slice(),
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapCloth(i) { return uiTapCloth(i); },
  tapSubmit() { return uiSubmit(); },
  tapCard(i) { return uiTapCloth(i); },          /* 款内既有钩子名别名（外部旧脚本兼容） */
  async autoSolve() {                    // UI 路径自动点完当前关（单件=点 right 卡；多件=勾满 need→提交）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.need.length > 1) {
        const i = nextNeededIdx(q);
        if (i < 0) {                                  /* 勾满 → 提交 */
          const r = await uiSubmit();
          if (r === false || r === null) break;
          continue;
        }
        const r = await uiTapCloth(i);
        if (r === false || r === null) break;         // 锁死/重玩保护
        taps++;
      } else {
        const i = nextNeededIdx(q);
        if (i < 0) break;
        const r = await uiTapCloth(i);
        if (r === false || r === null) break;
        taps++;
      }
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
