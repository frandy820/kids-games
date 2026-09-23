/* ================= crd 贺卡工坊 游戏数据（r12 难度改造版：20 题封闭题表 / 元素 SVG /
   章配置 / 语音文案 / 时长模型）
   r12 改造（2026-09-15，AUDIT-56 #39 红款——v1「8 条映射背一遍全对零失误」根治）：
   判定锚从「主题静态映射」改为「题级 SPEC_TABLE 表驱动」三 delta——
   ① 偏好线索推理（kind like：题面给收卡人偏好线索「奶奶喜欢云朵和花」→
     按偏好选元素而非主题直配；WHO_LIKE 偏好表封闭 2 人；含负面偏好排除
     「朋友怕吵→别选喇叭 horn」）；
   ② 元素冲突排除（kind clash：冲突项与主题项同屏——新年卡候选含圣诞树 tree
     /生日卡含白菊花 mum，须按「这个节日不用它」推理排除；CONFLICT_EL 封闭）；
   ③ 祝福语语用适配（kind wish：同收卡人不同场合选不同祝福语——奶奶过生日祝
     生日快乐 wbd/奶奶生病住院祝早日康复 wkang，语用匹配而非任意祝福都对）；
   ④ 综合（kind mix：每步一型混合）。场合池扩 5（+sick 探病）。
   反启发式翻转锚（verify ⑬ 独立推导对账）：cake 题0 干扰/题7 正解；
   bear 题2 干扰/题1 正解；wbd 题10 正解/题11 干扰（同收卡人 grandma 跨场合
   ——delta③ 实锤）；tree/mum/horn 全表恒非正解；flower 跨场合恒为 grandma
   偏好正解（恒定性）。歧义防线：h=theme 步候选集 ∩ WHO_LIKE[who] 两元素=∅
   （收卡人偏好元素不进场合直配步候选——防「按偏好选」与「按场合选」双真值）。
   玩法主体承 v1：每题=做一张完整贺卡（nstage 连选：两步 bg+st/三步 +wish），
   候选 3 枚、元素落位永久留存、卡完成定格+送出演出、贺卡集；题面=线索句
   keyless TTS（say 非队列链——SPEC §1 契约 N 不适用）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（SPEC-BATCH39 §4 实长表；r12 增 3 键实长 2026-09-15 实测）
   crd_tut_watch 2928 / crd_tut_turn 1728 / crd_hint 2592 / crd_right 2016 /
   crd_wrong 1968 / crd_hint_like 2208 / crd_hint_no 2136 / crd_hint_wish 2256。
   确认链窗 CARD_WIN=2316（=2016+300 精确）；错链豁免窗按步型 h 分流四值
   CHAIN_WIN（=wrong 1968+150+hintX+300 真时钟，家族 I）；首错演出锁 SHAKE_MS=1100
   （b39 定版总窗口径：1100×SPEED+140=1240 ≤ wrong 1968+150——禁覆盖豁免窗，
   留对选放行活跃段）；线索句窗=estMs(句长)+300（家族 T 动态，题表句 10-15 字）。 ---------- */
const ENTER_MS = 400;                        // 新卡出场动画窗（与线索句 say 并行）
const STAGE_MS = 400;                        // 题内步推进换盘窗（卡不重出场）
const CARD_WIN = 2316;                       // 选对演出窗 = crd_right 2016+300（精确）
const SHAKE_MS = 1100;                       // 选错虚影抖动锁窗（总窗 1240 ≤ 2118）
const CHAIN_WIN = { like: 4626, clash: 4554, wish: 4674, theme: 5010 };
                                             /* 错链豁免窗（真时钟，家族 I）——按步型 h：
                                                like=1968+150+2208+300 / clash=1968+150+2136+300
                                                / wish=1968+150+2256+300 / theme=1968+150+2592+300 */
const FINISH_HOLD = 700;                     // 卡完成成品定格一拍
const FINISH_FLY = 600;                      // 送出演出：贺卡飞向收卡人
const TUT_WATCH_WAIT = 3300;                 // ≥crd_tut_watch 2928+300=3228
const TUT_TURN_WAIT = 2100;                  // ≥crd_tut_turn 1728+300=2028
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- r12 时长模型（门禁硬断言；认知步主体非演出窗——AUDIT-56 根因③对策）
   每步 dur = max(voiceWin, DECIDE_MS[kind]) + CARD_WIN（判对推进窗 ADV）；
   voiceWin：首步=ENTER 400+estMs(say)+300 / 后续步=STAGE_MS 400；
   DECIDE_MS（5-6 岁认知决策推算）：like 10000（线索提取 3000+候选偏好适配评估
   3×2000+确认 1000）/ clash 9000（节日归属逐候选判断 3×2500+确认 1500）/
   wish 9000（场合→祝福语映射推理）/ mix 11000（混合步型负荷上浮）；
   末题卡不送出（v1 §5.0 ⑤ 惯例）——末题不计 FINISH 尾。
   验算（voiceWin 恒 ≤ DECIDE：最长句 15 字 6475<9000——语音窗从不撑时长）：
   like 关 5×(2×12316+1300)-1300=128260 / clash 关 5×(2×11316+1300)-1300=118360
   / wish 关 5×(3×11316+1300)-1300=174940 / mix 关 5×(3×13316+1300)-1300=204940
   ——全部 ≥ LEVEL_MIN_MS 40000（r12 门禁，verify ⑭ 独立副本复算）。 ---------- */
const DECIDE_MS = { like: 10000, clash: 9000, wish: 9000, mix: 11000 };
const ADV_MS = CARD_WIN;                     // 判对推进窗=选对演出窗（2316）
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r12 门禁，5-6 岁口径）
const stepVoiceMs = (q, k) => k === 0 ? (ENTER_MS + estMs(q.say) + 300) : STAGE_MS;
const quizDurMs = q => q.stages.reduce(
  (s, st, k) => s + Math.max(stepVoiceMs(q, k), DECIDE_MS[q.kind]) + ADV_MS, 0) +
  FINISH_HOLD + FINISH_FLY;
const levelDurMs = L => L.quizzes.reduce(
  (s, q, i) => s + quizDurMs(q) - (i === L.quizzes.length - 1 ? FINISH_HOLD + FINISH_FLY : 0), 0);

/* ---------- 章配置（r12：ch1 偏好/ch2 冲突（两步）/ch3 语用/ch4 综合（三步）——
   认知坡度；进度章号单调递增、难度章号 dch=1+flat//5 静态四档；生成关 flat≥20
   dch=ri(rnd,1,4) seeded）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '喜欢的贺卡',   hint: '节日贺卡来啦，想想这个节日用不用' },
  2: { name: '节日贺卡',     hint: '要做三步的贺卡啦，祝福语也要选对' },
  3: { name: '祝福贺卡',     hint: '综合贺卡来啦，样样都要想一想' },
  4: { name: '综合贺卡',     hint: '新的贺卡做不完，动动脑筋继续做' }
};
const GEN_HINTS = ['听听他喜欢什么，做张贺卡',        // dch1 两步·偏好池（题 0-4）
                   '节日贺卡，这个节日不用它',        // dch2 两步·冲突池（题 5-9）
                   '祝福语也要选，想想现在什么事',    // dch3 三步·语用池（题 10-14）
                   '综合贺卡，样样都要想一想'];       // dch4 三步·综合池（题 15-19）
const CH_LEN = 5;          // 5 题 = 1 关（每题一卡=每关 5 张卡）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=crd_
   8 键=既有 5+r12 新 3（已核 manifest 无占用 2026-09-15）；r12 错链方向提示
   按步型 h 分流——like/clash/wish/theme 四链 ---------- */
const VOICE = {
  watch:     { key: 'crd_tut_watch',  text: '看！做一张贺卡' },
  turn:      { key: 'crd_tut_turn',   text: '你也做一张' },
  hint:      { key: 'crd_hint',       text: '想想这是给谁的' },      // theme 步（场合直配）
  hintLike:  { key: 'crd_hint_like',  text: '想想他喜欢什么' },      // like 步（偏好推理）
  hintNo:    { key: 'crd_hint_no',    text: '这个节日不用它' },      // clash 步（冲突排除）
  hintWish:  { key: 'crd_hint_wish',  text: '想想现在什么事' },      // wish 步（语用适配）
  right:     { key: 'crd_right',      text: '贺卡真好看' },
  wrong:     { key: 'crd_wrong',      text: '再想想主题哦' }
};
/* 错链尾段按步型 h 取（main sayW 用——链=[crd_wrong, hintOf[h)]） */
const HINT_OF = { like: 'hintLike', clash: 'hintNo', wish: 'hintWish', theme: 'hint' };
const Q_TEXT = '听一听想一想，选对每一样';    // 纯文字装饰句（不播——题面真值=线索句 TTS）

/* ---------- 场合默认表 / 收卡人偏好表 / 冲突元素表（r12 三封闭集——verify 独立对账）
   OCC_EL：场合→各列默认元素（birthday/newyear/thanks/sorry 承 v1 主题映射，
   sick=r12 新增探病场合：爱心纹+爱心贴纸+早日康复）；
   WHO_LIKE：收卡人偏好（grandma 云朵+花 / monkey 爱心+抱抱熊——非全局互斥：
   monkey 爱心=thanks 默认纹/抱抱熊=sorry 默认贴纸（M2 收窄口径）；判别力在
   like 步 per 题：偏好≠本题场合默认→「按偏好选」≠「按场合直配」核心推理）；
   CONFLICT_EL：场合→冲突排除项（新年不用圣诞树/生日不用白菊花——与主题项
   同屏出现，恒非正解）。 ---------- */
const OCC_EL = { birthday: { bg: 'flags',  st: 'cake',   wish: 'wbd' },
                 newyear:  { bg: 'lant',   st: 'lant2',  wish: 'wny' },
                 thanks:   { bg: 'hearts', st: 'heart',  wish: 'wth' },
                 sorry:    { bg: 'clouds', st: 'bear',   wish: 'wsr' },
                 sick:     { bg: 'hearts', st: 'heart',  wish: 'wkang' } };
const WHO_LIKE = { grandma: { bg: 'clouds', st: 'flower' },
                   monkey:  { bg: 'hearts', st: 'bear' } };
const CONFLICT_EL = { newyear: 'tree', birthday: 'mum' };   // 冲突项只在对应场合 clash 步出现

/* ---------- 元素名（aria/贺卡集用；wish=祝福语图卡语义名——图卡无文字） ---------- */
const EL_NAME = {
  flags: '彩旗纹', lant: '灯笼纹', hearts: '爱心纹', clouds: '云朵纹',
  cake: '蛋糕', lant2: '灯笼', heart: '爱心', bear: '抱抱熊',
  flower: '花朵', horn: '喇叭', tree: '圣诞树', mum: '白菊花',
  wbd: '生日快乐', wny: '新年好', wth: '谢谢你', wsr: '对不起', wkang: '早日康复'
};
/* 场景色（贺卡集缩略底色，按场合） */
const THEME_TINT = { birthday: '#FBE3D5', newyear: '#F6D9C8', thanks: '#F9DCE2',
                     sorry: '#E7ECF4', sick: '#DFF0E4' };
/* 收卡人名（题面/aria 语境用） */
const WHO_NAME = { grandma: '奶奶', monkey: '小猴', teacher: '老师', friend: '朋友' };

/* ---------- 爱心路径（参数化：stamp 家族心形 80×80 基准缩放） ---------- */
const heartD = (x, y, s) =>
  'M' + x + ' ' + (y + 22 * s) +
  ' C' + (x - 22 * s) + ' ' + (y + 6 * s) + ' ' + (x - 24 * s) + ' ' + (y - 10 * s) + ' ' + (x - 14 * s) + ' ' + (y - 17 * s) +
  ' C' + (x - 7 * s) + ' ' + (y - 22 * s) + ' ' + x + ' ' + (y - 17 * s) + ' ' + x + ' ' + (y - 10 * s) +
  ' C' + x + ' ' + (y - 17 * s) + ' ' + (x + 7 * s) + ' ' + (y - 22 * s) + ' ' + (x + 14 * s) + ' ' + (y - 17 * s) +
  ' C' + (x + 24 * s) + ' ' + (y - 10 * s) + ' ' + (x + 22 * s) + ' ' + (y + 6 * s) + ' ' + x + ' ' + (y + 22 * s) + ' Z';

/* ---------- bg 底纹：80×80 纹样 tile（patternUnits=userSpaceOnUse） ---------- */
function bgTileInner(id) {
  if (id === 'flags')    // 彩旗纹：彩绳+双色三角旗
    return '<path d="M0 12 Q20 20 40 12 T80 12" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="40" cy="14.5" r="2.4" fill="' + INK + '"/>' +
      '<path d="M9 16 L35 16 L22 46 Z" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M45 16 L71 16 L58 46 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<circle cx="24" cy="62" r="3.4" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="58" cy="68" r="2.6" fill="#7FA8D9" stroke="' + INK + '" stroke-width="1.6"/>';
  if (id === 'lant')     // 灯笼纹：小灯笼+星光点
    return '<path d="M40 6 v7" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<rect x="31" y="13" width="18" height="6" rx="2.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<ellipse cx="40" cy="40" rx="18" ry="20" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M40 20 v40 M26 32 q14 -7 28 0 M26 52 q14 7 28 0" stroke="rgba(255,255,255,.55)" stroke-width="2.2" fill="none"/>' +
      '<rect x="32" y="60" width="16" height="5.5" rx="2.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<path d="M40 65.5 v7" stroke="#D8862B" stroke-width="2.4"/>' +
      '<path d="M10 66 l1.4 3.6 L15 71 l-3.6 1.4 L10 76 l-1.4 -3.6 L5 71 l3.6 -1.4 Z" fill="#F5C542"/>' +
      '<circle cx="70" cy="14" r="3" fill="#F5C542"/>';
  if (id === 'hearts')   // 爱心纹：双色爱心+小心点
    return '<path d="' + heartD(30, 28, 0.62) + '" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="' + heartD(62, 62, 0.44) + '" fill="#E86A6A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
      '<circle cx="66" cy="22" r="3" fill="#F5C542"/>' +
      '<circle cx="16" cy="66" r="2.4" fill="#7FA8D9"/>';
  /* clouds 云朵纹：软云+微光点 */
  return '<path d="M14 44 a9 9 0 0 1 3 -17 a12 12 0 0 1 23 -5 a10 10 0 0 1 17 8 a8 8 0 0 1 -3 14 Z" ' +
    'fill="#CFE3F0" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<g transform="translate(40,40) scale(.55)">' +
    '<path d="M14 44 a9 9 0 0 1 3 -17 a12 12 0 0 1 23 -5 a10 10 0 0 1 17 8 a8 8 0 0 1 -3 14 Z" ' +
    'fill="#DFEDF7" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/></g>' +
    '<circle cx="72" cy="14" r="2.6" fill="#F5C542"/>' +
    '<circle cx="10" cy="70" r="2" fill="#F2A0B5"/>';
}

/* ---------- st 贴纸：96×96 单体大贴纸（r12 扩 4 枚：flower/horn/tree/mum） ---------- */
function stInner(id) {
  if (id === 'cake')     // 蛋糕：双层+蜡烛+火焰+餐盘
    return '<ellipse cx="48" cy="85" rx="33" ry="6.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="20" y="52" width="56" height="31" rx="8" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<rect x="27" y="29" width="42" height="25" rx="7" fill="#FDF3E3" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<path d="M27 41 q5.25 6 10.5 0 q5.25 6 10.5 0 q5.25 6 10.5 0 q5.25 6 10.5 0" fill="none" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="48" cy="35" r="3.2" fill="#E86A6A" stroke="' + INK + '" stroke-width="1.6"/>' +
      '<rect x="45" y="13" width="6" height="16" rx="2" fill="#7FA8D9" stroke="' + INK + '" stroke-width="2"/>' +
      '<ellipse cx="48" cy="8" rx="3.4" ry="5" fill="#F5C542" stroke="#D8862B" stroke-width="1.6"/>' +
      '<path d="M31 70 q4 5 8 0 M57 70 q4 5 8 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>';
  if (id === 'lant2')    // 灯笼：吊绳+灯身+灯骨+流苏
    return '<path d="M48 4 v10" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<rect x="37" y="14" width="22" height="7" rx="3" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<ellipse cx="48" cy="46" rx="24" ry="26" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.8"/>' +
      '<path d="M48 20 v52 M31 30 q17 -6 34 0 M31 62 q17 6 34 0" stroke="rgba(255,255,255,.55)" stroke-width="2.4" fill="none"/>' +
      '<rect x="39" y="70" width="18" height="6" rx="3" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M48 76 v10" stroke="#D8862B" stroke-width="2.6"/>' +
      '<circle cx="48" cy="89" r="2.6" fill="#F5C542" stroke="' + INK + '" stroke-width="1.6"/>';
  if (id === 'heart')    // 爱心：大心+高光
    return '<path d="' + heartD(48, 46, 1.36) + '" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
      '<path d="M36 33 q-6 4 -6.5 11" stroke="#FFF" stroke-width="3.4" fill="none" opacity=".75" stroke-linecap="round"/>' +
      '<circle cx="66" cy="24" r="3.4" fill="#F5C542"/>' +
      '<circle cx="26" cy="72" r="2.6" fill="#F5C542"/>';
  if (id === 'bear')     // 抱抱熊：耳+头+吻+抱爱心
    return '<circle cx="25" cy="21" r="9.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="71" cy="21" r="9.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="25" cy="21" r="4.2" fill="#F2B8C6"/>' +
      '<circle cx="71" cy="21" r="4.2" fill="#F2B8C6"/>' +
      '<ellipse cx="48" cy="77" rx="25" ry="17.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<ellipse cx="48" cy="79" rx="13.5" ry="10.5" fill="#FBF0DC"/>' +
      '<circle cx="48" cy="35" r="22" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<ellipse cx="48" cy="42" rx="10.5" ry="7.5" fill="#FBF0DC" stroke="' + INK + '" stroke-width="2"/>' +
      '<ellipse cx="48" cy="39.5" rx="3.6" ry="2.8" fill="' + INK + '"/>' +
      '<circle cx="39" cy="31" r="3" fill="' + INK + '"/><circle cx="57" cy="31" r="3" fill="' + INK + '"/>' +
      '<path d="M44 46 q4 3.6 8 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<path d="' + heartD(48, 70, 0.5) + '" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>';
  if (id === 'flower')   // 花朵（r12 偏好正解·grandma）：五瓣+花心+茎叶
    return '<path d="M48 62 v26" stroke="#7FA86B" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
      '<path d="M48 74 q-14 -2 -16 -12 q12 -2 16 12 Z" fill="#9CBF8A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M48 80 q14 -2 16 -12 q-12 -2 -16 12 Z" fill="#9CBF8A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<circle cx="48" cy="26" r="11" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="30" cy="36" r="11" fill="#E88BA6" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="66" cy="36" r="11" fill="#E88BA6" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="37" cy="54" r="11" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="59" cy="54" r="11" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="48" cy="42" r="8.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="45.6" cy="39.6" r="2.2" fill="#FFF9EE" opacity=".9"/>';
  if (id === 'horn')     // 喇叭（r12 负面偏好排除项·怕吵）：号身+喇叭口+音符
    return '<path d="M18 40 q10 -12 26 -14" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<rect x="14" y="34" width="12" height="12" rx="3" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-20 20 40)"/>' +
      '<path d="M42 22 L74 34 L74 54 L42 44 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<ellipse cx="75" cy="44" rx="5" ry="11" fill="#E86A6A" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<path d="M30 60 q3 8 -5 10 M40 64 q3 8 -5 10" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
      '<circle cx="24" cy="71" r="3.2" fill="' + INK + '"/><circle cx="34" cy="75" r="3.2" fill="' + INK + '"/>' +
      '<path d="M58 16 l1.4 3.6 L63 21 l-3.6 1.4 L58 26 l-1.4 -3.6 L53 21 l3.6 -1.4 Z" fill="#F5C542"/>';
  if (id === 'tree')     // 圣诞树（r12 冲突排除项·新年不用）：三层塔+树干+星+彩球
    return '<path d="M48 12 l1.6 4.2 L54 18 l-4.4 1.6 L48 24 l-1.6 -4.4 L42 18 l4.4 -1.6 Z" fill="#F5C542" stroke="#D8862B" stroke-width="1.4"/>' +
      '<path d="M48 22 L66 46 L30 46 Z" fill="#6FA37A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M48 36 L72 62 L24 62 Z" fill="#5E9670" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<path d="M48 52 L78 80 L18 80 Z" fill="#4E8563" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
      '<rect x="43" y="80" width="10" height="9" rx="2" fill="#8A6242" stroke="' + INK + '" stroke-width="2.2"/>' +
      '<circle cx="40" cy="42" r="3" fill="#E86A6A" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<circle cx="58" cy="56" r="3" fill="#F5C542" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<circle cx="34" cy="70" r="3" fill="#7FA8D9" stroke="' + INK + '" stroke-width="1.4"/>' +
      '<circle cx="62" cy="72" r="3" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.4"/>';
  /* mum 白菊花（r12 冲突排除项·生日不用）：白瓣环+黄心+茎叶 */
  return '<path d="M48 60 v26" stroke="#7FA86B" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M48 76 q-13 -2 -15 -11 q11 -2 15 11 Z" fill="#9CBF8A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<g>' +
    '<ellipse cx="48" cy="20" rx="6" ry="12" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<ellipse cx="30" cy="28" rx="11" ry="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2" transform="rotate(-30 30 28)"/>' +
    '<ellipse cx="66" cy="28" rx="11" ry="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2" transform="rotate(30 66 28)"/>' +
    '<ellipse cx="26" cy="46" rx="12" ry="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2" transform="rotate(-62 26 46)"/>' +
    '<ellipse cx="70" cy="46" rx="12" ry="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2" transform="rotate(62 70 46)"/>' +
    '<ellipse cx="34" cy="60" rx="11" ry="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2" transform="rotate(-84 34 60)"/>' +
    '<ellipse cx="62" cy="60" rx="11" ry="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2" transform="rotate(84 62 60)"/>' +
    '<ellipse cx="48" cy="62" rx="6" ry="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '</g>' +
    '<circle cx="48" cy="41" r="9.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="45" cy="38" r="2.4" fill="#FFF9EE" opacity=".9"/>';
}
const stSvg = id => '<svg data-el="' + id + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
  '<g data-anim="st">' + stInner(id) + '</g></svg>';

/* ---------- wish 祝福语图卡：对话气泡+主题徽记+星光（图卡无文字——
   语义承载在徽记+线索句 TTS 双通道，零文字依赖） ---------- */
const WISH_MINI = { wbd: 'cake', wny: 'lant2', wth: 'heart', wsr: 'bear', wkang: 'flower' };
function wishInner(id) {
  return '<path d="M24 12 h48 a14 14 0 0 1 14 14 v22 a14 14 0 0 1 -14 14 h-26 l-14 13 v-13 h-8 a14 14 0 0 1 -14 -14 v-22 a14 14 0 0 1 14 -14 z" ' +
    'fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<g transform="translate(26.4,16) scale(0.45)">' + stInner(WISH_MINI[id]) + '</g>' +
    '<path d="M79 16 l1.6 4.2 L85 21.8 l-4.4 1.6 L79 27.6 l-1.6 -4.2 L73 21.8 l4.4 -1.6 Z" fill="#F5C542"/>' +
    '<circle cx="16" cy="20" r="2.2" fill="#F2A0B5"/>' +
    '<circle cx="80" cy="56" r="2.4" fill="#7FA8D9"/>';
}
const wishSvg = id => '<svg data-el="' + id + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
  '<g data-anim="wish">' + wishInner(id) + '</g></svg>';

/* ---------- bg 候选 swatch（96×96 圆角纹样卡）与贺卡底纹层（240×320 全卡）
   pattern id 全局唯一（patUid 自增——同元素多实例共存不撞 id） ---------- */
let patUid = 0;
function bgCard(id) {
  const pid = 'bp-' + id + '-' + (++patUid);
  return '<svg data-el="' + id + '" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><pattern id="' + pid + '" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="scale(0.6)">' +
    bgTileInner(id) + '</pattern></defs>' +
    '<g data-anim="bg"><rect x="6" y="6" width="84" height="84" rx="14" fill="url(#' + pid + ')" ' +
    'stroke="' + INK + '" stroke-width="3"/><rect x="6" y="6" width="84" height="84" rx="14" fill="none" ' +
    'stroke="' + INK + '" stroke-width="3"/></g></svg>';
}
function bgCardLayer(id) {
  const pid = 'bp-' + id + '-' + (++patUid);
  return '<svg data-el="' + id + '" viewBox="0 0 240 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">' +
    '<defs><pattern id="' + pid + '" width="80" height="80" patternUnits="userSpaceOnUse">' +
    bgTileInner(id) + '</pattern></defs>' +
    '<g data-anim="bg"><rect x="0" y="0" width="240" height="320" fill="url(#' + pid + ')" opacity=".5"/></g></svg>';
}
/* 候选盘/落位按列取图（bg=纹样卡 st=贴纸 wish=祝福语图卡） */
const pickSvg = (col, id) => col === 'bg' ? bgCard(id) : (col === 'st' ? stSvg(id) : wishSvg(id));
/* 贺卡落位层按列取图（bg=全卡底纹 st/wish 同候选图） */
const cardLayerSvg = (col, id) => col === 'bg' ? bgCardLayer(id) : pickSvg(col, id);

/* ---------- r12 20 题封闭题表 SPEC_TABLE（每题一卡 flat/scene 0-19——verify 独立
   重列同构对账+python _verify 表验算，禁调引擎）：
   行={kind('like'|'clash'|'wish'|'mix'), occ(场合), who(收卡人), nstage, say(线索句),
       steps[]=[col, correct, 干扰1, 干扰2, h(步型)}——correct 唯一契合（三元组互异
   表驱动保证）；h=错链方向提示分流键（like/clash/wish/theme）。
   章-题型域：ch1（0-4）like 两步 / ch2（5-9）clash 两步 / ch3（10-14）wish 三步 /
   ch4（15-19）mix 三步——dch≤2 池 0-9 / dch≥3 池 10-19（域守恒承 v1）。
   翻转锚（防启发式背答案）：cake 0 干扰/7 正解；bear 2 干扰/1 正解；
   wbd 10 正解/11 干扰（grandma 同收卡人跨场合=delta③ 实锤）；
   tree/mum/horn 恒非正解；flower 恒 grandma 偏好正解（0/2/15）。
   歧义防线（M2 收窄口径）：h=theme 步干扰项 ∩ WHO_LIKE[who]={∅}（grandma 题干扰
   无 clouds/flower、monkey 题干扰无 hearts/bear——防偏好/场合双真值；正解例外：
   行 13/17 sick×monkey 正解 hearts ∈ WHO_LIKE.monkey=双理由一致，唯一解保持，
   SPEC §M2 登记）。 ---------- */
const SPEC_TABLE = [
  /* ch1 偏好线索·两步（题 0-4：收卡人偏好→元素；正面偏好 WHO_LIKE 锚定+负面偏好排除） */
  { kind: 'like', occ: 'birthday', who: 'grandma', nstage: 2, say: '奶奶喜欢云朵和花，做张生日贺卡',
    steps: [['bg', 'clouds', 'flags', 'lant', 'like'],
            ['st', 'flower', 'cake', 'heart', 'like']] },          // ① flags/cake=生日默认反直配干扰
  { kind: 'like', occ: 'newyear', who: 'monkey', nstage: 2, say: '小猴喜欢爱心和熊，做张新年贺卡',
    steps: [['bg', 'hearts', 'lant', 'flags', 'like'],
            ['st', 'bear', 'lant2', 'heart', 'like']] },           // ② lant/lant2=新年默认反直配干扰
  { kind: 'like', occ: 'newyear', who: 'grandma', nstage: 2, say: '奶奶喜欢云朵和花，做张新年贺卡',
    steps: [['bg', 'clouds', 'lant', 'hearts', 'like'],
            ['st', 'flower', 'lant2', 'bear', 'like']] },          // ③ 同收卡人跨场合偏好恒定
  { kind: 'like', occ: 'birthday', who: 'monkey', nstage: 2, say: '小猴喜欢爱心和熊，做张生日贺卡',
    steps: [['bg', 'hearts', 'flags', 'lant', 'like'],
            ['st', 'bear', 'cake', 'heart', 'like']] },            // ④ flags/cake=生日默认反直配干扰
  { kind: 'like', occ: 'birthday', who: 'friend', nstage: 2, say: '朋友怕吵闹，做张生日贺卡',
    steps: [['bg', 'flags', 'clouds', 'hearts', 'theme'],
            ['st', 'cake', 'horn', 'heart', 'like']] },            // ⑤ 负面偏好：怕吵→排除喇叭 horn
  /* ch2 冲突排除·两步（题 5-9：冲突项与主题项同屏——新年不用圣诞树/生日不用白菊花） */
  { kind: 'clash', occ: 'newyear', who: 'friend', nstage: 2, say: '过新年啦，做张新年贺卡',
    steps: [['bg', 'lant', 'flags', 'hearts', 'theme'],
            ['st', 'lant2', 'tree', 'cake', 'clash']] },           // ⑥ tree 与 lant2 同屏
  { kind: 'clash', occ: 'newyear', who: 'friend', nstage: 2, say: '新年到，做张新年贺卡',
    steps: [['bg', 'lant', 'hearts', 'clouds', 'theme'],
            ['st', 'lant2', 'tree', 'heart', 'clash']] },          // ⑦
  { kind: 'clash', occ: 'birthday', who: 'friend', nstage: 2, say: '生日到，做张生日贺卡',
    steps: [['bg', 'flags', 'lant', 'clouds', 'theme'],
            ['st', 'cake', 'mum', 'lant2', 'clash']] },            // ⑧ mum 与 cake 同屏
  { kind: 'clash', occ: 'birthday', who: 'friend', nstage: 2, say: '好朋友过生日，做张贺卡',
    steps: [['bg', 'flags', 'hearts', 'clouds', 'theme'],
            ['st', 'cake', 'mum', 'bear', 'clash']] },             // ⑨
  { kind: 'clash', occ: 'newyear', who: 'friend', nstage: 2, say: '过年啦，做张过年的贺卡',
    steps: [['bg', 'lant', 'clouds', 'flags', 'theme'],
            ['st', 'lant2', 'tree', 'bear', 'clash']] },           // ⑩
  /* ch3 语用适配·三步（题 10-14：同收卡人不同场合不同祝福语——生日 vs 生病 vs 感谢） */
  { kind: 'wish', occ: 'birthday', who: 'grandma', nstage: 3, say: '奶奶过生日，做张生日贺卡',
    steps: [['bg', 'flags', 'lant', 'hearts', 'theme'],
            ['st', 'cake', 'heart', 'bear', 'theme'],
            ['wish', 'wbd', 'wny', 'wth', 'wish']] },              // ⑪ 基准：wbd 正解（grandma 偏好已排除歧义）
  { kind: 'wish', occ: 'sick', who: 'grandma', nstage: 3, say: '奶奶生病住院了，做张贺卡',
    steps: [['bg', 'hearts', 'flags', 'lant', 'theme'],
            ['st', 'heart', 'cake', 'lant2', 'theme'],
            ['wish', 'wkang', 'wbd', 'wth', 'wish']] },            // ⑫ wbd 翻转为干扰（同收卡人生病）——delta③ 实锤
  { kind: 'wish', occ: 'thanks', who: 'teacher', nstage: 3, say: '老师帮我捡画，做张感谢贺卡',
    steps: [['bg', 'hearts', 'flags', 'clouds', 'theme'],
            ['st', 'heart', 'cake', 'lant2', 'theme'],
            ['wish', 'wth', 'wbd', 'wsr', 'wish']] },              // ⑬
  { kind: 'wish', occ: 'sick', who: 'monkey', nstage: 3, say: '小猴生病了，做张贺卡送他',
    steps: [['bg', 'hearts', 'clouds', 'lant', 'theme'],
            ['st', 'heart', 'cake', 'lant2', 'theme'],
            ['wish', 'wkang', 'wny', 'wbd', 'wish']] },            // ⑭ 同收卡人 monkey 跨场合（vs ②④）
  { kind: 'wish', occ: 'newyear', who: 'grandma', nstage: 3, say: '新年到，给奶奶做张贺卡',
    steps: [['bg', 'lant', 'flags', 'hearts', 'theme'],
            ['st', 'lant2', 'heart', 'bear', 'theme'],
            ['wish', 'wny', 'wbd', 'wkang', 'wish']] },            // ⑮ grandma 第三场合（新年；候选排 grandma 偏好 clouds/flower 防歧义）
  /* ch4 综合·三步（题 15-19：偏好+冲突+语用混合——每步一型） */
  { kind: 'mix', occ: 'birthday', who: 'grandma', nstage: 3, say: '奶奶喜欢云朵和花，做生日贺卡',
    steps: [['bg', 'clouds', 'flags', 'lant', 'like'],
            ['st', 'flower', 'cake', 'heart', 'like'],
            ['wish', 'wbd', 'wkang', 'wth', 'wish']] },            // ⑯ 偏好×2+语用
  { kind: 'mix', occ: 'newyear', who: 'friend', nstage: 3, say: '过新年，做张新年贺卡',
    steps: [['bg', 'lant', 'flags', 'hearts', 'theme'],
            ['st', 'lant2', 'tree', 'cake', 'clash'],
            ['wish', 'wny', 'wbd', 'wkang', 'wish']] },            // ⑰ 直配+冲突+语用
  { kind: 'mix', occ: 'sick', who: 'monkey', nstage: 3, say: '小猴生病了，他喜欢抱抱熊',
    steps: [['bg', 'hearts', 'clouds', 'lant', 'theme'],
            ['st', 'bear', 'heart', 'cake', 'like'],
            ['wish', 'wkang', 'wny', 'wth', 'wish']] },            // ⑱ 直配+偏好+语用（线索句单点偏好锚）
  { kind: 'mix', occ: 'birthday', who: 'friend', nstage: 3, say: '生日派对，做张生日贺卡',
    steps: [['bg', 'flags', 'lant', 'clouds', 'theme'],
            ['st', 'cake', 'mum', 'heart', 'clash'],
            ['wish', 'wbd', 'wny', 'wsr', 'wish']] },              // ⑲ 直配+冲突+语用
  { kind: 'mix', occ: 'newyear', who: 'monkey', nstage: 3, say: '小猴喜欢爱心和熊，过新年',
    steps: [['bg', 'hearts', 'lant', 'flags', 'like'],
            ['st', 'bear', 'lant2', 'heart', 'like'],
            ['wish', 'wny', 'wbd', 'wkang', 'wish']] }             // ⑳ 偏好×2+语用
];
/* 题库行派生字段（scene 索引+say 双录锚由 buildQuiz 挂） */
SPEC_TABLE.forEach((r, i) => { r.scene = i; });
/* 列元素封闭池（structWhy 候选域校验——st 扩 8 枚/wish 扩 5 枚/bg 4 枚） */
const COLUMN_EL = { bg: ['flags', 'lant', 'hearts', 'clouds'],
                    st: ['cake', 'lant2', 'heart', 'bear', 'flower', 'horn', 'tree', 'mum'],
                    wish: ['wbd', 'wny', 'wth', 'wsr', 'wkang'] };
/* 题内步序列：两步卡=bg+st / 三步卡=+wish（承 v1） */
const COLS = nstage => nstage === 3 ? ['bg', 'st', 'wish'] : ['bg', 'st'];

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 贺卡+爱心（做贺卡主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="10" y="13" width="24" height="17" rx="4" fill="#FDF3E3" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M10 19 l12 6 l12 -6" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linejoin="round"/>' +
    '<path d="' + heartD(34, 15, 0.26) + '" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M18 38 l1.2 3 L22 42.2 l-2.8 1.2 L18 46 l-1.2 -3 L14 42.2 l2.8 -1 Z" fill="#F5C542" transform="translate(2,-6) scale(.9)"/></svg>',
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
