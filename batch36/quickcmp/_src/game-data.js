/* ================= quickcmp 快速比大小 游戏数据（NUMCN 1-20 / 章配置 / 语音文案 / SVG）
   玩法（SPEC-R46 现行版，6-7 岁数感·感数近似比较）：屏幕左右两组圆点阵闪现后消失，
   问句 qc_ask「哪边的圆点多」+ 按钮点选（ch1 两按钮禁一样多；ch2+ 三按钮）；
   ch4=dual 双闪两段式（先闪左簇→ISI→再闪右簇→第一问方向三选→第二问「多几个呢」
   差值三档 2/4/6——工作记忆负荷上探，r24/r25 half 两步范式）。
   章谱（SPEC-R46 §R2）：
     ch1 n1,n2∈1-5 差≥1 禁相等（subitizing 锚面章，谱零改动——flat0-4 逐字节保留）
     ch2 非等 n∈10-20 差≥2 且 0.85≤min/max<0.92（比例收紧带）+等数 n∈10-20 混出 70/30
     ch3 恒非等 n∈10-20 差≥2 且 0.85≤min/max<0.90（窄带提速档）
     ch4 dual：base∈[10,20-d]，d∈{2,4,6}（双闪序列）
   渲染铁律：圆点等大（同题同半径 rOf：max(nL,nR)≤12?8:7.5）+网格抖动随机散布不重叠
   （n≤12 四行三列 12 格 / n≥13 五行四列 20 格）+左右区对称——禁面积反向作弊布局。
   点对=right+复述「左边X个右边Y个」（T46 化：NUMCN 1-20 契约 L 全量拆段 clip 拼播——
   数词段 qc_n_1..20 全在册，r46 段二注册 11-20，SPEC §R7/§R13）；点错=wrong+miss+
   多的一侧 pulse；miss≥2 多的一侧 breathe（等数题两侧；dual 第二问=正确档 breathe）。
   闪现后无限时压力（超时零惩罚）；闪现窗内输入吞 null。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 契约 L：数字 TTS 映射表覆盖封闭集 1-20 全量（2=两 仅个位；十位复合
   11-19=十+个位、20=二十 用「二」——SPEC-R46 §R7）。本表=纯数词映射，verify 双录
   对账源（game-verify ① SPEC_NUMCN 全量对账）；运行时无显示/播报直读消费点（显示面
   =圆点+数字、播报面=clip 键带量词）。注册 clip 文案=数词+「个」量词口径（十一个…
   二十个，与在册 qc_n_1..10
   同族——r46 段二键集对账勘误 09-22），复述链同链同量词，非本表值直读。
   数词段键 qc_n_1..20 全在册（r46 段二注册后 29 键/manifest games 计数 32） ---------- */
const NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五',
                6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
                11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
                16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十' };

/* ---------- T46 化（2026-09-19）：确认链复述拆段 clip（qc_s_left 左边+qc_n_1..20
   数词+qc_s_right 右边）queue 拼播。实长（1-10 voice/clips Audio 实测 09-19；11-20
   mutagen 实测 09-22 r46 段二——verify SPEC 副本对账）：qc_s_left 1344/qc_s_right
   1368/qc_n 1-10 1320-1464 / 11-20 1536-1632（max=1632——判对演出窗动态尾 7400 罩
   实测链 9132，SPEC §R8 实测复核行） ---------- */
const numClip = n => 'qc_n_' + n;                 // 数词段键（1-20 全在册，r46 段二注册收口）
const segParts = q => ['qc_s_left', numClip(q.nL), 'qc_s_right', numClip(q.nR)];   // 「左边N个右边M个」4 段

/* ---------- 闪现窗（SPEC-R46 §R8 论证定值）：ch1 subitizing 1200（锚面不变）/
   ch2 大数域 1400（10-20 簇 ANS 编码——1400ms 恒数不完强制 ANS 通路）/
   ch3 提速档 1200（同域编码压力上探）/ ch4 dual 每簇 1400+ISI 800（SPEC §R8 WM 论证）
   ——感知窗非答题窗 ---------- */
const FLASH_EASY = 1200, FLASH_MID = 1400;
const DUAL_ISI = 800;                             // dual 双簇间隔（第一簇消隐→第二簇揭示）
const flashMs = dch => (dch === 2 || dch === 4 ? FLASH_MID : FLASH_EASY);
/* dual half 转相位窗：qc_ask_gap「多几个呢」实测 1656（mutagen 09-22）+300=1956
   ≤ 2700（余 744，窗不调——原 estMs(5)=2325 定值口径已由实测复核销账，SPEC §R8） */
const GAP_ASK_WIN = 2700;

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 数值断言）。
   r46 文案变更仅 2 条：CHAPTERS[3].hint/GEN_HINTS[3] 预告 ch4 双闪（章名全保留） ---------- */
const CHAPTERS = {
  1: { name: '圆点闪一闪', hint: '有时候两边一样多哦' },     // 预告 ch2 等数题+三按钮
  2: { name: '一样多吗',   hint: '圆点变多啦，要看得快' },   // 预告 ch3 Weber 窄带提速
  3: { name: '看得快',     hint: '圆点要闪两次啦，记住再比一比' }, // 预告 ch4 dual 双闪（r46 改）
  4: { name: '大挑战',     hint: '新一轮快速比大小' }        // 预告生成关
};
const GEN_HINTS = ['小圆点，比一比',        // dch1 subitizing 1-5 两按钮
                   '留心一样多',            // dch2 等数题混出三按钮
                   '圆点变多了',            // dch3 Weber 10-20 快闪
                   '圆点闪两次'];           // dch4 dual 双闪两段式（r46 改）
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=qc_ 已核
   manifest 无占用 ✓ 2026-09-12 实查；T46 段键 09-19 复核；r46 新键 qc_ask_gap/
   qc_n_11..20 已注册 09-22 段二——manifest 5350→5459，SPEC-R46 §R7/§R13）。clip 实长
   （batch36/_clipdur36.json 浏览器实测）：tut_watch 3072 / tut_turn 1848 / hint 2496 /
   right 2256 / wrong 1992 / ask 2088。确认链（T46 化）=right 2256+150×4+段 4 实长+300，
   n≤10 最坏 8796（尾窗 6800 档）；n∈11-20 实测 ≤9132（尾窗 7400 档——SPEC §R8 实测
   复核 09-22，max 1632/键）；错链=wrong 1992+150+hint 2496+300=4938（豁免窗真时钟） ---------- */
const VOICE = {
  watch: { key: 'qc_tut_watch', text: '看！圆点闪一闪' },
  turn:  { key: 'qc_tut_turn',  text: '你来比一比' },
  hint:  { key: 'qc_hint',      text: '数一数，比一比' },
  right: { key: 'qc_right',     text: '比对啦，真棒' },
  wrong: { key: 'qc_wrong',     text: '再仔细看看哦' },
  ask:   { key: 'qc_ask',       text: '哪边的圆点多' },
  /* r46 新键（SPEC-R46 §R7）：dual 第二问问句——r46 段二已注册（09-22，实测 1656） */
  gap:   { key: 'qc_ask_gap',   text: '多几个呢' }
};

/* ---------- 圆点阵 SVG 工厂：dotsSvg(n, pts, r)——viewBox 0 0 100 100，同题同半径
   （渲染铁律：等大禁面积作弊；r=rOf(q) 8|7.5——n≥13 大簇密布降半档）；circle
   class="dot"（verify 计数锚：.dot 数==n；消隐走容器 .veil 透明度，DOM 恒在=
   闪现后残留计数锚——契约 M） ---------- */
function dotsSvg(n, pts, r) {
  let s = '';
  for (let k = 0; k < n; k++)
    s += '<circle class="dot" cx="' + pts[k][0].toFixed(2) + '" cy="' + pts[k][1].toFixed(2) +
         '" r="' + r + '" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' + s + '</svg>';
}
/* 中缝 VS 徽章（左右区对称分界的视觉锚，非按钮） */
const VS_BADGE =
  '<svg viewBox="0 0 48 48" width="44" height="44" xmlns="http://www.w3.org/2000/svg" fill="none">' +
  '<circle cx="24" cy="24" r="20" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="16" cy="24" r="4.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="24" cy="24" r="4.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="32" cy="24" r="4.5" fill="#E8756A" stroke="' + INK + '" stroke-width="2"/>' +
  '</svg>';

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 左右圆点比大小（主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="13" cy="22" r="5" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="26" cy="15" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="26" cy="24" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="33" cy="19.5" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="33" cy="28.5" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="26" cy="33" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '</svg>',
  eye: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 30 Q32 8 56 30 Q32 52 8 30 Z" stroke="' + INK + '" stroke-width="4" fill="#FFF9EE" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="30" r="9" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="32" cy="30" r="3.4" fill="#4A3B2E"/>' +
    '</svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
