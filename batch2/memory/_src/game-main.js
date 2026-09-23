/* ================= memory 主逻辑 r19（场景/渲染/判定接线/peek 流/教学/救援/推进）
   老结构重建（SPEC-R19-MEMORY）：相似化干扰 + 补数配对 + 先看后翻。
   会话：flat 关卡序列（CH_LEN=6，生成关 flat≥24）+ celebrate/章末/日末/rest/家长面板走 core。
   家族契约落地：A 双 nextHint(lim-1) / B 救援双锚 lastDir(14s)+lastAct(30s) / D 吞输入 bump /
   E 教学特例先查 sv.mem.tutSeen / F 生成关 GEN_HINTS[genLevel(f+1).dch-1] 实算 /
   I 错链豁免窗（estMs 链句实长+300；startLevel 重置；救援让路）/
   J 语义句 10s 节流 / K rescueTick 命名+面板守卫 / N queue 链全 clip 无 keyless 段（天然合规）。
   验收钩子 window.MEM = { start(flat), flip(i), miss(), autoSolve(exec), currentLevel, cards, tutorial, state }。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const POKE = /[?&]poke=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const sfx = n => { if (!VERIFY && !POKE) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* estMs 定版在 game-data（四方同步之一；main 不重复声明直接使用） */
/* 错反馈链豁免窗（契约 I）：链句实长 + 300。
   same 档链句 mem_missmore『没关系，再想一想』8 字 → estMs 3360 + 300 = 3660；
   sum10 档链句 mem_sum10『找一找，两张合起来是十』11 字 → estMs 4395 + 300 = 4695。
   （两键为主线登记新 clip，落地前 voice.play(key,text) 走 TTS，窗按 estMs 实算——SPEC §6） */
const SAME_CHAIN_WIN = estMs(VOICE.missmore.text) + 300;
const SUM10_CHAIN_WIN = estMs(VOICE.sum10.text) + 300;
const chainWin = () => (cur && cur.mode === 'sum10') ? SUM10_CHAIN_WIN : SAME_CHAIN_WIN;
const MISS_CHAIN_STEP = 3;                     // 连续失误每 +3 触发错链（3,6,9…）
const JUDGE_T_MATCH = 420, JUDGE_T_MISS = 900; // 配对收走 / 失误看清停顿（老款沿用）
let lastWrongVoice = 0;                        /* 纠错链节流锚（契约 J）：flat<3 必播；≥3 走 10s 节流 */
let lastTwinVoice = 0;                         /* 近形干扰句 mem_twin 独立 10s 节流锚 */
let wrongChainUntil = 0;                       /* 错链豁免窗终点（救援 interval 让路，契约 I） */
let goalSaid = false;                          /* 会话级目标句锚：每次打开游戏首关至少播一次（回归玩家 flat≥3 不再静默——试玩 P2-1） */
const sayW = () => {
  if (!cur) return false;
  const v = cur.mode === 'sum10' ? VOICE.sum10 : VOICE.missmore;
  if (cur.flat < 3) { KIDS.voice.play(v.key, v.text); return true; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(v.key, v.text); return true; }
  return false;                                /* 节流未播返回 false——豁免窗仅链起播时设（契约 I「起播设」） */
};

/* ================= r19 存档迁移 IIFE（CH_LEN 5→6 键基迁移，r16/r18 范式，SPEC §7）
   ①v1 键基检测——v1 keyOf 分母=CH_LEN=5，v1 完整档打到 ch c 的 lv0 必有 'c-0' 而新基前置键
     '(c-1)-5' v1 从不写：'c-0' 在而 '(c-1)-5' 缺（c=2..4）= v1 基档一次性重置；
   ②脏键守卫——仅判格式非法与关号越界（<0 或 >5）；章号上界放开：生成关章号 ≥5 合法无界
     （keyOf 分母 CH_LEN=6，flat≥24 写 '5-0'+——禁整档 removeItem 吞掉生成关进度）；
   ③教学标记无需转译——v1 即 sv.mem.tutSeen（子键同形沿用）。
   执行点先于 KIDS.init 读档。 */
try {
  const raw = localStorage.getItem('kidsgame_memory');
  if (raw) {
    const sv = JSON.parse(raw) || {};
    const lv = sv.levels || {};
    let reset = false;
    for (let c = 2; c <= 4; c++) {
      if (lv[c + '-0'] !== undefined && lv[(c - 1) + '-5'] === undefined) { reset = true; break; }
    }
    if (!reset) {
      for (const k of Object.keys(lv)) {
        const m = /^(\d+)-(\d+)$/.exec(k);
        if (!m || +m[1] < 1 || +m[2] < 0 || +m[2] > CH_LEN - 1) { reset = true; break; }
      }
    }
    if (reset) localStorage.removeItem('kidsgame_memory');
  }
} catch (e) { /* 守卫失败不阻断启动 */ }

/* ================= 运行状态 ================= */
const boardEl = $id('board'), stageEl = $id('stage'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), chipEl = $id('mode-chip');
const wrapEl = () => $id('boardwrap');
let cur = null;                       // 当前关模型（makeLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, peek: false, tut: 'none', tutStep: 0 };
let lastAct = Date.now();             /* 30s 答案级 idle 锚（方向级不得重置它——契约 B） */
let lastDir = Date.now();             /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let judgeTimer = null, judgePromise = null;
let ghostReason = null;               // 'tut' | 'scaffold' | 'rescue'
let scaffoldActive = false, scaffoldRedemo = false, tutRedemo = false;
let flowToken = 0;                    // 异步流令牌（peek/教学重入防护：换关即作废旧流）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 78);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染 ================= */
const faceSvg = f => (NUM_FACES[f] ? NUM_FACES[f] : PATTERNS[f].svg);
function buildBoard() {
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = 'repeat(' + cur.grid.c + ', var(--card))';
  cur.cards.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card' + (cur.mode === 'sum10' ? ' num' : '');
    b.dataset.i = i;
    b.setAttribute('aria-label', '第' + (i + 1) + '张牌');
    b.innerHTML = '<div class="card-inner"><div class="face back">' + CARD_BACK + '</div>' +
      '<div class="face front">' + faceSvg(c.face) + '</div></div>';
    boardEl.appendChild(b);
  });
  layoutBoard();
}
function cardEl(i) { return boardEl.querySelector('.card[data-i="' + i + '"]'); }
function renderCard(i) {
  const el = cardEl(i), c = cur.cards[i];
  if (!el) return;
  el.classList.toggle('up', c.state === 'up' || c.state === 'gone');
  el.classList.toggle('gone', c.state === 'gone');
}
/* 卡尺寸按 stage 实时算：min(宽/高约束)，clamp [96,168]，间距 16 —— 双 viewport 均 ≥96 */
function layoutBoard() {
  const availW = stageEl.clientWidth - 20, availH = stageEl.clientHeight - 20;
  const g = 16;
  const w = Math.floor((availW - (cur.grid.c - 1) * g) / cur.grid.c);
  const h = Math.floor((availH - (cur.grid.r - 1) * g) / cur.grid.r);
  const size = Math.max(96, Math.min(Math.min(w, h), 168));
  document.documentElement.style.setProperty('--card', size + 'px');
  document.documentElement.style.setProperty('--gap', g + 'px');
}
window.addEventListener('resize', () => { if (cur) layoutBoard(); });

function renderTray() { // 顶栏配对进度盘：本关每组一只小图标（组序唯一），配对收走后点亮
  const tray = $id('pairs-tray');
  tray.innerHTML = '';
  const seen = {};
  cur.cards.forEach(c => {
    if (seen[c.pairId]) return;
    seen[c.pairId] = true;
    const d = document.createElement('div');
    d.className = 'mini' + (cur.donePairs.indexOf(c.pairId) >= 0 ? ' on' : '');
    d.innerHTML = faceSvg(c.face);
    tray.appendChild(d);
  });
}
function renderModeChip() { // 规则章徽（零文字）：同图=双卡 / 补数=十格点阵
  chipEl.className = cur.mode === 'sum10' ? 'ten' : '';
  chipEl.innerHTML = cur.mode === 'sum10' ? ICONS.ten : ICONS.pair;
}
function renderDots() { // 章节点（ch 1 基；无限生成章只画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const ch = Math.floor(cur.flat / CH_LEN) + 1, sv = KIDS._save() || { levels: {} };
  for (let c = 0; c < ch; c++) {
    const i = document.createElement('i');
    const done = CH_LVS.every(l => sv.levels[(c + 1) + '-' + l]);
    i.className = done ? 'done' : (c === ch - 1 ? 'cur' : '');
    dots.appendChild(i);
  }
}

/* ================= 幽灵手指（教学"帮" + 支架 + 救援答案级共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhost(i, reason) {
  if (VERIFY || POKE) return;
  const el = cardEl(i);
  if (!el) return;
  ghost.toEl(el); ghost.show(reason);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}

/* ================= 先看后翻 peek 流（SPEC §4）
   指令语音先行（lead=estMs(peek 文案) 实算窗）→ 全牌依序亮出（60ms/张）
   → 亮出窗 PEEK_BASE+对数×PEEK_PER_PAIR → 全部盖回（seenIds 保留=「翻回后再找」）。
   flowToken 防重入：亮牌期间点"再玩一次"换关，旧流作废。 ================= */
async function peekFlow() {
  const tk = flowToken;
  state.peek = true; state.locked = true;
  KIDS.voice.play(VOICE.peek.key, VOICE.peek.text);
  const lead = estMs(VOICE.peek.text);           // 13 字 → 5085ms（estMs 吃字符串，禁传数字）
  await wait(lead);
  if (tk !== flowToken) return;
  boardEl.classList.add('peeking');
  cur.cards.forEach((c, i) => setTimeout(() => { if (tk === flowToken) { c.state = 'up'; renderCard(i); } }, i * 60));
  sfx('pop');
  await wait(cur.cards.length * 60 + peekMs(cur.pairs));
  if (tk !== flowToken) return;
  boardEl.classList.remove('peeking');
  cur.cards.forEach((c, i) => { c.state = 'down'; renderCard(i); });
  cur.seenIds = cur.cards.map(c => c.id);        // 全部见过 → 支架/救援依据（engKnownPair）
  state.peek = false; state.locked = false;
  lastAct = Date.now(); lastDir = Date.now();
  sayGoal();
}

/* ================= 翻牌主路径（真实点击 / MEM.flip / autoSolve 共用） ================= */
function tapCard(i) {
  if (!cur || state.won) return false;
  if (state.demo || state.peek || state.locked) {  // 吞输入：轻叮+容器 bump（家族 D）
    sfx('pop'); replayAnim(wrapEl(), 'bump');
    return false;
  }
  if (!engFlip(cur, i)) return false;
  lastAct = Date.now();
  hideScaffold();
  renderCard(i);
  sfx('pop');
  if (state.tut === 'help' && state.tutStep === 0) { // 教学"帮"：孩子翻了第一张 → 指向它的配对
    state.tutStep = 1;
    setTimeout(() => { if (state.tut === 'help') pointGhost(engPartner(cur, i), 'tut'); }, 550);
  }
  const ups = engUps(cur);
  if (ups.length === 2) {
    state.locked = true;
    const a = ups[0].id, b = ups[1].id;
    const isMatch = ups[0].pairId === ups[1].pairId;
    if (!isMatch) { cardEl(a).classList.add('miss'); cardEl(b).classList.add('miss'); }
    judgePromise = new Promise(res => {
      judgeTimer = setTimeout(() => { resolveJudge(a, b); res(); }, isMatch ? JUDGE_T_MATCH : JUDGE_T_MISS);
    });
  }
  return true;
}
function resolveJudge(a, b) {
  const fa = cur.cards[a].face, fb = cur.cards[b].face;   // 判定前留脸（盖回后仍是判定证据）
  const r = engJudge(cur);
  [a, b].forEach(i => { const el = cardEl(i); if (el) el.classList.remove('miss'); renderCard(i); });
  state.locked = false;
  judgePromise = null;
  if (r === 'match') {
    renderTray();
    sfx('coin');
    if (state.tut === 'help') { // 教学"独"：首次配对成功 → 强化反馈，放手独立完成
      state.tut = 'solo';
      ghost.hide();
      sfx('ok');
      hopRabbit();
    }
    if (engWon(cur)) { winFlow(); return; }
  } else {
    sfx('fail'); // 柔和低音，不惊吓
    /* 近形干扰句：失误两卡同族（非同面）→ mem_twin 10s 独立节流（delta① 专属反馈） */
    const fA = patFam(fa), fB = patFam(fb);
    if (fA && fA === fB && Date.now() - lastTwinVoice > 10000) {
      lastTwinVoice = Date.now();
      KIDS.voice.play(VOICE.twin.key, VOICE.twin.text);
    }
    if (cur.streak >= MISS_CHAIN_STEP && cur.streak % MISS_CHAIN_STEP === 0) {
      if (sayW()) wrongChainUntil = Date.now() + chainWin();   /* 链豁免窗（契约 I） */
    }
    if (cur.streak >= 3) maybeScaffold(); // 连续 3 次失误 → 支架
    else if (state.tut === 'help') setTimeout(() => { if (state.tut === 'help' && engUps(cur).length === 0) pointGhost(tutTarget(), 'tut'); }, 700);
  }
}

/* ================= 支架：3 连失误 + 场上有已知配对（翻过又盖回 / peek 全见） ================= */
function maybeScaffold() {
  const kp = engKnownPair(cur);
  if (!kp) return;
  scaffoldActive = true;
  scaffoldRedemo = false;
  pointGhost(kp.cards[0].id, 'scaffold');
  if (Date.now() >= wrongChainUntil) sayGoal();   /* 链窗内语音让路（契约 I 延伸：防支架句顶掉错链句），视觉支架照常给 */
}
function hideScaffold() {
  if (ghostReason === 'scaffold') ghost.hide();
  scaffoldActive = false;
}
function sayGoal() { // 目标句（模式相关；章首/模式切换/peek 收尾/救援用）
  if (!cur) return;
  const v = cur.mode === 'sum10' ? VOICE.sum10 : VOICE.hint;
  KIDS.voice.play(v.key, v.text);
}

/* ================= 教学：看-帮-独（仅关 1-0 首次，save.mem.tutSeen 记住演示已放过） ================= */
function tutTarget() { // "帮"阶段指向：有牌朝上→其配对；否则第一张盖着的牌
  const ups = engUps(cur);
  if (ups.length === 1) return engPartner(cur, ups[0].id);
  for (let i = 0; i < cur.cards.length; i++) if (cur.cards[i].state === 'down') return i;
  return 0;
}
async function tutorialWatch() {
  const tk = flowToken;
  state.demo = true; state.locked = true; state.tut = 'watch';
  KIDS.voice.play(VOICE.tutWatch.key, VOICE.tutWatch.text);
  await wait(700);
  if (tk !== flowToken) return;
  const i = 0, j = engPartner(cur, 0); // 确定性关卡：演示对 = 第 0 张与它的配对
  engFlip(cur, i); engFlip(cur, j);
  renderCard(i); renderCard(j);
  sfx('pop');
  await wait(1100);
  if (tk !== flowToken) return;
  const r = engJudge(cur);
  renderCard(i); renderCard(j);
  renderTray();
  sfx('coin');
  window.__memDemoR = r === 'match' ? 'match' : 'none';   // 演示生效证据（verify/selftest 断言）
  await wait(850);
  if (tk !== flowToken) return;
  if (!VERIFY && !POKE) {                    // verify/poke 不写档（老款验收语义）
    const sv = KIDS._save();
    sv.mem = sv.mem || {};
    sv.mem.tutSeen = true;
    KIDS.store.persist();
  }
  KIDS.voice.play(VOICE.tutTurn.key, VOICE.tutTurn.text);
  await wait(600);
  if (tk !== flowToken) return;
  /* 重新发同一关（确定性布局一致——孩子刚看过的对还在原位），进入"帮" */
  const flat = cur.flat;
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, peek: false, tut: 'help', tutStep: 0 };
  tutRedemo = false;
  buildBoard(); renderTray(); renderDots();
  lastAct = Date.now(); lastDir = Date.now();
  setTimeout(() => { if (state.tut === 'help') pointGhost(tutTarget(), 'tut'); }, 700);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? (cur ? cur.flat : 0) : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 家族 F：章末预告=下一章文案（ci<4）；生成关=实算下一关难度档 GEN_HINTS[genLevel(f+1).dch-1]
     （genLevel 纯函数确定性，同 flat 恒同 dch——预告与实际恒一致，禁取模右移） */
  if (ci >= 4) return GEN_HINTS[genLevel(f + 1).dch - 1];
  return CHAPTERS[ci + 1].hint;
}
function winFlow() {
  state.won = true; state.locked = true;
  clearTimeout(judgeTimer);
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  KIDS.ui.celebrate(stars).then(() => {
    const ci = Math.floor(cur.flat / CH_LEN), ch = ci + 1, lv = cur.flat % CH_LEN;
    const pr = KIDS.level.pass(ch, lv, stars, CH_LVS);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity); // 关卡无限：日历不设内容上限（每日新关+家长加关由 core 控制）
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars6 = CH_LVS.reduce((s, l) => s + KIDS.level.stars(ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: ch, stars: stars6, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：winFlow 也实算 lim-1（双实算之一） */
      setTimeout(proceed, 3400);
    } else proceed();
  });
}
function proceed() { // 进入今日解锁范围内第一个未通关的关（含生成关）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  for (let i = 0; i < lim; i++) {
    if (!sv.levels[keys[i]]) { startLevel(i); return; }
  }
  startLevel(cur.flat); // 全部完成：停留当前关可无限重玩
}

/* ================= 关卡加载 ================= */
function startLevel(flat) {
  clearTimeout(judgeTimer);
  judgePromise = null;
  ghost.hide();
  scaffoldActive = false;
  flowToken++;                               // 作废在途 peek/教学异步流
  lastWrongVoice = 0; wrongChainUntil = 0;   /* 换关重置错反馈节流锚与链豁免（契约 I/J 配套） */
  cur = makeLevel(flat);
  state = { locked: false, won: false, demo: false, peek: false, tut: 'none', tutStep: 0 };
  tutRedemo = false;
  lastAct = Date.now(); lastDir = Date.now();
  buildBoard(); renderTray(); renderDots(); renderModeChip();
  if (VERIFY || POKE) return;
  const sv = KIDS._save();
  const fresh = flat === 0 && !sv.levels['1-0'] && !(sv.mem && sv.mem.tutSeen);   /* 契约 E：先查教学特例 */
  if (fresh) { tutorialWatch(); return; }
  if (cur.peek) { peekFlow(); return; }
  const prevMode = flat > 0 ? genLevel(flat - 1).mode : null;
  if (cur.flat < 3 || prevMode !== cur.mode || !goalSaid) { sayGoal(); goalSaid = true; }   // 首三关/规则切换/会话首关说目标句（防刷屏+回归玩家不静默）
}

/* ================= 底栏交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || POKE || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  sayGoal();
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || POKE || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});
boardEl.addEventListener('pointerdown', e => {
  const el = e.target.closest('.card');
  if (!el) return;
  e.preventDefault();
  tapCard(Number(el.dataset.i));
});

/* ================= 无操作看护（家族 B 双锚 / K 面板守卫 / I 让路）
   14s 方向级=目标句+一张盖牌 pulse（lastDir 独立节流锚，不重置 lastAct）；
   30s 答案级=已知配对幽灵手指（视觉答案级）；5s 支架/教学重演示一次（老款语义）。 ================= */
function rescueTick() {
  if (VERIFY || POKE || !cur || state.won || state.locked || state.demo || state.peek) return;
  if (state.tut === 'watch') return;   /* 教学看期有演示链，救援静默；帮期救援放行（老款 5s 重演示语义——r19 审查 major-1 修复，countchick 家族形态对齐） */
  if (Date.now() < wrongChainUntil) return;   /* 错反馈链豁免窗（契约 I）：链播完前救援不掐断 */
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板/庆祝层遮挡期救援静默 */
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                          /* 答案级：已知配对幽灵手指演示（静音也能看见） */
    const kp = engKnownPair(cur) || engAnyPair(cur);
    if (kp) pointGhost(kp.cards[0].id, 'rescue');
    sayGoal();
    lastAct = Date.now();
    return;
  }
  if (idle > 5000) {
    if (scaffoldActive && !scaffoldRedemo) { // 支架重演示一次
      scaffoldRedemo = true;
      const kp = engKnownPair(cur);
      if (kp) pointGhost(kp.cards[0].id, 'scaffold');
    } else if (state.tut === 'help' && !tutRedemo && ghostReason !== 'tut') { // 教学"帮"重演示一次
      tutRedemo = true;
      pointGhost(tutTarget(), 'tut');
    }
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：目标句+盖牌 pulse（不动 lastAct） */
    sayGoal();
    const downs = cur.cards.filter(c => c.state === 'down');
    if (downs.length) replayAnim(cardEl(downs[0].id), 'pulse');
    lastDir = Date.now();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言） */

/* ================= 启动（verify/poke 分支由 game-verify.js 接管；迁移 IIFE 已先行） ================= */
buildStatic();
if (!VERIFY && !POKE) {
  KIDS.init({ game: 'memory', title: '记忆翻牌配对' });   // 存档键 kidsgame_memory（沿用，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A：启动处传 lim-1（双实算之二） */
    first = Math.max(0, lim - 1);                      /* 收尾后停留今日最后一关（b14 家族修复对齐） */
  }
  startLevel(first);
}

/* ================= 验收钩子 ================= */
async function autoSolveExec(seq) {
  while (state.peek || state.demo) { await wait(200); if (state.won) return; }
  for (let k = 0; k < seq.length; k++) {
    if (state.won) break;
    let guard = 0;
    while ((state.peek || state.locked) && !state.won && guard < 200) { await wait(120); guard++; }
    tapCard(seq[k]);
    if (judgePromise) await judgePromise;
    else await wait(140);
  }
}
window.MEM = {
  start(flat) { startLevel(((flat % 200) + 200) % 200); },
  get currentLevel() {
    return cur ? {
      flat: cur.flat,
      ch: Math.floor(cur.flat / CH_LEN) + 1,   // 章号 1 基
      lv: cur.flat % CH_LEN,
      grid: cur.grid, pairs: cur.pairs, mode: cur.mode, peek: !!cur.peek,
      twins: cur.twins, misses: cur.misses, matched: cur.matched
    } : null;
  },
  get cards() { return cur ? cur.cards.map(c => ({ id: c.id, pairId: c.pairId, face: c.face, state: c.state })) : []; },
  flip(i) { return tapCard(i); },
  miss() { // 测试钩子：强制一次失误判定（选两张不同 pairId 的盖牌；直驱 resolveJudge 含错链/支架路径）
    if (!cur || state.won || state.demo || state.peek) return false;
    const a = cur.cards.findIndex(c => c.state === 'down');
    if (a < 0) return false;
    const b = cur.cards.findIndex((c, i) => i !== a && c.state === 'down' && c.pairId !== cur.cards[a].pairId);
    if (b < 0) return false;
    engFlip(cur, a); engFlip(cur, b);
    renderCard(a); renderCard(b);
    resolveJudge(a, b);
    return true;
  },
  async autoSolve(exec) {
    while (exec && (state.peek || state.demo)) { await wait(250); if (state.won) break; }
    const seq = perfectSequence(cur);
    if (exec) await autoSolveExec(seq);
    return seq;
  },
  get tutorial() { return state.tut; },
  get state() {
    return {
      peek: state.peek, locked: state.locked, won: state.won,
      streak: cur ? cur.streak : 0, misses: cur ? cur.misses : 0,
      wrongChainUntil: wrongChainUntil, ghost: ghostReason,
      chainWinSame: SAME_CHAIN_WIN, chainWinSum10: SUM10_CHAIN_WIN
    };
  }
};
