# SPEC-BATCH30 · 5-6 岁三款（动物宝宝找妈妈 / 晚安故事序 / 迷宫探险）契约 v1（2026-09-10）

对象：5-6 岁段收尾批（#28-30，**全 90 款收官批**）。目录 `batch30/babylove|storybed|maze/`。
结构照 batch1-29：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch23/share/_src/（5-6 岁点选款+图卡反馈）、batch24/shaperoof/_src/（5-6 岁点选+错反馈轻化）、batch10/habit/_src/（流程排序先例——本批 storybed 逐点制参照其流程表但玩法不同）、batch28/coder/_src/（逐格走位+撞墙反馈+死局救援——maze 参照）、batch21/bubble/_src/（5-6 岁演出窗纪律）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-72 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b29 定版，一项违反=审查 Major 起步）：A. 启动 dayEnd 的 nextHint 传 `lim-1`（winFlow 传 `nextHint(null)`）；B. 救援钟双锚：14s 方向级独立节流锚 lastDir（不得重置 lastAct）+30s 答案级 ≥20s 独立节流；C. 预置存档键 `kidsgame_<game>` 必带 `v:'1.0'`；D. 吞输入轻叮必配容器 bump；E. 修复行为收窄先查教学特例；F. 章末 hint=预告下一章（hint[i]↔CHAPTERS[i+1]），生成关 nextHint 实算 `genLevel(f+1).dch-1` 禁 (ci+1)%4；G. queue 拼播链后窗=链总实长+300；H. 判对/奖励窗按实测 clip 时长+300；TTS 拼句窗=estMs 全字符口径 `len*345+600`+build 静态断言「窗≥estMs」；I. 错反馈链豁免窗 wrongChainUntil（仅链起播时设——sayW 返回是否入队，节流跳过不设窗；救援 interval 早退守卫，startLevel 重置 `lastWrongVoice=0; wrongChainUntil=0`，build 静态断言）；J. 错反馈语义句全程保留（flat≥3 只 10s 节流禁切通用 clip）+节流锚 startLevel 重置；K. rescueTick 面板在场守卫 `if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;`——救援 tick 必须命名函数 rescueTick()；L. TTS 数字/量词映射表覆盖封闭集全量值，量词前 2 用「两」，verify 全量值输出断言禁 undefined；M. 变换演出族（分相位渲染的题面）verify 必带帧内容断言；**N（b29 新立）. 拼播链 keyless TTS 段必居链尾**（core.js queue 弃尾语义 design/core.js:101-104：keyless 段播完即 return 丢余段——clip 段不得排 TTS 段后；verify keylessLast 断言+build 静态断言双落——b29 Mj-1 教训）**〕**

73. **babylove 动物宝宝找妈妈真值**（本批新增）：**配对封闭 6**（tadpole 蝌蚪→frog 青蛙/caterpillar 毛毛虫→butterfly 蝴蝶/chick 小鸡→hen 母鸡/puppy 小狗→dog 大狗/kitten 小猫→cat 大猫/calf 牛犊→cow 奶牛——幼体名+成体名各 12 互异，两代 SVG 图各 12 幅）；**题型两族**——**findmom**（出示幼体大图+幼体名音 →「它的妈妈是谁呀」4 成体图卡点选）与 **findbaby**（出示成体大图+成体名音 →「这是谁的宝宝呀」4 幼体图卡点选，ch3+ 才出）；**候选数学先验**：4 候选互异、含真值、⊆成体集（或幼体集）；**干扰规则：本对成体/幼体不可作自己题的干扰之外无近形约束**（5-6 岁不设近形对；干扰=随机异对，verify 断言干扰数恰 3 且互异且≠真值对）；章：ch1 findmom 2 候选/ch2 findmom 4 候选/ch3 混出（两族均 4 候选）/ch4 生成混合（seeded）；每关 5 题；确定性 seeded `mulberry32(flat*7919+<本批常量>)`；星级=miss 口径（0=3★/1-2=2★/≥3=1★）；错反馈语义：findmom 错→「再看看它的妈妈长什么样」（方向级=幼体图再 pulse）；findbaby 错→「再看看这个宝宝是谁」（方向级=成体图再 pulse）；判对确认句=right clip+成体/幼体名音拼播（**名音 clip 段在 keyless 段前——契约 N**）
74. **storybed 晚安故事序真值**（本批新增）：**流程封闭 6**（每流程 4 步，步文本互异跨流程允许重复词——**同词不同流程是复习锚非缺陷**：sleep 睡觉=刷牙→洗脸→穿睡衣→上床睡觉/getup 起床=睁开眼睛→穿衣→刷牙→吃早餐/washhand 洗手=卷起袖子→冲湿小手→搓搓泡泡→擦干小手/eat 吃饭=洗手→坐坐好→吃饭饭→擦擦嘴巴/out 出门=穿衣服→穿鞋子→背小书包→出门玩/bath 洗澡=脱衣服→冲冲水→搓搓澡→擦干穿衣）；**玩法=逐点制**：出题=某流程步骤乱序卡 +「先做什么呀」→点当前应做步骤（返回 'step'）→「然后呢」逐点至末步（末步返回 'right'，末题 'done'）；点非当前步骤=wrong+miss+wig（**已点过的步骤卡变 .done 淡化，再点=wrong 同口径**）；**章难度**：ch1 3 步流程（每流程取前 3 步+终步=4 步中抽 3？**定版：ch1 出 3 步短流程=流程前 3 步（第 4 步不出，卡池=3 张）**）/ch2 全 4 步/ch3 4 步+1 干扰卡（其他流程的步骤——点干扰=wrong+miss「这一步不在这个流程里」）/ch4 生成混合；每关 5 题=5 流程（封闭 6 流程相邻互异）；**候选数学先验**：ch1 池=该流程前 3 步恰 3 卡互异；ch2 池=4 步恰 4 卡互异；ch3 池=4 步+1 干扰=5 卡互异且干扰∉本流程步骤集；确定性 seeded；星级=miss 口径；错反馈语义：wrong→「再想想先做什么」（方向级=当前应做步骤卡 pulse——**答案级线索 miss≥2 才亮**，家族梯度脚手架）；判对确认句=right clip+步骤名音（同 keyless 规则契约 N）；**逐点反馈链 [stepKey, stb_next] fire-and-forget**——新点起新链掐断旧链=孩子抢点正常节奏（**豁免契约 G 锁窗**，b30 审查 m4 钉死）
75. **maze 迷宫探险真值**（本批新增，全龄三层难度）：**玩法**：seeded 生成迷宫（墙=格子障碍）→小兔在入口格→萝卜在出口格→**逐格点选相邻可行格**移动（返回 'moved'）→走到萝卜格=本局完成（'right'，末局 'done'）；点障碍格/对角格/不相邻格='wrong'+miss 轻反馈（**迷宫试错=探索，wrong 不 wig 人格否定只 pop+容器 bump**）；点已走过格子=**合法回退**（返回 'back'，回退不记 miss——死路自救机制）；**每关 3 局**（迷宫单局时长长于选择题，破 5 题惯例，SPEC 明示）；**三层难度**：ch1 5×5 少障碍（障碍 ≤4，曼哈顿短路）/ch2 7×7 中障碍（障碍 ≤10）/ch3 7×7 +**钥匙门**（钥匙格+门格——门挡在通路上，先点钥匙格拾取（'moved'+钥匙消失+「拿到钥匙啦」）才能过门；未拿钥匙点门格=wrong「先找钥匙哦」不记 miss？**定版：记 miss 同口径**——钥匙门=规划进阶非陷阱）/ch4 生成混合；**生成数学先验**：每局迷宫**必可解**（生成后 DFS 验证入口→出口连通，不通则重生成——ch3 还须验证拿钥匙路径+钥匙后到出口路径双段连通）；解不要求唯一（走通即 right）；墙分布 seeded 确定；星级=miss 口径（0=3★/1-2=2★/≥3=1★）；错反馈语义：wrong→「看看旁边能走的格子」（方向级=相邻可行格 pulse 高亮）；钥匙=「先找钥匙哦」专用句；判对确认=right clip（局终庆祝，无拼播链）

## §1 babylove 动物宝宝找妈妈（配对常识）

**玩法**：幼体/成体大图+图卡点选（图卡=动物 SVG，无文字依赖——5-6 岁不识字可玩）。
- 题型（4 章）：ch1 findmom 2 候选 / ch2 findmom 4 / ch3 两族混出 / ch4 混合
- 教学：watch=幽灵手指看蝌蚪图→点青蛙图卡（播「小蝌蚪」+「它的妈妈是谁呀」→点中）「帮宝宝找妈妈」→帮/独；`__blDemoR`
- 钩子：`BL = { get currentLevel, get quiz(){ kind('findmom'|'findbaby'), ask(幼体或成体动物 id), opts[](图卡 {anim}), answer, step, miss }, tapOpt(i), start(flat), autoSolve() }`——tapOpt 返回：对 'right'/末题 'done'/错 'wrong'/越界 null
- 语音：bab_tut_watch'看！帮宝宝找妈妈'/bab_tut_turn'你来点一点'/bab_hint'再看看想一想'/bab_right'找对啦，真棒'/bab_wrong'再想一想'/bab_q1'它的妈妈是谁呀'/bab_q2'这是谁的宝宝呀'（**前缀=bab_ 已核 manifest 无占用**；名音 bab_n_<id>×12=晓晓读中文名（蝌蚪/青蛙/毛毛虫/蝴蝶/小鸡/母鸡/小狗/大狗/小猫/大猫/牛犊/奶牛）；确认句=right+名音拼播，名音在 keyless 段前）

## §2 storybed 晚安故事序（流程排序）

**玩法**：流程步骤乱序卡+逐点排序；卡=步骤小图+文字（图为主文字为辅）。
- 题型（4 章）：ch1 3 步 / ch2 4 步 / ch3 4 步+1 干扰 / ch4 混合
- 教学：watch=睡觉流程演示（「先刷牙」点刷牙卡→「然后洗脸」→「穿睡衣」→「上床睡觉」排序完成）「把故事排排队」→帮/独；`__sbDemoR`
- 钩子：`SB = { get currentLevel, get quiz(){ flow(流程 id), steps[](本题卡池 {stepId, text, done}), answer(当前应做步骤 stepId), phase(已点数), miss }, tapCard(i), start(flat), autoSolve() }`——tapCard 返回：对步 'step'/末步完成 'right'/末题 'done'/非当前步（含已点/干扰）'wrong'/越界 null
- 语音：stb_tut_watch'看！把事情排排队'/stb_tut_turn'你来排一排'/stb_hint'想想先做什么'/stb_right'排对啦，真厉害'/stb_wrong'再想想先做什么'/stb_q'先做什么呀'/stb_next'然后呢'（**前缀=stb_ 已核无占用**；步音 stb_s_<flow>_<n>×24=晓晓读步骤名，逐点反馈+确认句用——**先例=batch10 hb_q_* 流程名单独 key**）

## §3 maze 迷宫探险（路径规划）

**玩法**：网格迷宫+逐格点选走位；小兔形象+萝卜目标。
- 题型（4 章=三层难度+混合）：ch1 5×5 / ch2 7×7 / ch3 7×7 钥匙门 / ch4 混合
- 教学：watch=幽灵手指点相邻格走 2 步到萝卜（「点旁边的格子走路」）「帮小兔子走迷宫」→帮/独；`__mzDemoR`
- 钩子：`MZ = { get currentLevel, get quiz(){ maze(当前局 {size, walls[], key?, door?, entry, goal}), pos(小兔当前格 {r,c}), hasKey, step(已走步数), miss }, tapCell(r,c), start(flat), autoSolve() }`——tapCell 返回：可行相邻 'moved'/拾钥匙 'moved'+hasKey 变真/到萝卜 'right'/末局 'done'/回退已走格 'back'/障碍·对角·不相邻 'wrong'/未钥点门 'wrong'/越界 null
- 语音：maz_tut_watch'看！帮小兔子走迷宫'/maz_tut_turn'你来走一走'/maz_hint'看看旁边的格子'/maz_right'走到啦，真聪明'/maz_wrong'看看旁边能走的格子'/maz_q'帮小兔子吃到萝卜'/maz_key'先找钥匙哦'（**前缀=maz_ 已核无占用**；无数字/名音需求——纯方向款）

## §4 交付与验收（承 batch15-29 流水线，含 b29 三条门禁）

语音预合成（gen_clips.py 扩 batch30 块：bab_ 19 条（通用 7+名音×12）/stb_ 31 条（通用 7+步音×24——**步骤文本以 §0.74 流程表为源正则对账防手抄**）/maz_ **7 条（通用 6+maz_key——§4 原记「8 条」系账面笔误，§3 语音列表恰 7 条，manifest 真值 7+core 3=10，gate G3 按 10 断言）**=**57 条**；**前缀 bab_/stb_/maz_ 已核 manifest 无占用（b28 立规先查）**）→ 3 agent 并行（任务书必带：契约 A-N 逐条（**N keyless 链尾=b29 新增**）/§0.73-75 真值数学先验逐条/钩子参数语义表/tapX 返回值语义（**含 maze 'back' 新值+storybed 'step' 新值**）/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>（b29 坑⑥）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact）→ 首单元门禁（gate_common30.py：BL/SB/MZ 钩子映射；**maze autoSolve taps=3 局合计非 5 题**）→ 探针定钩子语义（先 dump 钩子真实形状——b28 坑③）→ 独立复验（verify_batch30.py 单文件三款 T1-T11+T9b；**maze 生成可解性 python 侧独立 DFS 复算+T3 按局驱动**；真实路径推进由 verify_final30.py R8 承担）→ 全量回归（verify_final30.py R1-R8；R6 主入口 87→90）→ 两级入口（batch30/index.html 三卡+主入口插三卡+href 可达扫描）→ 反方审查+5 岁半试玩（剧本必含家长面板设多玩数；报告机制推断须开发复核后定案）→ 修复闭环 → 收官（**90/90 全线完成**，5-6 段 30/30）

**实长表（浏览器 Audio 实测，2026-09-10；等待窗=实长+300 余量；全表 57 条零缺漏（maz_ 7 条勘误同上））**：
- **bab_**：tut_watch 3072/tut_turn 1824/hint 2016/**right 2280（判对后窗 ≥2580）**/wrong 1656/q1 2232/q2 2184；名音 bab_n_*：butterfly 1416/calf 1416/cat 1344/caterpillar **1584**/chick 1440/cow 1344/dog 1368/frog 1368/hen 1344/kitten 1368/puppy 1416/tadpole 1368（**max 1584**——确认句=right+150+名音+300 ≥4310）
- **stb_**：tut_watch 3096/tut_turn 1776/hint 2040/**right 2520（判对后窗 ≥2820）**/wrong 2496/q 1896/next 1488；步音 stb_s_*：**max 1896**（sleep_3 上床睡觉；逐点反馈窗=步实长+300；排完确认链=right+150+步音+300）
- **maz_**：tut_watch 3264/tut_turn 1800/hint 2304/**right 2424（判对后窗 ≥2724）**/wrong 2664/q 2424/key 1896（钥匙窗=实长+300）
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

## §5 反方审查+试玩修复记录（2026-09-10 收官回填）

**反方审查**（REPORT-REVIEW-b30.md：0 fatal / 2 major / 5 minor）：
- **M1 全量回归证据链缺口**（R1-R7 与 R8 拆跑无一份 8/8 日志）→ 属实照办：M2 修复后全量重跑 `_final30.log` **8/8 PASS** 补齐。
- **M2 storybed 生成关循环取材**（chOfFlat→diffOfCh 恒循环，与 babylove/maze 随机分叉；verify 注释自称随机）→ 属实，裁决=统一随机：`game-core.js` genLevel 改 burn+`ri(rnd,1,4)`（maze 同源 b25 坑④模式）；T4 断言升级「四型全现+非循环（maxrun<5）」实证混序 `[1,2,3,4,1,1,4,4,3,...] maxrun=3`；storybed verify 12/12+gate 3/3 复跑+全量 8/8 重验。
- m1 babylove 语义句注释 10→11 字（estMs 4050→4395；窗与断言本按 11 字正确）/ m2 gate 注释 maze=11→10（maz_ 7 条勘误第三处账面）/ m3 T6 补「back 后 miss 不变」断言 / m4 逐点反馈链 fire-and-forget 豁免契约 G 钉死本节 §0.74 —— 均照办。
- m5 winFlow 语音形态三款不一 → 登记：storybed 末题确认链已含 right 时 celebrate 不重复播=更优听感（babylove/maze 判对链含 right+celebrate 再 right 实为重复），不改行为。
- 契约 N 专项（b29 Mj-1 类）**未复发**；§0.73-75 数学先验/双锚/窗数学全数实测合规。

**5 岁半试玩**（REPORT-PLAYER-5.5yo-b30.md：三款 0 pageerror、3+3+4 关通关、35 截图、家长面板三款 bonus5 全生效）：
- **零代码修复项**。P1 无「玩不下去」级；三条挫败点复核：①豁免窗吞输入=契约 I 家族设计权衡（登记）②maze 不相邻「静默」实证为口径混淆（源码 wrong 分支 deny+pop+bump+链完备，正常态实测 wrong+miss=1+链播出；疑观察落在 back 分支=回退静默系设计）③storybed 单关 56-77s=逐点制固有节奏（登记）。
- P3 五条全定案：babylove 无梯度=SPEC 正确+设计意图成立；maze 教学句 TTS=无预录资产家族 F 回退；wig 类不移除=重放模式非 bug；首日 6 关+bonus=设计行为。
- P2 五条入产品 backlog（家族待办登记）：加动物对/步动画提速/含门局开场预告/首日关数——「远点提示」一条经实证反馈已在无需做。

## §6 storybed r10 难度改造定版（2026-09-14 回写；§0.74 流程表/步音真值不变——本节只加不改）

审计背景（difficulty-audit/AUDIT-56.md 条目 29 判红）：「日常流程 4 步排序=3 岁已会；实测 56-77s/关时长全靠动画撑」。改造三 delta（建议行 80）：可换序多解 / 条件分支 / 缺步补卡。**§0.74 的流程封闭 6×4 步表与步音 stb_s_\<flow\>_\<n\>×24 全部保留为真值源**（gen_clips.py 正则仍从 §0.74 提取）；本节新增依赖表/条件步/缺步/认知模型四组真值，build.py 从本节正则对账禁手抄。

### §6.1 依赖表 DEPS（delta① 可换序多解）
判定铁律：步骤合法 ⟺ 未完成 ∧ 其前置集 ⊆ 已完成集（点选次序=任意拓扑序=「合理序」，非唯一序）。文字表（步骤固有号 n→前置号集；「无约束对」=两步无先后约束可互换）：
- sleep 睡觉：刷牙(0)无前置 / 洗脸(1)无前置 / 穿睡衣(2)无前置 / 上床睡觉(3)前置{0,1,2}——无约束对 (0,1)(0,2)(1,2)（先刷牙先洗脸均可，上床必须最后）
- getup 起床：睁眼(0)无前置 / 穿衣(1)前置{0} / 刷牙(2)前置{0} / 吃早餐(3)前置{1,2}——无约束对 (1,2)
- washhand 洗手：全序 0→1→2→3（卷袖/冲湿/搓泡/擦干）——无约束对 0
- eat 吃饭：洗手(0)无前置 / 坐坐好(1)无前置 / 吃饭饭(2)前置{0,1} / 擦擦嘴巴(3)前置{2}——无约束对 (0,1)
- out 出门：穿衣服(0)无前置 / 穿鞋子(1)前置{0} / 背小书包(2)前置{0} / 出门玩(3)前置{1,2}——无约束对 (1,2)
- bath 洗澡：全序 0→1→2→3（脱衣/冲水/搓澡/擦干穿衣）——无约束对 0
半数流程含可换对+半数全序混出：逐题判断「谁必须在谁前面」，不能一刀切背序。

### §6.2 条件步（delta② 条件分支）
- 唯一条件 rain：**「明天下雨」→ 出门(out) 流程插入固有号 4「带小伞」成 5 步**。插入后依赖：带小伞(4)前置{0}（穿衣服）；出门玩(3)前置扩{1,2,4}；其余同 §6.1 out。合法序：穿衣最先、出门最后、中间穿鞋/背包/伞自由（3!=6 种）。
- 条件卡视觉=题面顶「雨云+明天下雨」徽章；题面语音=stb_q_rain「明天下雨，出门记得带伞」（实长 3312ms）。
- **ch3（flat10-14）关型=rain 混合**：题 0 恒 rain（flat10q0=确定性锚点）；关内 rain 题数 nRain=seeded ri(2,3)（均 out）；其余位=order+1 干扰题、流程取非 out 的 5 流程互异。rain 题间允许相邻（同 out 同型），order 题与 miss 关内流程互异口径不变。

### §6.3 缺步补卡（delta③）
- ch4（flat15-19）关型=miss：题面=某流程 4 步链**缺 1 步**（缺口位 gapIdx=seeded 0-3 任一），顺序条=3 预填槽+1 缺口槽（虚线+?呼吸提示=方向锚不泄答案）；下方 4 候选卡=缺失步真值+3 干扰（其他流程步骤且文本∉本流程，同旧干扰规则）。
- 交互=单点补对：点缺失步卡=飞入缺口槽（返回 'right'，末题 'done'）；点干扰卡='wrong'+miss（专用句）。认知双步=找缺（读链+依赖反推缺什么）+补对（4 候选比对）。
- 题面语音=stb_q_miss「少了哪一步呀」（实长 1992ms）；确认链=[stb_right, 缺失步步音]。

### §6.4 章型 v2 与锚点
- ch1（flat0-4）可换序 order（纯 4 步依赖图）/ ch2（flat5-9）order+1 干扰 / ch3（flat10-14）rain 混合 / ch4（flat15-19）miss；生成关（flat≥20）dch=seeded ri(1,4) 同四型。每关 5 题=CH_LEN；STATIC_LEVELS=20 不变。
- **flat0q0 恒 sleep 前 3 步**（教学特例：3 步池=刷牙/洗脸/穿睡衣，刷牙洗脸互可换——演示序=刷牙→洗脸→穿睡衣；__sbDemoR='right' 终值语义不变；教学链预算 ≤16s 不变）。
- **flat10q0 恒 rain**（5 卡池含带小伞——布局/驱动/题面断言锚点）。
- 星级=miss 口径不变（0 错=3★/1-2=2★/≥3=1★）；tapCard 返回值族 step/right/done/wrong/null 不变（miss 题点对直跳 right/done）。

### §6.5 认知时长模型 COG（审计「时长全靠动画撑」的正面回应——认知与动画分账）
5-6 岁试玩推算口径：每决策点=扫描+约束检查+点选。数字表（ms，verify 按此独立复算 40 关每关，**硬断言：每关 Σ题认知 ≥40000ms 且 >该关动画基线**；动画基线=零错通关路径 Σ(step 锁 640/步 + 判对演出窗 5200/题)，错防重入窗属异常路径不计入）：
- baseStep 2200：order/rain 每步决策
- swapPair 900：每个无约束对额外权衡（多解题认知增量）
- distract 1100：每张干扰卡排除（ch2/ch3 order 题）
- condRead 2600：条件卡理解（rain 题前置：听条件句+把伞纳入流程）
- missScan 1000：miss 题链每实步扫描
- missInfer 2000：缺口推断（依赖约束反推缺什么）
- missCand 900：miss 题每候选卡比对
关级下界实证（零错路径）：ch1 全序关 44000（>动画 38800）/ ch1 含可换关 ≥47200 / ch3 63200 / ch4 43000（>动画 26000）——全部达标。

### §6.6 语音与钩子 v2
- 新增 3 键（既有 31 键一字不改；gen_clips.py batch30 块注册，manifest storybed=37 条=stb 34+core 3）：stb_q_rain「明天下雨，出门记得带伞」3312ms / stb_q_miss「少了哪一步呀」1992ms / stb_s_out_4「带小伞」1608ms。clips 注入计数=37（stb 34 + core 3）。
- 出题句分型：order=stb_q / rain=stb_q_rain / miss=stb_q_miss（play 单发无锁窗）。逐点链/确认链窗数学不变（步音 max 1896 不破；伞步音 1608<1896）。
- 错反馈三句族（keyless 恒尾）：GUIDE.wrong「再想想现在做哪一件事」(10 字，estMs=4050——窗 7100 按最长句罩)/GUIDE.distract「这一步不在这个流程里」(10 字)/**GUIDE.miss「再看看少了哪一步」(8 字，estMs=3360，r10 新增)**。
- 钩子 v2：`SB.quiz` 新增 kind('order'|'rain'|'miss') 与 **answers[]（当前合法步骤 stepId 集——多解实锤口径）**、chain[]（miss 题出示链，null=缺口位）；answer=answers[0] 兼容单答案语义；phase/step/miss/steps[] 不变。autoSolve taps=Σ(order/rain 题步骤数, miss 题 1)。
- 救援双锚不变；方向级=非 miss 题合法集全部卡 pulse 三连（多解=多卡方向锚），miss 题合法集恒=唯一答案卡，pulse 它即泄答案——改链区 #strip 整体 pulse（缺口槽常驻呼吸已是方向锚，与 dressup「场景 pulse 不指片」同批口径；REPORT-REVIEW-r10 M-2 修订）；答案级=第一张合法卡 breathe。

## §7 babylove r10 难度改造定版（2026-09-14 回写；§0.73 旧两族表由本节整体取代——旧 6 对 ⊆ 新 12 对真值兼容）

审计背景（difficulty-audit/AUDIT-56.md 条目 28 判红）：「幼体成体配对=3-4 岁档、仅 6 对第 2 章见底、实测 22s/关」。改造三 delta（建议行 79）：扩对+相似干扰 / 发育链三段序 / 生境×发育双维。**每题=3 步/小问**（tapOpt 新增 **'step'** 返回值=步完成非题尾，storybed 先例；'right'=题完成非末题；'done'=末题通关；'wrong'=miss+1 卡不灰可重选；null=非法）。

### §7.1 配对封闭 12（delta① 量扩+近形）
新 6 对：fishfry 鱼苗→fish 大鱼(w)/duckling 小鸭→duck 大鸭(w)/grub 甲虫幼虫→beetle 甲虫(f)/lamb 小羊→sheep 大羊(g)/piglet 小猪→pig 大猪(g)/foal 小马→horse 大马(g)——加旧 6 对共 12，两代名 24 互异，SVG 两代各 12+卵 6=30 幅互异。**CONFUSABLE 近形对：tadpole↔fishfry、caterpillar↔grub**（ch2+ findbaby 真值有伴时 4 候选必含伴恰 1 位；**habitat 不设近形位**——伴与真值同境同段破坏 2×2 唯一结构，近形辨析由 findbaby 承载）。生境：water{tadpole,fishfry,duckling}/forest{caterpillar,grub}/grass{chick,puppy,kitten,calf,lamb,piglet}（两代同境）。

### §7.2 题型四族（delta②③）
- **findmom/findbaby**：3 连小问（题内动物互异）4 候选 ⊆对应集互异含真值；dch≥2 findbaby 近形伴在场恰 1 位。
- **grow 发育链三段序**：GROWTH 6 链 frog/butterfly/beetle/fish/hen/duck 各 [egg_<链>,幼体,成体]；出示链成体大图+q3「它小时候是什么样呀」→ 卵→幼→成逐点点选（answer 按 phase 实算）；已点卡 .done 淡化+grow-tray 3 槽填充（序结构认知）。
- **habitat 生境×发育双维**：出示生境场景图（water/forest/grass 三幅）+拼句（bab_h_\<hab\>+q4_mom/baby）→ 3 连小问 want 两态在场；4 候选=(hab 对错×stage 对错) 恰 2×2：真值+同境异段+异境同段+双异 各 1。
- **m-2 定版**：grow 已正确用过的卡（视觉 done 淡化）再点='wrong' **不计 miss**（误触不罚——与 storybed §0.74「再点=wrong+miss 同口径」有意差异化：grow 卡池小且淡化后儿童重复点选常见，记 miss 有误伤面；REPORT-REVIEW-r10 m-2 裁决）。
- 章构（CH_LEN=5 题/关）：dch1 findmom/dch2 两族混出（全同翻 1）+近形/dch3 grow（5 链互异）/dch4 habitat（3 生境垫底补 2，每生境 ≥1）/dch5 四型掷+翻样保每关 ≥3 型；相邻题（kind:ask 串——habitat 用 hab 与 specKey 同口径）互异 ≤8 兜底；flat≥25 生成关 dch=ri(1,5)（m-5 措辞定版：dch 取数在 quiz 构造前先做——保 genLevel 纯函数确定性，非 storybed 式丢弃首掷；dch1-5 全现有 verify 断言兜底）。STATIC_LEVELS=25。

### §7.3 时长窗（r10 实测 clip 定版；modeled ≥40s 硬断言=审计 22s 根治）
SUB_WIN 2400（配对小问切换锁窗 ≥名音 max 1848+300）/ HAB_SUB_WIN 2600（≥q4_mom 2136+300）/ GROW_STEP_WIN 2200（grow 步 fire-and-forget——链 [阶段名音, grow_next] 续播不锁，storybed 豁免契约 G）/ 判对窗 4800（1600+3200 ≥right 2280+150+名音 1848+300=4578）/ 错链豁免 6600（≥wrong 1656+150+estMs(11) 4395+300）。**关 modeled 下界=Σ题（配对 2×2400+4800=9600 / grow 2×2200+4800=9200 / habitat 2×2600+4800=10000）×5 题 → 48000/46000/50000ms——全 ≥40000**（verify ① 全 45 关断言+⑰ 复核；wall-clock=节奏驱动实测×(1/SPEED) ≥40000——grow 步补 GROW_STEP_WIN 窗，autoSolve 抢点口径会低估不采用）。竖屏 orientation 段 ask-slot svg 122px（≥120 可读线）。

### §7.4 语音 25 新键与钩子 v2
- 新增 25 键（既有 19 键一字不改；manifest babylove=47=bab 44+core 3）：bab_q3「它小时候是什么样呀」2520 / bab_grow_next「然后呢」1488 / bab_h_water 1728·h_forest 1896·h_grass 2016 / bab_q4_mom「妈妈是哪一个呀」2136·q4_baby「宝宝是哪一个呀」2064 / 名音 18（新动物 12+卵 6：grub 1848=max 名音、egg_* 1344-1632）。
- 错反馈四句族（keyless 恒尾，AGAIN_OF 按题型）：findmom「再看看它的妈妈长什么样」11 字/findbaby「再看看这个宝宝是谁」9 字/grow「再想想长大的顺序」8 字/habitat「再看看它住在哪里」8 字。
- 开题链：findmom/findbaby/grow=[名音,q*]（clip+clip 无 keyless）；habitat=[bab_h_\<hab\>, q4_mom/baby]。步链：配对=[新小问名音]（SUB_WIN 罩）/ habitat=[新小问 want 的 q4]（链头由 tap 后新小问 want 决定）/ grow=[阶段名音, grow_next]。
- 钩子 v2：BL.quiz={kind('findmom'|'findbaby'|'grow'|'habitat'), ask(幼体|成体|链id|生境id), want?('mom'|'baby'——habitat), opts[{anim}], answer, step, substep(0-2), miss}；教学演示 __blDemoR='step'（r10 步语义，gate G2 按 hook 期望）；autoSolve taps=15（3 步×5 题）。

### §7.5 verify 断言口径（r10）
game-verify.js 18 单元 64 断言：①45 关审计（det/structWhy/ch/dch/drive/solvedAll/specOk/modeled≥40000；Lc 副本 habitat 题同样步进推进——grow 逐点复算依赖）③聚合（dch2 两族/dch4 三生境/dch5 ≥3 型/生成 dch1-5 全现）⑥habitat 单元 step 链断言按 tap 后新小问 want+题尾 'right'+确认链 [bab_right, 名音]⑮章末预告五章逐点 f=4/9/14/19/24+哨兵 f=3/5/25+生成实算 [25,29,34,39,44]⑰modeled+wall-clock。verify_one_babylove.py D0-D8（引擎级 45 关审计+UI 状态机+星级+确定性+锚+家族源码级）8/8；verify_batch30.py babylove 段 T1-T11 12/12（MOM 12 对/四题型步进/静态 25 关/生成 25-44 五型/T6 步语义/T10 五章五型）；gate_common30.py clips_n=47+G2 demo='step'；verify_final30.py R4 抽验键 20+R8 CH3MAP(f10=dch3)=全 grow。
