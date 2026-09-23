/* ================= storybed 晚安故事序 游戏数据（流程封闭 6 / 依赖表 / 条件步 / 认知模型 / 章配置 / 语音 / 小图 SVG）
   玩法 v2（r10 难度改造，SPEC-BATCH30 §6——审计红#29「背流程 3 岁已会」）：
   ①可换序多解（order 型）：判「合理序」非唯一序——依赖图 DEPS 判定，无先后约束的两步
     互可换（先刷牙先洗脸均可），有约束的必须遵守（洗手必须先于吃饭饭）——从背流程升到约束推理；
   ②条件分支（rain 型）：条件卡「明天下雨」改变流程——出门流程插入「带小伞」步骤（5 步依赖排序）；
   ③缺步补卡（miss 型）：流程链缺一步，从 4 候选卡补对（找缺+补对双步认知）。
   题面（order）= 流程小图+流程名大字+「先做什么呀」（stb_q）；rain 题面加条件徽章（stb_q_rain）；
   miss 题面=已排链+缺口槽（stb_q_miss）。点当前合法步骤 → 卡飞入顺序条亮起（槽序=点选次序）
   →「然后呢」逐点至全部完成（末步 'right'，末题 'done'）；点非法步骤（前置未完成/已点/干扰/
   缺步题错卡）=wrong+miss+wig。步骤序=客观生活常识（流程表以 SPEC §0.74 为源正则对账禁手抄；
   依赖表/条件步/认知模型以 SPEC §6 r10 块为源，build.py 正则对账禁手抄）。
   同词不同流程是复习锚非缺陷（sleep_0 刷牙 / getup_2 刷牙同文本异 stepId，小图共用）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）
const ORANGE = '#E8975A', YELL = '#F5C445', BLUE = '#A8CBEA', GREEN = '#B8DBA0',
      PINK = '#F2B8C6', CREAM = '#F6EAD4', WHITE = '#FFF9EE', BROWN = '#C89A6B';

/* ---------- 章配置 v2（r10；章号 1 基；dch=难度章号 (ch-1)%4+1 循环取材）
   ch1 可换序多解（order：4 步依赖图判定——半数流程含可换对，半数全序，逐题判断）
   / ch2 order+1 干扰卡 / ch3 条件分支（flat10q0 恒 rain=确定性锚点；关内 rain 题 ≥2，
   其余 order 从非 out 流程取）/ ch4 缺步补卡（miss：链缺 1+候选 4）/ 生成关 roll 1-4 混合。
   order/rain 关每关 5 题流程互异（rain 题恒 out，order 题取其余 5 流程互异）；miss 关 5 流程互异。
   hint=章末预告**下一章**文案（hint[i]↔CHAPTERS[i+1]，禁右移） ---------- */
const CHAPTERS = {
  1: { name: '排得对', hint: '有的卡片会来捣蛋，要认清楚哦' },
  2: { name: '认捣蛋', hint: '下雨天出门，故事会多一步哦' },
  3: { name: '会变通', hint: '故事少了一步，找一找缺了什么' },
  4: { name: '找缺失', hint: '新一轮故事排队开始啦' }
};
const GEN_HINTS = ['排一排，想想谁在前', '认出捣蛋的卡片', '下雨天多带一把伞', '找出少掉的一步'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 依赖表 DEPS（r10 核心真值；SPEC §6 文字表为源——build.py 正则对账禁手抄）
   flow → { 步骤固有号: [必须先完成的步骤固有号] }（[] = 无前置）。
   判定：步骤合法 ⟺ 未完成 ∧ 其前置集 ⊆ 已完成集（点选次序=任意拓扑序=「合理序」）。
   可换对（无约束路径的步骤对）：sleep (0,1)(0,2)(1,2) / getup (1,2) / eat (0,1) / out (1,2)；
   washhand·bath 全序（洗手/洗澡物理序不可换）——混出逼孩子逐题判断，不能一刀切。 ---------- */
const DEPS = {
  sleep:    { 0: [], 1: [], 2: [], 3: [0, 1, 2] },   // 刷牙洗脸穿睡衣互可换，上床睡觉须三者后
  getup:    { 0: [], 1: [0], 2: [0], 3: [1, 2] },    // 睁眼最先；穿衣/刷牙互可换；早餐须二者后
  washhand: { 0: [], 1: [0], 2: [1], 3: [2] },       // 全序：卷袖→冲湿→搓泡→擦干
  eat:      { 0: [], 1: [], 2: [0, 1], 3: [2] },     // 洗手/坐坐好互可换；吃饭须二者后；擦嘴须饭后
  out:      { 0: [], 1: [0], 2: [0], 3: [1, 2] },    // 穿衣最先；穿鞋/背书包互可换；出门须二者后
  bath:     { 0: [], 1: [0], 2: [1], 3: [2] }        // 全序：脱衣→冲水→搓澡→擦干穿衣
};

/* ---------- 条件步 COND（r10 delta②：条件卡片改变流程插入步骤）
   rain：出门遇「明天下雨」→ out 流程插入固有号 4「带小伞」（5 步）。
   插入后依赖：带小伞前置=穿衣服；出门玩前置扩为 [穿鞋, 背包, 带伞]。
   合法序特征：穿衣最先、出门最后、中间穿鞋/背包/伞自由（3!=6 种合法序）。 ---------- */
const COND = {
  rain: { flow: 'out', stepN: 4, text: '带小伞',
          ask: { key: 'stb_q_rain', text: '明天下雨，出门记得带伞' },
          badge: '明天下雨' }
};
/* rain 题依赖图（out 五步版；stepIds = out_0..out_4，4=带小伞） */
const RAIN_DEPS = {
  0: [], 1: [0], 2: [0], 4: [0], 3: [1, 2, 4]
};

/* ---------- 认知模型 COG（r10 时长口径：审计批评「时长全靠动画撑」——认知与动画分账）
   SPEC §6 数字表为源（5-6 岁试玩推算口径：每决策点=扫描+约束检查+点选），
   verify 按此独立复算每关认知时长，硬断言 ≥40000ms 且 > 动画窗（动画另计：step 锁 640/
   判对窗 5200/错窗 1000——认知为主体）。单位 ms。 ---------- */
const COG = {
  baseStep: 2200,   // order/rain 每步决策（扫描未完成卡+查前置+点选）
  swapPair: 900,    // 每个可换对额外权衡（两可比较——多解题的认知增量）
  distract: 1100,   // 每张干扰卡排除（ch2 / miss 候选干扰）
  condRead: 2600,   // 条件卡理解（听条件句+把新步骤纳入流程）
  missScan: 1000,   // miss 链每实步扫描（读链比对）
  missInfer: 2000,  // 缺口推断（依赖约束反推缺什么）
  missCand: 900     // miss 每候选卡比对
};

/* ---------- 语音文案（7 条通用 clip + r10 新 2 条题面与 voice/clips/manifest.json 严格一致，禁自造）
   步音 key = stb_s_<flow>_<n>×24 + r10 条件步 stb_s_out_4（manifest 已核无占用）；
   出题/再听：order=stb_q / rain=stb_q_rain / miss=stb_q_miss（单 clip，play 无锁窗）；
   逐点反馈链 = [步音, stb_next]（clip+clip 顺序播）；
   排完确认链 = [stb_right, 末步步音]（契约 N：全 clip 段无 keyless；miss 题=right+缺失步步音）；
   错链 = [stb_wrong, {key:null,语义句}]——keyless TTS 段恒居链尾（契约 N，b29 Mj-1） ---------- */
const VOICE = {
  watch: { key: 'stb_tut_watch', text: '看！把事情排排队' },
  turn:  { key: 'stb_tut_turn',  text: '你来排一排' },
  hint:  { key: 'stb_hint',      text: '想想先做什么' },
  right: { key: 'stb_right',     text: '排对啦，真厉害' },
  wrong: { key: 'stb_wrong',     text: '再想想先做什么' },
  q:     { key: 'stb_q',         text: '先做什么呀' },
  next:  { key: 'stb_next',      text: '然后呢' },
  qr:    { key: 'stb_q_rain',    text: '明天下雨，出门记得带伞' },   // r10 rain 题题面
  qm:    { key: 'stb_q_miss',    text: '少了哪一步呀' }               // r10 miss 题题面
};
const stepKey = (flow, n) => 'stb_s_' + flow + '_' + n;   // 步骤名音（habit hb_q_* 同族单独 key）
const stepKeyOf = id => 'stb_s_' + id;                    // stepId('out_4')→'stb_s_out_4'（逐点/确认链用）
/* 错反馈语义句（家族 J 全程保留；三句族——r10 miss 专用句新增）
   wrong·distract 均 10 字符 → estMs=10×345+600=4050（最长句），miss 8 字符 → 3360；
   错链=2496+150+4050=6696，豁免窗 7100（≥+300，罩住三句族最长） */
const GUIDE = {
  wrong: '再想想现在做哪一件事',
  distract: '这一步不在这个流程里',
  miss: '再看看少了哪一步'
};
/* T46 阶段2（2026-09-19）：三句族语义句 clip 化——键段映射（text=TTS 兜底；
   clip 实长 wrong 3120 / distract 2880 / miss 2592，原 estMs 字数口径退役） */
const GUIDE_KEY = { wrong: 'stb_g_wrong', distract: 'stb_g_distract', miss: 'stb_g_miss' };
/* estMs 全字符口径（家族 T，b25 定版：SAPI ~345ms/字符+600 落定余量，标点计入） */
const estMs = s => s.length * 345 + 600;

/* ---------- 流程库 FLOWS（SPEC-BATCH30 §0.74 流程表为源——build.py 正则提 SPEC 对账禁手抄）
   每流程 4 步；steps[].t=步骤短词（卡面文字）；stepId='<flow>_<n>' 与步音 key 对齐
   sleep 睡觉=刷牙→洗脸→穿睡衣→上床睡觉 / getup 起床=睁开眼睛→穿衣→刷牙→吃早餐
   washhand 洗手=卷起袖子→冲湿小手→搓搓泡泡→擦干小手 / eat 吃饭=洗手→坐坐好→吃饭饭→擦擦嘴巴
   out 出门=穿衣服→穿鞋子→背小书包→出门玩 / bath 洗澡=脱衣服→冲冲水→搓搓澡→擦干穿衣 ---------- */
const FLOWS = {
  sleep: { name: '睡觉', steps: [
    { t: '刷牙' }, { t: '洗脸' }, { t: '穿睡衣' }, { t: '上床睡觉' }] },
  getup: { name: '起床', steps: [
    { t: '睁开眼睛' }, { t: '穿衣' }, { t: '刷牙' }, { t: '吃早餐' }] },
  washhand: { name: '洗手', steps: [
    { t: '卷起袖子' }, { t: '冲湿小手' }, { t: '搓搓泡泡' }, { t: '擦干小手' }] },
  eat: { name: '吃饭', steps: [
    { t: '洗手' }, { t: '坐坐好' }, { t: '吃饭饭' }, { t: '擦擦嘴巴' }] },
  out: { name: '出门', steps: [
    { t: '穿衣服' }, { t: '穿鞋子' }, { t: '背小书包' }, { t: '出门玩' }] },
  bath: { name: '洗澡', steps: [
    { t: '脱衣服' }, { t: '冲冲水' }, { t: '搓搓澡' }, { t: '擦干穿衣' }] }
};
const FLOW_IDS = Object.keys(FLOWS);   // 封闭 6（顺序=SPEC §0.74 表序）
const stepIdOf = (flow, n) => flow + '_' + n;

/* ---------- 步骤小图库（23 幅唯一文本，描线风 viewBox 0 0 64 64；同文本跨流程共用=复习锚）
   图为主文字为辅（SPEC §2）：卡面 SVG 56px + 短词 20px；按步骤文本查表 ---------- */
const STEP_ART = {
  '刷牙': // 大牙刷 + 两颗小白牙
    '<rect x="6" y="34" width="34" height="11" rx="5.5" transform="rotate(-32 23 39)" fill="' + ORANGE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="33" y="14" width="17" height="15" rx="4" transform="rotate(-32 41 21)" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M36 18 l11 8 M34 22 l11 8" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="12" y="47" width="13" height="12" rx="3.5" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="27" y="49" width="12" height="10" rx="3.5" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3"/>',
  '洗脸': // 圆脸 + 弯眼 + 双手捧水 + 水珠
    '<circle cx="32" cy="26" r="15" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M25 25 q3 -3.5 6 0 M33 25 q3 -3.5 6 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M27 32 q5 4 10 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M8 40 q6 12 20 12 M56 40 q-6 12 -20 12" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 46 q3 4 0 7 q-3 -3 0 -7 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="2.2"/>',
  '穿睡衣': // 星星睡袍（领口+两粒扣+星点）
    '<path d="M22 18 L28 13 Q32 17 36 13 L42 18 L45 30 L19 30 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M19 30 L14 54 L26 54 L28 38 M45 30 L50 54 L38 54 L36 38" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 13 Q32 19 36 13" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="32" cy="30" r="2.6" fill="' + INK + '"/><circle cx="32" cy="40" r="2.6" fill="' + INK + '"/>' +
    '<path d="M44 12 l1.6 3.4 3.7 .5 -2.7 2.6 .7 3.7 -3.3 -1.8 -3.3 1.8 .7 -3.7 -2.7 -2.6 3.7 -.5 Z" fill="' + YELL + '" stroke="' + INK + '" stroke-width="2"/>',
  '上床睡觉': // 小床 + 枕头 + 月亮
    '<path d="M8 34 h48 M8 34 v18 M56 34 v18 M12 52 h6 M46 52 h6" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<rect x="10" y="26" width="44" height="9" rx="4" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="20" cy="31" r="6" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M47 8 a8 8 0 1 0 7 12 a6.5 6.5 0 1 1 -7 -12 Z" fill="' + YELL + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
  '睁开眼睛': // 大睁眼（眼眶+瞳孔+睫毛）
    '<ellipse cx="32" cy="34" rx="21" ry="13" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="32" cy="34" r="7.5" fill="' + ORANGE + '" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="32" cy="34" r="3" fill="' + INK + '"/>' +
    '<circle cx="34.5" cy="31.5" r="1.8" fill="#FFF"/>' +
    '<path d="M14 24 L11 18 M24 20 L22.5 13.5 M40 20 L41.5 13.5 M50 24 L53 18" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round"/>',
  '穿衣': // 短袖 T 恤
    '<path d="M22 12 L30 9 Q32 12 34 9 L42 12 L50 20 L43 26 L43 54 L21 54 L21 26 L14 20 Z" fill="' + GREEN + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M30 9 Q32 14 34 9" fill="none" stroke="' + INK + '" stroke-width="2.4"/>',
  '吃早餐': // 牛奶杯 + 面包
    '<path d="M14 26 h18 l-2.5 24 a3 3 0 0 1 -3 3 h-7 a3 3 0 0 1 -3 -3 Z" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 33 h18" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<ellipse cx="42" cy="42" rx="14" ry="10" fill="' + BROWN + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M42 32 v-8 M42 24 q4 -2 3 -5" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  '卷起袖子': // 手臂 + 卷起的袖口
    '<path d="M10 46 Q14 30 30 26 L38 24 Q46 22 48 28 L46 34 Q40 40 34 42 L24 46 Q14 50 10 46 Z" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 25 Q34 32 30 42" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M26 22 Q34 20 38 24 M24 28 Q32 27 37 31" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>',
  '冲湿小手': // 水龙头 + 水流 + 小手
    '<path d="M12 10 h20 v8 h-8 v6" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M24 24 q3 3 0 6 q-3 -3 0 -6 Z" fill="' + INK + '"/>' +
    '<path d="M24 30 q0 8 0 8 M18 38 q6 -4 12 0 l3 10 q-9 4 -18 0 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M20 44 l1.5 4 M27 44 l-1.5 4" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  '搓搓泡泡': // 双手搓 + 泡泡×3
    '<path d="M8 38 q6 -12 22 -12 M56 38 q-6 -12 -22 -12" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M22 30 q10 -6 20 0 l-2 12 q-8 4 -16 0 Z" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="14" cy="20" r="5.5" fill="none" stroke="' + BLUE + '" stroke-width="2.8"/>' +
    '<circle cx="50" cy="18" r="7" fill="none" stroke="' + BLUE + '" stroke-width="2.8"/>' +
    '<circle cx="46" cy="50" r="4.5" fill="none" stroke="' + BLUE + '" stroke-width="2.8"/>',
  '擦干小手': // 毛巾 + 手
    '<path d="M10 20 h44 l-3 26 a5 5 0 0 1 -5 4 h-28 a5 5 0 0 1 -5 -4 Z" fill="' + YELL + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M10 27 h44 M13 34 h38" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M22 42 q10 -8 20 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  '洗手': // 双手交叠 + 水滴（eat_0 与 washhand 流程图区分：无水龙头）
    '<path d="M14 34 q8 -14 18 -14 q10 0 18 14 l-6 14 q-12 5 -24 0 Z" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 22 q8 6 8 26 M34 20 q4 10 0 28" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M32 4 q4 5 0 9 q-4 -4 0 -9 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="2.2"/>',
  '坐坐好': // 小椅子 + 坐着的小人
    '<circle cx="26" cy="18" r="7" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M22 26 h9 l3 12 h-16 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M20 38 v18 M34 38 v18 M18 44 h18" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 50 l-3 6 M28 50 l4 5" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
  '吃饭饭': // 米饭碗 + 勺
    '<path d="M10 32 h32 q0 16 -11 20 h-10 q-11 -4 -11 -20 Z" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 32 q7 -8 12 -8 q5 0 12 8" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M17 28 q3 -4 6 -1 M24 25 q3 -4 6 -1" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<rect x="44" y="12" width="6" height="26" rx="3" transform="rotate(24 47 25)" fill="' + BROWN + '" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="52" cy="42" rx="6" ry="5" transform="rotate(24 52 42)" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="2.8"/>',
  '擦擦嘴巴': // 嘴 + 方巾轻擦
    '<circle cx="26" cy="26" r="14" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M19 27 q7 6 14 0" fill="none" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round"/>' +
    '<rect x="34" y="34" width="20" height="18" rx="4" transform="rotate(-12 44 43)" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M39 40 l10 -2 M40 45 l10 -2" stroke="' + INK + '" stroke-width="2.2"/>',
  '穿衣服': // 开襟外套（翻领+扣子）——与「穿衣」T 恤区分
    '<path d="M22 12 L32 16 L42 12 L52 20 L45 26 L45 54 L19 54 L19 26 L12 20 Z" fill="' + ORANGE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 13 L32 24 L36 13 M32 24 L32 54" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="29" cy="34" r="2" fill="' + INK + '"/><circle cx="29" cy="44" r="2" fill="' + INK + '"/>' +
    '<circle cx="35" cy="34" r="2" fill="' + INK + '"/><circle cx="35" cy="44" r="2" fill="' + INK + '"/>',
  '穿鞋子': // 侧面小鞋
    '<path d="M8 40 q10 -4 20 -2 q12 2 20 8 q6 4 0 8 h-36 q-6 0 -6 -6 q0 -6 2 -8 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M10 48 q22 6 44 4" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M14 36 q4 -6 10 -6 l2 6" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="46" cy="34" r="4" fill="none" stroke="' + INK + '" stroke-width="2.4"/>',
  '背小书包': // 双肩书包（正面）
    '<rect x="16" y="20" width="32" height="32" rx="9" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M24 20 q0 -8 8 -8 q8 0 8 8" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="24" y="38" width="16" height="10" rx="3" fill="' + YELL + '" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M22 22 v26 M42 22 v26" stroke="' + INK + '" stroke-width="2.2" opacity=".55"/>',
  '出门玩': // 开门 + 太阳
    '<rect x="8" y="10" width="30" height="46" rx="3" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="13" y="15" width="20" height="36" rx="2.5" fill="' + ORANGE + '" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="30" cy="33" r="2.4" fill="' + INK + '"/>' +
    '<circle cx="48" cy="20" r="8" fill="' + YELL + '" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M48 6 v-2 M48 36 v-2 M60 20 h-2 M38 20 h-2 M57 11 l-1.5 1.5 M40.5 28.5 l1.5 -1.5 M57 29 l-1.5 -1.5 M40.5 11.5 l1.5 1.5" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>',
  '脱衣服': // 衣服 + 向下箭头（脱）
    '<path d="M20 10 L28 7 L31 10 L34 7 L42 10 L48 17 L43 22 L43 42 L19 42 L19 22 L14 17 Z" fill="' + GREEN + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M31 46 v12 M26 53 l5 5 5 -5" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
  '冲冲水': // 淋浴喷头 + 水线
    '<path d="M14 12 h28" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M42 12 v6 a8 8 0 0 1 -8 8 h-4 a8 8 0 0 1 -8 -8 v-6" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<rect x="20" y="24" width="24" height="9" rx="4" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M24 36 v6 M30 36 v9 M36 36 v6 M27 45 v4 M33 45 v4" stroke="' + BLUE + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M20 58 q12 4 24 0" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" opacity=".5"/>',
  '搓搓澡': // 澡巾手套 + 泡泡
    '<path d="M18 44 q-6 -16 6 -24 q10 -6 18 2 l10 10 q4 6 -2 10 l-14 8 q-12 4 -18 -6 Z" fill="' + YELL + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 24 q8 -2 12 6" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="12" cy="16" r="6" fill="none" stroke="' + BLUE + '" stroke-width="2.8"/>' +
    '<circle cx="28" cy="8" r="4" fill="none" stroke="' + BLUE + '" stroke-width="2.6"/>' +
    '<circle cx="50" cy="20" r="5" fill="none" stroke="' + BLUE + '" stroke-width="2.8"/>',
  '擦干穿衣': // 浴巾裹身小人
    '<circle cx="26" cy="12" r="6.5" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M18 20 q8 -4 16 0 l4 18 q-12 6 -24 0 Z" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M20 30 q6 3 12 0" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M14 22 l-4 10 M34 20 l6 8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  '带小伞': // r10 条件步：小雨伞（伞面+伞柄+雨点）
    '<path d="M8 30 Q32 4 56 30 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M32 8 v10 M20 20 q4 5 8 0 M36 19 q4 5 8 0" fill="none" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M32 30 v20 q0 6 -6 6 q-5 0 -5 -5" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M14 44 q2 3 0 6 M50 44 q2 3 0 6" fill="none" stroke="' + BLUE + '" stroke-width="2.6" stroke-linecap="round"/>'
};
/* 小图兜底：SVG 拼装时查表缺失给占位（build 对账保证封闭集全量在场，此行仅防御） */
function stepArt(text) {
  return '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
         (STEP_ART[text] || '<circle cx="32" cy="32" r="22" stroke="#4A3B2E" stroke-width="3"/>') + '</svg>';
}

/* ---------- 流程小图（题面 p-ico，6 幅） ---------- */
const FLOW_ART = {
  sleep: // 月亮 + 星
    '<path d="M40 6 a16 16 0 1 0 13 25 a13 13 0 1 1 -13 -25 Z" fill="' + YELL + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 14 l1.8 4 4.2 .6 -3 3 .7 4.2 -3.7 -2 -3.7 2 .7 -4.2 -3 -3 4.2 -.6 Z" fill="' + YELL + '" stroke="' + INK + '" stroke-width="2"/>',
  getup: // 闹钟
    '<circle cx="32" cy="34" r="20" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M32 24 v10 l7 5" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M18 16 l-6 -5 M46 16 l6 -5" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M12 52 l-4 4 M52 52 l4 4" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>',
  washhand: // 水滴 + 手
    '<path d="M22 6 q9 11 0 20 q-9 -9 0 -20 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 46 q8 -14 18 -14 q10 0 18 14 l-6 12 q-12 5 -24 0 Z" fill="' + PINK + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
  eat: // 碗 + 勺
    '<path d="M10 34 h36 q0 16 -12 20 h-12 q-12 -4 -12 -20 Z" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M16 34 q8 -10 12 -10 q4 0 12 10" fill="' + WHITE + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="50" y="12" width="6" height="26" rx="3" transform="rotate(22 53 25)" fill="' + BROWN + '" stroke="' + INK + '" stroke-width="2.8"/>',
  out: // 门 + 箭头向外
    '<rect x="8" y="10" width="28" height="46" rx="3" fill="' + CREAM + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="30" cy="34" r="2.4" fill="' + INK + '"/>' +
    '<path d="M42 32 h16 M51 24 l8 8 -8 8" fill="none" stroke="' + ORANGE + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  bath: // 浴缸 + 泡泡
    '<path d="M8 30 h48 v6 q0 14 -14 14 h-20 q-14 0 -14 -14 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M12 30 q4 -14 20 -14 q16 0 20 14" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="18" cy="8" r="4.5" fill="none" stroke="' + BLUE + '" stroke-width="2.6"/>' +
    '<circle cx="46" cy="10" r="3.5" fill="none" stroke="' + BLUE + '" stroke-width="2.4"/>'
};
const flowArt = flow => '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' + FLOW_ART[flow] + '</svg>';

/* ---------- 条件徽章图（r10 rain 题题面挂件：雨云+雨点） ---------- */
const COND_ART = {
  rain:
    '<path d="M18 30 a11 11 0 0 1 2 -21 a14 14 0 0 1 26 3 a10 10 0 0 1 0 18 Z" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 38 q3 4 0 8 M32 38 q3 4 0 8 M42 38 q3 4 0 8" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M22 40 l-1.5 3 M32 42 l-1.5 3 M42 40 l-1.5 3" stroke="#FFF" stroke-width="1.6" stroke-linecap="round"/>'
};
const condArt = id => '<svg viewBox="0 0 64 48" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' + COND_ART[id] + '</svg>';

/* ---------- 认知模型求值（r10）：perQuizCog(q)=题级认知 ms；关级=Σ题（verify 硬断言 ≥40000 且>动画）
   order/rain：步骤数×baseStep + 可换对数×swapPair（+distract×干扰数 +rain 加 condRead）
   miss：链实步×missScan + missInfer + 候选数×missCand
   可换对数=无约束路径的步骤对数（拓扑独立对：sleep 3 / getup·eat·out 1 / washhand·bath 0 / rain 3） ---------- */
const swapPairsOf = (flow, five) => {
  const ids = five ? [0, 1, 2, 3, 4] : [0, 1, 2, 3];
  const dep = five ? RAIN_DEPS : DEPS[flow];
  const reach = (a, b) => {                      // a 是否约束路径先于 b（DFS 传递闭包）
    if (dep[a].indexOf(b) >= 0) return true;
    return dep[a].some(m => reach(m, b));
  };
  let n = 0;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      if (!reach(ids[i], ids[j]) && !reach(ids[j], ids[i])) n++;
  return n;
};
function quizCogMs(q) {
  if (q.kind === 'miss') return q.chainSteps.length * COG.missScan + COG.missInfer + q.pool.length * COG.missCand;
  const five = q.kind === 'rain';
  const n = five ? 5 : q.stepIds.length;
  let ms = n * COG.baseStep + swapPairsOf(q.flow, five) * COG.swapPair;
  if (!five) ms += q.pool.filter(p => q.stepIds.indexOf(p.stepId) < 0).length * COG.distract;
  else ms += COG.condRead;
  return ms;
}
/* 动画分账（口径与 uiTapCard 实窗一致：step 锁=dur+220≈640 / 判对演出=5200 / 错防重入=1000；
   求值按零错通关路径=只计 step 锁+判对窗——错窗属异常路径不计入基线动画） */
function animMsOf(L) {
  return L.quizzes.reduce((s, q) => s + (q.kind === 'miss' ? 5200 : q.stepIds.length * 640 + 5200), 0);
}

/* ---------- 图标（内嵌 SVG 描线风） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 三张排队小卡 + 对勾（故事排队主题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="8" y="12" width="12" height="15" rx="3" fill="' + BLUE + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="24" y="12" width="12" height="15" rx="3" fill="' + YELL + '" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M14 33 L19 38 L31 24" stroke="#8FBF7F" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
