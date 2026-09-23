/* ================= bridge 主逻辑（r9 纠错式：找错/修错双步 / 候选盘 / walk 过河演出 / 教学 / 推进）
   玩法：河面 6/8 块石头构成完整周期 pattern 行，恰埋 1 块错石（视觉无标记）。
   find 找错步：题面语音「小桥上有一块石头放错啦，找一找」——点中错石 = 该石
   baddie 高亮 + brg_found + 候选盘滑入；点非错石 = 晃动 + sayW + 零惩罚
   （1000ms 防重入窗）；miss≥2 = pattern 提示条浮现（规律可视化，不指认错石）。
   fix 修错步：候选 3 块（干扰恰差一属性），首题语音「选一块对的石头，补上去」；
   点对 = 错石替换弹入 + 兔子逐石跳过河（walk 演出 + 脚印）→ brg_right；
   点错候选 = 晃动零惩罚；miss≥2 = 正确候选 breathe（§0.21 答案级）。
   estMs 家族定版字面 `const estMs = n => n * 345 + 600;`（n=码点数；四处同步：
   game-data 定义 / 本文件注释 / game-verify 独立副本 / build.py 源码级 assert；禁 +300 变体）。
   救援 = 14s 重读题面（§0.7a）+ 首周期石头 flash（方向级）+ miss≥2 两级（见上）。
   验收钩子：window.BG = { get currentLevel, get quiz(){kind,stones[](color?,shape?,bad,pos),
   badPos,cand[](color,shape),candOk,phase('find'|'fix'|'walk'),step,miss}, tapStone(i),
   tapCand(i), async autoSolve(), get tutorial }；教学演示判对证据 window.__bgDemoR（§0.27）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错轻语音：flat<3 每错必播；flat≥3 走 10s 节流；force=豁免恰一次
   （不灰化款 miss 无上限，===2 防豁免变每错必播——batch9 定版） */
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const sceneEl = $id('scene'), stonesEl = $id('stones'), rabbitEl = $id('rabbit'),
      bankLEl = $id('bank-l'), bankREl = $id('bank-r'), ghostEl = $id('ghost'),
      candsEl = $id('cands'), patTipEl = $id('pat-tip'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear');

const RAB = 56;                                   // 兔子显示尺寸（px）

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 点空白/探索区轻提示节流（§0.16，10s）
let helpRedemo = false;
let ghostReason = null;                         // 'tut' | 'scaffold'

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const stoneEl = i => stonesEl.querySelector('.stone[data-i="' + i + '"]');
const candEl = i => candsEl.querySelector('.cand[data-ci="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  rabbitEl.innerHTML = '<div class="rab-in"></div>';
  setRabbitPose('normal');
  rabbitEl.style.transitionDuration = Math.round(STEP_MS * SPEED) + 'ms';  // verify 提速（布局量测稳定）
}
/* 音效（Web Audio 合成）：找到错石=短双音 / 点错=低柔单音 / 修对过河=叮咚 */
const chimeStep = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.12, 0, 0.55); KIDS.audio.note(880, 0.18, 0.07, 0.6); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（读题 sayR 级不受 flat 门）
   开场/交接顺序链（§0.5/§0.6）：queue 单通道——hint（或 turn clip）播完接题面 clip */
function speakQuiz(q) {
  if (!q) return;
  KIDS.voice.play(q.phase === 'fix' ? VOICE.fixDo.key : VOICE.fixQ.key, speechOf(q));
}
function openingSpeak(turn) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  KIDS.voice.queue([turn ? VOICE.turn.key : VOICE.hint.key, VOICE.fixQ.key]);
}
/* T46 阶段2 段链播放器：全段在册走 queue 拼播，缺段整句 TTS 兜底
   （shop-math playChain 先例；段恒在册=防御性死分支） */
const playChain = (keys, fallback) => {
  if (keys.every(k => KIDS.voice.clips[k])) KIDS.voice.queue(keys);
  else KIDS.voice.say(fallback);
};

/* ================= 兔子摆放与前进动画（布局量测 offsetLeft/offsetTop，禁 getBoundingClientRect） */
function setRabbitPose(pose) {
  const inner = rabbitEl.firstElementChild;
  if (inner) inner.innerHTML = KIDS.assets.rabbit(pose, RAB);
}
function placeRabbit(stoneIdx, bank) {
  let L, T;
  if (bank === 'start') {
    L = bankLEl.offsetLeft + (bankLEl.offsetWidth - RAB) / 2;
    T = bankLEl.offsetTop + 10;
  } else if (bank === 'end') {
    L = bankREl.offsetLeft + (bankREl.offsetWidth - RAB) / 2;
    T = bankREl.offsetTop + 10;
  } else {
    const st = stoneEl(stoneIdx);
    if (!st) return;
    L = st.offsetLeft + (st.offsetWidth - RAB) / 2;
    T = st.offsetTop - Math.round(RAB * 0.52);          // 站在石头顶上
  }
  rabbitEl.style.left = L + 'px';
  rabbitEl.style.top = T + 'px';
}
function hopRabbitTo(stoneIdx, bank) {                  // 前进动画：外层位移 transition + 内层跳弧
  placeRabbit(stoneIdx, bank);
  const inner = rabbitEl.firstElementChild;
  if (inner) {
    inner.classList.remove('hop'); void inner.offsetWidth;
    inner.classList.add('hop');
  }
}
function markPaw(el) {                                  // 走过的石头留脚印（视觉轨迹）
  if (!el || el.querySelector('.paw')) return;
  const p = document.createElement('i');
  p.className = 'paw';
  p.textContent = '🐾';
  el.appendChild(p);
}

/* ================= 渲染 ================= */
function applyStoneFace(el, s) {                        // 石面（色 var + 形状类）——cand 共用
  el.dataset.color = s.color;
  el.style.setProperty('--c-body', COLORS[s.color].body);
  el.style.setProperty('--c-deep', COLORS[s.color].deep);
  el.classList.add('c-stone');
  if (s.shape) el.classList.add(s.shape === 'square' ? 's-square' : 's-round');
}
function renderScene(q) {                               // 河面石头行：色/形石（渲染即引擎；错石无视觉标记）
  stonesEl.innerHTML = '';
  stonesEl.classList.toggle('tight', q.stones.length > 6);   // 8 石章收紧间距（竖屏 ≥64）
  candsEl.classList.remove('show');
  patTipEl.classList.remove('show');
  q.stones.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'stone pop';
    b.dataset.i = i;
    b.dataset.bad = s.bad ? '1' : '0';                  // verify 对账（渲染即引擎；无视觉差异）
    if (s.shape) b.dataset.shape = s.shape;
    applyStoneFace(b, s);
    b.setAttribute('aria-label', COLORS[s.color].name + (s.shape ? SHAPES[s.shape].name : '') + '石头');
    b.style.animationDelay = (i * 70) + 'ms';
    stonesEl.appendChild(b);
  });
  setRabbitPose('normal');
  placeRabbit(null, 'start');                           // 兔子回左岸
}
function renderCands(q) {                               // 候选盘：3 块候选石滑入（fix 修错步）
  candsEl.innerHTML = '';
  q.cand.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'cand pop';
    b.dataset.ci = i;
    if (c.shape) b.dataset.shape = c.shape;
    applyStoneFace(b, c);
    b.setAttribute('aria-label', COLORS[c.color].name + (c.shape ? SHAPES[c.shape].name : '') + '石头');
    b.style.animationDelay = (i * 90) + 'ms';
    candsEl.appendChild(b);
  });
  candsEl.classList.add('show');
}
function renderPatTip(q) {                              // pattern 提示条：完整周期色点（miss≥2 规律可视化）
  const per = kindPeriod(q.kind);
  const dots = Math.min(per * 2, 8);
  patTipEl.innerHTML = '';
  for (let i = 0; i < dots; i++) {
    const s = q.stones[i % per];                        // 首周期（无误不变量）读周期元
    const d = document.createElement('i');
    d.style.background = COLORS[s.color].body;
    d.classList.add(s.shape === 'square' ? 'p-sq' : 'p-rd');
    patTipEl.appendChild(d);
  }
  patTipEl.classList.add('show');
}
function renderStep() {                                 // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                                 // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };            // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(N_CH, cur.ch); c++) {
    const i = document.createElement('i');
    const done = Array.from({ length: CH_LEN }, (_, l) => l).every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderStep();
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz(q);  /* 开场/换题读题；demo 门防演示收尾叠播；quiet=开场/教学交接改顺序链 */
}

/* ================= 幽灵手指（教学"帮"/演示共用） */
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
/* 教学"帮"阶段指向：find=错石 / fix=正确候选（教学期答案级指引，家族先例承 feed 目标堆） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(q.phase === 'fix' ? candEl(q.candOk) : stoneEl(q.badPos), 'tut');
}

/* ================= find 找错主路径（真实点击 / BG.tapStone / autoSolve / 教学演示共用）
   uiTapStone(i, demo)：locked 门拦真实输入（吞输入轻叮 §0.22）；demo 通道仅教学用 */
async function uiTapStone(i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    if (!demo) sfx('pop');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.phase !== 'find') { if (!demo) sfx('pop'); return false; }
  const run = cur;                              /* 身份守卫：演出窗口内重玩会重建 cur，防旧续体错推进 */
  const r = engTap(cur, i);
  if (r === null) { if (!demo) sfx('pop'); return false; }

  if (r === 'wrong') {                          /* find 点非错石：晃动+sayW+零惩罚（不泄答案） */
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);
    const el = stoneEl(i);
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
    if (q.miss >= 2) renderPatTip(q);            /* miss≥2：pattern 提示条（规律可视化，不指认错石） */
    state.locked = true;
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms（§0.26 b16 定案）；窗内点=pop 拒绝 */
    if (cur !== run) return r;
    state.locked = false;                        /* 不灰化可重点（零惩罚） */
    return r;
  }

  /* ---- found 找对错石：baddie 高亮 + brg_found → 候选盘滑入（题内过半） ---- */
  lastAct = Date.now();                         /* 仅正确推进重置救援钟（§0.7a） */
  if (state.tut === 'help') {                   /* 教学"独"：首次找对 → 强化反馈放手 */
    state.tut = 'solo';
    ghost.hide();
    dockHop();
  }
  state.locked = true;
  chimeStep();
  sayR(VOICE.found.key, VOICE.found.text);
  const el = stoneEl(i);
  if (el) { el.classList.remove('breathe', 'wig'); void el.offsetWidth; el.classList.add('baddie'); }
  await wait(FOUND_MS * SPEED);                 /* found 反馈窗（r9 模型 FOUND_MS） */
  if (cur !== run) return r;
  renderCands(q);                               /* 候选盘滑入 */
  if (cur.step === 0) sayR(VOICE.fixDo.key, VOICE.fixDo.text);   /* 修错指引=每关首题播（r9 模型 first） */
  state.locked = false;
  return r;
}

/* ================= fix 修错主路径（真实点击 / BG.tapCand / autoSolve / 教学演示共用） */
async function uiFix(i, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) {
    if (!demo) sfx('pop');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.phase !== 'fix') { if (!demo) sfx('pop'); return false; }
  const run = cur;
  const r = engFix(cur, i);
  if (r === null) { if (!demo) sfx('pop'); return false; }

  if (r === 'wrong') {                          /* fix 点错候选：晃动+sayW+零惩罚可重点 */
    dodgeLo();
    sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);
    const el = candEl(i);
    if (el) { el.classList.remove('wig'); void el.offsetWidth; el.classList.add('wig'); }
    if (q.miss >= 2) {                          /* miss≥2 答案级：正确候选 breathe（§0.21） */
      const ok = candEl(q.candOk);
      if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
    }
    state.locked = true;
    await wait(1000 * SPEED);                   /* 错选防重入窗 1000ms */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- 修对：错石替换弹入 → 候选盘收起 → 兔子逐石跳过河（walk 演出）→ 下一题/通关 ---- */
  lastAct = Date.now();
  state.locked = true;
  const el = stoneEl(q.badPos);
  const fixed = q.cand[q.candOk];
  if (el) {                                     /* 替换动画：剥旧面（色 var/形状类）→ 新石弹入 */
    el.classList.remove('baddie', 'breathe', 'wig');
    el.classList.remove('s-square', 's-round');
    el.dataset.color = fixed.color;
    if (fixed.shape) el.dataset.shape = fixed.shape; else delete el.dataset.shape;
    el.style.setProperty('--c-body', COLORS[fixed.color].body);
    el.style.setProperty('--c-deep', COLORS[fixed.color].deep);
    el.classList.add(fixed.shape === 'square' ? 's-square' : (fixed.shape ? 's-round' : 'c-stone'));
    if (!fixed.shape) el.classList.add('c-stone');
    void el.offsetWidth;
    el.classList.add('fixed-in');
    el.setAttribute('aria-label', COLORS[fixed.color].name + (fixed.shape ? SHAPES[fixed.shape].name : '') + '石头');
  }
  chimeStep();
  await wait(600 * SPEED);                      /* 替换弹入窗 */
  if (cur !== run) return r;
  candsEl.classList.remove('show');             /* 候选盘收起（新面已上桥） */
  patTipEl.classList.remove('show');
  await wait(320 * SPEED);
  if (cur !== run) return r;
  for (let k = 0; k < q.stones.length; k++) {   /* walk 演出：兔子逐石跳过河（脚印+落点脉冲） */
    const st = stoneEl(k);
    if (st) { st.classList.remove('pop', 'fixed-in'); void st.offsetWidth; st.classList.add('lit'); markPaw(st); }
    hopRabbitTo(k, null);
    await wait(STEP_MS * SPEED);
    if (cur !== run) return r;
  }
  hopRabbitTo(null, 'end');                     /* 上对岸 */
  setRabbitPose('happy');
  sayR(VOICE.right.key, VOICE.right.text);
  if (r === 'done') {
    await wait(700 * SPEED);
    if (cur !== run) return r;
    winFlow();
    return r;
  }
  await wait(BANK_MS * SPEED);
  if (cur !== run) return r;
  setRabbitPose('normal');
  state.locked = false;
  renderQuiz();                                 /* 换桥：新石头行 + 新题面 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = (flat == null ? cur.flat : flat);
  /* 家族契约 F（r9）：生成关预告禁"章索引加一取模"字面——须实算 genLevel(f+1).dch 取 GEN_HINTS；
     家族契约 M1：静态章末预告=CHAPTERS[floor(f/CH_LEN)+1]（SPEC §0.4 口径） */
  if (f + 1 < STATIC_LEVELS) return CHAPTERS[Math.floor(f / CH_LEN) + 1].hint;
  return GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, Array.from({ length: CH_LEN }, (_, l) => l));
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = Array.from({ length: CH_LEN }, (_, l) => l)
        .reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 家族契约 A：dayEnd 预告传 nextHint(lim-1)（§0.4 防跳章） */ });
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.bridge && sv.bridge.tutSeen);
  if (VERIFY) { openingSpeak(); return; }
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  openingSpeak();                                /* 开场任务语音+题面顺序链（§0.5；hint 不得切断题面） */
}

/* ================= 教学（仅关 1-0 首次，save.bridge.tutSeen）：看→帮→独
   看=完整演示一题纠错流程（pattern 读出「红蓝红蓝，有一块不对哦」→ 指点错石 found →
   候选滑入 → 指选对候选 → 修对兔子过河；≤16s §0.25）→ 帮=按 phase 指向下一动作；
   独=首次找对放手（SPEC §3-r9） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                      // flat0=ch1 ab（确定性）
  playChain(chantKeys(q), chantText(q));         /* pattern 读出 clip 段链（T46 阶段2）：「红 蓝 红 蓝，有一块不对哦」 */
  pointGhostAt(stoneEl(q.badPos), 'tut');
  await wait(1600 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r1 = await uiTapStone(q.badPos, true);   // demo 通道豁免 locked——演示 find 找错（判对证据）
  window.__bgDemoR = r1;                         /* 演示判对真实生效证据（§0.27，verify/gate 断言 'found'） */
  await wait(500 * SPEED);                       // 候选盘已滑入（uiTapStone found 分支内含窗）
  pointGhostAt(candEl(q.candOk), 'tut');
  await wait(1200 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  await uiFix(q.candOk, true);                   // 演示 fix 修对 → walk 过河演出完整走完
  const sv = KIDS._save();                       // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.bridge = sv.bridge || {};
    sv.bridge.tutSeen = true;
    KIDS.store.persist();
  }
  /* 立即重发同关（确定性关卡，题面一致），"你来走一走"在重发后的桥上说（照 batch5-11） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  openingSpeak(true);                            /* 交接顺序链：turn clip → 题面 clip（queue 单通道 §0.6） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
}

/* ================= 底栏与舞台交互 ================= */
function dockHop() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  dockHop();                                     /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { /* §0.20 三件门；教学/演出期点兔子=轻反馈不静默（§0.16） */
    sfx('pop');
    return;
  }
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20：教学/演出/通关期重玩门 */
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* 审查对齐重玩门/题面防御 */
  lastAct = Date.now();
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  speakQuiz(cur.quizzes[cur.step]);              /* 再听一遍：当前阶段题面/指引重读 */
});
sceneEl.addEventListener('pointerdown', e => {
  const pStone = e.target.closest('.stone');
  if (pStone) {                                  // find 找错主路径
    e.preventDefault();
    uiTapStone(Number(pStone.dataset.i));        /* 吞输入轻叮在 uiTapStone 门内（§0.22） */
    return;
  }
  const pCand = e.target.closest('.cand');
  if (pCand) {                                   // fix 修错主路径
    e.preventDefault();
    uiFix(Number(pCand.dataset.ci));
    return;
  }
  /* 空白/探索点击（河面/岸边）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.7a 重读题面 + §3-r9 两级视觉）
   方向级=首周期石头依次 flash（「前面的排得对」——间接定位错石，不指认）；
   find miss≥2 = pattern 提示条（规律可视化）；fix miss≥2 = 正确候选 breathe
   / 教学"帮"5s 重演示一次 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    const q = cur.quizzes[cur.step];            /* 救援=重读当前阶段题面（§0.7a，非通用催促句） */
    if (q) {
      speakQuiz(q);
      if (q.phase === 'find') {                 /* 方向级：首周期（无误不变量）依次 flash */
        const per = kindPeriod(q.kind);
        for (let k = 0; k < per; k++) {
          setTimeout(() => {
            const el = stoneEl(k);
            if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
          }, k * 300);
        }
        if (q.miss >= 2) renderPatTip(q);       /* miss≥2 规律可视化（不指认错石） */
      } else if (q.miss >= 2) {                 /* fix miss≥2 答案级：正确候选 breathe（§0.21） */
        const ok = candEl(q.candOk);
        if (ok) { ok.classList.remove('breathe'); void ok.offsetWidth; ok.classList.add('breathe'); }
      }
    } else sayR(VOICE.hint.key, VOICE.hint.text);
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
  KIDS.init({ game: 'bridge', title: '过河石桥' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族契约 A：启动分支同口径 */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） */
window.BG = {
  start(flat) { startLevel(flat); },                    /* 外部切关（verify 页/独立复验共用口径） */
  get currentLevel() {
    if (!cur) return null;
    const q = cur.quizzes[Math.min(cur.step, cur.quizzes.length - 1)] || {};
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv,
             n: cur.quizzes.length, kinds: cur.kinds.slice(),
             step: cur.step, retries: cur.retries, done: cur.done, won: state.won,
             kind: q.kind || null, phase: q.phase || null };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { kind: q.kind,                                      /* SPEC §3-r9 钩子契约 */
             stones: q.stones.map(s => ({ color: s.color || null,
                                           shape: s.shape || null,
                                           bad: !!s.bad, pos: s.pos })),
             badPos: q.badPos,
             cand: q.cand.map(c => ({ color: c.color, shape: c.shape || null })),
             candOk: q.candOk,
             phase: q.phase,
             step: cur.step, miss: q.miss };
  },
  tapStone(i) { return uiTapStone(i); },
  tapCand(i) { return uiFix(i); },
  async autoSolve() {                           // UI 路径自动点完当前关（逐题 find→fix 双步）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 40) {   // 5 题 × 2 步 = 10 tap 上界，guard 40 余量
      const q = cur.quizzes[cur.step];
      if (!q) break;
      const r = q.phase === 'find' ? await uiTapStone(q.badPos) : await uiFix(q.candOk);
      taps++;
      if (r === false || r === null) break;     // 锁死/重玩保护
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
