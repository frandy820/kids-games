/* ================= datacollect 数据收集员 游戏数据（r14 难度改造 2026-09-15，7-8 岁信息素养·制表）
   delta=difficulty-audit/AUDIT-78 datacollect 红款行定死：数量域 2-8→10-30（两个两个数）/
   一格=2 换算+合计差值数值作答/两次调查对比/most 改「多几只」差值作答/反启发式锚/时长门禁。
   类目封闭 6（名音 dc_n_* ×6）：rabbit 兔子 / bird 小鸟 / cat 小猫 / chick 小鸡 / sheep 小羊 / duck 小鸭。
   题型六族（SPEC-BATCH34 §3-r14）：
     count     点格制表——一格=2 只，点 answer/2 格（点亮即按群计数，叮+对内小图 pop）
     sum       合计——两类和，4 选 1 数值卡
     diff      差值——两类差（相差几只），4 选 1 数值卡
     mostdiff  旧 most 改「多几只」——max-min 差值计算作答（比较→量化），4 选 1 数值卡
     change    两次调查——逐类变化量（|这次-上次|），4 选 1 数值卡
     totalchange 两次调查——总变化量（两类变化和），4 选 1 数值卡
   章型（dch1-4，每关 5 题；数值题恒居制表完成后=读表计算）：
     dch1 2 类 10-20 偶 互异 5×count / dch2 2 类 12-30 偶 互异 差≥4 3count+1sum+1diff
     / dch3 3 类 10-24 偶 互异 总≤60 3count+1sum+1mostdiff
     / dch4 两次调查 2 类 survey2∈10-16 偶 互异 survey1=∓Δ(Δ∈2-8 偶 同向) 2count+2change+1totalchange。
   语音：既有 dc_ 13 键一字不改（dc_q_most 随 most 题型下线保留不删——grid r13 gri_hint 同例）；
   r14 新 7 键（gen_clips.py r14 块，前缀 dc_ 已核 manifest 无占用 2026-09-15 实查）。
   clip 实长（_clipdur34.json，ffprobe 与浏览器 Audio 实测一致 2026-09-15 复核）：
   tut_watch 3264 / tut_turn 1896 / hint 1896 / right 2448 / wrong 1800 / q_count 1752 / q_most 1992
   / q_sum 1848 / q_diff 1992 / q_change_up 2448 / q_change_dn 2496 / q_total_up 2160
   / q_total_dn 2184 / scale 2208；名音 dc_n_* max 1440（bird/chick）。
   错链=[dc_wrong,dc_hint] 1800+150+1896+300=4146（契约 I 静态豁免窗，r14 不变）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 类目封闭 6（池外不出题） ---------- */
const ANIMALS6 = ['rabbit', 'bird', 'cat', 'chick', 'sheep', 'duck'];
const CATNAME = {
  rabbit: '兔子', bird: '小鸟', cat: '小猫',
  chick: '小鸡', sheep: '小羊', duck: '小鸭'
};
const nameOf = id => CATNAME[id];

/* ---------- 契约 L：数字 TTS 映射表（r14 封闭全量=偶数 2-60；全款取值恒偶——
   counts 10-30 偶/sums ≤58 偶/diffs·changes ≤18 偶。verify 全量输出断言禁 undefined）。 ---------- */
const NUMCN = {
  2: '两', 4: '四', 6: '六', 8: '八', 10: '十', 12: '十二', 14: '十四', 16: '十六',
  18: '十八', 20: '二十', 22: '二十二', 24: '二十四', 26: '二十六', 28: '二十八',
  30: '三十', 32: '三十二', 34: '三十四', 36: '三十六', 38: '三十八', 40: '四十',
  42: '四十二', 44: '四十四', 46: '四十六', 48: '四十八', 50: '五十', 52: '五十二',
  54: '五十四', 56: '五十六', 58: '五十八', 60: '六十'
};

/* ---------- 行格数（r14：一格=2 只、数量域至 30 → 每行 15 格槽；8 列 grid 两行 8+7） ---------- */
const CELLS = 15;
const CELL_COLS = 8;
const SCALE = 2;                             // 一格代表 2 只（r14 换算核心，图例徽章恒显）

/* ---------- r14 时长模型（门禁硬断言；认知步主体非演出窗——crd r12 范式）
   estMs = s.length*345+600（b25 定版：SAPI ~345ms/字+600，全字符口径标点计入）
   ——四方字面同步（源常量+此处注释+verify 副本 estMsV+build.py 字面 assert），改必四处同改。
   每步 dur = max(stepVoice, DECIDE_MS[kind]) + ADV_MS：
     count 每点亮 1 格=1 步（nCells=answer/2 步）+ SETTLE_MS 900（点满待决窗）；
     数值题（sum/diff/mostdiff/change/totalchange）=1 决策步 + CARD_ADV 880。
   stepVoice：首步=ENTER 400+estMs(quizSay)+300 / 后续步=STAGE 400。
   DECIDE_MS（7-8 岁认知决策推算，二年级课标「按群计数/读统计表/一格代表2」口径）：
     count      4000/格：扫视定位下一未数对（10-30 只同类散布 5-15 对 ~1.5s）+两只一群
                群感确认（~0.5s）+跳数序列更新（逢双报数 2/4/6… ~1s）+点格动作映射（~1s）
     sum       16000：读表换算 A 行（数格×2 ~5s）+B 行换算（~5s）+两位数加法心算含进位（~4s）
               +四卡比对（~2s）
     diff      14000：两行读表换算（~10s）+两位数减法（~2s）+比对（~2s）
     mostdiff  15000：三行排序找最大最小（~3s）+两行换算（~8s）+减法（~2s）+比对（~2s）
     change    13000：双条带对比（上次/这次两带格数差 ~6s）+换算（~3s）+比对（~2s）+余量（~2s）
     totalchange 17000：两类变化量各（对比+换算 ~6s×2）+相加（~3s）+比对（~2s）。
   验算（stepVoice 恒 ≤ DECIDE——quizSay 最坏句长口径，verify ⑬ 全量逐步复算）：
     count '小鸟，有几只呀' 7 字 est=3015+400+300=3715≤4000 / sum·diff·mostdiff 9 字 3705+700=4405
     ≤14000-16000 / change 10 字 4050+700=4750≤13000 / totalchange 7 字 3715≤17000（从不撑时长）。
   40 关 modeled 全部 ≥ LEVEL_MIN_MS 40000（r14 门禁；verify ⑬ 独立副本逐关对账+最低值
   精确防回漂）。 ---------- */
const estMs = s => s.length * 345 + 600;     // b25 定版（四方字面同步见上）
const ENTER_MS = 400;                        // 新题出场窗（与题面链并行起算）
const STAGE_MS = 400;                        // 题内步推进窗（count 逐格第 2 格起）
const TAP_ADV_MS = 600;                      // count 每格判亮推进窗（叮+pop）
const SETTLE_MS = 900;                       // count 点满待决窗（自动判对）
const CARD_ADV_MS = 880;                     // 数值题判对推进演出窗（照 wordprob r13）
const DECIDE_MS = {
  count: 4000, sum: 16000, diff: 14000, mostdiff: 15000,
  change: 13000, totalchange: 17000
};
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r14 门禁，7-8 岁口径）
/* 题面句（stepVoice 的 estMs 输入=实际拼播念白全文：名音文本+题面尾段文本） */
const quizSay = q => {
  if (q.kind === 'count') return nameOf(q.ask) + '，有几只呀';
  if (q.kind === 'sum') return nameOf(q.ask[0]) + nameOf(q.ask[1]) + '一共几只呀';
  if (q.kind === 'diff') return nameOf(q.ask[0]) + nameOf(q.ask[1]) + '相差几只呀';
  if (q.kind === 'mostdiff') return nameOf(q.ask[0]) + nameOf(q.ask[1]) + '相差几只呀';
  if (q.kind === 'change') return nameOf(q.ask) + (q.up ? '比第一次多了几只' : '比第一次少了几只');
  return q.up ? '一共多了几只呀' : '一共少了几只呀';          // totalchange
};
const stepVoiceMs = (q, k) => k === 0 ? (ENTER_MS + estMs(quizSay(q)) + 300) : STAGE_MS;
const countSteps = q => q.answer / SCALE;    // count 决策步数=点亮格数（值恒偶）
const quizDurMs = q => q.kind === 'count'
  ? Math.max(stepVoiceMs(q, 0), DECIDE_MS.count) + TAP_ADV_MS +
    (countSteps(q) - 1) * (Math.max(STAGE_MS, DECIDE_MS.count) + TAP_ADV_MS) + SETTLE_MS
  : Math.max(stepVoiceMs(q, 0), DECIDE_MS[q.kind]) + CARD_ADV_MS;
/* 上式=SPEC 化简口径：首步 max(voice0,DECIDE)+ADV + 其余 (n-1) 步各 max(STAGE,DECIDE)+ADV + SETTLE
   （countSteps≥5 恒成立——值域≥10 偶，flat0 锚 8→4 步亦同式；verify ⑬ 独立副本复算对账） */
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 确认链窗（家族 G/H 动态化：窗=链实长+300，主窗 1600+尾窗按链补足）
   T46 化（2026-09-19）：尾段走 clip 拼播——数词 dc_n_<N>（NUMCN[N]+'只' 偶 2-60 全量在册）
   +骨架 dc_s_yg/xc/duo/shao。原 keyless TTS confirmText 尾段退役（confirmText 保留=视觉文案源）。
   最坏链=change 4 段（dc_s_shao 1344+dc_n max 1848）：
   2448+150+1440+150+1344+150+1848+300=7830。 ---------- */
const CHAIN_GAP = 150, WIN_PAD = 300;        // core queue 段间 150ms / 窗余量 300（家族 G/H）
const CONFIRM_BASE = 1600;                   // 判对主演出窗（场景 pulse+格亮/卡亮）
const DC_RIGHT = 2448, NAME_MAX = 1440;      // clip 实长（_clipdur34.json）
const confirmText = q => {
  if (q.kind === 'count') return NUMCN[q.answer] + '只';
  if (q.kind === 'sum') return '一共' + NUMCN[q.answer] + '只';
  if (q.kind === 'diff' || q.kind === 'mostdiff') return '相差' + NUMCN[q.answer] + '只';
  if (q.kind === 'change') return (q.up ? '多了' : '少了') + NUMCN[q.answer] + '只';
  return '一共' + (q.up ? '多了' : '少了') + NUMCN[q.answer] + '只';   // totalchange
};
/* T46 化尾段拼播（全段在册）：数词键 dc_n_<N> + 骨架键 dc_s_* */
const numClip = n => 'dc_n_' + n;                     // 数词段键（偶 2-60 全量，与名音 dc_n_<动物> 前缀共域不撞）
const numSegs = q => {
  if (q.kind === 'count') return [numClip(q.answer)];
  if (q.kind === 'sum') return ['dc_s_yg', numClip(q.answer)];
  if (q.kind === 'diff' || q.kind === 'mostdiff') return ['dc_s_xc', numClip(q.answer)];
  if (q.kind === 'change') return [q.up ? 'dc_s_duo' : 'dc_s_shao', numClip(q.answer)];
  return ['dc_s_yg', q.up ? 'dc_s_duo' : 'dc_s_shao', numClip(q.answer)];   // totalchange
};
/* 尾段实长（voice/clips Audio 实测 09-19）：骨架 4 键精确值+数词取 max（保守 ≥ 实际） */
const SEG_DUR = { dc_s_yg: 1320, dc_s_xc: 1440, dc_s_duo: 1296, dc_s_shao: 1344 };
const DC_NUM_MAX = 1848;                     // dc_n_* 数词实长 max（dc_n_34）
const segsMs = parts => parts.reduce((s, k) => s + (SEG_DUR[k] != null ? SEG_DUR[k] : DC_NUM_MAX), 0);
const confirmChainMs = q => q.kind === 'count' || q.kind === 'change'
  ? DC_RIGHT + CHAIN_GAP + NAME_MAX + CHAIN_GAP + segsMs(numSegs(q)) + WIN_PAD
  : DC_RIGHT + CHAIN_GAP + segsMs(numSegs(q)) + WIN_PAD;
const confirmTailMs = q => Math.max(4200, confirmChainMs(q) - CONFIRM_BASE);  // 尾窗≥4200 承 v1 形态

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言）。 ---------- */
const CHAPTERS = {
  1: { name: '两个两个数', hint: '数完算一算，一共几只' },     // 预告 ch2 合计
  2: { name: '一共几只',   hint: '比一比谁多谁少，相差几只' }, // 预告 ch3 比差
  3: { name: '比比相差',   hint: '再调查一次，看看变化' },     // 预告 ch4 两次调查
  4: { name: '第二次调查', hint: '新的调查开始啦，接着数' }    // 预告生成关
};
const GEN_HINTS = ['两个两个数，点亮表格',   // dch1 5×count
                   '数一数，算一算一共几只', // dch2 3count+sum+diff
                   '比一比，相差几只',       // dch3 3count+sum+mostdiff
                   '两次调查，比比变化'];    // dch4 2count+2change+1totalchange
const CH_LEN = 5;          // 5 题 = 1 关（数值题恒居制表完成后）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=dc_ 已核
   manifest 无占用（既有 13 键 2026-09-11/r14 新 7 键 2026-09-15 实查））。
   q_most 随 most 题型下线（r14）保留不删——兜底资产不占正链（grid r13 gri_hint 同例）。 ---------- */
const VOICE = {
  watch:  { key: 'dc_tut_watch', text: '看！数一数做表格' },
  turn:   { key: 'dc_tut_turn',  text: '你来数一数' },
  hint:   { key: 'dc_hint',      text: '再数一数呀' },
  right:  { key: 'dc_right',     text: '做对啦，真聪明' },
  wrong:  { key: 'dc_wrong',     text: '再数一数' },
  qCount: { key: 'dc_q_count',   text: '有几只呀' },
  qMost:  { key: 'dc_q_most',    text: '哪一类最多呀' },       // 下线保留
  qSum:   { key: 'dc_q_sum',     text: '一共几只呀' },         // r14 新
  qDiff:  { key: 'dc_q_diff',    text: '相差几只呀' },         // r14 新
  qUp:    { key: 'dc_q_change_up', text: '比第一次多了几只' }, // r14 新
  qDn:    { key: 'dc_q_change_dn', text: '比第一次少了几只' }, // r14 新
  tUp:    { key: 'dc_q_total_up', text: '一共多了几只呀' },    // r14 新
  tDn:    { key: 'dc_q_total_dn', text: '一共少了几只呀' },    // r14 新
  scale:  { key: 'dc_scale',     text: '一格代表两只' }        // r14 新（教学换算句+图例锚）
};
const nameClip = id => 'dc_n_' + id;        // 名音键（晓晓读类目名，6 互异）

/* ---------- 动物 SVG 库（viewBox 0 0 120 120；家族暖卡通风：INK 描边+暖填充+腮红）
   6 幅互异可一眼辨识（体形/耳/喙/毛特征强）；r14 场景成对布点 36-54px 与图表格 34px 复用。
   根组 g[data-cat] = 类目 id——契约 M 帧内容断言锚（渲染即引擎对账依据）。 ---------- */
const CHEEK = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>';
const EYE = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 4.2) + '" fill="' + INK + '"/>';
const EYE2 = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 5.6) + '" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="' + (x + 1.5) + '" cy="' + (y + 0.5) + '" r="' + ((r || 5.6) * 0.42) + '" fill="' + INK + '"/>';

const CAT_ELS = {
  /* 兔子：白身长耳 + 粉内耳（长耳——与小羊互辨） */
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
  /* 小鸟：蓝身圆肚 + 橙尖喙 + 翅（喙翅——与小鸭互辨） */
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
  /* 小猫：灰身尖耳 + 胡须（胡须竖耳——与兔互辨） */
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
  /* 小鸡：黄绒球 + 橙小喙 + 绒头（纯黄绒球——与小鸟互辨） */
  chick:
    '<path d="M50 36 q-2 -8 4 -11 M60 34 q1 -9 7 -10 M68 38 q4 -7 10 -7" stroke="#E8A23C" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="78" rx="26" ry="21" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="54" r="26" fill="#F8D667" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="34" cy="76" rx="10" ry="15" fill="#F5C445" stroke="' + INK + '" stroke-width="3" transform="rotate(18 34 76)"/>' +
    '<path d="M60 60 L50 66 L60 71 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    EYE2(50, 52, 5.2) + EYE2(70, 52, 5.2) +
    CHEEK(40, 62) + CHEEK(80, 62) +
    '<path d="M52 99 v8 M68 99 v8" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round"/>',
  /* 小羊：白云绒身 + 深灰脸 + 垂耳（云身无长耳——与兔互辨） */
  sheep:
    '<ellipse cx="38" cy="52" rx="8" ry="13" fill="#8A8578" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-24 38 52)"/>' +
    '<ellipse cx="82" cy="52" rx="8" ry="13" fill="#8A8578" stroke="' + INK + '" stroke-width="2.6" transform="rotate(24 82 52)"/>' +
    '<ellipse cx="60" cy="82" rx="32" ry="21" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="34" cy="72" r="12" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="86" cy="72" r="12" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="50" cy="64" r="11" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="70" cy="64" r="11" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="60" cy="46" rx="15" ry="13" fill="#8A8578" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="52" cy="36" r="7.5" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="66" cy="34" r="8.5" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="54" cy="45" r="2.7" fill="#FFFDF6"/><circle cx="66" cy="45" r="2.7" fill="#FFFDF6"/>' +
    '<path d="M58 52 q2 2.6 4 0" stroke="#FFFDF6" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M48 100 v8 M72 100 v8" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>',
  /* 小鸭：黄身扁喙 + 橙蹼足（扁喙蹼足——与小鸟互辨） */
  duck:
    '<path d="M88 74 q16 -12 12 -2 q-2 9 -13 11 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<ellipse cx="62" cy="82" rx="30" ry="20" fill="#F8D667" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="46" cy="52" r="21" fill="#F8D667" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M27 48 L8 55 L27 62 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    EYE2(52, 46, 5.2) +
    CHEEK(38, 56) +
    '<ellipse cx="68" cy="82" rx="14" ry="10" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M50 100 v7 q-7 3 -9 -1 M50 107 q6 3 9 -1 M74 100 v7 q-7 3 -9 -1 M74 107 q6 3 9 -1" stroke="#E8975A" stroke-width="3" fill="none" stroke-linecap="round"/>'
};

/* 类目 SVG 工厂：catSvg(id, size)——缺省 34（图表格内 mini 对）；根组 g[data-cat]=id */
function catSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="34" height="34"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-cat="' + id + '">' + CAT_ELS[id] + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 迷你累积表格（三行逐格点亮+一格=2 徽记——r14 制表主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="12" cy="13" r="3.2" fill="#FFF6E3" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="12" cy="22" r="3.2" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="12" cy="31" r="3.2" fill="#8FB8E0" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="19" y="10" width="7" height="7" rx="2.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="28" y="10" width="7" height="7" rx="2.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="19" y="19" width="7" height="7" rx="2.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="19" y="28" width="7" height="7" rx="2.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="28" y="28" width="7" height="7" rx="2.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="28" y="19" width="7" height="7" rx="2.4" fill="none" stroke="#C9B48A" stroke-width="1.6" stroke-dasharray="2.4 2"/>' +
    '<path d="M36 8 q5 3 0 6" stroke="#E8483C" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
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
