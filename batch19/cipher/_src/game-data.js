/* ================= cipher 密码破译 游戏数据（章配置 / 语音文案 / 符号库 / 词库 / 图标）
   7-8 岁映射表解码（SPEC-BATCH19 §1）：每题=密码表（4-6 对「符号↔数字或字」，符号 SVG
   自绘）+密文序列（3-5 符号）+候选答案卡池。孩子查表逐符解码，点卡按序填入密文下方
   解码槽（点已填槽=退回），拼满自动判定。对=celebrate+下一题；错=晃动零惩罚可重选。
   ch3 缺表推理：表缺 1-2 对（行显示 ?），题面附「破译好的情报」例卡——同符号同像，
   由例推缺（歧义=该题非法 §0.40）。
   T46 阶段2（2026-09-19）：符号名/数字词/字/密码对全部 clip 化（ci_v_d1-9/ci_v_<字>12/
   ci_sym_*10/ci_repr/ci_look1-2，34 条）；中文句=ci_ 预合成 5+34 条
   （与 voice/clips/manifest.json 严格一致 §0.18）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   ch1 符号→数字 / ch2 符号→字拼词 / ch3 缺表推理 / ch4 生成关（5-6 对+4-5 符）
   hint=章末预告文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '数字密码', hint: '符号变成数字' },
  2: { name: '字词密码', hint: '符号拼成词语' },
  3: { name: '缺角密码', hint: '密码表缺了一角' },
  4: { name: '破译高手', hint: '更长更密的密码' }
};
const GEN_HINTS = ['数字密码再破一次', '字词密码再破一次', '缺角密码再破一次', '破译高手再来一次'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 manifest 严格一致 §0.18） ---------- */
const VOICE = {
  watch: { key: 'ci_tut_watch', text: '看！破译小密码' },
  turn:  { key: 'ci_tut_turn',  text: '你来破一破' },
  hint:  { key: 'ci_hint',      text: '查查密码表' },
  right: { key: 'ci_right',     text: '破译成功，真聪明' },
  wrong: { key: 'ci_wrong',     text: '再对对密码表' }
};

/* ---------- 符号库（10 个封闭，SVG 自绘家族暖色简笔；name=TTS 朗读名） ---------- */
const SYMS = {
  star: { name: '星星', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 5 L28.6 17.2 L41.5 18.2 L31.6 26.8 L34.7 39.2 L24 32.6 L13.3 39.2 L16.4 26.8 L6.5 18.2 L19.4 17.2 Z" ' +
    'fill="#F6C55A" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/></svg>' },
  moon: { name: '月亮', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M30 5 A19 19 0 1 0 30 43 A15 15 0 1 1 30 5 Z" fill="#F6E3A8" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="21" cy="18" r="2" fill="#4A3B2E" opacity=".25"/><circle cx="18" cy="28" r="1.5" fill="#4A3B2E" opacity=".2"/></svg>' },
  sun: { name: '太阳', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="24" cy="24" r="9.5" fill="#F0975A" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<g stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round">' +
    '<path d="M24 4 v5 M24 39 v5 M4 24 h5 M39 24 h5 M9.9 9.9 l3.5 3.5 M34.6 34.6 l3.5 3.5 M38.1 9.9 l-3.5 3.5 M13.4 34.6 l-3.5 3.5"/></g></svg>' },
  cloud: { name: '白云', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="16" cy="29" rx="9" ry="7" fill="#EEF3F8" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<ellipse cx="27" cy="22" rx="11" ry="8.5" fill="#EEF3F8" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<ellipse cx="36" cy="29" rx="8" ry="6.5" fill="#EEF3F8" stroke="#4A3B2E" stroke-width="2.4"/></svg>' },
  flower: { name: '花朵', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<g fill="#F2B8C6" stroke="#4A3B2E" stroke-width="2.2">' +
    '<circle cx="24" cy="11" r="6.5"/><circle cx="35.2" cy="19.2" r="6.5"/><circle cx="31" cy="32.5" r="6.5"/>' +
    '<circle cx="17" cy="32.5" r="6.5"/><circle cx="12.8" cy="19.2" r="6.5"/></g>' +
    '<circle cx="24" cy="23.5" r="6" fill="#F6C55A" stroke="#4A3B2E" stroke-width="2.4"/></svg>' },
  raindrop: { name: '雨滴', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 5 Q34.5 20 34.5 28.5 a10.5 10.5 0 0 1 -21 0 Q13.5 20 24 5 Z" fill="#A8CBE8" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M19 28 a5.5 5.5 0 0 0 3.5 5" stroke="#FFF9EE" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>' },
  rainbow: { name: '彩虹', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M7 38 a17 17 0 0 1 34 0" stroke="#E8975A" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M12.6 38 a11.4 11.4 0 0 1 22.8 0" stroke="#9CC288" stroke-width="4.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M18 38 a6 6 0 0 1 12 0" stroke="#A8CBE8" stroke-width="4.2" fill="none" stroke-linecap="round"/></svg>' },
  mountain: { name: '大山', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M5 39 L18 15 L25 26.5 L30.5 18 L43 39 Z" fill="#9CB89C" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M18 15 L21.4 20.7 L16.6 22.6 L14.6 19 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M30.5 18 L33 22 L28.4 23.4 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="1.6" stroke-linejoin="round"/></svg>' },
  tree: { name: '大树', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="21" y="27" width="6" height="14" rx="2.2" fill="#B08968" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<circle cx="24" cy="19" r="11.5" fill="#9CC288" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<circle cx="19.5" cy="16.5" r="1.6" fill="#4A3B2E"/><circle cx="28" cy="21" r="1.6" fill="#4A3B2E"/></svg>' },
  fish: { name: '小鱼', svg: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M34 26 L43 19 L40.8 26 L43 33 Z" fill="#A8CBE8" stroke="#4A3B2E" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<ellipse cx="21" cy="26" rx="13.5" ry="8.8" fill="#A8CBE8" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<circle cx="14.5" cy="23.5" r="1.9" fill="#4A3B2E"/><path d="M21 17.2 q2.8 3.4 0 8.8" stroke="#4A3B2E" stroke-width="1.8" fill="none" opacity=".4"/></svg>' }
};
const SYM_IDS = Object.keys(SYMS);

/* ---------- 词库（ch2/ch4 字域；词内字互异保证双射可行——「星星」类同字词不入库） ---------- */
const WORDS = ['太阳', '月亮', '白云', '花朵', '雨滴', '彩虹', '大山', '大树', '小鱼', '白马', '火山', '木头'];

/* ---------- 通用图标（全部内嵌 SVG） ---------- */
const ICONS = {
  /* logo：放大镜里一颗星（破译主题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="19" cy="19" r="12" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M19 11.5 L21 16.4 L26.2 16.8 L22.2 20.2 L23.4 25.3 L19 22.6 L14.6 25.3 L15.8 20.2 L11.8 16.8 L17 16.4 Z" fill="#F6C55A" stroke="#4A3B2E" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M28.5 28.5 L36 36" stroke="#4A3B2E" stroke-width="4" stroke-linecap="round"/></svg>',
  /* 情报卡角标：小信封 */
  intel: '<svg viewBox="0 0 48 48" width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="8" y="12" width="32" height="24" rx="4" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M9 14.5 L24 27 L39 14.5" stroke="#4A3B2E" stroke-width="2.4" fill="none" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  speakerSmall: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  check: '<svg viewBox="0 0 64 64" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 34 L27 46 L50 18" stroke="#8FBF7F" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
