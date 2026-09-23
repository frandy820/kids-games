/* ================= whereistand 游戏数据（章配置 / 8 只动物简笔 SVG / 方位词表 / 语音文案 / 图标 / 场景 SVG）
   方位排排队：5 只小动物横排或竖排，题面语音问方位（"谁在最上面呀" / "从左边数，第二个是谁呀"），
   孩子直接点场景中的动物（点场景=方位训练本体，SPEC §1）。
   r33 谱（SPEC-R33-WHEREISTAND）：edge/ordinal 屏幕方位（观察者视角）；two 两步指令（参照+邻位，
   屏幕方位）；flip 参照物翻转=动物自身方位（正面朝观察者，横排镜像/竖排不镜像）——
   SPEC-BATCH9 §1「文案不用它的左边」条款由 SPEC-R33 显式废止（§R1 维度三）。
   序数大字 k 与方向箭头在题面行恒亮（§0.19 训练目标可见）；场景动物卡 = 主答案按钮 ≥96 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%4+1 循环取材）
   r33 谱：ch1 最边上（edge 四向混出，qi0 恒 up）/ ch2 数一数（2 edge+3 ordinal）
   / ch3 转个弯（3 two+2 ordinal）/ ch4 全都要（四型各 ≥1+随机一）
   name 无 UI 引用点（grep 实证仅 .hint 被 nextHint 用）；hint=章末预告下一章文案
   （GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  1: { name: '最边上', hint: '数一数，从哪边数第几个' },
  2: { name: '数一数', hint: '听完再找一找，还要转个弯' },
  3: { name: '转个弯', hint: '小动物自己的左边右边，想一想' },
  4: { name: '全都要', hint: '新一轮方位排排队' }
};
const GEN_HINTS = ['新的方位挑战', '左左右右看一看', '从哪边数第几个', '上下左右都要找'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（7 条 clip 与 voice/clips/manifest.json 严格一致，禁改 key/text）
   edge 题面 = clip 直播；ordinal 题面 = 整句 TTS（方位词+序数组合句 clip 化收益低，§0.13 允许）
   wrong 无 clip → 整句 TTS 兜底（§0.13） */
const VOICE = {
  watch:  { key: 'wis_tut_watch', text: '看！小动物们排好队啦' },
  turn:   { key: 'wis_tut_turn',  text: '你来点一点' },
  hint:   { key: 'wis_hint',      text: '听一听，想一想' },
  q_up:    { key: 'wis_q_up',    text: '谁在最上面呀' },
  q_down:  { key: 'wis_q_down',  text: '谁在最下面呀' },
  q_left:  { key: 'wis_q_left',  text: '谁在最左边呀' },
  q_right: { key: 'wis_q_right', text: '谁在最右边呀' },
  wrong:   { key: 'wis_wrong',    text: '再想一想，它站在哪里呀' }   /* T46 阶段2：keyless 清零 clip 化 */
};

/* ---------- 方位词表：orient 由 dir 推导（up/down=竖排，left/right=横排）
   cn = 方位汉字（ordinal 题面 TTS 拼句用）；q = edge 题面 clip 键；arrow = 题面行箭头图标 */
const DIRS = {
  up:    { cn: '上', orient: 'vert',  q: 'q_up',    arrow: 'arrowUp' },
  down:  { cn: '下', orient: 'vert',  q: 'q_down',  arrow: 'arrowDown' },
  left:  { cn: '左', orient: 'horiz', q: 'q_left',  arrow: 'arrowLeft' },
  right: { cn: '右', orient: 'horiz', q: 'q_right', arrow: 'arrowRight' }
};

/* ---------- 中文数词（ordinal 题面 TTS 用，k∈1-5；verify 用独立字表对账零手抄） */
const NUMCN5 = ['', '一', '二', '三', '四', '五'];
/* ordinal 题面整句：'从左边数，第二个是谁呀'（与 SPEC §1 例句逐字一致） */
const ordinalCn = (dir, k) => '从' + DIRS[dir].cn + '边数，第' + NUMCN5[k] + '个是谁呀';

/* ---------- r33 新题型题面链（two 两步指令 / flip 参照物翻转，SPEC-R33 §R10）
   两段 clip 链（段间 150ms=子句停顿，r31 neb_dual 先例）：two=[wis2_from_d_k, wis2_go_d2]、
   flip=[wis2_name_a, wis2_side_d2]；开场链再前置 wis_hint。
   ★ 过渡态声明：28 键主线 gen_clips 注册前不在 manifest——core queue 缺 clip 且无文本=放弃整句，
   链在 hint 段后静默终止（console.warn 非 pageerror）；视觉/交互/演出/救援不受影响（§R10）。
   WIS2_TEXTS 供 gen_clips 正则提取与 manifest 对账（SPEC-BATCH9 §0.18 零手抄，禁手抄键名） */
const WIS2 = {
  fromKey: (dir, k) => 'wis2_from_' + dir + '_' + k,
  goKey: (dir2) => 'wis2_go_' + dir2,
  nameKey: (id) => 'wis2_name_' + id,
  sideKey: (dir2) => 'wis2_side_' + dir2
};
/* two/flip 题面整句（aria 与对账用；与链段文本拼接句一致） */
const twoCn = (dir, k, dir2) =>
  '从' + DIRS[dir].cn + '边数，第' + NUMCN5[k] + '个，它的' + DIRS[dir2].cn + '边，是谁呀';
const flipCn = (name, dir2) => name + '的' + DIRS[dir2].cn + '边，是谁呀';

/* ---------- 动物库 8 只（SPEC §1：特征鲜明 兔长耳/猫须/狗垂耳/熊圆/象鼻/猴脸/蛙鼓眼/鸭扁嘴）
   每只一段内联简笔 SVG（viewBox 100；无 <text> 防 SVG 尺寸漂移 §0.15）；data-a 供 verify 对账 */
const ANIMALS = {
  rabbit:   { name: '小兔子' },
  cat:      { name: '小猫咪' },
  dog:      { name: '小狗' },
  bear:     { name: '小熊' },
  elephant: { name: '大象' },
  monkey:   { name: '小猴子' },
  frog:     { name: '小青蛙' },
  duck:     { name: '小鸭子' }
};
const ANIMAL_IDS = Object.keys(ANIMALS);
/* WIS2_TEXTS 须在 ANIMALS 声明后求值（const TDZ），故置于此（SPEC-R33 §R10 清单的代码真值源） */
const WIS2_TEXTS = (function () {
  const dirs = ['up', 'down', 'left', 'right'];   // data 先于 engine 加载，勿引用 ALL_DIRS（verify ⑥ 对账）
  const t = [];
  dirs.forEach(d => [2, 3, 4].forEach(k =>
    t.push([WIS2.fromKey(d, k), '从' + DIRS[d].cn + '边数，第' + NUMCN5[k] + '个'])));
  dirs.forEach(d => t.push([WIS2.goKey(d), '它的' + DIRS[d].cn + '边，是谁呀']));
  ANIMAL_IDS.forEach(id => t.push([WIS2.nameKey(id), ANIMALS[id].name]));
  dirs.forEach(d => t.push([WIS2.sideKey(d), '的' + DIRS[d].cn + '边，是谁呀']));
  return t;
})();   /* 12 from + 4 go + 8 name + 4 side = 28 键（verify ⑥ 断言长度与样例） */

function animalSvg(id) {
  const blush = '<ellipse cx="29" cy="69" rx="4.2" ry="2.9" fill="#F2B8C6" opacity=".8"/>' +
    '<ellipse cx="71" cy="69" rx="4.2" ry="2.9" fill="#F2B8C6" opacity=".8"/>';
  const eyes = (y) => '<circle cx="41" cy="' + y + '" r="3" fill="' + INK + '"/>' +
    '<circle cx="59" cy="' + y + '" r="3" fill="' + INK + '"/>';
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
  } else if (id === 'dog') {                        // 棕 + 两侧垂耳 + 浅色鼻吻
    s = '<ellipse cx="26" cy="52" rx="9" ry="19" fill="#B98A5E" stroke="' + INK + '" stroke-width="3" transform="rotate(15 26 52)"/>' +
      '<ellipse cx="74" cy="52" rx="9" ry="19" fill="#B98A5E" stroke="' + INK + '" stroke-width="3" transform="rotate(-15 74 52)"/>' +
      '<circle cx="50" cy="60" r="26" fill="#D9A66C" stroke="' + INK + '" stroke-width="3"/>' +
      eyes(55) + '<ellipse cx="50" cy="68" rx="10.5" ry="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<ellipse cx="50" cy="65" rx="4" ry="3.2" fill="' + INK + '"/>' +
      '<path d="M50 69 v2.5 M50 71.5 q-4 4 -7 1 M50 71.5 q4 4 7 1" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' + blush;
  } else if (id === 'bear') {                       // 深棕 + 圆耳圆头圆吻
    s = '<circle cx="31" cy="37" r="10" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="69" cy="37" r="10" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="31" cy="37" r="4.5" fill="#ECD9BC"/><circle cx="69" cy="37" r="4.5" fill="#ECD9BC"/>' +
      '<circle cx="50" cy="62" r="27" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
      eyes(57) + '<ellipse cx="50" cy="69" rx="11" ry="8.5" fill="#ECD9BC" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<ellipse cx="50" cy="65.5" rx="4" ry="3" fill="' + INK + '"/>' +
      '<path d="M50 69 v2.5 M50 71.5 q-3.5 3.5 -6.5 1 M50 71.5 q3.5 3.5 6.5 1" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' + blush;
  } else if (id === 'elephant') {                   // 灰蓝 + 两侧大耳 + 长鼻下垂
    s = '<ellipse cx="25" cy="52" rx="12" ry="16" fill="#AFC2D8" stroke="' + INK + '" stroke-width="3" transform="rotate(13 25 52)"/>' +
      '<ellipse cx="75" cy="52" rx="12" ry="16" fill="#AFC2D8" stroke="' + INK + '" stroke-width="3" transform="rotate(-13 75 52)"/>' +
      '<circle cx="50" cy="56" r="26" fill="#AFC2D8" stroke="' + INK + '" stroke-width="3"/>' +
      eyes(51) + '<path d="M50 57 q1 15 -6 25 q-2 3.5 1.5 4" fill="none" stroke="' + INK + '" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M50 57 q1 15 -6 25 q-2 3.5 1.5 4" fill="none" stroke="#AFC2D8" stroke-width="4" stroke-linecap="round"/>' + blush;
  } else if (id === 'monkey') {                     // 棕黄 + 圆耳 + 心形浅脸 + 呆毛
    s = '<circle cx="25" cy="58" r="8.5" fill="#D9A66C" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="75" cy="58" r="8.5" fill="#D9A66C" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="50" cy="60" r="26" fill="#D9A66C" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M34 55 q16 -12 32 0 q-2 23 -16 25 q-14 -2 -16 -25 Z" fill="#F3E3C6" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      eyes(58) + '<path d="M43 70 q7 5.5 14 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M50 34 q-3 -8 3 -10" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' + blush;
  } else if (id === 'frog') {                       // 绿 + 头顶两只鼓眼 + 长嘴
    s = '<circle cx="35" cy="27" r="11" fill="#9CCB7A" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="65" cy="27" r="11" fill="#9CCB7A" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="35" cy="26" r="4.8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="65" cy="26" r="4.8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="35" cy="27" r="2.2" fill="' + INK + '"/><circle cx="65" cy="27" r="2.2" fill="' + INK + '"/>' +
      '<ellipse cx="50" cy="62" rx="29" ry="24" fill="#9CCB7A" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="45" cy="54" r="1.7" fill="' + INK + '"/><circle cx="55" cy="54" r="1.7" fill="' + INK + '"/>' +
      '<path d="M32 64 q18 12 36 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' + blush;
  } else if (id === 'duck') {                       // 黄 + 橙扁嘴 + 呆毛
    s = '<circle cx="50" cy="58" r="26" fill="#F7D977" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M50 32 q-2 -9 5 -11" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      eyes(52) + '<ellipse cx="50" cy="64" rx="13" ry="6.5" fill="#F0A24B" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<path d="M38.5 68.5 q11.5 7 23 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' + blush;
  }
  return '<svg data-a="' + id + '" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + s + '</svg>';
}

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙·灰蓝方位双色） ---------- */
const ICONS = {
  /* logo：四向小罗盘（上下左右四个小箭头，点题方位） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M22 15 V8 M18.5 11 L22 7 L25.5 11" stroke="#E8975A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M22 29 V36 M18.5 33 L22 37 L25.5 33" stroke="#6B8CB8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M15 22 H8 M11 18.5 L7 22 L11 25.5" stroke="#E8975A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M29 22 H36 M33 18.5 L37 22 L33 25.5" stroke="#6B8CB8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="22" cy="22" r="3" fill="' + INK + '"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 方向箭头：上/左 = 暖橙（起点向），下/右 = 灰蓝（与 batch8 up1/down1 双色同源） */
  arrowUp: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 33 V9 M9 18 L20 7 L31 18" stroke="#E8975A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowDown: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 7 V31 M9 22 L20 33 L31 22" stroke="#6B8CB8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowLeft: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M33 20 H9 M18 9 L7 20 L18 31" stroke="#E8975A" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowRight: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M7 20 H31 M22 9 L33 20 L22 31" stroke="#6B8CB8" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* r33 flip 题面行：双向箭头（↔/↕）——携带「相对它而言的哪一边」之问而不指向任一侧
     （单向箭头=把镜像答案画在题面；中性 INK 色区别于方向箭头双色，SPEC-R33 §R1 维度三） */
  mirrorH: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 20 H32 M17 10 L7 20 L17 30 M23 10 L33 20 L23 30" stroke="' + INK +
    '" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mirrorV: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 8 V32 M10 17 L20 7 L30 17 M10 23 L20 33 L30 23" stroke="' + INK +
    '" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/* ---------- 草地场景背景（低干扰，pointer-events:none）：天空 + 太阳 + 云 + 彩旗 + 远树 + 草地 ---------- */
function sceneSvg() {
  let s = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  s += '<rect width="1000" height="600" fill="#CBE7F0"/>';
  s += '<circle cx="906" cy="72" r="38" fill="#F7D977" opacity=".9"/>';
  s += '<circle cx="906" cy="72" r="52" fill="#F7D977" opacity=".25"/>';
  const cloud = (x, y, k) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')" opacity=".92">' +
    '<ellipse cx="60" cy="30" rx="52" ry="20" fill="#FFF"/>' +
    '<ellipse cx="38" cy="20" rx="26" ry="16" fill="#FFF"/><ellipse cx="82" cy="20" rx="22" ry="14" fill="#FFF"/></g>';
  s += cloud(70, 56, .9) + cloud(430, 36, 1.1) + cloud(740, 96, .75);
  const flag = (x, k) =>                                 // 顶部彩旗串（排队庆祝感，纯装饰）
    '<g transform="translate(' + x + ' 40)"><path d="M0 26 L26 26 L13 6 Z" fill="' + ['#E8975A', '#8FBF7F', '#F5C445', '#9FB4C7'][k % 4] +
    '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" opacity=".85"/></g>';
  s += '<path d="M0 52 Q250 84 500 52 Q750 84 1000 52" stroke="#C9BDA8" stroke-width="3.5" fill="none" opacity=".8"/>';
  for (let i = 0; i < 8; i++) s += flag(20 + i * 128 + (i % 2 ? 18 : 0), i);
  const tree = (x, y, k) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
    '<rect x="-5" y="-24" width="10" height="26" rx="3" fill="#B08A5E"/>' +
    '<circle cx="0" cy="-38" r="24" fill="#AFCF9C"/><circle cx="-17" cy="-28" r="16" fill="#AFCF9C"/>' +
    '<circle cx="17" cy="-28" r="16" fill="#AFCF9C"/></g>';
  s += tree(26, 592, .95) + tree(972, 596, 1) + tree(84, 594, .6) + tree(918, 590, .65);
  s += '<rect y="566" width="1000" height="34" fill="#DCEDD2"/>';
  s += '<path d="M0 566 Q250 556 500 566 Q750 576 1000 566 V600 H0 Z" fill="#E4F1DA"/>';
  return s + '</svg>';
}
