/* ================= evidence 找证据 游戏数据 r17（结论封闭 20 / 证据场景 114 / 章配置 / 语音文案 / 时长模型）
   玩法（SPEC-BATCH32 §-r17-evidence 现行真值源，7-8 岁信息素养·证据推理三档）：
   结论封闭 20 = 旧 8（rainwet/snowplay/birthday/cooked/doghere/windbig/paintday/nightowl）
   + 新 12（washhands/ateorange/haircut/waterplant/mopped/brushed/fedfish/playedblocks/
     drankmilk/wrotehomework/fixedbike/playedsandbox）。
   每条结论：真证据恰 3（全局互异，真场景不得跨结论复用——防真值歧义）
   + 干扰恰 5（weak 2=有关但不能证明（常伴随但不足以证明）/ none 3=无关）；
   干扰场景跨结论复用，档位按（结论,场景）逐条判定——fridge=cooked 的 none、
   drankmilk 的 weak（同场景不同结论不同判断，三档判断按结论语境——设计意图非缺陷）。
   真证据语义自检：真证据须「直接可推断结论」；weak=常伴随但不足以证明（有云但地面干爽）；
   none=无关系（花坛开着花与下没下雨无关）。
   题型三族（§-r17 §2）：findexact（ch1 二分=干扰 3 全 none / ch2 三档=weak≥1+none≥1 混合；
   候选=恰 1 真+3 干扰，防双真值：同结论其他真证据不得入候选）
   / findall（ch3：候选=真值 3 全在场+干扰 1；pick/unpick 勾选零惩罚，判定步在 tapSubmit——
   契约 F17：漏/多=wrong 且已选对位保留 picked∩answers 清错选位，可续选，全选齐=right）
   / reverse（ch4：候选=真值 3+非真 1；answer=非真卡下标「哪张不能证明」，错选=普通 miss 流）。
   同关去重（§-r17 §3）：每关 8 题结论互异（20 池洗牌取 8）+卡集合签名（结论+opts img 升序）
   关内互异（verify 逐关断言）。SPEC v1 id「tree弯」拉丁化为 treebend（语义同）。 */
'use strict';

const INK = '#4A3B2E';                       // 统一暖棕描边（家族基调）

/* ---------- estMs 定版（b25 家族 T 全字符口径；四方同步之一：data 定义/verify 独立定义/
   build est_ms 字面断言/_selftest est_ms 运行时对账；main 不重复声明直接使用） ---------- */
const estMs = s => s.length * 345 + 600;     // SAPI ~345ms/字 + 600 落定余量（全字符含标点）

/* ---------- 屏显问句（TTS 文本无标点，屏显加中文问号；语音走 evi_q1/q2/q3 clip）
   r17 文本迁移：evi_q2「两张图」→「三张图」（既有键删 mp3 重合成，§-r17 §5）；evi_q3 新键 ---------- */
const Q1_TEXT = '哪张能证明它呀？';           // findexact 屏显问句
const Q2_TEXT = '找出能证明它的三张图';       // findall 屏显问句（r17 三真值）
const Q3_TEXT = '哪张不能证明它呀？';         // reverse 反问屏显问句（r17 新）

/* ---------- 错反馈语义句尾段（TTS 拼句，契约 N：keyless 恒链尾）
   「能证明吗」T46 clip 化=evi_again 1680；错链窗=evi_wrong 2112+150+1680+300=4242（契约 I 实长口径） ---------- */
const WRONG_AGAIN = '能证明吗';

/* ---------- 结论封闭 20（SPEC §-r17-evidence §1 逐字；干扰 type 入数据结构） ---------- */
const EV_BANK = {
  rainwet: { text: '刚下过雨',
    true: [ { img: 'puddle',    label: '地上有水洼' },
            { img: 'umbrella2', label: '路上好多人打伞' },
            { img: 'wetground', label: '地面湿湿' } ],
    dstr: [ { img: 'cloudy',    label: '天上有云',     type: 'weak' },
            { img: 'wetdog',    label: '小狗淋湿',     type: 'weak' },
            { img: 'flowerbed', label: '花坛开着花',   type: 'none' },
            { img: 'toycar',    label: '玩具车放地上', type: 'none' },
            { img: 'tvon',      label: '电视放着动画片', type: 'none' } ] },
  snowplay: { text: '下过雪',
    true: [ { img: 'snowman',   label: '雪人立在门口' },
            { img: 'icicle',    label: '屋檐挂冰柱' },
            { img: 'snowground', label: '地上盖着厚雪' } ],
    dstr: [ { img: 'coldboy',  label: '小朋友穿外套', type: 'weak' },
            { img: 'mittens',  label: '手套搭在暖气边', type: 'weak' },
            { img: 'toycar',   label: '玩具车放地上', type: 'none' },
            { img: 'birdfly',  label: '天上有小鸟飞', type: 'none' },
            { img: 'calendar', label: '墙上挂着日历', type: 'none' } ] },
  birthday: { text: '今天有人过生日',
    true: [ { img: 'cake',    label: '桌上有大蛋糕' },
            { img: 'gift',    label: '手里拿礼物盒' },
            { img: 'candles', label: '插蜡烛的蛋糕' } ],
    dstr: [ { img: 'balloon',    label: '房间里有气球',   type: 'weak' },
            { img: 'snackplate', label: '果盘摆着水果',   type: 'weak' },
            { img: 'tvon',       label: '电视放着动画片', type: 'none' },
            { img: 'storybook',  label: '桌上摆着书',     type: 'none' },
            { img: 'plant',      label: '窗台摆着绿植',   type: 'none' } ] },
  cooked: { text: '妈妈刚做过饭',
    true: [ { img: 'steam',  label: '锅还在冒热气' },
            { img: 'smell',  label: '香味飘满厨房' },
            { img: 'dishes', label: '碗还没洗' } ],
    dstr: [ { img: 'apron',    label: '围裙挂在钩上', type: 'weak' },
            { img: 'basket',   label: '菜篮装满蔬菜', type: 'weak' },
            { img: 'fridge',   label: '冰箱门开着',   type: 'none' },
            { img: 'calendar', label: '墙上挂着日历', type: 'none' },
            { img: 'flowerpot', label: '花盆摆着',    type: 'none' } ] },
  doghere: { text: '小狗来过',
    true: [ { img: 'paw',      label: '地上有狗爪印' },
            { img: 'doghair',  label: '沙发上有狗毛' },
            { img: 'bonebone', label: '地上有啃过的骨头' } ],
    dstr: [ { img: 'leash',    label: '门口挂着牵狗绳', type: 'weak' },
            { img: 'dogbowl',  label: '地上摆着狗粮碗', type: 'weak' },
            { img: 'ball',     label: '地上有球',     type: 'none' },
            { img: 'catsleep', label: '小猫在睡觉',   type: 'none' },
            { img: 'bench',    label: '公园长椅空着', type: 'none' } ] },
  windbig: { text: '刮过大风',
    true: [ { img: 'treebend', label: '小树吹弯了' },
            { img: 'leaves',   label: '落叶铺了一地' },
            { img: 'hatfly',   label: '帽子被吹跑挂在树上' } ],
    dstr: [ { img: 'cloudy2',     label: '天上有乌云',     type: 'weak' },
            { img: 'scarfman',    label: '有人围着围巾',   type: 'weak' },
            { img: 'flowerpot',   label: '花盆摆着',       type: 'none' },
            { img: 'trafficlight', label: '路口的红绿灯',  type: 'none' },
            { img: 'stone',       label: '草地上有大石头', type: 'none' } ] },
  paintday: { text: '刚画过画',
    true: [ { img: 'painthand', label: '手上有颜料' },
            { img: 'paintjar',  label: '颜料罐开着没盖' },
            { img: 'paper',     label: '桌上摆着画好的画' } ],
    dstr: [ { img: 'brush',     label: '洗干净的笔挂起来', type: 'weak' },
            { img: 'watercup',  label: '桌上放着水杯',     type: 'weak' },
            { img: 'storybook', label: '桌上摆着书',       type: 'none' },
            { img: 'plant',     label: '窗台摆着绿植',     type: 'none' },
            { img: 'catsleep',  label: '小猫在睡觉',       type: 'none' } ] },
  nightowl: { text: '昨晚很晚还有人醒着',
    true: [ { img: 'lamp',         label: '深夜台灯亮着' },
            { img: 'cup',          label: '桌上有喝了一半的热牛奶' },
            { img: 'nightnoodles', label: '深夜泡面还冒着热气' } ],
    dstr: [ { img: 'clock',   label: '钟指向很晚',     type: 'weak' },
            { img: 'curtain', label: '窗帘拉着',       type: 'weak' },
            { img: 'plant',   label: '窗台摆着绿植',   type: 'none' },
            { img: 'snail',   label: '叶子上停着蜗牛', type: 'none' },
            { img: 'bench',   label: '公园长椅空着',   type: 'none' } ] },
  washhands: { text: '刚洗过手',
    true: [ { img: 'wettowel',  label: '毛巾湿湿还在滴水' },
            { img: 'sinkdrops', label: '洗手池边一滩水' },
            { img: 'soapbub',   label: '洗手台上还留着肥皂泡' } ],
    dstr: [ { img: 'sleeves',    label: '袖子卷得高高的',     type: 'weak' },
            { img: 'towelneat',  label: '毛巾挂得整整齐齐',   type: 'weak' },
            { img: 'tvon',        label: '电视放着动画片',    type: 'none' },
            { img: 'flowerbed',   label: '花坛开着花',        type: 'none' },
            { img: 'trafficlight', label: '路口的红绿灯',     type: 'none' } ] },
  ateorange: { text: '刚吃过橘子',
    true: [ { img: 'peelings',  label: '桌上堆着橘子皮' },
            { img: 'halforange', label: '盘子里有剥了一半的橘子' },
            { img: 'trashpeel', label: '垃圾桶里露出橘子皮' } ],
    dstr: [ { img: 'orangeplate', label: '桌上摆着一盘橘子', type: 'weak' },
            { img: 'napkins',     label: '纸巾抽出来好几张', type: 'weak' },
            { img: 'ball',      label: '地上有球',     type: 'none' },
            { img: 'bench',     label: '公园长椅空着', type: 'none' },
            { img: 'calendar',  label: '墙上挂着日历', type: 'none' } ] },
  haircut: { text: '刚剪过头发',
    true: [ { img: 'hairfloor',  label: '地上落了一层碎头发' },
            { img: 'haircollar', label: '肩上还粘着小碎发' },
            { img: 'broomhair',  label: '扫帚边扫拢一堆碎发' } ],
    dstr: [ { img: 'scissors',    label: '剪刀摆在小台上',       type: 'weak' },
            { img: 'barberchair', label: '理发转椅摆在镜子前',   type: 'weak' },
            { img: 'tvon',  label: '电视放着动画片', type: 'none' },
            { img: 'plant', label: '窗台摆着绿植', type: 'none' },
            { img: 'stone', label: '草地上有大石头', type: 'none' } ] },
  waterplant: { text: '刚浇过花',
    true: [ { img: 'drops',     label: '叶片上挂着小水珠' },
            { img: 'traywater', label: '花盆托盘渗出了水' },
            { img: 'soilwet',   label: '盆土颜色深深发亮' } ],
    dstr: [ { img: 'wateringcan', label: '喷壶立在花盆边', type: 'weak' },
            { img: 'blooming',    label: '花开得正艳',     type: 'weak' },
            { img: 'toycar',        label: '玩具车放地上', type: 'none' },
            { img: 'storybook',     label: '桌上摆着书',   type: 'none' },
            { img: 'trafficlight',  label: '路口的红绿灯', type: 'none' } ] },
  mopped: { text: '刚拖过地',
    true: [ { img: 'wetshine',  label: '地面亮亮的反着光' },
            { img: 'mopdrip',   label: '拖把头湿湿靠在墙边' },
            { img: 'watertrail', label: '地上一道没干的水痕' } ],
    dstr: [ { img: 'dooropen',  label: '房门敞开通着风',     type: 'weak' },
            { img: 'slippers',  label: '拖鞋整整齐齐摆成排', type: 'weak' },
            { img: 'birdfly',   label: '天上有小鸟飞', type: 'none' },
            { img: 'flowerpot', label: '花盆摆着',     type: 'none' },
            { img: 'snail',     label: '叶子上停着蜗牛', type: 'none' } ] },
  brushed: { text: '刚刷过牙',
    true: [ { img: 'brushwet',  label: '牙刷毛湿湿的' },
            { img: 'pasteopen', label: '牙膏帽还没盖上' },
            { img: 'cupdrain',  label: '漱口杯倒扣着控水' } ],
    dstr: [ { img: 'toothlay',    label: '牙刷牙膏插在杯子里', type: 'weak' },
            { img: 'mirrorspots', label: '镜子上溅了小水点',   type: 'weak' },
            { img: 'ball',     label: '地上有球',     type: 'none' },
            { img: 'calendar', label: '墙上挂着日历', type: 'none' },
            { img: 'bench',    label: '公园长椅空着', type: 'none' } ] },
  fedfish: { text: '刚喂过鱼',
    true: [ { img: 'feedcan',   label: '鱼食罐开着没盖' },
            { img: 'feedfloat', label: '水面漂着几粒鱼食' },
            { img: 'feedspill', label: '鱼缸边撒了几粒鱼食' } ],
    dstr: [ { img: 'fishup',    label: '小鱼都游到水面上', type: 'weak' },
            { img: 'tanklight', label: '鱼缸的小灯亮着',   type: 'weak' },
            { img: 'flowerbed', label: '花坛开着花', type: 'none' },
            { img: 'storybook', label: '桌上摆着书', type: 'none' },
            { img: 'stone',     label: '草地上有大石头', type: 'none' } ] },
  playedblocks: { text: '刚搭过积木',
    true: [ { img: 'blocksout', label: '积木摊了一地' },
            { img: 'towerhalf', label: '桌上立着搭一半的积木塔' },
            { img: 'sortbox',   label: '积木箱的盖子开着' } ],
    dstr: [ { img: 'blockbox', label: '积木箱摆在墙边',   type: 'weak' },
            { img: 'playmat',  label: '游戏垫铺在地上',   type: 'weak' },
            { img: 'tvon',          label: '电视放着动画片', type: 'none' },
            { img: 'snail',         label: '叶子上停着蜗牛', type: 'none' },
            { img: 'trafficlight',  label: '路口的红绿灯',   type: 'none' } ] },
  drankmilk: { text: '刚喝过牛奶',
    true: [ { img: 'milkring',  label: '杯壁挂着一圈奶渍' },
            { img: 'milkdrop',  label: '桌上滴了两滴牛奶' },
            { img: 'milkhalf',  label: '插着吸管喝了一半的牛奶盒' } ],
    dstr: [ { img: 'fridge',  label: '冰箱门开着',   type: 'weak' },
            { img: 'milkcup', label: '桌上摆着小杯子', type: 'weak' },
            { img: 'birdfly',  label: '天上有小鸟飞', type: 'none' },
            { img: 'catsleep', label: '小猫在睡觉',   type: 'none' },
            { img: 'plant',    label: '窗台摆着绿植', type: 'none' } ] },
  wrotehomework: { text: '刚写过作业',
    true: [ { img: 'notebookopen', label: '作业本摊开没合上' },
            { img: 'eraserdust',   label: '桌角堆着橡皮屑' },
            { img: 'pencilrest',   label: '铅笔搁在作业本上' } ],
    dstr: [ { img: 'bagopen',    label: '书包拉链敞开着', type: 'weak' },
            { img: 'pencilcase', label: '文具盒开着盖',   type: 'weak' },
            { img: 'bench', label: '公园长椅空着',   type: 'none' },
            { img: 'stone', label: '草地上有大石头', type: 'none' },
            { img: 'snail', label: '叶子上停着蜗牛', type: 'none' } ] },
  fixedbike: { text: '刚修过自行车',
    true: [ { img: 'greasehand', label: '指缝里黑黑的油泥' },
            { img: 'toolslay',   label: '螺丝扳手摊在垫布上' },
            { img: 'chainoff',   label: '链条拆下搭在车架上' } ],
    dstr: [ { img: 'toolbox', label: '工具箱开着盖',     type: 'weak' },
            { img: 'pump',    label: '打气筒立在旁边',   type: 'weak' },
            { img: 'birdfly',   label: '天上有小鸟飞', type: 'none' },
            { img: 'flowerbed', label: '花坛开着花',   type: 'none' },
            { img: 'calendar',  label: '墙上挂着日历', type: 'none' } ] },
  playedsandbox: { text: '刚玩过沙子',
    true: [ { img: 'sandcastle', label: '沙坑里立着新堆的沙堡' },
            { img: 'bucket',     label: '沙坑里插着小桶和铲子' },
            { img: 'sandshoes',  label: '鞋边上撒着沙粒' } ],
    dstr: [ { img: 'toybox',    label: '沙滩玩具箱开着盖', type: 'weak' },
            { img: 'dustypants', label: '裤脚上蹭了土',     type: 'weak' },
            { img: 'tvon',          label: '电视放着动画片', type: 'none' },
            { img: 'trafficlight',  label: '路口的红绿灯',   type: 'none' },
            { img: 'plant',         label: '窗台摆着绿植', type: 'none' } ] }
};
const CONCLS20 = ['rainwet', 'snowplay', 'birthday', 'cooked',
                  'doghere', 'windbig', 'paintday', 'nightowl',
                  'washhands', 'ateorange', 'haircut', 'waterplant',
                  'mopped', 'brushed', 'fedfish', 'playedblocks',
                  'drankmilk', 'wrotehomework', 'fixedbike', 'playedsandbox'];
const conclText = id => EV_BANK[id].text;

/* ---------- 章配置（章号 1 基；r17：每关 8 题/每章 8 关，生成关 flat≥32 每关随机章参数
   dch=seeded ri(1,4)——SPEC §-r17 §3 显式：seeded 随机写死，同 flat 恒同值）
   hint=章末预告**下一章**文案（hint[i] ↔ CHAPTERS[i+1]，家族 F 禁右移）；
   GEN_HINTS[k] ↔ dch=k+1（verify 带 C7 关键词对账）。 ---------- */
const CHAPTERS = {
  1: { name: '小侦探上任', hint: '有的证据在骗人，要看仔细' },  // 预告 ch2 三档判别
  2: { name: '真假证据',   hint: '有的题要找齐三张证据' },      // 预告 ch3 findall 三真值
  3: { name: '三证挑战',   hint: '反过来想想哪张是假的' },      // 预告 ch4 反问+混合
  4: { name: '大挑战',     hint: '新一轮找证据' }               // 预告生成关
};
const GEN_HINTS = ['找一张真证据',   // dch1 findexact 二分
                   '再挑一挑真假',    // dch2 findexact（weak≥1+none≥1 三档混合）
                   '找齐三张证据',    // dch3 findall 三真值多选
                   '找证据大集合'];   // dch4 三族混出
const CH_LEN = 8;          // r17：8 题 = 1 关（每题一条结论互异——同关去重）；每章 8 关
const STATIC_LEVELS = 32;  // r17：静态 32 关 = 4 章（旧基 5/20 → 迁移 IIFE 见 game-main）

/* ---------- r17 时长模型（§-r17 §4；estMs 四方同步=data 本处/verify 独立定义/build est_ms
   字面断言/_selftest est_ms——认知步主体非演出窗）：
   每题 dur = max(voiceWin, DECIDE_MS[kind]) + CONFIRM_MS；
   voiceWin(q) = DUR_CONCL[q.concl] + QGAP + DUR_Q[kind] + 300（queue 段间 150/落定 300——实测 clip 长）；
   DECIDE_MS（7-8 岁单题认知推算）：findexact 8000（读结论+4 卡逐卡证明性判别约 1.5s/卡+确认，
   ch2 三档须额外区分「有关但不能证明」语义）/ findall 11500（4 卡逐一判别+集合管理「还差哪张」
   +勾选提交，三真值全找全，漏选重选计入）/ reverse 9000（抑制反转：靶心从找证据翻转为找非证据
   +逐卡检查约 2s/卡）；语音窗恒 ≤DECIDE（max findexact 5514 / findall 6402 / reverse 5658）。
   CONFIRM_MS=2900（判对演出窗 1600+1300 实码，罩确认链 evi_right 2472+300=2772）；
   OPEN_MS=900（开题渲染落定）；LEVEL_MIN_MS=40000（家族门禁）。
   modeled(flat)=OPEN_MS+Σ每题 dur；全 40 关 modeled 最低值=88100（ch1/ch2 全 findexact 关
   flat0-15 同值：900+8*(8000+2900)）——verify+_selftest 双钉精确断言（禁约数）。 ---------- */
const QGAP = 150;                              // queue 段间停顿（core voice.queue 实码）
const DUR_CONCL = {   // 结论句 clip 实长（r17 实测 2026-09-17，§-r17 §5 表）
  rainwet: 1776, snowplay: 1656, birthday: 2256, cooked: 2040,
  doghere: 1824, windbig: 1728, paintday: 1704, nightowl: 2832,
  washhands: 1752, ateorange: 1920, haircut: 1920, waterplant: 1728,
  mopped: 1752, brushed: 1752, fedfish: 1752, playedblocks: 1896,
  drankmilk: 1968, wrotehomework: 1968, fixedbike: 2160, playedsandbox: 1896
};
const DUR_Q = { findexact: 2232, findall: 3120, reverse: 2376 };   // 题面问句 clip 实长
const OPEN_MS = 900;
const DECIDE_MS = { findexact: 8000, findall: 11500, reverse: 9000 };   // r17 三题型
const CONFIRM_MS = 1600 + 1300;               // 判对演出窗（main 实码 wait 字面）
const LEVEL_MIN_MS = 40000;                   // 单关 modeled 下限硬断言（r14/r15 家族门禁）
const voiceWinMs = q => DUR_CONCL[q.concl] + QGAP + DUR_Q[q.kind] + 300;
const quizDurMs = q => Math.max(voiceWinMs(q), DECIDE_MS[q.kind]) + CONFIRM_MS;
const levelDurMs = L => OPEN_MS + L.quizzes.reduce((s, q) => s + quizDurMs(q), 0);
const modeled = flat => levelDurMs(genLevel(flat | 0));

/* ---------- 语音文案（与 voice/clips/manifest.json 严格一致，禁自造；前缀=evi_ 已核
   manifest 无占用）。clip 实长（r17 实测）：tut_watch 2928 / tut_turn 1920 / hint 2016
   / right 2472（判对后窗 ≥2772）/ wrong 2112 / q1 2232 / q2 3120（三张图文本迁移重合成）
   / q3 2376（r17 新）；结论句 evi_c_*：nightowl 2832 / fixedbike 2160 / drankmilk 1968
   / wrotehomework 1968 / ateorange 1920 / haircut 1920 / playedblocks 1896 / playedsandbox 1896
   / birthday 2256 / cooked 2040 / doghere 1824 / rainwet 1776 / washhands 1752 / mopped 1752
   / brushed 1752 / fedfish 1752 / windbig 1728 / waterplant 1728 / paintday 1704
   / snowplay 1656（max 2832——题面链=结论句+150+q1 2232+300 ≥5514；findall 题面链
   =结论句+150+q2 3120+300 ≥6402；reverse 题面链=结论句+150+q3 2376+300 ≥5658） ---------- */
const VOICE = {
  watch:  { key: 'evi_tut_watch', text: '看！找一找证据' },
  turn:   { key: 'evi_tut_turn',  text: '你来当侦探' },
  hint:   { key: 'evi_hint',      text: '再看看想一想' },
  right:  { key: 'evi_right',     text: '找对啦，真聪明' },
  wrong:  { key: 'evi_wrong',     text: '再看看这张图' },
  q1:     { key: 'evi_q1',        text: '哪张能证明它呀' },
  q2:     { key: 'evi_q2',        text: '找出能证明它的三张图' },
  q3:     { key: 'evi_q3',        text: '哪张不能证明它呀' }
};
const conclClip = id => 'evi_c_' + id;      // 结论句 clip 键（晓晓读，r17 20 条）

/* ================= 证据场景 SVG 库（viewBox 0 0 120 120；家族暖卡通风）
   114 幅互异自解释（§-r17 §1：图须自解释证据内容——真证据画出「直接可推断」，
   weak 干扰画出「有关但不能证明」语义如 cloudy=天上有云但地面干爽，none=与结论无关
   的中性场景；干扰场景跨结论复用、真场景不复用）。根组 g[data-img]=证据 id——
   契约 M 帧内容断言锚（渲染即引擎对账依据）。 ================= */
const SKY = '#DCEAF8', GND = '#E5D5BC', WET = '#C9B8A0', WATER = '#7FB3E0';

const EV_SVG = {
  /* ===== rainwet 刚下过雨 ===== */
  /* 真：地面+两片水洼（水面高光+波纹——洼=雨后积水直证） */
  puddle:
    '<path d="M8 92 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="42" cy="78" rx="26" ry="12" fill="' + WATER + '" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M30 76 q10 -5 22 -1" stroke="#FFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".85"/>' +
    '<ellipse cx="88" cy="86" rx="15" ry="7.5" fill="' + WATER + '" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M82 85 q7 -3 13 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/>' +
    '<circle cx="20" cy="66" r="2.6" fill="' + WATER + '"/><circle cx="64" cy="60" r="2" fill="' + WATER + '"/>',
  /* 真：三个小人各撑彩色伞（伞面半圆+伞骨+人影——雨中出行直证） */
  umbrella2:
    '<path d="M18 46 a14 14 0 0 1 28 0 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M48 52 a13 13 0 0 1 26 0 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M76 44 a14 14 0 0 1 28 0 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M32 46 v8 M61 52 v7 M90 44 v9" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<circle cx="32" cy="60" r="7.5" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="61" cy="64" r="7.5" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="90" cy="58" r="7.5" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M28 68 v16 a4 4 0 0 0 8 0 v-16 M57 72 v16 a4 4 0 0 0 8 0 v-16 M86 66 v16 a4 4 0 0 0 8 0 v-16" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M14 96 q10 5 24 0 M50 98 q12 5 26 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/>',
  /* 真：透视湿地色块+光泽斑（深湿土色+高光——地面湿直证） */
  wetground:
    '<path d="M14 34 h92 l6 56 q-52 14 -104 0 Z" fill="' + WET + '" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="44" cy="60" rx="20" ry="9" fill="#FFF" opacity=".38"/>' +
    '<ellipse cx="78" cy="76" rx="14" ry="6" fill="#FFF" opacity=".3"/>' +
    '<path d="M30 52 q16 4 34 0 M58 84 q14 3 28 -1" stroke="#FFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".55"/>' +
    '<path d="M40 44 l6 -6 M70 68 l5 -5" stroke="' + WATER + '" stroke-width="2.6" stroke-linecap="round"/>',
  /* 弱相关：天上有云但地面干爽（云≠下雨——「常伴随但不够」标准画法） */
  cloudy:
    '<rect x="0" y="0" width="120" height="66" fill="' + SKY + '"/>' +
    '<path d="M22 34 a12 12 0 0 1 12 -12 a14 14 0 0 1 26 -2 a11 11 0 0 1 10 14 Z" fill="#FFF" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M64 52 a9 9 0 0 1 9 -9 a10 10 0 0 1 19 -1 a8 8 0 0 1 7 10 Z" fill="#FFF" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M6 78 h108" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="6" y="78" width="108" height="20" fill="' + GND + '"/>' +
    '<path d="M16 88 h20 M80 90 h24" stroke="#FFF" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>',
  /* 弱相关：小狗身上挂水滴（可能自己洗澡——不足以证明下雨） */
  wetdog:
    '<ellipse cx="60" cy="86" rx="30" ry="19" fill="#C89A6B" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<path d="M28 62 q-8 18 2 26 q9 5 11 -8 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="58" cy="54" r="26" fill="#D2A87A" stroke="' + INK + '" stroke-width="3.5"/>' +
    '<ellipse cx="58" cy="66" rx="13" ry="9.5" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="58" cy="60" rx="5.6" ry="4.2" fill="' + INK + '"/>' +
    '<circle cx="46" cy="48" r="4.2" fill="' + INK + '"/><circle cx="70" cy="48" r="4.2" fill="' + INK + '"/>' +
    '<path d="M34 40 l-7 12 M82 40 l7 12" stroke="' + WATER + '" stroke-width="3.2" stroke-linecap="round"/>' +
    '<path d="M40 78 q0 8 -2 12 M56 92 q0 7 -2 11 M76 76 q1 9 -1 13" stroke="' + WATER + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="30" cy="74" r="2.6" fill="' + WATER + '"/><circle cx="88" cy="88" r="2.6" fill="' + WATER + '"/>',
  /* 无关：花坛开着花（花与下雨没关系） */
  flowerbed:
    '<path d="M18 62 h84 l-8 34 q-34 10 -68 0 Z" fill="#D8A87A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M14 54 h92 l-4 10 h-84 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 54 v-16 M60 54 v-20 M78 54 v-16" stroke="#5B8C4A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="42" cy="34" r="8" fill="#E88FB0" stroke="' + INK + '" stroke-width="2.4"/><circle cx="42" cy="34" r="3" fill="#F5C445"/>' +
    '<circle cx="60" cy="30" r="8" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4"/><circle cx="60" cy="30" r="3" fill="#E8975A"/>' +
    '<circle cx="78" cy="34" r="8" fill="#E88FB0" stroke="' + INK + '" stroke-width="2.4"/><circle cx="78" cy="34" r="3" fill="#F5C445"/>' +
    '<path d="M30 46 q4 3 8 0 M74 46 q4 3 8 0" stroke="#5B8C4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',

  /* ===== snowplay 下过雪 ===== */
  /* 真：门口+雪人（门框雪人胡萝卜鼻——雪后直证） */
  snowman:
    '<path d="M12 100 h96" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M10 40 h36 v60 h-36 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="20" y="52" width="16" height="30" rx="3" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="28" cy="67" r="2.2" fill="#F5C445"/>' +
    '<circle cx="76" cy="76" r="20" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="76" cy="46" r="14" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="71" cy="43" r="2.2" fill="' + INK + '"/><circle cx="81" cy="43" r="2.2" fill="' + INK + '"/>' +
    '<path d="M76 48 l10 3 l-10 3 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M62 72 l-10 -8 M90 72 l10 -8" stroke="#8A7B6C" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M68 62 h16 M70 70 h12" stroke="#E8483C" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M64 32 h24 l-4 -8 h-16 Z" fill="#5B7BAE" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M16 100 q30 6 88 0" stroke="#FFF" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>',
  /* 真：屋檐+下垂冰柱（锥形冰挂——雪后严寒直证） */
  icicle:
    '<path d="M8 38 L60 12 L112 38 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<rect x="8" y="38" width="104" height="8" fill="#D2A87A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M18 46 l7 22 l7 -22 M38 46 l8 30 l8 -30 M62 46 l7 22 l7 -22 M84 46 l8 26 l8 -26" fill="#CFE4F6" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M24 58 l2 4 M44 64 l2 5 M90 58 l2 4" stroke="#FFF" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M14 30 q46 -18 92 0" stroke="#FFF" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M8 88 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="94" rx="30" ry="8" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.6"/>',
  /* 弱相关：小朋友穿厚外套（冷天常伴雪但不证明下雪） */
  coldboy:
    '<circle cx="60" cy="34" r="15" fill="#F6EAD4" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="54" cy="32" r="2.2" fill="' + INK + '"/><circle cx="66" cy="32" r="2.2" fill="' + INK + '"/>' +
    '<path d="M55 40 q5 4 10 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M42 52 h36 q6 0 6 8 v28 h-14 v-16 h-20 v16 h-14 v-28 q0 -8 6 -8 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 52 v36" stroke="' + INK + '" stroke-width="2.4" stroke-dasharray="4 4"/>' +
    '<path d="M40 58 h-8 M80 58 h8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M44 92 l-4 10 M76 92 l4 10" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="36" y="44" width="12" height="7" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="72" y="44" width="12" height="7" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.4"/>',
  /* 无关：玩具车放地上 */
  toycar:
    '<path d="M8 88 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="16" y="52" width="88" height="28" rx="8" fill="#7FA8D4" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M40 52 v-12 h28 l12 12" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<rect x="46" y="46" width="16" height="10" fill="#FFF" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="36" cy="82" r="9" fill="' + INK + '"/><circle cx="36" cy="82" r="4" fill="#FFF9EE"/>' +
    '<circle cx="84" cy="82" r="9" fill="' + INK + '"/><circle cx="84" cy="82" r="4" fill="#FFF9EE"/>' +
    '<circle cx="22" cy="64" r="3" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>',
  /* 无关：天上飞鸟 */
  birdfly:
    '<rect x="0" y="0" width="120" height="86" fill="' + SKY + '"/>' +
    '<circle cx="98" cy="22" r="9" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M28 44 q8 -9 16 0 q8 -9 16 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M70 68 q6 -7 12 0 q6 -7 12 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="52" cy="52" rx="9" ry="6.5" fill="#8FB8E0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M56 46 l6 -8 l2 8 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M8 86 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M16 96 q12 4 26 0 M62 98 q12 4 26 0" stroke="#9BC178" stroke-width="3" fill="none" stroke-linecap="round"/>',

  /* ===== birthday 今天有人过生日 ===== */
  /* 真：桌面+双层大蛋糕+樱桃 */
  cake:
    '<path d="M10 94 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M24 46 h72 v40 h-72 Z" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M34 62 h52 v24 h-52 Z" fill="#F8D8E4" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M24 52 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0 q6 8 12 0" stroke="#FFF" stroke-width="5" fill="none"/>' +
    '<path d="M34 70 h52" stroke="#E8975A" stroke-width="2.6" stroke-dasharray="5 5"/>' +
    '<circle cx="44" cy="38" r="6" fill="#E8483C" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="76" cy="38" r="6" fill="#E8483C" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="60" cy="30" r="7" fill="#E8483C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M60 23 q4 -6 8 -4" stroke="#5B8C4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  /* 真：小手捧礼物盒（缎带十字+蝴蝶结） */
  gift:
    '<circle cx="38" cy="30" r="10" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="35" cy="28" r="1.8" fill="' + INK + '"/><circle cx="41" cy="28" r="1.8" fill="' + INK + '"/>' +
    '<path d="M34 34 q4 3 8 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<rect x="30" y="48" width="56" height="42" rx="5" fill="#E8483C" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="52" y="48" width="12" height="42" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M58 48 l-10 -10 q10 -4 10 10 q0 -14 10 -10 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M22 66 q-6 14 4 22 M94 66 q6 14 -4 22" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="26" cy="92" r="5.5" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="94" cy="92" r="5.5" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.4"/>',
  /* 真：蛋糕+三支点燃的蜡烛（火苗亮——生日直证） */
  candles:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M26 64 h68 v30 h-68 Z" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 70 q8 7 17 0 q8 7 17 0 q8 7 17 0 q8 7 17 0" stroke="#F8D8E4" stroke-width="6" fill="none"/>' +
    '<rect x="38" y="42" width="7" height="22" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="57" y="38" width="7" height="26" rx="3" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="76" y="42" width="7" height="22" rx="3" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M41.5 42 q-5 -8 0 -13 q5 5 0 13 Z" fill="#F5C445" stroke="#E8975A" stroke-width="1.8"/>' +
    '<path d="M60.5 38 q-5 -8 0 -13 q5 5 0 13 Z" fill="#F5C445" stroke="#E8975A" stroke-width="1.8"/>' +
    '<path d="M79.5 42 q-5 -8 0 -13 q5 5 0 13 Z" fill="#F5C445" stroke="#E8975A" stroke-width="1.8"/>',
  /* 弱相关：房间里有气球（聚会常见但不过生日也有） */
  balloon:
    '<rect x="0" y="0" width="120" height="76" fill="#FBF0DC"/>' +
    '<path d="M0 76 h120" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="34" cy="34" rx="15" ry="18" fill="#E8483C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M34 52 l-3 5 h6 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M34 57 q-5 12 2 20" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="66" cy="26" rx="13" ry="16" fill="#F5C445" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M66 42 l-3 5 h6 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M66 47 q6 12 -2 21" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="92" cy="42" rx="13" ry="16" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M92 58 l-3 5 h6 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M92 63 q-4 10 2 17" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="29" cy="29" rx="4" ry="6" fill="#FFF" opacity=".55"/>',
  /* 弱相关：果盘摆着水果（待客常有但水果≠生日） */
  snackplate:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="74" rx="42" ry="16" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M18 74 a42 16 0 0 0 84 0" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="42" cy="60" r="11" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M42 49 q1 -6 6 -7" stroke="#5B8C4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="42" cy="53" rx="5" ry="2.6" fill="#5B8C4A"/>' +
    '<path d="M62 62 q10 -10 20 -2 q-4 12 -20 2 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M63 61 q8 -6 18 -1" stroke="#E8A23C" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<circle cx="82" cy="58" r="10" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M76 54 q6 -5 12 0" stroke="#E8975A" stroke-width="2" fill="none" stroke-linecap="round"/>',
  /* 无关：电视放着动画片 */
  tvon:
    '<rect x="16" y="28" width="88" height="58" rx="7" fill="' + INK + '"/>' +
    '<rect x="23" y="35" width="74" height="44" rx="4" fill="#DCEAF8"/>' +
    '<circle cx="44" cy="49" r="7" fill="#F5C445" stroke="#E8975A" stroke-width="2"/>' +
    '<path d="M27 76 l16 -18 l10 10 l10 -14 l20 22 Z" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<circle cx="78" cy="44" r="3" fill="#FFF"/>' +
    '<path d="M40 86 v8 h40 v-8" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linejoin="round"/>' +
    '<path d="M54 94 h12" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M60 24 q-2 -10 8 -14 M60 24 q4 -9 14 -8" stroke="#E8975A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',

  /* ===== cooked 妈妈刚做过饭 ===== */
  /* 真：锅盖微开+热气腾腾（刚离火直证） */
  steam:
    '<path d="M10 92 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M28 62 h64 a8 8 0 0 1 8 8 v10 a8 8 0 0 1 -8 8 h-64 a8 8 0 0 1 -8 -8 v-10 a8 8 0 0 1 8 -8 Z" fill="#B8BFC9" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M20 70 h-9 M100 70 h9" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M30 58 h56 l-6 -12 q-22 -8 -44 0 Z" fill="#9AA3B0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="58" cy="44" r="4.5" fill="' + INK + '"/>' +
    '<path d="M46 38 q-8 -12 2 -20 q-6 10 4 16" stroke="#B8BFC9" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M62 34 q-7 -13 3 -22 q-7 11 3 18" stroke="#B8BFC9" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M78 38 q-8 -11 1 -18 q-5 9 3 15" stroke="#B8BFC9" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
  /* 真：厨房灶台+香气波浪线（香味可视化） */
  smell:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M0 86 h120" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="14" y="86" width="34" height="26" fill="#D2A87A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="31" cy="92" r="4" fill="' + INK + '"/>' +
    '<path d="M54 86 v26 M8 112 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M50 72 q8 -8 0 -16 q-8 -8 0 -16 q8 -8 0 -16" stroke="#E8A23C" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M72 74 q8 -8 0 -16 q-8 -8 0 -16 q8 -8 0 -16" stroke="#E8A23C" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M94 74 q8 -8 0 -16 q-8 -8 0 -16" stroke="#E8A23C" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".6"/>' +
    '<circle cx="50" cy="20" r="2.6" fill="#F5C445"/><circle cx="72" cy="22" r="2.6" fill="#F5C445"/><circle cx="94" cy="38" r="2.6" fill="#F5C445"/>',
  /* 真：水槽+没洗的碗摞+泡泡 */
  dishes:
    '<path d="M0 66 h120 v6 h-120 Z" fill="#D8C9B4" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="30" y="72" width="60" height="18" rx="6" fill="#B8BFC9" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M36 72 v18 M84 72 v18" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M44 66 a10 5 0 0 1 20 0 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M40 58 a12 6 0 0 1 24 0 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M36 50 a14 7 0 0 1 28 0 Z" fill="#A8C8E8" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<circle cx="78" cy="46" r="6" fill="none" stroke="#FFF" stroke-width="2.6"/><circle cx="88" cy="36" r="4" fill="none" stroke="#FFF" stroke-width="2.2"/><circle cx="74" cy="28" r="5" fill="none" stroke="#FFF" stroke-width="2.2"/>' +
    '<path d="M0 90 h120" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="82" cy="42" r="1.8" fill="#FFF"/><circle cx="76" cy="26" r="1.5" fill="#FFF"/>',
  /* 无关：冰箱门开着 */
  fridge:
    '<rect x="30" y="14" width="52" height="88" rx="6" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<rect x="30" y="14" width="52" height="30" rx="6" fill="#DCEAF8" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="34" y="18" width="44" height="8" fill="#FFF" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<rect x="34" y="30" width="44" height="10" fill="#FFF" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="60" cy="34" r="3" fill="#E8483C"/><circle cx="48" cy="22" r="2.6" fill="#F5C445"/>' +
    '<rect x="82" y="24" width="10" height="4" rx="2" fill="' + INK + '"/>' +
    '<path d="M76 50 h14" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M60 102 v10 M40 112 h40" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  /* 弱相关：围裙挂在钩上（做饭常穿但挂着≠刚做饭） */
  apron:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M52 26 q8 -10 16 0 q-8 6 -16 0 Z" fill="' + INK + '"/>' +
    '<circle cx="60" cy="22" r="5" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M44 34 q16 -8 32 0" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M42 40 q0 -4 6 -5 l24 0 q6 1 6 5 l6 44 q0 6 -6 6 h-30 q-6 0 -6 -6 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M46 35 q14 8 28 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<rect x="48" y="62" width="24" height="18" rx="4" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M42 92 q18 8 36 0" stroke="' + INK + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  /* 无关：墙上挂着日历 */
  calendar:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<rect x="24" y="26" width="72" height="76" rx="5" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<path d="M24 26 h72 v18 h-72 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<rect x="36" y="16" width="7" height="16" rx="3" fill="' + INK + '"/>' +
    '<rect x="77" y="16" width="7" height="16" rx="3" fill="' + INK + '"/>' +
    '<circle cx="40" cy="60" r="2.4" fill="' + INK + '"/><circle cx="52" cy="60" r="2.4" fill="' + INK + '"/><circle cx="64" cy="60" r="2.4" fill="' + INK + '"/><circle cx="76" cy="60" r="2.4" fill="' + INK + '"/><circle cx="88" cy="60" r="2.4" fill="' + INK + '"/>' +
    '<circle cx="40" cy="72" r="2.4" fill="' + INK + '"/><circle cx="52" cy="72" r="2.4" fill="' + INK + '"/><circle cx="64" cy="72" r="2.4" fill="' + INK + '"/><circle cx="76" cy="72" r="2.4" fill="' + INK + '"/>' +
    '<circle cx="40" cy="84" r="2.4" fill="' + INK + '"/><circle cx="52" cy="84" r="2.4" fill="' + INK + '"/><circle cx="64" cy="84" r="2.4" fill="' + INK + '"/>' +
    '<rect x="68" y="78" width="22" height="16" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>'
};
Object.assign(EV_SVG, {
  /* ===== doghere 小狗来过 ===== */
  /* 真：地面+一大两小狗爪印（肉垫+四趾——爪印直证） */
  paw:
    '<path d="M8 92 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="46" cy="66" rx="16" ry="12" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="29" cy="50" rx="5.5" ry="7" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<ellipse cx="42" cy="44" rx="5.5" ry="7" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<ellipse cx="56" cy="46" rx="5.5" ry="7" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<ellipse cx="66" cy="56" rx="5" ry="6.5" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<ellipse cx="90" cy="84" rx="8" ry="6" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.2" opacity=".85"/>' +
    '<ellipse cx="82" cy="76" rx="3" ry="3.8" fill="#C89A6B" stroke="' + INK + '" stroke-width="2" opacity=".85"/>' +
    '<ellipse cx="90" cy="73" rx="3" ry="3.8" fill="#C89A6B" stroke="' + INK + '" stroke-width="2" opacity=".85"/>' +
    '<ellipse cx="98" cy="76" rx="3" ry="3.8" fill="#C89A6B" stroke="' + INK + '" stroke-width="2" opacity=".85"/>',
  /* 真：沙发+几撮漂浮狗毛（波浪短线） */
  doghair:
    '<path d="M14 88 h92 v-34 q0 -10 -10 -10 h-72 q-10 0 -10 10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3.2" stroke-linejoin="round"/>' +
    '<rect x="8" y="52" width="14" height="40" rx="6" fill="#D2A87A" stroke="' + INK + '" stroke-width="3"/>' +
    '<rect x="98" y="52" width="14" height="40" rx="6" fill="#D2A87A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M14 92 h92" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M34 48 q4 -8 10 -4 M56 44 q5 -7 11 -3 M80 46 q3 -7 9 -5" stroke="#C89A6B" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M44 58 q5 -8 11 -3 M68 60 q4 -8 10 -4 M88 54 q4 -7 9 -4" stroke="#D2A87A" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 36 q3 3 0 6 M58 30 q3 3 0 6 M84 34 q3 3 0 6" stroke="#C89A6B" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  /* 真：啃过的骨头（一端双球完好+一端咬缺） */
  bonebone:
    '<path d="M8 88 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="34" cy="66" r="9" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="34" cy="82" r="9" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="38" y="66" width="44" height="16" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M82 66 q10 -8 14 2 q8 -6 8 4 q8 -2 4 6 q-12 8 -26 2 Z" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M86 74 q8 3 16 0 M90 80 q6 2 12 0" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M50 72 h18 M54 78 h12" stroke="#E8DCC8" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M46 62 l-2 -10 M66 60 l3 -9" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>',
  /* 无关：地上有球 */
  ball:
    '<path d="M8 92 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="60" cy="62" r="30" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M60 32 q-16 30 0 60" fill="#E8483C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M60 32 q16 30 0 60" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M31 58 q29 -14 58 0" fill="#F5C445" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="48" cy="46" rx="5" ry="8" fill="#FFF" opacity=".7" transform="rotate(-20 48 46)"/>',
  /* 弱相关：门口挂着牵狗绳（养狗常备但挂着≠狗来过） */
  leash:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M22 12 v96 M98 12 v96" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M22 12 h76" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="52" y="36" width="26" height="72" rx="3" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="65" cy="52" r="2.2" fill="#F5C445"/>' +
    '<circle cx="40" cy="30" r="4.5" fill="none" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M36 36 q-6 10 2 16 q8 6 14 -2 q-8 2 -12 -4 q-3 -5 -4 -10 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<ellipse cx="36" cy="72" rx="9" ry="7" fill="none" stroke="#E8483C" stroke-width="4"/>' +
    '<circle cx="65" cy="30" r="3.4" fill="' + INK + '"/>',
  /* 无关：小猫蜷着睡觉（闭眼+呼噜泡泡——家里猫≠狗来过） */
  catsleep:
    '<ellipse cx="60" cy="72" rx="32" ry="24" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3.2"/>' +
    '<circle cx="38" cy="58" r="17" fill="#E8E3DC" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M27 46 l-3 -12 l12 6 Z" fill="#E8E3DC" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M49 44 l4 -12 l-13 5 Z" fill="#E8E3DC" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M29 58 q4 3 8 0 M41 58 q4 3 8 0" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M32 64 q4 3 8 0" stroke="#E8975A" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M90 66 q18 -8 18 10 q0 14 -14 12 q-8 -2 -4 -12 q2 -7 0 -10 Z" fill="#D8D2CB" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="82" cy="38" r="4" fill="none" stroke="' + INK + '" stroke-width="2.2" opacity=".6"/>' +
    '<circle cx="90" cy="28" r="5.5" fill="none" stroke="' + INK + '" stroke-width="2.2" opacity=".6"/>' +
    '<path d="M26 44 q-2 -6 4 -9" stroke="#8A7B6C" stroke-width="2.2" fill="none" stroke-linecap="round"/>',

  /* ===== windbig 刮过大风 ===== */
  /* 真：树干弯弧+树冠偏侧+飞叶（吹弯直证） */
  treebend:
    '<path d="M8 94 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M44 94 Q40 60 68 38" stroke="#8A5C3C" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    '<path d="M44 94 q-4 -14 -2 -24" stroke="#6E4A30" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="76" cy="32" r="18" fill="#9BC178" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="60" cy="40" r="12" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="90" cy="42" r="11" fill="#9BC178" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M104 40 l14 -8 M106 52 l16 0 M100 28 l10 -12" stroke="#8A7B6C" stroke-width="2.6" stroke-linecap="round"/>' +
    '<ellipse cx="100" cy="18" rx="5" ry="3" fill="#E8975A" transform="rotate(-30 100 18)"/>' +
    '<ellipse cx="112" cy="56" rx="5" ry="3" fill="#F5A24B" transform="rotate(-20 112 56)"/>' +
    '<path d="M22 52 l14 -4 M26 66 l16 -2" stroke="#8A7B6C" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>',
  /* 真：满地落叶（多色叶+叶脉） */
  leaves:
    '<path d="M8 88 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="82" rx="12" ry="7" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-14 32 82)"/>' +
    '<path d="M22 84 h20" stroke="#C9784A" stroke-width="1.8" transform="rotate(-14 32 82)"/>' +
    '<ellipse cx="62" cy="90" rx="12" ry="7" fill="#E8483C" stroke="' + INK + '" stroke-width="2.4" transform="rotate(10 62 90)"/>' +
    '<path d="M52 92 h20" stroke="#C04038" stroke-width="1.8" transform="rotate(10 62 90)"/>' +
    '<ellipse cx="92" cy="80" rx="12" ry="7" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-8 92 80)"/>' +
    '<path d="M82 82 h20" stroke="#D8A23C" stroke-width="1.8" transform="rotate(-8 92 80)"/>' +
    '<ellipse cx="46" cy="64" rx="11" ry="6.5" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-28 46 64)"/>' +
    '<ellipse cx="78" cy="58" rx="11" ry="6.5" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" transform="rotate(18 78 58)"/>' +
    '<ellipse cx="60" cy="44" rx="10" ry="6" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4" transform="rotate(40 60 44)"/>' +
    '<path d="M20 56 q4 3 8 0 M100 62 q4 3 8 0" stroke="#8A7B6C" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/>',
  /* 真：帽子挂在树枝上（被吹跑的帽子） */
  hatfly:
    '<path d="M8 96 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M34 96 V44 q0 -8 8 -8 q8 0 8 8 V96" fill="#B98A5C" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M42 46 q28 -18 46 2" stroke="#8A5C3C" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<path d="M76 44 q10 -16 24 -8 l-6 14 q-10 4 -18 -6 Z" fill="#5B7BAE" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="82" cy="42" r="5" fill="#5B7BAE" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M96 50 q8 10 2 18" stroke="#E8483C" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M98 68 l4 6 l-8 0 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M100 34 l10 -8 M104 46 l12 -2" stroke="#8A7B6C" stroke-width="2.4" stroke-linecap="round"/>',
  /* 弱相关：天上有乌云（深灰云≠刮过风） */
  cloudy2:
    '<rect x="0" y="0" width="120" height="70" fill="' + SKY + '"/>' +
    '<path d="M20 44 a13 13 0 0 1 13 -13 a15 15 0 0 1 28 -2 a12 12 0 0 1 11 15 Z" fill="#8A93A3" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M62 58 a10 10 0 0 1 10 -10 a11 11 0 0 1 21 -1 a9 9 0 0 1 8 11 Z" fill="#A3ABBA" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M28 36 q6 4 12 1 M70 52 q5 3 10 1" stroke="#6B7484" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M6 80 h108" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="6" y="80" width="108" height="18" fill="' + GND + '"/>' +
    '<path d="M16 90 h18 M82 90 h22" stroke="#FFF" stroke-width="2.4" stroke-linecap="round" opacity=".5"/>',
  /* 弱相关：小人围围巾（风天常围但围巾≠大风） */
  scarfman:
    '<circle cx="60" cy="30" r="14" fill="#F6EAD4" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="54" cy="28" r="2" fill="' + INK + '"/><circle cx="66" cy="28" r="2" fill="' + INK + '"/>' +
    '<path d="M56 36 q4 3 8 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M42 46 h36 v44 h-36 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 46 q18 10 36 0" stroke="' + INK + '" stroke-width="2.4" fill="none"/>' +
    '<path d="M44 44 q16 12 32 0 q4 2 2 8 q-18 10 -36 0 q-2 -5 2 -8 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M52 60 l-2 30 h12 l4 -30 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M52 88 l-2 4 M58 90 l0 4 M64 88 l2 4" stroke="#E8483C" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M50 66 h14 M49 76 h15" stroke="#C04038" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M40 60 q-6 16 2 26 M80 60 q6 16 -2 26" stroke="' + INK + '" stroke-width="3" fill="none" stroke-linecap="round"/>',
  /* 无关：花盆摆着 */
  flowerpot:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M36 62 h48 l-6 30 h-36 Z" fill="#D2A87A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="32" y="52" width="56" height="12" rx="4" fill="#C89A6B" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M60 52 q-2 -22 -16 -28 M60 52 q0 -26 14 -32 M60 52 q6 -14 20 -14" stroke="#5B8C4A" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="42" cy="22" rx="8" ry="5" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(-24 42 22)"/>' +
    '<ellipse cx="76" cy="18" rx="8" ry="5" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(24 76 18)"/>' +
    '<ellipse cx="82" cy="38" rx="8" ry="5" fill="#9BC178" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(40 82 38)"/>' +
    '<path d="M44 72 h32 M47 82 h26" stroke="#B98A5C" stroke-width="2.4" stroke-linecap="round"/>',

  /* ===== paintday 刚画过画 ===== */
  /* 真：手掌+指尖颜料斑（红黄蓝点） */
  painthand:
    '<path d="M46 108 q-16 -2 -18 -22 q-2 -16 10 -24 l0 -26 q0 -6 6 -6 q6 0 6 6 l0 24 l4 0 l0 -32 q0 -6 6 -6 q6 0 6 6 l0 32 l4 0 l0 -26 q0 -6 6 -6 q6 0 6 6 l0 28 q10 8 8 22 q-2 20 -16 22 Z" fill="#F6EAD4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<circle cx="40" cy="30" r="5" fill="#E8483C" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="54" cy="22" r="5" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="68" cy="28" r="5" fill="#5B7BAE" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="80" cy="38" r="5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="56" cy="82" r="7" fill="#E8483C" stroke="' + INK + '" stroke-width="2" opacity=".85"/>' +
    '<circle cx="74" cy="90" r="5" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8" opacity=".85"/>' +
    '<circle cx="40" cy="90" r="4.4" fill="#5B7BAE" stroke="' + INK + '" stroke-width="1.6" opacity=".85"/>',
  /* 真：颜料罐开口+盖子斜放+溢色+画笔 */
  paintjar:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M32 50 h44 v40 q0 6 -6 6 h-32 q-6 0 -6 -6 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="54" cy="50" rx="22" ry="7" fill="#E8483C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="54" cy="50" rx="14" ry="4" fill="#F2B8C6"/>' +
    '<path d="M62 58 q6 8 -2 14 M44 62 q-4 8 4 12" stroke="#E8483C" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<rect x="76" y="70" width="26" height="10" rx="3" fill="#B8BFC9" stroke="' + INK + '" stroke-width="2.6" transform="rotate(18 89 75)"/>' +
    '<path d="M92 62 l8 -18" stroke="#8A5C3C" stroke-width="4.4" stroke-linecap="round"/>' +
    '<circle cx="101" cy="42" r="4.4" fill="#5B7BAE" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M24 54 l-8 -12 l12 4 Z" fill="#B8BFC9" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>',
  /* 真：画好的画摆在桌上（纸上小房子+太阳涂鸦） */
  paper:
    '<path d="M8 94 h104" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="26" y="30" width="66" height="54" rx="3" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3" transform="rotate(-3 59 57)"/>' +
    '<circle cx="42" cy="44" r="6" fill="#F5C445" stroke="#E8975A" stroke-width="2" transform="rotate(-3 59 57)"/>' +
    '<path d="M42 36 q-2 -5 3 -7 M42 36 q5 -2 7 3" stroke="#E8975A" stroke-width="2" fill="none" stroke-linecap="round" transform="rotate(-3 59 57)"/>' +
    '<path d="M50 76 v-14 l9 -8 l9 8 v14 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round" transform="rotate(-3 59 57)"/>' +
    '<rect x="55" y="66" width="8" height="10" fill="#5B7BAE" stroke="' + INK + '" stroke-width="1.8" transform="rotate(-3 59 57)"/>' +
    '<path d="M70 60 q6 -8 4 -14 M76 62 q8 -6 8 -16" stroke="#8FBF7F" stroke-width="2.6" fill="none" stroke-linecap="round" transform="rotate(-3 59 57)"/>' +
    '<path d="M72 78 h14" stroke="#5B7BAE" stroke-width="2.6" stroke-linecap="round" transform="rotate(-3 59 57)"/>' +
    '<rect x="22" y="36" width="10" height="8" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2" transform="rotate(8 27 40)"/>',
  /* 弱相关：洗净的笔挂起来（有笔但已洗净收好≠刚画完） */
  brush:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M10 34 h100" stroke="#8A5C3C" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M16 34 v-8 M104 34 v-8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M38 34 v14 l4 22 h10 l-4 -22 v-14 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M42 70 q3 10 6 0 q3 10 5 -1" fill="#5B8C4A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M70 34 v14 l4 22 h10 l-4 -22 v-14 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M74 70 q3 10 6 0 q3 10 5 -1" fill="#5B8C4A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<circle cx="34" cy="38" r="3.4" fill="none" stroke="#7FB3E0" stroke-width="2"/>' +
    '<circle cx="90" cy="42" r="4" fill="none" stroke="#7FB3E0" stroke-width="2.2"/>' +
    '<circle cx="86" cy="32" r="2.4" fill="none" stroke="#7FB3E0" stroke-width="1.8"/>' +
    '<path d="M46 78 q4 4 8 0 M78 78 q4 4 8 0" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>',
  /* 弱相关：桌上放着水杯（画画的洗笔水杯常在，但水杯不证明画画） */
  watercup:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M40 40 h40 l-5 50 q-1 6 -7 6 h-16 q-6 0 -7 -6 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" opacity=".92"/>' +
    '<path d="M42 62 h36 l-3 28 q-1 4 -5 4 h-20 q-4 0 -5 -4 Z" fill="#DCEAF8" opacity=".9"/>' +
    '<ellipse cx="60" cy="62" rx="18" ry="4" fill="#BFD8F0" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M42 48 q6 3 12 0 M70 52 q6 3 10 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<circle cx="52" cy="34" r="2.2" fill="none" stroke="#BFD8F0" stroke-width="1.8"/><circle cx="62" cy="28" r="2.8" fill="none" stroke="#BFD8F0" stroke-width="1.8"/>' +
    '<path d="M34 40 q-4 -8 2 -14 M86 40 q4 -8 -2 -14" stroke="' + INK + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".4"/>',
  /* 无关：桌上摆着书 */
  storybook:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="28" y="70" width="64" height="18" rx="3" fill="#5B7BAE" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="28" y="70" width="8" height="18" fill="#46709E" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="40" y="74" width="40" height="4" rx="2" fill="#FFF" opacity=".85"/>' +
    '<rect x="40" y="82" width="26" height="3" rx="1.5" fill="#FFF" opacity=".6"/>' +
    '<rect x="34" y="52" width="54" height="18" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.8" transform="rotate(-3 61 61)"/>' +
    '<rect x="34" y="52" width="8" height="18" fill="#C04038" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-3 61 61)"/>' +
    '<rect x="46" y="57" width="30" height="4" rx="2" fill="#FFF" opacity=".85" transform="rotate(-3 61 61)"/>' +
    '<rect x="46" y="64" width="20" height="3" rx="1.5" fill="#FFF" opacity=".6" transform="rotate(-3 61 61)"/>' +
    '<circle cx="88" cy="46" r="6" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M88 40 v-6 M88 52 v6 M82 46 h-6 M94 46 h6" stroke="#F5C445" stroke-width="2.6" stroke-linecap="round"/>',

  /* ===== nightowl 昨晚很晚还有人醒着 ===== */
  /* 真：夜色+亮着的台灯（光晕直证） */
  lamp:
    '<rect x="0" y="0" width="120" height="120" fill="#3A4A6B"/>' +
    '<circle cx="100" cy="20" r="9" fill="#F8E9B0" opacity=".9"/>' +
    '<circle cx="26" cy="30" r="1.8" fill="#FFF"/><circle cx="40" cy="16" r="1.4" fill="#FFF"/><circle cx="18" cy="52" r="1.4" fill="#FFF"/>' +
    '<circle cx="56" cy="52" r="30" fill="#F8E9B0" opacity=".18"/>' +
    '<path d="M40 42 h32 l6 18 h-44 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 42 q16 -8 32 0" stroke="' + INK + '" stroke-width="2.6" fill="none"/>' +
    '<path d="M56 60 v26" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<ellipse cx="56" cy="94" rx="20" ry="7" fill="#8A5C3C" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M46 50 q10 5 20 0" stroke="#FFF" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<circle cx="49" cy="56" r="2.2" fill="#FFF" opacity=".9"/><circle cx="63" cy="56" r="1.8" fill="#FFF" opacity=".9"/>' +
    '<path d="M0 100 h120" stroke="#2B3752" stroke-width="6"/>',
  /* 真：半杯热牛奶（液面+热气+桌上） */
  cup:
    '<path d="M10 100 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M34 44 h48 q2 46 -8 52 q-16 6 -32 0 q-10 -6 -8 -52 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M36 60 h44 l-3 32 q-1 5 -6 5 h-26 q-5 0 -6 -5 Z" fill="#FFFDF6"/>' +
    '<ellipse cx="58" cy="60" rx="21" ry="5" fill="#F6EBD4" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M52 56 a4 2.6 0 0 1 8 0 Z" fill="#F2DDC0" opacity=".8"/>' +
    '<path d="M46 38 q-7 -9 1 -18 q-5 9 3 14" stroke="#D8C9B4" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M64 36 q-7 -10 2 -19 q-6 10 3 15" stroke="#D8C9B4" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M80 38 q-6 -8 1 -15" stroke="#D8C9B4" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M30 100 q28 8 56 0" stroke="#F2B8C6" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
  /* 弱相关：挂钟指向很晚（钟面只报时不证明有人） */
  clock:
    '<rect x="0" y="0" width="120" height="120" fill="#3A4A6B"/>' +
    '<circle cx="22" cy="26" r="1.6" fill="#FFF"/><circle cx="96" cy="18" r="1.6" fill="#FFF"/><circle cx="106" cy="60" r="1.4" fill="#FFF"/><circle cx="14" cy="72" r="1.4" fill="#FFF"/>' +
    '<circle cx="60" cy="58" r="34" fill="#FFF9EE" stroke="' + INK + '" stroke-width="4"/>' +
    '<circle cx="60" cy="58" r="28" fill="none" stroke="#E8DCC8" stroke-width="2"/>' +
    '<path d="M60 32 v5 M60 79 v5 M33 58 h5 M82 58 h5" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M60 58 L60 38" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M60 58 L74 68" stroke="#E8483C" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="60" cy="58" r="3.4" fill="' + INK + '"/>' +
    '<path d="M48 100 l-4 10 h32 l-4 -10 Z" fill="#8A5C3C" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>',
  /* 弱相关：窗帘拉着（拉帘=晚的习惯，但不证明有人醒） */
  curtain:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<rect x="16" y="14" width="88" height="86" fill="' + SKY + '" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M60 14 v86 M16 57 h88" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="38" cy="36" r="8" fill="#F8E9B0" stroke="#E8A23C" stroke-width="2"/>' +
    '<path d="M16 14 q-4 44 6 86 l-8 0 q-12 -44 -4 -86 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M104 14 q4 44 -6 86 l8 0 q12 -44 4 -86 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 20 q-2 40 4 78 M28 18 q-1 42 5 82" stroke="#C9784A" stroke-width="2.2" fill="none" opacity=".7"/>' +
    '<path d="M98 20 q2 40 -4 78 M92 18 q1 42 -5 82" stroke="#C9784A" stroke-width="2.2" fill="none" opacity=".7"/>' +
    '<rect x="10" y="8" width="100" height="8" rx="4" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M16 100 h88" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>',
  /* 无关：窗台摆着绿植 */
  plant:
    '<rect x="0" y="0" width="120" height="104" fill="' + SKY + '"/>' +
    '<rect x="24" y="16" width="72" height="76" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M60 16 v76 M24 54 h72" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="10" y="92" width="100" height="12" fill="#D2A87A" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<path d="M60 92 q-4 -24 -22 -30 M60 92 q0 -28 18 -36 M60 92 q8 -16 24 -16" stroke="#5B8C4A" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="36" cy="58" rx="10" ry="6" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(-28 36 58)"/>' +
    '<ellipse cx="80" cy="52" rx="10" ry="6" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(26 80 52)"/>' +
    '<ellipse cx="86" cy="72" rx="9" ry="5.5" fill="#9BC178" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(42 86 72)"/>' +
    '<path d="M44 92 h32 l-4 10 h-24 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>'
});
Object.assign(EV_SVG, {
  /* ===== r17 新真场景：旧结论补足 3 真（snowplay/nightowl） ===== */
  /* 真：起伏厚雪层+石顶雪帽+雪粒闪光（雪后地面直证） */
  snowground:
    '<path d="M8 96 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M12 96 q6 -16 26 -14 q20 2 30 -8 q16 -12 28 -2 q10 7 14 24 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M20 88 q16 6 34 2 M58 86 q18 5 36 0" stroke="#E4EEF6" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<circle cx="34" cy="72" r="3" fill="#FFF" opacity=".95"/><circle cx="62" cy="62" r="2.4" fill="#FFF" opacity=".9"/><circle cx="86" cy="74" r="2.8" fill="#FFF" opacity=".95"/>' +
    '<circle cx="88" cy="50" r="11" fill="#B8BFC9" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M77 49 q11 -9 22 0 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<ellipse cx="34" cy="102" rx="26" ry="7" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.6"/>',
  /* 真：深夜底+红碗面+筷子+热气（深夜热食=有人醒着直证） */
  nightnoodles:
    '<rect x="0" y="0" width="120" height="120" fill="#3A4A6B"/>' +
    '<circle cx="20" cy="22" r="1.6" fill="#FFF"/><circle cx="98" cy="16" r="1.4" fill="#FFF"/><circle cx="108" cy="44" r="1.4" fill="#FFF"/><circle cx="12" cy="50" r="1.2" fill="#FFF"/>' +
    '<path d="M22 64 h76 l-9 27 q-29 10 -58 0 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 64 q6 -6 12 0 q6 6 12 0 q6 -6 12 0 q6 6 12 0 q6 -6 10 0" stroke="#F5C445" stroke-width="4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="64" rx="38" ry="6" fill="#C04038" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M56 22 l15 42 M72 18 l7 46" stroke="#B98A5C" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M38 52 q-7 -9 1 -18 q-6 10 3 15 M84 50 q-7 -9 1 -18" stroke="#D8C9B4" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<circle cx="38" cy="34" r="2.4" fill="#D8C9B4"/><circle cx="85" cy="32" r="2.2" fill="#D8C9B4"/>',

  /* ===== washhands 刚洗过手 ===== */
  /* 真：毛巾杆+下垂湿毛巾+水滴+小水洼（湿滴直证） */
  wettowel:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M14 30 h92" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="16" cy="30" r="3.4" fill="' + INK + '"/><circle cx="104" cy="30" r="3.4" fill="' + INK + '"/>' +
    '<path d="M34 32 q-4 44 2 56 q10 6 24 0 q6 -14 2 -56 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 44 q8 4 16 0 M40 58 q8 4 16 0 M42 72 q6 3 12 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".75"/>' +
    '<path d="M46 92 q-2 8 -4 10 M58 92 q0 8 -2 10" stroke="' + WATER + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="52" cy="106" rx="16" ry="5" fill="' + WATER + '" stroke="' + INK + '" stroke-width="2.2" opacity=".85"/>' +
    '<circle cx="40" cy="104" r="2.4" fill="' + WATER + '"/><circle cx="68" cy="102" r="2" fill="' + WATER + '"/>',
  /* 真：洗手池+龙头+台面一滩水+滴水（水渍直证） */
  sinkdrops:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M50 24 q0 -10 10 -10 q10 0 10 10 v10 h-6 v-8 q0 -5 -4 -5 q-4 0 -4 5 v8 h-6 Z" fill="#B8BFC9" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M24 44 h72 v10 h-72 Z" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M34 54 q26 22 52 0 v30 q-26 14 -52 0 Z" fill="#DCEAF8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 34 v8" stroke="' + WATER + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M57 44 q3 3 6 0" stroke="' + WATER + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="26" cy="42" rx="14" ry="6" fill="' + WATER + '" stroke="' + INK + '" stroke-width="2.2" opacity=".85"/>' +
    '<ellipse cx="96" cy="40" rx="10" ry="4.6" fill="' + WATER + '" stroke="' + INK + '" stroke-width="2" opacity=".8"/>' +
    '<path d="M18 38 q6 -3 12 0 M88 36 q5 -2 10 0" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<circle cx="30" cy="30" r="2.2" fill="' + WATER + '"/><circle cx="74" cy="28" r="1.8" fill="' + WATER + '"/>',
  /* 真：皂碟+肥皂+浮泡一串（残留泡泡直证） */
  soapbub:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M10 92 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M28 66 h52 l6 20 q0 6 -8 6 h-48 q-8 0 -8 -6 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M34 60 q26 -14 44 0 l0 6 h-44 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M40 58 q10 -5 20 0" stroke="#FFF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<circle cx="34" cy="42" r="7" fill="none" stroke="' + WATER + '" stroke-width="2.4"/>' +
    '<circle cx="50" cy="30" r="5.5" fill="none" stroke="' + WATER + '" stroke-width="2.2"/>' +
    '<circle cx="66" cy="40" r="4.5" fill="none" stroke="' + WATER + '" stroke-width="2"/>' +
    '<circle cx="82" cy="28" r="3.4" fill="none" stroke="' + WATER + '" stroke-width="2"/>' +
    '<circle cx="58" cy="46" r="3" fill="none" stroke="' + WATER + '" stroke-width="1.8"/>' +
    '<path d="M31 40 q3 -3 6 0 M47 28 q2 -2 5 0" stroke="#FFF" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"/>',

  /* ===== ateorange 刚吃过橘子 ===== */
  /* 真：桌面+卷曲橘皮螺旋+橘瓣（皮堆直证） */
  peelings:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M28 84 a14 14 0 1 1 4 -20 a10 10 0 1 1 14 10 q-8 8 -18 10 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M40 74 q6 -6 12 -2 M46 80 q5 -4 10 -1" stroke="#E8975A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M66 88 a11 11 0 1 1 8 -14 a8 8 0 1 1 8 9 q-7 5 -16 5 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M92 82 a7 7 0 1 1 5 -9 a5 5 0 1 1 4 6 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M60 62 l-7 -7 M67 60 l-4 -9 M78 68 l8 -6" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity=".8"/>' +
    '<circle cx="36" cy="58" r="2.2" fill="#E8975A"/><circle cx="88" cy="60" r="2" fill="#E8975A"/>',
  /* 真：盘子+剥一半的橘子（皮翻开三瓣+橘肉顶） */
  halforange:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="82" rx="42" ry="12" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="60" cy="78" rx="32" ry="9" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="60" cy="54" r="20" fill="#F5A24B" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M60 34 a20 20 0 0 1 14 6 M42 46 a20 20 0 0 1 4 -8" stroke="#E8975A" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M48 52 a13 13 0 0 1 24 0 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M60 40 v11 M52 46 l8 5 M68 46 l-8 5" stroke="#E8975A" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M40 62 q-10 4 -16 14 q14 4 22 -4 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M80 62 q10 4 16 14 q-14 4 -22 -4 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M44 68 q-6 3 -10 8 M76 68 q6 3 10 8" stroke="#E8975A" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
  /* 真：垃圾桶+桶口露出的橘皮（丢弃物直证） */
  trashpeel:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M34 46 h52 l-6 62 q-20 6 -40 0 Z" fill="#9BC178" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M30 42 h60 v8 h-60 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 56 v44 M52 56 v46 M64 56 v46 M76 56 v44" stroke="#5B8C4A" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M42 44 a12 12 0 1 1 6 -16 a9 9 0 1 1 10 11 q-8 4 -16 5 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M58 36 q6 -4 12 0" stroke="#E8975A" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M70 42 a7 7 0 1 1 5 -9 a5 5 0 1 1 4 6 Z" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<circle cx="48" cy="30" r="2" fill="#E8975A"/><circle cx="80" cy="30" r="1.8" fill="#E8975A"/>',

  /* ===== haircut 刚剪过头发 ===== */
  /* 真：地面+一层散落碎发丝（发屑直证） */
  hairfloor:
    '<path d="M8 96 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="8" y="96" width="104" height="16" fill="' + GND + '"/>' +
    '<path d="M22 88 q6 -4 12 0 M48 90 q6 -4 12 0 M78 86 q6 -4 12 0" stroke="#6B5A48" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M30 84 q5 -5 10 -1 M60 86 q5 -5 10 -1 M90 82 q4 -4 9 -1 M40 92 q5 -3 10 0 M70 92 q5 -3 10 0" stroke="#8A7B6C" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M18 78 q4 -4 8 -2 M52 80 q4 -4 8 -2 M84 76 q4 -4 8 -2 M64 92 q4 -3 8 0" stroke="#B8A88F" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 90 l6 -3 M56 88 l6 -3 M86 86 l6 -3 M36 84 l5 -3 M76 90 l5 -3" stroke="#4A3B2E" stroke-width="1.6" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="70" rx="4" ry="2" fill="#8A7B6C" opacity=".6"/><ellipse cx="34" cy="74" rx="3.4" ry="1.8" fill="#8A7B6C" opacity=".6"/><ellipse cx="88" cy="72" rx="3.6" ry="2" fill="#8A7B6C" opacity=".6"/>',
  /* 真：衣领肩部+粘着的小碎发（肩上发屑直证） */
  haircollar:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<circle cx="60" cy="26" r="13" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M40 20 h40" stroke="' + INK + '" stroke-width="6" stroke-linecap="round"/>' +
    '<path d="M60 38 q-26 0 -32 18 l-8 56 h80 l-8 -56 q-6 -18 -32 -18 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 44 q18 12 36 0" stroke="' + INK + '" stroke-width="2.6" fill="none"/>' +
    '<path d="M36 60 q24 10 48 0" stroke="#5B7BAE" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M36 58 q3 -5 7 -3 M48 60 q3 -5 7 -2 M62 60 q3 -5 7 -2 M76 58 q3 -4 7 -2" stroke="#6B5A48" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M42 66 q4 -3 8 -1 M58 68 q4 -3 8 -1 M72 66 q4 -3 8 -1" stroke="#8A7B6C" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="44" cy="62" rx="3.4" ry="1.8" fill="#6B5A48" opacity=".7"/><ellipse cx="66" cy="64" rx="3" ry="1.6" fill="#6B5A48" opacity=".7"/>',
  /* 真：扫帚+扫拢的一堆碎发（清扫中的发堆直证） */
  broomhair:
    '<path d="M8 96 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="8" y="96" width="104" height="16" fill="' + GND + '"/>' +
    '<path d="M76 26 l6 -4 M84 22 l10 44 q-6 4 -12 2 Z" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M80 24 l4 44" stroke="#8A5C3C" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M82 66 l14 4 -4 22 q-8 4 -14 0 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M84 74 l10 2 M83 80 l10 2 M84 86 l8 2" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
    '<path d="M28 96 q16 -10 34 0 Z" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M32 92 q6 -5 12 -2 M44 94 q6 -5 12 -2 M38 88 q5 -4 10 -1 M50 90 q5 -4 10 -1" stroke="#4A3B2E" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M30 94 q4 -6 10 -4 M48 96 q4 -6 10 -4" stroke="#6B5A48" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="45" cy="84" rx="3.4" ry="1.8" fill="#6B5A48" opacity=".7"/>'
});
Object.assign(EV_SVG, {
  /* ===== waterplant 刚浇过花 ===== */
  /* 真：盆栽+叶尖水珠欲滴（浇后水珠直证） */
  drops:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M60 88 q-2 -24 -18 -30 M60 88 q0 -26 14 -34 M60 88 q8 -16 22 -16" stroke="#5B8C4A" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="40" cy="56" rx="11" ry="6" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(-28 40 56)"/>' +
    '<ellipse cx="76" cy="50" rx="11" ry="6" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(24 76 50)"/>' +
    '<ellipse cx="84" cy="70" rx="10" ry="5.5" fill="#9BC178" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(42 84 70)"/>' +
    '<ellipse cx="44" cy="66" rx="9" ry="5" fill="#9BC178" stroke="#5B8C4A" stroke-width="2" transform="rotate(-10 44 66)"/>' +
    '<path d="M34 62 a4 4 0 0 1 7 0 a4 4 0 0 1 -7 0 M70 56 a4.4 4.4 0 0 1 8 0 a4.4 4.4 0 0 1 -8 0" fill="' + WATER + '"/>' +
    '<path d="M38 58 q1 -2 3 -2 M74 52 q1 -2 3 -2" stroke="#FFF" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M30 72 q0 5 3 6 M82 78 q0 4 3 5" stroke="' + WATER + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 88 h40 l-5 20 q-15 4 -30 0 Z" fill="#D2A87A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>',
  /* 真：花盆+托盘+盘边渗出水光（托盘满溢直证） */
  traywater:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M40 50 h40 l-6 38 q-14 4 -28 0 Z" fill="#D2A87A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="36" y="42" width="48" height="10" rx="4" fill="#C89A6B" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M60 42 q-2 -20 -14 -26 M60 42 q0 -22 12 -28" stroke="#5B8C4A" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="44" cy="14" rx="8" ry="4.6" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2" transform="rotate(-24 44 14)"/>' +
    '<ellipse cx="74" cy="12" rx="8" ry="4.6" fill="#9BC178" stroke="#5B8C4A" stroke-width="2" transform="rotate(22 74 12)"/>' +
    '<rect x="26" y="88" width="68" height="12" rx="4" fill="#B8BFC9" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="30" cy="98" rx="7" ry="3.4" fill="' + WATER + '" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<ellipse cx="90" cy="96" rx="8" ry="3.6" fill="' + WATER + '" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M26 100 q-6 4 -10 8 M94 98 q6 4 10 8" stroke="' + WATER + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 94 q10 3 20 0 M62 96 q10 3 20 0" stroke="#FFF" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".85"/>',
  /* 真：花盆+深色湿土+光泽高光（土色深亮直证） */
  soilwet:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M60 54 q-2 -22 -14 -28 M60 54 q2 -24 14 -28" stroke="#5B8C4A" stroke-width="3.2" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="46" cy="24" rx="8" ry="4.4" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2" transform="rotate(-22 46 24)"/>' +
    '<ellipse cx="74" cy="22" rx="8" ry="4.4" fill="#9BC178" stroke="#5B8C4A" stroke-width="2" transform="rotate(20 74 22)"/>' +
    '<path d="M38 54 h44 l-7 44 q-15 4 -30 0 Z" fill="#C89A6B" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="54" rx="22" ry="6" fill="#6E4A30" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="54" cy="53" rx="7" ry="2.6" fill="#8A5C3C" opacity=".85"/>' +
    '<ellipse cx="66" cy="55" rx="5" ry="2" fill="#8A5C3C" opacity=".8"/>' +
    '<path d="M48 52 q8 -3 16 0 M64 56 q6 -2 12 0" stroke="#B98A5C" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M52 48 q4 -2 8 0 M68 52 q3 -2 6 0" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>',

  /* ===== mopped 刚拖过地 ===== */
  /* 真：地面大块光泽反光条（湿地反光直证） */
  wetshine:
    '<rect x="0" y="0" width="120" height="120" fill="#EAE0CD"/>' +
    '<path d="M0 40 h120 M0 80 h120" stroke="#D8C9B4" stroke-width="3"/>' +
    '<path d="M40 0 v120 M80 0 v120" stroke="#D8C9B4" stroke-width="3"/>' +
    '<path d="M18 22 l30 -12 M70 18 l30 -12 M22 62 l30 -12 M74 58 l30 -12 M18 102 l30 -12 M72 98 l30 -12" stroke="#FFF" stroke-width="7" stroke-linecap="round" opacity=".55"/>' +
    '<path d="M30 40 l24 -10 M78 36 l20 -8 M26 80 l24 -10 M80 76 l20 -8" stroke="#FFF" stroke-width="4.4" stroke-linecap="round" opacity=".4"/>' +
    '<ellipse cx="60" cy="64" rx="26" ry="10" fill="#FFF" opacity=".22"/>' +
    '<path d="M10 34 q22 -8 44 0" stroke="' + WATER + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".35"/>',
  /* 真：墙角+斜靠拖把+拖把头滴水+水洼（湿拖把直证） */
  mopdrip:
    '<rect x="0" y="0" width="30" height="120" fill="#F2DDC0"/>' +
    '<path d="M30 0 v120" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M0 96 h120" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M52 14 q-6 50 -14 74 l10 4 q10 -26 12 -76 Z" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M38 92 q-10 4 -18 2 q-2 -10 8 -14 q12 -2 14 4 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M26 86 q6 4 10 2 M24 92 q6 4 12 2" stroke="#C9784A" stroke-width="2" fill="none" stroke-linecap="round"/>' +
    '<path d="M28 96 q-2 6 -4 8 M36 98 q0 6 -2 8" stroke="' + WATER + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="34" cy="110" rx="18" ry="6" fill="' + WATER + '" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="22" cy="106" r="2.2" fill="' + WATER + '"/><circle cx="50" cy="108" r="1.8" fill="' + WATER + '"/>',
  /* 真：地面+S 形湿水痕拖尾（未干水迹直证） */
  watertrail:
    '<rect x="0" y="0" width="120" height="120" fill="#EAE0CD"/>' +
    '<path d="M0 60 h120" stroke="#D8C9B4" stroke-width="3"/>' +
    '<path d="M14 84 q10 -26 30 -18 q22 8 36 -8 q14 -14 30 -4" stroke="' + WATER + '" stroke-width="14" fill="none" stroke-linecap="round" opacity=".55"/>' +
    '<path d="M14 84 q10 -26 30 -18 q22 8 36 -8 q14 -14 30 -4" stroke="' + WATER + '" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M22 74 q8 -10 18 -6 M58 66 q12 4 22 -6 M92 58 q8 -2 14 2" stroke="#FFF" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<circle cx="48" cy="70" r="2.4" fill="' + WATER + '"/><circle cx="80" cy="56" r="2" fill="' + WATER + '"/><circle cx="16" cy="86" r="2.2" fill="' + WATER + '"/>',

  /* ===== brushed 刚刷过牙 ===== */
  /* 真：漱口杯+斜插牙刷+刷毛细水珠（湿刷毛直证） */
  brushwet:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M36 52 h44 l-5 42 q-1 5 -6 5 h-22 q-5 0 -6 -5 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="58" cy="52" rx="22" ry="5" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M46 50 l26 -30" stroke="#FFF" stroke-width="7" stroke-linecap="round" opacity=".95"/>' +
    '<path d="M46 50 l26 -30" stroke="' + INK + '" stroke-width="1.6" stroke-linecap="round" opacity=".4"/>' +
    '<rect x="68" y="16" width="10" height="8" rx="2" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2" transform="rotate(-49 73 20)"/>' +
    '<circle cx="50" cy="44" r="2.2" fill="' + WATER + '"/><circle cx="56" cy="40" r="1.8" fill="' + WATER + '"/><circle cx="60" cy="35" r="2" fill="' + WATER + '"/>' +
    '<path d="M46 44 q3 3 6 1 M54 36 q3 2 5 0" stroke="' + WATER + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  /* 真：牙膏管+旁边脱落的牙膏帽（帽未盖上直证） */
  pasteopen:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M46 40 q-14 4 -14 18 v22 q0 10 12 10 h20 q12 0 12 -10 v-22 q0 -14 -14 -18 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M46 40 v-12 h18 v12" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M50 28 h10 v-4 h-10 Z" fill="#C04038" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M38 58 q20 8 40 0" stroke="#7FB3E0" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<rect x="82" y="82" width="12" height="9" rx="3" fill="#C04038" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<circle cx="88" cy="86" r="2" fill="#E8483C"/>' +
    '<circle cx="78" cy="90" r="1.8" fill="#FFF"/><circle cx="94" cy="94" r="1.6" fill="#FFF"/>',
  /* 真：倒扣漱口杯+杯沿下滴水+小水洼（控水直证） */
  cupdrain:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="26" y="56" width="6" height="24" rx="3" fill="' + INK + '"/>' +
    '<rect x="24" y="46" width="10" height="7" rx="3" fill="' + INK + '"/>' +
    '<rect x="34" y="52" width="10" height="7" rx="3" fill="' + INK + '"/>' +
    '<path d="M22 34 h76 v10 q-6 6 -38 6 q-32 0 -38 -6 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 34 v-14" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<circle cx="60" cy="16" r="4" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M38 52 q-2 8 -4 10 M60 52 q0 8 -2 10 M82 52 q2 8 4 10" stroke="' + WATER + '" stroke-width="2.8" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="88" rx="24" ry="6" fill="' + WATER + '" stroke="' + INK + '" stroke-width="2.2" opacity=".85"/>' +
    '<circle cx="36" cy="84" r="2" fill="' + WATER + '"/><circle cx="86" cy="84" r="1.8" fill="' + WATER + '"/>',

  /* ===== fedfish 刚喂过鱼 ===== */
  /* 真：鱼食罐+斜开罐盖+洒出颗粒（开罐直证） */
  feedcan:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M34 44 h40 v40 q0 8 -8 8 h-24 q-8 0 -8 -8 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="30" y="36" width="48" height="10" rx="3" fill="#E8A23C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M32 30 q20 -10 40 0 l-4 8 h-32 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<circle cx="60" cy="41" r="2.6" fill="' + INK + '"/>' +
    '<path d="M38 58 h32 M38 68 h32" stroke="#E8A23C" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>' +
    '<circle cx="36" cy="94" r="2.4" fill="#C9784A"/><circle cx="44" cy="97" r="2" fill="#C9784A"/><circle cx="52" cy="94" r="2.2" fill="#C9784A"/>' +
    '<circle cx="82" cy="90" r="2.2" fill="#C9784A"/><circle cx="88" cy="95" r="2" fill="#C9784A"/>' +
    '<path d="M46 92 q10 4 22 0" stroke="#D8A23C" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>',
  /* 真：水面线+漂浮饲料粒+水下小鱼仰视（水面饲料直证） */
  feedfloat:
    '<rect x="0" y="0" width="120" height="120" fill="#DCEAF8"/>' +
    '<rect x="0" y="44" width="120" height="76" fill="#A8CBE8"/>' +
    '<path d="M0 44 q15 -6 30 0 q15 6 30 0 q15 -6 30 0 q15 6 30 0" stroke="' + INK + '" stroke-width="3" fill="none"/>' +
    '<ellipse cx="30" cy="42" rx="5" ry="2.6" fill="#C9784A" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<ellipse cx="52" cy="46" rx="4.4" ry="2.2" fill="#E8A23C" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<ellipse cx="76" cy="41" rx="5" ry="2.6" fill="#C9784A" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<ellipse cx="96" cy="45" rx="4" ry="2" fill="#E8A23C" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<ellipse cx="46" cy="84" rx="16" ry="9" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M30 84 l-10 -8 v16 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<circle cx="38" cy="82" r="2" fill="' + INK + '"/>' +
    '<path d="M46 78 q4 3 8 0" stroke="' + INK + '" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
    '<path d="M84 78 q8 -10 16 -2 M80 92 q10 6 18 0" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>',
  /* 真：鱼缸角落+缸边台面撒的饲料粒（缸外撒粒直证） */
  feedspill:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M18 30 h64 v56 q0 6 -6 6 h-52 q-6 0 -6 -6 Z" fill="#BFDDF2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M18 30 q32 -12 64 0" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M26 46 v34 M40 46 v34 M54 46 v34 M68 46 v34" stroke="#8AB4D8" stroke-width="2" opacity=".6"/>' +
    '<ellipse cx="42" cy="72" rx="12" ry="7" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M30 72 l-8 -6 v12 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<circle cx="86" cy="90" r="2.6" fill="#C9784A"/><circle cx="94" cy="86" r="2.2" fill="#E8A23C"/><circle cx="102" cy="92" r="2.4" fill="#C9784A"/>' +
    '<circle cx="84" cy="82" r="2" fill="#E8A23C"/><circle cx="98" cy="80" r="1.8" fill="#C9784A"/>' +
    '<path d="M78 94 q14 4 28 -2" stroke="#D8A23C" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>',

  /* ===== playedblocks 刚搭过积木 ===== */
  /* 真：地面+散落彩色积木块多角度（摊放直证） */
  blocksout:
    '<path d="M8 96 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="14" y="76" width="28" height="14" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="48" y="80" width="24" height="12" rx="3" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-8 60 86)"/>' +
    '<rect x="80" y="76" width="26" height="13" rx="3" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.4" transform="rotate(6 93 82)"/>' +
    '<rect x="26" y="58" width="22" height="16" rx="3" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.6" transform="rotate(-14 37 66)"/>' +
    '<rect x="62" y="56" width="24" height="16" rx="3" fill="#E8975A" stroke="' + INK + '" stroke-width="2.6" transform="rotate(10 74 64)"/>' +
    '<rect x="90" y="58" width="18" height="16" rx="3" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-6 99 66)"/>' +
    '<circle cx="20" cy="52" r="6" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="38" y="42" width="16" height="12" rx="3" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.2" transform="rotate(12 46 48)"/>' +
    '<circle cx="58" cy="40" r="5" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
    '<rect x="70" y="36" width="18" height="12" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-10 79 42)"/>',
  /* 真：桌面+搭到一半的塔（底层 3+中层 1+缺口）（半成品直证） */
  towerhalf:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="30" y="80" width="60" height="12" rx="3" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="38" y="66" width="22" height="12" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="64" y="66" width="22" height="12" rx="3" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="42" y="52" width="24" height="12" rx="3" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<rect x="46" y="38" width="18" height="12" rx="3" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M68 58 h26" stroke="#B8A88F" stroke-width="2.4" stroke-dasharray="5 5" stroke-linecap="round"/>' +
    '<rect x="78" y="78" width="22" height="12" rx="3" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.4" transform="rotate(8 89 84)"/>' +
    '<circle cx="24" cy="86" r="5" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="98" cy="60" r="4.4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>',
  /* 真：收纳箱+斜开箱盖+箱内积木露出（开箱取用直证） */
  sortbox:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M24 52 h64 v36 q0 6 -6 6 h-52 q-6 0 -6 -6 Z" fill="#9BC178" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="20" y="60" width="10" height="16" rx="4" fill="' + INK + '"/>' +
    '<rect x="82" y="60" width="10" height="16" rx="4" fill="' + INK + '"/>' +
    '<rect x="30" y="44" width="24" height="12" rx="3" fill="#E8483C" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<rect x="56" y="46" width="22" height="12" rx="3" fill="#F5C445" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="40" cy="38" r="5" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M20 52 q28 -16 64 0 l2 -6 q-34 -18 -68 0 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M88 46 l18 -14" stroke="#5B8C4A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="88" y="24" width="16" height="4" rx="2" fill="#FFF" stroke="' + INK + '" stroke-width="1.6"/>'
});
Object.assign(EV_SVG, {
  /* ===== drankmilk 刚喝过牛奶 ===== */
  /* 真：玻璃杯+内壁一圈奶渍白痕（渍环直证） */
  milkring:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M36 44 h48 l-4 46 q-1 6 -7 6 h-26 q-6 0 -7 -6 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" opacity=".92"/>' +
    '<ellipse cx="60" cy="44" rx="24" ry="6" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M40 56 q-2 34 1 38 M80 56 q2 34 -1 38" stroke="#F6EBD4" stroke-width="7" fill="none" stroke-linecap="round"/>' +
    '<path d="M42 54 q-2 10 0 16 M78 54 q2 10 0 16" stroke="#FFF" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>' +
    '<path d="M40 62 q20 6 40 0 M39 74 q21 6 42 0 M38 86 q22 6 44 0" stroke="#F2E2C8" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".9"/>' +
    '<path d="M44 50 q14 4 30 0" stroke="#FFF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>',
  /* 真：桌面+两滴牛奶滴痕+溅点（滴洒直证） */
  milkdrop:
    '<path d="M8 94 h104" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="8" y="94" width="104" height="18" fill="#F2DDC0" opacity=".6"/>' +
    '<path d="M44 66 q-7 12 0 16 q7 -4 0 -16 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M42 80 a6 3.4 0 0 0 12 0 a6 3.4 0 0 0 -12 0 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M46 74 q2 4 6 4" stroke="#FFF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>' +
    '<path d="M72 60 q-6 10 0 13 q6 -3 0 -13 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M70 71 a5 2.8 0 0 0 10 0 a5 2.8 0 0 0 -10 0 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="34" cy="88" r="2.6" fill="#FFFDF6" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<circle cx="56" cy="90" r="2" fill="#FFFDF6" stroke="' + INK + '" stroke-width="1.4"/>' +
    '<circle cx="84" cy="86" r="2.2" fill="#FFFDF6" stroke="' + INK + '" stroke-width="1.4"/>',
  /* 真：牛奶盒+吸管+液面半空（喝一半直证） */
  milkhalf:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M36 44 l6 -14 h30 l6 14 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M38 32 q22 8 44 0 l-2 -14 q-20 6 -40 0 Z" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M36 44 h42 v44 q0 8 -8 8 h-26 q-8 0 -8 -8 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="36" y="64" width="42" height="24" fill="#F6EBD4"/>' +
    '<path d="M36 64 h42" stroke="#E8DCC8" stroke-width="2.6"/>' +
    '<path d="M58 20 l14 -4" stroke="#E8483C" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M70 18 l1 12" stroke="#E8483C" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M42 78 h30 M44 86 h26" stroke="#FFF" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M46 52 q12 4 24 0" stroke="#BFD8F0" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>',

  /* ===== wrotehomework 刚写过作业 ===== */
  /* 真：作业本摊开双页+写字行（摊开未合直证） */
  notebookopen:
    '<path d="M8 96 h104" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M20 46 h80 v36 q-20 8 -40 0 q-20 8 -40 0 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 46 v38" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M28 56 h24 M66 56 h26 M28 64 h22 M66 64 h24 M28 72 h20" stroke="#D8C9B4" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M52 56 h0 M30 58 q6 -4 12 0 M68 60 q6 -4 12 0 M70 70 q6 -4 12 0" stroke="#5B7BAE" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M24 44 q36 -10 72 0" stroke="#E8483C" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<rect x="14" y="52" width="10" height="24" rx="2" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-6 19 64)"/>' +
    '<path d="M96 50 l6 -8" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  /* 真：桌角+橡皮+一小堆橡皮屑（擦写直证） */
  eraserdust:
    '<path d="M8 96 h104" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="8" y="96" width="104" height="18" fill="#F2DDC0" opacity=".5"/>' +
    '<path d="M84 40 l24 8 l-6 18 l-24 -8 Z" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M88 52 l20 6" stroke="#E8975A" stroke-width="2.4"/>' +
    '<path d="M86 44 l20 6" stroke="#FFF" stroke-width="2" opacity=".7"/>' +
    '<path d="M40 88 q12 -10 26 -4 q10 4 4 10 q-14 6 -30 2 Z" fill="#E8E3DC" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<circle cx="30" cy="92" r="2.2" fill="#E8E3DC"/><circle cx="76" cy="94" r="2" fill="#E8E3DC"/>' +
    '<circle cx="36" cy="84" r="1.8" fill="#E8E3DC"/><circle cx="66" cy="86" r="1.6" fill="#E8E3DC"/><circle cx="54" cy="80" r="1.8" fill="#E8E3DC"/>' +
    '<path d="M22 78 q6 -4 12 -2 M80 76 q6 -2 12 0" stroke="#D8C9B4" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>',
  /* 真：铅笔横搁在摊开的本子上（随手搁置直证） */
  pencilrest:
    '<path d="M8 96 h104" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M22 52 h76 v32 q-19 8 -38 0 q-19 8 -38 0 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M60 52 v32" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M30 62 h22 M68 62 h22 M30 70 h20 M68 70 h18" stroke="#D8C9B4" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M28 42 l56 14" stroke="#F5C445" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M84 56 l10 -8 l-4 12 Z" fill="#F6EBD4" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="92" cy="51" r="1.6" fill="' + INK + '"/>' +
    '<path d="M26 44 l-8 -2" stroke="#E8975A" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M34 46 q8 8 0 14 M46 49 q8 8 0 14" stroke="#FFF" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>',

  /* ===== fixedbike 刚修过自行车 ===== */
  /* 真：手掌特写+指缝黑油泥（油污直证） */
  greasehand:
    '<path d="M44 110 q-16 -2 -18 -22 q-2 -16 10 -24 l0 -24 q0 -6 6 -6 q6 0 6 6 l0 22 l4 0 l0 -30 q0 -6 6 -6 q6 0 6 6 l0 30 l4 0 l0 -26 q0 -6 6 -6 q6 0 6 6 l0 28 q10 8 8 22 q-2 20 -16 22 Z" fill="#F6EAD4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 42 q6 10 0 18 M54 40 q6 14 0 24 M68 44 q5 10 0 18" stroke="#3A322A" stroke-width="4.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M48 76 q8 6 16 0 M44 90 q10 6 20 0" stroke="#3A322A" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>' +
    '<circle cx="50" cy="30" r="2.6" fill="#3A322A"/><circle cx="64" cy="26" r="2.4" fill="#3A322A"/>' +
    '<ellipse cx="58" cy="96" rx="10" ry="5" fill="#3A322A" opacity=".6"/>' +
    '<path d="M80 44 q4 -6 8 -2 M36 58 q-5 -4 -2 -9" stroke="#3A322A" stroke-width="3" fill="none" stroke-linecap="round" opacity=".6"/>',
  /* 真：垫布上摊开的螺丝刀+扳手+螺钉（工具摊放直证） */
  toolslay:
    '<path d="M10 92 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M16 62 q44 -14 88 0 l-6 26 q-38 12 -76 0 Z" fill="#D2A87A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M16 62 q44 -14 88 0" stroke="#B98A5C" stroke-width="2.2" fill="none"/>' +
    '<path d="M30 56 l30 22" stroke="#E8483C" stroke-width="6" stroke-linecap="round"/>' +
    '<rect x="56" y="74" width="10" height="6" rx="2" fill="#C04038" stroke="' + INK + '" stroke-width="1.8" transform="rotate(36 61 77)"/>' +
    '<path d="M76 52 q8 -8 16 0 l-8 8 Z" fill="#B8BFC9" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M78 60 l-18 24" stroke="#8A93A3" stroke-width="6" stroke-linecap="round"/>' +
    '<circle cx="88" cy="66" r="2.6" fill="' + INK + '"/><circle cx="38" cy="76" r="2.6" fill="' + INK + '"/><circle cx="52" cy="70" r="2.2" fill="' + INK + '"/>' +
    '<path d="M64 80 h14 M32 84 h10" stroke="#8A5C3C" stroke-width="2" stroke-linecap="round" opacity=".6"/>',
  /* 真：自行车+链条拆下搭在车架上（拆链直证） */
  chainoff:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="34" cy="72" r="16" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="34" cy="72" r="4" fill="' + INK + '"/>' +
    '<circle cx="86" cy="66" r="12" fill="none" stroke="' + INK + '" stroke-width="3.4"/>' +
    '<circle cx="86" cy="66" r="3.4" fill="' + INK + '"/>' +
    '<path d="M34 72 L60 46 L86 66 M60 46 l6 -18 h12" stroke="#E8975A" stroke-width="4.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M66 28 h14 l-4 -6 h-8 Z" fill="#5B7BAE" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round"/>' +
    '<path d="M52 58 q8 -6 16 -2" stroke="none"/>' +
    '<path d="M40 62 q10 4 22 -4 q10 -6 18 0" stroke="' + INK + '" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-dasharray="7 4"/>' +
    '<path d="M40 58 q10 2 20 -6 q9 -5 17 -1" stroke="#8A7B6C" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-dasharray="6 4" opacity=".7"/>',

  /* ===== playedsandbox 刚玩过沙子 ===== */
  /* 真：沙坑+新堆沙堡（塔身+雉堞+小旗）（沙堡直证） */
  sandcastle:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M6 78 q57 -22 108 0 l-4 26 q-50 16 -100 0 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 78 v-26 h24 v26" fill="#F5DEB8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 52 h-4 v-6 h4 M50 52 v-6 h4 v6 M58 52 v-6 h4 v6 M66 52 h4 v-6 h-4" fill="#F5DEB8" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M46 66 h16 M48 72 h12" stroke="#D8A87A" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M54 50 v-16" stroke="#8A5C3C" stroke-width="2.4" stroke-linecap="round"/>' +
    '<path d="M54 34 l14 4 l-14 4 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<path d="M20 90 q10 4 20 0 M76 88 q12 5 24 0" stroke="#D8A87A" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="24" cy="82" r="2" fill="#D8A87A"/><circle cx="94" cy="80" r="2.2" fill="#D8A87A"/>',
  /* 真：沙坑里插着小桶+铲子（随手插放直证） */
  bucket:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M6 80 q57 -20 108 0 l-4 24 q-50 16 -100 0 Z" fill="#F2DDC0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 44 h22 l-4 32 h-14 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M41 52 q10 4 20 0 M42 62 q9 4 18 0" stroke="#C9784A" stroke-width="2.2" stroke-linecap="round"/>' +
    '<path d="M40 44 q11 -16 22 0" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M74 40 l10 38" stroke="#7FA8D4" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M84 78 l12 -4 l-6 12 Z" fill="#B8BFC9" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M78 46 q6 10 2 18" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M20 90 q10 4 20 0 M80 88 q12 5 22 0" stroke="#D8A87A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  /* 真：鞋面特写+鞋边撒落沙粒（带沙直证） */
  sandshoes:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M22 58 q0 -10 12 -10 q6 0 8 6 l18 -2 q16 0 22 10 q6 10 -4 16 q-24 8 -48 2 q-10 -4 -8 -22 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 76 q22 8 52 2" stroke="#FFF" stroke-width="8" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 80 h50" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M40 60 q10 4 20 0" stroke="#FFF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<circle cx="16" cy="88" r="2.2" fill="#D8A87A"/><circle cx="24" cy="92" r="1.8" fill="#D8A87A"/><circle cx="32" cy="88" r="2.4" fill="#D8A87A"/>' +
    '<circle cx="88" cy="90" r="2.4" fill="#D8A87A"/><circle cx="96" cy="86" r="2" fill="#D8A87A"/><circle cx="104" cy="90" r="2.2" fill="#D8A87A"/>' +
    '<circle cx="78" cy="86" r="1.8" fill="#D8A87A"/><circle cx="66" cy="90" r="1.6" fill="#D8A87A"/>'
});
Object.assign(EV_SVG, {
  /* ===== r17 弱相关干扰场景（weak=有关但不能证明：常伴随但不足以证明） ===== */
  /* weak：手套搭在暖气片边（冷天常备≠下雪后） */
  mittens:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M14 62 h92 v34 h-92 Z" fill="#B8BFC9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 62 v34 M38 62 v34 M54 62 v34 M70 62 v34 M86 62 v34 M98 62 v34" stroke="#8A93A3" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M14 54 h92 v8 h-92 Z" fill="#9AA3B0" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M34 46 q0 -14 13 -14 q13 0 13 14 v10 q0 8 -13 8 q-13 0 -13 -8 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M34 46 q13 8 26 0" stroke="' + INK + '" stroke-width="2.2" fill="none"/>' +
    '<path d="M38 40 q4 4 9 4" stroke="#FFF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M64 44 q0 -10 10 -10 q10 0 10 10 v6 q0 6 -10 6 q-10 0 -10 -6 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M64 44 q10 6 20 0" stroke="' + INK + '" stroke-width="2" fill="none"/>',
  /* weak：菜篮装满蔬菜（买菜常有≠刚做饭） */
  basket:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M26 50 h68 l-8 40 q-26 8 -52 0 Z" fill="#D2A87A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M32 56 q28 6 56 0 M34 68 q24 6 48 0 M36 80 q20 6 42 0" stroke="#B98A5C" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M40 50 q0 -18 20 -18 q20 0 20 18" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="46" cy="44" rx="9" ry="6" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(-18 46 44)"/>' +
    '<path d="M62 48 q-2 -14 4 -20 M64 44 q8 -8 14 -8" stroke="#5B8C4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="78" cy="42" rx="8" ry="5.4" fill="#E8483C" stroke="' + INK + '" stroke-width="2.2" transform="rotate(22 78 42)"/>' +
    '<path d="M70 40 q-2 -8 4 -12" stroke="#5B8C4A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  /* weak：地上摆着狗粮碗（养狗常备≠狗刚来过） */
  dogbowl:
    '<path d="M8 92 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M28 62 h64 l-8 22 q-24 8 -48 0 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="62" rx="32" ry="8" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<ellipse cx="60" cy="62" rx="22" ry="5" fill="#C89A6B" opacity=".85"/>' +
    '<circle cx="52" cy="61" r="3" fill="#A8784C"/><circle cx="62" cy="63" r="2.6" fill="#A8784C"/><circle cx="70" cy="61" r="2.4" fill="#A8784C"/>' +
    '<path d="M40 56 q20 6 40 0" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M24 50 q-6 -8 2 -12 M90 48 q8 -6 2 -14" stroke="' + INK + '" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/>',
  /* weak：袖子卷得高高的（洗手动作但非水渍） */
  sleeves:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<circle cx="60" cy="30" r="13" fill="#F6EAD4" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="55" cy="28" r="2" fill="' + INK + '"/><circle cx="65" cy="28" r="2" fill="' + INK + '"/>' +
    '<path d="M57 35 q3 3 6 0" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M42 52 q18 -8 36 0 l14 10 q4 4 0 8 q-4 4 -8 0 l-10 -6 v40 h-44 v-40 l-10 6 q-4 4 -8 0 q-4 -4 0 -8 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M28 62 q-6 4 -8 10 M92 62 q6 4 8 10" stroke="#5B7BAE" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M46 60 q14 6 28 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M36 56 q6 6 4 12 M84 56 q-6 6 -4 12" stroke="' + INK + '" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M48 104 v-8 M60 104 v-8 M72 104 v-8" stroke="#F6EAD4" stroke-width="7" stroke-linecap="round"/>',
  /* weak：毛巾挂得整整齐齐（干爽平整≠刚用过） */
  towelneat:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M14 26 h92" stroke="' + INK + '" stroke-width="5" stroke-linecap="round"/>' +
    '<circle cx="16" cy="26" r="3.4" fill="' + INK + '"/><circle cx="104" cy="26" r="3.4" fill="' + INK + '"/>' +
    '<path d="M36 28 h48 v58 q0 4 -4 4 h-40 q-4 0 -4 -4 Z" fill="#8FBF7F" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M36 40 h48 M36 52 h48 M36 64 h48" stroke="#5B8C4A" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M42 34 q16 4 32 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<rect x="40" y="72" width="18" height="14" rx="3" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M14 96 h92" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M12 26 h-0.01" stroke="none"/>',
  /* weak：桌上摆着一盘橘子（有橘子≠吃过） */
  orangeplate:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<ellipse cx="60" cy="76" rx="42" ry="14" fill="#FFF9EE" stroke="' + INK + '" stroke-width="3"/>' +
    '<circle cx="44" cy="62" r="13" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M44 49 q1 -7 6 -8" stroke="#5B8C4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<ellipse cx="44" cy="53" rx="5" ry="2.6" fill="#5B8C4A"/>' +
    '<circle cx="64" cy="66" r="12" fill="#F5A24B" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M64 54 q1 -6 5 -7" stroke="#5B8C4A" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="56" cy="54" r="11" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4" opacity=".95"/>' +
    '<ellipse cx="52" cy="50" rx="4" ry="2" fill="#5B8C4A" transform="rotate(-20 52 50)"/>' +
    '<path d="M38 60 q6 4 12 2 M58 70 q6 3 12 0" stroke="#E8975A" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".7"/>',
  /* weak：纸巾抽出来好几张（吃水果常抽但非橘子特有） */
  napkins:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="34" y="52" width="52" height="34" rx="4" fill="#FFF6E3" stroke="' + INK + '" stroke-width="3"/>' +
    '<ellipse cx="60" cy="52" rx="26" ry="6" fill="#E8DCC8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<ellipse cx="60" cy="50" rx="10" ry="3" fill="#D8C9B4" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M40 64 h40 M40 74 h34" stroke="#E8DCC8" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M62 48 q4 -20 10 -24 l6 8 l-4 4 l4 4 l-6 10 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"/>' +
    '<path d="M50 46 q-2 -16 4 -22 l6 6 l-4 4 l5 4 l-7 10 Z" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.2" stroke-linejoin="round" opacity=".9"/>' +
    '<path d="M70 26 q4 -2 8 0 M56 28 q3 -2 6 0" stroke="' + INK + '" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>',
  /* weak：剪刀摆在小台上（有工具≠刚剪发） */
  scissors:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="24" y="72" width="72" height="12" rx="4" fill="#D2A87A" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<circle cx="40" cy="62" r="9" fill="none" stroke="#E8483C" stroke-width="4"/>' +
    '<circle cx="62" cy="62" r="9" fill="none" stroke="#E8483C" stroke-width="4"/>' +
    '<path d="M47 55 L84 34 M55 55 L84 34" stroke="#B8BFC9" stroke-width="4.4" stroke-linecap="round"/>' +
    '<path d="M47 69 L88 40" stroke="#B8BFC9" stroke-width="3" stroke-linecap="round" opacity=".55"/>' +
    '<circle cx="84" cy="34" r="3.4" fill="' + INK + '"/>' +
    '<path d="M34 56 q4 4 2 9 M68 56 q-4 4 -2 9" stroke="#C04038" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>',
  /* weak：理发转椅摆在镜子前（理发店常设≠刚剪） */
  barberchair:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<rect x="14" y="18" width="92" height="70" rx="4" fill="#DCEAF8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M22 30 h76 M22 46 h76 M22 62 h76 M22 78 h76" stroke="#BFD8F0" stroke-width="2.4"/>' +
    '<path d="M30 88 h60 l-4 8 h-52 Z" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M46 58 h28 l4 26 q-18 6 -36 0 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M46 64 q14 6 28 0" stroke="#FFF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M56 84 v14 M64 84 v14" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M40 98 h40" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M44 70 q10 4 20 0 M46 78 q8 3 16 0" stroke="#C04038" stroke-width="2" fill="none" stroke-linecap="round"/>',
  /* weak：喷壶立在花盆边（有工具≠刚浇） */
  wateringcan:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M50 46 q-8 2 -8 12 v28 q0 6 6 6 h24 q6 0 6 -6 v-28 q0 -10 -8 -12 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="60" cy="50" rx="12" ry="4" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M78 58 l16 -8 v10 l-16 6 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M94 50 q10 -4 8 6 q-2 8 -8 2" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M44 52 l-14 -6" stroke="#7FA8D4" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M50 66 h20 M50 76 h16" stroke="#5B7BAE" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M54 42 q6 -12 12 -14" stroke="#5B8C4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  /* weak：花开得正艳（花健康≠刚浇水） */
  blooming:
    '<rect x="0" y="0" width="120" height="120" fill="#DFF0DC"/>' +
    '<path d="M60 100 q-2 -34 -8 -44 M60 100 q2 -36 8 -46 M60 100 v-50" stroke="#5B8C4A" stroke-width="3.4" fill="none" stroke-linecap="round"/>' +
    '<circle cx="60" cy="38" r="12" fill="#E88FB0" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="60" cy="38" r="5" fill="#F5C445"/>' +
    '<ellipse cx="42" cy="56" rx="10" ry="5.6" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.4" transform="rotate(-24 42 56)"/>' +
    '<ellipse cx="78" cy="54" rx="10" ry="5.6" fill="#F2B8C6" stroke="' + INK + '" stroke-width="2.4" transform="rotate(24 78 54)"/>' +
    '<ellipse cx="44" cy="72" rx="9" ry="5" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(-36 44 72)"/>' +
    '<ellipse cx="76" cy="72" rx="9" ry="5" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(36 76 72)"/>' +
    '<path d="M20 44 l6 -6 M100 42 l-6 -6" stroke="#E88FB0" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M30 100 h60" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  /* weak：房门敞开通着风（通风≠刚拖地） */
  dooropen:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M10 12 v96 h56 v-96 Z" fill="#E8DCC8" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M66 18 q38 -6 38 30 v54 q-38 8 -38 -8 Z" fill="#D2A87A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="76" y="36" width="18" height="26" rx="2" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="94" cy="66" r="3.4" fill="' + INK + '"/>' +
    '<path d="M14 16 h48 M14 104 h48" stroke="#B8A88F" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M110 40 q6 14 0 26 M104 34 q8 18 2 34" stroke="#8A9BAE" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/>' +
    '<path d="M10 108 h100" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  /* weak：拖鞋整整齐齐摆成排（居家整洁≠刚拖） */
  slippers:
    '<path d="M8 92 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M18 62 q0 -12 16 -12 q16 0 16 12 v18 q0 8 -16 8 q-16 0 -16 -8 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M20 70 q14 6 28 0" stroke="#C9784A" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M70 62 q0 -12 16 -12 q16 0 16 12 v18 q0 8 -16 8 q-16 0 -16 -8 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<path d="M72 70 q14 6 28 0" stroke="#C9784A" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 66 q8 4 16 0 M78 66 q8 4 16 0" stroke="#FFF" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<path d="M14 88 h34 M66 88 h34" stroke="#D8C9B4" stroke-width="2.2" stroke-linecap="round" opacity=".6"/>',
  /* weak：牙刷牙膏插在杯子里（摆放整齐≠刚用湿） */
  toothlay:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M40 54 h36 l-4 38 q-1 4 -5 4 h-18 q-4 0 -5 -4 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<ellipse cx="58" cy="54" rx="18" ry="4.4" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M50 50 l4 -26" stroke="#FFF" stroke-width="7" stroke-linecap="round"/>' +
    '<path d="M50 50 l4 -26" stroke="' + INK + '" stroke-width="1.4" stroke-linecap="round" opacity=".35"/>' +
    '<rect x="50" y="20" width="9" height="7" rx="2" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M62 52 l10 -20" stroke="#FFF" stroke-width="8" stroke-linecap="round"/>' +
    '<path d="M70 34 q4 -2 7 1" stroke="#7FB3E0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M66 92 q0 4 4 4 q0 -4 -4 -4 Z" fill="#8A93A3" opacity=".4"/>',
  /* weak：镜子上溅了小水点（有水珠但来源不明） */
  mirrorspots:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M22 14 h76 v76 h-76 Z" fill="#DCEAF8" stroke="' + INK + '" stroke-width="3.4" stroke-linejoin="round"/>' +
    '<path d="M34 28 l52 48 M52 24 l34 32 M28 52 l30 34" stroke="#FFF" stroke-width="5" stroke-linecap="round" opacity=".55"/>' +
    '<circle cx="40" cy="40" r="4" fill="none" stroke="#7FB3E0" stroke-width="2.2"/>' +
    '<circle cx="66" cy="34" r="3" fill="none" stroke="#7FB3E0" stroke-width="2"/>' +
    '<circle cx="84" cy="52" r="4.4" fill="none" stroke="#7FB3E0" stroke-width="2.2"/>' +
    '<circle cx="50" cy="62" r="2.6" fill="none" stroke="#7FB3E0" stroke-width="1.8"/>' +
    '<circle cx="74" cy="74" r="3.4" fill="none" stroke="#7FB3E0" stroke-width="2"/>' +
    '<path d="M34 90 h52 M44 96 h32" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',
  /* weak：小鱼都游到水面上（可能在觅食≠刚喂） */
  fishup:
    '<rect x="0" y="0" width="120" height="120" fill="#DCEAF8"/>' +
    '<rect x="0" y="30" width="120" height="90" fill="#A8CBE8"/>' +
    '<path d="M0 30 q15 -6 30 0 q15 6 30 0 q15 -6 30 0 q15 6 30 0" stroke="' + INK + '" stroke-width="3" fill="none"/>' +
    '<ellipse cx="34" cy="44" rx="13" ry="7" fill="#E8975A" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M21 44 l-8 -6 v12 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="27" cy="42" r="1.8" fill="' + INK + '"/>' +
    '<ellipse cx="76" cy="42" rx="11" ry="6" fill="#F5C445" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M65 42 l-7 -5 v10 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="2" stroke-linejoin="round"/>' +
    '<circle cx="70" cy="40" r="1.6" fill="' + INK + '"/>' +
    '<ellipse cx="56" cy="56" rx="9" ry="5" fill="#8FB8E0" stroke="' + INK + '" stroke-width="2.2" opacity=".9"/>' +
    '<path d="M30 38 q2 -3 5 -3 M72 36 q2 -2 4 -2" stroke="#FFF" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M10 84 q10 6 22 0 M64 88 q12 6 24 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".5"/>',
  /* weak：鱼缸的小灯亮着（灯亮≠喂食） */
  tanklight:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M24 38 h72 v48 q0 6 -6 6 h-60 q-6 0 -6 -6 Z" fill="#BFDDF2" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 38 q36 -12 72 0" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="48" y="14" width="24" height="12" rx="3" fill="#5B7BAE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="54" y="26" width="12" height="12" fill="#F8E9B0" stroke="#E8A23C" stroke-width="2.2"/>' +
    '<path d="M60 38 v46" stroke="#F8E9B0" stroke-width="6" opacity=".4"/>' +
    '<ellipse cx="44" cy="66" rx="11" ry="6" fill="#E8975A" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<path d="M33 66 l-7 -5 v10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="1.8" stroke-linejoin="round"/>' +
    '<circle cx="38" cy="64" r="1.6" fill="' + INK + '"/>' +
    '<path d="M78 70 q8 4 14 -2" stroke="#5B8C4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="30" cy="46" r="2" fill="#FFF" opacity=".8"/><circle cx="88" cy="50" r="2.4" fill="#FFF" opacity=".8"/>',
  /* weak：积木箱摆在墙边（收纳状态≠刚搭） */
  blockbox:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M30 14 h72 v80 h-72 Z" fill="#E8DCC8" stroke="' + INK + '" stroke-width="2.8" opacity=".35"/>' +
    '<path d="M24 50 h72 v40 q0 6 -6 6 h-60 q-6 0 -6 -6 Z" fill="#9BC178" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 50 q36 -14 72 0" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2.8" stroke-linejoin="round"/>' +
    '<rect x="52" y="44" width="16" height="8" rx="3" fill="' + INK + '"/>' +
    '<path d="M32 62 h56 M32 74 h44" stroke="#5B8C4A" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>' +
    '<path d="M14 96 h92" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="88" y="30" width="20" height="14" rx="3" fill="#F2DDC0" stroke="' + INK + '" stroke-width="2.2"/>' +
    '<circle cx="20" cy="30" r="5" fill="#F5C445" stroke="' + INK + '" stroke-width="2"/>',
  /* weak：游戏垫铺在地上（垫子在≠刚玩） */
  playmat:
    '<path d="M8 92 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M20 60 q40 -18 80 0 l-6 26 q-34 12 -68 0 Z" fill="#8FB8E0" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M20 60 q40 -18 80 0" stroke="#5B7BAE" stroke-width="2.4" fill="none"/>' +
    '<path d="M34 72 q26 -8 52 0" stroke="#FFF" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M30 82 h48" stroke="#FFF" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>' +
    '<circle cx="40" cy="66" r="4" fill="#F5C445" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="62" cy="62" r="4" fill="#E8483C" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<circle cx="84" cy="66" r="4" fill="#8FBF7F" stroke="' + INK + '" stroke-width="1.8"/>' +
    '<path d="M14 88 q10 4 20 0 M86 88 q10 4 20 0" stroke="#D8C9B4" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".6"/>',
  /* weak：桌上摆着小杯子（有杯子≠喝牛奶） */
  milkcup:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M42 50 h36 l-4 40 q-1 6 -6 6 h-16 q-5 0 -6 -6 Z" fill="#FFF" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round" opacity=".92"/>' +
    '<ellipse cx="60" cy="50" rx="18" ry="4.6" fill="#FFFDF6" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M78 56 q12 2 10 10 q-2 8 -12 6" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M46 62 q12 4 24 0 M47 74 q10 3 20 0" stroke="#E8DCC8" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>' +
    '<circle cx="54" cy="40" r="2.6" fill="none" stroke="#BFD8F0" stroke-width="1.8"/>' +
    '<circle cx="66" cy="34" r="2" fill="none" stroke="#BFD8F0" stroke-width="1.6"/>' +
    '<path d="M24 86 h16 M80 88 h16" stroke="#D8C9B4" stroke-width="2.2" stroke-linecap="round" opacity=".5"/>',
  /* weak：书包拉链敞开着（拿过东西≠写作业） */
  bagopen:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M30 44 q0 -8 10 -8 h40 q10 0 10 8 v40 q0 8 -8 8 h-44 q-8 0 -8 -8 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 36 q-4 -12 6 -14 q8 -2 10 8 M66 30 q0 -10 8 -8 q8 2 6 12" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M32 48 q28 -12 56 0 l-4 10 q-24 -10 -48 0 Z" fill="#C9784A" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M36 52 l48 4" stroke="#B8BFC9" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M36 52 l-6 -3 M84 56 l6 3" stroke="#B8BFC9" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="44" y="64" width="30" height="20" rx="3" fill="#FFF6E3" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M48 70 h22 M48 76 h16" stroke="#D8C9B4" stroke-width="2" stroke-linecap="round"/>' +
    '<path d="M36 84 q24 8 48 0" stroke="#C9784A" stroke-width="2.4" fill="none" stroke-linecap="round"/>',
  /* weak：文具盒开着盖（开着≠写作业） */
  pencilcase:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M22 56 h76 v26 q0 6 -6 6 h-64 q-6 0 -6 -6 Z" fill="#5B7BAE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M22 56 l10 -16 h76 l-10 16 Z" fill="#7FA8D4" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M108 40 l-10 16" stroke="none"/>' +
    '<path d="M98 56 q-38 4 -76 0" stroke="#FFF" stroke-width="2" fill="none" opacity=".5"/>' +
    '<path d="M34 62 l52 -4" stroke="#E8483C" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M36 68 l40 -3" stroke="#F5C445" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M38 74 l30 -2" stroke="#8FBF7F" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="26" y="60" width="6" height="14" rx="2" fill="#C04038" stroke="' + INK + '" stroke-width="1.6"/>',
  /* weak：工具箱开着盖（备着工具≠刚修） */
  toolbox:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M24 56 h72 v34 h-72 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M24 56 q-8 -18 18 -14 q4 0 6 6 h24 q2 -6 6 -6 q26 -4 18 14 Z" fill="#C9784A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="52" y="38" width="16" height="10" rx="3" fill="' + INK + '"/>' +
    '<path d="M24 66 h72" stroke="#C9784A" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M32 74 l30 -4" stroke="#B8BFC9" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M70 76 l20 -2" stroke="#E8483C" stroke-width="3" stroke-linecap="round"/>' +
    '<circle cx="44" cy="80" r="3" fill="#B8BFC9" stroke="' + INK + '" stroke-width="1.6"/>' +
    '<path d="M28 52 h64" stroke="' + INK + '" stroke-width="2" stroke-linecap="round" opacity=".4"/>',
  /* weak：打气筒立在旁边（有气筒≠刚修） */
  pump:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="46" y="40" width="20" height="46" rx="6" fill="#B8BFC9" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M56 40 v-16" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M56 24 h22 l-4 6 h-18 Z" fill="#E8483C" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M50 86 l-8 8 M62 86 l8 8" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M66 58 q16 4 18 22" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M84 80 q6 0 6 -6 q0 -4 -5 -4" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
    '<path d="M52 50 h8 M52 58 h8" stroke="#8A93A3" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
    '<circle cx="84" cy="44" r="2.4" fill="none" stroke="#8A93A3" stroke-width="1.8"/>',
  /* weak：沙滩玩具箱开着盖（玩具在≠刚玩沙） */
  toybox:
    '<path d="M10 96 h100" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M26 52 h68 v36 h-68 Z" fill="#F5C445" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M26 52 l12 -16 h68 l-12 16 Z" fill="#E8A23C" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="62" y="34" width="14" height="9" rx="3" fill="' + INK + '"/>' +
    '<path d="M36 60 l22 -3" stroke="#E8975A" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M64 64 l18 -2" stroke="#7FA8D4" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="42" cy="76" r="4.4" fill="#E8483C" stroke="' + INK + '" stroke-width="2"/>' +
    '<circle cx="56" cy="78" r="3.6" fill="#8FBF7F" stroke="' + INK + '" stroke-width="2"/>' +
    '<path d="M30 84 h60" stroke="#E8A23C" stroke-width="2" stroke-linecap="round" opacity=".5"/>',
  /* weak：裤脚上蹭了土（土≠沙坑的沙） */
  dustypants:
    '<rect x="0" y="0" width="120" height="120" fill="#FBF0DC"/>' +
    '<path d="M38 16 h44 l6 58 q0 6 -6 6 h-12 q-6 0 -6 -6 l-2 -34 l-2 34 q0 6 -6 6 h-12 q-6 0 -6 -6 Z" fill="#5B7BAE" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M42 24 q18 6 36 0" stroke="#FFF" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M38 66 h18 M64 66 h18" stroke="#46709E" stroke-width="2.4" stroke-linecap="round"/>' +
    '<ellipse cx="40" cy="76" rx="9" ry="5" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.2" transform="rotate(-8 40 76)"/>' +
    '<ellipse cx="80" cy="76" rx="9" ry="5" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.2" transform="rotate(8 80 76)"/>' +
    '<circle cx="36" cy="84" r="2.2" fill="#A8784C"/><circle cx="44" cy="88" r="1.8" fill="#A8784C"/><circle cx="76" cy="86" r="2" fill="#A8784C"/><circle cx="84" cy="88" r="2.2" fill="#A8784C"/>' +
    '<path d="M30 96 h60" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>',

  /* ===== r17 无关干扰场景（none=与结论无关系的中性场景） ===== */
  /* none：公园长椅空着 */
  bench:
    '<path d="M8 94 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="16" y="52" width="88" height="8" rx="3" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<rect x="16" y="66" width="88" height="8" rx="3" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M22 74 v20 M98 74 v20" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<path d="M28 40 v12 M92 40 v12" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<rect x="24" y="34" width="72" height="8" rx="3" fill="#B98A5C" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<path d="M40 42 v24 M60 42 v24 M80 42 v24" stroke="#8A5C3C" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>' +
    '<path d="M14 94 q12 4 26 0 M80 94 q12 4 26 0" stroke="#9BC178" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  /* none：路口的红绿灯 */
  trafficlight:
    '<rect x="0" y="0" width="120" height="120" fill="' + SKY + '"/>' +
    '<path d="M8 100 h104" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/>' +
    '<rect x="54" y="30" width="12" height="70" fill="#8A7B6C" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<rect x="44" y="12" width="32" height="60" rx="7" fill="' + INK + '"/>' +
    '<circle cx="60" cy="28" r="7.5" fill="#E8483C" stroke="#FFF" stroke-width="2"/>' +
    '<circle cx="60" cy="44" r="7.5" fill="#F5C445" opacity=".45" stroke="#FFF" stroke-width="2"/>' +
    '<circle cx="60" cy="60" r="7.5" fill="#8FBF7F" opacity=".35" stroke="#FFF" stroke-width="2"/>' +
    '<path d="M28 100 v-14 M92 100 v-14" stroke="#FFF" stroke-width="4" stroke-linecap="round" opacity=".8"/>' +
    '<path d="M28 82 h-8 M28 88 h-8 M92 82 h8 M92 88 h8" stroke="#FFF" stroke-width="3" stroke-linecap="round" opacity=".7"/>',
  /* none：草地上有大石头 */
  stone:
    '<rect x="0" y="0" width="120" height="120" fill="#DFF0DC"/>' +
    '<path d="M6 94 q57 -18 108 0 l-2 12 q-52 12 -104 0 Z" fill="#9BC178" stroke="#5B8C4A" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M34 84 q-10 -30 14 -36 q26 -8 36 12 q8 16 -6 24 Z" fill="#B8BFC9" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M40 60 q10 -10 26 -6 M46 72 q14 4 24 -2" stroke="#8A93A3" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/>' +
    '<ellipse cx="44" cy="54" rx="7" ry="4" fill="#FFF" opacity=".5" transform="rotate(-18 44 54)"/>' +
    '<path d="M18 88 q8 -3 16 0 M88 86 q8 -3 16 0" stroke="#5B8C4A" stroke-width="2.6" fill="none" stroke-linecap="round"/>',
  /* none：叶子上停着蜗牛 */
  snail:
    '<rect x="0" y="0" width="120" height="120" fill="#DFF0DC"/>' +
    '<path d="M8 94 q56 -20 104 0 l-2 10 q-50 12 -100 0 Z" fill="#9BC178" stroke="#5B8C4A" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<ellipse cx="66" cy="66" rx="20" ry="16" fill="#D2A87A" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M66 50 a16 16 0 0 1 14 16 a10 10 0 0 1 -8 -8 a6 6 0 0 0 -6 -6" fill="none" stroke="' + INK + '" stroke-width="2.4"/>' +
    '<path d="M46 76 q-8 -2 -10 -14" stroke="#C89A6B" stroke-width="5" fill="none" stroke-linecap="round"/>' +
    '<circle cx="37" cy="60" r="2" fill="' + INK + '"/>' +
    '<path d="M34 58 l-5 -6 M39 58 l3 -7" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>' +
    '<ellipse cx="30" cy="82" rx="14" ry="6" fill="#8FBF7F" stroke="#5B8C4A" stroke-width="2.2" transform="rotate(-10 30 82)"/>' +
    '<path d="M28 78 q2 -4 6 -4" stroke="#5B8C4A" stroke-width="1.8" fill="none" stroke-linecap="round"/>'
});

/* 证据 SVG 工厂：evSvg(id, size)——size 缺省 76（证据卡图尺寸）；根组 g[data-img]=id
   （契约 M 帧内容锚：渲染即引擎对账依据） */
function evSvg(id, size) {
  const s = size ? ' width="' + size + '" height="' + size + '"' : ' width="76" height="76"';
  return '<svg viewBox="0 0 120 120"' + s + ' xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
    '<g data-img="' + id + '">' + (EV_SVG[id] || '') + '</g></svg>';
}

/* ---------- 图标（内嵌 SVG 描线风，主色 INK 暖棕） ---------- */
const ICONS = {
  /* logo：暖底圆牌 + 放大镜（小侦探找证据主题锚） */
  logo: '<svg viewBox="0 0 44 44" width="28" height="28" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<rect x="3.5" y="3.5" width="37" height="37" rx="11" fill="#FFF9EE" stroke="' + INK + '" stroke-width="2.6"/>' +
    '<circle cx="20" cy="19" r="9.5" fill="#DCEAF8" stroke="' + INK + '" stroke-width="2.8"/>' +
    '<path d="M17 14 a6 6 0 0 1 6 -1" stroke="#FFF" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
    '<path d="M27 26 l8 8" stroke="' + INK + '" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M14 30 h16" stroke="#E8483C" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="20" cy="19" r="3" fill="#F5C445"/></svg>',
  /* 小侦探放大镜：礼帽+镜片（结论卡左侧图标） */
  detective: '<svg viewBox="0 0 56 64" width="40" height="46" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M16 10 q12 -6 24 0 l2 10 h-28 Z" fill="#5B7BAE" stroke="' + INK + '" stroke-width="2.6" stroke-linejoin="round"/>' +
    '<path d="M8 20 h40" stroke="' + INK + '" stroke-width="3.4" stroke-linecap="round"/>' +
    '<circle cx="30" cy="40" r="13" fill="#DCEAF8" stroke="' + INK + '" stroke-width="3"/>' +
    '<path d="M24 34 a8 8 0 0 1 7 -3" stroke="#FFF" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<path d="M39 50 l9 9" stroke="' + INK + '" stroke-width="4.4" stroke-linecap="round"/>' +
    '<circle cx="26" cy="44" r="3.4" fill="#F5C445"/></svg>',
  hear: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M11 25 h10 l13 -11 v36 l-13 -11 h-10 Z" fill="#E8975A" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M43 23 q6 9 0 18 M50 16 q11 16 0 32" stroke="' + INK + '" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>',
  replay: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none">' +
    '<path d="M46 30 a17 17 0 1 0 -3 13" stroke="#8A9BAE" stroke-width="6" stroke-linecap="round" fill="none"/>' +
    '<path d="M40 12 L48 30 L30 30 Z" fill="#8A9BAE"/></svg>',
  finger: '<svg viewBox="0 0 64 76" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M28 8 a8 8 0 0 1 16 0 v30 l8 4 a10 10 0 0 1 6 9 v10 a12 12 0 0 1 -12 12 h-12 a14 14 0 0 1 -14 -14 V30 Z" fill="#FFF" opacity=".93" stroke="#E8DCC8" stroke-width="2"/>' +
    '<ellipse cx="35" cy="44" rx="10" ry="6" fill="#F2B8C6" opacity=".35"/></svg>',
  /* check：绿底白勾（findall 已勾角标——照 senses r11 勾选角标风） */
  check: '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="26" fill="#5B9C4A" stroke="#FFF" stroke-width="5"/>' +
    '<path d="M20 33 l8 9 l16 -19" fill="none" stroke="#FFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
