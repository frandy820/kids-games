/* ================= share 主逻辑（托盘/动物碗渲染 / 两击制分糖 / 自动判定 / 教学 / 救援 / 推进 / r22 作答面）
   玩法：题面语音「N 颗糖，分给 K 只小动物，每只一样多」（sha_q_ clip，T46 阶段2）+题面 chip
   （糖图形+大数字+箭头+动物图形+大数字，零文字 §0.19）。两击制：点糖（提起高亮+全部碗
   轻跳邀请）→点碗（糖飞入+碗内计数数词 TTS）；再点别的糖=换选；点已提起的糖=放回；
   未选糖点碗=无效（轻叮+碗排 bump）。取回=点碗里的糖退回托盘（零惩罚，计 miss 星级口径）。
   自动判定：每碗相等且分完=动物跳+吃糖+sha_right 推进；相等+有剩≥K=继续；不等=继续
   （无错误路径）。剩余题每碗相等且剩 <K=小盘点亮+sha_plate，点盘收尾。
   r22（SPEC-R22 §R4）：ch4 作答面——cmp-who（点动物站）/cmp-diff·rev（数字钮）；
   选错=wiggle+sha_wrong 不换题可重选（即时层不惩罚），答错计 qMiss 入星级；
   答对=正确站跳/全跳+吃糖+sha_ans_right；首次新作答视觉预告（ansSeen 次第 tease）。
   救援：14s 方向级=重读题面+未均碗 pulse（cmp/rev=作答排轻 pulse 不泄答案）；
   30s 答案级=高亮一颗托盘糖+幽灵手指指向目标碗（最少糖的碗）；引导态指向小盘；
   cmp/rev 答案级=幽灵手指指正确站/正确数字钮。
   验收钩子：window.SH = { get currentLevel, get quiz, tapCandy(i), tapBowl(j),
   takeBack(j, idx), tapPlate(), pickAnimal(j), pickNum(i), start(flat),
   async autoSolve(), get tutorial } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速（wait 全按 SPEED 缩放）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援/读题/判对/放盘引导不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 题面整句（T46 阶段2 clip 化：sha_q_{n}_{k} 在册走 clip，text 留回退） */
const sayQuiz = q => { if (q) KIDS.voice.play(quizKey(q), quizSpeech(q)); };

const chipEl = $id('prompt-chip'), trayEl = $id('tray'), stationsEl = $id('stations'),
      plateBtn = $id('btn-plate'), fieldEl = $id('field'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, busy: false, won: false, demo: false, tut: 'none', ansTeased: false };
let lastAct = Date.now();                       // 有效动作（推进救援钟的锚点）
let lastRescue = 0;                             // 上次方向级救援时刻（防每秒连发）
let lastAns = 0;                                // 上次答案级时刻（独立节流锚——试玩P2a 复修：方向级 28s 重发会使 now-lastRescue>14000 永不满足=答案级饿死）
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
const trayBtnOf = i => trayEl.querySelector('.candy[data-i="' + i + '"]');
const stationEl = j => stationsEl.querySelector('.station[data-j="' + j + '"]');
const bowlBtnOf = (j, idx) => stationsEl.querySelector('.bcandy[data-j="' + j + '"][data-idx="' + idx + '"]');
/* 目标碗 = 糖最少的碗（并列取先）——教学"帮"/救援答案级/急救通路的共同取向 */
function minBowlIdx(q) {
  let j = 0;
  for (let i = 1; i < q._bowlIds.length; i++) if (q._bowlIds[i].length < q._bowlIds[j].length) j = i;
  return j;
}

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  $id('chip-arrow').innerHTML = ICONS.arrow;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  plateBtn.querySelector('.plate-art').innerHTML = plateSvg();
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：入碗=清脆双音 / 取回=短叮 / 判对=轻铃上扬 */
const plopSfx = () => { if (!VERIFY) { KIDS.audio.note(880, 0.1, 0, 0.5); KIDS.audio.note(1175, 0.12, 0.05, 0.38); } };
const backTone = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.32); };
const chimeFull = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.24, 0, 0.5); KIDS.audio.note(783.99, 0.3, 0.09, 0.5); } };

/* ================= 渲染 ================= */
function renderQuiz(speak) {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderChip(q);
  renderTray(q);
  renderStations(q);
  renderPlate(q);
  renderStep();
  maybeTease(q);                                 /* r22：首次新作答视觉预告（§R4） */
  if (speak !== false && !VERIFY && !state.demo) sayQuiz(q);
}
/* r22 首次新作答视觉预告（每存档一次 sv.share.ansSeen——已预告过不再触发；
   verify 页不写档每关重触发=⑮ 断言口径）：
   作答钮次第 bounce 一遍——预告可点，不指示正确答案（承 r21 revSeen 范式） */
function maybeTease(q) {
  if (cur.dch !== 4 || !q || q.mode === 'split' || state.ansTeased) return;
  state.ansTeased = true;
  const sv0 = KIDS._save();
  if (sv0 && sv0.share && sv0.share.ansSeen) return;   /* 正常页已预告过（一次性语义） */
  const els = trayEl.querySelectorAll('.numkey, .askbtn');
  const sts = stationsEl.querySelectorAll('.station');
  els.forEach((el, i) => setTimeout(() => replayAnim(el, 'tease'), i * 260 * SPEED));
  if (q.mode === 'cmp' && q.ask === 'who') {     /* who 题：动物站次第 bounce */
    sts.forEach((el, i) => setTimeout(() => replayAnim(el, 'tease'), i * 260 * SPEED));
  }
  if (!VERIFY) {
    const sv = KIDS._save() || {};
    sv.share = sv.share || {};
    sv.share.ansSeen = true;
    if (KIDS._save()) KIDS.store.persist();
  }
}
function renderChip(q) {                        // 题面行：糖+n → 动物+k（零文字 §0.19）
  if (q.mode === 'cmp' || q.mode === 'rev') {   /* r22 作答面题面（§R4 双表征） */
    if (q.mode === 'rev') {                     /* 每碗 X 颗 × K 只：X 颗迷你糖+大X → 动物+大K */
      $id('chip-candy').innerHTML = miniCandies(q.x);
      $id('chip-n').textContent = q.x;
      $id('chip-animal').innerHTML = animalSvg(q.kinds[0]);
      $id('chip-k').textContent = q.kinds.length;
    } else if (q.ask === 'who') {               /* 谁的糖多：问号 → K 只动物 */
      $id('chip-candy').innerHTML = ICONS.quest;
      $id('chip-n').textContent = '?';
      $id('chip-animal').innerHTML = animalSvg(q.kinds[0]);
      $id('chip-k').textContent = q.kinds.length;
    } else {                                     /* 差几颗：a 颗迷你糖+大a → b 颗迷你糖+大b */
      const a = Math.max.apply(null, q.dist), b = Math.min.apply(null, q.dist);
      $id('chip-candy').innerHTML = miniCandies(a);
      $id('chip-n').textContent = a;
      $id('chip-animal').innerHTML = miniCandies(b);
      $id('chip-k').textContent = b;
    }
    chipEl.setAttribute('aria-label', quizSpeech(q) + '，点我再听一遍');
    return;
  }
  $id('chip-candy').innerHTML = candySvg(0);
  $id('chip-n').textContent = q.n;
  $id('chip-animal').innerHTML = animalSvg(q.kinds[0]);
  $id('chip-k').textContent = q.kinds.length;
  chipEl.setAttribute('aria-label', quizSpeech(q) + '，点我再听一遍');
}
/* r22 chip 迷你糖堆（count 颗并排小图——diff/rev 题面双表征的图形腿；
   .minis flex wrap 小尺寸，见 head.html） */
function miniCandies(count) {
  let s = '<span class="minis">';
  for (let i = 0; i < count; i++) s += candySvg(i);
  return s + '</span>';
}
function renderTray(q) {                        // 托盘糖（两击制第一击目标，≥64）
  trayEl.innerHTML = '';
  if (q.mode === 'cmp' || q.mode === 'rev') {   /* r22 作答面：数字钮排 / 问号大钮 */
    if (q.opts) {                               /* cmp-diff / rev：数字钮（点=报数词） */
      for (let i = 0; i < q.opts.length; i++) {
        const b = document.createElement('button');
        b.className = 'numkey' + (q.picked === i ? ' picked' : '');
        b.dataset.i = i;
        b.setAttribute('aria-label', '数字' + numCn(q.opts[i]) + '，点一下选它');
        b.textContent = q.opts[i];
        trayEl.appendChild(b);
      }
    } else {                                    /* cmp-who：问号大钮（点=重读题面轻回应） */
      const b = document.createElement('button');
      b.className = 'askbtn';
      b.innerHTML = ICONS.quest;
      b.setAttribute('aria-label', '考考你，谁的糖果多');
      trayEl.appendChild(b);
    }
    return;
  }
  for (let i = 0; i < q.trayIds.length; i++) {
    const b = document.createElement('button');
    b.className = 'candy' + (q._sel === i ? ' sel' : '');
    b.dataset.i = i;
    b.setAttribute('aria-label', '糖果，点一下拿起来');
    b.innerHTML = candySvg(q.trayIds[i]);
    trayEl.appendChild(b);
  }
}
function renderStations(q) {                    // 动物站：表情（空=期待/有糖=笑）+深碗+碗内糖
  stationsEl.className = 'k' + q.k;
  if (q.mode === 'cmp' || q.mode === 'rev') stationsEl.classList.add('static');  /* r22 静态碗阵 */
  if (q.mode === 'cmp' && q.ask === 'who') stationsEl.classList.add('ans');      /* r22 站=作答钮 */
  stationsEl.innerHTML = '';
  for (let j = 0; j < q.k; j++) {
    const st = document.createElement('button');
    st.className = 'station' + (q._bowlIds[j].length ? ' has' : '') +
      (q.mode === 'split' && q._sel != null ? ' wants' : '') +
      (q.mode === 'cmp' && q.ask === 'who' && q.picked === j ? ' picked' : '');
    st.dataset.j = j;
    st.setAttribute('aria-label', q.mode === 'split'
      ? ANIMALS[q.kinds[j]].n + '的碗，点一下把糖放进来'
      : ANIMALS[q.kinds[j]].n + '的碗里有' + numCn(q._bowlIds[j].length) + '颗糖');
    let items = '';
    for (let t = 0; t < q._bowlIds[j].length; t++) {
      items += '<button class="bcandy" data-j="' + j + '" data-idx="' + t +
        '" aria-label="' + ANIMALS[q.kinds[j]].n + '碗里的糖，点一下放回托盘">' +
        candySvg(q._bowlIds[j][t]) + '</button>';
    }
    /* bowl-base 先画（碗身），bowl-items 后画（碗内糖覆于其上）——同为 absolute 无
       z-index，按 DOM 序层叠；先前 items 在前被不透明碗身整片盖住（像素仲裁实锤） */
    st.innerHTML = '<span class="animal">' + animalSvg(q.kinds[j]) + '</span>' +
      '<span class="bowl"><span class="bowl-base" aria-hidden="true"></span>' +
      '<span class="bowl-items">' + items + '</span></span>';
    stationsEl.appendChild(st);
  }
}
function renderPlate(q) {                       // 小盘：剩余题可见（暗态），引导态点亮脉冲
  plateBtn.className = q.kind === 'rem' ? 'show' : '';
  plateBtn.classList.toggle('ready', !!q._ready);
  let s = '';
  for (let i = 0; i < q.plateIds.length; i++) s += candySvg(q.plateIds[i]);
  plateBtn.querySelector('.plate-items').innerHTML = s;
  plateBtn.setAttribute('aria-label', q._ready ? '小盘子，点一下把剩下的糖放进来' : '小盘子');
}
function renderStep() {                         // HUD 本关 5 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
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
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 动效：飞行糖 / 全场跳 / 吃糖 ================= */
function flyCandy(fromEl, toEl, candyId) {      // 托盘→碗 / 碗→托盘 / 托盘→盘（fixed 克隆体）
  if (VERIFY || !fromEl || !toEl) return;
  const r1 = fromEl.getBoundingClientRect(), r2 = toEl.getBoundingClientRect();
  const d = document.createElement('div');
  d.className = 'fly-candy';
  d.innerHTML = candySvg(candyId);
  d.style.left = Math.round(r1.left + r1.width / 2 - 26) + 'px';
  d.style.top = Math.round(r1.top + r1.height / 2 - 22) + 'px';
  d.style.transitionDuration = (240 * SPEED) + 'ms';
  document.body.appendChild(d);
  requestAnimationFrame(() => {
    d.style.transform = 'translate(' + Math.round(r2.left + r2.width / 2 - r1.left - r1.width / 2) + 'px,' +
      Math.round(r2.top + r2.height / 2 - r1.top - r1.height / 2) + 'px)';
    d.style.opacity = '.3';
  });
  setTimeout(() => d.remove(), 240 * SPEED + 90);
}
function jumpAll() {                            // 全相等=跳（§0.53 表情三态）
  stationsEl.querySelectorAll('.station').forEach(st => {
    st.classList.remove('jump'); void st.offsetWidth; st.classList.add('jump');
    setTimeout(() => st.classList.remove('jump'), 1100 * SPEED + 200);
  });
}
function eatAnim() {                            // 判对：碗内糖缩小飞散（动物吃糖）
  stationsEl.querySelectorAll('.bcandy').forEach(b => b.classList.add('eaten'));
}
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}

/* ================= 幽灵手指（教学"看/帮"+救援答案级共用） ================= */
const ghost = {
  show() { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAtEl(btn) {
  if (VERIFY || !btn) return;
  const r = btn.getBoundingClientRect();
  ghostEl.style.left = Math.round(r.left + r.width / 2) + 'px';
  ghostEl.style.top = Math.round(r.top + r.height * 0.42) + 'px';
  ghost.show();
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"指向：引导态→小盘；未选糖→第一颗糖；已选糖→目标碗（最少糖的碗） */
function pointHelpNext() {
  if (!cur) return;
  const q = cur.quizzes[cur.step];
  if (!q) return;
  if (q._ready) pointGhostAtEl(plateBtn);
  else if (q._sel == null) pointGhostAtEl(trayBtnOf(0));
  else pointGhostAtEl(stationEl(minBowlIdx(q)));
}

/* ================= 两击制主路径（真实点击 / SH 钩子 / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（tray/stations/plate 容器 bump——b21 feed 定版）；
   防重入双锁：busy=飞糖占位锁（240ms 同步置位）；locked=判对演出锁。
   demo 通道仅 tutorialWatch 内部传 true（豁免锁，演示吞输入不误伤）。 ================= */
function uiTapCandy(i, demo) {                  // 第一击：提起/换选/放回（同步，无飞行窗）
  if (!cur || state.won) return false;
  if (!demo && (state.locked || state.demo || state.busy)) {
    sfx('pop'); replayAnim(trayEl, 'bump'); return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engTapCandy(cur, i);
  if (r === null) { if (!demo) { sfx('pop'); replayAnim(trayEl, 'bump'); } return false; }
  sfx('pop');
  renderTray(q);
  renderStations(q);                            // .wants 邀请态随选择重算
  return r;
}
async function uiTapBowl(j, demo) {             // 第二击：飞入 + 自动判定
  if (!cur || state.won) return false;
  if (!demo && (state.locked || state.demo || state.busy)) {
    sfx('pop'); replayAnim(stationsEl, 'bump'); return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (q._sel == null) {                         // 未选糖点碗=无效（SPEC 定版）
    sfx('pop'); replayAnim(stationsEl, 'bump'); return false;
  }
  const run = cur;                              /* 身份守卫：演出窗内重开会重建 cur */
  const selBtn = trayBtnOf(q._sel);
  const flyId = q.trayIds[q._sel];
  state.busy = true;                            // 占位锁同步置位：飞行窗内紧邻输入=拒绝
  flyCandy(selBtn, stationEl(j), flyId);
  await wait(240 * SPEED);
  if (cur !== run) { state.busy = false; return false; }
  const r = engTapBowl(cur, j);
  if (r === null) { state.busy = false; sfx('pop'); replayAnim(stationsEl, 'bump'); return false; }
  lastAct = Date.now();                         // 有效操作重置救援钟（§0.7a）
  plopSfx();
  if (state.tut === 'help') {                   // 教学"独"：首次入碗 → 放手
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  if (r === 'moved') {
    const cnt = cur.quizzes[cur.step]._bowlIds[j].length;   // 碗内计数数词（sha_n_ clip，T46）
    KIDS.voice.play(numKey(cnt), numCn(cnt));
    renderTray(q); renderStations(q);
    state.busy = false;
    return 'moved';
  }
  if (r === 'plate') {                          // 均衡且剩 <K：小盘引导（未收尾，继续等点盘）
    renderTray(q); renderStations(q); renderPlate(q);
    state.busy = false;
    jumpAll();
    sayR(VOICE.plate.key, VOICE.plate.text);
    return 'plate';
  }
  /* right / done：判对——动物跳+吃糖+sha_right 欣赏窗 */
  renderTray(q); renderStations(q);
  const done = await finishQuiz(r, run, demo);
  return done;
}
/* 判对收题共用（点碗判对 / 点盘收尾 / r22 作答答对共用）：跳+吃+语音+3200ms 窗 → 下一题/通关
   r22：vk/vt 可传作答面语音（默认分糖 sha_right；cmp/rev 传 sha_ans_right——新 clip 未实测
   前按同窗保守值，SPEC-R22 §R4） */
async function finishQuiz(r, run, demo, vk, vt, vdelay) {
  chimeFull();
  jumpAll();
  eatAnim();
  if (!demo) state.locked = true;
  const speak = () => sayR(vk || VOICE.right.key, vt || VOICE.right.text);
  if (vdelay && !VERIFY) {                      /* 审查M1：报数词让位窗（数字钮答对路径传 500ms）——
                                                   verify 页不延迟（序列断言不受扰） */
    setTimeout(() => { if (cur === run && !state.won) speak(); }, vdelay);  /* r22①：恒真死条件收窄——未换题且未通关才播（won 由 winFlow 语音接管，不叠播） */
  } else speak();
  await wait(3200 * SPEED);                     /* 审查M2：sha_right 实测 2880ms——窗 3200 播完再读下一题 */
  state.busy = false;
  if (cur !== run) { if (!demo) state.locked = false; return r; }
  if (!demo) state.locked = false;
  if (r === 'done') { winFlow(); return r; }
  renderQuiz(true);                             // 新题 + 读题
  if (state.tut === 'help') pointHelpNext();
  return r;
}
async function uiTakeBack(j, idx, demo) {       // 取回：点碗里的糖退回托盘（零惩罚，计 miss）
  if (!cur || state.won) return false;
  if (!demo && (state.locked || state.demo || state.busy)) {
    sfx('pop'); replayAnim(stationsEl, 'bump'); return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  if (j == null || j < 0 || j >= q.k) { sfx('pop'); replayAnim(stationsEl, 'bump'); return false; }
  const run = cur;
  const at = idx == null ? q._bowlIds[j].length - 1 : idx;
  const btn = at >= 0 && at < q._bowlIds[j].length ? bowlBtnOf(j, at) : null;
  state.busy = true;
  if (btn) flyCandy(btn, trayEl, q._bowlIds[j][at]);
  await wait(240 * SPEED);
  if (cur !== run) { state.busy = false; return false; }
  const r = engTakeBack(cur, j, idx);
  if (r === null) { state.busy = false; sfx('pop'); replayAnim(stationsEl, 'bump'); return false; }
  lastAct = Date.now();
  backTone();
  KIDS.voice.play(numKey(r), numCn(r));         // 取回后碗内数词（含'零'——sha_n_ clip，T46）
  renderTray(q); renderStations(q); renderPlate(q);
  state.busy = false;
  if (q._ready) {                               // 取回恰好补成均衡 → 引导出现（[3,2]退一颗→[2,2]剩1）
    jumpAll();
    sayR(VOICE.plate.key, VOICE.plate.text);
  }
  return r;
}
async function uiTapPlate(demo) {               // 小盘收尾（仅引导态）
  if (!cur || state.won) return false;
  if (!demo && (state.locked || state.demo || state.busy)) {
    sfx('pop'); replayAnim(plateBtn, 'bump'); return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;
  state.busy = true;
  flyCandy(trayBtnOf(0) || trayEl, plateBtn, q.trayIds[0]);
  await wait(240 * SPEED);
  if (cur !== run) { state.busy = false; return false; }
  const r = engTapPlate(cur);
  if (r === null) { state.busy = false; sfx('pop'); replayAnim(plateBtn, 'bump'); return false; }
  lastAct = Date.now();
  renderTray(q); renderStations(q); renderPlate(q);   // 盘内糖展示（剩余糖可视）
  const done = await finishQuiz(r, run, demo);
  return done;
}

/* ================= r22 作答面主路径（cmp 点动物 / cmp·rev 数字钮，§R4）
   选错=wiggle+sha_wrong 不换题可重选（即时层不惩罚，qMiss 结算层容纳）；
   答对=正确站点跳+全场跳+吃糖+sha_ans_right；吞输入轻叮配容器 bump（b21 定版）。 ================= */
async function uiPickAnimal(j) {                // cmp-who：点动物站作答
  if (!cur || state.won) return false;
  if (state.locked || state.demo || state.busy) {
    sfx('pop'); replayAnim(stationsEl, 'bump'); return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const r = engPickAnimal(cur, j);
  if (r === null) { sfx('pop'); replayAnim(stationsEl, 'bump'); return false; }
  lastAct = Date.now();
  if (r === 'same') return r;                   // 重复点同站：不判不罚（探索点击）
  if (r === 'wrong') {
    sfx('pop');
    renderStations(q);                          // .picked 标记
    const st = stationEl(j);
    if (st) replayAnim(st, 'wiggle');
    sayR(VOICE.wrong.key, VOICE.wrong.text);
    return r;
  }
  const run = cur;
  renderStations(q);                            /* .picked 标记（审查m2：先重建再跳——旧序 jump
                                                   加在随即被重建丢弃的旧 DOM 上=答对站跳失效） */
  const st = stationEl(j);                      // right/done：正确站先点跳（答案可视锚）
  if (st) { st.classList.remove('jump'); void st.offsetWidth; st.classList.add('jump'); }
  const done = await finishQuiz(r, run, false, VOICE.ansRight.key, VOICE.ansRight.text);
  return done;
}
async function uiPickNum(i) {                   // cmp-diff / rev：点数字钮作答（点=报数词）
  if (!cur || state.won) return false;
  if (state.locked || state.demo || state.busy) {
    sfx('pop'); replayAnim(trayEl, 'bump'); return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || !q.opts) return false;
  if (i == null || i < 0 || i >= q.opts.length) { sfx('pop'); replayAnim(trayEl, 'bump'); return false; }
  const r = engPickNum(cur, i);
  if (r === null) { sfx('pop'); replayAnim(trayEl, 'bump'); return false; }
  lastAct = Date.now();
  if (r === 'same') return r;
  KIDS.voice.play(numKey(q.opts[i]), numCn(q.opts[i]));   // 数词报数（sha_n_ clip，T46）
  if (r === 'wrong') {
    sfx('pop');
    renderTray(q);
    const k = trayEl.querySelector('.numkey[data-i="' + i + '"]');
    if (k) replayAnim(k, 'wiggle');
    const run = cur;                            /* 审查M1：core voice.play 打断式——反馈句延迟
                                                    500ms 让报数词先说（r21 colormix m5 同型范式） */
    setTimeout(() => { if (cur === run && !state.won) sayR(VOICE.wrong.key, VOICE.wrong.text); },
      VERIFY ? 0 : 500);
    return r;
  }
  const run = cur;
  renderTray(q);
  const done = await finishQuiz(r, run, false, VOICE.ansRight.key, VOICE.ansRight.text, 500);
  return done;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关用 GEN 文案（GEN_HINTS[k]↔dch=k+1，禁右移） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
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
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
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
  state = { locked: false, busy: false, won: false, demo: false, tut: 'none', ansTeased: false };
  helpRedemo = false;
  lastAct = Date.now();
  lastRescue = 0; lastAns = 0;
  renderQuiz(false); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save() || { levels: {} };
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.share && sv.share.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  sayQuiz(cur.quizzes[cur.step]);               // 开场读题（题面整句 TTS）
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   看 = 演示完整一题（flat0 题0 钉 n=2 k=2：分一颗给碗0，再分一颗给碗1——
   「一人分一颗」恰好是本题正解，演示即完整一题，__shDemoR='right'）；
   帮 = 幽灵手指指糖/目标碗；独 = 首次入碗放手（watch 全程 ≤16s） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);      /* sha_tut_watch：看！一人分一颗 */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];                     // flat0 题0 恒 n=2 k=2
  let demoR = null;
  for (let j = 0; j < q.k; j++) {               // 演示两击制完整一轮 × K
    pointGhostAtEl(trayBtnOf(0));               // ① 点糖（提起）
    await wait(850 * SPEED);
    ghost.press();
    await wait(300 * SPEED);
    uiTapCandy(0, true);                        /* demo 通道豁免锁 */
    await wait(420 * SPEED);
    pointGhostAtEl(stationEl(j));               // ② 点碗（飞入）
    await wait(850 * SPEED);
    ghost.press();
    await wait(300 * SPEED);
    demoR = await uiTapBowl(j, true);           // j=0 'moved' / j=1 'right'（演示即完整一题）
    await wait(420 * SPEED);
  }
  window.__shDemoR = demoR;                     /* 演示生效证据（§0.27，gate 断言 'right'） */
  const sv = KIDS._save() || {};
  sv.share = sv.share || {};
  sv.share.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来分一分"在重发后的题面上说 */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, busy: false, won: false, demo: false, tut: 'help', ansTeased: false };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(false); renderDots();
  sayR(VOICE.turn.key, VOICE.turn.text);
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600);
  setTimeout(() => {                                /* 试玩P2b：交接后接力读题面（weather 同构——首次自己动手前把任务句说全） */
    if (cur && cur.quizzes && cur.quizzes[cur.step] && !state.won && !state.locked && !VERIFY) sayQuiz(cur.quizzes[cur.step]);
  }, 2400);
}

/* ================= 底栏与舞台交互 ================= */
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;
  lastAct = Date.now();                         /* 主动学习重置（§0.7a） */
  hearBtn.classList.remove('bounce'); void hearBtn.offsetWidth; hearBtn.classList.add('bounce');
  sayQuiz(cur.quizzes[cur.step]);               /* 再听一遍：题面整段重读 */
});
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.demo || state.won) {   /* 三件门：轻反馈不静默 */
    sfx('pop');
    hopRabbit();
    return;
  }
  hopRabbit();                                  /* 探索点击不重置救援钟（§0.7a） */
  sayP(VOICE.hint.key, VOICE.hint.text);        /* sha_hint：数数每只碗里几颗 */
});
chipEl.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;
  lastAct = Date.now();
  sayQuiz(cur.quizzes[cur.step]);               /* 点题卡重听（儿童高发探索动作） */
});
trayEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.candy');
  if (el) {
    e.preventDefault();
    uiTapCandy(+el.dataset.i);
    return;
  }
  const nk = e.target.closest('.numkey');       /* r22 数字钮=作答通道（cmp-diff/rev） */
  if (nk) {
    e.preventDefault();
    uiPickNum(+nk.dataset.i);
    return;
  }
  const ab = e.target.closest('.askbtn');       /* r22 问号钮=重读题面轻回应（cmp-who） */
  if (ab) {
    e.preventDefault();
    if (VERIFY || !cur || state.locked || state.won || state.demo) { sfx('pop'); return; }
    lastAct = Date.now();
    sayQuiz(cur.quizzes[cur.step]);
  }
});
stationsEl.addEventListener('pointerdown', e => {
  const q = cur ? cur.quizzes[cur.step] : null;
  if (q && q.mode === 'split') {                // 分糖题：碗内糖=取回通道
    const back = e.target.closest('.bcandy');
    if (back) {
      e.preventDefault();
      uiTakeBack(+back.dataset.j, +back.dataset.idx);
      return;
    }
  }
  const st = e.target.closest('.station');      // 站点（动物/碗）：分糖=第二击 / r22 who=作答
  if (!st) return;
  e.preventDefault();
  if (q && q.mode === 'cmp' && q.ask === 'who') uiPickAnimal(+st.dataset.j);
  else uiTapBowl(+st.dataset.j);
});
plateBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  uiTapPlate();
});
fieldEl.addEventListener('pointerdown', e => {
  if (e.target.closest('.candy') || e.target.closest('.bcandy') ||
      e.target.closest('.station') || e.target.closest('#btn-plate') ||
      e.target.closest('.numkey') || e.target.closest('.askbtn')) return;   /* r22 作答钮入排除表（试玩P2-1：冒泡播 sha_hint 截断报数词） */
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);
  }
});

/* ================= 无操作看护（§0.7/§0.21 两级）+ 教学"帮"5s 重演示一次
   救援钟只被有效操作重置（入碗/取回/点盘/读题/作答——lastAct；选糖/放回=探索不重置）；
   14s 方向级=重读题面+未均碗 pulse；30s 答案级=高亮一颗托盘糖+幽灵手指指向目标碗
   （引导态→指小盘）；r22 cmp/rev：方向级=作答排轻 pulse（不泄答案），答案级=指正确
   站/正确数字钮（承答案级可指真值先例）；救援发过后 lastRescue 防每秒连发 ================= */
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const now = Date.now();
  const idle = now - lastAct;
  if (idle > 30000 && now - lastAns > 20000) {            // 答案级（试玩P2a 复修：idle 锚独立+20s 节流，30s 可达）
    const q = cur.quizzes[cur.step];
    if (!q) return;
    lastAns = now; lastRescue = now;
    if (q.mode && q.mode !== 'split') {                   /* r22：指正确作答目标 */
      if (q.mode === 'cmp' && q.ask === 'who') {
        let j = 0;
        for (let t = 1; t < q.k; t++) if (q.dist[t] > q.dist[j]) j = t;
        pointGhostAtEl(stationEl(j));
      } else {
        const ans = q.mode === 'rev' ? q.x * q.k
                  : Math.max.apply(null, q.dist) - Math.min.apply(null, q.dist);
        pointGhostAtEl(trayEl.querySelector('.numkey[data-i="' + q.opts.indexOf(ans) + '"]'));
      }
      return;
    }
    if (q._ready) { pointGhostAtEl(plateBtn); return; }    // 引导态：指小盘
    if (q._sel == null) {                                  // 高亮一颗托盘糖→幽灵手指两段路径
      const c = trayBtnOf(0);
      if (c) {
        c.classList.add('hinted');
        setTimeout(() => c.classList.remove('hinted'), 4000);
        pointGhostAtEl(c);
        setTimeout(() => {                                 // 糖→目标碗路径提示
          if (cur && cur.quizzes[cur.step] === q && q._sel == null && !state.locked) {
            pointGhostAtEl(stationEl(minBowlIdx(q)));
          }
        }, 1600);
      }
    } else pointGhostAtEl(stationEl(minBowlIdx(q)));       // 已选糖：直接指目标碗
    return;
  }
  if (idle > 14000 && now - lastRescue > 13000) {          // 方向级（试玩P2a：不重置 lastAct——30s 答案级可达）
    const q = cur.quizzes[cur.step];
    if (!q) return;
    lastRescue = now;
    sayQuiz(q);                                            // 重读题面（§0.7a）
    if (q.mode && q.mode !== 'split') {                   /* r22：作答排轻 pulse（不泄答案） */
      if (q.mode === 'cmp' && q.ask === 'who') {
        stationsEl.querySelectorAll('.station').forEach(st => replayAnim(st, 'pulse'));
      } else {
        trayEl.querySelectorAll('.numkey').forEach(k => replayAnim(k, 'tease'));
      }
      return;
    }
    if (q._ready) { replayAnim(plateBtn, 'ready'); }       // 引导态：小盘 pulse（ready 动画重放）
    else {
      const counts = q._bowlIds.map(a => a.length);
      const mx = Math.max.apply(null, counts);
      q._bowlIds.forEach((b, j) => {                       // 未均碗 pulse（≠最多糖的碗）
        if (b.length !== mx) replayAnim(stationEl(j), 'pulse');
      });
    }
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
  KIDS.init({ game: 'share', title: '分糖果' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) })          /* 审查M1：§0.4 防跳章（winFlow :350 同款） */;
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口）
   r22：quiz 增 mode/ask/x/opts/picked/tries（split 时 mode='split' 旧字段全保留）；
   currentLevel 增 qmiss（答错累计）；pickAnimal/pickNum 新作答入口；
   autoSolve 分支驱动 cmp/rev（正确答案由 quiz 可见字段推导，不藏私钥）。 ================= */
window.SH = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
             step: cur.step, done: cur.done, won: state.won,
             miss: cur.takebacks || 0, qmiss: cur.qMiss || 0, stars: engStars(cur) };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return { n: q.n, k: q.k, kind: q.kind,
             mode: q.mode || 'split', ask: q.ask !== undefined ? q.ask : null,
             x: q.x !== undefined ? q.x : null,
             opts: q.opts ? q.opts.slice() : null,
             picked: q.picked !== undefined ? q.picked : null,
             tries: q.tries !== undefined ? q.tries : null,
             bowls: q._bowlIds.map(a => a.length),       /* 碗内糖数（SPEC 钩子契约；cmp/rev=dist） */
             tray: q.trayIds.length, plate: q.plateIds.length,
             step: cur.step, miss: q.miss,               /* miss=本题取回数/作答错次数（星级口径） */
             sel: q._sel, ready: q._ready };             /* 附加观测字段（feed 先例） */
  },
  tapCandy(i) { return uiTapCandy(i); },
  tapBowl(j) { return uiTapBowl(j); },
  takeBack(j, idx) { return uiTakeBack(j, idx); },
  tapPlate() { return uiTapPlate(); },
  pickAnimal(j) { return uiPickAnimal(j); },
  pickNum(i) { return uiPickNum(i); },
  async autoSolve() {                    // UI 路径自动分完当前关（最少糖碗优先+作答正确项，走真实判定链）
    let moves = 0, guard = 0;
    while (cur && !cur.done && guard++ < 400) {
      const info = window.SH.quiz;
      if (!info) break;
      if (info.mode === 'cmp' && info.ask === 'who') {   // r22：唯一最多站
        let j = 0;
        for (let t = 1; t < info.bowls.length; t++) if (info.bowls[t] > info.bowls[j]) j = t;
        const r = await uiPickAnimal(j);
        if (r === false || r === 'same') { await wait(90 * SPEED); continue; }
        moves++;
        continue;
      }
      if (info.mode !== 'split') {                       // r22：diff=max−min / rev=x*k 选钮
        const ans = info.mode === 'rev' ? info.x * info.k
                  : Math.max.apply(null, info.bowls) - Math.min.apply(null, info.bowls);
        const r = await uiPickNum(info.opts.indexOf(ans));
        if (r === false || r === 'same') { await wait(90 * SPEED); continue; }
        moves++;
        continue;
      }
      if (info.ready) {                                  // 引导态：点小盘收尾
        const r = await uiTapPlate();
        if (r === false) { await wait(90 * SPEED); continue; }
        moves++;
        continue;
      }
      if (info.sel == null) {                            // 第一击：拿糖
        const r = uiTapCandy(0);
        if (r === false) { await wait(90 * SPEED); }
        continue;
      }
      const q = cur.quizzes[cur.step];                   // 第二击：最少糖的碗
      const r = await uiTapBowl(minBowlIdx(q));
      if (r === false) { await wait(90 * SPEED); continue; }
      moves++;
    }
    return { done: !!(cur && cur.done), moves: moves };
  },
  get tutorial() { return state.tut; }
};
