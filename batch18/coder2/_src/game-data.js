/* ================= coder2 游戏数据（章配置 / 语音文案 / 指令卡文案配色 / 图标）
   7-8 岁循环块编程（SPEC-BATCH18 §1）：每题=网格地图+小兔（含朝向）+胡萝卜目标+
   可选障碍格+指令卡池（前进/左转/右转/重复2次/重复3次）。点卡入底部程序序列，
   点序列内指令=退回；点「运行」逐格动画执行。
   指令词朗读=T46 阶段2 clip 化（cd2_i_* 5 键在册；读程序 queue 段链拼播）；
   中文句=cd2_ 预合成 clip（7 条，与 voice/clips/manifest.json 严格一致 §0.18）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   ch1 纯序列直角路径 / ch2 重复2次块 / ch3 重复3次块+障碍 / ch4 生成关方形之字形
   hint=章末预告文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '排一排', hint: '转弯和直走的小路' },
  2: { name: '循环试一试', hint: '一个循环块走两遍' },
  3: { name: '循环走三次', hint: '三次循环和小灌木' },
  4: { name: '循环找路', hint: '方方圈圈的循环挑战' }
};
const GEN_HINTS = ['直直的路再排一次', '循环块再走一次', '三次循环再来一次', '循环找路再来一次'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 manifest 严格一致 §0.18）
   run=点运行出发句 / wall=撞障碍或出界专属句（比 wrong 更具体的失败原因） ---------- */
const VOICE = {
  watch: { key: 'cd2_tut_watch', text: '看！排好指令走一走' },
  turn:  { key: 'cd2_tut_turn',  text: '你来排一排' },
  hint:  { key: 'cd2_hint',      text: '想一想小兔怎么走' },
  right: { key: 'cd2_right',     text: '到达啦，真厉害' },
  wrong: { key: 'cd2_wrong',     text: '再看看路线改一改' },
  run:   { key: 'cd2_run',       text: '出发喽' },
  wall:  { key: 'cd2_wall',      text: '前面走不通啦' }
};

/* ---------- 指令卡文案（指令词朗读=T46 阶段2 clip 化 2026-09-19：cd2_i_<t> 5 键全在册，
   原文与 INSTR_TEXT 一字一致；单卡 play / 读程序 queue 段链拼播——Mj-1 零 keyless 段） ---------- */
const INSTR_TEXT = {
  f: '前进', l: '左转', r: '右转',
  rep2: '重复两次', rep3: '重复三次'
};

/* ---------- 指令卡配色（暖色积木卡五色轮换，确定性按序；rep 块用循环青蓝区分） ---------- */
const CARD_PALETTE = { f: '#F6E3C5', l: '#D8EDDF', r: '#D6E4F0', rep2: '#DDEAF2', rep3: '#E4E0F2' };

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  /* logo：指令卡三连+胡萝卜 */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3" y="10" width="14" height="14" rx="3" fill="#F6E3C5" stroke="#4A3B2E" stroke-width="2"/>' +
    '<rect x="15" y="16" width="14" height="14" rx="3" fill="#D8EDDF" stroke="#4A3B2E" stroke-width="2"/>' +
    '<rect x="27" y="8" width="14" height="14" rx="3" fill="#D6E4F0" stroke="#4A3B2E" stroke-width="2"/>' +
    '<path d="M32 22 l3.5 9 l3.5 -9 Z" transform="rotate(180 35 26.5)" fill="#E8975A" stroke="#4A3B2E" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M33 21 q2 -3.5 4 0" stroke="#8FBF7F" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  /* 胡萝卜目标：橙锥+绿缨 */
  carrot: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M18 16 L34 30 L28 36 L12 22 Z" fill="#F0975A" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M18 20 L26 28 M22 17 L28 23" stroke="#FFF9EE" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M16 14 q-6 -6 -9 -1 q4 -2 7 2 M19 13 q-1 -8 5 -8 q-4 3 -2 8 M22 14 q6 -6 9 -1 q-5 -1 -6 4" stroke="#8FBF7F" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  /* 障碍灌木 */
  bush: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="24" cy="30" rx="16" ry="11" fill="#9CC288" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<ellipse cx="14" cy="26" rx="8" ry="7" fill="#9CC288" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<ellipse cx="34" cy="26" rx="8" ry="7" fill="#9CC288" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<circle cx="19" cy="27" r="1.6" fill="#4A3B2E"/><circle cx="29" cy="29" r="1.6" fill="#4A3B2E"/>' +
    '<path d="M12 36 q12 4 24 0" stroke="#4A3B2E" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/></svg>',
  /* 前进：上箭头（配文字） */
  fwd: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 8 L38 24 h-8 v14 h-12 v-14 h-8 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6" stroke-linejoin="round"/></svg>',
  /* 左转：逆时针弯箭头 */
  tl: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M34 40 V26 a10 10 0 0 0 -10 -10 H12" stroke="#FFF9EE" stroke-width="5.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M14 8 L8 16 L14 24 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  /* 右转：顺时针弯箭头 */
  tr: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 40 V26 a10 10 0 0 1 10 -10 H36" stroke="#FFF9EE" stroke-width="5.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M34 8 L40 16 L34 24 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  /* 循环块：回环箭头（数字由文案标注） */
  loop: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M36 24 a12 12 0 1 1 -5 -9.8" stroke="#FFF9EE" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 6 L33 12 L25 17 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="24" r="3.2" fill="#FFF9EE"/></svg>',
  /* 运行按钮播放三角 */
  play: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M20 12 L52 32 L20 52 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/></svg>',
  speaker: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M10 24 h10 l13 -11 v38 l-13 -11 h-10 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M41 22 q6 10 0 20 M49 15 q11 17 0 34" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  speakerSmall: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
/* 指令卡图标取用（pool 卡与程序槽共用） */
const instrIcon = t =>
  t === 'f' ? ICONS.fwd : t === 'l' ? ICONS.tl : t === 'r' ? ICONS.tr :
  t === 'rep2' ? ICONS.loop : ICONS.loop;
