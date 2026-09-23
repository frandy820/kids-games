/* ================= chainsum 游戏数据（章配置 / 生成参数表 / 语音文案 / 中文数词 / 图标 / 场景 SVG）
   算术接龙：小兔子火车接龙——首节车厢=起点数字，每题在尾部空车厢上方挂运算牌（+3/-2 大字），
   孩子从底部 3 张数字卡点选"前一辆车经运算后的结果"，答对填数亮起、尾部再挂新空车厢——
   同关五题首尾相接成链（SPEC-BATCH10 §1）。
   数字=训练目标大字恒亮（车厢号/候选卡/运算牌，§0.19）；题面指令全语音承载（整句 TTS 拼句）；
   候选数字卡 3 张 ≥96px 主答案；车厢为非交互数轴锚点（div 免 64 门，照 neighbors 房子） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%4+1 循环取材）
   ch1 微步进 d∈[1,2] / ch2 起点抬升 d∈[1,4] / ch3 大数字域 [0,20] d∈[2,5]
   / ch4 大起点 d∈[1,6] +/- 高频交替
   name 供章末预告；hint=章末预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  1: { name: '小火车开啦', hint: '车厢上有时加一加，有时减一减' },
  2: { name: '加一加减一减', hint: '车厢数字变大啦，开进二十以内' },
  3: { name: '大数字站', hint: '加减号换得更快啦，看清楚再接' },
  4: { name: '换着算', hint: '新一轮算术接龙小火车' }
};
const GEN_HINTS = ['新的算术接龙挑战', '加一加减一减接着算', '二十以内大数字', '加减号换着来'];
const CH_LEN = 5;          // 5 题 = 1 关（同关五题首尾相接成链）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 生成参数表（SPEC §1；s0=起点数字区间，d=运算数区间，[lo,hi]=全程数域）
   alt=true：+/- 高频交替（op 偏好=与上一题相反）；生成关（flat≥20）=随机取章参数 */
const PARAMS = {
  1: { s0: [1, 5],   d: [1, 2], lo: 0, hi: 10 },
  2: { s0: [3, 8],   d: [1, 4], lo: 0, hi: 10 },
  3: { s0: [6, 12],  d: [2, 5], lo: 0, hi: 20 },
  4: { s0: [10, 15], d: [1, 6], lo: 0, hi: 20, alt: true }
};

/* ---------- 语音文案（3 条 clip 与 voice/clips/manifest.json 严格一致，禁改 key/text）
   题面 = 整句 TTS（数词+加减词拼句，SPEC §1 例句 '八加三等于几呀'）
   wrong 无 clip → 整句 TTS 兜底（§0.13） */
const VOICE = {
  watch: { key: 'cs_tut_watch', text: '看！小火车接数字啦' },
  turn:  { key: 'cs_tut_turn',  text: '你来接一接' },
  hint:  { key: 'cs_hint',      text: '算一算，下一节是几' },
  wrong: { key: 'cs_wrong',     text: '再想一想，算一算' }   /* T46 阶段2：keyless 清零 clip 化 */
};

/* ---------- 中文数词（题面/报数 TTS 用，1-20；与 neighbors numCn 同源写法） ---------- */
function numCn(n) {
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];   /* D[0]='零'（审查 M1：answer=0 链推进 cur=0 题面缺数词） */
  if (n < 10) return D[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + D[n - 10];
  return '二十';
}

/* ---------- 题面整句：'八加三等于几呀'（SPEC §1 例句逐字形态；数词+加减词拼句） ---------- */
const opCn = op => op === '+' ? '加' : '减';
const qSpeech = q => numCn(q.cur) + opCn(q.op) + numCn(q.d) + '等于几呀';
/* T46 阶段2（2026-09-19）：题面拆段键链（cs_n_ 0-20 数词+cs_op_add/sub+cs_tail 尾段，全在册）
   ——与 qSpeech 文本逐段一致；全段在册 queue 拼播 */
const qParts = q => ['cs_n_' + q.cur, q.op === '+' ? 'cs_op_add' : 'cs_op_sub', 'cs_n_' + q.d, 'cs_tail'];

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙·灰蓝加减双色） ---------- */
const ICONS = {
  /* logo：小火车头（车头+烟囱+双轮，点题接龙） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="16" width="22" height="16" rx="4" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="9" y="8" width="8" height="10" rx="2.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="14" cy="6" r="3.4" fill="#F5C445" opacity=".9"/>' +
    '<path d="M26 36 h14" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<rect x="29" y="22" width="9" height="9" rx="2.5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="11" cy="35" r="4.2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="23" cy="35" r="4.2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="33.5" cy="35" r="3.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.2"/></svg>',
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

/* ---------- 草地铁道场景背景（低干扰，pointer-events:none）：天空 + 太阳 + 云 + 远山 + 草地 + 小花 ---------- */
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
  const hill = (x, y, k, c) =>
    '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')"><path d="M-120 0 Q0 -96 120 0 Z" fill="' + c + '"/></g>';
  s += hill(180, 566, 1, '#BFD9A8') + hill(520, 566, 1.3, '#CBDFB4') + hill(860, 566, 1.05, '#BFD9A8');
  s += '<rect y="556" width="1000" height="44" fill="#DCEDD2"/>';
  s += '<path d="M0 556 Q250 546 500 556 Q750 566 1000 556 V600 H0 Z" fill="#E4F1DA"/>';
  const flower = (x, y) =>
    '<g transform="translate(' + x + ' ' + y + ')"><circle r="3.2" fill="#F2B8C6"/>' +
    '<circle cx="0" cy="-4.6" r="2.6" fill="#FFF"/><circle cx="4.4" cy="1.4" r="2.6" fill="#FFF"/>' +
    '<circle cx="-4.4" cy="1.4" r="2.6" fill="#FFF"/><circle r="1.5" fill="#F5C445"/></g>';
  s += flower(120, 585) + flower(360, 592) + flower(650, 588) + flower(900, 584);
  return s + '</svg>';
}
