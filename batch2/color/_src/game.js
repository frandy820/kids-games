/* ============================================================
 * 涂色本（color）— 游戏逻辑
 * v1 玩法（ch1 底座保留）：点颜色→点线稿闭区域填色（SVG fill 切换，即时+pop 音）；
 *  全部填满=3 星自动过关；≥60% 点"完成"=2 星；40-60% 温和提示后再点=1 星。
 * r6 难度改造（2026-09-13，真值源=SPEC-BATCH2.md §5，审计红款#6：
 *  零判定纯涂色 → 约束推导涂色+调色合成）：
 *  ch1 flat0-4  free  自由涂色（机制零改动，教学/奖励底座）
 *  ch2 flat5-9  match 参考图记忆配色（左参考图首涂即藏；逐格判定，错格闪不泄色）
 *  ch3 flat10-14 mix  三原色调色（两 tap=一次混合；当前目标桶；封闭表 6 条）
 *  ch4 flat15-19 pat  规律涂色（前 3 格预涂，第 4 格起自推；AB/ABC/AAB+生成）
 *  flat≥20 混排三模式；新三模式 miss 口径 0/≤2/else=3/2/1 星，全对自动过关。
 * 会话结构（spec §2 / batch2 §3）：5 关=1 章；celebrate→level.pass→章末/日完。
 * 自由画布：白板 canvas 画笔（粗细 8/12/20）+橡皮+长按 1 秒清空（进度环提示）。
 * 语音：v1 三键 sayP（flat<3）；r6 六键 clr_* sayR 全关可播（锚点反馈必须可听）。
 * ============================================================ */
(() => {
'use strict';
const byId = id => document.getElementById(id);
const PAPER = '#FFFDF7';
const INK = '#4A3B2E';

/* ---------- 图标（零文字依赖，圆润 + 暖棕描边） ---------- */
const SWi = 'stroke="#4A3B2E" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
const ICON = {
  logo: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 16 Q74 14 82 34 Q90 54 70 66 L66 80 Q64 86 58 84 L44 78 Q20 70 18 48 Q16 24 50 16 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="40" cy="38" r="6" fill="#E0503C"/><circle cx="60" cy="34" r="6" fill="#F5C445"/>' +
    '<circle cx="68" cy="52" r="6" fill="#8FBF7F"/><circle cx="48" cy="58" r="6" fill="#6E9BD8"/></svg>',
  home: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 14 L88 46 H78 V82 H22 V46 H12 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="5"/>' +
    '<rect x="42" y="56" width="16" height="26" rx="6" fill="#E8975A"/></svg>',
  map: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="14" y="14" width="32" height="32" rx="8" fill="#E8975A" stroke="' + INK + '" stroke-width="5"/>' +
    '<rect x="54" y="14" width="32" height="32" rx="8" fill="#8FBF7F" stroke="' + INK + '" stroke-width="5"/>' +
    '<rect x="14" y="54" width="32" height="32" rx="8" fill="#8FBF7F" stroke="' + INK + '" stroke-width="5"/>' +
    '<rect x="54" y="54" width="32" height="32" rx="8" fill="#F2B8C6" stroke="' + INK + '" stroke-width="5"/></svg>',
  undo: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M26 44 h30 a20 20 0 0 1 0 40 h-18" ' + SWi + '/>' +
    '<path d="M38 28 L22 44 L38 60 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/></svg>',
  done: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="50" cy="50" r="34" fill="#8FBF7F" stroke="' + INK + '" stroke-width="5"/>' +
    '<path d="M34 52 L46 64 L68 38" stroke="#FFF9EE" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  brush: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M62 14 Q78 12 82 28 L46 64 L34 52 Z" fill="#F0913D" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M34 52 L22 74 Q20 82 28 80 L46 64 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M18 86 q10 6 22 2" ' + SWi + '/></svg>',
  eraser: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M28 66 L54 20 Q58 14 64 18 L80 28 Q86 32 82 38 L56 82 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M28 66 L56 82 M44 46 L64 58" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M24 88 h52" ' + SWi + '/></svg>',
  clock: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="24" cy="26" r="15" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M24 18 v8 l6 4" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M16 8 h16" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/></svg>',
  star: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 8 L61 35 L90 38 L68 58 L74 88 L50 73 L26 88 L32 58 L10 38 L39 35 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="4"/></svg>',
  finger: '<svg viewBox="0 0 58 78" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M29 6 c9 0 13 6 13 15 v20 c7 2 9 9 6 16 l-7 13 h-26 l-7 -18 c-2 -7 2 -11 8 -10 v-21 c0 -9 5 -15 13 -15 z" ' +
    'fill="rgba(255,255,255,.9)" stroke="rgba(74,59,46,.55)" stroke-width="3" stroke-linejoin="round"/></svg>'
};

/* ---------- 状态 ---------- */
const CH_LEN = 5, TOTAL_STATIC = 20;
const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);        /* 章号 1 基 */
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const ST = { verify: false, modesSeen: {} };
let cur = null;                 /* { ci, li, level } level.mode=free|match|mix|pat */
let regions = [];               /* [{i, el, fill}] fill=色号或 null（match=已验证对色） */
let undoStack = [];             /* 撤销栈 ≥30（上限 200） */
let selColor = 0;
let lastAct = Date.now();
let state = { won: false, hinted: false, tut: null, tutFills: 0 };
let tutTimer = null, autoWinT = null;
let mstate = null;              /* r6 新模式状态：match{miss,tried} / mix{miss,slot,cur,marks} / pat{miss,cells} */

/* r6 语音窗家族（SPEC §5；r4 m-5 定版 n*345+600，禁 +300 变体——build/verify/SPEC 四处同步） */
const estMs = n => n * 345 + 600;

/* 语音仅前 3 关（flat<3）；core 低频语音不受影响（照 pipe sayP） */
const sayP = (key, text) => { if (cur && cur.ci * CH_LEN + cur.li < 3) KIDS.voice.play(key, text); };
/* r6 锚点/开场语音：全关可播（colormix b22 sayR 先例——方向锚反馈必须可听，不设 flat<3 门） */
const sayR = v => { if (cur) KIDS.voice.play(v.key, v.text); };
const R6V = {
  matchIntro: { key: 'clr_match_intro', text: '看看小图，涂出一模一样的' },
  matchWrong: { key: 'clr_match_wrong', text: '这一格的颜色不一样哦' },
  mixIntro:   { key: 'clr_mix_intro',   text: '两个颜色抱一抱，变出它' },
  mixWrong:   { key: 'clr_mix_wrong',   text: '再试试别的两个颜色' },
  patIntro:   { key: 'clr_pat_intro',   text: '看看前面的顺序，接着涂' },
  patWrong:   { key: 'clr_pat_wrong',   text: '看看前面几格的顺序' }
};

/* ---------- 场景 ---------- */
function showScene(name) {
  document.querySelectorAll('.scene').forEach(s => s.classList.remove('on'));
  byId('scene-' + name).classList.add('on');
  if (name === 'free') { fitCanvas(); repaintFree(); }
}

/* ---------- 调色盘（12 色大色块 ≥56px，间距 ≥16px；两处共用；pat 模式传色号子集） ---------- */
function buildPalette(box, onPick, colors) {
  box.innerHTML = '';
  const idxs = colors || COL_PAL.map((_, i) => i);     /* 参数与缺省均为 COL_PAL 色号（v1 语义不变） */
  idxs.forEach((c, n) => {
    const b = document.createElement('button');
    b.className = 'swatch'; b.dataset.c = String(c);
    b.style.background = COL_PAL[c];
    b.setAttribute('aria-label', '颜色' + (n + 1));
    b.addEventListener('pointerdown', e => { e.stopPropagation(); onPick(c); });
    box.appendChild(b);
  });
}
const pickPlay = i => {                                   /* play 场景选色（free/match/pat 共用） */
  selColor = i; markSel(byId('palette'));
  KIDS.audio.unlock(); KIDS.audio.sfx('click'); lastAct = Date.now();
};
function markSel(box) {
  box.querySelectorAll('.swatch').forEach(b => b.classList.toggle('sel', +b.dataset.c === selColor));
}

/* ---------- 首页 ---------- */
function nextFlat() {
  const lim = KIDS.calendar.limit(Infinity), sv = KIDS._save(), keys = keysUpTo(lim);
  for (let i = 0; i < lim; i++) if (!sv.levels[keys[i]]) return i;
  return 0;                                    /* 今日全完成→从头无限重玩 */
}
function artThumb(picIdx, size) {
  return '<svg viewBox="0 0 200 200" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg">' + COL_PICS[picIdx].art() + '</svg>';
}
/* r6 试玩 P1：pat 关（flat15-19/gen 分段）colGetLevel 返回 {mode:'pat',period,cells,...} 无 picIdx——
   showHome 无条件 artThumb(lv.picIdx) 必崩致首页白屏+存档死锁。pat 专用缩略图=period 循环涂满的圆珠条
   （章节标识性质，规律本身即题面预告非答案） */
function patThumb(lv, size) {
  const per = lv.period || [0, 2], n = lv.cells || 10;
  let s = '';
  for (let i = 0; i < n; i++) {
    const cx = 25 + (i % 5) * 38, cy = 30 + Math.floor(i / 5) * 80;
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="14" fill="' + COL_PAL[per[i % per.length]] + '" ' +
         'stroke="#4A3B2E" stroke-width="3"/>';
  }
  return '<svg viewBox="0 0 200 200" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg">' + s + '</svg>';
}
function showHome() {
  stopTut();
  const nf = nextFlat(), lv = colGetLevel(nf), sv = KIDS._save();
  byId('logo').innerHTML = ICON.logo;
  const card = byId('card-color');
  let stars = '';
  const got = (sv.levels[keyOf(nf)] || {}).stars || 0;
  for (let n = 1; n <= 3; n++) stars += '<span class="hstar' + (got >= n ? '' : ' off') + '">★</span>';
  card.innerHTML = '<div class="thumb">' + (lv.mode === 'pat' ? patThumb(lv, 120) : artThumb(lv.picIdx, 120)) + '</div><div class="stars">' + stars + '</div>' +
    '<div class="badge">' + ICON.star + '</div>';
  const dots = byId('today-dots');
  dots.innerHTML = '';
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim);
  for (let i = Math.max(0, lim - 6); i < lim; i++) {
    const d = document.createElement('div');
    d.className = 'tdot' + (sv.levels[keys[i]] ? ' done' : '');
    dots.appendChild(d);
  }
  showScene('home');
}

/* ---------- 关卡加载 ---------- */
function buildArt(container, picIdx) {
  container.innerHTML = '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">' + COL_PICS[picIdx].art() + '</svg>';
  const els = container.querySelectorAll('.rg');
  els.forEach((el, i) => { el.dataset.r = String(i); el.style.fill = ''; el.style.cursor = 'pointer'; });
  return Array.from(els);
}
/* ---------- M6：小区域命中外扩 aid ----------
   泡泡/樱桃/气球结等小区域渲染后 <64px 触摸目标。布局后量测，给可外扩的小区域加
   透明命中圆（直径 ≥66px）；elementFromPoint 网格采样计算与其它区域的重叠比例，
   优先找 0 重叠位（沿上/下平移重试），找不到则取重叠 ≤30% 的最优位（误点落到邻区
   可立即重填，零惩罚）。无法外扩的（嵌套如内耳/樱桃、或细长条如花茎桅杆——沿长度
   本身可点）跳过并在 verify 记录核对。 */
function addHitAids(container) {
  const svg = container.querySelector('svg');
  if (!svg) return { aids: [], skipped: [] };
  svg.querySelectorAll('.rg.hitaid').forEach(e => e.remove());
  const artR = svg.getBoundingClientRect();
  if (artR.width < 40) return { aids: [], skipped: [] };    // 场景未显示（无布局）
  const k = 200 / artR.width;                               // px → viewBox 单位
  const aids = [], skipped = [];
  regions.forEach(r => {
    const rr = r.el.getBoundingClientRect();
    const minDim = Math.min(rr.width, rr.height);
    if (minDim >= 63.5) return;                             // 已达标
    const cx = rr.left + rr.width / 2, cy = rr.top + rr.height / 2;
    const rpx = Math.max(33, minDim / 2 + 3);               // 半径：直径 ≥66px（宽高比微差余量）
    const overlapFrac = (x, y) => {
      let hit = 0, tot = 0;
      for (let dx = -(rpx - 4); dx <= rpx - 4; dx += 8)
        for (let dy = -(rpx - 4); dy <= rpx - 4; dy += 8) {
          if (dx * dx + dy * dy > rpx * rpx) continue;
          tot++;
          const el = document.elementFromPoint(x + dx, y + dy);
          const rg = el && el.closest ? el.closest('#art .rg') : null;
          if (rg && !rg.classList.contains('hitaid') && rg !== r.el) hit++;
        }
      return tot ? hit / tot : 1;
    };
    /* 距离优先网格搜索（垂直为主+水平档）：夹缝小区域（气球结2 上下都是球）纯垂直无解 */
    let best = null;
    const cands = [];
    for (const dy of [0, -14, 14, -28, 28, -42, 42, 56])
      for (const dx of [0, -20, 20, -40, 40]) cands.push([dx, dy]);
    cands.sort((a, b) => (Math.abs(a[0]) + Math.abs(a[1])) - (Math.abs(b[0]) + Math.abs(b[1])));
    for (const cd of cands) {
      const nx = Math.min(Math.max(cx + cd[0], artR.left + rpx + 2), artR.right - rpx - 2);
      const ny = Math.min(Math.max(cy + cd[1], artR.top + rpx + 2), artR.bottom - rpx - 2);
      const f = overlapFrac(nx, ny);
      if (f === 0) { best = { x: nx, y: ny, f: 0 }; break; }
      if (!best || f < best.f) best = { x: nx, y: ny, f: f };
    }
    if (!best || best.f > 0.35) { skipped.push(r.i); return; }   /* ≤35% 邻区重叠可接受（误点可重填零惩罚） */
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'rg hitaid');
    c.setAttribute('cx', ((best.x - artR.left) * k).toFixed(1));
    c.setAttribute('cy', ((best.y - artR.top) * k).toFixed(1));
    c.setAttribute('r', (rpx * k).toFixed(1));
    c.dataset.r = String(r.i);
    svg.appendChild(c);
    aids.push(r.i);
  });
  return { aids: aids, skipped: skipped };
}
function loadLevel(ci, li) {
  stopTut(); clearTimeout(autoWinT);
  const flat = ci * CH_LEN + li;
  cur = { ci: ci, li: li, level: colGetLevel(flat) };
  mstate = null;
  byId('scene-play').dataset.mode = cur.level.mode;
  if (cur.level.mode === 'match') loadMatch();
  else if (cur.level.mode === 'mix') loadMix();
  else if (cur.level.mode === 'pat') loadPat();
  else loadFree(flat);
  lastAct = Date.now();
}
/* ---------- ch1 free：v1 机制零改动（r6 底座） ---------- */
function loadFree(flat) {
  regions = buildArt(byId('art'), cur.level.picIdx).map((el, i) => ({ i: i, el: el, fill: null }));
  /* 教玩观察 P2：误点主页再进不丢整关进度（按关暂存，buildArt 同图区域序确定 → 按索引还原） */
  if (!ST.verify) {
    const sv0 = KIDS._save();
    if (sv0 && sv0.col && sv0.col.wip && sv0.col.wip.flat === flat && Array.isArray(sv0.col.wip.fills)
        && sv0.col.wip.fills.length === regions.length) {
      regions.forEach((r, i) => {
        const fw = sv0.col.wip.fills[i];
        if (fw != null) { r.fill = fw; r.el.style.fill = COL_PAL[fw]; }
      });
    }
  }
  undoStack = []; state = { won: false, hinted: false, tut: null, tutFills: 0 };
  selColor = 0;
  buildPalette(byId('palette'), pickPlay); markSel(byId('palette'));
  buildPreview(); updateProgress();
  showScene('play');
  requestAnimationFrame(() => { if (document.querySelector('#scene-play.on') && cur && cur.level.mode === 'free') addHitAids(byId('art')); });
  if (flat === 0 && !ST.verify) startTutorial();
}
/* ---------- ch2 match：参考图记忆配色（首次填涂尝试=参考图隐藏；逐格判定制） ---------- */
function loadMatch() {
  regions = buildArt(byId('art'), cur.level.picIdx).map((el, i) => ({ i: i, el: el, fill: null }));
  mstate = { miss: 0, tried: false };
  undoStack = []; state = { won: false, hinted: false, tut: null, tutFills: 0 };
  selColor = 0;
  buildPalette(byId('palette'), pickPlay); markSel(byId('palette'));
  buildRef(); updateProgress();
  showScene('play');
  requestAnimationFrame(() => { if (document.querySelector('#scene-play.on') && cur && cur.level.mode === 'match') addHitAids(byId('art')); });
  modeIntro();
}
function buildRef() {                             /* 左侧参考图（缩小成品；mini-preview 在 match 关由 CSS 收起防泄底） */
  const box = byId('ref-box');
  box.innerHTML = artThumb(cur.level.picIdx, 200);
  box.querySelectorAll('.rg').forEach((el, i) => {
    el.style.fill = COL_PAL[cur.level.rec[i] != null ? cur.level.rec[i] : 2];
    el.style.cursor = ''; el.removeAttribute('data-r');
  });
  box.classList.remove('hidden');
}
function hideRef() {                              /* 记忆负荷：首次填涂尝试后收起（verify 负向断言防退化） */
  mstate.tried = true;
  byId('ref-box').classList.add('hidden');
}
function matchFill(i, colorIdx) {
  if (!regions[i] || state.won) return { ok: false, why: 'won' };
  if (!mstate.tried) hideRef();
  lastAct = Date.now();
  if (colorIdx === cur.level.rec[i]) {
    regions[i].fill = colorIdx; regions[i].el.style.fill = COL_PAL[colorIdx];
    KIDS.audio.sfx('pop');
    updateProgress();
    if (regions.every(r => r.fill != null)) queueWin();
    return { ok: true, correct: true };
  }
  mstate.miss++;
  flashEl(regions[i].el);                          /* 错格高亮位置，不泄颜色（方向锚） */
  showToast(R6V.matchWrong.text, R6V.matchWrong);
  return { ok: true, correct: false, miss: mstate.miss };
}
/* ---------- ch3 mix：三原色调色（当前目标桶制；R6_MIX_TABLE 封闭 6 条） ---------- */
function loadMix() {
  const lv = cur.level;
  regions = buildArt(byId('art'), lv.picIdx).map((el, i) => ({ i: i, el: el, fill: null }));
  const marked = {};
  lv.marks.forEach(k => { marked[k.r] = k; });
  regions.forEach(r => {                           /* 非目标区预涂 base 配色=画面上下文 */
    const k = marked[r.i];
    if (k) r.el.style.cursor = 'default';
    else { r.fill = lv.rec[r.i] != null ? lv.rec[r.i] : 2; r.el.style.fill = COL_PAL[r.fill]; r.el.style.cursor = 'default'; }
  });
  mstate = { miss: 0, slot: [], cur: 0, marks: lv.marks.map(k => ({ r: k.r, c: k.c, done: false })) };
  undoStack = []; state = { won: false, hinted: false, tut: null, tutFills: 0 };
  buildMixbar(); updateProgress();
  showScene('play');
  requestAnimationFrame(() => { if (document.querySelector('#scene-play.on')) addMixMarkers(); });
  modeIntro();
}
function addMixMarkers() {                         /* 目标区中心叠色滴标记（SVG 圆，pointer-events:none） */
  if (!cur || cur.level.mode !== 'mix' || !mstate) return;   /* RAF 迟到时关已切换——守卫 */
  const box = byId('art'), svg = box.querySelector('svg');
  if (!svg) return;
  const artR = svg.getBoundingClientRect();
  if (artR.width < 40) return;
  const k = 200 / artR.width;
  mstate.marks.forEach(mk => {
    const r = regions[mk.r];
    if (!r) return;
    const rr = r.el.getBoundingClientRect();
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'tg');
    c.setAttribute('cx', ((rr.left + rr.width / 2 - artR.left) * k).toFixed(1));
    c.setAttribute('cy', ((rr.top + rr.height / 2 - artR.top) * k).toFixed(1));
    c.setAttribute('r', 11);
    c.style.fill = COL_PAL[mk.c];
    mk.el = c; svg.appendChild(c);
  });
}
function buildMixbar() {
  const bar = byId('mixbar');
  bar.innerHTML = '';
  R6_MIX_PRIM.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'swatch mprim'; b.dataset.c = String(c);
    b.style.background = COL_PAL[c];
    b.setAttribute('aria-label', '颜料' + (i + 1));
    b.addEventListener('pointerdown', e => { e.stopPropagation(); KIDS.audio.unlock(); mixPick(c); });
    bar.appendChild(b);
  });
  const bowl = document.createElement('div'); bowl.id = 'bowl';
  bowl.innerHTML = '<div class="slot" id="slot-a"></div><span id="mix-plus">+</span><div class="slot" id="slot-b"></div>';
  bar.appendChild(bowl);
  const tb = document.createElement('div'); tb.id = 'target-bucket'; tb.setAttribute('aria-label', '目标颜色');
  bar.appendChild(tb);
  renderMix();
}
function renderMix() {                             /* 缸槽/当前目标桶渲染（零文字：色块+虚线框） */
  if (!mstate) return;
  ['a', 'b'].forEach((s, i) => {
    const el = byId('slot-' + s);
    const c = mstate.slot[i];
    el.className = 'slot' + (c != null ? ' full' : '');
    el.style.background = c != null ? COL_PAL[c] : '';
  });
  const tb = byId('target-bucket');
  const t = cur.level.targets[mstate.cur];
  tb.style.background = t != null ? COL_PAL[t] : '#8FBF7F';
  tb.className = t != null ? '' : 'done-all';
}
function mixPick(c) {                              /* 点两次原色=一次混合（两次混合操作） */
  if (!mstate || state.won) return { ok: false, why: 'won' };
  if (R6_MIX_PRIM.indexOf(c) < 0) return { ok: false, why: 'notprimary' };
  KIDS.audio.unlock(); KIDS.audio.sfx('click'); lastAct = Date.now();
  mstate.slot.push(c);
  renderMix();
  if (mstate.slot.length < 2) return { ok: true, pending: true, slot: mstate.slot.slice() };
  const pair = mstate.slot[0] + '+' + mstate.slot[1];
  mstate.slot = [];
  const res = R6_MIX_TABLE[pair];                  /* 表外（同色对）=res undefined → 错混 */
  const target = cur.level.targets[mstate.cur];
  if (res != null && res === target) {
    const spd = ST.verify ? 0 : 1;
    const tok = cur;                               /* 填充动画令牌：换关后不再落色 */
    mstate.marks.forEach(mk => {
      if (mk.c === target && !mk.done) {
        mk.done = true;
        if (mk.el) mk.el.classList.add('done');
        const r = regions[mk.r];
        setTimeout(() => { if (cur === tok) { r.fill = target; r.el.style.fill = COL_PAL[target]; KIDS.audio.sfx('pop'); updateProgress(); } }, 160 * spd);
      }
    });
    mstate.cur++;
    renderMix(); updateProgress();
    KIDS.audio.sfx('coin');
    if (mstate.cur >= cur.level.targets.length) queueWin();
    return { ok: true, result: res, correct: true };
  }
  mstate.miss++;
  renderMix();
  showToast(R6V.mixWrong.text, R6V.mixWrong);
  return { ok: true, result: res == null ? null : res, correct: false, miss: mstate.miss };
}
/* ---------- ch4 pat：规律涂色（前 3 格预涂，第 4 格起自推；错涂方向锚） ---------- */
function loadPat() {
  const lv = cur.level;
  mstate = { miss: 0, cells: Array.from({ length: lv.cells }, (_, k) => ({ want: lv.period[k % lv.period.length], got: null })) };
  regions = [];                                    /* pat 无 SVG 区域（COL.regions 为空，格子走 patState） */
  undoStack = []; state = { won: false, hinted: false, tut: null, tutFills: 0 };
  const uniq = [];
  lv.period.forEach(c => { if (uniq.indexOf(c) < 0) uniq.push(c); });
  buildPalette(byId('palette'), pickPlay, uniq);
  selColor = uniq[0]; markSel(byId('palette'));
  buildStrip(); updateProgress();
  showScene('play');
  modeIntro();
}
function buildStrip() {
  const art = byId('art');
  art.innerHTML = '';
  const strip = document.createElement('div'); strip.id = 'strip';
  mstate.cells.forEach((c, k) => {
    const d = document.createElement('button');
    d.className = 'pcell' + (k < cur.level.pre ? ' pre' : '');
    d.dataset.k = String(k);
    if (k < cur.level.pre) { c.got = c.want; d.style.background = COL_PAL[c.want]; }
    d.addEventListener('pointerdown', e => { e.stopPropagation(); KIDS.audio.unlock(); patFill(k, selColor); });
    strip.appendChild(d);
  });
  art.appendChild(strip);
}
function patFill(k, colorIdx) {
  if (state.won || !mstate.cells[k]) return { ok: false, why: 'won' };
  if (k < cur.level.pre || mstate.cells[k].got != null) return { ok: false, why: 'filled' };
  lastAct = Date.now();
  const el = document.querySelector('.pcell[data-k="' + k + '"]');
  if (colorIdx === mstate.cells[k].want) {
    mstate.cells[k].got = colorIdx;
    el.style.background = COL_PAL[colorIdx]; el.classList.add('fill');
    KIDS.audio.sfx('pop');
    updateProgress();
    if (mstate.cells.every(c => c.got != null)) queueWin();
    return { ok: true, correct: true };
  }
  mstate.miss++;
  flashEl(el);
  showToast(R6V.patWrong.text, R6V.patWrong);
  return { ok: true, correct: false, miss: mstate.miss };
}
/* ---------- r6 公共：过关/星级/反馈/开场 ---------- */
const missStars = () => (mstate && mstate.miss === 0 ? 3 : (mstate && mstate.miss <= 2 ? 2 : 1));
function queueWin() {
  clearTimeout(autoWinT);
  const tok = cur;                                 /* 关卡身份令牌：换关后旧定时器作废 */
  const spd = ST.verify ? 0 : 800;
  autoWinT = setTimeout(() => { if (!state.won && cur === tok) winFlow(missStars()); }, spd);
}
function flashEl(el) {                             /* 错格位置高亮 900ms（不泄正确颜色） */
  if (!el) return;
  el.classList.remove('wr');
  void el.offsetWidth;                             /* 重启动画 */
  el.classList.add('wr');
  setTimeout(() => el.classList.remove('wr'), 950);
}
function modeIntro() {                             /* 章首关或会话内首遇播开场（+横幅窗 estMs 家族） */
  const m = cur.level.mode, flat = cur.ci * CH_LEN + cur.li;
  const chapterFirst = flat >= 5 && flat < 20 && flat % CH_LEN === 0;
  if (!chapterFirst && ST.modesSeen[m]) return;
  ST.modesSeen[m] = true;
  const v = m === 'match' ? R6V.matchIntro : m === 'mix' ? R6V.mixIntro : R6V.patIntro;
  sayR(v);
  const b = byId('mode-banner');
  b.innerHTML = '<span class="bicon">' + (ICON.logoSmall || ICON.logo) + '</span><span>' + v.text + '</span>';
  b.classList.add('show');
  clearTimeout(b._h);
  b._h = setTimeout(() => b.classList.remove('show'), estMs(v.text.length));
}
function buildPreview() {                        /* 推荐配色小图（引导不强制） */
  const box = byId('mini-preview');
  box.innerHTML = artThumb(cur.level.picIdx, 200);
  box.querySelectorAll('.rg').forEach((el, i) => {
    el.style.fill = COL_PAL[cur.level.rec[i] != null ? cur.level.rec[i] : 2];
    el.style.cursor = ''; el.removeAttribute('data-r');
  });
}
const filledCount = () => regions.reduce((s, r) => s + (r.fill != null ? 1 : 0), 0);
function progressDots() {                          /* 进度点按模式取：free/match=区域，mix=目标区，pat=格子 */
  if (!cur) return regions.map(r => r.fill != null);
  const m = cur.level.mode;
  if (m === 'mix') return mstate ? mstate.marks.map(k => k.done) : [];
  if (m === 'pat') return mstate ? mstate.cells.map(c => c.got != null) : [];
  return regions.map(r => r.fill != null);
}
function updateProgress() {
  const box = byId('progress');
  box.innerHTML = '';
  progressDots().forEach(on => {
    const d = document.createElement('div');
    d.className = 'pdot' + (on ? ' on' : '');
    box.appendChild(d);
  });
}

/* ---------- 填色 / 撤销（点已填=换色覆盖，零惩罚） ---------- */
function doFill(i, colorIdx, opts) {
  if (!regions[i] || state.won) return false;
  const r = regions[i], prev = r.fill;
  r.fill = colorIdx; r.el.style.fill = COL_PAL[colorIdx];
  undoStack.push({ t: 'fill', i: i, prev: prev });
  if (undoStack.length > 200) undoStack.shift();
  if (!ST.verify) {   /* 关内进度暂存（教玩观察 P2） */
    const svw = KIDS._save();
    if (svw) { svw.col = svw.col || {}; svw.col.wip = { flat: cur.ci * CH_LEN + cur.li, fills: regions.map(r2 => r2.fill == null ? null : r2.fill) }; KIDS.store.persist(); }
  }
  KIDS.audio.sfx('pop');
  lastAct = Date.now();
  if (state.tut && !opts?.demo) { state.tutFills++; if (state.tutFills >= 2) stopTut(); }   /* 独：孩子填 2 个区域后放手 */
  updateProgress();
  if (filledCount() === regions.length) {                                       /* 全填满=3 星自动过关 */
    clearTimeout(autoWinT);
    autoWinT = setTimeout(() => { if (!state.won && filledCount() === regions.length) winFlow(3); }, 800);
  }
  return true;
}
function undoPlay() {
  const u = undoStack.pop();
  if (!u) { KIDS.audio.sfx('click'); return false; }
  const r = regions[u.i];
  r.fill = u.prev;
  r.el.style.fill = u.prev == null ? '' : COL_PAL[u.prev];
  KIDS.audio.sfx('click');
  updateProgress();
  return true;
}

/* ---------- 完成判定 ----------
 * 100%=3 星；≥60%=2 星；40-60% 首次点完成=温和提示，再点=1 星；<40%=只提示。
 * 提示不算失败：覆盖/撤销/继续填不受任何影响。 */
function doneEval() {
  const total = regions.length, filled = filledCount();
  if (total && filled === total) return { win: true, stars: 3 };
  if (total && filled / total >= 0.6) return { win: true, stars: 2 };
  if (total && filled / total >= 0.4) return state.hinted ? { win: true, stars: 1 } : { win: false, hint: true };
  return { win: false, hint: true };
}
function showToast(text, voice) {                  /* free 沿用默认文案；r6 错误方向锚换文案+播报 */
  const t = byId('toast');
  t.querySelector('#toast-text').textContent = text || '还有空白哦';
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 1900);
  if (voice) sayR(voice);
}
let lastHintAt = 0;
async function doDone() {
  if (!cur || state.won) return { win: false, already: true };
  if (cur.level.mode !== 'free') return { win: false, nomode: true };   /* r6 新模式=全对自动过关，无完成按钮 */
  if (Date.now() - lastHintAt < 2500) return { win: false, cooldown: true };   /* 教玩观察 P2：toast 窗内冷却，防双击习惯误收 1 星（冷却后再点仍按 spec=1 星） */
  const ev = doneEval();
  if (ev.hint) {
    state.hinted = true;
    lastHintAt = Date.now();
    KIDS.audio.sfx('pop');
    showToast();
    sayP('clr_hint', '点颜色，再点图画');
    return { win: false, hint: true };
  }
  await winFlow(ev.stars);
  return { win: true, stars: ev.stars };
}

/* ---------- 过关流程（celebrate → level.pass → 章末/日完，照 pipe winFlow） ---------- */
/* r6 章末预告（hints[ci]=预告第 ci+1 章，0 基）：ch2 记忆配色/ch3 调色/ch4 规律/≥生成关 */
const GEN_HINTS = ['记忆、调色、规律随机来哦', '更漂亮的画等你挑战哦', '明天还有新玩法哦'];
function nextHint(ci) {
  const hints = { 1: '小图藏起来，凭记忆涂', 2: '红黄蓝抱一抱变新色', 3: '看看顺序，接着涂下去' };
  if (ci == null) ci = Math.floor(KIDS.calendar.limit(Infinity) / CH_LEN);
  if (ci >= 4) return GEN_HINTS[(ci - 4) % GEN_HINTS.length];
  return hints[ci] || '有新的画哦';
}
function chapterStars(ch) {
  let s = 0;
  for (let lv = 0; lv < 5; lv++) s += KIDS.level.stars(ch, lv);
  return s;
}
async function winFlow(stars) {
  state.won = true; stopTut(); clearTimeout(autoWinT);
  if (!ST.verify) { const svc = KIDS._save(); if (svc && svc.col && svc.col.wip) { svc.col.wip = null; KIDS.store.persist(); } }   /* 过关清暂存 */
  KIDS.audio.sfx('win');
  await KIDS.ui.celebrate(stars);
  const ch = cur.ci + 1, lv = cur.li;                       /* 章号 1 基（写档读档都是 ch-lv） */
  const pr = KIDS.level.pass(ch, lv, stars, [0, 1, 2, 3, 4]);
  const lim = KIDS.calendar.limit(Infinity);
  const dayDone = lim > 0 && KIDS.calendar.dayDone(keysUpTo(lim));
  if (pr.chapterDone) {
    KIDS.ui.chapterEnd({ chapter: ch, stars: chapterStars(ch), nextHint: nextHint(cur.ci + 1) });
    setTimeout(showHome, 3600);
  } else if (dayDone) {
    KIDS.ui.dayEnd({ nextHint: nextHint(null) });
    setTimeout(showHome, 3600);
  } else showHome();
}

/* ---------- 教学（仅第 1 张；看-帮-独；save.col.tutSeen 记"看"仅首次） ---------- */
function stopTut() {
  clearInterval(tutTimer); tutTimer = null;
  const f = byId('finger');
  if (f) f.classList.remove('go');
  document.querySelectorAll('.swatch').forEach(b => b.classList.remove('pulse'));   /* 教玩观察 P2：清全部 pulse（原只清 .sel，残留并跨关） */
  if (state) state.tut = null;
}
function startTutorial() {
  const sv = KIDS._save();
  state.tut = 'watch';
  if (!(sv.col && sv.col.tutSeen)) {
    /* 看：自动选红色→填一个区域（最上层中心区域，视觉最清楚），仅首次 */
    sayP('clr_tut_watch', '看！点颜色，再点图画');
    setTimeout(() => {
      if (!cur || state.won) return;
      selColor = 0; markSel(byId('palette'));
      byId('palette').querySelector('.swatch[data-c="0"]').classList.add('pulse');
      setTimeout(() => {
        if (!cur || state.won) return;
        doFill(regions.length - 1, 0, { demo: true });
        sv.col = Object.assign({}, sv.col, { tutSeen: 1 }); KIDS.store.persist();
        beginHelp();
      }, 800);
    }, 900);
  } else beginHelp();
  function beginHelp() {
    /* 帮：高亮调色盘当前色 + 幽灵手指指向空白区域；5 秒无操作再示范一次 */
    sayP('clr_tut_turn', '你来挑一个颜色吧');
    state.tut = 'help';
    byId('palette').querySelector('.swatch[data-c="' + selColor + '"]').classList.add('pulse');
    pointFinger();
    tutTimer = setInterval(() => {
      if (state.won || state.tut !== 'help') { stopTut(); return; }
      if (Date.now() - lastAct > 5000) pointFinger();
    }, 1000);
  }
}
function pointFinger() {
  const empty = regions.find(r => r.fill == null && r.i !== regions.length - 1) || regions.find(r => r.fill == null);
  const f = byId('finger');
  if (!empty) { f.classList.remove('go'); return; }
  const rr = empty.el.getBoundingClientRect(), wr = byId('art-wrap').getBoundingClientRect();
  f.style.left = (rr.left - wr.left + rr.width * 0.5 - 28) + 'px';
  f.style.top = (rr.top - wr.top + rr.height * 0.6 - 76) + 'px';
  f.classList.add('go');
  setTimeout(() => { if (state.tut !== 'help') f.classList.remove('go'); }, 2800);
}

/* ---------- 关卡地图（路线图：锁/空/星） ---------- */
function openMap() {
  lastAct = Date.now();
  const ov = document.createElement('div');
  ov.className = 'm-ov';
  const lim = KIDS.calendar.limit(Infinity), sv = KIDS._save();
  const nCh = Math.max(1, Math.ceil(lim / CH_LEN));
  const close = document.createElement('button');
  close.className = 'm-close'; close.setAttribute('aria-label', '关闭');
  close.innerHTML = '<svg viewBox="0 0 100 100"><path d="M26 26 L74 74 M74 26 L26 74" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/></svg>';
  close.addEventListener('pointerdown', () => ov.remove());
  ov.appendChild(close);
  for (let ci = 0; ci < nCh; ci++) {
    const row = document.createElement('div'); row.className = 'm-row';
    for (let li = 0; li < CH_LEN; li++) {
      const flat = ci * CH_LEN + li, key = (ci + 1) + '-' + li;
      const unlocked = flat < lim, rec = sv.levels[key];
      const b = document.createElement('button');
      b.className = 'm-cell' + (unlocked ? '' : ' locked') + (rec ? ' passed' : '') +
        (cur && cur.ci === ci && cur.li === li ? ' current' : '');
      if (!unlocked) b.innerHTML = '<svg viewBox="0 0 100 100"><rect x="32" y="44" width="36" height="30" rx="8" fill="#B9B3A8" stroke="' + INK + '" stroke-width="4"/><path d="M50 44 V32 a7 7 0 0 1 7 7" stroke="' + INK + '" stroke-width="6" fill="none" stroke-linecap="round"/></svg>';
      else if (rec) {
        let s = '<div class="m-stars">';
        for (let n = 1; n <= 3; n++) s += '<span class="ms' + ((rec.stars || 0) >= n ? ' on' : '') + '"></span>';
        b.innerHTML = s + '</div>';
      } else b.innerHTML = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="16" fill="none" stroke="#D8C9B4" stroke-width="6"/></svg>';
      if (unlocked) b.addEventListener('pointerdown', () => { ov.remove(); loadLevel(ci, li); });
      row.appendChild(b);
    }
    ov.appendChild(row);
  }
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));
}

/* ---------- 自由画布（白板 canvas；不计关卡不入档） ---------- */
const FREE = { strokes: [], undo: [], sizeIdx: 1, sizes: [8, 12, 20], erase: false, drawing: null };
let cv, cctx, cvW = 0, cvH = 0;
function fitCanvas() {
  const wrap = byId('canvas-wrap'), r = wrap.getBoundingClientRect();
  if (r.width < 10 || r.height < 10) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cvW = Math.round(r.width); cvH = Math.round(r.height);
  cv.width = Math.round(cvW * dpr); cv.height = Math.round(cvH * dpr);
  cv.style.width = cvW + 'px'; cv.style.height = cvH + 'px';
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
function repaintFree() {
  cctx.fillStyle = PAPER;
  cctx.fillRect(0, 0, cvW, cvH);
  FREE.strokes.forEach(st => drawStroke(st));
}
function drawStroke(st) {
  if (!st.pts.length) return;
  cctx.strokeStyle = st.color;
  cctx.fillStyle = st.color;
  cctx.lineWidth = st.w;
  cctx.lineCap = 'round'; cctx.lineJoin = 'round';
  if (st.pts.length === 1) {
    cctx.beginPath(); cctx.arc(st.pts[0].x, st.pts[0].y, st.w / 2, 0, Math.PI * 2); cctx.fill();
    return;
  }
  cctx.beginPath();
  cctx.moveTo(st.pts[0].x, st.pts[0].y);
  for (let i = 1; i < st.pts.length; i++) cctx.lineTo(st.pts[i].x, st.pts[i].y);
  cctx.stroke();
}
function segDraw(st, from, to) {                 /* 增量段直绘：pointermove 连续画线不卡顿 */
  cctx.strokeStyle = st.color; cctx.fillStyle = st.color;
  cctx.lineWidth = st.w; cctx.lineCap = 'round'; cctx.lineJoin = 'round';
  if (from.x === to.x && from.y === to.y) { cctx.beginPath(); cctx.arc(to.x, to.y, st.w / 2, 0, Math.PI * 2); cctx.fill(); return; }
  cctx.beginPath(); cctx.moveTo(from.x, from.y); cctx.lineTo(to.x, to.y); cctx.stroke();
}
const ptOf = e => {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
};
function freeColor() { return FREE.erase ? PAPER : COL_PAL[selColor]; }
function newStroke(p) { return { color: freeColor(), w: FREE.sizes[FREE.sizeIdx], erase: FREE.erase, pts: [p] }; }
function pushFreeUndo(rec) { FREE.undo.push(rec); if (FREE.undo.length > 200) FREE.undo.shift(); }
function undoFree() {
  const u = FREE.undo.pop();
  if (!u) { KIDS.audio.sfx('click'); return false; }
  if (u.t === 'stroke') FREE.strokes.pop();
  else if (u.t === 'clear') FREE.strokes = u.prev;
  KIDS.audio.sfx('click');
  repaintFree();
  return true;
}
function doClearFree() {
  if (!FREE.strokes.length) return;
  pushFreeUndo({ t: 'clear', prev: FREE.strokes });
  FREE.strokes = [];
  repaintFree();
  KIDS.audio.sfx('pop');
}
/* 长按 1 秒才清空（防误触）：进度环走满即执行，中途抬起=取消 */
function armClear() {
  const b = byId('btn-clear');
  b.classList.add('arm');
  b._t = setTimeout(() => { b._t = null; b.classList.remove('arm'); doClearFree(); }, 1000);
}
function disarmClear() {
  const b = byId('btn-clear');
  if (b._t) { clearTimeout(b._t); b._t = null; }
  b.classList.remove('arm');
}
function showFree() {
  stopTut();
  selColor = 0; FREE.erase = false;
  markSel(byId('palette2')); updateBrushUI();
  showScene('free');
}

/* ---------- verify=1 自检 ----------
 * v1 单元全保留（线稿库/free 阶梯/撤销/自由画布/布局/hitaid）+ r6 新单元（SPEC §5）：
 * ① 线稿库完整性 ②free 关填满 3 星 ③撤销/覆盖/栈深 ④自由画布 ⑤布局
 * ⑥r6 模式分派+确定性+生成覆盖（分支真实可达） ⑦match 逐格判定+参考图隐藏负向断言+星级
 * ⑧mix 混色封闭表独立对账（verify 自列 6 条副本，禁引引擎常量）+通关+生成副本
 * ⑨pat 规律独立对账（固定 3 套+生成副本）+星级 ⑩estMs 家族数值断言
 * ⑪语音 6 键注入+SPEC_DUR 实长 ±60ms（Promise.all+8000ms 超时）。
 * stub 音频/语音与关卡写入。 */
async function runVerify() {
  const out = { game: 'color', checks: [], pass: false };
  const N = (name, ok, info) => { out.checks.push({ name: name, ok: !!ok, info: info == null ? undefined : info }); };
  KIDS.audio.note = () => {}; KIDS.audio.sfx = () => {}; KIDS.speak = () => {};
  KIDS.voice.play = () => {}; KIDS.voice.queue = () => {};
  KIDS.level.pass = () => ({ chapterDone: false });
  let celeStars = null;
  KIDS.ui.celebrate = s => { celeStars = s; return Promise.resolve(); };
  KIDS.ui.chapterEnd = () => {}; KIDS.ui.dayEnd = () => {};
  const settle = ms => new Promise(r => setTimeout(r, ms || 25));   /* queueWin(spd=0)+stagger 落定 */
  const resetCele = () => { celeStars = null; };

  /* ---- r6 SPEC 独立副本（自 SPEC §5 文字重列，禁引引擎常量互证） ---- */
  const SPEC_MIX = { '0+2': 1, '2+0': 1, '2+6': 3, '6+2': 3, '0+6': 7, '6+0': 7 };  /* 混色封闭 6 条（红0黄2蓝6→橙1绿3紫7）；表外=错混 */
  const SPEC_PAT_FIXED = [[0, 2], [0, 6, 3], [1, 1, 7]];                            /* ch4 lv0-2：AB/ABC/AAB */
  const SPEC_PAT_POOL = [0, 1, 2, 3, 5, 6, 7, 8];                                   /* 生成规律取色池 */
  const SPEC_PRIM = [0, 2, 6], SPEC_TG = [1, 3, 7];
  const SPEC_R6_KEYS = ['clr_match_intro', 'clr_match_wrong', 'clr_mix_intro', 'clr_mix_wrong', 'clr_pat_intro', 'clr_pat_wrong'];
  /* mulberry32 副本 + RNG 取数序副本（SPEC §5 定版） */
  const vRnd = seed => { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const vShuffle = (arr, rnd) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; };
  const vCount = picIdx => { const d = document.createElement('div'); d.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' + COL_PICS[picIdx].art() + '</svg>'; return d.querySelectorAll('.rg').length; };
  const vMixBody = rnd => {
    const picIdx = Math.floor(rnd() * COL_PICS.length);
    const targets = vShuffle(SPEC_TG.slice(), rnd);
    const counts = [1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 2)];
    const idxs = vShuffle(Array.from({ length: vCount(picIdx) }, (_, i) => i), rnd).slice(0, counts[0] + counts[1] + counts[2]);
    const marks = []; let pos = 0;
    for (let t = 0; t < 3; t++) for (let k = 0; k < counts[t]; k++) marks.push({ r: idxs[pos++], c: targets[t] });
    return { picIdx: picIdx, targets: targets, marks: marks };
  };
  const vPatBody = rnd => {
    const plen = rnd() < 0.5 ? 2 : 3;
    if (plen === 2) return vShuffle(SPEC_PAT_POOL.slice(), rnd).slice(0, 2);
    if (rnd() < 0.5) return vShuffle(SPEC_PAT_POOL.slice(), rnd).slice(0, 3);
    const c2 = vShuffle(SPEC_PAT_POOL.slice(), rnd).slice(0, 2);
    return [c2[0], c2[0], c2[1]];
  };
  const vGen = flat => { const rnd = vRnd(flat * 7919 + 13); const mv = rnd(); return { mv: mv, rnd: rnd }; };
  const vMatchGen = rnd => {           /* v1 生成配色取数序副本 */
    const picIdx = Math.floor(rnd() * COL_PICS.length);
    const nSub = 3 + Math.floor(rnd() * 3);
    const sub = [];
    while (sub.length < nSub) { const c = Math.floor(rnd() * COL_PAL.length); if (sub.indexOf(c) < 0) sub.push(c); }
    const rec = [];
    for (let i = 0; i < vCount(picIdx); i++) rec.push(sub[Math.floor(rnd() * sub.length)]);
    return { picIdx: picIdx, rec: rec };
  };

  /* ① 线稿库 */
  COL_PICS.forEach((p, i) => {
    const els = buildArt(byId('art'), i);
    const n = els.length;
    const uniq = new Set(els.map(e => e.dataset.r)).size === n;
    const ids = new Set(COL_PICS.map(q => q.id)).size === COL_PICS.length;
    N('lib:' + p.id, n >= 6 && n <= 15 && uniq && ids, { regions: n });
    const rec = COL_REC.base[p.id], recA = COL_REC.alt[p.id];
    N('rec:' + p.id, rec.length === n && recA.length === n && rec.every(c => c >= 0 && c < 12) && recA.every(c => c >= 0 && c < 12), { base: rec.length, alt: recA.length });
  });

  /* ② free 关（ch1 flat0-4）：填满→完成态 3 星 + 确定性 */
  for (let flat = 0; flat < 5; flat++) {
    const ci = Math.floor(flat / CH_LEN), li = flat % CH_LEN;
    const lv1 = colGetLevel(flat), lv2 = colGetLevel(flat);
    const det = JSON.stringify(lv1) === JSON.stringify(lv2);
    loadLevel(ci, li);
    const n = regions.length;
    const wantN = colRegionCount(lv1.picIdx);
    for (let i = 0; i < n; i++) doFill(i, i % 12);
    const ev = doneEval();
    N('lv:' + keyOf(flat), det && lv1.mode === 'free' && filledCount() === n && n === wantN && ev.win && ev.stars === 3,
      { pic: COL_PICS[lv1.picIdx].id, regions: n, stars: ev.stars, deterministic: det });
  }

  /* ⑥ r6 模式分派 + 全静态确定性 */
  const EXP = f => (f < 5 ? 'free' : f < 10 ? 'match' : f < 15 ? 'mix' : f < 20 ? 'pat' : null);
  let dispOk = true;
  for (let flat = 0; flat < 20; flat++) {
    const l1 = colGetLevel(flat), l2 = colGetLevel(flat);
    if (l1.mode !== EXP(flat) || JSON.stringify(l1) !== JSON.stringify(l2)) dispOk = false;
  }
  /* 生成关 20-59：确定性 + 三模式全覆盖（分支真实可达）+ 生成参数独立副本对账 */
  const genCov = { match: 0, mix: 0, pat: 0 };
  let genDetOk = true, repOk = true, repInfo = {};
  const firstGen = {};
  for (let flat = 20; flat < 60; flat++) {
    const l1 = colGetLevel(flat), l2 = colGetLevel(flat);
    if (JSON.stringify(l1) !== JSON.stringify(l2)) genDetOk = false;
    if (!(l1.mode in genCov)) { genDetOk = false; continue; }
    genCov[l1.mode]++;
    if (!(l1.mode in firstGen)) firstGen[l1.mode] = flat;
    const g = vGen(flat);
    if (l1.mode === 'mix') {
      const v = vMixBody(g.rnd);
      const e = { picIdx: l1.picIdx, targets: l1.targets, marks: l1.marks };
      if (JSON.stringify(e) !== JSON.stringify(v)) { repOk = false; repInfo[flat] = 'mix'; }
    } else if (l1.mode === 'pat') {
      const v = vPatBody(g.rnd);
      if (JSON.stringify(l1.period) !== JSON.stringify(v)) { repOk = false; repInfo[flat] = 'pat'; }
    } else {
      const v = vMatchGen(g.rnd);
      if (l1.picIdx !== v.picIdx || JSON.stringify(l1.rec) !== JSON.stringify(v.rec)) { repOk = false; repInfo[flat] = 'match'; }
    }
  }
  N('r6:dispatch', dispOk, {});
  N('r6:gen', genDetOk && genCov.match > 0 && genCov.mix > 0 && genCov.pat > 0,
    { coverage: genCov, deterministic: genDetOk });
  N('r6:replica', repOk, repInfo);
  /* ch4 lv3-4 生成规律副本对账（无 mv 前抽，直接 pat 体） */
  let patSeedOk = true;
  [18, 19].forEach(flat => {
    const v = vPatBody(vRnd(flat * 7919 + 13));
    if (JSON.stringify(colGetLevel(flat).period) !== JSON.stringify(v)) patSeedOk = false;
  });
  N('r6:pat-seed', patSeedOk, {});

  /* ⑦ match：逐格判定 + 参考图隐藏负向断言 + 星级阶梯 */
  loadLevel(1, 0);                                          /* flat 5 */
  const rec5 = COL.matchRec;
  const refBefore = !COL.refHidden;
  const wrongC = rec5[0] === 0 ? 1 : 0;
  const w1 = COL.fill(0, wrongC);
  const refAfter = COL.refHidden;
  const toastTxt = byId('toast').querySelector('#toast-text').textContent;
  const rej0 = COL.regions[0].color == null && COL.miss === 1;
  const ok0 = COL.fill(0, rec5[0]);
  N('match:judge', refBefore && w1 && w1.correct === false && refAfter && rej0 &&
    toastTxt === R6V.matchWrong.text && ok0 && ok0.correct === true && COL.regions[0].color === rec5[0],
    { refBefore: refBefore, refHiddenAfterTry: refAfter, miss: COL.miss, toast: toastTxt });
  for (let i = 1; i < rec5.length; i++) COL.fill(i, rec5[i]);
  await settle();
  N('match:win2', state.won && celeStars === 2, { stars: celeStars, miss: COL.miss });
  resetCele();
  loadLevel(1, 1);                                          /* flat 6：零 miss=3 星 */
  const rec6 = COL.matchRec;
  for (let i = 0; i < rec6.length; i++) COL.fill(i, rec6[i]);
  await settle();
  loadLevel(1, 2);                                          /* flat 7：3 miss=1 星 */
  resetCele();
  const rec7 = COL.matchRec;
  COL.fill(0, rec7[0] === 0 ? 1 : 0); COL.fill(1, rec7[1] === 0 ? 1 : 0); COL.fill(2, rec7[2] === 0 ? 1 : 0);
  for (let i = 0; i < rec7.length; i++) COL.fill(i, rec7[i]);
  await settle();
  N('match:stars', celeStars === 1, { stars: celeStars, miss: 3 });

  /* ⑧ mix：封闭表独立对账（9 组含 3 同色对）+ 完美通关 + 星级 */
  loadLevel(2, 0);                                          /* flat 10 */
  const mixPairs = ['0+2', '2+0', '2+6', '6+2', '0+6', '6+0', '0+0', '2+2', '6+6'];
  let tblOk = true, tblBad = [];
  for (const p of mixPairs) {
    let st = COL.mixState;
    if (!st || st.cur >= st.targets.length || state.won) { loadLevel(2, 0); st = COL.mixState; }
    const ab = p.split('+');
    const target = st.targets[st.cur];
    const exp = SPEC_MIX[p] !== undefined && SPEC_MIX[p] === target;
    mixPick(+ab[0]);
    const r2 = mixPick(+ab[1]);
    if (!r2 || r2.correct !== exp) { tblOk = false; tblBad.push(p + ':exp' + exp); }
  }
  N('mix:table', tblOk, { bad: tblBad });
  loadLevel(2, 0);                                          /* 完美通关：按副本配方逐目标 */
  resetCele();
  let mixSteps = 0;
  while (!state.won && mixSteps < 12) { COL.autoSolve(); mixSteps++; await settle(5); }
  await settle();
  const mst = COL.mixState;
  N('mix:win', state.won && celeStars === 3 && mixSteps === 3 && mst.marks.every(k => k.done),
    { stars: celeStars, steps: mixSteps, miss: COL.miss });
  loadLevel(2, 1);                                          /* flat 11：错混 3 次=1 星 + 同色对计数 */
  resetCele();
  mixPick(0); mixPick(0); mixPick(2); mixPick(2); mixPick(6); mixPick(6);
  let s2 = 0;
  while (!state.won && s2 < 12) { COL.autoSolve(); s2++; await settle(5); }
  await settle();
  N('mix:stars', state.won && celeStars === 1 && COL.miss === 3, { stars: celeStars, miss: COL.miss });

  /* ⑨ pat：固定规律独立对账（flat15 AB）+ 逐格先错后对 + 星级 */
  loadLevel(3, 0);                                          /* flat 15：AB [0,2] */
  const pst = COL.patState;
  let patOk = JSON.stringify(pst.period) === JSON.stringify(SPEC_PAT_FIXED[0]) && pst.cells.length === 10 &&
    pst.cells.every((c, k) => c.want === SPEC_PAT_FIXED[0][k % 2]);
  let patBad = [];
  for (let k = 3; k < 10; k++) {
    const want = pst.cells[k].want;
    const wrong = want === pst.period[0] ? (pst.period[1] != null ? pst.period[1] : pst.period[0]) : pst.period[0];
    const rw = COL.fill(k, wrong);
    if (!rw || rw.correct !== false || COL.patState.cells[k].got != null || COL.miss !== k - 2) { patOk = false; patBad.push('w' + k); }
    const rc = COL.fill(k, want);
    if (!rc || rc.correct !== true || COL.patState.cells[k].got !== want) { patOk = false; patBad.push('c' + k); }
  }
  await settle();
  const patToast = byId('toast').querySelector('#toast-text').textContent;
  N('pat:judge', patOk && state.won && celeStars === 1 && COL.miss === 7 && patToast === R6V.patWrong.text,
    { bad: patBad, stars: celeStars, miss: COL.miss, toast: patToast });
  loadLevel(3, 1);                                          /* flat 16：ABC 完美=3 星 */
  resetCele();
  const p16 = COL.patState;
  const abcOk = JSON.stringify(p16.period) === JSON.stringify(SPEC_PAT_FIXED[1]);
  let s3 = 0;
  while (!state.won && s3 < 12) { COL.autoSolve(); s3++; await settle(5); }
  await settle();
  N('pat:win', abcOk && state.won && celeStars === 3, { period: p16.period, stars: celeStars });
  /* flat 17：AAB 固定 + 完美通关（分支可达） */
  loadLevel(3, 2);
  resetCele();
  const aabOk = JSON.stringify(COL.patState.period) === JSON.stringify(SPEC_PAT_FIXED[2]);
  let s4 = 0;
  while (!state.won && s4 < 12) { COL.autoSolve(); s4++; await settle(5); }
  await settle();
  N('pat:aab', aabOk && state.won && celeStars === 3, { period: COL.patState && COL.patState.period });

  /* ⑥b 生成关三分支真实通关（autoSolve 全链） */
  const genWin = {};
  for (const md of ['match', 'mix', 'pat']) {
    const flat = firstGen[md];
    loadLevel(Math.floor(flat / CH_LEN), flat % CH_LEN);
    resetCele();
    let s = 0;
    while (!state.won && s < 16) { COL.autoSolve(); s++; await settle(5); }
    await settle();
    genWin[md] = { flat: flat, won: state.won, stars: celeStars };
  }
  N('r6:gen-win', genWin.match.won && genWin.mix.won && genWin.pat.won, genWin);

  /* ③ 撤销 / 覆盖 / 栈深（free） */
  loadLevel(0, 0);
  doFill(0, 2); doFill(1, 3); doFill(2, 4);
  undoPlay(); undoPlay(); undoPlay();
  N('undo:restore3', regions[0].fill == null && regions[1].fill == null && regions[2].fill == null, {});
  doFill(0, 5); doFill(0, 7);                          /* 覆盖：换色重填 */
  N('undo:overwrite', regions[0].fill === 7, { c: regions[0].fill });
  undoPlay();
  N('undo:overwrite-back', regions[0].fill === 5, { c: regions[0].fill });
  const n0 = colRegionCount(colGetLevel(0).picIdx);
  const stackBefore = undoStack.length;
  for (let k = 0; k < 35; k++) doFill(k % n0, k % 12);  /* 撤销栈 ≥30 步 */
  let undos = 0;
  while (undoStack.length && undos < 45) { undoPlay(); undos++; }
  N('undo:stack30', undos === stackBefore + 35 && regions.every(r => r.fill == null), { undone: undos });

  /* 完成判定阶梯（free） */
  loadLevel(0, 0);
  const total = regions.length;
  for (let i = 0; i < Math.ceil(total * 0.3); i++) doFill(i, 1);   /* <40%：只提示 */
  let ev = doneEval();
  const hintLow = !ev.win && ev.hint;
  state.hinted = false;
  for (let i = Math.ceil(total * 0.3); i < Math.ceil(total * 0.5); i++) doFill(i, 2);  /* 40-60% */
  ev = doneEval();
  const hintMid = !ev.win && ev.hint;
  state.hinted = true;                                              /* 温和提示后再点=1 星 */
  ev = doneEval();
  const star1 = ev.win && ev.stars === 1;
  state.hinted = false;
  for (let i = Math.ceil(total * 0.5); i < Math.ceil(total * 0.7); i++) doFill(i, 3);  /* ≥60% */
  ev = doneEval();
  const star2 = ev.win && ev.stars === 2;
  N('done:ladder', hintLow && hintMid && star1 && star2, { hintLow: hintLow, hintMid: hintMid, star1: star1, star2: star2 });
  const doneRet = await doDone();                                    /* 真实完成路径（celebrate 记星） */
  N('done:flow', doneRet.win === true && doneRet.stars === 2 && celeStars === 2, { ret: doneRet, celeStars: celeStars });

  /* ④ 自由画布冒烟：3 笔非空白 */
  showFree(); fitCanvas(); repaintFree();
  COL.freeDraw(10, 10, 100, 100, 2);
  COL.freeDraw(100, 100, 180, 20, 4);
  COL.freeDraw(50, 150, 190, 150, 6);
  const px = cctx.getImageData(0, 0, cv.width, cv.height).data;
  let inked = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] > 0 && (Math.abs(px[i] - 255) > 24 || Math.abs(px[i + 1] - 253) > 24 || Math.abs(px[i + 2] - 247) > 24)) inked++;
  }
  N('free:3strokes', inked > 200, { inkedPx: inked });
  undoFree(); undoFree(); undoFree();
  const px2 = cctx.getImageData(0, 0, cv.width, cv.height).data;
  let ink2 = 0;
  for (let i = 0; i < px2.length; i += 4) if (px2[i + 3] > 0 && (Math.abs(px2[i] - 255) > 24 || Math.abs(px2[i + 1] - 253) > 24 || Math.abs(px2[i + 2] - 247) > 24)) ink2++;
  N('free:undo', ink2 === 0, { inkedPx: ink2 });

  /* ⑤+r6 布局：模式布局 bbox + 负向可见性 + overflowX + 触摸目标 ≥64px */
  const de = document.documentElement;
  const targets = {};
  const grab = (sel, box) => { const e = document.querySelector(sel); if (e) { const r = e.getBoundingClientRect(); targets[sel] = [Math.round(r.width), Math.round(r.height)]; } };
  const r6lay = {};
  loadLevel(1, 0);                                          /* match 布局 */
  grab('#btn-home'); grab('#btn-map'); grab('#palette .swatch:first-child');
  const refR = byId('ref-box').getBoundingClientRect();
  r6lay.refBox = [Math.round(refR.width), Math.round(refR.height)];
  r6lay.miniHiddenInMatch = getComputedStyle(byId('mini-preview')).display === 'none';
  r6lay.doneHiddenInMatch = getComputedStyle(byId('btn-done')).display === 'none';
  r6lay.undoHiddenInMatch = getComputedStyle(byId('btn-undo')).display === 'none';
  loadLevel(2, 0);                                          /* mix 布局 */
  const mprims = document.querySelectorAll('#mixbar .mprim');
  r6lay.mprim = mprims.length === 3 && Array.from(mprims).every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
  const bucketR = byId('target-bucket').getBoundingClientRect();
  r6lay.bucket = [Math.round(bucketR.width), Math.round(bucketR.height)];
  r6lay.paletteHiddenInMix = getComputedStyle(byId('palette')).display === 'none';
  r6lay.artInteractiveInMix = getComputedStyle(byId('art')).pointerEvents === 'none';
  loadLevel(3, 0);                                          /* pat 布局 */
  const pcells = document.querySelectorAll('#strip .pcell');
  r6lay.pcell = pcells.length === 10 && Array.from(pcells).every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
  const patSw = document.querySelectorAll('#palette .swatch');
  r6lay.patSwatches = patSw.length === 2 && Array.from(patSw).every(b => { const r = b.getBoundingClientRect(); return r.width >= 64 && r.height >= 64; });
  loadLevel(0, 0);                                          /* free 布局（v1 采样） */
  ['#btn-home', '#btn-map', '#btn-undo', '#btn-done', '#palette .swatch:first-child', '#palette .swatch:last-child'].forEach(s => grab(s));
  showFree(); fitCanvas();
  ['#btn-home2', '#btn-undo2', '#btn-eraser', '#btn-clear', '#brushes button:first-child', '#palette2 .swatch:first-child'].forEach(s => grab(s));
  showHome();
  ['#card-color', '#card-free'].forEach(s => grab(s));
  const small = Object.keys(targets).filter(k => targets[k][0] < 64 || targets[k][1] < 64);
  const ox = de.scrollWidth - de.clientWidth;
  out.layout = { vw: innerWidth, vh: innerHeight, overflowX: ox, targets: targets, below64: small, r6: r6lay };
  N('layout', ox === 0 && small.length === 0, { overflowX: ox, below64: small });
  N('r6:layout', r6lay.refBox[0] >= 120 && r6lay.refBox[1] >= 120 && r6lay.miniHiddenInMatch && r6lay.doneHiddenInMatch &&
    r6lay.undoHiddenInMatch && r6lay.mprim === true && r6lay.paletteHiddenInMix && r6lay.artInteractiveInMix &&
    r6lay.pcell === true && r6lay.patSwatches === true && r6lay.bucket[0] >= 56, r6lay);

  /* ⑤b M6 小区域命中外扩：每图每区域生效触摸目标 ≥64px（free+match 关均 SVG） */
  out.hitaid = {};
  for (let pi = 0; pi < COL_PICS.length; pi++) {
    loadLevel(Math.floor(pi / 5), pi % 5);                  /* flat = pi（静态 0-9 覆盖 10 图） */
    const res = addHitAids(byId('art'));
    const svg = byId('art').querySelector('svg');
    let bad = [], notNested = [];
    regions.forEach(r => {
      const rr = r.el.getBoundingClientRect();
      let eff = Math.min(rr.width, rr.height);
      if (eff < 63.5) {
        const aid = svg.querySelector('.rg.hitaid[data-r="' + r.i + '"]');
        if (aid) { const ar = aid.getBoundingClientRect(); eff = Math.min(ar.width, ar.height); }
        else if (res.skipped.indexOf(r.i) >= 0) {
          const nested = regions.some(q => q !== r && rr.left >= q.el.getBoundingClientRect().left - 6 &&
            rr.right <= q.el.getBoundingClientRect().right + 6 &&
            rr.top >= q.el.getBoundingClientRect().top - 6 &&
            rr.bottom <= q.el.getBoundingClientRect().bottom + 6);
          const mx = Math.max(rr.width, rr.height), mn = Math.min(rr.width, rr.height);
          const elong = mx >= 150 && mx >= 2.5 * mn;
          if (!nested && !elong) notNested.push(r.i);
        }
      }
      if (eff < 63.5 && notNested.indexOf(r.i) < 0 && res.skipped.indexOf(r.i) < 0) bad.push(r.i + ':' + Math.round(eff));
    });
    out.hitaid[COL_PICS[pi].id] = { aids: res.aids.length, skipped: res.skipped, bad: bad, notNested: notNested };
    N('hit:' + COL_PICS[pi].id, bad.length === 0 && notNested.length === 0,
      { aids: res.aids.length, skipped: res.skipped, bad: bad, notNested: notNested });
  }

  /* ⑩ estMs 家族（r4 m-5 定版 n*345+600；禁 +300 变体）：数值+源码负向 */
  const estOk = estMs(1) === 945 && estMs(11) === 11 * 345 + 600 && estMs(12) === 12 * 345 + 600 &&
    estMs.toString().indexOf('345') >= 0 && estMs.toString().indexOf('+ 300') < 0;
  N('r6:estms', estOk, { est1: estMs(1), est11: estMs(11), est12: estMs(12) });

  /* ⑪ 语音：r6 六键注入 + SPEC_DUR 实长 ±60ms（Promise.all+8000ms 超时） */
  const preOk = SPEC_R6_KEYS.every(k => !!KIDS.voice.clips[k]);
  N('r6:clips', preOk, { keys: SPEC_R6_KEYS.filter(k => !KIDS.voice.clips[k]) });
  const durSpec = { /* SPEC_DUR r6 真值表（无头 chromium Audio.metadata 实测，2026-09-13，两次复测一致） */
    clr_match_intro: 3216, clr_match_wrong: 2568, clr_mix_intro: 3072,
    clr_mix_wrong: 2592, clr_pat_intro: 3168, clr_pat_wrong: 2640
  };
  const durKeys = Object.keys(durSpec);
  const durs = await Promise.all(durKeys.map(k => new Promise(res => {
    let done = false;
    const a = new Audio(KIDS.voice.clips[k]);
    const t = setTimeout(() => { if (!done) { done = true; res(-2); } }, 8000);   /* 8s 超时（纪律） */
    a.onloadedmetadata = () => { if (!done) { done = true; clearTimeout(t); res(Math.round(a.duration * 1000)); } };
    a.onerror = () => { if (!done) { done = true; clearTimeout(t); res(-1); } };
  })));
  const durOk = durs.every((d, i) => Math.abs(d - durSpec[durKeys[i]]) <= 60);
  N('r6:dur', durOk, { durs: durs, spec: durSpec });
  out.durs = durs;

  loadLevel(0, 0);                                          /* 复位现场 */

  out.pass = out.checks.every(c => c.ok);
  const okN = out.checks.filter(c => c.ok).length;
  byId('verify-result').textContent = JSON.stringify(out);
  document.title = out.pass ? 'VERIFY PASS ' + okN + '/' + out.checks.length : 'VERIFY FAIL';
  return out;
}

/* ---------- 验收钩子（spec §3 + r6 §5） ---------- */
window.COL = {
  get currentLevel() { return cur ? (cur.ci + 1) + '-' + cur.li : null; },
  get mode() { return cur ? cur.level.mode : null; },
  get regions() { return regions.map(r => ({ i: r.i, color: r.fill })); },
  get miss() { return mstate ? mstate.miss : 0; },
  get mixState() {                                 /* mix 驱动对账（verify/SPEC 副本比对） */
    if (!cur || cur.level.mode !== 'mix' || !mstate) return null;
    return { slot: mstate.slot.slice(), cur: mstate.cur, targets: cur.level.targets.slice(),
      marks: mstate.marks.map(k => ({ r: k.r, c: k.c, done: k.done })) };
  },
  get patState() {                                 /* pat 驱动对账 */
    if (!cur || cur.level.mode !== 'pat' || !mstate) return null;
    return { period: cur.level.period.slice(), pre: cur.level.pre,
      cells: mstate.cells.map(c => ({ want: c.want, got: c.got })) };
  },
  get matchRec() { return cur && cur.level.mode === 'match' ? cur.level.rec.slice() : null; },
  get refHidden() {                                /* 记忆负荷负向断言（防退化回全程可见） */
    const b = byId('ref-box');
    return !b || b.classList.contains('hidden') || getComputedStyle(b).display === 'none';
  },
  fill(i, colorIdx) {
    if (!cur) return false;
    if (cur.level.mode === 'free') return doFill(i, colorIdx);
    if (cur.level.mode === 'match') return matchFill(i, colorIdx);
    if (cur.level.mode === 'pat') return patFill(i, colorIdx);
    return { ok: false, why: 'mix' };
  },
  mixPick(c) { return mixPick(c); },
  next() {                                         /* 下一手正确动作（autoSolve/E2E 真实点击定位用） */
    if (!cur) return null;
    const m = cur.level.mode;
    if (m === 'match') {
      const r = regions.find(q => q.fill == null);
      return r ? { act: 'fill', i: r.i, color: cur.level.rec[r.i] } : null;
    }
    if (m === 'mix') {
      if (!mstate || mstate.cur >= cur.level.targets.length) return null;
      const t = cur.level.targets[mstate.cur];
      for (const a of R6_MIX_PRIM) for (const b of R6_MIX_PRIM) if (R6_MIX_TABLE[a + '+' + b] === t) return { act: 'mix', a: a, b: b, target: t };
      return null;
    }
    if (m === 'pat') {
      const k = mstate.cells.findIndex(c => c.got == null);
      return k >= 0 ? { act: 'fill', i: k, color: mstate.cells[k].want } : null;
    }
    const r = regions.find(q => q.fill == null);
    return r ? { act: 'fill', i: r.i, color: selColor } : null;
  },
  autoSolve() {                                    /* 执行下一手（真实用户路径，供 E2E 逐手循环） */
    const n = this.next();
    if (!n) return { done: true, acted: false };
    if (n.act === 'mix') { mixPick(n.a); mixPick(n.b); return { done: false, acted: true, action: n }; }
    if (cur.level.mode === 'match') return { done: false, acted: true, action: n, ret: matchFill(n.i, n.color) };
    if (cur.level.mode === 'pat') return { done: false, acted: true, action: n, ret: patFill(n.i, n.color) };
    return { done: false, acted: true, action: n, ret: doFill(n.i, n.color) };
  },
  done() { return doDone(); },
  undo() { return document.querySelector('#scene-free.on') ? undoFree() : undoPlay(); },
  freeDraw(x1, y1, x2, y2, colorIdx) {          /* 坐标=画布 CSS px；一笔一条线段 */
    const st = { color: COL_PAL[colorIdx != null ? colorIdx : selColor], w: FREE.sizes[FREE.sizeIdx], erase: false, pts: [{ x: x1, y: y1 }, { x: x2, y: y2 }] };
    FREE.strokes.push(st);
    pushFreeUndo({ t: 'stroke' });
    drawStroke(st);
    return true;
  },
  clearFree() { doClearFree(); return true; },
  level(flat) { loadLevel(Math.floor(flat / CH_LEN), flat % CH_LEN); }   /* 测试辅助 */
};

/* ---------- 事件绑定 ---------- */
function bind() {
  document.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('resize', () => { if (document.querySelector('#scene-free.on')) { fitCanvas(); repaintFree(); } });

  byId('card-color').addEventListener('pointerdown', () => {
    KIDS.audio.unlock(); KIDS.audio.sfx('click');
    const nf = nextFlat();
    loadLevel(Math.floor(nf / CH_LEN), nf % CH_LEN);
  });
  byId('card-free').addEventListener('pointerdown', () => { KIDS.audio.unlock(); KIDS.audio.sfx('click'); showFree(); });

  buildPalette(byId('palette'), pickPlay);
  buildPalette(byId('palette2'), i => {
    selColor = i; FREE.erase = false; markSel(byId('palette2')); updateBrushUI();
    KIDS.audio.unlock(); KIDS.audio.sfx('click');
  });

  byId('art').addEventListener('pointerdown', e => {     /* pointerdown 即填色，不等 pointerup */
    const el = e.target.closest('.rg');
    if (!el || state.won || !cur) return;
    KIDS.audio.unlock();
    if (cur.level.mode === 'match') matchFill(+el.dataset.r, selColor);
    else if (cur.level.mode === 'free') doFill(+el.dataset.r, selColor);
  });
  byId('btn-home').addEventListener('pointerdown', e => { e.stopPropagation(); KIDS.audio.sfx('click'); showHome(); });
  byId('btn-home2').addEventListener('pointerdown', e => { e.stopPropagation(); KIDS.audio.sfx('click'); showHome(); });
  byId('btn-map').addEventListener('pointerdown', e => { e.stopPropagation(); KIDS.audio.sfx('click'); openMap(); });
  byId('btn-undo').addEventListener('pointerdown', e => { e.stopPropagation(); undoPlay(); });
  byId('btn-undo2').addEventListener('pointerdown', e => { e.stopPropagation(); undoFree(); });
  byId('btn-done').addEventListener('pointerdown', e => { e.stopPropagation(); doDone(); });

  /* 画笔粗细 3 档 + 橡皮 */
  const brushes = byId('brushes');
  [0, 1, 2].forEach(i => {
    const b = document.createElement('button');
    b.dataset.size = String(i);
    b.setAttribute('aria-label', '画笔粗细' + (i + 1));
    b.innerHTML = '<span class="bdot b' + i + '"></span>';
    b.addEventListener('pointerdown', e => { e.stopPropagation(); FREE.sizeIdx = i; FREE.erase = false; updateBrushUI(); KIDS.audio.sfx('click'); });
    brushes.appendChild(b);
  });
  byId('btn-eraser').addEventListener('pointerdown', e => {
    e.stopPropagation(); FREE.erase = !FREE.erase; updateBrushUI(); KIDS.audio.sfx('click');
  });
  function updateBrushUI() {
    brushes.querySelectorAll('button').forEach(b => b.classList.toggle('sel', !FREE.erase && +b.dataset.size === FREE.sizeIdx));
    byId('btn-eraser').classList.toggle('sel', FREE.erase);
  }
  FREE._ui = updateBrushUI;

  /* 自由画布绘制（pointer capture + 段直绘） */
  cv = byId('fcanvas'); cctx = cv.getContext('2d');
  cv.addEventListener('pointerdown', e => {
    KIDS.audio.unlock();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    FREE.drawing = newStroke(ptOf(e));
    segDraw(FREE.drawing, FREE.drawing.pts[0], FREE.drawing.pts[0]);
    lastAct = Date.now();
  });
  cv.addEventListener('pointermove', e => {
    if (!FREE.drawing) return;
    const p = ptOf(e), last = FREE.drawing.pts[FREE.drawing.pts.length - 1];
    if (Math.abs(p.x - last.x) + Math.abs(p.y - last.y) < 1.5) return;   /* 去抖：省重绘 */
    segDraw(FREE.drawing, last, p);
    FREE.drawing.pts.push(p);
  });
  const endStroke = () => {
    if (!FREE.drawing) return;
    if (FREE.drawing.pts.length === 0) FREE.drawing = null;
    FREE.strokes.push(FREE.drawing);
    pushFreeUndo({ t: 'stroke' });
    FREE.drawing = null;
  };
  cv.addEventListener('pointerup', endStroke);
  cv.addEventListener('pointercancel', endStroke);

  /* 清空=长按 1 秒（防误触，进度环视觉提示） */
  const bc = byId('btn-clear');
  bc.addEventListener('pointerdown', e => { e.stopPropagation(); KIDS.audio.unlock(); armClear(); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => bc.addEventListener(ev, disarmClear));

  /* 无操作 20 秒：轻声提示目标一次（可关，由家长面板设置控制）；r6 按模式选提示句 */
  setInterval(() => {
    if (ST.verify || !cur || state.won || document.hidden) return;
    if (!document.querySelector('#scene-play.on')) return;
    if (Date.now() - lastAct > 20000) {
      const m = cur.level.mode;
      if (m === 'match') sayR(R6V.matchIntro);
      else if (m === 'mix') sayR(R6V.mixIntro);
      else if (m === 'pat') sayR(R6V.patIntro);
      else sayP('clr_hint', '点颜色，再点图画');
      lastAct = Date.now();
    }
  }, 2000);
}
function updateBrushUI() { if (FREE._ui) FREE._ui(); }

/* ---------- 启动 ---------- */
function boot() {
  KIDS.init({ game: 'color', title: '涂色本' });
  byId('btn-home').innerHTML = ICON.home;
  byId('btn-home2').innerHTML = ICON.home;
  byId('btn-map').innerHTML = ICON.map;
  byId('btn-undo').innerHTML = ICON.undo;
  byId('btn-undo2').innerHTML = ICON.undo;
  byId('btn-done').innerHTML = ICON.done;
  byId('btn-eraser').innerHTML = ICON.eraser;
  byId('btn-clear').innerHTML =
    '<svg class="ring" viewBox="0 0 76 76"><circle cx="38" cy="38" r="33" fill="none" stroke="#8FBF7F" stroke-width="6" stroke-linecap="round" stroke-dasharray="207.3" stroke-dashoffset="207.3" transform="rotate(-90 38 38)"/></svg>' +
    ICON.clock;
  byId('finger').innerHTML = ICON.finger;
  byId('card-free').querySelector('.thumb').innerHTML = ICON.brush;
  bind();
  const q = new URLSearchParams(location.search);
  ST.verify = q.get('verify') === '1';
  if (ST.verify) { runVerify(); return; }
  const sv = KIDS._save();
  const first = !Object.keys(sv.levels).length && !(sv.col && sv.col.tutSeen);
  if (first) loadLevel(0, 0);            /* 首进直接教学关（spec §2.6） */
  else showHome();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
