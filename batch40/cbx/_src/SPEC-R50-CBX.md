# SPEC-R50-CBX（cbx 冷静工具箱 难度改造 r50 · 轮⑤批三 · Task#45 A67 段序 24）

2026-09-23 定稿。承接 AUDIT-67 行 40 判定 🟡（实测 65-72s：「ch1-2 两选好坏分明=4-5 岁是非题；ch3-4 三选有灰阶辨析」——思考占比极低主诉）。
版本链：改造前 index.html md5=`1908e70b2dc8575b31c4002bfff96e0a` → 改造后 `3907745a34904693b49cb2048acdaece`（build 双跑幂等）。

## §R1 改造维度（三维度取舍）

**采纳维度 1+2 融合落地：全程三选灰阶辨析（fair 次优卡机制）。不采纳维度 3（策略排序/两步链），论证见 §R12。**

- **去两选档**：ch1-2 从「好+坏」两选升「**最佳+次优+坏**」三选；ch3-4 从「好+坏+中性」改「**最佳+次优+中性**」三选（去坏卡=三张全「不坏」纯灰阶）。审计指出的「中性卡仅 2 张不够 ch1-2 用」由 fair 机制解决：**fair=好卡池成员（5 张），不是新卡**——池不扩容、图标零新增、键零新增，灰阶来自「同一池内的情境对症差」。
- **情境-策略最佳匹配**：干扰从「同档随机」（ch1-2 坏卡好坏分明）升「情境语义近对」（fair=好策略但非本情境最佳）。干扰选取规则=封闭表（§R2 全 20 行显式 fair 列+类表四律），verify ⑥ 独立照录对账。
- **answer 唯一解锚保持（r48 libr 先例）**：每题 answer=题表 good 列下标（SPEC 表真值）。旧口径「picks 中唯一 kind='good'」作废（fair 同为好池卡，候选恒含 2 张好池卡）；新口径独立推导面=verify/pycheck 从 SPEC 硬编码表 good 列推导，禁读 quiz.answer 直比。
- **SEL 诚实红线（fair 反馈非否定）**：深呼吸不会「更难受」——fair 错点禁用 cbx_wrong 头段，改走**辨析链 [cbx_hint, cbx_sc_N 情境重播]**（hint「选让心里舒服的」+重听情境=辨析教学闭环：点次优→重想哪个最对症）+fair 卡轻摆动画（.fair，与坏卡摇头区分）。
- **可达性论证（6-7 岁）**：三选 1/3 命中+类互异约束保证辨析粒度为「类别级」（降温/安抚/表达）而非「同策略微差」（breath vs countten 禁现，见 §R2 类律）；fair 反馈非否定+探索不罚（卡可重点）+miss≥2 好卡 breathe 救援三级梯度兜底。

## §R2 章谱表（20 题全表 · 封闭真值 · verify/pycheck 独立照录）

**好卡功能类表**（fair 类互异锚——同类双好辨析不可教，禁现）：
- A 降温类（直接降低身体唤起）：breath 深呼吸 / countten 慢慢数到十
- B 安抚类（温和转移与安抚）：hugbunny 抱抱小兔子 / drinkwater 喝口水
- C 表达类（把心里话说出去）：sayout 说出来

**fair 四律**（verify ⑥ + pycheck 双面断言）：
①fair ∈ 好卡池 ②fair ≠ good 且 ≠ bad/neutral（候选三 id 互异）③classOf(fair) ≠ classOf(good) ④同章 5 题 fair 互异（=全池 5 张各 1 次）+全局每张恰 4 次（20/5）。

| 章 | # | emo | 情境句（clip 键 cbx_sc_N） | good 最佳 | fair 次优 | 第三张 |
|----|---|-----|--------------------------|-----------|-----------|--------|
| ch1 生气 | 0 | angry | 弟弟推倒你的积木，你好生气（sc_1） | breath A | drinkwater B | bad: throw |
| | 1 | angry | 同学抢走你的画笔，你气坏了（sc_2） | countten A | sayout C | bad: hit |
| | 2 | angry | 排队时有人插队，气鼓鼓的（sc_3） | sayout C | hugbunny B | bad: shout |
| | 3 | angry | 妹妹弄坏你的小车，好想发火（sc_4） | drinkwater B | countten A | bad: tear |
| | 4 | angry | 游戏输了，你气得直跺脚（sc_5） | hugbunny B | breath A | bad: shout |
| ch2 难过 | 5 | sad | 心爱的气球飞走了，你好难过（sc_6） | breath A | hugbunny B | bad: tear |
| | 6 | sad | 好朋友转学了，你好难过（sc_7） | hugbunny B | countten A | bad: shout |
| | 7 | sad | 画好的画弄脏了，你很难过（sc_8） | drinkwater B | sayout C | bad: throw |
| | 8 | sad | 小金鱼不动了，你心里难过（sc_9） | sayout C | breath A | bad: hit |
| | 9 | sad | 下雨天去不了公园，好难过（sc_10） | countten A | drinkwater B | bad: tear |
| ch3 害怕 | 10 | fear | 半夜听到怪声音，你有点害怕（sc_11） | breath A | hugbunny B | neutral: hide |
| | 11 | fear | 打雷声好响，你吓得发抖（sc_12） | hugbunny B | countten A | neutral: hide |
| | 12 | fear | 房间黑黑的，你不敢进去（sc_13） | sayout C | breath A | neutral: hide |
| | 13 | fear | 看牙医的时候，你心里害怕（sc_14） | countten A | drinkwater B | neutral: cryonly |
| | 14 | fear | 大狗汪汪叫，你吓得后退（sc_15） | drinkwater B | sayout C | neutral: cryonly |
| ch4 沮丧 | 15 | frus | 鞋带总系不好，你好灰心（sc_16） | breath A | sayout C | neutral: cryonly |
| | 16 | frus | 跳绳总绊脚，你有点泄气（sc_17） | countten A | drinkwater B | neutral: cryonly |
| | 17 | frus | 拼图好难，你拼得直叹气（sc_18） | hugbunny B | breath A | neutral: hide |
| | 18 | frus | 写的字歪歪扭扭，你好泄气（sc_19） | sayout C | hugbunny B | neutral: cryonly |
| | 19 | frus | 学骑车总摔倒，你灰心了（sc_20） | drinkwater B | countten A | neutral: hide |

行序=cbx_sc_N 注册序禁重排（sayKey='cbx_sc_'+(scene+1)）；20 题情境句/emo/good/bad/neutral 与改造前逐行一致（**good 列零改动**，仅新增 fair 列——锚面保留见 §R11）。same-题 good≠fair≠第三张、同章句互异、同章 good 互异（既有律）全部保持。

**档位结构（r50 后）**：ch1-2=good+fair+bad（坏卡在——SEL 行为底线教育保留，先排除伤害行为再辨析好/次好）；ch3-4=good+fair+neutral（纯灰阶——三张全「不坏」，难度更深）。生成关 dch1-4 同构映射各章池。

**hint 档位联动**（家族 F 契约同步）：GEN_HINTS=['三种工具，选让心里舒服的','心里难受，三张挑最帮你的','三张都像好办法，选最帮自己的','三个里挑一个，让心里舒服']；CHAPTERS[2].hint（预告 ch3）='害怕时三张都像好办法，挑最帮你的'（其余三条不变）。Q_TEXT（纯装饰不播）='心里不舒服，挑最帮你的'。aria-label 统一'工具 '<label>（旧版好卡标'好工具 '=泄答案，r50 好池双卡后一并修正）。

## §R3 生成律（r50 定版 · seed/rotate 承基线）

- 种子 mulberry32(flat*7919+897) 不变；静态关 dch=flat//5+1；生成关 flat≥20 dch=ri(rnd,1,4)（先取数保确定性）——全部承 SPEC-BATCH40 §0。
- 取题 N1 章池 rotate 不变：题(flat,k)=表行[(dch-1)*5+((flat%5)+k)%5]。
- 候选三元组：ids=[good, fair, bad|neutral] seeded shuffle。**rnd 流变化（r50-fix m-2 勘正=双因）**：ch1-2 二元组→三元组 shuffle 每题 1→2 rnd=流偏移，同 seed 后续题序列全变；ch3-4 基线本就三元组（rnd 消耗 2/题不变，无流偏移）——该子集谱变化来自**候选集替换**（bad 位→fair 位）。两因合流=谱面全刷新（§R11 实证 0/300 同值；ch1-2 长度不同+ch3-4 成员不同，picks 逐题必异）。教学迷你关 buildQuiz(mulberry32(97+s)) 同律（教学卡序变化，幽灵手指恒指 good，分账预算不变）。
- structWhy 重写：恒 3 卡+三 id 互异+answer=picks.indexOf(行 good 列)+fair 域（好池/≠good/类互异）+picks 集与行三元组一致。dch 参数保留签名（不再分支卡数）。
- engTapPick 不变（i===q.answer 判定）；fair 错点同 bad/neutral 走 'wrong' 返回值+miss+1（枚举族稳定：picked/done/wrong/false/null）。

## §R4 键集表（三源一致：game-data 常量 / 本 SPEC / 交付报告清单）

**r50 零新键、零同键文案变更。** cbx 语音键集=36 条（cbx_ 前缀）+core 3=39，与 manifest 现状一致（build.py 注入断言 39+逐键在场；verify ① 全注入+全实长辨别 ±60ms；gate G3 n=39 miss=[]）：

- 基础 5：cbx_tut_watch / cbx_tut_turn / cbx_hint / cbx_right / cbx_wrong（文案未动）
- 好卡句 5：cbx_g_{breath,countten,hugbunny,sayout,drinkwater}
- 坏卡后果 4：cbx_b_{throw,shout,hit,tear}
- 中性 2：cbx_n_{cryonly,hide}
- 情境句 20：cbx_sc_1..20（**文案逐字节未动**——fair 列新增不改 say 字段；主线无需重合成任何 clip）

**fair 辨析链零新键论证**：曾评估新键 cbx_fair「这个也不错，还有更帮你的哦」（13 字，est=13×345+600=5085ms）——**不采纳**。根因：core.js T46 阶段3（2026-09-20）已删 speak 通道，`play/queue` 缺 clip=静默无声+console.warn（无 TTS 回退）；段一不注册=cbx_fair 在册前 fair 反馈完全无语音=残缺交付。替代=复用 [cbx_hint(2208ms), cbx_sc_N(3048-3600ms)] 两段：hint 承载「重选方向」语义与情境重播构成辨析闭环，段一即完整可玩；语义代价（少了「这张也不错」的明示肯定）由 .fair 轻摆动画（非否定演出）补承载。若主线后续认为需要专用句，属独立增键决策（须走 gen_clips 注册+窗复算），本 SPEC 不预留半成品分支。

## §R7 时序窗（r50 复算 · N2 总窗口径）

- **fair 辨析链**：[cbx_hint, cbx_sc_N] 两段全 clip（契约 N 无 keyless ✓）。实链=2208+150+sc(3048-3600)=5406-5958；+300=5706-6258。
- **错链豁免窗 WRONG_CHAIN_WIN=6834 三链共用**：恒 ≥ 坏/中性实链 6258（=2160+150+3648+300）与 fair 实链 6258（=2208+150+3600+300）——verify ⑨ 双族断言+build ①-r50 静态断言（sc max=3600 硬编码自 SPEC_DUR 表 max，段二 sc 若重合成变长须 SPEC_DUR+build+本节三处联动复核）。窗内错点（含 fair）吞 false 不计 miss、好卡放行（契约 I 补口径不变）。
- **首错锁 SHAKE_MS=1100**：×1+140=1240 ≤ wrong+150=2310 且 ≤ hint+150=2358（fair 链首段口径，N2 同口径双断言）。
- **确认链/题面窗/教学延窗/celebrate 窗**：全部不变（好卡路径零改动；celeWinOf 5370-7266 恒 ≥2892）。
- **fair 卡演出**：.fair 轻摆 0.6s CSS（cd-fair：微升+±3deg 缓摆，与 .bad 摇头 ±7px 区分）——锁窗同 SHAKE_MS 1100（复用 wrong 演出框架，无新时序面）。

## §R9 风险自登记 + 估时预估

| # | 风险 | 缓解 |
|---|------|------|
| R9-1 | fair 语义首遇不可判（孩子第一题只能 1/3 猜） | 尝试错误学习设计：fair 反馈非否定+探索不罚+豁免窗防连罚+miss≥2 breathe 答案级救援——2 次接触内可达；类互异约束保证学会的规律可迁移（类别级） |
| R9-2 | ch3-4 去坏卡后 SEL「伤害行为认知」覆盖减半 | ch1-2 仍含坏卡 10 题（每题 1 张，4 坏卡轮换）；坏卡后果句全保留——底线教育不丢失，仅后移 |
| R9-3 | fair 与 good 辨析在某题偏弱（如题 3 喝水 vs 数数） | 类互异硬约束防「同类微差」；弱辨析题接受（题表定死唯一解，反馈链承载教学）；r51+ 若试玩暴露可单行调 fair |
| R9-4 | 星级通胀（三选 miss 概率升→1 星变多） | 口径不变（0=3★/1-2=2★/≥3=1★）；探索不罚+救援梯度已兜底；实测后若 1 星占比过高属 r51 调参项 |
| R9-5 | 谱全刷新致旧存档玩家重玩体验全变 | 键/存档/进度结构零变（v1.0 兼容）；关卡题面集合不变（同章池 rotate），仅卡组构成变——重玩即新体验非破坏 |
| R9-6 | aria-label 改动影响无障碍回归 | 统一'工具 '前缀更保守（不泄答案），标签文本（label）未动 |

**估时预估（设计论证，段二实测复核）**：基线 65-72s（两选是非+低思考）。r50 后：三选 1/3 命中+类别级辨析思考（预估每题净思考 3-6s vs 旧 1-2s）+fair/错反馈重试链（预估人均每关 1-2 次 miss×~6s 链窗）。预估单关 **90-115s**（脱离基线 +25-45s，思考占比从 ~15% 升 ~35%）。此为设计推算非实测——六门禁不含时长实测，主线段二后可复用 _play40.py 口径实测复核。

## §R11 baseline 谱锚面 + 谱变化声明

工具四件（_src/）：_r50_extract.py（改造前提取）→ _r50_baseline.json（60 关）；_r50_post.py → _r50_post.json（改造后 60 关）；_r50_pycheck.py（位级对拍+锚面核验）；_r50_verify_run.py（verify 双视口驱动）。

- **锚面保留（pycheck ANCHOR 全过）**：20 题行级锚（say/emo/good/第三张 bad|neutral id）与 baseline 逐题一致——**rows0 教学锚逐字段保留**（弟弟积木/breath/throw 原样，仅新增 fair=drinkwater 列）；教学链预算锚（scene2=12 字句+good=sayout→demo 窗 5370）不变，watch 分账 15230 ≤16000 保持。
- **谱变化（pycheck SPECTRUM 实证）**：60 关 300 题 picks 序列与 baseline **完全相同 0/300**（r50-fix m-2 勘正=双因：ch1-2 流偏移（1→2 rnd/题）+ch3-4 候选集替换（本就三元组无流偏移））；dch 取数/rotate 取题/教学 seed 不变。
- **分布**：答案位三桶 verify 口径 200 题 {0:76, 1:59, 2:65}（下界 46=期望−3σ 独立推导）/pycheck 口径 300 题 {0:106, 1:90, 2:104}（下界 75 同律）——全部达标，无位置偏置。

## §R12 不采纳论证（宁难勿易 but 6-7 可达的边界）

- **维度 3a「两步策略链（先 X 再 Y 双选）」不采纳**：①r25 M2 纪律=无「对但未完成」中间态——双选组合必然产生「第一张对第二张未点」中间态，状态机需额外处理重选/撤销语义，违反本批已沉淀纪律；②6-7 岁工作记忆负荷（记两步序+触屏双点）超本款已验证交互框架；③r31 dual 先例为一次作答形态（听题两步一次作答），移植到「点选组合」需要新交互面（两段点选），演出重入矩阵（r30 教训①）全面扩面。难度目标已由维度 1+2 达成（§R9 估时脱离基线），不叠加。
- **维度 3b「按效果排序三卡」不采纳**：拖动排序=全新交互（本款全触屏单点）；「好卡间全序」不可教（类内无判据——正是 §R2 类互异律禁现的东西），排序题唯一解论证不成立。
- **「新增独立 fair 新卡（新 id 新图标新键）」不采纳**：fair 的本质=「情境相关的次优好策略」——独立新卡做不成「每题最佳匹配」（情境无关的新卡无法对 20 题分别近对）；且新增键+图标+语音三线成本，收益低于复用好池。审计原文「新增 2-3 张次优卡」的建议按「复用好池成员作次优」实现（更优解）。
- **「ch3-4 双 fair（good+fair1+fair2 三好辨析）」不采纳**：纯三好辨析的「唯一最佳」论证弱（如「学骑车摔倒：数到十 vs 说出来请爸爸扶」成人亦有分歧）→ 假难度伤唯一解锚。ch3-4 用 neutral（hide/cryonly 回避行为）作第三层=语义清晰且 SEL 有教益。

## §R13 六门禁自测数字（交付快照）

1. **build 双跑幂等**：md5 两次=`3907745a34904693b49cb2048acdaece` 一致；1162302 chars；clips 39 注入断言过；r50 结构锚 9 条新断言过（fair 20 行/GOOD_CLASS/三分流/动画/aria/hint 联动/双窗恒等式）。
2. **verify 双视口**：1280×800 + 800×1180 均 `VERIFY PASS 12/12`，pageerror=0，clips=39，ansPos {76,59,65}。
3. **_selftest.py**：SELFTEST PASS（P1 12/12；P2 真实 DOM 点击 .pick[data-i]→solo→autoSolve taps=5→存档 v1.0 levels['1-0'].stars=3 tutSeen→clips 39=cbx36+core3→pageerror 0）。
4. **_r50_pycheck.py**：60/60 位级对拍 identical；ANCHOR 20 题行级锚 baseline 一致 True；SPECTRUM 0/300（全刷新实证）；FAIR 四律 True；恒三选+档位互斥 bad=0；ansPos {106,90,104}≥75。
5. **gate_common40.py cbx CBX**：G1 verify 复跑 PASS（12/12）/G2 教学链+通关+写档 PASS（demoR='picked' stars=3）/G3 clips 全注入 PASS（n=39 miss=[]）——**3/3**。计数 39=现状真值（任务书「19」为 T46 前旧口径，manifest 已含 cbx_sc_1..20——挂账断言核时效修正，_selftest/build/verify 三处真值源均为 39）。
6. **谱投影+分布**：见 §R11（答案位双口径分布+fair 每张恰 4 次+同章互异+谱刷新实证+洗牌声明配分布断言 r39-bis 纪律①）。

## §R13.1 修复轮记录（r50-fix，2026-09-23）

审查 fatal0/major0/minor7+试玩 106 PASS/0 Blocker 后修复轮（md5 3907745a→终态见 build 输出）：

- **m-1（主线核验成立，修）**：wrong 分支 fair 卡跳过主角 deepen（`if (!isFair) deepenFriend()`）——fair 三通道一致（语音非否定 cbx_wrong 缺席+卡片 .fair 轻摆+主角不再负向垂头）；「深呼吸/喝口水不会更难受」红线视觉通道不再对冲。裁量理由：cd-fair 轻摆已承载卡级反馈，主角加深对 fair 归因为「情况更糟」与 SEL 主张冲突。
- **m-5（r47 M1 同型，先在，顺手修）**：deepenFriend() 统一封装=replayAnim+560ms 摘类——'deeper' 不再永驻压过 #friend.emo-* 待机循环；presentQuiz/wrong(!isFair)/saySceneAgain 四调用点全收编。
- **m-3**：game-main.js:153 注释「落空回退 TTS」→「落空=静默（T46 后 core speechSynthesis 已删）」。
- **m-4**：game-verify.js 四处+build.py 一处陈旧计数注释销账（19/16→39/36；「2 卡/3 卡」→恒三选；dch1 注释）。
- **m-6（先在，顺手修）**：head.html 补 .pick.pop 入场 keyframes（cd-pop .45s backwards，置于反馈动画前保证 .good/.bad/.fair 可覆盖）——b40 起入场 stagger 缺失复原。
- **m-2**：§R3/§R11 谱刷新机理改双因口径（本节上方两处已勘正）。
- **m-7**：_r50_pycheck.py 死码两处删+_r50_extract.py 死常量删+文件头加「仅改造前可跑」警示（重跑会覆盖 _r50_baseline.json——SPECTRUM 检查会大声失败，污染可检测）。
- **试玩 S1 处置**：思考占比=估算口径 28-43%（基线 ~15%，autoSolve 纯节奏 54s+思考 15-30s+重试 6-12s）；改造前产物 1908e70b 不在本机无法同口径回测——**挂账真机观察**（与家族真机项合并），非阻塞。
- 试玩 Nice 两项（flat≥3 错链 10s 节流行为在案/75s 静置救援节奏 5+2 拍符合设计）无需动作。

## §R14 待主线裁量项（显式列出）

1. **fair 专用反馈句 cbx_fair**：本批不采纳（§R4 论证）；若主线决定增键，注册后需把 wrongChainOf 的 fair 分支改 [cbx_fair]（或 [cbx_fair, cbx_sc_N]）+复算窗（est 5085 段二注册后实测复核）+verify ⑤/⑨/build 断言联动。
2. **估时实测**：§R9 预估 90-115s 属设计推算——建议主线段二后按 _play40.py 口径实测单关时长复核「思考占比」主诉是否解除。
3. **弱辨析题微调**：题 3（drinkwater vs countten）/题 14（drinkwater good）辨析方向偏弱——r51+ 试玩若暴露可单行调 fair/good（表结构支持，谱会刷新属正常）。
4. **星级通胀观察**：三选 miss 概率升——若实测 1 星占比过高，r51 调 engStars 阈值（本批不动口径）。
