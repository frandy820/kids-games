/* ================= story3 故事排序 游戏数据（故事库 / 章配置 / 语音文案 / 帧场景 SVG / 图标）
   玩法（SPEC-R34-STORY3 定稿；SPEC-BATCH25 §0.58/§1 旧文由 r34 版本块接替）：
   题面 = 乱序漫画帧卡 + 语音「按顺序讲讲这个故事」；上方编号槽位条，逐槽点击：
   点对当前槽正确帧 = 飞入槽 + 轻音 + 卡槽点亮；自有帧点错 = 该卡摇头 + 非泄序
   反馈（sto_hint 题面级重定向，r34 起方位语义 wFirst/wMid 退休——3 帧下排除法泄
   首尾帧）+ miss+1；干扰帧（dch≥2 每题 1 张，pos=-1 不属于本故事）点任何槽=错 +
   sto_w_out 成员性反馈；三槽全对 = 故事完整亮起 + 复述 TTS（连接词按帧数）+
   sto_right + celebrate；dch3/4 qi1/qi3 完成后追加因果问句（why 两选一文字卡）。
   故事库封闭 12 故事，帧数 3/4/5（r34 扩帧：ch1×3、ch2×4、ch3×5；表外不出题；
   同故事帧互异可视觉分辨）：
     ch1 生活 routine：wake 起床 / meal 吃饭 / laundry 洗衣服 / night 睡觉前
     ch2 自然因果：seed 种花 / cate 毛毛虫变蝴蝶 / rain 下雨 / chick 小鸡出壳
     ch3 时间线（早-中-晚-夜五步）：sunwalk / bird / meals / shadow
   出题乱序确定性 seeded（自有子列禁恒正序，恒等确定翻「交换前二」）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 场景调色板（帧内小场景共用；暖浅底基调） */
const SC = {
  day:  '#E3F1F8',  // 白天天空（浅蓝）
  warm: '#FDF1DA',  // 暖米（清晨/室内）
  eve:  '#F7E2CB',  // 傍晚暖橙
  dusk: '#EBDFF0',  // 入夜前淡紫
  grey: '#E6E9E8',  // 阴天
  wall: '#FFF6E3',  // 室内墙
  grass:'#DCE9C6',  // 草地
  soil: '#C9A26B',  // 泥土
  wood: '#B98A5C',  // 木色
  white:'#FFFDF7',
  leaf: '#9CCB7A'
};

/* ---------- 帧 SVG 外壳（viewBox 0 0 120 90，圆角卡内场景） */
const F = (inner, bg) => '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<rect x="2" y="2" width="116" height="86" rx="8" fill="' + (bg || SC.day) + '" stroke="' + INK + '" stroke-width="3"/>' +
  inner + '</svg>';

/* ---------- 场景小件（字符串拼装，确定性零 JS 运行时计算误差以外的状态） */
function sunEl(x, y, r, c) {                     // 太阳 + 8 短光线
  let rays = '';
  for (let k = 0; k < 8; k++) {
    const a = Math.PI * k / 4;
    rays += '<line x1="' + (x + Math.cos(a) * (r + 3)).toFixed(1) + '" y1="' + (y + Math.sin(a) * (r + 3)).toFixed(1) +
            '" x2="' + (x + Math.cos(a) * (r + 7)).toFixed(1) + '" y2="' + (y + Math.sin(a) * (r + 7)).toFixed(1) +
            '" stroke="#E8975A" stroke-width="2.2" stroke-linecap="round"/>';
  }
  return '<g><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + (c || '#F5C445') + '" stroke="' + INK + '" stroke-width="2.2"/>' + rays + '</g>';
}
const moonEl = (x, y) => '<g transform="translate(' + x + ' ' + y + ')">' +
  '<path d="M3.5 -8 a8.5 8.5 0 1 0 0 17 a6 8.5 0 1 1 0 -17 Z" fill="#F8E9B0" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="13" cy="-7" r="1.5" fill="' + INK + '"/><circle cx="16" cy="1" r="1.1" fill="' + INK + '"/></g>';
const cloudEl = (x, y, s, c) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')" fill="' + (c || SC.white) + '" stroke="' + INK + '" stroke-width="2.2">' +
  '<ellipse cx="-12" cy="4" rx="10" ry="6.5"/><ellipse cx="2" cy="0" rx="13" ry="9"/><ellipse cx="15" cy="5" rx="9" ry="6"/></g>';
const rainEl = (x, y, n, c) => {                 // 斜雨线一排
  let s = '';
  for (let k = 0; k < n; k++) s += '<line x1="' + (x + k * 11) + '" y1="' + y + '" x2="' + (x - 3 + k * 11) + '" y2="' + (y + 10) +
    '" stroke="' + (c || '#7FA8D0') + '" stroke-width="2.3" stroke-linecap="round"/>';
  return s;
};
const groundEl = (c) => '<path d="M4 76 Q60 70 116 76 L116 86 Q60 81 4 86 Z" fill="' + (c || SC.grass) + '"/>';
const winEl = (x, y, inner) => '<g><rect x="' + x + '" y="' + y + '" width="36" height="27" rx="3" fill="#DFF0F7" stroke="' + INK + '" stroke-width="2.4"/>' +
  '<line x1="' + (x + 18) + '" y1="' + y + '" x2="' + (x + 18) + '" y2="' + (y + 27) + '" stroke="' + INK + '" stroke-width="1.6"/>' +
  '<line x1="' + x + '" y1="' + (y + 13.5) + '" x2="' + (x + 36) + '" y2="' + (y + 13.5) + '" stroke="' + INK + '" stroke-width="1.6"/>' +
  '<g clip-path="none">' + inner + '</g></g>';
/* 小丫（主角女孩）：丸子头 + 三角裙；dress=裙色 */
function girlEl(x, y, s, dress, armUp) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
    '<path d="M-5 30 V37 M5 30 V37" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M-8 8 L8 8 L12 30 L-12 30 Z" fill="' + dress + '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M-8 10 L-14 ' + (armUp ? 2 : 18) + ' M8 10 L14 ' + (armUp ? 2 : 18) + '" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="0" cy="-4" r="9.5" fill="#FBE8D8" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M-9.5 -4 q0 -10 9.5 -10 q9.5 0 9.5 10 q-4.5 -5 -9.5 -5 q-5 0 -9.5 5 Z" fill="#5B4636"/>' +
    '<circle cx="-9" cy="-7" r="3.4" fill="#5B4636"/><circle cx="9" cy="-7" r="3.4" fill="#5B4636"/>' +
    '<circle cx="-3.4" cy="-3" r="1.5" fill="' + INK + '"/><circle cx="3.4" cy="-3" r="1.5" fill="' + INK + '"/>' +
    '<path d="M-2.6 1.6 q2.6 2.4 5.2 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/></g>';
}
const birdEl = (x, y, s, c) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
  '<ellipse cx="0" cy="0" rx="9" ry="7" fill="' + (c || '#4E8FD0') + '" stroke="' + INK + '" stroke-width="2.2"/>' +
  '<circle cx="-7" cy="-5" r="5.5" fill="' + (c || '#4E8FD0') + '" stroke="' + INK + '" stroke-width="2.2"/>' +
  '<path d="M-12 -5 L-16 -3.5 L-12 -2 Z" fill="#F0904A" stroke="' + INK + '" stroke-width="1.6"/>' +
  '<circle cx="-8" cy="-6" r="1.2" fill="' + INK + '"/>' +
  '<path d="M8 -2 L15 -6 M8 0 L15 2" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/></g>';
const chickEl = (x, y, s, awake) => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
  '<ellipse cx="0" cy="2" rx="8" ry="7" fill="#F8D873" stroke="' + INK + '" stroke-width="2.2"/>' +
  '<circle cx="0" cy="-6" r="6" fill="#F8D873" stroke="' + INK + '" stroke-width="2.2"/>' +
  (awake ? '<circle cx="-2.2" cy="-7" r="1.1" fill="' + INK + '"/><circle cx="2.2" cy="-7" r="1.1" fill="' + INK + '"/>'
         : '<path d="M-3.4 -7 q1.2 1.2 2.4 0 M1 -7 q1.2 1.2 2.4 0" stroke="' + INK + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>') +
  '<path d="M-1.6 -4.4 L0 -3 L1.6 -4.4" stroke="' + INK + '" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>';

/* ---------- 故事库（封闭 12；s=三帧复述句（先/然后/最后拼句用）；art=三帧场景 SVG（互异） */
const STORY_LIB = {
  /* ===== ch1 生活 routine ===== */
  wake: { ch: 1, n: '起床三步', s: ['小丫睡醒了坐起来', '小丫拿起牙刷刷牙', '小丫背上书包上幼儿园'], why: { q0: '睡醒起床', a: '睡醒了才有精神', b: '被子最暖和' }, art: [
    /* f0 坐起来：晨窗 + 小床 + 坐起的小丫 */
    F(winEl(10, 12, sunEl(20, 24, 4.5)) +
      '<rect x="50" y="38" width="7" height="32" rx="3" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<rect x="55" y="54" width="56" height="16" rx="6" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="60" y="48" width="16" height="10" rx="4" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M78 54 h28 v8 h-28 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2" opacity=".9"/>' +
      girlEl(88, 42, 0.72, '#E8975A') +
      '<circle cx="46" cy="72" r="6" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<line x1="46" y1="66" x2="46" y2="62" stroke="' + INK + '" stroke-width="1.8"/><line x1="46" y1="72" x2="42" y2="72" stroke="' + INK + '" stroke-width="1.8"/>', SC.wall),
    /* f1 刷牙：镜柜 + 小丫刷牙 */
    F('<ellipse cx="32" cy="36" rx="15" ry="19" fill="#DFF0F7" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<path d="M24 34 q8 -8 16 0" stroke="#BFD8E8" stroke-width="2.4" fill="none"/>' +
      '<rect x="24" y="62" width="20" height="8" rx="4" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M34 62 V52 q0 -5 6 -5 h6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      girlEl(76, 44, 0.95, '#7FC8C0') +
      '<line x1="63" y1="38" x2="54" y2="34" stroke="' + SC.wood + '" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="49" y="31" width="7" height="7" rx="2" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="41" cy="30" r="1.6" fill="' + INK + '"/><circle cx="45" cy="27" r="1.2" fill="' + INK + '"/>', SC.wall),
    /* f2 上幼儿园：太阳 + 幼儿园 + 背书包的小丫 */
    F(sunEl(18, 18, 7) +
      '<polygon points="56,30 86,12 112,30" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<rect x="58" y="30" width="52" height="30" rx="3" fill="' + SC.wall + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="76" y="42" width="15" height="18" rx="2" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="88" cy="51" r="1.6" fill="' + INK + '"/>' +
      '<line x1="66" y1="38" x2="66" y2="44" stroke="' + INK + '" stroke-width="2"/><circle cx="66" cy="36" r="3" fill="#E06055"/>' +
      '<rect x="16" y="50" width="9" height="13" rx="2.5" fill="#4E8FD0" stroke="' + INK + '" stroke-width="2"/>' +
      girlEl(30, 48, 0.9, '#E8975A') +
      '<circle cx="14" cy="78" r="2.4" fill="#F2A0B5"/><circle cx="24" cy="80" r="2.2" fill="#F5C445"/><circle cx="52" cy="79" r="2.4" fill="#F2A0B5"/>' +
      groundEl(), SC.day)
  ]},
  meal: { ch: 1, n: '吃饭三步', s: ['小丫先去洗小手', '小丫坐在桌前吃饭', '小丫吃饱了擦擦嘴'], why: { q0: '去洗手', a: '洗了手才干净', b: '水龙头最好玩' }, art: [
    /* f0 洗手：水池 + 水流 + 小丫 */
    F('<rect x="26" y="52" width="58" height="14" rx="7" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M44 52 V40 q0 -6 7 -6 h7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<line x1="58" y1="44" x2="58" y2="51" stroke="#7FA8D0" stroke-width="2.6" stroke-linecap="round"/>' +
      '<line x1="53" y1="45" x2="53" y2="51" stroke="#7FA8D0" stroke-width="2.2" stroke-linecap="round"/>' +
      '<line x1="63" y1="45" x2="63" y2="51" stroke="#7FA8D0" stroke-width="2.2" stroke-linecap="round"/>' +
      girlEl(58, 32, 0.7, '#F5C445') +
      '<circle cx="50" cy="74" r="2" fill="#7FA8D0"/><circle cx="58" cy="77" r="1.6" fill="#7FA8D0"/><circle cx="66" cy="73" r="2" fill="#7FA8D0"/>', SC.wall),
    /* f1 吃饭：餐桌 + 冒热气的饭碗 + 小丫 */
    F('<rect x="14" y="60" width="92" height="9" rx="4" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<line x1="24" y1="69" x2="24" y2="80" stroke="' + INK + '" stroke-width="3"/><line x1="96" y1="69" x2="96" y2="80" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M32 52 a13 9 0 0 0 26 0 Z" fill="#4E8FD0" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="45" cy="52" rx="13" ry="4.5" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M42 44 q-2 -5 0 -9 M49 44 q2 -5 0 -9" stroke="#B9C4B0" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      girlEl(82, 40, 0.8, '#57B368') +
      '<line x1="70" y1="50" x2="62" y2="56" stroke="' + SC.wood + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="60" cy="58" rx="4" ry="3" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="1.8"/>', SC.wall),
    /* f2 擦嘴：空碗 + 小丫拿餐巾 + 干净星星 */
    F('<rect x="14" y="66" width="92" height="9" rx="4" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M22 58 a10 7 0 0 0 20 0 Z" fill="#4E8FD0" stroke="' + INK + '" stroke-width="2"/>' +
      girlEl(62, 44, 1, '#57B368', true) +
      '<rect x="47" y="34" width="12" height="11" rx="2" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2" transform="rotate(-18 53 40)"/>' +
      '<path d="M88 24 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<path d="M34 26 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.2"/>', SC.wall)
  ]},
  laundry: { ch: 1, n: '洗衣服', s: ['把脏衣服放进洗衣机', '把衣服晾到竹竿上', '衣服晒干叠得整整齐齐'], why: { q0: '放进洗衣机', a: '脏衣服要先洗', b: '洗衣机声音好听' }, art: [
    /* f0 洗衣机 + 脏衣堆 */
    F('<rect x="22" y="24" width="46" height="48" rx="6" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<circle cx="45" cy="52" r="13" fill="#DFF0F7" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="41" cy="50" r="2.6" fill="' + SC.white + '" stroke="#9FC0D4" stroke-width="1.4"/>' +
      '<circle cx="49" cy="55" r="3.4" fill="' + SC.white + '" stroke="#9FC0D4" stroke-width="1.4"/>' +
      '<circle cx="47" cy="46" r="2" fill="' + SC.white + '" stroke="#9FC0D4" stroke-width="1.4"/>' +
      '<circle cx="31" cy="32" r="2.4" fill="#E8975A" stroke="' + INK + '" stroke-width="1.6"/><circle cx="39" cy="32" r="2.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<path d="M80 58 q4 -9 12 -8 q9 1 8 8 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M76 66 q3 -7 10 -6 q7 1 7 6 Z" fill="#4E8FD0" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M82 74 q3 -6 9 -5 q6 1 6 5 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>', SC.wall),
    /* f1 晾衣绳：太阳 + 竹竿 + 三件晾着的衣服 */
    F(sunEl(20, 16, 6.5) +
      '<line x1="20" y1="72" x2="20" y2="32" stroke="' + SC.wood + '" stroke-width="4"/><line x1="100" y1="72" x2="100" y2="32" stroke="' + SC.wood + '" stroke-width="4"/>' +
      '<path d="M20 36 Q60 48 100 36" stroke="' + INK + '" stroke-width="2.4" fill="none"/>' +
      '<rect x="34" y="42" width="16" height="15" rx="3" fill="#E06055" stroke="' + INK + '" stroke-width="2"/><line x1="42" y1="41" x2="42" y2="38" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M56 46 h14 v4 l-2 12 h-10 l-2 -12 Z" fill="#57B368" stroke="' + INK + '" stroke-width="2"/><line x1="63" y1="45" x2="63" y2="42" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M80 44 q0 -3 4 -3 q4 0 4 3 v10 q0 8 -4 12 q-4 -4 -4 -12 Z" fill="#4E8FD0" stroke="' + INK + '" stroke-width="2"/><line x1="84" y1="43" x2="84" y2="40" stroke="' + INK + '" stroke-width="2"/>' +
      groundEl(), SC.day),
    /* f2 叠好的衣服塔 + 洗衣篮 */
    F(winEl(10, 12, sunEl(20, 24, 4.5)) +
      '<rect x="26" y="56" width="34" height="20" rx="4" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M26 62 h34 M26 68 h34" stroke="#C77A42" stroke-width="1.8"/>' +
      '<rect x="62" y="52" width="34" height="7" rx="3" fill="#4E8FD0" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="64" y="45" width="30" height="7" rx="3" fill="#57B368" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="66" y="38" width="26" height="7" rx="3" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="68" y="31" width="22" height="7" rx="3" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M96 76 l2 4 4 .6 -3 3 .8 4 -3.8 -2 -3.8 2 .8 -4 -3 -3 4 -.6 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.2"/>', SC.wall)
  ]},
  night: { ch: 1, n: '睡觉前', s: ['小丫洗了个香香澡', '妈妈讲睡前故事', '小丫钻进被窝睡着了'], why: { q0: '洗香香澡', a: '洗干净睡得香', b: '泡泡最多' }, art: [
    /* f0 泡泡浴缸 + 小黄鸭 */
    F('<rect x="22" y="44" width="66" height="28" rx="13" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<rect x="26" y="48" width="58" height="14" rx="8" fill="#BFE3F0"/>' +
      '<circle cx="38" cy="52" r="3.4" fill="' + SC.white + '" stroke="#9FC0D4" stroke-width="1.4"/>' +
      '<circle cx="48" cy="56" r="4.4" fill="' + SC.white + '" stroke="#9FC0D4" stroke-width="1.4"/>' +
      '<circle cx="58" cy="51" r="2.8" fill="' + SC.white + '" stroke="#9FC0D4" stroke-width="1.4"/>' +
      girlEl(46, 30, 0.6, '#F2A0B5') +
      '<ellipse cx="78" cy="50" rx="5" ry="4" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/><circle cx="80" cy="45" r="3" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M14 26 q3 0 3 3 M104 22 q3 0 3 3 M96 30 q2.6 0 2.6 2.6" stroke="#BFD8E8" stroke-width="2.2" fill="none" stroke-linecap="round"/>', SC.wall),
    /* f1 床 + 妈妈 + 故事书 + 落地灯 */
    F('<rect x="48" y="52" width="60" height="15" rx="6" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="52" y="47" width="15" height="9" rx="4" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="60" cy="44" r="6.5" fill="#FBE8D8" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M-9.5 0 q0 -7 9.5 -7 q9.5 0 9.5 7 q-4.5 -3.5 -9.5 -3.5 q-5 0 -9.5 3.5 Z" fill="#5B4636" transform="translate(60 44)"/>' +
      '<path d="M68 55 h36 v7 h-36 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2"/>' +
      girlEl(96, 32, 0.9, '#9B7ED8') +
      '<path d="M78 50 l8 -4 8 4 -8 4 Z" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2" transform="rotate(-14 86 50)"/>' +
      '<line x1="30" y1="72" x2="30" y2="44" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<polygon points="22,44 38,44 34,32 26,32" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>', SC.wall),
    /* f2 月窗 + 被窝里睡着的小丫 */
    F(winEl(10, 12, moonEl(20, 24)) +
      '<circle cx="40" cy="20" r="1.4" fill="' + INK + '"/><circle cx="44" cy="30" r="1.1" fill="' + INK + '"/>' +
      '<rect x="44" y="54" width="64" height="16" rx="6" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="48" y="49" width="15" height="9" rx="4" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="56" cy="46" r="6.5" fill="#FBE8D8" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M-9.5 0 q0 -7 9.5 -7 q9.5 0 9.5 7 q-4.5 -3.5 -9.5 -3.5 q-5 0 -9.5 3.5 Z" fill="#5B4636" transform="translate(56 46)"/>' +
      '<path d="M52.6 46.4 q1.4 1.4 2.8 0 M57.6 46.4 q1.4 1.4 2.8 0" stroke="' + INK + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M64 52 h40 v9 h-40 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M92 34 q4 1 4 5 M98 28 q5 2 5 7" stroke="#BFD8E8" stroke-width="2" fill="none" stroke-linecap="round"/>', SC.dusk)
  ]},
  /* ===== ch2 自然因果 ===== */
  seed: { ch: 2, n: '种花', s: ['把种子种进土里', '种子发芽了', '长出小花苞', '开出漂亮的花'], why: { q0: '把种子种下', a: '种子先发芽', b: '小猫饿了' }, art: [
    /* f0 种进土里 + 浇水壶 */
    F(sunEl(20, 16, 6) +
      '<path d="M28 68 Q60 60 92 68 L92 80 Q60 74 28 80 Z" fill="' + SC.soil + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="58" cy="67" rx="3.4" ry="4.4" fill="#8A6B4A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<rect x="72" y="36" width="20" height="16" rx="4" fill="#7FC8C0" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M72 44 L60 40" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M78 30 q4 -4 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none"/>' +
      '<line x1="62" y1="46" x2="60" y2="53" stroke="#7FA8D0" stroke-width="2.2" stroke-linecap="round"/>' +
      '<line x1="67" y1="48" x2="66" y2="55" stroke="#7FA8D0" stroke-width="2.2" stroke-linecap="round"/>' +
      '<line x1="57" y1="48" x2="57" y2="55" stroke="#7FA8D0" stroke-width="2.2" stroke-linecap="round"/>', SC.day),
    /* f1 发芽小苗 */
    F(sunEl(20, 16, 6) + cloudEl(88, 22, 0.8) +
      '<rect x="30" y="62" width="60" height="12" rx="6" fill="' + SC.soil + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M60 62 V44" stroke="#57B368" stroke-width="3.4" stroke-linecap="round"/>' +
      '<ellipse cx="51" cy="42" rx="7" ry="4" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="2" transform="rotate(-24 51 42)"/>' +
      '<ellipse cx="69" cy="42" rx="7" ry="4" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="2" transform="rotate(24 69 42)"/>' +
      '<line x1="46" y1="56" x2="50" y2="52" stroke="#57B368" stroke-width="2.2" stroke-linecap="round"/>' +
      '<line x1="74" y1="56" x2="70" y2="52" stroke="#57B368" stroke-width="2.2" stroke-linecap="round"/>', SC.day),
    /* f2 长出小花苞（r34 扩帧：茎叶加高+顶端粉苞绿萼） */
    F(sunEl(20, 16, 6) + cloudEl(88, 22, 0.7) +
      '<path d="M60 76 V40" stroke="#57B368" stroke-width="3.4" stroke-linecap="round"/>' +
      '<ellipse cx="50" cy="60" rx="8" ry="4.4" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="2" transform="rotate(-28 50 60)"/>' +
      '<ellipse cx="70" cy="66" rx="8" ry="4.4" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="2" transform="rotate(28 70 66)"/>' +
      '<path d="M60 40 q-7 -3 -7 -11 q0 -8 7 -9 q7 1 7 9 q0 8 -7 11 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M52 38 q3 4 8 4 q5 0 8 -4" stroke="#57B368" stroke-width="3" fill="none" stroke-linecap="round"/>', SC.day),
    /* f3 开花 + 蝴蝶 */
    F(sunEl(20, 16, 6) +
      '<path d="M60 76 V38" stroke="#57B368" stroke-width="3.4" stroke-linecap="round"/>' +
      '<ellipse cx="50" cy="58" rx="8" ry="4.4" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="2" transform="rotate(-28 50 58)"/>' +
      '<ellipse cx="70" cy="64" rx="8" ry="4.4" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="2" transform="rotate(28 70 64)"/>' +
      '<circle cx="60" cy="30" r="5" fill="#E06055" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="49" cy="34" r="5" fill="#E06055" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="71" cy="34" r="5" fill="#E06055" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="52" cy="23" r="5" fill="#E06055" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="68" cy="23" r="5" fill="#E06055" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="60" cy="28.5" r="4.4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<ellipse cx="94" cy="52" rx="5" ry="8" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2" transform="rotate(-30 94 52)"/>' +
      '<ellipse cx="104" cy="52" rx="5" ry="8" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2" transform="rotate(30 104 52)"/>' +
      '<line x1="99" y1="44" x2="99" y2="60" stroke="' + INK + '" stroke-width="2.2"/><path d="M99 44 l-3 -5 M99 44 l3 -5" stroke="' + INK + '" stroke-width="1.6"/>' +
      groundEl(), SC.day)
  ]},
  cate: { ch: 2, n: '毛毛虫变蝴蝶', s: ['毛毛虫大口吃叶子', '吐出细丝挂枝头', '结成硬硬的茧', '飞出小蝴蝶'], why: { q0: '吃叶子', a: '吃饱才有力气结茧', b: '叶子最绿' }, art: [
    /* f0 大叶子上的毛毛虫（叶有咬口） */
    F('<path d="M18 66 Q60 58 104 64" stroke="' + SC.wood + '" stroke-width="3" fill="none"/>' +
      '<ellipse cx="56" cy="54" rx="30" ry="16" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M28 56 Q56 50 84 54" stroke="#7BAA5C" stroke-width="1.8" fill="none"/>' +
      '<circle cx="86" cy="46" r="5" fill="#E3F1F8" stroke="' + INK + '" stroke-width="2"/><circle cx="34" cy="46" r="4" fill="#E3F1F8" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="42" cy="52" r="5.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="51" cy="50" r="5.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="60" cy="49" r="5.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="68" cy="51" r="5.4" fill="#F8D873" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="66" cy="50" r="1.2" fill="' + INK + '"/><circle cx="71" cy="50" r="1.2" fill="' + INK + '"/>' +
      '<path d="M67 45 l-2 -4 M70 45 l2 -4" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
      sunEl(20, 16, 5.5), SC.day),
    /* f1 吐出细丝挂枝头（r34 扩帧：毛毛虫吊在丝上+吐丝圈） */
    F(sunEl(20, 16, 5.5) +
      '<path d="M14 30 Q60 42 108 26" stroke="' + SC.wood + '" stroke-width="4" fill="none"/>' +
      '<line x1="62" y1="38" x2="62" y2="50" stroke="#D8C9B4" stroke-width="2"/>' +
      '<g transform="translate(62 56)">' +
      '<circle cx="-12" cy="-2" r="5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="-4" cy="0" r="5.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="4" cy="0" r="5.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="12" cy="-2" r="5.6" fill="#F8D873" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="10" cy="-3" r="1.1" fill="' + INK + '"/><circle cx="15" cy="-3" r="1.1" fill="' + INK + '"/>' +
      '<path d="M11 -8 l-1.6 -3.6 M14 -8 l1.6 -3.6" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/></g>' +
      '<path d="M46 52 q8 -5 16 0 q8 5 16 -2" stroke="#D8C9B4" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".9"/>' +
      cloudEl(92, 18, 0.7), SC.day),
    /* f2 枝上挂茧 */
    F(sunEl(20, 16, 5.5) +
      '<path d="M14 30 Q60 42 108 26" stroke="' + SC.wood + '" stroke-width="4" fill="none"/>' +
      '<line x1="60" y1="40" x2="60" y2="46" stroke="' + INK + '" stroke-width="2"/>' +
      '<ellipse cx="60" cy="58" rx="9" ry="13" fill="' + SC.soil + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M52 52 q8 -3 16 0 M52 60 q8 3 16 0" stroke="#A98551" stroke-width="1.8" fill="none"/>' +
      '<path d="M46 66 q-4 4 -2 8 M74 66 q4 4 2 8" stroke="#D8C9B4" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      cloudEl(92, 18, 0.7), SC.day),
    /* f3 蝴蝶飞出 + 空茧壳 */
    F(sunEl(18, 16, 6) +
      '<ellipse cx="58" cy="38" rx="3.2" ry="11" fill="#6B4F3A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<ellipse cx="48" cy="34" rx="9" ry="12" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-22 48 34)"/>' +
      '<ellipse cx="68" cy="34" rx="9" ry="12" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2" transform="rotate(22 68 34)"/>' +
      '<ellipse cx="50" cy="48" rx="6.5" ry="8.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2" transform="rotate(-30 50 48)"/>' +
      '<ellipse cx="66" cy="48" rx="6.5" ry="8.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2" transform="rotate(30 66 48)"/>' +
      '<path d="M56 27 l-4 -6 M60 27 l4 -6" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>' +
      '<circle cx="52" cy="21" r="1.3" fill="' + INK + '"/><circle cx="64" cy="21" r="1.3" fill="' + INK + '"/>' +
      '<path d="M88 66 q0 -9 9 -9 q9 0 9 9 q0 4 -4 6 l-10 0 q-4 -2 -4 -6 Z" fill="#E8DCC8" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M97 57 l-3 5 3 5 3 -5 Z" fill="#FDF1DA" stroke="' + INK + '" stroke-width="1.6"/>' +
      groundEl(), SC.day)
  ]},
  rain: { ch: 2, n: '下雨了', s: ['乌云飘来天变阴', '大雨哗哗落下来', '雨点落进池塘里', '雨停了出彩虹'], why: { q0: '乌云飘来', a: '先有云才会下雨', b: '云朵像棉花糖' }, art: [
    /* f0 乌云飘来（r34 扩帧：仅阴云+风线，雨未落） */
    F(cloudEl(40, 24, 1.2, '#C7CFD2') + cloudEl(80, 36, 0.85, '#C7CFD2') +
      '<path d="M16 48 q10 -4 20 0 M86 52 q10 -4 20 0" stroke="#9FB4BE" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="60" cy="76" rx="30" ry="5" fill="#A8CBE0" stroke="' + INK + '" stroke-width="1.8"/>', SC.grey),
    /* f1 乌云 + 大雨 */
    F(cloudEl(48, 26, 1.35, '#C7CFD2') +
      rainEl(26, 42, 7) +
      '<ellipse cx="60" cy="76" rx="30" ry="5" fill="#A8CBE0" stroke="' + INK + '" stroke-width="1.8"/>', SC.grey),
    /* f2 雨点落池塘（涟漪） */
    F(cloudEl(34, 18, 0.9, '#C7CFD2') +
      rainEl(30, 30, 6) +
      '<ellipse cx="60" cy="64" rx="38" ry="12" fill="#A8CBE0" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="46" cy="64" rx="9" ry="3.4" fill="none" stroke="#7FA8D0" stroke-width="1.8"/>' +
      '<ellipse cx="72" cy="66" rx="12" ry="4.4" fill="none" stroke="#7FA8D0" stroke-width="1.8"/>' +
      '<circle cx="52" cy="48" r="1.8" fill="#7FA8D0"/><circle cx="66" cy="44" r="1.8" fill="#7FA8D0"/><circle cx="58" cy="54" r="1.4" fill="#7FA8D0"/>', SC.grey),
    /* f3 彩虹 + 太阳 */
    F('<path d="M22 78 A38 38 0 0 1 98 78" stroke="#E06055" stroke-width="6" fill="none"/>' +
      '<path d="M28 78 A32 32 0 0 1 92 78" stroke="#F5C445" stroke-width="6" fill="none"/>' +
      '<path d="M34 78 A26 26 0 0 1 86 78" stroke="#8FBF7F" stroke-width="6" fill="none"/>' +
      sunEl(102, 20, 6.5) +
      '<circle cx="20" cy="72" r="2.6" fill="#F2A0B5"/><circle cx="30" cy="76" r="2.2" fill="#F5C445"/><circle cx="92" cy="76" r="2.6" fill="#F2A0B5"/>' +
      groundEl(), SC.day)
  ]},
  chick: { ch: 2, n: '小鸡出壳', s: ['母鸡妈妈在孵蛋', '蛋壳裂开一道缝', '小鸡钻出来了', '跟着妈妈找虫子'], why: { q0: '母鸡孵蛋', a: '孵一孵小鸡才出来', b: '蛋壳最圆' }, art: [
    /* f0 母鸡孵蛋 */
    F(sunEl(20, 16, 5.5) +
      '<ellipse cx="52" cy="50" rx="18" ry="14" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="36" cy="42" r="7" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M33 36 q1.5 -4 3.5 -1 M37 34 q1.5 -4 3.5 -1 M41 35 q1.5 -4 3.5 -1" stroke="#E06055" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M30 43 L25 44.5 L30 46 Z" fill="#F0904A" stroke="' + INK + '" stroke-width="1.5"/>' +
      '<circle cx="34.5" cy="41" r="1.4" fill="' + INK + '"/>' +
      '<path d="M40 46 q8 -6 16 0" stroke="#D8C9B4" stroke-width="2.2" fill="none"/>' +
      '<path d="M66 42 q8 -8 12 -2" stroke="#D8C9B4" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M36 64 v6 M48 64 v6" stroke="#F0904A" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M30 68 q22 -8 44 0 l-4 8 q-18 -6 -36 0 Z" fill="' + SC.soil + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="80" cy="66" rx="6" ry="8" fill="' + SC.wall + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<ellipse cx="90" cy="63" rx="5" ry="7" fill="' + SC.wall + '" stroke="' + INK + '" stroke-width="2"/>' +
      groundEl(), SC.day),
    /* f1 蛋壳裂开一道缝（r34 扩帧：巢中单蛋+锯齿裂缝） */
    F(sunEl(20, 16, 5.5) +
      '<path d="M36 66 a24 10 0 0 1 48 0 Z" fill="#E8DCC8" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="60" cy="58" rx="17" ry="21" fill="' + SC.wall + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M46 52 l5 4 5 -4 5 4 5 -4 5 4 4 -4" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M54 44 q6 -3 12 0" stroke="#D8C9B4" stroke-width="2" fill="none"/>' +
      groundEl(), SC.day),
    /* f2 破壳探头 */
    F(sunEl(20, 16, 5.5) +
      '<path d="M40 74 a20 9 0 0 1 40 0 Z" fill="#E8DCC8" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M38 62 a22 16 0 0 1 44 0 l-4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 -4 4 -4 -4 Z" fill="' + SC.wall + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M46 48 l4 -6 4 6 4 -6 4 6 4 -6 4 6" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
      chickEl(60, 36, 1, true) +
      '<path d="M30 30 q6 -6 12 0 M80 26 q6 -6 12 0" stroke="#F8D873" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      groundEl(), SC.day),
    /* f3 小鸡跟妈妈走 */
    F(sunEl(20, 16, 5.5) +
      '<ellipse cx="34" cy="50" rx="14" ry="11" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="22" cy="43" r="5.5" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M17 47 L13 48 L17 49.4 Z" fill="#F0904A" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<circle cx="21" cy="42" r="1.2" fill="' + INK + '"/>' +
      '<path d="M46 44 q7 -6 10 -1" stroke="#D8C9B4" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M28 61 v5 M38 61 v5" stroke="#F0904A" stroke-width="2.2" stroke-linecap="round"/>' +
      chickEl(62, 56, 0.95, true) + chickEl(80, 62, 0.85, true) +
      '<path d="M92 74 q3 -3 6 0 q3 -3 6 0" stroke="#E0A0A8" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M14 74 q3 -4 6 0 M48 78 q3 -4 6 0" stroke="#7BAA5C" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      groundEl(), SC.day)
  ]},
  /* ===== ch3 时间线（早-中-晚） ===== */
  sunwalk: { ch: 3, n: '太阳的一天', s: ['早上太阳升起来', '上午太阳爬高了', '中午太阳当头顶', '下午太阳偏西了', '傍晚太阳落下山'], why: { q0: '太阳升起', a: '一天从早上开始', b: '太阳最亮' }, art: [
    /* f0 早上：低太阳从山后升起 */
    F(sunEl(26, 58, 9, '#F0904A') +
      '<path d="M4 70 Q30 56 60 68 Q90 56 116 70 L116 86 L4 86 Z" fill="' + SC.grass + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M76 30 q5 -5 10 0 M92 36 q5 -5 10 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>', SC.warm),
    /* f1 上午：太阳升高偏左（r34 扩帧） */
    F(sunEl(34, 30, 9, '#F5C445') +
      '<path d="M4 70 Q30 56 60 68 Q90 56 116 70 L116 86 L4 86 Z" fill="' + SC.grass + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M70 34 q5 -5 10 0 M86 40 q5 -5 10 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>', SC.day),
    /* f2 中午：太阳当头 + 大树 + 短影 */
    F(sunEl(60, 18, 10) +
      '<line x1="88" y1="72" x2="88" y2="42" stroke="' + SC.wood + '" stroke-width="5"/>' +
      '<circle cx="88" cy="34" r="13" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="88" cy="74" rx="9" ry="3" fill="#C9B393"/>' +
      '<path d="M4 76 Q30 68 60 74 Q90 68 116 76 L116 86 L4 86 Z" fill="' + SC.grass + '"/>', SC.day),
    /* f3 下午：太阳偏西渐橙（r34 扩帧） */
    F(sunEl(86, 32, 9, '#F0A84F') +
      '<path d="M4 70 Q30 56 60 68 Q90 56 116 70 L116 86 L4 86 Z" fill="' + SC.grass + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M24 34 q5 -5 10 0 M40 40 q5 -5 10 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="20" cy="20" r="1.4" fill="' + INK + '"/>', SC.day),
    /* f4 傍晚：太阳落山 + 星星 */
    F(sunEl(94, 60, 9, '#E8975A') +
      '<path d="M4 70 Q30 56 60 68 Q90 56 116 70 L116 86 L4 86 Z" fill="' + SC.grass + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<circle cx="20" cy="18" r="1.6" fill="' + INK + '"/><circle cx="30" cy="26" r="1.2" fill="' + INK + '"/><circle cx="16" cy="34" r="1.2" fill="' + INK + '"/>' +
      moonEl(38, 16), SC.eve)
  ]},
  bird: { ch: 3, n: '小鸟的一天', s: ['清晨小鸟在唱歌', '早上飞去找到虫', '中午妈妈喂宝宝', '下午练习飞翔', '晚上回巢睡觉'], why: { q0: '清晨唱歌', a: '小鸟早上先醒来', b: '歌声最好听' }, art: [
    /* f0 清晨唱歌（音符） */
    F(sunEl(22, 62, 7, '#F0904A') +
      '<path d="M4 78 Q30 68 60 74 Q90 68 116 78 L116 86 L4 86 Z" fill="' + SC.grass + '"/>' +
      '<path d="M16 56 Q60 64 108 52" stroke="' + SC.wood + '" stroke-width="4" fill="none"/>' +
      birdEl(50, 44, 1, '#4E8FD0') +
      '<circle cx="72" cy="30" r="2.6" fill="' + INK + '"/><line x1="74.6" y1="30" x2="74.6" y2="21" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="86" cy="24" r="2.2" fill="' + INK + '"/><line x1="88.2" y1="24" x2="88.2" y2="16.5" stroke="' + INK + '" stroke-width="1.8"/>', SC.warm),
    /* f1 早上飞出去找到虫（r34 扩帧：飞行+衔虫+速度线） */
    F(sunEl(22, 62, 7, '#F0904A') +
      '<path d="M4 78 Q30 68 60 74 Q90 68 116 78 L116 86 L4 86 Z" fill="' + SC.grass + '"/>' +
      '<path d="M16 56 Q60 64 108 52" stroke="' + SC.wood + '" stroke-width="4" fill="none"/>' +
      '<g transform="translate(62 32) rotate(-10)">' + birdEl(0, 0, 1.05, '#4E8FD0') +
      '<path d="M-15 -6 q-6 2 -5 7 q1 4 6 3" stroke="#E0A0A8" stroke-width="3" fill="none" stroke-linecap="round"/></g>' +
      '<path d="M34 26 h10 M30 34 h8 M90 20 h9" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" opacity=".55"/>', SC.warm),
    /* f2 中午喂宝宝 */
    F(sunEl(98, 18, 6.5) +
      '<path d="M14 40 Q60 50 108 36" stroke="' + SC.wood + '" stroke-width="3.4" fill="none"/>' +
      '<path d="M34 56 q26 18 52 0 l-6 -4 h-40 Z" fill="#C9A26B" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M40 58 q16 10 40 0" stroke="#A98551" stroke-width="1.8" fill="none"/>' +
      '<circle cx="48" cy="48" r="6.5" fill="#F8D873" stroke="' + INK + '" stroke-width="2"/><path d="M45 45 L42 41 L46 43 Z M51 45 L54 41 L50 43 Z" fill="#F0904A" stroke="' + INK + '" stroke-width="1.2"/>' +
      '<circle cx="72" cy="48" r="6.5" fill="#F8D873" stroke="' + INK + '" stroke-width="2"/><path d="M69 45 L66 41 L70 43 Z M75 45 L78 41 L74 43 Z" fill="#F0904A" stroke="' + INK + '" stroke-width="1.2"/>' +
      birdEl(60, 22, 0.9, '#E8975A') +
      '<path d="M70 28 q3 2 6 0 q3 -2 5 1" stroke="#E0A0A8" stroke-width="2.2" fill="none" stroke-linecap="round"/>', SC.day),
    /* f3 下午练习飞翔（r34 扩帧：巢沿小鸟张翅+汗星） */
    F(sunEl(98, 18, 6.5) +
      '<path d="M14 40 Q60 50 108 36" stroke="' + SC.wood + '" stroke-width="3.4" fill="none"/>' +
      '<path d="M34 56 q26 18 52 0 l-6 -4 h-40 Z" fill="#C9A26B" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M44 62 q14 9 32 0" stroke="#A98551" stroke-width="1.8" fill="none"/>' +
      '<path d="M48 44 q-9 -6 -14 -2 M72 44 q9 -6 14 -2" stroke="#F0904A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      chickEl(60, 48, 1, true) +
      '<path d="M42 32 q4 -6 8 0 q4 -6 8 0" stroke="#BFD8E8" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<path d="M88 34 l1.4 3.4 3.4 1.4 -3.4 1.4 -1.4 3.4 -1.4 -3.4 -3.4 -1.4 3.4 -1.4 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.2"/>', SC.day),
    /* f4 晚上回巢睡觉 */
    F(moonEl(94, 18) +
      '<circle cx="22" cy="16" r="1.5" fill="' + INK + '"/><circle cx="32" cy="24" r="1.2" fill="' + INK + '"/><circle cx="16" cy="32" r="1.2" fill="' + INK + '"/>' +
      '<path d="M14 38 Q60 48 108 34" stroke="' + SC.wood + '" stroke-width="3.4" fill="none"/>' +
      '<path d="M34 54 q26 18 52 0 l-6 -4 h-40 Z" fill="#B08A5E" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M42 56 q14 9 36 0" stroke="#8F6C46" stroke-width="1.8" fill="none"/>' +
      chickEl(52, 46, 0.8, false) + chickEl(68, 46, 0.8, false) +
      birdEl(88, 30, 0.7, '#4E8FD0'), SC.dusk)
  ]},
  meals: { ch: 3, n: '三顿饭', s: ['早上吃面包牛奶', '上午吃水果点心', '中午吃米饭青菜', '下午吃块小饼干', '晚上喝热粥'], why: { q0: '早上吃饭', a: '一天从早饭开始', b: '面包最甜' }, art: [
    /* f0 早餐：晨窗 + 面包 + 牛奶 */
    F(winEl(8, 10, sunEl(18, 22, 4.5, '#F0904A')) +
      '<rect x="14" y="62" width="92" height="9" rx="4" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="52" cy="56" r="10" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="52" cy="53" rx="8" ry="4.4" fill="#E8B36A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M49 51.5 q3 -2 6 0" stroke="#C98F4A" stroke-width="1.4" fill="none"/>' +
      '<rect x="70" y="46" width="11" height="15" rx="2" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="71.5" y="51" width="8" height="8.5" fill="#F6F0E2"/>' +
      '<line x1="74" y1="46" x2="79" y2="40" stroke="#E06055" stroke-width="2.2" stroke-linecap="round"/>', SC.warm),
    /* f1 上午点心：晨窗 + 苹果 + 香蕉（r34 扩帧） */
    F(winEl(8, 10, sunEl(18, 22, 4.5, '#F0904A')) +
      '<rect x="14" y="62" width="92" height="9" rx="4" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="46" cy="54" r="8.5" fill="#E8606A" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<line x1="46" y1="45" x2="46" y2="41" stroke="' + SC.wood + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<ellipse cx="51" cy="42" rx="4.5" ry="2.4" fill="' + SC.leaf + '" stroke="' + INK + '" stroke-width="1.6" transform="rotate(-18 51 42)"/>' +
      '<path d="M64 56 q10 7 21 -1 q-1 9 -12 9 q-8 0 -9 -8 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="40" cy="28" r="1.3" fill="' + INK + '"/>', SC.warm),
    /* f2 午餐：午窗 + 米饭 + 青菜 */
    F(winEl(8, 10, sunEl(18, 22, 4.5)) +
      '<rect x="14" y="62" width="92" height="9" rx="4" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M36 56 a13 8 0 0 0 26 0 Z" fill="#4E8FD0" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="49" cy="55" rx="13" ry="4.4" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="44" cy="52" r="2" fill="' + SC.white + '"/><circle cx="50" cy="51" r="2.2" fill="' + SC.white + '"/><circle cx="55" cy="53" r="1.8" fill="' + SC.white + '"/>' +
      '<path d="M76 56 q-6 -10 0 -14 q6 4 0 14 Z" fill="#9CCB7A" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M84 56 q-5 -8 0 -11 q5 3 0 11 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>', SC.day),
    /* f3 下午点心：午窗 + 牛奶 + 两块饼干（r34 扩帧） */
    F(winEl(8, 10, sunEl(18, 22, 4.5)) +
      '<rect x="14" y="62" width="92" height="9" rx="4" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="44" cy="53" r="7.5" fill="#D9A05B" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="42" cy="51" r="1" fill="' + INK + '"/><circle cx="47" cy="53" r="1" fill="' + INK + '"/><circle cx="43" cy="56" r="1" fill="' + INK + '"/>' +
      '<circle cx="60" cy="56" r="6.5" fill="#D9A05B" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="59" cy="55" r="1" fill="' + INK + '"/><circle cx="62" cy="57" r="1" fill="' + INK + '"/>' +
      '<rect x="76" y="42" width="11" height="16" rx="2" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="2"/>' +
      '<rect x="77.5" y="47" width="8" height="9" fill="#F6F0E2"/>', SC.day),
    /* f4 晚餐：夜窗 + 热粥 */
    F(winEl(8, 10, moonEl(18, 22)) +
      '<circle cx="38" cy="18" r="1.3" fill="' + INK + '"/><circle cx="42" cy="30" r="1.1" fill="' + INK + '"/>' +
      '<rect x="14" y="62" width="92" height="9" rx="4" fill="' + SC.wood + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M42 56 a13 8 0 0 0 26 0 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="55" cy="55.5" rx="13" ry="4.4" fill="#F6EAD4" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M50 47 q-2 -5 0 -9 M60 47 q2 -5 0 -9" stroke="#D8C9B4" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '<line x1="76" y1="52" x2="86" y2="44" stroke="' + SC.wood + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<ellipse cx="88" cy="42.5" rx="4" ry="3" fill="' + SC.white + '" stroke="' + INK + '" stroke-width="1.8"/>', SC.dusk)
  ]},
  shadow: { ch: 3, n: '影子变变变', s: ['早上影子长长的', '上午影子短一点', '中午影子最短了', '下午影子变长了', '傍晚影子最长'], why: { q0: '早上影子长', a: '太阳低影子就长', b: '影子最黑' }, art: [
    /* f0 早上：太阳低左 + 长影向右 */
    F(sunEl(20, 24, 8, '#F0904A') +
      '<path d="M4 80 Q60 74 116 80 L116 86 L4 86 Z" fill="' + SC.grass + '"/>' +
      girlEl(64, 44, 0.9, '#E8975A') +
      '<ellipse cx="92" cy="79" rx="26" ry="4" fill="#C9B393"/>', SC.warm),
    /* f1 上午：太阳升高 + 影子变短（r34 扩帧） */
    F(sunEl(32, 20, 8.5, '#F0904A') +
      '<path d="M4 80 Q60 74 116 80 L116 86 L4 86 Z" fill="' + SC.grass + '"/>' +
      girlEl(62, 44, 0.9, '#E8975A') +
      '<ellipse cx="84" cy="79" rx="17" ry="3.6" fill="#C9B393"/>', SC.day),
    /* f2 中午：太阳当头 + 短影脚边 */
    F(sunEl(60, 16, 9) +
      '<path d="M4 80 Q60 74 116 80 L116 86 L4 86 Z" fill="' + SC.grass + '"/>' +
      girlEl(60, 44, 0.9, '#E8975A') +
      '<ellipse cx="60" cy="79" rx="8" ry="3" fill="#C9B393"/>', SC.day),
    /* f3 下午：太阳偏西 + 影子向左变长（r34 扩帧） */
    F(sunEl(88, 20, 8.5, '#F0A84F') +
      '<path d="M4 80 Q60 74 116 80 L116 86 L4 86 Z" fill="' + SC.grass + '"/>' +
      girlEl(58, 44, 0.9, '#E8975A') +
      '<ellipse cx="36" cy="79" rx="17" ry="3.6" fill="#C9B393"/>', SC.day),
    /* f4 傍晚：太阳低右 + 长影向左 */
    F(sunEl(100, 24, 8, '#E8975A') +
      '<path d="M4 80 Q60 74 116 80 L116 86 L4 86 Z" fill="' + SC.grass + '"/>' +
      girlEl(52, 44, 0.9, '#E8975A') +
      '<ellipse cx="26" cy="79" rx="26" ry="4" fill="#C9B393"/>', SC.eve)
  ]}
};

const ALL_IDS = Object.keys(STORY_LIB);                       // 封闭 12 集
const CH_IDS = c => ALL_IDS.filter(id => STORY_LIB[id].ch === c);
const nameOfStory = id => STORY_LIB[id].n;
/* r34 扩帧：故事帧数 3（ch1）/4（ch2）/5（ch3）——槽位数=自有帧数（pos>=0） */
const ownCount = id => STORY_LIB[id].art.length;
/* 复述句（故事完成后 TTS 拼句）连接词按帧数（r34：3=[先,然后,最后] /
   4=[先,然后,接着,最后] / 5=[先,然后,再,接着,最后]——顺序词词汇递进） */
const RECAP_KEYS = { 3: ['先', '然后', '最后'], 4: ['先', '然后', '接着', '最后'],
                     5: ['先', '然后', '再', '接着', '最后'] };
const recapOf = id => STORY_LIB[id].s.map((t, i) => RECAP_KEYS[STORY_LIB[id].s.length][i] + t).join('，');
/* 复述 clip 键：3 帧沿用现有 sto_recap_<story>；4/5 帧=新键（r34 TODO，主线 gen_clips 注册） */
const recapKeyOf = id => STORY_LIB[id].s.length === 3 ? 'sto_recap_' + id
                      : 'sto_recap' + STORY_LIB[id].s.length + '_' + id;
/* ch1 三帧复述 clip 实长（mutagen build 前量化，SPEC-R34 §R9）；4/5 帧实长见 RECAP_DUR4/5（主线注册后量化） */
const RECAP_DUR3 = { wake: 8400, meal: 7704, laundry: 8424, night: 7560 };
/* r34 4/5 帧扩帧复述实长（主线注册 23 键后 mutagen 实测量化 2026-09-21，SPEC §R10-C family H） */
const RECAP_DUR4 = { seed: 7824, cate: 9048, rain: 9120, chick: 8760 };
const RECAP_DUR5 = { sunwalk: 10848, bird: 10776, meals: 10896, shadow: 10944 };
const RECAP_DUR = Object.assign({}, RECAP_DUR3, RECAP_DUR4, RECAP_DUR5);
/* 因果问句（r34 维度三）：文案与选项卡文本（A=真因果 / B=傻干扰，SPEC-R34 §R10-B） */
const whyClipOf = id => ({ key: 'sto_why_' + id,
  text: '为什么要先' + STORY_LIB[id].why.q0 + '呀？是因为' + STORY_LIB[id].why.a +
        '，还是因为' + STORY_LIB[id].why.b + '？你来选一选。' });

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环取材）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（C7 verify 关键词断言） */
const CHAPTERS = {
  1: { name: '生活的一天', hint: '大自然的故事也要按顺序排一排啦' },   /* 预告 ch2 自然因果 */
  2: { name: '自然的故事', hint: '早上中午晚上，按时间排排看' },       /* 预告 ch3 时间线 */
  3: { name: '一天的顺序', hint: '各种各样的故事混在一起，大挑战来啦' }, /* 预告 ch4 混合 */
  4: { name: '大挑战',     hint: '新一轮故事排序挑战' }                /* 预告生成关 */
};
const GEN_HINTS = ['生活故事排一排，先做什么再做什么',   /* dch1 生活 routine */
                   '种子发芽开花，自然故事按顺序',       /* dch2 自然因果 */
                   '早中晚时间线，先再后排好',           /* dch3 时间线 */
                   '故事大混搭，想好了再排'];            /* dch4 混合 */
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   sto_ 7 条：四包装 watch/turn/hint + right + 双方位错反馈 w_first/w_mid + 题面 q
   〔家族 H 实长（build 前量化）：watch 2952 / turn 1776 / hint 2400 / right 2832
     / w_first 2424 / w_mid 2280 / q 2640——等待窗按此+300 余量〕
   r34 去泄序：wFirst/wMid 自有帧错点通道**退休**（运行时零调用，clip 保留注入待主线收编）；
   自有帧错点→hint 复用（题面级重定向零帧位信息）；干扰帧错点→w_out（成员性反馈）；
   why 三键=因果问句反馈（r34 TODO 未注册=静默过渡，判定/推进不受影响） */
const VOICE = {
  watch:  { key: 'sto_tut_watch', text: '看！先找第一张' },
  turn:   { key: 'sto_tut_turn',  text: '你来排一排' },
  hint:   { key: 'sto_hint',      text: '想想先发生了什么' },
  right:  { key: 'sto_right',     text: '故事讲完啦，真好听' },
  wFirst: { key: 'sto_w_first',   text: '这一步还不是开头哦' },   /* r34 退休（去泄序），保留防构建断言破 */
  wMid:   { key: 'sto_w_mid',     text: '这一步已经讲过啦' },     /* 同上 */
  wOut:   { key: 'sto_w_out',     text: '这张画不是这个故事里的哦' },   /* r34 TODO */
  whyW:   { key: 'sto_why_w',     text: '再想一想，它为什么要排第一呀' }, /* r34 TODO */
  whyRight: { key: 'sto_why_right', text: '答对啦，先有了它，后面的故事才会一件一件发生' }, /* r34 TODO */
  q:      { key: 'sto_q',         text: '按顺序讲讲这个故事' }
};
/* 因果问句触发位（r34 维度三固定谱：dch3/4 每关 qi1/qi3 两题） */
const WHY_QI = { 3: [1, 3], 4: [1, 3] };
const QUIET_TEXT = '按顺序讲讲这个故事';   /* 题面句恒走 clip（sto_q） */
/* ch3 时间线：错反馈 clip 后追加的先-再-后时间词点名（TTS 兜底，SPEC §1 ch3） */
const TIME_HINT = '想一想，先做什么，然后再做什么，最后做什么';
/* TTS 时长估算（复述句等待窗用）：zh rate0.9 ≈ 300ms/字 + 停顿余量，上限 12s */
/* estMs 已删（r34 审查 m2：RECAP_DUR 全量表后零活引用死代码） */

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 三格故事胶片 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="8" y="22" width="9" height="12" rx="2" fill="#E8975A" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="18.5" y="17" width="9" height="17" rx="2" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="29" y="11" width="9" height="23" rx="2" fill="#4E8FD0" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M13 28 h-1 M23 24 q2 -2 4 0 M33 18 v8" stroke="#FFF9EE" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M31 8 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.2"/></svg>',
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
