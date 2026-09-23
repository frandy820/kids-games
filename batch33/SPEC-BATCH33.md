# SPEC-BATCH33 · 扩容批 3（听音计数 / 方位词图阵 / 机器画师）契约 v1（2026-09-11）

对象：120 款扩容第 3 批（每段各 1 款）。目录 `batch33/soundcount|position|robotpaint/`。
结构照 batch1-32：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch32/senses/_src/（图卡点选+平铺 quiz——soundcount 同构）、batch30/maze/_src/ 或 batch13/grid/_src/（格点选——position 参照）、batch32/robotdance/_src/（块点选填槽+契约 M 帧内容断言——robotpaint 参照）、batch10/simon/_src/（听觉序列节拍——soundcount 播放器参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-78 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b32 定版，一项违反=审查 Major 起步）：A-O+I 补全承 SPEC-BATCH32 §0 括注原文（A 启动 dayEnd nextHint(lim-1)/winFlow null；B 救援钟双锚；C 预置存档 v:'1.0'；D 吞输入轻叮配 bump；E 修复收窄先查教学特例；F 章末 hint=预告下一章+生成关 nextHint 实算 genLevel(f+1).dch-1；G 拼播链后窗=链总实长+300；H 判对窗=clip+300；TTS 窗=estMs(len*345+600)+300+build 静态断言；I+I 补 错链豁免窗 wrongChainUntil 真时钟+guard 条件式（错点吞/对选放行/窗后二错照计 miss）+startLevel 重置；J 错反馈语义句 flat≥3 只 10s 节流；K rescueTick 面板在场守卫；L TTS 数字/量词映射表覆盖封闭集全量值；M 变换演出族 verify 必带帧内容断言；N keyless TTS 段恒链尾；O 款内自建 button 显式 color 类〕**。

79. **soundcount 听音计数真值**（5-6 段，记忆/数感·听觉计数；原调研 6-7 标注，**本批降坡 5-6 实态**——EXPANSION 排期节明示）：**数字域封闭 1-5**（数字名音 5，数字卡 SVG 5=数字大字+对应点数圆点）；**题型两族**——**counthear**（单音色：播鼓 N 下——鼓图逐击 bounce 视锚同步（5-6 岁听觉工作记忆弱，视锚恒在不撤，ch 不升不撤——降坡核心），段间 700ms 可数节奏，播完「敲了几下呀」→数字卡点选）与 **countmix**（ch3+：鼓 N 下+铃 M 下混排（音色间可相邻），「鼓敲了几下呀」=选择性计数只数鼓，铃=干扰音色；**先验：N∈3-5 且 M∈1-2 且 N+M≤6**（总击数不超 6=5-6 岁计数上限），鼓图只对鼓击 bounce（视锚同选择性））；**候选数学先验**：数字卡互异含真值⊆1-5（ch1 2 卡/ch2 3 卡/ch3+ 4 卡）；章：ch1 N∈2-3/ch2 N∈3-4（以上全 counthear）/ch3 countmix（N∈3-5+M∈1-2）/ch4 生成两族混出 seeded `mulberry32(flat*7919+733)`（counthear N∈2-5/countmix 同 ch3 域）；每关 5 题；星级=miss 口径；错反馈：首错「再听一遍呀」（方向级=自动重播一遍+数字卡排 bump）；miss≥2=正确数字卡 breathe（答案级）；判对确认=right+数字名音拼播（名音 keyless 前于 right？——**契约 N：名音段有 key=cnt_n_<n>，right 段有 key，无 keyless 段=天然安全**）；重听按钮常驻（题面问句播后可点，replay=整段重播+视锚重放，节流 3s）；卡面零文字数字卡用「数字字+圆点」（5-6 岁认数字形+点数双通道——数字字≠文字墙，是数学符号，允许）

80. **position 方位词图阵真值**（6-7 段，空间/语言·方位词；调研深化点=自身参照→物为参照）：**方位封闭 6**：front 前面/back 后面/left 左边/right 右边/up 上面/down 下面（**左右=6-7 巩固期难点，ch1-2 不出现，ch3 引入**）；**场景=树+兔子**（树 SVG 恒中央，兔子落位六格之一：格子=树周围 2×3 布局带浅色虚线框——上面/下面=树正上/正下格）；**题型两族**——**findpos**（正向：「兔子在树的哪里呀」场景定格兔子在 X 位 → 点方位格答 X——**答的是方位不是位置**：点「与兔子所在方位语义一致的方位标签格」？——**定版简化：题面问句+六方位格中兔子正坐在其中一格，点兔子所在格即答**（点对=理解「问句所指=兔子位置」；方位词由问句+确认链承载：「兔子在树的**前面**呀」名音拼播强化词音绑定）；**placepos**（反向 ch3+：「把兔子放到树的后面」→ 点目标方位格放兔子（兔子从手中飞入格）——**先验：目标≠兔子当前位（当前位格禁选？否——点错格=wrong 含当前位）**）；**候选数学先验**：六格恒全摆（空间全域可点）；章：ch1 前后上下 4 方位域（左右格隐藏不渲染——域内点选）/ch2 同 4 域+兔子初始位高亮消失（纯看图）/ch3 6 方位全域+两族混出/ch4 生成混合 seeded `mulberry32(flat*7919+977)`（ch4 全 6 方位域）；每关 5 题；**参照系纪律（物为参照）**：左右=**以树的视角还是孩子视角**——**定版=孩子视角（树面对孩子，树的左边=画面右边？——否，6-7 岁物参照未建立，画面左右=孩子左右（自身参照），SPEC 明示「本款全孩子视角，物参照系留 b34+」）；SVG：树居中+六格虚框+兔子（前=树前地面近景/后=树后远景小一点——**前后用近大远小+遮挡（前格兔子盖住树干下段=前，后格树盖住兔子=后）**，上=树冠上格/下=树根下格，左/右=树两侧）；错反馈：首错「再看看，兔子在哪边」（方向级=兔子 pulse）；miss≥2=正确格 breathe（答案级——placepos 时不 breathe 目标格（泄答案）而 breathe 方位词卡？**定版：miss≥2 正确格 breathe 恒用（findpos 泄兔子位=答案级脚手架家族梯度合法；placepos 同）**）；判对确认=right+方位名音拼播（「兔子在树的前面呀」=TTS 拼句带方位词，方位词恒入 TTS 封闭表（契约 L：六词全覆盖））；星级=miss 口径

81. **robotpaint 机器画师真值**（7-8 段，计算思维·指令精确性；**文案红线：不宣称「训练 AI 素养」——落「精确表达/当好小老师」表述**（EXPANSION 排期节+调研风险节 5 明示））：**属性封闭三轴**：颜色 3（red 红/yel 黄/blu 蓝）×形状 3（cir 圆/squ 方/tri 三角）×大小 2（big 大/small 小）=**目标空间 18 组合**；**玩法=组指令→画师执行→比对**：目标图案卡（如红色大圆形=纯 SVG 无文字属性自明）+ 指令槽 3（颜色/形状/大小，槽位固定序=属性轴标签恒在槽上）+ 属性块候选区（每轴 3/3/2 块，**干扰=非目标属性的全量在场**——候选恒全摆 8 块（3+3+2），轴内互异）；儿童**按槽点选**（当前槽高亮=哪个轴待选）：点块→填入当前槽+块 pop+下一槽高亮；三槽满→「画！」按钮亮起→画师逐属性动画作画（画布上：先颜色底→再形状轮廓→再大小缩放，每属性 ~800ms 演出）→成品与目标并排比对：**三元组全对=像（right+「画得真像」）/任一属性错=画出「不像」图案（错轴可视化：错颜色=画成该色（颜色本身对但非目标色）/错形状=画成该形/错大小=画成该尺寸——**画师忠实执行指令**，不像=指令不精确，教育核心具象化）+wrong+「哪不一样呀」**；**已填槽可改**（点已填槽=该槽清空回到该轴选择——**与 robotdance 不回退不同：本款指令可编辑（精确表达=反复调整），SPEC 明示**）；**数学先验**：目标三元组互异轴恒成立（轴独立）；章难度=**指令序复杂度**：ch1 目标域=颜色+形状两轴（大小槽预填「大」灰显不可改——2 指令）/ch2 三轴全（3 指令）/ch3 三轴+成品比对窗加「找不同」辅助（错题时并排 pulse 不一致轴——**答案级辅助前移？否：miss≥2 才 pulse 不一致轴（方向级=首错只说「哪不一样呀」不指轴）**）/ch4 生成 seeded `mulberry32(flat*7919+1151)`（三轴全域 18 组合）；每关 5 题；星级=miss 口径（**错=整题重画不计单槽**——点「画！」才判，判错 miss+1 槽保留可改）；错反馈：首错「哪不一样呀，再看看」（方向级=成品与目标并排轻微晃动）；miss≥2=不一致轴的属性块 breathe（答案级——精确指到错轴的应选块）；判对确认=right+「画得真像」+属性三元组名音拼播（红/大/圆形 按槽序，名音 keyless 无——名音均有 key）；重画按钮（wrong 后常驻=改槽重画）；文案：「小画师听你的指令画画，说得越清楚画得越像」——**当小老师/精确表达措辞，禁 AI 词汇**。〔§5 补明（审查 R-1 复裁 2026-09-11）：**生成关 flat≥20 dch 恒 4**——「ch4 生成（三轴全域 18 组合）」括注=生成关域承诺全域；dch1 域=颜色×形状×恒 big 仅 6 组合空间，随机 dch 落 dch1 即破坏 18 组合承诺，恒 dch4 是唯一满足该承诺的实现（SC/PS 的同构括注在 dch1-4 域均成立故随机合法——句式同构但语义约束不同）。tapBlock 异轴返回 false（吞+当前槽 flash 方向级，不判 miss）——SPEC 枚举外补 false 值（审查 R-3 口径）〕

## §1 soundcount 听音计数（5-6 段·听觉计数）

**玩法**：播音（鼓图逐击 bounce 视锚）→数字卡点选。
- 教学：watch=幽灵手指看播 3 下鼓（逐击 bounce）→点数字 3 卡「敲了几下呀」→点中；turn=你来数一数（2 下）帮/独；`__scDemoR`
- 钩子：`SC = { get currentLevel, get quiz(){ kind('counthear'|'countmix'), count(鼓次数真值), mix(铃次数或 0), seq[](击序数组 'b'/'d'——countmix 混排真值), opts[](数字卡 {num}), answer, step, miss }, tapOpt(i), start(flat), autoSolve(), replay() }`——tapOpt 返回：对 'right'/末题 'done'/错 'wrong'/越界 null；replay=整段重播（题面后可用，3s 节流）
- 语音：sc_tut_watch'看！听一听数一数'/sc_tut_turn'你来数一数'/sc_hint'再听一遍呀'/sc_right'数对啦，真棒'/sc_wrong'再想一想'/sc_q1'敲了几下呀'/sc_q2'鼓敲了几下'/sc_replay'再听一遍'（**前缀=sc_ 已核 manifest 无占用**；名音 sc_n_<1-5>×5=晓晓读数字（一下/两下/三下/四下/五下——量词「下」入名音）；确认链=right+名音拼播）

## §2 position 方位词图阵（6-7 段·方位词）

**玩法**：树+六方位格场景，findpos 点兔子位/placepos 放兔子。
- 教学：watch=幽灵手指看「兔子在树的前面」场景→点前面格（兔子位）→点中；turn=你来放一放（placepos 前面）帮/独；`__psDemoR`
- 钩子：`PS = { get currentLevel, get quiz(){ kind('findpos'|'placepos'), ask(方位 id——findpos=问句方位即兔子位/placepos=指令目标位), cells[](格子 {pos}——ch1-2 只 4 格域), bunnyAt(兔子当前格 pos), answer(目标格 cells 下标), step, miss }, tapCell(i), start(flat), autoSolve() }`——tapCell 返回：对 'right'/末题 'done'/错 'wrong'/越界 null
- 语音：ps_tut_watch'看！兔子在哪里呀'/ps_tut_turn'你来放一放'/ps_hint'再看看，兔子在哪边'/ps_right'放对啦，真棒'/ps_wrong'再想一想'/ps_q1'兔子在树的哪里呀'/ps_q2'把兔子放到'（**前缀=ps_ 已核无占用**；名音 ps_n_<id>×6=晓晓读（前面/后面/左边/右边/上面/下面）；确认链=right+TTS 拼句「兔子在树的+方位名音+呀」——名音段 key 后接 TTS 段=**keyless TTS 段在尾，契约 N 恰好合法**（TTS 段「呀」恒尾）；q2 指令链=「把兔子放到」+方位名音（keyless TTS 段 mid-链=**违约风险：q2 链改 TTS 全句「把兔子放到树的后面」（六句全封闭入 TTS 表，契约 L 覆盖 6 词×全句式），禁名音拼播 mid 链**）

## §3 robotpaint 机器画师（7-8 段·指令精确性）

**玩法**：目标图案+指令槽+属性块，组指令→画→比对。
- 教学：watch=幽灵手指看目标（红色大圆形）→按槽序点红/圆/大块→「画！」→像；turn=你来当小老师（黄色小方形）帮/独；`__rpDemoR`
- 钩子：`RP = { get currentLevel, get quiz(){ target{color,shape,size}(三元组真值), slots[](三槽已填 {axis,val} 或 null——ch1 大小槽预填 {axis:'size',val:'big'} 锁定), slotIdx(当前待填槽下标), blocks[](属性块池 {axis,val} 恒 8), phase('pick'|'paint'|'compare'|'won'), painted{color,shape,size}(画师成品——paint 后有值), step, miss }, tapBlock(i), tapSlot(i)(点已填槽清空——pick 相位), tapGo()('画！'——三槽满时), start(flat), autoSolve() }`——tapBlock 返回：填 'fill'/末槽 'ready'(三槽满待画)/错轴？——**无错选概念（属性块无对错，错在组合）——tapBlock 恒 fill（块=轴内合法值）**；判定集中在 tapGo：三元组全对 'right'（末题 'done'）/任一错 'wrong'（miss+1，槽保留可改）；tapSlot 返回 'clear'/null（空槽或锁定槽）
- 语音：rp_tut_watch'看！小画师要画画啦'/rp_tut_turn'你来当小老师'/rp_hint'哪不一样呀，再看看'/rp_right'画得真像，你真是好老师'/rp_wrong'哪不一样呀'/rp_q'说清楚要什么'/rp_go'画！'/rp_like'画得真像'（**前缀=rp_ 已核无占用**；名音 rp_n_<id>×8=晓晓读（红色/黄色/蓝色/圆形/方形/三角形/大大的/小小的）；确认链=right+三元组名音拼播按槽序（颜色→形状→大小）——**ch1 大小预填不重读（预填非儿童指令），ch1 确认链=颜色+形状名音**）

## §4 交付与验收（承 batch15-32 流水线）

语音预合成（gen_clips.py 扩 batch33 块：sc_ 13 条（通用 8+名音×5）/ps_ 13 条（通用 7+名音×6）/rp_ 16 条（通用 8+名音×8）=**42 条**；前缀 sc_/ps_/rp_ 已核 manifest 无占用 ✓ 2026-09-11 实查）→ 3 agent 并行（任务书必带：契约 A-O+I 补逐条+§0.79-81 数学先验逐条+钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>（b29 坑⑥）/契约 M 帧内容断言（robotpaint painted 三元组逐属性断言+position 兔子格位断言+soundcount 击序视锚断言）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact/verify 页先等 title=VERIFY PASS 再驱动/**无头测试 --mute-audio+stub 发声（防外放——b32 定版纪律）**/**相位型款驱动须等相位（robotpaint pick 相位才可点块——b32 坑②）**）→ 首单元门禁（gate_common33.py：SC/PS/RP 钩子映射）→ 探针定钩子语义 → 独立复验（verify_batch33.py T1-T11+T9b）→ 全量回归（verify_final33.py R1-R8；R6 主入口 96→99）→ 两级入口 → 反方审查+分龄试玩（soundcount=5.5 岁/position=6 岁半/robotpaint=7 岁半）→ 修复闭环 → 收官（99/120）

**实长表（浏览器 Audio 实测 2026-09-11；等待窗=实长+300 余量；全表 42 条零缺漏 bad=[]）**：
- **sc_**：tut_watch 3144/tut_turn 1896/hint 1824/**right 2304（判对后窗 ≥2604）**/wrong 1656/q1 1752/q2 1848/replay 1656；名音 sc_n_* **max 1416**（5 条——确认链=right+150+名音 ≥4170；**sc 错链=wrong 1656+150+hint 1824+300=3930**）
- **ps_**：tut_watch 3024/tut_turn 1776/hint 2856/**right 2280（判对后窗 ≥2580）**/wrong 1656/q1 2328/q2 1896；名音 ps_n_* **max 1416**（6 条）；确认链=right+TTS 拼句「兔子在树的+方位+呀」（名音 max 1416+TTS 尾段「呀」——**名音段在 TTS 段前=契约 N keyless 尾合法**）；q2 指令=TTS 全句「把兔子放到树的后面」（9 字 estMs=3705+300，六方位全句式入 TTS 封闭表）；**ps 错链=wrong 1656+150+hint 2856+300=4962**
- **rp_**：tut_watch 3384/tut_turn 2016/hint 2712/**right 3216（判对后窗 ≥3516）**/wrong 1848/q 2040/go 1176/like 1752；名音 rp_n_* **max 1656**（tri，8 条）；确认链=right+150+属性名音按槽序（ch2/3 三段 max≈4968+300；**ch1 两轴两段**）；**rp 错链=wrong 1848+150+hint 2712+300=5010**；「画！」演出窗=三属性动画 3×800+go 1176+300 ≥3876（paint 相位锁定窗）
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

**语音清单硬指标**：manifest 42 条合成 ok=42 fail=0（实测 ✅ 34.7s）；gate G3 注入数 13/13/16+core 3。

## §5 反方审查+试玩修复记录（收官回填）

**独立复验（verify_batch33.py T1-T11+T9b，断言从 SPEC 独立硬编码）**：三款 **12/12×3** 全绿（2026-09-11）。调试链：SC 播音锁探针（tapOpt(99)=='null' 可交互判定）；T7 分款内联两连击（锁探针会等过错链豁免窗破坏时序）；RP wrong_js 每步 live 快照（quiz getter 新副本致 slotIdx 旧引用失效）；python 字符串续行两处误写 JS `//` 注释 SyntaxError。

**verify 侧断言修正 3 起（非实现 bug）**：①T3 poll_step 对 RP 读 currentLevel.step（RP 钩子 quiz.step 语义见审查 R-2——修复前为 slotIdx）；②T4 对 RP 分款断言 all(g==4)（生成关恒 dch4=§0.81 三轴全域承诺，见审查 R-1 复裁）；③bad[:6] 打印截断曾致误判「仅 6 关失败」（实 20 关全 FAIL——mini audit 探针证）。

**反方静态审查（REPORT-REVIEW-b33.md，0 fatal/3 major/2 minor）+主线复裁**：
- **P-1（major→修）**：position turn 段重发 findpos 真关 vs SPEC §2 明文「turn=placepos 前面」——修=turn 首题换 placepos/front 定制（bunnyAt=back，cells=ch1 4 格域），solo 接真关余题；定向实证过（turn=placepos/tapCell=right/solo 接 findpos/0 pageerror）；verify tutHelp 断言同步更新（351 行）。
- **R-1（major→豁免+SPEC 补明文）**：生成关恒 dch4 vs 家族 F 随机——复裁不采纳审查「括注=域描述非策略」窄读：dch1 域仅 6 组合空间，随机 dch 破坏「三轴全域 18 组合」承诺，恒 dch4 唯一满足；§0.81 已补括注明文；SC/PS 同构括注在 dch1-4 域均成立故随机合法（句式同构语义约束不同）。
- **R-2（major→修）**：RP 钩子 quiz.step=slotIdx→题号（game-main.js:648，与 SC/PS 对齐；槽进度由 slotIdx 独立承载；verify 无依赖面已核）；定向实证过（fill 前 0→fill 后 1=题号推进）。
- **R-3（minor→记口径）**：tapBlock 异轴返回 false（吞+当前槽 flash 方向级不判 miss）——§0.81 已补枚举 false 值；「恒 fill」字面不可执行（异轴真填入=颜色值进形状槽，painted 组装语义崩坏）。
- **R-4（minor 存疑→实锤→修）**：探针实测 turn 段首题=黄大圆（seeded）vs SPEC §3「黄色小方形」——修=turn 首题定制 target={yel,squ,small} 三槽全空（ch1 预填 big 形态教不了 small，完整三指令同 genTutLevel 先例）；verify tut:real-q2 断言同步更新；定向实证过。
- **连带修复**：RP build.py core 注入补幂等跳过（主线 gen_clips ALL 补登记后 manifest core_* 已含本款，agent 时序差致双注入 22≠19——position build 已幂等、soundcount 无手工追加不受影响）。

**全量回归（verify_final33.py R1-R8）**：**8/8 全绿**（2026-09-11）——R1-R3 三款复验 12/12×3/R4 clips 键+注入/R5 家长门（position 抽测 v=1.0）/R6 主入口 99 卡+b33 入口 3 卡+子页/R7 href 全可达/R8 三款真实路径推进（预置 6 关+bonusSet(5)→flat6-10：dch=[2,2,2,2,3]+ch3 题型族 SC=全 countmix/PS=findpos+placepos 两族混出/RP=locked 恒 0 三轴全）+写档 rec 2-1..3-0。

**分龄试玩（REPORT-PLAYER-b33.md）**：三款六步全流程全过（教学链三段/真实 2 关含故意错+防重入实证/autoSolve 到日末/家长门两位数加法/多玩 flat6+ 实测/防沉迷重开即收口），**pageerror 0×3**，无 P1/P2，6 条 P3 观察项；P-1/R-4/R-2 修复在真实页均实证生效。儿童意见+P3 裁决零代码修复（均契约定版或家族既有 backlog：星级偏严 b31 已登记/错链冷却窗 b30 已登记/RP 演出节奏同 RD 款/首错不指轴=§0.81 梯度定版/数字卡圆点已实现/星星紫色=域封闭非本批）。

**收官（2026-09-11）**：99/120。

## §-r18 robotpaint 难度改造定版（2026-09-18，AUDIT-78 黄款行 87；本节取代 §0.81/§3 的 v1 难度面，v1 记录留档不删）

**审计判断**：「核心=看着目标抄三属性」——v1 三轴组指令全档恒 plain、块池轴内基序固定（位置查表）、无否定/复合/记忆/双任务负荷。r18 升级「想清楚再画」，delta 五项（审计建议定死）：

1. **目标短时呈现后隐藏（记忆复现）**：mem 题型——开题 keyless 闪现句「看清楚啦，把它记住，等一会儿画出来」（17 全字符，estMs=6465）起算 **FLASH_WIN=estMs(17)+300=6765ms 呈现窗**（锁定=演出即引导，救援 idle 豁免），窗毕罩卡 `[data-covered="1"]`（问号画卡）+rp_q 开放交互，凭记忆复现；判对比对相位揭示重编码，错后回 pick **再罩**（记后画不退化）；早退路径必解锁（换关令牌守卫防悬挂锁）。
2. **否定指令**：neg 题型——否定轴呈「排除值打叉」芯片行（`data-neg="1"`+×叉线），正轴呈目标值芯片；**排除集=轴封闭集∖{目标值}（dch2 排除 1 轴补集唯一/dch4 排除 2 轴补集×2——封闭集补全推理可满足）**；neg 域内不呈现目标图案（pick 未判=否定卡；已判回 pick 保持揭示——不测记忆测推理）。
3. **两步修改**：edit 题型——画布已有起始画 start（pick 相位 g[data-paint]==start——契约 M），目标卡呈修改指令行 from✗→to✓（`data-neg/data-ok` 芯片）；**每处 from≠to（轴内重抽），终态 target=start∘edits（dch2 改 1 轴/dch4 改 2 轴两步复合）**；忽略修改（保留 start）必 wrong（忠实执行可视化）。
4. **同轴多值干扰（防位置查表）**：块池 r18=**轴分组恒续（色 3|形 3|大小 2 连续段）+ 组内 seeded Fisher-Yates 打乱**——同轴非目标值恒全摆且每题组内序独立于基序；verify 实证 40 关 240 题 **shuffled 230/240**（基序命中仅 10 题≈1/8^? 随机期望），值-位置查表失效。
5. **双画师并行（工作记忆分叉）**：dual 题型——四框画架（gA|pA|gB|pB，dual-only 对+B 对 .cur 高亮）；**goals=[g1,g2] g1≠g2（seeded 重抽 guard 20）**；任务一判对 t1Done=true/painted1 留档（画布 A 定格 like 印记）**不推进 step**→确认链后切任务二（tIdx=1/target=goals[1]/槽复位）；任务二判对才 solved/step++；quiz.miss 两任务累计。

**结构定版（取代 v1 难度面）**：五题型池 `KIND_POOL={1:[plain],2:[neg,edit],3:[mem,dual],4:五混}`；否定轴数 `NEG_AXES_N={2:1,4:2}`、修改轴数 `EDIT_AXES_N={2:1,4:2}`；**每关 5→6 题（CH_LEN=6）+静态 24 关=4 章×6 关**（键基迁移 IIFE：旧基矛盾态 c=2..4 `lv[c+'-0']在而lv[(c-1)+'-5']缺`→一次性重置 levels+delete sv.robotpaint（教学重播）；脏键守卫 `^\d+-\d+$`+章≥1 上界放开（生成关章号随 flat 递增）+关号 0..5；先于 KIDS.init——build 次序断言）；生成关 flat≥24 恒 dch4（§0.81 v1 括注沿用）；种子 `mulberry32(flat*7919+1151)` 不变，rnd 序钉死 ①kind→②目标（color→shape→size）→③kind 附加（edit 各 to/dual g2）→④块池三组打乱；ch1 预填废止（全档恒三槽，CONFIRM_WIN2 删）；答案级 breathe 章表 `DCH_BREATHE={1:false,2:true,3:true,4:true}`（ch2+ 才 miss≥2 指错轴）。

**认知时长模型（§4 r18 增补，estMs 四方=data/verify/build/_selftest 同步 `n*345+600` 全字符）**：`DECIDE_MS={plain:8000,neg:12000,edit:11000,mem:10500,dual:17000}`（7-8 岁单题认知推算：否定补全/两步复合/记忆编码/双任务分叉）；`voiceWin=开题链+300`（plain 2340/neg 3900/edit 4068/dual 4092/**mem=FLASH_WIN 6765**——恒 ≤DECIDE）；`PERF_RIGHT_MS=go 1176+3×800+like 2052+确认 8634=14262`；`modeled(flat)=OPEN_MS 900+Σ(max(voiceWin,DECIDE)+PERF)`；**全 40 关最低=modeled(0)=900+6×(8000+14262)=134472（ch1 全 plain 关）——verify SPEC_MODELED_MIN+_selftest 双钉精确整数（禁约数）**，全关 ≥LEVEL_MIN_MS 40000。

**窗口表 r18（v1 表沿用+新增）**：作画演出窗 3876=1176+3×800+300；like 前导 2052；确认链恒三段 8634=3216+150+3×1656+300（全档三槽）；错链豁免窗 5010=1848+150+2712+300（真时钟，契约 I）；mem 闪现窗 6765=estMs(17)+300（家族 T 实算）；开题窗 per kind 见上；教学 watch 3684/turn 交接 2316 不变。**新语音 3 键（前缀 rp_ 已核 manifest 无占用，2026-09-18 实测）**：rp_neg 3600「打了叉的不能用，想想该画哪个」/rp_edit 3768「小画师画好啦，按新指令改一改」/rp_dual 3792「两位小画师等你指挥，一个一个来」——rp_ 条数 16→19，注入 22（+core 3）。

**契约执行面**：verify 独立第 4 script 块（`html.count('<script>')==4`，⑬ 源码断言读 script[2] 纯游戏块）；家族 A 双 `nextHint(lim-1)`+`Math.max(0,lim-1)`+禁 null 实参字面；B 救援双锚 14s/30s（mem 闪现窗与演出相位 idle 豁免）；D 吞输入 bump；E `sv.robotpaint&&sv.robotpaint.tutSeen` 先查；F 生成关 GEN_HINTS[dch-1] 实算；I/I补 wrongChainUntil=5010 真时钟+guard 挂 uiTapGo 入口+startLevel 重置+救援 interval 让路；J 语义链 10s 节流；K rescueTick 命名+面板守卫；M 帧内容断言五题型目标侧（pattern g[data-target]/neg 卡/edit 卡/mem 罩）+画布三态（待命/起始画/成品+data-judge）+块槽 DOM==引擎真值；MIG 迁移 IIFE 三断言；N r18 非平凡成立（全款唯一 keyless 段=mem 闪现句，恒单段数组=恒尾）；O 自建 button 显式 color；T estMs 四方+FLASH_WIN 实算断言（**estMs 吃字符串——`estMs(MEM_TEXT)` 禁 `estMs(MEM_TEXT.length)`（数字.length=undefined→NaN 窗，r18 实测 6 连败根因）**）；PORT-CLS @media 与 body.port 逐行全等（build 静态断言）；文案红线 \bAI\b 词边界检测；完全离线断言。

**钩子契约增补（§3 基础上）**：`RP.quiz` 增 kind/mem/flashDone/negMap/edits[{axis,from,to}]/start/goals[2]/tIdx/t1Done（getter 快照，pos 语义不变）；tapGo dual 任务一返回 'right'（nextTask——step 不动）；tapBlock/tapSlot 相位吞 null/锁吞 false 语义不变；RP.state 暴露 locked/won/demo/tut。verify 单元 ①-⑰（40 关审计/tap/neg/edit/mem/dual/教学/冒烟/帧/布局双视口×五题型/clips 22±60ms/星级/契约源码/hints/窗数学/modeled 双钉/SPEED）；_selftest 场景 verify+2a 首错改槽重画+2b 教学链+2c 五题型真实点击+flat24 生成+2d 双视口+PORT-CLS live+2e 生成关 lim42+2f 迁移三例+S1 sayW 三态（真时钟绝对时间调度）+S2 救援双锚+离线/零发声。

**r18 验收（2026-09-18，八门禁）**：①build.py 静态契约全过+幂等（双跑 md5 一致）②?verify=1 → `VERIFY PASS 399/399`（layoutOk，0 pageerror，墙钟 ~129s）③_selftest.py 真实页 `92/92 PASS`（含五题型真实点击链/教学链/双视口 1280×800+800×1180+PORT-CLS live 等价/迁移三例/S1 sayW 三态/S2 救援双锚 13.4s/29.4s）④真实页 0 pageerror+0 http 请求⑤clips rp 19+core 3=22 全注入+duration ±60ms 全过（含新 3 键 rp_neg 3600/rp_edit 3768/rp_dual 3792）⑥静态家族断言（A/B/D/E/F/I/I补/J/K/M/MIG/N/O/T+PORT-CLS+4 script 块+离线）全过⑦SPEC 本节落盘⑧modeled 双钉 134472（verify SPEC_MODELED_MIN+自检 identity+40 关 min 实测 134472）。实证：块池组内打乱 230/240 题、生成关 96 题聚满 18 组合全域、教学链折算 23.1s（预算 27.5s）。

**r18 实证坑（家族复用）**：①**estMs 吃字符串**——`estMs(MEM_TEXT)` 禁 `estMs(MEM_TEXT.length)`（数字.length=undefined→NaN 窗：闪现窗 wait(NaN)=0 立即解锁、voiceWin/quizDur 全 NaN，verify 一次 6 连败根因）；②**flat→kind 表禁 python 复算**——mulberry32 移植易犯运算符优先级错（JS `t + Math.imul(...) ^ t` = `(t+imul)^t`，非 `t+(imul^t)`），探针 flat 表与引擎不一致（探针 12=dual/引擎 12=mem）；verify/selftest 的题型 flat 一律页内 `genLevel` 动态取；③**STUB_SND `if (window.KIDS)` 守卫=no-op**——core 的 KIDS 是 script 级词法绑定**不在 window 上**，window.KIDS 恒 undefined，模板守卫静默跳过全部 stub（静音仍成立=core settings 门兜底，仅日志层失效）；守卫须 `typeof KIDS !== 'undefined'`；④verify 全墙钟 ~130s（tap 单元 5.15s 真等+flat12 豁免窗 5s+mem 闪现 812ms×N+五 flat 冒烟演出），外部轮询 timeout 给 ≥300s。


