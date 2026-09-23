/* ================= gomoku4 游戏数据（章配置 / 语音文案 / 棋子与图标 SVG）
   SPEC-BATCH19 §2 定稿：
   ch1 4×4 玩家先手（AI block 仅堵不攻——几乎必胜建立信心）
   ch2 5×5 玩家先手（AI full 会一步制胜+造双威胁）
   ch3 5×5 AI 先手（full；玩家防守反击）
   ch4 生成关 5×5 交替先手（局 0/2/4 玩家先、1/3 AI 先）+ AI mid（会赢不造双威胁）
   语音 9 条 = core 3（core 模板自带）+ gk_ 6（本文件 VOICE，与 voice/clips/manifest.json 严格一致 §0.18）
   AI 假思考 AI_THINK_MIN..+SPAN（600-1200ms，seeded 确定性；verify 页统一乘 SPEED 提速） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环） ---------- */
const CHAPTERS = {
  1: { name: '连四入门（4×4）', hint: '5×5 大棋盘来啦' },
  2: { name: '大棋盘（5×5）', hint: '这次兔子先下棋' },
  3: { name: '后手挑战', hint: '交替先手终极对决' },
  4: { name: '终极对决（交替先手）', hint: '新一轮四子棋对决' }
};
const GEN_HINTS = ['4×4 再连一次', '5×5 先手局', '兔子先手局', '交替先手终极局'];
const CH_LEN = 5;          // 5 局 = 1 关（胜/平过题；负=零惩罚重下不推进）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* AI 假思考时长（真实 ms，SPEC 任务指示 600-1200）：具体值=MIN+seeded*SPAN */
const AI_THINK_MIN = 600, AI_THINK_SPAN = 600;

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 manifest 严格一致 §0.18）
   gomoku4 无题面拼接与 wrong clip：负局播报=gk_lose（走 sayW 三态口径） ---------- */
const VOICE = {
  watch: { key: 'gk_tut_watch', text: '看！连成四个子' },
  turn:  { key: 'gk_tut_turn',  text: '你来下一局' },
  hint:  { key: 'gk_hint',      text: '想想哪里能连四个' },
  right: { key: 'gk_right',     text: '四个连上啦，你赢了' },
  lose:  { key: 'gk_lose',      text: '兔子赢啦，再来一局' },
  draw:  { key: 'gk_draw',      text: '平局，再来一局' }
};

/* ---------- 教学 watch 演示棋谱（4×4 第一行连四，SPEC §2 演示连四取胜） ---------- */
const DEMO_LINE = [0, 1, 2, 3];

/* ---------- 棋子 SVG：孩子=胡萝卜橙子（顶叶缨），兔子=蓝灰子（顶兔耳） ---------- */
function stoneSvg(who, size) {
  const s = size || 64;
  if (who === 1) {                                     /* 胡萝卜棋子 */
    return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M27 15 q2 -9 6 -11 M33 15 q-1 -8 3 -12 M37 16 q4 -6 9 -7" stroke="#5E9455" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="32" cy="38" r="21" fill="#F08A3C" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="24" cy="30" r="5.5" fill="rgba(255,255,255,.5)"/>' +
      '<path d="M28 44 q2 3 4 0 q2 3 4 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="25" cy="37" r="2.2" fill="' + INK + '"/><circle cx="39" cy="37" r="2.2" fill="' + INK + '"/></svg>';
  }
  /* 兔子棋子 */
  return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="24" cy="12" rx="5.5" ry="10" fill="#B7C2CE" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-10 24 12)"/>' +
    '<ellipse cx="40" cy="11" rx="5.5" ry="10.5" fill="#B7C2CE" stroke="' + INK + '" stroke-width="2.6" transform="rotate(11 40 11)"/>' +
    '<circle cx="32" cy="40" r="20" fill="#C7D2DD" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="25" cy="37" r="4.6" fill="#8FA2B5"/>' +
    '<circle cx="39" cy="37" r="4.6" fill="#8FA2B5"/>' +
    '<circle cx="25.5" cy="36" r="1.6" fill="#FFF"/><circle cx="39.5" cy="36" r="1.6" fill="#FFF"/>' +
    '<path d="M29 45 q1.5 2.5 3 0 q1.5 2.5 3 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
}

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3" y="8" width="38" height="28" rx="8" fill="#F3E2C4" stroke="#FFF" stroke-width="2.2"/>' +
    '<circle cx="13" cy="22" r="5" fill="#F08A3C"/><circle cx="22" cy="22" r="5" fill="#F08A3C"/>' +
    '<circle cx="31" cy="22" r="5" fill="#F08A3C"/><circle cx="35" cy="13" r="2.6" fill="#E8873A"/>' +
    '<path d="M8 33 h28" stroke="#D9C5A6" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 3"/></svg>',
  turnMe: '<svg viewBox="0 0 40 40" width="30" height="30" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="20" cy="22" r="13" fill="#F08A3C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M16 8 q1.5 -6 4 -7 M23 8 q-1 -5 2 -8" stroke="#5E9455" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="15.5" cy="21" r="3.4" fill="rgba(255,255,255,.55)"/></svg>',
  turnFoe: '<svg viewBox="0 0 40 40" width="30" height="30" xmlns="http://www.w3.org/2000/svg">' +
    '<ellipse cx="14" cy="9" rx="3.6" ry="6.5" fill="#B7C2CE" stroke="' + INK + '" stroke-width="2"/>' +
    '<ellipse cx="26" cy="8.5" rx="3.6" ry="6.8" fill="#B7C2CE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="20" cy="25" r="12" fill="#C7D2DD" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="16" cy="23" r="2.8" fill="#8FA2B5"/><circle cx="24" cy="23" r="2.8" fill="#8FA2B5"/></svg>',
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
