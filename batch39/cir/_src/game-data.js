/* ================= cir 电路小灯泡 游戏数据 r4（章配置 / 语音 / 题面句表 / SPEC 20 题全表 / 电路板几何）
   玩法（SPEC-BATCH39 §3 r4 块，2026-09-13 难度批 r4——双答制+四题型故障诊断）：
   把回路拓扑从布景变成判定层主体（照 gear v3 双答制先例：先推理预测、答对钉住才开操作）。
   每题两段判定——阶段1 预判（ch1-3「灯会亮吗」亮/不亮二选；ch4「两盏灯会比一盏
   更亮吗」更亮/一样亮/更暗三选，'up' 恒非真值=误解干扰）→ 答对 'ok' 进阶段2
   （picks.dim 解除+预判钉 chip）；阶段2 选正确元件接缺口（含同尺寸死支路干扰：
   两根同尺寸候选，其中一根是死支路元件——按拓扑排除非按尺寸目测）。
   四题型真值律（§3 r4——verify specLitOf 与 python _verify_spec39r4.py 独立重列）：
   twogap  litAns = second.at !== 'main'（两缺口都在主环→只接一根不亮；第二缺口在
           死支路→接好即亮）
   fault   litAns = !short && blankAt !== 'main'（主路断口→不亮；死支路断口→亮；
           跨接线短路灯→不亮，阶段2=拆线卡）
   switch  litAns = !(branch && branch.bridge==='lamp' && branch.sw)（支路开关跨灯
           →合上短路→不亮；跨线段/开关在主路→亮）
   bright  brightAns = branch ? 'same' : 'down'（并联=一样亮；串联=更暗；'up'恒非真）
   布局记法 r4：主环槽 'B??L'（4 槽 sgl/sr2 板）与 'B??L?'（5 槽 tw 并联板承 v1）；
   死支路缺口槽追加为末槽（index 4）；blankAt='main'|'dead'（fault-F2 判定位在支路）。
   观察句=题面 clip 播报（voice.play cir_obs_ 章档键——T46 阶段2 clip 化，契约 N 仅约束
   queue 链）；确认链=[cir_right] 单 clip（全 clip 无 keyless——契约 N 天然安全）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）
const COPPER = '#C97E4A';                    // 导线铜色（电流可视锚）
const SHORTC = '#D96A5A';                    // 跨接线短路纹色（断/短可视分型锚）

/* ---------- 章配置（SPEC §3 r4：ch1 两缺口串联 / ch2 断短混合 / ch3 开关因果 / ch4 串并联亮度）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 双录对账）。
   obs=章档题面句（keyless TTS——r4 句表）：ch1 十字「接好这一根，灯会亮吗」/
   ch2 九字「闭合开关，灯会亮吗」/ch3 十一字「修好闭合开关，灯会亮吗」/
   ch4 十字「两盏灯会比一盏更亮吗」；
   obsWin=题面句窗=estMs(全字符)+300（家族 T）——estMs(10)+300=4350、estMs(9)+300=4005、
   estMs(11)+300=4695 ---------- */
const CHAPTERS = {
  1: { name: '接好断口', hint: '断口还是短路，找一找', obs: '接好这一根，灯会亮吗', obsKey: 'cir_obs_1', obsWin: 4350 },
  2: { name: '断路与短路', hint: '开关在哪条路上', obs: '闭合开关，灯会亮吗', obsKey: 'cir_obs_2', obsWin: 4005 },
  3: { name: '开关在哪里', hint: '两盏灯会更亮吗', obs: '修好闭合开关，灯会亮吗', obsKey: 'cir_obs_3', obsWin: 4695 },
  4: { name: '亮不亮，有多亮', hint: '新一轮修电路开始', obs: '两盏灯会比一盏更亮吗', obsKey: 'cir_obs_4', obsWin: 4350 }
};
const GEN_HINTS = ['两处断口，接好就亮',         // dch1（flat20-24 同档域成立）
                   '断路短路，先找一找',         // dch2
                   '开关在哪条路上',             // dch3
                   '两盏灯有多亮'];              // dch4
const CH_LEN = 5;          // 5 题 = 1 关（每关恒 5 个双答判定=5 块电路板逐块修好）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章（每章封闭题池 5 题，关内 rotate 取题——thanks 先例）

/* ---------- SPEC §3 r4 题库封闭 20 题全表（照录；字段：
   kind='twogap'|'fault'|'switch'|'bright' / blank 主环判定槽位号 / blankAt='dead'=判定位
   在死支路（槽号=追加末槽 4）/ need 判定缺口跨距档（F3 拆线卡题=null）/
   second={at:'main'|'dead', i, size} 第二缺口（main=兔子补主环另一位 / dead=死支路缺口
   ——dead 即同尺寸干扰源）/ branch={bridge:'lamp'|'seg', sw} 死支路（跨灯两端/跨线段，
   sw=支路带开关）/ short 跨接线短路灯在场 / sw 主路开关在场（fault 章与 switch-SW3）
   ch1（①-⑤ twogap）：A 两缺口主环×3 + B 主环+死支路×2
   ch2（⑥-⑩ fault）：F1 主路断口+死支路缺口(干扰)×2 + F2 死支路断口×2 + F3 短路×1
   ch3（⑪-⑮ switch）：SW1 支路开关跨灯×2 + SW2 跨线段×2 + SW3 主路开关×1
   ch4（⑯-⑳ bright）：SR 串联(sr2 板)×3 + PR 并联(tw 板)×2 ---------- */
const SPEC_TABLE = [
  { kind: 'twogap', blank: 1, need: 'M', second: { at: 'main', i: 3, size: 'L' } },   // ① ch1 A
  { kind: 'twogap', blank: 2, need: 'L', second: { at: 'main', i: 0, size: 'S' } },   // ② A
  { kind: 'twogap', blank: 0, need: 'S', second: { at: 'dead', size: 'S' } },         // ③ B（干扰）
  { kind: 'twogap', blank: 3, need: 'M', second: { at: 'main', i: 1, size: 'S' } },   // ④ A
  { kind: 'twogap', blank: 2, need: 'M', second: { at: 'dead', size: 'M' } },         // ⑤ B（干扰）
  { kind: 'fault', blank: 1, need: 'M', second: { at: 'dead', size: 'M' }, sw: true },// ⑥ ch2 F1（干扰）
  { kind: 'fault', blankAt: 'dead', need: 'L', sw: true },                            // ⑦ F2
  { kind: 'fault', blank: 3, need: 'S', second: { at: 'dead', size: 'S' }, sw: true },// ⑧ F1（干扰）
  { kind: 'fault', short: true, need: null, sw: true },                               // ⑨ F3 拆线卡
  { kind: 'fault', blankAt: 'dead', need: 'M', sw: true },                            // ⑩ F2
  { kind: 'switch', blank: 2, need: 'M', branch: { bridge: 'lamp', sw: true } },      // ⑪ ch3 SW1
  { kind: 'switch', blank: 0, need: 'S', branch: { bridge: 'seg', sw: true } },       // ⑫ SW2
  { kind: 'switch', blank: 1, need: 'L', branch: { bridge: 'lamp', sw: true } },      // ⑬ SW1
  { kind: 'switch', blank: 3, need: 'M', branch: { bridge: 'seg', sw: true } },       // ⑭ SW2
  { kind: 'switch', blank: 2, need: 'S', sw: true },                                  // ⑮ SW3
  { kind: 'bright', blank: 1, need: 'M' },                                            // ⑯ ch4 SR（sr2）
  { kind: 'bright', blank: 0, need: 'M', branch: { bridge: 'lamp' } },                // ⑰ PR（tw）
  { kind: 'bright', blank: 3, need: 'L' },                                            // ⑱ SR
  { kind: 'bright', blank: 0, need: 'L', branch: { bridge: 'lamp' } },                // ⑲ PR
  { kind: 'bright', blank: 0, need: 'S' }                                             // ⑳ SR
];
/* ---------- 演出时序常量（SPEC-BATCH39 §3 r4 实长表 2026-09-13；_clipdur39.json 真值源）
   cir_：tut_watch 2856 / tut_turn 1824 / hint 1968 / right 1968（判对后窗 ≥2268）/
   wrong 1848 / pred_wrong 3072 / bright_wrong 2544 ---------- */
const LIT_MS = 1400, FLOW_MS = 1600;             // 判对演出窗 3000 ≥ 确认链 1968+300=2268（家族 G/H；
                                                 // LIT_MS=落位+灯亮主窗，FLOW_MS=电流环流收尾窗）
const FULL_WIN = 2400;                           // 关末全板通电演出 ≥ 1968+300=2268（纯演出层）
const WRONG_CHAIN_WIN = 4266;                    // 元件错链豁免窗=1848+150+1968+300（真时钟，契约 I）
const WRONG_LOCK_1 = 1998;                       // 元件首错演出锁=wrong 1848+150（b37 R3+b38 R1 总窗口径：
                                                 // 禁叠尾窗常数——锁=1998 顶格，禁覆盖豁免窗 4266）
const PRED_CHAIN_WIN = 5490;                     // 预判错链豁免窗=pred_wrong 3072+150+1968+300（契约 I）
const PRED_LOCK_1 = 3222;                        // 预判首错锁=3072+150（总窗口径禁叠尾窗）
const BRIGHT_CHAIN_WIN = 4962;                   // 亮度错链豁免窗=bright_wrong 2544+150+1968+300
const BRIGHT_LOCK_1 = 2694;                      // 亮度首错锁=2544+150
const WRONG_LOCK_2 = 1000;                       // 二错起防重入锁
const PRED_OK_MS = 500;                          // 阶段1 答对钉住窗（+140 演出尾——gear DIR_OK_MS 先例）
const REVEAL_MS = 1800;                          // ch2 合开关亮真相窗（阶段1 答对后的即时验证）
const CUT_MS = 1000;                             // ch2-F3 拆线演出窗（跨接线移除）
const BUNNY_MS = 700;                            // 兔子补齐槽延迟（twogap-A 第二缺口/死支路缺口）
const NIGH_MS = 700;                             // 方向级缺口两端触点高亮节奏
const FIX_PART = 'M';                            // 已连固定槽导线档恒 M（中性统一——不泄缺口答案）

/* ---------- 导线跨距档（S/M/L 视觉可辨：56/84/112——差 ≥28px；候选线长=跨距+40 双通道） ---------- */
const SPAN = { S: 56, M: 84, L: 112 };

/* ---------- 阶段1 预判选项域（SPEC §3 r4：ch1-3 二选 / ch4 三选 'up' 恒非真值） ---------- */
const PRED_KINDS = { twogap: ['lit', 'dark'], fault: ['lit', 'dark'],
                     switch: ['lit', 'dark'], bright: ['up', 'same', 'down'] };
const PRED_LABELS = { lit: '会亮', dark: '不亮', up: '更亮', same: '一样亮', down: '更暗' };

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；cir_ 前缀 r4 增
   pred_wrong/bright_wrong 两键已核无占用 2026-09-13）。clip 实长（§3 r4 实长表）：
   tut_watch 2856 / tut_turn 1824 / hint 1968 / right 1968 / wrong 1848 /
   pred_wrong 3072 / bright_wrong 2544 ---------- */
const VOICE = {
  watch:      { key: 'cir_tut_watch',    text: '看！电路连起来' },
  turn:       { key: 'cir_tut_turn',     text: '你来连一连' },
  hint:       { key: 'cir_hint',         text: '看看哪里断了' },
  right:      { key: 'cir_right',        text: '小灯泡亮啦' },
  wrong:      { key: 'cir_wrong',        text: '还没连上哦' },
  predWrong:  { key: 'cir_pred_wrong',   text: '不对哦，顺着电线找一找' },
  brightWrong:{ key: 'cir_bright_wrong', text: '想想一盏灯有多亮' }
};

/* ---------- 电路板几何 r4（SVG viewBox 0 0 560 330）
   sgl=单灯 4 主槽（ch1-3 通用底板）：电池底部居中+灯顶部居中；主环 4 槽
   （s0 底左 B 电池侧 / s1 左上 / s2 右上 L 灯侧 / s3 右下含主路开关引线 swLead）；
   死支路两形态：branchSeg（跨线段——结点 J1(96,196)/J2(470,196)，走线下穿 y240，
   含支路开关 swAt+支路缺口 gap+小风扇 fanAt）/ branchLamp（跨灯两端——灯引脚
   224,60/336,60 上拱 y10，含支路开关 swAt；F3 跨接线复用同路径红纹无开关）；
   swLead=主路开关引线（s3 尾 380,293→电池右端子 330,293——fault/SW3 章开关画此）。
   sr2=两灯串联 4 槽（ch4-SR）：灯 170/390 顶部；tw=并联 5 槽（ch4-PR，承 v1 twin 板，
   干路左 s0=判定槽）。flows=电流粒子环流路径（sgl/sr2 单环 / tw 双环）。 ---------- */
const BOARD = {
  sgl: {
    vb: '0 0 560 330',
    lamps: [{ id: 1, cx: 280, cy: 60, l1: 224, l2: 336, ly: 60 }],
    batt: { x1: 230, x2: 330, y: 293 },
    slots: {
      0: { d: 'M 230 293 L 96 293',                     gap: { x: 163, y: 293, vert: false } },
      1: { d: 'M 96 293 L 96 60 L 224 60',              gap: { x: 96,  y: 178, vert: true } },
      2: { d: 'M 336 60 L 470 60 L 470 170',            gap: { x: 403, y: 60,  vert: false } },
      3: { d: 'M 470 174 L 470 293 L 380 293',          gap: { x: 470, y: 233, vert: true } }
    },
    swLead: { x1: 380, x2: 330, y: 293 },
    branchSeg: { j1: { x: 96, y: 196 }, j2: { x: 470, y: 196 },
                 d: 'M 96 196 L 170 196 L 170 240 L 390 240 L 390 196 L 470 196',
                 gap: { x: 280, y: 240, vert: false },
                 swAt: { x1: 170, y1: 196, x2: 170, y2: 240 },
                 fanAt: { x: 340, y: 240 } },
    branchLamp: { a: { x: 224, y: 60 }, b: { x: 336, y: 60 },
                  d: 'M 224 60 L 224 10 L 336 10 L 336 60',
                  swAt: { x1: 262, y1: 10, x2: 298, y2: 10 } },
    junctions: [{ x: 96, y: 196 }, { x: 470, y: 196 }],
    flows: ['M 230 293 L 96 293 L 96 60 L 336 60 L 470 60 L 470 293 L 330 293']
  },
  sr2: {
    vb: '0 0 560 330',
    lamps: [{ id: 1, cx: 170, cy: 60, l1: 114, l2: 226, ly: 60 },
            { id: 2, cx: 390, cy: 60, l1: 334, l2: 446, ly: 60 }],
    batt: { x1: 230, x2: 330, y: 293 },
    slots: {
      0: { d: 'M 230 293 L 96 293 L 96 60 L 114 60',    gap: { x: 96,  y: 178, vert: true } },
      1: { d: 'M 226 60 L 334 60',                      gap: { x: 280, y: 60,  vert: false } },
      2: { d: 'M 446 60 L 480 60 L 480 293',            gap: { x: 480, y: 170, vert: true } },
      3: { d: 'M 480 293 L 330 293',                    gap: { x: 405, y: 293, vert: false } }
    },
    swLead: null,
    junctions: [],
    flows: ['M 230 293 L 96 293 L 96 60 L 114 60 L 226 60 L 334 60 L 446 60 L 480 60 L 480 293 L 330 293']
  },
  twin: {
    vb: '0 0 560 330',
    lamps: [{ id: 1, cx: 196, cy: 60,  l1: 146, l2: 246, ly: 60 },
            { id: 2, cx: 322, cy: 196, l1: 272, l2: 372, ly: 196 }],
    batt: { x1: 230, x2: 330, y: 293 },
    slots: {
      0: { d: 'M 230 293 L 96 293 L 96 196',          gap: { x: 160, y: 293, vert: false } },
      1: { d: 'M 96 196 L 96 60 L 146 60',            gap: { x: 96,  y: 128, vert: true } },
      2: { d: 'M 246 60 L 500 60 L 500 196',          gap: { x: 360, y: 60,  vert: false } },
      3: { d: 'M 96 196 L 272 196',                   gap: { x: 184, y: 196, vert: false } },
      4: { d: 'M 372 196 L 500 196',                  gap: { x: 436, y: 196, vert: false } }
    },
    swLead: null,
    trunk: 'M 330 293 L 500 293 L 500 196',
    junctions: [{ x: 96, y: 196 }, { x: 500, y: 196 }],
    flows: ['M 330 293 L 500 293 L 500 60 L 146 60 L 96 60 L 96 293 L 230 293',
            'M 330 293 L 500 293 L 500 196 L 372 196 L 272 196 L 96 196 L 96 293 L 230 293']
  }
};
/* ---------- 灯泡 SVG（g.lamp[data-lamp]——契约 M 灯亮 DOM 断言锚：.on 类=亮 /
   .on.dim=串联弱光（ch4 亮度判断演示锚——弱光晕无光芒）；圆玻壳+灯丝+8 光芒线
   （.on 时浮现）+引脚两根（连导线槽端点）） ---------- */
function lampSvg(l) {
  let rays = '';
  for (let a = 0; a < 8; a++) {
    const rd = a * 45 * Math.PI / 180;
    rays += '<line x1="' + (l.cx + Math.cos(rd) * 34) + '" y1="' + (l.cy + Math.sin(rd) * 34) +
            '" x2="' + (l.cx + Math.cos(rd) * 46) + '" y2="' + (l.cy + Math.sin(rd) * 46) +
            '" stroke="#F2B33D" stroke-width="5" stroke-linecap="round"/>';
  }
  return '<g class="lamp" data-lamp="' + l.id + '">' +
    '<line x1="' + l.l1 + '" y1="' + l.ly + '" x2="' + (l.cx - 28) + '" y2="' + l.ly + '" stroke="' + INK + '" stroke-width="7"/>' +
    '<line x1="' + (l.cx + 28) + '" y1="' + l.ly + '" x2="' + l.l2 + '" y2="' + l.ly + '" stroke="' + INK + '" stroke-width="7"/>' +
    '<g class="rays">' + rays + '</g>' +
    '<circle class="glass" cx="' + l.cx + '" cy="' + l.cy + '" r="28" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
    '<path class="filament" d="M' + (l.cx - 12) + ' ' + l.cy + ' L' + (l.cx - 5) + ' ' + (l.cy - 9) +
      ' L' + l.cx + ' ' + l.cy + ' L' + (l.cx + 5) + ' ' + (l.cy - 9) + ' L' + (l.cx + 12) + ' ' + l.cy +
      '" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle class="halo" cx="' + l.cx + '" cy="' + l.cy + '" r="40" fill="#FFD966" opacity="0"/>' +
    '</g>';
}
/* 电池 SVG（g.batt：长盒+正负极标+两端子线头——环形底部铬件） */
function battSvg(b) {
  const cx = (b.x1 + b.x2) / 2;
  return '<g class="batt">' +
    '<rect x="' + b.x1 + '" y="' + (b.y - 17) + '" width="' + (b.x2 - b.x1) + '" height="34" rx="8"' +
    ' fill="#8A9BAE" stroke="' + INK + '" stroke-width="4"/>' +
    '<line x1="' + (cx - 26) + '" y1="' + (b.y - 8) + '" x2="' + (cx - 26) + '" y2="' + (b.y + 8) + '" stroke="#FFF9EE" stroke-width="6" stroke-linecap="round"/>' +
    '<line x1="' + (cx + 18) + '" y1="' + b.y + '" x2="' + (cx + 34) + '" y2="' + b.y + '" stroke="#FFF9EE" stroke-width="6" stroke-linecap="round"/>' +
    '</g>';
}
/* 开关 SVG（g.sw[data-anim="sw"]：底座两点+可动闸刀臂——.closed=合上（闸刀转正+
   触点亮点）；主路开关与支路开关共用，判定层不直接交互（合上=演出） */
function swSvg(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len, ny = dx / len;                        // 法向（闸刀抬起方向）
  return '<g class="sw" data-anim="sw">' +
    '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + mx + '" y2="' + my + '" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>' +
    '<line x1="' + mx + '" y1="' + my + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>' +
    '<circle cx="' + x1 + '" cy="' + y1 + '" r="5" fill="' + INK + '"/>' +
    '<circle cx="' + x2 + '" cy="' + y2 + '" r="5" fill="' + INK + '"/>' +
    '<line class="lever" x1="' + x1 + '" y1="' + y1 + '" x2="' + (mx + nx * 16 - dx / len * 6) + '" y2="' + (my + ny * 16 - dy / len * 6) +
      '" stroke="' + COPPER + '" stroke-width="7" stroke-linecap="round"/>' +
    '</g>';
}
/* 跨接线 SVG（g.jumper[data-anim="short"]：跨灯两端红纹弧线+两鳄鱼夹——断/短可视
   分型锚（断路=断口毛边 / 短路=红纹跨接）；拆线卡移除后淡出） */
function jumperSvg(a, b) {
  const lift = 46;
  return '<g class="jumper" data-anim="short">' +
    '<path d="M ' + a.x + ' ' + a.y + ' C ' + a.x + ' ' + (a.y - lift) + ' ' + b.x + ' ' + (b.y - lift) + ' ' + b.x + ' ' + b.y +
      '" stroke="' + SHORTC + '" stroke-width="9" fill="none" stroke-linecap="round" stroke-dasharray="14 9"/>' +
    '<rect x="' + (a.x - 9) + '" y="' + (a.y - 9) + '" width="18" height="18" rx="4" fill="#FFF9EE" stroke="' + SHORTC + '" stroke-width="4"/>' +
    '<rect x="' + (b.x - 9) + '" y="' + (b.y - 9) + '" width="18" height="18" rx="4" fill="#FFF9EE" stroke="' + SHORTC + '" stroke-width="4"/>' +
    '<g class="pindir"></g>' +
    '</g>';
}
/* 小风扇 SVG（g.fan：支路负载指示——支路修好后转动 .spin；主灯不受其影响=死支路
   拓扑教学可视锚） */
function fanSvg(x, y) {
  let blades = '';
  for (let a = 0; a < 3; a++) {
    const rd = a * 120 * Math.PI / 180;
    blades += '<path d="M ' + x + ' ' + (y - 14) + ' Q ' + (x + Math.sin(rd) * 16) + ' ' + (y - 20 - Math.cos(rd) * 4) +
      ' ' + (x + Math.sin(rd) * 12) + ' ' + (y - 4) + ' Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2"/>';
  }
  return '<g class="fan">' + blades +
    '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + INK + '"/>' +
    '<line x1="' + x + '" y1="' + y + '" x2="' + x + '" y2="' + (y + 10) + '" stroke="' + INK + '" stroke-width="4"/>' +
    '</g>';
}
/* 候选导线 SVG（g[data-anim="wire"]——契约 M 帧内容断言锚；线长=SPAN+40 视觉可辨
   双通道；dead=死支路元件灰标徽记——同尺寸干扰可视锚） */
function wireSvg(size, w, h, dead) {
  const len = SPAN[size] + 40, x1 = (160 - len) / 2, x2 = x1 + len, cy = 30;
  return '<svg viewBox="0 0 160 60" width="' + w + '" height="' + h + '"' +
    ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="wire">' +
    '<line x1="' + x1 + '" y1="' + cy + '" x2="' + x2 + '" y2="' + cy + '" stroke="' + INK + '" stroke-width="14" stroke-linecap="round"/>' +
    '<line x1="' + x1 + '" y1="' + cy + '" x2="' + x2 + '" y2="' + cy + '" stroke="' + (dead ? '#B99F73' : COPPER) + '" stroke-width="8" stroke-linecap="round"/>' +
    '<rect x="' + (x1 - 4) + '" y="' + (cy - 11) + '" width="12" height="22" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="' + (x2 - 8) + '" y="' + (cy - 11) + '" width="12" height="22" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    (dead ? '<circle cx="' + (x1 + 16) + '" cy="' + (cy - 14) + '" r="6" fill="#B99F73"/>' +
            '<line x1="' + (x1 + 12) + '" y1="' + (cy - 18) + '" x2="' + (x1 + 20) + '" y2="' + (cy - 10) +
            '" stroke="#FFF9EE" stroke-width="2.6"/><line x1="' + (x1 + 20) + '" y1="' + (cy - 18) + '" x2="' + (x1 + 12) + '" y2="' + (cy - 10) +
            '" stroke="#FFF9EE" stroke-width="2.6"/>' : '') +
    '</g></svg>';
}
/* 拆线卡 SVG（g[data-anim="cut"]——ch2-F3 短路故障的修复元件卡：剪刀+跨接线剪口；
   阶段2 候选之一，answer=卡位（SPEC §3 r4 fault-F3） */
function cutSvg(w, h) {
  return '<svg viewBox="0 0 160 60" width="' + w + '" height="' + h + '"' +
    ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="cut">' +
    '<line x1="30" y1="30" x2="130" y2="30" stroke="' + SHORTC + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="12 8"/>' +
    '<circle cx="62" cy="22" r="9" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="62" cy="38" r="9" fill="none" stroke="' + INK + '" stroke-width="4"/>' +
    '<line x1="70" y1="25" x2="98" y2="34" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<line x1="70" y1="35" x2="98" y2="26" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '</g></svg>';
}
/* 预判按钮图标（answerbar——阶段1 选项：lit/dark=灯亮灯灭 / up/same/down=亮度三档） */
function predIconSvg(d, sz) {
  const bulb = (on, dim) =>
    '<circle cx="14" cy="15" r="8" fill="' + (on ? (dim ? '#FFEBB0' : '#FFD966') : '#FFF9EE') + '" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M10.5 21 L10.5 24 L17.5 24 L17.5 21" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    (on && !dim ? '<line x1="14" y1="1.5" x2="14" y2="4" stroke="#F2B33D" stroke-width="2.2" stroke-linecap="round"/>' +
     '<line x1="4" y1="9" x2="6.4" y2="10.6" stroke="#F2B33D" stroke-width="2.2" stroke-linecap="round"/>' +
     '<line x1="24" y1="9" x2="21.6" y2="10.6" stroke="#F2B33D" stroke-width="2.2" stroke-linecap="round"/>' : '');
  const bars = (n) => {
    let s = '';
    for (let i = 0; i < 3; i++)
      s += '<line x1="' + (6 + i * 7) + '" y1="' + (24 - (i < n ? 5 + i * 6 : 0)) + '" x2="' + (10 + i * 7) +
           '" y2="24" stroke="' + (i < n ? '#F2B33D' : '#E5D5BC') + '" stroke-width="4" stroke-linecap="round"/>';
    return s;
  };
  const g = d === 'lit' ? bulb(true, false)
        : d === 'dark' ? bulb(false, false)
        : d === 'up' ? bars(3) : d === 'same' ? bars(2) : bars(1);
  return '<svg viewBox="0 0 28 28" width="' + sz + '" height="' + sz + '"' +
    ' xmlns="http://www.w3.org/2000/svg" fill="none">' + g + '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 小灯泡（电路小灯泡主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="22" cy="19" r="9.5" fill="#FFD966" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M17.5 26 L17.5 29 L26.5 29 L26.5 26" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M19 15 L20.8 19 L22 16.5 L23.2 19 L25 15" fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round"/>' +
    '<line x1="22" y1="4" x2="22" y2="7" stroke="#F2B33D" stroke-width="2.4" stroke-linecap="round"/>' +
    '<line x1="9" y1="13" x2="11.5" y2="15" stroke="#F2B33D" stroke-width="2.4" stroke-linecap="round"/>' +
    '<line x1="35" y1="13" x2="32.5" y2="15" stroke="#F2B33D" stroke-width="2.4" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
