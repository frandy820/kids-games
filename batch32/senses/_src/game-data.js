/* ================= senses 五感侦探 游戏数据（r11 难度改造 v2：感官封闭 5 / 单感官物品 10 /
   多感官物 5 / 章配置 / 语音文案 / 20 幅 SVG + 徽章 2）
   玩法（SPEC-BATCH32 §6 r11，5-6 岁感官常识·多感官合成/抑制排除/失能代偿）：
   感官封闭 5（eye/ear/nose/hand/mouth）× 单感官物品 10（每感官恰 2 物，主感官唯一——find 族专用池）
   × 多感官物封闭 5（每物恰 3 感官，一物多感官合成）：popcorn 爆米花=eye+ear+nose（看+听砰砰+闻香）/
   watermelon 西瓜=eye+ear+mouth（看+敲听声+尝甜）/ kitten 小猫咪=eye+ear+hand（看+听喵+摸毛）/
   soup 热汤=eye+nose+mouth（看热气+闻香+尝味）/ drum 小鼓=eye+ear+hand（看+听咚咚+拍打）。
   题型四族（章型 CH_FAMILY 每章 5 题位序定版，q0 恒单选题型）：
     find=findsense（物品大图+名音+sen_q1→点感官卡 4 候选）/findthing（感官大图+名音+sen_q2→
       点物品卡 4 候选，干扰不含真值同感官另一物——防双真值）；
     multi=出示多感官物+名音+sen_q3「都用什么呢，找全哦」→5 感官卡全选恰 3（勾选 .held+提交制，
       漏选/多选都错=wrong 清空重选；r11 delta①多感官合成）；
     anti=出示打叉（否决圈）感官小人+「哪个不是用 S 的呀」→4 物品卡选唯一「不是用 S 的」
       （干扰=2 个 S 单感官物+1 个含 S 多感官物——判「相关」须先掌握多感官物的感官集；
       r11 delta②通感抑制排除）；
     comp=出示多感官物+捂住徽章（感官小人+否决圈）+「捂住了 S，还能用什么呀」→4 感官卡选唯一
       「捂住 S 后仍能用」的真值；诱惑=被捂感官 S 恒在场；另一剩余感官禁在场（防双真值）；
       干扰=该物感官集外 2 感官恰填满（r11 delta③感官失能代偿推理）。
   点对=sen_right+答案名音拼播（multi=sen_right+3 感官名音逐段，全 clip 无 keyless——契约 N）；
   点错=错链头 clip+题面名音 clip（回锚）+方向级语义句 TTS（keyless 恒链尾）+题面大图再 pulse。
   认知建模（r11 时长门禁）：MODELED_MS 每题认知步毫秒（5-6 岁口径，演出窗外）——
   find 4500/anti 7500/multi 15000/comp 9000，每关 Σ≥40000（verify+verify_one 双侧独立断言）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 感官封闭 5 + 物品封闭 10（SPEC §0.76：表外不出题；物品 → 主感官） ---------- */
const SENSES5 = ['eye', 'ear', 'nose', 'hand', 'mouth'];
const THINGS10 = ['rainbow', 'star', 'bell', 'birdsong', 'flower', 'cookie', 'softtoy', 'ice', 'lemon', 'candy'];
const SENSE_OF = {
  rainbow: 'eye', star: 'eye',
  bell: 'ear', birdsong: 'ear',
  flower: 'nose', cookie: 'nose',
  softtoy: 'hand', ice: 'hand',
  lemon: 'mouth', candy: 'mouth'
};
const THINGS_OF = {                          // 每感官恰 2 物（反查表——干扰排除同感官另一物）
  eye: ['rainbow', 'star'], ear: ['bell', 'birdsong'], nose: ['flower', 'cookie'],
  hand: ['softtoy', 'ice'], mouth: ['lemon', 'candy']
};
/* ---------- r11 多感官物封闭 5（每物恰 3 感官——multi/anti/comp 专用池，不入 find 族单感官池）
   感官覆盖（anti 相关三选构造下界）：eye×5 / ear×4 / nose×2 / mouth×2 / hand×2，
   每感官「2 单感官物+含 S 多感官物」恒 ≥3 可组 4 候选 ---------- */
const MULTI5 = ['popcorn', 'watermelon', 'kitten', 'soup', 'drum'];
const MULTI_SENSES = {
  popcorn:    ['eye', 'ear', 'nose'],   // 看形状颜色 + 听砰砰 + 闻香味
  watermelon: ['eye', 'ear', 'mouth'],  // 看 + 敲一敲听声 + 尝甜甜
  kitten:     ['eye', 'ear', 'hand'],   // 看 + 听喵喵 + 摸软毛
  soup:       ['eye', 'nose', 'mouth'], // 看热气 + 闻香香 + 尝味道
  drum:       ['eye', 'ear', 'hand']    // 看 + 听咚咚 + 拍一拍
};
/* comp 题构造先验：感官集外恒恰 2（5−3），候选=[真值 A, 被捂 S(诱惑恒在), 外 2] 恰 4；
   另一剩余感官 B 禁在场（防双真值——verify 断言恰 1 可用真值） */
const ITEMS = {
  eye:      { n: '眼睛' },     rainbow:  { n: '彩虹' },
  ear:      { n: '耳朵' },     star:     { n: '星星闪闪' },
  nose:     { n: '鼻子' },     bell:     { n: '闹钟响响' },
  hand:     { n: '小手' },     birdsong: { n: '小鸟唱歌' },
  mouth:    { n: '嘴巴' },     flower:   { n: '花儿香香' },
                          cookie:   { n: '饼干香香' },
                          softtoy:  { n: '毛绒软软' },
                          ice:     { n: '冰块凉凉' },
                          lemon:   { n: '柠檬酸酸' },
                          candy:   { n: '糖果甜甜' },
                          popcorn:    { n: '爆米花' },
                          watermelon: { n: '西瓜' },
                          kitten:     { n: '小猫咪' },
                          soup:       { n: '热汤' },
                          drum:       { n: '小鼓' }
};
const nameOf = id => ITEMS[id].n;

/* ---------- 错反馈方向级语义句（TTS 拼句，SPEC §6 r11 四族；keyless 恒链尾——契约 N；
   无数字词——契约 L 豁免款；estMs=字数×345+600：findsense 9 字 3705 / findthing 7 字 3015 /
   multi 11 字 4395 / anti 14 字 5430（感官名恒 2 字） / comp 13 字 5085） ---------- */
const SENSE_AGAIN = '再想一想，用什么呢';      // findsense 错链尾（9 字）
const THING_AGAIN = '再想想什么用它';          // findthing 错链尾（7 字）
const MULTI_AGAIN = '再想一想，都用了哪里呀';  // multi 错链尾（11 字——漏选/多选共用：把它找全）
const ANTI_BASE = '再想一想，哪个不是用';      // anti 错链尾前段（10 字）+感官名 2 字+'的呀'2 字=14
const ANTI_TAIL = '的呀';
const COV_AGAIN = '再想一想，捂住了还能用什么'; // comp 错链尾（13 字）

/* ---------- 章配置（r11 v2；章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F/M1 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言+off-by-one 哨兵） ---------- */
const CHAPTERS = {
  1: { name: '五感侦探出发',   hint: '接下来，要找一个不一样的哦' },  // 预告 ch2 anti 通感排除
  2: { name: '找不一样的小侦探', hint: '捂住一个感官，还能用什么呀' }, // 预告 ch3 comp 失能代偿
  3: { name: '捂住眼睛想一想', hint: '什么都混在一起，大挑战' },      // 预告 ch4 四族混出
  4: { name: '五感大挑战',     hint: '新一轮五感大挑战' }             // 预告生成关
};
const GEN_HINTS = ['选感官，还要找全哦',    // dch1 [find,multi,find,multi,multi]
                   '找一个不一样的哦',      // dch2 [anti,multi,anti,find,anti]
                   '捂住一个，想一想哦',    // dch3 [anti,multi,comp,multi,anti]
                   '五感大集合，来挑战'];   // dch4 [comp,multi,anti,comp,find]
/* 章型位序（每章 5 题族序定版；q0 恒单选题型——教学锚/驱动器兼容）：
   dch1 复习 find+multi 入门 / dch2 anti 主场 / dch3 comp 引入 / dch4 四族混出 */
const CH_FAMILY = {
  1: ['find', 'multi', 'find', 'multi', 'multi'],
  2: ['anti', 'multi', 'anti', 'find', 'anti'],
  3: ['anti', 'multi', 'comp', 'multi', 'anti'],
  4: ['comp', 'multi', 'anti', 'comp', 'find']
};
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
/* ---------- r11 认知建模（5-6 岁试玩口径每题认知步毫秒，演出窗外——时长门禁常量）：
   find 4500（看题面+4 卡扫描+匹配决策）/ anti 7500（4 卡逐一判「相关」+抑制占优反应+复核）/
   multi 15000（5 感官逐一判适用+3 次勾选+提交）/ comp 9000（回忆该物感官集−被捂+4 卡核查）。
   章和：dch1 2×4500+3×15000=54000 / dch2 3×7500+4500+15000=42000 /
   dch3 2×7500+2×15000+9000=54000 / dch4 2×9000+15000+7500+4500=45000——全 ≥40000 ---------- */
const MODELED_MS = { find: 4500, anti: 7500, multi: 15000, comp: 9000 };
const MODELED_FLOOR = 40000;                    // 每关认知建模下限（r11 时长硬断言）
const familyTok = k => (k === 'findsense' || k === 'findthing') ? 'find' : k;
const modeledLevelMs = L => L.quizzes.reduce((a, q) => a + MODELED_MS[familyTok(q.kind)], 0);

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=sen_ 已核
   manifest 无占用，b28 立规先查）。clip 实长（batch32/_clipdur32.json，浏览器 Audio 实测）：
   tut_watch 2592 / tut_turn 1824 / hint 1656 / right 2256（判对后窗 ≥2556）/ wrong 1656
   / q1 1560 / q2 1824；r11 新句六键（同表实测）：q3 2664 / q_not 1776 / q_not2 1248 /
   q_cov1 1512 / q_cov2 1992 / mw 1824；名音 sen_n_*：star 1872 / birdsong 1848 / candy 1848
   / bell 1824 / ice 1800 / cookie 1776 / lemon 1776 / softtoy 1752 / flower 1632 / rainbow 1368
   / eye 1368 / hand 1440 / ear 1344 / nose 1344 / mouth 1344；r11 多感官名音：kitten 1560 /
   popcorn 1536 / drum 1464 / soup 1392 / watermelon 1368（多感官名音 max 1560=kitten）——
   单选题确认链 right+150+名音 max 1872+300 ≤4600；multi 确认链 right+3×(150+感官名音 max
   1440)+300=7326 ≤7400（1600+5800） ---------- */
const VOICE = {
  watch: { key: 'sen_tut_watch', text: '看！用什么呢' },
  turn:  { key: 'sen_tut_turn',  text: '你来点一点' },
  hint:  { key: 'sen_hint',      text: '再想一想' },
  right: { key: 'sen_right',     text: '点对啦，真棒' },
  wrong: { key: 'sen_wrong',     text: '再想一想' },
  q1:    { key: 'sen_q1',        text: '用什么呢' },
  q2:    { key: 'sen_q2',        text: '什么用它呀' },
  /* r11 三题型题面句/反馈（sen_ 前缀已核 manifest 无占用；既有 22 键文本一字不改） */
  q3:    { key: 'sen_q3',        text: '都用什么呢，找全哦' },  // multi 题面（多选全对）
  qNot:  { key: 'sen_q_not',     text: '哪个不是用' },          // anti 题面段 1
  qNot2: { key: 'sen_q_not2',    text: '的呀' },                // anti 题面段 3（段 2=感官名音）
  qCov1: { key: 'sen_q_cov1',    text: '捂住了' },              // comp 题面段 2（段 3=感官名音）
  qCov2: { key: 'sen_q_cov2',    text: '还能用什么呀' },        // comp 题面段 4
  mw:    { key: 'sen_mw',        text: '没有找全哦' },          // multi 错链头（漏选/多选共用）
  /* T46 阶段2 语义句尾段 clip 化六键（ffprobe 实长；anti 拆 base+名音+tail 三段拼播）：
     again_sense 2640 / again_thing 2184 / again_multi 2976 / again_cov 3264 /
     anti_base 2880 / anti_tail 1248——豁免窗 9500→9800（anti 5 段链 9564） */
  againSense: { key: 'sen_again_sense', text: '再想一想，用什么呢' },
  againThing: { key: 'sen_again_thing', text: '再想想什么用它' },
  againMulti: { key: 'sen_again_multi', text: '再想一想，都用了哪里呀' },
  againCov:   { key: 'sen_again_cov',   text: '再想一想，捂住了还能用什么' },
  antiBase:   { key: 'sen_anti_base',   text: '再想一想，哪个不是用' },
  antiTail:   { key: 'sen_anti_tail',   text: '的呀' }
};
const nameClip = id => 'sen_n_' + id;        // 名音键（晓晓读中文名，15 互异）

/* ---------- 感官小人/物品场景 SVG 库（viewBox 0 0 120 120；家族暖卡通风：INK 描边+暖填充+腮红）
   15 幅互异可一眼辨识（5-6 岁图形认知）。感官小人 5=淡脸圈+器官特写+动作线（eye 目光线/
   ear 声波汇入/nose 香气波浪/hand 指尖涟漪/mouth 味道线）；物品场景 10 图内带感官线索——
   bell 双侧声波弧/birdsong 张嘴+音符+声波/flower+cookie 香气波浪线+凑近的鼻尖侧影/
   softtoy 抚摸的手+绒毛弧/ice 冷气短线+触碰手指/lemon 咬痕+酸表情小脸/candy 张嘴凑近；
   rainbow/star 纯视觉（eye 物视觉信息即主线索，SPEC 允许）——ear/nose/hand/mouth 物
   禁画成「只能看」的静态物。
   根组 g[data-anim] = 图 id——契约 M 帧内容断言锚（渲染即引擎对账依据）。 */
const CHEEK = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>';
const EYE = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 4.2) + '" fill="' + INK + '"/>';
const EYE2 = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 5.6) + '" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="' + (x + 1.5) + '" cy="' + (y + 0.5) + '" r="' + ((r || 5.6) * 0.42) + '" fill="' + INK + '"/>';
/* 香气波浪线（x,y 起，向右两拱）——nose 物共用感官线索 */
const AROMA = (x, y) => '<path d="M' + x + ' ' + y + ' q7 -6 14 0 q7 6 14 0" stroke="#9AD37B" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
/* 凑近的鼻尖侧影（朝左楔形+鼻孔点）——flower/cookie 共用 */
const NOSETIP = (x, y) => '<path d="M' + (x + 20) + ' ' + y + ' Q' + (x + 22) + ' ' + (y + 16) + ' ' + (x + 10) + ' ' + (y + 24) +
  ' Q' + (x - 2) + ' ' + (y + 28) + ' ' + (x - 6) + ' ' + (y + 18) + ' Q' + (x - 8) + ' ' + (y + 10) + ' ' + (x + 2) + ' ' + (y + 9) +
  ' Q' + (x + 12) + ' ' + (y + 7) + ' ' + (x + 10) + ' ' + y + ' Z" fill="#F2D8BC" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
  '<circle cx="' + (x + 2) + '" cy="' + (y + 20) + '" r="2.6" fill="#D98A8A"/>';

const SENSE_ELS = {
  /* 眼睛小人：淡脸+大眼特写（睫毛+高光）+两侧目光动作线 */
  eye:
    '<circle cx="60" cy="64" r="45" fill="#F6E7CF" opacity=".35"/>' +
    '<path d="M14 50 l9 5 M12 62 h10 M14 74 l9 -5" stroke="#7FB0D8" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M106 50 l-9 5 M108 62 h-10 M106 74 l-9 -5" stroke="#7FB0D8" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 62 Q60 28 98 62 Q60 94 22 62 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<circle cx="60" cy="61" r="15" fill="#7FB0D8"/>' +
    '<circle cx="60" cy="61" r="7" fill="' + INK + '"/>' +
    '<circle cx="65" cy="56" r="3.4" fill="#FFF"/>' +
    '<path d="M32 40 l-4 -9 M47 34 l-2 -10 M73 34 l2 -10 M88 40 l4 -9" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    CHEEK(28, 74) + CHEEK(92, 74),
  /* 耳朵小人：淡脸+大耳特写（耳廓+耳窝）+右侧声波汇入弧线 */
  ear:
    '<circle cx="58" cy="64" r="45" fill="#F6E7CF" opacity=".35"/>' +
    '<path d="M74 16 Q36 18 36 54 Q36 88 64 96 Q92 102 94 70 Q95 42 74 16 Z" fill="#F2D8BC" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M68 34 Q52 38 52 58 Q52 76 66 82" stroke="#D9A88C" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M98 46 Q106 62 98 78" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M108 34 Q118 62 108 90" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    CHEEK(24, 78) + CHEEK(88, 84),
  /* 鼻子小人：淡脸+圆鼻特写（鼻孔+鼻梁线）+右上香气波浪线汇入 */
  nose:
    '<circle cx="58" cy="64" r="45" fill="#F6E7CF" opacity=".35"/>' +
    AROMA(76, 30) + AROMA(72, 16) +
    '<path d="M58 38 Q82 38 84 58 Q84 78 58 88 Q32 78 32 58 Q34 38 58 38 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="50" cy="68" rx="4.2" ry="5.6" fill="#D98A8A"/>' +
    '<ellipse cx="66" cy="68" rx="4.2" ry="5.6" fill="#D98A8A"/>' +
    '<path d="M58 38 v-7" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    CHEEK(24, 56) + CHEEK(92, 56),
  /* 小手小人：淡脸+摊开手掌特写（四指+拇指+掌）+指尖触碰涟漪弧 */
  hand:
    '<circle cx="62" cy="64" r="44" fill="#F6E7CF" opacity=".3"/>' +
    '<rect x="42" y="34" width="9.5" height="32" rx="4.7" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="53.5" y="28" width="9.5" height="38" rx="4.7" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="65" y="30" width="9.5" height="36" rx="4.7" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="76.5" y="38" width="9.5" height="28" rx="4.7" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M40 62 Q38 96 62 96 Q86 96 88 64 Q74 54 63 54 Q51 54 40 62 Z" fill="#F6E7CF" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="37" cy="76" rx="7" ry="12" fill="#F6E7CF" stroke="' + INK + '" stroke-width="3" transform="rotate(-32 37 76)"/>' +
    '<path d="M40 24 q7 -8 15 -6 M66 16 q7 -8 15 -6" stroke="#E8975A" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  /* 嘴巴小人：淡脸+张嘴特写（唇+齿+舌）+两侧味道线 */
  mouth:
    '<circle cx="60" cy="62" r="45" fill="#F6E7CF" opacity=".35"/>' +
    '<path d="M20 56 Q60 32 100 56 Q60 94 20 56 Z" fill="#E06A6A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M32 56 Q60 44 88 56 L85 63 Q60 52 35 63 Z" fill="#FFFDF6"/>' +
    '<path d="M32 63 Q60 76 88 63 Q60 88 32 63 Z" fill="#8A4A4A"/>' +
    '<ellipse cx="60" cy="72" rx="11" ry="6.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M16 42 l-7 -7 M26 36 l-5 -9 M104 42 l7 -7 M94 36 l5 -9" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>'
};

const THING_ELS = {
  /* 彩虹：三色拱+两端云朵（eye 物——纯视觉即主线索） */
  rainbow:
    '<path d="M24 86 A36 36 0 0 1 96 86" stroke="#E8756A" stroke-width="11" fill="none"/>' +
    '<path d="M33 86 A27 27 0 0 1 87 86" stroke="#F5C445" stroke-width="11" fill="none"/>' +
    '<path d="M42 86 A18 18 0 0 1 78 86" stroke="#7FB0D8" stroke-width="11" fill="none"/>' +
    '<circle cx="22" cy="90" r="9" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="32" cy="94" r="7" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="98" cy="90" r="9" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="88" cy="94" r="7" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="98" cy="26" r="7" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M98 15 v-4 M98 33 v4 M87 26 h-4 M109 26 h4" stroke="#F5C445" stroke-width="3" stroke-linecap="round"/>',
  /* 星星闪闪：大黄五角星+光芒线+两颗小星（eye 物——纯视觉即主线索） */
  star:
    '<polygon points="60,26 68.2,48.7 92.3,49.5 73.3,64.3 80,87.5 60,74 40,87.5 46.7,64.3 27.7,49.5 51.8,48.7" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M60 18 v-9 M92 34 l8 -5 M28 34 l-8 -5" stroke="#F5C445" stroke-width="3.5" stroke-linecap="round"/>' +
    '<polygon points="98,72 100.5,78.5 107,79 102,83.5 103.5,90 98,86.5 92.5,90 94,83.5 89,79 95.5,78.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<polygon points="20,78 22,83 27,83.5 23,87 24,92 20,89.5 16,92 17,87 13,83.5 18,83" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>',
  /* 闹钟响响：圆钟身+双铃铛+指针+双腿+两侧声波弧线（ear 线索=声波） */
  bell:
    '<path d="M40 30 Q60 22 80 30" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="29" r="9" fill="#E8756A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="80" cy="29" r="9" fill="#E8756A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M44 92 l-7 11 M76 92 l7 11" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>' +
    '<circle cx="60" cy="62" r="30" fill="#F5A24B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="62" r="20" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M60 62 V49 M60 62 L70 67" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="60" cy="62" r="2.6" fill="' + INK + '"/>' +
    '<path d="M18 50 Q10 64 18 78" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M10 40 Q1 64 10 88" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M102 50 Q110 64 102 78" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M110 40 Q119 64 110 88" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  /* 小鸟唱歌：枝头小鸟张嘴+音符+声波弧线（ear 线索=张嘴声波+音符） */
  birdsong:
    '<path d="M10 96 H110" stroke="#B98052" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M44 96 q-2 -8 0 -14" stroke="#8A5A2B" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 78 L14 84 L25 69 Z" fill="#5E90BE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<ellipse cx="50" cy="74" rx="20" ry="17" fill="#7FB0D8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M36 74 q12 -10 26 -4" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="66" cy="54" r="13" fill="#8FBCE0" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE(68, 50, 3.2) +
    '<path d="M78 50 L93 43 L81 55 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M79 57 L92 63 L78 62 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M97 46 Q104 54 97 62" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="102" cy="26" r="4.5" fill="' + INK + '"/>' +
    '<path d="M106 26 V12 q6 2 6 6" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
  /* 花儿香香：粉花+茎叶+香气波浪线+右侧凑近的鼻尖侧影（nose 线索=香气+鼻尖） */
  flower:
    '<ellipse cx="44" cy="30" rx="8" ry="13" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8" transform="rotate(0 44 52)"/>' +
    '<ellipse cx="44" cy="30" rx="8" ry="13" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8" transform="rotate(60 44 52)"/>' +
    '<ellipse cx="44" cy="30" rx="8" ry="13" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8" transform="rotate(120 44 52)"/>' +
    '<ellipse cx="44" cy="30" rx="8" ry="13" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8" transform="rotate(180 44 52)"/>' +
    '<ellipse cx="44" cy="30" rx="8" ry="13" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8" transform="rotate(240 44 52)"/>' +
    '<ellipse cx="44" cy="30" rx="8" ry="13" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8" transform="rotate(300 44 52)"/>' +
    '<circle cx="44" cy="52" r="9.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M44 62 Q41 80 45 98" stroke="#7DBB5A" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="29" cy="80" rx="10" ry="5.5" fill="#9AD37B" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-30 29 80)"/>' +
    AROMA(60, 42) + AROMA(56, 28) +
    NOSETIP(96, 72),
  /* 饼干香香：圆饼干+巧克力豆+香气波浪线+右下凑近的鼻尖侧影（nose 线索=香气+鼻尖） */
  cookie:
    '<circle cx="52" cy="58" r="28" fill="#E8B04B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="42" cy="48" r="3.2" fill="#8A5A2B"/>' +
    '<circle cx="58" cy="42" r="3.2" fill="#8A5A2B"/>' +
    '<circle cx="66" cy="60" r="3.2" fill="#8A5A2B"/>' +
    '<circle cx="46" cy="68" r="3.2" fill="#8A5A2B"/>' +
    '<circle cx="58" cy="72" r="3.2" fill="#8A5A2B"/>' +
    '<path d="M34 50 q-4 8 0 16" stroke="#D9993A" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    AROMA(70, 34) + AROMA(66, 20) +
    NOSETIP(96, 76),
  /* 毛绒软软：泰迪熊+右侧抚摸的手+绒毛短弧（hand 线索=触摸的手） */
  softtoy:
    '<circle cx="40" cy="30" r="8" fill="#D98E4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="72" cy="30" r="8" fill="#D98E4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="40" cy="30" r="3.2" fill="#F2B8C6"/>' +
    '<circle cx="72" cy="30" r="3.2" fill="#F2B8C6"/>' +
    '<ellipse cx="32" cy="76" rx="8" ry="13" fill="#D98E4A" stroke="' + INK + '" stroke-width="3" transform="rotate(24 32 76)"/>' +
    '<circle cx="56" cy="46" r="19" fill="#E8A763" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="56" cy="53" rx="10" ry="7.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    EYE2(48, 42, 4) + EYE2(64, 42, 4) +
    '<ellipse cx="56" cy="49" rx="4" ry="3.2" fill="' + INK + '"/>' +
    '<path d="M56 52 v3 M56 55 q-3.5 3 -7 1 M56 55 q3.5 3 7 1" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="56" cy="85" rx="23" ry="18" fill="#D98E4A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="52" cy="87" rx="12" ry="9.5" fill="#F6E7CF" opacity=".9"/>' +
    '<path d="M40 76 q3 -3 6 0 M46 92 q3 -3 6 0 M58 96 q3 -3 6 0" stroke="#B98052" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="82" cy="70" r="4.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="90" cy="68" r="4.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="97" cy="72" r="4.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="88" cy="82" r="11" fill="#F6E7CF" stroke="' + INK + '" stroke-width="3"/>',
  /* 冰块凉凉：圆角冰块+内高光+冷气短线+右侧触碰手指（hand 线索=触碰+冷气） */
  ice:
    '<rect x="34" y="42" width="46" height="46" rx="9" fill="#BFE3F2" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="41" y="49" width="18" height="13" rx="4" fill="#FFF" opacity=".6"/>' +
    '<path d="M66 70 l9 9" stroke="#8FC6DE" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M28 34 l-9 -9 M46 30 l-4 -12 M64 30 l4 -12 M82 34 l9 -9" stroke="#7FB0D8" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M28 58 h-11 M28 72 h-11" stroke="#7FB0D8" stroke-width="3.2" stroke-linecap="round"/>' +
    '<rect x="86" y="58" width="26" height="13" rx="6.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="88" y="61" width="8" height="7" rx="3.5" fill="#FFFDF6" stroke="#D9C4A8" stroke-width="1.6"/>',
  /* 柠檬酸酸：黄柠檬+左端咬痕（三缺口）+旁边酸表情小脸（mouth 线索=咬一口+酸表情） */
  lemon:
    '<ellipse cx="56" cy="68" rx="26" ry="20" fill="#F5D458" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="85" cy="68" rx="6" ry="5" fill="#F5D458" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M50 62 q4 -3 8 0 M62 74 q4 -3 8 0" stroke="#E8C93C" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="34" cy="58" r="8" fill="#FFF9EE"/>' +
    '<circle cx="30" cy="68" r="6.5" fill="#FFF9EE"/>' +
    '<circle cx="36" cy="76" r="5" fill="#FFF9EE"/>' +
    '<circle cx="97" cy="34" r="13" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M89 30 l4 3 M93 30 l-4 3 M98 30 l4 3 M102 30 l-4 3" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M90 41 q3 4 6 0 q3 -4 6 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  /* 糖果甜甜：圆糖果+旋纹+两侧糖纸拧结+右下张开小嘴凑近（mouth 线索=张嘴凑近） */
  candy:
    '<path d="M28 62 L10 50 L16 62 L10 74 Z" fill="#E8756A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M76 62 L94 50 L88 62 L94 74 Z" fill="#E8756A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="52" cy="62" r="24" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M52 52 q10 0 10 10 q0 10 -10 10 q-8 0 -8 -8 q0 -6 6 -6" stroke="#E06A6A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="43" cy="53" r="3.2" fill="#FFF" opacity=".85"/>' +
    '<ellipse cx="97" cy="92" rx="11" ry="8" fill="#E06A6A" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="97" cy="93" rx="7" ry="4.5" fill="#8A4A4A"/>' +
    '<ellipse cx="97" cy="96" rx="4.5" ry="2.5" fill="#F2B8C6"/>',
  /* ============ r11 多感官物 5 幅（每幅带齐 3 个感官线索——非视线索显式画出，禁「只能看」） ============ */
  /* 爆米花=eye+ear+nose：条纹纸桶+白黄爆花（看）+左右声波弧（听砰砰）+香气波浪（闻香） */
  popcorn:
    '<path d="M18 44 Q10 66 14 88 L20 92 Q40 98 60 92 L66 88 Q70 66 62 44 Z" fill="#E8756A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M20 52 L62 52 M21 66 L63 66 M23 80 L59 80" stroke="#FFF9EE" stroke-width="5" opacity=".85"/>' +
    '<circle cx="30" cy="40" r="10" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="46" cy="34" r="12" fill="#FDF3DC" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="60" cy="42" r="9.5" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="40" cy="24" r="7" fill="#FDF3DC" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="52" cy="22" r="6" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M14 40 Q6 54 14 68" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M74 36 Q84 54 74 72" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    AROMA(70, 18) + AROMA(66, 6),
  /* 西瓜=eye+ear+mouth：红瓤黑籽切片（看）+指节敲击+声波弧（敲一敲听声）+张嘴咬一口（尝甜） */
  watermelon:
    '<path d="M18 62 A38 38 0 0 1 94 62 Z" fill="#E06A6A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M18 62 A38 38 0 0 1 94 62 L88 62 A32 32 0 0 0 24 62 Z" fill="#F2B8C6"/>' +
    '<path d="M12 62 A44 44 0 0 1 100 62 L94 66 A38 40 0 0 0 18 66 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="44" cy="52" r="2.6" fill="' + INK + '"/>' +
    '<circle cx="60" cy="44" r="2.6" fill="' + INK + '"/>' +
    '<circle cx="70" cy="54" r="2.6" fill="' + INK + '"/>' +
    '<circle cx="52" cy="60" r="2.6" fill="' + INK + '"/>' +
    '<rect x="76" y="18" width="11" height="20" rx="5.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="81.5" cy="15" r="7" fill="#F6E7CF" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M92 30 Q99 42 92 54" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="30" cy="94" rx="12" ry="9" fill="#E06A6A" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="30" cy="95" rx="8" ry="5" fill="#8A4A4A"/>' +
    '<ellipse cx="30" cy="98" rx="5" ry="2.8" fill="#F2B8C6"/>',
  /* 小猫咪=eye+ear+hand：圆脸猫耳胡须（看）+音符+声波弧（听喵喵）+头顶抚摸的手（摸软毛） */
  kitten:
    '<path d="M30 34 L26 12 L46 26 Z" fill="#E8B04B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M78 34 L82 12 L62 26 Z" fill="#E8B04B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 34 L44 24 M80 34 L64 24" stroke="#F2B8C6" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="54" cy="56" rx="28" ry="25" fill="#F5C87A" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE2(43, 52, 4.6) + EYE2(65, 52, 4.6) +
    '<path d="M54 60 l-4 4 l4 4 l4 -4 Z" fill="#E06A6A" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M54 68 q-5 5 -10 2 M54 68 q5 5 10 2" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 56 h-12 M24 62 l-11 3 M22 50 l-10 -4 M86 56 h12 M84 62 l11 3 M86 50 l10 -4" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    CHEEK(36, 66) + CHEEK(72, 66) +
    '<path d="M98 24 Q106 36 98 48" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="104" cy="14" r="4.2" fill="' + INK + '"/>' +
    '<path d="M108 14 V3 q5 2 5 5" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="86" cy="94" r="4.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="96" cy="92" r="4.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="104" cy="97" r="4.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="94" cy="107" rx="12" ry="8" fill="#F6E7CF" stroke="' + INK + '" stroke-width="3"/>',
  /* 热汤=eye+nose+mouth：碗+腾腾热气（看）+香气波浪（闻香）+勺子舀汤（尝味道） */
  soup:
    '<path d="M18 56 Q19 84 40 92 L40 100 Q54 106 68 100 L68 92 Q89 84 90 56 Z" fill="#7FB0D8" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="54" cy="56" rx="36" ry="9" fill="#F5D458" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="40" cy="54" r="3" fill="#E8975A"/><circle cx="58" cy="57" r="3.4" fill="#E8975A"/><circle cx="68" cy="52" r="2.6" fill="#E8975A"/>' +
    '<path d="M34 44 q-5 -10 0 -19 M48 44 q5 -10 0 -19 M62 44 q-5 -10 0 -19" stroke="#B98052" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    AROMA(72, 40) + AROMA(68, 28) +
    '<rect x="86" y="14" width="9" height="40" rx="4.5" fill="#B98052" stroke="' + INK + '" stroke-width="2.8" transform="rotate(18 90 34)"/>' +
    '<ellipse cx="98" cy="52" rx="8.5" ry="11" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.8" transform="rotate(18 98 52)"/>',
  /* 小鼓=eye+ear+hand：鼓身鼓面背带（看）+两支鼓棒敲击+声波弧（听咚咚）+握棒小手（拍一拍） */
  drum:
    '<ellipse cx="60" cy="42" rx="34" ry="11" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M26 42 L26 74 Q60 92 94 74 L94 42" fill="#E8756A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M30 54 Q60 68 90 54 M29 64 Q60 78 91 64" stroke="#FFF9EE" stroke-width="4" opacity=".9" fill="none"/>' +
    '<path d="M26 42 Q60 56 94 42" stroke="' + INK + '" stroke-width="2.6" fill="none"/>' +
    '<path d="M12 30 L44 36 M108 30 L76 36" stroke="#B98052" stroke-width="4.5" stroke-linecap="round"/>' +
    '<circle cx="46" cy="36.5" r="5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="74" cy="36.5" r="5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M4 20 Q-2 34 4 46 M116 20 Q122 34 116 46" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M14 10 q7 -7 14 -5 M92 5 q7 -2 14 5" stroke="#E8975A" stroke-width="3" fill="none" stroke-linecap="round"/>'
};

/* r11 否决圈（anti 打叉感官小人 / comp 捂住徽章共用）：红圈+斜杠（通用「不是它」符号，零文字） */
const NO_MARK = '<g><circle cx="60" cy="60" r="46" fill="none" stroke="#D9534F" stroke-width="9" opacity=".92"/>' +
  '<path d="M28 92 L92 28" stroke="#D9534F" stroke-width="9" stroke-linecap="round" opacity=".92"/></g>';

/* 图 SVG 工厂：animSvg(id, size)——size 缺省 100；根组 g[data-anim]=id（契约 M 锚）；
   r11：id 域=感官 5+单感官物 10+多感官物 5 共 20 幅；noMarkSvg()=否决圈（anti/comp 徽章） */
function noMarkSvg(size) {
  const s2 = size ? ' width="' + size + '" height="' + size + '" viewBox="0 0 120 120"' : ' width="120" height="120" viewBox="0 0 120 120"';
  return '<svg' + s2 + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' + NO_MARK + '</svg>';
}
function animSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="100" height="100"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + id + '">' + (SENSE_ELS[id] || THING_ELS[id]) + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 放大镜侦探眼（五感侦探主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M10 21 Q20.5 13 31 21 Q20.5 29.5 10 21 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="20.5" cy="21" r="4.4" fill="#7FB0D8"/>' +
    '<circle cx="20.5" cy="21" r="2" fill="' + INK + '"/>' +
    '<path d="M29 28.5 L36.5 36" stroke="#E8975A" stroke-width="4" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  /* r11 提交钮：绿圆白勾（零文字——勾好啦就点它） */
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="27" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="3.5"/>' +
    '<path d="M19 33 L28.5 43 L46 22.5" stroke="#FFFDF6" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
