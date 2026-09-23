/* ================= errdoc 错题小医生 游戏数据（NUMCN 映射 / 静态题库 15 题 / 章配置 / 语音文案 / 图标）
   玩法（SPEC-BATCH35 §0.87/§3，7-8 岁元认知·错例诊断）：错题病历三步诊——
   步1 找病灶：点三部位之一（0=左数 a/1=运算符 op/2=答案 r；b 不设独立部位——§0.87
   定版三部位），点中出错部位=红圈高亮+ed_spot（num/op 型另加提示：正确原数/正确
   符号——ans 型不提示不泄 fix，孩子自己算）；点正常部位=wrong+miss（方向级）。
   步2 开药：3 张药卡数字选 1（含正确值 fix+两个干扰 fix±1/±10 邻近），选对=痊愈
   动画（病历卡打勾✓+小兔子康复跳）+确认链 [ed_right, 全式 TTS keyless 尾]；选错
   =wrong+miss。步3 归因：三选「没看清/算错啦/点太快」任何选择都接受+对应药方
   clip（非惩罚不计 miss）——元认知自评无真值。
   三错型：'ans'=答案算错（病灶=答案 2，算式对答案错）；'num'=数字抄错（病灶=左数
   0，shown.a=抄错值且 shown.r=按抄错数算对，如 13 抄 31→31-5=26）；'op'=符号看错
   （病灶=运算符 1，答案按错符算对，如 9+6 看成 9-6=3）。
   语音前缀=ed_ 9 条（SPEC §3/§4 实长表）+core 3 条；题面恒静态 DOM 文字（不 TTS）。
   clip 实长（batch35/_clipdur35.json 浏览器实测）：tut_watch 3216 / tut_turn 1680 /
   hint 3168 / right 2232（判对后窗 ≥2532）/ wrong 1656 / spot 2496 / rx_careful 2664 /
   rx_calc 2400 / rx_slow 2664。
   窗（家族 G/H/T，T46 clip 口径 2026-09-19）：确认链=right 2232+5×150+段链
   [ed_n_a,ed_op_*,ed_n_b,ed_s_eq,ed_n_fix] worst 7492+300=10146（ed_n worst 1464×3+
   ed_op 1152+ed_s_eq 1320；estMs 全式口径 6042 退役）；
   spot 提示链=2496+150+1872+150+worst ed_n 1464+300=6432；ans 型 spot 单 clip ≥2796；
   rx 药方单发 2664+300=2964；错链=wrong 1656+150+hint 3168+300=5274（spot/fix 两步
   同链同窗，真时钟）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- NUMCN 数字映射表（契约 L：0-20 全量 21 值——含 0 零备全；op 型错式
   中转值可为 0；1-9 单字、10 十、11-19 十X、20 二十） ---------- */
const NUMCN = {
  0: '零', 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九',
  10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五', 16: '十六',
  17: '十七', 18: '十八', 19: '十九', 20: '二十'
};
/* 运算符读法：「+」加「-」减「×」乘（SPEC §3）；「=」读等于 */
const OP_WORD = { '+': '加', '-': '减', '×': '乘' };
const OP_SHOW = { '+': '+', '-': '−', '×': '×' };   // 卡面展示（减号用数学负号更清晰）

/* ---------- 时序常量（SPEC §4 实长表 + 家族 G/H/T；全部真时钟演出窗） ---------- */
const WRONG_CHAIN_WIN = 5274;   // 错链豁免窗=wrong 1656+150+hint 3168+300（spot/fix 同链同窗，契约 I）
const CONFIRM_WIN = 10200;      // T46 clip 口径：right 2232+5×150+worst 链段（3×ed_n 1464+ed_op 1152+ed_s_eq 1320）+300=10146（estMs 8 字口径 6042 退役）
const SPOT_WIN_HINT = 6450;     // T46：spot 2496+150+here 1872+150+worst ed_n 1464+300=6432（estMs 7 字口径 5961 退役）
const SPOT_WIN_ANS = 2900;      // spot 单 clip 窗 ≥ 2496+300=2796（ans 型不提示不泄 fix）
const RX_WIN = 3050;            // rx 药方单发窗 ≥ 2664+300=2964
const PRESENT_MS = 800;         // 开题卡入场锁
const WROLL_MS = 900;           // 错反馈视觉锁（部位/药卡摇头+链起播）
const TUT_WATCH_WAIT = 3516;    // ≥ ed_tut_watch 3216+300（防尾截）
const TUT_TURN_WAIT = 1980;     // ≥ ed_tut_turn 1680+300

/* ---------- 章配置（SPEC §0.87 章型：ch1=ans 加减/ch2=ans 乘法/ch3=num/ch4=混合三型
   seeded）；hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言） ---------- */
const CHAPTERS = {
  1: { name: '答案看错了',   hint: '乘法算式也生病啦' },   // 预告 ch2 ans 乘法
  2: { name: '乘法小病历',   hint: '有的数字被抄错了' },   // 预告 ch3 num 抄错
  3: { name: '数字抄错了',   hint: '三种病混着来，大挑战' },   // 预告 ch4 混合
  4: { name: '混合大挑战',   hint: '新的病历本来啦' }        // 预告生成关
};
const GEN_HINTS = ['加减答案找一找',   // dch1 ans 加减
                   '乘法答案找一找',   // dch2 ans 乘法
                   '抄错的数字找一找', // dch3 num 抄错
                   '三种病都要看'];     // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章（ch1-3 各 5 关同表同序，ch4 混合构造）

/* ---------- 语音文案（与 voice/clips manifest games:['errdoc'] 严格一致，禁自造；
   前缀=ed_ 已核 manifest 无占用（SPEC §4 2026-09-12 实查）） ---------- */
const VOICE = {
  watch: { key: 'ed_tut_watch', text: '看！小医生看病啦' },
  turn:  { key: 'ed_tut_turn',  text: '你来看一看' },
  hint:  { key: 'ed_hint',      text: '再检查检查，哪里不对劲' },
  right: { key: 'ed_right',     text: '治好啦，真棒' },
  wrong: { key: 'ed_wrong',     text: '再想一想' },
  spot:  { key: 'ed_spot',      text: '找到啦，就是这里' }
};
/* 步3 归因三选（非惩罚：任何选择都过）+对应药方 clip（0/1/2 与 verify 对账） */
const RX = [
  { key: 'ed_rx_careful', text: '下次看得再仔细一点', label: '没看清' },
  { key: 'ed_rx_calc',    text: '再算一遍检查一下',   label: '算错啦' },
  { key: 'ed_rx_slow',    text: '慢一点点，不着急',   label: '点太快' }
];
const PHASE_TEXT = {
  spot: '哪里不对劲？点一点',
  fix:  '开对药，治好它',
  why:  '当时为什么错呀'
};

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕；无 <text> 防尺寸漂移） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 医药十字 + 小胶布绷带（小医生主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="18.5" y="9" width="7" height="26" rx="2.4" fill="#D98A6A"/>' +
    '<rect x="9" y="18.5" width="26" height="7" rx="2.4" fill="#D98A6A"/>' +
    '<rect x="26" y="27" width="13" height="7" rx="2.6" fill="#FDEBD2" stroke="' + INK + '" stroke-width="1.8" transform="rotate(-18 32 30)"/></svg>',
  /* 归因三选图标：眼睛=没看清 / 三格算式=算错啦 / 手指=点太快 */
  eye: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 32 Q32 12 56 32 Q32 52 8 32 Z" fill="#FDEBD2" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="32" r="8.5" fill="#6B8CB8"/><circle cx="29" cy="29" r="2.6" fill="#FFF"/></svg>',
  calc: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="10" y="10" width="44" height="44" rx="8" fill="#FDEBD2" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="17" y="17" width="12" height="9" rx="2" fill="#8FBF7F"/><rect x="35" y="17" width="12" height="9" rx="2" fill="#F5C489"/>' +
    '<rect x="17" y="31" width="12" height="9" rx="2" fill="#F5C489"/><rect x="35" y="31" width="12" height="9" rx="2" fill="#8FBF7F"/>' +
    '<rect x="17" y="45" width="30" height="6" rx="3" fill="#E8975A"/></svg>',
  tap: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M28 10 a8 8 0 0 1 16 0 v22 l6 3 a9 9 0 0 1 5 8 v6 a10 10 0 0 1 -10 10 h-8 a13 13 0 0 1 -13 -13 V32 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="34" cy="26" r="4" fill="#F2B8C6"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
