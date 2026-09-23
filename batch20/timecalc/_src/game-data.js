/* ================= timecalc 时间计算 游戏数据（章配置 / 语音文案 / 星期与时间词 / 图标）
   r16 难度改造（2026-09-16，AUDIT-78:83）：ch1 整点半点认读（与 clock 款重复且一年级下）
   → 5 分钟刻度读刻+经过时间运算；ch3 新增跨日跨周「时钟+日历」复合；ch4 作息表读表。
   7-8 岁锚：从「认钟面」升到「时间量运算与复合推算」。
   9 型（§0.43 真值公式见 game-core.js ansTextOf，verify 侧 refAnswer 分源对账）：
     clock5 钟面 5 分钟刻读刻 / elapse 同日经过时间（分钟加进位）/
     plus 星期顺推 / minus 星期逆推 / span 区间差（B−A 不含今天）/
     comp 同日复合（星期冗余+下午时刻+N 分钟）/ compd 跨日复合（晚上11:mm 过半夜12点→次日）/
     night 跨日求时长（晚 h1 睡早 h2 起）/ sched 作息表读表（dur/find/long 三问型）
   §0.43 干扰项=合法格式（星期名/时间/天数/小时/分钟/活动名）且 ∉ answer、互异
   （永不出现「星期八」类非法项）。T46 阶段2 全量 clip 化：星期词/时间词/数词/活动名/
   题面段/引导句=tc_ 预合成 224 条（r16 基础 7+T46 拆段 217，与 voice/clips/
   manifest.json games:['timecalc'] 严格一致 §0.18）；原「星期词/时间词/数词=TTS 兜底
   豁免（SPEC §1：tc_n_ 不建）」随 Task#46 撤销；缺键族（tc_s_eve/tc_s_day/tc_s_hour/
   tc_s_min/tc_num_60-75）主链 say 回退待补登（game-main askChain/sayVal 注释）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- r16 时长模型（门禁硬断言；认知步主体非演出窗——crd r12 范式）
   每题 dur = max(voiceWin, DECIDE_MS[分型]) + TAP_MS + ADV_MS（点卡选择款无多键输入步）；
   voiceWin = ENTER 400 + estMs(题面全文) + TAIL 300（读题句窗）。
   estMs = s.length*345+600（b25 定版：SAPI ~345ms/字+600，全字符口径标点计入）
   ——四方字面同步（源常量+此处注释+verify ⑭ 独立副本断言+build.py 字面 assert），改必四处同改。
   DECIDE_MS（7-8 岁认知决策推算，时间运算按认知负荷分型）：
     clock5  9000：读题 2s + 分针 5 刻换算（数 5 的倍数）4s + 时针两刻度间判读 2s + 校对 1s
     elapse 14000：读题 3s + 分钟加法进位规划 5s + 原时刻干扰排除 2s + 比对 2s + 校对 2s
     plus   11000：读题 2s + 环回数数 5s + 比对 2s + 校对 2s
     minus  12000：读题 2s + 逆推环回数数 6s + 比对 2s + 校对 2s
     span   13000：读题 3s + 「不算出发那天」锚 4s + 数格 3s + 校对 3s
     comp   15000：读题 3s + 剥离星期冗余信息 2s + 下午标记 1s + 分钟进位加 5s + 比对 2s + 校对 2s
     compd  19000：读题 4s + 半夜 12 点日界判断 5s + 星期推进环回 4s + 分钟加 3s + 校对 3s
     night  15000：读题 3s + 构造跨夜分段模型 6s + 直减陷阱排除 3s + 校对 3s
     sched_dur  16000：读题 2s + 表格行定位 4s + 两位时刻减法 5s + 比对 3s + 校对 2s
     sched_find 12000：读题 2s + 表列扫描定位 5s + 比对 3s + 校对 2s
     sched_long 13000：读题 2s + 逐行时长心算 5s + 比较排序 4s + 校对 2s
   TAP_MS=1500（一次点选：扫视+按压，7-8 岁）/ ADV_MS=880（答对推进演出窗）。
   句长验算（voiceWin 恒 ≤ DECIDE——45 关全域最坏句长实算，verify ⑭ 独立复算；数字=345n+600 形）：
     clock5 12 字=4140+600=4740，vw 5440 <9000；elapse 24 字=8280+600=8880，vw 9580 <14000；
     plus 17 字=5865+600=6465，vw 7165 <11000；minus 16 字=5520+600=6120，vw 6820 <12000；
     span 23 字=7935+600=8535，vw 9235 <13000；comp 27 字=9315+600=9915，vw 10615 <15000；
     compd 40 字=13800+600=14400，vw 15100 <19000；night 21 字=7245+600=7845，vw 8545 <15000；
     sched_dur 16 字=5520+600=6120，vw 6820 <16000；sched_find 20 字=6900+600=7500，vw 8200 <12000；
     sched_long 16 字=5520+600=6120，vw 6820 <13000——语音窗从不撑时长，认知步主体。
   40 关 modeled 最低=91040@flat0（verify ⑭ 与 Python 第三源双钉；LEVEL_MIN_MS=40000 门禁）。 */
const ENTER_MS = 400;                        // 新题面出场动画窗（与读题并行起播）
const TAIL_MS = 300;                         // 读题句播完收听余量（家族 T）
const ADV_MS = 880;                          // 答对推进演出窗（uiTapOpt 答对 wait(880*SPEED)）
const estMs = s => s.length * 345 + 600;     // b25 定版（四方字面同步见上）
const DECIDE_MS = {                          // 7-8 岁决策档（sched 按问型分档）
  clock5: 9000, elapse: 14000, plus: 11000, minus: 12000, span: 13000,
  comp: 15000, compd: 19000, night: 15000,
  sched_dur: 16000, sched_find: 12000, sched_long: 13000
};
const TAP_MS = 1500;                         // 每次点选物理+扫视步
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r15 门禁）
const decideOf = q => DECIDE_MS[q.kind === 'sched' ? 'sched_' + q.stype : q.kind];
/* 语音窗（读题句窗；askText 在 game-main.js——运行期已定义）与关级汇总 */
const voiceWinMs = q => ENTER_MS + estMs(askText(q)) + TAIL_MS;
const quizDurMs = q => Math.max(voiceWinMs(q), decideOf(q)) + TAP_MS + ADV_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   r16 四章重排：ch1 五分钟刻+经过时间 / ch2 过几天·前几天·经过几天（日历推算）/
   ch3 跨日跨周复合（时钟+日历）/ ch4 作息表读表
   hint=章末预告文案（家族 F：CHAPTERS[i].hint=第 i+1 章预告——预告下一章语义，
   r13 poemfill P2-3 教训：禁写本章自己内容；GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '五分钟刻', hint: '过几天是星期几' },
  2: { name: '过几天',   hint: '时钟和日历一起算' },
  3: { name: '跨日跨周', hint: '读一读作息表' },
  4: { name: '作息表',   hint: '时间小达人混合作战' }
};
const GEN_HINTS = ['五分钟刻再来一次', '过几天再算一次', '跨日跨周再来一次', '作息表再读一次'];
const CH_LEN = 8;          // 8 题 = 1 关（r16：5→8，AUDIT-78 分数批同口径）
const LEVELS_PER_CH = 10;  // 每章 10 关（键基恒定：keyOf 分母=LEVELS_PER_CH 非 CH_LEN）
const STATIC_LEVELS = 40;  // 静态 40 关；flat ≥ 40 生成关（dch 随机）

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 manifest 严格一致 §0.18）
   r16 分型：日历类（plus/minus/span）沿用 tc_hint/tc_wrong；时刻类
   （clock5/elapse/comp/compd/night/sched）用 tc_hint2/tc_wrong2 ---------- */
const VOICE = {
  watch:  { key: 'tc_tut_watch', text: '看！算一算时间' },
  turn:   { key: 'tc_tut_turn',  text: '你来算一算' },
  hint:   { key: 'tc_hint',      text: '想想过了几天' },
  hint2:  { key: 'tc_hint2',     text: '看看表，算一算' },
  right:  { key: 'tc_right',     text: '算对啦，真棒' },
  wrong:  { key: 'tc_wrong',     text: '再想想日历' },
  wrong2: { key: 'tc_wrong2',    text: '再想一想时间' }
};
/* 题型→hint/wrong 键（日历类 vs 时刻类；开场链/救援/读题面同源） */
const CAL_KINDS = ['plus', 'minus', 'span'];
const hintOf = q => CAL_KINDS.indexOf(q.kind) >= 0 ? VOICE.hint : VOICE.hint2;
const wrongOf = q => CAL_KINDS.indexOf(q.kind) >= 0 ? VOICE.wrong : VOICE.wrong2;

/* ---------- 星期与时间词（真值数据；today/from 均 0-6 星期日基）
   WEEK=完整星期名（卡值/题面）；WEEK_SHORT=星期条块面单字；CN=中文数词（朗读拼接） ---------- */
const WEEK = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const WEEK_SHORT = ['日', '一', '二', '三', '四', '五', '六'];
const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const cnOf = n => (n >= 0 && n < CN.length) ? CN[n] : String(n);
/* 中文两位数（10-59 朗读）：5→'零五' 用 cn5Of；15→'十五'；25→'二十五'；50→'五十' */
const cnNum = n => n < 10 ? '零' + CN[n] :
  n === 10 ? '十' : n < 20 ? '十' + CN[n % 10] :
  CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
/* 小时朗读（1-12 域，11/12 走两位数：'十一'/'十二'——cnTime(11,·) 曾 undefined 崩点） */
const cnHour = h => h < 10 ? CN[h] : cnNum(h);
/* 时间卡文本（12 小时制，分钟两位 5 刻——r16 五分钟刻口径：'3:05'） */
const fmtTime = (h, m) => h + ':' + (m < 10 ? '0' : '') + m;
/* 题面朗读时刻（中文口语）：3:05→'三点零五'、3:50→'三点五十'、11:40→'十一点四十'、3:00→'三点整' */
const cnTime = (h, m) => cnHour(h) + '点' + (m === 0 ? '整' : (m < 10 ? '零' + CN[m] : cnNum(m)) + '分');
/* 作息表活动名池（7-8 岁生活场景；同关取互异 4-5 个） */
const ACTS = ['起床', '早读', '做操', '吃早饭', '游戏', '学习', '画画', '户外活动', '听故事', '午休'];

/* ---------- 通用图标（全部内嵌 SVG，禁外链） ---------- */
const ICONS = {
  /* logo：小闹钟（时间主题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="22" cy="24" r="14" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M22 16 v8 l5.5 4" stroke="#E8975A" stroke-width="2.8" stroke-linecap="round" fill="none"/>' +
    '<path d="M11 12 L15 8 M33 12 L29 8" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M9 21 l-4 -2 M35 21 l4 -2 M9 27 l-4 2 M35 27 l4 2" stroke="#E8975A" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="22" cy="24" r="2" fill="#4A3B2E"/></svg>',
  speakerSmall: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  check: '<svg viewBox="0 0 64 64" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 34 L27 46 L50 18" stroke="#8FBF7F" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* night 题双时刻牌图标：月亮（晚睡）/太阳（早起） */
  moon: '<svg viewBox="0 0 40 40" width="34" height="34" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M30 24 a12 12 0 1 1 -14 -16 a10 10 0 1 0 14 16 Z" fill="#8A9BAE" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="31" cy="9" r="1.6" fill="#E8DCC8"/><circle cx="36" cy="15" r="1.2" fill="#E8DCC8"/></svg>',
  sun: '<svg viewBox="0 0 40 40" width="34" height="34" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="20" cy="20" r="9" fill="#F6C55A" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M20 4 v5 M20 31 v5 M4 20 h5 M31 20 h5 M9 9 l3.5 3.5 M27.5 27.5 l3.5 3.5 M31 9 l-3.5 3.5 M12.5 27.5 l-3.5 3.5" stroke="#E8975A" stroke-width="2.6" stroke-linecap="round"/></svg>'
};
