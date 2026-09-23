/* ================= notebird 音阶小鸟 游戏数据（音符封闭 8 / 频率表写死 / 章配置 / 语音文案 / SVG）
   玩法：题面 = 天空斜电线场景 + 题面句，场上 4 只唱名小鸟站站台。
   鸟音 = Web Audio 合成（triangle osc + gain envelope 总时长 700ms，禁 mp3 clip 充当鸟音——
   SPEC-BATCH27 §0.66）；教学主线句锚定「电线左边低，右边高」（ch1 建立位置↔音高映射）。
   r39 谱（SPEC-R39 §R1-§R2）：ch1 有序站位（递增站台，建立映射）→ ch2+ 乱序站位（等高站台，
   破位置查表——孩子必须听辨，不能按「右高左低」位置猜）；唱窗零视觉指认（find/melody
   唱窗不亮鸟——原版答案鸟飘 ♪ 泄答，r39 修复；higher 两鸟先后亮=题面信息不泄答案）。
   音符封闭 8（C 大调上行，频率表写死 data）：
     do=C4 261.63 / re=D4 293.66 / mi=E4 329.63 / fa=F4 349.23 /
     sol=G4 392.00 / la=A4 440.00 / si=B4 493.88 / dop=C5 523.25（do' 用 id 'dop'）
   8 鸟视觉封闭：do红 / re橙 / mi黄 / fa绿 / sol蓝 / la紫 / si粉 / dop白；
   ch1 站位按音序升序（站台高度递增）；ch2+ 站位洗牌非完全升序（站台等高——左右/高度双轴零线索）。
   题型四族（SPEC-R39 §R2）：find 听音找鸟（ch1-2）/ higher 谁高谁低（ch3；音程 ≤2 度，
   相邻对优先，近邻干扰必含）/ melody 三音旋律复现（ch4；依序点 3 鸟，逐点即判进度保留）/
   interval 音程大小（ch4；一对音三分类「挨着/隔一个/隔好几个」文字卡点选）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 音符封闭 8：id → { n 唱名(拉丁), freq Hz(SPEC 写死), c 体色, cn 颜色名(TTS 确认句用) }
   频率表 = 唯一真值源：sing() 查表合成；verify 页独立硬编码另一份对账（±0.5Hz） */
const NOTES = {
  do:  { n: 'do',  freq: 261.63, c: '#E8483C', cn: '红' },
  re:  { n: 're',  freq: 293.66, c: '#F08C2E', cn: '橙' },
  mi:  { n: 'mi',  freq: 329.63, c: '#F5C445', cn: '黄' },
  fa:  { n: 'fa',  freq: 349.23, c: '#57B368', cn: '绿' },
  sol: { n: 'sol', c: '#2E6FB8', freq: 392.00, cn: '蓝' },
  la:  { n: 'la',  freq: 440.00, c: '#8E5BB8', cn: '紫' },
  si:  { n: 'si',  freq: 493.88, c: '#F08CB6', cn: '粉' },
  dop: { n: "do'", freq: 523.25, c: '#FFFFFF', cn: '白' }
};
const ORDER = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'dop']; // 音序（低→高；站位与音序比较真值）
const idxOfNote = n => ORDER.indexOf(n);

/* ---------- 合成音时序常量（SPEC §0.66：总时长 700ms / 相邻两音间隔 300ms）
   higher/interval 题面两音固定窗 = 700+300+700 = 1700ms；melody 三音窗 = 3×(700+300) = 2700ms
   （SPEED 不缩放合成音——verify 时序断言按此，SPEC-R39 §R9） */
const SING_MS = 700, SING_GAP = 300, SING_STEP = SING_MS + SING_GAP; // 1000ms/鸟（演示逐鸟亮唱）
const SING_PAIR_MS = 1700;                     // higher/interval 题面两音固定窗（=700+300+700，SPEED 不缩放）
const SING_TRIO_MS = 2700;                     // melody 题面三音固定窗（=3×(700+300)，SPEC-R39 §R9）

/* ---------- interval 音程三分类（SPEC-R39 §R1 维度三）：d=1 挨着 / d=2 隔一个 / d≥3 隔好几个
   卡 id 空间=类目（iv_near/iv_mid/iv_far，固定近→远序不洗牌）；三分类蒙对 1/3（防二分 50%） */
const IV_KEYS = ['iv_near', 'iv_mid', 'iv_far'];
const IV_LABEL = { iv_near: '挨着', iv_mid: '隔一个', iv_far: '隔好几个' };
const ivClsOf = d => (d === 1 ? 0 : d === 2 ? 1 : 2);          // 音程→类目下标（verify 独立复算同式）

/* ---------- 题面句 / 确认句 / 引导句（四型；颜色锚定，不否定人格，禁「错了」）
   T46 阶段2：题面/确认/引导/主线句全 clip 化；r39 四型分流（SPEC-R39 §R10 键表一字一致）：
   find 确认句=not_cf_s_<音序号>（在册 16 键复用）；higher 确认句=not_cf_h_<音序号>（在册）；
   melody/interval 确认句=not_cf_mel/not_cf_iv（新键，注册前静默——§R10 过渡态） */
const quizTextOf = kind => (kind === 'higher' ? '谁的声音高？' :
                            kind === 'melody' ? '听一听，学着唱一遍' :
                            kind === 'iv' ? '听一听，隔了多远' : '是哪只小鸟在唱？');
const confirmText = q =>
  q.kind === 'higher' ? '对啦，' + NOTES[q.ansNote].cn + '小鸟的声音高' :
  q.kind === 'melody' ? '对啦，唱得真好' :
  q.kind === 'iv' ? '对啦，耳朵真准' :
  '对啦，' + NOTES[q.ansNote].cn + '小鸟在唱歌';
/* ---------- 键构造（与 gen_clips.py T46 注册键一致；r39 四型）：
   确认句=not_cf_{h|s}_<音序号>（在册）/not_cf_mel/not_cf_iv（§R10 新键）；
   引导句=not_g_hi2|not_g_lo2（find 音序语义——乱序场「往右/往左」位置句失效退役）/
   not_g_h2（higher 听辨引导——r39-bis 唱序随机后时序句「后唱的声音高」退役，主线重注册）/
   not_g_mel/not_g_iv（新键）；
   题面句=not_q（find）/not_q2（higher）/not_q_mel/not_q_iv（新键）；主线句=not_main */
const confirmKeyOf = q => q.kind === 'higher' ? 'not_cf_h_' + idxOfNote(q.ansNote) :
                          q.kind === 'melody' ? 'not_cf_mel' :
                          q.kind === 'iv' ? 'not_cf_iv' :
                          'not_cf_s_' + idxOfNote(q.ansNote);
const guideKeyOf = (q, i) => q.kind === 'higher' ? 'not_g_h2' :
  q.kind === 'melody' ? 'not_g_mel' :
  q.kind === 'iv' ? 'not_g_iv' :
  (idxOfNote(q.notes[i]) < idxOfNote(q.ansNote) ? 'not_g_hi2' : 'not_g_lo2');
/* find 错反馈引导句（r39 音序语义，乱序场恒真：所点比答案低→「它更高些」；高→「它更低些」）
   ——旧 GUIDE_FIND（再往右/往左找找）位置语义在乱序场为错误陈述，r39 退役（SPEC-R39 §R1） */
const GUIDE_FIND2 = { hi2: '再听一听，它更高些', lo2: '再听一听，它更低些' };
const GUIDE_H2 = '再听一遍，谁的声音高';       /* higher 错（r39-bis 9 字：唱序随机后「后唱=高」成半数错误陈述，去元规律明示；与 not_g_mel 同「再听一遍」起句家族） */
const GUIDE_MEL = '再听一遍，照顺序点';           /* melody 错 */
const GUIDE_IV = '再听听，隔了多远';              /* interval 错 */
/* 引导句文本按 (q,i) 取（sayW 链尾 {key,text} 的 text 面——与键同步分流） */
const guideTextOf = (q, i) => q.kind === 'higher' ? GUIDE_H2 :
  q.kind === 'melody' ? GUIDE_MEL :
  q.kind === 'iv' ? GUIDE_IV :
  (idxOfNote(q.notes[i]) < idxOfNote(q.ansNote) ? GUIDE_FIND2.hi2 : GUIDE_FIND2.lo2);
/* 教学主线句（锚定位置↔音高映射，题面/教学句锚定——SPEC §0.66）
   T46 阶段2：not_main clip 实测 2904ms（estMs 3105 口径退役） */
const MAIN_LINE = '电线左边低，右边高';   /* M1 压缩版（9 字符）：语义=SPEC 主线「左低右高」位置映射 */

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b26 审查 M3：nextHint 生成关分支实算 genLevel(f+1).dch-1） */
const CHAPTERS = {
  1: { name: '认识小鸟', hint: '听一听，找唱歌的小鸟' },   // 预告 ch2 听音找鸟
  2: { name: '听音找鸟', hint: '比一比，谁的声音高' },     // 预告 ch3 谁高谁低
  3: { name: '谁高谁低', hint: '全部混在一起，大挑战来啦' }, // 预告 ch4 混合
  4: { name: '大挑战',   hint: '新一轮听音开始啦' }        // 预告生成关
};
const GEN_HINTS = ['认识小鸟，再听一听',        // dch1 认识小鸟（自由点鸟）
                   '听一听，找唱歌的小鸟',      // dch2 find
                   '比一比，谁的声音高',        // dch3 higher（近对）
                   '小鸟大集合，想好了再点'];   // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章（ch1 认识 / ch2 find / ch3 higher / ch4 混合）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   六包装 watch/turn/hint/right/wrong/q；higher 题面句/确认句/引导句/主线句=TTS 拼句（本表文案）
   clip 实长（SPEC-BATCH27 §4）：watch 3096 / turn 1752 / hint 2304 / right 2664 / wrong 2832 / q 2448 */
const VOICE = {
  watch: { key: 'not_tut_watch', text: '听！小鸟在唱歌' },
  turn:  { key: 'not_tut_turn',  text: '你来听一听' },
  hint:  { key: 'not_hint',      text: '再听一遍它的声音' },
  right: { key: 'not_right',     text: '听对啦，耳朵真灵' },
  wrong: { key: 'not_wrong',     text: '再听一听，谁的声音' },
  q:     { key: 'not_q',         text: '是哪只小鸟在唱' }
};

/* ---------- 小鸟 SVG（viewBox 0 0 100 100；体色=音色，白肚+眼睛+橙嘴，
   白鸟 dop 用米色翼内衬保可辨——8 色封闭互异） */
function birdSvg(id, size) {
  const c = NOTES[id].c;
  const wing = id === 'dop' ? '#EFE3CD' : c; // 白鸟翼内衬米色（同色翼不可辨）
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="88" height="88"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    /* 尾羽 */ '<path d="M18 52 L4 42 L10 56 L4 68 Z" fill="' + c + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    /* 身体 */ '<ellipse cx="50" cy="56" rx="34" ry="27" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5"/>' +
    /* 白肚 */ '<ellipse cx="54" cy="66" rx="17" ry="12" fill="#FFF9EE" opacity=".92"/>' +
    /* 翅膀 */ '<path d="M28 54 q17 -9 27 3 q-10 12 -27 5 Z" fill="' + wing + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    /* 头 */ '<circle cx="62" cy="36" r="17" fill="' + c + '" stroke="' + INK + '" stroke-width="3.5"/>' +
    /* 呆毛 */ '<path d="M60 19 q2 -7 8 -6 M66 20 q4 -5 9 -2" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    /* 眼 */ '<circle cx="68" cy="33" r="5" fill="#FFF"/><circle cx="69.5" cy="34" r="2.4" fill="' + INK + '"/>' +
    /* 嘴 */ '<path d="M77 36 l15 5 l-15 6 Z" fill="#F5A623" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    /* 小脚（立站台） */ '<path d="M42 82 v8 M58 82 v8" stroke="#F5A623" stroke-width="3.5" stroke-linecap="round"/>' +
    '</svg>';
}

/* ---------- 题面场景（viewBox 0 0 360 184）：天空+云+太阳+两根电线杆（左矮右高）+
   斜电线（左低右高——位置↔音高映射的题面锚）；鸟由 JS 注入 #board */
const CLOUD2 = (x, y, k) => '<g fill="#FFF" stroke="' + INK + '" stroke-width="2.2" transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
  '<ellipse cx="0" cy="0" rx="16" ry="9"/><ellipse cx="12" cy="-4" rx="11" ry="7"/><ellipse cx="-12" cy="-3" rx="9" ry="6"/></g>';
function wireSvg() {
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#CDE6F7"/>' +
    '<circle cx="40" cy="34" r="16" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    CLOUD2(286, 28, 0.9) + CLOUD2(224, 16, 0.5) +
    /* 左电线杆（矮，顶 y≈108） */ '<g stroke="' + INK + '" stroke-width="2.6">' +
    '<rect x="54" y="104" width="9" height="66" fill="#B98A5C"/>' +
    '<rect x="38" y="110" width="41" height="7" rx="3" fill="#B98A5C"/></g>' +
    /* 右电线杆（高，顶 y≈64） */ '<g stroke="' + INK + '" stroke-width="2.6">' +
    '<rect x="296" y="62" width="9" height="108" fill="#B98A5C"/>' +
    '<rect x="280" y="68" width="41" height="7" rx="3" fill="#B98A5C"/></g>' +
    /* 斜电线：左低（y≈128）→右高（y≈66）——「电线左边的声音低，右边的声音高」 */ +
    '<path d="M0 130 Q100 122 180 100 T360 66" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    /* 草地 */ '<path d="M0 152 h360 v32 H0 Z" fill="#B5D3A8"/>' +
    '<path d="M0 152 h360" stroke="' + INK + '" stroke-width="3"/>' +
    '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 小红鸟+音符 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="20" cy="26" r="10" fill="#E8483C" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="23.5" cy="23" r="2.2" fill="#FFF"/><path d="M29 24 l6 2 l-6 2.4 Z" fill="#F5A623" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<text x="31" y="17" font-size="11" font-weight="bold" fill="' + INK + '" font-family="sans-serif">♪</text></svg>',
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
