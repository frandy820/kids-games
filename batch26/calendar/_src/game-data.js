/* ================= calendar 日历小星 游戏数据（时间词封闭表 / 章配置 / 语音文案 / 方向反馈模板 / 句式与 estMs / SVG）
   玩法：题面 = 时间词卡 + 顶部星期/月份序列条（点亮题面词 base，答对后答案位亮+小星填入——序列可视化教育点），
   下方 4 张天/月词卡。点对 = 卡亮起 + 确认句（全十型 clip 段链——R37-bis 键集；键未注册期
   playChain 缺键兜底=整句文本轨=静默告警，core Task#46 阶段3 已删 speechSynthesis）
   + 日历小星点亮（答案位填星）；点错 = 卡摇头 + 方向语义反馈（禁「错了」字样），
   1000ms 防重入窗（b16 定案）后可重选（探索不罚）。
   时间词封闭（表外不出题）：星期 一~日（7）+ 月份 一~十二（12）+ 日期词 一~十号（dateq/cbound 题面）。
   题型 10 kind（SPEC-R37 §R2）：±1 旧四型 day/month/day_rev/month_rev（T46 键在册）
   + 多步跳四型 day_2 后天/day_m2 前天/month_2 下下个月/month_m2 上上个月（环步 ±2，R37-bis 键）
   + dateq 日期+星期复合（「X号是星期A，X+2号是星期几」——日期序→星期序映射）
   + cbound 跨月界（「十月三十一号，明天是几月几号」→ 十一月一号；大月小月边界，11 源月无二月）。
   跨界（环缝）难点：星期日→星期一 / 十二月→一月（ch3 每关接龙跨界 1+反向多步跨界 2）。
   近对=相邻项：±1 题=base+答案另侧邻+1 随机；±2 题=中转词（答案往 base 侧 1 格）+外侧邻+1 随机；
   dateq 锚星期不入干扰（self 句语义防错配）；cbound=不存在日期（d1）+下月二号（d2）+下下月一号（d3）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 时间词封闭表（星期 7 + 月份 12 + 日期词 10 + 月末边界 11 行） ---------- */
const DAYS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月',
                '七月', '八月', '九月', '十月', '十一月', '十二月'];
const KINDS = ['day', 'month', 'day_rev', 'month_rev',              // 题型全集（SPEC-R37 十型）
              'day_2', 'day_m2', 'month_2', 'month_m2', 'dateq', 'cbound'];
/* R37-bis：全十型段链化——±1 旧四型 T46 键在册，jump/dateq/cbound 走 §R6-bis 37 新键
   （题面/确认骨架+数字号词+数数反馈+hint）；manifest 未注册期 playChain/play 缺键兜底=
   整句文本轨（core 无 TTS=静默告警）——不伪造缺失键，注册为上线必做 */
const famOf = kind => (kind === 'day' || kind === 'day_rev' || kind === 'day_2' ||
                       kind === 'day_m2' || kind === 'dateq') ? DAYS : MONTHS;
/* 环步进步长：±1 旧型 / ±2 多步跳与 dateq（+2）；isRev=负向语义（昨天/前天/上个月/上上个月） */
const dOf = kind => (kind === 'day' || kind === 'month') ? 1 :
                    (kind === 'day_rev' || kind === 'month_rev') ? -1 :
                    (kind === 'day_2' || kind === 'month_2' || kind === 'dateq') ? 2 : -2;
const isRev = kind => dOf(kind) < 0;
const isJumpK = kind => kind === 'day_2' || kind === 'day_m2' || kind === 'month_2' || kind === 'month_m2';
const CROSS_TAIL = { day: '星期日', month: '十二月' };           // 接龙跨界题面词（答案绕回环首）
/* ---------- 日期词表（dateq：锚 1-8 号 / 目标=锚+2 → 3-10 号） ---------- */
const DNUMS = ['一号', '二号', '三号', '四号', '五号', '六号', '七号', '八号'];
const TNUMS = ['三号', '四号', '五号', '六号', '七号', '八号', '九号', '十号'];
/* ---------- 月末边界封闭表（cbound，11 源月——二月不做源月：28/29 闰年歧义） ---------- */
const CB_END = { '一月': 31, '三月': 31, '四月': 30, '五月': 31, '六月': 30, '七月': 31,
                 '八月': 31, '九月': 30, '十月': 31, '十一月': 30, '十二月': 31 };
const CB_SRC = Object.keys(CB_END);                       // 11 行（生成池）
const cbEndW = m => CB_END[m] === 31 ? '三十一' : '三十'; // 月末数字词（题面用）
const cbD1W = m => CB_END[m] === 31 ? '三十二' : '三十一'; // 不存在日期数字词（d1 干扰用）
const cbNext = m => MONTHS[(MONTHS.indexOf(m) + 1) % 12];
const cbNext2 = m => MONTHS[(MONTHS.indexOf(m) + 2) % 12];
/* 环序列步进：d=±1/±2（跨界即模回环首） */
const stepOf = (fam, i, d) => fam[(i + d + fam.length) % fam.length];

/* ---------- 章配置（章号 1 基；生成关 flat≥20 随机章型 dch∈1-4）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言）。
   章谱（SPEC-R37 §R2）：ch1 day×5（不动）· ch2 month×3+monthJump+跨年 monthJumpCross ·
   ch3 day_rev+month_rev+day_m2 跨界+month_m2 跨界+接龙跨界 · ch4 anyOld+anyJump+dateq+cbound+anyAll ---------- */
const CHAPTERS = {
  1: { name: '星期排排队', hint: '十二个月份也要排排队哦' },      // 预告 ch2 月份接龙
  2: { name: '月份排排队', hint: '倒着想一想，昨天是哪一个' },    // 预告 ch3 反向+跨界
  3: { name: '倒着想', hint: '接龙和倒着想混在一起，大挑战来啦' },  // 预告 ch4 混合
  4: { name: '大挑战', hint: '新一轮日历小星挑战' }               // 预告生成关
};
const GEN_HINTS = ['星期一到星期日，排排队认一认',   // dch1 星期接龙
                   '一月到十二月，也要排排队',       // dch2 月份接龙
                   '昨天和上个月，倒着想',           // dch3 反向+跨界
                   '正着倒着大混搭，想好再选'];      // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   六件套 clip（SPEC §4 实长量化）：watch 3312 / turn 1776 / hint 2376 /
   right 2400 / wrong 2088 / q 2304（ms，等待窗按此 +300 余量）
   题面句/确认句/方向句=动态文本，走 TTS 拼句（豁免 clip 化） ---------- */
const VOICE = {
  watch: { key: 'cal_tut_watch', text: '看！星期几排排队' },
  turn:  { key: 'cal_tut_turn',  text: '你来想一想' },
  hint:  { key: 'cal_hint',      text: '想想它的后面是谁' },
  right: { key: 'cal_right',     text: '答对啦，你真棒' },
  wrong: { key: 'cal_wrong',     text: '再想一想顺序' },
  q:     { key: 'cal_q',         text: '它的后面是哪一个' }
};

/* ---------- 方向语义反馈模板（SPEC §3：按所点项与答案的相对位置给方向线索，
   接龙与反向各自分向——禁一套文案硬套两族；不出现「错了」字样；全句面字面真——审查 M1 重写）：
   fwd（接龙，找 base 的后面）：过去侧（已经过，在答案前）→ before；未来侧（还没到，在答案后）→ after；
     点 base 自己 → 专属句（今天/本月）。
   revDay/revMonth（反向，找 base 的昨天/上个月）：未来侧（在答案后）→ after；过去侧（在答案前）→ before。 ---------- */
const DIRFB = {
  fwd:      { before: '这个已经过啦，它在前面', after: '它排在后面哦，往前找找' },
  revDay:   { before: '昨天在它后面哦', after: '昨天在它前面哦' },   /* 单对象句（试玩 P3-a）：昨天=答案在所点前/后 */
  revMonth: { before: '上个月在它后面哦', after: '上个月在它前面哦' }
};

/* ---------- 句式（±1 旧型=T46 段链同构；新题型=TTS 拼句——play(null,text) 家族通道）
   最长句静态上限（build.py 按封闭表独立重算对账）：
   确认句 ≤11 字（十一月的上上个月是九月——3 字月词×2+骨架 6 字，est=4395）/
   题面句 ≤13 字（十二月三十一号，明天是几月几号——与 v1 这个是十二月…持平） ---------- */
const quizText = q =>
  q.kind === 'day'      ? q.base + '的后面是星期几？' :
  q.kind === 'month'    ? q.base + '的后面是几月？' :
  q.kind === 'day_rev'  ? '今天是' + q.base + '，昨天是星期几？' :
  q.kind === 'month_rev'? '这个月是' + q.base + '，上个月是几月？' :
  q.kind === 'day_2'    ? '今天是' + q.base + '，后天是星期几？' :
  q.kind === 'day_m2'   ? '今天是' + q.base + '，前天是星期几？' :
  q.kind === 'month_2'  ? '这个月是' + q.base + '，下下个月是几月？' :
  q.kind === 'month_m2' ? '这个月是' + q.base + '，上上个月是几月？' :
  q.kind === 'dateq'    ? DNUMS[q.dn] + '是' + q.base + '，' + TNUMS[q.dn] + '是星期几？' :
                          q.base + cbEndW(q.base) + '号，明天是几月几号？';
const confirmText = q =>
  q.kind === 'day'      ? q.base + '的后面是' + q.answer :
  q.kind === 'month'    ? q.base + '的后面是' + q.answer :
  q.kind === 'day_rev'  ? q.base + '的前面是' + q.answer :
  q.kind === 'month_rev'? q.base + '的前面是' + q.answer :
  q.kind === 'day_2'    ? q.base + '的后天是' + q.answer :
  q.kind === 'day_m2'   ? q.base + '的前天是' + q.answer :
  q.kind === 'month_2'  ? q.base + '的下下个月是' + q.answer :
  q.kind === 'month_m2' ? q.base + '的上上个月是' + q.answer :
  q.kind === 'dateq'    ? TNUMS[q.dn] + '是' + q.answer :
                          '明天是' + q.answer;
/* ---------- 题面/确认/方向反馈 clip 键构造（T46 ±1 旧型 + R37-bis 新题型全段链，SPEC §R6-bis）
   词键 cal_d_0..6 / cal_m_0..11 按 DAYS/MONTHS 索引；数字号词 cal_num_1..10（dateq 锚 1-8 号
   ∪目标 3-10 号=1-10 号）+ cal_num_30/31（cbound 月末）；骨架 cal_q_*（题面）/cal_cf_*（确认）/
   自指 cal_self_* / 反向救援 cal_prev（T46 在册）+ jump 四型题面尾段 cal_q_d2/dm2/m2/mm2（前段
   复用 cal_q_dr1/mr1）+ 确认 cal_cf_d2/dm2/m2/mm2 + dateq 连词 cal_q_dq1「是」+ 尾段 cal_q_dq2 +
   cbound 尾段 cal_q_cb/确认首段 cal_cf_cb + 数数反馈 cal_fb_j_* + cbound d1 反馈 cal_fb_cb_31|32
   + hint cal_hint_p2/m2/p2m/m2m/dq/cb（§R6-bis 37 键，manifest 未注册期缺键兜底=文本轨静默） ---------- */
const wordKeyOf = (kind, w) => {
  const fam = famOf(kind);
  return (fam === DAYS ? 'cal_d_' : 'cal_m_') + fam.indexOf(w);
};
const quizKeys = q =>
  q.kind === 'day'      ? [wordKeyOf(q.kind, q.base), 'cal_q_day'] :
  q.kind === 'month'    ? [wordKeyOf(q.kind, q.base), 'cal_q_month'] :
  q.kind === 'day_rev'  ? ['cal_q_dr1', wordKeyOf(q.kind, q.base), 'cal_q_dr2'] :
  q.kind === 'month_rev'? ['cal_q_mr1', wordKeyOf(q.kind, q.base), 'cal_q_mr2'] :
  q.kind === 'day_2'    ? ['cal_q_dr1', wordKeyOf(q.kind, q.base), 'cal_q_d2'] :
  q.kind === 'day_m2'   ? ['cal_q_dr1', wordKeyOf(q.kind, q.base), 'cal_q_dm2'] :
  q.kind === 'month_2'  ? ['cal_q_mr1', wordKeyOf(q.kind, q.base), 'cal_q_m2'] :
  q.kind === 'month_m2' ? ['cal_q_mr1', wordKeyOf(q.kind, q.base), 'cal_q_mm2'] :
  q.kind === 'dateq'    ? ['cal_num_' + (q.dn + 1), 'cal_q_dq1', wordKeyOf(q.kind, q.base),
                          'cal_num_' + (q.dn + 3), 'cal_q_dq2'] :
                          [wordKeyOf(q.kind, q.base), CB_END[q.base] === 31 ? 'cal_num_31' : 'cal_num_30', 'cal_q_cb'];
const confirmKeys = q =>
  (q.kind === 'day' || q.kind === 'month') ?
    [wordKeyOf(q.kind, q.base), 'cal_cf_fwd', wordKeyOf(q.kind, q.answer)] :
  (q.kind === 'day_rev' || q.kind === 'month_rev') ?
    [wordKeyOf(q.kind, q.base), 'cal_cf_rev', wordKeyOf(q.kind, q.answer)] :
  q.kind === 'day_2'    ? [wordKeyOf(q.kind, q.base), 'cal_cf_d2', wordKeyOf(q.kind, q.answer)] :
  q.kind === 'day_m2'   ? [wordKeyOf(q.kind, q.base), 'cal_cf_dm2', wordKeyOf(q.kind, q.answer)] :
  q.kind === 'month_2'  ? [wordKeyOf(q.kind, q.base), 'cal_cf_m2', wordKeyOf(q.kind, q.answer)] :
  q.kind === 'month_m2' ? [wordKeyOf(q.kind, q.base), 'cal_cf_mm2', wordKeyOf(q.kind, q.answer)] :
  q.kind === 'dateq'    ? ['cal_num_' + (q.dn + 3), 'cal_q_dq1', wordKeyOf(q.kind, q.answer)] :
                          ['cal_cf_cb', wordKeyOf(q.kind, cbNext(q.base)), 'cal_num_1'];
const dirKey = (q, word) => {              /* 键轨：±1=T46 在册键 / jump·dateq 数数三路 R37-bis 键 /
                                             cbound d1=月词+反馈键两段链（sayWrong 识别数组）/ d2,d3 在册键 */
  if (q.kind === 'cbound')
    return word === q.base + cbD1W(q.base) + '号'
      ? [wordKeyOf(q.kind, q.base), 'cal_fb_cb_' + (CB_END[q.base] === 31 ? 32 : 31)]
      : 'cal_fb_fwd_a';                    // d1=大月小月教学句（月词+「没有 N 号哦」）/ d2,d3=未来侧在册键
  if (isJumpK(q.kind) || q.kind === 'dateq') {
    const fam = famOf(q.kind), bi = fam.indexOf(q.base), wi = fam.indexOf(word);
    const d = dOf(q.kind), L = fam.length;
    const s = d > 0 ? (wi - bi + L) % L : (bi - wi + L) % L;   // 沿数数方向步数
    if (s === 0)
      return (q.kind.indexOf('month') >= 0 ? 'cal_self_m_' : 'cal_self_d_') + (d < 0 ? 'r' : 'f');
    if (s < 2)                             // 差一步：数数教育句键（dirText 文案同构）
      return 'cal_fb_j_' + (d > 0 ? 'p' : 'm') + '1' + (q.kind.indexOf('month') >= 0 ? 'm' : 'd');
    return 'cal_fb_j_over';                // s≥2：数过头
  }
  const fam = famOf(q.kind), bi = fam.indexOf(q.base), wi = fam.indexOf(word);
  const fwdD = (wi - bi + fam.length) % fam.length;
  if (fwdD === 0)
    return (q.kind.indexOf('month') >= 0 ? 'cal_self_m_' : 'cal_self_d_') + (isRev(q.kind) ? 'r' : 'f');
  const after = fwdD <= (bi - wi + fam.length) % fam.length;
  if (!isRev(q.kind)) return after ? 'cal_fb_fwd_a' : 'cal_fb_fwd_b';
  return after ? (q.kind === 'day_rev' ? 'cal_fb_rd_a' : 'cal_fb_rm_a')
               : (q.kind === 'day_rev' ? 'cal_fb_rd_b' : 'cal_fb_rm_b');
};
/* T46 段链实长表（mp3 实测 ms，verify ⑪ ±60ms 运行时对账——重合成即 FAIL 防表过期）：
   拼链总长=Σ段+段间 150；判对收尾窗取 estMs 与链实长较大者（clip 语速慢于 SAPI 估算，
   day 族链 5268 > 窗 5150/month 族 4884 > 4460——estMs 单独不可罩，b26 T46 实测）。
   R37-bis 37 新键行=注册后浏览器 Audio 实测（cal_q_dq1 单字「是」1224——与词键同量级；
   cbound d1 反馈链最长 1560+2040+150=3750 ≤ wrongChainUntil 4600-300，窗不动） */
const CAL_CLIP_MS = {
  cal_cf_cb: 1584, cal_cf_d2: 1752, cal_cf_dm2: 1752, cal_cf_fwd: 1728, cal_cf_rev: 1752,
  cal_cf_m2: 2088, cal_cf_mm2: 2088,
  cal_d_0: 1560, cal_d_1: 1536, cal_d_2: 1584, cal_d_3: 1608, cal_d_4: 1608,
  cal_d_5: 1560, cal_d_6: 1584,
  cal_fb_cb_31: 2040, cal_fb_cb_32: 2040,
  cal_fb_fwd_a: 3144, cal_fb_fwd_b: 3120,
  cal_fb_j_m1d: 1992, cal_fb_j_m1m: 2088, cal_fb_j_over: 3048,
  cal_fb_j_p1d: 1992, cal_fb_j_p1m: 2064,
  cal_fb_rd_a: 2160, cal_fb_rd_b: 2112, cal_fb_rm_a: 2376, cal_fb_rm_b: 2304,
  cal_hint_cb: 3480, cal_hint_dq: 3408, cal_hint_m2: 2976, cal_hint_m2m: 3072,
  cal_hint_p2: 2952, cal_hint_p2m: 3048,
  cal_m_0: 1344, cal_m_1: 1344, cal_m_2: 1416, cal_m_3: 1392, cal_m_4: 1344,
  cal_m_5: 1368, cal_m_6: 1344, cal_m_7: 1368, cal_m_8: 1368, cal_m_9: 1440,
  cal_m_10: 1560, cal_m_11: 1560,
  cal_num_1: 1344, cal_num_2: 1344, cal_num_3: 1416, cal_num_4: 1440, cal_num_5: 1320,
  cal_num_6: 1368, cal_num_7: 1344, cal_num_8: 1320, cal_num_9: 1344, cal_num_10: 1416,
  cal_num_30: 1560, cal_num_31: 1728,
  cal_prev: 2472,
  cal_q_cb: 2208, cal_q_d2: 2208, cal_q_dm2: 2184, cal_q_day: 2280,
  cal_q_dq1: 1224, cal_q_dq2: 1848, cal_q_dr1: 1584, cal_q_dr2: 2208,
  cal_q_m2: 2256, cal_q_mm2: 2304, cal_q_month: 1992, cal_q_mr1: 1704, cal_q_mr2: 2064,
  cal_self_d_f: 3072, cal_self_d_r: 3096, cal_self_m_f: 3120, cal_self_m_r: 3120,
};
const chainMs = keys => keys.reduce((s, k) => s + (CAL_CLIP_MS[k] || 0) + 150, -150);
/* TTS 拼句时长估算（b25 定版：SAPI ~345ms/汉字 + 600ms 基数；标点/问号不计）
   判对演出窗按 estMs(确认句) 动态取值——月份长句（10 字=4050ms）不被读题掐尾 */
const estMs = t => 345 * String(t).replace(/[^一-鿿]/g, '').length + 600;
const CONFIRM_PAD = 300;   /* 确认句窗余量（b25 定版 +300）；判对窗合计 800+estMs+300 */

/* ---------- 方向反馈句（SPEC-R37 §R1/§R4——三路分区，全句面字面真）：
   ①±1 旧型：原 base 中心分区逐行不动（verify ⑮ 15 例硬编码表对拍口径）——
     fwdD=沿序列正方向 base→所点步数，pastD 互补；fwdD=0=点 base 自己；
     未来侧（fwdD≤pastD，还没到）→ after；过去侧（pastD<fwdD，已经过）→ before。
   ②jump/dateq：**数数教育三路**（±2 题答案距 base 2 格，v1「已经过啦/排在后面」
     模板对中转词字面假——中转词=「明天」未过去却排在答案前。改按沿数数方向步数 s 分区：
     s=0→自指句（在册 cal_self_*）；s=1→「再多数/少数一（天/个月）哦」直接教步数；
     s≥2（数过头）→「数过头啦，往回数一数」。全 ≤9 字 est ≤3705+300 ≤ wrongChainUntil 4600。
   ③cbound：d1 不存在日期→「{src}没有{N+1}号哦」大月小月教学句（≤9 字）；
     d2/d3 相对答案（下月一号）均在未来侧→fwd.after 在册模板（字面真：二号排在一号后面） ---------- */
function dirText(q, word) {
  if (q.kind === 'cbound') {
    if (word === q.base + cbD1W(q.base) + '号')
      return q.base + '没有' + cbD1W(q.base) + '号哦';
    return DIRFB.fwd.after;
  }
  if (isJumpK(q.kind) || q.kind === 'dateq') {
    const fam = famOf(q.kind), bi = fam.indexOf(q.base), wi = fam.indexOf(word);
    const d = dOf(q.kind), L = fam.length;
    const s = d > 0 ? (wi - bi + L) % L : (bi - wi + L) % L;   // 沿数数方向步数
    if (s === 0)
      return (q.kind.indexOf('month') >= 0 ? '就是这个月哦' : '就是今天哦') +
             (d < 0 ? '，找它前面的' : '，找它后面的');
    const unit = q.kind.indexOf('month') >= 0 ? '一个月' : '一天';   // 「再多数一个月哦」（6 字，r34 M1 朗读检查）
    if (s < 2) return (d > 0 ? '再多数' : '再少数') + unit + '哦';
    return '数过头啦，往回数一数';
  }
  const fam = famOf(q.kind), bi = fam.indexOf(q.base), wi = fam.indexOf(word);
  const fwdD = (wi - bi + fam.length) % fam.length;
  if (fwdD === 0)
    return (q.kind.indexOf('month') >= 0 ? '就是这个月哦' : '就是今天哦') +
           (isRev(q.kind) ? '，找它前面的' : '，找它后面的');
  const after = fwdD <= (bi - wi + fam.length) % fam.length;
  if (!isRev(q.kind)) return after ? DIRFB.fwd.after : DIRFB.fwd.before;
  const tab = q.kind === 'day_rev' ? DIRFB.revDay : DIRFB.revMonth;
  return after ? tab.after : tab.before;
}

/* ---------- 序列条（教育点：星期/月份序列可视化——base 格橙亮带方向小箭头，
   答对后答案格绿亮+小星填入；跨界题答案绕回环首，孩子看见「绕回开头」 ---------- */
const seqCellWord = (fam, w) =>
  fam === DAYS ? w.replace('星期', '') : w.replace('月', '');   // 格内短字（一~日 / 1-12）
function renderSeqInto(el, q) {
  const fam = famOf(q.kind);
  let html = '';
  for (let i = 0; i < fam.length; i++) {
    const isBase = fam[i] === q.base;
    const cls = isBase ? 'cell cur' : 'cell';
    const dir = isBase ? (isRev(q.kind)
      ? '<span class="dir" aria-hidden="true">◀</span>'
      : '<span class="dir" aria-hidden="true">▶</span>') : '';
    html += '<div class="' + cls + '" data-w="' + fam[i] + '">' +
            dir + '<span class="cw">' + seqCellWord(fam, fam[i]) + '</span></div>';
  }
  el.innerHTML = html;
}
/* 答对：序列条答案位亮起+小星填入（renderSeq 后调用；verify 对账 data-w）
   cbound：答案=组合日期词（「二月一号」）不在月份条 12 格词集——亮答案月格
   cbNext(base)（r37 minor3：下月格=跨月界目标，face/jump 族同款 lit+小星形态） */
function seqLightAnswer(el, q) {
  const w = q.kind === 'cbound' ? cbNext(q.base) : q.answer;
  const cell = el.querySelector('.cell[data-w="' + w + '"]');
  if (!cell) return;
  cell.classList.add('lit');
  if (!cell.querySelector('.mini-star')) {
    const s = document.createElement('span');
    s.className = 'mini-star';
    s.setAttribute('aria-hidden', 'true');
    s.textContent = '★';
    cell.appendChild(s);
  }
}

/* ---------- 日历小星吉祥物（题面角色：五角星+笑脸，答对时跳） ---------- */
function starSvg(size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="120" height="120"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M50 7 L61.5 35.5 L92 38 L69 57.5 L76 88 L50 72.5 L24 88 L31 57.5 L8 38 L38.5 35.5 Z" ' +
    'fill="#F5C445" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<circle cx="41" cy="45" r="3.4" fill="' + INK + '"/>' +
    '<circle cx="59" cy="45" r="3.4" fill="' + INK + '"/>' +
    '<path d="M43 55 Q50 61 57 55" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="34" cy="52" rx="4.2" ry="2.8" fill="#F2A0B5" opacity=".7"/>' +
    '<ellipse cx="66" cy="52" rx="4.2" ry="2.8" fill="#F2A0B5" opacity=".7"/></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 小星+日历页（主题） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="11" y="12" width="22" height="20" rx="3" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M11 18 h22" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M16 12 v-3 M28 12 v-3" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M22 20.5 l1.6 3.2 3.5 .5 -2.5 2.5 .6 3.5 -3.2 -1.7 -3.2 1.7 .6 -3.5 -2.5 -2.5 3.5 -.5 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/></svg>',
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
