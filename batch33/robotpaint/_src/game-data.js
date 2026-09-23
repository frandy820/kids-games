/* ================= 机器画师 robotpaint 游戏数据 r18（属性三轴封闭 / 五题型 / 章配置 /
   语音文案 + estMs 时长模型 / 属性图案 SVG 工厂）
   r18 难度改造（2026-09-18，AUDIT-78 黄款 robotpaint：「核心=看着目标抄三属性」）：
   从「照抄」升级「想清楚再画」——四路认知加深 + 块池防位置查表：
     ①plain 三轴组指令（基础形态——全档恒三槽，ch1 即完整三指令）
     ②neg 否定指令（ch2+）：否定轴呈「排除值打叉」卡（封闭集补集推理：轴内排除
       n-1 值→剩余唯一=目标值；dch2 排除 1 轴 / dch4 排除 2 轴），正轴呈属性块图
     ③edit 两步修改（ch2+）：画布已有起始画（start 三元组），目标卡呈修改指令
       （from✗→to✓ 芯片行），儿童组装终态填槽（dch2 改 1 轴 / dch4 改 2 轴）
     ④mem 记忆复现（ch3）：目标短时呈现（闪现窗=estMs(句)+300 实算——家族 T）
       后罩住，凭记忆复现；错后比对相位揭示重编码，回 pick 再罩
     ⑤dual 双画师并行（ch3）：两目标卡并排 + 两画布并行任务（工作记忆分叉），
       依次指挥两位画师（任务一判对→槽复位→任务二；quiz miss 累计两任务）
     ⑥块池 r18：轴分组恒序（色 3/形 3/大小 2 连续段）+ 组内 seeded 打乱——
       同轴多值干扰恒全摆（非目标属性全量在场），值-位置查表失效
   章配置：每关 6 题（CH_LEN 5→6，键基迁移 IIFE 见 main）/静态 24 关=4 章；
   ch1 plain / ch2 neg+edit / ch3 mem+dual / ch4 生成 seeded mulberry32(flat*7919+1151)
   五题型混出（KIND_POOL）。星级=miss 口径（错=整题重画，点「画！」才判）。
   语音链：开题链按题型分流（plain=rp_q / neg=rp_neg / edit=rp_edit / dual=rp_dual /
   mem=闪现句 keyless TTS 单段链——恒尾，契约 N）；确认链 [rp_right, 名音×槽序]
   （三段恒）；错链 [rp_wrong, rp_hint] 豁免窗 5010（契约 I）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- estMs 定版（b25 家族 T 全字符口径；四方同步之一：data 本处定义/verify 独立
   定义/build est_ms 字面断言/_selftest est_ms 运行时对账；main 不重复声明直接使用） ---------- */
const estMs = s => s.length * 345 + 600;     // SAPI ~345ms/字 + 600 落定余量（全字符含标点）

/* ---------- 属性封闭三轴（SPEC §0.81：表外不出题；目标空间 3×3×2=18 组合） ---------- */
const COLORS = ['red', 'yel', 'blu'];
const SHAPES = ['cir', 'squ', 'tri'];
const SIZES  = ['big', 'small'];
const AXES = ['color', 'shape', 'size'];     // 槽位固定序（槽 0/1/2）
const AXIS_LABEL = { color: '颜色', shape: '形状', size: '大小' };
const AXIS_POOL = { color: COLORS, shape: SHAPES, size: SIZES };   // 轴封闭集（r18 组内打乱基）
const ITEMS = {
  red:   { axis: 'color', n: '红色',  fill: '#DF5B48' },
  yel:   { axis: 'color', n: '黄色',  fill: '#F2C14E' },
  blu:   { axis: 'color', n: '蓝色',  fill: '#5B9BD5' },
  cir:   { axis: 'shape', n: '圆形' },
  squ:   { axis: 'shape', n: '方形' },
  tri:   { axis: 'shape', n: '三角形' },
  big:   { axis: 'size',  n: '大大的' },
  small: { axis: 'size',  n: '小小的' }
};
const nameOf = id => ITEMS[id].n;
const axisOf = id => ITEMS[id].axis;

/* ---------- 章配置（r18：每关 6 题 / 每章 6 关，静态 24 关；生成关 flat≥24 恒 dch=4
   五题型混出）。hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（生成关 dch 恒 4 → 恒取 GEN_HINTS[3]，实算不硬编码） ---------- */
const CHAPTERS = {
  1: { name: '说清楚', hint: '有的指令打了叉，要动动脑筋' },   // 预告 ch2 否定+两步修改
  2: { name: '动脑筋', hint: '看一眼记住它，两位小画师来啦' }, // 预告 ch3 记忆+双画师
  3: { name: '记得住', hint: '什么挑战都会出现' },            // 预告 ch4 生成混出
  4: { name: '大挑战', hint: '新一轮大挑战' }                 // 预告生成关
};
const GEN_HINTS = ['说清楚三条指令',            // dch1（生成关不出现，表完整）
                   '打了叉的不能用，动动脑筋',  // dch2 neg/edit
                   '看一眼记住它',              // dch3 mem/dual
                   '什么挑战都有，说清楚就画得像']; // dch4 五题型混出
const CH_LEN = 6;          // r18：6 题 = 1 关（v1=5 → 键基迁移 IIFE 见 game-main）
const STATIC_LEVELS = 24;  // r18：静态 24 关 = 4 章 × 6 关（生成关 flat≥24）

/* ---------- 题型族（r18 五 kind；dch→pool seeded 逐题取）----------
   plain=三轴组指令 / neg=否定指令（排除值打叉）/ edit=两步修改（start+修改指令）
   / mem=记忆复现（闪现后罩住）/ dual=双画师并行（两目标两画布依次指挥） ---------- */
const KIND_POOL = {
  1: ['plain'],
  2: ['neg', 'edit'],
  3: ['mem', 'dual'],
  4: ['plain', 'neg', 'edit', 'mem', 'dual']
};
const NEG_AXES_N  = { 2: 1, 4: 2 };   // neg 否定呈现轴数（dch2 一轴 / dch4 两轴）
const EDIT_AXES_N = { 2: 1, 4: 2 };   // edit 修改指令轴数（dch2 一处 / dch4 两处）
/* 答案级 breathe 章表（r18：dch2+ 才 miss≥2 指错轴——首错方向级不指轴） */
const DCH_BREATHE = { 1: false, 2: true, 3: true, 4: true };

/* ---------- mem 闪现句（T46 化：rp_mem clip 单段链；闪现窗=estMs(句长)+300 预算冻结——
   clip 实长 3960 ≤ 6765 恒安全，行为零变） ---------- */
const MEM_TEXT = '看清楚啦，把它记住，等一会儿画出来';   // 17 字符（含标点）
const FLASH_WIN = estMs(MEM_TEXT) + 300;                 // 6765：目标呈现窗（家族 T 实算·estMs 吃字符串）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=rp_ 已核
   manifest 无占用 ✓ 2026-09-11；r18 新增 rp_neg/rp_edit/rp_dual 已核无撞名 ✓ 2026-09-18）。
   clip 实长（SPEC-BATCH33 §4 表 + r18 新三键浏览器 Audio 实测 2026-09-18）：
   tut_watch 3384 / tut_turn 2016 / hint 2712 / right 3216 / wrong 1848 / q 2040 /
   go 1176 / like 1752 / neg 3600 / edit 3768 / dual 3792 / mem 3960（T46 化 09-19）；
   名音 rp_n_*：red 1416 / yel 1416 / blu 1416 / cir 1416 / squ 1440 / tri 1656（max）/
   big 1488 / small 1560——
   作画演出窗=go 1176+3×800+300=3876（paint 相位锁定窗）；
   比对像=like 1752+300=2052 前导+确认链 [rp_right, 名音×3 槽序]
   3216+150+3×1656+300=8634（r18 全档三槽恒三段）；
   错链=1848+150+2712+300=5010（契约 I 豁免窗）。 ---------- */
const VOICE = {
  watch:  { key: 'rp_tut_watch', text: '看！小画师要画画啦' },
  turn:   { key: 'rp_tut_turn',  text: '你来当小老师' },
  hint:   { key: 'rp_hint',      text: '哪不一样呀，再看看' },
  right:  { key: 'rp_right',     text: '画得真像，你真是好老师' },
  wrong:  { key: 'rp_wrong',     text: '哪不一样呀' },
  q:      { key: 'rp_q',         text: '说清楚要什么' },
  go:     { key: 'rp_go',        text: '画！' },
  like:   { key: 'rp_like',      text: '画得真像' },
  neg:    { key: 'rp_neg',       text: '打了叉的不能用，想想该画哪个' },
  edit:   { key: 'rp_edit',      text: '小画师画好啦，按新指令改一改' },
  dual:   { key: 'rp_dual',      text: '两位小画师等你指挥，一个一个来' },
  mem:    { key: 'rp_mem',       text: MEM_TEXT }            // T46 化：mem 闪现句 clip（原 keyless TTS）
};
const nameClip = id => 'rp_n_' + id;        // 名音键（晓晓读中文属性名，8 互异）
const CLIP_DUR = {                           // SPEC §4+r18 实长表（verify ±60ms 对账依据）
  rp_tut_watch: 3384, rp_tut_turn: 2016, rp_hint: 2712, rp_right: 3216,
  rp_wrong: 1848, rp_q: 2040, rp_go: 1176, rp_like: 1752,
  rp_neg: 3600, rp_edit: 3768, rp_dual: 3792,
  rp_mem: 3960,                              // T46 化 mem 闪现句（voice/clips Audio 实测 09-19）
  rp_n_red: 1416, rp_n_yel: 1416, rp_n_blu: 1416, rp_n_cir: 1416,
  rp_n_squ: 1440, rp_n_tri: 1656, rp_n_big: 1488, rp_n_small: 1560
};
const MAX_NAME_DUR = 1656;                   // 名音 max（rp_n_tri）
const GO_MS = 1176;                          // 「画！」播报（tapGo 起播）
const PAINT_STEP_MS = 800;                   // 作画单属性段（颜色底/形状轮廓/大小缩放）
const PAINT_WIN = GO_MS + 3 * PAINT_STEP_MS + 300;   // 3876：paint 相位锁定窗（SPEC §4）
const LIKE_WIN = 1752 + 300;                 // 比对像前导窗（rp_like+300）
const CONFIRM_WIN = 3216 + 150 + 3 * 1656 + 300;     // 确认链三段=8634（r18 恒三槽）
const WRONG_CHAIN_MS = 5010;                 // 错链豁免窗 = 1848+150+2712+300（契约 I）

/* ---------- r18 时长模型（§-r18 §4；estMs 四方同步=data 本处/verify 独立定义/build
   est_ms 字面断言/_selftest est_ms——认知步主体非演出窗）：
   每题 dur = max(voiceWin, DECIDE_MS[kind]) + PERF_RIGHT_MS；
   voiceWin(q) = 开题链实长+300（plain=rp_q 2040+300 / neg=3600+300 / edit=3768+300 /
   dual=3792+300 / mem=estMs(17)+300=6765——keyless 闪现句）；
   DECIDE_MS（7-8 岁单题认知推算）：plain 8000（读目标三属性+按槽序组指令+三填一画）
   / neg 12000（否定轴封闭集补集推理：排除 2 推 1（dch4 双否定轴×2）+正轴直读+组装）
   / edit 11000（读起始画三属性+应用修改指令（from✗→to✓）+终态保持组装——两步态）
   / mem 10500（闪现窗内三属性编码+保持+复现提取）/ dual 17000（双任务绑定+干扰抑制
   +任务一切换任务二的状态管理，双倍组指令）。
   语音窗恒 ≤DECIDE（max mem 6765 ≤ 10500）。
   PERF_RIGHT_MS=14262（判对演出链实码：go 1176+3×800 作画 + like 2052 + 确认 8634）；
   OPEN_MS=900（开题渲染落定）；LEVEL_MIN_MS=40000（家族门禁）。
   modeled(flat)=OPEN_MS+Σ每题 dur；全 40 关 modeled 最低值=134472（ch1 全 plain 关
   flat0-5 同值：900+6*(8000+14262)）——verify+_selftest 双钉精确断言（禁约数）。 ---------- */
const OPEN_MS = 900;
const DECIDE_MS = { plain: 8000, neg: 12000, edit: 11000, mem: 10500, dual: 17000 };
const PERF_RIGHT_MS = GO_MS + 3 * PAINT_STEP_MS + LIKE_WIN + CONFIRM_WIN;   // 14262
const LEVEL_MIN_MS = 40000;
const OPENER_KEY = { plain: 'rp_q', neg: 'rp_neg', edit: 'rp_edit', dual: 'rp_dual' };  // mem=rp_mem（T46 化）
const voiceWinMs = q => q.kind === 'mem' ? estMs(MEM_TEXT) + 300
                                          : CLIP_DUR[OPENER_KEY[q.kind]] + 300;
const quizDurMs = q => Math.max(voiceWinMs(q), DECIDE_MS[q.kind]) + PERF_RIGHT_MS;
const levelDurMs = L => OPEN_MS + L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);
const modeled = flat => levelDurMs(genLevel(flat | 0));

/* ---------- 属性图案 SVG 工厂（目标卡/成品画布共用——纯 SVG 属性自明，无文字）
   propSvg(t, opts)：t={color,shape,size} 三元组；根组 g[data-prop] 带
   data-color/data-shape/data-size 三属性——契约 M 帧内容断言锚（渲染即引擎）。
   大小：big=基准半径 44 / small=25（同 viewBox 直观可辨）；
   ph（作画分相位标记）：'color' 段=色底淡入 / 'shape' 段=轮廓描线 / 'size' 段=缩放定尺
   ——JS 逐段驱动（paint 相位 ~800ms/段），settled=比对定格（动画全清）。 ---------- */
/* 元素统一带 fill="none" 占位（供外层按需替换填充色——三形状 replace 恒命中） */
function shapeEl(shape, r, ph) {
  const stroke = 'stroke="#4A3B2E" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"';
  const cls = ph ? ' class="paint-el ph-' + ph + '"' : '';
  if (shape === 'cir')
    return '<circle' + cls + ' data-part="shape" cx="60" cy="60" r="' + r + '" fill="none" ' + stroke + '/>';
  if (shape === 'squ') {
    const x = 60 - r, w = 2 * r;
    return '<rect' + cls + ' data-part="shape" x="' + x + '" y="' + x + '" width="' + w +
      '" height="' + w + '" rx="11" fill="none" ' + stroke + '/>';
  }
  /* tri：等边三角（顶点上），圆心 60,60 内切布局 */
  const cy = 60 + r * 0.42, h = r * 1.9;
  const ax = 60, ay = cy - h * 0.62, bx = 60 - r * 1.12, by = cy + h * 0.38,
        cx2 = 60 + r * 1.12, cy2 = cy + h * 0.38;
  return '<path' + cls + ' data-part="shape" d="M' + ax + ' ' + ay + ' L' + bx + ' ' + by +
    ' L' + cx2 + ' ' + cy2 + ' Z" fill="none" ' + stroke + '/>';
}
function propSvg(t, opts) {
  const o = opts || {};
  const r = t.size === 'big' ? 44 : 25;
  const fill = ITEMS[t.color] ? ITEMS[t.color].fill : '#DF5B48';
  const anchor = o.paint ? 'data-paint="1"' : 'data-target="1"';
  /* 分相位作画（paint 演出）：色底=同形状低透明色块 / 轮廓=描线 / 定尺=整体缩放。
     比对定格与目标卡=一次到位（色底+轮廓合成：色块垫底+描边形状盖上层） */
  if (o.ph === 'color') {                    /* 段 1：颜色底淡入（低透明色块） */
    return '<svg viewBox="0 0 120 120" width="118" height="118" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
      '<g ' + anchor + ' data-color="' + t.color + '" data-shape="' + t.shape + '" data-size="' + t.size + '">' +
      shapeEl(t.shape, r, 'color').replace('fill="none"', 'fill="' + fill + '" opacity=".55"') +
      '</g></svg>';
  }
  if (o.ph === 'shape') {                    /* 段 2：形状轮廓描线（dash 动画） */
    return '<svg viewBox="0 0 120 120" width="118" height="118" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
      '<g ' + anchor + ' data-color="' + t.color + '" data-shape="' + t.shape + '" data-size="' + t.size + '">' +
      shapeEl(t.shape, r, 'shape') + '</g></svg>';
  }
  if (o.ph === 'size') {                     /* 段 3：大小缩放定尺（小=zoom 收缩到尺寸） */
    return '<svg viewBox="0 0 120 120" width="118" height="118" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
      '<g ' + anchor + ' data-color="' + t.color + '" data-shape="' + t.shape + '" data-size="' + t.size + '">' +
      '<g class="paint-el ph-size">' + shapeEl(t.shape, r, null).replace('fill="none"', 'fill="' + fill + '"') +
      '</g></g></svg>';
  }
  /* 上面 size 段 transform 缩放基准：.paint-el 已声明 transform-box:fill-box（head CSS） */
  /* 一次到位（目标卡 / compare 定格） */
  return '<svg viewBox="0 0 120 120" width="118" height="118" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g ' + anchor + ' data-color="' + t.color + '" data-shape="' + t.shape + '" data-size="' + t.size + '">' +
    shapeEl(t.shape, r, null).replace('fill="none"', 'fill="' + fill + '"') +
    '</g></svg>';
}

/* ---------- 属性块小图标（块/槽填入/指令卡芯片共用；viewBox 0 0 120 120——属性自明：
   颜色=纯色圆片（色样）/ 形状=INK 描边灰白底形 / 大小=大圆 vs 小圆+虚线参照圈） ---------- */
const BLOCK_ELS = {
  red: c => swatch(c), yel: c => swatch(c), blu: c => swatch(c),
  cir: () => blockShape('cir'), squ: () => blockShape('squ'), tri: () => blockShape('tri'),
  big: () => '<circle cx="60" cy="60" r="44" fill="#F2DDC0" stroke="#4A3B2E" stroke-width="5"/>',
  small: () => '<circle cx="60" cy="60" r="46" fill="none" stroke="#C9A87C" stroke-width="3" stroke-dasharray="7 7"/>' +
    '<circle cx="60" cy="60" r="22" fill="#F2DDC0" stroke="#4A3B2E" stroke-width="5"/>'
};
function swatch(c) {
  return '<circle cx="60" cy="60" r="42" fill="' + ITEMS[c].fill + '" stroke="#4A3B2E" stroke-width="5"/>' +
    '<path d="M38 38 a30 30 0 0 1 16 -10" stroke="#FFF" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>';
}
function blockShape(s) { return shapeEl(s, 42, null).replace('fill="none"', 'fill="#F6EFE0"'); }
/* 图 SVG 工厂：blockSvg(id, size)——size 缺省 52；根组 g[data-val]=id（契约 M 锚） */
function blockSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="52" height="52"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-val="' + id + '">' + BLOCK_ELS[id](id) + '</g></svg>';
}

/* ---------- r18 指令卡（neg 否定卡 / edit 修改卡 / mem 罩卡——目标侧 pick 相位呈现）
   锚（契约 M）：.nrow/.erow data-axis + .nchip data-val + data-neg="1"（打叉排除值）
   + data-ok="1"（edit 目标值）+ .memcover data-covered="1"（mem 罩） ---------- */
function negCardHtml(q) {
  let rows = '';
  AXES.forEach(ax => {
    const neg = q.negMap && q.negMap[ax];
    let chips = '';
    if (neg && neg.length) {
      neg.forEach(v => {
        chips += '<span class="nchip neg" data-val="' + v + '" data-neg="1">' +
          blockSvg(v, 30) + '<i class="x"></i></span>';
      });
    } else {
      chips = '<span class="nchip" data-val="' + q.target[ax] + '">' + blockSvg(q.target[ax], 30) + '</span>';
    }
    rows += '<div class="nrow" data-axis="' + ax + '"><span class="nlab">' + AXIS_LABEL[ax] + '</span>' +
      '<span class="nchips">' + chips + '</span></div>';
  });
  return '<div class="negcard">' + rows + '</div>';
}
function editCardHtml(q) {
  let rows = '';
  q.edits.forEach(e => {
    rows += '<div class="erow" data-axis="' + e.axis + '">' +
      '<span class="nchip neg" data-val="' + e.from + '" data-neg="1">' + blockSvg(e.from, 30) + '<i class="x"></i></span>' +
      '<span class="earrow">&#8594;</span>' +
      '<span class="nchip ok" data-val="' + e.to + '" data-ok="1">' + blockSvg(e.to, 30) + '</span>' +
      '<span class="nlab">' + AXIS_LABEL[e.axis] + '</span></div>';
  });
  return '<div class="editcard">' + rows + '</div>';
}
const coverCardHtml = () =>
  '<div class="memcover" data-covered="1">' +
  '<svg viewBox="0 0 120 120" width="96" height="96" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
  '<rect x="14" y="10" width="92" height="100" rx="12" fill="#FFFDF6" stroke="#4A3B2E" stroke-width="4"/>' +
  '<path d="M46 52 a14 14 0 1 1 22 11 c-5 4 -8 7 -8 13" stroke="#E8975A" stroke-width="7" fill="none" stroke-linecap="round"/>' +
  '<circle cx="60" cy="90" r="4.6" fill="#E8975A"/></svg>' +
  '<div class="mc-txt">记住它啦</div></div>';

/* ---------- 小画师机器人（pick=持笔待命站画纸旁；paint=手臂作画摆动 class 驱动） ---------- */
function artistSvg(width) {
  const w = width || 130, h = Math.round(w * 150 / 130);
  return '<svg class="artist" viewBox="0 0 130 150" width="' + w + '" height="' + h +
    '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="65" cy="142" rx="34" ry="6" fill="#EADCC4" opacity=".7"/>' +
    '<g class="rb-lift">' +
      /* 天线 + 圆头 + LED 眼 + 微笑 + 贝雷帽（画师帽） */
      '<path d="M65 26 V14" stroke="#4A3B2E" stroke-width="3.6" stroke-linecap="round"/>' +
      '<circle cx="65" cy="10" r="5.5" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.6"/>' +
      '<circle cx="65" cy="44" r="26" fill="#FAF3E3" stroke="#4A3B2E" stroke-width="3.4"/>' +
      '<circle cx="55" cy="41" r="5" fill="#8CC3EA" stroke="#4A3B2E" stroke-width="2.2"/>' +
      '<circle cx="75" cy="41" r="5" fill="#8CC3EA" stroke="#4A3B2E" stroke-width="2.2"/>' +
      '<circle cx="56.6" cy="39.4" r="1.5" fill="#FFF"/>' +
      '<circle cx="76.6" cy="39.4" r="1.5" fill="#FFF"/>' +
      '<path d="M57 52 q8 7 16 0" stroke="#4A3B2E" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
      '<circle cx="49" cy="50" r="3.4" fill="#F2B8C6" opacity=".95"/>' +
      '<circle cx="81" cy="50" r="3.4" fill="#F2B8C6" opacity=".95"/>' +
      '<path d="M42 30 q23 -14 46 0 q-6 4 -23 4 q-17 0 -23 -4 Z" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2.6" stroke-linejoin="round"/>' +
      '<circle cx="92" cy="30" r="4.4" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="2.2"/>' +
      /* 身 + 围兜（调色盘标）+ 拿笔臂（class artist-arm=paint 相位摆动） */
      '<rect x="44" y="68" width="42" height="38" rx="10" fill="#F6E9D2" stroke="#4A3B2E" stroke-width="3.4"/>' +
      '<circle cx="55" cy="80" r="4" fill="#DF5B48"/><circle cx="65" cy="80" r="4" fill="#F2C14E"/>' +
      '<circle cx="75" cy="80" r="4" fill="#5B9BD5"/><path d="M55 92 h20" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/>' +
      '<g transform="translate(42 74) rotate(18)"><g class="artist-arm">' +
        '<rect x="-5" y="-2" width="10" height="26" rx="5" fill="#FAF3E3" stroke="#4A3B2E" stroke-width="2.6"/>' +
        '<g transform="translate(0 26) rotate(24)"><rect x="-3" y="0" width="6" height="22" rx="3" fill="#E8975A" stroke="#4A3B2E" stroke-width="2.2"/>' +
        '<path d="M0 22 l0 8" stroke="#4A3B2E" stroke-width="2.6" stroke-linecap="round"/></g>' +
      '</g></g>' +
      '<rect x="86" y="72" width="12" height="8" rx="4" fill="#E3D3B8" stroke="#4A3B2E" stroke-width="2.4"/>' +
      '<g transform="translate(50 104)"><rect x="-9" y="0" width="18" height="11" rx="5.5" fill="#E3D3B8" stroke="#4A3B2E" stroke-width="2.6"/></g>' +
      '<g transform="translate(80 104)"><rect x="-9" y="0" width="18" height="11" rx="5.5" fill="#E3D3B8" stroke="#4A3B2E" stroke-width="2.6"/></g>' +
    '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 贝雷帽画师头 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="#4A3B2E" stroke-width="2.6"/>' +
    '<circle cx="22" cy="25" r="10" fill="#FAF3E3" stroke="#4A3B2E" stroke-width="2.4"/>' +
    '<circle cx="18.5" cy="24" r="2" fill="#8CC3EA" stroke="#4A3B2E" stroke-width="1.2"/>' +
    '<circle cx="25.5" cy="24" r="2" fill="#8CC3EA" stroke="#4A3B2E" stroke-width="1.2"/>' +
    '<path d="M20 29 q2 2 4 0" stroke="#4A3B2E" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M13 20 q9 -6 18 0 q-3 2 -9 2 q-6 0 -9 -2 Z" fill="#8FBF7F" stroke="#4A3B2E" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
