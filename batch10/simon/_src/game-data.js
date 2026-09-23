/* ================= simon 听指令游戏数据（章规格 / 语音文案 / 鼓面参数 / HUD 文案）
   语音文案与 voice/clips/manifest.json 的 si_* 四条严格一致（§0.18 零手抄，build 注入）：
   si_tut_watch'看！小兔子敲小鼓啦'/si_tut_turn'你来敲一敲'/
   si_hint'听一听，跟着敲一敲'/si_replay'再看一遍哦'（错键重播时播）
   wrong 无 clip → 动态文案 TTS 兜底（§0.13） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章规格（SPEC-BATCH10 §2）：序列长 / watch 每键间隔 ms
   章 1 长 2 / 章 2 长 3 / 章 3 长 4（均 500ms）→ 章 4 长 2-4 混合 + 提速 380ms */
const SPECS = {
  1: { len: 2, speed: 500 },
  2: { len: 3, speed: 500 },
  3: { len: 4, speed: 500 },
  4: { len: 0, speed: 380 }        // len 0 = 2-4 混合（每题随机长度）
};
/* 生成关（flat≥20）速度档：随机长度 + 随机速度 */
const GEN_SPEEDS = [380, 440, 500];

/* ---------- 章配置（hint=预告"下一章"文案；GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  1: { name: '敲两下', hint: '接下来要敲三下啦，听仔细哦' },
  2: { name: '敲三下', hint: '接下来要敲四下，更长的鼓点' },
  3: { name: '敲四下', hint: '接下来长短混合，还会敲得更快' },
  4: { name: '混合快敲', hint: '新一轮听指令敲小鼓挑战' }
};
const GEN_HINTS = ['更长的鼓点新挑战', '敲得更快的新一轮', '超强听记大考验', '敲小鼓的新一轮'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- HUD 两态文案（§2 两态机制：watch=看小兔子敲 / input=跟着敲） */
const TIP_WATCH = '看小兔子敲小鼓';
const TIP_INPUT = '跟着敲一敲';

/* ---------- 语音文案（key+text 与 manifest 严格一致，禁自造） */
const VOICE = {
  watch:  { key: 'si_tut_watch', text: '看！小兔子敲小鼓啦' },
  turn:   { key: 'si_tut_turn',  text: '你来敲一敲' },
  hint:   { key: 'si_hint',      text: '听一听，跟着敲一敲' },
  replay: { key: 'si_replay',    text: '再看一遍哦' },      /* 错键从头重播时播（§2） */
  wrong:  { key: 'si_wrong',     text: '' }                 /* 动态纠错，见 wrongText（无 clip 走 TTS 兜底） */
};
const wrongText = () => '敲错啦，再看一遍，跟着敲';

/* ---------- 四面小鼓（红黄绿蓝，§2）：各配一种音符音高（Web Audio 合成，大调琶音 C-E-G-C） */
const PADS = [
  { name: '红鼓', freq: 261.63 },
  { name: '黄鼓', freq: 329.63 },
  { name: '绿鼓', freq: 392.00 },
  { name: '蓝鼓', freq: 523.25 }
];

/* ---------- 图标（内嵌 SVG，暖棕描线；鼓面配色在 head.html CSS） */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="22" cy="15" rx="14" ry="5.5" fill="#F7D24E" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M8 15 v12 a14 5.5 0 0 0 28 0 v-12" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M13 35 L9 41 M31 35 L35 41" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M13 7 L26 13 M31 5 L20 11" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/>' +
    '</svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
