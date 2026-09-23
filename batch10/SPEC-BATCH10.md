# SPEC-BATCH10 · 6-7 岁三款（算术接龙 / 听指令 / 好习惯排序）契约 v1（2026-09-07）

对象：6-7 岁（幼小衔接：数字 1-20 熟、识字启蒙中、心算链与序列记忆与生活自理发展期）。目录 `batch10/chainsum|simon|habit/`。
结构照 batch1-9：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch8/neighbors/_src/（数学生成+数词 TTS 拼题面+灰化候选款+救援钟）、batch9/memgrid/_src/（两态 watch/input+skipShow+show 期吞输入+轻叮+救援重闪）、batch9/whereistand/_src/（不灰化款+乱序场景点击+sayW===2 口径+救援视觉重现）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-20 全承 batch9 原文）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/say）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环；nextHint 参数=flat；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 lim
5. **语音四包装**：`sayP`（仅 flat<3 播）+ `sayR`（救援/开场/读题/教学，不受 flat 门）+ `sayW` 纠错轻语音（flat<3 每错必播 / flat≥3 走 10s 节流 + **豁免恰一次**——灰化款（错光封顶 miss=2）传 `q._miss >= 2`；**不灰化款（miss 无上限）必须 `=== 2`**，batch9 定版）+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen）；看=演示（locked 吞输入，demo 参数豁免）→帮=幽灵手指→独=首次答对放手；教学交接走顺序链（turn clip 播完再读题面——quiet=true + queue([turn, 题面]) 或 qTimer ≥1.8s 接力，禁双通道叠音）
7. **答错零惩罚**：晃动（灰化款=灰掉可重点、pointer-events:none；不灰化款=不灰可重点）；首错不 pulse 正确项（miss≥2 才高亮）；引擎 'again' 早退防御层
7a. **救援钟只被正确推进重置**：错点/空白/探索点击不更新 lastAct；idle 阈值 14s
8. **钩子 getter 返回拷贝非活引用**；禁死字段（batch9 m2：字段必须可观测真值）
9. **触摸目标 ≥64px**；主答案按钮 ≥96px；双 viewport（1280×800 + 800×1180）overflowX=0；`.k-parentbtn` 豁免
10. **对比度 WCAG**：正文文字 ≥3:1
11. **CSS transition 坑**：量测等 transition 结束或用纯数学
12. **core 家长门**：弹层类=.k-panel；两位数加法
13. **音频**：音效全 Web Audio 合成；语音 clip 走 KIDS.voice.play(key,text)（缺 clip 整句 TTS 兜底）
14. **每关 5 题**（CH_LEN=5）；星级 3/2/1 永不为 0
15. **布局病害**：文字过早断行/SVG 图内重叠；结构化内容优先 HTML grid/flex
16. **第一反应高发的非主交互输入须有轻反馈**（10s 节流 sayR）
17. **数值选项干扰项**：与答案相近、互异、非负；禁 0 禁负
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取（零手抄）；clip key 全 ASCII
19. **题面指令全语音承载**；答案域文字（数字/汉字）=训练目标，大字可见
20. **底栏按钮守卫**：replayBtn/rabbitBtn/hearBtn 补 `locked||demo||won` 门；主答路径 `const run=cur`+await 后 `if (cur!==run) return` 身份守卫
21. **救援视觉重现（batch9 试玩共性定版）**：静置 14s 救援=重读题面 qSpeech + **答案视觉线索一次**（正确项高亮一次/答案序列重播/应点卡 pulse），静音环境屏幕可感知——语音-only 救援不收
22. **吞输入期轻反馈（batch9 试玩 P1③）**：watch/show 演出期真实点击被吞时给轻反馈（sfx('pop') 轻叮或等效），返回值/状态不变——零反馈吞输入不收

## §1 chainsum 算术接龙（连续加减链心算，一年级 20 以内加减对齐）

**玩法**：小兔子火车接龙。屏幕一列车厢：首节=起点数字，之后每节填前一节数字经运算后的结果，尾部一节空车厢上方标运算牌（`+3` / `-2` 大字），孩子从底部 3 张数字卡点选结果。答对=空车厢填数亮起，列车尾部再挂一节新空车厢（下一题，当前数=刚填的数——**同关五题首尾相接成链**）。每关 5 题。

- 生成参数（章进阶，game-data.js PARAMS 表）：
  - 章 1：s0∈[1,5]，d∈[1,2]，全程数域 [0,10]
  - 章 2：s0∈[3,8]，d∈[1,4]，全程 [0,10]
  - 章 3：s0∈[6,12]，d∈[2,5]，全程 [0,20]
  - 章 4：s0∈[10,15]，d∈[1,6]，全程 [0,20]，+/- 高频交替；生成关=随机取章参数
- 运算约束：逐题随机 op，保证结果 n'∈[lo,hi]；禁连续 3 题同 op（多样性，verify 断言每关 ± 各 ≥1）；**每关首题热身 d≤2**（试玩 P1②：ch2 实测五题全 d≥3 对 6 岁断层——warmCap=max(dmin,min(2,dmax))，各章恒 ≥dmin）
- 候选 3 张数字卡：答案+2 干扰（答案±(1|2|d) 中取，互异、非负、域内）；**灰化款**（错卡灰掉 pointer-events:none，排除法保底——mirror 模式），sayW force `q._miss >= 2`
- 题面：整句 TTS `say('八加三等于几呀')`（数词+加减词拼句，neighbors 模式；运算牌大字 `+3` 视觉同步）；hearBtn 重听题面
- 星级：关内错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`CS = { get currentLevel, get quiz(){ cur(当前数), op('+'|'-'), d, answer, options[](数字), dead[](灰化标记), step, miss }, tapCard(i), autoSolve() }`
- 语音 clip：cs_tut_watch'看！小火车接数字啦'/cs_tut_turn'你来接一接'/cs_hint'算一算，下一节是几'（题面动态 TTS 无 clip）

## §2 simon 听指令（光键序列模仿，听觉工作记忆+序列模仿）

**玩法**：4 面小鼓（红黄绿蓝大圆键，各配一种音符）。两态：**watch 期**（小兔子敲鼓演示序列：鼓面亮+音符，间隔 speed ms，吞输入+轻叮）→ **input 期**（题面"跟着敲一敲"，孩子照序点击）。整条敲对=过题。每关 5 题（5 条序列）。

- 章 1 序列长 2；章 2 长 3；章 3 长 4；章 4 长 2-4 混合+watch 提速（500ms/键 → 380ms/键）；生成关=随机长度+速度
- 序列生成：键号 0-3 均匀随机；**禁三连同键**（verify 断言：无 i 使 seq[i]==seq[i+1]==seq[i+2]）
- input 期点对=鼓亮+音符+指针 pos++；**点错=错鼓 wig+低音+sayW，序列从头重播且 pos 保留**（watch 重入=重试零惩罚，miss 计数；试玩 P1①：与救援重播统一口径——错一锤不清已敲对进度，回 input 从已敲对处继续，重播视觉仍从头整条）
- watch 吞输入：tapPad 返回 false + sfx('pop') 轻叮 + 被点鼓外圈 nudge 轻闪（§0.22+试玩 P2 静音可感知）；skipWatch() 测试钩子直跳 input
- 静置救援：input 期 idle 14s 重播序列（§0.21 天然达标：答案序列视觉重现）；watch 期不救援（演出中）
- 星级：关内敲错次数 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`SI = { get currentLevel, get quiz(){ seq[](键号), phase('watch'|'input'), pos(输入推进位), speed, step, miss }, tapPad(i), autoSolve(), skipWatch() }`
- 语音 clip：si_tut_watch'看！小兔子敲小鼓啦'/si_tut_turn'你来敲一敲'/si_hint'听一听，跟着敲一敲'/si_replay'再看一遍哦'（错键重播时播）

## §3 habit 好习惯排序（生活流程顺序，自理+顺序逻辑）

> **r5 难度改造（2026-09-13）已生效，见 §3-r5**：流程库 6→12（含非熟知因果序）、步数 6-8、纠错反馈去泄序改方向锚、跨序列干扰卡、章结构 ch1 熟知→ch2 因果→ch3 辨析→ch4 混出+长序列。§3 v1 各机制（不灰化款/救援/星级/sayW 口径）不变，冲突处以 §3-r5 为准。

**玩法**：题面=流程名（语音+图标），下方 4-5 张乱序步骤卡（圆底+emoji 大字+步骤短词）。孩子按正确顺序点选：当前应点 steps[pos] 对应卡。点对=卡飞入上方"顺序条"第 pos 位亮起；点错=晃动。全部排对=过题。每关 5 题（5 个流程）。

- 流程库 HABITS（game-data.js，6 流程；步骤序=客观生活常识，verify 逐流程断言非空且 ≥4 步）：
  - 洗手 xishou（5 步）：冲湿手🚿 / 搓泡泡🧼 / 冲干净💧 / 关水🚰 / 擦干🧺
  - 起床 qichuang（5 步）：坐起来🥱 / 穿衣服👕 / 穿鞋袜🧦 / 刷刷牙🪥 / 吃早餐🥣
  - 刷牙 shuaya（4 步）：挤牙膏🧴 / 刷一刷🦷 / 漱漱口💦 / 擦擦嘴😊
  - 穿衣 chuanyi（4 步）：分前后🔍 / 穿袖子🙌 / 拉拉链🧥 / 照镜子✨
  - 过马路 guomal（4 步）：等绿灯🚦 / 左右看👀 / 牵手走🤝 / 到路边🎉
  - 睡觉 shuijiao（5 步）：收玩具🧸 / 洗洗澡🛁 / 刷刷牙🪥 / 听故事📖 / 盖被子😴
  （试玩 P1③ 词短化：2-3 字关键词 21px 大字——17px 六字读不了，静音语义靠猜；词|emoji 与 verify REF 表逐字对账）
- 章型：章 1 洗手+起床+刷牙（5 步；试玩 P2 池扩三流程防"五题洗手×4"重复）；章 2 刷牙+穿衣（4 步）；章 3 过马路+睡觉（4-5 步）；章 4 六流程混合；生成关=流程库轮换（章 1-3 池内流程各 ≥1 仍保证）
- 乱序约束：打乱后必≠原序（verify 断言）；**不灰化款**（每张卡都可能是下一步）——点错晃动可重点，sayW force `q.miss === 2`（batch9 定版）
- 点对：pos++，顺序条位亮起；全对过题（错次累计进星级）
- 静置救援：重读题面（流程名+'先做什么呀'）+ 当前应点卡 pulse 三连脉冲（§0.21；试玩 P3：单次 1.2s 最易错过）
- 星级：关内错次 0=3★ / 1-2=2★ / 更多=1★
- 钩子：`HB = { get currentLevel, get quiz(){ hid(流程 id), name, steps[](步骤 id 正序), shown[](展示乱序索引), pos, answerIdx(当前应点的 shown 索引), step, miss }, tapCard(i), autoSolve() }`
- 语音 clip：hb_tut_watch'看！这些事情有先后哦'/hb_tut_turn'你来排一排'/hb_hint'想一想，先做什么'/hb_q_xishou'洗手'/hb_q_qichuang'起床'/hb_q_shuaya'刷牙'/hb_q_chuanyi'穿衣'/hb_q_guomal'过马路'/hb_q_shuijiao'睡觉'

## §3-r5 habit 难度改造版（r5 delta 定稿，2026-09-13；与 §3 冲突处以本节为准）

**目标**：从「熟知序列 5 步排排」升级为「须推理的步骤序决策」。单关净时长硬指标 ≥45s（6-7 岁），思考占比可证（时序分账见下）。

### r5-1 流程库 12 序列全表（步数 6-8；词|emoji 与 verify SPEC_REF 逐字对账）

旧 6 序列细化（熟知，ch1 底座=前四条；后两条进 ch4 混出池）：
- 洗手 xishou（6）：卷袖子🧣/冲湿手🚿/搓泡泡🧼/冲干净💧/关水🚰/擦干🧺（5→6 细化：加「卷袖子」）
- 起床 qichuang（6）：坐起来🥱/穿衣服👕/穿鞋袜🧦/刷刷牙🪥/洗洗脸💦/吃早餐🥣（5→6：加「洗洗脸」）
- 刷牙 shuaya（6）：拿牙刷🪥/挤牙膏🧴/刷一刷🦷/漱漱口💦/涮杯子🚿/放回去🔄（4→6）
- 穿衣 chuanyi（6）：挑衣服👕/分前后🔍/穿袖子🙌/拉下摆👇/拉拉链🧥/照镜子✨（4→6）
- 过马路 guomal（6）：停一停🛑/等绿灯🚦/左右看👀/牵好手🤝/走过去🚶/到路边🎉（4→6，「牵手走」拆两步）
- 睡觉 shuijiao（6）：收玩具🧸/洗洗澡🛁/刷刷牙🪥/穿睡衣🩳/听故事📖/盖被子😴（5→6：加「穿睡衣」）

新 6 序列（**非熟知因果序**——步骤序须按因果/流程逻辑推理，非生活熟知度秒答）：
- 包饺子 baojiaozi（8）：洗青菜🥬/剁肉馅🔪/和面团🫓/擀饺皮⚪/包饺子🥟/煮饺子🍲/盛碗里🥣/吃饺子😋
- 种花 zhonghua（8）：拿花盆🪴/装满土🪣/挖小坑🕳/放种子🌱/盖上土⛰/浇浇水💧/晒太阳☀️/发芽啦🌿（放种前须先挖坑、盖土；「装满土/盖上土」=同序列近义步）
- 寄信 jixin（7）：找纸笔✏️/想内容🤔/写信📝/折起来📄/装信封✉️/贴邮票🏷/投邮箱📮（「装信封/贴邮票」相邻易混=同序列近义步）
- 烤蛋糕 kaodangao（7）：备材料🥣/打鸡蛋🥚/加面粉🌾/搅面糊🥄/倒模具🧁/进烤箱🔥/装盘🍰
- 洗澡 xizao（6）：脱衣服👕/调水温🚿/洗头发🫧/洗身体🧼/擦干身🧺/穿睡衣🩳（与睡觉「穿睡衣」同词跨序列，按序列判）
- 洗衣服 xiyi（7）：收衣服🧺/翻口袋🔍/放进去🌀/放洗衣液🧴/开机器▶️/晾衣服🎽/叠放好📦

### r5-2 章结构（生成规则，verify 断言）

- ch1 熟知 6 步：池 [xishou, qichuang, shuaya, chuanyi]，5 题池内各 ≥1，**无干扰卡**
- ch2 非熟知因果序：池 [baojiaozi, zhonghua, jixin]（7-8 步），各 ≥1，**无干扰卡**
- ch3 近义步辨析：池 [xizao, xiyi, kaodangao]，各 ≥1，**每题干扰卡恒 2**
- ch4 混出+长序列 & 生成关（flat≥20）：全库 12 取 5 互异 + **保证 ≥2 条 7-8 步长序列**；每题干扰 0-2（seeded）
- 乱序约束承 §3：shown（真实步展示排列）必≠恒等；确定性 seed=mulberry32(flat*7919+13)

### r5-3 干扰与公平（构造保证，structWhy+verify 双断言）

- 卡区结构：`q.cards` = 真实步 {s} 与干扰卡 {d} 交错（6-9 张）；`q.decoys` = [{h,s}] 他序列步骤引用；`answerIdx` = cards 中 {s:pos} 下标（**r5 钩子契约**，tapCard(i) 下标同 cards）
- 干扰恒非本序列步骤（h≠hid）；干扰文本 ∉ 本序列步骤词（同词跨序列不撞本序列，如「穿睡衣」只属当前题时不得为干扰）；干扰文本两两互异
- 同主题优先：THEME=clean[洗手,刷牙,洗澡,洗衣服,睡觉]/kitchen[包饺子,烤蛋糕]/out[过马路,寄信,起床]/clothes[穿衣]/garden[种花]；同主题候选不足 k 回落全库
- MAX_CARDS=9 封顶（n=8→干扰≤1 / n=7→≤2 / n=6→≤2）；DECOY_RULE={1:0, 2:0, 3:2, 4:-1}（-1=seeded 0-2）——四处同步：game-data 定义/game-main 注释/game-verify 断言/build.py 字面 assert
- 点干扰卡 = 错（晃动计 miss，不灰化可重点）——辨析即训练目标；不揭示干扰身份（反馈按位置走锚）

### r5-4 纠错反馈=方向锚（去泄序，verify 负向断言）

- 起点 错（pos=0 且非相邻交换）：`再想一想，一开始先做什么？`（13 码点）
- 中间错（pos>0 且非相邻交换，含点干扰卡）：`这一步要用到上一步的结果吗？`（14 码点=TTS_MAX_CHARS）
- 相邻交换（点到下一步 s===pos+1）：`再想想这两步，谁得等谁？`（12 码点）
- 均 key:null 走 TTS 拼句，estMs=TTS_MAX_CHARS×345+600=14×345+600=5430ms（b25/r4m-5 家族定版，非阻塞不设窗）；**负向铁律**：反馈句禁含任何序列步骤名/流程名（verify 对 SPEC_FEEDBACK 独立重列×SPEC 12 序列词表做零包含断言+运行时实测播句对当前题复核）
- v1 句「再想一想，先做什么呀」退役（对 pos>0 误导+半泄序）

### r5-5 SPEC_DUR 真值表（无头 chromium Audio.metadata 实测，2026-09-13；verify ±60ms 断言）

hb_tut_watch=3384 / hb_tut_turn=1776 / hb_hint=2616 / hb_q_xishou=1464 / hb_q_qichuang=1344 / hb_q_shuaya=1440 / hb_q_chuanyi=1344 / hb_q_guomal=1536 / hb_q_shuijiao=1440 / hb_q_baojiaozi=1560 / hb_q_zhonghua=1368 / hb_q_jixin=1344 / hb_q_kaodangao=1512 / hb_q_xizao=1440 / hb_q_xiyi=1608（ms）
新增 clip 6 条注册进 voice/gen_clips.py ALL（hb_q_baojiaozi/zhonghua/jixin/kaodangao/xizao/xiyi）；manifest 前后对账：本次运行基线 1603（含并行 r5 任务新增键，任务简报数 1593 为更早快照）→ +6 本任务 → 1609，零删除。

### r5-6 时序分账（单关净时长 ≥45s 论证，全部演出参数承 v1 未动）

- 题面语音/题：hb_q clip 均值 1450ms + queue 间隙 150ms + TTS 尾段 estMs(5)=2325ms ≈ 3.9s → 5 题 ≈19.7s（首题开场链 hb_hint+题面另计 ≈+1.5s 增量 → 语音合计 ≈21.2s）
- 演出/步：飞入 420+220=640ms；题末停顿 430ms+入场 stagger（均值 ~280ms）→ 题间 ≈0.7s×4 ≈2.9s
- 步数/关（确定性，章池步数分布推得）：ch1=30 / ch2=37-39 / ch3=32-34 / ch4-gen=32-40 → 演出合计（×0.64s）ch1≈19.2 / ch2≈23.7-25.0 / ch3≈20.5-21.8 / ch4≈20.5-25.6
- **固定下限**（零思考连点）：ch1≈43.3s / ch2≈47.8-49.1 / ch3≈44.6-45.9 / ch4≈44.6-49.7
- **决策次数**：30-40 次步决策/关（ch3/ch4 另有干扰排除负担：6-9 候选含非本序列卡）；6-7 岁点选决策估 0.6-2s/步（2-3 字词认读+因果比较，经验估计非实测）
- **单关净时长** = 固定 43.3-49.7s + 决策 30-40×0.6s(下限)=18-24s → **≥61.3s ≥45s ✓**；思考占比=决策/总：下限估 29-34%，中位估（1s/步）42-46%

### r5-7 布局定案（6-9 卡换行，双 viewport bbox 实测）

- #board 加 flex-wrap:wrap；.card flex-basis 118px（v1 为 1 1 0 单行）：桌面 1280 一行 9 卡（9×118+8×12=1158≤1180）；竖屏 800 一行 6 卡、9 卡换行 6+3
- 顺序条槽恒单行：8 槽桌面 742px/竖屏 694px ≤ 视口
- verify ⑤ 实测（1280×800+800×1180 × 6 卡题+9 卡满载题）：卡 ≥96（实测 cMin 118-130）/槽 ≥64（78-84）/词不溢出/卡两两 bbox 不相交/不溢出舞台/ox=0——全过

### r5-8 钩子契约（r5 版，_selftest 同步）

`HB = { get currentLevel, get quiz(){ hid, name, steps[](步骤 id 正序), shown[](真实步展示排列), decoys[]({h,s} 干扰来源), cards[]({s}|{d} 展示卡), pos, answerIdx(cards 下标), step, miss }, tapCard(i)(cards 下标), autoSolve(), get tutorial }`；structWhy 扩：步骤 6-8、cards=n+decoys≤9、干扰三公平构造、answerIdx 自洽。

## 验收脚本口径（承 batch9）

- 每款 _src/game-verify.js 页面级全量自检（40 关审计+真实 UI 单元+布局双 viewport+**clips 注入 clipOk**+**sayW 三态页面单元**——batch9 m1/M1③ 定版，缺=不收）
- build.py 注入失败 sys.exit(3)+clips 空串断言（batch9 M1）
- 外部复验：首单元门禁+三款全量（真实点击通关以存档 stars≥1 为判据，celebrate 后等 ≥5.2s；错点不重置救援双臂用例；救援视觉重现用例）
