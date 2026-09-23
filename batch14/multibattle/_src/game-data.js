/* ================= multibattle 游戏数据（章配置 / 语音文案与拼接单元 / 赛道兔与图标 SVG）
   题面语音=queue 拼接（SPEC §0.23）：数词 clip mul_n_2..9 + 短语 clip
   题面 4 段 = mul_n_a + mul_q1'乘' + mul_n_b + mul_q2'等于多少呀'
   开场/教学交接链 5 段 = mul_hint（或 mul_tut_turn）+ 题面 4 段（单通道 queue，禁叠音）
   对手钟真实时长 FOE_MS（§2）：ch1=8000 / ch2=7000 / ch3=6000 / ch4=5000 ms
   （verify 页统一乘 SPEED 提速，对齐家族 wait() 口径） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   KEYS[n]=第 n 难度章口诀键因数（照 times 同域分解）；hint=章末预告（GEN 不带"明天："前缀） ---------- */
const KEYS = { 1: [2, 3], 2: [4, 5], 3: [6, 7], 4: [8, 9] };
const CHAPTERS = {
  1: { name: '起跑（×2 ×3）', hint: '×4 ×5 的兔子来啦' },
  2: { name: '提速（×4 ×5）', hint: '×6 ×7 对手跑得更快' },
  3: { name: '冲刺（×6 ×7）', hint: '×8 ×9 终极对决' },
  4: { name: '终极对决（×8 ×9 · 混合）', hint: '新一轮乘法赛跑' }
};
const GEN_HINTS = ['×2 ×3 再跑一次', '×4 ×5 提速赛', '×6 ×7 冲刺赛', '×8 ×9 终极对决'];
const CH_LEN = 5;          // 5 题 = 1 关（每题答对进 1 格，先到多者胜）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
/* 对手答题钟（真实 ms；SPEC §2）：孩子须在钟走完前抢答，否则对手进 1 格
   试玩 P1-4（+审查产品性观察双建议）：原 6s/5s 按熟练者标定，7.5 岁生疏口诀（6.1-9.7s）
   15 题仅抢到 1 题；钟长按口诀难度分段——ch1/2 因数 2-5 熟（8s/7s），ch3/4 因数 6-9
   生疏（7s/6.5s，ch3 与 ch2 持平非章号单调） */
const FOE_MS = { 1: 8000, 2: 7000, 3: 7000, 4: 6500 };
/* 关末胜负线：孩子 ≥3 格（满分 5 过半）= 胜利庆祝；否则鼓励收尾（不锁关不惩罚，§2） */
const WIN_LINE = 3;
const AGAIN_TEXT = '就差一点点，再来一局';   // 鼓励收尾文案（SPEC §2 定稿）

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/manifest.json 严格一致 §0.18） ---------- */
const VOICE = {
  watch: { key: 'mul_tut_watch', text: '看！和兔子比一比' },
  turn:  { key: 'mul_tut_turn',  text: '你来抢答' },
  hint:  { key: 'mul_hint',      text: '算一算，几个几' },
  q1:    { key: 'mul_q1',        text: '乘' },
  q2:    { key: 'mul_q2',        text: '等于多少呀' },
  win:   { key: 'mul_win',       text: '答对啦，冲呀' },                       /* 己方进格播报 */
  lose:  { key: 'mul_lose',      text: '兔子先答完啦，下一题追上它' },          /* 对手进格播报 */
  wrong: { key: 'mul_wrong',     text: '再想一想，算一算' }  /* 答错 clip 化（§0.24） */
};

/* ---------- 中文数词 2-9（题面 queue 拼接用，clip mul_n_2..9 全在场） ---------- */
const NUM_CN = { 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九' };
const numCn = n => NUM_CN[n] || String(n);
const nKey = n => 'mul_n_' + n;                       /* 数词 clip key */

/* ---------- 题面读音单元序列（与题面文字一一对应；queue 段间自动 0.15s 停顿） ---------- */
function quizParts(q) {
  return [
    { key: nKey(q.a), text: numCn(q.a) },
    { key: VOICE.q1.key, text: VOICE.q1.text },
    { key: nKey(q.b), text: numCn(q.b) },
    { key: VOICE.q2.key, text: VOICE.q2.text }
  ];
}
const qSpeech = q => numCn(q.a) + VOICE.q1.text + numCn(q.b) + VOICE.q2.text;   /* TTS 兜底与 quizParts 同构 */

/* ---------- 对手兔子（灰蓝简笔，与孩子白兔视觉区分；跑道小尺寸高对比） ---------- */
function foeSvg(size) {
  return '<svg viewBox="0 0 120 120" width="' + size + '" height="' + size + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="60" cy="97" rx="25" ry="11" fill="#D8CDBB"/>' +
    '<ellipse cx="46" cy="27" rx="10" ry="26" fill="#B7C2CE" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-9 46 27)"/>' +
    '<ellipse cx="46" cy="29" rx="4.5" ry="16" fill="#8FA2B5" transform="rotate(-9 46 29)"/>' +
    '<ellipse cx="75" cy="25" rx="10" ry="27" fill="#B7C2CE" stroke="' + INK + '" stroke-width="2.5" transform="rotate(13 75 25)"/>' +
    '<ellipse cx="75" cy="27" rx="4.5" ry="17" fill="#8FA2B5" transform="rotate(13 75 27)"/>' +
    '<circle cx="60" cy="66" r="27" fill="#C7D2DD" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="50" cy="62" r="4.2" fill="' + INK + '"/><circle cx="71" cy="62" r="4.2" fill="' + INK + '"/>' +
    '<circle cx="51.5" cy="60.5" r="1.4" fill="#FFF"/><circle cx="72.5" cy="60.5" r="1.4" fill="#FFF"/>' +
    '<path d="M56 74 q2 3 4 0 q2 3 4 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="42" cy="72" rx="4.5" ry="3" fill="#E8B7C0" opacity=".55"/>' +
    '<ellipse cx="79" cy="72" rx="4.5" ry="3" fill="#E8B7C0" opacity=".55"/></svg>';
}
/* 对手迷你头像（答题钟标签用） */
const foeFace = '<svg viewBox="0 0 120 120" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<ellipse cx="46" cy="30" rx="10" ry="24" fill="#B7C2CE" stroke="' + INK + '" stroke-width="3" transform="rotate(-9 46 30)"/>' +
  '<ellipse cx="75" cy="28" rx="10" ry="25" fill="#B7C2CE" stroke="' + INK + '" stroke-width="3" transform="rotate(13 75 28)"/>' +
  '<circle cx="60" cy="68" r="26" fill="#C7D2DD" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="51" cy="64" r="4" fill="' + INK + '"/><circle cx="70" cy="64" r="4" fill="' + INK + '"/>' +
  '<path d="M56 76 q2 3 4 0 q2 3 4 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>';

/* ---------- 终点旗（赛道右端） ---------- */
const FLAG = '<svg viewBox="0 0 64 84" width="34" height="46" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<path d="M14 8 V78" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
  '<path d="M17 10 Q34 4 50 12 L48 30 Q33 23 17 28 Z" fill="#E8735A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
  '<path d="M6 80 H26" stroke="' + INK + '" stroke-width="4.5" stroke-linecap="round"/></svg>';

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="14" width="36" height="18" rx="9" fill="#E8975A" stroke="#FFF" stroke-width="2.4"/>' +
    '<path d="M12 23 h7 M14 20 v6 M24 21.5 v3 M29 21.5 v3" stroke="#FFF" stroke-width="2.8" stroke-linecap="round"/>' +
    '<text x="36" y="15" font-size="14" font-weight="800" fill="#FFF" text-anchor="middle" font-family="sans-serif">×</text></svg>',
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
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
