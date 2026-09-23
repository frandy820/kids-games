/* ================= story3 主逻辑（槽位渲染 / 帧卡点选 / 飞入动画 / 因果问句 / 教学 / 救援 / 推进）
   玩法（SPEC-R34-STORY3）：题面 = N 槽位故事条（N=故事帧数 3/4/5）+ 乱序帧卡
   （dch≥2 含 1 张 pos=-1 干扰帧）+ 题面 clip（sto_q，仅每关首题播——r34 演出窗压缩）。
   逐槽点击：点对当前槽正确帧 = 卡飞入槽 + 轻音 + 槽点亮；自有帧点错 = 该卡摇头 +
   **非泄序反馈**（sto_hint 题面级重定向；r34 起方位语义 wFirst/wMid 退休——3 帧下
   排除法泄首尾帧）+ miss+1，已放帧不清；干扰帧点任何槽 = 错 + sto_w_out 成员性反馈
   （r34 TODO 注册前静默，vlog 仍记录）；1000ms 防重入窗（b16 定案）后可重选。
   自有槽全对 = 故事条整体亮起 + 复述 TTS（连接词按帧数；clip 键 recapKeyOf）+
   sto_right（2832→窗 ≥3150 再读下一题，家族 H）+ celebrate。
   dch3/4 qi1/qi3：复述后追加**因果问句**（why 两选一文字选项卡 .optcard；槽 1 首帧
   pulse；问句 clip 即发不锁输入；点错=摇头+sto_why_w+miss；点对=sto_why_right+推进）。
   ch3 时间线：错反馈 clip 后追加先-再-后时间词 TTS 点名（SPEC §1 ch3，锚 2400+300）。
   救援两级（家族 B 定版，shaperoof lastDir/lastAct 同构）：14s 方向级=重读题面（why
   相位=重播问句）+ 未放帧/选项卡 pulse（lastDir 独立节流锚，不重置 lastAct）；
   30s 答案级=当前槽正确帧/正确选项卡 breathe（r25 M2：why 待答中间态逐一核）。
   验收钩子：window.ST = { get currentLevel, get quiz(){story, frames[]{id,pos,placed},
   slot, step, miss, answered, why{on,done,opts}}, tapFrame(i), tapWhy(i), start(flat),
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
const sayR = (key, text) => { if (cur) { KIDS.voice.play(key, text); vlog(key, text); } };
/* 纠错语义反馈：flat<3 每错必播；flat≥3 走 10s 节流（6 岁试玩 P1：安静试错只有视觉晃动） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  vlog(key, text);
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* 语音日志（verify 断言用：方位反馈=当前槽语义 / 复述句触发 / right 窗序） */
const VLOG = [];
const vlog = (k, t) => { VLOG.push({ k: k, t: t || '' }); if (VLOG.length > 300) VLOG.shift(); };
window.__stoVlog = VLOG;

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let timeHintTimer = null;                      /* ch3 时间词点名 timer 句柄（审查m1：对选时取消，防插入打断复述/新题面） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.card[data-i="' + i + '"]');
const slotEl = k => sceneEl.querySelector('.slot[data-k="' + k + '"]');

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

/* ================= 题面语音（题面 clip 化 sto_q，重听/救援共用） ================= */
function speakQuiz() {
  if (!cur) return;
  KIDS.voice.play(VOICE.q.key, QUIET_TEXT);
  vlog(VOICE.q.key, QUIET_TEXT);
}
/* 因果问句播报（r34：why 相位的题面/重听/方向级救援共用；问句 clip=TODO 注册前静默） */
function speakWhy() {
  if (!cur) return;
  const q = cur.quizzes[cur.step];
  if (!q || !q.why) return;
  const w = whyClipOf(q.story);
  KIDS.voice.play(w.key, w.text);
  vlog(w.key, w.text);
}
/* 当前是否因果问句相位（故事已答完、why 未答——r25 M2 中间态判定入口） */
const whyPending = q => !!(q && q.why && !q.why.done && q._answered);

/* ================= 渲染 ================= */
function renderSlots(q) {                        // 故事条：N 槽（N=自有帧数 3/4/5；placed=帧图点亮）
  sceneEl.dataset.story = q.story;
  sceneEl.setAttribute('aria-label', '按顺序排故事，点我再听一遍');
  sceneEl.innerHTML = '';
  const N = q.frames.filter(f => f.pos >= 0).length;
  for (let k = 0; k < N; k++) {
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.k = k;
    const pf = q.frames.find(f => f.placed && f.pos === k);
    if (pf) {
      s.classList.add('filled');
      s.innerHTML = '<div class="art">' + STORY_LIB[q.story].art[k] + '</div><span class="bdg">' + (k + 1) + '</span>';
    } else {
      if (k === q.slot && !q._answered) s.classList.add('cur');
      s.innerHTML = '<div class="ph"></div><span class="bdg">' + (k + 1) + '</span>';
    }
    sceneEl.appendChild(s);
  }
  sceneEl.classList.toggle('full', q.frames.filter(f => f.pos >= 0).every(f => f.placed));
}
function renderBoard(q) {                        // 帧卡排（乱序候选含干扰帧；SVG 场景零文字 §0.19）
  boardEl.innerHTML = '';
  boardEl.dataset.n = q.frames.length;           // r34：data-n 驱动布局变体（4 卡单行紧凑）
  q.frames.forEach((f, i) => {
    const b = document.createElement('button');
    b.className = 'card pop' + (f.placed ? ' gone' : '');
    b.dataset.i = i;
    b.setAttribute('aria-label', '故事画面' + (i + 1));
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = '<span class="gwrap">' + (f.pos >= 0 ? STORY_LIB[q.story].art[f.pos]
                     : STORY_LIB[f.id.replace(/-f\d+$/, '')].art[+f.id.match(/-f(\d+)$/)[1]]) + '</span>';
    boardEl.appendChild(b);
  });
}
/* 因果问句面板（r34 维度三）：板区换 2 张文字选项卡（位次=q.why.opts）+ 首槽 pulse */
function renderWhy(q) {
  const w = STORY_LIB[q.story].why;
  boardEl.innerHTML = '';
  boardEl.dataset.n = 2;
  for (let i = 0; i < 2; i++) {
    const b = document.createElement('button');
    b.className = 'optcard pop';
    b.dataset.w = i;
    b.setAttribute('aria-label', '答案选项' + (i + 1));
    b.style.animationDelay = (i * 70) + 'ms';
    b.textContent = q.why.opts[i] === 'a' ? w.a : w.b;
    boardEl.appendChild(b);
  }
  const s0 = sceneEl.querySelector('.slot[data-k="0"]');
  if (s0) replayAnim(s0, 'why-first');
  lastAct = Date.now();                          /* why 相位新交互段起算救援钟（r25 M2 中间态） */
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderSlots(q);
  renderBoard(q);
  renderStep();
  /* r34 演出窗压缩：题面读题仅每关首题（sto_q 文案与故事无关恒同文；救援/听题重播不限）；
     审查M4：主动读题重置 idle 锚（救援自读不走 renderQuiz 不重置防自喂） */
  if (!VERIFY && !state.demo && !state.quiet && cur.step === 0) { speakQuiz(); lastAct = Date.now(); }
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

/* ================= 飞入动画：帧卡从卡排飞到对应槽（.flyframe 克隆体 CSS transition §0.11）
   飞行结束后：槽点亮 + 卡从卡排隐藏；verify 页跳飞行直接点亮 ---------- */
function flyFrame(el, q, i, run) {
  const lightSlot = () => {
    if (run && cur !== run) return;                        // 演出窗内重玩已重建关卡：丢弃迟到点亮
    /* 飞行 450ms < 主链 560ms 步进：lightSlot 必落在 q 仍是当前题的窗口内（locked 拦并发），
       三槽全对时 step 虽已推进但题面未重建——直接按 q 渲染槽位（含末槽点亮） */
    const card = cardEl(i);
    if (card) card.classList.add('gone');
    renderSlots(q);
    const se = slotEl(q.frames[i].pos);
    if (se) replayAnim(se, 'slot-pop');
  };
  if (VERIFY || !el) { lightSlot(); return; }
  const from = el.getBoundingClientRect();
  const to = slotEl(q.frames[i].pos).getBoundingClientRect();
  const fly = document.createElement('div');
  fly.className = 'flyframe';
  fly.innerHTML = STORY_LIB[q.story].art[q.frames[i].pos];
  fly.style.left = from.left + 'px';
  fly.style.top = from.top + 'px';
  fly.style.width = from.width + 'px';
  fly.style.height = from.height + 'px';
  fly.style.transitionDuration = '430ms';
  document.body.appendChild(fly);
  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);
  requestAnimationFrame(() => {
    fly.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.9)';
  });
  setTimeout(() => { fly.remove(); lightSlot(); }, 450);
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
/* 教学"帮"阶段指向：当前槽正确帧 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const i = correctIdx(q);
  if (i >= 0) pointGhostAt(cardEl(i));
}

/* ================= 点帧主路径（真实点击 / ST.tapFrame / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（帧卡排容器 bump 微动效——家族 D）；
   错点 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）========== */
async function uiTapFrame(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapFrame(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  const el = cardEl(i);
  boardEl.querySelectorAll('.card').forEach(c => c.classList.remove('breathe'));   // 动作即清救援高亮

  if (r === 'wrong') {                           /* 答错：摇头+非泄序反馈（r34：干扰帧=成员性 w_out/自有帧=hint 重定向），卡不灰可重选 */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    const isOut = q.frames[i].pos === -1;
    const wk = isOut ? VOICE.wOut : VOICE.hint;  /* 去泄序：方位语义 wFirst/wMid 退休（SPEC-R34 §R1 维度二） */
    sayW(wk.key, wk.text);
    if (cur.dch === 3 && !VERIFY) {              /* ch3 时间线：clip 播完后追加先-再-后时间词点名（SPEC §1；锚=sto_hint 实长） */
      const clipMs = 2400 + 300;
      timeHintTimer = setTimeout(() => {
        if (cur === run && !state.demo && !state.won) { KIDS.voice.play('sto_hint3', TIME_HINT); vlog('time3', TIME_HINT); }   /* T46 阶段2：时间词点名 clip 化 */
      }, clipMs);
    }
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms（b16 定案；反馈可被对选打断=容忍） */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（帧飞入槽+点亮；自有槽全对走复述链） ---- */
  if (timeHintTimer) { clearTimeout(timeHintTimer); timeHintTimer = null; }   /* 审查m1：取消待发时间词点名 */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help' && !demo) {           /* 教学"独"：首次真点对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) el.classList.remove('breathe');
  chimeGoal();
  sfx('coin');
  const ownN = q.frames.filter(f => f.pos >= 0).length;
  const storyDone = q.slot >= ownN;              /* engTapFrame 已推进 slot：自有槽全对 */
  flyFrame(el, q, i, run);
  await wait(560 * SPEED);                       /* 飞入 + 槽点亮演出窗 */
  if (cur !== run) return r;

  if (!storyDone) { state.locked = false; return r; }

  /* ---- 自有槽全对：故事条亮起 → 复述句 TTS → sto_right →（因果问句 | 下一题 | winFlow） ---- */
  sceneEl.classList.remove('full');
  void sceneEl.offsetWidth;
  sceneEl.classList.add('full');                 /* 故事完整亮起（glow） */
  if (!state.demo) {
    const recap = recapOf(q.story);
    const rk = recapKeyOf(q.story);              /* r34：3 帧沿用 sto_recap_*；4/5 帧=sto_recap{4,5}_*（TODO 注册前静默） */
    const rw = RECAP_DUR[q.story] + 300;      /* r34 注册后全量实长表（3/4/5 帧统一 mutagen 量化+300，SPEC §R9/§R10-C） */
    if (!VERIFY) KIDS.voice.play(rk, recap);     /* 复述句 clip 化（全 12 故事=RECAP_DUR 实长+300 窗，SPEC §R9） */
    vlog('recap', recap);
    vlog('recapKey', rk);                        /* r34：复述 clip 键记录（verify 页 play 被 !VERIFY 门拦，键走 vlog） */
    await wait(rw * SPEED);                      /* 复述窗（禁与 sto_right 撞头） */
    if (cur !== run) return r;
    sayR(VOICE.right.key, VOICE.right.text);     /* sto_right 2832 */
    await wait(3150 * SPEED);                    /* 家族 H：2832+300 余量再读下一题/celebrate */
    if (cur !== run) return r;
  } else {
    await wait(500 * SPEED);                     /* demo：跳复述 TTS（禁与 turn 收束撞头——b24 M1） */
  }
  /* r34 因果问句（why 相位）：故事判定链收尾前不推 step；问句即发不锁输入（§R1 维度三） */
  if (whyPending(q)) {
    renderWhy(q);
    if (!state.demo) speakWhy();                 /* verify 页 play=stub 但 vlog 记录键（⑱ 断言） */
    state.locked = false;
    return r;
  }
  if (r === 'done') { winFlow(); return 'done'; }
  state.locked = false;
  renderQuiz();                                  /* 新故事（槽/卡/进度全换）；读题仅首题（§R9 压缩） */
  return r;
}

/* ================= 因果问句点选主路径（r34 维度三；真实点击 / ST.tapWhy / autoSolve 共用）
   吞输入轻叮+容器 bump（家族 D）；错选 1000ms 防重入窗（与帧错点同口径） ========== */
async function uiTapWhy(i) {
  if (!cur || state.won || state.locked || state.demo) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || !whyPending(q)) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur */
  const el = boardEl.querySelector('.optcard[data-w="' + i + '"]');
  const r = engTapWhy(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return false; }
  boardEl.querySelectorAll('.optcard').forEach(c => c.classList.remove('breathe'));

  if (r === 'wrong') {                           /* 傻干扰选项：摇头+sto_why_w（TODO 注册前静默）+miss（星级口径含 why） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sayW(VOICE.whyW.key, VOICE.whyW.text);
    await wait(1000 * SPEED);
    if (cur !== run) return r;
    const s0w = sceneEl.querySelector('.slot[data-k="0"]');
    if (s0w) replayAnim(s0w, 'why-first');       /* 首帧 pulse 维系（问题锚点不因错选消失） */
    state.locked = false;
    return r;
  }
  /* ---- 点对（真因果）：sto_why_right →（下一题 | winFlow） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  state.locked = true;
  const s0 = sceneEl.querySelector('.slot[data-k="0"]');
  if (s0) s0.classList.remove('why-first');
  if (el) { el.classList.add('lit'); el.classList.remove('breathe'); }
  chimeGoal();
  sfx('coin');
  sayR(VOICE.whyRight.key, VOICE.whyRight.text); /* sto_why_right（预估 3400→窗 3700，SPEC §R9/§R10） */
  await wait(3700 * SPEED);
  if (cur !== run) return r;
  if (r === 'done') { winFlow(); return 'done'; }
  state.locked = false;
  renderQuiz();
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（不带"明天："前缀，core 模板自带） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {                             /* sto_right 已在复述链内播过，此处不再叠播（防撞头） */
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：两处 dayEnd 都传 lim-1（防跳章） */
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
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.story3 && sv.story3.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;
  speakQuiz();                                   /* 开场读题面（sto_q） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看=幽灵手指演示排完一个故事（逐槽点正确帧：槽0→1→2，帧飞入+槽点亮，
   故事条亮起；demo 跳复述 TTS 防 turn 撞头）→帮=指向当前槽正确帧；
   独=首次真点对放手（watch 全程 ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* sto_tut_watch 2952：看！先找第一张 */
  await wait(700 * SPEED);
  const run = cur, q = run.quizzes[0];
  const ownN = q.frames.filter(f => f.pos >= 0).length;   /* r34：循环上界随帧数（flat0 恒 3，节奏不变） */
  for (let s = 0; s < ownN; s++) {
    const idx = correctIdx(q);                   // 当前槽正确帧（逐槽推进）
    if (idx < 0) break;
    pointGhostAt(cardEl(idx));
    await wait(900 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    const demoR = await uiTapFrame(idx, true);   /* demo 通道豁免 locked 门（演示吞真实输入） */
    window.__stDemoR = demoR;                    /* 演示生效证据（§0.27，gate 断言 'right'） */
    await wait((q.slot >= ownN ? 500 : 950) * SPEED);   /* 末槽完成=短顿（故事条亮起收束） */
  }
  const sv = KIDS._save() || {};
  sv.story3 = sv.story3 || {};
  sv.story3.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），「你来排一排」在重发后的题面上说（照 batch5-24） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* sto_tut_turn 1776：你来排一排 */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2000);                                      /* 2000 ≥ 1776+224：turn 播完再读题面 */
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：想想先发生了什么 */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;   /* r34 试玩 F1：补 demo 门（教学期听题穿透，与兔兔/重玩/故事条/空白四门对齐） */
  lastAct = Date.now();
  replayAnim(hearBtn, 'bounce');
  const q = cur.quizzes[cur.step];
  if (q && whyPending(q)) speakWhy();            /* r34：why 相位重听=问句 clip */
  else speakQuiz();                              /* 再听一遍：题面 clip 重读 */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点故事条=重听题面（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();
  replayAnim(sceneEl, 'bounce');
  const q = cur.quizzes[cur.step];
  if (q && whyPending(q)) speakWhy();
  else speakQuiz();
});
boardEl.addEventListener('pointerdown', e => {
  const o = e.target.closest('.optcard');        /* r34：因果问句选项卡 */
  if (o) { e.preventDefault(); uiTapWhy(Number(o.dataset.w)); return; }
  const p = e.target.closest('.card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapFrame(Number(p.dataset.i));
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

/* ================= 无操作看护：14s 方向级（重读题面/why=重播问句+未放帧/选项卡 pulse，
   lastDir 独立节流锚，不重置 lastAct——30s 答案级不被饿死）/ 30s 答案级（当前槽正确帧/
   正确选项卡 breathe——r25 M2 why 待答中间态）/ 教学"帮"5s 重演示 */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  const q = cur.quizzes[cur.step];
  const wp = whyPending(q);                      /* r34：why 相位分支（§R4 中间态纪律） */
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    if (q) {
      if (wp) {
        const wi = correctWhyIdx(q);
        const wEl = wi >= 0 ? boardEl.querySelector('.optcard[data-w="' + wi + '"]') : null;
        if (wEl) replayAnim(wEl, 'breathe');
        speakWhy();
      } else {
        const i = correctIdx(q);
        if (i >= 0) { const ok = cardEl(i); if (ok) replayAnim(ok, 'breathe'); }
        speakQuiz();
      }
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重读题面+未放帧 pulse（不动 lastAct） */
    if (wp) {
      speakWhy();
      boardEl.querySelectorAll('.optcard').forEach(c => replayAnim(c, 'pulse'));
      const s0 = sceneEl.querySelector('.slot[data-k="0"]');
      if (s0) replayAnim(s0, 'why-first');
    } else {
      speakQuiz();
      boardEl.querySelectorAll('.card:not(.gone)').forEach(c => replayAnim(c, 'pulse'));
      replayAnim(sceneEl, 'pulse');
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
  KIDS.init({ game: 'story3', title: '故事排序' });   // 存档键 kidsgame_story3（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1（winFlow 同款） */
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.ST = {
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
    return { story: q.story,                              /* SPEC §1 钩子契约：故事 id */
             frames: q.frames.map(f => ({ id: f.id, pos: f.pos, placed: f.placed })),  /* pos=-1=干扰帧（r34） */
             slot: q.slot,                                /* 当前待填槽 0..N-1（N=自有槽全对） */
             step: cur.step,
             miss: q._miss || 0,
             answered: !!q._answered,                     /* r34：故事帧已全对（why 相位判定入口） */
             why: q.why ? { on: true, done: q.why.done, opts: q.why.opts.slice() } : null };  /* r34 因果问句态 */
  },
  tapFrame(i) { return uiTapFrame(i); },
  tapWhy(i) { return uiTapWhy(i); },             /* r34：因果问句选项卡（0/1） */
  async autoSolve() {                    // UI 路径自动排完当前关（逐槽点正确帧+答因果，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 200) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      if (whyPending(q)) {                       /* r34：why 相位先答因果（真因果选项 a） */
        const wi = correctWhyIdx(q);
        if (wi < 0) break;
        const rw = await uiTapWhy(wi);
        if (rw === false || rw === null) break;
        taps++;
        continue;
      }
      const i = correctIdx(q);
      if (i < 0) break;
      const r = await uiTapFrame(i);
      if (r === false || r === null) break;      // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get tutorial() { return state.tut; }
};
