/* ================= position 方位词图阵 游戏数据（方位封闭 6 / 章域 / 场景几何 / TTS 封闭表 / SVG）
   玩法（SPEC-R44-POSITION 定稿，6-7 岁空间·方位词；v1=SPEC-BATCH33 §0.80 记录留档）：
   方位封闭 6（front 前面/back 后面/left 左边/right 右边/up 上面/down 下面）——
   r44 delta：ch1 起 6 方位含左右（v1「ch1-2 域=4 格」废止），cells 恒全摆 6 格固定序。
   参照系=孩子视角为主线（画面左右=孩子左右）；dual 题局部引入房子参照换算（物参照系入门）；
   flip 题兔子朝向态=绝对→相对方位推理（180° 转身映射）。
   题型四族：findpos（「兔子在树的哪里呀」→点兔子所在格——教学锚+热身）/
   placepos（「把兔子放到树的X」全句 clip 指令→点目标格放兔子，目标≠兔子当前位）/
   dual（ch3+：「兔子藏在树的X，也在房子的Y」双参照复合——兔子隐藏不渲染，点对 pop 出现；
   组合封闭表 DUAL_COMBOS 恰 4，交恒唯一）/
   flip（ch4+：「兔子转过身去啦，它的X边是树的哪边呀」——兔子背面态坐在非答案格，
   answer=M(ask) 格，FLIP_MAP=180° 对合映射 left↔right/front↔back/up/down 恒等）。
   遮挡语义：前格兔子盖树干下段（z 30>树 20，近景 0.90x）/后格树盖兔子（z 10<树 20，
   远景 0.58x 近大远小）；上=树冠上格/下=树根下格/左右=树两侧；
   房子 z=15（树 20 下，几何已论证与六格零重叠——SPEC-R44 §R1 几何论证）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 方位封闭 6 + 180° 转身映射 + dual 组合封闭表（SPEC-R44 §R4：表外不出题不出句） ---------- */
const POS6 = ['front', 'back', 'left', 'right', 'up', 'down'];
const POS_NAME = { front: '前面', back: '后面', left: '左边', right: '右边', up: '上面', down: '下面' };
/* flip 视角转换映射（兔子背对孩子：左右互换/前后互换/上下不变——物理事实；上下恒等=
   「全反转」口诀化的对照面，SPEC-R44 §R1 维度三；对合群 M(M(x))=x 写前验算） */
const FLIP_MAP = { left: 'right', right: 'left', front: 'back', back: 'front', up: 'up', down: 'down' };
/* dual 双参照物组合封闭表（恰 4 组合；house=房位/houseDir=房约束方位/tree=树约束方位；
   两约束恒同格（交恒唯一）——SPEC-R44 §R1 几何论证：房@left-down 的上面=left 格/右边=down 格；
   房@right-down 对称。key=tree+houseDir 缩写（lu/dr/ru/dl），语音键 ps_dual_<key> 同源 */
const DUAL_COMBOS = [
  { key: 'lu', house: 'left-down',  tree: 'left',  houseDir: 'up' },
  { key: 'dr', house: 'left-down',  tree: 'down',  houseDir: 'right' },
  { key: 'ru', house: 'right-down', tree: 'right', houseDir: 'up' },
  { key: 'dl', house: 'right-down', tree: 'down',  houseDir: 'left' }
];
const cellsOf = dch => POS6.slice();                   // r44：恒 6 格全摆固定序（域分裂退役）

/* ---------- 方位全句表（契约 L：全句式全覆盖，verify 断言全值禁 undefined）
   q2 指令=ps_place_<方位> 全句 clip（T46 阶段2 clip 化）；PLACE_TTS=q-text 视觉文案源；
   CONFIRM_TTS=确认句全句（findpos/placepos/dual 答对视觉承载）；
   r44 新表（SPEC-R44 §R4/§R7——新键未注册期=静默+视觉承载，注册后自动接链）：
   DUAL_TTS=双参照复合句 ×4（combo key 索引）/FLIP_TTS=转身问句 ×6/FLIPY_TTS=转身
   确认句 ×6（教育句承载映射律：转身以后它的X边就是树的M边呀） ---------- */
const PLACE_TTS = {};                                   // 「把兔子放到树的前面」×6（9 字 estMs 口径）
const CONFIRM_TTS = {};                                 // 「兔子在树的前面呀」×6
const DUAL_TTS = {};                                    // 「兔子藏在树的X，也在房子的Y」×4（16 全字符）
const FLIP_TTS = {};                                    // 「兔子转过身去啦，它的X边是树的哪边呀」×6（18）
const FLIPY_TTS = {};                                   // 「转身以后，它的X边就是树的M边呀」×6（16）
for (const p of POS6) {
  PLACE_TTS[p] = '把兔子放到树的' + POS_NAME[p];
  CONFIRM_TTS[p] = '兔子在树的' + POS_NAME[p] + '呀';
  FLIP_TTS[p] = '兔子转过身去啦，它的' + POS_NAME[p] + '是树的哪边呀';
  FLIPY_TTS[p] = '转身以后，它的' + POS_NAME[p] + '就是树的' + POS_NAME[FLIP_MAP[p]] + '呀';
}
for (const c of DUAL_COMBOS) {
  DUAL_TTS[c.key] = '兔子藏在树的' + POS_NAME[c.tree] + '，也在房子的' + POS_NAME[c.houseDir];
}

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言）。
   r44 新章谱（SPEC-R44 §R2）：ch1 findpos 6 域+高亮锚/ch2 两族混出/ch3 dual 主载
   （房子来帮）/ch4 flip 主载（转过身）；文案随新章谱全换 ---------- */
const CHAPTERS = {
  1: { name: '兔子在哪里', hint: '要放兔子啦，你来试试' },     // 预告 ch2 两族混出
  2: { name: '你来放一放', hint: '小房子也来啦，两个一起找' }, // 预告 ch3 dual 双参照
  3: { name: '房子来帮啦', hint: '小兔子会转身哦，想想它的左右' }, // 预告 ch4 flip 视角转换
  4: { name: '转过身啦',   hint: '新一轮方位小侦探' }           // 预告生成关
};
const GEN_HINTS = ['前后上下左右找到它',   // dch1 findpos 6 域含左右
                   '你来放一放',           // dch2 两族混出
                   '小房子也来啦',         // dch3 dual 主载
                   '小兔子转个身'];        // dch4 flip 主载
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=ps_ 已核
   manifest 无占用，b28 立规先查）。clip 实长（batch33/_clipdur33.json，浏览器 Audio 实测）：
   tut_watch 3024 / tut_turn 1776 / hint 2856 / right 2280（判对后窗 ≥2580）/ wrong 1656
   / q1 2328 / q2 1896；名音 ps_n_* max 1416（up/down）；T46 阶段2 新增（voice/clips 实测）：
   ps_place_* 2664-2712（六方位全句）+ ps_ya 1152——确认链 right+150+名音 1416+150+
   ps_ya 1152+300=5448 ≤ 演出窗 5500（1600+3900）；
   ps_q2=「把兔子放好」为清单备用 clip——placepos 指令走 ps_place_* 全句 clip（T46 定版）。
   r44：在册 23 键（ps_ 20+core 3）不动；新键 16（dual 4+flip 6+fy 6，SPEC-R44 §R7）
   已注册 2026-09-22 段二（manifest 5350→5459）——flip 答对窗 1600+7400≥实测 7002。 */
const VOICE = {
  watch: { key: 'ps_tut_watch', text: '看！兔子在哪里呀' },
  turn:  { key: 'ps_tut_turn',  text: '你来放一放' },
  hint:  { key: 'ps_hint',      text: '再看看，兔子在哪边' },
  right: { key: 'ps_right',     text: '放对啦，真棒' },
  wrong: { key: 'ps_wrong',     text: '再想一想' },
  q1:    { key: 'ps_q1',        text: '兔子在树的哪里呀' },
  q2:    { key: 'ps_q2',        text: '把兔子放好' }
};
const nameClip = p => 'ps_n_' + p;        // 名音键（晓晓读方位词，6 互异）
const placeClip = p => 'ps_place_' + p;   // 方位全句键（T46：六方位全句 clip，6 互异）
const YA_KEY = 'ps_ya';                   // 确认链「呀」尾段 clip（T46：原 keyless TTS 尾段）
/* r44 新键（SPEC-R44 §R7 键表 16 键——已注册 2026-09-22 段二全链有声；实长窗见 §R8
   段二复核表，未注册期静默披露与实测 TODO 已销账） */
const dualClip = k => 'ps_dual_' + k;     // dual 开题全句（combo key lu/dr/ru/dl，4 键）
const flipClip = p => 'ps_flip_' + p;     // flip 开题全句（6 方位，6 键；est 6810）
const flipYClip = p => 'ps_fy_' + p;      // flip 答对教育句（映射律，6 键；est 6120）

/* ---------- 场景几何（SVG viewBox 330×490，树居中；格子坐标=场景坐标系）
   z 序承载遮挡语义：back 格 10（树盖兔子）< 树 20 < 其余格 30（兔子盖树干下段）。 ---------- */
const VIEW_W = 330, VIEW_H = 490;
const CELL_GEO = {
  front: { cx: 165, cy: 338, w: 108, h: 110 },   // 树干下段前（近景，盖树干）
  back:  { cx: 165, cy: 262, w: 100, h: 104 },   // 树干上段后（远景，被树盖）
  left:  { cx: 60,  cy: 300, w: 100, h: 104 },   // 树左侧
  right: { cx: 270, cy: 300, w: 100, h: 104 },   // 树右侧
  up:    { cx: 165, cy: 48,  w: 104, h: 96 },    // 树冠正上
  down:  { cx: 165, cy: 428, w: 104, h: 100 }    // 树根正下（草地）
};
/* ---------- 房子几何+SVG（r44 dual 题第二参照物，SPEC-R44 §R1 几何论证）
   房@left-down（中心 60,443）→x[18,102],y[405,481]：与 left 格 y 不交/与 down 格 x 不交；
   房的方位格（正交相邻对齐）：上面=left 格/右边=down 格；房@right-down 对称。
   渲染 div.house z=15（树 20 之下；几何零重叠 z 仅保险），非作答面（pointer-events 走
   sceneEl 空白=重听题面路径）。根组 g[data-scene="house"]——契约 M 帧内容锚 ---------- */
const HOUSE_GEO = {
  'left-down':  { cx: 60,  cy: 443, w: 84, h: 76 },
  'right-down': { cx: 270, cy: 443, w: 84, h: 76 }
};
const HOUSE_INNER =
  '<g data-scene="house">' +
  '<path d="M18 443 L60 407 L102 443 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
  '<rect x="26" y="443" width="68" height="38" rx="4" fill="#F6E3C4" stroke="' + INK + '" stroke-width="3"/>' +
  '<rect x="49" y="455" width="22" height="26" rx="3" fill="#B98052" stroke="' + INK + '" stroke-width="2.6"/>' +
  '<circle cx="66" cy="468" r="2.2" fill="#FFF9EE"/>' +
  '<rect x="32" y="450" width="12" height="12" rx="2" fill="#BFE0F2" stroke="' + INK + '" stroke-width="2"/>' +
  '<rect x="76" y="450" width="12" height="12" rx="2" fill="#BFE0F2" stroke="' + INK + '" stroke-width="2"/>' +
  '</g>';
function houseSvg() {
  return '<svg viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    HOUSE_INNER + '</svg>';
}

/* ---------- 树 SVG（整棵，z=20——盖住 back 格兔子、被 front 格兔子盖）
   根组 g[data-scene="tree"]——契约 M 帧内容锚 ---------- */
const TREE_INNER =
  '<g data-scene="tree">' +
  /* 草地 */
  '<ellipse cx="165" cy="462" rx="172" ry="42" fill="#DCEEBD"/>' +
  '<ellipse cx="165" cy="450" rx="126" ry="28" fill="#C8E6A8"/>' +
  '<path d="M60 448 q6 -5 12 0 M96 456 q6 -5 12 0 M226 452 q6 -5 12 0 M262 444 q6 -5 12 0" stroke="#A8D284" stroke-width="3" fill="none" stroke-linecap="round"/>' +
  /* 树干（带根） */
  '<path d="M153 238 Q150 320 149 396 Q142 404 134 410 Q165 420 196 410 Q188 404 181 396 Q180 320 177 238 Z" fill="#B98052" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
  '<path d="M158 300 Q165 306 172 300 M157 340 Q165 347 173 340" stroke="#8A5A2B" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
  /* 树冠（三叠圆+高光+果子） */
  '<circle cx="98" cy="186" r="48" fill="#8FC773" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="232" cy="186" r="48" fill="#8FC773" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="165" cy="150" r="82" fill="#9AD37B" stroke="' + INK + '" stroke-width="3.5"/>' +
  '<circle cx="136" cy="118" r="30" fill="#B4E39A" opacity=".65"/>' +
  '<circle cx="128" cy="168" r="5.5" fill="#E8756A" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="196" cy="140" r="5.5" fill="#E8756A" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="172" cy="192" r="5.5" fill="#E8756A" stroke="' + INK + '" stroke-width="2"/>' +
  '</g>';
function treeSvg() {
  return '<svg viewBox="0 0 ' + VIEW_W + ' ' + VIEW_H + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    TREE_INNER + '</svg>';
}

/* ---------- 兔子 SVG（场景专用坐姿，viewBox 0 0 120 120）
   根组 g[data-anim="bunny"]——契约 M 帧内容锚（渲染即引擎对账依据） ---------- */
const BUNNY_INNER =
  '<g data-anim="bunny">' +
  '<ellipse cx="60" cy="104" rx="34" ry="10" fill="#EFE3CD" opacity=".9"/>' +
  '<ellipse cx="42" cy="30" rx="9" ry="24" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-8 42 30)"/>' +
  '<ellipse cx="78" cy="28" rx="9" ry="25" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" transform="rotate(10 78 28)"/>' +
  '<ellipse cx="42" cy="33" rx="4" ry="15" fill="#F2B8C6" transform="rotate(-8 42 33)"/>' +
  '<ellipse cx="78" cy="31" rx="4" ry="16" fill="#F2B8C6" transform="rotate(10 78 31)"/>' +
  '<circle cx="60" cy="72" r="34" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
  '<ellipse cx="54" cy="61" rx="3" ry="2.2" fill="#D98A8A"/><ellipse cx="66" cy="61" rx="3" ry="2.2" fill="#D98A8A"/>' +
  '<circle cx="47" cy="67" r="4.2" fill="' + INK + '"/><circle cx="73" cy="67" r="4.2" fill="' + INK + '"/>' +
  '<circle cx="48.5" cy="65.5" r="1.4" fill="#FFF"/><circle cx="74.5" cy="65.5" r="1.4" fill="#FFF"/>' +
  '<ellipse cx="35" cy="77" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/><ellipse cx="85" cy="77" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>' +
  '<path d="M56 75 q2 3 4 0 q2 3 4 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
  '<ellipse cx="29" cy="88" rx="8" ry="6.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.2"/>' +
  '<ellipse cx="91" cy="88" rx="8" ry="6.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.2"/>' +
  '</g>';
function bunnySvg() {
  return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    BUNNY_INNER + '</svg>';
}

/* ---------- 兔子背面态 SVG（r44 flip 题朝向态，SPEC-R44 §R1 维度三）
   转身 180° 背对孩子：两耳后侧+圆背+尾棉球+无脸（视觉诚实——背面看不到脸）；
   根组 g[data-anim="bunny"] 锚保留（契约 M 按「兔子 SVG 根锚」不断朝向）；
   朝向锚=外层 .bunny.back 类+格 cell data-face="back"。 ---------- */
const BUNNY_BACK_INNER =
  '<g data-anim="bunny">' +
  '<ellipse cx="60" cy="104" rx="34" ry="10" fill="#EFE3CD" opacity=".9"/>' +
  '<ellipse cx="43" cy="34" rx="9" ry="24" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-7 43 34)"/>' +
  '<ellipse cx="77" cy="34" rx="9" ry="24" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5" transform="rotate(7 77 34)"/>' +
  '<ellipse cx="43" cy="37" rx="4" ry="15" fill="#F2B8C6" transform="rotate(-7 43 37)"/>' +
  '<ellipse cx="77" cy="37" rx="4" ry="15" fill="#F2B8C6" transform="rotate(7 77 37)"/>' +
  '<circle cx="60" cy="76" r="33" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
  '<path d="M40 66 Q60 58 80 66" stroke="#E8DCC8" stroke-width="3" fill="none" stroke-linecap="round"/>' +
  '<circle cx="60" cy="90" r="10.5" fill="#F5E9D8" stroke="' + INK + '" stroke-width="2.4"/>' +
  '<path d="M53 90 q7 -6 14 0" stroke="#E8D0B4" stroke-width="2" fill="none" stroke-linecap="round"/>' +
  '</g>';
function bunnyBackSvg() {
  return '<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    BUNNY_BACK_INNER + '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 树+四向方位点（方位词主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="19.5" y="20" width="5" height="12" rx="2" fill="#B98052"/>' +
    '<circle cx="22" cy="17" r="8" fill="#9AD37B" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="22" cy="7" r="2.6" fill="#E8975A"/><circle cx="22" cy="37" r="2.6" fill="#E8975A"/>' +
    '<circle cx="8" cy="22" r="2.6" fill="#E8975A"/><circle cx="36" cy="22" r="2.6" fill="#E8975A"/></svg>',
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
