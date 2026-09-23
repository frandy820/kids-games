/* ================= brk 问题拆解小博士 游戏数据（SPEC 定表 8 目标×5 步=40 卡 /
   20 题章池题表 / 章配置 / 语音文案）
   玩法（SPEC-BATCH40 §3，7-8 岁信息素养/语言·大目标拆小问题）：
   小兔子带着大任务牌来——帮它把大目标拆成小问题。两族：
   pick 族（ch1-2）：候选池 5 张（本目标 3 正确步+他目标 2 干扰）→ 点出 3 张
   正确的（点对飞入「小问题清单」槽；点错=miss+方向级干扰反馈句「这张卡是
   别的任务用的」不点破来源——排除法可玩；点满 3 对=题完成）。
   order 族（ch3-4）：5 子步骤乱序 → 按正确顺序逐张点（连选驱动——每点一步
   quiz 当前步推进，步进只播换步音效不重播题面（b38 坑③同构）；错点=miss
   可重点（miss=题级跨步续算——b39 crd 先例）；5 步点完=题完成）。
   题面=目标名 clip（brk_t_* 8 条）+模板 keyless TTS 拼接（queue 链 keyless
   段必居尾——契约 N：core queue keyless 段播完即弃后续，故语序=目标名在前
   模板在后「办一场生日聚会，帮小兔子拆一拆」）。
   防同质化（SPEC §3 审查项，三重差异）：vs sentorder 句子拼拼乐=语言语序→
   任务功能分解（大问题→可做的小问题）+相关性判断；vs libr 分类归档=主题
   分类→目标-步骤功能性从属+执行序列；vs habit 好习惯排序=固定六流程模仿→
   开放目标域拆解+干扰辨识。
   定表封闭（SPEC §3 真值源，agent 照抄，verify 照抄对账）：40 卡两两字面互不
   重名且每卡恰属 1 目标（_verify_spec40.py 已验算）；排序真值=定序表（SPEC
   表箭头序）；order answer=定序表。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（SPEC-BATCH40 §3 实长表；_clipdur40.json 实测）
   brk_tut_watch 3408 / brk_tut_turn 1776 / brk_hint 2160 / brk_right 2736 /
   brk_wrong 2880；目标名 clip 1872（planttree）~2232（birthday）。
   题面链窗（N2 总窗口径）=目标名 max 2232+段间 150+模板句 estMs(7 字)=
   3015+尾 300 → PRESENT_TTS=5697、presentQuiz 锁窗=ENTER 400+5697=6097。
   错链豁免窗 WRONG_CHAIN_WIN=3330（=wrong 2880+150+300——wrong 即干扰反馈句
   单段链，无第二段）；首错演出锁 SHAKE_MS=1200 ≤ wrong+150=3030（b37 R3）。
   确认链窗 CELE_WIN=3036（=right 2736+300 精确）；卡飞入演出 FILL_MS=1000。
   winFlow celebrate 2620+补窗 500=3120 ≥ right+300=3036（brk right 长于
   家族先例，libr 的 400 补窗不够——本款定 500）。 ---------- */
const ENTER_MS = 400;                        // 目标牌/候选卡出场动画窗（与题面链并行）
const GOAL_CLIP_MAX = 2232;                  // 目标名 clip 最长（birthday）
const SEG_GAP = 150;                         // queue 段间停顿（core 0.15s）
const TMPL = '帮小兔子拆一拆';                // 题面模板句 7 字（keyless 居链尾——契约 N）
const PRESENT_TTS = 5697;                    // = 2232+150+estMs(7)+3015+300（总式，N2）
const SHAKE_MS = 1200;                       // 错卡晃动锁（≤ wrong+150=3030，b37 R3）
const WRONG_CHAIN_WIN = 3330;                // 错链豁免窗 = wrong 2880+150+300（真时钟）
const FILL_MS = 1000;                        // 卡飞入槽演出窗
const CELE_WIN = 3036;                       // 确认链窗 = right 2736+300（精确）
const TUT_WATCH_WAIT = 3708;                 // ≥ tut_watch 3408+300
const TUT_TURN_WAIT = 2076;                  // ≥ tut_turn 1776+300
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- 章配置（SPEC §3：ch1-2 pick/ch3-4 order；进度章号单调递增；
   静态关 dch=flat//5+1（b38 坑⑤）；生成关 flat≥20 dch=ri(rnd,1,4) seeded
   mulberry32(flat*7919+907)——本款常量 907（§0.3 三款 seeded 随机 dch 声明）。
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '找小问题',   hint: '还有好多任务，等着你拆一拆' },   // 预告 ch2 pick 继续
  2: { name: '拆解小能手', hint: '新本领来啦：按顺序排一排' },     // 预告 ch3 order 登场
  3: { name: '排好顺序',   hint: '更多任务来啦，继续按顺序点' },   // 预告 ch4 order 继续
  4: { name: '拆解小博士', hint: '新的任务来啦，拆给小兔子看' }    // 预告生成关
};
const GEN_HINTS = ['点出三张小问题卡',             // dch1 pick
                   '还是点三张，小心别的任务的卡',   // dch2 pick
                   '按顺序点，一步一步来',           // dch3 order
                   '还是按顺序，任务更熟悉啦'];      // dch4 order
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；
   前缀=brk_ 已核 manifest 零占用（SPEC §4 2026-09-12 实查）） ---------- */
const VOICE = {
  watch: { key: 'brk_tut_watch', text: '看！大问题拆小问题' },
  turn:  { key: 'brk_tut_turn',  text: '你来拆一拆' },
  hint:  { key: 'brk_hint',      text: '哪几步帮到任务' },
  right: { key: 'brk_right',     text: '拆得好，一步步完成' },
  wrong: { key: 'brk_wrong',     text: '这张卡是别的任务用的' }
};
const Q_TEXT = '大问题拆成小问题，一步一步做';   // 纯文字装饰句（不播——题面真值=目标名 clip+模板链）

/* ---------- 目标表（SPEC §3 定表真值源，照抄禁改：8 目标×5 步=40 卡；
   数组序=定序表（order answer=此序）；GOAL_LABEL=中文名（与 brk_t_* clip
   文案逐字一致——题面链 clip 与文字同源） ---------- */
const GOALS = {
  birthday:   ['定个好日子', '写邀请卡', '准备蛋糕', '布置房间', '请朋友来玩'],
  picnic:     ['看看天气预报', '准备三明治', '装好水壶', '带上野餐垫', '找个好位置'],
  cardmake:   ['想对妈妈说的话', '准备彩纸', '画上爱心', '写上祝福', '送给妈妈'],
  planttree:  ['挑一棵小树苗', '挖一个小坑', '把树苗放进去', '填土浇水', '插上小名牌'],
  bagpack:    ['看清课程表', '拿出不用的书', '放好明天的书', '检查铅笔盒', '拉好拉链'],
  washhand:   ['卷起袖子', '冲湿小手', '抹肥皂搓泡泡', '冲洗干净', '用毛巾擦干'],
  feedrabbit: ['先洗洗小手', '拿新鲜的菜叶', '切成小段', '放进食盆', '添一点水'],
  bedtime:    ['收拾好玩具', '刷牙洗脸', '换上睡衣', '听一个小故事', '关灯睡觉']
};
const GOAL_LABEL = {
  birthday: '办一场生日聚会', picnic: '去公园野餐',   cardmake: '给妈妈做贺卡',
  planttree: '种一棵小树',    bagpack: '整理小书包',  washhand: '洗干净小手',
  feedrabbit: '喂小兔子吃饭', bedtime: '准备上床睡觉'
};
const GOAL_IDS = ['birthday', 'picnic', 'cardmake', 'planttree',
                  'bagpack', 'washhand', 'feedrabbit', 'bedtime'];   // SPEC 表序（生成关抽取池序）
/* 卡 id 编码：goal+'_'+步序（如 birthday_2=准备蛋糕）；卡 label=该步文字
   （40 卡两两字面互异——id 与 label 双唯一，verify 对账锚；渲染/对账均直读
   quiz.cards[].label，不做来源标记——干扰卡不点破来源=SPEC §3 排除法可玩） */

/* ---------- 20 题题表（SPEC §3：章池×5 行，实现定版——目标轮换 8 池取 10 题，
   每章 5 目标互异；ch1-2 pick/ch3-4 order 同轮换；verify 独立硬编码逐行对账。
   行 kind 与 dch 档一致：行 0-9 pick（dch1-2）/行 10-19 order（dch3-4） ---------- */
const QUESTIONS = [
  /* ch1 pick：题行 0-4 */
  { goal: 'birthday',   kind: 'pick' },
  { goal: 'picnic',     kind: 'pick' },
  { goal: 'cardmake',   kind: 'pick' },
  { goal: 'planttree',  kind: 'pick' },
  { goal: 'bagpack',    kind: 'pick' },
  /* ch2 pick：题行 5-9 */
  { goal: 'washhand',   kind: 'pick' },
  { goal: 'feedrabbit', kind: 'pick' },
  { goal: 'bedtime',    kind: 'pick' },
  { goal: 'birthday',   kind: 'pick' },
  { goal: 'picnic',     kind: 'pick' },
  /* ch3 order：题行 10-14 */
  { goal: 'cardmake',   kind: 'order' },
  { goal: 'planttree',  kind: 'order' },
  { goal: 'bagpack',    kind: 'order' },
  { goal: 'washhand',   kind: 'order' },
  { goal: 'feedrabbit', kind: 'order' },
  /* ch4 order：题行 15-19 */
  { goal: 'bedtime',    kind: 'order' },
  { goal: 'birthday',   kind: 'order' },
  { goal: 'picnic',     kind: 'order' },
  { goal: 'cardmake',   kind: 'order' },
  { goal: 'planttree',  kind: 'order' }
];

/* ---------- 目标图标（viewBox 0 0 44 44，目标牌用：主题色底圆牌+白图形——
   图形=目标语义锚（非答案泄漏），8 目标互异可辨） ---------- */
const GOAL_ICON = {
  birthday:   /* 聚会帽+彩球 */
    '<path d="M22 10 L32 32 H12 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="22" cy="9" r="3" fill="#F5C542" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="17" cy="24" r="1.8" fill="#F2B8C6"/><circle cx="26" cy="22" r="1.8" fill="#8FBF7F"/><circle cx="22" cy="28" r="1.8" fill="#9CC8E8"/>' +
    '<path d="M10 34 h24" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>',
  picnic:     /* 野餐篮+盖布 */
    '<path d="M11 20 h22 l-2 14 q-1 3 -4 3 H17 q-3 0 -4 -3 Z" fill="#E8C07A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M14 16 q8 -8 16 0 l-2 4 h-12 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M18 18 h8 M16 22 v9 M22 22 v9 M28 22 v9" stroke="' + INK + '" stroke-width="1.8" opacity=".55"/>',
  cardmake:   /* 贺卡+爱心 */
    '<rect x="10" y="12" width="24" height="20" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M22 26 q-6 -4 -6 -8 q0 -4 4 -3 q2 .6 2 2.6 q0 -2 2 -2.6 q4 -1 4 3 q0 4 -6 8 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M14 28 h6" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>',
  planttree:  /* 树苗+土堆 */
    '<path d="M22 24 q-9 -2 -8 -10 q8 -1 8 10 Z M22 24 q9 -2 8 -10 q-8 -1 -8 10 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M22 24 V12" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M12 32 q10 -6 20 0 v3 H12 Z" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  bagpack:    /* 书包+口袋 */
    '<path d="M13 18 q0 -4 4 -4 h10 q4 0 4 4 v16 q0 3 -3 3 H16 q-3 0 -3 -3 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M17 14 q0 -5 5 -5 q5 0 5 5" fill="none" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="17" y="24" width="10" height="8" rx="2.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M17 20 h10" stroke="' + INK + '" stroke-width="1.8" opacity=".5"/>',
  washhand:   /* 小手+泡泡 */
    '<path d="M16 34 V20 q0 -3 3 -3 q3 0 3 3 v-4 q0 -3 3 -3 q3 0 3 3 v4 q0 -3 3 -3 q3 0 3 3 v10 q0 6 -6 6 h-6 q-6 0 -6 -6 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="12" r="4" fill="none" stroke="#9CC8E8" stroke-width="2.2"/>' +
    '<circle cx="36" cy="20" r="2.6" fill="none" stroke="#9CC8E8" stroke-width="1.8"/>',
  feedrabbit: /* 胡萝卜+叶 */
    '<path d="M34 14 L18 30 q-3 3 -6 3 q1 -4 4 -7 L32 10 Z" fill="#F0933F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M34 14 q6 -6 8 -3 M34 14 q7 -2 8 2" stroke="#8FBF7F" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 20 l3 3 M22 24 l3 3" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>',
  bedtime:    /* 月亮+星 */
    '<path d="M28 10 q-10 2 -10 12 q0 10 10 12 q-14 2 -16 -10 q-2 -13 16 -14 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M32 16 l1.6 3.2 3.4.4 -2.5 2.4 .6 3.4 -3.1 -1.7 -3.1 1.7 .6 -3.4 -2.5 -2.4 3.4 -.4 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>'
};
function goalSvg(id) {
  const el = GOAL_ICON[id] || GOAL_ICON.birthday;
  return '<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + el + '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 大问题牌拆成三小卡（拆解主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="9" y="8" width="18" height="12" rx="2.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="10" y="24" width="11" height="11" rx="2.2" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="23" y="24" width="11" height="11" rx="2.2" fill="#A8C4E8" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M18 20 l-4 4 M18 20 l4 4" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/></svg>',
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
