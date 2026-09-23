/* ================= libr 分类归档小图书 游戏数据（20 题封闭题库 / 32 张主题
   图卡 SVG 池 / 章配置 / 语音文案）
   玩法（SPEC-BATCH38 §0.92/§2 + SPEC-R48 难度批，6-7 岁信息素养/常识·语义
   主题分类归档）：小图书室的书乱了，帮它回家——舞台=书架**恒四格**（每格
   主题标签牌：动物/食物/衣物/交通——R48：ch1 起即四格，AUDIT-67 段序 38
   「ch1-2 两格=4 岁分类」拔除）+当前卡（sort 题=单卡大图 / pick 题=三卡跨维
   挑书盘，图形为主+名称小字——识字辅助非依赖，TTS 双通道）；
   题面=提示句（say 非队列链——SPEC §2 明示契约 N 不适用；普通卡「它住哪
   一格呢」/维度卡=R48 去泄漏维度句（只陈述分类标准不念主题名——孩子须自行
   标准→格映射）/pick 题=「帮X格挑一本新书」反向句）。
   归对=卡片飞入格+书立起动画（格内已归卡可视化堆叠——进度可见）+确认链单
   clip 窗 CELE_WIN=1836=1536+300 精确；归错=卡弹回+miss+错链 [lb_wrong,
   lb_hint]（豁免窗 4170=1728+150+1992+300 真时钟）+方向级反馈=错链播毕重读
   题面句（不亮答案本体——维度卡须靠标准推理）+miss≥2 答案体 breathe
   （sort=正确格 / pick=正确卡，答案级梯度）。
   防同质化（SPEC §2 审查项，三重差异）：vs 早期「形状分家」=感知属性→语义
   主题（知识调用层级：奶牛→动物调用生活常识，非形状颜色直接可见）+冲突卡
   机制（分类标准裁决=信息素养核心）+书架归档载体叙事（卡归格=书立起）。
   题库封闭 20 题（4 章×5，SPEC-R48 §R4 全表）：ch1 四格普通（0-4，row0=cat
   flat0 q0 教学锚）/ch2 维度句（5-9）/ch3 冲突深化（10-14，hint 行 11/20
   >半——AUDIT-67「冲突卡升半数以上」）/ch4 跨维二级题 pick（15-19——
   「加跨维归类二级题」）。语义先验：sort 行唯一归属格（普通卡主题互斥/维度
   卡 DIM2_TARGET 定约裁定）；pick 行候选集恰一张属目标格（干扰主题互异且≠
   目标）；answer=sort 行 shelf.indexOf(主题) / pick 行盘内正确卡下标（verify
   独立推导复算）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（SPEC-BATCH38 §4 实长表；2026-09-12 浏览器实测）
   lb_tut_watch 2976 / lb_tut_turn 1776 / lb_hint 1992 / lb_right 1536 / lb_wrong 1728
   确认链窗 CELE_WIN=1836（=1536+300 精确）；错链豁免窗 WRONG_CHAIN_WIN=4170
   （=1728+150+1992+300）；题面提示句窗=estMs(句长)+300（家族 T 动态，R48 句
   长：普通句 6 字 2670/维度句 5-8 字 2325-3360/pick 句 9 字 3705——est 上界
   口径，8 新键注册后主线实测复核 TODO）；书立起演出 SHELVE_MS=1000；
   错反馈卡弹回锁 BOUNCE_MS=1100（≤wrong 1728+150=1878——b37 R3 首错演出锁
   禁覆盖豁免窗，留「对选放行」活跃段）。 ---------- */
const ENTER_MS = 400;                        // 当前卡出场动画窗（与题面提示句并行）
const SHELVE_MS = 1000;                      // 卡片飞入+书立起演出窗（确认链前段）
const CELE_WIN = 1836;                       // 确认链窗 = lb_right 1536+300（精确）
const BOUNCE_MS = 1100;                      // 归错卡弹回锁窗（≤1878，b37 R3）
const WRONG_CHAIN_WIN = 4170;                // 错链豁免窗=lb_wrong 1728+150+lb_hint 1992+300（真时钟）
const TUT_WATCH_WAIT = 3276;                 // ≥lb_tut_watch 2976+300
const TUT_TURN_WAIT = 2076;                  // ≥lb_tut_turn 1776+300
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- 章配置（R48 难度批：ch1 起恒四格四主题——AUDIT-67 段序 38 建议
   「ch1 起即四格」；进度章号单调递增、难度章号 dch=1+flat//5 静态四档；
   生成关 flat≥20 dch=ri(rnd,1,4) seeded mulberry32(flat*7919+837)——本款常量 837）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '书回家',     hint: '听一听提示，想一想它住哪一格' },   // 预告 ch2 维度句入题
  2: { name: '听提示归档', hint: '有些书有两个家，听提示再放哦' },   // 预告 ch3 冲突卡深化
  3: { name: '冲突小书',   hint: '反过来，帮书格挑一本新书啦' },     // 预告 ch4 跨维二级题
  4: { name: '归档小达人', hint: '新的书来啦，继续帮它回家' }        // 预告生成关（原文沿用）
};
const GEN_HINTS = ['四个书格，看清标签牌',        // dch1 四格普通归档
                   '听提示，想想它是哪一类',      // dch2 维度句入题
                   '两个家的书，听提示再放',      // dch3 冲突卡深化
                   '帮书格挑一本新书'];           // dch4 跨维二级题
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=lb_
   已核 manifest 无占用（SPEC §4 2026-09-12 实查）） ---------- */
const VOICE = {
  watch: { key: 'lb_tut_watch', text: '看！把书放回家' },
  turn:  { key: 'lb_tut_turn',  text: '你来放一放' },
  hint:  { key: 'lb_hint',      text: '它住哪一格呢' },
  right: { key: 'lb_right',     text: '放对啦' },
  wrong: { key: 'lb_wrong',     text: '再想一想哦' }
};
const Q_TEXT = '小图书室的书乱了，帮它回家';   // 纯文字装饰句（不播——题面真值=提示句 TTS）

/* ---------- 主题（SPEC §2 书架格主题标签牌：小图标+主题名+主题色；
   格序每关 seeded 打乱（禁位置学习——孩子须读标签牌，信息素养核心锚）。
   base 序=[animal,food,clothes,vehicle]：dch≤2 取前 2，dch≥3 取前 4 ---------- */
const THEMES = [
  { id: 'animal',  name: '动物', col: '#F2B26B' },   // 暖橙
  { id: 'food',    name: '食物', col: '#A8CC8F' },   // 草绿
  { id: 'clothes', name: '衣物', col: '#A8C4E8' },   // 天蓝
  { id: 'vehicle', name: '交通', col: '#E8A0A8' }    // 粉红
];
const themeOf = id => THEMES.find(t => t.id === id) || THEMES[0];

/* ---------- 提示句表（R48：维度句去答案泄漏改版——v1 句「它住在农场，是动物」
   直接念出主题名=零推理泄漏，r48 一律改为只陈述分类**标准**，孩子须自行完成
   标准→主题格的映射（信息素养核心=分类标准决定归类）；普通句沿用注册 clip）
   普通句「它住哪一格呢」6 字 estMs 2670（lb_hint 在册）；维度句 5-8 字
   estMs 2325-3360；跨维二级题句 9 字 estMs 3705（新键 est 上界口径——
   注册后主线实测复核 TODO，r23 P2-1 红线：est 禁当实测入驻） ---------- */
const NORM_HINT = '它住哪一格呢';
/* R48 维度句（新键 lb_d2_*——段二已注册 16 clips 在册（r48-fix m4 注释销账：
  原段一「未注册静默」时态注释已过时）；旧 lb_dim_* 4 键已退役=manifest 覆写清退） */
const DIM2_HINTS = {
  farm: '它住在农场里',       // 住处维度 → 动物格（农场动物是动物）
  eat:  '我们能吃它',         // 吃维度 → 食物格
  pet:  '它是我们的好朋友',   // 朋友维度 → 动物格（宠物是动物）
  wear: '天冷了要穿上它'      // 穿戴维度 → 衣物格
};
/* R48 维度裁定定约（SPEC-R48 §R4：hint → 唯一归属格；verify/pycheck 全枚举断言
   ——每条 hint 行 CARDS.theme 必须等于本表值，两义性由本定约收口） */
const DIM2_TARGET = { farm: 'animal', eat: 'food', pet: 'animal', wear: 'clothes' };
const DIM2_KEYS = {
  farm: 'lb_d2_farm', eat: 'lb_d2_eat', pet: 'lb_d2_pet', wear: 'lb_d2_wear'
};
/* R48 跨维二级题句（反向：给定书格→从跨维干扰卡中挑对的书；句名目标格=题面
   已知量非答案泄漏——答案是三张卡中的正确卡） */
const PICK_HINTS = {
  animal:  '帮动物格挑一本新书',
  food:    '帮食物格挑一本新书',
  clothes: '帮衣物格挑一本新书',
  vehicle: '帮交通格挑一本新书'
};
const PICK_KEYS = {
  animal: 'lb_pick_animal', food: 'lb_pick_food',
  clothes: 'lb_pick_clothes', vehicle: 'lb_pick_vehicle'
};

/* ---------- 主题图卡池（封闭，SPEC §2 表：每主题 8 张=32 张；SVG 图卡=名称+
   图形双通道）；label=卡名（卡面小字）；theme=唯一归属（普通卡主题互斥——
   卡池选题时已排歧义；冲突卡的归属由题行 hint 维度锚定，池内 theme 字段恒
   为提示维度裁定后的唯一格） ---------- */
const CARDS = {
  /* 动物 8 */
  cat:      { theme: 'animal',  label: '小猫' },
  dog:      { theme: 'animal',  label: '小狗' },
  cow:      { theme: 'animal',  label: '奶牛' },
  chick:    { theme: 'animal',  label: '小鸡' },
  goldfish: { theme: 'animal',  label: '金鱼' },
  elephant: { theme: 'animal',  label: '大象' },
  rabbit:   { theme: 'animal',  label: '兔子' },
  bird:     { theme: 'animal',  label: '小鸟' },
  /* 食物 8 */
  apple:    { theme: 'food',    label: '苹果' },
  carrot:   { theme: 'food',    label: '胡萝卜' },
  bread:    { theme: 'food',    label: '面包' },
  egg:      { theme: 'food',    label: '鸡蛋' },
  milk:     { theme: 'food',    label: '牛奶' },
  banana:   { theme: 'food',    label: '香蕉' },
  rice:     { theme: 'food',    label: '米饭' },
  cake:     { theme: 'food',    label: '蛋糕' },
  /* 衣物 8 */
  coat:     { theme: 'clothes', label: '外套' },
  shoe:     { theme: 'clothes', label: '鞋子' },
  hat:      { theme: 'clothes', label: '帽子' },
  skirt:    { theme: 'clothes', label: '裙子' },
  glove:    { theme: 'clothes', label: '手套' },
  scarf:    { theme: 'clothes', label: '围巾' },
  sock:     { theme: 'clothes', label: '袜子' },
  sweater:  { theme: 'clothes', label: '毛衣' },
  /* 交通 8 */
  car:      { theme: 'vehicle', label: '小汽车' },
  bus:      { theme: 'vehicle', label: '公交车' },
  bike:     { theme: 'vehicle', label: '自行车' },
  plane:    { theme: 'vehicle', label: '飞机' },
  ship:     { theme: 'vehicle', label: '轮船' },
  train:    { theme: 'vehicle', label: '火车' },
  ambulance:{ theme: 'vehicle', label: '救护车' },
  firetruck:{ theme: 'vehicle', label: '消防车' }
};

/* ---------- 20 题封闭题库（R48 难度批重排，SPEC-R48 §R4 全表=真值源；
   row=题号 0-19，按章池分（生成关 dch 池=rows[(dch-1)*5..dch*5-1]）：
   ch1（0-4）四格普通归档（四主题各一采样+章末首条维度句降坡）；
   ch2（5-9）维度句入题（听标准→想归类，全部带 hint）；
   ch3（10-14）冲突卡深化（真双属卡：动物/农场、食物/动物产物、动物/宠物、
   衣物/礼物——hint 升半数以上主承载，AUDIT-67「冲突卡是真内容但仅 4 张」）；
   ch4（15-19）跨维二级题 pick（反向：目标格已知，三卡跨维干扰挑对的——
   Bloom 反向+跨维辨别，AUDIT-67「加跨维归类二级题」）；
   冲突行 hint 维度锚定 DIM2_TARGET（定约收口）；pick 行 cards=[答案卡,干扰1,
   干扰2] 表内固定候选集（干扰主题互异且≠目标——verify/pycheck 断言），盘序
   每关 seeded 打乱（answer=盘内下标） ---------- */
const QUESTIONS = [
  /* ch1 四格起步（0-4）：row0=cat 教学锚（flat0 q0 题面/推导逐字节保留） */
  { card: 'cat',      hint: 'none' },
  { card: 'apple',    hint: 'none' },
  { card: 'coat',     hint: 'none' },
  { card: 'car',      hint: 'none' },
  { card: 'chick',    hint: 'farm' },   // 章末首条维度句（降坡：关内前 4 题纯普通归档）
  /* ch2 维度句入题（5-9） */
  { card: 'goldfish', hint: 'pet' },    // 动物/宠物——「它是我们的好朋友」→动物
  { card: 'banana',   hint: 'eat' },    // 食物/水果——「我们能吃它」→食物
  { card: 'hat',      hint: 'wear' },   // 衣物/礼物——「天冷了要穿上它」→衣物
  { card: 'cow',      hint: 'farm' },   // 动物/农场——「它住在农场里」→动物
  { card: 'rice',     hint: 'eat' },    // 食物/主食——「我们能吃它」→食物
  /* ch3 冲突卡深化（10-14）：真双属卡 */
  { card: 'egg',      hint: 'eat' },    // 食物/动物产物——「我们能吃它」→食物
  { card: 'dog',      hint: 'pet' },    // 动物/宠物——「它是我们的好朋友」→动物
  { card: 'scarf',    hint: 'wear' },   // 衣物/礼物——「天冷了要穿上它」→衣物
  { card: 'milk',     hint: 'eat' },    // 食物/来自奶牛——「我们能吃它」→食物
  { card: 'rabbit',   hint: 'pet' },    // 动物/宠物——「它是我们的好朋友」→动物
  /* ch4 跨维二级题（15-19）：pick 行（kind 由 buildPick 标注） */
  { pick: 'food',    cards: ['apple', 'rabbit', 'train'] },
  { pick: 'clothes', cards: ['scarf', 'dog', 'bus'] },
  { pick: 'animal',  cards: ['elephant', 'bread', 'shoe'] },
  { pick: 'vehicle', cards: ['plane', 'milk', 'hat'] },
  { pick: 'food',    cards: ['carrot', 'bird', 'sweater'] }
];
/* 题面提示句真值源（verify 双录对账）：sort 行=普通句/维度句；pick 行=挑书句 */
function sayOfRow(row) {
  const qs = QUESTIONS[row];
  if (qs.pick) return PICK_HINTS[qs.pick];
  return qs.hint === 'none' ? NORM_HINT : DIM2_HINTS[qs.hint];
}

/* ---------- 主题图卡 SVG（32 张，viewBox 0 0 100 100，简笔大色块：粗描边
   INK 3.6-4.5+实心填色——家族视觉集；根组 g[data-anim=<card id>]，verify
   单元①断言全定义（渲染即引擎）；主题色近义但图形互异（同主题 8 张形状
   各异——不靠颜色歧视，语义承载在图形+名称+TTS 三通道） ---------- */
const CARD_EL = {
  /* 动物 8 */
  cat:      /* 小猫：三角耳+胡须 */
    '<path d="M26 46 L30 14 L50 34 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.6" stroke-linejoin="round"/>' +
    '<path d="M74 46 L70 14 L50 34 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.6" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="60" r="32" fill="#F5B26B" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="39" cy="55" r="3.8" fill="' + INK + '"/><circle cx="61" cy="55" r="3.8" fill="' + INK + '"/>' +
    '<path d="M45 68 q5 4 10 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M44 66 l-16 -4 M44 70 l-16 4 M56 66 l16 -4 M56 70 l16 4" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  dog:      /* 小狗：垂耳+口鼻 */
    '<ellipse cx="22" cy="56" rx="11" ry="22" fill="#A9744B" stroke="' + INK + '" stroke-width="3.6" transform="rotate(-12 22 56)"/>' +
    '<ellipse cx="78" cy="56" rx="11" ry="22" fill="#A9744B" stroke="' + INK + '" stroke-width="3.6" transform="rotate(12 78 56)"/>' +
    '<circle cx="50" cy="56" r="32" fill="#D9A56D" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="39" cy="50" r="3.8" fill="' + INK + '"/><circle cx="61" cy="50" r="3.8" fill="' + INK + '"/>' +
    '<ellipse cx="50" cy="68" rx="13" ry="9" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="50" cy="64" rx="4.5" ry="3.4" fill="' + INK + '"/>',
  cow:      /* 奶牛：双角+花斑 */
    '<path d="M28 34 q-10 -8 -14 -2 M72 34 q10 -8 14 -2" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="30" rx="10" ry="12" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="68" cy="30" rx="10" ry="12" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="50" cy="58" rx="34" ry="32" fill="#F6EFE4" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M36 44 q8 6 4 14 q-8 2 -10 -6 Z" fill="#8A9BAE" opacity=".85"/>' +
    '<path d="M62 62 q10 -2 10 8 q-2 8 -10 6 q-6 -6 0 -14 Z" fill="#8A9BAE" opacity=".85"/>' +
    '<ellipse cx="50" cy="70" rx="17" ry="11" fill="#F0AEB2" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="43" cy="70" r="2.8" fill="' + INK + '"/><circle cx="57" cy="70" r="2.8" fill="' + INK + '"/>',
  chick:    /* 小鸡：黄圆身+呆毛+尖嘴 */
    '<circle cx="50" cy="58" r="32" fill="#F7D154" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M42 28 q3 -11 11 -9 M52 28 q2 -8 9 -8" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="52" r="3.6" fill="' + INK + '"/><circle cx="60" cy="52" r="3.6" fill="' + INK + '"/>' +
    '<path d="M42 64 l8 6 l8 -6" fill="#F0933F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M20 74 q-6 6 0 12 M80 74 q6 6 0 12" stroke="#F0933F" stroke-width="3" fill="none" stroke-linecap="round"/>',
  goldfish: /* 金鱼：鱼身+大尾+泡泡 */
    '<ellipse cx="44" cy="56" rx="26" ry="19" fill="#F0933F" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M68 56 l20 -14 l-6 14 l6 14 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="51" r="3.6" fill="' + INK + '"/>' +
    '<path d="M26 62 q6 5 12 0" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="16" cy="34" r="4" fill="none" stroke="#9CC8E8" stroke-width="2.6"/>' +
    '<circle cx="26" cy="24" r="2.6" fill="none" stroke="#9CC8E8" stroke-width="2.2"/>',
  elephant: /* 大象：大耳+长鼻 */
    '<circle cx="24" cy="52" r="16" fill="#A8B4E0" stroke="' + INK + '" stroke-width="3.6"/>' +
    '<circle cx="76" cy="52" r="16" fill="#A8B4E0" stroke="' + INK + '" stroke-width="3.6"/>' +
    '<ellipse cx="50" cy="56" rx="28" ry="27" fill="#BAC5E8" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M50 62 q-2 22 10 24 q9 1 9 -8" fill="none" stroke="' + INK + '" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M50 62 q-2 22 10 24 q9 1 9 -8" fill="none" stroke="#BAC5E8" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="40" cy="52" r="3.4" fill="' + INK + '"/><circle cx="60" cy="52" r="3.4" fill="' + INK + '"/>',
  rabbit:   /* 兔子：长耳粉内耳+圆脸 */
    '<ellipse cx="36" cy="22" rx="9" ry="20" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.6" transform="rotate(-8 36 22)"/>' +
    '<ellipse cx="36" cy="24" rx="4" ry="13" fill="#F2B8C6" transform="rotate(-8 36 24)"/>' +
    '<ellipse cx="64" cy="21" rx="9" ry="21" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.6" transform="rotate(9 64 21)"/>' +
    '<ellipse cx="64" cy="23" rx="4" ry="14" fill="#F2B8C6" transform="rotate(9 64 23)"/>' +
    '<circle cx="50" cy="60" r="30" fill="#FBF7F0" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="40" cy="56" r="3.6" fill="' + INK + '"/><circle cx="60" cy="56" r="3.6" fill="' + INK + '"/>' +
    '<path d="M50 64 l-3 3 l3 3 l3 -3 Z" fill="#E8A0A8" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M45 72 q5 4 10 0" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>',
  bird:     /* 小鸟：圆身+翅膀+尖嘴 */
    '<circle cx="46" cy="56" r="28" fill="#9CC8E8" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M46 34 q-4 -12 8 -14 q-2 8 2 12 Z" fill="#7FB3DE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M40 58 q-18 -4 -20 8 q14 6 22 -2 Z" fill="#7FB3DE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="38" cy="50" r="3.6" fill="' + INK + '"/>' +
    '<path d="M20 56 l-10 3 l10 4 Z" fill="#F0933F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M42 72 l3 8 M52 72 l3 8" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>',
  /* 食物 8 */
  apple:    /* 苹果：红果+叶 */
    '<path d="M50 34 q-20 -12 -30 4 q-8 16 6 36 q12 14 24 14 q12 0 24 -14 q14 -20 6 -36 q-10 -16 -30 -4 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M50 32 q0 -12 8 -16" fill="none" stroke="#7A5A3A" stroke-width="3.6" stroke-linecap="round"/>' +
    '<path d="M58 20 q12 -6 16 4 q-10 8 -16 -4 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M38 52 q2 4 6 4" stroke="#FFF9EE" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>',
  carrot:   /* 胡萝卜：橙锥+纹+缨 */
    '<path d="M74 26 l14 6" stroke="#8FBF7F" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M76 22 q10 -8 14 -2 M78 32 q12 -2 12 6" stroke="#8FBF7F" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M74 28 L26 72 q-6 6 -12 6 q2 -8 8 -14 Z" fill="#F0933F" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M58 40 l6 6 M48 50 l6 6 M64 34 l5 5" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>',
  bread:    /* 面包：吐司+划口 */
    '<path d="M18 62 q0 -20 14 -22 q18 -4 36 0 q14 2 14 22 v10 q0 6 -6 6 h-52 q-6 0 -6 -6 Z" fill="#E8C07A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M34 48 q4 8 0 14 M50 46 q4 9 0 16 M66 48 q4 8 0 14" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 62 h56" stroke="' + INK + '" stroke-width="2.2" opacity=".4"/>',
  egg:      /* 鸡蛋：蛋形+高光 */
    '<path d="M50 16 q26 0 26 40 q0 28 -26 28 q-26 0 -26 -28 q0 -40 26 -40 Z" fill="#FBF3E0" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M38 42 q2 8 8 10" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="50" cy="88" rx="20" ry="4" fill="#E5D5BC" opacity=".7"/>',
  milk:     /* 牛奶：奶瓶+奶滴 */
    '<path d="M40 12 h20 v10 l8 12 v52 q0 8 -8 8 h-20 q-8 0 -8 -8 v-52 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M32 46 h36 v14 h-36 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M44 68 q6 -8 12 0 q0 8 -6 10 q-6 -2 -6 -10 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M40 12 h20" stroke="' + INK + '" stroke-width="3.6"/>',
  banana:   /* 香蕉：弯月+两端 */
    '<path d="M24 30 q-8 44 34 54 q26 6 34 -12 q-6 6 -20 4 q-32 -4 -36 -46 Z" fill="#F5D75E" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M24 30 q-2 -6 4 -8 q6 2 4 8" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M88 74 q6 2 4 8 q-6 2 -8 -4 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M40 62 q16 10 34 6" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".5"/>',
  rice:     /* 米饭：饭碗+饭团 */
    '<path d="M28 44 q22 -14 44 0 q2 0 2 4 q0 22 -24 22 q-24 0 -24 -22 q0 -4 2 -4 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M26 48 h48" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M22 48 q28 -30 56 0" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M38 34 q2 5 -2 6 M50 30 q2 6 -2 7 M62 34 q2 5 -2 6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  cake:     /* 蛋糕：双层+蜡烛 */
    '<path d="M20 56 h60 v14 q0 6 -6 6 h-48 q-6 0 -6 -6 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="4"/>' +
    '<ellipse cx="50" cy="56" rx="30" ry="8" fill="#FDF3E3" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M34 50 q4 -10 8 0 M48 48 q4 -10 8 0 M62 50 q4 -10 8 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 40 v-12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="50" cy="24" rx="3" ry="5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.2"/>',
  /* 衣物 8 */
  coat:     /* 外套：开襟+纽扣 */
    '<path d="M32 24 l-16 8 q-6 4 -4 12 l6 40 q1 6 8 6 h48 q7 0 8 -6 l6 -40 q2 -8 -4 -12 l-16 -8 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M50 24 l-18 -4 v56 M50 24 l18 -4 v56" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M50 30 l-12 8 v36 l12 10 Z" fill="#FDF3E3" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="36" cy="44" r="2.6" fill="' + INK + '"/><circle cx="36" cy="58" r="2.6" fill="' + INK + '"/><circle cx="64" cy="44" r="2.6" fill="' + INK + '"/><circle cx="64" cy="58" r="2.6" fill="' + INK + '"/>',
  shoe:     /* 鞋子：鞋身+鞋带 */
    '<path d="M16 62 q0 -16 14 -16 q10 0 16 8 q8 10 24 12 q14 2 14 12 q0 6 -8 6 h-52 q-8 0 -8 -8 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M30 46 q6 -6 14 -4 M34 52 q6 -6 14 -4" stroke="#FDF9F0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M16 78 q34 4 68 0" stroke="' + INK + '" stroke-width="2.4" fill="none" opacity=".5"/>' +
    '<ellipse cx="82" cy="70" rx="6" ry="8" fill="#E5D5BC" opacity=".6"/>',
  hat:      /* 帽子：帽身+帽檐+花 */
    '<path d="M32 52 q0 -30 18 -30 q18 0 18 30 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M14 52 h72 q4 0 4 6 q0 6 -4 6 h-72 q-4 0 -4 -6 q0 -6 4 -6 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.6"/>' +
    '<path d="M50 22 q3 -5 8 -2" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="46" r="4" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2"/>',
  skirt:    /* 裙子：A 裙+腰+褶 */
    '<path d="M36 20 h28 q4 0 5 5 l12 48 q1 6 -5 6 h-52 q-6 0 -5 -6 l12 -48 q1 -5 5 -5 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M32 16 h36 q3 0 3 4 t-3 4 h-36 q-3 0 -3 -4 t3 -4 Z" fill="#FDF3E3" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M42 32 l-4 44 M50 32 v44 M58 32 l4 44" stroke="' + INK + '" stroke-width="2.4" fill="none" opacity=".5"/>' +
    '<circle cx="50" cy="40" r="3.4" fill="#F5C542" stroke="' + INK + '" stroke-width="2"/>',
  glove:    /* 手套：掌+四指+筒 */
    '<path d="M34 58 v-28 q0 -6 6 -6 q6 0 6 6 v-8 q0 -6 6 -6 q6 0 6 6 v8 q0 -6 6 -6 q6 0 6 6 v30 q0 12 -12 12 h-6 q-12 0 -12 -12 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M34 54 h-10 q-4 0 -4 -5 q0 -4 4 -4 h10" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M30 72 q20 8 40 0" stroke="' + INK + '" stroke-width="2.4" fill="none" opacity=".5"/>' +
    '<path d="M38 40 q4 -3 7 0 M56 40 q4 -3 7 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  scarf:    /* 围巾：围圈+垂端+流苏 */
    '<path d="M26 30 q24 -12 48 0 l-4 14 q-20 -8 -40 0 Z" fill="#E8A0A8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M64 40 l10 34 q2 6 -4 8 l-12 2 q-6 1 -7 -5 l-10 -34 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3.6" stroke-linejoin="round"/>' +
    '<path d="M50 36 l-2 44" stroke="' + INK + '" stroke-width="2.4" opacity=".5"/>' +
    '<path d="M52 82 l-2 8 M58 84 l-2 8 M64 84 l-1 8" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>',
  sock:     /* 袜子：袜筒+袜跟 */
    '<path d="M36 14 h22 v46 q0 6 6 8 q14 4 14 16 q0 12 -16 12 q-16 0 -22 -14 q-4 -10 -4 -22 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M36 22 h22 M36 30 h22" stroke="#A8C4E8" stroke-width="4"/>' +
    '<path d="M78 84 q-10 8 -22 4" stroke="' + INK + '" stroke-width="2.4" fill="none" opacity=".5"/>' +
    '<circle cx="47" cy="60" r="4" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2"/>',
  sweater:  /* 毛衣：圆领+麻花纹 */
    '<path d="M32 26 l-18 10 q-6 4 -4 12 l6 38 q1 6 8 6 h52 q7 0 8 -6 l6 -38 q2 -8 -4 -12 l-18 -10 q-12 10 -24 0 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M32 26 q18 16 36 0" fill="#FDF3E3" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 44 q6 -6 10 0 q-6 6 -10 0 M50 44 q6 -6 10 0 q-6 6 -10 0 M45 56 q6 -6 10 0 q-6 6 -10 0 M40 68 q6 -6 10 0 q-6 6 -10 0 M50 68 q6 -6 10 0 q-6 6 -10 0" fill="none" stroke="' + INK + '" stroke-width="2.4"/>',
  /* 交通 8 */
  car:      /* 小汽车：车身+车窗+轮 */
    '<path d="M14 62 l6 -16 q2 -6 9 -6 h42 q7 0 9 6 l6 16 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<rect x="12" y="60" width="76" height="14" rx="6" fill="#7FB3DE" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M32 44 h14 v14 h-20 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M54 44 h12 l6 14 h-18 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="76" r="9" fill="' + INK + '"/><circle cx="70" cy="76" r="9" fill="' + INK + '"/>' +
    '<circle cx="30" cy="76" r="3.6" fill="#FDF9F0"/><circle cx="70" cy="76" r="3.6" fill="#FDF9F0"/>',
  bus:      /* 公交车：长方车身+多窗 */
    '<rect x="14" y="26" width="72" height="48" rx="8" fill="#F5C542" stroke="' + INK + '" stroke-width="4"/>' +
    '<rect x="22" y="34" width="14" height="14" rx="3" fill="#FDF9F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="42" y="34" width="14" height="14" rx="3" fill="#FDF9F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="62" y="34" width="14" height="14" rx="3" fill="#FDF9F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M14 56 h72" stroke="' + INK + '" stroke-width="2.4" opacity=".5"/>' +
    '<circle cx="32" cy="76" r="9" fill="' + INK + '"/><circle cx="68" cy="76" r="9" fill="' + INK + '"/>' +
    '<circle cx="32" cy="76" r="3.6" fill="#FDF9F0"/><circle cx="68" cy="76" r="3.6" fill="#FDF9F0"/>',
  bike:     /* 自行车：双轮+车架+把 */
    '<circle cx="26" cy="66" r="18" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="74" cy="66" r="18" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M26 66 l14 -26 h20 l14 26 M40 40 h-8 M54 40 q16 -4 20 -12 M40 40 l10 26 h24" fill="none" stroke="#E8975A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M32 18 q6 -4 12 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="26" cy="66" r="4" fill="' + INK + '"/><circle cx="74" cy="66" r="4" fill="' + INK + '"/>',
  plane:    /* 飞机：机身+双翼+窗 */
    '<path d="M16 52 q0 -10 14 -12 l34 -4 q16 -2 20 10 q2 8 -8 12 l-44 8 q-14 2 -16 -14 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M46 38 l-16 -22 h12 l26 20 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M38 58 l-14 26 h12 l22 -24 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M30 50 h6 M42 48 h6 M54 46 h6" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M84 46 l6 -2 v8 l-6 -2 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>',
  ship:     /* 轮船：船身+烟囱+波浪 */
    '<path d="M44 20 h14 v12 h14 l-6 14 h-34 l-4 -14 h16 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="3.6" stroke-linejoin="round"/>' +
    '<rect x="48" y="10" width="8" height="12" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M14 50 h72 l-10 22 q-2 4 -7 4 h-38 q-5 0 -7 -4 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M26 60 h48" stroke="#FDF9F0" stroke-width="3" opacity=".7"/>' +
    '<circle cx="35" cy="30" r="4" fill="none" stroke="#9CC8E8" stroke-width="2.4"/><circle cx="70" cy="26" r="3" fill="none" stroke="#9CC8E8" stroke-width="2.2"/>',
  train:    /* 火车：车头+车厢+轨道 */
    '<rect x="14" y="38" width="30" height="30" rx="5" fill="#E8975A" stroke="' + INK + '" stroke-width="4"/>' +
    '<rect x="22" y="44" width="12" height="10" rx="2" fill="#FDF9F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="50" y="46" width="24" height="22" rx="4" fill="#A8C4E8" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M14 68 h60" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="24" cy="74" r="6" fill="' + INK + '"/><circle cx="40" cy="74" r="6" fill="' + INK + '"/><circle cx="58" cy="74" r="6" fill="' + INK + '"/><circle cx="72" cy="74" r="6" fill="' + INK + '"/>' +
    '<path d="M40 44 q8 -8 4 -16" stroke="#E5D5BC" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>',
  ambulance:/* 救护车：白车身+红十字+闪灯 */
    '<rect x="12" y="34" width="60" height="32" rx="6" fill="#FDF9F0" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M72 44 h12 l8 10 v12 h-20 Z" fill="#FDF9F0" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M34 40 h10 v8 h8 v10 h-8 v8 h-10 v-8 h-8 v-10 h8 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<rect x="24" y="24" width="14" height="8" rx="3" fill="#F0933F" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="28" cy="70" r="8" fill="' + INK + '"/><circle cx="62" cy="70" r="8" fill="' + INK + '"/><circle cx="82" cy="70" r="8" fill="' + INK + '"/>' +
    '<circle cx="28" cy="70" r="3.2" fill="#FDF9F0"/><circle cx="62" cy="70" r="3.2" fill="#FDF9F0"/><circle cx="82" cy="70" r="3.2" fill="#FDF9F0"/>',
  firetruck:/* 消防车：红车身+云梯+警灯 */
    '<rect x="12" y="36" width="44" height="30" rx="5" fill="#E86A5E" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M56 46 h14 l10 10 v10 h-24 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<rect x="20" y="42" width="12" height="10" rx="2" fill="#FDF9F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M80 24 l-20 16 M78 18 l-20 16" stroke="#F5C542" stroke-width="4" stroke-linecap="round"/>' +
    '<rect x="26" y="26" width="12" height="8" rx="3" fill="#F0933F" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="26" cy="70" r="8" fill="' + INK + '"/><circle cx="48" cy="70" r="8" fill="' + INK + '"/><circle cx="74" cy="70" r="8" fill="' + INK + '"/>' +
    '<circle cx="26" cy="70" r="3.2" fill="#FDF9F0"/><circle cx="48" cy="70" r="3.2" fill="#FDF9F0"/><circle cx="74" cy="70" r="3.2" fill="#FDF9F0"/>'
};
function cardSvg(id) {
  const el = CARD_EL[id] || CARD_EL.cat;
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g data-anim="' + id + '">' + el + '</g></svg>';
}

/* ---------- 主题标签牌小图标（viewBox 0 0 44 44，书架格标签用——主题色底+
   白图形，与图卡视觉分层：标签=识别锚非答案泄漏） ---------- */
const TAG_EL = {
  animal:  '<circle cx="22" cy="26" r="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M14 20 l-2 -7 l7 4 Z M30 20 l2 -7 l-7 4 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
           '<circle cx="18" cy="25" r="1.6" fill="' + INK + '"/><circle cx="26" cy="25" r="1.6" fill="' + INK + '"/>',
  food:    '<circle cx="22" cy="24" r="10" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M22 12 q0 -4 4 -5" stroke="#FFF9EE" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
           '<path d="M24 11 q7 -3 8 3 q-6 4 -8 -3 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
           '<path d="M17 26 q5 4 10 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  clothes: '<path d="M14 14 l-5 4 q-2 2 -1 5 l2 10 q0 3 4 3 h16 q4 0 4 -3 l2 -10 q1 -3 -1 -5 l-5 -4 q-4 5 -8 0 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
           '<path d="M18 16 q4 4 8 0" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
           '<path d="M16 30 q6 4 12 0" stroke="' + INK + '" stroke-width="1.8" fill="none" opacity=".5"/>',
  vehicle: '<path d="M10 28 l3 -8 q1 -3 4 -3 h10 q3 0 4 3 l3 8 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
           '<rect x="8" y="27" width="28" height="6" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<circle cx="14" cy="35" r="3.4" fill="' + INK + '"/><circle cx="30" cy="35" r="3.4" fill="' + INK + '"/>'
};
function tagSvg(themeId) {
  const el = TAG_EL[themeId] || TAG_EL.animal;
  return '<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + el + '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 书架上一本立着的书（归档主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M10 34 h24" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<rect x="14" y="14" width="7" height="20" rx="1.6" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="23" y="17" width="7" height="17" rx="1.6" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2" transform="rotate(6 26.5 25.5)"/>' +
    '<circle cx="33" cy="12" r="3" fill="#F5C542" stroke="' + INK + '" stroke-width="1.8"/></svg>',
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
