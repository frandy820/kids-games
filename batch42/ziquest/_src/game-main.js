/* ================= ziquest 主逻辑（M1 地图骨架）：core 接线 / 存档 / 七层 SVG / 状态机
   结构：zqEnsure(save) 建 zq 命名空间（旧档无 zq=首进序章，§6.4 schema）→ buildMap() 七层渲染
   （L0 天空色带/L1 远景视差/L2 地块+迷雾/L3 路径 dash/L4 节点4态/L5 兔子hop+装扮槽/L6 粒子池）
   → refreshMap() 全量状态刷 → wrapper 单 transform 平移 + 当前节点居中（800ms）。
   语音段一：zq_ 0 键=静音可玩（core v1.0 缺 clip 静默兜底，play 一律单 key 调用禁 TTS 回退文本）。
   验收钩子：window.ZQ = { save, mapState, tapNode, curNode, … }（getter 拷贝非活引用——家族纪律）。 */
'use strict';

const VERIFY = /[?&]verify=1/.test(location.search);
const $id = s => document.getElementById(s);
const SVG_NS = 'http://www.w3.org/2000/svg';
const wait = ms => new Promise(r => setTimeout(r, ms));
const sfx = n => { if (!VERIFY) KIDS.audio.sfx(n); };
function zqToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(SVG_NS, tag);
  if (attrs) Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
  if (parent) parent.appendChild(e);
  return e;
}

/* ================= 存档：save.zq 命名空间（core v1.0 骨架之上，§6.4） ================= */
function zqEnsure(save) {
  if (!save.zq) save.zq = {};
  const z = save.zq;
  if (!z.cal) z.cal = { done: [], band: 0, skipSeen: false };
  if (!z.map) z.map = {};
  if (!z.dex) z.dex = {};
  if (!z.weak) z.weak = [];
  if (!z.comp) z.comp = {};
  if (!z.dress) z.dress = { owned: [], worn: {}, home: {} };
  if (typeof z.coins !== 'number') z.coins = 0;
  if (!z.storySeen) z.storySeen = [];
  if (!z.dayLog) z.dayLog = {};
  if (!z.dayLog[zqToday()]) z.dayLog[zqToday()] = { newChars: [], nodes: [], newDone: [], quests: [] };
  return z;
}
let SAVE = null;                                  /* KIDS._save() 引用（VERIFY 页=null 用空档渲染） */
function zSave() {                                /* 空档视图：纯函数渲染共用（禁写） */
  return SAVE || { v: '1.0', game: 'ziquest', firstDay: zqToday(), levels: {}, zq: zqEnsure({}) };
}

/* ================= 七层 SVG 地图渲染（viewBox 1000×7400 纵向长卷，7 区域自下而上） ================= */
const REGION_META = [];                           /* {id,name,accent,y0,y1,fogRect,boss} 段落框 */
const NODE_ELS = {};                              /* key → g.zq-node */
let worldEl, svgRoot, rabbitG, fxPool = [];
const zqAccent = r => (ZQ_CHARS[String(r)] && ZQ_CHARS[String(r)].meta.accent) || '#E8975A';

/* 七种节点图标简笔（60×60 视区，粗墨线圆角家族语言；done 态另叠旗+星） */
function nodeIcon(type, ac) {
  const S = 'stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"';
  if (type === 'new') return '<ellipse cx="30" cy="38" rx="13" ry="18" fill="' + ac + '" ' + S + '/>' +
    '<path d="M30 20q-3 -11 -12 -13q3 9 12 13z" fill="#8FBF7F" ' + S + '/>' +
    '<path d="M30 20q3 -11 12 -13q-3 9 -12 13z" fill="#8FBF7F" ' + S + '"/>' +
    '<path d="M30 20v-14h16l-4 5l4 5z" fill="#E8975A" ' + S + '/>';
  if (type === 'camp') return '<path d="M30 12L52 50H8z" fill="' + ac + '" ' + S + '/>' +
    '<path d="M30 12v38" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M30 12L41 31H19z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.2"/>';
  if (type === 'chest') return '<rect x="10" y="24" width="40" height="24" rx="5" fill="' + ac + '" ' + S + '/>' +
    '<path d="M10 32h40" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<rect x="25" y="28" width="10" height="12" rx="2.5" fill="#F5C445" ' + S + '/>' +
    '<path d="M14 24q16 -14 32 0" fill="none" ' + S + '/>';
  if (type === 'friend') return '<circle cx="30" cy="34" r="16" fill="' + ac + '" ' + S + '/>' +
    '<ellipse cx="17" cy="18" rx="5" ry="9" fill="' + ac + '" ' + S + ' transform="rotate(-14 17 18)"/>' +
    '<ellipse cx="43" cy="18" rx="5" ry="9" fill="' + ac + '" ' + S + ' transform="rotate(14 43 18)"/>' +
    '<circle cx="24" cy="32" r="2.4" fill="#4A3B2E"/><circle cx="36" cy="32" r="2.4" fill="#4A3B2E"/>' +
    '<path d="M26 40q4 4 8 0" stroke="#4A3B2E" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
  if (type === 'story') return '<rect x="12" y="14" width="36" height="32" rx="6" fill="#FFF9EE" ' + S + '/>' +
    '<path d="M12 18q-7 3 0 9M48 18q7 3 0 9" fill="none" ' + S + '/>' +
    '<path d="M20 25h20M20 32h20M20 39h13" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/>';
  if (type === 'boss') return '<path d="M12 50V28a18 18 0 0 1 36 0v22z" fill="' + ac + '" ' + S + '/>' +
    '<rect x="22" y="30" width="16" height="20" rx="3" fill="#4A3B2E"/>' +
    '<path d="M30 30v8" stroke="#F5C445" stroke-width="2.6"/>' +
    '<circle cx="30" cy="20" r="3" fill="#F5C445" ' + S + '/>';
  return '<circle cx="30" cy="32" r="17" fill="' + ac + '" ' + S + '/>' +  /* calib：星光兔足迹 */
    '<path d="M30 14l2.6 6.2 6.7.6-5.1 4.4 1.5 6.6-5.7-3.6-5.7 3.6 1.5-6.6-5.1-4.4 6.7-.6z" fill="#F5C445" ' + S + '/>' +
    '<circle cx="24" cy="31" r="2.2" fill="#4A3B2E"/><circle cx="36" cy="31" r="2.2" fill="#4A3B2E"/>';
}

function buildMap() {
  worldEl = $id('zq-world');
  const CW = ZQ_MAP.meta.canvas.w, CH = ZQ_MAP.meta.canvas.h;
  svgRoot = svgEl('svg', { viewBox: '0 0 ' + CW + ' ' + CH, 'aria-label': '冒险地图' });
  const defs = svgEl('defs', null, svgRoot);
  /* 迷雾 noise pattern（半透明白噪点——L2 未解锁区域覆盖物） */
  const pat = svgEl('pattern', { id: 'zq-fog-pat', width: '96', height: '96', patternUnits: 'userSpaceOnUse' }, defs);
  svgEl('rect', { width: '96', height: '96', fill: '#E6E1D2', opacity: '.62' }, pat);
  svgEl('circle', { cx: '22', cy: '26', r: '27', fill: '#F0ECDF', opacity: '.75' }, pat);
  svgEl('circle', { cx: '70', cy: '62', r: '31', fill: '#EBE6D6', opacity: '.65' }, pat);
  svgEl('circle', { cx: '48', cy: '8', r: '21', fill: '#F4F0E4', opacity: '.6' }, pat);

  /* 区域段落框（y0..y1 自节点包围盒外扩；地块/迷雾/天空共用） */
  ZQ_REGIONS.forEach((rg, i) => {
    const ys = rg.nodes.map(n => n.y);
    const y1 = i === 0 ? CH - 30 : Math.max.apply(null, ys) + 130;
    const y0 = i === ZQ_REGIONS.length - 1 ? 30 : Math.min.apply(null, ys) - 130;
    REGION_META.push({ id: rg.id, name: rg.name, accent: zqAccent(rg.id), y0: y0, y1: y1, boss: rg.boss, unlock: rg.unlock });
  });

  const L0 = svgEl('g', { id: 'zq-l0' }, svgRoot);   /* 天空色带：每区域 3 条柔和平涂 */
  REGION_META.forEach(rm => {
    const h = (rm.y1 - rm.y0) / 3;
    for (let k = 0; k < 3; k++) {
      svgEl('rect', { x: 0, y: Math.round(rm.y0 + h * k), width: CW, height: Math.ceil(h) + 1,
        fill: rm.accent, opacity: (.1 - k * .03).toFixed(3) }, L0);
    }
  });
  const L1 = svgEl('g', { id: 'zq-l1' }, svgRoot);   /* 远景：太阳+远山+云剪影（CSS 视差 90s） */
  svgEl('circle', { cx: 830, cy: 430, r: 64, fill: '#F5C445', opacity: '.55' }, L1);
  svgEl('circle', { cx: 830, cy: 430, r: 46, fill: '#F7D06B', opacity: '.8' }, L1);
  for (let i = 0; i < 7; i++) {
    const cx = 90 + i * 150, cy = 260 + (i % 3) * 90;
    svgEl('circle', { cx: cx, cy: cy, r: 34, fill: '#FFF9EE', opacity: '.5' }, L1);
    svgEl('circle', { cx: cx + 34, cy: cy + 8, r: 26, fill: '#FFF9EE', opacity: '.5' }, L1);
    svgEl('circle', { cx: cx - 32, cy: cy + 10, r: 22, fill: '#FFF9EE', opacity: '.45' }, L1);
  }
  REGION_META.forEach((rm, i) => {
    svgEl('path', { d: 'M0 ' + rm.y0 + ' q125 -86 250 0 t250 0 t250 0 t250 0 V' + (rm.y0 + 10) + 'z',
      fill: i % 2 ? '#D9CBAF' : '#E3D7BE', opacity: '.5' }, L1);
  });
  const L2 = svgEl('g', { id: 'zq-l2' }, svgRoot);   /* 地块（区域强调色低饱和大色块）+ 迷雾 */
  REGION_META.forEach(rm => {
    svgEl('rect', { x: 0, y: Math.round(rm.y0), width: CW, height: rm.y1 - rm.y0,
      fill: rm.accent, opacity: '.16' }, L2);
    rm.fogRect = svgEl('rect', { x: 0, y: Math.round(rm.y0), width: CW, height: rm.y1 - rm.y0,
      fill: 'url(#zq-fog-pat)', class: 'zq-fog' }, L2);
  });
  const L3 = svgEl('g', { id: 'zq-l3' }, svgRoot);   /* 路径：节点邻接虚线小径（已走段实线） */
  ZQ_NODES.forEach(n => n.next.forEach(nk => {
    const t = ZQ_NODE[nk];
    svgEl('path', { d: 'M' + n.x + ' ' + n.y + 'L' + t.x + ' ' + t.y, 'data-edge': n.key + '>' + nk,
      fill: 'none', stroke: '#B9A98C', 'stroke-width': '6', 'stroke-linecap': 'round',
      'stroke-dasharray': '2 16' }, L3);
  }));
  const L4 = svgEl('g', { id: 'zq-l4' }, svgRoot);   /* 130 节点 × 4 态（class 刷，元素一次建齐） */
  ZQ_NODES.forEach(n => {
    const g = svgEl('g', { id: n.key, class: 'zq-node', transform: 'translate(' + n.x + ',' + n.y + ')' }, L4);
    const ring1 = svgEl('circle', { r: '52', fill: 'none', stroke: zqAccent(n.region), 'stroke-width': '5', class: 'zq-ring' }, g);
    svgEl('circle', { r: '52', fill: 'none', stroke: zqAccent(n.region), 'stroke-width': '3.5', class: 'zq-ring r2' }, g);
    const ani = svgEl('g', { class: 'zq-ani' }, g);
    const ico = svgEl('g', null, ani);
    ico.innerHTML = '<g transform="translate(-30,-30)">' + nodeIcon(n.type, zqAccent(n.region)) + '</g>';
    svgEl('circle', { r: '54', class: 'zq-cage' }, g);                  /* 锁灰笼 */
    const flag = svgEl('g', { class: 'zq-flag' }, g);                   /* done 旗+星 */
    flag.innerHTML = '<path d="M18 -46v-22h20l-5 6l5 6h-14v10z" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.6" stroke-linejoin="round"/>';
    const stars = svgEl('g', { class: 'zq-stars' }, g);
    stars.innerHTML = '<g id="stars-' + n.key + '" transform="translate(0,44)"></g>';
    svgEl('circle', { r: '60', class: 'zq-hit' }, g);                   /* 触摸热区（viewBox 60r→平板竖屏≈96px） */
    g.addEventListener('click', () => tapNode(n.key));
    NODE_ELS[n.key] = g;
  });
  rabbitG = svgEl('g', { id: 'zq-rabbit' }, svgRoot); /* L5 兔子 + 装扮槽占位（M4 叠加渲染锚） */
  const hop = svgEl('g', { class: 'zq-hop' }, rabbitG);
  hop.innerHTML = KIDS.assets.rabbit('happy', 72).replace('<svg ', '<svg x="-36" y="-76" ');
  svgEl('g', { id: 'zq-dress-slot' }, rabbitG);       /* 装扮槽（帽/裙/鞋/围巾 SVG 锚点，M4） */
  const L6 = svgEl('g', { id: 'zq-l6' }, svgRoot);    /* L6 粒子池 ≤12（一次性触发复用） */
  for (let i = 0; i < 12; i++) {
    const h = svgEl('g', { class: 'zq-fx-h' }, L6);   /* 外层 g 定位（attr），内层 path 动画（CSS） */
    const p = svgEl('path', { d: 'M0 -7l2.2 4.6 5 .6-3.7 3.4 1 5-4.5-2.5-4.5 2.5 1-5-3.7-3.4 5-.6z',
      fill: i % 2 ? '#F5C445' : '#F2C94C', stroke: '#4A3B2E', 'stroke-width': '1.6', class: 'zq-fx' }, h);
    fxPool.push({ h: h, p: p });
  }
  worldEl.appendChild(svgRoot);
}

/* ================= 状态刷（节点 4 态 class / 迷雾 / 星数 / 兔子站位 / HUD） ================= */
const starPath = (x, on) => '<path d="M' + x + ' 40l2.6 5.4 6 .9-4.3 4.2 1 6-5.3-2.8-5.3 2.8 1-6-4.3-4.2 6-.9z" fill="' +
  (on ? '#F5C445' : '#E5D5BC') + '" stroke="#4A3B2E" stroke-width="1.6"/>';
function refreshMap(anim) {
  const today = zqToday(), sv = zSave(), cur = curNodeKey(sv, today);
  const openedFog = [];
  ZQ_NODES.forEach(n => {
    const st = nodeState(sv, n.key, today);
    const el = NODE_ELS[n.key];
    el.classList.remove('s-locked', 's-open', 's-current', 's-done');
    el.classList.add(st === 'done' ? 's-done' : (n.key === cur ? 's-current' : 's-' + st));
    el.style.visibility = zqRegionOpen(sv, n.region) ? '' : 'hidden';   /* 屏外裁剪：雾区节点整组隐藏 */
    const rec = sv.zq.map[n.key];
    $id('stars-' + n.key).innerHTML = (n.type === 'new' || n.type === 'boss')
      ? starPath(-16, rec && rec.stars >= 1) + starPath(0, rec && rec.stars >= 2) + starPath(16, rec && rec.stars >= 3) : '';
  });
  REGION_META.forEach(rm => {
    const open = zqRegionOpen(sv, rm.id);
    if (!open && rm.fogRect.classList.contains('gone')) rm.fogRect.classList.remove('gone');
    if (open && !rm.fogRect.classList.contains('gone')) { rm.fogRect.classList.add('gone'); openedFog.push(rm.id); }
  });
  const cn = ZQ_NODE[cur];
  rabbitG.setAttribute('transform', 'translate(' + cn.x + ',' + (cn.y + 6) + ')');
  if (anim) { rabbitG.classList.remove('hop'); void rabbitG.getBoundingClientRect(); rabbitG.classList.add('hop'); }
  refreshHud();
  return { cur: cur, fogOpened: openedFog };
}
function refreshHud() {
  const sv = zSave();
  let stars = 0;
  Object.keys(sv.zq.map).forEach(k => { stars += Math.min(3, sv.zq.map[k].stars || 0); });
  $id('zq-coin-n').textContent = sv.zq.coins;
  $id('zq-star-n').textContent = stars;
  $id('zq-today').textContent = '第 ' + zqDayIndex(sv, zqToday()) + ' 天';
}

/* ================= 视口平移：wrapper 单 transform + 当前节点居中 + 触摸拖动 ================= */
let VW = 0, VH = 0;
function worldSize() {
  const v = $id('zq-view');
  VW = v.clientWidth; VH = v.clientHeight;
}
function centerOn(key, animate) {
  const n = ZQ_NODE[key], scale = VW / ZQ_MAP.meta.canvas.w, H = VW * ZQ_MAP.meta.canvas.h / ZQ_MAP.meta.canvas.w;
  let tx = VW / 2 - n.x * scale, ty = VH * 0.46 - n.y * scale;
  tx = Math.min(0, Math.max(VW - VW, tx));           /* 横向：1000 宽=满幅，tx 恒 0（纵向长卷） */
  ty = Math.min(0, Math.max(VH - H, ty));
  if (!animate) worldEl.classList.add('drag');
  worldEl.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
  if (!animate) { void worldEl.offsetWidth; worldEl.classList.remove('drag'); }
}
function bindPan() {
  const view = $id('zq-view');
  let sx = 0, sy = 0, tx0 = 0, ty0 = 0, moved = false, tyCur = 0;
  const readT = () => {
    const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(worldEl.style.transform || '');
    return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 };
  };
  view.addEventListener('pointerdown', e => {
    const t = readT(); tx0 = t.x; ty0 = t.y; tyCur = t.y; sx = e.clientX; sy = e.clientY; moved = false;
    worldEl.classList.add('drag');
  });
  view.addEventListener('pointermove', e => {
    if (worldEl.classList.contains('drag') && e.buttons) {
      const scale = VW / ZQ_MAP.meta.canvas.w, H = VW * ZQ_MAP.meta.canvas.h / ZQ_MAP.meta.canvas.w;
      let ty = Math.min(0, Math.max(VH - H, ty0 + (e.clientY - sy)));
      worldEl.style.transform = 'translate3d(0px,' + ty.toFixed(1) + 'px,0)';
      if (Math.abs(e.clientY - sy) > 10) moved = true;
      tyCur = ty;
    }
  });
  const end = () => { worldEl.classList.remove('drag'); setTimeout(() => { moved = false; }, 30); };
  view.addEventListener('pointerup', end);
  view.addEventListener('pointercancel', end);
  return { wasDrag: () => moved };
}

/* ================= 节点状态机：tapNode（锁=摇一摇 / 开=占位进关+写档 / done=回看提示） =================
   ★ M2 关卡系统接入点（本节整体替换为真关卡启动，签名契约如下）：
     ZQ.openNode(key) → Promise<{stars, newChars}>
       1. const lvl = genLevel(key, SAVE, today)     // M2 game-core：题型谱+确定性消耗序
       2. 关卡循环渲染/判定/结算（qtypes 注册表渲染器）
       3. 调 finishNode(key, stars) 收口（本函数 M1 已定稿，M2 原样复用）
     finishNode(key: nodeKey, stars: 1|2|3) → {rec, fogOpened}   // 写 map/dayLog/币/解锁刷新/迷雾消散/兔子 hop
   M1 行为：点 open 节点 = 建设中占位 overlay + 以测试位 stars=2 走 finishNode（驱动解锁链可测）。 */
let buildTimer = null;
function finishNode(key, stars) {
  if (!SAVE) return { rec: null, fogOpened: [] };  /* 无真档（VERIFY 空档视图）禁写 */
  const today = zqToday(), z = SAVE.zq, n = ZQ_NODE[key];
  const prev = z.map[key], first = !prev;
  z.map[key] = { stars: Math.max(prev ? prev.stars : 0, stars), plays: (prev ? prev.plays : 0) + 1 };
  if (!z.dayLog[today]) z.dayLog[today] = { newChars: [], nodes: [], newDone: [], quests: [] };
  if (z.dayLog[today].nodes.indexOf(key) < 0) z.dayLog[today].nodes.push(key);
  if (n.type === 'new' && z.dayLog[today].newDone.indexOf(key) < 0) z.dayLog[today].newDone.push(key);
  z.coins += zqNodeReward(n.type, first);
  if (!VERIFY && SAVE === KIDS._save()) KIDS.store.persist();   /* VERIFY 页禁写档（防覆盖真档） */
  const r = refreshMap(true);
  setTimeout(() => centerOn(r.cur, true), ZQ_T.CENTER_MS * 0.4);
  return { rec: z.map[key], fogOpened: r.fogOpened };
}
function nodeLabel(n) {
  if (n.type === 'friend') {                       /* friend.label=伙伴 id → 目录名（lark→小云雀叮叮） */
    const c = ZQ_CATALOG.companions.filter(x => x.id === n.label)[0];
    return c ? '新伙伴·' + c.name : '伙伴事件';
  }
  if (n.type === 'calib') return '和兔子玩认字游戏';
  if (n.type === 'new') return n.label;
  return (ZQ_MAP.meta.nodeTypes[n.type] || '冒险点') + '·' + n.label;
}
function showBuild(node) {
  const ov = $id('zq-build');
  $id('zq-build-bunny').innerHTML = KIDS.assets.rabbit('happy', 110);
  $id('zq-build-name').textContent = nodeLabel(node);
  ov.classList.remove('hide');
  KIDS.voice.play('zq_map_open');
  clearTimeout(buildTimer);
  buildTimer = setTimeout(() => ov.classList.add('hide'), ZQ_T.OVERLAY_MS);
}
function burst(key) {                              /* L6 粒子：12 星迸发（CSS 一次性） */
  const n = ZQ_NODE[key];
  fxPool.forEach((f, i) => {
    const a = Math.PI * 2 * i / fxPool.length;
    f.p.style.setProperty('--dx', (Math.cos(a) * 90).toFixed(0) + 'px');
    f.p.style.setProperty('--dy', (Math.sin(a) * 90 - 30).toFixed(0) + 'px');
    f.h.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
    f.p.classList.remove('go'); void f.p.getBoundingClientRect(); f.p.classList.add('go');
  });
}
function tapNode(key) {
  const today = zqToday(), st = nodeState(zSave(), key, today), n = ZQ_NODE[key];
  if (!n) return { ok: false, reason: 'no-node' };
  if (st === 'locked') {                           /* 锁：摇一摇 + 柔和低音（零惩罚） */
    const el = NODE_ELS[key];
    el.classList.remove('shake'); void el.getBoundingClientRect(); el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), ZQ_T.SHAKE_MS);
    sfx('fail');
    KIDS.voice.play('zq_hint');
    return { ok: false, reason: 'locked', state: st };
  }
  if (st === 'done') {
    toast('这一站已经点亮啦，再去前面看看吧');
    return { ok: true, reason: 'done', state: st };
  }
  /* open（含 current）：M2a 真关卡启动（level.js ZQ.Level.start 节点分发——new/boss 关卡、
     camp/calib 转发营地与定级、story/chest/friend 占位 toast；结算由 finishNode 收口） */
  sfx('ok');
  return ZQ.Level.start(key);
}
function toast(msg) {
  const t = $id('zq-toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ================= 家长面板进度摘要注入（zilearn 面板注入先例 + zq 学习账） ================= */
function zqStats() {
  const z = zSave().zq;
  let learned = 0, master = 0;
  Object.keys(z.dex).forEach(ch => { if (z.dex[ch].st > 0) learned++; if (z.dex[ch].st >= 2) master++; });
  let stars = 0; Object.keys(z.map).forEach(k => stars += Math.min(3, z.map[k].stars || 0));
  return { learned: learned, master: master, weak: z.weak.length, coins: z.coins, stars: stars,
           todayNew: z.dayLog[zqToday()] ? z.dayLog[zqToday()].newDone.length : 0 };
}
function patchParentPanel() {
  const orig = KIDS.parent.panel.bind(KIDS.parent);
  KIDS.parent.panel = function () {
    orig();
    const box = document.querySelector('.k-panel .box');
    if (!box) return;
    const st = zqStats();
    const div = document.createElement('div');
    div.innerHTML = '<div style="font-size:15px;font-weight:700;margin-top:10px">冒险进度</div><table>' +
      '<tr><td>已点亮地图站</td><td>' + Object.keys(zSave().zq.map).length + ' / 130</td></tr>' +
      '<tr><td>星星 / 金币</td><td>' + st.stars + ' / ' + st.coins + '</td></tr>' +
      '<tr><td>今日新字关</td><td>' + st.todayNew + ' 关</td></tr></table>';
    const close = box.querySelector('.k-close');
    box.insertBefore(div, close);
  };
}

/* ================= 启动（分支接管由 game-verify.js 尾部 if (VERIFY) 完成） ================= */
$id('zq-logo').innerHTML = KIDS.assets.rabbit('happy', 36);
buildMap();
if (!VERIFY) {
  KIDS.init({ game: 'ziquest', title: '小兔子识字闯世界' });
  SAVE = KIDS._save();
  zqEnsure(SAVE);                                  /* 旧档无 zq = 首进序章（§6.4 兼容语义） */
  KIDS.store.persist();
  patchParentPanel();
  window.addEventListener('resize', () => { worldSize(); centerOn(curNodeKey(SAVE, zqToday()), false); });
  worldSize();
  bindPan();
  refreshMap(false);
  centerOn(curNodeKey(SAVE, zqToday()), false);
} else {
  refreshMap(false);                               /* verify 页渲染默认态（DOM 断言素材；禁写档） */
}

/* ================= 验收钩子（window.ZQ——getter 拷贝非活引用，家族纪律） ================= */
window.ZQ = {
  get save() { return SAVE ? JSON.parse(JSON.stringify(SAVE)) : null; },   /* 深拷贝（禁活引用） */
  get cur() { return curNodeKey(zSave(), zqToday()); },
  mapState() {
    const today = zqToday(), out = {};
    ZQ_NODES.forEach(n => { out[n.key] = nodeState(zSave(), n.key, today); });
    return out;
  },
  state(key) { return nodeState(zSave(), key, zqToday()); },
  tapNode,
  openNode: key => ZQ.Level.start(key),             /* M2a 接线：关卡系统入口（level.js 分发） */
  finishNode,
  fogStates() { return REGION_META.map(r => ({ region: r.id, open: !r.fogRect.classList.contains('gone') })); },
  _nodeState: (save, key, today) => nodeState(save, key, today),   /* 纯函数直驱（禁 UI 副作用） */
  _curNodeKey: curNodeKey,
  _zqQuota: zqQuota,
  _zqDayIndex: zqDayIndex,
  _srsNext: srsNext,
  _srsDue: srsDue,
  _calStop: calStop,
  _centerOn: centerOn,
  _today: zqToday,
};
