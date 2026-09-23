/* ================= matchstick 游戏数据（章配置 / 语音文案 / 七段段集真值源 + 几何与火柴 SVG）
   题面语音=封闭句单 clip（SPEC §0.23）：ms_q'移一根火柴，让算式成立'覆盖全部题型；
   反馈 ms_right/ms_wrong（§0.24 专属 wrong clip）；轻反馈 ms_pick/ms_drop（10s 节流，主会话注入）
   七段段集表 = 唯一真值源（SPEC §3）：数字字形渲染与变换判定共用本表，
   verify 侧另写独立表分源对账（§0.30 禁两套逻辑同错不可检） */
'use strict';

const INK = '#4A3B2E';

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   ch1 一位数加法（C≤10 含 '1 0' 两位七段）
   ch2 一位数减法（含 6↔9/0↔9/5↔6/2↔3 族变换偏好）
   ch3 两位数参与（A 或 C 恰一为两位）
   ch4 运算符参与（+↔- 单根规则入池）+数字移动混合
   hint=章末预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '加一加', hint: '减法算式也来移一移' },
  2: { name: '减一减', hint: '两位数的大算式来啦' },
  3: { name: '两位数', hint: '加减号也能变一变哟' },
  4: { name: '变符号', hint: '新一轮火柴谜题' }
};
const GEN_HINTS = ['新的火柴谜题', '移一根想一想', '大数字火柴阵', '符号变幻挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/clips/manifest.json 严格一致 §0.18）
   ms_* 全集 8 条（manifest 已注入，gen_clips 主会话预合成） ---------- */
const VOICE = {
  watch:  { key: 'ms_tut_watch', text: '看！火柴动一动' },
  turn:   { key: 'ms_tut_turn',  text: '你来移一移' },
  hint:   { key: 'ms_hint',      text: '想一想，动哪一根' },
  wrong:  { key: 'ms_wrong',     text: '再移一移试试' },
  right:  { key: 'ms_right',     text: '成立啦，你真聪明' },
  q:      { key: 'ms_q',         text: '移一根火柴，让算式成立' },
  pick:   { key: 'ms_pick',      text: '拿起了一根' },
  drop:   { key: 'ms_drop',      text: '放好啦' }
};

/* ---------- 七段段集表（SPEC §3 唯一真值源；渲染与判定共用）
   段命名 a 上横 / b 右上竖 / c 右下竖 / d 下横 / e 左下竖 / f 左上竖 / g 中横
   SEG[i] = 第 i 段的段名；SEGSET[d] = 数字 d 点亮的段名集合 ---------- */
const SEG = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const SEGSET = {
  0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc',
  5: 'afgcd', 6: 'afgcde', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg'
};
/* 段名 → 段下标 */
const SEGIDX = {}; SEG.forEach((s, i) => { SEGIDX[s] = i; });
/* 数字 → 7 位布尔数组（[a,b,c,d,e,f,g]）；渲染真值源 */
function segBools(d) {
  const on = [false, false, false, false, false, false, false];
  const s = SEGSET[d];
  for (let i = 0; i < s.length; i++) on[SEGIDX[s[i]]] = true;
  return on;
}
/* 7 位布尔数组 → 数字（恰为某数字段集返回该数字，否则 null；判定真值源） */
function boolDigit(on) {
  for (let d = 0; d <= 9; d++) {
    const ref = segBools(d);
    let same = true;
    for (let i = 0; i < 7; i++) if (ref[i] !== !!on[i]) { same = false; break; }
    if (same) return d;
  }
  return null;
}

/* ---------- 七段几何（JS 按容器实测 px 布局；渲染与命中共用同一组数）
   digit cell 宽 W 高 H=2.06W，杆厚 t=0.15W：
   横杆（a/g/d）长 Lh=W-1.7t 居中；竖杆（f/b/e/c）半长 Lv=H/2-1.35t，
   中心 x：f/e=t*0.55（左）、b/c=W-t*0.55（右）；中心 y：f/b=H*0.25、e/c=H*0.75
   命中矩形（M5 先例）：沿杆向=杆长+8，垂直向恒 64（外扩后两向均 ≥64） */
const HIT = 68;                                  // 命中矩形垂直向（px，§0.9；68 留浮点余量保 ≥64）
function digitGeo(W) {
  const H = 2.06 * W, t = 0.15 * W;
  const Lh = W - 1.7 * t, Lv = H / 2 - 1.35 * t;
  return {
    W: W, H: H, t: t, Lh: Lh, Lv: Lv,
    pos: {                                    // 各段中心（cell 局部坐标）
      a: [W / 2, t * 0.55], g: [W / 2, H / 2], d: [W / 2, H - t * 0.55],
      f: [t * 0.55, H * 0.25], b: [W - t * 0.55, H * 0.25],
      e: [t * 0.55, H * 0.75], c: [W - t * 0.55, H * 0.75]
    },
    hz: ['a', 'g', 'd'], vt: ['f', 'b', 'e', 'c']
  };
}
/* 运算符/等号几何：杆长 opL（+/-用）、eqL（=两横用），=双横 y 偏移 ±eqGap
   opL≥78：加号横竖交叉区后画者覆盖，杆端须露出命中带（(opL+8)/2-34≥5）保各自可点 */
function opGeo(W) {
  return { opL: Math.max(78, W * 0.56), eqL: Math.max(76, W * 0.56), eqGap: Math.max(20, W * 0.22) };
}

/* ---------- 火柴 SVG（横杆：红头朝左统一；竖杆：红头朝上统一 §3）
   局部坐标一律横向建模：中心 (0,0)，杆 [-len/2, len/2]×[-t/2,t/2]，头在左端；
   竖杆整组 rotate(90)（左端→正上方）；命中矩形与杆同局部方位（沿杆 len+8 × 垂直 64），
   随组同旋 → 页面两向恒 ≥64（沿杆 len+8≥64 由布局 W≥92 保证） ---------- */
function stickBody(len, t) {
  const hl = len / 2, hw = t * 1.18, hh = t * 1.32;   // 头略长略厚于杆
  return '<rect class="rod" x="' + (-hl) + '" y="' + (-t / 2) + '" width="' + len + '" height="' + t +
    '" rx="' + (t / 2) + '"/>' +
    '<rect class="head" x="' + (-hl - hw * 0.28) + '" y="' + (-hh / 2) + '" width="' + hw + '" height="' + hh +
    '" rx="' + (t * 0.42) + '"/>';
}
/* 命中矩形（横局部：沿杆 len+8 × 垂直 HIT，中心对齐） */
function hitRect(len) {
  const hl = len / 2;
  return '<rect class="hit" x="' + (-hl - 4) + '" y="' + (-HIT / 2) + '" width="' + (hl * 2 + 8) + '" height="' + HIT + '"/>';
}
/* 完整火柴组（外层定位 translate(cx,cy)[ rotate(90)]，内层 .mov 承接拿起浮起 CSS） */
function stickSvg(cx, cy, segName, len, t, vertical, extraCls, slotId) {
  const rot = vertical ? ' rotate(90)' : '';
  return '<g class="stk' + (extraCls ? ' ' + extraCls : '') + '" data-slot="' + slotId + '" data-seg="' + segName + '"' +
    ' transform="translate(' + cx + ',' + cy + ')' + rot + '">' +
    '<g class="mov">' + stickBody(len, t) + '</g>' + hitRect(len) +
    '</g>';
}
/* 空槽组：虚线框（可视 gh + 透明命中矩形 hit）；extraCls 供 hot 态 */
function slotSvg(cx, cy, segName, len, t, vertical, extraCls, slotId) {
  const hl = len / 2;
  const inner = '<rect class="gh" x="' + (-hl) + '" y="' + (-t / 2) + '" width="' + len + '" height="' + t +
    '" rx="' + (t / 2) + '"/>';
  const rot = vertical ? ' rotate(90)' : '';
  return '<g class="slot' + (extraCls ? ' ' + extraCls : '') + '" data-slot="' + slotId + '" data-seg="' + segName + '"' +
    ' transform="translate(' + cx + ',' + cy + ')' + rot + '">' + inner + hitRect(len) + '</g>';
}

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="9" y="19" width="28" height="6" rx="3" fill="#D9A15E" stroke="#FFF" stroke-width="2"/>' +
    '<rect x="7" y="17.4" width="9" height="9.2" rx="3.4" fill="#E05548" stroke="#FFF" stroke-width="2"/>' +
    '<rect x="19" y="9" width="6" height="28" rx="3" fill="#D9A15E" stroke="#FFF" stroke-width="2"/>' +
    '<rect x="17.4" y="7" width="9.2" height="9" rx="3.4" fill="#E05548" stroke="#FFF" stroke-width="2"/></svg>',
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
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 题面小图标：两根火柴交叉（题面卡左侧视觉锚点，与场景同几何语言） */
  msMini: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<g transform="rotate(-38 29 29)">' +
    '<rect x="12" y="26" width="34" height="7" rx="3.5" fill="#D9A15E" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="9.5" y="24.2" width="9.5" height="10.6" rx="3.6" fill="#E05548" stroke="' + INK + '" stroke-width="2"/></g>' +
    '<g transform="rotate(34 29 29)">' +
    '<rect x="12" y="26" width="34" height="7" rx="3.5" fill="#D9A15E" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="9.5" y="24.2" width="9.5" height="10.6" rx="3.6" fill="#E05548" stroke="' + INK + '" stroke-width="2"/></g></svg>'
};
