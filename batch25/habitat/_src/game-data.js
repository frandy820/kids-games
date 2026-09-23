/* ================= habitat 动物家园 游戏数据（r4 难度改造版：习性与食物链推理）
   r4（2026-09-13，审计红款升级——「动物↔居所单配对=3-4 岁绘本常识」）：
   玩法框架保留（题面卡 + 4 候选卡点选、错反馈语义句、救援/存档/日历全不动），
   判定层从「单配对」升级为「习性与食物链推理」，配对知识做底座（ch1 热身 + ch4 混出）。
   题型六族（kind 字段；scenes[].kind 的取值空间随 kind 切换）：
     home   动物→环境配对（旧玩法底座）：home=环境 id，候选=环境卡（近环境对规则沿 v1）
     feed   食物链方向：「小兔子爱吃什么？」home=食物 id，候选=食物卡（candy 傻干扰恒在场）
     chain  链式推理（2 步传递）：题面给链事实（谁吃谁），up=「青草变多了，最后谁也会变多？」
            答案=链顶；down=「老鹰飞走了，谁会变多？」答案=链中；候选=链外动物
            （up 型干扰禁 food==base——草食干扰会造成双正确；链外且与基食物无关）
     hib    冬眠判断（正/反两型）：sleep=「谁要睡长觉？」答案∈冬眠集；awake=「谁不睡？」
            答案∉冬眠集；候选=动物卡
     struct 结构-功能推断：「脚上有蹼的动物，会做什么？」候选=能力 4 全集，答案=功能
     dual   多条件交集（ch3 核心）：「既会游泳、冬天又要睡长觉的，是谁？」候选=动物卡，
            双干扰必在场=只满足 A 的 + 只满足 B 的（照 shapecount r3 dual 先例）
   章型（4 章；flat0 题0 恒 home fish→pond——教学演示锚点「送小鱼回池塘」不动）：
     dch1 谁吃什么：[home×1, feed×3, chain×1]（home=热身底座）
     dch2 冬天的秘密：[hib, struct, hib, struct, hib]（hib 正反交替）
     dch3 两个条件：[dual×5]（5 对条件每关全覆盖一次）
     dch4 大挑战：[home, feed, chain|struct(掷), hib, dual]（≥5 型在场，dual 恒 ≥1）
   动物封闭 24（v1 15 + r4 新 9），每动物习性标签：home 唯一主环境 / diet(herb|carn|omni) /
   hib 冬眠 / swim 会游泳(生活在水里) / egg 下蛋(卵生) / fly 会飞 / food 它吃什么
   （food=null 不做 feed 题面——母鸡/小猪/小蛇/小乌龟/小鱼食性对 6-7 岁不唯一）。
   环境封闭 7 + 近环境对 3 对沿 v1；食物封闭 6 / 链封闭 4 / 特征封闭 4 / 冬眠集封闭 4 /
   交集对封闭 5——verify 从 SPEC 独立重列对账。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 环境 7 封闭表：id → 中文名（home 题候选空间） */
const ENV = {
  forest:    { n: '森林' },
  grassland: { n: '草原' },
  ocean:     { n: '海洋' },
  desert:    { n: '沙漠' },
  pond:      { n: '池塘' },
  sky:       { n: '天空' },
  farm:      { n: '农场' }
};
const ALL7 = Object.keys(ENV);                          // 封闭 7 集
const NEAR = { pond: 'ocean', ocean: 'pond',            // 近环境对封闭 3 对（双向）
               grassland: 'desert', desert: 'grassland',
               forest: 'farm', farm: 'forest' };
const nameOfEnv = e => ENV[e].n;

/* ---------- 动物封闭表 24（v1 15 + r4 新 9）：习性标签族
   n 名 / home 唯一主环境 / act home 确认句动作 / diet 食性(herb 食草|carn 食肉|omni 杂食)
   hib 冬眠 / swim 会游泳(生活在水里) / egg 下蛋 / fly 会飞 / food 它吃什么(null=不出 feed 题) */
const ANIMALS = {
  fish:       { n: '小鱼',   home: 'pond',      act: '游来游去',    diet: 'carn', hib: false, swim: true,  egg: true,  fly: false, food: null },
  frog:       { n: '小青蛙', home: 'pond',      act: '呱呱地唱歌',  diet: 'carn', hib: true,  swim: true,  egg: true,  fly: false, food: 'bug' },
  bird:       { n: '小鸟',   home: 'sky',       act: '飞来飞去',    diet: 'carn', hib: false, swim: false, egg: true,  fly: true,  food: 'bug' },
  hen:        { n: '母鸡',   home: 'farm',      act: '咕咕哒下蛋',  diet: 'omni', hib: false, swim: false, egg: true,  fly: false, food: null },
  pig:        { n: '小猪',   home: 'farm',      act: '打滚玩泥巴',  diet: 'omni', hib: false, swim: false, egg: false, fly: false, food: null },
  rabbit:     { n: '小兔子', home: 'forest',    act: '蹦蹦跳跳',    diet: 'herb', hib: false, swim: false, egg: false, fly: false, food: 'grass' },
  lion:       { n: '狮子',   home: 'grassland', act: '晒着太阳',    diet: 'carn', hib: false, swim: false, egg: false, fly: false, food: 'meat' },
  elephant:   { n: '大象',   home: 'grassland', act: '甩着长鼻子',  diet: 'herb', hib: false, swim: false, egg: false, fly: false, food: 'grass' },
  zebra:      { n: '斑马',   home: 'grassland', act: '快乐地奔跑',  diet: 'herb', hib: false, swim: false, egg: false, fly: false, food: 'grass' },
  monkey:     { n: '小猴子', home: 'forest',    act: '荡来荡去',    diet: 'omni', hib: false, swim: false, egg: false, fly: false, food: 'fruit' },
  woodpecker: { n: '啄木鸟', home: 'forest',    act: '笃笃笃敲树干', diet: 'carn', hib: false, swim: false, egg: true,  fly: true,  food: 'bug' },
  dolphin:    { n: '海豚',   home: 'ocean',     act: '跳出海面',    diet: 'carn', hib: false, swim: true,  egg: false, fly: false, food: 'fish' },
  whale:      { n: '大鲸鱼', home: 'ocean',     act: '喷着大水柱',  diet: 'carn', hib: false, swim: true,  egg: false, fly: false, food: 'fish' },
  camel:      { n: '骆驼',   home: 'desert',    act: '慢慢地走路',  diet: 'herb', hib: false, swim: false, egg: false, fly: false, food: 'grass' },
  scorpion:   { n: '蝎子',   home: 'desert',    act: '藏进沙子里',  diet: 'carn', hib: false, swim: false, egg: true,  fly: false, food: 'bug' },
  /* ---- r4 新 9（标签组合服务推理题型）---- */
  bear:       { n: '小熊',   home: 'forest',    act: '冬天睡大觉',  diet: 'omni', hib: true,  swim: false, egg: false, fly: false, food: 'fish' },
  snake:      { n: '小蛇',   home: 'grassland', act: '蜷成一团',    diet: 'carn', hib: true,  swim: false, egg: true,  fly: false, food: null },
  turtle:     { n: '小乌龟', home: 'pond',      act: '慢慢地爬',    diet: 'omni', hib: true,  swim: true,  egg: true,  fly: false, food: null },
  fox:        { n: '狐狸',   home: 'forest',    act: '悄悄地走',    diet: 'carn', hib: false, swim: false, egg: false, fly: false, food: 'meat' },
  eagle:      { n: '老鹰',   home: 'sky',       act: '在天上盘旋',  diet: 'carn', hib: false, swim: false, egg: true,  fly: true,  food: 'meat' },
  duck:       { n: '小鸭子', home: 'pond',      act: '摇摇摆摆走',  diet: 'omni', hib: false, swim: true,  egg: true,  fly: true,  food: null },
  squirrel:   { n: '小松鼠', home: 'forest',    act: '抱着松果啃',  diet: 'herb', hib: false, swim: false, egg: false, fly: false, food: 'fruit' },
  cow:        { n: '奶牛',   home: 'farm',      act: '哞哞地叫',    diet: 'herb', hib: false, swim: false, egg: false, fly: false, food: 'grass' },
  tiger:      { n: '老虎',   home: 'forest',    act: '悄悄地扑',    diet: 'carn', hib: false, swim: false, egg: false, fly: false, food: 'meat' }
};
const ALL24 = Object.keys(ANIMALS);                     // 封闭 24 动物
const COMMON_POOL = ['fish', 'frog', 'bird', 'hen', 'pig', 'rabbit'];   // ch1 home 热身池（沿 v1 常见 6）
const COMMON_ENVS = ['pond', 'sky', 'farm', 'forest'];                  // 常见动物的环境集（home 热身 4 全集）
const FEED_POOL = ALL24.filter(a => ANIMALS[a].food);                   // feed 题面池 18（food≠null）
const HIB_LIST = ALL24.filter(a => ANIMALS[a].hib);                     // 冬眠集封闭 4：bear/snake/turtle/frog
const NOHIB_LIST = ALL24.filter(a => !ANIMALS[a].hib);                  // 不冬眠 20
const nameOfAnimal = a => ANIMALS[a].n;

/* ---------- 食物封闭 6（feed 题候选空间）：id → 中文名
   candy=果冻傻干扰（无动物吃，恒在场——击败「挑健康的」纯猜测启发式） */
const FOOD = {
  grass: { n: '青草' }, meat: { n: '肉' },   bug: { n: '小虫' },
  fish:  { n: '小鱼' }, fruit: { n: '果子' }, candy: { n: '果冻' }
};
const FOOD_KEYS = Object.keys(FOOD);
const nameOfFood = f => FOOD[f].n;

/* ---------- 食物链封闭 4（chain 题）：base 被吃 → mid → top（top 吃 mid，mid 吃 base）
   四链 12 个动物位互异（链内干扰选取干净）；up 型干扰排除 food==base 的动物 */
const CHAINS = [
  { id: 'c1', base: 'grass', mid: 'rabbit', top: 'eagle' },
  { id: 'c2', base: 'grass', mid: 'zebra',  top: 'lion' },
  { id: 'c3', base: 'bug',   mid: 'frog',   top: 'snake' },
  { id: 'c4', base: 'fruit', mid: 'monkey', top: 'tiger' }
];
const chainById = id => CHAINS.filter(c => c.id === id)[0] || null;
const leavesBy = a => (ANIMALS[a].home === 'sky' ? '飞' : '走');   // 链顶离开动词（鹰飞/其余走）

/* ---------- 能力封闭 4 + 结构-功能封闭 4（struct 题）
   候选=能力 4 全集（封闭宇宙点选）；feat 特征 → abil 功能（形态特征推功能） */
const ABILITY = {
  swim: { n: '会游泳' }, fly: { n: '会飞' }, run: { n: '跑得快' }, dig: { n: '会挖洞' }
};
const ABILITY_KEYS = Object.keys(ABILITY);
const STRUCTS = {
  web:   { feat: '脚上有蹼',       short: '有蹼',   abil: 'swim', q: '脚上有蹼的动物，会做什么？' },
  wing:  { feat: '身上有翅膀',     short: '有翅膀', abil: 'fly',  q: '有翅膀的动物，会做什么？' },
  legs:  { feat: '腿长长的又有力', short: '长腿',   abil: 'run',  q: '腿长长的动物，最会做什么？' },
  claws: { feat: '有尖尖的爪子',   short: '有尖爪', abil: 'dig',  q: '有尖尖爪子的动物，爱做什么？' }
};

/* ---------- 条件谓词（dual 题）+ 交集对封闭 5
   每对 a/b 条件（谓词独立于生成器，verify 从 SPEC 重列同构判）；
   手验各对 answer(双满足)/onlyA/onlyB/never 四集均非空 */
const CONDS = {
  swim:   { t: a => ANIMALS[a].swim,  text: '会游泳' },
  hib:    { t: a => ANIMALS[a].hib,   text: '冬天睡长觉' },
  egg:    { t: a => ANIMALS[a].egg,   text: '会下蛋' },
  nowegg: { t: a => !ANIMALS[a].egg,  text: '不下蛋' },
  water:  { t: a => ANIMALS[a].home === 'pond' || ANIMALS[a].home === 'ocean', text: '住在水里' },
  farm:   { t: a => ANIMALS[a].home === 'farm', text: '住在农场' },
  herb:   { t: a => ANIMALS[a].diet === 'herb', text: '爱吃草' }
};
const DUALS = [
  { id: 'swim_hib',    a: 'swim', b: 'hib',
    q: '既会游泳、冬天又要睡长觉的，是谁？', c: n => '对啦，' + n + '会游泳又冬眠' },
  { id: 'water_nowegg', a: 'water', b: 'nowegg',
    q: '住在水里、可是不下蛋的，是谁？', c: n => '对啦，' + n + '住在水里不下蛋' },
  { id: 'hib_egg',     a: 'hib',  b: 'egg',
    q: '冬天睡长觉、又会下蛋的，是谁？', c: n => '对啦，' + n + '冬眠又会下蛋' },
  { id: 'swim_egg',    a: 'swim', b: 'egg',
    q: '会游泳、又会下蛋的，是谁？', c: n => '对啦，' + n + '会游泳又下蛋' },
  { id: 'farm_herb',   a: 'farm', b: 'herb',
    q: '住在农场、又爱吃草的，是谁？', c: n => '对啦，' + n + '住农场又爱吃草' }
];
const dualById = id => DUALS.filter(d => d.id === id)[0] || null;

/* ---------- 题面句 / 确认句（TTS 拼句——SPEC §3 豁免 §0.24 题面 clip 化，动态名不入 clip 集）
   确认句上限分型（r4 审查 m-10 勘误：原「全 ≤14」与括号内 15 字实测自相矛盾）：home 型
   ≤15 字（v1 界，最长 15 字句 SAPI 实测 4899ms）/ 新题型 ≤14 字——判对演出窗 5400
   ≥ 4899+300=5199 兜住全型（时序分账见 SPEC r4 块；verify ⑮ 钉死该不变量） */
const quizText = q => {
  if (q.kind === 'feed')  return ANIMALS[q.animal].n + '爱吃什么？';
  if (q.kind === 'chain') {
    const c = chainById(q.chain);
    if (q.dir === 'up') return ANIMALS[c.top].n + '会吃' + ANIMALS[c.mid].n + '，' +
      ANIMALS[c.mid].n + '爱吃' + FOOD[c.base].n + '。' + FOOD[c.base].n + '变多了，最后谁也会变多？';
    return ANIMALS[c.top].n + leavesBy(c.top) + '了，谁会变多？';
  }
  if (q.kind === 'hib')   return q.dir === 'sleep' ? '冬天到了，谁要睡很长很长的一觉？'
                                                   : '冬天到了，谁不睡长觉，还出来找吃的？';
  if (q.kind === 'struct')return STRUCTS[q.feat].q;
  if (q.kind === 'dual')  return dualById(q.pair).q;
  return ANIMALS[q.animal].n + '的家在哪里？';            // home
};
const confirmText = q => {
  if (q.kind === 'feed')  return ANIMALS[q.animal].n + '爱吃' + nameOfFood(q.home);
  if (q.kind === 'chain') {
    const c = chainById(q.chain);
    if (q.dir === 'up') return '对啦，' + FOOD[c.base].n + '多了，' + ANIMALS[c.top].n + '也会变多';
    return '对啦，' + ANIMALS[c.top].n + leavesBy(c.top) + '了，' + ANIMALS[c.mid].n + '变多啦';
  }
  if (q.kind === 'hib')   return q.dir === 'sleep' ? '对啦，' + ANIMALS[q.home].n + '冬天要睡长觉'
                                                   : '对啦，' + ANIMALS[q.home].n + '冬天不睡长觉';
  if (q.kind === 'struct')return '对啦，' + STRUCTS[q.feat].short + '的动物' + ABILITY[q.home].n;
  if (q.kind === 'dual')  return dualById(q.pair).c(ANIMALS[q.home].n);
  return ANIMALS[q.animal].n + '住在' + nameOfEnv(ANIMALS[q.animal].home) + '里，' + ANIMALS[q.animal].act;
};

/* ---------- T46 阶段2：题面/确认 clip 键构造（与 gen_clips.py T46 注册 133 键全一致；
   题面 home/feed=名段+骨架段 2 段链，chain/hib/struct/dual=整句单键（hab_st_ 19）；
   确认 home=[名,住在,环境,里，,动作] 5 段链 / feed=[名,爱吃,食物] 3 段 /
   hib=[对啦，,名,冬眠句] 3 段 / dual=[对啦，,名,条件句] 3 段 /
   chain/struct=整句单键（hab_cf_ 12）——全段键化，链尾恒有键 ---------- */
const quizKeys = q => {
  if (q.kind === 'home') return [{ key: 'hab_an_' + q.animal, text: ANIMALS[q.animal].n },
                                 { key: 'hab_s_homeq', text: '的家在哪里？' }];
  if (q.kind === 'feed') return [{ key: 'hab_an_' + q.animal, text: ANIMALS[q.animal].n },
                                 { key: 'hab_s_aq', text: '爱吃什么？' }];
  if (q.kind === 'chain') {
    const c = chainById(q.chain);
    return [{ key: 'hab_st_' + q.dir + '_' + [c.base, c.mid, c.top].join('_'), text: quizText(q) }];
  }
  if (q.kind === 'hib')   return [{ key: 'hab_st_hib_' + q.dir, text: quizText(q) }];
  if (q.kind === 'struct')return [{ key: 'hab_st_struct_' + q.feat, text: quizText(q) }];
  return [{ key: 'hab_st_dual_' + q.pair, text: quizText(q) }];
};
const confirmKeys = q => {
  if (q.kind === 'home') {
    const a = ANIMALS[q.animal];
    return [{ key: 'hab_an_' + q.animal, text: a.n },
            { key: 'hab_s_zhu', text: '住在' },
            { key: 'hab_ev_' + a.home, text: nameOfEnv(a.home) },
            { key: 'hab_s_li', text: '里，' },
            { key: 'hab_act_' + q.animal, text: a.act }];
  }
  if (q.kind === 'feed') return [{ key: 'hab_an_' + q.animal, text: ANIMALS[q.animal].n },
                                 { key: 'hab_s_aichi', text: '爱吃' },
                                 { key: 'hab_fd_' + q.home, text: nameOfFood(q.home) }];
  if (q.kind === 'chain') {
    const c = chainById(q.chain);
    return [{ key: 'hab_cf_' + q.dir + '_' + [c.base, c.mid, c.top].join('_'), text: confirmText(q) }];
  }
  if (q.kind === 'hib') return [{ key: 'hab_s_dui', text: '对啦，' },
                                 { key: 'hab_an_' + q.home, text: ANIMALS[q.home].n },
                                 { key: q.dir === 'sleep' ? 'hab_s_hib1' : 'hab_s_hib2',
                                   text: q.dir === 'sleep' ? '冬天要睡长觉' : '冬天不睡长觉' }];
  if (q.kind === 'struct')return [{ key: 'hab_cf_struct_' + q.feat, text: confirmText(q) }];
  return [{ key: 'hab_s_dui', text: '对啦，' },
          { key: 'hab_an_' + q.home, text: ANIMALS[q.home].n },
          { key: 'hab_dq_' + q.pair, text: dualById(q.pair).c('').slice(4) }];
};

/* ---------- T46 阶段2 clip 实长表（mp3 实测 ms；verify ±60ms 运行时辨别器防表过期）；
   判对窗按 max(estMs 窗 5400, 链实长+PAD) 动态补足——home 5 段链最长 8232 超 5400（calendar/shapecount 先例） ---------- */
const HAB_MS = {
  an: {bear:1440, bird:1440, camel:1344, cow:1344, dolphin:1368, duck:1632, eagle:1344, elephant:1368, fish:1416, fox:1368, frog:1632, hen:1344, lion:1416, monkey:1560, pig:1440, rabbit:1584, scorpion:1416, snake:1440, squirrel:1704, tiger:1392, turtle:1560, whale:1560, woodpecker:1584, zebra:1320},
  ev: {desert:1440, farm:1392, forest:1464, grassland:1368, ocean:1344, pond:1368, sky:1416},
  fd: {bug:1440, candy:1320, fish:1416, fruit:1320, grass:1416, meat:1152},
  act: {bear:1992, bird:1824, camel:1872, cow:1680, dolphin:1800, duck:1968, eagle:2040, elephant:2040, fish:1728, fox:1752, frog:1896, hen:1896, lion:1776, monkey:1752, pig:1872, rabbit:1752, scorpion:2040, snake:1776, squirrel:1920, tiger:1752, turtle:1680, whale:1920, woodpecker:2136, zebra:1872},
  dq: {farm_herb:2544, hib_egg:2160, swim_egg:2160, swim_hib:2160, water_nowegg:2232},
  s: {aichi:1416, dui:1320, hib1:2232, hib2:2184, li:1104, zhu:1344},
  cf: {'dn_bug_frog_snake':3888, 'dn_fruit_monkey_tiger':3792, 'dn_grass_rabbit_eagle':3888,
       'dn_grass_zebra_lion':3672, 'struct_claws':3264, 'struct_legs':3000,
       'struct_web':2976, 'struct_wing':2952, 'up_bug_frog_snake':3960,
       'up_fruit_monkey_tiger':3792, 'up_grass_rabbit_eagle':3864, 'up_grass_zebra_lion':3912}
};
const chainMs = parts => parts.reduce((s, p) => {
  const i = p.key.indexOf('_', 4);                       /* hab_<grp>_<id> → grp=id 切分 */
  const grp = p.key.slice(4, i), id = p.key.slice(i + 1);
  return s + (grp === 's' ? HAB_MS.s[id] : HAB_MS[grp][id]);
}, 0) + 150 * (parts.length - 1);
const CONFIRM_PAD = 300;                        /* 判对窗对确认链实长的落定余量（calendar 先例） */

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 dch=ri(1,4) 随机章参数）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言） */
const CHAPTERS = {
  1: { name: '谁吃什么',   hint: '谁冬天要睡长觉，马上见分晓' },  // 预告 ch2 冬眠+结构
  2: { name: '冬天的秘密', hint: '接下来要一次想两件事哦' },      // 预告 ch3 多条件交集
  3: { name: '两个条件',   hint: '各种问题混在一起，大挑战来啦' }, // 预告 ch4 混合
  4: { name: '大挑战',     hint: '新一轮动物大挑战来啦' }         // 预告生成关
};
const GEN_HINTS = ['送小动物回家，再想想谁吃什么',   // dch1 谁吃什么
                   '冬天谁睡觉，谁有什么本领',       // dch2 冬眠+结构
                   '两个条件都要满足哦',             // dch3 多条件交集
                   '什么都可能问，想好再点'];        // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   四包装 watch/turn/hint/right（v1 不动）；错反馈 home 题=WVOICE 按所点环境（7 条沿 v1），
   新题型=HINT_VOICE/WVOICE_KIND 按题型选播（r4 新增 10 条：hint 5 + w 5）；
   题面/确认句=TTS 拼句。clip 实测长（2026-09-13 浏览器 new Audio(dataURI)）：
   hab_hint_feed 2280 / chain 2640 / hib 2664 / struct 2712 / dual 2544——hint 系 fire-and-forget；
   hab_w_feed 2016 / chain 3024 / hib 3168 / struct 2592 / dual 3384——w 系在 1000ms 防重入窗
   内可被对选打断=容忍（沿 v1 hab_w_* 3528-4440 同口径，错反馈已播 ≥1000ms） */
const VOICE = {
  watch: { key: 'hab_tut_watch', text: '看！送小动物回家' },
  turn:  { key: 'hab_tut_turn',  text: '你来送一送' },
  hint:  { key: 'hab_hint',      text: '想想它住在哪里' },
  right: { key: 'hab_right',     text: '到家啦，真开心' }
};
const WVOICE = {
  forest:    { key: 'hab_w_forest',    text: '森林里有好多大树，它不住在这里哦' },
  grassland: { key: 'hab_w_grassland', text: '草原上一望无际，它不住在这里哦' },
  ocean:     { key: 'hab_w_ocean',     text: '大海全是咸咸的海水，它不住在这里哦' },
  desert:    { key: 'hab_w_desert',    text: '沙漠里又干又热没有水，它不住在这里哦' },
  pond:      { key: 'hab_w_pond',      text: '池塘的水太少啦，它不住在这里哦' },
  sky:       { key: 'hab_w_sky',       text: '天上飞不到底，它不住在这里哦' },
  farm:      { key: 'hab_w_farm',      text: '农场是家养动物的地方，它不住在这里哦' }
};
/* r4 题型化 hint（兔子按钮/空白探索按当前题 kind 选播；home 用 VOICE.hint） */
const HINT_VOICE = {
  feed:   { key: 'hab_hint_feed',   text: '想想它爱吃什么' },
  chain:  { key: 'hab_hint_chain',  text: '顺着想，谁吃谁' },
  hib:    { key: 'hab_hint_hib',    text: '想想冬天谁在睡觉' },
  struct: { key: 'hab_hint_struct', text: '想想这个特点有什么用' },
  dual:   { key: 'hab_hint_dual',   text: '两个条件都要满足哦' }
};
/* r4 题型化错反馈（非 home 题：反馈绑定题型非所点候选；home 题沿 v1 绑所点环境） */
const WVOICE_KIND = {
  feed:   { key: 'hab_w_feed',   text: '它不爱吃这个哦' },
  chain:  { key: 'hab_w_chain',  text: '再顺着想一遍，谁吃谁' },
  hib:    { key: 'hab_w_hib',    text: '再想想，冬天谁在睡觉' },
  struct: { key: 'hab_w_struct', text: '再看看这个身体特点' },
  dual:   { key: 'hab_w_dual',   text: '再看看，两个条件都要满足' }
};

/* ---------- 动物 SVG（viewBox 0 0 120 120；家族暖卡通风：INK 描边+暖填充+腮红）
   24 只互异可一眼辨识（物种辨识度优先，装饰从简；r4 新 9 标签组合可推理） */
const SUN = (cx, cy, r) => '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="#F5C445" stroke="' + INK + '" stroke-width="2.5"/>';
const CHEEK = (x, y) => '<ellipse cx="' + x + '" cy="' + y + '" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>';
const EYE = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="4.2" fill="' + INK + '"/>';

const ANIMAL_ELS = {
  fish: '<ellipse cx="60" cy="76" rx="20" ry="10" fill="#FBD9A8"/>' +
    '<path d="M92 62 L112 44 L107 62 L112 80 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M58 40 q12 -12 24 -4 q-10 4 -14 14 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="58" cy="64" rx="36" ry="23" fill="#F5A24B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="42" cy="58" r="5.5" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="44" cy="58.5" r="2.4" fill="' + INK + '"/>' +
    '<path d="M32 70 q6 5 12 1" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    CHEEK(52, 72) +
    '<circle cx="24" cy="34" r="4" fill="#BFE3F2"/><circle cx="17" cy="22" r="2.6" fill="#BFE3F2"/>',
  frog: '<ellipse cx="42" cy="40" r="12" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="78" cy="40" r="12" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="42" cy="38" r="5" fill="#FFF" stroke="' + INK + '" stroke-width="1.8"/><circle cx="42" cy="39" r="2.4" fill="' + INK + '"/>' +
    '<circle cx="78" cy="38" r="5" fill="#FFF" stroke="' + INK + '" stroke-width="1.8"/><circle cx="78" cy="39" r="2.4" fill="' + INK + '"/>' +
    '<ellipse cx="60" cy="76" rx="35" ry="26" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="86" rx="21" ry="11" fill="#DDEDC8"/>' +
    '<path d="M42 74 q18 13 36 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="49" cy="74" r="2" fill="' + INK + '"/><circle cx="71" cy="74" r="2" fill="' + INK + '"/>' +
    CHEEK(34, 82) + CHEEK(86, 82) +
    '<path d="M34 100 q4 8 0 10 M86 100 q-4 8 0 10" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  bird: '<path d="M88 60 L108 50 L102 68 Z" fill="#4E8FD0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M62 32 q3 -12 11 -11 q-1 9 3 12 Z" fill="#6FA8DC" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="58" cy="66" r="34" fill="#6FA8DC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M56 62 q28 -8 32 12 q-20 9 -33 -1 Z" fill="#4E8FD0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="40" cy="56" r="5.5" fill="#FFF" stroke="' + INK + '" stroke-width="2"/><circle cx="41.5" cy="56.5" r="2.4" fill="' + INK + '"/>' +
    '<path d="M28 66 L10 71 L28 77 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    CHEEK(46, 74),
  hen: '<path d="M90 58 q20 -8 16 -26 q-18 2 -21 18 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="34" cy="27" r="5" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="42" cy="23" r="5.5" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="50" cy="27" r="5" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<ellipse cx="62" cy="70" rx="33" ry="27" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M62 60 q22 -5 27 13 q-18 9 -29 0 Z" fill="#EADFC8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="40" cy="46" r="17" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="25" cy="56" rx="4" ry="6" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M25 46 L11 51 L25 56 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    EYE(38, 43) + CHEEK(48, 52) +
    '<path d="M52 96 v10 M72 96 v10" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round"/>',
  pig: '<path d="M32 50 l-7 -15 15 4 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M88 50 l7 -15 -15 4 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="72" rx="35" ry="27" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M94 68 q12 -3 9 -13 q-2 -7 -9 -3" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    EYE(44, 58) + EYE(76, 58) +
    '<ellipse cx="60" cy="74" rx="13" ry="9" fill="#E897A8" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="55" cy="74" r="2.2" fill="' + INK + '"/><circle cx="65" cy="74" r="2.2" fill="' + INK + '"/>' +
    '<rect x="44" y="94" width="11" height="12" rx="4" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="65" y="94" width="11" height="12" rx="4" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3"/>',
  rabbit: '<ellipse cx="44" cy="28" rx="10" ry="25" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(-10 44 28)"/>' +
    '<ellipse cx="44" cy="30" rx="4.5" ry="16" fill="#F2B8C6" transform="rotate(-10 44 30)"/>' +
    '<ellipse cx="76" cy="26" rx="10" ry="26" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(13 76 26)"/>' +
    '<ellipse cx="76" cy="28" rx="4.5" ry="17" fill="#F2B8C6" transform="rotate(13 76 28)"/>' +
    '<ellipse cx="60" cy="98" rx="27" ry="12" fill="#EFE3CD"/>' +
    '<circle cx="60" cy="70" r="38" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE(47, 64) + EYE(73, 64) +
    '<ellipse cx="54" cy="78" rx="3" ry="2.2" fill="#D98A8A"/><ellipse cx="66" cy="78" rx="3" ry="2.2" fill="#D98A8A"/>' +
    '<path d="M56 84 q4 4 8 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(36, 76) + CHEEK(84, 76),
  lion: '<circle cx="30" cy="26" r="10" fill="#C9803A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="90" cy="26" r="10" fill="#C9803A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="60" r="43" fill="#C9803A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="60" r="30" fill="#F5CB5C" stroke="' + INK + '" stroke-width="3"/>' +
    EYE(48, 54) + EYE(72, 54) +
    '<path d="M54 66 l6 6 l6 -6 Z" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M54 76 q6 5 12 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(38, 68) + CHEEK(82, 68) +
    '<path d="M40 46 q-8 -4 -12 2 M80 46 q8 -4 12 2" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  elephant: '<ellipse cx="22" cy="54" rx="13" ry="19" fill="#9FB8D9" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="98" cy="54" rx="13" ry="19" fill="#9FB8D9" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="22" cy="54" rx="6" ry="11" fill="#C9D8EE"/>' +
    '<ellipse cx="98" cy="54" rx="6" ry="11" fill="#C9D8EE"/>' +
    '<ellipse cx="60" cy="60" rx="36" ry="34" fill="#9FB8D9" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M60 68 q0 22 -6 30 q-5 6 -12 3" stroke="' + INK + '" stroke-width="11" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 68 q0 22 -6 30 q-5 6 -12 3" stroke="#9FB8D9" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    EYE(46, 52) + EYE(74, 52) +
    '<path d="M48 82 q-6 7 -13 5 M72 82 q6 7 13 5" stroke="#FFF" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    CHEEK(38, 66) + CHEEK(82, 66),
  zebra: '<ellipse cx="38" cy="26" rx="9" ry="15" fill="#FFF" stroke="' + INK + '" stroke-width="3" transform="rotate(-14 38 26)"/>' +
    '<ellipse cx="82" cy="26" rx="9" ry="15" fill="#FFF" stroke="' + INK + '" stroke-width="3" transform="rotate(14 82 26)"/>' +
    '<ellipse cx="60" cy="72" rx="33" ry="27" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="48" r="28" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M60 20 q-18 2 -16 15 q10 -7 16 -5 q6 -2 16 5 q2 -13 -16 -15 Z" fill="' + INK + '"/>' +
    EYE(48, 44) + EYE(72, 44) +
    '<ellipse cx="60" cy="60" rx="11" ry="8" fill="#C9C2B8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="56" cy="59" r="1.8" fill="' + INK + '"/><circle cx="64" cy="59" r="1.8" fill="' + INK + '"/>' +
    '<path d="M34 66 q6 8 2 18 M86 66 q-6 8 -2 18 M52 96 q2 6 -2 10 M68 96 q-2 6 2 10" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round"/>',
  monkey: '<circle cx="24" cy="58" r="11" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="24" cy="58" r="5.5" fill="#F7E7CF"/>' +
    '<circle cx="96" cy="58" r="11" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="96" cy="58" r="5.5" fill="#F7E7CF"/>' +
    '<circle cx="60" cy="62" r="36" fill="#B98A5C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="54" r="19" fill="#F7E7CF"/>' +
    '<ellipse cx="60" cy="80" rx="23" ry="16" fill="#F7E7CF"/>' +
    EYE(52, 50) + EYE(68, 50) +
    '<circle cx="56" cy="72" r="1.8" fill="' + INK + '"/><circle cx="64" cy="72" r="1.8" fill="' + INK + '"/>' +
    '<path d="M52 80 q8 6 16 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M56 24 q2 -12 9 -11 q-2 9 2 12 Z" fill="' + INK + '"/>' +
    CHEEK(42, 60) + CHEEK(78, 60),
  woodpecker: '<path d="M60 92 l-7 22 h14 Z" fill="' + INK + '"/>' +
    '<ellipse cx="60" cy="64" rx="25" ry="35" fill="#F5F1E6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M60 36 q-26 8 -22 36 q18 -5 25 -24 Z" fill="#4A3B2E"/>' +
    '<circle cx="60" cy="32" r="17" fill="#E8483C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M46 34 L14 40 L46 44 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="52" cy="30" r="4.2" fill="#FFF" stroke="' + INK + '" stroke-width="2"/><circle cx="53" cy="30.5" r="2" fill="' + INK + '"/>' +
    '<path d="M50 110 h26" stroke="#8A7B6C" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M54 106 v6 M66 106 v6" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    CHEEK(66, 42),
  dolphin: '<path d="M58 44 q6 -22 25 -13 q-12 7 -12 18 Z" fill="#7FB3D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M18 68 Q2 56 7 44 q8 11 15 13 q-2 7 -4 11 Z" fill="#7FB3D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M16 68 Q38 34 76 44 Q102 52 104 70 Q86 86 58 86 Q30 86 16 68 Z" fill="#7FB3D9" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M26 74 Q52 84 86 74 Q66 80 26 74 Z" fill="#DDEBF7"/>' +
    '<circle cx="34" cy="60" r="4.2" fill="#FFF" stroke="' + INK + '" stroke-width="2"/><circle cx="35" cy="60.5" r="2" fill="' + INK + '"/>' +
    '<path d="M20 70 q8 7 19 5" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(44, 68),
  whale: '<path d="M104 62 q16 -12 11 -24 q-9 11 -15 12 q5 6 4 12 Z" fill="#5B7FB0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M16 72 Q28 36 66 38 Q102 40 105 62 Q92 84 58 86 Q28 86 16 72 Z" fill="#5B7FB0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M58 36 V16 M50 24 q8 -12 16 0" stroke="#9CC4E4" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="38" cy="58" r="4.2" fill="#FFF" stroke="' + INK + '" stroke-width="2"/><circle cx="39" cy="58.5" r="2" fill="' + INK + '"/>' +
    '<path d="M22 70 q10 7 21 3" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M30 78 h42 M34 84 h36" stroke="#3E5C86" stroke-width="2.5" stroke-linecap="round"/>' +
    CHEEK(46, 66),
  camel: '<rect x="36" y="86" width="9" height="24" rx="4" fill="#E2B672" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="52" y="86" width="9" height="24" rx="4" fill="#E2B672" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="66" y="86" width="9" height="24" rx="4" fill="#E2B672" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="55" cy="72" rx="31" ry="19" fill="#E2B672" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M38 62 q-7 -19 5 -19 q9 0 5 19 Z" fill="#E2B672" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 62 q-3 -15 6 -15 q8 0 5 15 Z" fill="#E2B672" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M82 70 Q95 62 93 42" stroke="' + INK + '" stroke-width="13" fill="none" stroke-linecap="round"/>' +
    '<path d="M82 70 Q95 62 93 42" stroke="#E2B672" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    '<circle cx="93" cy="38" r="10.5" fill="#E2B672" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M86 32 l-4 -8 8 2 Z" fill="#E2B672" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    EYE(96, 36) +
    '<path d="M97 44 q4 3 8 1" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    CHEEK(88, 44),
  scorpion: '<path d="M40 84 l-9 12 M56 86 l-3 12 M70 85 l6 12" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 54 Q82 42 78 26 Q74 15 65 18" stroke="' + INK + '" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 54 Q82 42 78 26 Q74 15 65 18" stroke="#B0703C" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="64" cy="17" r="5" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="24" cy="62" r="10" fill="#C9803A" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="96" cy="62" r="10" fill="#C9803A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M20 58 l-4 -6 M28 58 l4 -6" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M92 58 l-4 -6 M100 58 l4 -6" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<ellipse cx="58" cy="72" rx="27" ry="19" fill="#B0703C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M46 66 h24" stroke="#8A5A2B" stroke-width="2.4" stroke-linecap="round"/>' +
    '<ellipse cx="58" cy="80" rx="14" ry="8" fill="#D9A06B"/>' +
    EYE(48, 62) + EYE(68, 62) + CHEEK(42, 70) + CHEEK(74, 70),
  /* ---- r4 新 9 ---- */
  bear: '<circle cx="32" cy="30" r="11" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="88" cy="30" r="11" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="32" cy="30" r="5" fill="#E8CDA8"/>' +
    '<circle cx="88" cy="30" r="5" fill="#E8CDA8"/>' +
    '<circle cx="60" cy="68" r="40" fill="#B98A5C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="80" rx="21" ry="15" fill="#F7E7CF" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="60" cy="73" rx="7.5" ry="5.5" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M60 78 v5 M60 83 q-5 5 -10 2 M60 83 q5 5 10 2" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    EYE(44, 58) + EYE(76, 58) +
    CHEEK(34, 72) + CHEEK(86, 72),
  snake: '<path d="M22 96 Q4 84 20 70 Q40 56 46 44 Q52 30 68 30" stroke="' + INK + '" stroke-width="17" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 96 Q4 84 20 70 Q40 56 46 44 Q52 30 68 30" stroke="#7DBB5A" stroke-width="12" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 96 Q4 84 20 70 Q40 56 46 44 Q52 30 68 30" stroke="#B7D98A" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="80" cy="30" rx="16" ry="12" fill="#7DBB5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="76" cy="26" r="2.4" fill="' + INK + '"/>' +
    '<path d="M95 32 q8 3 12 -1 M107 31 l6 -4 M107 31 l6 4" stroke="#E8483C" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 74 q8 -6 16 -3 M36 58 q8 -5 14 -2" stroke="#57B368" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  turtle: '<ellipse cx="14" cy="86" rx="7" ry="5" fill="#9CCB6E" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="30" cy="98" rx="9" ry="7" fill="#9CCB6E" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="86" cy="98" rx="9" ry="7" fill="#9CCB6E" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="104" cy="66" r="13" fill="#9CCB6E" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="107" cy="62" r="2.4" fill="' + INK + '"/>' +
    '<path d="M108 72 q4 3 7 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="56" cy="76" rx="38" ry="28" fill="#6FA063" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M38 60 q18 -12 36 0 M28 74 q28 12 56 0 M44 88 q12 6 24 0" stroke="#4E7A45" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="56" cy="74" rx="10" ry="6" fill="#8FBF7F" opacity=".5"/>',
  fox: '<path d="M14 76 Q-4 68 4 46 Q10 58 26 62 Z" fill="#E8823C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 20 L40 46 L18 44 Z" fill="#E8823C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 26 L34 42 L24 42 Z" fill="#F2B8C6"/>' +
    '<path d="M92 20 L102 44 L80 46 Z" fill="#E8823C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M92 26 L98 42 L86 42 Z" fill="#F2B8C6"/>' +
    '<path d="M24 50 Q26 28 60 28 Q94 28 96 50 Q88 74 60 78 Q32 74 24 50 Z" fill="#E8823C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="66" rx="20" ry="13" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M56 60 l8 0 l-4 6 Z" fill="' + INK + '"/>' +
    EYE(46, 50) + EYE(74, 50) +
    CHEEK(38, 62) + CHEEK(82, 62),
  eagle: '<path d="M96 66 L114 58 L112 76 Z" fill="#8A7B6C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M30 62 Q32 36 66 36 Q100 38 102 60 Q90 82 62 82 Q36 82 30 62 Z" fill="#7A6A5A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M60 46 q30 -6 36 14 q-22 12 -38 0 Z" fill="#5A4C3E" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="42" cy="52" r="16" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    EYE(38, 48) +
    '<path d="M30 42 l14 3" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M28 52 L6 56 L28 66 Q24 57 28 52 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 64 q-2 6 -8 6" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    CHEEK(50, 60),
  duck: '<path d="M44 92 v10 M64 92 v10" stroke="#F5A24B" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M36 104 h16 M44 104 l-7 5 M44 104 l7 5 M56 104 h16 M64 104 l-7 5 M64 104 l7 5" stroke="#F5A24B" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M94 68 l10 -7 -2 11 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M34 64 Q30 92 64 92 Q96 92 94 68 Q84 58 62 60 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M52 68 q22 -6 28 8 q-18 10 -32 2 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="42" cy="44" r="19" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M26 40 L4 47 L26 55 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    EYE(38, 40) + CHEEK(48, 50),
  squirrel: '<path d="M76 62 Q110 56 102 24 Q96 4 78 14 Q94 28 84 44 Q78 54 66 56 Z" fill="#C9803A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M84 48 Q98 40 92 24 Q88 38 78 46 Z" fill="#E2B672"/>' +
    '<ellipse cx="52" cy="82" rx="26" ry="23" fill="#C9803A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="52" cy="86" rx="15" ry="14" fill="#F7E7CF"/>' +
    '<path d="M34 36 q-4 -12 4 -14 q4 6 2 12 Z" fill="#C9803A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M60 34 q0 -12 8 -12 q2 6 -2 12 Z" fill="#C9803A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="48" cy="50" r="19" fill="#C9803A" stroke="' + INK + '" stroke-width="3.5"/>' +
    EYE(41, 48) + EYE(56, 48) +
    '<circle cx="48" cy="57" r="2" fill="' + INK + '"/>' +
    '<path d="M45 61 q3 3 6 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    CHEEK(34, 56) + CHEEK(64, 56) +
    '<ellipse cx="62" cy="90" rx="8" ry="9" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M53 84 q9 -8 18 0 q-9 4 -18 0 Z" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2.2"/>',
  cow: '<path d="M28 24 q-9 -9 -15 -4 M92 24 q9 -9 15 -4" stroke="#E2B672" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="20" cy="38" rx="8" ry="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-20 20 38)"/>' +
    '<ellipse cx="100" cy="38" rx="8" ry="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" transform="rotate(20 100 38)"/>' +
    '<ellipse cx="60" cy="48" rx="36" ry="30" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M44 26 q16 -8 22 6 q-12 10 -24 4 Z" fill="#5A4A3A"/>' +
    '<path d="M82 36 q10 -2 10 8 q-8 6 -14 0 Z" fill="#5A4A3A"/>' +
    EYE(48, 44) + EYE(72, 44) +
    '<ellipse cx="60" cy="64" rx="20" ry="13" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="52" cy="64" r="2.6" fill="' + INK + '"/><circle cx="68" cy="64" r="2.6" fill="' + INK + '"/>',
  tiger: '<circle cx="30" cy="28" r="10" fill="#E8973C" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="30" cy="28" r="4.5" fill="#F2B8C6"/>' +
    '<circle cx="90" cy="28" r="10" fill="#E8973C" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="90" cy="28" r="4.5" fill="#F2B8C6"/>' +
    '<circle cx="60" cy="62" r="42" fill="#E8973C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M60 22 v12 M44 26 l5 10 M76 26 l-5 10" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M18 58 l11 3 M18 70 l11 0 M102 58 l-11 3 M102 70 l-11 0" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="76" rx="17" ry="12" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M55 70 l10 0 l-5 6 Z" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M60 76 q0 5 5 5 M60 76 q0 5 -5 5" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    EYE(48, 58) + EYE(72, 58) +
    CHEEK(34, 70) + CHEEK(86, 70)
};

/* 动物 SVG 工厂：animalSvg(id, size)——size 缺省 92 */
function animalSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="92" height="92"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    ANIMAL_ELS[id] + '</svg>';
}

/* ---------- 环境场景卡 SVG（viewBox 0 0 120 132 竖版；特征可辨识——v1 原样） */
const CLOUD = (x, y, k) => '<g fill="#FFF" stroke="' + INK + '" stroke-width="2.2" transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
  '<ellipse cx="0" cy="0" rx="16" ry="9"/><ellipse cx="12" cy="-4" rx="11" ry="7"/><ellipse cx="-12" cy="-3" rx="9" ry="6"/></g>';
const TREE = (x, y, k) => '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
  '<rect x="-4" y="-6" width="8" height="20" rx="2.5" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.4"/>' +
  '<polygon points="0,-52 22,-8 -22,-8" fill="#57B368" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
  '<polygon points="0,-38 18,-2 -18,-2" fill="#6FC47F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/></g>';
const GRASS = (x, y) => '<path d="M' + x + ' ' + y + ' q-3 -8 -1 -11 M' + x + ' ' + y + ' q1 -8 5 -10" stroke="#57B368" stroke-width="2.4" fill="none" stroke-linecap="round"/>';

const ENV_ELS = {
  forest: '<rect width="120" height="132" fill="#EAF3E0"/>' + SUN(18, 20, 9) +
    TREE(94, 44, 0.62) + TREE(30, 62, 0.8) + TREE(74, 92, 0.95) + TREE(14, 100, 0.66) +
    '<path d="M0 116 Q60 106 120 116 V132 H0 Z" fill="#8FBF7F"/>' + GRASS(50, 116),
  grassland: '<rect width="120" height="132" fill="#E8F2FA"/>' + SUN(98, 22, 11) + CLOUD(34, 24, 0.8) +
    '<path d="M0 74 Q36 56 72 72 Q100 84 120 72 V132 H0 Z" fill="#C8DFA8"/>' +
    '<path d="M0 98 Q60 88 120 98 V132 H0 Z" fill="#8FBF7F"/>' +
    GRASS(24, 112) + GRASS(58, 118) + GRASS(90, 110) + GRASS(104, 120),
  ocean: '<rect width="120" height="30" fill="#E8F2FA"/>' + CLOUD(24, 16, 0.6) +
    '<rect y="30" width="120" height="102" fill="#5FA8D3"/>' +
    '<path d="M0 30 Q30 22 60 30 T120 30 V132 H0 Z" fill="#7FB9E0"/>' +
    '<path d="M10 62 q12 -7 24 0 M70 58 q12 -7 24 0 M32 96 q12 -7 24 0 M84 100 q12 -7 24 0" stroke="#FFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>' +
    '<g transform="translate(52 74)"><ellipse cx="0" cy="0" rx="12" ry="7.5" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M10 0 L20 -6 L18 0 L20 6 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="-5" cy="-2" r="1.8" fill="' + INK + '"/></g>' +
    '<circle cx="30" cy="46" r="3" fill="#D8ECF8"/><circle cx="92" cy="82" r="4" fill="#D8ECF8"/><circle cx="16" cy="112" r="2.6" fill="#D8ECF8"/>',
  desert: '<rect width="120" height="132" fill="#FDF1DA"/>' + SUN(92, 26, 13) +
    '<path d="M0 64 Q34 44 66 64 Q94 80 120 62 V132 H0 Z" fill="#EED9A0"/>' +
    '<path d="M0 92 Q60 78 120 92 V132 H0 Z" fill="#E8CD86"/>' +
    '<g transform="translate(36 86)"><path d="M-6 0 V-34 a6 6 0 0 1 12 0 V0 Z M-6 -14 h-8 v-6 q8 -6 8 6 M6 -22 h8 v-4 q-8 -6 -8 4" fill="#7FA85B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/></g>' +
    '<g transform="translate(88 96) scale(.78)"><path d="M-6 0 V-34 a6 6 0 0 1 12 0 V0 Z M6 -14 h8 v-6 q-8 -6 -8 6" fill="#7FA85B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/></g>' +
    '<circle cx="62" cy="112" r="3" fill="#D9BC7E"/><circle cx="22" cy="120" r="2.4" fill="#D9BC7E"/>',
  pond: '<rect width="120" height="132" fill="#DCE9C6"/>' +
    '<path d="M18 40 q3 -22 6 0 M22 38 q3 -18 6 0 M104 52 q2 -16 5 0" stroke="#7FA85B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="82" rx="46" ry="27" fill="#7FB9E0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M28 78 q10 -5 20 0 M64 92 q10 -5 20 0" stroke="#A8D0EA" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="44" cy="76" r="9" fill="#57B368" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M44 76 L54 72 L52 82 Z" fill="#7FB9E0"/>' +
    '<circle cx="82" cy="86" r="7" fill="#57B368" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M82 86 L90 83 L89 90 Z" fill="#7FB9E0"/>' +
    '<g transform="translate(64 68)"><circle cx="0" cy="-3" r="4.5" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.8"/><circle cx="-5.5" cy="1" r="4.5" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.8"/><circle cx="5.5" cy="1" r="4.5" fill="#F2A0B5" stroke="' + INK + '" stroke-width="1.8"/><circle cx="0" cy="0" r="2.6" fill="#F5CB5C"/></g>' +
    '<circle cx="26" cy="66" r="2.4" fill="#BFE3F2"/><circle cx="98" cy="72" r="3" fill="#BFE3F2"/>',
  sky: '<rect width="120" height="132" fill="#CDE6F7"/>' + SUN(16, 22, 10) +
    CLOUD(62, 40, 1.05) + CLOUD(24, 78, 0.7) + CLOUD(94, 92, 0.8) +
    '<path d="M52 58 q4 -6 8 0 q4 -6 8 0 M24 96 q3 -5 6 0 q3 -5 6 0" stroke="#6B7F94" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="128" rx="70" ry="16" fill="#FFF" opacity=".9"/>',
  farm: '<rect width="120" height="132" fill="#E8F2FA"/>' + SUN(104, 20, 9) +
    '<g transform="translate(58 52)"><polygon points="0,-24 26,0 -26,0" fill="#B05F55" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<rect x="-22" y="0" width="44" height="32" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="-8" y="10" width="16" height="22" rx="2" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M-8 21 h16 M0 10 v22" stroke="' + INK + '" stroke-width="2"/></g>' +
    '<path d="M6 106 h108 M6 118 h108" stroke="#B98A5C" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M14 96 v26 M42 98 v24 M78 98 v24 M106 96 v26" stroke="#B98A5C" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M0 124 Q60 118 120 124 V132 H0 Z" fill="#DCE9C6"/>' +
    '<circle cx="24" cy="94" r="8" fill="#F5CB5C" stroke="' + INK + '" stroke-width="2.4"/>'
};

/* 环境场景卡工厂：envSvg(kind, size)——size 缺省 100×110 */
function envSvg(kind, size) {
  const s = size ? ' width="' + size + '" height="' + Math.round(size * 132 / 120) + '"'
                 : ' width="100" height="110"';
  return '<svg viewBox="0 0 120 132"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    ENV_ELS[kind] + '</svg>';
}

/* ---------- r4 食物卡 SVG（viewBox 0 0 120 120；feed 题候选——配文字标签） */
const FOOD_ELS = {
  grass: '<path d="M42 98 Q34 64 18 52 M78 98 Q86 64 102 52 M52 98 Q50 58 38 42 M68 98 Q70 58 82 42" stroke="#6FC47F" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M60 96 V22" stroke="#57B368" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M60 40 l-12 -8 M60 56 l12 -8" stroke="#57B368" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M8 98 Q60 90 112 98 V108 H8 Z" fill="#C8DFA8" stroke="' + INK + '" stroke-width="2.6"/>',
  meat: '<path d="M34 66 L12 86" stroke="#FFF6E3" stroke-width="9" stroke-linecap="round"/>' +
    '<circle cx="9" cy="84" r="6" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="15" cy="93" r="6" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="64" cy="60" rx="30" ry="24" fill="#E8766A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M50 54 q14 -8 28 2" stroke="#F2A99E" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="72" cy="68" r="4" fill="#F2A99E"/>',
  bug: '<path d="M52 26 q-4 -10 -12 -12 M68 26 q4 -10 12 -12" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="60" cy="38" r="12" fill="#5A4A3A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="55" cy="36" r="2" fill="#FFF"/><circle cx="65" cy="36" r="2" fill="#FFF"/>' +
    '<ellipse cx="60" cy="68" rx="30" ry="26" fill="#E8483C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M60 44 V92" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="46" cy="58" r="4" fill="' + INK + '"/><circle cx="74" cy="58" r="4" fill="' + INK + '"/>' +
    '<circle cx="50" cy="78" r="3.4" fill="' + INK + '"/><circle cx="70" cy="78" r="3.4" fill="' + INK + '"/>' +
    '<path d="M30 62 l-8 -4 M30 74 l-8 2 M90 62 l8 -4 M90 74 l8 2" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>',
  fish: '<path d="M88 64 L110 48 L104 64 L110 80 Z" fill="#9FB8D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="58" cy="64" rx="34" ry="21" fill="#9FB8D9" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M56 44 q10 -12 22 -4 q-10 4 -12 12 Z" fill="#7FA0C4" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="40" cy="58" r="5" fill="#FFF" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="42" cy="58.5" r="2.2" fill="' + INK + '"/>' +
    '<path d="M32 70 q6 5 12 1" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="24" cy="34" r="3.4" fill="#BFE3F2"/><circle cx="16" cy="24" r="2.4" fill="#BFE3F2"/>',
  fruit: '<ellipse cx="60" cy="68" rx="32" ry="30" fill="#E8483C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="48" cy="58" rx="8" ry="10" fill="#F2A99E" opacity=".85"/>' +
    '<path d="M60 40 q2 -12 10 -16" stroke="#8A5A2B" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M70 28 q16 -10 24 0 q-10 12 -24 0 Z" fill="#57B368" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
  candy: '<path d="M34 62 Q34 36 60 36 Q86 36 86 62 Q86 84 60 86 Q34 84 34 62 Z" fill="#F2A0B5" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="48" cy="54" rx="7" ry="9" fill="#FBD9E4"/>' +
    '<circle cx="60" cy="30" r="8" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M60 22 q2 -8 8 -10" stroke="#8A5A2B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="92" rx="34" ry="8" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M22 54 l-8 -4 M98 54 l8 -4 M20 68 l-9 1 M100 68 l9 1" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>'
};
/* 食物卡工厂：foodSvg(id, size)——size 缺省 92 */
function foodSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="92" height="92"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    FOOD_ELS[id] + '</svg>';
}

/* ---------- r4 能力卡 SVG（struct 题候选——动作图景+文字标签） */
const ABILITY_ELS = {
  swim: '<path d="M14 50 Q32 36 50 50 Q68 64 86 50 Q98 40 110 50" stroke="#8A9BAE" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="52" cy="40" r="12" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 38 L26 42 L40 47 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="48" cy="37" r="2.2" fill="' + INK + '"/>' +
    '<path d="M26 56 q14 10 28 0 q14 -10 28 0 q12 8 22 0" stroke="#5FA8D3" stroke-width="6" fill="none" stroke-linecap="round"/>' +
    '<path d="M18 74 q14 12 28 0 q14 -12 28 0 q12 10 22 0" stroke="#7FB9E0" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="30" cy="90" r="3" fill="#BFE3F2"/><circle cx="86" cy="88" r="3.4" fill="#BFE3F2"/>',
  fly: CLOUD(88, 26, 0.6) + CLOUD(24, 34, 0.5) +
    '<path d="M24 78 Q40 52 66 60 Q92 66 98 48 Q88 84 56 80 Q36 78 24 78 Z" fill="#6FA8DC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M10 60 h16 M6 72 h12 M16 88 h10" stroke="#8A9BAE" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="42" cy="66" r="2.4" fill="' + INK + '"/>',
  run: '<circle cx="84" cy="32" r="10" fill="#F5CB5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M80 42 Q60 46 50 64" stroke="#F5CB5C" stroke-width="13" fill="none" stroke-linecap="round"/>' +
    '<path d="M80 42 Q60 46 50 64" stroke="' + INK + '" stroke-width="15" fill="none" stroke-linecap="round" opacity="0"/>' +
    '<path d="M52 62 L32 80 M52 62 L64 86 M76 48 L94 40" stroke="#F5CB5C" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<path d="M6 46 h20 M2 62 h14 M8 78 h14" stroke="#8A9BAE" stroke-width="3.6" stroke-linecap="round"/>' +
    '<path d="M28 88 l6 6 M94 34 l7 -4" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>',
  dig: '<circle cx="30" cy="52" r="4" fill="#D9BC7E"/><circle cx="44" cy="38" r="3" fill="#D9BC7E"/><circle cx="88" cy="42" r="3.4" fill="#D9BC7E"/>' +
    '<path d="M20 96 Q60 52 100 96 Z" fill="#D9BC7E" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="96" rx="26" ry="8" fill="#5A4A3A" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="60" cy="68" rx="13" ry="10" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="55" cy="63" r="2.4" fill="' + INK + '"/><circle cx="65" cy="63" r="2.4" fill="' + INK + '"/>'
};
/* 能力卡工厂：abilitySvg(id, size)——size 缺省 84 */
function abilitySvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="84" height="84"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    ABILITY_ELS[id] + '</svg>';
}

/* ---------- r4 特征图标 SVG（struct 题面——身体部位特写） */
const FEAT_ELS = {
  web: '<path d="M60 12 V42" stroke="#F5A24B" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="M60 42 Q28 50 22 72 Q40 80 52 70 Q56 84 60 84 Q64 84 68 70 Q80 80 98 72 Q92 50 60 42 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 48 L34 62 M60 48 L86 62 M60 52 V76" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  wing: '<path d="M20 74 Q28 36 64 30 Q98 26 100 48 Q78 52 74 62 Q90 64 94 74 Q70 84 60 76 Q48 88 32 80 Q24 78 20 74 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M34 68 Q46 48 70 44 M30 78 Q46 66 62 68" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="88" cy="36" r="3" fill="#BFE3F2"/><circle cx="98" cy="26" r="2.2" fill="#BFE3F2"/>',
  legs: '<ellipse cx="54" cy="26" rx="22" ry="15" fill="#F5CB5C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="46" cy="24" r="2.4" fill="' + INK + '"/><circle cx="62" cy="24" r="2.4" fill="' + INK + '"/>' +
    '<path d="M44 38 Q42 52 36 98 M64 38 Q66 52 72 98" stroke="#E8973C" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<rect x="28" y="96" width="14" height="11" rx="4" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="66" y="96" width="14" height="11" rx="4" fill="#8A5A2B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M14 60 h12 M10 74 h10 M94 60 h12 M100 74 h10" stroke="#8A9BAE" stroke-width="3" stroke-linecap="round"/>',
  claws: '<path d="M44 58 l-9 -15 l13 5 Z M56 54 l-4 -16 l10 6 Z M70 56 l2 -17 l8 9 Z M82 62 l9 -13 l2 11 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="78" rx="27" ry="21" fill="#E8975A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="60" cy="84" rx="11" ry="8" fill="#F7C9A8"/>' +
    '<path d="M40 92 q-6 8 -14 8 M80 92 q6 8 14 8" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
};
/* 特征图标工厂：featSvg(id, size)——size 缺省 96 */
function featSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="96" height="96"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    FEAT_ELS[id] + '</svg>';
}

/* ---------- r4 条件芯片图标（dual 题面——两枚条件圆章） */
const COND_ELS = {
  swim: '<path d="M12 58 Q30 44 48 58 Q66 72 84 58 Q98 46 112 58" stroke="#5FA8D3" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<path d="M12 84 Q30 70 48 84 Q66 98 84 84 Q98 72 112 84" stroke="#7FB9E0" stroke-width="6" fill="none" stroke-linecap="round"/>',
  hib: '<path d="M56 18 A34 34 0 1 0 90 72 A26 26 0 1 1 56 18 Z" fill="#F5E9C8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M92 30 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#F5E9C8"/>',
  egg: '<ellipse cx="60" cy="66" rx="27" ry="33" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="50" cy="52" rx="6" ry="10" fill="#FFF" opacity=".9"/>',
  nowegg: '<ellipse cx="60" cy="66" rx="27" ry="33" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M34 38 L88 94" stroke="#E8483C" stroke-width="7" stroke-linecap="round"/>',
  water: '<path d="M60 20 Q90 58 90 78 A30 30 0 1 1 30 78 Q30 58 60 20 Z" fill="#7FB9E0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="48" cy="78" rx="7" ry="10" fill="#BFE3F2" opacity=".9"/>',
  farm: '<polygon points="60,26 92,48 28,48" fill="#B05F55" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="34" y="48" width="52" height="36" rx="4" fill="#E8483C" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="50" y="60" width="20" height="24" rx="2" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M42 84 v14 M78 84 v14" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  herb: '<path d="M60 100 V26" stroke="#57B368" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M60 44 q-20 -6 -26 -24 q20 0 26 24 Z M60 62 q20 -6 26 -24 q-20 0 -26 24 Z" fill="#6FC47F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>'
};
function condSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="60" height="60"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    COND_ELS[id] + '</svg>';
}

/* ---------- 题面背景（viewBox 0 0 360 184）
   meadow 白日草地（home/feed/chain/struct/dual）；night 冬夜雪地（hib——冬眠题情境）
   题面动物/图标由 JS 注入（.animal-slot / .chain-row / .feat-ico / .cond-chips / .sleep-ico） */
function meadowSvg() {
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#EAF3E0"/>' + SUN(40, 38, 17) +
    '<path d="M40 13 v-6 M65 38 h6 M40 63 v6 M15 38 h-6 M57 21 l4.5 -4.5 M23 21 l-4.5 -4.5" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>' +
    CLOUD(300, 34, 1.0) + CLOUD(240, 20, 0.55) +
    '<path d="M0 148 q70 -14 150 -6 q100 10 210 -2 V184 H0 Z" fill="#B7D89A"/>' +
    '<path d="M0 164 q80 -10 160 -2 q100 8 200 -4 V184 H0 Z" fill="#8FBF7F"/>' +
    GRASS(70, 158) + GRASS(150, 168) + GRASS(300, 160) + GRASS(330, 172) +
    '</svg>';
}
function nightSvg() {
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#2C3E5C"/>' +
    '<circle cx="66" cy="40" r="21" fill="#F5E9C8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="59" cy="35" r="3.4" fill="#E8D9A8"/><circle cx="73" cy="46" r="2.4" fill="#E8D9A8"/>' +
    '<path d="M150 30 l2.5 7 7 2.5 -7 2.5 -2.5 7 -2.5 -7 -7 -2.5 7 -2.5 Z M290 52 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z M220 22 l1.6 5 5 1.6 -5 1.6 -1.6 5 -1.6 -5 -5 -1.6 5 -1.6 Z M330 96 l1.6 5 5 1.6 -5 1.6 -1.6 5 -1.6 -5 -5 -1.6 5 -1.6 Z" fill="#F5E9C8" opacity=".9"/>' +
    '<circle cx="120" cy="70" r="2" fill="#F5E9C8" opacity=".7"/><circle cx="180" cy="88" r="2.4" fill="#F5E9C8" opacity=".6"/><circle cx="260" cy="30" r="1.8" fill="#F5E9C8" opacity=".7"/>' +
    '<circle cx="70" cy="110" r="3" fill="#FFF" opacity=".85"/><circle cx="140" cy="124" r="2.4" fill="#FFF" opacity=".8"/><circle cx="230" cy="108" r="3" fill="#FFF" opacity=".85"/><circle cx="310" cy="126" r="2.2" fill="#FFF" opacity=".8"/>' +
    '<path d="M0 140 Q90 128 180 138 Q270 148 360 136 V184 H0 Z" fill="#EAF0F6"/>' +
    '<path d="M0 158 Q120 148 240 158 Q310 164 360 156 V184 H0 Z" fill="#D5E2ED"/>' +
    '</svg>';
}
/* hib 题面中央「睡觉」意象（月牙+Zz，不显示任何候选动物——无捷径） */
function sleepSvg() {
  return '<svg viewBox="0 0 120 120" width="86" height="86" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M50 16 A38 38 0 1 0 88 76 A30 30 0 1 1 50 16 Z" fill="#F5E9C8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M84 22 l14 0 l-14 14 l14 0 M62 44 l10 0 l-10 10 l10 0" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
}
/* chain 题面链行：基食物 → 链中动物 → ？（链顶不显示——up 答案不可见，推理必需） */
const ARROW_R = '<svg viewBox="0 0 40 24" width="34" height="20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
  '<path d="M4 12 h26 M24 5 l9 7 -9 7" stroke="' + INK + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<polygon points="10,21 22,10.5 34,21" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<rect x="14" y="21" width="16" height="12" rx="2" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="20" y="25" width="5" height="8" rx="1" fill="#B98A5C" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<g transform="translate(38 30)"><rect x="-1.6" y="-2" width="3.2" height="7" rx="1" fill="#B98A5C" stroke="' + INK + '" stroke-width="1.2"/>' +
    '<polygon points="0,-10 7,0 -7,0" fill="#57B368" stroke="' + INK + '" stroke-width="1.4" stroke-linejoin="round"/></g></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  star: '<svg viewBox="0 0 48 48" width="44" height="44" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M24 4 L29.5 17.5 L44 19 L33.5 28.5 L36.5 43 L24 35.5 L11.5 43 L14.5 28.5 L4 19 L18.5 17.5 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/></svg>'
};
