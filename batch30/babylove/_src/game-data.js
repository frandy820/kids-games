/* ================= babylove 动物宝宝找妈妈 游戏数据（r10 难度改造 2026-09-14，AUDIT-56 #28）
   配对封闭 12（原 6 扩容——审计「6 对第 2 章见底」根治）：
     tadpole 蝌蚪→frog 青蛙(水) / fishfry 鱼苗→fish 大鱼(水) / duckling 小鸭→duck 大鸭(水)
     / caterpillar 毛毛虫→butterfly 蝴蝶(林) / grub 甲虫幼虫→beetle 甲虫(林)
     / chick 小鸡→hen 母鸡(草) / puppy 小狗→dog 大狗(草) / kitten 小猫→cat 大猫(草)
     / calf 牛犊→cow 奶牛(草) / lamb 小羊→sheep 大羊(草) / piglet 小猪→pig 大猪(草)
     / foal 小马→horse 大马(草)（幼体/成体名各 12 互异，两代 SVG 各 12 幅+卵 6 幅）。
   题型四族（每题=3 步/小问；tapOpt 返回 'step'/'right'/'done'/'wrong'/null）：
     findmom 3 连小问：出示幼体（名音+q1）→点成体卡 4 候选（12 对池，量扩根治见底）
     findbaby 3 连小问：出示成体（名音+q2）→点幼体卡 4 候选（ch2+ 近形干扰）
     grow 发育链三段序：出示链成体大图+q3，三张乱序阶段卡（卵→幼→成）逐点点选
     （发育阶段排序=序结构认知，非单纯配对；已点卡 done 淡化——storybed 先例）
     habitat 生境×发育双维：出示生境场景图+拼句（bab_h_<hab>+q4_mom/baby）→4 候选
     2×2 干扰结构（同生境异阶段/异生境同阶段/双异 各恰 1）——双条件合取筛选。
   近形干扰（审计建议行 79）：CONFUSABLE tadpole↔fishfry、caterpillar↔grub——ch2+ findbaby
   幼体候选题 4 候选必含近形伴恰 1 位（干扰=相似辨析非随机异对）。habitat 不设近形位
   （SPEC §7.1：2×2 四池象限互不相交已足构干扰，近形位会破坏象限结构——m-1 注释勘正）。
   点对（非题尾步）=名音确认（step 窗）；题尾步=bab_right+名音拼播（名音 clip 段在
   keyless 段前——全 clip 链无 keyless，契约 N）；点错=bab_wrong+语义句 TTS
   （keyless 恒链尾）+题面再 pulse 方向级回锚。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 配对封闭 12（r10：表外不出题；幼体 id → 成体 id） ---------- */
const PAIRS6 = {                              // 键名承家族口径（=配对封闭表）
  tadpole: 'frog', caterpillar: 'butterfly', chick: 'hen',
  puppy: 'dog', kitten: 'cat', calf: 'cow',
  fishfry: 'fish', duckling: 'duck', grub: 'beetle',
  lamb: 'sheep', piglet: 'pig', foal: 'horse'
};
const BABIES6 = ['tadpole', 'caterpillar', 'chick', 'puppy', 'kitten', 'calf',
                 'fishfry', 'duckling', 'grub', 'lamb', 'piglet', 'foal'];
const ADULTS6 = ['frog', 'butterfly', 'hen', 'dog', 'cat', 'cow',
                 'fish', 'duck', 'beetle', 'sheep', 'pig', 'horse'];
const babyOf = a => { for (let i = 0; i < BABIES6.length; i++) if (PAIRS6[BABIES6[i]] === a) return BABIES6[i]; return null; };
const nameOf = id => ANIMALS[id].n;
const ANIMALS = {
  tadpole:    { n: '蝌蚪' },
  caterpillar:{ n: '毛毛虫' },
  chick:      { n: '小鸡' },
  puppy:      { n: '小狗' },
  kitten:     { n: '小猫' },
  calf:       { n: '牛犊' },
  fishfry:    { n: '鱼苗' },
  duckling:   { n: '小鸭' },
  grub:       { n: '甲虫幼虫' },
  lamb:       { n: '小羊' },
  piglet:     { n: '小猪' },
  foal:       { n: '小马' },
  frog:       { n: '青蛙' },
  butterfly:  { n: '蝴蝶' },
  hen:        { n: '母鸡' },
  dog:        { n: '大狗' },
  cat:        { n: '大猫' },
  cow:        { n: '奶牛' },
  fish:       { n: '大鱼' },
  duck:       { n: '大鸭' },
  beetle:     { n: '甲虫' },
  sheep:      { n: '大羊' },
  pig:        { n: '大猪' },
  horse:      { n: '大马' },
  egg_frog:   { n: '青蛙卵' },
  egg_butterfly: { n: '蝴蝶卵' },
  egg_beetle: { n: '甲虫卵' },
  egg_fish:   { n: '鱼卵' },
  egg_hen:    { n: '鸡蛋' },
  egg_duck:   { n: '鸭蛋' }
};

/* ---------- 近形干扰对（审计 r10：相似辨析——蝌蚪vs鱼苗 / 毛虫vs甲虫幼虫）
   ch2+ findbaby 幼体候选题真值有近形伴时 4 候选必含伴恰 1 位（habitat 不设，见头注 m-1） */
const CONFUSABLE = { tadpole: 'fishfry', fishfry: 'tadpole',
                     caterpillar: 'grub', grub: 'caterpillar' };

/* ---------- 发育链 6（r10：卵→幼体→成体 三段序；链 id=成体 id）
   GROWTH[链][0]=卵（egg_* 专用 id）——排序题卡池=链三阶段乱序 */
const GROWTH = {
  frog:      ['egg_frog', 'tadpole', 'frog'],
  butterfly: ['egg_butterfly', 'caterpillar', 'butterfly'],
  beetle:    ['egg_beetle', 'grub', 'beetle'],
  fish:      ['egg_fish', 'fishfry', 'fish'],
  hen:       ['egg_hen', 'chick', 'hen'],
  duck:      ['egg_duck', 'duckling', 'duck']
};
const GROWTH_CHAINS = ['frog', 'butterfly', 'beetle', 'fish', 'hen', 'duck'];

/* ---------- 生境 3（r10：水/林/草原——habitat 题双维之一；动物→生境由封闭 12 推导） */
const HABITATS = ['water', 'forest', 'grass'];
const HAB_OF = {};                            // 动物 id → 生境 id（两代同境）
{
  const HAB_MAP = { tadpole: 'water', fishfry: 'water', duckling: 'water',
                    caterpillar: 'forest', grub: 'forest',
                    chick: 'grass', puppy: 'grass', kitten: 'grass', calf: 'grass',
                    lamb: 'grass', piglet: 'grass', foal: 'grass' };
  for (const b in HAB_MAP) { HAB_OF[b] = HAB_MAP[b]; HAB_OF[PAIRS6[b]] = HAB_MAP[b]; }
}
const HAB_NAME = { water: '水里', forest: '树林', grass: '草原' };

/* ---------- 错反馈语义句（TTS 拼句；flat≥3 只 10s 节流——契约 J；四题型各自方向级语义）
   findmom=「再看看它的妈妈长什么样」（11 字，estMs=11×345+600=4395）
   findbaby=「再看看这个宝宝是谁」（9 字，estMs=3705）
   grow=「再想想长大的顺序」（8 字，estMs=3360）
   habitat=「再看看它住在哪里」（8 字，estMs=3360）；无数字词——契约 L 豁免款 */
const MOM_AGAIN = '再看看它的妈妈长什么样';
const BABY_AGAIN = '再看看这个宝宝是谁';
const GROW_AGAIN = '再想想长大的顺序';
const HAB_AGAIN = '再看看它住在哪里';
/* T46 阶段2（2026-09-19）：语义句 clip 化——AGAIN_OF 值改键段对象（{key,text}，text=TTS 兜底；
   clip 实长 mom 2904 / baby 2880 / grow 2568 / hab 2688，原 estMs 字数口径退役） */
const AGAIN_OF = { findmom: { key: 'bab_again_mom', text: MOM_AGAIN },
                   findbaby: { key: 'bab_again_baby', text: BABY_AGAIN },
                   grow: { key: 'bab_again_grow', text: GROW_AGAIN },
                   habitat: { key: 'bab_again_hab', text: HAB_AGAIN } };

/* ---------- 章配置（章号 1 基；r10 五章；生成关 flat≥25 每关随机章参数 dch=ri(1,5)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言） */
const CHAPTERS = {
  1: { name: '宝宝找妈妈',   hint: '宝宝变多了，还要反过来找' }, // 预告 ch2 混出+近形
  2: { name: '找妈妈也找宝宝', hint: '宝宝要按长大的样子排队啦' }, // 预告 ch3 发育链
  3: { name: '长大排排队',   hint: '宝宝们都住在哪里呀' },       // 预告 ch4 生境双维
  4: { name: '谁住在这里',   hint: '什么都混在一起，大挑战' },   // 预告 ch5 四型混合
  5: { name: '大挑战',       hint: '新一轮帮宝宝找妈妈' }        // 预告生成关
};
const GEN_HINTS = ['四张卡里找妈妈',        // dch1 findmom 4 候选
                   '找妈妈，也找宝宝',      // dch2 两族混出+近形
                   '按长大的顺序排一排',    // dch3 发育链三段序
                   '找找它住在哪里',        // dch4 生境×发育双维
                   '宝宝妈妈大集合'];      // dch5 四型混合
const CH_LEN = 5;          // 5 题 = 1 关（每题=3 步/小问）
const STATIC_LEVELS = 25;  // 静态 25 关 = 5 章（r10：≥20 达标）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=bab_ 已核
   manifest 无占用）。r10 新增 25 键（通用 7+名音 18）；既有 19 键文本一字不改。
   clip 实长（浏览器 Audio 实测 2026-09-14）：
   tut_watch 3072 / tut_turn 1824 / hint 2016 / right 2280（判对后窗 ≥2580）/ wrong 1656
   / q1 2232 / q2 2184 / q3 2520 / grow_next 1488 / h_water 1728 / h_forest 1896
   / h_grass 2016 / q4_mom 2136 / q4_baby 2064；
   名音 bab_n_*：grub 1848（max） / egg_frog 1608 / egg_butterfly 1632 / egg_beetle 1632
   / piglet 1440 / foal 1416 / duckling 1392 / beetle 1392 / lamb 1392 / fishfry 1368
   / fish 1368 / sheep 1368 / pig 1368 / egg_fish 1368 / duck 1344 / horse 1344
   / egg_hen 1344 / egg_duck 1344 / 旧 12 键承 SPEC §4（caterpillar 1584 等）
   ——确认链 right+150+名音 max 1848+300 ≥4578（判对演出窗 1600+3200=4800 罩满） */
const VOICE = {
  watch: { key: 'bab_tut_watch', text: '看！帮宝宝找妈妈' },
  turn:  { key: 'bab_tut_turn',  text: '你来点一点' },
  hint:  { key: 'bab_hint',      text: '再看看想一想' },
  right: { key: 'bab_right',     text: '找对啦，真棒' },
  wrong: { key: 'bab_wrong',     text: '再想一想' },
  q1:    { key: 'bab_q1',        text: '它的妈妈是谁呀' },
  q2:    { key: 'bab_q2',        text: '这是谁的宝宝呀' },
  q3:    { key: 'bab_q3',        text: '它小时候是什么样呀' },
  growNext: { key: 'bab_grow_next', text: '然后呢' },
  hWater:   { key: 'bab_h_water',   text: '住在水里' },
  hForest:  { key: 'bab_h_forest',  text: '住在树林里' },
  hGrass:   { key: 'bab_h_grass',   text: '住在草原上' },
  q4Mom:    { key: 'bab_q4_mom',    text: '妈妈是哪一个呀' },
  q4Baby:   { key: 'bab_q4_baby',   text: '宝宝是哪一个呀' }
};
const HAB_CLIP = { water: 'hWater', forest: 'hForest', grass: 'hGrass' };
const nameClip = id => 'bab_n_' + id;        // 名音键（晓晓读中文名，30 互异）

/* ---------- 动物 SVG 库（viewBox 0 0 120 120；家族暖卡通风：INK 描边+暖填充+腮红）
   30 幅互异可一眼辨识（5-6 岁图形认知）；近形对刻意同框可辨：
   蝌蚪=圆头无肢波浪尾 vs 鱼苗=梭身背鳍叉尾；毛毛虫=绿节串有脚触角 vs 甲虫幼虫=乳白
   C 形蜷曲无脚。根组 g[data-anim] = 动物/卵 id——契约 M 帧内容断言锚。 */
const CHEEK = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>';
const EYE = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 4.2) + '" fill="' + INK + '"/>';
const EYE2 = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 5.6) + '" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
  '<circle cx="' + (x + 1.5) + '" cy="' + (y + 0.5) + '" r="' + ((r || 5.6) * 0.42) + '" fill="' + INK + '"/>';

const ANIMAL_ELS = {
  /* 蝌蚪：蓝灰圆头 + 波浪长尾（无肢有尾无鳍——与鱼苗梭身背鳍互辨） */
  tadpole:
    '<path d="M66 62 Q88 50 104 60 Q92 66 108 72 Q92 78 70 72 Z" fill="#8FB4C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" opacity=".92"/>' +
    '<ellipse cx="52" cy="66" rx="30" ry="25" fill="#7FA8BC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="52" cy="74" rx="18" ry="10" fill="#B7D2DE" opacity=".9"/>' +
    EYE2(40, 60, 6) + EYE2(62, 60, 6) +
    '<path d="M46 76 q6 5 12 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(30, 70) + CHEEK(72, 70) +
    '<circle cx="24" cy="42" r="3" fill="#BFE3F2"/><circle cx="97" cy="38" r="2.4" fill="#BFE3F2"/>',
  /* 毛毛虫：绿节串 + 触角 + 小脚（有脚有触角直伸——与甲虫幼虫乳白蜷曲互辨） */
  caterpillar:
    '<path d="M64 34 v-12 M78 34 v-12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="64" cy="20" r="3.4" fill="#E8975A"/><circle cx="78" cy="20" r="3.4" fill="#E8975A"/>' +
    '<circle cx="92" cy="66" r="15" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="68" cy="70" r="17" fill="#8FC86C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="44" cy="72" r="19" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="26" cy="64" r="21" fill="#9AD37B" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE2(18, 58, 5.4) + EYE2(34, 58, 5.4) +
    '<path d="M22 72 q6 5 12 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(10, 68) +
    '<path d="M38 90 v8 M60 88 v8 M84 87 v8" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>',
  /* 小鸡：黄色绒球 + 橙尖嘴 + 小翅（纯黄小球无冠——与母鸡红冠白身尾羽互辨） */
  chick:
    '<path d="M50 36 q-2 -8 4 -11 M60 34 q1 -9 7 -10 M68 38 q4 -7 10 -7" stroke="#E8A23C" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="78" rx="26" ry="21" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="54" r="26" fill="#F8D667" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="34" cy="76" rx="10" ry="15" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5" transform="rotate(18 34 76)"/>' +
    '<path d="M60 60 L50 66 L60 71 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    EYE2(50, 52, 5.2) + EYE2(70, 52, 5.2) +
    CHEEK(40, 62) + CHEEK(80, 62) +
    '<path d="M52 99 v8 M68 99 v8" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round"/>',
  /* 小狗：奶棕奶脸 + 垂耳 + 小鼻（小脸垂耳无项圈——与大狗长吻立耳项圈互辨） */
  puppy:
    '<path d="M28 46 q-9 20 2 30 q10 5 12 -8 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M92 46 q9 20 -2 30 q-10 5 -12 -8 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="88" rx="27" ry="18" fill="#EAD3B0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="60" r="30" fill="#F2E0C4" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE2(48, 54, 6) + EYE2(72, 54, 6) +
    '<ellipse cx="60" cy="72" rx="7" ry="5.5" fill="' + INK + '"/>' +
    '<path d="M60 77 q0 6 -8 7 M60 77 q0 6 8 7" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(36, 68) + CHEEK(84, 68) +
    '<path d="M92 96 q10 -4 12 -12" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  /* 小猫：浅灰圆脸 + 尖耳 + 额头小条纹（圆脸幼态无胡须——与大猫瘦长脸胡须竖耳互辨） */
  kitten:
    '<path d="M34 40 L28 18 L50 30 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M86 40 L92 18 L70 30 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M34 38 L31 24 L44 32 Z" fill="#F2B8C6"/><path d="M86 38 L89 24 L76 32 Z" fill="#F2B8C6"/>' +
    '<ellipse cx="60" cy="88" rx="25" ry="16" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="58" r="29" fill="#E8E3DC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M52 34 q3 -4 6 0 M62 34 q3 -4 6 0 M57 31 v6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    EYE2(48, 55, 6.4) + EYE2(72, 55, 6.4) +
    '<path d="M57 70 l3 3 l3 -3" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M51 75 q9 7 18 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(38, 66) + CHEEK(82, 66) +
    '<path d="M88 94 q12 -2 10 -14" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  /* 牛犊：白脸棕斑 + 角芽 + 大粉鼻（小角芽无黑斑——与奶牛弯角黑斑乳房互辨） */
  calf:
    '<path d="M24 52 q-12 -2 -14 8 q10 6 18 0 Z" fill="#E8E0CE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M96 52 q12 -2 14 8 q-10 6 -18 0 Z" fill="#E8E0CE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="46" cy="40" r="5" fill="#E8E0CE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="74" cy="40" r="5" fill="#E8E0CE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="60" cy="88" rx="28" ry="18" fill="#F6EFDF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="42" cy="94" rx="9" ry="6" fill="#C89A6B" opacity=".85"/>' +
    '<circle cx="60" cy="58" r="29" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M40 44 q10 -5 18 2 q6 -8 16 -3 l-4 10 q-13 -5 -26 -2 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    EYE2(48, 55, 5.4) + EYE2(72, 55, 5.4) +
    '<ellipse cx="60" cy="72" rx="14" ry="9" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="55" cy="72" r="2.4" fill="' + INK + '"/><circle cx="65" cy="72" r="2.4" fill="' + INK + '"/>' +
    CHEEK(36, 66) + CHEEK(84, 66),
  /* 鱼苗：梭形银蓝小鱼 + 背鳍 + 叉尾（有背鳍有分叉尾流线身——与蝌蚪圆头无鳍互辨；近形对） */
  fishfry:
    '<path d="M84 70 Q100 62 106 72 Q100 74 104 82 Q92 82 84 74 Z" fill="#9FBFD2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M52 46 q10 -12 20 0 q-10 4 -20 0 Z" fill="#8FB4C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="56" cy="68" rx="32" ry="19" fill="#B7D2DE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M46 82 q10 8 20 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 68 q8 -6 16 0 M66 68 q8 -6 14 0" stroke="#8FB4C6" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    EYE2(34, 64, 5.4) +
    '<path d="M28 72 q-4 3 0 6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    CHEEK(36, 76) +
    '<circle cx="24" cy="50" r="2.6" fill="#BFE3F2"/><circle cx="96" cy="46" r="2.2" fill="#BFE3F2"/>',
  /* 小鸭：黄绒球 + 扁橙嘴 + 小绒翅（黄绒小球嘴小——与大鸭绿头白身互辨） */
  duckling:
    '<ellipse cx="58" cy="76" rx="27" ry="20" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="32" cy="74" rx="9" ry="13" fill="#F8D667" stroke="' + INK + '" stroke-width="3" transform="rotate(20 32 74)"/>' +
    '<circle cx="62" cy="48" r="23" fill="#F8D667" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M84 46 L98 50 L84 55 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    EYE2(58, 44, 5) + EYE2(74, 44, 5) +
    CHEEK(52, 54) + CHEEK(78, 54) +
    '<path d="M50 95 q4 5 9 0 M62 95 q4 5 9 0" stroke="#E8975A" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  /* 甲虫幼虫：乳白 C 形蜷虫 + 棕头 + 节横纹（无脚无触角蜷曲——与毛毛虫绿直伸互辨；近形对） */
  grub:
    '<circle cx="88" cy="44" r="13" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M78 54 Q60 46 42 56 Q22 68 30 88 Q40 102 62 94 Q46 86 44 74 Q44 62 60 60 Q74 60 82 64 Z" fill="#F6EFDF" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M52 58 q-2 10 2 18 M64 58 q-2 12 4 20 M76 62 q-2 8 2 14" stroke="#E0D5C0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    EYE2(84, 40, 4.2) +
    '<path d="M90 50 q3 3 0 6" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    CHEEK(78, 50) +
    '<circle cx="26" cy="42" r="3" fill="#EADFC8"/><circle cx="98" cy="88" r="2.6" fill="#EADFC8"/>',
  /* 小羊：奶白绒毛球 + 浅灰小脸 + 垂耳（圆绒无角小个子——与大羊厚毛弯角互辨） */
  lamb:
    '<ellipse cx="60" cy="72" rx="30" ry="23" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="26" cy="66" r="9" fill="#EAE4DA" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="94" cy="66" r="9" fill="#EAE4DA" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="44" cy="44" r="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="76" cy="44" r="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="60" cy="40" r="9" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="60" cy="66" rx="18" ry="15" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3"/>' +
    EYE2(53, 63, 4.8) + EYE2(67, 63, 4.8) +
    '<path d="M60 72 q-3 4 0 6 q3 -2 0 -6" fill="' + INK + '"/>' +
    CHEEK(48, 72) + CHEEK(72, 72) +
    '<path d="M50 94 v8 M70 94 v8" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>',
  /* 小猪：粉嫩圆身 + 塌耳 + 翘鼻（小塌耳圆鼻——与大猪立耳长吻互辨） */
  piglet:
    '<path d="M36 36 q-12 4 -8 16 q8 4 14 -6 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M84 36 q12 4 8 16 q-8 4 -14 -6 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="80" rx="28" ry="20" fill="#F5C9CE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="34" cy="88" rx="8" ry="6" fill="#F2B8C6"/>' +
    '<circle cx="60" cy="56" r="27" fill="#F8D3D8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="68" rx="12" ry="8" fill="#F09CA8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="55" cy="68" r="2.2" fill="' + INK + '"/><circle cx="65" cy="68" r="2.2" fill="' + INK + '"/>' +
    EYE2(48, 52, 5) + EYE2(72, 52, 5) +
    CHEEK(38, 62) + CHEEK(82, 62) +
    '<path d="M50 99 v7 M70 99 v7" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>',
  /* 小马：浅棕小身 + 短鬃 + 细腿（小短鬃细腿——与大马长鬃壮互辨） */
  foal:
    '<ellipse cx="60" cy="74" rx="30" ry="18" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M34 70 q6 -16 16 -18" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="82" cy="52" r="17" fill="#EFD7B4" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M76 38 q4 -8 10 -6 M84 36 q6 -6 10 -2" stroke="#C89A6B" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M92 46 q8 2 8 8 q-6 2 -9 -4 Z" fill="#E8E3DC" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    EYE2(84, 50, 4.4) +
    '<circle cx="99" cy="55" r="2.6" fill="' + INK + '"/>' +
    CHEEK(76, 60) +
    '<path d="M42 90 v9 M56 91 v9 M74 91 v9 M88 88 v9" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M30 76 q-8 4 -6 12" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>',
  /* 青蛙：大绿蛙 + 突出双眼 + 宽嘴 + 四肢（四肢无尾——与蝌蚪互辨） */
  frog:
    '<ellipse cx="40" cy="36" r="13" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="80" cy="36" r="13" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="40" cy="34" r="5.4" fill="#FFF" stroke="' + INK + '" stroke-width="1.8"/><circle cx="41" cy="35" r="2.6" fill="' + INK + '"/>' +
    '<circle cx="80" cy="34" r="5.4" fill="#FFF" stroke="' + INK + '" stroke-width="1.8"/><circle cx="81" cy="35" r="2.6" fill="' + INK + '"/>' +
    '<ellipse cx="60" cy="76" rx="36" ry="27" fill="#8FC86C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="86" rx="21" ry="11" fill="#DDEDC8"/>' +
    '<path d="M40 74 q20 14 40 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="48" cy="74" r="2" fill="' + INK + '"/><circle cx="72" cy="74" r="2" fill="' + INK + '"/>' +
    CHEEK(32, 84) + CHEEK(88, 84) +
    '<ellipse cx="22" cy="94" rx="10" ry="6" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3" transform="rotate(-30 22 94)"/>' +
    '<ellipse cx="98" cy="94" rx="10" ry="6" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3" transform="rotate(30 98 94)"/>' +
    '<path d="M44 100 q-2 8 -10 10 M76 100 q2 8 10 10" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  /* 蝴蝶：两对大翅 + 翅斑 + 竖身触角（大翅——与毛毛虫互辨） */
  butterfly:
    '<path d="M60 52 Q46 24 22 26 q-12 12 6 30 q-14 14 2 22 q16 4 30 -14 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M60 52 Q74 24 98 26 q12 12 -6 30 q14 14 -2 22 q-16 4 -30 -14 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="38" cy="40" rx="8" ry="6" fill="#FBD9A8" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<ellipse cx="82" cy="40" rx="8" ry="6" fill="#FBD9A8" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="34" cy="66" r="4.4" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="86" cy="66" r="4.4" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="48" cy="72" r="3" fill="#FFF" opacity=".9"/><circle cx="72" cy="72" r="3" fill="#FFF" opacity=".9"/>' +
    '<ellipse cx="60" cy="66" rx="7.5" ry="24" fill="#8A5A2B" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M55 42 Q46 26 36 22 M65 42 Q74 26 84 22" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="35" cy="21" r="3.2" fill="#E8975A"/><circle cx="85" cy="21" r="3.2" fill="#E8975A"/>',
  /* 母鸡：红冠红髯 + 黄嘴 + 白身 + 尾羽（红冠尾羽体大——与小鸡纯黄绒球互辨） */
  hen:
    '<path d="M78 58 q22 -10 24 -30 q-20 4 -26 20 Z" fill="#E8E3DC" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="36" cy="25" r="5.2" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="45" cy="21" r="5.8" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="54" cy="25" r="5.2" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<ellipse cx="60" cy="72" rx="34" ry="28" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M60 60 q22 -5 27 13 q-18 9 -29 0 Z" fill="#EADFC8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="41" cy="46" r="17" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="27" cy="55" rx="4" ry="6" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M27 46 L13 51 L27 56 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    EYE(39, 43) + CHEEK(49, 52) +
    '<path d="M50 99 v9 M70 99 v9" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round"/>',
  /* 大狗：棕大身 + 长吻 + 立耳 + 红项圈（长吻立耳项圈——与小狗奶脸垂耳互辨） */
  dog:
    '<path d="M28 34 L20 12 L44 24 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M92 34 L100 12 L76 24 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="84" rx="33" ry="22" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M30 76 h60" stroke="#E8483C" stroke-width="7" stroke-linecap="round"/>' +
    '<circle cx="60" cy="76" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="48" y="100" width="10" height="13" rx="4" fill="#C89A6B" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="64" y="100" width="10" height="13" rx="4" fill="#C89A6B" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="56" r="28" fill="#D2A87A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="68" rx="14" ry="10" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="60" cy="62" rx="6" ry="4.6" fill="' + INK + '"/>' +
    '<path d="M60 66 v4 M60 70 q-4 5 -9 3 M60 70 q4 5 9 3" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    EYE(48, 50, 4.6) + EYE(72, 50, 4.6) +
    '<path d="M94 88 q12 -6 10 -20" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
  /* 大猫：瘦长脸 + 竖大耳 + 胡须 + 身环纹（胡须竖耳环纹——与小猫圆脸幼态互辨） */
  cat:
    '<path d="M30 42 L22 16 L48 28 Z" fill="#BFB9B0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M90 42 L98 16 L72 28 Z" fill="#BFB9B0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M30 40 L26 22 L42 31 Z" fill="#F2B8C6"/><path d="M90 40 L94 22 L78 31 Z" fill="#F2B8C6"/>' +
    '<ellipse cx="60" cy="86" rx="31" ry="19" fill="#BFB9B0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M44 78 q4 8 0 14 M76 78 q-4 8 0 14" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="56" rx="30" ry="25" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M52 33 q8 -6 16 0 l-4 6 q-4 -3 -8 0 Z" fill="#BFB9B0" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    EYE2(48, 52, 5.4) + EYE2(72, 52, 5.4) +
    '<path d="M56 65 l4 3.6 l4 -3.6" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M50 70 q10 7 20 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 60 h-13 M26 66 l-12 4 M94 60 h13 M94 66 l12 4" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    CHEEK(38, 64) + CHEEK(82, 64) +
    '<path d="M92 92 q14 -4 12 -22" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
  /* 奶牛：白身大黑斑 + 弯角 + 大粉鼻 + 乳房（弯角黑斑乳房体大——与牛犊角芽无斑互辨） */
  cow:
    '<path d="M30 44 q-16 -6 -20 6 q8 12 22 4 Z" fill="#E8E0CE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M90 44 q16 -6 20 6 q-8 12 -22 4 Z" fill="#E8E0CE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="80" rx="36" ry="24" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M34 72 q14 -8 20 6 q-2 12 -16 8 q-8 -6 -4 -14 Z" fill="' + INK + '"/>' +
    '<path d="M84 84 q12 -10 18 2 q0 10 -12 8 q-8 -4 -6 -10 Z" fill="' + INK + '"/>' +
    '<circle cx="60" cy="56" r="28" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M44 40 q8 -7 16 -1 q7 -7 15 -2 q2 8 -8 10 q-11 3 -23 -1 Z" fill="' + INK + '"/>' +
    EYE2(48, 54, 5.2) + EYE2(72, 54, 5.2) +
    '<ellipse cx="60" cy="71" rx="15" ry="10" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="54" cy="71" r="2.6" fill="' + INK + '"/><circle cx="66" cy="71" r="2.6" fill="' + INK + '"/>' +
    CHEEK(36, 64) + CHEEK(84, 64) +
    '<ellipse cx="60" cy="106" rx="10" ry="5.5" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M50 102 v5 M70 102 v5" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  /* 大鱼：深蓝大身 + 大背鳍 + 大叉尾 + 腹鳍（体大鳍大——与鱼苗互辨） */
  fish:
    '<path d="M78 64 Q100 50 108 62 Q100 66 106 78 Q90 80 78 70 Z" fill="#5E86A8" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M46 38 q16 -16 30 0 q-14 8 -30 0 Z" fill="#5E86A8" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="54" cy="68" rx="38" ry="22" fill="#7FA8BC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M40 88 q12 10 26 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M38 64 q10 -8 22 0 M62 64 q10 -8 18 0" stroke="#5E86A8" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="30" cy="62" r="2.4" fill="#FFF" opacity=".8"/><circle cx="38" cy="58" r="1.8" fill="#FFF" opacity=".8"/>' +
    EYE2(28, 64, 6) +
    '<path d="M18 74 q-6 4 0 8" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    CHEEK(34, 78) +
    '<circle cx="16" cy="42" r="3.2" fill="#BFE3F2"/><circle cx="98" cy="36" r="2.6" fill="#BFE3F2"/><circle cx="90" cy="92" r="2.2" fill="#BFE3F2"/>',
  /* 大鸭：绿头白身 + 黄扁嘴 + 灰翅（绿头白身体大——与小鸭黄绒球互辨） */
  duck:
    '<ellipse cx="60" cy="76" rx="34" ry="24" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M64 66 q24 -4 26 12 q-16 8 -28 -2 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="52" cy="44" r="22" fill="#6FA86E" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="30" cy="30" r="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M72 42 L90 47 L72 53 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    EYE(48, 40, 4.4) +
    CHEEK(42, 50) +
    '<ellipse cx="36" cy="52" rx="7" ry="4" fill="#6FA86E" opacity=".55"/>' +
    '<path d="M48 99 q5 6 11 0 M62 99 q5 6 11 0" stroke="#E8975A" stroke-width="3.6" fill="none" stroke-linecap="round"/>',
  /* 甲虫：棕红鞘翅 + 鞘翅分界 + 雄虫小角 + 六足（鞘翅硬壳有角——与幼虫蜷虫互辨） */
  beetle:
    '<path d="M60 18 q8 -6 12 2 q-6 4 -12 -2 Z" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="60" cy="34" r="15" fill="#3F3A33" stroke="' + INK + '" stroke-width="3.2"/>' +
    EYE2(52, 30, 3.6) + EYE2(68, 30, 3.6) +
    '<ellipse cx="60" cy="74" rx="30" ry="32" fill="#A8622E" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M60 44 v60" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M32 50 q-8 8 -4 20 M88 50 q8 8 4 20" stroke="#D9A55C" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="46" cy="62" rx="8" ry="10" fill="#C97F3F" opacity=".8"/>' +
    '<ellipse cx="74" cy="80" rx="8" ry="10" fill="#C97F3F" opacity=".8"/>' +
    '<path d="M30 60 q-12 0 -16 8 M30 74 h-16 M32 88 q-10 4 -12 12 M90 60 q12 0 16 8 M90 74 h16 M88 88 q10 4 12 12" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    CHEEK(44, 44) + CHEEK(76, 44),
  /* 大羊：厚奶油卷毛 + 深灰脸 + 弯角（厚毛弯角长腿——与小羊圆绒无角互辨） */
  sheep:
    '<path d="M34 36 q-14 2 -12 14 q10 8 18 -2 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M86 36 q14 2 12 14 q-10 8 -18 -2 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="70" rx="35" ry="26" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="26" cy="64" r="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="94" cy="64" r="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="40" cy="46" r="9" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="80" cy="46" r="9" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="60" cy="42" r="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="60" cy="64" rx="17" ry="14" fill="#8A8378" stroke="' + INK + '" stroke-width="3"/>' +
    EYE(53, 61, 3.8) + EYE(67, 61, 3.8) +
    '<path d="M60 69 q-3 4 0 6 q3 -2 0 -6" fill="' + INK + '"/>' +
    '<path d="M48 56 h-8 M72 56 h8" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M48 96 v10 M72 96 v10" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
  /* 大猪：大粉身 + 立大耳 + 长吻大鼻孔（立耳长吻体大——与小猪塌耳圆鼻互辨） */
  pig:
    '<path d="M32 34 L20 16 L48 24 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M88 34 L100 16 L72 24 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="80" rx="35" ry="24" fill="#F5C9CE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M28 78 q-8 6 -2 14" stroke="#E8975A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="60" cy="54" r="28" fill="#F8D3D8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="70" rx="17" ry="11" fill="#F09CA8" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="53" cy="70" r="3" fill="' + INK + '"/><circle cx="67" cy="70" r="3" fill="' + INK + '"/>' +
    EYE2(48, 50, 5) + EYE2(72, 50, 5) +
    CHEEK(38, 60) + CHEEK(82, 60) +
    '<path d="M46 102 v9 M74 102 v9" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
  /* 大马：棕大身 + 深棕长鬃 + 壮腿（长鬃壮腿体大——与小马短鬃细腿互辨） */
  horse:
    '<ellipse cx="58" cy="72" rx="36" ry="21" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M30 64 q4 -22 18 -26 q-8 12 -6 24 Z" fill="#6B4A2A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="84" cy="48" r="18" fill="#D2A87A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M74 34 q2 -12 12 -10 M82 32 q8 -8 14 0 M90 38 q10 -2 12 6" stroke="#6B4A2A" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M96 42 q10 4 8 10 q-8 2 -10 -6 Z" fill="#E8E3DC" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    EYE2(86, 46, 4.4) +
    '<circle cx="101" cy="52" r="2.8" fill="' + INK + '"/>' +
    CHEEK(78, 56) +
    '<path d="M38 90 v14 M54 92 v13 M72 92 v13 M88 88 v13" stroke="' + INK + '" stroke-width="3.8" stroke-linecap="round"/>' +
    '<path d="M24 74 q-12 6 -8 18" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
  /* ---- 发育链卵段 6（r10：三段序第 1 段；与幼体成体互异可辨） ---- */
  /* 青蛙卵：透明胶团 + 黑点群（水中卵团——与鱼卵水草挂卵互辨） */
  egg_frog:
    '<ellipse cx="60" cy="64" rx="42" ry="34" fill="#CFE8F2" opacity=".72" stroke="#9FC6D8" stroke-width="3"/>' +
    '<ellipse cx="42" cy="52" rx="9" ry="8" fill="#CFE8F2" opacity=".8" stroke="#9FC6D8" stroke-width="2"/>' +
    '<circle cx="42" cy="52" r="4" fill="' + INK + '"/>' +
    '<circle cx="60" cy="46" r="4.2" fill="' + INK + '"/>' +
    '<circle cx="76" cy="54" r="3.8" fill="' + INK + '"/>' +
    '<circle cx="50" cy="68" r="4" fill="' + INK + '"/>' +
    '<circle cx="68" cy="72" r="4.4" fill="' + INK + '"/>' +
    '<circle cx="58" cy="82" r="3.6" fill="' + INK + '"/>' +
    '<circle cx="80" cy="72" r="3.2" fill="' + INK + '"/>' +
    '<circle cx="34" cy="66" r="3.2" fill="' + INK + '"/>' +
    '<path d="M20 30 q8 -4 14 0 M88 96 q8 4 14 0" stroke="#9FC6D8" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  /* 蝴蝶卵：绿叶上白卵粒串（叶上粒卵——与甲虫卵土中卵互辨） */
  egg_butterfly:
    '<path d="M14 92 Q60 100 106 92" stroke="#7DBB5A" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 92 q-26 -8 -38 -26 q22 -2 38 20 Z" fill="#8FC86C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 92 q26 -8 38 -26 q-22 -2 -38 20 Z" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 62 L58 88 M94 62 L62 88" stroke="' + INK + '" stroke-width="1.8" opacity=".5"/>' +
    '<circle cx="48" cy="52" r="7" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="62" cy="44" r="7.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="76" cy="52" r="7" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="60" cy="62" r="6.5" fill="#F6EFDF" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="98" cy="30" r="2.4" fill="#BFE3F2"/>',
  /* 甲虫卵：土块上白椭圆卵（土中白卵——与蝴蝶卵叶上粒互辨） */
  egg_beetle:
    '<path d="M12 100 Q60 88 108 100 L104 108 Q60 100 16 108 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M20 92 q10 -14 24 -6 q-4 10 -24 6 Z" fill="#EAD3B0" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M78 90 q12 -12 24 -2 q-6 10 -24 2 Z" fill="#EAD3B0" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<ellipse cx="46" cy="58" rx="12" ry="16" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" transform="rotate(-14 46 58)"/>' +
    '<ellipse cx="66" cy="52" rx="12" ry="16" fill="#F6EFDF" stroke="' + INK + '" stroke-width="3" transform="rotate(10 66 52)"/>' +
    '<ellipse cx="56" cy="72" rx="10" ry="13" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" transform="rotate(-4 56 72)"/>' +
    '<ellipse cx="46" cy="54" rx="4" ry="6" fill="#F2B8C6" opacity=".5" transform="rotate(-14 46 54)"/>',
  /* 鱼卵：水草上透明卵粒（挂卵粒——与青蛙卵胶团互辨） */
  egg_fish:
    '<path d="M30 106 Q26 66 40 34 M56 106 Q60 64 50 30 M82 106 Q78 70 92 40" stroke="#7DBB5A" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 34 q-12 -6 -16 4 q10 6 16 -4 Z M50 30 q12 -8 18 2 q-10 8 -18 -2 Z M92 40 q-12 -8 -18 2 q10 8 18 -2 Z" fill="#8FC86C" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="36" cy="56" r="6.5" fill="#CFE8F2" stroke="' + INK + '" stroke-width="2.6"/><circle cx="36" cy="56" r="2.2" fill="' + INK + '"/>' +
    '<circle cx="58" cy="66" r="6.5" fill="#CFE8F2" stroke="' + INK + '" stroke-width="2.6"/><circle cx="58" cy="66" r="2.2" fill="' + INK + '"/>' +
    '<circle cx="86" cy="60" r="6.5" fill="#CFE8F2" stroke="' + INK + '" stroke-width="2.6"/><circle cx="86" cy="60" r="2.2" fill="' + INK + '"/>' +
    '<circle cx="48" cy="84" r="6" fill="#BFE3F2" stroke="' + INK + '" stroke-width="2.4"/><circle cx="48" cy="84" r="2" fill="' + INK + '"/>' +
    '<circle cx="74" cy="86" r="6" fill="#BFE3F2" stroke="' + INK + '" stroke-width="2.4"/><circle cx="74" cy="86" r="2" fill="' + INK + '"/>',
  /* 鸡蛋：草窝 + 白蛋（白蛋——与鸭蛋青壳互辨） */
  egg_hen:
    '<path d="M18 88 q42 -18 84 0 q-6 14 -42 14 q-36 0 -42 -14 Z" fill="#E8C9A0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 88 q38 -10 76 0 M28 82 q32 -8 64 0" stroke="#C89A6B" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="52" rx="24" ry="30" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="52" cy="42" rx="7" ry="10" fill="#FFF" opacity=".85" transform="rotate(-16 52 42)"/>' +
    '<ellipse cx="60" cy="58" rx="14" ry="16" fill="#F6EFDF" opacity=".5"/>' +
    '<path d="M34 24 q4 -4 8 0" stroke="#D8C9B4" stroke-width="2" fill="none" stroke-linecap="round"/>',
  /* 鸭蛋：草窝 + 青白蛋（青壳蛋——与鸡蛋白壳互辨） */
  egg_duck:
    '<path d="M18 88 q42 -18 84 0 q-6 14 -42 14 q-36 0 -42 -14 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 88 q38 -10 76 0 M28 82 q32 -8 64 0" stroke="#BFB9B0" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="52" rx="25" ry="30" fill="#E4EDDE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="52" cy="42" rx="7" ry="10" fill="#F6FAF2" opacity=".9" transform="rotate(-16 52 42)"/>' +
    '<ellipse cx="60" cy="58" rx="14" ry="16" fill="#CFE0C6" opacity=".5"/>' +
    '<path d="M36 26 q4 -4 8 0" stroke="#BFD4B2" stroke-width="2" fill="none" stroke-linecap="round"/>'
};

/* ---------- 生境场景图 3（habitat 题面大图；viewBox 0 0 120 120）
   根组 g[data-hab] = 生境 id——契约 M 帧内容断言锚（渲染即引擎对账依据） */
const HABITAT_ELS = {
  /* 水里：蓝水面 + 波纹 + 荷叶 + 气泡 */
  water:
    '<rect x="10" y="34" width="100" height="76" rx="14" fill="#BFE3F2" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M18 52 q10 -6 20 0 q10 6 20 0 q10 -6 20 0 q10 6 20 0" stroke="#7FA8BC" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 72 q10 -6 20 0 q10 6 20 0 q10 -6 20 0 q10 6 16 0" stroke="#9FC6D8" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="36" cy="94" rx="16" ry="7" fill="#8FC86C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M36 94 q6 -6 14 -2" stroke="' + INK + '" stroke-width="1.8" fill="none" opacity=".6"/>' +
    '<ellipse cx="86" cy="96" rx="12" ry="5.5" fill="#7DBB5A" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="84" cy="48" r="4" fill="#FFF" opacity=".85" stroke="#9FC6D8" stroke-width="1.6"/>' +
    '<circle cx="94" cy="62" r="3" fill="#FFF" opacity=".7"/>' +
    '<circle cx="66" cy="56" r="2.4" fill="#FFF" opacity=".7"/>',
  /* 树林：两棵树 + 树干 + 地面 */
  forest:
    '<path d="M14 104 Q60 96 106 104" stroke="#8FC86C" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<rect x="28" y="66" width="9" height="34" rx="4" fill="#A8794E" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="32" cy="52" r="22" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="18" cy="62" r="13" fill="#8FC86C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="46" cy="62" r="13" fill="#8FC86C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="82" y="58" width="10" height="42" rx="4" fill="#A8794E" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="87" cy="40" r="26" fill="#6FA85C" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="68" cy="52" r="14" fill="#8FC86C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="106" cy="52" r="12" fill="#8FC86C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="92" cy="30" r="3" fill="#F5C445"/><circle cx="76" cy="38" r="2.4" fill="#E8483C"/>',
  /* 草原：草地 + 草丛 + 云 + 小花 */
  grass:
    '<ellipse cx="60" cy="88" rx="54" ry="22" fill="#B7DF9C" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="60" cy="84" rx="54" ry="20" fill="#8FC86C"/>' +
    '<path d="M20 90 q4 -14 2 -20 M26 90 q0 -12 6 -18 M92 90 q-2 -14 0 -20 M98 90 q2 -10 -4 -16" stroke="#6FA85C" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="44" cy="82" r="4" fill="#F2B8C6" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="58" cy="86" r="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="76" cy="82" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="90" cy="88" r="3.4" fill="#F2B8C6" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M28 34 q10 -8 20 0 q10 8 20 0" stroke="#FFF" stroke-width="5" fill="none" stroke-linecap="round" opacity=".95"/>' +
    '<path d="M66 24 q8 -6 16 0 q8 6 14 0" stroke="#FFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<circle cx="98" cy="40" r="3.4" fill="#F5C445"/>'
};

/* 动物/卵 SVG 工厂：animSvg(id, size)——size 缺省 100；根组 g[data-anim]=id（契约 M 锚） */
function animSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="100" height="100"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + id + '">' + ANIMAL_ELS[id] + '</g></svg>';
}
/* 生境场景 SVG 工厂：habSvg(hab, size)——根组 g[data-hab]=hab（契约 M 锚） */
function habSvg(hab, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="100" height="100"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-hab="' + hab + '">' + HABITAT_ELS[hab] + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 小鸡追母鸡（找妈妈主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="27" cy="20" r="8" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="27" cy="12.5" r="2" fill="#E8483C"/>' +
    '<path d="M19 20 L14 22 L19 24 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<circle cx="13.5" cy="31" r="5.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M13 26.5 l-1 -2.5 M15.5 26.5 l1 -2.5" stroke="#E8A23C" stroke-width="1.4" stroke-linecap="round"/>' +
    '<circle cx="11.5" cy="30.5" r="1.1" fill="' + INK + '"/><circle cx="15.5" cy="30.5" r="1.1" fill="' + INK + '"/></svg>',
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
