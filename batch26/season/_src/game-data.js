/* ================= season 季节衣橱 游戏数据 r4（双约束整套装决策改造 2026-09-13）
   玩法：题面 = 双条件 chips（气温带：很冷 0°C / 凉爽 15°C / 很热 35°C + 场合：去上学 /
   做运动 / 去睡觉 / 去派对）+ 季节场景卡（band 映射冬/春秋/夏景）+ 题面句（动态 TTS 拼句，
   weather v2 stem 豁免先例）+ 文字条（6-7 岁识字萌芽），下方 4-6 张物品卡。
   r4 判定模型（提交制，照 weather v2 / iftrain v2 先例）：
     点卡 = 勾选切换（零惩罚，勾件飞挂小兔 badge）；勾满点「穿好啦」提交：
     勾选集==need 推进 / 含错件=清空重选+miss（wrong_more）/ 未选满=保留继续（wrong_less）。
   物品库 30（原 16 + 新 14），每件双属性：temp=适配气温带集 / occ=适配场合集。
   fits(item,band,occ) = temp∋band && occ∋occ —— 干扰恒 !fits（构造即唯一性铁律：
   候选中满足双约束的物品恰=need，无跨约束歧义）。
   近季陷阱对 6（单项看似都能穿，按气温带/场合分对错；ch3 主场）：
     薄外套↔厚外套 / 薄围巾↔厚围巾 / 遮阳帽↔毛线帽 / 短袖↔长袖 / 凉鞋↔运动鞋 / 长裤↔短裤
   套装真值表 OUT2/OUT3（band|occ → 变体池；ch1 两件套 / ch2 三件套；sleep 场合无三件套
   不进 ch2 池；ch3 变体必含陷阱成员且对件强制入干扰）。
   反向题（ch4）：「{很冷/凉爽/很热}的天，哪件穿上不合适」——4 候选 = 3 件 fits(band)
   + 1 件 !fits(band)=need（反向排除，防纯正向查表惯性）；错反馈给方向锚不泄答案。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 气温带封闭 3 + 场合封闭 4（r4 双约束；SPEC r4 块） ---------- */
const TEMPS = {
  cold: { n: '很冷', deg: 0,  seasons: ['winter'] },            // 场景=冬景
  cool: { n: '凉爽', deg: 15, seasons: ['spring', 'autumn'] },  // 场景=春/秋景（seeded）
  hot:  { n: '很热', deg: 35, seasons: ['summer'] }             // 场景=夏景
};
const ALL_BANDS = Object.keys(TEMPS);                            // 封闭 3 带
const OCCS = {
  school: { n: '去上学' }, sport: { n: '做运动' },
  sleep:  { n: '去睡觉' }, party: { n: '去派对' }
};
const ALL_OCCS = Object.keys(OCCS);                              // 封闭 4 场合
/* sleep 场合无三件套（睡衣+拖鞋=2 件）——ch2（三件套章）池排除 sleep */
const OCC3_POOL = ['school', 'sport', 'party'];
/* ch3（陷阱主场）池排除 sleep（睡衣/拖鞋无陷阱成员）；band 全 3 带 */
const OCC_TRAP_POOL = ['school', 'sport', 'party'];

/* ---------- 物品封闭 30（r4：16→30；n=名 / temp=适配带集 / occ=适配场合集）
   数学先验自检：每件 temp/occ 均为封闭表内值；干扰池=!fits（唯一性由构造保证） ---------- */
const ITEMS = {
  /* —— 原 16（v1 唯一归属表重映射到双属性：春/秋→cool、夏→hot、冬→cold） —— */
  umbrella:   { n: '雨伞',   temp: ['cool'],       occ: ['school', 'party'] },
  rainboots:  { n: '雨靴',   temp: ['cool'],       occ: ['school'] },
  lightjacket:{ n: '薄外套', temp: ['cool'],       occ: ['school', 'sport', 'party'] },
  kite:       { n: '风筝',   temp: ['cool'],       occ: ['sport'] },
  tshirt:     { n: '短袖',   temp: ['hot'],        occ: ['school', 'sport', 'party'] },
  sandals:    { n: '凉鞋',   temp: ['hot'],        occ: ['school', 'party'] },
  sunhat:     { n: '遮阳帽', temp: ['hot'],        occ: ['school', 'sport', 'party'] },
  goggles:    { n: '泳镜',   temp: ['hot'],        occ: ['sport'] },
  longsleeve: { n: '长袖',   temp: ['cool'],       occ: ['school', 'sport', 'party'] },
  vest:       { n: '马甲',   temp: ['cool'],       occ: ['school', 'party'] },
  pants:      { n: '长裤',   temp: ['cool','cold'],occ: ['school', 'sport', 'party'] },
  trench:     { n: '风衣',   temp: ['cool'],       occ: ['school', 'party'] },
  heavycoat:  { n: '厚外套', temp: ['cold'],       occ: ['school', 'sport', 'party'] },
  gloves:     { n: '手套',   temp: ['cold'],       occ: ['school', 'sport'] },
  scarf:      { n: '厚围巾', temp: ['cold'],       occ: ['school', 'party'] },
  snowboots:  { n: '雪地靴', temp: ['cold'],       occ: ['school'] },
  /* —— 新 14（r4 扩库：睡衣派对运动三场合专件 + 陷阱对件） —— */
  sweater:    { n: '毛衣',   temp: ['cold'],       occ: ['school', 'sport', 'party'] },
  shorts:     { n: '短裤',   temp: ['hot'],        occ: ['school', 'sport'] },
  skirt:      { n: '小裙子', temp: ['hot','cool'], occ: ['school', 'party'] },
  dress:      { n: '小礼服', temp: ['hot','cool','cold'], occ: ['party'] },
  sneaker:    { n: '运动鞋', temp: ['hot','cool'], occ: ['school', 'sport'] },
  partyshoes: { n: '小皮鞋', temp: ['cool','cold'],occ: ['school', 'party'] },
  woolhat:    { n: '毛线帽', temp: ['cold'],       occ: ['school', 'party'] },
  cap:        { n: '棒球帽', temp: ['hot','cool'], occ: ['sport'] },
  thinscarf:  { n: '薄围巾', temp: ['cool'],       occ: ['school', 'party'] },
  earmuffs:   { n: '耳罩',   temp: ['cold'],       occ: ['school', 'sport', 'party'] },
  warmpants:  { n: '加绒裤', temp: ['cold'],       occ: ['school', 'sport'] },
  swimsuit:   { n: '泳衣',   temp: ['hot'],        occ: ['sport'] },
  pajamas:    { n: '睡衣',   temp: ['hot','cool','cold'], occ: ['sleep'] },   // 睡衣只在睡觉场合适配
  slippers:   { n: '小拖鞋', temp: ['hot','cool','cold'], occ: ['sleep'] }
};
const ALL30 = Object.keys(ITEMS);                                 // 封闭 30 物品
const nameOfItem = k => ITEMS[k].n;
const nameOfBand = b => TEMPS[b].n;
const nameOfOcc = o => OCCS[o].n;
/* 双约束兼容判定（干扰池与 verify 唯一性断言共用封闭入口） */
const fits = (k, band, occ) => ITEMS[k].temp.indexOf(band) >= 0 && ITEMS[k].occ.indexOf(occ) >= 0;

/* ---------- 近季陷阱对封闭 6（r4 核心干扰；单项看似都能穿，按带/场合分对错）
   薄外套↔厚外套 / 薄围巾↔厚围巾 / 遮阳帽↔毛线帽 / 短袖↔长袖 / 凉鞋↔运动鞋 / 长裤↔短裤
   陷阱语义自查（对件在当题语境必须 !fits 才可入干扰——ch3 生成器按此过滤）：
   cold 题薄外套/薄围巾/遮阳帽/短袖/凉鞋/短裤=!fits；cool 题厚外套/厚围巾/毛线帽/短袖/凉鞋/短裤=!fits
   hot 题厚外套/厚围巾/毛线帽/长袖/长裤=!fits；sport 题凉鞋=!fits（场合维） ---------- */
const TRAP_PAIRS = [
  ['lightjacket', 'heavycoat'], ['thinscarf', 'scarf'], ['sunhat', 'woolhat'],
  ['tshirt', 'longsleeve'], ['sandals', 'sneaker'], ['pants', 'shorts']
];
const trapMate = k => {
  for (let p = 0; p < TRAP_PAIRS.length; p++) {
    const a = TRAP_PAIRS[p][0], b = TRAP_PAIRS[p][1];
    if (k === a) return b;
    if (k === b) return a;
  }
  return null;
};

/* ---------- 套装真值表（band|occ → 变体池；变体=need 数组；确定性 seeded 变体选择）
   OUT2=两件套池（ch1）/ OUT3=三件套池（ch2，含配件；sleep 无三件套不进池）
   变体成员全部 fits(band,occ)（verify 逐件断言）；候选干扰恒 !fits（构造即唯一性） ---------- */
const OUT2 = {
  'cold|school': [['heavycoat','pants'], ['sweater','warmpants']],
  'cold|sport':  [['sweater','pants'], ['heavycoat','warmpants']],
  'cold|sleep':  [['pajamas','slippers']],
  'cold|party':  [['heavycoat','dress'], ['sweater','dress']],
  'cool|school': [['lightjacket','pants'], ['trench','skirt']],
  'cool|sport':  [['longsleeve','pants'], ['lightjacket','pants']],
  'cool|sleep':  [['pajamas','slippers']],
  'cool|party':  [['trench','skirt'], ['lightjacket','skirt']],
  'hot|school':  [['tshirt','shorts'], ['tshirt','skirt']],
  'hot|sport':   [['tshirt','shorts'], ['swimsuit','goggles']],
  'hot|sleep':   [['pajamas','slippers']],
  'hot|party':   [['dress','sandals'], ['tshirt','skirt']]
};
const OUT3 = {
  'cold|school': [['heavycoat','pants','scarf'], ['sweater','warmpants','woolhat']],
  'cold|sport':  [['sweater','pants','gloves'], ['heavycoat','warmpants','earmuffs']],
  'cold|party':  [['heavycoat','dress','partyshoes'], ['sweater','dress','partyshoes']],
  'cool|school': [['lightjacket','pants','rainboots'], ['trench','skirt','umbrella']],
  'cool|sport':  [['longsleeve','pants','cap'], ['lightjacket','pants','kite'], ['longsleeve','pants','sneaker']],
  'cool|party':  [['trench','dress','partyshoes'], ['lightjacket','skirt','thinscarf']],
  'hot|school':  [['tshirt','shorts','sandals'], ['tshirt','skirt','sunhat']],
  'hot|sport':   [['tshirt','shorts','cap'], ['tshirt','shorts','sneaker'], ['swimsuit','goggles','cap']],
  'hot|party':   [['tshirt','skirt','sunhat'], ['tshirt','dress','sandals']]
};

/* ---------- 反向题 need 池（ch4：「哪件穿上不合适」——温度敏感穿着件封闭 12）
   全部为穿着物（kite/雨具等功能物不入），need 按 band 过滤 !fits 后 seeded 抽 ---------- */
const ANTI_NEED_POOL = ['tshirt', 'longsleeve', 'lightjacket', 'heavycoat', 'thinscarf', 'scarf',
                        'sunhat', 'woolhat', 'sandals', 'snowboots', 'shorts', 'warmpants'];

/* ---------- 题面句（动态 TTS 拼句，weather v2 stem 豁免先例——12 变体不 clip 化）
   stem ≤12 码点（fire-and-forget 读题，无演出窗约束）；反问句不泄答案 ---------- */
const stemOf = (band, occ) => TEMPS[band].n + '的天' + OCCS[occ].n + '，穿什么';
const stemAntiOf = band => TEMPS[band].n + '的天，哪件穿上不合适';

/* ---------- 提交反馈句（TTS 拼句，flat<3 每次播 / flat≥3 10s 节流——sayWText 通道）
   ≤11 码点：estMs(11)=4395 ≤ wrongChainUntil 4750-300（build.py 静态断言；r4 审查 m-5：
   estMs 统一家族 b25 定版 +600 落地余量，豁免窗 4600→4750 同步） ---------- */
const SUBMIT_TEXT = {
  less: '还差一件，再挑一挑',        /* 少选：保留勾选继续找（合法路径不算 miss） */
  more: '多选了一件，再挑一挑'       /* 含错件：清空重选 + miss（真实错误路径） */
};
/* 反向题错反馈方向锚（点适配件时播；按 band 归句，不泄答案；≤10 码点） */
const ANTI_ANCHOR = {
  cold: '很冷的天，哪件会发抖',
  cool: '凉爽的天，哪件不合适',
  hot:  '很热的天，哪件会出汗'
};
/* 判对确认句（TTS 拼句豁免，v1 confirm 先例）：outfit=题面句尾换「穿好啦」/ anti=带语义确认
   ≤11 码点：判对演出窗 620+430+4350=5400 ≥ estMs(11)+300=4695（b25 定版 TTS 拼句窗护栏） */
const confirmOf = q => q.kind === 'anti'
  ? TEMPS[q.band].n + '的天，它不合适'
  : TEMPS[q.band].n + '的天' + OCCS[q.occ].n + '，穿好啦';

/* ---------- SAPI 拼句时长估计（b25 定版：~345ms/字 + 600 落地余量——r4 审查 m-5 统一，
   原本款 +300 为口径漂移）TTS_MAX_CHARS=全部错反馈/提交反馈句的最大码点数（estMs 窗校验
   封闭入口；题面句 fire-and-forget 不受窗约束） ---------- */
const estMs = n => n * 345 + 600;
const TTS_MAX_CHARS = 11;          // estMs(11)=4395；wrongChainUntil=4750 ≥ 4395+300=4695 ✓

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言） ---------- */
const CHAPTERS = {
  1: { name: '穿两件', hint: '下次要一次配好三件啦' },      // 预告 ch2 三件套
  2: { name: '挑三件', hint: '下次的衣服长得像，看仔细哦' },  // 预告 ch3 近季陷阱
  3: { name: '像不像', hint: '下次还要反过来找错哦' },      // 预告 ch4 反向题
  4: { name: '找错题', hint: '新一轮穿衣挑战来啦' }         // 预告生成关
};
const GEN_HINTS = ['看看温度想去处，配两件',   // dch1 双约束两件套
                   '三件一起配好，加上配件',   // dch2 三件套
                   '长得像的衣服，看仔细再选', // dch3 近季陷阱
                   '哪件不合适，反过来找找'];  // dch4 反向混出
const CH_LEN = 5;          // 5 题 = 1 关（单关净时长 ≥45s 硬指标：读题+双约束思考+勾 2-3 件+提交演出）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   四包装 watch/turn/right + hint 双形态（r4 新增 2 条按题型方向 hint）；
   sea_q v1 题面 clip 退役（题面句 12 变体走动态 TTS，weather v2 先例），注入保留不播；
   sea_wrong v1 错反馈 clip 保留注入（r4 错反馈走方向锚 TTS/新 hint clip） ---------- */
const VOICE = {
  watch:     { key: 'sea_tut_watch',      text: '看！这个季节穿什么' },
  turn:      { key: 'sea_tut_turn',       text: '你来挑一挑' },
  right:     { key: 'sea_right',          text: '穿好啦，正合适' },
  hint:      { key: 'sea_hint',           text: '想想现在是什么季节' },
  hintOutfit:{ key: 'sea_hint_outfit',    text: '看看温度，再想去哪儿' },   // r4 新增（2760ms）
  hintAnti:  { key: 'sea_hint_anti',      text: '哪件穿上会发抖呀' },       // r4 新增（2520ms）
  wrong:     { key: 'sea_wrong',          text: '这个季节不合适哦' },
  q:         { key: 'sea_q',              text: '这个季节要穿什么' }        // v1 沿用（注入保留）
};

/* ---------- 物品 SVG（viewBox 0 0 100 100；家族暖卡通风：INK 描边 + 暖填充）
   近季陷阱对区分点（一眼可辨铁律）：
   lightjacket=浅蓝单薄短款+拉链 ↔ heavycoat=深红蓬宽身+米白毛领
   thinscarf=浅色窄条轻绕一圈 ↔ scarf=红底绿条宽环+垂段+流苏
   sunhat=草黄宽檐+红丝带 ↔ woolhat=米白罗纹帽身+顶绒球
   tshirt=亮黄短袖 ↔ longsleeve=绿色长袖（袖长对比）
   sandals=棕底 X 交叉带 ↔ sneaker=白底侧视运动鞋+鞋带（包裹感对比）
   pants=深蓝长裤 ↔ shorts=橙色短裤（裤长对比） ---------- */
const ITEM_ELS = {
  /* 春 */
  umbrella: /* 雨伞：红伞面+白分瓣弧+伞尖+弯钩柄 */
    '<path d="M10 54 A40 40 0 0 1 90 54 Q82 48 74 54 Q66 48 58 54 Q50 48 42 54 Q34 48 26 54 Q18 48 10 54 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 14 V54 M28 22 Q34 40 30 53 M72 22 Q66 40 70 53" stroke="' + INK + '" stroke-width="2" fill="none" opacity=".55"/>' +
    '<circle cx="50" cy="12" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M50 54 V82 Q50 92 41 92 Q33 92 32 85" stroke="' + INK + '" stroke-width="4.5" fill="none" stroke-linecap="round"/>',
  rainboots: /* 雨靴：黄色高筒双靴（前深后浅错位）+深色鞋底+三滴蓝水花 */
    '<path d="M28 68 L28 24 Q28 18 34 18 L46 18 Q52 18 52 24 L52 44 Q52 50 58 51 L68 53 Q74 54 74 60 L74 66 Q74 70 70 70 L32 70 Q28 70 28 68 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="26" y="64" width="50" height="9" rx="4" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M40 26 V60" stroke="' + INK + '" stroke-width="2" opacity=".5"/>' +
    '<ellipse cx="33" cy="28" rx="3" ry="5" fill="#FFF" opacity=".7"/>' +
    '<path d="M84 30 q4 7 0 10 q-4 -3 0 -10 Z M90 48 q4 7 0 10 q-4 -3 0 -10 Z M12 84 q4 7 0 10 q-4 -3 0 -10 Z" fill="#7FC8E8" stroke="' + INK + '" stroke-width="1.8"/>',
  lightjacket: /* 薄外套：浅蓝单薄短款+中缝拉链线+翻领（区分点 vs 厚外套：浅色/薄款/无毛领） */
    '<rect x="13" y="24" width="17" height="42" rx="8" fill="#A8D8E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="70" y="24" width="17" height="42" rx="8" fill="#A8D8E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="30" y="20" width="40" height="52" rx="9" fill="#A8D8E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M50 26 V66" stroke="' + INK + '" stroke-width="2.5" stroke-dasharray="4 3"/>' +
    '<path d="M42 20 L50 30 L58 20" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
  kite: /* 风筝：红菱面+十字骨架+尾巴三结+引线 */
    '<path d="M50 8 L76 44 L50 66 L24 44 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 8 V66 M24 44 H76" stroke="' + INK + '" stroke-width="2" opacity=".6"/>' +
    '<circle cx="50" cy="44" r="3.5" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M50 66 Q42 76 50 84 Q58 76 50 92" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M44 72 l-5 3 l5 3 Z M56 79 l5 3 l-5 3 Z M43 86 l-5 3 l5 3 Z" fill="#57B368" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M76 44 L92 58" stroke="' + INK + '" stroke-width="2" stroke-dasharray="3 4"/>',
  /* 夏 */
  tshirt: /* 短袖：亮黄 T 恤（圆领+短袖+底摆） */
    '<rect x="8" y="26" width="21" height="24" rx="7" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="71" y="26" width="21" height="24" rx="7" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="27" y="24" width="46" height="50" rx="8" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 24 Q50 34 60 24" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M31 68 H69" stroke="' + INK + '" stroke-width="2" opacity=".5"/>',
  sandals: /* 凉鞋：棕色鞋底俯视+X 交叉带+踝带（区分点 vs 运动鞋：镂空脚趾） */
    '<ellipse cx="50" cy="60" rx="31" ry="19" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="50" cy="60" rx="22" ry="12" fill="none" stroke="' + INK + '" stroke-width="2" opacity=".45"/>' +
    '<path d="M28 50 L72 68 M72 50 L28 68" stroke="#8A5A3C" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M30 42 Q50 30 70 42" fill="none" stroke="#8A5A3C" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="50" cy="33" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>',
  sunhat: /* 遮阳帽：草黄宽檐+帽顶+红丝带（区分点 vs 毛线帽：宽檐无绒球） */
    '<ellipse cx="50" cy="66" rx="38" ry="13" fill="#F0D9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M24 62 A26 26 0 0 1 76 62 Z" fill="#F0D9A0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 56 H76" stroke="#E8483C" stroke-width="7"/>' +
    '<path d="M24 56 H76" stroke="' + INK + '" stroke-width="2" opacity=".5"/>' +
    '<circle cx="50" cy="36" r="3.5" fill="#F0D9A0" stroke="' + INK + '" stroke-width="2.5"/>',
  goggles: /* 泳镜：双蓝镜框+高光+鼻桥+两侧带头 */
    '<path d="M8 46 Q4 54 8 62 M92 46 Q96 54 92 62" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="35" cy="54" r="17" fill="#7FC8E8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="65" cy="54" r="17" fill="#7FC8E8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M46 50 Q50 56 54 50" fill="none" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="29" cy="48" r="4.5" fill="#FFF" opacity=".85"/><circle cx="59" cy="48" r="4.5" fill="#FFF" opacity=".85"/>',
  /* 秋 */
  longsleeve: /* 长袖：绿色长袖衫（圆领+长袖至腕+底摆；区分点 vs 短袖：袖长） */
    '<rect x="10" y="24" width="17" height="52" rx="8" fill="#57B368" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="73" y="24" width="17" height="52" rx="8" fill="#57B368" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="27" y="20" width="46" height="54" rx="8" fill="#57B368" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 20 Q50 31 60 20" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M31 68 H69" stroke="' + INK + '" stroke-width="2" opacity=".5"/>',
  vest: /* 马甲：橙色无袖+V 领+两粒扣 */
    '<path d="M31 18 L45 18 L50 30 L55 18 L69 18 L71 72 L29 72 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M45 18 L50 30 L55 18" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="44" cy="42" r="3.2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="56" cy="42" r="3.2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M33 64 H67" stroke="' + INK + '" stroke-width="2" opacity=".5"/>',
  pants: /* 长裤：深蓝腰头+两裤腿+中缝+脚口（区分点 vs 短裤：裤长） */
    '<rect x="28" y="14" width="44" height="13" rx="4" fill="#4E7FD0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M28 27 L29 74 L44 74 L50 42 L56 74 L71 74 L72 27 Z" fill="#4E7FD0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 42 L50 27" stroke="' + INK + '" stroke-width="2" opacity=".55"/>' +
    '<path d="M31 70 H43 M57 70 H69" stroke="' + INK + '" stroke-width="2.5"/>',
  trench: /* 风衣：卡其棕长款+双排扣 4 粒+腰带+翻领 */
    '<rect x="12" y="24" width="17" height="50" rx="8" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="71" y="24" width="17" height="50" rx="8" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="28" y="16" width="44" height="66" rx="7" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 16 L50 28 L60 16" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="28" y="44" width="44" height="9" rx="4" fill="#8A5A3C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="42" cy="36" r="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="58" cy="36" r="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="42" cy="59" r="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="58" cy="59" r="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>',
  /* 冬 */
  heavycoat: /* 厚外套：深红蓬宽身+米白毛领+厚袖+中扣（区分点 vs 薄外套：蓬宽+毛领） */
    '<rect x="11" y="26" width="19" height="48" rx="9" fill="#C05046" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="70" y="26" width="19" height="48" rx="9" fill="#C05046" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M29 22 Q27 18 33 16 L50 22 L67 16 Q73 18 71 22 L71 78 Q71 82 67 82 L33 82 Q29 82 29 78 Z" fill="#C05046" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M36 18 Q50 34 64 18 L62 30 Q50 40 38 30 Z" fill="#F5EFE0" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="48" r="3.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="50" cy="62" r="3.4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>',
  gloves: /* 手套：红色连指手套（拇指分开+白翻边袖口） */
    '<path d="M34 34 Q34 24 44 24 L58 24 Q68 24 68 34 L68 62 Q68 72 58 72 L44 72 Q34 72 34 62 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M68 44 L82 44 Q88 44 88 50 Q88 56 82 56 L68 56 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="32" y="66" width="38" height="12" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M44 38 V58 M58 38 V58" stroke="' + INK + '" stroke-width="2" opacity=".45"/>',
  scarf: /* 厚围巾：红底绿条环绕段+垂段+流苏（区分点 vs 薄围巾：宽环+垂段流苏） */
    '<path d="M22 24 Q50 12 78 24 L78 44 Q50 56 22 44 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M25 30 Q50 40 75 30 M25 38 Q50 48 75 38" stroke="#57B368" stroke-width="4" fill="none"/>' +
    '<path d="M56 50 L58 88 L74 84 L70 48 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 58 L70 55" stroke="#57B368" stroke-width="3.5"/>' +
    '<path d="M59 88 l-1 7 M64 87 l0 7 M69 86 l1 7 M72 84 l2 6" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  snowboots: /* 雪地靴：米白毛绒厚靴+绒口波浪边+厚底+旁边雪花 */
    '<path d="M28 70 L28 26 Q28 20 34 20 L46 20 Q52 20 52 26 L52 42 Q52 48 58 49 L68 52 Q75 53 75 59 L75 64 Q75 68 71 68 L32 68 Q28 68 28 70 Z" fill="#F5EFE0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 26 q5 -6 10 0 q5 -6 10 0 q5 -6 10 0 q5 -6 10 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M40 28 Q40 46 42 60" stroke="#D8CBB4" stroke-width="3" fill="none"/>' +
    '<rect x="25" y="62" width="52" height="11" rx="5" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M88 26 v12 M82 32 h12 M84 28 l8 8 M92 28 l-8 8" stroke="#9FBFD8" stroke-width="2.4" stroke-linecap="round"/>',
  /* ---- r4 新 14 件 ---- */
  sweater: /* 毛衣：酒红高领+菱形纹+罗纹下摆（冷天保暖上装） */
    '<rect x="11" y="28" width="17" height="44" rx="8" fill="#9E4A4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="72" y="28" width="17" height="44" rx="8" fill="#9E4A4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="28" y="22" width="44" height="54" rx="8" fill="#9E4A4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M38 16 H62 V24 H38 Z" fill="#B46A6A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M50 36 L58 44 L50 52 L42 44 Z" fill="#F0D9A0" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M42 44 L34 40 M58 44 L66 40 M50 52 L50 62" stroke="#F0D9A0" stroke-width="2.2"/>' +
    '<path d="M30 68 H70" stroke="' + INK + '" stroke-width="2.5" opacity=".5"/>',
  shorts: /* 短裤：橙色短裤（腰头+短两腿；区分点 vs 长裤：裤长） */
    '<rect x="30" y="18" width="40" height="12" rx="4" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M30 30 L29 50 L44 50 L50 38 L56 50 L71 50 L70 30 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 38 L50 30" stroke="' + INK + '" stroke-width="2" opacity=".55"/>' +
    '<path d="M31 46 H43 M57 46 H69" stroke="' + INK + '" stroke-width="2.5"/>',
  skirt: /* 小裙子：粉色 A 字裙+腰头蝴蝶结 */
    '<path d="M32 22 L68 22 L80 76 L20 76 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="30" y="16" width="40" height="11" rx="4" fill="#E8A0B4" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M50 27 L42 20 Q50 14 58 20 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M36 66 L64 66" stroke="' + INK + '" stroke-width="2" opacity=".4"/>',
  dress: /* 小礼服：紫色上身+蓬蓬裙摆+腰带蝴蝶结（派对专件） */
    '<path d="M38 16 L45 16 L50 26 L55 16 L62 16 L64 38 L36 38 Z" fill="#9A7FC0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M36 38 L18 82 L82 82 L64 38 Z" fill="#B49AD6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="34" y="36" width="32" height="9" rx="4" fill="#7A5FA8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M50 45 L41 52 L44 41 Z M50 45 L59 52 L56 41 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M24 74 L76 74" stroke="' + INK + '" stroke-width="2" opacity=".35"/>',
  sneaker: /* 运动鞋：侧视白蓝运动鞋+鞋带+厚底（区分点 vs 凉鞋：全包裹+鞋带） */
    '<path d="M16 62 Q16 50 30 48 L46 44 Q52 34 58 36 Q63 38 62 46 L74 50 Q84 53 84 62 L84 66 Q84 70 80 70 L20 70 Q16 70 16 66 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M44 52 L58 46 M46 57 L62 50" stroke="#4E7FD0" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M52 38 l5 -2 M56 42 l6 -2" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<rect x="13" y="66" width="74" height="10" rx="4" fill="#4E7FD0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M24 61 q4 -3 8 0" stroke="#4E7FD0" stroke-width="2.5" fill="none" stroke-linecap="round"/>',
  partyshoes: /* 小皮鞋：黑色亮头皮鞋+蝴蝶结（区分点 vs 运动鞋：亮面+装饰结） */
    '<path d="M20 56 Q20 48 32 46 L52 44 Q56 40 60 44 L76 50 Q84 53 84 60 L84 64 Q84 68 80 68 L24 68 Q20 68 20 64 Z" fill="#4A4038" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="42" cy="52" rx="8" ry="3.4" fill="#FFF9EE" opacity=".35"/>' +
    '<path d="M52 46 L44 42 Q52 38 56 44 Z M52 46 L60 41 Q60 49 54 49 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<rect x="17" y="64" width="70" height="9" rx="4" fill="#2E2622" stroke="' + INK + '" stroke-width="2.5"/>',
  woolhat: /* 毛线帽：米白罗纹帽身+顶绒球+翻边（区分点 vs 遮阳帽：无檐+绒球） */
    '<path d="M26 62 Q26 18 50 18 Q74 18 74 62 Z" fill="#F0E3CC" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M36 20 V60 M50 18 V62 M64 20 V60" stroke="#D8CBB4" stroke-width="3"/>' +
    '<rect x="22" y="58" width="56" height="14" rx="7" fill="#E8483C" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M26 62 h48" stroke="' + INK + '" stroke-width="2" opacity=".4"/>' +
    '<circle cx="50" cy="14" r="8" fill="#F0E3CC" stroke="' + INK + '" stroke-width="2.5"/>',
  cap: /* 棒球帽：蓝色帽身+前檐+气孔（运动专件） */
    '<path d="M24 54 Q24 20 50 20 Q76 20 76 54 Z" fill="#4E7FD0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 54 Q4 58 6 66 Q30 62 50 62 Q72 62 94 66 Q96 58 76 54" fill="#4E7FD0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="40" cy="32" r="2.6" fill="#FFF9EE" opacity=".8"/><circle cx="58" cy="30" r="2.6" fill="#FFF9EE" opacity=".8"/>' +
    '<circle cx="50" cy="44" r="3.4" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M24 54 Q50 60 76 54" stroke="' + INK + '" stroke-width="2" opacity=".4" fill="none"/>',
  thinscarf: /* 薄围巾：浅蓝窄条轻绕一圈+短垂尾（区分点 vs 厚围巾：窄条无流苏） */
    '<path d="M28 30 Q50 20 72 30 L72 44 Q50 36 28 44 Z" fill="#BCD9EA" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 34 L52 38 L62 36 L60 32 Z" fill="#BCD9EA" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M62 36 L66 62" stroke="#BCD9EA" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M62 36 L66 62" fill="none" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M64 60 l0 6 M68 60 l1 6" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>',
  earmuffs: /* 耳罩：头箍+两侧绒球耳罩 */
    '<path d="M20 52 Q20 12 50 12 Q80 12 80 52" fill="none" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<ellipse cx="22" cy="58" rx="12" ry="15" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="78" cy="58" rx="12" ry="15" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M16 52 q6 -4 12 0 M72 52 q6 -4 12 0" stroke="#E8A0B4" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="19" cy="53" r="1.8" fill="#FFF9EE" opacity=".8"/><circle cx="75" cy="53" r="1.8" fill="#FFF9EE" opacity=".8"/>',
  warmpants: /* 加绒裤：深棕厚裤+裤脚绒边（区分点 vs 长裤：厚身+绒口） */
    '<rect x="26" y="12" width="48" height="13" rx="4" fill="#8A624A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M26 25 L27 72 L43 72 L50 42 L57 72 L73 72 L74 25 Z" fill="#8A624A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M50 42 L50 25" stroke="' + INK + '" stroke-width="2" opacity=".55"/>' +
    '<rect x="26" y="66" width="18" height="10" rx="5" fill="#F0E3CC" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="56" y="66" width="18" height="10" rx="5" fill="#F0E3CC" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M32 36 h10 M58 36 h10" stroke="#F0E3CC" stroke-width="2" opacity=".5"/>',
  swimsuit: /* 泳衣：蓝色连体泳衣+波浪纹（运动专件） */
    '<path d="M36 20 Q50 28 64 20 L68 34 Q64 44 58 46 L62 78 L38 78 L42 46 Q36 44 32 34 Z" fill="#5FB8D8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M38 16 Q44 24 50 22 Q56 24 62 16" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M38 62 q6 4 12 0 q6 4 12 0" fill="none" stroke="#FFF" opacity=".7" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M40 70 q5 4 10 0 q5 4 10 0" fill="none" stroke="#FFF" opacity=".7" stroke-width="2.6" stroke-linecap="round"/>',
  pajamas: /* 睡衣：浅蓝星星睡衣+扣子（睡觉专件） */
    '<rect x="13" y="26" width="16" height="40" rx="7" fill="#A8C8E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="71" y="26" width="16" height="40" rx="7" fill="#A8C8E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="29" y="20" width="42" height="52" rx="9" fill="#A8C8E8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 20 Q50 30 60 20" fill="none" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M50 44 l2.4 4.8 5.4 .8 -3.9 3.8 .9 5.4 -4.8 -2.5 -4.8 2.5 .9 -5.4 -3.9 -3.8 5.4 -.8 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="34" r="2.2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.6"/><circle cx="50" cy="62" r="2.2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.6"/>',
  slippers: /* 小拖鞋：粉色一双（绒面+绊带；睡觉专件） */
    '<g transform="translate(-2,2) scale(.72)">' +
    '<path d="M20 52 Q20 40 34 40 L64 40 Q78 40 78 52 L78 66 Q78 72 72 72 L26 72 Q20 72 20 66 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M34 40 Q50 28 64 40" fill="#E8A0B4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="34" r="3.4" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/></g>' +
    '<g transform="translate(30,14) scale(.72)">' +
    '<path d="M20 52 Q20 40 34 40 L64 40 Q78 40 78 52 L78 66 Q78 72 72 72 L26 72 Q20 72 20 66 Z" fill="#E8A0B4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M34 40 Q50 28 64 40" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="34" r="3.4" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/></g>'
};
/* 物品卡 SVG（mode 'card'=卡上大图 / 'fly'=飞行小图 / 'worn'=挂件小图，同源零旋转） */
function itemSvg(item, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="88" height="88"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g stroke-linecap="round">' + ITEM_ELS[item] + '</g></svg>';
}

/* ---------- 季节场景 SVG（viewBox 0 0 360 184；band→季节映射：cold=冬 / cool=春或秋（seeded）
   / hot=夏。树/天气/地面随季节变化，纯 CSS 动画零 JS；场景由引擎把 band 换算成 season */
const SEASONS = {
  spring: { n: '春天' }, summer: { n: '夏天' },
  autumn: { n: '秋天' }, winter: { n: '冬天' }
};
const ALL_SEASONS = Object.keys(SEASONS);
const nameOfSeason = s => SEASONS[s].n;
const TREE_X = 96;   // 树心 x
function seasonSvg(season) {
  const sky = { spring: '#EAF3F8', summer: '#FDF3D8', autumn: '#FBF0DC', winter: '#EEF3F7' }[season];
  const gnd = { spring: '#D6E7C2', summer: '#C9E3AC', autumn: '#EAD9A8', winter: '#F4F7F9' }[season];
  let deco = '';
  if (season === 'spring') {
    deco =
      /* 灰白云 ×2（雨前云） */
      '<g fill="#FFF" stroke="' + INK + '" stroke-width="2.5"><ellipse cx="70" cy="30" rx="24" ry="13"/><ellipse cx="92" cy="25" rx="17" ry="11"/></g>' +
      /* 雨丝（CSS 下落循环） */
      '<g class="rain"><path d="M60 44 l-4 12 M84 50 l-4 12 M108 42 l-4 12 M132 50 l-4 12" stroke="#7FB3D8" stroke-width="3" stroke-linecap="round"/></g>' +
      /* 树：树干+浅绿冠+5 粉花点 */
      '<rect x="' + (TREE_X - 6) + '" y="88" width="12" height="40" rx="4" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="' + TREE_X + '" cy="70" r="34" fill="#A8D8A0" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="' + (TREE_X - 18) + '" cy="82" r="16" fill="#A8D8A0" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="' + (TREE_X + 18) + '" cy="82" r="16" fill="#A8D8A0" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<g fill="#F2B8C6" stroke="' + INK + '" stroke-width="1.6"><circle cx="' + (TREE_X - 12) + '" cy="60" r="5"/><circle cx="' + (TREE_X + 14) + '" cy="56" r="5"/><circle cx="' + (TREE_X + 4) + '" cy="76" r="5"/><circle cx="' + (TREE_X - 22) + '" cy="76" r="4.5"/><circle cx="' + (TREE_X + 24) + '" cy="70" r="4.5"/></g>' +
      /* 地面小水洼 ×2（春雨意象） */
      '<ellipse cx="60" cy="158" rx="26" ry="7" fill="#BCD9EA" opacity=".8"/><ellipse cx="256" cy="150" rx="20" ry="6" fill="#BCD9EA" opacity=".7"/>' +
      '<g stroke="#57B368" stroke-width="2.5" stroke-linecap="round"><path d="M180 152 v-8 M184 152 v-8 M188 152 v-8"/></g>';
  } else if (season === 'summer') {
    deco =
      /* 大太阳+光线（右上） */
      '<circle cx="312" cy="36" r="20" fill="#F5C445" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M312 8 v-6 M312 64 v6 M284 36 h-6 M340 36 h6 M292 16 l-5 -5 M332 56 l5 5 M332 16 l5 -5 M292 56 l-5 5" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round"/>' +
      /* 小白云 ×1 */
      '<g fill="#FFF" stroke="' + INK + '" stroke-width="2.5"><ellipse cx="52" cy="28" rx="20" ry="12"/><ellipse cx="70" cy="23" rx="14" ry="9"/></g>' +
      /* 树：树干+浓绿大冠（双圆叠） */
      '<rect x="' + (TREE_X - 6) + '" y="88" width="12" height="40" rx="4" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="' + TREE_X + '" cy="66" r="36" fill="#57B368" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="' + (TREE_X - 20) + '" cy="80" r="17" fill="#57B368" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="' + (TREE_X + 20) + '" cy="80" r="17" fill="#57B368" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="' + (TREE_X - 10) + '" cy="58" r="6" fill="#8FD08A" opacity=".9"/><circle cx="' + (TREE_X + 12) + '" cy="70" r="6" fill="#8FD08A" opacity=".9"/>' +
      /* 地面小草 ×3 撮 */
      '<g stroke="#4E9E4E" stroke-width="2.5" stroke-linecap="round"><path d="M186 154 v-9 M190 154 v-9 M194 154 v-9"/><path d="M258 148 v-8 M262 148 v-8 M266 148 v-8"/></g>' +
      '<circle cx="222" cy="150" r="7" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/><circle cx="228" cy="146" r="4" fill="#57B368" stroke="' + INK + '" stroke-width="1.6"/>';
  } else if (season === 'autumn') {
    deco =
      /* 小太阳（远而淡）+风线 */
      '<circle cx="316" cy="30" r="13" fill="#F5D98C" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<path d="M36 44 q10 -8 20 0 M40 56 q8 -6 16 0" stroke="#D8CBB4" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
      /* 树：树干+橙红冠 */
      '<rect x="' + (TREE_X - 6) + '" y="88" width="12" height="40" rx="4" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="' + TREE_X + '" cy="68" r="34" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="' + (TREE_X - 19) + '" cy="80" r="15" fill="#D97C4A" stroke="' + INK + '" stroke-width="2.5"/>' +
      '<circle cx="' + (TREE_X + 19) + '" cy="80" r="15" fill="#D97C4A" stroke="' + INK + '" stroke-width="2.5"/>' +
      /* 飘落叶片 ×3（CSS 飘落循环） */
      '<g class="leaffall"><ellipse cx="150" cy="52" rx="6" ry="3.4" fill="#E8483C" stroke="' + INK + '" stroke-width="1.6" transform="rotate(24 150 52)"/></g>' +
      '<g class="leaffall l2"><ellipse cx="220" cy="40" rx="6" ry="3.4" fill="#E8975A" stroke="' + INK + '" stroke-width="1.6" transform="rotate(-30 220 40)"/></g>' +
      '<g class="leaffall l3"><ellipse cx="64" cy="120" rx="5.5" ry="3.2" fill="#D97C4A" stroke="' + INK + '" stroke-width="1.6" transform="rotate(40 64 120)"/></g>' +
      /* 地面落叶点 */
      '<g fill="#D97C4A" stroke="' + INK + '" stroke-width="1.4"><ellipse cx="180" cy="156" rx="6" ry="3" transform="rotate(-16 180 156)"/><ellipse cx="246" cy="150" rx="6" ry="3" transform="rotate(22 246 150)"/><ellipse cx="130" cy="162" rx="5.5" ry="2.8" transform="rotate(-30 130 162)"/></g>';
  } else { /* winter */
    deco =
      /* 光秃树枝（分叉裸枝） */
      '<path d="M' + TREE_X + ' 126 V74 M' + TREE_X + ' 96 L' + (TREE_X - 26) + ' 68 M' + TREE_X + ' 96 L' + (TREE_X + 28) + ' 66 M' + (TREE_X - 14) + ' 82 L' + (TREE_X - 30) + ' 74 M' + (TREE_X + 12) + ' 82 L' + (TREE_X + 26) + ' 72" stroke="#8A5A3C" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M' + TREE_X + ' 112 L' + (TREE_X + 20) + ' 96" stroke="#8A5A3C" stroke-width="5" stroke-linecap="round"/>' +
      /* 雪花 ×4（CSS 飘落循环；实心六线雪花） */
      '<g class="snow"><path d="M66 40 v14 M59 47 h14 M61 42 l10 10 M71 42 l-10 10" stroke="#9FBFD8" stroke-width="2.2" stroke-linecap="round"/></g>' +
      '<g class="snow s2"><path d="M150 34 v12 M144 40 h12 M146 36 l8 8 M154 36 l-8 8" stroke="#9FBFD8" stroke-width="2" stroke-linecap="round"/></g>' +
      '<g class="snow s3"><path d="M226 44 v12 M220 50 h12 M222 46 l8 8 M230 46 l-8 8" stroke="#9FBFD8" stroke-width="2" stroke-linecap="round"/></g>' +
      '<g class="snow s4"><path d="M282 26 v10 M277 31 h10 M279 28 l7 7 M286 28 l-7 7" stroke="#9FBFD8" stroke-width="1.8" stroke-linecap="round"/></g>' +
      /* 雪地：白地面+雪堆（覆盖感） */
      '<ellipse cx="120" cy="164" rx="52" ry="12" fill="#FFF" stroke="' + INK + '" stroke-width="2" opacity=".9"/>' +
      '<ellipse cx="256" cy="160" rx="40" ry="10" fill="#FFF" stroke="' + INK + '" stroke-width="2" opacity=".9"/>' +
      '<circle cx="212" cy="150" r="6" fill="#FFF" stroke="' + INK + '" stroke-width="2"/><circle cx="222" cy="146" r="4.5" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>';
  }
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="' + sky + '"/>' +
    '<path d="M0 148 q60 -10 130 -4 q90 8 150 -2 q60 -6 80 -2 V184 H0 Z" fill="' + gnd + '"/>' +
    deco + '</svg>';
}

/* ---------- 小兔季节衣着配件（叠在 KIDS.assets.rabbit 上层的 absolute SVG；hot 原样无配件）
   cold=红围巾 / cool=春浅蓝背心或秋橙马甲（随场景季节）/ hot=原样——场景线索 */
function rabbitAccSvg(season) {
  if (season === 'spring') {
    return '<svg viewBox="0 0 60 46" width="46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M7 6 L53 6 L55 30 Q30 42 5 30 Z" fill="#A8D8E8" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M30 6 L30 34" stroke="' + INK + '" stroke-width="1.8" opacity=".5"/></svg>';
  }
  if (season === 'autumn') {
    return '<svg viewBox="0 0 60 46" width="46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M7 6 L23 6 L30 16 L37 6 L53 6 L55 30 Q30 42 5 30 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<circle cx="24" cy="22" r="2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.4"/><circle cx="36" cy="22" r="2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="1.4"/></svg>';
  }
  if (season === 'winter') {
    return '<svg viewBox="0 0 60 52" width="46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M6 6 Q30 -2 54 6 L54 15 Q30 23 6 15 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
      '<path d="M9 10 Q30 17 51 10" stroke="#57B368" stroke-width="2.6" fill="none"/>' +
      '<path d="M38 18 L40 42 L50 40 L47 17 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M41 42 l-1 5 M45 41 l0 5 M48 40 l1 4" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
  return '';
}

/* ---------- 条件 chip 图标（64px 档）：温度带 3 + 场合 4（r4 双约束题面图形化） */
function bandChipHtml(band) {
  const sw = 'stroke="' + INK + '"';
  const deg = TEMPS[band].deg;
  let icon;
  if (band === 'cold') icon =
    '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g stroke="#9FC2D2" stroke-width="4" stroke-linecap="round">' +
    '<g transform="translate(32 32)"><path d="M0 -15 V15 M-13 -7.5 L13 7.5 M-13 7.5 L13 -7.5 M-15 0 H15"/></g>' +
    '<path d="M10 12 v4 M54 12 v4 M10 48 v4 M54 48 v4" stroke-width="2.6"/></g></svg>';
  else if (band === 'hot') icon =
    '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="12" fill="#F5C445" ' + sw + ' stroke-width="3"/>' +
    '<g stroke="#E8975A" stroke-width="3.6" stroke-linecap="round"><path d="M32 12 v-7 M52 32 h7 M46 18 l5 -5 M18 18 l-5 -5 M46 46 l5 5 M18 46 l-5 5 M32 52 v7 M12 32 h-7"/></g></svg>';
  else icon =
    '<svg viewBox="0 0 64 64" width="40" height="40" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<path d="M14 34 a12 11 0 0 1 24 -4 a9 8 0 0 1 12 7 a8 7 0 0 1 -2 14 L18 51 a8 7 0 0 1 -6 -11 a9 8 0 0 1 2 -6 Z" fill="#FFF" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 56 v-3 M30 58 v-3 M38 57 v-3" stroke="#7FB3D8" stroke-width="2.8" stroke-linecap="round"/></svg>';
  return icon + '<div class="bdeg"><span>' + deg + '</span><i>°</i></div>';
}
function occChipSvg(occ) {
  const sw = 'stroke="' + INK + '"';
  const open = '<svg viewBox="0 0 64 64" width="44" height="44" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">';
  if (occ === 'school') return open +
    '<rect x="14" y="24" width="36" height="30" rx="8" fill="#F2B8C6" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 34 q18 -18 36 0" fill="none" ' + sw + ' stroke-width="3"/>' +
    '<path d="M26 38 h12 v10 h-12 Z" fill="#FFF9EE" ' + sw + ' stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M32 38 v10" ' + sw + ' stroke-width="2"/></svg>';
  if (occ === 'sport') return open +
    '<circle cx="32" cy="32" r="20" fill="#FFF" ' + sw + ' stroke-width="3"/>' +
    '<path d="M32 12 v40 M12 32 h40 M18 18 l28 28 M46 18 l-28 28" stroke="#E8975A" stroke-width="2.6"/>' +
    '<path d="M32 12 a20 20 0 0 1 0 40 a20 20 0 0 1 0 -40 Z" fill="none" ' + sw + ' stroke-width="3"/>' +
    '<circle cx="32" cy="32" r="5" fill="#E8483C" ' + sw + ' stroke-width="2.2"/></svg>';
  if (occ === 'sleep') return open +
    '<path d="M40 12 a20 20 0 1 0 12 32 a16 16 0 0 1 -12 -32 Z" fill="#BCD9EA" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 18 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z" fill="#F5C445" ' + sw + ' stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M50 44 l1.6 3.2 3.4 1 -3.4 1 -1.6 3.2 -1.6 -3.2 -3.4 -1 3.4 -1 Z" fill="#F5C445" ' + sw + ' stroke-width="1.6" stroke-linejoin="round"/></svg>';
  /* party */
  return open +
    '<path d="M12 46 L32 14 L52 46 Z" fill="#9A7FC0" ' + sw + ' stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="20" y="46" width="24" height="8" rx="4" fill="#B49AD6" ' + sw + ' stroke-width="2.6"/>' +
    '<circle cx="32" cy="14" r="4" fill="#F5C445" ' + sw + ' stroke-width="2.2"/>' +
    '<path d="M8 24 q4 6 0 12 M56 20 q-4 6 0 12" stroke="#E8483C" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<circle cx="10" cy="20" r="2.4" fill="#F2B8C6"/><circle cx="55" cy="16" r="2.4" fill="#8FD08A"/></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 四季衣橱小衣架 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M22 10 a3.5 3.5 0 1 1 3.5 3.5 L25.5 17" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M14 19 L22 25 L30 19" stroke="#E8975A" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="10" y="27" width="24" height="4.5" rx="2.2" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="15" cy="37" r="1.8" fill="#57B368"/><circle cx="22" cy="37" r="1.8" fill="#E8483C"/><circle cx="29" cy="37" r="1.8" fill="#7FC8E8"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 13 l5.5 5.5 L20 6.5" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 「穿好啦」提交钮：小衣服+大对勾（多件套装题提交入口，weather v2 先例） */
  wear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M24 14 L12 21 L16 32 L21 30 L20 50 L44 50 L43 30 L48 32 L52 21 L40 14 L32 20 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M18 36 l7 7 15 -16" stroke="#6FA063" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
