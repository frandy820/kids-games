/* ================= gear 齿轮转起来 游戏数据（章配置 / 语音 / SPEC v3 题表 / 齿轮 SVG）
   v3 难度升档（r3 2026-09-13，SPEC-BATCH38 §3 v3——旧 S/M/L 三选一 indexOf 判定作废）：
   双答制=阶段1 预判答（转向/快慢/转不转）+ 阶段2 选齿数，两答全对才 right。
   - ch1 dir 双答入门（链 3-4，答空槽转向 cw/ccw 二选）
   - ch2 dir 奇偶长链（链 3-6 变化——「隔一个反一次」奇偶律真判定）
   - ch3 speed 传动比（两轮 D_W，答「哪个转得快」三选：小轮快/一样快/大轮快——
     角速度与齿数成反比，齿少者恒快，'big'=misconception 干扰恒错）
   - ch4 冲突混排（单驱 dir 五槽 + 双驱 conflict：两端手柄均 cw，位 k 两路转向
     =k%2 与 (n-1-k)%2，奇偶冲突=锁死「转不动」——iff n 为偶数）
   候选去恒等：齿数制 5 档 t8/t10/t12/t14/t16（直径 53-106，相邻差 13.2px 目测
   难辨须数齿），picks=need+两个邻档（|齿数差|∈{2,4}——NEIGHBOR 表）。
   布局记法：'D'=驱动轮（0 号恒 cw）/'W'=风车（链尾）/'B'=第二驱动轮（右手柄恒 cw，
   conflict 题链尾）/'x'=固定轮（齿数=fixes 表）/'_'=判定空槽（每题恰 1）。
   语音：gr_ 11 键（v3 dir_wrong 2760/speed_wrong 2664+T46 阶段2 题面观察句
   gr_obs_1..4=2712/3048/2256/2304 实测回更）；
   题面句=章档 obs clip 播报（voice.play 章档键——T46 阶段2 清 keyless）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 章配置（v3：hint[i] ↔ CHAPTERS[i+1] 家族 F；obs=章档题面句 keyless
   ——ch1/2/4 沿用原句（8/10/8 字），ch3 传动比句 7 字 obsWin=estMs(7)+300=3315） ---------- */
const CHAPTERS = {
  1: { name: '小齿轮转转', hint: '机器变长了，猜猜转向', obs: '看一看手柄往哪转', obsKey: 'gr_obs_1', obsWin: 3660 },
  2: { name: '齿轮猜一猜', hint: '大轮带小轮，谁转得快', obs: '猜猜这个轮子往哪边转', obsKey: 'gr_obs_2', obsWin: 4350 },
  3: { name: '快与慢', hint: '两根手柄，转得动吗', obs: '哪个齿轮转得快', obsKey: 'gr_obs_3', obsWin: 3315 },
  4: { name: '转不动的机器', hint: '新一轮修机器开始', obs: '这个轮子转得动吗', obsKey: 'gr_obs_4', obsWin: 3660 }
};
const GEN_HINTS = ['小机器转起来，再修五台',         // dch1（flat20-24 同档域成立）
                   '长链猜转向，再装齿轮',           // dch2
                   '大轮小轮转起来',                 // dch3
                   '两根手柄的机器，转得动吗'];      // dch4
const CH_LEN = 5;          // 5 题 = 1 关（每关恒 5 个双答决策=5 台机器逐台修好）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章（每章封闭题池 5 题，关内 rotate 取题——thanks 先例）

/* ---------- SPEC §3 v3 题库封闭 20 题全表（先验验算 ✓ 2026-09-13 python
   spec_check.py：奇偶/冲突/传动比判据独立重列+去恒等邻档域全过；答案分布
   cw5/ccw8/jam2/small3/same2；ch2 链长 3-6 全覆盖；need 5 档全覆盖）
   fields：kind('dir'|'speed'|'conflict')/layout/blank 判定空槽位/need 唯一正确
   齿数档/fixes{x 位:齿数档}/dteeth（speed 题驱动轮齿数；他章缺省恒 t12）
   阶段1 真值（引擎 deriveDirAns 推导——verify 独立副本复算）：
   dir      dirAns = blank%2==0 ? 'cw' : 'ccw'
   conflict jam = (blank%2) != ((n-1-blank)%2)（iff n 偶）→ 'jam'，否则同 dir
   speed    dirAns = dteeth==need ? 'same' : 'small'（'big' 恒干扰） ---------- */
const SPEC_TABLE = [
  { kind: 'dir', layout: 'D_W', blank: 1, need: 't10', fixes: {} },                        // ① ch1
  { kind: 'dir', layout: 'Dx_W', blank: 2, need: 't12', fixes: { 1: 't10' } },             // ②
  { kind: 'dir', layout: 'D_W', blank: 1, need: 't14', fixes: {} },                        // ③
  { kind: 'dir', layout: 'Dx_W', blank: 2, need: 't8', fixes: { 1: 't16' } },              // ④
  { kind: 'dir', layout: 'D_W', blank: 1, need: 't12', fixes: {} },                        // ⑤
  { kind: 'dir', layout: 'Dx_W', blank: 2, need: 't10', fixes: { 1: 't14' } },             // ⑥ ch2（链 4）
  { kind: 'dir', layout: 'D_xxW', blank: 1, need: 't16', fixes: { 2: 't8', 3: 't12' } },   // ⑦（链 5）
  { kind: 'dir', layout: 'Dxxx_W', blank: 4, need: 't14', fixes: { 1: 't12', 2: 't8', 3: 't16' } },  // ⑧（链 6）
  { kind: 'dir', layout: 'D_W', blank: 1, need: 't12', fixes: {} },                        // ⑨（链 3 复习锚）
  { kind: 'dir', layout: 'Dxx_W', blank: 3, need: 't8', fixes: { 1: 't12', 2: 't16' } },   // ⑩（链 5）
  { kind: 'speed', layout: 'D_W', blank: 1, need: 't8', dteeth: 't16' },                   // ⑪ ch3 小轮快
  { kind: 'speed', layout: 'D_W', blank: 1, need: 't16', dteeth: 't8' },                   // ⑫ 小轮快（驱动小）
  { kind: 'speed', layout: 'D_W', blank: 1, need: 't12', dteeth: 't12' },                  // ⑬ 一样快
  { kind: 'speed', layout: 'D_W', blank: 1, need: 't10', dteeth: 't16' },                  // ⑭ 小轮快
  { kind: 'speed', layout: 'D_W', blank: 1, need: 't10', dteeth: 't10' },                  // ⑮ 一样快
  { kind: 'dir', layout: 'Dxx_W', blank: 3, need: 't12', fixes: { 1: 't8', 2: 't14' } },   // ⑯ ch4 单驱
  { kind: 'conflict', layout: 'D_xB', blank: 1, need: 't10', fixes: { 2: 't14' } },        // ⑰ 双驱 4 槽=jam
  { kind: 'conflict', layout: 'Dxx_B', blank: 3, need: 't8', fixes: { 1: 't12', 2: 't16' } },  // ⑱ 双驱 5 槽不冲突 ccw
  { kind: 'conflict', layout: 'Dxxx_B', blank: 4, need: 't16', fixes: { 1: 't10', 2: 't8', 3: 't14' } },  // ⑲ 双驱 6 槽=jam
  { kind: 'dir', layout: 'Dx_W', blank: 2, need: 't10', fixes: { 1: 't16' } }              // ⑳ 单驱
];

/* ---------- 齿数制 5 档（v3 去恒等核心：直径=齿数×6.6 取整，相邻差 13.2px——
   目测难辨须数齿/比开口；NEIGHBOR=邻档干扰池（边界档取同侧两邻，差 2/4 齿） ---------- */
const TEETH = { t8: 8, t10: 10, t12: 12, t14: 14, t16: 16 };
const GEAR_DIM = { t8: 53, t10: 66, t12: 79, t14: 92, t16: 106 };
const NEIGHBOR = { t8: ['t10', 't12'], t10: ['t8', 't12'], t12: ['t10', 't14'],
                   t14: ['t12', 't16'], t16: ['t12', 't14'] };
const GEAR_FILL = '#E8975A';               // v3 齿轮统一暖橙（颜色不分档——防色码跳过数齿）
const DRIVE_FILL = '#C96F5A';              // 驱动轮红棕（身份色）
const DTEETH_DEFAULT = 't12';              // 非 speed 章驱动轮齿数（视觉稳定）

/* ---------- 演出时序常量（SPEC §4 实长表 2026-09-13 回更；_clipdur38.json 真值源）
   gr_：tut_watch 3024 / tut_turn 1776 / hint 2328 / right 2088（判对后窗 ≥2388）/
   wrong 2184 / dir_wrong 2760 / speed_wrong 2664（v3 新增，ffprobe 实测） ---------- */
const OBS_PAD = 0;                                 // 观察句窗=章档 CHAPTERS.obsWin（estMs+300 内含）
const MESH_MS = 1100, CHAIN_MS = 1500;             // 判对演出窗 2600 ≥ 确认链 2088+300=2388（家族 G/H；
                                                   // CHAIN_MS=全链逐轮延迟起转 6×180 波次+余量）
const FULL_WIN = 2400;                             // 关末全速演出 ≥ 2088+300=2388（纯演出层）
const WRONG_CHAIN_WIN = 4962;                      // 尺寸错链豁免窗=2184+150+2328+300（真时钟，契约 I）
const WRONG_LOCK_1 = 2334;                         // 尺寸首错演出锁=wrong 2184+150（b37 R3 收窄）
const WRONG_LOCK_2 = 1000;                         // 二错起防重入锁
const DIR_CHAIN_WIN = 5538;                        // 转向错链豁免窗=dir_wrong 2760+150+2328+300
const DIR_LOCK_1 = 2910;                           // 转向首错锁=2760+150
const SPEED_CHAIN_WIN = 5442;                      // 快慢错链豁免窗=speed_wrong 2664+150+2328+300
const SPEED_LOCK_1 = 2814;                         // 快慢首错锁=2664+150
const NIGH_MS = 700, NIGH_MS2 = 900;               // 方向级相邻高亮节奏（先左邻 700 再右邻 900）
const SPIN_STEP = 180;                             // 全链联动逐轮延迟步长（逐轮交替起转——教学核心可视化）
const DIR_OK_MS = 500;                             // 阶段1 答对钉住演出窗（箭头钉在空槽）
const TOOTH_MS = 70;                               // 转速周期=齿数×70ms（传动比可视化：齿少者恒快）
const DIR_KINDS = { dir: ['cw', 'ccw'], speed: ['small', 'same', 'big'],
                    conflict: ['cw', 'ccw', 'jam'] };   // 阶段1 按钮组（kind→选项集）

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；gr_ 7 键
   ——v3 新增 dir_wrong/speed_wrong 2026-09-13 合成，ffprobe 实测 2760/2664） ---------- */
const VOICE = {
  watch: { key: 'gr_tut_watch', text: '看！齿轮咬齿轮' },
  turn:  { key: 'gr_tut_turn',  text: '你来装一装' },
  hint:  { key: 'gr_hint',      text: '看看旁边的齿轮' },
  right: { key: 'gr_right',     text: '风车转起来啦' },
  wrong: { key: 'gr_wrong',     text: '齿轮还没咬上哦' },
  dirWrong:   { key: 'gr_dir_wrong',   text: '不对哦，隔一个反一次' },   // 阶段1 转向/冲突答错
  speedWrong: { key: 'gr_speed_wrong', text: '数一数两个齿轮的齿' }      // 阶段1 快慢答错
};

/* ---------- 齿轮 SVG（viewBox 0 0 100 100：n 齿圈+中心孔+3 辐条——n=齿数档参数化
   （v3：8-16 齿数齿可数=去恒等判定通道；辐条=转向可视锚）；根组 g[data-anim="gear"] */
function gearTeeth(n) {                            // n 齿（360/n° 递增——n 参数化）
  let s = '';
  for (let a = 0; a < n; a++)
    s += '<rect x="46.4" y="2.5" width="7.2" height="10" rx="2" fill="' + INK + '" transform="rotate(' + (a * 360 / n).toFixed(2) + ' 50 50)"/>';
  return s;
}
const SPOKE = (function() {                        // 3 辐条（120° 递增——旋转方向可辨）
  let s = '';
  for (let a = 0; a < 3; a++)
    s += '<rect x="47.6" y="20" width="4.8" height="30" rx="2.4" fill="' + INK + '" opacity=".55" transform="rotate(' + a * 120 + ' 50 50)"/>';
  return s;
})();
function gearBody(n) {                             // 齿圈主体（不含色晕——per-n 生成）
  return gearTeeth(n) +
    '<circle cx="50" cy="50" r="39" fill="#E5D5BC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="50" cy="50" r="32.5" fill="none" stroke="' + INK + '" stroke-width="2.2" opacity=".35"/>' +
    SPOKE +
    '<circle cx="50" cy="50" r="9.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>';
}
/* 齿轮主体（v3 统一色 GEAR_FILL；id=齿数档 t8-t16；size=显示直径 px） */
function gearSvg(id, size, cls) {
  const n = TEETH[id] || 12;
  return '<svg viewBox="0 0 100 100" width="' + size + '" height="' + size + '"' +
    ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true" class="' + (cls || '') + '">' +
    '<g data-anim="gear" fill="' + GEAR_FILL + '" stroke="' + GEAR_FILL + '">' +
    '<circle cx="50" cy="50" r="34" fill="' + GEAR_FILL + '" opacity=".28"/>' +
    '<g fill="' + GEAR_FILL + '">' + gearBody(n) + '</g>' +
    '</g></svg>';
}
/* 驱动轮（齿轮+曲柄手柄——观察句「看一看手柄往哪转」视觉锚；id=齿数档（speed 章
   dteeth 变化）；mirror=1 手柄朝左（B 右手柄） */
function driveSvg(id, mirror) {
  const n = TEETH[id] || 12;
  return '<svg viewBox="0 0 100 100" width="' + GEAR_DIM[id] + '" height="' + GEAR_DIM[id] + '"' +
    ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"' +
    (mirror ? ' style="transform:scaleX(-1)"' : '') + '>' +
    '<g data-anim="gear" fill="' + DRIVE_FILL + '" stroke="' + DRIVE_FILL + '">' +
    '<circle cx="50" cy="50" r="34" fill="' + DRIVE_FILL + '" opacity=".28"/>' +
    '<g fill="' + DRIVE_FILL + '">' + gearBody(n) + '</g>' +
    '<path d="M50 50 L50 16" stroke="' + INK + '" stroke-width="7" stroke-linecap="round"/>' +
    '<circle cx="50" cy="13" r="8" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '</g></svg>';
}
/* 风车（4 叶+杆——链通联动起转；g[data-anim="wind"] 契约 M 锚） */
const WIND_EL =
  '<rect x="47" y="55" width="6" height="42" rx="3" fill="#B98A5D" stroke="' + INK + '" stroke-width="3"/>' +
  '<g>' +
  '<path d="M50 52 C36 48 30 38 33 30 C42 30 50 40 50 52 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.6"/>' +
  '<path d="M50 52 C64 48 70 38 67 30 C58 30 50 40 50 52 Z" fill="#F7D6DF" stroke="' + INK + '" stroke-width="2.6"/>' +
  '<path d="M50 52 C46 66 36 72 28 69 C28 60 38 52 50 52 Z" fill="#B7DCA8" stroke="' + INK + '" stroke-width="2.6"/>' +
  '<path d="M50 52 C54 66 64 72 72 69 C72 60 62 52 50 52 Z" fill="#BFD9EC" stroke="' + INK + '" stroke-width="2.6"/>' +
  '</g>' +
  '<circle cx="50" cy="52" r="6.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>';
function windSvg(size) {
  return '<svg viewBox="0 0 100 108" width="' + size + '" height="' + Math.round(size * 1.08) + '"' +
    ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="wind">' + WIND_EL + '</g></svg>';
}
/* 转向箭头（cw 顺时针弧箭头；ccw 变换 scaleX(-1) 镜像——r2 M1：视觉方向=判定真值） */
function dirArrowSvg(cw, size) {
  return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '"' +
    ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true"' +
    (cw ? '' : ' style="transform:scaleX(-1)"') + '>' +
    '<path d="M50 32 a18 18 0 1 1 -6 -13.4" stroke="#E8975A" stroke-width="7" stroke-linecap="round" fill="none"/>' +
    '<path d="M52 10 L52 24 L38 22 Z" fill="#E8975A"/></svg>';
}
/* 转不动图标（八角停标——conflict 题 jam 选项/钉住标记） */
function jamSvg(size) {
  return '<svg viewBox="0 0 64 64" width="' + size + '" height="' + size + '"' +
    ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="32" cy="32" r="22" stroke="#C96F5A" stroke-width="7" fill="none"/>' +
    '<path d="M17 17 L47 47" stroke="#C96F5A" stroke-width="7" stroke-linecap="round"/></svg>';
}
/* 快慢图标（speed 三选：small=小圆双线快/big=大圆单线/same=双圆等号） */
function speedSvg(kind, size) {
  const s = size || 36;
  if (kind === 'small')
    return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
      '<circle cx="24" cy="36" r="12" stroke="#E8975A" stroke-width="6" fill="none"/>' +
      '<path d="M42 22 L54 16 M44 32 L58 30 M42 44 L54 48" stroke="#E8975A" stroke-width="5" stroke-linecap="round"/></svg>';
  if (kind === 'big')
    return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
      '<circle cx="30" cy="32" r="20" stroke="#E8975A" stroke-width="6" fill="none"/>' +
      '<path d="M50 20 L58 14" stroke="#E8975A" stroke-width="5" stroke-linecap="round"/></svg>';
  return '<svg viewBox="0 0 64 64" width="' + s + '" height="' + s + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<circle cx="20" cy="32" r="10" stroke="#E8975A" stroke-width="5" fill="none"/>' +
    '<circle cx="44" cy="32" r="10" stroke="#E8975A" stroke-width="5" fill="none"/>' +
    '<path d="M28 50 L36 50" stroke="#E8975A" stroke-width="6" stroke-linecap="round"/></svg>';
}
/* 阶段1 选项图标分发（cw/ccw=dirArrowSvg/jam=jamSvg/small|same|big=speedSvg） */
function choiceSvg(d, size) {
  if (d === 'cw') return dirArrowSvg(true, size);
  if (d === 'ccw') return dirArrowSvg(false, size);
  if (d === 'jam') return jamSvg(size);
  return speedSvg(d, size);
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 齿轮（齿轮转起来主题锚——12 齿） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<g fill="#E8975A">' + gearTeeth(12).replace(new RegExp(INK, 'g'), '#E8975A') + '</g>' +
    '<circle cx="22" cy="22" r="13" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="22" cy="22" r="4.5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  wrench: '<svg viewBox="0 0 64 64" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M44 12 a11 11 0 0 0 -10 16 L18 44 a6 6 0 0 0 8.5 8.5 L42.5 37 a11 11 0 0 0 16 -10 l-8 8 l-7 -2 l-2 -7 Z" fill="#8A9BAE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/></svg>'
};
