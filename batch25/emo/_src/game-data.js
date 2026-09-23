/* ================= emo 情绪脸谱 游戏数据（情绪封闭表 / 情境表 / 章配置 / 语音文案 / 表情脸 SVG / 场景图）
   玩法（SPEC-R35-EMO，承 SPEC-BATCH25 §0.59/§2）：两向题型——
   fwd 正向：题面 = 情境场景图 + 情境句 clip（emo_s_<场景>，T46 已在册），下方 4 张表情脸；
   rev 逆向：题面 = 大表情脸 + 情绪词 clip（emo_w_<词>）+ 问句（emo_rev_q——TODO 注册前
   TTS 兜底），下方 4 张情境场景图（2×2，选「是发生了哪件事」）——情绪词（动机）与
   情境事件（行为）双向匹配（r35 双线索整合，见 SPEC §R1 维度二）。
   选对 = 该卡放大跳 + 情绪词 clip（emo_w_<词>）+ 链尾句（fwd=确认句 emo_cf_<场景>；
   rev=情境句 emo_s_<场景>——两链同构同窗 RIGHT_CHAIN_MS）；
   选错 = 摇头 + 引导反馈（emo_wrong「再看看小兔子发生了什么呀」——不否定人格，
   不说「你错了」「你不该开心」，卡不灰可重选——探索不罚）。
   表情脸 = SVG 五官组合：同一脸型基座（兔耳+圆脸+腮红+鼻恒定）+ 眉/眼/嘴三维变体
   （同脸不同情，禁用颜色/装饰代替表情——腮红全六型恒同，不承载区分）。
   情绪封闭集 6（表外不出题）：happy 开心 / sad 难过 / angry 生气 /
   scared 害怕 / surprised 惊讶 / worried 担心。
   近情绪对封闭 3 对（r35 扩第三对，双向全覆盖）：sad↔worried / angry↔scared（硬对=HARD4
   成员，ch3 目标域）+ happy↔surprised（愿望满足 vs 出乎意料——在册情境文案已承载区分）。
   每题干扰必含目标情绪的近伙伴（r35 全域恒在律——两向题型同守）。
   情境线索铁律（辨析根基）：sad=已发生的心爱之物失去（句多完成态「了」）/
   worried=还没发生的担心（「怕…」「会不会…」「还没…」）/ angry=被人冒犯不公平 /
   scared=自身安危即时威胁 / happy=愿望满足（收到想要的）/ surprised=出乎意料（没想到的）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 情绪封闭表：id → 中文名（情绪词 TTS 兜底文案与 clip emo_w_<id> text 一致） */
const EMOS = {
  happy:     { n: '开心' },
  sad:       { n: '难过' },
  angry:     { n: '生气' },
  scared:    { n: '害怕' },
  surprised: { n: '惊讶' },
  worried:   { n: '担心' }
};
const ALL6 = Object.keys(EMOS);                                    // 封闭 6 集（ch1 起全池——r35）
const HARD4 = ['sad', 'worried', 'angry', 'scared'];                // 两硬对成员=ch3 目标域（r35）
const NEAR = { sad: 'worried', worried: 'sad',                      // 近情绪对封闭 3 对（r35 扩
               angry: 'scared', scared: 'angry',                    // happy↔surprised：愿望满足 vs
               happy: 'surprised', surprised: 'happy' };            // 出乎意料——全域恒在律前提）
const nameOfEmo = e => EMOS[e].n;

/* ---------- 情境-情绪映射封闭表（≥20 情境，每情境唯一答案情绪；§0.59）
   id / emo 唯一答案 / bg 背景（day 草地日 / room 室内 / night 傍晚夜）/
   ask 题面情境句（TTS 拼句）/ cue 确认句前缀（confirm = cue + '，小兔子很' + 情绪词，
   如「冰淇淋掉了，小兔子很难过」——SPEC §0.59 原例） */
const SCENES = [
  /* happy 4 */
  { id: 'h_gift',     emo: 'happy', bg: 'day',
    ask: '今天过生日，小兔子收到一个大礼物盒', cue: '收到礼物' },
  { id: 'h_icecream', emo: 'happy', bg: 'day',
    ask: '小兔子吃到了甜甜的冰淇淋', cue: '吃到冰淇淋' },
  { id: 'h_sticker',  emo: 'happy', bg: 'day',
    ask: '好朋友把亮晶晶的贴纸送给小兔子', cue: '收到贴纸' },
  { id: 'h_park',     emo: 'happy', bg: 'day',
    ask: '妈妈带小兔子去公园荡秋千', cue: '荡秋千' },
  /* sad 4（已发生的心爱之物失去——完成态「了」线索） */
  { id: 's_icecream', emo: 'sad', bg: 'day',
    ask: '小兔子的冰淇淋啪嗒掉到地上了', cue: '冰淇淋掉了' },
  { id: 's_balloon',  emo: 'sad', bg: 'day',
    ask: '气球飞走了，越飞越高抓不到了', cue: '气球飞走了' },
  { id: 's_teddy',    emo: 'sad', bg: 'room',
    ask: '心爱的小熊玩偶开线破掉了', cue: '玩偶破了' },
  { id: 's_flower',   emo: 'sad', bg: 'day',
    ask: '小兔子天天浇水的花儿枯掉了', cue: '花儿枯了' },
  /* angry 4（被人冒犯 / 不公平） */
  { id: 'a_grab',   emo: 'angry', bg: 'day',
    ask: '小狐狸一把抢走了小兔子的胡萝卜', cue: '胡萝卜被抢走了' },
  { id: 'a_blocks', emo: 'angry', bg: 'room',
    ask: '搭好的积木高塔被人推倒了', cue: '高塔被推倒' },
  { id: 'a_queue',  emo: 'angry', bg: 'day',
    ask: '小狐狸插队，站到了小兔子前面', cue: '被人插队' },
  { id: 'a_laugh',  emo: 'angry', bg: 'day',
    ask: '小狐狸笑话小兔子的长耳朵', cue: '被笑话了' },
  /* scared 4（自身安危即时威胁） */
  { id: 'c_dark',    emo: 'scared', bg: 'night',
    ask: '晚上房间黑黑的，小兔子一个人睡不着', cue: '房间黑黑的' },
  { id: 'c_thunder', emo: 'scared', bg: 'night',
    ask: '轰隆隆，外面打雷了', cue: '打雷了' },
  { id: 'c_bdog',    emo: 'scared', bg: 'day',
    ask: '一只大狗汪汪叫着跑过来', cue: '大狗跑过来' },
  { id: 'c_shot',    emo: 'scared', bg: 'room',
    ask: '要打预防针了，小兔子看着尖尖的针头', cue: '要打针了' },
  /* worried 4（还没发生的担心——「怕 / 会不会 / 还没」线索） */
  { id: 'w_test', emo: 'worried', bg: 'room',
    ask: '明天要考数数，小兔子怕自己数不好', cue: '怕考不好' },
  { id: 'w_mom',  emo: 'worried', bg: 'night',
    ask: '天黑了，妈妈还没有回家', cue: '妈妈还没回家' },
  { id: 'w_rain', emo: 'worried', bg: 'day',
    ask: '天上飘来大乌云，等下会不会下雨呀', cue: '担心下雨' },
  { id: 'w_path', emo: 'worried', bg: 'day',
    ask: '树林里岔路好多，回家的路走哪条呢', cue: '怕迷路' },
  /* surprised 4（出乎意料） */
  { id: 'su_party',   emo: 'surprised', bg: 'room',
    ask: '推开门，朋友们跳出来喊：生日快乐', cue: '生日惊喜' },
  { id: 'su_snow',    emo: 'surprised', bg: 'day',
    ask: '早上一睁眼，外面全白了，下雪啦', cue: '下雪啦' },
  { id: 'su_egg',     emo: 'surprised', bg: 'day',
    ask: '母鸡妈妈送来一个特别大的蛋', cue: '好大的蛋' },
  { id: 'su_balls',   emo: 'surprised', bg: 'room',
    ask: '打开盒子，一串气球呼地飞了出来', cue: '飞出气球' }
];
const sceneById = id => SCENES.find(s => s.id === id);
const confirmOf = sc => sc.cue + '，小兔子很' + nameOfEmo(sc.emo);   // 确认句模板

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言——r35 文案重写联动） */
const CHAPTERS = {
  1: { name: '心情脸', hint: '还要想一想，是发生了哪件事' },        // 预告 ch2 rev 逆向题
  2: { name: '哪件事', hint: '像的心情碰上像的事，仔细挑一挑' },    // 预告 ch3 硬对+rev 主载
  3: { name: '像不像', hint: '正着猜反着猜，大挑战来啦' },          // 预告 ch4 双向混合
  4: { name: '大挑战', hint: '新一轮心情猜猜挑战' }                // 预告生成关
};
const GEN_HINTS = ['六种心情都认识，像不像的要看清',   // dch1 全池+近对恒在（r35）
                   '想一想，是发生了哪件事',           // dch2 rev 逆向
                   '像的心情配对事，仔细挑',           // dch3 硬对域+rev 主载
                   '正着反着都能猜，想好再选'];        // dch4 双向混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   基础 5 条 + 情绪词 6 条（选对按题内情绪取 emo_w_<id>）+ rev 问句 1 条（TODO——
   注册前 TTS 兜底，SPEC-R35-EMO §R7；注册后 build/verify/gate 计数 62→63 联动）
   情境句 emo_s_<场景>/确认句 emo_cf_<场景> 48 条（T46 在册，ask/cue 文案锁死不改）。
   clip 实长（mutagen 实测，家族 H 等待窗基准）：
   watch 2952 / turn 1872 / hint 2544 / right 2976 / wrong 3312 /
   emo_w_happy 1368 / sad 1392 / angry 1488 / scared 1344 / surprised 1344 / worried 1344 */
const VOICE = {
  watch:  { key: 'emo_tut_watch',  text: '看！小兔子怎么了' },
  turn:   { key: 'emo_tut_turn',   text: '你来选一选' },
  hint:   { key: 'emo_hint',       text: '再看看发生了什么' },
  right:  { key: 'emo_right',      text: '你说对啦，抱抱小兔子' },
  wrong:  { key: 'emo_wrong',      text: '再看看小兔子发生了什么呀' },
  rev:    { key: 'emo_rev_q',      text: '小兔子怎么了，选一选是哪件事' },  // rev 题面链第二段（TODO 注册前 TTS 兜底）
  word:   emo => ({ key: 'emo_w_' + emo, text: nameOfEmo(emo) })   // 情绪词（两向选对链首段/rev 题面链首段）
};
/* 判对链窗（家族 G/H）：queue([情绪词 clip(≤1488) + 段间 150 + 确认句 TTS≈1500]) + 300 余量
   = 3438 → 取 3500（≥3300 任务书下限）；错反馈窗 1000（b16 定案，可被对选打断=容忍） */
const RIGHT_CHAIN_MS = 6800;   /* 审查M2 定窗+r35审查M-1 mp3 实测终证（2026-09-21 主线 mutagen 全族）：max(emo_w_)=1488(angry)+150+max(emo_s_)=4560(c_shot)=6198+300=6498 ≤6800 ✓（rev 链余 602ms；fwd 链 max(emo_cf_)=3888(a_grab)=5526 余 1274ms）。原 SAPI 口径 4281-4825 为定窗时代估值，被 mp3 实测取代 */
const WRONG_WIN_MS = 1000;

/* ================= 表情脸 SVG（viewBox 0 0 100 100）
   基座恒定（兔耳×2+内耳 / 圆脸 / 腮红×2 / 鼻）——同脸不同情；
   五官三维变体 FACE_ELS[emo] = { brow, eye, mouth }（六型两两 ≥2 维互异——verify 断言）：
   happy=平弧眉+笑弯月眼+大笑张嘴 / sad=八字重眉+下垂弧眼+∩下垂嘴
   angry=内斜下压眉+实心瞪眼+W 下压嘴 / scared=高挑弯眉+大白圆眼小瞳+波浪小嘴
   surprised=高平眉+大圆眼中瞳+大 O 嘴 / worried=轻斜眉+中圆眼小瞳+小波浪嘴 */
const FACE_BASE = {
  ears: '<path d="M32 36 C28 18 33.5 7 40 7.5 C46 8 48 21 44 37 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M35.5 31 C33.6 19 36.8 12 39.8 12.4 C42.6 12.8 43.6 21 41.6 30.6 Z" fill="#F2B8C6"/>' +
        '<path d="M68 36 C72 18 66.5 7 60 7.5 C54 8 52 21 56 37 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<path d="M64.5 31 C66.4 19 63.2 12 60.2 12.4 C57.4 12.8 56.4 21 58.4 30.6 Z" fill="#F2B8C6"/>',
  head: '<ellipse cx="50" cy="62" rx="35" ry="33" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>',
  blush: '<ellipse cx="28" cy="66" rx="5.5" ry="3.6" fill="#F7C6CD" opacity=".85"/>' +
         '<ellipse cx="72" cy="66" rx="5.5" ry="3.6" fill="#F7C6CD" opacity=".85"/>',
  nose: '<path d="M46.5 59.5 L53.5 59.5 L50 64 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/>'
};
const FACE_ELS = {
  happy: {
    brow: '<path d="M30 45 Q38 39 46 43" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          '<path d="M54 43 Q62 39 70 45" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
    eye:  '<path d="M33 54 Q39 47 45 54" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
          '<path d="M55 54 Q61 47 67 54" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    mouth:'<path d="M38 67 Q50 81 62 67 Z" fill="#B05F55" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
          '<path d="M44 74.5 Q50 79.5 56 74.5 Z" fill="#E8975A"/>'
  },
  sad: {
    brow: '<path d="M30 47 Q37 39 46 38" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          '<path d="M54 38 Q63 39 70 47" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
    eye:  '<path d="M33 51 Q39 56 45 51" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
          '<path d="M55 51 Q61 56 67 51" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    mouth:'<path d="M39 76 Q50 64 61 76" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
  },
  angry: {
    brow: '<path d="M30 39 Q38 41 46 47" stroke="' + INK + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
          '<path d="M54 47 Q62 41 70 39" stroke="' + INK + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
    eye:  '<circle cx="39" cy="53" r="4" fill="' + INK + '"/>' +
          '<circle cx="61" cy="53" r="4" fill="' + INK + '"/>',
    mouth:'<path d="M39 69 Q44.5 75 50 69 Q55.5 75 61 69" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  scared: {
    brow: '<path d="M30 37 Q38 31 46 34" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          '<path d="M54 34 Q62 31 70 37" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
    eye:  '<circle cx="39" cy="53" r="7" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="39" cy="54.5" r="2.8" fill="' + INK + '"/>' +
          '<circle cx="61" cy="53" r="7" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="61" cy="54.5" r="2.8" fill="' + INK + '"/>',
    mouth:'<path d="M43 71 Q46.5 76 50 71 Q53.5 76 57 71" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  },
  surprised: {
    brow: '<path d="M31 33 Q38 31 46 33" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          '<path d="M54 33 Q62 31 69 33" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
    eye:  '<circle cx="39" cy="52" r="8" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="39" cy="52" r="3.4" fill="' + INK + '"/>' +
          '<circle cx="61" cy="52" r="8" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="61" cy="52" r="3.4" fill="' + INK + '"/>',
    mouth:'<ellipse cx="50" cy="72" rx="7.5" ry="9" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>'
  },
  worried: {
    brow: '<path d="M30 42.5 Q37.5 38 46 39" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          '<path d="M54 39 Q62.5 38 70 42.5" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
    eye:  '<circle cx="39" cy="52.5" r="5.5" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="39" cy="53.5" r="2.3" fill="' + INK + '"/>' +
          '<circle cx="61" cy="52.5" r="5.5" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="61" cy="53.5" r="2.3" fill="' + INK + '"/>',
    mouth:'<path d="M42 70 Q46 73.5 50 70 Q54 73.5 58 70" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  }
};
/* 表情脸整体 SVG（size 方形；mood=emo；verify 结构签名 = brow|eye|mouth 三段拼接串） */
function faceSvg(emo, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="92" height="92"';
  const f = FACE_ELS[emo];
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    FACE_BASE.ears + FACE_BASE.head + FACE_BASE.blush + f.brow + f.eye + FACE_BASE.nose + f.mouth + '</svg>';
}
const faceSig = emo => FACE_ELS[emo].brow + '|' + FACE_ELS[emo].eye + '|' + FACE_ELS[emo].mouth;

/* ================= 情境场景图 SVG（viewBox 0 0 360 150；题面卡）
   铁律：题面图不画小兔子正脸（不剧透表情）——情境事件物件 + 小兔子背影（背影无五官）。
   bg 三态恒同（day 草地日 / room 室内 / night 傍晚夜）；主体 ELEMENTS 每情境一组简笔。 */
const BG = {
  day: '<rect width="360" height="150" fill="#FDF1DA"/>' +
       '<circle cx="36" cy="32" r="16" fill="#F5C445" stroke="' + INK + '" stroke-width="2.5"/>' +
       '<g fill="#FFF" stroke="' + INK + '" stroke-width="2.2"><ellipse cx="310" cy="30" rx="20" ry="12"/><ellipse cx="327" cy="25" rx="14" ry="9"/></g>' +
       '<path d="M0 128 q70 -10 150 -4 q100 8 210 -3 V150 H0 Z" fill="#DCE9C6"/>',
  room: '<rect width="360" height="150" fill="#FBEDD9"/>' +
        '<path d="M0 112 H360 V150 H0 Z" fill="#E8D5B5"/>' +
        '<path d="M0 112 H360" stroke="' + INK + '" stroke-width="2"/>' +
        '<rect x="284" y="26" width="52" height="46" rx="6" fill="#DCEBEE" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M310 26 V72 M284 49 H336" stroke="' + INK + '" stroke-width="2"/>',
  night: '<rect width="360" height="150" fill="#EFE7F5"/>' +
         '<path d="M312 34 a17 17 0 1 0 12 29 a14 14 0 1 1 -12 -29 Z" fill="#F5DE8D" stroke="' + INK + '" stroke-width="2.2"/>' +
         '<g fill="#F5DE8D"><circle cx="40" cy="28" r="2.6"/><circle cx="66" cy="46" r="2"/><circle cx="104" cy="24" r="2.2"/><circle cx="88" cy="60" r="1.8"/></g>' +
         '<path d="M0 128 q70 -10 150 -4 q100 8 210 -3 V150 H0 Z" fill="#CBBFD6"/>'
};
/* 背影小兔子（无五官——不剧透表情；x/y 左上角基准，scale 缩放） */
function bunnyBack(x, y, s) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
    '<path d="M-13 -14 C-17 -34 -9 -40 -5 -38 C-1 -36 -1 -24 -3 -14 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M13 -14 C17 -34 9 -40 5 -38 C1 -36 1 -24 3 -14 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="0" cy="2" rx="21" ry="23" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="0" cy="10" r="6.5" fill="#FFF" stroke="' + INK + '" stroke-width="2.5"/>' +
    '</g>';
}
/* 情境主体元素（每情境一组；配角爪/手不画脸） */
const ELEMENTS = {
  h_gift: '<rect x="140" y="52" width="80" height="62" rx="6" fill="#E8483C" stroke="' + INK + '" stroke-width="3"/>' +
          '<rect x="173" y="52" width="14" height="62" fill="#F5C445" stroke="' + INK + '" stroke-width="2.5"/>' +
          '<path d="M180 52 C160 30 148 44 166 52 M180 52 C200 30 212 44 194 52" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
          '<g stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"><path d="M74 46 l4 -10 M82 48 l2 -11 M258 42 l-3 -10 M250 45 l-5 -9"/></g>' + bunnyBack(60, 74, 0.62),
  h_icecream: '<path d="M186 92 L160 44 L212 44 Z" fill="#E8B46B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
          '<circle cx="168" cy="38" r="13" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.8"/>' +
          '<circle cx="204" cy="38" r="13" fill="#FFF" stroke="' + INK + '" stroke-width="2.8"/>' +
          '<circle cx="186" cy="24" r="13" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8"/>' +
          '<circle cx="186" cy="6.5" r="3" fill="#B05F55" stroke="' + INK + '" stroke-width="1.6"/>' +
          '<g stroke="#E8975A" stroke-width="2.6" stroke-linecap="round"><path d="M146 30 q6 -8 0 -14 M226 30 q6 -8 0 -14"/></g>' + bunnyBack(84, 62, 0.6),
  h_sticker: '<circle cx="150" cy="62" r="16" fill="#F5C445" stroke="' + INK + '" stroke-width="2.8"/>' +
          '<path d="M150 52 l3.2 6.6 7.2 1 -5.2 5 1.2 7.2 -6.4 -3.4 -6.4 3.4 1.2 -7.2 -5.2 -5 7.2 -1 Z" fill="#FFF" stroke="' + INK + '" stroke-width="1.6"/>' +
          '<circle cx="212" cy="60" r="14" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.8"/>' +
          '<path d="M205 60 a7 7 0 0 1 14 0 a5 5 0 0 1 -7 4 a5 5 0 0 1 -7 -4 Z" fill="#FFF" stroke="' + INK + '" stroke-width="1.6"/>' +
          '<path d="M176 96 q22 14 44 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
          '<g stroke="' + INK + '" stroke-width="2.4" fill="#FFF9EE"><path d="M258 56 c14 -4 16 10 4 12 c8 8 -6 16 -12 8 c-6 10 -20 2 -12 -8 c-12 -2 -10 -16 4 -12 c2 -12 16 -12 16 0 Z"/></g>' + bunnyBack(64, 68, 0.6),
  h_park: '<path d="M150 14 V96" stroke="#8A7B6C" stroke-width="6" stroke-linecap="round"/>' +
          '<path d="M150 34 H210" stroke="#8A7B6C" stroke-width="4.5" stroke-linecap="round"/>' +
          '<path d="M186 34 V58" stroke="' + INK + '" stroke-width="3"/>' +
          '<rect x="158" y="56" width="58" height="16" rx="8" fill="#7FBFCA" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M132 20 q-10 8 0 16 M282 30 q10 8 0 16" stroke="#8FBF7F" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
          '<g stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M116 58 q10 -6 20 0 M116 68 q10 -6 20 0"/></g>' + bunnyBack(70, 66, 0.58),
  s_icecream: '<path d="M212 96 L192 62 L232 62 Z" fill="#E8B46B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
          '<path d="M148 104 q14 -12 34 -6 q20 -8 26 6 q10 10 -8 12 q-24 8 -40 0 q-20 0 -12 -12 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.6"/>' +
          '<circle cx="162" cy="98" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.4"/>' +
          '<circle cx="178" cy="106" r="5" fill="#FFF" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<g fill="' + INK + '"><circle cx="230" cy="58" r="2.2"/><circle cx="242" cy="52" r="2"/><circle cx="238" cy="68" r="1.8"/></g>' + bunnyBack(72, 66, 0.6),
  s_balloon: '<circle cx="212" cy="40" r="22" fill="#E8483C" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M212 62 q-4 8 2 12" stroke="' + INK + '" stroke-width="2.2" fill="none"/>' +
          '<path d="M214 76 q6 10 -2 18" stroke="' + INK + '" stroke-width="2" fill="none" stroke-dasharray="4 5"/>' +
          '<g stroke="#8A7B6C" stroke-width="2.4" stroke-linecap="round"><path d="M196 34 h-16 M192 28 l-6 6 M192 40 l-6 -6"/></g>' +
          '<path d="M258 34 q-12 10 0 18 q-8 6 2 12" stroke="#8A7B6C" stroke-width="2.4" fill="none" stroke-linecap="round"/>' + bunnyBack(96, 78, 0.56),
  s_teddy: '<circle cx="182" cy="66" r="26" fill="#C9A06C" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="164" cy="42" r="8" fill="#C9A06C" stroke="' + INK + '" stroke-width="2.6"/>' +
          '<circle cx="200" cy="42" r="8" fill="#C9A06C" stroke="' + INK + '" stroke-width="2.6"/>' +
          '<ellipse cx="182" cy="76" rx="13" ry="10" fill="#E8D5B5" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="174" cy="62" r="2.6" fill="' + INK + '"/><circle cx="190" cy="62" r="2.6" fill="' + INK + '"/>' +
          '<path d="M182 66 l-3.4 3.4 l3.4 3.4 l3.4 -3.4 Z" fill="' + INK + '"/>' +
          '<path d="M204 52 l14 8 M206 60 l14 4" stroke="#E8483C" stroke-width="2.4" stroke-linecap="round"/>' +
          '<path d="M158 86 q-6 10 4 16" stroke="' + INK + '" stroke-width="2" fill="none" stroke-dasharray="3 4"/>' +
          '<g fill="' + INK + '"><circle cx="216" cy="46" r="1.8"/><circle cx="224" cy="52" r="1.6"/></g>' + bunnyBack(84, 84, 0.5),
  s_flower: '<path d="M186 108 V70" stroke="#8FBF7F" stroke-width="4.5"/>' +
          '<path d="M186 88 q-16 -4 -20 -16 q14 -2 20 8" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<g transform="translate(186 56)"><circle cx="0" cy="-14" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="-13" cy="-4" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="13" cy="-4" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="-8" cy="9" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="8" cy="9" r="7" fill="#F2A0B5" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<circle cx="0" cy="0" r="5.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/></g>' +
          '<path d="M186 44 q-6 -4 -2 -10" stroke="#8A7B6C" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
          '<g stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M146 60 q8 -5 16 0 M146 70 q8 -5 16 0"/></g>' + bunnyBack(66, 74, 0.58),
  a_grab: '<path d="M188 104 q-16 -22 4 -34 q18 -10 26 6" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M212 72 q14 -4 22 4 l-4 6 q-10 -6 -18 -2 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8"/>' +
          '<g fill="' + INK + '"><circle cx="222" cy="78" r="1.8"/><circle cx="228" cy="82" r="1.8"/><circle cx="232" cy="86" r="1.8"/></g>' +
          '<g stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"><path d="M252 66 l16 -10 M254 76 l18 -6"/></g>' +
          '<g stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="6 6"><path d="M150 44 q-4 -12 6 -18 M166 40 q0 -12 12 -14"/></g>' + bunnyBack(84, 80, 0.55),
  a_blocks: '<g stroke="' + INK + '" stroke-width="2.6">' +
          '<rect x="150" y="88" width="26" height="18" rx="3" fill="#E8483C"/>' +
          '<rect x="180" y="92" width="24" height="14" rx="3" fill="#4E8FD0" transform="rotate(14 192 99)"/>' +
          '<rect x="164" y="70" width="22" height="16" rx="3" fill="#8FBF7F" transform="rotate(-24 175 78)"/>' +
          '<rect x="196" y="76" width="20" height="15" rx="3" fill="#F5C445" transform="rotate(38 206 84)"/></g>' +
          '<g stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="5 6"><path d="M232 96 q10 -2 14 -12 M238 104 q12 0 18 -10"/></g>' +
          '<path d="M264 74 c12 -4 14 9 4 11 c6 7 -5 14 -10 7 c-5 9 -17 2 -10 -7 c-10 -2 -8 -15 4 -11 c2 -10 12 -10 12 0 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' + bunnyBack(70, 76, 0.56),
  a_queue: '<g stroke="' + INK + '" stroke-width="2.4"><circle cx="120" cy="60" r="10" fill="#FFF9EE"/><path d="M120 70 v18 M120 76 l-10 8 M120 76 l10 8" stroke-linecap="round"/></g>' +
          '<g stroke="' + INK + '" stroke-width="2.8"><ellipse cx="176" cy="52" rx="12" ry="14" fill="#E8975A"/>' +
          '<path d="M165 44 l-4 -18 l9 6 Z M187 44 l4 -18 l-9 6 Z" fill="#E8975A" stroke-linejoin="round"/>' +
          '<path d="M176 66 v24 M176 74 l-9 10 M176 74 l9 10 M176 90 l-7 12 M176 90 l7 12" stroke-linecap="round" fill="none"/></g>' +
          '<g stroke="#E8483C" stroke-width="3" stroke-linecap="round"><path d="M198 58 q10 -4 16 2 M196 68 q10 -2 16 6"/></g>' +
          '<g stroke="' + INK + '" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 5"><path d="M110 96 H265"/></g>' + bunnyBack(74, 60, 0.56),
  a_laugh: '<g stroke="' + INK + '" stroke-width="2.8"><ellipse cx="196" cy="56" rx="13" ry="15" fill="#E8975A"/>' +
          '<path d="M185 47 l-5 -19 l10 7 Z M207 47 l5 -19 l-10 7 Z" fill="#E8975A" stroke-linejoin="round"/>' +
          '<path d="M190 55 q3 -3 6 0 M202 55 q3 -3 6 0" stroke-linecap="round" fill="none"/>' +
          '<path d="M192 64 q8 5 16 -2" stroke-linecap="round" fill="none"/></g>' +
          '<g stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"><path d="M218 48 l18 -8 M220 58 l20 -2 M219 68 l18 6"/></g>' +
          '<g stroke="#E8483C" stroke-width="2.4" stroke-linecap="round"><path d="M232 34 q8 -6 14 0 M244 36 q6 -6 12 -2"/></g>' + bunnyBack(86, 74, 0.6),
  c_dark: '<rect x="96" y="14" width="168" height="102" rx="8" fill="#3A3450" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M96 65 H264 M180 14 V116" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="140" cy="42" r="7" fill="#6B6288" opacity=".8"/>' +
          '<path d="M226 44 q6 -6 0 -12 M226 44 q-6 -6 0 -12" stroke="#8A7B9E" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
          '<path d="M148 88 q4 -5 8 0 q4 -5 8 0" stroke="#6B6288" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
          '<path d="M310 96 q10 4 6 14 M322 92 q10 6 4 16" stroke="#8A7B6C" stroke-width="2.4" stroke-linecap="round"/>' + bunnyBack(88, 84, 0.52),
  c_thunder: '<path d="M96 52 a26 20 0 0 1 48 -12 a22 16 0 0 1 44 6 a18 14 0 0 1 -8 26 H108 a18 14 0 0 1 -12 -20 Z" fill="#8A7B9E" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M168 74 L150 108 H166 L154 138 L192 98 H172 L184 74 Z" fill="#F5DE8D" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
          '<g fill="' + INK + '"><circle cx="128" cy="64" r="2.2"/><circle cx="146" cy="58" r="2"/><circle cx="212" cy="60" r="2.2"/></g>' +
          '<g stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"><path d="M120 128 q10 -4 18 0 M124 136 q8 -3 14 0"/></g>' + bunnyBack(84, 96, 0.5),
  c_bdog: '<ellipse cx="196" cy="92" rx="46" ry="26" fill="#C9A06C" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="238" cy="66" r="20" fill="#C9A06C" stroke="' + INK + '" stroke-width="3"/>' +
          '<ellipse cx="252" cy="72" rx="12" ry="9" fill="#E8D5B5" stroke="' + INK + '" stroke-width="2.4"/>' +
          '<circle cx="230" cy="60" r="3" fill="' + INK + '"/><circle cx="246" cy="58" r="3" fill="' + INK + '"/>' +
          '<path d="M228 74 q5 5 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
          '<ellipse cx="238" cy="46" rx="7" ry="11" fill="#C9A06C" stroke="' + INK + '" stroke-width="2.4"/>' +
          '<path d="M254 96 q6 14 -4 20 M240 100 q2 12 -6 16" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
          '<g stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"><path d="M268 48 q8 -4 12 2 M270 58 q8 -2 12 4"/></g>' + bunnyBack(74, 78, 0.52),
  c_shot: '<g stroke="' + INK + '" stroke-width="3"><rect x="146" y="52" width="64" height="22" rx="4" fill="#DCEBEE"/>' +
          '<path d="M210 63 h10 l22 -14 v50 l-22 -14 Z" fill="#FFF9EE" stroke-linejoin="round"/>' +
          '<path d="M242 56 l30 -8 v46 l-30 -8" fill="#DCEBEE" stroke-linejoin="round"/></g>' +
          '<rect x="146" y="52" width="12" height="22" fill="#8A9BAE"/>' +
          '<g stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"><path d="M278 50 l10 -4 M280 60 l12 -3 M280 70 l12 3 M278 80 l10 4"/></g>' +
          '<g stroke="#E8483C" stroke-width="2.4" stroke-linecap="round"><path d="M296 42 q6 -6 12 0 M304 52 q6 -6 10 2"/></g>' + bunnyBack(80, 80, 0.54),
  w_test: '<rect x="142" y="40" width="76" height="54" rx="4" fill="#FFF" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M142 54 H218" stroke="' + INK + '" stroke-width="2"/>' +
          '<g stroke="#8A9BAE" stroke-width="2.4" stroke-linecap="round"><path d="M152 64 h24 M152 72 h36 M152 80 h18"/></g>' +
          '<circle cx="200" cy="72" r="12" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
          '<path d="M200 64 v6 l4 3" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
          '<g stroke="#8A7B6C" stroke-width="2.4" stroke-linecap="round"><path d="M236 44 q4 -8 -2 -12 M244 46 q4 -8 -2 -12"/></g>' +
          '<path d="M258 34 q10 8 0 16" stroke="#E8975A" stroke-width="2.6" fill="none" stroke-linecap="round"/>' + bunnyBack(76, 74, 0.56),
  w_mom: '<rect x="252" y="30" width="16" height="16" rx="2" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
          '<circle cx="260" cy="26" r="9" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
          '<path d="M260 17 v-6 M269 26 h6" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
          '<path d="M260 46 v22" stroke="' + INK + '" stroke-width="2.4"/>' +
          '<rect x="118" y="52" width="56" height="70" rx="4" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
          '<circle cx="166" cy="90" r="3" fill="' + INK + '"/>' +
          '<g stroke="#8A7B6C" stroke-width="2.2" stroke-linecap="round"><path d="M150 70 q6 -6 0 -12 M162 70 q6 -6 0 -12"/></g>' + bunnyBack(196, 84, 0.5),
  w_rain: '<path d="M96 60 a26 20 0 0 1 48 -12 a22 16 0 0 1 44 4 a20 15 0 0 1 -10 30 H110 a20 15 0 0 1 -14 -22 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="3"/>' +
          '<g stroke="#7FBFCA" stroke-width="3" stroke-linecap="round"><path d="M150 94 l-6 12 M168 96 l-6 12 M186 94 l-6 12 M204 96 l-6 12"/></g>' +
          '<path d="M244 46 q-8 10 0 18 q-8 8 2 14" stroke="#8A9BAE" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
          '<path d="M266 40 q-10 12 0 22" stroke="#8A9BAE" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
          '<g stroke="#8A7B6C" stroke-width="2.2" stroke-linecap="round"><path d="M232 68 q6 -6 0 -12"/></g>' + bunnyBack(88, 92, 0.5),
  w_path: '<path d="M28 128 h304" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M180 128 V96 M180 96 H96 M96 96 V64 M180 96 H264 M264 96 V64" stroke="#B98A5C" stroke-width="8" fill="none" stroke-linecap="round"/>' +
          '<g fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6"><circle cx="64" cy="52" r="16"/><circle cx="120" cy="34" r="14"/><circle cx="248" cy="40" r="15"/><circle cx="308" cy="58" r="17"/></g>' +
          '<path d="M96 64 q-8 -10 0 -18 M264 64 q8 -10 0 -18" stroke="#8FBF7F" stroke-width="3" fill="none" stroke-linecap="round"/>' +
          '<g stroke="#8A7B6C" stroke-width="2.4" stroke-linecap="round"><path d="M204 116 q6 -6 0 -12 M216 118 q6 -6 0 -12"/></g>' + bunnyBack(236, 96, 0.46),
  su_party: '<rect x="118" y="34" width="124" height="94" rx="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M118 62 H242 M118 96 H242" stroke="' + INK + '" stroke-width="2"/>' +
          '<g stroke="#E8483C" stroke-width="2.6" stroke-linecap="round"><path d="M132 26 q6 8 0 16 q8 4 10 12 M228 26 q-6 8 0 16 q-8 4 -10 12"/></g>' +
          '<g fill="#F5C445" stroke="' + INK + '" stroke-width="2"><circle cx="152" cy="52" r="5"/><circle cx="208" cy="50" r="5"/><circle cx="180" cy="80" r="5"/></g>' +
          '<g stroke="' + INK + '" stroke-width="2.4"><circle cx="160" cy="118" r="9" fill="#FFF9EE"/><path d="M160 127 v8" stroke-linecap="round"/>' +
          '<circle cx="200" cy="116" r="9" fill="#E8975A"/><path d="M200 125 v10" stroke-linecap="round"/></g>' +
          '<g stroke="#8FBF7F" stroke-width="2.6" stroke-linecap="round"><path d="M262 44 l6 -10 M274 48 l8 -8"/></g>' + bunnyBack(88, 86, 0.5),
  su_snow: '<rect x="118" y="20" width="124" height="92" rx="8" fill="#DCEBEE" stroke="' + INK + '" stroke-width="3"/>' +
          '<path d="M118 66 H242 M180 20 V112" stroke="' + INK + '" stroke-width="2"/>' +
          '<g fill="#FFF" stroke="' + INK + '" stroke-width="1.6"><circle cx="140" cy="36" r="4"/><circle cx="212" cy="42" r="4.5"/><circle cx="166" cy="86" r="4"/><circle cx="224" cy="90" r="3.5"/><circle cx="146" cy="60" r="3"/><circle cx="204" cy="68" r="3.5"/></g>' +
          '<path d="M284 48 a10 10 0 1 0 7 17 a8 8 0 1 1 -7 -17 Z" fill="#FFF" stroke="' + INK + '" stroke-width="2.2"/>' +
          '<g stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"><path d="M270 88 h14 M277 81 v14"/></g>' + bunnyBack(92, 78, 0.5),
  su_egg: '<ellipse cx="188" cy="96" rx="34" ry="40" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3.5"/>' +
          '<path d="M162 76 q26 -14 52 0" stroke="#F2DDC0" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          '<g stroke="' + INK + '" stroke-width="2.4"><ellipse cx="132" cy="78" rx="20" ry="16" fill="#FFF" />' +
          '<path d="M124 66 q-2 -8 4 -10 M140 66 q2 -8 -4 -10" fill="none" stroke-linecap="round"/>' +
          '<circle cx="126" cy="76" r="2" fill="' + INK + '" stroke="none"/><circle cx="138" cy="76" r="2" fill="' + INK + '" stroke="none"/>' +
          '<path d="M150 84 l-2 12 M158 82 l4 12" stroke-linecap="round"/></g>' +
          '<g stroke="#E8975A" stroke-width="2.4" stroke-linecap="round"><path d="M232 56 q6 -6 0 -12 M244 60 q6 -6 0 -12"/></g>' + bunnyBack(84, 96, 0.46),
  su_balls: '<path d="M150 96 h72 l-8 28 h-56 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
          '<circle cx="186" cy="88" r="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
          '<g stroke="' + INK + '" stroke-width="2.6"><circle cx="146" cy="46" r="15" fill="#E8483C"/>' +
          '<circle cx="186" cy="30" r="16" fill="#F5C445"/><circle cx="226" cy="48" r="14" fill="#7FBFCA"/></g>' +
          '<path d="M160 60 q10 12 22 18 M206 62 q-10 12 -18 24" stroke="' + INK + '" stroke-width="2" fill="none" stroke-dasharray="3 4"/>' +
          '<g stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M254 40 q8 -8 0 -16 M266 48 q8 -8 0 -16"/></g>' + bunnyBack(88, 92, 0.48)
};
/* 情境场景图整体 SVG（题面卡；主角=背影小兔子恒在图内——「小兔子怎么了」有主语） */
function sceneSvg(scene) {
  return '<svg class="sky" viewBox="0 0 360 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    BG[scene.bg] + (ELEMENTS[scene.id] || '') + '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 微笑小脸（主题） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="22" cy="24" r="11.5" fill="#FDF1DA" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="18" cy="22" r="1.7" fill="' + INK + '"/><circle cx="26" cy="22" r="1.7" fill="' + INK + '"/>' +
    '<path d="M18 27 q4 3.4 8 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M15.5 14.5 q-3 -6 1.5 -8 M28.5 14.5 q3 -6 -1.5 -8" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
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
