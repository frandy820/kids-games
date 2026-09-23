/* ================= notebird 主逻辑（题面渲染 / 小鸟点选 / 合成鸟音 / 教学 / 救援 / 推进）
   玩法：题面 = 天空斜电线 + 题面句，场上 4 张卡（鸟卡/类目文字卡）。
   r39 谱（SPEC-R39）：ch1 有序+递增站台（教学建立映射）→ ch2+ 乱序+等高站台（破位置查表）；
   四型题：find（唱 1 音找鸟）/ higher（两音点高者）/ melody（3 音序列依序点鸟复现，
   逐点即判进度保留——r25 M2 口径）/ iv（两音三分类文字卡「挨着/隔一个/隔好几个」）。
   鸟音 = Web Audio 合成（sing(note, when) 纯函数：triangle osc + gain envelope 总时长 700ms，
   频率=NOTES 查表；首次用户手势创建 AudioContext 并 resume——自动播放策略，
   未解锁前 sing 入队不报错，手势后 flush；禁 mp3/speechSynthesis 充当鸟音——SPEC §0.66）。
   **唱窗零视觉指认（SPEC-R39 §R1 扩展一，防「看动画绕过音频」）**：find/melody 唱窗
   不亮任何鸟（原版答案鸟飘音符泄答已修）；higher 两鸟按唱序先后亮（「哪两只在唱」
   =题面信息，高者才是答案，不泄；r39-bis 唱序随机——后亮不再恒=答案）。
   点对 = 鸟跳 + 清唱该音 + 确认句 clip（颜色锚定）；melody 中间位=鸟 picked 高亮+
   播该音（'step'，700ms 唱完窗）；点错 = 语义反馈（find 音序「它更高/更低些」——乱序场
   「往右/往左」位置句已退役；higher「再听一遍，谁的声音高」（r39-bis 去时序明示）；
   melody「照顺序点」；iv「隔了多远」），1000ms 防重入窗后可重选（探索不罚）；
   ch1（dch1）教学特例：点错=free 唱歌给你听，不判对错不计 miss 不进 step（契约 E）。
   救援两级（家族 B 定版）：14s 方向级=重播题面音+题面 pulse（lastDir 独立节流锚，
   不重置 lastAct）；30s 答案级=正确卡 breathe+重播（melody 动态 answer=当前进度位鸟）。
   重听按钮恒在场（听辨类专属，不占救援钟语义）。语音窗（家族 G/H/I；r39 §R9）：
   not_tut_watch 3096 → 教学顺序唱延至 t=900+2700=3600（裕量 m2）；
   not_tut_turn 1752 → turn 后读题延 2100；not_right 2664 → winFlow 3020 ≥2964；
   not_wrong 2832 + 引导句（r39-bis 四型最长 not_g_h2 9 字 estMs=3705）→ 链 2832+150+3705+300=6987
     ≤wrongChainUntil 7800（r39-bis 终态实长 2928 口径：链 6210≤7800，mutagen 2026-09-22，SPEC-R39 §R10）；
   确认句 clip 最长 not_cf_h_4 2952 → 判对演出窗 900+1800+3300=6000 ≥3252；
   not_main 2904 → 顺序唱后窗 4100 ≥3204；教学链总预算 ≤16s（M1）。
   验收钩子：window.NB = { get currentLevel, get quiz(){kind,notes,sang,answer,step,miss,prog}
   tapBird(i), start(flat), async autoSolve(), replay() }（getter 返回拷贝） */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速（合成音窗不折算——SPEC §0.66）
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限
   救援/开场任务语音/读题不受 flat 门限制（§0.5：不识字孩子 flat≥3 静置 14s 零救援） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 纠错链节流（家族 J）：flat<3 每错必播；flat≥3 走 10s 节流（语义句全程保留，禁切通用 clip） */
let lastWrongVoice = 0;
let wrongChainUntil = 0;                         /* 错反馈链豁免窗终点（家族 I：救援 interval 让路） */
const sayW = parts => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.queue(parts); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.queue(parts); }
};

/* ================= 合成鸟音（Web Audio；无 mp3 clip 鸟音——SPEC §0.66 家族新范式）
   sing(note, when) 纯函数接口：note=音名（NOTES 查表频率），when=相对现在的秒偏移（osc.scheduling）；
   返回 undefined（fire-and-forget 调度）。AudioContext 懒创建：core 首次 pointerdown→
   audio.unlock 创建并 resume；未解锁前 play 入 _pending 队不报错，NB_AUDIO.unlockFlush()
   （挂同一 pointerdown 手势链）在 ctx running 后按序补排——页面永不因自动播放策略崩。
   verify/复验：覆写 NB_AUDIO._tone（唯一真实调度出口）记录 (频率,时刻) 序列挂
   window.__nbSang——不依赖真实出声（无头 AudioContext suspended 也能全断言）。 */
const NB_AUDIO = {
  _pending: [],                                  // 未手势解锁期的待播 (freq, when, dur)
  ctx() { return (typeof KIDS !== 'undefined' && KIDS.audio) ? KIDS.audio.ctx : null; },
  _vol() { try { return (typeof KIDS !== 'undefined' && KIDS.audio && KIDS.audio._vol) ? KIDS.audio._vol() : 0.6; }
           catch (e) { return 0.6; } },
  _tone(freq, when, dur) {                       // 真实调度出口（verify spy 覆写挂点）
    const c = this.ctx(); if (!c) return;
    const t = c.currentTime + when, v = this._vol();
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = freq;      // triangle osc（SPEC 定版音色）
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5 * Math.max(v, 0.0001), t + 0.02);   // attack 0.02s
    g.gain.setValueAtTime(0.5 * Math.max(v, 0.0001), t + dur * 0.6);      // sustain
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);                 // release 至总时长
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.03);
  },
  play(freq, when, dur) {
    const c = this.ctx();
    if (!c || c.state !== 'running') {           // 无手势/挂起：入队不报错（自动播放策略⑭）
      this._pending.push([freq, when, dur]);
      if (this._pending.length > 8) this._pending.shift();   // 只保最近（旧音过时丢弃）
      return;
    }
    this._tone(freq, when, dur);
  },
  unlockFlush() {                                // 用户手势时调用（与 core unlock 同一手势链）
    try { if (typeof KIDS !== 'undefined' && KIDS.audio && KIDS.audio.unlock) KIDS.audio.unlock(); } catch (e) {}
    const c = this.ctx();
    if (!c || c.state !== 'running') return;     // 手势未生效（无头环境）：保队列不崩
    const q = this._pending; this._pending = [];
    for (let i = 0; i < q.length; i++) this._tone(q[i][0], q[i][1], q[i][2]);
  }
};
function sing(note, when, dur) {
  const info = NOTES[note];
  if (!info) return;
  NB_AUDIO.play(info.freq, when || 0, (dur || SING_MS) / 1000);
}

const sceneEl = $id('scene'), boardEl = $id('board'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, singing: false };
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let helpRedemo = false;
let voiceGen = 0;                               // 题面唱窗代（防旧窗错解锁新窗）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => boardEl.querySelector('.bird-card[data-i="' + i + '"]');
const cardOfNote = n => boardEl.querySelector('.bird-card[data-note="' + n + '"]');

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：答错=低柔单音（答对的奖励音=鸟清唱该音，不叠叮咚） */
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(587, 0.09, 0, 0.3); };

/* ================= 题面语音：唱后读题面句（四型分流，SPEC-R39 §R10 键表） ================= */
function speakQuiz() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  if (q.kind === 'higher') KIDS.voice.play('not_q2', '谁的声音高？');   /* T46：higher 题面句整句 clip */
  else if (q.kind === 'melody') KIDS.voice.play('not_q_mel', quizTextOf('melody'));   /* r39 新键（注册前静默） */
  else if (q.kind === 'iv') KIDS.voice.play('not_q_iv', quizTextOf('iv'));            /* r39 新键（注册前静默） */
  else KIDS.voice.play(VOICE.q.key, VOICE.q.text);           /* 「是哪只小鸟在唱？」 */
}

/* ================= 渲染 ================= */
function renderScene(q) {                        // 题面：天空斜电线 + 题面句文字条
  sceneEl.dataset.kind = q.kind;
  sceneEl.setAttribute('aria-label', quizTextOf(q.kind) + '，点我再听一遍');
  sceneEl.innerHTML = wireSvg() + '<div class="q-text">' + quizTextOf(q.kind) + '</div>';
}
function birdCardInner(note, i, flatPerch) {    // 鸟卡内容：鸟 + 站台（ch1 递增 30+16i / ch2+ 等高 30）+ 唱名
  return '<span class="bird-wrap">' + birdSvg(note) + '</span>' +
    '<span class="perch" style="height:' + (flatPerch ? 30 : 30 + i * 16) + 'px"><span class="n-label">' + NOTES[note].n + '</span></span>' +
    '<span class="note-fly">♪</span>';
}
/* interval 三分类卡内容（SPEC-R39 §R1 维度三）：图示（两音符间距=类目语义）+大字标签 */
function ivCardInner(cls) {
  const gap = cls === 'iv_near' ? '♪♪' : cls === 'iv_mid' ? '♪·♪' : '♪···♪';
  return '<span class="iv-glyph">' + gap + '</span>' +
    '<span class="iv-word">' + IV_LABEL[cls] + '</span>';
}
function renderBoard(q) {                        // 卡排（鸟卡/iv 文字卡按 notes 序=视觉站位）
  boardEl.innerHTML = '';
  const flatPerch = !!q.freeOrder;               // ch2+ 等高站台（高度轴零线索，SPEC-R39 §R1）
  q.notes.forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'bird-card pop' + (q.kind === 'iv' ? ' iv-card' : '');
    b.dataset.i = i;
    b.dataset.note = n;                          // verify 对账（渲染即引擎；iv 卡=类目 id）
    b.setAttribute('aria-label', q.kind === 'iv' ? '音程卡 ' + IV_LABEL[n] :
                   NOTES[n].cn + '色小鸟 ' + NOTES[n].n + ' 卡');
    b.style.animationDelay = (i * 70) + 'ms';
    b.innerHTML = q.kind === 'iv' ? ivCardInner(n) : birdCardInner(n, i, flatPerch);
    boardEl.appendChild(b);
  });
}
function flashSang(q) {                          // 唱窗视觉（SPEC-R39 §R1 扩展一）：仅 higher 两鸟先后亮
  if (q.kind !== 'higher') return;               // find/melody 唱窗零指认（原版答案鸟飘音符泄答已修）
  q.sang.forEach((n, j) => {
    const el = cardOfNote(n);
    if (el) setTimeout(() => replayAnim(el, 'singing'), j * SING_STEP);
  });
}
async function playQuizVoice(q) {                // 题面唱窗（合成音，SPEED 不折算；四型窗，SPEC-R39 §R9）：
  const gen = ++voiceGen;                        // 唱完才开点选（locked 窗）；旧窗让渡新窗
  state.locked = true; state.singing = true;
  const win = q.kind === 'melody' ? SING_TRIO_MS + 300 :          // melody 3×(700+300)+300
              (q.kind === 'higher' || q.kind === 'iv') ? SING_PAIR_MS + 300 :   // 两音 1700+300
              SING_MS + SING_GAP;                                 // find 700+300
  q.sang.forEach((n, j) => sing(n, j * SING_STEP / 1000));        // 依序唱（间隔 700+300=1000ms/音）
  await wait(win);
  if (gen !== voiceGen) return;                  // 新题面已接管（重玩/换关），锁权让渡
  state.singing = false;
  state.locked = false;
  if (!VERIFY && !state.demo && !state.quiet) speakQuiz();     // 唱完再读题面句（不与唱叠）
}
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  renderScene(q);
  renderBoard(q);
  flashSang(q);
  renderStep();
  playQuizVoice(q);                              // 恒跑（verify 也真实走 locked 唱窗；demo 门挡输入）
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

/* ================= 题面重听（听辨类专属，恒在场，不占救援钟语义）：重播题面音
   find=重唱答案音；higher/iv=重唱两音；melody=重唱三音全序；不锁点选；
   唱窗零指认（flashSang 仅 higher 两鸟亮——find/melody 不亮，SPEC-R39 §R1 扩展一） ================= */
function replayQuizAudio() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return false;
  q.sang.forEach((n, j) => sing(n, j * SING_STEP / 1000));
  flashSang(q);
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
/* 教学"帮"阶段指向：当前题答案鸟 */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  pointGhostAt(cardEl(q.answer));
}

/* ================= 点卡主路径（真实点击 / NB.tapBird / autoSolve / 教学演示共用）
   吞输入轻叮必配可见回应（卡排容器 bump 微动效——家族 D）；
   错点 1000ms 防重入窗（b16 定案禁偏离）：窗内 locked 吞点（pop+bump）；
   melody step 窗 700ms（点对中间位唱完再接下一指，SPEC-R39 §R9）；
   ch1（dch1）教学特例：点错=free 唱歌给你听（契约 E——不判对错不计 miss 不进 step）========== */
async function uiTapBird(i, demo) {
  if (!cur || state.won || (state.locked && !demo) || (state.demo && !demo)) {
    sfx('pop');
    replayAnim(boardEl, 'bump');
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q) return false;
  const run = cur;                               /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  const r = engTapBird(cur, i);
  if (r === null) { sfx('pop'); replayAnim(boardEl, 'bump'); return null; }   /* 越界/关末：null+pop+bump */
  const el = cardEl(i);

  if (r === 'free') {                            /* ch1 自由点鸟：唱所点鸟的音（教学特例不罚） */
    sing(q.notes[i], 0);
    if (el) replayAnim(el, 'singing');
    lastAct = Date.now();
    return 'free';
  }

  if (r === 'step') {                            /* melody 点对中间位（SPEC-R39 §R1 维度二）：亮+播该音+进度推进 */
    lastAct = Date.now();                        /* 有效行动刷救援钟（§R4） */
    if (el) { el.classList.add('picked'); replayAnim(el, 'singing'); }
    sing(q.sang[q._prog - 1], 0);                /* 跟唱：播刚点对的音 */
    state.locked = true;
    await wait(700 * SPEED);                     /* step 窗 700ms：唱完该音再接下一指（§R9） */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  if (r === 'wrong') {                           /* 答错：摇头+not_wrong+四型引导句（r39 分流，§R10 键表） */
    state.locked = true;
    if (el) replayAnim(el, 'wig');
    dodgeLo();
    sayW([VOICE.wrong.key, { key: guideKeyOf(q, i), text: guideTextOf(q, i) }]);   /* 链尾引导句键化（家族 J） */
    wrongChainUntil = Date.now() + 7800;         /* 链豁免（家族 I）：r39-bis 链=2832+150+not_g_h2(9字 estMs 3705)+300=6987≤7800；实长 2928 口径 6210（2026-09-22 重合成） */
    await wait(1000 * SPEED);                    /* 错点防重入窗 1000ms；对选可打断链；救援由豁免窗让路 */
    if (cur !== run) return r;
    state.locked = false;
    return r;
  }

  /* ---- right·done（本题完成：鸟跳+清唱该音+确认句 TTS） ---- */
  lastAct = Date.now();                          /* 正确选择重置救援钟（§0.7a） */
  if (state.tut === 'help') {                    /* 教学"独"：首次选对 → 放手 */
    state.tut = 'solo';
    ghost.hide();
    hopRabbit();
  }
  state.locked = true;
  if (el) { el.classList.remove('breathe'); el.classList.add('lit'); }
  if (q.kind === 'iv') { sing(q.sang[0], 0); sing(q.sang[1], SING_STEP / 1000); }   /* iv 答对：重播题面两音（音程回味） */
  else sing(q.ansNote, 0);                       /* 清唱该音（WebAudio 通道与 TTS 互不掐断） */
  await wait(900 * SPEED);                       /* 清唱 700ms 收尾再说确认句（真实页 900 固定） */
  if (cur !== run) return r;
  if (demo) return r;                            /* 教学演示通道（审查 M1）：清唱收尾即回，跳确认句/庆祝窗（tutorialWatch 随即重发同关） */
  KIDS.voice.play(confirmKeyOf(q), confirmText(q));   /* T46 阶段2：确认句整句 clip（not_cf_* 最长实测 2952） */
  await wait(1800 * SPEED);                      /* 鸟跳+卡亮+确认句主窗 */
  if (cur !== run) return r;
  await wait(3300 * SPEED);                      /* 确认句 TTS 收尾窗：900+1800+3300=6000 ≥estMs+300 */
  if (cur !== run) return r;
  state.locked = false;
  if (r === 'done') { winFlow(); return 'done'; }
  renderQuiz();                                  /* 新题（鸟/题面全换）+题面唱窗+读题 */
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关随机章型 GEN[dch-1]（家族 F：
     genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际章型恒一致） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);       /* not_right：听对啦，耳朵真灵（2664ms） */
  if (VERIFY) return;                            // verify 页：引擎判定即止，不弹层不写档
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                             /* 家族 H：celebrate 2620+400=3020 ≥ 2664+300=2964 */
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4]);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = [0, 1, 2, 3, 4].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });   /* 家族 A：winFlow 传 nextHint(null) */
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
  lastWrongVoice = 0; wrongChainUntil = 0;      /* 换关重置错反馈节流锚与链豁免（家族 I/J 配套） */
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, singing: false };
  helpRedemo = false;
  lastAct = Date.now();                          /* 主动读题路径重置 idle 锚（b25 M4） */
  renderQuiz(); renderDots();                    /* renderQuiz 内含题面唱窗+唱后读题 */
  const sv = KIDS._save() || { levels: {} };     // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.notebird && sv.notebird.tutSeen);
  if (VERIFY) return;                            // verify 页：教学链由 runVerify 单元直调
  if (freshTut) { tutorialWatch(); return; }
  state.quiet = false;                           // 非首教关：唱窗后由 playQuizVoice 自动读题
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（notebird：顺序唱演示）
   看 = not_tut_watch 后 8 鸟全亮在场，顺序唱 do→do'（每鸟 700+300 固定窗，逐鸟亮）
   + 主线句「电线左边的声音低，右边的声音高」→ 重建 flat0 题面（题0 恒 find do）
   → ghost 演示听音点对 do 红鸟（__nbDemoR='right'）→ 重发同关说"你来听一试"→帮=指向答案鸟；
   独=首次选对放手。时序（家族 G/H）：watch clip 3096ms → 顺序唱延至 t=900+2700=3600
   （≥3096+300，clip 播完再唱不撞头，m2 裕量 204）；主线句窗 4100 ≥ not_main 2904+300
   （T46 clip 口径）；turn 1752ms → 读题延 2100（≥1752+300 防尾截）================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);       /* not_tut_watch：听！小鸟在唱歌（3096ms） */
  await wait(900 * SPEED);                       /* 天空电线亮相 */
  await wait(2700 * SPEED);                      /* t=3600 ≥ 3096+300+204 裕量（M1/m2）：watch 播完再唱 */
  renderDemoBoard();                             /* 认识小鸟演示板：8 鸟全亮在场 */
  for (let k = 0; k < ORDER.length; k++) {       /* 顺序唱 do→do'（固定窗 SPEED 不折算） */
    const el = boardEl.children[k];
    if (el) replayAnim(el, 'singing');
    sing(ORDER[k], 0, 450);                      /* 教学短唱 450ms（M1：全巡 8 鸟保音阶感，压缩总时长） */
    await wait(550);                             /* 每鸟 450 唱+100 间隔=550ms（原 1000，M1 压缩） */
  }
  KIDS.voice.play('not_main', MAIN_LINE);        /* T46 阶段2：主线句整句 clip（实测 2904） */
  window.__nbMainV = 'not_main';                 /* 主线句走 play 通道实证（verify 钉死，教学链收尾 __lastVoiceKey 会被 turn 覆写） */
  await wait(4100 * SPEED);                      /* ≥not_main 2904+300（T46 clip 口径，estMs 3705 口径退役）：主线句收尾 */
  /* 重建 flat0 正式题面（确定性同关，题0 恒 find do），ghost 演示听音点对 */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: true, tut: 'watch', quiet: true, singing: false };
  renderQuiz(); renderDots();                    /* 题面唱窗起跑（demo 门挡真实输入） */
  await wait(SING_MS + SING_GAP + 300);          /* 题面唱完（固定窗）再演示 */
  const q = cur.quizzes[0];                      // flat0 题0 恒 find do（教学锚点）
  pointGhostAt(cardEl(q.answer));
  await wait(500 * SPEED);                       /* M1：ghost 指向停顿 800→500 */
  ghost.press();
  await wait(320 * SPEED);
  const demoR = await uiTapBird(q.answer, true); /* demo 通道豁免 locked 门（演示吞真实输入） */
  window.__nbDemoR = demoR;                      /* 演示生效证据（§0.27，gate 断言 'right'） */
  const sv = KIDS._save() || {};
  sv.notebird = sv.notebird || {};
  sv.notebird.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  /* 立即重发同关（确定性关卡，题面一致），"你来听一听"在重发后的题面上说（照 batch5-26） */
  ghost.hide();
  cur = genLevel(0);
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true, singing: false };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  state.quiet = false;
  sayR(VOICE.turn.key, VOICE.turn.text);         /* not_tut_turn：你来听一听（1752ms） */
  setTimeout(() => {
    if (state.tut === 'help' && cur && cur.quizzes[cur.step]) speakQuiz();
  }, 2100);                                      /* ≥1752+300 防尾截（turn 后读题延） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
}
/* 认识小鸟演示板：8 鸟全亮在场（按音序左低右高，站台递增） */
function renderDemoBoard() {
  boardEl.innerHTML = '';
  ORDER.forEach((n, i) => {
    const b = document.createElement('button');
    b.className = 'bird-card pop';
    b.dataset.note = n;
    b.style.animationDelay = (i * 60) + 'ms';
    b.innerHTML = birdCardInner(n, i, false);
    boardEl.appendChild(b);
  });
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
  sayR(VOICE.hint.key, VOICE.hint.text);         /* 戳兔子=方向提示：再听一遍它的声音 */
  replayQuizAudio();                             /* 提示句配真实重播题面音（听辨款方向提示） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) return;   /* §0.20 教学/演出/通关期重玩门 */
  lastAct = Date.now();
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {   /* 再听一遍：题面重听（听辨类专属恒在场） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked) return;
  lastAct = Date.now();                          /* 主动交互重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  replayQuizAudio();                             /* 重播题面音（不占救援钟语义） */
});
sceneEl.addEventListener('pointerdown', e => {   /* 点题面=重听题面音（儿童高发探索动作） */
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo) return;
  lastAct = Date.now();                          /* 主动读题重置 idle 锚（b25 M4） */
  replayAnim(sceneEl, 'bounce');
  replayQuizAudio();
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.bird-card');
  if (!p) return;                                // 卡间空白走 stage 空白路径
  e.preventDefault();
  uiTapBird(Number(p.dataset.i));
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.bird-card') || e.target.closest('#scene')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }   /* 教学/演出期空白轻叮（§0.22） */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    sayR(VOICE.hint.key, VOICE.hint.text);       /* 空白探索=方向提示 */
  }
});

/* ================= 无操作看护（具名函数——verify 源码断言家族 B/I 挂点）：
   14s 方向级（重播题面音+题面 pulse，lastDir 独立节流锚，不重置 lastAct——30s 答案级
   不被饿死）/ 30s 答案级（正确鸟 breathe+重播）/ 教学"帮"5s 重演示；
   错反馈链豁免窗守卫：链播完前救援不掐断（家族 I，只挡救援读题，不挡主动点选） */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (Date.now() < wrongChainUntil) return;      /* 链豁免窗（家族 I）：救援 interval 让路 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却周期重播读题/鸟音） */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                            /* 答案级：静音也能看见答案线索 */
    const q = cur.quizzes[cur.step];
    if (q) {
      const ok = cardEl(q.answer);
      if (ok) replayAnim(ok, 'breathe');
      replayQuizAudio();
    }
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播题面音+题面 pulse（不动 lastAct） */
    replayQuizAudio();
    replayAnim(sceneEl, 'pulse');
    lastDir = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointHelpNext();
  }
}
setInterval(rescueTick, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'notebird', title: '音阶小鸟' });   // 存档键 kidsgame_notebird（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = 0;
  }
  startLevel(first);
}
/* AudioContext 手势解锁链（与 core audio.unlock 同一手势；首次手势创建+resume+flush 待播） */
document.addEventListener('pointerdown', () => NB_AUDIO.unlockFlush(), false);

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口） ================= */
window.NB = {
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
    return { kind: q.kind,                            /* SPEC-R39 钩子契约：'find'|'higher'|'melody'|'iv' */
             notes: q.notes.slice(),                  /* 场上卡（find/higher/melody=4 音名乱序/ch1 升序；iv=3 类目） */
             answer: q.answer,                        /* 答案卡下标（melody=当前进度位，动态） */
             sang: q.sang.slice(),                    /* 题面已唱音名序列 */
             step: cur.step,
             prog: q.kind === 'melody' ? q._prog : undefined,   /* melody 进度（0-3，只增字段） */
             miss: q._miss || 0 };
  },
  tapBird(i) { return uiTapBird(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（逐题点答案卡，走真实判定链）
    let taps = 0, guard = 0;
    while (cur && !cur.done && guard++ < 100) {
      const q = cur.quizzes[cur.step];
      if (!q) break;
      let wguard = 0;
      while (state.singing && wguard++ < 90) await wait(50);   /* 题面唱窗内等待（合成音窗不折算） */
      if (q.kind === 'melody') {                 /* melody：按进度逐位点（3 位点完 _answered，SPEC-R39 §R1 维度二） */
        let mguard = 0;
        while (!q._answered && mguard++ < 8) {
          const r = await uiTapBird(q.notes.indexOf(q.sang[q._prog]));
          if (r === false || r === null) break;  // 锁死/重玩保护
          taps++;
        }
        continue;
      }
      const r = await uiTapBird(q.answer);
      if (r === false || r === null) break;      // 锁死/重玩保护
      taps++;
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  replay() { return replayQuizAudio(); },        /* 重听题面音（与 🔊 按钮同路径） */
  get tutorial() { return state.tut; }
};
