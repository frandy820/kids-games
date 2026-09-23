/* ================= fishcolor 游戏数据（r7 难度改造 2026-09-13）
   审计 AUDIT-56 条目 10 红款加深：颜色辨识 3 岁+零记忆需求 → 三机制升级
   ① 两步序：题面一次播「先钓X，再钓Y」（语音+色卡双锚保留），孩子自行记住顺序，
     两步按序完成才过题；去自动重播（idle 20s 救援每题一次）
   ② 间色合成：钓橙色须先后钓红鱼+黄鱼（橙=红+黄/绿=黄+蓝/紫=红+蓝），ch3 引入
   ③ 鱼群游散：在场一段时间散去再重出（温和压力非惩罚，已钓进度保留），ch2 起启用
   章 1 单色 / 章 2 两步序 / 章 3 间色 / 章 4 混排+高密度；每章 5 关，静态 20 关，
   生成关确定性（mulberry32(flat*7919+13)，同 flat 同题）
   小鱼 SVG 卡通：椭圆身+摆尾+背鳍，9 色；姿态微随机（左右朝向/眼睛睁闭/±6% 尺寸/游速相位） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 颜色表（name=颜色词 TTS 用；body=鱼身主色；fin=尾鳍深一档） ---------- */
const COLORS = {
  red:    { name: '红色', body: '#E8543F', fin: '#C43B2A' },
  orange: { name: '橙色', body: '#F5A63B', fin: '#DC8818' },
  yellow: { name: '黄色', body: '#F7D24E', fin: '#E2B420' },
  green:  { name: '绿色', body: '#5FBE6F', fin: '#3CA054' },
  blue:   { name: '蓝色', body: '#4E9BDD', fin: '#2F7CC0' },
  purple: { name: '紫色', body: '#A572D4', fin: '#8752B5' },
  pink:   { name: '粉色', body: '#F2A6BE', fin: '#DF7FA2' },
  black:  { name: '黑色', body: '#3A3633', fin: '#262320' },   /* 反方审查 m2：原 #5A5450 实为灰棕，加深至近黑 */
  white:  { name: '白色', body: '#FDFDF6', fin: '#E3DCCB' }
};
/* 近似对邻接表（单向列出即可，查两边） */
const NEAR = {
  red: ['orange'], orange: ['red', 'yellow'], yellow: ['orange'],
  blue: ['purple'], purple: ['blue'],
  green: [], pink: [], black: [], white: []
};
const nearOf = c => NEAR[c] || [];
const isNearPair = (a, b) => nearOf(a).indexOf(b) >= 0 || nearOf(b).indexOf(a) >= 0;

/* ---------- r7 间色配方（数组序=点钓顺序，与语音「先钓X，再钓Y」一致）
   橙=红+黄 / 绿=黄+蓝 / 紫=红+蓝（颜料混合）；间色题场上绝无该间色目标鱼（须合成） */
const MIXES = {
  orange: ['red', 'yellow'],
  green:  ['yellow', 'blue'],
  purple: ['red', 'blue']
};

/* ---------- 章色池（章号 1 基；dch=难度章号 (ch-1)%4+1 循环取材）
   ch1 单色基础 4 色 / ch2 两步序（橙可作目标）/ ch3 间色（三原色为成分）
   ch4 混排（green/pink 不入近似辨析池） */
const POOLS = {
  1: ['red', 'yellow', 'blue', 'green'],
  2: ['red', 'yellow', 'blue', 'green', 'orange'],
  3: ['red', 'yellow', 'blue'],
  4: ['red', 'yellow', 'blue', 'green', 'orange', 'purple']
};

/* ---------- 章配置（tMin/tMax 每屏总鱼数 / D 撒点最小中心距 px / size 渲染尺寸 px）
   name 供章末预告；hint=预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  1: { name: '钓一钓', tMin: 6, tMax: 8,  size: 100, D: 132,
       hint: '新玩法：听好顺序，先钓一种颜色，再钓另一种' },
  2: { name: '记顺序', tMin: 6, tMax: 9,  size: 94,  D: 118,
       hint: '红色和黄色抱一抱，能变出新颜色哦' },
  3: { name: '变颜色', tMin: 6, tMax: 8,  size: 94,  D: 118,
       hint: '小鱼变多啦，颜色搭配和顺序都要记牢' },
  4: { name: '大挑战', tMin: 8, tMax: 10, size: 86,  D: 106,
       hint: '新一轮钓鱼颜色大挑战' }
};
/* 生成关预告（dch 1-4 主题：单色/两步序/间色/混排；家族 F：实算 GEN_HINTS[genLevel(f+1).dch-1]） */
const GEN_HINTS = ['钓同色的小鱼，看准再钓', '先钓哪种再钓哪种，顺序自己记牢',
                   '两种颜色抱一抱，变出新颜色', '钓鱼大挑战，全都用上啦'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- r7 鱼群游散（温和压力非惩罚）：present=在场可钓 ms / away=散去等待 ms
   散去时鱼不可点（游出+隐藏），到点重出（重撒点位，已钓起进度保留）；ch1 不启用 */
const SCHOOL = {
  1: { on: false, present: 0,     away: 0 },
  2: { on: true,  present: 18000, away: 3200 },
  3: { on: true,  present: 15000, away: 3200 },
  4: { on: true,  present: 12000, away: 3000 }
};

/* b25 定版 estMs（家族 T，r7 涉语音窗启用）：SAPI ~345ms/字 + 600 落定余量
   （n=字符数，全字符口径；源常量+注释+verify 断言+build.py 字面 assert 四处同步） */
const estMs = n => n * 345 + 600;

/* ---------- 语音文案（前三条既有 clip 一字不改；后三条 r7 新增，manifest 真值源=gen_clips.py）
   watch/turn/hint/wrong/wrongSeq/waitAway 均有 clip；题面拆段 clip 化（T46 阶段2 fis_ 26 段） */
const VOICE = {
  watch:    { key: 'fis_tut_watch',  text: '看！钓指定颜色的小鱼' },
  turn:     { key: 'fis_tut_turn',   text: '你来钓一钓' },
  hint:     { key: 'fis_hint',       text: '听一听，钓什么颜色的鱼' },
  wrong:    { key: 'fis_wrong',      text: '不对哦，再看看颜色' },        /* r7 纠错方向锚（不泄答案） */
  wrongSeq: { key: 'fis_wrong_seq',  text: '不对哦，先钓前面说的颜色' },  /* r7 点了后步色=序错方向锚 */
  waitAway: { key: 'fis_wait',       text: '小鱼游开啦，等一等再钓' }     /* r7 游散首发提示（每关一次） */
};

/* ---------- 颜色词 / 题面朗读（T46 阶段2：拆段 clip 化；quizSpeech 保留=TTS 兜底文案）
   r7：题面一次播完，孩子自行记住顺序（救援每题一次，分步推进不再重播）；
   间色题 ch3 用教学全句（含配方），ch4 复习用短句 */
const nameOf = c => COLORS[c].name;
const cntCn = n => n === 1 ? '一条' : (n === 2 ? '两条' : '三条');   // need ≤3
const quizSpeech = q => {
  if (q.kind === 'mix') {
    const c1 = nameOf(q.targets[0]), c2 = nameOf(q.targets[1]);
    return q.shortMix
      ? '先钓' + c1 + '，再钓' + c2 + '，变出' + nameOf(q.mix)
      : nameOf(q.mix) + '是' + c1 + '和' + c2 + '变的，先钓' + c1 + '，再钓' + c2;
  }
  if (q.kind === 'two') {
    return '先钓' + cntCn(q.need[0]) + nameOf(q.targets[0]) + '，再钓' +
      cntCn(q.need[1]) + nameOf(q.targets[1]);
  }
  return '钓' + cntCn(q.need[0]) + nameOf(q.targets[0]) + '的鱼';
};
/* T46 阶段2（2026-09-19）：题面拆段键链（与 quizSpeech 文本逐段一致——fis_c_* 颜色 9 /
   fis_cnt_* 量词 3 / fis_s_* 句式段 8，全在 manifest）；全段在册 queue 拼播 */
const quizParts = q => {
  if (q.kind === 'mix') {
    const c1 = q.targets[0], c2 = q.targets[1];
    return q.shortMix
      ? ['fis_s_xian', 'fis_c_' + c1, 'fis_s_zai', 'fis_c_' + c2, 'fis_s_bianc', 'fis_c_' + q.mix]
      : ['fis_c_' + q.mix, 'fis_s_shi', 'fis_c_' + c1, 'fis_s_he', 'fis_c_' + c2,
         'fis_s_bian', 'fis_c_' + c1, 'fis_s_zai', 'fis_c_' + c2];
  }
  if (q.kind === 'two') {
    return ['fis_s_xian', 'fis_cnt_' + q.need[0], 'fis_c_' + q.targets[0],
            'fis_s_zai', 'fis_cnt_' + q.need[1], 'fis_c_' + q.targets[1]];
  }
  return ['fis_s_diao', 'fis_cnt_' + q.need[0], 'fis_c_' + q.targets[0], 'fis_s_dewei'];
};

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<g><path d="M32 22 L42 14 Q39 22 42 30 Z" fill="#4E9BDD" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<ellipse cx="22" cy="22" rx="14" ry="10" fill="#4E9BDD" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M18 13 q4 -6 9 -2" stroke="#4A3B2E" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="28" cy="20" r="2.6" fill="#FFF"/><circle cx="28.8" cy="20" r="1.3" fill="#4A3B2E"/></g>' +
    '<path d="M8 22 q4 4 0 8 M13 20 q5 6 0 12" stroke="#8A9BAE" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
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
  arrow: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M6 20 H30 M22 10 L32 20 L22 30" stroke="#E8975A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  rod: '<svg viewBox="0 0 110 96" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M106 4 Q72 16 48 46" stroke="#8A6B4F" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="100" cy="12" r="5" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M48 46 q2 20 -2 34 M46 80 q-5 6 2 8" stroke="#B9AF9C" stroke-width="2" stroke-linecap="round" fill="none"/></svg>'
};

/* ---------- 场上小鱼 SVG（viewBox 0 0 100 74；尾巴独立 g 供 CSS 摆尾）
   p = { c: 色键, f: 0 右 / 1 左朝向, e: 0 睁眼 / 1 闭眼 }，s 尺寸缩放由外层 style 控制 */
function fishSvg(p) {
  const C = COLORS[p.c] || COLORS.red;
  const eye = p.e
    ? '<path d="M64 32 q4 3.5 8 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : '<circle cx="67" cy="32" r="4" fill="#FFF" stroke="' + INK + '" stroke-width="1.6"/><circle cx="68.2" cy="32" r="2" fill="' + INK + '"/>';
  return '<svg class="fishsvg" viewBox="0 0 100 74" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g' + (p.f ? ' transform="translate(100 0) scale(-1 1)"' : '') + '>' +
    '<g class="tail"><path d="M30 37 L7 15 Q16 37 7 59 Z" fill="' + C.fin + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/></g>' +
    '<path d="M42 19 Q55 2 70 15 Q57 19 52 25 Z" fill="' + C.fin + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<ellipse cx="56" cy="40" rx="27" ry="21" fill="' + C.body + '" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M48 59 q9 9 17 2" fill="' + C.fin + '" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M46 30 q6 -5 11 -1" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>' +
    eye +
    '<path d="M80 42 q3 3 0 6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '</g></svg>';
}

/* ---------- 池塘背景（低干扰，pointer-events:none）：水波纹 + 荷叶 + 芦苇 ---------- */
function pondSvg() {
  let s = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  const wave = (x, y, w) =>
    '<path d="M' + x + ' ' + y + ' q' + (w / 2) + ' -7 ' + w + ' 0" stroke="#AED4CD" stroke-width="4" stroke-linecap="round" fill="none" opacity=".7"/>';
  [[80, 120, 90], [420, 90, 110], [760, 140, 80], [180, 460, 100], [560, 500, 120], [880, 430, 90],
   [300, 260, 70], [680, 300, 90], [90, 320, 80], [930, 250, 60]]
    .forEach(w => { s += wave(w[0], w[1], w[2]); });
  const pad = (x, y, k, cut) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
    '<path d="M0 0 a34 34 0 1 0 34 -34 a34 34 0 0 0 -34 34 Z" fill="#9CCB8E" stroke="#7FB573" stroke-width="3"/>' +
    (cut ? '<path d="M0 0 L30 -28" stroke="#7FB573" stroke-width="3"/>' : '') +
    '<path d="M0 0 L-14 -28 M0 0 L28 -10" stroke="#8CBD80" stroke-width="2.4"/></g>';
  s += pad(120, 545, 1.1, true) + pad(870, 555, 0.9, false) + pad(60, 320, 0.7, true) + pad(940, 480, 0.75, false);
  const reed = (x, y, h) =>
    '<g transform="translate(' + x + ' ' + y + ')">' +
    '<path d="M0 0 q-6 -' + (h / 2) + ' 2 -' + h + '" stroke="#8FBF9A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M8 0 q5 -' + (h / 2 - 8) + ' -1 -' + (h - 14) + '" stroke="#9CCB8E" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="1" cy="-' + h + '" rx="4" ry="9" fill="#C98A5A" transform="rotate(14 1 -' + h + ')"/></g>';
  s += reed(36, 600, 92) + reed(964, 600, 76);
  return s + '</svg>';
}
