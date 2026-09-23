/* ================= column 竖式小黑板 游戏数据（r15 难度改造 2026-09-16 / 8 题关+进退位操作步+三位数+两步竖式）
   【r15 改造定稿（AUDIT-78 column 行：每关 5→8 题、自己点亮进位小 1/退位点、ch4 两步竖式、三位数扩位）】
   ① CH_LEN 5→8（每关 8 题）、STATIC_LEVELS 20→32（4 章×8 题）
   ② 章型重排：ch1 两位加法(qi0 不进位热身+qi1-7 进位自点亮小 1)/ch2 两位减法(qi0 不退位热身+
      qi1-7 退位自点亮)/ch3 三位数加减(qi0-1 无标记热身+qi2-5 单进退+qi6-7 连进退双标记)/
      ch4 两步竖式(qi0 两步无标记热身+qi1-4 恰一步标记+qi5-7 两步全标记；as/sa 按 qi 奇偶)
   ③ 进退位标记=玩家操作步（计划 plan 驱动：加法标记在填位后/减法标记在填位前；标记相位按数字键=
      miss 不可跳过——原系统代劳「没练到」根因对策）
   语音（§0.18 与 manifest games=['column'] 11 条严格一致；r15 新 6 键已核无占用 2026-09-16）：
   既有 5 键一字不改：clm_tut_watch'看！竖式算一算'/clm_tut_turn'你来填一填'/
   clm_hint'先算个位，再算十位'/clm_q_add'加法竖式，算一算'/clm_q_sub'减法竖式，算一算'
   r15 新 6 键：clm_carry_go'满十啦，点亮小 1'/clm_borrow_go'不够减，点亮退位点'/
   clm_no_carry'这题不用进位哦'/clm_no_borrow'这题不用退位哦'/
   clm_q_two'两步竖式，算一算'/clm_q_step2'第二步，接着算'
   题面=黑板视觉承载（大字竖式）+指令句（不读算式数字，§3）；核心指令语音承载（§0.19） */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 演出时序常量（r15；estMs 全字符口径同 b25/b39/r14 家族） ---------- */
const ENTER_MS = 400;                          // 新题出场窗（与题面句 say 并行）
const STAGE_MS = 400;                          // 题内步推进窗（板面微换页/反馈收尾）
const ADV_MS = 1200;                           // 过题演出窗（板擦横扫 ~0.9s+余量；本题无确认句 clip）
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）

/* ---------- r15 时长模型（crd r12 范式；认知步主体非演出窗——AUDIT-78 根因对策）
   每题 quizDur = Σ_k max(win_k, DECIDE[plan[k]]) + ADV（一次/题）。
   win_0 = ENTER 400 + estMs(题面句) + 300；win_k>0 = STAGE_MS 400；
   两步题步 2 首动作 win = estMs('第二步，接着算') + 300 = 3315（仍 < DECIDE_MARK——认知步恒主体）。
   DECIDE 分型（操作步 vs 输入步；7-8 岁二年级认知决策推算）：
   DECIDE_INPUT_MS 5000：逐位输出=20 内加减检索（含借位/进位修正 2-3s）+键盘定位+确认；
   DECIDE_MARK_MS 4000：满十/不够减判断+点亮（前位计算已含一半判断负荷，故低于输出步）；
   3 位数不分档（步数即负荷：3 输入步±2 标记步）；两步题=两步计划相加。
   验算（题面句最长 clm_q_two 8 字 estMs 3360+700=4060 < 5000——语音窗从不撑时长；r15 审查 m2 勘正：原注 9 字/4405 系字数误算）：
   ch1/ch2 关 = 11200 + 7×15200 = 117600（dch1/dch2 同值=40 关 modeled 最低，verify ⑭ 精确防回漂）
   ch3 关 = 2×16200 + 4×20200 + 2×24200 = 161600；ch4 关 = 21200 + 4×25200 + 3×29200 = 209600
   ——恒 ≥ LEVEL_MIN_MS 40000（r15 门禁）。 ---------- */
const DECIDE_INPUT_MS = 5000;
const DECIDE_MARK_MS = 4000;
const LEVEL_MIN_MS = 40000;                    // 单关 modeled 下限硬断言（r15 门禁，7-8 岁口径）

/* 题面指令句（voiceWin 预算源；ch1-3 按 op、ch4=两步句）——与 main qSpeak 同口径 */
const cueTextOf = q => q.form ? VOICE.qTwo.text : (q.op === 'add' ? VOICE.qAdd.text : VOICE.qSub.text);
/* 步长预算（verify 独立副本对账用）：plan 动作数=填位步数+标记步数；两步题含步 2 首动作语音窗 */
const stepWinMs = (q, k) => {
  if (k === 0) return ENTER_MS + estMs(cueTextOf(q)) + 300;
  if (q.form && k === q.twoStart) return estMs(VOICE.qStep2.text) + 300;   // 步 2 换面句窗
  return STAGE_MS;
};
const quizDurMs = q => {
  let s = 0;
  for (let k = 0; k < q.planLen; k++) s += Math.max(stepWinMs(q, k), q.planDecide[k]);
  return s + ADV_MS;
};
const levelDurMs = L => L.quizzes.reduce((t, q) => t + quizDurMs(q), 0);

/* ---------- 章规格（SPEC-BATCH12 §3-r15）：
   ch1 两位加法(不进位热身→进位自点亮) / ch2 两位减法(不退位热身→退位自点亮) /
   ch3 三位数加减混合(奇偶交替：qi0 加无标记热身/qi1 减无标记热身/qi2·4 加单进/
   qi3·5 减单退/qi6 加连进双标记/qi7 减连退双标记) / ch4 两步竖式(as/sa，标记渐进) */
const KIND_ADD2 = 1, KIND_SUB2 = 2, KIND_MIX3 = 3, KIND_TWO = 4;

/* ---------- 章配置（hint=预告"下一章"文案——家族 F 契约：CHAPTERS[i].hint=第 i+1 章预告；
   CHAPTERS[4].hint=泛生成关预告（生成关指型文案由生成支实算 GEN_HINTS[genLevel(f+1).dch-1] 承担）；
   GEN 文案不带"明天："前缀（core 模板自带，§0.4） ---------- */
const CHAPTERS = {
  1: { name: '加法竖式',   hint: '接下来：换成减法竖式，算一算' },
  2: { name: '减法竖式',   hint: '接下来：三位数大竖式来啦' },
  3: { name: '三位数竖式', hint: '接下来：两步竖式，连着算' },
  4: { name: '两步竖式',   hint: '新一轮竖式小黑板挑战' }
};
const GEN_HINTS = ['新的竖式加一加', '新的竖式减一减', '三位数竖式挑战', '两步竖式挑战'];
const CH_LEN = 8;          // 8 题 = 1 关（r15：5→8，AUDIT-78）
const STATIC_LEVELS = 32;  // 静态 32 关 = 4 章×8 题（r15：20→32）
const LV_RANGE = [0, 1, 2, 3, 4, 5, 6, 7];   // 本章 lv 全枚举（KIDS.level.pass/stars5 用）

/* ---------- HUD 指令条文案（题面句与语音同文；教学两态） ---------- */
const TIP_WATCH = '看！竖式算一算';
const TIP_HELP = '你来填一填';
const TIPS = { add: '加法竖式，算一算', sub: '减法竖式，算一算', two: '两步竖式，算一算' };

/* ---------- 语音文案（key+text 与 manifest 严格一致，禁自造） ---------- */
const VOICE = {
  watch:   { key: 'clm_tut_watch',  text: '看！竖式算一算' },
  turn:    { key: 'clm_tut_turn',   text: '你来填一填' },
  hint:    { key: 'clm_hint',       text: '先算个位，再算十位' },
  qAdd:    { key: 'clm_q_add',      text: '加法竖式，算一算' },
  qSub:    { key: 'clm_q_sub',      text: '减法竖式，算一算' },
  /* r15 新 6 键 */
  qTwo:    { key: 'clm_q_two',      text: '两步竖式，算一算' },
  qStep2:  { key: 'clm_q_step2',    text: '第二步，接着算' },
  carryGo: { key: 'clm_carry_go',   text: '满十啦，点亮小 1' },
  borrowGo:{ key: 'clm_borrow_go',  text: '不够减，点亮退位点' },
  noCarry: { key: 'clm_no_carry',   text: '这题不用进位哦' },
  noBorrow:{ key: 'clm_no_borrow',  text: '这题不用退位哦' }
};
/* 题面指令（按 op/form 取）：黑板大字视觉承载算式，语音只报指令句（§3，不读数字） */
const qKeyOf = q => q.form ? VOICE.qTwo.key : (q.op === 'add' ? VOICE.qAdd.key : VOICE.qSub.key);
const qTextOf = cueTextOf;
const wrongText = () => '再想一想，先算个位';   /* 缺 clip 时 TTS 兜底（正常游玩不触达，§0.23） */

/* ---------- 图标（内嵌 SVG，暖棕描线；板面/键盘配色在 head.html CSS） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="7" width="36" height="27" rx="5" fill="#2F5D44" stroke="#FFF" stroke-width="2.6"/>' +
    '<path d="M17 15 v10 M12 20 h10" stroke="#F7F3E7" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="27" y="17" width="3.4" height="8" rx="1.4" fill="#F7E7A1"/>' +
    '<circle cx="28.7" cy="13.6" r="1.9" fill="#F7E7A1"/>' +
    '<line x1="10" y1="31.5" x2="34" y2="31.5" stroke="#F7F3E7" stroke-width="2.4" stroke-linecap="round"/>' +
    '</svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
