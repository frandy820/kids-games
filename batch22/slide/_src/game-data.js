/* ================= slide 滑块拼图 游戏数据（章配置 / 语音文案 / 照片库 / 图标）
   玩法（SPEC-BATCH22 §2/§0.50）：小兔子照片切块打乱，右侧小样恒可见（5-6 岁
   须有参照），点空格相邻块滑入复原；块上禁数字标号（图块纹理=线索，§0.19
   零文字依赖）；从完成态做 K 次随机合法滑动构造盘面——构造即证明可解
   （禁随机排列：3×3 奇偶性 50% 死局）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%4+1 循环；生成关随机章参数）
   ch1 2×2（K∈[3,6]）/ ch2 2×3（K∈[6,12]）/ ch3 3×3（K∈[12,20]）
   / ch4 生成关盘型轮换（每关 5 题跨 2×2/2×3/3×3 ≥2 种）；
   name 供章末预告；hint=章末预告下一章文案（hint[i]↔CHAPTERS[i+1] 玩法，
   b21 沉淀②：预告下一章非本章；GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  1: { name: '小小拼图', hint: '照片块变多变长啦，先看看小照片' },   /* 预告 ch2 2×3 */
  2: { name: '长长照片', hint: '更大的九宫格照片来啦，仔细看每一块' }, /* 预告 ch3 3×3 */
  3: { name: '九宫拼图', hint: '照片和盘子都会换，用你的本领拼拼看' }, /* 预告 ch4 生成关轮换 */
  4: { name: '拼图达人', hint: '新的小兔子照片拼图来啦' }              /* 预告生成关 */
};
const GEN_HINTS = ['新的小兔子照片来啦', '先看小照片再动手', '空格旁边的块才能滑', '拼图小达人'];
const CH_LEN = 5;          // 5 题（5 个盘面）= 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（五条与 voice/clips/manifest.json 严格一致，禁改 key/text；
   SPEC-BATCH22 §2 原文零手抄；sli_wrong 配 'wig' 非相邻拒绝反馈） */
const VOICE = {
  watch: { key: 'sli_tut_watch', text: '看！滑一滑拼照片' },
  turn:  { key: 'sli_tut_turn',  text: '你来拼一拼' },
  hint:  { key: 'sli_hint',      text: '看看空格旁边' },
  right: { key: 'sli_right',     text: '拼好啦，照片真好看' },
  wrong: { key: 'sli_wrong',     text: '这块动不了，试试空格旁边的' },
  /* T46 阶段2：sli_q 缺键补入 manifest（此前 queue 引用落系统 TTS）+演示规则句 sli_adj */
  quiz:  { key: 'sli_q',         text: '把小兔子的照片拼好吧' },
  adj:   { key: 'sli_adj',       text: '空格旁边的，才能滑' }
};

/* ---------- 题面整句（读题/救援/重听共用；T46 阶段2 clip 化=sli_q）：
   SPEC §2 玩法题面语音原句 */
function quizSpeech() { return '把小兔子的照片拼好吧'; }

/* ---------- 照片库：小兔子主题 4 张 SVG（viewBox 240×240 正方，与盘面同 aspect，
   按关轮换 picOf(flat)=flat%4）。四角+中心特征分散（左上装饰/右上天象/
   中央主角/左下/右下道具）——切块后每块图块纹理可辨（SPEC：块上禁数字标号，
   图块纹理=线索） */
const PIC_IDS = ['carrot', 'sleep', 'umbrella', 'flower'];
const picOf = flat => PIC_IDS[((flat % PIC_IDS.length) + PIC_IDS.length) % PIC_IDS.length];
/* 兔子（照片主角，与 core.assets.rabbit 同族暖描线风，正脸朝前） */
const PIC_RAB = (eyes) =>
  '<ellipse cx="120" cy="72" rx="14" ry="34" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4" transform="rotate(-12 120 72)"/>' +
  '<ellipse cx="120" cy="76" rx="6" ry="22" fill="#F2B8C6" transform="rotate(-12 120 76)"/>' +
  '<ellipse cx="160" cy="70" rx="14" ry="35" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4" transform="rotate(13 160 70)"/>' +
  '<ellipse cx="160" cy="74" rx="6" ry="23" fill="#F2B8C6" transform="rotate(13 160 74)"/>' +
  '<circle cx="140" cy="128" r="52" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4"/>' +
  '<ellipse cx="122" cy="120" rx="4" ry="5.5" fill="#D98A8A"/><ellipse cx="158" cy="120" rx="4" ry="5.5" fill="#D98A8A"/>' +
  eyes +
  '<ellipse cx="140" cy="140" rx="9" ry="6" fill="#F2B8C6" opacity=".85"/>' +
  '<path d="M134 150 q6 5 12 0" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
const EYES_OPEN = '<circle cx="122" cy="122" r="4.5" fill="' + INK + '"/><circle cx="158" cy="122" r="4.5" fill="' + INK + '"/>';
const EYES_SLEEP = '<path d="M114 122 h16 M150 122 h16" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>';
/* 装饰件：太阳/月亮星/云/花/蝴蝶/蘑菇/水洼（四角特征） */
const SUN = '<circle cx="34" cy="34" r="17" fill="#F7C948" stroke="' + INK + '" stroke-width="3.5"/>' +
  '<g stroke="' + INK + '" stroke-width="3" stroke-linecap="round"><path d="M34 8 v7 M34 53 v7 M8 34 h7 M53 34 h7 M16 16 l5 5 M47 53 l5 5 M47 16 l-5 5 M16 53 l5 -5"/></g>';
const MOON = '<path d="M196 38 a22 22 0 1 0 12 34 a17 17 0 1 1 -12 -34 Z" fill="#F7C948" stroke="' + INK + '" stroke-width="3.5"/>';
const STAR = '<path d="M36 44 l4.5 11 11.5 1 -8.5 8 2.5 11.5 -10-6 -10 6 2.5-11.5 -8.5-8 11.5-1 Z" fill="#F7C948" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>';
const CLOUD = (x, y, s) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
  '<path d="M18 30 a11 11 0 0 1 9 -17 a14 14 0 0 1 26 3 a10 10 0 0 1 3 19 h-34 a9 9 0 0 1 -4 -5 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/></g>';
const RAIN = (col) => '<g stroke="' + col + '" stroke-width="3.5" stroke-linecap="round">' +
  '<path d="M40 96 l-5 14 M84 88 l-5 14 M196 96 l-5 14 M214 140 l-5 14 M26 150 l-5 14"/></g>';
const FLOWER = (x, y, c, r) => '<g transform="translate(' + x + ' ' + y + ')">' +
  '<path d="M0 8 q3 14 -2 26" stroke="#47A86B" stroke-width="4" fill="none"/>' +
  Array.from({ length: 5 }, (_, k) => {
    const a = k * 72 - 90, rad = a * Math.PI / 180;
    return '<ellipse cx="' + (Math.cos(rad) * r * 1.32).toFixed(1) + '" cy="' + (Math.sin(rad) * r * 1.32).toFixed(1) +
      '" rx="' + r + '" ry="' + (r * 0.72).toFixed(1) + '" fill="' + c + '" stroke="' + INK + '" stroke-width="3" transform="rotate(' + a + ')"/>';
  }).join('') + '<circle r="' + (r * 0.7).toFixed(1) + '" fill="#F7C948" stroke="' + INK + '" stroke-width="3"/></g>';
const BUTTERFLY = (x, y, c, s) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
  '<ellipse cx="-11" cy="-4" rx="10" ry="13" fill="' + c + '" stroke="' + INK + '" stroke-width="3" transform="rotate(-24 -11 -4)"/>' +
  '<ellipse cx="11" cy="-4" rx="10" ry="13" fill="' + c + '" stroke="' + INK + '" stroke-width="3" transform="rotate(24 11 -4)"/>' +
  '<ellipse cx="0" cy="2" rx="4" ry="12" fill="' + INK + '"/></g>';
const MUSHROOM = '<g transform="translate(38 186)"><path d="M-16 6 a16 14 0 0 1 32 0 Z" fill="#E8543F" stroke="' + INK + '" stroke-width="3.5"/>' +
  '<circle cx="-7" cy="-2" r="3" fill="#FFF"/><circle cx="6" cy="-4" r="3.4" fill="#FFF"/>' +
  '<rect x="-7" y="6" width="14" height="16" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/></g>';
const GRASS = '<path d="M0 214 q14 -12 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 v26 H0 Z" fill="#9FD2A8" opacity=".9"/>' +
  '<g stroke="#5E9B6F" stroke-width="3" stroke-linecap="round"><path d="M30 230 q-4 -10 -1 -18 M206 232 q4 -10 1 -18"/></g>';
const PUDDLE = '<ellipse cx="198" cy="216" rx="30" ry="10" fill="#9FD2C9" stroke="' + INK + '" stroke-width="3"/>' +
  '<ellipse cx="196" cy="213" rx="12" ry="3.4" fill="#FFF" opacity=".7"/>';

const PICS = {
  /* 图1 胡萝卜：左上太阳 / 右上蝴蝶 / 中央兔子抱萝卜 / 左下蘑菇 / 底部草地 */
  carrot: '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="240" height="240" fill="#FCEFD4"/>' + SUN +
    BUTTERFLY(198, 46, '#8E5FC6', 1.05) + MUSHROOM + GRASS +
    PIC_RAB(EYES_OPEN) +
    '<g transform="rotate(18 172 176)"><path d="M172 130 q17 3 17 34 q0 20 -8 34 l-9 -12 l-9 12 q-8 -14 -8 -34 q0 -31 17 -34 Z" fill="#F08A3C" stroke="' + INK + '" stroke-width="4"/>' +
    '<g stroke="#C4662A" stroke-width="3" stroke-linecap="round"><path d="M170 150 h12 M166 168 h16 M170 186 h8"/></g>' +
    '<path d="M180 128 q-8 -16 -20 -12 M180 128 q10 -14 22 -8" stroke="#47A86B" stroke-width="4.5" fill="none" stroke-linecap="round"/></g></svg>',
  /* 图2 睡觉：左上星星 / 右上月亮 / 中央闭眼兔 / 左下蘑菇 / 底部安睡草地 */
  sleep: '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="240" height="240" fill="#DCE4F4"/>' + STAR + MOON + MUSHROOM +
    '<path d="M0 206 q14 -10 28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 t28 0 v34 H0 Z" fill="#B8CBE8" opacity=".85"/>' +
    PIC_RAB(EYES_SLEEP) +
    '<g fill="#8A9BAE" font-family="inherit" font-weight="700">' +
    '<text x="196" y="120" font-size="26">z</text><text x="208" y="98" font-size="20">z</text></g></svg>',
  /* 图3 雨伞：左上云 / 顶中橙伞条纹 / 伞下兔子 / 雨丝 / 右下水洼 */
  umbrella: '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="240" height="240" fill="#E9EEF3"/>' + CLOUD(18, 20, 0.95) + CLOUD(168, 34, 0.72) +
    RAIN('#7FA8C9') + PUDDLE + PIC_RAB(EYES_OPEN) +
    '<path d="M140 22 a58 58 0 0 0 -58 58 h116 a58 58 0 0 0 -58 -58 Z" fill="#F08A3C" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M140 22 a29 58 0 0 0 -29 58 h58 a29 58 0 0 0 -29 -58 Z" fill="#F7C948" opacity=".95"/>' +
    '<path d="M140 22 v-10 a7 7 0 0 1 12 -5" stroke="' + INK + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M82 80 q58 16 116 0" stroke="' + INK + '" stroke-width="4" fill="none"/></svg>',
  /* 图4 花园：左上蝴蝶 / 右上太阳 / 中央大黄花+兔子 / 左下蓝花 / 右下粉花+草地 */
  flower: '<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">' +
    '<rect width="240" height="240" fill="#FCEFD4"/>' +
    BUTTERFLY(38, 42, '#E8543F', 1.0) +
    '<circle cx="206" cy="36" r="14" fill="#F7C948" stroke="' + INK + '" stroke-width="3.5"/>' + GRASS +
    PIC_RAB(EYES_OPEN) +
    FLOWER(58, 200, '#5B9BD5', 9) + FLOWER(196, 176, '#E77FA9', 9) +
    FLOWER(206, 116, '#E8543F', 7.5) + '</svg>'
};

/* ---------- 图标（内嵌 SVG 描线风） */
const ICONS = {
  /* logo：暖底圆牌 + 2×2 拼图块 */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="10" y="10" width="11" height="11" rx="2.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="23" y="10" width="11" height="11" rx="2.5" fill="#9FD2C9" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="10" y="23" width="11" height="11" rx="2.5" fill="#9FD2A8" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="23" y="23" width="11" height="11" rx="2.5" fill="none" stroke="' + INK + '" stroke-width="2" stroke-dasharray="3.5 2.5"/></svg>',
  /* 小样相框角标（完成参照语义，零文字） */
  frame: '<svg viewBox="0 0 30 30" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="6.5" width="22" height="17" rx="3.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="11" cy="13" r="2.6" fill="#F7C948"/><path d="M6.5 21 l5.5 -5 4 3.5 4.5 -5 6 6.5" stroke="#8FBF7F" stroke-width="2.6" stroke-linejoin="round"/></svg>',
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
