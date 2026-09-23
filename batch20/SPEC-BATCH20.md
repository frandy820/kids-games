# SPEC-BATCH20 · 7-8 岁三款（时间计算 / 记忆双背 / 百科问答）契约 v1（2026-09-08）

对象：7-8 岁（一二年级：识字量 ~1500，日历/星期生活经验、顺倒背诵谱、常识问答均适龄=收尾定位）。目录 `batch20/timecalc|memduel|quiz/`。
结构照 batch1-19：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch19/cipher/_src/（题面+候选卡池+点卡排序+判错对位保留——timecalc/quiz 最像）、batch19/sudokunum/_src/（展示-作答两阶段+数卡选择——memduel 最像）、batch16/read/_src/game-main.js（主逻辑骨架通读照抄）。

## §0 共同门禁（§0.1-0.30 全承 batch15 原文，一项不满足=不收；31-33 承 batch16；34-36 承 batch17；37-39 承 batch18；40-42 承 batch19；43-45 本批新增）

1-39 条照 SPEC-BATCH19.md §0 逐条适用（单文件离线/verify=1/确定性生成/章号 1 基/语音四包装/教学看帮独/答错零惩罚/救援钟 14s/钩子拷贝/触摸 ≥64/对比度/transition 坑/家长门/Web Audio/每关 5 题/布局/轻反馈/干扰项/文案同源/文字允许/底栏守卫/救援视觉/吞输入 pop/题面 clip 化/wrong clip/数词副本/**错点防重入窗 1000ms（b16 定案禁偏离）**/晃动防重入/演示实证/教学 watch ≤16s/连击真实鼠标+title 时序+autoSolve 整关函数三纪律/映射真值/对战真值/可解真值——仅适用项）。**b19 沉淀承用：判错清空保留已评对位（重摆不从零）；行为变更类修复的 verify 断言必须写成「区分新旧行为」的强断言（弱断言对全清/保留都过=漏真 bug 实锤）。**

40. cipher 映射真值（b19，不适用款跳过）
41. gomoku4 对战真值（b19，不适用款跳过）
42. sudokunum 可解真值（b19，不适用款跳过）
43. **timecalc 日历真值**（本批新增）：星期推算=严格模 7 算术（today+plus 环回，星期日→星期一过星期六；verify 侧独立 Python 计算器对账每题 answer）；「N 天前」=减法环回；「从 A 到 B 经过几天」=右减左含端点口径明确（B−A，不含今天——SPEC 写死防歧义，题面文案须同口径）；时钟读数=SVG 指针角度与答案文本一致（时针 hour%12*30+min*0.5、分针 min*6，verify 侧独立角度计算对账）；干扰选项 ∉ {answer} 且同为合法星期名/时间格式（不出现「星期八」类非法项=对孩子注入错误常识）
44. **memduel 记忆真值**（本批新增）：倒背 answer=seq 精确逆序（verify 侧独立 reverse 对账）；**同题数字串内数字互异**（重复数字使倒背多解=题目非法）；展示期输入锁定（tapNum 拒绝且不吞题）+遮盖后才可作答（phase='show'→'recall' 转移唯一）；串长梯度 ch1 正背 3 位/ch2 正背 4-5 位/ch3 倒背 3 位/ch4 倒背 4 位；生成关位数随机 3-5（倒背上限 4——7-8 岁倒背广度 2-4，审查 M2）
45. **quiz 封闭题库真值**（本批新增）：题库=编译期封闭数据（**≥120 题**，game-data.js 内 QZ_BANK 数组）与判定分离（answer 存索引，判定=索引比较）；每题恰一正确项+干扰项 ≠ 正确项文本；verify 侧独立提取题库（正则/JSON 解析禁手抄）对账：每题 answer 指向唯一正确、四类（动物/自然/生活安全/身体健康）分布均衡、同关 5 题 sig 互异（题面+选项集）；**题库事实性自查**：每题正确项须为可辩护常识（无争议项；有争议知识不入库）；干扰项须明显错但不荒诞（同龄孩子能排除）

## §1 timecalc 时间计算（日历/星期/时钟推算；点卡选择款，不灰化）

**玩法**：每题=一个时间推算问题（题面 clip+文字），配 3-4 张答案卡（图或文字）。孩子点选。答对=celebrate+下一题；答错=零惩罚可重选（**判错不清已评对位——本题单选制无对位概念，错=卡抖动+可重点**）。
- 题型（4 章，GEN 确定性）：ch1 认时钟（SVG 时钟盘整点/半点，「现在是几点？」选时间卡）；ch2 「再过 N 天」（今天星期 X，再过 2-4 天是星期几——顺推环回）；ch3 「N 天前」+「经过几天」（逆推+区间差，两型交替）；ch4 生成关（三型混出，N 扩到 5-9）
- 星级：错次口径（答错=1 错）；救援=题面关键词 pulse（「再过」「星期」——方向级恒给）+正确卡 breathe（**答案级：miss≥2 才出**，b18 梯度定案）
- 教学：watch=演示读题→指日历/钟→选卡；帮/独；`__tcDemoR`
- 钩子：`TC = { get currentLevel, get quiz(){ kind('clock'|'plus'|'minus'|'span'), hour,minute(时钟题), today(0-6 星期日基), plus(顺推天数), from,to(区间差题星期基), answer(正确卡 idx), opts[](卡{v 文本,img}), step, miss }, tapOpt(i), autoSolve() }`
- 语音：tc_tut_watch'看！算一算时间'/tc_tut_turn'你来算一算'/tc_hint'想想过了几天'/tc_right'算对啦，真棒'/tc_wrong'再想想日历'；星期词/时间词=TTS 兜底豁免（tc_n_ 不建）

## §1-r16 难度改造（2026-09-16，AUDIT-78:83；v1 §1 上方原文保留作历史）

- **结构**：CH_LEN 5→8（8 题/关）；LEVELS_PER_CH=10；STATIC_LEVELS=40（40 静态关+flat≥40 生成关；verify 审计域=STATIC 40 全量+flat40-44 抽 5——「九型 45 关 360 题」为审计域口径非结构常量）
- **九型**（生成确定性；ch1 五分钟刻度+经过时间起步——删 v1 认读重复）：clock5 分钟刻度 5 的倍数 52 / elapse 看钟面过几分钟 36 / plus 加分钟进位 33 / minus 减分钟退位 33 / span 区间差不含出发日 22 / comp 今天星期+跨周 today∈{5,6,0} 36 / compd 跨半夜 dur 开区间 (60,120) 36 / night 跨夜时长=12−h1+h2 24 / sched 作息表三问（行长互异唯一解；dur 干扰避开全部行真值）88；生成关=5-9 天跨周；`GEN_HINTS` 按下章实算 dch-1 禁取模
- **语音**：tc_ 7 键（r16 +tc_hint2/tc_wrong2）；星期词/时间词 TTS 兜底豁免延续；estMs=345n+600 全字符口径四方同步（SPEC/build/verify/selftest）；**hint 链恒 queue 单通道+keyless 尾段（禁 play 与 say 同步连发互掐——core play/say 均 _stop 先行）**
- **DECIDE 11 型定版**：全型 voiceWin<DECIDE（最紧 compd 40 字 vw=15100<19000）；modeled 最低 **91040@flat0** 精确防回漂（=8×(9000+1500+880)）
- **存档（审查 T-F1/T-M1 修复定版，2026-09-16）**：keyOf 分母=LEVELS_PER_CH=10；启动 IIFE 两件=①**v1 键基迁移**（v1 分母=CH_LEN=5——旧档 '2-0'=旧 flat5 直映新基跳关且章语义错乱）：矛盾态 `lv[c+'-0']!==undefined && lv[(c-1)+'-5']===undefined`（c=2..4）一次性重置，赶在 KIDS.init 读档前；②**脏键守卫仅判格式非法与关号越界（lv<0||lv>9），章号上界放开（生成关章号 ≥5 合法无界）——禁整档 removeItem 吞掉生成关进度**。verify 双例必测：种档含 '5-0' 重启不重置；旧基档 {1-0..1-4,2-0} 一次性重置

## §1-r17 memduel 难度改造（2026-09-17，AUDIT-78 黄款第 7 位；§2 v1 原文保留作历史）

- **结构**：CH_LEN 5→8（8 题/关）；LEVELS_PER_CH=10（键基分母）；STATIC_LEVELS=40（40 静态关+flat≥40 生成关）；verify 审计域=STATIC 40 全量+flat40-44 抽 5
- **五型**（同引擎：展示→遮盖→拼答；同题串内值互异/倒背 answer=seq 精确逆序/干扰 ∉ answer 且互异——§0.44 延续）：**df** 数字正背 6-7 位（ch1，位数上移）/ **dr** 数字倒背 5-6 位（ch2）/ **lf** 字母正背 5-6 + **cf** 颜色正背 5-6（ch3 同章按题 seeded 随机混出；LETTERS 12 字母避 I/O，COLORS 10 色深浅全可见）/ **dx** 数字 5-6 位+延迟干扰（ch4）；干扰卡数 len=7→2 / 其余→3（数字池 1-9 的 len7 余量上限）
- **延迟复述（dx）**：展示窗（920+len×680）→遮盖→**gap 相位 3.8s**（GAP_MS=3800，兔子 gapcall 呼唤+md_gap 提示，点兔=hop 不缩短窗——负荷恒定）→recall；相位机 show|gap|recall：engCover 唯一 show 出口（delay 型→gap，其余→recall）、engGapDone 唯一 gap→recall 入口（二次拒绝）；show/gap 两期 tapNum/tapSlot 拒绝不吞题；dirTarget/rescueTarget 仅 recall 态有目标
- **正倒随机指令（dx）**：mode 按题 seeded 随机 fwd/rev；**方向遮盖后才公布**（展示期不预告——孩子检索期现算，r17 工作记忆负荷点）；recall 起点 md_dir_fwd'顺着背'/md_dir_rev'倒着背'（语音）+TIP_ANSWER（文字）双通道；md_dir 起播后 2s 内点卡不 TTS 读值（防掐断指令）
- **救援**：14s 方向级（首空位 breathe，恒给）+ miss≥2 答案级（应点卡 breathe）；**救援钟锚=recall 起点**（展示/延迟期非卡壳，startLevel 亦重置）；错链豁免窗=1000×SPEED+300 仅链起播设（契约 I）；hint 键按 mode 分流（fwd=md_hint'从第一位开始想'/rev=md_hint_rev'从最后一位开始想'——旧单键对倒背误导）
- **时长模型（r16 范式）**：estMs=s.length*345+600 四方字面同步（data/verify 独立副本/build.py assert/_selftest Python 第三源）；DECIDE_MS=df 11000/dr 13000/lf 12000/cf 10000/dx 16000；ADV_MS=2100/GAP_MS=3800/LEVEL_MIN_MS=40000；quizDurMs=showMs+(delay?GAP_MS:0)+DECIDE[kind]+ADV；指令窗验算 md_gap 7 字 vw=3715≤3800 ✓、md_dir 3 字 vw=2335≤16000 ✓；**40 静态关 modeled 最低=138760@flat24 双钉**
- **语音**：md_ 5→9（+md_dir_fwd'顺着背'/md_dir_rev'倒着背'/md_hint_rev'从最后一位开始想'/md_gap'先点一下小兔子'）；clips 注入 12 条（md_ 9+core 3）；数词/字母/颜色名=TTS 兜底豁免（md_n_ 不建延续）
- **存档**：v1 键基分母=CH_LEN=5——启动 IIFE 两件=①矛盾态 `lv[c+'-0']!==undefined && lv[(c-1)+'-5']===undefined`（c=2..4）一次性重置，赶在 KIDS.init 读档前；②脏键守卫仅判格式与关号域（lv<0||lv>9），章号上界放开（生成关 ch≥5 合法）
- **生成关**：dch=seeded 随机 1-4（SPEC 显式声明），按 dch 章规格出题（无独立位数随机通道）；GEN_HINTS 按下章实算 `GEN_HINTS[genLevel(f+1).dch-1]` 禁取模；dayEnd 预告=nextHint(lim-1)+停留 Math.max(0,lim-1)（家族 A）
- **竖屏三件套+PORT-CLS**：@media 与 body.port 类逐行等值（/*PORT-CLS*/ 标记段），build.py 逐行全等断言；mcard 竖屏 min(12vw,86px)（7 卡排不横溢）横屏 min(15vw,104px)
- **verify 独立第 4 script 块**（core/clips/游戏/verify 四块）；MD.quiz 扩 {kind,mat,delay,gapMs}（step=关内题号 0-7 语义）；断言分源：倒填循环逆序对账/structOk 按五型独立表/FALLBACKS 双写

## §2 memduel 记忆双背（正背+倒背数字串；展示-作答两阶段，点卡排序款，不灰化）〔v1 原文，r17 改造见 §1-r17〕



**玩法**：每题=两阶段。展示期：数字串逐个亮出（语音同步读）约 2-4s；遮盖期：卡片翻面，孩子点数字卡按序拼出（正背=原序，倒背=逆序）。拼满自动判定。答对=celebrate+下一题；答错=零惩罚可重拼（**判错清空错位、保留已评对位**——承 b19 cipher P1 口径）。
- 题型（4 章）：ch1 正背 3 位；ch2 正背 4-5 位；ch3 倒背 3 位（展示期文案「记住它，等下倒着说」）；ch4 倒背 4 位；flat≥20 生成关（位数随机 3-5，倒背上限 4——审查 M2）
- 展示期锁定：phase='show' 时 tapNum 拒绝（返回 false 不吞题）；遮盖即 phase='recall'；**同串数字互异**（§0.44）
- 星级：错次口径（答错=1 错）；救援=首卡 breathe（方向级恒给——「从这一位开始」）+下一张应点卡 breathe（答案级 miss≥2 才出）
- 教学：watch=演示看串→遮盖→逐位拼（正背演示）；帮/独；`__mdDemoR`
- 钩子：`MD = { get currentLevel, get quiz(){ seq[](展示原序，数字互异), mode('fwd'|'rev'), answer[](目标序=fwd 原序/rev 逆序), opts[](候选卡池含干扰), phase('show'|'recall'), showMs, step, miss }, tapNum(i), autoSolve() }`
- 语音：md_tut_watch'看！记住小数字'/md_tut_turn'你来背一背'/md_hint'从第一位开始想'/md_right'全背对啦，记性真好'/md_wrong'再想一想刚才的数'；数词=TTS 兜底（md_n_ 不建）

## §3 quiz 百科问答（封闭题库常识问答；点卡选择款，不灰化）

**玩法**：每题=一句常识问题（题面 clip+文字，选项带图卡）+3-4 选项。孩子点选。答对=celebrate+下一题；答错=零惩罚可重选（单选制同 timecalc）。
- 题型（4 章，题库四类各归一章——与 b19 sudokunum 同型定版）：ch1 动物世界（如「小兔子最爱吃什么？」胡萝卜）；ch2 自然现象（如「彩虹有几种颜色？」七种）；ch3 生活安全（如「红灯亮了要怎么做？」停一停）；ch4 身体健康；flat≥20 为生成关（四类混抽）。〔m1 勘误 2026-09-08：原文「ch4 生成关」与实现不符——四类各占一章（flats 0-19 每章 5 关），生成关=flat≥20〕
- 题库：**QZ_BANK ≥120 题**（game-data.js 编译期封闭数组：{cat, q, opts[](2-3 干扰), ans}；修复轮 64→120——试玩意见「生成关重复感」，四类各 ≥30）；GEN 确定性抽题（seeded，同 flat 同题组）〔**m2 升档勘误 2026-09-13**：家长审计定级为幼儿级常识+3 选干扰明显错+零推理，整库升档——QZ_BANK 恰 **160 题、4 选**（1 正确+3 同域干扰），章域改课标四域：ch1 动植物结构与功能（32=动 16+植 16）/ch2 天气与自然（40）/ch3 测量与单位（40）/ch4 综合因果推理（48）；升档指令原文「16+16+40+40+40=152≠160」算术冲突，取 ch1=32、ch4=48 补齐 160；新增 opts 恒 4 项+ic 恒 4 键、q.domain（bio/weather/measure/reason）、错题隔日复现 sv.quiz.wrongBank=[{id,ok}]（答错 ok=0/答对 ok+1/≥2 毕业/日起始关注入 ≤3 题、serveDay 日闸）；QZ.quiz 钩子扩 {q, opts×4, domain}〕
- 星级：错次口径（答错=1 错）；救援=题面类别关键词 pulse（方向级）+正确卡 breathe（答案级 miss≥2）
- 教学：watch=演示读题→排除→选卡；帮/独；`__qzDemoR`
- 钩子：`QZ = { get currentLevel, get quiz(){ qid, text, opts[](卡{v 文本,img}), answer(正确 idx), step, miss }, tapOpt(i), autoSolve() }`
- 语音：qz_tut_watch'看！小小百科题'/qz_tut_turn'你来答一答'/qz_hint'想一想再说'/qz_right'答对啦，知识小达人'/qz_wrong'再想一想哦'；题目文本=TTS 兜底豁免（题库不入语音 clip——动态文本）

## §4 交付与验收（承 batch15-19 流水线）

语音预合成（主会话 gen_clips.py 扩 tc_ 5+md_ 5+qz_ 5 中文系统句——15 条）→ 3 agent 并行 → 首单元门禁（gate_common19.py 模式改参+title 时序纪律）→ 独立复验（断言从 SPEC 推导；43-45 三条分源：Python 独立日历计算器+指针角度/逆序对账+题库独立提取对账）→ 全量回归 → 两级入口 → 反方审查+7.5 岁试玩 → 修复闭环 → 收官（**7-8 岁段 30/30 满段，总 40/90**）
