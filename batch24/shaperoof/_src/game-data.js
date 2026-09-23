/* ================= shaperoof 形状屋顶 游戏数据（5.5-6.5 段升级 v2：旋转/镜像/组合三阶）
   玩法：题面 = 小兔子的房子屋顶缺一块，下方 4 片瓦片。判定层=空间操作（非形状辨认）：
   · ch1 旋转对位（rot）：洞=有向图形（三角/箭头/月牙/旗子）带朝向；正确瓦初始朝向
     随机偏 90/180/270°，须点「旋转钮」逐次顺时针 90° 转到与洞同向后放置；
     形状对朝向错 = 放不上 + 轻抖 + sr_rot_hint「转一转，方向要对上洞洞」。
   · ch2 镜像辨向（mirror）：洞型为手性形（旗/反旗、b/d、鱼/反鱼），干扰必含镜像伙伴；
     镜像瓦无论怎么转都放不上（手性：旋转永不等于镜像）+ sr_mir_wrong
     「照照镜子哦，方向反过来啦」；旋转判定与 ch1 叠加。
   · ch3 组合瓦（combo）：L/T/Z 异形大洞 = 两块板瓦拼接（先放一块再放一块，两块都判定，
     分解唯一——凹角显缝）；题面语音 sr_combo_hint「这个大洞要两块瓦一起拼」。
   · ch4 混合（flat≥20 生成关沿既有 seeded dch 家族模式：dch=ri(1,4)，静态关 dch=flat//5+1）。
   点错（形状不对）= 摇头 + shr_wrong；错点/转错/镜像错均计 miss（星级口径=失败尝试数）。
   手性核验（设计级真值，非经验）：轴+单端侧附件形（旗穗在顶、b 碗在底、鱼尾+眼在侧）
   的镜像与其 4 个旋转态逐一不同构 → 镜像永不能转成正放。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）

/* ---------- 有向/手性形封闭表：id → 中文名 + 瓦片色（镜像对同色——颜色不泄露手性）
   mir 字段 = 本 id 是某基础形的水平镜像（渲染走 matrix(-1 0 0 1 100 0)） */
const SHAPES = {
  triangle: { n: '三角形',   color: '#57B368' },
  arrow:    { n: '箭头',     color: '#E8483C' },
  crescent: { n: '月牙',     color: '#F5C445' },
  flag:     { n: '旗子',     color: '#4E8FD0' },
  flagm:    { n: '反旗子',   color: '#4E8FD0', mir: 'flag' },
  bsh:      { n: '右耳朵形', color: '#9B7ED8' },
  dsh:      { n: '左耳朵形', color: '#9B7ED8', mir: 'bsh' },
  fish:     { n: '小鱼朝右', color: '#7FC8C0' },
  fishm:    { n: '小鱼朝左', color: '#7FC8C0', mir: 'fish' }
};
const nameOfShape = s => SHAPES[s].n;

const DIR4 = ['triangle', 'arrow', 'crescent', 'flag'];   // ch1 旋转目标池（4 有向图形）
const CHIRAL6 = ['flag', 'flagm', 'bsh', 'dsh', 'fish', 'fishm'];   // ch2 手形池（3 镜像对）
const MIRROR = { flag: 'flagm', flagm: 'flag',            // 镜像对封闭 3 对（双向）
                 bsh: 'dsh', dsh: 'bsh',
                 fish: 'fishm', fishm: 'fish' };

/* ---------- 板瓦封闭表（ch3 组合）：条瓦同色（判形不判色），方瓦另色 */
const SLABS = {
  bar2v: { n: '两格竖瓦', color: '#E8975A' },
  bar2h: { n: '两格横瓦', color: '#E8975A' },
  bar3v: { n: '三格竖瓦', color: '#E8975A' },
  bar3h: { n: '三格横瓦', color: '#E8975A' },
  sq2:   { n: '方瓦',     color: '#F2A0B5' }
};
const SLAB_IDS = Object.keys(SLABS);
const nameOfSlab = s => SLABS[s].n;

/* ---------- 组合洞封闭表：洞 id → 分解（两块瓦，集合唯一）
   L = 竖长条+横短条 / T = 横长条+竖短条 / Z = 横短条+竖短条（三洞两两分解集互异；
   干扰池=SLABS 减分解后 seeded 随机取 2——bar2v/bar2h、bar3v/bar3h 互为转 90°
   近形，池内天然含近形干扰，但非每题必含「同瓦转 90°」保证（审查 m1 勘误：原注释过度声称） */
const HOLE_DECOMP = { L: ['bar3v', 'bar2h'], T: ['bar3h', 'bar2v'], Z: ['bar2h', 'bar2v'] };
const HOLE_IDS = Object.keys(HOLE_DECOMP);

/* ---------- 章配置（章号 1 基；生成关 flat≥20 按 (ch-1)%4+1 循环四章取材）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（b22 colormix 复发教训，verify 带 C7 关键词断言） */
const CHAPTERS = {
  1: { name: '转对方向', hint: '有像镜子一样的形状要来啦，小心方向' },     // 预告 ch2 镜像
  2: { name: '照照镜子', hint: '大洞要两块瓦一起拼啦' },                  // 预告 ch3 组合
  3: { name: '两块拼一拼', hint: '转一转照镜子拼一拼，全都要用上啦' },    // 预告 ch4 混合
  4: { name: '大挑战', hint: '新一轮修屋顶大挑战' }                       // 预告生成关
};
const GEN_HINTS = ['瓦片转一转，方向对上洞洞',       // dch1 旋转
                   '照照镜子，方向反过来的不对哦',    // dch2 镜像
                   '大洞要两块瓦一起拼',             // dch3 组合
                   '转一转照镜子拼一拼，大挑战'];    // dch4 混合
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   四包装 watch/turn/hint/right + wrong + 题面 q（§0.24 题面 clip 化）
   + 三阶反馈：rot 转向提示 / mir 镜像错 / combo 组合题面 */
const VOICE = {
  watch: { key: 'shr_tut_watch', text: '看！屋顶缺了一块' },
  turn:  { key: 'shr_tut_turn',  text: '你来补一补' },
  hint:  { key: 'shr_hint',      text: '看看洞的形状' },
  right: { key: 'shr_right',     text: '补好啦，房子真漂亮' },
  wrong: { key: 'shr_wrong',     text: '这块的边对不上哦' },
  q:     { key: 'shr_q',         text: '补屋顶咯' },
  rot:   { key: 'sr_rot_hint',   text: '转一转，方向要对上洞洞' },
  mir:   { key: 'sr_mir_wrong',  text: '照照镜子哦，方向反过来啦' },
  combo: { key: 'sr_combo_hint', text: '这个大洞要两块瓦一起拼' }
};
/* 题面句恒走 clip：组合题=sr_combo_hint，其余=shr_q */
const quizVoice = q => q && q.kind === 'combo' ? VOICE.combo : VOICE.q;

/* ---------- 形状路径（viewBox 0 0 100 100；dir 0-3 = 顺时针 90°×dir）
   dir0 基准：三角尖朝上 / 箭头朝上 / 月牙开口朝左 / 旗穗在右上（轴+单端附件=手性）
   fish 眼为 evenodd 镂空点（上侧）——鱼形=轴+尾端+眼侧三重朝向线索 */
const SHAPE_ELS = {
  triangle: '<path d="M50 12 L90 84 L10 84 Z"/>',
  arrow:    '<path d="M50 10 L80 44 L62 44 L62 88 L38 88 L38 44 L20 44 Z"/>',
  crescent: '<path d="M64 12 A40 40 0 1 0 64 88 A47 47 0 0 1 64 12 Z"/>',
  flag:     '<path d="M30 12 H38 V20 L84 36 L38 52 V88 H30 Z"/>',
  bsh:      '<path d="M30 12 H42 V36 A26 26 0 1 1 42 88 H30 Z"/>',
  fish:     '<path fill-rule="evenodd" d="M22 50 C30 33 54 30 65 44 L88 33 L82 50 L88 67 L65 56 C54 70 30 67 22 50 Z M34 44 a4.5 4.5 0 1 0 .1 0 Z"/>'
};
/* 板瓦路径（无旋转维度：横竖长短即不同瓦型） */
const SLAB_ELS = {
  bar2v: '<rect x="27" y="6" width="46" height="88" rx="10"/>',
  bar2h: '<rect x="6" y="27" width="88" height="46" rx="10"/>',
  bar3v: '<rect x="31" y="3" width="38" height="94" rx="9"/>',
  bar3h: '<rect x="3" y="31" width="94" height="38" rx="9"/>',
  sq2:   '<rect x="12" y="12" width="76" height="76" rx="12"/>'
};

/* 形瓦 SVG：dir=朝向 0-3（顺时针 90°×dir）；mode='tile' 实心彩瓦（卡上）
   / 'fill' 补洞实心（同 tile）/ 'hole' 虚线轮廓（屋顶洞，描边加粗补偿缩放）
   镜像形：先镜像后旋转（transform 右起左乘——dir 语义对镜像形同样为顺时针转） */
function shapeSvg(shape, size, mode, dir) {
  const meta = SHAPES[shape];
  const base = meta.mir ? SHAPE_ELS[meta.mir] : SHAPE_ELS[shape];
  const tr = (meta.mir ? 'matrix(-1 0 0 1 100 0)' : '') + (dir ? ' rotate(' + dir * 90 + ' 50 50)' : '');
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="92" height="92"';
  const attrs = mode === 'hole'
    ? 'fill="none" stroke="' + INK + '" stroke-width="6" stroke-dasharray="9 7" stroke-linejoin="round"'
    : 'fill="' + meta.color + '" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g ' + attrs + (tr ? ' transform="' + tr + '"' : '') + '>' + base + '</g></svg>';
}

/* 板瓦 SVG（无 dir 维度） */
function slabSvg(slab, size, mode) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="92" height="92"';
  const attrs = mode === 'hole'
    ? 'fill="none" stroke="' + INK + '" stroke-width="6" stroke-dasharray="9 7"'
    : 'fill="' + SLABS[slab].color + '" stroke="' + INK + '" stroke-width="3.5"';
  return '<svg viewBox="0 0 100 100"' + s + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<g ' + attrs + '>' + SLAB_ELS[slab] + '</g></svg>';
}
/* 板瓦在组合洞内的槽位（plate-local 84×56，与复合轮廓顶点严格咬合） */
const HOLE_SLOTS = {
  L: [[8, 3, 17, 51], [25, 37, 34, 17]],      // bar3v 竖长条 | bar2h 横短条
  T: [[8, 3, 51, 17], [25, 20, 17, 34]],      // bar3h 横长条 | bar2v 竖短条
  Z: [[8, 3, 34, 17], [25, 20, 17, 34]]       // bar2h 横短条 | bar2v 竖短条
};
/* 组合洞复合外轮廓（一条虚线大洞——先整体后分解，凹角显缝；槽位虚线仅弱提示） */
const HOLE_OUTLINES = {
  L: 'M8 3 H25 V37 H59 V54 H8 Z',
  T: 'M8 3 H59 V20 H42 V54 H25 V20 H8 Z',
  Z: 'M8 3 H42 V54 H25 V20 H8 Z'
};

/* ---------- 房子场景 SVG（viewBox 0 0 360 184；纯 CSS 动画，确定性零 JS）
   屋顶缺洞=浅色修补板+虚线轮廓（rot/mirror=带朝向形状 / combo=复合大洞两槽）；
   5 窗进度灯随 lit 逐个亮；小兔子由 JS 注入 .bunny-slot */
function houseSvg(q, lit) {
  const cx = 180, cy = 62, k = 0.50;
  let wins = '';
  for (let j = 0; j < CH_LEN; j++) {
    wins += '<rect class="win' + (j < lit ? ' lit' : '') + '" data-k="' + j +
            '" x="' + (88 + j * 38) + '" y="102" width="26" height="24" rx="4" stroke="' + INK + '" stroke-width="2.5"/>';
  }
  /* 洞本体：rot/mirror=形状虚线（按洞朝向旋转）；combo=复合轮廓+两槽（已填=实心板瓦） */
  let holeBody;
  if (q.kind === 'combo') {
    const slots = HOLE_SLOTS[q.shape];
    holeBody = '<g class="hole" data-shape="' + q.shape + '" transform="translate(138 34)">' +
      '<path d="' + HOLE_OUTLINES[q.shape] + '" fill="none" stroke="' + INK + '" stroke-width="4.5" stroke-dasharray="8 6" stroke-linejoin="round"/>' +
      slots.map((sl, i) => {
        const filled = q.sub[i].filled;
        return '<rect class="slot" data-slot="' + i + '" x="' + sl[0] + '" y="' + sl[1] + '" width="' + sl[2] + '" height="' + sl[3] + '" rx="3" ' +
          (filled ? 'fill="' + SLABS[q.sub[i].shape].color + '" stroke="' + INK + '" stroke-width="2.5"' :
                    'fill="none" stroke="' + INK + '" stroke-width="1.8" stroke-dasharray="4 3.5" opacity=".55"') + '/>';
      }).join('') + '</g>';
  } else {
    const meta = SHAPES[q.shape];
    const base = meta.mir ? SHAPE_ELS[meta.mir] : SHAPE_ELS[q.shape];
    const tr = (meta.mir ? 'matrix(-1 0 0 1 100 0)' : '') + (q.dir ? ' rotate(' + q.dir * 90 + ' 50 50)' : '');
    const box = 100 * k, x0 = Math.round((cx - box / 2) * 10) / 10, y0 = Math.round((cy - box / 2) * 10) / 10;
    holeBody = '<g class="hole" data-shape="' + q.shape + '" data-dir="' + q.dir + '" transform="translate(' + x0 + ' ' + y0 + ') scale(' + k + ')">' +
      '<g fill="none" stroke="' + INK + '" stroke-width="6" stroke-dasharray="9 7" stroke-linejoin="round"' +
      (tr ? ' transform="' + tr + '"' : '') + '>' + base + '</g></g>';
  }
  return '<svg class="sky" viewBox="0 0 360 184" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<rect width="360" height="184" fill="#FDF1DA"/>' +
    /* 太阳（左上静态）与云（右上静态） */
    '<circle cx="40" cy="40" r="17" fill="#F5C445" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M40 15 v-6 M65 40 h6 M40 65 v6 M15 40 h-6 M57 23 l4.5 -4.5 M23 23 l-4.5 -4.5" stroke="#E8975A" stroke-width="3" stroke-linecap="round"/>' +
    '<g fill="#FFF" stroke="' + INK + '" stroke-width="2.5">' +
    '<ellipse cx="312" cy="34" rx="21" ry="13"/><ellipse cx="330" cy="28" rx="16" ry="11"/></g>' +
    /* 地面 */
    '<path d="M0 170 q60 -10 130 -4 q90 8 150 -2 q60 -6 80 -2 V184 H0 Z" fill="#DCE9C6"/>' +
    /* 烟囱（先画，被屋顶盖住底部）+ 小烟圈 */
    '<g class="puff"><circle cx="265" cy="16" r="5" fill="#FFF" opacity=".8"/></g>' +
    '<g class="puff p2"><circle cx="273" cy="13" r="4" fill="#FFF" opacity=".7"/></g>' +
    '<rect x="252" y="26" width="26" height="34" fill="#C9756B" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="248" y="21" width="34" height="9" rx="3" fill="#B05F55" stroke="' + INK + '" stroke-width="2.5"/>' +
    /* 屋顶（梯形瓦顶）+ 瓦线 */
    '<polygon points="54,92 148,26 212,26 306,92" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M90 67 H270" stroke="#FFF" opacity=".4" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M122 45 H238" stroke="#FFF" opacity=".4" stroke-width="3" stroke-linecap="round"/>' +
    /* 房身 + 5 窗进度灯 + 门 */
    '<rect x="70" y="92" width="220" height="76" rx="6" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3"/>' +
    wins +
    '<rect x="164" y="138" width="32" height="30" rx="3" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="189" cy="154" r="2.2" fill="' + INK + '"/>' +
    /* 屋顶缺洞：修补板 + 洞本体 */
    '<rect class="hole-plate" x="138" y="34" width="84" height="56" rx="12" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>' +
    holeBody +
    '</svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） */
const ICONS = {
  /* logo：暖底圆牌 + 缺洞小房子（主题） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<polygon points="9,20.5 22,9.5 35,20.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<rect x="13" y="20.5" width="18" height="13" rx="2" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="22" cy="16.5" r="4" fill="none" stroke="#FFF9EE" stroke-width="1.8" stroke-dasharray="2.4 2"/>' +
    '<rect x="19.5" y="24.5" width="5" height="9" rx="1" fill="#B98A5C" stroke="' + INK + '" stroke-width="1.6"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  /* 旋转钮：暖橙顺时针圆箭头（与重玩钮灰蓝区分；激活=呼吸发亮） */
  rotate: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M49 32 a17 17 0 1 1 -5.9 -12.9" stroke="#E8975A" stroke-width="6.5" stroke-linecap="round" fill="none"/>' +
    '<path d="M48 7 L52 22 L37 21 Z" fill="#E8975A"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
