# SPEC-BATCH34 · 扩容批 4（藏猫猫摄像头 / 句子拼拼乐 / 数据收集员）契约 v1（2026-09-11）

对象：120 款扩容第 4 批（每段各 1 款）。目录 `batch34/hidecup|sentorder|datacollect/`。
结构照 batch1-33：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch33/soundcount/_src/（视锚+播音锁+演示迷你关——hidecup 参照）、batch33/position/_src/（点格+格子动画+breathe——hidecup/datacollect 参照）、batch6/words/_src/ 或 batch29/wordpuz/_src/（点选填槽+词音——sentorder 参照）、batch31/chartread/_src/（图表 DOM+类目行——datacollect 参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-81 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b33 定版，一项违反=审查 Major 起步）：A-O+I 补全承 SPEC-BATCH33.md §0 括注原文（A 启动 dayEnd nextHint(lim-1)/winFlow null；B 救援钟双锚；C 预置存档 v:'1.0'；D 吞输入轻叮配 bump；E 修复收窄先查教学特例；F 章末 hint=预告下一章+生成关 nextHint 实算 genLevel(f+1).dch-1；G 拼播链后窗=链总实长+300；H 判对窗=clip+300；TTS 窗=estMs(len*345+600)+300+build 静态断言；I+I 补 错链豁免窗 wrongChainUntil 真时钟+guard 条件式（错点吞/对选放行/窗后二错照计 miss）+startLevel 重置；J 错反馈语义句 flat≥3 只 10s 节流；K rescueTick 面板在场守卫；L TTS 数字/量词映射表覆盖封闭集全量值；M 变换演出族 verify 必带帧内容断言；N keyless TTS 段恒链尾；O 款内自建 button 显式 color）。b33 坑新增三条硬性：**①钩子表必须显式声明 quiz.step 语义（题号或款内进度——禁跨款语义分裂）；②生成关 dch 策略必须显式声明（恒 N 或 seeded 随机二选一写死——禁「域括注」隐式）；③build.py core 注入必须幂等跳过（`if '"%s"'%k in clips: continue`）**〕

82. **hidecup 藏猫猫摄像头真值**（5-6 段，记忆/反应；调研 #91 原标 6-7，**本批降坡 5-6 实态**（EXPANSION 风险节明示）——降坡三件：杯数封顶 3/换位数封顶 3/换位动画慢速 1100ms+静止窗）：**玩法=经典杯子戏**：小动物（当关主角）探头亮相 1.5s→躲进某杯→杯子换位（两杯位置互换动画，每次 1100ms，换位期杯子恒盖住不露动物）→换完全场静止 800ms→点杯开杯：**动物在=right+动物蹦出+名音；空杯=wrong+「再想一想」（杯子空开+盖回）**。**数学先验（封闭域全章验算）**：杯数 c：ch1=2/ch2=2/ch3=3/ch4=3；换位数 s：ch1=1/ch2=2/ch3=2/ch4=3；**swaps=每次互换的两杯下标对 (a,b) a≠b，相邻两次换位至少一杯不同（禁连续同一对回滚式假换）**〔§5 裁决补明（2026-09-12 复验实锚）：c=2 域「至少一杯不同」数学不可满足（a≠b 唯一组合={0,1}）——c=2 落地为**数值交替 (0,1)/(1,0) 有序对互异**（连续互换=可感知真换非假换）；c≥3 保留原意=同集合相邻（反向真回滚）与同序重复均拒〕；answer=动物初始杯下标经 swaps 序列逐次互换推导（verify 从 start+swaps 独立复算=对账锚）；动物池 5（rabbit 兔子/cat 小猫/bear 小熊/dog 小狗/duck 小鸭——每关一主一只躲、其余不出场）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+311)，域全档成立型）**〔§5 补明：T4 断言=python 独立复算全序列对账（非 maxrun 形状启发式）——该 seed 序列 flat25-31 有 7 连 dch3，为 mulberry32 数学真值非实现偏置，实测复算 MATCH〕；ch 每关 5 题；星级=miss 口径；错反馈：首错「再想一想，看杯子怎么动」（方向级=三杯整体 wiggle 不指杯）；miss≥2=正确杯 breathe（答案级）；判对确认=right+「+动物名音+在杯子后面躲猫猫」？**定版：right 单 clip+动物名音拼播（名音恒有 key）**；重看按钮（题面后可点 replay=重演换位全程 3s 节流——**重演=同 swaps 重放（记忆任务重演不泄答案：换位过程与初看一致）**）；教学：watch=幽灵手指看演示（2 杯 1 换慢速）→点中；turn=你来试一试（2 杯 1 换）帮/独

83. **sentorder 句子拼拼乐真值**（6-7 段，语言/逻辑·语序敏感；调研 #100）：**玩法=词卡按序点选拼句**：题=一句拆成词卡打乱+干扰词卡，儿童按正确语序逐词点选→点中「下一正确词」=fill+入槽+词卡 TTS 读词；**点其他词（含语序跳前的本句词/干扰词）=wrong+miss（反馈语义化：语序跳前=「这个词要晚一点说」/干扰词=「这个词不是这句话的」——两级反馈文案区分）**；全句拼满=right+整句 TTS 朗读（确认链）；**句库封闭 20 句（每章 5 句，句长 L：ch1=3 词/ch2=4 词/ch3=5 词/ch4=3-5 混合）——句库句语序唯一合法（中文语序灵活句禁入：状语固定后置/动宾不可拆序/主语恒首，SPEC 明示约束句库生成）**；**干扰 d：ch1=0/ch2=1/ch3=2/ch4=1-2（候选池=L+d 恒全摆）**；干扰词=高频名词动词（与本句词不同且不成新合法句——「小猫吃鱼」句干扰「萝卜」不成句，「小猫」句禁干扰「鱼」（可成「鱼小猫吃」？不成句但语序错反馈混淆——**定版：干扰词与本句任何词组合不成合法 SVO 句（句库侧人工核定 20 句全干扰表）**）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+601)）**；ch 每关 5 题（每关=本章句库 5 句全用）；星级=miss 口径；错反馈：首错方向级（见两级文案）；miss≥2=下一正确词卡 breathe（答案级）；教学：watch=幽灵手指看拼「小兔子吃萝卜」（3 词）→逐词点入；turn=你来拼一拼（「小猫睡觉」2 词超短句？**否——ch1 句长 3 起，turn 用本章句库首句**）帮/独

84. **datacollect 数据收集员真值**（7-8 段，信息素养/数感·制表；调研 #122；chartread（b31）=读图，本款=**制表（写图表）反向操作**）：**玩法=数场景→点亮图表格**：场景=草地 SVG（动物散布：兔/鸟/猫/鸡/羊/鸭 6 类池，每类 2-8 只，同类异姿态/大小防重复计数单调）；题面=「兔子有几只呀」→儿童数场景该类动物→在图表该行**逐格点亮**（每点亮 1 格=计数音「叮」+该格动物小图 pop——点亮过程即计数）；**点满 answer 格自动判定：right+类目名音+数字名音拼播（「兔子，五只」）；多点亮 1 格=wrong+「多啦，再数一数」（点亮第 answer+1 格瞬间判错，错格闪红熄灭，已点 answer 格保留——判错不清零）**；**可撤回**：点亮格再点=熄灭（探索不罚——撤回不计 miss）；**题型两族**——**count**（单类计数点亮：ch1=2 类场景单问/ch2=3 类场景单问/ch3+ 3 类混合）/ **most**（ch3+：哪类最多→**点最多类目的行标签判定**（不点亮，标签点选；先验：最大类严格大于次大 ≥1 只差——禁并列）；most 题=读表+比较双重认知）；**数学先验**：类数 k：ch1=2/ch2=3/ch3=3/ch4=3-4；数量 n∈2-8 互异（**同场景各类数量互异——count 题防「数别的类也点亮同数」歧义，most 题天然满足严格大于**）；场景总数≤18（7-8 计数上限内）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+809)）**；ch 每关 5 题（count 4+most 1 in ch3+；ch1-2 全 count）；星级=miss 口径；错反馈：首错「再数一数呀」（方向级=场景该类动物逐只 pulse 一轮——**答案级动画？pulse 全类=重数辅助非泄数——方向级定版**）；miss≥2=图表 answer 格虚线框 breathe（答案级）；教学：watch=幽灵手指看数兔 3 只点亮 3 格→right；turn=你来数一数（鸡）帮/独

## §1 hidecup 藏猫猫摄像头（5-6 段·视觉记忆）

**玩法**：动物亮相→躲杯→换位→点杯开杯。
- 教学：watch=幽灵手指看演示（2 杯 1 换）→点中开杯；turn=你来试一试（2 杯 1 换）帮/独；`__hcDemoR`
- 钩子：`HC = { get currentLevel, get quiz(){ kind('hide' 恒), cups(杯数 2|3), swaps[](换位对 [a,b][] 真值序列), start(动物初始杯下标), answer(经 swaps 推导的动物杯下标), anim(动物 id), step(**全关题号**——b33 坑①明示), miss }, tapCup(i), start(flat), autoSolve(), replay() }`——tapCup 返回：对 'right'/末题 'done'/错 'wrong'/换位演出期 null/越界 null；replay=重演换位（3s 节流，题面后可用）
- 语音：hc_tut_watch'看！小动物藏起来啦'/hc_tut_turn'你来试一试'/hc_hint'再想一想，看杯子怎么动'/hc_right'找到啦，真棒'/hc_wrong'再想一想'（**前缀=hc_ 已核 manifest 无占用 ✓ 2026-09-11 实查**）；名音 hc_n_<id>×5=晓晓读动物名（兔子/小猫/小熊/小狗/小鸭）；确认链=right+名音（全 clip 无 keyless）；换位演出不配语音（纯视觉记忆任务）；亮相句=hc_show'<动物名>要躲猫猫啦'？**定版：亮相段=TTS 拼句 hc_show'要躲猫猫啦'（keyless 恒尾，名音 hc_n_<id> 前置——链=[名音(clip), '要躲猫猫啦'(TTS)] 契约 N 合法）**

## §2 sentorder 句子拼拼乐（6-7 段·语序敏感）

**玩法**：打乱词卡+干扰卡，按正确语序逐词点选。
- 教学：watch=幽灵手指看拼「小兔子吃萝卜」→逐词点入+读词；turn=你来拼一拼（本章句库首句）帮/独；`__soDemoR`
- 钩子：`SO = { get currentLevel, get quiz(){ words[](本句正确语序词), opts[](候选卡池 {w} 恒全摆 L+d), picked[](已入槽词), step(**全关题号**), miss }, tapWord(i)(点候选卡 i), start(flat), autoSolve() }`——tapWord 返回：对 'fill'/末词 'right'？**定版：非末词对='fill'、末词对='done'（整题完成=done 推进）；错='wrong'（两级：返回 'wrong' 恒同值，两级文案由实现按错因选择——语序跳前 vs 干扰词——钩子不区分）；演出窗吞 false/越界 null**
- 语音：so_tut_watch'看！拼出一句话'/so_tut_turn'你来拼一拼'/so_hint'想一想，先说哪一个'/so_right'拼对啦，真厉害'/so_wrong_order'这个词要晚一点说'/so_wrong_word'这个词不是这句话的'（**前缀=so_ 已核无占用 ✓**）；**词音=TTS 按词读（6-7 识字期，词频高，不建 clip——estMs 窗口径）**；确认链=right+整句 TTS（句库 20 句全封闭入 build 静态表，estMs 按句长——**契约 L：TTS 按词/整句无映射表需求（全 TTS 无 clip），但句库 20 句须在 game-data 封闭表可静态审计**）

## §3 datacollect 数据收集员（7-8 段·制表）

**玩法**：数场景动物→图表行逐格点亮；most 题点行标签。
- 教学：watch=幽灵手指看数兔 3 只→点亮 3 格→right；turn=你来数一数（鸡 2 只）帮/独；`__dcDemoR`
- 钩子：`DC = { get currentLevel, get quiz(){ kind('count'|'most'), scene{类目 id:数量}（场景真值全类）, ask(count=类目 id/most=null), answer(count=数量/most=最多类目 id), grid[](该行已点亮格下标), step(**全关题号**), miss }, tapCell(i)(点图表格——count 题行内格 i), tapLabel(i)(most 题点行标签), start(flat), autoSolve() }`——tapCell 返回：第 ≤answer 格 'lit'/第 answer+1 格 'wrong'（多点亮，错格熄灭）/撤回（点亮格再点）'off'（不计 miss）/演出期 null；**tapLabel 返回：对 'right'/错 'wrong'（most 题单发判定）**
- 语音：dc_tut_watch'看！数一数做表格'/dc_tut_turn'你来数一数'/dc_hint'再数一数呀'/dc_right'做对啦，真聪明'/dc_wrong'再数一数'（**前缀=dc_ 已核无占用 ✓**）；名音 dc_n_<id>×6=晓晓读类目（兔子/小鸟/小猫/小鸡/小羊/小鸭）；数字名音 dc_n2..n8？**定版：数量确认=TTS 读数字（数字 2-8 封闭——契约 L：TTS 数字映射表须覆盖 2-8 全量，estMs 窗）**；点亮计数音=Web Audio 合成「叮」（无 clip）；确认链=right+名音+TTS「N 只」（名音 clip 前置+TTS 尾=契约 N 合法）；most 题面=dc_q_most'哪一类最多呀'+类目名音（count 题面=dc_q_count'有几只呀'+名音）

### §3-r14 datacollect 难度改造定稿（2026-09-15，AUDIT-78 红款行·7-8 岁红款清零批；本节为 r14 真值源，与 §3 冲突处以本节为准）

**改造八件**：数量域 2-8 → 偶 10-30（两个两个数）；一格=2 只换算；合计/差值数值作答；两次调查对比；most 下线改 mostdiff 差值作答；反启发式锚；时长门禁；竖屏适配复验。

**题型六族**（数值题恒居制表完成后=读表计算）：**count**（点「这次」条带 answer/2 格，点满 settle 900ms 待决窗自动判对；窗内超点 1 格瞬间判错不清零；撤回 off 不罚）/ **sum**（两类合计）/ **diff**（两类相差）/ **mostdiff**（最多类与最少类相差——ask=[maxCat,minCat] 名音链序）/ **change**（dch4 某类两次调查差值）/ **totalchange**（dch4 两类差值合计）——数值题全走 4 选 1 数值卡单发判定（错卡 wig+miss 可重点不灰化）。

**章型先验**（全偶数域；flat0 教学锚豁免）：dch1=2 类偶 10-20 互异 5×count｜dch2=2 类偶 12-30 互异差≥4 3count+sum+diff｜dch3=3 类偶 10-24 互异总≤60 3count+sum+mostdiff｜dch4=两次调查 2 类 survey2 偶 10-16 互异、ΔA·ΔB 偶 2-8 同向（survey1=survey2∓Δ）2count+2change+totalchange；生成关（flat≥20）dch=ri(rnd,1,4)（mulberry32(flat*7919+809) 不变）。

**视觉锚**：场景动物成对布点（一格=2 只可数锚：对内第一只全尺寸/第二只 0.86 翻面；beast 基宽按总对数分档 ≤12→52/≤20→44/else 38）；图表每行 15 格槽（8 列 grid 两行）+图例徽章「1格=2只」恒显；dch4 每类双条带（上次=静态淡格 lit=scene1/2，这次=交互）；行标签=div（most 下线不再点选）。

**数值卡**（wordprob r13 范式）：answer+3 干扰洗牌 answerIdx；干扰池按题型=类别混淆值（读表行值）+运算混淆值（和差互混/极值/他类Δ）+换算近误 answer±2；取值约束=偶 ∈[2,60]（NUMCN 封闭域）互异≠answer；**反启发式锚=40 关正解集∩干扰集 ≥5**（干扰含类别值/他题答案，双现自然达成）。

**flat0 教学锚**：scene={rabbit:8, chick:10}（crafted 豁免值域）；q0=rabbit 8（watch 演示 4 tap）；q1=chick 10（turn 你来数，5 格）；watch 预算名义分账 15920ms ≤16000（_selftest P2 真实页实测 15891）；turn 段读题链前置 dc_scale「一格代表两只」（scale 2208+名音 1368+q_count 1752+2×150 段间 gap=5628——r14 审查 m-4 勘正：原写 5478 漏 gap，build 按 5928=5628+300 断言自洽，≥1896+300 后置防尾截）。

**时长门禁**：DECIDE_MS={count 4000, sum 16000, diff 14000, mostdiff 15000, change 13000, totalchange 17000}；LEVEL_MIN_MS=40000；count 步式=首步 max(voice,DECIDE)+TAP_ADV 600+(n-1)×(max(STAGE 400,DECIDE)+TAP_ADV)+SETTLE 900（r14 审查 m-4 勘正：步进段每格均含 TAP_ADV，与实现 `(n-1)*(max+600)` 同口径），数值题=max(voice,DECIDE)+CARD_ADV 880；**40 关 modeled 最低值 98040ms@flat18（verify ⑬ MIN_EXACT 精确锚防回漂）**；确认链动态窗 1600+confirmTailMs（tail=max(4200, chain-1600)，最坏 change 链 6468）；错链豁免窗静态 4146 不变（契约 I）。

**语音增量**（dc_ 13→20，manifest games=['datacollect']）：新 7 键=dc_q_sum 1848/dc_q_diff 1992/dc_q_change_up 2448/dc_q_change_dn 2496/dc_q_total_up 2160/dc_q_total_dn 2184/dc_scale 2208（浏览器实长）；既有 13 键一字未改；开题链六族：count=[名音,q_count]/sum·diff·mostdiff=[名音,名音,q_sum|q_diff]/change=[名音,change_up|dn]/totalchange=[total_up|dn]；确认链 count·change=[right,名音,TTS 尾]/其余=[right,TTS 尾]（keyless 恒尾）；NUMCN 扩偶 2-60 全 30 条（2=两 特例）。

**验收门禁**（2026-09-15 全绿）：build.py（23 clips/4 script 块/竖屏 15 条等值/TUT_SUM 15920）→ ?verify=1 双 viewport 14/14×2（横 1280×800+真竖 800×1180）→ _selftest.py 19/19（P1/P1b/P2 教学 wall 15891 实测）→ verify_batch34.py datacollect 12/12+姊妹 hidecup/sentorder 12/12×2 无回归 → verify_final34.py R1-R8 → verify_voice.py datacollect 23 clips PASS → manifest 20 键核对。

## §4 交付与验收（承 batch15-33 流水线）

语音预合成（gen_clips.py 扩 batch34 块：hc_ 12 条（通用 5+亮相 1+名音×5+q？**清单：tut_watch/tut_turn/hint/right/wrong/show=6+名音×5=11 条**）/so_ 7 条（通用 7：tut_watch/tut_turn/hint/right/wrong_order/wrong_word+q?——**tut_watch/tut_turn/hint/right/wrong_order/wrong_word=6 条**（词音/整句全 TTS 无 clip））/dc_ 14 条（通用 7：tut_watch/tut_turn/hint/right/wrong/q_count/q_most+名音×6=13 条）=**30 条**；前缀 hc_/so_/dc_ 已核 manifest 无占用 ✓ 2026-09-11 实查）→ 3 agent 并行（任务书必带：契约 A-O+I 补逐条+§0.82-84 数学先验逐条+**b33 三条硬性（钩子 step 语义列/生成关 dch 策略显式/build 幂等）**+钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>（b29 坑⑥）/契约 M 帧内容断言（hidecup 换位后杯 DOM 顺序断言+sentorder 槽序词断言+datacollect 场景计数 vs 点亮格断言）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact/verify 页先等 title=VERIFY PASS 再驱动/**无头测试 --mute-audio+stub 发声**/**演出窗驱动须等可交互（hidecup 换位期 tapCup 返 null）**）→ 首单元门禁（gate_common34.py：HC/SO/DC 钩子映射）→ 探针定钩子语义 → 独立复验（verify_batch34.py T1-T11+T9b）→ 全量回归（verify_final34.py R1-R8；R6 主入口 99→102）→ 两级入口 → 反方审查+分龄试玩（hidecup=5.5 岁/sentorder=6 岁半/datacollect=7 岁半）→ 修复闭环 → 收官（102/120）

**实长表（浏览器 Audio 实测 2026-09-11；等待窗=实长+300 余量；全表 30 条零缺漏 bad=[]）**：
- **hc_**：tut_watch 3264/tut_turn 1824/hint 3048/**right 2232（判对后窗 ≥2532）**/wrong 1656/show 1848；名音 hc_n_* **max 1440**（bear，5 条）；亮相链=名音 1440+150+show 1848+300=**3738**（§1 定版 show 段实走 TTS keyless 尾 estMs(5字)=2325，hc_show clip=备援资产不占正链——审查 m2 裁决；SHOW_WIN=4300=max(3738,4215) 双罩）；确认链=right 2232+150+名音 1440+300=**4122**；**hc 错链=wrong 1656+150+hint 3048+300=5154**
- **so_**：tut_watch 2952/tut_turn 1824/hint 2760/**right 2520（判对后窗 ≥2820）**/wrong_order 2424/wrong_word 2784；**词音/整句全 TTS（estMs 窗）**；确认链=right 2520+150+整句 TTS（句库 max≈10 字符 estMs 4050）+300=**7020**；**so 错链两条：order=wrong_order 2424+150+hint 2760+300=5634 / word=wrong_word 2784+150+hint 2760+300=5994——T11 取 max ≥5994**（两级 wrong 各算一条链，实现豁免窗须取两链 max）
- **dc_**：tut_watch 3264/tut_turn 1896/hint 1896/**right 2448（判对后窗 ≥2748）**/wrong 1800/q_count 1752/q_most 1992；名音 dc_n_* **max 1440**（bird/chick，6 条）；确认链=right 2448+150+名音 1440+150+TTS「N只」（estMs 2-3 字 1275-1620）+300=**≥4758**；count 题面链=q_count 1752+150+名音 1440+300=3642；most 题面=q_most 1992+300；**dc 错链=wrong 1800+150+hint 1896+300=4146**
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

**语音清单硬指标**：manifest 30 条合成 ok=30 fail=0；gate G3 注入数 11/6/13+core 3。

## §5 反方审查+试玩修复记录（收官回填 2026-09-12）

**全链验收**：首单元门禁 G1-G3 3/3；探针定钩子形状→独立复验 verify_batch34.py T1-T11+T9b **三款 12/12×3**；全量回归 verify_final34.py **R1-R8 8/8**（R1-R3 复验 12/12×3/R4 clips 注入 11+6+13+core3/R5 家长门 v=1.0/R6 主入口 **102 卡+b34inMain=3**/R7 href 全可达/R8 真实路径 dch=[2,2,2,2,3]+ch3 题型族 hc 全 [3,2]/so 全 [5,2]/dc count×4+most1+写档 rec 2-1..3-0）；两级入口（batch34/index.html 三卡+主入口 102 卡 102 开 102 闭）。

**verify 侧断言修正 3 起（非实现 bug）**：
1. T3「回滚式假换」：c=2 域「至少一杯不同」数学不可满足（a≠b 唯一组合={0,1}）——断言改「同序重复拒+c≥3 同集合相邻拒」，c=2 数值交替 (0,1)/(1,0) 有序对互异合法（§0.82 裁决括注已补）。
2. T4 maxrun=7 FAIL：seed 序列 flat25-31 有 7 连 dch3 是 mulberry32 数学真值非实现偏置——T4 改 **python 独立复算全序列对账**（dch_reseed 从算法定义独立移植，MATCH），形状启发式弃用。
3. T6/T8 datacollect 'nreach'：wrong_js(restart=False) 停在 count 题错落不上——前置 `dcStartMost(10)` 快进 most 题（探针面）。

**实现修复 1 起（本批最重要）**：sentorder 契约 I 补防重入窗=locked+wait(1000×SPEED)——verify 页 SPEED=0.03 窗缩水至 30ms，二击漏进 miss=2（b31 坑①重演）。**两轮修复**：第一版 guard 插 main 层 wrong 分支内→探针证 miss 照涨（miss 计数在 core 判定层 engTapWord 里 q._miss++，main 层拦晚了）；定版=guard 提前到 engTapWord 调用**前**+预判口径与 core 判定严格同构（合法下标+!used+w===words[picked.length] 才放行，越界/used 保留 core 语义）。修复后三语义实证：窗内错点吞 'false'+miss 不涨/窗内对选放行 'fill'+picked 推进/selftest 12/12。**方法论定版：miss 在 core 判定层的款，guard 必须在判定前拦+同构预判**。连带 verify tapRetry 加 300ms 间隔（无间隔 80 循环瞬间烧尽=U6 假 FAIL）。

**反方审查（core-adversarial-reviewer，REPORT-REVIEW-b34.md）：0 fatal/1 major/4 minor，全闭环**：
- **M1（major，修）**：sentorder U11/datacollect ⑪⑫ verify 页写档测试 removeItem+SEED 覆盖不恢复原 localStorage——真实玩家档可被毁。修=origLS 保存（init/KIDS.init 真跑前）+测后恢复；实证=三款预置真实档（v=9.9+marker=REAL_SAVE）→selftest 12/12→档完整恢复 True×3。hidecup 原本就正确（M1 验证脚本首跑 False=init script 未 JSON.stringify 包裹，b22 坑⑥重踩，修正脚本后过）。
- m1（修）：hidecup structWhy 漏 c≥3 同集合反向（真回滚）拒——core 补 swapBack 判+verify ③ 同步集合口径。
- m2（SPEC 注）：hc_show clip 定版改 TTS keyless 尾实走，hc_show clip=备援资产不占正链（SHOW_WIN=4300=max(3738,4215) 双罩）——§4 已注。
- m3（修）：sentorder build.py 恒真占位断言删除。
- m4（修）：hidecup verify simView 加 flat≥20 守卫（首版误插函数体内 break=语法死，自查后改 return 失败态）。
- 弱项入 backlog：replayBtn 换位演出期点击无 pop/bump 回应。
- 竞态教训：审查修复 rebuild 与后台 R1-R8 竞态（旧产物混合风险）——处置=TaskStop 旧跑+修复闭环+selftest 复绿后重跑 R1-R8。

**分龄试玩（REPORT-PLAYER-b34.md）：三款六步全过+pageerror 0×3+无阻断项**。防重入（契约 I 补）6 次（每款 2 关）全符；语音链形态全对（keyless TTS 恒链尾无违例）；SO 两级错反馈链区分实证（order/word 从不混淆）；DC 900ms 待决窗+撤回 off+rearm 5.8s 自动重挂实证；家长门+bonusSet（b27 坑①复验过）+restTip 收口+dailyMin 入账三款一致。P2/P3 零代码修复全入 backlog：HC ch4 换位等待偏长（演出节奏型）/HC 重看按钮可发现性/SO ch3 五词句记忆负载（兜底已够不修）/SO 干扰卡无视觉区分（设计意图）/DC 900ms 窗手快判错（设计权衡不修）/DC 撤回可发现性。

**收官：102/120**（batch34 三款 hidecup/sentorder/datacollect 交付）。
