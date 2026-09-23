/* ================= times 游戏数据（章配置 / 语音文案与读音单元 / 图标 / 鱼造型） ================= */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材，进度章号单调递增）
   KEYS[n] = 第 n 难度章的口诀键因数；hint=章末"明天"预告 ---------- */
const KEYS = { 1: [2, 3], 2: [4, 5], 3: [6, 7], 4: [8, 9] };
const CHAPTERS = {
  1: { name: '乘法初相识（×2 ×3）', hint: '×4 ×5 的鱼群来啦' },
  2: { name: '×4 ×5', hint: '×6 ×7 大鱼群' },
  3: { name: '×6 ×7', hint: '×8 ×9 和缺因数小侦探' },
  4: { name: '×8 ×9 · 混合复习 · 缺因数', hint: '新一轮乘法海洋' }
};
const GEN_HINTS = ['×2 ×3 的鱼群再游一次', '×4 ×5 新鱼群', '×6 ×7 大鱼群', '×8 ×9 和小侦探'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
const AID_MAX_DCH = 3;     // 分组图 dch1-3（×6×7 大口诀章也给支架，7 岁半玩家评估 P1；dch4 ×8×9 组过大不画）

/* ---------- 语音文案（key=待合成 clip 名，text=TTS 兜底；游戏内语音仅前 3 关播） ---------- */
const VOICE = {
  watch: { key: 'tim_tut_watch', text: '看！数一数有几条鱼' },
  turn:  { key: 'tim_tut_turn',  text: '你来算一算' },
  hint:  { key: 'tim_hint',      text: '数一数，再选答案' },
  also:  { key: 'tim_also',      text: '也可以说' },
  miss:  { key: 'tim_miss_hint', text: '想一想，几个几能凑成它，数一数呀' }
};

/* ---------- 题面读音单元 clip：数字 / 十 / 加 / 乘 / 等于 / 几（voice.queue 拼接用）
   numParts：2-9 直读；10=十；11-19=十+个位；20-99=十位+十[+个位] ---------- */
const NUM_CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function numParts(n, out) {
  if (n <= 9) { out.push({ key: 'tim_n' + n, text: NUM_CN[n] }); return out; }
  const t = Math.floor(n / 10), u = n % 10;
  if (t === 1) out.push({ key: 'tim_shi', text: '十' });
  else { out.push({ key: 'tim_n' + t, text: NUM_CN[t] }); out.push({ key: 'tim_shi', text: '十' }); }
  if (u) out.push({ key: 'tim_n' + u, text: NUM_CN[u] });
  return out;
}
function quizParts(q) { // 题面读音单元序列（与题面文字一一对应）
  const p = [];
  if (q.type === 'sum') {
    for (let k = 0; k < q.b; k++) { if (k) p.push({ key: 'tim_plus', text: '加' }); numParts(q.a, p); }
    p.push({ key: 'tim_eq', text: '等于' }, { key: 'tim_howmuch', text: '几' });
  } else if (q.type === 'mul') {
    numParts(q.a, p); p.push({ key: 'tim_times', text: '乘' }); numParts(q.b, p);
    p.push({ key: 'tim_eq', text: '等于' }, { key: 'tim_howmuch', text: '几' });
  } else { // miss：? × a = c
    p.push({ key: 'tim_howmuch', text: '几' }, { key: 'tim_times', text: '乘' });
    numParts(q.a, p); p.push({ key: 'tim_eq', text: '等于' }); numParts(q.c, p);
  }
  return p;
}
const quizFullText = q => quizParts(q).map(p => p.text).join('');
function convertParts(q) { // 连加→乘法 转化卡读音：也可以说 a×b
  const p = [{ key: 'tim_also', text: '也可以说，' }];
  numParts(q.a, p); p.push({ key: 'tim_times', text: '乘' }); numParts(q.b, p);
  return p;
}
const convertFullText = q => convertParts(q).map(p => p.text).join('');

/* ---------- 图标（全部内嵌 SVG，描边 2.5px 暖棕） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M6 22 L15 14 L14 22 L15 30 Z" fill="#FFF9EE" stroke="#FFF" stroke-width="2" stroke-linejoin="round"/>' +
    '<ellipse cx="24" cy="22" rx="13" ry="9.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2"/>' +
    '<circle cx="29" cy="20" r="1.8" fill="#E8975A"/>' +
    '<path d="M22 28 Q26 31 30 28" stroke="#E8975A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="36" cy="10" r="2.2" fill="#FFF" opacity=".8"/><circle cx="39" cy="15" r="1.4" fill="#FFF" opacity=".7"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 看一看按钮图标：两个虚线分组框，各 2 条小鱼（对应分组图辅助） */
  groups: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="3" y="5" width="27" height="24" rx="9" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5" stroke-dasharray="5 4"/>' +
    '<rect x="34" y="5" width="27" height="24" rx="9" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5" stroke-dasharray="5 4"/>' +
    '<rect x="3" y="35" width="27" height="24" rx="9" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5" stroke-dasharray="5 4"/>' +
    miniFish(7, 12, 0.42, '#FFF9EE') + miniFish(7, 18, 0.42, '#FFF9EE') +
    miniFish(38, 12, 0.42, '#FFF9EE') + miniFish(38, 18, 0.42, '#FFF9EE') +
    miniFish(7, 42, 0.42, '#FFF9EE') + miniFish(7, 48, 0.42, '#FFF9EE') +
    '<text x="47" y="53" font-size="22" font-weight="800" fill="#FFF9EE" text-anchor="middle">?</text></svg>',
  star: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path class="st-star" d="M32 7 Q36 25 57 32 Q36 39 32 57 Q28 39 7 32 Q28 25 32 7 Z" stroke-linejoin="round"/></svg>'
};

/* ---------- 鱼（题面选项的数字鱼 + 分组图小鱼） ---------- */
const FISH_PAL = [
  { body: '#F0A868', fin: '#F6C893' },
  { body: '#9CC98D', fin: '#BCDDB0' },
  { body: '#F2B8C6', fin: '#F8D5DC' },
  { body: '#A3B7C7', fin: '#C4D2DD' }
];
/* 大数字鱼（i=颜色索引，w=宽度像素；CSS 可再覆盖宽度） */
function fishSvg(i, w) {
  const c = FISH_PAL[((i % 4) + 4) % 4];
  const h = Math.round(w * 88 / 132);
  return '<svg viewBox="0 0 132 88" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M10 44 L36 24 L33 44 L36 64 Z" fill="' + c.fin + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M58 19 Q70 5 87 12 Q77 19 72 27 Z" fill="' + c.fin + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M42 58 Q52 74 74 71 Q60 63 55 52 Z" fill="' + c.fin + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="72" cy="46" rx="40" ry="28" fill="' + c.body + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M88 26 Q80 46 88 66" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M64 52 Q74 63 85 52 Q77 67 65 59 Z" fill="' + c.fin + '" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<circle cx="94" cy="38" r="5.2" fill="' + INK + '"/><circle cx="96" cy="36" r="1.7" fill="#FFF"/>' +
    '<path d="M108 50 Q112 53.5 108 57" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M48 34 Q55 25 68 23" stroke="#FFF" stroke-width="3.2" opacity=".35" fill="none" stroke-linecap="round"/>' +
    '</svg>';
}
/* 分组图小鱼（纯色剪影+眼睛，x/y/scale/颜色） */
function miniFish(x, y, s, col) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
    '<path d="M0 11 L8 4 L8 18 Z" fill="' + col + '"/>' +
    '<ellipse cx="17" cy="11" rx="11" ry="7.5" fill="' + col + '"/>' +
    '<circle cx="22" cy="9" r="1.6" fill="' + INK + '"/></g>';
}
const aidFish = () => '<span class="a-fish">' + fishSvg(0, 30) + '</span>';
