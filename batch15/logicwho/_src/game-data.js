/* ================= logicwho 逻辑三人组 游戏数据（动物/帽色/物品表 / 章配置 / 语音文案 / SVG 造型）
   玩法（SPEC-BATCH15 §2）：三个座位排排坐——座位上戴着帽子（ch4 还拿着物品，属性可见），
   但住着谁（兔子/猫咪/熊的排列）是隐藏的谜底。孩子读 2-3 条线索推出"戴 X 帽子的座位
   住的是谁"，点下方动物卡作答；点对=座位揭幕+动物跳一下，点错=晃动+关键线索卡高亮一下。
   观察者视角（承 batch9 whereistand 定版）："左边"=屏幕左；"X 住在 Y 左边"=相邻左（X 在 Y
   的左侧紧挨着）。§0.29 命门：线索组自洽且问句答案恰一解（6 排列穷举）——game-core 生成门
   + game-verify 独立穷举双保险。
   语音（§0.23）：问句=封闭 6 条全 clip（帽色 3+物品 3）；线索句=queue 拼接（lgw_c_* 单元
   +色词/物品词/动物名，共 20 条段 clip，文本与语音段严格同源——verify 用独立段表对账）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环）
   ch1 一条正线索（直接型）/ ch2 一正一负（排除型）/ ch3 相对+绝对位置+一负（先定位置）
   / ch4 帽色×物品双属性交叉
   hint=章末预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '一条线索', hint: '两条线索一起用，有的说不是哦' },
  2: { name: '一正一负', hint: '小动物们排队啦，谁在谁的左边' },
  3: { name: '排排队',   hint: '帽子加宝贝，两样一起看' },
  4: { name: '两样宝贝', hint: '新一轮逻辑小侦探' }
};
const GEN_HINTS = ['新的线索挑战', '正话反话一起听', '排排队找位置', '两样宝贝一起想'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（4 条短句 clip 与 voice/clips/manifest.json 严格一致，禁改 key/text） ---------- */
const VOICE = {
  watch: { key: 'lgw_tut_watch', text: '看！小线索有大秘密' },
  turn:  { key: 'lgw_tut_turn',  text: '你来想一想' },
  hint:  { key: 'lgw_hint',      text: '听一听线索想一想' },
  wrong: { key: 'lgw_wrong',     text: '再听一听线索' }   /* sayW 纠错轻语音（flat≥3 10s 节流） */
};

/* ---------- 动物 3 只（家族造型承 whereistand 同款：兔长耳/猫须/熊圆） ---------- */
const ANIMALS = {
  rabbit: { name: '小兔', key: 'lgw_n_tu' },
  cat:    { name: '小猫', key: 'lgw_n_mao' },
  bear:   { name: '小熊', key: 'lgw_n_xiong' }
};
const ANIMAL_IDS = ['rabbit', 'cat', 'bear'];

/* ---------- 帽色 3 色（座位可见属性一：帽子） ---------- */
const HATS = {
  red:    { cn: '红', key: 'lgw_red',    fill: '#D9776A', rim: '#E8A79B' },
  yellow: { cn: '黄', key: 'lgw_yellow', fill: '#F2C03D', rim: '#F7DA8A' },
  blue:   { cn: '蓝', key: 'lgw_blue',   fill: '#6B8CB8', rim: '#9FB4D3' }
};
const HAT_IDS = ['red', 'yellow', 'blue'];

/* ---------- 物品 3 种（ch4 座位可见属性二） ---------- */
const ITEMS = {
  ball:     { cn: '球',   key: 'lgw_ball' },
  book:     { cn: '书',   key: 'lgw_book' },
  umbrella: { cn: '雨伞', key: 'lgw_umbrella' }
};
const ITEM_IDS = ['ball', 'book', 'umbrella'];

/* ---------- 问句（封闭 6 条全 clip：帽色 3 + 物品 3；上屏文本带问号） ---------- */
const ASKS = {};
HAT_IDS.forEach(function (h) {
  ASKS[h] = { kind: 'hat', value: h, key: 'lgw_q_' + h, text: '戴' + HATS[h].cn + '帽子的是谁呀？' };
});
ITEM_IDS.forEach(function (t) {
  ASKS[t] = { kind: 'item', value: t, key: 'lgw_q_' + t, text: '拿着' + ITEMS[t].cn + '的是谁呀？' };
});

/* ---------- 动物造型（内联简笔 SVG，viewBox 100，无 <text> 防 SVG 尺寸漂移 §0.15） ---------- */
function animalSvg(id) {
  const blush = '<ellipse cx="29" cy="69" rx="4.2" ry="2.9" fill="#F2B8C6" opacity=".8"/>' +
    '<ellipse cx="71" cy="69" rx="4.2" ry="2.9" fill="#F2B8C6" opacity=".8"/>';
  const eyes = function (y) {
    return '<circle cx="41" cy="' + y + '" r="3" fill="' + INK + '"/>' +
      '<circle cx="59" cy="' + y + '" r="3" fill="' + INK + '"/>';
  };
  let s = '';
  if (id === 'rabbit') {                            // 白 + 两根竖长耳（粉内耳）
    s = '<ellipse cx="37" cy="24" rx="9" ry="19" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(-9 37 24)"/>' +
      '<ellipse cx="63" cy="24" rx="9" ry="19" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(9 63 24)"/>' +
      '<ellipse cx="37" cy="26" rx="4" ry="12" fill="#F2B8C6" transform="rotate(-9 37 26)"/>' +
      '<ellipse cx="63" cy="26" rx="4" ry="12" fill="#F2B8C6" transform="rotate(9 63 26)"/>' +
      '<circle cx="50" cy="63" r="26" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
      eyes(59) + '<ellipse cx="50" cy="67" rx="3.5" ry="2.8" fill="#E88A8A"/>' +
      '<path d="M50 70 q0 4 -5 5 M50 70 q0 4 5 5" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' + blush;
  } else if (id === 'cat') {                        // 橘 + 三角耳 + 六根胡须
    s = '<path d="M31 40 L25 13 L48 29 Z" fill="#F5C77E" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M69 40 L75 13 L52 29 Z" fill="#F5C77E" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="50" cy="62" r="26" fill="#F5C77E" stroke="' + INK + '" stroke-width="3"/>' +
      eyes(58) + '<path d="M46 66 l4 3.5 l4 -3.5" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M21 59 h-9 M22 67 l-8 4 M79 59 h9 M78 67 l8 4" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' + blush;
  } else {                                          // bear 深棕 + 圆耳圆头圆吻
    s = '<circle cx="31" cy="37" r="10" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="69" cy="37" r="10" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="31" cy="37" r="4.5" fill="#ECD9BC"/><circle cx="69" cy="37" r="4.5" fill="#ECD9BC"/>' +
      '<circle cx="50" cy="62" r="27" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
      eyes(57) + '<ellipse cx="50" cy="69" rx="11" ry="8.5" fill="#ECD9BC" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<ellipse cx="50" cy="65.5" rx="4" ry="3" fill="' + INK + '"/>' +
      '<path d="M50 69 v2.5 M50 71.5 q-3.5 3.5 -6.5 1 M50 71.5 q3.5 3.5 6.5 1" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' + blush;
  }
  return '<svg data-a="' + id + '" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
}

/* ---------- 帽子（座位可见属性一的视觉：软顶帽+帽檐+绒球） ---------- */
function hatSvg(id, h) {
  h = h || 58;
  const w = Math.round(h * 100 / 64);
  const C = HATS[id];
  return '<svg data-hat="' + id + '" viewBox="0 0 100 64" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M30 47 Q50 6 70 47 Z" fill="' + C.fill + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M44 22 q6 -5 12 0" stroke="#FFF9EE" stroke-width="3" fill="none" stroke-linecap="round" opacity=".65"/>' +
    '<rect x="22" y="45" width="56" height="13" rx="6.5" fill="' + C.rim + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="50" cy="9" r="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/></svg>';
}

/* ---------- 神秘住客（座位未揭幕时的"?"身体） ---------- */
function mysterySvg() {
  return '<svg viewBox="0 0 100 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="50" cy="88" rx="30" ry="7" fill="#EFE3CD"/>' +
    '<path d="M20 88 q0 -46 30 -46 q30 0 30 46 Z" fill="#F6EDE0" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M38 38 q0 -13 11 -13 q11 0 11 10 q0 7 -8 10 q-6 2.5 -6 9" fill="none" stroke="#B9A98F" stroke-width="6.5" stroke-linecap="round"/>' +
    '<circle cx="46" cy="66" r="4.6" fill="#B9A98F"/></svg>';
}

/* ---------- 物品（ch4 座位可见属性二的视觉） ---------- */
function itemSvg(id, h) {
  h = h || 44;
  let s = '';
  if (id === 'ball') {
    s = '<circle cx="50" cy="52" r="30" fill="#F5C445" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M20 52 q30 -15 60 0 M20 52 q30 15 60 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".7"/>';
  } else if (id === 'book') {
    s = '<rect x="24" y="24" width="52" height="54" rx="6" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M36 26 v50" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<path d="M44 40 h22 M44 52 h22 M44 64 h14" stroke="#FFF9EE" stroke-width="4" stroke-linecap="round"/>';
  } else {
    s = '<path d="M17 52 Q50 16 83 52 Z" fill="#E88A8A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M17 52 q8 -7 16.5 0 q8 -7 16.5 0 q8 -7 16.5 0 q8 -7 16.5 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 52 v20 q0 9 -11 9" fill="none" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<circle cx="50" cy="14" r="4" fill="' + INK + '"/>';
  }
  return '<svg data-item="' + id + '" viewBox="0 0 100 100" width="' + h + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
}

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  /* logo：三顶小帽排排坐 + 问号（点题"谁戴着哪顶帽子"） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 26 L13 12 L18 26 Z" fill="#D9776A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M18 26 L23 10 L28 26 Z" fill="#F2C03D" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M28 26 L33 12 L38 26 Z" fill="#6B8CB8" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<rect x="5" y="26" width="36" height="6" rx="3" fill="#EFE3CD" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M35 8 q0 -4 3.5 -4 q3.5 0 3.5 3 q0 2.5 -3 3.5" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="39" cy="14" r="1.4" fill="' + INK + '"/></svg>',
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
