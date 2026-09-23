# SPEC-R26-INS · 昆虫还是蜘蛛难度加深增补（r26，2026-09-21）

依据：AUDIT-56 行52 黄款判定「实测 58.7-67.6s/关，**二选一+腿高亮锚=难度地板**，
但科普点真实可扩」；行100 建议方向「①3-4 选加干扰动物（蜗牛/蜈蚣）②头胸腹
分段第二判据 ③腿数+类目混合题面」。校准：b40 段标称 5-6 岁，宁难勿易
（5.5-6.5 幼小衔接）——r21-r25 同口径。
本文件为 SPEC-BATCH40 §0/§1/§4 的 r26 修订版，与其冲突处以本文件为准；
§0 共同门禁全部继续适用。

## §R1 改造总纲

保留「看动物大图听题面→候选点选→LEGS 推导判定」玩法骨架与教学链
（tutorialWatch/tutTurnLevel/mkQuiz/`__insDemoR`/`__insTutSolo` 证据链、
watch 3400/turn 2200 延窗、TUT_SUM 分账 **零改动**），消除「恒两选+腿逐条
可数」的自降难度通道——三个新认知维度全部落 dch4（dch1/dch2/dch3 基线全不动）：

- **候选盘扩 3 选+干扰动物（审计①）**：judge3 族（judge 升级）候选
  {昆虫, 蜘蛛, **都不是**}，legs3 族（legs 升级）候选 {六条腿, 八条腿, **都不是**}
  ——恒 3 选。新干扰动物 **蜗牛（软体动物，0 条腿）** 与 **蜈蚣（多足纲，
  腿很多≠6≠8）** 入封闭表：既非昆虫也非蛛形纲，judge3/legs3 的干扰动物按
  seeded 掷币**入题面当主角**（答案=「都不是」），也以候选小图身份承载
  「都不是」选项。推导律仍封闭表唯一推导（§R3），answer 禁另写魔数。
- **头胸腹分段第二判据（审计②）**：新题型 bodyseg——「{动物名}的身体分
  几段呀？数一数」，候选 {三段, 两段, 很多段}（分段图标逐节可数）。
  封闭表 SEGS：昆虫=3（头胸腹）/蛛形纲=2（头胸部+腹部）/蜈蚣=15（很多段）。
  身体分段是独立于数腿的第二形态学判据——孩子须知道「什么算一段」（头？
  翅膀？尾巴都不算）才能数对。**bodyseg 题面动物池=视觉诚实池**（§R3）：
  butterfly/ladybird 的存量 SVG 身体画为两大块（与 SEGS=3 事实不符）、
  scorpion 尾节会被误数为第三段——三者不入池，杜绝「图在说谎」的不公平题。
- **腿数+类目混合题面（审计③）**：新题型 mixfind——「找一找呀，六条腿的
  昆虫 / 八条腿的蜘蛛」，候选=**3 张动物小图**（1 契合+2 干扰：1 只异类
  核心动物+1 只干扰动物蜗牛/蜈蚣），点契合动物。双条件题面强化「腿数↔类目」
  联想（封闭表内腿数唯一决定类目——双条件逻辑相容不矛盾，教学价值在联想
  巩固与三选一辨别）。确认链尾拼契合动物名音（末步名音=当前答案，r25 同款）。
- **撤腿可数锚（审计根因，Executor 定夺=撤）**：legs3 题动物大图**叶子挡腿**
  （`#animal.leg-hide`：全部 [data-leg] visibility:hidden+叶形遮挡条），动物
  身体可见（辨识身份）但**腿不可数**——数腿从「看图数」变「回忆类目知识」
  （蚂蚁是昆虫→昆虫有六条腿）。题面尾段换 ins_t_legs3「的腿有几条呀？
  **想一想**」（原「数一数」对藏腿题面不诚实）。救援分层兜底（§R4）：
  14s 方向级=科普句（ins_sci_* 本就逐字念出腿数——知识型方向提示，不掀叶）；
  30s 答案级=**掀叶揭晓腿**（视锚回归一次，r24 soundcount 答案级带锚重播
  同款分层先例）+契合候选 breathe+重播题面。judge3/bodyseg/mixfind 不藏
  （其难度来自 3 选辨别/分段概念/双条件辨别，非数腿通道）。

维度不叠同题：judge3/legs3=纯 3 选+干扰动物维（legs3 叠撤锚）；bodyseg=纯
分段维；mixfind=纯双条件辨别维。教学骨架（flat<0 迷你关+flat0 watch→help→solo）
零改动；档键 kidsgame_ins/CH_LEN=5/STATIC_LEVELS=20/难度章 (ch-1)%4+1 循环/
种子 mulberry32(flat×7919+887) 全不动；无迁移 IIFE。共享动物 SVG 仅**新增
data-seg 身体分段属性**（渲染像素零变化，dch1-3 行为与产物逐字节一致——
基线证据=quizzes JSON 对照，§R6）。

## §R2 难度章型表（章号/CH_LEN=5/STATIC_LEVELS=20/档键全不动）

| 难度章 | 章名 | 型 | 每关 5 题构成 | 新认知维度 |
| --- | --- | --- | --- | --- |
| 1 昆虫来啦 | judge | 原样（两选，flat0 教学链不动） | 基线（原样保留） |
| 2 蜘蛛来啦 | judge | 原样（两选） | 基线（原样保留） |
| 3 数数腿 | legs | 原样（两选+腿高亮恒在） | 基线（原样保留） |
| 4 大考验 | **3 选+干扰动物+分段+双条件+撤锚** | 固定谱 qi0=judge3 + qi1=legs3（叶挡腿）+ qi2=bodyseg + qi3=judge3 + qi4=mixfind | 3 选辨别/干扰动物入题/类目知识回忆/第二形态学判据/腿数×类目双条件 |

- DCH4_KINDS = ['judge3','legs3','bodyseg','judge3','mixfind']（qi 位确定性
  谱，替代旧 dch4「题表 kind 直接取材」——r24/r25 同范式；4 形态每关恒在场）。
- 生成关（flat≥20）dch=ri(rnd,1,4) 通道不变：dch1-3 生成关逐字节原样；
  dch4 生成关（flat 25/27/29/37/39，seed 887 实算）走新谱。
- 旧 dch4「legs3+judge2 按题表 rotate 混出」退役：judge 题辨别负荷由 judge3
  （3 选+干扰动物主角）承载、legs 题由 legs3（3 选+撤锚=类目知识回忆）承载。
  难度改造目的即内容变化，已通关档无矛盾态（§R7）。
- 题表 ROWS 20 行**原样保留**（dch1-3 取材域不变）；dch4 仍按 rotate 公式取
  row 号（quiz.row 字段照赋——20 行覆盖审计 cnt[i]==5 口径不变），但 kind
  由 DCH4_KINDS[qi] 覆盖、anim 按 §R3 派生。
- 章末预告文案随 ch4 内容更新：CHAPTERS[3].hint（预告 ch4）=
  『大考验来啦，还有新朋友蜗牛和蜈蚣』；GEN_HINTS[3]（dch4 生成关）=
  『大考验，认认蜗牛和蜈蚣』；CHAPTERS[1]/[2]/[4].hint 与 GEN_HINTS[0-2]
  原样。C7 对账口径（hint[i]↔CHAPTERS[i+1]）不变。

## §R3 生成律扩定（§1 r26 修订——四方同步红线）

- 种子通道不变：mulberry32(flat×7919+887)，同 flat 永远同关。
- **dch1/dch2/dch3 生成律逐字节原样**（buildQuiz 旧分支参数域不动，rnd 消耗
  每题恒 1 次 shuffled(2)）。dch4 分支在旧消耗**之前**整支分流（buildQuiz
  首行 `if (dch === 4) return buildQuiz4(...)`）——dch1-3 的 rnd 消耗序列与
  r26 前逐位一致（基线真不动双证据：①engine 源码锚 buildQuiz 分流先于旧
  shuffled；②flats 0-39 中 dch≠4 全部关 quizzes JSON 与基线对照逐字节相等，
  本轮交付前实测）。
- **封闭表扩展（推导律即真值）**：
  - LEGS 增 snail: 0 / centipede: 20（蜈蚣 20 条腿=「很多」的封闭表征，
    非教学口径「蜈蚣有 20 条腿」——教学句只说「不是 6 也不是 8」）。
  - 新表 SEGS：ant/butterfly/bee/ladybird=3（头胸腹）、spider/wolfspider/
    jumpspider/scorpion=2（头胸部+腹部）、centipede=15（很多段）、snail=0
    （不分段，不入 bodyseg 池=惰性值）。
  - 类目推导：LEGS==6→昆虫（insect）/LEGS==8→蛛形纲答案=蜘蛛（spider）/
    其余→都不是（none）。蜗牛 0、蜈蚣 20 均落 none——封闭表内无例外。
- **judge3/legs3 腿**（qi0/qi1/qi3）：主角 anim=题表行 anim（核心 8 种）；
  seeded 掷币 `rnd()>=0.5` 则换干扰动物主角（再掷 `rnd()<0.5`→snail 否则
  centipede）——约半数 judge3/legs3 以干扰动物为主角（答案=都不是）；
  picks=shuffled(3)；answer=picks.indexOf(推导律 id)。主角∈LEGS 全键集。
- **bodyseg 腿**（qi2）：anim=BODY_POOL[floor(rnd()*6)]，BODY_POOL=
  [ant,bee,spider,wolfspider,jumpspider,centipede]（**视觉诚实池**：6 只
  SVG 身体分段逐节可数且与 SEGS 一致；butterfly/ladybird/scorpion/snail
  不入池——§R1 论证）；picks=shuffled(['three','two','many'])；answer=
  推导（SEGS==3→three / ==2→two / ≥4→many）。
- **mixfind 腿**（qi4）：cond=rnd()<0.5?6:8（六条腿的昆虫/八条腿的蜘蛛）；
  match=契合类池 4 种 seeded 取 1；wrongCore=异类池 4 种 seeded 取 1；
  decoy=rnd()<0.5?snail:centipede（**每道 mixfind 恒含 1 只干扰动物**——
  审计①干扰动物入候选盘落点）；picks=shuffled([match,wrongCore,decoy])；
  answer=picks.indexOf(match)；quiz.anim=match（确认链尾名音取用；题面链
  **不含**主角名——念名即泄答案）；quiz.cond=6|8（verify 独立推导锚）。
  恒一性：封闭表内 LEGS==cond 的 pick 唯一（match 是唯一 6 腿/8 腿候选）。
- quiz 字段：新 kind 四型共用 {row,kind,anim,picks,answer,_miss,_answered}；
  mixfind 增 cond。全单步题（无两步范式——判定点每题 1 个，与基线同构）。
- **四方口径同步**：本节生成律必须 game-core.js（buildQuiz4/genLevel）/
  game-verify.js（③⑧⑮ SPEC 表独立对账+deriveV 独立推导）/ verify_batch40.py
  q_ins（主线 Python 独立复算——dch4 谱+三选驱动，§R8 适配清单）/ build.py
  （python 独立验算+结构锚）四处同源同步，缺一即独立复验红。

## §R4 新机制（3 选盘 / 叶挡腿 / mixfind 找一找 / 救援分层）

- **3 选盘**：renderTray 既有循环天然支持（trayEl.dataset.n=3）；盘宽
  3×150+2×26=502 ≤ max-width 640、竖屏 3×132+2×16=428 ≤ 560——零 CSS 尺寸
  改动，触摸面恒 ≥96×96。候选图：judge3「都不是」=蜗牛小图（与昆虫=瓢虫/
  蜘蛛=圆蛛实物小图同构）；legs3「都不是」=蜗牛小图（六/八腿排图标原样）；
  bodyseg=分段图标（three=3 节/two=2 节/many=7 节，逐节 data-seg 可数）；
  mixfind=动物实物小图（ANIM_INNER 复用，10 种全档）。aria 标签扩
  none=都不是/three=三段/two=两段/many=很多段/动物名（ANIMAL_NAME 兜底）。
  **已知泄题面（如实声明）**：judge3/legs3 以蜗牛为主角时，蜗牛主角图↔
  「都不是」蜗牛小图可图形互配（家族存量同型：基线 judge 蜘蛛主角↔圆蛛
  候选小图、瓢虫主角↔昆虫候选小图本就可互配——先例在案）；蜈蚣主角无
  互配通道（须真分类）。互配路径兼作「都不是」选项含义的发现通道，接受。
- **叶挡腿（legs3 恒挂）**：renderAnimal `classList.toggle('leg-hide',
  kind==='legs3')`；CSS `#animal.leg-hide [data-leg]{visibility:hidden}`+
  叶形遮挡条 .leafcover（绿 #8FBF7F、覆盖中带，动物头胸/壳/翅仍可辨识
  身份）。30s 答案级救援移除 leg-hide（掀叶），下一题 renderAnimal 按
  kind 重挂（探索不罚、重听不掀叶——hearBtn 重播恒藏腿，宁难勿易）。
- **mixfind 找一找**：舞台动物区=放大镜场景图（SEARCH_SVG，data-anim="search"
  ——「找一找」模式标识，非题面主角）；题面链=[ins_t_mix6|ins_t_mix8] 单段
  clip（无主角名音）；q-text=『找一找呀，六条腿的昆虫/八条腿的蜘蛛』；
  确认链=[ins_right, ins_a_<match>]（尾名音=找到的动物，r25 末步名音先例；
  窗 MIX_WIN=4554=2664+150+名 clip 实长 max 1440（ladybird，_clipdur40 实测）
  +300——**实测值口径，非占位**）。非 mixfind 确认链 [ins_right] 原样。
- **题面链与窗（家族 T 动态）**：judge3/legs3/bodyseg 链=['ins_a_'+anim,
  'ins_t_'+kind]（ins_t_judge3/ins_t_legs3/ins_t_bodyseg）；窗=ENTER 400+
  NAME_DUR[anim]+150+estMs(尾段)+300（estMs 全字符口径恒安全覆盖——新键
  注册前链静默（core queue 缺 clip 弃整句不崩），注册后实长必短于 estMs）。
  mixfind 窗=ENTER 400+estMs(尾段)+300。尾段文本 SAY_T4：judge3=
  『呀，它是昆虫、蜘蛛，还是都不是呀？』（17 字 estMs 6465）/legs3=
  『的腿有几条呀？想一想』（10 字 4050）/bodyseg=『的身体分几段呀？数一数』
  （11 字 4395）/mix6·mix8=『找一找呀，六条腿的昆虫/八条腿的蜘蛛』
  （11 字 4395）。NAME_DUR 增 snail/centipede=**实测回填 1344/1248**（主线
  注册后 mutagen 实测入 _clipdur40.json——原占位 1500 已收严，r26 回填锚）。
- **错反馈链（干扰动物主角加窗）**：错链 [ins_wrong, ins_sci_x] 构成不变，
  科普句按类目三向取（6 腿→sciInsect/8 腿→sciSpider/其余→**sciNone**）。
  ins_sci_none 文案『蜗牛和蜈蚣呀，不是昆虫也不是蜘蛛』（16 字，clip 实测
  4344）**超基线链 max 构成 sci_insect 3744**——干扰动物主角的错链改用
  WRONG_CHAIN_WIN4=1944+150+SCI_NONE_DUR+300=**6738**（SCI_NONE_DUR=4344 为
  **mutagen 实测**——主线注册后回填收严，原 estMs 占位 6120 已废）；核心
  动物主角链与豁免窗
  6638 原样（dch1-3 零改动含此窗）。首错摇头锁 SHAKE_MS 1100 总窗 1240
  两档通用（≤2094）。
- **救援两级（r24/r25 lastAct 纪律核对）**：本款救援无重演中间态（14s 方向
  级=saySci 单播不重播题面、不动 lastAct；30s 答案级=breathe+（legs3 掀叶）
  +重播题面链，完成段置 lastAct=Date.now()——现有语义 b25 M4 不变，无
  「对但未完成」中间态（全单步题无 half），无 M2 同型饿死/泄题面）。rescueTick
  重构=VERIFY 门+rescueCore 主体（真实页行为逐字节等价）；新增 VERIFY 页
  专用驱动 INS._idleHack(ms)/_rescueCore()（VERIFY 守卫，真实页 no-op）——
  ⑭ 救援分层单元直驱实证（r24 ㉑ 同范式，消除「verify 静默门掩盖救援死」盲区）。
- **星级口径**：全单步题，判定点每关恒 5（与基线同构）；retries 口径
  0=3★/1-2=2★/≥3=1★、永不 0 星全不动。autoSolve taps 恒 5（dch4 同）。
- **dch4 无「同关 5 题 anim 互异」约束**（judge3/legs3 主角掷币+bodyseg/
  mixfind 独立采样可重复——dch1-3 该性质保留，verify ③⑧ 分档断言）。

## §R5 引擎与钩子（game-core/game-main，向后兼容）

- buildQuiz 签名扩 (rowIdx, dch, qi, rnd)：首行 dch4 分流 buildQuiz4；
  旧分支代码逐字节原样（dch1-3 消耗不变）。genLevel 循环传 dch/qi。
- engTapPick/engWon/engStars/correctIdx 零改动（3 选盘天然兼容：越界守卫
  按 q.picks.length）。structWhy 扩：新 kind 分支（dch4 谱位校验 dch===4 且
  DCH4_KINDS[qi] 匹配+封闭表推导复算+picks 3 枚互异=该 kind 候选集+mixfind
  cond/唯一契合/answer=indexOf(match)+anim=match+初始态干净）；旧 kind 在
  dch4 谱位='dch4Kind' 红；rotate 行号复算两域共用（dch4 照赋 row）。
- **INS 钩子**：quiz getter 增 cond（mixfind 6/8，其余 0）；picks/answer/
  step/miss 语义原样（3 选快照拷贝）；tapPick/autoSolve/currentLevel 原样；
  新增 _idleHack/_rescueCore（§R4）。window.__insDemoR/__insTutSolo/
  __insWatchMs 证据链零改动。
- 主逻辑：renderAnimal（mixfind search 场景+leg-hide 按_kind toggle）/
  renderTray（PICK_LABEL‖ANIMAL_NAME 标签+pickSvg 四新分支）/quizSay
  （SAY_T4/MIX_SAY 分流）/presentQuiz（窗与链按 kind 分流）/saySci（三向
  sciKeyOf）/uiTapPick（mixfind 确认链+MIX_WIN 窗；错链 WIN4 分流）/rescueCore
  抽取+30s 掀叶。教学链/档键/日历/winFlow/celebrate/救援双锚结构零改动。

## §R6 基线不动证据（dch1-3+教学链，双证据）

- **证据①（源码锚）**：buildQuiz 首行 `if (dch === 4) return buildQuiz4(...)`
  ——dch4 的一切 rnd 取数在旧 shuffled(2) 消耗之前分流；旧分支
  `const picks = shuffled(PICKS_OF(row.kind), rnd);` 逐字节原样（每题 1 次
  rnd，dch 取数通道 flat≥20 先取 dch 后逐题的原顺序不变）。
- **证据②（产物对照）**：改造前已采集 flats 0-39 全部 genLevel(flat).quizzes
  JSON 基线（F:/claudecode/test/_r26_ins_baseline.json，交付时随附对照脚本
  输出）；改造后 dch≠4 的 35 关（flats 0-14 静态+dch1-3 生成关 20/21/22/23/
  24/26/28/30/31/32/33/34/35/36/38）逐字节相等——差集为空即证基线真不动。
  dch4 的 10 关（15-19+25/27/29/37/39）内容变化=难度改造目的本身。
- 教学链：mkQuiz/tutWatchLevel/tutTurnLevel/tutorialWatch 零改动（教学题恒
  两选 row0 ant judge——verify ② 断言口径不变）；共享 SVG 仅增 data-seg
  属性（渲染像素零变化）；CHAPTERS[3].hint/GEN_HINTS[3] 文案更新（章末预告
  预告的是 ch4 新内容，r24/r25 同款变更，非 dch3 玩法）。

## §R7 存档与兼容

**无档结构变化，无迁移 IIFE 需求**：档键 kidsgame_ins、levels 'ch-lv'、
CH_LEN=5、STATIC_LEVELS=20、日历语义、sv.ins.tutSeen 全不动；无新增运行态
子键（无一次性预告 clip，零新档字段）。难度章内容变化只影响未玩关的生成
内容（难度改造目的本身）；已通关记录与新代码无矛盾态（r20-r25 同款声明）。
运行态新字段（cond）每关由 genLevel 重建，不落存档。

## §R8 verify 适配（四层联动清单，grep 计数断言逐处同步）

- **build.py**：clips `n_clips == 20` → `>= 20`（子集式，r24 范式）+17 必备
  键精确在册；新增 8 键（INS_KEYS4）**注册前不在册**——断言 `在册数∈{0,8}`
  （防部分注册静默残缺），≥0 不强制；python 独立验算扩：LEGS 10 键
  （4×6+4×8+0+20）/SEGS 镜像/BODY_POOL⊆LEGS/DCH4_KINDS 形状/SAY_T4+
  MIX_SAY 文本与字数（17/10/11/11）/sci_none 16 字 estMs 6120（文案长度锚；
  窗终值走实长）/WRONG_CHAIN_WIN4
  =6738=1944+150+4344+300（**实长终值**——回填后三重断言：字面+推导式+D.ins_sci_none 双录）/MIX_WIN=4554=2664+150+1440+300 实测口径/NAME_DUR 实长
  1344/1248 双录（回填终值）；结构锚新增（data：SEGS/snail/centipede/DCH4_KINDS 在 engine/
  SEARCH_SVG/leafcover/sci_none；head：#animal.leg-hide；main：leg-hide
  toggle/'ins_t_mix' 分流/sciNone WIN4 分流/MIX_WIN/rescueCore/_rescueCore/
  尾段窗公式 estMs(SAY_T4[q.kind] || SAY_T[q.kind])；verify：SPEC_SEGS/
  SPEC_DCH4_KINDS/_rescueCore）；既有契约锚全保留（A/B/C/D/E/F/I/J/K/N 逐字
  +教学分账 TUT_SUM 原样）。
- **game-verify.js**：12→**15 单元**。①structure 扩（腿数锚 10 动物——
  snail 0/centipede 20；**data-seg 身体分段锚**：BODY_POOL 6 只 animSvg
  [data-seg] 计数==SEGS+候选 7 型分段图标计数==3/2/7；clips 子集式 ≥20+
  新键在场数记录（注册前 0/注册后 8）；sims 增 flat15 双视口——3 选盘
  触摸面 ≥96×96+对比度+overflowX≤0）；③drive 分档（dch1-3 flats 0-14 全
  套原断言含 anim 互异；dch4 flats 15-19：谱位 kind 逐 qi+structWhy null+
  deriveV 独立推导+rotate 行号+直驱 picked/done+3★，anim 互异断言退役）；
  ④frameM 动态化（盘数/链形/leg-focus/leg-hide/data-anim 按 kind 推导，
  flat0/10/15/20 四采样）；⑥pool 扩（LEGS 10 键推导律 4+4+0+20+SEGS 双录+
  DCH4_KINDS 双录+SAY_T4 双录；SPEC_ROWS 分布律原样）；⑧gen 分档（dch1-3
  生成关原断言；dch4 生成关 25/27/29/37/39 谱+推导；picksN===2 改按 dch）；
  ⑨windows 扩（WRONG_CHAIN_WIN4==8514≥estMs 下界+MIX_WIN==4554+
  NAME_DUR 占位双录+新源码锚）；⑩confirmChain 链形按 kind 动态（mixfind
  1 段题面链）；⑪⑫原样（flat0 dch1）；**新增三单元**——⑬ dch4 全关 UI
  实测（flat15：谱序 5 题 3 选盘逐题 tapPick 推进+legs3 leg-hide 在场+
  mixfind search 场景/cond/唯一契合+确认链 [ins_right,ins_a_match]+done 3★；
  total 12→15）、⑭ 救援分层单元（flat15 qi1 legs3：_idleHack(15000)+
  _rescueCore→科普句键按主角类三向+leg-hide **仍在**+无 breathe；_
  idleHack(31000)+_rescueCore→契合候选 breathe+leg-hide **移除**（掀叶）+
  重播题面链；分层实证——修复被删任一层该单元红）、⑮ dch4 谱聚合单元
  （静态+生成共 10 关：mixfind 恒含干扰动物候选+judge3/legs3 主角域⊆10+
  bodyseg 主角域⊆BODY_POOL+干扰动物主角在 20 道 judge3/legs3 中至少现 1 次
  （P(漏)≈0.5^20≈1e-6 确定性安全）+bodyseg「很多段」答案可达性按实存
  断言（不强求跨关全现——10 次 1/6 掷币无恒可达保证））。
- **_selftest.py**：**补 MUTE 静音双保险**（r19 红线——本款原版缺：两相页
  goto 前挂 init_script（任务书指定原文，键 kidsgame_ins）+种档 sound:false/
  tts:false/vol:0+speechSynthesis no-op+Audio.play 派发 ended）；P2 clips 断言
  改子集式 `n_clip>=20 and ins_keys>=17`；P2 新增 flat15 真实主流程块
  （INS.start(15)→currentLevel.dch==4+首题 kind=='judge3'+picks 3 枚+
  autoSolve done taps==5→存档 levels['4-0'].stars==3）——真实页 3 选/撤锚/
  混合题端到端证据（r23 P2-1 教训：参数须真实页实测，不止 verify 提速页）。
- **verify_batch40.py q_ins（主线职责，本文件声明适配清单不实施）**：
  dch4 分支改新谱（flat≥15 且 dch==4：kind 按 DCH4_KINDS[qi] 谱+picks 三选
  族按 kind（judge3={insect,spider,none}/legs3={six,eight,none}/bodyseg=
  {three,two,many}/mixfind=3 动物 id）+answer 推导律扩展（LEGS==6/==8/其余
  三向+SEGS 三向+mixfind cond 唯一契合）+主角域断言（judge3/legs3⊆10/
  bodyseg⊆BODY_POOL/mixfind=match）；两选族断言保留 dch1-3；T3 audit_static
  全 20 关含 dch4 谱驱动；OPEN_WAIT/WRONG_WAIT 按新窗核（dch4 题面窗 max
  8815×verify SPEED 不影响真实页等待口径——主线按实测调）；gate_common40
  G3 clips_n=20 由主线注册 8 键后传参 20→28。
- **主线注册后回填清单**（gen_clips 注册 8 键→_clipdur40 实测→回填）：
  ①NAME_DUR.snail/centipede 1500→实长；②SCI_NONE_DUR 6120→实长+
  WRONG_CHAIN_WIN4 复算（=1944+150+实长+300）；③verify SPEC_DUR 增 8 键
  实长±60 全量校验+⑮/① 新键在场断言收紧（0/8→8）；④MIX_WIN 无需动
  （名音恒核心动物，实长已知 1440 max）；⑤新题面尾段 estMs→可换实长
  （宁等勿叠口径，可选）。注册前新键链静默（core queue 缺 clip 弃整句），
  窗按 estMs 占位恒安全覆盖。

## §R9 时序参数实测口径（r23 P2-1 红线）

| 参数 | 值 | 口径 |
| --- | --- | --- |
| PICK_WIN | 2964 | 实测（=ins_right 2664+300，_clipdur40）——非 mixfind 确认链，原样 |
| MIX_WIN | 4554 | **实测**（=2664+150+1440+300；1440=ladybird 名 clip 实长 max，_clipdur40——mixfind 契合动物恒核心 8 种，无占位） |
| WRONG_CHAIN_WIN | 6638 | 原样（核心动物错链；=SPEC 字面值，实算下界 6138） |
| WRONG_CHAIN_WIN4 | 6738 | **实测终值**（=1944+150+SCI_NONE_DUR 4344+300；4344=ins_sci_none clip mutagen 实测——r26 主线注册后回填收严，原 estMs 占位 6120/8514 已废） |
| NAME_DUR.snail/centipede | 1344/1248 | **实测终值**（mutagen；原占位 1500 已收严）——题面窗=400+名实长+150+estMs(尾)+300 口径 |
| 题面窗（dch4 具名题） | 400+1440+150+6465+300=**8755**（judge3 max，名 max=ladybird 1440） | estMs 全字符口径（17 字尾段）恒安全覆盖（注册前链静默、注册后实长必短；8 键实长逐键核过均 < estMs） |
| 题面窗（mixfind） | 400+4395+300=**5095** | estMs 口径（11 字尾段） |
| estMs | len×345+600 | b25 定版全字符口径——仅 TTS 兜底句与占位窗用；clip 链窗注册后以实长+150+300 回收紧 |

## §R10 新语音键清单（8 键，上报主线 gen_clips 中央登记，禁自注册）

| key | text | 用途 |
| --- | --- | --- |
| ins_a_snail | 蜗牛 | 干扰动物主角名音（judge3/legs3 题面链首段） |
| ins_a_centipede | 蜈蚣 | 同上 |
| ins_t_judge3 | 呀，它是昆虫、蜘蛛，还是都不是呀？ | judge3 题面尾段（三选逐选项念白） |
| ins_t_legs3 | 的腿有几条呀？想一想 | legs3 题面尾段（藏腿=改「数一数」为「想一想」） |
| ins_t_bodyseg | 的身体分几段呀？数一数 | bodyseg 题面尾段（分段可见可数） |
| ins_t_mix6 | 找一找呀，六条腿的昆虫 | mixfind 题面（cond=6 单段链） |
| ins_t_mix8 | 找一找呀，八条腿的蜘蛛 | mixfind 题面（cond=8 单段链） |
| ins_sci_none | 蜗牛和蜈蚣呀，不是昆虫也不是蜘蛛 | 干扰动物科普句（错链第二段+14s 方向级救援——知识红线：既非昆虫也非蛛形纲） |

既有 17 键（ins_ 15+core 3——原任务书称 18 为计数笔误，manifest 实存 17
ins_ 前缀键 2026-09-21 实查）+全照用。8 新键已核 manifest 0 占用。
**注册前新键链静默无声**（core TTS 通道已删，queue 缺 clip 弃整句不崩）：
judge3/legs3/bodyseg 题面、mixfind 全链、sci_none 错链在注册前不可听——
按 r23 定案「先注册后交付」上报清单；游戏逻辑/verify/_selftest 在静默态
全绿（窗按 estMs 占位）。注册后主线按 §R8 回填清单收紧。

## §R11 验收数字口径（Executor 自测三门禁+主线两门禁）

①build 双跑 md5/chars 一致 ②VERIFY 双视口全过 **15/15**（含 flat15 三选
双视口）0 pageerror ③_selftest PASS（含 MUTE 双保险/P2 flat15 taps=5+
levels['4-0'].stars==3）④主线：verify_batch40 ins 腿（按 §R8 适配后）+
gen_clips 注册 8 键+实长回填 ⑤主线：审查+试玩另派。

## §R12 风险与未验证项（如实）

- **新 8 键注册前静默**：三新题型题面/干扰动物科普句不可听（逻辑全绿）——
  主线注册后回填（§R8 清单），窗口推导按 estMs 最长口径预留。
- 蜗牛主角↔「都不是」蜗牛候选小图可图形互配（§R4 已声明）：家族先例
  （基线蜘蛛/瓢虫主角同型互配）在案；蜈蚣主角无互配通道保住知识维度；
  真机儿童数据回归时观察是否需要换「都不是」图标（如改抽象「都不是」符号形）。
- bodyseg 主角池收紧为 6 只（视觉诚实池）：butterfly/ladybird/scorpion 的
  分段题缺席=存量 SVG 身体画法与三段事实不符——不重绘共享 SVG（保 dch1-3
  基线零变化），以池收紧规避；若后续愿意重绘三只（像素级变更需回归 dch1-3
  视觉验收），可扩池。
- dch4 单关时长预估：5 题×（题面窗 ~5-9s+作答）估 45-70s/关（vs 审计基线
  58.7-67.6s 同量级——难度升在认知负荷不在时长）；真机儿童数据回归复盘。
- 「都不是」选项含义无一次性预告 clip（省键）：题面尾段逐选项念白
  （ins_t_judge3）+错链科普句+14s 救援承载教学；首遇可能慢——宁难勿易
  口径接受，r24 ears 预告范式备选未启用。
- 主线 verify_batch40/gate 适配未实施（§R8 声明），Executor 自测不含其结论。
