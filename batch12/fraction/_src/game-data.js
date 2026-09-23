/* ================= fraction 分数披萨 游戏数据（章配置 / 语音文案 / 数词表 / SVG 披萨 / r15 时长模型）
   玩法（SPEC-BATCH12 §2 + r15 难度改造 2026-09-16，AUDIT-78:78 定案）四题型点选（灰化款）——
   A cut 切分判断（r15 4 选 1）：题面"哪一个是平均分成了 n 份"（clip fra_q_cut + 数词段拼接），
     选项 4 张披萨：正确 = n 等分；干扰 = n 份不均 + (n+1) 等分 + (n+1) 份不均（r15 加"非平均切"干扰——
     un(n+1) 份数错+不均双特征，逼"数份数+验等分"双查，治 cut 纯知觉）；
   B read 分数识别：题面披萨涂色 k/n 份，点分数大字卡；干扰 = n/k、k/(n+1)、(k+1)/n
     （按值域过滤：禁 0/负/超 1 假分数/分母 1（n/n=1 属合法近错放行，审查 m9），§0.17）；
   C cmp 比大小：两块同尺寸披萨块，点大的那块。ch4 同分子对（1/2 vs 1/3 等）；
     r15 ch5 新增同分母对（1/4 vs 3/4 等，CMP2_SET）；
   E eq 等值匹配（r15 新题型，ch5）：题面参照披萨块 + "哪一块和它一样大"，点等值块——
     构造域=分母 ≤4 真分数等值对恰 1 对 {1/2, 2/4}（prior 验算），干扰取 {1/3,1/4,2/3,3/4}。
   章进阶（r15 章型重排，5 章×8 题）：ch1 认 1/2（A+B）/ ch2 三四等分混 read（A+B：cut n=3/4 +
     read 1/3、1/4）/ ch3 几分之几（B）/ ch4 比大小混 read（C+B）/ ch5 一样大（E+C 同分母）。
   披萨全部 SVG 扇形 path 等分角计算生成（结构化图形禁栅格，§0.15/任务铁律）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）
/* 披萨配色：饼边暖麦 / 芝士两档交替（切分卡可数份） / 涂色暖橙（DESIGN 主色）/ 香肠点缀 */
const CRUST = '#E2A25E', CHEESE = '#F6CD80', CHEESE2 = '#EDB55E', FILLED = '#E8975A', PEPPER = '#D96C4F';

/* ---------- 章配置（章号 1 基；hint 按"预告下一章"语义写——完成第 N 章显示 CHAPTERS[N].hint
   预告第 N+1 章内容，承 shadow/fruit 家族口径；GEN 文案不带"明天："前缀，core 模板自带。
   r15：4→5 章（ch5 一样大=分数比较与等值章）+CH_LEN 5→8+STATIC_LEVELS 40 */
const CHAPTERS = {
  1: { name: '对半切',   hint: '接下来，三份四份的披萨，还要认一认' }, // 完成第 1 章时预告第 2 章（r15 混 read）
  2: { name: '切三切四', hint: '涂了颜色的披萨，要认几分之几啦' },     // 预告第 3 章
  3: { name: '几分之几', hint: '两块披萨，比一比哪一块大' },           // 预告第 4 章
  4: { name: '比大小',   hint: '还有一样大的披萨块，来找一找' },       // 预告第 5 章（r15 新章）
  5: { name: '一样大',   hint: '新一轮分数披萨挑战' }                  // 完成第 5 章预告生成关
};
const GEN_HINTS = ['新的对半切披萨', '三份四份切一切，认一认', '涂色认几分之几', '披萨块比大小', '找一样大的披萨块'];
const CH_LEN = 8;          // r15：每关 5→8 题（AUDIT-78:78）
const STATIC_LEVELS = 40;  // 静态 40 关 = 5 章 × 8 题（r15）
const N_CHAPTERS = 5;      // r15：5 章
const LVS = [0, 1, 2, 3, 4, 5, 6, 7];   // 本章全部 lv（pass chapterLevels/stars5/renderDots 共用，r15 8 题）

/* ---------- A 型题面数词表（题面拼接裁决：clip 库无数词 clip，数词段走 fra_num_* 单段 clip
   拼接（审查 M1 定版，禁 key:null TTS 段）；"两"自然中文份数（FRA_NUM），分数词用"二"见 FRAC_NAME */
const FRA_NUM = { 2: '两', 3: '三', 4: '四' };

/* ---------- 分数词（与 voice/clips/manifest.json fra_f_* 六条严格一致，禁改 key/text） */
const FRAC_NAME = {
  '1/2': '二分之一', '1/3': '三分之一', '1/4': '四分之一',
  '2/3': '三分之二', '2/4': '四分之二', '3/4': '四分之三'
};
const fracKey = (k, n) => 'fra_f_' + k + '_' + n;   // 分数词 clip key

/* ---------- 语音文案（与 manifest 严格一致；wrong 已 clip 化——审查 m5；r15 增 fra_q_eq 等值题面句） */
const VOICE = {
  watch: { key: 'fra_tut_watch', text: '看！披萨切一切' },
  turn:  { key: 'fra_tut_turn',  text: '你来挑一挑' },
  hint:  { key: 'fra_hint',      text: '看一看，每份一样大' },
  wrong: { key: 'fra_wrong',     text: '再想一想，看一看每份' }  /* 纠错轻语音 clip 化（审查 m5：高频路径禁系统 TTS 音色跳变） */
};
/* 题面文字（aria/兜底用；实际播报走 speakQuiz 的 queue 拼接） */
const quizText = q => q.kind === 'cut' ? '哪一个是平均分成了' + FRA_NUM[q.n] + '份'
  : q.kind === 'read' ? '涂色部分是几分之几' : q.kind === 'cmp' ? '哪一块大' : '哪一块和它一样大';

/* ---------- r15 时长模型（crd r12 范式；认知步主体非演出窗——四方同步：
   源常量+本注释+verify estMsV 独立断言+build.py 字面 assert）。
   estMs = s => s.length * 345 + 600（b25 定版：SAPI ~345ms/字+600，全字符口径）。
   每关 = OPEN_MS（开场链：hint clip 主体窗 + 2000ms 接力空窗）+ Σ每题 dur；
   每题 dur = max(voiceWin, DECIDE_MS[kind]) + ADV_BASE + (kind!=='cut' ? ADV_WORD : 0)：
   voiceWin（题面句语音窗）：cut = 5550 = estMs('哪一个平均分成了')3360 + estMs(数词)945 +
     estMs('份')945 + 2×150 段间停顿（queue 三段）；read = estMs('涂色部分是几分之几')3705；
     cmp = estMs('哪一块大')1980；eq = estMs('哪一块和它一样大')3360（r15 新题面句 8 字）。
   DECIDE_MS（7-8 岁单题认知推算，r15 四题型）：
     cut 8500（r15 4 卡：每卡数仂数 2-5 约 1.1s + 等分角宽判别约 0.9s，×4 卡+确认）；
     read 7000（数涂色份 2-4 + 数总份 → 分子分母映射 + 3 分数卡逐卡比对+确认）；
     cmp 5500（两块同径角宽直比——同分子/同分母差档最小 1/12 圆心角 30°，易判）；
     eq 7500（r15 新题型：参照块角宽心象保持 + 3 候选逐一角宽比对 + 等值"写法不同但一样大"映射+确认）。
   语音窗恒小于 DECIDE（5550<8500 / 3705<7000 / 1980<5500 / 3360<7500——语音从不撑时长）。
   ADV_BASE 620（答对 lit 停半拍，main 实码 wait(620*SPEED)）；
   ADV_WORD 1450（非 cut 分数词强化窗，main 实码 wait(1450*SPEED)）。
   验算（prior_check.py 80 关全量，2026-09-16）：每题 cut 9120 / read 9070 / cmp 7570 / eq 9570；
   章均 ch1=ch2 78465 / ch3 78265 / ch4 72265 / ch5 74265（+OPEN_MS 5705）——
   全部 ≥ LEVEL_MIN_MS 40000；80 关 modeled 最低值=72265（flat24，dch4 混 read 章 4C+4B），
   verify 独立复算按 72265 精确断言（防回漂），build.py 同步字面 assert。
   实测 clip 主体窗 ≤ 估算预算（2026-09-16 ffprobe）：fra_q_eq 2184ms ≤ 3360 ✓
   / fra_hint 2688 ≤ 3705 ✓ / fra_q_read 2760 ≤ 3705 ✓ / fra_q_cmp 1608 ≤ 1980 ✓。 ---------- */
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）
const QGAP = 150;                              // queue 段间停顿（core voice.queue 实码）
const OPEN_MS = estMs('看一看，每份一样大') + 2000;   // 开场链：hint clip 主体窗+接力空窗（3705+2000=5705）
const VOICE_MS = {
  cut: estMs('哪一个平均分成了') + estMs('两') + estMs('份') + 2 * QGAP,   // 5550（数词按 1 字档估）
  read: estMs('涂色部分是几分之几'),                                        // 3705
  cmp: estMs('哪一块大'),                                                   // 1980
  eq: estMs('哪一块和它一样大')                                             // 3360（r15）
};
const DECIDE_MS = { cut: 8500, read: 7000, cmp: 5500, eq: 7500 };   // r15 四题型（7-8 岁认知推算）
const ADV_BASE = 620;                          // 答对 lit 停半拍（每题）
const ADV_WORD = 1450;                         // 分数词强化窗（非 cut 每题，main 实码）
const LEVEL_MIN_MS = 40000;                    // 单关 modeled 下限硬断言（r14/r15 门禁，7-8 岁口径）
const quizDurMs = q => Math.max(VOICE_MS[q.kind], DECIDE_MS[q.kind]) + ADV_BASE + (q.kind !== 'cut' ? ADV_WORD : 0);
const levelDurMs = L => OPEN_MS + L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);
const modeled = flat => levelDurMs(genLevel(flat | 0));

/* ---------- 图标（内嵌 SVG 描线风；披萨/披萨块由 pizzaSvg/wedgeSvg 程序生成） */
const ICONS = {
  /* logo：一块小披萨（一瓣涂色 = 分数主题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="22" cy="24" r="16" fill="' + CRUST + '" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="22" cy="24" r="12" fill="' + CHEESE + '"/>' +
    '<path d="M22 24 L22 12 A12 12 0 0 1 34 24 Z" fill="' + FILLED + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M22 24 L22 12 M22 24 L34 24 M22 24 L10 24 M22 24 L14.7 32.7 M22 24 L29.3 32.7" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="22" cy="18" r="1.7" fill="' + PEPPER + '"/></svg>',
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

/* ================= SVG 扇形生成（等分角计算；角度制，y 向下 → 正角顺时针，-90 = 12 点钟） ================= */
const _rad = d => d * Math.PI / 180;
const px = (cx, r, a) => (cx + r * Math.cos(_rad(a))).toFixed(2);
const py = (cy, r, a) => (cy + r * Math.sin(_rad(a))).toFixed(2);
/* 扇形 path：圆心→弧起点→弧（sweep=1 顺时针）→闭合；>180° 置 largeArc（2/3 块=240° 需要） */
function sectorPath(cx, cy, r, a0, a1) {
  const span = a1 - a0;
  const large = span > 180 ? 1 : 0;
  return 'M' + cx + ' ' + cy + ' L' + px(cx, r, a0) + ' ' + py(cy, r, a0) +
    ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + px(cx, r, a1) + ' ' + py(cy, r, a1) + ' Z';
}
/* 弧 path（不闭合）：披萨块的饼边弧带 */
function arcPath(cx, cy, r, a0, a1) {
  const large = (a1 - a0) > 180 ? 1 : 0;
  return 'M' + px(cx, r, a0) + ' ' + py(cy, r, a0) +
    ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + px(cx, r, a1) + ' ' + py(cy, r, a1);
}

/* ---------- 整披萨 SVG：o = {t:'eq'|'un', n, w[](每份权重，和=1), rot}；
   colored = 涂色份下标数组（read 题面用）或 null（cut 题=交替芝士色可数份）
   等分卡 w 全等（1/n）、不等卡 w 角宽差 ≥1.5 倍——权重由引擎生成，渲染即引擎 */
function pizzaSvg(o, colored) {
  let a = o.rot - 90, slices = '', cuts = '';
  for (let i = 0; i < o.n; i++) {
    const a0 = a, a1 = a + 360 * o.w[i];
    const fill = colored ? (colored.indexOf(i) >= 0 ? FILLED : CHEESE) : (i % 2 ? CHEESE2 : CHEESE);
    slices += '<path d="' + sectorPath(50, 50, 38, a0, a1) + '" fill="' + fill + '" stroke="' + INK +
      '" stroke-width="2.2" stroke-linejoin="round"/>';
    cuts += '<line x1="' + px(50, 36, a0) + '" y1="' + py(50, 36, a0) + '" x2="' + px(50, 45, a0) +
      '" y2="' + py(50, 45, a0) + '" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>';
    a = a1;
  }
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="50" cy="50" r="46" fill="' + CRUST + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="50" cy="50" r="39.5" fill="' + CHEESE + '"/>' + slices + cuts + '</svg>';
}

/* ---------- 披萨块 SVG（cmp/eq 题）：从 12 点钟起顺时针 k/n 圆心角的单块，同尺寸半径可直比大小
   eq 题面参照块复用本渲染器（r15） */
function wedgeSvg(k, n) {
  const a0 = -90, a1 = -90 + 360 * k / n, span = a1 - a0;
  const am = a0 + span / 2;
  let dots = '<circle cx="' + px(50, 19, am) + '" cy="' + py(50, 19, am) + '" r="4.2" fill="' + PEPPER +
    '" stroke="' + INK + '" stroke-width="1.6"/>';
  if (span >= 90) {   // 角宽够才放第二颗香肠
    dots += '<circle cx="' + px(50, 27, a0 + span * 0.72) + '" cy="' + py(50, 27, a0 + span * 0.72) +
      '" r="4.2" fill="' + PEPPER + '" stroke="' + INK + '" stroke-width="1.6"/>';
  }
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="' + sectorPath(50, 50, 38, a0, a1) + '" fill="' + CHEESE + '" stroke="' + INK +
    '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="' + arcPath(50, 50, 42.5, a0, a1) + '" fill="none" stroke="' + CRUST +
    '" stroke-width="8" stroke-linecap="round"/>' + dots + '</svg>';
}

/* ---------- 等分权重（引擎与题面渲染共用） */
const uniformW = n => Array.from({ length: n }, () => 1 / n);
