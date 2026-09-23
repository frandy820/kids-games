/* ================= habit 好习惯排序 游戏数据（章配置 / 12 流程步骤库 / 干扰主题 / 语音文案 / 图标）
   r5 难度改造：从「熟知序列 5 步排排」升级为「须推理的步骤序决策」（SPEC-BATCH10 §3-r5）——
   ① 流程库 6→12：新增 6 条非熟知因果序（包饺子/种花/寄信/烤蛋糕/洗澡/洗衣服），步骤序须按
     因果/流程逻辑推理（放种子前须先挖坑），不能全靠生活熟知度秒答；旧 6 序列保留做 ch1 底座。
   ② 步数 6-8：每序列 6-8 步（旧序列细化——如洗手 5→6 加「卷袖子」），排序认知负荷升档。
   ③ 纠错反馈=方向锚中性句（起点锚/依赖锚/顺序锚，按错位分方向），不泄具体步骤名。
   ④ 干扰卡（ch3+）：候选步卡混入跨序列同主题干扰步，干扰恒非本序列步骤且文本 ∉ 本序列
     步骤词（公平构造保证，verify 断言）；同序列近义步（装信封/贴邮票、装满土/盖上土）天然易混。
   玩法：题面=流程名（hb_q_* clip + '，先做什么呀' TTS 拼句），下方 6-9 张乱序步骤卡
   （圆底色块 + emoji 大字 + 步骤短词），孩子按正确顺序点选：当前应点 steps[pos] 对应卡。
   点对=卡飞入上方"顺序条"第 pos 位亮起；点错=晃动（不灰化可重点）；点干扰卡=错（辨析目标）。
   步骤序=客观因果/流程常识（SPEC §3-r5 步骤表逐字）；步骤短词=识字启蒙训练目标，
   大字可见（§0.19）；题面指令全语音承载。emoji 系统字体渲染（无外链）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%4+1 循环取材）
   r5 章型：ch1 熟知 6 步（洗手/起床/刷牙/穿衣）→ ch2 非熟知因果序（包饺子/种花/寄信）
   → ch3 近义步辨析（洗澡/洗衣服/烤蛋糕 + 干扰卡 ×2）→ ch4 全库混出（保证 ≥2 条 7-8 步
   长序列）+ 干扰 0-2；生成关（flat≥20）=全库混出 + 干扰 0-2（seeded）。
   name 供章末预告；hint=章末预告下一章文案（GEN 文案不带"明天："前缀，core 模板自带） */
const CHAPTERS = {
  1: { name: '排一排', hint: '包饺子和种小花也讲先后哦' },
  2: { name: '想一想', hint: '长得很像的步骤来啦，看仔细' },
  3: { name: '找不同', hint: '好习惯全用上，还有更长的呢' },
  4: { name: '全都要', hint: '新一轮好习惯排序' }
};
const GEN_HINTS = ['十二个好习惯排一排', '想一想，谁先谁后', '找出这一件事的步骤', '好习惯小达人'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- SAPI 拼句时长估计（b25 定版 ~345ms/字 + 600 落地余量；r4 m-5 统一 +600 口径，
   禁 +300 变体——四处同步：本定义 / game-main 注释 / game-verify 断言 / build.py 字面 assert）
   TTS_MAX_CHARS=全部方向锚反馈句的最大码点数（SPEC r5 时序分账用） */
const estMs = n => n * 345 + 600;
const TTS_MAX_CHARS = 14;  // estMs(14)=5430；最长反馈句「这一步要用到上一步的结果吗？」（14 码点）

/* ---------- 纠错方向锚（r5 去泄序：按错位分方向的中性句，禁含步骤名/流程名——
   verify 对 SPEC_FEEDBACK 独立重列做负向断言；均走 TTS 拼句（key:null），estMs 计入时序分账）
   起点 错（pos=0 且非相邻交换）→ 起点锚 / 中间错（pos>0 且非相邻交换）→ 依赖锚 /
   相邻交换（点到下一步）→ 顺序锚；点干扰卡按位置走起点/依赖锚（不揭示干扰身份） */
const Q_SUFFIX = '，先做什么呀';
const VOICE = {
  watch:  { key: 'hb_tut_watch', text: '看！这些事情有先后哦' },
  turn:   { key: 'hb_tut_turn',  text: '你来排一排' },
  hint:   { key: 'hb_hint',      text: '想一想，先做什么' },
  q_xishou:   { key: 'hb_q_xishou',   text: '洗手' },
  q_qichuang: { key: 'hb_q_qichuang', text: '起床' },
  q_shuaya:   { key: 'hb_q_shuaya',   text: '刷牙' },
  q_chuanyi:  { key: 'hb_q_chuanyi',  text: '穿衣' },
  q_guomal:   { key: 'hb_q_guomal',   text: '过马路' },
  q_shuijiao: { key: 'hb_q_shuijiao', text: '睡觉' },
  q_baojiaozi: { key: 'hb_q_baojiaozi', text: '包饺子' },
  q_zhonghua:  { key: 'hb_q_zhonghua',  text: '种花' },
  q_jixin:     { key: 'hb_q_jixin',     text: '寄信' },
  q_kaodangao: { key: 'hb_q_kaodangao', text: '烤蛋糕' },
  q_xizao:     { key: 'hb_q_xizao',     text: '洗澡' },
  q_xiyi:      { key: 'hb_q_xiyi',      text: '洗衣服' },
  /* T46 阶段2（2026-09-19）：纠错方向锚 clip 化 hb_w_*（keyless key:null 清零；文案不变） */
  wrongStart: { key: 'hb_w_start', text: '再想一想，一开始先做什么？' },      /* 起点锚（13 码点） */
  wrongMid:   { key: 'hb_w_mid',   text: '这一步要用到上一步的结果吗？' },    /* 依赖锚（14 码点=TTS_MAX_CHARS） */
  wrongAdj:   { key: 'hb_w_adj',   text: '再想想这两步，谁得等谁？' }         /* 顺序锚（12 码点，相邻交换） */
};
/* 题面整句拼装（读题/救援/重听共用；T46 阶段2：尾段 hb_suffix clip 在册，全段 clip 零 keyless） */
const qSpeechParts = hid => [VOICE['q_' + hid].key, 'hb_suffix'];

/* ---------- 干扰规则（r5 delta④）：DECOY_RULE 按难度章给干扰卡数（ch3 恒 2；ch4/生成关
   seeded 0-2，引擎内取整）；MAX_CARDS=卡区总卡上限（n=8→干扰≤1 / n=7→≤2 / n=6→≤2，
   布局换行临界由 verify 双 viewport bbox 实测定案）——四处同步：data 定义 / main 注释 /
   verify 断言 / build.py 字面 assert */
const DECOY_RULE = { 1: 0, 2: 0, 3: 2, 4: -1 };   /* -1 = seeded 0-2（ch4 与生成关） */
const MAX_CARDS = 9;

/* ---------- 流程主题（干扰同主题优先：clean 卫浴清洁 / kitchen 厨房 / out 出门户外 /
   clothes 衣物 / garden 花园；候选不足回落全库） */
const THEME = {
  xishou: 'clean', qichuang: 'out', shuaya: 'clean', chuanyi: 'clothes',
  guomal: 'out', shuijiao: 'clean', baojiaozi: 'kitchen', zhonghua: 'garden',
  jixin: 'out', kaodangao: 'kitchen', xizao: 'clean', xiyi: 'clean'
};

/* ---------- 流程库 HABITS（SPEC-BATCH10 §3-r5 步骤表逐字；步骤序=客观因果/流程常识，
   verify 对账）。旧 6 序列（洗手…睡觉）细化到 6 步；新 6 序列（包饺子…洗衣服）非熟知
   因果序 6-8 步。steps[].id 两字母缩写+序号（钩子 steps[] 正序 id）；t=步骤短词（2-3 字
   训练目标大字）；e=emoji */
const HABITS = {
  xishou: { name: '洗手', icon: '✋', steps: [
    { id: 'xs0', t: '卷袖子', e: '🧣' },
    { id: 'xs1', t: '冲湿手', e: '🚿' },
    { id: 'xs2', t: '搓泡泡', e: '🧼' },
    { id: 'xs3', t: '冲干净', e: '💧' },
    { id: 'xs4', t: '关水',   e: '🚰' },
    { id: 'xs5', t: '擦干',   e: '🧺' }
  ]},
  qichuang: { name: '起床', icon: '⏰', steps: [
    { id: 'qc0', t: '坐起来', e: '🥱' },
    { id: 'qc1', t: '穿衣服', e: '👕' },
    { id: 'qc2', t: '穿鞋袜', e: '🧦' },
    { id: 'qc3', t: '刷刷牙', e: '🪥' },
    { id: 'qc4', t: '洗洗脸', e: '💦' },
    { id: 'qc5', t: '吃早餐', e: '🥣' }
  ]},
  shuaya: { name: '刷牙', icon: '😁', steps: [
    { id: 'sy0', t: '拿牙刷', e: '🪥' },
    { id: 'sy1', t: '挤牙膏', e: '🧴' },
    { id: 'sy2', t: '刷一刷', e: '🦷' },
    { id: 'sy3', t: '漱漱口', e: '💦' },
    { id: 'sy4', t: '涮杯子', e: '🚿' },
    { id: 'sy5', t: '放回去', e: '🔄' }
  ]},
  chuanyi: { name: '穿衣', icon: '🎽', steps: [
    { id: 'cy0', t: '挑衣服', e: '👕' },
    { id: 'cy1', t: '分前后', e: '🔍' },
    { id: 'cy2', t: '穿袖子', e: '🙌' },
    { id: 'cy3', t: '拉下摆', e: '👇' },
    { id: 'cy4', t: '拉拉链', e: '🧥' },
    { id: 'cy5', t: '照镜子', e: '✨' }
  ]},
  guomal: { name: '过马路', icon: '🚸', steps: [
    { id: 'gm0', t: '停一停', e: '🛑' },
    { id: 'gm1', t: '等绿灯', e: '🚦' },
    { id: 'gm2', t: '左右看', e: '👀' },
    { id: 'gm3', t: '牵好手', e: '🤝' },
    { id: 'gm4', t: '走过去', e: '🚶' },
    { id: 'gm5', t: '到路边', e: '🎉' }
  ]},
  shuijiao: { name: '睡觉', icon: '🌙', steps: [
    { id: 'sj0', t: '收玩具', e: '🧸' },
    { id: 'sj1', t: '洗洗澡', e: '🛁' },
    { id: 'sj2', t: '刷刷牙', e: '🪥' },
    { id: 'sj3', t: '穿睡衣', e: '🩳' },
    { id: 'sj4', t: '听故事', e: '📖' },
    { id: 'sj5', t: '盖被子', e: '😴' }
  ]},
  baojiaozi: { name: '包饺子', icon: '🥟', steps: [
    { id: 'bj0', t: '洗青菜', e: '🥬' },
    { id: 'bj1', t: '剁肉馅', e: '🔪' },
    { id: 'bj2', t: '和面团', e: '🫓' },
    { id: 'bj3', t: '擀饺皮', e: '⚪' },
    { id: 'bj4', t: '包饺子', e: '🥟' },
    { id: 'bj5', t: '煮饺子', e: '🍲' },
    { id: 'bj6', t: '盛碗里', e: '🥣' },
    { id: 'bj7', t: '吃饺子', e: '😋' }
  ]},
  zhonghua: { name: '种花', icon: '🌷', steps: [
    { id: 'zh0', t: '拿花盆', e: '🪴' },
    { id: 'zh1', t: '装满土', e: '🪣' },
    { id: 'zh2', t: '挖小坑', e: '🕳' },
    { id: 'zh3', t: '放种子', e: '🌱' },
    { id: 'zh4', t: '盖上土', e: '⛰' },
    { id: 'zh5', t: '浇浇水', e: '💧' },
    { id: 'zh6', t: '晒太阳', e: '☀️' },
    { id: 'zh7', t: '发芽啦', e: '🌿' }
  ]},
  jixin: { name: '寄信', icon: '📮', steps: [
    { id: 'jx0', t: '找纸笔', e: '✏️' },
    { id: 'jx1', t: '想内容', e: '🤔' },
    { id: 'jx2', t: '写信',   e: '📝' },
    { id: 'jx3', t: '折起来', e: '📄' },
    { id: 'jx4', t: '装信封', e: '✉️' },
    { id: 'jx5', t: '贴邮票', e: '🏷' },
    { id: 'jx6', t: '投邮箱', e: '📮' }
  ]},
  kaodangao: { name: '烤蛋糕', icon: '🎂', steps: [
    { id: 'kd0', t: '备材料', e: '🥣' },
    { id: 'kd1', t: '打鸡蛋', e: '🥚' },
    { id: 'kd2', t: '加面粉', e: '🌾' },
    { id: 'kd3', t: '搅面糊', e: '🥄' },
    { id: 'kd4', t: '倒模具', e: '🧁' },
    { id: 'kd5', t: '进烤箱', e: '🔥' },
    { id: 'kd6', t: '装盘',   e: '🍰' }
  ]},
  xizao: { name: '洗澡', icon: '🛁', steps: [
    { id: 'xz0', t: '脱衣服', e: '👕' },
    { id: 'xz1', t: '调水温', e: '🚿' },
    { id: 'xz2', t: '洗头发', e: '🫧' },
    { id: 'xz3', t: '洗身体', e: '🧼' },
    { id: 'xz4', t: '擦干身', e: '🧺' },
    { id: 'xz5', t: '穿睡衣', e: '🩳' }
  ]},
  xiyi: { name: '洗衣服', icon: '🧺', steps: [
    { id: 'xy0', t: '收衣服', e: '🧺' },
    { id: 'xy1', t: '翻口袋', e: '🔍' },
    { id: 'xy2', t: '放进去', e: '🌀' },
    { id: 'xy3', t: '放洗衣液', e: '🧴' },
    { id: 'xy4', t: '开机器', e: '▶️' },
    { id: 'xy5', t: '晾衣服', e: '🎽' },
    { id: 'xy6', t: '叠放好', e: '📦' }
  ]}
};
const HABIT_IDS = Object.keys(HABITS);
/* 步骤查表：hid + 步骤号 → 步骤对象（渲染共用） */
const stepOf = (hid, si) => HABITS[hid].steps[si];

/* ---------- 图标（内嵌 SVG 描线风；步骤/流程图案用 emoji 系统字体） */
const ICONS = {
  /* logo：暖底圆牌 + 大对勾 + 小星（好习惯打卡感） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M13 23 L20 30 L32 15" stroke="#8FBF7F" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M31 8 l1.4 2.9 3.1 .4 -2.3 2.2 .6 3.1 -2.8 -1.5 -2.8 1.5 .6 -3.1 -2.3 -2.2 3.1 -.4 Z" fill="#F5C445"/></svg>',
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
