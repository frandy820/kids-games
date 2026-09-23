# Task#46 语音 keyless 点静态枚举 — A 组（batch1-batch20，60 款）

> 枚举 agent 静态扫描（2026-09-19）。判定基准（design/core.js voice 模块）：`say(text)`/`KIDS.speak(text)`=恒走系统 TTS；`play(key,text)`=无 clip 回退 speak；`queue` 段 `{key:null,text}` 或缺 clip 带 text=该段 TTS、整句不中断。manifest 2244 键为覆盖基准，本清单为增量。
>
> 三分类：A 类=真 keyless（写死无键）；B 类=命名键未注册（VOICE 表有键名 manifest 无→play 落空仍走 TTS）；兜底型=全段 clip 在场走 queue 否则 say（键已全在 manifest=死分支，0 新键）。

## 逐款清单

### batch1/kitchen-rhythm（1 点 / 8 键）
- say 拼句 `_src/game-main.js:681` 结算兜底「你切了N个，连击M下，小猫收走了K个」（正常路径 kitchen_n_1..30 已有）| 拆段 8（数词复用+4 句式段）

### batch1/shop-math（真 3 点 / 42 键，复用口径 24）
- say 报数 `build/game-main.js:335` 组末报数 numCn(cnt)+"个" | n∈1..20 → 20（或复用 shop_n_+"个"段 1）
- say 付钱提示 `build/game-main.js:491`「放一枚X元的试试吧」| {1,2,5} → 3
- say 找零 `build/game-main.js:541`「找了X元」| 1..19 → 19（或复用 shop_n_）
- 兜底 3 处（46-48/50-60/468）shop 族全 Y 死分支 0 键

### batch5/connect（2 点 / 69 键）
- sayTextR 确认句 `_src/game-main.js:344,346` anti 12+chain 3+pair/set 12 → 27
- sayTextR 题面句 `:381` startQVoice stemOf 五型模板×词表 → 42

### batch6/compare（2 点 / 13 键）
- say 语义句 `:281` SEM_TEXT 3 值 → 3
- say 数数跟读 `:439` k∈1..10 → 10

### batch6/subbug（2 点 / 拆段 6 + B 1）
- speak 题面 `:139,422`「叶子上有X只小虫，飞走了Y只，还剩几只？」≈45 组合 → 拆段 6
- B 类 `sub_refly` 1 键

### batch7/fishcolor（4 点 / 拆段 26 键）
- say 题面 `:178,421` quizSpeech 三型 → 拆段 20（色9+量词3+句式段8）；整句~700 不可行
- sayR(null) 救援 `:446` 复用上
- say 间色反馈 `:291`「X和Y变的」→ 6

### batch7/fruitsplit（3 点 / 16 + B 3）
- speak 题面 `:265,530,576` ≈13 句 → 13
- speak 公平句 `:343`「X块一样大，很公平」→ 3
- B 类 fru_knife/fru_same/fru_wrong 3 键

### batch7/hopscotch（3 点 / 拆段 26 + B 1）
- sayR(null) 题面 `:125` 跳格指令 → 拆段 26（数词20+方向段4+尾2）；整句 80
- say 报数 `:217` 1..20 并入上
- B 类 `hop_wrong` 1 键（hop_wrong2 已注册）

### batch8/neighbors（3 点 / 39 键）
- say 邻居数词 `:67` mid 型"X和Y" n 1..18 → 18
- say 数词 `:73` 1..20 → 20
- key:null wrong `game-data.js:37` 1 键

### batch9/whereistand（2 点 / 21 键）
- say 序数题面 `:70` dir 4×k 1..5 → 20
- key:null wrong `game-data.js:35` 1 键

### batch10/chainsum（2 点 / 拆段 25 键）
- say 题面 `:67`「X加/减Y等于几呀」→ 拆段 24（数词21+加减2+尾1）；整句 252
- key:null wrong `game-data.js:41` 1 键

### batch10/habit（4 点 / 4 键）
- queue 尾段 `game-data.js:65` Q_SUFFIX 固定 1
- key:null ×3 `game-data.js:60-62` 纠错锚 3

### batch11/shadow（1 点 / 1 键）
- key:null wrong `game-data.js:67`

### batch11/shapeshome（B 类 1 族 / 73 或 1+复用）
- B 类 `shp_wrong`：grid 1 固定+非 grid「不对哦，要找」+speechBody（题面族 72 已在 manifest）→ 整句 73 或前缀段 1+queue 复用

### batch11/sortsize（1 点 / 1 键）
- key:null wrong `game-data.js:36`

### batch16/idiom（3 点 / 164 键，大头）
- queue keyless 尾段 `:105,365` 情境句 ctx 80 条 → 80
- queue keyless 尾段 `:108` confirmParts 释义 80 条 → 80
- B 类 idm_q_fill/idm_q_near 2 键

### batch16/read（2 点 / ≈400 键，最大头）
- say 正文句 `:246,277` 短文正文（模板×词表动态生成）→ ≈400（合成前须程序化枚举封闭全集）
- sayParts 兜底 `:32` rd_w_ 23 词全 Y 死分支 0 键

### batch16/spellen（1 点 / 60 键）
- sayLetters 跟读 `:294,356` 字母名串 60 词新族

### batch17/area（2 点 / ≈126 键）
- say 题面 `:136`（149/416/429 调用）ASK 4 静句+calcAsk 动态 → 76（calc 拆段可减）
- say 确认 `:37-44` 四分支 ans 1..20 → ≈50

### batch17/poemfill（5 点 / ≈270 键去重）
- say 题面 `:258` F/R/O 诗句行 120+FF 飞花令 targetChar≈150
- say 诗句行 `:269`/胜利句 `:316`/重听 `:454`/单字 `:563` 并入上
- 死键 poe_line_* 20 键在册 0 引用（清理轮处理）

### batch18/bounce（1 点 / 1 键）
- say 字面量 `:266`

### batch18/coder2（3 点 / 6 键）
- sayInstr `:226` INSTR_TEXT 5；say 字面量 `:215` 1；say 程序串 `:331` 0（queue 复用 5）

### batch18/stack（1 点 / 4 键）
- say 章问句 `:99` ASKS 4 章

### batch19/cipher（6 点 / 拆段 ≈64 键）
- sayVal 值词 `:266` 数字10+用字30 → 40（拆段数字+单字）
- sayPair 密码对 `:342,346,361,365` SYMS 10×WORDS 12 → 拆段 22（整句 120）
- say 字面量 `:347,366` 2 键
- say 情报串 `:379,390` 0（queue 复用）

### batch19/sudokunum（1 点 / 1 键）
- say 字面量 `:244,442` 同文

### batch20/memduel（2 点 / 31 键）
- sayVal 串读 `:180` DIGITS 9+LETTERS 12+COLORS 10；sayVal 选项 `:312` 并入

### batch20/quiz（4 点 / ≈285 键，大头）
- sayQ 读题 `:177,299,376,475` QZ_BANK 160 题 → 160
- sayQ 选项串 `:300` 拆段≈选项词域 120（题库枚举）
- sayQ 类别 `:380` 4；sayQ 纠错 `:387` 1

### batch20/timecalc（5 点 / 拆段 ≈100 键）
- queue keyless 尾段+say 题面 `:443,633,520` 十型动态句 → 拆段≈60（星期7+数词+时刻词+句式段）
- sayVal 选项 `:370` 星期 7+时刻词=37；sayVal 星期 `:416` 并入
- sayVal 作息行 `:431` 拆段≈40
- say 引导句 `:534` 5

## 干净款（27 款无 keyless）
pipe-rabbit、color、memory、tangram、math、pattern、pinyin（py_syl_ 154 全）、clock、sudoku、countchick、spotdiff、words、worden（除 B）、picto（除 B）、memgrid（除 B）、mirror（除 B）、simon（除 B）、shapeshome（除 B）、column、fraction、grid、blocks、logicwho（除兜底）、matchstick、mirrormaze、gomoku4

## 兜底死分支 13 处（0 新键）
times/divide/money/wordprob/multibattle/numberdet/cashier（sayQ else）+logicwho/read（sayParts else）+shop-math（playChain/scaffold）——键已全 Y

## B 类未注册键族汇总（11 族 / 85 键）
shp_wrong 73（或 1+复用）/wen_wrong 3/sub_refly/fru_knife/fru_same/fru_wrong/hop_wrong/pic_wrong/si_wrong/mg_wrong/mir_wrong 各 1

## A 组总表

| 指标 | 数 |
|---|---|
| 真 keyless 调用点（A 类，27 款） | **69** |
| key:null 段定义 | 13 |
| B 类未注册键族 | 11 族 / 85 键 |
| 兜底死分支 | 13 处（0 新键） |
| **预估新增 clip 键（拆段优先）** | **≈2,030**（整句口径 >4,000 不建议） |
| Top5 大头 | read ≈400 > quiz ≈285 > poemfill ≈270 > idiom 164 > cipher ≈64 |

## 对账（自验）
- 扫描面 60 款全量（脚本枚举核验 60=60；_src 为主源，shop-math 用 build/，pipe-rabbit 用内联 index.html）
- 全款 voice 调用点合计 947（say 54+speak 7+queue 77+play 256+封装 553）；闭合关系无未解释调用
- 键覆盖逐一比对 manifest（tim_n2 无下划线/idm_q_near 实名等），排除拼接前缀假阳性

**风险/未验证**：①read 正文/quiz 选项词/timecalc 时刻词三处动态域=量级估算，合成前程序化枚举复核；②poemfill targetChar≈150 去重估计；③shp_wrong speechBody 72 推定；④死键 poe_line_* 20 键清理轮处理。
