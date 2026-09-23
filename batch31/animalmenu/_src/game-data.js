/* ================= animalmenu 动物三餐菜单 游戏数据 v2（r11 难度改造 2026-09-14）
   SPEC-BATCH31 §0.76 r11（旧 v1 玩法描述作废——审计 AUDIT-56 #31 红牌：1:1 配对每题
   7-9s 含 4.5s 演出窗，与 connect 同构）：配对底座升级为四题型五族——
     ch1 findfood/findwho 两族混出 · 恒 4 候选（原 2 候选升 4，findwho 从首章就在场）
     ch2 multifood 一动物多食全选（提交制：勾满 need 2 件+「点好啦」——漏选保留继续/
        多选清空重选+miss；干扰 ⊆ DISTRACT_OK[动物] 公平表）
     ch3 dietclass 食性分类归纳（动物→肉食/草食/杂食三盘分放；每关 ≥1 肉食+≥1 草食）
     ch4 chaindir 食物链方向（谁吃谁方向判定：出示两卡按听序，点「吃的一方」；
        每关 5 对互异且 ≥2 对动物-动物）
   ch1 题域=配对封闭 8（PAIRS8 1:1 双向，教学锚 flat0q0=findfood/rabbit 不变）；
   新动物 2（wolf 大灰狼/sheep 小绵羊）+ 新食物 7（apple/greens/berry/meat/grass/corn/acorn）
   只入 ch2-4 题域（封闭 10 动物 × 15 食物）。
   点对=anm_right+名音拼播（确认链全 clip 无 keyless——契约 N；multifood=need 名音逐件）；
   点错=findfood/findwho/dietclass 三段链（语义句 clip+题面名音+方向级 TTS 恒链尾）/
   chaindir 三段链（两名音回锚+方向级 TTS 尾——无 clip 头，窗 7800 内收口）；
   multifood 提交反馈=anm_less/anm_more 单段 clip（提交制，照 iftrain v2 先例）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 配对封闭 8（SPEC §0.76：表外不出题；动物 id → 食物 id）——ch1 题域+教学锚 ---------- */
const PAIRS8 = {
  rabbit: 'carrot', panda: 'bamboo', monkey: 'banana', cat: 'fish',
  dog: 'bone', mouse: 'cheese', bear: 'honey', squirrel: 'pinecone'
};
const ANIMALS8 = ['rabbit', 'panda', 'monkey', 'cat', 'dog', 'mouse', 'bear', 'squirrel'];
const FOODS8 = ['carrot', 'bamboo', 'banana', 'fish', 'bone', 'cheese', 'honey', 'pinecone'];
const animalOf = f => { for (let i = 0; i < ANIMALS8.length; i++) if (PAIRS8[ANIMALS8[i]] === f) return ANIMALS8[i]; return null; };
const nameOf = id => ITEMS[id].n;

/* ---------- r11 封闭 10 动物 × 15 食物（ch2-4 题域；新动物/食物不入 ch1 配对域） ---------- */
const ANIMALS10 = ANIMALS8.concat(['wolf', 'sheep']);
const FOODS15 = FOODS8.concat(['apple', 'greens', 'berry', 'meat', 'grass', 'corn', 'acorn']);
const ITEMS = {
  rabbit:   { n: '兔子' },   carrot:   { n: '胡萝卜' },
  panda:    { n: '熊猫' },   bamboo:   { n: '竹子' },
  monkey:   { n: '猴子' },   banana:   { n: '香蕉' },
  cat:      { n: '小猫' },   fish:     { n: '小鱼' },
  dog:      { n: '小狗' },   bone:     { n: '骨头' },
  mouse:    { n: '老鼠' },   cheese:   { n: '奶酪' },
  bear:     { n: '小熊' },   honey:    { n: '蜂蜜' },
  squirrel: { n: '松鼠' },   pinecone: { n: '松果' },
  /* r11 新增（2026-09-14） */
  wolf:     { n: '大灰狼' }, sheep:    { n: '小绵羊' },
  apple:    { n: '苹果' },   greens:   { n: '青菜' },
  berry:    { n: '小浆果' }, meat:     { n: '肉肉' },
  grass:    { n: '青草' },   corn:     { n: '玉米' },
  acorn:    { n: '橡果' },
  /* 食性三盘（dietclass 候选——盘面图标承载语义，零文字可辨；名不入语音） */
  plmeat:   { n: '肉肉盘' }, plgrass:  { n: '青草盘' }, plmix: { n: '都吃盘' }
};

/* ---------- r11 食性分类表（ch3 dietclass 真值；肉食 2/草食 3/杂食 5——封闭分类） ----------
   肉食=cat,wolf（吃鱼吃肉）/ 草食=rabbit,panda,sheep（吃菜吃草吃竹）/ 杂食=monkey,dog,
   mouse,bear,squirrel（荤素都吃）——与 MULTI 多食表同构可归纳（猫狼两食皆荤、兔羊两食皆素）。 */
const DIET = {
  cat: 'meat', wolf: 'meat',
  rabbit: 'grass', panda: 'grass', sheep: 'grass',
  monkey: 'mix', dog: 'mix', mouse: 'mix', bear: 'mix', squirrel: 'mix'
};
const DIET_PLATE = { meat: 'plmeat', grass: 'plgrass', mix: 'plmix' };   // 类别 → 盘 id
const PLATES = ['plmeat', 'plgrass', 'plmix'];

/* ---------- r11 多食表（ch2 multifood 真值：每动物恰 2 食，主经典对+次常见食） ---------- */
const MULTI = {
  rabbit: ['carrot', 'greens'],  panda: ['bamboo', 'apple'],
  monkey: ['banana', 'apple'],   cat: ['fish', 'meat'],
  dog: ['bone', 'meat'],         mouse: ['cheese', 'corn'],
  bear: ['honey', 'berry'],      squirrel: ['pinecone', 'acorn'],
  wolf: ['meat', 'bone'],        sheep: ['grass', 'greens']
};
/* r11 干扰公平表（multifood 干扰白名单，手审每动物 ≥3 项且与 MULTI[动物] 无交集——
   半有效排除：兔/熊猫/羊不吃荤、猫/狼不吃素、其余取他动物的强绑定食（骨头=狗/奶酪=鼠…），
   防「现实中也吃」半有效干扰误判——iftrain v2 干扰公平性同规） */
const DISTRACT_OK = {
  rabbit: ['fish', 'bone', 'cheese', 'meat'],
  panda: ['fish', 'bone', 'cheese', 'meat'],
  sheep: ['fish', 'bone', 'cheese', 'meat'],
  cat: ['carrot', 'bamboo', 'banana', 'pinecone'],
  wolf: ['carrot', 'banana', 'apple', 'corn'],
  monkey: ['cheese', 'bone', 'fish'],
  dog: ['bamboo', 'cheese', 'pinecone'],
  mouse: ['bone', 'bamboo', 'honey'],
  bear: ['cheese', 'bamboo', 'carrot'],
  squirrel: ['fish', 'cheese', 'meat']
};

/* ---------- r11 食物链表（ch4 chaindir 真值：17 对 eater→eaten，表外不出题）
   动物-动物子集（真方向判定，每关 ≥2 对）：狼吃羊/猫吃老鼠/猫吃小鱼/熊抓鱼；
   其余为动物-食物向（生活经验+animate 方向锚定）。出示序=题面卡序（seeded 洗牌，
   点「吃的一方」——answer= eater 在 opts 的下标）。 ---------- */
const CHAIN = [
  { eater: 'wolf', eaten: 'sheep' },   { eater: 'cat', eaten: 'mouse' },
  { eater: 'cat', eaten: 'fish' },     { eater: 'bear', eaten: 'fish' },
  { eater: 'bear', eaten: 'honey' },   { eater: 'sheep', eaten: 'grass' },
  { eater: 'panda', eaten: 'bamboo' }, { eater: 'rabbit', eaten: 'carrot' },
  { eater: 'monkey', eaten: 'banana' },{ eater: 'mouse', eaten: 'cheese' },
  { eater: 'dog', eaten: 'bone' },     { eater: 'squirrel', eaten: 'pinecone' },
  { eater: 'squirrel', eaten: 'acorn' },{ eater: 'monkey', eaten: 'apple' },
  { eater: 'mouse', eaten: 'corn' },   { eater: 'wolf', eaten: 'meat' },
  { eater: 'rabbit', eaten: 'greens' }
];
const CHAIN_PREY = CHAIN.filter(p => ANIMALS10.indexOf(p.eaten) >= 0 || p.eaten === 'fish');   // 动物-动物向（鱼计猎物）

/* ---------- 错反馈方向级语义句（TTS 拼句，SPEC §0.76 r11；keyless 恒链尾——契约 N；
   无数字词——契约 L 豁免款；estMs(n)=n×345+600：8 字=3360 / 7 字=3015） ---------- */
const FOOD_AGAIN = '再看看它爱吃什么';      // findfood 错链尾（8 字）
const WHO_AGAIN = '再想想谁爱吃这个';       // findwho 错链尾（8 字）
const DIET_AGAIN = '再想想它吃什么';        // dietclass 错链尾（7 字——不提肉/草哪边，不泄答案）
const CHAIN_AGAIN = '再想一想，谁吃谁';     // chaindir 错链尾（8 字含逗号——方向锚不泄答案）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言+off-by-one 哨兵） ---------- */
const CHAPTERS = {
  1: { name: '谁爱吃什么', hint: '爱吃的可能不止一样哦' },   // 预告 ch2 multifood 多食全选
  2: { name: '都要点上',   hint: '有的吃肉，有的吃草' },     // 预告 ch3 dietclass 食性分类
  3: { name: '它吃哪一盘', hint: '谁吃谁，想一想' },         // 预告 ch4 chaindir 食物链方向
  4: { name: '谁吃谁',     hint: '新一轮帮小动物点餐' }      // 预告生成关
};
const GEN_HINTS = ['正着问反着问都要会',    // dch1 两族配对混出
                   '爱吃的都要点上哦',      // dch2 multifood 全选
                   '想想它吃肉还是吃草',    // dch3 dietclass 食性分类
                   '谁吃谁，想一想'];       // dch4 chaindir 方向判定
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=anm_ 已核
   manifest 无占用，b28 立规先查）。clip 实长（_clipdur31.json，浏览器 Audio 实测）：
   tut_watch 3096 / tut_turn 1824 / hint 2016 / right 2256（判对后窗 ≥2556）/ wrong 1656
   / q1 1968 / q2 1944；名音 anm_n_*（v1 16 条）：carrot 1560 / squirrel 1464 / bear 1440
   / pinecone 1440 / banana 1416 / fish 1416 / dog 1416 / mouse 1416 / rabbit 1368 / bamboo 1368
   / monkey 1368 / cat 1368 / honey 1368 / panda 1392 / bone 1344 / cheese 1344
   r11 新增 16 条（2026-09-14 实测）：q_multi 2160 / q_diet 2184 / q_chain 1776 / less 2832
   / more 3072 / h_diet 2736 / h_chain 2544；新名音：berry 1680 / sheep 1632 / wolf 1584
   / acorn 1464 / apple 1440 / grass 1416 / greens 1392 / meat 1392 / corn 1344
   （全集名音 max 1680=berry / 动物名音 max 1632=sheep——确认链单名 right+150+1632+300=4338
   ≤4400；multifood 双名 max honey+berry=3048 → 2256+150+3048+300=5754 ≤6400；
   错链最长 chaindir=两名 3216+300+3360+300=7176 ≤7800 窗） */
const VOICE = {
  watch: { key: 'anm_tut_watch', text: '看！帮小动物点餐' },
  turn:  { key: 'anm_tut_turn',  text: '你来点一点' },
  hint:  { key: 'anm_hint',      text: '再看看想一想' },
  right: { key: 'anm_right',     text: '点对啦，真棒' },
  wrong: { key: 'anm_wrong',     text: '再想一想' },
  q1:    { key: 'anm_q1',        text: '它爱吃什么呀' },
  q2:    { key: 'anm_q2',        text: '谁爱吃这个呀' },
  /* r11 新增（multifood/dietclass/chaindir 题面+提交反馈+方向提示；既有 7 条一字不改） */
  qMulti: { key: 'anm_q_multi', text: '它爱吃的都要呀' },      // multifood 题面句
  qDiet:  { key: 'anm_q_diet',  text: '它该吃哪一盘呀' },      // dietclass 题面句
  qChain: { key: 'anm_q_chain', text: '谁吃谁呀' },            // chaindir 题面句
  less:   { key: 'anm_less',    text: '还差一样，再找一找哦' }, // 提交少选（保留继续）
  more:   { key: 'anm_more',    text: '多选了一样，重新挑一挑哦' }, // 提交多选（清空+miss）
  hDiet:  { key: 'anm_h_diet',  text: '想一想，它爱吃什么' },   // dietclass 方向提示（不泄答案）
  hChain: { key: 'anm_h_chain', text: '想一想，谁吃谁' }       // chaindir 方向提示（不泄答案）
};
const nameClip = id => 'anm_n_' + id;        // 名音键（晓晓读中文名，25 互异=动物 10+食物 15）

/* ---------- 动物/食物 SVG 库（viewBox 0 0 120 120；家族暖卡通风：INK 描边+暖填充+腮红）
   16 幅互异可一眼辨识（5-6 岁图形认知）：动物 8 各带标志特征（兔长耳/熊猫黑眼圈/猴圆耳卷尾
   /猫尖耳胡须/狗垂耳/鼠大耳细尾/熊圆耳大鼻/松鼠大尾巴），食物 8 形态互异（橙锥/绿节竿/黄弯月
   /蓝鱼/白骨/黄楔孔/琥珀罐/棕鳞塔）。
   根组 g[data-anim] = 图 id——契约 M 帧内容断言锚（渲染即引擎对账依据）。 */
const CHEEK = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>';
const EYE = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 4.2) + '" fill="' + INK + '"/>';
const EYE2 = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 5.6) + '" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="' + (x + 1.5) + '" cy="' + (y + 0.5) + '" r="' + ((r || 5.6) * 0.42) + '" fill="' + INK + '"/>';

const ANIMAL_ELS = {
  /* 兔子：白身竖长耳粉内耳+菱形鼻兔唇（长耳——8 动物中独有） */
  rabbit:
    '<path d="M44 46 q-6 -30 1 -38 q6 9 7 36 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M76 46 q6 -30 -1 -38 q-6 9 -7 36 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M45 40 q-3 -20 0 -27 q4 6 4 25 Z" fill="#F2B8C6"/>' +
    '<path d="M75 40 q3 -20 0 -27 q-4 6 -4 25 Z" fill="#F2B8C6"/>' +
    '<ellipse cx="60" cy="86" rx="26" ry="17" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="45" cy="90" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="75" cy="90" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="58" r="27" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE2(49, 54, 5.6) + EYE2(71, 54, 5.6) +
    '<path d="M60 63 l-3.2 3 l3.2 3 l3.2 -3 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M60 69 q-1 5 -8 4 M60 69 q1 5 8 4" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    CHEEK(39, 64) + CHEEK(81, 64),
  /* 熊猫：白身黑耳黑眼圈黑肩斑（黑白配色——8 动物中独有） */
  panda:
    '<circle cx="36" cy="32" r="10" fill="#3E342B" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="84" cy="32" r="10" fill="#3E342B" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="60" cy="86" rx="28" ry="18" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="37" cy="79" rx="9" ry="12" fill="#3E342B" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="83" cy="79" rx="9" ry="12" fill="#3E342B" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="56" r="27" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="47" cy="51" rx="9" ry="11" fill="#3E342B" transform="rotate(-14 47 51)"/>' +
    '<ellipse cx="73" cy="51" rx="9" ry="11" fill="#3E342B" transform="rotate(14 73 51)"/>' +
    '<circle cx="48" cy="51" r="3.2" fill="#FFF"/><circle cx="72" cy="51" r="3.2" fill="#FFF"/>' +
    '<ellipse cx="60" cy="66" rx="6" ry="4.6" fill="#3E342B"/>' +
    '<path d="M60 70 v3 M60 73 q-5 5 -10 2 M60 73 q5 5 10 2" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    CHEEK(38, 65) + CHEEK(82, 65),
  /* 猴子：棕头米色心形脸+大圆耳粉心+右侧卷尾（圆耳卷尾——独有） */
  monkey:
    '<circle cx="31" cy="48" r="11" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="31" cy="48" r="5" fill="#F2B8C6"/>' +
    '<circle cx="89" cy="48" r="11" fill="#B98A5E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="89" cy="48" r="5" fill="#F2B8C6"/>' +
    '<path d="M92 90 q18 2 16 -16" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="84" rx="26" ry="17" fill="#B98A5E" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="84" rx="15" ry="9" fill="#EFD9BC" opacity=".9"/>' +
    '<circle cx="60" cy="56" r="27" fill="#C99B6E" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M38 52 q22 -13 44 0 q-5 18 -22 21 q-17 -3 -22 -21 Z" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    EYE2(49, 55, 5.2) + EYE2(71, 55, 5.2) +
    '<circle cx="60" cy="64" r="2.6" fill="' + INK + '"/>' +
    '<path d="M54 69 q6 5 12 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(41, 64) + CHEEK(79, 64),
  /* 小猫：橘色尖耳三角粉内耳+额头条纹+胡须（尖耳胡须——与狗垂耳互辨） */
  cat:
    '<path d="M36 42 L30 18 L52 30 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M84 42 L90 18 L68 30 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M36 39 L33 25 L44 32 Z" fill="#F2B8C6"/><path d="M84 39 L87 25 L76 32 Z" fill="#F2B8C6"/>' +
    '<ellipse cx="60" cy="86" rx="26" ry="16" fill="#F5A24B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M44 80 q4 8 0 12 M76 80 q-4 8 0 12" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="60" cy="56" r="27" fill="#F8B661" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M53 33 q3 -4 6 0 M62 33 q3 -4 6 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    EYE2(49, 53, 5.6) + EYE2(71, 53, 5.6) +
    '<path d="M57 64 l3 3 l3 -3" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M50 69 q10 7 20 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 60 h-13 M28 66 l-12 4 M92 60 h13 M92 66 l12 4" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    CHEEK(38, 63) + CHEEK(82, 63),
  /* 小狗：奶白脸+两侧棕垂耳+额棕斑（垂耳——与猫尖耳互辨） */
  dog:
    '<path d="M28 46 q-9 22 2 32 q10 6 13 -9 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M92 46 q9 22 -2 32 q-10 6 -13 -9 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="86" rx="27" ry="17" fill="#EAD3B0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="58" r="28" fill="#F2E0C4" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="42" cy="46" rx="10" ry="8" fill="#C89A6B" opacity=".85"/>' +
    '<ellipse cx="78" cy="46" rx="10" ry="8" fill="#C89A6B" opacity=".85"/>' +
    EYE2(49, 55, 5.8) + EYE2(71, 55, 5.8) +
    '<ellipse cx="60" cy="70" rx="7" ry="5.4" fill="' + INK + '"/>' +
    '<path d="M60 75 q0 5 -8 5 M60 75 q0 5 8 5" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(37, 66) + CHEEK(83, 66),
  /* 老鼠：灰蓝小身+超大圆耳粉心+右侧细折尾（大耳细尾体小——独有） */
  mouse:
    '<path d="M86 86 q20 8 24 -10 q-13 3 -15 -7" fill="#9FB4C4" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="38" cy="38" r="13" fill="#9FB4C4" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="38" cy="38" r="6.4" fill="#F2B8C6"/>' +
    '<circle cx="82" cy="38" r="13" fill="#9FB4C4" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="82" cy="38" r="6.4" fill="#F2B8C6"/>' +
    '<ellipse cx="60" cy="84" rx="24" ry="15" fill="#AEC0CD" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="60" r="25" fill="#AEC0CD" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE2(50, 57, 5.4) + EYE2(70, 57, 5.4) +
    '<circle cx="60" cy="68" r="3.4" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M60 71 q0 4 -7 4 M60 71 q0 4 7 4" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 63 h8 M62 63 h8" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>' +
    CHEEK(42, 66) + CHEEK(78, 66),
  /* 小熊：棕色圆耳+米色口鼻垫+大黑鼻（圆耳大鼻憨态——与狗猫互辨） */
  bear:
    '<circle cx="37" cy="36" r="10" fill="#B98052" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="83" cy="36" r="10" fill="#B98052" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="60" cy="86" rx="28" ry="17" fill="#B98052" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="56" r="28" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="70" rx="13" ry="9.5" fill="#F6E7CF" stroke="' + INK + '" stroke-width="2.8"/>' +
    EYE2(48, 52, 5.4) + EYE2(72, 52, 5.4) +
    '<ellipse cx="60" cy="65" rx="5.4" ry="4.2" fill="' + INK + '"/>' +
    '<path d="M60 69 v3 M60 72 q-4 4 -8 1 M60 72 q4 4 8 1" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    CHEEK(37, 62) + CHEEK(83, 62),
  /* 松鼠：橘棕身+右侧大S蓬尾+耳簇+白门牙（大尾巴——8 动物中独有） */
  squirrel:
    '<path d="M76 84 Q112 82 106 44 Q102 22 84 30 Q98 46 88 66 Q82 78 70 82 Z" fill="#D98E4A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="56" cy="82" rx="24" ry="16" fill="#D98E4A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="52" cy="54" r="25" fill="#E8A763" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M34 38 q-9 -7 -13 -2 q1 8 9 12 Z" fill="#E8A763" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M66 36 q4 -10 11 -9 q1 9 -6 14 Z" fill="#E8A763" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    EYE2(43, 52, 5.4) + EYE2(63, 52, 5.4) +
    '<ellipse cx="52" cy="64" rx="4.2" ry="3.2" fill="' + INK + '"/>' +
    '<path d="M52 67 v3 M52 70 q-4 4 -8 1 M52 70 q4 4 8 1" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<rect x="49.5" y="71" width="3" height="5.5" rx="1.2" fill="#FFF" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="53.5" y="71" width="3" height="5.5" rx="1.2" fill="#FFF" stroke="' + INK + '" stroke-width="1.6"/>' +
    CHEEK(33, 60) + CHEEK(72, 60) +
    '<ellipse cx="38" cy="92" rx="8" ry="5.5" fill="#E8A763" stroke="' + INK + '" stroke-width="2.6"/>',
  /* r11 大灰狼：灰身直立刻耳+尖吻露牙+斜眉（直立刻耳+牙——与狗垂耳/猫尖耳胡须互辨） */
  wolf:
    '<path d="M34 42 L24 12 L52 28 Z" fill="#AEB9C4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M35 38 L29 20 L45 30 Z" fill="#7E8B99"/>' +
    '<path d="M86 42 L96 12 L68 28 Z" fill="#AEB9C4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M85 38 L91 20 L75 30 Z" fill="#7E8B99"/>' +
    '<ellipse cx="60" cy="88" rx="27" ry="17" fill="#9BA8B5" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="56" r="27" fill="#AEB9C4" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M38 46 L52 50 M82 46 L68 50" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    EYE2(48, 56, 5.4) + EYE2(72, 56, 5.4) +
    '<ellipse cx="60" cy="72" rx="12" ry="9" fill="#E4E9EE" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="60" cy="68" rx="4.6" ry="3.4" fill="' + INK + '"/>' +
    '<path d="M52 75 q8 6 16 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M53 75 l3 6 l3 -5 M64 75 l3 5 l3 -6" fill="#FFF" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    CHEEK(38, 64) + CHEEK(82, 64),
  /* r11 小绵羊：奶油云朵卷毛身+深灰小脸垂耳+小细腿（云朵毛——8+2 动物中独有） */
  sheep:
    '<circle cx="34" cy="44" r="12" fill="#F6EFE0" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="86" cy="44" r="12" fill="#F6EFE0" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="40" cy="34" r="13" fill="#FBF6EC" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="80" cy="34" r="13" fill="#FBF6EC" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="30" r="14" fill="#F6EFE0" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="60" cy="76" rx="32" ry="20" fill="#FBF6EC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="46" cy="70" r="9" fill="#F6EFE0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="74" cy="70" r="9" fill="#F6EFE0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="60" cy="82" r="10" fill="#F6EFE0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="60" cy="56" r="21" fill="#8A8FA0" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<ellipse cx="41" cy="56" rx="6.5" ry="9" fill="#767B8C" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-16 41 56)"/>' +
    '<ellipse cx="79" cy="56" rx="6.5" ry="9" fill="#767B8C" stroke="' + INK + '" stroke-width="2.4" transform="rotate(16 79 56)"/>' +
    EYE2(52, 54, 5) + EYE2(68, 54, 5) +
    '<path d="M60 62 l-2.6 2.6 l2.6 2.6 l2.6 -2.6 Z" fill="' + INK + '"/>' +
    '<path d="M60 68 q0 4 -7 3 M60 68 q0 4 7 3" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M46 96 v8 M74 96 v8" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    CHEEK(47, 62) + CHEEK(73, 62)
};

const FOOD_ELS = {
  /* 胡萝卜：橙色长锥+横纹+顶部三片绿叶（橙锥——独有） */
  carrot:
    '<path d="M48 34 q-13 -9 -21 -5 q7 11 19 11 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M72 34 q13 -9 21 -5 q-7 11 -19 11 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M60 30 q-2 -14 0 -20 q6 8 4 20 Z" fill="#9AD37B" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M60 36 Q42 42 38 58 L58 104 Q60 108 62 104 L82 58 Q78 42 60 36 Z" fill="#F08C4A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M46 62 q14 5 28 0 M50 76 q10 4 20 0 M55 90 q5 3 10 0" stroke="#D9713A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  /* 竹子：两根绿节竿+节线+侧叶（绿节竿——独有） */
  bamboo:
    '<rect x="34" y="28" width="13" height="76" rx="6" fill="#8FC86C" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M34 54 h13 M34 78 h13" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="58" y="18" width="13" height="86" rx="6" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M58 44 h13 M58 70 h13 M58 94 h13" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M71 30 q17 -10 27 -2 q-12 11 -27 2 Z" fill="#9AD37B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M47 58 q-17 -9 -27 0 q12 11 27 0 Z" fill="#9AD37B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  /* 香蕉：黄色弯月+两端棕+内侧棱线（黄弯月——独有） */
  banana:
    '<path d="M24 58 Q26 92 58 102 Q92 111 103 80 L96 77 Q86 98 60 92 Q34 84 32 58 Q31 50 26 51 Q23 53 24 58 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M36 64 q8 20 30 26" stroke="#E8A23C" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M97 76 l7 4 -4 6 -6 -4 Z" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="28" cy="52" r="4" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2.2"/>',
  /* 小鱼：蓝身白肚+右展尾+背鳍+眼+泡泡（蓝鱼——独有） */
  fish:
    '<circle cx="16" cy="36" r="3" fill="#BFE3F2"/><circle cx="22" cy="24" r="2.2" fill="#BFE3F2"/>' +
    '<path d="M86 60 L108 42 L102 60 L108 78 Z" fill="#8FB4C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M48 44 q8 -15 21 -11 q-2 10 -8 17 Z" fill="#8FB4C6" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M18 60 Q40 36 70 46 Q84 52 88 60 Q84 68 70 74 Q40 84 18 60 Z" fill="#7FA8BC" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M24 65 Q42 77 64 72" stroke="#B7D2DE" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    EYE(30, 56, 4) +
    '<path d="M40 50 q6 9 0 19" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  /* 骨头：白色横杆两端双球+高光（白骨——独有） */
  bone:
    '<circle cx="31" cy="47" r="10.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="31" cy="73" r="10.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="89" cy="47" r="10.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="89" cy="73" r="10.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<rect x="29" y="50" width="62" height="20" fill="#FBF7F0"/>' +
    '<path d="M31 50 h58 M31 70 h58" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M42 57 q12 -4 24 0" stroke="#E5DCC8" stroke-width="3" fill="none" stroke-linecap="round"/>',
  /* 奶酪：黄色楔块+深黄圆孔+顶弧（黄楔孔——独有） */
  cheese:
    '<path d="M16 88 Q60 24 104 68 L104 88 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<circle cx="54" cy="66" r="7" fill="#E8A23C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="78" cy="76" r="5" fill="#E8A23C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="66" cy="46" r="4" fill="#E8A23C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="88" cy="60" r="3.4" fill="#E8A23C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M22 88 h82" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>',
  /* 蜂蜜：琥珀罐+木盖+蜜滴+高光（琥珀罐——独有） */
  honey:
    '<ellipse cx="60" cy="34" rx="28" ry="9" fill="#B98052" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M38 42 q-9 7 -9 19 v22 q0 13 13 13 h36 q13 0 13 -13 v-22 q0 -12 -9 -19 Z" fill="#E8A23C" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M42 62 q18 -7 36 0" stroke="#F8D667" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M76 96 q-6 8 0 13 q6 -5 0 -13 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="46" cy="82" r="4.5" fill="#F8D667" opacity=".85"/>',
  /* 松果：棕色鳞塔轮廓+层叠鳞弧+顶枝（棕鳞塔——独有） */
  pinecone:
    '<path d="M42 84 Q39 58 52 46 Q60 40 68 46 Q81 58 78 84 Q60 97 42 84 Z" fill="#B98052" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M45 84 q15 8 30 0 M47 73 q13 8 26 0 M51 63 q9 7 18 0 M55 54 q5 6 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 40 q0 -8 3 -13 M60 40 q-5 -6 -10 -8" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
  /* r11 苹果：红圆果+高光+短柄+单叶（红圆——与浆果簇/香蕉互辨） */
  apple:
    '<path d="M60 38 q-6 -10 -2 -18" stroke="#8A5A2B" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 26 q14 -8 22 2 q-12 10 -22 -2 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M60 40 q-16 -8 -26 4 q-4 26 14 42 q6 5 12 2 q6 3 12 -2 q18 -16 14 -42 q-10 -12 -26 -4 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M46 52 q-4 10 0 20" stroke="#F8B4A8" stroke-width="4" fill="none" stroke-linecap="round"/>',
  /* r11 青菜：白梗三层+深绿圆叶（白梗绿冠——与青草细叶互辨） */
  greens:
    '<path d="M52 44 q-14 4 -14 20 v34 h12 Z" fill="#F4EFE2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M68 44 q14 4 14 20 v34 h-12 Z" fill="#F4EFE2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 40 q-4 6 -4 24 v34 h8 v-34 q0 -18 -4 -24 Z" fill="#FBF7EC" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 44 q-22 -6 -26 8 q2 14 20 14 q4 0 6 -6 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 44 q22 -6 26 8 q-2 14 -20 14 q-4 0 -6 -6 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 38 q-10 -14 0 -24 q10 10 0 24 Z" fill="#9AD37B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M44 98 q16 6 32 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  /* r11 小浆果：紫红三粒簇+小叶+高光点（三粒簇——与苹果单果互辨） */
  berry:
    '<path d="M60 34 q10 -10 20 -4 q-8 12 -20 6 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="44" cy="62" r="16" fill="#9C4A8C" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="76" cy="62" r="16" fill="#8C3E7E" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="60" cy="86" r="16" fill="#A85599" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="39" cy="57" r="3.6" fill="#D9A0CC" opacity=".9"/>' +
    '<circle cx="71" cy="57" r="3.6" fill="#D9A0CC" opacity=".9"/>' +
    '<circle cx="55" cy="81" r="3.6" fill="#D9A0CC" opacity=".9"/>',
  /* r11 肉肉：粉腿肉+白骨柄双球（火腿腿——与白骨双端互辨） */
  meat:
    '<circle cx="24" cy="84" r="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="24" cy="100" r="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="28" y="84" width="14" height="12" transform="rotate(28 35 90)" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M38 84 Q40 56 66 46 Q96 36 102 60 Q108 84 78 90 Q52 96 38 84 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M62 56 q10 -6 20 0" stroke="#F8C9A0" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="82" cy="64" r="3" fill="#C96F3C"/>',
  /* r11 青草：丛生细叶+土丘（细叶丛——与青菜白梗互辨） */
  grass:
    '<ellipse cx="60" cy="98" rx="30" ry="7" fill="#D9C4A0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M60 96 Q56 60 42 34 Q54 56 56 96 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M60 96 Q60 52 60 26 Q66 54 64 96 Z" fill="#9AD37B" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M64 96 Q70 58 84 36 Q74 60 68 96 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M54 96 Q48 68 36 56 Q46 72 50 96 Z" fill="#9AD37B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M68 96 Q76 70 88 60 Q78 76 74 96 Z" fill="#9AD37B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  /* r11 玉米：黄穗+粒纹网格+双绿壳叶（黄穗网格——独有） */
  corn:
    '<ellipse cx="60" cy="56" rx="20" ry="36" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M48 42 h24 M48 56 h24 M48 70 h24 M54 30 v60 M66 30 v60" stroke="#D9A03C" stroke-width="2.2"/>' +
    '<path d="M60 30 q-2 -10 0 -16" stroke="#8A5A2B" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M46 86 q-16 4 -18 22 q16 -2 24 -14 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M74 86 q16 4 18 22 q-16 -2 -24 -14 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
  /* r11 橡果：棕椭圆果+格纹帽+短柄（帽+椭圆——与松果鳞塔互辨） */
  acorn:
    '<path d="M60 26 q0 -6 2 -10" stroke="#8A5A2B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M34 42 q0 -16 26 -16 q26 0 26 16 Z" fill="#8A5A2B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 36 h40 M48 30 v10 M60 28 v12 M72 30 v10" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M40 44 Q38 84 60 96 Q82 84 80 44 Q60 52 40 44 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M50 58 q10 6 20 0" stroke="#B98052" stroke-width="3" fill="none" stroke-linecap="round"/>'
};

/* ---------- r11 食性三盘 SVG（dietclass 候选卡；盘面内容承载类别语义，零文字可辨：
   plmeat=肉腿+鱼 / plgrass=草丛+菜叶 / plmix=肉腿+草丛——混盘左右各一荤一素） ---------- */
const PLATE_BASE =
  '<ellipse cx="60" cy="76" rx="52" ry="30" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
  '<ellipse cx="60" cy="72" rx="40" ry="21" fill="#FBF2DE" stroke="#D8C9B4" stroke-width="2.4"/>';
const MEAT_MINI =
  '<circle cx="30" cy="70" r="4.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="1.8"/>' +
  '<path d="M34 68 Q36 54 48 50 Q60 46 62 56 Q64 66 50 68 Q40 70 34 68 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>';
const FISH_MINI =
  '<path d="M72 62 L84 54 L81 62 L84 70 Z" fill="#8FB4C6" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M60 62 Q68 52 78 62 Q68 72 60 62 Z" fill="#7FA8BC" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
  EYE(65, 60, 2.4);
const GRASS_MINI =
  '<path d="M34 72 Q32 56 26 46 Q34 58 36 72 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<path d="M40 72 Q40 50 40 38 Q46 54 44 72 Z" fill="#9AD37B" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<path d="M48 72 Q52 56 60 48 Q52 62 52 72 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>';
const LEAF_MINI =
  '<path d="M62 66 q10 -10 20 -4 q-8 12 -20 6 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
  '<path d="M64 68 q8 -2 14 -4" stroke="' + INK + '" stroke-width="1.4" fill="none" stroke-linecap="round"/>';
const PLATE_ELS = {
  plmeat:  PLATE_BASE + MEAT_MINI + FISH_MINI,
  plgrass: PLATE_BASE + GRASS_MINI + LEAF_MINI,
  plmix:   PLATE_BASE + MEAT_MINI + GRASS_MINI
};

/* 图 SVG 工厂：animSvg(id, size)——size 缺省 100；根组 g[data-anim]=id（契约 M 锚；
   r11：PLATE_ELS 三盘亦入工厂（dietclass 候选卡与动物/食物同通道渲染） */
function animSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="100" height="100"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + id + '">' + (ANIMAL_ELS[id] || FOOD_ELS[id] || PLATE_ELS[id]) + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 兔子抱胡萝卜（点餐主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M18 17 q-1.6 -8 0.4 -10.5 q2 2.5 2.2 9.5 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M25 17 q1.6 -8 -0.4 -10.5 q-2 2.5 -2.2 9.5 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="23" cy="22" r="8.5" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="20" cy="21" r="1.2" fill="' + INK + '"/><circle cx="26" cy="21" r="1.2" fill="' + INK + '"/>' +
    '<path d="M34 40 q-5 -1 -4 -6 q5 0 4 6 Z" fill="#F08C4A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M31 33 q-2 -4 -1 -6 q3 2 2 6 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* r11 勾选徽章（multifood .held 卡右上角绿圆白勾——iftrain v2 同款） */
  check: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 13 l5.5 5.5 L20 6.5" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* r11「点好啦」提交钮：小餐盘+大对勾（multifood 提交入口，weather v2/iftrain v2 先例） */
  go: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="32" cy="40" rx="24" ry="13" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="3"/>' +
    '<ellipse cx="32" cy="38" rx="16" ry="7.5" fill="#FBF2DE" stroke="#D8C9B4" stroke-width="2"/>' +
    '<path d="M22 33 l6 6 L44 24" stroke="#6FA063" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
