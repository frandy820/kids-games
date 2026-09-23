/* ================= robotdance 兔子机器人学跳舞 游戏数据（动作封闭 10 / 章配置 / 语音文案 /
   兔子机器人 SVG + 10 动作图标 + 候选块）
   玩法（SPEC-BATCH32 §0.77/§2 + SPEC-R43；6-7 岁序列记忆·计算思维）：看→拼（按序点选重建）——
     ①watch 演示相位：兔子机器人逐动作播（动画+名音 rbd_n_<id>，段间 150ms，单段 ≤1834ms）
     ②build 重建相位：序列槽 3-8（左→右）+动作块候选区（含未用干扰动作 3-4）；按序点选：
       点对=填槽+块消失+该动作 200ms 微缩重放；点错=wrong（已填槽不回退，错只计 miss）
     ③全填对→dance 相位：机器人按序完整跳（名音逐段）+确认链（名音逐段+right 尾段）
     ④ch4 fix「改一步」题（SPEC-R43 §R5）：watch 演正确版 8 步→槽区静态显示错版 disp（某步被换，
       替换动作恒取自序列本身=集合不变防背）→点错误格→答对跳正确版+确认链。
   数学先验（SPEC-R43 §R3）：动作封闭 10；步数 dch1 qi 表 [3,4,4,5,5]（q0=锚面 3 步旧律逐字节）
     /dch2 6/dch3 7/dch4 8（生成关同 dch，dch4 每关恒 1 fix 题 kq=ri(0,4)）；
     序列不同动作 u=min(n,U_CAP{1:5,2:6,3:6,4:6})——ch3/ch4 恒有重复（≥1/≥2），
     重复引入「序列再认≠逐位复述」负荷（防集合记忆）；禁 3 连（相邻同动作 ≤2 连续）；
     干扰 d=NEW_CAP{1:3,2:3,3:4,4:4}，干扰=池中未用动作（同族舞步防排除法）；
     blocks=n+d（6-12；fix 题 blocks=0——作答目标是槽）；候选块顺序洗牌 seeded（确定性）。
   语音链全 clip 无 keyless（契约 N 天然安全；Mj-1 恒真式）：演示链=名音逐段 play+150 间隙；
     watch→build 转场链=[rbd_tut_turn, rbd_q]（fix 题=[rbd_q_fix] 新键，注册前静默 SPEC-R43 §R7）；
     错链=[rbd_wrong, rbd_hint]（1656+150+2544+300=4650 豁免窗，契约 I/I 补）；
     确认链=完整舞名音逐段+rbd_right 尾段（est 口径 8×(1684+150)+2280+300=17252=舞窗恰等；
     实测复核 2026-09-22：最坏 Σ=12840（flat34 q0，queue 语义 8 间隙）+8×150+2280=16320，
     +300 余量 16620≤17252 余 632——REPORT-REVIEW-r43 M2 勘误，原「11552+7×150」为假数）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 动作封闭 10（SPEC-R43 §R3：前 5 旧动作 + 新 5；表外不出题） ---------- */
const MOVE_POOL = ['jump', 'spin', 'clap', 'stomp', 'wave', 'nod', 'kick', 'shake', 'bow', 'stretch'];
const ITEMS = {
  jump:  { n: '跳一跳' },
  spin:  { n: '转一圈' },
  clap:  { n: '拍拍手' },
  stomp: { n: '跺跺脚' },
  wave:  { n: '挥挥手' },
  nod:   { n: '点点头' },
  kick:  { n: '踢踢腿' },
  shake: { n: '摇一摇' },
  bow:   { n: '鞠个躬' },
  stretch: { n: '伸伸手' }
};
const nameOf = id => ITEMS[id].n;

/* ---------- 章配置（章号 1 基；生成关 flat≥20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1 ---------- */
const CHAPTERS = {
  1: { name: '小小舞步', hint: '舞步变 6 步，还有捣乱动作' },   // 预告 ch2 6 步+3 干扰（SPEC-R43 §R3）
  2: { name: '加长舞步', hint: '整支舞 7 步，还有重复舞步' },   // 预告 ch3 7 步+重复
  3: { name: '完整舞步', hint: '8 步长舞，有一跳是错的，找出来' }, // 预告 ch4 8 步+fix 题
  4: { name: '大挑战',   hint: '新一轮机器人舞步大挑战' }       // 预告生成关
};
const GEN_HINTS = ['四五步舞，看清再拼',      // dch1 生成 qi 表 [3,4,4,5,5]
                   '六步舞，小心干扰动作',    // dch2 生成 6 步
                   '七步舞，还有重复舞步，全都要记牢',  // dch3 生成 7 步
                   '八步长舞，找找哪一跳错了'];        // dch4 生成 8 步+fix
const CH_LEN = 5;          // 5 题 = 1 关（5 段舞）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=rbd_ 已核
   manifest 无占用）。clip 实长（SPEC-BATCH32 §4 实长表，浏览器 Audio 实测 2026-09-11）：
   tut_watch 3072 / tut_turn 1824 / hint 2544 / right 2280 / wrong 1656 / q 2088 / replay 1896；
   名音 rbd_n_*：jump 1512 / spin 1512 / clap 1560 / stomp 1536 / wave 1584；
   新 6 键（SPEC-R43 §R7；r43 段二主线注册 2026-09-22 manifest 5344→5350，mutagen 实测
   回填下方 CLIP_DUR）：rbd_n_nod 1584/kick 1584/shake 1560/bow 1464/stretch 1704（名音
   全域 max=stretch 1704）+rbd_q_fix 2736（fix 题转场/救援）；
   演示单段窗 STEP_MS=1834（=名音预估上界 1684+150 间隙，SPEC-R43 §R8；实测 max 1704>
   预估，维持 1834 罩住零截断、间隙 130ms——r43 定版不复核回调）；错链=1656+150+2544+300=4650
   （契约 I 豁免窗不变）；确认链 est 口径 8×(1684+150)+2280+300=17252=舞窗恰等，实测口径
   flat34 q0 Σ12840+8×150+2280=16320+300≤17252 余 632（M2 勘误 2026-09-22）---------- */
const VOICE = {
  watch:  { key: 'rbd_tut_watch', text: '看！机器人跳舞啦' },
  turn:   { key: 'rbd_tut_turn',  text: '你来拼一拼' },
  hint:   { key: 'rbd_hint',      text: '再想一想，下一步' },
  right:  { key: 'rbd_right',     text: '跳对啦，真棒' },
  wrong:  { key: 'rbd_wrong',     text: '再想一想' },
  q:      { key: 'rbd_q',         text: '按顺序点一点' },
  replay: { key: 'rbd_replay',    text: '再看一遍舞' },
  fix:    { key: 'rbd_q_fix',     text: '有一跳错啦，找一找' }   // SPEC-R43 §R7 新键（注册前静默）
};
const nameClip = id => 'rbd_n_' + id;        // 名音键（晓晓读中文名，10 互异）
const CLIP_DUR = {                           // SPEC §4 实长表（verify ±60ms 对账依据；新 6 键注册后回填）
  rbd_tut_watch: 3072, rbd_tut_turn: 1824, rbd_hint: 2544, rbd_right: 2280,
  rbd_wrong: 1656, rbd_q: 2088, rbd_replay: 1896,
  rbd_n_jump: 1512, rbd_n_spin: 1512, rbd_n_clap: 1560, rbd_n_stomp: 1536, rbd_n_wave: 1584,
  rbd_n_nod: 1584, rbd_n_kick: 1584, rbd_n_shake: 1560, rbd_n_bow: 1464, rbd_n_stretch: 1704,
  rbd_q_fix: 2736   // r43 六键实长（主线 mutagen 实测 2026-09-22，manifest 5350）
};
const MAX_NAME_DUR = 1684;                   // 名音预估上界（SPEC-R43 §R8 常量，verify ⑭ 复算依据；
                                            // r43 实测口径注记：名音 10 全域 max=rbd_n_stretch 1704>预估 1684，
                                            // STEP_MS 1834 仍罩音频零截断（间隙 130ms，20ms 差异儿童不可感知）；
                                            // 确认链实测最坏（flat34 q0 Σ12840+8×150+right 2280）=16320，
                                            // +300 余量 16620≤舞窗 17252 余 632——r43 M2 勘误：U_CAP{4:6}
                                            // 下「8 步互异」不可能，u=6 dup=2 恒定）
const STEP_MS = 1834;                        // 演示/舞单段窗 = 名音预估上界 1684+150 间隙（SPEC-R43 §R8）
const WRONG_CHAIN_MS = 4650;                 // 错链豁免窗 = 1656+150+2544+300（契约 I）

/* ---------- 兔子机器人 SVG（兔耳+天线+方脸+铆钉——与家族圆兔子区分：机器人化）
   结构：地影（不随动画）+ g.rb-lift[data-anim=robot]（jump/spin 变换目标）
   + .rb-armL/.rb-armR（clap/wave 臂组，外包 g 定位、内组 CSS 动画——CSS transform
   会覆盖同名 attribute，故基座姿态放外层 g、动画增量放内层 class 组）
   + .rb-footR（stomp 下踩）+ .rb-dust（尘土粒子，默认 opacity 0）。
   根组 g[data-anim="robot"] = 契约 M 帧内容断言锚。 ---------- */
const RIVET = (x, y, r) => '<circle cx="' + x + '" cy="' + y + '" r="' + (r || 2.4) +
  '" fill="#D9C9B4" stroke="' + INK + '" stroke-width="1.6"/>';
function robotSvg(width) {
  const w = width || 170, h = Math.round(w * 190 / 170);
  const ARM = '<rect x="-7" y="-2" width="14" height="34" rx="7" fill="#FAF3E3" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="0" cy="36" r="9.5" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3"/>';
  const FOOT = '<rect x="-11" y="0" width="22" height="13" rx="6.5" fill="#E3D3B8" stroke="' + INK + '" stroke-width="3"/>';
  return '<svg class="robot" viewBox="0 0 170 190" width="' + w + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<ellipse cx="85" cy="181" rx="50" ry="9" fill="#EADCC4" opacity=".75"/>' +
    '<g class="rb-lift" data-anim="robot">' +
      /* 头部组（天线+兔耳+方脸——nod 点头动画目标 .rb-head，SPEC-R43） */
      '<g class="rb-head">' +
      /* 天线 */
      '<path d="M85 44 V22" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="85" cy="16" r="7" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
      '<circle cx="82.5" cy="13.5" r="2.2" fill="#FCE9C8"/>' +
      /* 兔耳（一正一歪，粉色内耳） */
      '<g transform="rotate(-9 61 50)"><rect x="53" y="2" width="15" height="48" rx="7.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="57" y="9" width="7" height="33" rx="3.5" fill="#F2B8C6"/></g>' +
      '<g transform="rotate(13 109 50)"><rect x="102" y="0" width="15" height="50" rx="7.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
      '<rect x="106" y="7" width="7" height="36" rx="3.5" fill="#F2B8C6"/></g>' +
      /* 方脸 + LED 眼 + 嘴格栅 + 颊钉 + 铆钉 */
      '<rect x="45" y="44" width="80" height="58" rx="14" fill="#FAF3E3" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="58" y="57" width="18" height="23" rx="7" fill="#8CC3EA" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<circle cx="63" cy="62" r="2.8" fill="#FFF"/>' +
      '<rect x="94" y="57" width="18" height="23" rx="7" fill="#8CC3EA" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<circle cx="99" cy="62" r="2.8" fill="#FFF"/>' +
      '<path d="M77 89 v9 M85 89 v9 M93 89 v9" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="53" cy="86" r="4" fill="#F2B8C6" opacity=".95"/><circle cx="117" cy="86" r="4" fill="#F2B8C6" opacity=".95"/>' +
      RIVET(51, 50) + RIVET(119, 50) + RIVET(51, 96) + RIVET(119, 96) +
      '</g>' +
      /* 颈 + 双臂（外层 g=基座姿态，内层 class 组=动画增量） */
      '<rect x="78" y="100" width="14" height="8" rx="3.5" fill="#E3D3B8" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<g transform="translate(52 114) rotate(26)"><g class="rb-armL">' + ARM + '</g></g>' +
      '<g transform="translate(118 114) rotate(-26)"><g class="rb-armR">' + ARM + '</g></g>' +
      /* 方身 + 胸口音符面板 + 铆钉 */
      '<rect x="50" y="106" width="70" height="52" rx="12" fill="#F6E9D2" stroke="' + INK + '" stroke-width="3.5"/>' +
      '<rect x="62" y="116" width="46" height="31" rx="8" fill="#FDEFDC" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<circle cx="75" cy="140" r="4.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
      '<path d="M79.5 140 V122" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M79.5 122 q8 3 8 11" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<circle cx="90" cy="143" r="3.2" fill="#E8975A" stroke="' + INK + '" stroke-width="1.8"/>' +
      '<path d="M93.2 143 V130" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
      RIVET(56, 152) + RIVET(114, 152) +
      /* 双脚（右脚=stomp 下踩目标）+ 尘土粒子 */
      '<g transform="translate(66 157)"><g class="rb-footL">' + FOOT + '</g></g>' +
      '<g transform="translate(104 157)"><g class="rb-footR">' + FOOT + '</g></g>' +
      '<g transform="translate(120 168)"><g class="rb-dust">' +
        '<circle cx="0" cy="0" r="4" fill="#D9C9B4"/><circle cx="-8" cy="-4" r="3" fill="#E3D3B8"/>' +
        '<circle cx="7" cy="-5" r="2.6" fill="#E3D3B8"/>' +
        '<path d="M-13 3 q4 -7 9 -2" stroke="#C9A87C" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '</g></g>' +
    '</g></svg>';
}

/* ---------- 动作小机器人（块/槽图标共用底稿：兔耳+方脸 LED 眼+方身面板，46×76） ---------- */
const MINI_ROBOT = (x, y, sc) => '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')">' +
    '<rect x="8" y="0" width="7" height="20" rx="3.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="31" y="0" width="7" height="20" rx="3.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M23 16 V7" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<circle cx="23" cy="4.5" r="3.2" fill="#E8975A" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="0" y="16" width="46" height="30" rx="8" fill="#FAF3E3" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="8" y="24" width="9" height="11" rx="3.5" fill="#8CC3EA" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="29" y="24" width="9" height="11" rx="3.5" fill="#8CC3EA" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M20 39 v5 M23 39 v5 M26 39 v5" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<rect x="4" y="46" width="38" height="22" rx="7" fill="#F6E9D2" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="12" y="51" width="22" height="12" rx="4" fill="#FDEFDC" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="6" y="68" width="12" height="8" rx="4" fill="#E3D3B8" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="28" y="68" width="12" height="8" rx="4" fill="#E3D3B8" stroke="' + INK + '" stroke-width="2"/>' +
  '</g>';

/* ---------- 10 动作图标（viewBox 0 0 120 120；动作线索色互异：jump 绿↑/spin 蓝环箭头/
   clap 橙火花/stomp 棕下踩/wave 粉波线/nod 绿双下箭头/kick 棕踢尘/shake 粉双侧弧/
   bow 橙下弧箭头/stretch 绿双上箭头举臂——形状线索为主色为辅；新旧动作同族同风格
   （SPEC-R43 §R2.3 干扰同族防排除法）。
   根组 g[data-anim]=id——契约 M 帧内容断言锚 ---------- */
const ACTION_ELS = {
  /* jump：机器人腾空（脚-地留空隙）+ 弹跳线 + 绿色双箭头向上 */
  jump:
    '<path d="M30 102 h60" stroke="#C9A87C" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M50 93 v6 M62 93 v6 M74 93 v6" stroke="#D9C9B4" stroke-width="2.6" stroke-linecap="round"/>' +
    MINI_ROBOT(38, 12, 1) +
    '<path d="M94 74 l10 -12 l10 12 M94 90 l10 -12 l10 12" stroke="#8FC86C" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  /* spin：机器人微倾 + 蓝色环绕大箭头（约 300° 弧+箭头） */
  spin:
    '<g transform="rotate(8 60 62)">' + MINI_ROBOT(37, 25, 1) + '</g>' +
    '<path d="M100 82 A46 46 0 1 1 100 38" fill="none" stroke="#5B9BD5" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M100 24 L114 38 L97 44 Z" fill="#5B9BD5" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>',
  /* clap：双掌胸前相合 + 接触点橙色火花 + 两侧运动弧 */
  clap:
    MINI_ROBOT(37, 20, 1) +
    '<path d="M34 80 q-7 -5 -8 -13 M86 80 q7 -5 8 -13" stroke="#E8975A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="48" cy="74" r="9" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="72" cy="74" r="9" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M60 60 v-8 M51 63 l-6 -6 M69 63 l6 -6" stroke="#E8975A" stroke-width="3.5" stroke-linecap="round"/>',
  /* stomp：大脚下踩贴地 + 两侧棕色尘土 + 下踩箭头 */
  stomp:
    '<path d="M24 103 h72" stroke="#C9A87C" stroke-width="3.5" stroke-linecap="round"/>' +
    MINI_ROBOT(37, 8, 1) +
    '<rect x="64" y="88" width="26" height="13" rx="6.5" fill="#E3D3B8" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="56" cy="98" r="4.5" fill="#D9C9B4"/><circle cx="48" cy="94" r="3.4" fill="#E3D3B8"/>' +
    '<circle cx="98" cy="97" r="4" fill="#D9C9B4"/><circle cx="106" cy="92" r="3" fill="#E3D3B8"/>' +
    '<path d="M42 104 q5 -8 12 -6 M92 104 q6 -9 13 -7" stroke="#C9A87C" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M86 58 l7 9 l7 -9" stroke="#C9A87C" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  /* wave：右臂高举摆动 + 粉色波线 */
  wave:
    MINI_ROBOT(37, 26, 1) +
    '<g transform="translate(79 52) rotate(-142)">' +
      '<rect x="-4.5" y="-1" width="9" height="24" rx="4.5" fill="#FAF3E3" stroke="' + INK + '" stroke-width="2.6"/>' +
      '<circle cx="0" cy="27" r="6.5" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '</g>' +
    '<path d="M100 26 q7 6 7 15 M107 19 q10 9 10 24" stroke="#E77FA8" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  /* ---------- 新 5 动作（SPEC-R43 §R3；与旧 5 同族同风格——干扰同族防排除法） ---------- */
  /* nod：机器人 + 头顶绿色双下箭头（点头方向）+ 两侧点头运动弧 */
  nod:
    MINI_ROBOT(37, 30, 1) +
    '<path d="M36 10 l7 9 l7 -9 M62 10 l7 9 l7 -9" stroke="#8FC86C" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M26 44 q-6 8 -2 17 M94 44 q6 8 2 17" stroke="#8FC86C" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>',
  /* kick：机器人 + 右下踢出的腿脚 + 两侧棕色尘土（与 stomp 区分：stomp 垂直下踩贴地、kick 斜踢离地） */
  kick:
    MINI_ROBOT(33, 12, 1) +
    '<g transform="translate(66 78) rotate(-38)">' +
      '<rect x="-5" y="-2" width="10" height="26" rx="5" fill="#E3D3B8" stroke="' + INK + '" stroke-width="2.8"/>' +
      '<rect x="-11" y="22" width="24" height="12" rx="6" fill="#E3D3B8" stroke="' + INK + '" stroke-width="2.8"/>' +
    '</g>' +
    '<circle cx="88" cy="98" r="4.5" fill="#D9C9B4"/><circle cx="97" cy="93" r="3.2" fill="#E3D3B8"/>' +
    '<circle cx="30" cy="100" r="3.4" fill="#D9C9B4"/>' +
    '<path d="M18 104 q6 -9 13 -7 M84 106 q7 -9 14 -6" stroke="#C9A87C" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  /* shake：微倾机器人 + 左右粉色摆动弧线（整体摇晃） */
  shake:
    '<g transform="rotate(-7 60 62)">' + MINI_ROBOT(37, 26, 1) + '</g>' +
    '<path d="M16 38 q-9 24 0 48 M104 38 q9 24 0 48" stroke="#E77FA8" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 20 q-5 8 -1 15 M92 20 q5 8 1 15" stroke="#E77FA8" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/>',
  /* bow：前倾机器人（绕脚部旋转）+ 橙色向下弧箭头（鞠躬方向） */
  bow:
    '<g transform="rotate(24 60 104)">' + MINI_ROBOT(37, 24, 1) + '</g>' +
    '<path d="M96 34 A38 38 0 0 1 88 82" fill="none" stroke="#E8975A" stroke-width="4.5" stroke-linecap="round"/>' +
    '<path d="M82 86 L90 92 L79 96 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M24 103 h72" stroke="#C9A87C" stroke-width="3.5" stroke-linecap="round"/>',
  /* stretch：站定双臂高举 + 两侧绿色向上箭头（与 jump 区分：jump 腾空+弹跳线、stretch 贴地举臂） */
  stretch:
    MINI_ROBOT(37, 34, 1) +
    '<g transform="translate(34 44) rotate(152)">' +
      '<rect x="-4" y="-1" width="8" height="22" rx="4" fill="#FAF3E3" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="0" cy="24" r="5.5" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '</g>' +
    '<g transform="translate(86 44) rotate(-152)">' +
      '<rect x="-4" y="-1" width="8" height="22" rx="4" fill="#FAF3E3" stroke="' + INK + '" stroke-width="2.4"/>' +
      '<circle cx="0" cy="24" r="5.5" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '</g>' +
    '<path d="M14 56 l9 -11 l9 11 M88 56 l9 -11 l9 11" stroke="#8FC86C" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M30 104 h60" stroke="#C9A87C" stroke-width="3" stroke-linecap="round"/>'
};

/* 图 SVG 工厂：actionSvg(id, size)——size 缺省 56；根组 g[data-anim]=id（契约 M 锚） */
function actionSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="56" height="56"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + id + '">' + ACTION_ELS[id] + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 机器人头（兔耳+方脸+LED 眼） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M15 12 V8" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '<circle cx="15" cy="7" r="1.8" fill="#E8975A"/>' +
    '<rect x="10" y="7" width="3.6" height="10" rx="1.8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="1.4" transform="rotate(-8 12 12)"/>' +
    '<rect x="22" y="6" width="3.6" height="11" rx="1.8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="1.4" transform="rotate(9 24 12)"/>' +
    '<rect x="9" y="15" width="20" height="15" rx="5" fill="#FAF3E3" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="13" y="19" width="4.5" height="6" rx="2" fill="#8CC3EA" stroke="' + INK + '" stroke-width="1.2"/>' +
    '<rect x="20.5" y="19" width="4.5" height="6" rx="2" fill="#8CC3EA" stroke="' + INK + '" stroke-width="1.2"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  /* replay=再看一遍舞：循环箭头+音符 */
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/>' +
    '<circle cx="22" cy="50" r="4.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M26.5 50 V37 q6 2 7 6" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
