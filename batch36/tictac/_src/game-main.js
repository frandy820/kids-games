/* ================= tictac 主逻辑（棋盘渲染 / 回合驱动 / 终局结算 / 残局判定 / 复盘 / 教学 / 救援 / 推进）
   玩法（SPEC-BATCH36 §-r18-tictac）：ch1-4 classic 3×3 vs 兔子四档；ch5 残局三类题
   （win1/block1/fork，miss 计分制）；ch6 4×4 得 3 连；ch7 限子滚动（每方 ≤3 子 FIFO）。
   孩子恒执 X 先手；点空格落子→兔子 O 应手（演出 800ms）；三连=胜局（连线三格
   .wincell 高亮，窗=实长+300：胜 2604/平 2844/负 3012——三链独立单发不拼播）。
   对战型（battle/v44/vroll）每关 3 局（胜 1/平 0.5/负 0）；残局关每关 5 题（答错计
   miss——§-r18 §5 分题型：对战恒 miss=0 契约 I 豁免备案；残局契约 I 全量：错链
   豁免窗 WRONG_CHAIN_WIN=2448+300 窗内错点吞/对选放行、guard 挂判定前、startLevel
   /换题重置、救援 interval 让路；契约 J 语义句 10s 节流）。
   负局 AI 复盘（classic ch1-4，flat≥0）：engReview minimax 回溯首误步→.k-review 层
   （红=实际格/绿=更优格 breathe）+tk_review，窗 REVIEW_MS=2712+300+1500，tap 提前关。
   教学三段：watch=幽灵手指看一局（5 手定版 X4 O1 X0 O2 X8，__tkDemoR='done'——gate
   口径，预算 ≤16s）→turn=你来下一局（帮→独）。
   救援：14s 方向级（lastDir 独立节流锚）/30s 答案级（最优格 breathe）；
   面板在场守卫（契约 K）；残局题面句按型分流。
   验收钩子：window.TK = { get currentLevel{…,kind,miss 分题型}, get quiz{分题型
   board/answer/xq/oq/step/miss}, tapCell(i), start(flat), async autoSolve(),
   get final(), get review(), get tutorial }——tapCell 返回：对战 'moved'/'win'/'draw'/
   'lose'/已占=false（bump 家族 D）/演示期 null；残局 'right'/'done'/'wrong'/已占或
   窗内错点=false/反馈窗=null。review() 返回末次负局复盘快照。真实页同暴露（b29 坑⑥）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
const replayAnim = (el, cls) => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
/* estMs 定义在 game-data.js（家族 T 四方同步：data 定义/main 禁重复声明——同块拼接） */
/* 救援/开场任务语音/读题不受 flat 门限制（§0.5） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };

/* 终局演出窗（SPEC §4 实长+300；三链独立单发不拼播） */
const WIN_MS = 2604, DRAW_MS = 2844, LOSE_MS = 3012;
/* 残局错链豁免窗（§-r18 §5/§7：tk_wrong 2448+300——真时钟） */
const WRONG_CHAIN_WIN = 2448 + 300;
/* 负局复盘窗（§-r18 §7：tk_review 2712+300 语音+1500 看板余量） */
const REVIEW_MS = 2712 + 300 + 1500;

const boardEl = $id('board'), boardWrapEl = $id('board-wrap'),
      turnBarEl = $id('turn-bar'),
      whoK = document.querySelector('.who-k'), whoR = document.querySelector('.who-r'),
      qbarEl = $id('qbar'), qTextEl = qbarEl.querySelector('.q-text'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay'), hearBtn = $id('btn-hear'),
      ghostEl = $id('ghost');
const qText = t => { qTextEl.textContent = t; };

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { won: false, demo: false, tut: 'none', rabbit: false, roundEnd: false, review: false };
let perfRun = 0;                                // 演出代 token（重玩/换关中止在途演出）
let firstFlat = 0;                              // 启动首关（教学迷你局完成后回跳）
let lastAct = Date.now();                       /* 30s 答案级 idle 锚（方向级不得重置它） */
let lastDir = Date.now();                       /* 14s 方向级独立节流锚（家族 B：与 lastAct 分离） */
let lastBlankHint = 0;                          // 点空白轻提示节流（§0.16，10s）
let wrongChainUntil = 0;                        /* 残局错链豁免窗锚（契约 I r18——对战关不设窗） */
let lastWrongVoice = 0;                         /* 残局错反馈语义句节流锚（契约 J） */
let helpRedemo = false;   /* 已死（审查 m1 删 idle 重演示分支）——仅保留声明防他处引用 */

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const cellEl = i => boardEl.querySelector('.cell[data-i="' + i + '"]');

/* ================= 键基迁移 IIFE（§-r18 §6：CH_LEN 5→6——先于 KIDS.init 读档执行）
   脏键=格式非法或关号 >CH_LEN-1（章号上界放开容纳生成关 ch≥8）；矛盾态=存在
   c∈[2,7] 使 lv[c+'-0'] 在而 lv[(c-1)+'-5'] 缺（旧基 5 关/章不可能在新基合法出现）
   →一次性重置；合法新基档（含 ch≥8 生成关键）保留。 ================= */
(() => {
  let raw = null;
  try { raw = localStorage.getItem('kidsgame_tictac'); } catch (e) { return; }
  if (!raw) return;
  let sv = null;
  try { sv = JSON.parse(raw); } catch (e) { return; }
  if (!sv || typeof sv !== 'object' || !sv.levels) return;
  const lv = sv.levels;
  let bad = false;
  for (const k of Object.keys(lv)) {
    const m = /^([1-9]\d*)-([0-9]\d*)$/.exec(k);
    if (!m) { bad = true; break; }                              // 脏键：仅判格式
    if (+m[2] > CH_LEN - 1) { bad = true; break; }              // 关号域 >CH_LEN-1
  }
  if (!bad) {
    for (let c = 2; c <= N_CHAPTERS; c++) {                     // 矛盾态检测（旧基特征）
      if (lv[c + '-0'] && !lv[(c - 1) + '-5']) { bad = true; break; }
    }
  }
  if (bad) { try { localStorage.removeItem('kidsgame_tictac'); } catch (e) {} }
})();

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  hearBtn.innerHTML = ICONS.hear;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 70);
  whoK.querySelector('.avatar').innerHTML = KID_AVATAR;
  whoR.querySelector('.avatar').innerHTML = KIDS.assets.rabbit('happy', 60);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}
/* 音效（Web Audio 合成）：落子=木鱼短音 / 兔子落子=低柔单音 / 胜=双音上行 / 平=柔和双音 /
   负=低柔下行（verify 页 stub 且 ctx null 双保险下静默） */
const placeTone = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.12, 0, 0.5); } };
const placeLo = () => { if (!VERIFY) KIDS.audio.note(493.88, 0.12, 0, 0.4); };
const chimeWin = () => { if (!VERIFY) { KIDS.audio.note(659.25, 0.16, 0, 0.6); KIDS.audio.note(880, 0.3, 0.09, 0.65); } };
const chimeDraw = () => { if (!VERIFY) { KIDS.audio.note(587.33, 0.18, 0, 0.45); KIDS.audio.note(740, 0.22, 0.1, 0.4); } };
const dodgeLo = () => { if (!VERIFY) KIDS.audio.note(392, 0.22, 0, 0.35); };

/* ================= 渲染 ================= */
function renderBoard() {                        // 棋盘 9/16 格（契约 M 渲染层锚：.cell.x/.o/.empty）
  boardEl.innerHTML = '';
  let b;
  if (cur.kind === 'puzzle') {
    const q = cur.puzzles[cur.step];
    b = q ? q.board : ['', '', '', '', '', '', '', '', ''];
  } else b = cur.rounds[cur.roundIdx].board;
  for (let i = 0; i < b.length; i++) {
    const c = document.createElement('button');
    c.className = 'cell pop-in ' + (b[i] === 'X' ? 'x' : b[i] === 'O' ? 'o' : 'empty');
    c.dataset.i = i;                            // 帧内容锚（契约 M：渲染即引擎对账）
    c.setAttribute('aria-label', '第' + (i + 1) + '格');
    if (b[i]) c.innerHTML = b[i] === 'X' ? X_SVG : O_SVG;
    c.style.animationDelay = (i * 50) + 'ms';
    boardEl.appendChild(c);
  }
  markOldest();
}
function renderCell(i, p) {                     // 落子渲染（类+棋子 SVG 同步）
  const el = cellEl(i);
  if (!el) return;
  el.className = 'cell ' + (p === 'X' ? 'x' : 'o');
  el.innerHTML = p === 'X' ? X_SVG : O_SVG;
}
function renderClear(i) {                       // vroll 移子渲染（回空格——移出最旧子）
  const el = cellEl(i);
  if (!el) return;
  el.className = 'cell empty';
  el.innerHTML = '';
}
function markOldest() {                         // vroll 己方最旧子标记（下新子时它会被移走）
  boardEl.querySelectorAll('.cell.oldest').forEach(e => e.classList.remove('oldest'));
  if (!cur || cur.kind !== 'vroll') return;
  const g = cur.rounds[cur.roundIdx];
  if (!g || !g.xq || g.xq.length < ROLL_CAP_PIECES) return;
  const el = cellEl(g.xq[0]);
  if (el) el.classList.add('oldest');
}
function renderRoundDots() {                    // HUD 进度点（对战 3 局 w/d/l/cur；残局 5 题 w/cur）
  const tray = $id('step-dots');
  tray.innerHTML = '';
  const n = cur.kind === 'puzzle' ? PUZZLES : ROUNDS;
  for (let k = 0; k < n; k++) {
    const i = document.createElement('i');
    if (cur.kind === 'puzzle') {
      const q = cur.puzzles[k];
      i.className = q && q.solved ? 'w' : (k === cur.step && !cur.done ? 'cur' : '');
    } else {
      const r = cur.results[k];
      i.className = r === 'win' ? 'w' : r === 'draw' ? 'd' : r === 'lose' ? 'l' :
                    (k === cur.roundIdx && !cur.done ? 'cur' : '');
    }
    tray.appendChild(i);
  }
}
function renderDots() {                         // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  for (let c = 1; c <= Math.max(N_CHAPTERS, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4, 5].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
function renderTurnUI() {                       // 双头像亮灯（兔子思考期亮兔子侧，其余恒孩子）
  const rabbitAct = state.rabbit;
  whoK.classList.toggle('active', !rabbitAct);
  whoR.classList.toggle('active', rabbitAct);
}
/* 兔子思考演出（小兔浮到棋盘边+思考气泡） */
function bunnyShow() {
  const g = boardWrapEl.querySelector('.bunny-g');
  if (g) replayAnim(g, 'show');
}
function bunnyHide() {
  const g = boardWrapEl.querySelector('.bunny-g');
  if (g) g.classList.remove('show');
}
/* 方向级视觉回锚（对战型）：己方可成三连的格 pulse 一轮（不泄答案级内容） */
function dirAnchor() {
  const g = cur && cur.rounds[cur.roundIdx];
  if (!g || g.over || state.rabbit || state.roundEnd || state.review) return;
  if (cur.kind === 'v44') {
    const wp = winPoints16(g.board, 'X');
    if (wp.length) {
      for (const i of wp) { const el = cellEl(i); if (el) replayAnim(el, 'pulse'); }
    } else {
      const b = [5, 6, 9, 10, 0, 15].find(i => g.board[i] === '');   // 泛化：中心区首空
      if (b != null) { const el = cellEl(b); if (el) replayAnim(el, 'pulse'); }
    }
    return;
  }
  if (cur.kind === 'vroll') {
    const wp = winPoints(g.board, 'X');         // 方向级近似（移子模拟=答案级 30s 专属）
    if (wp.length) {
      for (const i of wp) { const el = cellEl(i); if (el) replayAnim(el, 'pulse'); }
    } else {
      const b = g.board[4] === '' ? 4 : [0, 2, 6, 8].find(i => g.board[i] === '');
      if (b != null) { const el = cellEl(b); if (el) replayAnim(el, 'pulse'); }
    }
    return;
  }
  const wp = winPoints(g.board, 'X');
  if (wp.length) {
    for (const i of wp) { const el = cellEl(i); if (el) replayAnim(el, 'pulse'); }
  } else {
    /* 审查 m2：无可成三连格时不泄最优格（答案级 30s 专属）——泛化提示=中心格，空则首个空角 */
    const b = g.board[4] === '' ? 4 : [0, 2, 6, 8].find(i => g.board[i] === '');
    if (b != null) { const el = cellEl(b); if (el) replayAnim(el, 'pulse'); }
  }
}
/* 残局方向级锚（§-r18：按题型——win1 己方两连子/block1 兔子威胁两子/fork 己方双子；
   不泄答案空格——答案级 30s 专属） */
function puzDirAnchor(q) {
  const b = q.board;
  if (q.ptype === 'win1' || q.ptype === 'block1') {
    const p = q.ptype === 'win1' ? 'X' : 'O';
    for (const L of LINES) {
      const v = [b[L[0]], b[L[1]], b[L[2]]];
      if (v.filter(x => x === p).length === 2 && v.indexOf('') >= 0) {
        for (let j = 0; j < 3; j++) if (v[j] === p) { const el = cellEl(L[j]); if (el) replayAnim(el, 'pulse'); }
        return;
      }
    }
  } else {
    for (let i = 0; i < 9; i++) if (b[i] === 'X') { const el = cellEl(i); if (el) replayAnim(el, 'pulse'); }
  }
}
/* 拒绝反馈（家族 D）：已占格/吞输入期轻叮+格子摇头 */
function bumpCell(i) {
  const el = cellEl(i);
  if (!el) return;
  replayAnim(el, 'wig');
  setTimeout(() => el.classList.remove('wig'), 650);
}
/* 残局题面句/语音按型分流（兔子按钮·重听·空白点共用） */
function hintNow() {
  if (cur.kind === 'puzzle') {
    const q = cur.puzzles && cur.puzzles[cur.step];
    if (!q || q.solved) return;
    const vk = q.ptype === 'win1' ? VOICE.puzWin : q.ptype === 'block1' ? VOICE.puzBlock : VOICE.puzFork;
    sayR(vk.key, vk.text);
    puzDirAnchor(q);
  } else {
    sayR(VOICE.hint.key, VOICE.hint.text);
    dirAnchor();
  }
}

/* ================= 局装载 ================= */
function startRound(n) {                        // n=1-3（对战型）；局 RNG 独立播种（与 dch RNG 分流）
  cur.roundIdx = n - 1;
  if (cur.kind === 'v44')
    cur.rounds[n - 1] = { board: Array(16).fill(''), over: false, hist: [], xq: null, oq: null, moves: 0 };
  else if (cur.kind === 'vroll')
    cur.rounds[n - 1] = { board: Array(9).fill(''), over: false, hist: [], xq: [], oq: [], moves: 0 };
  else
    cur.rounds[n - 1] = { board: Array(9).fill(''), over: false, hist: [], xq: null, oq: null, moves: 0 };
  cur.rng = mulberry32(roundSeed(cur.flat, n));
  bunnyHide();
  state.rabbit = false; state.roundEnd = false; state.review = false;
  boardEl.classList.toggle('b16', cur.kind === 'v44');
  boardWrapEl.classList.toggle('w16', cur.kind === 'v44');
  renderBoard(); renderTurnUI(); renderRoundDots();
  qText(cur.kind === 'v44' ? P44_TEXT : cur.kind === 'vroll' ? VROLL_TEXT : PROMPT_TEXT);
}
/* 残局题装载（qbar 按型文案+题面句；换题重置错链窗——契约 I 换题语义） */
function loadPuzzle(qi) {
  const q = cur.puzzles[qi];
  wrongChainUntil = 0;
  boardEl.classList.remove('b16');
  boardWrapEl.classList.remove('w16');
  renderBoard(); renderRoundDots();
  const vk = q.ptype === 'win1' ? VOICE.puzWin : q.ptype === 'block1' ? VOICE.puzBlock : VOICE.puzFork;
  qText(q.ptype === 'win1' ? PUZ_WIN_TEXT : q.ptype === 'block1' ? PUZ_BLOCK_TEXT : PUZ_FORK_TEXT);
  sayR(vk.key, vk.text);
}

/* ================= 落子主路径分发（真实点击 / TK.tapCell / autoSolve / 教学演示共用）
   残局关走 uiPuzzleTap（判定/miss/错链窗）；对战型走 uiBattleTap。
   已占格=false+wig 轻叮（家族 D）；演示期 null；兔子思考/终局结算窗=false 轻吞。 ========== */
async function uiTapCell(i, demo) {
  if (cur && cur.kind === 'puzzle' && !demo) return uiPuzzleTap(i);
  return uiBattleTap(i, demo);
}
/* ---------- 对战型（battle classic / v44 4×4 / vroll 限子滚动） ---------- */
async function uiBattleTap(i, demo) {
  if (!cur || state.won) return false;
  if (state.demo && !demo) return null;         // 教学演示期 null（SPEC §3）
  if (cur.done) return null;
  const g = cur.rounds[cur.roundIdx];
  if (!g || g.over) return null;
  if (state.rabbit || state.roundEnd || state.review) {   // 思考/结算/复盘窗：轻叮+摇头（家族 D）
    if (!demo) { sfx('pop'); bumpCell(i); }
    return false;
  }
  const N = cur.kind === 'v44' ? 16 : 9;
  if (!Number.isInteger(i) || i < 0 || i >= N) return null;
  if (g.board[i] !== '') {                      // 已占格：拒绝 bump 不响 wrong（对战 miss 恒 0 备案）
    sfx('pop');
    bumpCell(i);
    return false;
  }
  const run = cur, token = perfRun;             /* 身份守卫：演出窗内重玩会重建 cur，防旧续体错推进 */
  lastAct = Date.now();                         /* 孩子落子=主交互，重置救援钟（§0.7a） */
  lastDir = Date.now();
  if (state.tut === 'help' && !demo) {          /* 教学"独"：首次合法落子 → 放手 */
    state.tut = 'solo';
    window.__tkTutSolo = true;                  /* 帮→独实证（verify 单元②断言；solo 为瞬时态） */
    ghost.hide();
    hopRabbit();
  }
  /* ---- X 落子（vroll 含移出最旧子——先移后落原子完成） ---- */
  if (cur.kind === 'vroll') {
    const removedX = engRollApply(g, 'X', i);
    if (removedX >= 0) renderClear(removedX);
    g.moves++;
  } else g.board[i] = 'X';
  g.hist.push({ p: 'X', i: i });
  renderCell(i, 'X');
  placeTone();
  const w = cur.kind === 'v44' ? engScanWin16(g.board) : engScanWin(g.board);
  if (w) return await endRound('win', w, demo);
  const fullX = cur.kind === 'vroll' ? g.moves >= ROLL_MOVE_CAP : g.board.indexOf('') < 0;
  if (fullX) return await endRound('draw', null, demo);
  /* ---- 兔子应手（思考演出 800ms → 落子 O） ---- */
  state.rabbit = true;
  renderTurnUI();
  bunnyShow();
  qText(RABBIT_TEXT);
  await wait(800 * SPEED);
  if (cur !== run || token !== perfRun) { state.rabbit = false; bunnyHide(); return false; }
  let mv;
  if (demo && cur._scriptO && cur._scriptO.length) mv = cur._scriptO.shift();   // 教学演示定版应手
  else if (cur.kind === 'v44') mv = engV44(g.board, 'O');
  else if (cur.kind === 'vroll') mv = engRollPick(g, 'O');
  else mv = engAiPick(g.board, cur.dch, cur.rng);
  if (mv == null || g.board[mv] !== '') { state.rabbit = false; bunnyHide(); return false; }
  if (cur.kind === 'vroll') {
    const ro = engRollApply(g, 'O', mv);
    if (ro >= 0) renderClear(ro);
    g.moves++;
  } else g.board[mv] = 'O';
  g.hist.push({ p: 'O', i: mv });
  renderCell(mv, 'O');
  markOldest();
  window.__tkAiMoves = (window.__tkAiMoves || 0) + 1;   /* verify 观测：真 AI 应手计数 */
  placeLo();
  const w2 = cur.kind === 'v44' ? engScanWin16(g.board) : engScanWin(g.board);
  if (w2) { state.rabbit = false; bunnyHide(); return await endRound('lose', w2, demo); }
  const fullO = cur.kind === 'vroll' ? g.moves >= ROLL_MOVE_CAP : g.board.indexOf('') < 0;
  if (fullO) { state.rabbit = false; bunnyHide(); return await endRound('draw', null, demo); }
  state.rabbit = false;
  bunnyHide();
  renderTurnUI();
  qText(cur.kind === 'v44' ? P44_TEXT : cur.kind === 'vroll' ? VROLL_TEXT : PROMPT_TEXT);
  return 'moved';
}
/* ---------- 残局判定（§-r18 §5 分题型 miss 口径） ----------
   答案格='right'（末题 'done'）；空格点错='wrong'+miss+1（错链豁免窗挂判定前：窗内
   错点吞 false、对选放行；契约 J 10s 节流内 miss 照计链不重播不设窗）；已占格=false；
   反馈窗=null。miss≥2=答案格 breathe（答案级线索）。 ---------- */
async function uiPuzzleTap(i) {
  if (!cur || state.won) return false;
  if (cur.done) return null;
  const q = cur.puzzles && cur.puzzles[cur.step];
  if (!q || q.solved) return null;
  if (state.roundEnd || state.review) {         // 反馈窗/复盘期：轻叮+摇头（家族 D）
    sfx('pop');
    bumpCell(i);
    return false;
  }
  if (!Number.isInteger(i) || i < 0 || i > 8) return null;
  if (q.board[i] !== '') {                      // 已占格拒绝（非判定格——不计 miss）
    sfx('pop');
    bumpCell(i);
    return false;
  }
  lastAct = Date.now();                         /* 有效判定格交互重置救援钟 */
  lastDir = Date.now();
  if (i === q.answer) {                         /* ---- 判对：落子演出+成线/威胁可视化 ---- */
    const run = cur, token = perfRun;
    q.solved = true;
    state.roundEnd = true;
    renderCell(i, 'X');
    const b2 = q.board.slice();
    b2[i] = 'X';
    if (q.ptype === 'win1') {
      const w = engScanWin(b2);
      if (w) for (const c of w.line) { const el = cellEl(c); if (el) el.classList.add('wincell'); }
    } else if (q.ptype === 'fork') {
      for (const t of winPoints(b2, 'X')) { const el = cellEl(t); if (el) replayAnim(el, 'pulse'); }
    } else {
      const el = cellEl(i); if (el) replayAnim(el, 'pulse');   /* block1：堵子 pulse */
    }
    KIDS.voice.queue([VOICE.right.key]);        /* 单 clip 链（⑩ 对账：__lastQueue===['tk_right']） */
    chimeWin();
    await wait(WIN_MS * SPEED);
    if (cur !== run || token !== perfRun) return 'right';
    state.roundEnd = false;
    cur.step++;
    if (cur.step >= PUZZLES) { cur.done = true; winFlow(); return 'done'; }
    loadPuzzle(cur.step);
    return 'right';
  }
  /* ---- 错答：计 miss 不吞（§-r18 §5）；契约 I 豁免窗挂判定前+契约 J 节流 ---- */
  if (wrongChainUntil && Date.now() < wrongChainUntil) {   /* 窗内错点吞（不计二次 miss） */
    sfx('pop');
    bumpCell(i);
    return false;
  }
  cur.miss++;
  const now = Date.now();
  if (now - lastWrongVoice > 10000) {           /* 契约 J：语义句 10s 节流（节流内 miss 照计不设窗） */
    KIDS.voice.queue([VOICE.wrong.key]);        /* 错链=wrong 单 clip（⑩ 对账） */
    wrongChainUntil = now + WRONG_CHAIN_WIN;
    lastWrongVoice = now;
  }
  bumpCell(i);
  if (cur.miss >= 2) {                          /* 答案级线索：miss≥2 才亮（残局） */
    const el = cellEl(q.answer);
    if (el) replayAnim(el, 'breathe');
  }
  return 'wrong';
}

/* ================= 局结算（b19 坑②定版：终局字串分流，不自动重开）
   胜/平/负三链独立单发（right/draw/lose 单 clip，窗=实长+300：2604/2844/3012）；
   classic 负局→AI 复盘（engReview 首误步+.k-review 层，REVIEW_MS 窗/tap 提前关）。 ========== */
async function endRound(result, w, demo) {
  const run = cur, token = perfRun;
  state.roundEnd = true;
  const g = cur.rounds[cur.roundIdx];
  g.over = true;
  cur.lastFinal = { result: result, line: w ? w.line.slice() : null };   /* 终局快照（TK.final） */
  bunnyHide();
  renderTurnUI();
  if (w) for (const i of w.line) { const el = cellEl(i); if (el) el.classList.add('wincell'); }   /* 演出层 */
  qText(result === 'win' ? WIN_TEXT : result === 'draw' ? DRAW_TEXT : LOSE_TEXT);
  const vk = result === 'win' ? VOICE.right.key : result === 'draw' ? VOICE.draw.key : VOICE.lose.key;
  KIDS.voice.queue([vk]);                       /* 单 clip 链（⑩ 对账） */
  if (result === 'win') chimeWin();
  else if (result === 'draw') chimeDraw();
  else dodgeLo();
  const ms = result === 'win' ? WIN_MS : result === 'draw' ? DRAW_MS : LOSE_MS;
  await wait(ms * SPEED);
  if (cur !== run || token !== perfRun) return result;
  state.roundEnd = false;
  if (cur.flat < 0) {                           /* 教学迷你局：不推进不计分不复盘 */
    if (state.tut === 'watch') return result;   /* watch 演示局：tutorialWatch 收尾接管（不重开） */
    startLevel(firstFlat);                      /* turn 阶段迷你局走完 → 进正式首关 */
    return result;
  }
  cur.results.push(result);
  cur.score += result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  cur.step++;                                   /* 完成局数（quiz.step 由局号派生） */
  renderRoundDots();
  if (result === 'lose' && cur.kind === 'battle') {   /* 负局 AI 复盘（classic 专属，§-r18 delta3） */
    cur.review = engReview(g.hist);             /* 末次负局复盘快照（TK.review） */
    if (cur.review) {
      await showReview(cur.review);
      if (cur !== run || token !== perfRun) return result;
    }
  }
  if (cur.roundIdx >= ROUNDS - 1) {             /* 第 3 局走完=通关（负/平也完成——永不 0★） */
    cur.done = true;
    winFlow();
    return result;
  }
  startRound(cur.roundIdx + 2);                 /* 起下一局（演出窗已覆盖防重入——新局可交互） */
  return result;
}
/* 负局复盘层：迷你棋盘（失误步局面）+红=实际格/绿=更优格 breathe+tk_review；
   REVIEW_MS 窗自动关/tap 提前关（verify 页 SPEED 提速） */
async function showReview(rv) {
  state.review = true;
  const ov = document.createElement('div');
  ov.className = 'k-review';
  const mk = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html != null) d.innerHTML = html; return d; };
  ov.appendChild(mk('rv-title', '第' + rv.moveNo + '手，想一想'));
  const bd = mk('rv-board');
  for (let i = 0; i < 9; i++) {
    const c = mk('rv-cell' + (i === rv.missCell ? ' rev-miss' : i === rv.bestCell ? ' rev-best' : ''));
    c.dataset.i = i;
    if (rv.boardBefore[i]) c.innerHTML = rv.boardBefore[i] === 'X' ? X_SVG : O_SVG;
    bd.appendChild(c);
  }
  ov.appendChild(bd);
  ov.appendChild(mk('rv-legend', '红=刚才那一手，绿=更好的一步'));
  document.body.appendChild(ov);
  sayR(VOICE.review.key, VOICE.review.text);
  await new Promise(res => {
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      clearTimeout(tid);
      ov.removeEventListener('pointerdown', fin);
      ov.remove();
      res();
    };
    const tid = setTimeout(fin, REVIEW_MS * SPEED);
    ov.addEventListener('pointerdown', fin);
  });
  state.review = false;
}

/* ================= 过关推进（celebrate → persistWin → 章末/日末）
   persistWin 抽独立函数：verify 页 KIDS 未 init（save=null）安全跳过，
   verify 单元⑪ init 后=真实写档链（localStorage kidsgame_tictac） ================= */
function persistWin(stars) {
  const sv = KIDS._save();
  if (!sv || !sv.levels) return { chapterDone: false };   /* verify 沙盒未 init=安全跳过 */
  return KIDS.level.pass(cur.ch, cur.lv, stars, [0, 1, 2, 3, 4, 5]);
}
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<7——r18 七章域）；生成关=实算下一关随机章型
     GEN[dch-1]（家族 F：genLevel 纯函数确定性，同 flat 恒同 dch——禁章序右移） */
  return ci < N_CHAPTERS ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
}
function winFlow() {
  state.won = true;
  perfRun++;                                    /* 通关中止在途演出 */
  ghost.hide();
  bunnyHide();
  const stars = engStars(cur);
  sfx('win');
  sayR(VOICE.right.key, VOICE.right.text);      /* tk_right：赢啦，小冠军（2304ms） */
  if (VERIFY) { persistWin(stars); return; }    // verify 页：不弹层不写档（init 沙盒除外——单元⑪）
  KIDS.ui.celebrate(stars).then(async () => {
    await wait(400);                            /* 家族 H：celebrate 2620+400=3020 ≥ 2304+300=2604 */
    const pr = persistWin(stars);
    renderDots();
    const lim = KIDS.calendar.limit(Infinity);
    const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
    if (pr.chapterDone) {
      const stars6 = [0, 1, 2, 3, 4, 5].reduce((s, l) => s + KIDS.level.stars(cur.ch, l), 0);
      KIDS.ui.chapterEnd({ chapter: cur.ch, stars: stars6, nextHint: nextHint(cur.flat) });
      setTimeout(proceed, 3400);
    } else if (dayDone) {
      KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });   /* 家族 A（r17 双 lim-1）：winFlow 传 lim-1 */
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
  bunnyHide();
  perfRun++;                                    /* 中止在途演出（重玩/换关） */
  cur = genLevel(flat);
  state = { won: false, demo: false, tut: 'none', rabbit: false, roundEnd: false, review: false };
  helpRedemo = false;
  lastAct = Date.now();                         /* 开局重置 idle 锚（helpRedemo 已死保留防引用） */
  lastDir = Date.now();
  wrongChainUntil = 0; lastWrongVoice = 0;      /* 契约 I/J：关切换重置（残局错链窗/节流锚） */
  renderDots();
  const sv = KIDS._save() || { levels: {} };    // verify 页 KIDS 未 init，空档兜底
  const freshTut = !VERIFY && flat === 0 && !sv.levels['1-0'] &&
                   !(sv.tictac && sv.tictac.tutSeen);   /* 契约 E：先查教学特例再定行为 */
  if (freshTut) { tutorialWatch(); return; }
  if (cur.kind === 'puzzle') { loadPuzzle(0); return; }
  startRound(1);                                // 备局（verify 页同跑——autoSolve 需其推进）
  if (cur.kind === 'v44') sayR(VOICE.v44.key, VOICE.v44.text);          /* 变体开题句（不阻塞输入） */
  else if (cur.kind === 'vroll') sayR(VOICE.vroll.key, VOICE.vroll.text);
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独
   watch=幽灵手指看一局（5 手定版：X4 O1 X0 O2 X8——0-4-8 对角三连获胜，
   兔子应手为定版演出不走 AI；整局走完 __tkDemoR='done'——gate 口径）
   →turn=你来下一局（帮→独：迷你局2 真兔子随机档）。
   时序（家族 G/H）：watch clip 2952 → 延 3300（≥2952+300）；每手 ghost 600+320；
   兔子应手演出 800×2；胜局窗 2604——名义分账 10864ms ≤ 16000（build 静态断言）。
   turn clip 1752 → 延 2100（≥1752+300 防尾截）后读题。 ---------- */
function tutLevel() {
  const L = genLevel(0);
  L.flat = -1; L.ch = 0; L.dch = 1;             /* 教学迷你关（flat<0 不计分不救援不复盘） */
  return L;
}
async function tutorialWatch() {
  const t0w = Date.now();                       // watch 段计时锚（verify 单元② 预算 ≤16s 只罩 watch）
  perfRun++;
  state = { won: false, demo: true, tut: 'watch', rabbit: false, roundEnd: false, review: false };
  cur = tutLevel();
  cur.roundIdx = 0;
  cur.rounds[0] = { board: ['', '', '', '', '', '', '', '', ''], over: false, hist: [], xq: null, oq: null, moves: 0 };
  cur.rng = mulberry32(90001);                  /* 教学局独立种子（不进正式局 RNG 域） */
  cur._scriptO = [1, 2];                        /* 演示局定版兔子应手（教学期不走 AI） */
  renderDots(); renderBoard(); renderTurnUI(); renderRoundDots();
  qText('看，三个连一线就赢啦');
  sayR(VOICE.watch.key, VOICE.watch.text);      /* tk_tut_watch：看！三个连一线（2952ms） */
  await wait(3300 * SPEED);                     /* t=3300 ≥ 2952+300=3252：clip 播完再演（不撞头） */
  if (state.tut !== 'watch') return;
  /* —— 看一局（demo：幽灵手指逐手点格，5 手走完整局） —— */
  const plan = [4, 0, 8];                       /* X 三手：4 中心 → 0 角 → 8 对角成三连 */
  for (const i of plan) {
    pointGhostAt(cellEl(i));                    /* 幽灵手指指向落子格 */
    await wait(600 * SPEED);
    ghost.press();
    await wait(320 * SPEED);
    const r = await uiTapCell(i, true);         /* demo 通道豁免 demo 门（演示吞真实输入） */
    if (state.tut !== 'watch') return;
    if (r === 'win') break;                     /* 第 3 手 X8 终局（endRound 演出已含胜局窗） */
    await wait(200 * SPEED);
  }
  window.__tkDemoR = 'done';                    /* 整局演示走完实证（§0.27，gate 断言 'done'——终值语义） */
  window.__tkWatchMs = Date.now() - t0w;        /* watch 段实测时长（verify 单元② 家族预算 ≤16s） */
  /* —— turn 你来下一局（帮→独）：迷你局2 走完 → startLevel(firstFlat) —— */
  const sv = KIDS._save() || {};
  sv.tictac = sv.tictac || {};
  sv.tictac.tutSeen = true;
  if (KIDS._save()) KIDS.store.persist();
  state = { won: false, demo: false, tut: 'help', rabbit: false, roundEnd: false, review: false };
  cur = tutLevel();                             /* 迷你局2（真兔子随机档，rng 独立种子） */
  cur.roundIdx = 0;
  cur.rounds[0] = { board: ['', '', '', '', '', '', '', '', ''], over: false, hist: [], xq: null, oq: null, moves: 0 };
  cur.rng = mulberry32(90002);
  renderDots(); renderBoard(); renderTurnUI(); renderRoundDots();
  qText(PROMPT_TEXT);
  helpRedemo = false;
  lastAct = Date.now();
  lastDir = Date.now();
  sayR(VOICE.turn.key, VOICE.turn.text);        /* tk_tut_turn：你来下一局（1752ms） */
  setTimeout(() => {
    if (state.tut === 'help') sayR(VOICE.hint.key, VOICE.hint.text);   /* 开题读题 */
  }, 2100);                                     /* ≥1752+300=2052 防尾截（turn 后读题延） */
  setTimeout(() => { if (state.tut === 'help') pointHelpNext(); }, 600 * SPEED);
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
  el.classList.remove('breathe'); void el.offsetWidth;
  el.classList.add('breathe');
  setTimeout(() => ghost.press(), 800 * SPEED);
}
/* 教学"帮"阶段指向：当前局面最优落子格（engBestX——教学期泄答案=家族先例） */
function pointHelpNext() {
  const g = cur && cur.rounds[cur.roundIdx];
  if (!g || g.over) return;
  const b = engBestX(g.board);
  if (b != null) pointGhostAt(cellEl(b));
}

/* ================= 底栏与棋盘交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  hopRabbit();
  if (state.rabbit || state.roundEnd || state.demo || state.won || state.review) { sfx('pop'); return; }   /* §0.20 演出/教学期门+轻反馈 */
  lastAct = Date.now();
  hintNow();                                    /* 戳兔子=方向提示（残局按题型分流） */
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || cur.flat < 0) return;   /* 教学迷你关禁重演（重发=破坏教学时序） */
  if (state.rabbit || state.roundEnd || state.demo || state.won || state.review) return;   /* §0.20 演出期重演门 */
  lastAct = Date.now();
  replayAnim(replayBtn, 'bounce');
  startLevel(cur.flat);
});
hearBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur || cur.flat < 0) return;
  if (state.rabbit || state.roundEnd || state.demo || state.won || state.review) { sfx('pop'); return; }
  lastAct = Date.now();                         /* 主动重听重置 idle 锚（b25 M4） */
  replayAnim(hearBtn, 'bounce');
  hintNow();                                    /* 再听一遍：题面句按型分流+回锚 */
});
boardEl.addEventListener('pointerdown', e => {
  const p = e.target.closest('.cell');
  if (!p) return;
  e.preventDefault();
  uiTapCell(Number(p.dataset.i));
});
boardWrapEl.addEventListener('pointerdown', e => {   /* 点棋盘垫空白=重听题面（高发探索动作） */
  if (e.target.closest('.cell')) return;        // 格点击已由 boardEl 路径处理（防双触发）
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.rabbit || state.roundEnd || state.demo || state.won || state.review) { sfx('pop'); return; }   /* §0.22 演出期空白轻叮 */
  lastAct = Date.now();                         /* 主动重听重置 idle 锚（b25 M4） */
  hintNow();
});
$id('stage').addEventListener('pointerdown', e => {
  if (e.target.closest('.cell') || e.target.closest('#board-wrap')) return;
  /* 空白/探索点击：10s 节流轻提示（§0.16）；不重置救援钟（§0.7a） */
  e.preventDefault();
  if (VERIFY || !cur) return;
  if (state.rabbit || state.roundEnd || state.demo || state.won || state.review) { sfx('pop'); return; }   /* §0.22 教学/演出期空白轻叮 */
  if (Date.now() - lastBlankHint > 10000) {
    lastBlankHint = Date.now();
    hintNow();                                  /* 空白探索=方向提示（按型分流） */
  }
});

/* ================= 无操作看护：14s 方向级（重播提示+回锚，lastDir 独立节流锚，不重置
   lastAct——30s 答案级不被饿死）/ 30s 答案级（最优格 breathe+重播）。
   对战关无错链豁免窗（契约 I 策略款豁免备案——miss 恒 0）；残局关错链窗内救援让路
   （契约 I r18：if (Date.now() < wrongChainUntil) return;）。
   审查 m1：教学迷你关不救援（局类款教学演示本身动态——turn 开题 600ms 指一次即足）。 ================= */
function rescueTick() {
  if (VERIFY || !cur || state.won || state.rabbit || state.roundEnd || state.demo || state.review) return;
  if (cur.flat < 0) return;                     /* 教学迷你关不救援 */
  if (cur.done) return;
  if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;
  /* 面板在场守卫（契约 K）：面板遮挡期救援静默（试玩 P2-3：层在时点击全吞却重播读题） */
  if (document.querySelector('.k-review')) return;   /* 复盘层在场同守卫（§-r18 复盘窗不抢救援） */
  if (Date.now() < wrongChainUntil) return;     /* 契约 I：错链豁免窗内救援让路（残局） */
  if (cur.kind === 'puzzle') {                  /* 残局救援：题面句按型分流+答案级=答案格 */
    const q = cur.puzzles && cur.puzzles[cur.step];
    if (!q || q.solved) return;
    const idle = Date.now() - lastAct;
    const vk = q.ptype === 'win1' ? VOICE.puzWin : q.ptype === 'block1' ? VOICE.puzBlock : VOICE.puzFork;
    if (idle > 30000) {                         /* 答案级：静音也能看见答案线索 */
      const el = cellEl(q.answer);
      if (el) replayAnim(el, 'breathe');
      sayR(vk.key, vk.text);
      lastAct = Date.now();
      return;
    }
    if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播题面+回锚（不动 lastAct） */
      sayR(vk.key, vk.text);
      puzDirAnchor(q);
      lastDir = Date.now();
    }
    return;
  }
  const g = cur.rounds[cur.roundIdx];
  if (!g || g.over) return;
  const idle = Date.now() - lastAct;
  if (idle > 30000) {                           /* 答案级：静音也能看见答案线索 */
    const b = cur.kind === 'v44' ? engV44(g.board.slice(), 'X')
            : cur.kind === 'vroll' ? engRollPick({ board: g.board.slice(), xq: g.xq.slice(), oq: g.oq.slice() }, 'X')
            : engBestX(g.board);
    if (b != null) { const el = cellEl(b); if (el) replayAnim(el, 'breathe'); }
    sayR(VOICE.hint.key, VOICE.hint.text);
    lastAct = Date.now();
    return;
  }
  if (idle > 14000 && Date.now() - lastDir > 14000) {   /* 方向级：重播提示+回锚（不动 lastAct） */
    sayR(VOICE.hint.key, VOICE.hint.text);
    dirAnchor();
    lastDir = Date.now();
  }
}
setInterval(rescueTick, 1000);   /* 命名函数 rescueTick（契约 K 源码级断言，照 b28 m4） */

/* ================= 启动（verify 分支由 game-verify.js 接管；迁移 IIFE 已先行） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'tictac', title: '井字棋小冠军' });   // 存档键 kidsgame_tictac（core VER 1.0，家族 C）
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {  // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim - 1) });          /* 家族 A：启动处传 lim-1 */
    first = Math.max(0, lim - 1);               /* r17：日末停留今日末关（可重玩） */
  }
  firstFlat = first;
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；start(flat)=外部切关入口；
   真实页同暴露 window.TK——b29 坑⑥：verify 页独占钩子=驱动假阳性）。
   tapCell 返回：对战 'moved'/'win'|'draw'|'lose'（不自动重开，引擎起下一局或通关）；
   残局 'right'/'done'/'wrong'/已占或窗内错点=false/反馈窗=null。
   quiz/currentLevel 分题型（§-r18 §8）：对战 miss 恒 0（策略款备案）；残局 miss 累计；
   step=flat*3+round-1（对战局粒度）/flat*5+题号-1（残局题粒度）。
   final() 返回末局终局快照 {result,line}；review() 返回末次负局复盘快照
   {moveNo,missCell,bestCell,boardBefore}（classic 专属）。================= */
window.TK = {
  start(flat) { startLevel(flat); },
  get currentLevel() {
    if (!cur) return null;
    return { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, kind: cur.kind,
             round: cur.kind === 'puzzle' ? cur.step + 1 : cur.roundIdx + 1,
             n: cur.kind === 'puzzle' ? PUZZLES : ROUNDS,
             score: cur.score, step: cur.step,
             done: cur.done, won: state.won,
             miss: cur.kind === 'puzzle' ? cur.miss : 0,   /* 分题型：对战恒 0/残局累计 */
             stars: engStars(cur), results: cur.results.slice() };
  },
  get quiz() {
    if (!cur || cur.done) return null;
    if (cur.kind === 'puzzle') {
      const q = cur.puzzles && cur.puzzles[cur.step];
      if (!q) return null;
      return { kind: 'puzzle', ptype: q.ptype, board: q.board.slice(), answer: q.answer,
               turn: 'k', round: cur.step + 1, score: 0,
               step: cur.flat * PUZZLES + (cur.step + 1) - 1,   /* 全关题号=flat*5+题号-1 */
               miss: cur.miss };
    }
    const g = cur.rounds && cur.rounds[cur.roundIdx];
    if (!g) return null;
    const out = { kind: cur.kind,                 /* battle 9 格/v44 16 格当前局棋盘 */
                  board: g.board.slice(),
                  turn: 'k',                      /* 恒 'k'（孩子执子方） */
                  round: cur.roundIdx + 1,        /* 关内局号 1-3 */
                  score: cur.score,               /* 本关得分累进 0-3 步进 0.5 */
                  step: cur.flat * 3 + (cur.roundIdx + 1) - 1,   /* 全关局号=flat*3+round-1 */
                  miss: 0 };                      /* 对战恒 0（策略款 SPEC 备案） */
    if (cur.kind === 'vroll') { out.xq = g.xq.slice(); out.oq = g.oq.slice(); out.moves = g.moves; }
    return out;
  },
  tapCell(i) { return uiTapCell(i); },
  async autoSolve() {                    // UI 路径自动点完当前关（按型分流取子策略，
    let taps = 0, guard = 0;             // 走真实判定链；兔子应手/结算/复盘窗自动推进只等待）
    while (cur && !cur.done && guard++ < 600) {
      let wg = 0;
      while (wg++ < 6000) {
        if (!cur || cur.done) break;
        if (state.review) { await wait(50); continue; }
        if (cur.kind === 'puzzle') {
          const q = cur.puzzles[cur.step];
          if (q && !q.solved && !state.roundEnd && !state.won && !state.demo) break;
        } else {
          const g = cur.rounds[cur.roundIdx];
          if (g && !g.over && !state.rabbit && !state.roundEnd && !state.demo && !state.won) break;
        }
        await wait(50);
      }
      if (!cur || cur.done) break;
      let i;
      if (cur.kind === 'puzzle') {
        const q = cur.puzzles[cur.step];
        if (!q || q.solved) continue;
        i = q.answer;
      } else {
        const g = cur.rounds[cur.roundIdx];
        if (!g || g.over) continue;
        if (cur.flat < 0) i = emptiesOf(g.board)[0] || 0;   /* 教学迷你局任意合法子 */
        else if (cur.kind === 'v44') i = engV44(g.board.slice(), 'X');
        else if (cur.kind === 'vroll') i = engRollPick({ board: g.board.slice(), xq: g.xq.slice(), oq: g.oq.slice() }, 'X');
        else i = engAutoPick(g.board);
      }
      if (i == null) break;
      const r = await uiTapCell(i);
      if (r === 'moved' || r === 'win' || r === 'draw' || r === 'lose' ||
          r === 'right' || r === 'done') taps++;
      else await wait(300);              /* 演出窗吞 null/false→300ms 间隔重试（b34 坑④） */
    }
    return { done: !!(cur && cur.done), taps: taps };
  },
  get final() {
    return cur && cur.lastFinal
      ? { result: cur.lastFinal.result, line: cur.lastFinal.line ? cur.lastFinal.line.slice() : null }
      : null;
  },
  get review() {
    return cur && cur.review
      ? { moveNo: cur.review.moveNo, missCell: cur.review.missCell, bestCell: cur.review.bestCell,
          boardBefore: cur.review.boardBefore.slice() }
      : null;
  },
  get tutorial() { return state.tut; }
};
