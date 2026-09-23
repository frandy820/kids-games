/* ================= read 阅读小侦探 游戏数据（词表 / 章配置 / 语音文案 / SVG 造型）
   玩法（SPEC-BATCH16 §1）：每题=短文卡（2-3 句小故事，小兔子 IP 主角）+1 问题+3 选项卡。
   读文（点「听读」逐句朗读 TTS 兜底——§0.31 正文豁免 clip）→点选项卡：
   对=短文卡打勾收起+下一题；错=晃动零惩罚可重点+短文关键句高亮一下。
   四章题型：ch1 事实细节（问句=queue 拼 rd_q1+物品词+rd_q1b，答案=颜色词 clip）/
   ch2 顺序因果（rd_q2 先去/rd_q2b 然后去，答案=地点词 clip）/ ch3 简单推断（rd_q3a/b/c
   固定问句，选项=原因短句——词表无原因词 clip，朗读走 KIDS.voice.say TTS 兜底 §0.13）/
   ch4 人物感受（rd_q4a 笑了/rd_q4b 心里想，答案=感受词 clip）。
   §0.31 铁律：正确项在文中唯一成立、两干扰项在文中必不成立——game-verify 自带
   纯文本级判定器（词表副本+模式匹配，禁读 GEN 的 answer 字段自证）分源复算。
   语音与 voice/clips/manifest.json games:['read'] 41 条严格一致（core 3+rd_ 38），
   禁改 key/text。人物 3 词（rd_w_rabbit/cat/bear）为主会话预合成冗余：主角固定小兔子
   （rd_q_* 问句 clip 全部"小兔子"开头锁定），配角名只入短文正文（TTS 朗读），无播放点。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环）
   hint=章末预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '找一找', hint: '读一读句子，答案就藏在里面哦' },
  2: { name: '排一排', hint: '先做什么再做什么，顺序里找答案' },
  3: { name: '想一想', hint: '把两句话合起来，想一想为什么' },
  4: { name: '猜猜心情', hint: '新一轮阅读小侦探' }
};
const GEN_HINTS = ['新故事新问题', '顺序里找答案', '想一想为什么', '当个心情小侦探'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 manifest games:['read'] 条目严格一致，禁改 key/text） ---------- */
const VOICE = {
  watch:  { key: 'rd_tut_watch', text: '看！读一读小故事' },
  turn:   { key: 'rd_tut_turn',  text: '你来当小侦探' },
  hint:   { key: 'rd_hint',      text: '读一读故事想一想' },
  wrong:  { key: 'rd_wrong',     text: '再读一读故事' },   /* sayW 纠错轻语音（flat≥3 10s 节流） */
  right:  { key: 'rd_right',     text: '答对啦，你真会读' },
  listen: { key: 'rd_listen',    text: '我读给你听' }      /* 听读按钮句（正文朗读=TTS 豁免） */
};

/* ---------- 词表（23 词全 clip 化 rd_w_*；cn 与 manifest text 严格一致） ---------- */
const CHAR_IDS = ['rabbit', 'cat', 'bear'];
const PLACE_IDS = ['home', 'park', 'river', 'school', 'shop', 'yard'];
const ITEM_IDS = ['carrot', 'book', 'boots', 'hat', 'kite', 'umbrella'];
const COLOR_IDS = ['red', 'blue', 'green', 'yellow'];
const FEEL_IDS = ['happy', 'sad', 'angry', 'worried'];
const WORDS = {
  rabbit:   { cn: '小兔子', key: 'rd_w_rabbit' },
  cat:      { cn: '小猫',   key: 'rd_w_cat' },
  bear:     { cn: '小熊',   key: 'rd_w_bear' },
  home:     { cn: '家里',   key: 'rd_w_home' },
  park:     { cn: '公园',   key: 'rd_w_park' },
  river:    { cn: '河边',   key: 'rd_w_river' },
  school:   { cn: '学校',   key: 'rd_w_school' },
  shop:     { cn: '商店',   key: 'rd_w_shop' },
  yard:     { cn: '操场',   key: 'rd_w_yard' },
  carrot:   { cn: '萝卜',   key: 'rd_w_carrot' },
  book:     { cn: '书',     key: 'rd_w_book' },
  boots:    { cn: '雨鞋',   key: 'rd_w_boots' },
  hat:      { cn: '帽子',   key: 'rd_w_hat' },
  kite:     { cn: '风筝',   key: 'rd_w_kite' },
  umbrella: { cn: '雨伞',   key: 'rd_w_umbrella' },
  red:      { cn: '红色',   key: 'rd_w_red' },
  blue:     { cn: '蓝色',   key: 'rd_w_blue' },
  green:    { cn: '绿色',   key: 'rd_w_green' },
  yellow:   { cn: '黄色',   key: 'rd_w_yellow' },
  happy:    { cn: '开心',   key: 'rd_w_happy' },
  sad:      { cn: '难过',   key: 'rd_w_sad' },
  angry:    { cn: '生气',   key: 'rd_w_angry' },
  worried:  { cn: '着急',   key: 'rd_w_worried' }
};
/* 颜色视觉（家族色板）；地点/物品/人物另配简笔 SVG（下文 optIcon） */
const COLOR_FILL = { red: '#D9776A', blue: '#6B8CB8', green: '#8FBF7F', yellow: '#F2C03D' };
/* 物品量词 + 持物动词（短文正文用，纯文本无 clip 需求） */
const QUANT = { carrot: '根', book: '本', boots: '双', hat: '顶', kite: '只', umbrella: '把' };
const VERB = { carrot: '拿着', book: '拿着', boots: '穿着', hat: '戴着', kite: '拿着', umbrella: '拿着' };
/* ch2 各地点动作（自由文本；禁含其他地点词，防 verify 文本级判定误匹配） */
const PLACE_ACT = { park: '放风筝', river: '看小鱼', school: '跳绳', shop: '买萝卜', yard: '做游戏' };

/* ---------- 选项卡/问句条 图标（内联简笔 SVG，viewBox 100，无 <text> 防 SVG 尺寸漂移 §0.15） ---------- */
/* 颜色选项卡：大色圆 + 高光 */
function colorDotSvg(id) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<circle cx="50" cy="50" r="34" fill="' + COLOR_FILL[id] + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="38" cy="38" r="9" fill="#FFF9EE" opacity=".55"/></svg>';
}
/* 地点选项卡简笔：home 屋 / park 树 / river 波+鱼 / school 旗屋 / shop 棚店 / yard 球 */
function placeSvg(id) {
  let s = '';
  if (id === 'home') {
    s = '<path d="M22 52 L50 24 L78 52 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="28" y="52" width="44" height="30" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="43" y="62" width="14" height="20" rx="2" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>';
  } else if (id === 'park') {
    s = '<rect x="26" y="58" width="8" height="24" rx="3" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="30" cy="44" r="17" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="62" y="62" width="7" height="20" rx="3" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="65" cy="52" r="13" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4"/>' +
      '<ellipse cx="50" cy="88" rx="34" ry="6" fill="#EFE3CD"/>';
  } else if (id === 'river') {
    s = '<path d="M14 62 q9 -8 18 0 t18 0 t18 0 t18 0" stroke="#6B8CB8" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M14 74 q9 -8 18 0 t18 0 t18 0 t18 0" stroke="#9FB4D3" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="46" cy="36" rx="20" ry="12" fill="#6B8CB8" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M66 36 l14 -9 v18 Z" fill="#6B8CB8" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
      '<circle cx="38" cy="33" r="2.6" fill="' + INK + '"/>';
  } else if (id === 'school') {
    s = '<rect x="24" y="42" width="52" height="40" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M18 42 L50 18 L82 42 Z" fill="#D9776A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<rect x="44" y="54" width="14" height="28" rx="2" fill="#D9776A" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M50 18 v-8 h16 l-5 4 5 4 h-16" fill="#F2C03D" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>';
  } else if (id === 'shop') {
    s = '<path d="M20 40 L26 20 h48 l6 20 Z" fill="#D9776A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M20 40 h60 v6 h-60 Z" fill="#F2C03D" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="26" y="46" width="48" height="40" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="40" y="56" width="20" height="16" rx="2" fill="#9FB4D3" stroke="' + INK + '" stroke-width="3"/>';
  } else {
    s = '<circle cx="50" cy="44" r="22" fill="#F2C03D" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M28 44 q22 -12 44 0 M28 44 q22 12 44 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M14 78 h72 M14 86 h72" stroke="#B9A98F" stroke-width="4" stroke-linecap="round"/>';
  }
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
}
/* 感受选项卡简笔脸：happy 弯眼笑 / sad 泪+下弯 / angry 斜眉 / worried 汗滴 */
function feelSvg(id) {
  const face = '#FDEBD2';
  let s = '<circle cx="50" cy="52" r="32" fill="' + face + '" stroke="' + INK + '" stroke-width="4"/>';
  if (id === 'happy') {
    s += '<path d="M34 46 q5 -7 10 0 M56 46 q5 -7 10 0" stroke="' + INK + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M36 60 q14 12 28 0" stroke="' + INK + '" stroke-width="3.8" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="33" cy="61" rx="4.6" ry="3" fill="#F2B8C6" opacity=".8"/><ellipse cx="67" cy="61" rx="4.6" ry="3" fill="#F2B8C6" opacity=".8"/>';
  } else if (id === 'sad') {
    s += '<circle cx="37" cy="47" r="3.4" fill="' + INK + '"/><circle cx="63" cy="47" r="3.4" fill="' + INK + '"/>' +
      '<path d="M31 40 q6 3 10 1 M69 40 q-6 3 -10 1" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M38 66 q12 -10 24 0" stroke="' + INK + '" stroke-width="3.8" fill="none" stroke-linecap="round"/>' +
      '<path d="M66 52 q5 8 0 11 q-5 -3 0 -11" fill="#9FB4D3" stroke="' + INK + '" stroke-width="2"/>';
  } else if (id === 'angry') {
    s += '<path d="M29 38 l14 7 M71 38 l-14 7" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>' +
      '<circle cx="38" cy="50" r="3.4" fill="' + INK + '"/><circle cx="62" cy="50" r="3.4" fill="' + INK + '"/>' +
      '<path d="M36 68 q14 -8 28 2" stroke="' + INK + '" stroke-width="3.8" fill="none" stroke-linecap="round"/>';
  } else {
    s += '<circle cx="38" cy="48" r="3.6" fill="' + INK + '"/><circle cx="62" cy="48" r="3.6" fill="' + INK + '"/>' +
      '<path d="M40 66 q5 -5 10 0 q5 5 10 0" stroke="' + INK + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M76 34 q6 9 0 13 q-6 -4 0 -13" fill="#9FB4D3" stroke="' + INK + '" stroke-width="2"/>';
  }
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
}
/* 按章取选项卡 icon（ch3 无 icon=纯文字卡） */
function optIcon(dch, optIdxOrWord) {
  if (dch === 1) return colorDotSvg(optIdxOrWord);
  if (dch === 2) return placeSvg(optIdxOrWord);
  if (dch === 4) return feelSvg(optIdxOrWord);
  return '';
}

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  /* logo：放大镜 + 小书本（点题"阅读小侦探"） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="20" width="20" height="16" rx="2.5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M9 24 l6 4 6 -4" stroke="#FFF9EE" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="29" cy="17" r="8.5" fill="#FDEBD2" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M35 23 l5.5 5.5" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/></svg>',
  /* 问句条：小放大镜（侦探找答案） */
  lens: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="27" cy="27" r="14" fill="#FDEBD2" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M37.5 37.5 L50 50" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/></svg>',
  /* 听读键：喇叭+音波+小星（"我读给你听"） */
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  /* 短文卡打勾角标（点对收起视觉） */
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="28" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M19 33 l9 9 l17 -19" stroke="#FFF9EE" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
