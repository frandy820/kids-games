# SPEC-BATCH12 · 7-8 岁三款（除法分糖 / 分数披萨 / 竖式小黑板）契约 v1（2026-09-07）

对象：7-8 岁（一二年级：20 以内加减熟练、乘法口诀在学/已学、除法分数启蒙、能读简单题目文字）。目录 `batch12/divide|fraction|column/`。
结构照 batch1-11：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch4/times/_src/（数字词 queue 拼接+口诀章+辅助面板 aidAuto）、batch4/clock/_src/（拖拨交互+多章爬坡）、batch3/math/_src/（点选答题+干扰设计+verify 全量审计）、batch6/subbug/_src/（放飞动画+点数角标）、batch10/simon/_src/（键盘/序列输入款+watch 两态）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-22 全承 batch11 原文 + 23 新增）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/**say**）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关（难度章随机 `flat<STATIC ? diffOfCh : ri(rnd,1,4)`，batch11 M1 定版）
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环；nextHint 参数=flat；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 lim
5. **语音四包装**：`sayP`（仅 flat<3 播）+ `sayR`（救援/开场/读题/教学，不受 flat 门）+ `sayW` 纠错轻语音（flat<3 每错必播 / flat≥3 走 10s 节流 + 豁免恰一次——灰化款传 `q._miss >= 2`；不灰化款必须 `=== 2`；**四选一及以上候选的灰化款也必须 `=== 2`**（错卡数=候选-1 可达 3，batch11 shadow 实证））+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen）；看=演示（locked 吞输入，demo 参数豁免）→帮=幽灵手指→独=首次答对放手；教学交接走顺序链（quiet=true + queue([turn, 题面]) 或 qTimer ≥1.8s 接力，禁双通道叠音）
7. **答错零惩罚**：晃动（灰化款=灰掉可重点、pointer-events:none；不灰化款=不灰可重点）；首错不 pulse 正确项（miss≥2 才高亮）；引擎 'again' 早退防御层
7a. **救援钟只被正确推进重置**：错点/空白/探索点击不更新 lastAct；idle 阈值 14s
8. **钩子 getter 返回拷贝非活引用**；禁死字段（字段必须可观测真值）
9. **触摸目标 ≥64px**；主答案按钮 ≥96px；双 viewport（1280×800 + 800×1180）overflowX=0；`.k-parentbtn` 豁免
10. **对比度 WCAG**：正文文字 ≥3:1
11. **CSS transition 坑**：量测等 transition 结束或用纯数学
12. **core 家长门**：弹层类=.k-panel；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（缺 clip 整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0
15. **布局病害**：文字过早断行/SVG 图内重叠；结构化内容优先 HTML grid/flex
16. **第一反应高发的非主交互输入须有轻反馈**（10s 节流 sayR）；教学/演出期点兔子=pop+hop 轻反馈不静默（batch11 试玩 P2① 定版）
17. **选项干扰项**：与答案相近（同相似组/错一属性/相邻序），互异；数值款禁 0 禁负
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取（零手抄）；clip key 全 ASCII
19. **7-8 岁文字允许**：题面可出文字（一二年级识字量），但**核心指令仍须语音承载**（不依赖阅读能力）；关键数字/答案选项用大字
20. **底栏按钮守卫**：replayBtn/rabbitBtn/hearBtn 补 `locked||demo||won` 门；主答路径 `const run=cur`+await 后 `if (cur!==run) return` 身份守卫
21. **救援视觉重现**：静置 14s 救援=重读题面 qSpeech + **答案视觉线索**——高亮类（breathe）持续循环在屏或 pulse 类改三连脉冲（0/520/1040ms 错峰），静音环境屏幕可感知；语音-only 救援不收
22. **吞输入期轻反馈**：watch/演出期真实点击被吞时给轻反馈（sfx('pop') 轻叮+等效视觉），返回值/状态不变
23. **题面句语音 clip 化**（batch11 真机反馈 2026-09-07 定版）：封闭库题面全组合建 clip（晓晓音色）；开放式数字题面走 queue 拼接 clip（times 的 tim_n_* 模式：数词 clip+短语 clip 拼句）；系统 TTS 仅留缺 clip 兜底，正常游玩不触达浏览器系统合成音**；答错纠错句（sayW wrong 文案）同为正常游玩高频路径，一律建 clip（审查 m5 定版）——wrong 也不允许 key:null 系统TTS**

## §1 divide 除法分糖（平均分→除法；点数发放款，不灰化）

**玩法**：题面=一堆糖（N 颗，6-12）+ M 个盘子（2-4，小动物盘子）。孩子**逐颗点糖**，每点一颗自动飞到"当前轮到的盘子"（轮流发放机制天然均匀=防错设计）；分完（糖发空或剩不足一轮）进入答问：**"每个盘子有几颗？"点数字答案**（3 选 1 大数字卡）。有余数关剩糖留在桌上（视觉呈现"余下的"）。

- 数值域（game-data.js GEN 规则）：ch1 无余数小量（6/8/10 ÷ 2/3/4 里整除）；ch2 无余数大量（9-12÷3/4，含 12÷4=3）；ch3 **有余数**（7÷2、11÷3、10÷4——余 1-2，剩糖留桌上+语音"剩下 X 颗不够分啦"）；ch4 除法算式直给（黑板上 12÷4=？，仍配糖堆可点分验证）；生成关随机章参数
- 每关首题热身：ch3/4 首题=无余数（余数概念首现前给已学样本）
- 交互：点糖→飞盘动画（~0.5s）+盘子角标 +1；轮到的盘子高亮呼吸（孩子知道下一颗去哪）；发完自动亮答案问句
- 答问选项干扰：答案 ±1、±2、同数字错位（如商与除数混）；互异禁 0
- 星级：0 错=3★ / 1-2 错=2★ / 更多=1★
- 救援：重读题面+正确答案卡 breathe；发放期救援=轮到的盘子+下一颗糖双高亮
- sayW：不灰化款 `q.miss === 2`；wrong=div_wrong clip（审查 m5）
- 钩子：`DV = { get currentLevel, get quiz(){ total, plates, cur(轮到盘下标), given[](各盘已放数), left(剩糖), phase('deal'|'ask'), options[], answerIdx, step, miss }, tapCandy(i), tapAnswer(i), autoSolve() }`
- 语音：div_tut_watch'看！糖果分一分'/div_tut_turn'你来分一分'/div_hint'一人一颗轮着分'；题面拼接=div_q1'颗糖，平均分给'+div_n_*(2-12 数词)+div_q2'个小朋友'+div_q3'每人几颗呀'（queue 拼接，§0.23）；余数句 div_rem'剩下 X 颗不够分啦'（div_rem2'剩下两颗'数词 1-2 内嵌两条）

## §2 fraction 分数披萨（1/2→1/3→1/4→几分之几→比大小；点选款，灰化）

**玩法**：披萨（SVG 扇形切分，暖色馅+饼边）三题型轮换：
- **A 切分判断**：题面语音"哪一个是平均分成 3 份？"，选项 3 张披萨（正确=3 等分；干扰=3 份不均/4 等分），点选
- **B 分数识别**：一张披萨涂色 k 份（共 n 份），点选分数卡（k/n 大分数字卡；干扰=n/k、k/(n+1)、(k+1)/n）
- **C 比大小**：两块披萨（1/2 vs 1/3 同尺寸），"哪一块大？"点选大的那块（视觉直观）

- 章进阶：ch1 认 1/2（A+B：对半切+二分之一）；ch2 1/3 1/4（A：三等分四等分）；ch3 几分之几（B：2/4、3/4、2/3 涂色）；ch4 比大小（C：1/2>1/3、1/3>1/4、2/3>2/4 同分子）；生成关随机章参数
- 每关首题热身：ch3/4 首题回到已学（ch3 首题=B 型 1/2；ch4 首题=C 型 1/2 vs 1/4 差距最大对）
- 视觉：SVG 扇形 path 生成（等分角计算）；不等分干扰=角宽故意差 ≥1.5 倍（视觉可判）；涂色=暖橙填充
- 灰化款：错卡灰掉 pointer-events:none；错光=排除法保底
- 救援：重读题面+正确卡 breathe；sayW 灰化款 `q._miss === 2`（三选一，两式等价——写 ===2 与家族统一）
- 钩子：`FR = { get currentLevel, get quiz(){ kind('cut'|'read'|'cmp'), n, k, options[](题对象), answerIdx, step, miss, dead[] }, tapCard(i), autoSolve() }`
- 语音：fra_tut_watch'看！披萨切一切'/fra_tut_turn'你来挑一挑'/fra_hint'看一看，每份一样大'；分数词 clip（封闭全组合）：fra_f_1_2'二分之一'/fra_f_1_3'三分之一'/fra_f_1_4'四分之一'/fra_f_2_3'三分之二'/fra_f_2_4'四分之二'/fra_f_3_4'四分之三'；题面句拼接=div 模式全 clip（fra_q_cut'哪一个平均分成了'+fra_num_N 数词（2/3/4）+fra_q_cut2'份'——审查 M1 定版，禁 key:null TTS 段/fra_q_read'涂色部分是几分之几'/fra_q_cmp'哪一块大'）；wrong= fra_wrong clip（审查 m5）；cmp 两选一错 1 次即剩排除法（miss 封顶 1），sayW 豁免改 `>=1`（审查 m1）；read 干扰 (k+1)/n 在 k=n-1 时=n/n=1 属合法近错（禁的是超过 1 的假分数，审查 m9）

## §3 column 竖式小黑板（两位数加减竖式；键盘填位款，不灰化）

**玩法**：小黑板 SVG/HTML 呈现竖式（数位对齐：十位个位两列，加号/减号、横线），**答案区两格（十位/个位）当前格高亮**。孩子点数字键盘（0-9 大按钮 3×4 格）逐位填；填错=该位红晃+可重点（不灰化）；填对=粉笔白亮+自动跳下一位；两位全对=擦黑板动画（板擦横扫）+下一题。**进位/退位视觉提示**：进位=十位上方小"1"（孩子填对个位后浮现动画）；退位=被减数十位标借位点。提示不强制理解——纯视觉支架。

- 数值域（game-data.js GEN 规则，皆两位数）：ch1 加法不进位（a+b 个位和<10，和≤99）；ch2 加法进位（个位和≥10）；ch3 减法不退位（a≥b，个位够减）；ch4 减法退位（个位不够减，十位借 1）；生成关随机章参数（减法恒 a>b 禁负）
- 每关首题热身：ch2/4 首题=不进/退位（新概念首现给已学样本）
- 交互：当前格 cursor 闪烁；数字键盘点选；填错晃动零惩罚同位重填（miss 计数）；答案十位可为 1-9（两位数结果禁前导 0——gen 保证和/差 ≥10）
- 救援：重读题面+当前应填数字的键盘键 breathe；黑板竖式常驻视觉锚点
- sayW：不灰化款 `q.miss === 2`
- 钩子：`CL = { get currentLevel, get quiz(){ op('add'|'sub'), a, b, ans, digits[](答案各位), pos(当前填到第几位), cells[](已填值), step, miss }, tapKey(d), autoSolve() }`
- 语音：**键前缀=clm_**（col_ 已被 batch2 color 占用，gen_clips 同名键冲突已抓出改前缀）——clm_tut_watch'看！竖式算一算'/clm_tut_turn'你来填一填'/clm_hint'先算个位，再算十位'；题面=黑板视觉承载+指令句 clm_q_add'加法竖式，算一算'/clm_q_sub'减法竖式，算一算'（不读算式数字——黑板大字已视觉承载，避免数词 clip 大扩容；§0.19 口径：核心指令语音承载）

### §3-r15 column 难度改造真值（2026-09-16，AUDIT-78:79 行；以下为现行真值——与上文 r12 原版冲突处以本节为准）

- **delta**：①每关 5→8 题（CH_LEN=8，STATIC_LEVELS 20→32）②进退位标记=玩家操作步（原系统代劳=「没练到」根因）③ch4 两步竖式 ④三位数扩位
- **旧档基迁移（r15 审查 M3，fraction（CH_LEN 5→8，c 扫 2-5）/column（c 扫 2-4）同构）**：r12 存量档 5 基键在新 8 基下错位（旧 '2-0'=旧 flat5 误作新 flat8→跳关+章语义错乱）。两款 main.js 顶部 IIFE（赶在 KIDS.init 读档前）检测矛盾态「有跨章首关 C-0 而缺前章第 6 键 (C-1)-5」=旧基残留→一次性整档重置（教学关 ~5min 成本优于静默跳关）；新基正常档不误删。实证：预置残留档启动被重置+正常档保留（_r15_probe_fixes.py PB1）
- **章型重排（难度章 dch 1-4 循环；进度章单调）**：ch1 两位加法（qi0 不进位热身+qi1-7 进位自点亮小 1）/ch2 两位减法（qi0 不退位热身+qi1-7 退位自点亮）/ch3 三位数加减混合（奇偶交替：qi0 加无标记热身、qi1 减无标记热身、qi2·4 加单进、qi3·5 减单退、qi6 加连进双标记、qi7 减连退双标记）/ch4 两步竖式（as=+后−/sa=−后+ 按 qi 奇偶；qi0 两步无标记、qi1-4 恰一步、qi5-7 两步全标记）；生成关（flat≥32）dch=ri(rnd,1,4)
- **计划(plan)驱动操作步（核心）**：加法动作序=填位后标记（[d0,c1,d1]；算出和才知满十）；减法=标记后填位（[b1,d0,d1]；先借再减）；三位数双标记 [d0,c1,d1,c2,d2]/[b1,d0,b2,d1,d2]；两步题 steps[0] 走完→'step2' 换步 2（中间结果作步 2 首操作数，①② 步标）
- **miss 口径（题级 q.miss，不灰化）**：填错数字/标记相位按数字键(wrongmark，不可跳过)/同 op 错点亮(wrongslot)=miss；提前点亮与重复点已亮=early 轻反馈不 miss；异 op 槽位=惰性 no-op（false 不罚）
- **数值域（全封闭直落域，§3-r15 验算表见 progress.md）**：两位进位 ta∈[1,7]/两位退位 ta∈[3,9]；三位四变体 nc/o/t/cc（连进 ha≤7 防空区间）；两步步 2 按 mid 定域（pickSub2From/pickAdd2From，null=重试步 1，80 次兜底）
- **时长模型（crd r12 范式）**：estMs=s.length*345+600 四方同步；DECIDE 分型 INPUT 5000/MARK 4000；ADV 1200/ENTER 400/STAGE 400；两步步 2 首动作 win=estMs('第二步，接着算')+300=3315；LEVEL_MIN_MS=40000；40 关 modeled 最低=117600（ch1/ch2 关=11200+7×15200）精确防回漂；ch3 关=161600/ch4 关=209600
- **语音新增 6 键（clm_ 前缀既有 5 键一字不改）**：clm_q_two'两步竖式，算一算'/clm_q_step2'第二步，接着算'/clm_carry_go'满十啦，点亮小 1'/clm_borrow_go'不够减，点亮退位点'/clm_no_carry'这题不用进位哦'/clm_no_borrow'这题不用退位哦'；manifest 544→2003（全库）
- **验收口径变化**：钩子 quiz 新形状（phase/need/mark/marks/si/nd/carry/borrow，无 pos/digits）；verify 53/53（12 单元族）；独立 verify_one_column.py 18/18（原 verify_one_div_clm column 段 r15 失配已摘除=divide 专属）；真实通关动作数精确断言 23/23/42（2+7×3 / 4+4×5+3×6）；救援标记相位双态（carry_go/borrow_go+标记槽 breathe）；竖屏双通道=body.port 类通道（layout() 实测判据）+800×1180 真竖全量重跑

## 语音与验收

- gen_clips.py：ALL 数组加 'divide','fraction','column'；指令句 9 条+**拼接单元**（div 数词 2-12 共 11+div_q1/q2/q3/rem + fra 分数词 6+fra 数词 3（fra_num_2/3/4，审查 M1）+拼接短语 + col 指令 2）+ wrong 2（div_wrong/fra_wrong，审查 m5）≈ 45 条；manifest 实际 544→549；全部从 game-data 表正则提取或 SPEC 定稿文案（拼接单元=queue 顺序播，times 模式）
- 三款 verify 必含：40 关全量审计（数值域/干扰约束/热身/互异禁 0 负/进退位正确性——column 逐位对账）+确定性+引擎直驱+教学链+sayW 三态+clipOk+开场链+双 viewport+冒烟
- 首单元门禁（batch-verify）：首款全指标过闸才放其余复验：verify 全 PASS+无头真实点击通关+双 viewport+离线+截图像素非空白+钩子齐
- 试玩人设：7 岁半（二年级向，识字但核心指令不依赖阅读）
