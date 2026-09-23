/* ================= connect 游戏数据 r6（食性封闭表 / 章配置 / 语音文案 / 图标） =================
   r6（2026-09-13 难度改造，SPEC-BATCH5 §3 r6 块）：
   - 动物 12（lib 0-11 与 v1 PAIRS 同序，PAIR_VOICE 键沿用）× 食物 14（lib 0-11 与 v1 同序 + 12 白菜 + 13 苹果）
   - EATS 食性封闭表（多对多）：一动物吃多种食物；归属表（食物→动物）供反向排除构造
   - CHAINS 链封闭 3（up=答案链顶动物 / down=答案链中段食物）
   - estMs=TTS 拼句窗估算（家族 b25 定版 +600 口径，禁 +300 变体；build.py/verify 字面同断言） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   name/hint=章末预告；GEN_HINTS[k] ↔ dch=k+1（家族 F，verify C7 断言） ---------- */
const CHAPTERS = {
  1: { name: '爱吃什么',   hint: '一位朋友能吃好几种' },
  2: { name: '都能吃',     hint: '找只有它一个爱吃的' },
  3: { name: '只有一个',   hint: '小虫吃过草，谁吃小虫' },
  4: { name: '食物链',     hint: '新一轮晚餐大挑战' }
};
const GEN_HINTS = ['爱吃什么连一连', '把能吃的都连上', '找只有它吃的', '跟着食物链连一连'];
const CH_LEN = 5;          // 5 关 = 1 章
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
const Q_PER_LEVEL = 5;     // 每关 5 题（逐题制）

/* ---------- TTS 拼句窗估算（b25 定版 +600 口径；禁 +300 变体——build/verify 字面同断言） ---------- */
const estMs = n => n * 345 + 600;

/* ---------- 语音文案（既有 4 条 key/文本禁改；r6 新增 5 条题型锚/救援） ---------- */
const VOICE = {
  watch: { key: 'con_tut_watch', text: '看！小动物饿了' },
  turn:  { key: 'con_tut_turn',  text: '你来连一连' },
  hint:  { key: 'con_hint',      text: '想一想它爱吃什么' },
  rev:   { key: 'con_rev',       text: '从左边的小动物那里开始拖哦' },
  /* r6 新增：错连方向锚（按题型）+ 集合漏连救援 + 反向方向 hint */
  wFood:  { key: 'con_w_food',  text: '它不吃这个哦，再想想' },   // pair/set 错连锚（11 码点）
  wShare: { key: 'con_w_share', text: '别的动物也爱吃它哦' },     // anti 错连锚（10 码点）
  wChain: { key: 'con_w_chain', text: '想一想，谁会吃掉它' },     // chain 错连锚+救援（10 码点）
  hAnti:  { key: 'con_hint_anti',   text: '找只有它一个爱吃的' }, // anti 方向 hint（10 码点）
  less:   { key: 'con_less',    text: '还差一个，再连一连' }      // set 漏连救援（不算 miss；9 码点）
};

/* ---------- 配对知识语音（v1 机制保留：键=动物 lib，连对后讲一句把试错变学习）
   每关最多播 2 次，sayR 不受 flat 门 ---------- */
const PAIR_VOICE = {
  4:  { key: 'con_pair_panda',    text: '熊猫最爱吃竹子哦' },
  5:  { key: 'con_pair_chick',    text: '小鸡爱吃毛毛虫' },
  7:  { key: 'con_pair_squirrel', text: '松鼠最爱吃松果哦' },
  8:  { key: 'con_pair_bear',     text: '小熊爱吃甜甜的蜂蜜' },
  9:  { key: 'con_pair_frog',     text: '小青蛙爱吃小蚊子' },
  10: { key: 'con_pair_bird',     text: '小鸟爱吃红果子' },
  11: { key: 'con_pair_mouse',    text: '小老鼠爱吃奶酪' }
};

/* ---------- 食性封闭表（SPEC §3 r6 真值；verify 从 SPEC 文字独立重列对账，禁引用本常量互证）
   EATS[动物 lib] = 能吃的食物 lib 集合（主食在首位=pair 题 need）；
   OWNERS[食物 lib] = 吃它的动物 lib 集（anti 题：need 归属恰 1、干扰归属 ≥2=不可秒排除） ---------- */
const EATS = [
  [0, 12, 13],   // 0  小兔：萝卜、白菜、苹果
  [1],           // 1  小猫：小鱼
  [2],           // 2  小狗：骨头
  [3, 13],       // 3  猴子：香蕉、苹果
  [4],           // 4  熊猫：竹子
  [5, 12],       // 5  小鸡：毛毛虫、白菜
  [6, 12],       // 6  绵羊：青草、白菜
  [7, 13],       // 7  松鼠：松果、苹果
  [8, 13],       // 8  小熊：蜂蜜、苹果
  [9, 5],        // 9  青蛙：蚊子、毛毛虫
  [10, 5],       // 10 小鸟：红果、毛毛虫
  [11]           // 11 老鼠：奶酪
];
const ownersOf = f => EATS.reduce((acc, e, a) => { if (e.indexOf(f) >= 0) acc.push(a); return acc; }, []);

/* ---------- 链封闭 3（SPEC §3 r6 真值；chain 题：题面只给链不泄答案）
   {base 链底食物, mid 链中食物, top 链顶动物}
   up 型：显示 base→mid→?，答案=top（候选动物中吃 mid 者恰 1）
   down 型：显示 base→?→top，答案=mid（候选食物中=链中段者恰 1） ---------- */
const CHAINS = [
  { base: 6, mid: 5,  top: 5 },    // c0 青草→毛毛虫→小鸡
  { base: 6, mid: 9,  top: 9 },    // c1 青草→蚊子→青蛙
  { base: 6, mid: 5,  top: 10 }    // c2 青草→毛毛虫→小鸟
];

/* ---------- 题面句 / 确认句（动态 TTS 拼句豁免，weather v2 先例；不建 clip）
   长度全 ≤13 码点（estMs(13)=5085）；verify 断言句长上限+modeled 模型 ---------- */
const NM = { 0: '小兔', 1: '小猫', 2: '小狗', 3: '猴子', 4: '熊猫', 5: '小鸡', 6: '绵羊',
             7: '松鼠', 8: '小熊', 9: '青蛙', 10: '小鸟', 11: '老鼠' };
const FM = { 0: '萝卜', 1: '小鱼', 2: '骨头', 3: '香蕉', 4: '竹子', 5: '毛毛虫', 6: '青草',
             7: '松果', 8: '蜂蜜', 9: '蚊子', 10: '红果', 11: '奶酪', 12: '白菜', 13: '苹果' };
const stemOf = q =>
  q.kind === 'pair'  ? '想一想，' + NM[q.animal] + '爱吃什么' :
  q.kind === 'set'   ? '把' + NM[q.animal] + '能吃的都连上' :
  q.kind === 'anti'  ? '只有' + NM[q.animal] + '吃的是哪一个' :
  q.dir === 'up'     ? FM[q.mid] + '吃过' + FM[q.base] + '，谁吃掉它' :
                       '什么吃过' + FM[q.base] + '，被' + NM[q.top] + '吃到';
const confirmOf = q =>
  q.kind === 'anti'  ? '答对啦，只有' + NM[q.animal] + '爱吃' + FM[q.need[0]] :
  q.kind === 'chain' ? NM[q.top] + '吃到' + FM[q.base] + '啦' :   // up/down 同句：链顶吃到链底
                       NM[q.animal] + '吃得饱饱的，真开心';      // pair/set（动物名全 2 字=12 码点封顶）
/* 题面/确认句 clip 键（T46 阶段2 2026-09-19；manifest con_st_/con_cf_ 注册块为准，与
   stemOf/confirmOf 拼式一字不差）：anti 仅专属食物 11 动物（无 5 小鸡——无专属食物不生成 anti 题，
   ANTI_POOL 同规则）；up 题干 (mid,base) 两链去重 2 句；dn (base,top) 3；chain 确认按链顶 top 3 */
const stemKeyOf = q =>
  q.kind === 'pair'  ? 'con_st_pair_' + q.animal :
  q.kind === 'set'   ? 'con_st_set_' + q.animal :
  q.kind === 'anti'  ? 'con_st_anti_' + q.animal :
  q.dir === 'up'     ? 'con_st_up_' + q.mid + '_' + q.base :
                       'con_st_dn_' + q.base + '_' + q.top;
const confirmKeyOf = q =>
  q.kind === 'anti'  ? 'con_cf_anti_' + q.animal :
  q.kind === 'chain' ? 'con_cf_chain_' + q.top :
                       'con_cf_' + q.animal;

/* ---------- 图标库 ---------- */
const SV = (inner) => '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' + inner + '</svg>';
const ST = 'stroke="' + INK + '" stroke-linejoin="round" stroke-linecap="round"';

/* 动物 SVG（v1 原样保留，lib 同序） */
const ANIMALS_SVG = [
  /* 0 小兔 */ SV(
    '<path d="M46 32 q-4 -14 -13 -19" stroke="#6FA063" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M54 32 q4 -14 13 -19" stroke="#6FA063" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 30 q0 -15 0 -21" stroke="#8FBF7F" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 34 q16 10 12 34 q-3 16 -12 27 q-9 -11 -12 -27 q-4 -24 12 -34 Z" fill="#E8975A" ' + ST + ' stroke-width="3"/>' +
    '<path d="M40 56 q10 3 20 0 M43 70 q8 3 15 0" stroke="' + INK + '" stroke-width="2" opacity=".35" fill="none"/>'),
  /* 1 小猫 */ SV(
    '<path d="M28 40 L24 14 L46 29 Z" fill="#FBF7F0" ' + ST + ' stroke-width="3"/>' +
    '<path d="M72 40 L76 14 L54 29 Z" fill="#FBF7F0" ' + ST + ' stroke-width="3"/>' +
    '<path d="M31 33 L29 21 L40 29 Z" fill="#F2B8C6"/>' +
    '<path d="M69 33 L71 21 L60 29 Z" fill="#F2B8C6"/>' +
    '<circle cx="50" cy="58" r="30" fill="#FBF7F0" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="40" cy="54" r="3.2" fill="' + INK + '"/><circle cx="60" cy="54" r="3.2" fill="' + INK + '"/>' +
    '<path d="M47 62 L53 62 L50 66 Z" fill="#D98A8A"/>' +
    '<path d="M50 66 q-4 5 -8 2 M50 66 q4 5 8 2" ' + ST + ' stroke-width="2.5" fill="none"/>' +
    '<path d="M26 60 L10 56 M26 66 L10 68 M74 60 L90 56 M74 66 L90 68" ' + ST + ' stroke-width="2" fill="none"/>'),
  /* 2 小狗 */ SV(
    '<ellipse cx="23" cy="52" rx="10" ry="20" fill="#C89B6D" ' + ST + ' stroke-width="3" transform="rotate(16 23 52)"/>' +
    '<ellipse cx="77" cy="52" rx="10" ry="20" fill="#C89B6D" ' + ST + ' stroke-width="3" transform="rotate(-16 77 52)"/>' +
    '<circle cx="50" cy="58" r="30" fill="#FBF7F0" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="40" cy="52" r="3.2" fill="' + INK + '"/><circle cx="60" cy="52" r="3.2" fill="' + INK + '"/>' +
    '<ellipse cx="50" cy="68" rx="12" ry="9" fill="#FBF7F0" ' + ST + ' stroke-width="2.5"/>' +
    '<ellipse cx="50" cy="63" rx="4.5" ry="3.5" fill="' + INK + '"/>' +
    '<path d="M50 67 q0 5 -6 5 M50 67 q0 5 6 5" ' + ST + ' stroke-width="2.5" fill="none"/>'),
  /* 3 猴子 */ SV(
    '<circle cx="24" cy="56" r="9" fill="#C89B6D" ' + ST + ' stroke-width="3"/><circle cx="76" cy="56" r="9" fill="#C89B6D" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="24" cy="56" r="4" fill="#F2D8BC"/><circle cx="76" cy="56" r="4" fill="#F2D8BC"/>' +
    '<circle cx="50" cy="58" r="28" fill="#C89B6D" ' + ST + ' stroke-width="3"/>' +
    '<ellipse cx="50" cy="42" rx="11" ry="8" fill="#FBF0DC"/>' +
    '<ellipse cx="50" cy="64" rx="16" ry="12" fill="#FBF0DC"/>' +
    '<circle cx="42" cy="58" r="3" fill="' + INK + '"/><circle cx="58" cy="58" r="3" fill="' + INK + '"/>' +
    '<circle cx="47" cy="64" r="1.4" fill="' + INK + '"/><circle cx="53" cy="64" r="1.4" fill="' + INK + '"/>' +
    '<path d="M44 70 q6 5 12 0" ' + ST + ' stroke-width="2.5" fill="none"/>'),
  /* 4 熊猫 */ SV(
    '<circle cx="28" cy="30" r="10" fill="' + INK + '"/><circle cx="72" cy="30" r="10" fill="' + INK + '"/>' +
    '<circle cx="50" cy="56" r="30" fill="#FFFDF8" ' + ST + ' stroke-width="3"/>' +
    '<ellipse cx="38" cy="52" rx="7.5" ry="9" fill="' + INK + '" transform="rotate(-15 38 52)"/>' +
    '<ellipse cx="62" cy="52" rx="7.5" ry="9" fill="' + INK + '" transform="rotate(15 62 52)"/>' +
    '<circle cx="37" cy="51" r="2.2" fill="#FFF9EE"/><circle cx="61" cy="51" r="2.2" fill="#FFF9EE"/>' +
    '<ellipse cx="50" cy="66" rx="4.5" ry="3.5" fill="' + INK + '"/>' +
    '<path d="M50 69 L50 72 M50 72 q-5 4 -9 0 M50 72 q5 4 9 0" ' + ST + ' stroke-width="2.5" fill="none"/>'),
  /* 5 小鸡 */ SV(
    '<circle cx="44" cy="30" r="4.5" fill="#E8975A" ' + ST + ' stroke-width="2.5"/>' +
    '<circle cx="55" cy="29" r="5" fill="#E8975A" ' + ST + ' stroke-width="2.5"/>' +
    '<ellipse cx="25" cy="62" rx="6" ry="9" fill="#F5C445" ' + ST + ' stroke-width="2.5" transform="rotate(18 25 62)"/>' +
    '<ellipse cx="75" cy="62" rx="6" ry="9" fill="#F5C445" ' + ST + ' stroke-width="2.5" transform="rotate(-18 75 62)"/>' +
    '<circle cx="50" cy="58" r="28" fill="#F5C445" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="40" cy="50" r="3" fill="' + INK + '"/><circle cx="60" cy="50" r="3" fill="' + INK + '"/>' +
    '<path d="M44 58 L56 58 L50 66 Z" fill="#E8975A" ' + ST + ' stroke-width="2.5"/>'),
  /* 6 绵羊 */ SV(
    '<path d="M50 24 q14 0 18 12 q10 4 6 14 q6 8 -4 12 q0 10 -12 8 q-8 8 -16 2 q-12 4 -14 -8 q-10 -4 -4 -14 q-6 -10 6 -14 q2 -12 16 -12 Z" fill="#FFFBF2" ' + ST + ' stroke-width="3"/>' +
    '<ellipse cx="36" cy="54" rx="5.5" ry="3.5" fill="#F2E2CE" ' + ST + ' stroke-width="2.5" transform="rotate(-20 36 54)"/>' +
    '<ellipse cx="64" cy="54" rx="5.5" ry="3.5" fill="#F2E2CE" ' + ST + ' stroke-width="2.5" transform="rotate(20 64 54)"/>' +
    '<ellipse cx="50" cy="60" rx="11" ry="12" fill="#F2E2CE" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="46" cy="58" r="2.5" fill="' + INK + '"/><circle cx="54" cy="58" r="2.5" fill="' + INK + '"/>' +
    '<path d="M47 66 q3 3 6 0" ' + ST + ' stroke-width="2" fill="none"/>'),
  /* 7 松鼠 */ SV(
    '<path d="M68 78 q22 -6 18 -30 q-2 -16 -14 -18 q10 14 -2 24 q-10 8 -10 20 Z" fill="#D98A5B" ' + ST + ' stroke-width="3"/>' +
    '<path d="M32 28 L30 16 L40 24 Z" fill="#C89B6D" ' + ST + ' stroke-width="2.5"/>' +
    '<path d="M52 28 L54 16 L44 24 Z" fill="#C89B6D" ' + ST + ' stroke-width="2.5"/>' +
    '<ellipse cx="42" cy="66" rx="20" ry="22" fill="#C89B6D" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="42" cy="40" r="17" fill="#C89B6D" ' + ST + ' stroke-width="3"/>' +
    '<ellipse cx="42" cy="70" rx="11" ry="13" fill="#F2E2CE"/>' +
    '<circle cx="36" cy="38" r="2.8" fill="' + INK + '"/><circle cx="48" cy="38" r="2.8" fill="' + INK + '"/>' +
    '<circle cx="42" cy="44" r="2" fill="' + INK + '"/>' +
    '<path d="M40 47 q2 2 4 0" ' + ST + ' stroke-width="2" fill="none"/>'),
  /* 8 小熊 */ SV(
    '<circle cx="30" cy="28" r="10" fill="#C89B6D" ' + ST + ' stroke-width="3"/><circle cx="70" cy="28" r="10" fill="#C89B6D" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="30" cy="28" r="4.5" fill="#F2D8BC"/><circle cx="70" cy="28" r="4.5" fill="#F2D8BC"/>' +
    '<circle cx="50" cy="56" r="30" fill="#C89B6D" ' + ST + ' stroke-width="3"/>' +
    '<ellipse cx="50" cy="66" rx="13" ry="10" fill="#F2E2CE"/>' +
    '<circle cx="38" cy="48" r="3.2" fill="' + INK + '"/><circle cx="62" cy="48" r="3.2" fill="' + INK + '"/>' +
    '<ellipse cx="50" cy="62" rx="4.5" ry="3.5" fill="' + INK + '"/>' +
    '<path d="M50 66 L50 69 M50 69 q-4 3 -7 0 M50 69 q4 3 7 0" ' + ST + ' stroke-width="2.5" fill="none"/>'),
  /* 9 青蛙 */ SV(
    '<circle cx="36" cy="32" r="11" fill="#8FBF7F" ' + ST + ' stroke-width="3"/><circle cx="64" cy="32" r="11" fill="#8FBF7F" ' + ST + ' stroke-width="3"/>' +
    '<ellipse cx="50" cy="60" rx="32" ry="26" fill="#8FBF7F" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="36" cy="32" r="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="64" cy="32" r="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="36" cy="33" r="2.6" fill="' + INK + '"/><circle cx="64" cy="33" r="2.6" fill="' + INK + '"/>' +
    '<circle cx="27" cy="64" r="3.5" fill="#F2B8C6" opacity=".8"/><circle cx="73" cy="64" r="3.5" fill="#F2B8C6" opacity=".8"/>' +
    '<circle cx="46" cy="54" r="1.6" fill="' + INK + '"/><circle cx="54" cy="54" r="1.6" fill="' + INK + '"/>' +
    '<path d="M34 67 q16 13 32 0" ' + ST + ' stroke-width="3" fill="none"/>'),
  /* 10 小鸟 */ SV(
    '<path d="M68 62 q15 -9 19 -2 q-7 6 -15 8 Z" fill="#7FA9CF" ' + ST + ' stroke-width="2.5"/>' +
    '<circle cx="46" cy="60" r="26" fill="#A8CBE8" ' + ST + ' stroke-width="3"/>' +
    '<path d="M46 35 q0 -8 8 -7" ' + ST + ' stroke-width="2.5" fill="none"/>' +
    '<path d="M22 58 l-12 4 l12 5 Z" fill="#E8975A" ' + ST + ' stroke-width="2.5"/>' +
    '<circle cx="34" cy="52" r="3" fill="' + INK + '"/>' +
    '<ellipse cx="44" cy="64" rx="11" ry="7" fill="#8FB5D8" ' + ST + ' stroke-width="2.5" transform="rotate(-18 44 64)"/>'),
  /* 11 老鼠 */ SV(
    '<circle cx="30" cy="30" r="13" fill="#B9B3AB" ' + ST + ' stroke-width="3"/><circle cx="70" cy="30" r="13" fill="#B9B3AB" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="30" cy="30" r="6.5" fill="#F2B8C6"/><circle cx="70" cy="30" r="6.5" fill="#F2B8C6"/>' +
    '<circle cx="50" cy="56" r="27" fill="#C6C0B8" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="42" cy="52" r="3" fill="' + INK + '"/><circle cx="58" cy="52" r="3" fill="' + INK + '"/>' +
    '<circle cx="50" cy="62" r="2.8" fill="#D98A8A"/>' +
    '<path d="M50 65 q-3 3 -6 1 M50 65 q3 3 6 1" ' + ST + ' stroke-width="2.5" fill="none"/>' +
    '<path d="M28 58 L12 54 M28 64 L12 66 M72 58 L88 54 M72 64 L88 66" ' + ST + ' stroke-width="2" fill="none"/>')
];

/* 食物 SVG（0-11 v1 原样；12 白菜 / 13 苹果 r6 新增） */
const FOODS_SVG = [
  /* 0 萝卜 */ SV(
    '<path d="M46 32 q-4 -14 -13 -19" stroke="#6FA063" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M54 32 q4 -14 13 -19" stroke="#6FA063" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 30 q0 -15 0 -21" stroke="#8FBF7F" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 34 q16 10 12 34 q-3 16 -12 27 q-9 -11 -12 -27 q-4 -24 12 -34 Z" fill="#E8975A" ' + ST + ' stroke-width="3"/>' +
    '<path d="M40 56 q10 3 20 0 M43 70 q8 3 15 0" stroke="' + INK + '" stroke-width="2" opacity=".35" fill="none"/>'),
  /* 1 小鱼 */ SV(
    '<path d="M66 54 L88 42 q-5 12 0 24 Z" fill="#8FB5D8" ' + ST + ' stroke-width="2.5"/>' +
    '<ellipse cx="44" cy="55" rx="27" ry="17" fill="#A8CBE8" ' + ST + ' stroke-width="3"/>' +
    '<path d="M38 38 q7 -11 15 -7 q-4 7 -10 9 Z" fill="#7FA9CF" ' + ST + ' stroke-width="2.5"/>' +
    '<circle cx="31" cy="51" r="3" fill="' + INK + '"/>' +
    '<path d="M40 63 q8 5 16 2" ' + ST + ' stroke-width="2.5" fill="none"/>' +
    '<circle cx="79" cy="28" r="3.5" stroke="' + INK + '" stroke-width="2" opacity=".45"/>' +
    '<circle cx="88" cy="18" r="2.5" stroke="' + INK + '" stroke-width="2" opacity=".45"/>'),
  /* 2 骨头 */ SV(
    '<path d="M34.3 45 L65.7 45 A11 11 0 1 1 65.7 55 L34.3 55 A11 11 0 1 1 34.3 45 Z" fill="#FFFBF2" ' + ST + ' stroke-width="3"/>'),
  /* 3 香蕉 */ SV(
    '<path d="M24 28 C18 56 36 80 68 78 C76 77 78 71 72 70 C48 72 32 54 34 30 C34 24 26 22 24 28 Z" fill="#F5C445" ' + ST + ' stroke-width="3"/>' +
    '<path d="M26 26 L21 19" ' + ST + ' stroke-width="3" fill="none"/>' +
    '<path d="M34 36 q0 20 15 32" stroke="' + INK + '" stroke-width="2" opacity=".35" fill="none"/>'),
  /* 4 竹子 */ SV(
    '<path d="M36 14 q-16 -8 -24 2 q12 6 24 4 Z" fill="#8FBF7F" ' + ST + ' stroke-width="2.5"/>' +
    '<path d="M58 22 q16 -10 26 -2 q-12 8 -26 6 Z" fill="#8FBF7F" ' + ST + ' stroke-width="2.5"/>' +
    '<rect x="32" y="14" width="10" height="74" rx="5" fill="#8FBF7F" ' + ST + ' stroke-width="3"/>' +
    '<rect x="54" y="22" width="10" height="66" rx="5" fill="#8FBF7F" ' + ST + ' stroke-width="3"/>' +
    '<path d="M32 38 h10 M32 60 h10 M54 44 h10 M54 66 h10" stroke="' + INK + '" stroke-width="2" opacity=".45"/>'),
  /* 5 毛毛虫 */ SV(
    '<path d="M21 47 l-5 -9 M27 47 l5 -9" ' + ST + ' stroke-width="2" fill="none"/>' +
    '<circle cx="19" cy="37" r="2" fill="' + INK + '"/><circle cx="33" cy="37" r="2" fill="' + INK + '"/>' +
    '<circle cx="24" cy="58" r="11" fill="#A3CC93" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="39" cy="54" r="10" fill="#8FBF7F" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="54" cy="56" r="10" fill="#8FBF7F" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="69" cy="60" r="9" fill="#8FBF7F" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="21" cy="55" r="2.2" fill="' + INK + '"/><circle cx="28" cy="55" r="2.2" fill="' + INK + '"/>' +
    '<path d="M21 61 q4 3 7 0" ' + ST + ' stroke-width="2" fill="none"/>'),
  /* 6 青草 */ SV(
    '<ellipse cx="50" cy="88" rx="34" ry="5" fill="#F3E7CF"/>' +
    '<path d="M32 86 Q24 62 20 46 M40 86 Q36 56 38 38 M50 86 Q50 52 54 34 M60 86 Q64 56 68 40 M68 86 Q76 64 82 52" stroke="#8FBF7F" stroke-width="6.5" fill="none" stroke-linecap="round"/>'),
  /* 7 松果 */ SV(
    '<path d="M50 22 L50 12" stroke="#6FA063" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M50 14 q-8 -4 -12 2 M50 14 q8 -4 12 2" stroke="#6FA063" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 22 q22 10 20 40 q-2 22 -20 27 q-18 -5 -20 -27 q-2 -30 20 -40 Z" fill="#C89B6D" ' + ST + ' stroke-width="3"/>' +
    '<path d="M36 44 q14 6 28 0 M34 58 q16 6 32 0 M38 72 q12 5 24 0" stroke="' + INK + '" stroke-width="2" opacity=".45" fill="none"/>' +
    '<path d="M42 30 q-2 28 4 54 M58 30 q2 28 -4 54" stroke="' + INK + '" stroke-width="2" opacity=".45" fill="none"/>'),
  /* 8 蜂蜜 */ SV(
    '<path d="M30 40 q-10 4 -8 18 q2 26 28 26 q26 0 28 -26 q2 -14 -8 -18 Z" fill="#DDA85C" ' + ST + ' stroke-width="3"/>' +
    '<rect x="28" y="30" width="44" height="11" rx="5.5" fill="#C88A4A" ' + ST + ' stroke-width="3"/>' +
    '<path d="M50 56 q-6 -8 -12 -2 q-4 6 12 17 q16 -11 12 -17 q-6 -6 -12 2 Z" fill="#FFF9EE" opacity=".92"/>'),
  /* 9 蚊子 */ SV(
    '<path d="M34 48 L16 41" ' + ST + ' stroke-width="2" fill="none"/>' +
    '<ellipse cx="55" cy="42" rx="11" ry="5" fill="#D8E4EE" opacity=".9" ' + ST + ' stroke-width="2" transform="rotate(-24 55 42)"/>' +
    '<ellipse cx="59" cy="47" rx="10" ry="4.5" fill="#E6EEF5" opacity=".9" ' + ST + ' stroke-width="2" transform="rotate(-8 59 47)"/>' +
    '<circle cx="39" cy="49" r="5.5" fill="#8A9BAE" ' + ST + ' stroke-width="2.5"/>' +
    '<ellipse cx="53" cy="57" rx="12" ry="7.5" fill="#8A9BAE" ' + ST + ' stroke-width="2.5" transform="rotate(-14 53 57)"/>' +
    '<path d="M48 52 q2 4 0 8 M56 53 q2 4 0 8" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
    '<path d="M46 63 l-6 13 M52 64 l0 14 M58 63 l7 12" ' + ST + ' stroke-width="2" fill="none"/>' +
    '<circle cx="38" cy="48" r="1.5" fill="' + INK + '"/>'),
  /* 10 红果 */ SV(
    '<path d="M38 51 q0 -14 9 -22 M62 47 q-2 -12 -9 -18" stroke="#6FA063" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M47 29 q10 -10 22 -6 q-8 9 -22 6 Z" fill="#8FBF7F" ' + ST + ' stroke-width="2.5"/>' +
    '<circle cx="38" cy="64" r="13" fill="#E07856" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="62" cy="60" r="13" fill="#E07856" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="34" cy="60" r="2.5" fill="#FFF9EE" opacity=".75"/><circle cx="58" cy="56" r="2.5" fill="#FFF9EE" opacity=".75"/>'),
  /* 11 奶酪 */ SV(
    '<path d="M20 78 L82 30 L82 78 Z" fill="#F5C445" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="52" cy="62" r="5" fill="#D9A62E"/><circle cx="67" cy="69" r="4" fill="#D9A62E"/>' +
    '<circle cx="44" cy="71" r="3.5" fill="#D9A62E"/><circle cx="62" cy="47" r="3" fill="#D9A62E"/>'),
  /* 12 白菜（r6 新增）：白帮绿叶 */ SV(
    '<path d="M50 12 q-16 2 -18 18 q-14 8 -8 24 q-6 16 10 22 q4 12 16 10 q12 2 16 -10 q16 -6 10 -22 q6 -16 -8 -24 q-2 -16 -18 -18 Z" fill="#A3CC93" ' + ST + ' stroke-width="3"/>' +
    '<path d="M40 30 q-10 16 -4 38 M60 30 q10 16 4 38 M50 24 q0 24 0 56" stroke="' + INK + '" stroke-width="2" opacity=".3" fill="none"/>' +
    '<path d="M50 44 q-22 -2 -26 -20 q22 -2 26 20 Z" fill="#FBF7F0" ' + ST + ' stroke-width="2.5"/>' +
    '<path d="M50 44 q22 -2 26 -20 q-22 -2 -26 20 Z" fill="#FBF7F0" ' + ST + ' stroke-width="2.5"/>' +
    '<ellipse cx="50" cy="66" rx="13" ry="17" fill="#FBF7F0" ' + ST + ' stroke-width="2.5"/>' +
    '<path d="M43 60 q7 -3 14 0" stroke="#C9DFAF" stroke-width="2.5" fill="none" stroke-linecap="round"/>'),
  /* 13 苹果（r6 新增）：红圆+叶 */ SV(
    '<path d="M50 30 q-2 -12 8 -18" stroke="#6FA063" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M52 18 q12 -10 22 -2 q-10 10 -22 2 Z" fill="#8FBF7F" ' + ST + ' stroke-width="2.5"/>' +
    '<circle cx="34" cy="58" r="20" fill="#E07856" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="66" cy="58" r="20" fill="#E07856" ' + ST + ' stroke-width="3"/>' +
    '<path d="M22 66 q6 22 28 22 q22 0 28 -22 q-12 10 -28 4 q-16 6 -28 -4 Z" fill="#D9664A" ' + ST + ' stroke-width="3"/>' +
    '<circle cx="27" cy="50" r="3.5" fill="#FFF9EE" opacity=".6"/><circle cx="60" cy="50" r="3.5" fill="#FFF9EE" opacity=".6"/>')
];

/* ---------- 图标（内嵌 SVG，描边暖棕；v1 原样） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="10" cy="22" r="6" fill="#E8975A" stroke="#FFF" stroke-width="3"/>' +
    '<circle cx="34" cy="22" r="6" fill="#8FBF7F" stroke="#FFF" stroke-width="3"/>' +
    '<path d="M15 22 Q22 10 29 22" stroke="#E8975A" stroke-width="4" stroke-linecap="round" fill="none"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  nom: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M32 8 L38 24 L55 24 L41 34 L47 51 L32 41 L17 51 L23 34 L9 24 L26 24 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 34 L27 47 L50 18" stroke="#6FA063" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrow: '<svg viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 20 H46 M38 8 L52 20 L38 32" stroke="#E8975A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
