/* ================= clock 游戏数据（章配置 / 语音文案 / 图标） ================= */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (flat/5)%4+1 循环四章取材）
   name 供章末预告与 README；hint=章末"明天"预告文案 ---------- */
const CHAPTERS = {
  1: { name: '认整点和半点',   hint: '认识五分钟的小刻度哦' },
  2: { name: '认五分钟刻度',   hint: '自己动手拨长针哦' },
  3: { name: '我来拨长针',     hint: '算一算过了多久' },
  4: { name: '过了多久',       hint: '新一轮时间小管家挑战' }
};
const GEN_HINTS = ['新的整点半点挑战', '新的五分钟刻度', '再拨一拨长针', '再算一算经过时间'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=待合成 clip 名，text=TTS 兜底；仅前 3 关播，sayP 包装） ---------- */
const VOICE = {
  watch: { key: 'clk_tut_watch', text: '看！读一读钟面上的时间' },
  turn:  { key: 'clk_tut_turn',  text: '你来点一点' },
  hint:  { key: 'clk_hint',      text: '看看长针指在哪里' }
};

/* ---------- 图标（全部内嵌 SVG，描边 2.5px 暖棕） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="22" cy="23" r="17" fill="#FFF9EE" stroke="#FFF" stroke-width="3"/>' +
    '<path d="M22 13 V23 L29 27" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M35 8 L38 5 M40 12 L44 11 M9 8 L6 5 M5 12 L1 11" stroke="#F2C94C" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="22" cy="23" r="2.6" fill="#E8975A"/></svg>',
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
  /* 拨针提示：环形箭头（章 3 prompt 用） */
  dial: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 32 a18 18 0 1 1 -6 -13.4" stroke="#E8975A" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M38 10 L46 20 L31 23 Z" fill="#E8975A"/>' +
    '<circle cx="32" cy="33" r="3.4" fill="#4A3B2E"/>' +
    '<path d="M32 33 L32 20 M32 33 L41 38" stroke="#4A3B2E" stroke-width="4" stroke-linecap="round"/></svg>',
  /* 经过时间：两个小钟 + 箭头（章 4 prompt 用） */
  elapsed: '<svg viewBox="0 0 96 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="18" cy="26" r="14" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M18 26 V17 M18 26 L24 29" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M36 26 H56 M52 20 L60 26 L52 32" stroke="#E8975A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<circle cx="78" cy="26" r="14" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M78 26 V17 M78 26 L84 29" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/></svg>'
};
