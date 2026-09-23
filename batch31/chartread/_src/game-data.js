/* ================= chartread 图表小读者 游戏数据（r17 难度改造版·类目封闭 6 / 章配置 / 语音文案）
   r17 改造（AUDIT-78 黄款：值域 2-8 一年级读图、无单位换算、无多步问法）：
     值域上移 10-20 互异 + 「一格代表 2」换算章 + 合计/两图对比/多步约束问法 + 第二多排序。
   类目封闭 6 不变（rabbit 兔子 / cat 猫 / dog 狗 / bird 小鸟 / fish 鱼 / chick 小鸡，
   名音 chr_n_* ×6）。题型八族（kind 池按章）：
     most「谁最多呀」/ least「谁最少呀」类目图卡（排序锚，ch1）
     howmany「<类目名音>有几只呀」数字卡（值域 10-20；unit=2 时真值=格数×2，
       干扰必含「按一格=1 误读值」=格数——读图错因干扰）
     total「一共有几只呀」数字卡（全类目合计=两步计算；unit=2 干扰含格数合计）
     compare「<A 名音>比<B 名音>多几只呀」数字卡（差 1-10；unit=2 干扰含格数差）
     second「谁第二多呀」类目图卡（全排序理解，非只找最大；ch4）
     constraint「比<X>多又比<Y>少的是谁呀」类目图卡（多步约束：真值唯一=排序紧邻
       夹层——X=真值下邻、Y=真值上邻；题面=T46 阶段3 碎片拼段全 clip）
     twocompare「下午的<类目>比上午的多几只呀」数字卡（两图对比：同两类目上午/
       下午两图，真值=两图目标行差；ch3）
   章型（CH_LEN=8 题/关，STATIC_LEVELS=32）：
     ch1 读图数一数  3 类目 unit=1  {most,least,howmany,total}
     ch2 一格代表2   3 类目 unit=2  {howmany,total,compare}（轴角标「一格=2」）
     ch3 两图比一比  4 类目 unit=1  {twocompare,constraint,compare,howmany}
     ch4 读图大挑战  4 类目 unit=逐题掷 {八族全池}（每关八族各一）
   生成关 flat>=32 每关随机章参数 dch=ri(1,4)。
   错反馈 = chr_again_* 语义句 clip 单段链（T46 阶段2）；题面尾段/判对数字段
   = 碎片/数字 clip（T46 阶段3，keyless 全款清零）；estMs=len*345+600（b25 定版）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 类目封闭 6（SPEC §0.78：表外不出题） ---------- */
const CATS6 = ['rabbit', 'cat', 'dog', 'bird', 'fish', 'chick'];
const CATNAME = {
  rabbit: '兔子', cat: '猫', dog: '狗',
  bird: '小鸟', fish: '鱼', chick: '小鸡'
};
const nameOf = id => CATNAME[id];

/* ---------- 两图对比标签（twocompare 上/下午两图固定标签） ---------- */
const TWO_LABELS = ['上午', '下午'];

/* ---------- 契约 L：数字 TTS 映射表（封闭全量 1-74；独立量词位 2=两，复合位用二）
   可达域：howmany 真值 10-20 / total 真值 33-74（3 类目 33-57、4 类目 46-74，
   unit=2 为其中偶数）/ compare·twocompare 真值 1-10；
   verify 对封闭域全量输出断言禁 undefined（复合词 22=二十二、独立 2=两）。 ---------- */
const NUMCN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九',
  10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五', 16: '十六', 17: '十七', 18: '十八', 19: '十九',
  20: '二十', 21: '二十一', 22: '二十二', 23: '二十三', 24: '二十四', 25: '二十五', 26: '二十六', 27: '二十七', 28: '二十八', 29: '二十九',
  30: '三十', 31: '三十一', 32: '三十二', 33: '三十三', 34: '三十四', 35: '三十五', 36: '三十六', 37: '三十七', 38: '三十八', 39: '三十九',
  40: '四十', 41: '四十一', 42: '四十二', 43: '四十三', 44: '四十四', 45: '四十五', 46: '四十六', 47: '四十七', 48: '四十八', 49: '四十九',
  50: '五十', 51: '五十一', 52: '五十二', 53: '五十三', 54: '五十四', 55: '五十五', 56: '五十六', 57: '五十七', 58: '五十八', 59: '五十九',
  60: '六十', 61: '六十一', 62: '六十二', 63: '六十三', 64: '六十四', 65: '六十五', 66: '六十六', 67: '六十七', 68: '六十八', 69: '六十九',
  70: '七十', 71: '七十一', 72: '七十二', 73: '七十三', 74: '七十四' };

/* ---------- 错反馈语义句文本（flat>=3 只 10s 节流——契约 J；T46 阶段2 起
   逐句 clip 化=AGAIN_KEYS 分派，此表留作 text 兜底与断言素材）。
   按题型分派（unit=2 数值族共用换算提醒句）。 ---------- */
const MOST_AGAIN = '再看看哪一行最长';        // most/least 共用（最长行=最多，最短行=最少）8 字=3360
const SECOND_AGAIN = '先找最多的，再找第二多'; // second 排序程序提示 11 字=4395
const HOWMANY_AGAIN = '再数一数这一行';       // howmany unit=1 7 字=3015
const TOTAL_AGAIN = '把每一行都数一数再加起来'; // total unit=1 12 字=4740
const COMPARE_AGAIN = '一行一行数一数再比一比'; // compare unit=1 11 字=4395
const UNIT2_AGAIN = '一格代表两只，数数格子'; // unit=2 数值族（howmany/total/compare）共用 11 字=4395
const CONSTRAINT_AGAIN = '两个条件都要比一比哦'; // constraint 双条件 10 字=4050
const TWOCOMPARE_AGAIN = '两张图都看一看再比一比'; // twocompare 11 字=4395

/* ---------- T46 阶段2（2026-09-19）：错反馈语义句 clip 化 ----------
   八题型→chr_again_* 键分派（againKeyOf 在 game-main，与 againOf 同判据——unit=2
   数值族共用 unit2 键）；AGAIN_DUR=clip 实长表（ffprobe=SPEC_DUR 口径），豁免窗
   =AGAIN_DUR+300 依据（estMs 字数口径在错链上退役；阶段3 起题面尾段/确认数字段亦 clip 化）。 ---------- */
const AGAIN_KEYS = {
  most: 'chr_again_most',            // most/least 共用（与 MOST_AGAIN 同判据）
  second: 'chr_again_second',
  howmany: 'chr_again_howmany',
  total: 'chr_again_total',
  compare: 'chr_again_compare',
  unit2: 'chr_again_unit2',          // unit=2 数值族（howmany/total/compare）共用
  constraint: 'chr_again_constraint',
  twocompare: 'chr_again_twocompare'
};
const AGAIN_DUR = {
  chr_again_most: 2688, chr_again_second: 3264, chr_again_howmany: 2184,
  chr_again_total: 3120, chr_again_compare: 3216, chr_again_unit2: 3384,
  chr_again_constraint: 2640, chr_again_twocompare: 3168
};

/* ---------- 题面/判对拼句碎片（T46 阶段3：题面尾段+确认数字段全 clip 化——
   keyless 段清零；拼句与 q.text 逐字对齐（去尾问号口径），碎片实长见 SPEC_DUR）
   howmany=[名音, q_howmany] / compare=[名A, s_bi, 名B, s_duo]
   constraint=[s_bi, 名X, s_dyou, 名Y, s_shd] / twocompare=[lab_pm, s_de, 名t, s_bi, lab_am, s_de, s_duo]
   判对：howmany=[right, chr_n_值] / total=[right, s_yg, chr_n_和]
   compare·twocompare=[right, s_do, chr_n_差]；数字键 chr_n_1..74 与 NUMCN 同口径（74/74 已核）。 ---------- */

/* ---------- 章配置（章号 1 基；生成关 flat>=32 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] 对 CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] 对 dch=k+1（verify 带关键词断言）。 ---------- */
const CHAPTERS = {
  1: { name: '读图数一数', hint: '一格代表两只，数格子算一算' },   // 预告 ch2 一格代表 2
  2: { name: '一格代表2', hint: '两张图比一比，还要找中间的' },   // 预告 ch3 两图对比+多步约束
  3: { name: '两图比一比', hint: '第二大也找得到，全都混在一起' }, // 预告 ch4 混合+第二多
  4: { name: '读图大挑战', hint: '新一轮看图找答案' }             // 预告生成关
};
const GEN_HINTS = ['三行图里数一数，再算总数',   // dch1 3 类目 most/least/howmany/total
                   '一格代表两只，数格子',      // dch2 unit=2 换算
                   '两张图比一比',             // dch3 两图对比+多步约束
                   '读图大集合'];              // dch4 八族混合+第二多
const CH_LEN = 8;          // 8 题 = 1 关（每题新图；r17 5→8，存档键基迁移见 game-main 启动 IIFE）
const STATIC_LEVELS = 32;  // 静态 32 关 = 4 章 × 8 关

/* ---------- DECIDE_MS 认知时长模型（r17 难度地板钉——verify/_selftest 独立重算对账）
   modeled(关) = Σ题( listen(题) + DECIDE_MS[kind] + (unit=2 ? CONV_MS : 0) + TAP_MS )
   listen：全 clip 实长拼段和（T46 阶段3 起题面/尾段全 clip 化，段间 +150）。
   BASE 为读图+选项扫描模型值（ms）：排序比较族低于多行计算族。 ---------- */
const DECIDE_MS = {
  most: 8000, least: 8000, second: 12000,
  howmany: 11000, total: 15000, compare: 12000,
  constraint: 14000, twocompare: 15000
};
const CONV_MS = 4000;   // unit=2 换算附加（格数×2 认知步）
const TAP_MS = 1200;    // 点选操作

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=chr_ 已核
   manifest 无占用）。clip 实长（SPEC-BATCH31 §4 r17 增补段，浏览器 Audio/ffprobe 实测
   _clipdur31.json）：tut_watch 2976 / tut_turn 1872 / hint 2112 / right 2448 / wrong 2016
   / q_most 1824 / q_least 1824 / q_second 1848 / q_total 2040 / q_howmany 1752；
   名音 chr_n_*：bird 1440 / chick 1440 / rabbit 1368 / cat 1104 / dog 1104 / fish 1080
   （max 1440）；数字键 chr_n_1..74（1344-1848，域 max 1848）
   / 碎片键 s_*·lab_*（1104-1896）——T46 阶段3 题面尾段+确认数字段 clip 化。
   判对窗（1600+4700=6300）≥ 最长确认链 total=right 2448+150+s_yg 1320+150+
   chr_n max(33..74 域) 1848+300=6216（数值族全 clip 后窗 4100→4700）。 ---------- */
const VOICE = {
  watch:  { key: 'chr_tut_watch', text: '看！看图找答案' },
  turn:   { key: 'chr_tut_turn',  text: '你来读一读' },
  hint:   { key: 'chr_hint',      text: '再看看这张图' },
  right:  { key: 'chr_right',     text: '读对啦，真聪明' },
  wrong:  { key: 'chr_wrong',     text: '再看看想一想' },
  qMost:  { key: 'chr_q_most',    text: '谁最多呀' },
  qLeast: { key: 'chr_q_least',   text: '谁最少呀' },
  qSecond:{ key: 'chr_q_second',  text: '谁第二多呀' },
  qTotal: { key: 'chr_q_total',   text: '一共有几只呀' },
  /* T46 阶段3 拼句碎片（文本与 manifest 逐字一致，禁自造） */
  qHowmany: { key: 'chr_q_howmany', text: '有几只呀' },
  sBi:    { key: 'chr_s_bi',   text: '比' },
  sDyou:  { key: 'chr_s_dyou', text: '多又比' },
  sShd:   { key: 'chr_s_shd',  text: '少的是谁呀？' },
  sDe:    { key: 'chr_s_de',   text: '的' },
  sDuo:   { key: 'chr_s_duo',  text: '多几只呀' },
  sYg:    { key: 'chr_s_yg',   text: '一共' },
  sDo:    { key: 'chr_s_do',   text: '多' },
  labPm:  { key: 'chr_lab_pm', text: '下午' },
  labAm:  { key: 'chr_lab_am', text: '上午' }
};
const nameClip = id => 'chr_n_' + id;        // 名音键（晓晓读中文名，6 互异）

const CHEEK = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>';
const EYE = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 4.2) + '" fill="' + INK + '"/>';
const EYE2 = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 5.6) + '" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="' + (x + 1.5) + '" cy="' + (y + 0.5) + '" r="' + ((r || 5.6) * 0.42) + '" fill="' + INK + '"/>';

const CAT_ELS = {
  /* 兔子：白身长耳 + 粉内耳（长耳——与其他五类互辨） */
  rabbit:
    '<path d="M40 44 Q30 12 40 12 Q50 12 46 44 Z" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M78 44 Q88 12 78 12 Q68 12 72 44 Z" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M41 38 Q36 18 40 18 Q44 18 43 38 Z" fill="#F2B8C6"/>' +
    '<path d="M77 38 Q82 18 78 18 Q74 18 75 38 Z" fill="#F2B8C6"/>' +
    '<ellipse cx="60" cy="84" rx="30" ry="22" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="58" r="27" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE2(48, 54, 6) + EYE2(72, 54, 6) +
    '<path d="M60 64 l-4 4 h8 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M60 68 q0 5 -7 6 M60 68 q0 5 7 6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    CHEEK(38, 64) + CHEEK(82, 64) +
    '<ellipse cx="22" cy="90" rx="9" ry="6" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="98" cy="90" rx="9" ry="6" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3"/>',
  /* 猫：灰身尖耳 + 胡须（胡须竖耳——与狗互辨） */
  cat:
    '<path d="M32 42 L24 16 L50 28 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M88 42 L96 16 L70 28 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M32 40 L28 22 L44 31 Z" fill="#F2B8C6"/><path d="M88 40 L92 22 L76 31 Z" fill="#F2B8C6"/>' +
    '<ellipse cx="60" cy="86" rx="30" ry="19" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M46 78 q4 8 0 14 M74 78 q-4 8 0 14" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="60" cy="56" r="28" fill="#E8E3DC" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE2(48, 52, 5.4) + EYE2(72, 52, 5.4) +
    '<path d="M56 65 l4 3.6 l4 -3.6" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M50 70 q10 7 20 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 60 h-13 M26 66 l-12 4 M94 60 h13 M94 66 l12 4" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    CHEEK(38, 64) + CHEEK(82, 64),
  /* 狗：棕身垂耳 + 长吻 + 项圈（长吻项圈——与猫互辨） */
  dog:
    '<path d="M26 40 q-10 22 2 32 q10 6 12 -8 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M94 40 q10 22 -2 32 q-10 6 -12 -8 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="88" rx="31" ry="20" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M32 78 h56" stroke="#E8483C" stroke-width="6.5" stroke-linecap="round"/>' +
    '<circle cx="60" cy="78" r="3.6" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="60" cy="56" r="27" fill="#D2A87A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="68" rx="13" ry="9.5" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="60" cy="62" rx="5.6" ry="4.2" fill="' + INK + '"/>' +
    '<path d="M60 66 v4 M60 70 q-4 5 -8 3 M60 70 q4 5 8 3" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    EYE(48, 50, 4.4) + EYE(72, 50, 4.4) +
    CHEEK(38, 62) + CHEEK(82, 62) +
    '<path d="M44 104 v8 M76 104 v8" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>',
  /* 小鸟：蓝身圆肚 + 橙尖喙 + 翅（喙翅——与鸡互辨） */
  bird:
    '<ellipse cx="60" cy="74" rx="27" ry="24" fill="#7FA8D4" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="82" rx="16" ry="12" fill="#DCEAF8"/>' +
    '<path d="M86 70 q16 -8 12 -20 q-14 4 -16 16 Z" fill="#6B94C4" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="52" cy="48" r="21" fill="#8FB8E0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M30 50 L18 55 L30 60 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    EYE2(58, 44, 5.2) +
    CHEEK(44, 54) +
    '<path d="M46 96 q7 8 14 0 M64 96 q7 8 14 0" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M52 98 v6 M68 98 v6" stroke="#F5A24B" stroke-width="3.2" stroke-linecap="round"/>',
  /* 鱼：橙身条纹 + 尾鳍 + 眼侧视（鳍尾无肢——与鸟互辨） */
  fish:
    '<path d="M96 60 L112 44 v32 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="58" cy="60" rx="38" ry="26" fill="#F5A24B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M38 44 q10 -14 24 -6 M38 76 q10 14 24 6" fill="#FBD9A8" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M46 38 q-2 22 0 44" stroke="#FFF6E3" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M62 36 q-2 24 0 48" stroke="#FFF6E3" stroke-width="6" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M58 34 q10 6 10 26 q0 20 -10 26" fill="none" stroke="' + INK + '" stroke-width="2.4" opacity=".5"/>' +
    '<circle cx="28" cy="54" r="5" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="29" cy="55" r="2.2" fill="' + INK + '"/>' +
    '<path d="M20 66 q6 4 12 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="30" cy="44" r="2.6" fill="#DCEAF8" opacity=".85"/>',
  /* 小鸡：黄绒球 + 橙尖喙 + 小翅 + 绒头（纯黄绒球无翅斑——与鸟互辨） */
  chick:
    '<path d="M50 36 q-2 -8 4 -11 M60 34 q1 -9 7 -10 M68 38 q4 -7 10 -7" stroke="#E8A23C" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="78" rx="26" ry="21" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="54" r="26" fill="#F8D667" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="34" cy="76" rx="10" ry="15" fill="#F5C445" stroke="' + INK + '" stroke-width="3" transform="rotate(18 34 76)"/>' +
    '<path d="M60 60 L50 66 L60 71 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    EYE2(50, 52, 5.2) + EYE2(70, 52, 5.2) +
    CHEEK(40, 62) + CHEEK(80, 62) +
    '<path d="M52 99 v8 M68 99 v8" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round"/>'
};

/* 类目 SVG 工厂：catSvg(id, size)——size 缺省 24（行内 unit 尺寸）；根组 g[data-cat]=id */
function catSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="24" height="24"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-cat="' + id + '">' + CAT_ELS[id] + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 三行迷你象形图（读图主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="13" cy="14" r="3.4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="13" cy="23" r="3.4" fill="#8FB8E0" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="13" cy="32" r="3.4" fill="#F5A24B" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="21" cy="14" r="3.4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="21" cy="23" r="3.4" fill="#8FB8E0" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="29" cy="14" r="3.4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="29" cy="23" r="3.4" fill="#8FB8E0" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="37" cy="14" r="3.4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="29" cy="32" r="3.4" fill="#F5A24B" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M36 30 q5 3 0 6" stroke="#E8483C" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
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
