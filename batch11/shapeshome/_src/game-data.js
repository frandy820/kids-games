/* ================= shapeshome 形状分家 游戏数据（r8 难度改造 2026-09-14，AUDIT-56 #14）
   原 双维分类（色×形 3 选 1，4 岁级，实测单关 10-18s）→ 三新题型：
   ch1 tri 三维匹配（色+形+大小，干扰恰差一维） / ch2 neg 否定条件（"不是X色也不是Y形"唯一满足项，
   抑制优势反应） / ch3 grid 九宫格缺格推理（行恒形·列恒色推缺格） / ch4 mix 混排 hard 参数。
   维度表：颜色 6（SPEC §2 指定 hex）× 形状 4 × 大小 2（big=1 / small=.6，图形绘于 92px 盒内缩放，
   触摸目标不变）；内嵌 SVG 描线风（batch9 先例）；近似色对（承 batch7）：红↔橙、蓝↔紫。
   语音：既有 33 键（shp_tut_ 系列、shp_hint、shp_q_ 系列 28、shp_rule2、shp_rule3）文本零改动零删除（manifest 真值源）；
   r8 新增 76 键：shp_q3_ 色×形×大小 48 + shp_nq_ 否定 24 + shp_gq + 规则句 3（shp_rule_neg/grid/mix）。
   estMs（r8 涉语音窗启用，家族定版字面禁 +300 变体）：SAPI ~345ms/字 + 600 落定余量 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 颜色表：name=颜色词（拼句用）；hex=SPEC §2 指定色值 ---------- */
const COLORS = {
  red:    { name: '红色', hex: '#E0503C' },
  yellow: { name: '黄色', hex: '#F5C445' },
  blue:   { name: '蓝色', hex: '#6E9BD8' },
  green:  { name: '绿色', hex: '#8FBF7F' },
  orange: { name: '橙色', hex: '#F0913D' },
  purple: { name: '紫色', hex: '#A884C9' }
};
const COLOR_KEYS = ['red', 'yellow', 'blue', 'green', 'orange', 'purple'];
/* 近似色对邻接表（单向列出即可，查两边） */
const NEAR = {
  red: ['orange'], orange: ['red'], blue: ['purple'], purple: ['blue'],
  yellow: [], green: []
};
const nearOf = c => NEAR[c] || [];
const isNearPair = (a, b) => nearOf(a).indexOf(b) >= 0 || nearOf(b).indexOf(a) >= 0;
/* 近似色域（有近似对的颜色——ch4 hard 辨析域） */
const NEAR_KEYS = ['red', 'orange', 'blue', 'purple'];

/* ---------- 形状表：name=形状词（拼句用）；draw(C)=图形内部 SVG 串 ---------- */
const SHAPES = {
  circle: { name: '圆形', draw(C) {
    return '<circle cx="50" cy="50" r="34" fill="' + C + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M34 36 a22 22 0 0 1 14 -11" stroke="#FFF" stroke-width="5.5" fill="none" stroke-linecap="round" opacity=".55"/>';
  } },
  square: { name: '方形', draw(C) {
    return '<rect x="17" y="17" width="66" height="66" rx="10" fill="' + C + '" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="27" y="27" width="17" height="17" rx="4" fill="#FFF" opacity=".42"/>';
  } },
  triangle: { name: '三角形', draw(C) {
    return '<polygon points="50,12 89,84 11,84" fill="' + C + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M41 61 L50 44 L59 61 Z" fill="#FFF" opacity=".35"/>';
  } },
  star: { name: '五角星', draw(C) {
    return '<polygon points="50,10 61,38 91,38 67,56 75,86 50,68 25,86 33,56 9,38 39,38" fill="' + C + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<circle cx="46" cy="46" r="3" fill="#FFF" opacity=".65"/><circle cx="54" cy="46" r="3" fill="#FFF" opacity=".65"/>';
  } }
};
const SHAPE_KEYS = ['circle', 'square', 'triangle', 'star'];

/* ---------- 大小表（r8 第三维）：name=大小词（拼句用）；scale=盒内绘制缩放（big 全幅/small .6）
   svg 盒恒 92px（触摸/断言口径不变），大小差由盒内缩放承载（92 vs ~55px 视觉级差清晰） ---------- */
const SIZES = {
  big:   { name: '大', scale: 1 },
  small: { name: '小', scale: 0.6 }
};
const SIZE_KEYS = ['big', 'small'];

/* ---------- 图形渲染：独立 <svg> 壳（候选卡 / 飞行克隆 / 九宫格格共用；sz=绘制缩放） ---------- */
function shapeSvg(sk, C, sz) {
  const S = SHAPES[sk];
  if (!S) return '';
  const inner = S.draw(C);
  const g = (sz && sz < 1) ? '<g transform="translate(50 50) scale(' + sz + ') translate(-50 -50)">' + inner + '</g>' : inner;
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    g + '</svg>';
}

/* ---------- 家卡渲染（tri 三维）：小房子 + 山墙圆窗内目标图形（色+形+大小）
   .win=两窗（.lit 亮灯）；.gwin=山墙圆窗（飞行目标）；.hshape=目标图形（内层 g 再乘 tz 缩放） ---------- */
function homeSvg(q) {
  const C = COLORS[q.tc].hex;
  const g = SHAPES[q.ts].draw(C);
  const zs = SIZES[q.tz].scale;
  return '<svg viewBox="0 0 280 215" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    /* 墙 */
    '<rect x="26" y="110" width="228" height="92" rx="10" fill="#F6EBD5" stroke="' + INK + '" stroke-width="4"/>' +
    /* 门（拱门）+ 门把手 */
    '<path d="M116 202 v-40 a24 27 0 0 1 48 0 v40 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="153" cy="178" r="3" fill="' + INK + '"/>' +
    /* 窗 ×2（答对亮灯） */
    '<g class="win"><rect x="42" y="126" width="40" height="40" rx="8" fill="#C2CFDA" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M62 126 v40 M42 146 h40" stroke="' + INK + '" stroke-width="2.6"/></g>' +
    '<g class="win"><rect x="198" y="126" width="40" height="40" rx="8" fill="#C2CFDA" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M218 126 v40 M198 146 h40" stroke="' + INK + '" stroke-width="2.6"/></g>' +
    /* 烟囱（画在屋顶前，穿出屋面） */
    '<rect x="200" y="28" width="24" height="42" rx="4" fill="#D8A57A" stroke="' + INK + '" stroke-width="3.5"/>' +
    /* 屋顶（三角坡） */
    '<path d="M10 114 L140 14 L270 114 Z" fill="#E9B285" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    /* 山墙圆窗 + 目标图形（外层 class 由 CSS 定位，内层 attribute 承载大小缩放） */
    '<circle class="gwin" cx="140" cy="74" r="52" fill="#FFFDF6" stroke="' + INK + '" stroke-width="4"/>' +
    '<g class="hshape" transform="translate(140,74) scale(.92) translate(-50,-50)"><g transform="scale(' + zs + ')">' + g + '</g></g>' +
    '</svg>';
}

/* ---------- 家卡渲染（neg 否定）：山墙圆窗=大问号 + 屋顶两坡各一枚"划掉徽章"
   （图示锚点双承载 §0.19：左=禁色圆片✗ / 右=禁形描线✗；语音说"不是X也不是Y"——不泄答案只给条件） ---------- */
function negSvg(q) {
  const banned = (cx, cy, inner) =>
    '<g class="nbadge"><circle cx="' + cx + '" cy="' + cy + '" r="27" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<g transform="translate(' + cx + ',' + cy + ') scale(.42) translate(-50,-50)">' + inner + '</g>' +
    '<path d="M' + (cx - 22) + ' ' + (cy - 22) + ' L' + (cx + 22) + ' ' + (cy + 22) +
      ' M' + (cx + 22) + ' ' + (cy - 22) + ' L' + (cx - 22) + ' ' + (cy + 22) +
      '" stroke="#C0503D" stroke-width="7" stroke-linecap="round" opacity=".88"/></g>';
  const colorBadge = banned(76, 86, SHAPES.circle.draw(COLORS[q.nc].hex));
  const shapeBadge = banned(204, 86, SHAPES[q.ns].draw('#E5D5BC'));
  return '<svg viewBox="0 0 280 215" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="26" y="110" width="228" height="92" rx="10" fill="#F6EBD5" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M116 202 v-40 a24 27 0 0 1 48 0 v40 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="153" cy="178" r="3" fill="' + INK + '"/>' +
    '<g class="win"><rect x="42" y="126" width="40" height="40" rx="8" fill="#C2CFDA" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M62 126 v40 M42 146 h40" stroke="' + INK + '" stroke-width="2.6"/></g>' +
    '<g class="win"><rect x="198" y="126" width="40" height="40" rx="8" fill="#C2CFDA" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M218 126 v40 M198 146 h40" stroke="' + INK + '" stroke-width="2.6"/></g>' +
    '<rect x="200" y="28" width="24" height="42" rx="4" fill="#D8A57A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M10 114 L140 14 L270 114 Z" fill="#E9B285" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle class="gwin" cx="140" cy="74" r="52" fill="#FFFDF6" stroke="' + INK + '" stroke-width="4"/>' +
    '<text class="qmark" x="140" y="76" text-anchor="middle" dominant-baseline="central" font-size="62" font-weight="700" fill="#E8975A">?</text>' +
    colorBadge + shapeBadge +
    '</svg>';
}

/* ---------- 九宫格渲染（grid）：HTML grid（§0.15 结构化内容优先 HTML grid/flex）
   3×3：行恒形（rows[r]）/ 列恒色（cols[c]）；缺格=.gmiss（虚线框+大问号，语音"问号"锚定） ---------- */
function gridHtml(q) {
  let h = '<div class="ggrid" aria-hidden="true">';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (r === q.miss.r && c === q.miss.c) h += '<div class="gcell gmiss">?</div>';
    else h += '<div class="gcell">' + shapeSvg(q.rows[r], COLORS[q.cols[c]].hex) + '</div>';
  }
  return h + '</div>';
}

/* ---------- 章配置（hint=完成本章后的下一章预告，§0.4 章末预告=CHAPTERS[ci+1] 语义） ---------- */
const CHAPTERS = {
  1: { name: '三个一起看', hint: '接下来要反过来找啦，不是红色也不是圆形的，才是答案哦' },
  2: { name: '反着找', hint: '接下来要看规律啦，每一行形状一样，每一列颜色一样，找问号' },
  3: { name: '找规律', hint: '接下来什么题都有，还有很像的颜色，要看仔细哦' },
  4: { name: '大混战', hint: '新一轮形状分家的挑战' }
};
const GEN_HINTS = ['颜色形状大小都要一样的新一轮', '反着找不是它的新一轮',
  '看规律找问号的新一轮', '大混战什么都有的新一轮'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（前三条与 voice/clips/manifest.json 严格一致，禁自造）
   r8 三新题面/规则句见 qKeyOf/RULES；纠错句 T46 阶段2（2026-09-19）clip 化=shp_wrong 族 73
   （tri 48+neg 24+grid 1），见 wrongKeyOf——VOICE 表不再挂 wrong 占位键（原 shp_wrong 无册键 B 类） ---------- */
const VOICE = {
  watch: { key: 'shp_tut_watch', text: '看！图形要回自己的家' },
  turn:  { key: 'shp_tut_turn',  text: '你来送一送' },
  hint:  { key: 'shp_hint',      text: '看一看，和家一样的图形' }
};
/* 章 2/3/4 首关开场链规则句（旧 shp_rule2/3 键保留注册不删，r8 起新章换新键新文本） */
const RULES = {
  neg:  { key: 'shp_rule_neg',  text: '这一章要反过来找，不是红色、也不是圆形的，才是答案哦' },
  grid: { key: 'shp_rule_grid', text: '这一章要看规律，每一行形状一样，每一列颜色一样，找出问号' },
  mix:  { key: 'shp_rule_mix',  text: '这一章什么题都有，还有很像的颜色，要看仔细哦' }
};

/* ---------- 题面朗读（r8 全 clip 化：tri shp_q3_* 48 / neg shp_nq_* 24 / grid shp_gq 固定句）
   tri：色+的+大小+形；neg：不是X色、也不是Y形的；grid：行/列规律+问号（零文字依赖，图示=网格本体） ---------- */
const GRID_SPEECH = '看一看，每行形状一样，每列颜色一样，问号是哪一个';
const speechBody = q => q.kind === 'tri'
  ? COLORS[q.tc].name + '的' + SIZES[q.tz].name + SHAPES[q.ts].name
  : '不是' + COLORS[q.nc].name + '、也不是' + SHAPES[q.ns].name + '的';
const quizSpeech = q => q.kind === 'grid' ? GRID_SPEECH : '找一找，' + speechBody(q);
const wrongSpeech = q => q.kind === 'grid'
  ? '不对哦，看看问号那一行的形状，再看看那一列的颜色'
  : '不对哦，要找' + speechBody(q);
/* 纠错句 clip 键（T46 阶段2 2026-09-19）：shp_wrong 族 73=grid 固定 1+tri 48（镜像 qKeyOf
   的 tc_ts_tz 键序）+neg 24（nc_ns）——与 wrongSpeech 拼式一字不差，manifest 注册块为准 */
const wrongKeyOf = q => q.kind === 'grid' ? 'shp_wrong_g'
  : q.kind === 'tri' ? 'shp_wrong_tri_' + q.tc + '_' + q.ts + '_' + q.tz
  : 'shp_wrong_neg_' + q.nc + '_' + q.ns;
/* 题面句 clip 键（manifest 真值源=voice/gen_clips.py，与本处拼式严格一致） */
const qKeyOf = q => q.kind === 'tri' ? 'shp_q3_' + q.tc + '_' + q.ts + '_' + q.tz
  : q.kind === 'neg' ? 'shp_nq_' + q.nc + '_' + q.ns : 'shp_gq';

/* ---------- estMs（家族定版字面，r8 涉语音窗启用；build/verify 四处同步，禁 +300 变体）
   用途：modeled 单关时长 = Σ(estMs(题面句码点) + DECIDE[题型] + 980) ≥ 40000（verify 硬断言） */
const estMs = n => n * 345 + 600;

/* ---------- 图标（内嵌 SVG，暖棕描线） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 20 L22 8 L36 20" stroke="#B3714A" stroke-width="4.5" fill="none" stroke-linejoin="round"/>' +
    '<rect x="11" y="20" width="22" height="16" rx="3" fill="#F6EBD5" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<circle cx="22" cy="17" r="5.5" fill="#F0913D" stroke="#4A3B2E" stroke-width="2.2"/>' +
    '</svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
