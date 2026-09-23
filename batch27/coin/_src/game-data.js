/* ================= coin 硬币认钱 游戏数据（r38 难度加深：SPEC-R38-COIN）
   钱币封闭 7 / rev 候选封闭 4 / 物品封闭 6 / 组合开放 2-4 枚 / 章配置 / 语音文案与段链 / SVG
   七题型：coin·bill 认面额（基线）+ rev 反向认币（r38：文字牌→钱币图卡去标签，防识字泄漏；
   候选=3 硬币+1元纸币，同值异类陷阱）+ sameval 同值辨析（基线）+ combo 数钱（r38 开放化：
   2-4 枚算法生成，和值 22 域+近值干扰，遗留 3 组走册内整句 clip 快径）+ chg 找零（r38：
   付 1 元买角价物/付 5 元买元价物）+ min 最少几枚（r38：贪心策略题）。
   语音：在册键直接接（coi_q/coi_q2/coi_say_c_ 系列/coi_cf_ 系列）；新题型走 KIDS.voice.queue 段链
   （quizPartsOf/confirmPartsOf 构造——_selftest 纯函数直调断言，r37 M1 范式）；
   §R6 新键 39 条未注册期 queue 缺 clip=整句静默放弃（core 语义），注册后即有声。
   点错 = 卡摇头 + coi_wrong + 引导键段（GUIDE 10 键——近对/颜色/大小方向/枚数方向/
   硬币纸币类），1000ms 防重入窗后可重选（探索不罚）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const SILVER = '#DCE1E8', GOLD = '#E8C069';  // 硬币双色（银白/金色——颜色线索）

/* ---------- 钱币封闭 7（SPEC-BATCH27 §0.61→65：硬币 3 + 纸币 4，表外不出题）
   jiao=面额角值（统一记账单位：1 元=10 角）；text=面额文字卡口径；
   主色：jiao1/yuan1 银白 / jiao5 金色 / 纸币绿紫蓝黑棕；硬币半径 r：1元>5角>1角（大小线索）
   flower=硬币花卉（一角兰花/五角荷花/一元菊花——近对辨析辅助线索） */
const MONEY = {
  jiao1:  { n: '一角硬币', kind: 'coin', jiao: 1,   text: '1角',  color: 'silver', flower: '兰花', r: 34 },
  jiao5:  { n: '五角硬币', kind: 'coin', jiao: 5,   text: '5角',  color: 'gold',   flower: '荷花', r: 42 },
  yuan1:  { n: '一元硬币', kind: 'coin', jiao: 10,  text: '1元',  color: 'silver', flower: '菊花', r: 50 },
  yuan1p: { n: '一元纸币', kind: 'bill', jiao: 10,  text: '1元',  color: 'green',  num: '1' },
  yuan5:  { n: '五元纸币', kind: 'bill', jiao: 50,  text: '5元',  color: 'purple', num: '5' },
  yuan10: { n: '十元纸币', kind: 'bill', jiao: 100, text: '10元', color: 'blue',   num: '10' },
  yuan20: { n: '二十元纸币', kind: 'bill', jiao: 200, text: '20元', color: 'brown', num: '20' }
};
const ALL7 = Object.keys(MONEY);             // 封闭 7 集
const COIN3 = ['jiao1', 'jiao5', 'yuan1'];   // ch1 硬币三兄弟池
const BILL4 = ['yuan1p', 'yuan5', 'yuan10', 'yuan20']; // ch2 纸币池

/* 面额文字卡封闭 8（任务书面额口径：阿拉伯数字+角/元） */
const T8 = ['1角', '5角', '1元', '5元', '10元', '20元', '1元5角', '2元'];

/* ---------- 组合遗留 3（combo 快径：命中此表的多重集走册内整句 clip coi_say_c_ 系列与
   coi_cf_c_ 系列；开放生成的其余多重集走段链。jiao=组合角值；text=组合文字卡（答案=和值文字，开放化后统一） */
const COMBOS = {
  c_yj_j: { coins: ['yuan1', 'jiao5'], jiao: 15, text: '1元5角',
            say: '一枚一元，一枚五角，一共是多少钱', confirm: '一元加五角，是一元五角' },
  c_j5j5: { coins: ['jiao5', 'jiao5'], jiao: 10, text: '1元',
            say: '两个五角，一共是多少钱', confirm: '两个五角，就是一元' },
  c_yy:   { coins: ['yuan1', 'yuan1'], jiao: 20, text: '2元',
            say: '两枚一元，一共是多少钱', confirm: '两个一元，是两元' }
};
const COMBO_IDS = Object.keys(COMBOS);

/* ---------- r38 新表（SPEC-R38 §R1/§R3；置于 COMBO_IDS 之后——不进 gen_clips COMBOS 段
   提取 span、不匹配 MONEY 正则（字段名 cn/price/pay，无 n:/kind:/say:/confirm: 模式）） */
const R4C = ['jiao1', 'jiao5', 'yuan1', 'yuan1p'];  /* rev 候选封闭 4（3 硬币+1元纸币陷阱） */
/* 找零物品封闭 6（价签固定；角价付 1 元=10 角、元价付 5 元=50 角；找零=pay−price） */
const ITEMS = {
  soda:    { cn: '汽水',   price: 6,  pay: 'yuan1p' },
  candy:   { cn: '棒棒糖', price: 8,  pay: 'yuan1p' },
  sticker: { cn: '贴纸',   price: 9,  pay: 'yuan1p' },
  balloon: { cn: '气球',   price: 3,  pay: 'yuan1p' },
  book:    { cn: '绘本',   price: 30, pay: 'yuan5' },
  blocks:  { cn: '积木',   price: 40, pay: 'yuan5' }
};
const CHG_JIAO = ['soda', 'candy', 'sticker', 'balloon'];   /* ch4 角级找零池 */
const CHG_YUAN = ['book', 'blocks'];                        /* ch2 元级找零池（每关双全出场） */
/* 最少几枚目标域：1-40 角剔贪心>4 枚值共 16 个（域 24 值——r38 M3 勘正：原注释 7 值集为笔误，SPEC §R3 已同步） */
const greedyOf = v => Math.floor(v / 10) + Math.floor((v % 10) / 5) + (v % 5);
const MIN_TARGETS = [];
for (let v = 1; v <= 40; v++) if (greedyOf(v) <= 4) MIN_TARGETS.push(v);

/* ---------- 和值文字（阿拉伯口径，与 T8/遗留组合一致）与解析（弃封闭 8 表） */
const SUM_CN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八' };
function sumText(v) {          /* 4→'4角' / 15→'1元5角' / 20→'2元'（v∈[1,50] 角） */
  const y = Math.floor(v / 10), j = v % 10;
  return y ? (y + '元' + (j ? j + '角' : '')) : (j + '角');
}
function textJiao(t) {         /* '2元6角'→26 / '4角'→4 / '5元'→50（不认识=0） */
  const m = /^(\d+)元(\d+)角$|^(\d+)元$|^(\d+)角$/.exec(t);
  if (!m) return 0;
  if (m[1]) return (+m[1]) * 10 + (+m[2]);
  if (m[3]) return (+m[3]) * 10;
  return +m[4];
}
/* 值→语音段键（段链用；j=9 构造不可达——和值/找零域 j∈0-8，SPEC §R3 域论证） */
const vWordKeys = v => {
  const y = Math.floor(v / 10), j = v % 10, ks = [];
  if (y) ks.push({ key: 'coi_v_y' + y, text: SUM_CN[y] + '元' });
  if (j) ks.push({ key: 'coi_v_j' + j, text: SUM_CN[j] + '角' });
  return ks;
};
/* 硬币枚数段（combo 开放读题/确认枚举） */
const NSEG = { jiao1: { key: 'coi_n1', text: '一枚一角' },
               jiao5: { key: 'coi_n5', text: '一枚五角' },
               yuan1: { key: 'coi_n10', text: '一枚一元' } };
const comboSig = coins => coins.map(c => MONEY[c].jiao).join('-');
/* 多重集→遗留组合 id（快径判定；coins 须已按角值降序） */
const legacyOf = coins => {
  const sig = comboSig(coins);
  for (const id of COMBO_IDS) if (comboSig(COMBOS[id].coins) === sig) return id;
  return null;
};

/* ---------- 语音段链构造（纯函数，_selftest/verify 直调断言——r37 M1 范式；
   全部返回 {key,text} 段数组；单段题由 main 用 play 播，多段用 queue（段间 150ms） */
function quizPartsOf(q) {
  const k = q.kind;
  if (k === 'coin' || k === 'bill') return [{ key: 'coi_q', text: '这是多少钱' }];
  if (k === 'rev') return [{ key: { jiao1: 'coi_q_r1', jiao5: 'coi_q_r5', yuan1: 'coi_q_r10' }[q.face],
                             text: '哪个是' + MONEY[q.face].n }];
  if (k === 'sameval') return [{ key: 'coi_q2', text: '哪个和它一样多？' }];
  if (k === 'combo') {
    const lg = legacyOf(q.coins);
    if (lg) return [{ key: 'coi_say_' + lg, text: COMBOS[lg].say }];
    return q.coins.map(c => ({ key: NSEG[c].key, text: NSEG[c].text }))
      .concat([{ key: 'coi_q_sum', text: '一共是多少钱' }]);
  }
  if (k === 'chg') {
    const it = ITEMS[q.item];
    return [{ key: 'coi_it_' + q.item, text: it.cn + '，' + cnOf(it.price) },
            { key: it.pay === 'yuan1p' ? 'coi_q_pay1' : 'coi_q_pay5',
              text: it.pay === 'yuan1p' ? '付了一元' : '付了五元' },
            { key: 'coi_q_chg', text: '应该找回多少钱' }];
  }
  /* min */
  return [{ key: 'coi_q_min0', text: '要付' }].concat(vWordKeys(q.target))
    .concat([{ key: 'coi_q_min1', text: '最少用几枚硬币' }]);
}
function confirmPartsOf(q) {
  const k = q.kind;
  if (k === 'coin' || k === 'bill' || k === 'rev') return [{ key: 'coi_cf_' + q.face, text: '这是' + cnOf(MONEY[q.face].jiao) }];
  if (k === 'sameval') return [{ key: q.face === 'yuan1' ? 'coi_cf_sv_1' : 'coi_cf_sv_2',
                                 text: q.face === 'yuan1' ? '一元硬币和一元纸币一样多' : '一元纸币和一元硬币一样多' }];
  if (k === 'combo') {
    const lg = legacyOf(q.coins);
    if (lg) return [{ key: 'coi_cf_c_' + lg, text: COMBOS[lg].confirm }];
    const sum = q.coins.reduce((s, c) => s + MONEY[c].jiao, 0);
    return [{ key: 'coi_v_gt', text: '一共是' }].concat(vWordKeys(sum));
  }
  if (k === 'chg') {
    const change = MONEY[ITEMS[q.item].pay].jiao - ITEMS[q.item].price;
    return [{ key: 'coi_cf_chg', text: '找回' }].concat(vWordKeys(change));
  }
  const n = greedyOf(q.target);
  const MTXT = ['一枚就够了', '两枚就够了', '三枚就够了', '四枚，正好用完'];
  return [{ key: 'coi_cf_min' + n, text: MTXT[n - 1] }];
}

/* ---------- 近对封闭 2 对（双向表；文字卡题里近对体现在面额文字互混）
   jiao1↔yuan1：同银白数字 1，区分=大小+菊花兰花 / jiao1↔yuan1p：数字同 1，角 vs 元 */
const NEAR = { jiao1: ['yuan1', 'yuan1p'],
               yuan1: ['jiao1'], yuan1p: ['jiao1'] };
const NEAR_PAIRS = [['jiao1', 'yuan1'], ['jiao1', 'yuan1p']];

/* sameval 答案互指表（封闭 7 里唯一同值对：1 元硬币↔1 元纸币） */
const SAMEVAL = { yuan1: 'yuan1p', yuan1p: 'yuan1' };

/* ---------- 题面句（按题型；rev=动态「哪个是X硬币？」由 renderScene 拼） */
const QUIZ_TEXT = { coin: '这是多少钱？', bill: '这是多少钱？',
                    sameval: '哪个和它一样多？', combo: '一共是多少钱？',
                    chg: '应该找回多少钱？', min: '最少用几枚硬币？' };
/* 角值→汉字面额读法（TTS 拼句用）：1角/5角/1元/5元/10元/20元/1元5角/2元
   r38：CN 扩 1-9+整十（chg 物品价签读法 六角/三元 等——MONEY 面额值 1/5/10/50/100/200
   映射不变，gen_clips _coi_cn 独立表不受影响） */
function cnOf(jiao) {
  const yuan = Math.floor(jiao / 10), j = jiao % 10;
  /* 试玩 P1-2：CN 表缺 10/20 → yuan10/yuan20 确认句播「这是undefined元」（12 次/会话）；
     2 用「两」（量词前口语，与 COMBOS 文案「两枚一元」一致——试玩 P3-a） */
  const CN = { 1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九',
               10: '十', 20: '二十', 30: '三十', 40: '四十' };
  if (yuan && j) return CN[yuan] + '元' + CN[j] + '角';
  if (yuan) return CN[yuan] + '元';
  return CN[j] + '角';
}

/* ---------- 错反馈引导句表（按所点项线索引导；锚定三线索，不否定人格）
   silver 银白近对（jiao1↔yuan1 大小辨析，任务书指定原话）/ unit 数字同 1 角元辨析（任务书指定原话）/
   color 金色线索（jiao5 相关错）/ num 纸币大数字线索 / comboHi·Lo 组合·找零大小方向 /
   seek 同值找同钱 / def 兜底（数字+颜色）
   r38 新三键：kind rev 点了纸币（要找硬币）/ minHi·minLo 枚数方向（点多了/点少了） */
const GUIDE = { silver: '都是银色，要看大小哦，大的是一元',
                unit:   '数字一样，角和元不一样哦',
                color:  '看看颜色，金色的是五角',
                num:    '看看上面的大数字',
                comboHi: '没有那么多钱哦',
                comboLo: '不止这些，再算一算',
                seek:   '要找一样多的钱哦',
                def:    '看看数字，再看看颜色',
                kind:   '要找圆圆的硬币哦',
                minHi:  '硬币不用那么多哦',
                minLo:  '还不够哦，再想一想' };

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）——r38 谱刷新
   ch1 加 rev 反向认币 / ch2 纸币+元级找零 / ch3 同值+开放数钱 / ch4 算钱大挑战（角级找零+最少几枚）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b26 审查 M3：nextHint 生成关分支实算 genLevel(f+1).dch-1） */
const CHAPTERS = {
  1: { name: '硬币三兄弟',   hint: '纸币和找零要来啦' },      // 预告 ch2 纸币+买东西
  2: { name: '纸币和买东西', hint: '一样多的钱和数一数来啦' }, // 预告 ch3 同值+数钱
  3: { name: '一样多和数一数', hint: '买东西算钱，大挑战来啦' }, // 预告 ch4 找零+最少几枚
  4: { name: '算钱大挑战',   hint: '新一轮认钱开始啦' }        // 预告生成关
};
const GEN_HINTS = ['硬币翻一面，再认一认',       // dch1 硬币正反认
                   '纸币和找零，再练一练',       // dch2 纸币+元级找零
                   '数钱要数仔细哦',           // dch3 同值+开放数钱
                   '算钱大集合，想好了再选'];    // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   六包装 watch/turn/hint/right/wrong/q；确认句/引导句/组合题面句=TTS 拼句（本表文案）
   clip 实长（SPEC-BATCH27 §4）：watch 2976/turn 1752/hint 2232/right 2472/wrong 2568/q 1944 */
const VOICE = {
  watch: { key: 'coi_tut_watch', text: '看！这是多少钱' },
  turn:  { key: 'coi_tut_turn',  text: '你来认一认' },
  hint:  { key: 'coi_hint',      text: '看看上面的数字' },
  right: { key: 'coi_right',     text: '认对啦，真能干' },
  wrong: { key: 'coi_wrong',     text: '再看看数字和颜色' },
  q:     { key: 'coi_q',         text: '这是多少钱' }
};

/* ---------- 钱币 SVG（三线索齐全：面上大字面额数字+单位字+主色+硬币花卉；全内联禁外链）
   硬币 viewBox 0 0 120 120：直径=r*2（1元 100>5角 84>1角 68——大小视觉可感）；
   花卉在数字上方（兰花/荷花/菊花三花互异——近对辅助辨析线索），随币径缩放
   （视觉抽检 2026-09-10：花卉放大 ~1.4x 保 82px sameval 小卡上仍可辨；
   大数字下加小单位字「角/元」——贴近真实钱币，与纸币「元」字口径一致） */
const FLOWER = {
  /* 兰花（一角）：三瓣小花（中瓣大两侧瓣斜）+ 芯点（以 0,0 为花心，由 coinBody 定位缩放） */
  lan: '<g>' +
    '<ellipse rx="4" ry="8" fill="#C9A0C4" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<ellipse rx="3.4" ry="7" fill="#E3B9DE" stroke="' + INK + '" stroke-width="1.4" transform="rotate(-38)"/>' +
    '<ellipse rx="3.4" ry="7" fill="#E3B9DE" stroke="' + INK + '" stroke-width="1.4" transform="rotate(38)"/>' +
    '<circle r="1.8" fill="' + INK + '"/></g>',
  /* 荷花（五角）：三层尖瓣（中高侧低）+ 水平瓣缘 */
  he: '<g>' +
    '<path d="M0 -9 C -4.5 -3 -4.5 4 0 7 C 4.5 4 4.5 -3 0 -9 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M-7 -2 C -10 2 -8 6 -3 6 C -6 2 -6 -1 -7 -2 Z" fill="#F7D2DA" stroke="' + INK + '" stroke-width="1.4"/>' +
    '<path d="M7 -2 C 10 2 8 6 3 6 C 6 2 6 -1 7 -2 Z" fill="#F7D2DA" stroke="' + INK + '" stroke-width="1.4"/>' +
    '<path d="M-8 6 Q 0 10 8 6" stroke="' + INK + '" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>',
  /* 菊花（一元）：八瓣放射（黄瓣深芯） */
  ju: '<g>' +
    [0, 45, 90, 135, 180, 225, 270, 315].map(a =>
      '<ellipse rx="2.6" ry="7" fill="#F5C445" stroke="' + INK + '" stroke-width="1.2" transform="rotate(' + a + ')"/>'
    ).join('') +
    '<circle r="3.2" fill="#E8975A" stroke="' + INK + '" stroke-width="1.4"/></g>'
};
const TEETH = r => '<circle cx="60" cy="60" r="' + (r - 3.5) + '" fill="none" stroke="' + INK +
  '" stroke-width="1.4" stroke-dasharray="2.6 3.4" opacity=".55"/>';   // 硬币边齿（一圈短齿）
/* 硬币元素表：外圈主色+边齿+花卉（fy 花心 y / fk 花缩放，随币径放大）+
   大字面额数字 + 数字下小单位字（角/元——真实钱币版式，识字线索） */
const COIN_ELS = {
  jiao1: coinBody(SILVER, 34, FLOWER.lan, 38, 1.25, '1', '角', 22, 77, 10.5, 90),
  jiao5: coinBody(GOLD,   42, FLOWER.he,  37, 1.45, '5', '角', 30, 80, 12.5, 95),
  yuan1: coinBody(SILVER, 50, FLOWER.ju,  34, 1.6,  '1', '元', 38, 86, 14.5, 104)
};
function coinBody(fill, r, flower, fy, fk, num, unit, fs, ny, ufs, uy) {
  return '<circle cx="60" cy="60" r="' + r + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="3"/>' +
         TEETH(r) +
         '<g transform="translate(60,' + fy + ') scale(' + fk + ')">' + flower + '</g>' +
         '<text x="60" y="' + ny + '" text-anchor="middle" font-size="' + fs +
         '" font-weight="bold" fill="' + INK + '" font-family="Arial,sans-serif">' + num + '</text>' +
         '<text x="60" y="' + uy + '" text-anchor="middle" font-size="' + ufs +
         '" font-weight="bold" fill="' + INK + '" font-family="KaiTi,STKaiti,sans-serif">' + unit + '</text>';
}
/* 纸币元素表（viewBox 0 0 150 70）：主色底+左侧花团纹+右侧大数字+左上小面额字 */
const BILL_COLORS = { green: '#A8C98A', purple: '#B49BC9', blue: '#5C6E80', brown: '#C0946A' };
const BILL_ELS = {
  yuan1p: billBody('green', '1'),
  yuan5:  billBody('purple', '5'),
  yuan10: billBody('blue', '10'),
  yuan20: billBody('brown', '20')
};
function billBody(color, num) {
  const c = BILL_COLORS[color];
  return '<rect x="3" y="3" width="144" height="64" rx="7" fill="' + c + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="9" y="9" width="132" height="52" rx="4" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity=".5"/>' +
    '<g fill="none" stroke="' + INK + '" stroke-width="1.6" opacity=".65">' +
    '<circle cx="34" cy="35" r="14"/><circle cx="34" cy="35" r="9"/>' +
    '<path d="M20 35 q7 -8 14 0 q7 8 14 0" opacity=".7"/>' +
    '<circle cx="34" cy="35" r="2.4" fill="' + INK + '" stroke="none"/></g>' +
    '<text x="112" y="46" text-anchor="middle" font-size="' + (num.length > 1 ? 30 : 36) +
    '" font-weight="bold" fill="#FFF" stroke="' + INK + '" stroke-width="1.2" font-family="Arial,sans-serif">' + num + '</text>' +
    '<text x="126" y="30" font-size="13" font-weight="bold" fill="' + INK + '" font-family="KaiTi,STKaiti,sans-serif">元</text>';
}
/* 钱币 SVG 工厂：moneySvg(id, w, h)——硬币按钱币原比例（大小线索），纸币 150:70 横幅 */
function moneySvg(id, w) {
  const m = MONEY[id];
  if (!m) return '';
  if (m.kind === 'coin') {
    const s = w ? ' width="' + w + '" height="' + w + '"' : ' width="132" height="132"';
    return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
           COIN_ELS[id] + '</svg>';
  }
  const s = w ? ' width="' + w + '" height="' + Math.round(w * 70 / 150) + '"' : ' width="150" height="70"';
  return '<svg viewBox="0 0 150 70"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
         BILL_ELS[id] + '</svg>';
}

/* ---------- 题面钱桌背景（viewBox 0 0 360 184；钱币由 JS 注入 .money-slot，
   小兔子示范由 JS 注入 .demo-pet）——上浅暖墙+下木桌面+角落硬币堆意象 */
const COIN_STACK = (x, y, k) =>
  '<g transform="translate(' + x + ' ' + y + ') scale(' + k + ')">' +
  '<ellipse cx="0" cy="0" rx="16" ry="6" fill="' + SILVER + '" stroke="' + INK + '" stroke-width="2.2"/>' +
  '<ellipse cx="-2" cy="-5" rx="16" ry="6" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2.2"/>' +
  '<ellipse cx="1" cy="-10" rx="16" ry="6" fill="' + SILVER + '" stroke="' + INK + '" stroke-width="2.2"/></g>';
function tableSvg() {
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#F9EFDD"/>' +
    '<circle cx="42" cy="34" r="15" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M42 11 v-5 M65 34 h5 M42 57 v5 M19 34 h-5" stroke="#E8975A" stroke-width="2.6" stroke-linecap="round"/>' +
    '<g fill="none" stroke="' + INK + '" stroke-width="2" opacity=".35">' +
    '<rect x="252" y="40" width="60" height="44" rx="3"/><rect x="316" y="52" width="34" height="32" rx="2"/></g>' +
    '<g fill="#FFF" opacity=".7"><rect x="260" y="47" width="9" height="9"/><rect x="274" y="47" width="9" height="9"/>' +
    '<rect x="288" y="47" width="9" height="9"/><rect x="260" y="61" width="9" height="9"/>' +
    '<rect x="274" y="61" width="9" height="9"/><rect x="288" y="61" width="9" height="9"/></g>' +
    '<path d="M0 96 h360" stroke="' + INK + '" stroke-width="3" opacity=".4"/>' +
    '<rect x="0" y="96" width="360" height="88" fill="#EAD9B8"/>' +
    '<path d="M0 96 h360 M0 184 h360" stroke="none"/>' +
    '<g fill="none" stroke="' + INK + '" stroke-width="1.8" opacity=".3">' +
    '<path d="M30 130 q30 8 60 0 M270 150 q30 -8 60 0 M120 168 q30 8 60 0"/></g>' +
    COIN_STACK(52, 150, 1.0) + COIN_STACK(312, 142, 0.85) +
    '</svg>';
}

/* ---------- r38 找零物品 SVG（描线风 90×90，主色族内暖色+INK 描边；chg 题面=物品+价签+付出的纸币） */
const ITEM_SVG = {
  soda: '<svg viewBox="0 0 90 90" width="86" height="86" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 30 h34 l-4 46 a5 5 0 0 1 -5 4 h-16 a5 5 0 0 1 -5 -4 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M31 44 h28 l-2.6 30 a3 3 0 0 1 -3 3 h-16.8 a3 3 0 0 1 -3 -3 Z" fill="#FFF" opacity=".55"/>' +
    '<path d="M38 30 l4 -18 l12 6" fill="none" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="44" cy="58" r="3" fill="' + INK + '" opacity=".5"/><circle cx="54" cy="64" r="2.4" fill="' + INK + '" opacity=".4"/></svg>',
  candy: '<svg viewBox="0 0 90 90" width="86" height="86" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="45" cy="34" r="18" fill="#F5C445" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M45 24 a10 10 0 0 1 9 6 a12 12 0 0 0 -9 -2 a12 12 0 0 0 -9 2 a10 10 0 0 1 9 -6 Z" fill="#FFF" opacity=".6"/>' +
    '<path d="M27 34 l-12 8 l7 4 l-7 4 l12 4" fill="#E89AAE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M63 34 l12 8 l-7 4 l7 4 l-12 4" fill="#E89AAE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M45 52 v26 M40 66 l5 6 l5 -6" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sticker: '<svg viewBox="0 0 90 90" width="86" height="86" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="10" y="10" width="70" height="70" rx="10" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-dasharray="7 5"/>' +
    '<path d="M45 22 l6.5 13.5 l14.8 2 l-10.7 10.3 l2.6 14.7 L45 55.5 l-13.2 7 l2.6 -14.7 L23.7 37.5 l14.8 -2 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="41" cy="42" r="2" fill="' + INK + '"/><circle cx="49" cy="42" r="2" fill="' + INK + '"/>' +
    '<path d="M41 48 q4 3.6 8 0" fill="none" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/></svg>',
  balloon: '<svg viewBox="0 0 90 90" width="86" height="86" xmlns="http://www.w3.org/2000/svg">' +
    '<ellipse cx="45" cy="34" rx="19" ry="23" fill="#A8C98A" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="38" cy="27" rx="5.5" ry="7" fill="#FFF" opacity=".55"/>' +
    '<path d="M42 57 h6 l-1.5 5 h-3 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M45 62 q-7 8 0 14 q7 6 0 12" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/></svg>',
  book: '<svg viewBox="0 0 90 90" width="86" height="86" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="16" y="14" width="58" height="62" rx="5" fill="#B49BC9" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="16" y="14" width="12" height="62" rx="5" fill="#9C7FB8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M36 30 h28 M36 42 h28 M36 54 h20" stroke="#FFF" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>' +
    '<path d="M22 18 v54" stroke="' + INK + '" stroke-width="2" opacity=".4"/></svg>',
  blocks: '<svg viewBox="0 0 90 90" width="86" height="86" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="12" y="52" width="32" height="26" rx="4" fill="#5C6E80" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="46" y="52" width="32" height="26" rx="4" fill="#C0946A" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="29" y="24" width="32" height="26" rx="4" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="40" cy="24" r="2.4" fill="' + INK + '"/><circle cx="50" cy="24" r="2.4" fill="' + INK + '"/>' +
    '<circle cx="23" cy="52" r="2.4" fill="' + INK + '"/><circle cx="33" cy="52" r="2.4" fill="' + INK + '"/>' +
    '<circle cx="57" cy="52" r="2.4" fill="' + INK + '"/><circle cx="67" cy="52" r="2.4" fill="' + INK + '"/></svg>'
};

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 一元硬币元素 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="22" cy="22" r="13" fill="' + GOLD + '" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="22" cy="22" r="10" fill="none" stroke="' + INK + '" stroke-width="1" stroke-dasharray="1.6 2" opacity=".6"/>' +
    '<text x="22" y="27" text-anchor="middle" font-size="12" font-weight="bold" fill="' + INK + '" font-family="Arial,sans-serif">5</text></svg>',
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
