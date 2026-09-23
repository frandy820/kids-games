/* ================= piano 碰碰琴 游戏数据（音阶频率表 / 章配置 / 语音文案 / 图标）
   八音盒 C 大调 8 键（SPEC-BATCH23 §0.54/§3 + SPEC-R23 难度加深）：do re mi fa sol la si do′
   固定频率表 261.63-523.25Hz（±0.01 容差为 verify 契约）；音名不 TTS——音本身即反馈。
   两模式：自由弹（零判定零失败，不进关卡不写档星级）+ 跟弹（小兔子弹序列→孩子逐音复现）。
   r23 章型：dch1 2音（教学）/dch2 3音（基线）不动；dch3 5音（长度上探）；dch4 长曲 6/5/5
   +节奏听辨（哪个音最长）+和弦听辨（听两音选两键）——SPEC-R23-PIANO.md §R2。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族 DESIGN-SPEC §8）

/* ---------- 音阶（id 序 = 键序；freq=SPEC 定值；hue=键顶色点（内容维度：色彩编码助记忆）） ---------- */
const NOTE_IDS = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si', 'dosi'];   // dosi = 高音 do′
const FREQ = {
  do:   261.63,
  re:   293.66,
  mi:   329.63,
  fa:   349.23,
  sol:  392.00,
  la:   440.00,
  si:   493.88,
  dosi: 523.25
};
const HUE = {   // 键顶色点（八色彩虹序——听音时亮键+色点双通道记忆）
  do: '#E8483C', re: '#F08A3C', mi: '#F5C542', fa: '#57B368',
  sol: '#4E8FD0', la: '#9A6BC9', si: '#E88AB0', dosi: '#D94F8A'
};
const NOTE_ARIA = {   // aria 名（音名不进语音反馈，仅无障碍标签）
  do: 'do', re: 're', mi: 'mi', fa: 'fa',
  sol: 'sol', la: 'la', si: 'si', dosi: '高音do'
};

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材——承家族）
   len=该章序列长度（dch1-3 跟弹章）；dch4 按题型谱 D4_KINDS 混合（len=0 表示）；
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，b21 教训禁右移）
   r23：dch3 4→5 音（长度上探）；dch4 改「长曲+节奏/和弦听辨」三形态（SPEC-R23 §R2） ---------- */
const CHAPTERS = {
  1: { name: '两个音', len: 2,
       hint: '接下来兔子会弹三个音的曲子哦' },        // 预告 ch2
  2: { name: '三个音', len: 3,
       hint: '五个音的长曲子要来啦' },                // 预告 ch3（r23：四→五）
  3: { name: '五个音', len: 5,
       hint: '有重复的音、高高的小do，还有长音和双音' },  // 预告 ch4（r23：+节奏/和弦）
  4: { name: '小小音乐会', len: 0,
       hint: '全部曲子大挑战，自由弹随时欢迎你' }     // 预告生成关
};
/* GEN_HINTS[k] ↔ dch=k+1（两个音/三个音/五个音/重复+高do+长音+双音）——生成关 dch=(ch-1)%4+1 确定，禁右移 */
const GEN_HINTS = ['兔子弹两个音，跟着弹一弹',
                   '兔子弹三个音，仔细听哦',
                   '兔子弹五个音，记住顺序弹',
                   '有重复的音、高高的小do，还有长音和双音，仔细听'];
const CH_LEN = 5;            // 5 序列 = 1 关
const STATIC_LEVELS = 20;    // 静态 20 关 = 4 章
/* dch4 每关题型谱（r23 定版）：qi0/2/4=echo 长曲（6/5/5 音，qi0 首两音重复、qi4 尾 dosi
   ——两条 dch4 既有教学点保留）；qi1=rhythm 节奏听辨（4 互异音恰 1 长音）；qi3=chord 和弦听辨（2 音间距 ≥2） */
const D4_KINDS = ['echo', 'rhythm', 'echo', 'chord', 'echo'];
const D4_ECHO_LEN = [6, 5, 5];   // dch4 echo 腿（qi0/2/4）长度谱
const RHY_LEN = 4;               // rhythm 题音数（互异——「哪个音最长」答案唯一性保证）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；音名不 TTS）
   r23 新增 3 键（SPEC-R23 §R6，注册前 KIDS.voice.play 文本自愈兜底）：
   rhyQ/choQ=作答题面（不受 flat<3 门——听不到题面=不知道问什么）；ansWrong=作答错鼓励
   （echo 弹错仍用 wrong 不混用） ---------- */
const VOICE = {
  watch:    { key: 'pia_tut_watch', text: '看！兔子弹什么你弹什么' },
  turn:     { key: 'pia_tut_turn',  text: '你来弹一弹' },
  hint:     { key: 'pia_hint',      text: '先听兔子弹哦' },
  right:    { key: 'pia_right',     text: '弹对啦，真好听' },
  wrong:    { key: 'pia_wrong',     text: '再听一次这个音' },
  like:     { key: 'pia_like',      text: '弹得真像' },   /* T46 阶段2 教学演示收束语 */
  rhyQ:     { key: 'pia_rhy_q',     text: '哪个音弹得最长呀' },      /* r23 rhythm 题面/救援重读 */
  choQ:     { key: 'pia_cho_q',     text: '兔子弹了哪两个音呀' },    /* r23 chord 题面/救援重读 */
  ansWrong: { key: 'pia_ans_wrong', text: '再听一听，再选一次吧' }   /* r23 作答错鼓励（可重选） */
};

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="32" height="32" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="8" width="36" height="28" rx="6" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<rect x="8" y="12" width="6" height="20" rx="2" fill="#4A3B2E"/>' +
    '<rect x="17" y="12" width="6" height="20" rx="2" fill="#4A3B2E"/>' +
    '<rect x="30" y="12" width="6" height="20" rx="2" fill="#4A3B2E"/>' +
    '<circle cx="21" cy="26" r="2.4" fill="#E8483C"/><circle cx="27" cy="28" r="2.4" fill="#F5C542"/></svg>',
  free: '<svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 6 L37 24 L55 24 L40 35 L46 53 L32 42 L18 53 L24 35 L9 24 L27 24 Z" ' +
    'fill="#F5C542" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/></svg>',
  follow: '<svg viewBox="0 0 64 64" width="34" height="34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="20" cy="46" r="8" fill="#FBF7F0" stroke="#4A3B2E" stroke-width="3"/>' +
    '<circle cx="44" cy="46" r="8" fill="#FBF7F0" stroke="#4A3B2E" stroke-width="3"/>' +
    '<path d="M28 46 V14 a6 6 0 0 1 12 0 V20" fill="none" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="40" cy="20" r="5" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.4"/></svg>',
  speaker: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  hand: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M28 12 a7 7 0 0 1 14 0 v22 l7 3 a9 9 0 0 1 6 8 v4 a12 12 0 0 1 -12 12 h-8 a14 14 0 0 1 -14 -14 V30 Z" ' +
    'fill="#FFF" opacity=".95" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="34" cy="42" rx="9" ry="6" fill="#F2B8C6" opacity=".4"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};

/* ---------- 彩花粒子色板（自由弹/弹对共用） ---------- */
const CONFETTI_COLORS = ['#E8483C', '#F08A3C', '#F5C542', '#57B368', '#4E8FD0', '#9A6BC9', '#E88AB0'];
