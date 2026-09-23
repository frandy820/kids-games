/* ================= dressup 主逻辑（r10 三族判定 / 场景渲染 / 换装动画 / 教学 / 救援 / 推进 / 自由装扮）
   任务模式题型三族（SPEC-BATCH24 §8）：
   conflict 主题冲突池：题面=主题场景+TTS 题面句，候选 7 片（配对主题干扰 ≥min(3,配对件数)）。
     两击制（share 同构）：点贴纸=选中高亮（sel）→ 点场景卡内小兔子=贴上（飞到身上挂 badge）。
     need 全贴上才过：对一件='hold'，全齐=推进；贴错=弹回（wig）+软反馈，1000ms 防重入窗（v1 机制）。
   budget 装备预算：场景左侧三槽书包（.pack），候选 6 片；装包=两击同构飞进槽位；
     装入无即时对错反馈（'hold'——预算取舍核心），满 3 件自动检查：全对=推进；
     有错=miss+1+错件自动退回（对件保留）+dru_budget_hint；已装 badge 点=揭回（零惩罚解槽）。
   anti 反向排除：候选=主题全集+1 错位件；单击即判（weather r9 anti 同构）：
     点错位件='right'/'done'（good 闪绿+彩花+ADV 窗推进）；点合适件='wrong'（摇头+
     dru_anti_hint 反向重定向，miss+1）；无第二击（点兔子=重读题面）。
   自由模式（piano free 同构）：零判定零写档——任意贴/点已贴揭下/清空钮/兔子偶发跳，不进关卡不计步。
   救援钟（piano 双锚结构）：14s 方向级=重读题面；conflict 加 need 未贴片 pulse（v1），
     budget/anti=场景 pulse（指片即泄答案——预算/反向题不指片）；独立一次性锚，不重置 lastAct；
   30s 答案级=帮做：conflict 演示贴一件 / budget 先揭回一件错件（若有）再演示装一件对的
     （帮做不制造 miss）/ anti 幽灵手指点错位件。
   r10 时长硬指标：单关 modeled ≥40000ms（estMs 家族定版 n*345+600——game-data 定义源模型/
   本注释提及/verify 独立副本/build 字面四处同步，禁 +300 变体；verify ⑳+wall-clock 双断言）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (v) => { if (cur && cur.flat < 3) KIDS.voice.play(v.key, v.text); };
/* 救援/教学/正误核心反馈不受 flat 门限制（§0.5：不识字孩子静置零救援=不可收） */
const sayR = (v) => { if (v) KIDS.voice.play(v.key, v.text); };
/* 纠错语义反馈：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩 P1：安静试错只有视觉弹回） */
let lastWrongVoice = 0;
const sayW = (v) => {
  if (!cur || !v) return;
  if (cur.flat < 3) { KIDS.voice.play(v.key, v.text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(v.key, v.text); }
};

const sceneEl = $id('scene'), trayEl = $id('tray'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      clearBtn = $id('btn-clear'), ghostEl = $id('ghost'),
      btnFree = $id('btn-mode-free'), btnTask = $id('btn-mode-task');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { mode: 'task', locked: false, busy: false, won: false, demo: false, tut: 'none' };
let freeState = { placed: [], sel: null };      // 自由装扮独立状态（不碰 cur——零写档铁律）
let lastAct = Date.now();
let helpRedemo = false;
let rescueDirDone = false, rescueAnsDone = false;   /* 救援双锚（piano 结构）：一次性标记，动作时重置 */
let freeTapN = 0;
let qTimer = null;                              // 开场链 clip→题面 接力定时器

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const stkBtnOf = i => trayEl.querySelector('.stk[data-i="' + i + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  btnFree.innerHTML = ICONS.free;
  btnTask.innerHTML = ICONS.task;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.speaker;
  clearBtn.innerHTML = ICONS.clear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：挂件轻音=单清音 / 贴齐=双音上行 / 贴错=低柔单音（verify 页静音） */
const chimeHold = () => { if (!VERIFY) KIDS.audio.note(740, 0.14, 0, 0.45); };
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音（T46 阶段2 clip 化：dru_q/qb/qa_{theme}；重入先清接力定时器） ================= */
function speakQuiz(q) {
  if (!q) return;
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  KIDS.voice.play(quizKey(q), quizSpeech(q));
}

/* ================= 渲染 ================= */
function renderScene(q) {                        // 主题场景：动画 + 小兔子 + 换装 badge 槽（budget=三槽书包）
  sceneEl.dataset.theme = q ? q.theme : '';
  sceneEl.dataset.kind = q ? q.kind : '';
  if (q && q.kind === 'budget') {                // 预算章：左侧三槽书包（badge 装包，兔子仅展示）
    sceneEl.setAttribute('aria-label', THEMES[q.theme].n + '，装三样');
    sceneEl.innerHTML = sceneSvg(q.theme) +
      '<div class="pack" aria-hidden="true"><div class="pack-slots"><i></i><i></i><i></i></div>' +
      '<div id="bunny-wear"></div></div>' +
      '<div class="bunny-slot"><div id="bunny">' + KIDS.assets.rabbit('normal', 96) + '</div></div>';
    return;
  }
  if (q) {
    sceneEl.setAttribute('aria-label', THEMES[q.theme].n + '，装扮小兔子');
    sceneEl.innerHTML = sceneSvg(q.theme) +
      '<div class="bunny-slot"><div id="bunny-wear" aria-hidden="true"></div>' +
      '<div id="bunny">' + KIDS.assets.rabbit('normal', 96) + '</div></div>';
  } else {                                       // 自由模式：星星暖底通用台
    sceneEl.setAttribute('aria-label', '自由装扮小兔子');
    sceneEl.innerHTML = sceneFree() +
      '<div class="bunny-slot"><div id="bunny-wear" aria-hidden="true"></div>' +
      '<div id="bunny">' + KIDS.assets.rabbit('happy', 96) + '</div></div>';
  }
}
function sceneFree() {                           // 自由模式舞台底（暖米+圆点花纹）
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#FDEEC4"/>' +
    [[46, 44], [124, 32], [214, 52], [300, 38], [80, 120], [176, 118], [282, 124], [36, 156], [232, 158], [330, 150]]
      .map((p, i) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (5 + i % 3) + '" fill="#F2C9A0" opacity=".55"/>').join('') +
    '<path d="M0 184 q70 -14 150 -8 q100 8 210 -6 V184 Z" fill="#F3E0C4"/></svg>';
}
function renderTray(q) {                         // 贴纸栏：任务=当题候选 6-8 片 / free=18 片全池（零文字标签 §0.19）
  trayEl.innerHTML = '';
  const mode = state.mode;
  const list = mode === 'free'
    ? STICKER_IDS.map(id => ({ id: id, theme: STICKERS[id].theme, right: false }))
    : (q ? q.stickers : []);
  const placed = mode === 'free' ? freeState.placed : (q ? q.placed : []);
  const sel = mode === 'free' ? freeState.sel : (q ? q.sel : null);
  list.forEach((st, i) => {
    const b = document.createElement('button');
    b.className = 'stk pop' + (placed.indexOf(st.id) >= 0 ? ' held' : '') + (sel === i ? ' sel' : '');
    b.dataset.i = i;
    b.dataset.sid = st.id;                       // verify 对账（渲染即引擎）
    b.setAttribute('aria-label', nameOf(st.id));
    b.style.animationDelay = (i * 55) + 'ms';
    b.innerHTML = '<span class="gwrap">' + stickerSvg(st.id) + '</span>' +
      '<span class="check" aria-hidden="true">' + ICONS.check + '</span>';
    trayEl.appendChild(b);
  });
}
function renderBadge() {                         // badge 排：兔子身上（free/conflict）/ 书包槽（budget）——均可点揭下
  const wear = sceneEl.querySelector('#bunny-wear');
  if (!wear) return;
  wear.innerHTML = '';
  const isBudget = state.mode === 'task' && cur && !cur.done &&
                   cur.quizzes[cur.step] && cur.quizzes[cur.step].kind === 'budget';
  const placed = state.mode === 'free' ? freeState.placed : (cur && !cur.done ? cur.quizzes[cur.step].placed : []);
  placed.forEach((id, idx) => {
    const b = document.createElement('span');
    b.className = 'wear';
    b.dataset.idx = idx;
    b.dataset.sid = id;
    if (state.mode === 'free' || isBudget) b.setAttribute('aria-label', '揭下' + nameOf(id));
    b.innerHTML = stickerSvg(id, 34);
    wear.appendChild(b);
  });
  const bun = sceneEl.querySelector('#bunny');
  if (bun) replayAnim(bun, 'hop');
}
function renderStep() {                          // HUD 本关 5 题进度点（free 模式静止——零计步）
  const tray = $id('step-dots');
  tray.innerHTML = '';
  if (!cur) return;
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
  if (!cur) return;
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function renderModeBtns() {
  btnFree.classList.toggle('on', state.mode === 'free');
  btnTask.classList.toggle('on', state.mode === 'task');
  clearBtn.classList.toggle('show', state.mode === 'free');   // 清空钮仅自由模式
}
function setSelHighlight(i) {                    // 选中态 class 切换（不整栏重绘——防 pop 重播/打断弹回）
  trayEl.querySelectorAll('.stk.sel').forEach(b => b.classList.remove('sel'));
  if (i != null) {
    const el = stkBtnOf(i);
    if (el) el.classList.add('sel');
  }
}
function markHeld(i, held) {                     // 贴上/揭下单片 held 态切换
  const el = stkBtnOf(i);
  if (el) el.classList.toggle('held', !!held);
}
function renderQuiz(quiet) {                     // 任务模式换题全绘（场景/贴纸栏/badge）+读题
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderTray(q);
  renderBadge();
  renderStep();
  if (!VERIFY && !state.demo && !quiet) speakQuiz(q);
}
function renderFree() {                          // 自由模式全绘（台/全池贴纸/badge）
  renderScene(null);
  renderTray(null);
  renderBadge();
}

/* ================= 换装动画：贴纸从栏飞到小兔子身上（.fly 克隆体 CSS transition §0.11）
   飞行结束后挂 badge；verify 页跳飞行只挂 badge ---------- */
function flySticker(el, id, run) {
  const wear = sceneEl.querySelector('#bunny-wear');
  const addBadge = () => {
    if (run && cur !== run) return;                       // 演出窗内重玩已重建关卡：丢弃迟到 badge
    if (!sceneEl.querySelector('#bunny-wear')) return;   // 场景已换题/换模式重建：丢弃迟到 badge
    renderBadge();
  };
  if (VERIFY || !el) { addBadge(); return; }
  const from = el.getBoundingClientRect();
  if (!wear) { addBadge(); return; }
  const to = wear.getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'flywear';
  fly.innerHTML = stickerSvg(id, 52);
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
function bounceBack(el) {                        // 贴错：贴纸弹回（wig 晃动——卡不灰可重选）
  if (!el) return;
  replayAnim(el, 'wig');
}
/* 全场彩花（celebrate / free 偶发；verify 页跳过） */
function confettiBurst(cx, cy, n) {
  if (VERIFY) return;
  for (let i = 0; i < (n || 12); i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    c.style.left = Math.round(cx - 7) + 'px';
    c.style.top = Math.round(cy - 7) + 'px';
    document.body.appendChild(c);
    const dx = Math.round(Math.random() * 240 - 120), dy = Math.round(-50 - Math.random() * 130),
          rot = Math.round(Math.random() * 320 - 160);
    requestAnimationFrame(() => {
      c.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)';
      c.style.opacity = '0';
    });
    setTimeout(() => c.remove(), 750);
  }
}
function sceneCenter() {
  const r = sceneEl.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.4 };
}
function danceRabbit(spin) {                     // 兔子跳；spin=true 章末转圈展示（§0.57 celebrate）
  const bun = sceneEl.querySelector('#bunny');
  if (bun) replayAnim(bun, spin ? 'spin' : 'hop');
  replayAnim(rabbitBtn, 'hop');
}

/* ================= 幽灵手指（教学"看/帮"/救援答案级共用） ================= */
const ghost = {
  toEl(el) { if (!el) return; const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
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
/* 教学"帮"阶段指向：当前题下一件未贴 need 片（教学锚恒 conflict 章——budget/anti 无教学期，
   防御性限定 conflict：预算/反向题指片即泄答案） */
function pointHelpNext() {
  if (!cur || state.mode !== 'task') return;
  const q = cur.quizzes[cur.step];
  if (!q || q.kind !== 'conflict') return;
  const i = nextNeededIdx(q);
  if (i >= 0) pointGhostAt(stkBtnOf(i));
}

/* ================= 判定主路径（真实点击 / DR 钩子 / autoSolve / 教学演示共用）
   anti 单击即判 uiTapSticker：同步返回 'right'/'done'/'wrong'，反馈演出异步不阻塞返回值；
   conflict/budget 第一击 uiTapSticker：同步（选中/取消/again 早退零惩罚）；
   第二击 uiTapRabbit：飞行动画+判定（hold/right/done/wrong/full；nosel=无效 pop+bump）；
   budget：装入无即时对错反馈（hold），满员即检（错件退回+miss+1）；badge 可点揭回（零惩罚）；
   吞输入轻叮必配可见回应（贴纸栏容器 bump——b21 定版）；错贴 1000ms 防重入窗（b16 定案）；
   demo 通道仅 tutorialWatch/rescueAns 内部传 true（豁免锁，演示吞真实输入不误伤）========== */
function uiTapSticker(i, demo) {
  if (state.mode === 'free') return freeTapSticker(i);     // 自由模式分流（零判定零写档）
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo) || (state.busy && !demo)) {
    sfx('pop');
    replayAnim(trayEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (q.kind === 'anti') {                          /* 反向题：单击即判（引擎同步判定，演出异步） */
    const r = engTapSticker(cur, i);
    if (r === null) { sfx('pop'); replayAnim(trayEl, 'bump'); return false; }
    lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false;
    if (!demo) void uiAntiFeedback(i, r);           /* 真实输入：反馈演出（fire-and-forget 不吞返回值） */
    return r;
  }
  const r = engTapSticker(cur, i);
  if (r === null) { sfx('pop'); replayAnim(trayEl, 'bump'); return false; }
  if (r === 'again') {                             /* 点已贴片：早退零惩罚不计数（§0.7 防御层）+可见回应 */
    sfx('pop');
    const el = stkBtnOf(i);
    if (el) replayAnim(el, 'bump');
    return 'again';
  }
  sfx('click');
  setSelHighlight(r === 'sel' ? i : null);          /* 选中高亮（class 切换，不重绘） */
  return r;                                        /* 'sel' | 'unsel' */
}

/* ================= anti 反馈演出（单击判定的异步半边：错=摇头+反向重定向；对=闪绿+ADV 窗推进）
   demo=true 时由 rescueAns 显式调用（uiTapSticker 演示路径不再自动触发，防双发）========== */
async function uiAntiFeedback(i, r, demo) {
  const run = cur;
  const el = stkBtnOf(i);
  if (r === 'wrong') {
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sayW(VOICE.antiHint);                           /* 要找不用带的一样哦（反向重定向，不泄答案） */
    state.locked = true;
    await wait(1000 * SPEED);                       /* 错点防重入窗（b16 定案） */
    if (cur === run) state.locked = false;
    return r;
  }
  /* right / done */
  if (el) { el.classList.remove('breathe'); el.classList.add('good'); }
  chimeGoal();
  danceRabbit();
  const cc = sceneCenter();
  confettiBurst(cc.x, cc.y, 10);
  sayP(VOICE.antiRight);                            /* 找对啦，它不用带 */
  state.locked = true;
  await wait(ADV_MS * SPEED);                       /* 推进窗=ADV_MS（M2 口径，注释对账 3200） */
  if (cur !== run) { state.locked = false; return r; }
  state.locked = false;
  if (r === 'done') { winFlow(); return r; }
  renderQuiz();
  return r;
}

/* ================= budget 揭回（任务模式）：点已装 badge=放回贴纸栏（零惩罚不计数）========== */
function taskPeel(idx) {
  if (!cur || state.won || state.locked || state.busy || state.demo) { sfx('pop'); return false; }
  const q = cur.quizzes[cur.step];
  if (!q || q.kind !== 'budget') { sfx('pop'); return false; }
  const id = engPeel(cur, idx);
  if (id === false) { sfx('pop'); replayAnim(sceneEl, 'bump'); return false; }
  sfx('pop');
  const ti = q.stickers.findIndex(s => s.id === id);
  if (ti >= 0) markHeld(ti, false);                 /* 该片恢复可选（class 切换） */
  renderBadge();
  lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false;
  return id;
}
async function uiTapRabbit(demo) {
  if (state.mode === 'free') return freeTapRabbit();       // 自由模式分流
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo) || (state.busy && !demo)) {
    sfx('pop');
    replayAnim(sceneEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (q.kind === 'anti') {                        /* 反向题无第二击：点兔子=轻反馈（题面由 hear 钮重读） */
    sfx('pop');
    replayAnim(sceneEl, 'bump');
    return false;
  }
  if (q.sel == null) {                             /* 未选贴纸点兔子=无效（share 定版） */
    sfx('pop');
    replayAnim(sceneEl, 'bump');
    return false;
  }
  const run = cur;                                 /* 身份守卫：演出窗内重玩会重建 cur */
  const i = q.sel;
  const el = stkBtnOf(i);
  const sid = q.stickers[i].id;
  const prePlaced = q.placed.slice();              /* budget：检查后退回错片对账用 */
  state.busy = true;                               /* 占位锁同步置位：飞行窗内紧邻输入=拒绝 */
  flySticker(el, sid, run);
  await wait(300 * SPEED);
  if (cur !== run) { state.busy = false; return false; }
  const r = engTapRabbit(cur);
  if (r === null || r === 'nosel') { state.busy = false; sfx('pop'); replayAnim(sceneEl, 'bump'); return false; }
  if (r === 'full') {                              /* budget 槽满防御层：须先揭回（正常不可达——满员即检） */
    state.busy = false;
    sfx('pop'); replayAnim(sceneEl, 'bump');
    sayR(VOICE.budgetHint);
    return 'full';
  }
  lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false;   /* 有效动作重置救援钟（§0.7a） */
  if (r !== 'wrong') renderBadge();    /* verify 页飞行即渲染（真实页 flySticker 450ms 后幂等重绘） */

  if (r === 'wrong') {
    if (q.kind === 'budget') {                     /* 满员检查未过：错件已退回（对件保留）——错片摇头+栏态复原 */
      const gone = prePlaced.concat([sid]).filter(id => q.placed.indexOf(id) < 0);
      renderBadge();
      gone.forEach(id => {
        const ti = q.stickers.findIndex(s => s.id === id);
        const gel = ti >= 0 ? stkBtnOf(ti) : null;
        if (gel) { markHeld(ti, false); replayAnim(gel, 'wig'); }
      });
      setSelHighlight(null);
      dodgeLo();
      sayW(VOICE.budgetHint);                      /* 只能带三样，放回去再挑一挑（核心反馈不受 flat 门） */
    } else {                                       /* conflict 贴错：弹回+软反馈（v1） */
      bounceBack(el);
      setSelHighlight(null);
      dodgeLo();
      sayW(VOICE.wrong);                           /* 现在不用这个哦（核心反馈不受 flat 门） */
    }
    state.locked = true;
    await wait(1000 * SPEED);                      /* 错贴防重入窗 1000ms（b16 定案） */
    if (cur !== run) return r;
    state.locked = false;
    state.busy = false;
    return r;
  }

  if (state.tut === 'help' && !demo) {             /* 教学"独"：首次真贴 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    danceRabbit();
  }
  if (el) { el.classList.remove('breathe'); el.classList.add('held'); }
  chimeHold();
  sfx('coin');
  await wait(TAP_MS * SPEED);                      /* 挂 badge 飞行窗（TAP_MS=430，时长模型同名窗） */
  if (cur !== run) { state.busy = false; return r; }
  state.busy = false;
  if (r === 'hold') { danceRabbit(); return 'hold'; }   /* 装入未齐/未满：挂起（badge 已可见——budget 对错都不判） */

  /* right / done：本题完成——兔子跳+彩花 → 下一题/通关 */
  chimeGoal();
  danceRabbit();
  const cc = sceneCenter();
  confettiBurst(cc.x, cc.y, 10);
  if (r === 'right') sayP(VOICE.right);            /* 中题 clip（flat<3）；done 的收尾语由 winFlow 全量播 */
  state.locked = true;
  await wait(ADV_MS * SPEED);                 /* 推进窗=ADV_MS 3200（M2：dru_right 2664 实长+余量，播完再读新题） */
  if (cur !== run) { state.locked = false; return r; }
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                    /* 新题（场景/贴纸栏/badge 全换）+读题 */
  if (state.tut === 'help') pointHelpNext();
  return r;
}

/* ================= 幽灵手指两击演示（教学"看"与 30s 答案级救援共用）
   指贴纸→按→选中；指兔子→按→贴上（demo 通道豁免锁）。返回第二击结果。 ================= */
async function demoPlace(i) {
  const run = cur;
  const q = run && run.quizzes[run.step];
  if (!q) return false;
  pointGhostAt(stkBtnOf(i));
  await wait(780 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r1 = uiTapSticker(i, true);
  if (r1 === false || cur !== run) { ghost.hide(); return false; }
  await wait(430 * SPEED);
  const bun = sceneEl.querySelector('#bunny');
  pointGhostAt(bun);
  await wait(780 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const r2 = await uiTapRabbit(true);
  ghost.hide();
  return r2;
}

/* ================= 自由装扮（零判定零写档零星级——piano free 同构 §0.13 不计步）
   任意贴（两击同构）/ 点已贴 badge 揭下 / 清空钮；freeState 独立于 cur（levels/step 永不动）========== */
function freeTapSticker(i) {
  if (i < 0 || i >= STICKER_IDS.length) { sfx('pop'); replayAnim(trayEl, 'bump'); return false; }
  if (freeState.placed.indexOf(STICKER_IDS[i]) >= 0) {   /* 已贴片=不可再选（每片一张） */
    sfx('pop');
    const el = stkBtnOf(i);
    if (el) replayAnim(el, 'bump');
    return 'again';
  }
  freeState.sel = (freeState.sel === i) ? null : i;
  sfx('click');
  setSelHighlight(freeState.sel === i ? i : null);  /* class 切换（不整栏重绘） */
  return 'free';                                   /* 零判定统一返回 'free'（不计数） */
}
async function freeTapRabbit() {
  if (freeState.sel == null) { sfx('pop'); replayAnim(sceneEl, 'bump'); return false; }
  const i = freeState.sel;
  const el = stkBtnOf(i);
  const id = STICKER_IDS[i];
  freeState.sel = null;
  freeState.placed.push(id);                       /* 挂 free 台（badge 由 flySticker 收尾渲染） */
  flySticker(el, id, null);
  chimeHold();
  sfx('coin');
  if (el) el.classList.add('held');                 /* 贴上：该片用掉（held） */
  setSelHighlight(null);
  await wait(300 * SPEED);
  freeTapN++;
  if (freeTapN % 3 === 1) {                        /* 偶发兔子跳+小彩花（纯玩具层） */
    danceRabbit();
    const cc = sceneCenter();
    confettiBurst(cc.x, cc.y, 7);
  }
  return 'free';
}
function freePeel(idx) {                           // 揭下第 idx 个 badge（回贴纸栏复用）
  if (state.mode !== 'free') return false;
  if (idx == null || idx < 0 || idx >= freeState.placed.length) { sfx('pop'); replayAnim(sceneEl, 'bump'); return false; }
  const id = freeState.placed[idx];
  freeState.placed.splice(idx, 1);
  sfx('pop');
  const i = STICKER_IDS.indexOf(id);
  if (i >= 0) markHeld(i, false);                   /* 该片恢复可用（class 切换） */
  renderBadge();
  return id;
}
function freeClear() {                             // 清空钮：揭光全部
  if (state.mode !== 'free' || !freeState.placed.length) return false;
  freeState.placed = [];
  freeState.sel = null;
  sfx('pop');
  renderTray(null);
  renderBadge();
  danceRabbit();
  return true;
}

/* ================= 模式切换（顶部大按钮；教学演示期拒绝——piano 同构） ================= */
function setMode(m) {
  if (state.mode === m) return state.mode;
  if (state.demo || state.tut === 'watch') {       // 教学"看"演示期不打断
    sfx('pop'); replayAnim(trayEl, 'bump');
    return state.mode;
  }
  state.mode = m;
  state.locked = false; state.busy = false; state.won = false;
  ghost.hide();
  renderModeBtns();
  if (m === 'free') {
    freeState = { placed: [], sel: null };         // 每次进 free 从干净台开始（cur 不动=quiz 静止）
    renderFree();
    renderStep();                                  /* 进度点保持 task 状态静止（零计步） */
    danceRabbit();
    sayR(VOICE.free);                              /* 自由装扮时间 */
  } else {
    startLevel(cur ? cur.flat : 0);                // 任务：确定性重发当前关（badge/贴纸栏重建）
  }
  return state.mode;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4 静态=CHAPTERS[floor(f/5)+1]，契约 M1）；
     生成关禁 (ci+1)%N 字面——实算下一关 genLevel(f+1).dch（契约 F，r10 修复 v1 违规） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  renderStep();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right);                               /* 装扮好啦，真好看 */
  danceRabbit(true);                               /* 兔子转圈展示（§0.57 celebrate） */
  const cc = sceneCenter();
  confettiBurst(cc.x, cc.y, 16);                   /* 全场彩花 */
  if (VERIFY) return;                              // verify 页：引擎判定即止，不弹层不写档
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })          /* 家族A：§0.4 防跳章（与启动处一致传 lim-1） */;
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                               // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);                  // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  ghost.hide();
  cur = genLevel(flat);
  state = { mode: 'task', locked: false, busy: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false; rescueDirDone = false; rescueAnsDone = false;
  lastAct = Date.now();
  renderModeBtns();
  renderDots();
  if (VERIFY) { renderQuiz(true); return; }        // verify 页：静默渲染，教学链由 runVerify 单元直调
  const sv = KIDS._save() || { levels: {} };
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.dressup && sv.dressup.tutSeen);
  if (freshTut) { renderQuiz(true); tutorialWatch(); return; }   /* 教学期静默（watch clip 先行） */
  renderQuiz();                                    /* 正常开场：渲染+读题（renderQuiz 内 speakQuiz） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指完整演示贴一题两件（flat0 题0 恒 rain——雨衣+雨靴，两击全过程 ×2 件，
   末击返回 'right' → __drDemoR）；帮=指向下一件未贴 need 片；独=首次真贴放手（watch ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch);                               /* 看！给小兔子戴上帽子 */
  await wait(700 * SPEED);
  const run = cur;
  const q0 = run.quizzes[0];                       // flat0 题0 恒 rain（need=[raincoat,rboots]）
  let demoR = null;
  for (let k = 0; k < q0.need.length; k++) {       // 幽灵手指逐件两击（完整演示怎么贴）
    if (cur !== run) { state.demo = false; ghost.hide(); return; }
    const i = nextNeededIdx(run.quizzes[run.step]);
    if (i < 0) break;
    demoR = await demoPlace(i);
    if (demoR === false) { state.demo = false; return; }
    await wait(420 * SPEED);
    if (cur !== run) { state.demo = false; ghost.hide(); return; }
  }
  /* 审查M2：删演示收束语 say('装扮好啦')——与 dru_right 文案「装扮好啦，真好看」撞头互掐 */
  window.__drDemoR = demoR;                        // 演示生效证据（§0.27，gate 断言 'right'）
  await wait(500 * SPEED);
  const sv = KIDS._save() || {};
  sv.dressup = sv.dressup || {};
  sv.dressup.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来装扮它"在重发后的题面上说（照 batch5-23） */
  ghost.hide();
  cur = genLevel(0);
  state = { mode: 'task', locked: false, busy: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false; rescueDirDone = false; rescueAnsDone = false;
  lastAct = Date.now();
  renderModeBtns();
  renderQuiz(true); renderDots();                  /* 静默渲染（turn clip 先行，题面由 qTimer 接力） */
  if (qTimer) { clearTimeout(qTimer); qTimer = null; }
  /* 交接顺序链：turn clip 播完再读题面（qTimer 接力，§0.6 禁双通道叠音） */
  sayR(VOICE.turn);                                /* 你来装扮它 */
  qTimer = setTimeout(() => {
    qTimer = null;
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz(cur.quizzes[cur.step]);
  }, 2000);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}

/* ================= 救援钟（任务模式静置；verify 页由 verify 直驱函数测）——piano 双锚结构
   14s 方向级=重读题面；conflict 加 need 未贴片 pulse（v1）——budget/anti 指片即泄答案，改场景 pulse
   （一次性锚 rescueDirDone，不重置 lastAct——30s 答案级可达）
   30s 答案级=帮做：conflict 幽灵手指演示贴一件 / budget 先揭回一件错件（若有）再演示装一件
   对的（帮做不制造 miss）/ anti 幽灵手指点错位件；演示=有效动作重开救援窗 ================= */
function rescueDir() {
  if (!cur || cur.done) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q._answered) return false;
  speakQuiz(q);                                    /* 重读题面（TTS） */
  if (q.kind === 'conflict') {
    const i = nextNeededIdx(q);                    /* need 中未贴物品在贴纸栏 pulse */
    if (i >= 0) {
      const el = stkBtnOf(i);
      if (el) replayAnim(el, 'pulse');
    }
    return true;
  }
  replayAnim(sceneEl, 'pulse');                    /* budget/anti：场景脉冲（方向锚不泄答案） */
  return true;
}
async function rescueAns() {
  if (!cur || cur.done) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q._answered) return false;
  if (q.kind === 'anti') {                         /* 反向：幽灵手指点错位件（单击即判，帮做整题） */
    const i = nextNeededIdx(q);
    if (i < 0) return false;
    state.demo = true;
    pointGhostAt(stkBtnOf(i));
    await wait(780 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    const r = uiTapSticker(i, true);
    await uiAntiFeedback(i, r, true);
    ghost.hide();
    state.demo = false;
    const ok = r === 'right' || r === 'done';
    if (ok) { lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false; }
    return ok;
  }
  if (q.kind === 'budget') {                       /* 预算：先揭回一件错件（若有）再演示装一件对的 */
    state.demo = true;
    const wrongIdx = q.placed.findIndex(id => q.need.indexOf(id) < 0);
    if (wrongIdx >= 0) {
      const badge = sceneEl.querySelectorAll('#bunny-wear .wear')[wrongIdx];
      if (badge) {
        pointGhostAt(badge);
        await wait(700 * SPEED);
        ghost.press();
        await wait(300 * SPEED);
      }
      const id = engPeel(cur, wrongIdx);
      if (id !== false) {
        const ti = q.stickers.findIndex(s => s.id === id);
        if (ti >= 0) markHeld(ti, false);
        renderBadge();
        sfx('pop');
      }
      await wait(400 * SPEED);
    }
    const i = nextNeededIdx(q);
    let r = false;
    if (i >= 0) r = await demoPlace(i);
    state.demo = false;
    const ok = r === 'hold' || r === 'right' || r === 'done';
    if (ok) { lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false; }
    return ok;
  }
  /* conflict（v1）：幽灵手指演示贴一件 */
  const i = nextNeededIdx(q);
  if (i < 0) return false;
  const before = q.placed.length;
  state.demo = true;                               /* 审查m2：救援演出期关真实输入门（与教学路径对称） */
  const r = await demoPlace(i);                    /* 幽灵手指两击演示贴一件（真贴——帮做一件） */
  state.demo = false;                              /* demoPlace 全路径返回后恢复 */
  const ok = r === 'hold' || r === 'right' || r === 'done';
  if (ok && q.placed.length === before + 1) {
    lastAct = Date.now();                          /* 演示=有效动作：重开救援窗（答案级不饿死） */
    rescueDirDone = false; rescueAnsDone = false;
  }
  return ok;
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.mode !== 'task' || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000 && !rescueAnsDone) { rescueAnsDone = true; rescueAns(); return; }
  if (idle > 14000 && !rescueDirDone) { rescueDirDone = true; rescueDir(); return; }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.20 三件门+轻反馈 */
  lastAct = Date.now();
  if (state.mode === 'task') {
    const q = cur.quizzes[cur.step];
    if (q && q.sel != null) { uiTapRabbit(); }     /* 已选贴纸：点底栏兔子同第二击（宽容热区） */
    else if (q) speakQuiz(q);                      /* 未选：戳兔子重读题面 */
  } else {
    if (freeState.sel != null) freeTapRabbit();
  }
});
replayBtn.addEventListener('pointerdown', e => {   // 再玩一次：确定性重发当前关
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || state.mode !== 'task' || !cur || state.locked || state.demo || state.won) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {     // 再听一遍：重读题面（任务模式）
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || state.mode !== 'task' || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  speakQuiz(cur.quizzes[cur.step]);
});
clearBtn.addEventListener('pointerdown', e => {    // 清空钮（仅自由模式显示）
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || state.mode !== 'free') { if (state.mode !== 'free') { sfx('pop'); replayAnim(trayEl, 'bump'); } return; }
  freeClear();
});
trayEl.addEventListener('pointerdown', e => {      // 第一击：点贴纸
  const p = e.target.closest('.stk');
  if (!p) return;
  e.preventDefault();
  KIDS.audio.unlock();
  uiTapSticker(Number(p.dataset.i));
});
sceneEl.addEventListener('pointerdown', e => {     // 第二击：点场景内小兔子（有选中=贴上；无选中=重听题面）
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || !cur) return;
  if (e.target.closest('#bunny-wear .wear') && state.mode === 'free') {   /* free：点 badge=揭下 */
    freePeel(Number(e.target.closest('.wear').dataset.idx));
    return;
  }
  if (state.mode === 'free') {                     /* free：有选中=贴上；无选中=轻弹反馈（无题面可读） */
    if (freeState.sel != null) freeTapRabbit();
    else { sfx('pop'); replayAnim(sceneEl, 'bounce'); }
    return;
  }
  if (e.target.closest('#bunny-wear .wear') && cur.quizzes[cur.step] &&
      cur.quizzes[cur.step].kind === 'budget') {   /* budget：点已装 badge=揭回（零惩罚解槽） */
    taskPeel(Number(e.target.closest('.wear').dataset.idx));
    return;
  }
  if (state.locked || state.busy || state.won || state.demo) { sfx('pop'); replayAnim(sceneEl, 'bump'); return; }   /* 教学/演出/飞行期 §0.22 */
  lastAct = Date.now();
  const q = cur.quizzes[cur.step];
  if (q && q.sel != null) uiTapRabbit();           /* 有选中=第二击（贴到兔子身上） */
  else if (q) {                                    /* 未选：重读题面（儿童高发探索动作） */
    replayAnim(sceneEl, 'bounce');
    speakQuiz(q);
  }
});
btnFree.addEventListener('pointerdown', e => {
  e.preventDefault(); KIDS.audio.unlock(); sfx('click');
  setMode('free');
});
btnTask.addEventListener('pointerdown', e => {
  e.preventDefault(); KIDS.audio.unlock(); sfx('click');
  setMode('task');
});

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
renderModeBtns();
if (!VERIFY) {
  KIDS.init({ game: 'dressup', title: '贴纸装扮' });   // 存档键 kidsgame_dressup（core VER 1.0）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {   // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })          /* 家族A：§0.4 防跳章（winFlow 同款 lim-1） */;
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.DR = {
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
    return { kind: q.kind,                                     /* SPEC §8 钩子契约（r10 三族） */
             budget: q.budget,                                 /* 预算章槽位数（他族 null） */
             theme: q.theme,
             need: q.need.slice(),                             /* 需贴 id 数组（anti=[错位件]） */
             stickers: q.stickers.map(s => ({ id: s.id, theme: s.theme, right: s.right })),
             sel: q.sel,                                       /* 选中态下标（两击制外部驱动观测面——wall-clock 驱动靠它分流第二击；null=未选） */
             placed: q.placed.slice(),                         /* 已贴 id 数组 */
             step: cur.step,
             miss: q._miss || 0 };                             /* 本题贴错数 */
  },
  tapSticker(i) { return uiTapSticker(i); },                   /* 第一击/anti 单击即判：i=stickers 下标 */
  tapRabbit() { return uiTapRabbit(); },                       /* 第二击：把选中贴上（conflict/budget） */
  peel(i) { return taskPeel(i); },                             /* budget：揭回第 i 个已装件（零惩罚） */
  mode() { return state.mode; },
  setMode(m) { return setMode(m); },
  freePeel(i) { return freePeel(i); },                         /* free：揭下第 i 个 badge（辅助观测） */
  freeClear() { return freeClear(); },
  async autoSolve() {                    // UI 路径自动完成当前关（三族分流，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 400) {
      if (state.mode !== 'task') break;
      if (state.locked || state.busy || state.won || state.demo) { await wait(60); continue; }
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (q.kind === 'anti') {                    // 反向：单击错位件 → 等演出窗走完推进
        const i = q.stickers.findIndex(s => s.right);
        if (i < 0) break;
        const before = cur.step;
        const r = uiTapSticker(i);
        if (r === false) break;
        if (r === 'right' || r === 'done') {
          taps++;
          for (let k = 0; k < 120 && cur.step === before && !cur.done; k++) await wait(80);
        }
        continue;
      }
      if (q.sel == null) {
        const i = nextNeededIdx(q);
        if (i < 0) break;
        const r = uiTapSticker(i);
        if (r === false) break;
        continue;
      }
      const r = await uiTapRabbit();
      if (r === false || r === null) break;
      if (r === 'wrong') continue;               // 弹回后重选重贴（正常不发生——need 片恒 right）
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
