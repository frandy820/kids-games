/* ================= numberdet 游戏数据（章配置 / 语音文案与拼接单元 / 图标与宝箱 SVG）
   题面语音=queue 拼接（SPEC §0.23）：num_q1'神秘数藏在1到'+num_n_N+num_q2'之间'（3 段，审查 m5 补'1到'）
   数词 clip 仅 5 条（num_n_10/20/30/50/99——各章 N 固定，§25 自建副本禁跨游戏复用）
   §0.24 显式豁免：无 VOICE.wrong——每猜必有 big/small 信息反馈，无错点语义，不建 num_wrong clip
   反馈=big/small/got/gone 四条 clip 全在场（§0.23 正常游玩零 TTS） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   ch1 1-20 base5 / ch2 1-30 base5 / ch3 1-50 base6 / ch4 1-99 base7
   hint=章末预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '小侦探', hint: '更大的范围来猜一猜' },
  2: { name: '三十内', hint: '五十以内藏宝箱' },
  3: { name: '五十内', hint: '最大的九十九来啦' },
  4: { name: '九十九', hint: '新一轮神秘数挑战' }
};
const GEN_HINTS = ['新的神秘数挑战', '更大范围猜一猜', '五十以内找一找', '九十九里大搜索'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/manifest.json 严格一致 §0.18）
   共 14 条：9 短句 + 5 数词（manifest num_* 全集） ---------- */
const VOICE = {
  watch: { key: 'num_tut_watch', text: '看！猜一猜神秘数' },
  turn:  { key: 'num_tut_turn',  text: '你来当侦探' },
  hint:  { key: 'num_hint',      text: '试一试中间的数' },
  q1:    { key: 'num_q1',        text: '神秘数藏在1到' },
  q2:    { key: 'num_q2',        text: '之间' },
  big:   { key: 'num_big',       text: '太大啦' },
  small: { key: 'num_small',     text: '太小啦' },
  got:   { key: 'num_got',       text: '猜中啦' },
  gone:  { key: 'num_gone',      text: '这个数已经排除啦' }
  /* §0.24 显式豁免：不设 VOICE.wrong、不建 num_wrong clip（verify 有豁免说明断言） */
};

/* ---------- 各章范围 N 的中文数词（题面拼接用，clip num_n_{10,20,30,50,99} 全在场） ---------- */
const NUM_CN = { 10: '十', 20: '二十', 30: '三十', 50: '五十', 99: '九十九' };
const numCn = n => NUM_CN[n] || String(n);
const nKey = n => 'num_n_' + n;

/* ---------- 题面读音单元序列（与题面文字一一对应；queue 段间自动 0.15s 停顿） ---------- */
function quizParts(q) {
  return [
    { key: VOICE.q1.key, text: VOICE.q1.text },
    { key: nKey(q.N), text: numCn(q.N) },
    { key: VOICE.q2.key, text: VOICE.q2.text }
  ];
}
const qSpeech = q => VOICE.q1.text + numCn(q.N) + VOICE.q2.text;   /* TTS 兜底与 quizParts 同构 */

/* ---------- 宝箱（题面装饰：闭合待开；猜中换开启+金光，数字由 DOM 覆盖防 SVG 文字漂移 §0.15） ---------- */
const CHEST_W = 54;
function chestSvg(open) {
  if (open) {
    return '<svg viewBox="0 0 64 60" width="' + CHEST_W + '" height="' + (CHEST_W * 60 / 64) + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
      '<ellipse cx="32" cy="52" rx="24" ry="5" fill="#E2B13C" opacity=".45"/>' +
      '<path d="M8 30 Q32 6 56 30 L56 26 Q32 2 8 26 Z" fill="#C77A42" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<rect x="8" y="28" width="48" height="22" rx="5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<rect x="12" y="32" width="40" height="13" rx="3" fill="#FDEBD2"/>' +
      '<circle cx="32" cy="38" r="6.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M20 12 q3 -5 8 -4 M40 9 q4 -2 7 2" stroke="#F5C445" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="18" cy="7" r="1.8" fill="#F5C445"/><circle cx="48" cy="5" r="1.6" fill="#F5C445"/>' +
      '<circle cx="32" cy="4" r="2.2" fill="#F5C445"/></svg>';
  }
  return '<svg viewBox="0 0 64 60" width="' + CHEST_W + '" height="' + (CHEST_W * 60 / 64) + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="32" cy="54" rx="25" ry="4.5" fill="#D8C9B4" opacity=".6"/>' +
    '<path d="M8 34 L8 26 Q8 12 32 12 Q56 12 56 26 L56 34 Z" fill="#C77A42" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<rect x="8" y="33" width="48" height="17" rx="4" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M14 33 v17 M50 33 v17" stroke="' + INK + '" stroke-width="1.8" opacity=".5"/>' +
    '<rect x="27" y="28" width="10" height="12" rx="2.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="32" cy="34" r="1.8" fill="' + INK + '"/>' +
    '<path d="M16 20 Q32 10 48 20" stroke="#FFF" stroke-width="2.4" opacity=".45" fill="none" stroke-linecap="round"/>' +
      '<text x="46" y="10" font-size="11" font-weight="800" fill="#8A7B6C" font-family="sans-serif">?</text></svg>';
}

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="19" cy="19" r="11" fill="#B7D3EA" stroke="#FFF" stroke-width="2.6"/>' +
    '<circle cx="19" cy="19" r="6.5" fill="none" stroke="#8FB4DE" stroke-width="1.8"/>' +
    '<path d="M27.5 27.5 L38 38" stroke="#E8975A" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M14 16 q2 -3 5 -2" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  del: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M12 14 h30 a6 6 0 0 1 6 6 v24 a6 6 0 0 1 -6 6 h-30 Z" fill="#EFE3CD" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round" transform="rotate(-8 32 32)"/>' +
    '<path d="M22 24 L40 40 M40 24 L22 40" stroke="#B0785A" stroke-width="4.5" stroke-linecap="round" transform="rotate(-8 32 32)"/>' +
    '<path d="M10 50 q-4 -8 0 -16" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".55"/></svg>',
  hand: '<svg viewBox="0 0 34 34" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 20 Q6 12 12 8 Q18 4 24 8 Q29 12 27 19 Q26 24 20 26 L13 26 Q9 25 8 20 Z" fill="#F0A868" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M14 15 q2 -3 5 -1" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></svg>'
};
