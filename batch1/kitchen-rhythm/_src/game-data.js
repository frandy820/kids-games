/* ================= kitchen-rhythm 厨房节奏 游戏数据 r18（老结构重建·难度改造）
   真值源：difficulty-audit/SPEC-R18-KITCHEN.md（本文件 §1 曲库 / §2 关卡映射 / §5 时长模型
   与其逐值一致；复算工具 _spec_calc.py 同公式同序，modeled 双钉 python 侧）。
   delta（AUDIT-56 黄 11 首位）：曲库 10 首（≥8，含变速 5 首+长曲 ≥32 拍 5 首）
   / 连击门槛星级（连续 Perfect/Good 达门槛才得星——从「点对就得」升级节奏精度）
   / 双轨音符（双器皿两时间轴左右手交替）。
   章爬升：ch1 单轨恒速 → ch2 变速 → ch3 长曲 → ch4 双轨；生成关 flat≥32 seeded。
   曲数据紧凑表示：t 拍数组 + melody 等长频率数组 + lane 数组（单轨曲 null=全 0）；
   notes 由 game-core mkNotes 展开（k 食材按 i%3 轮换 carrot/tomato/egg）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- estMs 定版（b25 家族 T 全字符口径；四方同步之一：data 定义/verify 独立定义/
   build est_ms 字面断言/_selftest est_ms 运行时对账；main 不重复声明直接使用） ---------- */
const estMs = s => s.length * 345 + 600;     // SAPI ~345ms/字 + 600 落定余量（全字符含标点）

/* ---------- 曲库 10 首（SPEC §1 全量表；C 大调域 523.25–1046.50）
   seg=BPM 段表（变速曲中途换速）；相邻 t 差 ≥0.5 拍 / 密度 ≤0.8 / t 严格递增（verify 全量审计） ---------- */
const SONGS = [
  { id: 'star', title: '小星星', icon: 'star', style: 'steady', beats: 36,
    seg: [{ bpm: 88 }],
    t: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30],
    melody: [523.25, 523.25, 783.99, 783.99, 880.00, 880.00, 783.99,
             698.46, 698.46, 659.25, 659.25, 587.33, 587.33, 523.25,
             523.25, 523.25, 783.99, 783.99, 880.00, 880.00, 783.99,
             698.46, 698.46, 659.25, 659.25, 587.33, 587.33, 523.25],
    lane: null },
  { id: 'tiger', title: '两只老虎', icon: 'tiger', style: 'steady', beats: 36,
    seg: [{ bpm: 92 }],
    t: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 24, 25, 26, 27, 28, 29],
    melody: [523.25, 587.33, 659.25, 523.25, 523.25, 587.33, 659.25, 523.25,
             659.25, 698.46, 783.99, 659.25, 698.46, 783.99,
             783.99, 880.00, 783.99, 698.46, 659.25, 523.25,
             783.99, 880.00, 783.99, 698.46, 659.25, 523.25],
    lane: null },
  { id: 'ode', title: '欢乐颂', icon: 'note', style: 'steady', beats: 32,
    seg: [{ bpm: 84 }],
    t: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27],
    melody: [659.25, 659.25, 698.46, 783.99, 783.99, 698.46, 659.25, 587.33,
             523.25, 523.25, 587.33, 659.25,
             659.25, 659.25, 698.46, 783.99, 783.99, 698.46, 659.25, 587.33,
             523.25, 523.25, 587.33, 523.25],
    lane: null },
  { id: 'bee', title: '小蜜蜂', icon: 'bee', style: 'tempo', beats: 24,
    seg: [{ bpm: 88 }, { bpm: 110, from: 16 }],
    t: [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 20, 21, 22],
    melody: [783.99, 659.25, 659.25, 698.46, 587.33, 587.33, 523.25, 587.33,
             659.25, 698.46, 783.99, 783.99, 783.99,
             783.99, 659.25, 659.25, 698.46, 587.33, 587.33],
    lane: null },
  { id: 'brush', title: '粉刷匠', icon: 'brush', style: 'tempo', beats: 24,
    seg: [{ bpm: 104 }, { bpm: 84, from: 12 }],
    t: [0, 1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21],
    melody: [698.46, 587.33, 698.46, 587.33, 698.46, 587.33,
             587.33, 698.46, 659.25, 587.33,
             698.46, 587.33, 698.46, 587.33, 698.46, 587.33,
             587.33, 523.25],
    lane: null },
  { id: 'bridge', title: '伦敦桥', icon: 'bridge', style: 'tempo', beats: 28,
    seg: [{ bpm: 96 }, { bpm: 120, from: 16 }],
    t: [0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22],
    melody: [783.99, 880.00, 783.99, 698.46, 659.25, 698.46, 783.99,
             587.33, 659.25, 698.46,
             659.25, 698.46, 783.99,
             783.99, 880.00, 783.99, 698.46, 659.25, 698.46, 783.99],
    lane: null },
  { id: 'jingle', title: '铃儿响叮当', icon: 'bell', style: 'long', beats: 32,
    seg: [{ bpm: 96 }],
    t: [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28],
    melody: [659.25, 659.25, 659.25, 659.25, 659.25, 659.25,
             659.25, 783.99, 523.25, 587.33, 659.25,
             698.46, 698.46, 698.46, 698.46, 698.46, 659.25, 659.25, 659.25,
             659.25, 587.33, 587.33, 659.25, 783.99],
    lane: null },
  { id: 'birthday', title: '生日快乐变奏', icon: 'cake', style: 'long', beats: 40,
    seg: [{ bpm: 84 }, { bpm: 100, from: 24 }],
    t: [0, 1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 14, 16, 17, 18, 19, 20, 22, 24, 25, 26, 27, 28, 30, 32],
    melody: [523.25, 523.25, 587.33, 523.25, 659.25, 587.33,
             523.25, 523.25, 587.33, 523.25, 698.46, 659.25,
             523.25, 523.25, 1046.50, 783.99, 659.25, 587.33,
             698.46, 698.46, 783.99, 659.25, 523.25, 587.33, 523.25],
    lane: null },
  { id: 'symph', title: '厨房交响', icon: 'pot', style: 'dual', beats: 32,
    seg: [{ bpm: 90 }],
    t: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    melody: [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 783.99, 698.46,
             659.25, 587.33, 523.25, 587.33, 659.25, 698.46,
             783.99, 880.00, 987.77, 1046.50, 987.77, 880.00, 783.99, 698.46,
             659.25, 587.33],
    lane: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
  { id: 'chef', title: '快乐厨师', icon: 'chef', style: 'dual', beats: 40,
    seg: [{ bpm: 88 }, { bpm: 104, from: 24 }],
    t: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 26, 27, 28, 29, 30, 31],
    melody: [523.25, 587.33, 659.25, 523.25, 587.33, 659.25, 523.25, 587.33,
             659.25, 698.46, 783.99, 880.00,
             880.00, 783.99, 698.46, 659.25, 587.33, 659.25, 783.99, 880.00,
             987.77, 880.00,
             1046.50, 987.77, 880.00, 783.99, 698.46, 659.25],
    lane: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0] }
];
const FOOD_KINDS = ['carrot', 'tomato', 'egg'];   // 食材白名单（i%3 轮换展开）

/* ---------- 关卡映射（SPEC §2）：CH_LEN 5→8（v1 键基迁移 IIFE 见 game-main） ---------- */
const CH_LEN = 8;                 // 每章 8 关（r18；v1=5 → 启动 IIFE 迁移）
const STATIC_LEVELS = 32;         // 静态 32 关 = 4 章
const KR_SEED = 1002;             // 本批种子常量（SEED 扫描定值：flat32-39 四 dch 全现+7 曲分散）
const SONG_OF_STATIC = [0, 1, 2, 0, 1, 2, 0, 1,      // ch1 单轨恒速
                        3, 4, 5, 3, 4, 5, 3, 4,      // ch2 变速
                        6, 7, 6, 7, 6, 7, 6, 7,      // ch3 长曲
                        8, 9, 8, 9, 8, 9, 8, 9];     // ch4 双轨
const CHAPTERS = {
  1: { name: '节拍起步', hint: '曲子会变快哦' },      // 预告 ch2 变速
  2: { name: '快慢变化', hint: '曲子要变长啦' },      // 预告 ch3 长曲
  3: { name: '长曲挑战', hint: '两只手一起上' },      // 预告 ch4 双轨
  4: { name: '双手合奏', hint: '新一轮曲子来啦' }     // 预告生成关
};
const GEN_HINTS = ['连击小目标',   // dch1 门槛档（gate3=N/2）
                   '连击过半',     // dch2（gate3=2N/3）
                   '连击大挑战',   // dch3（gate3=3N/4）
                   '连击大集合'];  // dch4（gate3=4N/5）

/* ---------- 判定档（SPEC §3：按 BPM 归一化；verify 独立复算档域） ---------- */
const PERFECT_K = 0.22, PERFECT_LO = 0.09, PERFECT_HI = 0.15;  // perfectW=clamp(0.22*beatDur,.09,.15)
const goodW = pW => 2 * pW;

/* ---------- 连击门槛星级（SPEC §4：连续 Perfect/Good 达门槛才得星） ---------- */
const GATE2_R = [1 / 3, 1 / 2, 2 / 3, 3 / 4];
const GATE3_R = [1 / 2, 2 / 3, 3 / 4, 4 / 5];

/* ---------- r18 时长模型（SPEC §5；estMs 四方同步之一，modeled 双钉 verify+_selftest）
   DECIDE_MIN=每音符最小认知间隔（曲型档：双轨>变速/长曲>恒速——双轨须两轨监测+左右手分流）；
   modeled = OPEN 900 + Σ max(gap, DECIDE_MIN[style]) + END 1800（gap=相邻音符秒差×1000，
   尾窗=lastT+1.5 拍）；Math.round 整 ms（JS 与 _spec_calc.py 同序同公式位级一致）。
   SPEC_MODELED_MIN=17170（flat10 伦敦桥，禁约数）；LEVEL_MIN_MS=17000（本款单曲一关口径）。 ---------- */
const DECIDE_MIN = { steady: 550, tempo: 620, long: 620, dual: 800 };
const OPEN_MS = 900, END_MS = 1800, TAIL_BEATS = 1.5;
const LEVEL_MIN_MS = 17000;
const modeled = flat => {
  const s = SONGS[genLevel(flat | 0).song];
  const ts = s.t;
  let play = 0;
  for (let i = 0; i < ts.length - 1; i++) {
    play += Math.max((secAt(s.seg, ts[i + 1]) - secAt(s.seg, ts[i])) * 1000, DECIDE_MIN[s.style]);
  }
  play += Math.max((secAt(s.seg, ts[ts.length - 1] + TAIL_BEATS) -
                    secAt(s.seg, ts[ts.length - 1])) * 1000, DECIDE_MIN[s.style]);
  return Math.round(OPEN_MS + play + END_MS);
};

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；
   kitchen_* 老键沿用对账 + r18 新键 kr_*（前缀已核无占用，gen_clips.py ALL 登记）） ---------- */
const VOICE = {
  tut:     { key: 'kitchen_tut',  text: '先看小刀切四个，然后你来试一试' },
  hint:    { key: 'kr_hint',      text: '跟着节拍，到圈就切' },
  missmore:{ key: 'kr_missmore',  text: '小猫要叼走啦，跟上节拍' },
  dual:    { key: 'kr_dual',      text: '左手一下，右手一下' }
};
const numClip = n => 'kitchen_n_' + n;       // 结算数字词（0..30；0 值键 09-19 补）

/* ---------- 图标 SVG（零文字依赖，圆润+暖棕描边风；老款沿用 + r18 新曲图标） ---------- */
const SW = 'stroke="#4A3B2E" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"';
const ICONS = {
  logo: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="46" cy="56" r="30" fill="#FFF9EE" ' + SW + '/>' +
    '<path d="M70 46 Q86 34 82 54 Q78 68 66 60" fill="#E8975A" ' + SW + '/>' +
    '<path d="M24 30 q4 -12 14 -10 M30 18 q8 -6 14 0" stroke="#8FBF7F" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M46 20 v-10 M40 14 l12 -4" stroke="#F0B429" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M40 54 q6 8 12 0" ' + SW.replace('3.5', '3') + ' fill="none"/></svg>',
  star: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 8 L61 35 L90 38 L68 58 L74 88 L50 73 L26 88 L32 58 L10 38 L39 35 Z" fill="#F5C445" ' + SW + '/>' +
    '<circle cx="43" cy="46" r="2.8" fill="#4A3B2E"/><circle cx="57" cy="46" r="2.8" fill="#4A3B2E"/>' +
    '<path d="M44 53 q6 6 12 0" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  tiger: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="24" cy="28" r="12" fill="#EFA05C" ' + SW + '/><circle cx="76" cy="28" r="12" fill="#EFA05C" ' + SW + '/>' +
    '<circle cx="50" cy="56" r="36" fill="#EFA05C" ' + SW + '/>' +
    '<path d="M50 24 v9 M37 27 v8 M63 27 v8" stroke="#B26B3F" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="38" cy="54" r="3.2" fill="#4A3B2E"/><circle cx="62" cy="54" r="3.2" fill="#4A3B2E"/>' +
    '<path d="M46 62 l4 4 l4 -4" stroke="#4A3B2E" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="30" cy="64" rx="5.5" ry="3.6" fill="#F2B8C6" opacity=".8"/><ellipse cx="70" cy="64" rx="5.5" ry="3.6" fill="#F2B8C6" opacity=".8"/></svg>',
  note: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="50" cy="50" r="40" fill="#8FBF7F" ' + SW + '/>' +
    '<g fill="#FFF9EE"><ellipse cx="39" cy="63" rx="9" ry="7" transform="rotate(-18 39 63)"/>' +
    '<ellipse cx="65" cy="57" rx="9" ry="7" transform="rotate(-18 65 57)"/>' +
    '<path d="M46 61 V36 L72 30 V57 h-5 V38 L51 42 V61 Z"/></g></svg>',
  bee: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="52" cy="58" rx="26" ry="20" fill="#F5C445" ' + SW + '/>' +
    '<path d="M42 42 Q38 28 48 24 M60 42 Q64 26 74 30" stroke="#8FBF7F" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M38 54 h28 M36 64 h32" stroke="#4A3B2E" stroke-width="4.5" stroke-linecap="round"/>' +
    '<circle cx="60" cy="38" r="11" fill="#FFF9EE" ' + SW + '/>' +
    '<path d="M52 30 l-6 -8 M68 30 l6 -8" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="57" cy="37" r="2" fill="#4A3B2E"/><circle cx="64" cy="37" r="2" fill="#4A3B2E"/></svg>',
  brush: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="40" y="14" width="20" height="34" rx="10" fill="#E8975A" ' + SW + '/>' +
    '<rect x="34" y="46" width="32" height="16" rx="8" fill="#FBF3E4" ' + SW + '/>' +
    '<path d="M36 62 L64 62 L58 88 Q50 94 42 88 Z" fill="#93BF84" ' + SW + '/>' +
    '<path d="M46 70 q4 6 8 0" stroke="#4A3B2E" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  bridge: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M12 66 Q50 22 88 66" stroke="#E8975A" stroke-width="10" fill="none" stroke-linecap="round"/>' +
    '<path d="M12 66 Q50 22 88 66" stroke="#FBF3E4" stroke-width="4" fill="none" stroke-dasharray="2 10" stroke-linecap="round"/>' +
    '<path d="M26 66 v18 M50 40 v44 M74 66 v18" stroke="#B98A5A" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M6 86 h88" stroke="#4A3B2E" stroke-width="4.5" stroke-linecap="round"/>' +
    '<path d="M20 60 q6 -4 8 2 M70 60 q6 -4 8 2" stroke="#8FBF7F" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
  bell: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 16 v-6" stroke="#4A3B2E" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M28 62 Q26 30 50 24 Q74 30 72 62 Z" fill="#F5C445" ' + SW + '/>' +
    '<path d="M24 62 h52" stroke="#4A3B2E" stroke-width="4.5" stroke-linecap="round"/>' +
    '<circle cx="50" cy="72" r="8" fill="#E8975A" ' + SW + '/>' +
    '<circle cx="42" cy="42" r="2.6" fill="#4A3B2E"/><circle cx="58" cy="42" r="2.6" fill="#4A3B2E"/>' +
    '<path d="M45 50 q5 4 10 0" stroke="#4A3B2E" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>',
  cake: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 18 v-6 M50 12 q-5 -4 0 -8 q5 4 0 8" stroke="#E8654F" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M24 52 q26 -14 52 0 v26 q-26 14 -52 0 Z" fill="#F2B8C6" ' + SW + '/>' +
    '<path d="M24 62 q26 -14 52 0" stroke="#FFF9EE" stroke-width="5" fill="none"/>' +
    '<path d="M24 72 q26 -14 52 0" stroke="#FFF9EE" stroke-width="5" fill="none"/>' +
    '<ellipse cx="50" cy="48" rx="30" ry="9" fill="#FFF9EE" ' + SW + '/>' +
    '<circle cx="38" cy="44" r="2.2" fill="#4A3B2E"/><circle cx="62" cy="44" r="2.2" fill="#4A3B2E"/></svg>',
  pot: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M30 26 q4 -10 0 -14 M50 24 q4 -10 0 -16 M70 26 q4 -10 0 -14" stroke="#C9C8C2" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<rect x="16" y="30" width="68" height="46" rx="16" fill="#93BF84" ' + SW + '/>' +
    '<rect x="16" y="44" width="68" height="8" fill="#8FBF7F"/>' +
    '<path d="M84 42 q10 8 0 20 M16 46 h-8 q-4 6 0 12 h8" fill="#FBF3E4" ' + SW + '/>' +
    '<circle cx="40" cy="62" r="2.8" fill="#4A3B2E"/><circle cx="60" cy="62" r="2.8" fill="#4A3B2E"/>' +
    '<path d="M45 68 q5 4 10 0" stroke="#4A3B2E" stroke-width="2.8" fill="none" stroke-linecap="round"/></svg>',
  chef: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M28 40 Q18 38 18 28 Q18 16 32 20 Q36 8 50 12 Q64 8 68 20 Q82 16 82 28 Q82 38 72 40 Z" fill="#FFF9EE" ' + SW + '/>' +
    '<rect x="30" y="42" width="40" height="30" rx="10" fill="#EFA05C" ' + SW + '/>' +
    '<circle cx="42" cy="56" r="2.8" fill="#4A3B2E"/><circle cx="58" cy="56" r="2.8" fill="#4A3B2E"/>' +
    '<path d="M45 64 q5 4 10 0" stroke="#4A3B2E" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="34" cy="64" rx="5" ry="3.4" fill="#F2B8C6" opacity=".8"/><ellipse cx="66" cy="64" rx="5" ry="3.4" fill="#F2B8C6" opacity=".8"/></svg>',
  keys: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="12" y="20" width="18" height="62" rx="9" fill="#E8975A" ' + SW + '/>' +
    '<rect x="33" y="14" width="18" height="68" rx="9" fill="#F5C445" ' + SW + '/>' +
    '<rect x="54" y="20" width="18" height="62" rx="9" fill="#8FBF7F" ' + SW + '/>' +
    '<rect x="75" y="14" width="14" height="68" rx="7" fill="#F2B8C6" ' + SW + '/></svg>',
  knife: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M14 30 Q14 20 24 20 L62 20 Q80 20 84 40 Q86 52 74 58 L30 74 Q20 76 17 66 Q14 55 14 42 Z" fill="#E9E2D2" ' + SW + '/>' +
    '<rect x="62" y="14" width="26" height="22" rx="11" fill="#B98A5A" transform="rotate(28 75 25)" ' + SW + '/></svg>',
  cat: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M70 62 q20 -6 16 -26" stroke="#EFA666" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="46" cy="66" rx="32" ry="24" fill="#EFA666" ' + SW + '/>' +
    '<circle cx="44" cy="36" r="24" fill="#EFA666" ' + SW + '/>' +
    '<path d="M27 22 q-2 -12 9 -10 M61 22 q2 -12 -9 -10" fill="#EFA666" ' + SW + '/>' +
    '<circle cx="36" cy="34" r="2.8" fill="#4A3B2E"/><circle cx="52" cy="34" r="2.8" fill="#4A3B2E"/>' +
    '<path d="M42 41 l3 3 l3 -3" stroke="#4A3B2E" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
  speaker: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 40 h14 L56 20 v60 L34 60 H20 Z" fill="#FFF9EE" ' + SW + '/>' +
    '<path d="M66 38 q9 12 0 24 M76 30 q15 20 0 40" stroke="#FFF9EE" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
  home: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 14 L88 46 H78 V82 H22 V46 H12 Z" fill="#FFF9EE" ' + SW + '/>' +
    '<rect x="42" y="56" width="16" height="26" rx="6" fill="#E8975A"/></svg>',
  play: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M32 22 L78 50 L32 78 Z" fill="#fff"/></svg>',
  plate: '<svg viewBox="0 0 232 148" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="116" cy="74" rx="108" ry="60" fill="#FFFDF7" stroke="#E0D2BC" stroke-width="5"/>' +
    '<ellipse cx="116" cy="74" rx="76" ry="38" fill="#FBF3E4" stroke="#EFE3CD" stroke-width="4"/>' +
    '<path d="M40 46 q-12 26 4 48" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".9"/></svg>',
  finger: '<svg viewBox="0 0 58 78" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M29 6 c9 0 13 6 13 15 v20 c7 2 9 9 6 16 l-7 13 h-26 l-7 -18 c-2 -7 2 -11 8 -10 v-21 c0 -9 5 -15 13 -15 z" ' +
    'fill="rgba(255,255,255,.9)" stroke="rgba(74,59,46,.55)" stroke-width="3" stroke-linejoin="round"/></svg>',
  combo: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M62 14 L78 30 L46 62 L30 46 Z" fill="#F5C445" ' + SW + '/>' +
    '<path d="M24 74 q10 10 22 4" stroke="#E8654F" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<path d="M18 58 l4 -6 M14 70 l7 -2" stroke="#E8654F" stroke-width="4" stroke-linecap="round"/></svg>'
};
const iconFood = k => ({
  carrot: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none"><g transform="translate(4 14) rotate(-14 28 18)">' +
    '<path d="M-2 18 Q6 4 28 6 Q46 8 46 18 Q46 28 28 30 Q6 32 -2 18 Z" fill="#EC8B4D" stroke="#4A3B2E" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M40 4 q6 -8 10 -6 M44 8 q8 -4 10 0" stroke="#8FBF7F" stroke-width="4" fill="none" stroke-linecap="round"/></g></svg>',
  tomato: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="32" cy="36" r="20" fill="#DE6256" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M32 16 v-6 M24 18 l-4 -6 M40 18 l4 -6" stroke="#8FBF7F" stroke-width="4" stroke-linecap="round"/></svg>',
  egg: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<ellipse cx="32" cy="34" rx="18" ry="23" fill="#FFF7E9" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M24 20 q-3 6 -1 12" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/></svg>'
}[k]);
