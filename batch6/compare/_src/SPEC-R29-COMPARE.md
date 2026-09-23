# SPEC-R29-COMPARE · 比较大小难度加深改造（r29，2026-09-21）

依据：AUDIT-67 行19 🟡 判定「实测 36/63s；**ch1『5 以内差 ≥2 一眼可辨』=4 岁级起步**，
ch3-4 数字混合合格」；行65 建议「**ch2 起全数字卡、加三数比大小、ch4『最接近 N』题型**」。
校准：b6 段标称 6-7 岁一年级上，宁难勿易——r15-r28 同口径。本文件为 compare 的 r29
难度谱定稿；与 game-core.js 旧注释/SPEC-BATCH6 §2 冲突处以本文件为准（r28 同款声明）。

## §R1 改造总纲（审计三建议全承接 + 谱定夺）

玩法框架（左右两组+中槽符号飞入/点数角标/重新数/三符号大嘴按钮/星级救援/教学 看→帮→独）
与教学链零改动；改造对象=章谱结构（值域/差域/模式表）与题型面（新增 tri 三数比大小、
near 最接近 N 两个判定面题型）。

- **维度一·ch1 起步上探（audit 判定「一眼可辨=4 岁级」）**：dch1 从「5 以内差 ≥2」
  改「**8 以内差 1-3**」+ **= 进 ch1**（每关恒 1）。8 超出直观感数范围（subitizing
  界 4-5）→ 差 2 也不能一眼判；差 1 近邻实物必须逐个点数——「一眼可辨」根因拔除。
  = 同步进 ch1 的论证：人教版一年级上「比大小」一节课同时教 >、<、= 三符号，原谱
  把 = 推迟到 ch2 是坡道简化而非课标顺序；6-7 岁主玩家（宁难勿易）ch1 即见 =。
- **维度二·ch2 全数字卡（audit 建议①原文执行）**：dch2 从「10 以内实物差 1-3」改
  「**10 以内双数字卡差 1-3**」。具体实物→数符号映射（抽象运算初期）；数字卡点卡
  跟读支架（cmp_n_1..20 已全量注册内嵌）承接点数行为，玩法框架不断崖。
  mix（实物 vs 数字卡）不删除、保留在 ch4：mix 是「具体→抽象桥梁」题型（把实物
  数出来再与抽象数比），认知负荷高于双数字卡直比，属高难题型而非倒退。
- **维度三·三数比大小 tri（audit 建议②）**：dch3 新增 tri 题型每关恒 2——三张数字卡
  并排，问「哪张卡最大/最小」，点卡判定。**窄跨度生成**（span 2-4：三数取自连续
  4-5 个数的窗口）逼精细数序两两比较（随机远距三数如 1/5/9 可凭首位秒判，窄窗
  [6,7,8] 必须逐对比）。
- **维度四·最接近 N near（audit 建议③）**：dch4 新增 near 题型每关恒 1——目标 N+
  三候选数字卡，点最接近 N 的卡。**近对压迫生成**：d1∈[2,4]、d2∈[d1+1,d1+2]
  （d1≥2 防「差 1 秒判」，d2 贴身逼真算差：12 vs 16/7 需算 4 与 5 两个差再比——
  两步心算+20 以内退位减，一年级上后期正主）。

判定面兼容（任务书要求论证，参考 r24/r25 两步范式）：tri/near 判定从「三选一符号」
变「三选一卡」，**一次判定、无中间态**——r25 M2「部分正确解锁处刷救援钟」不适用
（无部分正确态）；救援语义=通用 20s cmp_hint（"数一数，比一比"对三卡题仍贴切：
比一比）+ miss≥2 pulse 正确卡（机制同符号题）+ 题面指令语音（新题型规则说明通道，
不识字孩子靠它）。详见 §R4。

## §R2 难度谱定稿（章弧/CH_LEN=5/静态 20 关/每关 5 题全不动）

| 章 | 章名（不变） | 形态 | 值域/差域 | 特殊 | 相对 r29 前 |
| --- | --- | --- | --- | --- | --- |
| 1 | 谁多谁少 | count 全实物 | 1-8 差 1-3 | **= 每关恒 1**（eqN 2-7） | 值域 5→8、差 ≥2→1-3、= 0→1/关 |
| 2 | 差一点点 | **num 全数字卡** | 1-10 差 1-3 | = 奇 2 偶 1（eqN 2-9） | 实物→数字卡（全章） |
| 3 | 数字卡片 | num + **tri×2** | num 1-10 差 1；tri 三互异 1-10 窄跨度 2-4 | = 恒 1（符号槽内，eqN 2-10） | mix 退场；值域 1-10（差 1）——审查m1 r29 勘误：原记 1-9 失准，实现 small=ri(1,9) 数对 [small,small+1] 上界 10，verify maxN<=10 与 pycheck 同构自洽；+tri 2/关 |
| 4 | 大数挑战 | count/num/mix + **near×1** | count 4-12 差 1-4；num 6-20 差 1-4；mix 物品侧 ≤12；near N 8-17/d1 2-4/d2 d1+1..d1+2/d3 d2+1..7 | = 奇 2 偶 1（4 符号槽内选，eqN 同旧） | 三模式原样+near 1/关（占第 4 槽，第 5 槽仍随机三模式） |

- 章名零改动；**章末预告 hint 改 2 处（谱变更显式声明，r27/r28 范式）**：ch1
  「数字卡来帮忙，直接比大小」（= 已进 ch1、预告 ch2 数字卡）、ch2「三张卡片一起
  比大小」（数字卡已进 ch2、预告 ch3 tri 三数）——旧预告对新谱失准故随谱更新；
  ch3/ch4 hint 与 GEN_HINTS 零改动（对新谱仍贴切：ch3「更大的数也比一比」预告
  ch4 20 以内、ch4「新一轮比一比挑战」循环泛化）。
- 模式表：dch1 全 count；dch2 全 num（无需洗牌）；dch3=shuffled([num,num,num,tri,tri])；
  dch4=shuffled([count,num,mix,near,rand(count/num/mix)])。
- **锚点（结构性，非题值）**：flat0 首题恒 dch1 符号题（教学链 看→帮→独 原样：教学
  演示逐个点数双侧实物→选符号——tri/near 永不入 dch1，教学零改动）；CH_LEN=5、
  STATIC_LEVELS=20、种子通道、星级、存档语义全不动。题值级锚不保留（ rnd 消耗流
  全局变化，40 关 200 题全量刷新——r28 范式声明，见 §R6 对照报告）。

## §R3 新规则族生成律（确定性通道不变，verify/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)，同 flat 永远同关；genLevel 签名不变。
- **pairOf(dch, mode, rnd)** 新值域：
  - dch1：diff=ri(1,3)，small=ri(1,8-diff) → [small, small+diff]，maxN ≤8；
  - dch2：diff=ri(1,3)，small=ri(1,10-diff)（mode 恒 num）；
  - dch3：small=ri(1,9)，[small, small+1]（mode 恒 num）；
  - dch4：count=ri(1,4)/small=ri(4,12-diff)；num=ri(1,4)/small=ri(6,20-diff)；
    mixPairOf 原样。
- **eqNOf(dch, mode, rnd)**：dch1=ri(2,7)；dch2=ri(2,9)；dch3=ri(2,10)；
  dch4 原样（num=ri(10,20) 其余=ri(6,10)）。
- **eqSet 新律（符号槽内选）**：modes 表先定，符号槽=modes 中非 tri/near 的槽位；
  eqCnt=dch1 恒 1 / dch3 恒 1 / dch2、dch4 奇 2 偶 1；
  eqSet=shuffled(符号槽).slice(0,min(eqCnt,符号槽数))。
  （tri/near 槽不承载 = 题——新结构约束；dch2/4 eqCnt≤符号槽数恒成立
  （5/4>2），dch3 符号槽 3>1 ✓，无截断路径。）
- **triOf(rnd)**：span=ri(2,4)；lo=ri(1,10-span)；候选窗口 [lo..lo+span]（span+1 个
  连续数）；cards=shuffled(窗口).slice(0,3)（互异天然）；qtype=rnd()<0.5?'max':'min'；
  answer=cards 中 max/min 的下标（洗牌后计算）。
- **nearOf(rnd)**：N=ri(8,17)；d1=ri(2,4)；d2=ri(d1+1,d1+2)；d3=ri(d2+1,7)；
  每个候选方向：N-d≥1 且 N+d≤20 时 rnd()<0.5 随机，否则取可行侧（N∈[8,17]、d≤7
  → 至少一侧恒可行：N<d+1 ⟹ N≤7 矛盾；N>20-d ⟹ N-d≥10-d≥3≥1 ✓，无重抽路径）；
  cards=shuffled(三个 {n,d})；answer=d 最小者下标（d 互异 → 唯一）。
  d 字段不渲染不暴露（CMP.quiz 只出 n）。
- **平衡器**：只对符号题 answer 生效（gt/lt 计数跳过 tri/near），关内 |gt-lt|≤1 原样。
- **分布护栏精确值（确定性谱，SPEC 断言=推导值）**：40 关 200 题恒 tri=20（dch3
  10 关×2）、near=10（dch4 10 关×1）、符号题=170；eq=48（=dch1 10×1 + dch2 14
  + dch3 10×1 + dch4 14；每章奇 lv1/lv3 2 关×2 题+偶 lv0/2/4 3 关×1 题=7 题/章，
  dch2/4 各两章 14）；gt+lt=170-48=122，平衡器收敛实测精确值见 §R11 回填
  （SPEC 定律：gt,lt ∈ [58,64] 且 gt+lt=122——40 关每关 |差|≤1 交替收敛，
  实测值在窗口内任一点；verify 断言用窗口+和恒定，精确值 pycheck 对拍兜底）。
- 四方口径同步：game-core.js（引擎）/ game-verify.js（规则断言独立复算）/
  _selftest.py（真实页点击）/ _r29_pycheck.py（Python 全量独立实现）。

## §R4 机制与救援（lastAct 纪律核对，r24 M1+r25 M2）

- **新增 lastAct 触点一处**：uiPickPos（三卡选择主路径）在 engPickPos 返回非
  null/again 后**先刷 lastAct 再分支**——right/done（演出+语音）/wrong（晃动+灰+
  miss 计数）全路径覆盖；'again'（点已灰卡）early-return 不刷——与 uiPickSym
  'again' 同构（源码语义：again=无效重复点击，不算新行动）。
- **r25 M2（部分正确中间态）不适用论证**：tri/near 一次判定全对/全错，无"对槽保留
  错槽弹回"类中间态；三卡题答错不改变题面（灰掉错卡、正确卡待点）——解锁面=错卡
  缩小，属 wrong 路径已覆盖的 lastAct 刷新。
- **r24 M1（救援完成段 keepIdle）核对**：本款救援=单层 20s 语音（sayR cmp_hint，
  不受 flat 门），重播后 lastAct 重置=每 20s 重复直至行动；无分层救援链，无饿死面。
  三卡题救援语义："数一数，比一比"中「比一比」覆盖三卡比较行为（near 题无点数动作
  但题面指令语音+目标 N 大字承担规则重述），不新增救援键（救援低频，过度设计）。
- **新题型规则说明通道（不识字孩子）**：tri/near 题每次上屏播题面指令语音
  （sayQ=queue 拼句，不受 flat 门——与 §0.5 救援同口径）：max/min=
  [cmp_tri_ask, cmp_tri_max/min]，near=[cmp_near_ask, cmp_n_N]。频率=每关 ≤2 次，
  低频不扰。
- miss≥2 pulse 正确项（符号题 symEl / 三卡题正确 .group.tri 内 .numcard）原样；
  教学帮 5s 重演示（flat0 符号题专用，tri 不入教学）、读题按钮（hint 不节流）、
  中槽轻提示（10s 节流，三卡题无中槽天然不触发）——兜底族原样承载新谱。
- 星级口径不动：0 miss=3★/1-2=2★/更多=1★，永不 0 星。
- sayW 纠错语音（flat<3 每错必播/flat≥3 10s 节流）对三卡题错选原样生效。
- recount（重新数）按钮：三卡/双 num 题无实物角标 → engRecount had=false 无反馈
  （按钮无害，与原 num 双卡题现状一致，不改视觉）。

## §R5 引擎与钩子（向后兼容）

- 引擎新增纯函数：triOf/nearOf（生成）+ engPickPos(L,i)（三卡判定，right/done/
  wrong/again/null 语义与 engPickSym 同构）；pairOf/eqNOf 参数值域更新；genLevel
  内 modes/eqSet 生成律更新（§R3）。mulberry32/shuffled/ri 逐位原样。
- structOk(q) 扩展：tri（cards 3 互异 1-10/qtype 合法/answer=极值下标）/near
  （target 8-17/cards 3 互异 1-20/dists 互异/answer=argmin d）；符号题分支原样。
- **CMP 钩子**：currentLevel/recount/tutorial 原样；quiz getter 扩展三卡分支
  （mode/qtype/target/cards[n×3]/answer/wrong——不暴露 d）；tapItem 原样；
  pick(s) 原样（三卡题传符号→engPickSym 非法返回 null，安全）；**新增 pickPos(i)**；
  autoSolve 按 mode 分派（符号 pick/三卡 pickPos），guard 40 不变。
- 渲染层：#duel 按题形态重建（符号题=左组+中槽+右组原结构/三卡题=三个 .group.tri）；
  g-left/g-right/slot/slot-sem 引用从常量改为动态获取（innerHTML 重建后旧引用失效）；
  面板/槽/三卡事件**委托到 #duel**（重建不丢监听）；底部符号区在三卡题置灰禁用
  （.off，布局不跳）。CSS 增量：.group.tri/.numcard.right|wrong|pulse/#symbols.off/
  near 目标数 .tgt 徽章（head.html）。

## §R6 基线证据（双证据 + 谱变更显式声明，r27/r28 范式；工具随款归档本目录）

- **证据①（前后产物对照）**：改造前 index.html（md5 277fcc90dd4fc93a2730a75ef6857e0a，
  536651 chars）提取 40 关 quizzes JSON=r29-baseline.json；改造后=r29-post.json
  （提取器 _r29_extract.py，归档本目录）。
  - **保留（结构性）**：flat0 首题恒 dch1 符号题可教学（教学链零改动的机检前提）；
    CH_LEN=5/200 题/确定性（同 flat 双跑一致）。
  - **变更（预期全量）**：40 关 200 题全量刷新（dch1 值域改动从 flat0 起改变 rnd
    消耗流）；模式分布 count131/num35/mix34 → 新分布（§R11 实测）。
- **证据②（Python 独立复算）**：_r29_pycheck.py 按 §R3 生成律 Python 独立实现
  genLevel（mulberry32/shuffled r28 同源副本），与页内提取 40 关全量对拍
  **PYCHECK 40/40 levels identical**（分布精确值同拍）。
- **证据③（verify 规则断言）**：40 关逐关新谱合规（§R8 ①）+ 分布精确值断言 +
  tri/near 结构断言（structOk 扩展，独立复算不复用生成函数）。
- **证据④（真实页真实点击）**：_selftest 2c/2d/2e（r23 P2-1 红线：新形态不止
  verify 提速页）。

## §R7 存档与兼容

无档结构变化：档键 kidsgame_compare、levels 'ch-lv'、CH_LEN=5、STATIC_LEVELS=20、
日历语义、sv.cmp.tutSeen 全不动；无新增落档字段（tri/near/qtype 为运行态）。
旧档已通关关卡的星级记录与新代码无矛盾态——新谱下重玩旧关题面刷新但星级/通关
语义不变（r20-r28 同款声明）。主线 verify_one_compare.py 逐腿核对零适配：
①verify title ✓ ②flat0 通关（dch1 恒符号题，q.answer 点符号）✓ ⑧教学吞输入
（flat0 实物）✓ (11) flat1 点数（ch1 实物）✓ ③viewport .item（ch1 实物）✓
⑨clips（cmp_tut_watch/turn/hint 不动）✓ ⑩flat1 零惩罚（符号题）✓。

## §R8 verify/_selftest/build 适配清单

- **game-verify.js**：① 规则断言改新谱（dch1 count 8 内差 1-3 =1；dch2 全 num
  10 内差 1-3 =1-2；dch3 num 差 1+tri 2（窄跨度结构断言）=1；dch4 三模式各≥1+
  near 1（N/距离结构断言）+count 边 ≤12 =1-2）+ 引擎直驱按 mode 分派
  （tri/near 走 engPickPos）；② 分布断言=tri20/near10/eq48/gt,lt∈[58,64]/
  gt+lt=122/关内符号平衡；③ 点数单元原样（flat0）；④ 冒烟 B flat15 改
  （count/num/mix/near 各≥1+autoSolve 三卡分派）+ **新增冒烟 C flat10**
  （tri 真实上屏+三卡错选零惩罚首错不 pulse+pickPos 通路通关）；⑤ 布局腿加
  **三卡形态**（flat10 推进至首个 tri 题×双视口：.group.tri×3、卡 ≥64、不重叠、
  符号区 off、overflowX≤0）。总单元 45→**46**（40 关+dist+tapItem+冒烟 A/B/C+布局）。
- **_selftest.py**：补 MUTE 静音双保险（r19 红线，r28 function 版照抄）+种档
  settings sound:false/tts:false/vol:0；2c flat15 改（near 出现+通关）；**新增 2d**
  （flat5 ch2 全数字卡：5 题全 num+点卡读数角标+真实通关推进 flat6）与 **2e**
  （flat10 ch3 tri：三卡错选零惩罚+真实通关推进 flat11）；viewport 腿加三卡形态
  断言。play_level 支持 tri/near 真实点击。**实测 N/N PASS**（§R11 回填）。
- **build.py**：新增硬性检查 4（r29 结构锚）：引擎 triOf/nearOf/engPickPos、
  data CHIP_TRI/cmp_tri_ask/cmp_near_ask、主线 renderTriQuiz/uiPickPos/pickPos、
  verify 'tri'/'near'/triCnt 断言在场。
- **主线侧（声明不实施）**：①voice/gen_clips.py compare 段注册 5 新键+实长回填
  （§R10）；②verify_one_compare.py 零适配（§R7）；③gate 若按 verify 单元数对账
  需 45→46。

## §R9 时序参数实测口径（r23 P2-1 红线：逐调用点对照实现核）

| 参数 | 值 | 调用点 | 口径 |
| --- | --- | --- | --- |
| 符号飞入 | 470ms×SPEED | flySymbol setTimeout | 原样 |
| 答对停留窗 | 980ms×SPEED | uiPickSym right/done await | 原样 |
| **三卡答对停留窗** | 980ms×SPEED | uiPickPos right/done await | 新增，与符号题同值（演出同构） |
| 答错晃动窗 | 520ms×SPEED | uiPickSym wrong await | 原样 |
| **三卡答错晃动窗** | 520ms×SPEED | uiPickPos wrong await | 新增，同值 |
| 教学演示节奏 | 700/860/320/460/400/900/280ms | tutorialWatch 各段 await | 原样（flat0 符号题，教学不遇三卡） |
| 教学 help 指向 | 600ms setTimeout | tutorialWatch 尾 | 原样 |
| ghost 按压 | 800ms setTimeout | pointGhostAt | 原样 |
| 看护轮询 | 1000ms setInterval | 无操作看护 | 原样 |
| 救援门 | 20000ms 无操作 | 同上（sayR hint+lastAct 重置） | 原样（三卡题同门） |
| 教学 help 重演示 | 5000ms | 同上 | 原样 |
| 纠错语音节流 | 10000ms | sayW（flat≥3） | 原样（三卡错选同走 sayW） |
| 空槽提示节流 | 10000ms | slot pointerdown | 原样（三卡题无中槽不触发） |
| 章末/日末推进 | 3400ms setTimeout | winFlow | 原样 |
| queue 段间停顿 | 150ms | core voice.queue | 原样（三卡题面/反馈句） |

r29 改动面新增时序仅三卡题两处（与符号题同值同构），其余全原样。

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest）

**新增 5 键**（前缀 cmp_ 已核 manifest 零占用；cmp_ 现有 28 键=8 UI/语义+cmp_n_1..20）：

| key | 文案（clip 合成文本） | 用途（queue 拼句） |
| --- | --- | --- |
| cmp_tri_ask | 哪张卡片 | tri 题面：[cmp_tri_ask, cmp_tri_max/min] |
| cmp_tri_max | 最大 | tri max 题面+答对：[cmp_n_X, cmp_tri_max]="X 最大" |
| cmp_tri_min | 最小 | tri min 题面+答对 |
| cmp_near_ask | 哪个数最接近 | near 题面：[cmp_near_ask, cmp_n_N] |
| cmp_near_ok | 最接近 | near 答对：[cmp_n_X, cmp_near_ok, cmp_n_N]="X 最接近 N" |

- 拼句段键复用已注册 cmp_n_1..20（数字段全量有 clip）。
- UI 既有键零改动（cmp_tut_watch/turn/hint/rec/wrong/sem_gt/lt/eq）。
- **注册前过渡态（T46 阶段3 后无系统 TTS 兜底——core speak()=静默+console.warn）**：
  queue 首段缺 clip → 整句静默；答对句首段 cmp_n 有 → 播数字段后中断（半句）。
  视觉演出（圈选/绿卡/推进）注册前后完整不受影响；仅语音反馈静默。主线注册后
  自动换真 clip（gen_clips 一次收口）。
- gen_clips 注册建议格式（T46 行，沿 cmp_sem_* 先例）：
  `T46('cmp_tri_ask', '哪张卡片', 'compare')` 等五行。

## §R11 验收数字（Executor 自测三门禁，2026-09-21 实测）

①build 连跑两次 md5 一致：`7829093f5044dbd6077298a503b480f3`（555896 chars；
  改造前基线 277fcc90dd4fc93a2730a75ef6857e0a 536651 chars 双跑同绿）
②VERIFY 双视口（1280×800+800×1180）**46/46 PASS** layoutOk 0 pageerror
  （含三卡布局腿 flat10-tri/flat15-near × 双视口）
③_selftest **58/58 PASS**（MUTE 双保险+2a/2b/2c+2d/2e 真实通关+0 pageerror+完全离线）
附：pycheck **40/40 levels identical**（Python 独立复算与页内实跑逐题一致）；
谱对照分布 baseline{gt74,lt84,eq42,count131,num35,mix34} →
  post{**gt62,lt60,eq48**,**count63,num93,mix14**,**tri20,near10**}（200 题）；
gt/lt 精确值=**62/60**（窗口 [58,64] 内，pycheck 双侧对拍一致）。
真页取证：_shots/r29-tri-field.png（tri 三卡）/r29-near-field.png（near 目标徽章）
  ——VLM 视觉复核无重叠/截断/溢出，符号区置灰正确。

## §R12 风险与未验证项（如实）

- **儿童时长为推断非实测**：机器 autoSolve 时长被 980ms 演出窗主导、对难度不敏感
  （r28 同口径诚实声明）；难度提升的真实度量=ch1 消灭 subitizing 秒判+ch2 抽象化+
  tri 窄跨度两两比较+near 两步差计算。儿童实际估 ch1 40-70s、ch4 70-130s（推断值），
  真机回归复盘观察项：ch2 全数字卡后的 miss 分布、tri 题是否引发乱试策略、near 题
  20s 救援触发率。
- 5 新键注册前 tri/near 题面语音静默、答对句半截（过渡态，§R10）；主线注册后消失。
- 三卡题在中槽位置无第三个 .group 的替代：#duel 重建后 aria/语义结构变化（三卡
  aria-label="第 N 张卡"）——读屏语义保留，布局回归靠 verify ⑤ 三卡腿+selftest
  viewport 腿双保险。
- dch2 全数字卡后「重新数」按钮在 ch2-4 部分题型无反馈（num/tri/near 无实物角标，
  had=false 静默）——与原 num 双卡现状一致，未改视觉（低风险，真机观察项）。
- verify_one_compare.py（主线腿）未由本 agent 复跑（逐腿核对兼容，§R7）；
  审查/试玩/主线独立复验均待派（agent 不自验铁律）。
