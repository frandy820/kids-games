# SPEC-BATCH21 · 5-6 岁三款（喂小兔 / 泡泡数数 / 过河石桥）契约 v1（2026-09-08）

对象：5-6 岁（启蒙段：几乎不识字、点数 1-10、序概念发展中——承 SPEC-BATCH11 §0.19 零文字依赖）。目录 `batch21/feed|bubble|bridge/`。
结构照 batch1-20：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch3/countchick/_src/（点数判定+数词语音+角标辅助——feed 最像）、batch7/fishcolor/_src/（移动目标点选+速度反应——bubble 最像）、batch11/shadow/_src/（5-6 岁图形生成+大按钮——bridge 图案序列参照）+ batch11/sortsize/_src/（序概念款骨架）。

## §0 共同门禁（§0.1-0.42 全承 batch20 原文，一项不满足=不收；43-45 为 batch20 新增按需适用；46-48 本批新增）

1-42 条照 SPEC-BATCH20.md §0 逐条适用（单文件离线/verify=1/确定性生成/章号 1 基/语音四包装/教学看帮独/答错零惩罚/救援钟 14s/钩子拷贝/触摸 ≥64/对比度/transition 坑/家长门/Web Audio/每关 5 题/布局/轻反馈/干扰项/文案同源/底栏守卫/救援视觉/吞输入 pop/题面 clip 化/wrong clip/数词副本/错点防重入窗 1000ms/晃动防重入/演示实证/教学 watch ≤16s/连击三纪律/映射真值/对战真值/可解真值/日历真值/记忆真值/题库真值——仅适用项）。**b19-b20 沉淀承用：判错清空保留已评对位；行为变更类修复断言必须「区分新旧行为」强断言。**

46. **feed 取物真值**（本批新增）：目标量 N 由 GEN 确定性生成（ch1 N∈[1,3]、ch2 N∈[2,5]、ch3 双堆选食——题面指定食物种类+F、ch4 生成关混合且含「再添 1 根」增量题（先取 a 根→兔兔吃了→再取 b 根，总判定 a+b≤5））；提交判定=碗内该食物计数==N（**点错堆的食物不计入且轻反馈**——数错堆≠错误答案，是探索）；提交时机=点「喂给小兔」按钮（≥96px）或点满自动判（**两款并用：计数==N 时按钮亮起脉冲提示，点满即判**）；错（多点后提交/提交时≠N）=零惩罚，碗不清空，可点碗内食物取回（取回=计数-1+数词倒读）〔**r8 改造 2026-09-14：量域 1-5 与「再添 1 根」旧增量题作废——量域 6-10 六章 + left 剩题真心算（吃掉不清屏问还剩几根）+ combo 双食物合计订单，取物/错堆/取回/两款并用判定真值全部承用，详见 §1 r8 勘误**〕
47. **bubble 计数真值**（本批新增）：目标 N（ch1 N∈[1,3] 泡慢/ch2 N∈[3,5]/ch3 N∈[4,6] 泡快+干扰泡（灰色云朵泡，点破不计数+轻「呜」反馈——**干扰泡≠错误答案**）/ch4 生成关混速）；点破彩色泡=计数+1+数词语音（豁免通道 bab_n_ 不建，TTS 兜底）+顶部大数字跳字；**计数==N 即自动判定对**（不设提交钮——速度反应款的判定时机=点满瞬间）；泡泡飘出屏幕顶=自然消失不扣不罚， respawn 保持屏幕可点泡 ≥2（防「无泡可点」死等）；**多 点第 N+1 个彩泡前的防重入窗**：计数达 N 判定中（120ms 窗）点泡=pop 拒绝不计数〔**v2 改造 2026-09-13 作废本条判定时机——家长审计判「计数器拐杖+点满自动判」机制性最弱，改去计数器+颜色子集+提交制，详见 §2 v2 勘误**〕
48. **bridge 序列真值**（本批新增）：过河=石头序列逐个点（ch1 颜色 AB 二周期/ch2 ABC 三周期/ch3 数字顺数（石头显大数字，起点可变 1-2、连续 4-5 块）/ch4 生成关混合+倒数）；**下一步唯一正确石头**（pattern 推演），点对=兔子跳上该石头（前进动画+sfx），点错石头=该石头晃动+sayW+**不退回已走过的石头**（零惩罚）；走完全程=celebrate；序列真值 verify 侧独立计算器对账（周期 pattern/顺倒数数列）；**石头数 4-6 块**，触摸面 ≥64px。〔勘误 2026-09-08：①ab/abc 语义=整行颜色周期（2/3 色），孩子踩周期第 1 位（目标色 A 的全部石位）；ch2 与 ch1 玩法同构但干扰色多一种（B、C 两色）——6 石上限装不下踩全 ABC 路径，agent 落地定版；②顺数起点可变非恒 1-5——连续性是教育真值，起点变化增难度丰富度。③2026-09-09 试玩 P2：abc 恒 6 石（A B C A B C 踩 2 块 A）——4 石桥三色循环不可感知，「三色桥」章名对不上〕**〔r9 改造 2026-09-14 本条整体作废——纯续放踩色玩法废弃，改规律纠错式双步（找错+修对），真值详见 §3 r9 勘误〕**

## §1 feed 喂小兔（定量 1-5 数感；点取提交款）

**玩法**：题面语音「喂小兔子 3 根胡萝卜」。屏幕=食物堆（2-3 种食物：胡萝卜/青菜/苹果）+ 大碗 + 小兔子。孩子点食物堆取物入碗（每根=动画掉入+数词「一、二、三」）。计数==N 时「喂给小兔」按钮亮起脉冲，点按钮（或点满自动判）判定。
- 题型（4 章）：ch1 定量 1-3（单堆）；ch2 定量 2-5（单堆）；ch3 双堆选食（题面指定食物，「喂小兔子 4 片青菜」——点错堆不计数轻反馈）；ch4 生成关（三堆混+增量题「再添 1 根」）
- 取回：点碗内食物=取回 1 根（计数-1+倒读数词）——修正少点/多点的自助通道
- 星级：错次口径（提交错=1 错）；救援=碗+按钮 pulse（方向级）+目标食物堆 breathe（答案级 miss≥2）+**碗内多点时碗内食物逐根呼吸+延后语音「多啦，放回去一根」**（2026-09-09 试玩 P1：连错后一根根取回冗长是主要挫败源；只加引导不改判定真值）；吞输入轻叮配碗容器 bump 微动效（可见回应，试玩 P2）
- 教学：watch=演示取 2 根（数词同步）→喂；帮/独；`__fdDemoR`
- 钩子：`FD = { get currentLevel, get quiz(){ kind('pick'|'add'), food(食物 key), n(目标量), extra(增量题的 b), bowl {food→count}(碗内现况), step, miss }, tapFood(foodKey), tapBowl(foodKey), submit(), autoSolve(), start(flat)（外部切关入口——b21 三款曾系统性遗漏，定版必带） }`
- 语音：fed_tut_watch'看！喂小兔子吃东西'/fed_tut_turn'你来喂一喂'/fed_hint'数一数，喂给它'/fed_right'喂好啦，小兔子吃得真香'/fed_wrong'再数一数有几根'；食物词/数词=TTS 兜底（fed_n_/fed_f_ 不建）

〔**r8 改造定版 2026-09-14（AUDIT-56 #16 🔴：按数取物 1-5=4 岁级、flat0=24.2s（5 题）过短；ch4 增量题自动计数器在场="不用心算"）**：
①**六章量域 6-10**（STATIC_LEVELS=30、N_CH=6、CH_LEN=5；生成关 flat≥30 六章循环 dch=(ch-1)%6+1）：ch1 pick 6-7 单堆 / ch2 pick 6-8 单堆 / ch3 pick 8-10 单堆 / ch4 pick 6-9 双堆（目标+干扰堆——错堆 miss-food 不计数不 miss 承 §0.46）/ ch5 left 剩题（n∈[7,10]、eaten∈[2, min(4,n-3)]、rem=n-eaten∈[3,8]、单堆、**整关恒 left**）/ ch6 combo 合计订单（foods 两异、a,b∈[2,5]、合计∈[6,10]、三堆、**整关恒 combo**）；flat0 题0 钉 n=6 胡萝卜（教学演示=正解，演示取 6 根 ≈14.3s ≤16s §0.25）；
②**left 剩题真心算**（去"不用心算"）：取 n 件→grace/按钮判 'eat'→兔兔吃掉 eaten 件**不清屏**（剩 rem 件搬「剩物垫」可见）→chip 显 **'?'**（**去自动计数器**——总数永不上屏）→fed_left_q+fed_left_do 双 clip 顺序链（queue）→**镜像作答**=再取 rem 件同种食物→合计判定（碗内==rem）；**点数圆点支持**：点剩物一件=亮一个圆点+数词（engCount 顺序点数 1..rem，乱序/重复拒绝；点数不重置救援钟——静置数数=卡住信号）；**r8 去逐根高亮兜底**：碗内/剩物永不逐根呼吸（自动计数器同罪），错反馈只留方向锚（碗+按钮+问句期餐垫 pulse；miss≥2 目标堆 breathe 承 §0.21）；多点时延后语音「多啦，放回去一根」（2100ms 防切断 wrong clip）承用；
③**combo 双食物合计订单**：chip=双组图形+数字+加号（订单全显，挑战=双轨计数）；判定=**逐类匹配**（每类各自到位才就绪，只填一类提交=wrong 碗不清空）；数词双轨各自 1..n（combo 内两类独立报数）；干扰堆=第三食物（miss-food）；
④**时长硬断言**（5-6 岁单关 ≥40s）：estMs=n*345+600（SAPI 每码点，**定版字面，禁 +300 变体，四处同步**=game-data 定义/game-main 注释/game-verify 独立副本/build.py 源码级断言）；TAP_MS=2000、RIGHT_MS=2400、EAT_MS=900、ASK_MS=estMs(15)+estMs(11)+EAT_MS（问句双 clip+吃演窗）；levelDur=Σ各题（left=n+rem 两次取物+ASK 窗、combo=(a+b) 取物、pick=n 取物）；LEVEL_MIN_MS=40000 进 verify 硬断言+独立副本对账；实测 60 关 durMin=91490ms、durMax=232495ms（dch5 left 关最长，无上限约束）；
⑤**家族契约**（承 §0.4/A、F）：dayEnd 预告两处传 nextHint(lim-1)；静态章末预告=CHAPTERS[floor(f/CH_LEN)+1].hint（禁 off-by-one 式）；生成关预告=实算 GEN_HINTS[genLevel(f+1).dch-1]（禁 (ci+1)%N 字面）；verify 侧 SPEC_HINT 文字重列逐点断言+哨兵（nextHint(4)≠ch3 文案）；
⑥**钩子改**：FD={currentLevel, quiz{kind('pick'|'left'|'combo'), food, n, eaten, rem, foods, a, b, bowl{food→count}, need{food→count}, step, miss, phase, target, piles, counted(已点数剩物件数)}, tapFood, tapBowl, **tapLeftover(i)**, submit, autoSolve（按 need 逐类欠填/越点取回自愈）, start(flat), tutorial}；
⑦**语音**：新增 fed_left_q'小兔子吃掉啦，数一数，还剩几根'/fed_left_do'拿一样多的，喂给小兔子'（fed_ 前缀沿用、gen_clips.py feed 段登记、manifest 对账一字一致）；**既有 5 键文本一字不改**；数词/食物词仍 TTS 兜底；
⑧布局：问句期 #field.left2 压堆宽（触摸面仍 ≥64）+剩物垫（.leftover 64×64+圆点角标）入 #field（piles 与 bench 之间），竖屏媒体查询适配；
验收链（2026-09-14 实测）：build.py OK（10 clips 注入+家族/量域/文案源码级断言）→ ?verify=1 双 viewport **74/74** → _selftest.py **49/49**（真实指针通关 66.9s≥40s/left 问句态+点数圆点/combo/双 viewport 截图非空白/离线 0 pageerror）→ verify_one_feed.py **8/8**（F1 六章 60 关/F2 状态机/F3 直驱/F3b 恒定+点数+dch 全覆盖/F4 确定性/F5 0 pageerror/F6 durMin=91490≥40000）→ gate_common21 3/3 → verify_batch21 6/6（姊妹款无退化）。〕

## §2 bubble 泡泡数数（点数+速度反应；点满即判款）

**玩法**：题面语音「点破 4 个泡泡」。屏幕=持续冒泡区（彩泡上飘），顶部大目标数字+当前计数。点破彩泡=计数+1+数词+跳字；计数==N 即判对（celebrate 自动）。**戳兔子=重读题面**（含目标数——孩子忘了数的第一直觉是戳兔子，2026-09-09 试玩 P2）。
- 题型（4 章）：ch1 N∈[1,3] 泡慢（4s 穿越）；ch2 N∈[3,5]；ch3 N∈[4,6]+灰云朵干扰泡；ch4 生成关（混速+干扰+偶发大泡=1 泡计 2？——**不做**，计数语义须纯粹，大泡只加分不成双）
- 干扰泡（灰云朵）：点破不计数+「呜」轻反馈+miss 不增（探索≠错）
- 泡够原则：屏上可点彩泡恒 ≥2（respawn 秒级）；飘出顶=自然消失
- 星级：错次口径=**误点干扰泡 ≥3 次才算 1 错**（轻探索宽容——速度款点误率高，1 次即错挫败）？——否，**本款无「错」路径**（点满即对、无提交、干扰不计错）：星级=完成即 3★ 恒定？家族契约星级 0 错=3★——本款 miss 恒 0=恒 3★。**定版：miss 只记「点破干扰泡次数」入星级（0 次=3★/1-4 次=2★/≥5 次=1★），不进防重入窗不 sayW**（点干扰=探索反馈非错误）
- 教学：watch=演示点破 2 个（数词）→「点够了就完成啦」；帮/独；`__bbDemoR`
- 钩子：`BB = { get currentLevel, get quiz(){ n(目标), count(已点彩泡数), pops(累计点破数含干扰), step, miss(干扰泡点破数) }, tapBubble(id)——id=彩泡/干扰泡, autoSolve(), start(flat)（外部切关入口） }`
- 语音：bub_tut_watch'看！点破小泡泡'/bub_tut_turn'你来点一点'/bub_hint'数着数，点到就够了'/bub_right'数对啦，泡泡真好玩'/bub_wrong（不建——无错误路径，干扰泡用 sfx 非 clip）

〔**v2 改造定版 2026-09-13（家长审计：机制性最弱——计数器拐杖+点满自动判=不用数数、无错误路径）**：
①顶部计数显示删除——只显示目标数 N+目标色色卡（图形），当前计数不显示；
②颜色子集判定：场上彩泡三色（蓝/黄/粉），只点目标色才计数；点非目标色=不破+抖动+轻「呜」（探索不 miss）；灰云朵干扰泡保留（点破不计数不 miss）；
③提交制：点兔子旁「好了」大按钮（绿对勾图形）判定——==N→right；>N→'wrong_more'（bub_wrong_more'多点了，重新数一数'）清空重数+泡场重置+miss+1；<N→'wrong_less'（bub_wrong_less'还差几个，再点点'）不清空继续点（不 miss）；
④章结构改：ch1 单色场 N∈[3,5]（全场同色+灰干扰，先适应无计数器+提交制）/ch2 两色场（蓝+黄）N∈[4,6]/ch3 三色场（+粉）N∈[5,8]/ch4 生成关 seeded（色组合 2-3 色+数量 N∈[3,8]）；
⑤星级改：miss=多点提交错次+干扰云点破 ≥3 次折 1；0=3★/1-2=2★/≥3=1★；
⑥教学改：演示点 3 个蓝泡（数词逐个）→按「好了」→right；强调「数够了就按大对勾」；flat0 题0 恒 n=3 blue；
⑦题面语音=数词+颜色词 keyless TTS 拼句（'点破四个蓝色泡泡'）；戳兔子=重读题面（含 N 与色，承 09-09 试玩 P2）；
⑧钩子改：BB={currentLevel, quiz{n,color,count,pops,step,miss}, bubbles(含 color), tapBubble(id)→'pop'/'skip'/null/false, **tapSubmit()**→'right'/'wrong_more'/'wrong_less'/null, autoSolve, start(flat), tutorial}；
语音句 v2：watch'看！点蓝色的小泡泡'/turn'你来点一点，点够了按大对勾'/hint'数着数，点够了就按大对勾'/wrong_more+wrong_less 新增，right 沿用。〕

〔**r9 改造定版 2026-09-14（AUDIT-56 #17 🔴 行 73：倒计时收尾缺失+时长无下限断言+家族契约 A/F 未实修）**：
①**倒计时收尾（delta3）**：章后段=每章第 4/5 关（lv>=TIMED_FROM_LV=3，静态+生成关同式，genLevel.timed 确定性字段；flat0 教学关恒不计时）；每题两段——静默数数窗 QUIET_SEC(n)=16+2n 秒（无计时显示，不打扰数数）→ 可见倒计时 COUNT_SEC=12 秒（#timer 温和琥珀条收缩，末 3 秒转橙轻脉冲，零文字）→ 超时 sleep 静息 SLEEP_SEC=4 秒：**泡泡缓浮不爆**（DRIFT_K=0.2 泡速/生成/模拟钟同步放慢，天色转暮）、点泡/提交软吞返 'sleep'（零声零 miss 零 submitErr 泡不破）、queue 顺序播 bub_timeup'泡泡睡着啦，不着急，再数一次'→题面重读 → 自动**温和重来**（q._cnt 清零+计时重臂 quiet，泡唤醒不重建场；miss/submitErr/cloudPops/step 全不动）；count 期答对=计时取消（新题 quiet 重臂）；计时机在 UI 层（game-main advance 走 field.t 模拟钟），引擎 engFieldTick 直驱不涉计时保 verify 大批量模拟确定性；
②**时长硬断言（5-6 岁单关 ≥40s）**：estMs=n*345+600 定版字面（SAPI 每码点，**禁 +300 变体，四处同步**=game-data 定义/game-main 注释/game-verify 独立副本+数值断言/build.py 字面 assert）；TAP_MS=2000（色筛找泡+追移动目标+触摸+数词）/SUBMIT_MS=120/RIGHT_MS=2400；quizDurMs=estMs(题句 8 码点)+n*TAP_MS+SUBMIT_MS+RIGHT_MS；LEVEL_MIN_MS=40000 进 verify 硬断言+独立副本对账+verify_one python 第三副本；实测 40 关 durMin=65400ms、durMax=99400ms；
③**家族契约实修**：A=dayEnd 预告两处传 nextHint(lim-1)（原启动分支传 nextHint(lim) off-by-one）；F=nextHint 重写——f+1<STATIC_LEVELS 走 CHAPTERS[floor(f/CH_LEN)+1].hint，否则 GEN_HINTS[genLevel(f+1).dch-1]（原按章索引加一取模字面在生成关章中段必错章——dayEnd 传 lim-1 常为章中段）；verify SPEC_HINT 七点逐字断言（含 flat21=生成关章中段 off-by-one 哨兵+flat4 M1 负哨兵）+build.py 源码级契约断言；
④**钩子扩**：BB={...v2, currentLevel 增 timed, **get timer**{timed,phase('off'|'quiet'|'count'|'sleep'),remain,quietRemain}}；tapBubble/tapSubmit 增 'sleep' 返回值；
⑤**语音**：新增 bub_timeup'泡泡睡着啦，不着急，再数一次'（bub_ 前缀沿用、gen_clips.py bubble 块登记、既有 6 键一字不改、mp3 3936ms±60ms 实长断言锁定）；
⑥**verify_voice 登记**：bubble 此前未登记=verify_batch21 传参空转 rc0 假绿（feed 同款漏登），补 EXPECT 10 键+DIRS '../batch21/bubble'；
验收链（2026-09-14 实测）：build.py OK（10 clips 注入+estMs/契约 A·F·M1/r9 常量/manifest 文案五组源码级断言）→ ?verify=1 双 viewport **53/53**（⑫ r9count 全周期：timed 规则表 40 关/quiet 无条→count 条显收缩+low→超时 sleep 缓浮实证 driftRate=1.85/软吞零惩罚/重来清零/count 期答对取消；⑫b estMs+SPEC_HINT）→ _selftest.py **40/40**（真实指针通关 wall-clock 54.0s≥40s/首错双路径/教学链/flat3 倒计时真实页全周期含 bub_timeup→题面重读 queue 链/双 viewport 截图非空白/离线 0 pageerror）→ verify_one_bubble.py **10/10**（新增 B7 倒计时+B8 python 时长副本 durMin=65400≥40000）→ gate_common21 3/3 → verify_batch21 5/6（唯 bridge 红系其并行改造在飞，非本款回归）。〕

## §3 bridge 过河石桥（序列步骤规划；逐点推进款）

**玩法**：题面语音「踩着红色的石头过河」/「踩着 1 2 3 的石头过河」。屏幕=河面+石头桥（4-6 块石头横列，部分带颜色/数字），兔子在起点。按序点对下一块=兔子跳上去；点错=石头晃+sayW+不退步。走完=celebrate。
- 题型（4 章）：ch1 颜色 AB 二周期（如 红蓝红蓝红，目标色=红）；ch2 ABC 三周期（**恒 6 石 A B C A B C 踩 2 块 A**——试玩 P2 勘误）；ch3 数字顺数 1-5（石头显大数字，按 1→2→3→4→5 点，含非相邻数字干扰石）；ch4 生成关（混合+倒数 5-1）
- 序列真值：下一步=pattern 在当前位置的延续值；干扰石=非序列石头（同屏 2-3 块，颜色/数字不在下一步应点集）
- 星级：错次口径（点错石=1 错）；救援=序列已走部分 flash（方向级——「照着前面的规律」）+下一块应点石头 breathe（答案级 miss≥2）
- 教学：watch=演示走 2 步（pattern 读出「红 蓝 红，接下来是红」——勘误③：预告的是下一踩位 A 色，非相邻石）→帮/独；`__bgDemoR`
- 钩子：`BG = { get currentLevel, get quiz(){ kind('ab'|'abc'|'fwd'|'rev'), stones[]({color?,num?,isPath,pos}), nextIdx(下一步应点石头 idx), pos(兔子所在石 idx——**-1=左岸起位**，起点非石), step, miss }, tapStone(i), autoSolve(), start(flat)（外部切关入口） }`
- 语音：brg_tut_watch'看！踩着石头过河'/brg_tut_turn'你来走一走'/brg_hint'看看前面的规律'/brg_right'过河啦，你真棒'/brg_wrong'看看前面踩了什么'；颜色词/数词=TTS 兜底

〔**r9 改造定版 2026-09-14（AUDIT-56 #18 🔴：AB/ABC 颜色规律=3-4 岁级、ch2 实测「就是找绿色」、flat0≈50s 时长靠演出窗——上方 §3 旧玩法全段作废，承 §0.48 勘误）**：
①**规律纠错式双步（delta1）**：石桥序列**完整给出+恰 1 错石**（badPos∈[per,n-1] 首周期完整不变量——孩子先读完整周期再比对后段）；**find**（点出错石='found'，点其余=wrong 零惩罚+晃动+sayW）→ **fix**（3 候选修对='goal'/'done'，错候选=wrong 零惩罚）→ **walk**（修对后错石弹入替换+兔子逐石跳过河演出 STEP_MS=460/石）→ 下一题；find 期点候选/fix 期点石头=阶段门拒 false；**错石值取 pattern 行内用色异值**（不能靠「颜色陌生」排除，必须数周期位置）；
②**周期扩展（delta2）**：六章 STATIC_LEVELS=30、N_CH=6、CH_LEN=5——ch1 'ab' 6 石 / ch2 'abc' 6 石 / ch3 'abcd' 8 石四元 / ch4 'aabb' 8 石重复元（同同异异成对，2 色）/ ch5 'dual' 双属性 / ch6 静态混合 ≥3 型（型集校验）；生成关 flat≥30 六章 seeded 循环 dch∈[1,6]（mulberry32(flat*7919+13) 承原版）；
③**色+形双属性（delta3）**：ch5+全部 dual 题石头={color}×{square,round}，周期元=2 位双属性对（色形各自互异）；**错石与应值恰差一属性**（色同形异/异色同形，异或判定）；候选干扰同样恰差一属性——孩子必须同时盯两维；色库扩 5 色（+orange）；
④**候选 3 块**：[应值, 错石值, 第三干扰]；互异；应值恰一次（candOk 指向）；单色章 abcd 候选全行内色（入门档 ab/aabb 允许行外第三色）；**每块干扰与应值恰差一属性**；
⑤**时长硬断言（5-6 岁单关 ≥40s）**：estMs=n*345+600 定版字面（**禁 +300 变体，四处同步**=game-data 定义/game-main 注释/game-verify 独立副本/build.py 字面 assert）；quizDurMs=estMs(FIXQ 文本)+SCAN_MS[kind]+FOUND_MS+(首题 estMs(FIXDO))+FIX_MS+n*STEP_MS+BANK_MS+RIGHT_MS；SCAN_MS{ab:4200,abc:5200,abcd:6800,aabb:6300,dual:7800}（找错扫描窗按周期复杂度分级）/FOUND_MS=1600/FIX_MS=3000/BANK_MS=900/RIGHT_MS=2400；LEVEL_MIN_MS=40000 进 verify 硬断言+独立副本对账+verify_one Python 第三副本；实测 60 关 durMin=107570ms、durMax=125570ms；selftest 真实 pointer wall-clock 45.6s；
⑥**救援不泄答案**：14s 重读题面（speechOf 分流 find/fix 期）+find 首周期 flash（方向级）；find miss≥2=**pat-tip 规律提示条**（周期色点可视化，点数=per，**不指认错石**——错石零视觉标记，data-bad 仅数据属性）；fix miss≥2=正确候选 breathe（§0.21 答案级）；sayW 三态（flat<3 每错必播/≥3 10s 节流/miss===2 force 豁免一次）；
⑦**家族契约**（承 §0.4/A、F、M1）：dayEnd 预告两处传 nextHint(lim-1)；静态章末=CHAPTERS[floor(f/CH_LEN)+1].hint；生成关=实算 GEN_HINTS[genLevel(f+1).dch-1]；verify SPEC_HINT 五章末逐字断言+f=29 实算+f=4 off-by-one 负哨兵；build.py 源码级契约断言 count==2；
⑧**钩子改**：BG={currentLevel(含 dch/kinds), quiz{kind,stones[](color,shape?,bad,pos),badPos,cand[](color,shape?),candOk,phase('find'|'fix'|'walk'),step,miss}, **tapCand(i)**→'wrong'|'goal'|'done'|false|null, tapStone(i)→'wrong'|'found'|false|null, autoSolve（10 tap 上界）, start(flat), tutorial}；旧 isPath/nextIdx/pos 字段删除；
⑨**语音**：新增 brg_fix_q'小桥上有一块石头放错啦，找一找'/brg_fix_do'选一块对的石头，补上去'/brg_found'找到啦，就是这块'（brg_ 前缀沿用、gen_clips.py bridge 块登记、既有 5 键一字不改）；**verify_voice 补 EXPECT['bridge']=11+DIRS**（batch21 driver 传 bridge 但 EXPECT 无键=空转假绿——feed/bubble 同漏先例）；chantText=行首色短名连读+'，有一块不对哦'（教学 watch 期规律读出）；
⑩布局：#cands 候选盘（translateY 滑入）+#pat-tip+#stones.tight 8 石章；竖屏 stone 64×64/cand 70×64（触摸 ≥64）；gate_common21 bridge demoR 判对证据 'step'→'found'（玩法已换）；
验收链（2026-09-14 实测）：build.py OK（11 clips 注入+estMs/契约 A·F·M1/r9 常量五组源码级断言）→ ?verify=1 双 viewport **70/70** → _selftest.py **47/47**（真实 pointer 双步通关 wall-clock 45.6s≥40s/abcd+aabb+dual 章型/miss2 pat-tip 4 点不指认/双 viewport 触摸 ≥64+截图非空白/离线 0 pageerror）→ verify_one_bridge.py **9/9**（B1 六章 40 关/B2 Python 独立周期计算器+B2b badPos·candOk 对账/B3 直驱双步/B3b 阶段门/B4 确定性双读/B2c Python 时长副本 durMin≥40000/B5 0 pageerror）→ verify_voice bridge PASS（11 clips）→ gate_common21 3/3 → verify_batch21 姊妹回归。〕

## §4 交付与验收（承 batch15-20 流水线）

语音预合成（gen_clips.py 扩 fed_ 4+bub_ 4+brg_ 5 中文句——13 条+core games 数组加三款）→ 3 agent 并行 → 首单元门禁（gate_common20.py 模式改参+title 时序纪律+**offsetWidth 布局量测**）→ 独立复验（断言从 SPEC 推导；46-48 三条分源：feed 碗计数状态机/bubble 计数-判定时机/bridge Python 独立序列计算器）→ 全量回归 → 两级入口（batch21/index.html 三卡+主入口 60→63 卡）→ 反方审查+5.5 岁试玩 → 修复闭环 → 收官（**5-6 岁段 P1 满 18+3=21 款**，总 69/90）
