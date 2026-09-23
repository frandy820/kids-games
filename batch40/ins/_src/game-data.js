/* ================= ins 昆虫还是蜘蛛 游戏数据（20 行题表 / 8 动物手绘 SVG /
   章配置 / 语音文案 / 候选按钮图）
   玩法（SPEC-BATCH40 §1，5-6 岁降坡·常识/科学·生物特征辨析）：
   看动物大图（手绘 SVG，腿逐条可数）听题面 → 两选点选。两族：
   judge 族（ch1-2）「{动物名}呀，它是昆虫还是蜘蛛？」两选=昆虫/蜘蛛实物小图；
   legs 族（ch3-4）「{动物名}的腿有几条呀？数一数」两选=六腿排/八腿排图标。
   answer 由 LEGS 封闭表唯一推导（6 腿→昆虫 / 8 腿→蛛形纲答案=蜘蛛），
   禁题表另写 answer 列脱离推导。
   题面=拼接链 [{key:'ins_a_'+anim}, {key:null,text:SAY_T[kind]}]——
   动物名 clip+题模板 keyless TTS 尾段（契约 N：keyless 必居链尾）。
   知识红线（SPEC §1）：蜘蛛/蝎子=蛛形纲不是昆虫——科普句必为「它不是昆虫」
   句式（ins_sci_spider 逐字「蜘蛛有八条腿，它不是昆虫哦」）。
   降坡三件（SPEC §1）：恒两选+题面句全语音+零文字依赖（两选按钮=实物小图
   /腿排图标，无文字）。
   防同质化声明（SPEC §1 审查项）：vs babylove 动物找妈妈=亲子配对→生物特征
   辨析科学判断；vs habitat 环境归属=语义联想→可数特征锚（数腿）分类；
   vs 机器画师=指令执行→观察-归纳科学启蒙——三重差异。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（SPEC-BATCH40 §1 实长表；_clipdur40.json 2026-09-12）
   ins_tut_watch 3072 / ins_tut_turn 1824 / ins_hint 2304 / ins_right 2664 /
   ins_wrong 1944 / 名音 max 1440（ladybird）/ 科普 max 3744（sci_insect——
   SPEC §1 括注 sci_spider 为笔误，实测 max=sci_insect 3744；错链下界
   1944+150+3744+300=6638 数值不变）。确认链窗 PICK_WIN=2964（=2664+300 精确）；
   错链豁免窗 WRONG_CHAIN_WIN=6638（=1944+150+3744+300 真时钟）；首错演出锁
   SHAKE_MS=1100（b39/b40 总窗口径：1100×SPEED+140=1240 ≤ wrong 1944+150=2094
   ——禁覆盖豁免窗，留对选放行活跃段）；题面窗=ENTER 400+名 clip 实长+150+
   estMs(尾段)+300（家族 T 动态，keyless 尾段按实际字符数）。 ---------- */
const ENTER_MS = 400;                        // 新题动物图出场动画窗（与题面链并行）
const PICK_WIN = 2964;                       // 选对演出窗 = ins_right 2664+300（精确）
const SHAKE_MS = 1100;                       // 选错摇头锁窗（总窗 1240 ≤ 2094）
const WRONG_CHAIN_WIN = 6638;                // 错链豁免窗（真时钟；SPEC §1 字面值 6638——
                                             // 实算下界 1944+150+3744+300=6138，SPEC 加法笔误，
                                             // 窗取宽者保豁免不早掐且与主会话门禁口径对齐）
const TUT_WATCH_WAIT = 3400;                 // ≥ins_tut_watch 3072+300=3372
const TUT_TURN_WAIT = 2200;                  // ≥ins_tut_turn 1824+300=2124
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径）
/* ---- r26（SPEC-R26-INS §R4/§R9）：干扰动物错链窗+mixfind 确认链窗 ---- */
const SCI_NONE_DUR = 4344;                   // ins_sci_none clip 实长（主线注册后 mutagen
                                             // 实测回填——r26 回填锚：原 estMs 占位 6120 已收严）
const WRONG_CHAIN_WIN4 = 1944 + 150 + SCI_NONE_DUR + 300;   // 6738：干扰动物主角错链
                                             // （sci_none 4344＞基线链 max 构成 sci_insect 3744——专窗）
const MIX_WIN = 2664 + 150 + 1440 + 300;     // 4554：mixfind 确认链 [right,名音] 窗——
                                             // 名 clip max=1440（ladybird，_clipdur40 实测；
                                             // 契合动物恒核心 8 种，无占位——SPEC §R9 实测口径）
/* 动物名 clip 实长（_clipdur40.json 逐条——题面窗动态计算依据，verify 独立对账；
   r26 snail/centipede 实测回填 1344/1248——原占位 1500 已收严） */
const NAME_DUR = { ant: 1344, bee: 1368, butterfly: 1416, jumpspider: 1416,
                   ladybird: 1440, scorpion: 1416, spider: 1344, wolfspider: 1368,
                   snail: 1344, centipede: 1248 };

/* ---------- 章配置（ch1-2 judge 辨类→ch3 legs 数腿→ch4 大考验——认知坡度；
   进度章号单调递增、难度章号 dch=1+flat//5 静态四档；生成关 flat≥20
   dch=seeded 随机（SPEC §0：seed 887）。
   r26：ch4=3 选+干扰动物+分段+双条件+撤锚谱（SPEC-R26-INS §R2）——
   CHAPTERS[3].hint/GEN_HINTS[3] 随 ch4 内容更新（r24/r25 同款）。
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '昆虫来啦', hint: '蜘蛛也来啦，看看它有几条腿' },
  2: { name: '蜘蛛来啦', hint: '要数腿啦，数一数再选哦' },
  3: { name: '数数腿',   hint: '大考验来啦，还有新朋友蜗牛和蜈蚣' },
  4: { name: '大考验',   hint: '新的动物看不完，继续当小科学家' }
};
const GEN_HINTS = ['认一认，昆虫还是蜘蛛',        // dch1 judge·昆虫池重
                   '再看蜘蛛，它不是昆虫哦',      // dch2 judge·蜘蛛池重
                   '数一数腿，再选一选',          // dch3 legs 数腿
                   '大考验，认认蜗牛和蜈蚣'];     // dch4 r26 新谱（3 选+分段+双条件+撤锚）
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（voice/clips/manifest.json 逐字，禁自造；
   前缀=ins_ 已核 manifest 0 占用，SPEC §4 2026-09-12 实查） ---------- */
const VOICE = {
  watch:     { key: 'ins_tut_watch',   text: '看！昆虫和蜘蛛' },
  turn:      { key: 'ins_tut_turn',    text: '你来点一点' },
  hint:      { key: 'ins_hint',        text: '数数它有几条腿' },
  right:     { key: 'ins_right',       text: '答对啦，小科学家' },
  wrong:     { key: 'ins_wrong',       text: '再数数腿呀' },
  sciInsect: { key: 'ins_sci_insect',  text: '昆虫有六条腿，头胸腹三部分' },
  sciSpider: { key: 'ins_sci_spider',  text: '蜘蛛有八条腿，它不是昆虫哦' },
  /* r26：干扰动物科普句（SPEC-R26 §R10 新键——注册前静默，错链/14s 救援用） */
  sciNone:   { key: 'ins_sci_none',    text: '蜗牛和蜈蚣呀，不是昆虫也不是蜘蛛' }
};
/* 知识红线（SPEC §1）：科普句按动物类取——昆虫=sciInsect / 蛛形纲=sciSpider
   （「它不是昆虫」句式，禁「另一种昆虫」表述）；r26 三向扩：干扰动物
   （蜗牛 0 腿/蜈蚣 20 腿）=sciNone（既非昆虫也非蛛形纲——SPEC-R26 §R4）。 */

/* ---------- 题面模板尾段（keyless TTS 尾段——契约 N 必居链尾）：
   题面链=['ins_a_'+anim, 'ins_t_'+kind]（T46 阶段2 全 clip 化）
   完整题面句 = ANIMAL_NAME[anim] + SAY_T[kind]（钩子 quiz.text/quiz.say 同源）。
   r26 dch4 谱（SPEC-R26 §R4）：新 kind 尾段 SAY_T4——judge3 三选项逐选项念白 /
   legs3 藏腿改「想一想」/ bodyseg 分段可数；mixfind=MIX_SAY[cond] 单段链。 ---------- */
const SAY_T = { judge: '呀，它是昆虫还是蜘蛛？',   // 11 字符 estMs 4395
                legs: '的腿有几条呀？数一数' };    // 10 字符 estMs 4050
const SAY_T4 = { judge3: '呀，它是昆虫、蜘蛛，还是都不是呀？',   // 17 字符 estMs 6465（r26）
                 legs3: '的腿有几条呀？想一想',                  // 10 字符 estMs 4050（藏腿——诚实措辞）
                 bodyseg: '的身体分几段呀？数一数' };            // 11 字符 estMs 4395
const MIX_SAY = { 6: '找一找呀，六条腿的昆虫',      // 11 字符 estMs 4395（r26 mixfind cond=6）
                  8: '找一找呀，八条腿的蜘蛛' };    // 11 字符 estMs 4395（cond=8）
/* 动物名（manifest text 逐字一致；r26：干扰动物 2 种——ins_a_snail/centipede
   为新键，注册前题面链静默（core queue 缺 clip 弃整句不崩）） */
const ANIMAL_NAME = { ant: '蚂蚁', butterfly: '蝴蝶', bee: '蜜蜂', ladybird: '瓢虫',
                      spider: '蜘蛛', wolfspider: '狼蛛', jumpspider: '跳蛛', scorpion: '蝎子',
                      snail: '蜗牛', centipede: '蜈蚣' };
/* 候选标签（aria/无障碍用——视觉呈现零文字，SPEC §1 降坡③；r26 扩三选+动物名兜底） */
const PICK_LABEL = { insect: '昆虫', spider: '蜘蛛', six: '六条腿', eight: '八条腿',
                     none: '都不是', three: '三段', two: '两段', many: '很多段' };

/* ---------- 20 行题表（SPEC §1 分布律：ch1 judge 昆虫3+蜘蛛2 / ch2 judge
   蜘蛛3+昆虫2 / ch3 legs 昆虫3+蜘蛛2 / ch4 legs3+judge2 混合；每章池 5 行
   anim 互异（8 池取 5）——同关 5 题取章池 rotate 天然互异；8 动物全覆盖。
   answer 不落表：由 core 内 LEGS 封闭表唯一推导（SPEC §1 推导律）。
   r26（SPEC-R26 §R2/§R3）：表**原样保留**（dch1-3 取材域零变化）——dch4 仍按
   rotate 公式取 row 号（quiz.row 照赋，20 行覆盖审计 cnt[i]==5 口径不变），
   但 kind 由 DCH4_KINDS[qi] 覆盖、anim 按 §R3 派生（judge3/legs3 掷币换干扰
   动物主角 / bodyseg 取 BODY_POOL / mixfind 契合+异类+干扰三选）。 ---------- */
const ROWS = [
  /* ch1 judge·昆虫 3+蜘蛛 2 */
  { kind: 'judge', anim: 'ant' },          // ①
  { kind: 'judge', anim: 'butterfly' },    // ②
  { kind: 'judge', anim: 'spider' },       // ③
  { kind: 'judge', anim: 'bee' },          // ④
  { kind: 'judge', anim: 'wolfspider' },   // ⑤
  /* ch2 judge·蜘蛛 3+昆虫 2 */
  { kind: 'judge', anim: 'jumpspider' },   // ⑥
  { kind: 'judge', anim: 'ladybird' },     // ⑦
  { kind: 'judge', anim: 'scorpion' },     // ⑧
  { kind: 'judge', anim: 'butterfly' },    // ⑨
  { kind: 'judge', anim: 'spider' },       // ⑩
  /* ch3 legs·昆虫 3+蜘蛛 2 */
  { kind: 'legs', anim: 'bee' },           // ⑪
  { kind: 'legs', anim: 'wolfspider' },    // ⑫
  { kind: 'legs', anim: 'ladybird' },      // ⑬
  { kind: 'legs', anim: 'ant' },           // ⑭
  { kind: 'legs', anim: 'scorpion' },      // ⑮
  /* ch4 混合·legs 3+judge 2 */
  { kind: 'legs', anim: 'jumpspider' },    // ⑯
  { kind: 'judge', anim: 'spider' },       // ⑰
  { kind: 'legs', anim: 'butterfly' },     // ⑱
  { kind: 'legs', anim: 'bee' },           // ⑲
  { kind: 'judge', anim: 'ant' }           // ⑳
];

/* ---------- 动物 SVG（手绘描线风；知识锚：每条腿独立 <path data-leg>——
   昆虫恒 6 条 / 蛛形纲恒 8 条步足，触角/翅/钳须/尾均不带 data-leg（非腿）；
   verify 逐只断言 [data-leg] 计数==LEGS[id]（渲染即知识真值）。
   legs 族题恒挂 .leg-focus（腿高亮视觉锚——SPEC §1：腿逐条可数恒在） ---------- */
const legPath = (d, k, w) => '<path data-leg="' + k + '" d="' + d +
  '" fill="none" stroke="' + INK + '" stroke-width="' + (w || 2.6) + '" stroke-linecap="round"/>';

/* ant 蚂蚁（俯视：头/胸/腹三节+6 腿+2 触角） */
function antInner() {
  return legPath('M41 33 L30 24 L22 13', 1) + legPath('M39 39 L25 38 L14 42', 2) +
         legPath('M41 45 L30 54 L23 66', 3) + legPath('M55 33 L66 24 L74 13', 4) +
         legPath('M57 39 L71 38 L82 42', 5) + legPath('M55 45 L66 54 L73 66', 6) +
    '<path d="M43 13 Q38 5 30 3 M53 13 Q58 5 66 3" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle cx="30" cy="3" r="2.4" fill="' + INK + '"/><circle cx="66" cy="3" r="2.4" fill="' + INK + '"/>' +
    '<circle data-seg="1" cx="48" cy="21" r="10.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="44.5" cy="19" r="2" fill="' + INK + '"/><circle cx="51.5" cy="19" r="2" fill="' + INK + '"/>' +
    '<path d="M45 25 q3 2 6 0" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>' +
    '<ellipse data-seg="2" cx="48" cy="40" rx="8.5" ry="10" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse data-seg="3" cx="48" cy="63" rx="14.5" ry="17" fill="#B0824F" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M34.5 58 q13.5 5 27 0 M34.5 66 q13.5 5 27 0" fill="none" stroke="' + INK + '" stroke-width="2" opacity=".55"/>';
}
/* butterfly 蝴蝶（背视：4 翅+棒状身+6 短腿露在头下+2 棒锤触角——腿最后画在翅上可见） */
function butterflyInner() {
  return '<path d="M45 32 C34 12 12 14 14 32 C15.5 44 32 50 45 46 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M51 32 C62 12 84 14 82 32 C80.5 44 64 50 51 46 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M45 48 C33 52 24 62 29 72 C34 80 44 76 47 64 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M51 48 C63 52 72 62 67 72 C62 80 52 76 49 64 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M43 34 L20 22 M43 42 L18 38 M45 52 L32 66 M45 56 L40 68" stroke="' + INK + '" stroke-width="1.6" opacity=".45" fill="none"/>' +
    '<path d="M53 34 L76 22 M53 42 L78 38 M51 52 L64 66 M51 56 L56 68" stroke="' + INK + '" stroke-width="1.6" opacity=".45" fill="none"/>' +
    '<ellipse cx="48" cy="50" rx="5.5" ry="24" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="48" cy="22" r="6.5" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M45 17 Q41 9 34 7 M51 17 Q55 9 62 7" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="34" cy="7" r="2.2" fill="' + INK + '"/><circle cx="62" cy="7" r="2.2" fill="' + INK + '"/>' +
    legPath('M45 24 L36 27 L31 35', 1) + legPath('M46 26 L44 36 L42 44', 2) + legPath('M46 27 L49 37 L53 45', 3) +
    legPath('M51 24 L60 27 L65 35', 4) + legPath('M50 26 L52 36 L54 44', 5) + legPath('M50 27 L47 37 L43 45', 6);
}
/* bee 蜜蜂（俯视：头/胸/条纹腹+2 半透明翅+6 腿+2 触角） */
function beeInner() {
  return legPath('M40 32 L29 25 L21 15', 1) + legPath('M38 38 L24 38 L13 42', 2) +
         legPath('M40 44 L29 53 L22 64', 3) + legPath('M56 32 L67 25 L75 15', 4) +
         legPath('M58 38 L72 38 L83 42', 5) + legPath('M56 44 L67 53 L74 64', 6) +
    '<ellipse cx="24" cy="36" rx="13" ry="8.5" transform="rotate(-32 24 36)" fill="#E8EEF4" stroke="' + INK + '" stroke-width="2" opacity=".8"/>' +
    '<ellipse cx="72" cy="36" rx="13" ry="8.5" transform="rotate(32 72 36)" fill="#E8EEF4" stroke="' + INK + '" stroke-width="2" opacity=".8"/>' +
    '<path d="M44 12 Q41 5 34 3 M52 12 Q55 5 62 3" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="34" cy="3" r="2" fill="' + INK + '"/><circle cx="62" cy="3" r="2" fill="' + INK + '"/>' +
    '<circle data-seg="1" cx="48" cy="19" r="9.5" fill="#5A4636" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="44.8" cy="17.5" r="1.8" fill="#FFF"/><circle cx="51.2" cy="17.5" r="1.8" fill="#FFF"/>' +
    '<ellipse data-seg="2" cx="48" cy="38" rx="9.5" ry="10.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse data-seg="3" cx="48" cy="63" rx="13.5" ry="17" fill="#F5C542" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M35.5 55 q12.5 4.5 25 0 M34.8 63 q13.2 4.5 26.4 0 M35.5 71 q12.5 4.5 25 0" fill="none" stroke="' + INK + '" stroke-width="3.6"/>' +
    '<path d="M36 46 q12 4 24 0" fill="none" stroke="' + INK + '" stroke-width="3.2"/>';
}
/* ladybird 瓢虫（俯视：红翅鞘+黑点+前头+6 短腿+2 触角） */
function ladybirdInner() {
  return legPath('M36 26 L26 19 L18 10', 1) + legPath('M33 32 L20 30 L10 32', 2) +
         legPath('M35 38 L24 46 L18 56', 3) + legPath('M60 26 L70 19 L78 10', 4) +
         legPath('M63 32 L76 30 L86 32', 5) + legPath('M61 38 L72 46 L78 56', 6) +
    '<path d="M42 18 Q40 11 34 9 M54 18 Q56 11 62 9" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="34" cy="9" r="2" fill="' + INK + '"/><circle cx="62" cy="9" r="2" fill="' + INK + '"/>' +
    '<ellipse cx="48" cy="27" rx="13" ry="11" fill="#5A4636" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="42" cy="25" r="2.4" fill="#FFF" opacity=".85"/><circle cx="54" cy="25" r="2.4" fill="#FFF" opacity=".85"/>' +
    '<circle cx="48" cy="56" r="26" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M48 31 v50" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="37" cy="46" r="4.6" fill="' + INK + '"/><circle cx="59" cy="46" r="4.6" fill="' + INK + '"/>' +
    '<circle cx="41" cy="64" r="4" fill="' + INK + '"/><circle cx="56" cy="66" r="4" fill="' + INK + '"/>' +
    '<circle cx="48" cy="77" r="3.4" fill="' + INK + '"/>';
}
/* spider 蜘蛛·圆蛛（俯视：小头胸+大圆腹+8 长步足两折——蛛形纲无触角不画） */
function spiderInner() {
  return legPath('M38 30 L18 18 L6 7', 1) + legPath('M36 34 L14 30 L3 29', 2) +
         legPath('M36 40 L13 46 L3 54', 3) + legPath('M38 44 L18 60 L10 77', 4) +
         legPath('M58 30 L78 18 L90 7', 5) + legPath('M60 34 L82 30 L93 29', 6) +
         legPath('M60 40 L83 46 L93 54', 7) + legPath('M58 44 L78 60 L86 77', 8) +
    '<circle data-seg="1" cx="48" cy="35" r="12.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="43.5" cy="31" r="2.4" fill="' + INK + '"/><circle cx="52.5" cy="31" r="2.4" fill="' + INK + '"/>' +
    '<circle cx="40" cy="39" r="1.6" fill="' + INK + '"/><circle cx="56" cy="39" r="1.6" fill="' + INK + '"/>' +
    '<circle data-seg="2" cx="48" cy="61" r="20.5" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M48 45 v32 M36 52 q12 6 24 0 M36 64 q12 6 24 0 M39 73 q9 5 18 0" fill="none" stroke="' + INK + '" stroke-width="2" opacity=".5"/>';
}
/* wolfspider 狼蛛（同构圆蛛：步足更粗+腹背纵纹+头胸稍大眼列） */
function wolfspiderInner() {
  return legPath('M37 29 L17 17 L5 6', 1, 3.4) + legPath('M35 33 L13 29 L2 28', 2, 3.4) +
         legPath('M35 39 L12 45 L2 53', 3, 3.4) + legPath('M37 43 L17 59 L9 76', 4, 3.4) +
         legPath('M59 29 L79 17 L91 6', 5, 3.4) + legPath('M61 33 L83 29 L94 28', 6, 3.4) +
         legPath('M61 39 L84 45 L94 53', 7, 3.4) + legPath('M59 43 L79 59 L87 76', 8, 3.4) +
    '<circle data-seg="1" cx="48" cy="34" r="13.5" fill="#B0824F" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="43" cy="29" r="2.8" fill="' + INK + '"/><circle cx="53" cy="29" r="2.8" fill="' + INK + '"/>' +
    '<circle cx="39" cy="36" r="1.7" fill="' + INK + '"/><circle cx="57" cy="36" r="1.7" fill="' + INK + '"/>' +
    '<circle cx="44.5" cy="40" r="1.4" fill="' + INK + '"/><circle cx="51.5" cy="40" r="1.4" fill="' + INK + '"/>' +
    '<circle data-seg="2" cx="48" cy="62" r="20" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M48 44 v36 M41 47 v32 M55 47 v32" fill="none" stroke="' + INK + '" stroke-width="2" opacity=".5"/>';
}
/* jumpspider 跳蛛（头胸大+前中眼特大+腹小+8 短粗足+缘毛） */
function jumpspiderInner() {
  return legPath('M36 32 L20 24 L11 15', 1) + legPath('M34 36 L18 36 L8 38', 2) +
         legPath('M34 40 L19 47 L13 57', 3) + legPath('M36 43 L23 54 L19 66', 4) +
         legPath('M60 32 L76 24 L85 15', 5) + legPath('M62 36 L78 36 L88 38', 6) +
         legPath('M62 40 L77 47 L83 57', 7) + legPath('M60 43 L73 54 L77 66', 8) +
    '<path d="M33 24 l-4 -3 M64 24 l4 -3 M30 33 l-5 -1 M66 33 l5 -1" stroke="' + INK + '" stroke-width="1.6" opacity=".55"/>' +
    '<rect data-seg="1" x="29" y="22" width="38" height="28" rx="14" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="40" cy="33" r="7.5" fill="#FFF" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="56" cy="33" r="7.5" fill="#FFF" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="40" cy="34" r="3.4" fill="' + INK + '"/><circle cx="56" cy="34" r="3.4" fill="' + INK + '"/>' +
    '<circle cx="47" cy="43" r="2" fill="' + INK + '"/><circle cx="49" cy="43" r="0" fill="none"/>' +
    '<ellipse data-seg="2" cx="48" cy="66" rx="15" ry="13.5" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="42" cy="62" r="2.4" fill="' + INK + '" opacity=".7"/><circle cx="54" cy="62" r="2.4" fill="' + INK + '" opacity=".7"/>' +
    '<circle cx="48" cy="71" r="2" fill="' + INK + '" opacity=".7"/>';
}
/* scorpion 蝎子（俯视：头胸+中体+8 细步足+2 粗钳须（非腿）+尾节上翘带毒囊——
   钳须/尾均不带 data-leg：蛛形纲 8 条步足才是腿） */
function scorpionInner() {
  return legPath('M38 28 L27 21 L18 12', 1) + legPath('M36 33 L22 31 L11 31', 2) +
         legPath('M36 38 L23 44 L16 54', 3) + legPath('M39 42 L28 52 L23 66', 4) +
         legPath('M58 28 L69 21 L78 12', 5) + legPath('M60 33 L74 31 L85 31', 6) +
         legPath('M60 38 L73 44 L80 54', 7) + legPath('M57 42 L68 52 L73 66', 8) +
    /* 钳须 2：粗短两节+开口钳（视觉与细步足强区分——非腿） */
    '<path d="M40 22 L28 13 L19 6" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M56 22 L68 13 L77 6" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M19 7 L13 3 L21 1 Z M19 7 L15 12 L23 10 Z" fill="#B0824F" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M77 7 L83 3 L75 1 Z M77 7 L81 12 L73 10 Z" fill="#B0824F" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<ellipse cx="48" cy="34" rx="12" ry="10.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="43.5" cy="31" r="2" fill="' + INK + '"/><circle cx="52.5" cy="31" r="2" fill="' + INK + '"/>' +
    '<ellipse cx="48" cy="50" rx="14" ry="12.5" fill="#B0824F" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M35 46 q13 4 26 0 M35 53 q13 4 26 0" fill="none" stroke="' + INK + '" stroke-width="1.8" opacity=".55"/>' +
    /* 尾：5 节渐小向右上卷+毒囊球+刺（非腿） */
    '<path d="M48 62 q-3 8 4 13 q8 6 17 3" fill="none" stroke="#B0824F" stroke-width="6.5" stroke-linecap="round"/>' +
    '<circle cx="71" cy="77" r="5.2" fill="#B0824F" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M74 73 l5 -5" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>';
}
/* snail 蜗牛（侧视：螺旋壳+软软的身体+两根眼柄——软体动物**无腿**：
   data-leg 计数=0 知识锚（LEGS.snail=0，verify 逐只断言）；眼柄非腿不带 data-leg。
   r26 干扰动物①：既非昆虫也非蛛形纲（judge3/legs3「都不是」答案的承载者） */
function snailInner() {
  return '<path d="M10 70 Q42 58 86 66 Q90 72 84 76 L18 76 Q6 76 10 70 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M16 70 Q12 52 26 49 Q38 47 40 57 Q41 66 34 71 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M22 50 Q19 42 14 39 M30 48 Q29 39 26 34" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle cx="14" cy="38" r="2.2" fill="' + INK + '"/><circle cx="26" cy="33" r="2.2" fill="' + INK + '"/>' +
    '<circle cx="58" cy="47" r="22" fill="#B0824F" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M58 32 a15 15 0 1 0 0.1 0 M58 38 a9 9 0 1 0 0.1 0" fill="none" stroke="' + INK + '" stroke-width="2.2" opacity=".6"/>' +
    '<path d="M55 47 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0" fill="none" stroke="' + INK + '" stroke-width="2" opacity=".6"/>';
}
/* centipede 蜈蚣（俯视：15 体节（data-seg 1..15——SEGS.centipede=15「很多段」
   知识锚）+20 条步足（data-leg 1..20——LEGS.centipede=20「腿很多≠6≠8」封闭
   表征：前 10 节每节一对，后 5 节足渐小不画）+2 触角与眼点（非腿）。
   r26 干扰动物②：多足纲——既非昆虫也非蛛形纲 */
function centipedeInner() {
  let s = '';
  const ys = [];
  for (let k = 1; k <= 15; k++) ys.push(44 + (k % 2 ? -2.5 : 2.5));   // 体节缓波
  for (let k = 1; k <= 10; k++) {                                     // 步足 20 条（前 10 节）
    const cx = 13 + (k - 1) * 5, y = ys[k - 1];
    s += legPath('M' + (cx - 2) + ' ' + (y + 6) + ' L' + (cx - 8) + ' ' + (y + 13) + ' L' + (cx - 11) + ' ' + (y + 21), 2 * k - 1, 2.2);
    s += legPath('M' + (cx + 2) + ' ' + (y + 6) + ' L' + (cx + 8) + ' ' + (y + 13) + ' L' + (cx + 11) + ' ' + (y + 21), 2 * k, 2.2);
  }
  for (let k = 15; k >= 1; k--) {                                     // 体节 15 节（尾向头画，头在最上层）
    const cx = 13 + (k - 1) * 5, y = ys[k - 1];
    s += '<rect data-seg="' + k + '" x="' + (cx - 2.7) + '" y="' + (y - 7) +
         '" width="5.4" height="14" rx="2.7" fill="' + (k === 1 ? '#B0824F' : '#C89A6B') +
         '" stroke="' + INK + '" stroke-width="1.5"/>';
  }
  return s +
    '<path d="M11 38 Q6 30 2 25 M13 37 Q10 28 9 22" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="2" cy="25" r="1.6" fill="' + INK + '"/><circle cx="9" cy="22" r="1.6" fill="' + INK + '"/>' +
    '<circle cx="11.5" cy="38.5" r="1.5" fill="#FFF"/><circle cx="11.5" cy="43.5" r="1.5" fill="#FFF"/>';
}
const ANIM_INNER = { ant: antInner, butterfly: butterflyInner, bee: beeInner, ladybird: ladybirdInner,
                     spider: spiderInner, wolfspider: wolfspiderInner, jumpspider: jumpspiderInner,
                     scorpion: scorpionInner, snail: snailInner, centipede: centipedeInner };
/* 题面动物大图（data-anim=引擎真值——契约 M 数值锚） */
const animSvg = id => '<svg data-anim="' + id + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
  '<g data-legs>' + ANIM_INNER[id]() + '</g></svg>';
/* r26 mixfind 找一找场景（舞台无主角：放大镜+叶+镜中小虫=「找一找」模式标识，
   data-anim="search" 契约 M 锚——非题面主角不承载答案；无 data-leg（非动物锚） */
const SEARCH_SVG = '<svg data-anim="search" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M14 70 Q40 60 72 66 Q80 70 74 76 L20 76 Q8 76 14 70 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
  '<circle cx="42" cy="40" r="21" fill="rgba(255,253,247,.92)" stroke="' + INK + '" stroke-width="4"/>' +
  '<circle cx="42" cy="40" r="13.5" fill="none" stroke="#E8975A" stroke-width="2.4" opacity=".8"/>' +
  '<path d="M57 55 L74 72" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>' +
  '<ellipse cx="42" cy="41" rx="4.5" ry="6" fill="#E86A6A" stroke="' + INK + '" stroke-width="1.8"/>' +
  '<circle cx="42" cy="34.5" r="2.6" fill="#5A4636"/>' +
  '<path d="M40 33 Q38 29 35 28 M44 33 Q46 29 49 28" fill="none" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round"/></svg>';

/* ---------- 候选按钮图（零文字：dch1-3 两选=dch1 昆虫/蜘蛛实物小图+legs 腿排
   图标；r26 dch4 三选=judge3/legs3 增「都不是」蜗牛小图、bodyseg 分段图标、
   mixfind 动物实物小图）。insect 图=瓢虫（昆虫代表，6 腿）/spider 图=圆蛛
   （8 步足）——与题面同构绘制（ANIM_INNER 复用，知识一致） ---------- */
function legsIcon(id, pairs) {
  let s = '';
  let k = 1;
  for (let r = 0; r < pairs; r++) {
    const y = pairs === 3 ? 30 + r * 18 : 24 + r * 15.4;
    s += legPath('M16 ' + y + ' Q28 ' + (y - 5) + ' 44 ' + y, k++, 4);
    s += legPath('M80 ' + y + ' Q68 ' + (y - 5) + ' 52 ' + y, k++, 4);
  }
  return '<svg data-pick="' + id + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
    '<g data-legs>' + s + '</g></svg>';
}
/* r26 bodyseg 候选图标：分段逐节可数（three=3 节/two=2 节/many=7 节——
   data-seg 1..n 计数知识锚，verify 对账；many=7 节「很多」表征——精确计数
   在 >5 亚点化域外，按「多」匹配） */
function segIcon(id, n) {
  let s = '';
  const h = n <= 3 ? 16 : 7.5, w = n <= 3 ? 40 : 34;
  const x = 48 - w / 2;
  const step = n <= 3 ? 23 : 11.1;
  const y0 = n === 3 ? 22 : (n === 2 ? 30 : 16);
  for (let k = 1; k <= n; k++) {
    s += '<rect data-seg="' + k + '" x="' + x + '" y="' + (y0 + (k - 1) * step) +
         '" width="' + w + '" height="' + h + '" rx="' + (h / 2) +
         '" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4"/>';
  }
  return '<svg data-pick="' + id + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
    '<g data-segs>' + s + '</g></svg>';
}
const pickSvg = (kind, id) => {
  if (kind === 'judge3' || kind === 'legs3') {          /* r26 三选盘 */
    if (id === 'six') return legsIcon('six', 3);
    if (id === 'eight') return legsIcon('eight', 4);
    if (id === 'insect' || id === 'spider') {
      const anim = id === 'insect' ? 'ladybird' : 'spider';
      return '<svg data-pick="' + id + '" data-anim="' + anim + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
        '<g data-legs>' + ANIM_INNER[anim]() + '</g></svg>';
    }
    /* none=都不是：蜗牛小图（「既非昆虫也非蛛形纲」标记，judge3/legs3 共用——
       data-leg 计数=0 知识锚） */
    return '<svg data-pick="none" data-anim="snail" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
      '<g data-legs>' + snailInner() + '</g></svg>';
  }
  if (kind === 'bodyseg')                                /* r26 分段图标 */
    return segIcon(id, id === 'three' ? 3 : (id === 'two' ? 2 : 7));
  if (kind === 'mixfind')                                /* r26 动物实物小图（10 种全档） */
    return '<svg data-pick="' + id + '" data-anim="' + id + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
      '<g data-legs>' + ANIM_INNER[id]() + '</g></svg>';
  if (kind === 'judge') {                                /* dch1-3 两选（基线原样） */
    const anim = id === 'insect' ? 'ladybird' : 'spider';
    return '<svg data-pick="' + id + '" data-anim="' + anim + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
      '<g data-legs>' + ANIM_INNER[anim]() + '</g></svg>';
  }
  return id === 'six' ? legsIcon('six', 3) : legsIcon('eight', 4);
};

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌+叶上瓢虫（辨虫主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M8 32 Q22 24 36 30 Q22 38 8 32 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="22" cy="20" r="9" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M22 11.5 v17" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="17.5" cy="16.5" r="1.8" fill="' + INK + '"/><circle cx="26.5" cy="23" r="1.8" fill="' + INK + '"/>' +
    '<circle cx="22" cy="10" r="3" fill="#5A4636" stroke="' + INK + '" stroke-width="1.8"/></svg>',
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
