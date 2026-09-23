/* ================= shadow 影子配对 游戏数据（r8 难度改造版；剪影库 / 章配置 / 语音文案 / 时长模型）
   r8 改造（AUDIT-56 #13 / 建议行 70）：原「1 目标 vs 3-4 剪影单步点选」=3 岁级（实测单关 9-18s
   正中"十几秒失兴趣"）。r8 升 5-6 岁执行功能档三机制：
     ① 旋转 + 部分遮蔽叠加：全卡随机旋转 0/90/180/270（心像旋转）+ 灌木遮蔽只露 30% 轮廓
        （部分轮廓辨识；全卡统一遮蔽——只遮答案卡会反向泄题）
     ② 多物同框连解：一屏 3-4 物影子逐一连对（连对消显；点"未来目标卡"= 晃动零惩罚不灰
        ——那张卡接下来还要用；连错零惩罚口径不变）
     ③ 两物影子重叠拆解：两个影子叠成一团，选出"这两个是谁的影子"双选
   章进阶（4 章 ×5 关 = 静态 20 关；生成关随机章参数）：
     ch1 多物连解（qi0 2 物热身；qi1-4 3-4 物 +1 干扰；零旋转零遮蔽）
     ch2 + 全卡随机旋转（qi0 热身全 0；qi1-4 目标卡恒非 0）
     ch3 + 遮蔽 70%（qi0 热身无遮蔽零旋转；qi1-4 遮蔽+旋转叠加）
     ch4 重叠拆解（qi0 热身；qi1-2 overlap 双选；qi3-4 混排=多物+遮蔽+旋转）
   注：LIB 15 项按 SPEC §1 枚举实现（枚举 6+4+5=15）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- 剪影库（SPEC §1 枚举逐项）：id / e=emoji / n=中名 / g=相似组
   quad 四足（轮廓相近：竖耳/圆头/四足身） / round 圆物（圆形主体） / feat 特色（高辨识轮廓） */
const LIB = {
  cat:       { e: '🐱', n: '小猫', g: 'quad' },
  dog:       { e: '🐶', n: '小狗', g: 'quad' },
  rabbit:    { e: '🐰', n: '小兔', g: 'quad' },
  bear:      { e: '🐻', n: '小熊', g: 'quad' },
  hamster:   { e: '🐹', n: '仓鼠', g: 'quad' },
  fox:       { e: '🦊', n: '狐狸', g: 'quad' },
  apple:     { e: '🍎', n: '苹果', g: 'round' },
  ball:      { e: '⚽', n: '皮球', g: 'round' },
  sun:       { e: '🌞', n: '太阳', g: 'round' },
  orange:    { e: '🍊', n: '橘子', g: 'round' },
  star:      { e: '⭐', n: '星星', g: 'feat' },
  balloon:   { e: '🎈', n: '气球', g: 'feat' },
  butterfly: { e: '🦋', n: '蝴蝶', g: 'feat' },
  fish:      { e: '🐠', n: '小鱼', g: 'feat' },
  frog:      { e: '🐸', n: '青蛙', g: 'feat' }
};
const LIB_IDS = Object.keys(LIB);                 // 15 项
const emojiOf = id => LIB[id].e;
const nameOf = id => LIB[id].n;
const groupOf = id => LIB[id].g;

/* ---------- 章配置（章号 1 基；dch=难度章号 (ch-1)%4+1 循环取材；生成关随机章参数）
   name=章名（chapterEnd 显示）；hint=打完本章时预告下一章的文案（§0.4"预告下一章"语义：
   nextHint(flat=章末关) 取 CHAPTERS[ci+1].hint——CHAPTERS[c].hint 在打完第 c 章时被用，
   描述的是第 c+1 章玩法；CHAPTERS[4].hint 描述生成关） */
const CHAPTERS = {
  1: { name: '连一连', hint: '影子会转圈圈啦，转过的也要认出来' },      /* 打完 ch1 → 预告 ch2 旋转 */
  2: { name: '转圈圈', hint: '影子要躲进灌木丛啦，只露一点点' },        /* 打完 ch2 → 预告 ch3 遮蔽 */
  3: { name: '灌木丛', hint: '两个影子会叠成一团，拆开看看是谁' },      /* 打完 ch3 → 预告 ch4 重叠 */
  4: { name: '叠罗汉', hint: '新一轮影子配对大挑战' }                   /* 打完 ch4 → 预告生成关 */
};
/* 生成关预告文案（按下一关实际难度章 dch 取：GEN_HINTS[dch-1]，家族契约 F 实算禁 (ci+1)% 字面） */
const GEN_HINTS = ['好多影子一起找，一个一个连', '转圈圈的影子也不怕',
                   '灌木丛里的影子看得清', '叠在一起的影子拆得开'];
const CH_LEN = 5;          // 5 题 = 1 关
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（题面句=晓晓 clip 封闭库；wrong=T46 阶段2 clip 化 sha_w_same 全句在册）
   r8 注：sha_tut_watch/sha_tut_turn/sha_hint 三键 2026-09-10 起在 manifest 被 batch23/share
   同名覆盖（games=['share']，音频=share 文本）——shadow 侧改用新键 sha_teach_* / sha_help
   （文本一字未改，gen_clips.py shadow 块注册；share 段与其游戏不动） */
const VOICE = {
  watch: { key: 'sha_teach_watch', text: '看！小影子和它的小伙伴' },
  turn:  { key: 'sha_teach_turn',  text: '你来连一连' },
  hint:  { key: 'sha_help',        text: '找一找一样的影子' },
  wrong: { key: 'sha_w_same',      text: '再找一找，一样的影子' }   /* 纠错轻语音 sayW（10s 节流 flat≥3）；T46 阶段2（09-19）keyless→clip 化 */
};
/* 题面整句（SPEC §1 例句：'找一找，谁的影子是小猫呀'）——读题/救援/重听共用；
   multi 题每连对一物换目标重读（q.t=当前 phase 目标，sha_q_* clip 逐物复用） */
const quizSpeech = q => '找一找，谁的影子是' + nameOf(q.t) + '呀';
/* overlap 双选题面句（r8 新键 sha_q_pair；两个影子叠成一团拆解） */
const pairSpeech = q => '这两个影子叠在一起啦，找一找是谁的影子呀';

/* ---------- SAPI 拼句时长估计（家族定版字面，禁 +300 变体——四处同步：
   本定义 / game-main 注释 / game-verify 断言 / build.py 字面 assert） */
const estMs = n => n * 345 + 600;

/* ---------- r8 单关推算时长模型（5-6 岁试玩口径，保守下界；verify 硬断言 ≥40s）
   STEP_MS.plain 每连对一步（零旋转单物辨识+触摸+消显演出）2.6s
   STEP_MS.rot   全卡旋转（心像旋转加成）3.0s
   STEP_MS.veil  遮蔽 70%（部分轮廓辨识+旋转叠加）3.2s
   STEP_MS.ovl   overlap 双选每步（双物拆解）3.6s
   SWITCH_MS     每题切换演出窗 900ms（game-main 既有 wait 口径）
   每连对步 = max(题面句语音窗 estMs(句长), 辨识步值)——语音窗与辨识重叠取大者不重复计
   （原版实测锚：5 步零旋转单选关 9-18s → 每步含演出 1.8-3.6s，plain 取低端 2.6s） */
const STEP_MS = { plain: 2600, rot: 3000, veil: 3200, ovl: 3600 };
const SWITCH_MS = 900;
const LEVEL_MIN_MS = 40000;   // 审计 #13 治理线：单关推算 ≥40s
/* 单题推算时长（verify 与独立副本共用源） */
function quizDurMs(q) {
  if (q.mode === 'overlap') return estMs(pairSpeech(q).length) + 2 * STEP_MS.ovl;
  let ms = 0;
  q.targets.forEach(tg => {
    const voice = estMs(quizSpeech({ t: tg }).length);
    let cog = STEP_MS.plain;
    if (q.veil[0]) cog = STEP_MS.veil;
    else if (q.rot.some(v => v !== 0)) cog = STEP_MS.rot;
    ms += Math.max(voice, cog);
  });
  return ms;
}
/* 单关推算时长（≥LEVEL_MIN_MS 硬断言用） */
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0) + CH_LEN * SWITCH_MS;
/* 单关决策步数（连对/双选子步总数；r8 第二道锚 ≥13——防"纯语音窗撑时长"失判别） */
const levelSteps = L => L.quizzes.reduce((s, q) => s + (q.mode === 'overlap' ? 2 : q.targets.length), 0);

/* ---------- 图标（内嵌 SVG 描线风；题面/选项图案用 emoji 系统字体） */
const ICONS = {
  /* logo：暖底圆牌 + 太阳与它的斜影（影子主题） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="19" cy="19" r="8" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M19 8.5 v-3 M29.5 19 h3 M19 29.5 v3 M8.5 19 h3 M26.4 11.6 l2.1 -2.1 M11.6 11.6 l-2.1 -2.1 M26.4 26.4 l2.1 2.1" stroke="#E8975A" stroke-width="2.6" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="28.5" cy="30.5" rx="10" ry="5.4" fill="' + INK + '" opacity=".82" transform="rotate(-14 28.5 30.5)"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* 灌木遮蔽层（r8 机制①：挡住剪影卡下方 70%，只露 30% 轮廓；草丛齿形） */
  bush: '<svg viewBox="0 0 100 76" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M0 76 V38 Q7 20 15 34 Q20 10 30 30 Q36 6 46 28 Q52 12 58 30 Q66 8 74 32 Q82 14 88 34 Q94 22 100 38 V76 Z" ' +
    'fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/></svg>'
};
