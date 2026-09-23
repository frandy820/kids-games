/* ================= subbug 游戏数据（章配置 / 语音文案 / 图标 / 小虫 SVG / 中文数词）
   小虫 SVG 卡通：绿色圆身分节+触角+小细腿，颜色微随机（3 档近似绿），姿态微随机（左右朝向/眼睛睁闭/±6% 尺寸抖动）
   干扰瓢虫（章 4）：红色圆壳+黑斑点——与绿虫区分明显（色彩+斑点形状双冗余，红绿色弱也可辨） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   n 小虫只数区间 / D 撒点最小中心距 px / size 小虫渲染尺寸 px（热区 ≥64）
   name 供章末预告；hint=章末"明天"预告文案（GEN 文案不带"明天："前缀，core 模板自带）
   难度（r30 谱，SPEC-R30-SUBBUG §R2）：
   ch1 8 以内支架教学章（n 4-8，剩余 ≥1；点虫放飞数剩全套保留，教学链零改动）
   ch2 10 以内盲飞章（n 6-10，剩余 ≥1；先答后飞——n 播报）
   ch3 20 以内跨十盲飞章（n 12-20，允许剩余=0）
   ch4 一步题 n 9-14+瓢虫 2-4（n 不播报：数绿虫自得 n）+ 两步加减混合 qi1/qi3（n 播报、无瓢虫） */
const CHAPTERS = {
  1: { name: '飞走啦',   nMin: 4,  nMax: 8,  D: 150, size: 112, hint: '这次先算一算，答案对了小虫才飞走' },
  2: { name: '数到十',   nMin: 6,  nMax: 10, D: 118, size: 96,  hint: '十几只小虫，跨十减法来啦' },
  3: { name: '跨十减法', nMin: 12, nMax: 20, D: 94,  size: 76,  hint: '小心哦，叶子上混进了红色瓢虫' },
  4: { name: '只数绿虫', nMin: 9,  nMax: 14, D: 94,  size: 78,  hint: '飞走又飞来，两步算一算' }
};
const GEN_HINTS = ['新的减法挑战', '更多小虫飞一飞', '跨十大数再算一算', '小心混入的红色瓢虫'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
const D_MIN = 2;           // 章 4 干扰瓢虫只数区间（SPEC §3：2-4）
const D_MAX = 4;

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；现有键与 voice/gen_clips.py 严格一致）
   仅前 3 关播 sayP，救援/开场任务语音走 sayR；r30 新增 6 键（SPEC-R30 §R10，主线统一注册）：
   calc=盲飞章引导（救援/兔兔/首点提示/盲飞纠错共用）、green/fly2=章4 一步题面（n 不播报，
   数绿虫自得）、come/andcome/andfly=两步题面段（飞来了/又飞来了/又飞走了） */
const VOICE = {
  watch: { key: 'sub_tut_watch', text: '看！小虫飞走了' },
  turn:  { key: 'sub_tut_turn',  text: '你来算一算' },
  hint:  { key: 'sub_hint',      text: '数一数，还剩几只' },
  refly: { key: 'sub_refly',     text: '好，我们重新飞一飞' },
  wrong: { key: 'sub_wrong',     text: '不对哦，再数一数' },   /* 6 岁试玩共性 P1：flat≥3 纠错轻语音（10s 节流） */
  lady:  { key: 'sub_lady',      text: '红色瓢虫不算哦，只数绿色的小虫' },   /* 6 岁试玩 P2：章4 每关首次点瓢虫 */
  cheer: { key: 'sub_cheer',     text: '快飞完啦，加油' },   /* 6 岁试玩 P2：大 m 题放飞过半一次鼓励 */
  calc:  { key: 'sub_calc',      text: '先算一算，还剩几只' },               /* r30 盲飞章引导/纠错 */
  green: { key: 'sub_s_green',   text: '数一数绿色的小虫，' },               /* r30 章4 一步题面段（n 不播报） */
  fly2:  { key: 'sub_s_fly2',    text: '飞走了' },                            /* r30 章4 一步题面段 */
  come:  { key: 'sub_s_come',    text: '只小虫，飞来了' },                    /* r30 两步题面段（先加后减首步） */
  andcome: { key: 'sub_s_andcome', text: '只，又飞来了' },                   /* r30 两步题面段（先减后加次步） */
  andfly:  { key: 'sub_s_andfly',  text: '只，又飞走了' }                    /* r30 两步题面段（先加后减次步） */
};

/* ---------- 中文数词（题面朗读 TTS 用；范围 0-20） ---------- */
function numCn(n) {
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n <= 0) return D[0];
  if (n < 10) return D[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + D[n - 10];
  if (n === 20) return '二十';
  return '二十' + D[n - 20];
}
/* 题面整句朗读文案（=缺 clip 时的 KIDS.speak 兜底句；r30 分型分章）
   支架章/ch2/ch3 一步题：n 播报；ch4 一步题：n 不播报（数绿虫自得 n）；两步题按型全播报 */
const qSpeech = q => {
  if (q.type === 'dual') return q.form === 'A'
    ? '叶子上有' + numCn(q.n) + '只小虫，飞走了' + numCn(q.b) + '只，又飞来了' + numCn(q.c) + '只，还剩几只？'
    : '叶子上有' + numCn(q.n) + '只小虫，飞来了' + numCn(q.b) + '只，又飞走了' + numCn(q.c) + '只，还剩几只？';
  if (cur && cur.dch === 4) return '数一数绿色的小虫，飞走了' + numCn(q.m) + '只，还剩几只？';
  return '叶子上有' + numCn(q.n) + '只小虫，飞走了' + numCn(q.m) + '只，还剩几只？';
};
/* 题面 clip 拆段链（T46 阶段2，段间 0.15s 停顿由 core.queue 提供）：
   支架章/ch2/ch3：「叶子上有|n|只小虫，飞走了|m|只，还剩几只？」（原 5 段不变）
   ch4 一步题：「数一数绿色的小虫，|飞走了|m|只，还剩几只？」（n 不播报）
   两步 A：「叶子上有|n|只小虫，飞走了|b|只，又飞来了|c|只，还剩几只？」
   两步 B：「叶子上有|n|只小虫，飞来了|b|只，又飞走了|c|只，还剩几只？」 */
const qKeys = q => {
  if (q.type === 'dual') return q.form === 'A'
    ? ['sub_s_leaf', 'sub_n_' + q.n, 'sub_s_fly', 'sub_n_' + q.b, 'sub_s_andcome', 'sub_n_' + q.c, 'sub_s_left']
    : ['sub_s_leaf', 'sub_n_' + q.n, 'sub_s_come', 'sub_n_' + q.b, 'sub_s_andfly', 'sub_n_' + q.c, 'sub_s_left'];
  if (cur && cur.dch === 4)
    return ['sub_s_green', 'sub_s_fly2', 'sub_n_' + q.m, 'sub_s_left'];
  return ['sub_s_leaf', 'sub_n_' + q.n, 'sub_s_fly', 'sub_n_' + q.m, 'sub_s_left'];
};

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="22" cy="26" rx="16" ry="12" fill="#8CBF6F" stroke="#4A3B2E" stroke-width="2.5"/>' +
    '<circle cx="14" cy="24" r="2.2" fill="#4A3B2E"/><circle cx="22" cy="29" r="2.2" fill="#4A3B2E"/>' +
    '<circle cx="30" cy="24" r="2.2" fill="#4A3B2E"/>' +
    '<circle cx="22" cy="12" r="5" fill="#8CBF6F" stroke="#4A3B2E" stroke-width="2.5"/>' +
    '<path d="M19 8 q-2 -4 -5 -5 M25 8 q2 -4 5 -5" stroke="#4A3B2E" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="20" cy="12" r="1.3" fill="#4A3B2E"/><circle cx="24" cy="12" r="1.3" fill="#4A3B2E"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  refly: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M48 30 a18 18 0 1 0 -3 14" stroke="#E8975A" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M50 10 L50 29 L32 27 Z" fill="#E8975A" stroke="#E8975A" stroke-width="2" stroke-linejoin="round"/>' +
    '<ellipse cx="21" cy="42" rx="8" ry="6.5" fill="#8CBF6F" stroke="#4A3B2E" stroke-width="2.5"/>' +
    '<circle cx="18.5" cy="41" r="1.2" fill="#4A3B2E"/><circle cx="23.5" cy="41" r="1.2" fill="#4A3B2E"/></svg>',
  wing: '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M5 20 q4 -12 22 -13 q-2 12 -14 14 q4 -6 4 -9 q-6 4 -12 8 Z" fill="#E8975A" opacity=".85"/>' +
    '<path d="M6 24 q10 -1 20 -10" stroke="#C77A42" stroke-width="2" stroke-linecap="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 题面 chip 用：绿虫头像（与场上小虫同风格） */
  bugmini: '<svg class="bugmini" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="18" cy="32" r="8" fill="#6FA355" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<circle cx="30" cy="26" r="11" fill="#8CBF6F" stroke="#4A3B2E" stroke-width="2.8"/>' +
    '<circle cx="28" cy="23" r="1.6" fill="#4A3B2E"/><circle cx="33" cy="23" r="1.6" fill="#4A3B2E"/>' +
    '<path d="M27 30 q3 2.4 6 0" stroke="#4A3B2E" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 15 q-1 -5 -5 -6 M34 15 q2 -5 6 -5" stroke="#4A3B2E" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
};

/* ---------- 场上小虫 SVG（viewBox 0 0 100 100，含阴影脚下椭圆）
   p = { f: 0 右 / 1 左朝向, e: 0 睁眼 / 1 闭眼, g: 绿色档 0-2 }，s 尺寸缩放由外层 style 控制 */
const GREENS = [
  { b: '#8CBF6F', d: '#6FA355' },   // 基准绿
  { b: '#9BC877', d: '#77AD58' },   // 偏亮黄绿
  { b: '#82B96B', d: '#639C4D' }    // 偏深绿
];
function bugSvg(p) {
  const G = GREENS[p.g % GREENS.length];
  const eye = p.e
    ? '<path d="M63 47 q4 3.5 8 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : '<circle cx="65" cy="46" r="3.4" fill="' + INK + '"/><circle cx="66.4" cy="44.8" r="1.1" fill="#FFF"/>';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="93" rx="27" ry="5" fill="#B7CE92" opacity=".8"/>' +
    '<g' + (p.f ? ' transform="translate(100 0) scale(-1 1)"' : '') + '>' +
    '<path d="M28 76 v9 M40 80 v9 M56 80 v9 M68 76 v9" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="26" cy="64" r="13" fill="' + G.d + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="46" cy="58" r="16" fill="' + G.b + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="44" cy="54" r="2.4" fill="' + G.d + '"/><circle cx="50" cy="63" r="2" fill="' + G.d + '"/>' +
    '<circle cx="67" cy="50" r="19" fill="' + G.b + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="44" r="2.2" fill="' + G.d + '"/>' +
    '<path d="M73 33 q3 -10 12 -13 M62 31 q-1 -11 -8 -15" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    eye +
    '<path d="M70 58 q4 3 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="58" cy="58" r="2.6" fill="#F2A9A0" opacity=".7"/>' +
    '</g></svg>';
}
/* 瓢虫（章 4 干扰）：红色圆壳+黑斑+黑头，俯视造型——颜色+斑点双特征与绿虫区分 */
function ladySvg(p) {
  const eye = p.e
    ? '<path d="M44 24 q3 3 6 0 M58 24 q3 3 6 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
    : '<circle cx="47" cy="23" r="2.4" fill="#FFF"/><circle cx="61" cy="23" r="2.4" fill="#FFF"/>';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="94" rx="25" ry="5" fill="#B7CE92" opacity=".8"/>' +
    '<g' + (p.f ? ' transform="translate(100 0) scale(-1 1)"' : '') + '>' +
    '<path d="M32 76 v8 M44 80 v8 M58 80 v8 M70 76 v8" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="54" cy="60" r="27" fill="#CE6A57" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M54 33 v54" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="42" cy="50" r="4.2" fill="' + INK + '"/><circle cx="66" cy="50" r="4.2" fill="' + INK + '"/>' +
    '<circle cx="45" cy="72" r="3.4" fill="' + INK + '"/><circle cx="63" cy="72" r="3.4" fill="' + INK + '"/>' +
    '<circle cx="54" cy="24" r="12" fill="' + INK + '"/>' +
    '<path d="M46 13 q-3 -6 -8 -7 M62 13 q3 -6 8 -7" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    eye +
    '</g></svg>';
}
const ANIMAL_SVG = { bug: bugSvg, ladybug: ladySvg };

/* ---------- 叶子背景（低干扰，pointer-events:none）：大叶片铺满 + 中脉 + 侧脉 ---------- */
function leafSvg() {
  let s = '<svg viewBox="0 0 1000 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  s += '<path d="M4 300 C 150 118, 400 40, 620 52 C 820 62, 962 178, 996 300 C 962 422, 820 538, 620 548 C 400 560, 150 482, 4 300 Z" ' +
    'fill="#D9E8BC" stroke="#C5D8A2" stroke-width="5"/>';
  s += '<path d="M12 300 H 988" stroke="#CBDEAE" stroke-width="7" stroke-linecap="round"/>';
  const vein = (x, y, dx, dy) =>
    '<path d="M' + x + ' ' + y + ' q ' + dx + ' ' + dy + ' ' + (dx * 2.4) + ' ' + (dy * 1.9) + '" stroke="#CBDEAE" stroke-width="4.5" stroke-linecap="round" fill="none"/>';
  [[140, 292, -46, -52], [300, 288, -34, -50], [460, 284, -18, -46], [620, 282, 18, -46], [780, 288, 34, -50], [930, 294, 44, -52]]
    .forEach(v => { s += vein(v[0], v[1], v[2], v[3]); s += vein(v[0], 608 - v[1], v[2], -v[3]); });
  s += '</svg>';
  return s;
}
