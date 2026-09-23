/* ================= sentorder 句子拼拼乐 游戏数据（句库封闭 20 / 干扰封闭表 / 章配置 / 语音文案 / 句意插图）
   玩法：题 = 一句拆成词卡打乱 + 干扰词卡（候选池 = L+d 恒全摆）；
   儿童按正确语序逐词点选：点中「下一正确词」= fill + 入槽 + TTS 读词；
   全句拼满 = done（确认链 so_right + 整句 TTS 朗读——keyless TTS 段恒链尾，契约 N）；
   点语序跳前的本句词 = wrong（so_wrong_order 两级反馈之一）；
   点干扰词 = wrong（so_wrong_word）——两级错反馈，miss>=2 下一正确词卡 breathe（答案级）。
   句库约束（SPEC-BATCH34 §0.83）：句语序唯一合法（主语恒首/动宾不可拆序/状语固定后置）；
   干扰词 = 高频名词，与本句任何词组合不成合法 SVO 句（20 句全干扰表人工核定），
   全部入本文件封闭表——可静态审计（契约 L：全 TTS 无 clip 映射表需求）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（家族基调）
/* TTS 估时窗（家族 T 定版：SAPI ~345ms/字符 + 600 落定余量；全字符含标点） */
/* T46 化（2026-09-19）：estMs TTS 估长退役（词窗改字数档 worst clip 口径——
   verify 持独立 SPEC 副本对账） */

/* ---------- 句库封闭 40（r45 扩容：每章 10 句=存量 5 保位 + 新增 5 后缀；w=词序真值，
   t=整句句条=text=words.join('')，dist=人工核定干扰表，tp=语义陷阱标记（异义换序对））
   章句长：ch1=3 词 / ch2=4 词 / ch3=5 词 / ch4=3-6 混合（存量 3/4/5/4/5 + 新增 4/4/5/5/6）；
   句内词互异（点选判定无歧义）；词 ≤3 字；句 ≤9 字（窗数学——SPEC-R45 §R8）；
   ch1 首句 = 教学 watch 演示句「小兔子吃萝卜」（flat0 锚，逐字节保留）；
   干扰两池（build/verify 双录对账）：
   DIST_POOL 12 远域名词（存量，语义远距域——天文/文具/家具/交通工具）；
   NEAR_POOL 4 近对词（r45 新，ch3+ 新增句语序敏感干扰——「先/再↔然后」时序对 +
   「山下↔山上 / 桥下↔桥上 / 坡上↔坡下」方位对；近对仍走 wrong_word 两级反馈=字面恒真）。
   r45 陷阱律（tp 句，SPEC-BATCH34 §0.83 旧约束演进）：同义换序句禁入不变；
   异义换序句 ch4 放开（换序语法成立但语义不同——句意插图+整句朗读承载唯一真值，非猜测题） */
const SENT_BANK = {
  1: [ // 三词句（S+V+O，主语恒首，动宾不可拆序）——d=0 无干扰（起步下限不动）
    { w: ['小兔子', '吃', '萝卜'], t: '小兔子吃萝卜' },
    { w: ['小猫', '钓', '鱼'], t: '小猫钓鱼' },
    { w: ['小狗', '啃', '骨头'], t: '小狗啃骨头' },
    { w: ['小鸡', '吃', '米'], t: '小鸡吃米' },
    { w: ['小熊', '喝', '牛奶'], t: '小熊喝牛奶' },
    /* ---- r45 新增（一年级课标家庭/校园正主题，难度下限同档） ---- */
    { w: ['妈妈', '洗', '衣服'], t: '妈妈洗衣服' },
    { w: ['爸爸', '看', '报纸'], t: '爸爸看报纸' },
    { w: ['哥哥', '搭', '积木'], t: '哥哥搭积木' },
    { w: ['妹妹', '踢', '毽子'], t: '妹妹踢毽子' },
    { w: ['老师', '讲', '故事'], t: '老师讲故事' }
  ],
  2: [ // 四词句（S+在+P+V 介宾不可拆序动词恒尾 / r45 新：感叹句·把字句·副词动宾）——d=1 远域
    { w: ['小鱼', '在', '水里', '游'], t: '小鱼在水里游', dist: ['石头', '帽子'] },
    { w: ['小鸟', '在', '树上', '唱'], t: '小鸟在树上唱', dist: ['雨伞', '书包'] },
    { w: ['小狗', '在', '门口', '坐'], t: '小狗在门口坐', dist: ['灯', '星星'] },
    { w: ['小马', '在', '草地', '跑'], t: '小马在草地跑', dist: ['桌子', '雨伞'] },
    { w: ['小鸡', '在', '窝里', '叫'], t: '小鸡在窝里叫', dist: ['书包', '月亮'] },
    /* ---- r45 新增（下限同档 d=1 全远域；句式多样） ---- */
    { w: ['妹妹', '在', '屋里', '跳舞'], t: '妹妹在屋里跳舞', dist: ['飞机', '灯'] },
    { w: ['爷爷', '在', '公园', '打拳'], t: '爷爷在公园打拳', dist: ['桌子', '星星'] },
    { w: ['天气', '真', '好', '呀'], t: '天气真好呀', dist: ['帽子', '汽车'] },           // 感叹句（呀恒尾）
    { w: ['我', '把', '作业', '写完'], t: '我把作业写完', dist: ['椅子', '月亮'] },        // 把字句（S+把+O+V 刚性序）
    { w: ['大家', '一起', '做', '操'], t: '大家一起做操', dist: ['书包', '太阳'] }
  ],
  3: [ // 五词句——d=2；r45 新增句 dist=[近对, 远域]（时序对/方位对+远域，语序敏感干扰升级）
    { w: ['小猴子', '在', '树上', '吃', '桃'], t: '小猴子在树上吃桃', dist: ['月亮', '帽子'] },
    { w: ['小鸭子', '在', '水里', '捉', '鱼'], t: '小鸭子在水里捉鱼', dist: ['帽子', '星星'] },
    { w: ['小蜜蜂', '在', '花园', '采', '蜜'], t: '小蜜蜂在花园采蜜', dist: ['石头', '灯'] },
    { w: ['小兔子', '在', '草地', '上', '跳'], t: '小兔子在草地上跳', dist: ['书包', '月亮'] },
    { w: ['小猫', '用', '爪子', '抓', '球'], t: '小猫用爪子抓球', dist: ['月亮', '太阳'] },
    /* ---- r45 新增（近对干扰：先/再↔然后 时序对；山/桥/坡 方位对；数字+方位） ---- */
    { w: ['我', '先', '洗手', '再', '吃饭'], t: '我先洗手再吃饭', dist: ['然后', '月亮'] },     // 时序句
    { w: ['四只', '小羊', '在', '坡上', '吃草'], t: '四只小羊在坡上吃草', dist: ['坡下', '月亮'] }, // 数字+方位
    { w: ['小猴子', '在', '山下', '爬', '树'], t: '小猴子在山下爬树', dist: ['山上', '灯'] },     // 方位对
    { w: ['小螃蟹', '在', '桥下', '吹', '泡泡'], t: '小螃蟹在桥下吹泡泡', dist: ['桥上', '星星'] }, // 方位对
    { w: ['小猫', '先', '洗脸', '再', '睡觉'], t: '小猫先洗脸再睡觉', dist: ['然后', '太阳'] }    // 时序句
  ],
  4: [ // 3-6 混合（存量 3/4/5/4/5 + 新增 4/4/5/5/6）——d=1-2；r45 新增句可含近对+语义陷阱 tp
    { w: ['小熊', '吃', '蜂蜜'], t: '小熊吃蜂蜜', dist: ['石头', '书包'] },
    { w: ['小猪', '在', '泥里', '打滚'], t: '小猪在泥里打滚', dist: ['星星', '灯'] },
    { w: ['小朋友', '在', '教室', '读', '书'], t: '小朋友在教室读书', dist: ['雨伞', '帽子'] },
    { w: ['小鸡', '在', '窝里', '睡觉'], t: '小鸡在窝里睡觉', dist: ['石头', '帽子'] },
    { w: ['小松鼠', '在', '树上', '藏', '果子'], t: '小松鼠在树上藏果子', dist: ['月亮', '汽车'] },
    /* ---- r45 新增（tp=异义换序陷阱：句意插图消解；问句/感叹句句式；6 词句上探） ---- */
    { w: ['我', '扶', '奶奶', '下楼'], t: '我扶奶奶下楼', dist: ['雨伞', '书包'], tp: 1 },        // tp 我↔奶奶
    { w: ['小鸭子', '背', '小鸡', '过河'], t: '小鸭子背小鸡过河', dist: ['月亮', '汽车'], tp: 1 }, // tp 施受换位
    { w: ['小蝴蝶', '飞', '到', '哪里', '了'], t: '小蝴蝶飞到哪里了', dist: ['石头', '帽子'] },     // 问句（了恒尾）
    { w: ['小青蛙', '唱', '得', '真', '棒'], t: '小青蛙唱得真棒', dist: ['飞机', '桌子'] },         // 感叹句（得补语刚性序）
    { w: ['小猴子', '先', '爬', '树', '再', '摘桃'], t: '小猴子先爬树再摘桃', dist: ['然后', '书包'], tp: 1 } // tp+时序 6 词
  ]
};
/* 干扰词全局封闭池（12 远域——存量句与新句共用，build/verify 双录对账） */
const DIST_POOL = ['太阳', '月亮', '星星', '石头', '雨伞', '帽子', '书包', '灯', '汽车', '飞机', '桌子', '椅子'];
/* r45 近对干扰封闭池（4——仅 ch3/ch4 新增句 dist 取用；语义=时序对/方位对，SPEC-R45 §R4） */
const NEAR_POOL = ['然后', '山上', '桥上', '坡下'];
/* r45 键稳定律：SENT_ALL = 存量 20 句全局序 ⊕ 新增 20 句全局序——so_s_1..20 / so_w_1..54
   对存量句词零漂移（注册键不可重排）；新增句 so_s_21..40、新增词按本序首现 so_w_55..116 */
const SENT_OLD = [1, 2, 3, 4].reduce((a, c) => a.concat(SENT_BANK[c].slice(0, 5)), []);
const SENT_NEW = [1, 2, 3, 4].reduce((a, c) => a.concat(SENT_BANK[c].slice(5)), []);
const SENT_ALL = SENT_OLD.concat(SENT_NEW);   // 封闭 40（verify 对账）
/* 句意插图键注入：全局顺序 s1-s40（存量 ch1-ch4 各 5 句 s1-s20 + r45 新增 s21-s40，与 PIC 表对齐） */
SENT_ALL.forEach((s, i) => { s.pic = 's' + (i + 1); });
/* T46 化（2026-09-19）+ r45 扩容（2026-09-22）：题面整句 clip so_s_1..40（SENT_ALL 行序——
   存量 1..20 已注册，新增 21..40 两段制待主线注册，未注册期静默）；词 clip so_w_1..116
   （句词首现序；存量 1..54 已注册，新增 55..116 待注册；干扰词不点不读=无键）；
   词音窗按字数档 worst clip+300（1字 1248/2字 1440/3字 1704；r45 新词 estMs 945/1290/1635
   全域低于各档注册 worst——WORD_WIN 不动，注册后实测复核 TODO SPEC-R45 §R8） */
const SENT_CLIP = {};
SENT_ALL.forEach((s, i) => { SENT_CLIP[s.t] = 'so_s_' + (i + 1); });
const sentClipOf = q => SENT_CLIP[q.text];
const WORD_CLIP = {};
let __wi = 0;
SENT_ALL.forEach(s => s.w.forEach(w => { if (!(w in WORD_CLIP)) WORD_CLIP[w] = 'so_w_' + (++__wi); }));
const wordClipOf = w => WORD_CLIP[w];
const WORD_WIN = { 1: 1548, 2: 1740, 3: 2004 };   // 存量档 worst so_w clip+300（书 1248/小鸡 1440/小松鼠 1704）；
                                                  // 2 字档新词 worst 1464（洗手/四只/洗脸）窗 1740 仍罩（余 276 无尾截）——
                                                  // r45 段二实测口径，SPEC-R45 §R8（play 打断式单通道起播延迟≈0）

/* ---------- 章配置（章号 1 基；生成关 flat>=20 每关随机章参数 dch=ri(1,4)）
   hint=章末预告**下一章**文案（hint[i] <-> CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] <-> dch=k+1 ---------- */
const CHAPTERS = {
  1: { name: '三词句', hint: '四个词的长句子来啦' },     // 预告 ch2 四词+1 干扰
  2: { name: '四词句', hint: '五个词的长句子，看仔细' }, // 预告 ch3 五词+2 干扰
  3: { name: '五词句', hint: '长短句子混在一起，大挑战' }, // 预告 ch4 混合
  4: { name: '大挑战', hint: '新一轮拼句子开始啦' }      // 预告生成关
};
const GEN_HINTS = ['三词句，先想好第一词',        // dch1 三词无干扰
                   '四个词，还有一个捣蛋词',      // dch2 四词+1 干扰
                   '五个词，两个捣蛋词别点到',   // dch3 五词+2 干扰
                   '长短句子混合，仔细听'];   // dch4 混合 1-2 干扰
const CH_LEN = 5;          // 5 题 = 1 关（r45 扩容后每章句库 10 句，每关=滑窗取 5——SPEC §R2 轮转律）
const STATIC_LEVELS = 20;  // 静态 20 关 = 4 章

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造）
   6 条 so_ 通用 clip（SPEC-BATCH34 §2/§4）；词音/整句全 TTS 无 clip（6-7 识字期）。
   clip 实长（_clipdur34.json 真值）：watch 2952/turn 1824/hint 2760/
   right 2520/wrong_order 2424/wrong_word 2784；
   确认链=right 2520+150+整句 clip so_s worst 2952(s20)+300=5922（演出窗 7100 罩满——T46 clip 口径，原 estMs 口径 6675 退役）；
   错链两条取 max：word=2784+150+2760+300=5994（wrongChainUntil 6000） ---------- */
const VOICE = {
  watch:  { key: 'so_tut_watch',    text: '看！拼出一句话' },
  turn:   { key: 'so_tut_turn',     text: '你来拼一拼' },
  hint:   { key: 'so_hint',         text: '想一想，先说哪一个' },
  right:  { key: 'so_right',        text: '拼对啦，真厉害' },
  wordOrder: { key: 'so_wrong_order', text: '这个词要晚一点说' },   // 语序跳前（本句词但非下一词）
  wrongWord: { key: 'so_wrong_word',  text: '这个词不是这句话的' }  // 干扰词（不在本句）
};

/* ---------- 句意插图（r45 扩容 40 幅简笔 SVG，viewBox 0 0 100 100，INK 描边+柔和填色；
   承载句意真值维度：主体+动作情境——去掉图=不识字儿童失去语义通道，图=内容非装饰；
   陷阱句 s36/s37/s40 插图明确「谁扶谁/谁背谁/先做哪件」，异义换序由图消解） ---------- */
const GROUND = c => '<ellipse cx="50" cy="90" rx="34" ry="6" fill="' + c + '" opacity=".35"/>';
const NOTE = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="3.5" fill="#4A7FB5"/>' +
  '<path d="M' + x + ' ' + y + ' v-14 q6 1 6 5" stroke="#4A7FB5" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
/* 动物头部件（cx,cy 中心 r 半径 fill 主色 ear 耳型 none|long|round|droop|tuft|mane） */
const HEAD = (x, y, r, fill, ear) => {
  let e = '';
  if (ear === 'long') e = '<ellipse cx="' + (x - r * .45) + '" cy="' + (y - r * 1.1) + '" rx="' + r * .22 + '" ry="' + r * .75 + '" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(-12 ' + (x - r * .45) + ' ' + (y - r * 1.1) + ')"/>' +
    '<ellipse cx="' + (x + r * .45) + '" cy="' + (y - r * 1.1) + '" rx="' + r * .22 + '" ry="' + r * .75 + '" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" transform="rotate(12 ' + (x + r * .45) + ' ' + (y - r * 1.1) + ')"/>';
  else if (ear === 'round') e = '<circle cx="' + (x - r * .8) + '" cy="' + (y - r * .75) + '" r="' + r * .3 + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="' + (x + r * .8) + '" cy="' + (y - r * .75) + '" r="' + r * .3 + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="3"/>';
  else if (ear === 'droop') e = '<ellipse cx="' + (x - r * .85) + '" cy="' + (y - r * .3) + '" rx="' + r * .22 + '" ry="' + r * .5 + '" fill="#B98A5A" stroke="' + INK + '" stroke-width="3" transform="rotate(18 ' + (x - r * .85) + ' ' + (y - r * .3) + ')"/>' +
    '<ellipse cx="' + (x + r * .85) + '" cy="' + (y - r * .3) + '" rx="' + r * .22 + '" ry="' + r * .5 + '" fill="#B98A5A" stroke="' + INK + '" stroke-width="3" transform="rotate(-18 ' + (x + r * .85) + ' ' + (y - r * .3) + ')"/>';
  else if (ear === 'tuft') e = '<path d="M' + (x - r * .5) + ' ' + (y - r * .92) + ' l-4 -12 l10 6 Z M' + (x + r * .5) + ' ' + (y - r * .92) + ' l4 -12 l-10 6 Z" fill="#E8823C" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>';
  return e + '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + fill + '" stroke="' + INK + '" stroke-width="3.5"/>';
};
const EYES = (x, y, r) => '<circle cx="' + (x - r * .38) + '" cy="' + y + '" r="' + r * .12 + '" fill="' + INK + '"/>' +
  '<circle cx="' + (x + r * .38) + '" cy="' + y + '" r="' + r * .12 + '" fill="' + INK + '"/>';
/* r45 人物部件（新增句 s21-s40 用）：PHEAD 人头（肤 #F8D9A8 + 半圆发 + bun 发髻/pig 双马尾）；
   SMILE 笑嘴；SHEEP 云身小羊（s32 数字句用） */
const PHEAD = (x, y, r, hair, style) => {
  let extra = '';
  if (style === 'bun') extra = '<circle cx="' + x + '" cy="' + (y - r - 4) + '" r="' + r * .3 + '" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.5"/>';
  else if (style === 'pig') extra = '<circle cx="' + (x - r - 2) + '" cy="' + (y - r * .45) + '" r="' + r * .27 + '" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="' + (x + r + 2) + '" cy="' + (y - r * .45) + '" r="' + r * .27 + '" fill="' + hair + '" stroke="' + INK + '" stroke-width="2.5"/>';
  return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#F8D9A8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M' + (x - r) + ' ' + y + ' a' + r + ' ' + r + ' 0 0 1 ' + (2 * r) + ' 0 Z" fill="' + hair + '" stroke="' + INK + '" stroke-width="3"/>' + extra;
};
const SMILE = (x, y, w) => '<path d="M' + x + ' ' + y + ' q' + w + ' ' + Math.round(w * .8) + ' ' + (2 * w) + ' 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>';
const SHEEP = (x, y, s) => '<ellipse cx="' + x + '" cy="' + y + '" rx="' + 9 * s + '" ry="' + 7 * s + '" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>' +
  '<circle cx="' + (x + 7 * s) + '" cy="' + (y - 5 * s) + '" r="' + 4 * s + '" fill="#C9A87C" stroke="' + INK + '" stroke-width="2"/>' +
  '<path d="M' + (x - 5 * s) + ' ' + (y + 6 * s) + ' v' + 5 * s + ' M' + (x + 4 * s) + ' ' + (y + 6 * s) + ' v' + 5 * s + '" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>';
const PIC = {
  s1: GROUND('#8FBF7F') + HEAD(40, 50, 24, '#FBF7F0', 'long') + EYES(40, 46, 24) +
    '<path d="M32 58 q8 6 16 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M72 52 q4 -14 14 -8 l-4 26 q-1 6 -7 6 t-7 -6 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M76 44 q-2 -10 4 -12 M82 44 q1 -10 8 -9" stroke="#8FBF7F" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  s2: GROUND('#BFE0EE') + HEAD(34, 48, 22, '#F8D9A8', 'tuft') + EYES(34, 44, 22) +
    '<path d="M26 56 h16" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M14 56 h8 M14 62 h8 M62 56 h8 M62 62 h8" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M60 30 q14 2 12 20" stroke="' + INK + '" stroke-width="2.5" fill="none"/>' +
    '<path d="M72 50 l4 14" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M66 68 q10 -6 16 2 q-2 10 -12 8 q-8 -2 -4 -10 Z" fill="#7FA8D9" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="70" cy="72" r="2" fill="' + INK + '"/><path d="M64 70 q3 3 6 1" stroke="' + INK + '" stroke-width="2" fill="none"/>',
  s3: GROUND('#E5D5BC') + HEAD(36, 48, 24, '#D9A96F', 'droop') + EYES(36, 44, 24) +
    '<ellipse cx="36" cy="58" rx="10" ry="7" fill="#F6E7CC" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="36" cy="56" r="2.5" fill="' + INK + '"/>' +
    '<path d="M70 62 q-6 -12 6 -16 q10 3 8 14 l-2 8 h-10 Z" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="76" cy="48" r="4" fill="' + INK + '"/><circle cx="82" cy="60" r="4" fill="' + INK + '"/>',
  s4: GROUND('#F2DDC0') + HEAD(40, 46, 22, '#F8CB4A', 'tuft') + EYES(40, 42, 22) +
    '<path d="M32 54 l16 0" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M34 52 l12 4" stroke="#E86A5A" stroke-width="3.5" stroke-linecap="round"/>' +
    '<circle cx="72" cy="60" r="2.2" fill="' + INK + '"/><circle cx="80" cy="66" r="2.2" fill="' + INK + '"/>' +
    '<circle cx="74" cy="74" r="2.2" fill="' + INK + '"/><circle cx="66" cy="70" r="2.2" fill="' + INK + '"/><circle cx="84" cy="56" r="2.2" fill="' + INK + '"/>',
  s5: GROUND('#E5D5BC') + HEAD(36, 48, 24, '#C9A87C', 'round') + EYES(36, 44, 24) +
    '<ellipse cx="36" cy="58" rx="9" ry="6" fill="#F6E7CC" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M32 57 h8 M34 61 h4" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M64 46 h20 l-2 22 q-1 6 -8 6 t-8 -6 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M64 52 h20" stroke="#E8975A" stroke-width="3"/>' +
    '<path d="M70 46 v-8 q6 -3 10 0 v8" fill="none" stroke="' + INK + '" stroke-width="2.5"/>',
  s6: '<path d="M12 56 q10 -8 20 0 t20 0 t20 0 t20 0" stroke="#7FA8D9" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M14 70 q10 -8 20 0 t20 0 t20 0 t18 0" stroke="#7FA8D9" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>' +
    '<ellipse cx="52" cy="40" rx="20" ry="12" fill="#7FA8D9" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M72 40 l14 -8 v16 Z" fill="#7FA8D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="44" cy="38" r="3" fill="' + INK + '"/><circle cx="58" cy="35" r="2.5" fill="none" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M14 30 q4 6 0 12 M24 26 q4 8 0 16" stroke="#7FA8D9" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>',
  s7: '<rect x="42" y="34" width="10" height="52" rx="4" fill="#B98A5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M47 34 q-26 -4 -26 12 q0 12 16 10 q-22 6 -22 -10 q0 -20 32 -12 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M47 36 q24 -6 26 10 q0 12 -18 10 q22 6 24 -10 q0 -18 -32 -10 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="76" cy="26" r="12" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M70 20 l-5 -7 M82 20 l5 -7" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="72" cy="25" r="1.8" fill="' + INK + '"/><circle cx="80" cy="25" r="1.8" fill="' + INK + '"/>' +
    '<path d="M74 30 q2 2 4 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' + NOTE(90, 40),
  s8: '<path d="M62 14 h30 v76 h-30" fill="#F6E7CC" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="77" cy="48" r="5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="36" cy="72" rx="16" ry="11" fill="#D9A96F" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="30" cy="58" r="13" fill="#D9A96F" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="19" cy="56" rx="5" ry="9" fill="#B98A5A" stroke="' + INK + '" stroke-width="2.5" transform="rotate(20 19 56)"/>' +
    '<ellipse cx="41" cy="56" rx="5" ry="9" fill="#B98A5A" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-20 41 56)"/>' +
    '<circle cx="26" cy="56" r="2" fill="' + INK + '"/><circle cx="34" cy="56" r="2" fill="' + INK + '"/>' +
    '<path d="M28 62 q2 2 4 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  s9: GROUND('#8FBF7F') + '<path d="M20 86 q6 -12 2 -22 M28 86 q0 -10 6 -16 M36 86 q-2 -8 2 -12 M80 86 q-4 -10 0 -18" stroke="#6FA063" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="50" cy="52" rx="24" ry="14" fill="#E8A0A0" stroke="' + INK + '" stroke-width="3" transform="rotate(-8 50 52)"/>' +
    '<path d="M26 50 q-8 2 -10 -8 l12 2 Z" fill="#E8A0A0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 40 q10 -14 20 -6 l-4 8" fill="#8A5A3B" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="24" cy="44" r="7" fill="#E8A0A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M20 38 l-3 -6 M27 37 l1 -7" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="22" cy="43" r="1.8" fill="' + INK + '"/>' +
    '<path d="M18 46 l-6 1 M18 48 l-5 3" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M70 52 q10 -4 14 2" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M74 60 l16 6" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  s10: '<ellipse cx="50" cy="72" rx="34" ry="14" fill="#E2C39A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M20 74 q10 8 30 8 q20 0 30 -8" stroke="#B98A5A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="48" r="17" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M42 38 l-3 -10 M58 38 l3 -10" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="44" cy="46" r="2" fill="' + INK + '"/><circle cx="56" cy="46" r="2" fill="' + INK + '"/>' +
    '<path d="M46 54 q4 4 8 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' + NOTE(76, 30),
  s11: '<rect x="40" y="40" width="9" height="50" rx="4" fill="#B98A5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M44 42 q-22 -4 -22 10 q0 10 14 8 q-18 6 -18 -8 q0 -16 26 -10 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M44 42 q22 -4 22 10 q0 10 -14 8 q18 6 18 -8 q0 -16 -26 -10 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="72" cy="34" r="14" fill="#F8D9A8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="58" cy="36" rx="6" ry="5" fill="#F8D9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="86" cy="36" rx="6" ry="5" fill="#F8D9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="68" cy="32" r="2" fill="' + INK + '"/><circle cx="77" cy="32" r="2" fill="' + INK + '"/>' +
    '<path d="M70 40 q3 3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="24" cy="72" r="9" fill="#F2A9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M24 62 q-2 -8 2 -12 M24 62 q4 -6 2 -12" stroke="#8FBF7F" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M20 72 q4 3 8 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>',
  s12: '<path d="M10 62 q10 -8 20 0 t20 0 t20 0 t20 0" stroke="#7FA8D9" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M14 78 q10 -8 20 0 t20 0 t20 0 t14 0" stroke="#7FA8D9" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>' +
    '<circle cx="46" cy="40" r="15" fill="#F8E8B0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M31 40 l-12 4 l12 5 Z" fill="#F8CB4A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="41" cy="37" r="2" fill="' + INK + '"/><circle cx="48" cy="37" r="2" fill="' + INK + '"/>' +
    '<path d="M56 42 q6 2 8 6" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M78 66 q8 -5 14 1 q-2 9 -11 7 q-6 -2 -3 -8 Z" fill="#7FA8D9" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="82" cy="69" r="1.6" fill="' + INK + '"/>',
  s13: GROUND('#8FBF7F') +
    '<circle cx="26" cy="44" r="10" fill="#F2A9A0" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M26 34 a10 10 0 0 1 0 20 Z" fill="#E38BA0" opacity=".6"/>' +
    '<circle cx="26" cy="44" r="3" fill="#F8CB4A"/>' +
    '<path d="M74 54 q8 -22 16 -16 q-6 4 -6 10 q-2 8 -10 6 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="56" cy="52" rx="17" ry="12" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M62 42 v20 M68 44 v16" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<circle cx="48" cy="48" r="2.5" fill="' + INK + '"/>' +
    '<path d="M40 44 q-8 -12 4 -16 q8 -2 10 8" stroke="#BFE0EE" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M66 34 q10 -14 16 -8" stroke="#BFE0EE" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M56 62 l0 8" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>',
  s14: GROUND('#8FBF7F') +
    '<path d="M62 82 q-30 -8 -30 -34 q0 -10 6 -16" stroke="#E8975A" stroke-width="3" fill="none" stroke-dasharray="5 6" stroke-linecap="round"/>' +
    '<path d="M20 86 q6 -10 2 -18 M30 86 q0 -8 5 -12" stroke="#6FA063" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    HEAD(62, 34, 15, '#FBF7F0', 'long') + EYES(62, 31, 15) +
    '<ellipse cx="62" cy="52" rx="13" ry="16" fill="#FBF7F0" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="55" cy="58" rx="5" ry="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="69" cy="58" rx="5" ry="8" fill="#FBF7F0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="82" cy="26" r="4" fill="#F8CB4A" opacity=".8"/><circle cx="90" cy="36" r="3" fill="#F8CB4A" opacity=".6"/>',
  s15: HEAD(34, 36, 20, '#F8D9A8', 'tuft') + EYES(34, 33, 20) +
    '<path d="M28 44 h12" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<ellipse cx="62" cy="62" rx="18" ry="16" fill="#E38BA0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M50 52 q12 -8 24 0 M50 72 q12 8 24 0" stroke="#C77BA0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M78 48 q6 -10 14 -6 M80 56 q8 -4 14 2 M80 64 q8 0 12 6" stroke="#C77BA0" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="30" cy="66" rx="7" ry="10" fill="#F8D9A8" stroke="' + INK + '" stroke-width="3" transform="rotate(-24 30 66)"/>' +
    '<path d="M28 74 l-3 5 M32 74 l0 6" stroke="' + INK + '" stroke-width="2.2" stroke-linecap="round"/>',
  s16: GROUND('#E5D5BC') + HEAD(36, 48, 24, '#C9A87C', 'round') + EYES(36, 44, 24) +
    '<ellipse cx="36" cy="58" rx="9" ry="6" fill="#F6E7CC" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M60 40 h22 q4 0 3 5 l-4 22 q-1 5 -6 5 h-12 q-5 0 -6 -5 l-4 -22 q-1 -5 7 -5 Z" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 40 q10 -8 16 0" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M66 50 q3 6 0 12 M74 50 q3 6 0 12" stroke="' + INK + '" stroke-width="2" opacity=".4"/>' +
    '<circle cx="86" cy="30" r="2.5" fill="#F8CB4A"/><circle cx="78" cy="26" r="2" fill="#F8CB4A"/><circle cx="90" cy="40" r="2" fill="#F8CB4A"/>',
  s17: '<ellipse cx="50" cy="72" rx="36" ry="13" fill="#C9A87C" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="50" cy="72" rx="28" ry="9" fill="#B98A5A" opacity=".55"/>' +
    '<circle cx="48" cy="52" r="17" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M38 44 l-6 -8 M58 44 l6 -8" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<ellipse cx="48" cy="56" rx="7" ry="5" fill="#E38BA0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="45.5" cy="55" r="1.4" fill="' + INK + '"/><circle cx="50.5" cy="55" r="1.4" fill="' + INK + '"/>' +
    '<circle cx="42" cy="48" r="2" fill="' + INK + '"/><circle cx="54" cy="48" r="2" fill="' + INK + '"/>' +
    '<ellipse cx="48" cy="70" rx="14" ry="10" fill="#F2B8C6" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M62 66 q8 2 6 10" stroke="#B98A5A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="30" cy="34" r="2.5" fill="#8A7B6C" opacity=".5"/><circle cx="24" cy="42" r="2" fill="#8A7B6C" opacity=".4"/>',
  s18: '<rect x="14" y="14" width="72" height="58" rx="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M22 72 h56" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="50" cy="34" r="11" fill="#F8D9A8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M42 26 q8 -6 16 0 l-2 -8 q-6 -4 -12 0 Z" fill="#4A3B2E"/>' +
    '<circle cx="46" cy="34" r="1.8" fill="' + INK + '"/><circle cx="54" cy="34" r="1.8" fill="' + INK + '"/>' +
    '<path d="M47 39 q3 2 6 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 48 h20 l4 22 h-28 Z" fill="#8FB0D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M36 52 h28" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="38" y="56" width="24" height="14" rx="2" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M50 56 v14 M38 63 h24" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M78 20 l4 8 l8 1.5 l-6 6 l1.5 8 l-7.5 -4 l-7.5 4 l1.5 -8 l-6 -6 l8 -1.5 Z" fill="#F8CB4A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round" opacity=".8"/>',
  s19: '<ellipse cx="50" cy="70" rx="34" ry="14" fill="#E2C39A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M18 72 q12 8 32 8 q20 0 32 -8" stroke="#B98A5A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="48" r="16" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M42 39 l-3 -9 M58 39 l3 -9" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M43 48 q3 3 6 0 M53 48 q3 3 6 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<text x="78" y="30" font-size="13" fill="#8A7B6C" font-family="Arial">z z</text>',
  s20: '<rect x="64" y="36" width="9" height="56" rx="4" fill="#B98A5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M68 38 q-24 -4 -24 10 q0 10 15 8 q-19 6 -19 -8 q0 -16 28 -10 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M68 38 q20 -4 20 10 q0 10 -13 8 q17 6 17 -8 q0 -16 -24 -10 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="58" r="12" fill="#E8A0A0" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="19" cy="60" rx="5" ry="6" fill="#E8A0A0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<ellipse cx="41" cy="60" rx="5" ry="6" fill="#E8A0A0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="26" cy="56" r="2" fill="' + INK + '"/><circle cx="34" cy="56" r="2" fill="' + INK + '"/>' +
    '<path d="M28 62 q2 2 4 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M36 72 q18 -6 22 -24 q2 -10 -8 -10 q-8 0 -10 8 q12 -4 12 4 q0 12 -18 14" fill="#E8A0A0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="80" cy="60" r="6" fill="#E8975A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M80 52 q-2 -6 2 -9 M80 52 q4 -5 2 -9" stroke="#8FBF7F" stroke-width="2.2" fill="none" stroke-linecap="round"/>',
  /* ---- r45 新增句意插图 s21-s40（与 §R4 新句一一对应；承载句意真值——陷阱句 s36/s37/s40
     的插图明确「谁扶谁/谁背谁/先做哪件事」，异义换序由图消解） ---- */
  s21: GROUND('#BFE0EE') + PHEAD(32, 32, 15, '#6B4A35', 'bun') + EYES(32, 33, 15) + SMILE(28, 40, 4) +
    '<path d="M24 48 h16 l3 20 q-11 6 -22 0 Z" fill="#E38BA0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 52 l-8 12 M40 52 l6 12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M14 68 q18 12 36 0 l5 12 q-23 9 -46 0 Z" fill="#7FA8D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="66" r="3" fill="#FFF9EE" opacity=".9"/><circle cx="40" cy="63" r="2.4" fill="#FFF9EE" opacity=".75"/>' +
    '<path d="M60 20 h32" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M66 20 l0 15 q6 5 12 0 l0 -15" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="86" cy="44" r="3" fill="#F8CB4A" stroke="' + INK + '" stroke-width="1.5"/>',
  s22: GROUND('#F2DDC0') + PHEAD(34, 34, 15, '#4A3B2E', 'none') + EYES(34, 35, 15) +
    '<circle cx="28" cy="35" r="4.5" fill="none" stroke="' + INK + '" stroke-width="2"/><circle cx="40" cy="35" r="4.5" fill="none" stroke="' + INK + '" stroke-width="2"/><path d="M32.5 35 h3" stroke="' + INK + '" stroke-width="2"/>' +
    SMILE(30, 42, 4) +
    '<path d="M26 50 h16 l2 18 q-10 5 -20 0 Z" fill="#8FB0D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M44 56 l14 4 M24 56 l-6 10" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M52 60 l24 -3 l2 16 l-24 3 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M65 59 l-1 17" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M55 64 h7 M55 68 h7 M69 64 h7 M69 68 h7" stroke="' + INK + '" stroke-width="1.8" stroke-linecap="round" opacity=".6"/>',
  s23: GROUND('#E5D5BC') + PHEAD(36, 34, 15, '#6B4A35', 'none') + EYES(36, 35, 15) + SMILE(32, 42, 4) +
    '<path d="M28 50 h16 l2 20 q-10 5 -20 0 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M44 52 l14 8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="20" y="76" width="26" height="12" rx="2.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="22" y="63" width="22" height="12" rx="2.5" fill="#7FA8D9" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="25" y="50" width="16" height="12" rx="2.5" fill="#F8CB4A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<rect x="62" y="72" width="18" height="14" rx="2.5" fill="#E38BA0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="86" cy="34" r="4" fill="#F8CB4A" opacity=".8"/>',
  s24: GROUND('#BFE0EE') + PHEAD(34, 32, 15, '#6B4A35', 'pig') + EYES(34, 33, 15) + SMILE(30, 40, 4) +
    '<path d="M26 48 h16 l0 14 l-8 8 l-8 -8 Z" fill="#F2A9A0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 52 l-10 14 M42 52 l4 10" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M34 70 l14 10 M32 70 l-6 12" stroke="' + INK + '" stroke-width="3.5" stroke-linecap="round"/>' +
    '<path d="M56 70 l3 -12 l3 12 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M59 58 l-4 -12 M59 58 l0 -14 M59 58 l4 -12" stroke="#E38BA0" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="58" cy="82" r="1.6" fill="' + INK + '"/>',
  s25: GROUND('#F2DDC0') + PHEAD(34, 32, 15, '#6B4A35', 'bun') + EYES(34, 33, 15) + SMILE(30, 40, 4) +
    '<path d="M26 48 h16 l3 22 q-11 6 -22 0 Z" fill="#8FB0D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 54 l10 10" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M50 62 l12 -4 v18 l-12 4 Z M74 62 l-12 -4 v18 l12 4 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M62 60 v16" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M80 26 l2.2 4.4 4.8 .7 -3.5 3.4 .8 4.8 -4.3 -2.2 -4.3 2.2 .8 -4.8 -3.5 -3.4 4.8 -.7 Z" fill="#F8CB4A" stroke="' + INK + '" stroke-width="1.5" stroke-linejoin="round"/>',
  s26: '<path d="M12 46 L50 16 L88 46" fill="none" stroke="' + INK + '" stroke-width="3.5" stroke-linejoin="round"/>' +
    '<path d="M20 44 h60 v42 h-60 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    PHEAD(50, 50, 12, '#6B4A35', 'pig') + EYES(50, 51, 12) + SMILE(47, 57, 3) +
    '<path d="M42 63 h16 l1 16 q-9 5 -18 0 Z" fill="#E38BA0" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M42 66 l-10 -12 M58 66 l10 -12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M45 84 l-6 2 M55 84 l6 2" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    NOTE(24, 60) + NOTE(76, 58),
  s27: GROUND('#8FBF7F') +
    '<circle cx="34" cy="32" r="15" fill="#F8D9A8" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M19 30 a15 15 0 0 1 10 -12 l0 12 Z M49 30 a15 15 0 0 0 -10 -12 l0 12 Z" fill="#E8E0D0" stroke="' + INK + '" stroke-width="2.5"/>' +
    EYES(34, 33, 15) + SMILE(30, 40, 4) +
    '<path d="M26 48 h16 l3 20 q-11 6 -22 0 Z" fill="#C9A87C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 54 q-16 -2 -14 -14 M42 54 q16 -2 14 -14" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 70 l-4 12 M40 70 l4 12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="70" y="52" width="8" height="34" rx="3" fill="#B98A5A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="74" cy="46" r="16" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="20" cy="84" r="2.5" fill="#F2A9A0"/><circle cx="28" cy="87" r="2" fill="#F8CB4A"/>',
  s28: '<circle cx="50" cy="44" r="18" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M50 18 v-8 M50 70 v8 M24 44 h-8 M76 44 h8 M32 26 l-6 -6 M68 26 l6 -6 M32 62 l-6 6 M68 62 l6 6" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    EYES(50, 43, 18) + SMILE(45, 52, 5) +
    '<path d="M14 76 q6 -10 14 -4 q4 -8 12 -2 q8 -2 6 8 q-2 6 -14 5 q-12 2 -18 -7 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<circle cx="78" cy="78" r="4" fill="#F2A9A0" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M78 82 v10" stroke="#8FBF7F" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="22" cy="80" r="3.5" fill="#E38BA0" stroke="' + INK + '" stroke-width="2"/>',
  s29: GROUND('#E5D5BC') + PHEAD(34, 32, 15, '#6B4A35', 'none') + EYES(34, 33, 15) + SMILE(30, 40, 4) +
    '<path d="M26 48 h16 l3 22 q-11 6 -22 0 Z" fill="#8FB0D9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 54 l16 8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="54" y="60" width="30" height="24" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M54 66 h30 M62 60 v24" stroke="' + INK + '" stroke-width="1.8" opacity=".5"/>' +
    '<path d="M60 74 l5 6 l10 -14" stroke="#6FA063" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M84 48 l6 16 l-8 -2 Z" fill="#F8CB4A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M86 52 l8 -8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  s30: GROUND('#8FBF7F') +
    PHEAD(34, 34, 12, '#6B4A35', 'none') + EYES(34, 35, 12) + SMILE(31, 41, 3) +
    PHEAD(66, 34, 12, '#6B4A35', 'pig') + EYES(66, 35, 12) + SMILE(63, 41, 3) +
    '<path d="M26 48 h16 l2 16 q-10 5 -20 0 Z M58 48 h16 l2 16 q-10 5 -20 0 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M26 52 l-12 -12 M42 52 l12 -12 M58 52 l-12 -12 M74 52 l12 -12" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M28 66 l-4 14 M40 66 l4 14 M60 66 l-4 14 M72 66 l4 14" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M12 30 q38 -14 76 0" stroke="#7FA8D9" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>',
  s31: '<path d="M18 30 v-8 h28 v10" fill="none" stroke="#8A9BAE" stroke-width="5" stroke-linecap="round"/>' +
    '<rect x="12" y="24" width="12" height="6" rx="2" fill="#8A9BAE"/>' +
    '<path d="M46 32 l0 10" stroke="#7FA8D9" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M38 52 q8 8 16 0 l0 8 q-8 6 -16 0 Z" fill="#F8D9A8" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M62 56 q14 -12 26 0 q-2 16 -13 16 q-11 0 -13 -16 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="75" cy="56" rx="13" ry="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="71" cy="54" r="2.2" fill="#FFF"/><circle cx="77" cy="52" r="1.8" fill="#FFF"/><circle cx="75" cy="56" r="1.6" fill="#FFF"/>' +
    '<path d="M20 62 q8 10 22 8" stroke="#8FBF7F" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M30 86 h44" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round" opacity=".4"/>',
  s32: '<path d="M8 84 Q50 36 92 84 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    SHEEP(28, 62, 0.9) + SHEEP(48, 50, 1) + SHEEP(66, 56, 0.9) + SHEEP(80, 70, 0.8) +
    '<path d="M40 74 q-2 -6 2 -8 M58 78 q-2 -6 2 -8" stroke="#6FA063" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="14" cy="24" r="3.5" fill="#F8CB4A" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M14 20 q3 -4 0 -7 M14 20 q-3 -4 0 -7" stroke="#8FBF7F" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="86" cy="20" r="2.5" fill="#FFF9EE" stroke="#7FA8D9" stroke-width="2"/>',
  s33: GROUND('#E5D5BC') +
    '<path d="M4 86 Q34 38 64 86 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="68" y="44" width="9" height="42" rx="3.5" fill="#B98A5A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="72" cy="36" r="18" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
    HEAD(72, 58, 11, '#F8D9A8', 'tuft') + EYES(72, 57, 11) +
    '<path d="M68 70 v6 M76 70 v6" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M62 62 l-7 6 M82 62 l7 6" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<circle cx="88" cy="22" r="3.5" fill="#F2A9A0" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M88 18 q3 -4 0 -7 M88 18 q-3 -4 0 -7" stroke="#8FBF7F" stroke-width="2" fill="none" stroke-linecap="round"/>',
  s34: '<path d="M4 48 Q50 14 96 48 l0 6 Q50 24 4 54 Z" fill="#D9A96F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M18 48 v16 M34 40 v14 M50 36 v14 M66 40 v14 M82 48 v16" stroke="' + INK + '" stroke-width="2" opacity=".5"/>' +
    '<ellipse cx="50" cy="76" rx="14" ry="9" fill="#E8975A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="44" cy="66" r="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/><circle cx="56" cy="66" r="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="44" cy="65.5" r="1.2" fill="' + INK + '"/><circle cx="56" cy="65.5" r="1.2" fill="' + INK + '"/>' +
    '<path d="M36 80 l-8 4 M64 80 l8 4 M40 84 l-6 5 M60 84 l6 5" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M34 72 q-8 -4 -8 -10 M66 72 q8 -4 8 -10" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="30" cy="60" r="4.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/><circle cx="70" cy="60" r="4.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="38" cy="56" r="3" fill="none" stroke="#7FA8D9" stroke-width="2"/><circle cx="50" cy="50" r="4" fill="none" stroke="#7FA8D9" stroke-width="2"/><circle cx="61" cy="56" r="2.5" fill="none" stroke="#7FA8D9" stroke-width="2"/>',
  s35: GROUND('#F2DDC0') + HEAD(40, 46, 20, '#F8D9A8', 'tuft') +
    '<path d="M32 44 q3 3 6 0 M46 44 q3 3 6 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M34 54 q6 5 12 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="40" cy="72" rx="16" ry="11" fill="#F8D9A8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M30 80 l-3 6 M50 80 l3 6" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<ellipse cx="56" cy="52" rx="6" ry="8" fill="#F8D9A8" stroke="' + INK + '" stroke-width="2.5" transform="rotate(-30 56 52)"/>' +
    '<path d="M52 46 q4 4 8 2" stroke="#BFE0EE" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<text x="72" y="30" font-size="12" fill="#8A7B6C" font-family="Arial">z z</text>',
  s36: '<path d="M10 50 h16 v12 h16 v12 h16 v12 h16 v6 h-64 Z" fill="#E5D5BC" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    PHEAD(22, 34, 12, '#E8E0D0', 'bun') + EYES(22, 35, 12) + SMILE(19, 41, 3) +
    '<path d="M16 46 h12 l2 16 q-8 4 -16 0 Z" fill="#C77BA0" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M28 52 l10 0" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M18 62 v14" stroke="#B98A5A" stroke-width="3" stroke-linecap="round"/>' +
    PHEAD(48, 42, 10, '#6B4A35', 'none') + EYES(48, 43, 10) + SMILE(46, 48, 2.5) +
    '<path d="M42 52 h12 l2 14 q-8 4 -16 0 Z" fill="#8FB0D9" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M42 54 l-6 4" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M44 68 l-2 10 M52 68 l2 10" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>',
  s37: '<path d="M8 62 q10 -7 20 0 t20 0 t20 0 t20 0" stroke="#7FA8D9" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<path d="M14 76 q10 -7 20 0 t20 0 t20 0 t14 0" stroke="#7FA8D9" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/>' +
    '<ellipse cx="46" cy="60" rx="18" ry="12" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="28" cy="48" r="10" fill="#F8CB4A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M18 48 q-8 0 -8 5 q0 4 8 3 Z" fill="#F8CB4A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="26" cy="46" r="1.8" fill="' + INK + '"/>' +
    '<path d="M32 36 q4 -8 12 -6 l-2 8" fill="#F8CB4A" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<circle cx="48" cy="40" r="8" fill="#F8E8B0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M44 34 q4 -3 8 0" stroke="' + INK + '" stroke-width="2" fill="none"/>' +
    '<circle cx="45" cy="39" r="1.5" fill="' + INK + '"/><circle cx="51" cy="39" r="1.5" fill="' + INK + '"/>' +
    '<path d="M48 32 l3 -5 M50 33 l5 -3" stroke="#E8975A" stroke-width="2" stroke-linecap="round"/>',
  s38: '<path d="M16 76 Q30 60 44 66 Q58 72 66 52 Q72 38 62 30" stroke="#C9A87C" stroke-width="2.5" fill="none" stroke-dasharray="4 6" stroke-linecap="round"/>' +
    '<ellipse cx="62" cy="28" rx="3.5" ry="9" fill="' + INK + '"/>' +
    '<path d="M60 22 q-14 -12 -16 0 q-2 10 14 6 Z M64 22 q14 -12 16 0 q2 10 -14 6 Z" fill="#E38BA0" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M60 34 q-12 8 -12 14 q8 2 12 -8 Z M64 34 q12 8 12 14 q-8 2 -12 -8 Z" fill="#F2A9A0" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
    '<path d="M61 18 q-2 -6 -6 -8 M63 18 q2 -6 6 -8" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<text x="80" y="54" font-size="20" fill="#E8975A" font-family="Arial" font-weight="bold">?</text>' +
    '<circle cx="22" cy="26" r="2" fill="#F8CB4A" opacity=".6"/><circle cx="34" cy="18" r="2.6" fill="#F8CB4A" opacity=".5"/>',
  s39: GROUND('#8FBF7F') +
    '<ellipse cx="48" cy="66" rx="20" ry="14" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="34" cy="48" r="11" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/><circle cx="62" cy="48" r="11" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="34" cy="48" r="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/><circle cx="62" cy="48" r="4" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="34" cy="48" r="1.8" fill="' + INK + '"/><circle cx="62" cy="48" r="1.8" fill="' + INK + '"/>' +
    '<path d="M28 40 q-6 -8 -12 -6 M68 40 q6 -8 12 -6" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 62 q8 6 16 0" stroke="' + INK + '" stroke-width="2.5" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="48" cy="76" rx="7" ry="4" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2"/>' +
    NOTE(24, 34) + NOTE(78, 30) +
    '<path d="M14 50 q-4 6 0 12 M82 48 q4 6 0 12" stroke="#BFE0EE" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>',
  s40: GROUND('#E5D5BC') +
    '<rect x="46" y="46" width="9" height="44" rx="3.5" fill="#B98A5A" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="50" cy="36" r="22" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="24" cy="30" r="7" fill="#F2A9A0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M24 23 q3 -5 0 -8 M24 23 q-3 -5 0 -8" stroke="#8FBF7F" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="79" cy="26" r="7" fill="#F2A9A0" stroke="' + INK + '" stroke-width="2.5"/>' +
    '<path d="M79 19 q3 -5 0 -8 M79 19 q-3 -5 0 -8" stroke="#8FBF7F" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    HEAD(62, 42, 10, '#F8D9A8', 'tuft') + EYES(62, 41, 10) +
    '<path d="M58 34 q4 3 8 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M70 48 l11 -8" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>' +
    '<path d="M57 52 l-2 9 M66 52 l4 8" stroke="' + INK + '" stroke-width="2.5" stroke-linecap="round"/>'
};
/* 句意插图包装（aria 隐藏——语义由句条文字与 aria-label 承载）；句序号 s1-s40 */
const sentSvg = k => '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + (PIC[k] || '') + '</svg>';

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 三格词槽 + 星 */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="8" y="18" width="9" height="11" rx="2.5" fill="#E8975A" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="18" y="18" width="9" height="11" rx="2.5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<rect x="28" y="18" width="9" height="11" rx="2.5" fill="#F5C445" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M22 8.5 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.2" stroke-linejoin="round"/></svg>',
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
