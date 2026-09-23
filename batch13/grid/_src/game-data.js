/* ================= grid 坐标寻宝 游戏数据（r13 难度改造版：8×8 相对导航）
   r13 改造（2026-09-15，AUDIT-78 #39 红款——「5×5 行列点选+走格概念一年级；ch3 无墙无可错操作」根治）：
   ① 棋盘 5×5→8×8 域扩（格下限 44px 双 viewport——r13 delta 定死）
   ② 指令改相对导航：封闭指令族 fwd n(1-3)/左转 L/右转 R/到访 T（身体参照系非绝对行列）；
     朝向状态机 N/E/S/W（兔子朝向箭头旋转+前方格高亮可视化）
   ③ 多目标依序：按序到访多宝箱（exec 1 箱 / plan 2 箱 / maze 3 箱，序号可视）；
     最少步意识（步数常显「已走 X 步·最短 Y 步」，错步可撤销不罚但步数不减）
   ④ ch4 死路：墙 6-10 布局须含死端格+绕行段（BFS 独立复算）
   章型（难度章 dch1-4；进度章号单调递增、生成关随机章参数 flat≥20）：
     dch1 exec1 听指令执行：qi0 热身 [fwd1,T]；qi1-4 指令 2 移动命令+T，0 墙 1 箱
     dch2 exec2 长指令：qi0 热身 exec1 型；qi1-4 指令 3 移动命令+T，墙 0-2（离路径）
     dch3 plan 多宝箱自由规划：qi0 热身 exec 型；qi1-4 依序 2 箱，墙 2-4
     dch4 maze 死路绕行：qi0 热身 plan 型 1 箱；qi1-4 依序 3 箱，墙 6-10（死路+绕行）
   语音（r13）：指令句=queue 拼接全 clip（gri_i_fwd+gri_n_N+gri_i_ge / gri_i_left/right / gri_i_take，
   §0.23 禁 key:null）；plan 题面=gri_i_order；错序方向反馈=queue(['gri_i_next',gri_n_N,gri_i_box])；
   救援 hint=gri_i_hint（r13 新句替 gri_hint——其「行和列」文案随行列题型下线语义失配，本体保留不删）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；hint 按"预告下一章"语义写——完成第 N 章显示 CHAPTERS[N].hint
   预告第 N+1 章内容；GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  1: { name: '听指令',   hint: '指令要更长啦，还要记得转方向' },   // 完成第 1 章预告第 2 章
  2: { name: '长指令',   hint: '宝箱变多啦，要按顺序去拿' },       // 预告第 3 章
  3: { name: '多宝箱',   hint: '路上有死胡同，要绕开走啦' },       // 预告第 4 章
  4: { name: '死路绕行', hint: '新一轮寻宝挑战' }                  // 完成第 4 章预告生成关
};
const GEN_HINTS = ['听指令，向前进', '长指令要记牢', '按顺序拿宝箱', '绕开死路拿宝箱'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
const GRID_N = 8;          // r13：5×5→8×8 域扩（AUDIT-78 #39 delta①）

/* ---------- 语音实长表（voice/clips 实测 2026-09-15，ffprobe ms）：
   gri_tut_watch 3096 / gri_tut_turn 1776 / gri_wrong 2544 / gri_hint 2400（本体保留不删）
   / gri_i_fwd 1464 / gri_i_ge 1128 / gri_i_left 1680 / gri_i_right 1656 / gri_i_take 1704
   / gri_i_order 2328 / gri_i_next 1440 / gri_i_box 1560 / gri_i_hint 2640。
   开场接力窗 OPEN_RELAY 3000 ≥ gri_i_hint 2640+300（防尾截）；指令句 queue 段间 0.15s（core）；
   首错演出锁 480×SPEED（总窗口径=480×SPEED+0 尾窗，b39 定版禁只断常量）。 ---------- */
const OPEN_RELAY_MS = 3000;                       // 开场 hint→指令句接力窗（真时钟）
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- r13 时长模型（门禁硬断言；认知步主体非演出窗——AUDIT-56 根因③同对策）
   每步（原子动作：fwd 逐格计/L/R/T 各 1）dur = max(voiceWin, DECIDE_MS[kind]) + ADV_MS；
   voiceWin：首步 = ENTER 400+estMs(题面句)+300 / 后续步 = STAGE_MS 400；
   DECIDE_MS（7-8 岁认知决策推算——相对导航心象旋转负荷高于绝对坐标，参考 crd 9-11s 档）：
     exec1 7000：单指令解码+执行（朝向编码 2000+身体参照系→绝对方向换算 3000+边界核对确认 2000）
     exec2 8500：长指令序贯跟踪（跨指令朝向状态保持+换算；句长 cap 20 字 voiceWin 8200 下界托底）
     plan  9000：自由规划步（多箱序约束下自生成路径决策=执行负荷+规划增量）
     maze 10000：死路绕行步（死端排除+回头成本预估=规划负荷上限）
   ADV_MS 600（每动作跳格/旋转动画窗 ≥ 实际 hop 360）；CHEST_WIN 950（到访开箱演出）。
   验算（每步 DECIDE ≥ voiceWin：exec1 句 ≤14 字=6130≤7000 / exec2 ≤20 字=8200≤8500 /
   plan·maze 题面 7 字=3715≤9000/10000——语音窗从不撑时长）：
   最短关（全 exec1 最短题 [fwd1,T]=2 动作）= 5×(950+2×7600)=80750 ≥ LEVEL_MIN_MS 40000；
   实测 40 关最低 126350（verify ⑩ 独立副本复算逐关对账）。 ---------- */
const ENTER_MS = 400;                        // 新题出场动画窗（与指令句播报并行起算）
const STAGE_MS = 400;                        // 题内动作推进窗（指令条高亮推进/步进换格）
const ADV_MS = 600;                          // 每动作判对推进窗（跳格+方向词反馈）
const CHEST_WIN = 950;                       // 到访开箱演出窗（advance 演出）
const DECIDE_MS = { exec1: 7000, exec2: 8500, plan: 9000, maze: 10000 };
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r13 门禁，7-8 岁口径）
const CAP_EXEC1 = 14, CAP_EXEC2 = 20;        // exec 句长上限（voiceWin≤DECIDE 结构性托底）
const sentenceOf = q => q.seq.map(cm => cm.t === 'fwd' ? '向前' + NUM_CN[cm.n] + '格'
  : (cm.t === 'L' ? '向左转' : (cm.t === 'R' ? '向右转' : '拿到宝箱'))).join('，');
const PLAN_SAY = '按顺序拿到宝箱';             // plan/maze 题面句（gri_i_order clip 原文）
const quizSay = q => q.kind.slice(0, 4) === 'exec' ? sentenceOf(q) : PLAN_SAY;
const nActions = q => q.seq.reduce((s, cm) => s + (cm.t === 'fwd' ? cm.n : 1), 0);
const stepVoiceMs = (q, k) => k === 0 ? (ENTER_MS + estMs(quizSay(q)) + 300) : STAGE_MS;
const quizDurMs = q => {                      // CHEST_WIN + Σ_k [max(voiceWin_k, DECIDE)+ADV]
  let s = CHEST_WIN;
  for (let k = 0; k < nActions(q); k++) s += Math.max(stepVoiceMs(q, k), DECIDE_MS[q.kind]) + ADV_MS;
  return s;
};
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 语音文案（watch/turn/wrong 既有键一字不改；hint=r13 新键 gri_i_hint——
   文案与 voice/clips/manifest.json 严格一致，禁改 key/text） */
const VOICE = {
  watch: { key: 'gri_tut_watch', text: '看！宝藏在格子里' },
  turn:  { key: 'gri_tut_turn',  text: '你来找一找' },
  hint:  { key: 'gri_i_hint',    text: '听一听，想好再走' },  /* r13 新句（救援/探索轻提示） */
  wrong: { key: 'gri_wrong',     text: '再想一想，听一听' }  /* 纠错轻语音 sayW（10s 节流 flat≥3，豁免恰一次） */
};
/* 中文数词 1-3（指令格数与宝箱序号用；与 gri_n_1..3 文案一致，TTS 兜底与 aria 用） */
const NUM_CN = { 1: '一', 2: '二', 3: '三' };
const numKey = n => 'gri_n_' + n;                     // 数词 clip key（1-3）
/* 指令族（r13 封闭集）：{t:'fwd',n:1-3} 前进 n 格 / {t:'L'} 左转 / {t:'R'} 右转 / {t:'T'} 到访拿宝箱
   ——题表 seq 即此族序列（exec=任务本身，plan/maze=参考最优解 autoSolve/时长模型共用） */
const CMD_NAME = { fwd: '前进', L: '左转', R: '右转', T: '拿宝箱' };
const cmdText = cm => cm.t === 'fwd' ? '向前' + NUM_CN[cm.n] + '格'
  : (cm.t === 'L' ? '向左转' : (cm.t === 'R' ? '向右转' : '拿到宝箱'));
const cmdClips = cm => cm.t === 'fwd' ? ['gri_i_fwd', numKey(cm.n), 'gri_i_ge']
  : [cm.t === 'L' ? 'gri_i_left' : (cm.t === 'R' ? 'gri_i_right' : 'gri_i_take')];
/* 绝对方向（BFS 扩展序+方向词反馈用；fwd 后播绝对方向词=gri_d_* 桥接相对→绝对） */
const DIRS = ['up', 'left', 'right', 'down'];
const DIR_NAME = { up: '上', down: '下', left: '左', right: '右' };
const DIR_KEY = d => 'gri_d_' + d;
const DIR_D = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };  // [dr,dc]
/* 朝向状态机（r13 核心）：N/E/S/W；左转 N→W→S→E→N（-90°）；右转反向；
   DELTA_H 沿朝向走一格；HEAD_DEG 旋转角（可视化）；HEAD_WORD 朝向→绝对方向词 */
const HEADS = ['N', 'E', 'S', 'W'];
const TURN_L = { N: 'W', W: 'S', S: 'E', E: 'N' };
const TURN_R = { N: 'E', E: 'S', S: 'W', W: 'N' };
const DELTA_H = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
const HEAD_DEG = { N: 0, E: 90, S: 180, W: 270 };
const HEAD_WORD = { N: 'up', E: 'right', S: 'down', W: 'left' };

/* ---------- 图标（全部内嵌 SVG，描线风；宝箱/石块由 chestSvg/stoneSvg 程序生成） */
const GOLD = '#F5C445', WOOD = '#C98B4B', WOOD_D = '#B5763B';
function chestSvg(open) {   // 宝箱：闭=盖合；开=盖掀起+金光+金币（开启动画由 CSS .open 驱动）
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g class="glow">' +
    '<circle cx="50" cy="52" r="34" fill="' + GOLD + '" opacity=".28"/>' +
    '<circle cx="50" cy="52" r="24" fill="' + GOLD + '" opacity=".3"/>' +
    '<circle cx="38" cy="38" r="4" fill="' + GOLD + '"/><circle cx="63" cy="35" r="3.4" fill="' + GOLD + '"/>' +
    '<circle cx="68" cy="52" r="2.8" fill="' + GOLD + '"/></g>' +
    /* 箱体 */
    '<rect x="22" y="47" width="56" height="34" rx="6" fill="' + WOOD + '" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<line x1="22" y1="58" x2="78" y2="58" stroke="' + INK + '" stroke-width="2.4" opacity=".55"/>' +
    '<line x1="40" y1="64" x2="40" y2="80" stroke="' + INK + '" stroke-width="2.4" opacity=".4"/>' +
    '<line x1="60" y1="64" x2="60" y2="80" stroke="' + INK + '" stroke-width="2.4" opacity=".4"/>' +
    /* 盖子（CSS transform 掀起：transform-box:fill-box 锚左下） */
    '<g class="lid"><path d="M18 47 V38 q0 -12 14 -12 h36 q14 0 14 12 v9 Z" fill="' + WOOD_D +
    '" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<line x1="30" y1="28" x2="30" y2="44" stroke="' + INK + '" stroke-width="2.2" opacity=".4"/>' +
    '<line x1="50" y1="26" x2="50" y2="44" stroke="' + INK + '" stroke-width="2.2" opacity=".4"/>' +
    '<line x1="70" y1="28" x2="70" y2="44" stroke="' + INK + '" stroke-width="2.2" opacity=".4"/></g>' +
    /* 锁扣 */
    '<rect x="43" y="44" width="14" height="13" rx="3" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="50" cy="49.5" r="2" fill="' + INK + '"/><rect x="48.6" y="49.5" width="2.8" height="4.6" rx="1.4" fill="' + INK + '"/>' +
    '</svg>';
}
function stoneSvg() {       // 障碍石块：灰蓝圆石（hopscotch 石头色系）
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="50" cy="84" rx="26" ry="7" fill="#B7C4D4" opacity=".5"/>' +
    '<path d="M24 78 q-6 -30 12 -44 q16 -12 32 2 q16 14 8 34 q-4 10 -26 10 q-22 0 -26 -2 Z" fill="#C9D3E0" stroke="#8FA0B5" stroke-width="4"/>' +
    '<path d="M38 42 q8 -8 18 -2 M30 60 q6 -6 14 -3" stroke="#8FA0B5" stroke-width="3.4" stroke-linecap="round" opacity=".7"/>' +
    '<ellipse cx="42" cy="38" rx="9" ry="6" fill="#E8EDF4" opacity=".8" transform="rotate(-18 42 38)"/>' +
    '</svg>';
}
const ICONS = {
  /* logo：小宝箱 */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="9" y="20" width="26" height="17" rx="3.4" fill="' + WOOD + '" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M7 20 v-4 q0 -7 7 -7 h16 q7 0 7 7 v4 Z" fill="' + WOOD_D + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<rect x="19" y="18" width="6" height="8" rx="2" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="24" cy="34" r="1.6" fill="' + INK + '"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 指令键图标（相对语义：fwd=直行箭头恒朝上=身体前方；L/R=弯转箭头；T=宝箱） */
  cmd: {
    fwd: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 6 L40 28 H31 V41 H17 V28 H8 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/></svg>',
    L: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M34 40 V22 a10 10 0 0 0 -20 0 M14 22 L9 30 M14 22 L21 28" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" transform="rotate(0 24 24)"/><path d="M34 40 V22 a10 10 0 0 0 -10 -10" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M16 16 L24 12 L21 21 Z" fill="' + INK + '"/></svg>',
    R: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M14 40 V22 a10 10 0 0 1 20 0" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/><path d="M32 16 L24 12 L27 21 Z" fill="' + INK + '"/></svg>',
    T: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">' +
       '<rect x="11" y="22" width="26" height="16" rx="3" fill="' + WOOD + '" stroke="' + INK + '" stroke-width="2.6"/>' +
       '<path d="M9 22 v-3 q0 -6 6 -6 h18 q6 0 6 6 v3 Z" fill="' + WOOD_D + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
       '<rect x="21" y="20" width="6" height="7" rx="2" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="1.8"/></svg>'
  },
  undo: '<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M30 14 H17 a9 9 0 0 0 0 18 h9" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>' +
    '<path d="M22 7 L13 14 L22 21 Z" fill="' + INK + '"/></svg>'
};
