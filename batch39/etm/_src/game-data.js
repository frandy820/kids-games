/* ================= etm 表情温度计 游戏数据（r49 难度改造：40 题封闭题库 /
   4 情绪脸谱 + 5 强度档位 + 4 混合情绪双拼脸 / 40 情境插画 SVG / 章配置 / 语音文案）
   r49 改造（SPEC-R49-ETM，承接 AUDIT-67 行 39 黄款「ch1-2 情境直白=3-4 岁配对；
   ch3-4 强度三档是真内容」——只加深不换玩法）：
   ① ch2 face 族升间接情境（事件→情绪改为线索推理：小金鱼浮水面/存钱罐够钱/
     黑房间衣柜门开——情绪不直给，须一步推理，插画仍只画事件不泄答案）；
   ② ch3 level 族三档升五档（有点生气/生气/很生气/非常生气/要爆发了——温度计
     data-lv 1-5 升位 20%/40%/60%/80%/93%，相邻档水银差=20%×108px≈21.6px；
     梯度线索重设计为「无意轻微→蓄意单次→重复持续→故意破坏→破坏+羞辱」五级
     后果阶梯，替换 b39 P2-1 副词级 subtle 线索——每档一个签名线索类，禁跨类）；
   ③ ch4 改混合情绪族（mix：一张双拼脸=左半 A 情绪+右半 B 情绪，题面两分句
     各锚一种情绪，候选=4 组合脸全出，答案组合唯一——SPEC §R4 先验：每 mix 题
     文本恰含其两个情绪的线索词、零第三情绪线索词）；
   ④ 题库 20→40：静态 20（章池 5 题）+生成关扩展池 20（每 dch 池 10 题）；
   ⑤ flat0 教学锚逐字节保留（ch1 rows0-4+FACES+seed867 不动——flat0-4 谱与
     baseline 逐字段一致，_r49_pycheck 对账）。
   语音前缀 etm_（emo_ 被 b25 占用）；r49 新增 22 键 etm_sc_<新场景> 两段制
   段一只设计不注册（SPEC §R6 键表），落空走 T46 阶段3 静默（无系统 TTS 回退）
   ——段二主线注册后恢复 clip 播报。
   玩法框架/星级口径（miss 计）/救援双锚（14s 方向级 lastDir 独立+30s 答案级
   lastAct）/错反馈两级/演出窗常量全部承基线（SPEC-R49 §R1 不变项表）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（承 b39 定版，r49 零改动；2026-09-12 浏览器实测）
   etm_tut_watch 3240 / etm_tut_turn 1848 / etm_hint 2088 / etm_right 1632 / etm_wrong 2088
   确认链窗 CELE_WIN=1932（=1632+300 精确）；错链豁免窗 WRONG_CHAIN_WIN=4626
   （=2088+150+2088+300）；题面情境句窗=estMs(句长)+300（家族 T 动态，r49 题表句
   6-17 字 estMs 2670-6465）；选中演出窗 PICK_MS=1000；错反馈项摇头锁
   BOUNCE_MS=1100（≤wrong 2088+150=2238——b37 R3 首错演出锁禁覆盖豁免窗）。 ---------- */
const ENTER_MS = 400;                        // 情境卡出场动画窗（与题面 TTS 并行）
const PICK_MS = 1000;                        // 正确项选中演出窗（温度计升位/脸谱放大）
const CELE_WIN = 1932;                       // 确认链窗 = etm_right 1632+300（精确）
const BOUNCE_MS = 1100;                      // 错选项摇头+弹回锁窗（≤2238，b37 R3）
const WRONG_CHAIN_WIN = 4626;                // 错链豁免窗=etm_wrong 2088+150+etm_hint 2088+300（真时钟）
const TUT_WATCH_WAIT = 3540;                 // ≥etm_tut_watch 3240+300
const TUT_TURN_WAIT = 2148;                  // ≥etm_tut_turn 1848+300
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- 章配置（r49：ch1 face 直白/ch2 face 间接/ch3 level 五档/ch4 mix 混合；
   进度章号单调递增、难度章号 dch=1+flat//5 静态四档；生成关 flat≥20 dch=ri(rnd,1,4)
   seeded mulberry32(flat*7919+867)——本款常量 867 承基线）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言） ---------- */
const CHAPTERS = {
  1: { name: '认识心情',     hint: '心情藏着线索，仔细听一听' },   // 预告 ch2 face 间接情境
  2: { name: '心情小侦探',   hint: '生气还有大小，温度计来啦' },   // 预告 ch3 level 五档
  3: { name: '心情温度计',   hint: '有时候心情有两个，来找一找' }, // 预告 ch4 mix 混合情绪
  4: { name: '复杂心情',     hint: '新的心情情境来啦，继续指一指' } // 预告生成关
};
const GEN_HINTS = ['听一听，指一指心情脸',        // dch1 face 直白 4 脸
                   '心情线索藏起来啦，仔细听',    // dch2 face 间接
                   '生气有多大，看温度计指一指',  // dch3 level 五档
                   '有两种心情的，指那张双拼脸']; // dch4 mix 混合
const CH_LEN = 5;          // 5 题 = 1 关（承基线——档键基不变，无迁移 IIFE 需求）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章（承基线）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=etm_
   r49 段一在册 25 键（5 系统+20 旧情境句）；22 新情境句键两段制不注册（SPEC §R6）） ---------- */
const VOICE = {
  watch: { key: 'etm_tut_watch', text: '看！现在心情怎么样' },
  turn:  { key: 'etm_tut_turn',  text: '你来指一指' },
  hint:  { key: 'etm_hint',      text: '听听发生了什么' },
  right: { key: 'etm_right',     text: '你说对啦' },
  wrong: { key: 'etm_wrong',     text: '再听一次想想哦' }
};
const Q_TEXT = '听一听，指一指心情';           // 纯文字装饰句（不播——题面真值=情境句 TTS）

/* ---------- 情绪/档位/混合封闭集（SPEC-R49 §R3：face 族 4 脸原型分离；
   level 族 5 档同一脸谱强度化+水银柱 1-5 格；mix 族 4 组合=6 配对中取
   happy-scared/happy-sad/angry-sad/angry-scared（4 基情绪各恰现 2 次——平衡环） ---------- */
const FACES = [
  { id: 'happy',  name: '开心' },
  { id: 'angry',  name: '生气' },
  { id: 'sad',    name: '难过' },
  { id: 'scared', name: '害怕' }
];
const LEVELS = [
  { id: 'l1', name: '有点生气' },
  { id: 'l2', name: '生气' },
  { id: 'l3', name: '很生气' },
  { id: 'l4', name: '非常生气' },
  { id: 'l5', name: '要爆发了' }
];
const MIXES = [
  { id: 'happy+scared', name: '又开心又害怕', a: 'happy',  b: 'scared' },
  { id: 'happy+sad',    name: '又开心又难过', a: 'happy',  b: 'sad'    },
  { id: 'angry+sad',    name: '又生气又难过', a: 'angry',  b: 'sad'    },
  { id: 'angry+scared', name: '又生气又害怕', a: 'angry',  b: 'scared' }
];
const faceName = id => (FACES.find(f => f.id === id) || FACES[0]).name;
const levelName = id => (LEVELS.find(l => l.id === id) || LEVELS[0]).name;
const mixName = id => (MIXES.find(m => m.id === id) || MIXES[0]).name;
const pickName = (kind, id) => (kind === 'face' ? faceName(id) : kind === 'level' ? levelName(id) : mixName(id));

/* ---------- 40 题封闭题库（SPEC-R49 §R3 全表；scene=情境 id 唯一定位行；
   kind='face' 命名 | 'level' 分级 | 'mix' 混合；text=情境句全文（=quiz.say 题面
   keyless TTS 真值源，verify 双录对账）；ans=期望情绪/档位/组合 id。
   先验（SPEC §R4 验算，pycheck/verify 双侧脚本复验）：
   face 直白 10=行为动词+指向明确（承 b39）；face 间接 10=单一情绪可推（事件线索
   唯一指向，插画零表情）；level 10=五级后果阶梯各恰 2 题、每题恰含本档签名线索
   （不小心/轻轻=l1；抢走/插队=l2；一直/总是=l3；故意=l4；还笑/做鬼脸=l5）；
   mix 10=每题文本恰含其组合两情绪线索词（开心/气类/难过类/怕类）、零第三情绪词，
   每组合 ≥2 题。分布：face 20 题 happy7/angry3/sad4/scared6（各 ≥3）。 ---------- */
const QUESTIONS = [
  /* ch1 face·直白情境：题 0-4（flat0 教学锚——r49 逐字节保留） */
  { scene: 'flower',   kind: 'face',  text: '朋友送你一朵小花',       ans: 'happy' },
  { scene: 'blocksdown', kind: 'face', text: '妹妹把你的积木推倒了',   ans: 'angry' },
  { scene: 'balloonfly', kind: 'face', text: '心爱的气球飞走了',       ans: 'sad' },
  { scene: 'thunder',  kind: 'face',  text: '打雷轰隆隆响',           ans: 'scared' },
  { scene: 'singsong', kind: 'face',  text: '大家一起唱歌',           ans: 'happy' },
  /* ch2 face·间接情境（r49 新）：题 5-9——情绪不直给，一步推理 */
  { scene: 'fishfloat',  kind: 'face', text: '你的小金鱼不动了，浮在水面上',   ans: 'sad' },
  { scene: 'dooropen',   kind: 'face', text: '关了灯的房间，衣柜门吱呀开了',   ans: 'scared' },
  { scene: 'coinbank',   kind: 'face', text: '存钱罐里的钱，正好够买那个玩具', ans: 'happy' },
  { scene: 'sacktower',  kind: 'face', text: '辛苦搭的高塔被人扫倒，他转身就走', ans: 'angry' },
  { scene: 'artshow',    kind: 'face', text: '你的画被选去展览，大家都停下来看', ans: 'happy' },
  /* ch3 level·五档阶梯（r49 重排）：题 10-14——l1→l5 单调后果阶梯 */
  { scene: 'crayondrop', kind: 'level', text: '有人不小心碰掉了你的蜡笔', ans: 'l1' },
  { scene: 'snatchtoy',  kind: 'level', text: '有人抢走你手里的玩具',   ans: 'l2' },
  { scene: 'swinggrab',  kind: 'level', text: '有人一直抢你的秋千',     ans: 'l3' },
  { scene: 'castlekick', kind: 'level', text: '辛苦搭的城堡被故意踢倒', ans: 'l4' },
  { scene: 'ruinlaugh',  kind: 'level', text: '有人弄坏了你的画还笑你', ans: 'l5' },
  /* ch4 mix·混合情绪（r49 新）：题 15-19——两分句各锚一情绪，双拼脸唯一 */
  { scene: 'bookrip',    kind: 'mix', text: '绘本被撕坏了，你又气又难过',       ans: 'angry+sad' },
  { scene: 'funfair',    kind: 'mix', text: '明天去游乐园，你开心又有点怕下雨', ans: 'happy+scared' },
  { scene: 'friendmove', kind: 'mix', text: '好朋友要搬走了，你为他开心又舍不得', ans: 'happy+sad' },
  { scene: 'bullyshout', kind: 'mix', text: '有人抢你玩具还凶你，你又怕又生气', ans: 'angry+scared' },
  { scene: 'stageshow',  kind: 'mix', text: '要上台表演啦，你开心又怕忘动作',   ans: 'happy+scared' },
  /* 生成关扩展池 dch1 face·直白（旧 ch2 迁入，题面/答照录）：题 20-24 */
  { scene: 'painting', kind: 'face',  text: '你的画被弄坏了',   ans: 'sad' },
  { scene: 'shoutloud', kind: 'face', text: '有人对你大喊大叫', ans: 'scared' },
  { scene: 'towertop', kind: 'face',  text: '你搭的高塔成功了', ans: 'happy' },
  { scene: 'grabtoy',  kind: 'face',  text: '玩具被人抢走了',   ans: 'angry' },
  { scene: 'lostmom',  kind: 'face',  text: '迷路找不到妈妈',   ans: 'scared' },
  /* 生成关扩展池 dch2 face·间接（r49 新）：题 25-29 */
  { scene: 'rainpicnic', kind: 'face', text: '期待好久的野餐，早上下起了大雨', ans: 'sad' },
  { scene: 'darkhole',   kind: 'face', text: '球滚进黑黑的地下室，你不敢进去捡', ans: 'scared' },
  { scene: 'grandma',    kind: 'face', text: '远方的奶奶坐了很久的车，来看你了', ans: 'happy' },
  { scene: 'nightnoise', kind: 'face', text: '半夜轰隆一声响，你从梦里惊醒了',   ans: 'scared' },
  { scene: 'kitewin',    kind: 'face', text: '风筝掉下来好多次，终于飞上了天',   ans: 'happy' },
  /* 生成关扩展池 dch3 level（r49 五档）：题 30-34——五档各 1 */
  { scene: 'stepfoot',   kind: 'level', text: '排队时被轻轻踩了一脚',       ans: 'l1' },
  { scene: 'queuejump',  kind: 'level', text: '有人插队，一下站到了你的前面', ans: 'l2' },
  { scene: 'interrupt',  kind: 'level', text: '你说话总是被人打断',         ans: 'l3' },
  { scene: 'modelcrush', kind: 'level', text: '有人故意踩坏了你拼好的飞机', ans: 'l4' },
  { scene: 'tearbook',   kind: 'level', text: '有人撕了你的故事书还做鬼脸', ans: 'l5' },
  /* 生成关扩展池 dch4 mix（r49 新）：题 35-39 */
  { scene: 'puzzlelost', kind: 'mix', text: '拼图被弄丢了，你又气又想哭',       ans: 'angry+sad' },
  { scene: 'gradfare',   kind: 'mix', text: '拿到毕业奖状很开心，又舍不得老师', ans: 'happy+sad' },
  { scene: 'bigkidpush', kind: 'mix', text: '有人抢了你的球还推人，你又怕又生气', ans: 'angry+scared' },
  { scene: 'legobroke',  kind: 'mix', text: '乐高被踩坏了，你又生气又心疼',     ans: 'angry+sad' },
  { scene: 'racefirst',  kind: 'mix', text: '明天要比赛了，你开心又怕输',       ans: 'happy+scared' }
];
/* 本题候选池 id 集（face 4 脸/level 5 档/mix 4 组合全出——SPEC §R3） */
const poolOf = kind => (kind === 'face' ? FACES : kind === 'level' ? LEVELS : MIXES).map(x => x.id);

/* ---------- 情绪脸谱 SVG（4 张，viewBox 0 0 100 100，粗描边大色块简笔——
   原型分离判据（承 b39）：happy 嘴角上翘+笑眼；angry 眉毛内压+抿嘴+怒纹；
   sad 八字眉+眼泪+嘴角下垂；scared 眉毛高挑+睁大眼+O 嘴+汗滴。
   图形互异不靠颜色歧视（色仅氛围辅助，原型=形状语言） ---------- */
const FACE_EL = {
  happy:   /* 开心：笑眼上弯+大翘嘴+脸颊红晕 */
    '<circle cx="50" cy="52" r="34" fill="#F7D154" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M31 46 q7 -9 14 0" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M55 46 q7 -9 14 0" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M35 60 q15 16 30 0" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>' +
    '<ellipse cx="26" cy="59" rx="6" ry="4" fill="#F2A6A0" opacity=".65"/>' +
    '<ellipse cx="74" cy="59" rx="6" ry="4" fill="#F2A6A0" opacity=".65"/>',
  angry:   /* 生气：眉毛内端下压+小眼点+嘴下弯+头顶怒纹+怒红晕 */
    '<path d="M46 20 l-5 -9 M54 20 l5 -9" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="52" r="34" fill="#F2A65A" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M29 37 l17 8 M71 37 l-17 8" stroke="' + INK + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="41" cy="51" r="3.6" fill="' + INK + '"/><circle cx="59" cy="51" r="3.6" fill="' + INK + '"/>' +
    '<path d="M38 69 q12 9 24 0" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>' +
    '<ellipse cx="28" cy="59" rx="7" ry="5" fill="#E86A5E" opacity=".5"/>' +
    '<ellipse cx="72" cy="59" rx="7" ry="5" fill="#E86A5E" opacity=".5"/>',
  sad:     /* 难过：八字眉（内端上挑）+眼泪两滴+嘴角下垂弧 */
    '<circle cx="50" cy="52" r="34" fill="#A8C4E8" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M31 42 l15 -6 M69 42 l-15 -6" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="52" r="3.6" fill="' + INK + '"/><circle cx="60" cy="52" r="3.6" fill="' + INK + '"/>' +
    '<path d="M42 58 q-5 9 0 12 q5 -3 0 -12 Z" fill="#7FB3DE" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M58 58 q-4 7 0 9 q4 -2 0 -9 Z" fill="#7FB3DE" stroke="' + INK + '" stroke-width="1.4"/>' +
    '<path d="M38 72 q12 -11 24 0" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
  scared:  /* 害怕：眉毛高挑+睁大圆眼+O 型张嘴+太阳穴汗滴 */
    '<path d="M30 36 q8 -8 15 -3 M70 36 q-8 -8 -15 -3" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="50" cy="52" r="34" fill="#EDE3D2" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="40" cy="50" r="6.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="60" cy="50" r="6.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="40" cy="50" r="2.8" fill="' + INK + '"/><circle cx="60" cy="50" r="2.8" fill="' + INK + '"/>' +
    '<ellipse cx="50" cy="69" rx="7.5" ry="10" fill="#C98A6B" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M81 44 q-6 10 0 13 q6 -3 0 -13 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>'
};
function faceSvg(id) {
  const el = FACE_EL[id] || FACE_EL.happy;
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g data-anim="' + (id || 'happy') + '">' + el + '</g></svg>';
}

/* ---------- 强度档位 SVG（r49 五档，viewBox 0 0 100 112：生气脸谱强度化
   （同一原型单调递进：眉压角度/嘴形紧抿/怒纹对数/红晕浓度单调升）+底部横温度计条
   （水银填充 1/5..5/5——宽 10/19/29/38/48，强度隐喻小样；主舞台另有立式大温度计
   data-lv 1-5 对应 20%/40%/60%/80%/93%——相邻档水银差 20%×108px≈21.6px 可辨） ---------- */
const LEVEL_EL = {
  l1:   /* 有点生气：眉微斜+嘴平线+淡晕+水银 1/5 */
    '<circle cx="50" cy="46" r="29" fill="#F2C08A" stroke="' + INK + '" stroke-width="3.8"/>' +
    '<path d="M32 34 l13 4 M68 34 l-13 4" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="41" cy="44" r="3.2" fill="' + INK + '"/><circle cx="59" cy="44" r="3.2" fill="' + INK + '"/>' +
    '<path d="M40 58 h20" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<ellipse cx="30" cy="52" rx="5.5" ry="4" fill="#E86A5E" opacity=".3"/>' +
    '<ellipse cx="70" cy="52" rx="5.5" ry="4" fill="#E86A5E" opacity=".3"/>' +
    '<circle cx="19" cy="100" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="19" cy="100" r="4" fill="#E8A98A"/>' +
    '<rect x="27" y="95" width="54" height="10" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="30" y="98" width="10" height="4" rx="2" fill="#E8836A"/>',
  l2:   /* 生气：眉斜压+嘴下弯+轻晕+水银 2/5 */
    '<circle cx="50" cy="46" r="29" fill="#F0AC6E" stroke="' + INK + '" stroke-width="3.8"/>' +
    '<path d="M29 32 l15 7 M71 32 l-15 7" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="41" cy="45" r="3.2" fill="' + INK + '"/><circle cx="59" cy="45" r="3.2" fill="' + INK + '"/>' +
    '<path d="M40 60 q10 6 20 0" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<ellipse cx="29" cy="53" rx="6.5" ry="4.5" fill="#E86A5E" opacity=".4"/>' +
    '<ellipse cx="71" cy="53" rx="6.5" ry="4.5" fill="#E86A5E" opacity=".4"/>' +
    '<circle cx="19" cy="100" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="19" cy="100" r="4" fill="#E8987A"/>' +
    '<rect x="27" y="95" width="54" height="10" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="30" y="98" width="19" height="4" rx="2" fill="#E86A5E"/>',
  l3:   /* 很生气：眉下压+嘴下弯深+怒纹一对+中晕+水银 3/5 */
    '<path d="M46 16 l-4 -7 M54 16 l4 -7" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="46" r="29" fill="#EC9E6A" stroke="' + INK + '" stroke-width="3.8"/>' +
    '<path d="M27 30 l17 8 M73 30 l-17 8" stroke="' + INK + '" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="46" r="3.2" fill="' + INK + '"/><circle cx="60" cy="46" r="3.2" fill="' + INK + '"/>' +
    '<path d="M39 62 q11 9 22 0" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<ellipse cx="28" cy="54" rx="7" ry="5" fill="#E86A5E" opacity=".5"/>' +
    '<ellipse cx="72" cy="54" rx="7" ry="5" fill="#E86A5E" opacity=".5"/>' +
    '<circle cx="19" cy="100" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="19" cy="100" r="4" fill="#E8836A"/>' +
    '<rect x="27" y="95" width="54" height="10" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="30" y="98" width="29" height="4" rx="2" fill="#E86A5E"/>',
  l4:   /* 非常生气：眉倒竖粗+嘴紧抿深弯+怒纹粗一对+重晕+水银 4/5 */
    '<path d="M45 14 l-4 -8 M55 14 l4 -8" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="46" r="29" fill="#E8946E" stroke="' + INK + '" stroke-width="3.8"/>' +
    '<path d="M27 28 l17 9 M73 28 l-17 9" stroke="' + INK + '" stroke-width="3.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="46" r="3.2" fill="' + INK + '"/><circle cx="60" cy="46" r="3.2" fill="' + INK + '"/>' +
    '<path d="M39 63 q11 10 22 0" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<ellipse cx="27" cy="54" rx="7.5" ry="5" fill="#E86A5E" opacity=".65"/>' +
    '<ellipse cx="73" cy="54" rx="7.5" ry="5" fill="#E86A5E" opacity=".65"/>' +
    '<circle cx="19" cy="100" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="19" cy="100" r="4" fill="#D9714F"/>' +
    '<rect x="27" y="95" width="54" height="10" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="30" y="98" width="38" height="4" rx="2" fill="#E05A48"/>',
  l5:   /* 要爆发了：眉倒竖+咬牙锯齿+怒气符两对+大红晕+水银满格 */
    '<path d="M42 10 l-4 -7 M42 10 l4 -7 M58 10 l-4 -7 M58 10 l4 -7" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="46" r="29" fill="#E28A62" stroke="' + INK + '" stroke-width="3.8"/>' +
    '<path d="M27 28 l17 9 M73 28 l-17 9" stroke="' + INK + '" stroke-width="3.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="40" cy="46" r="3.2" fill="' + INK + '"/><circle cx="60" cy="46" r="3.2" fill="' + INK + '"/>' +
    '<path d="M37 60 l6 -5 l6 5 l6 -5 l6 5" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>' +
    '<ellipse cx="27" cy="54" rx="7.5" ry="5" fill="#E86A5E" opacity=".65"/>' +
    '<ellipse cx="73" cy="54" rx="7.5" ry="5" fill="#E86A5E" opacity=".65"/>' +
    '<circle cx="19" cy="100" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="19" cy="100" r="4" fill="#D94F3D"/>' +
    '<rect x="27" y="95" width="54" height="10" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="30" y="98" width="48" height="4" rx="2" fill="#D94F3D"/>'
};
function levelSvg(id) {
  const el = LEVEL_EL[id] || LEVEL_EL.l1;
  return '<svg viewBox="0 0 100 112" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g data-anim="' + (id || 'l1') + '">' + el + '</g></svg>';
}

/* ---------- 混合情绪双拼脸（r49 新，4 张，viewBox 0 0 100 100）：
   左半圆=A 情绪底色+左眼眉+左配件+左半嘴，右半圆=B 情绪底色+右眼眉+右配件+
   右半嘴——中线处两半嘴错位相接=「两种心情同时在」的视觉隐喻（有意设计，非缺陷）。
   判别特征每情绪 ≥3（眼形/眉形/配件/半嘴形互异，色仅辅助）。 ---------- */
const MIX_COLOR = { happy: '#F7D154', angry: '#F2A65A', sad: '#A8C4E8', scared: '#EDE3D2' };
const MIX_HALF = {
  happy: {
    eyeL: '<path d="M31 46 q7 -9 14 0" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>',
    eyeR: '<path d="M55 46 q7 -9 14 0" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>',
    accL: '<ellipse cx="24" cy="58" rx="6" ry="4" fill="#F2A6A0" opacity=".65"/>',
    accR: '<ellipse cx="76" cy="58" rx="6" ry="4" fill="#F2A6A0" opacity=".65"/>',
    mouthL: '<path d="M50 68 Q42.5 68 35 60" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
    mouthR: '<path d="M50 68 Q57.5 68 65 60" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>'
  },
  angry: {
    eyeL: '<path d="M29 37 l17 8" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="41" cy="51" r="3.6" fill="' + INK + '"/>',
    eyeR: '<path d="M71 37 l-17 8" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="59" cy="51" r="3.6" fill="' + INK + '"/>',
    accL: '<path d="M46 20 l-5 -9" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
    accR: '<path d="M54 20 l5 -9" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
    mouthL: '<path d="M50 73.5 Q44 73.5 38 69" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
    mouthR: '<path d="M50 73.5 Q56 73.5 62 69" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>'
  },
  sad: {
    eyeL: '<path d="M31 42 l15 -6" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="40" cy="52" r="3.6" fill="' + INK + '"/>',
    eyeR: '<path d="M69 42 l-15 -6" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/><circle cx="60" cy="52" r="3.6" fill="' + INK + '"/>',
    accL: '<path d="M42 58 q-5 9 0 12 q5 -3 0 -12 Z" fill="#7FB3DE" stroke="' + INK + '" stroke-width="1.6"/>',
    accR: '<path d="M58 58 q-4 7 0 9 q4 -2 0 -9 Z" fill="#7FB3DE" stroke="' + INK + '" stroke-width="1.4"/>',
    mouthL: '<path d="M50 66.5 Q44 66.5 38 72" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>',
    mouthR: '<path d="M50 66.5 Q56 66.5 62 72" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>'
  },
  scared: {
    eyeL: '<path d="M30 36 q8 -8 15 -3" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/><circle cx="40" cy="50" r="6.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8"/><circle cx="40" cy="50" r="2.8" fill="' + INK + '"/>',
    eyeR: '<path d="M70 36 q-8 -8 -15 -3" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/><circle cx="60" cy="50" r="6.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8"/><circle cx="60" cy="50" r="2.8" fill="' + INK + '"/>',
    accL: '<path d="M21 40 q-6 10 0 13 q6 -3 0 -13 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
    accR: '<path d="M81 44 q-6 10 0 13 q6 -3 0 -13 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
    mouthL: '<path d="M50 59 A7.5 10 0 0 0 50 79 Z" fill="#C98A6B" stroke="' + INK + '" stroke-width="3"/>',
    mouthR: '<path d="M50 59 A7.5 10 0 0 1 50 79 Z" fill="#C98A6B" stroke="' + INK + '" stroke-width="3"/>'
  }
};
const MIX_EL = {};
MIXES.forEach(function (m) {
  MIX_EL[m.id] =
    '<path d="M50 18 A34 34 0 0 0 50 86 Z" fill="' + MIX_COLOR[m.a] + '"/>' +
    '<path d="M50 18 A34 34 0 0 1 50 86 Z" fill="' + MIX_COLOR[m.b] + '"/>' +
    '<circle cx="50" cy="52" r="34" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
    MIX_HALF[m.a].eyeL + MIX_HALF[m.b].eyeR +
    MIX_HALF[m.a].accL + MIX_HALF[m.b].accR +
    MIX_HALF[m.a].mouthL + MIX_HALF[m.b].mouthR;
});
function mixSvg(id) {
  const el = MIX_EL[id] || MIX_EL[MIXES[0].id];
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g data-anim="' + (id || MIXES[0].id) + '">' + el + '</g></svg>';
}
function pickSvg(kind, id) {
  return kind === 'face' ? faceSvg(id) : kind === 'level' ? levelSvg(id) : mixSvg(id);
}

/* ---------- 情境插画 SVG（40 张，viewBox 0 0 120 90，事件性简笔场景——
   画事件不画表情（情绪承载在情境句 TTS+候选脸谱，插画不泄答案；r49 间接情境
   同律：金鱼翻肚/黑门半开/存钱罐+价签——只画线索不画反应；人物一律背影/无脸）；
   根组 g[data-anim=<scene id>]，verify 单元①断言全定义（渲染即引擎）。
   r49 退役 2 景：paintspill/longwait（五档重排后无题引用——manifest 键仍注入，
   段二主线裁量清退） ---------- */
const SCENE_EL = {
  flower:   /* 朋友送你一朵小花：双手捧+花+小心 */
    '<path d="M52 84 q-16 -6 -26 -2 M52 84 q16 -6 26 -2" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M60 82 V52" stroke="#7A9B5A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M60 50 l-11 8 l4 -13 l-13 -1 l11 -8 l-6 -12 l13 5 l2 -13 l6 12 l11 -7 l-5 13 l13 4 l-13 5 Z" fill="#F2A6B8" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="60" cy="46" r="7" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M22 30 q2 -8 8 -8 M26 22 q2 -6 6 -6" fill="none" stroke="#E8975A" stroke-width="2.6" stroke-linecap="round"/>',
  blocksdown: /* 妹妹把你的积木推倒了：斜倒积木+运动线 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="18" y="56" width="22" height="20" rx="3" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3" transform="rotate(-18 29 66)"/>' +
    '<rect x="46" y="60" width="22" height="20" rx="3" fill="#F2B26B" stroke="' + INK + '" stroke-width="3" transform="rotate(24 57 70)"/>' +
    '<rect x="72" y="62" width="22" height="18" rx="3" fill="#A8CC8F" stroke="' + INK + '" stroke-width="3" transform="rotate(-8 83 71)"/>' +
    '<path d="M92 52 q8 -4 12 2 M96 44 q8 -3 10 3" fill="none" stroke="#C9A87C" stroke-width="2.6" stroke-linecap="round"/>',
  balloonfly: /* 心爱的气球飞走了：气球升空+下方小手够 */
    '<ellipse cx="58" cy="24" rx="16" ry="19" fill="#E8A0A8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M58 43 q-2 4 0 7 q2 -3 0 -7" fill="none" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M58 50 q-4 10 2 20" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M60 70 q-12 -4 -18 4" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M42 74 q-6 0 -8 6 q8 2 10 -2 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M84 18 l2 8 M84 18 l-7 4" stroke="#C9A87C" stroke-width="2.4" stroke-linecap="round"/>',
  thunder:  /* 打雷轰隆隆响：黑云+闪电+雨点 */
    '<path d="M28 34 q-14 0 -12 -12 q2 -10 14 -8 q4 -10 18 -8 q12 2 12 12 q12 0 10 10 q-2 8 -14 6 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M62 36 l-16 16 h10 l-8 18 l22 -24 h-11 l9 -10 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M24 52 q-3 6 0 8 q3 -2 0 -8 Z M34 62 q-3 6 0 8 q3 -2 0 -8 Z M90 50 q-3 6 0 8 q3 -2 0 -8 Z M82 64 q-3 6 0 8 q3 -2 0 -8 Z" fill="#9CC8E8"/>' +
    '<path d="M52 78 q8 -4 14 0" fill="none" stroke="#C9A87C" stroke-width="2.4" stroke-linecap="round"/>',
  singsong: /* 大家一起唱歌：大小音符+声波 */
    '<path d="M40 20 v34 l22 -6 V14 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="34" cy="58" r="9" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="56" cy="52" r="9" fill="#F2B26B" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M76 26 v22 l14 -4 V22 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="72" cy="50" r="6.5" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M92 58 q4 6 0 12 M100 52 q7 10 0 24" fill="none" stroke="#C9A87C" stroke-width="2.6" stroke-linecap="round"/>',
  fishfloat:  /* r49 你的小金鱼不动了浮在水面上：鱼缸+水面翻肚小鱼 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M32 38 q28 -20 56 0 l-8 30 q-20 9 -40 0 Z" fill="#BFE0F2" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="40" rx="24" ry="4.5" fill="#9CC8E8" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<g transform="rotate(180 60 33)"><ellipse cx="60" cy="33" rx="9" ry="5.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/><path d="M51 33 l-8 -5 v10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/><circle cx="63" cy="31.5" r="1.2" fill="' + INK + '"/></g>' +
    '<circle cx="30" cy="60" r="2.6" fill="#9CC8E8"/><circle cx="88" cy="64" r="2.2" fill="#9CC8E8"/>',
  dooropen:   /* r49 关了灯的房间衣柜门吱呀开了：暗房+月牙+半开黑门缝 */
    '<rect x="12" y="8" width="96" height="68" rx="6" fill="#5E6B7E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="93" cy="22" r="7.5" fill="#F5E9B8" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="90" cy="20" r="6" fill="#5E6B7E"/>' +
    '<rect x="30" y="24" width="48" height="50" rx="4" fill="#8A6F52" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M30 24 h17 v50 h-17 Z" fill="#2E3947" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="52" cy="49" r="2.4" fill="#F5E9B8"/>' +
    '<path d="M20 68 q5 -6 10 -4" fill="none" stroke="#C9A87C" stroke-width="2.4" stroke-linecap="round"/>',
  coinbank:   /* r49 存钱罐的钱正好够买那个玩具：存钱罐+硬币塔+价签 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="52" cy="54" rx="21" ry="15" fill="#F2A6B8" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="31" cy="47" r="8" fill="#F2A6B8" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M28 40 l3 -7 l6 5 Z" fill="#F2A6B8" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="28" cy="46" r="1.6" fill="' + INK + '"/>' +
    '<path d="M44 67 v6 M60 67 v6" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="46" y="37" width="12" height="3.5" rx="1.7" fill="' + INK + '"/>' +
    '<circle cx="86" cy="66" r="6.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="86" cy="59" r="6.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="86" cy="52" r="6.5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="70" y="12" width="26" height="15" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" transform="rotate(6 83 20)"/>' +
    '<path d="M76 19 h14 M76 24 h9" stroke="#A8C4E8" stroke-width="2.4" stroke-linecap="round" transform="rotate(6 83 20)"/>',
  sacktower:  /* r49 辛苦搭的高塔被人扫倒他转身就走：斜倒积木+背包背影 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="16" y="58" width="24" height="18" rx="3" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3" transform="rotate(-14 28 67)"/>' +
    '<rect x="44" y="62" width="24" height="16" rx="3" fill="#F2B26B" stroke="' + INK + '" stroke-width="3" transform="rotate(18 56 70)"/>' +
    '<rect x="70" y="64" width="22" height="14" rx="3" fill="#A8CC8F" stroke="' + INK + '" stroke-width="3" transform="rotate(-8 81 71)"/>' +
    '<circle cx="98" cy="36" r="8" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M98 44 v18" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M98 48 l-9 6 M98 48 l8 8 M98 62 l-5 11 M98 62 l6 10" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M90 56 q-10 -4 -9 -13 l9 4 Z" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M14 46 q8 -5 14 0 M20 38 q8 -4 14 1" fill="none" stroke="#C9A87C" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="5 4"/>',
  artshow:    /* r49 你的画被选去展览大家都停下来看：画架+画+背影观众 */
    '<path d="M34 72 L47 24 M60 72 L47 24 M40 48 h14" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="28" y="26" width="36" height="28" rx="2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M33 48 l10 -10 l7 6 l9 -12" fill="none" stroke="#A8CC8F" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="56" cy="32" r="4" fill="#F5C542" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M31 30 l1.6 4 l4 .5 l-3 3 l.8 4 l-3.4 -2 l-3.4 2 l.8 -4 l-3 -3 l4 -.5 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="84" cy="50" r="7" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M75 72 q9 -12 18 0 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="102" cy="56" r="6" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M94 72 q8 -10 16 0 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2.6"/>',
  crayondrop: /* 有人不小心碰掉了你的蜡笔：倾倒笔盒+散落蜡笔 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="18" y="52" width="34" height="18" rx="3" fill="#E8C07A" stroke="' + INK + '" stroke-width="3" transform="rotate(-14 35 61)"/>' +
    '<rect x="62" y="66" width="22" height="7" rx="3.5" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-8 73 69)"/>' +
    '<rect x="78" y="60" width="22" height="7" rx="3.5" fill="#7FB3DE" stroke="' + INK + '" stroke-width="2.2" transform="rotate(10 89 63)"/>' +
    '<rect x="58" y="58" width="18" height="7" rx="3.5" fill="#A8CC8F" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-26 67 61)"/>' +
    '<path d="M90 44 l4 6 M98 40 l3 6" stroke="#C9A87C" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M42 40 q6 -6 12 -2" fill="none" stroke="#E8975A" stroke-width="2.4" stroke-linecap="round"/>',
  snatchtoy:  /* 有人抢走你手里的玩具：两双手对拽一个球 */
    '<circle cx="60" cy="50" r="15" fill="#E8975A" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M60 42 l-3 8 h6 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M45 50 q-14 -2 -22 4" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M75 50 q14 -2 22 4" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M20 54 q-5 2 -4 8 q7 0 8 -4 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M100 54 q5 2 4 8 q-7 0 -8 -4 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M14 40 l6 4 M106 40 l-6 4" stroke="#E86A5E" stroke-width="2.8" stroke-linecap="round"/>' +
    '<path d="M60 22 v6 M52 25 l4 5 M68 25 l-4 5" stroke="#E86A5E" stroke-width="2.6" stroke-linecap="round"/>',
  ruinlaugh:  /* 有人弄坏了你的画还笑你：破画+嘲笑嘴符 */
    '<rect x="16" y="14" width="46" height="52" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M24 56 l10 -14 l8 8 l10 -18 l8 24" fill="none" stroke="#A8C4E8" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M30 22 q9 -6 18 0" fill="none" stroke="#F2B26B" stroke-width="2.8" stroke-linecap="round"/>' +
    '<path d="M26 60 l8 6 M52 60 l-8 6" stroke="#E86A5E" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="4 3"/>' +
    '<path d="M84 34 q10 -12 20 0 q-4 10 -10 16 q-6 -6 -10 -16 Z" fill="#F7D154" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M88 34 q6 8 12 0" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M74 62 l4 -6 M78 62 l-1 -8 M82 62 l2 -7" stroke="#C9A87C" stroke-width="2.2" stroke-linecap="round"/>',
  swinggrab: /* 有人一直抢你的秋千：歪掉的秋千+拽绳的手 */
    '<path d="M20 22 h76 M26 22 V70 M90 22 V70" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round" fill="none"/>' +
    '<path d="M56 22 q-2 26 2 40" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="44" y="62" width="28" height="7" rx="3.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8" transform="rotate(16 58 65)"/>' +
    '<path d="M72 58 q12 -4 18 2" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M90 60 q5 1 5 7 q-7 0 -8 -4 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M86 42 l7 3 M88 34 l7 2" stroke="#E86A5E" stroke-width="2.6" stroke-linecap="round"/>',
  castlekick: /* 辛苦搭的城堡被故意踢倒：斜倒城堡+踢来的脚+尘土 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<g transform="rotate(-22 48 60)">' +
    '<rect x="30" y="52" width="40" height="20" rx="2" fill="#E8C07A" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="38" y="36" width="10" height="16" rx="2" fill="#F2B26B" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="52" y="36" width="10" height="16" rx="2" fill="#F2B26B" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M32 52 v-6 h6 v6 M42 52 v-6 h6 v6 M52 52 v-6 h6 v6" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '</g>' +
    '<path d="M84 66 q10 -8 18 -2" fill="none" stroke="' + INK + '" stroke-width="3.6" stroke-linecap="round"/>' +
    '<ellipse cx="100" cy="62" rx="9" ry="7" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M20 46 q4 -6 8 0 q-4 4 -8 0 Z M30 38 q4 -6 8 0 q-4 4 -8 0 Z" fill="#C9A87C" opacity=".7"/>',
  stepfoot:  /* 排队时被轻轻踩了一脚：脚印+鞋+小痛记号 */
    '<path d="M10 74 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="40" cy="66" rx="17" ry="10" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 56 q-4 -4 0 -8 q4 4 0 8 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2"/>' +
    '<ellipse cx="82" cy="64" rx="13" ry="8" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3" transform="rotate(-12 82 64)"/>' +
    '<path d="M76 56 q-2 -4 0 -7 q3 3 0 7 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="1.8" transform="rotate(-12 76 52)"/>' +
    '<path d="M62 36 l-6 8 h5 l-4 8 l10 -11 h-5 l4 -5 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M24 34 q2 -6 6 -8 M30 30 q2 -5 5 -6" fill="none" stroke="#C9A87C" stroke-width="2.2" stroke-linecap="round"/>',
  interrupt:  /* 你说话总是被人打断：对话气泡+切断斜线 */
    '<path d="M16 22 q0 -10 12 -10 h30 q12 0 12 10 v18 q0 10 -12 10 h-16 l-10 10 v-10 h-4 q-12 0 -12 -10 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M26 22 h30 M26 30 h20 M26 38 h24" stroke="#A8C4E8" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M76 30 q14 -6 26 2 v14 q-10 6 -20 2 l-6 6 v-8 q-8 -4 0 -16 Z" fill="#F7D154" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M70 18 l34 44" stroke="#E86A5E" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M88 12 l2 6 M96 18 l-6 2" stroke="#E86A5E" stroke-width="2.6" stroke-linecap="round"/>',
  tearbook:   /* 有人撕了你的故事书还做鬼脸：撕两半的书+鬼脸符 */
    '<path d="M14 30 q10 -8 26 -2 l4 6 l4 -6 q16 -6 26 2 v34 q-12 -6 -26 -2 l-4 6 l-4 -6 q-14 -4 -26 2 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M44 26 l4 8 l-4 8 l4 8 l-4 8" fill="none" stroke="#E86A5E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 40 h14 M24 48 h10 M52 40 h14 M52 48 h10" stroke="#A8C4E8" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M92 22 q8 0 8 8 q0 5 -5 7 v4" fill="none" stroke="' + INK + '" stroke-width="2.8" stroke-linecap="round"/>' +
    '<circle cx="95" cy="47" r="2" fill="' + INK + '"/>' +
    '<path d="M86 30 l4 -4 M100 30 l-4 -4 M88 18 q4 -4 8 0" fill="none" stroke="#E8975A" stroke-width="2.4" stroke-linecap="round"/>',
  painting: /* 你的画被弄坏了：画框+裂线 */
    '<rect x="24" y="12" width="72" height="60" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M32 62 l16 -20 l10 10 l14 -26 l16 30" fill="none" stroke="#A8CC8F" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<circle cx="44" cy="30" r="6" fill="#F5C542" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M60 10 l6 16 l-10 4 l8 14 l-4 8" fill="none" stroke="#E86A5E" stroke-width="3" stroke-linejoin="round" stroke-dasharray="5 4"/>' +
    '<path d="M18 76 l10 -8 M102 76 l-10 -8" stroke="#C9A87C" stroke-width="2.4" stroke-linecap="round"/>',
  shoutloud: /* 有人对你大喊大叫：大张嘴+三道声波+感叹记号 */
    '<ellipse cx="46" cy="48" rx="24" ry="26" fill="#F7D154" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<ellipse cx="46" cy="52" rx="12" ry="15" fill="#C95B4A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M40 30 l3 -6 M52 30 l-3 -6" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M78 34 q6 12 0 26 M90 26 q10 20 0 42" fill="none" stroke="#E86A5E" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M30 74 l-8 6 M62 74 l8 6" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>',
  towertop: /* 你搭的高塔成功了：叠块塔+旗+星星 */
    '<path d="M10 78 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="40" y="62" width="40" height="16" rx="3" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="46" y="46" width="28" height="16" rx="3" fill="#F2B26B" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="52" y="30" width="16" height="16" rx="3" fill="#A8CC8F" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M60 30 V12 l16 6 l-16 6" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M90 24 l2.4 6 l6 .8 l-4.4 4.2 l1.2 6 l-5.2 -3 l-5.2 3 l1.2 -6 l-4.4 -4.2 l6 -.8 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M24 24 l2 5 l5 .6 l-3.6 3.4 l1 5 l-4.4 -2.4 l-4.4 2.4 l1 -5 l-3.6 -3.4 l5 -.6 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="1.8"/>',
  grabtoy:  /* 玩具被人抢走了：小熊被拽走+运动线 */
    '<circle cx="52" cy="52" r="18" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="38" cy="38" r="7" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="66" cy="38" r="7" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="46" cy="50" r="2.6" fill="' + INK + '"/><circle cx="58" cy="50" r="2.6" fill="' + INK + '"/>' +
    '<path d="M47 58 q5 4 10 0" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M78 52 q10 -2 18 0 M80 42 q8 -2 14 0 M80 62 q8 2 14 0" fill="none" stroke="#E86A5E" stroke-width="2.8" stroke-linecap="round"/>' +
    '<path d="M96 56 q6 4 4 10" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  lostmom:  /* 迷路找不到妈妈：小孩背影+问号+路牌 */
    '<path d="M10 78 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="44" cy="38" r="11" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M44 49 v16 q0 8 6 10" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M36 52 v10" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="78" y="20" width="26" height="34" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" transform="rotate(6 91 37)"/>' +
    '<path d="M84 44 h16" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" transform="rotate(6 91 37)"/>' +
    '<path d="M20 34 q0 -10 9 -10 q9 0 9 8 q0 6 -7 8 l-2 3" fill="none" stroke="#E8975A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="29" cy="49" r="2.4" fill="#E8975A"/>',
  bookrip:    /* r49 mix 绘本被撕坏了：撕成两半的书+锯齿裂口 */
    '<path d="M20 32 q11 -7 24 -2 v36 q-12 -5 -24 2 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M100 32 q-11 -7 -24 -2 v36 q12 -5 24 2 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M26 42 h10 M26 50 h8 M84 42 h10 M84 50 h8" stroke="#A8C4E8" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M60 28 l-4 8 l4 8 l-4 8 l4 8 l-4 8" fill="none" stroke="#E86A5E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 74 l8 -6 M106 74 l-8 -6" stroke="#C9A87C" stroke-width="2.4" stroke-linecap="round"/>',
  funfair:    /* r49 mix 明天去游乐园又怕下雨：摩天轮+雨云 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="42" cy="42" r="19" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M42 23 v38 M23 42 h38 M28 28 l28 28 M56 28 l-28 28" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="38" y="18" width="8" height="7" rx="2" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="38" y="58" width="8" height="7" rx="2" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="18" y="38" width="8" height="7" rx="2" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="58" y="38" width="8" height="7" rx="2" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M32 72 L42 42 L52 72 M32 72 h20" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M86 24 q-11 0 -9 -8 q2 -7 11 -5 q3 -7 13 -5 q9 2 9 9 q8 1 6 7 q-2 5 -10 4 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M88 40 q-2 5 0 6 q2 -1 0 -6 Z M98 44 q-2 5 0 6 q2 -1 0 -6 Z M80 46 q-2 5 0 6 q2 -1 0 -6 Z" fill="#9CC8E8"/>',
  friendmove: /* r49 mix 好朋友要搬走了：房子+纸箱+搬迁箭头 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M16 44 l20 -17 l20 17" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<rect x="22" y="44" width="28" height="24" rx="2" fill="#E8C07A" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="31" y="52" width="10" height="16" rx="2" fill="#8A6F52" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="66" y="52" width="22" height="17" rx="2" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.8"/><path d="M66 60 h22" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="72" y="40" width="16" height="12" rx="2" fill="#E8C07A" stroke="' + INK + '" stroke-width="2.6"/><path d="M72 46 h16" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M54 62 h8 M60 58 l5 4 l-5 4" fill="none" stroke="#8A9BAE" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  bullyshout: /* r49 mix 有人抢你玩具还凶你：大身影+呵斥波+小球飞出 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="34" cy="28" r="9" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M26 66 v-20 q0 -9 8 -9 q9 0 9 9 v20 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M42 42 l11 -9" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M52 26 q6 9 0 20 M61 21 q10 13 0 30" fill="none" stroke="#E86A5E" stroke-width="3.2" stroke-linecap="round"/>' +
    '<circle cx="90" cy="52" r="7" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M90 59 v12 M90 62 l-7 6 M90 62 l6 4 M90 71 l-4 9 M90 71 l5 8" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="76" cy="30" r="6" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M70 26 q-6 -6 -12 -4" fill="none" stroke="#C9A87C" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="4 3"/>',
  stageshow:  /* r49 mix 要上台表演了：幕布+聚光+话筒 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="12" y="10" width="96" height="9" rx="3" fill="#C95B4A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M12 19 q-5 28 1 51 q7 -22 5 -51 Z" fill="#C95B4A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M108 19 q5 28 -1 51 q-7 -22 -5 -51 Z" fill="#C95B4A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M60 8 L42 64 h36 Z" fill="#F5E9B8" opacity=".45"/>' +
    '<ellipse cx="60" cy="66" rx="19" ry="6" fill="#F5E9B8" opacity=".75" stroke="#C9A87C" stroke-width="2"/>' +
    '<path d="M76 66 V42" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="76" cy="38" r="5" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M72 34 q4 -4 8 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  rainpicnic: /* r49 期待好久的野餐早上下起了大雨：野餐毯+篮+雨云 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M58 22 q-13 0 -11 -9 q3 -8 13 -6 q4 -8 16 -6 q11 2 11 11 q10 1 7 8 q-2 6 -12 5 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M40 40 q-2 5 0 6 q2 -1 0 -6 Z M56 44 q-2 5 0 6 q2 -1 0 -6 Z M72 40 q-2 5 0 6 q2 -1 0 -6 Z M86 44 q-2 5 0 6 q2 -1 0 -6 Z" fill="#9CC8E8"/>' +
    '<path d="M16 64 l30 -13 l34 8 -26 15 Z" fill="#A8CC8F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 60 l24 -10 M36 65 l22 -9" stroke="#8FBF7F" stroke-width="2.2"/>' +
    '<path d="M44 48 h22 l-3 13 h-16 Z" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M49 48 q6 -8 12 0" fill="none" stroke="' + INK + '" stroke-width="2.6"/>',
  darkhole:   /* r49 球滚进黑黑的地下室：黑洞门+台阶+门口的球 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="26" y="16" width="46" height="56" rx="3" fill="#2E3947" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<rect x="22" y="12" width="54" height="64" rx="4" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M32 64 h9 M34 56 h9 M36 48 h9 M38 40 h9" stroke="#5E6B7E" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="70" cy="64" r="7" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M66 60 q4 -3 8 0" fill="none" stroke="' + INK + '" stroke-width="2"/>',
  grandma:    /* r49 远方的奶奶坐了很久的车来看你：巴士+拄杖拎袋身影 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="10" y="28" width="50" height="30" rx="6" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="16" y="34" width="12" height="10" rx="2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="34" y="34" width="12" height="10" rx="2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="22" cy="60" r="4.5" fill="' + INK + '"/><circle cx="48" cy="60" r="4.5" fill="' + INK + '"/>' +
    '<circle cx="86" cy="34" r="7.5" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="92" cy="29" r="3" fill="#D8C9B4" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M86 42 v18" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M86 46 l-7 6 M86 46 l7 5 M86 60 l-4 12 M86 60 l5 11" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M79 54 v14 q0 4 4 4" fill="none" stroke="#C9A87C" stroke-width="2.8"/>' +
    '<path d="M93 52 q-5 4 -4 10 h11 q1 -6 -4 -10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>',
  nightnoise: /* r49 半夜轰隆一声响惊醒：床+窗外闪电+惊叹号 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="18" y="52" width="52" height="13" rx="4" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="22" y="46" width="15" height="8" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M40 52 v13" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M22 65 v8 M66 65 v8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="80" y="14" width="26" height="24" rx="2" fill="#BFE0F2" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M93 14 v24 M80 26 h26" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M96 18 l-6 9 h6 l-7 9" fill="none" stroke="#F5C542" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M46 26 v9" stroke="#E86A5E" stroke-width="3.6" stroke-linecap="round"/><circle cx="46" cy="41" r="2.2" fill="#E86A5E"/>',
  kitewin:    /* r49 风筝掉下来好多次终于飞上天：高空风筝+虚线挣扎弧 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M66 14 l13 15 l-13 13 l-13 -13 Z" fill="#E8A0A8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M66 14 v28 M53 29 h26" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M66 42 q-8 10 -2 20" fill="none" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M60 52 l-5 -3 l1 6 Z M66 58 l5 3 l-1 -6 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M60 34 q-20 20 -30 36" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M22 68 q10 -12 26 -10 M28 74 q12 -10 28 -8" fill="none" stroke="#C9A87C" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="5 4"/>',
  queuejump:  /* r49 level 有人插队一下站到你前面：排队背影+空位+插队箭头 */
    '<path d="M10 72 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="24" cy="42" r="7" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/><path d="M16 66 q8 -13 16 0 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="44" cy="42" r="7" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/><path d="M36 66 q8 -13 16 0 Z" fill="#A8CC8F" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="64" cy="42" r="7" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/><path d="M56 66 q8 -13 16 0 Z" fill="#F2C08A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="88" cy="42" r="7" fill="none" stroke="#C9A87C" stroke-width="2.6" stroke-dasharray="4 3"/><path d="M80 66 q8 -13 16 0 Z" fill="none" stroke="#C9A87C" stroke-width="2.4" stroke-dasharray="4 3"/>' +
    '<path d="M98 58 q-20 -18 -46 -12" fill="none" stroke="#E86A5E" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M50 48 l10 -5 v10 Z" fill="#E86A5E" stroke="' + INK + '" stroke-width="2"/>',
  modelcrush: /* r49 level 有人故意踩坏了你拼好的飞机：断裂飞机+下踩的靴 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M26 48 q18 -10 36 -3 l7 6 q-20 7 -37 3 Z" fill="#A8C4E8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 38 l16 -8 l4 7 l-15 7 Z" fill="#F2B26B" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round" transform="rotate(24 48 42)"/>' +
    '<path d="M44 46 l4 5 l-3 5 l5 4" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M84 58 q11 -5 18 2 l-2 9 q-9 3 -16 -2 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M92 40 v10 M88 46 l4 6 l4 -6" fill="none" stroke="#E86A5E" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>',
  puzzlelost: /* r49 mix 拼图被弄丢了：缺角拼图+倾倒空盒 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="22" y="28" width="17" height="15" rx="2.5" fill="#F2B26B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="41" y="28" width="17" height="15" rx="2.5" fill="#A8CC8F" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="22" y="45" width="17" height="15" rx="2.5" fill="#A8C4E8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="41" y="45" width="17" height="15" rx="2.5" fill="none" stroke="#C9A87C" stroke-width="2.4" stroke-dasharray="4 3"/>' +
    '<circle cx="30" cy="26" r="3" fill="#F2B26B" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="49" cy="26" r="3" fill="#A8CC8F" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="70" y="46" width="30" height="20" rx="3" fill="#E8C07A" stroke="' + INK + '" stroke-width="2.8" transform="rotate(-8 85 56)"/>' +
    '<rect x="74" y="32" width="26" height="10" rx="2" fill="#C9A87C" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-18 87 37)"/>' +
    '<path d="M78 54 q6 -4 12 0" fill="none" stroke="' + INK + '" stroke-width="2"/>',
  gradfare:   /* r49 mix 拿到毕业奖状又舍不得老师：校门+奖状绶带 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M12 68 V42 q17 -14 34 0 V68" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M20 68 V50 M28 68 V48 M36 68 V50" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="56" y="24" width="40" height="28" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M63 33 h26 M63 40 h18" stroke="#A8C4E8" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="76" cy="49" r="5" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M73 52 l-4 10 M79 52 l4 10" stroke="#C95B4A" stroke-width="3" stroke-linecap="round"/>',
  bigkidpush: /* r49 mix 有人抢了你的球还推人：推来的大身影+踉跄小孩+飞出的球 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="26" cy="26" r="8.5" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M18 62 v-18 q0 -8 8 -8 q9 0 9 8 v18 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M34 40 l12 6" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M14 40 q-4 8 0 14" fill="none" stroke="#C9A87C" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="4 3"/>' +
    '<circle cx="58" cy="42" r="6.5" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M58 49 v13 M58 52 l-6 7 M58 52 l8 3 M58 62 l-3 9 M58 62 l6 8" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="92" cy="26" r="7" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M86 32 q-8 8 -18 10" fill="none" stroke="#C9A87C" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="4 3"/>',
  legobroke:  /* r49 mix 乐高被踩坏了：散落积木+压扁一块+下踩的靴 */
    '<path d="M10 76 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="20" y="56" width="20" height="12" rx="2" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.8" transform="rotate(-10 30 62)"/>' +
    '<circle cx="26" cy="54" r="2" fill="#E86A5E"/><circle cx="33" cy="53" r="2" fill="#E86A5E"/>' +
    '<rect x="46" y="60" width="20" height="11" rx="2" fill="#7FB3DE" stroke="' + INK + '" stroke-width="2.8" transform="rotate(14 56 65)"/>' +
    '<rect x="70" y="58" width="18" height="10" rx="2" fill="#A8CC8F" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-20 79 63)"/>' +
    '<rect x="38" y="70" width="24" height="5" rx="2" fill="#F2B26B" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-4 50 72)"/>' +
    '<path d="M84 44 q10 -4 16 2 l-2 8 q-8 3 -14 -2 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M92 28 v8 M88 33 l4 6 l4 -6" fill="none" stroke="#E86A5E" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
  racefirst:  /* r49 mix 明天要比赛了：跑道+号码布+小旗 */
    '<path d="M10 66 q40 -10 100 -4" fill="none" stroke="#C9A87C" stroke-width="2.8"/>' +
    '<path d="M10 74 q40 -10 100 -4" fill="none" stroke="#C9A87C" stroke-width="2.8"/>' +
    '<path d="M28 44 V70 M24 44 h8 M24 70 h8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M54 36 l16 -7 l3 18 q-9 5 -17 2 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M62 32 v9 M59 34 l3 -2" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M86 56 V34 l13 5 l-13 5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>'
};
function sceneSvg(id) {
  const el = SCENE_EL[id] || SCENE_EL.flower;
  return '<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g data-anim="' + (id || 'flower') + '">' + el + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 温度计+笑脸（情绪粒度主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="30" cy="26" r="9" fill="#F7D154" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M26.5 24 q1.6 -2 3.2 0 M30.5 24 q1.6 -2 3.2 0" stroke="' + INK + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M26.5 29 q3.4 3 6.8 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<rect x="11" y="12" width="6" height="18" rx="3" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="14" cy="33" r="4.4" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="14" cy="31.5" r="2" fill="#E86A5E"/><rect x="12.9" y="17" width="2.2" height="13" rx="1.1" fill="#E8975A"/></svg>',
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
