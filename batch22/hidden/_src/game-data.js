/* ================= hidden 游戏数据（动物库 / 四主题场景 SVG / 遮挡物 / 章配置 / 语音文案 / 图标）
   玩法：题面语音「找一找，藏着几只小松鼠呀」。场景一幅（四主题），N 只目标动物藏在
   场景元素后（部分可见=轮廓+局部特征，遮蔽率 30-60%）。逐只点中跳出；找全过题。
   点非目标（场景元素/已找到/干扰动物）=「？」气泡轻反馈，不计数不记错（无错误路径）。
   r20 难度加深（SPEC-R20-HIDDEN）：型2/3 目标上探 [4,5]+计数作答（找全后数字条答总数，
   chips 不显总数）+型2 同系半遮蔽干扰；型4 开场闪现 2.4s+子型混合；型1 教学骨架不动。
   场景坐标：viewBox 0 0 1000 620（SCENE_W×SCENE_H），目标/命中全部用场景单位。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 场景常量（引擎与渲染共用；命中半径 78≈动物可视尺寸） ---------- */
const SCENE_W = 1000, SCENE_H = 620, HIT_R = 78;
/* 目标/干扰动物候选位（场景单位，互距 ≥256 保证命中圈不重叠；x∈[130,870] y∈[150,520]） */
const SLOTS = [[170, 205], [500, 175], [830, 215], [255, 455], [585, 430], [855, 470]];

/* ---------- 动物库（SPEC §1 六种）：n=中名 / v=可视宽（场景单位，绘制缩放基准）
   draw() 返回 120×100 viewBox 内的 SVG 群（中心即盒中心），暖棕描边卡通风 ---------- */
const ANIMALS = {
  squirrel: { n: '小松鼠', v: 150, draw: () =>
    '<path d="M40 84 C14 80 6 52 22 34 C18 54 30 64 46 66 C52 74 50 82 40 84 Z" fill="#C1784A" stroke="' + INK + '" stroke-width="4.5" stroke-linejoin="round"/>' +
    '<path d="M34 72 C23 66 21 51 28 42" fill="none" stroke="#A55F35" stroke-width="4" stroke-linecap="round"/>' +
    '<ellipse cx="62" cy="62" rx="24" ry="27" fill="#D69A6C" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<ellipse cx="66" cy="69" rx="12" ry="15" fill="#F2D9BC"/>' +
    '<path d="M62 52 q11 4 8 15" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M72 25 L69 10 L83 18 Z" fill="#D69A6C" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M74 21 L73 14 L79 18 Z" fill="#E8B795"/>' +
    '<circle cx="80" cy="39" r="17" fill="#D69A6C" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<circle cx="86" cy="36" r="3" fill="' + INK + '"/><circle cx="87" cy="35" r="1" fill="#FFF"/>' +
    '<circle cx="90" cy="44" r="3.4" fill="#F2B8A0" opacity=".85"/>' +
    '<circle cx="96" cy="41" r="2.6" fill="' + INK + '"/>' +
    '<ellipse cx="54" cy="88" rx="8" ry="4" fill="#B4713F" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="72" cy="89" rx="8" ry="4" fill="#B4713F" stroke="' + INK + '" stroke-width="3.5"/>' },
  hedgehog: { n: '小刺猬', v: 140, draw: () =>
    '<path d="M92 60 L108 48 L88 46 L98 30 L80 38 L82 20 L66 32 L60 14 L48 30 L36 18 L34 38 L18 36 L30 50 L14 56 L30 62 Z" fill="#9C7B5C" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<ellipse cx="74" cy="66" rx="26" ry="22" fill="#EBCBAD" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<circle cx="98" cy="70" r="9" fill="#E3B98F" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="104" cy="70" r="3" fill="' + INK + '"/>' +
    '<circle cx="80" cy="60" r="3.2" fill="' + INK + '"/><circle cx="81" cy="59" r="1" fill="#FFF"/>' +
    '<circle cx="88" cy="70" r="3" fill="#F2B8A0" opacity=".85"/>' +
    '<path d="M92 76 q-4 3 -9 2" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="62" cy="88" rx="7" ry="4" fill="#C9976B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="80" cy="89" rx="7" ry="4" fill="#C9976B" stroke="' + INK + '" stroke-width="3.5"/>' },
  bird: { n: '小鸟', v: 145, draw: () =>
    '<path d="M28 46 L8 34 L16 52 L4 58 L26 62 Z" fill="#5E9CC9" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M60 22 C88 22 100 44 96 63 C92 82 72 90 52 86 C34 82 23 66 27 49 C31 33 44 22 60 22 Z" fill="#7FB8E0" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<path d="M57 20 L52 7 L66 15 Z" fill="#5E9CC9" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="66" cy="71" rx="16" ry="12" fill="#CFE5F4"/>' +
    '<path d="M46 52 C38 66 45 78 59 80 C55 68 57 58 64 50 Z" fill="#5E9CC9" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M92 44 L109 51 L92 58 Z" fill="#F2A23C" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<circle cx="82" cy="42" r="3.4" fill="' + INK + '"/><circle cx="83" cy="41" r="1.1" fill="#FFF"/>' +
    '<circle cx="74" cy="52" r="3" fill="#F2B8C6" opacity=".8"/>' +
    '<path d="M52 86 v6 M70 87 v6" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' },
  frog: { n: '小青蛙', v: 130, draw: () =>
    '<circle cx="42" cy="34" r="12" fill="#7FC98A" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="78" cy="34" r="12" fill="#7FC98A" stroke="' + INK + '" stroke-width="4"/>' +
    '<ellipse cx="60" cy="63" rx="34" ry="27" fill="#7FC98A" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<ellipse cx="60" cy="71" rx="20" ry="13" fill="#D8EFCC"/>' +
    '<path d="M60 41 q4 9 0 18 q-4 9 0 18" fill="none" stroke="#E85F5A" stroke-width="9" stroke-linecap="round"/>' +
    '<circle cx="44" cy="55" r="5" fill="#E85F5A"/><circle cx="76" cy="57" r="4.5" fill="#E85F5A"/>' +
    '<circle cx="42" cy="33" r="6.4" fill="#FFF"/><circle cx="43" cy="34" r="3" fill="' + INK + '"/>' +
    '<circle cx="78" cy="33" r="6.4" fill="#FFF"/><circle cx="77" cy="34" r="3" fill="' + INK + '"/>' +
    '<path d="M47 61 q13 9 26 0" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="34" cy="56" r="3" fill="#5FA96C"/><circle cx="86" cy="56" r="3" fill="#5FA96C"/>' +
    '<path d="M42 88 q-2 7 -10 7 M78 88 q2 7 10 7" fill="none" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' },
  butterfly: { n: '蝴蝶', v: 120, draw: () => {
    const wing = 'C40 24 14 26 12 44 C10 58 30 62 44 60 C30 64 18 74 24 84 C30 92 48 82 56 64 Z';
    return '<path d="M56 52 ' + wing + '" fill="#8FBBE3" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M64 52 ' + wing + '" fill="#B7D6EE" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round" transform="translate(120 0) scale(-1 1)"/>' +
      '<circle cx="30" cy="46" r="5" fill="#FFF" opacity=".85"/><circle cx="90" cy="46" r="5" fill="#FFF" opacity=".85"/>' +
      '<ellipse cx="60" cy="62" rx="7" ry="23" fill="#8A9BAE" stroke="' + INK + '" stroke-width="4"/>' +
      '<circle cx="60" cy="34" r="8" fill="#8A9BAE" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M55 28 q-6 -10 -14 -12 M65 28 q6 -10 14 -12" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="57" cy="33" r="1.8" fill="#FFF"/><circle cx="63" cy="33" r="1.8" fill="#FFF"/>'; } },
  ladybug: { n: '瓢虫', v: 100, draw: () =>
    '<path d="M52 26 q-4 -12 -12 -16 M68 26 q4 -12 12 -16" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="60" cy="32" r="13" fill="' + INK + '"/>' +
    '<circle cx="55" cy="29" r="2.2" fill="#FFF"/><circle cx="65" cy="29" r="2.2" fill="#FFF"/>' +
    '<ellipse cx="60" cy="60" rx="34" ry="29" fill="#E85F5A" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<path d="M60 33 V88" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="44" cy="52" r="5.5" fill="' + INK + '"/><circle cx="76" cy="52" r="5.5" fill="' + INK + '"/>' +
    '<circle cx="41" cy="70" r="4.5" fill="' + INK + '"/><circle cx="79" cy="69" r="4.5" fill="' + INK + '"/>' +
    '<circle cx="60" cy="79" r="4.5" fill="' + INK + '"/>' +
    '<ellipse cx="52" cy="89" rx="6" ry="3.5" fill="' + INK + '"/><ellipse cx="68" cy="89" rx="6" ry="3.5" fill="' + INK + '"/>' }
};
const ANIMAL_IDS = Object.keys(ANIMALS);
const nameOf = a => ANIMALS[a].n;

/* ---------- 中文数词 1-6（题面报数 TTS 兜底） ---------- */
const NUM_CN = ['一', '两', '三', '四', '五', '六'];   /* 审查 m4：量词位口语「两只」非「二只」 */
const numCn = k => NUM_CN[k - 1];

/* ---------- 同系对（r20 SPEC-R20 §R2：视觉相似族，型2 同系干扰判别负荷；M-2 修复调真同色系）
   蓝翅系 bird↔butterfly（蝴蝶=蓝闪蝶原型，与鸟同蓝族——判别靠喙/翅脉/触角，非色相扫除）
   红绿斑点系 frog↔ladybug（蛙背红斑↔瓢虫红壳黑点——红色互染打破「红虫绿蛙」一扫即分）
   棕毛系 squirrel↔hedgehog（色相差<10°，判别靠大尾 vs 背刺） ---------- */
const SIM = { bird: 'butterfly', butterfly: 'bird', frog: 'ladybug', ladybug: 'frog',
  squirrel: 'hedgehog', hedgehog: 'squirrel' };

/* ---------- 章配置（章号 1 基；进度章号单调递增、难度章号 (ch-1)%4+1 循环）
   r20 难度加深（SPEC-R20-HIDDEN §R2）：1=单种 N∈[2,3]+异种干扰（教学骨架不动）/
   2=单种 N∈[4,5]+同系半遮蔽干扰+计数作答 / 3=双种 N∈[4,5]+计数作答（X+Y 合成）/
   4=闪现混合（每题掷子型∈{2,3}，全关 ≥2 种型，全部计数作答+开场闪现）
   name 供章末预告；hint=章末预告下一章文案（hint[i]↔CHAPTERS[i+1] 玩法，GEN 文案不带前缀） ---------- */
const CHAPTERS = {
  1: { name: '藏猫猫', hint: '下次小动物更多啦，找完还要数一数有几只' },
  2: { name: '数一数', hint: '下次要同时找两种小动物，数清楚一共几只哦' },
  3: { name: '找两种', hint: '下次小动物只闪一下就藏好，看仔细记住哦' },
  4: { name: '记住它', hint: '新一轮藏猫猫又开始啦，先找两三只' }
};
const GEN_HINTS = ['新一轮藏猫猫，先找两三只小动物', '一次找四五只，找完数一数答数量',
  '两种小动物一起找，数清楚总数哦', '小动物闪一下就藏好，最会记的小侦探就是你'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
/* pattern → 生成参数（PATS[p]；countAsk=找全后数字作答 / flash=开场闪现 / simDistr=同系干扰）
   distrOcc 区间仅 simDistr 用（型1 干扰全可见无遮挡） */
const PATS = {
  1: { nMin: 2, nMax: 3, occMin: 0.30, occMax: 0.45, dual: false, distr: true,
       simDistr: false, countAsk: false, flash: false },
  2: { nMin: 4, nMax: 5, occMin: 0.40, occMax: 0.55, dual: false, distr: true,
       simDistr: true, distrOccMin: 0.35, distrOccMax: 0.55, countAsk: true, flash: false },
  3: { nMin: 4, nMax: 5, occMin: 0.35, occMax: 0.60, dual: true, distr: false,
       simDistr: false, countAsk: true, flash: false },
  4: { nMin: 4, nMax: 5, occMin: 0.35, occMax: 0.60, dual: false, distr: false,
       simDistr: false, countAsk: true, flash: true }   /* 型4 壳参数：实际逐题按子型 {2,3} 生成 */
};
/* 作答数字域（SPEC-R20 §R3）：恒 {2,3,4,5,6} 五钮（n∈[4,5] 居中段，蒙对率 1/5） */
const ANSWER_DOMAIN = [2, 3, 4, 5, 6];
/* 闪现时长（ms，真实页；verify 页 ×SPEED=0.12 → 0.288s）——SPEC-R20 §R4 */
const FLASH_MS = 2400;

/* ---------- 主题（四主题轮换；occKinds=该主题的遮挡物种类） ---------- */
const THEMES = ['tree', 'garden', 'room', 'pond'];
const THEME_NAMES = { tree: '大树', garden: '花园', room: '房间', pond: '池塘' };
const OCC_KINDS = { tree: ['leaf', 'grass'], garden: ['bush', 'grass'], room: ['box', 'cushion'], pond: ['pad', 'reed'] };

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   watch/turn/hint/right 四条有预合成 clip；wrong 不建（本款无错误路径——
   点非目标=「？」气泡轻反馈，不计数不记错）；
   T46 阶段2：题面 6 全句（单种 hid_q_{动物}）+双种段链 14（hid_s_find/hid_an_×6/
   hid_s_he/hid_n_1..6）+干扰点名 hid_w_×6+教学引导 hid_ear clip 化 ---------- */
const VOICE = {
  watch: { key: 'hid_tut_watch', text: '看！小动物藏起来啦' },
  turn:  { key: 'hid_tut_turn',  text: '你来找一找' },
  hint:  { key: 'hid_hint',      text: '看看叶子后面' },
  right: { key: 'hid_right',     text: '全找到啦，眼睛真亮' },
  ear:   { key: 'hid_ear',       text: '看到耳朵尖了吗' }   /* T46 教学引导语 */
};

/* ---------- 题面朗读（T46 阶段2 clip 化；text=兜底文案）
   单种：「找一找，藏着几只小松鼠呀」整句 hid_q_{动物}；
   双种（§1）：「找二只小松鼠和一只小刺猬」段链 find+数+名+和+数+名 ---------- */
function quizSpeech(q) {
  if (q.kinds.length === 2) {
    return '找' + numCn(q.kinds[0].count) + '只' + nameOf(q.kinds[0].a) +
           '和' + numCn(q.kinds[1].count) + '只' + nameOf(q.kinds[1].a);
  }
  return '找一找，藏着几只' + nameOf(q.kinds[0].a) + '呀';
}
const quizKeys = q => q.kinds.length === 2
  ? ['hid_s_find', 'hid_n_' + q.kinds[0].count, 'hid_an_' + q.kinds[0].a,
     'hid_s_he', 'hid_n_' + q.kinds[1].count, 'hid_an_' + q.kinds[1].a]
  : ['hid_q_' + q.kinds[0].a];
const wrongKey = a => 'hid_w_' + a;                 /* 干扰动物点名「这不是X呀」 */

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕 / 暖橙点缀） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="19" cy="19" r="8.5" fill="#A8CF8E" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M25 25 L36 36" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M15 14 q3 -4 7 -2" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<circle cx="33" cy="12" r="3" fill="#F7CE55" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M8 32 q4 -6 9 -3" stroke="#E8975A" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>',
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

/* ---------- 动物放置（场景单位）：居中于 (x,y)，按 v 可视宽缩放
   外层 .an 不带 transform（留给 CSS 跳出动画），定位 transform 放内层 g ---------- */
function animalAt(a, x, y, cls) {
  const k = ANIMALS[a].v / 110;                      // 120 盒内可视约 110 宽
  return '<g class="an' + (cls || '') + '"><g transform="translate(' + x + ' ' + y + ') scale(' + k.toFixed(3) + ') translate(-60 -50)">' +
    ANIMALS[a].draw() + '</g></g>';
}

/* ---------- 遮挡物（居中于 (0,0)，宽约 W 场景单位；盖在动物上方实现部分可见）
   W 由引擎按遮蔽率给出（occ 大→遮挡物大），side=±1 决定盖左还是右 ---------- */
function occSvg(kind, W, side) {
  const k = W / 100;                                 // 各款基准宽 100
  const t = 'translate(' + (side * 18) + ' 6) scale(' + k.toFixed(3) + ')';
  if (kind === 'leaf') return '<g transform="' + t + '">' +
    '<ellipse cx="-26" cy="4" rx="34" ry="24" fill="#7FB069" stroke="' + INK + '" stroke-width="4" transform="rotate(-18 -26 4)"/>' +
    '<ellipse cx="24" cy="0" rx="36" ry="25" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4" transform="rotate(14 24 0)"/>' +
    '<ellipse cx="0" cy="26" rx="33" ry="21" fill="#6A9B57" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M-30 6 q28 -8 52 -4 M0 24 q-4 -16 2 -26" fill="none" stroke="#4E7A44" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>';
  if (kind === 'grass') return '<g transform="' + t + '">' +
    '<path d="M-42 30 C-46 4 -36 -14 -30 -22 C-30 -4 -26 12 -20 28 Z" fill="#7FAE62" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M-16 32 C-14 6 -6 -12 2 -20 C-4 -2 -4 16 0 32 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M18 32 C24 8 34 -6 44 -12 C36 4 32 20 32 32 Z" fill="#6A9B57" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<path d="M-46 32 h96" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/></g>';
  if (kind === 'bush') return '<g transform="' + t + '">' +
    '<ellipse cx="-20" cy="16" rx="32" ry="24" fill="#7FB069" stroke="' + INK + '" stroke-width="4"/>' +
    '<ellipse cx="24" cy="14" rx="30" ry="22" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="-16" cy="-14" r="12" fill="#F4A3C4" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="10" cy="-20" r="13" fill="#F7CE55" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="34" cy="-12" r="11" fill="#F4A3C4" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="-16" cy="-14" r="4" fill="#FFF" opacity=".8"/><circle cx="10" cy="-20" r="4" fill="#FFF" opacity=".8"/></g>';
  if (kind === 'box') return '<g transform="' + t + '">' +
    '<rect x="-42" y="-34" width="84" height="64" rx="10" fill="#E8B48C" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<rect x="-42" y="-34" width="84" height="16" rx="8" fill="#F2CDA8" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="0" cy="0" r="6" fill="#C98A5B" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M-30 12 h60" stroke="#C98A5B" stroke-width="4" stroke-linecap="round" opacity=".7"/></g>';
  if (kind === 'cushion') return '<g transform="' + t + '">' +
    '<rect x="-44" y="-28" width="88" height="58" rx="24" fill="#F2C9A6" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<rect x="-44" y="-28" width="40" height="58" rx="20" fill="#E8B48C" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="0" cy="1" r="5.5" fill="#D9A97E" stroke="' + INK + '" stroke-width="3"/></g>';
  if (kind === 'pad') return '<g transform="' + t + '">' +
    '<path d="M-46 0 A46 30 0 1 1 20 26 L-2 6 Z" fill="#6FAE62" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M0 4 L-34 -14 M0 4 L30 -16 M0 4 L-8 24" stroke="#4E7A44" stroke-width="3" stroke-linecap="round" opacity=".6"/>' +
    '<ellipse cx="34" cy="-12" rx="9" ry="7" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="31" cy="-16" r="3" fill="#F4A3C4" stroke="' + INK + '" stroke-width="2.4"/></g>';
  /* reed */ return '<g transform="' + t + '">' +
    '<path d="M-34 34 C-38 8 -40 -10 -38 -26" fill="none" stroke="#6A9B57" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M-2 34 C-2 6 0 -14 2 -32" fill="none" stroke="#7FAE62" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M32 34 C36 10 36 -6 32 -20" fill="none" stroke="#6A9B57" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="-43" y="-46" width="11" height="24" rx="5.5" fill="#A5764F" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="-7" y="-52" width="12" height="26" rx="6" fill="#B08052" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="27" y="-40" width="11" height="22" rx="5.5" fill="#A5764F" stroke="' + INK + '" stroke-width="3.5"/></g>';
}

/* ---------- 四主题场景背景（viewBox 1000×620，静态层，低干扰）
   rnd=场景装饰微随机流（seeded）---------- */
function sceneBg(theme, rnd) {
  if (theme === 'tree') {
    let s = '<defs><linearGradient id="sky-tree" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#DDEFF6"/><stop offset="1" stop-color="#E8F3E9"/></linearGradient></defs>' +
      '<rect width="1000" height="620" fill="url(#sky-tree)"/>' +
      '<circle cx="120" cy="100" r="52" fill="#F7CE55" stroke="' + INK + '" stroke-width="5"/>' +
      '<g stroke="#E8B23C" stroke-width="5" stroke-linecap="round">' +
      '<path d="M120 24 v-18 M120 176 v18 M44 100 h-18 M196 100 h18 M66 46 l-13 -13 M174 46 l13 -13 M66 154 l-13 13 M174 154 l13 13"/></g>' +
      '<g fill="#FFF" opacity=".75"><ellipse cx="430" cy="90" rx="52" ry="20"/><ellipse cx="470" cy="80" rx="40" ry="17"/>' +
      '<ellipse cx="640" cy="150" rx="44" ry="16" opacity=".8"/></g>' +
      '<path d="M0 468 C160 440 330 486 520 464 C700 444 860 486 1000 462 V620 H0 Z" fill="#A8CF8E" stroke="#7FAE72" stroke-width="4"/>' +
      '<path d="M0 468 C160 440 330 486 520 464 C700 444 860 486 1000 462" fill="none" stroke="#8FBF7F" stroke-width="3" opacity=".5"/>' +
      '<path d="M768 470 C778 380 758 300 738 236 L802 236 C796 320 802 400 832 470 Z" fill="#A5764F" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M752 470 q-8 -60 6 -110 M786 468 q4 -56 -4 -104" fill="none" stroke="#8A5F3E" stroke-width="4" stroke-linecap="round" opacity=".6"/>' +
      '<circle cx="770" cy="176" r="118" fill="#8FBF7F" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="656" cy="228" r="92" fill="#7FB069" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="884" cy="226" r="88" fill="#7FB069" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="760" cy="152" r="60" fill="#A8CF8E" opacity=".8"/>' +
      '<circle cx="120" cy="486" r="52" fill="#8FBF7F" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="176" cy="502" r="40" fill="#7FB069" stroke="' + INK + '" stroke-width="5"/>' +
      '<circle cx="66" cy="506" r="38" fill="#7FB069" stroke="' + INK + '" stroke-width="5"/>';
    for (let i = 0; i < 7; i++) { const fx = 60 + rnd() * 880, fy = 540 + rnd() * 56;
      s += '<g transform="translate(' + fx.toFixed(0) + ' ' + fy.toFixed(0) + ')">' +
        '<path d="M0 0 v-14" stroke="#6A9B57" stroke-width="3.5"/>' +
        '<circle cx="0" cy="-18" r="6" fill="' + (i % 2 ? '#F4A3C4' : '#F7CE55') + '" stroke="' + INK + '" stroke-width="2.5"/></g>'; }
    return s;
  }
  if (theme === 'garden') {
    let s = '<defs><linearGradient id="sky-gdn" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#DDEFF6"/><stop offset="1" stop-color="#E4F0DC"/></linearGradient></defs>' +
      '<rect width="1000" height="620" fill="url(#sky-gdn)"/>' +
      '<circle cx="880" cy="92" r="48" fill="#F7CE55" stroke="' + INK + '" stroke-width="5"/>' +
      '<g fill="#FFF" opacity=".75"><ellipse cx="250" cy="86" rx="48" ry="18"/><ellipse cx="290" cy="78" rx="36" ry="15"/>' +
      '<ellipse cx="560" cy="120" rx="42" ry="16"/></g>';
    for (let x = 30; x < 990; x += 74)                         /* 栅栏 */
      s += '<rect x="' + x + '" y="288" width="40" height="120" rx="8" fill="#D9B98C" stroke="' + INK + '" stroke-width="4"/>';
    s += '<rect x="0" y="308" width="1000" height="18" rx="9" fill="#C9A87C" stroke="' + INK + '" stroke-width="4"/>' +
      '<rect x="0" y="366" width="1000" height="18" rx="9" fill="#C9A87C" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M0 430 C200 408 380 442 560 424 C740 408 880 442 1000 424 V620 H0 Z" fill="#A8CF8E" stroke="#7FAE72" stroke-width="4"/>';
    for (let i = 0; i < 6; i++) {                              /* 向日葵（装饰） */
      const fx = 70 + i * 165 + (rnd() * 30 - 15), fh = 120 + rnd() * 30;
      s += '<g transform="translate(' + fx.toFixed(0) + ' 430)">' +
        '<path d="M0 0 C-4 -40 4 -80 0 -' + fh.toFixed(0) + '" fill="none" stroke="#6A9B57" stroke-width="6"/>' +
        '<path d="M0 -' + (fh * .5).toFixed(0) + ' q-26 -10 -34 -30 M0 -' + (fh * .62).toFixed(0) + ' q26 -10 34 -30" fill="none" stroke="#6A9B57" stroke-width="5"/>' +
        '<g transform="translate(0 -' + (fh + 6).toFixed(0) + ')">';
      for (let p = 0; p < 8; p++) s += '<ellipse cx="0" cy="-26" rx="9" ry="20" fill="#F7CE55" stroke="' + INK + '" stroke-width="3" transform="rotate(' + (p * 45) + ' 0 0)"/>';
      s += '<circle cx="0" cy="0" r="15" fill="#A5764F" stroke="' + INK + '" stroke-width="4"/></g></g>'; }
    for (let i = 0; i < 8; i++) { const fx = 50 + rnd() * 900, fy = 540 + rnd() * 52;
      s += '<circle cx="' + fx.toFixed(0) + '" cy="' + fy.toFixed(0) + '" r="7" fill="' + (i % 3 ? '#F4A3C4' : '#B48CE8') + '" stroke="' + INK + '" stroke-width="3"/>'; }
    return s;
  }
  if (theme === 'room') {
    let s = '<rect width="1000" height="620" fill="#F6E7D2"/>' +
      '<rect x="0" y="430" width="1000" height="190" fill="#E3C9A4"/>' +
      '<g stroke="#C9A87C" stroke-width="4">' +
      '<path d="M0 470 h1000 M0 530 h1000 M0 590 h1000 M180 430 v190 M520 430 v190 M860 430 v190"/></g>' +
      '<rect x="60" y="66" width="250" height="220" rx="12" fill="#BFE0E8" stroke="' + INK + '" stroke-width="6"/>' +
      '<path d="M60 66 h250 v220" fill="none"/>' +
      '<circle cx="150" cy="150" r="34" fill="#F7CE55" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M92 250 q60 -46 190 -10" fill="none" stroke="#A8D0DC" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M110 190 q20 -34 44 -6 M210 130 q22 -30 44 -4" fill="none" stroke="#FFF" stroke-width="7" stroke-linecap="round" opacity=".8"/>' +
      '<path d="M36 176 C30 92 60 46 96 44 C88 120 96 176 130 210 L36 210 Z" fill="#F4C3DA" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M334 176 C340 92 310 46 274 44 C282 120 274 176 240 210 L334 210 Z" fill="#F4C3DA" stroke="' + INK + '" stroke-width="5" stroke-linejoin="round"/>' +
      '<ellipse cx="500" cy="540" rx="250" ry="66" fill="#F2C9A6" stroke="' + INK + '" stroke-width="5"/>' +
      '<ellipse cx="500" cy="540" rx="190" ry="46" fill="none" stroke="#E8B48C" stroke-width="5"/>' +
      '<rect x="60" y="330" width="230" height="60" rx="18" fill="#E8A0A6" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="60" y="390" width="230" height="52" rx="14" fill="#F2B8C0" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="70" y="442" width="30" height="60" rx="10" fill="#D98F96" stroke="' + INK + '" stroke-width="5"/>' +
      '<rect x="250" y="442" width="30" height="60" rx="10" fill="#D98F96" stroke="' + INK + '" stroke-width="5"/>' +
      '<ellipse cx="840" cy="452" rx="130" ry="34" fill="#C9A87C" stroke="' + INK + '" stroke-width="5"/>' +
      '<path d="M726 452 v126 M954 452 v126 M726 578 h228" stroke="#A5764F" stroke-width="12" stroke-linecap="round"/>' +
      '<circle cx="840" cy="428" r="26" fill="#A8CF8E" stroke="' + INK + '" stroke-width="4"/>' +
      '<path d="M818 428 q10 -12 22 0 q10 12 22 0" fill="none" stroke="#FFF" stroke-width="4" stroke-linecap="round"/>';
    for (let i = 0; i < 5; i++) { const bx = 640 + rnd() * 30, by = 500 + rnd() * 40;
      s += '<rect x="' + bx.toFixed(0) + '" y="' + by.toFixed(0) + '" width="34" height="24" rx="4" fill="' + (i % 2 ? '#7FB8E0' : '#F4A3C4') + '" stroke="' + INK + '" stroke-width="3"/>'; }
    return s;
  }
  /* pond */
  let s = '<defs><linearGradient id="sky-pond" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#DDEFF6"/><stop offset="1" stop-color="#CFE6EC"/></linearGradient>' +
    '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#BFE0E8"/><stop offset="1" stop-color="#9FCEDC"/></linearGradient></defs>' +
    '<rect width="1000" height="620" fill="url(#sky-pond)"/>' +
    '<circle cx="140" cy="86" r="44" fill="#F7CE55" stroke="' + INK + '" stroke-width="5"/>' +
    '<g fill="#FFF" opacity=".75"><ellipse cx="560" cy="70" rx="46" ry="17"/><ellipse cx="600" cy="62" rx="34" ry="14"/>' +
    '<ellipse cx="820" cy="110" rx="40" ry="15"/></g>' +
    '<rect x="0" y="180" width="1000" height="440" fill="url(#water)"/>' +
    '<path d="M0 180 h1000" stroke="#8FBCCB" stroke-width="5"/>' +
    '<path d="M0 214 C240 196 420 232 640 214 C820 200 920 226 1000 212" fill="none" stroke="#BFE0E8" stroke-width="0" />' +
    '<path d="M60 250 q120 -10 240 6 M540 300 q140 -12 280 8 M120 380 q110 -10 210 6 M640 460 q130 -12 260 8 M240 520 q100 -8 190 6" ' +
    'fill="none" stroke="#CFE9F0" stroke-width="6" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M0 520 C160 500 300 540 460 524 C640 506 820 546 1000 524 V620 H0 Z" fill="#A8CF8E" stroke="#7FAE72" stroke-width="4"/>';
  for (let i = 0; i < 3; i++) {                               /* 岸边香蒲装饰 */
    const rx = [46, 950, 90][i];
    s += '<g transform="translate(' + rx + ' ' + (500 + i * 30) + ')">' + occSvg('reed', 70 + rnd() * 26, 1) + '</g>'; }
  s += '<g transform="translate(870 560)"><ellipse cx="0" cy="0" rx="46" ry="26" fill="#B9C2CB" stroke="' + INK + '" stroke-width="4.5"/>' +
    '<ellipse cx="-30" cy="8" rx="26" ry="16" fill="#CBD3DA" stroke="' + INK + '" stroke-width="4"/></g>' +
    '<g transform="translate(150 240)"><ellipse cx="0" cy="0" rx="40" ry="15" fill="#6FAE62" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="-26" cy="-14" r="9" fill="#FFF" stroke="' + INK + '" stroke-width="3"/></g>';
  return s;
}
