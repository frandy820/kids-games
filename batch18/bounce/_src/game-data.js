/* ================= bounce 游戏数据（章配置 / 语音文案 / 方向词表 / 图标）
   SPEC-BATCH18 §3：弹球进洞（反弹预判；点方向卡款，不灰化）。
   台面=6×5 格当量：格点阵 x∈[0..6]、y∈[0..5]（7×6 个整数格点），球/洞在格点上，
   墙段=格点间线段（轴对齐或 45° 斜），边界四墙恒在（不列入 q.walls，UI 与 verify 各自补）。
   题型：ch1 单次反弹（1 面内墙）/ ch2 两次反弹（2 面内墙）/ ch3 三次反弹+45° 斜墙 1 面
   / ch4 生成关（3 洞 3 方向恰 1 对）。
   语音 6 条中文 clip（bc_*，manifest games:['bounce']）+core 共享 3=9 条；无额外词 clip。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%4+1 循环取材）
   hint=章末预告文案（GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '弹一下', hint: '小球要弹两下啦' },
  2: { name: '弹两下', hint: '斜斜的镜子墙来啦' },
  3: { name: '斜面镜', hint: '三个洞里挑一个' },
  4: { name: '三洞迷局', hint: '更难的弹球在等你' }
};
const GEN_HINTS = ['弹一下再来一遍', '弹两下再来一遍', '斜面镜再挑战', '三洞迷局接着弹'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/clips/manifest.json 严格一致 §0.18）
   boing=球弹到墙上的飞行中反馈句（每飞一趟首弹播一次）；无额外词 clip（题面无文字） ---------- */
const VOICE = {
  watch: { key: 'bc_tut_watch', text: '看！小球弹弹弹' },
  turn:  { key: 'bc_tut_turn',  text: '你猜它进哪个洞' },
  hint:  { key: 'bc_hint',      text: '想想球会怎么弹' },
  right: { key: 'bc_right',     text: '进洞啦，猜对了' },
  wrong: { key: 'bc_wrong',     text: '再想想弹的方向' },
  boing: { key: 'bc_boing',     text: '弹到墙上啦' }
};

/* ---------- 8 方向（格几何当量：水平/垂直/对角线）与词表（y 向下为正） ---------- */
const DIRS8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const DIR_LABEL = {
  '1,0': '右', '-1,0': '左', '0,1': '下', '0,-1': '上',
  '1,1': '右下', '1,-1': '右上', '-1,1': '左下', '-1,-1': '左上'
};

/* ---------- 反弹上限（§0.39：步数上限=8 段反弹防死循环；80 步绝对保险丝） ---------- */
const MAX_BOUNCE = 8;
const MAX_STEPS = 80;

/* ---------- 图标（全部内嵌 SVG；logo=小球弹进洞） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3" y="3" width="38" height="38" rx="9" fill="#F6E3C5" stroke="#FFF" stroke-width="2"/>' +
    '<path d="M8 32 L17 13 L26 32 L33 24" stroke="#FFF" stroke-width="2.5" fill="none" ' +
    'stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3"/>' +
    '<circle cx="17" cy="13" r="3.2" fill="#E8975A" stroke="#FFF" stroke-width="1.5"/>' +
    '<circle cx="33" cy="24" r="4" fill="#FFF" opacity=".9"/></svg>',
  ball: '<svg viewBox="0 0 64 64" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M10 46 Q24 8 38 30 Q46 42 54 36" stroke="#C9A87C" stroke-width="4" fill="none" ' +
    'stroke-linecap="round" stroke-dasharray="2 7"/>' +
    '<circle cx="10" cy="46" r="8" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.5"/>' +
    '<circle cx="7.5" cy="43.5" r="2" fill="#FFF" opacity=".8"/>' +
    '<ellipse cx="54" cy="36" rx="7" ry="4.5" fill="#3B2C20" transform="rotate(18 54 36)"/></svg>',
  arrow: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M7 24 h27" stroke="#4A3B2E" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M26 10 L42 24 L26 38" fill="none" stroke="#E8975A" stroke-width="7" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
