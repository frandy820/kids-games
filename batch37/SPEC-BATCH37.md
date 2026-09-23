# SPEC-BATCH37 · 扩容批 7（感谢的话 / 植树程序 / 教会小兔子）契约 v1（2026-09-12）

对象：120 款扩容第 7 批（每段各 1 款）。目录 `batch37/thanks|plant|teach/`。
结构照 batch1-36：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch36/comfort/_src/（社交情感情景款+情景句 keyless TTS+好/坏卡——thanks 强参照）、batch34/hidecup/_src/（网格交互+点选判定+错链豁免窗——plant 参照）、batch35/errdoc/_src/（多步流程型款 spot→fix→why 先例——teach 参照，其三步结构与「示范→学→纠错」同型）、batch33/soundcount/_src/（播音锁+数字 TTS——plant 程序卡播报参照）、batch19 gomoku4（演出时序终局快照——teach 兔子步演出参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-84 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b36 定版，一项违反=审查 Major 起步）：A-O+I 补全承 SPEC-BATCH33.md §0 括注原文（A 启动 dayEnd nextHint(lim-1)/winFlow null；B 救援钟双锚；C 预置存档 v:'1.0'；D 吞输入轻叮配 bump；E 修复收窄先查教学特例；F 章末 hint=预告下一章+生成关 nextHint 实算 genLevel(f+1).dch-1；G 拼播链后窗=链总实长+300；H 判对窗=clip+300；TTS 窗=estMs(len*345+600)+300；I+I补 错链豁免窗 wrongChainUntil 真时钟+guard 条件式（错点吞/对选放行/窗后二错照计 miss）+startLevel 重置；J 错反馈语义句 flat≥3 只 10s 节流；K rescueTick 面板守卫；L TTS 数字映射表覆盖封闭集全量值（**本批 plant 程序卡行列 1-4 要 TTS——NUMCN 1-4 子集+「第X行第Y列」骨架句；teach 任务数 2-7 要 TTS——NUMCN 2-7**）；M 帧内容断言三层；N keyless TTS 段恒链尾（**thanks 情景句=题面 say 非队列链，N 仅约束 queue 链——承 b36 comfort 明示防误伤；plant 程序卡句同**）；O 自建 button 显式 color）。b33 三条硬性全承（钩子表 step 语义显式/生成关 dch 策略显式声明/build.py core 注入幂等）。**b35 M1 裁决带入：三步完整演示款教学 watch ≤22s 款型分支（单步演示款仍 ≤16s）——teach 三步款按 ≤22s 预算**。b34-b36 坑带入：miss 在 core 判定层的款 guard 须判定前拦+预判与 core 严格同构/verify 页写档 origLS 保护+try/finally（b36 m4）/SPEC 先验写前验算数学可满足性+约束互斥检测（b35 a=5 教训）/钩子表列全 verify 需独立推导的派生池字段（b35 ED.pills 缺口）〕**

**〔b36 M1 家族缺陷强制项（本批起 build 层硬性，违反=审查 Major）：①build.py 布局=verify 独立第 4 个 script 块（script[0]=core，script[1]=data 段按实序，**script[2]=纯 data+engine+main（无 verify 字面）**，script[3]=verify）——verify ⑨ 源码断言读 script[2] 恢复判别力；②verify ⑨ 肯定断言检索字面**逐条与 main 真源字面核对**（具名常量断言写常量名=真源形态如 `WIN_MS = 2604`，禁写推导式字面）——禁自造 main 中不存在的字面（b36 实锤 `2604 * SPEED` main 无）〕**

88. **thanks 感谢的话真值**（5-6 段，社交情感/语言·感恩表达；调研 #133 原标 6-7，**本批降坡 5-6 实态**（EXPANSION 排期 5-6 段+降坡条款）：降坡三件=ch1-2 两选 1 好 1 坏+题面=情景演出+keyless TTS 情景句（零文字依赖，b31 anm/b36 comfort 先例）+反馈带情景演出（选对=朋友开心演出））：**与 b36 comfort 差异显式声明（防同质化审查项）**：comfort=「安慰伤心的朋友」答案=**行为类别**判断（帮 vs 笑）；thanks=「回应帮助过你的朋友」答案=**表达选择**（感谢回应 vs 不回应）——同 I 类 SEL 但训练目标不同（共情行为 vs 感恩表达），**情景主语反转**（comfort=朋友遇难孩子出手；thanks=孩子受助孩子回应）+好卡集=感谢方式多样化（**1 语言+4 行动共 5 种 label——以 §1 表为准**，非单一「说谢谢」）。**玩法=帮助情景选回应卡**：舞台呈现「小动物帮了你」情景（角色 SVG 演出+帮助动作），keyless TTS 播情景句（封闭 20 句入 §1 题库表），下方 2-3 张回应卡（图+短词）：**选好卡=朋友开心演出+right+th_right；选坏卡=wrong+miss+th_wrong「朋友会伤心的」（SEL 铁律：温和不羞辱——坏反馈恒指向行为后果；§1 语音表为准）**；miss≥2 好卡 breathe（答案级）；**题库封闭 20 题（4 章×5，§1 全表）：ch1=直接帮助·语言感谢（说谢谢 vs 不回应）；ch2=直接帮助·行动感谢（送花/抱抱/帮回 vs 不回应）；ch3=3 选 1 好 2 坏（两坏不同类别：忽略+嫌麻烦）；ch4=混合复习+新情景**；**语义先验（验算 ✓）**：每题恰一张好卡（唯一解锚）+好/坏类别可分（回应感谢 vs 不回应/负面回应——无模糊项）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+727)，域全档成立型）**；ch 每关 5 题；星级=miss 口径；教学：watch=幽灵手指演示（情景→点感谢卡→朋友开心）→点中；turn=你来试一试（帮/独）；seed 727

89. **plant 植树程序真值**（6-7 段，计算思维/空间·程序执行+坐标定位；调研 #15）：**玩法=按程序卡在网格种树**：舞台=花园网格（带行列标尺：左侧行号 1-N/顶部列号 1-N，6-7 岁坐标入门），题面=一张程序卡亮出「第X行 第Y列」+keyless TTS 同句播报，孩子点对应格：**点对=树苗生长动画+planted（视觉进度：花园逐渐成形）；点错=wrong+miss+标尺高亮重读（先看行，再看列——方向级反馈=错时高亮正确行/列标尺一格）；连续执行一关 5 张程序卡=5 棵树（关=小花园程序）**；miss≥2=正确格 breathe（答案级）；**关末花园全景展示=与目标花园比对演出（全对零错=花圃开花加成——纯演出层，判定每步即判）**；**数学先验（封闭域验算 ✓）**：**每关恒 5 题 5 张卡 5 棵树**（题=程序卡粒度：每题一张卡一步，b33 坑① step=全关题号 0-4）；**ch 档差异=网格边长单调坡度：ch1-2 3×3（9 格）/ch3-4 4×4（16 格）**（初稿「每关 2/3/4/5 步」卡数梯度与「每关 5 题」冲突——主线裁决 2026-09-12：以 5 题恒定+网格坡度为准，卡数梯度字样作废）；**步格互异**（同关 5 格不重复——种过的格不能再种：点已种格=拒绝 bump 家族 D 不计 miss）；**坐标域（每题独立 seeded）**：row,col∈[1,N] 均匀取，关内 5 格互异（验算 ✓：9 格取 5、16 格取 5 均充足）；**生成关 dch 策略=静态 ch 档（ch1-4 恒定 dch=ch——域承诺型：3×3→4×4 网格渐大为单调承诺，随机破坏坡度；dch RNG 与题内坐标 RNG 分流：dch=静态无 RNG，坐标=mulberry32(flat*7919+737+qi*131) 逐题独立）**；**NUMCN 1-4 契约 L（「第X行第Y列」骨架句——1-4 全量 4 值「一/二/三/四」）**；星级=miss 口径；教学：watch=幽灵手指看种树（卡亮→读卡→点格→树长出）→点中；turn=你来种一种（帮/独）；seed 737

90. **teach 教会小兔子真值**（7-8 段，元认知/协作心智·教授式学习（learning by teaching，离线脚本化近似——调研 §8 明示不宜对外宣称「训练 AI 素养」）；调研 #200）：**玩法=当小老师教兔子数数**，每题=一节三步小课（**流程型款承 b35 errdoc 三步先例，教学 watch ≤22s 预算**）：**①示范步**：任务句 keyless TTS「教兔子数 N 个苹果」（碗+托盘苹果堆），孩子从托盘点苹果入碗（点一个飞入一个，碗计数点阵显示）——**碗容量=N 点满自动确认**（数数过程自由探索不计 miss：点超=托盘剩余苹果置灰+轻叮 bump）；**②兔子步（纯演出）**：兔子观察动画（探头看碗）→「我来试试！」→兔子在 学习碗 摆 M 个苹果（M=N+δ，δ∈{+1,-1} seeded——脚本化必错一次：教学闭环核心=孩子诊断他人错误）；**③纠错步**：两卡[多了一个，拿走一个][少了一个，再加一个]——**M>N 前者对/M<N 后者对（唯一解锚：诊断=数量比较+操作映射）**；选对=兔子修正动画（拿走/补一个）+学会庆祝+right（「兔子学会啦，你是好老师」）；选错=兔子困惑摇头+wrong+miss（「兔子还没听懂哦」——SEL：指向教学效果非孩子人身）；miss≥2 正确卡 breathe；**数学先验（验算 ✓）**：ch1 N∈{2,3}；ch2 N∈{4,5}；ch3 N∈{6,7}；ch4 N∈2-7 seeded 混合（域全档成立型）；δ=±1 恒（M 域 N+1≤8——碗容量视觉域内）；**题 RNG 取数序定版（agent 裁决回写）：seed=flat*7919+747 题序连取，每题先 N=ri(rnd,域) 后 δ（rnd()<0.5→-1 否则+1）；生成关先取 dch=ri(rnd,1,4) 再连取题值**（同题确定性；verify 用同式副本对账）；**每题 miss 只在纠错步（示范步/兔子步零判定——流程分步语义 b33 坑①：quiz.phase 字段显式 'show'|'rabbit'|'fix'）**；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+747)，ch4=全域混合）**；ch 每关 5 题=5 节小课；星级=miss 口径（纠错步选错计）；**NUMCN 2-7 契约 L（任务句「数 N 个」——6 值「二/三/四/五/六/七」）**；教学：watch=幽灵手指看一节完整小课（示范→兔子错→纠对→学会，**三步完整演示款 ≤22s**）→走完；turn=你来教一教（帮/独）；seed 747 **〔r5 难度改造 2026-09-13：本条 v1 玩法/章型/钩子/语音窗已升级——目标数 2-7→4-20+按群计数+错误三型（漏数/重复/换序）+生成化 4 选诊断卡+教到会两轮跟踪；真值源=§6 r5 版本块（封闭表+时序分账+RNG 取数序定版）；v1 原文作废留档〕**

## §1 thanks 感谢的话（5-6 段·社交情感/语言）

**玩法**：朋友帮了你，怎么回应它？
- 教学：watch=幽灵手指看演示（情景→点感谢卡→朋友开心）→点中（演示题=scene1 扶起你 7 字短句控预算，turn 题=scene0 正式关首题同款——comfort 先例）；turn=你来试一试帮/独；`__thDemoR`
- 钩子：`TH = { get currentLevel, get quiz(){ scene(情景 id 0-19), say(情景句 keyless 文本——题面真值), cards[](回应卡 {good 布尔, label} 恒全摆 2-3 张), answer(好卡下标——verify 独立推导：cards 中唯一 good===true 的 i), step(全关题号 0-4——b33 坑①), miss }, tapCard(i), start(flat), autoSolve() }`——tapCard 返回：i=answer→'right'/末题 'done'；坏卡→'wrong'；演出期 null（真时钟锁）
- 题库 20 题全表（情景句=题面 keyless TTS 真值源，verify 双录对账；主语恒=「它帮了你」——受助视角）：
  - ch1（直接帮助·语言感谢·2 选）：①捡帽子「小熊帮你捡起了帽子」→好[说声谢谢]坏[转身就走]；②扶起你「小兔扶你起来了」→好[说声谢谢]坏[自己跑开]；③找手套「小猫帮你找到了手套」→好[说声谢谢]坏[什么都不说]；④推秋千「小狗帮你推秋千」→好[说声谢谢]坏[说不用你推]；⑤修小车「小猴帮你修好了小车」→好[说声谢谢]坏[嫌它太慢]
  - ch2（直接帮助·行动感谢·2 选）：⑥分享贴纸「小羊把贴纸分给你」→好[送朵小花]坏[收下就走]；⑦撑伞「小鹿下雨给你撑伞」→好[抱抱它]坏[说这没什么]；⑧留蛋糕「小猪给你留了蛋糕」→好[画张贺卡]坏[忘掉它]；⑨搬积木「小马帮你搬积木」→好[帮回它]坏[让它搬去]；⑩指路「小鸡给你指了路」→好[送朵小花]坏[头也不回]
  - ch3（3 选 1 好 2 坏·两坏异类=忽略+负面）：⑪新「小松鼠把位置让给你」好[说声谢谢]坏[当作应该][说我不稀罕]；⑫复现②+坏[自己跑开][说它多管闲事]；⑬新「小兔帮你够到了书」好[抱抱它]坏[拿了就走][说谁要你帮]；⑭复现⑥+坏[收下就走][嫌贴纸旧]；⑮新「小狗帮你挡了球」好[画张贺卡]坏[笑它多事][不理它]
  - ch4（混合复习+新·3 选）：⑯新「小猴帮你拎了袋子」好[帮回它]坏[说不用你拎][空手走开]；⑰复现⑦+坏[说这没什么][抢过伞自己走]；⑱新「小熊借你蜡笔用」好[说声谢谢]坏[弄断不还][一声不吭]；⑲复现⑨+坏[让它搬去][说它力气小]；⑳新「小猫陪你等妈妈」好[抱抱它]坏[说好无聊][先跑掉]
- 语音：th_tut_watch'看！朋友来帮忙'/th_tut_turn'你来试一试'/th_hint'怎么说谢谢呢'/th_right'你真有礼貌'/th_wrong'朋友会伤心的'（**前缀=th_ 已核 manifest 无占用 ✓ 2026-09-12 实查**）；情景句=题面 keyless TTS（say 非队列链——N 不适用承 b36 明示）；确认链=right 单 clip；错链=th_wrong+150+th_hint+300（实长表 §4 定）
- SEL 纪律：坏反馈恒指向行为后果（「朋友会伤心的」）禁人身评价；好卡集感谢方式多样化（1 语言+4 行动共 5 种——非单一答案形态，以题库表为准）；5-6 岁选项 label ≤4 字配图
- **防同质化声明（审查项）**：与 b36 comfort 差异=主语反转（受助视角）+答案=表达选择非行为类别+好卡集多样化（comfort 好卡=帮的行为，thanks 好卡=感谢表达）——三重差异

## §2 plant 植树程序（6-7 段·计算思维/空间）

**玩法**：看程序卡，把小树种进花园。
- 教学：watch=幽灵手指看种树（卡亮→幽灵手指点对应格→树长出）→点中；turn=你来种一种帮/独；`__plDemoR`
- 钩子：`PL = { get currentLevel, get quiz(){ row(本题行号 1-N), col(列号 1-N), n(网格边长 3|4), planted[](已种格扁平下标数组——进度真值), card(程序卡文本'第X行第Y列'——骨架句真值), step(全关题号 0-4), miss }, tapCell(i)(i=扁平 0-8|0-15), start(flat), autoSolve() }`——tapCell 返回：i=(row-1)*n+(col-1)→'planted'/末题 'done'；错格→'wrong'；已种格→false（bump 家族 D 不计 miss）；演出期 null
- 语音：pl_tut_watch'看！按卡种小树'/pl_tut_turn'你来种一种'/pl_ask'种在哪一格'/pl_hint'先看行，再看列'/pl_right'小树种好啦'/pl_wrong'再看看卡片哦'（**前缀=pl_ 已核无占用 ✓**）；程序卡句=题面 keyless TTS「第X行第Y列」（NUMCN 1-4，骨架 6 字恒定——estMs 窗按 6 字 2670+300；初稿 7 字系笔误，agent 交付勘误 2026-09-12 回写）；确认链=right 单 clip；错链=pl_wrong+150+pl_hint+300；**方向级反馈=错时高亮正确行标尺+列标尺（视觉重读，不泄坐标格——只亮行列边缘不亮格子本体）**
- 渲染铁律：行列标尺在场（左侧行号/顶部列号恒可见——坐标教学锚）；网格格 ≥96×96（家族触摸目标）；树苗 SVG data-anim 渲染即引擎（契约 M）；**点已种格=格上树苗轻摇+拒绝（不响 wrong 不计 miss——探索不罚）**
- **step 语义（b33 坑①明示）**：step=全关题号 0-4（每题=一张程序卡）；quiz.row/col=本题目标格

## §3 teach 教会小兔子（7-8 段·元认知/协作心智）**〔r5 改造 2026-09-13：本章钩子表/语音窗/纠错卡为 v1 留档——r5 真值源=§6〕**

**玩法**：你当小老师，教兔子学会数数。
- 教学：watch=幽灵手指看一节完整小课（示范点 N 个→兔子摆错→纠对→学会，**三步完整演示款 ≤22s**）→走完；turn=你来教一教帮/独；`__tchDemoR`
- 钩子：`TCH = { get currentLevel, get quiz(){ phase('show'示范|'rabbit'兔子演出|'fix'纠错——**b33 坑①流程分步语义**), n(本题目标数 2-7), m(兔子摆的数——fix 阶段真值), bowl(示范碗当前苹果数——show 阶段进度), delta(m-n 恒 ±1——fix 阶段), cards[](纠错两卡 {good,label}——fix 阶段), answer(好卡下标——verify 独立推导), step(全关题号 0-4), miss(纠错步选错计) }, tapApple(i)(show 阶段点托盘苹果 i), tapFix(i)(fix 阶段点纠错卡 i), start(flat), autoSolve() }`——tapApple 返回：入碗='in'/碗满自动确认='confirmed'（转 rabbit 演出）；点超（碗满后再点）→false（bump）；tapFix 返回：i=answer→'right'/末题 'done'；错卡→'wrong'；演出期（rabbit 阶段/演出窗）→null
- 语音：tch_tut_watch'看！当小老师'/tch_tut_turn'你来教一教'/tch_task'教兔子数一数'/tch_hint'看看兔子摆对了吗'/tch_right'兔子学会啦，你是好老师'/tch_wrong'兔子还没听懂哦'（**前缀=tch_ 已核无占用 ✓**）；任务句=题面 keyless TTS「教小兔子数 N 个苹果」（9 字骨架与 §4 实长表 estMs 3705 口径吻合——初稿「教兔子数」8 字系笔误，agent 裁决回写；NUMCN 2-7——契约 L 子集 6 值）；兔子步演出句=keyless「兔子说：我来试试」（短句固定，与兔子探头 800ms 重叠起演）；确认链=right 单 clip（「你是好老师」自豪感叙事；**right 演出窗=3420 精确（家族 H）+celebrate 层 2620+800=3420 恰等补足——SPEC §4 窗张力裁决定版**）；错链=tch_wrong+150+tch_hint+300；**教学 watch 折算口径 +2500ms 容差（verify 页 100ms 轮询步进+setTimeout clamp 不随 SPEED 缩放；真实页实测 21067≤22000 严格达标）**
- 流程纪律：**miss 只在 fix 阶段**（show 数数自由探索+rabbit 纯演出零判定）；**同题 δ seeded 确定性**（verify 可独立复算 m）；碗计数=点阵子化显示（苹果图标逐个——非数字文字，7-8 岁数感锚）；兔子演出=800ms 级时序（gomoku4 先例）；**纠错卡 label=「多了一个，拿走一个」「少了一个，再加一个」**（诊断+操作一体——元认知双件）
- **防同质化声明（审查项）**：与 b35 errdoc（错题诊断）差异=teach 诊断对象=学习中的伙伴非错题（协作心智）+示范步=孩子先做对再教（教学相长闭环）+错误由伙伴产生非题库给定——errdoc=「找错」，teach=「示范→看学→纠错」完整教授环路

## §4 交付与验收（承 batch15-36 流水线）

语音预合成（gen_clips.py 扩 batch37 块：th_ 5 条（tut_watch/tut_turn/hint/right/wrong）/pl_ 6 条（tut_watch/tut_turn/ask/hint/right/wrong）/tch_ 6 条（tut_watch/tut_turn/task/hint/right/wrong）=**17 条**；前缀 th_/pl_/tch_ 已核 manifest 无占用 ✓ 2026-09-12 实查）→ 3 agent 并行（任务书必带：契约 A-O+I 补逐条+b33 三条硬性+b34-b36 坑带入+**b36 M1 强制项：build.py verify 独立第 4 script 块+verify ⑨ 肯定断言字面逐条与 main 真源核对**+§0.88-90 先验逐条+钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>（b29 坑⑥）/契约 M 帧内容断言（thanks 朋友开心 DOM 类断言+plant 树苗 DOM 断言+teach 碗计数 DOM 断言）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact/verify 页先等 title=VERIFY PASS 再驱动/无头测试 --mute-audio+stub 发声/**teach 流程分步 phase 吞输入语义（非 fix 阶段 tapFix=null）+plant 已种格 false 不计 miss**）→ 首单元门禁（gate_common37.py：TH/PL/TCH 映射——**教学末步分款：thanks='right'/plant='planted'（tapCell 枚举无 'right'，初稿复制 thanks 枚举系笔误 2026-09-12 回写）/teach='done'（一节小课完整走完——errdoc 先例）**）→ 探针定钩子语义 → 独立复验（verify_batch37.py T1-T11+T9b）→ 全量回归（verify_final37.py R1-R8；R6 主入口 108→111）→ 两级入口 → 反方审查+分龄试玩（thanks=5.5 岁/plant=6 岁半/teach=7 岁半）→ 修复闭环 → 收官（111/120）

**实长表（浏览器 Audio 实测 2026-09-12；等待窗=实长+300 余量；全表 17 条零缺漏 bad=[]）**：
- **th_**：tut_watch 2904/tut_turn 1824/hint 1944/**right 1824（判对后窗 ≥2124）**/wrong 2040；确认链=right 单 clip **2124**；**th 错链=wrong 2040+150+hint 1944+300=4434**；情景句 keyless TTS=题面 say（窗=estMs 句长+300，句表 §1 封闭；最长 9 字「小猴帮你修好了小车」estMs 3705）
- **pl_**：tut_watch 3072/tut_turn 1824/ask 1872/hint 2568/**right 1944（判对后窗 ≥2244）**/wrong 2064；确认链=right 单 clip **2244**；**pl 错链=wrong 2064+150+hint 2568+300=5082**；程序卡句=题面 keyless TTS「第X行第Y列」6 字恒定（estMs 2670+300——初稿 7 字/3015 系字数笔误，agent 勘误回写；实现 CARD_WIN=3315 ≥estMs 保留；ask 1872+300 后卡亮+读卡→开放）
- **tch_**：tut_watch 2832/tut_turn 1752/task 2160/hint 2352/**right 3120（判对后窗 ≥3420）**/wrong 2064；确认链=right 单 clip **3420**；**tch 错链=wrong 2064+150+hint 2352+300=4866**；任务句「教兔子数 N 个苹果」9 字骨架 estMs 3705+300（task 2160+300 后任务句开题）；兔子句「兔子说：我来试试」8 字 estMs 3360（rabbit 演出窗内）
- 教学预算验算：th watch（单步演示款 ≤16s）≈3210（≥2904+300 防尾截）+开题 4405+ghost 1120+right 2124=10859 ✓（实现实测折算 10475ms）；pl watch（单步款 ≤16s）≈3372+ask 2172+卡句 3315+ghost 1120+planted 演出 1200=11179 ✓；**tch watch（三步完整演示款 ≤22s）≈3132+task 2460+任务句 4005+示范 1500+兔子句 3660+兔子摆 1500+卡亮 800+right 3420=20477 ✓（紧凑——agent 演出设计须分账控制）**
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

**语音清单硬指标**：manifest 17 条合成 ok=17 fail=0；gate G3 注入数 5+6+6+core 3。

**NUMCN 映射表（契约 L）**：plant 行列 1-4 共 4 值（一二三四）；teach 任务数 2-7 共 6 值（二三四五六七）；thanks 无数字 TTS（L 天然满足）。

## §5 反方审查+试玩修复记录（收官回填 2026-09-12）

**反方审查**（REPORT-REVIEW-b37.md）：0 fatal / 1 major / 7 minor。
- **R1 major 已修**：teach sayW `cur.flat >= 0 && cur.flat < 3` 将教学迷你关 flat=-1 排除出「每错必播」——违反契约 J（b36 m3 教训写法=`cur.flat < 3`）；修复=去掉 `cur.flat >= 0 &&`，与 thanks/plant 同款（产物 926 行已验）
- **R3 已修**：plant 首错演出锁 4782ms 几乎全覆盖豁免窗 5082（「窗内对选放行」仅剩 ~160ms 生效；thanks 锁 1100/teach 锁 900 均留活跃窗）——首错锁收窄 4782→**2214**（=wrong 2064+150，听完 wrong+标尺高亮起效，hint 段可被对选打断；豁免窗活跃段恢复 ~2728ms）；main 两处+build 断言字面同步
- R2 已修：plant 7 字注释残留 ×3 清为 6 字；R4 已修：thanks build 补 M1① 负向断言 ×3 行（script[2] 锚+core 锚+runVerify not in）；R5 已修：teach build 分账注释 21587→20787（TUT_SUM 实际值）；R7 已修：本 §4 教学末步分款回写（plant='planted'）
- **R6 备案不修**：plant/teach estMs 死定义（仅注释引用——thanks 真实动态使用）；build 家族 T 断言由此被「为过断言而保留的定义」满足，兜底在场（plant verify ⑩/teach verify ⑨ 用 verify 本地 estMs 真实数值对账）
- 残余风险登记：verify ⑫ realPath 对契约 E 无判别力（freshTut 含 `!VERIFY` verify 页恒 false——b31+ 家族共性）；plant 4×4 窄竖屏 <~420px 可能溢出（家族目标=平板/桌面）

**分龄试玩**（REPORT-PLAYER-b37.md；试玩跑于 R1/R3 修复前产物——两修复只触教学迷你关播报与首错锁时长，不触玩点）：三款六步全过+pageerror 0×3+阻断项 0（thanks 33.3s/plant 42.3s/teach 80.0s 通关；急性子二关全过）。建议项 4 条入 backlog：teach 单题 15-16s 节奏偏长（rabbit 演出不可跳）/开题窗吞点可加即时安抚/thanks 卡面无拼音（TTS+图标缓解）/won 尾窗 3s 自动切关=驱动器注意项。**驱动器侧竞态登记**：won 弹层尾窗 ~3s 内 start() 抢切会被 proceed 覆盖——复验/试玩驱动 won 后须等 ≥4.5s 再切关。

**修复闭环**：node --check 3/3 → 三款 rebuild（thanks 319738/plant 313945/teach 332820 chars，estMs 断言全过）→ 复验全量重跑 **12/12+13/13+12/12 全绿**（R1/R3 字面进产物+行为路径复验）→ R1-R8 全量 8/8。**R8 首跑 plant 缺 '3-0' 写档**=plant 特有「关末花园全景 2400+celebrate」演出在 persistWin 前（合计 ~5.8s>R8 固定等 4500ms——SPEC §2 全景设计内时序非缺陷）→R8 改轮询写档落盘（15s 上限）复跑 8/8。

**verify 主线侧修正五起**（复验脚本非产物）：①T4 plant 生成关 dch exp=f//5+1=5-8 越域笔误→正确=(ch-1)%4+1 循环档（obs 20/20 实证——静态承诺型在生成关=5-8 章循环复用 1-4 档，网格渐大承诺保持）；②T6b 前置缺先种树（错格驱动后 planted 空）+种后新题开题窗 null 重试；③T7 plant dbl 前等 600ms 不足开题窗→1500ms；④teach tapFix 单次直点撞 locked/showUntil 尾窗（locked 释放在 renderFixCards 尾部+140ms 尾窗，时序确定必复现）→null 重试 300ms；⑤teach 错点驱动没先完成 show 阶段则 phase 永停 'show'→wrong_js/dbl 前置 tapApple×N 驱动。**另两起工程坑**：q_teach 页内 30s 长 evaluate 在多浏览器并行下 renderer 崩溃 TargetClosed→重构 python 侧轮询（每次 evaluate ≤2s）；python `%` 格式串撞页内 JS 注释裸 `%`（「100%」）→TypeError。**探针盲区教训**：teach 探针只 dump 到 fix 形态没点过 tapFix——探针必须覆盖被测驱动路径的全行为（含一次真实点击）。

## §6 teach r5 难度改造版本块（2026-09-13 定版——§0.90 v1 原文作废留档，本块为真值源）

**改造背景（审计红款）**：数 2-7+±1 二选一固定卡——儿童自证「背下来了」，实测 80-85s/关时长全靠演出撑，决策密度 1tap/题。r5 目标=单关净时长 ≥50s（7-8 段）且思考占比可证（决策密度从 1tap/题升到可数多决策）。玩法框架保留（三步小课/确定性 seeded/星级 miss 口径/家族契约 A-O 全承）。

### r5 玩法真值（判定层升级）

- **目标数升档+按群计数（delta①）**：N 域 2-7→**4-20**（NUMCN 契约 L 全量 19 值 二…二十）；**n≥10 策略条在场** `[一个一个数|两个两个数|五个五个数]`（GROUP_MIN=10，默认逐个）——组模式托盘=**组块按钮**（ceil(n/g) 块，块内 g 颗小苹果），tap 一次=一组飞入+碗点阵 .grp 组聚拢（**分组点亮**）+组末 keyless say「四个/九个/…」（NUMCN[累计]+'个'——**组末计数**，照 shapecount r3 先例）；**切换策略=本题碗清零重数**（bowl=0 托盘复位，不罚——大数用群数才高效、逐个数可行但慢**不惩罚只慢**：miss 恒只在 fix 步）；逐个档大数托盘=n+2 颗 48px（.sm）wrap 多行（视觉即暗示按群高效）。autoSolve 优等生路径=大数自动 setGroup(5)。关首题（cur.step===0 且 n≥10）开题追加按群引导句 keyless「大数字，可以几个几个数哦」窗 5040。
- **错误类型三型（delta②）**：兔子数错方式从单一 ±1 扩为三类——**兔子步逐颗摆苹果并标报数数字**（每颗右上 .num 徽章，序列=判定真值，孩子**读过程**非只看数量）：**漏数 skip**（跳过某数，seq=[1..n]去 errAt，m=n-1）/**重复 dup**（某数数两遍，errAt 后再插 errAt，m=n+1）/**换序 swap**（相邻两数颠倒，errAt 与 errAt+1 交换，**m=n 数量不变——只看数量必漏判=两读法分叉点**）。
- **纠错卡生成化 4 选（delta③）**：固定两卡→**每题生成 4 候选**（seeded 洗牌）：正确卡（真型真参）+**同型近义干扰**（同 etype 错参 errAt2——「漏数了4」vs「漏数了5」）+异型干扰（skip↔dup、swap→dup，参数 errAt2）+无错干扰「它数对啦」（换序题最迷惑——数量对≠数对）。label 封闭表：`漏数了X`/`X数了两遍`/`X和X+1数反了`/`它数对啦`（X=阿拉伯数字与碗序号徽章一致；label 不入 TTS）。**唯一解锚数学验算 ✓**：三干扰描述在 seq 上必为假（「漏数了X′」假⟺X′∈seq；「X′数了两遍」假⟺出现<2；「X′和X′+1数反了」假⟺顺序正常；「它数对啦」假⟺有错）——verify 用卡语义真假独立验证器对账（label→parse→truth 应与 good 全等）。**视觉匹配失效证明**：好卡与同型干扰 parse 后 kind 同 x 异——须读序列定位。
- **教到会两轮跟踪（delta④）**：**出题侧**——题 i>0 取复现位 rep=rnd()<REP_P(0.45)：命中→etype=前题 etype（q.repeat=true，兔子「又犯了同样的错」，fix 相位句=「又犯了老毛病，帮它找出来」）；**判定侧**——engTapFix 错选→L.mhits[etype]=0（断连续）、首选对（q._miss===0）→mhits[etype]++；**两轮口径=连续 2 次同型首选答对**→mastered（persistWin 写档 sv.teach.hits 快照+sv.teach.mastered 派生 ≥2）。
- **章型（delta⑤）**：ch1 漏数小课堂（etype=skip only，N[4,9]）→ch2 重复和换序（etype∈{dup,swap}，N[4,9]）→ch3 大数按群数（全三型，N[10,20]，策略条）→ch4 复习大挑战（全三型，N[6,20]，n≥10 带策略条）→生成关 flat≥20 dch=ri(rnd,1,4) 混排（seed=flat*7919+747 沿 v1）。每关 5 题恒；星级 miss 口径沿 v1。
- **修正确认演出三分支**：选对卡后 skip=补漏的数（重渲 1..n 新颗 .fixed 高亮）/dup=拿走第二颗重复（.away 飞离，剩余天然有序）/swap=两颗归位（重渲 1..n 换位颗 .fixed）+兔子 happy+hop+right。

### r5 RNG 取数序定版（verify 同式副本对账）

seed=mulberry32(flat*7919+747)；生成关 flat≥20 先取 dch=ri(rnd,1,4)；题序连取每题：①N=ri(rnd,NDOM[dch]) →②题 i>0 取 rep=rnd()<0.45（命中→etype=前题，**不消耗**池随机数；i=0 恒走池）→③etype=EPOOL[dch][floor(rnd()*池长)] →④errAt=ri(rnd, 型域)（skip/dup∈[2,n-1] 首尾不取、swap∈[1,n-1]）→⑤errAt2=域内**排除 errAt** 取（域 ≥2 恒非空——n≥4 验算 ✓）→⑥4 卡 Fisher-Yates 洗牌（3 次 rnd）。封闭表：`NDOM={1:[4,9],2:[4,9],3:[10,20],4:[6,20]}`；`EPOOL={1:[skip],2:[dup,swap],3:[skip,dup,swap],4:[skip,dup,swap]}`。

### r5 钩子契约（TCH）

`{ get currentLevel, get quiz{ phase('show'|'rabbit'|'fix'), n(4-20；教学迷你关 4/5), etype('skip'|'dup'|'swap'), errAt, seq[](报数序列真值), m(=seq.length), repeat(复现前题同型), group(1|2|5), bowl, cards[4]({good,label}), answer(=cards 唯一 good 下标——verify 独立推导), step(全关题号 0-4), miss }, tapApple(i), tapFix(i), setGroup(g), start(flat), autoSolve(), get mastered({skip,dup,swap} 关内连续计数) }`。tapApple 返回：单颗 'in'/组块 'group'/点满 'confirmed'/碗满 false/演出期·越界 null；setGroup 返回：切换 'reset'/小数·同策略·无效值·演出期 null/非 show 相位 false；tapFix 沿 v1（4 卡 i∈0-3）。

### r5 时序分账（真实页名义值；verify SPEED=0.12 提速）

- **开题**：task clip 2460 → 任务句 keyless **动态窗** max(4005, estMs(字数)+300)（9 字 N4-10=4005/10 字 N11-20=4350）→ [关首题 n≥10 引导句 5040=estMs(12 字 4740)+300] → 开放。
- **兔子步重叠（r5 演出压缩）**：兔子句窗 3660 **与摆苹果并行**（摆 m×250），演出窗=max(3660, m×250)+卡入场 800——大数 m=21 颗不再串行叠加（v1 为 3660+m×250+800 串行）。
- **教学 watch 分账（N=4/skip 缺3，摆 m=3）**：watch 延 3132+开题 6465+ghost 示范 4 颗 2080+兔子步 max(3660,750)+800=4460+ghost 指卡 1120+right 窗 3420=**20677 ≤22000 ✓**（真实页实测 20907ms）。
- **单关净时长（≥50s 达标）**：ch1-2 每题≈开题 6465+show 4-9 taps+rabbit 4460+fix 读判定+确认 3420 ≈ 18-22s×5 题=90-110s；ch3 大数题更长（任务句 4350+引导句首题 5040+组 taps+读 16-21 颗序列判定）≈25-32s×5=125-160s；演出占比从 v1 ~85% 降至 ~55%（决策动作=策略选择+组 taps+序列诊断+4 选，每关 30-60 可数决策 vs v1 10）。
- 窗常量不变项：WRONG_CHAIN_WIN 4866/CONFIRM_WIN 3420/TASK_CLIP_WIN 2460/RABBIT_SAY_WIN 3660/APPLE_POP_MS 250/CARD_IN_MS 800/WROLL_MS 900/TUT_WATCH_WAIT 3132/TUT_TURN_WAIT 2052。

### r5 语音（零新 clip）

组末计数「NUMCN[累计]+'个'」/按群引导句/策略 label 朗读全走 **keyless say**（非队列链——契约 N；shapecount r3 先例）；既有 tch_ 6 条文本禁改全复用；manifest keys 前后不变（1593）；SPEC_DUR 实长表沿 §4（verify ±60ms 断言照跑）。教学迷你关 r5 锚：**watch=N=4/skip/errAt=3（seq 1,2,4）**、**turn=N=5/dup/errAt=3（seq 1,2,3,3,4,5）**（errAt2 均=2，教学关卡序固定不洗牌——卡 0 恒正确）。

### r5 verify（13 单元）

①structure（4 卡 bbox 两两不相交+大数 tray wrap overflowX≤0+NUMCN 19 值）②tutorial（N4skip3/N5dup3）③drive（RNG 副本全链对账 n/etype/errAt/seq/m/repeat/cards/answer）④frameM（learn 碗 .num 徽章序列===quiz.seq 读过程锚+修正三分支按 etype 断言——flat 按 SPEC 副本挑选覆盖三型）⑤wrongPath（4 卡错选+豁免窗三语义）⑥prior（**卡语义真假独立验证器**+同型干扰参数≠errAt+三型全现+复现位双向）⑦stars ⑧gen ⑨windows+contract（r5 动态窗式/重叠式/uiSetGroup/mhits/hits 写档字面锚）⑩chains ⑪save（hits.skip=5+mastered.skip=true 写档）⑫realPath ⑬lifecycle（**swap 两读法分叉**——m===n 数量读法失效+序列降序对+无错卡干扰；**同型干扰分叉**——kind 同 x 异；**复现语义**+fixRep 文案；**mhits 生命周期**——错→对清 0→对 1→对 2；**按群交互**——setGroup 簿记/组 tap 'group'/组末 say/切组重置/小数 null/组模式通关）。

## §7 thanks r12 难度改造版本块（2026-09-15 定版——§1 v1 原文作废留档，本块为真值源）

**改造背景（审计红款 AUDIT-56 #37）**：与 comfort 同构双胞胎、概念 3-4 岁（好坏二分）、实测 33.3s/关时长全靠演出撑、净认知 1-2s/题。r12 三 delta（AUDIT-56:85 定死）+时长模型 modeled 单关 ≥40s。玩法框架保留（帮助情景选回应卡/受助视角/确定性 seeded/星级 miss 口径/家族契约 A-O 全承；build 4 script 块布局承 b36 M1）。

### r12 玩法真值（delta 三条）

- **delta① 场合适配（ch1-2 fit 择优两选）**：卡模型 {good}→**{tier:'best'|'gray'|'bad'|'ok'}**+题型 kind='fit'|'size'|'anti'；answer 按 kind 分流（fit/size=唯一 best / anti=唯一 bad）。ch1 对老师（鞠躬说谢谢 best×5）/ch2 家人同伴（抱抱奶奶/击掌/大声按对象 best）——**反启发式 tier 翻转**：同 label 跨情景换档（鞠躬 best@0-4/gray@5,7,8,9；击掌 gray@1,4/best@7,9；大声 gray@0,3/best@8,12；小声 best@11,13/gray@10,12,14；抱抱它 best@10,14/gray@13）——「永远鞠躬」策略必失分。gray 卡=择优次档非错误：wrong 计 miss 但反馈温和（meh 半好态+tha_gray「有点用，还有更合适的哦」）。
- **delta② 强度匹配（ch3 size 三选 best+gray+bad）**：大帮忙（找回玩具球/陪等妈妈）=热烈档（抱抱它/大声说谢谢 best）；小帮忙（递一张纸/借支蜡笔）=轻声档（小声说谢谢/送朵小花）；bad=社交失误（转身就走/一声不吭/嫌它小气——SEL 指向行为后果禁人身评价）。
- **delta③ 不合时宜辨析反向题（ch4 anti 三选 ok+ok+bad）**：题面框架锚 tha_not「哪一句，现在不该说」——点**不该说的**那句=对（bad=answer）；比赛输了谢对手=合时宜 ok、被人抢了玩具还说谢谢=**不合时宜 bad**（审计双例逐条落题 15/16）；ok 卡点=wrong 计 miss+meh+tha_ok 消除式反馈（「这句可以说，再找不该说的」——不指认其余卡）。负向判定不泄答案：aria 统一「做法 」前缀（tier 不进 DOM 可读层）+框架锚文本与全部卡 label（≥2 字）无子串交集（verify 断言）。
- **章型**：ch1 fit 对师长（2 卡）/ch2 fit 家人同伴（2 卡）/ch3 size（3 卡）/ch4 anti（3 卡）——章档 kind-pure；生成关 flat≥20 dch=mulberry32(flat*7919+727) 首随机数 ri(1,4)，**池改 per-chapter**（dch k→题 (k-1)*5..k*5-1 seeded 无放回抽 5，卡数 2/2/3/3 沿 v1 章档口径兼容）。
- **框架锚串播（presentQuiz 末位）**：题面情景句 keyless say 后按 kind 串播——fit/size=tha_fit「想一想，哪个最合适」/anti=tha_not；兔子按钮/空白提示同锚分流（dirVoice）——方向级提示不泄答案级内容，th_hint 留守坏卡错链尾段。

### r12 题库 20 题现行全表（say 两两相异；卡多重集 tier/label）

| 行 | kind | say | 卡（tier:label） |
|---|---|---|---|
| 0-4 | fit | 小鹿老师帮你捡蜡笔/帮你修小车/递给你一本书/帮你搬积木/下雨给你撑伞 | best:鞠躬说谢谢 + gray:大声/击掌/说声谢谢（轮换） |
| 5-9 | fit | 熊奶奶帮你找帽子/给你留了蛋糕；小猴陪你搭好了积木/帮你修好了小车；小狗帮你推秋千 | best:抱抱奶奶×2/击掌×2/大声 + gray:鞠躬/说声谢谢 |
| 10-14 | size | 小兔帮你找回了玩具球/小羊递给你一张纸/小狗陪你等到了妈妈/小鸡借你一支蜡笔/小猪分给你半块蛋糕 | best+gray+bad 三选（见 verify SPEC_SCENES 硬编码表） |
| 15-19 | anti | 赛跑你输给了小狗/小松鼠抢走了你的玩具/小马排队插到你前面/小猪弄脏了你的画/下棋小猫赢了你 | ok+ok+bad（bad=说我不玩了/对他说谢谢/说谢谢你呀/叫她小笨蛋/说她耍赖了） |

（verify ⑨ pool 双录对账：say+kind+tier\tlabel 多重集，禁读页面真值当期望源；20 静态关 rotate 每题恰现 5 次）

### r12 钩子契约（TH）

`{ get currentLevel, get quiz{ scene(0-19), kind('fit'|'size'|'anti'), say, cards[{tier,label}](2-3), answer(fit/size=唯一 best/anti=唯一 bad——verify deriveAnswerV 独立推导), step(全关题号 0-4), miss }, tapCard(i), start(flat), autoSolve(), get tutorial }`。tapCard 返回：答案卡非末题 'right'/末题 'done'/非答案卡（best/gray/bad/ok 任一非答案档）'wrong'/豁免窗内非答案卡吞 false/演出期 null（真时钟锁）/越界 null。

### r12 时序与时长模型（真实页名义值；verify SPEED=0.12 提速）

- **六窗全精确式**（=实长+300）：确认 CELE_WIN 2124（th_right 1824）/坏链 WRONG_CHAIN_WIN 4434（th_wrong 2040+150+th_hint 1944+300）/择优锚 PICK_WIN 3108（tha_fit 2808）/反向锚 NOT_WIN 3060（tha_not 2760）/灰链 GRAY_WIN 3180（tha_gray 2880）/反向错反馈 ANTI_OK_WIN 3492（tha_ok 3192）。
- **双豁免窗分离**：wrongChainUntil（bad 卡）+grayChainUntil（gray/ok 卡——按 tier 分流 ANTI_OK_WIN/GRAY_WIN）恒斥于 kind；guard 双窗吞非答案卡、答案卡放行；rescueTick 双窗让路；startLevel 双窗重置。
- **时长模型**：quizDurMs=max(ENTER 400+estMs(say)+300+锚窗, DECIDE_MS[kind])+ADV 2124；DECIDE_MS={fit:10000,size:10000,anti:11500}；LEVEL_MIN_MS=40000；**语音窗从不撑时长**（最长句 10 字 voiceWin 7858≤10000/7810≤11500——全 20 题验算）；40 关 modeled 最低 5×12124=60620≥40000（verify ⑯ 独立副本 V_* 重列对账）。
- **教学 watch 分账**：3210+(400+estMs(9 字)3705+300)+3108+800+320+2124=**13967 ≤16000**（单步演示款；scene1 九字句+tha_fit 锚控预算）。
- 反馈演出：bad 卡=摇头+sadder 失落+错链两段；gray/ok 卡=cd-gray 轻降饱和+meh 平眉小平笑（SEL 温和不否定已选）；答案卡=happy 弯眼咧嘴跳两下+撒星星。

### r12 语音（新增 tha_ 4 键；manifest games=['thanks'] 12=core 3+th_ 5+tha_ 4）

tha_fit 择优方向锚 2808/tha_not 反向框架锚 2760/tha_gray 灰反馈 2880/tha_ok 反向错反馈 3192（2026-09-15 浏览器 Audio 实测，verify ±60ms 断言）；既有 th_ 5 条文本一字不改。表情三态 sad（期待小星）/meh（平眉睁眼小平笑）/happy（弯眼咧嘴腮红）——friendSvg 三组 fx-sad/fx-meh/fx-happy。

### r12 verify（16 单元）

①structure（SVG 三表情组+clips 12+duration 辨别器±60ms+answer kind 分流独立推导+三 flat×双 viewport——1280×800 横/800×1180 竖 body.port 类通道，#friend 168/140 判别锚+rect 落容器+contrast≥3:1）②tutorial（tha_fit 锚教学期在场+kind='fit'）③drive（20 关全量+structWhy kind 域+SPEC 反查行号落章池+kind-pure+引擎直驱）④frameM（dataset.kind 新锚+__lastVoiceKey tha_fit/tha_not 按型+sad 态+tap 答案 happy+.good ×flat0/10/15/20）⑤grayPath（meh 中段采样+tha_gray 链+GRAY_WIN 吞/照计梯度+breathe）⑥badPath（4434 窗吞/放行/窗后照计）⑦antiPath（tha_not 锚+ok 卡 meh+tha_ok+bad=answer right）⑧delta（**FLIP 翻转表硬编码 25 锚点**+anti 恰 1 bad+2 ok+审计双例+aria 统一+锚文本无子串交集不指认）⑨pool（20 题多重集双录+覆盖 5 次）⑩stars ⑪gen（per-chapter kind-pure 池+确定性+无放回+四档全现）⑫windows+contract（六窗精确式+A-F/I/J/K+灰链族字面+CHAPTERS/GEN_HINTS 双录+nextHint 4/9/14/19+24/29/34/39 实算）⑬confirmChain（['th_right'] 单 clip）⑭save ⑮realPath（kind='fit'）⑯duration（独立副本复算+语音窗不撑+40 关对账数值和非 stringify）。P1b 真竖视口轮（@media 真通道 friendW=140 外部断言——横 sim 168 判别锚 realPort 豁免，comfort r11 先例）。

### r12 批门禁增改

build.py（clips 12+前缀 th/tha 对账+四窗精确式+时长模型素材+TUT_SUM 13967）；_selftest（clips 12/th_ 5+tha_ 4+P1b 竖视口轮）；verify_batch37 thanks（TH_BANK 三元组 say,kind,[(label,tier)]+q_thanks kind 分流推导；T4-T8 口径不变）；verify_final37（R4 KEYS thanks 9 键 tha_ 4；R8 卡数 [3×5] 不变）；verify_voice（EXPECT thanks 12 键+DIRS）；gate_common37（G3 注释 12）。
