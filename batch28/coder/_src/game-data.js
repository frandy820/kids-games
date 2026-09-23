/* ================= coder 指令小兔 游戏数据（方向封闭 4 / 步数域 2-5 / 网格 3×3+4×4 / 章配置 / 语音文案 / SVG）
   r40 难度加深（SPEC-R40-CODER §R2）：ch1-2 走 2/3 步（3×3），ch3 起 4×4 大草地
   run dist 阶梯 2/3/4/5 + path 预测 seq 2（ch3 lv0-1 引入坡）→3 步（ch3 lv2+/ch4）。
   玩法：题面 = 草地网格（3×3 或 ch3+ 4×4：小兔起点 + 萝卜目标 +（ch3+）石头障碍）+ 题面句；
   下方方向指令卡（箭头 SVG + 汉字，封闭 4：up上 / down下 / left左 / right右）。
   run 题：点一张卡小兔走一格（走格动画）；到达萝卜即 right（殊途同达合法——交换律
   路径教育上正确，不卡顺序）；撞石头 / 出界 = 该卡吞（卡灰飞 + 小兔朝向顶一下 +
   「往这边走不过去哦」TTS 拼句，不记 miss = 探索性惩罚豁免）；卡池点完未到达 =
   wrong + miss + 复位（小兔回起点、卡池全恢复可重走）。
   path 题（ch3+ 预测题型）：给 2-3 步指令序列（题面指令条按序展示 + 语音念
   「走两/三步，先往X，再往Y（，再往Z）」——NUMCN 两口径），「小兔子会走到哪？」
   seq2=3 格 / seq3=4 格候选卡（答案+末段中间格+首段中间格（去重）+随机补足——
   少走一步/两步双陷阱在场），点对 = right——心理模拟（r40 主轴：序列加长+网格扩容）。
   卡池数学先验（SPEC-BATCH28 §0.67，r40 原样）：卡池 = 一条最短路径的指令多重集
   （曼哈顿距离 = 步数）±（ch3+ 题序奇数位加 1 张干扰方向卡，出题器 DFS 复验
   加入后仍可拼出 ≥1 条合法到达路径）；石头不挡死全部路径（网格 BFS 避石可达 +
   至少一条最短路存活）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 方向封闭 4（SPEC §0.67：up上 / down下 / left左 / right右）
   坐标 (r,c)：r=0 顶行，c=0 左列 */
const DIRS = {
  up:    { n: '上', dr: -1, dc: 0, rot: 0 },
  down:  { n: '下', dr: 1,  dc: 0, rot: 180 },
  left:  { n: '左', dr: 0,  dc: -1, rot: 270 },
  right: { n: '右', dr: 0,  dc: 1, rot: 90 }
};
const DIR_KEYS = ['up', 'down', 'left', 'right'];   // 封闭集（verify 对账）

/* 步数汉字表（TTS 拼句「走两步」——契约 L：量词前 2 用「两」口语）。
   步数域 2-5（r40 阶梯：ch1 dist2 / ch2 dist3 / ch3 dist4 / ch4 dist5；
   path seq 域 2-3——NUMCN 语音消费方仅 pathSpeak，域 1-3 封闭不变） */
const NUMCN = { 1: '一', 2: '两', 3: '三' };

/* 相对方位（run 未到达错反馈方向句：水平优先）；曼哈顿 distOf 见 game-core.js（引擎侧） */
const dirToward = (from, to) =>
  to.c < from.c ? 'left' : (to.c > from.c ? 'right' : (to.r < from.r ? 'up' : 'down'));

/* ---------- 句式（题面句 / path 读题拼句 / 判对确认句——TTS 拼句 SPEC §1 豁免 clip 化）
   最长句静态上限（build.py 按封闭表独立重算对账）：
   判对确认句 9 字（小兔子吃到萝卜啦）/ run 错反馈方向句 12 字符（小兔没走到萝卜，先往左走）
   / path 读题 20 字符（走两步，先往左，再往下，小兔子会走到哪）
   / path 读题 3 步 25 字符（走三步，先往左，再往下，再往右，小兔子会走到哪——r40 变长） */
const quizText = q => q.kind === 'path' ? '小兔子会走到哪？' : '帮小兔子走到萝卜';
/* path 读题（语音念指令序列——变长构造 r40：「先往X」首段 + 每追加段「，再往Y」，数字走 NUMCN 两口径；
   seq2 输出与 r39 版逐字符一致（回归零漂移——verify ④b 双例断言） */
const pathSpeak = q => '走' + NUMCN[q.seq.length] + '步，先往' + DIRS[q.seq[0]].n +
                       q.seq.slice(1).map(d => '，再往' + DIRS[d].n).join('') +
                       '，小兔子会走到哪';
const confirmText = q => q.kind === 'path' ? '猜对啦，走到这里' : '小兔子吃到萝卜啦';

/* ---------- 错反馈语义引导句（SPEC §0.67：run 未到达按小兔当前位与萝卜相对方位
   给「先往左/右/上/下走」；path 错锚第一步；撞石/出界探索豁免句） */
const GUIDE = {
  run_wrong:  '小兔没走到萝卜，先往{d}走',   // {d}=方向汉字（运行时替换，12 字符定长）
  path_wrong: '再想想，先走第一步看看',
  block:      '往这边走不过去哦'
};
const guideText = q => q.kind === 'path' ? GUIDE.path_wrong :
  GUIDE.run_wrong.replace('{d}', DIRS[dirToward(q.walked, q.goal)].n);

/* ---------- T46 阶段2：path 读题/引导/确认 clip 键构造（与 gen_clips.py T46 注册段全一致；
   pathKeys 变长链全键化（r40：走+数词+步，先往+首方向+（，再往+方向）×(len-1)+尾句——
   cod_ps_zai 每追加段复用一次，seq3 链 9 段零新键；seq2 输出与旧 7 段链逐段一致）/
   guideKeys run_wrong 拆 gw1+方向+gw2 三段、path_wrong 单段（链尾恒有键）/ 确认与 demo 单键 ---------- */
const pathKeys = q => [
  { key: 'cod_ps_go', text: '走' },
  { key: 'cod_ps_n_' + q.seq.length, text: NUMCN[q.seq.length] },
  { key: 'cod_ps_bu', text: '步，先往' },
  { key: 'cod_d_' + q.seq[0], text: DIRS[q.seq[0]].n }]
  .concat(q.seq.slice(1).flatMap(d => [
    { key: 'cod_ps_zai', text: '，再往' },
    { key: 'cod_d_' + d, text: DIRS[d].n }]))
  .concat([{ key: 'cod_ps_tail', text: '，小兔子会走到哪' }]);
const guideKeys = q => {
  if (q.kind === 'path') return [{ key: 'cod_g_path', text: GUIDE.path_wrong }];
  const d = dirToward(q.walked, q.goal), p = GUIDE.run_wrong.split('{d}');
  return [{ key: 'cod_gw1', text: p[0] },
          { key: 'cod_d_' + d, text: DIRS[d].n },
          { key: 'cod_gw2', text: p[1] }];
};
const confirmKeyOf = q => q.kind === 'path' ? 'cod_cf_path' : 'cod_cf_run';

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言） */
const CHAPTERS = {
  1: { name: '走两步', hint: '小兔子要走三步啦' },       // 预告 ch2 三步走（r40：ch1 已两步起步）
  2: { name: '走三步', hint: '格子要变大啦，还要动脑猜一猜' }, // 预告 ch3 4×4+预测
  3: { name: '猜一猜', hint: '全部混在一起，大挑战来啦' }, // 预告 ch4 混合
  4: { name: '大挑战', hint: '新一轮走格子开始啦' }       // 预告生成关
};
const GEN_HINTS = ['两步两步走，想好再点',      // dch1 两步走（3×3）
                   '三步三步走，想好顺序再点',  // dch2 三步走（3×3）
                   '四格大棋盘，猜猜走到哪',    // dch3 4×4+dist4+预测
                   '大集合，想好每一步再点'];   // dch4 混合（4×4+dist5）
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
/* path 预测步数表（r40 SPEC §R2）：dch3 lv0-1 引入坡 seq2，lv2 起与 dch4 恒 seq3 */
const pathSeqOf = (dch, lv) => (dch === 3 && lv < 2) ? 2 : 3;

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   六包装 watch/turn/hint/right/wrong/q；path 读题/确认句/引导句=TTS 拼句
   clip 实长（SPEC-BATCH28 §4 量化）：watch 3504/turn 1848/hint 2352/
   right 2424（判对后窗 ≥2724）/wrong 2568/q 2400 */
const VOICE = {
  watch: { key: 'cod_tut_watch', text: '看！小兔子要去找萝卜' },
  turn:  { key: 'cod_tut_turn',  text: '你来指一指' },
  hint:  { key: 'cod_hint',      text: '想想先往哪边走' },
  right: { key: 'cod_right',     text: '走到啦，真聪明' },
  wrong: { key: 'cod_wrong',     text: '再想想往哪边走' },
  q:     { key: 'cod_q',         text: '帮小兔子走到萝卜' }
};

/* ---------- 萝卜 SVG（viewBox 0 0 100 100：橙色锥根 + 绿缨 + 纹理） */
function carrotSvg() {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M40 18 q-14 -12 -26 -8 q10 8 12 14 q-10 2 -16 10 q12 2 20 6 Z" fill="#57A773" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M62 18 q14 -12 26 -8 q-10 8 -12 14 q10 2 16 10 q-12 2 -20 6 Z" fill="#6FBF87" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M50 22 L84 58 Q88 62 84 68 L56 92 Q50 97 44 92 L16 68 Q12 62 16 58 Z" fill="#F0882F" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M34 52 l10 10 M52 66 l10 10 M40 74 l8 8" stroke="#C96A1D" stroke-width="3.5" stroke-linecap="round" fill="none"/>' +
    '<path d="M36 34 Q44 28 52 32" stroke="#F8B262" stroke-width="3" stroke-linecap="round" fill="none" opacity=".9"/></svg>';
}

/* ---------- 石头 SVG（viewBox 0 0 100 100：灰圆石 + 高光 + 底影） */
function stoneSvg() {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<ellipse cx="50" cy="82" rx="34" ry="8" fill="' + INK + '" opacity=".14"/>' +
    '<path d="M22 74 Q12 52 26 38 Q38 22 58 24 Q80 26 86 46 Q92 64 78 74 Q60 84 40 80 Z" fill="#9AA3AD" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M34 40 Q42 32 54 34" stroke="#D5DBE1" stroke-width="5" stroke-linecap="round" fill="none"/>' +
    '<path d="M60 64 Q70 60 76 52" stroke="#7B8590" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '<circle cx="44" cy="52" r="4" fill="#B9C2CB"/></svg>';
}

/* ---------- 方向箭头 SVG（viewBox 0 0 60 60：粗箭头向上 + 按方向 rotate） */
function arrowSvg(dir) {
  return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g transform="rotate(' + DIRS[dir].rot + ' 30 30)">' +
    '<path d="M30 6 L52 34 H41 V53 H19 V34 H8 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M30 14 L43 30 H36 V45 H24 V30 H17 Z" fill="#F8CB94" stroke="none" opacity=".85"/></g></svg>';
}

/* ---------- path 格候选卡 mini 网格（g×g 微格 + mk 标记候选格——r31 判别力：mini 与真网格同构，
   r40 起 g∈{3,4}；g=4 挂 m4 类走四列样式） */
function miniGridHtml(cell, g) {
  g = g || 3;
  let h = '';
  for (let r = 0; r < g; r++) for (let c = 0; c < g; c++)
    h += '<i' + (r === cell.r && c === cell.c ? ' class="mk"' : '') + '></i>';
  return h;
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 四向箭头罗盘 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M22 8 L26 15 H18 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M22 36 L26 29 H18 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M8 22 L15 18 V26 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M36 22 L29 18 V26 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<circle cx="22" cy="22" r="3" fill="' + INK + '"/></svg>',
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
