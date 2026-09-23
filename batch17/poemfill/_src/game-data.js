/* ================= poemfill 古诗连句 游戏数据（r13 难度改造 2026-09-15 / 诗库 30 首 / 章题池 / 时长模型 / 配色 / 图标）
   【r13 改造定稿（AUDIT-78 poemfill 行：挖 1-2 字+全诗朗读+干扰 2-3=重度脚手架再认 → 升整句回忆）】
   ① 题型全面升整句回忆（Bloom 再认→回忆）：
      ch1 排下句·五言（给上句→3 候选句卡选下句；F×3+R×2，R=给下句选上句逆向）
      ch2 排下句·七言（同型七言、4 候选卡=干扰 3）
      ch3 排诗句·句序重组（给首句→4 卡排 2-4 句序，3 槽；F×3+R+O）
      ch4 飞花令主题关（指定字 飞/春/花 轮换→跨诗选含字句，4 卡）
   ② 整首朗读退出题面（开场链/重听/救援均不再播——原整诗朗读=听写级提示撤除）；
      首字提示=「提示」按钮亮下句首字（pf_first 通道，不预置题面）；
      「重听」语义=读题面上句（TTS 豁免——可见文本朗读不泄答案）；
      整首朗读 pf_poem_* 唯一保留用途=关末奖励（ch1-3 过关后播，ch4 无单一诗不播）。
   ③ 诗库 10→30 首一二年级课标（既有 10 首文本一字不改+补 author；新 20 首出处逐首登记
      SPEC-BATCH17 §1-r13；pf_poem_* 键 30 条全预合成）。
   ④ r13 时长模型（crd r12 范式）：每步 dur = max(voiceWin, DECIDE_MS[type])，
      每题 + ADV（right 主体 2000+estMs(答案句)+400）；voiceWin 首步=ENTER 400+estMs(题面句)+300、
      后续步=STAGE 400——语音窗恒 < DECIDE（最长句 7 字 3015+700=3715 < 9000，语音从不撑时长）。
      estMs = s => s.length * 345 + 600（b25 定版：SAPI ~345ms/字+600，全字符口径——四方同步：
      源常量+本注释+verify estMsV 断言+build.py 字面 assert）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 演出时序常量（r13；estMs 全字符口径同 b25/b39 家族） ---------- */
const ENTER_MS = 400;                          // 新题诗卡出场窗（与题面句 say 并行）
const STAGE_MS = 400;                          // 题内步推进窗（O 型多槽换卡不重出场）
const RIGHT_WAIT = 2000;                       // 选对后 right clip 主体窗（pf_right ≈2.4s，b17 P2-2 同款）
const LINE_TAIL = 400;                         // 答案句 TTS 收尾余量
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）

/* ---------- r13 时长模型（门禁硬断言；认知步主体非演出窗——AUDIT-78 根因对策）
   每步 dur = max(voiceWin, DECIDE_MS[type])；每题 dur = Σ步 + ADV(一次)。
   DECIDE_MS（7-8 岁认知决策推算；r12 crd 5-6 岁 like=10000 参照——本批年龄升但任务从
   单字再认（≈3000-4000ms）升为整句回忆（Bloom 回忆层级≈2.5 倍再认负荷），量级持平定版）：
   fnext 9000（给上句忆下句：线索句读入 2000+下联整句记忆检索（韵律/语义双线索）3000
              +3-4 候选整句扫读比对（每句 5-7 字≈800-1000）+确认 1500）
   fprev 10000（给下句忆上句：逆向联想要素训练频度低，+1000）
   order 11000/步（句序重组：全诗结构工作记忆——保持已排前缀+候选序贯评估）
   feihua 12000（跨诗检索：无单诗上下文锚，需在多首已学诗中扫描含字句+候选逐句查字）
   ADV = RIGHT_WAIT 2000 + estMs(答案句) + LINE_TAIL 400（选对演出窗一次/题：right clip
   主体+答案句完整朗读巩固——b17 试玩 P2-2 同款路径整首改答案句）。
   验算（库内句长 5/7 两档；咏鹅首行'鹅，鹅，鹅'含顿逗恰 5 字符）：
   ch1 关（五言全 5 字）：F=9000+4725=13725×3 + R=10000+4725=14725×2 = 70625
   ch2 关（七言全 7 字）：F=9000+5415=14415×3 + R=10000+5415=15415×2 = 74075
   ch3 关：F 13725×3 + R 14725 + O(3×11000+4725=37725) = 93625
   ch4 关：≥5×(12000+4725)=83625
   ——40 关 modeled 最低=70625（ch1 关）≥ LEVEL_MIN_MS 40000（verify ⑭ 独立副本复算+精确断言）。 */
const DECIDE_MS = { fnext: 9000, fprev: 10000, order: 11000, feihua: 12000 };
const KIND_OF = { F: 'fnext', R: 'fprev', O: 'order', FF: 'feihua' };   /* 题型→认知步型 */
const LEVEL_MIN_MS = 40000;                    // 单关 modeled 下限硬断言（r13 门禁，7-8 岁口径）
/* 题面朗读句（voiceWin 首步预算源）与选对演出句（ADV 预算源）——按题型分源取句 */
const cueSayOf = q => q.type === 'FF'
  ? '找一找有「' + q.targetChar + '」字的诗句'      /* 飞花令题面句 11 字 → estMs 4395 < 12000 */
  : q.lines[q.cueIdx];
const winLineOf = q => q.ans[0];
const advMs = q => RIGHT_WAIT + estMs(winLineOf(q)) + LINE_TAIL;
const stepVoiceMs = (q, k) => k === 0 ? (ENTER_MS + estMs(cueSayOf(q)) + 300) : STAGE_MS;
const quizDurMs = q => q.ans.reduce(
  (s, _, k) => s + Math.max(stepVoiceMs(q, k), DECIDE_MS[KIND_OF[q.type]]), 0) + advMs(q);
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 章配置（r13 四型；章号 1 基；hint=章末预告**下一章**文案（家族 F 契约——
   CHAPTERS[i].hint=第 i+1 章预告，非本章内容。r13 试玩 P2-3：原表四行均写本章自己的
   hint，nextHint 取 CHAPTERS[ci+1] 恒取到刚完成章自己=预告错位一格，2026-09-15 对齐
   wordprob/grid 契约形态重写；CHAPTERS[4].hint=泛生成关预告（不指型——生成关四型随机，
   指型文案由生成支实算 GEN_HINTS[genLevel(f+1).dch-1] 承担）） ---------- */
const CHAPTERS = {
  1: { name: '连诗句',   hint: '七言诗也来连一连' },       // 完成第 1 章预告第 2 章
  2: { name: '七言连句', hint: '把诗句排排队' },           // 预告第 3 章
  3: { name: '排诗句',   hint: '找一找藏着字的诗句' },     // 预告第 4 章
  4: { name: '飞花令',   hint: '新的诗句挑战要来啦' }      // 完成第 4 章预告生成关（泛文案不指型）
};
const GEN_HINTS = ['新的诗句连一连', '七言诗句连一连', '把诗句排一排', '飞花令找诗句'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 voice/clips/manifest.json
   games:['poemfill'] 严格一致 §0.18；r13 六键文案一字不改沿用。
   整首朗读 pf_poem_<pid> 30 条预合成（r13 扩 20），r13 唯一用途=关末奖励（winFlow 播、
   题面/重听/救援均不再用——去整首朗读脚手架）；播 clip 不带 text（缺 clip 禁 TTS 兜底铁律） ---------- */
const VOICE = {
  watch: { key: 'pf_tut_watch', text: '看！读一读古诗' },
  turn:  { key: 'pf_tut_turn',  text: '你来填一填' },
  hint:  { key: 'pf_hint',      text: '听一听想一想' },
  right: { key: 'pf_right',     text: '填对啦，你真棒' },
  wrong: { key: 'pf_wrong',     text: '再读一读这句诗' },  /* 答错 clip 化（§0.24） */
  first: { key: 'pf_first',     text: '第一个字亮啦' }     /* 首字提示句（r13：亮出下句首字） */
};

/* ---------- 诗库 30 首一二年级课标定稿（r13：既有 10 首文本一字不改，仅补 author；
   新 20 首逐字校对，出处逐首登记 SPEC-BATCH17 §1-r13 诗目表；pid 与 clip key
   pf_poem_<pid> 对应禁改。lines[4] 按句存（咏鹅首行"鹅，鹅，鹅"含顿逗，展示层原样；
   古朗月行/草取教材节选四句） ---------- */
const POEMS = {
  /* ---- 既有 10 首（b17 定稿，零改动） ---- */
  yie:   { title: '咏鹅',       author: '骆宾王', lines: ['鹅，鹅，鹅', '曲项向天歌', '白毛浮绿水', '红掌拨清波'] },
  jys:   { title: '静夜思',     author: '李白',   lines: ['床前明月光', '疑是地上霜', '举头望明月', '低头思故乡'] },
  cx:    { title: '春晓',       author: '孟浩然', lines: ['春眠不觉晓', '处处闻啼鸟', '夜来风雨声', '花落知多少'] },
  mn:    { title: '悯农',       author: '李绅',   lines: ['锄禾日当午', '汗滴禾下土', '谁知盘中餐', '粒粒皆辛苦'] },
  dgjl:  { title: '登鹳雀楼',   author: '王之涣', lines: ['白日依山尽', '黄河入海流', '欲穷千里目', '更上一层楼'] },
  cs:    { title: '池上',       author: '白居易', lines: ['小娃撑小艇', '偷采白莲回', '不解藏踪迹', '浮萍一道开'] },
  jx:    { title: '江雪',       author: '柳宗元', lines: ['千山鸟飞绝', '万径人踪灭', '孤舟蓑笠翁', '独钓寒江雪'] },
  wlsbp: { title: '望庐山瀑布', author: '李白',   lines: ['日照香炉生紫烟', '遥看瀑布挂前川', '飞流直下三千尺', '疑是银河落九天'] },
  zwl:   { title: '赠汪伦',     author: '李白',   lines: ['李白乘舟将欲行', '忽闻岸上踏歌声', '桃花潭水深千尺', '不及汪伦送我情'] },
  jgsh:  { title: '绝句',       author: '杜甫',   lines: ['两个黄鹂鸣翠柳', '一行白鹭上青天', '窗含西岭千秋雪', '门泊东吴万里船'] },
  /* ---- r13 新 20 首（部编/人教一二年级课标；'绝句·迟日'=部编三下五言、二年级可读补充） ---- */
  hua:   { title: '画',           author: '佚名',   lines: ['远看山有色', '近听水无声', '春去花还在', '人来鸟不惊'] },
  glyx:  { title: '古朗月行',     author: '李白',   lines: ['小时不识月', '呼作白玉盘', '又疑瑶台镜', '飞在青云端'] },
  feng:  { title: '风',           author: '李峤',   lines: ['解落三秋叶', '能开二月花', '过江千尺浪', '入竹万竿斜'] },
  xyze:  { title: '寻隐者不遇',   author: '贾岛',   lines: ['松下问童子', '言师采药去', '只在此山中', '云深不知处'] },
  xich:  { title: '小池',         author: '杨万里', lines: ['泉眼无声惜细流', '树阴照水爱晴柔', '小荷才露尖尖角', '早有蜻蜓立上头'] },
  huaj:  { title: '画鸡',         author: '唐寅',   lines: ['头上红冠不用裁', '满身雪白走将来', '平生不敢轻言语', '一叫千门万户开'] },
  yess:  { title: '夜宿山寺',     author: '李白',   lines: ['危楼高百尺', '手可摘星辰', '不敢高声语', '恐惊天上人'] },
  meih:  { title: '梅花',         author: '王安石', lines: ['墙角数枝梅', '凌寒独自开', '遥知不是雪', '为有暗香来'] },
  xec:   { title: '小儿垂钓',     author: '胡令能', lines: ['蓬头稚子学垂纶', '侧坐莓苔草映身', '路人借问遥招手', '怕得鱼惊不应人'] },
  cunj:  { title: '村居',         author: '高鼎',   lines: ['草长莺飞二月天', '拂堤杨柳醉春烟', '儿童散学归来早', '忙趁东风放纸鸢'] },
  yl:    { title: '咏柳',         author: '贺知章', lines: ['碧玉妆成一树高', '万条垂下绿丝绦', '不知细叶谁裁出', '二月春风似剪刀'] },
  cao:   { title: '草',           author: '白居易', lines: ['离离原上草', '一岁一枯荣', '野火烧不尽', '春风吹又生'] },
  xjc:   { title: '晓出净慈寺送林子方', author: '杨万里', lines: ['毕竟西湖六月中', '风光不与四时同', '接天莲叶无穷碧', '映日荷花别样红'] },
  mnq:   { title: '悯农·其一',    author: '李绅',   lines: ['春种一粒粟', '秋收万颗子', '四海无闲田', '农夫犹饿死'] },
  zys:   { title: '舟夜书所见',   author: '查慎行', lines: ['月黑见渔灯', '孤光一点萤', '微微风簇浪', '散作满河星'] },
  sjian: { title: '所见',         author: '袁枚',   lines: ['牧童骑黄牛', '歌声振林樾', '意欲捕鸣蝉', '忽然闭口立'] },
  zlj:   { title: '赠刘景文',     author: '苏轼',   lines: ['荷尽已无擎雨盖', '菊残犹有傲霜枝', '一年好景君须记', '最是橙黄橘绿时'] },
  shx:   { title: '山行',         author: '杜牧',   lines: ['远上寒山石径斜', '白云生处有人家', '停车坐爱枫林晚', '霜叶红于二月花'] },
  sxg:   { title: '宿新市徐公店', author: '杨万里', lines: ['篱落疏疏一径深', '树头新绿未成阴', '儿童急走追黄蝶', '飞入菜花无处寻'] },
  jj2:   { title: '绝句·迟日',    author: '杜甫',   lines: ['迟日江山丽', '春风花草香', '泥融飞燕子', '沙暖睡鸳鸯'] }
};

/* ---------- T46 阶段2 诗句行/飞花令 clip 键映射（2026-09-19） ----------
   pf_l_<pid>_<行号> 120 行全在册（manifest 文案与 POEMS 逐字对账）；库内 120 句全互异
   （verify libOk 断言）→ 文本→键一一对应，lineKeyOf 兼覆盖 FF 跨诗答案句
   （FF 题生成器把 pid 改写为答案句所属诗，行号经文本映射取）；cueKeyOf=FF 题面问句
   pf_ff_q_<字>（飞/春/花 3 键）+F/R/O 题面行。返回 null 时 play(null, 原文) 自然落
   TTS 兜底（防御死分支——封闭域内恒命中）。 */
const LINE_KEYS = {};
Object.keys(POEMS).forEach(function (pid) {
  POEMS[pid].lines.forEach(function (ln, li) { LINE_KEYS[ln] = 'pf_l_' + pid + '_' + li; });
});
const lineKeyOf = function (ln) { return LINE_KEYS[ln] || null; };
const cueKeyOf = function (q) {
  return q.type === 'FF' ? 'pf_ff_q_' + q.targetChar : lineKeyOf(q.lines[q.cueIdx]);
};

/* ---------- 关→诗映射（静态 20 关：ch1-3 每关一首诗贯穿 5 题=一诗一课；
   ch4 飞花令跨诗无单一关诗。生成关 flat≥20 按档取池轮换（同 flat 恒同关） ---------- */
const LEVEL_POEMS = ['jys', 'cx', 'mn', 'glyx', 'hua',            /* ch1 五言 */
                     'wlsbp', 'zwl', 'jgsh', 'xich', 'cunj',      /* ch2 七言 */
                     'yie', 'dgjl', 'cs', 'jx', 'cao'];           /* ch3 排诗句 */
const FIVE_CHAR = ['yie', 'jys', 'cx', 'mn', 'dgjl', 'cs', 'jx',
                   'hua', 'glyx', 'feng', 'xyze', 'yess', 'meih', 'cao', 'mnq', 'zys', 'sjian', 'jj2'];
const SEVEN_CHAR = ['wlsbp', 'zwl', 'jgsh', 'xich', 'huaj', 'xec', 'cunj', 'yl', 'xjc', 'zlj', 'shx', 'sxg'];
const ALL_POEMS = FIVE_CHAR.concat(SEVEN_CHAR);                   /* 30 首（五言 18+七言 12） */

/* ---------- 章题构成（r13 定稿；F=给上句选下句/R=给下句选上句（cue=所给句 idx）/
   O=句序重组（给 li0，排 li1-3）/FF=飞花令） ---------- */
const COMPOSE = {
  1: [{ type: 'F', cue: 0 }, { type: 'F', cue: 1 }, { type: 'F', cue: 2 },
      { type: 'R', cue: 3 }, { type: 'R', cue: 2 }],
  2: [{ type: 'F', cue: 0 }, { type: 'F', cue: 1 }, { type: 'F', cue: 2 },
      { type: 'R', cue: 3 }, { type: 'R', cue: 2 }],
  3: [{ type: 'F', cue: 0 }, { type: 'F', cue: 1 }, { type: 'F', cue: 2 },
      { type: 'R', cue: 3 }, { type: 'O' }],
  4: [{ type: 'FF' }, { type: 'FF' }, { type: 'FF' }, { type: 'FF' }, { type: 'FF' }]
};

/* ---------- 飞花令指定字轮换表（三字均库内诗句频次 ≥5：飞 6/春 7/花 8——SPEC §1-r13；
   每关 5 轮轮换保证三字全覆盖：char = FF_CHARS[(lv + k) % 3]） ---------- */
const FF_CHARS = ['飞', '春', '花'];

/* 每章每型干扰句数（r13 定版：F/R 卡数 1+干扰；ch1 五言 3 卡=干扰 2、ch2/ch3 4 卡=干扰 3；
   O 4 卡=3 答案+干扰 1；FF 4 卡=干扰 3） */
const distractN = (dch, type) => type === 'O' ? 1 : (type === 'FF' ? 3 : (dch === 1 ? 2 : 3));

/* ---------- 句卡配色（暖色积木卡五色轮换，确定性按序） ---------- */
const TILE_PALETTE = ['#F6E3C5', '#D8EDDF', '#F2D8E4', '#D6E4F0', '#FDEBD2'];
const tileBg = i => TILE_PALETTE[i % TILE_PALETTE.length];

/* ---------- 图标（全部内嵌 SVG） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="9" width="34" height="27" rx="4" fill="#FFFAF0" stroke="#FFF" stroke-width="2.5"/>' +
    '<path d="M11 16 h16 M11 22 h22 M11 28 h13" stroke="#E8975A" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M31 28 l5 -9 3 2 -5 9 -3.4 1.2 Z" fill="#E8975A" stroke="#FFF" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<circle cx="35.5" cy="15.5" r="4.5" fill="#8FBF7F" stroke="#FFF" stroke-width="1.8"/></svg>',
  speaker: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M10 24 h10 l13 -11 v38 l-13 -11 h-10 Z" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M41 22 q6 10 0 20 M49 15 q11 17 0 34" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  speakerSmall: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  bulb: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M32 8 a15 15 0 0 1 9 27 q-3 2.4 -3 6 h-12 q0 -3.6 -3 -6 a15 15 0 0 1 9 -27 Z" fill="#F2C98C" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 47 h12 M27.5 52 h9" stroke="#4A3B2E" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M32 16 v9 M25 20 l3.5 4 M39 20 l-3.5 4" stroke="#FFF9EE" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M10 14 l4 4 M54 14 l-4 4 M8 30 h5.5 M51 30 h5.5" stroke="#F2C98C" stroke-width="3" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  ear: '<svg viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M8 20 Q6 12 12 8 Q18 4 24 8 Q29 12 27 19 Q26 24 20 26 L13 26 Q9 25 8 20 Z" fill="#F0A868" stroke="#4A3B2E" stroke-width="2"/>' +
    '<path d="M14 15 q2 -3 5 -1" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/></svg>',
  feather: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M50 12 Q34 14 26 26 Q20 35 20 44 L14 50" stroke="#8FBF7F" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M48 14 Q52 18 50 26 Q46 38 34 44 Q26 47 21 45 Q24 34 32 26 Q40 18 48 14 Z" fill="#BFDCAF" stroke="#4A3B2E" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M30 40 L44 20 M24 46 l-6 8" stroke="#4A3B2E" stroke-width="2.2" stroke-linecap="round" opacity=".55"/></svg>'
};
