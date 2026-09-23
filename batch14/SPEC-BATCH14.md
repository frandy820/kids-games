# SPEC-BATCH14 · 7-8 岁三款（空间积木 / 乘法对战 / 数字侦探）契约 v1（2026-09-07）

对象：7-8 岁（一二年级：乘法口诀在学、百以内数认识、空间观念启蒙）。目录 `batch14/blocks|multibattle|numberdet/`。
结构照 batch1-13：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch13/money/_src/（点选答案卡+题面 queue 拼接+晃动窗锁）、batch13/grid/_src/（纯引擎 game-core 与 UI/verify 共用模式+确定性生成）、batch4/times/_src/（乘法口诀知识域先例+答案点选）、batch12/column/_src/（数字键盘输入款）、batch8/neighbors/_src/（数轴可视化）、batch6/subbug/_src/（动画演出+点数角标）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-25 全承 batch13 原文 + 26-27 本批新增）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/**say**）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关（难度章随机 `flat<STATIC ? diffOfCh : ri(rnd,1,4)`，batch11 M1 定版）
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环；nextHint 参数=flat；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 **lim-1**（batch12 m6 定版）
5. **语音四包装**：`sayP`（仅 flat<3 播）+ `sayR`（救援/开场/读题/教学，不受 flat 门）+ `sayW` 纠错轻语音（flat<3 每错必播 / flat≥3 走 10s 节流 + 豁免恰一次——不灰化款必须 `=== 2`）+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen）；看=演示（locked 吞输入，demo 参数豁免——守卫必须 `state.locked && !demo`，batch13 M1 教训）→帮=幽灵手指→独=首次答对放手；教学交接走顺序链（quiet=true + queue([turn, 题面]) 或 qTimer ≥1.8s 接力，禁双通道叠音）；tutorialWatch 内 `KIDS._save()` 必须 `|| { levels: {} }` 空档防御
7. **答错零惩罚**：晃动（不灰化可重点）；首错不 pulse 正确项（miss≥2 才高亮）；引擎 'again' 早退防御层
7a. **救援钟只被正确推进重置**：错点/空白/探索点击不更新 lastAct；idle 阈值 14s。**例外口径（batch13 定版承）**：重听题面卡/读题按钮重置（主动学习动作）；multibattle 答题点选照"主交互"口径（点对重置/错点不重置）；numberdet 键盘输入=探索动作不重置、确认猜测=推进形态重置（合法猜测收窄区间）
8. **钩子 getter 返回拷贝非活引用**；禁死字段（字段必须可观测真值）
9. **触摸目标 ≥64px**；主答案按钮 ≥96px（multibattle 答案卡/numberdet 确认键=主答案）；双 viewport（1280×800 + 800×1180）overflowX=0；`.k-parentbtn` 豁免
10. **对比度 WCAG**：正文文字 ≥3:1（blocks 三面明暗色阶须满足面间可辨识，正文文字色承家族暖底深棕）
11. **CSS transition 坑**：量测等 transition 结束或用纯数学
12. **core 家长门**：弹层类=.k-panel；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（缺 clip 整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0
15. **布局病害**：文字过早断行/SVG 图内重叠；结构化内容优先 HTML grid/flex；等轴测方块三面平行四边形几何精确（共享顶点），禁 path 手拼错位
16. **第一反应高发的非主交互输入须有轻反馈**（10s 节流 sayR）；教学/演出期点兔子/空白/黑板=pop+hop 轻反馈不静默；chipEl 一律 pop（batch13 m1）
17. **选项干扰项**：与答案相近（±1/±2/镜像/错一属性），互异；数值款禁 0 禁负
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取或本 SPEC 定稿文案（零手抄）；clip key 全 ASCII
19. **7-8 岁文字允许**：题面可出文字，但**核心指令仍须语音承载**；关键数字/答案大字
20. **底栏按钮守卫**：replayBtn/rabbitBtn/hearBtn 补 `locked||demo||won` 门；主答路径 `const run=cur`+await 后 `if (cur!==run) return` 身份守卫
21. **救援视觉重现**：静置 14s 救援=重读题面 + **答案视觉线索**（breathe 循环或 pulse 三连脉冲）；语音-only 救援不收
22. **吞输入期轻反馈**：watch/演出期真实点击被吞时 sfx('pop')，返回值/状态不变
23. **题面句语音 clip 化**：封闭库题面全组合建 clip；开放式数字题面走 queue 拼接 clip（数词 clip+短语 clip）；系统 TTS 仅留缺 clip 兜底
24. **wrong 句 clip 化**：blocks/multibattle VOICE.wrong 必须指向专属 clip（blo_wrong/mul_wrong），文案与 manifest 严格一致。**numberdet 显式豁免**：无错点语义（每猜必有 big/small 信息反馈，无 wrong 路径），不设 VOICE.wrong 不建 clip——SPEC 明示豁免非遗漏
25. **每游戏自建数词 clip 副本**：blo_n_*/mul_n_*/num_n_* 各自合成，禁跨游戏复用
26. **晃动窗防重入**（batch13 m3 定版）：错分支 `await wait()` 前 `state.locked=true`、await 后 `if (cur!==run) return r; state.locked=false`（含身份守卫，连点只记一次 miss）
27. **演示生效须实证**（batch13 M2 定版）：教学演示被测函数存返回值到 `window.__xxxDemoR`，verify 断言真实生效（禁"重发后初态"恒真断言）

## §1 blocks 空间积木（数方块/三视图；点选答案卡款，不灰化）

**玩法**：等轴测 3D 方块堆场景（SVG 立体渲染），四题型：
- **数方块（count）**：呈现方块堆，点选"一共有几个方块"答案卡（3 选 1 大数字卡）——核心教育点=被遮挡的方块也要数（底层推理）
- **补方块（fill）**：缺损堆+虚线目标盒轮廓，点选"还缺几个方块"答案卡
- **正视图（front）**：3D 堆→"从前面看是哪一个"三选一（2D 投影网格图卡，非文字）
- **俯视图（top）**：3D 堆→"从上面往下看是哪一个"三选一（footprint 网格图卡）

- 数据模型：格柱 stacks——基底 3×3 格（r=行深度 1-3、c=列 1-3），每格柱高 h=0-3（0=空格），**从地面连续堆高无悬空**（物理合法，俯视无空腔歧义）
- 渲染：等轴测投影；每立方体三面平行四边形（top 最亮/front 中/left 最暗，暖色系），**画序=从后到前、从下到上**（后排先画被前排正确遮挡）；几何共享顶点禁手拼错位（§0.15）
- 数值域（game-data.js GEN）：
  - ch1 count：基底 3×2 无空列（每格 h≥1），各柱高 1-3，总块数 6-12（h≥1 下限 6，开发期裁定：原"4-12"与无空列约束矛盾）；干扰=总数 ±1/±2
  - ch2 fill：目标盒 2×2×2=8 / 3×2×2=12 / 2×3×2=12 三档；缺损后每柱 0-目标高，缺 2-6 块；干扰=缺数 ±1/±2
  - ch3 front：正视图=每列 c 取 max h over r（3×1 高度条形投影）；干扰=某一列高度 ±1 / 两列互换
  - ch4 top：俯视图=footprint（h>0 亮格的 r×c 二值网格）；干扰=一格翻转（多一格/少一格）/ 沿对角镜像
- 每关首题热身：ch2/3/4 首题=ch1 count 型
- 同关相邻题堆不同（柱高布局互异）
- 星级：0 错=3★ / 1-2 错=2★ / 更多=1★（家族口径）
- 救援：重读题面 + 正确答案卡 breathe；sayW 不灰化 `=== 2`；wrong=blo_wrong clip
- 钩子：`BK = { get currentLevel, get quiz(){ kind('count'|'fill'|'front'|'top'), cols(柱高二维数组 r×c), goal(fill 型目标柱高), secret 不适用, options[](count/fill=数字；front/top=投影序列化), answerIdx, step, miss }, tapAnswer(i), autoSolve() }`
- 语音：blo_tut_watch'看！方块叠叠高'/blo_tut_turn'你来数一数'/blo_hint'看不见的也要数一数'；题面=blo_q_count'数一数，一共有几个方块'（count）/blo_q_fill'数一数，还缺几个方块'（fill）/blo_q_front'从前面看，是哪一个呀'（front）/blo_q_top'从上面往下看，是哪一个呀'（top）——全封闭句单 clip；blo_n_1..12 数词副本（选项数字大字显示不需语音，数词留 sayR 读题备用）；blo_wrong'再想一想，数一数'

## §2 multibattle 乘法对战（限时 vs 兔子；点选答案卡款，不灰化）

**玩法**：赛跑对抗。顶部赛道横条：孩子兔子（左）vs 对手兔子（右），同起点；每题一道乘法算式（3 选 1 大数字答案卡），同时**对手答题钟**进度条走：
- 孩子先答对→己方进 1 格 + 庆祝音；答错→晃动零惩罚可重点（**对手钟不停**）
- 对手钟走完→对手进 1 格 + mul_lose 播报，该题结束自动下一题（**不计 miss 不扣星**——超时是慢不是错，零惩罚精神）
- 关末按双方格数：孩子 ≥3 格=胜利庆祝；<3=鼓励收尾"就差一点点，再来一局"（不锁关不惩罚）
- **星级=miss 口径（家族统一=准确性）；胜负=速度（本款动力机制），两者分离**——设计意图明示

- 数值域（game-data.js GEN）：
  - ch1 因数 {2,3}×{2..9}（积 ≤27）
  - ch2 因数 {4,5}×{2..9}
  - ch3 因数 {6,7}×{2..9}
  - ch4 因数 {8,9}×{2..9}+章内混合（**开发期裁定（审查 m6 固化）**：混合=跨章复习——2 题 {8,9} 域+3 题 a,b∈2..9 全域，承 batch4/times"新章混旧知"先例；非"{8,9} 域内混排"读法）
  - a≠b 允许（口诀含平方）；同关相邻题算式互异（a,b 对不同）
- 对手钟：ch1=8000ms / ch2=7000 / ch3=7000 / ch4=6500（真实 ms；**verify 提速=base/SPEED**，对齐家族 wait() 口径）；钟走条渐满视觉；教学 watch/demo 期钟不走（help 起走）。**开发期裁定（试玩 P1-4+审查产品性观察，2026-09-08 修订）**：原定值 6000/5000 按熟练者标定——7.5 岁人设生疏口诀实测答题 6.1-9.7s，15 题仅抢到 1 题；钟长改按口诀难度分段（ch1/2 因数 2-5 熟 8s/7s，ch3/4 因数 6-9 生疏 7s/6.5s，ch3 与 ch2 持平非章号单调）
- 干扰项：{ans±a, ans±b, a+b} 取互异正值非 ans 的 2 个；禁 0 负
- 教学看-帮-独：watch=演示（对手钟冻结，演示答题）；帮=幽灵手指指正确卡（钟走）；独=放手
- 救援：重读题面（数词 a+mul_q1'乘'+数词 b+mul_q2'等于多少呀' queue 拼接）+ 正确卡 breathe；对手钟与救援钟独立互不干扰；sayW 不灰化 `=== 2`；wrong=mul_wrong
- 钩子：`MB = { get currentLevel, get quiz(){ a, b, options[], answerIdx, step, miss, myScore(己方格), foeScore, foeT(钟剩余 0-1) }, tapAnswer(i), autoSolve() }`（autoSolve 直接逐题答对不涉钟）
- 语音：mul_tut_watch'看！和兔子比一比'/mul_tut_turn'你来抢答'/mul_hint'算一算，几个几'；题面拼接=mul_n_a+'乘'+'mul_n_b'+'等于多少呀'（mul_q1'乘'/mul_q2'等于多少呀'+mul_n_2..9 数词副本 8 条）；mul_win'答对啦，冲呀'（己方进格）/mul_lose'兔子先答完啦，下一题追上它'（对手进格）；mul_wrong'再想一想，算一算'

## §3 numberdet 数字侦探（猜数二分；数字键盘输入款）

**玩法**：数轴场景 + 数字键盘。1-N 中藏了"神秘数"（宝箱），孩子输数字猜：
- 猜大→num_big'太大啦' + 数轴 >guess 段灰化（区间收紧）
- 猜小→num_small'太小啦' + <guess 段灰化
- 猜中→宝箱开启动画 + num_got'猜中啦'，下一题（新神秘数）
- **每猜必有信息反馈（无 wrong 路径）**——§0.24 显式豁免

- 数值域（game-data.js GEN）：
  - ch1 范围 1-20，基准 base=5
  - ch2 范围 1-30，base=5
  - ch3 范围 1-50，base=6
  - ch4 范围 1-99，base=7
  - base=ceil(log2(N+1))（=恒中点二分最坏步数，DP 复算实证 20→5/30→5/50→6/99→7；开发期裁定：原文字面式 ceil(log2(N))+1 系行文疏忽，表值为准）；secret ∈ [1,N] 确定性随机，同关 5 题互异
- 数轴渲染：均匀横条 + 1/N 端点大字 + 5 倍数中间刻度；已排除段灰化、剩余段亮色；**剩余区间两端数字大字实时显示**（"还剩 23 到 45"语义，防大范围数轴不可读）
- 键盘：1-9/0/删除/确认（键 ≥64px，确认=主答案 ≥96px）；输入位显示当前拼数（≤2 位，ch1-3）/≤2 位（ch4 99 封顶 2 位）；**范围外输入**（<1、>N、或已排除数）→键盘轻抖+sfx+num_gone'这个数已经排除啦'（或范围外提示），**不计猜测次数**（无害探索）
- 猜测次数计数：每次合法确认（1-N 且未排除）+1；题完成=猜中
- **星级=超基准口径**：每题超次=guesses-base（≥0）；关星=Σ超次：0=3★ / 1-2=2★ / 更多=1★（二分策略好=满星——星级本身教二分）；miss 字段=当前题超次（钩子可观测）
- 救援：14s idle→num_hint'试一试中间的数' + 数轴剩余段中点 pulse 三连（**救援即教二分**）；读题按钮=重播题面（num_q1'神秘数藏在'+数词 N+num_q2'之间'——ch4 N=99 用 num_n_99'九十九'）
- 教学：watch=演示侦探兔三步猜中（大→小→中，每步区间收缩可视化）；帮=幽灵手指按中点数字；独=放手
- 钩子：`ND = { get currentLevel, get quiz(){ kind='hunt', lo, hi(剩余区间), secret, base, guesses(次数), input(当前拼数), step, miss(当前题超次) }, tapKey(k), tapDel(), tapOK(), autoSolve() }`（autoSolve=二分策略逐猜：恒猜中点，断言 ≤base 次）
- 语音：num_tut_watch'看！猜一猜神秘数'/num_tut_turn'你来当侦探'；题面拼接=num_q1'神秘数藏在'+num_n_N+num_q2'之间'（num_n_10'十'/num_n_20'二十'/num_n_30'三十'/num_n_50'五十'/num_n_99'九十九' 5 条）；反馈=num_big'太大啦'/num_small'太小啦'/num_got'猜中啦'/num_gone'这个数已经排除啦'；救援=num_hint'试一试中间的数'

## 语音与验收

- gen_clips.py：ALL 数组加 'blocks','multibattle','numberdet'；三款 tut/hint/反馈+拼接单元（blo 12 数词+9 短句 / mul 8 数词+7 短句 / num 5 数词+8 短句）≈ 49 条；manifest 预计 619→668±5；全部本 SPEC 定稿文案（无 game-data 二次提取）
- 三款 verify 必含：40 关全量审计（数值域/干扰约束/热身/互异禁 0 负/blocks 柱高物理合法+总块数域+投影正确性独立复算/multibattle 算式域+干扰池/numberdet secret 域+base 公式）+确定性+引擎直驱（blocks front/top 投影独立复算对账；numberdet 二分 autoSolve ≤base 断言）+教学链（**demoR 实证 §0.27**）+sayW 三态（blocks/multibattle；numberdet 豁免）+clipOk+开场链+双 viewport+冒烟
- multibattle verify 专项：对手钟 /SPEED 提速生效、超时不计 miss 不扣星、答错钟不停、教学期钟冻结、关末胜负文案
- numberdet verify 专项：区间灰化对账（lo/hi 收紧正确）、范围外/已排除输入不计次、超次星级口径、数轴剩余区间文字实时
- 首单元门禁（batch-verify）：首款全指标过闸才放其余复验
- 试玩人设：7 岁半（二年级向）

## 交付边界（agent 禁区）

- 禁改 KIDS core.js 内容（build.py 原样拼接）；禁改 gen_clips.py（语音由主会话预合成，agent 只做 clipOk 对账）
- 语音 clip 文件 voice/clips/*.mp3 由主会话注入；agent 交付 _src 源码+build 产物，build 走既有 build.py 模式（pipe inject_clips）
- 三款互相独立：不共享 _src；core 3 条共享 clip（core_chapter_end/core_day_end/core_rest）由 manifest games 数组注入
