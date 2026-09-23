# SPEC-BATCH11 · 5-6 岁三款（影子配对 / 形状分家 / 大小排序）契约 v1（2026-09-07）

对象：5-6 岁（启蒙段：几乎不识字、认颜色形状、点数 1-10、序概念发展中）。目录 `batch11/shadow|shapeshome|sortsize/`。
结构照 batch1-10：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读）：batch5/connect/_src/（配对引擎+生成干扰池）、batch7/fishcolor/_src/（颜色词 TTS+近似色章+语音前缀 fis）、batch3/countchick/_src/（点选大卡+角标辅助+无限生成）、batch5/spotdiff/_src/（图形生成+布局）。

## §0 共同门禁（历史坑全清单，一项不满足=不收；1-22 全承 batch10 原文）

1. **单文件完全离线**：无 http(s)/外链/字体外链；KIDS core 由 build.py 脚本原样拼接内嵌（禁改内容）；无字面 `</script>`（写 `<\/script>`）
2. **?verify=1 自检**：stub 全部发声 API（KIDS.audio.note/sfx、KIDS.speak、KIDS.voice.play/queue/say）；title='VERIFY PASS n/n'；结果写 #verify-result；winFlow 必须 `if (VERIFY) return;` 早退（不弹层不写档）
3. **确定性生成**：mulberry32(flat*7919+13)；同 flat 两次生成 JSON 一致（verify 断言）；静态 20 关（4 章×5）+无限生成关
4. **章号 1 基**：keyOf=floor(flat/5)+1+'-'+flat%5；进度章号单调递增+难度章号 (ch-1)%4+1 循环；nextHint 参数=flat；章末预告=CHAPTERS[ci+1]（hint 按"预告下一章"语义写）；GEN 文案不带"明天："前缀；启动 dayEnd 的 nextHint 传 lim
5. **语音四包装**：`sayP`（仅 flat<3 播）+ `sayR`（救援/开场/读题/教学，不受 flat 门）+ `sayW` 纠错轻语音（flat<3 每错必播 / flat≥3 走 10s 节流 + **豁免恰一次**——灰化款（错光封顶 miss=2）传 `q._miss >= 2`；**不灰化款（miss 无上限）必须 `=== 2`**，batch9 定版）+ 常规 TTS 用 KIDS.voice.say
6. **教学看-帮-独**：仅 flat0 首次（save.<game>.tutSeen）；看=演示（locked 吞输入，demo 参数豁免）→帮=幽灵手指→独=首次答对放手；教学交接走顺序链（turn clip 播完再读题面——quiet=true + queue([turn, 题面]) 或 qTimer ≥1.8s 接力，禁双通道叠音）
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
16. **第一反应高发的非主交互输入须有轻反馈**（10s 节流 sayR）
17. **选项干扰项**：与答案相近（同相似组/错一属性/相邻序），互异；数值款禁 0 禁负
18. **语音文案与 game-data 表严格一致**：gen_clips.py 从源表正则提取（零手抄）；clip key 全 ASCII
19. **题面指令全语音承载**；5-6 岁零文字依赖（承 batch7 §0.19）：**选项/题面不出现文字标签，emoji/图形大字+语音承载全部语义**（家长面板/底栏图标除外）
20. **底栏按钮守卫**：replayBtn/rabbitBtn/hearBtn 补 `locked||demo||won` 门；主答路径 `const run=cur`+await 后 `if (cur!==run) return` 身份守卫
21. **救援视觉重现**：静置 14s 救援=重读题面 qSpeech + **答案视觉线索**——高亮类（breathe）持续循环在屏或 **pulse 类改三连脉冲**（0/520/1040ms 错峰，batch10 habit 定版），静音环境屏幕可感知；语音-only 救援不收
22. **吞输入期轻反馈**：watch/演出期真实点击被吞时给轻反馈（sfx('pop') 轻叮+等效视觉），返回值/状态不变

## §1 shadow 影子配对（轮廓辨识，配对族；**灰化款**）

**玩法**：题面=一个大彩色 emoji（如 🐱），下方 3-4 张黑色剪影卡（**同款 emoji 加 CSS `filter:brightness(0) opacity(.82)` 生成剪影**——零资源离线），点选与题面轮廓一致的剪影。答对=剪影点亮回彩色+飞到题面旁配对；答错=晃动+错卡灰掉（排除法保底；错卡数=候选数-1，章 1 三选一=2 张、章 2+=3 张，miss 计满错卡数）。

- 剪影库 SHADOW_LIB 16 项（game-data.js；id/emoji/中名/相似组）：
  - 四足组：🐱猫 🐶狗 🐰兔 🐻熊 🐹仓鼠 🦊狐狸
  - 圆物组：🍎苹果 ⚽皮球 🌞太阳 🍊橘子
  - 特色组：⭐星星 🎈气球 🦋蝴蝶 🐠小鱼 🐸青蛙
- 干扰：**同相似组优先**（🐱 干扰=🐶/🐰/🐻 轮廓相近；🍎 干扰=⚽/🌞/🍊），组内不足补邻组
- 章进阶：章 1 三选一（干扰跨组——容易）；章 2 四选一（同组干扰）；章 3 四选一+剪影旋转（正确剪影随机转 90°/180°——轮廓旋转不变性）；章 4 同章 2+3 混合；生成关=随机章参数
- 每关首题热身：章 3/4 首题剪影不旋转（承 batch10 P1②——旋转概念首现给非旋转样本）
- 题面语音：`play('sha_q_'+物 id, '找一找，谁的影子是小猫呀')`——**15 物品题面句全 clip 化**（晓晓；真机反馈 2026-09-07：题面动态 TTS=浏览器系统合成音机械无情感，封闭库全组合建 clip，系统 TTS 仅留缺 clip 兜底）；重听=hearBtn
- 救援（§0.21）：重读题面+正确剪影 breathe 循环
- sayW：灰化款口径 force 传 `q._miss === 2`（首单元门禁实证修订：本款四选一错卡 3 张，miss 可达 3——`>=2` 在第三错会二次豁免；三选一款（chainsum 族）错光恰 2 张两式等价，四选一必须 `===2`，豁免恰一次真值不破）
- 星级：0 错=3★ / 1-2 错=2★ / 更多=1★
- 钩子：`SH = { get currentLevel, get quiz(){ target(id), name, options[](库 id), rot[](各卡旋转度), answerIdx, step, miss, dead[](灰化) }, tapCard(i), autoSolve() }`
- 语音 clip：sha_tut_watch'看！小影子和它的小伙伴'/sha_tut_turn'你来连一连'/sha_hint'找一找一样的影子'（题面动态 TTS 无 clip）

### §1-r8 难度改造块（2026-09-14，AUDIT-56 #13 / 建议行 70；上节 v1 玩法已被本块整体取代）

**背景**：原玩法（1 彩色题面 vs 3-4 剪影单步点选）审计判 3 岁级——实测单关 9-18s 正中"十几秒失兴趣"。r8 升 5-6 岁执行功能档，三机制（delta 定死）：

1. **旋转+部分遮蔽叠加**：全卡随机旋转 0/90/180/270（轮廓心像旋转）；灌木遮蔽层挡卡下方 70% 只露 30% 轮廓（部分轮廓辨识）。**全卡统一遮蔽/全卡随机旋转**（只处理答案卡会反向泄题——元线索禁）；干扰卡旋转含 0、目标卡恒非 0。
2. **多物同框连解（multi）**：题面=3-4 个彩色 emoji 一排（当前目标橙圈高亮，连对项亮绿定格），下方 3-5 张剪影卡（targets+1 干扰）。逐物连对：点对=点亮→消显（.gone 定格防重）→题面高亮移下一目标+播新目标题面句（sha_q_* 逐物复用）；本题全部连完才换题。**点"未来目标卡"=晃动零惩罚不灰**（该卡接下来还要连；miss 照计）；干扰卡错=晃动+灰掉（排除法保底口径不变）。
3. **两物影子重叠拆解（overlap）**：题面=两个剪影错位叠成一团（各 80% 不透明度），选出"这两个是谁的影子"——4 卡双选（2 正确+2 同组干扰）；第一选 .sel 定格+题面对应物点亮，第二选题完成。

**章进阶（4 章×5 关=静态 20 关；生成关 flat≥20 随机 dch 1-4）**：
- ch1「连一连」多物连解：qi0=2 物 3 卡热身；qi1-4=3-4 物+1 干扰（4-5 卡）；零旋转零遮蔽
- ch2「转圈圈」+全卡随机旋转：qi0 热身全 0；qi1-4 multi3 目标卡恒 ∈{90,180,270}、干扰卡 4 向随机
- ch3「灌木丛」+遮蔽叠加：qi0 热身；qi1-4 multi3 全卡 veil+旋转
- ch4「叠罗汉」重叠+混排：qi0 热身；qi1-2 overlap（零转零遮）；qi3-4 multi3 veil+旋转
- 各章 qi0 热身=无本章新维度样本（承 batch10 P1②）；干扰同组优先（round 组 multi4 补邻组合法）；相邻题主目标互异（首目标代表）；CHAPTERS[c].hint=打完第 c 章预告第 c+1 章文案

**时长硬断言（治"十几秒失兴趣"）**：单关推算 = Σ连对步 max(estMs(题面句 12 码点)=4740, 辨识步值 plain 2600/rot 3000/veil 3200) + overlap 2 步×(estMs(20)=7500+3600) + 5×切换 900；**≥40000ms 硬断言**（verify 页内独立副本+verify_one 页外第二副本 50 关双算+与源模型 levelDurMs 对账）；第二道锚=决策步数 ≥13/关（防纯语音窗撑时长）。实测 40 关 min=75,600ms / minSteps=13。estMs 家族定版 `const estMs = n => n * 345 + 600;`（data 定义/main 注释/verify 断言/build 字面四处同步）。

**引擎契约（r8）**：
- q={mode:'multi'|'overlap', targets(=multi 目标序/overlap=pair 双选), options, rot[], veil[](全卡一致), _dim[], _pick[](连对消显), _phase, _miss, _answered}
- `wantOf(q)`=当前应点卡下标（multi=targets[phase] 卡/overlap=pair 首未选卡）——UI 高亮/救援 breathe/autoSolve/verify 驱动共用真值源
- engTap 返回口径不变（right=连对一步或题完成推进/done=通关/wrong=错/again=已灰已消显卡早退）；structWhy 扩展（mode/targets 2-4 互异/overlap pair 同组 4 卡/rot∈{0,90,180,270}/veil 全卡一致）
- 星级口径不变（0 错=3★/≤2 错=2★/else=1★）；sayW force=`q._miss === 2`（multi 未来目标卡错点也计 miss，豁免恰一次真值不破）

**钩子（r8）**：`SH.quiz = { mode, target(当前目标 id), name, targets[], options[], rot[], veil[], answerIdx(=wantOf), phase, picked[](已消显下标), step, miss, dead[] }`

**语音（r8 clip 变更）**：题面句族不变（sha_q_* 15 键逐物复用，multi 换物即换句）。**旧 sha_tut_watch/sha_tut_turn/sha_hint 三键 2026-09-10 起在 manifest 被 batch23/share 同名覆盖（games=['share']，文本=share 的）——shadow 侧改用新键 sha_teach_watch'sha_teach_turn/sha_help（文本一字未改；share 段与其游戏不动）**；新增 sha_q_pair'这两个影子叠在一起啦，找一找是谁的影子呀'（overlap 题面）。gen_clips.py shadow 块注册 4 新键，manifest 1728→1732。

**家族契约**：A=dayEnd 预告传 nextHint(lim - 1)（启动+winFlow 两处）；F=生成关预告实算 GEN_HINTS[genLevel(f + 1).dch - 1] 禁 (ci+1)% 字面；M1=静态章末预告 CHAPTERS[Math.floor(f / CH_LEN) + 1].hint——三者 build.py 源码级断言+verify 页内 nextHint 章末逐点独立副本（文字重列）+verify_one H19 页外副本。

**门禁（r8）**：verify 49 单元（40 关审计含章规则/旋转三向覆盖/重叠双选/遮蔽几何/时长双锚/nextHint 副本）+_selftest 47 项（教学/写档/救援/双 viewport/遮蔽几何截图）+verify_one 24 项（H14a-H19 新增章型/时长/连解/重叠/旋转遮蔽/nextHint）+verify_batch11 姊妹回归 4/4+verify_voice shadow 22 键。

## §2 shapeshome 形状分家（r8 难度改造 2026-09-14，AUDIT-56 #14；**灰化款**）

> r8 前形态（双维分类：色×形 3 选 1，4 岁级，实测单关 10-18s 判红）已由下述三新题型整体替换；
> 维度表/演出/教学/救援骨架承旧版。改造 delta：①三维匹配 ②否定条件 ③九宫格缺格推理。

**玩法**：题面=一个"家"卡或九宫格，下方 3 张图形卡。答对=图形飞进家（九宫格=飞进缺格并填入）+家亮灯；答错=晃动+灰掉。

- 维度表（game-data.js）：颜色 6=红#E0503C/黄#F5C445/蓝#6E9BD8/绿#8FBF7F/橙#F0913D/紫#A884C9；形状 4=圆形●/方形■/三角形▲/五角星★；**大小 2=大(全幅)/小(0.6 盒内缩放，svg 盒恒 92px 触摸面不变)**（内嵌 SVG 描线风，batch9 图形先例）；近似色对：红↔橙、蓝↔紫
- 章（kind=题型；每章 5 关、静态 20 关+无限生成关，生成关确定性 mulberry32(flat*7919+13)）：
  - 章 1 **tri 三维匹配**：家=tc 色+ts 形+tz 大小（屋顶山墙圆窗内目标图形按 tz 缩放），点与家**色+形+大小三维全同**的卡；干扰恰与目标**差一维**（近干扰非远干扰）：A=同色同形翻大小；B=恰差形状 或 恰差非近似色（rnd 二选一）；首题热身=两干扰各差 ≥2 维
  - 章 2 **neg 否定条件**：语音「找一找，不是X色、也不是Y形的」+家卡图示双锚（屋顶两枚**划掉徽章**：禁色圆片✗/禁形描线✗，山墙圆窗=大问号），点**唯一满足两否定条件**的卡（5-6 岁执行功能：抑制优势反应）；干扰各违反恰一条件（色侧 c==nc / 形侧 s==ns 各一）；首题热身=一干扰双条件全违反+一形侧单违反；本章色域与禁色**非近似**（近似辨析留章 4）
  - 章 3 **grid 九宫格缺格推理**：3×3 阵列（HTML grid，§0.15）**行恒形（行间互异）/列恒色（列间两两非近似）**，随机缺格画 ?（虚线框+大问号符号，语音"问号"锚定），从 3 候选补缺；正确=(所在列恒色,所在行恒形)；干扰各**恰对一规则**（同列色异行形 / 异列色同行形——干扰色形均取自网格本体）；首题热身=两干扰双规则全违反
  - 章 4 **mix 混排**：题序 kind 循环 [tri,neg,grid,tri,neg]；首题=标准参数（已学形态热身），第 2 题起 hard：tri-hard 目标色∈近似域且色维干扰=nearOf(tc)；neg-hard 目标色=nearOf(nc)（禁色的近似色，抑制+辨析双负荷）；grid-hard 列色恰含一组近似对；生成关（flat≥20）=随机章参数（1-4），章内首题热身同静态章
- 每关首题热身（承家族约定）：新机制首现给全违反档干扰（比"恰差一维/恰违反一"易排除）
- 题面语音（r8 全 clip 化，题句拼式在 game-data 与 gen_clips.py 双处严格一致）：tri=`shp_q3_{色}_{形}_{大小}` 48 条'找一找，黄色的大三角形'；neg=`shp_nq_{色}_{形}` 24 条'找一找，不是红色、也不是圆形的'；grid=`shp_gq` 固定句'看一看，每行形状一样，每列颜色一样，问号是哪一个'；章 2/3/4 首关（flat5/10/15）开场链插规则句 shp_rule_neg/grid/mix；**开场链=KIDS.voice.queue([hint,(规则),题面]) 按 clip 实际时长 onended 接力**（r8 规则句变长，固定延时窗会截断）；既有 33 键（shp_tut_*/shp_hint/shp_q_ 28/shp_rule2/3）文本一字不改不删注册（旧 shp_q_*/rule2/3 留存不再引用）
- estMs 家族定版 `const estMs = n => n * 345 + 600;`（r8 涉语音窗启用；源+注释+verify+build 四处同步，禁 +300 变体）；**单关时长硬断言**：modeled=Σ题[estMs(题句码点)+DECIDE{tri:4200,neg:5600,grid:7000}+980] ≥40000ms/关（verify 页内 40 关 min 断言+题句独立副本逐字符对账；verify_one python 复核 minMs≥40000）
- nextHint（r7 M1+家族 A/F 契约）：静态段（f<20，含 f=19 末章章末）=CHAPTERS[floor(f/CH_LEN)+1].hint；生成段（f≥20）=GEN_HINTS[genLevel(f+1).dch-1] 实算（禁 (ci+1)%4 字面）；dayEnd 两处（winFlow dayDone+启动分支）传 nextHint(lim - 1)
- 首错不 pulse 正确卡（§0.7）；miss≥2 正确卡 pulse 触发一次；救援=重读题面+正确卡 breathe 持续循环
- sayW：灰化款 `q._miss >= 2`（三选一错光恰 2 张，两式等价）
- 钩子：`SP = { get currentLevel, get quiz(){ kind('tri'|'neg'|'grid'), tri:tc/ts/tz | neg:nc/ns | grid:rows[3]/cols[3]/miss{r,c}, options[]({c,s,z}), answerIdx, step, missCount, dead[] }, tapCard(i), autoSolve(), get tutorial }`（grid 的 miss=缺格位置、missCount=错点数，两键分离）
- 语音 clip：既有 shp_tut_watch/shp_tut_turn/shp_hint 三条文本不变；r8 新增 76 键（shp_q3_ 48+shp_nq_ 24+shp_gq+shp_rule_neg/grid/mix）

## §3 sortsize 大小排序（序概念 3-5 物；**不灰化款**）

**玩法**：题面语音给方向（**从最大的开始**/**从最小的开始**），下方 3-5 个同种 emoji（font-size 级差缩放，互异大小），按序逐个点选。点对=emoji 飞入上方排序条下一格；点错=晃动（不灰化——每张都可能是下一步）。全排完=过题。

- 大小规格（game-data.js SIZE_LADDER；级差保证视觉可判）：
  - 明显档级差 ≈1.5（如 34/51/77px 基准）；相近档级差 ≈1.18（5-6 岁相近大小辨析=章 4 难点）
  - 同题 emoji 互异大小（verify 断言两两比 ≠1）；同种 emoji 一题一种（猫一题/球一题——序比较不被种类干扰）
- 章进阶：章 1 三物从大到小（明显档）；章 2 四物从大到小（明显档）；章 3 四物**方向混合**（从大到小/从小到大 语音+视觉箭头双承载）；章 4 五物+相近档+方向混合；生成关=随机章参数
- 每关首题热身：ch3/4 首题=从大到小（方向混合章首现仍用已学方向；从小到大首现放在第 2 题起）
- **方向视觉承载（零文字依赖）**：排序条起点端画大象→蚂蚁 渐变示意图标（大到小）或蚂蚁→大象（小到大）+箭头；题面/救援语音重申方向
- 点选判定：第 pos 步应点=剩余物中最大（或最小）——引擎 answerIdx 动态计算；verify 断言逐点后 answerIdx 重算正确
- 题面语音：`queue([{key:'sor_q_big'/'sor_q_small', text:方向句}])`——**方向句 2 条 clip 化**（真机反馈同 §1）；救援 hint 文案改中性"比一比大小，排一排试试哦"（试玩 P2④：原"听一听"静音场景自相矛盾）
- 救援：重读题面（含方向）+应点物 **pulse 三连脉冲**（§0.21 batch10 定版）
- sayW：不灰化款 `q.miss === 2`（batch9 定版）
- 钩子：`SO = { get currentLevel, get quiz(){ kind(emoji id), order('big'|'small'), items[](大小基准数组), left[](剩余索引), pos, answerIdx, step, miss }, tapCard(i), autoSolve() }`
- 语音 clip：sor_tut_watch'看！大个小个排排队'/sor_tut_turn'你来排一排'/sor_hint'听一听，从哪个开始'（题面方向动态 TTS 无 clip）

## 语音与验收

- gen_clips.py：ALL 数组加 'shadow','shapeshome','sortsize'；三款指令句各 3 条+**题面句 47 条 clip 化**（shadow 15 物品 LIB 正则提取 / shp 6色×4形+4 纯形 COLORS·SHAPES 表提取+规则句 2 / sor 方向句 2——真机反馈 2026-09-07 题面动态 TTS 机械音，封闭库全 clip 化走晓晓，manifest 460→507）
- 三款 verify 必含：40 关全量审计（生成规则/干扰约束/级差/旋转/热身）+确定性+引擎直驱+教学链+sayW 三态+clipOk+开场链+双 viewport+冒烟
- 首单元门禁（batch-verify）：首款全指标过闸才放其余复验：verify 全 PASS+无头真实点击通关+双 viewport+离线+截图像素非空白+钩子齐
- **r8（2026-09-14，shapeshome 难度改造）**：manifest 1810=1734+76（shp 新增 shp_q3_ 48/shp_nq_ 24/shp_gq/规则 3）；shp verify 增 12 单元口径（三题型规则+hard 参数+混排题序+时长硬断言 ≥40s modeled+nextHint M1/F 独立副本）；verify_voice shp EXPECT 补新键

### §3-r19 难度改造块（2026-09-18，AUDIT-56 #15 黄款；上节 §3 v1 玩法已被本块整体取代）

**改造 delta（审计建议定版）**：目标 6-7 岁（审计判现 4 岁级、实测 39s/关）→ ①6-7 物相近档全排序（尺寸梯度收窄需逐对比较）②双属性排序（先大小再颜色稳定双键）③「第 N 大/第 N 小」序数单点题④DECIDE_MS 认知时长模型联动（modeled verify+selftest 双钉精确一致禁约数）。每关仍 5 题（CH_LEN=5）。

**三题型与章型**（pdch=难度章号 1-4；生成关 flat≥20 随机 pdch；种子 mulberry32(flat×7919+13)）：
- **sort 全排序**：6-7 物单种 emoji 相近档，按方向逐个点选（先大/先小）——同 §3 v1 但物数 3-5→6-7、级差收窄
- **dual 双属性**：3 档尺寸×每档恰一红一蓝皮球（6 物），先按大小排，同大小比颜色（首色在前）——题面句 `从最大的开始排，一样大的，红皮球排在前面`（20 字）
- **ord 序数**：点「第 N 大/N 小」的那一个，单点即完题；题面句 `从最大的开始数，第X个，是哪一个呀`（17 字）；题面锚=n 圆点按尺寸降/升序排列+第 rank 位橙圈呼吸（视觉序=尺寸序，与展示乱序区隔防"第 N 个"位置混淆）；排序条=单槽大格（槽内数字=rank）
- 章型：ch1 sort 6-7 物相近档（方向恒 big，方向隔离）；ch2 +方向混合（qi1 首现 small）；ch3 dual（qi0 热身=明显档 first=r）；ch4 ord（qi0 热身=obv6 rank2 / qi3 首现第N小 / qi4 dual 回顾混排）；生成关按 pdch 取章型
- 每关 sort/ord 题种互异（KIND_IDS 8 种洗牌取用）；混合章每关 ≥1 small（全 big 则末槽强制）

**§1 梯度表（SIZE_LADDER，级差带 RATIO_BAND obvious=[1.40,1.62] / close=[1.10,1.26]）**：
| tier | 基准(px) | 用途 | 相邻级差实测 |
|---|---|---|---|
| obv6 | 19,27,39,55,77,108 | 热身/序数底座 | 1.42/1.44/1.41/1.40/1.40 |
| close6 | 34,40,47,55,64,75 | ch1-2 相近 6 物 | 1.18/1.18/1.17/1.16/1.17 |
| close7 | 32,38,44,52,61,71,84 | ch1-2/4 相近 7 物 | 1.19/1.16/1.18/1.17/1.16/1.18 |
| dualObv | 30,45,68 | ch3 热身明显档 | 1.50/1.51 |
| dualClose | 40,47,55 | ch3 主档 | 1.18/1.17 |
先验依据：明显档相邻比 ≥1.40（4 岁一眼可辨基准沿用）；相近档 1.10-1.26（6-7 岁逐对比较带；下界 1.10=同排相邻贴靠仍可辨，上界 1.26=不回到一眼可辨）。verify 断言阶梯逐值+级差逐对落带+两两互异（sort/ord）。

**§2 双属性规则表（唯一解先验）**：
| 规则 | 先验 | 引擎锚 |
|---|---|---|
| 每档恰一红一蓝 | (尺寸,颜色) 对两两互异 → 双键全序唯一解（防"怎么排都对"歧义） | `c.r !== 1 || c.b !== 1` → 'pair' |
| 同大小比颜色 | 首色（题面句指定红/蓝在前）在前 | `q.colors[a] === q.first` |
| 展示弱非单调 | 含平局序列也不许整排已排好 | weakMono 重洗（guard 24） |
| 方向/首色翻转 | 热身钉 first=r，其余随机（big/small × r/b 四句） | QUIZ_PLAN[3].qi0 钉死 |

**§3 序数域**：rank∈[2, n-2]（6 物 → 2-4；7 物 → 2-5）——禁 1（=极值退化成 sort 第一步）与边缘（n-1/n 仍偏端）；第N小首现收窄 [2,3]（ch4 qi3）；verify 断言 `q.rank < 2 || q.rank > n - 2` → 'rank' + 热身槽 rank 钉死对账 + answerIdx 独立重算器（≠位置序）。

**§4 时长模型（DECIDE_MS 联动，modeled 双钉）**：`quizDurMs = estMs(题句) + Σ(STEP_MS) + SWITCH_MS`；estMs=`s.length*345+600`（吃字符串）；STEP_MS={obv6:1500, close6:2100, close7:2300, dualObv:2800, dualClose:3400}（每物点选决策窗，相近档/双键更长）；ORD_MS={obv6:4200, close7:7600}（序数=全序列心算+数数，单点大窗）；SWITCH_MS=400。章关时长：ch1=88650 / ch2=95750 / ch3=137900 / ch4=82760（min）；**verify 断言 modeled(0)===88650、40 关 min===82760、max===137900（禁约数）+ verify 独立 SPEC 计划复算逐章对账**；_selftest 同值双钉；build 算术门同值。

**§5 语音（17 sor_ + 3 core_ = 20 clips）**：新增 12 键（主线 gen_clips 登记，games=['sortsize']）：sor_q_dbr/dbb/dsr/dsb（双属性 4 句）+ sor_q_ob2-5/os2-5（序数 8 句）；qSpeech/qKeyOf 三族分流；题面/救援/重听共用同键同句。verify_voice EXPECT 规则 `k.startswith('sor_q_')` 动态覆盖新键（零共享改动）。**预留键标注（09-19 r19 审查 s-minor-1）**：sor_q_os4/os5 为预留键——第N小方向序数仅 ch4 qi3 一槽且 §3 恒收窄 rank∈[2,3]，rank 4/5 构造性不可触达，两键已合成注入但运行时永不播放（SPEC 级冗余非实现漂移，r19 内不动 modeled；若未来放宽 §3 收窄带则自动激活）。

**§6 竖屏双通道**：@media(orientation:portrait) 与 body.port 类通道 15 行逐行全等（build regex 对比+selftest 槽宽三向锚 84/76/76、ord 110/96/96）；emoji 盒=1em（`inline-block;width:1em;text-align:center`——emoji 字体字宽 ~1.37em 不再撑盒）；竖屏卡 min-height 128。

**§7 键基不变决策**：CH_LEN=5 / STATIC_LEVELS=20 / keyOf=floor(flat/5)+1+'-'+flat%5 全部不变——r19 改造零迁移 IIFE，换取共享驱动种档兼容最大化；原「迁移三例」以**存量档兼容三例**等价覆盖（全旧基完成档保留+日末面板 / 含生成关 ch≥5 键保留+续玩 / 脏键 1-9 无害不清洗——_selftest 2g）。

**§8 家族契约实现索引**：A 双 `nextHint(lim-1)`+`Math.max(0,lim-1)`；B 救援双锚 14s/30s（lastDir 独立节流；14s=重读题面+题面卡 pulse 不泄答案，30s=应点卡 breathe）；D 吞输入容器 bump（含契约 I 窗内吞）；E `sv.sortsize.tutSeen` 教学子键先查；F `GEN_HINTS[genLevel(f+1).dch-1]`；I 错反馈豁免窗=estMs(wrong)+300=4350（窗内错点吞对选放行+救援让路+startLevel 重置）；J sayW 10s 节流+miss===2 force+返 bool 起播才设窗；K rescueTick 命名函数+面板守卫；N/Mj-1 题面链全 keyed（keyless 恒链尾，本款无 keyless 段）；E-M2 verify 独立第 4 script 块（旧 b11 3 块→4 块，`html.count('<script>')==4`+script[2] 源码断言+检索串拼接防自匹配）。

**§9 verify 墙钟标注**：verify 页 SPEED=0.12（演出 8 倍速），但契约 I 豁免窗等待为真时钟（② `wait(4450)` ×2、③ `wait(4450)`）——总墙钟 ≈30s < 100s（r18 坑：>100s 须 SPEC 标注，本款达标）。
