# SPEC-R32-WORDEN · 英语单词难度加深改造（r32，2026-09-21）

依据：AUDIT-67 段序 6 🟡 判定「估 20-30s：**零起点定位合理但 ch1 图词 2 选 1 过易，
24 词封闭库小**」；建议三维度（ch1 起恒 3 候选/库 24→48 含 4-5 字母词+形近组扩充/
缺字母补全产出题）。校准：b8 段标称 6-7 岁一年级上，宁难勿易——r15-r31 同口径。
本文件为 worden 的 r32 难度谱定稿；与 game-core.js 旧注释/SPEC-BATCH8 §3 冲突处以
本文件为准（r28/r29/r30/r31 同款声明）。

## §R0 目标（账本 §0 摘录）

保留玩法框架（图词配对/听音选图/词图认读三模式+点选判定+星级救援+教学 看→帮→独），
消除「认知空心」（2 选 1 过易+封闭小库循环可背）——改造后须达到一年级上英语认读
+拼写产出负荷。验收：agent 不自验（主线独立复验）；新语音键禁自注册（§R10 TODO
清单）；计数断言改动前已 grep 全款 `== N` 四层联动（build.py 硬检查 3 处/verify_one
数学断言 game-verify ①规则与 ⑪ blank 单元/_selftest WORD_LIST 24 与 options==2 断言
——本轮全部清点见 §R8）。

## §R1 设计总纲（审计三建议承接方式+逐条调整理由）

**维度一·候选上探（ch1 恒 3 选；ch2 lv0 保留 1 关两选起步坡——半改，理由如下）**：
- ch1（pic2word 图→词）2 选→**恒 3 选**：图→词是「形-义→音形映射」起点，2 选 1
  纯猜率 50% 审计判过易的直接对症；3 词卡+同类别干扰优先（cat/dog/sheep 互扰）
  =起步辨析负荷。改。
- ch2（sound2pic 听音→图）：**lv0 保留 2 选、lv1 起恒 3 选**（原 lv0-1 两选）。
  保留 lv0 一关的理由：①听音题的认知负荷在「听懂 en」本身（零起点 6 岁听音=
  本款真难度面，2 选仍产 miss 与重听循环，教学价值在建立「听→点」回路而非辨析）；
  ②章内 2→3→3→3→3 递进保留「章首缓坡」教学结构（全款四章弧=图→听→形近→产出
  认读，每章首关均为该章能力的最低配）；③若 ch2 起步即 3 选，零起点儿童 flat5
  （听不懂 en）猜对率 33%，连续挫败违「起步可进」铁律。审计建议的「恒 3 候选」
  主诉在 ch1 图词（已兑现）；ch2 lv0 为全款唯一保留的起步喘息关（1 关/40 关，
  显式声明）。
- ch3/ch4 原已 3 选，维持（ch3 词卡含 1 库外形近干扰、ch4 图卡同类别干扰）。

**维度二·库扩容（24→48 词，全部新增词 4-5 字母——词长上探主承载之一）**：
- 新增 24 词（学前教材常见、简笔可画、特征鲜明）：animal +sheep/duck/mouse/horse、
  fruit +pear/peach/lemon/melon、food +rice/bread/soup、nature +cloud/snow/leaf/
  wind、object +boat/train/house/plant/brush、body +face/hair/foot/tooth。
  六类别 9/8/6/8/9/8=48（同类别干扰优先律的池深度同步扩容）。
- **形近干扰组 6→12**（基词∈库/干扰∉库铁律保持）：旧 6 组原样（cat/cap·dog/dot·
  book/look·cake/lake·star/stop·hand/head）+新 6 组 **sheep/sheet·boat/coat·
  train/brain·snow/slow·rice/race·mouse/moose**（一字母差或元音对，干扰词均为
  儿童常见真词=辨析有真价值；12 个干扰词 sheet/coat/brain/slow/race/moose 全
  ∉48 词库，机检）。dch3 牌库=12 形近基词。
- **新词 en 发音 clip 24 条全部走 TODO 清单（§R10）禁自注册**；注册前点对新词卡
  =静默（core speak=TTS 兜底已退役=静默+console.warn，非 pageerror），视觉/交互/
  判定/救援完整不受影响。
- 新词 SVG 24 幅：风格与现有 ICONS 严格一致（viewBox 0 0 100 100、暖棕描线
  INK #4A3B2E、stroke-width 2.4-3.2、主色贴实物、特征鲜明）；**视觉诚实铁律：
  新词 SVG 不泄拼写（纯具象物，零字母元素）**。取证 PNG 落 _shots/（§R11）。
- **章级覆盖牌库 deckOf（实现期设计变更，替代原 drawDeck 概率覆盖）**：原
  drawDeck 每关独立洗牌在 24 词时代靠概率+实测断言过；48 词下实测 40 关缺
  bird/egg 两词（概率覆盖无结构保证，VERIFY cover 单元首跑 FAIL 实锤）→ 退役，
  改章级段制：同 dch 的 10 关（静态 5+生成 5）共用 mulberry32(dch×104729+7)
  洗的章级牌库，各关按族内关号 idx 取连续 5 词段（idx×5+k 回绕）——dch1/2/4
  族 50 抽 ≥48 词=**结构性全覆盖**（dch3 族 12 基词 50 抽同理）；dch≥3 段防御：
  段内 ≥2 词长 ≥4（blank 顺延取材避开 last 的死角；dch3 数学恒满足——12 基词
  仅 cat/dog <4）。覆盖率断言 verify ② 保持实测机检。

**维度三·产出型新题型 blank（缺字母补全——从识别到产出，难度上探主承载）**：
- 题型：题面=图+缺位词（如苹果图 +「app_e」，缺位=下划线槽）；选项=3 张字母卡
  （1 正确字母+2 干扰字母）；判定=点对字母→槽内填入字母→词完整显示→**播整词
  en 发音**（复用 wen_w_<word> 链，点对播 en 现有代码零改动自然兑现）→推进。
- 分布（固定谱，r24/r30/r31 先例——固定位的确定性收益见 §R7 驱动兼容论证）：
  **dch3 qi2/qi4 恒 blank**（形近辨析 3 题+产出 2 题）、**dch4 qi2 恒 blank**
  （qi0-1 word2pic 认读保底+qi3-4 三模式随机=混合保留）。
- **缺位律**：blankPos=ri(1, L-1)——**非首字母随机位**（首字母太显著轮廓可秒补/
  亦避免首字母缺位对零起点过难；中后位=拼写序列记忆负荷）。
- **target 词长 ≥4**（3 字母词缺 1 位剩 2 字母提示过强）：dch3 从形近基词牌库内
  词长 ≥4 者顺延取（cat/dog 两词除外）、dch4 从全库牌库词长 ≥4 者顺延取。
- **干扰字母律（辨析价值主承载）**：优先「缺字母的形近字母族」（手写常见混淆族
  表：b/d/p/q、m/n、w/v、i/l、u/v、a/e、o/u、s/z、c/g、t/f、r/n、h/k），不足补
  「该词其他位置字母」（孩子须判断缺的是哪一位），再不足补高频字母池；3 字母
  互异含 pick。
- **不播单字母音（设计决策，省 26 个字母 clip）**：点字母卡不播字母名——blank
  的语音链只有题面 zh 指令（新键 wen_q3，§R10 TODO）+点对后整词 en（复用）。
  理由：①单字母名的发音（letter name）与拼写产出（letter-sound）是两个系统，
  播 letter name 无辨析价值反成噪音；②补全后播整词=「产出成果的正反馈」闭环，
  语音资源集中在一处；③clip 预算 25 键（§R10）vs 51 键（+26 字母），后者对
  主线注册与维护成本翻倍无对等收益。
- **纠错文案**：wrongText 加 blank 支「不对哦，看看缺哪个字母」——走 wen_wrong
  TTS 兜底通道（现有三支同构，零新 clip）。

**教学链/星级/存档零改动**：flat0=dch1 pic2word（教学 看→帮→独 原样可演示——
3 选下 ghost 指正确卡 correctIdx 通用）；retries 0/≤2/其他=3/2/1 星；档键
kidsgame_worden/sv.wen.tutSeen 不动。

## §R2 难度谱定稿（章弧/CH_LEN=5/静态 20 关/每关 5 题不动）

| 章 | 章名（不变） | 题型结构（每关 5 题） | 候选数 | 牌库 | 相对 r32 前 |
| --- | --- | --- | --- | --- | --- |
| 1 | 图配词 | pic2word×5（零模式变化） | **恒 3**（原 2） | 48 词 | +1 候选；谱全刷新（池扩容） |
| 2 | 听音选图 | sound2pic×5（零模式变化） | **lv0=2 / lv1-4=3**（原 lv0-1=2） | 48 词 | lv1 起上探；谱全刷新 |
| 3 | 像词分清 | qi0/1/3=pic2word 形近 3 选+**qi2/4=blank 产出** | 3 | 12 形近基词（blank 取池内词长 ≥4） | +blank×2/关；形近组 6→12 |
| 4 | 读词选图 | qi0-1=word2pic+**qi2=blank**+qi3-4=三模式随机 | 3 | 48 词（blank 取词长 ≥4） | +blank×1/关；混合保留 |

- **章名零改动；章末预告 hint 改 1 处（谱变更显式声明，r30 范式）**：
  CHAPTERS[2]「接下来有长得很像的单词，还要补上缺少的字母」（通关 ch2 预告 ch3
  blank）+GEN_HINTS[2] 同步（生成关循环）；CHAPTERS[1]/[3]/[4] 与其余 GEN_HINTS
  零改动（对新谱仍贴切）。
- **锚点（结构性，机检）**：flat0 恒 dch1 pic2word（教学链兼容前提）；CH_LEN=5、
  STATIC_LEVELS=20、种子 mulberry32(flat×7919+13)、STAR/存档语义全不动。
- 生成关（flat≥20）循环节奏不变（20-24=dch1、25-29=dch2、30-34=dch3、35-39=dch4）。

## §R3 生成律（确定性通道不变；verify/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)；genLevel/genOne 签形不变（内部扩型）。
- pickDistract **逐行不动**（pool 24→48 自动适配；同类别干扰优先律原样）。
- **drawDeck 退役→deckOf 章级覆盖牌库（§R1 维度二变更声明）**：genLevel 内
  `idx=(flat%STATIC_LEVELS)-(dch-1)×CH_LEN+(flat>=STATIC_LEVELS?CH_LEN:0)`
  （族内关号 0-9）+`deck=deckOf(dch, idx)`——deckOf=章级种子
  mulberry32(dch×104729+7) 洗牌+连续 5 词段+dch≥3 段防御（段内 ≥2 词长 ≥4）。
  原「每关独立洗牌」通道废止（48 词下实测缺 bird/egg，无覆盖结构保证）。
- **genOne 分派（新谱）**：
  - dch1：`pickDistract(target, rnd, 2, [target])`（1→2——恒 3 选）。
  - dch2：`pickDistract(target, rnd, lv === 0 ? 1 : 2, [target])`（lv<=1?1:2 改
    lv===0?1:2——lv1 起三选）。
  - dch3：qi∈{2,4}→blank（见下）；其余→pic2word 原构型（库内干扰 1+库外形近
    CONFUSE[target]）。
  - dch4：qi<=1→word2pic（原样）；qi===2→blank；qi>=3→三模式随机（原样掷币）。
- **blank 生成律（确定性）**：
  - target：沿 deck 段顺延取第一个「词长 ≥4 且 ≠上一题 target」的词（deck=该关
    5 词段，deckOf §R3 变更；dch3 段防御后段内 ≥2 词 ≥4、dch4 段经防御 ≥2 词
    ≥4——顺延段内回绕 ≤5 步，相邻不同词律保持）；
  - blankPos：`ri(rnd, 1, target.length - 1)`（非首字母，1 次 rnd）；
  - pick=target[blankPos]；
  - 干扰字母：候选=NEAR 形近族（查表，零 rnd）+target 其他位置字母（≠pick）+
    高频池（去重），`shuffled(候选)`（1 次 rnd）取前 2；
  - options=`shuffled([pick, d1, d2])`（2 次 rnd）。
- **structOk 扩 blank 分支**：mode 白名单 +'blank'；blank 题断言 pick 单字符
  a-z、target∈库且词长 ≥4、blankPos∈[1,L-1]、target[blankPos]===pick、
  options 恰 3 张单字符小写字母互异含 pick；图题（sound2pic/word2pic）选项全在
  词库断言原样（blank 选项=字母不入词库判定）。
- **engTap 判定真值扩**：`const truth = q.mode === 'blank' ? q.pick : q.target`
  （判定行单点改；非 blank 模式 truth===target 逐字节同行为——判定面向后兼容）。
- **rnd 消耗流影响面（逐章，谱变更显式声明）**：词库 24→48 本身改变
  shuffled(pool) 的产物与消耗次数（24 元 23 次→48 元 47 次）+pickDistract 池
  深度变化+blank 新增 ri/shuffled 消耗+**deckOf 新增章级种子流
  mulberry32(dch×104729+7)（独立于 flat 题内种子流，dch 族内 10 关共用）**
  →**全 40 关谱刷新，无逐字节保留关**
  （r28 words 字库扩容同型；与 r27/r30/r31「ch1-2 保留」不同的原因=词库本体
  变更，无法保留）。保留面=结构性锚（§R2 锚点行）+确定性+相邻不同词+覆盖率。
- 分布护栏（精确值=确定性谱实测，§R11 回填）：全 40 关 200 题 mode 分布；
  blank=30（dch3 20+dch4 10）；pic2word/sound2pic/word2pic 实测值入 verify ⑥。

## §R4 交互与救援（lastAct 纪律核对：r23 P1-1/r24 M1/r25 M2/r30 三 major）

- **lastAct 触点（现状全保留）**：答对推进刷（uiPick right 路径——blank 点对
  字母走同一路径=刷）/兔兔/重玩/听题/点题面卡/空白轻提示节流——零新增触点。
- **r25 M2 不适用论证**：blank 是**单步判定**（点字母→right/wrong），「字母→
  整词」两段是**演出反馈非中间判定态**（无「第一步对」的部分正确相位——点错
  字母=wrong 灰掉零惩罚，点对=推进 done/right），无解锁相位→无中间态解锁刷钟
  对象。与 r30 subbug「听题两步一次作答」同论证。
- **r30 三 major 同族自查（演出窗×用户行动矩阵）**：blank 点对走 uiPick right
  现有路径——`state.locked=true` 全演出窗（950ms×SPEED）拦点选/重玩/听题/兔兔/
  空白（全部现有 locked 门）；窗内重玩→`cur!==run` 身份守卫丢弃旧续体（现有）；
  字母填入 gap=同步 DOM 操作+CSS 动画（无独立 await 演出段、无二级 timer）=
  **零新增演出窗**（较 r31 dualJump 更简——无 420/820 分段跳、无 s 段条件化）。
  点错路径无演出（晃动 420ms 现有）。已灰卡 again 防御/非法下标 false 原样。
- **救援链（原样）**：14s 门+1s 轮询触发窗 [14,15]s（r31 ⑤统一口径）；blank 题
  救援=qSpeak(q)=play(wen_q3)（注册前静默过渡态，§R10）；miss≥2 pulse 正确
  字母卡（3 选 2 错卡，miss 极限 2=阈值恒可达——r30 教训②值域可达性核对）。
- **教学链零改动**：tutorialWatch/pointHelpNext/交接链原样（flat0=dch1 新谱
  3 选，ghost 指正确卡与候选数无关）。

## §R5 引擎与钩子（向后兼容）

- game-core.js：genOne 四分派改（§R3）+blank 生成段+NEAR 形近族表+structOk 扩
  分支+engTap 判定真值单点扩+deckOf 新增/drawDeck 退役（§R3 变更声明）；
  **mulberry32/shuffled/ri/pickDistract/engWon/engStars 逐行不动**。
- game-data.js：WORDS 24→48+CONFUSE 6→12+wordSvg 扩 24 case+VOICE.q3+MODE_Q/
  MODE_NAME 加 blank+wrongText 加 blank 支+CHAPTERS[2].hint/GEN_HINTS[2] 文案。
- game-main.js：correctIdx 扩 blank（options.indexOf(pick)——autoSolve/教学
  指向/驱动全通用）；renderQCard blank 分支（图+缺位词）；renderOpts blank 分支
  （字母卡 .opt.lettercard）；uiPick right 路径 blank 补全 DOM（gap 填字母+
  filled 态）+**window.__blankFill 运行锚**（填入动作证据 {pick,word,n}——950ms
  演出窗后 renderQuiz 重建题面 DOM 态不可事后查，verify ⑪/_selftest 2e 取证走
  锚，r30 __dualJumpN 同范式）；qSpeak blank 分支（q3 指令）；其余渲染/推进/
  教学/救援零改动。
- head.html：#q-card.blank 布局（图+gapword 并排/竖屏纵排）+.gap 下划线槽+
  .opt.lettercard 大字母样式+.gap.filled 补全反馈。
- **WEN 钩子**：currentLevel 原样；quiz getter 增 `pick`/`blankPos` 字段（blank
  题）——既有字段（mode/target/options/step/answered/miss/dead）零变化；
  tapOption/autoSolve/tutorial 原样（autoSolve 走 correctIdx 对 4 型通吃）。
- **verify_one_nb_wen.py 逐腿核对（§R7 兼容清单）**。

## §R6 基线证据（双证据+谱变更显式声明，r27-r31 范式；工具随款归档 _src/）

- **证据①（前后谱对照）**：改造前 index.html（md5 `59a7f7171ef314a3922b04a34cfc7ad5`
  /703238 chars）提取 40 关 quizzes JSON=r32-baseline.json（实测：pic2word 109/
  sound2pic 63/word2pic 28/200 题）；改造后=r32-post.json（提取器 _r32_extract.py
  归档 _src/；投影字段 [mode,target,options,pick?,blankPos?]——blank 新型带
  pick/blankPos，baseline 无 blank 自然缺字段）。
  - **对照口径（本轮特殊声明）**：词库本体扩容改变全 rnd 流→**40/40 关全刷新，
    无逐字节保留关**（r28 同型）；保留面=结构锚机检：①40 关确定性双跑一致
    ②flat0 恒 dch1 pic2word ③相邻题不同词 ④48 词+12 基词全覆盖 ⑤blank 律
    （§R3）全量合规。
- **证据②（Python 独立复算）**：_r32_pycheck.py 按 §R3 生成律 Python 独立实现
  genLevel（mulberry32/shuffled r27-r31 同源副本），与页内提取 40 关全量对拍
  **PYCHECK 40/40 identical**（含 pick/blankPos 全字段）。
- **证据③（verify 规则断言）**：40 关逐关新谱合规（§R8①四章规则+blank 专项+
  形近 12 组+干扰字母律）。
- **证据④（真实页真实点击）**：_selftest 2c/2e（blank 真实链：点错字母灰零惩罚+
  点对 gap 填入+播整词 en）；新词 SVG 24 幅视觉取证 PNG 落 _shots/（§R11）。

## §R7 存档与兼容（verify_one_nb_wen.py 逐腿清单）

无档结构变化：档键/levels 'ch-lv'/CH_LEN/STATIC_LEVELS/日历/sv.wen.tutSeen 全不动；
无新增落档字段（blank 态均运行态）。旧档通关星级与新谱无矛盾（谱刷新、星级语义
不变，r20-r31 同款声明）。

**verify_one_nb_wen.py（主线腿）逐腿核对**：
| 腿 | 判定 | 说明 |
| ① verify title | 兼容 | game-verify 断言已联动（§R8） |
| ② flat1 真实通关 | 兼容 | flat1=dch1 lv1 恒 3 选；qidx=indexOf(target) 驱动协议原样命中（dch1 无 blank） |
| ③ 双 viewport | 兼容 | seed(1) flat1 3 选布局；字号适配 §R8 head 段 |
| ④ 离线 / ⑤ 截图 | 兼容 | 无外链；seed(5) flat5=dch2 lv0 2 选保留 |
| ⑥ 钩子 | 兼容 | WEN 四钩子原样（quiz getter 只增字段） |
| ⑦ 0 pageerror | 兼容 | — |
| ⑧ 教学吞输入 / ⑬ 教学重玩 | 兼容 | 教学链零改动（flat0 3 选，ghost 通用） |
| ⑨ 首错零惩罚 flat1 | 兼容 | 3 选首错灰卡原样 |
| ⑨b 连错 pulse flat10 | **兼容（设计收益）** | **dch3 blank 固定 qi2/4=flat10 qi0 恒 pic2word 词卡**——qidx=indexOf(target) 命中，probe 循环不触 blank（若 blank 洗牌混排则 qidx=-1 驱动崩，固定位设计规避=本轮驱动兼容主承载） |
| ⑩ sayW 节流 flat5 | 兼容 | flat5 lv0 2 选原样 |
| ⑪ 救援 flat5（a 静置/b 乱点） | 兼容 | 14s 门原样；blank 不在 flat5 |
| ⑫ clips 对账 | 兼容 | len(gk)>=6 宽松；注册前 36/主线注册后 61 均过 |
| **14 sound2pic 开题播 en** | 兼容 | flat5 lv0 2 选保留，qidx 命中 |

预期：worden 12 腿全绿（无主线适配腿；neighbors 腿不在本轮范围）。

## §R8 verify/_selftest/build 适配清单（四层联动）

- **game-verify.js**：① 审计循环四章新规则——dch1 恒 3 选词卡全在库/dch2 lv0=2
  lv1-4=3/dch3 qi0-1-3 形近 3 选（库外干扰=CONFUSE[target]+库内 1 干扰）+qi2/4
  blank 全律（§R3）/dch4 qi0-1 word2pic+qi2 blank+qi3-4 三模式、恒 3 选；② 覆盖
  48 词+12 基词；③ 形近干扰专项（12 值）；④ 点选单元（flat0 升 3 选口径：一错
  灰+again+二错 pulse+点对推进全在 flat0 测——原「二错在 flat10 测」段随 3 选
  化收回 flat0）；⑤-⑧ 原样；⑨ 布局加 blank sim（flat10 推进 2 题至 qi2 双视口）；
  ⑩A flat0 冒烟（1 错 2 星）/⑩B flat15 autoSolve（w2p≥2+blank 恰 1 扩断言）；
  **新增 ⑪ blank 专项单元**（flat10 推进至 qi2：点错字母灰掉零惩罚不推进+点对
  gap 填入 DOM 文本==pick+词完整==target+play('wen_w_'+target) stub 计数+推进）。
  总单元 40+11=**51**（§R11 实测）。
- **_selftest.py**：**MUTE_INIT 加入（r19 红线——原版无静音，本轮补 words r28
  定稿 function 版）+种档 sound:false/tts:false/vol:0 双保险**；WORD_LIST 24→48；
  2a quiz shape len(options)==2→3；2d flat5 2 选断言保留（lv0 保留兑现）；2c flat10
  qi0 形近原样；**新增 2e blank 真实链**（flat10 答至 qi2：点错字母灰+零惩罚+
  点对 gap 填入+en 整词计数+通关）；viewport 腿 flat15 原样（停在 qi0=word2pic，
  blank 布局面实际由 verify ⑨ simView 双视口承载——r32 审查 minor5 措辞修正，
  原文「含 blank qi2 布局面」与 selftest 实现不符）；救援腿 flat3 原样。实测数字 §R11。
- **build.py**：硬检查 3 原样+**新增硬检查 4（r30/r31 结构锚）**：engine 含
  `'blank'`/`NEAR`、data 含 48 词锚（新词 'sheep'/'tooth'）+12 形近锚（'moose'/
  'brain'）、main 含 `lettercard`、verify 含 blank 断言锚；clips 注释加过渡态
  「r32 注册 25 新键后 36→61（主线 gen_clips）」。
- **主线侧（声明不实施）**：①gen_clips 注册 25 新键（§R10）+主线重建（clips 61
  嵌入）；②verify_one_nb_wen.py 预期零适配（§R7 全兼容，实测确认）。

## §R9 时序参数实测口径（r23 P2-1 红线+ r31 教训①：SPEC 值=实现值，逐调用点）

| 参数 | 值 | 调用点 | 口径 |
| --- | --- | --- | --- |
| 答对演出窗（含 blank） | 950ms×SPEED | uiPick right await wait(950*SPEED) | 原样（blank 同窗，无独立演出段） |
| blank 字母填入 | 同步 DOM+CSS（0ms 逻辑窗） | uiPick right blank 分支 `.gap.textContent=pick`+`.filled` 类 | **新增——零 await 零 timer**（r30 教训①矩阵：无新演出窗即无新重入面） |
| 答错晃动窗 | 420ms×SPEED | uiPick wrong await | 原样 |
| 教学演示节奏 | 700/900/320/1000ms×SPEED | tutorialWatch | 原样（零改动） |
| 教学 help 指向 | 600ms setTimeout | tutorialWatch 尾 | 原样 |
| ghost 按压 | 800ms setTimeout | pointGhostAt | 原样 |
| 看护轮询 | 1000ms setInterval | 无操作看护 | 原样 |
| 救援门 | 14000ms 门+1s 轮询（触发窗 [14,15]s） | 同上（重读题面+lastAct 重置） | 原样（r31 ⑤口径） |
| 教学 help 重演示 | 5000ms | 同上 | 原样 |
| 纠错语音节流 | 10000ms | sayW（flat≥3） | 原样 |
| 听音重播节流 | 3000ms | replaySpeech | 原样 |
| 空白提示节流 | 10000ms | field pointerdown 空白分支 | 原样 |
| 章末/日末推进 | 3400ms setTimeout | winFlow | 原样 |
| queue 段间停顿 | 150ms | core voice.queue | 原样 |

r32 新增时序面=**零**（blank 无新 await/timer/演出段——全部复用 950ms 答对窗与
现有门；§R4 矩阵论证的根基）。

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest）

**新增 25 键**（前缀 wen_ 已 grep manifest 核零占用：现有 36=wen_ 33+core 3）：

**A. 24 条新词 en 单词音**（en 童声，与现 wen_w_* 同族；文案=单词本身）：
| key | 文案 | | key | 文案 |
| --- | --- | --- | --- | --- |
| wen_w_sheep | sheep | | wen_w_cloud | cloud |
| wen_w_duck | duck | | wen_w_snow | snow |
| wen_w_mouse | mouse | | wen_w_leaf | leaf |
| wen_w_horse | horse | | wen_w_wind | wind |
| wen_w_pear | pear | | wen_w_boat | boat |
| wen_w_peach | peach | | wen_w_train | train |
| wen_w_lemon | lemon | | wen_w_house | house |
| wen_w_melon | melon | | wen_w_plant | plant |
| wen_w_rice | rice | | wen_w_brush | brush |
| wen_w_bread | bread | | wen_w_face | face |
| wen_w_soup | soup | | wen_w_hair | hair |
| | | | wen_w_foot | foot |
| wen_w_tooth | tooth（24 词序与 game-data.js WORDS 扩容段一致——foot 行系 r32 审查 M1 补录，原表漏列） | | | |

**B. 1 条 blank 题面 zh 指令**：
| key | 文案 | 用途 |
| --- | --- | --- |
| wen_q3 | 看图，补上缺少的字母吧 | blank 题开题/救援/重播（MODE_Q.blank='q3'） |

- **字母音 clip：零需求（设计决策，§R1 维度三论证——不播单字母名，点对播整词）**。
- manifest 36→**61**（主线注册）；clips 嵌入段过渡态=注册前 36（build.py 注释已
  留），注册后主线重建 61。
- **注册前过渡态（r29 m3/r31 §R10 先例）**：play(key,text) 缺 clip→speak(text)
  =静默+console.warn（非 pageerror）——blank 题面指令与新词点对发音注册前静默；
  视觉/交互/判定/演出/救援完整不受影响（selftest 2c/2e 在缺 clip 态全绿为证）；
  主线注册后自动换真 clip。**注意**：语音取证类断言（playLog/qLog）对「新词
  点对播 en」检查的是 play 调用链路（stub 记录在 core 内部早退前——game-main
  直调 KIDS.voice.play 后 stub 先记录），与 clip 是否存在无关，注册前后断言一致。
- gen_clips 注册建议格式（沿 wen_w_* 先例）：`W24('wen_w_sheep', 'sheep', 'worden')`
  等 24 行+`T46('wen_q3', '看图，补上缺少的字母吧', 'worden')`（文案与
  game-data.js VOICE.q3.text 一字一致）。

## §R11 验收数字（Executor 自测门禁，2026-09-21 实测——主线独立复验为准）

以下全部锚定 Executor 过渡态产物 `0dcf4e6b4dbdf2fa1aa7b14e3d51b35d`（clips 36，25 新键注册前）；
**主线注册 25 键后终版=`8f6a284bb73dba5689c23112ec32380a`（clips 61，1030070 chars）**——
主线复验全绿（VERIFY 51+51/_selftest 56/56/verify_one 35/35×2/gate 3+3 n=61/manifest 5139），
收官对账以终版为准（r32 审查 minor2 补记）。

**2026-09-23 m 批维护版=`86f4afac091b1f71f9b4efaa02bb41b4`（clips 61，1045615 bytes）**——
注释债勘正（minor3：game-core.js:91 drawDeck 退役措辞→deckOf/game-data.js:12「24 词表」→48；
minor4：verify ①「干扰字母律」收窄为 ^[a-z]$ 互异≠pick 断言面）+测试债收口（minor6：_selftest
3b blank 题救援静置腿——wen_q3 恰一次@~14s；minor7：2f dch4 blank（flat15 qi2）真实点错专项
——错反馈链+miss 计数；_selftest 56→63）。全门禁复跑绿（VERIFY 51+51/_selftest 63/63/
verify_one 35/35/gate 3/3 n=61），谱零变化（r32-post.json 重提取与归档逐字节一致）。

- **① build 双跑**：`python build.py`×2 → md5 `0dcf4e6b4dbdf2fa1aa7b14e3d51b35d`
  ×2 幂等（735475 chars；25 新键注册前 clips 36 过渡态）。
- **② VERIFY 双视口**：1280×800 **51/51 PASS+0 pageerror**；800×1180
  **51/51 PASS+0 pageerror**（_r32_verify_run.py，重跑锚定终版产物）。
- **③ _selftest**：**56/56 PASS**（含 2e blank 真实链：点错字母灰零惩罚 gap
  intact+点对 __blankFill 锚+wen_w 整词+通关；MUTE 双保险 0 pageerror 全离线）。
- **④ verify_one_nb_wen worden 腿**：4 跑=3×**35/35 PASS**+1×34/35（单次偶发，
  FAIL 腿在截断输出中未捕获、随后三次全绿无复现——时序敏感腿偶发，主线复验
  留意；18 断言零适配腿，§R7 兑现）。
- **⑤ 谱对照+pycheck**：baseline（pic2word 109/sound2pic 63/word2pic 28/200 题）
  vs post（**pic2word 88/sound2pic 58/blank 30/word2pic 24**/200 题——blank 30=
  dch3 20+dch4 10 精确兑现）；**PYCHECK 40/40 identical**（mode/target/options/
  pick/blankPos 全字段，post.json 对终版产物重提取后对拍）；48 词+12 形近基词
  全覆盖。
- **⑥ 新语音键 TODO**：25 键=24 新词 en（§R10 A 表）+wen_q3（B 表）；
  字母音零需求（§R1 论证）。
- **⑦ 新词 SVG 取证**：_shots/r32-new-words-grid.png（24 词 6×4 网格）VLM
  复核**合格**——无空白格/无溢出重叠/语义逐格对应（duck/lemon/train/house/
  tooth/snow 六抽查+其余目验）/暖棕描线风格统一/图形零字母（不泄拼写）；
  _shots/r32-blank-flat10-qi2.png（flat10 qi2 blank 题面：简笔图+缺位下划线槽
  +3 大字母卡）**合格**。

**基线链**：改造前 `59a7f7171ef314a3922b04a34cfc7ad5`（703238 chars，clips 36）
→ r32 改造后 `0dcf4e6b4dbdf2fa1aa7b14e3d51b35d`（735475 chars，clips 36 不变
——25 新键注册前；中间态 2fb8003e→5f7128bc 为 deckOf/__blankFill 变更前版本，
已废止）。

## §R12 风险与未验证项（如实）

- **儿童时长为推断非实测**：机器口径由演出窗主导；难度真实度量=3 选辨析（起步
  猜对率 50%→33%）+48 词库记忆面（可背性下降）+blank 拼写产出（识别→产出跨
  越）。儿童估 ch1 30-60s、ch3 60-120s（blank×2）、ch4 80-150s（推断）；真机
  回归观察：blank 题 miss 分布（首字母位 vs 尾字母位难度差）、形近 12 组错选
  分布、ch2 lv0 保留关是否拖慢节奏、48 词库两轮循环后的再认率。
- 25 新键注册前 blank 题面指令+新词 en 静默（过渡态，§R10）；主线注册后消失。
- **blank 缺位非首字母随机位=首字母从不缺**（设计决策 §R1：首字母轮廓显著+零
  起点友好）——产出题对「首字母记忆」无覆盖，若真机发现拼写产出过易，首字母
  缺位与双缺位=下轮扩展位。
- 干扰字母形近族表为手写常见混淆族（b/d/p/q、m/n 等 12 族）——非全字母覆盖，
  族外字母（如 e→仅 a）靠词内字母+高频池补足；若真机发现某些字母对（如 u/n）
  混淆率更高，扩表=一行改动。
- **deckOf dch4 段防御为替换式非交换式**（r32 审查 minor1 披露）：段内短词
  （<4 字母）被 extras 词**替换**——若被替换短词为族内唯一出现则该关缺此词；
  dch1/2 无防御纯结构成立、dch3 段内互异使防御数学恒不触发，唯 dch4（48 词含
  7 个 3 字母词）「50 抽≥48 词」论证不闭合。终版谱实测未触发（verify ② 覆盖
  断言+pycheck 40/40 双兜底，谱已冻结无复发面）；根治=改交换式防御（下轮候选）。
- **verify_one ⑨b flat10 兼容依赖 blank 固定位（qi2/4）**——若未来 blank 改洗牌
  混排，qidx=indexOf(target) 驱动在 blank 题返回 -1 崩（§R7 已披露）；固定谱
  与随机谱的取舍已在 §R1 定稿（固定），改动须联动主线驱动。
- verify/selftest 的 mode 分布精确断言值=确定性谱推导+实测复核（§R11 回填）；谱
  端到端再验证以 pycheck 40/40 与主线复跑为准。
- **verify_one worden 单次 34/35 偶发**（§R11④：4 跑 3 次 35/35+1 次 34/35，
  失败腿未捕获、三次复跑无复现）——疑似时序敏感腿偶发；主线复验若重现，
  优先查救援/教学/celebrate 类计时断言而非本轮改动面（r32 零改动其时序参数）。
- _obs8/test_worden.py（主线观察脚本）兼容性：flat0_on_step s==1 人设猜错
  （wrongs[0] 取第一非答案，3 选兼容）/flat10 s==0-1 形近（qi0/1 恒 pic2word
  ✓）/flat15 s==2 兔兔（qi2=blank，rabbit_tap 通用 ✓）——预期零适配；主线
  试玩轮实测为准。
