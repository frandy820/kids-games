/* ================= mirror 对称画 游戏数据（图案库 10 种 / 章配置 / 语音文案 / 图标）
   图案库（SPEC-BATCH9 §2）：对称 5 种（星/花/爱心/圆/方——镜像不变，建立"等距镜像"概念）+
   不对称 5 种（小旗/小鱼/月牙/靴子/扫帚——镜像=左右/上下翻转，章 2+ 原形干扰是镜像训练灵魂）。
   SVG 铁律：viewBox 0 0 100 100、主色由 C 参数注入（章 3 多色双维干扰）、统一暖棕描边；
   镜像形不重绘路径——外层 <g transform="translate(100 0) scale(-1 1)"> 翻转变体（SPEC 坑清单） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 图案表：sym=左右对称（章 1）/ 不对称（章 2+ 镜像方向训练）
   draw(C) 返回图案内部 SVG 串（不含 <svg> 壳；主色=C） ---------- */
const MOTIFS = {
  /* ---- 对称 5 种（章 1：dst 贴同图案，认"镜子两边一样远"） ---- */
  star: { zh: '星星', sym: true, draw(C) {
    return '<polygon points="50,16 59,41 85,41 64,57 71,83 50,67 29,83 36,57 15,41 41,41" fill="' + C + '" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<circle cx="43" cy="49" r="2.8" fill="' + INK + '"/><circle cx="57" cy="49" r="2.8" fill="' + INK + '"/>' +
      '<path d="M45 57 q5 5 10 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
  } },
  flower: { zh: '花', sym: true, draw(C) {
    return '<ellipse cx="50" cy="28" rx="12" ry="15" fill="' + C + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="50" cy="72" rx="12" ry="15" fill="' + C + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="28" cy="50" rx="15" ry="12" fill="' + C + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="72" cy="50" rx="15" ry="12" fill="' + C + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="50" cy="50" r="10.5" fill="#F7D24E" stroke="' + INK + '" stroke-width="3"/>';
  } },
  heart: { zh: '爱心', sym: true, draw(C) {
    return '<path d="M50 84 Q16 60 16 40 Q16 20 34 20 Q45 20 50 30 Q55 20 66 20 Q84 20 84 40 Q84 60 50 84 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="M32 32 q-5 5 -4 12" stroke="#FFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>';
  } },
  circle: { zh: '圆', sym: true, draw(C) {
    return '<circle cx="50" cy="50" r="32" fill="' + C + '" stroke="' + INK + '" stroke-width="3.2"/>' +
      '<circle cx="40" cy="40" r="7" fill="#FFF" opacity=".55"/>';
  } },
  square: { zh: '方', sym: true, draw(C) {
    return '<rect x="22" y="22" width="56" height="56" rx="9" fill="' + C + '" stroke="' + INK + '" stroke-width="3.2"/>' +
      '<rect x="31" y="31" width="17" height="17" rx="4" fill="#FFF" opacity=".5"/>';
  } },
  /* ---- 不对称 5 种（章 2+：镜像形=翻转，与原形区分是训练本体） ---- */
  flag: { zh: '小旗', sym: false, draw(C) {
    return '<path d="M30 14 V88" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M33 18 L82 30 L33 44 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<ellipse cx="30" cy="90" rx="12" ry="5" fill="#EFE3CD" stroke="' + INK + '" stroke-width="2.4"/>';
  } },
  fish: { zh: '小鱼', sym: false, draw(C) {
    return '<path d="M34 50 L10 32 Q18 50 10 68 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<ellipse cx="58" cy="50" rx="27" ry="19" fill="' + C + '" stroke="' + INK + '" stroke-width="3.2"/>' +
      '<path d="M64 36 q-4 14 0 28" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="73" cy="45" r="4.6" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
      '<circle cx="74.4" cy="45" r="2.2" fill="' + INK + '"/>' +
      '<circle cx="90" cy="27" r="3.6" stroke="#8FC3DE" stroke-width="2.2" fill="none"/>';
  } },
  crescent: { zh: '月牙', sym: false, draw(C) {
    return '<path d="M72 10 Q30 26 30 52 Q30 78 72 94 Q46 76 46 52 Q46 28 72 10 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<path d="M78 74 l2.6 6.8 6.8 2.6 -6.8 2.6 -2.6 6.8 -2.6 -6.8 -6.8 -2.6 6.8 -2.6 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>';
  } },
  boot: { zh: '靴子', sym: false, draw(C) {
    return '<path d="M34 12 H58 V52 Q58 58 64 60 L82 66 Q90 69 90 76 V84 Q90 90 84 90 H40 Q34 90 34 84 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
      '<rect x="34" y="80" width="56" height="10" rx="4" fill="#8A6B4F" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<path d="M42 24 h8 M42 34 h8" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>';
  } },
  broom: { zh: '扫帚', sym: false, draw(C) {
    return '<path d="M76 10 L42 52" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M46 48 L18 64 Q12 76 22 88 L40 78 L34 92 L48 82 L52 92 L58 78 L70 70 Q64 56 46 48 Z" fill="' + C + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M40 62 L28 84 M50 58 L42 84" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>';
  } }
};
const SYM_KEYS = ['star', 'flower', 'heart', 'circle', 'square'];
const ASYM_KEYS = ['flag', 'fish', 'crescent', 'boot', 'broom'];
const MOTIF_KEYS = SYM_KEYS.concat(ASYM_KEYS);

/* 章配色盘（章 3 起图案×颜色双维干扰；章 1/2 也用色增趣——干扰在形不在色） */
const PALETTE = ['#E8543F', '#F5C445', '#4E9BDD', '#8FBF7F', '#A572D4'];

/* ---------- 图案渲染：flip=null 原形 / 'h' 左右翻（竖轴镜）/ 'v' 上下翻（横轴镜）
   翻转用 transform 属性包裹，不重绘路径（SPEC 坑清单） ---------- */
function motifSvg(mid, color, flip) {
  const m = MOTIFS[mid];
  if (!m) return '';
  const inner = m.draw(color || PALETTE[0]);
  const g = flip === 'h' ? '<g transform="translate(100 0) scale(-1 1)">' :
             flip === 'v' ? '<g transform="translate(0 100) scale(1 -1)">' : '';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    g + inner + (g ? '</g>' : '') + '</svg>';
}
/* quiz.axis → 镜像形的翻转方向（竖轴镜=左右翻 / 横轴镜=上下翻） */
const flipOf = (q, mirrored) => !mirrored ? null : (q.axis === 'v' ? 'h' : 'v');

/* ---------- 章配置（hint=预告"下一章"文案；GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '镜子贴一贴', hint: '接下来镜子里的图画会左右反过来，要看仔细哦' },
  2: { name: '反过来的图画', hint: '接下来会混进没有翻过来的图案，镜子里的才是对的哦，先看方向再贴' },   /* 试玩 P1④：原形干扰首次出现=概念断层，章末预告承载辨方向提示 */
  3: { name: '彩色镜子', hint: '接下来镜子要横过来，上下照镜子啦' },
  4: { name: '横镜子竖镜子', hint: '新一轮对称画挑战' }
};
const GEN_HINTS = ['镜子贴画的新一轮', '左右反过来的新一轮', '五颜六色图案的新一轮', '横镜子竖镜子混合的新一轮'];
const CH_LEN = 5;          // 5 题 = 1 关（每关 5 个镜像格）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key+text 与 voice/clips/manifest.json 严格一致，禁自抄；
   wrong 无 clip→动态文案 TTS 兜底（§0.13） ---------- */
const VOICE = {
  watch: { key: 'mir_tut_watch', text: '看！镜子里的图画' },
  turn:  { key: 'mir_tut_turn',  text: '你来贴一贴' },
  hint:  { key: 'mir_hint',      text: '想一想，镜子里是什么样子' },
  qv:    { key: 'mir_q_v', text: '镜子右边该贴哪一张呀' },   /* 竖轴镜（左右镜像） */
  qh:    { key: 'mir_q_h', text: '镜子下面该贴哪一张呀' },   /* 横轴镜（上下镜像） */
  wrong: { key: 'mir_wrong', text: '不对哦，想一想镜子里的样子' }   /* 动态纠错 TTS 兜底 */
};
const qClip = q => q.axis === 'v' ? VOICE.qv : VOICE.qh;   /* 题面指令 clip 按轴取 */

/* ---------- 图标（内嵌 SVG，暖棕描线） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="6" y="8" width="32" height="28" rx="7" fill="#DCEAF4" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M22 14 v16 M15 21 h14" stroke="#E8975A" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M11 33 L33 11" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
    '</svg>',
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
