/* ================= compare 游戏数据（章配置 / 语音文案 / 图标 / 物品与符号 SVG）
   物品 SVG：苹果/橙子/梨/草莓四种（左右组各取一种，永不相同——相等题也数不同物，
   强迫逐个点数而非形状模板匹配）；姿态微随机（±8° 旋转 / ±6% 尺寸抖动）
   符号按钮：卡通大嘴画法（双描边 V 型嘴 + 眼睛），开口朝多的一边 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (flat/5-1)%4+1 循环四章取材）
   r29 难度谱（SPEC-R29-COMPARE §R2，2026-09-21；与旧 SPEC-BATCH6 §2 冲突处以 R29 为准）：
   dch1 8 以内实物差 1-3 + = 每关恒 1（= 进 ch1：课标 >、<、= 同节课教）/
   dch2 10 以内全数字卡差 1-3（审计建议①：ch2 起全数字卡——抽象化上探）/
   dch3 10 以内数字卡差 1 近邻 + tri 三数比大小每关 2（窄跨度 2-4，审计建议②）/
   dch4 20 以内三模式混合（count 边 ≤12 可点数）+ near 最接近 N 每关 1（近对压迫，审计建议③）
   hint=章末"明天"预告文案（GEN 文案不带"明天："前缀，core 模板自带）；
   r29 ch1/ch2 hint 随谱更新（= 已进 ch1、数字卡已进 ch2，旧预告失准） */
const CHAPTERS = {
  1: { name: '谁多谁少', hint: '数字卡来帮忙，直接比大小' },
  2: { name: '差一点点', hint: '三张卡片一起比大小' },
  3: { name: '数字卡片', hint: '更大的数也比一比' },
  4: { name: '大数挑战', hint: '新一轮比一比挑战' }
};
const GEN_HINTS = ['新的比一比挑战', '更大更近的数来啦', '数字卡和实物混着比', '20 以内大数挑战'];

const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
const KINDS = ['apple', 'orange', 'pear', 'berry'];  // 左右各取一种且互异
const SYMS = ['>', '<', '='];                          // 三个符号按钮
/* 符号语义：朗读文案（text=TTS 兜底）；T46 阶段2 起三句均有专属 clip（cmp_sem_*） */
const SEM_TEXT = { '>': '左边多', '<': '右边多', '=': '一样多' };
const SEM_KEY = { '>': 'cmp_sem_gt', '<': 'cmp_sem_lt', '=': 'cmp_sem_eq' };   /* 语义句 clip（T46） */
const SYM_LABEL = { '>': '左边多', '<': '右边多', '=': '一样多' };   // 按钮下小标（6-7 岁识字量内）

/* ---------- r29 三卡题面（tri 三数比大小 / near 最接近 N，SPEC-R29 §R1/§R10）
   题面 chip 文案 + 语音拼句键（queue 段：题面/答对反馈，段键 cmp_n_* 已注册；
   cmp_tri_* 与 cmp_near_* 5 键已由主线 gen_clips 注册并注入 clips（manifest 5103，
   2026-09-21）——§R10 注册前过渡态已关闭，拼句全段有 clip） */
const CHIP_TRI = { max: '哪张卡片数最大？', min: '哪张卡片数最小？' };   // 三卡题面大字
const TRI_ASK = { key: 'cmp_tri_ask', text: '哪张卡片' };               // 题面拼句首段
const TRI_KEY = {                                                        // 题面/答对拼句末段（max/min 两用）
  max: { key: 'cmp_tri_max', text: '最大' },
  min: { key: 'cmp_tri_min', text: '最小' }
};
const NEAR_ASK = { key: 'cmp_near_ask', text: '哪个数最接近' };         // near 题面 [ask, cmp_n_N]
const NEAR_OK = { key: 'cmp_near_ok', text: '最接近' };                 // near 答对 [cmp_n_X, ok, cmp_n_N]

/* ---------- 语音文案（key=已合成 clip 名，text=TTS 兜底；仅前 3 关播 sayP，救援走 sayR）
   cmp_tut_watch / cmp_tut_turn / cmp_hint 三条 clip 已在 voice/clips/ 就位（build 自动注入） */
const VOICE = {
  watch: { key: 'cmp_tut_watch', text: '看！哪一边多' },
  turn:  { key: 'cmp_tut_turn',  text: '你来比一比' },
  hint:  { key: 'cmp_hint',      text: '数一数，比一比' },
  rec:   { key: 'cmp_rec',       text: '好，我们重新数一数' },   /* 反方审查 m5：原复用 cmp_hint key 致 text 死文案——补专属 clip */
  wrong: { key: 'cmp_wrong',     text: '不对哦，再数一数' }   /* 6 岁试玩共性 P1：纠错轻语音（flat<3 每错必播 / flat≥3 10s 节流） */
};

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="8" width="13" height="28" rx="6" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<rect x="26" y="4" width="13" height="36" rx="6" fill="#F7CE55" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M22 22 L28 16 M22 22 L28 28" stroke="#E8975A" stroke-width="3.6" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  recount: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M48 28 a18 18 0 1 0 -2 15" stroke="#E8975A" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M50 10 L50 28 L32 26 Z" fill="#E8975A" stroke="#E8975A" stroke-width="2" stroke-linejoin="round"/>' +
    '<text x="32" y="42" font-size="22" font-weight="800" text-anchor="middle" fill="#4A3B2E" font-family="inherit">1</text></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 题面 chip 用：天平小图标（比较语义） */
  scale: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 8 V38 M10 38 H38" stroke="#4A3B2E" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M24 10 L38 16 M24 10 L10 16" stroke="#4A3B2E" stroke-width="2.8" stroke-linecap="round"/>' +
    '<path d="M4 16 h12 l-6 10 Z M32 16 h12 l-6 10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="8" r="3.4" fill="#F5C445" stroke="#4A3B2E" stroke-width="2.2"/></svg>'
};

/* ---------- 卡通大嘴符号（viewBox 0 0 72 60）：双描边 V 型嘴 + 眼睛
   '>' 尖端朝右、开口朝左（开口朝大数"张大嘴吃多的"）；'<' 镜像；'=' 双横杠小眼睛 */
function symSvg(s) {
  if (s === '=') {
    return '<svg viewBox="0 0 72 60" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
      '<path d="M16 20 H56 M16 40 H56" stroke="#4A3B2E" stroke-width="15" stroke-linecap="round"/>' +
      '<path d="M16 20 H56 M16 40 H56" stroke="#E8975A" stroke-width="8.5" stroke-linecap="round"/>' +
      '<circle cx="26" cy="8" r="2.8" fill="#4A3B2E"/><circle cx="46" cy="8" r="2.8" fill="#4A3B2E"/></svg>';
  }
  const mirror = s === '<' ? ' transform="translate(72 0) scale(-1 1)"' : '';
  return '<svg viewBox="0 0 72 60" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g' + mirror + '>' +
    '<path d="M17 10 L57 30 L17 50" stroke="#4A3B2E" stroke-width="15" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M17 10 L57 30 L17 50" stroke="#E8975A" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<circle cx="50" cy="13" r="3" fill="#4A3B2E"/>' +
    '</g></svg>';
}

/* ---------- 物品 SVG（viewBox 0 0 100 100，含阴影脚下椭圆；p={r:旋转,s:缩放}） ---------- */
function appleSvg(p) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="92" rx="26" ry="5" fill="#E5D5BC" opacity=".7"/>' +
    '<g transform="rotate(' + (p.r || 0) + ' 50 55)">' +
    '<path d="M50 34 q-2 -12 6 -18" stroke="#8A6B4A" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M52 22 q10 -8 16 -2 q-4 10 -16 6 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M50 36 q-17 -9 -26 4 q-8 14 3 30 q10 15 23 14 q13 1 23 -14 q11 -16 3 -30 q-9 -13 -26 -4 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M34 48 q-6 6 -6 14" stroke="#FFF" stroke-width="4" opacity=".55" fill="none" stroke-linecap="round"/>' +
    '</g></svg>';
}
function orangeSvg(p) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="92" rx="26" ry="5" fill="#E5D5BC" opacity=".7"/>' +
    '<g transform="rotate(' + (p.r || 0) + ' 50 55)">' +
    '<circle cx="50" cy="58" r="30" fill="#F0A24E" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M50 28 q-1 -10 7 -14" stroke="#8A6B4A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M54 20 q11 -7 17 0 q-5 10 -17 5 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="58" r="3" fill="#D88A3A"/>' +
    '<path d="M35 46 q-5 5 -6 12" stroke="#FFF" stroke-width="4" opacity=".5" fill="none" stroke-linecap="round"/>' +
    '</g></svg>';
}
function pearSvg(p) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="92" rx="25" ry="5" fill="#E5D5BC" opacity=".7"/>' +
    '<g transform="rotate(' + (p.r || 0) + ' 50 55)">' +
    '<path d="M50 30 q-3 -11 5 -16" stroke="#8A6B4A" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M53 19 q10 -8 16 -1 q-4 10 -16 5 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M50 34 a12 12 0 0 1 10 6 q14 6 12 24 q-2 22 -22 24 q-20 -2 -22 -24 q-2 -18 12 -24 a12 12 0 0 1 10 -6 Z" fill="#D9C96A" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M36 62 q-4 7 -2 14" stroke="#FFF" stroke-width="4" opacity=".55" fill="none" stroke-linecap="round"/>' +
    '</g></svg>';
}
function berrySvg(p) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="93" rx="24" ry="5" fill="#E5D5BC" opacity=".7"/>' +
    '<g transform="rotate(' + (p.r || 0) + ' 50 55)">' +
    '<path d="M50 82 q-25 -4 -26 -28 q0 -22 26 -26 q26 4 26 26 q-1 24 -26 28 Z" fill="#E2707C" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M30 30 q-8 -8 -4 -14 q7 -2 12 8 M50 26 q0 -12 6 -14 q6 4 2 15 M70 30 q9 -8 5 -14 q-7 -2 -12 8" stroke="#8FBF7F" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M34 46 l3 5 M48 44 l2 6 M62 48 l3 5 M40 62 l3 5 M56 64 l2 5" stroke="#F5C9A0" stroke-width="3" stroke-linecap="round"/>' +
    '</g></svg>';
}
const ITEM_SVG = { apple: appleSvg, orange: orangeSvg, pear: pearSvg, berry: berrySvg };
