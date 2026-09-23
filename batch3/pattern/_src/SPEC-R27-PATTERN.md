# SPEC-R27-PATTERN · 规律侦探难度加深改造（r27，2026-09-21）

依据：AUDIT-67 行17 🟡 判定「估 20-40s，**ch1-2 AB/ABB 单维=4-5 岁概念低 ≥2 岁
秒答**，ch3 双维/ch4 数量规律才够段」；行63 建议「**ch1 起步即 ABC/双维、ch4
双变量复合（形状+数量同步变）**」。校准：b3 段标称 6-7 岁（一年级上），宁难勿易
——r15-r26 同口径。本文件为 pattern 的 r27 难度谱定稿；与 README 冲突处以本文件为准。

## §R1 改造总纲（三维度）

本款与前几轮范式不同：**无 dch 概念，难度全在 ch1-4 题型谱本身**——改造对象=
谱结构（STATIC_SPECS 静态 20 关 + CH_TPL 生成关池），玩法框架（序列+问号卡+三选
盘+翻卡回放+星级救援）与教学链零改动。三维度：

- **维度一·低段上探（审计①「ch1 起步即 ABC/双维」）**：ch1-2 的 AB/ABB/AABB
  单维末缺全部退役（AABB_END/AB_MID 模板删除，AB_END/ABB_END 仅存于教学链+
  flat0 坡度）。ch1 正式谱=周期 ≥3 的单元（ABC/ABCD/ABBC）+双维入门；ch2=中间
  缺失（双侧推断：须同时看缺失位左右）+复杂单元（ABCD/ABBC 周期 4、内部重复）。
  **教学-正式坡度衔接论证**：教学链（看→帮→独）的归纳教学依赖最简 AB（孩子
  在演示里学会「找重复单元」这一元操作），flat0 首题保留 AB_END 作为教学载体与
  逐字节锚，flat0 第 2/3 题立即上探 ABB→ABC（单元从 2 拉到 3），flat1 起进入
  正式谱（周期 ≥3/双维/中缺）——AB 不会出现在任何「未经教学的新题面」里。
- **维度二·双轴独立周期 dualP（新规则族，ch3 章末+生成关）**：形状轴周期 2 ×
  颜色轴周期 3，合成周期 6——孩子无法按 2 长单元整块复读（原 dual 两轴同为
  周期 2=单元 [X,Y] 复读，找到单元即秒杀），必须把形状和颜色拆成两条独立规律
  分别归纳。序列 6 卡=恰一个合成周期。
- **维度三·双变量复合 compound（审计②「ch4 形状+数量同步变」，ch4+生成关）**：
  形状轴交替（周期 2）×数量轴等差（step 1/2）×颜色恒定，缺失项须同时满足
  双轴；干扰项=**两个「半对」错项**（d1 形状错·数量对 / d2 形状对·数量近错，
  见 §R3）——每个错项恰在一根轴上违律，逼双向校验。
- 第三维度补充（干扰强度/序列长度/多缺失，Executor 定夺）：序列长度上探
  5-6 卡→**8 卡**（ABCD/ABBC 两整周期）；干扰强度维持原真干扰设计（共享形状
  或颜色优先）并为 compound 新设半对干扰；**多缺失不启用**——论证：本款为
  单步点选范式（engPick 单判定点，救援=同题连错 2 次幽灵手指常驻），引入多
  缺失须改判定管线与救援语义（r24 half 相位范式的全套 lastAct 纪律成本），
  而难度收益已被周期 4 中缺+双轴+复合覆盖，按「可救援兜底优先」放弃，r28+
  如需可按 r24 countdual 先例补。

## §R2 难度谱定稿（章弧/CH_LEN=5/静态 20 关/每关题数 3-4-4-5 全不动）

| 章 | 章名弧 | 每关题数 | 谱 | 相对 r27 前 |
| --- | --- | --- | --- | --- |
| 1 | 周期单元 ≥3+双维入门 | 3 | flat0 [AB,ABB,ABC]（首题=教学锚）→ flat1 [ABC,ABC_MID,ABC] → flat2-4 ABC/ABCD/ABBC+DUAL/DUAL_MID 交错 | AB/ABB 全退（仅 flat0 坡度） |
| 2 | 中间缺失+复杂单元 | 4 | flat5-9：ABC_MID/ABCD_MID/ABBC_MID/ABBC_END/DUAL(_MID) 交错，每关含 ≥2 中缺位（flat9 尾题 ABC_END 为章末收官单维回扣，字面表真值） | AABB/AB_MID 退役 |
| 3 | 双维度 | 4 | flat10-13 **原样保留**；flat14 [DUAL_END,DUALP_END,DUAL_MID,DUALP_END] 章末上探 | +dualP（章末 2 题） |
| 4 | 数量+复合 | 5 | flat15-16 **原样保留**（纯 CNT）；flat17-19 CNT+CMP 交错（每关 ≥2 复合题） | +compound |

- 静态 20 关谱=STATIC_SPECS 字面表（game-core.js 与 game-main.js verify SPEC
  副本双录，改一处不同步即 verify 红）。
- 生成关 CH_TPL 四主题池（章号 (ch-1)%4 循环）：进阶周期+双维 [ABC,ABBC,ABCD,
  ABC_MID,DUAL_END] / 中间缺失 [ABCD_MID,ABBC_MID,DUAL_END,ABC_MID,DUAL_MID] /
  双维度 [DUAL_END,DUAL_MID,DUALP_END,DUALP_MID] / 数量+复合 [CNT×4,CMP×3]；
  CH_QUIZN=[3,4,4,5]。AB_END/ABB_END 均不入生成池（审查M1 r27 修：原 theme0 池
  第 5 位 ABB_END 回混低段与 §R1 矛盾，已换 DUAL_END 合审计原判；verify 零低段
  断言同步扩 flat1-39 全域）。
- **谱变更清单（改造前后 40 关 quizzes JSON 对照，§R6 证据）**：
  - 保留（逐字节一致）：flat10/11/12/13（ch3 前四关）、flat15/16（ch4 前两关）
    =**静态 6 关**；另 flat0 首题逐字节一致（教学链演示题）。
  - 上探（内容变更）：flat0(2/3 题)/flat1-9（ch1-2 全部 10 关半）/flat14/
    flat17-19 =静态 14 关；生成关 flat20-39 全部 20 关（新 CH_TPL）。
- 退役模板：AABB_END / AB_MID（QUIZ_T 已删，build.py 断言不残留）。新增模板：
  ABCD_END/ABCD_MID/ABC_MID/ABBC_END/ABBC_MID/DUALP_END/DUALP_MID/CMP_END/
  CMP_MID/CMP2_END（共 10，全谱 19 模板）。
- 章末预告文案随谱更新（HINTS/GEN_HINTS，显示文本零语音键）：HINTS=
  {1 图案排队的秘密规律哦, 2 中间藏起来的图案哦, 3 颜色和形状的新规律,
  4 数量和形状一起变哦}；GEN_HINTS=[更长的图案队伍哦, 中间缺失的侦探挑战哦,
  双维度的秘密排列哦, 数量和形状一起变哦]。

## §R3 新规则族生成律（ruleAt 纯函数范式不变，四方同步）

- 种子通道不变：mulberry32(flat×7919+13)，同 flat 永远同关。
- **ruleAt 扩两族**（任意位置可程序推断=verify 独立复算依据）：
  - `dualP: {shapes:[s0,s1], colors:[c0,c1,c2]}` → `(shapes[i%2], colors[i%3], count1)`；
    材料=dualPair（池内异形异色对）+第三色（COLOR_KEYS 余 4 色 seeded 抽 1）；
    首位 (s0,c0)=池内真图案（视觉锚），其余位可为池外组合（SVG 程序合成任意
    形×色，渲染无假）。干扰项走 iconDistractors（池内、规律外、共享 answer
    形状或颜色优先）。
  - `compound: {shapes:[s0,s1], color, start, step}` → `(shapes[i%2], color,
    start+step×i)`；材料=池内 1 枚+sameColor 同色异形对（每色恰 2 形状恒非
    null）；step∈{1,2}，step1 start∈1-3（max 数量 7）、step2 start=1
    （1,3,5,7,9 恒 ≤9=数量卡上限）。**compound 干扰=半对双错项（新增
    compoundDistractors）**：d1={otherShape, color, answer.count}（形错数对）、
    d2={answer.shape, color, 最近未用量}（形对数错）——两者及 answer 三键互异
    且 d1/d2 均在 ruleOutputs 规律外（推导：数量轴等差 ⇒ 异奇偶位置的数量差
    =step×奇数≠0；d2 数量∉已用集）。
- rulePeriod：cycle=icons.length / dual=2 / **dualP=shapes×colors=6（互素 lcm）**
  / **compound=2（形状轴周期；数量轴单调不循环，此值供教学 helpPulse 高亮一个
  形状单元——flat0 教学=AB 恒周期 2，新族实际不进教学）** / count=1。
- answer=ruleAt(missingIdx) 推导律不变；seq 可见项=ruleAt(i)；三选盘
  items=[answer,d0,d1]；engPick/engWon/engStars 单步判定管线零改动。
- **图标预算铁律（本轮实锚的新不变量）**：材料袋 12 枚、整级借出（cycle 实借数
  =max(pat)+1=**pat 去重数**——pat 是池位索引连续从 0 起，[0,1,1] 去重 {0,1} 恰
  max+1=2。试玩P3-4 r27 勘误：审查M2 首判与主线首轮修复均误算 max([0,1,1])=2
  （实为 1→实借 2），COST 曾误改 3 已回精确口径 2——从严方向无假绿面，两值全
  旋转窗均 ≤12 实证）且 refill 不扩容 ⇒ 每关
  cycle(max(pat)+1)/dual(2)/dualP(2)/count(1)/compound(2)
  图标需求的**任意前缀和 ≤12**，超限=take 返短→icons[p] undefined 崩（本轮
  首版 ch2 谱 14>12 实崩过，已按预算重排）。verify 谱对账单元按 COST 表对
  静态 20 关逐关+生成池全旋转窗口枚举同检——改谱不核预算即红。
- 四方口径同步：game-core.js / game-main.js（verify SPEC 副本+轴校验）/
  _r27_pycheck.py（Python 独立复算 40 关全一致）/ build.py（结构锚）。

## §R4 机制与救援（lastAct 纪律核对，r24 M1+r25 M2）

- 全单步题：pick() 入口即刷 lastAct（既有代码）；wrongFlow/correctFlow 无
  中间态、无 half、无「对但未完成」——**本轮零新增 lastAct 触点，无饿死面**。
- 救援链原样全量承载新题型（无需改）：同题连错 2 次→幽灵手指指向正确项并
  **常驻至答对**（correctFlow 收指）；错选零惩罚（灰掉可重点+正确项高亮
  1.2s）；20s 无操作轻声提示；教学 5s 重演示。中缺/双轴/复合题同款救援
  兜底——「宁难勿易但可救援」成立。
- 星级口径不动：全对 3★/总重试 ≤3=2★/否则 1★，永不 0 星。
- autoSolve taps=每关题数（3/4/5），guard 80 不变。

## §R5 引擎与钩子（向后兼容）

- buildQuiz 返回值增 `tk` 字段（模板名，verify 谱对账与 _selftest 锚）；
  其余签名/消耗语义不变（preserved 关 rnd 链逐位一致=§R6 证据①的根因）。
- PAT 钩子：quiz() 增 kind/tk/len（快照）；新增 `start(flat)`（_selftest 新
  形态腿直达，INS.start 同款先例）；currentLevel/pick/autoSolve/tutorial 原样。
- 主逻辑：renderQuiz/layoutSeq 原样（8 卡实测 1280×800=132px、800×1180=83px
  卡，均 >64 下限）；correctFlow/wrongFlow/tutorialWatch/winFlow/proceed/
  startLevel/无操作看护零改动；仅 HINTS/GEN_HINTS 文案与头注释更新。

## §R6 基线证据（双证据，改造范围显式声明）

- **证据①（前后产物对照）**：改造前已采集 flats 0-39 全量 makeLevel quizzes
  JSON 基线（F:/claudecode/test/_r27_pattern_baseline.json，提取器
  _r27_pattern_extract.py）；改造后同通道提取（_r27_pattern_post.json）逐关
  比对：**flats 10-13/15-16 六关逐字节相等（保留声明为真）**；flat0 首题逐
  字节相等（教学链演示题锚）；其余 14 静态关+20 生成关变更=清单见 §R2。
- **证据②（Python 独立复算）**：_r27_pycheck.py 按 §R3 生成律在 Python 独立
  实现（mulberry32/shuffled/材料袋/五族组题/干扰项），与页内 JS 40 关全量
  比对 **40/40 identical**——新规则族推导律双侧（JS verify+Python）独立验证。
- **判别力红测（5 型页内篡改，全部变红，F:/claudecode/test/_r27_redtest.py）**：
  ①模板几何 ABCD 8→6=spec27 红 ②保留关 flat10 谱动=spec27 红 ③图标预算
  16>12=runVerify 崩溃（pageerror 路径红）④生成池丢 dualP=spec27+newKinds 红
  ⑤低段 AB 混回 flat1=spec27+newKinds 红。
  **r27② 扩型（审查 m3 收口，2026-09-23，5→8 型 + 绿腿，11/11）**：⑥compound
  半对 d1→真对（=answer）=newKinds 红+复合关 uniq/distinct/out 红（pass 36/45）
  ⑦compound 半对 d1→双轴全错（仍规律外互异）=**仅 newKinds 红（pass 44/45）**
  ⑧dualP 色轴退化回周期 2（colors 3→2 退化谱注入，seq/answer/items 同步重生成）
  =**仅 newKinds 红（pass 44/45）**；⑦⑧的 pass=44 自证红仅来自被违约性质的
  归属单元非连带破坏。绿腿双向：G0 整页 45/45 + 正常谱 compound 两半对轴在場/
  dualP colors=3·周期 6·6 项互异直查。同内容随款归档 _src/_r27_redtest.py
  （r28+ 谱证据随款归档惯例）。
- 教学链零改动：tutorialWatch/helpPulse/重发同关逻辑逐字节原样（flat0 首题
  AB_END 逐字节锚，见证据①）；head.html/body.html 零改动。

## §R7 存档与兼容

无档结构变化：档键 kidsgame_pattern、levels 'ch-lv'、CH_LEN=5、日历语义、
sv.pat.tutSeen 全不动；无新增落档字段（quiz.tk 为运行态，不落档）。谱变更只
影响未玩关的生成内容（难度改造目的本身）；已通关记录与新代码无矛盾态
（r20-r26 同款声明）。

## §R8 verify/_selftest/build 适配清单

- **game-main.js runVerify**：40 关主循环增 compound 三轴校验+dual/dualP 泛化
  轴校验（按 shapes.length/colors.length 取模）+每题几何与 QUIZ_T 对账；新
  单元 spec27（SPEC 字面副本 vs 引擎谱/模板/保留基线六关/图标预算/生成池
  窗口）与 newKinds（dualP 在场+合成周期 6 互异 / compound 在场+半对干扰轴
  性质+数量 1-9 / 正式谱 flat1-9 零低段模板 / _MID 非末位 / 最长序列=8）。
  总单元数 43→**45**（40 关+stars+wrongPick+autoSolveUI+spec27+newKinds）。
- **_selftest.py**：补 MUTE 静音双保险（r19 红线——原版缺：每 context 挂
  任务书原文 MUTE_INIT init_script+种档 sound:false/tts:false/vol:0）；新增
  2d flat14（dualP）与 2e flat17（compound）真实点击通关+写档断言（r23 P2-1
  教训：新形态须真实页实测不止 verify 提速页）；flat0 quiz0 tk=AB_END 锚断言。
  **34/34 PASS**。
- **build.py**：新增硬性检查 4——r27 结构锚（引擎含 dualP/compound 分支与新
  模板、退役模板不残留、verify 含 SPEC_T27_STATIC/units.spec27/units.newKinds、
  data 含 COLOR_KEYS）。
- 主线侧（声明不实施）：verify_batch3.py 如有 pattern 腿按新谱适配；gate_common
  口径如按 verify 单元数对账需 43→45。

## §R9 时序参数实测口径（r23 P2-1 红线）

| 参数 | 值 | 口径 |
| --- | --- | --- |
| 翻卡窗 | 600ms（VD 0.22 提速） | 原样（correctFlow 首段） |
| 回放窗 | len×150+600ms：5 卡 1350 / 6 卡 1500 / 7 卡 1650 / **8 卡 1800ms** | 原样公式，r27 序列上限 6→8 卡 |
| 单题答对总窗 | 公式窗 600+len×150+600（8 卡=2400；len5=1950，纯窗实测 1960 开销 10ms，E5b）；_selftest 驱动实测 flat17 ≈3000ms/题系**含点击等待的驱动口径**（与公式窗非同一测量面——试玩P3-3 r27 消歧） | 实测（双口径） |
| 错选窗 | 1280ms 锁+正确项高亮 1200ms | 原样 |
| estMs | **本款不使用**（无 clip 窗参数、无语音链窗；动画窗为上表实测口径） | n/a |
| 语音 | sayP 3 键原样（flat<3 门内）；章末/日末文案=显示文本（core 通道既有行为） | 零新键 |

## §R10 新语音键清单

**零新键**。论证：本款语音面=3 键（pat_tut_watch/pat_tut_turn/pat_hint，manifest
在册+6 clips 已注入）+题面零语音（视觉题，答对答错=音效非语音——原设计）。
r27 未新增任何语音面（新题型均为纯视觉题面；章末预告=显示文本）。已 grep
manifest 确认无需占用新键（前缀 pat_ 现有 3 键零冲突，本轮零增量）。

## §R11 验收数字（Executor 自测三门禁，2026-09-21 实测）

①build 连跑两次 md5 一致：`3561a2c20c295f862a1de77ea0e85b25`（241906 chars；
  审查 M1/M2 修复后 `10c4163157f568518ff652d142fe438b`（242132 chars）复跑同门禁
  全绿；试玩 P3-4 勘误 COST 回 2 后终基线 `b3e9a3f8b7ff7996b92a7105db61d34f`
  （242201 chars）——VERIFY 45/45 双视口 0 pageerror/_selftest 34/34/pycheck
  40/40+六关基线保留/_selftest·verify_one·voice 复跑全绿）
②VERIFY 双视口（1280×800+800×1180）**45/45 PASS** 0 pageerror
③_selftest **34/34 PASS**（含 MUTE 双保险+教学链+flat14 dualP/flat17 compound
真实通关写档）
附：pycheck 40/40；判别力红测 5/5 变红。
主线门禁（审查+试玩另派；verify_batch3/gate 如涉 pattern 腿按 §R8 适配）。

## §R12 风险与未验证项（如实）

- 单关时长为推断非实测儿童数据：自测 autoSolve flat14=12.2s/flat17=15.2s 为
  机器点击+动画耗时；儿童实际估 ch1 3 题 30-50s、ch4 5 题 50-90s（推断值，
  真机回归复盘）。
- dualP 序列含池外形色组合（如 ball+green 池内不存在）——SVG 程序合成任意
  组合渲染无假，但视觉上出现「本局材料袋没借过的组合」；干扰项仍池内（可
  排除性不变）。实情口径（审查m5 r27）：材料袋是引擎内部抽象，儿童界面上
  不可见——实际可感知面仅为「该形色组合未在本关序列其他卡片出现过」，困惑
  面小于「袋」级字面声明。真机观察孩子是否困惑，如需要可改双轴材料全取池内
  （需扩池或限形域，r28 议题）。
- 8 卡序列窄视口余量：竖屏 800px 宽实测 83px（>64 下限 19px 余量）；宽
  <520px 未测（本家族目标设备=平板 800px 起）。
- 生成关 theme1 池含 2 个 dual 系稀释 ABCD 图标成本（预算 12 逼的）——中间
  缺失主题里双维题约占 40%，谱纯度略降，难度不降（dual 对 6-7 岁仍需两轴
  归纳）；预算铁律与谱纯度的权衡已按「不崩>纯度」取。
- verify 单元数变更（43→45）若主线 gate 按旧值对账需同步（§R8 声明）。
