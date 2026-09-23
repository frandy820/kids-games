/* ================= trace 描红数字 游戏数据（r5：笔顺锚点表 / 章配置 / 封闭表 / 语音文案 / 窗常量）
   r5 难度改造（SPEC-BATCH24 §7，2026-09-13）：锚点接力跟点 → 自推笔顺+听数选字+镜像辨析。
   数字 1-10 封闭承 v1（§0.56）：每数字 = SVG path（标准笔顺，归一化 0-100，y 向下）
   + 锚点序列（2-6 个）+ strokes（每笔首锚索引——数据真值保留；r5 不再做分笔呼吸接力）。
   起点方向性真值：每数字首锚 y<50（标准笔顺从上到下/从左到右起笔）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族 DESIGN-SPEC §8）

/* ---------- 数字锚点表（agent 定稿；锚点间命中区有意错开，4/5 的笔界交叉点由 z 序自洽）
   anchors[i] = [x, y]（0-100）；strokes = 每笔首锚索引（升序，strokes.length=笔数） ---------- */
const DIGITS = {
  1:  { path: 'M50,8 L50,92',
        anchors: [[50, 8], [50, 92]],
        strokes: [0], loop: false },
  2:  { path: 'M30,16 Q68,10 66,38 Q64,54 52,64 Q40,76 28,88',
        anchors: [[30, 16], [64, 44], [28, 88]],
        strokes: [0], loop: false },
  3:  { path: 'M28,20 Q56,8 62,26 Q68,44 48,52 Q72,60 68,78 Q64,94 32,90',
        anchors: [[28, 20], [52, 52], [30, 90]],
        strokes: [0], loop: false },
  4:  { path: 'M28,16 L54,74 L82,74 M54,16 L54,66',
        anchors: [[28, 16], [54, 74], [82, 74], [54, 16], [54, 66]],
        strokes: [0, 3], loop: false },          // 两笔：竖折（撇+横）+ 竖
  5:  { path: 'M30,12 L30,42 L72,42 M72,54 Q76,72 56,84 Q40,92 28,80',
        anchors: [[30, 12], [30, 42], [72, 42], [72, 56], [32, 82]],
        strokes: [0, 3], loop: false },          // 两笔：竖 + 横 / 下弧
  6:  { path: 'M30,16 Q22,40 30,62 Q40,84 62,84 Q78,82 76,62 Q74,44 52,40 Q38,38 32,48',
        anchors: [[30, 16], [28, 44], [44, 80], [76, 70], [52, 40]],
        strokes: [0], loop: false },
  7:  { path: 'M24,16 L78,16 M64,24 L36,88',
        anchors: [[24, 16], [78, 16], [64, 24], [36, 88]],
        strokes: [0, 2], loop: false },          // 两笔：横 + 斜下
  8:  { path: 'M36,12 Q24,26 32,40 Q44,52 52,58 Q30,66 24,78 Q28,94 48,94 Q70,92 66,72 Q62,56 40,42 Q30,34 36,20',
        anchors: [[36, 12], [26, 34], [52, 58], [24, 78], [46, 93], [40, 42]],
        strokes: [0], loop: true },              // 闭合环：上环+下环收笔回上环
  9:  { path: 'M58,12 Q34,14 33,34 Q33,54 55,55 Q70,55 69,36 Q68,16 58,12 L58,88',
        anchors: [[58, 12], [33, 34], [54, 55], [69, 40], [58, 88]],
        strokes: [0], loop: true },              // 闭合环：上环闭合后竖下
  10: { path: 'M14,16 L14,88 M46,16 Q66,16 67,50 Q68,84 46,86 Q26,84 26,50 Q26,16 46,16',
        anchors: [[14, 16], [14, 88], [46, 17], [67, 50], [46, 86], [26, 50]],
        strokes: [0, 2], loop: true }            // 两笔：1 + 0（0 为闭合环）
};

/* ---------- r5 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材——承家族）
   dch1 自推笔顺 1-5（起点+终点标记）/ dch2 自推笔顺 6-10（仅起点）/ dch3 听数选字+描（1-10 轮转）/
   dch4 镜像辨析混出 [mirror,listen,trace,mirror,trace]；
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，b22 教训禁右移） ---------- */
const CHAPTERS = {
  1: { name: '数字 1 到 5', nums: [1, 2, 3, 4, 5],
       hint: '要写数字6到10啦，只亮一个起点哦' },        // 预告 ch2（仅起点）
  2: { name: '数字 6 到 10', nums: [6, 7, 8, 9, 10],
       hint: '下一章听一听，找出说的是哪个数' },          // 预告 ch3（听数选字）
  3: { name: '听一听 找数字', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
       hint: '有的数字照镜子啦，找出正的那个' },          // 预告 ch4（镜像辨析）
  4: { name: '小小数字家', nums: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
       hint: '每天都是新挑战，写一写找一找' }             // 预告生成关
};
/* GEN_HINTS[k] ↔ dch=k+1（1-5 起点+终点 / 6-10 仅起点 / 听数 / 混合）——生成关 dch=(ch-1)%4+1 确定，禁右移 */
const GEN_HINTS = ['写数字1到5，起点和终点亮亮的',
                   '写数字6到10，只亮起点哦',
                   '听一听，找出说的数字再写一写',
                   '听一听、照一照、写一写，大挑战'];
const CH_LEN = 5;            // 5 题 = 1 关
const STATIC_LEVELS = 20;    // 静态 20 关 = 4 章

/* ---------- r5 封闭表（SPEC §7；verify/_selftest 从 SPEC 文字独立重列对账，禁互引引擎常量） ---------- */
/* 听数选字干扰伙伴（封闭 6 对）：4↔10 近音（sì/shí）+ 6↔9 / 2↔5 形近镜像；表外数字干扰=随机补足 */
const LISTEN_NEAR = { 4: [10], 10: [4], 6: [9], 9: [6], 2: [5], 5: [2] };
/* 镜像辨析题目标池（封闭 5）：变体在两轴翻转/旋转下有意义的数字（1/4/7/8/0 近对称不入池） */
const MIRROR_POOL = [2, 3, 5, 6, 9];
/* 镜像变体后缀（封闭 3 变体+正体）：m=scaleX(-1) 左右镜像 / r=rotate(180deg) 倒置
   （6↔9、2↔5 经 r 实现）/ f=scaleY(-1) 上下翻转（倒置 3 亦经 r/f 呈现）；卡面 id = 数字+后缀 */
const ALL10 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/* ---------- 窗常量（r5 四处同步：本处 + game-main 注释 + game-verify 断言 + build.py 字面 assert）
   WRONG=1000 错点/错选防重入（沿 v1 家族 200+800）；
   PICK_RIGHT=600 选对卡演出窗（卡 pop+淡出；hint2 语音并发不锁——窗内即可看板不空等）；
   DONE=4100 题完成数词链窗（沿 v1 审查M1：tra_right 2280+150+tra_n_10 1248+余量）。
   estMs 家族不适用（r5 全 clip 化，零 TTS 拼句）。 ---------- */
const WIN = { WRONG: 1000, PICK_RIGHT: 600, DONE: 4100 };

/* ---------- 连线音高（逐锚点递升 do→sol 循环，SPEC §0.56；C 大调五音） ---------- */
const PENTA = [261.63, 293.66, 329.63, 349.23, 392.00];   // do re mi fa sol

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   r5 新增 10 条（§7）；tra_hint/tra_wrong 两句 v1 文案与新判定不符退役（注入保留不播，season sea_q 先例）。
   数词 tra_n_1..10 承 v1（完成朗读+听数题面拼接复用）。 ---------- */
const VOICE = {
  watch: { key: 'tra_tut_watch', text: '看！从发亮的点开始点' },
  turn:  { key: 'tra_tut_turn',  text: '你来连一连' },
  hint:  { key: 'tra_hint',      text: '点发亮的小圆点' },   // v1 退役（r5 判定层只亮起点，文案过时）
  right: { key: 'tra_right',     text: '写好啦，真棒' },
  wrong: { key: 'tra_wrong',     text: '回到发亮的点哦' },    // v1 退役（r5 方向反馈按错型分流）
  hint2: { key: 'tra_hint2',     text: '从发亮的起点开始，想一想下一笔' },
  l_q:   { key: 'tra_l_q',       text: '听一听，它是几' },
  m_q:   { key: 'tra_m_q',       text: '哪个是正的' },
  w_pick:{ key: 'tra_w_pick',    text: '再听一听，是几呀' },
  w_mir: { key: 'tra_w_mir',     text: '转一转，再看看' },
  w_wait:{ key: 'tra_w_wait',    text: '这一笔要等一等' },
  w_down:{ key: 'tra_w_down',    text: '从上往下写哦' },
  w_right:{ key: 'tra_w_right',  text: '从左往右写哦' },
  w_up:  { key: 'tra_w_up',      text: '从下往上写哦' },
  w_left:{ key: 'tra_w_left',    text: '从右往左写哦' }
};
/* 中文数词（tra_n_<num> clip 的 TTS 兜底文本，与 feed numCn 同源写法） */
const NUM_CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十' };
const numCn = n => NUM_CN[n] || '';

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="8" width="36" height="28" rx="6" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M17 14 v16 M17 30 l9 -16" stroke="#E8975A" stroke-width="3" stroke-linecap="round" fill="none"/>' +
    '<circle cx="17" cy="14" r="3.4" fill="#E8975A" stroke="#4A3B2E" stroke-width="1.6"/>' +
    '<circle cx="26" cy="14" r="2.6" fill="#FBF4E4" stroke="#C9B694" stroke-width="1.6" stroke-dasharray="2 2"/></svg>',
  speaker: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M28 12 a7 7 0 0 1 14 0 v22 l7 3 a9 9 0 0 1 6 8 v4 a12 12 0 0 1 -12 12 h-8 a14 14 0 0 1 -14 -14 V30 Z" ' +
    'fill="#FFF" opacity=".95" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="34" cy="42" rx="9" ry="6" fill="#F2B8C6" opacity=".4"/></svg>',
  pen: '<svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M16 48 L20 36 L44 12 a6 6 0 0 1 8 8 L28 44 Z" fill="#F2C9A0" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M12 52 l6 -3 -3 -3 Z" fill="#E8483C" stroke="#4A3B2E" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M40 16 l8 8" stroke="#4A3B2E" stroke-width="2.6"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
