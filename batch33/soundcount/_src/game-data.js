/* ================= soundcount 听音计数 游戏数据（数字域 1-10 / 章配置 / 语音文案 / SVG）
   玩法（SPEC-BATCH33 §0.79/§1 + SPEC-R24-SOUNDCOUNT r24 修订，5-6 岁记忆/数感·听觉计数）：
     数字卡 SVG=数字大字+对应点数圆点（认数字形+点数双通道——数学符号，非文字墙）；
     1-5 单行圆点原样，6-10 双行五点阵（ten-frame——首行恒 5+次行 n-5，「5 和几」结构化表征）。
   题型三族（r24：dch1/2/3 基线原样，dch4=纯听+大域+双问固定谱）：
     counthear（ch1-2 基线 + dch4 大域腿）：播鼓 N 下→问「敲了几下呀」(sc_q1)→数字卡点选。
       ch1-2 鼓图逐击 bounce 视锚同步恒在（降坡核心，700ms 可数节奏）；
       dch4 腿 N∈6-10（subitizing 上限外逐次累加）且**撤视锚纯听**（鼓不逐击 bounce，
       播放期挂「用耳朵数」耳徽标——零逐击信息；候选域封闭 {6..10}）；
     countmix（ch3 基线原样）：鼓 N+铃 M 混排问「鼓敲了几下」(sc_q2)=选择性计数；
       N∈3-5 且 M∈1-2 且 N+M≤6；鼓图只对鼓击 bounce（视锚同选择性）；
     countdual（r24 新，dch4 双问腿）：鼓 N+铃 M 混排**只播一遍**，两步作答——
       第一步问「鼓敲了几下」(sc_q2) 点对转第二步问「铃铛响了几下」(sc_q3)，
       N∈3-5≠M∈2-4（双重选择性计数+工作记忆保持；候选 ⊆1-5 恒含 N 与 M）。
   候选数学先验：数字卡互异含真值（ch1 2 卡/ch2 3 卡/ch3+ 4 卡；
     dch4 counthear 候选 ⊆{6..10}，countdual ⊆{1..5} 含双真值）。
   点对=right+数字名音拼播（确认链全 clip 无 keyless——契约 N 天然安全；r24 大域名音
   sc_n_6-10 新键注册前静默——SPEC-R24 §R6 先注册后交付）；
   点错首错=hint「再听一遍呀」+自动重播一遍+数字卡排 bump（方向级）；
   miss≥2=正确数字卡 breathe（答案级；countdual 双步共用 miss 口径）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 数字域：1-5 基线封闭集（dch1-3/countdual）+ r24 大域带 {6..10}（dch4 counthear） ---------- */
const NUMS5 = [1, 2, 3, 4, 5];
const NUMS_HI = [6, 7, 8, 9, 10];            // r24 量域上探（SPEC-R24 §R3：大域候选带=近失区间防远距送分）

/* ---------- 契约 L：数字/量词 TTS 映射表覆盖封闭全集 1-10（r24 扩 6-10；
   量词「下」入名音（sc_n_*）——确认链/right 回退共用。6-10 名音键注册前静默（§R6） ---------- */
const NUM_TEXT = { 1: '一下', 2: '两下', 3: '三下', 4: '四下', 5: '五下',
                   6: '六下', 7: '七下', 8: '八下', 9: '九下', 10: '十下' };
const nameClip = n => 'sc_n_' + n;           // 名音键（晓晓读：一下…十下）

/* ---------- 击段节奏（SPEC §0.79：段间 700ms 可数节奏） ---------- */
const HIT_GAP = 700;                         // 击间隔（视锚 bounce 同步）

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言） ---------- */
const CHAPTERS = {
  1: { name: '鼓声数一数', hint: '卡片变多了，仔细听再点' },     // 预告 ch2 counthear 3 候选
  2: { name: '听得更仔细', hint: '小铃铛来啦，只数鼓声哦' },     // 预告 ch3 countmix 选择性计数
  3: { name: '小铃来捣乱', hint: '鼓不跳了，用耳朵数大数字' },   // 预告 ch4 r24：纯听+大域+双问
  4: { name: '大挑战',     hint: '新一轮听音计数' }              // 预告生成关
};
const GEN_HINTS = ['两张卡里选数字',        // dch1 counthear N∈2-3 2 候选
                   '三张卡里选数字',        // dch2 counthear N∈3-4 3 候选
                   '只数鼓声，别数铃铛',    // dch3 countmix 选择性计数
                   '用耳朵数大数字'];       // dch4 生成关=纯听+大域+双问（r24）
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=sc_ 已核
   manifest 无占用）。clip 实长（batch33/_clipdur33.json，浏览器 Audio 实测）：
   tut_watch 3144 / tut_turn 1896 / hint 1824 / right 2304（判对后窗 ≥2604）/ wrong 1656
   / q1 1752 / q2 1848 / replay 1656；名音 sc_n_*：n_3 1416 / n_4 1416 / n_2 1368
   / n_1 1320 / n_5 1320（全集 max 1416——确认链 right+150+名音+300 ≥ 4170；
   错链 wrong 1656+150+hint 1824+300 = 3930） ---------- */
const VOICE = {
  watch: { key: 'sc_tut_watch', text: '看！听一听数一数' },
  turn:  { key: 'sc_tut_turn',  text: '你来数一数' },
  hint:  { key: 'sc_hint',      text: '再听一遍呀' },
  right: { key: 'sc_right',     text: '数对啦，真棒' },
  wrong: { key: 'sc_wrong',     text: '再想一想' },
  q1:    { key: 'sc_q1',        text: '敲了几下呀' },
  q2:    { key: 'sc_q2',        text: '鼓敲了几下' },
  q3:    { key: 'sc_q3',        text: '铃铛响了几下' },   // r24 countdual 第二步问句（新键，注册前静默）
  ears:  { key: 'sc_ears',      text: '这次呀，用小耳朵数一数' },   // r24 纯听模式首次预告（每存档一次）
  replay:{ key: 'sc_replay',    text: '再听一遍' }
};

/* ---------- 鼓/铃 SVG（viewBox 0 0 120 120；家族暖卡通风：INK 描边+暖填充）
   鼓=题面视锚主体（counthear/countmix 恒在场——视锚恒在不撤）；
   铃=干扰音色身份图（countmix 场景在场，恒静态不 bounce——视锚同选择性）。
   根组 g[data-anim] = 图 id——契约 M 帧内容断言锚（渲染即引擎对账依据）。 ---------- */
const DRUM_EL =
  /* 鼓身圆柱（暖橙侧面+装饰星）+ 顶面鼓面（暖黄）+ 双鼓棒 */
  '<ellipse cx="60" cy="88" rx="40" ry="14" fill="#D98A4A" stroke="' + INK + '" stroke-width="3.5"/>' +
  '<path d="M20 62 v26 a40 14 0 0 0 80 0 v-26 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
  '<path d="M38 78 l4 -8 4 8 Z M56 84 l4 -8 4 8 Z M74 78 l4 -8 4 8 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
  '<ellipse cx="60" cy="62" rx="40" ry="14" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5"/>' +
  '<ellipse cx="60" cy="62" rx="30" ry="9.5" fill="#FBDF9A" opacity=".8"/>' +
  '<path d="M32 40 L54 58 M88 40 L66 58" stroke="#B98052" stroke-width="5" stroke-linecap="round"/>' +
  '<circle cx="30" cy="38" r="5.5" fill="#B98052" stroke="' + INK + '" stroke-width="2.4"/>' +
  '<circle cx="90" cy="38" r="5.5" fill="#B98052" stroke="' + INK + '" stroke-width="2.4"/>' +
  '<path d="M14 62 h-6 M106 62 h6" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>';
const BELL_EL =
  /* 小铃铛：铃身+铃口+铃舌+摆动线（干扰音色身份图，静态） */
  '<path d="M60 22 Q40 24 36 52 L34 62 h52 l-2 -10 Q80 24 60 22 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
  '<path d="M60 12 v-6" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
  '<circle cx="60" cy="12" r="4" fill="#E8756A" stroke="' + INK + '" stroke-width="2.2"/>' +
  '<path d="M34 62 h52 a4 4 0 0 1 0 8 h-52 a4 4 0 0 1 0 -8 Z" fill="#E8B04B" stroke="' + INK + '" stroke-width="3"/>' +
  '<circle cx="60" cy="78" r="6" fill="#E8756A" stroke="' + INK + '" stroke-width="2.6"/>' +
  '<path d="M92 40 q8 10 0 20" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>';

function drumSvg(size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="120" height="120"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="drum">' + DRUM_EL + '</g></svg>';
}
function bellSvg(size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="80" height="80"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="bell">' + BELL_EL + '</g></svg>';
}

/* ---------- 数字卡 SVG 工厂：numSvg(n, size)——数字大字+对应点数圆点（数学符号双通道）
   圆点 class="dot"（verify 点数对账锚：.dot 数==n）；根组 g[data-num]。
   r24：n≥6 双行五点阵（ten-frame——首行恒 5+次行 n-5，「5 和几」结构化表征） ---------- */
function numSvg(n, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="100" height="100"';
  const dot = (cx, cy, r) => '<circle class="dot" cx="' + cx + '" cy="' + cy + '" r="' + r +
    '" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>';
  let dots = '';
  if (n <= 5) {
    const gap = 19, x0 = 60 - (n - 1) * gap / 2;
    for (let k = 0; k < n; k++) dots += dot(Math.round(x0 + k * gap), 96, 6.5);
  } else {
    const gap = 16.5;
    const row = (cnt, cy) => { const x0 = 60 - (cnt - 1) * gap / 2;
      for (let k = 0; k < cnt; k++) dots += dot(Math.round(x0 + k * gap), cy, 5.6); };
    row(5, 87); row(n - 5, 102);            // 首行恒 5 点，次行 n-5 点
  }
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-num="' + n + '">' +
    '<text x="60" y="72" text-anchor="middle" font-size="62" font-weight="800" ' +
    'font-family="\'PingFang SC\',\'Microsoft YaHei\',sans-serif" fill="' + INK + '">' + n + '</text>' +
    dots + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 鼓+音符（听音计数主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="20" cy="27" rx="11" ry="4.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M9 27 v-8 a11 4.5 0 0 0 22 0 v8" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<ellipse cx="20" cy="19" rx="11" ry="4.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M33 22 v-11 l5 -2 v10" stroke="#E8975A" stroke-width="2.6" fill="none" stroke-linejoin="round"/>' +
    '<circle cx="30.6" cy="23.4" r="2.8" fill="#E8756A"/></svg>',
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
