# SPEC-R36-SIGN · 交通标志难度加深改造（r36，2026-09-21）

依据：AUDIT-67 段序 10 sign 🟡 判定「会话736s/约11关：**半数有新知+ch3 近对辨析；
12 标志封闭库小**」；建议三维度（库 12→24 含近对族 / ch2 起恒 4 选+标志闪现观察题 /
加「看标志选行为」）。校准：b26 段标称 6-7 岁宁难勿易——r15-r35 同口径。本文件为
sign 的 r36 难度谱定稿；与 game-core.js/game-data.js 旧注释/SPEC-BATCH26 §0.61/§1
冲突处以本文件为准（r28-r34 同款声明）。SPEC-BATCH26 §0.61「标志封闭 12、近对封闭
2 对、ch1 行走安全 4、ch2 红圈蓝牌 8」由本文件显式废止（24 封闭/9 近对对新谱）。

## §R0 目标

保留玩法框架（街景题面+标志大图+题面句 clip、4 含义卡点选单步判定、教学看→帮→独、
14s/30s 双锚救援、星级、存档 kidsgame_sign），消除「封闭库小、两章后查表化」——
改造后：库 12→**24**（9 近对对）、ch2 起加**闪现观察题**（视觉工作记忆负荷）、
ch4 加**行为题**（标志→正确做法应用迁移）。验收：agent 不自验（主线独立复验）；
新语音键禁自注册（§R10 TODO 清单 15 键）；计数断言改前 grep 全款 `== N` 四层联动
清点（§R8）。

## §R1 设计总纲（审计三建议承接方式+逐条调整理由）

**维度一·库 12→24 含近对族（主承重）**：
- 新增 12 标志（GB 5768 儿童相关真标志，单行表格式与旧 12 完全一致——主线
  gen_clips T46 正则 `(\w+):\s*\{\s*n:'…',fam:'…',m:'…',sent:'…'` 可直接提取 24）：
  - 红圈族 +2：**nocar 禁止驶入**（红圈白杠）/ **nobike 禁止自行车**（红圈+自行车）；
  - 新族红倒三角 redtri +1：**yield 减速让行**（红倒三角+「让」）；
  - 红圈族 +1：**horn 禁鸣喇叭**（红圈+喇叭）；
  - 黄三角族 +4：**cross 交叉路口** / **turn 急弯路** / **slip 易滑** / **rail 铁路道口**；
  - 新族蓝圆圈 bluec +3：**straight 直行** / **goleft 向左转弯** / **goright 向右转弯**；
  - 蓝底方族 +1：**walk 步行街**（蓝底方+白色行人）。
- **近对 2→9 对（18 成员）**：noentry↔nocar（红杠白杠）/ noped↔nobike（人形车形）/
  stop↔yield（八角/倒三角）/ ped↔child（原）/ cross↔turn（道路形近字）/
  slip↔slow（慢语义孪生）/ oneway↔straight（方/圆同箭头）/ goleft↔goright（左右向）/
  zebra↔walk（蓝底行人双牌）。rail/work/horn/bridge/tunnel/light 无伙伴不进 ch3 池
  （rail 于 ch2 域内首见，承接旧「无伙伴不进 ch3」律）。
- fam 封闭 5→**7**（red5/redoct1/redtri1/yellow8/blue5/bluec3/signal1=24）；GUIDE
  引导句 7 族（新 redtri/bluec 两句，sgn_guide_ 5→7——§R10 TODO）。
- 「ch2 起恒 4 选」现状已满足（本款含义卡恒 4），本维度无额外动作。

**维度二·标志闪现观察题 flash（ch2 起）**：
- 定义：题面标志亮相 **FLASH_MS=1800ms** 后被「?」面板遮住（DOM 不移除、布局不动），
  含义卡恒可点（提前作答=已看到标志，不罚）。遮住后凭视觉记忆作答=真观察负荷
  （对 6-7 岁=图形工作记忆正载）。
- 出题位：dch2 每关 **2** 题（5 位洗牌任取 2）、dch3 每关 **1** 题（qi1-4 随机 1 位，
  qi0 恒不闪=关卡开门题）、dch4 boss 题（见维度三）、dch1 不闪（首章热身+教学链
  flat0 锚点零改动）。生成关按所在 dch 同律。
- **救援让步（r24 救援语义扩展声明）**：14s 方向级救援在 flash 题已遮住时=**重闪**
  （揭面 1200ms 再遮回，reflashCover 顶层函数）——方向级救援语义从「重读题面」扩为
  「重读题面+（flash 题已遮时）重看标志」；答案级（30s）不重闪（breathe 兜底）。
  救援自读不重置 lastAct 防自喂（原律不变）；重闪 timer 入 §R9 时序表。

**维度三·看标志选行为 act（ch4 主载）**：
- 定义：题面=标志大图（同 mean），题面句换 **「看到这个标志，怎么做」**（TODO 键
  sgn_q_act，注册前静默——§R10 过渡态）；4 卡=**行为卡**（ACT 行为短语 3-6 字 +
  ACT_ELS 行为图标），正确=ACT[sign]，干扰=**同 fam 优先**（fam 单员 redoct/redtri/
  signal 退域内随机——沿用 dch2 同系优先律）。卡片渲染/判定/星数/救援与 mean 卡
  完全同路径（卡内 id 空间=标志 id，引擎 engTapCard 零改动）。
- **干扰=安全行为互辨（非好坏是非题）**：act 干扰取其他标志的 ACT 短语（cbx 两选
  好坏分明=4-5 岁是非题的反面教训）——孩子须回看标志图案细节才能在 4 个「都像做法」
  的行为中选对（如 sign=goleft 时 goright 的「往右边转弯」在场）。
- 出题位：**仅 dch4**（含生成关 dch4）每关 **2** act 题；dch1-3 不出（act 需要
  mean 通道建立的标志-含义映像做地基，两步坡度）。

**章谱（§R2 表）+教学链/星级/存档零改动**：flat0 qi0 恒 light mean 不闪（教学
看→帮→独原样可演示）；retries 0/≤2/其他=3/2/1 星；档键 kidsgame_sign/sv.sign.tutSeen
不动。

## §R2 难度谱定稿（CH_LEN=5/静态 20 关/每关 5 题不动）

| 章 | 章名（**ch2 改名**） | 池 | 每关 5 题结构 | 相对 r36 前 |
| --- | --- | --- | --- | --- |
| 1 | 走路安全（不变） | 行走安全 **5**（light/zebra/bridge/tunnel/**walk**） | mean×5 不闪；目标池轮换（qi0 起 offset 旋转）；含义卡=池内 4/5（正确+池内随机 3） | 池 4→5（walk 新知入章；4 全集卡→4/5 淘汰排除法变难） |
| 2 | ~~红圈蓝牌~~→**红圈黄三角** | 禁令+警示 **15**（red5+stop+yield+yellow8） | mean×5 其中 **flash×2**（5 位洗牌取 2）；目标池随机相邻互异；干扰同 fam 优先 | 池 8→15（8 新标志首见）+闪现×2 |
| 3 | 像不像（不变） | 近对池 **18**（9 对成员） | mean×5 全近对（伙伴必在场）其中 **flash×1**（qi1-4 随机） | 池 4→18（9 对辨析）；+boss 位闪现近对 |
| 4 | 大挑战（不变） | 全 **24** | [near-mean, near-mean, **act**, **act**, **boss**] 洗牌（boss=near+flash+mean） | 全池混合+**act×2**+boss 闪现（原掷币近对≥2） |
| ≥20 | 生成关 | 同所在 dch | 同上（dch=ri(1,4) 先取数保确定性，b25 坑④） | 同 |

- 章末预告改文案 3 处（谱变更显式声明，r31 范式）：CHAPTERS[1].hint（预告 ch2）
  ='红圈圈和黄三角要来啦'、CHAPTERS[2].hint（预告 ch3）='长得像的标志要仔细看哦'
  （零改动）、CHAPTERS[3].hint（预告 ch4）='大挑战，还要想想怎么做'；CHAPTERS[2].name
  ='红圈黄三角'；GEN_HINTS[1]='红圈黄三角，都认得啦'、GEN_HINTS[3]='标志大集合，
  想好了再做'；其余零改动。C7 关键词断言联动（§R8）。
- **首见地图（谱内显式）**：ch1=walk；ch2=nocar/nobike/horn/yield/cross/turn/slip/
  rail（8 新）；ch3=straight（对已知 oneway）/goleft↔goright（互为首见）；ch4=无
  首见纯混合。bluec 三款在 ch3 以近对形态首见=设计意图（辨析章导入，straight 借
  已知 oneway 锚）。
- **锚点（结构性，机检）**：flat0 qi0 恒 {sign:'light', kind:'mean', flash:false}
  （教学链零改动机检前提）；CH_LEN=5、STATIC_LEVELS=20、种子 mulberry32(flat×7919+13)、
  星级/存档语义全不动。

## §R3 生成律（确定性通道不变；verify/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)；genLevel/specSeqOf/buildQuiz 分层不变。
  shuffled 消耗 rnd=len-1 次；ri(rnd,lo,hi) 恰 1 次。
- **genLevel**：`rnd=mulberry32(...)`；flat≥20 → dch=ri(1,4)（1 rnd）否则 diffOfCh
  （0 rnd）；specs=specSeqOf(dch,rnd,flat)；逐 spec buildQuiz。
- **specSeqOf（rnd 消耗次序=实现序，pycheck 逐位对拍）**：
  - dch1：s0 = flat===0 ? 0 : floor(rnd()*5)（1 rnd，flat0 零消耗）；seq=池 5 旋转
    （qi=(s0+qi)%5），kind='mean'，flash=false；
  - dch2：fp=shuffled([0,1,2,3,4])（4 rnd）取 fp[0]/fp[1] 为 flash 位；5×
    pickDiff(DENY15)（每次 ≥1 rnd+≤8 重掷）；kind='mean'；
  - dch3：fp=ri(1,4)（1 rnd）该位 flash；5× pickDiff(NEAR18)；kind='mean'，near=true；
  - dch4：kseq=shuffled(['nm','nm','act','act','boss'])（4 rnd）；每槽目标 pickDiff
    （nm/boss∈NEAR18、act∈ALL24）；kind：nm='mean'/act='act'/boss='mean'；
    near：nm/boss=true、act=false；flash：仅 boss=true。
- **buildQuiz（干扰律）**：
  - dch1 mean：ds=shuffled(POOL5\\{s}).slice(0,3)（4 rnd；**勘正（审查 O2）：此为 s0(1)+ds(3) 合并口径——POOL5 去掉 s 后 4 元素 shuffle 本身消耗 3 rnd**）；
  - dch2 mean：同 fam 优先（shuffled(域内同 fam) 取 3；不足域内随机补足）；
  - near（dch3/dch4 nm/boss）：ds=[NEAR[s]]+shuffled(ALL24\\{s,NEAR[s]}).slice(0,2)
    （21 rnd）；
  - act：同 fam 优先取 3（fam 池=ALL24 内同 fam；单员 fam 退全域随机）；
  - 尾：order=shuffled([s].concat(ds))（3 rnd）→ cards id='s'+j。
- **rnd 流影响面（40 关全刷新=设计意图，非回归）**：ch1 池 4→5（s0 取数域变+ds 洗
  4 元）；ch2 池/干扰域变+flash 洗牌前插 4 rnd；ch3 池 4→18+fp 取数；ch4 结构重排
  ——flats 0-39 全刷新。**谱保留面=结构性**：flat0 qi0={light,mean,不闪}、CH_LEN=5、
  200 题、确定性双跑一致（§R6 对照）。
- **structWhy 扩展（全量重写）**：dch1 目标/卡∈行走 5 池；dch2 目标∈禁令 15+
  flash 数==2；dch3 目标∈近对 18+伙伴在场+flash 数==1 且 qi0 不闪；dch4 构成恰
  [nm×2,act×2,boss×1]（act 数==2/flash 数==1/nm 伙伴在场/boss 近对在场）；公共：
  cards 4 互异∈ALL24、恰 1 正确、kind∈{mean,act}、相邻互异、初始态干净。
- 分布护栏（构造性精确值）：dch1 flash=0；dch2 flash=2×5=10/章；dch3 flash=5/章；
  dch4 act=10/章、flash=5/章；40 关 act 计数=10×(5+生成关 dch4 数)（≥ 下限口径
  写 verify：随机面 ≥ 构造下限，r31 crossUp 教训）。

## §R4 交互与救援（r23-r34 逐条自查）

- **重入矩阵（r30/r34 F1）门族一致性清点**：locked 门=uiTapCard 入口（演出窗/错窗
  ）+autoSolve/demo 通道豁免——**零新增门**；flash 遮面不设门（遮面期点卡=合法
  作答）；act 卡与 mean 卡共用 uiTapCard 全部门。底栏四按钮（兔兔/重玩/听题/题面）
  监听器零改动；教学演示门（state.demo）零改动。
- **cur!==run 身份守卫**：uiTapCard 既有三处检查点原样；flash 的 cover/reveal timer
  不跨关存活（renderScene 入口 clearBoth，§R9）——无旧续体错推进面。
- **时序面新增清单（r31/r34）**：flash cover timer（1800ms×SPEED）、rescue reflash
  reveal timer（1200ms×SPEED）——全量入 §R9 表；其余时序面零改动。
- **多步状态机中间态（r25 M2）**：act/flash 均单步单判定点（点卡即判），无「第一步
  对」部分正确态——不卡死不双计由 engTapCard 原语义保证。
- **救援 idle 锚刷新语义（r24 M1）逐一声明**：答对推进=刷 lastAct（原）；兔兔/重玩/
  听题/点题面=刷 lastAct（原）；空白轻提示=不刷（原）；**重闪（reflashCover）=不刷
  lastAct**（救援自读族防自喂，与方向级 lastDir 同律）；错点=不刷（原）。
- **r30 演出窗×用户行动矩阵**：新交互面仅 flash 遮面（无锁窗）；演出窗（判对 5400/
  错 1000/教学演示）与用户行动（连点/重玩/听题/兔兔）交叉行为与 r36 前逐点一致。
- **谱全刷新声明（r28/r32/r34）**：40/40 关全刷新（§R3 影响面）；结构锚保留面=
  flat0 qi0{light,mean,不闪}+CH_LEN+确定性；baseline/post 对照归档 _src/（§R6）。

## §R5 引擎与钩子（向后兼容）

- game-core.js：specSeqOf/buildQuiz 按新谱重写+structWhy 全量重写；
  **engTapCard/engWon/engStars/correctIdx/mulberry32/shuffled/ri/chOfFlat/diffOfCh
  逐行不动**（判定面零改动——act 卡 meaning=标志 id 同一判定式；flash 纯 UI 层）。
- game-data.js：SIGNS 12→24（单行格式不变）、NEAR 2→9 对、POOL 常量（WALK5/DENY15
  /NEAR18/ALL24）、SYSTEM/FAMS 7 族、GUIDE 7 句、CHAPTERS/GEN_HINTS 文案 4 处、
  ACT 表 24+ACT_ELS 24+SIGN_ELS+12+MEAN_ELS+12、ACT_Q 文案常量、FLASH_MS=1800；
  VOICE 6 条零改动。
- game-main.js：renderScene（flash 遮面 timer+act/mean 题面句分流）、renderBoard
  （act 卡分支：ACT 短语+ACT_ELS+long-label 类）、speakQuiz（kind 分流 sgn_q/
  sgn_q_act）、wrongChainUntil 6700→**7000**（引导句最长 9 字，§R9）、rescue 方向级
  reflashCover 分支、SG.quiz getter 增 kind/flash 两字段（只增）；uiTapCard/winFlow/
  proceed/startLevel/教学链/底栏/看护循环骨架零改动。
- **SG 钩子**：currentLevel/tapCard/autoSolve/tutorial 原样（autoSolve 点 correctIdx
  对 mean/act 通吃）。

## §R6 基线证据（双证据+谱变更显式声明；工具随款归档 _src/）

- **证据①（前后谱对照）**：改造前 index.html（md5 bb3c43e070fdc8b7eff8655bdf7d7de3
  /722153 bytes）提取 40 关 quizzes=r36-baseline.json（200 题 kind=mean/flash=0）；
  改造后=r36-post.json（提取器 _r36_extract.py，投影口径 [sign,kind,flash,near,
  cards[]]，baseline 旧谱无 kind/flash——提取器补默认值防假差异，r31 同口径）。
  保留面：flat0 qi0={light,mean,不闪}；200 题；40 关确定性双跑一致。变更面：40/40
  全刷新=设计意图（§R3）。
- **证据②（Python 独立复算）**：_r36_pycheck.py 按 §R3 生成律 Python 独立实现
  genLevel（mulberry32/shuffled r26-r33 同源副本），与页内提取 40 关全量对拍
  PYCHECK 40/40 identical。
- **证据③（verify 规则断言）**：40 关逐关新谱合规（§R8①：四章结构律/近对在场/
  act 构成/flash 计数/封闭表独立对账）。
- **证据④（真实页真实点击）**：_selftest act/flash 腿真实驱动+真页截图 _shots/。

## §R7 存档与兼容（verify_one_sign.py 逐腿清单）

无档结构变化：档键/levels 'ch-lv'/CH_LEN/STATIC_LEVELS/日历/sv.sign.tutSeen 全不动；
kind/flash 均运行态不入档。旧档通关星级与新谱无矛盾（题面全刷新、星级语义不变）。

**verify_one_sign.py（主线腿）逐腿核对（改前基线 12/12 全绿——T1-T11 全过）；
r36 后旧版断言过时腿**：T3 教学关 0-19 审计（pool_of 旧池→新池+kind/flash 断言）、
T4 生成关（同）、T6/T7/T8 flat 语义兼容（flat7=dch2 域变但「错卡在场」判据通用）、
T10 C7 计分（titles/hints 改文案后 sh() 计分仍过——titles 含新章名）。**适配版
verify_one_sign_r36.py 归档 _src/（本 agent 实施+实测）；主线侧建议以适配版覆盖
batch26/verify_one_sign.py（声明不实施）**。

## §R8 verify/_selftest/build 适配清单（四层联动，改前 grep `== N` 清点）

改前全款 `== N` 计数断言清点：**game-verify.js 25 处**（cards.length===4×2/===12
×3/===5(sgn_sent)/===26/===2(childFig2)/dch===3 等）、**_selftest.py 8 处**
（==40/==12×2/==10(SG.start(10))/==4×2/==1×3 等）、**build.py 3 处**（n_clips==26/
count==1/confirms==12/GUIDE==5）、**verify_one_sign.py 3 处**（near_cnt!=5/miss 类/
none 计数）、gate_common26.py 0 处（NCLIPS 可选传参，本款不传）。联动面：
- **game-verify.js**：① 审计循环全量重写（新四型结构律+structWhy 新分支）；② 封闭
  集表 24/近对 9/池 5-15-18-24/fam 7 族独立重列；③ 近对在场专项（flat10-14 全 18
  池+伙伴）；④ 点卡单元（fam 链断言扩 7 族）+新增 **act 单元**（flat17 驱动至 act
  题：kind/标签=ACT 表/题面句 __lastVoiceKey='sgn_q_act'/错对判定）+**flash 单元**
  （flat5 驱动至 flash 位：1800×0.12=216ms 后 .flash-cover 在场/非 flash 位无/
  遮面期点卡可判/reflashCover 直调揭面复遮）；⑨ 分布聚合重写（dch1 池 5/dch2 域
  15+flash10/dch3 近对 25+flash5/dch4 act10+boss5）；⑩ 布局增 act 卡形态；⑪ clips
  **按现状 26 断言保留**（sgn_sent_12/sgn_guide_5——TODO 注册后主线改 41/24/7，
  §R10 声明）；⑬ C7 关键词断言按新文案；⑮ estMs 断言增引导句 9 字口径；
  **⑯ act/flash 两单元**——总单元 54→**56**。
- **_selftest.py**：全量适配+**补 MUTE 双保险（r19 红线，改前缺失）**：MUTE_INIT
  init script（batch6/words 范式）+正常模式种档 settings{sound:false,tts:false,vol:0}；
  Python 独立表 24/9/5-15-18-24+ACT 24 互异断言；act/flash 两腿；正常模式主流程腿
  保留（教学→错链→通关→写档 2 星）。
- **build.py**：confirms==12→**24**；GUIDE==5→**7**；wrongChainUntil 6700→**7000**
  公式（2808+150+estMs(9)+300=6963≤7000）；新增硬性检查：ACT 表 24 条+ACT_ELS 24
  键+flash 常量 FLASH_MS+遮面类标记+verify act/flash 断言锚；clips 注入 n_clips==26
  **不变**（manifest 未动）；estMs ① 检查 24 句最长 ≤10 字（5400 窗）。
- **主线侧（声明不实施）**：①gen_clips sign 块 `assert len(SGN)==12`→24+guide 两
  新族+sgn_q_act（§R10）；②verify_one_sign.py 以适配版覆盖（§R7）。

## §R9 时序参数实测口径（r23 P2-1 红线：SPEC 值=实现值；全量表）

| 参数 | 值 | 调用点 | r36 变化 |
| --- | --- | --- | --- |
| 判对演出窗 | 1800+3600=5400ms×SPEED | uiTapCard right 双 await | 原样（罩 sgn_sent 现有 12 条 clip 最长 3120；新 12 条注册后 ≤estMs(10)=4050） |
| 错点防重入窗 | 1000ms×SPEED | uiTapCard wrong | 原样 |
| 错反馈链豁免 wrongChainUntil | **6700→7000ms** | uiTapCard wrong | **改**：链=sgn_wrong 2808+150+estMs(引导句最长 9 字=3705)+300=6963≤7000 |
| 教学演示窗 | 900/3000/320/500ms×SPEED | tutorialWatch | 原样 |
| turn 后读题延 | 2200ms setTimeout | tutorialWatch 尾 | 原样 |
| ghost 按压 | 800ms×SPEED | pointGhostAt | 原样 |
| 看护轮询 | 1000ms setInterval | 无操作看护 | 原样 |
| 救援门 | 14000/30000ms | 无操作看护 | 原样（r31 统一口径） |
| 教学 help 重演示 | 5000ms | 无操作看护 | 原样 |
| 纠错语音节流 | 10000ms | sayW flat≥3 | 原样 |
| 空白提示节流 | 10000ms | stage 空白 | 原样 |
| 章末/日末推进 | 3400ms setTimeout | winFlow | 原样 |
| queue 段间停顿 | 150ms | core voice.queue | 原样 |
| **flash 遮面** | **1800ms×SPEED setTimeout** | **renderScene（新）** | **新增**：单 pending 变量，renderScene 入口 clear（重入安全） |
| **救援重闪揭面** | **1200ms×SPEED setTimeout** | **reflashCover（新）** | **新增**：仅 14s 方向级且当前 flash 题已遮时触发；不刷 lastAct |

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest；**15 键**）

注册前过渡态（r29 m3/r31 §R10 先例；core 阶段3 TTS 通道已删 2026-09-20）：缺 clip
时 play/queue **静默无声+console.warn（非 pageerror）**——新 12 含义句、act 题面句、
新 2 族引导句注册前不可听；视觉/交互/演出/救援 breathe 完整不受影响（_selftest 在缺
clip 态全绿为证）；主线注册后自动完整。

| 族 | key | 文案（clip 合成文本=game-data.js 表一字一致） | 用途 |
| --- | --- | --- | --- |
| 含义句 | sgn_sent_{nocar\|nobike\|horn\|yield\|cross\|turn\|slip\|rail\|straight\|goleft\|goright\|walk}（12 键） | 红圈白杠，车不能进 / 红圈圈，自行车不能进 / 红圈圈，不能按喇叭 / 红倒三角，先让一让 / 黄三角，前面是路口 / 黄三角，路要转弯 / 黄三角，路滑慢点走 / 黄三角，小心火车 / 蓝圆圈，只准直行 / 蓝圆圈，往左转弯 / 蓝圆圈，往右转弯 / 蓝牌子，这里只能走 | 判对确认句（新 12 标志） |
| 引导句 | sgn_guide_redtri / sgn_guide_bluec（2 键） | 红倒三角说，让一让 / 蓝圆圈说，这样走 | 错反馈链第二段（新 fam） |
| 题面句 | sgn_q_act（1 键） | 看到这个标志，怎么做 | act 题面句 |

- gen_clips 注册要点（主线）：sign 块 `assert len(SGN) == 12`→24（SIGNS 单行格式
  不变正则直接命中 24）；guide 元组表加 ('redtri','红倒三角说，让一让')/
  ('bluec','蓝圆圈说，这样走')；`T46('sgn_q_act', '看到这个标志，怎么做', 'sign')`。
  注册后 clips 注入 26→**41**（sgn_sent_ 12→24/sgn_guide_ 5→7）——build.py ⑪
  n_clips 断言与 verify ⑪ 计数由主线联动改（§R8 声明）。
- 时长窗约束（注册后必验）：sgn_sent 新 12 条实长 ≤5400-300（estMs(10)=4050 预估
  界）；sgn_guide_redtri ≤3705（wrongChainUntil 7000 界）；sgn_q_act ≤estMs(10)。

## §R11 验收数字（Executor 自测门禁实测——主线独立复验为准）

实测日 2026-09-20/21（终态复验 09-21）：

| 门禁 | 实测 |
| --- | --- |
| build 双跑幂等 | md5 `5982cf91017ec3a8672ba5c213da6835` ×2 一致；737677 chars / 760993 bytes；clips 26 条注入正常 |
| VERIFY 双视口（终态产物） | 1280×800 与 800×1180 各自 title=VERIFY PASS **56/56**、layoutOk=true、**0 pageerror**（verify 单元 54→56：新增 ⑯ act/⑰ flash） |
| _selftest.py | **32/32 PASS**（含 act 真实 pointer 腿/flash 闪现腿/双 viewport 布局+像素非空白/正常模式教学→通关→写档 2 星/0 pageerror/0 http 外联） |
| verify_one_sign_r36.py（适配版，归档 _src/） | **12/12 PASS**（T1-T11+T8b；Python 独立封闭表 40 关审计+构成计数+dch 钩子直读+键化反馈链） |
| _r36_pycheck.py | **40/40 identical**（Python 独立 mulberry32/shuffled/ri/spec_seq_of/build_quiz 复算与页面提取谱逐题对拍） |
| 谱对照（baseline→post） | 40/40 关全刷新（旧谱全废符合预期：dch2-4 生成律全改）；0/200 题同投影（含 kind/flash/near）；flat0 q0 锚保留 light/mean/不闪 |
| 分布实测（40 关 200 题，dist 单元终态复取） | kinds {mean:176, act:24}；flash 45 题（dch2:24 / dch3:9 / dch4:12）；sign 覆盖 24/24；dch2 目标 15 池全 15 distinct 取材；dch3 近对在场 5/5 静态关×全题；dch4 近对/关 3-5、act 恰 2×12 关；生成关四型全现 {1:2, 2:7, 3:4, 4:7} |
| 阴性对照（r31 断言判别力） | NEG-A 抹 dch2 flash→⑰ flash 单元红+5 关红；NEG-B act 题面句换 mean 文案→⑯ act 单元红；NEG-C 近对伙伴抽走→② table/⑨ dist/③ near3 红+21 关红；NEG-D dch1 池破坏→② table/⑨ dist 红（引擎同源 structWhy 查不出——独立表捕获） |
| 基线存量红（重要发现） | 改造前 index.html VERIFY **FAIL 53/54**：T46 阶段2 将引导句键化后 game-verify ④ 仍断言 `__lastQueue[1].key===null`——存量断言过时，gate G1 同红，现状交付本就坏；r36 重写按键化口径断言自然修复 |

数字与 md5 为 manifest 26 键时点口径（并发轮主线注册 §R10 15 键后：clips 41、
build/verify ⑪ 计数断言由主线联动改，index.html md5 将随 clips 变化——幂等判据以
同时点双跑一致为准，非跨时点 md5 恒定）。

## §R12 风险与未验证项（如实）

- 儿童时长为推断非实测：新增负荷=24 库记忆广度+闪现图形工作记忆+行为迁移；真机
  回归观察：ch2 flash 题二连错率、ch3 boss 闪现近对 miss 分布、ch4 act 题同 fam
  干扰误选（左右向 goleft/goright 是高发预判点）、新 12 标志首见章的 miss 率。
- 15 新键注册前：新 12 含义句/act 题面句/新 2 族引导句**不可听**（过渡态静默，
  §R10）；视觉与判定完整。旧 12 含义句/旧 5 族引导句照常出声。
- bluec 三标志（straight/goleft/goright）首见在 ch3 近对章（goleft↔goright 互为
  首见）——设计意图但坡度偏陡；救援+breathe 兜底；真机若 ch3 miss 率畸高，下轮
  候选=ch2 域内预插 1 题 bluec 热身。
- act 干扰=同 fam 优先，fam 单员（stop/yield/light）act 干扰退全域随机——辨析度
  低于多员 fam（如实声明，非缺陷）。
- flash 遮面期仍可点卡作答（已看到标志不罚）——遮面前 0-1800ms 窗内抢答无额外
  约束；对 6-7 岁不构成作弊面（看得见才答得对）。
- 救援重闪（reflashCover）verify 直调单测覆盖揭面/复遮两态；14s 真实等待路径未
  在 verify 走全（lastAct 为闭包量不可注入；真机观察项）。
