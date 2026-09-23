/* ================= area 铺砖面积游戏数据（r14 难度改造 2026-09-15 / 章型重排 / 时长模型 / 场景 SVG 工具）
   【r14 改造定稿（AUDIT-78 area 行：ch1 数格子/ch2 二选一=学前、全程无真面积计算 → 升真算）】
   ① ch1 calc 算一算：矩形挖空区+长宽标注 → 面积=长×宽 / 周长=2×(长+宽) 真算（数字卡 3 选 1；
      干扰=典型错（面积题混周长/半周，周长题混面积/半周）+近误 ±1/±2——长宽对调积与真值恒等
      不可作干扰（代换为半周 L+W 典型错），防"数形状轮廓"策略：必须做乘法/加法运算）
   ② ch3 combo 拼砖组：3-4 块砖拼合面积=多砖之和（部分和结构；干扰=部分和（漏加一块典型错）+近误）
   ③ ch4 unit2 一格代二：图上 G 格 × 2 = 真值（比例换算；干扰恒含 G（忘换算典型错）+2G±2）
   ④ ch2 samearea 一样大：正解=与挖空区同面积不同形状（canonical 互异——防轮廓匹配捷径，
      必须逐格点数），干扰=面积 ±1 近误
   ⑤ 反启发式锚：同数值跨题正解+干扰双现 ≥5（verify ⑧ 计数断言）
   ⑥ r14 时长模型（crd r12 范式）：quizDur=max(voiceWin, DECIDE_MS[kind])+ADV；
      estMs = s => s.length * 345 + 600（b25 定版，全字符口径——四方同步：
      源常量+本注释+verify estMsV+build.py 字面 assert）
   语音（§0.18 与 manifest games=['area'] 严格一致）：r14 既有 16 条（教学/提示/反馈 6+数数句 10）
   + T46 阶段2（2026-09-19）80 条（题面 ar_ask_4+ar_calc_30 + 确认句 ar_cf_46）；
   题面/确认句 clip 化后 keyless TTS 仅存防御回退（§0.23 文本兜底）
   几何（§0.35 本款铁律）：工地格 CELL=46 / 砖卡格 BCELL=26 / 组合砖展示格 CCELL=34，
   全部 rect 的 x,y,w,h 均为整数坐标（格线对齐整数坐标，禁 CSS 像素拼凑误差）——verify 侧逐 rect 断言 */
'use strict';

const INK = '#4A3B2E';

/* ---------- 演出时序常量（r14；estMs 全字符口径同 b25/b39 家族） ---------- */
const ENTER_MS = 400;                          // 新题出场窗（与题面句 say 并行）
const STAGE_MS = 400;                          // 题内步推进窗（本款单步题型，家族形式保留）
const RIGHT_WAIT = 2000;                       // 选对后 right clip 主体窗（ar_right ≈2.4s）
const LINE_TAIL = 400;                         // 确认句 TTS 收尾余量
const estMs = s => s.length * 345 + 600;       // b25 定版：SAPI ~345ms/字+600（全字符口径）

/* ---------- r14 时长模型（门禁硬断言；认知步主体非演出窗——AUDIT-78 根因对策）
   每题单步：quizDur = max(voiceWin, DECIDE_MS[kind]) + ADV(一次)。
   voiceWin 首步 = ENTER 400 + estMs(题面句) + 300。
   DECIDE_MS（7-8 岁二年级认知决策推算；r12 crd 5-6 岁 like=10000 参照——本批年龄升但
   从纯知觉点数升为表内乘法/两步合成运算，量级持平定版）：
   count 8000（热身数格子 1-8 格：逐格扫视点数 ~700-900ms/格+三数字卡扫读+确认）
   calcarea 11000（长宽标签读入 2000+表内乘法口诀检索（二年级 2-5 档 2500）+干扰含
                周长/半周典型错须复核运算对象（辨面辨周 2500）+三卡扫读+确认 1500）
   calcperim 11500（周长两步合成：L+W 再加倍，比单步口诀多一步运算+1000；同上辨析）
   samearea 9000（挖空区点数 3-4 格+三卡逐卡点数+等量比对——正解异形状，轮廓匹配失效必须数格）
   combo 10500（3-4 块砖逐块点数（每块 1-4 格 1200-1800）+连加部分和工作记忆保持 4000+比对）
   unit2 11000（点数 G 格 2500+×2 翻倍换算 2000+"G 陷阱"干扰辨析（忘换算卡在场须区分 G 与
              2G）2500+三卡扫读+确认）
   ADV = RIGHT_WAIT 2000 + estMs(确认句) + LINE_TAIL 400（选对演出窗一次/题：
   right clip 主体+数值确认句完整朗读巩固——b17 P2-2 同款路径）。
   验算（题面句最长=unit2 17 字 estMs 6465+700=7165 < 11000——语音窗从不撑时长；最短
   count 7 字 3715 < 8000）：每章 5 题——ADV 依确认句位数（1 位数值 11 字 est 4395 →
   ADV 6795；14 字句 est 5430 → ADV 7830；unit2 2G 两位 15 字 → 8175）：
   ch1 calc 关 ≥ 3×(11000+6795) + 2×(11500+7830) = 92045（实测 92735-93425）
   ch2 关 = count 14795 + 4×samearea 15795 = 77975（恒值：G 恒 1 位）
   ch3 关 = 14795 + 4×combo 18330 = 88115（实测至 89150，T 恒 1 位 6..12）
   ch4 关 ≥ 14795 + 4×unit2 18830 = 90115（实测 90460-91150，2G≥10 时 ADV 8175）
   ——40 关 modeled 最低 = 77975（dch2 关恒值；verify ⑭ 独立副本复算 +
   AR_DMIN_MIN === 77975 精确断言防回漂），恒 ≥ LEVEL_MIN_MS 40000（r14 门禁）。 ---------- */
const DECIDE_MS = { count: 8000, calcarea: 11000, calcperim: 11500, samearea: 9000, combo: 10500, unit2: 11000 };
const LEVEL_MIN_MS = 40000;                    // 单关 modeled 下限硬断言（r14 门禁，7-8 岁口径）
/* 题型→认知步型（calc 按子型分流面积/周长） */
const kindOf = q => q.kind === 'calc' ? (q.sub === 'perim' ? 'calcperim' : 'calcarea') : q.kind;
/* 题面朗读句（voiceWin 预算源）与选对确认句（ADV 预算源）——与 main confirmSpeak 同口径 */
const cueSayOf = q => askOf(q);
const advSayOf = q => {
  if (q.kind === 'calc' && q.sub === 'perim') return '一圈 ' + q.ans + ' 格，' + VOICE.right.text;
  if (q.kind === 'combo') return '一共 ' + q.ans + ' 格，' + VOICE.right.text;
  if (q.kind === 'unit2') return '一共 ' + q.ans + ' 只，' + VOICE.right.text;
  return String(q.kind === 'samearea' ? q.ans : (q.hole ? q.hole.length : q.ans)) + ' 格，' + VOICE.right.text;
};
const advMs = q => RIGHT_WAIT + estMs(advSayOf(q)) + LINE_TAIL;
const stepVoiceMs = (q, k) => k === 0 ? (ENTER_MS + estMs(cueSayOf(q)) + 300) : STAGE_MS;
const quizDurMs = q => Math.max(stepVoiceMs(q, 0), DECIDE_MS[kindOf(q)]) + advMs(q);
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 章配置（r14 四型；章号 1 基；hint=章末预告**下一章**文案（家族 F 契约——
   CHAPTERS[i].hint=第 i+1 章预告，非本章内容；CHAPTERS[4].hint=泛生成关预告（不指型——
   生成关四型随机，指型文案由生成支实算 GEN_HINTS[genLevel(f+1).dch-1] 承担）） ---------- */
const CHAPTERS = {
  1: { name: '算一算',   hint: '比一比谁的格子多' },     // 完成第 1 章预告第 2 章
  2: { name: '比一比',   hint: '几块砖拼成一大块' },     // 预告第 3 章
  3: { name: '拼砖组',   hint: '一格能住两只小蚂蚁' },   // 预告第 4 章
  4: { name: '一格代二', hint: '新的铺砖挑战要来啦' }    // 完成第 4 章预告生成关（泛文案不指型）
};
const GEN_HINTS = ['算一算面积挑战', '比一比面积挑战', '拼砖组合挑战', '一格代二挑战'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章
/* ch1 题内子型构成（确定性爬升：面积×3 → 周长×2；qi0-2 长宽 ≤4（积 ≤16 教学
   watch ≤16s 预算），qi3-4 放开到 5（积 ≤20，排除 5×5=25 撑爆工地/教学窗）） */
const CALC_COMPOSE = ['area', 'area', 'area', 'perim', 'perim'];

/* ---------- 语音文案（key=clip 名，text=TTS 兜底；与 manifest 严格一致 §0.18，
   r14 六键文案一字不改沿用 b17 定稿；wrong 专属 clip ar_wrong（§0.24） ---------- */
const VOICE = {
  watch: { key: 'ar_tut_watch', text: '看！数一数格子' },
  turn:  { key: 'ar_tut_turn',  text: '你来铺一铺' },
  hint:  { key: 'ar_hint',      text: '数一数格子想一想' },
  right: { key: 'ar_right',     text: '铺好啦，真整齐' },
  wrong: { key: 'ar_wrong',     text: '再数一数格子' },
  tip:   { key: 'ar_tip',       text: '数数格子再选砖' }
};
/* 题面问句（7-8 岁识字量可读；核心指令由语音承载：开场链 tip + 读题，§0.19；
   T46 阶段2 题面句全 clip 化（ar_ask_ 与 ar_calc_ 族，缺 clip 走 §0.23 文本兜底）
   calc 问句动态含长宽数值（chip 文字+SVG 侧长宽标签双通道编码，语音通道读出数字） */
const ASK = {
  count:    '挖空区有几格？',
  samearea: '哪块砖和挖空区一样大？',
  combo:    '这些砖拼在一起，一共几格？',
  unit2:    '每格住 2 只小蚂蚁，一共住几只？'
};
function calcAsk(sub, L, W) {
  return sub === 'area' ? '长 ' + L + ' 宽 ' + W + '，铺满要几格？'
                        : '长 ' + L + ' 宽 ' + W + '，一圈是几格边？';
}
const askOf = q => q.kind === 'calc' ? calcAsk(q.sub, q.L, q.W) : ASK[q.kind];
/* 题面句 clip 键（T46 阶段2 2026-09-19）：ar_ask_* 4 静句 + ar_calc_{area|peri}_L_W 15对×2；
   calc 生成域 L,W∈[2,5] 积≤20（genCalc 排除 5×5）与 manifest 注册域一致——扩域前先注册 clip */
const askKeyOf = q => q.kind === 'calc'
  ? 'ar_calc_' + (q.sub === 'area' ? 'area' : 'peri') + '_' + q.L + '_' + q.W
  : 'ar_ask_' + q.kind;
/* 数数句 clip：ar_count_N（'N 格'，SPEC §2） */
const cKey = n => 'ar_count_' + n;

/* ---------- 砖块形状池（七 kind 两两 canonical 互异（game-core.canonCells））
   —— 面积：b1=1 b2=2 b3=3 l3=3 sq=4 t4=4 z4=4（同面积异形状组：3={b3,l3} 4={sq,t4,z4}，
   r14 samearea 章正解取自同面积异组——防轮廓匹配） ---------- */
const SHAPES = {
  b1: [[0, 0]],
  b2: [[0, 0], [1, 0]],
  b3: [[0, 0], [1, 0], [2, 0]],
  sq: [[0, 0], [1, 0], [0, 1], [1, 1]],
  l3: [[0, 0], [0, 1], [1, 1]],
  t4: [[0, 0], [1, 0], [2, 0], [1, 1]],
  z4: [[0, 0], [1, 0], [1, 1], [2, 1]]
};
const KINDS = Object.keys(SHAPES);

/* ---------- 场景配色（家族暖底体系，§0.10 深棕描边可辨） ---------- */
const CELL = 46;                                    // 工地格边长（SVG 单位）
const BCELL = 26;                                   // 砖卡格边长（SVG 单位）
const CCELL = 34;                                   // 拼砖组展示格边长（SVG 单位）
const GROUND = { fill: '#F3E7D0', line: '#D9C5A6' };
const BRICK = { fill: '#E8975A', stroke: '#4A3B2E' };

/* ---------- 工地网格 SVG（网格=挖空区包围盒外扩 padding，≤5×5）
   淡土底格 + 挖空格橙色高亮；挖空格 class="hole-cell" data-x data-y
   —— 数格子 lit/counted 与铺好 filled 状态由 CSS 驱动
   calc 题：挖空区=完整 L×W 矩形 + 长宽标注（.dim-long 长 N 居下 /.dim-wide 宽 N 居右，
   文字=题面数据非答案——答案=积/和须儿童自算）；全部 rect 整数坐标（§0.35），
   viewBox 留 pad=3 防描边裁剪（calc 加右侧/下侧标注余量） ---------- */
function siteSvg(q) {
  const W = q.GW, H = q.GH;
  const inHole = {};
  q.hole.forEach(p => { inHole[p[0] + ',' + p[1]] = 1; });
  let g = '';
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const rx = x * CELL, ry = y * CELL;
    if (inHole[x + ',' + y])
      g += '<rect class="hole-cell" data-x="' + x + '" data-y="' + y + '" x="' + rx + '" y="' + ry +
        '" width="' + CELL + '" height="' + CELL + '" rx="4" fill="' + BRICK.fill +
        '" stroke="' + BRICK.stroke + '" stroke-width="1.8"/>';
    else
      g += '<rect class="gnd" x="' + rx + '" y="' + ry + '" width="' + CELL + '" height="' + CELL +
        '" rx="4" fill="' + GROUND.fill + '" stroke="' + GROUND.line + '" stroke-width="1.4"/>';
  }
  let labels = '', exR = 0, exB = 0;
  if (q.kind === 'calc' && q.L) {                 // 长宽标注（r14 delta①：题面给长宽）
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    q.hole.forEach(p => {
      if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0];
      if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1];
    });
    const cx = (x0 + x1 + 1) / 2 * CELL, by = (y1 + 1) * CELL,
          rx = (x1 + 1) * CELL, cy = (y0 + y1 + 1) / 2 * CELL;
    labels = '<text class="dim-long" x="' + cx + '" y="' + (by + 34) + '" text-anchor="middle">长 ' + q.L + '</text>' +
      '<text class="dim-wide" x="' + (rx + 14) + '" y="' + (cy + 9) + '" text-anchor="start">宽 ' + q.W + '</text>';
    exR = 96; exB = 48;
  }
  const pad = 3;
  return '<svg class="scene" viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (W * CELL + 2 * pad + exR) + ' ' +
    (H * CELL + 2 * pad + exB) + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    g + labels + '</svg>';
}

/* ---------- 拼砖组展示 SVG（r14 combo：N 块砖横排展示，砖间空 1 格；无工地网格——
   拼合面积须逐块点数相加（部分和），不给整体挖空区防"数整体"绕过加法）。
   全部 rect CCELL 整数倍坐标（§0.35 几何精确） ---------- */
function comboSvg(q) {
  let ox = 0, parts = '', maxH = 0;
  q.bricks.forEach(b => {
    let mx = 0, my = 0;
    b.cells.forEach(p => { if (p[0] > mx) mx = p[0]; if (p[1] > my) my = p[1]; });
    const w = (mx + 1) * CCELL, h = (my + 1) * CCELL;
    if (h > maxH) maxH = h;
    b.cells.forEach(p => {
      parts += '<rect class="cb" x="' + (ox + p[0] * CCELL) + '" y="' + (p[1] * CCELL) +
        '" width="' + CCELL + '" height="' + CCELL + '" rx="4" fill="' + BRICK.fill +
        '" stroke="' + BRICK.stroke + '" stroke-width="1.8"/>';
    });
    ox += w + CCELL;                              // 砖间空 1 格
  });
  const W = ox - CCELL, pad = 3;
  return '<svg class="scene combos" viewBox="' + (-pad) + ' ' + (-pad) + ' ' + (W + 2 * pad) + ' ' +
    (maxH + 2 * pad) + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    parts + '</svg>';
}

/* ---------- 砖块形状卡 SVG（cells 须为 norm 姿态；格线整数坐标 BCELL 倍数） ---------- */
function brickSvg(cells) {
  let mx = 0, my = 0;
  cells.forEach(p => { if (p[0] > mx) mx = p[0]; if (p[1] > my) my = p[1]; });
  let s = '';
  cells.forEach(p => {
    s += '<rect x="' + (p[0] * BCELL) + '" y="' + (p[1] * BCELL) + '" width="' + BCELL + '" height="' +
      BCELL + '" rx="3" fill="' + BRICK.fill + '" stroke="' + BRICK.stroke + '" stroke-width="1.7"/>';
  });
  const pad = 3;
  return '<svg viewBox="' + (-pad) + ' ' + (-pad) + ' ' + ((mx + 1) * BCELL + 2 * pad) + ' ' +
    ((my + 1) * BCELL + 2 * pad) + '" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    s + '</svg>';
}

/* ---------- 图标（全部内嵌 SVG，无外链） ---------- */
const ICONS = {
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="5" y="22" width="16" height="9" rx="2" fill="#E8975A" stroke="#FFF" stroke-width="2.2"/>' +
    '<rect x="23" y="22" width="16" height="9" rx="2" fill="#C7793F" stroke="#FFF" stroke-width="2.2"/>' +
    '<rect x="14" y="11" width="16" height="9" rx="2" fill="#F8D494" stroke="#FFF" stroke-width="2.2"/>' +
    '<rect x="9" y="30" width="12" height="7" rx="2" fill="#8FBF7F" stroke="#FFF" stroke-width="2"/>' +
    '<rect x="23" y="30" width="12" height="7" rx="2" fill="#8FBF7F" stroke="#FFF" stroke-width="2"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="#4A3B2E" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="#4A3B2E" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M13 34 L27 48 L51 18" stroke="#FFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  /* 数格子按钮图标：三格小砖 + 计数点（与玩法同几何语言，非装饰） */
  countIco: '<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3" y="14" width="15" height="15" rx="2.5" fill="#FFF" opacity=".95"/>' +
    '<rect x="21" y="14" width="15" height="15" rx="2.5" fill="#FFF" opacity=".95"/>' +
    '<rect x="12" y="28" width="15" height="9" rx="2.5" fill="#FFF" opacity=".6"/>' +
    '<circle cx="28.5" cy="8.5" r="6.5" fill="#FFF"/>' +
    '<text x="28.5" y="11.5" text-anchor="middle" font-size="9.5" font-weight="800" fill="#E8975A" font-family="PingFang SC, Microsoft YaHei, sans-serif">3</text></svg>',
  /* 题面小图标：砖墙两三层（与场景同视觉语言） */
  wallMini: '<svg viewBox="0 0 58 58" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="36" width="22" height="14" rx="2.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="30" y="36" width="22" height="14" rx="2.5" fill="#C7793F" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="17" y="19" width="22" height="14" rx="2.5" fill="#F8D494" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="43" y="19" width="9" height="14" rx="2.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="4" y="19" width="9" height="14" rx="2.5" fill="#F8D494" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="30" y="4" width="8" height="12" rx="2.5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2" stroke-dasharray="4 3"/></svg>'
};
