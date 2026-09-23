/* ================= stamp 规律画画 游戏数据（20 题封闭题库 v3 难度升档 / 图案 SVG /
   印章 SVG / 章配置 / 语音文案）
   玩法（b38 改造 2026-09-13：家长审计全站第 2 严重难度过低款升档——段基线 5.5-6.5
   幼小衔接，宁难勿易；保留「看花边盖印章」框架与载体创作演出）：
   - ch1 ABC 三周期起步（F 红花/S 黄星/H 粉心/O 蓝圆点；相位轮换=seqLen 长度差承载）
   - ch2 双同块 AABB（两同对）/ABCC（尾双同）——「同」也是规律信息
   - ch3 双线索规律（核心升级）：图案=形状×颜色双属性（池 8），颜色周期 3 与形状
     周期 6 各自独立错位——续盖位须同时满足两线索（单看颜色/单看形状都会盖错）
   - ch4 体检纠错（生成层 Bloom 升级）：花边满盖含 1 枚错章（seeded 位），先点出错章
     （tapCell→found）再从印章盘选正确章盖上（tapStamp→fixed）
   - 去语音泄题：题面只播任务框架句（spm_task_next/dual/fix——keyless 文本+clip
     优先），规律本身只能靠看不能靠听（原图案名连读直念规律句废除）
   印章盘 3-4 枚：ch1-2 正确 1+seeded 干扰 2；ch3-4 正确 1+单色对+单形对+1 池内
   干扰（单属性干扰=只满足颜色或只满足形状——verify 验算恰不满足另一属性）。
   题库封闭 20 题（4 章×5）：数学先验（_table_check.py 先验自验 ✓）：单属性行
   strip 第 i 格真值=period[i%plen]；双属性行真值=colors[i%3]+shapes[i%6]。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（SPEC-BATCH38 §4 实长表；2026-09-12 浏览器实测）
   spm_tut_watch 3192 / spm_tut_turn 1752 / spm_hint 2232 / spm_right 2016 /
   spm_wrong 2016。确认链窗 STAMP_WIN=2316（=2016+300 精确）；错链豁免窗
   WRONG_CHAIN_WIN=6066（=2016+150+3600+300，spm_hint 重合成实长）；首错演出锁 SHAKE_MS=1100
   （b37 R3 铁律：≤wrong clip+150=2166——禁覆盖豁免窗，留对选放行活跃段）；
   题面任务框架句窗=estMs(句长)+300（家族 T 动态，最长句 13 字 estMs 5085）。
   〔2026-09-13 主线重合成后实长回更：spm_hint 3600/spm_fix_wrong 4152/
   spm_task_next 3264/spm_task_dual 3384/spm_task_fix 3504；WRONG_CHAIN_WIN
   4698→6066、FIX_WRONG_WIN 2316→4452 已同步〕 ---------- */
const ENTER_MS = 400;                        // 载体出场动画窗（与任务句并行）
const STAMP_WIN = 2316;                      // 盖对演出窗 = spm_right 2016+300（精确）
const FOUND_WIN = 1200;                      // ch4 找错章标记+盘弹出窗（无语音）
const SHAKE_MS = 1100;                       // 盖错虚影抖动锁窗（≤2166，b37 R3）
const WRONG_CHAIN_WIN = 6066;                // 错链豁免窗=[spm_wrong,spm_hint] 实长 2016+150+3600+300（真时钟）
const FIX_WRONG_WIN = 4452;                  // ch4 点非错章链=[spm_fix_wrong] 4152+300（真时钟）
const TUT_WATCH_WAIT = 3550;                 // ≥spm_tut_watch 3192+300=3492（+58 防单帧溢出，审查 m5）
const TUT_TURN_WAIT = 2100;                  // ≥spm_tut_turn 1752+300=2052
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- 章配置（v3 升档：ch1 ABC/ch2 双同块/ch3 双线索/ch4 体检纠错；
   进度章号单调递增、难度章号 dch=1+flat//5 静态四档；生成关 flat≥20 dch=ri(rnd,1,4) seeded）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '三色花边',   hint: '花边升级啦，一样的图案也会手拉手排队' },  // 预告 ch2 AABB/ABCC 双同块
  2: { name: '双同花边',   hint: '下一种花边，颜色和形状都有自己的规律哦' }, // 预告 ch3 双线索
  3: { name: '双线索花边', hint: '花边里会藏一枚盖错的章，把它找出来' },    // 预告 ch4 体检纠错
  4: { name: '花边小医生', hint: '新的花边来啦，看清规律继续盖' }           // 预告生成关
};
const GEN_HINTS = ['三色花边转着排，看清再盖',        // dch1 ABC
                   '双同花边手拉手，找对规律',        // dch2 AABB/ABCC
                   '颜色形状两条线，都要看清',        // dch3 双线索
                   '花边医生查错章，把它找出来'];     // dch4 体检
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=spm_）
   v3 升档（2026-09-13）：spm_hint 文案改「找找颜色的规律，再看看形状」；新增
   spm_task_next/dual/fix（题面任务框架句）+ spm_fix_wrong（ch4 点非错章）——
   4 条新 clip 为占位复制，主线重合成覆盖（句定死禁改）。 ---------- */
const VOICE = {
  watch:    { key: 'spm_tut_watch', text: '看！按规律盖花边' },
  turn:     { key: 'spm_tut_turn',  text: '你来盖一盖' },
  hint:     { key: 'spm_hint',      text: '找找颜色的规律，再看看形状' },
  right:    { key: 'spm_right',     text: '花边真漂亮' },
  wrong:    { key: 'spm_wrong',     text: '再看看规律哦' },
  taskNext: { key: 'spm_task_next', text: '看看花边的规律，盖下一个' },   // ch1-2 题面
  taskDual: { key: 'spm_task_dual', text: '颜色和形状都有自己的规律哦' },  // ch3 题面
  taskFix:  { key: 'spm_task_fix',  text: '花边里有一枚盖错啦，找出来' },  // ch4 题面
  fixWrong: { key: 'spm_fix_wrong', text: '这枚是对的哦，再看看哪枚不合规律' } // ch4 点非错章
};
const Q_TEXT = '看清花边的规律，盖对下一个';    // 纯文字装饰句（不播、不含规律——零泄题）

/* ---------- 图案库 v3（ch1-2 单属性 4 种 + ch3-4 双属性 8 种）
   双属性 id=颜色字+形状字：R红/Y黄/B蓝/G绿 × T三角/C圆/S方/H心；
   池 8（形状 4×颜色 4 交叉取 8）：RT 红三角/YC 黄圆/BS 蓝方/GH 绿心/
   RC 红圆/YS 黄方/BT 蓝三角/GC 绿圆。
   COLOR_MATE=同色异形单色对伴章；SHAPE_MATE=同形异色单形对伴章（心仅 GH
   一枚无伴——题表先验已保证答位/badIdx 域真值永非 GH，伴章恒存在）。
   motifSvg 产 svg[data-motif]（契约 M 盖印留格 DOM 断言锚——渲染即引擎）。 ---------- */
const MOTIF_NAME = { F: '红花', S: '黄星', H: '粉心', O: '蓝圆点',
                     RT: '红三角', YC: '黄圆', BS: '蓝方', GH: '绿心',
                     RC: '红圆', YS: '黄方', BT: '蓝三角', GC: '绿圆' };
const MOTIF_IDS = ['F', 'S', 'H', 'O'];                       // ch1-2 单属性池
const DUAL_IDS = ['RT', 'YC', 'BS', 'GH', 'RC', 'YS', 'BT', 'GC'];  // ch3-4 双属性池
const DUAL_COLORS = { R: '#E86A6A', Y: '#F5C542', B: '#7FA8D9', G: '#8FBF7F' };
const COLOR_MATE = { RT: 'RC', RC: 'RT', YC: 'YS', YS: 'YC',
                     BS: 'BT', BT: 'BS', GC: 'GH', GH: 'GC' };
const SHAPE_MATE = { RT: 'BT', BT: 'RT', YC: 'RC', RC: 'GC',
                     GC: 'YC', BS: 'YS', YS: 'BS', GH: null };
function dualInner(id) {
  const fill = DUAL_COLORS[id[0]], sh = id[1], sw = '2.6';
  const shine = '<path d="M25 30 q5 -7 13 -6" stroke="#FFF" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".55"/>';
  if (sh === 'T') return '<path d="M40 14 L67.5 62 L12.5 62 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' + shine;
  if (sh === 'C') return '<circle cx="40" cy="40" r="25" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + sw + '"/>' + shine;
  if (sh === 'S') return '<rect x="16" y="16" width="48" height="48" rx="9" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' + shine;
  return '<path d="M40 63 C17 47 15 30 25 23 C32 18 40 23 40 30 C40 23 48 18 55 23 C65 30 63 47 40 63 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="' + sw + '" stroke-linejoin="round"/>' + shine;
}
function motifInner(id) {
  if (id === 'F') return '<circle cx="40" cy="21" r="10.5" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="56.5" cy="30.5" r="10.5" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="56.5" cy="49.5" r="10.5" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="40" cy="59" r="10.5" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="23.5" cy="49.5" r="10.5" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="23.5" cy="30.5" r="10.5" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="40" cy="40" r="10" fill="#F5C542" stroke="' + INK + '" stroke-width="2.2"/>';
  if (id === 'S') return '<path d="M40 16 L46.5 33.1 L64.7 34 L50.5 45.4 L55.3 63 L40 53 L24.7 63 L29.5 45.4 L15.3 34 L33.5 33.1 Z" ' +
    'fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>';
  if (id === 'H') return '<path d="M40 62 C18 46 16 30 26 23 C33 18 40 23 40 30 C40 23 47 18 54 23 C64 30 62 46 40 62 Z" ' +
    'fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>';
  if (id === 'O') return '<circle cx="40" cy="40" r="24" fill="#7FA8D9" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M28 32 q4 -6 11 -5" stroke="#FFF" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".6"/>';
  return dualInner(id);                        // 双属性 8 种（ch3-4）
}
const motifSvg = id => '<svg data-motif="' + id + '" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg">' +
  '<g data-anim="motif">' + motifInner(id) + '</g></svg>';

/* ---------- 印章 SVG（木质印章+底部印面图案——孩子看见印什么；好坏同构描线风） ---------- */
function stampSvg(id) {
  return '<svg viewBox="0 0 96 118" xmlns="http://www.w3.org/2000/svg">' +
    '<g data-anim="stamp">' +
    '<rect x="41" y="4" width="14" height="11" rx="4.5" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="37" y="13" width="22" height="30" rx="6" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="29" y="42" width="38" height="12" rx="5" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="16" y="53" width="64" height="17" rx="8.5" fill="#A9784C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<g data-motif="' + id + '" transform="translate(28,73) scale(0.5)">' + motifInner(id) + '</g>' +
    '</g></svg>';
}

/* ---------- 20 题封闭题库 v3（升档定版 2026-09-13；_table_check.py 先验自验 ✓）
   行 schema：
     kind   'next'=ch1-3 续盖 | 'fix'=ch4 体检纠错
     unit   ch1-2=周期形态字符串 'ABC'|'AABB'|'ABCC'（长度即周期长）；
            ch3-4={colors:[3], shapes:[6]} 双周期对象（颜色/形状各自独立取模推进）
     period ch1-2 周期串（单属性池 4 种图案）；seqLen=示范段长（相位轮换=长度差承载）
     ch3    seqLen=12（2 个组合周期=颜色×4 轮+形状×2 轮，双线索可推出）+1 空位
     ch4    seqLen=12 满盖含 1 错章：badIdx=seeded ri(rnd,6,10)（首个组合周期
            0-5 恒真值=公平锚），错章=真值单属性伴章（scene 偶=单形对/奇=单色对）
   单属性真值=period[i%plen]；双属性真值=colors[i%3]+shapes[i%6]——每续盖位
   唯一正确章（相位即续印，数学先验 ✓）。 ---------- */
const ROWS = [
  /* ch1 ABC 三周期（scenes 0-4；同 period 不同 seqLen=不同相位题） */
  { kind: 'next', unit: 'ABC',  period: 'FSH',  seqLen: 6 },   // ① FSHFSH__→F
  { kind: 'next', unit: 'ABC',  period: 'FSH',  seqLen: 7 },   // ② FSHFSHF__→S（相位轮换）
  { kind: 'next', unit: 'ABC',  period: 'SHO',  seqLen: 6 },   // ③ SHOSHO__→S
  { kind: 'next', unit: 'ABC',  period: 'SHO',  seqLen: 8 },   // ④ SHOSHOSH__→O（相位轮换）
  { kind: 'next', unit: 'ABC',  period: 'HOF',  seqLen: 9 },   // ⑤ HOFHOFHOF__→H
  /* ch2 双同块（scenes 5-9：AABB=两同对×3 / ABCC=尾双同×2——「同」也是规律信息） */
  { kind: 'next', unit: 'AABB', period: 'FFSS', seqLen: 8 },   // ⑥ FFSSFFSS__→F
  { kind: 'next', unit: 'AABB', period: 'HHOO', seqLen: 8 },   // ⑦ HHOOHHOO__→H
  { kind: 'next', unit: 'ABCC', period: 'FHOO', seqLen: 9 },   // ⑧ FHOOFHOOF__→H（相位轮换）
  { kind: 'next', unit: 'AABB', period: 'OOFF', seqLen: 8 },   // ⑨ OOFFOOFF__→O
  { kind: 'next', unit: 'ABCC', period: 'SHOO', seqLen: 10 },  // ⑩ SHOOSHOOSH__→O（相位轮换）
  /* ch3 双线索（scenes 10-14：颜色周期 3×形状周期 6 独立错位——单看一属性必错） */
  { kind: 'next', unit: { colors: ['R', 'Y', 'B'], shapes: ['T', 'C', 'S', 'C', 'S', 'T'] }, seqLen: 12 },  // ⑪ RT YC BS RC YS BT ×2 →RT
  { kind: 'next', unit: { colors: ['B', 'Y', 'R'], shapes: ['S', 'C', 'T', 'T', 'S', 'C'] }, seqLen: 12 },  // ⑫ BS YC RT BT YS RC ×2 →BS
  { kind: 'next', unit: { colors: ['B', 'R', 'Y'], shapes: ['S', 'T', 'C', 'T', 'C', 'S'] }, seqLen: 12 },  // ⑬ BS RT YC BT RC YS ×2 →BS
  { kind: 'next', unit: { colors: ['R', 'Y', 'B'], shapes: ['C', 'S', 'T', 'T', 'C', 'S'] }, seqLen: 12 },  // ⑭ RC YS BT RT YC BS ×2 →RC
  { kind: 'next', unit: { colors: ['G', 'R', 'Y'], shapes: ['C', 'T', 'C', 'H', 'C', 'S'] }, seqLen: 12 },  // ⑮ GC RT YC GH RC YS ×2 →GC
  /* ch4 体检纠错（scenes 15-19：满盖 12 格含 1 错章——先找（tapCell）再修（tapStamp）） */
  { kind: 'fix', unit: { colors: ['Y', 'B', 'R'], shapes: ['C', 'S', 'T', 'S', 'T', 'C'] }, seqLen: 12 },   // ⑯ YC BS RT YS BT RC ×2 含 1 错
  { kind: 'fix', unit: { colors: ['B', 'G', 'R'], shapes: ['S', 'C', 'T', 'T', 'C', 'C'] }, seqLen: 12 },   // ⑰ BS GC RT BT GC RC ×2 含 1 错
  { kind: 'fix', unit: { colors: ['R', 'G', 'Y'], shapes: ['T', 'C', 'S', 'T', 'C', 'C'] }, seqLen: 12 },   // ⑱ RT GC YS RT GC YC ×2 含 1 错
  { kind: 'fix', unit: { colors: ['G', 'Y', 'R'], shapes: ['C', 'S', 'T', 'C', 'C', 'T'] }, seqLen: 12 },   // ⑲ GC YS RT GC YC RT ×2 含 1 错
  { kind: 'fix', unit: { colors: ['Y', 'B', 'G'], shapes: ['C', 'S', 'C', 'S', 'T', 'H'] }, seqLen: 12 }    // ⑳ YC BS GC YS BT GH ×2 含 1 错
];
/* 题面任务框架句（去语音泄题——规律只靠看不靠听；say=keyless 文本+clip 优先）：
   ch1-2 spm_task_next / ch3 spm_task_dual / ch4 spm_task_fix */
ROWS.forEach((r, i) => {
  const v = i < 10 ? VOICE.taskNext : (i < 15 ? VOICE.taskDual : VOICE.taskFix);
  r.sayKey = v.key;
  r.sayText = v.text;
});

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 小围巾+黄星（盖花边主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M10 18 q12 -7 24 0 l-2 12 q-10 5 -20 0 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M12 30 l-2 5 M18 31.5 l-1 5 M26 31.5 l1 5 M32 30 l2 5" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>' +
    '<path d="M22 15.5 L23.6 19.6 L28 19.9 L24.6 22.4 L25.7 26.6 L22 24.3 L18.3 26.6 L19.4 22.4 L16 19.9 L20.4 19.6 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/></svg>',
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
