/* ================= cashier 游戏数据（章配置 / 语音文案与拼接单元 / 币·钞·商品·顾客 SVG）
   题面语音=queue 拼接（SPEC-BATCH15 §0.23）：短语 clip cas_q1/q2 + 数词 clip cas_n_*
   整元价：cas_q1'付了'+cas_n_pay+cas_q2'元，买了'+cas_n_price+cas_q3'元的东西，找他多少呀'（5 段）
   带角价（X.5）：cas_q1+cas_n_pay+cas_q2+cas_n_X+cas_q3j'元五角的东西，找他多少呀'（5 段）
   数词 clip 上限 cas_n_35（manifest 定稿 46 条）：36-50 走数位拼接
   （五十=cas_n_5+cas_n_10，四十七=cas_n_4+cas_n_10+cas_n_7）——ch4 付 50/价 36-49 仍全 clip 不落 TTS
   内部金额单位=半元（0.5 元）整数：带角全整数运算，JSON 确定性零浮点歧义（承 money） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   ch1 十元小柜台（付 10，价 3-9，找 1-7）/ ch2 二十元柜台（付 20，价 6-19，找 1-14）
   ch3 五角钱找零（付 20，价 5.5-19.5 含 40% 带角，找 0.5-14.5——带角找零=5 角币唯一渠道）
   ch4 五十元大生意（付 50，价 15-49，找 1-35）
   hint=章末预告文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '十元小柜台', hint: '二十元的钱来买东西' },
  2: { name: '二十元柜台', hint: '五角硬币来帮忙啦' },
  3: { name: '五角钱找零', hint: '五十元的大生意来啦' },
  4: { name: '五十元大生意', hint: '新一轮收银挑战' }
};
const GEN_HINTS = ['小零钱再找一次', '二十元找零挑战', '五角找零挑战', '大生意找零挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/clips/manifest.json 严格一致 §0.18） ---------- */
const VOICE = {
  watch: { key: 'cas_tut_watch', text: '看！顾客买东西啦' },
  turn:  { key: 'cas_tut_turn',  text: '你来当收银员' },
  hint:  { key: 'cas_hint',      text: '算一算，要找多少钱' },
  q1:    { key: 'cas_q1',   text: '付了' },
  q2:    { key: 'cas_q2',   text: '元，买了' },
  q3:    { key: 'cas_q3',   text: '元的东西，找他多少呀' },
  q3j:   { key: 'cas_q3j',  text: '元五角的东西，找他多少呀' },
  right: { key: 'cas_right', text: '找对啦' },
  wrong: { key: 'cas_wrong', text: '再算一算找零' },      /* 答错 clip 化（§0.24） */
  more:  { key: 'cas_q_more', text: '多找啦，拿回去一枚' }, /* 超额轻提示（10s 节流 §1） */
  less:  { key: 'cas_q_less', text: '还差一点点' }         /* 差额轻提示（10s 节流 §1） */
};

/* ---------- 中文数词：1-35 整词 clip（cas_n_1..35）；36-50 数位拼接（clip 上限 35） ---------- */
const NUM_CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八',
  9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
  16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十', 21: '二十一', 22: '二十二',
  23: '二十三', 24: '二十四', 25: '二十五', 26: '二十六', 27: '二十七', 28: '二十八',
  29: '二十九', 30: '三十', 31: '三十一', 32: '三十二', 33: '三十三', 34: '三十四', 35: '三十五' };
const numCn = n => NUM_CN[n] ||
  (n >= 36 && n <= 50 ? NUM_CN[Math.floor(n / 10)] + '十' + (n % 10 ? NUM_CN[n % 10] : '') : String(n));
/* 数词读音段序列：≤35 单段整词；36-50 数位多段（十位+十+个位，全 clip §0.23） */
function numParts(n) {
  if (NUM_CN[n]) return [{ key: 'cas_n_' + n, text: NUM_CN[n] }];
  const t = Math.floor(n / 10), u = n % 10;
  const ps = [{ key: 'cas_n_' + t, text: NUM_CN[t] }, { key: 'cas_n_10', text: NUM_CN[10] }];
  if (u) ps.push({ key: 'cas_n_' + u, text: NUM_CN[u] });
  return ps;
}

/* 半元单位 ↔ 元显示：半元→元数值恒 ÷2；文字串偶数="X 元"、奇数="Y 元 5 角" */
const fmtYuan = j => j / 2;
const fmtTxt = j => j % 2 ? (((j - 1) / 2) + ' 元 5 角') : ((j / 2) + ' 元');

/* ---------- 题面读音单元序列（与题面文字一一对应；queue 段间自动 0.15s 停顿）
   引擎金额为半元单位，读音/文字一律先转元 ---------- */
function quizParts(q) {
  const half = q.price % 2 === 1;                 /* 价 X.5（带角尾段 q3j） */
  const parts = [{ key: VOICE.q1.key, text: VOICE.q1.text }]
    .concat(numParts(q.pay / 2))
    .concat([{ key: VOICE.q2.key, text: VOICE.q2.text }])
    .concat(numParts((q.price - (half ? 1 : 0)) / 2));
  parts.push(half ? { key: VOICE.q3j.key, text: VOICE.q3j.text }
                  : { key: VOICE.q3.key, text: VOICE.q3.text });
  return parts;
}
const qSpeech = q => VOICE.q1.text + numCn(q.pay / 2) + VOICE.q2.text +
  numCn((q.price - (q.price % 2)) / 2) +
  (q.price % 2 ? VOICE.q3j.text : VOICE.q3.text);   /* TTS 兜底与 quizParts 同构 */

/* ---------- 硬币简笔（圆形+内圈+大字面额+两侧花饰，承 money 家族造型 §0.28）
   5 角金铜 / 1 元银灰（照 money 1 元）/ 2 元暖青绿 / 5 元暖紫（照 money 5 元） ---------- */
const COIN_STYLE = {
  0.5: { body: '#E8C28F', ring: '#C9A46B', ink: '#7E5A28', bloom: '#F4E0BC', unit: '角', num: '5' },
  1:   { body: '#C9CFD8', ring: '#A7B1BD', ink: '#5A6572', bloom: '#E2E7ED', unit: '元', num: '1' },
  2:   { body: '#B7D9C4', ring: '#8FB89F', ink: '#43604F', bloom: '#D8EDDF', unit: '元', num: '2' },
  5:   { body: '#CDB3DF', ring: '#A98CC4', ink: '#6E5580', bloom: '#E4D4EE', unit: '元', num: '5' }
};
function coinSvg(v, w) {
  const c = COIN_STYLE[v] || COIN_STYLE[1], h = w;
  return '<svg viewBox="0 0 64 64" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="30" fill="' + c.body + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="32" cy="32" r="24.5" fill="none" stroke="' + c.ring + '" stroke-width="1.8"/>' +
    /* 两侧花饰（简笔小菊，承 money） */
    '<g stroke="' + c.ring + '" stroke-width="1.6" stroke-linecap="round">' +
    '<path d="M12 26 v-3 M10.5 25 h3 M12 40 v-3 M10.5 39 h3" transform="translate(1.5,-1)"/>' +
    '<path d="M52 26 v-3 M50.5 25 h3 M52 40 v-3 M50.5 39 h3" transform="translate(-1.5,-1)"/>' +
    '<circle cx="13.5" cy="24.5" r="2.2" fill="' + c.bloom + '" stroke="none"/>' +
    '<circle cx="13.5" cy="41" r="2.2" fill="' + c.bloom + '" stroke="none"/>' +
    '<circle cx="50.5" cy="24.5" r="2.2" fill="' + c.bloom + '" stroke="none"/>' +
    '<circle cx="50.5" cy="41" r="2.2" fill="' + c.bloom + '" stroke="none"/></g>' +
    /* 大字面额 + 单位（5 角币面='5'+'角'） */
    '<text x="32" y="30.5" text-anchor="middle" font-size="21" font-weight="800" fill="' + c.ink +
      '" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + c.num + '</text>' +
    '<text x="32" y="45" text-anchor="middle" font-size="10.5" font-weight="700" fill="' + c.ink +
      '" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + c.unit + '</text>' +
    '<path d="M20 15 Q26 11 32 13" stroke="#FFF" stroke-width="2.6" opacity=".5" fill="none" stroke-linecap="round"/></svg>';
}

/* ---------- 大额纸币（10/20/50 三色，仅题面展示不可点选 §0.28；aria 只读） ---------- */
const BILL_STYLE = {
  10: { body: '#A9CBD8', deep: '#7FA8BC', ink: '#3F6B7E' },  // 青蓝（照 money 10 元）
  20: { body: '#F2C98C', deep: '#D9A452', ink: '#7E5A1E' },  // 暖橙
  50: { body: '#A8C9A0', deep: '#7FA877', ink: '#3C6338' }   // 暖绿
};
function billSvg(v, w) {
  const b = BILL_STYLE[v] || BILL_STYLE[10];
  return '<svg viewBox="0 0 120 56" width="' + w + '" height="' + Math.round(w * 56 / 120) +
    '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="3" y="3" width="114" height="50" rx="7" fill="' + b.body + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="9.5" y="9.5" width="101" height="37" rx="4" fill="none" stroke="' + b.deep + '" stroke-width="1.6" stroke-dasharray="4 3"/>' +
    '<circle cx="97" cy="28" r="12.5" fill="none" stroke="' + b.deep + '" stroke-width="1.8"/>' +
    '<circle cx="97" cy="28" r="8" fill="' + b.deep + '" opacity=".28"/>' +
    '<text x="50" y="36.5" text-anchor="middle" font-size="27" font-weight="800" fill="' + b.ink +
      '" font-family="PingFang SC, Microsoft YaHei, sans-serif">' + v + '</text>' +
    '<text x="69" y="36.5" font-size="12.5" font-weight="700" fill="' + b.ink +
      '" font-family="PingFang SC, Microsoft YaHei, sans-serif">元</text>' +
    '<path d="M12 12 Q22 8 34 11" stroke="#FFF" stroke-width="2.2" opacity=".45" fill="none" stroke-linecap="round"/></svg>';
}

/* ---------- 商品（题面轮换 SVG 简笔，暖色 ≥3 元素；数字不入画，承 money 家族） ---------- */
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

/* ---------- 顾客（小动物轮换，答对道谢离场；简笔暖色） ---------- */
const CUSTOMERS = [
  { name: '小兔', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="21" cy="14" rx="5" ry="12" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-8 21 14)"/>' +
    '<ellipse cx="37" cy="13" rx="5" ry="12.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.2" transform="rotate(10 37 13)"/>' +
    '<ellipse cx="21" cy="14" rx="2.2" ry="7.5" fill="#F2B8C6" transform="rotate(-8 21 14)"/>' +
    '<ellipse cx="37" cy="13" rx="2.2" ry="8" fill="#F2B8C6" transform="rotate(10 37 13)"/>' +
    '<circle cx="29" cy="35" r="16.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="23" cy="33" r="2.2" fill="' + INK + '"/><circle cx="35" cy="33" r="2.2" fill="' + INK + '"/>' +
    '<ellipse cx="29" cy="39" rx="2.6" ry="1.9" fill="#D98A8A"/>' +
    '<path d="M26 43 q3 2.6 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/></svg>' },
  { name: '小猫', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 22 L12 8 L24 15 Z" fill="#F6E3C5" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M44 22 L46 8 L34 15 Z" fill="#F6E3C5" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M15.5 19 L14.5 12 L20.5 16 Z" fill="#F2B8C6"/>' +
    '<path d="M42.5 19 L43.5 12 L37.5 16 Z" fill="#F2B8C6"/>' +
    '<circle cx="29" cy="34" r="16.5" fill="#F6E3C5" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="23" cy="32" r="2.2" fill="' + INK + '"/><circle cx="35" cy="32" r="2.2" fill="' + INK + '"/>' +
    '<path d="M29 37 v2.6 M29 40 q-2.4 2 -4.4 0 M29 40 q2.4 2 4.4 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M9 33 h7 M9.5 38 h6.5 M49 33 h-7 M48.5 38 h-6.5" stroke="' + INK + '" stroke-width="1.5" stroke-linecap="round" opacity=".6"/></svg>' },
  { name: '小熊', svg: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="15" cy="16" r="7" fill="#D9A452" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="43" cy="16" r="7" fill="#D9A452" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="15" cy="16" r="3" fill="#E8C28F"/><circle cx="43" cy="16" r="3" fill="#E8C28F"/>' +
    '<circle cx="29" cy="35" r="16.5" fill="#E8C28F" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="23" cy="32" r="2.2" fill="' + INK + '"/><circle cx="35" cy="32" r="2.2" fill="' + INK + '"/>' +
    '<ellipse cx="29" cy="40" rx="5" ry="3.8" fill="#F6E3C5" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<ellipse cx="29" cy="38.6" rx="2" ry="1.5" fill="#D98A8A"/>' +
    '<path d="M24 44.5 q5 3 10 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>' }
];

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="8" width="34" height="12" rx="3" fill="#E8975A" stroke="#FFF" stroke-width="2.2"/>' +
    '<rect x="9" y="22" width="26" height="12" rx="3" fill="#F2C98C" stroke="#FFF" stroke-width="2.2"/>' +
    '<circle cx="22" cy="16" r="2.6" fill="#FFF"/>' +
    '<rect x="16" y="26" width="12" height="4" rx="2" fill="#FFF"/></svg>',
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
  shop: '<svg viewBox="0 0 44 44" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 16 L11 8 h22 l3 8 Z" fill="#E8873A" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<rect x="10" y="16" width="24" height="20" rx="2" fill="#FDEBD2" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M19 36 v-9 h6 v9" fill="#F6E3C5" stroke="#4A3B2E" stroke-width="2.2"/></svg>'
};
