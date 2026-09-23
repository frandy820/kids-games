/* ================= countchick 游戏数据（章配置 / 时长模型 / 语音文案 / 图标 / 动物 SVG）
   r19 难度改造（2026-09-18，AUDIT-56 黄款 #7：点数 1-10=4-5 岁技能低 1.5 岁 → 6-7 岁三升级）：
   ①量域 11-20（「先数 10 再数余数」十加几结构化教学法锚=ten-chip）②两群比较（小鸡/小鸭双群清点+差值问答）
   ③限时快数（感数上限 4-5 外的短时呈现估计，选项间距 3=估计容差判分）
   小鸡 SVG 卡通：黄圆身+橙嘴+小翅膀，姿态微随机（左右朝向 / 眼睛睁闭 / ±6% 尺寸抖动）
   干扰动物（章 2）：小鸭（白身扁嘴）/ 小兔（白身长耳）——都不是黄色，与小鸡区分明显 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- estMs（家族 T 全字符口径，四方同步之一：data/main 用/verify 动态/selftest lambda/build 断言）
   SAPI TTS ~345ms/字 + 600 落定余量；estMs 吃字符串（r18 坑④：传 .length 数字=NaN 窗） */
const estMs = s => s.length * 345 + 600;

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   kind: count=单群点数 / compare=两群比较 / flash=限时快数
   n 小鸡只数区间 / D 撒点最小中心距 px / size 渲染尺寸 px（热区 ≥64）
   ch2 mix=混入小鸭小兔 2-4 只只数小鸡（原 ch4 技能并入新量域）
   ch3 compare: nMin-nMax=小鸡数（恒为多的一方），dMin-dMax=差值域（SPEC §-r19 差值先验 1-5）
   ch4 flash: nMin-nMax=呈现只数，flashMs=FLASH_A+n*FLASH_B（SPEC §-r19 窗公式）
   name 供章末预告；hint=章末"明天"预告文案（GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  /* size 下限：×0.94 尺寸抖动后热区仍 ≥64（size≥69）——触摸目标门禁推导 */
  1: { kind: 'count',   name: '数到十几', nMin: 11, nMax: 14, D: 96, size: 78, hint: '更多的小鸡，先数满 10 只再接着数' },
  2: { kind: 'count',   name: '数到二十', nMin: 15, nMax: 20, D: 90, size: 70, mix: true, hint: '草地上混进了小鸭和小兔，只数小鸡' },
  3: { kind: 'compare', name: '两群比较', nMin: 7,  nMax: 12, dMin: 1, dMax: 5, D: 92, size: 70, hint: '数一数两群，比一比多几只' },
  4: { kind: 'flash',   name: '看一眼快数', nMin: 8, nMax: 16, D: 96, size: 78, hint: '看一眼马上猜，练出好眼力' }
};
const GEN_HINTS = ['十几只也能数，先满 10', '更多小鸡混小鸭，只数小鸡', '两群比一比，多几少几', '看一眼快数挑战'];
const CH_LEN = 5;          // 5 题 = 1 关（r19 保持：11-20 逐格点数链较长，8 题超耐心线）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
const D_MIN = 2;           // 章 2 干扰动物只数区间（SPEC §1：2-4；反方审查 m2：原 4,4 恒上限）
const D_MAX = 4;

/* ---------- 认知时长模型（SPEC §-r19 §4：DECIDE_MS 联动 modeled，verify+selftest 双钉精确一致禁约数）
   TAP_MS 逐只点数（抬手+角标确认）/ COUNT_BASE 读题+选项扫描 / CMP_BASE 双群清点后比较思考（向上数射）
   FLASH_BASE 估计决策；flashMs = FLASH_A + n*FLASH_B（窗 < 数完所需：点数下界 ~600ms/只 ≫ 100ms/只）
   RIGHT_MS 答对演出窗（main wait(880*SPEED) 同源）/ GAP_MS 题间渲染
   INTRO_MS 关入场语音窗（estMs(chk_hint)+400）/ QWIN_* 每题问句语音窗（estMs(问句)+300） */
const TAP_MS = 950;
const COUNT_BASE = 2600;
const CMP_BASE = 4200;
const FLASH_BASE = 3000;
const FLASH_A = 1200;
const FLASH_B = 100;
const RIGHT_MS = 880;
const GAP_MS = 600;
const INTRO_MS = estMs('点一点，数一数') + 400;
const QWIN_CMP = estMs('小鸡比小鸭多几只') + 300;
const QWIN_FLASH = estMs('看一眼，有几只小鸡') + 300;
const DECIDE_MS = { count: COUNT_BASE, compare: CMP_BASE, flash: FLASH_BASE };

/* ---------- 语音文案（key=待合成 clip 名，text=TTS 兜底；仅前 3 关播 sayP，救援走 sayR）
   r19 新键 6 条报主线 gen_clips ALL 登记：chk_ten/chk_cmp_more/chk_cmp_less/chk_cmp_hint/chk_flash_q/chk_flash_hint
   数字一律不入口播（角标/十加几 chip 全视觉承载）——无中文数字映射表需求（b27 坑③不适用，SPEC 注记） */
const VOICE = {
  watch:   { key: 'chk_tut_watch',  text: '看！数一数有几只小鸡' },
  turn:    { key: 'chk_tut_turn',   text: '你来数一数' },
  hint:    { key: 'chk_hint',       text: '点一点，数一数' },
  rec:     { key: 'chk_rec',        text: '好，我们重新数一数' },
  ten:     { key: 'chk_ten',        text: '满10只啦，接着数' },
  cmpMore: { key: 'chk_cmp_more',   text: '小鸡比小鸭多几只' },
  cmpLess: { key: 'chk_cmp_less',   text: '小鸭比小鸡少几只' },
  cmpHint: { key: 'chk_cmp_hint',   text: '先数小鸡，再数小鸭' },
  flashQ:  { key: 'chk_flash_q',    text: '看一眼，有几只小鸡' },
  flashHint: { key: 'chk_flash_hint', text: '别急着数，看一眼猜一猜' }
};
/* 错反馈链豁免窗（家族 I：链实长+300；estMs 上界口径——clip 合成后实长恒 ≤ estMs，窗安全）
   S1 时序推导源：count 3465 / compare 4155 / flash 4845 */
const WRONG_WIN = {
  count:   estMs(VOICE.hint.text) + 150 + 300,
  compare: estMs(VOICE.cmpHint.text) + 150 + 300,
  flash:   estMs(VOICE.flashHint.text) + 150 + 300
};
/* 救援双锚（家族 B：14s 方向级 / 30s 答案级分离，错点只让路不重置） */
const RESCUE_DIR_MS = 14000;
const RESCUE_ANS_MS = 30000;
/* 错反馈语义句 flat≥3 只 10s 节流（家族 J） */
const SAYW_THROTTLE = 10000;

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="22" cy="25" r="15" fill="#F7CE55" stroke="#FFF" stroke-width="3"/>' +
    '<path d="M30 24 L40 27 L30 31 Z" fill="#E8873A"/>' +
    '<circle cx="26" cy="21" r="2.4" fill="#4A3B2E"/>' +
    '<path d="M18 12 q2 -6 6 -2 M22 10 q3 -5 6 -1" stroke="#E8975A" stroke-width="2.4" stroke-linecap="round"/></svg>',
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
  /* flash 模式「再看一眼」按钮 */
  resee: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 30 q24 -22 48 0" stroke="#E8975A" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="32" cy="36" r="11" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="3.5"/>' +
    '<circle cx="32" cy="36" r="4.6" fill="#4A3B2E"/>' +
    '<path d="M14 44 l-4 7 M50 44 l4 7" stroke="#E8975A" stroke-width="5" stroke-linecap="round"/></svg>',
  /* 题面 chip 用：小鸡/小鸭头像（与场上同风格，tally 双群并排呈现） */
  chickmini: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="22" cy="27" r="15" fill="#F7CE55" stroke="#4A3B2E" stroke-width="3"/>' +
    '<path d="M32 26 L42 29 L32 33 Z" fill="#E8873A" stroke="#4A3B2E" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="26" cy="23" r="2.4" fill="#4A3B2E"/>' +
    '<path d="M17 14 q2 -6 6 -2" stroke="#4A3B2E" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M15 34 h-6 M17 38 l-5 4 M29 38 l5 4" stroke="#E8873A" stroke-width="2.6" stroke-linecap="round"/></svg>',
  duckmini: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="20" cy="12" rx="4" ry="8" fill="#FFFDF7" stroke="#4A3B2E" stroke-width="2.4" transform="rotate(-8 20 12)"/>' +
    '<ellipse cx="28" cy="11" rx="4" ry="8.5" fill="#FFFDF7" stroke="#4A3B2E" stroke-width="2.4" transform="rotate(10 28 11)"/>' +
    '<circle cx="24" cy="32" r="12" fill="#FFFDF7" stroke="#4A3B2E" stroke-width="3"/>' +
    '<circle cx="28" cy="29" r="2.2" fill="#4A3B2E"/>' +
    '<path d="M35 32 q8 1 9 4 q-5 3 -9 1 Z" fill="#E8873A" stroke="#4A3B2E" stroke-width="1.8" stroke-linejoin="round"/></svg>'
};

/* ---------- 场上动物 SVG（viewBox 0 0 100 100，含阴影脚下椭圆）
   p = { f: 0 右 / 1 左朝向, e: 0 睁眼 / 1 闭眼 }，s 尺寸缩放由外层 style 控制 */
function chickSvg(p) {
  const eye = p.e
    ? '<path d="M54 50 q4 3.5 8 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : '<circle cx="59" cy="50" r="3.4" fill="' + INK + '"/><circle cx="60.6" cy="48.8" r="1.1" fill="#FFF"/>';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="94" rx="24" ry="5" fill="#C9D8A8" opacity=".8"/>' +
    '<g' + (p.f ? ' transform="translate(100 0) scale(-1 1)"' : '') + '>' +
    '<path d="M42 84 V95 M58 84 V95 M37 95 h10 M53 95 h10" stroke="#E8873A" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="50" cy="58" r="30" fill="#F7CE55" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M28 56 q-9 10 1 17 q7 4 12 -4" fill="#F2B93B" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M45 28 q2 -9 7 -3 M52 27 q4 -8 8 -2" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
    eye +
    '<ellipse cx="53" cy="62" rx="4.5" ry="2.8" fill="#F2A9A0" opacity=".75"/>' +
    '<path d="M76 53 L90 58 L76 64 Z" fill="#E8873A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '</g></svg>';
}
/* 小鸭：白身 + 橙扁嘴 + 橙脚（非黄色，与小鸡区分；compare 章=第二清点群） */
function duckSvg(p) {
  const eye = p.e
    ? '<path d="M50 44 q4 3.5 8 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : '<circle cx="55" cy="44" r="3.2" fill="' + INK + '"/>';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="94" rx="25" ry="5" fill="#C9D8A8" opacity=".8"/>' +
    '<g' + (p.f ? ' transform="translate(100 0) scale(-1 1)"' : '') + '>' +
    '<path d="M40 84 V95 M58 84 V95 M33 95 h12 M52 95 h12" stroke="#E8873A" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M36 62 a20 17 0 0 0 34 8 q16 -4 10 -14 q-4 -6 -12 -4 l-6 -14 a15 15 0 0 0 -29 3 q-1 10 3 21 Z" fill="#FFFDF7" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    eye +
    '<path d="M76 52 q12 1 13 6 q-8 5 -14 2 Z" fill="#E8873A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '</g></svg>';
}
/* 小兔：白身 + 长耳朵粉内芯（非黄色，与小鸡区分；章 2 干扰动物） */
function bunnySvg(p) {
  const eye = p.e
    ? '<path d="M46 42 q4 3.5 8 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : '<circle cx="50" cy="42" r="3.2" fill="' + INK + '"/>';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="94" rx="24" ry="5" fill="#C9D8A8" opacity=".8"/>' +
    '<g' + (p.f ? ' transform="translate(100 0) scale(-1 1)"' : '') + '>' +
    '<path d="M42 84 V95 M58 84 V95 M37 95 h10 M53 95 h10" stroke="#C9B8A0" stroke-width="4" stroke-linecap="round"/>' +
    '<ellipse cx="38" cy="22" rx="7.5" ry="17" fill="#FFFDF7" stroke="' + INK + '" stroke-width="3" transform="rotate(-8 38 22)"/>' +
    '<ellipse cx="38" cy="22" rx="3.2" ry="11" fill="#F2B8C6" transform="rotate(-8 38 22)"/>' +
    '<ellipse cx="56" cy="20" rx="7.5" ry="18" fill="#FFFDF7" stroke="' + INK + '" stroke-width="3" transform="rotate(10 56 20)"/>' +
    '<ellipse cx="56" cy="20" rx="3.2" ry="12" fill="#F2B8C6" transform="rotate(10 56 20)"/>' +
    '<circle cx="48" cy="62" r="24" fill="#FFFDF7" stroke="' + INK + '" stroke-width="3.2"/>' +
    eye +
    '<ellipse cx="44" cy="66" rx="3.6" ry="2.4" fill="#F2B8C6" opacity=".8"/>' +
    '<path d="M60 56 q8 2 7 8" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '</g></svg>';
}
const ANIMAL_SVG = { chick: chickSvg, duck: duckSvg, bunny: bunnySvg };

/* ---------- 草地背景装饰（低干扰，pointer-events:none）：草丛 + 小花 ---------- */
function grassSvg() {
  let s = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  const tuft = (x, y, k) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
    '<path d="M0 0 q-6 -14 -12 -18 M0 0 q0 -18 2 -24 M0 0 q7 -13 13 -17" stroke="#B7CC8E" stroke-width="4" stroke-linecap="round"/></g>';
  const flower = (x, y, c) =>
    '<g transform="translate(' + x + ' ' + y + ')">' +
    '<circle cx="-5" cy="0" r="4" fill="' + c + '"/><circle cx="5" cy="0" r="4" fill="' + c + '"/>' +
    '<circle cx="0" cy="-5" r="4" fill="' + c + '"/><circle cx="0" cy="5" r="4" fill="' + c + '"/>' +
    '<circle cx="0" cy="0" r="3" fill="#FFF9EE"/></g>';
  [[60, 540], [210, 580], [390, 520], [560, 585], [720, 540], [880, 575], [950, 480], [150, 470], [640, 480], [300, 455]]
    .forEach((p, i) => { s += tuft(p[0], p[1], 0.9 + (i % 3) * 0.25); });
  [[130, 520, '#F2B8C6'], [480, 560, '#E8C7E8'], [820, 500, '#F2B8C6'], [700, 560, '#F5C445'], [260, 500, '#E8C7E8']]
    .forEach(f => { s += flower(f[0], f[1], f[2]); });
  return s + '</svg>';
}
