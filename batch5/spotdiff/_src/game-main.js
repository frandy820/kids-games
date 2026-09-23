/* ================= spotdiff 主逻辑（双图渲染 / 下图点选 / 教学 / 推进）
   玩法：上下两幅同场景花园图，下图有 K 处不同；点下图不同处→圈中动画+音效+进度点亮；
   点空白轻摆零惩罚（首错不 pulse，连错 2 次才高亮剩余一处）；全找到过关。
   验收钩子：window.SPD = { get currentLevel, get quiz(), tapAt(x,y), tapDiff(i), async autoSolve() } */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const wait = ms => new Promise(r => setTimeout(r, ms));
const SPEED = VERIFY ? 0.12 : 1;               // verify 页内 UI 演出提速
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
/* 语音仅前 3 关（flat<3）；core 章/日/休息语音不受限 */
const sayP = (key, text) => { if (cur && cur.flat < 3) KIDS.voice.play(key, text); };
/* 救援语音不受 flat 门限制（评估 P1：flat≥3 静置 20s 零救援）；idle 看护必用 sayR */
const sayR = (key, text) => { if (cur) KIDS.voice.play(key, text); };

const topWrapEl = $id('pic-top'), bottomWrapEl = $id('pic-bottom'),
      foundTrayEl = $id('found-dots'), chipEl = $id('prompt-chip'), ghostEl = $id('ghost'),
      rabbitBtn = $id('btn-rabbit'), replayBtn = $id('btn-replay');
const topSvgEl = () => topWrapEl.querySelector('svg');
const bottomSvgEl = () => bottomWrapEl.querySelector('svg');

let cur = null;                                 // 当前关模型（genLevel 产物，UI 与引擎共用）
let state = { locked: false, won: false, demo: false, tut: 'none' };
let lastAct = Date.now();
let helpRedemo = false;
let hintShown = false;                          // 连错 2 次的剩余差异高亮（下次找到即隐藏）

const keyOf = i => (Math.floor(i / CH_LEN) + 1) + '-' + (i % CH_LEN);
const keysUpTo = lim => Array.from({ length: lim }, (_, i) => keyOf(i));

/* ================= 静态构建 ================= */
function buildStatic() {
  $id('logo').innerHTML = ICONS.logo;
  replayBtn.innerHTML = ICONS.replay;
  rabbitBtn.innerHTML = KIDS.assets.rabbit('normal', 72);
  ghostEl.innerHTML = ICONS.finger + '<div class="g-ripple"></div>';
  chipEl.innerHTML = ICONS.look + '<span class="big">两幅图哪里不一样？</span>';
}

/* ================= 场景 SVG（上图=基准元素；下图=bottomEls 应用差异；viewBox 同 800×460） ================= */
function elSvg(e) {
  const t = 'translate(' + e.x + ',' + e.y + ') scale(' + e.s.toFixed(3) + ')';
  if (e.kind === 'sun') {
    let rays = '';
    for (let i = 0; i < 8; i++) {
      const a = i * 45 * Math.PI / 180;
      rays += '<line x1="' + (Math.sin(a) * 46).toFixed(1) + '" y1="' + (-Math.cos(a) * 46).toFixed(1) +
        '" x2="' + (Math.sin(a) * 60).toFixed(1) + '" y2="' + (-Math.cos(a) * 60).toFixed(1) +
        '" stroke="#F2C94C" stroke-width="6" stroke-linecap="round"/>';
    }
    return '<g transform="' + t + '">' + rays +
      '<circle r="38" fill="#F7CE46" stroke="' + INK + '" stroke-width="4"/>' +
      '<circle cx="-12" cy="-6" r="3.6" fill="' + INK + '"/><circle cx="12" cy="-6" r="3.6" fill="' + INK + '"/>' +
      '<path d="M-10 8 q10 9 20 0" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="-22" cy="6" r="5" fill="#F2B8C6" opacity=".7"/><circle cx="22" cy="6" r="5" fill="#F2B8C6" opacity=".7"/></g>';
  }
  if (e.kind === 'cloud') {
    return '<g transform="' + t + '" opacity=".96">' +
      '<ellipse cx="-36" cy="6" rx="30" ry="19" fill="#FFFFFF" stroke="#DCCFB8" stroke-width="3"/>' +
      '<ellipse cx="36" cy="8" rx="27" ry="17" fill="#FFFFFF" stroke="#DCCFB8" stroke-width="3"/>' +
      '<ellipse cx="0" cy="-8" rx="36" ry="25" fill="#FFFFFF" stroke="#DCCFB8" stroke-width="3"/>' +
      '<ellipse cx="0" cy="8" rx="44" ry="18" fill="#FFFFFF"/></g>';
  }
  if (e.kind === 'flower') {
    let petals = '';
    for (let i = 0; i < 6; i++) {
      petals += '<ellipse rx="12" ry="16" cy="-24" fill="' + COLORS[e.c] + '" stroke="' + INK +
        '" stroke-width="2.5" transform="rotate(' + i * 60 + ')"/>';
    }
    return '<g transform="' + t + '">' +
      '<path d="M0 8 q-5 26 0 46" stroke="#7FA069" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="-13" cy="32" rx="11" ry="6" fill="#9CC48A" stroke="#7FA069" stroke-width="2" transform="rotate(-24 -13 32)"/>' +
      petals + '<circle r="10.5" fill="#F7CE46" stroke="' + INK + '" stroke-width="2.5"/></g>';
  }
  if (e.kind === 'butterfly') {
    return '<g transform="' + t + '">' +
      '<ellipse cx="-17" cy="-8" rx="14" ry="18" fill="' + COLORS[e.c] + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<ellipse cx="17" cy="-8" rx="14" ry="18" fill="' + COLORS[e.c] + '" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<ellipse cx="-13" cy="11" rx="10" ry="12" fill="' + COLORS[e.c] + '" stroke="' + INK + '" stroke-width="2.5" opacity=".9"/>' +
      '<ellipse cx="13" cy="11" rx="10" ry="12" fill="' + COLORS[e.c] + '" stroke="' + INK + '" stroke-width="2.5" opacity=".9"/>' +
      '<ellipse cx="0" cy="2" rx="5.5" ry="17" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M-3 -14 q-6 -9 -11 -11 M3 -14 q6 -9 11 -11" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="-14" cy="-10" r="2" fill="#FFF" opacity=".85"/><circle cx="14" cy="-10" r="2" fill="#FFF" opacity=".85"/></g>';
  }
  if (e.kind === 'mushroom') {
    return '<g transform="' + t + '">' +
      '<rect x="-10" y="-2" width="20" height="30" rx="7" fill="#F7EEDE" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M-31 -2 A31 31 0 0 1 31 -2 Z" fill="' + COLORS[e.c] + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="-13" cy="-16" r="4.5" fill="#FFF" opacity=".92"/><circle cx="6" cy="-21" r="3.6" fill="#FFF" opacity=".92"/>' +
      '<circle cx="17" cy="-11" r="3" fill="#FFF" opacity=".92"/></g>';
  }
  /* rabbit（迷你小兔，IP 形象） */
  return '<g transform="' + t + '">' +
    '<ellipse cx="0" cy="24" rx="20" ry="14" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="10" cy="26" r="6" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="-11" cy="-22" rx="7" ry="19" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-9 -11 -22)"/>' +
    '<ellipse cx="-11" cy="-22" rx="3" ry="12" fill="#F2B8C6" transform="rotate(-9 -11 -22)"/>' +
    '<ellipse cx="9" cy="-23" rx="7" ry="20" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" transform="rotate(11 9 -23)"/>' +
    '<ellipse cx="9" cy="-23" rx="3" ry="13" fill="#F2B8C6" transform="rotate(11 9 -23)"/>' +
    '<circle cx="0" cy="-2" r="19" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="-7" cy="-4" r="2.8" fill="' + INK + '"/><circle cx="7" cy="-4" r="2.8" fill="' + INK + '"/>' +
    '<ellipse cx="0" cy="2" rx="2.6" ry="2" fill="#D98A8A"/>' +
    '<path d="M-4 7 q4 3.5 8 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="-13" cy="4" rx="4.5" ry="3.2" fill="#F2B8C6" opacity=".8"/><ellipse cx="13" cy="4" rx="4.5" ry="3.2" fill="#F2B8C6" opacity=".8"/></g>';
}
const SCENE_DECO =                                   // 静景（两图完全一致，不参与差异）
  '<defs><linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#C9E8F6"/><stop offset="1" stop-color="#E6F5FB"/></linearGradient>' +
  '<linearGradient id="grsG" x1="0" y1="0" x2="0" y2="1">' +
  '<stop offset="0" stop-color="#BCDF9F"/><stop offset="1" stop-color="#A4D187"/></linearGradient></defs>' +
  '<rect width="800" height="460" fill="url(#skyG)"/>' +
  '<path d="M0 268 Q140 240 300 258 T620 252 Q720 246 800 258 L800 460 L0 460 Z" fill="url(#grsG)"/>' +
  '<path d="M0 268 Q140 240 300 258 T620 252 Q720 246 800 258" fill="none" stroke="#8FBF7F" stroke-width="5" stroke-linecap="round" opacity=".6"/>' +
  '<path d="M120 300 q3 -16 0 -24 M132 302 q4 -12 9 -18 M109 302 q-4 -12 -9 -18" stroke="#7FA069" stroke-width="4" fill="none" stroke-linecap="round"/>' +
  '<path d="M452 386 q3 -16 0 -24 M464 388 q4 -12 9 -18 M441 388 q-4 -12 -9 -18" stroke="#7FA069" stroke-width="4" fill="none" stroke-linecap="round"/>' +
  '<path d="M688 356 q3 -16 0 -24 M700 358 q4 -12 9 -18 M677 358 q-4 -12 -9 -18" stroke="#7FA069" stroke-width="4" fill="none" stroke-linecap="round"/>';
function sceneSvg(els, withLayers) {
  const body = els.slice().sort((a, b) => a.y - b.y).map(elSvg).join('');
  return '<svg viewBox="0 0 ' + VB_W + ' ' + VB_H + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid meet">' +
    SCENE_DECO + body +
    (withLayers ? '<g class="rings"></g><g class="hints"></g><g class="hotzones"></g>' : '<g class="rings"></g>') +
    '</svg>';
}

/* ================= 渲染 ================= */
function renderPics() {
  topWrapEl.innerHTML = sceneSvg(cur.els, false) + '<div class="cap">上面的图</div>';
  bottomWrapEl.innerHTML = sceneSvg(bottomEls(cur), true) + '<div class="cap">点下面的图</div>';
  layoutStage();
  renderHotzones();
  renderFound();
}
/* 命中热区（透明圆，仅几何证明触摸目标 ≥64px 半径；判定走最近-距离数学） */
function hitRadiusVb() {
  const svg = bottomSvgEl();
  if (!svg) return 64;
  const r = svg.getBoundingClientRect();
  const scale = r.width / VB_W;
  return scale > 0 ? 64 / scale : 64;
}
function renderHotzones() {
  const svg = bottomSvgEl();
  const g = svg && svg.querySelector('.hotzones');
  if (!g) return;
  g.innerHTML = '';
  const Rv = hitRadiusVb();
  cur.diffs.forEach((d, i) => {
    if (cur.found[i]) return;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'hotzone');
    c.setAttribute('data-i', i);
    c.setAttribute('cx', d.x); c.setAttribute('cy', d.y);
    c.setAttribute('r', Math.round(Rv * 10) / 10);
    g.appendChild(c);
  });
}
function renderFound() {                         // HUD 找到进度：K 个小圆点亮起
  foundTrayEl.innerHTML = '';
  for (let i = 0; i < cur.k; i++) {
    const d = document.createElement('i');
    d.className = cur.found[i] ? 'done' : '';
    foundTrayEl.appendChild(d);
  }
}
function renderDots() {                          // 章节点（1 基，生成关循环章画到当前章）
  const dots = $id('chapter-dots');
  dots.innerHTML = '';
  const sv = KIDS._save() || { levels: {} };
  for (let c = 1; c <= Math.max(4, cur.ch); c++) {
    const i = document.createElement('i');
    const done = [0, 1, 2, 3, 4].every(l => sv.levels[c + '-' + l]);
    i.className = done ? 'done' : (c === cur.ch ? 'cur' : '');
    dots.appendChild(i);
  }
}
/* 圈中标记（下图=差异处；上图确认视觉锚点——move 类元素已挪走，须圈在原位） */
function drawRing(i) {
  const d = cur.diffs[i];
  /* 反方审查 m8：move 类 d.x/d.y=下图新位，上图该处是空地——上图圈 els 原位 */
  const topPos = d.type === 'move' && cur.els[d.ei] ? { x: cur.els[d.ei].x, y: cur.els[d.ei].y } : { x: d.x, y: d.y };
  [[topSvgEl(), topPos], [bottomSvgEl(), { x: d.x, y: d.y }]].forEach(pair => {
    const svg = pair[0], pos = pair[1];
    if (!svg) return;
    const g = svg.querySelector('.rings');
    if (!g) return;
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'ring');
    c.setAttribute('cx', pos.x); c.setAttribute('cy', pos.y);
    c.setAttribute('r', 56);
    g.appendChild(c);
  });
  const bsvg = bottomSvgEl();
  const hz = bsvg && bsvg.querySelector('.hotzones .hotzone[data-i="' + i + '"]');
  if (hz) hz.remove();
}
/* 连错 2 次支架：高亮剩余最近一处（虚线圈呼吸；首错绝不 pulse——给再想机会） */
function showHintRing(x, y) {
  hideHintRing();
  const svg = bottomSvgEl();
  const g = svg && svg.querySelector('.hints');
  if (!g) return;
  const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  c.setAttribute('class', 'hintring');
  c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 62);
  g.appendChild(c);
  hintShown = true;
}
function hideHintRing() {
  const svg = bottomSvgEl();
  const g = svg && svg.querySelector('.hints');
  if (g) g.innerHTML = '';
  hintShown = false;
}

/* ================= 尺寸（双 viewport：两图各 ≥200 高、宽 ≤800）
   横屏两图左右并排（与 CSS orientation:landscape 同源读 computed style）：
   单行高不受 /2 限制 → 1280×800 每幅 476→628 宽（5 岁半试玩 P1） ================= */
function layoutStage() {
  const st = $id('stage');
  const availW = st.clientWidth - 16;
  const availH = st.clientHeight - $id('prompt').offsetHeight - 30;   // 提示行 + 图注两行 + 间隙
  const row = getComputedStyle($id('pics')).flexDirection === 'row';
  let w = row
    ? Math.min((availW - 14) / 2, 780, (availH - 4) * VB_W / VB_H)
    : Math.min(availW, 780, Math.floor((availH - 10) / 2 * VB_W / VB_H));
  if (w < 348) w = Math.min(348, Math.max(200, availW));              // 极小窗兜底（标准双 viewport 不触发）
  const root = document.documentElement.style;
  root.setProperty('--imgw', Math.floor(w) + 'px');
}
window.addEventListener('resize', () => { if (cur) { layoutStage(); renderHotzones(); } });

/* ================= 幽灵手指（教学"帮"/演示共用；坐标=下图 vb 坐标换算页面像素） ================= */
const ghost = {
  toVb(x, y) {
    const svg = bottomSvgEl();
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    ghostEl.style.left = (r.left + x / VB_W * r.width) + 'px';
    ghostEl.style.top = (r.top + y / VB_H * r.height) + 'px';
  },
  show(reason) { ghostEl.classList.add('show'); },
  press() { ghostEl.classList.remove('pressing'); void ghostEl.offsetWidth; ghostEl.classList.add('pressing'); },
  hide() { ghostEl.classList.remove('show', 'pressing'); }
};
function pointGhostAt(x, y) {
  if (VERIFY) return;
  ghost.toVb(x, y); ghost.show('tut');
  setTimeout(() => ghost.press(), 800);
}

/* ================= 点选主路径（真实点击 / SPD.tapAt / tapDiff / autoSolve 共用） ================= */
async function uiTapAt(x, y, R, demo) {
  if (!cur || state.locked || state.won || (state.demo && !demo)) return { r: null };
  const res = engTap(cur, x, y, R);
  if (res.r === null || res.r === 'again') {
    if (res.r === 'again') sfx('pop');
    return res;
  }
  lastAct = Date.now();
  if (res.r === 'right' || res.r === 'done') {
    if (state.tut === 'help') {                   // 教学"独"：首次找到 → 强化反馈放手
      state.tut = 'solo';
      ghost.hide();
      hopRabbit();
    }
    hideHintRing();
    drawRing(res.i);
    renderFound();
    sfx('coin');
    if (res.r === 'done') { await wait(880 * SPEED); winFlow(); }
    return res;
  }
  /* miss：点空白 → 下图轻摆（零惩罚，可再点）；首错只轻声提示，连错 2 次才高亮剩余一处 */
  state.locked = true;
  bottomWrapEl.classList.remove('wob'); void bottomWrapEl.offsetWidth; bottomWrapEl.classList.add('wob');
  sfx('fail');
  sayP(VOICE.hint.key, VOICE.hint.text);
  if (cur.misses >= 2) {
    let bi = -1, bd = Infinity;
    cur.diffs.forEach((d, i) => {
      if (cur.found[i]) return;
      const dd = dist2(d.x, d.y, x, y);
      if (dd < bd) { bd = dd; bi = i; }
    });
    if (bi >= 0) showHintRing(cur.diffs[bi].x, cur.diffs[bi].y);
  }
  await wait(520 * SPEED);
  state.locked = false;
  return res;
}
/* 真实指针：下图按下即判定（坐标→viewBox；命中半径 64px 页面像素换算 vb） */
function toVb(e) {
  const svg = bottomSvgEl();
  if (!svg) return null;
  const m = svg.getScreenCTM();
  if (!m) return null;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const p = pt.matrixTransform(m.inverse());
  return [p.x, p.y];
}
bottomWrapEl.addEventListener('pointerdown', e => {
  if (!cur || state.locked || state.won || state.demo) return;
  const p = toVb(e);
  if (!p) return;
  e.preventDefault();
  uiTapAt(p[0], p[1], hitRadiusVb());
});
/* 点上图轻提示（5 岁半试玩 P2：孩子第一反应高发点完全无反馈；10s 节流，sayR 不受 flat 门） */
let topTipAt = 0;
topWrapEl.addEventListener('pointerdown', e => {
  if (!cur || state.locked || state.won || state.demo) return;
  e.preventDefault();
  lastAct = Date.now();
  if (Date.now() - topTipAt > 10000) { topTipAt = Date.now(); sayR(VOICE.top.key, VOICE.top.text); }
});

/* ================= 过关推进（celebrate → level.pass → 章末/日末） ================= */
function nextHint(flat) {
  const ci = Math.floor((flat == null ? cur.flat : flat) / CH_LEN);
  return ci < 4 ? CHAPTERS[ci + 1].hint : GEN_HINTS[(ci + 1) % 4];
}
function winFlow() {
  state.won = true;
  state.locked = true;
  ghost.hide();
  const stars = engStars(cur);
  sfx('win');
  if (VERIFY) return;                             // verify 页：引擎判定即止，不弹层不写档
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
  state = { locked: false, won: false, demo: false, tut: 'none' };
  helpRedemo = false;
  lastAct = Date.now();
  renderPics(); renderDots();
  if (VERIFY) return;
  const sv = KIDS._save();
  const freshTut = flat === 0 && !sv.levels['1-0'] && !(sv.spotdiff && sv.spotdiff.tutSeen);
  if (freshTut) { tutorialWatch(); return; }
  sayR(VOICE.hint.key, VOICE.hint.text);        /* 开场任务语音不设 flat 门（5 岁半试玩共性 P2：不识字孩子 flat≥3 全静默） */
}

/* ================= 教学（仅关 1-0 首次）：看→帮→独 ================= */
async function tutorialWatch() {
  state.demo = true; state.locked = true; state.tut = 'watch';
  sayP(VOICE.watch.key, VOICE.watch.text);
  await wait(700 * SPEED);
  const d = cur.diffs[0];
  pointGhostAt(d.x, d.y);
  await wait(1500 * SPEED);
  ghost.press();
  await wait(400 * SPEED);
  state.demo = false;                             // 临时解锁走真实路径演示一次完整圈中演出
  state.locked = false;
  await uiTapAt(d.x, d.y, 40, true);
  const sv = KIDS._save();
  sv.spotdiff = sv.spotdiff || {};
  sv.spotdiff.tutSeen = true;
  KIDS.store.persist();
  sayP(VOICE.turn.key, VOICE.turn.text);
  await wait(500 * SPEED);
  ghost.hide();
  cur = genLevel(0);                              // 确定性关卡：同一关重来（图面一致）
  state = { locked: false, won: false, demo: false, tut: 'help' };
  helpRedemo = false;
  lastAct = Date.now();
  renderPics(); renderDots();
  setTimeout(() => { if (state.tut === 'help') pointGhostAt(cur.diffs[0].x, cur.diffs[0].y); }, 600);
}

/* ================= 无操作看护：20s 救援语音 / 教学"帮"5s 重演示一次 ================= */
let helpTimer = null;
setInterval(() => {
  if (VERIFY || !cur || state.won || state.locked || state.demo) return;
  const idle = Date.now() - lastAct;
  if (idle > 20000) {
    sayR(VOICE.hint.key, VOICE.hint.text);        // 救援语音不受 flat 门（评估 P1）
    lastAct = Date.now();
    return;
  }
  if (idle > 5000 && state.tut === 'help' && !helpRedemo && !ghostEl.classList.contains('show')) {
    helpRedemo = true;
    pointGhostAt(cur.diffs[0].x, cur.diffs[0].y);
  }
}, 1000);

/* ================= 底栏交互 ================= */
function hopRabbit() {
  rabbitBtn.classList.remove('hop'); void rabbitBtn.offsetWidth; rabbitBtn.classList.add('hop');
}
rabbitBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  hopRabbit();
  sayP(VOICE.hint.key, VOICE.hint.text);
});
replayBtn.addEventListener('pointerdown', e => {
  e.preventDefault();
  if (VERIFY || !cur) return;
  lastAct = Date.now();
  startLevel(cur.flat);
});

/* ================= 启动（verify 分支由 game-verify.js 接管） ================= */
buildStatic();
if (!VERIFY) {
  KIDS.init({ game: 'spotdiff', title: '找不同' });
  const lim = KIDS.calendar.limit(Infinity), keys = keysUpTo(lim), sv = KIDS._save();
  let first = 0;
  for (let i = 0; i < lim; i++) { if (!sv.levels[keys[i]]) { first = i; break; } }
  if (lim > 0 && KIDS.calendar.dayDone(keys)) {   // 今日新关已玩完：收尾画面（可关闭继续重玩）
    KIDS.ui.dayEnd({ nextHint: nextHint(lim) });
    first = 0;
  }
  startLevel(first);
}

/* ================= 验收钩子（getter 模式，返回拷贝非活引用） ================= */
window.SPD = {
  get currentLevel() {
    return cur ? { flat: cur.flat, ch: cur.ch, dch: cur.dch, lv: cur.lv, k: cur.k,
      foundCount: cur.foundCount, misses: cur.misses, done: cur.done, won: state.won } : null;
  },
  get quiz() {
    if (!cur || cur.done) return null;
    return { k: cur.k,
      diffs: cur.diffs.map(d => ({ x: d.x, y: d.y, type: d.type })),
      found: cur.found.slice() };
  },
  tapAt(x, y) { return uiTapAt(x, y, hitRadiusVb()); },         // 按坐标找最近 diff 判定（真实点击模拟）
  tapDiff(i) { const d = cur && cur.diffs[i]; return d ? uiTapAt(d.x, d.y, 40) : { r: null }; },
  async autoSolve() {                                            // UI 路径自动点完当前关（走真实判定流程）
    let n = 0;
    while (cur && !cur.done && n++ < 12) {
      const i = cur.found.indexOf(false);
      if (i < 0) break;
      await uiTapAt(cur.diffs[i].x, cur.diffs[i].y, 40);
      await wait(60 * SPEED);
    }
    return { done: !!(cur && cur.done), taps: n };
  },
  get tutorial() { return state.tut; }
};
