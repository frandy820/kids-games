/* ================= memduel 记忆双背 游戏数据（章配置 / 题型规格 / 语音文案 / SVG 图标）
   r17 难度改造（2026-09-17，AUDIT-78 黄款第 7 位，SPEC-BATCH20 §1-r17-memduel）：
   五型（同引擎：展示→遮盖→拼答；dx 插延迟干扰窗）：
     df 数字正背 6-7 位（ch1）/ dr 数字倒背 5-6 位（ch2）/
     lf 字母正背 5-6 位 + cf 颜色正背 5-6 位（ch3 同章混出）/
     dx 数字 5-6 位 + 延迟干扰 3.8s（点小兔子）+ 正倒随机指令（ch4，遮盖后才公布方向，
       语音 md_dir_* + 文字 TIP_ANSWER 双通道——孩子在展示期无法预倒序化，检索期现算）
   记忆真值（§0.44 延续）：同题串内值互异（重复=倒背多解=非法题）；倒背 answer=seq
   精确逆序（verify 侧独立倒填循环对账）；phase='show'|'gap'|'recall'——展示期与延迟期
   输入锁定（tapNum 拒绝返 false 不吞题）；engCover 唯一入口（show→delay 型进 'gap'，
   其余直达 'recall'）；engGapDone 唯一 gap→recall 入口。
   干扰卡：len=7 → 2 张 / 其余 3 张（数字池 1-9：len7 后仅余 2——verify refChapOk 同口径）。
   语音与 voice/clips manifest games:['memduel'] 12 条严格一致（core 3+md_ 9）；
   数词/字母/颜色名走 TTS 兜底（md_n_ 不建，§2 延续）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族 DESIGN-SPEC）

/* ---------- r17 时长模型（门禁硬断言；认知步主体非演出窗——crd r12/timecalc r16 范式）
   每题 dur = showMs（展示窗=920+len*680）+（dx）GAP_MS 3800 + DECIDE_MS[题型] + ADV_MS 2100。
   estMs = s.length*345+600（b25 定版：SAPI ~345ms/字+600，全字符口径标点计入）
   ——四方字面同步（源常量+此处注释+verify 独立副本断言+build.py 字面 assert+_selftest
   Python 第三源），改必四方同改。
   DECIDE_MS（7-8 岁认知决策推算，检索拼位=串长次点选已折入）：
     df 11000：6-7 位顺背检索：逐位回忆+池扫描定位 ~1.1s/位 ×7 + 起步 2.5s + 校对 1s
     dr 13000：5-6 位倒背：逆向变换 ~1.6s/位 ×6 + 起步 2.5s + 校对 1s
     lf 12000：字母串（字母名→字形映射生疏）~1.5s/位 ×6 + 起步 2.5s + 校对 1s
     cf 10000：颜色串（识别快）~1.1s/位 ×6 + 起步 2.5s + 校对 1s
     dx 16000：延迟衰减恢复 3s + 方向指令处理 1.6s + 倒序 Worst 分支 1.5s/位 ×6 + 校对 1.5s
   指令句窗验算（窗 ≥ estMs(句)——verify ⑬ 独立复算，数字=345n+600 形）：
     gap 提示 md_gap'先点一下小兔子' 7 字=2415+600=3015；vw=400+3015+300=3715 ≤ GAP 3800 ✓
     dx 方向指令 md_dir_*'顺着背'/'倒着背' 3 字=1035+600=1635；vw=400+1635+300=2335
       ≤ DECIDE dx 16000 ✓（指令在检索窗内起播，不打断作答结构）
   40 静态关 modeled 最低=138760@flat24（verify ⑬ 与 _selftest Python 第三源双钉；
   LEVEL_MIN_MS=40000 门禁）。 */
const ENTER_MS = 400;                        // 指令起播前入场余量（与家族 T 同口径）
const TAIL_MS = 300;                         // 指令句播完收听余量（家族 T）
const ADV_MS = 2100;                         // 答对推进演出窗（uiTapNum 答对 wait(2100*SPEED) 等 md_right）
const estMs = s => s.length * 345 + 600;     // b25 定版（四方字面同步见上）
const DECIDE_MS = {                          // 7-8 岁检索决策档（按题型分档）
  df: 11000, dr: 13000, lf: 12000, cf: 10000, dx: 16000
};
const GAP_MS = 3800;                         // dx 延迟干扰窗（SPEC 3-4s 定版 3.8s）
const SHOW_BASE = 920, SHOW_PER = 680;       // 展示窗 = 920 + len*680（与 UI runShow 同源）
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r15 门禁延续）
const quizDurMs = q => q.showMs + (q.delay ? GAP_MS : 0) + DECIDE_MS[q.kind] + ADV_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 章配置（章号 1 基；hint=章末预告下一章文案，GEN 文案不带"明天："前缀） ---------- */
const CHAPTERS = {
  1: { name: '顺背长数字', hint: '数字要倒着背啦' },
  2: { name: '倒背数字',   hint: '字母和颜色也来啦' },
  3: { name: '字母颜色串', hint: '先做件小事再背，更难啦' },
  4: { name: '延迟大挑战', hint: '新一轮记忆双背' }
};
const GEN_HINTS = ['长数字再来一次', '倒背再来一次', '字母颜色再来一次', '延迟挑战再来一次'];
const CH_LEN = 8;          // 8 题（串）= 1 关（r17：5→8）
const LEVELS_PER_CH = 10;  // 每章 10 关（键基：keyOf 分母=LEVELS_PER_CH 非 CH_LEN）
const STATIC_LEVELS = 40;  // 静态 40 关 = 4 章；flat≥40 生成关（dch seeded 随机 1-4，§1-r17）

/* ---------- 题型规格（§1-r17 五型定稿）：kind + mat + mode + 位数闭区间 + delay
   静态关按章规格；生成关（flat≥STATIC_LEVELS）dch seeded 随机 1-4 后同规格（SPEC 显式
   声明：不另设生成关位数随机通道——dch 随机已供全域取材） ---------- */
const CH_SPEC = {
  1: { kinds: ['df'],        mat: 'dgt', mode: 'fwd', lo: 6, hi: 7 },
  2: { kinds: ['dr'],        mat: 'dgt', mode: 'rev', lo: 5, hi: 6 },
  3: { kinds: ['lf', 'cf'],  mat: 'mix', mode: 'fwd', lo: 5, hi: 6 },   // mat 按题随机 let/col
  4: { kinds: ['dx'],        mat: 'dgt', mode: 'mix', lo: 5, hi: 6 }    // mode 按题随机 fwd/rev + delay
};
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];               // 数字池（抽互异子集；1-9，0 不入池）
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];   // 12 字母（避 I/O 形近）
const COLORS = ['红', '橙', '黄', '绿', '蓝', '紫', '粉', '棕', '灰', '黑'];     // 10 色（深浅全可见于暖米底）
const COLOR_HEX = {
  '红': '#E15B5B', '橙': '#F0924A', '黄': '#F2C94C', '绿': '#8FBF7F', '蓝': '#6B8CB8',
  '紫': '#A07BC0', '粉': '#F2B8C6', '棕': '#B08968', '灰': '#9AA0A6', '黑': '#4A4440'
};
const MAT_WORD = { dgt: '数字', let: '字母', col: '颜色' };   // 文案素材词

/* ---------- 语音文案（与 manifest games:['memduel'] 条目严格一致，禁改 key/text）
   r17 新增 4 键：md_dir_fwd/md_dir_rev（dx 检索期方向指令，语音+文字双通道）/
   md_hint_rev（倒背救援/开场提示——'从第一位开始想'对倒背误导，按 mode 分流）/
   md_gap（延迟干扰窗提示）。 ---------- */
const VOICE = {
  watch:    { key: 'md_tut_watch', text: '看！记住小数字' },
  turn:     { key: 'md_tut_turn',  text: '你来背一背' },
  hint:     { key: 'md_hint',      text: '从第一位开始想' },    /* 顺背章共用 */
  hintRev:  { key: 'md_hint_rev',  text: '从最后一位开始想' },  /* 倒背（dr 章/dx-rev 题） */
  dirFwd:   { key: 'md_dir_fwd',   text: '顺着背' },            /* dx 检索期方向指令 */
  dirRev:   { key: 'md_dir_rev',   text: '倒着背' },
  gap:      { key: 'md_gap',       text: '先点一下小兔子' },    /* dx 延迟干扰窗提示 */
  right:    { key: 'md_right',     text: '全背对啦，记性真好' }, /* 整串拼对确认句 */
  wrong:    { key: 'md_wrong',     text: '再想一想刚才的数' }   /* sayW 纠错轻语音（flat≥3 10s 节流） */
};

/* ---------- 提示条文案（§0.18：展示文案与 §1-r17 明文同源；作答期按方向切换）
   展示期=素材词+方向预告（dx 方向遮盖后才公布，展示期不预告——检索期现算是 r17 负荷点） ---------- */
const TIP_SHOW = {
  dgt: '看数字，记住它', let: '看字母，记住它', col: '看颜色，记住它'
};
const TIP_DIR = { fwd: '，等下顺着背', rev: '，等下倒着背' };
const TIP_GAP = '先点一下小兔子';                 /* 与 md_gap 文案同源 */
const TIP_ANSWER = {
  fwd: '照刚才的顺序，拼出来',
  rev: '从最后一张开始，倒着拼'
};

/* ---------- 图标（内嵌 SVG，描线风，无 <text> 防 SVG 尺寸漂移） ---------- */
const ICONS = {
  /* logo：两张叠放小卡+星点（记忆卡牌点题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="7" y="9" width="18" height="26" rx="4" fill="#FFF9EE" stroke="#FFF" stroke-width="2.5" transform="rotate(-8 16 22)"/>' +
    '<rect x="19" y="9" width="18" height="26" rx="4" fill="#FDEBD2" stroke="' + INK + '" stroke-width="2.5" transform="rotate(7 28 22)"/>' +
    '<circle cx="28" cy="18" r="3.2" fill="#E8975A"/><circle cx="25" cy="26" r="2.4" fill="#8FBF7F"/><circle cx="32" cy="27" r="2" fill="#6B8CB8"/></svg>',
  /* 提示条：小眼睛（记住它） */
  lens: '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 32 Q32 12 56 32 Q32 52 8 32 Z" fill="#FDEBD2" stroke="' + INK + '" stroke-width="4" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="32" r="8.5" fill="#6B8CB8"/><circle cx="29" cy="29" r="2.6" fill="#FFF"/>' +
    '<circle cx="53" cy="14" r="3" fill="#F2C03D"/><circle cx="10" cy="12" r="2.2" fill="#F2C03D"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  /* 整串拼对打勾角标（卡排转绿视觉） */
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="28" fill="#8FBF7F" stroke="' + INK + '" stroke-width="4"/>' +
    '<path d="M19 33 l9 9 l17 -19" stroke="#FFF9EE" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
