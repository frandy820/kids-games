/* ================= connect 主逻辑 r6（逐题制 / 题型四族 / SVG 拖线 / 教学 / 推进）
   玩法：每关 5 题。左卡=主体（动物或食物链图），右列=4-5 候选；从左卡拖线到候选卡
   （pointerdown→move 实时画线→up 吸附判定）。
   - pair/set：连对=线固定+食物挂对勾；set 连全 EATS 才完成（连对未满='part' 不 miss）
   - anti：连唯一专属食物对；连共享食物=断线+miss+「别的动物也爱吃它哦」锚
   - chain：up 连链顶动物 / down 连链中段食物
   错连零惩罚可重连；全关 5 题完成过关。
   钩子：window.CON = { get currentLevel, get quiz(), dragTo(a,b), async autoSolve() } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援语音不受 flat 门（idle 20s 静置零救援教训）；
   T46 阶段2（2026-09-19）题面/确认句亦走 sayR（con_st_/con_cf_ 整句 clip，text=防御兜底；
   不设 flat 门=任务语音必须听到，weather v2 先例口径不变） */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };
/* 错连方向锚：flat<3 每次播 / flat≥3 10s 节流（r4/r5 家族口径） */
let lastWrongVoice = 0;
const sayW = (key, text) => {
  if (!cur) return;
  if (cur.flat < 3) { KIDS.voice.play(key, text); return; }
  const now = Date.now();
  if (now - lastWrongVoice > 10000) { lastWrongVoice = now; KIDS.voice.play(key, text); }
};

const stageEl = $id('stage'), boardEl = $id('board'), colA = $id('col-a'), colF = $id('col-f'),
      linesEl = $id('lines'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');
const SVGNS = 'http://www.w3.org/2000/svg';

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let drag = null;                                // 拖线状态 {a, x, y, target, path, dot, cache}

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));
const acardEl = lib => colA.querySelector('.acard[data-lib="' + lib + '"]');
const fcardEl = lib => colF.querySelector('.fcard[data-lib="' + lib + '"]');
const curQ = () => cur ? cur.qs[cur.qIdx] : null;

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 66);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
}

/* ================= 渲染：逐题制（左卡主体 + 右列候选） ================= */
function cellSvg(type, lib) {
  return '<span class="pic">' + (type === 'animal' ? ANIMALS_SVG[lib] : FOODS_SVG[lib]) + '</span>';
}
function buildQ() {                             // 渲染当前题（qIdx）
  const q = curQ();
  if (!q) return;
  colA.querySelectorAll('.acard,.col-head-dyn').forEach(e => e.remove());
  colF.querySelectorAll('.fcard').forEach(e => e.remove());
  /* 左卡：pair/set/anti=动物；chain=链图（up=base→mid→? / down=base→?→top） */
  const left = document.createElement('div');
  if (q.kind === 'chain') {
    left.className = 'card acard chaincard';
    left.dataset.lib = q.left;
    const arr = '<span class="ch-arrow">' + ICONS.arrow + '</span>';
    const qmark = '<span class="ch-q">?</span>';
    const c1 = '<span class="ch-cell">' + cellSvg('food', q.base) + '<span class="lab">' + FM[q.base] + '</span></span>';
    const c2 = q.dir === 'up'
      ? '<span class="ch-cell">' + cellSvg('food', q.mid) + '<span class="lab">' + FM[q.mid] + '</span></span>' + arr + qmark
      : qmark + arr + '<span class="ch-cell">' + cellSvg('animal', q.top) + '<span class="lab">' + NM[q.top] + '</span></span>';
    left.innerHTML = c1 + arr + c2;
    left.setAttribute('aria-label', FM[q.base] + '到' + (q.dir === 'up' ? FM[q.mid] : NM[q.top]) + '的链条');
  } else {
    left.className = 'card acard';
    left.dataset.lib = q.left;
    left.setAttribute('aria-label', NM[q.animal]);
    left.innerHTML = cellSvg('animal', q.animal) + '<span class="lab">' + NM[q.animal] + '</span>' +
      '<span class="q-bub">?</span>';
  }
  colA.appendChild(left);
  /* 右列：pickType=animal→动物候选（chain up）；food→食物候选 */
  q.picks.forEach(lib => {
    const d = document.createElement('div');
    d.className = 'card fcard';
    d.dataset.lib = lib;
    d.setAttribute('aria-label', q.pickType === 'animal' ? NM[lib] : FM[lib]);
    d.innerHTML = cellSvg(q.pickType, lib) +
      '<span class="nom">' + ICONS.nom + '</span>' +
      '<span class="tick">' + ICONS.check + '</span>' +
      '<span class="lab">' + (q.pickType === 'animal' ? NM[lib] : FM[lib]) + '</span>';
    colF.appendChild(d);
  });
  layoutBoard();
}
/* 卡尺寸按 stage 实时算：卡 ≥88、左卡+右列+中缝在双 viewport 内自适配（右列最多 5 卡） */
function layoutBoard() {
  if (!cur) return;
  const q = curQ();
  if (!q) return;
  const nR = q.picks.length;
  const availW = stageEl.clientWidth - 16;
  const availH = stageEl.clientHeight - 10;
  const gap = nR >= 5 ? 10 : 14;
  const isChain = q.kind === 'chain';
  const h = Math.floor((availH - 26 - (nR - 1) * gap) / nR);   // 26 = 列头高度
  let card = Math.min(h, 168);
  /* 左卡（链卡宽 2.4×）+右列+中缝 ≤availW；中缝 ≥56（拖线道） */
  const mid = 64;
  card = Math.min(card, Math.floor((availW - mid) / (isChain ? 3.4 : 2)));
  const size = Math.max(88, Math.min(card, 168));
  const root = document.documentElement.style;
  root.setProperty('--card', size + 'px');
  root.setProperty('--chainw', Math.round(size * 2.4) + 'px');
  root.setProperty('--gap', gap + 'px');
  root.setProperty('--mid', mid + 'px');
}
function renderStep() {                         // HUD 本关 5 题进度点（当前题连满也点亮）
  const tray = $id('step-dots');
  tray.innerHTML = '';
  for (let i = 0; i < Q_PER_LEVEL; i++) {
    const q = cur.qs[i];
    const done = i < cur.qIdx || (q && q.linked.length >= q.need.length);
    const dot = document.createElement('i');
    dot.className = done ? 'done' : (i === cur.qIdx ? 'cur' : '');
    tray.appendChild(dot);
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

/* ================= 连线层几何 ================= */
function svgEl(tag, cls) {
  const e = document.createElementNS(SVGNS, tag);
  if (cls) e.setAttribute('class', cls);
  return e;
}
/* 卡片锚点（相对 #lines 的坐标）：左卡=右缘中点偏上，右列卡=左缘中点偏上 */
function anchorOf(el, side) {
  const r = el.getBoundingClientRect(), b = linesEl.getBoundingClientRect();
  return [Math.round((side === 'R' ? r.right : r.left) - b.left),
          Math.round(r.top - b.top + r.height * 0.45)];
}
/* 拖线中缓存的不缩放几何（.near 有 scale 过渡，实时量会读到中途位置——§0.11 坑） */
function cacheFoodRects() {
  const b = linesEl.getBoundingClientRect();
  const out = [];
  colF.querySelectorAll('.fcard').forEach(el => {
    const lib = Number(el.dataset.lib);
    if (el.classList.contains('linked') || el.classList.contains('eaten')) return;   // 已连过的不是目标
    const r = el.getBoundingClientRect();
    out.push({ lib: lib, el: el, cx: r.left - b.left + r.width / 2, cy: r.top - b.top + r.height / 2,
               w: r.width, h: r.height });
  });
  return out;
}
const lineD = (a, e, sag) => {
  const mx = (a[0] + e[0]) / 2;
  const my = Math.max(a[1], e[1]) + (sag || 0);
  return 'M' + a[0] + ' ' + a[1] + ' Q' + mx + ' ' + my + ' ' + e[0] + ' ' + e[1];
};
/* 已连的绿色固定线（part/right 同绿；data-lib=左卡 lib，data-food=右列卡 lib——verify 用） */
function commitLine(a, f) {
  const g = svgEl('g', 'okg');
  g.setAttribute('data-lib', a);
  g.setAttribute('data-food', f);
  const ca = acardEl(a), cf = fcardEl(f);
  if (!ca || !cf) return;
  const A = anchorOf(ca, 'R');
  cf.classList.add('notrans');                  /* near 高亮回落的 .15s 过渡中量左锚点会偏 ~4px，关过渡立即到位 */
  const B = anchorOf(cf, 'L');
  cf.classList.remove('notrans');
  const p = svgEl('path', 'okline');
  p.setAttribute('d', lineD(A, B, 18));
  g.appendChild(p);
  [[A], [B]].forEach(([pt]) => {
    const c = svgEl('circle', 'okdot');
    c.setAttribute('cx', pt[0]); c.setAttribute('cy', pt[1]); c.setAttribute('r', 6);
    g.appendChild(c);
  });
  linesEl.appendChild(g);
}
function layoutLines() {                        // 重画当前题已连线（题切换/resize）
  linesEl.querySelectorAll('.okg').forEach(g => g.remove());
  if (!cur) return;
  const q = curQ();
  if (q) q.linked.forEach(f => commitLine(q.left, f));
}
window.addEventListener('resize', () => {
  if (!cur) return;
  if (drag) { removeDragEls(drag); drag = null; }   // 拖线中窗口变化：取消本次拖线（零惩罚）
  layoutBoard();
  layoutLines();
});

/* ================= 拖线（pointerdown 左卡 → move 实时画线 → up 吸附判定） ================= */
function removeDragEls(d) {
  if (d.path) d.path.remove();
  if (d.dot) d.dot.remove();
}
function clearNear() {
  colF.querySelectorAll('.fcard.near').forEach(e => e.classList.remove('near'));
}
function beginDrag(aLib, x, y) {
  const el = acardEl(aLib);
  if (!el) return null;
  clearNear();
  const d = { a: aLib, x: x, y: y, target: null, origin: anchorOf(el, 'R'), cache: cacheFoodRects() };
  d.path = svgEl('path', 'dragline');
  d.path.setAttribute('d', lineD(d.origin, [x, y], 14));
  d.dot = svgEl('circle', 'dragdot');
  d.dot.setAttribute('cx', x); d.dot.setAttribute('cy', y); d.dot.setAttribute('r', 9);
  linesEl.appendChild(d.path); linesEl.appendChild(d.dot);
  drag = d;
  lastAct = Date.now();
  sfx('click');
  return d;
}
function moveDrag(x, y) {
  if (!drag) return;
  drag.x = x; drag.y = y;
  drag.path.setAttribute('d', lineD(drag.origin, [x, y], 14));
  drag.dot.setAttribute('cx', x); drag.dot.setAttribute('cy', y);
  /* 吸附预判：最近未连候选卡，距中心 ≤ 半宽+32（防手滑宽松判定）→ 高亮 */
  let best = null, bestD = 1e9;
  drag.cache.forEach(c => {
    const dist = Math.hypot(x - c.cx, y - c.cy);
    if (dist < bestD) { bestD = dist; best = c; }
  });
  const near = best && bestD <= best.w / 2 + 32 ? best : null;
  if (drag.target !== (near && near.lib)) {
    clearNear();
    drag.target = near ? near.lib : null;
    if (near) near.el.classList.add('near');
  }
}
function retract(d) {                           // 线弹回动画（错连/取消）：端点回收到左卡锚点
  const fx = d.x, fy = d.y;
  const t0 = performance.now(), dur = Math.max(60, 180 * SPEED);
  const step = t => {
    const k = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - k, 2);
    const x = fx + (d.origin[0] - fx) * e, y = fy + (d.origin[1] - fy) * e;
    if (d.path.isConnected) d.path.setAttribute('d', lineD(d.origin, [x, y], 14));
    if (d.dot.isConnected) { d.dot.setAttribute('cx', x); d.dot.setAttribute('cy', y); }
    if (k < 1) requestAnimationFrame(step);
    else removeDragEls(d);
  };
  requestAnimationFrame(step);
}
function endDrag() {                            // 松手：吸附目标判定（事件与教学演示共用）
  if (!drag) return Promise.resolve(null);
  const d = drag;
  drag = null;
  clearNear();
  if (d.target == null) { retract(d); return Promise.resolve('cancel'); }
  return uiLink(d.a, d.target, false).then(r => {
    if (r === 'part' || r === 'right' || r === 'done') removeDragEls(d);
    else retract(d);                            // 错连：线弹回（零惩罚，可重连）
    return r;
  });
}
/* 指针事件（capture 到 stage：拖出区域仍收 move/up） */
let revTipAt = 0;                                  /* 反向拖提示节流锚（5 岁半试玩 P2） */
stageEl.addEventListener('pointerdown', e => {
  if (!cur || state.locked || state.won || state.demo) return;
  const el = e.target.closest('.acard');
  if (!el) {
    /* 反向拖（从候选卡起拖）轻提示：孩子第一反应高发点原为零反馈 */
    const fel = e.target.closest('.fcard');
    if (fel && !fel.classList.contains('eaten') && !fel.classList.contains('linked') &&
        Date.now() - revTipAt > 10000) {
      revTipAt = Date.now();
      lastAct = Date.now();
      sayR(VOICE.rev.key, VOICE.rev.text);
    }
    return;
  }
  e.preventDefault();
  /* 双指/连按两卡时，上一根未完成拖线的引用被 beginDrag 覆盖 → 孤儿线永久残留：先回收旧线 */
  if (drag) { clearNear(); removeDragEls(drag); drag = null; }
  try { stageEl.setPointerCapture(e.pointerId); } catch (err) {}
  const b = linesEl.getBoundingClientRect();
  beginDrag(Number(el.dataset.lib), e.clientX - b.left, e.clientY - b.top);
});
stageEl.addEventListener('pointermove', e => {
  if (!drag) return;
  e.preventDefault();
  const b = linesEl.getBoundingClientRect();
  moveDrag(e.clientX - b.left, e.clientY - b.top);
});
stageEl.addEventListener('pointerup', () => { if (drag) endDrag(); });
stageEl.addEventListener('pointercancel', () => {
  if (drag) { const d = drag; drag = null; clearNear(); removeDragEls(d); }
});

/* ================= 连线主路径（真实拖拽 / CON.dragTo / autoSolve 共用） ================= */
async function uiLink(aIdx, bIdx, demo) {
  if (!cur || (state.locked && !demo) || state.won || (state.demo && !demo)) return null;
  const q = curQ();
  if (!q) return null;
  if (aIdx !== q.left) return null;
  if (q.linked.length >= q.need.length) return 'fed';
  const r = engLink(cur, aIdx, bIdx);
  if (r === null) return null;
  lastAct = Date.now();
  const ca = acardEl(aIdx), cf = fcardEl(bIdx);
  if (r === 'part') {
    /* 集合内连对未满：线固定+食物挂对勾（不 miss 不推进） */
    state.locked = true;
    commitLine(aIdx, bIdx);
    if (cf) { cf.classList.add('linked'); cf.classList.add('notrans'); }
    sfx('coin');
    await wait(560 * SPEED);
    state.locked = false;
  } else if (r === 'right' || r === 'done') {
    if (state.tut === 'help') {                 // 教学"独"：首次连对 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    state.locked = true;
    commitLine(aIdx, bIdx);
    if (cf) { cf.classList.add('linked'); cf.classList.add('eaten'); cf.classList.add('notrans'); }
    if (ca) ca.classList.add('fed');
    sfx('coin');
    const kv = PAIR_VOICE[q.animal];               /* 半会/超纲配对知识语音（每关限 2 次，v1 机制） */
    if (kv && (r === 'right' || r === 'done')) {
      cur._kvCount = cur._kvCount || 0;
      if (cur._kvCount < 2) { cur._kvCount++; sayR(kv.key, kv.text); }
      else sayR(confirmKeyOf(q), confirmOf(q));
    } else {
      sayR(confirmKeyOf(q), confirmOf(q));         /* 确认句整句 clip（T46；听读窗=estMs+300） */
    }
    await wait(Math.max(880, estMs(confirmOf(q).length) + 300) * SPEED);
    state.locked = false;
    if (r === 'done') { renderStep(); winFlow(); return r; }
    engNext(cur);
    renderStep();
    buildQ();
    layoutLines();
    startQVoice();
  } else {                                      // 错连：线弹回+两卡晃动（零惩罚可重连）+题型方向锚
    q._miss = (q._miss || 0) + 1;
    [ca, cf].forEach(el => {
      if (!el) return;
      el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    });
    const nextFood = q.need.find(x => q.linked.indexOf(x) < 0);
    const ok = nextFood != null ? fcardEl(nextFood) : null;   // 首错不 pulse 正确项，连错 2 次才高亮
    if (ok && q._miss >= 2) { ok.classList.remove('pulse'); void ok.offsetWidth; ok.classList.add('pulse'); }
    sfx('fail');
    sayW(wrongAnchorOf(q).key, wrongAnchorOf(q).text);
    await wait(520 * SPEED);
  }
  return r;
}
/* 按题型错连锚：pair/set=它不吃这个 / anti=别的动物也爱吃 / chain=想一想谁会吃掉它 */
function wrongAnchorOf(q) {
  if (q.kind === 'anti') return VOICE.wShare;
  if (q.kind === 'chain') return VOICE.wChain;
  return VOICE.wFood;
}
/* 新题题面句（任务语音，不设 flat 门——不识字孩子靠听；T46 整句 clip con_st_*，text=防御兜底） */
function startQVoice() {
  const q = curQ();
  if (!q || VERIFY) return;
  sayR(stemKeyOf(q), q.stem);
}

/* ================= 幽灵手指（教学"帮"/演示共用） ================= */
const ghost = {
  toEl(el) { const r = el.getBoundingClientRect(); ghostEl.style.left = (r.left + r.width / 2) + 'px'; ghostEl.style.top = (r.top + r.height * 0.62) + 'px'; },
  show(reason) { ghostReason = reason; ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostReason = null; ghostEl.classList.remove('show', 'pressing'); }
};
let ghostReason = null;
function pointGhostAt(el, reason) {
  if (VERIFY || !el) return;
  ghost.toEl(el);
  ghost.show(reason);
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(() => ghost.press(), 800);
}

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const f = flat == null ? cur.flat : flat;
  const ci = Math.floor(f / CH_LEN);
  /* 章末预告=刚打完章的下一章（ci<4）；生成关=实算下一关章型 GEN[dch-1]（家族 F，r6 审查 m-2：
     (ci+1)%4 章序推进仅 dch 循环策略下巧合等值，防御性禁式——habitat r4 M-1 同型） */
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[genLevel(f + 1).dch - 1];
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
      KIDS.ui.dayEnd({ nextHint: nextHint(null) });
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
  clearTimeout(helpTimer);
  ghost.hide();
  if (drag) { removeDragEls(drag); drag = null; }
  lastWrongVoice = 0;                          /* r6 审查 m-5：关切换重置错链节流锚（b26 坑⑦——跨关 10s 窗首错方向锚被吞） */
  cur = genLevel(flat);
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  buildQ(); renderStep(); renderDots();
  layoutLines();                                // 新关清空旧线
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.connect && sv.connect.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  startQVoice();                                // 题面任务语音不设 flat 门（不识字孩子 flat≥3 也能听题）
}
/* 题切换（uiLink right 后调用；教学重开共用） */
function enterQ() {
  buildQ();
  layoutLines();
  renderStep();
  startQVoice();
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const q = curQ();                             // 确定性关卡：flat0 题0 恒 兔→萝卜（教学锚）
  const a = q.left, f = q.need[0];
  const cA = acardEl(a), cF = fcardEl(f);
  if (!cA || !cF) { state.demo = false; state.locked = false; return; }
  ghost.toEl(cA); ghost.show('tut');
  await wait(1400 * SPEED);
  ghost.press();
  const A = anchorOf(cA, 'R');
  const d = beginDrag(a, A[0], A[1]);           // 走真实拖线管线（教学直调，绕过事件门）
  if (!d) { state.demo = false; state.locked = false; return; }
  const tgt = d.cache.filter(c => c.lib === f)[0];
  const B = [tgt.cx, tgt.cy];
  const steps = 9;                              // 线头 9 步扫向目标卡（真实 move 序列）
  for (let s = 1; s <= steps; s++) {
    const k = s / steps;
    moveDrag(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k);
    if (s === 4) ghost.toEl(cF);                // 手指随线头移向目标
    await wait(110 * SPEED);
  }
  await wait(260 * SPEED);
  state.demo = false;                           // 临时解锁走真实路径演示一次完整连对演出
  state.locked = false;
  await endDrag();
  const sv = KIDS._save();
  sv.connect = sv.connect || {};
  sv.connect.tutSeen = true;
  KIDS.store.persist();
  sayP(VOICE.turn.key, VOICE.turn.text);
  await wait(500 * SPEED);
  ghost.hide();
  cur = genLevel(cur.flat);                     // 确定性关卡：同一关重来（布局一致），进入"帮"
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  enterQ();
  setTimeout(() => { if (state.tut === 'help') pointGhostAt(acardEl(curQ().left), 'tut'); }, 600);
}

/* ================= 底栏交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
function hintVoiceOf(q) {                        /* 兔子按钮/救援按题型选播 */
  if (!q) return VOICE.hint;
  if (q.kind === 'anti') return VOICE.hAnti;
  if (q.kind === 'chain') return VOICE.wChain;
  if (q.kind === 'set' && q.linked.length < q.need.length) return VOICE.less;
  return VOICE.hint;
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  const v = hintVoiceOf(curQ());
  sayR(v.key, v.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});

/* ================= 无操作看护：20s 提示（set 未连满=con_less「还差一个」不算 miss；题型方向 hint） ================= */
let helpTimer = null;
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    const v = hintVoiceOf(curQ());              // 救援语音不受 flat 门
    sayR(v.key, v.text);
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    const q = curQ();
    if (q) {
      const nextFood = q.need.find(x => q.linked.indexOf(x) < 0);
      pointGhostAt(nextFood != null ? fcardEl(nextFood) : acardEl(q.left), 'tut');
    }
  }
}, 1000);

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'connect', title: '连线朋友' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) { // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用；r6 逐题契约） ================= */
window.CON = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, qIdx: cur.qIdx,
                   nQ: cur.qs.length, misses: cur.misses, done: cur.done, won: state.won } : null;
  },
  get quiz() {
    if (!cur || cur.done) return null;
    const q = curQ();
    if (!q) return null;
    return { kind: q.kind, dir: q.dir || null, animal: q.animal != null ? q.animal : null,
             chain: q.chain != null ? q.chain : null, base: q.base != null ? q.base : null,
             mid: q.mid != null ? q.mid : null, top: q.top != null ? q.top : null,
             left: q.left, pickType: q.pickType, need: q.need.slice(),
             picks: q.picks.slice(), linked: q.linked.slice(), qIdx: cur.qIdx, misses: cur.misses,
             stem: q.stem, confirm: confirmOf(q) };
  },
  dragTo(aIdx, bIdx) { return uiLink(aIdx, bIdx, false); },   // 直驱判定（verify/测试用）
  start(flat) { startLevel(flat); },                        // 加载指定关（测试辅助；color COL.level 同构）
  async autoSolve() {                           // UI 路径自动连完当前关（走真实 uiLink 流程）
    let k = 0;
    while (cur && !cur.done && k++ < 30) {
      const q = curQ();
      if (!q) break;
      let progressed = false;
      for (const f of q.need) {
        if (q.linked.indexOf(f) < 0) { await uiLink(q.left, f, false); progressed = true; break; }
      }
      if (!progressed) break;                   // 防御：当前题已连满但未推进
    }
    return { done: !!(cur && cur.done), links: k };
  },
  get tutorial() { return state.tut; },
  get busy() { return state.locked || state.demo; }   // 演出窗口中（测试等待用）
};
