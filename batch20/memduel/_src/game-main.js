/* ================= memduel 主逻辑（UI / 教学 / 救援 / 写档 / 验收钩子）
   r17 难度改造（§1-r17-memduel）：五型 df/dr/lf/cf/dx；dx 延迟干扰窗（gap 相位 3.8s
   点小兔子）+ 方向遮盖后公布（md_dir_* 语音+文字双通道）；救援钟锚=recall 起点。
   调用家族 KIDS.* API（core.js）：voice.play/queue/say、audio.sfx/note、
   assets.rabbit、ui.celebrate/chapterEnd/dayEnd、level.pass/stars、calendar、store。
   三相位（§1-r17）：startLevel → runShow（展示期：逐卡翻亮+值词 TTS，phase='show'
   引擎锁定）→ engCover（遮盖；delay 型 → 'gap' 延迟干扰窗 → engGapDone → 'recall'）
   → 点池卡按序拼（正背=原序/倒背=逆序）→ 拼满自动判定。
   验收钩子：window.MD = { get currentLevel, get quiz, tapNum(i), tapSlot(j),
   start(flat), async autoSolve(), get tutorial, get rescues }——getter 拷贝非活引用。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };

const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
let lastWrongVoice = 0;
const sayW = (key, text, force) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }   // 前三关每错必播（§0.5）
  const now = Date.now();
  if (force || now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};
/* T46 阶段2（2026-09-19）：值词 clip 化（md_v_d1-9 数字/md_v_lA-M 字母/md_v_c<色> 颜色，32 条）
   ——原 say() 豁免通道清零；单段链在册 queue，缺段 TTS 兜底（防御性死分支） */
const valKey = v => {
  const s = String(v);
  if (/^[1-9]$/.test(s)) return 'md_v_d' + s;
  if (/^[A-M]$/.test(s)) return 'md_v_l' + s;
  return 'md_v_c' + s;
};
const sayVal = v => {
  const k = valKey(v);
  if (KIDS.voice.clips[k]) KIDS.voice.queue([k]); else KIDS.voice.say(String(v));
};
/* 提示键按背诵方向分流（r17：顺背'从第一位开始想'对倒背误导 → md_hint_rev） */
const hintVoiceOf = q => (q && q.mode === 'rev') ? VOICE.hintRev : VOICE.hint;

const stageEl = $id('stage'), tipEl = $id('tip'), tipIcoEl = $id('tip-ico'), tipTextEl = $id('tip-text'),
  memoAreaEl = $id('memo-area'), bdCheckEl = $id('bd-check'), cardPoolEl = $id('card-pool'),
  rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), ghostEl = $id('ghost');

/* r17 存档启动 IIFE（键基迁移，赶在 KIDS.init 读档前）：
   ①v1 键基迁移——v1 keyOf 分母=CH_LEN=5，旧档 '2-0'=旧 flat5 直映新基（分母 10）跳关
     且章语义错乱：矛盾态 lv[c+'-0'] 在而 lv[(c-1)+'-5'] 缺（c=2..4）=v1 基档一次性
     重置（timecalc r16 同款）；
   ②脏键守卫——仅判格式非法与关号越界（<0 或 >9）；章号上界放开：生成关章号 ≥5 合法
     无界（keyOf 分母 LEVELS_PER_CH=10，flat≥40 写 '5-0'+——禁整档 removeItem 吞掉
     生成关进度，r16 fatal 教训）。 */
try {
  const raw = localStorage.getItem('kidsgame_memduel');
  if (raw) {
    const lv = (JSON.parse(raw) || {}).levels || {};
    let reset = false;
    for (let c = 2; c <= 4; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { reset = true; break; }
    }
    if (!reset) {
      for (const k of Object.keys(lv)) {
        const m = /^(\d+)-(\d+)$/.exec(k);
        if (!m || +m[1] < 1 || +m[2] < 0 || +m[2] > 9) { reset = true; break; }
      }
    }
    if (reset) localStorage.removeItem('kidsgame_memduel');
  }
} catch (e) { /* 守卫失败不阻断启动 */ }

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showP: null, dirSaidAt: 0 };
let lastAct = Date.now();
let lastBlankHint = 0;                          // 空白点击轻提示节流（§0.16，10s）
let rescueExemptUntil = 0;                      // 错链豁免窗终点（契约 I：错链实长+300ms，仅链起播设）
let helpTimer = null, helpRedemo = false;
let rescueCount = 0;                            // 救援触发计数（MD.rescues）

const keyOf = i => (Math.floor(i / LEVELS_PER_CH) + 1) + '-' + (i % LEVELS_PER_CH);   // 每章 10 关（r17 分母 10；v1 分母=CH_LEN=5→启动 IIFE 迁移）
const CH_LVS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];          // 本章全部关号（level.pass 用）
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cardEl = i => cardPoolEl.querySelector('.card[data-i="' + i + '"]');
const memoEl = j => memoAreaEl.querySelector('.mcard[data-j="' + j + '"]');
/* 卡面（按素材）：数字/字母=大字；颜色=色块（COLOR_HEX 直染，无文字——视觉记忆通道） */
const faceHTML = (v, mat, big) => mat === 'col'
  ? '<span class="sw' + (big ? ' sw-m' : '') + '" style="background:' + COLOR_HEX[v] + '"></span>'
  : '<span class="q">' + v + '</span>';

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  tipIcoEl.innerHTML = ICONS.lens;
  bdCheckEl.innerHTML = ICONS.check;
}
/* 音效（Web Audio 合成）：填卡=双音上扬 / 退回=低柔单音（轻反馈不惩罚） */
const cardHi = () => { if (!VERIFY) { KIDS.audio.note(760, 0.09, 0, 0.5); KIDS.audio.note(950, 0.12, 0.07, 0.4); } };
const takeLo = () => { if (!VERIFY) KIDS.audio.note(520, 0.09, 0, 0.3); };

/* ================= 渲染 ================= */
/* 记忆卡排+池：每题 len 张记忆卡（初始背面 ?）+ opts 候选卡（数字/字母/颜色三素材） */
function renderQuiz() {
  const q = cur.quizzes[cur.step];
  if (!q) return;
  clearRescueVisual();
  memoAreaEl.className = 'showing';               // 展示期（视觉锁定态，runShow 驱动）
  memoAreaEl.querySelectorAll('.mcard').forEach(e => e.remove());
  for (let j = 0; j < q.seq.length; j++) {
    const b = document.createElement('button');
    b.className = 'mcard';
    b.dataset.j = j;
    b.setAttribute('aria-label', '第' + (j + 1) + '个' + MAT_WORD[q.mat] + '位');
    b.innerHTML = '<span class="q">?</span>';
    memoAreaEl.appendChild(b);
  }
  cardPoolEl.innerHTML = '';
  cardPoolEl.classList.add('locked');             // 展示/延迟期池锁定（视觉同步 §0.44/§1-r17）
  q.opts.forEach((o, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    b.dataset.i = i;
    b.setAttribute('aria-label', MAT_WORD[q.mat] + '卡 ' + o.v);
    b.innerHTML = faceHTML(o.v, q.mat, false);
    cardPoolEl.appendChild(b);
  });
  /* 展示文案（§0.18 同源）：素材词+方向预告——dx 方向遮盖后公布，展示期不预告（r17 负荷点） */
  tipTextEl.textContent = TIP_SHOW[q.mat] + (q.kind === 'dx' ? '' : TIP_DIR[q.mode]);
  renderStep();
  state.showP = runShow(q);                       // 展示期动画（async；教学/autoSolve await 它）
}
/* 卡位态同步（填入/退回/清空共用；展示态由 runShow 直接驱动不动这里） */
function updateSlots(q) {
  q._built.forEach((bi, j) => {
    const el = memoEl(j);
    if (!el) return;
    if (bi == null) {
      el.className = 'mcard';
      el.innerHTML = '<span class="q">?</span>';
    } else {
      el.className = 'mcard filled';
      el.innerHTML = faceHTML(q.opts[bi].v, q.mat, true);
    }
  });
}
function renderStep() {                           // HUD 本关 8 题进度点
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let k = 0; k < CH_LEN; k++) {
    const i = document.createElement('i');
    i.className = k < cur.step ? 'done' : (k === cur.step && !cur.done ? 'cur' : '');
    tray.appendChild(i);
  }
}
function renderDots() {                           // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };      // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = CH_LVS.every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 开场顺序链（§0.5/§0.6）：hint（或教学交接 turn）单段 queue 单通道；键按首题方向分流 */
function openingSpeak(turn) {
  const q = cur && cur.quizzes[0];
  KIDS.voice.queue([turn ? VOICE.turn.key : hintVoiceOf(q).key]);
}

/* ================= 展示期动画（§1-r17：逐卡翻亮+值词 TTS → 遮盖[→延迟干扰]→作答）
   节奏=每卡 680ms + 末尾停留 620ms（与 showMs 同量纲）；身份守卫防重玩竞态；
   遮盖=engCover 唯一出口 + 整排翻回背面；delay 型入 gap 相位：兔子 gapcall 呼唤+
   md_gap 提示，窗长 gapMs 恒定（点兔=hop 不缩短——负荷恒定）；engGapDone 唯一
   gap→recall 入口；recall 起点：池解锁+tip 切作答文案+dx 方向指令（语音+文字双通道）
   +救援钟锚重置（§1-r17：展示/延迟期非卡壳） ---------- */
async function runShow(q) {
  const run = cur;
  await wait(300 * SPEED);
  for (let k = 0; k < q.seq.length; k++) {
    if (cur !== run || q.solved) return;
    const el = memoEl(k);
    if (el) {
      el.classList.add('show');
      el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
      el.innerHTML = faceHTML(q.seq[k], q.mat, true);
    }
    sayVal(q.seq[k]);                             // 值词=TTS 兜底（语音同步读，§2）
    await wait(680 * SPEED);
  }
  await wait(620 * SPEED);                        // 全串停留
  if (cur !== run || q.solved) return;
  engCover(cur);                                  // §0.44 唯一转移入口（delay 型→gap）
  memoAreaEl.className = '';                      // 解除展示态
  memoAreaEl.querySelectorAll('.mcard').forEach((el, k) => {
    el.classList.remove('show');
    el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
    el.innerHTML = '<span class="q">?</span>';
  });
  if (q.delay) {                                  /* 延迟干扰窗（§1-r17 dx）：3.8s 点小兔子 */
    tipTextEl.textContent = TIP_GAP;
    rabbitBtn.classList.add('gapcall');
    KIDS.voice.play(VOICE.gap.key, VOICE.gap.text);
    const gapEnd = Date.now() + q.gapMs * SPEED;
    while (Date.now() < gapEnd) {
      if (cur !== run || q.solved) return;
      await wait(60 * SPEED);
    }
    if (cur !== run || q.solved) return;
    engGapDone(cur);                              // gap→recall 唯一入口
    rabbitBtn.classList.remove('gapcall');
  }
  cardPoolEl.classList.remove('locked');          // 池解锁（作答期）
  tipTextEl.textContent = TIP_ANSWER[q.mode];     // 作答文案（按背诵方向——文字通道）
  if (q.kind === 'dx') {                          /* 方向指令（语音通道；遮盖后才公布 r17） */
    const d = q.mode === 'rev' ? VOICE.dirRev : VOICE.dirFwd;
    KIDS.voice.play(d.key, d.text);
    state.dirSaidAt = Date.now();
  }
  lastAct = Date.now();                           // 救援钟锚=作答期起点（§1-r17）
  state.quiet = false;
}

/* ================= 视觉反馈小件 ================= */
function replayAnim(el, cls) {
  if (!el) return;
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
}
const wigRow = () => replayAnim(memoAreaEl, 'wig');
const okRow = () => {
  replayAnim(memoAreaEl, 'okrow');
  memoAreaEl.classList.add('ok');
  memoAreaEl.querySelectorAll('.mcard').forEach((e, k) => {
    setTimeout(() => replayAnim(e, 'wave'), k * 60 * SPEED);
  });
};
function clearRescueVisual() {
  memoAreaEl.classList.remove('ok');
  memoAreaEl.querySelectorAll('.breathe').forEach(k => k.classList.remove('breathe'));
  cardPoolEl.querySelectorAll('.breathe,.pulse').forEach(k => k.classList.remove('breathe', 'pulse'));
}
/* 方向级线索（梯度脚手架 错1次/救援恒给，§2）：首个空卡位 breathe（「从这一位开始」） */
function applyDirVisual(q) {
  const t = dirTarget(q);
  if (!t) return;
  const el = memoEl(t.j);
  if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
}
/* 答案级视觉（miss≥2，§2）：下一张应点卡 breathe（不提前） */
function applyAnswerVisual(q) {
  const t = rescueTarget(q);
  if (!t) return;
  const el = cardEl(t.i);
  if (el) { el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe'); }
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
  clearRescueVisual();                            /* 指新目标前清旧视觉（numberdet P1-3 教训） */
  ghost.toEl(el);
  ghost.show();
  el.classList.remove('breathe'); void el.offsetWidth; el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800);
}
/* 教学"帮"阶段指向（rescueTarget 同源）：下一张应点卡（教逐位拼） */
function pointHelpNext() {
  const q = cur && cur.quizzes[cur.step];
  if (!q) return;
  const t = rescueTarget(q);
  if (t) pointGhostAt(cardEl(t.i));
}
function scheduleHelpGhost(delay) {
  clearTimeout(helpTimer);
  helpTimer = setTimeout(async () => {
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    const q = cur && cur.quizzes[cur.step];
    /* r17 串长展示窗 ~5s：定时落在展示期时等 showP 到 recall 再指卡（教学"帮"起步
       不空窗——rescueTarget 仅 recall 态有目标，直接指会落空） */
    if (q && q.phase !== 'recall' && state.showP) { try { await state.showP; } catch (e) {} }
    if (state.tut !== 'help' || state.won || state.locked || VERIFY) return;
    pointHelpNext();
  }, delay == null ? 700 : delay);
}

/* ================= 点卡主路径（真实点击 / MD 钩子 / autoSolve / 教学演示共用）
   uiTapNum(i, demo)：点候选卡 i → 填入第一个空卡位 + 值词 TTS 朗读（豁免通道；
   dx 方向指令起播 2s 内不读值——防掐断指令）；拼满自动判定——对=md_right+推进；
   错=晃动+sayW+1000ms 防重入窗后错位清空对位保留（卡回池零惩罚可重选）。
   展示/延迟期（phase!=='recall'）引擎拒绝（§0.44 返 false 不吞题），UI 轻叮提示。
   失败防重入窗 1000ms（§0.26 b16 定案禁偏离）；身份守卫 const run=cur ================= */
async function uiTapNum(i, demo) {
  if (!cur || state.won) return false;
  if ((state.locked && !demo) || (state.demo && !demo)) {
    if (!demo) { sfx('pop'); const el = cardEl(i); if (el) replayAnim(el, 'pulse'); }  /* §0.22 吞输入轻叮 */
    return false;
  }
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof i !== 'number' || Math.floor(i) !== i || i < 0 || i >= q.opts.length) return false;
  if (q.phase !== 'recall') {                     /* 展示/延迟期锁定：拒绝且不吞题（§0.44/§1-r17） */
    sfx('pop');
    return false;
  }
  const j = engTapNum(cur, i);
  if (j === null) {                               /* 已用卡/已满 */
    sfx('pop');
    return false;
  }
  cardHi();
  const el = cardEl(i);
  if (el) el.classList.add('gone');
  updateSlots(q);
  if (!(q.kind === 'dx' && Date.now() - state.dirSaidAt < 2000)) sayVal(q.opts[i].v);
  if (state.tut === 'help') scheduleHelpGhost(350);
  const plan = engJudge(cur);
  if (!plan) return 'placed';
  const run = cur;                                // 身份守卫：演出窗口内重玩会重建 cur
  const res = engCommitJudge(cur, plan);
  if (plan.win) {                                 // 拼对：反馈+推进（答对重置救援钟 §0.7a）
    lastAct = Date.now();
    if (state.tut === 'help') {                   // 教学"独"：首次答对放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    clearRescueVisual();
    okRow();
    sfx('ok');
    sayR(VOICE.right.key, VOICE.right.text);
    state.locked = true;
    await wait(2100 * SPEED);                     /* 等 md_right（≈1.8s）主体播完 */
    if (cur !== run) return res;
    state.locked = false;
    if (res === 'done') winFlow();
    else renderQuiz();
    return res;
  }
  /* 错：晃动+sayW+梯度脚手架（错 1 次仅方向级首空位 breathe / miss≥2 答案级应点卡
     breathe）；1000ms 防重入窗后错位清空对位保留（卡回池零惩罚可重选）；
     错链豁免窗=链实长+300ms 仅链起播设（契约 I——救援钟在此窗内不点火） */
  sfx('fail');
  rescueExemptUntil = Date.now() + 1000 * SPEED + 300;
  sayW(VOICE.wrong.key, VOICE.wrong.text, q.miss === 2);
  wigRow();
  if (q.miss === 1) applyDirVisual(q);            /* 错 1 次闪方向级线索（b18 梯度定案） */
  else applyAnswerVisual(q);                      /* miss≥2 才出答案级（不提前） */
  if (state.tut === 'help') scheduleHelpGhost(400);
  state.locked = true;
  await wait(1000 * SPEED);                       /* 错点防重入窗 1000ms（b16 定案） */
  if (cur !== run) return res;
  for (let k = q._built.length - 1; k >= 0; k--) {
    if (q._built[k] == null) continue;
    if (q.opts[q._built[k]].v === q.answer[k]) continue;   /* 试玩 P1：评对的位保留（built=卡 idx，
                                                              按值对位——idx 与 answer 值比较恒不等
                                                              =全清，b19 复验实锤） */
    engTapSlot(cur, k);                           /* 错位清空：卡回池可重选（零惩罚） */
  }
  updateSlots(q);
  cardPoolEl.querySelectorAll('.card').forEach((el, i2) => {
    el.classList.toggle('gone', !!q._used[i2]);
  });
  /* 试玩 P1-1：判错必然发生在拼满瞬间（无空卡位），错时的 applyDir/AnswerVisual 因目标无空位而
     落空——清空后（此刻起）补一次，miss=1 方向级/miss≥2 答案级才真正出现在孩子眼前 */
  if (q.miss === 1) applyDirVisual(q);
  else applyAnswerVisual(q);
  state.locked = false;
  return res;
}

/* ================= 点已拼卡位=退回该卡（改答零惩罚，§0.7a 不重置救援钟） ================= */
function uiTapSlot(j) {
  if (!cur || state.locked || state.won || state.demo) return false;
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return false;
  if (typeof j !== 'number' || Math.floor(j) !== j || j < 0 || j >= q._built.length) return false;
  if (q.phase !== 'recall') { sfx('pop'); return false; }   /* 展示/延迟期锁定（§0.44） */
  const r = engTapSlot(cur, j);
  if (r === null) { sfx('pop'); return false; }   // 空位=轻叮不静默
  takeLo();
  updateSlots(q);
  cardPoolEl.querySelectorAll('.card').forEach((el2, i2) => {
    el2.classList.toggle('gone', !!q._used[i2]);
  });
  if (state.tut === 'help') scheduleHelpGhost(350);
  return r;
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / LEVELS_PER_CH);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关预告实算下一关难度章（家族 F——禁取模推进形态） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  clearTimeout(helpTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                             // verify 页：引擎判定即止，不弹层不写档（§0.2）
  KIDS.ui.celebrate(stars).then(() => {
    const pr = KIDS.level.pass(cur.ch, cur.lv, stars, CH_LVS);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars5 = CH_LVS.reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars5, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() {                              // 今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur ? cur.flat : 0);                 // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  clearTimeout(helpTimer);
  ghost.hide();
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none', quiet: true, showP: null, dirSaidAt: 0 };
  helpRedemo = false;
  lastAct = Date.now();                           // 救援钟锚重置（§1-r17：startLevel 亦重置）
  rescueExemptUntil = 0;
  renderQuiz(); renderDots();
  const sv = KIDS._save() || { levels: {} };      // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] && !(sv.md && sv.md.tutSeen);
  if (VERIFY) { openingSpeak(); return; }         // verify 页恒走开场链（stub 记录供断言）
  if (freshTut) { tutorialWatch(); return; }
  openingSpeak();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独（save.md.tutSeen）
   看=演示看串（整排呼吸+逐卡翻亮读值，runShow 驱动）→遮盖→逐位拼（前 2 张完整
   手指演示，其余快放控时长）→拼满判对（demo 通道，返回值存 window.__mdDemoR
   §0.27）→立即重发同关（确定性关卡，题面一致），"你来背一背"交接 →帮=指向
   下一张该点的卡；独=首次答对放手。watch ≤16s（§0.24） ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayR(VOICE.watch.key, VOICE.watch.text);        /* 教学开场 sayR 不受 flat 门（§0.6） */
  await wait(700 * SPEED);
  const q = cur.quizzes[0];
  replayAnim(memoAreaEl, 'okrow');                /* 看串：整排轻跳聚焦注意力 */
  await state.showP;                              /* 等展示期动画+遮盖（+延迟窗）完成（相位到 recall） */
  await wait(400 * SPEED);
  let demoR = null;
  for (let k = 0; k < q.answer.length; k++) {
    const i = freeOptFor(q, q.answer[k]);
    if (i < 0) break;
    if (k < 2) {                                  // 前 2 张：手指移动+按压+入位（点选语义看清）
      pointGhostAt(cardEl(i));
      await wait(720 * SPEED);
      ghost.press();
      await wait(260 * SPEED);
      demoR = await uiTapNum(i, true);
      await wait(430 * SPEED);
    } else {                                      // 其余：手指原地快放（时长控制 ≤16s）
      ghost.press();
      await wait(150 * SPEED);
      demoR = await uiTapNum(i, true);
      await wait(240 * SPEED);
    }
  }
  window.__mdDemoR = demoR;                       /* 演示生效证据（§0.27，verify 断言 'right'） */
  const sv = KIDS._save();                        // 真实页 save 恒非 null；verify 直驱时跳过写档
  if (sv) {
    sv.md = sv.md || {};
    sv.md.tutSeen = true;
    KIDS.store.persist();
  }
  tutorialHandoff();
}
/* 教学"帮"交接（独立成函数：verify 教学链断言直调）：重发同关 + 顺序链 + 幽灵手指 */
function tutorialHandoff() {
  ghost.hide();
  cur = genLevel(0);                              // 确定性关卡：同一关重来（题面一致）
  state = { locked: false, won: false, demo: false, tut: 'help', quiet: true, showP: null, dirSaidAt: 0 };
  helpRedemo = false;
  lastAct = Date.now();
  renderQuiz(); renderDots();
  openingSpeak(true);                             // 交接顺序链：md_tut_turn（§0.6 单通道）
  scheduleHelpGhost(1100);
}

/* ================= 底栏与舞台交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  const q = cur.quizzes[cur.step];
  if (q && !q.solved && q.phase === 'gap') {      /* 延迟干扰窗：点兔=hop+轻叮（任务本体，不语音不缩短窗） */
    hopRabbit();
    sfx('pop');
    return;
  }
  hopRabbit();                                    /* 探索点击不重置救援钟（§0.7a） */
  if (state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 pop+hop 不静默 */
  const hv = hintVoiceOf(q);
  sayP(hv.key, hv.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || state.locked || state.demo || state.won) { sfx('pop'); return; }  /* §0.20+§0.22 吞输入轻叮 */
  startLevel(cur.flat);
});
tipEl.addEventListener('pointerdown', e => {      // 点提示条=重听玩法句（主动学习重置）
  e.preventDefault();
  if (VERIFY) return;
  if (!cur || state.locked || state.demo || state.won) { sfx('pop'); return; }   /* §0.16 吞输入期轻叮 */
  lastAct = Date.now();
  replayAnim(tipEl, 'flash');
  const hv = hintVoiceOf(cur.quizzes[cur.step]);
  sayP(hv.key, hv.text);
});
stageEl.addEventListener('pointerdown', e => {
  const c = e.target.closest('.card');
  if (c) {                                        // 候选卡：拼答主路径
    e.preventDefault();
    if ((state.locked || state.demo) && !state.won) sfx('pop');   /* §0.22 吞输入期轻叮 */
    uiTapNum(Number(c.dataset.i));
    return;
  }
  const m = e.target.closest('.mcard');
  if (m) {                                        // 已拼卡位：退回该卡（空位=轻叮不静默）
    e.preventDefault();
    uiTapSlot(Number(m.dataset.j));
    return;
  }
  if (e.target.closest('button, #tip, #memo-area')) return;   /* §0.16：底栏按钮/题面条/memo 底板显式排除 */
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.locked || state.won || state.demo) { sfx('pop'); return; }
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    const hv = hintVoiceOf(cur.quizzes[cur.step]);
    sayR(hv.key, hv.text);
  }
});

/* ================= 无操作看护：14s 救援（§0.21/§2：hint 语音（按方向分流）+首空位
   breathe 方向级恒给 +miss≥2 加下一张应点卡 breathe）/ 教学"帮"5s 重演示一次。
   救援钟只被答对推进/点提示条等主动学习重置（§0.7a：作答/错答/空白/兔子不重置）；
   锚=recall 起点（runShow 末尾重置）+startLevel 重置；错链豁免窗内不点火（契约 I） ================= */
function rescueAct(q) {
  rescueCount++;
  const hv = hintVoiceOf(q);
  sayR(hv.key, hv.text);
  clearRescueVisual();
  applyDirVisual(q);                              /* 首空位 breathe（§2 救援口径·方向级恒给） */
  if (q.miss >= 2) applyAnswerVisual(q);          /* 应点卡 breathe=答案级：miss≥2 才出（b18 梯度定案） */
}
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;   /* 契约 K 面板守卫 */
  const q = cur.quizzes[cur.step];
  if (!q || q.solved) return;                     /* 过题过渡窗不救援 */
  if (q.phase !== 'recall') return;               /* 展示/延迟期不救援（动画/干扰任务驱动，非卡壳） */
  if (Date.now() < rescueExemptUntil) return;     /* 错链豁免窗（契约 I） */
  const idle = Date.now() - lastAct;
  if (idle > 14000) {
    rescueAct(q);
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
  KIDS.init({ game: 'memduel', title: '记忆双背' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {   // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1)  /* 已完成到 lim-1，预告其下一章（§0.4 防跳章） */ });
    first = Math.max(0, lim - 1);                 /* 收尾后停留今日最后一关（家族 b14 修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.MD = {
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, n: cur.quizzes.length,
      step: cur.step, retries: cur.retries, done: cur.done, won: state.won, locked: state.locked };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = cur.quizzes[cur.step];
    if (!q) return null;
    return {                                      /* SPEC §1-r17 契约字段 + 测试辅助字段（全拷贝） */
      kind: q.kind, mat: q.mat, dch: cur.dch,
      seq: q.seq.slice(), mode: q.mode, delay: q.delay, answer: q.answer.slice(),
      opts: q.opts.map(o => ({ v: o.v })),
      built: q._built.slice(),
      phase: q.phase, showMs: q.showMs, gapMs: q.gapMs,
      step: cur.step, miss: q.miss, solved: q.solved
    };
  },
  tapNum(i) { return uiTapNum(i); },
  tapSlot(j) { return uiTapSlot(j); },
  start(flat) {                                   /* 测试钩子：跳关（教学演示期拒防打断） */
    if (!cur || state.demo) return false;
    startLevel(flat | 0);
    return true;
  },
  async autoSolve() {                             /* UI 路径自动通关：每题等遮盖[+延迟窗]→清空→按答案逐位填卡 */
    const run = cur;                              // 身份守卫：winFlow 延迟 proceed 换关即中止
    let n = 0, quizzes = 0, ok = true;
    while (cur && cur === run && !cur.done && n++ < 80) {
      const q = cur.quizzes[cur.step];
      if (!q || q.solved) break;
      let g = 0;
      while (q.phase !== 'recall' && g++ < 900) await wait(20);   // 等展示期动画[+延迟干扰窗]完成
      if (q.phase !== 'recall') { ok = false; break; }
      for (let k = q._built.length - 1; k >= 0; k--) {
        if (q._built[k] != null && uiTapSlot(k) === false) { ok = false; break; }
      }
      if (!ok) break;
      let r = null;
      for (let m = 0; m < q.answer.length; m++) {
        const i = freeOptFor(q, q.answer[m]);
        r = await uiTapNum(i);
        if (r === false || r === 'wrong') { ok = false; break; }
      }
      quizzes++;
      if (!ok) break;
      if (r !== 'right' && r !== 'done') { ok = false; break; }
    }
    return { done: !!(cur && cur.done && cur === run), quizzes: quizzes, ok: ok };
  },
  get tutorial() { return state.tut; },
  get rescues() { return rescueCount; }
};
