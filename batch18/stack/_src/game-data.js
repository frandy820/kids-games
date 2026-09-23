/* ================= stack 游戏数据（章配置 / 语音文案 / 塔区 SVG 几何工具）
   语音（SPEC-BATCH18 §2）：st_ 7 条封闭句单 clip（tut_watch/tut_turn/hint/right/wrong/wind/place）
   + core 3 条共享；层数/题面句=TTS 兜底豁免（§2 定稿：b13 起数词 clip 仅题面句用，本款无）
   塔区渲染（正视角，全整数坐标）：
   - 列 c 中心 x = GEO.left + c*40；楼层块 rect x = cx - w*20 → col/w/wind 全整数则 x/y 恒整数
   - 地基 5 格居中（中心列 3）+7 条列虚线延伸到底（与底部列按钮带视觉呼应）
   - 托盘：待放块序列小图（当前块橙框、已放淡化、风摆块带小红箭头）
   - 当前块悬停塔上方固定高度（sway=风摆块往返动画+大红风箭头 → 预判启蒙锚点）
   - 倒塌=当前块 fallout 翻滚散落 + 塔身 tshake（零惩罚，从倒塌层重搭） */
'use strict';

const INK = '#4A3B2E';

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   ch1 单列堆（对齐宽容）；ch2 块宽渐变（下宽上窄/下窄上宽）
   ch3 含风摆块 1 个；ch4 生成关（5-6 块+两处风摆，稳定解不唯一但存在）
   hint=章末预告文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '搭高楼', hint: '宽宽窄窄的楼层，都要搭稳哦' },
  2: { name: '宽窄变化', hint: '风来了，放另一边抵住它' },
  3: { name: '大风天', hint: '更多楼层，更大挑战' },
  4: { name: '高楼大师', hint: '新一轮搭楼挑战' }
};
const GEN_HINTS = ['搭高楼再来一次', '宽窄变化挑战', '大风天挑战', '高楼大师挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 网格与平衡参数（引擎/UI 共用真值；verify 侧复算用独立字面量分源 §0.38）
   7 列（0-6）、地基 5 格中心列 3（半宽 2.5）、安全裕度 0.5 格 ---------- */
const GRID = { cols: 7, baseW: 5, baseC: 3, margin: 0.5 };

/* ---------- 楼层块配色（暖米底 4 色轮转，相邻块恒异色 §0.10 可辨识） ---------- */
const COLORS = ['#E8975A', '#8FBF7F', '#F2C94C', '#9BB8D3'];
const BASE_FILL = '#C9A87C';
const GROUND_LINE = '#D9C5A6';
const WIND_RED = '#D9534F';

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/clips/manifest.json 严格一致 §0.18） ---------- */
const VOICE = {
  watch: { key: 'st_tut_watch', text: '看！把高楼搭起来' },
  turn:  { key: 'st_tut_turn',  text: '你来搭一搭' },
  hint:  { key: 'st_hint',      text: '对整齐就不倒啦' },
  right: { key: 'st_right',     text: '搭好啦，真稳' },
  wrong: { key: 'st_wrong',     text: '歪了歪了，再来一次' },
  wind:  { key: 'st_wind',      text: '风来了，放另一边' },
  place: { key: 'st_place',     text: '放好一层' }
};

/* 题面句（T46 阶段2 2026-09-19：章问句 clip 化 st_q_1..4 全在册——四句静态域，
   原 SPEC §2「不建题面 clip」口径由 Task#46 全量预合成红线取代；键名与 ASKS 一一对应） */
const ASKS = {
  1: '把楼层一块块搭上去',
  2: '看看宽窄，稳稳地搭',
  3: '风来了，往另一边放',
  4: '大风天，搭一座高楼'
};
const qAsk = dch => ASKS[dch] || ASKS[1];

/* ---------- 塔区几何（整数坐标断言基础：col/wind/w 全整数 → x/y 恒整数） ---------- */
const GEO = { left: 60, cell: 40, lh: 34, ground: 392, baseH: 26, curY: 96, vbX: -70, vbW: 480, vbH: 448 };
const colCx = c => GEO.left + c * GEO.cell;

/* 楼层块（rect+顶高光条伪立体；cls=动画类） */
function blockRect(cx, w, y, color, cls) {
  const x = cx - w * GEO.cell / 2;
  return '<g class="blk' + (cls ? ' ' + cls : '') + '">' +
    '<rect class="blkr" x="' + x + '" y="' + y + '" width="' + (w * GEO.cell) + '" height="' + GEO.lh +
    '" rx="6" fill="' + color + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="' + (x + 5) + '" y="' + (y + 4) + '" width="' + (w * GEO.cell - 10) +
    '" height="7" rx="3.5" fill="#FFF" opacity=".28"/></g>';
}
/* 风箭头（dir=1 右 / -1 左；起点 (x,y)） */
function windArrowSvg(x, y, dir) {
  const d = dir > 0
    ? 'M' + x + ',' + y + ' h34 l-9,-9 m9,9 l-9,9'
    : 'M' + x + ',' + y + ' h-34 l9,-9 m-9,9 l9,9';
  return '<g class="windico"><path d="' + d + '" stroke="' + WIND_RED +
    '" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M' + (x + dir * 14) + ',' + (y - 18) + ' q' + (dir * 9) + ',7 0,14" stroke="' + WIND_RED +
    '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".65"/></g>';
}

/* ---------- 塔区 SVG（q=引擎题模型；opts：fallout+fallCol=倒塌 / drop=最新块落位动画
   / done=塔立打勾 / litBase=地基高亮（教学）
   返回 svg 字符串；楼块数=q.placed.length、托盘块数=q.floors.length ---------- */
function sceneSvg(q, opts) {
  opts = opts || {};
  const bc = colCx(GRID.baseC);
  let s = '';
  /* 地基（5 格居中；教学期 lit 呼吸） */
  s += '<g class="base' + (opts.litBase ? ' lit' : '') + '">' +
    '<rect x="' + (bc - GRID.baseW * 20) + '" y="' + GEO.ground + '" width="' + (GRID.baseW * 40) +
    '" height="' + GEO.baseH + '" rx="9" fill="' + BASE_FILL + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="' + (bc - GRID.baseW * 20 + 6) + '" y="' + (GEO.ground + 5) + '" width="' + (GRID.baseW * 40 - 12) +
    '" height="6" rx="3" fill="#FFF" opacity=".22"/></g>';
  /* 7 条列虚线（地基下延到塔区底，与列按钮带呼应） */
  for (let c = 0; c < GRID.cols; c++)
    s += '<line x1="' + colCx(c) + '" y1="' + (GEO.ground + GEO.baseH) + '" x2="' + colCx(c) +
      '" y2="' + (GEO.vbH - 6) + '" stroke="' + GROUND_LINE + '" stroke-width="2" stroke-dasharray="4 6" opacity=".8"/>';
  /* 塔身（已放楼层；倒塌时塔身 shake） */
  let tower = '';
  q.placed.forEach((p, i) => {
    const f = q.floors[i];
    const isLast = i === q.placed.length - 1;
    tower += blockRect(colCx(p.col + f.wind), f.w, GEO.ground - (i + 1) * GEO.lh, COLORS[f.ci],
      opts.drop && isLast ? 'drop' : '');
  });
  if (opts.done) {                                          /* 塔立：塔顶打勾角标 */
    const ty = GEO.ground - q.placed.length * GEO.lh - 26;
    tower += '<g class="badge"><circle cx="' + bc + '" cy="' + ty + '" r="17" fill="#8FBF7F" stroke="#FFFAF0" stroke-width="3"/>' +
      '<path d="M' + (bc - 8) + ',' + ty + ' L' + (bc - 2) + ',' + (ty + 7) + ' L' + (bc + 9) + ',' + (ty - 7) +
      '" stroke="#FFF" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>';
  }
  s += '<g class="tower' + (opts.fallout ? ' tshake' : '') + '">' + tower + '</g>';
  /* 倒塌块：画在尝试落点（col+wind 中心，塔顶+1 层位），向偏移方向翻滚散落 */
  if (opts.fallout && !q.solved && q.floors[q.step]) {
    const f = q.floors[q.step];
    const offDir = (opts.fallCol + f.wind - (q.placed.length ? q.placed[q.placed.length - 1].col +
      q.floors[q.placed.length - 1].wind : GRID.baseC)) || f.wind || 1;
    const fx = offDir > 0 ? 70 : -70, fr = offDir > 0 ? 42 : -42;
    const cx = colCx(opts.fallCol + f.wind);
    const y = GEO.ground - (q.placed.length + 1) * GEO.lh;
    s += '<g class="blk fallout" style="--fx:' + fx + 'px;--fr:' + fr + 'deg">' +
      '<rect x="' + (cx - f.w * 20) + '" y="' + y + '" width="' + (f.w * GEO.cell) + '" height="' + GEO.lh +
      '" rx="6" fill="' + COLORS[f.ci] + '" stroke="' + INK + '" stroke-width="2.5"/></g>';
  }
  /* 当前块（悬停塔上方中央；风摆块 sway+大红箭头；solved/倒塌期不画） */
  if (!q.solved && !opts.fallout && q.floors[q.step]) {
    const f = q.floors[q.step];
    s += '<g class="curwrap' + (f.wind ? ' sway' : '') + '"' + (f.wind ? ' style="--sw:' + (f.wind * 8) + 'px"' : '') + '>' +
      blockRect(colCx(GRID.baseC), f.w, GEO.curY, COLORS[f.ci], '') +
      (f.wind ? windArrowSvg(colCx(GRID.baseC) + (f.wind > 0 ? f.w * 20 + 16 : -f.w * 20 - 16),
        GEO.curY + GEO.lh / 2, f.wind) : '') + '</g>';
  }
  /* 托盘（待放块序列小图：已放淡化、当前橙框、风摆块小红箭头） */
  let tw = 0;
  q.floors.forEach(f => { tw += f.w * 11 + 8; });
  tw -= 8;
  let tx = bc - tw / 2;
  q.floors.forEach((f, i) => {
    const bw = f.w * 11;
    s += '<rect class="trayb" x="' + tx + '" y="12" width="' + bw + '" height="22" rx="4" fill="' + COLORS[f.ci] +
      '" stroke="' + (i === q.step ? '#E8873A' : INK) + '" stroke-width="' + (i === q.step ? 3 : 1.6) +
      '" opacity="' + (i < q.step ? '.32' : '1') + '"/>';
    if (f.wind) {
      const ax = f.wind > 0 ? tx + bw - 11 : tx + 11;
      s += '<path d="M' + (ax - (f.wind > 0 ? 5 : -5)) + ',23 h10 l-3,-3 m3,3 l-3,3" stroke="' + WIND_RED +
        '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    tx += bw + 8;
  });
  return '<svg class="scene" viewBox="' + GEO.vbX + ' 0 ' + GEO.vbW + ' ' + GEO.vbH +
    '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
}

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="12" y="26" width="20" height="12" rx="2.5" fill="#E8975A" stroke="#FFF" stroke-width="2.2"/>' +
    '<rect x="16" y="15" width="12" height="11" rx="2.5" fill="#8FBF7F" stroke="#FFF" stroke-width="2.2"/>' +
    '<rect x="19" y="6" width="6" height="9" rx="2" fill="#F2C94C" stroke="#FFF" stroke-width="2.2"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 题面小图标：三层小楼（与塔区同几何语言，非装饰：块宽渐变+居中对齐锚点） */
  towerMini: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="40" width="50" height="12" rx="3" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="10" y="26" width="38" height="13" rx="3" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="18" y="13" width="22" height="12" rx="3" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="24" y="3" width="10" height="9" rx="3" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.4"/></svg>'
};
