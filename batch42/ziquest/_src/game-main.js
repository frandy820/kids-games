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
function zqLighten(hex, f) {                       /* 颜色向白混合 f∈[0,1]（派蒙风渐变亮端） */
  const n = parseInt(hex.slice(1), 16);
  const c = x => Math.round(x + (255 - x) * f);
  return '#' + ((1 << 24) + (c(n >> 16) << 16) + (c(n >> 8 & 255) << 8) + c(n & 255)).toString(16).slice(1);
}

/* 七种节点图标（60×60 视区，主体区色渐变+高光点=派蒙立体感；done 态另叠旗+星） */
function nodeIcon(type, ac, region) {
  const S = 'stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"';
  const G = 'url(#zq-ico-' + region + ')';           /* 主体渐变（defs 由 buildMap 按区建齐） */
  const hl = '<ellipse cx="24" cy="22" rx="6.5" ry="4" fill="#FFF" opacity=".55" transform="rotate(-24 24 22)"/>';
  if (type === 'new') return '<ellipse cx="30" cy="38" rx="13" ry="18" fill="' + G + '" ' + S + '/>' +
    '<path d="M30 20q-3 -11 -12 -13q3 9 12 13z" fill="#8FBF7F" ' + S + '/>' +
    '<path d="M30 20q3 -11 12 -13q-3 9 -12 13z" fill="#A8D29A" ' + S + '/>' +
    '<path d="M30 20v-14h16l-4 5l4 5z" fill="#E8975A" ' + S + '/>' + hl;
  if (type === 'camp') return '<path d="M30 12L52 50H8z" fill="' + G + '" ' + S + '/>' +
    '<path d="M30 12v38" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M30 12L41 31H19z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.2"/>' +
    '<ellipse cx="22" cy="30" rx="6" ry="3.6" fill="#FFF" opacity=".5" transform="rotate(30 22 30)"/>';
  if (type === 'chest') return '<path d="M14 24q16 -14 32 0" fill="none" ' + S + '/>' +
    '<rect x="10" y="24" width="40" height="24" rx="5" fill="' + G + '" ' + S + '/>' +
    '<path d="M10 32h40" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<rect x="25" y="28" width="10" height="12" rx="2.5" fill="#F5C445" ' + S + '/>' +
    '<ellipse cx="18" cy="29" rx="5.5" ry="3" fill="#FFF" opacity=".5" transform="rotate(-16 18 29)"/>';
  if (type === 'friend') return '<circle cx="30" cy="34" r="16" fill="' + G + '" ' + S + '/>' +
    '<ellipse cx="17" cy="18" rx="5" ry="9" fill="' + G + '" ' + S + ' transform="rotate(-14 17 18)"/>' +
    '<ellipse cx="43" cy="18" rx="5" ry="9" fill="' + G + '" ' + S + ' transform="rotate(14 43 18)"/>' +
    '<ellipse cx="16" cy="14" rx="2" ry="4" fill="#FFF" opacity=".6" transform="rotate(-14 16 14)"/>' +
    '<circle cx="24" cy="32" r="2.4" fill="#4A3B2E"/><circle cx="36" cy="32" r="2.4" fill="#4A3B2E"/>' +
    '<circle cx="24.8" cy="31.2" r=".8" fill="#FFF"/><circle cx="36.8" cy="31.2" r=".8" fill="#FFF"/>' +
    '<path d="M26 40q4 4 8 0" stroke="#4A3B2E" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="21" cy="38" r="2.2" fill="#F2A9B8" opacity=".7"/><circle cx="39" cy="38" r="2.2" fill="#F2A9B8" opacity=".7"/>';
  if (type === 'story') return '<rect x="12" y="14" width="36" height="32" rx="6" fill="#FFF9EE" ' + S + '/>' +
    '<path d="M12 18q-7 3 0 9M48 18q7 3 0 9" fill="none" ' + S + '/>' +
    '<path d="M20 25h20M20 32h20M20 39h13" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/>' +
    '<ellipse cx="19" cy="19" rx="5" ry="2.8" fill="#FFF" opacity=".8" transform="rotate(-18 19 19)"/>';
  if (type === 'boss') return '<path d="M12 50V28a18 18 0 0 1 36 0v22z" fill="' + G + '" ' + S + '/>' +
    '<rect x="22" y="30" width="16" height="20" rx="3" fill="#4A3B2E"/>' +
    '<path d="M30 30v8" stroke="#F5C445" stroke-width="2.6"/>' +
    '<circle cx="30" cy="20" r="6" fill="#F5C445" opacity=".35"/>' +
    '<circle cx="30" cy="20" r="3.4" fill="#F5C445" ' + S + '/>' +
    '<ellipse cx="20" cy="30" rx="6" ry="3.4" fill="#FFF" opacity=".5" transform="rotate(-32 20 30)"/>';
  return '<circle cx="30" cy="32" r="17" fill="' + G + '" ' + S + '/>' +  /* calib：星光兔足迹 */
    '<path d="M30 14l2.6 6.2 6.7.6-5.1 4.4 1.5 6.6-5.7-3.6-5.7 3.6 1.5-6.6-5.1-4.4 6.7-.6z" fill="#F5C445" ' + S + '/>' +
    '<circle cx="24" cy="31" r="2.2" fill="#4A3B2E"/><circle cx="36" cy="31" r="2.2" fill="#4A3B2E"/>' +
    '<circle cx="24.7" cy="30.3" r=".7" fill="#FFF"/><circle cx="36.7" cy="30.3" r=".7" fill="#FFF"/>';
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

  /* ---- 派蒙风渐变 defs（v3 改单1：天空/太阳/远山/地块/节点底盘/图标体，一次建齐） ---- */
  REGION_META.forEach(rm => {
    const sky = svgEl('linearGradient', { id: 'zq-sky-' + rm.id, x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': zqLighten(rm.accent, .5), 'stop-opacity': '.62' }, sky);
    svgEl('stop', { offset: '.5', 'stop-color': rm.accent, 'stop-opacity': '.16' }, sky);
    svgEl('stop', { offset: '1', 'stop-color': '#FBF6EC', 'stop-opacity': '0' }, sky);
    const gr = svgEl('linearGradient', { id: 'zq-ground-' + rm.id, x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': rm.accent, 'stop-opacity': '0' }, gr);
    svgEl('stop', { offset: '.18', 'stop-color': zqLighten(rm.accent, .25), 'stop-opacity': '.5' }, gr);
    svgEl('stop', { offset: '.82', 'stop-color': rm.accent, 'stop-opacity': '.32' }, gr);
    svgEl('stop', { offset: '1', 'stop-color': rm.accent, 'stop-opacity': '0' }, gr);
    const plate = svgEl('radialGradient', { id: 'zq-plate-' + rm.id, cx: '.5', cy: '.36', r: '.68' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': zqLighten(rm.accent, .88) }, plate);
    svgEl('stop', { offset: '.62', 'stop-color': zqLighten(rm.accent, .72) }, plate);
    svgEl('stop', { offset: '1', 'stop-color': zqLighten(rm.accent, .45) }, plate);
    const ico = svgEl('linearGradient', { id: 'zq-ico-' + rm.id, x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svgEl('stop', { offset: '0', 'stop-color': zqLighten(rm.accent, .38) }, ico);
    svgEl('stop', { offset: '1', 'stop-color': rm.accent }, ico);
  });
  const grassG = svgEl('linearGradient', { id: 'zq-grass', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  svgEl('stop', { offset: '0', 'stop-color': '#A5D38C' }, grassG);
  svgEl('stop', { offset: '1', 'stop-color': '#7CBF68' }, grassG);
  const sunG = svgEl('radialGradient', { id: 'zq-sun' }, defs);
  svgEl('stop', { offset: '0', 'stop-color': '#FFEDB0', 'stop-opacity': '.95' }, sunG);
  svgEl('stop', { offset: '.3', 'stop-color': '#F7D06B', 'stop-opacity': '.5' }, sunG);
  svgEl('stop', { offset: '1', 'stop-color': '#F7D06B', 'stop-opacity': '0' }, sunG);
  const hillFar = svgEl('linearGradient', { id: 'zq-hill-far', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  svgEl('stop', { offset: '0', 'stop-color': '#EFE7D2' }, hillFar);
  svgEl('stop', { offset: '1', 'stop-color': '#DCCFB2' }, hillFar);
  const hillNear = svgEl('linearGradient', { id: 'zq-hill-near', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
  svgEl('stop', { offset: '0', 'stop-color': '#E3D7BE' }, hillNear);
  svgEl('stop', { offset: '1', 'stop-color': '#CBBB9A' }, hillNear);

  const L0 = svgEl('g', { id: 'zq-l0' }, svgRoot);   /* 天空：每区垂直渐变（区顶区色微染→暖米） */
  REGION_META.forEach(rm => {
    svgEl('rect', { x: 0, y: Math.round(rm.y0), width: CW, height: rm.y1 - rm.y0,
      fill: 'url(#zq-sky-' + rm.id + ')' }, L0);
  });
  const L1 = svgEl('g', { id: 'zq-l1' }, svgRoot);   /* 远景：太阳光晕+白云团+渐变远山（CSS 视差 90s） */
  svgEl('circle', { cx: 830, cy: 430, r: 170, fill: 'url(#zq-sun)' }, L1);
  svgEl('circle', { cx: 830, cy: 430, r: 44, fill: '#FFEDB0', opacity: '.95' }, L1);
  svgEl('circle', { cx: 830, cy: 430, r: 54, fill: 'none', stroke: '#F7D06B', 'stroke-width': '7', opacity: '.55' }, L1);
  for (let i = 0; i < 7; i++) {                      /* 云团：白主体+淡蓝底影（立体感） */
    const cx = 90 + i * 150, cy = 260 + (i % 3) * 90;
    svgEl('circle', { cx: cx, cy: cy + 12, r: 33, fill: '#DCE7EE', opacity: '.4' }, L1);
    svgEl('circle', { cx: cx, cy: cy, r: 34, fill: '#FFFFFF', opacity: '.78' }, L1);
    svgEl('circle', { cx: cx + 34, cy: cy + 8, r: 26, fill: '#FFFFFF', opacity: '.72' }, L1);
    svgEl('circle', { cx: cx - 32, cy: cy + 10, r: 22, fill: '#FFFFFF', opacity: '.68' }, L1);
    svgEl('ellipse', { cx: cx + 4, cy: cy - 20, rx: 20, ry: 10, fill: '#FFFFFF', opacity: '.55' }, L1);
  }
  REGION_META.forEach((rm, i) => {
    svgEl('path', { d: 'M0 ' + rm.y0 + ' q125 -86 250 0 t250 0 t250 0 t250 0 V' + (rm.y0 + 10) + 'z',
      fill: i % 2 ? 'url(#zq-hill-near)' : 'url(#zq-hill-far)', opacity: '.55' }, L1);
  });
  const L2 = svgEl('g', { id: 'zq-l2' }, svgRoot);   /* 地块（区色渐变+区界高光线）+ 迷雾 */
  REGION_META.forEach(rm => {
    svgEl('rect', { x: 0, y: Math.round(rm.y0), width: CW, height: rm.y1 - rm.y0,
      fill: 'url(#zq-ground-' + rm.id + ')' }, L2);
    svgEl('rect', { x: 0, y: Math.round(rm.y0), width: CW, height: 3, fill: '#FFFFFF', opacity: '.45' }, L2);
    const gy = rm.y1 - 46;
    svgEl('path', { d: 'M-4 ' + (gy - 10) + 'q160 30 340 6t340 -8t340 10V' + (rm.y1 + 130) + 'H-4z',
      fill: '#7CBF68', opacity: '.32' }, L2);
    svgEl('path', { d: 'M-4 ' + gy + 'q190 34 380 8t310 -6t310 12V' + (rm.y1 + 130) + 'H-4z',
      fill: 'url(#zq-grass)', opacity: '.5' }, L2);
    rm.fogRect = svgEl('rect', { x: 0, y: Math.round(rm.y0), width: CW, height: rm.y1 - rm.y0,
      fill: 'url(#zq-fog-pat)', class: 'zq-fog' }, L2);
  });
  const L3 = svgEl('g', { id: 'zq-l3' }, svgRoot);   /* 路径：土路双层（暖棕路基+米白踏面；已走段实线） */
  ZQ_NODES.forEach(n => n.next.forEach(nk => {
    const t = ZQ_NODE[nk];
    const d = 'M' + n.x + ' ' + n.y + 'L' + t.x + ' ' + t.y;
    svgEl('path', { d: d, fill: 'none', stroke: '#CBBA97', 'stroke-width': '11', 'stroke-linecap': 'round',
      opacity: '.5' }, L3);
    svgEl('path', { d: d, fill: 'none', stroke: '#FFF7E3', 'stroke-width': '5.5', 'stroke-linecap': 'round',
      'stroke-dasharray': '2 15', 'data-edge': n.key + '>' + nk }, L3);
  }));
  const L4 = svgEl('g', { id: 'zq-l4' }, svgRoot);   /* 130 节点 × 4 态（投影+渐变底盘+高光弧立体化） */
  ZQ_NODES.forEach(n => {
    const g = svgEl('g', { id: n.key, class: 'zq-node', transform: 'translate(' + n.x + ',' + n.y + ')' }, L4);
    const ring1 = svgEl('circle', { r: '52', fill: 'none', stroke: zqAccent(n.region), 'stroke-width': '5', class: 'zq-ring' }, g);
    svgEl('circle', { r: '52', fill: 'none', stroke: zqAccent(n.region), 'stroke-width': '3.5', class: 'zq-ring r2' }, g);
    svgEl('ellipse', { cy: '46', rx: '34', ry: '9', fill: '#4A3B2E', opacity: '.14' }, g);  /* 落地影 */
    const ani = svgEl('g', { class: 'zq-ani' }, g);
    svgEl('circle', { r: '45', fill: 'url(#zq-plate-' + n.region + ')', stroke: '#4A3B2E', 'stroke-width': '2.5' }, ani);
    svgEl('path', { d: 'M-24 -22a30 30 0 0 1 24 -13a30 30 0 0 1 12 3a34 34 0 0 0 -30 15z',
      fill: '#FFFFFF', opacity: '.5' }, ani);                          /* 盘面白高光弧 */
    const ico = svgEl('g', null, ani);
    ico.innerHTML = '<g transform="translate(-30,-30)">' + nodeIcon(n.type, zqAccent(n.region), n.region) + '</g>';
    svgEl('circle', { r: '54', class: 'zq-cage' }, g);                  /* 锁灰笼 */
    const flag = svgEl('g', { class: 'zq-flag' }, g);                   /* done 旗+星 */
    flag.innerHTML = '<path d="M18 -46v-22h20l-5 6l5 6h-14v10z" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.6" stroke-linejoin="round"/>';
    const stars = svgEl('g', { class: 'zq-stars' }, g);
    stars.innerHTML = '<g id="stars-' + n.key + '" transform="translate(0,44)"></g>';
    svgEl('circle', { r: '44', class: 'zq-hit' }, g);   /* 触摸热区（v54：44r 贴视觉底盘 45；点击归属改 bindPan view 级最近节点仲裁——节点最小间距 30svg 曾致 hit 圆互相盖住邻居，点 A 进 B） */
    NODE_ELS[n.key] = g;
  });
  rabbitG = svgEl('g', { id: 'zq-rabbit' }, svgRoot); /* L5 兔子 + 落地影 + 装扮槽占位（M4 叠加渲染锚） */
  svgEl('ellipse', { cy: '4', rx: '30', ry: '8', fill: '#4A3B2E', opacity: '.16' }, rabbitG);
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
  /* v54：收集三入口接线（M4 未建——先建设中占位弹层，杜绝无响应死按钮；
     同 showBuild 弹层复用，文案分入口） */
  [['zq-dex', '汉字图鉴', '图鉴小书正在装订，小兔子先帮你记着字啦'],
   ['zq-home', '兔子家园', '家园小屋正在装修，小兔子先帮你攒金币啦'],
   ['zq-comp', '伙伴小屋', '小伙伴还在路上，先把识字冒险走下去吧']].forEach(pair => {
    const b = $id(pair[0]);
    if (!b) return;
    b.addEventListener('click', () => {
      const ov = $id('zq-build');
      $id('zq-build-bunny').innerHTML = KIDS.assets.rabbit('happy', 110);
      $id('zq-build-name').textContent = pair[1] + '·建设中';
      $id('zq-build-tip').textContent = pair[2];
      ov.classList.remove('hide');
      KIDS.voice.play('zq_map_open');
      clearTimeout(buildTimer);
      buildTimer = setTimeout(() => ov.classList.add('hide'), ZQ_T.OVERLAY_MS);
    });
  });
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
const mapScale = () => VW * (VW < 640 ? 1.9 : 1) / ZQ_MAP.meta.canvas.w;
/* v54：窄屏（手机竖屏 <640px）地图 1.9× 放大浏览——1000 宽 SVG 满幅映射下节点视觉仅
   34px、最小间距 11px，手指（≈40px）无法精准（2026-10-01 家长实测「圈圈挨太紧、点了
   就覆盖」）。放大后横向放开拖动，clamp 双向；平板/横屏维持 1× 满幅不变。 */
function worldSize() {
  const v = $id('zq-view');
  VW = v.clientWidth; VH = v.clientHeight;
  worldEl.style.width = (ZQ_MAP.meta.canvas.w * mapScale()) + 'px';   /* svg width:100% 随 world 撑开 */
}
function centerOn(key, animate) {
  const n = ZQ_NODE[key], scale = mapScale(), H = ZQ_MAP.meta.canvas.h * scale;
  let tx = VW / 2 - n.x * scale, ty = VH * 0.46 - n.y * scale;
  tx = Math.min(0, Math.max(VW - ZQ_MAP.meta.canvas.w * scale, tx));  /* v54：横向双向 clamp（窄屏放大后可拖） */
  ty = Math.min(0, Math.max(VH - H, ty));
  if (!animate) worldEl.classList.add('drag');
  worldEl.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
  if (!animate) { void worldEl.offsetWidth; worldEl.classList.remove('drag'); }
}
function bindPan() {
  const view = $id('zq-view');
  let sx = 0, sy = 0, tx0 = 0, ty0 = 0, moved = false;
  const readT = () => {
    const m = /translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/.exec(worldEl.style.transform || '');
    return m ? { x: +m[1], y: +m[2] } : { x: 0, y: 0 };
  };
  view.addEventListener('pointerdown', e => {
    const t = readT(); tx0 = t.x; ty0 = t.y; sx = e.clientX; sy = e.clientY; moved = false;
    worldEl.classList.add('drag');
  });
  view.addEventListener('pointermove', e => {
    if (worldEl.classList.contains('drag') && e.buttons) {
      const scale = mapScale(), H = ZQ_MAP.meta.canvas.h * scale;
      const tx = Math.min(0, Math.max(VW - ZQ_MAP.meta.canvas.w * scale, tx0 + (e.clientX - sx)));
      const ty = Math.min(0, Math.max(VH - H, ty0 + (e.clientY - sy)));
      worldEl.style.transform = 'translate3d(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px,0)';
      if (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10) moved = true;
    }
  });
  /* v54 点击仲裁：重叠区归属=距指尖最近的节点（<48svg≈视觉底盘），替代 per-node g.click
     的「绘制在上者胜」——节点最小间距 30svg 时 hit 圆完全盖住邻居，点 A 进 B 的根因。 */
  view.addEventListener('pointerup', e => {
    worldEl.classList.remove('drag');
    const settle = () => setTimeout(() => { moved = false; }, 30);
    if (moved) { settle(); return; }
    const scale = mapScale(), vr = view.getBoundingClientRect(), t = readT();
    const px = (e.clientX - vr.left - t.x) / scale, py = (e.clientY - vr.top - t.y) / scale;
    let best = null, bd = 48;
    ZQ_NODES.forEach(n => {
      const d = Math.hypot(n.x - px, n.y - py);
      if (d < bd) { bd = d; best = n; }
    });
    if (best) tapNode(best.key);
    settle();
  });
  view.addEventListener('pointercancel', () => {
    worldEl.classList.remove('drag'); setTimeout(() => { moved = false; }, 30);
  });
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
function showBuild(node, tip) {
  const ov = $id('zq-build');
  $id('zq-build-bunny').innerHTML = KIDS.assets.rabbit('happy', 110);
  $id('zq-build-name').textContent = nodeLabel(node);
  $id('zq-build-tip').textContent = tip || '这一关正在装修，小兔子先帮你记下进度啦';
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

/* v53：收启动 loading 屏（#zq-loading 纯 CSS 零 JS——收尾+SW 注册集中在此，幂等） */
window.__zqLoadingDone = window.__zqLoadingDone || function () {
  var b = document.getElementById('zq-loading');
  if (b && !b.classList.contains('done')) {
    b.classList.add('done');
    setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 450);
  }
  try {
    if (location.protocol.indexOf('http') === 0 && navigator.serviceWorker)
      navigator.serviceWorker.register('./sw.js').catch(function () {});
  } catch (e) {}
};
window.__zqLoadingDone();
