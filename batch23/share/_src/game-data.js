/* ================= share 分糖果 游戏数据（糖果 / 动物 / 章配置 / 语音文案 / 中文数词 / SVG）
   玩法（SPEC-BATCH23 §0.53/§2 + SPEC-R22-SHARE r22 修订）：题面「N 颗糖，分给 K 只小动物，
   每只一样多」。托盘 N 颗糖 + K 只动物各一空碗。两击制：点糖（提起高亮）→点碗（飞入）；
   再点别的糖=换选；点已提起的糖=放回（非取回）；取回=点碗里的糖退回托盘（零惩罚，计 miss）。
   自动判定：每碗相等且糖分完=celebrate（动物吃糖）；相等+有剩=未完成继续；
   不等=未完成（无错误路径——不均衡不是「错」是「还没分完」）。
   ch3 剩余题：分到每碗相等且托盘剩 <K 颗 →「剩下的放小盘」引导 + 点盘子收尾。
   r22 难度加深：ch3 扩 k=4（恰 2 题 POOL_REM4——四碗轮转+余数域扩）；
   ch4 换新作答面章（比较 cmp：谁多/差几颗 + 等分反推 rev：每碗 X 颗×K 只→总数，
   数字钮/点动物作答，选错=wiggle+可重选不换题，答错计 qMiss 入星级口径——§R4）。
   题面/数词 = T46 阶段2 clip 化（sha_q_22+sha_n_13，manifest 全在册）；数词 numCn 承 feed 同源写法。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 中文数词（取物报数/题面 TTS 拼句用；与 feed numCn 同源写法，§0 数词副本）
   D[0]='零'（取回到空碗报'零'——0 概念有数词兜底） ---------- */
function numCn(n) {
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return D[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + D[n - 10];
  return '二十';
}

/* ---------- 糖果色板（body 糖体 / wrap 糖纸角；描边全 INK 保证对比度） ---------- */
const CANDY_COLORS = [
  { body: '#F2A0B5', wrap: '#E97E9B' },   // 莓粉
  { body: '#F5C542', wrap: '#E8A23C' },   // 蜜黄
  { body: '#A8CBEA', wrap: '#7FB3DC' },   // 天蓝
  { body: '#B8DBA0', wrap: '#8FBF7F' }    // 苹绿
];
/* 糖果 SVG（viewBox 0 0 72 56）：糖体椭圆 + 两侧糖纸角 + 糖体暗纹；id 决定色款（稳定不随移动变） */
function candySvg(id) {
  const C = CANDY_COLORS[id % CANDY_COLORS.length];
  return '<svg viewBox="0 0 72 56" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M18 28 Q8 18 3 15 Q6 28 3 41 Q8 38 18 28 Z" fill="' + C.wrap + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M54 28 Q64 18 69 15 Q66 28 69 41 Q64 38 54 28 Z" fill="' + C.wrap + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="36" cy="28" rx="18" ry="14" fill="' + C.body + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M29 15.5 Q25 28 29 40.5 M43 15.5 Q47 28 43 40.5" stroke="' + INK + '" stroke-width="2.4" fill="none" opacity=".5"/>' +
    '</svg>';
}

/* ---------- 小动物库（K=2 取 2 种 / K=3 取 3 种 / K=4 全 4 种——r22 份数 4，seeded 分配到碗位）
   表情组：.fx-eager=期待（碗空：圆眼+张嘴）/ .fx-happy=笑（有糖：弯眼+咧嘴）——CSS 按容器类切换；
   全相等=跳（容器 .jump 动画，SPEC §0.53 表情三态） ---------- */
const ANIMAL_KEYS = ['cat', 'bear', 'rabbit', 'dog'];
const ANIMALS = {
  cat:    { n: '小猫' },
  bear:   { n: '小熊' },
  rabbit: { n: '小兔' },
  dog:    { n: '小狗' }
};
function animalSvg(kind) {
  const head = {
    cat:
      '<path d="M30 40 L25 14 L47 27 Z" fill="#F5B971" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M90 40 L95 14 L73 27 Z" fill="#F5B971" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M32 32.5 L30 21 L39 27 Z" fill="#F2B8C6"/><path d="M88 32.5 L90 21 L81 27 Z" fill="#F2B8C6"/>' +
      '<circle cx="60" cy="62" r="34" fill="#F5B971" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M20 58 h11 M20 66 h11 M89 58 h-11 M89 66 h-11" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M56 63 h8 l-4 5.5 Z" fill="#D98A8A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>',
    bear:
      '<circle cx="33" cy="27" r="11.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="87" cy="27" r="11.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="33" cy="27" r="5" fill="#E8C7A6"/><circle cx="87" cy="27" r="5" fill="#E8C7A6"/>' +
      '<circle cx="60" cy="63" r="34" fill="#C89A6B" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="60" cy="74" rx="14.5" ry="10.5" fill="#F6E7D2" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<ellipse cx="60" cy="69.5" rx="4.2" ry="3.2" fill="' + INK + '"/>',
    rabbit:
      '<ellipse cx="45" cy="17" rx="9.5" ry="21" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(-11 45 17)"/>' +
      '<ellipse cx="75" cy="17" rx="9.5" ry="21" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(13 75 17)"/>' +
      '<ellipse cx="45" cy="19" rx="4.4" ry="13" fill="#F2B8C6" transform="rotate(-11 45 19)"/>' +
      '<ellipse cx="75" cy="19" rx="4.4" ry="13" fill="#F2B8C6" transform="rotate(13 75 19)"/>' +
      '<circle cx="60" cy="64" r="33" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="38" cy="70" rx="6" ry="4.2" fill="#F2B8C6" opacity=".75"/><ellipse cx="82" cy="70" rx="6" ry="4.2" fill="#F2B8C6" opacity=".75"/>' +
      '<path d="M56.5 61 h7 l-3.5 5 Z" fill="#D98A8A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>',
    dog:                                       /* r22 第 4 只（k=4）：垂耳+大口鼻 */
      '<ellipse cx="29" cy="38" rx="12" ry="20" fill="#D9A566" stroke="' + INK + '" stroke-width="3" transform="rotate(9 29 38)"/>' +
      '<ellipse cx="91" cy="38" rx="12" ry="20" fill="#D9A566" stroke="' + INK + '" stroke-width="3" transform="rotate(-9 91 38)"/>' +
      '<ellipse cx="29" cy="40" rx="5.5" ry="13" fill="#B9854D" opacity=".85" transform="rotate(9 29 40)"/>' +
      '<ellipse cx="91" cy="40" rx="5.5" ry="13" fill="#B9854D" opacity=".85" transform="rotate(-9 91 40)"/>' +
      '<circle cx="60" cy="63" r="34" fill="#E8B36A" stroke="' + INK + '" stroke-width="3"/>' +
      '<ellipse cx="60" cy="77" rx="15" ry="11" fill="#F6E7D2" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<ellipse cx="60" cy="71.5" rx="5" ry="3.8" fill="' + INK + '"/>'
  }[kind];
  const ey = kind === 'rabbit' ? 56 : 54;      // 兔脸略大眼位下移
  const my = kind === 'bear' ? 78 : (kind === 'dog' ? 82 : 71);   // 熊/狗嘴画在口鼻部内
  const eyes =
    '<g class="fx-eager"><circle cx="47" cy="' + ey + '" r="4.6" fill="' + INK + '"/><circle cx="73" cy="' + ey + '" r="4.6" fill="' + INK + '"/>' +
    '<circle cx="48.6" cy="' + (ey - 1.6) + '" r="1.5" fill="#FFF9EE"/><circle cx="74.6" cy="' + (ey - 1.6) + '" r="1.5" fill="#FFF9EE"/></g>' +
    '<g class="fx-happy"><path d="M41.5 ' + (ey + 1) + ' q5.5 -7 11 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M67.5 ' + (ey + 1) + ' q5.5 -7 11 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/></g>';
  const mouth =
    '<g class="fx-eager"><ellipse cx="60" cy="' + my + '" rx="4.4" ry="5.2" fill="#D98A8A"/></g>' +
    '<g class="fx-happy"><path d="M53 ' + (my - 2) + ' q7 7 14 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>';
  return '<svg viewBox="0 0 120 104" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
         head + eyes + mouth + '</svg>';
}

/* ---------- 小盘 SVG（ch3 剩余糖的去处；引导出现时点亮） ---------- */
function plateSvg() {
  return '<svg viewBox="0 0 96 46" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="48" cy="29" rx="43" ry="13.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="48" cy="25" rx="30" ry="7.5" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.4"/></svg>';
}

/* ---------- 题库（SPEC-R22-SHARE §R3 逐条——四方同步红线：本表 / game-core structWhy /
   verify_one_share.py Python 池 / _selftest.py PY 池，四处同源）：
   ch1 平分 2 份 / ch2 平分 3 份 / ch3 剩余（k∈2/3/4，恰 2 题 k4）/ ch4 比较+反推新作答面
   REM 对表 = n%k!==0 且余数 <K（余数天然 <K，表内全部校验过）；
   CMP_WHO = 唯一最多分布（点动物答「谁的糖多」）；CMP_DIFF = 唯一最多+唯一最少分布
   （数字钮答 max−min，d∈{1,2,3}）；REV 域 = X∈{2,3}×K∈{2,3,4}（每碗 X 颗×K 只→总数） ---------- */
const POOL_D2 = [2, 4, 6, 8, 10];                                   // k=2 整除
const POOL_D3 = [3, 6, 9, 12];                                      // k=3 整除
const POOL_REM = [[5, 2], [5, 3], [7, 2], [7, 3], [8, 3], [10, 3], [11, 2], [11, 3]];  // [n,k] 剩余题（k2/3）
const POOL_REM4 = [[5, 4], [6, 4], [7, 4], [9, 4], [10, 4], [11, 4]];  // r22 k4 剩余题（余 1-3 <4）
const CMP_WHO = [[4, 2], [4, 3], [5, 3], [5, 4], [6, 4], [6, 5],     // r22 谁多（k2：唯一最多）
                 [3, 2, 2], [4, 2, 2], [4, 3, 3], [5, 3, 3],         // 谁多（k3）
                 [3, 2, 2, 2]];                                      // 谁多（k4）
const CMP_DIFF = [[3, 2], [4, 2], [5, 2], [5, 3], [6, 3], [6, 4], [7, 4],   // r22 差几颗（k2：d=1,2,3,2,3,2,3）
                  [4, 3, 1], [4, 3, 2], [5, 3, 2], [5, 4, 2]];        // 差几颗（k3：d=3,2,3,3——unique max+min；
                                                                      // k3 d=1 三碗两值结构性双唯一不可得）
const REV_XK = [[2, 2], [2, 3], [2, 4], [3, 2], [3, 3], [3, 4]];     // r22 等分反推域（X×K≤12）

/* ---------- 章配置（章号 1 基；flat≥20 生成关按 (ch-1)%4+1 循环四章取材）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，b21/b22 教训禁右移） ---------- */
const CHAPTERS = {
  1: { name: '分两家', hint: '三只小动物来啦，也要分得一样多' },          // 预告 ch2 平分 3 份
  2: { name: '分三家', hint: '四只小动物也来啦，分不完的放小盘' },        // 预告 ch3 剩余题+r22 k4
  3: { name: '分不完', hint: '比一比谁的多，数一数一共几颗' },           // 预告 ch4 比较+反推（r22）
  4: { name: '公平大师', hint: '新关卡变不完，数数比比继续挑战' }         // 预告生成关
};
/* GEN_HINTS[k] ↔ dch=k+1（两家平分/三只一样多/四只分不完放盘/比一比数一数）——禁右移 */
const GEN_HINTS = ['两家平分，数数每碗一样多', '三只小动物，每只一样多',
                   '四只小动物分不完，剩下的放小盘', '比一比谁的多，数一数一共几颗'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   题面/数词：T46 阶段2 起 clip 化（sha_q_ 与 sha_n_ 前缀，见下方键函数；text 留作回退文案）
   r22 新键 11 条（SPEC-R22 §R6，上报主线 gen_clips 注册；games=['share'] 恰一主，
   防 sha_ 前缀与 shadow 20 条同名前缀异主串款）：sha_q_{n}_4 ×6 / sha_cmp_who /
   sha_cmp_diff / sha_rev_q / sha_wrong / sha_ans_right——注册前 text 兜底自愈 ---------- */
const VOICE = {
  watch:    { key: 'sha_tut_watch', text: '看！一人分一颗' },
  turn:     { key: 'sha_tut_turn',  text: '你来分一分' },
  hint:     { key: 'sha_hint',      text: '数数每只碗里几颗' },
  right:    { key: 'sha_right',     text: '每只一样多，真公平' },
  plate:    { key: 'sha_plate',     text: '剩下的放小盘子吧' },
  cmpWho:   { key: 'sha_cmp_who',   text: '谁的糖果多呀' },        /* r22 cmp-who 题面/救援重读 */
  cmpDiff:  { key: 'sha_cmp_diff',  text: '多几颗呀' },            /* r22 cmp-diff 题面/救援重读 */
  revQ:     { key: 'sha_rev_q',     text: '数一数，一共有几颗糖呀' }, /* r22 rev 题面/救援重读 */
  wrong:    { key: 'sha_wrong',     text: '再数一数吧' },          /* r22 作答错鼓励（可重选） */
  ansRight: { key: 'sha_ans_right', text: '数对啦，真厉害' }       /* r22 cmp/rev 答对 */
};
/* 题面整句（TTS）：'六颗糖，分给两只小动物，每只一样多'（SPEC §2 例句形态，数词 numCn；
   量词'只'前 2 按普通话规范读'两'——numCn 本体承 feed 同源不动，仅题面拼句特例）；
   r22 cmp/rev 题分流（§R4：who/diff/rev 三形态文案） */
const quizSpeech = q => q.mode === 'cmp'
  ? (q.ask === 'who' ? VOICE.cmpWho.text : VOICE.cmpDiff.text)
  : (q.mode === 'rev' ? VOICE.revQ.text
     : numCn(q.n) + '颗糖，分给' + (q.k === 2 ? '两' : numCn(q.k)) + '只小动物，每只一样多');
/* T46 阶段2 clip 化：题面 sha_q_{n}_{k} 22 条（出题域 n∈2-12×k∈{2,3}，POOL_D2/D3/REM
   并集全覆盖）+ 数词 sha_n_0..12（碗内计数/取回报数，含空碗'零'）——manifest 全在册；
   r22 k4 剩余题面 sha_q_{n}_4 6 条 + cmp/rev 题面键分流（§R6，注册前 text 兜底） */
const quizKey = q => q.mode === 'cmp' ? (q.ask === 'who' ? VOICE.cmpWho.key : VOICE.cmpDiff.key)
                   : (q.mode === 'rev' ? VOICE.revQ.key : 'sha_q_' + q.n + '_' + q.k);
const numKey = n => 'sha_n_' + n;

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 一颗糖落进小碗（分糖果主题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="22" cy="14" rx="8" ry="6" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M14.5 14 q-4 -2 -5 -4 q3 0 5 2 M29.5 14 q4 -2 5 -4 q-3 0 -5 2" fill="#E97E9B" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M10 26 a12 8 0 0 0 24 0 Z" fill="#EFE3CD" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M16 26 a6 3.4 0 0 0 12 0" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 题面 chip 分给箭头：糖 → 动物（零文字 §0.19） */
  arrow: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 24 h26 M26 12 l12 12 -12 12" stroke="' + INK + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* r22 问号圆牌：cmp/rev 题面与作答区「考考你」图形（零文字 §0.19） */
  quest: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="24" cy="24" r="19" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M17.5 19 a6.5 6.5 0 1 1 9.2 5.9 q-2.7 1.3-2.7 4.1" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<circle cx="24" cy="34.5" r="2.6" fill="' + INK + '"/></svg>'
};
