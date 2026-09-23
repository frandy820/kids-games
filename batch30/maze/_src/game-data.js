/* ================= maze 迷宫探险 游戏数据（章配置 / 语音文案 / SVG / 句式）
   玩法（SPEC-BATCH30 §0.75/§3）：seeded 生成网格迷宫（墙=格子障碍）→ 小兔在入口格 →
   萝卜在出口格 → 逐格点选相邻可行格移动 → 走到萝卜格 = 本局完成（'right'，末局 'done'）；
   点障碍格 / 对角格 / 不相邻格 = 'wrong' + miss 轻反馈（迷宫试错 = 探索，wrong 不 wig
   人格否定，只 pop + 容器 bump + 相邻可行格 pulse）；点已走过格 = 合法回退（'back'，
   回退不记 miss——死路自救机制）；每关 3 局（迷宫单局时长长于选择题，破 5 题惯例）。
   三层难度：ch1 5×5 少障碍（≤4）/ ch2 7×7 中障碍（≤10）/ ch3 7×7 钥匙门
   （钥匙格 + 门格——门挡在通路上，先点钥匙格拾取才能过门；未拿钥匙点门 = wrong
   记 miss 同口径——钥匙门 = 规划进阶非陷阱）/ ch4 生成混合。
   生成数学先验（§0.75）：每局迷宫必可解（生成后 DFS 验证入口→出口连通，不通重生成；
   ch3 分段：门关态 入口→钥匙 连通 + 门开态 钥匙→出口 连通 + 门关态 入口→出口
   不连通——门必经，钥匙必要）；解不要求唯一；墙分布 seeded 确定。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint = 章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言） ---------- */
const CHAPTERS = {
  1: { name: '小迷宫', hint: '迷宫变大啦，要走 7×7 的大迷宫' },  // 预告 ch2 7×7
  2: { name: '大迷宫', hint: '有钥匙和门啦，先找钥匙再开门' },    // 预告 ch3 钥匙门
  3: { name: '钥匙与门', hint: '全部混在一起，大挑战来啦' },      // 预告 ch4 混合
  4: { name: '大挑战', hint: '新一轮迷宫探险开始啦' }             // 预告生成关
};
const GEN_HINTS = ['小迷宫，一步一步走',       // dch1 5×5 少障碍
                   '大迷宫，看清路再走',       // dch2 7×7 中障碍
                   '记得先找钥匙哦',           // dch3 7×7 钥匙门
                   '大集合，慢慢想再走'];      // dch4 混合
const LEVELS_PER_CH = 5;   // 5 关 = 1 章（家族章长）
const RUNS_PER_LEVEL = 3;  // 每关 3 局（SPEC §0.75 明示破 5 题惯例）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
const CH_LEN = RUNS_PER_LEVEL;  // 引擎步进口径：关内 3 局（renderStep/L.step 语义）

/* ---------- 句式（题面句 / 教学 demo 机制句 / 拾钥匙确认句——TTS 拼句 SPEC §3 豁免 clip 化）
   最长句静态上限（build.py 按封闭表独立重算对账）：
   教学 demo 机制句 8 字（点旁边的格子走路）/ 拾钥匙确认句 5 字（拿到钥匙啦）
   / 错反馈语义句 8 字（点小兔旁边的格子） ---------- */
const quizText = () => '帮小兔子吃到萝卜';
const DEMO_SENT = '点旁边的格子走路';   // 教学演示句（8 字 estMs=3360）
const GETKEY_SENT = '拿到钥匙啦';       // 拾钥匙确认句（5 字 estMs=2325）

/* ---------- 错反馈语义引导句（SPEC §0.75：wrong→「看看旁边能走的格子」方向级 =
   相邻可行格 pulse 高亮；TTS 第二段语义句口径同义短句）
   GUIDE.guide——拼播链 [maz_wrong, {key:'maz_guide', text}] clip 键段尾（T46 阶段2） ---------- */
const GUIDE = {
  guide: '点小兔旁边的格子'   // 错反馈链第二段（方向级语义句）
};

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   七件包装 watch/turn/hint/right/wrong/q + key；clip 实长（SPEC-BATCH30 §4）：
   watch 3264 / turn 1800 / hint 2304 / right 2424（判对后窗 ≥2724）/
   wrong 2664 / q 2424 / key 1896（钥匙窗=实长+300） ---------- */
const VOICE = {
  watch: { key: 'maz_tut_watch', text: '看！帮小兔子走迷宫' },
  turn:  { key: 'maz_tut_turn',  text: '你来走一走' },
  hint:  { key: 'maz_hint',      text: '看看旁边的格子' },
  right: { key: 'maz_right',     text: '走到啦，真聪明' },
  wrong: { key: 'maz_wrong',     text: '看看旁边能走的格子' },
  q:     { key: 'maz_q',         text: '帮小兔子吃到萝卜' },
  key:   { key: 'maz_key',       text: '先找钥匙哦' }
};

/* ---------- 萝卜 SVG（viewBox 0 0 100 100：橙色锥根 + 绿缨 + 纹理——家族同款） ---------- */
function carrotSvg() {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M40 18 q-14 -12 -26 -8 q10 8 12 14 q-10 2 -16 10 q12 2 20 6 Z" fill="#57A773" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M62 18 q14 -12 26 -8 q-10 8 -12 14 q10 2 16 10 q-12 2 -20 6 Z" fill="#6FBF87" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M50 22 L84 58 Q88 62 84 68 L56 92 Q50 97 44 92 L16 68 Q12 62 16 58 Z" fill="#F0882F" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M34 52 l10 10 M52 66 l10 10 M40 74 l8 8" stroke="#C96A1D" stroke-width="3.5" stroke-linecap="round" fill="none"/>' +
    '<path d="M36 34 Q44 28 52 32" stroke="#F8B262" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/></svg>';
}

/* ---------- 树篱墙 SVG（viewBox 0 0 100 100：迷宫障碍=灌木丛，暖绿 + 棕描线家族风） ---------- */
function bushSvg() {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="50" cy="84" rx="36" ry="8" fill="' + INK + '" opacity=".14"/>' +
    '<path d="M18 72 Q8 58 18 46 Q14 32 30 28 Q34 14 50 18 Q66 12 72 26 Q88 28 86 44 Q94 58 82 70 Q66 80 34 78 Z" fill="#7BA85F" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M30 46 Q38 36 50 40" stroke="#A5C98A" stroke-width="5" stroke-linecap="round" fill="none"/>' +
    '<path d="M56 58 Q66 54 72 46" stroke="#5C8A45" stroke-width="4.5" stroke-linecap="round" fill="none"/>' +
    '<circle cx="38" cy="60" r="4.5" fill="#8FBF7F"/><circle cx="62" cy="34" r="4" fill="#8FBF7F"/>' +
    '<circle cx="24" cy="40" r="3.5" fill="#9CCB86"/></svg>';
}

/* ---------- 钥匙 SVG（viewBox 0 0 100 100：金色钥匙 + 光泽） ---------- */
function keySvg() {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="50" cy="86" rx="30" ry="6" fill="' + INK + '" opacity=".14"/>' +
    '<circle cx="32" cy="42" r="18" fill="none" stroke="#F5C445" stroke-width="11"/>' +
    '<circle cx="32" cy="42" r="18" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M48 48 L78 78" stroke="#F5C445" stroke-width="13" stroke-linecap="round"/>' +
    '<path d="M48 48 L78 78" stroke="' + INK + '" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<path d="M64 60 L74 50 M70 66 L80 56" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M26 36 Q30 30 36 32" stroke="#FBE49B" stroke-width="4" stroke-linecap="round" fill="none" opacity=".9"/></svg>';
}

/* ---------- 木门 SVG（viewBox 0 0 100 100：棕木门 closed 态 / open 态换色开门缝） ---------- */
function doorSvg(open) {
  const panel = open ? '#D8B98A' : '#C0884F';
  const gap = open ? '#FBF6EC' : '#A9713D';
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="50" cy="88" rx="32" ry="6" fill="' + INK + '" opacity=".14"/>' +
    '<path d="M20 86 L20 40 Q20 22 50 14 Q80 22 80 40 L80 86 Z" fill="' + panel + '" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    (open
      ? '<path d="M44 82 L44 34 Q46 26 56 24 L56 82 Z" fill="' + gap + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M28 48 h10 M28 62 h10 M62 48 h10 M62 62 h10" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" opacity=".55"/>'
      : '<path d="M30 48 h12 M30 62 h12 M58 48 h12 M58 62 h12 M50 30 v52" stroke="#8A5A2B" stroke-width="3" stroke-linecap="round" fill="none"/>' +
        '<circle cx="60" cy="58" r="4.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2.5"/>') +
    '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕）：logo=小迷宫牌 / 听 / 重玩 / 幽灵手指 ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M11 11 h9 v6 h-4 v10 h10 v-4 h7 v10 H11 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="13" cy="13" r="2.4" fill="#E8975A" stroke="' + INK + '" stroke-width="1.2"/>' +
    '<circle cx="33" cy="33" r="2.6" fill="#F0882F" stroke="' + INK + '" stroke-width="1.2"/></svg>',
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
