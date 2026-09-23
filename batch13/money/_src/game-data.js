/* ================= money 游戏数据（章配置 / 语音文案与拼接单元 / 币与商品 SVG）
   r15 难度改造版（2026-09-16，AUDIT-78:80 黄款定案）：ch1 起步含 5 角、找零改数字键盘
   输入（去 3 选 1）、加「买两件合计」、多币组合。
   题面语音=queue 拼接（SPEC §0.23）：数词 clip men_n_1..20 + 短语 clip
   凑钱 ch1 整价 men_q_buy'买'+men_n_P+men_q_buy2'元的东西，点出正好的钱'（3 段）
   凑钱 ch1 角价 men_q_buy+men_n_X+men_q_buy_j'元五角的东西，点出正好的钱'（3 段，r15 新）
   买两件 ch2 men_q_buy+nA+(men_q_and'元的和'|men_q_and_j'元五角的和')+nB+
   (men_q_buy2|men_q_buy_j)（5 段，r15 新增 3 键）
   找零 ch3 men_q_pay'付了'+men_n_pay+men_q_pay2'元，买'+men_n_price+men_q_pay3'元的东西，找回几元呀'（5 段）
   找零 ch4 价 X.5：men_q_pay+men_n_10+men_q_pay2+men_n_X+men_q_jiao'元五角的东西，找回几元呀'（5 段）
   （men_q_jiao 为 money 开发期补合 clip；r15 新 men_q_buy_j/men_q_and/men_q_and_j 三键）
   内部金额单位=半元（0.5 元）整数：带角全整数运算，JSON 确定性零浮点歧义 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- r15 时长模型（门禁硬断言；认知步主体非演出窗——crd r12 范式）
   每题 dur = max(voiceWin, DECIDE_MS[kind]) + nInput*TAP_MS + CONFIRM_MS + ADV_MS；
   voiceWin = ENTER 400 + estMs(题面全文) + TAIL 300（读题句窗）。
   estMs = s.length*345+600（b25 定版：SAPI ~345ms/字+600，全字符口径标点计入）
   ——四方字面同步（源常量+此处注释+verify ⑭ 断言+build.py 字面 assert），改必四处同改。
   DECIDE_MS（7-8 岁认知决策推算）：
     gather 12000：读题 4s + 角位换算价签 2s + 币组合规划（扫 3-7 币）4s + 校对 2s
     pair   15000：读题 4s + 两价相加含角位 5s + 合计后组合规划 4s + 校对 2s
     change 13000：读题 4s + 付-价退位减心算 5s + 键位定位 3s + 校对 1s
     jiao   16000：读题 4s + 角位退减（10-3.5 型）6s + 元/角双域输出规划 4s + 校对 2s
   TAP_MS=1500（每键/每币：扫视+按压，7-8 岁）/ CONFIRM_MS=2000（终检提交步）/ ADV_MS=880（答对推进窗）。
   nInput：gather/pair=最少解币数（minCoinsDP）/ change=答案元位数 / jiao=元位数+1（5 角键）。
   句长验算（voiceWin 恒 ≤ DECIDE——题面全域最坏句长，verify ⑭ 独立复算；r15 审查 m1 勘正：原注 5 数均非 345n+600 形）：
     gather 整 13 字=5085 / gather 角 15 字=5775 <12000；pair 21 字=7845 <15000；
     change 17 字=6465 <13000；jiao 19 字=7155 <16000——语音窗从不撑时长，认知步主体。
   40 关 modeled 见 verify ⑭（LEVEL_MIN_MS=40000 门禁+最低精确值防回漂）。 */
const ENTER_MS = 400;                        // 新题面出场动画窗（与读题并行起播）
const TAIL_MS = 300;                         // 读题句播完收听余量（家族 T）
const ADV_MS = 880;                          // 答对推进演出窗（uiTapOK/uiConfirm 答对 wait(880*SPEED)）
const estMs = s => s.length * 345 + 600;     // b25 定版（四方字面同步见上）
const DECIDE_MS = { gather: 12000, pair: 15000, change: 13000, jiao: 16000 };   // 7-8 岁决策档
const TAP_MS = 1500;                         // 每键/每币物理+扫视步（键盘输入步分型）
const CONFIRM_MS = 2000;                     // 确认步分型（终检+提交，与输入步分开计型）
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r15 门禁）

/* 最少解币数（模型用；verify 另有独立副本） */
function minCoinsDP(avail, target) {
  if (target < 0) return 0;
  const INF = 99;
  const dp = new Array(target + 1).fill(INF);
  dp[0] = 0;
  for (const v of avail) for (let t = target; t >= v; t--) {
    if (dp[t - v] + 1 < dp[t]) dp[t] = dp[t - v] + 1;
  }
  return dp[target] >= INF ? 0 : dp[target];
}
const voiceWinMs = q => ENTER_MS + estMs(qSpeech(q)) + TAIL_MS;
const nInputOf = q => q.kind === 'gather' || q.kind === 'pair'
  ? minCoinsDP(q.coins, q.price)
  : String(Math.floor(q.ans / 2)).length + (q.kind === 'jiao' ? 1 : 0);
const quizDurMs = q => Math.max(voiceWinMs(q), DECIDE_MS[q.kind]) + nInputOf(q) * TAP_MS + CONFIRM_MS + ADV_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   r15 四章：ch1 凑零钱含五角（币 0.5/1/5，价含 X.5）/ ch2 买两件合计（两价相加再凑，
   币 0.5/1/5/10 含拆 10）/ ch3 找零整元键盘（付 10/20，价 3-18）/ ch4 找零带角键盘
   （付 10/20，价 X.5，答案元数字+5 角键；首题热身=ch3 型）
   hint=章末预告文案（预告下一章语义，GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '凑零钱',   hint: '两样东西一起买' },
  2: { name: '买两件',   hint: '付钱以后，找回零钱' },
  3: { name: '找零钱',   hint: '五角钱来啦' },
  4: { name: '五角板',   hint: '新一轮付钱挑战' }
};
const GEN_HINTS = ['五角硬币凑一凑', '两样东西一起买', '数字键盘找零钱', '五角找零挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/manifest.json 严格一致 §0.18）
   r15 新 3 键：men_q_buy_j/men_q_and/men_q_and_j（既有 30 键一字不改） ---------- */
const VOICE = {
  watch: { key: 'men_tut_watch', text: '看！钱币点一点' },
  turn:  { key: 'men_tut_turn',  text: '你来付一付' },
  hint:  { key: 'men_hint',      text: '算一算，正好的钱' },
  qbuy:  { key: 'men_q_buy',     text: '买' },
  qbuy2: { key: 'men_q_buy2',    text: '元的东西，点出正好的钱' },
  buyj:  { key: 'men_q_buy_j',   text: '元五角的东西，点出正好的钱' },   /* r15：ch1 角价尾句（整条含指令） */
  and:   { key: 'men_q_and',     text: '元的和' },                       /* r15：ch2 A 件整价接续段 */
  andj:  { key: 'men_q_and_j',   text: '元五角的和' },                   /* r15：ch2 A 件角价接续段 */
  qpay:  { key: 'men_q_pay',     text: '付了' },
  qpay2: { key: 'men_q_pay2',    text: '元，买' },
  qpay3: { key: 'men_q_pay3',    text: '元的东西，找回几元呀' },
  qjiao: { key: 'men_q_jiao',    text: '元五角的东西，找回几元呀' },
  wrong: { key: 'men_wrong',     text: '再想一想，算一算多少钱' }  /* 答错 clip 化（§0.24） */
};

/* ---------- 中文数词 1-20（题面 queue 拼接用，clip men_n_1..20 全在场） ---------- */
const NUM_CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八',
  9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
  16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十' };
const numCn = n => NUM_CN[n] || String(n);
const nKey = n => 'men_n_' + n;                       /* 数词 clip key（men_n_20 已修复='二十'） */

/* 半元单位 ↔ 元显示：半元→元数值恒 ÷2（0.5 二进制精确）；文字串偶数="X 元"、奇数="Y 元 5 角"
   （家族规：带角显示一律"X元5角"格式，禁 6.5 小数连写） */
const fmtYuan = j => j / 2;
const fmtTxt = j => j % 2 ? ((j - 1) / 2 + ' 元 5 角') : (j / 2 + ' 元');

/* ---------- 题面读音单元序列（与题面文字一一对应；queue 段间自动 0.15s 停顿）
   引擎金额为半元单位，读音/文字一律先转元 ---------- */
function quizParts(q) {
  if (q.kind === 'gather') {
    const half = q.price % 2 === 1;                   /* ch1 角价 X.5 */
    return [
      { key: VOICE.qbuy.key, text: VOICE.qbuy.text },
      { key: nKey((q.price - (half ? 1 : 0)) / 2), text: numCn((q.price - (half ? 1 : 0)) / 2) },
      half ? { key: VOICE.buyj.key, text: VOICE.buyj.text }
           : { key: VOICE.qbuy2.key, text: VOICE.qbuy2.text }
    ];
  }
  if (q.kind === 'pair') {                            /* ch2 买两件：买 X(元五角)的和 Y(元五角)的东西 */
    const ha = q.priceA % 2 === 1, hb = q.priceB % 2 === 1;
    return [
      { key: VOICE.qbuy.key, text: VOICE.qbuy.text },
      { key: nKey((q.priceA - (ha ? 1 : 0)) / 2), text: numCn((q.priceA - (ha ? 1 : 0)) / 2) },
      ha ? { key: VOICE.andj.key, text: VOICE.andj.text }
         : { key: VOICE.and.key, text: VOICE.and.text },
      { key: nKey((q.priceB - (hb ? 1 : 0)) / 2), text: numCn((q.priceB - (hb ? 1 : 0)) / 2) },
      hb ? { key: VOICE.buyj.key, text: VOICE.buyj.text }
         : { key: VOICE.qbuy2.key, text: VOICE.qbuy2.text }
    ];
  }
  const priceHalf = q.price % 2 === 1;                 /* ch4 价 X.5 */
  const parts = [
    { key: VOICE.qpay.key, text: VOICE.qpay.text },
    { key: nKey(q.pay / 2), text: numCn(q.pay / 2) },
    { key: VOICE.qpay2.key, text: VOICE.qpay2.text },
    { key: nKey((q.price - (priceHalf ? 1 : 0)) / 2), text: numCn((q.price - (priceHalf ? 1 : 0)) / 2) }
  ];
  if (priceHalf) parts.push({ key: VOICE.qjiao.key, text: VOICE.qjiao.text });       /* 带角=整条尾句（含"的东西，找回几元呀"） */
  else parts.push({ key: VOICE.qpay3.key, text: VOICE.qpay3.text });                  /* 整元=数词+元的东西 */
  return parts;
}
const qSpeech = q => quizParts(q).map(p => p.text).join('');   /* TTS 兜底与 quizParts 同构 */

/* ---------- 人民币硬币简笔（圆形+内圈+大字面额+两侧花饰）
   5 角金黄 / 1 元银灰 / 5 元暖紫 / 10 元青蓝（SPEC §1 视觉，r15 增 5 角） ---------- */
const COIN_STYLE = {
  0.5: { body: '#E8C87A', ring: '#C9A548', ink: '#8A6D1F', bloom: '#F4E3B0' },
  1:  { body: '#C9CFD8', ring: '#A7B1BD', ink: '#5A6572', bloom: '#E2E7ED' },
  5:  { body: '#CDB3DF', ring: '#A98CC4', ink: '#6E5580', bloom: '#E4D4EE' },
  10: { body: '#A9CBD8', ring: '#7FA8BC', ink: '#48707F', bloom: '#CFE3EB' }
};
function coinSvg(v, w) {
  const c = COIN_STYLE[v] || COIN_STYLE[1], h = w;
  const big = v === 0.5 ? '5' : String(v);            /* 5 角币大字="5" */
  const unit = v === 0.5 ? '角' : '元';
  return '<svg viewBox="0 0 64 64" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="30" fill="' + c.body + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="32" cy="32" r="24.5" fill="none" stroke="' + c.ring + '" stroke-width="1.8"/>' +
    /* 两侧花饰（简笔小菊） */
    '<g stroke="' + c.ring + '" stroke-width="1.6" stroke-linecap="round">' +
    '<path d="M12 26 v-3 M10.5 25 h3 M12 40 v-3 M10.5 39 h3" transform="translate(1.5,-1)"/>' +
    '<path d="M52 26 v-3 M50.5 25 h3 M52 40 v-3 M50.5 39 h3" transform="translate(-1.5,-1)"/>' +
    '<circle cx="13.5" cy="24.5" r="2.2" fill="' + c.bloom + '" stroke="none"/>' +
    '<circle cx="13.5" cy="41" r="2.2" fill="' + c.bloom + '" stroke="none"/>' +
    '<circle cx="50.5" cy="24.5" r="2.2" fill="' + c.bloom + '" stroke="none"/>' +
    '<circle cx="50.5" cy="41" r="2.2" fill="' + c.bloom + '" stroke="none"/></g>' +
    /* 大字面额 + 小单位 */
    '<text x="32" y="30.5" text-anchor="middle" font-size="21" font-weight="800" fill="' + c.ink +
      '" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + big + '</text>' +
    '<text x="32" y="45" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + c.ink +
      '" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + unit + '</text>' +
    '<path d="M20 15 Q26 11 32 13" stroke="#FFF" stroke-width="2.6" opacity=".5" fill="none" stroke-linecap="round"/></svg>';
}

/* ---------- 商品（gather/pair 题面轮换 SVG 简笔，暖色 ≥3 元素；数字不入画） ---------- */
const GOODS = [
  { name: '棒棒糖', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="29" cy="21" r="14" fill="#F2A9B8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M29 21 m-9 0 a9 9 0 0 1 9 -9 a6.5 6.5 0 0 0 0 13 a4 4 0 0 1 0 -8" stroke="#FFF" stroke-width="2.6" fill="none" opacity=".85"/>' +
    '<path d="M29 35 L29 54" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M29 44 q7 -3 9 3" stroke="#8FBF7F" stroke-width="4" fill="none" stroke-linecap="round"/></svg>' },
  { name: '小汽车', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 36 L13 25 Q14 22 18 22 L38 22 Q42 22 44 25 L49 36 Z" fill="#8FB7DE" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<rect x="20" y="15" width="17" height="9" rx="3" fill="#B7D3EA" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="18" cy="40" r="6" fill="' + INK + '"/><circle cx="18" cy="40" r="2.6" fill="#E5D9C4"/>' +
    '<circle cx="42" cy="40" r="6" fill="' + INK + '"/><circle cx="42" cy="40" r="2.6" fill="#E5D9C4"/></svg>' },
  { name: '花皮球', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="29" cy="29" r="17" fill="#F5C26B" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M29 12 Q40 29 29 46 Q18 29 29 12 Z" fill="#E8873A" opacity=".8"/>' +
    '<path d="M13 24 Q29 32 45 24" stroke="' + INK + '" stroke-width="2" fill="none" opacity=".55"/>' +
    '<path d="M13 35 Q29 27 45 35" stroke="' + INK + '" stroke-width="2" fill="none" opacity=".55"/>' +
    '<path d="M22 16 Q26 20 23 24" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/></svg>' },
  { name: '气球', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="29" cy="22" rx="13" ry="15.5" fill="#EE9DAE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M26 37.5 h6 l-1.6 3.6 h-2.8 Z" fill="' + INK + '"/>' +
    '<path d="M29 41 Q24 47 29 52 Q34 55 30 57" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M24 15 Q26 11 31 11.6" stroke="#FFF" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/></svg>' },
  { name: '冰淇淋', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M18 26 L29 52 L40 26 Z" fill="#E8C28F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M18 26 h22 M22 35 h14" stroke="' + INK + '" stroke-width="1.8" opacity=".5"/>' +
    '<circle cx="29" cy="18" r="9.5" fill="#F6E3C5" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="24" cy="16.5" r="2.4" fill="#E8873A"/><circle cx="33" cy="19" r="2.2" fill="#8FBF7F"/>' +
    '<circle cx="29" cy="10" r="2.6" fill="#B4713F"/></svg>' },
  { name: '铅笔', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="24" y="10" width="10" height="30" rx="2" fill="#F5C26B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M24 40 L29 50 L34 40 Z" fill="#F6E3C5" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M26.6 45 L29 50 L31.4 45 Z" fill="' + INK + '"/>' +
    '<rect x="24" y="10" width="10" height="6" rx="2" fill="#EE9DAE" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M27 18 v26 M31 18 v26" stroke="' + INK + '" stroke-width="1.4" opacity=".4"/></svg>' }
];

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="22" cy="22" r="18" fill="#E8C87A" stroke="#FFF" stroke-width="2.4"/>' +
    '<circle cx="22" cy="22" r="14" fill="none" stroke="#C9A548" stroke-width="1.6"/>' +
    '<text x="22" y="29" text-anchor="middle" font-size="16" font-weight="800" fill="#FFF" font-family="sans-serif">5</text></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  hand: '<svg viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 20 Q6 12 12 8 Q18 4 24 8 Q29 12 27 19 Q26 24 20 26 L13 26 Q9 25 8 20 Z" fill="#F0A868" stroke="#4A3B2E" stroke-width="2"/>' +
    '<path d="M14 15 q2 -3 5 -1" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></svg>',
  ok: '<svg viewBox="0 0 44 44" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="22" cy="22" r="19" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M13 23 L20 30 L32 16" stroke="#FFF9EE" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  shop: '<svg viewBox="0 0 44 44" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 16 L11 8 h22 l3 8 Z" fill="#E8873A" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<rect x="10" y="16" width="24" height="20" rx="2" fill="#FDEBD2" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M19 36 v-9 h6 v9" fill="#F6E3C5" stroke="#4A3B2E" stroke-width="2.2"/></svg>'
};
