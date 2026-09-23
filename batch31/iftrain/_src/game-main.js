/* ================= iftrain 主逻辑 v2（r3 难度改造）
   玩法：题面=情境/装备大图（multi/conflict 双情境并排）+ 小字名 + 题面句
   （single/conflict→rai_q1 / multi/best→rai_q_two / ruleback→rai_q2——名音 clip 拼播，
   全 clip 无 keyless，契约 N 天然安全；「如果下雨」语义由情境名音前缀承载，SPEC §2 定版
   禁 TTS 拼长句）；下方候选图卡恒 4（图+小字名，图主文辅）。
   单答案题型（single/conflict/ruleback）点卡即判；提交题型（multi/best——照 weather v2
   先例）：点卡=勾选切换（.held+check 徽章，零惩罚），勾满点「带好啦」#btn-go 提交：
   勾对全集=推进 / 含错件=清空重选+miss（wrong_more=rai_more）/ 未选满=保留继续
   （wrong_less=rai_less）。
   点对=卡亮+rai_right+need 名音逐件拼播（确认链全 clip 无 keyless——契约 N）；
   点错=卡摇头+rai_wrong+回锚名音（single=情境名 / conflict=key 情境名 / ruleback=装备名）
   +语义句 TTS（正向「再看看外面是什么天气」/ruleback「再想想什么时候用它」，keyless 恒
   链尾）+题面大图再 pulse 方向级回锚，1000ms 防重入窗后可重选（探索不罚）。
   救援：14s 方向级=重读题面+大图 pulse（lastDir 独立节流锚）；30s 答案级=下一件应选卡
   breathe（提交题勾满=提交钮 breathe）+重读题面；错反馈链豁免窗 8000 让路（契约 I）。
   验收钩子：window.IF = { get currentLevel, get quiz(){kind,conds,ask,opts[]{anim},answer,
   need[],picked[],step,miss}, tapOpt(i), tapSubmit(), start(flat), async autoSolve(),
   get tutorial }（getter 返回拷贝；verify 页与真实页都暴露——b29 坑⑥） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（救援 interval 让路，契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};
const sayWOne = (v) => {                       /* 单段 clip 反馈（提交 less/more——同节流口径） */
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.play(v.key, v.text); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(v.key, v.text); return true; }
  return false;
};

const sceneEl = $id('scene'), boardEl = $id('board'), goBtn = $id('btn-go'),
      bunnyBtn = $id('btn-bunny'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
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
const shownIds = q => (q.kind === 'ruleback' ? [q.ask] : q.conds.slice());   // 题面出示 id 序

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  bunnyBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  goBtn.innerHTML = ICONS.go + '<div class="go-name">带好啦</div>';
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（开题链=名音×N+题面句拼播，全 clip 无 keyless——契约 N 安全；
   家族 G 链后窗：multi 最长 1584+150+1584+150+rai_q_two 1944=5562，读题异步不占 UI 等待窗） */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const ask = shownIds(q).map(nameClip);
  const qk = q.kind === 'ruleback' ? VOICE.q2.key
           : isSubmitKind(q.kind) ? VOICE.qTwo.key : VOICE.q1.key;
  KIDS.voice.queue(ask.concat([qk]));
}
/* 重听路径（hear/题面共用）：重播开题链+大图再 pulse（方向级回锚） */
function replayQuiz(withPulse) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  speakQuiz();
  if (withPulse) pulseAsk();
}
/* 方向级回锚：题面大图再 pulse（错反馈/重听/救援共用） */
function pulseAsk() {
  if (sceneEl) replayAnim(sceneEl, 'pulse');
}
/* 方向提示（小兔子/救援按题型分流——weather v2 先例）：multi/best/conflict 专用 hint clip */
function hintVoiceOf(q) {
  return q.kind === 'multi' ? VOICE.hMulti
       : q.kind === 'best' ? VOICE.hBest
       : q.kind === 'conflict' ? VOICE.hConflict
       : VOICE.hint;
}

/* ================= 渲染 ================= */
const Q_TEXT = { single: VOICE.q1.text, conflict: VOICE.q1.text,
                 multi: VOICE.qTwo.text, best: VOICE.qTwo.text, ruleback: VOICE.q2.text };
function renderScene(q) {                        // 题面：天空垫 + 情境/装备大图（双条件并排）+ 小字名 + 题面句
  sceneEl.dataset.kind = q.kind;
  sceneEl.dataset.ask = shownIds(q).join('+');   // 帧内容锚（契约 M：verify 断言）
  const shown = shownIds(q);
  sceneEl.setAttribute('aria-label', shown.map(nameOf).join('，') + '，点我再听一遍');
  const slotHtml = shown.map(id =>
    '<div class="ask-mini"><div class="ask-shadow" aria-hidden="true"></div>' + itemSvg(id, 144) + '</div>').join('');
  sceneEl.innerHTML = '<div class="ask-slot' + (shown.length > 1 ? ' multi' : '') + '">' + slotHtml + '</div>' +
    '<div class="ask-name">' + shown.map(nameOf).join('，') + '</div>' +
    '<div class="q-text">' + Q_TEXT[q.kind] + '</div>';
}
function renderBoard(q) {                        // 候选图卡排恒 4（图+小字名+勾选徽章）
  boardEl.innerHTML = '';
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop' + (q.picked.indexOf(i) >= 0 ? ' held' : '');
    b.dataset.i = i;
    b.dataset.anim = o.anim;                     // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', nameOf(o.anim) + '图卡');
    b.innerHTML = itemSvg(o.anim, 92) + '<span class="check" aria-hidden="true">' + ICONS.check + '</span>' +
      '<div class="c-name">' + nameOf(o.anim) + '</div>';
    b.style.animationDelay = (i * 70) + 'ms';
    boardEl.appendChild(b);
  });
}
/* 「带好啦」提交钮：提交题型才出现；勾满 need 数=.ready 呼吸邀请（计数驱动，不泄答案） */
function updateGoBtn(q) {
  const multi = q && isSubmitKind(q.kind);
  goBtn.classList.toggle('show', !!multi);
  goBtn.classList.toggle('ready', !!multi && q.picked.length === q.need.length);
}
function syncHeld(q, i) {                        // 勾选态增量同步（pick/unpick 后）
  const el = cardEl(i);
  if (el) el.classList.toggle('held', q.picked.indexOf(i) >= 0);
  updateGoBtn(q);
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  updateGoBtn(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();   // 开题读题（教学演示期静默）
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

/* ================= 答对演出：大图跳 + 小兔子滑入示范（确认句拼播由 uiTapOpt/uiSubmit 播）
   verify 页跳过装饰直接落定 ================= */
function celebrateScene(run) {
  const slot = sceneEl.querySelector('.ask-slot');
  if (slot) replayAnim(slot, 'jump');
  if (!sceneEl.querySelector('.demo-pet')) {
    const pet = document.createElement('div');
    pet.className = 'demo-pet';
    pet.innerHTML = KIDS.assets.rabbit('happy', 54);   /* 小兔子开心示范 */
    sceneEl.appendChild(pet);
    requestAnimationFrame(() => pet.classList.add('show'));
  }
  hopBunny();
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
/* 教学"帮"阶段指向：当前题下一件应选卡（勾满指提交钮） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = nextNeededIdx(q);
  pointGhostAt(i >= 0 ? cardEl(i) : goBtn);
}

/* ================= 点卡主路径（真实点击 / IF.tapOpt / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错防重入窗/判对演出窗共用 locked 门；错点 1000ms 防重入窗（b16 定案）========== */
async function uiTapOpt(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  /* b31 复验修（2026-09-11）：错链豁免窗（真时钟）内错点吞——locked 窗 verify 页乘 SPEED 缩水防
     40ms 漏点（b30 家族 T7 口径 miss 只+1）；对选放行（缓解 b30 P1-1 吞输入急性子观察）；
     窗后第二错照常计 miss（miss≥2 梯度脚手架可达）。v2：仅单答案题型适用（提交题型无 answer
     判定、且不设错链豁免窗——勾选切换零惩罚不吞） */
  if (!demo && !isSubmitKind(q.kind) && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump

  if (r === 'pick' || r === 'unpick') {          /* 提交题型勾选切换（零惩罚，不判对错） */
    lastAct = Date.now();                        /* 主动操作重置救援钟（§0.7a） */
    sfx('pop');
    syncHeld(q, i);
    return r;
  }

  if (r === 'wrong') {                    /* 答错：摇头+rai_wrong+回锚名音+语义句（keyless 恒链尾）+大图 pulse */
    state.locked = true;
    const el = cardEl(i);
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    /* 回锚名音：single/best=情境名 / conflict=key（必须）情境名 / ruleback=装备名 */
    const anchorId = q.kind === 'ruleback' ? q.ask
                   : q.kind === 'conflict' ? q.key : q.conds[0];
    const parts = [VOICE.wrong.key,              /* rai_wrong 1656 在前 */
      nameClip(anchorId),                        /* 回锚名音中段（重读主体） */
      { key: q.kind === 'ruleback' ? 'rai_again_back' : 'rai_again_apply',
        text: q.kind === 'ruleback' ? BACK_AGAIN : APPLY_AGAIN }];   /* 语义句 clip 键段尾（T46 阶段2，text=TTS 兜底） */
    if (sayW(parts))
      wrongChainUntil = Date.now() + 8000;      /* 链豁免：apply 1656+150+1584+150+2904+300=6744 / back
                                                   1656+150+1632+150+2856+300=6744（契约 I，clip 实长口径） */
    pulseAsk();                                  /* 方向级：题面大图再 pulse（看清楚情境/装备再想） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由 wrongChainUntil 让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：大图跳+兔子示范+确认句拼播） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopBunny();
  }
  state.locked = true;
  finishQuestion(r, run, [q.answer]);
  return await finishWait(r, run);
}

/* ================= 答对收尾（单答案 tap 与 提交 submit 共用）：
   lit 高亮下标集 + 确认链 rai_right+need 名音逐件拼播 + 演出窗。
   窗 1600+4800=6400 ≥ 确认链最长 2544+150+1632+150+1536+300=6312（multi/best 两件名音
   fan+sunhat 同题共存；SPEC §4 r3 实长表——家族 G/H） ================= */
async function finishQuestion(r, run, litIdx) {
  const q = cur.quizzes[cur.step - 1] || run.quizzes[run.step];   /* 已推进：取刚完成的题 */
  litIdx.forEach(i => { const el = cardEl(i); if (el) { el.classList.remove('breathe'); el.classList.add('lit'); } });
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateScene(run);          /* 大图跳 + 小兔子滑入示范 */
  const names = q.need.map(nameClip);
  KIDS.voice.queue([VOICE.right.key].concat(names));   /* 确认链：选对啦真厉害+真值名音逐件（全 clip 无 keyless） */
}
async function finishWait(r, run) {
  await wait(1600 * SPEED);                      /* 大图跳+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait(4800 * SPEED);                      /* 确认链收尾窗：总 6400 ≥ 6312（家族 G/H，§4 r3 表） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { updateGoBtn(null); winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（大图/卡全换）+读题 */
  return r;
}

/* ================= 提交主路径（「带好啦」/ IF.tapSubmit / autoSolve / 教学共用）
   返回：'right'（含末题 done 内部走 winFlow）/ 'wrong_more'（含错件：清空重选+miss）/
   'wrong_less'（未选满：保留继续）/ false（吞输入/单答案题型不适用）——weather v2 先例 */
async function uiSubmit(demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) { sfx('pop'); replayAnim(goBtn, 'bump'); return false; }
  const run = cur;                               /* 身份守卫（同上） */
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engSubmit(cur);
  if (r === null || r === false) return false;

  if (r === 'wrong_less') {                      /* 少选：保留勾选继续找（合法路径不算 miss） */
    lastAct = Date.now();
    state.locked = true;                         /* 短窗防连点提交刷语音 */
    dodgeLo();
    hopBunny();
    sayWOne(VOICE.less);                         /* rai_less 2832：还差一样，再找一找哦 */
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
    updateGoBtn(q);
    sayWOne(VOICE.more);                         /* rai_more 3096：多带了一样，重新挑一挑哦 */
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
    hopBunny();
  }
  state.locked = true;
  goBtn.classList.remove('ready');
  finishQuestion(r, run, q.picked.slice());
  return await finishWait(r, run);
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
  sayR(VOICE.right.key, VOICE.right.text);       /* rai_right：选对啦，真厉害（2544ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2544+300=2844 */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A（r3 统一）：dayEnd 实算 lim-1——两处同款（weather M2 先例） */
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.iftrain && sv.iftrain.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=播 rai_tut_watch「看！如果下雨带把伞」→ 播下雨名音+题面句（开题链）→ 幽灵手指点
   雨伞图卡 →点中（确认链拼播）→帮=指向正确卡；独=首次选对放手（watch 全程 ≤16s）
   flat0 题0 恒 single/rain（v2 锚点：候选 4 含近义干扰 coat）
   时序（家族 G/H）：watch clip 3360ms → 开题链演示延至 t=3700（≥3360+300，禁与名音撞头）；
   开题链 rai_n_rain 1416+150+rai_q1 1824=3390，ghost 移入窗 3700 ≥ 3390+300；
   演出窗 1600+4800=6400 罩确认链（m5 勘误：r3 升级 finishWait 4800 后注释陈旧值 3100 未同步） ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* rai_tut_watch：看！如果下雨带把伞（3360ms） */
  const run = cur;
  await wait(3700 * SPEED);                      /* t=3700 ≥ 3360+300=3660：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 single/rain（教学演示锚）
  KIDS.voice.queue([nameClip(q.conds[0]), VOICE.q1.key]);   /* 播开题链：下雨+要带什么呀（3390ms） */
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));                     /* 幽灵手指指向雨伞图卡 */
  await wait(3700 * SPEED);                      /* ≥3390+300=3690：开题链播完+ghost 移入停顿 */
  if (cur !== run) return;
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__ifDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  await wait(300 * SPEED);                       /* 收尾（确认链仍在播，由演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.iftrain = sv.iftrain || {};
  sv.iftrain.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来选一选"在重发后的题面上说（照 batch5-30） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* rai_tut_turn：你来选一选（1872ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2200);                                      /* ≥1872+300=2172 防尾截（turn 后读题延） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 底栏与舞台交互 ================= */
function hopBunny() {
  bunnyBtn.classList.remove('hop'); void bunnyBtn.offsetWidth; bunnyBtn.classList.add('hop');
}
bunnyBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopBunny();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  const q = cur.quizzes[cur.step];
  const hv = q ? hintVoiceOf(q) : VOICE.hint;
  sayR(hv.key, hv.text);                         /* 戳兔子=按题型方向提示（weather v2 先例） */
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
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  replayQuiz(false);                             /* 再听一遍：名音+题面句重播 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'pulse');
  replayQuiz(true);                              /* 附大图再 pulse（方向级回锚） */
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapOpt(Number(p.dataset.i));
});
goBtn.addEventListener('pointerdown', e => {     /* 「带好啦」提交（判定门在 uiSubmit） */
  e.preventDefault();
  uiSubmit(false);
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.card') || e.target.closest('#scene') || e.target.closest('#btn-go')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重读题面+大图 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（下一件应选卡 breathe，勾满=提交钮
   breathe）/ 教学"帮"5s 重演示 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const i = nextNeededIdx(q);
      if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
      else if (isSubmitKind(q.kind)) replayAnim(goBtn, 'breathe');   /* 勾满未提交：提交钮 breathe */
      speakQuiz();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+大图 pulse（不动 lastAct） */
    speakQuiz();
    pulseAsk();
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
  KIDS.init({ game: 'iftrain', title: '如果下雨' });   // 存档键 kidsgame_iftrain（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   verify 页与真实页都暴露——b29 坑⑥） ================= */
window.IF = {
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
    return { kind: q.kind,                             /* SPEC §2 v2：single|multi|best|conflict|ruleback */
             conds: q.conds.slice(),                   /* 正向出示情境 id（multi/conflict=2，其余=1） */
             ask: q.ask,                               /* ruleback=出示装备 id（其余 null） */
             opts: q.opts.map(o => ({ anim: o.anim })), /* 图卡 {anim}（封闭 12 之一）恒 4 */
             answer: q.answer,                         /* 单答案题型=正确卡下标；multi/best=-1 */
             need: q.need.slice(),                     /* 真值集（single-answer=1 / multi·best=2） */
             picked: q.picked.slice(),                 /* 提交题型勾选下标集 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  tapSubmit() { return uiSubmit(false); },
  async autoSolve() {                    // UI 路径自动点完当前关（单答案=点真值卡；提交=勾满+提交；
    let taps = 0, guard = 0;             // 演出窗内 tap=false → 等窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 160) {
      let wg = 0;
      while ((state.locked || state.demo) && wg++ < 600) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      if (isSubmitKind(q.kind)) {
        let acted = false;
        for (const g of q.need) {
          const i = q.opts.findIndex(o => o.anim === g);
          if (i >= 0 && q.picked.indexOf(i) < 0) { await uiTapOpt(i); acted = true; break; }
        }
        if (!acted) {
          const r = await uiSubmit();
          if (r === 'right' || r === 'done') taps++;
          else if (guard >= 158) break;
        }
      } else {
        const r = await uiTapOpt(q.answer);
        if (r === 'right' || r === 'done') taps++;
        else if (guard >= 158) break;
      }
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
