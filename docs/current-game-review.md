# 全库游戏审查（current-game-review）

> 审查日：2026-09-25。方法：playwright headless 真实开页（viewport 390×760 窄屏）+首屏截图+console/pageerror 收集+一次真实点击+verify 自检页（干净档独立 context 复测）。脚本与原始记录：output/kids-games-audit/（stage1_l1_scan.py / stage1_recheck.py / review-l1.json / recheck.json / shots/）。
> 分级：L0 链接存在 / L1 页面启动 / L2 核心交互可执行 / L3 完整一局见结算 / L4 真机儿童试玩。**启动冒烟只支撑 L1**；verify 自检（真实浏览器内跑完整交互判定流）作为 L2 证据。

## 总结论

- **A 类阻断问题（白屏/无法操作/console 崩溃）：0 款**。121/121 开页成功、console 错 0、首屏点击全部有响应。
- L0：121/121；L1：121/121；L2（verify PASS 证据）：117/121；L3：G121 识字小课堂（本轮真实模式全流程诊断中）+ GG034 藏猫猫摄像头（昨日 A-G 真实模式通关+结算弹层取证，今日未复验）；L4：0。
- 4 款 L2 证据缺失（G035 轮流浇花 / G072 机器人学跳舞 / G113 机器画师 / G116 井字棋小冠军）：源码含完整 verify 链但 ?verify=1 挂起不设 title（60s 追踪 console 0 错）——自动验证缺口，**非游戏不可玩**（L1 正常）；待人工游玩定性，本轮未修（时间分配给识字主线）。
- 首轮 16 款 VERIFY FAIL 复测全部洗为 PASS（同 page 带档污染）——教训已记：verify 判定必须独立 context。

## 分流（阶段3/4 输入）

- **A 阻断**：无。阶段 3 实际工作量 ≈ 0（仅 4 款 verify 挂起待人工，不属阻断）。
- **B 有潜力精修**：本轮选定《识字小课堂》(G121) 深改（阶段 2 主线）；其余款不批量改动。
- **C 待儿童真实反馈**：全部款——本轮零 L4 证据，任何「好玩/难易合宜」结论都必须由真机儿童试玩补充。
- **D 稳定不动**：其余 116 款本轮不改源码。

## 逐款层级表

| ID | 名称 | 批次 | L1 | L2 证据 | L3 | 本轮最影响可玩性的发现 |
|---|---|---|---|---|---|---|
| G001 | 管道小兔子 | batch1 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G002 | 数字小卖部 | batch1 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G003 | 厨房节奏 | batch1 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G004 | 翻翻找朋友 | batch2 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G005 | 七巧板拼图 | batch2 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G006 | 小小涂色本 | batch2 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G007 | 数数小鸡 | batch5 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G008 | 找不同 | batch5 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G009 | 连线朋友 | batch5 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G010 | 钓鱼颜色 | batch7 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G011 | 水果切切 | batch7 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G012 | 跳格子数数 | batch7 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G013 | 影子配对 | batch11 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G014 | 形状分家 | batch11 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G015 | 大小排排队 | batch11 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G016 | 喂小兔 | batch21 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G017 | 泡泡数数 | batch21 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G018 | 过河石桥 | batch21 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G019 | 隐藏朋友 | batch22 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G020 | 滑块拼图 | batch22 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G021 | 颜色魔法 | batch22 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G022 | 天气穿衣 | batch23 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G023 | 分糖果 | batch23 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G024 | 碰碰琴 | batch23 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G025 | 形状屋顶 | batch24 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G026 | 描红数字 | batch24 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G027 | 贴纸装扮 | batch24 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G028 | 动物宝宝找妈妈 | batch30 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G029 | 晚安故事序 | batch30 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G030 | 迷宫探险 | batch30 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G031 | 动物三餐菜单 | batch31 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G032 | 五感小侦探 | batch32 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G033 | 听音数一数 | batch33 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G034 | 藏猫猫摄像头 | batch34 | ✓ | verify PASS | 昨日证据（今日未复验） | 难度已于 r51 上移 6.5-8 岁；待儿童实测难度体感 |
| G035 | 轮流浇花 | batch35 | ✓ | 挂起 | — | verify 自动验证链挂起（游戏本身 L1 可玩），待人工游玩定性 |
| G036 | 安慰选择 | batch36 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G037 | 感谢的话 | batch37 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G038 | 规律画画 | batch38 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G039 | 贺卡工坊 | batch39 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G040 | 昆虫还是蜘蛛 | batch40 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G041 | 拼音小火车 | batch3 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G042 | 算术小勇士 | batch3 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G043 | 规律侦探 | batch3 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G044 | 识字积木 | batch6 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G045 | 比较大小 | batch6 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G046 | 减法捕虫 | batch6 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G047 | 数的邻居 | batch8 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G048 | 象形字 | batch8 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G049 | 英语单词 | batch8 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G050 | 方位排排队 | batch9 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G051 | 对称贴贴画 | batch9 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G052 | 记忆亮亮格 | batch9 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G053 | 算术接龙 | batch10 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G054 | 听指令敲小鼓 | batch10 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G055 | 好习惯排序 | batch10 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G056 | 故事排序 | batch25 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G057 | 情绪脸谱 | batch25 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G058 | 动物家园 | batch25 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G059 | 交通标志 | batch26 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G060 | 季节衣橱 | batch26 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G061 | 日历小星 | batch26 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G062 | 测量小尺 | batch27 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G063 | 硬币认钱 | batch27 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G064 | 音阶小鸟 | batch27 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G065 | 指令小兔 | batch28 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G066 | 图形计数 | batch28 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G067 | 数量守恒 | batch28 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G068 | 身体英语 | batch29 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G069 | 古诗跟读 | batch29 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G070 | 单词拼图 | batch29 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G071 | 如果下雨 | batch31 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G072 | 机器人学跳舞 | batch32 | ✓ | 挂起 | — | verify 自动验证链挂起（游戏本身 L1 可玩），待人工游玩定性 |
| G073 | 兔子在树哪里 | batch33 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G074 | 句子拼拼乐 | batch34 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G075 | 凑十小铺 | batch35 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G076 | 快速比大小 | batch36 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G077 | 植树程序 | batch37 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G078 | 分类归档小图书 | batch38 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G079 | 表情温度计 | batch39 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G080 | 冷静工具箱 | batch40 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G081 | 时间小管家 | batch4 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G082 | 乘法捕鱼 | batch4 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G083 | 数独小动物 | batch4 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G084 | 除法分糖 | batch12 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G085 | 分数披萨 | batch12 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G086 | 竖式小黑板 | batch12 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G087 | 零钱管家 | batch13 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G088 | 应用题剧场 | batch13 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G089 | 坐标寻宝 | batch13 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G090 | 空间积木 | batch14 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G091 | 乘法对战 | batch14 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G092 | 数字侦探 | batch14 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G093 | 找零收银 | batch15 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G094 | 逻辑三人组 | batch15 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G095 | 火柴谜题 | batch15 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G096 | 阅读小侦探 | batch16 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G097 | 英语拼写 | batch16 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G098 | 成语配对 | batch16 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G099 | 古诗填空 | batch17 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G100 | 铺砖面积 | batch17 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G101 | 镜像迷宫 | batch17 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G102 | 循环指令 | batch18 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G103 | 搭高楼 | batch18 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G104 | 弹球角度 | batch18 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G105 | 密码破译 | batch19 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G106 | 四子棋 | batch19 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G107 | 数独数字 | batch19 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G108 | 时间计算 | batch20 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G109 | 记忆双背 | batch20 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G110 | 百科问答 | batch20 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G111 | 图表小读者 | batch31 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G112 | 找证据小侦探 | batch32 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G113 | 机器画师 | batch33 | ✓ | 挂起 | — | verify 自动验证链挂起（游戏本身 L1 可玩），待人工游玩定性 |
| G114 | 数据收集员 | batch34 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G115 | 错题小医生 | batch35 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G116 | 井字棋小冠军 | batch36 | ✓ | 挂起 | — | verify 自动验证链挂起（游戏本身 L1 可玩），待人工游玩定性 |
| G117 | 教会小兔子 | batch37 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G118 | 齿轮转起来 | batch38 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G119 | 电路小灯泡 | batch39 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G120 | 问题拆解小博士 | batch40 | ✓ | verify PASS | — | 本轮自动化无阻断发现（深度未验） |
| G121 | 识字小课堂 | batch41 | ✓ | verify PASS | 进行中（诊断 agent 真实全流程） | 见 docs/literacy-game-design.md（阶段2 产出） |

## 自动化能证明什么 / 不能证明什么

- 能证明：链接与目录一致（L0）、页面启动无崩溃（L1）、核心交互在真实浏览器可执行（L2，verify 全流程断言）、console 零错误、窄屏无横向溢出（识字/藏猫猫两款实测，其余待抽）。
- 不能证明：好玩、难度合宜、儿童能理解目标、注意力维持——这些必须 L4 真机儿童试玩（见 docs/家长观察卡，阶段 2 产出）。
