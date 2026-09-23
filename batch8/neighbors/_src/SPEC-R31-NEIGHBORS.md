# SPEC-R31-NEIGHBORS · 邻居门牌难度加深改造（r31，2026-09-21）

依据：AUDIT-67 段序 5 🟡 判定「估 ~30s：**±1=大班-学前内容低约 1.5 岁**；**两侧房号
恒可见可顺数自验=查表化**」；建议三维度（±2/±3 上探+跨度内插/藏锚点单侧→盲位/ch4
连续两跳）。校准：b8 段标称 6-7 岁一年级上，宁难勿易——r15-r30 同口径。本文件为
neighbors 的 r31 难度谱定稿；与 game-core.js 旧注释/SPEC-BATCH8 §1 冲突处以本文件
为准（r28/r29/r30 同款声明）。

## §R0 目标（账本 §0 摘录）

保留玩法框架（数字小街/空房挂牌/候选 3 张点选/填房亮灯/星级救援/教学 看→帮→独），
消除「认知空心」（±1 查表化）——改造后 ch3/ch4 须达到一年级上数感+两步复合负荷。
验收：agent 不自验（主线独立复验）；新语音键禁自注册（§R10 TODO 清单）；计数断言
改动前已 grep 全款 `== N` 四层联动（build.py:48/verify_one 数学断言/game-verify
modeDist 精确值/_selftest houses==10/20）。

## §R1 设计总纲（审计三建议承接方式+逐条调整理由）

**维度一·运算上探（±2 与跨度内插，±3 不做——理由见下）**：
- ch3 新增 **plus2（比 n 多二）/minus2（比 n 少二）**：n 大数字域保留（plus2 n∈[10,18]、
  minus2 n∈[12,19]），跨十专项（19→20 与 10→9 各 ≥1）原样保留。±2=一年级「隔一找数」
  （与 15 相差 2 的数），数轴上从锚跨两步。
- ch4 新增 **mid4（亮 n 与 n+4，空房填 n+2）**：mid（±1 中点）的跨度上探版——孩子
  须在 4 格跨度内找正中（两步双向判断），refs=[n, n+4] 双锚。
- **±3 不引入**：①±3 题答案 n+3 与锚 n 隔 2 格，孩子在 3 候选下用「数街上亮房」
  （refs 域内其他亮牌）可侧漏推知，与 ±2 无本质增量；②语音句式键翻倍（多三/少三
  ×2）而认知面增量边际递减；③ch4 已有 dual 两步（净位移 ±1 但路径两跳）承载复合
  运算。若真机回归发现 ch3/4 仍易，±3 是下轮首选扩展位（§R12 登记）。

**维度二·支架渐撤（藏门牌=「盲位」机制，统一派生律）**：
- 审计「两侧房号恒可见可顺数自验」的根因=**全街门牌恒亮**（buildStreet 每栋非空房
  `.plate` 数字恒亮）。对策=藏牌：被藏房=**墙与窗户照常（有动物住）但门牌牌面空白
  （'·'）+aria 不泄号**——视觉诚实铁律（藏=牌面视觉无数字，禁「藏了数字还看得见」）。
- **统一派生律（纯函数，零 rnd 消耗）**：`hidden = 空房两邻中不属于 refs 的全部`
  （域 [1,20] 内者）：
  - dch1/2：`hidden=[]` 恒全亮（起步坡度=查表自验教学期，审计「ch1-2 保留原支架」）。
  - ±1 题（ch3/4）：refs=[n]（n=空房紧邻=题面锚），藏另一侧远邻——顺数链从「双向
    读表」变「单向从锚推 1 步」（小增量，±1 本质即顺数题，保留为混合谱坡度缓冲）。
  - ±2/mid4/dual 题：**紧邻+远邻皆藏（refs 除外）**——孩子从 ref 出发必须心算跨步
    （无步进牌可数），顺数查表面拔除（大增量，ch3/4 难度主承载之一）。
  - **mid 题零藏例外（声明）**：mid 两邻=refs 本身（n 与 n+2 亮=题面双锚，语音报了
    两个数），藏即毁题面锚；mid=双向判断题（认知两步），本就非单向查表。
- **不藏 refs 的理由**：题面语音报 n（「十五的邻居」），ref 房藏号=题面失锚（孩子
  无从定位 n 在哪），题面 chip 数字冗余也在（chip 是问题陈述的一部分非答案线索——
  answer 位是 chip 的 ?，从 chip 看不出 answer）。藏牌只针对「答案线索」（空房邻）。
- **不做全街随机藏（声明）**：空房邻藏已达成「不可顺数」目标；全街随机藏引入「有
  房无牌」的叙事负担与额外随机流（rnd 消耗面扩大），增量主要在视觉氛围非认知。

**维度三·ch4 两步题 dual（听题两步、单判定点——r30 范式）**：
- 两型固定（r24/r30 固定谱先例，每关恒 1 题压轴 qi4）：
  - **dualA「先多一，再少二」**：n∈[12,18]，中间态 s=n+1，answer=n-1；
  - **dualB「先多二，再少一」**：n∈[12,18]，中间态 s=n+2，answer=n+1。
  - 两型 answer=n±1 且路径两跳——孩子听题心算两步；只走一步的孩子答 n+1（A 型
    =s，经典「忘第二步」捕获器）或 n+2（B 型=s）——**s 恒为首选干扰项**（诊断性）。
- **采 r30「听题两步一次作答」而非 r24/r25「两问两步作答」的理由**：本款 UI=一题
  一空房单焦点，两问需双空房+step 语义重构=破坏「保留玩法框架」硬约束；r25 M2
  红线（两步中间态解锁刷救援钟）对单判定点**无对象**（无「第一步对」部分正确态，
  r30 §R1 同论证）；两步结构由**答后两跳演出**（兴趣锚+验算可视化）与**错后支架
  演示**（miss≥2 自动演示两跳，r30 救援升级阶梯同型）承载——教学面而非判定面。
- **答对两跳演出（r31 修复 M1 后定稿口径）**：fillHouse 前先跳两步（ref n 房 jump
  420ms（.house.jump .42s 动画）→ s 房 820ms → 挂牌 answer）；s 段条件化——**仅藏牌房
  （hidden 含 s=dualB，s=n+2 恒藏）揭示真数字→复盲**（答后验算），**dualA 的 s=n+1
  是亮牌房（hidden=[n-2]，s 不在藏牌集）→只加/去 reveal 高亮类，牌面恒真数字不写
  不复盲**（§R12「亮牌仅高亮」兑现；修复前实现对亮房无条件揭示→复盲把亮牌写成
  '·'，与 aria「N 号房子」矛盾——审查 M1）；演出窗 1790ms×SPEED 内 locked+身份守卫
  （r30 教训①演出窗×用户行动矩阵自查：答对 locked 拦重复点牌/答错/重玩——replayBtn
  现状已含 locked‖demo‖won 门；hearBtn/chipEl 含 locked‖demo 门；演出后 cur!==run
  丢弃旧续体）。
- **miss≥2 支架演示（demoDualJump）**：dual 题连错 2 次→pulse 正确牌（原样）+
  650ms 延迟→ref 房 jump 420ms→s 房揭示 820ms（s 段条件化同答对演出：dualB 揭示→
  复盲 / dualA 仅 reveal 高亮）；**answer 指认由候选牌 pulse 承载（§R12 口径），
  无街道 answer 段**（r31 修复 M2：原表「answer 空房 breathe，820ms×2 段」与实现
  矛盾——实现无 answer 街道段且 820 仅一段）；
  **不锁定输入**（孩子可随时作答，答对即 renderQuiz 重建+旧续体身份守卫丢弃）、
  **不刷 lastAct**（r24 M1 keepIdle 同型：完成段不隐式刷救援钟——演示后 14s 重读
  题面救援仍可达）、**q._demoP 互斥**（r30 M1 范式：演示中再错重入返回在跑
  promise 不叠演）。

**教学链/星级/存档零改动**：flat0 恒 dch1 plus±1（教学 看→帮→独 原样可演示）；
retries 0/≤2/其他=3/2/1 星；档键 kidsgame_neighbors/sv.neb.tutSeen 不动。

## §R2 难度谱定稿（章弧/CH_LEN=5/静态 20 关/每关 5 题不动）

| 章 | 章名（不变） | 题型结构（每关 5 题） | 值域 | 支架（藏牌） | 相对 r31 前 |
| --- | --- | --- | --- | --- | --- |
| 1 | 多一号 | plus±1×5（**零改动**） | n∈[1,9] | 全亮 | 无变化 |
| 2 | 少一号 | minus±1×5（**零改动**） | n∈[2,10] | 全亮 | 无变化 |
| 3 | 大房子 | 跨十专项×2（plus n=19→20 / minus n=10→9 落位洗牌）+**±2×1**（plus2/minus2 掷币）+普通 ±1×2（掷币） | ±1 n∈[10,19]；plus2 n∈[10,18]；minus2 n∈[12,19] | hidden 律生效（±1 藏远邻/±2 双邻藏） | +±2 题型；+藏牌 |
| 4 | 住中间 | **qi0-3=shuffled([plus±1, minus±1, mid, X])，qi4=dual 压轴**；X=['plus2','minus2','mid4'] 三选一掷币；dual=['dualA','dualB'] 掷币 | ±1 原域；plus2 n∈[1,18]；minus2 n∈[3,20]；mid n∈[1,18]；mid4 n∈[1,16]；dual n∈[12,18] | hidden 律生效（mid 零藏例外） | 结构重排+新族×2/关（X+dual）+藏牌 |

- **章名零改动；章末预告 hint 改 2 处（谱变更显式声明，r30 范式；hint 键位=通关本章
  后预告下一章）**：CHAPTERS[2]「门牌号变大啦，有的门牌还藏起来了」（通关 ch2 预告
  ch3 藏牌）、CHAPTERS[3]「空房藏中间，还要跳两步找新邻居」（通关 ch3 预告 ch4
  dual 两步）；CHAPTERS[1]/[4] 与 GEN_HINTS 四条零改动（对新谱仍贴切）。
- **锚点（结构性，机检）**：flat0 恒 dch1 plus±1（教学链零改动机检前提）；CH_LEN=5、
  STATIC_LEVELS=20、种子 mulberry32(flat×7919+13)、STAR/存档语义全不动。
- 生成关（flat≥20）循环节奏不变（20-24=dch1、25-29=dch2、30-34=dch3、35-39=dch4）。

## §R3 生成律（确定性通道不变；verify/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)；genLevel/genOne 签名不变（force 扩型）。
- **drawN(dch,mode)**（n 抽样域；ri 各 1 次 rnd 消耗，与旧版同构）：
  dch1 plus[1,9]（原样）/dch2 minus[2,10]（原样）/dch3 plus·minus[10,19]（原样）、
  plus2[10,18]、minus2[12,19]/dch4 plus[1,19]·minus[2,20]·mid[1,18]（原样）、
  plus2[1,18]、minus2[3,20]、mid4[1,16]、dualA·dualB[12,18]。
- **answer/s 派生**：plus→n+1 / minus→n-1 / plus2→n+2 / minus2→n-2 / mid→n+1 /
  mid4→n+2 / dualA→{s:n+1, answer:n-1} / dualB→{s:n+2, answer:n+1}。
- **干扰池（池序=优先序，过滤域 [1,20]+≠answer+互异+（dual 另过滤 ≠n=ref 亮牌号
  不入候选，视觉指认冲突）取前 2）**：
  - plus[10]原样 [n+2,n-1,n+3,n-2,n+4,n+6] / minus 原样 [n-2,n+1,n-3,n+2,n-4,n+6] /
    mid 原样 [n+3,n-1,n+4,n+5,n-2,n+6]；
  - **plus2 [n+3,n+1,n+4,n-1,n+5,n-2]**（n+1=「只走一步」捕获器次位）；
  - **minus2 [n-3,n-1,n-4,n+1,n-5,n+2]**（n-1 捕获器）；
  - **mid4 [n+1,n+3,n-1,n+5,n+6,n-2]**（n+1/n+3=「不在正中间」捕获器居首二）；
  - **dualA [s,n-2,n+2,n-3,n+3]** / **dualB [s,n+3,n-1,n+4,n-2]**（s 居首=忘第二
    步诊断器；均避开 n）。
- **hidden 派生律（纯函数零 rnd）**：`refNums: mid→[n,n+2] / mid4→[n,n+4] / 其余→
  [n]`；`hiddenNums(q,dch): dch<3 ? [] : [answer-1,answer+1] 过滤 ∉refs 且 ∈[1,20]`。
  genOne 尾部写入 `q.hidden`（verify/pycheck/structWhy 三方可读）。
- **genLevel 章结构**：dch3 `sp=shuffled([0..4])` 取 3 位（sp[0]=19→20 专项、sp[1]
  =10→9 专项、sp[2]=±2 型 `['plus2','minus2'][ri(0,1)]`），余 2 位普通 ±1 掷币
  `rnd()<0.5`；dch4 `X=['plus2','minus2','mid4'][ri(0,2)]`、`m4=shuffled(['plus',
  'minus','mid',X])`（qi0-3 定型）、qi4=`['dualA','dualB'][ri(0,1)]`。
- **rnd 消耗流影响面（逐章）**：dch1/dch2 **零变化**（mode 固定/drawN 域/池/
  shuffled(3) 全同）→flats 0-9、20-29 谱语义投影逐字节保留（§R6）；dch3 变化=shuffled
  5 元素原 4 次 rnd 不变+新增 ±2 槽 ri 1 次+±2 题 drawN/池/shuffled 同构→flats 10-14、
  30-34 全刷新；dch4 变化=结构重排（shuffled 4 元素 3 rnd+X 掷币+dual 掷币替换原
  shuffled(3 型)+后两题随机 ri）→flats 15-19、35-39 全刷新。
- 相邻题不重样（lastKey=mode:n）原样对 8 型生效。
- **structWhy 扩展**：8 型公式+域校验（plus2: answer===n+2∧n∈[1,18]；minus2:
  answer===n-2∧n∈[3,20]；mid4: answer===n+2∧n∈[1,16]；dualA: answer===n-1∧s===
  n+1∧n∈[12,18]；dualB: answer===n+1∧s===n+2∧n∈[12,18]）+options 3 张互异含答案
  域 [1,20]（原样）+**hidden 与 mode 一致性**（=hiddenNums 重算值）。
- 分布护栏（精确值=确定性谱推导，§R11 实测复核）：ch1 全 plus 50/ch2 全 minus 50
  （原断言保留）；ch3: plus±1+minus±1=40、plus2+minus2=10、跨十 19→20 与 10→9
  每关专项保底各 1 → 全局断言 ≥10（**实测 crossUp=11**——普通 ±1 槽随机再中 n=19
  一次属设计内随机，crossDown=10）；ch4: plus=10、minus=10、mid=10、X 族 10、dual=10
  （A/B 掷币随 seed，实测 A=8/B=2）；40 关 200 题 total（实测 plus 81/minus 79/
  plus2 7/minus2 6/mid 10/mid4 7/dualA 8/dualB 2）。

## §R4 交互与救援（lastAct 纪律核对：r23 P1-1/r24 M1/r25 M2/r30 三 major）

- **lastAct 触点（现状全保留）**：答对推进刷（uiTapOption right 路径）/兔兔/重玩/
  听题/点题面卡/空白轻提示节流——零新增触点；**dual 答对两跳演出与 miss≥2 演示均
  不刷 lastAct**（系统演出非用户行动；救援 14s 门在演出窗被 locked 拦（答对窗）或
  自然跨越（演示不锁）——演示完成段不重置钟=重读题面救援仍可达（r24 M1 keepIdle
  同型核对）。
- **r25 M2 不适用论证**：dual 单判定点无「第一步对」中间态（听题两步一次作答），
  无解锁相位→无中间态解锁刷钟对象；miss≥2 演示入口=wrong 路径（该路径现状不刷
  lastAct=救援钟不被演示吞）。
- **r30 三 major 同族自查（演出窗×用户行动矩阵）**：
  - 答对演出窗（1790ms×SPEED）：locked 全程 → 点牌（locked 拦）/重玩（locked 门）/
    听题（locked 门）/兔兔（locked 门）/空白（locked 拦）全静默；窗后 `cur!==run`
    身份守卫丢弃旧续体（重玩已重建关）。
  - 演示窗（miss≥2，820ms×2 段，**不锁**）：孩子答对→renderQuiz 重建街+候选→
    演示旧续体逐 await `cur!==run` 丢弃（对旧 DOM 引用操作前判空）；孩子答错→
    重入演示 `q._demoP` 在跑即返（不叠演，r30 M1 promise 链互斥）；重玩→cur 重建
    →身份守卫丢弃。
  - 已灰牌 again 防御/非法下标 false：原样（engTap 不动）。
- **救援链（原样）**：14s 重读题面（新题型 quizKeys 链复用同一路由）；miss≥2 pulse
  正确牌（原样，3 选项 miss 极限=2——r30 教训②值域可达性：pulse 阈 miss≥2 **恒
  可达**（错项恰 2 张），与 subbug 盲飞 miss≥3 不可达不同）；dual 加 650ms 后两跳
  演示（非泄答案——演示亮 s 与路径，answer 仍由 pulse 承载）。
- **教学链零改动**：tutorialWatch/pointHelpNext/交接链原样（flat0=dch1 全亮谱，
  演示与新机制零交集——机检：flat0 quizzes 投影与 baseline 逐字节一致）。

## §R5 引擎与钩子（向后兼容）

- game-core.js：genOne 扩 8 型分派+q.hidden/q.s 派生；structWhy 扩分支；**engTap/
  engStars/engWon/mulberry32/shuffled/ri 逐行不动**（判定面零改动——dual 也是
  单步判定 answer 点选）。
- game-main.js：quizKeys/quizText 扩 5 新型段链（§R10）；buildStreet 盲牌渲染
  （q.hidden 房 `.plate='·'`+class 'blind'+aria「还没挂门牌的房子」不泄号）；
  renderChip 新型（plus2/minus2 双箭头/mid4 双点隔/dual 两小步标）；dualJump（答对
  两跳）/demoDualJump（miss≥2 演示）+`window.__dualJumpN` 计数锚（verify/selftest
  演出取证）；其余渲染/推进/教学零改动。
- **NEB 钩子**：currentLevel 原样；quiz getter 增 `hidden`/`s`（dual）字段——既有
  字段（mode/n/answer/options/filled/step/miss/dim）零变化；tapOption/autoSolve/
  tutorial 原样（autoSolve 点 options.indexOf(answer) 对 8 型通吃）。
- **verify_one_nb_wen.py 逐腿核对（§R7 兼容清单）**。

## §R6 基线证据（双证据+谱变更显式声明，r27-r30 范式；工具随款归档 _src/）

- **证据①（前后谱对照）**：改造前 index.html（md5 73e3110f…846143 chars）提取
  40 关 quizzes JSON=r31-baseline.json；改造后=r31-post.json（提取器 _r31_extract.py
  归档 _src/；字段口径 §R3）。**对照口径=语义投影 [mode,n,answer,options] 逐题
  JSON**（r31 新增 s/hidden 字段不进投影——baseline 无此字段，投影比对防假差异；
  post 侧 s/hidden 由 pycheck 独立复算覆盖）：
  - **保留（投影逐字节，机检）**：**ch1+ch2 全部 20/40 关**（flats 0-9、20-29）
    ——两章生成律零变化。
  - **保留（结构性）**：flat0 首题恒 dch1 plus±1（教学零改动机检）；CH_LEN=5/
    200 题/确定性双跑一致。
  - **变更（预期）**：ch3 全 10 关（+±2 槽改 rnd 流）、ch4 全 10 关（结构重排改
    rnd 流）——flats 10-19、30-39。
- **证据②（Python 独立复算）**：_r31_pycheck.py 按 §R3 生成律 Python 独立实现
  genLevel（mulberry32/shuffled r27-r30 同源副本），与页内提取 40 关全量对拍
  **PYCHECK 40/40 identical**（含 s/hidden 全字段）。
- **证据③（verify 规则断言）**：40 关逐关新谱合规（§R8①：ch3 专项+±2 结构/
  ch4 五槽结构/8 型公式/干扰池律/hidden 派生复算）。
- **证据④（真实页真实点击）**：_selftest 2c/2d（藏牌 DOM+盲牌视觉诚实+dual 演出
  取证）；真页截图 _shots/。

## §R7 存档与兼容（verify_one_nb_wen.py 逐腿清单）

无档结构变化：档键/levels 'ch-lv'/CH_LEN/STATIC_LEVELS/日历/sv.neb.tutSeen 全不动；
无新增落档字段（hidden/s/演示态均运行态）。旧档通关星级与新谱无矛盾（ch3/4 题面
刷新、星级语义不变，r20-r30 同款声明）。

**verify_one_nb_wen.py（主线腿）逐腿核对**：
| 腿 | 判定 | 说明 |
| ① verify title | 兼容 | game-verify 断言已联动（§R8） |
| ② flat1 真实通关 | 兼容 | dch1 零改动，3 候选驱动协议原样命中 |
| ③ 双 viewport | 兼容 | flat1=dch1 10 房全亮，街数不变 |
| ④ 离线 / ⑤ 截图 | 兼容 | 无外链；flat5=dch2 零改动 |
| ⑥ 钩子 | 兼容 | NEB 四钩子原样 |
| ⑦ 0 pageerror | 兼容 | — |
| ⑧ 教学吞输入 / ⑬ 教学重玩 | 兼容 | 教学链零改动 |
| ⑨ 首错零惩罚 / ⑨b pulse flat5 | 兼容 | dch2 零改动，miss≥2 阈可达 |
| ⑩ sayW 节流 flat5 | 兼容 | — |
| ⑪ 救援 flat5 | 兼容 | — |
| ⑫ clips 对账 | 兼容 | len(gk)>=6 宽松断言；48→53 注册后仍过 |
| **14 数学断言 flat5/flat12** | **需适配（主线）** | flat5 兼容；**flat12=dch3 新谱**
  q.mode 可能 plus2/minus2 → `mode=='plus' and answer==n+1` 分支 FAIL。适配建议：
  good 判据扩 `(mode=='plus2' and answer==n+2) or (mode=='minus2' and answer==n-2)`；
  本 agent 不动主线脚本（改造后实跑全腿，红腿仅此一条预期，见 §R11 实测） |

## §R8 verify/_selftest/build 适配清单（四层联动）

- **game-verify.js**：① 审计循环 8 型分支——ch3（跨十 2 专项+±2 恰 1+域）/ch4
  （plus/minus/mid 各 ≥1+X 族恰 1+dual 恰 1+域+s 恒在候选）/structWhy(q,dch)/
  hiddenNums 复算/ch1-2 恒全亮；④ 新增 **B3 冒烟**（flat15 dual miss≥2 支架演示链：
  pulse+650ms 两跳演示+s 复盲+演示后答对通关 2★）+B1/B2 扩 ±2/盲牌/两跳取证；
  ⑤ simView platesOk/anchorOk 盲牌双向口径；⑥ dist 扩 8 型精确值+clips 48（注册前
  现值，主线注册后 53——build.py 同步改）。总单元 46→**47**（§R11 实测 47/47）。
- **_selftest.py**：2c 改（flat12 新谱：±2 在场+盲牌 DOM+通关）；2d 改（flat17：
  mid refs 亮+dual 在场+盲牌+**dual 答对 __dualJumpN≥1**）+**新增 2d2**（dual
  miss≥2 支架演示真实链：连错 2→650ms 演示 __dualJumpN 递增+演示后救援钟可达+
  演示中答对通关）；viewport 腿 flat17=20 房原样；救援腿 flat3 原样。实测数字 §R11。
- **build.py**：硬性检查 4（r30 结构锚）：engine plus2/minus2/mid4/dualA/hiddenNums、
  data 5 新键文案、main dualJump/__dualJumpN/demoDualJump、verify dchDual/blind 断
  言锚；manifest 48 断言维持+注释「r31 注册 5 键后主线改 53」。
- **主线侧（声明不实施）**：①gen_clips 注册 5 新键（§R10）+build.py/game-verify.js
  48→53 两处联动；②verify_one_nb_wen.py 14 腿适配（§R7）。

## §R9 时序参数实测口径（r23 P2-1 红线：逐调用点对照实现核，SPEC 值=实现值）

| 参数 | 值 | 调用点 | 口径 |
| --- | --- | --- | --- |
| 答对演出窗（非 dual） | 950ms×SPEED | uiTapOption right await | 原样 |
| **dual 答对两跳窗** | **1790ms×SPEED**（=420+820+550） | uiTapOption right dual 分支（420 首跳→820 s 段→550 挂牌收尾） | 新增 |
| 答错晃动窗 | 480ms×SPEED | uiTapOption wrong await | 原样 |
| **miss≥2 演示延迟** | 650ms×SPEED | wrong 路径 dual 分支→demoDualJump | 新增（r30 unlockAssist 同位；r31 修复 M2 定稿） |
| **demoDualJump 全程** | 1890ms×SPEED（=650 延迟+420 ref jump+820 s 段） | demoDualJump | 修复 M2 定稿：无 answer 段——answer 指认由 pulse 承载（§R12），原表「820ms×2 段（s 揭示段+answer 段）」与实现矛盾已正 |
| s 牌临时揭示 | 820ms×SPEED 内 | demoDualJump/dualJump | 新增；**仅藏牌房**（dualB s=n+2 恒藏）结束恢复 '·'；dualA s=n+1 亮牌=仅 reveal 高亮不写牌面不复盲（修复 M1） |
| 教学演示节奏 | 700/900/320/1000ms×SPEED | tutorialWatch | 原样（零改动） |
| 教学 help 指向 | 600ms setTimeout | tutorialWatch 尾 | 原样 |
| ghost 按压 | 800ms setTimeout | pointGhostAt | 原样 |
| 看护轮询 | 1000ms setInterval | 无操作看护 | 原样 |
| 救援门 | 14000ms | 同上（重读题面+lastAct 重置） | 原样 |
| 教学 help 重演示 | 5000ms | 同上 | 原样 |
| 纠错语音节流 | 10000ms | sayW（flat≥3） | 原样 |
| 空白提示节流 | 10000ms | field pointerdown 空白分支 | 原样 |
| 章末/日末推进 | 3400ms setTimeout | winFlow | 原样 |
| queue 段间停顿 | 150ms | core voice.queue | 原样 |

r31 新增时序面=dualJump 演出族（答对 1790=420+820+550 / 演示 1890=650+420+820）——
全部演出窗参数，SPEED 缩放联动（verify 页 0.12 提速）。

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest）

**新增 5 键**（前缀 neb_ 已 grep manifest/gen_clips 核零占用：现有 neb_tut_watch/
neb_tut_turn/neb_hint/neb_q1/neb_q2/neb_q4/neb_wrong+neb_mid_1-18+neb_n_1-20=45）：

| key | 文案（clip 合成文本） | 用途 |
| --- | --- | --- |
| neb_qp2 | 的邻居是几呀？比它多二 | plus2 题面链 [neb_n_n, neb_qp2] |
| neb_qm2 | 的邻居是几呀？比它少二 | minus2 题面链 [neb_n_n, neb_qm2] |
| neb_and | 和 | mid4 题面链接段 [neb_n_n, neb_and, neb_n_(n+4), neb_q4] |
| neb_dual_a | 的多一邻居住好啦，再找它的少二邻居，是几号呀 | dualA 链 [neb_n_n, neb_dual_a] |
| neb_dual_b | 的多二邻居住好啦，再找它的少一邻居，是几号呀 | dualB 链 [neb_n_n, neb_dual_b] |

- 数词段复用已注册 neb_n_1-20；mid4 复用 neb_q4。manifest 48→**53**（主线注册，
  联动 build.py assert 与 game-verify nClips===53）。
- **注册前过渡态（r29 m3 先例）**：playChain 缺段→KIDS.voice.say(fallback)（core
  speak=TTS 兜底已退役=静默+console.warn）——新 5 型题面语音注册前静默；视觉/
  交互/演出/救援完整不受影响（selftest 2c/2d/2d2 在缺 clip 态全绿为证）；主线
  注册后自动换真 clip。**注意（selftest 2d2 实测披露）**：过渡态下新 5 型的「救援
  重读题面/开场读题」走 say(fallback) 通道而非 queue 链（playChain 的缺段分流），
  行为语义不变（重读题面）、通道不同——对语音取证类断言须双面包裹 queue+say
  （_selftest 2d2 hook 已按此写）；注册后分流自动回 queue 真链。
- gen_clips 注册建议格式（沿 neb_q* 先例）：`T46('neb_qp2', '的邻居是几呀？比它
  多二', 'neighbors')` 等五行（文案与 game-data.js VOICE.text 一字一致）。

## §R11 验收数字（Executor 自测门禁，2026-09-21 实测——主线独立复验为准）

**基线链**：改造前 `73e3110f166ded2ee1a04d38e10ff87b`（846143 chars）→ r31 改造后
**`1ae1a07c708a3510b3d0650ade7f8ad1`（851398 chars，clips 48 不变——5 新键注册前）**
→ 主线注册 5 键后 `4ed97fd71120474add8ac7aed772b238`（1002014 chars，53 clips）→
**r31 修复轮 `bd18784c8021c4d49512dd6fa6b88fb2`（1002879 chars，2026-09-21）**：
审查 4 major 修复（M1 dualA 亮房揭示复盲/M2 本文件 §R1§R9 时序表失实/M3 selftest
2d2 静置窗无判别力 16.5s→12s/M4 §R12 dual 可查表性披露）+minor m1/m2/m3/m6 顺手收；
门禁全绿：build 双跑幂等 **bd18784c×2**/VERIFY **47+47** 双视口 0 pageerror/
_selftest **67/67**（断言数不变，2d2 三断言判据收紧）/verify_one_nb_wen **35/35**
（mid 判据收紧 answer==n+1 后）/pycheck **40/40**+修复后重提取 40 关 JSON 与
r31-post.json **md5 逐字节一致**（`704db856ec74a38e501003de082a2a03`，谱零改动实证
——game-core.js 未动）/复现脚本 **_r31_repro_fix.py 13/13**（dualA 恒亮+dualB 往返
+M3 判别力守约绿/违约红）。m5 登记（演示中答对 jump 掐断 ~320ms 动画，幂等无功能
影响）；m7 记录（selftest 冗余层弱断言由 verify 侧承载）。

①build 双跑 md5 一致：`1ae1a07c708a3510b3d0650ade7f8ad1`×2（首跑曾为 93c765f6/
45 轮——两处断言 bug 修复后重建：verify crossUp===10→≥10（普通槽随机再中 19 属设计内）
+B3 engStars 1→2（retries=2 值域核对），见 §R12）。
②VERIFY 双视口（1280×800+800×1180）：**47/47 PASS ×2**、layoutOk、0 pageerror
  （单元构成：①40 关审计+②tapOption+③flat0+④B1/B2/B3 三冒烟+⑤layout+⑥dist）。
③_selftest：**67/67 PASS**（含 2c ±2/盲牌、2d 五槽/dual 两跳/dualB s 复盲、
  2d2 dual miss≥2 演示链+keepIdle 救援可达、双 viewport、离线、0 pageerror）。
④verify_one_nb_wen.py：**34/35**——neighbors 15 腿 14 绿+**1 红=14 数学断言（flat12
  首题 minus2）**，与 §R7 预判的适配腿完全一致（worden 腿不受影响全绿）；主线适配
  建议见 §R7。
⑤谱对照：**ch1+ch2 全部 20/40 关投影 [mode,n,answer,options] 逐字节保留**（dch1
  10/10+dch2 10/10）；ch3/ch4 全 20 关刷新（dch3 0/10、dch4 0/10 保留）；flat0 首题
  恒 dch1 plus（教学锚）；**pycheck 40/40 levels identical**（含 s/hidden 全字段
  Python↔JS 逐位）；40 关 200 题实测分布 plus 81/minus 79/plus2 7/minus2 6/mid 10/
  mid4 7/dualA 8/dualB 2；crossUp=11/crossDown=10。
⑥新语音键 5 个 TODO（§R10 清单，未注册；manifest 48 现值，主线注册后 53 并联动
  build.py assert 与 game-verify nClips 两处）。

## §R12 风险与未验证项（如实）

- **儿童时长为推断非实测**：机器口径由演出窗主导；难度真实度量=±2/mid4 跨步心算
  （无步进牌可数）+dual 两步（中间态干扰诊断）+藏牌（顺数查表面拔除）。儿童估
  ch3 50-100s、ch4 80-160s（推断）；真机回归观察：ch3/4 藏牌题的 miss 分布、dual
  选 s（中间态）比例、**顺数捷径命中率**（r31 修复 M4 扩项：dual 答对者是否走
  「空房方位+顺数 1 步」捷径而非两步心算，见下 dual 可查表性披露）、藏牌后 14s
  救援触发率、±1 坡度缓冲题占比（ch4 每关仍 2 题 ±1）是否拖慢节奏。
- 5 新键注册前新 5 型题面语音静默（过渡态，§R10）；主线注册后消失。
- mid 题零藏例外（§R1）=ch4 每关 1 题 mid 仍可查表（两锚亮读中间）——双向判断
  认知仍在，但视觉查表面未拔除；若真机发现 mid 题耗时显著低于邻题，下轮考虑 mid
  藏一锚（题面语音+chip 承载锚信息，视觉盲推）。
- ±1 题在 ch3/4 藏远邻后仍可从 ref 单向推 1 步（设计内：顺数教学过渡）；±3 扩展
  位与全街随机藏=下轮候选（§R1 声明）。
- verify_one 14 腿（flat12）需主线适配（§R7 清单）；本 agent 改造后实跑确认红腿
  范围与预期一致（§R11：34/35，唯一红即此腿）。
- verify/selftest 的 modeDist 精确断言值=确定性谱推导+实测复核（§R11 回填）；谱
  端到端再验证以 pycheck 40/40 与主线复跑为准。
- **本轮两处断言初值 bug（自纠记录，r30 教训②再证）**：①crossUp===10 忽略普通 ±1
  槽随机可再中 n=19（实测 11）→ 修为 ≥10 保底口径；②B3 冒烟 engStars 期望 1——
  retries=2 实为 2★（值域未核）→ 修为 2。两处均在首轮 VERIFY 45/47 被抓、当轮修复
  后 47/47，断言判别力保留（谱漂移/星级错档仍会红）。
- **dualA 的 s=n+1 不在藏牌集**（hidden=[n-2]）——r31 修复 M1 定稿：原实现对亮牌
  房无条件「揭示→复盲」（dualJump/demoDualJump 把 s 房写成 '·'），SPEC 声称的「亮牌
  仅高亮」行为不存在+aria 仍「N 号房子」自相矛盾；修复后两处 s 段条件化（hidden 含
  s 才写牌面/复盲；dualA 亮房只加/去 reveal 高亮类，牌面恒真数字）。断言语义随修：
  game-verify B3 与 _selftest 2d/2d2 按 dualA（恒亮不被写）/dualB（揭示→复盲往返）
  双分支收紧，复现脚本 _r31_repro_fix.py 两型互补覆盖。
- **dual answer=ref 紧邻的可查表性（r31 修复 M4 披露）**：10 个 dual 题 answer 恒
  =n±1（生成律如此），即**空房恒与亮 ref 房紧邻**——视觉型孩子可「看空房方位（在
  ref 左/右）+顺数 1 步」绕过两步心算直接得 answer，维度三对视觉型退化为「±1 运算
  +方位判读」；dual 真实难度仅对「不看街、听题心算」的孩子成立。生成律无误（s 恒
  首选干扰=「忘第二步」诊断器保留），此为设计披露非缺陷；真机观察项在「dual 选 s
  比例」外扩「**顺数捷径命中率**」（答对者答题时长/视线是否落 ref 紧邻）。
  结构性根治（藏 ref 牌/空房去方位旗）与「保留玩法框架」（ref 恒亮=题面锚，
  §R1 不藏 refs 理由）冲突——**登记下轮候选**（与 mid 藏一锚候选并列，若真机发现
  捷径命中率高再动）。
