/* ================= sign 交通标志 游戏数据（标志封闭 24 / 形状-颜色先验 / 章配置 / 语音文案 / SVG）
   玩法：题面 = 街景 + 交通标志（中国标志先验：红圈=不能做 / 蓝底=指路可以走 /
   黄三角=要小心 / 红八角=停 / 红倒三角=让一让 / 蓝圆圈=指示怎么走）+ 题面句 clip，
   下方 4 张卡（图标 + 2-6 字短语）。两题型（SPEC-R36-SIGN §R1）：
   mean 含义卡（含义小图标 + 短语，meaning=标志 id 1:1）；
   act 行为卡（行为小图标 + 行为短语 ACT，ch4 主载——标志→正确做法应用）。
   flash 闪现观察题（ch2 起）：标志亮相 1800ms 后被「?」面板遮住，凭记忆作答。
   点对 = 标志放大跳 + 小兔子滑入示范 + 含义句 clip（新 12 标志注册前静默，SPEC §R10）；
   点错 = 卡摇头 + sgn_wrong clip + 按题面标志族的引导句（GUIDE[fam]，注册前静默），
   1000ms 防重入窗后可重选（卡不灰——探索不罚）。
   标志封闭 24（SPEC-R36-SIGN §R1，表外不出题；旧 12 文案零改动）：
     light 红绿灯 / zebra 斑马线 / bridge 过街天桥 / tunnel 地下通道 / walk 步行街
       （ch1 行走安全 5——walk 新入）
     noentry 禁止通行 / nocar 禁止驶入 / noped 禁止行人 / nobike 禁止自行车 /
     horn 禁鸣喇叭 / stop 停车让行 / yield 减速让行
       （红圈 5 + 红八角 + 红倒三角 = 禁止与让行 7）
     ped 注意行人 / child 注意儿童 / work 前方施工 / slow 慢行 / cross 交叉路口 /
     turn 急弯路 / slip 易滑 / rail 铁路道口（黄三角 8）
     oneway 单行道（蓝底方）/ straight 直行 / goleft 向左转弯 / goright 向右转弯
       （蓝底方 2 + 蓝圆圈 3）
   近对封闭 9 对（双向，ch3 目标池 18 成员）：noentry↔nocar / noped↔nobike /
   stop↔yield / ped↔child / cross↔turn / slip↔slow / oneway↔straight /
   goleft↔goright / zebra↔walk；horn/work/bridge/tunnel/light/rail 无伙伴不进 ch3。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）
const RED = '#E8483C', YEL = '#F5C445', BLU = '#2E6FB8'; // 标志三主色（红/黄/蓝）

/* ---------- 标志封闭 24：id → { n 名, fam 形状-颜色族, m 含义短语(2-4字), sent 含义句 }
   fam 七族=教育主线（反馈 GUIDE 按 fam 引导）：red 红圈 / redoct 红八角 /
   redtri 红倒三角 / yellow 黄三角 / blue 蓝底方 / bluec 蓝圆圈 / signal 信号灯
   （单行格式=主线 gen_clips T46 提取正则契约，禁换行拆字段） */
const SIGNS = {
  light:   { n: '红绿灯',   fam: 'signal', m: '看灯走',   sent: '红灯停，绿灯行' },
  zebra:   { n: '斑马线',   fam: 'blue',   m: '走斑马线', sent: '过马路，走斑马线' },
  bridge:  { n: '过街天桥', fam: 'blue',   m: '走天桥',   sent: '过马路，走天桥' },
  tunnel:  { n: '地下通道', fam: 'blue',   m: '走地下道', sent: '过马路，走地下通道' },
  walk:    { n: '步行街',   fam: 'blue',   m: '只能走路', sent: '蓝牌子，这里只能走' },
  noentry: { n: '禁止通行', fam: 'red',    m: '不能通行', sent: '红圈圈，这里不能走' },
  nocar:   { n: '禁止驶入', fam: 'red',    m: '车不能进', sent: '红圈白杠，车不能进' },
  noped:   { n: '禁止行人', fam: 'red',    m: '行人禁入', sent: '红圈圈，行人不能进' },
  nobike:  { n: '禁止自行车', fam: 'red',  m: '单车禁行', sent: '红圈圈，自行车不能进' },
  horn:    { n: '禁鸣喇叭', fam: 'red',    m: '禁按喇叭', sent: '红圈圈，不能按喇叭' },
  stop:    { n: '停车让行', fam: 'redoct', m: '停下看路', sent: '红八角，停下看一看' },
  yield:   { n: '减速让行', fam: 'redtri', m: '先让一让', sent: '红倒三角，先让一让' },
  ped:     { n: '注意行人', fam: 'yellow', m: '注意行人', sent: '黄三角，前方有行人' },
  child:   { n: '注意儿童', fam: 'yellow', m: '前方儿童', sent: '黄三角，前方有小朋友' },
  work:    { n: '前方施工', fam: 'yellow', m: '前方施工', sent: '黄三角，前方在施工' },
  slow:    { n: '慢行',     fam: 'yellow', m: '慢慢走',   sent: '黄三角，要慢慢走' },
  cross:   { n: '交叉路口', fam: 'yellow', m: '路口小心', sent: '黄三角，前面是路口' },
  turn:    { n: '急弯路',   fam: 'yellow', m: '急转弯',   sent: '黄三角，路要转弯' },
  slip:    { n: '易滑',     fam: 'yellow', m: '路滑慢走', sent: '黄三角，路滑慢点走' },
  rail:    { n: '铁路道口', fam: 'yellow', m: '小心火车', sent: '黄三角，小心火车' },
  oneway:  { n: '单行道',   fam: 'blue',   m: '只往前走', sent: '蓝牌子，只往前走' },
  straight:{ n: '直行',     fam: 'bluec',  m: '只准直行', sent: '蓝圆圈，只准直行' },
  goleft:  { n: '向左转弯', fam: 'bluec',  m: '往左转',   sent: '蓝圆圈，往左转弯' },
  goright: { n: '向右转弯', fam: 'bluec',  m: '往右转',   sent: '蓝圆圈，往右转弯' }
};
const ALL24 = Object.keys(SIGNS);                       // 封闭 24 集
const WALK5 = ['light', 'zebra', 'bridge', 'tunnel', 'walk']; // ch1 行走安全 5
const DENY15 = ['noentry', 'nocar', 'noped', 'nobike', 'horn',   // ch2 禁止与让行 15
                'stop', 'yield', 'ped', 'child', 'work',
                'slow', 'cross', 'turn', 'slip', 'rail'];
const NEAR = { noentry: 'nocar', nocar: 'noentry',      // 近对封闭 9 对（双向）
               noped: 'nobike', nobike: 'noped',
               stop: 'yield', yield: 'stop',
               ped: 'child', child: 'ped',
               cross: 'turn', turn: 'cross',
               slip: 'slow', slow: 'slip',
               oneway: 'straight', straight: 'oneway',
               goleft: 'goright', goright: 'goleft',
               zebra: 'walk', walk: 'zebra' };
const NEAR_MEMBERS = Object.keys(NEAR);
const NEAR_POOL = NEAR_MEMBERS.slice();                 // ch3 目标池 18
/* 干扰同系优先组（形状-颜色族全 24；同系互为干扰强化「看图案细节」，异系训练认族） */
const SYSTEM = { light: 'signal',
                 noentry: 'red', nocar: 'red', noped: 'red', nobike: 'red', horn: 'red',
                 stop: 'redoct', yield: 'redtri',
                 ped: 'yellow', child: 'yellow', work: 'yellow', slow: 'yellow',
                 cross: 'yellow', turn: 'yellow', slip: 'yellow', rail: 'yellow',
                 zebra: 'blue', bridge: 'blue', tunnel: 'blue', oneway: 'blue', walk: 'blue',
                 straight: 'bluec', goleft: 'bluec', goright: 'bluec' };
const FAMS = ['red', 'redoct', 'redtri', 'yellow', 'blue', 'bluec', 'signal']; // fam 封闭 7（verify 对账）

/* 题面句（clip sgn_q 固定文案）；act 题面句（TODO 键 sgn_q_act，注册前静默）；
   含义句=clip sgn_sent_*（新 12 标志注册前静默——SPEC §R10 过渡态） */
const quizText = '这个标志是什么意思？';
const ACT_Q = { key: 'sgn_q_act', text: '看到这个标志，怎么做' };
const confirmText = s => SIGNS[s].sent;
/* act 行为短语表（24 条互异、与 m 表零碰撞——verify 对账）：标志→正确做法 */
const ACT = {
  light: '红灯等绿灯走', zebra: '走斑马线过街', bridge: '从天桥过街', tunnel: '从地下道过街',
  walk: '慢慢走不跑', noentry: '绕开这里走', nocar: '汽车绕开走', noped: '不走这条路',
  nobike: '不骑车进去', horn: '不按喇叭', stop: '停一停再走', yield: '让别的人先走',
  ped: '注意来往的人', child: '小心小朋友', work: '绕开工地走', slow: '放慢速度走',
  oneway: '顺着箭头走', straight: '一直走不转弯', goleft: '往左边转弯', goright: '往右边转弯',
  cross: '路口看两边', turn: '转弯慢一点', slip: '路滑小心走', rail: '一停二看三过'
};
/* 闪现观察题参数：标志亮相毫秒（SPEED 提速随 verify）；救援重闪揭面毫秒在 game-main */
const FLASH_MS = 1800;
/* 错反馈引导句（按题面标志 fam——锚定形状颜色线索，不否定人格，SPEC §0.61/§R1；
   redtri/bluec 两族=TODO 键 sgn_guide_*，注册前静默） */
const GUIDE = { red: '红圈圈说，不能做',
                redoct: '红八角说，停下来',
                redtri: '红倒三角说，让一让',
                yellow: '黄三角说，要小心',
                blue: '蓝牌子说，这样走',
                bluec: '蓝圆圈说，这样走',
                signal: '看看灯的颜色再走' };

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言） */
const CHAPTERS = {
  1: { name: '走路安全', hint: '红圈圈和黄三角要来啦' },   // 预告 ch2 禁令+警示
  2: { name: '红圈黄三角', hint: '长得像的标志要仔细看哦' }, // 预告 ch3 近对辨析
  3: { name: '像不像',   hint: '大挑战，还要想想怎么做' }, // 预告 ch4 混合+行为题
  4: { name: '大挑战', hint: '新一轮认标志开始啦' }      // 预告生成关
};
const GEN_HINTS = ['走路安全的标志，再认一认',   // dch1 行走安全
                   '红圈黄三角，都认得啦',       // dch2 禁止与让行
                   '长得像的标志，看仔细再选',   // dch3 近对辨析
                   '标志大集合，想好了再做'];    // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   六包装 watch/turn/hint/right/wrong/q；新 12 含义句/act 题面句/新 2 族引导句=
   TODO 键（SPEC-R36 §R10，注册前 play 缺 clip 静默） */
const VOICE = {
  watch: { key: 'sgn_tut_watch', text: '看！这个标志告诉你什么' },
  turn:  { key: 'sgn_tut_turn',  text: '你来选一选' },
  hint:  { key: 'sgn_hint',      text: '再看看标志的样子' },
  right: { key: 'sgn_right',     text: '认对啦，真安全' },
  wrong: { key: 'sgn_wrong',     text: '再看看它的颜色和形状' },
  q:     { key: 'sgn_q',         text: '这个标志是什么意思' }
};

/* ---------- 小人宏 FIG_C(x, y, s, pose, col)：剪影小人（标志/含义卡/行为卡共用）
   pose：walk 走 / stand 站 / look 手搭凉棚看 / run 跑 / balance 双臂张开保持平衡；
   col 缺省 INK（白人形传 '#FFF'——步行街牌/白箭头语境） */
const FIG_C = (x, y, s, pose, col) => {
  col = col || INK;
  const L = w => 'stroke="' + col + '" stroke-width="' + (w * s) + '" stroke-linecap="round" fill="none"';
  const head = '<circle cx="' + x + '" cy="' + (y - 27 * s) + '" r="' + (7.5 * s) + '" fill="' + col + '"/>';
  const sh = y - 18 * s, hip = y - 5 * s;
  const torso = '<path d="M' + x + ' ' + sh + ' V' + hip + '" ' + L(5.5) + '/>';
  let arms, legs;
  if (pose === 'walk') {
    arms = '<path d="M' + x + ' ' + sh + ' l' + (10 * s) + ' ' + (8 * s) +
           ' M' + x + ' ' + sh + ' l' + (-9 * s) + ' ' + (-4 * s) + '" ' + L(4.2) + '/>';
    legs = '<path d="M' + x + ' ' + hip + ' l' + (9 * s) + ' ' + (13 * s) +
           ' M' + x + ' ' + hip + ' l' + (-7 * s) + ' ' + (13 * s) + '" ' + L(5) + '/>';
  } else if (pose === 'stand') {
    arms = '<path d="M' + x + ' ' + sh + ' l' + (-7 * s) + ' ' + (12 * s) +
           ' M' + x + ' ' + sh + ' l' + (7 * s) + ' ' + (12 * s) + '" ' + L(4.2) + '/>';
    legs = '<path d="M' + x + ' ' + hip + ' l' + (-6 * s) + ' ' + (13 * s) +
           ' M' + x + ' ' + hip + ' l' + (6 * s) + ' ' + (13 * s) + '" ' + L(5) + '/>';
  } else if (pose === 'look') {
    arms = '<path d="M' + x + ' ' + sh + ' l' + (-7 * s) + ' ' + (11 * s) +
           ' M' + x + ' ' + sh + ' l' + (5 * s) + ' ' + (-4 * s) + ' l' + (7 * s) + ' ' + (-1 * s) + '" ' + L(4.2) + '/>';
    legs = '<path d="M' + x + ' ' + hip + ' l' + (-6 * s) + ' ' + (13 * s) +
           ' M' + x + ' ' + hip + ' l' + (6 * s) + ' ' + (13 * s) + '" ' + L(5) + '/>';
  } else if (pose === 'balance') {
    arms = '<path d="M' + x + ' ' + sh + ' l' + (-12 * s) + ' ' + (-7 * s) +
           ' M' + x + ' ' + sh + ' l' + (12 * s) + ' ' + (-7 * s) + '" ' + L(4.2) + '/>';
    legs = '<path d="M' + x + ' ' + hip + ' l' + (-8 * s) + ' ' + (13 * s) +
           ' M' + x + ' ' + hip + ' l' + (8 * s) + ' ' + (13 * s) + '" ' + L(5) + '/>';
  } else { /* run */
    arms = '<path d="M' + x + ' ' + sh + ' l' + (11 * s) + ' ' + (-5 * s) +
           ' M' + x + ' ' + sh + ' l' + (-8 * s) + ' ' + (8 * s) + '" ' + L(4.2) + '/>';
    legs = '<path d="M' + x + ' ' + hip + ' l' + (12 * s) + ' ' + (8 * s) +
           ' M' + x + ' ' + hip + ' l' + (-10 * s) + ' ' + (10 * s) + '" ' + L(5) + '/>';
  }
  return head + torso + arms + legs;
};
const FIG = (x, y, s, pose) => FIG_C(x, y, s, pose, INK);
const FIGW = (x, y, s, pose) => FIG_C(x, y, s, pose, '#FFF');

/* ---------- 车辆/自行车宏（含义卡/行为卡共用；col 传 '#8A9BAE' 蓝灰车） */
const CAR = (x, y, s, col) => {
  col = col || '#8A9BAE';
  return '<rect x="' + (x - 24 * s) + '" y="' + (y - 12 * s) + '" width="' + (48 * s) + '" height="' + (15 * s) + '" rx="' + (5 * s) + '" fill="' + col + '" stroke="' + INK + '" stroke-width="' + (3 * s) + '"/>' +
    '<path d="M' + (x - 13 * s) + ' ' + (y - 12 * s) + ' l' + (4 * s) + ' ' + (-9 * s) + ' h' + (17 * s) + ' l' + (5 * s) + ' ' + (9 * s) + '" fill="none" stroke="' + INK + '" stroke-width="' + (3 * s) + '" stroke-linejoin="round"/>' +
    '<circle cx="' + (x - 13 * s) + '" cy="' + (y + 4 * s) + '" r="' + (5 * s) + '" fill="' + INK + '"/>' +
    '<circle cx="' + (x + 13 * s) + '" cy="' + (y + 4 * s) + '" r="' + (5 * s) + '" fill="' + INK + '"/>';
};
const BIKE = (x, y, s) =>
  '<circle cx="' + (x - 16 * s) + '" cy="' + y + '" r="' + (9 * s) + '" fill="none" stroke="' + INK + '" stroke-width="' + (3.5 * s) + '"/>' +
  '<circle cx="' + (x + 16 * s) + '" cy="' + y + '" r="' + (9 * s) + '" fill="none" stroke="' + INK + '" stroke-width="' + (3.5 * s) + '"/>' +
  '<path d="M' + (x - 16 * s) + ' ' + y + ' L' + (x - 3 * s) + ' ' + (y - 15 * s) + ' H' + (x + 9 * s) + ' L' + (x + 16 * s) + ' ' + y + ' M' + (x - 3 * s) + ' ' + (y - 15 * s) + ' L' + (x + 3 * s) + ' ' + y + ' M' + (x + 9 * s) + ' ' + (y - 15 * s) + ' v-5" fill="none" stroke="' + INK + '" stroke-width="' + (3.5 * s) + '" stroke-linecap="round" stroke-linejoin="round"/>';

/* ---------- 交通标志 SVG（viewBox 0 0 120 120；符合中国标志先验：
   红圈白底=禁止族 / 红八角=停 / 红倒三角=让 / 黄三角黑边=注意族 /
   蓝底方=指路族 / 蓝圆圈=指示族 / 信号灯） */
const OCT = '60,6 99,21 114,60 99,99 60,114 21,99 6,60 21,21';   // 八角顶点
const TRI = '60,10 112,102 8,102';                               // 黄三角顶点（黑边）
const INV = '60,112 112,14 8,14';                                // 红倒三角顶点（让）
const SIGN_ELS = {
  /* 红绿灯：深色灯箱竖排三灯，红灯亮（黄/绿暗）+ 灯杆 */
  light: '<rect x="52" y="94" width="12" height="22" rx="3" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="34" y="4" width="52" height="94" rx="12" fill="#4E5D6E" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="26" r="13" fill="' + RED + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="51" r="13" fill="#8A7B4E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="76" r="13" fill="#4E6E5E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="55" cy="21" r="4" fill="#FFF" opacity=".85"/>',
  /* 斑马线（人行横道指示）：蓝底方 + 白三角 + 黑色行人 */
  zebra: '<rect x="8" y="8" width="104" height="104" rx="16" fill="' + BLU + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<polygon points="60,20 103,95 17,95" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    FIG(60, 66, 1.0, 'walk'),
  /* 过街天桥：蓝底方 + 白色阶梯拱桥（两侧上桥中间高） */
  bridge: '<rect x="8" y="8" width="104" height="104" rx="16" fill="' + BLU + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M14 98 v-10 h12 v-12 h12 v-12 h44 v12 h12 v12 h12 v10 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 52 h20" stroke="' + BLU + '" stroke-width="5" stroke-linecap="round"/>',
  /* 地下通道：蓝底方 + 白色拱形入口 + 黑色向下箭头（向下走） */
  tunnel: '<rect x="8" y="8" width="104" height="104" rx="16" fill="' + BLU + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M24 100 V72 Q24 48 48 48 H72 Q96 48 96 72 V100 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 92 V64 m-7 7 l7 7 7 -7" stroke="' + INK + '" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  /* 步行街：蓝底方 + 白色行人（无三角=与斑马线牌的辨析锚点） */
  walk: '<rect x="8" y="8" width="104" height="104" rx="16" fill="' + BLU + '" stroke="' + INK + '" stroke-width="4"/>' +
    FIGW(60, 96, 1.15, 'walk') +
    '<path d="M28 104 h64" stroke="#FFF" stroke-width="4" stroke-linecap="round" opacity=".85"/>',
  /* 禁止通行：白底 + 红粗圈 + 红横杠（GB 禁止通行） */
  noentry: '<circle cx="60" cy="60" r="46" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="60" r="38" fill="none" stroke="' + RED + '" stroke-width="13"/>' +
    '<rect x="36" y="52" width="48" height="16" rx="3" fill="' + RED + '"/>',
  /* 禁止驶入：白底 + 红粗圈 + 白横杠（红杠白杠=与禁止通行的辨析锚点） */
  nocar: '<circle cx="60" cy="60" r="46" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="60" r="38" fill="none" stroke="' + RED + '" stroke-width="13"/>' +
    '<rect x="38" y="52" width="44" height="16" rx="3" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>',
  /* 禁止行人：白底 + 红粗圈 + 黑色行人 */
  noped: '<circle cx="60" cy="60" r="46" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="60" r="38" fill="none" stroke="' + RED + '" stroke-width="13"/>' +
    FIG(60, 68, 1.1, 'walk'),
  /* 禁止自行车：白底 + 红粗圈 + 黑色自行车（人形车形=与禁止行人的辨析锚点） */
  nobike: '<circle cx="60" cy="60" r="46" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="60" r="38" fill="none" stroke="' + RED + '" stroke-width="13"/>' +
    '<circle cx="40" cy="74" r="10" fill="none" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<circle cx="80" cy="74" r="10" fill="none" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<path d="M40 74 L56 50 H70 M56 50 L80 74 M66 50 h14" stroke="' + INK + '" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  /* 禁鸣喇叭：白底 + 红粗圈 + 黑色喇叭 + 声波 */
  horn: '<circle cx="60" cy="60" r="46" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="60" r="38" fill="none" stroke="' + RED + '" stroke-width="13"/>' +
    '<path d="M36 60 h14 l24 -13 v26 l-24 -13 Z" fill="' + INK + '" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M84 48 q8 12 0 24 M90 40 q13 20 0 40" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
  /* 停车让行：红八角 + 白「停」 */
  stop: '<polygon points="' + OCT + '" fill="' + RED + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<text x="60" y="77" text-anchor="middle" font-size="46" font-weight="bold" fill="#FFF" font-family="KaiTi,STKaiti,sans-serif">停</text>',
  /* 减速让行：红倒三角 + 黑「让」（八角/倒三角=与停车让行的辨析锚点） */
  yield: '<polygon points="' + INV + '" fill="' + RED + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<polygon points="60,98 100,24 20,24" fill="#FFF"/>' +
    '<text x="60" y="76" text-anchor="middle" font-size="38" font-weight="bold" fill="' + INK + '" font-family="KaiTi,STKaiti,sans-serif">让</text>',
  /* 注意行人：黄三角黑边 + 黑色行人 */
  ped: '<polygon points="' + TRI + '" fill="' + YEL + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    FIG(60, 72, 1.05, 'walk'),
  /* 注意儿童：黄三角 + 双人奔跑小孩（GB 576 双小孩意象；双人 vs ped 单人=近对可辨锚点，审查 M5） */
  child: '<polygon points="' + TRI + '" fill="' + YEL + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    FIG(46, 80, 1.0, 'run') + FIG(74, 86, 0.72, 'run'),
  /* 前方施工：黄三角 + 橙白条纹锥 + 警示灯 */
  work: '<polygon points="' + TRI + '" fill="' + YEL + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M60 42 L74 84 H46 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M53 62 h14 M50 72 h20" stroke="#FFF" stroke-width="4"/>' +
    '<path d="M40 84 h40" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="60" cy="36" r="4.5" fill="' + RED + '"/>',
  /* 慢行：黄三角 + 黑「慢」 */
  slow: '<polygon points="' + TRI + '" fill="' + YEL + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<text x="60" y="90" text-anchor="middle" font-size="44" font-weight="bold" fill="' + INK + '" font-family="KaiTi,STKaiti,sans-serif">慢</text>',
  /* 交叉路口：黄三角 + 黑色十字路（十字/弯道=与急弯路的辨析锚点） */
  cross: '<polygon points="' + TRI + '" fill="' + YEL + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M60 40 V88 M36 64 H84" stroke="' + INK + '" stroke-width="10" stroke-linecap="round"/>',
  /* 急弯路：黄三角 + 黑色弯折箭头 */
  turn: '<polygon points="' + TRI + '" fill="' + YEL + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M42 90 V66 Q42 48 62 48 H78" stroke="' + INK + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<path d="M72 36 L90 48 L72 60 Z" fill="' + INK + '"/>',
  /* 易滑：黄三角 + 黑色小车 + 打滑曲线（慢字/打滑=与慢行的辨析锚点） */
  slip: '<polygon points="' + TRI + '" fill="' + YEL + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<path d="M44 52 l6 -10 h16 l6 10" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<rect x="38" y="52" width="36" height="14" rx="5" fill="' + INK + '"/>' +
    '<circle cx="48" cy="70" r="4.5" fill="' + INK + '"/><circle cx="64" cy="70" r="4.5" fill="' + INK + '"/>' +
    '<path d="M34 84 q6 -7 12 0 t12 0 t12 0" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
  /* 铁路道口：黄三角 + 黑色栅栏（两横杆四立柱） */
  rail: '<polygon points="' + TRI + '" fill="' + YEL + '" stroke="' + INK + '" stroke-width="6" stroke-linejoin="round"/>' +
    '<g stroke="' + INK + '" stroke-width="5" stroke-linecap="round">' +
    '<path d="M28 48 H92 M28 72 H92"/>' +
    '<path d="M34 40 V84 M52 40 V84 M68 40 V84 M84 40 V84"/></g>',
  /* 单行道：蓝底方 + 白色粗向上箭头（GB 单行路指示） */
  oneway: '<rect x="8" y="8" width="104" height="104" rx="16" fill="' + BLU + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M60 16 L88 50 H72 V98 H48 V50 H32 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
  /* 直行：蓝圆圈 + 白色粗向上箭头（方/圆=与单行道的辨析锚点） */
  straight: '<circle cx="60" cy="60" r="52" fill="' + BLU + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M60 16 L86 52 H70 V100 H50 V52 H34 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
  /* 向左转弯：蓝圆圈 + 白色左弯箭头（左右向=与向右转弯的辨析锚点） */
  goleft: '<circle cx="60" cy="60" r="52" fill="' + BLU + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M78 100 V56 Q78 36 58 36 H32" stroke="#FFF" stroke-width="14" fill="none" stroke-linecap="round"/>' +
    '<path d="M34 22 L12 36 L34 50 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
  /* 向右转弯：蓝圆圈 + 白色右弯箭头 */
  goright: '<circle cx="60" cy="60" r="52" fill="' + BLU + '" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M42 100 V56 Q42 36 62 36 H88" stroke="#FFF" stroke-width="14" fill="none" stroke-linecap="round"/>' +
    '<path d="M86 22 L108 36 L86 50 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>'
};

/* 标志 SVG 工厂：signSvg(id, size)——size 缺省 132（题面大标志） */
function signSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="132" height="132"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    SIGN_ELS[id] + '</svg>';
}

/* ---------- 含义卡小图标（viewBox 0 0 100 100；画含义动作/场景，不复现标志牌形：
   近对含义图标互异可辨——不能通行=红手掌 / 行人禁入=小人+红斜杠 / 停下看路=搭凉棚 /
   注意行人=大人走+叹号圈 / 前方有儿童=小孩跑+双辫+叹号圈；新 12 同律互异） */
const WARN_DOT = (cx, cy) => '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="' + YEL + '" stroke="' + INK + '" stroke-width="2.5"/>' +
  '<path d="M' + cx + ' ' + (cy - 6) + ' v7" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
  '<circle cx="' + cx + '" cy="' + (cy + 5.5) + '" r="1.8" fill="' + INK + '"/>';

const MEAN_ELS = {
  /* 看灯走：小人站定看灯 + 红/绿双点（红亮绿暗） */
  light: FIG(36, 68, 1.05, 'stand') +
    '<circle cx="74" cy="28" r="8" fill="' + RED + '"/>' +
    '<circle cx="74" cy="47" r="8" fill="#57B368" opacity=".45"/>' +
    '<path d="M42 40 q10 -6 20 -6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-dasharray="2 5"/>',
  /* 走斑马线：小人走在白条纹上 */
  zebra: FIG(50, 50, 1.05, 'walk') +
    '<g fill="#FFF" stroke="' + INK + '" stroke-width="2">' +
    '<rect x="16" y="70" width="11" height="22" rx="2"/><rect x="31" y="70" width="11" height="22" rx="2"/>' +
    '<rect x="46" y="70" width="11" height="22" rx="2"/><rect x="61" y="70" width="11" height="22" rx="2"/>' +
    '<rect x="76" y="70" width="11" height="22" rx="2"/></g>',
  /* 走天桥：拱桥 + 栏杆 + 桥上小人 */
  bridge: '<path d="M12 76 Q50 30 88 76" stroke="#B98A5C" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<path d="M12 62 Q50 16 88 62" stroke="' + INK + '" stroke-width="3.5" fill="none"/>' +
    '<path d="M22 68 v-12 M50 58 v-12 M78 68 v-12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    FIG(50, 44, 0.85, 'walk'),
  /* 走地下通道：拱门 + 入口小人 + 向下台阶 */
  tunnel: '<path d="M20 88 V56 Q20 32 44 32 H60 Q84 32 84 56 V88" fill="#D8ECF8" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
    FIG(52, 76, 0.95, 'walk') +
    '<path d="M26 88 h6 v-6 h6 v-6" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  /* 只能走路：小人走 + 脚印路（无三角=与斑马线含义互异锚点） */
  walk: '<path d="M14 84 h72" stroke="#C9D6DF" stroke-width="9" stroke-linecap="round"/>' +
    FIG(48, 72, 1.1, 'walk') +
    '<circle cx="26" cy="60" r="2.6" fill="' + INK + '"/><circle cx="34" cy="54" r="2.6" fill="' + INK + '"/>',
  /* 不能通行：红色大手掌（停的手势） */
  noentry: '<g fill="' + RED + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
    '<rect x="37" y="44" width="27" height="34" rx="9"/>' +
    '<rect x="37" y="24" width="5.5" height="26" rx="2.7"/><rect x="44.5" y="20" width="5.5" height="30" rx="2.7"/>' +
    '<rect x="52" y="22" width="5.5" height="28" rx="2.7"/><rect x="59.5" y="28" width="5.5" height="22" rx="2.7"/>' +
    '<path d="M64 50 q11 2 9 13 q-2 9 -13 7 Z"/></g>',
  /* 车不能进：蓝灰小车 + 红斜杠 */
  nocar: CAR(50, 62, 1.0) +
    '<path d="M24 26 L76 86" stroke="' + RED + '" stroke-width="8" stroke-linecap="round"/>',
  /* 行人禁入：小人 + 红斜杠 */
  noped: FIG(50, 66, 1.1, 'walk') +
    '<path d="M26 24 L76 84" stroke="' + RED + '" stroke-width="8" stroke-linecap="round"/>',
  /* 单车禁行：自行车 + 红斜杠（人形车形=与行人禁入互异锚点） */
  nobike: BIKE(50, 70, 1.15) +
    '<path d="M26 24 L76 86" stroke="' + RED + '" stroke-width="8" stroke-linecap="round"/>',
  /* 禁按喇叭：喇叭 + 声波 + 红斜杠 */
  horn: '<path d="M24 58 h12 l20 -11 v26 l-20 -11 Z" fill="' + INK + '"/>' +
    '<path d="M62 46 q7 11 0 22 M70 38 q12 20 0 40" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 22 L74 84" stroke="' + RED + '" stroke-width="7" stroke-linecap="round"/>',
  /* 停下看路：小人手搭凉棚看路（站定） */
  stop: FIG(50, 70, 1.15, 'look') +
    '<path d="M18 88 q32 -10 64 0" stroke="#8A9BAE" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  /* 先让一让：红倒三角 + 小人看（让=倒三角意象） */
  yield: '<polygon points="66,60 86,26 46,26" fill="#FFF" stroke="' + RED + '" stroke-width="5" stroke-linejoin="round"/>' +
    FIG(32, 76, 1.1, 'look'),
  /* 注意行人：大人走路 + 黄叹号圈 */
  ped: FIG(42, 68, 1.15, 'walk') + WARN_DOT(80, 30),
  /* 前方有儿童：小孩奔跑（双丫辫）+ 黄叹号圈 */
  child: FIG(38, 68, 0.92, 'run') +
    '<circle cx="30" cy="38" r="3.5" fill="' + RED + '"/><circle cx="46" cy="38" r="3.5" fill="' + RED + '"/>' +
    WARN_DOT(80, 30),
  /* 前方施工：条纹锥 + 警示灯 */
  work: '<path d="M50 22 L68 74 H32 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 47 h16 M38 60 h24" stroke="#FFF" stroke-width="4"/>' +
    '<path d="M24 74 h52" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="50" cy="16" r="4.5" fill="' + RED + '"/>',
  /* 慢慢走：蜗牛（慢语义） */
  slow: '<path d="M20 80 q0 -12 14 -12 h32 v12 Z" fill="#F5CB5C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="54" cy="52" r="17" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M54 42 a10 10 0 1 0 10 10 a6 6 0 1 1 -6 -6" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M28 68 l-4 -13 M36 68 v-14" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="24" cy="53" r="2.6" fill="' + INK + '"/><circle cx="36" cy="52" r="2.6" fill="' + INK + '"/>',
  /* 路口小心：十字路 + 小人看两边 */
  cross: '<path d="M50 14 V96 M10 54 H90" stroke="#C9D6DF" stroke-width="12" stroke-linecap="round"/>' +
    '<path d="M50 14 V96 M10 54 H90" stroke="#FFF" stroke-width="2" stroke-dasharray="8 8" opacity=".85"/>' +
    FIG(76, 80, 0.95, 'look'),
  /* 急转弯：双箭头弯标（GB 急弯意象）+ 叹号圈 */
  turn: '<path d="M34 80 L52 50 L34 20 M58 80 L76 50 L58 20" stroke="' + INK + '" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    WARN_DOT(20, 50),
  /* 路滑慢走：小人走 + 打滑波线 + 叹号圈（蜗牛/打滑=与慢行互异锚点） */
  slip: FIG(40, 64, 1.05, 'walk') +
    '<path d="M18 84 q7 -8 14 0 t14 0" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    WARN_DOT(80, 28),
  /* 小心火车：火车头正面 + 叹号圈 */
  rail: '<rect x="24" y="34" width="46" height="40" rx="7" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="31" y="41" width="13" height="13" rx="2" fill="#D8ECF8"/><rect x="50" y="41" width="13" height="13" rx="2" fill="#D8ECF8"/>' +
    '<circle cx="36" cy="78" r="4" fill="' + INK + '"/><circle cx="58" cy="78" r="4" fill="' + INK + '"/>' +
    '<path d="M22 84 h50" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    WARN_DOT(82, 26),
  /* 只往前走：小人顺着蓝色粗箭头走 */
  oneway: '<path d="M64 18 L84 42 H74 V80 H54 V42 H44 Z" fill="' + BLU + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    FIG(30, 74, 0.95, 'walk'),
  /* 只准直行：透视直路 + 中线 + 小人（路形=与单行道含义互异锚点） */
  straight: '<path d="M40 94 L46 26 H54 L60 94 Z" fill="#C9D6DF" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M50 38 V64" stroke="#FFF" stroke-width="3" stroke-dasharray="6 6"/>' +
    FIG(50, 88, 0.9, 'walk'),
  /* 往左转：灰路左弯 + 转弯小车 */
  goleft: '<path d="M32 92 V56 Q32 32 58 32 H78" stroke="#C9D6DF" stroke-width="13" fill="none" stroke-linecap="round"/>' +
    CAR(76, 40, 0.62),
  /* 往右转：灰路右弯 + 转弯小车（左右向=互异锚点） */
  goright: '<path d="M68 92 V56 Q68 32 42 32 H22" stroke="#C9D6DF" stroke-width="13" fill="none" stroke-linecap="round"/>' +
    CAR(24, 40, 0.62)
};

/* 含义卡图标工厂：meanSvg(id, size)——size 缺省 92×92（卡内含义小图标） */
function meanSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="92" height="92"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    MEAN_ELS[id] + '</svg>';
}

/* ---------- 行为卡小图标（viewBox 0 0 100 100；act 题专用——画「孩子怎么做」场景，
   与 MEAN_ELS 同标志互异（行为场景 vs 含义图式），近对/同 fam 行为图标互异可辨） */
const ACT_ELS = {
  /* 红灯等绿灯走：小人在停止线后站定 + 红灯亮 */
  light: FIG(34, 74, 1.05, 'stand') +
    '<rect x="66" y="18" width="18" height="36" rx="5" fill="#4E5D6E" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="75" cy="28" r="5" fill="' + RED + '"/><circle cx="75" cy="44" r="5" fill="#57B368" opacity=".4"/>' +
    '<path d="M18 88 h32" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>',
  /* 走斑马线过街：小人走条纹 + 等候小车 */
  zebra: '<g fill="#FFF" stroke="' + INK + '" stroke-width="2"><rect x="16" y="66" width="10" height="22" rx="2"/><rect x="30" y="66" width="10" height="22" rx="2"/><rect x="44" y="66" width="10" height="22" rx="2"/><rect x="58" y="66" width="10" height="22" rx="2"/><rect x="72" y="66" width="10" height="22" rx="2"/></g>' +
    FIG(48, 50, 1.0, 'walk') + CAR(87, 58, 0.48),
  /* 从天桥过街：小人登阶梯上天桥 */
  bridge: '<path d="M14 90 h9 v-9 h9 v-9 h9 v-9 h14 v9 h9 v9 h9 v9" fill="none" stroke="#B98A5C" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    FIG(56, 40, 0.85, 'walk'),
  /* 从地下道过街：横向入口箭头 + 小人走入拱门 */
  tunnel: '<path d="M26 88 V56 Q26 32 50 32 H62 Q86 32 86 56 V88" fill="#D8ECF8" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<path d="M12 68 h24 m-8 -7 l8 7 l-8 7" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    FIG(44, 82, 0.95, 'walk'),
  /* 慢慢走不跑：大人小孩并肩散步 */
  walk: '<path d="M12 86 h76" stroke="#C9D6DF" stroke-width="8" stroke-linecap="round"/>' +
    FIG(38, 74, 1.1, 'walk') + FIG(60, 80, 0.76, 'walk'),
  /* 绕开这里走：红拦杆 + 绿绕行线 + 小人绕行 */
  noentry: '<rect x="42" y="26" width="13" height="46" rx="4" fill="' + RED + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M18 78 q-8 -36 26 -36 h28" stroke="#57B368" stroke-width="5.5" fill="none" stroke-linecap="round"/>' +
    FIG(78, 76, 1.0, 'walk'),
  /* 汽车绕开走：小车 + 掉头箭头 */
  nocar: CAR(38, 70, 0.9) +
    '<path d="M62 80 q20 0 20 -20 q0 -14 -16 -14" fill="none" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/>' +
    '<path d="M58 36 L70 46 L58 54 Z" fill="' + INK + '"/>',
  /* 不走这条路：红叉封路 + 小人走开 */
  noped: '<path d="M52 22 V78" stroke="#C9D6DF" stroke-width="11" stroke-linecap="round"/>' +
    '<path d="M40 42 L64 66 M64 42 L40 66" stroke="' + RED + '" stroke-width="5.5" stroke-linecap="round"/>' +
    FIG(22, 80, 0.9, 'walk'),
  /* 不骑车进去：下车推行（小人走 + 车旁推行） */
  nobike: BIKE(64, 72, 0.92) + FIG(32, 76, 1.0, 'walk'),
  /* 不按喇叭：喇叭 + 声波被红叉划掉 */
  horn: '<path d="M22 58 h12 l20 -11 v26 l-20 -11 Z" fill="' + INK + '"/>' +
    '<path d="M62 46 q7 11 0 22 M70 38 q12 20 0 40" stroke="#E8975A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M58 32 L86 74 M86 32 L58 74" stroke="' + RED + '" stroke-width="5" stroke-linecap="round"/>',
  /* 停一停再走：小人在停止线 + 迷你红八角停牌 */
  stop: FIG(36, 74, 1.05, 'stand') +
    '<path d="M18 88 h34" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<polygon points="78,24 90,28 94,40 90,52 78,56 66,52 62,40 66,28" fill="' + RED + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<text x="78" y="46" text-anchor="middle" font-size="15" font-weight="bold" fill="#FFF" font-family="KaiTi,STKaiti,sans-serif">停</text>',
  /* 让别的人先走：小人等候 + 绿色通行箭头先行 */
  yield: FIG(30, 76, 1.0, 'stand') +
    '<path d="M44 34 h32" stroke="#57B368" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M70 26 L84 34 L70 42 Z" fill="#57B368"/>' +
    '<circle cx="38" cy="34" r="3" fill="' + INK + '"/><circle cx="30" cy="34" r="3" fill="' + INK + '"/>',
  /* 注意向来的人：小人看 + 两侧来人 */
  ped: FIG(50, 72, 1.1, 'look') + FIG(20, 82, 0.68, 'walk') + FIG(80, 82, 0.68, 'walk'),
  /* 小心小朋友：大人牵手小孩走 */
  child: FIG(38, 68, 1.1, 'stand') + FIG(62, 80, 0.74, 'walk'),
  /* 绕开工地走：条纹锥 + 绿绕行线 + 小人绕行 */
  work: '<path d="M46 38 L58 76 H34 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M41 58 h11 M38 68 h17" stroke="#FFF" stroke-width="3.5"/>' +
    '<path d="M16 82 q-6 -30 24 -30" stroke="#57B368" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    FIG(78, 78, 1.0, 'walk'),
  /* 放慢速度走：小人走 + 钟面（不急） */
  slow: FIG(42, 70, 1.1, 'walk') +
    '<circle cx="78" cy="34" r="14" fill="none" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M78 26 v8 l6 4" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  /* 顺着箭头走：描边大箭头路 + 小人沿走 */
  oneway: '<path d="M50 14 L72 46 H60 V88 H40 V46 H28 Z" fill="none" stroke="' + BLU + '" stroke-width="6" stroke-linejoin="round"/>' +
    FIG(50, 80, 0.9, 'walk'),
  /* 一直走不转弯：双轨直路 + 蓝向上箭头 */
  straight: '<path d="M32 94 V22 M68 94 V22" stroke="#C9D6DF" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M50 18 L62 40 H55 V72 H45 V40 H38 Z" fill="' + BLU + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>',
  /* 往左边转弯：蓝左弯箭头 + 小人跟走 */
  goleft: '<path d="M62 90 V54 Q62 34 44 34 H20" stroke="' + BLU + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 24 L6 34 L22 44 Z" fill="' + BLU + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    FIG(64, 80, 1.0, 'walk'),
  /* 往右边转弯：蓝右弯箭头 + 小人跟走（左右向互异锚点） */
  goright: '<path d="M38 90 V54 Q38 34 56 34 H80" stroke="' + BLU + '" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<path d="M78 24 L94 34 L78 44 Z" fill="' + BLU + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    FIG(36, 80, 1.0, 'walk'),
  /* 路口看两边：小人看 + 左右双向箭头 */
  cross: FIG(50, 74, 1.1, 'look') +
    '<path d="M14 38 h14 m-6 -6 l6 6 l-6 6" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M86 38 h-14 m6 -6 l-6 6 l6 6" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  /* 转弯慢一点：弯路 + 小人 + 钟面 */
  turn: '<path d="M34 92 V62 Q34 38 58 38 H84" stroke="#C9D6DF" stroke-width="12" fill="none" stroke-linecap="round"/>' +
    FIG(34, 84, 1.0, 'walk') +
    '<circle cx="76" cy="70" r="10" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M76 64 v5 l4 3" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  /* 路滑小心走：打滑波线地面 + 双臂保持平衡小人 */
  slip: '<path d="M14 90 q9 -10 18 0 t18 0 t18 0 t18 0" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    FIG(50, 78, 1.1, 'balance'),
  /* 一停二看三过：红白栏杆 + 小人看 */
  rail: '<path d="M86 24 V84" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M86 30 L44 52" stroke="' + RED + '" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M72 36 l-8 4 M56 44 l-8 4" stroke="#FFF" stroke-width="4" stroke-linecap="round"/>' +
    FIG(30, 80, 1.05, 'look')
};

/* 行为卡图标工厂：actSvg(id, size)——size 缺省 92×92（卡内行为小图标） */
function actSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="92" height="92"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    ACT_ELS[id] + '</svg>';
}

/* ---------- 题面街景背景（viewBox 0 0 360 184；标志由 JS 注入 .sign-slot，
   小兔子示范由 JS 注入 .demo-pet） */
const CLOUD2 = (x, y, k) => '<g fill="#FFF" stroke="' + INK + '" stroke-width="2.2" transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
  '<ellipse cx="0" cy="0" rx="16" ry="9"/><ellipse cx="12" cy="-4" rx="11" ry="7"/><ellipse cx="-12" cy="-3" rx="9" ry="6"/></g>';
function streetSvg() {
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#CDE6F7"/>' +
    '<circle cx="38" cy="34" r="17" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M38 9 v-6 M63 34 h6 M38 59 v6 M13 34 h-6 M55 17 l4.5 -4.5 M21 17 l-4.5 -4.5" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>' +
    CLOUD2(290, 30, 1.0) + CLOUD2(228, 18, 0.55) +
    '<g stroke="' + INK + '" stroke-width="2.5">' +
    '<rect x="268" y="46" width="52" height="52" fill="#EAF0F6" rx="2"/>' +
    '<rect x="330" y="58" width="34" height="40" fill="#E2EAF2" rx="2"/>' +
    '<rect x="200" y="60" width="40" height="38" fill="#E6EDF4" rx="2"/></g>' +
    '<g fill="#FFF" opacity=".8"><rect x="278" y="54" width="9" height="9"/><rect x="296" y="54" width="9" height="9"/>' +
    '<rect x="278" y="72" width="9" height="9"/><rect x="296" y="72" width="9" height="9"/>' +
    '<rect x="208" y="68" width="8" height="8"/><rect x="222" y="68" width="8" height="8"/></g>' +
    '<path d="M0 98 h360 v20 H0 Z" fill="#C9D6DF"/>' +
    '<path d="M0 118 h360 v66 H0 Z" fill="#9AA8B5"/>' +
    '<path d="M0 150 h360" stroke="#FFF" stroke-width="4" stroke-dasharray="26 20" opacity=".75"/>' +
    '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 红绿灯元素 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="15" y="7" width="14" height="30" rx="5" fill="#4E5D6E" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="22" cy="14" r="4" fill="' + RED + '"/><circle cx="22" cy="22" r="4" fill="#F5C445" opacity=".5"/>' +
    '<circle cx="22" cy="30" r="4" fill="#57B368" opacity=".5"/></svg>',
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
