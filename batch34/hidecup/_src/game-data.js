/* ================= hidecup 藏猫猫摄像头 游戏数据（动物池 5 / 章配置 / 语音文案 / SVG）
   玩法（SPEC-BATCH34 §0.82/§1 + SPEC-R51 难度曲线上移，6.5-8 岁视觉记忆）：经典杯子戏——
   当关主角动物探头亮相 1.5s → 躲进某杯 → 杯子换位（两杯位置互换动画，
   换位期杯恒盖住不露动物）→ 静止 800ms → 点杯开杯：
   动物在=right+动物名音；空杯=wrong+「再想一想」（空开+盖回）。
   杯数 c/换位数 s（r51 章型表，整条曲线较 r25 前移）：ch1=3/2 单动物 900ms、
   ch2=4/3 单动物 800ms、ch3 谱 KINDS3=qi0/2/4 hide c=4 s=4 + qi1/3 hidedual
   c=4 s=4（双动物双问）700ms、ch4 谱 KINDS4=qi0/4 hide c=4 s=5 + qi1/3
   hidedual c=4 s=5 + qi2 hidetriple c=4 s=4（三动物三问）600ms。
   hidedual：两只动物（animA/animB 互异）各躲一杯，同串换位中各自追踪；
   第一步问 A 点对='half'（A 蹦出+链 [hc_right,hc_n_A,hc_n_B] 链尾名音=第二问
   预告）→ 第二步点对=right/done（确认链尾=hc_n_B）。
   hidetriple（r51 新题型）：三只动物（animA/B/C 池 5 取 3 互异）各躲一杯，
   同串换位各自追踪；三步作答：第一步对='half'（A 蹦出+链 [hc_right,hc_n_A,
   hc_n_B]）→ 第二步对='half'（B 蹦出+链 [hc_right,hc_n_B,hc_n_C]）→ 第三步
   对=right/done（确认链尾=hc_n_C）。half 不推 step 不计 miss；每个 half 解锁
   处重置救援钟 lastAct（r25 M2 铁律沿袭）。
   swaps=每次互换的两杯下标对 (a,b) a≠b，相邻两次换位至少一杯不同
   （禁连续同一对回滚式假换；c=4 异集合候选域 10 恒可选）；
   answer=动物初始杯下标 start 经 swaps 序列逐次互换推导（dual/triple 按
   phase 动态=当前步真值，permutation 双射恒推各答案两两互异）。
   点对=right+动物名音拼播（确认链 [hc_right, hc_n_<id>]——全 clip 无 keyless，
   契约 N 天然安全；r51 零新语音键，四段链全复用既有 11 条 hc_）。
   点错首错=错链 [hc_wrong, hc_hint]（豁免窗 5154=1656+150+3048+300 真时钟）+
   杯阵整体 wiggle（方向级不指杯）；miss≥2=正确杯 breathe（答案级，correctIdx
   =q.answer=当前步真值 phase 感知自动适配）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- 动物池 5（SPEC §0.82：每关一主一只躲、其余不出场；r51 dch≥3 一副
   dch4 一第三只——池 5 取 3 互异，见 game-core genLevel 取数时机） ---------- */
const ANIMALS = ['rabbit', 'cat', 'bear', 'dog', 'duck'];
const ANIMAL_NAME = { rabbit: '兔子', cat: '小猫', bear: '小熊', dog: '小狗', duck: '小鸭' };
const nameClip = id => 'hc_n_' + id;         // 名音键（晓晓读动物名）

/* ---------- 演出时序常量（SPEC §0.82 基线 + SPEC-R51 四档提速）
   r51 提速四档（难度曲线上移）：dch1=900 / dch2=800 / dch3=700 / dch4=600
   （每档 -100ms——快换=追踪窗收窄）；教学恒 1600 慢速（教学链零改动，
   SWAP_MS_TUT 不动）。 */
const PEEK_MS = 1500;                        // 动物探头亮相 1.5s
const HIDE_MS = 400;                         // 亮相毕缩回杯内
const SHOW_WIN = 4300;                       // 亮相链窗 ≥ max(3738, 名音1440+150+estMs('要躲猫猫啦')2325+300=4215)
const SHOW_WIN_TUT = 4200;                   // 教学亮相窗（rabbit 名音 1368+150+2625=4143）
const SHOW_WIN_DUAL = 5400;                  // 双动物亮相链窗 ≥ 名音1440×2+150×2+hc_show1848+300=5328（两只轮流探头 3800 容纳）
const SHOW_WIN_TRIPLE = 7000;                // r51 三动物亮相链窗 ≥ 名音1440×3+150×3+hc_show1848+300=6918（三只轮流探头 5700 容纳）
const HALF_WIN = 5800;                       // dual 第一步→第二步 / triple 第一步→第二步、第二步→第三步窗 ≥ hc_right2232+150+名音1440+150+名音1440+300=5712（链尾名音=下一问预告）
const SWAP_MS_D1 = 900;                      // r51 dch1 档（旧 1100 退役——曲线整体前移）
const SWAP_MS_D2 = 800;                      // r51 dch2 档
const SWAP_MS_D3 = 700;                      // r51 dch3 档
const SWAP_MS_D4 = 600;                      // r51 dch4 档（快换）
const SWAP_MS_TUT = 1600;                    // 教学演示换位更慢（SPEC §1：教学链零改动）
const swapMsOf = dch => dch >= 4 ? SWAP_MS_D4 : (dch === 3 ? SWAP_MS_D3 :
                   (dch === 2 ? SWAP_MS_D2 : SWAP_MS_D1));   // 档位单点（presentQuiz/doReplay 共用——重演同速不降难度）
const STILL_MS = 800;                        // 换完全场静止 800ms
const RESET_MS = 500;                        // 重演回位窗
const OPEN_MS = 600, CLOSE_MS = 500;         // 空开 600+盖回 500=1100 锁窗
const CELE_MAIN = 1600, CELE_TAIL = 3000;    // 判对演出窗 4600 ≥ 确认链 2232+150+1440+300=4122
const TUT_CELE = 1600 + 2450;                // 教学演示演出窗 ≥ 2232+150+1368+300=4050
const WRONG_CHAIN_WIN = 5154;                // 错链豁免窗=wrong 1656+150+hint 3048+300（真时钟）

/* ---------- 章配置（SPEC-BATCH34 §0.82 真值表 + SPEC-R51 §R2 章型表全换）
   dch1 c=3 s=2 / dch2 c=4 s=3（单动物）；dch3 主型 c=4 s=4+dc/ds=4/4（双动物腿）；
   dch4 主型 c=4 s=5 + dc/ds=4/5（双动物腿）+ tc/ts=4/4（三动物腿）。
   KINDS3/KINDS4=qi 位固定谱（r51：dch3 谱 3 单+2 双、dch4 谱 2 单+2 双+1 三，
   各形态每关恒在场——确定性替代掷币，r24/r25 同范式）；dch1/dch2 全 hide 无谱表。
   生成关 flat≥20 每关随机章参数 dch=ri(rnd,1,4)——seeded 随机域全档成立型，
   b33 硬性②显式声明）。
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言） ---------- */
const CH_CFG = { 1: { c: 3, s: 2 }, 2: { c: 4, s: 3 },
                 3: { c: 4, s: 4, dc: 4, ds: 4 },
                 4: { c: 4, s: 5, dc: 4, ds: 5, tc: 4, ts: 4 } };
const KINDS3 = ['hide', 'hidedual', 'hide', 'hidedual', 'hide'];
const KINDS4 = ['hide', 'hidedual', 'hidetriple', 'hidedual', 'hide'];
const CHAPTERS = {
  1: { name: '杯杯藏猫猫', hint: '四个杯杯来啦，跟紧看' },   // 预告 ch2 c=4 s=3
  2: { name: '四个杯杯来啦', hint: '藏两只啦，各记各的' },   // 预告 ch3（r51：4杯4换+双动物）
  3: { name: '两只一起藏', hint: '三只小动物藏猫猫' },       // 预告 ch4（r51：三动物三问）
  4: { name: '藏猫猫大挑战', hint: '新一轮藏猫猫开始' }      // 预告生成关
};
const GEN_HINTS = ['三个杯子换两次',        // dch1 c=3 s=2
                   '四个杯子换三次',        // dch2 c=4 s=3
                   '四个杯子藏两只',        // dch3（r51：4杯4换+双动物）
                   '四个杯子藏三只'];       // dch4（r51：4杯5换+三动物）
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=hc_ 已核
   manifest 无占用（SPEC §4 2026-09-11 实查））。clip 实长（batch34/_clipdur34.json，
   浏览器 Audio 实测）：tut_watch 3264 / tut_turn 1824 / hint 3048 / right 2232（判对后窗
   ≥2532）/ wrong 1656 / show 1848；名音 hc_n_*：bear 1440 / dog 1416 / duck 1392 /
   rabbit 1368 / cat 1368（全集 max 1440——确认链 right+150+名音+300 ≥ 4122；
   错链 wrong 1656+150+hint 3048+300 = 5154） ---------- */
const VOICE = {
  watch: { key: 'hc_tut_watch', text: '看！小动物藏起来啦' },
  turn:  { key: 'hc_tut_turn',  text: '你来试一试' },
  hint:  { key: 'hc_hint',      text: '再想一想，看杯子怎么动' },
  right: { key: 'hc_right',     text: '找到啦，真棒' },
  wrong: { key: 'hc_wrong',     text: '再想一想' },
  show:  { key: 'hc_show',      text: '要躲猫猫啦' }      // 亮相链尾段（T46 化：走 clip 播报，原 keyless 绕过退役）
};
const Q_TEXT = '小动物藏在哪里呀';                        // 纯文字问句（本款无问句 clip，不播）

/* ---------- 杯 SVG（viewBox 0 0 130 150；暖橙不透明杯身——盖住动物的核心道具）
   根组 g[data-anim="cup"]——契约 M 帧内容断言锚。 ---------- */
const CUP_EL =
  /* 杯身梯形（不透明暖橙）+ 口缘椭圆 + 杯内暗色开口暗示 + 装饰条纹 + 高光 */
  '<path d="M17 36 L28 126 a37 17 0 0 0 74 0 L113 36 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
  '<path d="M33 66 h64 M31 96 h68" stroke="#F5C489" stroke-width="7" opacity=".85"/>' +
  '<path d="M40 52 q-4 40 2 78" stroke="#FBE3BC" stroke-width="6" stroke-linecap="round" opacity=".8"/>' +
  '<ellipse cx="65" cy="36" rx="48" ry="15" fill="#F5C489" stroke="' + INK + '" stroke-width="3.5"/>' +
  '<ellipse cx="65" cy="36" rx="36" ry="10" fill="#8A5A3B" opacity=".9"/>';
function cupSvg(size) {
  const s = size ? ' width="' + size + '" height="' + Math.round(size * 150 / 130) + '"' : ' width="130" height="150"';
  return '<svg viewBox="0 0 130 150"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="cup">' + CUP_EL + '</g></svg>';
}

/* ---------- 动物 SVG 工厂：animalSvg(id, size)——池 5 全定义（verify 单元①断言全在场）
   viewBox 0 0 120 120 卡通大头（6-8 岁一眼可辨）；根组 g[data-anim=<id>]。 ---------- */
const A_EYE = '<circle cx="47" cy="63" r="4.6" fill="' + INK + '"/><circle cx="73" cy="63" r="4.6" fill="' + INK + '"/>';
const A_CHEEK = '<ellipse cx="38" cy="74" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/><ellipse cx="82" cy="74" rx="6.5" ry="4.5" fill="#F2B8C6" opacity=".8"/>';
const ANIMAL_EL = {
  rabbit:   /* 白兔：长耳粉内耳+圆头+蝴蝶结领口 */
    '<ellipse cx="44" cy="30" rx="11" ry="24" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(-8 44 30)"/>' +
    '<ellipse cx="44" cy="32" rx="5" ry="15" fill="#F2B8C6" transform="rotate(-8 44 32)"/>' +
    '<ellipse cx="76" cy="28" rx="11" ry="25" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(10 76 28)"/>' +
    '<ellipse cx="76" cy="30" rx="5" ry="16" fill="#F2B8C6" transform="rotate(10 76 30)"/>' +
    '<circle cx="60" cy="70" r="36" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
    A_EYE + A_CHEEK +
    '<ellipse cx="60" cy="72" rx="5" ry="3.8" fill="#E8A0A8"/>' +
    '<path d="M55 80 q2.5 3 5 0 q2.5 3 5 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  cat:      /* 橘猫：三角耳+条纹额+胡须 */
    '<path d="M30 42 L35 14 L57 32 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M90 42 L85 14 L63 32 Z" fill="#F5B26B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M36 22 L42 30 M84 22 L78 30" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>' +
    '<circle cx="60" cy="68" r="36" fill="#F5B26B" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M52 38 l4 8 M60 36 v9 M68 38 l-4 8" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    A_EYE + A_CHEEK +
    '<path d="M56 74 l4 4 l4 -4" fill="#E8837A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M60 78 v4 M60 82 q-4 4 -8 2 M60 82 q4 4 8 2" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M22 68 h12 M23 78 l11 -3 M98 68 h-12 M97 78 l-11 -3" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  bear:     /* 棕熊：圆耳+浅色口鼻 */
    '<circle cx="33" cy="34" r="13" fill="#B98A5D" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="33" cy="34" r="6" fill="#E9D3B3"/>' +
    '<circle cx="87" cy="34" r="13" fill="#B98A5D" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="87" cy="34" r="6" fill="#E9D3B3"/>' +
    '<circle cx="60" cy="70" r="37" fill="#B98A5D" stroke="' + INK + '" stroke-width="3"/>' +
    A_EYE +
    '<ellipse cx="60" cy="82" rx="17" ry="12.5" fill="#E9D3B3"/>' +
    '<ellipse cx="60" cy="76" rx="5.2" ry="4" fill="' + INK + '"/>' +
    '<path d="M60 80 v4 M60 84 q-4 4 -8 1 M60 84 q4 4 8 1" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  dog:      /* 小狗：垂耳+额头白斑+吐舌 */
    '<ellipse cx="29" cy="60" rx="11" ry="21" fill="#A9744B" stroke="' + INK + '" stroke-width="3" transform="rotate(-13 29 60)"/>' +
    '<ellipse cx="91" cy="60" rx="11" ry="21" fill="#A9744B" stroke="' + INK + '" stroke-width="3" transform="rotate(13 91 60)"/>' +
    '<circle cx="60" cy="68" r="36" fill="#D9A56D" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M52 34 q8 -8 16 0 q-2 12 -8 14 q-6 -2 -8 -14 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    A_EYE + A_CHEEK +
    '<ellipse cx="60" cy="76" rx="6" ry="4.6" fill="' + INK + '"/>' +
    '<path d="M60 80 v3" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M55 84 q5 8 10 0 Z" fill="#EF9A9A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>',
  duck:     /* 小鸭：黄圆头呆毛+橙扁嘴 */
    '<circle cx="60" cy="66" r="34" fill="#F7D154" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M56 30 q4 -12 12 -10 M64 30 q2 -8 8 -8" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="48" cy="60" r="4.6" fill="' + INK + '"/><circle cx="72" cy="60" r="4.6" fill="' + INK + '"/>' +
    A_CHEEK +
    '<ellipse cx="60" cy="76" rx="18" ry="9.5" fill="#F0933F" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M42 76 h36" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<ellipse cx="60" cy="76" rx="3.6" ry="2.2" fill="#D9772E"/>'
};
function animalSvg(id, size) {
  if (!ANIMAL_EL[id]) return '';
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="106" height="106"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-anim="' + id + '">' + ANIMAL_EL[id] + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 杯+探头耳朵（藏猫猫主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="17" cy="17" rx="4" ry="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2" transform="rotate(-12 17 17)"/>' +
    '<ellipse cx="27" cy="17" rx="4" ry="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2" transform="rotate(12 27 17)"/>' +
    '<circle cx="22" cy="28" r="8.5" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="19" cy="27" r="1.3" fill="' + INK + '"/><circle cx="25" cy="27" r="1.3" fill="' + INK + '"/>' +
    '<path d="M8 38 a15 6 0 0 0 28 0 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>'
};
