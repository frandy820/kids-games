/* ================= mirrormaze 游戏数据（章配置 / 语音文案 / 图案配色与模板 / 时长模型）
   SPEC-BATCH17 §6 r14 难度改造版（2026-09-15 定版；§3 v1 作废留档）：
   轴向族六 kind（v 竖直/h 水平/d1 主对角/d2 反对角/pv·ph 6×6 周期双向/vv 平行双镜=平移/r180 垂直双镜=180°旋转）
   ——镜射变换群真值/公平性不变式/时长模型验算全部写死在 SPEC §6（写前 Python 独立复刻 30 记全过）。
   语音 7 条中文 clip（mm_*，manifest games:['mirrormaze']：既有 5 一字不改+r14 新 mm_hint2/mm_wrong2）
   +core 共享 3 = 10 条。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 章配置（r14；章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   hint=章末预告文案（契约 F：CHAPTERS[i].hint=第 i+1 章预告；GEN 文案不带"明天："前缀） ---------- */
const CHAPTERS = {
  1: { name: '转转镜子', hint: '镜子要斜过来照啦' },
  2: { name: '斜斜镜子', hint: '两边都能当镜子哦' },
  3: { name: '两边看一看', hint: '两面镜子一起照' },
  4: { name: '双面魔镜', hint: '更难的镜子图案在等你' }
};
const GEN_HINTS = ['转转镜子再照一次', '斜斜镜子再拼一次', '两边花纹再来一遍', '双面魔镜再挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/clips/manifest.json 严格一致 §0.18）
   r14 轴向语义：v 轴沿用旧键（左/右）；非 v 轴用 hint2/wrong2（不再说"左边"——SPEC §6-r14） ---------- */
const VOICE = {
  watch: { key: 'mm_tut_watch', text: '看！照镜子拼一拼' },
  turn:  { key: 'mm_tut_turn',  text: '你来拼一拼' },
  hint:  { key: 'mm_hint',      text: '看看左边想一想' },   /* v 轴 */
  hint2: { key: 'mm_hint2',     text: '看看镜子那一边' },   /* r14：非 v 轴 */
  right: { key: 'mm_right',     text: '拼好啦，真对称' },
  wrong: { key: 'mm_wrong',     text: '照照左边再看看' },   /* v 轴（§0.24 错点 clip 化） */
  wrong2:{ key: 'mm_wrong2',    text: '照照镜子再看看' }    /* r14：非 v 轴 */
};

/* ---------- 图案配色（暖色积木三色轮换；dch3 棋盘格两色指派取两异色） ---------- */
const PALETTE = ['#E8975A', '#8FBF7F', '#C98B9B'];

/* ---------- 形状模板库（RECT：带域相对坐标 [dx,dy]；三角 TRI：d1 源侧 y>x 坐标）
   RECT 按用途分组（SPEC §6 章结构）：
   DCH1_TPL 3-4 格（2 列×4 行带域，v 源=左半 2 列/h 源=上半 2 行=模板转置）
   DCH3 无 RECT 源（棋盘格块）
   DCH4_VV 4-6 格（2 列×4 行带域：源带 2 列平移）
   DCH4_R180 4-6 格（3 列×4 行带域：源带 cols0-2 转 180°）
   反启发式锚（delta⑤）：同模板跨题正解互异——同 id 在不同 kind/轴参数/源侧下答案变换不同
   （verify 断言 ≥2 互异答案签名的模板 ≥5 个）。 ---------- */
const RECT = [
  [[0, 0], [1, 0]],                                /* 0  bar2h */
  [[0, 0], [0, 1]],                                /* 1  bar2v */
  [[0, 0], [0, 1], [1, 1]],                        /* 2  L3   */
  [[0, 0], [1, 0], [1, 1]],                        /* 3  S3   */
  [[1, 0], [1, 1], [0, 1]],                        /* 4  L3b  */
  [[0, 0], [1, 0], [0, 1]],                        /* 5  corner3 */
  [[0, 0], [0, 1], [0, 2], [1, 2]],                /* 6  L4   */
  [[0, 0], [0, 1], [1, 1], [1, 2]],                /* 7  Z4   */
  [[0, 0], [1, 0], [0, 1], [0, 2]],                /* 8  T4   */
  [[0, 0], [1, 0], [0, 1], [1, 1]],                /* 9  sq4  */
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]],        /* 10 L5   */
  [[0, 0], [1, 0], [0, 1], [0, 2], [0, 3]],        /* 11 T5   */
  [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]],        /* 12 S5   */
  [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1], [1, 2]],/* 13 C6   */
  [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]],        /* 14 Γ5（3 列宽，r180 用） */
  [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]]         /* 15 T5v（3 列宽，r180 用） */
];
const DCH1_TPL   = [2, 3, 4, 5, 6, 7, 8, 9];       /* 3-4 格，2 列带域 */
const DCH4_VV    = [6, 7, 8, 10, 11, 12, 13];      /* 4-6 格，2 列带域 */
const DCH4_R180  = [6, 7, 8, 9, 14, 15];           /* 4-6 格，≤3 列带域 */
/* 三角模板（d1 源侧 y>x 内 4-5 格；d2 源侧=h 翻折 (x,4-y)——SPEC §6 真值） */
const TRI = [
  [[0, 1], [0, 2], [0, 3], [1, 2]],                /* 0 */
  [[0, 1], [0, 2], [1, 2], [1, 3]],                /* 1 */
  [[0, 2], [0, 3], [0, 4], [1, 3], [1, 4]],        /* 2 */
  [[0, 1], [1, 2], [2, 3], [3, 4]],                /* 3 阶梯 */
  [[0, 1], [0, 2], [0, 3], [1, 3], [1, 4]]         /* 4 */
];

/* ---------- r14 时长模型（crd r12 范式；SPEC §6-r14 定版——认知步主体非演出窗）
   每步（=每 target 一次镜像定位点击）dur = max(voiceWin, DECIDE_MS[kind]) + ADV_STEP；
   每题 + ADV_QUIZ 一次（补齐 right clip 主体窗）；voiceWin 首步=ENTER 400、后续=STAGE 400
   （本款无题面句——语音窗从不撑时长：400 < 4000 恒成立）。
   estMs = s => s.length * 345 + 600（b25 定版：SAPI ~345ms/字+600，全字符口径——四方同步：
   源常量+本注释+verify estMsV 断言+build.py 字面 assert）。
   DECIDE_MS（7-8 岁单格镜像定位认知推算）：
   v 4000（竖直轴=入园以来已巩固镜像锚：轴读入+同行距离翻转+确认——原款基线量级）
   h 5500（水平轴=心象旋转 90°：儿童心理旋转反应时随角差近似线性增长，90° 档 +40%）
   d1/d2 7500（45° 斜轴=最大角差心象旋转：斜向参照系未建立，逐格行列互换定位）
   pv/ph 8000（周期+双向：源侧完整性判别 1500+逐格棋盘格反相核验——照抄策略全错须逐格查轴）
   r180 9500（双垂直镜复合=180° 旋转：对角定位+两镜心象叠加）
   vv 10000（双平行镜复合=平移：方向判别（先照哪面镜定左右）+两镜叠加+双轴参数工作记忆）
   ADV_STEP 600（点对点亮动画 320ms+确认一拍）；ADV_QUIZ 3015=estMs('拼好啦，真对称')=7×345+600
   （'拼好啦，真对称' 7 字符全字符口径；mm_right 实测 2472ms ≤ 3015 预算窗 ✓ 2026-09-15 ffprobe）。
   验算（targets 下限，SPEC §6 对账）：
   ch1=5×(3×4600+3015)=84075 / ch2=5×(4×8100+3015)=177075 / ch3=5×(6×8600+3015)=273075
   / ch4=5×(4×10600+3015)=227075 —— 全部 ≥ LEVEL_MIN_MS 40000；
   40 关 modeled 最低理论下限=84075（ch1 全 3 格 v 模板关）——实测最低=93275（flat0 全 v 关
   17 格），verify ⑪ 40 关独立副本复算按实测精确断言（防回漂），build.py 同步字面 assert。 ---------- */
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）
const ENTER_MS = 400;                          // 新题盘出场动画窗
const STAGE_MS = 400;                          // 题内步推进窗
const DECIDE_MS = { v: 4000, h: 5500, d1: 7500, d2: 7500, pv: 8000, ph: 8000, vv: 10000, r180: 9500 };
const ADV_STEP = 600;                          // 点对反馈窗（每步）
const ADV_QUIZ = estMs('拼好啦，真对称');       // 补齐 right clip 主体窗（3015，每题一次——7 字符含逗号全字符口径）
const LEVEL_MIN_MS = 40000;                    // 单关 modeled 下限硬断言（r14 门禁，7-8 岁口径）
const stepVoiceMs = (q, k) => k === 0 ? ENTER_MS : STAGE_MS;
const quizDurMs = q => q.targets.reduce(
  (s, _, k) => s + Math.max(stepVoiceMs(q, k), DECIDE_MS[q.kind]) + ADV_STEP, 0) + ADV_QUIZ;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);
const modeled = flat => levelDurMs(genLevel(flat | 0));

/* ---------- 图标（全部内嵌 SVG；logo=左实右虚照镜子） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="8" width="14" height="28" rx="3.5" fill="#F6E3C5" stroke="#FFF" stroke-width="2"/>' +
    '<rect x="26" y="8" width="14" height="28" rx="3.5" fill="none" stroke="#FFF" stroke-width="2" stroke-dasharray="4 3"/>' +
    '<line x1="22" y1="4" x2="22" y2="40" stroke="#FFF" stroke-width="2" stroke-dasharray="3 3"/>' +
    '<circle cx="11" cy="16" r="3" fill="#E8975A"/><circle cx="11" cy="28" r="3" fill="#E8975A"/>' +
    '<circle cx="33" cy="16" r="3" fill="#C9A87C"/><circle cx="33" cy="28" r="3" fill="#C9A87C"/></svg>',
  mirror: '<svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="8" y="8" width="18" height="40" rx="4" fill="#E8975A" stroke="#4A3B2E" stroke-width="3"/>' +
    '<rect x="38" y="8" width="18" height="40" rx="4" fill="#F6ECD9" stroke="#4A3B2E" stroke-width="3" stroke-dasharray="5 4"/>' +
    '<line x1="32" y1="4" x2="32" y2="52" stroke="#4A3B2E" stroke-width="3" stroke-dasharray="4 4"/>' +
    '<path d="M26 54 L32 61 L38 54" fill="none" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  bulb: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 8 a15 15 0 0 1 9 27 q-3 2.4 -3 6 h-12 q0 -3.6 -3 -6 a15 15 0 0 1 9 -27 Z" fill="#F2C98C" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 47 h12 M27.5 52 h9" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M32 16 v9 M25 20 l3.5 4 M39 20 l-3.5 4" stroke="#FFF9EE" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M10 14 l4 4 M54 14 l-4 4 M8 30 h5.5 M51 30 h5.5" stroke="#F2C98C" stroke-width="3" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
