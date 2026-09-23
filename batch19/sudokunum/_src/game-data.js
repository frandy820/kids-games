/* ================= sudokunum 数独数字版 游戏数据（章配置 / 语音文案 / SVG 图标 / 完整解模板）
   玩法（SPEC-BATCH19 §3）：每题=6×6 盘（2×3 宫），部分格预填，空 6-14 格。
   点空格→底部数字卡 1-6 填入；行/列/宫 1-6 不重复。填错=格子摇头+零惩罚可改
   （点自己填的格=清除）。全盘填对=celebrate+下一题。四章：ch1 6-8 空（行/列
   直接排除可解）/ch2 9-11 空（列+宫联合）/ch3 12-14 空（宫排除必用+唯一候选链）/
   ch4 生成关（12-14 空随机验证唯一解）。
   §0.42 可解真值：每题恰一解——game-core 挖洞每步验唯一解成立；game-verify 另带
   独立约束回溯求解器分源复算（禁复用游戏侧求解/校验）。
   语音与 voice/clips/manifest.json games:['sudokunum'] 8 条严格一致（core 3+sn_ 5），
   禁改 key/text；数词走 TTS 兜底（sn_n_ 不建，§3）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族 DESIGN-SPEC）

/* ---------- 章配置（章号 1 基；hint=章末预告下一章文案，GEN 文案不带"明天："前缀） ---------- */
const CHAPTERS = {
  1: { name: '行和列', hint: '看看每行每列，少了哪个数字' },
  2: { name: '小方格', hint: '行、列和小方格都不能重复哦' },
  3: { name: '方块帮忙', hint: '六格小方块也会告诉你答案' },
  4: { name: '数独高手', hint: '新一轮数独数字版' }
};
const GEN_HINTS = ['新的数独盘来啦', '行列方块一起看', '用小方块找答案', '当个数独小高手'];
const CH_LEN = 5;          // 5 题（盘）= 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章；flat≥20 生成关（ch4 规格）

/* ---------- 章空格规格：ch1 6-8 / ch2 9-11 / ch3 12-14 / 生成关 12-14（§0.42）
   chain=挖洞每步须维持的可解链（'rowcol'=行/列裸单 / 'full'=行/列/宫裸单 / null=仅唯一解）
   mustbox=最终态要求纯行/列链不可全解（宫排除必用，ch3） ---------- */
const HOLE_SPEC = {
  1: { lo: 6, hi: 8, chain: 'rowcol', mustbox: false },
  2: { lo: 9, hi: 11, chain: 'full', mustbox: false },
  3: { lo: 12, hi: 14, chain: 'full', mustbox: true },
  4: { lo: 12, hi: 14, chain: null, mustbox: false }
};

/* ---------- 语音文案（与 manifest games:['sudokunum'] 条目严格一致，禁改 key/text） ---------- */
const VOICE = {
  watch:  { key: 'sn_tut_watch', text: '看！每行每列不重复' },
  turn:   { key: 'sn_tut_turn',  text: '你来填一填' },
  hint:   { key: 'sn_hint',      text: '看看这一行少了谁' },   /* 兔子/空白/救援共用 */
  right:  { key: 'sn_right',     text: '全部填对啦' },          /* 全盘完成确认句 */
  wrong:  { key: 'sn_wrong',     text: '这个数字不对哦' }       /* sayW 纠错轻语音（flat≥3 10s 节流） */
};

/* ---------- 图标（内嵌 SVG，描线风，无 <text> 防 SVG 尺寸漂移） ---------- */
const ICONS = {
  /* logo：2×2 宫格+四色点（数独点题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="5" width="16" height="16" rx="4.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="23" y="5" width="16" height="16" rx="4.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="5" y="23" width="16" height="16" rx="4.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<rect x="23" y="23" width="16" height="16" rx="4.5" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5"/>' +
    '<circle cx="13" cy="13" r="4.5" fill="#E8975A"/><circle cx="31" cy="31" r="4.5" fill="#8FBF7F"/>' +
    '<circle cx="31" cy="13" r="4.5" fill="#6B8CB8"/><circle cx="13" cy="31" r="4.5" fill="#F2C03D"/></svg>',
  /* 提示条：小放大镜（找缺的数字） */
  lens: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="27" cy="27" r="14" fill="#FDEBD2" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M25 27 h4 M27 25 v4" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M37.5 37.5 L50 50" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  /* 全盘完成打勾角标（盘框转绿视觉） */
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="28" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M19 33 l9 9 l17 -19" stroke="#FFF9EE" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};

/* ---------- 6×6 基础完整解模板（写死；值 1-6 行优先展开，2×3 宫）
   全部人工验证：每行/列/宫恰为 1-6 的排列（verify 侧另独立复算） ---------- */
const TEMPLATES_6 = [
  [1,2,3,4,5,6, 4,5,6,1,2,3, 2,3,4,5,6,1, 5,6,1,2,3,4, 3,4,5,6,1,2, 6,1,2,3,4,5],
  [1,2,3,4,5,6, 4,5,6,1,2,3, 3,1,2,5,6,4, 5,6,4,3,1,2, 2,3,1,6,4,5, 6,4,5,2,3,1],
  [3,2,1,4,5,6, 6,5,4,1,2,3, 4,3,2,5,6,1, 1,6,5,2,3,4, 5,4,3,6,1,2, 2,1,6,3,4,5],
  [2,1,4,3,6,5, 3,5,6,2,1,4, 1,4,2,5,3,6, 5,6,3,1,4,2, 4,3,5,6,2,1, 6,2,1,4,5,3]
];

/* ---------- 棋盘几何：6×6 宫 2×3（boxR=2 行一 band、boxC=3 列一 stack） ---------- */
const N6 = 6, BOX_R = 2, BOX_C = 3;
