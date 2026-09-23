/* ================= math 游戏数据（难度参数 / 章配置 / 语音文案 / 图标） ================= */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (flat/5)%4+1 循环四章）
   kind: apple=苹果点数辅助(章1-2) / line=0-20 数轴辅助(章3-4)
   title 供章末预告与 README 说明；tips=章末"明天"预告文案 ---------- */
const CHAPTERS = {
  1: { name: '五以内加减', kind: 'apple', hint: '明天：更大的数字（十以内）等着你' },
  2: { name: '十以内加减', kind: 'apple', hint: '明天：十几的大数字（不进位）哦' },
  3: { name: '二十以内不进位加减', kind: 'line', hint: '明天：进位大挑战来啦' },
  4: { name: '进位加 / 退位减 / 三数连加', kind: 'line', hint: '明天：新一轮算术冒险' }
};
const GEN_HINTS = ['明天：五以内小山坡再爬一次', '明天：十以内新题目', '明天：十几的大数字', '明天：进位大挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=待合成 clip 名，text=TTS 兜底；仅前 3 关播，sayP 包装） ---------- */
const VOICE = {
  watch: { key: 'mat_tut_watch', text: '看！算一算，点出答案' },
  turn:  { key: 'mat_tut_turn',  text: '你来算一算' },
  hint:  { key: 'mat_hint',      text: '数一数，再选答案' }
};

/* ---------- 山路站点（viewBox 0 0 100 62 百分比坐标；STOPS[k] = 第 k 题完成后到达） ---------- */
const STOPS = [
  { x: 6,  y: 55 },  // 起点（山脚）
  { x: 22, y: 47 },
  { x: 38, y: 39 },
  { x: 53, y: 30 },
  { x: 68, y: 21 },
  { x: 89, y: 9 }    // 山顶（星星）
];

/* ---------- 图标（全部内嵌 SVG，描边 2.5px 暖棕） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 34 L20 12 L32 34 Z" fill="#8FBF7F" stroke="#FFF" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M14 34 L24 18 L34 34 Z" fill="#E8975A" stroke="#FFF" stroke-width="2.5" stroke-linejoin="round" transform="translate(2,-2)"/>' +
    '<path d="M31 13 L32.2 16.2 35.4 17.4 32.2 18.6 31 21.8 29.8 18.6 26.6 17.4 29.8 16.2 Z" fill="#F2C94C"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 数一数按钮图标：三颗可数的小苹果 */
  count: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="16" cy="42" r="10" fill="#E86A5E" stroke="#FFF" stroke-width="2.5"/>' +
    '<circle cx="32" cy="42" r="10" fill="#E86A5E" stroke="#FFF" stroke-width="2.5"/>' +
    '<circle cx="48" cy="42" r="10" fill="#E86A5E" stroke="#FFF" stroke-width="2.5"/>' +
    '<path d="M32 26 Q31 20 26 19" stroke="#FFF" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="32" cy="42" r="3.4" fill="#FFF" opacity=".5"/></svg>',
  apple: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M32 14 Q30 8 24 7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M33 10 Q42 4 48 10 Q42 17 33 13 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M32 15 C18 8 8 20 12 36 C15 49 24 57 32 55 C40 57 49 49 52 36 C56 20 46 8 32 15 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="22" cy="26" rx="5" ry="8" fill="#FFF" opacity=".35" transform="rotate(-18 22 26)"/></svg>',
  star: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path class="st-star" d="M32 7 Q36 25 57 32 Q36 39 32 57 Q28 39 7 32 Q28 25 32 7 Z" stroke-linejoin="round"/></svg>'
};
