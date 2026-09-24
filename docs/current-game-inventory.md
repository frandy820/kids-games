# 当前游戏清单（current-game-inventory）

> 生成：2026-09-25 阶段0/1 实测。主入口 121 卡 ↔ 目录 121 款双向对账：无缺失、无孤儿。HEAD=289cf47（main，线上 Pages 同 commit；线上抽样 7 款 md5 CRLF 归一后与本地一致）。
> 不采信旧报告款数/评分/年龄划分。卡面与页面均无年龄标注 → 「页面未标」。
> L1=开页（截图+console+一次真实点击）；verify=干净档独立 context 复测结果（L2 证据）。

| ID | 名称 | 玩法副题 | 路径 | 源码 | KB | L1 | verify 干净复测 | 首次点击 |
|---|---|---|---|---|---|---|---|---|
| G001 | 管道小兔子 | 转水管浇花花 | batch1/pipe-rabbit/index.html | — | 323 | ✓ | PASS 25/25 | (btn) |
| G002 | 数字小卖部 | 数一数装篮子 | batch1/shop-math/index.html | — | 2415 | ✓ | PASS 12/12 | (btn) |
| G003 | 厨房节奏 | 跟着音乐切切切 | batch1/kitchen-rhythm/index.html | _src | 1111 | ✓ | PASS | CLICK_ERR |
| G004 | 翻翻找朋友 | 记一记配对对 | batch2/memory/index.html | _src | 384 | ✓ | PASS 16/16 | (btn) |
| G005 | 七巧板拼图 | 转一转拼图形 | batch2/tangram/index.html | _src | 258 | ✓ | PASS | (btn) |
| G006 | 小小涂色本 | 涂颜色画图画 | batch2/color/index.html | _src | 434 | ✓ | PASS | (btn) |
| G007 | 数数小鸡 | 点一点数一数 | batch5/countchick/index.html | _src | 437 | ✓ | PASS 53/53 | CLICK_ERR |
| G008 | 找不同 | 两幅图比一比 | batch5/spotdiff/index.html | _src | 277 | ✓ | PASS 46/46 | (btn) |
| G009 | 连线朋友 | 小动物找晚餐 | batch5/connect/index.html | _src | 2084 | ✓ | PASS 13/13 | (btn) |
| G010 | 钓鱼颜色 | 听一听钓一钓 | batch7/fishcolor/index.html | _src | 758 | ✓ | PASS 52/52 | (btn) |
| G011 | 水果切切 | 一半和一半一样多 | batch7/fruitsplit/index.html | _src | 872 | ✓ | PASS 49/49 | (btn) |
| G012 | 跳格子数数 | 顺着数倒着数 | batch7/hopscotch/index.html | _src | 566 | ✓ | PASS 56/56 | 1 |
| G013 | 影子配对 | 看一看找影子 | batch11/shadow/index.html | _src | 720 | ✓ | PASS 49/49 | 🍊
🌞 |
| G014 | 形状分家 | 送图形回自己的家 | batch11/shapeshome/index.html | _src | 5235 | ✓ | PASS 53/53 | (btn) |
| G015 | 大小排排队 | 从大到小排一排 | batch11/sortsize/index.html | _src | 803 | ✓ | PASS 52/52 | 🐘
🐘
🐜
🐜 |
| G016 | 喂小兔 | 数数拿几根 | batch21/feed/index.html | _src | 1018 | ✓ | PASS 74/74 | 6 |
| G017 | 泡泡数数 | 点破数到够 | batch21/bubble/index.html | _src | 866 | ✓ | PASS 53/53 | CLICK_ERR |
| G018 | 过河石桥 | 规律踩石头 | batch21/bridge/index.html | _src | 567 | ✓ | PASS 70/70 | (btn) |
| G019 | 隐藏朋友 | 找出藏着的动物 | batch22/hidden/index.html | _src | 806 | ✓ | PASS 51/51 | (btn) |
| G020 | 滑块拼图 | 滑方块拼照片 | batch22/slide/index.html | _src | 362 | ✓ | PASS 50/50 | (btn) |
| G021 | 颜色魔法 | 调出新的颜色 | batch22/colormix/index.html | _src | 610 | ✓ | PASS 55/55 | (btn) |
| G022 | 天气穿衣 |  | batch23/weather/index.html | _src | 1717 | ✓ | PASS 54/54 | (btn) |
| G023 | 分糖果 |  | batch23/share/index.html | _src | 1573 | ✓ | PASS 56/56 | 2
2 |
| G024 | 碰碰琴 |  | batch23/piano/index.html | _src | 383 | ✓ | PASS 56/56 | (btn) |
| G025 | 形状屋顶 |  | batch24/shaperoof/index.html | _src | 408 | ✓ | PASS 56/56 | (btn) |
| G026 | 描红数字 |  | batch24/trace/index.html | _src | 596 | ✓ | PASS | (btn) |
| G027 | 贴纸装扮 |  | batch24/dressup/index.html | _src | 838 | ✓ | PASS | (btn) |
| G028 | 动物宝宝找妈妈 | 小蝌蚪的妈妈是谁 | batch30/babylove/index.html | _src | 932 | ✓ | PASS 64/64 | 它的妈妈是谁呀 |
| G029 | 晚安故事序 | 先刷牙还是先洗脸 | batch30/storybed/index.html | _src | 827 | ✓ | PASS 62/62 | 睡觉
，先做什么呀？ |
| G030 | 迷宫探险 | 点格子走迷宫 | batch30/maze/index.html | _src | 418 | ✓ | PASS | 帮小兔子吃到萝卜 |
| G031 | 动物三餐菜单 | 小兔子爱吃什么 | batch31/animalmenu/index.html | _src | 894 | ✓ | PASS 59/59 | 它爱吃什么呀 |
| G032 | 五感小侦探 | 用什么来看闻听 | batch32/senses/index.html | _src | 837 | ✓ | PASS 59/59 | 用什么呢 |
| G033 | 听音数一数 | 鼓敲几下数一数 | batch33/soundcount/index.html | _src | 520 | ✓ | PASS 61/61 | 敲了几下呀 |
| G034 | 藏猫猫摄像头 | 看住杯子找到它 | batch34/hidecup/index.html | _src | 435 | ✓ | PASS 16/16 | (btn) |
| G035 | 轮流浇花 | 轮到你再浇一浇 | batch35/turntake/index.html | _src | 427 | ✓ | 挂起待人工 | (btn) |
| G036 | 安慰选择 | 朋友难过帮一帮 | batch36/comfort/index.html | _src | 895 | ✓ | PASS 14/14 | 拿纸巾 |
| G037 | 感谢的话 | 朋友帮你怎么办 | batch37/thanks/index.html | _src | 888 | ✓ | PASS 17/17 | 鞠躬说谢谢 |
| G038 | 规律画画 | 花边怎么接着盖 | batch38/stamp/index.html | _src | 466 | ✓ | PASS 12/12 | (btn) |
| G039 | 贺卡工坊 | 做张卡片送朋友 | batch39/crd/index.html | _src | 974 | ✓ | PASS 14/14 | (btn) |
| G040 | 昆虫还是蜘蛛 | 数数腿认一认 | batch40/ins/index.html | _src | 765 | ✓ | PASS 15/15 | (btn) |
| G041 | 拼音小火车 | 声母韵母碰一碰 | batch3/pinyin/index.html | _src | 1633 | ✓ | PASS | (btn) |
| G042 | 算术小勇士 | 20以内加减爬坡 | batch3/math/index.html | _src | 239 | ✓ | PASS 47/47 | 0 |
| G043 | 规律侦探 | 猜猜下一个是谁 | batch3/pattern/index.html | _src | 246 | ✓ | PASS 45/45 | (btn) |
| G044 | 识字积木 | 部件拼字认一认 | batch6/words/index.html | _src | 1281 | ✓ | PASS 47/47 | 明
ming |
| G045 | 比较大小 | 大于小于等于 | batch6/compare/index.html | _src | 627 | ✓ | PASS 47/47 | 1 |
| G046 | 减法捕虫 | 飞走几只剩几只 | batch6/subbug/index.html | _src | 744 | ✓ | PASS 47/47 | (btn) |
| G047 | 数的邻居 | 比它多一少一是几 | batch8/neighbors/index.html | _src | 994 | ✓ | PASS 47/47 | 1
? |
| G048 | 象形字 | 古画变字认一认 | batch8/picto/index.html | _src | 1099 | ✓ | PASS 50/50 | (btn) |
| G049 | 英语单词 | 小猫就是 cat | batch8/worden/index.html | _src | 1021 | ✓ | PASS 51/51 | CLICK_ERR |
| G050 | 方位排排队 | 谁在最左边呀 | batch9/whereistand/index.html | _src | 1370 | ✓ | PASS 48/48 | (btn) |
| G051 | 对称贴贴画 | 镜子里的样子 | batch9/mirror/index.html | _src | 332 | ✓ | PASS 51/51 | (btn) |
| G052 | 记忆亮亮格 | 哪里亮过点哪里 | batch9/memgrid/index.html | _src | 300 | ✓ | PASS 51/51 | (btn) |
| G053 | 算术接龙 | 小火车接数字 | batch10/chainsum/index.html | _src | 528 | ✓ | PASS 47/47 | 4
+
1
=
? |
| G054 | 听指令敲小鼓 | 跟着敲一敲 | batch10/simon/index.html | _src | 289 | ✓ | PASS 51/51 | (btn) |
| G055 | 好习惯排序 | 先做什么再做什么 | batch10/habit/index.html | _src | 504 | ✓ | PASS 49/49 | 🎽
穿衣
，先做什么呀？ |
| G056 | 故事排序 | 先再后排一排 | batch25/story3/index.html | _src | 2731 | ✓ | PASS | 1
2
3 |
| G057 | 情绪脸谱 | 选对小兔心情 | batch25/emo/index.html | _src | 1747 | ✓ | PASS 55/55 | (btn) |
| G058 | 动物家园 | 送小动物回家 | batch25/habitat/index.html | _src | 2782 | ✓ | PASS | 小鱼的家在哪里？ |
| G059 | 交通标志 | 认路上的标志 | batch26/sign/index.html | _src | 1076 | ✓ | PASS 56/56 | 这个标志是什么意思？ |
| G060 | 季节衣橱 | 按季节挑衣服 | batch26/season/index.html | _src | 1294 | ✓ | PASS 56/56 | 很冷的天去上学，穿什么 |
| G061 | 日历小星 | 星期月份排队 | batch26/calendar/index.html | _src | 1517 | ✓ | PASS 57/57 | 星期三的后面是星期几？ |
| G062 | 测量小尺 | 用回形针量一量 | batch27/ruler/index.html | _src | 1107 | ✓ | PASS 55/55 | 铅笔有几根回形针长？ |
| G063 | 硬币认钱 | 认认一元五角 | batch27/coin/index.html | _src | 1423 | ✓ | PASS 57/57 | 1
元
这是多少钱？ |
| G064 | 音阶小鸟 | 听听谁在唱歌 | batch27/notebird/index.html | _src | 1039 | ✓ | PASS 59/59 | 是哪只小鸟在唱？ |
| G065 | 指令小兔 | 点箭头找萝卜 | batch28/coder/index.html | _src | 628 | ✓ | PASS 56/56 | 帮小兔子走到萝卜 |
| G066 | 图形计数 | 一个一个指着数 | batch28/shapecount/index.html | _src | 937 | ✓ | PASS 59/59 | 圆形有几个？ |
| G067 | 数量守恒 | 拉开间距数不变 | batch28/conserve/index.html | _src | 1123 | ✓ | PASS 55/55 | 左
右
哪一边多？ |
| G068 | 身体英语 | 听英语点身体 | batch29/bodyen/index.html | _src | 798 | ✓ | PASS 58/58 | 听一听，点出它的英语？
听 |
| G069 | 古诗跟读 | 听一句找下一句 | batch29/poem/index.html | _src | 1261 | ✓ | PASS 59/59 | 咏鹅
上一句
鹅，鹅，鹅 |
| G070 | 单词拼图 | 看图拼小单词 | batch29/wordpuz/index.html | _src | 607 | ✓ | PASS 59/59 | 看图拼单词
猫 |
| G071 | 如果下雨 | 下雨要带小伞呀 | batch31/iftrain/index.html | _src | 676 | ✓ | PASS 58/58 | 下雨
要带什么呀 |
| G072 | 机器人学跳舞 | 看完舞步拼一拼 | batch32/robotdance/index.html | _src | 529 | ✓ | 挂起待人工 | (btn) |
| G073 | 兔子在树哪里 | 前面后面说清楚 | batch33/position/index.html | _src | 1124 | ✓ | PASS 61/61 | (btn) |
| G074 | 句子拼拼乐 | 词卡排队拼句子 | batch34/sentorder/index.html | _src | 2297 | ✓ | PASS 13/13 | 小兔子吃萝卜 |
| G075 | 凑十小铺 | 两张卡片凑一凑 | batch35/maketen/index.html | _src | 572 | ✓ | PASS 12/12 | (btn) |
| G076 | 快速比大小 | 哪边的圆点多 | batch36/quickcmp/index.html | _src | 619 | ✓ | PASS 13/13 | 左边
右边 |
| G077 | 植树程序 | 按卡种小树 | batch37/plant/index.html | _src | 1158 | ✓ | PASS 12/12 | (btn) |
| G078 | 分类归档小图书 | 这本书住哪里 | batch38/libr/index.html | _src | 510 | ✓ | PASS 12/12 | 动物 |
| G079 | 表情温度计 | 心情有多大呀 | batch39/etm/index.html | _src | 1423 | ✓ | PASS 12/12 | 难过 |
| G080 | 冷静工具箱 | 心里不舒服怎么办 | batch40/cbx/index.html | _src | 1162 | ✓ | PASS 12/12 | 大喊大叫 |
| G081 | 时间小管家 | 认时钟拨长针 | batch4/clock/index.html | _src | 246 | ✓ | PASS 47/47 | 1:00 |
| G082 | 乘法捕鱼 | 数鱼群学口诀 | batch4/times/index.html | _src | 423 | ✓ | PASS 48/48 | 12 |
| G083 | 数独小动物 | 行列不重复 | batch4/sudoku/index.html | _src | 248 | ✓ | PASS | CLICK_ERR |
| G084 | 除法分糖 | 平均分数一数 | batch12/divide/index.html | _src | 485 | ✓ | PASS 48/48 | (btn) |
| G085 | 分数披萨 | 切披萨认分数 | batch12/fraction/index.html | _src | 499 | ✓ | PASS 90/90 | 哪一个是平均分成了2份？ |
| G086 | 竖式小黑板 | 进位退位看得见 | batch12/column/index.html | _src | 452 | ✓ | PASS 53/53 | 1 |
| G087 | 零钱管家 | 凑钱找零学人民币 | batch13/money/index.html | _src | 709 | ✓ | PASS 52/52 | 5
角 |
| G088 | 应用题剧场 | 听故事算应用题 | batch13/wordprob/index.html | _src | 1607 | ✓ | PASS 50/50 | CLICK_ERR |
| G089 | 坐标寻宝 | 行列坐标走格子 | batch13/grid/index.html | _src | 597 | ✓ | PASS 51/51 | 左转 |
| G090 | 空间积木 | 数方块与三视图 | batch14/blocks/index.html | _src | 511 | ✓ | PASS 50/50 | 8 |
| G091 | 乘法对战 | 限时和兔子比赛 | batch14/multibattle/index.html | _src | 422 | ✓ | PASS 51/51 | 15 |
| G092 | 数字侦探 | 猜数学二分推理 | batch14/numberdet/index.html | _src | 415 | ✓ | PASS 48/48 | 1 |
| G093 | 找零收银 | 付钱算找零 | batch15/cashier/index.html | _src | 817 | ✓ | PASS 49/49 | 5
元 |
| G094 | 逻辑三人组 | 听线索推理 | batch15/logicwho/index.html | _src | 596 | ✓ | PASS 48/48 | (btn) |
| G095 | 火柴谜题 | 移一根算式成立 | batch15/matchstick/index.html | _src | 368 | ✓ | PASS | (btn) |
| G096 | 阅读小侦探 | 短文找答案 | batch16/read/index.html | _src | 6436 | ✓ | PASS 48/48 | 小兔子有一只蓝色的风筝，可喜 |
| G097 | 英语拼写 | 听音拼单词 | batch16/spellen/index.html | _src | 3245 | ✓ | PASS 90/90 | (btn) |
| G098 | 成语配对 | 看图猜成语 | batch16/idiom/index.html | _src | 8674 | ✓ | PASS 14/14 | (btn) |
| G099 | 古诗填空 | 名句填字 | batch17/poemfill/index.html | _src | 4579 | ✓ | PASS 49/49 | (btn) |
| G100 | 铺砖面积 | 数格子选砖块 | batch17/area/index.html | _src | 2913 | ✓ | PASS 53/53 | 3
数格子 |
| G101 | 镜像迷宫 | 照镜子补图案 | batch17/mirrormaze/index.html | _src | 350 | ✓ | PASS 50/50 | CLICK_ERR |
| G102 | 循环指令 | 排指令卡编程 | batch18/coder2/index.html | _src | 440 | ✓ | PASS 47/47 | 左转 |
| G103 | 搭高楼 | 堆叠平衡预判 | batch18/stack/index.html | _src | 422 | ✓ | PASS 50/50 | 1 |
| G104 | 弹球角度 | 反弹预判进洞 | batch18/bounce/index.html | _src | 353 | ✓ | PASS 47/47 | 右下 |
| G105 | 密码破译 | 查表解密推理 | batch19/cipher/index.html | _src | 703 | ✓ | PASS 47/47 | ↔
9 |
| G106 | 四子棋 | 连四子胜兔子 | batch19/gomoku4/index.html | _src | 330 | ✓ | PASS 49/49 | (btn) |
| G107 | 数独数字 | 6×6 约束排除 | batch19/sudokunum/index.html | _src | 332 | ✓ | PASS | 1 |
| G108 | 时间计算 | 经过时间与跨周 | batch20/timecalc/index.html | _src | 3623 | ✓ | PASS 51/51 | 8:20 |
| G109 | 记忆双背 | 正背倒背数字 | batch20/memduel/index.html | _src | 688 | ✓ | PASS | 9 |
| G110 | 百科问答 | 常识小达人 | batch20/quiz/index.html | _src | 16896 | ✓ | PASS 51/51 | 动植物探秘
骆驼背上的两个驼 |
| G111 | 图表小读者 | 看图谁多谁少 | batch31/chartread/index.html | _src | 1789 | ✓ | PASS 72/72 | 狗
鱼
猫 |
| G112 | 找证据小侦探 | 找一找能证明吗 | batch32/evidence/index.html | _src | 848 | ✓ | PASS 59/59 | 玩具车放地上 |
| G113 | 机器画师 | 说得清楚画得像 | batch33/robotpaint/index.html | _src | 642 | ✓ | 挂起待人工 | CLICK_ERR |
| G114 | 数据收集员 | 数一数点亮表格 | batch34/datacollect/index.html | _src | 1013 | ✓ | PASS | (btn) |
| G115 | 错题小医生 | 找找错在哪治好它 | batch35/errdoc/index.html | _src | 685 | ✓ | PASS 12 | 13 |
| G116 | 井字棋小冠军 | 三个连一线 | batch36/tictac/index.html | _src | 566 | ✓ | 挂起待人工 | (btn) |
| G117 | 教会小兔子 | 当小老师数苹果 | batch37/teach/index.html | _src | 1136 | ✓ | PASS 13/13 | (btn) |
| G118 | 齿轮转起来 | 装上齿轮转风车 | batch38/gear/index.html | _src | 480 | ✓ | PASS 12/12 | (btn) |
| G119 | 电路小灯泡 | 接亮小灯泡 | batch39/cir/index.html | _src | 526 | ✓ | PASS 13/13 | 会亮 |
| G120 | 问题拆解小博士 | 大事拆成小事做 | batch40/brk/index.html | _src | 1096 | ✓ | PASS | 挖一个小坑 |
| G121 | 识字小课堂 | 认字组词读句子 | batch41/zilearn/index.html | _src | 3420 | ✓ | PASS 10/10 | 太 |

**统计**：121 款全对账；L1 开页 121/121（console 错 0、无空白首屏——21 款首轮 innerText 判空系图形界面误报，截图复核全部非空白）；verify 干净复测 PASS 117 / 挂起待人工 4（G035/G072/G113/G116：源码含完整 verify 但 ?verify=1 页 title 不变 60s+console 0 错，属自动验证链挂起，非游戏阻断）；无 _src 2 款（G001/G002）。
**首轮 16 款 VERIFY FAIL 全部为探测污染误报**（同 page 先真实模式写档再进 verify 页；干净独立 context 16/16 PASS）——证据 recheck.json。
