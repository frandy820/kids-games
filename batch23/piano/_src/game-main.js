/* ================= piano 主逻辑（琴键渲染 / 跟弹相位机 / 自由弹 / 教学 / 推进 / 救援）
   跟弹流：小兔子逐音弹（琴键亮+音，音间 620ms）→「你来弹一弹」→孩子逐音比对：
   弹对=键绿亮+彩花；弹错=正确键轻闪 0.5s+重听该音+miss+1 且 pos 不进（序列不重头，§0.54 定版）；
   序列完成=小兔子跳舞；关完成=celebrate+写档星级。自由弹=零判定零失败（不进关卡不写档星级）。
   r23（SPEC-R23-PIANO.md §R4/§R5）：dch4 三形态——echo 长曲（原逐音复现）/ rhythm 节奏听辨
   （兔子弹短长音曲→问「哪个音最长」点键作答）/ chord 和弦听辨（两键齐发→选两键集合判定：
   pick=选中第 1 键（.sel 亮）/same=取消/wrong=集合错清空可重选）。作答面=琴键（无新控件）；
   题面/答错语音不受 flat<3 门（听不到题面=不可收，§0.5 同理）；首次进 dch4 琴键 tease 预告。
   验收钩子：window.PI = { get currentLevel, get quiz, tapKey(name), mode(), setMode(m), start(flat),
                          async autoSolve(), get tutorial, get phase } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速（wait 全按 SPEED 缩放）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (v) => { if (cur && cur.flat < 3) KIDS.voice.play(v.key, v.text); };
/* 救援/教学/正误核心反馈不受 flat 门限制（§0.5：不识字孩子静置零救援=不可收） */
const sayR = (v) => { if (v) KIDS.voice.play(v.key, v.text); };

const keysEl = $id('keys'), rabbitEl = $id('rabbit'), bubbleEl = $id('bubble'),
      seqDotsEl = $id('seq-dots'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'),
      btnFree = $id('btn-mode-free'), btnFollow = $id('btn-mode-follow');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { mode: 'follow', phase: 'listen', locked: false, busy: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let rescueDirDone = false, rescueAnsDone = false;
let runId = 0;                                  // 相位机令牌：startLevel/切模式/教学作废在途 listen 循环
let freeTapN = 0;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const keyEl = name => keysEl.querySelector('.key[data-name="' + name + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  btnFree.innerHTML = ICONS.free;
  btnFollow.innerHTML = ICONS.follow;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  rabbitEl.innerHTML = KIDS.assets.rabbit('happy', 96);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  keysEl.innerHTML = '';
  for (let i = 0; i < NOTE_IDS.length; i++) {
    const nm = NOTE_IDS[i];
    const b = document.createElement('button');
    b.className = 'key';
    b.id = 'key-' + nm;
    b.dataset.name = nm;
    b.dataset.freq = String(FREQ[nm]);
    b.setAttribute('aria-label', NOTE_ARIA[nm] + '琴键');
    b.innerHTML = '<span class="dot" style="background:' + HUE[nm] + '" aria-hidden="true"></span>';
    keysEl.appendChild(b);
  }
}

/* 八音盒音色：家族通道 KIDS.audio.note（sine+2.9 泛音+快 attack+指数衰减）+ 高八度微光
   r23：long 参数=节奏题长音（dur 0.45→1.9 约 4 倍可听时长差——note 的 dur 直接控制
   exponentialRamp 衰减全程，时值听辨域可靠，SPEC-R23 §R4）；echo 题音长 1.05 原样不动 */
function boxNote(name, long, short) {
  if (VERIFY) return;
  const f = FREQ[name];
  if (!f) return;
  /* 三态 dur：long=1.9（rhythm 长音）/ short=0.45（rhythm 短音，SPEC-R23 §R4 对比 4.2x——
     试玩P2-1：原实现短音复用 echo 默认 1.05 系偏差）/ 缺省=1.05（echo 全系原样不动） */
  const dur = long ? 1.9 : short ? 0.45 : 1.05;
  KIDS.audio.note(f, dur, 0, 0.85);
  KIDS.audio.note(f * 2, long ? 0.5 : 0.4, 0.012, 0.2);
}
/* r23 和弦演示：两音同时发（每音 vol 0.6 防 linear 叠加削波；泛音同步衰减） */
function boxChord(n1, n2) {
  if (VERIFY) return;
  const f1 = FREQ[n1], f2 = FREQ[n2];
  if (!f1 || !f2) return;
  KIDS.audio.note(f1, 1.5, 0, 0.6);
  KIDS.audio.note(f2, 1.5, 0, 0.6);
  KIDS.audio.note(f1 * 2, 0.5, 0.012, 0.12);
  KIDS.audio.note(f2 * 2, 0.5, 0.012, 0.12);
}
function keyLight(name, hold) {                 // 按下/演示亮键（DOM 断言通道 .active）
  const el = keyEl(name);                       // hold=长音时值可视化（亮多久=时值表征）
  if (!el) return;
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), hold ? 1500 * SPEED + 400 : 280 * SPEED + 260);
}
function keyGood(name) {                        // 弹对：绿亮（.good）
  const el = keyEl(name);
  if (!el) return;
  keyLight(name);
  el.classList.add('good');
  setTimeout(() => el.classList.remove('good'), 620 * SPEED + 320);
}
function keyFlash(name) {                       // 弹错/救援方向级：该键轻闪 0.5s（.flash）
  const el = keyEl(name);
  if (!el) return;
  replayAnim(el, 'flash');
  setTimeout(() => el.classList.remove('flash'), 540 * SPEED + 320);
}
function clearBreathe() {
  keysEl.querySelectorAll('.key.breathe').forEach(k => k.classList.remove('breathe'));
}
/* r23 和弦作答选中态：pick 置 .sel 持续亮 / same 或判错切题时清（q.sel 引擎真值同步） */
function keySel(name, on) {
  const el = keyEl(name);
  if (el) el.classList.toggle('sel', !!on);
}
function clearSel() {
  keysEl.querySelectorAll('.key.sel').forEach(k => k.classList.remove('sel'));
}
/* r23 首次新作答视觉预告（每存档一次 sv.piano.ansSeen）：8 键次第波浪一遍——
   预告「琴键可点选作答」不指示正确答案（承 r21 revSeen/r22 ansSeen 范式） */
function teaseKeys() {
  keysEl.querySelectorAll('.key').forEach((k, i) => {
    setTimeout(() => replayAnim(k, 'tease'), i * 160 * SPEED);
  });
}
function setBubble(kind) {                      // 状态泡（零文字：图标承载听/弹/自由）
  bubbleEl.innerHTML = kind === 'listen' ? ICONS.speaker : kind === 'play' ? ICONS.hand : ICONS.free;
  replayAnim(bubbleEl, 'pulse');
}
function confettiBurst(name) {                  // 彩花粒子（弹对/自由弹；verify 页跳过）
  if (VERIFY) return;
  const el = keyEl(name);
  if (!el) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 7; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    c.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    c.style.left = Math.round(r.left + r.width / 2 - 7) + 'px';
    c.style.top = Math.round(r.top + r.height * 0.3 - 7) + 'px';
    document.body.appendChild(c);
    const dx = Math.round(Math.random() * 190 - 95), dy = Math.round(-40 - Math.random() * 110),
          rot = Math.round(Math.random() * 300 - 150);
    requestAnimationFrame(() => {
      c.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)';
      c.style.opacity = '0';
    });
    setTimeout(() => c.remove(), 700);
  }
}

/* ================= 渲染 ================= */
function renderModeBtns() {
  btnFree.classList.toggle('on', state.mode === 'free');
  btnFollow.classList.toggle('on', state.mode === 'follow');
}
function renderStep() {                         // HUD 本关 5 序列进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  if (!cur) return;
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                         // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  if (!cur) return;
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function renderSeqDots(listenIdx) {             // 当前序列音位点：弹对填充绿 / 兔子弹到哪颗脉冲
  seqDotsEl.innerHTML = '';                     // r23：chord=两颗齐脉冲；作答题 play 期无音位 cur
  if (!cur || state.mode !== 'follow') return;
  const q = cur.seqs[Math.min(cur.step, cur.seqs.length - 1)];
  if (!q) return;
  for (let i = 0; i < q.seq.length; i++) {
    const d = document.createElement('i');
    if (state.phase === 'listen')
      d.className = (listenIdx != null && (i === listenIdx - 1 ||
        (q.mode === 'chord' && listenIdx === 2))) ? 'cur' : '';
    else if (q.mode !== 'echo') d.className = q.solved ? 'hit' : '';
    else d.className = q.solved ? 'hit' : (i < q.pos ? 'hit' : (i === q.pos && !cur.done ? 'cur' : ''));
    seqDotsEl.appendChild(d);
  }
}
function danceRabbit() {
  replayAnim(rabbitEl, 'dance');
  replayAnim(rabbitBtn, 'hop');
}

/* ================= 幽灵手指（教学"看/帮"共用） ================= */
const ghost = {
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAtKey(name) {
  if (VERIFY || !name) return;
  const el = keyEl(name);
  if (!el) return;
  const r = el.getBoundingClientRect();
  ghostEl.style.left = Math.round(r.left + r.width / 2) + 'px';
  ghostEl.style.top = Math.round(r.top + r.height * 0.45) + 'px';
  ghost.show();
  setTimeout(() => ghost.press(), 700 * SPEED);
}
function pointHelpNext() {                      // 教学"帮"：指向当前应弹键（方向级提示）
  if (!cur || state.mode !== 'follow') return;
  const q = cur.seqs[cur.step];
  if (!q || q.solved) return;
  pointGhostAtKey(NOTE_IDS[q.seq[q.pos]]);
}

/* ================= 跟弹相位机：runSequence（听 → 你来弹/作答）
   令牌+身份双守卫：startLevel/切模式/教学会使在途 listen 失效（防旧续体推进新关）。
   r23 mode 分支（SPEC-R23 §R4）：echo=原样逐音 620ms；rhythm=短/长音差异化时长
   （长音 dur 1.9s+键亮 ~1.9s=时值可视化）；chord=两键齐亮齐发。
   play 相位末语音：echo=「你来弹一弹」（flat<3）；作答题=题面问句（不受 flat 门）。 ================= */
function cancelRuns() { runId++; }
async function runSequence() {
  const run = cur, my = ++runId;
  if (!run || run.done) return;
  state.phase = 'listen';
  state.locked = true;
  ghost.hide(); clearBreathe(); clearSel();
  const q0 = run.seqs[run.step];                // 重听=replay 重发：chord 引擎侧 sel 同步清（重选）
  if (q0 && q0.mode === 'chord' && q0.sel) q0.sel.length = 0;
  renderStep(); setBubble('listen'); renderSeqDots(0);
  const q = run.seqs[run.step];
  if (!q) return;
  await wait(650 * SPEED);
  if (q.mode === 'chord') {                     // 和弦：两键同时亮+两音同时发
    if (runId !== my || cur !== run) return;
    const n1 = NOTE_IDS[q.seq[0]], n2 = NOTE_IDS[q.seq[1]];
    keyLight(n1, true); keyLight(n2, true);
    boxChord(n1, n2);
    renderSeqDots(2);
    await wait(1500 * SPEED);
  } else {
    for (let i = 0; i < q.seq.length; i++) {
      if (runId !== my || cur !== run) return;  // 作废：关已切/模式已切
      const nm = NOTE_IDS[q.seq[i]];
      const long = q.mode === 'rhythm' && i === q.longIdx;
      keyLight(nm, long); boxNote(nm, long, q.mode === 'rhythm' && !long);    // 长音=双通道拉长；短音=0.45（时值表征）
      renderSeqDots(i + 1);
      await wait((long ? 1900 : 620) * SPEED);
    }
  }
  if (runId !== my || cur !== run) return;
  state.phase = 'play';
  state.locked = false;
  lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false;
  setBubble('play'); renderSeqDots();
  if (q.mode === 'rhythm') sayR(VOICE.rhyQ);    /* 哪个音弹得最长呀（题面，不受 flat 门） */
  else if (q.mode === 'chord') sayR(VOICE.choQ);/* 兔子弹了哪两个音呀（题面，不受 flat 门） */
  else sayP(VOICE.turn);                        /* 你来弹一弹（flat<3） */
  if (state.tut === 'help') setTimeout(pointHelpNext, 500 * SPEED);
}

/* ================= 弹键主路径（真实点击 / PI.tapKey / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（琴键容器 bump 微动效——b21 feed 定版）；
   busy=比对反馈占位锁（错音重听窗/right 绿亮窗，同步置位→紧邻弹键必被拦，§0.47） ================= */
async function uiTapKey(name, demo) {
  if (!cur || state.won || state.mode !== 'follow') {
    if (state.mode === 'follow') { sfx('pop'); replayAnim(keysEl, 'bump'); }
    return false;
  }
  if ((state.busy && !demo) || (state.locked && !demo) || (state.demo && !demo) ||
      (state.phase !== 'play' && !demo)) {      // 听音相位/演示期/演出窗=吞输入
    sfx('pop'); replayAnim(keysEl, 'bump');
    return false;
  }
  const run = cur;
  const q = cur.seqs[cur.step];
  const r0 = engTapKey(cur, name);
  if (r0 === null) { sfx('pop'); replayAnim(keysEl, 'bump'); return false; }   // 非法音名
  keyLight(name); boxNote(name);                // 先听自己的音（正误都出声——音本身即反馈）
  lastAct = Date.now(); rescueDirDone = false; rescueAnsDone = false; clearBreathe();
  if (state.tut === 'help' && !demo) {          // 教学"独"：首次真弹 → 放手
    state.tut = 'solo';
    ghost.hide();
    danceRabbit();
  }
  if (r0 === 'pick') {                          // r23 chord 第 1 键选中：不判不罚不占 busy（连选）
    keySel(name, true);
    return 'pick';
  }
  if (r0 === 'same') {                          // r23 chord 取消选择：不判不罚
    keySel(name, false);
    return 'same';
  }
  state.busy = true;

  if (r0 === 'wrong') {                         // 弹错/选错：miss+1 不进（不重头/不换题可重试重选）
    await wait(200 * SPEED);
    if (cur === run) {
      if (q.mode === 'echo') {                  // echo：正确键轻闪 0.5s+重听该音（原样）
        const want = NOTE_IDS[q.seq[q.pos]];
        keyFlash(want); boxNote(want);
        KIDS.voice.play(VOICE.wrong.key, VOICE.wrong.text);   /* 再听一次这个音（核心反馈不受 flat 门） */
      } else {                                  // r23 作答：选错键闪+鼓励语；chord sel 引擎已清（UI 同步）
        keyFlash(name);
        clearSel();
        KIDS.voice.play(VOICE.ansWrong.key, VOICE.ansWrong.text);   /* 再听一听，再选一次吧 */
      }
    }
    await wait(800 * SPEED);                   /* 审查m1：错音防重入 200+800=1000ms（家族定案） */
    state.busy = false;
    return 'wrong';
  }

  if (q.mode === 'chord') clearSel();           /* 审查M1(r23)：.sel 与 .good 同特异性且源码序在后——
                                                   不先清则答对反馈窗 700ms 内两键显橙（sel）不显绿（good） */
  keyGood(name);
  confettiBurst(name);
  if (q.mode === 'chord') {                     // r23 chord 答对：另一键同报 good（集合对=双键对）
    const other = q.sel && q.sel[0] === NOTE_IDS.indexOf(name) ? q.sel[1] : q.sel[0];
    if (other != null) { keyGood(NOTE_IDS[other]); confettiBurst(NOTE_IDS[other]); }
  }
  await wait(200 * SPEED);                     /* 审查m3：right 路径缩短防连弹吞 */
  if (r0 === 'right') { state.busy = false; return 'right'; }

  if (r0 === 'done') {                          // 序列完成：兔子跳舞 → 下一序列（演示不自动续）
    danceRabbit();                              // r23：答对反馈=视觉（good+彩花+跳舞），语音仍 flat<3 密度门
    sayP(VOICE.right);
    await wait(700 * SPEED);                  /* 审查M2 附带：+140 补 pia_right 尾音 */
    state.busy = false;
    if (cur !== run) return 'done';
    if (!demo) runSequence();
    return 'done';
  }
  /* won：整关通关 */
  danceRabbit();
  state.busy = false;
  winFlow();
  return 'won';
}

/* ================= 自由弹（零判定零失败——纯玩具层，不进关卡不写档星级） ================= */
function freeTap(name) {
  if (NOTE_IDS.indexOf(name) < 0) { sfx('pop'); replayAnim(keysEl, 'bump'); return false; }
  keyLight(name); boxNote(name);
  confettiBurst(name);
  freeTapN++;
  if (freeTapN % 3 === 1) danceRabbit();        // 偶发兔子跳
  return 'free';
}

/* ================= 模式切换（顶部大按钮；教学演示期拒绝） ================= */
function setMode(m) {
  if (state.mode === m) return state.mode;
  if (state.demo || state.tut === 'watch') {    // 教学"看"演示期不打断
    sfx('pop'); replayAnim(keysEl, 'bump');
    return state.mode;
  }
  state.mode = m;
  renderModeBtns();
  ghost.hide(); clearBreathe(); clearSel();
  if (m === 'free') {
    cancelRuns();
    state.phase = 'free'; state.locked = false; state.busy = false; state.won = false;
    setBubble('free'); renderSeqDots();
    danceRabbit();
  } else {
    startLevel(cur ? cur.flat : 0);             // 跟弹：确定性重发当前关（兔子弹→你来弹）
  }
  return state.mode;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true; state.locked = true; state.phase = 'won';
  ghost.hide(); clearBreathe();
  renderStep(); renderSeqDots();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right);                            /* 弹对啦，真好听 */
  if (VERIFY) return;                           // verify 页：引擎判定即止，不弹层不写档
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 审查 m4（2026-09-13）：b23 修复轮漏网，与 weather M2 同型统一 */
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
  cancelRuns();
  ghost.hide(); clearBreathe(); clearSel();
  state.mode = 'follow'; renderModeBtns();
  cur = genLevel(flat);
  state = { mode: 'follow', phase: 'listen', locked: false, busy: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false; rescueDirDone = false; rescueAnsDone = false;
  lastAct = Date.now();
  renderStep(); renderDots(); setBubble('listen'); renderSeqDots(0);
  if (VERIFY) {                                  // verify 页：相位机照跑（提速），无教学无存档
    if (cur.dch === 4) teaseKeys();              // dch4 每次重触发（⑯断言口径，不写档）
    runSequence(); return;
  }
  const sv = KIDS._save();
  if (cur.dch === 4 && !(sv.piano && sv.piano.ansSeen)) {   // r23 首次新作答预告（一次性写档）
    sv.piano = sv.piano || {};
    sv.piano.ansSeen = true;
    KIDS.store.persist();
    teaseKeys();
  }
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.piano && sv.piano.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  sayP(VOICE.hint);                              /* 先听兔子弹哦（flat<3） */
  runSequence();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=兔子弹 do-sol 两音 → 幽灵手指跟着弹两音（演示跟弹全过程）→ __piDemoR='right'；
   帮=指向应弹键；独=首次真弹放手（watch 全程 ≤16s） ================= */
async function tutorialWatch() {
  cancelRuns();
  state.demo = true; state.locked = true; state.tut = 'watch';
  setBubble('listen');
  sayR(VOICE.watch);                             /* 看！兔子弹什么你弹什么 */
  await wait(650 * SPEED);
  const run = cur;
  const q0 = run.seqs[0];                        // flat0 序列0 恒 do-sol（两音）
  for (let i = 0; i < q0.seq.length; i++) {      // 兔子弹
    const nm = NOTE_IDS[q0.seq[i]];
    keyLight(nm); boxNote(nm);
    renderSeqDots(i + 1);
    await wait(620 * SPEED);
    if (cur !== run) { state.demo = false; return; }
  }
  state.phase = 'play';                          // 进入"你来弹"（demo 通道豁免锁）
  setBubble('play'); renderSeqDots();
  await wait(420 * SPEED);
  let demoR = null;
  const q = run.seqs[run.step];
  for (let k = 0; k < q.seq.length; k++) {       // 幽灵手指逐音复现
    pointGhostAtKey(NOTE_IDS[q.seq[q.pos]]);
    await wait(760 * SPEED);
    ghost.press();
    await wait(280 * SPEED);
    const r = await uiTapKey(NOTE_IDS[q.seq[q.pos]], true);
    if (r && !demoR) demoR = r;                  // 首音弹对='right'（gate 断言口径）
    await wait(460 * SPEED);
    if (cur !== run) { state.demo = false; ghost.hide(); return; }
  }
  KIDS.voice.play(VOICE.like.key, VOICE.like.text);   // 演示收束语（T46 阶段2 clip 化）
  window.__piDemoR = demoR;                      // 演示生效证据（§0.27，gate 断言 'right'）
  await wait(500 * SPEED);
  const sv = KIDS._save();
  sv.piano = sv.piano || {};
  sv.piano.tutSeen = true;
  KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来弹一弹"在重发后的题面上说 */
  ghost.hide();
  startLevel(0);
  state.tut = 'help';
  /* 「你来弹一弹」由重发后的 runSequence 在听音结束时说（单一时点，不重复播） */
}

/* ================= 救援钟（跟弹 listen→play 后静置；verify 页由 verify 直驱函数测）
   14s 方向级=重听当前音（应弹键闪+音）/ 30s 答案级=应弹键 breathe 循环（动作即清）
   r23 适配（SPEC-R23 §R4）：作答题方向级=重弹全曲（听辨题材料重听=方向提示不泄答案）；
   答案级=rhythm 长音键 / chord 两答案键齐 breathe（答案级可指真值，承家族先例） ================= */
function rescueDir() {
  if (!cur || cur.done) return false;
  const q = cur.seqs[cur.step];
  if (!q || q.solved) return false;
  if (q.mode === 'rhythm' || q.mode === 'chord') {
    sayR(VOICE.hint);                           /* 先听兔子弹哦 + 重弹全曲 */
    /* 试玩P1-1：救援重弹须保留空闲计时与救援旗标——runSequence 完成段会重置
       lastAct/两旗标，若不恢复则 30s 答案级阈值每 14s 被清零永不可达（退化单级）。
       恢复语义：idle 从重弹触发时刻连续积累（重弹 listen 期后 resume）→ 30s breathe
       可达；rescueDirDone 保持 true 不再每 14s 重弹同一材料 */
    const keepAct = lastAct, keepD = rescueDirDone, keepA = rescueAnsDone, run = cur;
    /* 挂账①（r23 收尾）：续体身份守卫——救援 listen 期切关/切模式后 cur 已是新关，
       作废续体若照常回写 keepD 会吞新关首个 14s 救援一周期（旧值不得覆盖新关初始态） */
    runSequence().then(() => {
      if (cur !== run) return;
      lastAct = keepAct; rescueDirDone = keepD; rescueAnsDone = keepA;
    });
    return true;
  }
  const nm = NOTE_IDS[q.seq[q.pos]];
  keyFlash(nm); boxNote(nm);
  sayR(VOICE.hint);
  return true;
}
function rescueAns() {
  if (!cur || cur.done) return false;
  const q = cur.seqs[cur.step];
  if (!q || q.solved) return false;
  const names = q.mode === 'rhythm' ? [NOTE_IDS[q.seq[q.longIdx]]]
    : q.mode === 'chord' ? [NOTE_IDS[q.seq[0]], NOTE_IDS[q.seq[1]]]
    : [NOTE_IDS[q.seq[q.pos]]];
  const els = names.map(keyEl).filter(Boolean);
  if (!els.length) return false;
  clearBreathe();
  els.forEach(el => el.classList.add('breathe'));
  return true;
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.mode !== 'follow' || state.phase !== 'play' ||
      state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000 && !rescueAnsDone) { rescueAnsDone = true; rescueAns(); return; }
  if (idle > 14000 && !rescueDirDone) { rescueDirDone = true; rescueDir(); return; }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}, 1000);

/* ================= 底栏与输入 ================= */
function hopRabbit() { replayAnim(rabbitBtn, 'hop'); }
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || state.locked || state.demo) return;   // 教学/演出期点兔子不打断
  lastAct = Date.now();
  hopRabbit();
  if (state.mode === 'follow' && cur && !state.won && state.phase === 'play') sayR(VOICE.hint);
  else if (state.mode === 'free') sayR(null);
});
replayBtn.addEventListener('pointerdown', e => {      // 再听兔子弹一遍（当前序列重听——记忆类核心救援入口）
  e.preventDefault();
  KIDS.audio.unlock();
  if (VERIFY || state.mode !== 'follow' || !cur || state.won || state.demo || state.busy) return;
  lastAct = Date.now();
  replayBtn.classList.remove('bounce'); void replayBtn.offsetWidth; replayBtn.classList.add('bounce');
  runSequence();
});
keysEl.addEventListener('pointerdown', e => {
  const k = e.target.closest('.key');
  if (!k) return;
  e.preventDefault();
  KIDS.audio.unlock();
  if (state.mode === 'free') freeTap(k.dataset.name);
  else uiTapKey(k.dataset.name);
});
btnFree.addEventListener('pointerdown', e => {
  e.preventDefault(); KIDS.audio.unlock(); sfx('click');
  setMode('free');
});
btnFollow.addEventListener('pointerdown', e => {
  e.preventDefault(); KIDS.audio.unlock(); sfx('click');
  setMode('follow');
});

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
renderModeBtns();
if (!VERIFY) {
  KIDS.init({ game: 'piano', title: '碰碰琴' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })          /* 审查M1：§0.4 防跳章 */;
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.PI = {
  start(flat) {
    cancelRuns();
    state.mode = 'follow'; renderModeBtns();
    startLevel(flat);
  },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.seqs.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.missTotal || 0, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.seqs[cur.step];
    if (!q) return null;
    return { seq: q.seq.map(i => NOTE_IDS[i]),        /* 音名序列 */
             pos: q.pos,                               /* 当前比对位（作答题恒 0） */
             step: cur.step,
             miss: q.miss,                             /* 本序列弹错/选错数 */
             mode: q.mode || 'echo',                   /* r23 题型（echo/rhythm/chord） */
             longIdx: q.mode === 'rhythm' ? q.longIdx : undefined,   /* 长音位（rhythm） */
             sel: q.mode === 'chord' ? q.sel.slice() : undefined };  /* 已选键索引拷贝（chord） */
  },
  tapKey(name) {
    if (state.mode === 'free') return freeTap(name);
    return uiTapKey(name);
  },
  mode() { return state.mode; },
  setMode(m) { return setMode(m); },
  async autoSolve() {                    // UI 路径自动弹完当前关（含听音相位等待；r23 按 mode 分支）
    let taps = 0, guard = 0;             // echo=逐音 / rhythm=点长音键 / chord=点两答案键（pick+判定）
    while (cur && !cur.done && guard++ < 900) {
      if (state.mode !== 'follow') break;
      if (state.phase !== 'play' || state.locked || state.busy || state.won) { await wait(60); continue; }
      const q = cur.seqs[cur.step];
      if (!q) break;
      let nm;
      if (q.mode === 'rhythm') nm = NOTE_IDS[q.seq[q.longIdx]];
      else if (q.mode === 'chord') {
        if (!q.sel || !q.sel.length) nm = NOTE_IDS[q.seq[0]];
        else nm = NOTE_IDS[q.sel.indexOf(q.seq[1]) >= 0 ? q.seq[0] : q.seq[1]];
      }
      else nm = NOTE_IDS[q.seq[q.pos]];
      const r = await uiTapKey(nm);
      if (r !== false && r != null) taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; },
  get phase() { return state.phase; }
};
