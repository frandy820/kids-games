# SPEC-R28-WORDS · 识字积木难度加深改造（r28，2026-09-21）

依据：AUDIT-67 行18 🟡 判定「实测 18-19s（flat0/5）单关 <20s 触线；**2 部件+1 干扰起步
过易，48 字库偏小**」；行64 建议「**干扰块 ch1 起恒 2+、字库 48→100 含 3 部件常态、
同声旁家族辨析（清/请/晴）**」。校准：b6 段标称 6-7 岁（一年级上），宁难勿易——r15-r27
同口径。本文件为 words 的 r28 难度谱定稿；与旧注释冲突处以本文件为准。

## §R1 改造总纲（三维度 + 扩量决策）

玩法框架（拼字槽：点部件飞入/点槽撤回/槽满自动判定/错槽弹回对槽保留/星级救援）与
教学链（看→帮→独）零改动；改造对象=章谱结构（CHAPTERS 干扰律 + CHARS 字库）与
干扰选取律（game-core.js pickDistractors）。

- **维度一·干扰恒 2+ 与章内上探（audit①「干扰块 ch1 起恒 2+」）**：新增有效干扰数
  公式 `nDisEff(dch,lv) = lv>=2 ? max(3,nDis) : nDis`——ch1/ch3 前两关 2 块起步
  （flat0 教学坡），第三关起上探 3 块；ch2/ch4 恒 3 块。全谱最低 2（消灭「1 干扰」
  档：改造前 ch1 全章 5 关仅 3 块题面）。块面 3→4-6。
- **维度二·声旁家族辨析（audit③「同声旁家族辨析(清/请/晴)」）**：ch2 重建为声旁
  家族章——青族 晴/清/请/情、也族 他/地/她/池、工族 江/红、马族 妈/吗（4 族 12 字，
  全 2 部件形声字）；配套**家族优先干扰律**（§R3）：题「晴」(日青) 的干扰必含
  氵/讠/忄 等 清/请/情 的形旁——拼 氵+青 会 fail 弹回，逼孩子看题面形旁辨字。
  这是 6-7 岁形声字意识（一年级「识字」单元口头渗透，一年级下显式教学）的先导
  训练，视觉辨析本身适龄，且 20s 救援重读+读字按钮+miss≥2 pulse 三层兜底（宁难
  勿易但可救援成立）。
- **维度三·3 部件常态（audit②「含 3 部件常态」）**：ch3 全 3 部件原样保留（lv2 起
  3+3=6 块最大面）；ch4 混合池并入 3 部件 谢/梦（flat17 序列 花/谢/梦/奶/河 含两
  3 部件字）。改造后全谱 40 关中 3 部件题 54/200（ch3 50 + ch4 4——谢/梦 各 2 关 flat17/36；审查m1 r28 勘误：原记 55/「ch4 5」系汇总算术笔误，复算 r28-post.json 三遍+逐关对照实为 4），生成关循环节奏
  与静态一致。
- **字库扩量决策（48→55，+7 新字/7 新语音键）**：审计原文「48→100」的实质诉求=
  难度（干扰/部件/辨析）+ 内容新鲜度。难度三维度已由上三项完整承接（每项都直接
  加深单关认知负荷，正是「单关 <20s 触线」的对症）；内容面取**声旁家族定向扩容**
  而非翻倍扩容：+7 字全部服务于家族辨析（清请情她池红吗），无孤立加字；若扩到
  100 字=+52 新 clip 键（史上最大注册面），单字可靠拆法+组词文案的审校面扩大 7 倍，
  而单关难度边际收益递减（干扰律才是主矛盾）。7 键注册面主线下 gen_clips 一次可收。
  48 旧字全部保留零删（无孤儿 clip、无档冲突）。

## §R2 难度谱定稿（章弧/CH_LEN=5/静态 20 关/每关 5 题全不动）

| 章 | 章名（不变） | 池 | 部件 | 干扰 nDisEff | 块面 | 相对 r28 前 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 拼一拼 | 12 字（原样） | 2 | lv0-1=2，lv2-4=3 | 4→5 | 池/题字序列不变；干扰 1→2/3 |
| 2 | 找不同 | 12 字（**重建：声旁家族** 晴清请情/他地她池/江红/妈吗） | 2 | 恒 3 | 5 | 池重建（5 留 7 新）；同声旁形近干扰必然在场 |
| 3 | 三块积木 | 12 字（原样） | 3 | lv0-1=2，lv2-4=3 | 5→6 | 池/题字序列不变；干扰 2→2/3 |
| 4 | 字家族 | **19 字**（原 12 + 旧 ch2 七字 奶河好打吃沙拍 并入） | 2/3 | 恒 3 | 5-6 | 池 12→19；氵/口/扌/女/艹/木 族同章干扰更密 |

- 章名与章末预告 HINTS 四条零改动（对新谱依然逐章贴切，见 game-data.js 注释）；
  GEN_HINTS 零改动。
- 池覆盖数学（题字 start=(flat×5)%pool.length 连取 5，每章 5 关 25 题次）：
  ch1-3 池 12 同旧；ch4 池 19：flat15-19 起点 18/4/9/14/0 → 五段 [18,0-3]/[4-8]/
  [9-13]/[14-18]/[0-4] 并集=0-18 全覆盖（verify chCov 断言，pools=[12,12,12,19]）。
- **锚点保留（内容级，逐字）**：flat0 首题=明(日,月)（教学链演示题）；flat13 首题=
  树(木,又,寸)（乱序 fail 单元锚）；ch1/ch3 全部 20 静态+生成关题字序列逐字不变
  （§R6 机检 20/40）。
- 教学链零改动：tutorialWatch/pointHelpNext/重发同关逐行原样（flat0 首题明=日月
  2 部件，教学演示循环不变）。

## §R3 新规则族生成律（确定性通道不变，verify/pycheck 三方独立复算）

- 种子通道不变：mulberry32(flat×7919+13)，同 flat 永远同关；genLevel 签名/产物
  结构不变（quizzes 字段零增删）。
- **有效干扰数**：`nDisEff(dch,lv)=lv>=2?max(3,CHAPTERS[dch].nDis):CHAPTERS[dch].nDis`
  （CHAPTERS.nDis：ch1/ch3=2、ch2/ch4=3）。
- **家族定义（程序可推断）**：family(题字)=池内与它**共用至少一个部件**的其它字
  （晴→清/请/情 共用「青」；河→洋/洗/沙 共用「氵」）。familyParts=家族字的部件中
  **排除题字自身部件集后的新部件**（!seen 条件——共用字若无可贡献的新部件则 fam
  判空，例：ch1「村」(木寸) 与 林(木木) 共用木但林无新部件可贡献→村 fam 空、
  不要求家族干扰；审查m2 r28 归档：外部静态复算漏此条件会得 158≠实测 154，
  154/154 为页内实跑值非抄录误记——famQuizN 实跑复核 2026-09-21）
  **不属于本题正确部件**者（晴→氵讠忄；河→羊先少），seen 去重、保池序。
- **选取律**：fam=shuffled(familyParts)；rest=池内其余部件（排除正确部件与已取
  家族部件，去重）；干扰=fam.slice(0,n)+shuffled(rest).slice(0,n-fam.length)。
  家族非空 ⇒ 干扰必含 ≥1 家族部件（verify famOk 断言；实测 154/200 题有家族、
  154/154 命中）。ch2 静态 5 关每题家族必非空（池设计性质，famOk 同断言）。
- **反向泄题防护（任务书§4）**：干扰恒 ≠ 正确部件（structOk+famOk 双断言）；目标
  字整字在题面可见，家族干扰只构成「形旁辨析陷阱」而不构成排除答案的捷径——孩子
  无法不看题面从块面反推答案（每块都是池内真实部件，任意组合需对照题面判定）。
- **块预算不变量（新）**：tiles ≤6（3 部件+3 干扰上限）——竖屏 800px 单行
  6×96+5×18=666px 放得下；verify ① budgetOk 断言 + ④ 布局腿 flat12 六块实测。
- 四方口径同步：game-core.js（引擎）/ game-verify.js（vNDis/vFamily 独立副本）/
  _selftest.py（FAM_JS/2e 独立副本）/ _r28_pycheck.py（Python 全量独立实现）。

## §R4 机制与救援（lastAct 纪律核对，r24 M1+r25 M2）

- **本轮零新增 lastAct 触点**：uiTapPart 在 engTapPart 返回非 false 后**先刷
  lastAct 再分支**——wrong（干扰弹回）/placed/**fail（错槽弹回=「部分正确」中间态，
  r25 M2 合规：对槽保留的解锁态救援钟已刷新）**/right/done 全路径覆盖；
  uiTapSlot 撤回成功刷 lastAct；点空槽（非主交互）按 §0.16 设计不刷（10s 节流
  轻提示，保持救援可用）。
- 救援链单层无饿死面（r24 M1 不适用）：20s 无操作=重读当前字读音组词（sayR 不受
  flat 门），重播后 lastAct 重置=每 20s 重复直至行动；无方向级/答案级分层。
- miss≥2 pulse 下一该点块/教学帮 5s 重演示/读字按钮（不节流）/题面大字 10s 节流
  重听——四层兜底原样承载新谱（干扰更多更似≠救援缺位）。
- 星级口径不动：0 miss=3★/1-2=2★/更多=1★，永不 0 星（干扰变多仅影响 miss 计数
  分布，机制同旧）。
- 纠错语音 sayWrong：fam 键触发条件 dch===4 → **dch===2||dch===4**（声旁家族章
  并入；零新键，wrd_fam 复用）；其余 flat<3 每错必播/flat≥3 10s 节流原样。节流钟
  与 fam 分支交互（试玩 P3-2 补录）：fam 分支 return 不 arm 节流钟——同关首错播
  wrd_fam 后紧随的第二错必播 wrd_wrong（源码语义、行为无害，实测确认）。

## §R5 引擎与钩子（向后兼容）

- 引擎函数签名变更仅一处：pickDistractors(dch,entry,pool,rnd)→
  pickDistractors(dch,lv,entry,pool,rnd)（内部函数，外部无调用方）；新增纯函数
  nDisEff/familyParts（无副作用）。structOk(q,dch)→structOk(q,dch,lv)（verify
  内部调用方同步）。
- genLevel 产物结构零变化；engTapPart/engTapSlot/engJudge/engStars/engWon 逐行
  原样；mulberry32/shuffled 逐位原样（pycheck 40/40 为证）。
- WRD 钩子零变化：currentLevel/quiz/tapPart/tapSlot/autoSolve/tutorial 全部
  getter/签名原样；autoSolve guard 60 不变（每关最多 5 字×3 块）。
- 渲染层零改动：renderQuiz/syncSlots/renderStep/renderDots/布局 CSS 原样
  （head.html 零 diff）；6 块题面竖屏单行放得下（§R3 块预算）。

## §R6 基线证据（双证据 + 谱变更显式声明，r27 范式；工具随款归档本目录）

- **证据①（前后产物对照）**：改造前 index.html（md5 29dd075f…，1167728 chars）
  提取 40 关 quizzes JSON=r28-baseline.json；改造后（md5 4bd5ecd5…）=r28-post.json
  （提取器 _r28_extract.py，本目录非 temp——r27 m4 教训落地）。
  - **保留（题字序列逐字不变）**：ch1/ch3 全部 flats [0-4,10-14,20-24,30-34] 共
    20/40 关（含 flat0 首题明=日月、flat13 首题树=木又寸 两锚）——pycheck 机检。
  - **变更**：40 关全部 200 题的 distractors/tiles 数组刷新（干扰律全局变更改变
    rnd 消耗流，属预期）；ch2/ch4 题字序列变更（池重建/扩容）。
- **证据②（Python 独立复算）**：_r28_pycheck.py 按 §R3 生成律在 Python 独立实现
  genLevel（mulberry32/shuffled/nDisEff/家族律/池表誊抄），与页内 JS 40 关全量
  比对 **PYCHECK 40/40 levels identical**。
- **证据③（verify famOk）**：40 关 200 题独立复算（vFamily 不复用引擎函数）：
  家族在场 154 题 154 命中，0 漏 0 误；ch2 静态 25 题家族全非空。
- **证据④（部件字形）**：53 部件（含新部件 忄 U+5FC4）canvas 像素检测：零豆腐、
  零重复字形（alpha 通道口径；忄=327 墨像素）——2026-09-06 首交付同法复跑。
- **证据⑤（谱数字）**：干扰数分布 dch1 lv0-1=2/lv2-4=3、dch2=3、dch3 lv0-1=2/
  lv2-4=3、dch4=3（200 题全量）；块面 4/5/6 三档（f0=4、f5=5、f12=6 实测）；
  3 部件题 55/200。

## §R7 存档与兼容

无档结构变化：档键 kidsgame_words、levels 'ch-lv'、CH_LEN=5、STATIC_LEVELS=20、
日历语义、sv.wrd.tutSeen 全不动；无新增落档字段（家族/干扰数为运行态）。池变更
只影响未玩关的生成内容（难度改造目的本身）；已通关记录与新代码无矛盾态——新谱下
重玩旧关内容刷新但星级/通关语义不变（r20-r27 同款声明）。

## §R8 verify/_selftest/build 适配清单

- **game-verify.js**：① 主循环 diffOk 改按 vNDis 独立复算有效干扰数+structOk 带
  lv+新增 budgetOk（tiles≤6）；④ 布局腿 flats [0,10]→[0,10,12]（4/5/6 块三档×
  双 viewport=6 sims）；⑤ chCov 池大小泛化（12→pool.length，pools 字段上报）；
  **新增⑥ famOk 单元**（§R3 三断言）。总单元 46→**47**。
- **_selftest.py**：补 MUTE 静音双保险（r19 红线，原版缺——每 context MUTE_INIT
  init_script：muted 覆写+AudioContext/speechSynthesis/Audio.play 桩+种档
  sound:false/tts:false/vol:0；任务书内嵌 MUTE 原文抄录有括号失衡语法错，已按
  同语义重构并 node --check 验证——风险节详述）；2a flat0 断言 3 块→4 块；
  2c flat13 断言 5 块→6 块；**新增 2d**（flat5 ch2 声旁家族：家族干扰在场独立
  复算+真实点家族干扰块弹回零惩罚+真实通关推进 flat6）与 **2e**（flat17 ch4
  大池：块预算 ≤6 且必现 6 块+家族律独立复算+真实通关推进 flat18）——r23 P2-1
  红线：新形态真实页真实点击不止 verify 提速页；viewport 腿断言 5→6 块。
  **47/47 PASS**。
- **build.py**：新增硬性检查 4（r28 结构锚）：CHARS 恰 55 字（regex 同 gen_clips）/
  py 55 键全唯一全 ASCII/部件全落 CJK 基本区 U+4E00-U+9FFF/新家族字与引擎函数
  （nDisEff/familyParts）与 verify famOk 在场。
- **主线侧（声明不实施）**：①voice/gen_clips.py 行 241-242 断言 `len(wrd)==48`
  →55（提取 regex 零改动自动吃到 7 新字，仅断言常数需改）；②7 新键 gen_clips
  注册+实长回填（§R10）；③verify_one_words.py 逐腿核对无需适配（全部断言泛化：
  tileTypes.indexOf('d')/槽序点击/布局阈值，无 48/12 字面）；④gate 若按 verify
  单元数对账需 46→47。

## §R9 时序参数实测口径（r23 P2-1 红线：逐调用点对照实现核，全部原样）

| 参数 | 值 | 调用点 | 口径 |
| --- | --- | --- | --- |
| 干扰弹回窗 | 420ms×SPEED | uiTapPart r='wrong' await wait | 原样 |
| 槽满 fail 晃动窗 | 520ms×SPEED | uiTapPart r='fail' await wait | 原样 |
| 拼对亮字窗 | 1900ms×SPEED | uiTapPart right/done await wait | 原样（机器口径 5 字≈9.6s/关的主导项） |
| 教学演示节奏 | 700/900/320/480/1200ms | tutorialWatch 各段 await | 原样 |
| 教学 help 指向 | 600ms setTimeout | tutorialWatch 尾 | 原样 |
| ghost 按压 | 800ms setTimeout | pointGhostAt | 原样 |
| 看护轮询 | 1000ms setInterval | 无操作看护 | 原样 |
| 救援门 | 20000ms 无操作 | 同上（重读字音+lastAct 重置） | 原样 |
| 教学 help 重演示 | 5000ms | 同上 | 原样 |
| 纠错语音节流 | 10000ms | sayW（flat≥3） | 原样 |
| 题面重听节流 | 10000ms | targetEl pointerdown | 原样 |
| 空槽提示节流 | 10000ms | uiTapSlot false 分支 | 原样 |
| 章末/日末推进 | 3400ms setTimeout | winFlow | 原样 |
| 机器通关实测 | autoSolve flat0/5/13/17 均 9.6s | 本轮实测（动画主导，对难度不敏感） | 实测（诚实声明：非儿童时长） |

r28 改动面不含任何时序参数（game-main.js 仅 2 行 diff：sayWrong dch 条件+注释）。

## §R10 新语音键清单（主线统一 gen_clips 注册，本 agent 未动 manifest）

**新增 7 键**（全部 wrd_ch_ 每字读音组词族，gen_clips 从 CHARS 表正则自动提取，
文案=game-data.js w 字段一字一致）：

| key | 字 | 文案（TTS text） | 部件 |
| --- | --- | --- | --- |
| wrd_ch_qing2 | 清 | 清，清水的清 | 氵青 |
| wrd_ch_qing3 | 请 | 请，请坐的请 | 讠青 |
| wrd_ch_qing4 | 情 | 情，心情的情 | 忄青 |
| wrd_ch_ta2 | 她 | 她，她们的她 | 女也 |
| wrd_ch_chi2 | 池 | 池，水池的池 | 氵也 |
| wrd_ch_hong | 红 | 红，红色的红 | 纟工 |
| wrd_ch_ma2 | 吗 | 吗，好吗的吗 | 口马 |

- 拼音冲突后缀沿用 河 he/荷 he2 先例（qing/qing2/qing3/qing4、ta/ta2、chi/chi2、
  ma/ma2；上屏 q.py.replace(/\d+$/,'') 去后缀）；hong 无冲突裸用。
- UI 语音键零新增（wrd_tut_watch/wrd_tut_turn/wrd_hint/wrd_wrong/wrd_fam 5 键
  复用，wrd_fam 触发面扩 ch2）。
- 注册前过渡：7 字 clip 缺失自动整句 TTS 兜底（KIDS.voice.play(key,text) 内建），
  功能零影响、音色略异；主线 gen_clips 注册+实长回填后自动换真 clip。
- 主线配套动作：gen_clips.py 行 241-242 断言 48→55（§R8）。

## §R11 验收数字（Executor 自测三门禁，2026-09-21 实测）

①build 连跑两次 md5 一致：`4bd5ecd52b2e7e086542fab9479fb92d`（1172305 chars；
  改造前基线 29dd075f b6333…（1167728 chars）双跑同绿）；主线注册 7 新键（manifest
  5091→5098）后重建**终基线 `e012caf1841415dc911a57713a1fd0e4`（1298730 chars，
  63 clips 嵌入）**——谱/引擎侧零改动仅 clips 注入变化（试玩 P3-1 收口：三方谱
  对拍 40 关一致证重建未扰动难度谱）
②VERIFY 双视口（1280×800+800×1180）**47/47 PASS** 0 pageerror（布局 6 sims：
  4/5/6 块×双视口全过；famOk 154/154；chCov pools 12/12/12/19）
③_selftest **47/47 PASS**（含 MUTE 双保险+教学链+2d 声旁家族/2e ch4 大池真实
  通关写档推进+0 pageerror+完全离线）
附：pycheck 40/40 identical；谱对照 题字序列保留 20/40（ch1/ch3 全部，含两锚）；
部件字形 53/53 零豆腐零重复；机器 autoSolve 9.6s/关（动画主导口径）。
主线门禁（审查+试玩另派；gen_clips 7 键注册；gate 单元数 46→47 对账）。

## §R12 风险与未验证项（如实）

- **儿童时长为推断非实测**：机器 autoSolve 9.6s/关被 1900ms×5 演出窗主导、对
  难度不敏感；难度提升的真实度量=块面 3→4-6+家族形近干扰（scan 负荷+辨析步）。
  儿童实际估 ch1 40-70s、ch3/ch4 60-120s（推断值），真机回归复盘（与 r23-r27
  P3 观察项合并：ch2 声旁章 miss 分布/家族干扰是否引发策略性乱试）。
- **任务书 MUTE 原文缺陷**：任务书内嵌 MUTE_INIT 原文（含 shorthand 方法+深嵌套
  对象）经 node --check 为语法错（ Unexpected token ':'，createGain 段括号失衡
  ——抄录传输层面损坏），首轮自测 0-pageerror 腿全红即由它触发；已按同语义重构
  （function 表达式版）并 node --check+全量自测 47/47 验证。主线后续任务书若再
  内嵌该段建议换本轮 _selftest.py MUTE_INIT 定稿。
- 7 新字 clip 未注册前 TTS 兜底音色与真 clip 略异（过渡态，主线注册后消失）；
  gen_clips 断言若忘改 48→55 会响亮崩溃（fail-safe 方向，不会静默错）。
- 池/章不对称（12/12/12/19）：ch4 生成关内容更丰富（19 字池），四族章弧语义不
  对称为有意设计（复习章更大），非缺陷。
- 她 ta2/池 chi2 与 他 ta/吃 chi 同音同屏拼音（上屏去调后同名）：沿用 河/荷 先例；
  一年级上不教调号，风险低，真机观察项。
- verify_one_words.py（主线腿）未由本 agent 复跑（逐腿核对断言泛化兼容，§R8）；
  审查/试玩/主线独立复验均待派（agent 不自验铁律）。
