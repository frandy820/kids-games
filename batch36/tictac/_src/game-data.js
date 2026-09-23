/* ================= tictac 井字棋小冠军 游戏数据（章配置 / 语音表 / 棋子 SVG / 时长模型常量）
   玩法（SPEC-BATCH36 §-r18-tictac 现行版，7-8 岁策略/逻辑·对抗推理）：
   ch1-4 classic 3×3 井字棋 vs 兔子四档（随机→堵→聪明→minimax 完美，EXPANSION 坡度禁一步到位）；
   ch5 残局小侦探（win1 一步制胜/block1 必堵/fork 双威胁三类残局题，miss 计分制）；
   ch6 大棋盘三连（4×4 得 3 连 24 胜线，AI=确定性 depth-4 minimax）；
   ch7 三子滚动（每方场上 ≤3 子，落新子移最旧子 FIFO，总手数 36 收束平局）。
   负局 AI 复盘（ch1-4 classic）：minimax 回溯首误步（先手最优≥平局⇒负局必有失误步——先验）。
   miss 分题型（§-r18 §5）：对战关恒 0（I 豁免备案）；残局题答错计 miss（契约 I 全量适用）。
   estMs 家族 T 四方同步之一：本文件定义，main 禁重复声明（data+main 同块拼接）。 */
'use strict';

const estMs = s => s.length * 345 + 600;   // b25 定版：SAPI ~345ms/字 + 600 落地余量（全字符口径）

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 章配置（r18：7 章×6 关；章号 1 基；生成关 flat≥42 每关随机章参数 dch=ri(1,4)
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（生成关恒 battle 型，verify 双录对账）；
   章叙事坡度：随便下→会防守→动脑筋→完美大师→读残局→大棋盘→棋子滚动。 ---------- */
const CHAPTERS = {
  1: { name: '兔子随便下', hint: '兔子学会防守啦' },
  2: { name: '兔子会防守', hint: '兔子会动脑筋啦' },
  3: { name: '聪明兔登场', hint: '最厉害的兔子来啦' },
  4: { name: '冠军大挑战', hint: '残局小侦探开始啦' },
  5: { name: '残局小侦探', hint: '更大的棋盘来啦' },
  6: { name: '大棋盘三连', hint: '棋子会滚动回家啦' },
  7: { name: '三子滚动', hint: '新一轮井字棋开始' }
};
const GEN_HINTS = ['兔子随便下',   // dch1 随机 AI（会犯错）
                   '兔子会防守',   // dch2 block-only（会挡不会杀）
                   '聪明兔登场',   // dch3 smart（杀→堵→20% 漏率→中心/角启发）
                   '冠军大挑战'];  // dch4 minimax 完美（永不输——全谱遍历断言）
const CH_LEN = 6;          // 每章 6 关（r18：5→6，键基变更→启动迁移 IIFE，§-r18 §6）
const N_CHAPTERS = 7;      // 静态 7 章 = 42 关
const STATIC_LEVELS = 42;  // 静态 42 关 = 7 章×6
const ROUNDS = 3;          // 对战型关卡每关 3 局（battle/v44/vroll——SPEC §0.90 定版）
const PUZZLES = 5;         // 残局关每关 5 题（§-r18 §1）
const KIND_OF_CH = { 1: 'battle', 2: 'battle', 3: 'battle', 4: 'battle',
                     5: 'puzzle', 6: 'v44', 7: 'vroll' };   // 关型分流（§-r18 §1）

/* ---------- r18 时长模型常量（§-r18 §4；verify+selftest 双端独立重列对账禁引此处）----------
   DECIDE_MS=认知决策时长：battle 单手选点 7000 / puzzle 残局阅读+谓词验证 12000 /
   v44 16 格扫描 8000 / vroll 移子后果预演 8000；
   NOMINAL 名义手数（每局 X 手/兔应手）；RABBIT_MS=兔子应手演出；END_WIN_MS=局终演出窗名义；
   PROMPT_WIN_MS=残局题面播报名义；RIGHT_WIN_MS=残局判对窗（=tk_right 2304+300）。 */
const DECIDE_MS = { battle: 7000, puzzle: 12000, v44: 8000, vroll: 8000 };
const NOMINAL = { battle: { moves: 4, rabbit: 3 }, v44: { moves: 6, rabbit: 6 }, vroll: { moves: 6, rabbit: 6 } };
const RABBIT_MS = 800;
const END_WIN_MS = 2820;
const PROMPT_WIN_MS = 3000;
const RIGHT_WIN_MS = 2604;
const LEVEL_MIN_MS = 40000;

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=tk_ 已核
   manifest 无占用 ✓（r18 新 7 键 2026-09-18 实查）；既有 6 键文本一字不改）。
   clip 实长（2026-09-18 浏览器 Audio 实测，§-r18 §7 表）：tut_watch 2952 / tut_turn 1752 /
   hint 2400 / right 2304 / draw 2544 / lose 2712 / puz_win 2904 / puz_block 2952 / puz_fork 2856 /
   wrong 2448 / review 2712 / v44 2856 / vroll 3336。
   全部 clip 无 keyless 段（棋盘格不 TTS，契约 L/N 天然满足）。 ---------- */
const VOICE = {
  watch:   { key: 'tk_tut_watch',  text: '看！三个连一线' },
  turn:    { key: 'tk_tut_turn',   text: '你来下一局' },
  hint:    { key: 'tk_hint',       text: '想办法连成三个' },
  right:   { key: 'tk_right',      text: '赢啦，小冠军' },
  draw:    { key: 'tk_draw',       text: '平局啦，打得真棒' },
  lose:    { key: 'tk_lose',       text: '兔子赢啦，再来一局' },
  puzWin:  { key: 'tk_puz_win',    text: '一步就能赢，找那一格' },
  puzBlock:{ key: 'tk_puz_block',  text: '兔子快连成啦，堵住它' },
  puzFork: { key: 'tk_puz_fork',   text: '好棋，一步造两条线' },
  wrong:   { key: 'tk_wrong',      text: '再看看棋盘想一想' },
  review:  { key: 'tk_review',     text: '这一步，下这里更好' },
  v44:     { key: 'tk_v44',        text: '大棋盘，三个连一线' },
  vroll:   { key: 'tk_vroll',      text: '只有三颗子，下新的收旧的' }
};

/* ---------- 题面句（qbar 文字承载，与语音文案同源） ---------- */
const PROMPT_TEXT = '轮到你啦，三个连一线';
const RABBIT_TEXT = '小兔子在想，等一等';
const WIN_TEXT = '赢啦，小冠军！';
const DRAW_TEXT = '平局啦，打得真棒';
const LOSE_TEXT = '兔子赢啦，再来一局';
const P44_TEXT = '大棋盘，三个连一线';
const VROLL_TEXT = '三颗子滚动，三个连一线';
const PUZ_WIN_TEXT = '一步就能赢，点那一格';
const PUZ_BLOCK_TEXT = '兔子快连成啦，堵住它';
const PUZ_FORK_TEXT = '一步造出两条线';
const REVIEW_TEXT = '这一步，下这里更好';

/* ---------- X 棋子 SVG（暖橙双描边贴纸风 X——孩子执子） ---------- */
const X_SVG = '<svg class="mark" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<path d="M27 27 L73 73" stroke="' + INK + '" stroke-width="19" stroke-linecap="round"/>' +
  '<path d="M73 27 L27 73" stroke="' + INK + '" stroke-width="19" stroke-linecap="round"/>' +
  '<path d="M27 27 L73 73" stroke="#E8975A" stroke-width="12" stroke-linecap="round"/>' +
  '<path d="M73 27 L27 73" stroke="#E8975A" stroke-width="12" stroke-linecap="round"/></svg>';

/* ---------- O 棋子 SVG（兔子头像圆——兔子执子：暖棕圆+兔耳+小脸） ---------- */
const O_SVG = '<svg class="mark" viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<ellipse cx="38" cy="18" rx="8" ry="15" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4.5" transform="rotate(-10 38 18)"/>' +
  '<ellipse cx="38" cy="20" rx="3.4" ry="9" fill="#F2B8C6" transform="rotate(-10 38 20)"/>' +
  '<ellipse cx="62" cy="18" rx="8" ry="15" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4.5" transform="rotate(10 62 18)"/>' +
  '<ellipse cx="62" cy="20" rx="3.4" ry="9" fill="#F2B8C6" transform="rotate(10 62 20)"/>' +
  '<circle cx="50" cy="66" r="32" fill="#FBF7F0" stroke="' + INK + '" stroke-width="5"/>' +
  '<circle cx="40" cy="62" r="3.4" fill="' + INK + '"/><circle cx="60" cy="62" r="3.4" fill="' + INK + '"/>' +
  '<path d="M45 72 q5 4.5 10 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
  '<ellipse cx="34" cy="71" rx="4.4" ry="3" fill="#F2B8C6" opacity=".8"/>' +
  '<ellipse cx="66" cy="71" rx="4.4" ry="3" fill="#F2B8C6" opacity=".8"/></svg>';

/* ---------- 孩子头像 SVG（双头像指示条左位：圆脸+刘海+笑脸） ---------- */
const KID_AVATAR = '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<circle cx="30" cy="32" r="18" fill="#FFE3C2" stroke="' + INK + '" stroke-width="2.6"/>' +
  '<path d="M13 26 a17 17 0 0 1 34 0 q-6 -6 -17 -4 q-11 2 -17 4 Z" fill="#6B4A2F" stroke="' + INK +
  '" stroke-width="2.4" stroke-linejoin="round"/>' +
  '<circle cx="24" cy="32" r="2.2" fill="' + INK + '"/><circle cx="36" cy="32" r="2.2" fill="' + INK + '"/>' +
  '<path d="M25 39 q5 4 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
  '<circle cx="19" cy="37" r="2.6" fill="#F2B8C6" opacity=".7"/><circle cx="41" cy="37" r="2.6" fill="#F2B8C6" opacity=".7"/></svg>';

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 棋盘格 X/O（井字棋主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M15 8 v28 M29 8 v28 M8 15 h28 M8 29 h28" stroke="#D8C9B4" stroke-width="2"/>' +
    '<path d="M17.5 17.5 l6 6 M23.5 17.5 l-6 6" stroke="#E8975A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="33" cy="33" r="4.2" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.4"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
