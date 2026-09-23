# SPEC-BATCH28 · 6-7 岁三款（指令小兔 / 图形计数 / 数量守恒）契约 v1（2026-09-10）

对象：6-7 岁（幼小衔接段：方向序列执行启蒙、图形计数、数量守恒/皮亚杰）。目录 `batch28/coder|shapecount|conserve/`。
结构照 batch1-27：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段，调用方式照抄参照款）：batch26/sign/_src/（4 候选卡+封闭集+错反馈链豁免窗 wrongChainUntil——定版范式，三款主参照）、batch27/ruler/_src/（count 数字卡+NUMCN 两/两元口语+救援面板守卫）、batch27/notebird/_src/（演出窗吞点+verify 混合折算口径）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-66 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b27 定版，一项违反=审查 Major 起步）：A. 启动 dayEnd 的 nextHint 传 `lim-1`（winFlow 传 `nextHint(null)`）；B. 救援钟双锚：14s 方向级独立节流锚 lastDir（不得重置 lastAct）+30s 答案级 ≥20s 独立节流；C. 预置存档键 `kidsgame_<game>` 必带 `v:'1.0'`；D. 吞输入轻叮必配容器 bump；E. 修复行为收窄先查教学特例；F. 章末 hint=预告下一章（hint[i]↔CHAPTERS[i+1]），生成关 nextHint 实算 `genLevel(f+1).dch-1` 禁 (ci+1)%4；G. queue 拼播链后窗=链总实长+300；H. 判对/奖励窗按实测 clip 时长+300；TTS 拼句窗=estMs 全字符口径 `len*345+600`+build 静态断言「窗≥estMs」；I. 错反馈链豁免窗 wrongChainUntil（错链起播设 `Date.now()+链实长+300`，救援 interval 早退守卫，startLevel 重置 `lastWrongVoice=0; wrongChainUntil=0`，build 静态断言）；J. 错反馈语义句全程保留（flat≥3 只 10s 节流禁切通用 clip）+节流锚 startLevel 重置；**K（b27 新立）. rescueTick 面板在场守卫 `if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;`——面板遮挡期救援静默；L（b27 新立）. TTS 数字/量词映射表必须覆盖封闭集全量值（coin cnOf 缺 10/20→「这是undefined元」12 次/会话教训），量词前 2 用「两」；verify 须有映射表全量值输出断言（禁 undefined）**〕**

67. **coder 指令小兔真值**（本批新增）：**3×3 网格**（坐标 (r,c)，r=0 顶行，c=0 左列）；**方向封闭 4**（up上/down下/left左/right右，卡=箭头图标+汉字）；**题型两族**——**run**（题面=小兔起点+萝卜目标（+石头障碍）；卡池=2-3 张方向卡乱序摆，点一张小兔走一格逐步执行；**到达萝卜即 right**（殊途同达合法——交换律路径教育上正确，不卡顺序）；全部点完未到达=wrong+miss；**撞石头/出界=该卡吞**（false+pop+bump+「往这边走不过去哦」不记 miss=探索性惩罚豁免）；**path**（ch3 预测题型：给 2 步指令序列（卡面箭头顺序展示+语音念），「小兔会走到哪？」候选 3 格卡，点对=right——心理模拟启蒙）；**卡池真值数学先验（b24 坑③，SPEC 写前验算）**：卡池=一条最短路径的指令多重集（曼哈顿距离=步数）±（ch3+ 加 1 张干扰方向卡）；**出题器必须验证卡池多重集可拼出 ≥1 条合法到达路径**（verify 断言：卡池按正确序执行落点=goal）；布局封闭：起点/萝卜不相邻（ch1 除外——ch1 距离 1，卡池 1 张）；石头不挡死全部路径（出题器验证）；章：ch1 单步走（dist=1，卡池 1）/ch2 两步走（dist=2，卡池 2）/ch3 三步+石头+path 预测题（dist=3，卡池 3 或含 1 干扰）/ch4 生成混合（seeded 布局+dist 2-3）；每关 5 题；确定性 seeded `mulberry32(flat*7919+<本批常量>)`；星级=miss 口径（0=3★/1-2=2★/≥3=1★）；错反馈语义（run 未到达）→「小兔没走到萝卜，再看看往哪边走」方向级（按小兔当前位与萝卜相对方位给「先往左/右/上/下走」）；path 错→「再想想，先走第一步看看」
68. **shapecount 图形计数真值**（本批新增）：**图形封闭 6**（circle圆/square方/triangle三角/star星/heart心/diamond菱——SVG 简笔大色块，形状互异可辨）；**题型两族**——**count**（场景=2 种图形拼贴（干扰近形在场），「三角形有几个？」候选 4 数字卡）与 **more**（场景=2 种图形，「哪种图形多？」候选=2 图形卡；**数学先验：more 题两形数量差 ≥1 恒不平**）；数量域 1-6；**近形封闭**：triangle↔diamond（尖角族）/circle↔heart（圆弧族）——ch2+ count 题干扰近形必在场（verify 断言）；count 候选数字=**实现定版口径（探针 0-39 实况，回填更正 2026-09-10；SPEC 原文「真值±2 去重取 4」未含真值不可行）**：t≤2 取 [t..t+3] / t=3,4 取 [t-2..t+1] / t≥5 取 [t-3..t]（恒含真值、互异、界内 1-7、定长 4——数学先验防负数/零）；章：ch1 单形计数（2-4 个）/ch2 混合计数（3-6，近形干扰）/ch3 比多少（差 1-2）/ch4 生成混合（seeded 数量表）；每关 5 题；确定性 seeded；星级同上；错反馈语义：count 错→「再一个一个指着数」（所点>真值「没有那么多，再数数」/所点<真值「还有呢，再接着数」——方向句按所点数字）；more 错→「比一比，一边一个对一边一个数」（配对锚——一一对应前奏）
    〔**r3 难度改造版本块（2026-09-13，v1 原文上方整段作废——审计红牌：6-7 岁段实测 31.6-38.8s/关、点数 1-6=小中班技能、数量域封顶 6 机制零「想」，本段概念差距最大款**。r3 定版真值：**题型四族**（玩法框架保留：场景+4 数字卡点选，判定层升级）——**count** 散点计数：ch1 单形 5-10（flat0 题0 恒 circle×6 教学锚）/ch4 近形版目标 5-9+近形干扰 3-8（n+m≤12 槽位先验；**n 上界 9 非 10——n=10 与最小干扰 m=3 之和破 12 槽把兜底钳制压破 m≥3 下界，引擎自检实锤**）；**grid** 行列阵列计数：r∈{2,3,4}×c∈{3,4,5} 满阵 r*c∈[10,20]，n=r*c，「排好队的图形，一共有几个？」（分组策略载体：两个两个数/按行数）；**gridmiss** 缺格减法结构：r*c∈[12,20]、缺格 k∈[1,4] 且 r*c-k≥10，n=r*c-k（miss=缺格 idx 数组，互异界内；渲染/钩子/verify 三口径同源，缺格格不渲染不入 _place）；**dual** 颜色×形状双维过滤：「红色的圆形有几个？」——目标 n∈[3,6]+**同色异形干扰 d1∈[2,5]+同形异色干扰 d2∈[2,5] 双干扰必在场**（scene 恰 3 组合键 '图形:颜色'，verify/verify_one 独立判 d1s:color 与 shape:d2c 两键在场）；**颜色封闭 4**（red红#E8483C/blue蓝#2E6FB8/yellow黄#F5C445/green绿#57A773——shapeEl(id,fill) 参数化，渲染 data-fill ↔ SVG fill 同源）；**ch4 移动干扰**（r3 ④，选漂移弃工作记忆版——实现代价小+verify 断言确定）：dch4 全题图形横摆漂移 drift-x ±9px 慢速 CSS 动画（7-10s 周期+负 delay 错相；横向间隙 ≥66px 恒安全不破坏不重叠；纯视觉层判定真值不变，verify 用 computed animationName 声明级断言不依赖 rAF）；章型：ch1 多数一数（count 5-10）/ch2 排好队数（grid 满阵）/ch3 空格颜色（gridmiss+dual 交替 3+2）/ch4 大挑战（四型混合每关 ≥2 型+全漂移）；**more 比多少题型整体下线**（4-5 岁技能，审计未要求保留）；数量域 1-20；候选数字新规则：t≤2 取 [t..t+3] / t=3-6 取 [t-2..t+1] / **t≥7 取 [t-3..t]**（含 20→[17..20]；儿童大数误差偏少→干扰压真值下侧）；NUMCN 封闭集 1-20（2=两 家族 L；10=十/12=十二/20=二十）；教学=**两个两个分组数**（6 个圆 3 组×1400ms 分账与旧逐个数一致 14100≤16000——分组策略是 r3 的教育目标）；阵列几何：scene[data-mode=grid] 高 340px 横竖统一、图形 58px（≥56 下限）、行定位 GRID_TOP={2:33,3:25.5,4:19.5}%/GRID_DY={2:33,3:24.5,4:23.5}%（四处同步：data+main 注释+verify 独立表+build 断言）；错反馈 4 族：count/grid 按所点方向（over/under 句不变）/gridmiss「先数满的行，再数空格」（结构锚）/dual「先找颜色，再找形状」（两步锚）；hint 按题型选播（r3 新增 clip 2 条）；语音窗全保原值（判对 5400≥estMs(10)=4050 最长确认句「黄色的三角形，有六个」；链窗 7900≥1968+150+4050+300=6468）〕
69. **conserve 数量守恒真值**（本批新增）：**场景三族**——**rows**（两排圆片等量、第二排间距拉开变长——经典皮亚杰离散守恒）、**pour**（左右两杯同量同形→右杯倒入细高杯，液面变高——连续量守恒 SVG）、**clay**（两团橡皮泥等量→右团压成长条——质量守恒）；**题型两族**——**same**（变换后「现在哪边多？」答案恒=一样多——守恒核心题）与 **add**（变换后再给左/右加 1 个或去 1 个，「哪边多？」答案=指定边——防「恒答一样多」策略性通过，**每关 same 与 add 混出**）；**候选封闭 3**（左排多/一样多/右排多 三文字卡）；数量域 rows 基量 5-7（same 等量；add 后终量差 1，合法终量域 4-8——回填更正 2026-09-10：verify 首版误把终量断言进 5-7）；变换前后各有一帧（题面播「看，两边一样多」→动画变换→「现在呢？」——变换动画 ≤2s 不乘过 SPEED）；章：ch1 数一数直接比（等量/差 1 无变换）/ch2 间距变换（rows same+add）/ch3 倒水+橡皮泥（pour/clay same+add——add=右杯再倒进一点/右条再切一小块）/ch4 生成混合；每关 5 题；确定性 seeded；星级同上；错反馈语义：same 错（点了某边多）→rows「再数一数，两边都是 N 个哦」（**计数证据锚**——把守恒落回可数证据）；pour 错→「倒来倒去，水没有变多也没有变少哦」；clay 错→「压一压捏一捏，橡皮泥没有变多也没有变少哦」；add 错→「刚才是两边一样多，后来又给左边加了 1 个哦」（回溯锚）

## §1 coder 指令小兔（方向序列执行+编程启蒙）

**玩法**：3×3 网格题面（小兔/萝卜/石头 SVG）+方向指令卡点选，小兔逐步走格动画。
- 题型（4 章）：ch1 run 单步 / ch2 run 两步 / ch3 run 三步+path / ch4 混合
- 教学：watch=幽灵手指点「上」卡→小兔走一格到萝卜（「点箭头，小兔子就走」）→帮/独；`__cdDemoR`
- 钩子：`CD = { get currentLevel, get quiz(){ kind('run'|'path'), grid{start,goal,stones[]}, pool[](卡 {dir:'up'|'down'|'left'|'right'}), seq[](path 题指令序列), opts[](path 题候选格 {r,c}), answer, step, miss }, tapCard(i), start(flat), autoSolve() }`——run 题判定走 tapCard 逐步执行，引擎内记 walked 落点
- 语音：cod_tut_watch'看！小兔子要去找萝卜'/cod_tut_turn'你来指一指'/cod_hint'想想先往哪边走'/cod_right'走到啦，真聪明'/cod_wrong'再想想往哪边走'/cod_q'帮小兔子走到萝卜'（path 题面句「小兔子会走到哪」TTS 拼句豁免；错反馈方向句 TTS 拼句豁免）

## §2 shapecount 图形计数（r3 难度改造版：结构化计数+双维过滤+移动干扰）

**玩法**：图形场景（r3 双模式：count/dual=散点 12 槽 / grid·gridmiss=r×c 阵列 340px 高）+4 数字卡点选；ch4 全题图形缓慢漂移（移动干扰）。
- 题型（4 章）：ch1 count 散点 5-10 / ch2 grid 满阵 10-20 / ch3 gridmiss+dual 交替 3+2 / ch4 四型混合+漂移
- 教学：watch=幽灵手指**两个两个分组点**圆形（组末计数 TTS「两个/四个/六个」——分组策略教学）→帮/独；`__scDemoR`；flat0 题0 锚 circle×6
- 钩子：`SC = { get currentLevel, get quiz(){ kind('count'|'grid'|'gridmiss'|'dual'), scene{图形id:数量 或 '图形:颜色':数量}, ask(count/grid·gm=图形 id / dual='图形:颜色'), rows,cols(grid·gm), missCells[](gm 缺格 idx), dual{shape,color,n,d1s,d1,d2c,d2}, n(真值), drift(ch4=true), opts[{num}×4], answer, step, miss(本题错选数) }, tapOpt(i), start(flat), autoSolve() }`
- 语音：shc_tut_watch'看！图形里有几个'/shc_tut_turn'你来数一数'/shc_hint'一个一个指着数'/shc_right'数对啦，真棒'/shc_wrong'再一个一个数'/shc_q'数一数有几个'/**r3 新增** shc_hint_grid'两个两个数，按行数更快'/shc_hint_dual'先找颜色，再找形状'（hint 按题型选播；**前缀=shc_ 非 sha_——撞车教训见 §0.68/§4**；题面句/确认句/引导句 TTS 拼句豁免：grid「排好队的图形，一共有几个？」/gridmiss「有空格的图形，一共几个？」/dual「红色的圆形有几个？」；数字入句 NUMCN 1-20 带「两」）

## §3 conserve 数量守恒（皮亚杰守恒任务）

**玩法**：左右对比题面（两排圆片/两杯液体/两团橡皮泥 SVG）+变换动画+三文字卡点选。
- 题型（4 章）：ch1 same/add 直接比 / ch2 rows 变换 / ch3 pour·clay 变换 / ch4 混合
- 教学：watch=两排 5 圆片对齐展示（「两边一样多」）→右排拉开→幽灵手指点「一样多」卡（「数一数就知道」）→帮/独；`__cvDemoR`
- 钩子：`CV = { get currentLevel, get quiz(){ kind('same'|'add'), family('rows'|'pour'|'clay'), left{n,spread}, right{n,spread}, addSide(-1|0|1, add 题), opts[](3 文字卡 {text:'左边的多'|'一样多'|'右边的多'}), answer, step, miss }, tapOpt(i), start(flat), autoSolve() }`
- 语音：cnv_tut_watch'看！哪一边多'/cnv_tut_turn'你来比一比'/cnv_hint'先数一数再比'/cnv_right'比对啦，真厉害'/cnv_wrong'先数一数再说'/cnv_q'哪一边多'（**前缀=cnv_ 非 con_——con_ 已被 batch5/connect 占用，撞前缀会覆盖 manifest 键**；错反馈计数证据句「两边都是 N 个哦」数字 TTS 拼句豁免——NUMCN 口径带「两」；变换解说「右边的拉开了，可是数量没有变」TTS 拼句豁免）

## §4 交付与验收（承 batch15-27 流水线，含 b27 两条新门禁）

语音预合成（gen_clips.py 扩 batch28 块：cod_ 6+shc_ 6+cnv_ 6=18 条——**撞前缀双事故实录（2026-09-10）：con_ 撞 batch5/connect 三键；sha_ 撞 batch11/shadow+batch23/share 双方且旧 mp3 被 skip-by-existence 保留致错音频+duration 辨别器同源自证未拦——新批前缀必须先查 manifest 既有前缀占用**；**实长量化回填本节**〔家族 H/L〕——等待窗=实长+300；TTS 拼句窗=estMs 全字符 n×345+600）→ 3 agent 并行（任务书必带：契约 A-L 逐条（**K 面板守卫+L 数字表全量值=本批新立**）/§0.67-69 真值与数学先验逐条/钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/内存纪律单 page 串行/禁 analyze_image）→ 首单元门禁（gate_common28.py：CD/SC/CV 钩子映射）→ 探针定钩子语义 → 独立复验（verify_batch28.py 单文件三款 T1-T11+T9b 共 12 项（2026-09-10 全绿：coder/shapecount/conserve 各 12/12；钩子脱敏口径——coder quiz 包 grid 嵌套、conserve 不暴露 base/delta 按 final n 复算、coder T6-T8 用 path 题驱动）；**真实路径推进由 verify_final28.py R8 承担不重复**（T12 分工回填说明 2026-09-10：预置首日 6 关存档（`add_init_script` 内**必须 JSON.stringify 包裹**——对象字面量被 String() 成 [object Object]=整档重置，b22⑥/b27 双实锤）+`KIDS.calendar.bonusSet(5)`+点火通关当前关+autoSolve flat6-10+断言 dch=[2,2,2,2,3]+flat10 题型∈ch3 族+存档 2-1..3-0）→ 全量回归（verify_final28.py R1-R8：R8=真实路径推进三款）→ 两级入口（batch28/index.html 三卡+主入口 81→84+href 可达扫描）→ 反方审查+6 岁试玩（**试玩剧本必含家长面板真实输入今日多玩关数——b27 试玩伪影家族教训；试玩报告的机制推断须开发复核后定案**）→ 修复闭环 → 收官（6-7 段 27/30，总 84/90）

**实长表（浏览器 Audio 实测，2026-09-10；shapecount 行=shc_ 新合成音频）**：cod_tut_watch 3504/cod_tut_turn 1848/cod_hint 2352/**cod_right 2424（判对后窗 ≥2724）**/cod_wrong 2568/cod_q 2400；shc_tut_watch 3096/shc_tut_turn 1896/shc_hint 2184/**shc_right 2304（判对后窗 ≥2604）**/shc_wrong 1968/shc_q 2136；cnv_tut_watch 2712/cnv_tut_turn 1848/cnv_hint 2232/**cnv_right 2496（判对后窗 ≥2796）**/cnv_wrong 2184/cnv_q 1680——等待窗按此+300 余量；TTS 拼句窗=estMs(全字符 n×345+600)+300。〔**r3 补充（2026-09-13）**：shapecount 新增 2 条题型 hint——shc_hint_grid'两个两个数，按行数更快' **3168**/shc_hint_dual'先找颜色，再找形状' **2976**（ffprobe 容器时长=浏览器 Audio duration ±60ms 内一致，verify ⑩ 辨别器同口径）；hint 系 fire-and-forget 播放无后续窗依赖；shapecount clips 总数 6+2+core3=11（build 断言同步）〕

## §5 反方审查修复记录（2026-09-10，REPORT-REVIEW-b28.md：fatal 0/major 1/minor 6 → 修后收）

- **M1（major，已修）**：conserve rows add 题变换演出语义矛盾——buildQuiz 终量提前落入 left.n/right.n + sceneSvg post/postadd 渲染同参 → post 帧呈现 6/5 却解说「数量没有变」、postadd 帧与 post 像素级相同却解说「又加了一个」（dch≥2 rows add 病域；ch1 直达 postadd 不受影响；pour/clay 有液面/条增量不受影响）。修=sceneSvg rows 三相区分（pre=等量紧凑/post=**等量拉开 base/base**/postadd=终量）+verify ⑤ 增帧内容断言（post 帧 circle=4×base、postadd=2×(left.n+right.n)、两帧必相异——DISC 每圆片 2 circle）。**漏网机制：verify ⑤ 原只断相位标签不断言帧内数量——「数值层/相位标签/帧内容」三层断言缺第三层，b29 起变换演出族 verify 必带帧内容断言**
- **m1（已修）**：shapecount morePair big/small 命名与数值相反+注释数学错误 → 改名 few/many（行为不变）
- **m2（已修，三款）**：wrongChainUntil 在 sayW 被 10s 节流跳过时仍设窗（契约 I 原文「起播设」）→ sayW 返回是否入队、仅链起播时设窗（救援更及时）
- **m3（已修）**：conserve build.py 补家族 F 反向断言 `'(ci + 1) % 4' not in main`
- **m4（已修）**：conserve 救援 tick 匿名函数 → 命名 rescueTick()（与两款同构，verify 源码级断言可用）
- **m5（记录不修）**：pour/clay add 答案恒定（pour 恒右/clay 恒左，SPEC 定义如此）——题型捷径设计观察，后续批次扩 addSide 取材时参考
- **m6（记录不修）**：coder run 死局时答案级救援只读题不指卡（死局兜底存在无死循环，SPEC 未定义死局救援）
- 修复后全链复验：三款 rebuild + verify 12/12×3（含 conserve ⑤ 新断言铁证）+ R1-R8 重跑全绿
