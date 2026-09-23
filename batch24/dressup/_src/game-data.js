/* ================= dressup 贴纸装扮 游戏数据（r10 难度改造 2026-09-14，SPEC-BATCH24 §8 真值源）
   审计红款#27：v1 主题选贴纸=3-4 岁常识（实测 25.5-35.7s/关）。r10 判定层升级为题型三族：
     conflict 主题冲突池（dch1）：题面主题场景，贴纸栏候选 7 片，干扰 ≥min(3,配对主题件数) 来自
       配对主题（rain↔winter / school↔sports / nap↔party——太阳帽 vs 遮阳帽近形跨主题干扰）；
       两击制（share 同构）贴上小兔子，need=主题全集，错贴即弹回（v1 机制）。
     budget 装备预算（dch2）：场景左侧三槽书包，只能带 3 件：候选 6 片（need 3+配对干扰 ≥2+1 补位），
       装包无即时对错反馈（错件不弹回——预算取舍核心），满 3 件自动检查：全对=过；
       有错=miss+1+错件自动退回（对件保留）；已装 badge 可点揭回（零惩罚，解槽重选）。
     anti 场景反向排除（dch3）：题面「哪一样不用带」，候选=主题全集+1 错位件（MISFIT 封闭表），
       单击即判（weather r9 anti 同构）；错位点=贴纸摇头+反向重定向反馈。
     dch4 混合：三族各 ≥1+2 seeded；flat≥20 生成关 dch=ri(1,4)。
   主题封闭表 6（表外不出题，v1 沿用）：
     去上学=[书包,太阳帽,小挎包] / 运动会=[运动鞋,遮阳帽,小背包] / 睡午觉=[睡帽,睡衣,小熊]
     开派对=[皇冠,蝴蝶结,裙子] / 雨天出门=[雨衣,雨靴] / 冬天出门=[围巾,手套,厚外套]
   贴纸池封闭 = 6 主题物品并集 17 + 2 自由装饰（花朵,星星——theme:'free'）= 19 片
   （注：v1 SPEC §0.57 汇总数"18"为算术笔误，以逐项清单为真值源——历史勘误沿记）。
   r10 时长模型（estMs 家族定版 n*345+600——data 定义/main 注释/verify 独立副本/build 字面
   四处同步，禁 +300 变体；语音窗与决策重叠取大者不重复计，weather r9 先例）：
     DECIDE_MS：conflict 6200（7 片跨主题扫描≈885/片）/ budget 7800（6 片全评估+三选规划，
     无即时反馈须先想后装）/ anti 5400（3-4 片反向排除，抑制「都合适」直觉）；
     TAP_MS 430=两击第二击挂 badge 飞行窗 / ADV_MS 3200=判对推进窗（dru_right 2664 实长+余量，
     b24 审查 M2 定版）/ SW_MS 900=换题场景重建+贴纸 stagger 入场。
     全题型 DECIDE_MS ≥ estMs(该题型最长题面句)（conflict 10 码点 4050<6200 / budget 10→4050<7800
     / anti 11→4395<5400）——语音窗从不撑时长。全 40 关 modeled 最低=anti 章 47500 ≥ LEVEL_MIN_MS 40000。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族 DESIGN-SPEC §8）

/* ---------- 主题封闭表：id → 名称 + 物品集 + 题面句（q 走 TTS 拼句——dressup 无题面 clip，§3 六条 clip 全承） ---------- */
const THEMES = {
  school: { n: '去上学',   items: ['sbag', 'sunhat', 'satchel'], q: '去上学，带上什么？' },
  sports: { n: '开运动会', items: ['shoes', 'cap', 'bpack'],     q: '开运动会，带上什么？' },
  nap:    { n: '睡午觉',   items: ['ncap', 'pjy', 'bear'],       q: '睡午觉啦，带什么？' },
  party:  { n: '开派对',   items: ['crown', 'bow', 'dress'],     q: '开派对啦，穿什么？' },
  rain:   { n: '雨天出门', items: ['raincoat', 'rboots'],        q: '雨天出门，穿什么？' },
  winter: { n: '冬天出门', items: ['scarf', 'gloves', 'coat'],   q: '冬天出门，穿什么？' }
};
const THEME_IDS = ['school', 'sports', 'nap', 'party', 'rain', 'winter'];

/* ---------- 贴纸库封闭 19：id → 名称 + 所属主题（free=自由装饰，任何主题都不是 need） ---------- */
const STICKERS = {
  sbag:     { n: '书包',   theme: 'school' },
  sunhat:   { n: '太阳帽', theme: 'school' },
  satchel:  { n: '小挎包', theme: 'school' },
  shoes:    { n: '运动鞋', theme: 'sports' },
  cap:      { n: '遮阳帽', theme: 'sports' },
  bpack:    { n: '小背包', theme: 'sports' },
  ncap:     { n: '睡帽',   theme: 'nap' },
  pjy:      { n: '睡衣',   theme: 'nap' },
  bear:     { n: '小熊',   theme: 'nap' },
  crown:    { n: '皇冠',   theme: 'party' },
  bow:      { n: '蝴蝶结', theme: 'party' },
  dress:    { n: '裙子',   theme: 'party' },
  raincoat: { n: '雨衣',   theme: 'rain' },
  rboots:   { n: '雨靴',   theme: 'rain' },
  scarf:    { n: '围巾',   theme: 'winter' },
  gloves:   { n: '手套',   theme: 'winter' },
  coat:     { n: '厚外套', theme: 'winter' },
  flower:   { n: '花朵',   theme: 'free' },
  star:     { n: '星星',   theme: 'free' }
};
const STICKER_IDS = Object.keys(STICKERS);          // 19 片封闭池（17 主题+2 装饰；verify 断言逐项对账）
const FREE_DECO = ['flower', 'star'];
const nameOf = id => STICKERS[id].n;

/* ---------- r10 题型三族封闭表（SPEC-BATCH24 §8；表外不出题） ----------
   KINDS：题型封闭 3 族；PAIR_OF：冲突配对（跨主题干扰来源，近形/近义互混）；
   BUDGET_THEMES：预算章主题池=5 个 3 件主题（排除 rain 2 件——budget=3 须 need 恰满 3）；
   MISFIT：反向排除错位件池（每主题 ≥2 选项供 seeded 轮换，均属远主题=场景内明显不合适）；
   POOL_OF_KIND：贴纸栏候选片数（anti=主题全集+1 错位件=3-4 片，无固定池） ---------- */
const KINDS = ['conflict', 'budget', 'anti'];
const PAIR_OF = { rain: 'winter', winter: 'rain', school: 'sports', sports: 'school', nap: 'party', party: 'nap' };
const CONFLICT_PAIRS = [['rain', 'winter'], ['school', 'sports'], ['nap', 'party']];
const BUDGET_THEMES = ['school', 'sports', 'nap', 'party', 'winter'];
const MISFIT = {
  school: ['ncap', 'pjy'],        // 睡帽/睡衣→上学（睡觉的东西去学校）
  sports: ['ncap', 'pjy'],        // 睡帽/睡衣→运动会
  nap:    ['raincoat', 'rboots'], // 雨衣/雨靴→睡午觉（雨天装备上床）
  party:  ['rboots', 'raincoat'], // 雨靴/雨衣→开派对
  rain:   ['crown', 'dress'],     // 皇冠/裙子→雨天出门（盛装冒雨）
  winter: ['dress', 'bow']        // 裙子/蝴蝶结→冬天出门（单薄盛装顶风雪）
};
const BUDGET_N = 3;                            // 预算章槽位数（=need 件数，满员即检）
const POOL_OF_KIND = { conflict: 7, budget: 6 };

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 dch=ri(1,4) 随机章参数）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，b21 教训禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 教训，verify 带 C7 关键词断言） ---------- */
const CHAPTERS = {
  1: { name: '出门装扮',   hint: '下次只能带三样，要挑一挑啦' },   // 预告 ch2 装备预算
  2: { name: '只能带三样', hint: '下次要找出不合适的一样哦' },     // 预告 ch3 反向排除
  3: { name: '找不合适的', hint: '所有玩法混在一起，大挑战来啦' }, // 预告 ch4 混合
  4: { name: '装扮大挑战', hint: '新一轮装扮挑战，自由装扮随时等你' } // 预告生成关
};
const GEN_HINTS = ['相似的装扮混一起，想清楚再贴',   // dch1 主题冲突池
                   '只能带三样，挑最需要的',         // dch2 装备预算
                   '找一找，哪一样不合适',           // dch3 反向排除
                   '大混搭挑战，想好再动手'];        // dch4 混合
const CH_LEN = 5;            // 5 题 = 1 关
const STATIC_LEVELS = 20;    // 静态 20 关 = 4 章（每章 5 关）

/* ---------- 题面句（按题型+主题三族封闭域；T46 阶段2 起 clip 化 dru_q/qb/qa，零文字依赖由语音承载语义） ---------- */
const BUDGET_Q = {
  school: '去上学，只能带三样', sports: '开运动会，只能带三样', nap: '睡午觉，只要带三样',
  party: '开派对，只能带三样', winter: '冬天出门，只能带三样'
};
const ANTI_Q = {
  school: '去上学，哪一样不用带', sports: '开运动会，哪一样不用带', nap: '睡午觉，哪一样不用带',
  party: '开派对，哪一样不用带', rain: '雨天出门，哪一样不用带', winter: '冬天出门，哪一样不用带'
};
const quizSpeech = q => q.kind === 'budget' ? BUDGET_Q[q.theme]
                     : (q.kind === 'anti' ? ANTI_Q[q.theme] : THEMES[q.theme].q);
/* T46 阶段2 题面 clip 键：conflict=dru_q_{theme} 6 / budget=dru_qb_{theme} 5 / anti=dru_qa_{theme} 6
   （17 键与 manifest 逐条对账过文本一致；q.stem 同款三族分流） */
const quizKey = q => q.kind === 'budget' ? 'dru_qb_' + q.theme
                 : (q.kind === 'anti' ? 'dru_qa_' + q.theme : 'dru_q_' + q.theme);

/* ---------- r10 时长模型（SPEC-BATCH24 §8；estMs 家族定版字面四处同步） ---------- */
const estMs = n => n * 345 + 600;
const DECIDE_MS = { conflict: 6200, budget: 7800, anti: 5400 };
const TAP_MS = 430;    // 两击第二击挂 badge 飞行窗
const ADV_MS = 3200;   // 判对推进窗（dru_right 2664 实长+余量，b24 审查 M2 定版沿用）
const SW_MS = 900;     // 换题场景重建+贴纸 stagger 入场
const quizDurMs = q => Math.max(estMs(q.stem.length), DECIDE_MS[q.kind]) +
                       (q.kind === 'anti' ? 0 : q.need.length * TAP_MS) + ADV_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0) + CH_LEN * SW_MS;
const LEVEL_MIN_MS = 40000;   // 5-6 岁段单关硬指标（AUDIT-56 口径，r10 起 verify 硬断言）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；题面句 T46 阶段2 clip 化）
   r10 新增 3 键（manifest 真值源=voice/gen_clips.py dressup 块，前缀已核无占用）；既有 6 键文本一字未改
   T46 阶段2 题面 17 键（dru_q_ 6/dru_qb_ 5/dru_qa_ 6，见 quizKey） ---------- */
const VOICE = {
  watch:      { key: 'dru_tut_watch',  text: '看！给小兔子穿上雨衣' },
  turn:       { key: 'dru_tut_turn',   text: '你来装扮它' },
  hint:       { key: 'dru_hint',       text: '再看看要带什么' },
  right:      { key: 'dru_right',      text: '装扮好啦，真好看' },
  wrong:      { key: 'dru_wrong',      text: '现在不用这个哦' },
  free:       { key: 'dru_free',       text: '自由装扮时间' },
  budgetHint: { key: 'dru_budget_hint', text: '只能带三样，放回去再挑一挑' },  // 预算：满员检查未过/槽满引导（不设 flat 门）
  antiHint:   { key: 'dru_anti_hint',   text: '要找不用带的一样哦' },          // 反向：错点合适件的重定向
  antiRight:  { key: 'dru_anti_right',  text: '找对啦，它不用带' }             // 反向：判对（语义=排除非装扮）
};

/* ---------- 贴纸 SVG（viewBox 0 0 100 100，描线风；照 weather 衣物资产：暖色+圆角卡通+一眼可辨）
   五件外套类照 weather 资产改色复用（雨衣/雨靴/围巾/手套/厚外套/太阳帽），其余 13 片自绘。 */
function stickerSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="88" height="88"';
  const open = '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  const sw = 'stroke="' + INK + '"';
  if (id === 'sbag') return open +   // 书包：方形硬包+翻盖+明扣（橙红）
    '<rect x="26" y="22" width="48" height="58" rx="10" fill="#E8975A" ' + sw + ' stroke-width="3.5"/>' +
    '<path d="M26 40 h48" stroke="#C9773B" stroke-width="3"/>' +
    '<path d="M34 40 q16 14 32 0 v14 q-16 12 -32 0 Z" fill="#D97F3E" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="43" y="52" width="14" height="11" rx="3.5" fill="#F5C542" ' + sw + ' stroke-width="3"/>' +
    '<path d="M38 22 q12 -12 24 0" fill="none" ' + sw + ' stroke-width="3.5" stroke-linecap="round"/>' +
    '<ellipse cx="38" cy="30" rx="5" ry="3" fill="#FFF" opacity=".45"/></svg>';
  if (id === 'sunhat') return open +  // 太阳帽：宽檐+帽顶+红带（照 weather 暖黄）
    '<ellipse cx="50" cy="68" rx="39" ry="13" fill="#EFC87A" ' + sw + ' stroke-width="3.5"/>' +
    '<path d="M29 66 a21 25 0 0 1 42 0 Z" fill="#F6D794" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M31 57 q19 9 38 0" stroke="#E8483C" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="42" cy="60" rx="6" ry="3" fill="#FFF" opacity=".5"/></svg>';
  if (id === 'satchel') return open + // 小挎包：小圆包+长挎带（暖黄）
    '<path d="M28 24 Q50 12 72 24" fill="none" ' + sw + ' stroke-width="4" stroke-linecap="round"/>' +
    '<rect x="28" y="38" width="44" height="38" rx="9" fill="#F5C542" ' + sw + ' stroke-width="3.5"/>' +
    '<path d="M28 50 h44" stroke="#D9A32E" stroke-width="3"/>' +
    '<rect x="43" y="56" width="14" height="11" rx="3.5" fill="#FFF9EE" ' + sw + ' stroke-width="3"/>' +
    '<path d="M43 58 a7 6 0 0 0 14 0" fill="none" ' + sw + ' stroke-width="2.6"/>' +
    '<ellipse cx="37" cy="44" rx="5" ry="3" fill="#FFF" opacity=".55"/></svg>';
  if (id === 'shoes') return open +  // 运动鞋：厚底+鞋带（蓝白）
    '<path d="M22 62 q0 -14 14 -14 h8 q6 0 10 5 l8 9 q10 2 14 8 v4 H22 Z" fill="#FFF" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M22 70 h54 v8 q0 4 -5 4 H27 q-5 0 -5 -4 Z" fill="#4E8FD0" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M36 52 v-9 M44 54 v-9 M52 58 v-8" stroke="#E8483C" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M30 56 l14 5 M32 62 l12 4" stroke="#4E8FD0" stroke-width="3" stroke-linecap="round"/></svg>';
  if (id === 'cap') return open +    // 遮阳帽：棒球帽（帽身+前伸帽舌，青绿——与太阳帽宽檐区分）
    '<path d="M27 56 a23 23 0 0 1 46 0 Z" fill="#6FB39C" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M70 52 q17 2 17 11 q-13 5 -34 3 l-2 -12 Z" fill="#5E9C87" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="35" r="5.5" fill="#F5C542" ' + sw + ' stroke-width="3"/>' +
    '<path d="M35 49 q15 -6 30 0" stroke="#FFF" opacity=".5" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>';
  if (id === 'bpack') return open +  // 小背包：圆顶双肩包+拉链+侧袋（草绿——与书包方形翻盖区分）
    '<path d="M30 48 a20 20 0 0 1 40 0 v32 H30 Z" fill="#8FBF7F" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M50 32 v48" ' + sw + ' stroke-width="2.6"/>' +
    '<path d="M50 38 l5 4 l-5 4 l-5 -4 Z" fill="#F5C542" ' + sw + ' stroke-width="2.4" stroke-linejoin="round"/>' +
    '<rect x="24" y="56" width="9" height="16" rx="4" fill="#6FA063" ' + sw + ' stroke-width="3"/>' +
    '<path d="M36 48 q-6 4 -4 12 M64 48 q6 4 4 12" fill="none" ' + sw + ' stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="40" cy="42" rx="5" ry="3" fill="#FFF" opacity=".5"/></svg>';
  if (id === 'ncap') return open +   // 睡帽：锥形垂尖+绒球（紫蓝）
    '<path d="M25 62 Q50 12 75 62 Q60 70 50 68 Q40 70 25 62 Z" fill="#9A8BC9" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M75 62 Q86 58 88 46 Q92 58 82 64 Z" fill="#9A8BC9" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<circle cx="89" cy="44" r="7" fill="#E8DCC8" ' + sw + ' stroke-width="3"/>' +
    '<path d="M33 58 Q50 50 67 58" stroke="#FFF" opacity=".5" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M30 62 q-5 8 0 14 M70 62 q5 8 0 14" fill="none" ' + sw + ' stroke-width="3.4" stroke-linecap="round"/></svg>';
  if (id === 'pjy') return open +    // 睡衣：长袖上衣+条纹（粉紫）
    '<path d="M38 26 h24 l14 8 -5 13 -7 -3 v32 H36 V44 l-7 3 -5 -13 Z" fill="#E8A8C8" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M44 26 q6 8 12 0" fill="none" ' + sw + ' stroke-width="2.8"/>' +
    '<path d="M40 50 h20 M40 60 h20" stroke="#FFF" opacity=".65" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="50" cy="42" r="4" fill="#F5C542" ' + sw + ' stroke-width="2.4"/></svg>';
  if (id === 'bear') return open +   // 小熊：泰迪熊头（圆脸+圆耳+眼鼻嘴，暖棕）
    '<circle cx="31" cy="34" r="12" fill="#C9A06C" ' + sw + ' stroke-width="3.4"/>' +
    '<circle cx="69" cy="34" r="12" fill="#C9A06C" ' + sw + ' stroke-width="3.4"/>' +
    '<circle cx="31" cy="34" r="5.5" fill="#E8CFA8" ' + sw + ' stroke-width="2.4"/>' +
    '<circle cx="69" cy="34" r="5.5" fill="#E8CFA8" ' + sw + ' stroke-width="2.4"/>' +
    '<circle cx="50" cy="52" r="26" fill="#D9B47E" ' + sw + ' stroke-width="3.6"/>' +
    '<ellipse cx="50" cy="62" rx="13" ry="10" fill="#E8CFA8" ' + sw + ' stroke-width="2.6"/>' +
    '<circle cx="41" cy="46" r="3.4" fill="' + INK + '"/><circle cx="59" cy="46" r="3.4" fill="' + INK + '"/>' +
    '<path d="M50 54 v4 M50 58 q-4 4 -8 1 M50 58 q4 4 8 1" fill="none" ' + sw + ' stroke-width="2.6" stroke-linecap="round"/></svg>';
  if (id === 'crown') return open +  // 皇冠：三尖+宝石（金黄）
    '<path d="M24 72 L20 36 L36 50 L50 26 L64 50 L80 36 L76 72 Z" fill="#F5C542" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<rect x="22" y="72" width="56" height="10" rx="4" fill="#E8B52E" ' + sw + ' stroke-width="3.2"/>' +
    '<circle cx="50" cy="60" r="5" fill="#E8483C" ' + sw + ' stroke-width="2.4"/>' +
    '<circle cx="35" cy="64" r="4" fill="#4E8FD0" ' + sw + ' stroke-width="2.2"/>' +
    '<circle cx="65" cy="64" r="4" fill="#57B368" ' + sw + ' stroke-width="2.2"/>' +
    '<circle cx="30" cy="42" r="2.6" fill="#FFF" opacity=".7"/><circle cx="50" cy="32" r="2.6" fill="#FFF" opacity=".7"/></svg>';
  if (id === 'bow') return open +    // 蝴蝶结：双环+中心结（粉红）
    '<path d="M50 50 C36 34 14 36 16 50 C14 64 36 66 50 50 Z" fill="#F2A0B8" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M50 50 C64 34 86 36 84 50 C86 64 64 66 50 50 Z" fill="#F2A0B8" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M50 50 C38 62 34 78 42 84 C50 88 56 76 50 50 Z" fill="#E88AB0" ' + sw + ' stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M50 50 C62 62 66 78 58 84 C50 88 44 76 50 50 Z" fill="#E88AB0" ' + sw + ' stroke-width="3.2" stroke-linejoin="round"/>' +
    '<rect x="42" y="42" width="16" height="16" rx="5" fill="#E8708F" ' + sw + ' stroke-width="3"/>' +
    '<ellipse cx="46" cy="44" rx="3" ry="2" fill="#FFF" opacity=".7"/></svg>';
  if (id === 'dress') return open +  // 裙子：连衣裙（上身+A 字裙摆，玫红）
    '<path d="M38 20 h24 l3 16 -5 2 8 34 q-18 8 -36 0 l8 -34 -5 -2 Z" fill="#D94F8A" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M38 20 q12 8 24 0" fill="none" ' + sw + ' stroke-width="3"/>' +
    '<path d="M36 62 q14 6 28 0" stroke="#FFF" opacity=".55" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="36" r="3.6" fill="#F5C542" ' + sw + ' stroke-width="2.2"/>' +
    '<ellipse cx="43" cy="27" rx="4" ry="2.6" fill="#FFF" opacity=".5"/></svg>';
  if (id === 'raincoat') return open +  // 雨衣：黄+兜帽+扣（照 weather 资产）
    '<path d="M37 40 L21 48 L26 64 L32 61 L30 88 L70 88 L68 61 L74 64 L79 48 L63 40 L50 49 Z" fill="#F5C542" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M37 40 q13 -22 26 0 q-13 -10 -26 0 Z" fill="#E8B52E" ' + sw + ' stroke-width="3"/>' +
    '<path d="M50 49 v39" ' + sw + ' stroke-width="2.5"/>' +
    '<circle cx="57" cy="58" r="3" fill="#FFF9EE" ' + sw + ' stroke-width="2"/>' +
    '<circle cx="57" cy="70" r="3" fill="#FFF9EE" ' + sw + ' stroke-width="2"/>' +
    '<circle cx="57" cy="82" r="3" fill="#FFF9EE" ' + sw + ' stroke-width="2"/></svg>';
  if (id === 'rboots') {             // 雨靴：双靴（照 weather 资产改暖蓝）
    const boot = fill =>
      '<path d="M36 16 H56 V50 Q56 54 62 55 L76 58 Q82 60 82 66 V74 H36 Z" fill="' + fill + '" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
      '<rect x="32" y="72" width="54" height="11" rx="4" fill="#3B6FA3" ' + sw + ' stroke-width="3"/>' +
      '<path d="M40 25 h12" stroke="#FFF" opacity=".45" stroke-width="3.5" stroke-linecap="round"/>';
    return open +
      '<g transform="translate(-4,12) scale(.85)">' + boot('#4E8FD0') + '</g>' +
      '<g transform="translate(20,0) scale(.85)">' + boot('#6FA8DC') + '</g></svg>';
  }
  if (id === 'scarf') return open +  // 围巾：绕圈+垂尾+流苏（照 weather 资产暖红）
    '<path d="M24 38 Q50 24 76 38 L72 52 Q50 40 28 52 Z" fill="#E8483C" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M28 52 Q50 40 72 52 L68 64 Q50 54 32 64 Z" fill="#C93A30" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M56 61 L68 57 L75 82 Q66 89 57 84 Z" fill="#E8483C" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M60 84 l-2 8 M66 86 l-1 8 M72 83 l3 8" ' + sw + ' stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M30 41 q20 -9 40 0" stroke="#FFF" opacity=".5" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>';
  if (id === 'gloves') return open + // 手套：双只连指（照 weather 资产暖绿）
    '<g transform="translate(6,0)">' +
    '<path d="M30 40 a15 17 0 0 1 30 0 v20 a13 12 0 0 1 -3 8 h-24 a13 12 0 0 1 -3 -8 Z" fill="#57B368" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M31 48 q-11 -3 -12 5 q-1 9 11 7" fill="#57B368" ' + sw + ' stroke-width="3"/>' +
    '<rect x="28" y="68" width="34" height="12" rx="4" fill="#8FBF7F" ' + sw + ' stroke-width="3"/></g>' +
    '<g transform="translate(34,4)">' +
    '<path d="M30 40 a15 17 0 0 1 30 0 v20 a13 12 0 0 1 -3 8 h-24 a13 12 0 0 1 -3 -8 Z" fill="#6FC47F" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M31 48 q-11 -3 -12 5 q-1 9 11 7" fill="#6FC47F" ' + sw + ' stroke-width="3"/>' +
    '<rect x="28" y="68" width="34" height="12" rx="4" fill="#8FBF7F" ' + sw + ' stroke-width="3"/></g></svg>';
  if (id === 'coat') return open +   // 厚外套：橙+横向绗缝（照 weather 资产）
    '<path d="M37 38 L21 46 L26 62 L32 59 L30 88 L70 88 L68 59 L74 62 L79 46 L63 38 L50 47 Z" fill="#E8975A" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M37 38 l13 9 l13 -9 l-4 -8 q-9 6 -18 0 Z" fill="#D97F3E" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 47 v41" ' + sw + ' stroke-width="2.5"/>' +
    '<path d="M33 58 h34 M32 70 h36 M31 80 h38" ' + sw + ' stroke-width="2.5" stroke-linecap="round"/></svg>';
  if (id === 'flower') return open + // 花朵：五瓣+圆心（自由装饰）
    [0, 72, 144, 216, 288].map(a =>
      '<ellipse cx="50" cy="30" rx="11" ry="16" fill="#F2A0B8" ' + sw + ' stroke-width="3" transform="rotate(' + a + ' 50 50)"/>').join('') +
    '<circle cx="50" cy="50" r="11" fill="#F5C542" ' + sw + ' stroke-width="3.2"/></svg>';
  if (id === 'star') return open +   // 星星：五角星（自由装饰）
    '<path d="M50 12 L60 38 L88 38 L65 54 L73 82 L50 65 L27 82 L35 54 L12 38 L40 38 Z" ' +
    'fill="#F5C542" ' + sw + ' stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="43" cy="40" rx="4.5" ry="3" fill="#FFF" opacity=".7"/></svg>';
  return open + '</svg>';
}

/* ---------- 主题场景 SVG（viewBox 0 0 360 184；纯 CSS 动画，确定性零 JS）
   小兔子由 JS 注入 .bunny-slot（assets.rabbit），badge 挂 #bunny-wear ---------- */
function sceneSvg(t) {
  const cloud = '<g fill="#FFF" stroke="' + INK + '" stroke-width="3">' +
    '<ellipse cx="128" cy="46" rx="34" ry="22"/><ellipse cx="166" cy="40" rx="30" ry="20"/>' +
    '<ellipse cx="198" cy="48" rx="28" ry="17"/></g>';
  if (t === 'school') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#FDEEC4"/>' +
    '<circle cx="66" cy="52" r="22" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<g class="sunrays" stroke="#E8975A" stroke-width="4" stroke-linecap="round">' +
    '<path d="M96 52 h11"/><path d="M87 73 l8 8"/><path d="M66 84 v11"/><path d="M45 73 l-8 8"/><path d="M36 52 h-11"/></g>' +
    '<g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
    '<rect x="150" y="66" width="150" height="86" rx="6" fill="#FFF9EE"/>' +
    '<path d="M138 68 L225 24 L312 68 Z" fill="#E8483C"/>' +
    '<rect x="205" y="18" width="6" height="26" fill="#8A7B6C"/>' +
    '<path d="M211 20 h26 l-7 7 l7 7 h-26 Z" fill="#F5C542"/></g>' +
    '<rect x="168" y="94" width="26" height="26" rx="3" fill="#BFE0EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="256" y="94" width="26" height="26" rx="3" fill="#BFE0EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="210" y="106" width="30" height="46" rx="3" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M0 184 q60 -14 130 -6 q90 10 230 -4 V184 Z" fill="#DCE9C6"/></svg>';
  if (t === 'sports') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#E3F0EA"/>' +
    '<path d="M10 28 L80 40 M120 28 L190 40 M230 28 L300 40" stroke="#E8975A" stroke-width="3.4"/>' +
    ['20', '130', '240'].map((x, i) =>
      '<g class="flag" style="animation-delay:' + (i * 0.4) + 's"><path d="M' + x + ' 40 v-26 l20 7 l-20 7 Z" fill="' +
      ['#E8483C', '#F5C542', '#57B368'][i] + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/></g>').join('') +
    '<g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
    '<path d="M56 108 h64 l-8 34 H64 Z" fill="#C9B694"/>' +
    '<path d="M70 108 q18 -40 36 0" fill="none" stroke-width="3.4"/></g>' +
    '<circle cx="88" cy="86" r="7" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M0 152 h360" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M0 152 q90 -10 180 0 q90 10 180 0" stroke="#C9B694" stroke-width="3" fill="none"/>' +
    '<path d="M0 168 q90 -10 180 0 q90 10 180 0" stroke="#E5D5BC" stroke-width="3" fill="none"/>' +
    '<ellipse cx="290" cy="118" rx="26" ry="30" fill="#FFF" opacity=".9"/>' +
    '<path d="M290 92 q8 -6 12 2 M300 100 q8 -4 10 4" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>';
  if (t === 'nap') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#DDE4F0"/>' +
    '<g class="moon"><path d="M280 38 a26 26 0 1 0 14 44 a20 20 0 1 1 -14 -44 Z" fill="#F5DE7A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/></g>' +
    [[60, 40, 2.6], [110, 66, 2], [180, 34, 2.4], [230, 70, 2], [40, 90, 2]].map((s, i) =>
      '<g class="star-tw" style="animation-delay:' + (i * 0.55) + 's">' +
      '<path d="M' + s[0] + ' ' + s[1] + ' v' + (s[2] * 4) + ' M' + (s[0] - s[2] * 2) + ' ' + (s[1] + s[2] * 2) +
      ' h' + (s[2] * 4) + '" stroke="#F5DE7A" stroke-width="' + s[2] + '" stroke-linecap="round"/></g>').join('') +
    '<g stroke="' + INK + '" stroke-width="3" stroke-linejoin="round">' +
    '<rect x="96" y="96" width="130" height="40" rx="8" fill="#E8B8A0"/>' +
    '<rect x="100" y="78" width="34" height="22" rx="8" fill="#FFF9EE"/></g>' +
    '<path d="M104 88 h26" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M96 118 h130 M226 104 v36" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M120 96 q10 -12 20 -2 q10 -12 20 0" stroke="#E8975A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M0 184 q70 -12 150 -6 q110 8 210 -4 V184 Z" fill="#C7D2E8"/></svg>';
  if (t === 'party') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#FBE4EE"/>' +
    '<path d="M0 16 Q60 44 120 20 Q180 44 240 18 Q300 44 360 22" stroke="' + INK + '" stroke-width="3" fill="none"/>' +
    ['30', '90', '150', '210', '270', '330'].map((x, i) =>
      '<path d="M' + x + ' 30 l-9 18 h18 Z" fill="' +
      ['#E8483C', '#F5C542', '#57B368', '#4E8FD0', '#9A6BC9', '#E88AB0'][i] +
      '" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>').join('') +
    [[60, '#E8483C', 0], [180, '#4E8FD0', .8], [300, '#F5C542', 1.5]].map((b, i) =>
      '<g class="balloon" style="animation-delay:' + b[2] + 's">' +
      '<ellipse cx="' + b[0] + '" cy="84" rx="20" ry="25" fill="' + b[1] + '" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M' + b[0] + ' 109 l-4 7 h8 Z" fill="' + b[1] + '" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M' + b[0] + ' 116 q-8 22 2 40" stroke="' + INK + '" stroke-width="2.4" fill="none"/>' +
      '<ellipse cx="' + (b[0] - 7) + '" cy="76" rx="5" ry="8" fill="#FFF" opacity=".5"/></g>').join('') +
    '<path d="M0 184 q80 -14 170 -6 q100 8 190 -4 V184 Z" fill="#F3D9E6"/></svg>';
  if (t === 'rain') return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#D8E4EE"/>' + cloud +
    '<g fill="#7FB3D5" stroke="' + INK + '" stroke-width="2">' +
    [118, 158, 198, 238, 278].map(x =>
      '<path class="drop" transform="translate(' + x + ' 72)" d="M0 0 q5.5 8 0 14 q-5.5 -6 0 -14 Z"/>').join('') +
    '</g>' +
    '<ellipse cx="200" cy="168" rx="64" ry="9" fill="#A8CBEA" opacity=".65"/>' +
    '<ellipse cx="110" cy="172" rx="40" ry="6" fill="#A8CBEA" opacity=".45"/></svg>';
  /* winter */
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#E9F2F9"/>' + cloud +
    '<g stroke="#9FC2D2" stroke-width="2.6" stroke-linecap="round">' +
    [120, 156, 192, 228, 264].map(x =>
      '<g class="flake" transform="translate(' + x + ' 66)">' +
      '<path d="M-7 0 h14 M0 -7 v14 M-5 -5 l10 10 M-5 5 l10 -10"/></g>').join('') +
    '</g>' +
    '<path d="M0 184 q90 -18 180 -8 q90 10 180 -6 V184 Z" fill="#F6FBFF"/>' +
    '<path d="M0 184 q70 -12 140 -4" stroke="#D8E9F4" stroke-width="3" fill="none"/></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 皇冠与蝴蝶结（装扮主题） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M11 28 L9.5 15 L16 20 L22 12 L28 20 L34.5 15 L33 28 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="22" cy="24" r="3" fill="#E8483C" stroke="' + INK + '" stroke-width="1.8"/></svg>',
  free: '<svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 8 C24 20 8 22 10 34 C12 46 26 46 32 36 C38 46 52 46 54 34 C56 22 40 20 32 8 Z" ' +
    'fill="#F2A0B8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="34" r="4.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/></svg>',
  task: '<svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 12 h30 v40 H14 Z" fill="#FFF" opacity=".95" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 22 h14 M22 30 h14 M22 38 h9" stroke="#E8975A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M44 18 l12 4 l-4 4 l5 5 l-3 3 l-5 -5 l-4 4 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/></svg>',
  speaker: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M28 12 a7 7 0 0 1 14 0 v22 l7 3 a9 9 0 0 1 6 8 v4 a12 12 0 0 1 -12 12 h-8 a14 14 0 0 1 -14 -14 V30 Z" ' +
    'fill="#FFF" opacity=".95" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="34" cy="42" rx="9" ry="6" fill="#F2B8C6" opacity=".4"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  clear: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 18 h36 M26 18 v-6 h12 v6 M19 18 l4 34 h18 l4 -34" fill="none" stroke="' + INK +
    '" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M27 28 v14 M37 28 v14" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 13 l5.5 5.5 L20 6.5" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};

/* ---------- 彩花粒子色板（celebrate 全场彩花与 free 共用） ---------- */
const CONFETTI_COLORS = ['#E8483C', '#F08A3C', '#F5C542', '#57B368', '#4E8FD0', '#9A6BC9', '#E88AB0'];
