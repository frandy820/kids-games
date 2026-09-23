/* ================= animalmenu 主逻辑 v2（r11 难度改造 2026-09-14）
   玩法四题型五族（SPEC §0.76 r11）：题面=动物/食物大图（chaindir 双卡并排）+ 名音
   anm_n_<id>×N 与题面句（anm_q1/q2/q_multi/q_diet/q_chain）拼播（开题链全 clip 无
   keyless——契约 N 天然安全）；下方候选图卡（SVG 零文字）。
   findfood/findwho（ch1 两族混出 4 候选）/ multifood（ch2 多食全选：点卡=勾选切换
   .held+check 零惩罚，勾满 need 2 件「点好啦」#btn-go .ready 呼吸——提交制照 iftrain
   v2/weather v2 先例）/ dietclass（ch3 食性三盘分放：动物→plmeat/plgrass/plmix）/
   chaindir（ch4 谁吃谁：双卡出示序=听序，点「吃的一方」——方向锚不泄答案）。
   点对=卡亮+anm_right+名音拼播（单名确认链 right+150+名 ≤4338 → 窗 4400；multifood
   双名链 ≤5754 → 窗 6400——名音 clip 段在 keyless 段前，全 clip 链无 keyless，契约 N）；
   点错=findfood/findwho/dietclass 三段链（语义句 clip anm_hint/anm_q2 → 题面名音回锚 →
   方向级语义句 TTS keyless 恒链尾）/ chaindir 三段链（两名音回锚→方向级 TTS 尾，无 clip
   头——最长 7176 ≤ 豁免窗 7800）+题面大图再 pulse，1000ms 防重入窗后可重选（探索不罚）。
   multifood 提交反馈：多选=anm_more 清空重选+miss / 少选=anm_less 保留继续（合法路径
   不算 miss）——单段 clip，视觉锁 600/500 防连点。
   救援：14s 方向级=重读题面+大图 pulse（lastDir 独立节流锚）；30s 答案级=下一件应选卡
   breathe（multifood 勾满=提交钮 breathe）+重读题面；错反馈链豁免窗 7800 让路（契约 I）。
   验收钩子：window.AN = { get currentLevel, get quiz(){kind,ask,pair?,opts[]{anim},
   answer,need[],picked[],step,miss}, tapOpt(i), tapSubmit(), start(flat),
   async autoSolve(), get tutorial }（getter 返回拷贝；verify 页与真实页都暴露——b29 坑⑥） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = n => n * 345 + 600;              // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径，入参=字数）
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
const sayWOne = v => {                        /* 单段 clip 反馈（提交 less/more——同节流口径） */
  if (!cur) return false;
  if (cur.flat < 3) { KIDS.voice.play(v.key, v.text); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(v.key, v.text); return true; }
  return false;
};

const sceneEl = $id('scene'), boardEl = $id('board'), goBtn = $id('btn-go'),
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
/* chaindir 出示序（=opts 序=听序）；其余题型出示=ask 单图 */
const shownIds = q => q.kind === 'chaindir' ? q.opts.map(o => o.anim) : [q.ask];

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  goBtn.innerHTML = ICONS.go + '<div class="go-name">点好啦</div>';
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答对=双音上行 / 答错=低柔单音 */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（开题链=名音×N+题面句拼播，全 clip 无 keyless——契约 N 安全；
   家族 G 链后窗按 §4 r11 实长表：chaindir 最长 wolf+sheep 3216+2×150+q_chain 1776=5292，
   读题异步不占 UI 等待窗） ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const ask = shownIds(q).map(nameClip);
  const qk = q.kind === 'findfood' ? VOICE.q1.key
           : q.kind === 'findwho' ? VOICE.q2.key
           : q.kind === 'multifood' ? VOICE.qMulti.key
           : q.kind === 'dietclass' ? VOICE.qDiet.key : VOICE.qChain.key;
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
/* 方向提示（小兔子/救援按题型分流——iftrain v2 先例；不泄答案） */
function hintVoiceOf(q) {
  return q.kind === 'multifood' ? VOICE.qMulti        /* 它爱吃的都要呀（计数交给自己） */
       : q.kind === 'dietclass' ? VOICE.hDiet         /* 想一想，它爱吃什么 */
       : q.kind === 'chaindir' ? VOICE.hChain         /* 想一想，谁吃谁 */
       : VOICE.hint;
}

/* ================= 渲染 ================= */
const Q_TEXT = { findfood: VOICE.q1.text, findwho: VOICE.q2.text,
                 multifood: VOICE.qMulti.text, dietclass: VOICE.qDiet.text,
                 chaindir: VOICE.qChain.text };
function renderScene(q) {                        // 题面：暖色餐垫 + 大图（chaindir 双卡并排）+ 题面句
  sceneEl.dataset.kind = q.kind;
  sceneEl.dataset.ask = shownIds(q).join('+');   // 帧内容锚（契约 M：verify 断言；chaindir=a+b）
  sceneEl.setAttribute('aria-label', shownIds(q).map(nameOf).join('，') + '，点我再听一遍');
  if (q.kind === 'chaindir') {
    const s = q.opts.map(o => o.anim);
    sceneEl.innerHTML = '<div class="ask-slot multi">' +
      '<div class="ask-mini"><div class="ask-shadow" aria-hidden="true"></div>' + animSvg(s[0], 118) + '</div>' +
      '<div class="chain-arrow" aria-hidden="true">?</div>' +
      '<div class="ask-mini"><div class="ask-shadow" aria-hidden="true"></div>' + animSvg(s[1], 118) + '</div>' +
      '</div><div class="q-text">' + Q_TEXT[q.kind] + '</div>';
    return;
  }
  sceneEl.innerHTML = '<div class="ask-slot"><div class="ask-shadow" aria-hidden="true"></div>' +
    animSvg(q.ask, 150) + '</div>' +
    '<div class="q-text">' + Q_TEXT[q.kind] + '</div>';
}
function renderBoard(q) {                        // 候选图卡排（SVG 零文字；multifood=勾选卡+check 徽章）
  boardEl.innerHTML = '';
  const multi = isSubmitKind(q.kind);
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card pop' + (multi && q.picked.indexOf(i) >= 0 ? ' held' : '');
    b.dataset.i = i;
    b.dataset.anim = o.anim;                     // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', nameOf(o.anim) + '卡');
    b.innerHTML = animSvg(o.anim, 104) +
      (multi ? '<span class="check" aria-hidden="true">' + ICONS.check + '</span>' : '');
    b.style.animationDelay = (i * 70) + 'ms';
    boardEl.appendChild(b);
  });
}
/* 「点好啦」提交钮：multifood 才出现；勾满 need 数=.ready 呼吸邀请（计数驱动，不泄答案） */
function updateGoBtn(q) {
  const multi = !!(q && isSubmitKind(q.kind));
  goBtn.classList.toggle('show', multi);
  goBtn.classList.toggle('ready', multi && q.picked.length === q.need.length);
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
  hopRabbit();
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
/* 教学"帮"阶段指向：当前题下一件应选卡（multifood 勾满指提交钮） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = nextNeededIdx(q);
  pointGhostAt(i >= 0 ? cardEl(i) : goBtn);
}

/* ================= 答对收尾（单答案 tap 与提交 submit 共用）：
   lit 高亮下标集 + 确认链 anm_right+名音拼播 + 演出窗。
   窗（家族 G/H，§4 r11 实长表）：单名链 max right+150+sheep 1632+300=4338 → 1600+2800=4400；
   multifood 双名链 max right+150+honey+150+berry+300=5754 → 1600+4800=6400 ================= */
async function finishQuestion(r, run, litIdx, nameIds) {
  const q = cur.quizzes[cur.step - 1] || run.quizzes[run.step];   /* 已推进：取刚完成的题 */
  litIdx.forEach(i => { const el = cardEl(i); if (el) { el.classList.remove('breathe'); el.classList.add('lit'); } });
  chimeGoal();
  sfx('coin');
  if (cur === run) celebrateScene(run);          /* 大图跳 + 小兔子滑入示范 */
  KIDS.voice.queue([VOICE.right.key].concat(nameIds.map(nameClip)));   /* 确认链：全 clip 无 keyless（契约 N） */
  return q;
}
async function finishWait(r, run, twoNames) {
  await wait(1600 * SPEED);                      /* 大图跳+卡亮+确认链主窗 */
  if (cur !== run) return r;
  await wait(twoNames ? 4800 * SPEED : 2800 * SPEED);   /* 确认链收尾窗：双名 6400 ≥5754 / 单名 4400 ≥4338 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { updateGoBtn(null); winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（大图/卡全换）+读题 */
  return r;
}

/* ================= 点卡主路径（真实点击 / AN.tapOpt / autoSolve / 教学演示共用）
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
     窗后第二错照常计 miss（miss≥2 梯度脚手架可达）。r11：仅单答案题型适用（multifood 勾选
     切换零惩罚、不设错链豁免窗——iftrain v2 同口径） */
  if (!demo && !isSubmitKind(q.kind) && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(boardEl, 'bump'); return false;
  }
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapOpt(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   // 越界/已答=null+pop+bump

  if (r === 'pick' || r === 'unpick') {          /* multifood 勾选切换（零惩罚，不判对错） */
    lastAct = Date.now();                        /* 主动操作重置救援钟（§0.7a） */
    sfx('pop');
    syncHeld(q, i);
    return r;
  }

  if (r === 'wrong') {                           /* 答错：摇头+错链（按题型三段）+大图 pulse */
    state.locked = true;
    const el = cardEl(i);
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    /* 错链构成（r11；T46 阶段2 语义句 clip 化 anm_again_* 键段，text=TTS 兜底）：
       findfood=[anm_hint,名音,anm_again_food] / findwho=[anm_q2,名音,anm_again_who]
       / dietclass=[anm_hint,名音,anm_again_diet]（clip+clip+clip 尾）；
       chaindir=[名音A,名音B,anm_again_chain]（双名回锚+clip 尾，无 clip 头——三名链最长
       wolf+sheep 3216+300+2688，+300 落定 ≤7800 窗） */
    let parts;
    if (q.kind === 'findfood')
      parts = [VOICE.hint.key, nameClip(q.ask), { key: 'anm_again_food', text: FOOD_AGAIN }];
    else if (q.kind === 'findwho')
      parts = [VOICE.q2.key, nameClip(q.ask), { key: 'anm_again_who', text: WHO_AGAIN }];
    else if (q.kind === 'dietclass')
      parts = [VOICE.hint.key, nameClip(q.ask), { key: 'anm_again_diet', text: DIET_AGAIN }];
    else
      parts = [nameClip(q.opts[0].anim), nameClip(q.opts[1].anim), { key: 'anm_again_chain', text: CHAIN_AGAIN }];
    if (sayW(parts))
      wrongChainUntil = Date.now() + 7800;      /* 链豁免：findfood 2016+150+1464+150+2664+300=6744 / findwho
                                                   1944+150+1560+150+2496+300=6600
                                                   / dietclass 2016+150+1632+150+2232+300=6480
                                                   / chaindir 1584+150+1632+150+2688+300=6504（契约 I，均+300 内收口） */
    pulseAsk();                                  /* 方向级：题面大图再 pulse（看清楚再想） */
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
    hopRabbit();
  }
  state.locked = true;
  /* 确认链名音：findfood/findwho/chaindir=点中卡 id / dietclass=动物名（盘 id 无名音） */
  const nameId = q.kind === 'dietclass' ? q.ask : q.opts[q.answer].anim;
  finishQuestion(r, run, [q.answer], [nameId]);
  return await finishWait(r, run, false);
}

/* ================= 提交主路径（「点好啦」/ AN.tapSubmit / autoSolve / 教学共用）
   返回：'right'（含末题 done 内部走 winFlow）/ 'wrong_more'（多选/含错件：清空重选+miss）/
   'wrong_less'（少选：保留继续）/ false（吞输入/单答案题型不适用）——iftrain v2 先例 */
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
    hopRabbit();
    sayWOne(VOICE.less);                         /* anm_less 2832：还差一样，再找一找哦 */
    await wait(500 * SPEED);
    if (cur !== run) return r;
    state.locked = false;
    if (state.tut === 'help') pointHelpNext();
    return 'wrong_less';
  }
  if (r === 'wrong_more') {                      /* 多选/含错件：清空重选+miss（真实错误路径） */
    lastAct = Date.now();
    state.locked = true;
    dodgeLo();
    replayAnim(boardEl, 'bump');
    renderBoard(q);                              /* 清勾选态（held 全撤） */
    updateGoBtn(q);
    sayWOne(VOICE.more);                         /* anm_more 3072：多选了一样，重新挑一挑哦 */
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
  goBtn.classList.remove('ready');
  finishQuestion(r, run, q.picked.slice(), q.need.slice());
  return await finishWait(r, run, true);
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
  sayR(VOICE.right.key, VOICE.right.text);       /* anm_right：点对啦，真棒（2256ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2256+300=2556 */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A（r11 升级，weather M2 同款）：dayEnd 实算 lim-1——两处同款 */
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
                   !(sv.animalmenu && sv.animalmenu.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（r11 沿用——flat0 题0 恒 findfood/rabbit）
   看=播 anm_tut_watch「看！帮小动物点餐」→ 播兔子名音+题面句（开题链）→ 幽灵手指点
   胡萝卜图卡 →点中（确认链拼播）→帮=指向正确卡；独=首次选对放手（watch 全程 ≤16s）
   时序（家族 G/H）：watch clip 3096ms → 开题链演示延至 t=3500（≥3096+300=3396，禁与名音撞头）；
   开题链 anm_n_rabbit 1368+150+anm_q1 1968=3486，ghost 移入窗 3900 ≥ 3486+300=3786；
   演出窗 1600+2800 罩确认链 2256+150+1560+300=4266（r11 ch1 候选 2→4，锚题机制不变） ---------- */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* anm_tut_watch：看！帮小动物点餐（3096ms） */
  const run = cur;
  await wait(3500 * SPEED);                      /* t=3500 ≥ 3096+300=3396：clip 播完再演（不撞头） */
  if (cur !== run) return;
  const q = cur.quizzes[0];                      // flat0 题0 恒 findfood/rabbit（教学演示锚）
  KIDS.voice.queue([nameClip(q.ask), VOICE.q1.key]);   /* 播开题链：兔子+它爱吃什么呀（3486ms） */
  const idx = correctIdx(q);
  pointGhostAt(cardEl(idx));                     /* 幽灵手指指向胡萝卜图卡 */
  await wait(3900 * SPEED);                      /* ≥3486+300=3786：开题链播完+ghost 移入停顿 */
  if (cur !== run) return;
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapOpt(idx, true);       /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__anDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  await wait(300 * SPEED);                       /* 收尾（确认链仍在播，由 uiTapOpt 演出窗罩满） */
  const sv = KIDS._save() || {};
  sv.animalmenu = sv.animalmenu || {};
  sv.animalmenu.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来点一点"在重发后的题面上说（照 batch5-30） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* anm_tut_turn：你来点一点（1824ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2150);                                      /* ≥1824+300=2124 防尾截（turn 后读题延） */
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
  const hv = q ? hintVoiceOf(q) : VOICE.hint;
  sayR(hv.key, hv.text);                         /* 戳兔子=按题型方向提示（不泄答案） */
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
goBtn.addEventListener('pointerdown', e => {     /* 「点好啦」提交（判定门在 uiSubmit） */
  e.preventDefault();
  uiSubmit(false);
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

/* ================= 无操作看护：14s 方向级（重读题面+大图 pulse，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（下一件应选卡 breathe，multifood
   勾满=提交钮 breathe）/ 教学"帮"5s 重演示 ================= */
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
  KIDS.init({ game: 'animalmenu', title: '动物三餐菜单' });   // 存档键 kidsgame_animalmenu（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1（r11 两处同款） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.AN——b29 坑⑥：verify 页独占钩子=驱动假阳性） ================= */
window.AN = {
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
    return { kind: q.kind,                             /* SPEC §1 r11：findfood|findwho|multifood|dietclass|chaindir */
             ask: q.ask,                               /* 出示图 id（findfood=动物8 / findwho=食物8 / multifood·dietclass=动物10 / chaindir=null） */
             pair: q.pair ? q.pair.slice() : null,     /* chaindir：[eater, eaten] 规范序 */
             opts: q.opts.map(o => ({ anim: o.anim })), /* 图卡 {anim}（封闭 25 之一+盘 3） */
             answer: q.answer,                         /* 单答案题型=正确卡下标 / multifood=-1 */
             need: q.need.slice(),                     /* 真值集（单答案=1 / multifood=2） */
             picked: q.picked.slice(),                 /* multifood 勾选下标集 */
             step: cur.step,
             miss: q._miss || 0 };
  },
  tapOpt(i) { return uiTapOpt(i); },
  tapSubmit() { return uiSubmit(false); },
  async autoSolve() {                    // UI 路径自动点完当前关（单答案=点真值卡；multifood=勾满+提交；
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
