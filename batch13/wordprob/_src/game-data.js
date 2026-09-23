/* ================= wordprob 应用题剧场 游戏数据（r13 难度改造版 2026-09-15）
   玩法（SPEC-BATCH13 §2 r13）：场景插画（SVG 简笔，数字与确切数量不入画）
   + 题面文字大字逐词（3-4 句情景叙述）+ 语音读题（queue 拼接：模板段 wor_tpl2_*
   + 数词 clip wor_n_1..35），点选 4 选 1 大数字卡（不灰化：答错晃动可重点）。
   r13 升级（AUDIT-78 定案）：数值域升 100 以内两步应用题（先算中间量再算所问）；
   ch3/4 混入"多余条件"干扰题型（题面含与所问无关的数字——信息筛选素养）；
   干扰卡改"算得对但答非所问"（干扰值=题面某可算量的真实值）+ 1 近误值；
   题面加长 3-4 句（情景叙述铺垫句）。
   章进阶：ch1 两步加减 / ch2 乘加乘减（表内乘法域）/ ch3 多余条件 / ch4 综合（含除法两步）；
   首题热身=上一章主型（ch1 首题=单步 100 以内进位加桥接）；每章模板 ≥2 轮换（相邻互异）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- r13 时长模型（门禁硬断言；认知步主体非演出窗——crd r12 范式）
   每题 1 个决策步：dur = max(voiceWin, DECIDE_MS[kind]) + ADV_MS（答对推进窗）；
   voiceWin = ENTER 400 + estMs(题面全文) + 300（读题句窗，家族 T 动态）。
   estMs = s.length*345+600（b25 定版：SAPI ~345ms/字+600，全字符口径标点计入）
   ——四方字面同步（源常量+此处注释+verify ⑭ 断言+build.py 字面 assert），改必四处同改。
   DECIDE_MS（7-8 岁认知决策推算，两步应用题心算负荷高于单步——参考 crd 9-11s 档上调）：
     one   15000：读题理解 4s + 两位数进位加/退位减心算 8s + 选项比对 3s（单步桥接热身）
     two   18000：3-4 句读题理解 5s + 中间量计算（两位数加减/表内乘）5s + 第二步计算 4s
                  + 选项比对与"答非所问"干扰甄别 4s（干扰=可算量，须读问句定向）
     extra 19500：同 two + 信息筛选排除多余条件 1.5s（7-8 岁课标信息筛选素养）。
   验算（voiceWin 恒 ≤ DECIDE——全模板全域枚举 12272 组合最坏句长（r13 审查 m1 勘正），verify ⑭ 独立复算）：
     one 最坏 34 字=12330+700=13030<15000 / two 最坏 45 字=16125+700=16825<18000
     / extra 最坏 51 字=18195+700=18895<19500——语音窗从不撑时长，认知步主体。
   40 关 modeled：dch1 关=one+4×two=15880+75520=91400（最低）/ dch2 关 5×18880=94400
   / dch3 关 two+4×20380=100400 / dch4 关 extra+2×two+2×extra=98900——全部 ≥40000（r13 门禁）。 */
const ENTER_MS = 400;                        // 新题面出场动画窗（与读题并行起播）
const TAIL_MS = 300;                         // 读题句播完收听余量（家族 T）
const ADV_MS = 880;                          // 答对推进演出窗（uiPick 答对 wait(880*SPEED)）
const estMs = s => s.length * 345 + 600;     // b25 定版（四方字面同步见上）
const DECIDE_MS = { one: 15000, two: 18000, extra: 19500 };   // 7-8 岁两步应用题决策档
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r13 门禁）
const WRONG_CHAIN_WIN = 4200;                // wor_wrong 10 字 estMs 4050+150：错答 clip 播放期救援让路（契约 I）

/* ---------- 章配置（章号 1 基；hint 按"预告下一章"语义写——完成第 N 章显示 CHAPTERS[N].hint
   预告第 N+1 章内容；GEN 文案不带"明天："前缀，core 模板自带） ---------- */
const CHAPTERS = {
  1: { name: '两步加减剧场', hint: '乘一乘再加一减的故事来啦' },    // 完成第 1 章预告第 2 章
  2: { name: '乘加乘减剧场', hint: '藏了多余数字的故事要来啦' },    // 预告第 3 章
  3: { name: '多余条件剧场', hint: '样样都要想一想的综合故事来啦' }, // 预告第 4 章
  4: { name: '综合剧场', hint: '新一轮两步应用题小剧场' }           // 完成第 4 章预告生成关
};
const GEN_HINTS = ['两步加减的应用题', '乘加乘减的应用题', '带多余数字的应用题', '综合两步应用题'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/manifest.json 严格一致 §0.18/§0.24）
   仅前 3 关播 sayP；救援/开场/读题/教学走 sayR；错答轻语音 sayW(wor_wrong) ---------- */
const VOICE = {
  watch: { key: 'wor_tut_watch', text: '看！听一听算一算' },
  turn:  { key: 'wor_tut_turn',  text: '你来算一算' },
  hint:  { key: 'wor_hint',      text: '听一听题目再算' },
  wrong: { key: 'wor_wrong',     text: '再想一想，听一听题目' }
};

/* ---------- 中文数词 1-35（题面 queue 拼接用，clip wor_n_1..35 全在场=本游戏自建副本 §0.25；
   r13：操作数域升两位数口语，21-35 新增合成，1-20 既有 clip 一字不改） ---------- */
const NUM_CN = { 1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八',
  9: '九', 10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五',
  16: '十六', 17: '十七', 18: '十八', 19: '十九', 20: '二十', 21: '二十一', 22: '二十二',
  23: '二十三', 24: '二十四', 25: '二十五', 26: '二十六', 27: '二十七', 28: '二十八',
  29: '二十九', 30: '三十', 31: '三十一', 32: '三十二', 33: '三十三', 34: '三十四', 35: '三十五' };
const numCn = n => NUM_CN[n] || String(n);

/* ---------- 模板段语音表（wor_tpl2_* 共 38 条 = 9 模板 × 3-5 段；每行一条字面量）
   供 voice/gen_clips.py 正则提取二次合成（零手抄；段文案改动必须同步 _src/TEMPLATE_VOICE.md）。
   题面读音 = seg1 + 数词1 + seg2 + 数词2 + seg3 +（数词3 + seg4）+（数词4 + seg5）；
   槽序=各模板自然语序（见 TPLS.dom 注释）。 ---------- */
const TPL_VOICE = {
  /* bus1 单步桥接（one）：车上有 a 人上来了 b 人，现在多少人（a+b，100 以内进位加） */
  wor_tpl2_bus1_1:    '早上，公交车到站啦。车上有',
  wor_tpl2_bus1_2:    '人，上来了',
  wor_tpl2_bus1_3:    '人。现在车上有多少人呀',
  /* bus2 两步加减（as：先算 a+b 再减 c） */
  wor_tpl2_bus2_1:    '下午，公交车到站啦。车上有',
  wor_tpl2_bus2_2:    '人，上来了',
  wor_tpl2_bus2_3:    '人，又下去了',
  wor_tpl2_bus2_4:    '人。现在车上有多少人呀',
  /* cookie2 两步加减（sa：先算 a-b 再加 c） */
  wor_tpl2_cookie2_1: '小兔子在吃饼干。盘子里有',
  wor_tpl2_cookie2_2: '块，它吃掉了',
  wor_tpl2_cookie2_3: '块，妈妈又放上去',
  wor_tpl2_cookie2_4: '块。现在盘子里有多少块呀',
  /* plate2 乘加（ma：先算 a×b 再加 c） */
  wor_tpl2_plate2_1:  '去野餐啦。桌上摆了',
  wor_tpl2_plate2_2:  '盘草莓，每盘都有',
  wor_tpl2_plate2_3:  '个，又拿来',
  wor_tpl2_plate2_4:  '个。一共有多少个草莓呀',
  /* row2 乘减（ms：先算 a×b 再减 c） */
  wor_tpl2_row2_1:    '小花园真漂亮。种了',
  wor_tpl2_row2_2:    '行向日葵，每行都有',
  wor_tpl2_row2_3:    '棵，搬走了',
  wor_tpl2_row2_4:    '棵到花盆里。还剩多少棵呀',
  /* busex 多余条件（sad：先算 a-b 再加 c；d=座位数与所问无关） */
  wor_tpl2_busex_1:   '傍晚，公交车到站。车上有',
  wor_tpl2_busex_2:   '人，下去了',
  wor_tpl2_busex_3:   '人，又上来了',
  wor_tpl2_busex_4:   '人。车上有',
  wor_tpl2_busex_5:   '个座位。现在车上有多少人呀',
  /* cookieex 多余条件（sad：先算 a-b 再加 c；d=年龄与所问无关） */
  wor_tpl2_cookieex_1: '小兔子在吃饼干，盘子里有',
  wor_tpl2_cookieex_2: '块，它吃掉了',
  wor_tpl2_cookieex_3: '块，妈妈又放上去',
  wor_tpl2_cookieex_4: '块。它今年',
  wor_tpl2_cookieex_5: '岁。现在盘子里有多少块呀',
  /* rowex 多余条件乘减（mad：先算 a×b 再减 c；d=蝴蝶只数与所问无关） */
  wor_tpl2_rowex_1:   '小花园里种了',
  wor_tpl2_rowex_2:   '行向日葵，每行都有',
  wor_tpl2_rowex_3:   '棵，搬走了',
  wor_tpl2_rowex_4:   '棵到花盆里。花园里还飞来',
  wor_tpl2_rowex_5:   '只蝴蝶。还剩多少棵向日葵呀',
  /* candy2 除法两步（sd：先算 a-c 再平均分 b 人，每人 (a-c)/b；槽序 [a,c,b]） */
  wor_tpl2_candy2_1:  '联欢会分糖啦。袋子里有',
  wor_tpl2_candy2_2:  '颗糖，送给老师',
  wor_tpl2_candy2_3:  '颗，剩下的平均分给',
  wor_tpl2_candy2_4:  '个小朋友。每人分到几颗呀'
};

/* ---------- 应用题模板池（r13 表驱动封闭集；每章 ≥2 模板相邻轮换）
   kind：'one' 单步桥接 / 'two' 两步 / 'extra' 多余条件型；
   form（两步结构，槽位=dom 语序）：add=a+b / as=a+b-c / sa=a-b+c / ma=a×b+c /
     ms=a×b-c / sd=(n0-n1)/n2 整除 / sad=sa+d 多余 / mad=ms+d 多余；
   dom：各槽 [lo,hi] 闭区间（candy2=[a,c,b]，a 由生成侧整除构造落在 [15,33]）；
   clamp 由 form 在引擎侧施加（as: c≤a+b-8 / sa 系: b≤a-8 / ms 系: c≤a×b-4）。 */
const TPLS = {
  bus1:    { kind: 'one',   form: 'add', scene: 'bus_add',    segs: ['wor_tpl2_bus1_1',    'wor_tpl2_bus1_2',    'wor_tpl2_bus1_3'],    dom: [[15, 24], [13, 20]] },
  bus2:    { kind: 'two',   form: 'as',  scene: 'bus_add',    segs: ['wor_tpl2_bus2_1',    'wor_tpl2_bus2_2',    'wor_tpl2_bus2_3',    'wor_tpl2_bus2_4'],    dom: [[16, 25], [9, 16], [6, 15]] },
  cookie2: { kind: 'two',   form: 'sa',  scene: 'cookie_sub', segs: ['wor_tpl2_cookie2_1', 'wor_tpl2_cookie2_2', 'wor_tpl2_cookie2_3', 'wor_tpl2_cookie2_4'], dom: [[17, 28], [6, 16], [9, 18]] },
  plate2:  { kind: 'two',   form: 'ma',  scene: 'plate_mul',  segs: ['wor_tpl2_plate2_1',  'wor_tpl2_plate2_2',  'wor_tpl2_plate2_3',  'wor_tpl2_plate2_4'],  dom: [[3, 5], [6, 9], [10, 24]] },
  row2:    { kind: 'two',   form: 'ms',  scene: 'row_mul',    segs: ['wor_tpl2_row2_1',    'wor_tpl2_row2_2',    'wor_tpl2_row2_3',    'wor_tpl2_row2_4'],    dom: [[4, 5], [7, 9], [10, 26]] },
  busex:   { kind: 'extra', form: 'sad', scene: 'bus_sub',    segs: ['wor_tpl2_busex_1',   'wor_tpl2_busex_2',   'wor_tpl2_busex_3',   'wor_tpl2_busex_4',   'wor_tpl2_busex_5'],   dom: [[18, 26], [5, 12], [7, 14], [20, 30]] },
  cookieex:{ kind: 'extra', form: 'sad', scene: 'cookie_sub', segs: ['wor_tpl2_cookieex_1','wor_tpl2_cookieex_2','wor_tpl2_cookieex_3','wor_tpl2_cookieex_4','wor_tpl2_cookieex_5'], dom: [[18, 28], [6, 15], [8, 16], [6, 9]] },
  rowex:   { kind: 'extra', form: 'mad', scene: 'row_mul',    segs: ['wor_tpl2_rowex_1',   'wor_tpl2_rowex_2',   'wor_tpl2_rowex_3',   'wor_tpl2_rowex_4',   'wor_tpl2_rowex_5'],   dom: [[4, 5], [7, 9], [10, 24], [4, 9]] },
  candy2:  { kind: 'two',   form: 'sd',  scene: 'candy_div',  segs: ['wor_tpl2_candy2_1',  'wor_tpl2_candy2_2',  'wor_tpl2_candy2_3',  'wor_tpl2_candy2_4'],  dom: [[15, 33], [5, 9], [2, 3]] }
};
/* 章模板池（难度章号 1-4）；WARM_POOL[dch]=dch 章首题热身池（上一章主型；ch1=单步桥接） */
const CH_POOLS = { 1: ['bus2', 'cookie2'], 2: ['plate2', 'row2'], 3: ['busex', 'cookieex'], 4: ['rowex', 'candy2'] };
const WARM_POOL = { 1: ['bus1'], 2: ['bus2', 'cookie2'], 3: ['plate2', 'row2'], 4: ['busex', 'cookieex'] };

/* ---------- 题面全文（读题 TTS 兜底/aria/时长模型共用）：段与数词按槽序拼接 ---------- */
function speechOf(q) {
  const t = TPLS[q.tpl], ns = q.nums;
  let s = '';
  for (let i = 0; i < t.segs.length; i++) {
    s += TPL_VOICE[t.segs[i]];
    if (i < ns.length) s += numCn(ns[i]);
  }
  return s;
}
/* r13 时长模型（每题 1 决策步；末题无尾扣——答对即 winFlow） */
const voiceWinMs = q => ENTER_MS + estMs(speechOf(q)) + TAIL_MS;
const quizDurMs = q => Math.max(voiceWinMs(q), DECIDE_MS[q.kind]) + ADV_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 场景插画（每模板一幅 SVG 简笔 ≥3 元素暖色；实体单例呈现——一辆公交/一棵树/一块饼干，
   数字与确切数量不入画（§2：防数元素代替运算，孩子必须听/读题）；viewBox 0 0 320 150） ---------- */
function sunSvg(x, y, r) {
  return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#F2C94C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.55) + '" fill="#F6DA7E" opacity=".8"/>';
}
function cloudSvg(x, y, s) {
  return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')">' +
    '<ellipse cx="0" cy="0" rx="26" ry="13" fill="#FFF" stroke="#D8C9B4" stroke-width="2"/>' +
    '<ellipse cx="18" cy="4" rx="18" ry="10" fill="#FFF" stroke="#D8C9B4" stroke-width="2"/>' +
    '<ellipse cx="-18" cy="4" rx="16" ry="9" fill="#FFF" stroke="#D8C9B4" stroke-width="2"/></g>';
}
function grassSvg() {
  return '<path d="M14 132 q4 -12 8 0 M28 132 q4 -10 8 0 M296 132 q4 -12 8 0" stroke="#9CC98D" stroke-width="3" fill="none" stroke-linecap="round"/>';
}
const SCENES = {
  /* 公交：公交 + 站牌 + 太阳 + 云 + 路面（车内无人影，窗=装饰） */
  bus_add: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="0" y="126" width="320" height="24" fill="#EFE3CD"/>' +
    '<path d="M20 138 H300" stroke="#D8C9B4" stroke-width="3" stroke-dasharray="16 12" stroke-linecap="round"/>' +
    sunSvg(292, 30, 17) + cloudSvg(56, 26, 0.9) +
    '<rect x="188" y="52" width="9" height="74" fill="#A9825C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="160" y="30" width="66" height="26" rx="7" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="193" cy="43" r="4.5" fill="#FFF6E8" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="60" y="46" width="118" height="58" rx="12" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="70" y="54" width="26" height="20" rx="4" fill="#C4D2DD" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="102" y="54" width="26" height="20" rx="4" fill="#C4D2DD" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="134" y="54" width="32" height="24" rx="4" fill="#F6DA7E" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="86" cy="108" r="12" fill="#5B5148" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="152" cy="108" r="12" fill="#5B5148" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="86" cy="108" r="4.5" fill="#E5D5BC"/><circle cx="152" cy="108" r="4.5" fill="#E5D5BC"/>' +
    '<path d="M64 46 Q119 34 174 46" stroke="#D96C4F" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/></svg>',
  /* 果园：苹果树 + 篮子 + 太阳 + 云（树冠整片不逐果可数） */
  fruit_add: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="0" y="126" width="320" height="24" fill="#DCEDCB"/>' +
    sunSvg(290, 28, 16) + cloudSvg(60, 24, 0.8) + grassSvg() +
    '<path d="M150 126 L150 84 M150 96 Q136 90 130 78 M150 92 Q164 86 170 76" stroke="#A9825C" stroke-width="9" fill="none" stroke-linecap="round"/>' +
    '<circle cx="150" cy="56" r="34" fill="#9CC98D" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="126" cy="70" r="20" fill="#BCDDB0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="176" cy="68" r="19" fill="#BCDDB0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M228 126 Q228 100 248 100 Q268 100 268 126 Z" fill="#E2A25E" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M232 100 Q248 84 264 100" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M236 112 h32" stroke="#C99B62" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="118" cy="48" r="6" fill="#E86A5E" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="158" cy="40" r="6" fill="#E86A5E" stroke="' + INK + '" stroke-width="1.8"/></svg>',
  /* 吃饼干：小兔 + 盘子 + 一块饼干（单例）+ 桌面 + 碎屑 */
  cookie_sub: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="0" y="112" width="320" height="38" fill="#E2A25C"/>' +
    '<rect x="0" y="112" width="320" height="7" fill="#C99B62"/>' +
    '<ellipse cx="160" cy="108" rx="58" ry="14" fill="#FFF6E8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="160" cy="105" rx="40" ry="8" fill="#F2E4CB"/>' +
    '<circle cx="160" cy="86" r="20" fill="#E2A25E" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="152" cy="83" r="2" fill="' + INK + '"/><circle cx="167" cy="83" r="2" fill="' + INK + '"/>' +
    '<path d="M154 92 q6 5 12 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="147" cy="78" r="2.6" fill="#8A5A32"/><circle cx="173" cy="78" r="2.6" fill="#8A5A32"/>' +
    '<circle cx="160" cy="75" r="2.2" fill="#8A5A32"/>' +
    '<path d="M112 100 l5 5 M117 98 l4 4 M206 100 l-5 5 M201 98 l-4 4" stroke="#C99B62" stroke-width="2.4" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="120" rx="18" ry="9" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M52 114 q3 -12 8 0 M60 112 q3 -12 8 0" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  /* 公交（门开）+ 下客箭头 + 站牌 + 云 */
  bus_sub: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="0" y="126" width="320" height="24" fill="#EFE3CD"/>' +
    '<path d="M20 138 H300" stroke="#D8C9B4" stroke-width="3" stroke-dasharray="16 12" stroke-linecap="round"/>' +
    cloudSvg(52, 26, 0.9) + sunSvg(286, 30, 15) +
    '<rect x="176" y="52" width="9" height="74" fill="#A9825C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="148" y="30" width="66" height="26" rx="7" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="181" cy="43" r="4.5" fill="#FFF6E8" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="46" y="46" width="118" height="58" rx="12" fill="#F0A868" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="56" y="54" width="26" height="20" rx="4" fill="#C4D2DD" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="88" y="54" width="26" height="20" rx="4" fill="#C4D2DD" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="120" y="54" width="34" height="34" rx="4" fill="#F6DA7E" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="72" cy="108" r="12" fill="#5B5148" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="138" cy="108" r="12" fill="#5B5148" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="72" cy="108" r="4.5" fill="#E5D5BC"/><circle cx="138" cy="108" r="4.5" fill="#E5D5BC"/>' +
    '<path d="M137 44 v14 M132 53 l5 6 5 -6" stroke="#D96C4F" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 野餐：餐布 + 一个盘子 + 一颗草莓（单例）+ 柠檬水 + 小草 */
  plate_mul: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="0" y="112" width="320" height="38" fill="#DCEDCB"/>' +
    '<rect x="52" y="96" width="216" height="34" rx="8" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-2 160 113)"/>' +
    '<path d="M64 104 H256 M68 124 H252" stroke="#E8975A" stroke-width="4" opacity=".5" stroke-linecap="round"/>' +
    '<ellipse cx="150" cy="112" rx="52" ry="13" fill="#FFF6E8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="150" cy="109" rx="36" ry="8" fill="#F2E4CB"/>' +
    '<path d="M150 106 Q144 88 150 80 Q156 88 150 106" fill="#E86A5E" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M144 80 l6 -7 6 7 Z" fill="#9CC98D" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="147" cy="92" r="1.4" fill="#FFF6E8"/><circle cx="153" cy="98" r="1.4" fill="#FFF6E8"/>' +
    '<rect x="216" y="82" width="24" height="30" rx="5" fill="#F6DA7E" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M216 88 h24" stroke="#E2A25E" stroke-width="3"/><path d="M228 82 v-8 a8 8 0 0 1 12 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    grassSvg() + cloudSvg(264, 30, 0.7) + sunSvg(46, 30, 14) + '</svg>',
  /* 花园：一棵向日葵（单例）+ 栅栏 + 太阳 + 云 */
  row_mul: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="0" y="118" width="320" height="32" fill="#DCEDCB"/>' +
    sunSvg(288, 30, 16) + cloudSvg(70, 26, 0.85) +
    '<path d="M180 120 V60" stroke="#9CC98D" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M180 88 Q160 84 152 70 M180 96 Q202 92 210 78" stroke="#9CC98D" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="180" cy="46" r="15" fill="#F6DA7E" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="180" cy="46" r="8" fill="#A9825C" stroke="' + INK + '" stroke-width="2"/>' +
    '<g stroke="#F2C94C" stroke-width="2.6" stroke-linecap="round">' +
    '<path d="M180 22 v-7 M180 70 v7 M156 46 h-7 M204 46 h7 M163 29 l-5 -5 M197 63 l5 5 M197 29 l5 -5 M163 63 l-5 5"/></g>' +
    '<g stroke="#C99B62" stroke-width="6" stroke-linecap="round">' +
    '<path d="M84 118 V86 M110 118 V86 M136 118 V86"/><path d="M76 96 H144" stroke-width="5"/></g>' +
    '<path d="M240 120 q4 -12 8 0 M252 120 q4 -10 8 0 M40 122 q4 -12 8 0" stroke="#9CC98D" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  /* 分糖果：糖袋 + 一颗糖（单例）+ 小伙伴脸 + 星点 */
  candy_div: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="0" y="126" width="320" height="24" fill="#F6EEDD"/>' +
    cloudSvg(70, 26, 0.8) + sunSvg(288, 30, 15) +
    '<path d="M84 126 L94 60 Q142 48 190 60 L200 126 Z" fill="#F6C893" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M96 62 Q142 74 188 62" stroke="#C99B62" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M120 52 l-12 -10 8 2 -2 -10 10 8 M164 52 l12 -10 -8 2 2 -10 -10 8" stroke="#D96C4F" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<ellipse cx="142" cy="98" rx="15" ry="12" fill="#F0A868" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M127 98 l-8 -6 6 1 -1 -6 7 5 M157 98 l8 -6 -6 1 1 -6 -7 5" fill="#F6C893" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<circle cx="252" cy="92" r="22" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="238" cy="78" rx="4" ry="9" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2" transform="rotate(-12 238 78)"/>' +
    '<ellipse cx="266" cy="78" rx="4" ry="9" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2" transform="rotate(12 266 78)"/>' +
    '<circle cx="245" cy="90" r="2.2" fill="' + INK + '"/><circle cx="259" cy="90" r="2.2" fill="' + INK + '"/>' +
    '<path d="M248 99 q4 3 8 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M56 60 l3 6 6 1 -4.5 4.5 1 6.5 -5.5 -3 -5.5 3 1 -6.5 L47 67 l6 -1 Z" fill="#F2C94C" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  /* 分橘子：篮子（橘子堆为整片 mound 不逐个可数）+ 一颗橘子（单例）+ 小兔子 */
  orange_div: '<svg viewBox="0 0 320 150" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect x="0" y="126" width="320" height="24" fill="#DCEDCB"/>' +
    sunSvg(46, 30, 14) + cloudSvg(258, 28, 0.75) +
    '<path d="M84 126 Q86 92 116 92 Q146 92 148 126 Z" fill="#E2A25E" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M90 94 Q116 76 142 94" stroke="' + INK + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M92 108 Q116 96 140 108 Q116 120 92 108" fill="#F0A868" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M96 116 h40" stroke="#C99B62" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="116" cy="106" r="9" fill="#F0A868" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M113 98 q3 -6 6 0" stroke="#9CC98D" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="212" cy="96" r="22" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="199" cy="78" rx="4.4" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-10 199 78)"/>' +
    '<ellipse cx="225" cy="78" rx="4.4" ry="10" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.2" transform="rotate(12 225 78)"/>' +
    '<circle cx="205" cy="94" r="2.2" fill="' + INK + '"/><circle cx="219" cy="94" r="2.2" fill="' + INK + '"/>' +
    '<ellipse cx="212" cy="101" rx="2.6" ry="2" fill="#D98A8A"/>' +
    '<path d="M206 104 q6 4 12 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="248" cy="112" rx="16" ry="8" fill="#F2E4CB" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="284" cy="104" r="8.5" fill="#F0A868" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M281 97 q3 -6 6 0" stroke="#9CC98D" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    grassSvg() + '</svg>'
};

/* ---------- 图标（全部内嵌 SVG，描边 2.5px 暖棕） ---------- */
const ICONS = {
  /* logo：故事书 + 对话气泡（剧场讲故事） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M6 10 Q16 6 22 10 Q28 6 38 10 V34 Q28 30 22 34 Q16 30 6 34 Z" fill="#F6DA7E" stroke="#FFF" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M22 10 V34" stroke="#FFF" stroke-width="2.4"/>' +
    '<path d="M12 17 h6 M12 23 h6 M26 17 h6 M26 23 h6" stroke="#E8975A" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="34" cy="9" r="6.5" fill="#8FBF7F" stroke="#FFF" stroke-width="2"/>' +
    '<path d="M31 8 q1.5 3 6 1" stroke="#FFF" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
