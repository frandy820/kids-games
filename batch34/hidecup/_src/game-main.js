/* ================= hidecup 主逻辑（亮相→躲杯→换位→静止→点杯开杯）
   开题演出（presentQuiz）：动物探头亮相 1.5s（peek 升起 CSS）→ 缩回杯内 400ms
   → 等亮相链播完（链=[名音 hc_n_<id>(clip), hc_show(clip)]，窗 SHOW_WIN 4300
   ≥ max(3738, 名音 1440+150+hc_show 1848+300=3738)——契约 N/G/T46 化）
   → 换位演出（swaps 逐次两杯互换，速度按档 swapMsOf：dch1/2=1100/dch3=900/
   dch4=700（r25 提速）/教学 1600，杯恒盖住；transition-duration 由 JS 逐次
   设定=verify 页乘 SPEED 同步缩短）→ 静止 800ms → 开放点选。
   r25 hidedual（dch4 qi1/3）：亮相链 3 段 [名音A, 名音B, hc_show]（窗
   SHOW_WIN_DUAL 5400）+两只轮流探头（3800ms 窗）+q-text 双名；第一步点对=
   'half'（A found+链 [hc_right,hc_n_A,hc_n_B] 窗 HALF_WIN 5800+q-text 切 B 名）
   → 第二步点对=right/done（确认链尾=hc_n_B）；第二问重演时 A 藏回完整重看、
   演毕恢复 found。
   演出锁=真时钟 state.showUntil（Date.now() 比较，tapCup 演出期返 null——
   测试驱动须轮询等可交互）。
   点对=杯抬+动物蹦出+确认链 [hc_right, hc_n_<id>]（全 clip 无 keyless——契约 N）
   演出窗 1600+3000=4600 ≥ 2232+150+1440+300=4122（家族 G/H）；教学演示窗
   1600+2450=4050 ≥ 2232+150+1368+300=4050（rabbit 名音）。
   点错=空开 600+盖回 500+错链 [hc_wrong, hc_hint]（豁免窗 5154=1656+150+3048+300
   真时钟，契约 I）+首错杯阵整体 wiggle（方向级不指杯）/miss≥2 正确杯 breathe（答案级）。
   重看=同 swaps 重放（resetCups 回初始排列→重演，3s 节流，题面后可点；速度
   同初看档位）——记忆任务重演不泄答案（换位过程与初看一致）。
   救援：14s 方向级=重演换位（lastDir 独立节流锚，不重置 lastAct——契约 B）/
   30s 答案级=正确杯 breathe+重演；错链豁免窗让路（契约 I）。r25 M1 防回归：
   doReplay 完成段 lastAct 仅 user=true 刷（救援路径不刷=答案级不被饿死）。
   验收钩子：window.HC = { get currentLevel, get quiz{kind,cups,swaps,start,answer,
   anim,step,miss,(dual:startA/B,answerA/B,animA/B,phase)}, tapCup(i), start(flat),
   autoSolve(), replay() }——真实页同暴露（b29 坑⑥）。
   tapCup 返回：对且非末题 'right' / 对且末题 'done' / dual 第一步对 'half'（r25）/
   错 'wrong' / 豁免窗内错点吞 false / 换位演出期 null（真时钟锁）/ 越界·已答·无题 null。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字 + 600 落定余量（全字符口径）
/* 救援/开场任务语音不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流：flat<3 每错必播；flat≥3 走 10s 节流（契约 J：语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（真时钟，救援 interval 让路——契约 I） */
const sayW = parts => {
  if (!cur) return false;
  if (cur.flat >= 0 && cur.flat < 3) { KIDS.voice.queue(parts); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); return true; }
  return false;                            /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

const sceneEl = $id('scene'), cupsEl = $id('cups'), qTextEl = $id('q-text'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel/教学迷你关产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let lastReplayAt = 0;                           // 重演 3s 节流锚（SPEC §0.82）
let helpRedemo = false;
let showRun = 0;                                // 演出令牌（重开关卡/新题/重演中止在途）
let firstFlat = 0;                              // 启动首个未通关 flat（教学完成后进入）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cupWrapAt = pos => cupsEl.querySelector('.cup-wrap[data-pos="' + pos + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成，家族马林巴音色）：答对=双音上行 / 答错=低柔单音
   换位嗖=低频滑感短音（换位演出不配语音，轻音效辅助注意——SPEC §1） */
const chimeGoal = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };
const whoosh = () => { if (!VERIFY) KIDS.audio.note(392, 0.1, 0, 0.35); };

/* ================= 渲染 ================= */
function layoutCups() {                          // 按当前位置布杯（slot 均布居中）
  const W = cupsEl.clientWidth || 560;
  const n = (window.__hcPerm || []).length;
  if (!n) return;
  const slotW = W / n;
  cupsEl.querySelectorAll('.cup-wrap').forEach(w => {
    const pos = Number(w.dataset.pos), wrapW = w.offsetWidth || 170;
    w.style.left = Math.round(pos * slotW + (slotW - wrapW) / 2) + 'px';
  });
}
function renderCups(q) {                         // 杯阵初始排列（identity）+动物挂 start 杯随杯走
  cupsEl.innerHTML = '';                         // r25 hidedual：A/B 各挂 startA/startB 杯（两只随杯走）
  window.__hcPerm = [];
  for (let k = 0; k < q.cups; k++) window.__hcPerm.push(k);     // pos→cup 初始 identity（契约 M 数值层锚）
  const hostOf = cupId => q.kind === 'hidedual'
    ? (cupId === q.startA ? q.animA : (cupId === q.startB ? q.animB : null))
    : (cupId === q.start ? q.anim : null);
  for (let cupId = 0; cupId < q.cups; cupId++) {
    const w = document.createElement('div');
    w.className = 'cup-wrap pop';
    w.dataset.cup = cupId;                       // 杯身份（换位中不变）
    w.dataset.pos = cupId;                       // 当前位置（演出器逐次互换=相位标签锚）
    w.style.animationDelay = (cupId * 70) + 'ms';
    const peek = document.createElement('div');
    peek.className = 'peek';
    const host = hostOf(cupId);
    if (host) peek.innerHTML = animalSvg(host, 106);   // 动物只挂 start 杯（开对前视觉不可见）
    const cup = document.createElement('div');
    cup.className = 'cup';
    cup.innerHTML = cupSvg(130);
    w.appendChild(peek); w.appendChild(cup);
    cupsEl.appendChild(w);
  }
  layoutCups();
  cupsEl.dataset.cups = q.cups;                  // 帧内容锚（verify 断言渲染即引擎；r25 4 杯 CSS 档位适配钩）
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
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderCups(q);
  renderStep();
}
/* r25 q-text 动态：hide=通用问句 / hidedual 按 phase=当前问的动物名（pre-literate
   由亮相名音链预告，文字为陪读锚） */
function setQText(t) { qTextEl.textContent = t; }
const dualQText = (q, phase) => ANIMAL_NAME[phase === 1 ? q.animB : q.animA] + '藏在哪里呀';

/* ================= 换位动画：两杯互换（transition-duration 由 JS 设定=verify 同步提速；
   r25 按档 swapMsOf：dch1/2=1100/dch3=900/dch4=700，教学 1600——Math.round 防
   700×0.12 浮点尾差产出非整串（verify ⑭ 精确断言配套））
   dataset.pos/__hcPerm 即时同步（逻辑排列已定，视觉过渡平滑） ================= */
function doSwapAnim(sw, durMs) {
  const wa = cupWrapAt(sw[0]), wb = cupWrapAt(sw[1]);
  if (!wa || !wb) return;
  const d = Math.round(durMs * SPEED) + 'ms';
  wa.style.transitionDuration = d; wb.style.transitionDuration = d;
  const la = wa.style.left, lb = wb.style.left;
  wa.style.left = lb; wb.style.left = la;
  wa.dataset.pos = sw[1]; wb.dataset.pos = sw[0];
  const t = window.__hcPerm[sw[0]];
  window.__hcPerm[sw[0]] = window.__hcPerm[sw[1]];
  window.__hcPerm[sw[1]] = t;
  whoosh();
}
/* 重演回位：瞬时（无过渡）复位到初始排列（盖住态摆回，重演与初看一致） */
function resetCups(q) {
  cupsEl.querySelectorAll('.cup-wrap').forEach(w => {
    w.style.transitionDuration = '0ms';
    w.dataset.pos = w.dataset.cup;               // identity 复位
  });
  window.__hcPerm = [];
  for (let k = 0; k < q.cups; k++) window.__hcPerm.push(k);
  layoutCups();
  void cupsEl.offsetWidth;                       // 强制 reflow 落定复位，再恢复过渡
  cupsEl.querySelectorAll('.cup-wrap').forEach(w => { w.style.transitionDuration = ''; });
}

/* ================= 开题演出：渲染 → 亮相链+peek → 换位 → 静止 → 开放点选
   演出锁=真时钟 showUntil（tapCup 演出期返 null——测试驱动须轮询等可交互）。
   r25：换位速度按档 swapMsOf(cur.dch)（dch3 900/dch4 700，教学 slow 恒 1600）；
   hidedual 亮相链 3 段 [名音A, 名音B, hc_show]（窗 SHOW_WIN_DUAL）+两只轮流
   探头（A 升 1.1s 收 0.4s → B 同律，与名音链 A→B 顺序对应）；q-text 按 kind。 ================= */
async function presentQuiz(slow) {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  renderQuiz();
  const run = cur, token = ++showRun;
  const dual = q.kind === 'hidedual';
  const swapMs = slow ? SWAP_MS_TUT : swapMsOf(cur.dch);
  const peekTotal = dual ? (PEEK_MS + HIDE_MS) * 2 : PEEK_MS + HIDE_MS;   // dual 两只轮流=3800
  const chainWin = slow ? SHOW_WIN_TUT : (dual ? SHOW_WIN_DUAL : SHOW_WIN);
  const total = chainWin + q.swaps.length * swapMs + STILL_MS;
  state.locked = true;
  state.showUntil = Date.now() + total * SPEED + 140;      // 真时钟演出锁（余量）
  setQText(dual ? (ANIMAL_NAME[q.animA] + '和' + ANIMAL_NAME[q.animB] + '藏在哪里呀') : Q_TEXT);
  if (dual) {
    KIDS.voice.queue([nameClip(q.animA), nameClip(q.animB), VOICE.show.key]);   // 双动物亮相链（3 段全 clip）
    requestAnimationFrame(() => requestAnimationFrame(() => {
      /* m3 竞态守卫（r25 审查挂账②）：双层闭包在 showRun++（重开关卡/通关/重演）后
         仍可能对旧关 wrap——重渲染后 querySelector 命中的是**新关同号杯**——加 'up'
         （非死锁竞态瑕疵）；token/cur 双判与下方 await 点守卫同款（r46 S1 旗标回收
         不变式：++ 到新启动之间旗标恒一致，消费前先验） */
      if (token !== showRun || cur !== run) return;
      const upA = cupsEl.querySelector('.cup-wrap[data-cup="' + q.startA + '"] .peek');
      const upB = cupsEl.querySelector('.cup-wrap[data-cup="' + q.startB + '"] .peek');
      if (upA) {
        upA.classList.add('up');                           // A 先探头（对应名音链首段）
        setTimeout(() => upA.classList.remove('up'), (PEEK_MS - HIDE_MS) * SPEED);
      }
      setTimeout(() => {
        if (token !== showRun || cur !== run) return;   /* B 探头同守卫：A 升起后切关，B 不再对旧 q 探头 */
        if (upB) {
          upB.classList.add('up');                         // B 后探头（对应名音链次段）
          setTimeout(() => upB.classList.remove('up'), (PEEK_MS - HIDE_MS) * SPEED);
        }
      }, PEEK_MS * SPEED);
    }));
  } else {
    KIDS.voice.queue([nameClip(q.anim), VOICE.show.key]);  // 亮相链（T46 化全 clip，原 keyless 尾段→hc_show）
    const peekEl = cupsEl.querySelector('.cup-wrap[data-cup="' + q.start + '"] .peek');
    if (peekEl) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        peekEl.classList.add('up');                        // 探头亮相 1.5s（CSS 升起）
        setTimeout(() => { peekEl.classList.remove('up'); }, (PEEK_MS - HIDE_MS) * SPEED);
      }));
    }
  }
  await wait(peekTotal * SPEED);                           // 亮相+缩回（dual=3800 两只轮流）
  if (token !== showRun || cur !== run) return;
  await wait((chainWin - peekTotal) * SPEED);              // 等亮相链播完（TTS 尾段）
  if (token !== showRun || cur !== run) return;
  for (let k = 0; k < q.swaps.length; k++) {
    doSwapAnim(q.swaps[k], swapMs);                        // 换位（r25 按档：1100/900/700，教学 1600 慢速）
    await wait(swapMs * SPEED);
    if (token !== showRun || cur !== run) return;
  }
  await wait(STILL_MS * SPEED);                            // 换完全场静止 800ms
  if (token !== showRun || cur !== run) return;
  state.locked = false;
  lastAct = Date.now();                                    /* 演出完成开放点选（b25 M4：重置 idle 锚） */
  lastDir = Date.now();
}

/* ================= 重看：同 swaps 重放全程（记忆任务重演不泄答案）
   user=true 走 3s 节流（题面后可点）；救援 false 不重置 lastAct（契约 B）。
   r25：速度同初看（swapMsOf 档位——重演不降难度）；hidedual phase1 重演时
   A 杯 found 先移除（藏回完整重看换位、不露已开杯跟随移动）、演毕恢复
   （已完成步的视觉不吞）——恢复动作在 user=false 救援路径同样不刷 lastAct。 ================= */
async function doReplay(user) {
  const q = cur && cur.quizzes[cur.step];
  if (!q || state.won) return false;
  if (cur.flat < 0) return false;                /* 教学迷你关禁重演（重发=破坏教学时序） */
  if (user) {
    if (Date.now() - lastReplayAt < 3000) return false;   // 3s 节流（SPEC §0.82）
    lastReplayAt = Date.now();
  }
  const run = cur, token = ++showRun;
  const swapMs = swapMsOf(cur.dch);              // r25：与初看同速（1100/900/700）
  const total = RESET_MS + q.swaps.length * swapMs + STILL_MS;
  state.locked = true;
  state.showUntil = Date.now() + total * SPEED + 140;
  const wa = q.kind === 'hidedual' && q.phase === 1
    ? cupsEl.querySelector('.cup-wrap[data-cup="' + q.startA + '"]') : null;
  if (wa) wa.classList.remove('found');          // 重演期 A 藏回（杯身份锚 data-cup 不随 pos 变）
  resetCups(q);                                  // 瞬时回初始排列
  await wait(RESET_MS * SPEED);
  if (token !== showRun || cur !== run) return false;
  for (let k = 0; k < q.swaps.length; k++) {
    doSwapAnim(q.swaps[k], swapMs);              // 同 swaps 重演（与初看一致）
    await wait(swapMs * SPEED);
    if (token !== showRun || cur !== run) return false;
  }
  await wait(STILL_MS * SPEED);
  if (token !== showRun || cur !== run) return false;
  if (wa) wa.classList.add('found');             // 恢复已开 A 杯视觉（第一问已完成）
  state.locked = false;
  if (user) lastAct = Date.now();                /* 主动重看重置 idle（救援路径不动 lastAct——契约 B；r24 审查 M1 防回归锚） */
  return true;
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
/* 教学"帮"阶段指向：当前题正确杯位置（教学期泄答案=家族先例，帮→独后撤） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cupWrapAt(i));
}

/* ================= 点杯主路径（真实点击 / HC.tapCup / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（杯阵容器 bump 微动效——家族 D）；
   演出锁真时钟（演出期 null）；豁免窗 guard（I 补：错点吞/对选放行）========== */
async function uiTapCup(i, demo) {
  if (!cur || state.won) { sfx('pop'); replayAnim(cupsEl, 'bump'); return null; }
  if (!demo && (state.locked || state.demo || Date.now() < state.showUntil)) {
    sfx('pop');                                  /* 演出锁（真时钟）：吞+轻叮+bump */
    replayAnim(cupsEl, 'bump');
    return null;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return null;
  if (!Number.isInteger(i) || i < 0 || i >= q.cups) { sfx('pop'); replayAnim(cupsEl, 'bump'); return null; }   // 越界
  if (q._answered) return null;
  /* b31 家族 I 补口径（2026-09-11）：错链豁免窗（真时钟）内错点吞——pop+bump 不计 miss；
     对选放行（缓解吞输入急性子观察）；窗后第二错照常计 miss（miss≥2 梯度可达） */
  if (!demo && wrongChainUntil && Date.now() < wrongChainUntil && i !== q.answer) {
    sfx('pop'); replayAnim(cupsEl, 'bump'); return false;
  }
  const run = cur, token = showRun;              /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapCup(cur, i);
  if (r === null) { sfx('pop'); replayAnim(cupsEl, 'bump'); return null; }
  const el = cupWrapAt(i);

  if (r === 'wrong') {                           /* 开空：空开 600+盖回 500+错链两段+视觉梯度 */
    state.locked = true;
    state.showUntil = Date.now() + (OPEN_MS + CLOSE_MS) * SPEED + 140;
    dodgeLo();
    if (el) el.classList.add('opened');          /* 空开（该杯无动物——动物只挂 start 杯） */
    if (sayW([VOICE.wrong.key, VOICE.hint.key]))           /* 错链全 clip 无 keyless（契约 N） */
      wrongChainUntil = Date.now() + WRONG_CHAIN_WIN;      /* 链豁免：1656+150+3048+300=5154 真时钟（契约 I） */
    if (q._miss === 1) replayAnim(cupsEl, 'wig');          /* 方向级：三杯整体 wiggle 不指杯 */
    if (q._miss >= 2) {                                   /* miss≥2=正确杯 breathe（答案级梯度） */
      const ok = cupWrapAt(q.answer);
      if (ok) replayAnim(ok, 'breathe');
    }
    await wait(OPEN_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    if (el) el.classList.remove('opened');       /* 盖回 */
    await wait(CLOSE_MS * SPEED);
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    return r;
  }

  /* ---- r25 half（双动物第一步对：A 蹦出+确认链尾名音预告第二问+q-text 切 B，
     不推 step 不置 _answered；窗 HALF_WIN 5800 ≥ 2232+150+1440+150+1440+300=5712） ---- */
  if (r === 'half') {
    state.locked = true;
    state.showUntil = Date.now() + HALF_WIN * SPEED + 140;
    const wa = cupWrapAt(q.answerA);             /* 引擎已切 phase=1（q.answer=answerB），A 位置读 answerA */
    if (wa) { wa.classList.remove('breathe'); wa.classList.add('found'); }
    chimeGoal();
    sfx('coin');
    KIDS.voice.queue([VOICE.right.key, nameClip(q.animA), nameClip(q.animB)]);   /* 确认链 3 段：找到啦+A 名+B 名（链尾=第二问预告） */
    setQText(dualQText(q, 1));                   /* q-text 切『<B名>藏在哪里呀』（视觉先行） */
    await wait(1600 * SPEED);
    if (cur !== run || token !== showRun) return r;
    await wait((HALF_WIN - 1600) * SPEED);       /* 罩 3 段确认链收尾 */
    if (cur !== run || token !== showRun) return r;
    state.locked = false;
    lastAct = Date.now();              /* 审查M2 r25：half 亦是正确作答——解锁即重置救援钟（§0.7a 与
                                          right 路径一致）。不刷则第一问思考 ≥24s 的孩子 half 解锁后
                                          idle 已越 30s，第二问被答案级救援即刻泄题（breathe 指 answerB） */
    return r;
  }

  /* ---- right·done（开对：杯抬+动物蹦出+确认链拼播） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    window.__hcTutSolo = true;                   /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  const celeWin = demo ? TUT_CELE : CELE_MAIN + CELE_TAIL;   /* 教学演示窗 4050=2232+150+1368+300 精确 */
  state.showUntil = Date.now() + celeWin * SPEED + 140;
  if (el) { el.classList.remove('breathe'); el.classList.add('found'); }
  chimeGoal();
  sfx('coin');
  /* 试玩P1 r25：dual 第二步（phase=1 问 B）末步名音须=B——q.anim 兼容字段恒=animA，
     三元分流（不动 q.anim 语义，SPEC §R4 末步名音=当前答案口径） */
  KIDS.voice.queue([VOICE.right.key, nameClip(q.kind === 'hidedual' ? q.animB : q.anim)]);
  await wait(1600 * SPEED);                      /* 杯抬+动物蹦出+确认链主窗 */
  if (cur !== run) return r;
  await wait((demo ? 2450 : 3000) * SPEED);      /* 确认链收尾窗：4600 ≥ 2232+150+1440+300=4122（家族 G/H） */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') {
    if (cur.flat < 0) {                          /* 教学迷你关完成：帮→独后进正式关（watch 期由
                                                   tutorialWatch 接管，不进关） */
      if (state.tut === 'solo') startLevel(firstFlat);
      return 'done';
    }
    winFlow(); return 'done';
  }
  presentQuiz();                                 /* 新题开题（亮相→换位→静止） */
  return r;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_hidecup） ================= */
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
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* hc_right：找到啦，真棒（2232ms） */
  if (VERIFY) { persistWin(stars); return; }     // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2232+300=2532 */
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
  cur = genLevel(flat);
  lastWrongVoice = 0; wrongChainUntil = 0; lastReplayAt = 0;   /* 换关重置节流锚与链豁免（契约 I/J 配套） */
  state = { locked: true, won: false, demo: false, tut: 'none', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();                          /* 开题重置 idle 锚 */
  lastDir = Date.now();
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.hidecup && sv.hidecup.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  presentQuiz();                                 // 开题演出（verify 页同跑——autoSolve 需其解锁）
}

/* ================= 教学迷你关（仅关 1-0 首次，SPEC §1：watch=2 杯 1 换慢速/turn=2 杯 1 换）
   watch=播 hc_tut_watch「看！小动物藏起来啦」→ 兔子亮相躲杯+1 次慢速换位（1600ms）→
   幽灵手指点正确杯 →开对（__hcDemoR）；turn=重立猫猫 2 杯 1 换迷你关「你来试一试」，
   帮（指向正确杯）→首对独（solo）→进正式关。时序（家族 G/H）：
   watch clip 3264 → 延 3564（≥3264+300）→ 开题演出（亮相窗 4200 ≥ rabbit 名音 1368+150+
   estMs('要躲猫猫啦')2325+300=4143 + 慢速换位 1600 + 静止 800）→ ghost 移入 800+press 320
   → demo 演出窗 1600+2450=4050（罩确认链 2232+150+1368+300=4050）→
   turn clip 1824 → 延 2124（≥1824+300）→ presentQuiz 4300+1100+800
   —— watch 段分账 3564+4200+1600+800+800+320+4050=15334 ≤ 16000 ---------- */
function tutWatchLevel() {                       // 双题迷你关：题 0=演示题（demo 开对返回 'right'）
  const mk = (start, anim) => ({ kind: 'hide', cups: 2, swaps: [[0, 1]], start: start,
    answer: derive(start, [[0, 1]]), anim: anim, _miss: 0, _answered: false });
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false, anim: 'rabbit',
           quizzes: [mk(0, 'rabbit'), mk(1, 'cat')] };
}
function tutTurnLevel() {                        // 单题迷你关：猫猫 2 杯 1 换（末题=开对返回 'done'→帮转独）
  return { flat: -1, ch: 0, dch: 0, lv: 0, step: 0, retries: 0, done: false, anim: 'cat',
           quizzes: [{ kind: 'hide', cups: 2, swaps: [[0, 1]], start: 1,
                       answer: 0, anim: 'cat', _miss: 0, _answered: false }] };
}
async function tutorialWatch() {
  const t0w = Date.now();                        // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  state = { locked: true, won: false, demo: true, tut: 'watch', quiet: true, showUntil: 0 };
  cur = tutWatchLevel();
  renderQuiz(); renderDots();
  sayR(VOICE.watch.key, VOICE.watch.text);       /* hc_tut_watch：看！小动物藏起来啦（3264ms） */
  await wait(3564 * SPEED);                      /* ≥3264+300=3564：clip 播完再开题演出（不撞头） */
  if (state.tut !== 'watch') return;
  await presentQuiz(true);                       /* 兔子亮相躲杯+1 次慢速换位+静止（demo 吞真实输入） */
  if (state.tut !== 'watch') return;
  const q = cur.quizzes[0];
  const idx = correctIdx(q);
  pointGhostAt(cupWrapAt(idx));                  /* 幽灵手指指向正确杯 */
  await wait(800 * SPEED);
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapCup(idx, true);       /* demo 通道豁免演出锁（演示吞真实输入） */
  window.__hcDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'——终值语义） */
  window.__hcWatchMs = Date.now() - t0w;         /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  const sv = KIDS._save() || {};
  sv.hidecup = sv.hidecup || {};
  sv.hidecup.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* turn：重立猫猫 2 杯 1 换迷你关「你来试一试」（帮→独），首对放手进正式关 */
  ghost.hide();
  showRun++;                                     /* 显式中止在途（演示 right 的 presentQuiz 新题） */
  cur = tutTurnLevel();
  state = { locked: true, won: false, demo: false, tut: 'help', quiet: true, showUntil: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* hc_tut_turn：你来试一试（1824ms） */
  await wait(2124 * SPEED);                      /* ≥1824+300=2124 防尾截（turn 后开题演出延） */
  if (cur.flat < 0) await presentQuiz();         /* 猫猫亮相+1 次换位+静止 → 开放点选（demo 已撤可真点） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) pointHelpNext();
  }, 600 * SPEED);
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再想一想，看杯子怎么动 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return; /* §0.20 演出/教学期重演门 */
  if (cur.flat < 0) return;                      /* 教学迷你关禁重演 */
  lastAct = Date.now();
  replayAnim(replayBtn, 'bounce');
  doReplay(true);                                /* 同 swaps 重放（3s 节流在 doReplay 内） */
});
cupsEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.cup-wrap');
  if (!p) return;                                // 杯间空白走 stage 空白路径
  e.preventDefault();
  uiTapCup(Number(p.dataset.pos));               /* 点的是当前位置的杯（tapCup 位置语义） */
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.cup-wrap')) return;     // 杯点击已由 cupsEl 处理
  /* 空白/探索点击（含舞台垫非杯区）：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护：14s 方向级（重演换位，lastDir 独立节流锚，
   不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（正确杯 breathe+重演）/
   教学"帮"5s 重演示 ================= */
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
      const i = correctIdx(q);
      if (i >= 0) { const ok = cupWrapAt(i); if (ok) replayAnim(ok, 'breathe'); }
      doReplay(false);
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重演换位（不动 lastAct） */
    doReplay(false);
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
  KIDS.init({ game: 'hidecup', title: '藏猫猫摄像头' });   // 存档键 kidsgame_hidecup（core VER 1.0，家族 C）
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
   真实页同暴露 window.HC——b29 坑⑥：verify 页独占钩子=驱动假阳性）
   quiz getter 返回快照拷贝（含 start/swaps/answer 真值——verify 从 start+swaps
   独立复算 answer=对账锚）；step=全关题号 0-4（b33 坑①：题号语义，非杯进度）。
   tapCup 返回：对且非末题 'right' / 对且末题 'done' / 错 'wrong' /
   豁免窗内错点吞 false / 换位演出期 null（真时钟锁）/ 越界 null；
   replay()=同 swaps 重放（3s 节流内 false）================= */
window.HC = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.retries, stars: engStars(cur), anim: cur.anim };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    const dual = q.kind === 'hidedual';
    return { kind: q.kind,                             /* SPEC §1 钩子契约：'hide'|'hidedual'（r25） */
             cups: q.cups,                             /* 杯数 2|3|4（r25 dch4 量域腿=4） */
             swaps: q.swaps.map(s => s.slice()),       /* 换位对 [a,b][] 真值序列 */
             start: q.start,                           /* 动物初始杯下标（dual=A 兼容面） */
             answer: q.answer,                         /* 经 swaps 推导的动物杯下标（dual=当前步真值） */
             anim: q.anim,                             /* 动物 id（池 5；dual=A 兼容面） */
             startA: dual ? q.startA : undefined,      /* r25 dual：A/B 初始杯（互异） */
             startB: dual ? q.startB : undefined,
             answerA: dual ? q.answerA : undefined,    /* r25 dual：A/B 终位（独立复算对账锚） */
             answerB: dual ? q.answerB : undefined,
             animA: dual ? q.animA : undefined,
             animB: dual ? q.animB : undefined,
             phase: dual ? q.phase : undefined,        /* 0=问 A / 1=问 B */
             step: cur.step,                           /* 全关题号 0-4（b33 坑①） */
             miss: q._miss || 0 };
  },
  tapCup(i) { return uiTapCup(i); },
  replay() { return doReplay(true); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点正确杯，走真实判定链；
    let taps = 0, guard = 0;             // 演出锁/换位演出期 null → 轮询等锁窗结束重试，非 break）
    while (cur && !cur.done && guard++ < 200) {   // r25：taps=判对次数（half 也计）——dch4 关=7、dch1-3 恒 5
      let wg = 0;
      while ((state.locked || state.demo || Date.now() < state.showUntil) && wg++ < 3000) await wait(50);
      const q = cur && cur.quizzes[cur.step];
      if (!q) break;
      const r = await uiTapCup(q.answer);        /* dual：half 后 q.answer=answerB（引擎动态口径直读） */
      if (r === 'right' || r === 'done' || r === 'half') taps++;
      else if (guard >= 198) break;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
