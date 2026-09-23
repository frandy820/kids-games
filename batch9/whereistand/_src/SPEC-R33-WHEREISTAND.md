# SPEC-R33-WHEREISTAND · 方位排排队难度加深改造（r33，2026-09-21）

依据：AUDIT-67 段序 7 🟡 判定「估 20-30s：**ch1-2 纯『谁在最上/最左』边缘题=4 岁级；
ch3 序数才是一年级正主**」；建议三维度（低段上探混出/两步指令/参照物翻转）。校准：
b9 段标称 6-7 岁一年级《位置》对齐，宁难勿易——r15-r32 同口径。本文件为 whereistand
的 r33 难度谱定稿；与 game-core.js 旧注释/SPEC-BATCH9 §1 冲突处以本文件为准
（r28-r31 同款声明）。**SPEC-BATCH9 §1 「方位一律屏幕方位、文案不用『它的左边』、
无镜像争议」条款由本文件显式废止（ch4 flip 题型引入动物自身方位，理由见 §R1 维度三）。**

## §R0 目标（账本 §0 摘录）

保留玩法框架（5 只动物横排/竖排、题面语音问方位、点场景动物卡单步判定、教学
看→帮→独、星级救援、存档 wis），消除「认知空心」（ch1-2 十关 4 岁级边缘题）——
改造后 ch2 起达到一年级《位置》序数+复合指令负荷，ch3-4 达到参照复合与视角翻转
负荷。验收：agent 不自验（主线独立复验）；新语音键禁自注册（§R10 TODO 清单）；
计数断言改动前已 grep 全款 `== N` 四层联动（build.py 无谱计数/verify_one_wis.py
2 处/_selftest.py 6 处/game-verify.js 12 处——清单见 §R8）。

## §R1 设计总纲（审计三建议承接方式+逐条调整理由）

**维度一·低段上探（ch1 四向混出+ch2 序数混入，纯上下/纯左右章退役）**：
- ch1（原「上下」竖排 edge up/down 交替）→ **全四向 edge**：qi0 恒 edge up（教学
  锚+章内热身，见 §R2），qi1-4=shuffled([down,left,right,up])——每关 up×2、
  down/left/right 各 1，竖排/横排随 dir 混排（up/down→vert、left/right→horiz）。
  孩子每题须重解析方向词+队列朝向（旧谱 qi%2 交替=可预测模式化应答，破除）。
- ch2（原「左右」横排 edge left/right 交替）→ **2 edge+3 ordinal 混合**：qi0 恒
  edge（热身+救援腿兼容，§R7），qi1-4=shuffled([edge,ordinal,ordinal,ordinal])，
  方向全四向随机、ordinal k∈1-5。序数（一年级正主）从第 2 章即进入，不再让
  孩子先玩 10 关 4 岁级边缘题。**纯 edge 章退役=教学链专属（flat0 qi0 恒 edge up）
  +每关 qi0 热身保留**。
- **调整理由（对审计建议的承接与微调）**：审计建议「ch1 上下+左右混出起步」
  照单采纳（上）；「ch2 起序数混入」照单采纳。微调仅一处：ch1 不进 ordinal——
  理由=ch1 的认知增量已由四向+朝向切换承载，ordinal 提前到 ch1 会使「方向词解析
  +数数起点判断」两种新负荷叠加在第 1 章（6 岁左右混淆高发期，试玩报告 2-1 实证
  左右混淆真实存在），坡度断裂；ch1 四向→ch2 序数的两步坡度与原 ch1 上下→ch2
  左右→ch3 序数三步坡度等长但整体上移一章。

**维度二·两步指令 two（ch3 主载，「从X边数第k个的Y边那只」，听题一次作答单判定点）**：
- 定义：d1（数数方向，定 orient）+k∈**2-4**（参照动物不在端点，两侧邻位恒在）
  +d2（相对方位，与 d1 同 orient）。refIdx=answerIdxOf(ordinal,d1,k)；
  answerIdx=（d2 为 up/left 起点 side）? refIdx-1 : refIdx+1。
- **k 限 2-4 的理由**：k=1/5 时参照在端点、单侧无邻（需按 d2 翻转修 d2 才合法），
  生成律复杂化且语音键族翻倍；k∈2-4 保证 d1×k×d2 全组合合法（2 orient×2 d1×
  3k×2 d2=24 组合全可达），无死角。
- **听题一次作答（单 tap），不两问两步（r24/r25 范式）——论证**：本款 UI=一题
  一排队场景单焦点，两问需双判定相位+step 语义重构=破坏「保留玩法框架」；
  **r25 M2 红线（两步中间态解锁刷救援钟）对单判定点无对象**（无「第一步对」
  部分正确态，r30/r31 同论证）；两步结构由听力负荷承载（孩子须在句内先定位参照
  再取其邻位）。**诊断性干扰天然存在**：参照动物本身（只做第一步的孩子点它）
  与反方向邻位（方向词混淆）都在 5 张可点卡内——r29 交叉断言双向覆盖（§R8 verify
  B3）。
- **「从右边数第 2 只的右边」型（d1 与 d2 同侧）保留**：数数起点与行走方向解耦
  正是一年级复合指令的辨析点，不做限制。

**维度三·参照物翻转 flip（ch4 混入，「小猫咪的左边」=动物自身方位）**：
- 定义：orient（horiz/vert 随题）+refIdx∈**1-3**（参照动物两侧邻位恒在）
  +dir2（问的边）。**镜像律**：横排 dir2=left→answerIdx=refIdx+1、right→
  refIdx-1（动物面向孩子=正面朝观察者，其左=屏幕右——一年级「面对面左右相反」
  正主）；**竖排 dir2=up→refIdx-1、down→refIdx+1（上下不镜像）**——与横排构成
  对照面，教会「左右才翻转、上下不翻转」的完整规则（只出镜像面会让孩子把翻转
  泛化成口诀）。
- **SVG 朝向视觉诚实（现状即满足的论证）**：8 只动物 SVG 全部正面朝观察者
  （双眼可见、左右对称、面向屏幕外）——「它面向你」由画面直接可读，镜像推理
  的视觉前提诚实成立，无需改 SVG。题面行 chip=参照动物头像+双向箭头图标
  （↔/↕，不指向任一侧）——携带「相对它而言」的框而不泄答案方向；若画单向
  箭头=把镜像推理答案直接画在题面（训练面崩塌）。
- **语音**：参照动物点名（8 只库全名）+边词，链式两段 clip（§R10）。
- **flip 仅 ch4 混入（每关 ≥1）**：镜像推理是本款最高负荷，前置无教学链支撑，
  靠 ch1-3 建立的方位词基础+救援阶梯（14s 重读+miss≥2 pulse）兜底。

**教学链/星级/存档零改动**：flat0 qi0 恒 edge up（教学 看→帮→独 原样可演示，
交接链 [wis_tut_turn, wis_q_up] 前提保持）；retries 0/≤2/其他=3/2/1 星；
档键 kidsgame_whereistand/sv.wis.tutSeen 不动。

## §R2 难度谱定稿（章弧/CH_LEN=5/静态 20 关/每关 5 题不动）

| 章 | 章名（**改名**） | 题型结构（每关 5 题） | 值域 | 相对 r33 前 |
| --- | --- | --- | --- | --- |
| 1 | ~~上和下~~→**最边上** | edge×5：qi0 恒 up；qi1-4=shuffled([down,left,right,up]) | dir 全四向 | 四向混出+朝向混排（原 up/down 交替竖排） |
| 2 | ~~左和右~~→**数一数** | qi0 恒 edge；qi1-4=shuffled([edge,ordinal,ordinal,ordinal]) | edge dir 四向随机；ordinal dir 四向随机 k∈1-5 | +ordinal×3/关（原纯 left/right edge） |
| 3 | ~~数一数~~→**转个弯** | qi0 恒 ordinal；qi1-4=shuffled([two,two,two,ordinal]) | two d1/d2 同 orient 四向、k∈2-4；ordinal 原域 | two×3/关 主载（原纯 ordinal） |
| 4 | 全都要（不变） | qi0-3=shuffled([edge,ordinal,two,flip])+qi4=四型随机一 | 全上 | 结构重排+two/flip 各 ≥1/关（原 2 edge+2 ordinal+1 随机） |

- 生成关（flat≥20）：每题独立 mode=['edge','ordinal','two','flip'][ri(0,3)]+
  各型参数随机（§R3）；dch 字段仍 (ch-1)%4+1 供进度显示（原样）。
- **章名/章末预告 hint 改 4 处（谱变更显式声明，r31 范式）**：
  CHAPTERS[1].name '最边上'、CHAPTERS[2].name '数一数'、CHAPTERS[3].name '转个弯'
  （章名此前无 UI 引用点——grep 实证仅 .hint 被 nextHint 使用，改名零联动面）；
  CHAPTERS[1].hint（预告 ch2）='数一数，从哪边数第几个'、CHAPTERS[2].hint（预告
  ch3）='听完再找一找，还要转个弯'、CHAPTERS[3].hint（预告 ch4）='小动物自己的
  左边右边，想一想'；CHAPTERS[4].hint 与 GEN_HINTS 四条零改动（对新谱仍贴切）。
- **锚点（结构性，机检）**：flat0 qi0 恒 edge up（教学链零改动机检前提——post 谱
  投影断言 quizzes[0]={edge,up,answerIdx:0}）；CH_LEN=5、STATIC_LEVELS=20、种子
  mulberry32(flat×7919+13)、STAR/存档语义全不动。

## §R3 生成律（确定性通道不变；verify/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)；genLevel/genOne 签名不变（modeSeq/dirSeq
  预排序语义扩型）。shuffled 消耗 rnd=len-1 次（4 元素=3 次、8 元素=7 次）；
  ri(rnd,lo,hi) 恰 1 次。
- **genLevel 预排序（flat<STATIC_LEVELS，逐章 rnd 消耗）**：
  - dch1：dirSeq=shuffled(['down','left','right','up'])（3 rnd）；
  - dch2：modeSeq=['edge'].concat(shuffled(['edge','ordinal','ordinal','ordinal']))（3 rnd）；
  - dch3：modeSeq=['ordinal'].concat(shuffled(['two','two','two','ordinal']))（3 rnd）；
  - dch4：modeSeq=shuffled(['edge','ordinal','two','flip'])（3 rnd）+push(四型
    [ri(0,3)] 掷币 1 rnd）。
  生成关（flat≥20）无预排序，逐题 mode=[ri(0,3)]。
- **genOne 逐题型参数（rnd 消耗次序=实现序，pycheck 逐位对拍）**：
  - edge：dir=dch1→（qi0='up'；qi>0=dirSeq[qi-1]）；其余=ALL_DIRS[ri(0,3)]（1 rnd）；
  - ordinal：dir=ALL_DIRS[ri(0,3)]（1）+k=ri(1,5)（1）；
  - two：o=['horiz','vert'][ri(0,1)]（1）→d1=DIRS_OF_ORIENT[o][ri(0,1)]（1）→
    k=ri(2,4)（1）→d2=DIRS_OF_ORIENT[o][ri(0,1)]（1）；
  - flip：o=['horiz','vert'][ri(0,1)]（1）→dir2=DIRS_OF_ORIENT[o][ri(0,1)]（1）→
    refIdx=ri(1,3)（1）；
  - 尾：line=shuffled(ANIMAL_IDS,rnd).slice(0,5)（7 rnd，各型同位）。
- **派生（纯函数）**：orient=DIRS[dir].orient（edge/ordinal/two 的 d1）；two 的
  orient=DIRS[d1].orient=DIRS[d2].orient；flip 的 orient=o（dir2 与 o 一致）。
  answerIdx：edge/ordinal=answerIdxOf 原公式；two=（d2∈{up,left}）? refIdx-1 :
  refIdx+1，refIdx=answerIdxOf('ordinal',d1,k)；flip=horiz?（dir2='left'?
  refIdx+1:refIdx-1）:（dir2='up'? refIdx-1:refIdx+1）。q 字段：two={mode,dir=d1,
  k,dir2,orient,line,answerIdx}；flip={mode,dir:null,k:null,dir2,refIdx,orient,
  line,answerIdx}（q.animal=line[refIdx] 运行态派生不入档谱）。
- **rnd 流影响面（40 关全刷新=本轮设计意图，非回归）**：ch1 预排序前移 3 rnd→
  flats 0-4 全刷新（含 qi0 的 line）；ch2/3/4 同理 flats 5-19 全刷新；生成关
  mode 掷币 4 选→flats 20-39 全刷新。**谱保留面=结构性**：flat0 qi0 {edge,up,
  answerIdx:0}、CH_LEN=5、200 题、确定性双跑一致（§R6 对照）。
- **structWhy 扩展**：two 分支（dir/d2∈ALL_DIRS 且同 orient、k∈[2,4]、answerIdx
  上述公式复算）；flip 分支（dir2 与 orient 一致、refIdx∈[1,3]、answerIdx 镜像
  律复算）；edge/ordinal 分支原样；line 互异在库原样。
- 分布护栏（精确值=构造性，§R11 实测复核）：ch1 edge=25、up=10、down/left/
  right 各 5；ch2 edge=10+ordinal=15；ch3 two=15+ordinal=10；ch4 四型各 ≥5
  （基 5+qi4 掷币增量）；生成关四型各 ≥1；ordinal k 1-5 各 ≥1、two k 2-4 各 ≥1
  （随机性口径用 ≥ 下限，r31 crossUp 教训——精确值非构造断言不写死）。

## §R4 交互与救援（lastAct 纪律核对：r23 P1-1/r24 M1/r25 M2/r30 三 major）

- **lastAct 触点（现状全保留，零新增触点）**：答对推进刷/兔兔/重玩/听题/点题面卡/
  空白轻提示节流——新题型 two/flip 全部走既有 uiTapSlot 单步路径，无新演出窗、
  无新解锁相位、无新增 setTimeout/setInterval。
- **r25 M2 不适用论证（§R1 维度二）**：two/flip 单判定点无「第一步对」中间态
  （听题一次作答），无解锁相位→无中间态解锁刷钟对象；救援 14s 门在答对演出窗
  被锁（原样），miss≥2 pulse 阈可达（4 张错卡，r30 教训②值域可达性核对）。
- **r30 演出窗×用户行动矩阵自查**：新题型无新演出窗——答对演出窗（950ms×SPEED
  locked 全程+cur!==run 身份守卫）/答错晃动窗（480ms）/教学演示窗均原样；renderChip
  纯同步 DOM 无窗。重入面与 r33 前逐点一致，无新增交叉。
- **救援链（原样）**：14s 门+1s 轮询触发窗 [14,15]s（r31 统一口径）；救援=重读
  题面（two/flip 走 queue 链，过渡态缺 clip=hint 段后静默放弃，视觉 breathe 兜底
  仍在）+正确卡 breathe；错点/空白/探索点击不重置钟。
- **教学链零改动**：tutorialWatch/pointHelpNext/交接链原样（flat0 qi0 恒 edge up
  ——post 谱机检）。

## §R5 引擎与钩子（向后兼容）

- game-core.js：genOne 四型分派+genLevel 预排序扩型+structWhy 两新分支；
  **engTap/engStars/engWon/mulberry32/shuffled/ri/answerIdxOf(edge,ordinal)/
  chOfFlat/diffOfCh 逐行不动**（判定面零改动——two/flip 也是单步 answer 点选）。
- game-data.js：CHAPTERS 3 改名+3 hint 改文案；**VOICE 7 条零改动**；新增 WIS2
  链段表（§R10 文案）+twoCn/flipCn 拼句（aria/对账）+ICONS.mirrorH/mirrorV；
  ANIMALS/animalSvg/sceneSvg/DIRS/NUMC5 零改动。
- game-main.js：speakQuiz/openingSpeak 增 two/flip 分支（queue 2/3 段链）；
  renderChip 增 two（双箭头+第k个）/flip（动物头像+↔/↕）分支；WIS.quiz getter
  增 dir2/refIdx/animal 三字段（既有 mode/dir/k/orient/line/answerIdx/answered/
  step/miss 零变化，dir 对 flip=null）；uiTapSlot/winFlow/proceed/startLevel/
  教学链/底栏/看护循环零改动。
- **WIS 钩子**：currentLevel/tapSlot/autoSolve/tutorial 原样（autoSolve 点
  answerIdx 对四型通吃）。

## §R6 基线证据（双证据+谱变更显式声明，r27-r31 范式；工具随款归档 _src/）

- **证据①（前后谱对照）**：改造前 index.html（md5 7abc529b…863742 chars）
  提取 40 关 quizzes JSON=r33-baseline.json；改造后=r33-post.json（提取器
  _r33_extract.py 归档 _src/；投影口径 [mode,dir,k,dir2,refIdx,answerIdx]，
  baseline 旧题型无 dir2/refIdx=null 防假差异，r31 同口径）。
  - **保留（结构性，机检）**：flat0 qi0={edge,up,answerIdx:0}（教学锚）；CH_LEN=5、
    200 题、40 关确定性双跑一致。
  - **变更（预期=设计意图）**：**40/40 关全刷新**（ch1-4 预排序前移 rnd 流+生成关
    mode 掷币，§R3 影响面）——与 r31「ch1-2 保留」不同：本款 hollow 面恰在 ch1-2，
    全谱上移是改造本体；刷新面以投影逐关 diff 计数披露（§R11）。
- **证据②（Python 独立复算）**：_r33_pycheck.py 按 §R3 生成律 Python 独立实现
  genLevel（mulberry32/shuffled r26-r31 同源副本，含 line 全字段），与页内提取
  40 关全量对拍 **PYCHECK 40/40 identical**。
- **证据③（verify 规则断言）**：40 关逐关新谱合规（§R8①：四章结构律/two 公式/
  flip 镜像律/交叉断言）。
- **证据④（真实页真实点击）**：_selftest 2c1/2c2（two/flip 真实通关+镜像律断言）；
  真页截图 _shots/。

## §R7 存档与兼容（verify_one_wis.py 逐腿清单）

无档结构变化：档键/levels 'ch-lv'/CH_LEN/STATIC_LEVELS/日历/sv.wis.tutSeen 全不动；
无新增落档字段（two/flip 均运行态）。旧档通关星级与新谱无矛盾（题面全刷新、
星级语义不变，r20-r31 同款声明）。

**verify_one_wis.py（主线腿）逐腿核对（基线实测 15/17 两条存量红非 r33 引入；r33 后实测
16/17——唯一红=⑩，⑧ 本轮通过=竞态窗实证，红腿面 ⊆ 基线存量红）**：
| 腿 | 判定 | 说明 |
| ① verify title | 兼容 | game-verify 断言已联动（§R8） |
| ② flat1 真实通关 | 兼容 | flat1 qi0=edge up 热身锚；answerIdx 通用驱动 |
| ③ 双 viewport | 兼容 | flat1=dch1 混排（qi0 vert）；5 卡布局不变 |
| ④ 离线 / ⑤ 截图 | 兼容 | 无外链；flat5 qi0=edge（dch2 结构锚）正常渲染 |
| ⑥ 钩子 | 兼容 | WIS 四钩子原样+新字段只增 |
| ⑦ 0 pageerror | 兼容 | — |
| ⑧ 教学吞输入 | **存量红（基线已红）** | 判据 st1==st0 与教学演示 1920ms 完成点存在 ~150ms 竞态窗（st0 读点落入演示后即假红）；基线 15/17 实证非 r33 引入，登记主线 |
| ⑨ 首错零惩罚不 pulse | 兼容 | flat1 qi0 edge；wig/breathe 路径原样 |
| ⑩ sayW 三态 flat5 | **存量红（基线已红）** | 断言查 `K:null` 但 T46 阶段2 wis_wrong 已 clip 化（manifest 在册）→ wrongv 恒空；基线 15/17 实证非 r33 引入，登记主线（判据应改查 `K:wis_wrong`） |
| 11a/11b 救援 flat5 | 兼容 | **dch2 qi0 恒 edge 是兼容锚**（§R1 维度一微调动机之二）：救援重读=wis_q_* clip，腿的 `K:wis_q` 过滤器命中 |
| 12 clips 对账 | 兼容 | len(wis_keys)>=10 宽松断言；31→59 注册后仍过（新键字符串在 src VOICE/WIS2 表中） |
| 13 教学窗点重玩 | 兼容 | 教学链零改动 |

## §R8 verify/_selftest/build 适配清单（四层联动）

- **game-verify.js**：① 审计循环四章规则断言全量重写（ch1 edge5+up2+down1+left1
  +right1+qi0.up 锚；ch2 edge2+ordinal3+qi0.edge 锚；ch3 two3+ordinal2+qi0.ordinal
  锚；ch4 四型各 ≥1；生成关 structWhy 把关）+two/flip structWhy 分支生效；
  **新增 B3 新题型深冒烟**（two：驱动至 two 题→参照位误点 'wrong'+反向邻位误点
  'wrong'+答对 'goal'——r29 交叉断言双向；flip：驱动至 flip 题→**镜像律断言
  （horiz dir2=left→answerIdx=refIdx+1 / vert 不翻转）**+朴素侧误点 'wrong'+
  chip 动物头像 data-a=line[refIdx]+答对 'goal'）；④ B1 flat10 扩（two3/ordinal2+
  序数大字+two chip 双箭头取证）/B2 flat17 扩（四型各 ≥1）；⑤ 布局四形态改
  （vert edge flat0 q0/horiz edge/horiz two/horiz flip——后三者按谓词扫描定位
  quiz 后置 step）×双 viewport=8 sims；⑥ dist 全量重写（§R3 护栏+twoK 覆盖+
  新型链 stub：speakQuiz 直调 two/flip 断 queue 链键序+openEdge flat0 保留）。
  总单元 47→**48**（+B3；§R11 实测）。
- **_selftest.py**：2c1 flat10 改（two3+ordinal2 结构+two 公式独立复算+真实通关）；
  2c2 flat17 改（四型在场+flip 镜像律独立复算+真实通关）；2d 横排腿改（flat7 qi0
  dir 随机→谓词扫描 horiz quiz 置 step 再量，竖排腿 flat0 原样）；2a/2b/救援腿
  flat0/flat3 零改动；MUTE_JS（r28 定稿 function 版）+种档完整 core 字段原样。
  断言数 44→**45**（2c1 two 公式并入既有 ch3 结构断言、2c2 +1 flip 镜像律；§R11 实测 45/45）。
- **build.py**：新增硬性检查 4（r30/r31 结构锚）：engine 含 two/flip 生成分支+
  structWhy 分支标记、data 含 wis2_from_/wis2_name_ 文案表、main 含 wis2_go_/
  wis2_side_ 链构造、verify 含 flipMir/twoCross 断言锚；clips 注入注释补过渡态
  声明（§R10）。
- **主线侧（声明不实施）**：①gen_clips 注册 28 新键（§R10）+manifest 5114→5142（r33 收官时点实值 5167——共享 manifest 随他款注册持续增长，r33 审查 m2 勘正：对账以收官复验数字为准）；
  ②verify_one_wis.py ⑩判据 K:null→K:wis_wrong、⑧教学竞态判据收窗（§R7）。

## §R9 时序参数实测口径（r23 P2-1 红线：逐调用点对照实现核，SPEC 值=实现值）

r33 **零新增时序面**——新题型无新演出窗/演示段/定时器，全表与 r33 前逐行一致：

| 参数 | 值 | 调用点 | 口径 |
| --- | --- | --- | --- |
| 答对演出窗 | 950ms×SPEED | uiTapSlot right await | 原样 |
| 答错晃动窗 | 480ms×SPEED | uiTapSlot wrong await | 原样 |
| 教学演示节奏 | 700/900/320/1000ms×SPEED | tutorialWatch | 原样（零改动） |
| 教学 help 指向 | 600ms setTimeout | tutorialWatch 尾 | 原样 |
| ghost 按压 | 800ms setTimeout | pointGhostAt | 原样 |
| 看护轮询 | 1000ms setInterval | 无操作看护 | 原样 |
| 救援门 | 14000ms（1s 轮询→触发窗 [14,15]s） | 无操作看护 | 原样（r31 统一口径） |
| 教学 help 重演示 | 5000ms | 无操作看护 | 原样 |
| 纠错语音节流 | 10000ms | sayW（flat≥3） | 原样 |
| 空白提示节流 | 10000ms | stage 空白分支 | 原样 |
| 章末/日末推进 | 3400ms setTimeout | winFlow | 原样 |
| queue 段间停顿 | 150ms | core voice.queue | 原样（two/flip 链 2-3 段沿用） |

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest）

**新增 28 键**（前缀 wis2_ 已 grep manifest/gen_clips 核零占用：现 whereistand 在册
31=core 3+wis_ 28）。四族（链式两段，段间 150ms=子句停顿，r31 neb_dual 先例）：

| 族 | key | 文案（clip 合成文本） | 用途 |
| --- | --- | --- | --- |
| 数数参照段 | wis2_from_{left\|right\|up\|down}_{2\|3\|4}（12 键） | 从X边数，第N个 | two 题面链段 1 |
| 相对方位段 | wis2_go_{left\|right\|up\|down}（4 键） | 它的X边，是谁呀 | two 题面链段 2 |
| 动物点名段 | wis2_name_{rabbit\|cat\|dog\|bear\|elephant\|monkey\|frog\|duck}（8 键） | 小兔子/小猫咪/小狗/小熊/大象/小猴子/小青蛙/小鸭子（与 ANIMALS.name 逐字一致） | flip 题面链段 1 |
| 自身边位段 | wis2_side_{left\|right\|up\|down}（4 键） | 的X边，是谁呀 | flip 题面链段 2 |

- 题面链：two=[hint?, wis2_from_d1_k, wis2_go_d2]（开场 3 段/重听 2 段）；
  flip=[hint?, wis2_name_a, wis2_side_d2]（同）。单键 56 组合（two 24+flip 32）
  不 clip 化而链式 28 键的理由：族内复用（from×go 交叉 24=12×4 中 two 用 12×4
  内 24 组合、name×side 32 组合全用）且段间停顿落子句边界（prosody 损失≈0），
  r31 [neb_n_n, neb_dual_a] 同型先例。
- **注册前过渡态（r29 m3/r31 §R10 先例）**：core queue 缺 clip 且无文本=**放弃
  整句**——two/flip 题面链在 hint 段后静默终止（console.warn 非 pageerror）；
  视觉/交互/演出/救援 breathe 完整不受影响（selftest 2c1/2c2 在缺 clip 态全绿
  为证）；主线注册后自动完整。verify ⑥ 对新键**零存在性断言**（链结构经 stub
  键序断言），clips 注入段 build.py 注释留过渡态声明。
- gen_clips 注册建议格式（沿 wis_ord 先例）：`T46('wis2_from_%s_%d' % (dcn, k),
  '从' + dcn + '边数，第' + kcn + '个', 'whereistand')` 四族循环（文案与
  game-data.js WIS2 表一字一致——gen_clips 从源表正则提取，SPEC-BATCH9 §0.18）。

## §R11 验收数字（Executor 自测门禁，2026-09-21 实测——主线独立复验为准）

| 门禁 | 结果 | 数字 |
| --- | --- | --- |
| build 双跑幂等 | **PASS** | **终态 md5 d1aee049f1992a75aaac0be9b16b00cf** ×2；883300 bytes / 867662 chars（基线 7abc529b110634201edeae659fa44ec3 / 863742 chars）。注：过程中间记录 4e439f4d…=w2Texts 样例断言修复（verify ⑧上边/下边）**前**的幂等双跑；该修复仅动 game-verify.js，终态=修复后源重建，双跑幂等已复核 |
| VERIFY 双视口 | **PASS** | 1280×800 **48/48** + 800×1180 **48/48**（title=VERIFY PASS；0 pageerror）；**终态产物 d1aee049 上复跑同绿** |
| _selftest 全项 | **PASS** | **45/45**（基线 44；**终态产物 d1aee049 上复跑同绿**）；含 2c1 two 通关 chip seen=3、2c2 flip 通关 chip seen=1、救援 firstAt=11390ms（wrapT 后，相对加载≈13.9s=14s 门起点回算吻合） |
| verify_one_wis.py | **16/17** | 唯一红=⑩ sayW 存量红（§R7，基线两条之一；⑧ 教学腿本轮**通过**——基线红为 ~150ms 竞态窗实证）；11a/11b 救援腿 `rescue=['K:wis_q_down']` 过滤器命中（dch2 qi0=edge 兼容锚生效） |
| 谱对照（证据①） | **PASS** | baseline/post JSON 归档 _src/；40/40 关全刷新=设计意图（§R3 影响面）；**flat0 qi0={edge,up,answerIdx:0} 与 baseline 逐字节一致**（教学锚机检）；投影逐题相同 19/200 |
| 分布实测（构造性精确值） | **PASS** | ch1 edge25/ch2 edge10+ordinal15/ch3 two15+ordinal10/**ch4 edge6+ordinal6+two8+flip5**；40 关 mode 计数 edge58/ordinal64/**two49/flip29**（基线 edge112/ordinal88）；生成关 edge17/ordinal33/two26/flip24；dirDist up43/down53/left54/right50；k=[11,16,15,12,10]；twoK=[18,17,14] |
| pycheck（证据②） | **PASS** | **PYCHECK 40/40 identical**（含 line 全字段，[_r33_pycheck.py](../_src/_r33_pycheck.py)） |
| B3 新题型交叉面 | **PASS** | twoFlat=10 twoQi=1（参照位+反向邻位误点均 wrong→2★）；flipFlat=15 flipQi=3（镜像律+朴素侧+点参照动物均 wrong→2★）；flipUi 真实 DOM chip 头像对账+wig+goal |
| 链 stub（⑥） | **PASS** | twoFirst=18/flipFirst=22 开场三段链 [wis_hint,from,go]/[wis_hint,name,side]；重听 speakQuiz 直调两段链；WIS2_TEXTS 28 键互异+样例全对 |
| 真页视觉取证 | **PASS** | _shots/r33-flip-chip-800x1180.png（兔子头像+双向左右箭头+问号、5 卡无溢出，VLM 复核确认）；_shots/r33-two-chip-800x1180.png（chip 189×66、双箭头 DOM 断言 seen=3 覆盖） |

## §R12 风险与未验证项（如实）

- **儿童时长为推断非实测**：难度真实度量=two 复合指令听力负荷（参照+邻位两步）+
  flip 镜像推理（左右翻转/上下不翻转对照）+ch1 四向重解析。儿童估 ch1 30-60s、
  ch2 50-90s、ch3 70-130s、ch4 90-180s（推断）；真机回归观察：two 题参照位误点
  （只做第一步）比例、flip 横排朴素侧误点（未翻转）比例、flip 竖排过度翻转
  （泛化口诀）比例、ch4 flip 题 miss 分布、缺 clip 过渡态真机听感。
- 28 新键注册前 two/flip 题面语音静默（过渡态，§R10）；主线注册后消失。
- flip 镜像律的教学面=chip 动物头像+双向箭头（不泄方向）+救援重读+breathe——
  **无专门的镜像概念演示动画**（mirror 款试玩「章 2 概念断层」教训：镜面翻转
  需教学过渡）；本款 flip 在 ch4 且有 ch1-3 方位词地基，风险低于 mirror 章断崖，
  但真机若发现 flip 题连续 miss≥3 高发，下轮候选=flip 首次出现时加 10s 镜像
  演示动画（「小猫面向你，它的左手在这边」）。
- ch1 qi0 恒 up 使每关首题答案恒 idx0（最上）——模式化应答面收窄到首题；qi1-4
  洗牌防模式化。qi0 固定的动机=flat0 教学锚+每关热身+verify_one 11a/11b 救援腿
  兼容（flat5 救援重读 wis_q_* 命中腿过滤器）——三重收益对冲首题可预测性。
- two d1/d2 同向（「从右边数第 2 只的右边」）对部分孩子=听觉工作记忆超载题；
  不做硬性剔除（辨析正主），miss≥2 pulse 兜底。
- verify_one_wis.py ⑧/⑩ 两条存量红（基线已红，§R7）——主线适配建议已给；
  本 agent 改造后实跑确认红腿范围与基线一致（§R11）。
- verify/_selftest 的分布断言=构造性精确值+随机面 ≥ 下限（§R3）；谱端到端
  再验证以 pycheck 40/40 与主线复跑为准。
