/* ================= idiom 成语填空 游戏数据（r16 难度改造 2026-09-16，7-8 岁「依语境选用」）
   delta=difficulty-audit/AUDIT-78 idiom 行定死：库 30→80 按义类分章（动作神态/数字/动物/自然/
   道理 五章各 16 条）/题干改情境句填成语（ctx 情境句+空位，候选成语卡）/加近义成语辨析题型
   （near 近义对：语义近但语境不合的干扰）/每关 5→8 题（6 fill+2 near）。
   7-8 岁难度锚：从「认得」升到「依语境选用」——孩子需读情境句、辨语义、在近义/同类干扰中
   选用唯一契合的成语（v1 图意配对玩法与 §0.33 图意一致契约随 r16 下线，图意 SVG 退役）。
   情境句与释义朗读（T46 阶段2 clip 化：idm_ctx_<idx>/idm_def_<idx> 1 基 80 条——
   原 read 正文先例 TTS 豁免随 Task#46 全量预合成撤销；题型指令句 idm_q_fill/idm_q_near
   与成语读音 idm_w_<idx> 全 clip 化）。 */
'use strict';

const INK = '#4A3B2E'; // 统一暖棕描边（DESIGN-SPEC §8）

/* ---------- r16 时长模型（门禁硬断言；认知步主体非演出窗——crd r12 范式）
   estMs = s.length*345+600（b25 定版：SAPI ~345ms/字+600，全字符口径标点计入）
   ——四方字面同步（源常量+此处注释+verify 独立副本 estN+build.py 字面 assert），改必四处同改。
   每题 dur = max(voice0, DECIDE_MS[kind]) + ADV_MS（读题窗与决策窗并行取大——听句时同步思考）：
     voice0 = ENTER 400 + estMs(指令句) + 150(段间) + estMs(ctx) + 300(尾余量)
   DECIDE_MS（7-8 岁认知决策推算，二年级「联系上下文理解词语」课标口径）：
     fill 22000：空位语义定位（~3s）+ 4 候选逐个回忆成语义（4×3.5s=14s）+ 语境契合决选（~5s）
     near 18000：两近义义素比对（~8s）+ 情境线索回查定位（~6s）+ 决选（~4s）
   验算（voice 恒 ≤ DECIDE——ctx 最长 28 字/指令最长 13 字口径，verify ⑫ 全量逐题复算）：
     fill 最坏 voice0 = 400 + estMs(10)=10*345+600=4050 + 150 + estMs(28)=28*345+600=10260
            + 300 = 15160 ≤ 22000（余 6840）
     near 最坏 voice0 = 400 + estMs(13)=13*345+600=5085 + 150 + 10260 + 300 = 16195
            ≤ 18000（余 1805）→ ctx 上限 28 字为硬门禁（verify ⑫ 断言）
   40 关 modeled 全部 ≥ LEVEL_MIN_MS 40000（r16 门禁；每关 6 fill+2 near 恒定构成 →
   每关 = 6*(22000+880) + 2*(18000+880) = 6*22880 + 2*18880 = 175040ms 恒值
   （DECIDE 恒主导）→ verify ⑫ 独立副本逐关对账 + MIN_EXACT 175040 精确防回漂）。 ---------- */
const estMs = s => s.length * 345 + 600;     // b25 定版（四方字面同步见上）
const ENTER_MS = 400;                        // 新题出场窗（读题链并行起算）
const SEG_GAP_MS = 150;                      // core queue 段间停顿（150ms）
const ADV_MS = 880;                          // 判对推进演出窗（照 wordprob r13/datacollect r14）
const DECIDE_MS = { fill: 22000, near: 18000 };
const LEVEL_MIN_MS = 40000;                  // 单关 modeled 下限硬断言（r16 门禁，7-8 岁口径）
const MIN_EXACT = 175040;                    /* 40 关 modeled 恒值（6*22880+2*18880；
                                                verify ⑫ 精确防回漂锚，占位 0 必 FAIL 禁交付 */
/* 题面句（voice0 的 estMs 输入=实际拼播念白全文：题型指令 clip 文本+情境句 TTS 文本） */
const Q_INSTR = {
  fill: '空格里该填哪个成语呀',
  near: '这两个成语很像，哪个更合适'
};
const voice0Ms = q => ENTER_MS + estMs(Q_INSTR[q.kind]) + SEG_GAP_MS + estMs(idmOf(q.idx).ctx) + 300;
const quizDurMs = q => Math.max(voice0Ms(q), DECIDE_MS[q.kind]) + ADV_MS;
const levelDurMs = L => L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);

/* ---------- 确认链窗（家族 G/H 动态化：窗=链实长+300，主窗 1600+尾窗按链补足）
   对链=[idm_right2, idm_w_<idx> 成语读音, idm_def_<idx> 释义尾段]（T46 阶段2 释义尾 clip 化
   ——全 clip 三段，文案/estMs 口径零变更，clip 实长 ≤ estMs 已实测最差裕 1422ms）；
   最坏链（保守上界，verify ⑫ 逐题精确复算）：
     right2 7 字 est 7*345+600=3015 + 150 + 读音 5 字 est 5*345+600=2325（鲤鱼跳龙门，库内最长）
     + 150 + 释义 18 字上界 est 18*345+600=6810（库实测 ≤16 字）+ 300 = 12750
   → 窗 1600+tail(=chain-1600) 恒 ≥ 链（演出窗不截断语音）。 ---------- */
const CHAIN_GAP = 150, WIN_PAD = 300;        // core queue 段间 150ms / 窗余量 300（家族 G/H）
const CONFIRM_BASE = 1600;                   // 判对主演出窗（情境卡亮+空位填入+候选卡亮）
const confirmChainMs = q => estMs(VOICE.right2.text) + CHAIN_GAP + estMs(idmOf(q.idx).id) +
  CHAIN_GAP + estMs(idmOf(q.idx).say) + WIN_PAD;
const confirmTailMs = q => Math.max(4200, confirmChainMs(q) - CONFIRM_BASE);  // 尾窗≥4200 承 v1 形态
/* 错链（契约 I 静态豁免窗）：[idm_wrong2, idm_hint2] 均 7 字 =
   est 3015 + 150 + est 3015 + 300 = 6480（verify 注释验算同源） */
const WRONG_CHAIN_MS = 6480;

/* ---------- 章配置（章号 1 基；难度章号 (ch-1)%5+1 循环；生成关 dch=ri(1,5)）
   hint=章末预告**下一章**文案（CHAPTERS[i].hint ↔ 第 i+1 章，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词断言）。 ---------- */
const CHAPTERS = {
  1: { name: '动作神态', hint: '数字藏成语里等你猜' },     // 预告 ch2 数字
  2: { name: '数字成语', hint: '小动物们要讲故事啦' },     // 预告 ch3 动物
  3: { name: '动物故事', hint: '大自然里藏着大智慧' },     // 预告 ch4 自然
  4: { name: '自然气象', hint: '故事里面有大道理' },       // 预告 ch5 道理
  5: { name: '道理启示', hint: '新一轮成语填空开始啦' }    // 预告生成关
};
const GEN_HINTS = ['读句子，选动作神态',   // dch1
                   '数字成语填一填',       // dch2
                   '动物故事选一选',       // dch3
                   '自然气象填一填',       // dch4
                   '道理启示用一用'];      // dch5
const CH_LEN = 8;           // 8 题 = 1 关（r16：5→8；6 fill+2 near）
const STATIC_LEVELS = 40;   // 静态 40 关 = 5 章 × 8 关
const N_CH = 5;             // 章数（r16：4→5）

/* ---------- 语音文案（r16 新 7 键沿 idm_ 前缀，已核 voice/gen_clips.py manifest 无占用
   2026-09-16 实查；旧 idm_tut_watch/tut_turn/hint/right/wrong 五键文本一字不改冻结 games=[]
   退役出注入——wordprob r13 wor_tpl 先例；语义随玩法变更走新键——mirrormaze r14 mm_hint2 同例）
   情境句 ctx 与释义 say=T46 阶段2 clip 化（idm_ctx_/idm_def_ 80 条）；成语读音=idm_w_<idx> 1 基 80 条 ---------- */
const VOICE = {
  watch2: { key: 'idm_tut_watch2', text: '看！读句子选成语' },
  turn2:  { key: 'idm_tut_turn2',  text: '你来选一选' },
  hint2:  { key: 'idm_hint2',      text: '读一读句子想一想' },
  right2: { key: 'idm_right2',     text: '选对啦，真厉害' },
  wrong2: { key: 'idm_wrong2',     text: '再读一读句子' },
  qfill:  { key: 'idm_q_fill',     text: '空格里该填哪个成语呀' },
  qnear:  { key: 'idm_q_near',     text: '这两个成语很像，哪个更合适' }
};
const qVoice = q => q.kind === 'near' ? VOICE.qnear : VOICE.qfill;

/* ---------- 成语库 80 条（r16：30→80，五章各 16 条；旧 30 条全部保留 idx 重排）
   i=1 基（顺序=读音 clip idm_w_1..80 定稿）
   id=成语 / say=白话释义（点对播出+错满 2 次小注显示，纯文字不 clip）
   ctx=情境句（含 4 字下划线空位 ____；14-28 字，verify 断言禁含本体成语整串）
   near=近义辨析对端 idx（0=无对；互指对称，每条至多 1 对——verify 断言唯一性） ---------- */
const IDIOMS = [
  /* --- ch1 动作神态 1-16 --- */
  { i: 1,  id: '手舞足蹈', ch: 1, near: 0,
    say: '高兴得手脚都舞动起来', ctx: '得了第一名，小明高兴得又蹦又跳，挥着两只手：____' },
  { i: 2,  id: '目瞪口呆', ch: 1, near: 15,
    say: '眼睛瞪大嘴张开，惊讶得说不出话', ctx: '魔术师从空帽子变出白兔，大家瞪圆眼张大嘴，____' },
  { i: 3,  id: '抓耳挠腮', ch: 1, near: 13,
    say: '着急得想不出办法', ctx: '这道题太难了，小东转来转去想不出办法，急得____' },
  { i: 4,  id: '东张西望', ch: 1, near: 5,
    say: '到处看，像在找什么东西', ctx: '橡皮不见了，小红看看桌底翻翻书包，急得到处____' },
  { i: 5,  id: '左顾右盼', ch: 1, near: 4,
    say: '向左看看，向右看看', ctx: '小刚走路脖子左转右转，差点撞上电线杆，____' },
  { i: 6,  id: '大摇大摆', ch: 1, near: 0,
    say: '走路神气活现，很得意', ctx: '考了满分，小胖昂头晃肩进教室，像只神气的小公鸡：____' },
  { i: 7,  id: '眉开眼笑', ch: 1, near: 8,
    say: '眉头舒展，满脸都是笑', ctx: '听说明天春游，小美一整天脸上都挂着笑，真是____' },
  { i: 8,  id: '捧腹大笑', ch: 1, near: 7,
    say: '笑得肚子疼，弯着腰直不起来', ctx: '小胖举着一百分的卷子，笑得弯了腰直不起身：____' },
  { i: 9,  id: '闷闷不乐', ch: 1, near: 10,
    say: '心里不痛快，不说话', ctx: '下棋输了，小光趴在桌上一句话也不说，____' },
  { i: 10, id: '无精打采', ch: 1, near: 9,
    say: '没有精神，蔫蔫的', ctx: '昨晚熬夜，今天上课他提不起劲，眼皮都快睁不开，____' },
  { i: 11, id: '笑逐颜开', ch: 1, near: 0,
    say: '笑容一下子开在了脸上', ctx: '收到好朋友寄来的礼物，小美一下子乐开了花，____' },
  { i: 12, id: '得意洋洋', ch: 1, near: 0,
    say: '非常得意，自以为了不起', ctx: '考了双百，小刚觉得自己了不起，走路都轻飘飘的，____' },
  { i: 13, id: '绞尽脑汁', ch: 1, near: 3,
    say: '费尽心思，拼命地想', ctx: '为了解开这道谜语，小华趴在桌上想啊想啊，真是____' },
  { i: 14, id: '镇定自若', ch: 1, near: 0,
    say: '不慌不忙，很冷静', ctx: '警报响了，小梅不喊不叫，慢慢排好队往前走，真是____' },
  { i: 15, id: '大吃一惊', ch: 1, near: 2,
    say: '吓了一大跳，很吃惊', ctx: '轰隆一声雷在头顶炸开，小东吓得浑身一抖：____' },
  { i: 16, id: '幸灾乐祸', ch: 1, near: 0,
    say: '别人倒霉了，自己却在高兴', ctx: '小胖忘带作业挨了批评，小刚在边上偷着乐，真是____' },
  /* --- ch2 数字成语 17-32 --- */
  { i: 17, id: '一心一意', ch: 2, near: 0,
    say: '心思很专一，不想别的', ctx: '小美每天关门练琴，连喊吃饭都不应，真是____' },
  { i: 18, id: '犹豫不决', ch: 2, near: 19,
    say: '拿不定主意，不知选哪个', ctx: '买机器人还是积木？小东拿起这个又放下，____' },
  { i: 19, id: '三心二意', ch: 2, near: 18,
    say: '心思不专，一会儿想这一会儿想那', ctx: '写作业时，小刚一会儿想踢球，一会儿想动画片，____' },
  { i: 20, id: '聚精会神', ch: 2, near: 0,
    say: '注意力很集中，专心做事', ctx: '图书馆里，大哥哥盯着书一眨不眨，说话声都听不见：____' },
  { i: 21, id: '心乱如麻', ch: 2, near: 31,
    say: '心里乱糟糟的，静不下来', ctx: '明天就比赛了，小红坐立不安，心里乱糟糟的，____' },
  { i: 22, id: '十全十美', ch: 2, near: 30,
    say: '各方面都很好，没有缺点', ctx: '生日会有蛋糕有礼物有好朋友，样样都齐了，____' },
  { i: 23, id: '一鸣惊人', ch: 2, near: 25,
    say: '平时不显眼，一出手就让大家吃惊', ctx: '小华平时不爱说话，美术比赛却一下拿了第一，真是____' },
  { i: 24, id: '百发百中', ch: 2, near: 0,
    say: '每次都命中，从不落空', ctx: '套圈游戏，大哥哥扔一个中一个，一个都不落空，____' },
  { i: 25, id: '一举成名', ch: 2, near: 23,
    say: '做成一件事，一下子出了名', ctx: '小明得了全市第一，全校一下子都认识了他，真是____' },
  { i: 26, id: '四通八达', ch: 2, near: 0,
    say: '路通向四面八方，去哪儿都方便', ctx: '这城市的大路通向东西南北，去哪儿都方便，____' },
  { i: 27, id: '五颜六色', ch: 2, near: 0,
    say: '颜色又多又好看', ctx: '集市的气球红的黄的黑的绿的，什么颜色都有，____' },
  { i: 28, id: '千军万马', ch: 2, near: 0,
    say: '人马很多，声势很大', ctx: '运动会的队伍像潮水一样涌过来，____' },
  { i: 29, id: '杯水车薪', ch: 2, near: 0,
    say: '力量太小，解决不了大问题', ctx: '他捐零花钱帮受灾小朋友，这点钱对重建是____' },
  { i: 30, id: '十拿九稳', ch: 2, near: 22,
    say: '很有把握，不会出问题', ctx: '每道题小兰都认真复习了，考好是____' },
  { i: 31, id: '乱七八糟', ch: 2, near: 21,
    say: '乱得没有条理', ctx: '弟弟玩过之后，玩具扔得满地都是，房间____' },
  { i: 32, id: '一清二楚', ch: 2, near: 0,
    say: '清清楚楚，明明白白', ctx: '老师讲了一遍，小东马上明白了，心里____' },
  /* --- ch3 动物故事 33-48 --- */
  { i: 33, id: '画蛇添足', ch: 3, near: 0,
    say: '做了多余的事，反而把事情弄坏了', ctx: '画已经画好了，他偏又加了几笔，结果弄坏了：____' },
  { i: 34, id: '井底之蛙', ch: 3, near: 48,
    say: '眼界小，以为天只有井口大', ctx: '小青蛙坐在井里看天，以为天只有井口大，真是____' },
  { i: 35, id: '守株待兔', ch: 3, near: 0,
    say: '光等着好运来，自己不肯努力', ctx: '他在树下捡过一只撞晕的兔子，就天天守着树等，____' },
  { i: 36, id: '对牛弹琴', ch: 3, near: 0,
    say: '对不懂的人讲道理，白讲了', ctx: '小刚教一岁的小弟弟乘法口诀，弟弟只会咯咯笑：____' },
  { i: 37, id: '狐假虎威', ch: 3, near: 46,
    say: '借着别人的威风吓唬人', ctx: '小狐狸走在前面，老虎跟在后面，动物们全吓跑了：____' },
  { i: 38, id: '鸡飞狗跳', ch: 3, near: 0,
    say: '闹得乱七八糟，鸡和狗都受了惊', ctx: '院里一声炮响，鸡扑着翅膀跑，狗跳着汪汪叫，____' },
  { i: 39, id: '如鱼得水', ch: 3, near: 45,
    say: '到了适合自己的地方，特别自在', ctx: '小美一到图书馆就能痛快看书，每天都像____' },
  { i: 40, id: '惊弓之鸟', ch: 3, near: 0,
    say: '受过惊吓，一点动静就特别害怕', ctx: '大雁被箭伤过，光听弓弦一响，就吓得从天上掉下来：____' },
  { i: 41, id: '亡羊补牢', ch: 3, near: 0,
    say: '出了错马上改，还来得及', ctx: '羊圈破洞丢了羊，牧羊人赶紧修好栏杆，____' },
  { i: 42, id: '叶公好龙', ch: 3, near: 0,
    say: '嘴上说喜欢，真的来了又害怕', ctx: '他天天画龙绣龙，真龙把头伸进窗，他却吓白了脸：____' },
  { i: 43, id: '老马识途', ch: 3, near: 44,
    say: '有经验的马认得路，能带大家回来', ctx: '商队迷路了，是马认得回家的路，把大家带了出来：____' },
  { i: 44, id: '骑驴找驴', ch: 3, near: 43,
    say: '东西就在身边，却到处去找', ctx: '他坐在毛驴背上还问：我的毛驴去哪儿了？真是____' },
  { i: 45, id: '如虎添翼', ch: 3, near: 39,
    say: '本领强的人又得到帮助，更厉害了', ctx: '运动健将又学会新本领，像大老虎长出了翅膀：____' },
  { i: 46, id: '狗仗人势', ch: 3, near: 37,
    say: '靠着主人的威风欺负别人', ctx: '小狗得了主人夸奖，对着生人叫得比谁都凶：____' },
  { i: 47, id: '鲤鱼跳龙门', ch: 3, near: 0,
    say: '努力一跳，一下子成功了', ctx: '小鱼儿天天练习往上跳，想有一天跳过龙门，____' },
  { i: 48, id: '鼠目寸光', ch: 3, near: 34,
    say: '眼光短，只看到眼前', ctx: '他只顾眼前玩得开心，从来不想以后，真是____' },
  /* --- ch4 自然气象 49-64 --- */
  { i: 49, id: '水滴石穿', ch: 4, near: 0,
    say: '小力量坚持不停，也能成大事', ctx: '一滴又一滴，一年又一年，岩石竟然被滴穿了：____' },
  { i: 50, id: '雪中送炭', ch: 4, near: 51,
    say: '在别人最需要的时候去帮忙', ctx: '天最冷时爷爷家没煤了，邻居顶着大雪送煤来：____' },
  { i: 51, id: '锦上添花', ch: 4, near: 50,
    say: '在好的上面再加好', ctx: '她本来就唱歌好听，又穿上漂亮裙子，就像____' },
  { i: 52, id: '瓜熟蒂落', ch: 4, near: 53,
    say: '时机到了，事情自然成功', ctx: '果子熟透了，没人碰它，自己从藤上掉了下来，____' },
  { i: 53, id: '水到渠成', ch: 4, near: 52,
    say: '条件够了，事情自然办成', ctx: '准备都做好了，到时候事情自然就成了，____' },
  { i: 54, id: '风和日丽', ch: 4, near: 58,
    say: '天气晴朗，风轻轻日暖暖', ctx: '春游那天太阳暖暖的，风吹得脸痒痒的，____' },
  { i: 55, id: '春暖花开', ch: 4, near: 59,
    say: '春天暖和了，花儿都开了', ctx: '四月天气不再冷，公园的桃花杏花都开了，____' },
  { i: 56, id: '电闪雷鸣', ch: 4, near: 0,
    say: '闪电亮，雷声轰隆隆响', ctx: '乌云里一道道亮光划过，头顶轰隆隆炸响：____' },
  { i: 57, id: '狂风暴雨', ch: 4, near: 0,
    say: '风很大，雨很急', ctx: '外面呼呼叫哗哗倒，大树刮得东倒西歪，____' },
  { i: 58, id: '秋高气爽', ch: 4, near: 54,
    say: '秋天天空高，空气清爽', ctx: '九月郊外，天空特别蓝特别远，呼吸特别舒畅：____' },
  { i: 59, id: '鸟语花香', ch: 4, near: 55,
    say: '鸟叫得好听，花开得飘香', ctx: '清晨的小树林，耳朵满是鸟儿歌声，鼻子满是花香：____' },
  { i: 60, id: '枯木逢春', ch: 4, near: 0,
    say: '干枯的树又活了过来', ctx: '被雷劈过的大树，今年春天又冒出了新芽，____' },
  { i: 61, id: '雨过天晴', ch: 4, near: 0,
    say: '雨停了天放晴，心情变好了', ctx: '两个好朋友吵了架，今天又一起玩了，心情就像____' },
  { i: 62, id: '草长莺飞', ch: 4, near: 0,
    say: '小草发芽，黄莺飞舞，春天有生机', ctx: '二月里地上冒出嫩绿芽，黄色小鸟飞来飞去，____' },
  { i: 63, id: '万物复苏', ch: 4, near: 0,
    say: '春天一到，万物都活了过来', ctx: '春天回来了，小草探头，小花张笑脸，到处____' },
  { i: 64, id: '雨后春笋', ch: 4, near: 0,
    say: '春雨后笋长得多，新事物不断出现', ctx: '新的游乐场一个个冒出来，就像____一样多' },
  /* --- ch5 道理启示 65-80 --- */
  { i: 65, id: '掩耳盗铃', ch: 5, near: 80,
    say: '捂住耳朵偷铃铛，骗自己', ctx: '他捂住耳朵去拿别人的东西，以为别人也听不见：____' },
  { i: 66, id: '拔苗助长', ch: 5, near: 77,
    say: '太着急想快点成功，反而坏事', ctx: '他把禾苗一棵棵往上拔，想让它快点长高，____' },
  { i: 67, id: '自相矛盾', ch: 5, near: 0,
    say: '说话前后打架，自己对不上', ctx: '他说矛什么都戳得穿，又说盾什么都戳不穿，这话____' },
  { i: 68, id: '滥竽充数', ch: 5, near: 0,
    say: '不会装会，混在里面凑数', ctx: '他不会吹这种乐器，却混在乐队里摇头晃脑装样子：____' },
  { i: 69, id: '买椟还珠', ch: 5, near: 0,
    say: '只要了漂亮外壳，退回了值钱的', ctx: '他留下了漂亮的盒子，把贵重的宝珠还给了别人，____' },
  { i: 70, id: '刻舟求剑', ch: 5, near: 0,
    say: '情况变了还用老办法，找不到答案', ctx: '剑掉进水里，他只在船边刻记号，想靠岸再捞，____' },
  { i: 71, id: '半途而废', ch: 5, near: 0,
    say: '事情做到一半就放弃', ctx: '才练了十天琴就不练了，这样____多可惜' },
  { i: 72, id: '助人为乐', ch: 5, near: 0,
    say: '帮助别人，自己心里也快乐', ctx: '小雷天天扶老爷爷过马路，心里也甜甜的：____' },
  { i: 73, id: '拾金不昧', ch: 5, near: 0,
    say: '捡到东西还给别人，不藏起来', ctx: '他在路上捡到钱包，站在原地等主人回来认领：____' },
  { i: 74, id: '万众一心', ch: 5, near: 75,
    say: '大家想到一块儿，力量特别大', ctx: '拔河时大家攥紧绳子一起用力，____，赢了个第一' },
  { i: 75, id: '异口同声', ch: 5, near: 74,
    say: '大家说的话一模一样', ctx: '老师问去不去公园，大家同时喊出一个字：去！____' },
  { i: 76, id: '多此一举', ch: 5, near: 0,
    say: '做了不需要做的事，白费功夫', ctx: '墙已经刷得很白，他偏又加一道彩线，真是____' },
  { i: 77, id: '急于求成', ch: 5, near: 66,
    say: '只想着快，不踏实', ctx: '为了早点去玩，他作业写得飞快，字全东倒西歪：____' },
  { i: 78, id: '事半功倍', ch: 5, near: 79,
    say: '方法对，功夫少效果却好', ctx: '学会记忆小窍门，十分钟就背下一整课，____' },
  { i: 79, id: '事倍功半', ch: 5, near: 78,
    say: '方法不对，功夫多效果却差', ctx: '没有方法，生字抄了十遍还是全错，____' },
  { i: 80, id: '自欺欺人', ch: 5, near: 65,
    say: '用理由骗自己，也骗别人', ctx: '他一点没复习，还不停说没问题没问题，这是____' }
];
const IDX_ALL = IDIOMS.map(function (x) { return x.i; });
const idmOf = i => IDIOMS[i - 1];
const idmKey = i => 'idm_w_' + i;              // 成语读音 clip（r16：idm_t_→idm_w_ 全新键族）

/* ---------- 图标（全部内嵌 SVG，描线风，主色 INK 暖棕 / 暖橙点缀；图意 SVG 随 r16 玩法退役） ---------- */
const ICONS = {
  /* logo：一张句子卡+两张小成语卡（点题"读句子选成语"） */
  logo: '<svg viewBox="0 0 44 44" width="30" height="30" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="4" y="6" width="26" height="14" rx="3" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M8 11 h12 M8 15 h8" stroke="#E8975A" stroke-width="2.4" stroke-linecap="round"/>' +
    '<rect x="6" y="26" width="14" height="11" rx="3" fill="#FDEBD2" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M9 32 h8" stroke="#8FBF7F" stroke-width="2.4" stroke-linecap="round"/>' +
    '<rect x="24" y="26" width="14" height="11" rx="3" fill="#FDEBD2" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M27 32 h8" stroke="#8FBF7F" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M32 13 q5 1 6 5" stroke="#E8975A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="38" cy="20" r="1.8" fill="' + INK + '"/></svg>',
  speaker: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 24 h10 l13 -11 v38 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M44 22 q6 10 0 20 M51 15 q11 17 0 34" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
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
