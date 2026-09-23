/* ================= plant 植树程序 游戏数据（章配置 / 语音文案 / NUMCN / 树苗·星星 SVG）
   玩法（SPEC-BATCH37 §0.89/§2 v1 + SPEC-R47-PLANT r47 难度谱定稿，6-7 岁计算思维·
   程序执行+坐标定位）：花园网格（行列标尺：ch1-2 恒在/ch3-4 开题闪现 RULER_FADE_MS
   后淡出——r47 δ2 记忆坐标坡度）+程序卡种树。
   r47 三 delta（AUDIT-67 #37 🟡 42.3s 低负荷）：
   δ1 网格升档 CH_N {1:3,2:4,3:5,4:6}（v1 3/3/4/4 废止——SPEC-R47 §R1 论证）；
   δ2 标尺闪现（ch3-4：开题可见 1.2s→淡出；错反馈/提示=标尺重闪+高亮）；
   δ3 相对指令题 rel（SPEC-R47 §R1δ3：「从星星出发，向X格，向Y格」两段指令程序，
   星星起点徽章——1 题=1 tap=1 棵树判定粒度不变）。
   每关 5 题=5 张程序卡=5 棵树（step=全关题号 0-4，b33 坑①）；关内 5 格互异
   （abs/rel 目标格共享 used 域——种过的格不能再种：点已种格=树苗轻摇拒绝 false
   家族 D 不计 miss；rel 题点星星格=星星摇 false 同为探索不罚）。
   点对=树苗生长动画+planted；点错=wrong+miss+方向级反馈（abs=高亮正确行/列标尺；
   rel=星星 starbeat pulse）+错链（abs [pl_wrong,pl_hint] 5082 / rel [pl_wrong,
   pl_rel_hint] WRONG_CHAIN_REL 6219——r47 rel 专属链豁免窗）；miss≥2=正确格
   breathe（答案级）。关末花园全景+零错开花加成（纯演出层）。
   生成流（SPEC-R47 §R3 定版）：abs=mulberry32(flat*7919+737+qi*131) 逐题独立（v1
   原样——ch1 全 abs ⇒ flat0-4 谱逐字节保留）；rel=mulberry32(flat*7919+9973+qi*131)
   独立流（r47 rel 流常量 9973）；dch=静态 ch 档（域承诺型无 RNG，v1 不变）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 章配置（SPEC-R47 §R2/§R4：网格边长 3/4/5/6 单调坡度）
   生成关 flat≥20 dch=diffOfCh(ch) 静态四档（域承诺型无 RNG——b33 硬性②显式声明：
   dch 无 RNG，与题内坐标 RNG（abs 737/rel 9973 双流逐题独立）分流）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录对账）；
   REL_PLAN[k]=该档 rel 题位（dch1 全 abs 锚面/dch2,3 rel@[1,3]/dch4 rel@[0,2,4]）
   ——SPEC-R47 §R1δ3 章谱混排 ---------- */
const CH_N = { 1: 3, 2: 4, 3: 5, 4: 6 };
const REL_PLAN = { 1: [], 2: [1, 3], 3: [1, 3], 4: [0, 2, 4] };
const CHAPTERS = {
  1: { name: '种小树',     hint: '花园变大啦，四行四列' },   // 预告 ch2（4×4 上场）
  2: { name: '小花园',     hint: '花园更大啦，五行五列' },   // 预告 ch3（5×5 上场）
  3: { name: '大花园',     hint: '大花园大挑战，六行六列' }, // 预告 ch4（6×6 上场）
  4: { name: '植树大挑战', hint: '新一轮植树开始' }          // 预告生成关
};
const GEN_HINTS = ['小花园里，再种五棵小树',   // dch1 n=3（flat20-24 恒）
                   '花园变大啦，四行四列',     // dch2 n=4（flat25-29 恒）
                   '大花园里，再种五棵小树',   // dch3 n=5（flat30-34 恒）
                   '六行六列大花园，种满小树']; // dch4 n=6（flat35-39 恒）
const CH_LEN = 5;          // 5 题 = 1 关（每关恒 5 张程序卡 5 棵树——§0.89 主线裁决定版）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 演出时序常量（SPEC-BATCH37 §4 实长表 + SPEC-R47 §R7 est 上界口径） ----------
   pl_ 在册：tut_watch 3072 / tut_turn 1824 / ask 1872 / hint 2568 / right 1944 /
   wrong 2064；确认链=right 单 clip 2244（1944+300）；abs 错链=wrong 2064+150+
   hint 2568+300=5082；abs 卡句=pl_q_{row}_{col} 全句 clip（T46 化），CARD_WIN 3315
   ≥ 6 字 est 2670+300=2970（1-6 域同字数——r47 扩域窗不动，零 pacing 回归）。
   r47 新窗（est 上界口径，注册后主线实测复核 TODO——SPEC-R47 §R6/§R7）：
   rel 卡句链 CARD_WIN_REL 6900 ≥ est 链 pl_rel_from 2325+150+pl_mv 1980+150+
   pl_mv 1980=6585+300=6885（宁等勿叠 r24 口径）；
   rel 错链 WRONG_CHAIN_REL 6219 = wrong 2064+150+pl_rel_hint est 3705+300；
   标尺淡出 RULER_FADE_MS 1200（ch3-4 开题闪现——δ2 坡度论证 §R1）。 ---------- */
const ASK_WIN = 2172;                          // 开题问句窗=pl_ask 1872+300（精确）
const CARD_WIN = 3315;                         // abs 卡句窗：≥ 6 字 est 2670+300=2970（窗不动）
const CARD_WIN_REL = 6900;                     // rel 卡句链窗：≥ est 2325+150+1980+150+1980+300=6885（r47）
const GROW_MS = 1100, PLANT_TAIL = 1300;       // 判对演出窗 2400 ≥ 确认链 1944+300=2244（家族 G/H）
const WRONG_CHAIN_WIN = 5082;                  // abs 错链豁免窗=2064+150+2568+300（真时钟，契约 I）
const WRONG_CHAIN_REL = 6219;                  // rel 错链豁免窗=2064+150+3705+300（est 上界，r47）
const RULER_ROW_MS = 700, RULER_COL_MS = 700;  // 方向级标尺重读节奏（先看行 700 再看列 700）
const RULER_FADE_MS = 1200;                    // ch3-4 标尺开题闪现后淡出（r47 δ2）
const GARDEN_WIN = 2400;                       // 关末花园全景演出 ≥ 1944+300=2244（纯演出层）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=pl_ 已核
   manifest 无占用（SPEC §4 2026-09-12 实查）。clip 实长（§4 实长表）：
   tut_watch 3072 / tut_turn 1824 / ask 1872 / hint 2568 / right 1944（判对后窗
   ≥2244）/ wrong 2064 ---------- */
const VOICE = {
  watch: { key: 'pl_tut_watch', text: '看！按卡种小树' },
  turn:  { key: 'pl_tut_turn',  text: '你来种一种' },
  ask:   { key: 'pl_ask',       text: '种在哪一格' },
  hint:  { key: 'pl_hint',      text: '先看行，再看列' },
  right: { key: 'pl_right',     text: '小树种好啦' },
  wrong: { key: 'pl_wrong',     text: '再看看卡片哦' }
};
/* rel 专属文案（r47；段一只设计不注册——SPEC-R47 §R6 键表；未注册期 core 缺 clip
   回退 speak=静默，卡文案视觉承载（r37/r44 先例）） */
const REL_FROM_KEY = 'pl_rel_from', REL_FROM_TEXT = '从星星出发';
const REL_HINT_KEY = 'pl_rel_hint', REL_HINT_TEXT = '从星星开始，数着走';

/* ---------- r47 新语音键全表（34 键，games=['plant']——SPEC-R47 §R6 三源一致锚：
   本表 / SPEC §R6 表 / build.py DESIGN_KEYS 对账；段二已注册销账（manifest 5517，
   build 断言全部 ∈ clips）；estMs(n)=n×345+600 全字符上界口径（实测实长见 SPEC §R7
   注记——est 为设计口径，实测为运行真值）） ---------- */
const DESIGN_KEYS = {
  pl_rel_from: '从星星出发',
  pl_rel_hint: '从星星开始，数着走',
  pl_mv_r1: '向右一格', pl_mv_r2: '向右两格', pl_mv_r3: '向右三格',
  pl_mv_d1: '向下一格', pl_mv_d2: '向下两格', pl_mv_d3: '向下三格',
  pl_mv_l1: '向左一格', pl_mv_l2: '向左两格', pl_mv_l3: '向左三格',
  pl_mv_u1: '向上一格', pl_mv_u2: '向上两格', pl_mv_u3: '向上三格',
  pl_q_1_5: '第一行第五列', pl_q_1_6: '第一行第六列',
  pl_q_2_5: '第二行第五列', pl_q_2_6: '第二行第六列',
  pl_q_3_5: '第三行第五列', pl_q_3_6: '第三行第六列',
  pl_q_4_5: '第四行第五列', pl_q_4_6: '第四行第六列',
  pl_q_5_1: '第五行第一列', pl_q_5_2: '第五行第二列', pl_q_5_3: '第五行第三列',
  pl_q_5_4: '第五行第四列', pl_q_5_5: '第五行第五列', pl_q_5_6: '第五行第六列',
  pl_q_6_1: '第六行第一列', pl_q_6_2: '第六行第二列', pl_q_6_3: '第六行第三列',
  pl_q_6_4: '第六行第四列', pl_q_6_5: '第六行第五列', pl_q_6_6: '第六行第六列'
};

/* ---------- NUMCN 映射表（契约 L：程序卡行列 1-6 封闭集全量 6 值，
   「第X行第Y列」骨架句——r47 扩 5/6（五六）；步数 STEPCN 独立表（两非二，口语） ---------- */
const NUMCN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六' };
const DIRCN = { r: '右', d: '下', l: '左', u: '上' };
const STEPCN = { 1: '一', 2: '两', 3: '三' };
const DIRS = ['r', 'd', 'l', 'u'];              // feasible 过滤序（rel rnd 索引确定性锚）
const DRC = { r: [0, 1], d: [1, 0], l: [0, -1], u: [-1, 0] };   // (dr,dc)
const mvText = m => '向' + DIRCN[m[0]] + STEPCN[m[1]] + '格';   // 4 字恒定（向右两格）
const cardText = q => q.mode === 'rel'
  ? '从星星出发，' + mvText(q.moves[0]) + '，' + mvText(q.moves[1])   // 15 字恒定
  : '第' + NUMCN[q.row] + '行第' + NUMCN[q.col] + '列';               // 6 字恒定（第X行第Y列）
/* T46 化（2026-09-19）：abs 程序卡句 clip 键 pl_q_{row}_{col}（r47 键域扩 6×6——在册
   16 键 1-4 域+设计 20 键 5/6 域，manifest 文本与 cardText 逐键全等）；rel 卡句=
   queue 拼 3 clip（pl_rel_from 头+两段 pl_mv——段一未注册静默，SPEC-R47 §R6） */
const cardClip = q => 'pl_q_' + q.row + '_' + q.col;
const relClips = q => [REL_FROM_KEY].concat(q.moves.map(m => 'pl_mv_' + m[0] + m[1]));

/* ---------- 树苗 SVG（viewBox 0 0 100 100；暖棕干+双层绿冠+小红果，
   .flower 花朵组默认 opacity 0——关末零错开花加成 .bloom 态点亮）
   根组 g[data-anim="tree"]——契约 M 帧内容断言锚 ---------- */
const TREE_EL =
  /* 树干（暖棕圆角梯形）+ 枝杈 */
  '<path d="M46 92 L47 56 L40 44 M54 92 L53 58 L60 46" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
  '<path d="M45 60 Q44 84 42 94 L58 94 Q55 82 55 60 Z" fill="#B98A5D" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
  /* 双层绿冠（大圆+小圆叠出蓬松感） */
  '<circle cx="50" cy="38" r="26" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="34" cy="46" r="14" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="66" cy="46" r="14" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="42" cy="32" r="6" fill="#B7DCA8" opacity=".9"/><circle cx="58" cy="42" r="5" fill="#B7DCA8" opacity=".9"/>' +
  /* 小红果两枚（种好的成就感锚） */
  '<circle cx="38" cy="44" r="4" fill="#E8756A" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="62" cy="34" r="4" fill="#E8756A" stroke="' + INK + '" stroke-width="2"/>' +
  /* 花朵组（关末零错开花加成——默认藏） */
  '<g class="flower" opacity="0">' +
  '<circle cx="50" cy="20" r="5.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="29" cy="31" r="4.5" fill="#F7D6DF" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="71" cy="39" r="4.5" fill="#F7D6DF" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="50" cy="20" r="2" fill="#F0933F"/><circle cx="29" cy="31" r="1.6" fill="#F0933F"/>' +
  '<circle cx="71" cy="39" r="1.6" fill="#F0933F"/></g>';
function treeSvg(size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="86" height="86"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="tree">' + TREE_EL + '</g></svg>';
}

/* ---------- 星星起点徽章（r47 δ3：rel 题参照锚——金五角星+暖棕描边+两枚高光点；
   根组 g[data-anim="star"]——契约 M 帧内容断言锚；starbeat 拒绝/方向级 pulse 动画
   样式在 head（.cell.star / .starbadge / star-beat） ---------- */
const STAR_EL =
  '<path d="M50 12 L60.8 36.6 L87.3 38.9 L67.2 56.6 L73.1 82.6 L50 68.9 L26.9 82.6 L32.8 56.6 L12.7 38.9 L39.2 36.6 Z" ' +
  'fill="#F2B34C" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
  '<circle cx="38" cy="34" r="4" fill="#FCE3A8"/>' +
  '<circle cx="45" cy="26" r="2.6" fill="#FCE3A8"/>';
function starSvg() {
  return '<svg viewBox="0 0 100 100" width="58" height="58" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="star">' + STAR_EL + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 小树（植树程序主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M22 33 v-6" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="22" cy="19" r="9" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="19" cy="17" r="2.2" fill="#B7DCA8"/><circle cx="25" cy="21" r="2" fill="#B7DCA8"/>' +
    '<circle cx="20" cy="20" r="1.8" fill="#E8756A" stroke="' + INK + '" stroke-width="1.2"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
