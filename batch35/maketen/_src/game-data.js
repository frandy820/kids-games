/* ================= maketen 凑十小铺 游戏数据（NUMCN 1-20 全量 / 章配置 / 语音文案 / SVG）
   玩法（SPEC-BATCH35 §0.86/§2，6-7 岁数感·凑十）：伙伴卡配对收银——
   题面顶部大字 target（10/15/20）→ 柜台中央伙伴卡数字 a → 下方卡池 4-5 张
   互异数字卡，点一张 x：a+x=target → 收进店里（钱币叮当 Web Audio+货架+1）
   +right+TTS 全算式「X 加 Y 等于 Z」；≠target → wrong+两级方向数感反馈
   （和>target=mt_wrong_more「多了一点，换张小一点的」/和<target=mt_wrong_less
   「少了一点，换张大一点的」——按 a+pool[i].v 与 target 大小分派）。
   数学先验（SPEC §0.86 封闭域验算）：凑 10 a∈1-9 x=10-a；凑 15 a∈6-9
   x=15-a∈6-9；凑 20 a∈11-18 x=20-a∈2-9；卡池互异+含补数⇒唯一解。
   章型：ch1 凑 10（a∈2-8 偶偏，池 4）；ch2 凑 10（a∈1-9 全域，池 5，
   干扰优先补数±1/±2 邻域）；ch3 凑 15（a∈6-9，池 4）；ch4 混合（每题
   target∈{10,15,20} seeded，池 5——三目标切换=认知坡度主体）。
   确认链（T46 化 2026-09-19）=[mt_right, mt_n_A, mt_s_add, mt_n_X, mt_s_eq,
   mt_n_T] 6 段全 clip 拼播（原 NUMCN 读数 TTS keyless 尾段退役——零 keyless 政策）；
   错链两级=[mt_wrong_more,mt_hint]=5970 / [mt_wrong_less,mt_hint]=6018
   → 错链豁免窗取 max=6018（真时钟，契约 I）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- NUMCN 数字映射表（契约 L 全量）：1-20 共 20 值（2=两/1-20 常规）
   覆盖封闭集全量：a∈1-18 / x∈1-9 / target∈{10,15,20}——算式全读无缺口 ---------- */
const NUMCN = {
  1: '一', 2: '两', 3: '三', 4: '四', 5: '五',
  6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
  11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
  16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十'
};

/* ---------- T46 化（2026-09-19）：确认链算式拆段 clip（mt_n_ 1-20 数词+mt_s_add 加
   +mt_s_eq 等于）全段在册 queue 拼播——原 keyless TTS 全式尾段退役
   （formulaText 保留=verify 契约 L 对账源）。实长（voice/clips Audio 实测 09-19，
   verify SPEC_MT_N 独立副本对账）：mt_s_add 1152/mt_s_eq 1320/mt_n 1128-1464
   （max=mt_n_16 1464）；页面窗为静态常量不消费时长表（表只进 verify）。 ---------- */
const numClip = n => 'mt_n_' + n;                     // 数词段键（1-20 全量在册）
const formulaParts = q => [numClip(q.a), 'mt_s_add', numClip(q.target - q.a),
                           'mt_s_eq', numClip(q.target)];   // 「A加X等于T」5 段

/* ---------- 演出时序常量（SPEC-BATCH35 §4 实长表，浏览器 Audio 实测 2026-09-12）
   mt_ 实长：tut_watch 3264 / tut_turn 1776 / hint 2496 / right 2472 /
   wrong_more 3024 / wrong_less 3072 ---------- */
const WRONG_CHAIN_WIN = 6018;   /* 错链豁免窗=max(more 3024+150+2496+300=5970,
                                   less 3072+150+2496+300=6018)（真时钟，契约 I） */
const CELE_MAIN = 1600;                      /* 判对收银主窗 */
const CELE_TAIL = 8500;                      /* 判对演出窗 1600+8500=10100 ≥ 确认链
   最坏 10098（T46 clip 口径：t20/a16=2472+150×5+1464+1152+1224+1320+1416+300——
   SPEC 域全域推导，verify ⑨ 独立复算；家族 G/H） */
const TUT_CELE_TAIL = 8100;                  /* 教学演示演出窗 1600+8100=9700 ≥
   demo 链（3+7=10）9642（2472+150×5+1224+1152+1176+1320+1248+300；demo 通道） */
const WRONG_MS = 1000;                       /* 错点防重入窗（卡摇头+错链起播） */
const TUT_WATCH_WIN = 3564;                  /* ≥ mt_tut_watch 3264+300 */
const TUT_TURN_WIN = 2076;                   /* ≥ mt_tut_turn 1776+300 */

/* ---------- 章配置（SPEC §0.86 真值表；生成关 flat≥20 每关随机章参数
   dch=ri(rnd,1,4)——seeded 随机域全档成立型，b33 硬性②显式声明）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录对账） ---------- */
const CH_CFG = { 1: { pool: 4, target: 10 }, 2: { pool: 5, target: 10 },
                 3: { pool: 4, target: 15 }, 4: { pool: 5, target: 0 } };  /* ch4 target=0 表混合 */
const CHAPTERS = {
  1: { name: '凑十开张',   hint: '所有数字都要来凑十啦' },   // 预告 ch2 a∈1-9 全域池 5
  2: { name: '全域凑十',   hint: '这次要凑十五咯，先看题面' }, // 预告 ch3 target=15
  3: { name: '凑十五',     hint: '目标会换来换去，看清楚再凑' }, // 预告 ch4 三目标混合
  4: { name: '凑数大掌柜', hint: '新一轮凑卡开店开始' }        // 预告生成关
};
const GEN_HINTS = ['四张卡里凑十',        // dch1 池 4 target 10
                   '五张卡里凑十',        // dch2 池 5 target 10
                   '这次凑十五',          // dch3 池 4 target 15
                   '目标会换，看清再凑']; // dch4 池 5 三目标混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=mt_
   已核 manifest 无占用（SPEC §4 2026-09-12 实查））。 ---------- */
const VOICE = {
  watch:     { key: 'mt_tut_watch',   text: '看！两张卡凑一凑' },
  turn:      { key: 'mt_tut_turn',    text: '你来凑一凑' },
  hint:      { key: 'mt_hint',        text: '想一想，还差几' },
  right:     { key: 'mt_right',       text: '凑对啦，收银咯' },
  wrongMore: { key: 'mt_wrong_more',  text: '多了一点，换张小一点的' },   // 和>target
  wrongLess: { key: 'mt_wrong_less',  text: '少了一点，换张大一点的' }    // 和<target
};

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 店铺雨棚 + 金币（小铺主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M10 17 h24 l-2.5 -6 h-19 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M12 17 v4 M19 17 v4 M26 17 v4 M33 17 v4" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="22" cy="30" r="7" fill="#F7D154" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M22 26.5 v7 M19.5 28.5 q2.5 -2.5 5 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 伙伴卡小脸：举牌小猫掌柜（静态伙伴，data-anim 锚） */
  partner: '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<g data-anim="partner">' +
    '<path d="M14 22 L17 8 L27 16 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M46 22 L43 8 L33 16 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="32" r="18" fill="#F5B26B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="24" cy="30" r="2.4" fill="' + INK + '"/><circle cx="36" cy="30" r="2.4" fill="' + INK + '"/>' +
    '<ellipse cx="20" cy="36" rx="3.4" ry="2.4" fill="#F2B8C6" opacity=".8"/>' +
    '<ellipse cx="40" cy="36" rx="3.4" ry="2.4" fill="#F2B8C6" opacity=".8"/>' +
    '<path d="M27 37 q3 2.6 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '</g></svg>'
};
