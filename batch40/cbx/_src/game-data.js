/* ================= cbx 冷静工具箱 游戏数据（策略卡池 11 / 20 题封闭情境表 /
   小主角 SVG（四情绪+平静表情组）/ 策略卡图标 / 情境道具 / 章配置 / 语音文案）
   玩法（SPEC-BATCH40 §2 + SPEC-R50-CBX 难度改造，6-7 岁社交情感·元认知）：
   听情境句（cbx_sc_N clip 化——向内自我调节，与 b36 comfort 向外安慰/etm
   情绪识别命名/thanks 社交回应三重差异+工具箱隐喻独有），全程三选挑「最帮你的」
   冷静工具（r50 改造：ch1-2 去两选档，灰阶辨析全程化）：
   ch1 生气/ch2 难过 三选（最佳 1+次优 1+坏 1）；ch3 害怕/ch4 沮丧 三选
   （最佳 1+次优 1+中性 1——去坏卡，三张全「不坏」纯灰阶）。
   答对=小主角平静下来（容器类 emo-*→calm）+确认链 [cbx_right,
   cbx_g_<好卡id>]（锁窗动态=right+150+好卡句+300 全链覆盖——好卡句承载
   策略指导「慢慢吸气再慢慢呼出来」，禁被下题 say 切断；SPEC §2 下界 2892
   =right+300 恒被动态窗包含）；坏/中性卡错点=wrong+miss+错链 [cbx_wrong,
   按所点卡取 cbx_b_<id>/cbx_n_<id> 具体后果句]；次优卡（fair——好卡池成员
   但非本情境最佳，r50 灰阶核心）错点=wrong+miss+辨析链 [cbx_hint,
   cbx_sc_N 情境重播]（hint「选让心里舒服的」+重听情境=辨析教学闭环；
   零新键——T46 阶段3 后 speak 已删，新键注册前=静默，故全链用现有 clip）
   （豁免窗 WRONG_CHAIN_WIN=6834 恒 ≥ 三链最长——见下）。
   SEL 铁律：坏卡反馈=行为后果句（「玩具摔坏了，你也会更难过」）；中性卡=
   温和引导（「哭一会儿可以，一直哭问题还在哦」）；次优卡=非否定引导
   （轻摆动画+hint 重选，禁「更难受」语义——深呼吸不会更难受，诚实红线）；
   禁人身评价。
   语义先验（r50 定版）：每题 answer=题表 good 列卡下标（唯一解锚=SPEC 题表
   真值，verify 从 SPEC 表 good 列独立推导复算，禁读 quiz.answer 直比）；
   fair 列=好卡池成员且 ≠good 且 类互异（GOOD_CLASS：A 降温/B 安抚/C 表达
   ——同类双好辨析不可教，禁现）；候选三 id 互异；同章 5 题情境句互异+
   good 互异+fair 互异（全池各 1 次=均衡）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const WARM = '#E8975A';                      // 暖橙主色

/* ---------- 演出时序常量（SPEC-BATCH40 §2 实长表 _clipdur40.json 实测）
   cbx_tut_watch 3000 / cbx_tut_turn 1872 / cbx_hint 2208 / cbx_right 2592 /
   cbx_wrong 2160；好卡句 g 2328(sayout)-4224(breath)；坏卡后果 b 3144-3648(hit)；
   中性 n 3144(hide)-3384(cryonly)；情境句 sc 3048-3600（sc_4 max）。
   错链豁免窗 WRONG_CHAIN_WIN=6834（=2160+150+4224+300 窗按 max——任务书
   「窗按 max」口径）；r50 起三链共用（verify ⑨ 对账）：
   坏/中性链=2160+150+尾段(≤3648)+300 ≤ 6258；fair 辨析链=[cbx_hint,
   cbx_sc_N]=2208+150+sc(≤3600)+300=6258 ≤ 6834 恒成立；
   确认链锁窗=CLIP_DUR.right+150+CLIP_DUR.g[好卡]+300 动态全链（最短
   2592+150+2328+300=5370 / 最长 2592+150+4224+300=7266，恒含 SPEC 下界
   2892=right+300）；首错锁 SHAKE_MS=1100 ≤ wrong+150=2310 且 ≤ hint+150=2358
   （fair 链首段口径，N2 总窗口径）；题面 say 窗=estMs(句长)+300（家族 T
   动态，句 11-13 字符 → 窗 4695-5385，出场 400 并行另计）。 ---------- */
const ENTER_MS = 400;                        // 小主角情绪出场动画窗（与题面 TTS 并行）
const SHAKE_MS = 1100;                       // 坏/中性卡摇头+情绪加深锁窗（≤wrong+150=2310）
const WRONG_CHAIN_WIN = 6834;                // 错链豁免窗（真时钟；三链共用——r50 起 fair 辨析链并入）
/* 窗式：2160+150+4224+300=6834（4224=后果句族窗上限口径——SPEC §2 任务书定值；
   实播 b/n 句实长 max 3648，坏/中性实链 ≤2160+150+3648+300=6258；
   fair 辨析链 [cbx_hint, cbx_sc_N]=2208+150+3600+300=6258——两族实链
   上界同 6258，6834 恒 ≥ 任何实链（verify ⑨ 双族断言） */
const TUT_WATCH_WAIT = 3300;                 // ≥cbx_tut_watch 3000+300
const TUT_TURN_WAIT = 2172;                  // ≥cbx_tut_turn 1872+300
const estMs = s => s.length * 345 + 600;     // b25 定版：SAPI ~345ms/字+600（全字符口径，标点计入）

/* ---------- clip 实长表（_clipdur40.json 抄录——锁窗公式真值源；verify ①
   实测对账 ±60ms + ⑨ 静态总窗断言） ---------- */
const CLIP_DUR = {
  tut_watch: 3000, tut_turn: 1872, hint: 2208, right: 2592, wrong: 2160,
  g: { breath: 4224, countten: 3168, hugbunny: 3360, sayout: 2328, drinkwater: 3240 },
  b: { throw: 3336, shout: 3408, hit: 3648, tear: 3144 },
  n: { cryonly: 3384, hide: 3144 }
};
/* 确认链锁窗（动态全链——按好卡取句长；CELE_WIN 为 SPEC §2 下界常量锚） */
const CELE_WIN = CLIP_DUR.right + 300;       // 2892=2592+300（SPEC §2 确认链下界；动态锁窗恒 ≥ 此值）
const celeWinOf = goodId => CLIP_DUR.right + 150 + CLIP_DUR.g[goodId] + 300;   // 5370-7266

/* ---------- 章配置（r50 改造：全程三选灰阶辨析；进度章号单调递增、
   难度章号静态四档 dch=flat//5+1；生成关 flat≥20 dch=seeded 随机 seed 897）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录断言）。
   r50 hint 联动：dch1-2 三选化（「两种工具」→「三种」）/dch3-4 灰阶语义
   （去坏卡=三张都像好办法——文案点破辨析要求） ---------- */
const CHAPTERS = {
  1: { name: '生气的时候',   hint: '难过的时候，也有好办法' },     // 预告 ch2 难过
  2: { name: '难过的时候',   hint: '害怕时三张都像好办法，挑最帮你的' }, // 预告 ch3 灰阶三选（r50 改）
  3: { name: '害怕的时候',   hint: '做不好别灰心，工具箱还能用' }, // 预告 ch4 沮丧
  4: { name: '灰心的时候',   hint: '新的心情来了，工具接着帮你' }  // 预告生成关
};
const GEN_HINTS = ['三种工具，选让心里舒服的',     // dch1 3 选生气（r50 改：原「两种工具」）
                   '心里难受，三张挑最帮你的',     // dch2 3 选难过（r50 改）
                   '三张都像好办法，选最帮自己的', // dch3 3 选害怕·纯灰阶（r50 改：原「只有一个帮自己」）
                   '三个里挑一个，让心里舒服'];    // dch4 3 选沮丧
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=cbx_
   已核 manifest 无占用（SPEC §4：cal_ 被 b26 calendar 占用已改 cbx_））
   好卡句/后果句按卡 id 取：cbx_g_<id> / cbx_b_<id> / cbx_n_<id>（文本见 POOL.text） ---------- */
const VOICE = {
  watch: { key: 'cbx_tut_watch', text: '看！冷静工具箱' },
  turn:  { key: 'cbx_tut_turn',  text: '你来选一选' },
  hint:  { key: 'cbx_hint',      text: '选让心里舒服的' },
  right: { key: 'cbx_right',     text: '好办法，舒服多啦' },
  wrong: { key: 'cbx_wrong',     text: '这样会更难受哦' }
};
const Q_TEXT = '心里不舒服，挑最帮你的';      // 纯文字装饰句（不播——题面真值=情境句 clip；r50 改「挑最帮你的」呼应灰阶）

/* ---------- 策略卡池 11（SPEC §2 定表照录=真值优先，thanks 先例；
   label 3-6 字（慢慢数到十/抱抱小兔子/躲起来不理人为 SPEC 表原文）；
   text=按卡反馈句（好卡句 cbx_g_* / 坏卡后果 cbx_b_* / 中性引导 cbx_n_*——
   manifest 文本严格一致）；icon=卡图标 id（同构描线风，好坏不靠颜色歧视）。 ---------- */
const POOL = {
  /* 好 5（自我调节策略——每题题表取 2 张：good 最佳+fair 次优（r50 灰阶），
     类互异（GOOD_CLASS）防同类双好不可辨析 */
  breath:     { kind: 'good',     label: '深呼吸',       text: '慢慢吸气，再慢慢呼出来，深呼吸', icon: 'breath' },
  countten:   { kind: 'good',     label: '慢慢数到十',   text: '闭上眼睛，慢慢数到十',           icon: 'countten' },
  hugbunny:   { kind: 'good',     label: '抱抱小兔子',   text: '抱抱小兔子，软软的很安心',       icon: 'hugbunny' },
  sayout:     { kind: 'good',     label: '说出来',       text: '把心里的话说出来',               icon: 'sayout' },
  drinkwater: { kind: 'good',     label: '喝口水',       text: '喝一口温水，慢慢咽下去',         icon: 'drinkwater' },
  /* 坏 4（伤害/发泄行为——错点反馈=行为后果句，SEL 铁律） */
  throw:      { kind: 'bad',      label: '摔玩具',       text: '玩具摔坏了，你也会更难过',       icon: 'throw' },
  shout:      { kind: 'bad',      label: '大喊大叫',     text: '大喊大叫，旁边的人也难受',       icon: 'shout' },
  hit:        { kind: 'bad',      label: '打人',         text: '打人会让别人疼，还会失去朋友',   icon: 'hit' },
  tear:       { kind: 'bad',      label: '撕书',         text: '书撕坏了，就没人能看了',         icon: 'tear' },
  /* 中性 2（回避行为——错点反馈=温和引导，非否定） */
  cryonly:    { kind: 'neutral',  label: '一直哭',       text: '哭一会儿可以，一直哭问题还在哦', icon: 'cryonly' },
  hide:       { kind: 'neutral',  label: '躲起来不理人', text: '躲起来，大家就帮不到你啦',       icon: 'hide' }
};
const GOOD_IDS = ['breath', 'countten', 'hugbunny', 'sayout', 'drinkwater'];
const BAD_IDS = ['throw', 'shout', 'hit', 'tear'];
const NEUTRAL_IDS = ['cryonly', 'hide'];
/* 好卡功能类（SPEC-R50 §R2 类表——fair 灰阶可教锚）：A 降温类=直接降低身体
   唤起 / B 安抚类=温和转移与安抚 / C 表达类=把心里话说出去。
   类约束：每题 classOf(fair) !== classOf(good)（同类双好辨析不可教——
   「深呼吸 vs 数到十」无情境可判据，「降温 vs 安抚 vs 表达」类别级可教；
   verify ⑥ 从 SPEC 类表独立对账，实现坏成同类双好必红）。 */
const GOOD_CLASS = { breath: 'A', countten: 'A', hugbunny: 'B', drinkwater: 'B', sayout: 'C' };

/* ---------- 20 题封闭情境表（SPEC §2 + SPEC-R50 §R2 结构：4 章池×5 题；
   情境句=题面 clip 真值源 11-14 字符，同章互异；good=最佳卡 id（每题恰 1，
   唯一解锚=SPEC 表真值）；fair=次优卡 id（r50 灰阶：好卡池成员、≠good、
   类互异、同章 5 题互异=全池各 1 次；错点=非否定辨析引导非后果句）；
   ch1-2 bad=坏卡 id / ch3-4 neutral=中性卡 id——verify 独立表照录对账。
   情绪族 emo：angry 生气/sad 难过/fear 害怕/frus 沮丧（灰心泄气）。
   行序=cbx_sc_N 注册序禁重排（sayKey='cbx_sc_'+(scene+1)）；
   rows0 教学锚（say/good/bad）r50 保留原样（仅新增 fair 列）。 ---------- */
const SCENES = [
  /* ch1 生气（三选=最佳+次优+坏：题 0-4；fair 全池各 1 次） */
  { emo: 'angry', say: '弟弟推倒你的积木，你好生气', good: 'breath',     fair: 'drinkwater', bad: 'throw' },
  { emo: 'angry', say: '同学抢走你的画笔，你气坏了', good: 'countten',   fair: 'sayout',     bad: 'hit' },
  { emo: 'angry', say: '排队时有人插队，气鼓鼓的',   good: 'sayout',     fair: 'hugbunny',   bad: 'shout' },
  { emo: 'angry', say: '妹妹弄坏你的小车，好想发火', good: 'drinkwater', fair: 'countten',   bad: 'tear' },
  { emo: 'angry', say: '游戏输了，你气得直跺脚',     good: 'hugbunny',   fair: 'breath',     bad: 'shout' },
  /* ch2 难过（三选=最佳+次优+坏：题 5-9） */
  { emo: 'sad',   say: '心爱的气球飞走了，你好难过', good: 'breath',     fair: 'hugbunny',   bad: 'tear' },
  { emo: 'sad',   say: '好朋友转学了，你好难过',     good: 'hugbunny',   fair: 'countten',   bad: 'shout' },
  { emo: 'sad',   say: '画好的画弄脏了，你很难过',   good: 'drinkwater', fair: 'sayout',     bad: 'throw' },
  { emo: 'sad',   say: '小金鱼不动了，你心里难过',   good: 'sayout',     fair: 'breath',     bad: 'hit' },
  { emo: 'sad',   say: '下雨天去不了公园，好难过',   good: 'countten',   fair: 'drinkwater', bad: 'tear' },
  /* ch3 害怕（三选=最佳+次优+中性·纯灰阶：题 10-14；r50 去坏卡） */
  { emo: 'fear',  say: '半夜听到怪声音，你有点害怕', good: 'breath',     fair: 'hugbunny',   neutral: 'hide' },
  { emo: 'fear',  say: '打雷声好响，你吓得发抖',     good: 'hugbunny',   fair: 'countten',   neutral: 'hide' },
  { emo: 'fear',  say: '房间黑黑的，你不敢进去',     good: 'sayout',     fair: 'breath',     neutral: 'hide' },
  { emo: 'fear',  say: '看牙医的时候，你心里害怕',   good: 'countten',   fair: 'drinkwater', neutral: 'cryonly' },
  { emo: 'fear',  say: '大狗汪汪叫，你吓得后退',     good: 'drinkwater', fair: 'sayout',     neutral: 'cryonly' },
  /* ch4 沮丧（三选=最佳+次优+中性·纯灰阶：题 15-19） */
  { emo: 'frus',  say: '鞋带总系不好，你好灰心',     good: 'breath',     fair: 'sayout',     neutral: 'cryonly' },
  { emo: 'frus',  say: '跳绳总绊脚，你有点泄气',     good: 'countten',   fair: 'drinkwater', neutral: 'cryonly' },
  { emo: 'frus',  say: '拼图好难，你拼得直叹气',     good: 'hugbunny',   fair: 'breath',     neutral: 'hide' },
  { emo: 'frus',  say: '写的字歪歪扭扭，你好泄气',   good: 'sayout',     fair: 'hugbunny',   neutral: 'cryonly' },
  { emo: 'frus',  say: '学骑车总摔倒，你灰心了',     good: 'drinkwater', fair: 'countten',   neutral: 'hide' }
];

/* ---------- 小主角 SVG（中性圆脸孩子，viewBox 0 0 140 130，头中心约 (70,80)）
   ——cbx 主角=孩子自己（向内自我调节，与 comfort 朋友视角反差）
   表情组（容器类控情绪——契约 M DOM 类层锚）：
   .fx-angry=生气（斜压眉+紧抿嘴+鼓腮+怒气符）
   .fx-sad=难过（八字眉+闭眼下弯+嘴下弯+两滴泪下落循环）
   .fx-fear=害怕（瞪圆眼+小张嘴+汗滴）
   .fx-frus=沮丧（耷拉眉+半闭眼+平弯嘴+叹气泡）
   .fx-calm=平静（弯眼+微笑+腮红——答对的视觉锚）
   根组 g[data-anim="friend"]——verify 帧内容断言锚（渲染即引擎）。 ---------- */
const F_EY = 74;                              // 眼睛基线 y
const FX_ANGRY =
  '<g class="fx-angry">' +
  '<path d="M38 ' + (F_EY - 14) + ' q10 -4 16 2 M102 ' + (F_EY - 14) + ' q-10 -4 -16 2" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +   // 斜压眉（内低外高）
  '<circle cx="46" cy="' + F_EY + '" r="4.6" fill="' + INK + '"/><circle cx="94" cy="' + F_EY + '" r="4.6" fill="' + INK + '"/>' +                                          // 圆眼
  '<path d="M60 ' + (F_EY + 21) + ' q10 -5 20 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +                                            // 紧抿嘴（微下弯）
  '<ellipse cx="34" cy="' + (F_EY + 9) + '" rx="6.4" ry="4.4" fill="#E8A0A8" opacity=".9"/>' +
  '<ellipse cx="106" cy="' + (F_EY + 9) + '" rx="6.4" ry="4.4" fill="#E8A0A8" opacity=".9"/>' +                                                                             // 鼓腮（生气红晕）
  '<g class="puff"><path d="M112 ' + (F_EY - 26) + ' l-7 3 l7 3 M118 ' + (F_EY - 32) + ' l-8 4 l8 4" stroke="#D98A8A" stroke-width="2.8" fill="none" stroke-linecap="round"/></g>' +   // 怒气符（低饱和粉）
  '</g>';
const FX_SAD =
  '<g class="fx-sad">' +
  '<path d="M38 ' + (F_EY - 15) + ' q6 4 12 6 M102 ' + (F_EY - 15) + ' q-6 4 -12 6" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +           // 八字眉
  '<path d="M41 ' + F_EY + ' q5.5 6 11 0 M88 ' + F_EY + ' q5.5 6 11 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +                      // 闭眼下弯
  '<path d="M62 ' + (F_EY + 21) + ' q8 -7 16 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +                                             // 嘴下弯
  '<g class="tear"><path d="M46 ' + (F_EY + 7) + ' q4 6 0 9 q-4 -3 0 -9 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/></g>' +                                 // 泪 1
  '<g class="tear t2"><path d="M94 ' + (F_EY + 7) + ' q4 6 0 9 q-4 -3 0 -9 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/></g>' +                              // 泪 2
  '</g>';
const FX_FEAR =
  '<g class="fx-fear">' +
  '<path d="M38 ' + (F_EY - 16) + ' q8 2 14 -4 M102 ' + (F_EY - 16) + ' q-8 2 -14 -4" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +         // 高挑眉（担忧上扬）
  '<circle cx="46" cy="' + F_EY + '" r="6.4" fill="' + INK + '"/>' +
  '<circle cx="94" cy="' + F_EY + '" r="6.4" fill="' + INK + '"/>' +
  '<circle cx="48" cy="' + (F_EY - 2) + '" r="2" fill="#FFF9EE"/><circle cx="96" cy="' + (F_EY - 2) + '" r="2" fill="#FFF9EE"/>' +                                          // 瞪圆眼+高光
  '<ellipse cx="70" cy="' + (F_EY + 20) + '" rx="6.6" ry="5.2" fill="' + INK + '"/>' +                                                                                     // 小张嘴（发怔）
  '<g class="sweat"><path d="M24 ' + (F_EY - 10) + ' q5 7 0 11 q-5 -4 0 -11 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/></g>' +                             // 汗滴
  '<g class="sweat s2"><path d="M116 ' + (F_EY - 4) + ' q4.6 6 0 10 q-4.6 -4 0 -10 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.4"/></g>' +
  '</g>';
const FX_FRUS =
  '<g class="fx-frus">' +
  '<path d="M38 ' + (F_EY - 13) + ' q7 -5 14 -1 M102 ' + (F_EY - 13) + ' q-7 -5 -14 -1" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +       // 耷拉眉（外垂）
  '<path d="M42 ' + F_EY + ' q4.6 4 9.2 0 M88.8 ' + F_EY + ' q4.6 4 9.2 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +                  // 半闭眼（浅弯）
  '<path d="M61 ' + (F_EY + 20) + ' q9 4 18 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +                                              // 平弯嘴（无力）
  '<g class="sigh"><ellipse cx="108" cy="' + (F_EY - 18) + '" rx="7.4" ry="5" fill="none" stroke="#8A9BAE" stroke-width="2.4"/>' +
  '<path d="M113 ' + (F_EY - 23) + ' q3 -4 0 -7 M117 ' + (F_EY - 19) + ' q4 -3 3 -7" stroke="#8A9BAE" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>' +        // 叹气泡（灰蓝）
  '</g>';
const FX_CALM =
  '<g class="fx-calm">' +
  '<path d="M40 ' + (F_EY - 12) + ' q8 -5 15 -1 M100 ' + (F_EY - 12) + ' q-8 -5 -15 -1" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +     // 舒展眉
  '<path d="M41 ' + (F_EY + 1) + ' q5.5 -7 11 0 M88 ' + (F_EY + 1) + ' q5.5 -7 11 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +        // 弯眼（安宁）
  '<path d="M61 ' + (F_EY + 19) + ' q9 8 18 0" stroke="' + INK + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +                                              // 微笑
  '<ellipse cx="36" cy="' + (F_EY + 10) + '" rx="7" ry="4.8" fill="#F2B8C6" opacity=".85"/>' +
  '<ellipse cx="104" cy="' + (F_EY + 10) + '" rx="7" ry="4.8" fill="#F2B8C6" opacity=".85"/>' +                                                                            // 腮红
  '</g>';
const KID_EL =
  '<path d="M42 34 q28 -22 56 0 q4 8 -2 12 q-26 -12 -52 0 q-6 -4 -2 -12 Z" fill="#6B5847" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +             // 短发（中性）
  '<circle cx="70" cy="82" r="40" fill="#F6D9B8" stroke="' + INK + '" stroke-width="3.4"/>' +                                                                               // 圆脸
  '<path d="M34 58 q8 -10 18 -6 M106 58 q-8 -10 -18 -6" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +                                    // 鬓角
  '<ellipse cx="70" cy="104" rx="26" ry="18" fill="#E8975A" stroke="' + INK + '" stroke-width="3" opacity="0" />';                                                          // 领口占位（表情态不用）
function friendSvg() {
  return '<svg viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="friend">' + KID_EL + FX_ANGRY + FX_SAD + FX_FEAR + FX_FRUS + FX_CALM + '</g></svg>';
}

/* ---------- 策略卡图标库（viewBox 0 0 104 76 描线风，好/坏/中性同构——不靠
   颜色歧视；根组 g[data-anim=<icon>]，verify 单元①断言全定义。 ---------- */
const CARD_EL = {
  /* 好 5 */
  breath:     /* 深呼吸：侧面+三条气流渐弧 */
    '<path d="M20 30 q-10 8 0 16 M14 24 q-16 14 0 28" stroke="#8A9BAE" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="46" cy="38" r="20" fill="#F6D9B8" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M42 34 q3 -3 6 0 M42 44 q4 3 8 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M74 22 q10 8 0 16 M80 14 q16 14 0 32 M86 20 q8 7 0 14" stroke="#8A9BAE" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="86" cy="60" rx="9" ry="5" fill="none" stroke="#8A9BAE" stroke-width="2.4"/>',
  countten:   /* 慢慢数到十：摊掌+指节十个点 */
    '<path d="M30 58 q-4 -26 12 -30 l6 10 q14 -2 22 8 q8 10 2 14" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M40 40 h20 M42 48 h18" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="46" cy="36" r="2.2" fill="' + WARM + '"/><circle cx="54" cy="36" r="2.2" fill="' + WARM + '"/>' +
    '<circle cx="46" cy="44" r="2.2" fill="' + WARM + '"/><circle cx="54" cy="44" r="2.2" fill="' + WARM + '"/>' +
    '<path d="M78 24 v14 M78 38 q-5 3 -7 8 M78 38 q5 3 7 8" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  hugbunny:   /* 抱抱小兔子：两臂环抱+小兔 */
    '<path d="M52 42 C 26 20 10 46 34 58 M52 42 C 78 20 94 46 70 58" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="46" cy="26" rx="4.4" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-14 46 26)"/>' +
    '<ellipse cx="60" cy="25" rx="4.4" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.4" transform="rotate(12 60 25)"/>' +
    '<circle cx="53" cy="40" r="13" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="48.6" cy="38.6" r="1.8" fill="' + INK + '"/><circle cx="57.4" cy="38.6" r="1.8" fill="' + INK + '"/>' +
    '<path d="M51 44 q2 2 4 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  sayout:     /* 说出来：对话气泡+心（心里话说出去） */
    '<path d="M22 16 h52 a9 9 0 0 1 9 9 v18 a9 9 0 0 1 -9 9 h-34 l-13 11 v-11 h-5 a9 9 0 0 1 -9 -9 v-18 a9 9 0 0 1 9 -9 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M48 34 q-5 -4 -5 -9 q0 -4.6 4.6 -4.6 q2.6 0 4.4 2.6 q1.8 -2.6 4.4 -2.6 q4.6 0 4.6 4.6 q0 5 -8 11 Z" transform="scale(.94) translate(2 1)" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M76 26 q6 -4 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  drinkwater: /* 喝口水：水杯+水面涟漪+吸嘴 */
    '<path d="M30 26 h34 l-4 30 a7 7 0 0 1 -7 6 h-12 a7 7 0 0 1 -7 -6 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M33 38 q6 -3 12 0 q6 3 12 0" stroke="#9CC8E8" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M38 32 q4 -2 8 0 M46 46 q4 -2 8 0" stroke="#9CC8E8" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M68 30 q5 -6 10 -2 M70 40 q6 -5 11 0" stroke="#8A9BAE" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  /* 坏 4 */
  throw:      /* 摔玩具：抛出的小熊+冲击线+裂纹 */
    '<g transform="rotate(-18 66 30)"><circle cx="66" cy="28" r="11" fill="#EDE3D2" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="57" cy="20" r="5" fill="#EDE3D2" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="75" cy="20" r="5" fill="#EDE3D2" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="62.6" cy="27" r="1.6" fill="' + INK + '"/><circle cx="69.4" cy="27" r="1.6" fill="' + INK + '"/></g>' +
    '<path d="M34 56 l8 -8 l-4 -6 M46 62 l6 -10 M28 44 l10 -4" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 30 l5 5 M22 40 l7 2" stroke="#D98A8A" stroke-width="2.6" stroke-linecap="round"/>',
  shout:      /* 大喊大叫：张嘴喊+声波+面部紧绷 */
    '<circle cx="38" cy="40" r="21" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M28 32 q4 -4 8 -1 M46 32 q4 -4 8 1" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="38" cy="47" rx="8.4" ry="6.6" fill="#D98A8A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M66 26 q8 14 0 28 M76 18 q13 22 0 44 M86 24 q7 11 0 22" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
  hit:        /* 打人：挥出的小拳头+疼星 */
    '<path d="M20 40 q0 -14 14 -14 h12 v-5 l15 9 l-15 9 v-5 h-10 q-5 0 -5 5 v9 Z" fill="#EDE3D2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M70 20 l3 6.4 l7 .8 l-5.2 4.6 l1.4 7 l-6.2 -3.4 l-6.2 3.4 l1.4 -7 l-5.2 -4.6 l7 -.8 Z" fill="none" stroke="#D98A8A" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M74 52 q5 -4 10 0 M78 60 q4 -3 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  tear:       /* 撕书：撕成两半的书页+裂线 */
    '<g transform="rotate(-14 36 40)"><path d="M14 30 l20 -4 v30 l-20 4 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/></g>' +
    '<g transform="rotate(16 70 42)"><path d="M90 30 l-18 -4 v30 l18 4 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/></g>' +
    '<path d="M52 24 l-4 8 l6 6 l-5 7 l6 6 l-4 8" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M30 20 q-4 -4 0 -8 M76 60 q4 4 0 8" stroke="#D98A8A" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  /* 中性 2 */
  cryonly:    /* 一直哭：低头垂泪两行（未调节态） */
    '<path d="M34 60 q-2 -26 10 -30 l4 8 q12 -2 18 8 q8 12 2 16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<path d="M46 42 q4 4 8 0 M62 42 q4 4 8 0" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 46 q-2 8 0 12 q-3 6 1 8 M64 46 q2 8 0 12 q3 6 -1 8" stroke="#9CC8E8" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M54 58 q4 -3 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  hide:       /* 躲起来不理人：纸箱后露半张脸 */
    '<rect x="14" y="30" width="52" height="32" rx="5" fill="#E8CFA8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M14 40 h52 M14 52 h52" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="70" cy="42" r="13" fill="#F6D9B8" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M66 40 q2 -2 4 0 M74 40 q2 -2 4 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M68 48 q4 -2 7 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M90 30 q4 -3 7 0 M88 44 q5 -3 9 0" stroke="#8A9BAE" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
};
function cardIconSvg(icon) {
  const el = CARD_EL[icon] || CARD_EL.breath;
  return '<svg viewBox="0 0 104 76" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + icon + '">' + el + '</g></svg>';
}

/* ---------- 情境道具小图标（viewBox 0 0 56 56，舞台右下角点景）
   20 种=20 题情境物（PROP_OF 与题表行号一一对齐） ---------- */
const PROP_EL = {
  blocks:  '<rect x="8" y="30" width="16" height="14" rx="3" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<rect x="27" y="34" width="15" height="12" rx="3" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4" transform="rotate(12 34 40)"/>' +
           '<path d="M14 26 v-6 M38 28 l4 -5" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  brush:   '<g transform="rotate(-24 26 32)"><rect x="10" y="28" width="26" height="8" rx="4" fill="' + WARM + '" stroke="' + INK + '" stroke-width="2.4"/><path d="M36 28 h6 l4 3 l-4 3 h-6 Z" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/></g>' +
           '<path d="M18 14 q4 6 10 4 M24 10 q2 5 8 5" stroke="#8A9BAE" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  queue:   '<circle cx="12" cy="34" r="6" fill="#EDE3D2" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<circle cx="26" cy="34" r="6" fill="#EDE3D2" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<circle cx="40" cy="34" r="6" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<path d="M8 46 h36" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<path d="M46 22 v16 M46 22 l-5 5 M46 22 l5 5" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  car:     '<rect x="8" y="26" width="34" height="14" rx="6" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M16 26 l4 -8 h12 l5 8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
           '<circle cx="17" cy="42" r="4" fill="' + INK + '"/><circle cx="34" cy="42" r="4" fill="' + INK + '"/>' +
           '<path d="M44 18 q4 -4 8 0" stroke="#D98A8A" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
           '<path d="M40 14 q3 -3 6 0" stroke="#8A9BAE" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  medal:   '<path d="M18 10 l6 14 M38 10 l-6 14" stroke="' + WARM + '" stroke-width="3" stroke-linecap="round"/>' +
           '<circle cx="28" cy="34" r="12" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M28 27 l3 6 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>',
  balloon: '<path d="M30 8 a13 13 0 0 1 13 13 a13 13 0 0 1 -26 0 a13 13 0 0 1 13 -13 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M30 34 q-2 3 0 5 q2 2 0 5" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
           '<path d="M8 44 q10 -6 18 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  letter:  '<rect x="12" y="16" width="32" height="26" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M14 40 L28 27 L42 40 M14 20 L24 28 M42 20 L32 28" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linejoin="round"/>' +
           '<path d="M44 14 q5 -5 9 0 q4 -5 8 0 q0 6 -8 11 q-8 -5 -8 -11 Z" transform="scale(.7) translate(10 -2)" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>',
  paper:   '<path d="M14 12 h20 l8 8 v24 a4 4 0 0 1 -4 4 h-24 a4 4 0 0 1 -4 -4 v-28 a4 4 0 0 1 4 -4 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M34 12 v8 h8" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linejoin="round"/>' +
           '<path d="M19 26 h14 M19 32 h14" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
           '<path d="M24 40 q4 -5 10 -1" stroke="#D98A8A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  fish:    '<ellipse cx="26" cy="30" rx="14" ry="9" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M40 30 l10 -7 v14 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
           '<circle cx="20" cy="28" r="2.2" fill="' + INK + '"/>' +
           '<path d="M14 24 q-4 -6 0 -10" stroke="#9CC8E8" stroke-width="2" fill="none" stroke-linecap="round"/>' +
           '<path d="M46 14 q4 -4 7 0" stroke="#8A9BAE" stroke-width="2" fill="none" stroke-linecap="round"/>',
  umbrella:'<path d="M6 28 a22 22 0 0 1 44 0 Z" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M6 28 q11 -14 22 0 q11 -14 22 0" stroke="' + INK + '" stroke-width="2.2" fill="none"/>' +
           '<path d="M28 28 v18 q0 5 -5 5 q-4 0 -5 -4" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<path d="M44 44 q3 3 0 6 q-3 -3 0 -6 Z" fill="#9CC8E8" stroke="' + INK + '" stroke-width="1.6"/>',
  moon:    '<path d="M34 8 a16 16 0 1 0 10 26 a13 13 0 0 1 -10 -26 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M14 18 h6 l2 -5 l2 5 h6 l-5 4 l2 6 l-5 -4 l-5 4 l2 -6 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
           '<path d="M12 36 q4 3 0 7 M18 42 q3 2 0 6" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  cloud:   '<path d="M14 34 a8 8 0 0 1 5 -14 a9 9 0 0 1 17 -1 a8 8 0 0 1 6 15 q-2 4 -8 4 h-14 q-6 0 -6 -4 Z" fill="#C9D3DC" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M28 42 l-5 8 h5 l-4 7" fill="none" stroke="#F5C542" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  lamp:    '<path d="M18 40 h20 l-6 -18 h-8 Z" fill="#F5C542" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<path d="M28 22 v-8" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<path d="M28 40 v8" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<path d="M22 46 q6 4 12 0" stroke="#D98A8A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
           '<path d="M10 24 q3 -4 7 -2 M46 24 q-3 -4 -7 -2" stroke="#8A9BAE" stroke-width="2" fill="none" stroke-linecap="round"/>',
  tooth:   '<path d="M20 14 q-10 2 -8 14 q1 8 6 8 q4 0 5 -6 q1 -3 3 0 q1 6 5 6 q5 0 6 -8 q2 -12 -8 -14 q-4 -1 -9 0 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<path d="M24 22 q2 2 4 0 M28 28 q2 2 4 0" stroke="#9CC8E8" stroke-width="2" fill="none" stroke-linecap="round"/>' +
           '<path d="M44 20 l4 4 M46 32 l5 -2" stroke="#8A9BAE" stroke-width="2.2" stroke-linecap="round"/>',
  dog:     '<path d="M16 44 q-6 -10 0 -18 q4 -6 12 -6 q9 0 12 7 q4 8 -1 17 Z" fill="#D9A56D" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<ellipse cx="14" cy="30" rx="5.4" ry="10" fill="#D9A56D" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-14 14 30)"/>' +
           '<ellipse cx="42" cy="30" rx="5.4" ry="10" fill="#D9A56D" stroke="' + INK + '" stroke-width="2.4" transform="rotate(14 42 30)"/>' +
           '<circle cx="22" cy="30" r="2.4" fill="' + INK + '"/><circle cx="34" cy="30" r="2.4" fill="' + INK + '"/>' +
           '<ellipse cx="28" cy="38" rx="5" ry="3.6" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2"/>' +
           '<path d="M46 18 q3 -3 6 0 M48 46 q4 -2 7 1" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  shoe:    '<path d="M10 36 q0 -10 10 -10 h6 l6 8 h10 q8 0 8 8 v2 h-40 Z" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
           '<path d="M12 44 h34" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
           '<path d="M40 20 q10 -2 12 6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
           '<circle cx="46" cy="28" r="2.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.8"/>' +
           '<path d="M42 18 q4 -3 7 0" stroke="#8A9BAE" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  rope:    '<path d="M14 16 q22 24 0 34 M24 14 q22 24 0 36 M34 16 q20 22 2 34" stroke="' + WARM + '" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
           '<path d="M10 14 q4 -4 8 0 M30 14 q4 -4 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
           '<path d="M44 22 q4 -3 6 0" stroke="#8A9BAE" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  puzzle:  '<rect x="10" y="16" width="16" height="16" rx="3" fill="#F5C542" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<rect x="28" y="30" width="16" height="16" rx="3" fill="#A8CBEA" stroke="' + INK + '" stroke-width="2.4"/>' +
           '<rect x="28" y="12" width="13" height="13" rx="3" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4" transform="rotate(14 34 18)"/>' +
           '<path d="M20 40 h8" stroke="' + INK + '" stroke-width="2.4" stroke-dasharray="3 3" stroke-linecap="round"/>',
  pencil:  '<g transform="rotate(-20 28 32)"><rect x="10" y="26" width="30" height="10" rx="3" fill="' + WARM + '" stroke="' + INK + '" stroke-width="2.6"/><path d="M40 26 h5 l5 3.6 l-5 3.6 l-5 -.8 Z" fill="#E9D3B3" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/></g>' +
           '<path d="M12 20 q4 -6 10 -4 M20 12 q4 -4 9 -2" stroke="#8A9BAE" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  bike:    '<circle cx="17" cy="38" r="10" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<circle cx="41" cy="38" r="10" fill="none" stroke="' + INK + '" stroke-width="2.6"/>' +
           '<path d="M17 38 l7 -14 h10 l7 14 M24 24 h-6 M24 24 l8 14 M41 38 l-9 0" stroke="' + WARM + '" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
           '<path d="M20 20 q3 -3 6 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
};
const PROP_OF = ['blocks', 'brush', 'queue', 'car', 'medal',
                 'balloon', 'letter', 'paper', 'fish', 'umbrella',
                 'moon', 'cloud', 'lamp', 'tooth', 'dog',
                 'shoe', 'rope', 'puzzle', 'pencil', 'bike'];   // 20 题情境物（行号=题号一一对齐）
function propSvg(kind) {
  const el = PROP_EL[kind] || PROP_EL.cloud;
  return '<svg viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="prop-' + kind + '">' + el + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 平静小孩脸+小工具箱锚（冷静主题） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M15 14 q7 -5 14 0 q1 2.6 -.8 3.4 q-7 -3.4 -12.4 0 q-1.8 -.8 -.8 -3.4 Z" fill="#6B5847"/>' +
    '<circle cx="22" cy="24" r="10" fill="#F6D9B8" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M18 23 q2 -2.6 4 0 M22 23 q2 -2.6 4 0" stroke="' + INK + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M19.6 28 q2.4 2 4.8 0" stroke="' + INK + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<rect x="30" y="26" width="10" height="8" rx="2" fill="' + WARM + '" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M33 26 v-2.4 q0 -1.6 2 -1.6 q2 0 2 1.6 V26" fill="none" stroke="' + INK + '" stroke-width="1.6"/></svg>',
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
