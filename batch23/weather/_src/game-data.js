/* ================= weather 天气穿衣 游戏数据 v2（条件推理改造 2026-09-13）
   玩法：题面 = 条件区（天气动画/温度计/人物/去处图标）+ TTS 题面句，下方 4-6 张衣物卡。
   v2 章型（SPEC-BATCH23 §1 v2）：
     ch1 双条件单选（场景+天气 → 核心 1 件）
     ch2 多条件叠加（两条件 → 2 件 + 「穿好啦」提交制）
     ch3 温度计区间（6 档 5 区间 + 边界题 8/16/24 度）
     ch4 家人差异化（谁更怕冷）+ 反向题（哪件不用带）+ 混合
   衣物池 13 件（每件唯一合理温度区间——先验表，禁交叉歧义）：
     雪/严寒 <0 = 羽绒服·手套·雪地靴 / 冷 0-8 = 厚外套·围巾 / 凉 9-16 = 小外套 /
     舒适 17-24 = 长袖 / 热 25+ = 短袖·太阳帽·凉鞋·泳衣 / 雨（无温度区间）= 雨衣·雨靴。
   干扰铁律（承 §0.52 家族）：天气题干扰 ∉ 当题天气同类；温度题干扰 ∉ 当题区间；
   who 题=梯子全集（唯一正确档）；反向题干扰恰「会用上」。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 衣物库 v2（13 件）：id → 名称 + cls=天气类（干扰排除用）+ zone=唯一温度区间(1-5,0=雨具无区间)
   cls: rain 雨 / snow 雪·严寒·冷 / wind 风·凉 / mild 舒适 / sun 晴·热
   zone: 1=<0 严寒 / 2=0-8 冷 / 3=9-16 凉 / 4=17-24 舒适 / 5=25+ 热 / 0=雨具 */
const CLOTHES = {
  downcoat:  { n: '羽绒服', cls: 'snow', zone: 1 },
  gloves:    { n: '手套',   cls: 'snow', zone: 1 },
  snowboots: { n: '雪地靴', cls: 'snow', zone: 1 },
  coat:      { n: '厚外套', cls: 'snow', zone: 2 },
  scarf:     { n: '围巾',   cls: 'snow', zone: 2 },
  jacket:    { n: '小外套', cls: 'wind', zone: 3 },
  longsleeve:{ n: '长袖',   cls: 'mild', zone: 4 },
  shorts:    { n: '短袖',   cls: 'sun',  zone: 5 },
  sunhat:    { n: '太阳帽', cls: 'sun',  zone: 5 },
  sandals:   { n: '凉鞋',   cls: 'sun',  zone: 5 },
  swimwear:  { n: '泳衣',   cls: 'sun',  zone: 5 },
  raincoat:  { n: '雨衣',   cls: 'rain', zone: 0 },
  rainboots: { n: '雨靴',   cls: 'rain', zone: 0 }
};
const nameOf = id => CLOTHES[id].n;
const CLS_ITEMS = { rain: ['raincoat', 'rainboots'],
                    snow: ['downcoat', 'gloves', 'snowboots', 'coat', 'scarf'],
                    wind: ['jacket'], mild: ['longsleeve'],
                    sun: ['shorts', 'sunhat', 'sandals', 'swimwear'] };

/* ---------- 温度区间（ch3/ch4 真值表）：区间 → items(该区间全部合理衣物) + outfit(区间正装) */
const ZONES = {
  1: { name: '严寒', lo: -99, hi: -1, items: ['downcoat', 'gloves', 'snowboots'],
       outfit: ['downcoat', 'gloves'] },                /* <0 羽绒服+手套 */
  2: { name: '冷',   lo: 0,   hi: 8,  items: ['coat', 'scarf'],
       outfit: ['coat', 'scarf'] },                     /* 0-8 厚外套+围巾 */
  3: { name: '凉',   lo: 9,   hi: 16, items: ['jacket'],
       outfit: ['jacket'] },                            /* 9-16 小外套 */
  4: { name: '舒适', lo: 17,  hi: 24, items: ['longsleeve'],
       outfit: ['longsleeve'] },                        /* 17-24 长袖 */
  5: { name: '热',   lo: 25,  hi: 99, items: ['shorts', 'sunhat', 'sandals', 'swimwear'],
       outfit: ['shorts', 'sunhat'] }                   /* 25+ 短袖+太阳帽 */
};
const zoneOfTemp = t => (t < 0 ? 1 : (t <= 8 ? 2 : (t <= 16 ? 3 : (t <= 24 ? 4 : 5))));
/* 温度池：主六档 -5/5/12/18/25/32 + 边界题 8/16/24 */
const TEMPS = [-5, 5, 8, 12, 16, 18, 24, 25, 32];
const BOUNDARY_TEMPS = [8, 16, 24];
/* 温度中文（TTS 题面用，负温度=零下——SpeechSynthesis 直读 -5 不可靠） */
function tempCn(t) {
  const D = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const two = n => (n < 10 ? D[n] : (n < 20 ? '十' + (n % 10 ? D[n % 10] : '') : D[Math.floor(n / 10)] + '十' + (n % 10 ? D[n % 10] : '')));
  return (t < 0 ? '零下' + two(-t) : two(t)) + '度';
}
/* 厚薄梯子（ch4 家人差异化：怕冷升一档 / 怕热降一档——每档唯一代表件） */
const LADDER = ['downcoat', 'coat', 'jacket', 'longsleeve', 'shorts'];
const WHO_TEMPS = [5, 8, 12, 16, 18, 24];               /* 基准档 2-4：升降档都存在 */
const PERSONS = {
  mom:   { n: '妈妈',   feel: 'cold', badge: 'cold', shift: -1 },   /* 怕冷 → 更厚一档 */
  bunny: { n: '小兔子', feel: 'hot',  badge: 'hot',  shift: 1 }     /* 怕热 → 更薄一档 */
};

/* ---------- ch1 双条件单选题表（场景+天气 → 核心 1 件；干扰 ∉ 当题天气类 → 唯一正确） */
const CH1_ROWS = [
  { id: 'r0', scene: 'school',   weather: 'rain', need: 'raincoat',  stem: '下雨啦，去上学，穿什么' },
  { id: 'r1', scene: 'puddle',   weather: 'rain', need: 'rainboots', stem: '下雨啦，去踩水坑，穿什么' },
  { id: 'r2', scene: 'school',   weather: 'sun',  need: 'sunhat',    stem: '太阳晒晒，去上学，戴什么' },
  { id: 'r3', scene: 'beach',    weather: 'sun',  need: 'shorts',    stem: '太阳晒晒，去沙滩，穿什么' },
  { id: 'r4', scene: 'swim',     weather: 'sun',  need: 'swimwear',  stem: '太阳晒晒，去游泳，穿什么' },
  { id: 'r5', scene: 'school',   weather: 'snow', need: 'coat',      stem: '下雪啦，去上学，穿什么' },
  { id: 'r6', scene: 'snowman',  weather: 'snow', need: 'gloves',    stem: '下雪啦，去堆雪人，戴什么' },
  { id: 'r7', scene: 'snowwalk', weather: 'snow', need: 'snowboots', stem: '下雪啦，去踩雪，穿什么' },
  { id: 'r8', scene: 'park',     weather: 'wind', need: 'jacket',    stem: '刮风啦，去公园，穿什么' }
];

/* ---------- ch2 多条件叠加题表（两条件 → 2 件；干扰 ∉ need 的天气类 → 干扰均不满足任一条件）
   ANCHOR：cm0 = flat0 题0 教学演示题（wea_tut_watch「看！下雨要穿雨衣」与演示动作一致） */
const COMBOS = [
  { id: 'cm0', conds: [{ k: 'weather', v: 'rain' }, { k: 'weather', v: 'wind' }],
    scene: 'rain', stem: '又下雨又刮风，要穿两件哦', need: ['raincoat', 'jacket'] },
  { id: 'cm1', conds: [{ k: 'weather', v: 'cold' }, { k: 'weather', v: 'rain' }],
    scene: 'rain', stem: '又冷又下雨，要穿两件哦', need: ['coat', 'rainboots'] },
  { id: 'cm2', conds: [{ k: 'weather', v: 'hot' }, { k: 'weather', v: 'sun' }],
    scene: 'sun',  stem: '又晒又热，要穿两件哦', need: ['sunhat', 'shorts'] },
  { id: 'cm3', conds: [{ k: 'weather', v: 'cold' }, { k: 'weather', v: 'wind' }],
    scene: 'wind', stem: '又冷又刮风，要穿两件哦', need: ['scarf', 'coat'] },
  { id: 'cm4', conds: [{ k: 'weather', v: 'snow' }, { k: 'scene', v: 'snowman' }],
    scene: 'snow', stem: '下雪啦，去堆雪人，要穿两件哦', need: ['downcoat', 'gloves'] }
];
/* feel → 天气类（cold/hot 视觉=雪花/红日 chip；类归属按语义映射到 snow/sun 类做干扰排除） */
const FEEL_CLS = { cold: 'snow', hot: 'sun' };
const condCls = c => (c.k === 'weather' ? (FEEL_CLS[c.v] || c.v) : null);

/* ---------- ch4 反向题场景表（干扰恰「会用上」，need=唯一不会用的） */
const ANTI_SCENES = [
  { id: 'beach',   stem: '去沙滩玩水，哪一件不用带', used: ['shorts', 'sunhat', 'sandals', 'swimwear'] },
  { id: 'snowman', stem: '去堆雪人，哪一件不用带',   used: ['downcoat', 'gloves', 'scarf', 'snowboots'] },
  { id: 'swim',    stem: '去游泳，哪一件不用带',     used: ['swimwear', 'sandals', 'sunhat'] }
];

/* ---------- 章配置（章号 1 基；hint=预告下一章 b21 教训禁右移；GEN_HINTS[k]↔dch=k+1） */
const CHAPTERS = {
  1: { name: '看天气挑衣服', hint: '下次要两个条件一起想啦' },   // 预告 ch2 多条件
  2: { name: '两个条件',     hint: '下次要看温度计挑衣服啦' },   // 预告 ch3 温度计
  3: { name: '温度计',       hint: '下次帮家人也挑对衣服哦' },   // 预告 ch4 家人差异化
  4: { name: '大挑战',       hint: '新一轮穿衣挑战来啦' }        // 预告生成关
};
const GEN_HINTS = ['天气和要去的地方，一起想一想',   // dch1 双条件单选
                   '两个条件都要想到，挑两件哦',     // dch2 多条件叠加
                   '看看温度计，按温度挑衣服',       // dch3 温度区间
                   '天气温度和家人，大混搭挑战'];    // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- r9 时长模型（SPEC §1-r9 定版：modeled 单关时长硬断言 ≥40000ms，治"净交互 1.3s/题"）
   estMs 家族定版 n*345+600（题面句动态 TTS 语音窗估计；data 定义/main 注释/verify 独立副本/build
   字面四处同步，禁 +300 变体）。每题 quizDurMs = max(estMs(题面句码点), DECIDE_MS[kind]) +
   (多件题 SUBMIT_MS)——语音窗与决策重叠取大者不重复计（shadow r8 先例）。
   DECIDE_MS 推算锚：v1 单条件 4 选 1 实测 4.5s/题（22.6s/关÷5，含演出 1.2s→决策 3.3s）；
   v2 one=双条件（天气+去处交集）×6 卡 → 7400（3.3s×2条件×1.5候选×0.75 保守折减）；
   temp=温度计读数（数值认知）+区间映射 7800 / multi=双条件合成+两件+提交 8000 /
   who=温度+人物特质升降档推理链 8200 / anti=反向排除（4 卡）7000。
   SUBMIT_MS=1600（多件题「穿好啦」提交确认步）；SW_MS=900×5（换题全场景重建+卡 stagger 入场）。
   认知主导自证：全题型 DECIDE_MS ≥ estMs(该题型最长题面句)（who 20 码点→7500<8200），
   语音窗从不撑时长（认知占比 ≥85% 断言）。 */
const estMs = n => n * 345 + 600;
const DECIDE_MS = { one: 7400, multi: 8000, temp: 7800, who: 8200, anti: 7000 };
const SUBMIT_MS = 1600;
const SW_MS = 900;
const quizDurMs = q => Math.max(estMs(q.stem.length), DECIDE_MS[q.kind]) +
                       (q.need.length > 1 ? SUBMIT_MS : 0);
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0) + CH_LEN * SW_MS;
const LEVEL_MIN_MS = 40000;   // 5-6 岁段单关硬指标（AUDIT-56 排期口径）

/* ---------- 语音（与 voice/clips/manifest.json 严格一致，禁自造）
   v2 新增 4 条件 hint（wea_multi/temp/who/anti_hint）；题面句：T46 阶段2 起静态 17 句
   clip 化（wea_st_0..16，见 STEM_LIST）；temp/who 动态句（含温度数词）仍 TTS 兜底；
   wea_w_*（ch1 错选语义反馈）+ wea_hint（雨题空白轻提示）+ 四包装 core 沿用 */
const VOICE = {
  watch:     { key: 'wea_tut_watch',  text: '看！下雨要穿雨衣' },
  turn:      { key: 'wea_tut_turn',   text: '你来选一选' },
  right:     { key: 'wea_right',      text: '穿得刚刚好，出门啦' },
  hint:      { key: 'wea_hint',       text: '看看天上的雨' },
  hintMulti: { key: 'wea_multi_hint', text: '两个条件都要想到哦' },
  hintTemp:  { key: 'wea_temp_hint',  text: '看看温度计，几度呀' },
  hintWho:   { key: 'wea_who_hint',   text: '想一想，谁更怕冷呀' },
  hintAnti:  { key: 'wea_anti_hint',  text: '找一找，哪件用不上' },
  wrongKeyOf: w => 'wea_w_' + w                          /* ch1 错选反馈（4 天气 clip 沿用） */
};
const SUBMIT_TEXT = {
  less: { key: 'wea_sub_less', text: '还差一件，再找一找哦' },    /* 少点：不清空继续挑（T46 clip 化） */
  more: { key: 'wea_sub_more', text: '多选了一件，重新挑一挑哦' } /* 多点：清空重选 + miss（T46 clip 化） */
};
/* T46 阶段2 题面 stem clip 键：wea_st_{i} 与 gen_clips T46 注册序严格一致（对 game-data.js
   源内 stem 字面量按出现序 findall：CH1_ROWS 0-8 / COMBOS 9-13 / ANTI_SCENES 14-16，
   17 句全互异）；temp/who 题 stem 为动态拼接句（含温度数词）不在列表 → 返回 null 走 TTS */
const STEM_LIST = CH1_ROWS.map(r => r.stem).concat(COMBOS.map(c => c.stem), ANTI_SCENES.map(s => s.stem));
/* T46 主线补（09-19）：temp/who 题面=封闭有限域 21 句（TEMPS 9 + WHO_TEMPS 6×2 人），
   gen_clips wea_tt_ 与 wea_tw_ 族已注册——t=-5 键名 m5 与注册侧一致；不再走 TTS */
const stemKeyOf = q => {
  const i = STEM_LIST.indexOf(q.stem);
  if (i >= 0) return 'wea_st_' + i;
  if (q.kind === 'temp') return 'wea_tt_' + (q.temp < 0 ? 'm' + (-q.temp) : q.temp);
  if (q.kind === 'who') return 'wea_tw_' + q.person + '_' + q.temp;
  return null;
};

/* ---------- 衣物 SVG（viewBox 0 0 100 100，描线风；五件外套系一眼可辨：
   雨衣=黄+兜帽+扣子 / 厚外套=橙+横绗缝 / 小外套=青+拉链 / 羽绒服=珊瑚红+蓬蓬鼓包+连帽 / 长袖=绿长袖T形） */
function clothSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="88" height="88"';
  const open = '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  const sw = 'stroke="' + INK + '"';
  if (id === 'sunhat') return open +
    '<ellipse cx="50" cy="68" rx="39" ry="13" fill="#EFC87A" ' + sw + ' stroke-width="3.5"/>' +
    '<path d="M29 66 a21 25 0 0 1 42 0 Z" fill="#F6D794" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M31 57 q19 9 38 0" stroke="#E8483C" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="42" cy="60" rx="6" ry="3" fill="#FFF" opacity=".5"/></svg>';
  if (id === 'shorts') return open +
    '<path d="M36 24 L64 24 L78 36 L71 49 L64 43 L64 80 L36 80 L36 43 L29 49 L22 36 Z" fill="#F2A66C" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M42 24 q8 9 16 0" fill="#E8975A" ' + sw + ' stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M40 56 h20 M40 68 h20" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/></svg>';
  if (id === 'raincoat') return open +
    '<path d="M37 40 L21 48 L26 64 L32 61 L30 88 L70 88 L68 61 L74 64 L79 48 L63 40 L50 49 Z" fill="#F5C542" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M37 40 q13 -22 26 0 q-13 -10 -26 0 Z" fill="#E8B52E" ' + sw + ' stroke-width="3"/>' +
    '<path d="M50 49 v39" ' + sw + ' stroke-width="2.5"/>' +
    '<circle cx="57" cy="58" r="3" fill="#FFF9EE" ' + sw + ' stroke-width="2"/>' +
    '<circle cx="57" cy="70" r="3" fill="#FFF9EE" ' + sw + ' stroke-width="2"/>' +
    '<circle cx="57" cy="82" r="3" fill="#FFF9EE" ' + sw + ' stroke-width="2"/></svg>';
  if (id === 'rainboots') {
    const boot = fill =>
      '<path d="M36 16 H56 V50 Q56 54 62 55 L76 58 Q82 60 82 66 V74 H36 Z" fill="' + fill + '" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
      '<rect x="32" y="72" width="54" height="11" rx="4" fill="#3B6FA3" ' + sw + ' stroke-width="3"/>' +
      '<path d="M40 25 h12" stroke="#FFF" opacity=".45" stroke-width="3.5" stroke-linecap="round"/>';
    return open +
      '<g transform="translate(-4,12) scale(.85)">' + boot('#4E8FD0') + '</g>' +
      '<g transform="translate(20,0) scale(.85)">' + boot('#6FA8DC') + '</g></svg>';
  }
  if (id === 'scarf') return open +
    '<path d="M24 38 Q50 24 76 38 L72 52 Q50 40 28 52 Z" fill="#E8483C" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M28 52 Q50 40 72 52 L68 64 Q50 54 32 64 Z" fill="#C93A30" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M56 61 L68 57 L75 82 Q66 89 57 84 Z" fill="#E8483C" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M60 84 l-2 8 M66 86 l-1 8 M72 83 l3 8" ' + sw + ' stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M30 41 q20 -9 40 0" stroke="#FFF" opacity=".5" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>';
  if (id === 'gloves') return open +
    '<g transform="translate(6,0)">' +
    '<path d="M30 40 a15 17 0 0 1 30 0 v20 a13 12 0 0 1 -3 8 h-24 a13 12 0 0 1 -3 -8 Z" fill="#57B368" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M31 48 q-11 -3 -12 5 q-1 9 11 7" fill="#57B368" ' + sw + ' stroke-width="3"/>' +
    '<rect x="28" y="68" width="34" height="12" rx="4" fill="#8FBF7F" ' + sw + ' stroke-width="3"/></g>' +
    '<g transform="translate(34,4)">' +
    '<path d="M30 40 a15 17 0 0 1 30 0 v20 a13 12 0 0 1 -3 8 h-24 a13 12 0 0 1 -3 -8 Z" fill="#6FC47F" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M31 48 q-11 -3 -12 5 q-1 9 11 7" fill="#6FC47F" ' + sw + ' stroke-width="3"/>' +
    '<rect x="28" y="68" width="34" height="12" rx="4" fill="#8FBF7F" ' + sw + ' stroke-width="3"/></g></svg>';
  if (id === 'coat') return open +
    '<path d="M37 38 L21 46 L26 62 L32 59 L30 88 L70 88 L68 59 L74 62 L79 46 L63 38 L50 47 Z" fill="#E8975A" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M37 38 l13 9 l13 -9 l-4 -8 q-9 6 -18 0 Z" fill="#D97F3E" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 47 v41" ' + sw + ' stroke-width="2.5"/>' +
    '<path d="M33 58 h34 M32 70 h36 M31 80 h38" ' + sw + ' stroke-width="2.5" stroke-linecap="round"/></svg>';
  if (id === 'jacket') return open +
    '<path d="M38 40 L24 48 L29 61 L34 58 L33 82 L67 82 L66 58 L71 61 L76 48 L62 40 L50 48 Z" fill="#6FA8B8" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M38 40 l12 8 l12 -8 l-3 -7 q-9 5 -18 0 Z" fill="#5E93A3" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 48 v34" ' + sw + ' stroke-width="2.5"/>' +
    '<path d="M50 52 v3 M50 60 v3 M50 68 v3" stroke="#FFF9EE" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M37 72 h9 M54 72 h9" ' + sw + ' stroke-width="2.5" stroke-linecap="round"/></svg>';
  if (id === 'downcoat') return open +
    '<path d="M37 42 L22 50 L27 63 L32 60 L31 86 L69 86 L68 60 L73 63 L78 50 L63 42 L50 50 Z" fill="#E8756C" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M37 42 q13 -24 26 0 q-13 -10 -26 0 Z" fill="#D96058" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 50 v36" ' + sw + ' stroke-width="2.5"/>' +
    '<path d="M33 54 q17 7 34 0 M32 66 q18 7 36 0 M32 78 q18 7 36 0" fill="none" ' + sw + ' stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="42" cy="60" r="2.6" fill="#FFF9EE" ' + sw + ' stroke-width="2"/>' +
    '<circle cx="58" cy="72" r="2.6" fill="#FFF9EE" ' + sw + ' stroke-width="2"/></svg>';
  if (id === 'longsleeve') return open +
    '<path d="M38 26 L62 26 L62 32 L82 40 L77 58 L62 54 L62 84 L38 84 L38 54 L23 58 L18 40 L38 32 Z" fill="#7FBF9F" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M38 26 q12 10 24 0" fill="#6FB08F" ' + sw + ' stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M40 38 h20" stroke="#FFF" opacity=".5" stroke-width="3.5" stroke-linecap="round"/></svg>';
  if (id === 'snowboots') {
    const sboot = fill =>
      '<path d="M36 26 H58 V56 Q58 60 64 61 L78 64 Q84 66 84 72 V76 H36 Z" fill="' + fill + '" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M34 26 h26 v10 h-26 z" fill="#F6E7D2" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
      '<path d="M42 34 h10 M46 30 h10" stroke="#E8D7BC" stroke-width="2.6" stroke-linecap="round"/>' +
      '<rect x="32" y="74" width="56" height="10" rx="4" fill="#D8C9B4" ' + sw + ' stroke-width="3"/>';
    return open +
      '<g transform="translate(-5,6) scale(.86)">' + sboot('#C9A2E0') + '</g>' +
      '<g transform="translate(21,-4) scale(.86)">' + sboot('#B48BD6') + '</g></svg>';
  }
  if (id === 'sandals') {
    const sandal = fill =>
      '<path d="M22 62 Q50 48 78 62 L74 74 Q50 64 26 74 Z" fill="' + fill + '" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
      '<path d="M36 62 q14 -12 28 0" fill="none" ' + sw + ' stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M42 63 l-4 8 M58 63 l4 8" ' + sw + ' stroke-width="3" stroke-linecap="round"/>';
    return open +
      '<g transform="translate(-3,4) scale(.88)">' + sandal('#F2B8C6') + '</g>' +
      '<g transform="translate(16,16) scale(.88)">' + sandal('#E8A0B4') + '</g></svg>';
  }
  if (id === 'swimwear') return open +
    '<path d="M34 24 Q50 34 66 24 L72 40 Q60 46 58 56 Q66 66 62 84 L38 84 Q34 66 42 56 Q40 46 28 40 Z" fill="#5FB8D8" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M30 42 q20 10 40 0" fill="none" stroke="#FFF" opacity=".6" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M36 70 q7 5 14 0 q7 5 14 0" fill="none" stroke="#FFF" opacity=".6" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M44 30 q6 -8 12 0" fill="none" ' + sw + ' stroke-width="2.5" stroke-linecap="round"/></svg>';
  return open + '</svg>';
}

/* ---------- 温度计 SVG（viewBox 0 0 360 184，场景主视觉：管+球+红柱高度∝温度+刻度+大数字）
   柱高映射 t∈[-10,35] → 18%..92%（负温偏蓝紫、暖温偏红橙，严寒另加雪花点缀） */
function thermoSvg(t) {
  const pct = Math.max(14, Math.min(94, (t + 10) / 45 * 80 + 14));
  const col = t < 0 ? '#7F9FD5' : (t < 9 ? '#6FA8DC' : (t < 17 ? '#F5C445' : (t < 25 ? '#E8975A' : '#E8483C')));
  const yTop = 150 - 118 * pct / 100;
  let ticks = '';
  for (let k = 0; k <= 4; k++) {
    const ty = 32 + k * 29.5;
    ticks += '<path d="M126 ' + ty.toFixed(1) + ' h10" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>';
  }
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#FDF4E4"/>' +
    '<path d="M0 184 q70 -14 140 -6 q90 10 220 -6 V184 Z" fill="#F2E4CC"/>' +
    /* 管 */
    '<rect x="136" y="18" width="30" height="132" rx="15" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="143" y="' + yTop.toFixed(1) + '" width="16" height="' + (150 - yTop).toFixed(1) + '" rx="8" fill="' + col + '"/>' +
    /* 球 */
    '<circle cx="151" cy="158" r="17" fill="' + col + '" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="146" cy="152" rx="5" ry="3.4" fill="#FFF" opacity=".55"/>' +
    ticks +
    /* 大数字读数 */
    '<text x="214" y="96" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="58" font-weight="700" fill="' + INK + '">' + t + '</text>' +
    '<text x="214" y="128" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-size="26" fill="#8A7563">摄氏度</text>' +
    (t < 0 ? '<g stroke="#9FC2D2" stroke-width="2.4" stroke-linecap="round"><g transform="translate(52,44)"><path d="M0 -9 V9 M-8 -5 L8 5 M-8 5 L8 -5"/></g>' +
      '<g transform="translate(300,58)"><path d="M0 -7 V7 M-6 -4 L6 4 M-6 4 L6 -4"/></g></g>' : '') +
    (t >= 25 ? '<g stroke="#E8975A" stroke-width="3" stroke-linecap="round"><circle cx="52" cy="52" r="11" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<path d="M52 34 v-7 M70 52 h7 M66 38 l5 -5 M38 38 l-5 -5 M66 66 l5 5 M38 66 l-5 5"/></g>' : '') +
    '</svg>';
}

/* ---------- 妈妈头像（who 题角色：发髻+圆脸+项链；badge=雪花=怕冷） */
function momSvg(size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="96" height="96"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="50" cy="20" r="12" fill="#8A624A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M31 42 a19 21 0 0 1 38 0 v6 a19 16 0 0 1 -38 0 Z" fill="#8A624A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="50" cy="50" r="17" fill="#F6D9BE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="43" cy="48" r="2.4" fill="' + INK + '"/><circle cx="57" cy="48" r="2.4" fill="' + INK + '"/>' +
    '<path d="M44 58 q6 5 12 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="34" cy="54" r="2.6" fill="#F2B8C6" opacity=".8"/><circle cx="66" cy="54" r="2.6" fill="#F2B8C6" opacity=".8"/>' +
    '<path d="M28 92 q22 -20 44 0" fill="#E8756C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 76 l-4 6 4 6 4 -6 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/></svg>';
}

/* ---------- 天气场景 SVG（4 天气动画沿用 v1 + v2 场景标签：anti 大场景=beach/snowman/swim） */
function sceneSvg(w) {
  const cloud = '<g fill="#FFF" stroke="' + INK + '" stroke-width="3">' +
    '<ellipse cx="128" cy="46" rx="34" ry="22"/><ellipse cx="166" cy="40" rx="30" ry="20"/>' +
    '<ellipse cx="198" cy="48" rx="28" ry="17"/></g>';
  if (w === 'sun') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#FDEEC4"/>' +
    '<circle cx="84" cy="60" r="26" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<g class="sunrays" stroke="#E8975A" stroke-width="4.5" stroke-linecap="round">' +
    '<path d="M120 60 h13"/><path d="M109.5 85.5 l9 9"/><path d="M84 96 v13"/><path d="M58.5 85.5 l-9 9"/>' +
    '<path d="M48 60 h-13"/><path d="M58.5 34.5 l-9 -9"/><path d="M84 24 v-13"/><path d="M109.5 34.5 l9 -9"/></g>' +
    '<path d="M0 184 q50 -22 110 -6 q60 15 120 -4 q70 -20 130 4 V184 Z" fill="#DCE9C6"/></svg>';
  if (w === 'rain') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#D8E4EE"/>' + cloud +
    '<g fill="#7FB3D5" stroke="' + INK + '" stroke-width="2">' +
    [118, 158, 198, 238, 278].map(x =>
      '<path class="drop" transform="translate(' + x + ' 72)" d="M0 0 q5.5 8 0 14 q-5.5 -6 0 -14 Z"/>').join('') +
    '</g>' +
    '<ellipse cx="200" cy="168" rx="64" ry="9" fill="#A8CBEA" opacity=".65"/>' +
    '<ellipse cx="110" cy="172" rx="40" ry="6" fill="#A8CBEA" opacity=".45"/></svg>';
  if (w === 'snow') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#E9F2F9"/>' + cloud +
    '<g stroke="#9FC2D2" stroke-width="2.6" stroke-linecap="round">' +
    [120, 156, 192, 228, 264].map(x =>
      '<g class="flake" transform="translate(' + x + ' 66)">' +
      '<path d="M-7 0 h14 M0 -7 v14 M-5 -5 l10 10 M-5 5 l10 -10"/></g>').join('') +
    '</g>' +
    '<path d="M0 184 q90 -18 180 -8 q90 10 180 -6 V184 Z" fill="#F6FBFF"/>' +
    '<path d="M0 184 q70 -12 140 -4" stroke="#D8E9F4" stroke-width="3" fill="none"/></svg>';
  if (w === 'wind') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#E3F0EA"/>' +
    '<g stroke="#9FC2B2" stroke-width="5" fill="none" stroke-linecap="round">' +
    '<path class="wline" d="M14 44 q56 -20 112 0 t112 0"/>' +
    '<path class="wline" d="M40 78 q50 -16 100 0 t100 0"/>' +
    '<path class="wline" d="M8 112 q60 -18 120 0 t120 0"/></g>' +
    '<g class="leaf"><path d="M0 0 q11 -13 24 -6 q-7 15 -24 6 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M2 -2 l17 -6" stroke="' + INK + '" stroke-width="1.6"/></g>' +
    '<g class="leaf l2"><path d="M0 0 q-11 -13 -24 -6 q7 15 24 6 Z" fill="#B8D48A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M-2 -2 l-17 -6" stroke="' + INK + '" stroke-width="1.6"/></g>' +
    '<path d="M0 184 q60 -14 120 -4 q80 12 240 -6 V184 Z" fill="#DCE9C6"/></svg>';
  if (w === 'beach') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#CBE9F5"/>' +
    '<circle cx="292" cy="44" r="20" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<g stroke="#E8975A" stroke-width="4" stroke-linecap="round">' +
    '<path d="M292 16 v-8 M320 44 h8 M312 24 l6 -6 M272 24 l-6 -6"/></g>' +
    '<path d="M148 108 L212 24 L226 32 L166 114 Z" fill="#E8756C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M212 24 L186 62 L168 50 L196 18 Z" fill="#FFF" opacity=".85" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M148 108 q10 -4 18 0" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M0 132 q90 -16 180 -6 q100 10 180 -4 V184 H0 Z" fill="#F2E4C0"/>' +
    '<path d="M0 158 q60 -8 120 0 q70 8 130 -2" stroke="#5FB8D8" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M240 150 q14 -9 28 0 q-14 9 -28 0 Z" fill="#5FB8D8" opacity=".5"/></svg>';
  if (w === 'snowman') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#E9F2F9"/>' +
    '<g stroke="#9FC2D2" stroke-width="2.4" stroke-linecap="round">' +
    [96, 260, 320].map(x => '<g class="flake" transform="translate(' + x + ' 40)"><path d="M-6 0 h12 M0 -6 v12 M-4 -4 l8 8 M-4 4 l8 -4"/></g>').join('') + '</g>' +
    '<circle cx="150" cy="102" r="26" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="150" cy="148" r="34" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="142" cy="96" r="2.6" fill="' + INK + '"/><circle cx="158" cy="96" r="2.6" fill="' + INK + '"/>' +
    '<path d="M144 106 l10 4 -10 4 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M132 88 q18 -14 36 0" fill="none" stroke="#E8756C" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="150" cy="140" r="3" fill="' + INK + '"/><circle cx="150" cy="152" r="3" fill="' + INK + '"/>' +
    '<path d="M176 118 l30 -14" stroke="#8A624A" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M0 178 q80 -12 170 -4 q110 8 190 -4 V184 H0 Z" fill="#F6FBFF"/></svg>';
  /* swim */
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#CBE9F5"/>' +
    '<circle cx="66" cy="42" r="18" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M0 96 q60 -18 120 0 t120 0 t120 0" stroke="#8FCBE8" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<rect x="0" y="104" width="360" height="80" fill="#8FCBE8"/>' +
    '<ellipse cx="220" cy="132" rx="42" ry="24" fill="none" stroke="#FFF" stroke-width="14"/>' +
    '<ellipse cx="220" cy="132" rx="42" ry="24" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="220" cy="132" rx="24" ry="12" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M96 120 q10 -8 20 0 M130 150 q10 -8 20 0 M60 156 q10 -8 20 0" stroke="#FFF" opacity=".7" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
}

/* ---------- 条件 chip 图标（64px 档）：天气 4 + 体感 2（cold/hot）+ 场景 7 + 数宇温度片 */
function chipSvg(kind, v) {
  const open = '<svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  const sw = 'stroke="' + INK + '"';
  if (kind === 'weather') {
    if (v === 'sun') return open + '<circle cx="32" cy="32" r="12" fill="#F5C445" ' + sw + ' stroke-width="3"/>' +
      '<g stroke="#E8975A" stroke-width="3.6" stroke-linecap="round"><path d="M32 12 v-7 M52 32 h7 M46 18 l5 -5 M18 18 l-5 -5 M46 46 l5 5 M18 46 l-5 5 M32 52 v7 M12 32 h-7"/></g></svg>';
    if (v === 'rain') return open + '<path d="M18 34 a14 12 0 0 1 28 0 Z" fill="#FFF" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
      '<g fill="#7FB3D5" ' + sw + ' stroke-width="2"><path d="M22 40 q3.6 5.4 0 9 q-3.6 -4 0 -9 Z"/><path d="M32 42 q3.6 5.4 0 9 q-3.6 -4 0 -9 Z"/><path d="M42 40 q3.6 5.4 0 9 q-3.6 -4 0 -9 Z"/></g></svg>';
    if (v === 'snow') return open + '<g stroke="#9FC2D2" stroke-width="3.4" stroke-linecap="round">' +
      '<g transform="translate(32 32)"><path d="M0 -13 V13 M-11 -7 L11 7 M-11 7 L11 -7 M-13 0 H13"/></g>' +
      '<path d="M12 14 v4 M52 14 v4 M12 46 v4 M52 46 v4" stroke-width="2.4"/></g></svg>';
    if (v === 'wind') return open + '<g stroke="#9FC2B2" stroke-width="4.4" fill="none" stroke-linecap="round">' +
      '<path d="M8 24 q14 -8 28 0"/><path d="M14 38 q12 -6 26 0"/><path d="M10 50 q10 -5 22 0"/></g>' +
      '<path d="M46 40 q8 -9 16 -2 q-6 10 -16 2 Z" fill="#8FBF7F" ' + sw + ' stroke-width="2.4" stroke-linejoin="round"/></svg>';
    if (v === 'cold') return open + '<circle cx="32" cy="32" r="21" fill="#E3F0FA" ' + sw + ' stroke-width="3"/>' +
      '<g stroke="#5E93C9" stroke-width="3.6" stroke-linecap="round"><g transform="translate(32 32)"><path d="M0 -11 V11 M-9 -6 L9 6 M-9 6 L9 -6"/></g></g></svg>';
    /* hot */
    return open + '<circle cx="32" cy="32" r="21" fill="#FDEEC4" ' + sw + ' stroke-width="3"/>' +
      '<circle cx="32" cy="32" r="8" fill="#E8483C" ' + sw + ' stroke-width="2.6"/>' +
      '<g stroke="#E8975A" stroke-width="3.4" stroke-linecap="round"><path d="M32 16 v-6 M48 32 h6 M44 20 l4 -4 M20 20 l-4 -4 M44 44 l4 4 M20 44 l-4 4 M32 48 v6 M16 32 h-6"/></g></svg>';
  }
  /* scene chips */
  if (v === 'school') return open + '<rect x="12" y="18" width="40" height="32" rx="9" fill="#F2B8C6" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 18 v-4 a10 8 0 0 1 20 0 v4" fill="none" ' + sw + ' stroke-width="3"/>' +
    '<path d="M28 30 h8 v10 h-8 Z" fill="#FFF9EE" ' + sw + ' stroke-width="2.4" stroke-linejoin="round"/></svg>';
  if (v === 'puddle') return open + '<path d="M10 40 q10 -10 22 0 q10 -10 22 0 q-10 10 -22 6 q-12 4 -22 -6 Z" fill="#8FCBE8" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<g fill="#7FB3D5" ' + sw + ' stroke-width="2"><path d="M24 18 q3.4 5 0 8.4 q-3.4 -3.6 0 -8.4 Z"/><path d="M38 14 q3.4 5 0 8.4 q-3.4 -3.6 0 -8.4 Z"/></g></svg>';
  if (v === 'beach') return open + '<path d="M30 12 L48 46" stroke="#8A624A" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M30 12 Q14 16 12 30 Q24 26 30 22 Z" fill="#E8756C" ' + sw + ' stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M30 12 Q46 16 48 30 Q36 26 30 22 Z" fill="#FFF" ' + sw + ' stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M8 52 q24 -8 48 0" stroke="#5FB8D8" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
  if (v === 'swim') return open + '<ellipse cx="32" cy="34" rx="22" ry="14" fill="none" stroke="#FFF" stroke-width="9"/>' +
    '<ellipse cx="32" cy="34" rx="22" ry="14" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="32" cy="34" rx="11" ry="6" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M10 54 q6 -5 12 0 M42 54 q6 -5 12 0" stroke="#5FB8D8" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>';
  if (v === 'snowman') return open + '<circle cx="32" cy="24" r="10" fill="#FFF" ' + sw + ' stroke-width="2.8"/>' +
    '<circle cx="32" cy="44" r="14" fill="#FFF" ' + sw + ' stroke-width="2.8"/>' +
    '<circle cx="28" cy="22" r="1.8" fill="' + INK + '"/><circle cx="36" cy="22" r="1.8" fill="' + INK + '"/>' +
    '<path d="M24 16 q8 -6 16 0" fill="none" stroke="#E8756C" stroke-width="3.4" stroke-linecap="round"/></svg>';
  if (v === 'snowwalk') return open + '<path d="M8 46 q12 -12 24 0 q12 -12 24 0" fill="none" stroke="#9FC2D2" stroke-width="4" stroke-linecap="round"/>' +
    '<g stroke="#5E93C9" stroke-width="3.2" stroke-linecap="round"><g transform="translate(32 26)"><path d="M0 -8 V8 M-7 -4 L7 4 M-7 4 L7 -4"/></g></g></svg>';
  /* park */
  return open + '<path d="M14 52 L26 20 L38 52 Z" fill="#8FBF7F" ' + sw + ' stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M26 52 v-42 l16 8 -16 4" fill="none" stroke="#E8756C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M8 54 h48" ' + sw + ' stroke-width="3" stroke-linecap="round"/></svg>';
}
/* 温度数宇 chip（大数字+度符号——ch3/ch4 条件区） */
function tempChipHtml(t) {
  return '<div class="tdeg"><span>' + t + '</span><i>°</i></div>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="17" cy="17" r="7.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M17 6.5 v-2.4 M27.5 17 h2.4 M17 27.5 v2.4 M6.5 17 h2.4 M23.7 10.3 l1.7 -1.7 M10.3 10.3 l-1.7 -1.7" stroke="#E8975A" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M29 26 q2.6 4 0 7 q-2.6 -3 0 -7 Z M35 30 q2.6 4 0 7 q-2.6 -3 0 -7 Z" fill="#7FB3D5" stroke="' + INK + '" stroke-width="1.8"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 13 l5.5 5.5 L20 6.5" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 「穿好啦」提交钮：小衣服+大对勾（ch2+ 多件题提交入口） */
  wear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 14 L12 21 L16 32 L21 30 L20 50 L44 50 L43 30 L48 32 L52 21 L40 14 L32 20 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M18 36 l7 7 15 -16" stroke="#6FA063" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
