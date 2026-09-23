/* ================= fruitsplit 游戏数据（r7 难度改造：等分选择 / 公平判断 / 多人分披萨）
   章配置与模式（SPEC-BATCH7 §2 r7）：
   dch1 对半（pick 辨识 + cut 切两半判公平 + choose 2 人选对半切法）
   dch2 公平判断（fair 公平/不公平双态 ×3 + cut + choose）
   dch3 三/四等分（choose 3/4 人 ×3 + fair + cut；披萨入池）
   dch4 五模式混排（pick/choose/fair/cut/match 各一，全六款水果）
   切法四型：halves 一刀两份 / thirds Y 形三份 / quarters 十字四份 / unfair 偏心刀（一大一小）
   水果 art 全 SVG；圆系+披萨支持等分切开（扇形块 pieceArt 中心角相等=构造性等大）
   —— 等分概念不自相矛盾：游戏内一切"正确答案"恒为等分；不公平展示是题面判断对象，指出后重切为等分 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- estMs 家族定版（r7 涉语音窗，四处同步：本常量 / 本注释 / game-verify.js estMsFamily
   断言 / build.py 字面 assert）。SAPI ~345ms/字 + 600（b25 定版，全码点口径；禁 +300 变体）。
   用途：单关 modeled 时长 = Σ(estMs(题面句码点) + SPEC_T 操作/演出窗) ≥ 40000（verify 硬断言） */
const estMs = n => n * 345 + 600;

/* ---------- 时序分账表（verify 独立副本重列同值；act=5-6 岁最小决策+点选操作 / fb=答对演出窗） */
const SPEC_T = {
  pick:   { act: 3000, fb: 880 },
  choose: { act: 3500, fb: 2800 },
  fair:   { act: 2800, fb: 2600 },   // 保守取公平题（不公平题含重切演出 2800 更长）
  cut:    { act: 3800, fb: 3600 },   // 点刀操作 + 判公平点选 两段
  match:  { act: 3000, fb: 880 }
};

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   hint=章末预告文案（打完第 N 章显示 CHAPTERS[N].hint，预告第 N+1 章）；GEN 文案不带"明天："前缀 */
const CHAPTERS = {
  1: { name: '对半分',   hint: '接下来，看看怎样分才公平' },
  2: { name: '公平吗',   hint: '还要切成三块四块，人人一样多' },
  3: { name: '三四份',   hint: '切一切，拼一拼，大挑战来啦' },
  4: { name: '大挑战',   hint: '新一轮分水果挑战' }
};
const GEN_HINTS = ['公平切水果，再来一轮', '几个人分，切几块', '切一切，拼一拼', '认一半，拼一拼'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 水果集（章 1-2 圆形系；章 3 加披萨；章 4 全六款）
   pick/match 用 DCH_KINDS（辨识/拼合全池）；choose/fair/cut 用 EQ_KINDS（等分切法池——
   三角西瓜尖/心形草莓非旋转对称，等分切开视觉不直观，只进辨识/拼合） */
const KINDS_ROUND = ['apple', 'orange', 'melon'];
const KINDS_EQ    = ['apple', 'orange', 'melon', 'pizza'];
const KINDS_ALL   = ['apple', 'orange', 'melon', 'pizza', 'wedge', 'berry'];
const DCH_KINDS = { 1: KINDS_ROUND, 2: KINDS_ROUND, 3: KINDS_EQ, 4: KINDS_ALL };
const eqKindsOf = dch => (dch <= 2 ? KINDS_ROUND : KINDS_EQ);
const FRUIT_NAME = { apple: '苹果', orange: '橙子', melon: '西瓜', pizza: '披萨', wedge: '西瓜', berry: '草莓' };
/* 扇形块配色（choose/fair/cut 切开演出）：块面主色 + 籽点色 */
const KIND_FILL = { apple: '#E0503C', orange: '#F0913D', melon: '#E0503C', pizza: '#F2C879' };
const KIND_SEED = { apple: '#F2A9A0', orange: '#D9782B', melon: '#3B2F23', pizza: '#E8873A' };

/* ---------- 切法四型（choose 选项 / 切开演出 / fair 展示共用）
   parts=份数 / equal=是否等分；spanDeg=每块中心角（choose 演出与 fair 展示的等大构造） */
const CUTS = {
  halves:   { parts: 2, equal: true },
  thirds:   { parts: 3, equal: true },
  quarters: { parts: 4, equal: true },
  unfair:   { parts: 2, equal: false }
};
const cutForN = n => (n === 2 ? 'halves' : (n === 3 ? 'thirds' : 'quarters'));  // n 人正确切法
const wrongCutForN = n => (n === 4 ? 'thirds' : 'quarters');                     // 份数不对的等分干扰
const NUM_CN = { 2: '两', 3: '三', 4: '四' };

/* ---------- 语音文案（key=clip 名，text=TTS 兜底）
   已合成 clip 与 voice/manifest.json 严格一致（禁自改）：fru_tut_watch'看！切水果啦'/
   fru_tut_turn'你来切一切'/fru_hint'听一听，想一想'（文本一字不改）
   r7 新键：fru_choose/fru_fair_q/fru_fair_yes/fru_fair_no/fru_recut（gen_clips.py 已注册） */
const VOICE = {
  watch:    { key: 'fru_tut_watch', text: '看！切水果啦' },
  turn:     { key: 'fru_tut_turn',  text: '你来切一切' },
  hint:     { key: 'fru_hint',      text: '听一听，想一想' },
  wrong:    { key: 'fru_wrong',     text: '不对哦，再想一想' },      /* 纠错轻语音：flat<3 每错必播 / flat≥3 10s 节流 */
  knife:    { key: 'fru_knife',     text: '点一点小刀，切一切' },    /* 切分题点水果本体（非主交互）10s 节流轻提示 */
  same:     { key: 'fru_same',      text: '一半和一半，一样多' },    /* cut 题两半展开概念点题 */
  choose:   { key: 'fru_choose',    text: '想一想，几个人分，就切成一样大的几块' },  /* choose 模式锚/救援 */
  fairQ:    { key: 'fru_fair_q',    text: '看一看，这样分公平吗？' },/* fair 题面 / cut 判定段（=qSpeech 文本） */
  fairYes:  { key: 'fru_fair_yes',  text: '对啦，一样大，很公平' },   /* 公平判定答对 */
  fairNo:   { key: 'fru_fair_no',   text: '一边大一边小，不公平' },   /* 不公平判定答对（语义点题） */
  recut:    { key: 'fru_recut',     text: '重切一下，一样大才公平' }  /* 不公平指出后的重切演出 */
};

/* ---------- 题面问句（全语音承载 §0.19；文字仅装饰性冗余；每句 ≥11 码点保证 modeled 时长） */
const MODE_QUEST = {
  pick:  '看一看，哪一个是它的一半？',
  choose: null,                                    /* 动态拼：NUM_CN[n]+'个人分，选一样大的切法' */
  fair:  '看一看，这样分公平吗？',
  cut:   '点一点小刀，把水果切成两半',
  match: '找一找，另一半在哪里？'
};
const qSpeech = q => {
  if (q.mode === 'choose') return NUM_CN[q.parts] + '个人分，选一样大的切法';
  if (q.mode === 'cut') return q.judging ? MODE_QUEST.fair : '点一点小刀，把' + FRUIT_NAME[q.kind] + '切成两半';
  return MODE_QUEST[q.mode];
};
/* T46 阶段2（2026-09-19）：题面句 clip 化键映射（与 qSpeech 文本一一对应 manifest）
   pick→fru_q_pick / choose→fru_q_choose_<n>（2-4）/ fair 与 cut 判定段→fru_fair_q（同文复用）/
   cut→fru_q_cut_<kind>（FRUIT_NAME 6 水果）/ match→fru_q_match */
const qKey = q => {
  if (q.mode === 'choose') return 'fru_q_choose_' + q.parts;
  if (q.mode === 'cut') return q.judging ? VOICE.fairQ.key : 'fru_q_cut_' + q.kind;
  if (q.mode === 'fair') return VOICE.fairQ.key;
  if (q.mode === 'pick') return 'fru_q_pick';
  return 'fru_q_match';
};
/* 题面 chip 文字（视觉冗余；数字/人数由图示承载） */
const qBigText = q => {
  if (q.mode === 'choose') return NUM_CN[q.parts] + '个人，一样大';
  if (q.mode === 'cut') return q.judging ? '公平吗？' : '切两半';
  if (q.mode === 'fair') return '公平吗？';
  if (q.mode === 'match') return '另一半在哪里？';
  return '哪个是一半？';
};

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀） */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M22 27 C17 22 9 25 10 32 C11 38 18 40 22 36 C26 40 33 38 34 32 C35 25 27 22 22 27 Z" fill="#E0503C" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<path d="M22 26 V13" stroke="#8A5A3B" stroke-width="2.6" stroke-linecap="round"/>' +
    '<ellipse cx="28" cy="13" rx="6" ry="3" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2" transform="rotate(-16 28 13)"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  knife: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M6 34 L42 20 Q52 17 55 24 Q57 31 46 34 L8 40 Q4 38 6 34 Z" fill="#DCE4E8" stroke="#4A3B2E" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M14 33 L42 25" stroke="#FFF" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M47 22 L60 27 Q63 30 60 33 L47 36 Z" fill="#8A5A3B" stroke="#4A3B2E" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="53" cy="29.5" r="1.4" fill="#FFF9EE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 题面 chip 用：半只苹果（辨识）/ 娃娃排排（等分选择）/ 天平（公平）/ 小刀（切分）/ 拼合（match） */
  pm_pick: '<svg class="pm" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 6 C17 1 4 8 6 22 C8 34 17 42 24 39 C31 42 40 34 42 22 C44 8 31 1 24 6 Z" fill="#E0503C" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M24 6 C24 4 25 2 27 1" stroke="#8A5A3B" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M6 6 V42" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="5 4"/></svg>',
  pm_choose: '<svg class="pm" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="24" cy="28" r="15" fill="#F2C879" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M24 13 V43 M9.5 20.5 L38.5 35.5 M38.5 20.5 L9.5 35.5" stroke="#FFF9EE" stroke-width="2.8" stroke-linecap="round"/>' +
    '<circle cx="12" cy="8" r="5.2" fill="#FFE3C9" stroke="#4A3B2E" stroke-width="2"/>' +
    '<circle cx="24" cy="7" r="5.2" fill="#FFE3C9" stroke="#4A3B2E" stroke-width="2"/>' +
    '<circle cx="36" cy="8" r="5.2" fill="#FFE3C9" stroke="#4A3B2E" stroke-width="2"/></svg>',
  pm_fair: '<svg class="pm" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 10 V38" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M8 16 H40" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M8 16 l-3 8 h6 Z M40 16 l-3 8 h6 Z" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="24" cy="41" r="3.4" fill="#8A5A3B"/></svg>',
  pm_cut: '<svg class="pm" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<circle cx="24" cy="26" r="17" fill="#55925A" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<path d="M24 9 V43 M14 13 Q11 26 14 39 M34 13 Q37 26 34 39" stroke="#3E7A46" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 6 L10 14" stroke="#4A3B2E" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M38 2 L46 4 L43 12 Z" fill="#E8873A" stroke="#4A3B2E" stroke-width="2" stroke-linejoin="round"/></svg>',
  pm_match: '<svg class="pm" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 14 C8 7 18 5 20 12 C22 5 32 7 32 14 C32 21 24 27 20 31 C16 27 8 21 8 14 Z" fill="#E0503C" stroke="#4A3B2E" stroke-width="2.6" opacity=".55"/>' +
    '<path d="M20 8 V34" stroke="#4A3B2E" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M38 14 h8 M42 10 v8" stroke="#E8873A" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M36 34 C36 28 44 28 44 34 C44 30 52 30 52 34" stroke="#8FBF7F" stroke-width="3" fill="none" stroke-linecap="round" transform="translate(-4 6)"/></svg>'
};

/* ---------- 水果 art（viewBox 0 0 100 100 内部标记，全部关于 x=50 轴对称——切线 x=50 过中心）
   两侧一半共用同一 art 字符串：半块 = clipPath(等宽 50) + 镜像变换（严格等大的构造保证） */
function fruitArt(kind) {
  if (kind === 'apple') {
    return '<path d="M50 22 C32 10 10 28 14 54 C17 76 33 90 50 87 C67 90 83 76 86 54 C90 28 68 10 50 22 Z" fill="#E0503C" stroke="' + INK + '" stroke-width="3.2"/>' +
      '<ellipse cx="33" cy="58" rx="5.5" ry="3.6" fill="#F2A9A0" opacity=".7"/>' +
      '<ellipse cx="67" cy="58" rx="5.5" ry="3.6" fill="#F2A9A0" opacity=".7"/>' +
      '<path d="M50 22 C49 15 52 10 57 7" stroke="#8A5A3B" stroke-width="4.2" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="67" cy="13" rx="8.5" ry="4.2" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-18 67 13)"/>';
  }
  if (kind === 'orange') {
    return '<ellipse cx="42" cy="20" rx="8" ry="4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-24 42 20)"/>' +
      '<ellipse cx="58" cy="20" rx="8" ry="4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.2" transform="rotate(24 58 20)"/>' +
      '<circle cx="50" cy="57" r="32" fill="#F0913D" stroke="' + INK + '" stroke-width="3.2"/>' +
      '<circle cx="38" cy="47" r="1.6" fill="#D9782B"/><circle cx="62" cy="47" r="1.6" fill="#D9782B"/>' +
      '<circle cx="33" cy="62" r="1.6" fill="#D9782B"/><circle cx="67" cy="62" r="1.6" fill="#D9782B"/>' +
      '<circle cx="44" cy="71" r="1.6" fill="#D9782B"/><circle cx="56" cy="71" r="1.6" fill="#D9782B"/>' +
      '<circle cx="50" cy="57" r="1.6" fill="#D9782B"/>';
  }
  if (kind === 'melon') {
    return '<path d="M50 21 q2 -8 9 -9" stroke="#8A5A3B" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="50" cy="56" r="34" fill="#55925A" stroke="' + INK + '" stroke-width="3.2"/>' +
      '<path d="M50 23 C48 40 48 72 50 89" stroke="#3E7A46" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M29 30 Q22 56 29 82" stroke="#3E7A46" stroke-width="4.6" fill="none" stroke-linecap="round"/>' +
      '<path d="M71 30 Q78 56 71 82" stroke="#3E7A46" stroke-width="4.6" fill="none" stroke-linecap="round"/>';
  }
  if (kind === 'pizza') { /* 披萨（r7 新增）：饼边+芝士面+火腿片+青椒圈，x=50 对称 */
    return '<circle cx="50" cy="55" r="35" fill="#E8B36A" stroke="' + INK + '" stroke-width="3.2"/>' +
      '<circle cx="50" cy="55" r="29" fill="#F2C879"/>' +
      '<circle cx="39" cy="46" r="5.4" fill="#E8873A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="61" cy="46" r="5.4" fill="#E8873A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="35" cy="64" r="5.4" fill="#E8873A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="65" cy="64" r="5.4" fill="#E8873A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<circle cx="50" cy="57" r="5.4" fill="#E8873A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M45 36 q5 3 10 0 M42 72 q8 4 16 0" stroke="#8FBF7F" stroke-width="3" fill="none" stroke-linecap="round"/>';
  }
  if (kind === 'wedge') { /* 三角西瓜尖（尖朝上） */
    return '<path d="M50 9 L90 84 Q50 98 10 84 Z" fill="#55925A" stroke="' + INK + '" stroke-width="3"/>' +
      '<path d="M50 18 L82 79 Q50 91 18 79 Z" fill="#F7F3E4"/>' +
      '<path d="M50 26 L76 74 Q50 86 24 74 Z" fill="#E0503C"/>' +
      '<circle cx="44" cy="58" r="2.2" fill="' + INK + '"/><circle cx="56" cy="58" r="2.2" fill="' + INK + '"/>' +
      '<circle cx="50" cy="69" r="2.2" fill="' + INK + '"/>';
  }
  /* berry：心形草莓 */
  return '<path d="M34 22 Q42 6 50 16 Q58 6 66 22 Q58 28 50 26 Q42 28 34 22 Z" fill="#55925A" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M50 31 C50 23 41 16 33 20 C23 25 23 41 31 51 C39 61 50 70 50 79 C50 70 61 61 69 51 C77 41 77 25 67 20 C59 16 50 23 50 31 Z" fill="#E0503C" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="38" cy="40" r="1.7" fill="#F7E8B0"/><circle cx="62" cy="40" r="1.7" fill="#F7E8B0"/>' +
    '<circle cx="44" cy="52" r="1.7" fill="#F7E8B0"/><circle cx="56" cy="52" r="1.7" fill="#F7E8B0"/>' +
    '<circle cx="50" cy="64" r="1.7" fill="#F7E8B0"/>';
}

/* ---------- 三态 SVG ---------- */
let _uid = 0;
const nextUid = () => 'fs' + (++_uid);
function fruitSvg(kind) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    fruitArt(kind) + '</svg>';
}
/* 半块：viewBox 50×100；L=clip 左半原样，R=同一 art 先镜像(translate(100,0) scale(-1,1)) 再 clip 左半
   —— 两半同源同 clip 宽（50），互为镜像 → 严格等大（verify 断言 g 内容相等 + clip 等宽） */
function halfFruitSvg(kind, side, uid) {
  const id = 'clip' + (uid == null ? nextUid() : uid);
  return '<svg viewBox="0 0 50 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" data-half="' + side + '">' +
    '<defs><clipPath id="' + id + '"><rect x="0" y="0" width="50" height="100"/></clipPath></defs>' +
    '<g clip-path="url(#' + id + ')" data-art="' + kind + '" data-side="' + side + '"' +
    (side === 'R' ? ' transform="translate(100 0) scale(-1 1)"' : '') + '>' +
    fruitArt(kind) + '</g></svg>';
}

/* ---------- 扇形块 pieceArt（choose 切开演出 / fair 展示）：中心角相等 = 构造性等大
   a0/a1=起止角（度，0=上，顺时针）；data-a0/data-a1 供 verify 断言每块角跨度相等 */
function pieceArt(kind, a0, a1) {
  const cx = 50, cy = 50, r = 40;
  const pt = a => {
    const t = (a - 90) * Math.PI / 180;
    return (cx + r * Math.cos(t)).toFixed(1) + ' ' + (cy + r * Math.sin(t)).toFixed(1);
  };
  const sweep = ((a1 - a0) % 360 + 360) % 360;
  const large = sweep > 180 ? 1 : 0;
  const mid = (a0 + a1) / 2, mt = (mid - 90) * Math.PI / 180;
  const sx = (cx + r * 0.52 * Math.cos(mt)).toFixed(1), sy = (cy + r * 0.52 * Math.sin(mt)).toFixed(1);
  return '<path d="M' + cx + ' ' + cy + ' L' + pt(a0) + ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + pt(a1) + ' Z" ' +
    'fill="' + KIND_FILL[kind] + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="' + sx + '" cy="' + sy + '" r="3" fill="' + KIND_SEED[kind] + '"/>';
}
function pieceSvg(kind, a0, a1) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" ' +
    'data-a0="' + a0 + '" data-a1="' + a1 + '" data-span="' + (((a1 - a0) % 360 + 360) % 360) + '">' +
    pieceArt(kind, a0, a1) + '</svg>';
}
/* 等分 n 块的角序列（0 起顺时针）：fair 展示不公平=120°/240° */
const pieceAngles = (n, i) => 180 + (360 / n) * i;                    /* 第 i 块 [a0,a1]，首块从正左起 */
const UNFAIR_SPANS = [120, 240];                                       /* 不公平展示：一小一大 */
const fairSpans = fair => (fair ? [180, 180] : UNFAIR_SPANS);

/* ---------- 切法卡（choose 选项）：圆果 + 白切线示意（cut 型线型） */
function cutLineSvg(cut) {
  if (cut === 'halves') return '<path d="M50 12 V88" stroke="#FFF9EE" stroke-width="5" stroke-linecap="round"/>';
  if (cut === 'thirds') {  /* Y 形三线：0°/120°/240° */
    let s = '';
    [0, 120, 240].forEach(a => {
      const t = (a - 90) * Math.PI / 180;
      s += '<path d="M50 50 L' + (50 + 38 * Math.cos(t)).toFixed(1) + ' ' + (50 + 38 * Math.sin(t)).toFixed(1) +
        '" stroke="#FFF9EE" stroke-width="5" stroke-linecap="round"/>';
    });
    return s;
  }
  if (cut === 'quarters') return '<path d="M50 12 V88 M12 50 H88" stroke="#FFF9EE" stroke-width="5" stroke-linecap="round"/>';
  return '<path d="M30 12 V88" stroke="#FFF9EE" stroke-width="5" stroke-linecap="round"/>';  /* unfair：偏心刀 */
}
function cutStyleSvg(kind, cut) {
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" data-cut="' + cut + '">' +
    '<circle cx="50" cy="50" r="38" fill="' + KIND_FILL[kind] + '" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="50" cy="50" r="2.4" fill="' + KIND_SEED[kind] + '"/>' +
    cutLineSvg(cut) + '</svg>';
}
const CUT_ARIA = { halves: '切成一样大的两块', thirds: '切成一样大的三块', quarters: '切成一样大的四块', unfair: '一块大一块小' };

/* ---------- 娃娃（切块演出拿块）：圆脸+彩衣+举手 */
function dollSvg(shirt) {
  return '<svg class="doll" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M40 82 V95 M60 82 V95" stroke="#E8873A" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M33 60 q-9 4 -8 13" stroke="' + shirt + '" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M67 60 q10 -3 12 -13" stroke="' + shirt + '" stroke-width="6" stroke-linecap="round"/>' +
    '<rect x="32" y="50" width="36" height="34" rx="15" fill="' + shirt + '" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="50" cy="34" r="20" fill="#FFE3C9" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M31 30 Q34 13 50 14 Q66 13 69 30 Q60 22 50 23 Q40 22 31 30 Z" fill="#6E4A2F" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="43" cy="35" r="2.5" fill="' + INK + '"/><circle cx="57" cy="35" r="2.5" fill="' + INK + '"/>' +
    '<ellipse cx="38" cy="41" rx="3" ry="2" fill="#F2B8C6"/><ellipse cx="62" cy="41" rx="3" ry="2" fill="#F2B8C6"/>' +
    '<path d="M45 42 q5 4.5 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
}
/* 娃娃头（人数图示，非交互）：圆脸+发色 */
function dollHeadSvg(i) {
  const hair = ['#6E4A2F', '#8A5A3B', '#4A3B2E'][i % 3];
  return '<svg class="dhead" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="50" cy="52" r="34" fill="#FFE3C9" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M18 46 Q22 16 50 18 Q78 16 82 46 Q70 30 50 32 Q30 30 18 46 Z" fill="' + hair + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="39" cy="54" r="4" fill="' + INK + '"/><circle cx="61" cy="54" r="4" fill="' + INK + '"/>' +
    '<path d="M41 66 q9 8 18 0" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/></svg>';
}

/* ---------- 公平/不公平按钮图（fair 选项 + cut 判定段共用；零文字依赖=图标承载）
   公平=水平天平+两等大块+笑脸；不公平=倾斜天平+一大一小块 */
function fairBtnSvg(fair) {
  if (fair) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" data-fair="1">' +
      '<path d="M50 20 V72" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M16 30 H84" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M16 30 l-7 18 h14 Z M84 30 l-7 18 h14 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="37" y="70" width="26" height="8" rx="4" fill="#8A5A3B"/>' +
      '<circle cx="20" cy="86" r="7" fill="#E0503C" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="80" cy="86" r="7" fill="#E0503C" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="38" cy="12" r="4" fill="' + INK + '"/><path d="M34 14 q4 4 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="62" cy="12" r="4" fill="' + INK + '"/><path d="M58 14 q4 4 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
  }
  return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" data-fair="0">' +
    '<path d="M50 20 V72" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M14 40 L86 22" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M14 40 l-2 20 l14 -4 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M86 22 l2 -18 l-14 4 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="37" y="70" width="26" height="8" rx="4" fill="#8A5A3B"/>' +
    '<circle cx="18" cy="76" r="10" fill="#E0503C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="80" cy="48" r="5" fill="#E0503C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="36" cy="12" r="4" fill="' + INK + '"/><path d="M32 10 q4 -4 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="64" cy="12" r="4" fill="' + INK + '"/><path d="M60 10 q4 -4 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';
}
const FAIR_ARIA = { true: '公平', false: '不公平' };

/* ---------- 木案背景装饰（低干扰，pointer-events:none）：木纹横线 + 边角小星 ---------- */
function woodSvg() {
  let s = '<svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  [[70, 120, 180], [520, 90, 240], [840, 200, 150], [180, 430, 200], [620, 470, 220]]
    .forEach(w => {
      s += '<path d="M' + w[0] + ' ' + w[1] + ' h' + w[2] + '" stroke="#E3D2B2" stroke-width="5" stroke-linecap="round"/>';
      s += '<path d="M' + (w[0] + 30) + ' ' + (w[1] + 14) + ' h' + (w[2] * 0.5) + '" stroke="#EBDCC0" stroke-width="4" stroke-linecap="round"/>';
    });
  [[40, 552], [930, 560], [955, 60], [60, 70]].forEach(p => {
    s += '<path d="M' + p[0] + ' ' + p[1] + ' l4 -9 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 Z" fill="#EAD9BC"/>';
  });
  return s + '</svg>';
}
