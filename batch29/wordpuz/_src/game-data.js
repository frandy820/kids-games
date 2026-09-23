/* ================= wordpuz 单词拼图 游戏数据（词封闭 20 / 章配置 / 语音文案 / 词插图 SVG）
   玩法：题面 = 目标词插图（SVG 简笔，一眼可辨）+ 中文提示徽章（cat=猫图+「猫」）；
   槽位行 = 词长个空格；下方字母卡乱序点选（ch3+ 池=词字母+1 干扰卡）。
   点下一个所需字母卡 = 填入槽位（'moved'，字母入格动画）→ 全部填满 = 词完成
   （'right'，拼播链 wpu_right+wpu_w_<word> 确认）→ 末题 'done'；
   点非所需字母 = wrong+miss+wig；已用卡再点 = 'false'+pop+bump（不记 miss）；
   重复字母点任一同字母未用卡均合法（多重集语义——同 coder 殊途同达）。
   池数学先验（SPEC-BATCH29 §0.72）：池多重集 = 目标词字母多重集 ±（ch3+）恰 1 张
   干扰卡（干扰字母 ∉ 目标词字母）——池恒可拼出目标（干扰多余可剩）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 词封闭 20（SPEC §0.72；3 字母 18 + 4 字母 2；egg 含重复字母=多重集范式；
   eye/arm/leg/hand 与 bodyen 词重叠=有意复习锚）
   zh=中文提示徽章（题面承载维度：图+中文双锚，孩子不需要识字也能对图） ---------- */
const WORDS = {
  cat: '猫', dog: '狗', sun: '太阳', hat: '帽子', bed: '小床',
  pen: '钢笔', ten: '十', map: '地图', cup: '杯子', car: '汽车',
  bus: '公交车', box: '盒子', fox: '狐狸', egg: '鸡蛋', ant: '蚂蚁',
  eye: '眼睛', arm: '胳膊', leg: '腿', hand: '手', star: '星星'
};
const WORD_KEYS = Object.keys(WORDS);                     // 封闭 20（verify 对账）
const W3 = WORD_KEYS.filter(w => w.length === 3);         // 3 字母池（18）
const W4 = WORD_KEYS.filter(w => w.length === 4);         // 4 字母池（2：hand/star）
/* 词表全字母并集（干扰字母取材域：学过的字母做干扰，教育上封闭） */
const ALPHA_UNION = Array.from(new Set(WORD_KEYS.join('').split(''))).sort();

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言） ---------- */
const CHAPTERS = {
  1: { name: '三个字母', hint: '四个字母的长单词来啦' },   // 预告 ch2 四字母
  2: { name: '四个字母', hint: '会有捣蛋字母混进来，看仔细' }, // 预告 ch3 干扰卡
  3: { name: '捣蛋字母', hint: '全部混在一起，大挑战来啦' }, // 预告 ch4 混合
  4: { name: '大挑战', hint: '新一轮拼单词开始啦' }        // 预告生成关
};
const GEN_HINTS = ['三个字母，看仔细再拼',        // dch1 三字母
                   '四个字母，想好顺序再点',      // dch2 四字母
                   '有捣蛋字母，别点到它',       // dch3 恒 1 干扰
                   '大集合，一个一个字母拼'];   // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   六包装 watch/turn/hint/right/wrong/q；判对确认=wpu_right+词音拼播链（SPEC §4）
   clip 实长（SPEC-BATCH29 §4 量化）：watch 3048/turn 1824/hint 1896/
   right 2496（判对链窗 ≥4554）/wrong 2256/q 2136；词音 wpu_w_* max 1608 */
const VOICE = {
  watch: { key: 'wpu_tut_watch', text: '看！拼出小单词' },
  turn:  { key: 'wpu_tut_turn',  text: '你来拼一拼' },
  hint:  { key: 'wpu_hint',      text: '看图想一想' },
  right: { key: 'wpu_right',     text: '拼对啦，真聪明' },
  wrong: { key: 'wpu_wrong',     text: '看看图画想一想' },
  q:     { key: 'wpu_q',         text: '看图拼单词' }
};
/* 词音 key（en-US-AnaNeural 女童声，clip 在场才播——禁 TTS 兜底拼英语，§0.32 铁律） */
const wordKey = w => 'wpu_w_' + w;

/* ---------- 句式（题面句 / 错反馈引导句 / 教学 demo 机制句）
   题面句=clip wpu_q + 词音 queue 拼播；引导句=TTS 拼句（10 字符含逗号——
   estMs 全字符口径 build 静态断言）；demo 机制句 9 字符 ---------- */
const quizText = () => '看图拼单词';
const GUIDE = { wrong: '看看图画，想想怎么拼' };   // SPEC §0.72 错反馈语义句
const DEMO_SAY = '点字母，放进格子里';            // 教学演示机制句（9 字符）

/* ---------- 词插图（20 幅简笔 SVG，viewBox 0 0 100 100，INK 描边+柔和填色；
   承载题面真值维度：去掉图孩子无法作答——图=内容非装饰） ---------- */
const PIC = {
  cat: '<ellipse cx="50" cy="88" rx="26" ry="6" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M26 40 L20 16 L40 30 Z" fill="#F2B880" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M74 40 L80 16 L60 30 Z" fill="#F2B880" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M24 44 L44 30 M76 44 L56 30" stroke="#E8935C" stroke-width="3" fill="none"/>' +
    '<circle cx="50" cy="56" r="32" fill="#F8D9A8" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M12 52 h14 M12 62 h14 M88 52 h-14 M88 62 h-14" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="38" cy="52" r="4" fill="' + INK + '"/><circle cx="62" cy="52" r="4" fill="' + INK + '"/>' +
    '<path d="M46 64 q4 4 8 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 60 l-4 4 h8 Z" fill="#E38BA0"/>' +
    '<path d="M18 24 q6 6 4 14 M82 24 q-6 6 -4 14" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  dog: '<ellipse cx="50" cy="88" rx="27" ry="6" fill="' + INK + '" opacity=".12"/>' +
    '<ellipse cx="22" cy="52" rx="11" ry="22" fill="#B98A5A" stroke="' + INK + '" stroke-width="4" transform="rotate(-14 22 52)"/>' +
    '<ellipse cx="78" cy="52" rx="11" ry="22" fill="#B98A5A" stroke="' + INK + '" stroke-width="4" transform="rotate(14 78 52)"/>' +
    '<circle cx="50" cy="52" r="30" fill="#D9A96F" stroke="' + INK + '" stroke-width="4"/>' +
    '<ellipse cx="50" cy="66" rx="16" ry="12" fill="#F6E7CC" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="38" cy="46" r="4.5" fill="' + INK + '"/><circle cx="62" cy="46" r="4.5" fill="' + INK + '"/>' +
    '<ellipse cx="50" cy="62" rx="6" ry="4.5" fill="' + INK + '"/>' +
    '<path d="M50 66 q0 6 -7 7 M50 66 q0 6 7 7" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M44 76 q6 4 12 0" stroke="' + INK + '" stroke-width="3" fill="#E38BA0"/>',
  sun: '<circle cx="50" cy="50" r="24" fill="#F8CB4A" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M42 44 q4 -5 8 0 M54 44 q4 -5 8 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M42 56 q8 7 16 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 8 v10 M50 82 v10 M8 50 h10 M82 50 h10 M20 20 l7 7 M73 73 l7 7 M80 20 l-7 7 M27 73 l-7 7" stroke="#E8975A" stroke-width="5" stroke-linecap="round"/>',
  hat: '<ellipse cx="50" cy="88" rx="30" ry="6" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M30 52 h40 v26 q0 6 -6 6 H36 q-6 0 -6 -6 Z" fill="#8FB0D9" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<ellipse cx="50" cy="84" rx="38" ry="9" fill="#7FA0CC" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M32 60 h36" stroke="' + INK + '" stroke-width="3" opacity=".5"/>' +
    '<path d="M28 54 q22 -8 44 0" stroke="' + INK + '" stroke-width="3" fill="none" opacity=".4"/>',
  bed: '<ellipse cx="50" cy="90" rx="36" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M16 40 v44" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M84 56 v28" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M16 66 h68" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M20 66 q0 -10 12 -10 h34 q10 0 10 10 Z" fill="#F2A9A0" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<rect x="20" y="64" width="24" height="12" rx="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M52 74 q16 -6 32 0 l-2 10 q-14 -5 -28 0 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>',
  pen: '<ellipse cx="50" cy="90" rx="26" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<g transform="rotate(24 50 50)">' +
    '<rect x="40" y="12" width="20" height="52" rx="4" fill="#4A7FB5" stroke="' + INK + '" stroke-width="4"/>' +
    '<rect x="40" y="24" width="20" height="7" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 64 h20 l-4 10 h-12 Z" fill="#9AA3AD" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M46 74 l4 12 4 -12 Z" fill="' + INK + '"/></g>',
  ten: '<rect x="18" y="20" width="64" height="60" rx="12" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
    '<rect x="24" y="26" width="52" height="48" rx="8" fill="#FBF6EC" stroke="#D8C9B4" stroke-width="2.5"/>' +
    '<text x="50" y="63" font-size="36" font-weight="bold" text-anchor="middle" fill="#E8975A" font-family="Arial">10</text>' +
    '<circle cx="30" cy="30" r="3" fill="#F5C445"/><circle cx="70" cy="30" r="3" fill="#F5C445"/>',
  map: '<path d="M18 30 L38 22 L62 30 L82 22 V70 L62 78 L38 70 L18 78 Z" fill="#F6E7CC" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M38 22 V70 M62 30 V78" stroke="' + INK + '" stroke-width="3" opacity=".45"/>' +
    '<path d="M26 62 Q40 40 48 52 Q58 66 72 40" stroke="#E86A5A" stroke-width="4" fill="none" stroke-linecap="round" stroke-dasharray="7 6"/>' +
    '<circle cx="26" cy="62" r="5" fill="#4A7FB5" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M67 33 l10 10 M77 33 l-10 10" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>',
  cup: '<ellipse cx="50" cy="88" rx="26" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M28 34 h44 l-5 44 q-1 8 -9 8 H42 q-8 0 -9 -8 Z" fill="#F2B880" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M72 44 q16 2 14 12 t-16 8" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
    '<ellipse cx="50" cy="34" rx="22" ry="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M40 20 q3 -5 0 -9 M52 22 q3 -5 0 -9" stroke="#8A9BAE" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  car: '<ellipse cx="50" cy="84" rx="36" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M14 62 q0 -8 8 -10 l10 -16 q3 -5 9 -5 h14 q6 0 9 5 l8 16 q10 2 10 10 v6 q0 4 -4 4 H18 q-4 0 -4 -4 Z" fill="#E86A5A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M36 36 h10 v12 H31 Z M50 36 h10 l6 12 H50 Z" fill="#BFE0EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="72" r="9" fill="' + INK + '"/><circle cx="30" cy="72" r="4" fill="#FFF9EE"/>' +
    '<circle cx="70" cy="72" r="9" fill="' + INK + '"/><circle cx="70" cy="72" r="4" fill="#FFF9EE"/>',
  bus: '<ellipse cx="50" cy="86" rx="38" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<rect x="12" y="28" width="76" height="44" rx="10" fill="#F8CB4A" stroke="' + INK + '" stroke-width="4"/>' +
    '<rect x="20" y="36" width="14" height="14" rx="3" fill="#BFE0EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="43" y="36" width="14" height="14" rx="3" fill="#BFE0EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="66" y="36" width="14" height="14" rx="3" fill="#BFE0EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M18 60 h64" stroke="' + INK + '" stroke-width="3" opacity=".4"/>' +
    '<circle cx="30" cy="72" r="9" fill="' + INK + '"/><circle cx="30" cy="72" r="4" fill="#FFF9EE"/>' +
    '<circle cx="70" cy="72" r="9" fill="' + INK + '"/><circle cx="70" cy="72" r="4" fill="#FFF9EE"/>',
  box: '<ellipse cx="50" cy="88" rx="30" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M22 40 L50 30 L78 40 V72 L50 82 L22 72 Z" fill="#E2C39A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M22 40 L50 50 L78 40 M50 50 V82" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linejoin="round"/>' +
    '<path d="M36 35 h28 M50 50 l0 0" stroke="#B98A5A" stroke-width="5" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M40 34 q10 8 20 0" stroke="#B98A5A" stroke-width="4" fill="none"/>',
  fox: '<ellipse cx="50" cy="88" rx="27" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M24 38 L18 14 L42 28 Z" fill="#E8823C" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M76 38 L82 14 L58 28 Z" fill="#E8823C" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M26 32 L24 22 L34 27 Z M74 32 L76 22 L66 27 Z" fill="' + INK + '" opacity=".55"/>' +
    '<path d="M50 26 Q76 26 78 54 Q78 76 50 82 Q22 76 22 54 Q24 26 50 26 Z" fill="#E8823C" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M50 54 Q60 54 62 64 Q62 74 50 78 Q38 74 38 64 Q40 54 50 54 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="38" cy="46" r="4" fill="' + INK + '"/><circle cx="62" cy="46" r="4" fill="' + INK + '"/>' +
    '<ellipse cx="50" cy="64" rx="5" ry="4" fill="' + INK + '"/>',
  egg: '<ellipse cx="50" cy="88" rx="32" ry="6" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M30 52 q0 -8 6 -13 q5 -4 8 -4 q4 0 8 4 q6 5 6 13 q0 18 -14 22 q-14 -4 -14 -22 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4" fill-rule="evenodd"/>' +
    '<path d="M34 34 q-16 12 -8 34" stroke="#F2B8C6" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M52 14 L58 30 L74 32 L62 44 L66 60 L52 52 L38 60 L42 44 L30 32 L46 30 Z" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" opacity=".92"/>',
  ant: '<ellipse cx="50" cy="88" rx="28" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<circle cx="66" cy="48" r="16" fill="#8A5A3B" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="42" cy="54" r="11" fill="#A06B45" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="24" cy="58" r="8" fill="#8A5A3B" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M60 34 q6 -12 16 -12 M72 38 q10 -8 18 -6" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="78" cy="21" r="3" fill="' + INK + '"/><circle cx="92" cy="31" r="3" fill="' + INK + '"/>' +
    '<circle cx="71" cy="45" r="3.5" fill="#FFF9EE"/><circle cx="63" cy="45" r="3.5" fill="#FFF9EE"/>' +
    '<path d="M50 60 l-12 16 M46 56 l-18 8 M60 62 l4 18 M70 62 l14 14 M74 54 l16 4" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>',
  eye: '<path d="M10 50 Q50 12 90 50 Q50 88 10 50 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="50" cy="50" r="20" fill="#6FA0C7" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="50" cy="50" r="9" fill="' + INK + '"/>' +
    '<circle cx="44" cy="43" r="4" fill="#FFF"/><circle cx="55" cy="55" r="2.5" fill="#FFF" opacity=".8"/>' +
    '<path d="M22 32 l-4 -8 M34 24 l-2 -9 M66 24 l2 -9 M78 32 l4 -8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  arm: '<ellipse cx="50" cy="90" rx="28" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M22 76 Q18 44 36 28 Q46 20 52 30 Q56 38 48 44 Q38 52 40 68 Q41 78 34 78 Z" fill="#F8D9A8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="34" r="10" fill="#F8D9A8" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M44 40 q8 4 10 12 M38 58 q8 2 12 8" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".4"/>' +
    '<path d="M60 24 q14 -6 22 4 q6 8 -2 14 q-6 4 -12 0" fill="#F8D9A8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M64 26 l-2 -8 M72 26 l2 -8 M79 30 l6 -5" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>',
  leg: '<ellipse cx="50" cy="90" rx="28" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M34 14 Q46 16 46 30 L44 58 Q44 66 40 70 L58 70 Q54 62 54 56 L54 28 Q54 14 42 12 Z" fill="#7FA8D9" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M40 70 q-16 2 -18 10 q-1 5 5 5 h34 q6 0 5 -6 q-2 -8 -18 -9 Z" fill="#E86A5A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M26 85 h34" stroke="#FFF9EE" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M40 26 q8 -2 12 4 M40 40 q8 -2 12 4" stroke="' + INK + '" stroke-width="2.5" fill="none" opacity=".4"/>',
  hand: '<ellipse cx="50" cy="90" rx="28" ry="5" fill="' + INK + '" opacity=".12"/>' +
    '<path d="M30 84 Q22 62 26 44 Q28 34 34 36 Q38 38 38 46 L38 40 Q38 28 44 27 Q50 26 50 38 L50 34 Q50 22 56 22 Q62 22 62 35 L62 40 Q62 30 68 31 Q74 32 74 44 Q74 60 68 74 Q64 84 56 84 Z" fill="#F8D9A8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M32 46 l6 2 M45 32 l5 3 M57 28 l5 3 M69 36 l4 4" stroke="' + INK + '" stroke-width="2.5" opacity=".4"/>' +
    '<path d="M30 84 Q40 90 52 88 Q60 87 62 82" stroke="' + INK + '" stroke-width="3" fill="none" opacity=".5"/>' +
    '<circle cx="36" cy="33" r="4" fill="#F2B8C6" opacity=".5"/>',
  star: '<path d="M50 10 L61 38 L91 40 L68 59 L76 88 L50 72 L24 88 L32 59 L9 40 L39 38 Z" fill="#F8CB4A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M43 42 l7 10 12 1 -9 8 3 12 -10 -6" stroke="#FFF9EE" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="36" cy="34" r="3" fill="' + INK + '"/><circle cx="62" cy="34" r="3" fill="' + INK + '"/>' +
    '<path d="M42 50 q8 6 16 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
};
/* 词插图包装（aria 隐藏——语义由 zh 徽章与 aria-label 承载） */
const wordSvg = w => '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + (PIC[w] || '') + '</svg>';

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 三格字母槽 + 星 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="9" y="18" width="8" height="11" rx="2.5" fill="#E8975A" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="18" y="18" width="8" height="11" rx="2.5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="27" y="18" width="8" height="11" rx="2.5" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M22 8.5 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/></svg>',
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
