# SPEC-BATCH15 · 7-8 岁三款（找零收银 / 逻辑三人组 / 火柴谜题）契约 v1（2026-09-08）

对象：7-8 岁（一二年级：百以内加减熟练、钱币认知在学、简单推理启蒙）。目录 `batch15/cashier|logicwho|matchstick/`。
结构照 batch1-14：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch13/money/_src/（币盘 tray 模式+凑钱主路径+家长门先例）、batch14/numberdet/_src/（键盘/拖放主路径+身份守卫+救援钟）、batch14/blocks/_src/（SVG 造型+几何精确+演示生效实证）、batch6/words/_src/（点选卡+干扰项）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-27 全承 batch14 原文要点 + 28-30 本批新增）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/**say**）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关（难度章随机 `flat<STATIC ? diffOfCh : ri(rnd,1,4)`）
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环；nextHint 参数=flat；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 **lim-1**
5. **语音四包装**：`sayP`（仅 flat<3 播）+ `sayR`（救援/开场/读题/教学，不受 flat 门）+ `sayW` 纠错轻语音（flat<3 每错必播 / flat≥3 走 10s 节流 + 豁免恰一次——不灰化款必须 `=== 2`）+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen）；看=演示（locked 吞输入，demo 参数豁免——守卫必须 `state.locked && !demo`）→帮=幽灵手指→独=首次答对放手；教学交接走顺序链（quiet=true + queue([turn, 题面]) 或 qTimer ≥1.8s 接力，禁双通道叠音）；tutorialWatch 内 `KIDS._save()` 必须 `|| { levels: {} }` 空档防御
7. **答错零惩罚**：晃动（不灰化可重点）；首错不 pulse 正确项（miss≥2 才高亮）；引擎 'again' 早退防御层
7a. **救援钟只被正确推进重置**：错点/空白/探索点击不更新 lastAct；idle 阈值 14s。例外口径：重听题面卡/读题按钮重置（主动学习动作）；cashier 放币/移币=探索不重置、提交正确重置；logicwho 点动物卡=主交互（点对重置/错点不重置）；matchstick 点火柴选起/放槽=探索不重置、等式成立重置
8. **钩子 getter 返回拷贝非活引用**；禁死字段（字段必须可观测真值）
9. **触摸目标 ≥64px**；主答案按钮 ≥96px（cashier 提交键/logicwho 动物卡=主答案）；matchstick 火柴本体细长 → 透明命中矩形 ≥64px（tangram M5 先例：几何外扩+elementFromPoint 采样验证）；双 viewport（1280×800 + 800×1180）overflowX=0；`.k-parentbtn` 豁免
10. **对比度 WCAG**：正文文字 ≥3:1（承家族暖底深棕）
11. **CSS transition 坑**：量测等 transition 结束或用纯数学
12. **core 家长门**：弹层类=.k-panel；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（缺 clip 整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0
15. **布局病害**：文字过早断行/SVG 图内重叠；结构化内容优先 HTML grid/flex
16. **第一反应高发的非主交互输入须有轻反馈**（10s 节流 sayR）；教学/演出期点兔子/空白/黑板=pop+hop 轻反馈不静默；chipEl 一律 pop
17. **选项干扰项**：与答案相近，互异；数值款禁 0 禁负（logicwho 排除型无干扰项概念=其余两动物天然干扰）
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取或本 SPEC 定稿文案（零手抄）；clip key 全 ASCII
19. **7-8 岁文字允许**：题面可出文字，但**核心指令仍须语音承载**；关键数字/答案大字
20. **底栏按钮守卫**：replayBtn/rabbitBtn/hearBtn 补 `locked||demo||won` 门；主答路径 `const run=cur`+await 后 `if (cur!==run) return` 身份守卫
21. **救援视觉重现**：静置 14s 救援=重读题面 + **答案视觉线索**（breathe 循环或 pulse 三连脉冲）；语音-only 救援不收。cashier 救援=正确找零额大字提示 + 最小组合第一枚币 breathe；logicwho=线索关键句重读 + 正确动物卡 breathe；matchstick=可移火柴 pulse 三连
22. **吞输入期轻反馈**：watch/演出期真实点击被吞时 sfx('pop')，返回值/状态不变（主答案按钮同样——batch14 M2 教训：确认键吞输入期 pop+nudge）
23. **题面句语音 clip 化**：封闭库题面全组合建 clip；开放式数字题面走 queue 拼接 clip（数词 clip+短语 clip）；系统 TTS 仅留缺 clip 兜底
24. **wrong 句 clip 化**：三款 VOICE.wrong 必须指向专属 clip（cas_wrong/lgw_wrong/ms_wrong），文案与 manifest 严格一致
25. **每游戏自建数词 clip 副本**：cas_n_*/lgw 无数词/mat_n_* 各自合成，禁跨游戏复用
26. **晃动窗防重入**：错分支 `await wait()` 前 `state.locked=true`、await 后 `if (cur!==run) return r; state.locked=false`（含身份守卫，连点只记一次 miss）
27. **演示生效须实证**：教学演示被测函数存返回值到 `window.__xxxDemoR`，verify 断言真实生效（禁"重发后初态"恒真断言）
28. **cashier 币制与 money 家族口径统一**（本批新增）：硬币面值 {1,2,5} 元+{5} 角（视觉/色值/命名照 batch13/money 同族）；大额纸币（10/20/50 元）仅作题面展示**不可点选**（付额来源）；币盘每面值数量上限 5；找零=多解开放组合（凑出找零额即对，不强制唯一）
29. **logicwho 线索自洽唯一解**（本批新增）：每题线索组必须逻辑自洽且**恰一解**——verify 须独立穷举 3!=6 种排列复算唯一解（禁"生成时恰巧唯一"的侥幸断言）；线索文本与生成参数严格同源（正陈述"戴红帽子的是小猫"=直接型；负陈述"戴红帽子的不是小兔"=排除型；位置关系"小熊住在小兔左边"=相对型）
30. **matchstick 有解性反向构造**（本批新增）：谜面必须从合法等式**反向移动一根**构造（天然保证有解）；verify 须独立枚举全部单根移动复算 ≥1 解（与生成器分源复算）；七段段集表（§3）为唯一真值源，数字字形渲染与变换判定共用同一表

## §1 cashier 找零收银（收银员视角找零；点币盘款，不灰化）

**玩法**：小卖部柜台。每题：顾客（小动物）拿 1 件商品+付 1 张纸币（10/20/50 元大字+纸币视觉）→黑板块显示"商品 Y 元 / 付了 X 元"→孩子点币盘把找零拖/点入托盘（Z=X−Y）→点"找零"提交：
- 托盘总额=Z → 对：顾客道谢离场，下一题（**组合开放**：3 元可 1+2 或 1+1+1 或 3 枚凑法均可——**总额判对不判组成**）
- 托盘总额≠Z → 晃动零惩罚可调整（多了点托盘币移回/少了补）
- 空/超额不限制币数上限（币盘每面值 5 枚够用：Z 最大 45.5 时 5×5+5×2+5×1……ch4 域内须保证币盘够凑至少一种组合——**币盘供给恒足**断言进 verify）

- 数值域（game-data.js GEN，确定性随机）：
  - ch1：件价 3-9 元（可 .5 结尾 20%），付 10 元，找零 1-7 元
  - ch2：件价 6-19 元，付 20 元，找零 1-14 元
  - ch3：件价 5.5-19.5 元（.5 结尾 40%），付 20 元，找零 0.5-14.5 元（**带角找零=5 角币唯一渠道**）
  - ch4：件价 15-49 元，付 50 元，找零 1-35 元
  - 件价与付额硬约束：付额>件价恒成立（找零>0）；同关相邻题件价互异
- 星级：提交错次口径（0 错=3★/1-2=2★/更多=1★；空提交不计次——与 money 空篮语义一致）
- 救援：找零额大字提示（"要找 Z 元"数字卡亮起）+ 最小组合第一枚币 breathe；sayW 不灰化 `=== 2`
- 教学：watch=演示一笔找零（点 2 元+1 元=3 元过程逐枚动画）→帮=幽灵手指指第一枚该点的币→独=放手；演示 `__csDemoR`（§0.27）
- 钩子：`CS = { get currentLevel, get quiz(){ price, paid, change(=paid-price), tray[](已放币面值数组), step, miss }, tapCoin(v), tapTrayCoin(i), tapSubmit(), autoSolve() }`（autoSolve=贪心凑零逐枚：5→2→1→0.5，断言总额恰=change）
- 语音：cas_tut_watch'看！顾客买东西啦'/cas_tut_turn'你来当收银员'/cas_hint'算一算，要找多少钱'；题面=cas_q1'付了'+cas_n_X+cas_q2'元，买了'+cas_n_Y+**（Y 整元：cas_q3'元的东西，找他多少呀' / Y 带角：cas_q3j'元五角的东西，找他多少呀'——两尾段平行二选一）**；反馈=cas_right'找对啦'/cas_wrong'再算一算找零'；cas_q_more'多找啦，拿回去一枚'/cas_q_less'还差一点点'（超额/差额轻提示，10s 节流）；数词 cas_n_1..35（件价/付额整数段）
- 大额纸币视觉：10/20/50 三色纸币矩形（暖色系区分+大字面值），aria 只读

## §2 logicwho 逻辑三人组（线索排除推理；点选动物卡款，不灰化）

**玩法**：排排坐三个小动物（小兔/小猫/小熊，SVG 家族造型+属性徽章）+线索卡 2-3 条。问句如"戴红帽子的是谁呀"→点动物卡：
- 点对：属性徽章亮起+动物跳一下，下一题（新排列新线索）
- 点错：晃动零惩罚可重点；对应线索卡**高亮一下**（提示回看哪条线索）

- 数据模型：3 位置×3 动物排列 + 属性分配（帽色 3 色：红/黄/蓝；ch4 加物品 3 种：球/书/伞）。**每题=一个排列+属性分配+线索组+问句**，全部确定性生成
- 线索型（game-data.js GEN）：
  - ch1：1 条直接线索（"戴红帽子的是小猫"）→问该属性持有者
  - ch2：2 条=1 正 1 负（"戴蓝帽子的是小熊"+"戴红帽子的不是小兔"）→负线索参与排除
  - ch3：3 条含相对位置（"小熊住在小兔左边"/"最左边戴黄帽子"+1 条正负）→先定位置再定属性
  - ch4：双属性交叉（帽色+物品各 2-3 条）→问"拿着球的是谁"/"戴红帽子又拿书的是谁"（单动物双属）
  - **§0.29 铁律**：线索组自洽+恰一解（6 排列穷举唯一）；ch3 相对线索须可判定（"左边"=相邻左，两侧固定 L→R 视角——观察者视角定版，承 batch9 whereistand）
- 干扰：其余两动物卡（天然）；卡上徽章=该动物当前属性（视觉推理素材）
- 星级：错次口径（0/1-2/更多→3/2/1）
- 救援：问句重读+正确动物卡 breathe；关键线索卡 pulse 三连
- 教学：watch=演示读线索→排除→点选过程（线索卡逐条亮+错误动物划暗+正确点选）→帮/独；`__lwDemoR`
- 钩子：`LW = { get currentLevel, get quiz(){ animals[3](位置序), clues[](文本+类型), ask(问句对象), answer(位置 idx), step, miss }, tapAnimal(i), autoSolve() }`
- 语音：lgw_tut_watch'看！小线索有大秘密'/lgw_tut_turn'你来想一想'/lgw_hint'听一听线索想一想'；题面=lgw_q_hat'戴红帽子的是谁呀'族（封闭：hat 帽色 3×+ch4 物品 3=6 问句全 clip）+线索句=lgw_c_is'戴…帽子的是…'开放拼接（**走 queue**：lgw_c_a'戴'+色词 clip+lgw_c_b'帽子的是'+动物名 clip；负/位置线索同构 4 段拼接单元）；动物名 lgw_n_tu/lgw_n_mao/lgw_n_xiong；色词 lgw_c_red/red…（红黄蓝 3）；lgw_wrong'再听一听线索'
- 线索卡视觉：卡片式逐条列出（icon+文字），负线索带 ✗ 徽记、相对位置带 ←徽记（7-8 岁可读辅助）

## §3 matchstick 火柴谜题（移一根使等式成立；点选火柴款，不灰化）

**玩法**：火柴棒等式（七段数字+运算符），当前不成立（如 `5+3=9`）。孩子点一根火柴（高亮拿起）→点目标虚线槽（放置）→等式重判：
- 成立（如 5+3→6+3=9? 不成立示例仅示意）→火焰粒子+胜利，下一题
- 不成立→晃动零惩罚可再移（火柴回原位，**探索不计 miss**——见星级口径）
- **移动语义**：一根=数字段或符号段的一根；拿起后可放任意空段位（含另一数字/符号）；每次提交=一次移动判定（移动后立即判，无须确认键——主交互=放置动作本身）

- 七段段集表（唯一真值源，渲染与判定共用）：
  `0=abcdef 1=bc 2=abged 3=abgcd 4=fgbc 5=afgcd 6=afgcde 7=abc 8=abcdefg 9=abcdfg`
  运算符：`+=h+v（1 横 1 竖） -=h（1 横） ==h+h（2 横）`；等号固定不可移（防无解域扩大），加减号可参与（ch4）
- 数字变换判定（代码实现，非手抄表）：X→Y 合法 ⟺ |segs(X)|−|segs(Y)|=±1 且 segs(小)⊂segs(大)（差恰一根）；符号变换：+↔-（去/加竖）、-↔=（加/去横，位置两态）、+→=（去竖加横位=两根操作**不允许**——单根语义下 + 变 = 须 +={h,v} 去 v 得 - 仅此）
- 数值域：
  - ch1：一位数加法 A+B=C（A,B∈2-9，C≤10 用 '1 0' 两位七段），谜面=从合法式反向移 1 根（数字间移动），解唯一不强制（≥1 解即收，verify 穷举）
  - ch2：一位数减法 A−B=C（A∈5-9），含 6↔9/0↔9/5↔6/2↔3 族变换
  - ch3：两位数参与（A 或 C 为两位，含 1x 前导段位），数字间移动
  - ch4：运算符参与（-↔=、+↔- 变换入池）+数字移动混合
  - 反向构造：合法目标式 → 随机选一根段移走 → 放到使式**恰好不成立**的另一空位（若无处可放致仍成立/无空位则重选根）→ 谜面；**verify 分源穷举**：枚举全部单根移动（含符号）复算 ≥1 解且谜面本身不成立
- 星级：**探索移动不计 miss；浪费移动（判定不成立）计 miss**——0 错=3★/1-2=2★/更多=1★（拿起到放置的中间态零惩罚）
- 救援：可解的那根火柴 pulse 三连（从 verify 同款穷举取一个解的源段）；问句重读
- 教学：watch=演示一次完整移动（高亮拿起→虚线槽落位→等式亮起成立）→帮=幽灵手指指该拿的火柴→独；`__msDemoR`
- 钩子：`MS = { get currentLevel, get quiz(){ expr[](段位对象数组：数字/符号+段火柴布尔), left, right(当前两侧值或 null 不成立), step, miss, held(拿起段或 null) }, tapStick(segIdx), tapSlot(slotIdx), autoSolve() }`（autoSolve=穷举一解执行：拿起源段→放目标槽→断言 left===right）
- 语音：ms_tut_watch'看！火柴动一动'/ms_tut_turn'你来移一移'/ms_hint'想一想，动哪一根'；题面=ms_q'移一根火柴，让算式成立'（封闭单 clip）；反馈=ms_right'成立啦，你真聪明'/ms_wrong'再移一移试试'；ms_pick'拿起了一根'（拿起轻反馈）/ms_drop'放好啦'（放置轻反馈，10s 节流）
- 火柴视觉：暖木色杆+红磷头（横向段头朝左统一，视觉一致）；拿起态=浮起+阴影；空槽=虚线框；命中矩形透明外扩 ≥64px（§0.9）

## 语音与验收

- gen_clips.py：ALL 数组加 'cashier','logicwho','matchstick'；prefix：cashier cas_（3 教学+3 题面段+2 反馈+2 提示+35 数词+五角 1 ≈46 条）/logicwho lgw_（3 教学+6 问句+4 拼接单元+3 动物+3 色+wrong 1+hint 1 ≈21 条）/matchstick ms_（3 教学+1 题面+2 反馈+2 轻反馈+wrong 1 ≈9 条）；manifest 预计 694→770±10
- 三款 verify 必含：40 关全量审计（数值域/唯一解穷举/logicwho 线索自洽 §0.29/matchstick 有解性分源穷举 §0.30+谜面不成立断言/cashier 币盘供给恒足+找零=差值）+确定性+引擎直驱（cashier 贪心 autoSolve 总额对账/logicwho 穷举一致解/matchstick 穷举一解执行）+教学链（demoR 实证 §0.27）+sayW 三态+clipOk+开场链+双 viewport+冒烟
- cashier verify 专项：提交错次口径（空提交不计次）/超额差额轻提示节流/带角找零 5 角唯一渠道
- logicwho verify 专项：6 排列穷举唯一解/负线索与相对线索判定/问句与属性分配一致
- matchstick verify 专项：单根移动穷举 ≥1 解/谜面不成立/段集表渲染对账（每数字段火柴 DOM 数=段集基数）/拿起放置中间态不计 miss
- 首单元门禁（batch-verify）：首款全指标过闸才放其余复验
- 试玩人设：7 岁半（二年级向）

## 交付边界（agent 禁区）

- 禁改 KIDS core.js 内容（build.py 原样拼接）；禁改 gen_clips.py（语音由主会话预合成，agent 只做 clipOk 对账）
- 语音 clip 文件 voice/clips/*.mp3 由主会话注入；agent 交付 _src 源码+build 产物，build 走既有 build.py 模式（pipe inject_clips）
- 三款互相独立：不共享 _src；core 3 条共享 clip（core_chapter_end/core_day_end/core_rest）由 manifest games 数组注入
