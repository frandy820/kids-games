/* ================= teach 教会小兔子 游戏数据（NUMCN 映射 / 章配置 / 语音文案 / 图标）
   玩法（SPEC-BATCH37 §0.90 + §6 r5 难度改造版本块，7-8 岁元认知·协作心智·教授式学习）：
   每题=一节三步小课（流程型款承 b35 errdoc 三步先例，教学 watch ≤22s 预算）：
   ①示范步 phase='show'：任务句 keyless TTS「教小兔子数N个苹果」（N=NUMCN 2-20）+托盘，
   孩子点苹果入碗（碗计数=苹果点阵逐个显示非数字文字，每颗标序号——数感锚）；
   碗容量=N 点满自动确认（数数自由探索不计 miss）。
   **r5 按群计数（照 shapecount r3 先例：分组点亮+组末计数）**：n≥10 策略条
   [一个一个数|两个两个数|五个五个数]（默认逐个），组模式下托盘=组块按钮，tap 一次
   一组飞入+组末 keyless say「四个/九个/…」（累计报数）；切换策略=本题碗清零重数
   （不罚——大数用群数才高效、逐个数可行但慢，不惩罚只慢）。
   ②兔子步 phase='rabbit'（纯演出零判定）：兔子探头+「兔子说：我来试试」→兔子在
   学习碗逐颗摆苹果**并标出报数序列**（r5 错误类型三类——孩子读过程判定非只看数量）：
   漏数 skip（跳过某数，m=n-1）/重复 dup（某数数两遍，m=n+1）/换序 swap（相邻两数
   颠倒，m=n——数量不变，只看数量必漏判）。
   ③纠错步 phase='fix'：**生成化 4 选诊断卡**（正确纠错+同型近义干扰——「漏数了4」vs
   「漏数了5」vs「4数了两遍」vs「它数对啦」；视觉匹配失效须读兔子数数过程判定）；
   选对=兔子修正演出（漏数补颗/重复拿走/换序归位）+学会庆祝+right；选错=困惑摇头+
   wrong+miss；miss≥2 好卡 breathe。
   **r5 教到会两轮跟踪**：同型错误关内复现（seeded rep 位，「又犯了同样的错」），
   连续两题同型首选答对→掌握（存档 sv.teach.hits 记录，答错即断连续）。
   语音前缀=tch_ 6 条（r5 零新 clip：组末计数/引导句走 keyless say——shapecount 先例）；
   确认链=right 单 clip；错链=tch_wrong+150+tch_hint+300=4866。
   clip 实长（batch37/_clipdur37.json 浏览器实测）：tut_watch 2832 / tut_turn 1752 /
   task 2160 / hint 2352 / right 3120（判对后窗 ≥3420）/ wrong 2064。
   窗（家族 G/H/T）：开题=task 2460→任务句 keyless estMs(动态字数)+300（9 字下限
   4005=NUMCN 4-10；10 字 4350=N 11-20）→[ch3/4 首题 n≥10 引导句 5040]→开放；
   兔子句 8 字 estMs 3360→**与摆苹果重叠**（演出窗=max(3360+300, m×250)+卡入场 800）；
   确认窗=right 3120+300=3420 精确（家族 H）；celebrate 层 2620+800=3420（b37 裁决）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- NUMCN 数字映射表（契约 L：r5 任务数+组末计数封闭集全量 2-20——19 值） ---------- */
const NUMCN = {
  2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
  11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五', 16: '十六', 17: '十七',
  18: '十八', 19: '十九', 20: '二十'
};

/* ---------- 时序常量（SPEC §4 实长表 + §6 r5 分账；全部真时钟演出窗） ---------- */
const WRONG_CHAIN_WIN = 4866;   // 错链豁免窗=wrong 2064+150+hint 2352+300（契约 I 精确值）
const CONFIRM_WIN = 3420;       // 确认窗=right 3120+300 精确（家族 H：celebrate 层 2620+800 补足）
const TASK_CLIP_WIN = 2460;     // 开题 task clip 窗 ≥ 2160+300
const TASK_SAY_MIN = 4005;      // 任务句 keyless 窗下限 ≥ estMs(9 字 3705)+300（实际按 estMs 动态取大）
const GROUP_SAY_WIN = 5040;     // r5 按群引导句窗 ≥ estMs(12 字 4740)+300（大数字，可以几个几个数哦——全字符含标点）
const RABBIT_SAY_WIN = 3660;    // 兔子句 keyless 窗 ≥ estMs(8 字 3360)+300（兔子说：我来试试）
const RABBIT_PEEK_MS = 800;     // 兔子探头看碗（CSS tch-peek .8s——与兔子句窗重叠起演）
const APPLE_POP_MS = 250;       // 兔子逐个摆苹果/苹果飞入动画步进
const CARD_IN_MS = 800;         // 纠错卡入场锁
const FIX_ANIM_MS = 800;        // 兔子修正动画（补颗/拿走/归位）——确认窗内并行
const WROLL_MS = 900;           // 错反馈视觉锁（卡摇头+链起播）
const TUT_WATCH_WAIT = 3132;    // ≥ tch_tut_watch 2832+300（防尾截）
const TUT_TURN_WAIT = 2052;     // ≥ tch_tut_turn 1752+300
const TUT_GHOST_MOVE = 400;     // 教学 demo 幽灵手指移动（从紧——watch 预算）
const TUT_GHOST_PRESS = 320;    // 教学 demo 幽灵手指按压（从紧）
const TRAY_EXTRA = 2;           // 托盘视觉富余（逐个模式 N+2 颗——数数探索余量；组块模式无富余）
const GROUP_MIN = 10;           // r5 策略条在场阈值（n≥10 大数才开按群——delta：大数用群数才高效）
const REP_P = 0.45;             // r5 同型复现概率（题 i>0 时 rnd()<0.45 → 复现前题型）

/* ---------- 章配置（SPEC §6 r5 章型：ch1 漏数诊断 → ch2 重复+换序 → ch3 按群计数（大数）
   → ch4 混出+两轮跟踪；hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言） ---------- */
const CHAPTERS = {
  1: { name: '漏数小课堂',     hint: '兔子还会犯别的错' },       // 预告 ch2 重复+换序
  2: { name: '重复和换序',     hint: '大数字来啦，几个几个数' }, // 预告 ch3 按群大数
  3: { name: '大数按群数',     hint: '各种错混着来，大挑战' },   // 预告 ch4 混出
  4: { name: '复习大挑战',     hint: '新的小课要开始啦' }        // 预告生成关
};
const GEN_HINTS = ['漏数先教一教',       // dch1 skip
                   '重复换序教一教',     // dch2 dup+swap
                   '大数按群教一教',     // dch3 群数大数
                   '各种错都要教'];       // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关（5 节小课）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章（flat0-19 dch=章号；flat≥20 生成关）

/* ---------- 语音文案（与 voice/clips manifest games:['teach'] 严格一致，禁自造；
   前缀=tch_ 已核 manifest 无占用（SPEC §4 2026-09-12 实查）；r5 零新 clip——
   组末计数/引导句/策略 label 全走 keyless say，既有 6 条文本禁改） ---------- */
const VOICE = {
  watch: { key: 'tch_tut_watch', text: '看！当小老师' },
  turn:  { key: 'tch_tut_turn',  text: '你来教一教' },
  task:  { key: 'tch_task',      text: '教兔子数一数' },
  hint:  { key: 'tch_hint',      text: '看看兔子摆对了吗' },
  right: { key: 'tch_right',     text: '兔子学会啦，你是好老师' },
  wrong: { key: 'tch_wrong',     text: '兔子还没听懂哦' }
};

/* ---------- r5 纠错卡模板（生成化 4 选——SPEC §6 封闭表；label 数字用阿拉伯与
   碗点阵序号标签一致（7-8 岁数字可读锚），label 不入 TTS 链）
   skip=漏数了X / dup=X数了两遍 / swap=X和X+1数反了 / none=它数对啦 ---------- */
const CARD_KINDS = ['skip', 'dup', 'swap', 'none'];
const cardLabel = (kind, x) =>
  kind === 'skip' ? '漏数了' + x :
  kind === 'dup'  ? x + '数了两遍' :
  kind === 'swap' ? x + '和' + (x + 1) + '数反了' : '它数对啦';
/* 相位问句条（show 相位显示任务句文本——题面真值；渲染即引擎；fix 复现题=「老毛病」叙事） */
const PHASE_TEXT = {
  rabbit: '兔子来学一学',
  fix:    '兔子摆对了吗？选一张帮帮它',
  fixRep: '又犯了老毛病，帮它找出来'
};
/* 策略条（r5 按群计数：n≥10 在场；label=按钮文本+点击 keyless say 文本） */
const GROUP_MODES = [
  { g: 1, label: '一个一个数' },
  { g: 2, label: '两个两个数' },
  { g: 5, label: '五个五个数' }
];
const GROUP_HINT_TTS = '大数字，可以几个几个数哦';   // ch3/4 首题 n≥10 引导句（12 字 estMs 4740）

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕；无 <text> 防尺寸漂移） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 小黑板 + 苹果（小老师主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="9" y="10" width="26" height="18" rx="3.5" fill="#4A3B2E"/>' +
    '<rect x="20.4" y="7" width="3.2" height="5" rx="1.4" fill="#D98A6A"/>' +
    '<circle cx="16" cy="19" r="3.4" fill="#E05A4E"/><circle cx="24" cy="21.5" r="2.6" fill="#8FBF7F"/>' +
    '<path d="M12 33 Q22 29 32 33" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/></svg>',
  /* 红苹果（托盘/碗内点阵共用——28-46px 缩放） */
  apple: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 13 C18 8 8 10 8 22 C8 33 16 41 24 41 C32 41 40 33 40 22 C40 10 30 8 24 13 Z" fill="#E05A4E" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M24 12 Q23 6 28 4" stroke="#6B8E4E" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="16.5" cy="21" rx="4" ry="6" fill="#FFF" opacity=".35" transform="rotate(-18 16.5 21)"/></svg>',
  /* 暖底瓷碗（示范碗/学习碗共用——空碗底图，苹果点阵叠加于碗口上方） */
  bowl: '<svg viewBox="0 0 200 96" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M10 18 Q100 30 190 18 L182 58 Q170 88 100 88 Q30 88 18 58 Z" fill="#FDEBD2" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<ellipse cx="100" cy="19" rx="90" ry="12" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M86 88 L114 88" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/></svg>',
  /* r5 纠错卡图标（4 型）：skip=苹果序列虚线缺位 / dup=苹果重影 / swap=双苹果弯箭头
     / none=苹果+绿勾 */
  fixSkip: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="16" cy="36" r="11" fill="#E05A4E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="34" cy="36" r="11" fill="none" stroke="#D95040" stroke-width="2.6" stroke-dasharray="4 4"/>' +
    '<circle cx="52" cy="36" r="11" fill="#E05A4E" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M34 12 L34 20 M34 12 L30 16 M34 12 L38 16" stroke="#D95040" stroke-width="3" stroke-linecap="round"/></svg>',
  fixDup: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="26" cy="36" r="13" fill="#E05A4E" stroke="' + INK + '" stroke-width="3" opacity=".5"/>' +
    '<circle cx="26" cy="36" r="13" fill="#E05A4E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="46" cy="28" r="10" fill="#E05A4E" stroke="' + INK + '" stroke-width="3" opacity=".55"/>' +
    '<circle cx="46" cy="48" r="11" fill="#FFF9EE" stroke="#D95040" stroke-width="3"/>' +
    '<path d="M40 48 L52 48" stroke="#D95040" stroke-width="3.6" stroke-linecap="round"/></svg>',
  fixSwap: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="18" cy="24" r="11" fill="#E05A4E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="46" cy="24" r="11" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M14 40 Q32 56 50 40" stroke="#D98A6A" stroke-width="3.2" stroke-linecap="round" fill="none"/>' +
    '<path d="M46 44 L50 40 L54 45" stroke="#D98A6A" stroke-width="3.2" stroke-linecap="round" fill="none"/></svg>',
  fixNone: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="30" cy="34" r="14" fill="#E05A4E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="49" cy="46" r="11" fill="#FFF9EE" stroke="#5B8C5A" stroke-width="3"/>' +
    '<path d="M43.5 46 L47.5 50 L55 42" stroke="#5B8C5A" stroke-width="3.6" stroke-linecap="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
