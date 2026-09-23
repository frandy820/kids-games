/* ================= iftrain 如果下雨 游戏数据 v2（r3 难度改造 2026-09-13）
   SPEC-BATCH31 §0.77 v2（旧 v1 段作废）：封闭集 6→12 对（主配 6+次配 6，12 名音全用上
   零新增）+ 复合条件（ch2+）+ 优先级/双装备（ch3）+ 候选恒 4 + 反向题（ch4 混入）。
   题型五族（kind）：
     single   单条件单选（ch1/ch4）：conds=[sit]，need=[PRIMARY[sit]]，点卡即判
     multi    复合条件多选（ch2/ch4）：conds=[c1,c2]（COMBOS 行），need=2 件，
              勾选(.held)+「带好啦」提交（照 weather v2 先例：wrong_more=清空+miss /
              wrong_less=保留继续 / 勾满 .ready 呼吸邀请）——交集思维：两条件都要满足
     best     双装备多选（ch3/ch4）：conds=[sit]，need=[PRIMARY,SECONDARY] 两件提交——
              「两件而非单件」
     conflict 优先级单选（ch3/ch4）：conds=[c1,c2]（CONFLICTS 行），need=[gear] 1 件点判——
              诱惑项 PRIMARY[软条件] 恒在候选（单一最优解推理）；key=必须条件（错链回锚名）
     ruleback 反向（ch4）：ask=装备 id，need=[sit]（PRIMARY 逆），候选干扰 ∉ valid_sits
   题面句=名音 clip 拼播（single/conflict→q1 / multi/best→q_two / ruleback→q2）——
   「如果下雨」语义由情境名音前缀承载（SPEC §2 定版，禁 TTS 拼长句）。卡=图+小字名。
   候选恒 4（含 ch1）；干扰公平性：single 固定含 SECONDARY[sit]（同域近义——选错件也是错）/
   multi 干扰 ∉ need∪SECONDARY[conds] / conflict 干扰 ∉ {gear,tempt,SECONDARY[key]} /
   ruleback 干扰 ∉ valid_sits(gear)（防半有效干扰）。
   点对=rai_right+need 名音逐件拼播（全 clip 无 keyless——契约 N 天然安全）；
   点错=rai_wrong+回锚名音+语义句 clip（正向 rai_again_apply「再看看外面是什么天气」/
   ruleback rai_again_back「再想想什么时候用它」，键段链尾 T46）+题面大图再 pulse。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 条件-装备封闭 12（SPEC §0.77 v2：表外不出题） ----------
   PRIMARY 主配 6（单选真值/ruleback 逆映射源）+ SECONDARY 次配 6（best 第二件+
   单选同域近义干扰锚）。装备 valid_sits（主∪次）全 ≤3：
   umbrella{rain,sun} sunhat{sun,hot} scarf{snow,cold,wind} coat{cold,rain,snow}
   fan{hot} kite{wind}——ruleback 干扰池（∉valid）≥3 恒可构造 4 候选。 ---------- */
const IF_PRIMARY = {
  rain: 'umbrella', sun: 'sunhat', snow: 'scarf',
  cold: 'coat', hot: 'fan', wind: 'kite'
};
const IF_SECONDARY = {                       // 次配（雨衣式外套/遮阳伞/雪天外套/挡风围巾…）
  rain: 'coat', sun: 'umbrella', snow: 'coat',
  cold: 'scarf', hot: 'sunhat', wind: 'scarf'
};
const SITS6 = ['rain', 'sun', 'snow', 'cold', 'hot', 'wind'];            // 情境集（天气 6）
const GEARS6 = ['umbrella', 'sunhat', 'scarf', 'coat', 'fan', 'kite'];   // 装备集 6
const IF_INV = { umbrella: 'rain', sunhat: 'sun', scarf: 'snow',
                 coat: 'cold', fan: 'hot', kite: 'wind' };               // PRIMARY 逆
const validSitsOf = g => SITS6.filter(s => IF_PRIMARY[s] === g || IF_SECONDARY[s] === g);
const nameOf = id => ITEMS[id].n;
const ITEMS = {
  rain:     { n: '下雨' },
  sun:      { n: '大太阳' },
  snow:     { n: '下雪' },
  cold:     { n: '天冷冷' },
  hot:      { n: '天热热' },
  wind:     { n: '刮大风' },
  umbrella: { n: '雨伞' },
  sunhat:   { n: '太阳帽' },
  scarf:    { n: '围巾' },
  coat:     { n: '外套' },
  fan:      { n: '小扇子' },
  kite:     { n: '小风筝' }
};

/* ---------- 复合组合表（ch2 multi 真值；两条件→两件，交集思维） ----------
   语义：伞防雨+外套挡风（雨不透气→必须防雨优先）等；cond 对与 CONFLICTS 互斥
   （同对不双定义）。display 顺序=口播顺序（「又下雨又刮风」）。 ---------- */
const IF_COMBOS = [
  { id: 'cm_rw', conds: ['rain', 'wind'], need: ['umbrella', 'coat'] },
  { id: 'cm_cr', conds: ['cold', 'rain'], need: ['coat', 'umbrella'] },
  { id: 'cm_sw', conds: ['snow', 'wind'], need: ['scarf', 'coat'] },
  { id: 'cm_su', conds: ['sun', 'wind'],  need: ['sunhat', 'kite'] },
  { id: 'cm_sh', conds: ['sun', 'hot'],   need: ['sunhat', 'fan'] }
];

/* ---------- 冲突表（ch3 优先级真值；两条件相争→单一最优解） ----------
   gear=必须带的唯一答案；tempt=诱惑项（软条件的 PRIMARY，恒入候选——推理靶心）；
   key=必须条件（错链回锚只播它的名音，窗 8000 内收口）。 ---------- */
const IF_CONFLICTS = [
  { id: 'cf_hr', conds: ['hot', 'rain'],   key: 'rain', gear: 'umbrella', tempt: 'fan' },
  { id: 'cf_rs', conds: ['rain', 'sun'],   key: 'rain', gear: 'umbrella', tempt: 'sunhat' },
  { id: 'cf_cw', conds: ['cold', 'wind'],  key: 'cold', gear: 'coat',     tempt: 'kite' }
];

/* ---------- 错反馈语义句（TTS 拼句；flat≥3 只 10s 节流——契约 J）
   正向（single/multi/best/conflict）=「再看看外面是什么天气」（rai_again_apply 2904）
   ruleback=「再想想什么时候用它」（rai_again_back 2856）；无数字词——契约 L 豁免款 */
const APPLY_AGAIN = '再看看外面是什么天气';
const BACK_AGAIN = '再想想什么时候用它';

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言） ---------- */
const CHAPTERS = {
  1: { name: '天气带什么', hint: '两个天气一起想，要带两样' },   // 预告 ch2 multi 复合
  2: { name: '又下雨又刮风', hint: '有时带两样，有时只带一样' }, // 预告 ch3 best+conflict
  3: { name: '两样还是一样', hint: '正着问反着问，全都来' },     // 预告 ch4 五型混出+ruleback
  4: { name: '大挑战',      hint: '新一轮如果下雨选一选' }       // 预告生成关
};
const GEN_HINTS = ['四张卡里，选一样',      // dch1 single 恒 4 候选
                   '两个天气，带两样',      // dch2 multi 复合提交
                   '两样还是一样，想一想',  // dch3 best+conflict
                   '正反都来，大集合'];     // dch4 五型混出
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=rai_ 已核
   manifest 无占用，b28 立规先查）。v1 实长（SPEC-BATCH31 §4 实长表，浏览器 Audio 实测）：
   tut_watch 3360 / tut_turn 1872 / hint 2016 / right 2544（celebrate 后窗 ≥2844）/ wrong 1656
   / q1 1824 / q2 2136；名音 rai_n_*：cold 1560 / coat 1368 / fan 1632 / hot 1584 / kite 1608
   / rain 1416 / scarf 1344 / snow 1440 / sun 1560 / sunhat 1536 / umbrella 1368 / wind 1536
   r3 新增 6 条（ffprobe 实测 2026-09-13，SPEC §4 r3 表）：q_two 1944 / multi_hint 2496
   / best_hint 2232 / conflict_hint 2280 / less 2832 / more 3096 */
const VOICE = {
  watch: { key: 'rai_tut_watch', text: '看！如果下雨带把伞' },
  turn:  { key: 'rai_tut_turn',  text: '你来选一选' },
  hint:  { key: 'rai_hint',      text: '再看看想一想' },
  right: { key: 'rai_right',     text: '选对啦，真厉害' },
  wrong: { key: 'rai_wrong',     text: '再想一想' },
  q1:    { key: 'rai_q1',        text: '要带什么呀' },
  q2:    { key: 'rai_q2',        text: '什么时候用它呀' },
  qTwo:  { key: 'rai_q_two',     text: '要带两样呀' },          // multi/best 题面句
  hMulti:    { key: 'rai_multi_hint',    text: '两个天气都要想到哦' },   // multi 方向提示
  hBest:     { key: 'rai_best_hint',     text: '要带两样才够哦' },       // best 方向提示
  hConflict: { key: 'rai_conflict_hint', text: '先想一定要带的哦' },     // conflict 方向提示
  less:  { key: 'rai_less', text: '还差一样，再找一找哦' },       // 提交少选（保留继续）
  more:  { key: 'rai_more', text: '多带了一样，重新挑一挑哦' }    // 提交含错（清空+miss）
};
const nameClip = id => 'rai_n_' + id;        // 名音键（晓晓读中文名，12 互异）

/* ---------- SVG 图库（viewBox 0 0 120 120；家族暖卡通风：INK 描边+大块填充）
   情境 6=天气场景（乌云雨滴/太阳光芒/云雪花/低温计冰晶/高温计烈日/风线飘叶），
   装备 6=伞/帽/围巾/外套/折扇/风筝，12 幅互异可一眼辨识（6-7 岁图形认知）。
   冷热互辨=温度计球位（低蓝球=冷 / 顶红球=热）+冰晶雪堆 vs 烈日汗滴辅元素。
   根组 g[data-anim] = id——契约 M 帧内容断言锚（渲染即引擎对账依据）。 ---------- */
const SNOW6 = (x, y, r, c) =>                                    // 六角雪花（十字+斜十字）
  '<g stroke="' + c + '" stroke-width="2.4" stroke-linecap="round">' +
  '<path d="M' + (x - r) + ' ' + y + ' h' + (r * 2) + ' M' + x + ' ' + (y - r) + ' v' + (r * 2) + '"/>' +
  '<path d="M' + (x - r * 0.66) + ' ' + (y - r * 0.66) + ' L' + (x + r * 0.66) + ' ' + (y + r * 0.66) +
  ' M' + (x - r * 0.66) + ' ' + (y + r * 0.66) + ' L' + (x + r * 0.66) + ' ' + (y - r * 0.66) + '"/></g>';
const DROP = (x, y) => '<path d="M' + x + ' ' + y + ' q4 7 0 10 q-4 -3 0 -10 Z" fill="#5B9BD5" stroke="' + INK + '" stroke-width="1.6"/>';

const ITEM_ELS = {
  /* 下雨：蓝灰乌云团 + 斜雨滴×4 + 底部水洼 */
  rain:
    '<ellipse cx="38" cy="94" rx="24" ry="7" fill="#C9DFF0" opacity=".8"/>' +
    '<circle cx="44" cy="42" r="17" fill="#9FB4C8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="66" cy="36" r="20" fill="#8CA6BD" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="86" cy="46" r="15" fill="#9FB4C8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M34 56 Q60 70 96 54" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<g stroke="#5B9BD5" stroke-width="4" stroke-linecap="round">' +
    '<path d="M42 68 l-7 14 M60 70 l-7 15 M78 70 l-7 14 M92 64 l-6 12"/></g>',
  /* 大太阳：黄心大圆 + 八根橙光芒 + 角上小白云 */
  sun:
    '<circle cx="60" cy="62" r="27" fill="#F8D667" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<g stroke="#E8A23C" stroke-width="4.5" stroke-linecap="round">' +
    '<path d="M60 22 v-11 M60 102 v-11 M20 62 h-11 M101 62 h-11 M32 34 l-8 -8 M96 90 l-8 -8 M88 34 l8 -8 M24 90 l8 -8"/></g>' +
    '<circle cx="60" cy="62" r="18" fill="#FCE9A8"/>' +
    '<ellipse cx="24" cy="20" rx="12" ry="7" fill="#FFF" opacity=".9"/>' +
    '<ellipse cx="99" cy="103" rx="10" ry="6" fill="#FFF" opacity=".9"/>',
  /* 下雪：浅灰白云 + 六角雪花×2 + 底部雪堆 */
  snow:
    '<path d="M22 88 q14 10 38 8 q22 2 38 -8 q-6 14 -38 14 q-32 0 -38 -14 Z" fill="#F4F8FC" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="48" cy="44" r="16" fill="#C9D6E4" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="70" cy="38" r="19" fill="#BACBDC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="88" cy="48" r="13" fill="#C9D6E4" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M38 56 Q60 68 94 54" fill="none" stroke="' + INK + '" stroke-width="3.2" stroke-linecap="round"/>' +
    SNOW6(40, 76, 8, '#7FB3D8') + SNOW6(84, 72, 7, '#5B9BD5'),
  /* 天冷冷：低温计（蓝球在底）+ 冰晶星 + 冷气波浪 + 小雪堆 */
  cold:
    '<path d="M26 102 q14 8 32 6 q16 0 26 -6 q-8 8 -29 8 q-21 0 -29 -8 Z" fill="#EDF4FA" opacity=".9"/>' +
    '<rect x="51" y="22" width="18" height="52" rx="9" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="56" y="46" width="8" height="22" rx="4" fill="#5B9BD5"/>' +
    '<circle cx="60" cy="82" r="16" fill="#5B9BD5" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="82" r="8" fill="#8CC3EA"/>' +
    '<g stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round">' +
    '<path d="M50 32 h-6 M50 40 h-6 M50 48 h-6"/></g>' +
    SNOW6(24, 34, 7, '#7FB3D8') + SNOW6(98, 42, 6, '#5B9BD5') +
    '<g stroke="#9FC4E0" stroke-width="2.8" fill="none" stroke-linecap="round">' +
    '<path d="M22 66 q6 5 0 10 q-6 5 0 10 M98 68 q-6 5 0 10 q6 5 0 10"/></g>',
  /* 天热热：高温计（红球在顶+红线到顶）+ 汗滴×2（审查 M1：删烈日光斑——与 sun 光芒线同色同形态致混淆） */
  hot:
    '<rect x="51" y="20" width="18" height="52" rx="9" fill="#FFF" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<rect x="56" y="24" width="8" height="44" rx="4" fill="#E8483C"/>' +
    '<circle cx="60" cy="26" r="12" fill="#E8483C" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="60" cy="80" r="16" fill="#F4F8FC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<g stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round">' +
    '<path d="M70 34 h6 M70 42 h6 M70 50 h6"/></g>' +
    DROP(28, 72) + DROP(94, 78),
  /* 刮大风：三条弯卷风线 + 被吹起的小叶 + 运动短线 */
  wind:
    '<g stroke="#8A9BAE" stroke-width="4.2" fill="none" stroke-linecap="round">' +
    '<path d="M14 34 h46 q10 0 10 -8 q0 -8 -9 -8 q-7 0 -8 6"/>' +
    '<path d="M14 58 h62 q9 0 9 7 q0 8 -10 8 q-6 0 -8 -5"/>' +
    '<path d="M14 82 h40"/></g>' +
    '<g stroke="#C9DFF0" stroke-width="2.6" stroke-linecap="round">' +
    '<path d="M64 78 h14 M58 90 h10"/></g>' +
    '<path d="M88 58 q14 -4 18 4 q-8 8 -18 4 q4 -4 0 -8 Z" fill="#8FC86C" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M92 66 q-4 8 -14 10" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  /* 雨伞：红橙伞面波浪缘 + 伞骨 + 弯钩伞柄 */
  umbrella:
    '<path d="M60 14 q-38 2 -44 34 q10 -6 14 2 q6 -8 12 -2 q6 -8 12 -2 q6 -8 12 -2 q6 -8 12 -2 q6 -8 14 2 q4 -8 14 -2 q-6 -32 -46 -34 Z" ' +
    'fill="#E8483C" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M60 16 q-10 14 -10 32 M60 16 q10 14 12 32 M60 16 v32" stroke="' + INK + '" stroke-width="2.2" fill="none"/>' +
    '<circle cx="60" cy="12" r="4.4" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M60 50 v44 q0 12 -11 12 q-9 0 -11 -8" fill="none" stroke="#8A5A2B" stroke-width="5.5" stroke-linecap="round"/>' +
    '<path d="M22 106 q26 9 54 0" stroke="#C9DFF0" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>',
  /* 太阳帽：宽檐草帽 + 帽顶 + 橙帽带 */
  sunhat:
    '<ellipse cx="60" cy="74" rx="44" ry="15" fill="#F2DDA4" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M28 72 q4 -34 32 -34 q28 0 32 34 q-32 -9 -64 0 Z" fill="#F7E7BC" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M30 64 q30 -9 60 0 l-2 8 q-28 -8 -56 0 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="60" cy="36" r="4" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<g stroke="#E8A23C" stroke-width="3" stroke-linecap="round">' +
    '<path d="M22 46 l-8 -6 M98 46 l8 -6 M18 58 h-10 M102 58 h-10"/></g>',
  /* 围巾：环形缠绕 + 两垂端 + 端部流苏 */
  scarf:
    '<path d="M34 34 q26 -12 52 0 q6 5 0 10 q-26 -11 -52 0 q-6 -5 0 -10 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M28 44 q-8 16 6 26 q14 9 30 2 q10 -5 6 -14" fill="none" stroke="#E8483C" stroke-width="13" stroke-linecap="round"/>' +
    '<path d="M28 44 q-8 16 6 26 q14 9 30 2 q10 -5 6 -14" fill="none" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M70 58 q10 6 12 18 l-14 8 q-4 -12 -4 -20 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M72 86 v10 M77 85 v10 M82 84 v10" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="46" cy="42" r="3.4" fill="#F5C445"/><circle cx="60" cy="40" r="3.4" fill="#F5C445"/><circle cx="74" cy="42" r="3.4" fill="#F5C445"/>',
  /* 外套：蓝衣身 + 两袖 + 领口 + 拉链中线 + 双口袋 */
  coat:
    '<path d="M40 26 l-16 8 q-9 4 -8 14 l2 34 q0 6 6 6 h8 l4 -34" fill="#5B8DD9" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M80 26 l16 8 q9 4 8 14 l-2 34 q0 6 -6 6 h-8 l-4 -34" fill="#5B8DD9" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M40 24 h40 v52 q0 22 -20 22 q-20 0 -20 -22 Z" fill="#6E9DE0" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M60 26 l-12 14 q12 8 24 0 Z" fill="#F4F8FC" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 40 v52" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M60 44 l-3 5 h6 Z M60 54 l-3 5 h6 Z M60 64 l-3 5 h6 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M46 70 h10 v9 h-10 Z M64 70 h10 v9 h-10 Z" fill="#5B8DD9" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
  /* 小扇子：展开折扇面 + 扇骨放射线 + 扇钉短柄 */
  fan:
    '<path d="M60 96 L18 58 A47 47 0 0 1 102 58 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<g stroke="' + INK + '" stroke-width="2.2">' +
    '<path d="M60 96 L34 22 M60 96 L48 16 M60 96 L60 14 M60 96 L72 16 M60 96 L86 22"/></g>' +
    '<path d="M22 56 A47 47 0 0 1 98 56" fill="none" stroke="#E8975A" stroke-width="4"/>' +
    '<path d="M30 48 q30 -14 60 0" fill="none" stroke="#FFF9EE" stroke-width="3" opacity=".85"/>' +
    '<path d="M60 96 q2 10 -4 16" fill="none" stroke="#8A5A2B" stroke-width="5.5" stroke-linecap="round"/>' +
    '<circle cx="60" cy="96" r="4.2" fill="#E8483C" stroke="' + INK + '" stroke-width="2.4"/>',
  /* 小风筝：菱形面 + 十字骨 + 弯尾飘带三蝶结 */
  kite:
    '<path d="M66 14 L96 48 L66 82 L36 48 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M66 16 v64 M38 48 h56" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M66 14 L96 48 L66 48 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M64 82 q-16 12 -34 10" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M56 80 l-8 6 l10 3 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M44 87 l-9 4 l9 5 Z" fill="#5B9BD5" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M34 92 l-8 5 l10 3 Z" fill="#8FC86C" stroke="' + INK + '" stroke-width="2"/>' +
    '<g stroke="#8A9BAE" stroke-width="3.4" fill="none" stroke-linecap="round">' +
    '<path d="M20 34 h-12 M24 24 l-8 -8 M20 60 q-8 0 -12 4"/></g>'
};

/* 图 SVG 工厂：itemSvg(id, size)——size 缺省 100；根组 g[data-anim]=id（契约 M 锚） */
function itemSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="100" height="100"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + id + '">' + ITEM_ELS[id] + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 云下小伞（如果下雨主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="18" cy="14" r="5.5" fill="#BACBDC" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="26" cy="13" r="6.5" fill="#9FB4C8" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M13 21 Q22 30 31 21 q-3 2 -5 0 q-2 2 -4 0 q-2 2 -4 0 q-2 2 -5 -1 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="1.6" stroke-linejoin="round"/>' +
    '<path d="M22 25 v9 q0 3 -3 3" fill="none" stroke="#8A5A2B" stroke-width="2"/>' +
    '<path d="M14 33 l-1 3 M18 35 l-1 3 M27 34 l1 3" stroke="#5B9BD5" stroke-width="1.6" stroke-linecap="round"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 勾选徽章（多件题 .held 卡右上角绿圆白勾） */
  check: '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M4 13 l5.5 5.5 L20 6.5" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 「带好啦」提交钮：小背包+大对勾（multi/best 多件题提交入口，weather v2 先例） */
  go: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M20 22 v-6 a12 9 0 0 1 24 0 v6" stroke="#FFF9EE" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<rect x="14" y="20" width="36" height="32" rx="9" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="3"/>' +
    '<path d="M23 35 l6.5 6.5 L43 29" stroke="#6FA063" stroke-width="5.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
