/* ================= divide 游戏数据（章配置 / 语音文案与拼接单元 / 图标 / 糖果与盘子 SVG）
   题面语音=queue 拼接（times 模式，SPEC §0.23）：数词 clip div_n_2..12 + 短语 clip
   div_q1'颗糖，平均分给' / div_q2'个小朋友' / div_q3'每人几颗呀'；余数句 div_rem1/rem2 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材，进度章号单调递增）
   ch1 无余数小量（6/8/10÷2/3/4 整除）/ ch2 无余数大量（9-12÷3/4，含 12÷4=3）
   ch3 有余数（余 1-2，剩糖留桌上）/ ch4 除法算式直给（黑板 N÷M=？，全域混合复习）
   hint=章末"明天"预告文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '分一分',     hint: '更大的糖堆来分一分' },
  2: { name: '大糖堆',     hint: '分不完的糖果，认识余数' },
  3: { name: '有余数',     hint: '除法算式小黑板来啦' },
  4: { name: '算式黑板',   hint: '新一轮分糖挑战' }
};
const GEN_HINTS = ['小糖堆再分一次', '大糖堆分一分', '有余数的分糖', '算式黑板挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/manifest.json 严格一致 §0.18）
   仅前 3 关播 sayP；救援/开场/余数句/教学走 sayR；错答轻语音 sayW(null, TTS 兜底) ---------- */
const VOICE = {
  watch: { key: 'div_tut_watch', text: '看！糖果分一分' },
  turn:  { key: 'div_tut_turn',  text: '你来分一分' },
  hint:  { key: 'div_hint',      text: '一人一颗轮着分' },
  q1:    { key: 'div_q1',        text: '颗糖，平均分给' },
  q2:    { key: 'div_q2',        text: '个小朋友' },
  q3:    { key: 'div_q3',        text: '每人几颗呀' },
  rem1:  { key: 'div_rem1',      text: '剩下一颗不够分啦' },
  rem2:  { key: 'div_rem2',      text: '剩下两颗不够分啦' },
  wrong: { key: 'div_wrong',     text: '再想一想，数一数盘子里的糖' }  /* 错答 clip 化（审查 m5：高频路径禁系统 TTS 音色跳变） */
};

/* ---------- 中文数词 2-12（题面 queue 拼接用，clip div_n_2..12 全在场） ---------- */
const NUM_CN = { 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八',
  9: '九', 10: '十', 11: '十一', 12: '十二' };
const numCn = n => NUM_CN[n] || String(n);

/* 题面读音单元序列（与题面文字一一对应；queue 段间自动 0.15s 停顿） */
function quizParts(q) {
  return [
    { key: 'div_n_' + q.n, text: numCn(q.n) },
    { key: VOICE.q1.key, text: VOICE.q1.text },
    { key: 'div_n_' + q.m, text: numCn(q.m) },
    { key: VOICE.q2.key, text: VOICE.q2.text },
    { key: VOICE.q3.key, text: VOICE.q3.text }
  ];
}
const qSpeech = q => numCn(q.n) + VOICE.q1.text + numCn(q.m) + VOICE.q2.text + '，' + VOICE.q3.text;
/* 余数句读音单元（rem∈{1,2}；SPEC §1："剩下 X 颗不够分啦"） */
const remPart = q => q.rem === 1 ? { key: VOICE.rem1.key, text: VOICE.rem1.text }
                                 : { key: VOICE.rem2.key, text: VOICE.rem2.text };

/* ---------- 糖果（暖色 4 档；i=色档，w=宽 px；两侧包装结+糖体+高光）
   先于 ICONS 定义（ICONS.candyMini 初始化即调用 candySvg，const 函数表达式会踩 TDZ） ---------- */
const CANDY_PAL = [
  { body: '#F0A868', wrap: '#F6C893' },
  { body: '#F2B8C6', wrap: '#F8D5DC' },
  { body: '#9CC98D', wrap: '#BCDDB0' },
  { body: '#A3B7C7', wrap: '#C4D2DD' }
];
function candySvg(i, w) {
  const c = CANDY_PAL[((i % 4) + 4) % 4], h = w;
  return '<svg viewBox="0 0 64 64" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M12 32 L2 24 L6 33 L2 42 Z" fill="' + c.wrap + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M52 32 L62 24 L58 33 L62 42 Z" fill="' + c.wrap + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<ellipse cx="32" cy="32" rx="20" ry="17" fill="' + c.body + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M18 25 Q24 16 34 18" stroke="#FFF" stroke-width="3.4" opacity=".55" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="41" cy="38" rx="3.6" ry="2.6" fill="#FFF" opacity=".5"/></svg>';
}

/* ---------- 图标（全部内嵌 SVG，描边 2.5px 暖棕） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M9 22 L2 16 L5 24 Z" fill="#F6C893" stroke="#FFF" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M35 22 L42 16 L39 24 Z" fill="#F6C893" stroke="#FFF" stroke-width="2" stroke-linejoin="round"/>' +
    '<ellipse cx="22" cy="22" rx="14" ry="12" fill="#F0A868" stroke="#FFF" stroke-width="2"/>' +
    '<path d="M14 18 Q18 13 25 15" stroke="#FFF" stroke-width="2.6" opacity=".6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="27" cy="25" r="2" fill="#FFF" opacity=".7"/></svg>',
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
  /* 题面 chip 用小糖/小盘图标 */
  candyMini: '<svg class="cm" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    candySvg(0, 48).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '') + '</svg>',
  plateMini: '<svg class="cm" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="24" cy="30" rx="19" ry="9" fill="#FFF6E8" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<ellipse cx="24" cy="28" rx="12" ry="5" fill="#F2E4CB" opacity=".8"/>' +
    '<circle cx="24" cy="17" r="8" fill="#F2B8C6" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<circle cx="21" cy="16" r="1.4" fill="#4A3B2E"/><circle cx="27" cy="16" r="1.4" fill="#4A3B2E"/>' +
    '<path d="M22 19 q2 2 4 0" stroke="#4A3B2E" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 20 Q6 12 12 8 Q18 4 24 8 Q29 12 27 19 Q26 24 20 26 L13 26 Q9 25 8 20 Z" fill="#F0A868" stroke="#4A3B2E" stroke-width="2"/>' +
    '<path d="M14 15 q2 -3 5 -1" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></svg>'
};

/* ---------- 小动物盘子（4 种圆脸 + 椭圆盘；落点视觉锚点） ---------- */
const ANIMALS = ['cat', 'panda', 'bunny', 'pig'];
function faceSvg(kind) {
  const S = 'stroke="#4A3B2E" stroke-width="2.4"';
  if (kind === 'cat') return '<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M11 20 L9 6 L21 13 Z" fill="#F6D9A8" ' + S + ' stroke-linejoin="round"/>' +
    '<path d="M41 20 L43 6 L31 13 Z" fill="#F6D9A8" ' + S + ' stroke-linejoin="round"/>' +
    '<circle cx="26" cy="28" r="17" fill="#F6D9A8" ' + S + '/>' +
    '<circle cx="20" cy="26" r="2.2" fill="#4A3B2E"/><circle cx="32" cy="26" r="2.2" fill="#4A3B2E"/>' +
    '<path d="M24 32 q2 2 4 0" stroke="#4A3B2E" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M10 29 h6 M10 34 h6 M36 29 h6 M36 34 h6" stroke="#C9A87C" stroke-width="1.8" stroke-linecap="round"/></svg>';
  if (kind === 'panda') return '<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="12" cy="12" r="7" fill="#5B5148" ' + S + '/>' +
    '<circle cx="40" cy="12" r="7" fill="#5B5148" ' + S + '/>' +
    '<circle cx="26" cy="28" r="17" fill="#FFF9EE" ' + S + '/>' +
    '<ellipse cx="19" cy="25" rx="4.6" ry="5.6" fill="#5B5148" transform="rotate(-14 19 25)"/>' +
    '<ellipse cx="33" cy="25" rx="4.6" ry="5.6" fill="#5B5148" transform="rotate(14 33 25)"/>' +
    '<circle cx="20" cy="26" r="1.7" fill="#FFF"/><circle cx="32" cy="26" r="1.7" fill="#FFF"/>' +
    '<ellipse cx="26" cy="34" rx="3" ry="2.2" fill="#4A3B2E"/></svg>';
  if (kind === 'bunny') return '<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="18" cy="12" rx="5" ry="10" fill="#FBF7F0" ' + S + ' transform="rotate(-10 18 12)"/>' +
    '<ellipse cx="34" cy="12" rx="5" ry="10" fill="#FBF7F0" ' + S + ' transform="rotate(10 34 12)"/>' +
    '<circle cx="26" cy="32" r="16" fill="#FBF7F0" ' + S + '/>' +
    '<circle cx="20" cy="30" r="2.2" fill="#4A3B2E"/><circle cx="32" cy="30" r="2.2" fill="#4A3B2E"/>' +
    '<ellipse cx="26" cy="35" rx="2.4" ry="1.8" fill="#D98A8A"/>' +
    '<path d="M22 39 q4 3 8 0" stroke="#4A3B2E" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="14" cy="35" rx="3.6" ry="2.4" fill="#F2B8C6" opacity=".7"/><ellipse cx="38" cy="35" rx="3.6" ry="2.4" fill="#F2B8C6" opacity=".7"/></svg>';
  return '<svg viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M16 12 Q11 8 10 13 Q10 17 15 18 Z" fill="#F0A8B4" ' + S + ' stroke-linejoin="round"/>' +
    '<path d="M36 12 Q41 8 42 13 Q42 17 37 18 Z" fill="#F0A8B4" ' + S + ' stroke-linejoin="round"/>' +
    '<circle cx="26" cy="29" r="16" fill="#F7C8CE" ' + S + '/>' +
    '<circle cx="20" cy="26" r="2.2" fill="#4A3B2E"/><circle cx="32" cy="26" r="2.2" fill="#4A3B2E"/>' +
    '<ellipse cx="26" cy="33" rx="6" ry="4.4" fill="#EE9DAE" ' + S + '/>' +
    '<circle cx="23.6" cy="33" r="1.3" fill="#4A3B2E"/><circle cx="28.4" cy="33" r="1.3" fill="#4A3B2E"/></svg>';
}
/* 盘子（椭圆暖白盘 + 内圈；宽 w 高按比例） */
function dishSvg(w) {
  const h = Math.round(w * 64 / 124);
  return '<svg viewBox="0 0 124 64" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="62" cy="38" rx="59" ry="23" fill="#FFF6E8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="62" cy="35" rx="42" ry="14.5" fill="#F2E4CB" stroke="#D8C9B4" stroke-width="1.6"/>' +
    '<ellipse cx="62" cy="33" rx="24" ry="7.5" fill="#FBF3E2" opacity=".9"/></svg>';
}
