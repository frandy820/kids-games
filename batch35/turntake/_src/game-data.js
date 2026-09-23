/* ================= turntake 轮流浇花 游戏数据（回合序列参数 / 章配置 / 语音表 / 场景 SVG）
   玩法（2026-09-13 难度升级改造：判定层从「找耷拉」升级为「渴度比较+排序」）：
   花圃 3 盆花每回合都有渴度梯度（thirst∈{1,2,3}：1=花头稍低土微干 / 2=花头低垂叶弯 /
   3=花头垂地土裂纹+轻微枯色——姿态+土色双通道可辨）；顶部双头像指示轮到谁（ch1-2 大箭头）。
   孩子回合：ch1-2=点「最渴的」一盆（ch1 档差大 {1,1,3} / ch2 档差细微 {2,2,3}）；
   ch3-4=排序浇（按最渴→最不渴依次点 3 盆，点序错='wrong'「先浇更渴的那盆」不罚退已浇）。
   兔子回合实质化：兔子有时浇对有时浇错（seeded 约 1/3 浇错）——浇错时孩子点正确盆纠错
   （纠错回合 quiz.turn='k'+'小兔子浇错啦，帮帮它'轻提示，纠错对='right' 推进不计题号）；
   浇对时正常等待（演出窗 1.2s=走位 500+浇水 700，缩短无效等待）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 三盆花色款（恒全摆 0/1/2，色款=下标稳定） ---------- */
const FLOWER_KINDS = [
  { id: 'rose', petal: '#F2A7C3', petal2: '#E88FB2', heart: '#F6C96B' },
  { id: 'sun',  petal: '#F6C96B', petal2: '#EDB44F', heart: '#E8975A' },
  { id: 'lily', petal: '#B9B4E0', petal2: '#A39CD2', heart: '#F6C96B' }
];

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言）；
   ch1-2=点最渴（ch1 档差大/ch2 档差细微）+严格交替+大箭头；ch3-4=排序浇+箭头隐去+不规则。 ---------- */
const CHAPTERS = {
  1: { name: '你一次我一次', hint: '还是你一次我一次，稳稳浇' },
  2: { name: '小小花园',     hint: '箭头要休息啦，看谁亮灯' },
  3: { name: '看灯等一等',   hint: '顺序会变啦，大挑战' },
  4: { name: '轮流大挑战',   hint: '新一轮轮流浇花' }
};
const GEN_HINTS = ['你一次我一次',   // dch1 严格交替+箭头+点最渴（档差大）
                   '小小花园',       // dch2 严格交替+箭头+点最渴（档差细微）
                   '看灯等一等',     // dch3 箭头隐去+不规则+排序浇
                   '轮流大挑战'];    // dch4 生成混合
const CH_LEN = 5;          // 孩子回合恒 5（=5 题，§0.85 数学先验）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=tt_ 已核
   manifest 无占用 ✓ 2026-09-12 实查；2026-09-13 改造：tt_tut_watch/tt_hint 文案改 +
   新增 tt_order_hint/tt_order_wrong/tt_rabbit_wrong 三条——主线重合成覆盖占位 clip）。
   clip 实长（batch35/_clipdur35.json，浏览器 Audio 实测——tut_watch/hint 为旧文案实测，
   新文案 estMs 口径留主线复算；新三条为占位 clip，实长待主线合成后回填）：
   tut_watch 3000（新句 9 字 estMs 3705+300 → 教学延窗 4100）/ tut_turn 1776
   / hint 2232（新句 7 字 estMs 3015）/ right 2472（判对后窗 ≥2772）/ wrong 1752
   / wait 2976；确认链=right 单 clip 窗 2772；
   错链两条同长：wrong 1752+150+estMs(7 字 3015)+300=5217（豁免窗——ch1-2 尾=tt_hint 新句 /
   ch3-4 排序尾=tt_order_wrong 7 字，两链 estMs 同长取一窗，主线复算）；
   抢点链=tt_wait 单发不拼播（2976+300=3276，不设错链豁免窗——抢点不罚不计 miss）；
   兔子浇错=tt_rabbit_wrong 单发（10 字 estMs 4050，纠错回合开放即点不设窗）。
   全部 clip 无 keyless 段（数字/花名零 TTS）——契约 N 天然满足。 ---------- */
const VOICE = {
  watch:      { key: 'tt_tut_watch',   text: '看！给最渴的花浇水' },
  turn:       { key: 'tt_tut_turn',    text: '你来浇一浇' },
  hint:       { key: 'tt_hint',        text: '找找最渴的那盆' },
  right:      { key: 'tt_right',       text: '浇对啦，花开咯' },
  wrong:      { key: 'tt_wrong',       text: '这盆不渴哦' },
  wait:       { key: 'tt_wait',        text: '该小兔子浇啦，等等它' },
  orderHint:  { key: 'tt_order_hint',  text: '按最渴到最不渴的顺序浇' },
  orderWrong: { key: 'tt_order_wrong', text: '先浇更渴的那盆' },
  rabbitWrong:{ key: 'tt_rabbit_wrong',text: '小兔子浇错啦，帮帮它' }
};

/* ---------- 题面句（qbar 文字承载，与语音文案同源） ---------- */
const PROMPT_TEXT = '哪盆花最渴呀？';
const ORDER_PROMPT_TEXT = '按最渴到最不渴的顺序浇';
const WAIT_TEXT = '该小兔子浇啦，等等它';
const WRONG_TEXT = '这盆不太渴哦，找找最渴的那盆';
const ORDER_WRONG_TEXT = '先浇更渴的那盆';
const RIGHT_TEXT = '浇对啦，花开咯';
const RABBIT_TEXT = '轮到小兔子浇啦，等一等';
const RABBIT_WRONG_TEXT = '小兔子浇错啦，帮帮它';

/* ---------- 花盆 SVG（viewBox 0 0 120 150：花头组 data-anim="head"（契约 M 演出锚，
   渴度三档=CSS 姿态类 t1/t2/t3 旋转下垂+叶弯）+ 两叶 .leaf-l/.leaf-r + 花盆；
   土面 .soil（渴度=CSS 填色变浅）+ .cracks 裂纹组（t3 显示——姿态+土色双通道）；
   色款=下标稳定 ---------- */
function flowerSvg(k) {
  const c = FLOWER_KINDS[k];
  const petals = [0, 60, 120, 180, 240, 300].map(a =>
    '<ellipse cx="60" cy="26" rx="12.5" ry="17" fill="' + c.petal + '" stroke="' + INK +
    '" stroke-width="2.4" transform="rotate(' + a + ' 60 44)"/>').join('');
  return '<svg class="plant" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    /* 花头（6 瓣+花心+笑脸） */
    '<g data-anim="head">' + petals +
    '<circle cx="60" cy="44" r="12" fill="' + c.heart + '" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="56" cy="42" r="1.7" fill="' + INK + '"/><circle cx="64" cy="42" r="1.7" fill="' + INK + '"/>' +
    '<path d="M56 47 q4 3.4 8 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '</g>' +
    /* 茎+两叶（渴度越高叶垂越低——CSS 类控） */
    '<path d="M60 56 Q57 84 60 108" stroke="#7BA85C" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse class="leaf leaf-l" cx="46" cy="80" rx="12" ry="6" fill="#9AD37B" stroke="' + INK +
    '" stroke-width="2" transform="rotate(-24 46 80)"/>' +
    '<ellipse class="leaf leaf-r" cx="74" cy="92" rx="12" ry="6" fill="#9AD37B" stroke="' + INK +
    '" stroke-width="2" transform="rotate(24 74 92)"/>' +
    /* 花盆（陶盆+盆沿+土：.soil 渴度填色 + .cracks t3 裂纹） */
    '<path d="M38 108 h44 l-5 34 a5 5 0 0 1 -5 4 h-24 a5 5 0 0 1 -5 -4 Z" fill="#D9885A" stroke="' +
    INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="34" y="102" width="52" height="12" rx="5" fill="#E8A273" stroke="' + INK +
    '" stroke-width="3"/>' +
    '<ellipse class="soil" cx="60" cy="107" rx="17" ry="3.6" fill="#8A5A2B"/>' +
    '<g class="cracks" stroke="#6B4A2F" stroke-width="1.6" stroke-linecap="round" fill="none">' +
    '<path d="M50 105.5 l4 2.4"/><path d="M60 108.6 l5 -1.8"/><path d="M69 105.8 l3.6 2.2"/></g>' +
    '</svg>';
}

/* ---------- 水滴气泡内容（渴度标志：水滴 SVG——三盆都渴都挂，不单独标答案，
   判定材料=姿态+土色梯度本身） ---------- */
const DROP_SVG = '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<path d="M24 6 C24 6 38 24 38 32 a14 14 0 1 1 -28 0 C10 24 24 6 24 6 Z" fill="#9CC6E8" stroke="' +
  INK + '" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M19 33 a6 6 0 0 0 4 6" stroke="#FFF" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';

/* ---------- 浇水壶 SVG（孩子/兔子浇水演出共用；喷水音=Web Audio 合成） ---------- */
const CAN_SVG = '<svg class="can" viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<path d="M30 30 h48 v40 a8 8 0 0 1 -8 8 h-32 a8 8 0 0 1 -8 -8 Z" fill="#8FB4D9" stroke="' + INK +
  '" stroke-width="3.4" stroke-linejoin="round"/>' +
  '<path d="M78 38 L104 24 l4 7 -26 15 Z" fill="#8FB4D9" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
  '<circle cx="48" cy="22" r="7" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
  '<path d="M36 44 h36 v8 h-36 Z" fill="#B7D3EA" stroke="' + INK + '" stroke-width="2.4"/></svg>';

/* ---------- 孩子头像 SVG（双头像指示条左位：圆脸+刘海+笑脸） ---------- */
const KID_AVATAR = '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<circle cx="30" cy="32" r="18" fill="#FFE3C2" stroke="' + INK + '" stroke-width="2.6"/>' +
  '<path d="M13 26 a17 17 0 0 1 34 0 q-6 -6 -17 -4 q-11 2 -17 4 Z" fill="#6B4A2F" stroke="' + INK +
  '" stroke-width="2.4" stroke-linejoin="round"/>' +
  '<circle cx="24" cy="32" r="2.2" fill="' + INK + '"/><circle cx="36" cy="32" r="2.2" fill="' + INK + '"/>' +
  '<path d="M25 39 q5 4 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
  '<circle cx="19" cy="37" r="2.6" fill="#F2B8C6" opacity=".7"/><circle cx="41" cy="37" r="2.6" fill="#F2B8C6" opacity=".7"/></svg>';

/* ---------- 花园背景 SVG（草地+太阳+云+栅栏；根组 g[data-scene="garden"]——契约 M 帧内容锚） ---------- */
const SCENE_INNER =
  '<g data-scene="garden">' +
  '<circle cx="368" cy="46" r="26" fill="#F6C96B" stroke="' + INK + '" stroke-width="3"/>' +
  '<g stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round">' +
  '<path d="M362 20 v-10 M376 22 v-12 M388 34 h11 M390 50 h12"/></g>' +
  '<ellipse cx="80" cy="52" rx="30" ry="13" fill="#FFF9EE" opacity=".9"/>' +
  '<ellipse cx="104" cy="58" rx="22" ry="10" fill="#FFF9EE" opacity=".9"/>' +
  '<ellipse cx="238" cy="34" rx="24" ry="10" fill="#FFF9EE" opacity=".85"/>' +
  '<rect x="0" y="228" width="420" height="92" fill="#DCEEBD"/>' +
  '<path d="M0 232 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 V320 H0 Z" fill="#C8E6A8"/>' +
  '<g stroke="#B98E5E" stroke-width="4">' +
  '<path d="M14 236 v70 M34 236 v70 M406 236 v70 M386 236 v70"/></g>' +
  '<path d="M8 252 h404 M8 282 h404" stroke="#CEA274" stroke-width="5"/>' +
  '<path d="M120 236 q5 -6 10 0 M180 244 q5 -6 10 0 M300 240 q5 -6 10 0 M350 250 q5 -6 10 0" stroke="#A8D284" stroke-width="3" fill="none" stroke-linecap="round"/>' +
  '</g>';
function sceneSvg() {
  return '<svg viewBox="0 0 420 320" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    SCENE_INNER + '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 水壶浇花（轮流浇花主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M16 24 h12 v8 a3 3 0 0 1 -3 3 h-6 a3 3 0 0 1 -3 -3 Z" fill="#8FB4D9" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M28 26 l6 -3 l1.6 3 -6.4 3.4 Z" fill="#8FB4D9" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="22" cy="14" r="4.6" fill="#F2A7C3" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M22 19 v5" stroke="#7BA85C" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M33 16 q2 3 0 5" stroke="#9CC6E8" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
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
