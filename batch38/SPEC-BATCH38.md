# SPEC-BATCH38 · 扩容批 8（规律画画 / 分类归档小图书 / 齿轮转起来）契约 v1（2026-09-12）

对象：120 款扩容第 8 批（每段各 1 款）。目录 `batch38/stamp|libr|gear/`。
结构照 batch1-37：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch37/thanks/_src/（两/三卡选择款+keyless 题面句+降坡 5-6 结构——stamp 强参照）、batch28/shapecount/_src/（封闭图集取材+点选判定——libr 卡片参照）、batch37/plant/_src/（网格槽位交互+错时高亮相邻锚——gear 槽位参照；plant 亦是「每步即判+进度可见」同型）、batch36/quickcmp/_src/（weber 先验型题值生成——gear 链路预生成参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-90 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b37 定版，一项违反=审查 Major 起步）：A-O+I 补全承 SPEC-BATCH33.md §0 括注原文（A 启动 dayEnd nextHint(lim-1)/winFlow null；B 救援钟双锚；C 预置存档 v:'1.0'；D 吞输入轻叮配 bump；E 修复收窄先查教学特例；F 章末 hint=预告下一章+生成关 nextHint 实算 genLevel(f+1).dch-1；G 拼播链后窗=链总实长+300；H 判对窗=clip+300；TTS 窗=estMs(len*345+600)+300；I+I补 错链豁免窗 wrongChainUntil 真时钟+guard 条件式（错点吞/对选放行/窗后二错照计 miss）+startLevel 重置；J 错反馈语义句 flat≥3 只 10s 节流（**写法恒 `cur.flat < 3` 含教学迷你关 flat=-1——b36 m3+b37 R1 两起教训**）；K rescueTick 面板守卫；L TTS 数字映射表覆盖封闭集全量值（本批无数字 TTS——天然满足，语音表为准）；M 帧内容断言三层；N keyless TTS 段恒链尾（stamp 规律句=题面 say 非队列链，N 仅约束 queue 链——承 b36/b37 明示防误伤；libr 提示句/gear 观察句同）；O 自建 button 显式 color）。b33 三条硬性全承（钩子表 step 语义显式/生成关 dch 策略显式声明/build.py core 注入幂等）。b35 M1 裁决带入：三步完整演示款教学 watch ≤22s 款型分支（单步演示款仍 ≤16s）——**本批三款均单步演示款 ≤16s**。b34-b37 坑带入：miss 在 core 判定层的款 guard 须判定前拦+预判与 core 严格同构/verify 页写档 origLS 保护+try/finally（b36 m4）/SPEC 先验写前验算数学可满足性+约束互斥检测（b35 a=5 教训）/钩子表列全 verify 需独立推导的派生池字段（b35 ED.pills 缺口）/**首错演出锁禁覆盖豁免窗（b37 R3 教训：锁≤wrong clip+150——留「对选放行」活跃段）/探针必须含一次真实点击（b37 探针盲区教训——只 dump 形态没实点=驱动路径盲区）**〕**

**〔b36 M1 家族缺陷强制项（build 层硬性，违反=审查 Major；b37 R4 教训=三款 build 断言须对称）：①build.py 布局=verify 独立第 4 个 script 块（script[0]=core，script[1]=data 段按实序，**script[2]=纯 data+engine+main（无 verify 字面）**，script[3]=verify）——verify ⑨ 源码断言读 script[2] 恢复判别力；**三款 build 均须含负向断言 `runVerify not in script[2]` + script[2]/[0] 锚断言**；②verify ⑨ 肯定断言检索字面逐条与 main 真源字面核对（具名常量断言写常量定义字面，禁自造 main 中不存在的推导式字面）〕**

91. **stamp 规律画画真值**（**5-6 段降坡**，艺术/逻辑·模式生成；调研 #25 原标 6-7，**本批降坡 5-6 实态**（EXPANSION 排期 5-6 段+降坡条款，b37 thanks 先例）：降坡三件=ch1-2 AB 双元素规律+印章盘 2 枚+keyless TTS 规律句零文字依赖；ch3-4 AAB/ABB 三元素+印章盘 3 枚）：**与早期款「规律侦探」差异显式声明（防同质化审查项）**：侦探=**识别**已成形序列（选接下来一项）；画画=**生成续盖**（印章工具操作+创作载体：围巾/桌布上花边逐格盖印**永久留存**，关末成品展示演出——识别 vs 生成（Bloom 层级升一级）+载体创作叙事+印章操作具身性；**与「对称贴贴画」差异**：对称=镜像变换关系，规律=平移周期序列（变换性质不同）。**玩法=给围巾/桌布盖花边**：舞台=载体横条一排格位（**前段已印好规律示范段 ≥2 周期，后续 1-2 空位**），keyless TTS 规律句播报（封闭句表入 §1），下方印章盘 2-3 枚（正确章+干扰章）：**盖对=印章砸下动画+图案浮现留格+pt_right；盖错=图案虚影抖动消散+wrong+miss+pt_wrong（「再看看规律哦」）**；miss≥2 正确章 breathe（答案级）；**题库封闭 20 题（4 章×5，§1 全表）：ch1=AB·红花星星（双元素 2 章）；ch2=AB·变图案对（心/圆点等新对）；ch3=AAB（两同一异）；ch4=ABB（一异两同）+混合**；**数学先验（验算 ✓）**：每题续盖位唯一正确印章（AB/AAB/ABB 周期确定性——相位即续印；印章盘=正确 1+干扰 1-2 枚，干扰章≠正确章图案）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+827)，域全档成立型）**；ch 每关 5 题（5 格续盖=花边延长）；星级=miss 口径；教学：watch=幽灵手指（规律句→看示范段→点正确章→盖印）→点中；turn=你来盖一盖（帮/独）；seed 827

92. **libr 分类归档小图书真值**（6-7 段，信息素养/常识·语义主题分类归档；调研 #118）：**与早期款「形状分家」差异显式声明（防同质化审查项）**：形状分家=**感知属性**分类（形状/颜色直接可见）；分类归档=**语义主题**分类（调用生活常识知识：奶牛→农场/动物）+**冲突卡机制**（一卡两属须按图书管理员的维度提示锚定——信息素养核心=分类标准决定归类）+书架归档载体叙事（卡归格=书立起）。**玩法=小图书室归档**：舞台=书架 2-4 格（每格主题标签牌：动物/食物/衣物/交通）+当前卡大图，keyless TTS 提示句（普通卡「它住哪一格」/冲突卡带维度提示「它住在哪里——农场格」），孩子点格归档：**归对=卡片飞入格+书立起动画+lb_right；归错=卡弹回+wrong+miss+lb_wrong+方向级反馈（重读维度提示：「想一想，它是动物还是食物？」）**；miss≥2 正确格 breathe；**ch 梯度：ch1-2 两格两主题（动物/食物），5 卡简单归档；ch3-4 四格四主题（+衣物/交通）+冲突卡入题（每关 1-2 张——§2 冲突卡表）**；**题库封闭 20 题（4 章×5，§2 全表=每题一卡）+主题卡池封闭（每主题 8-10 张，§2 图卡表）**；**数学先验（验算 ✓）**：普通卡唯一归属格（主题互斥——卡池选题时已排歧义）；冲突卡按提示维度唯一锚定（双属中提示定一）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+837)）**；ch 每关 5 题（5 卡）；星级=miss 口径；教学：watch=幽灵手指（卡出→听提示→点正确格→书立起）→点中；turn=你来放一放（帮/独）；seed 837

93. **gear 齿轮转起来真值**（7-8 段，科学/工程·机械联动预判；调研 #163；**K 类锚=「先猜后试」假设检验循环（OECD AAR）——放齿轮前先预判转向，放后即时验证**）：**与「循环指令」差异显式声明（防同质化审查项）**：循环指令=抽象指令序列执行（符号层）；齿轮=**物理机械联动**（齿轮啮合=相邻反向=奇偶性具象化；转向沿链交替传播）+「先猜后试」探究循环（预判→放置→即时验证）。**玩法=帮小兔子修风车**：舞台=机器墙一排齿轮**槽位**（部分槽位已固定齿轮：**驱动轮（手柄恒右转）与末端风车**；中间 1-2 空槽）+齿轮库 2-3 枚候选，keyless TTS 观察句（「看看手柄往哪转」，§3 句表），**每题=一个空槽的放置决策**（从候选中选一枚放入指定空槽——候选含正确尺寸与干扰尺寸）：**放对=齿轮咬合咔哒+全链联动预演（驱动轮→逐轮交替转向→风车转）+gr_right；放错=齿轮空转不咬合+wrong+miss+gr_wrong+方向级反馈（高亮相邻已咬合齿轮——「看看旁边的齿轮」）**；miss≥2 正确槽 breathe；**ch 梯度：ch1-2 三槽直链（1 空槽·转向观察——预判「这个轮子会往哪边转」）；ch3-4 五槽链（2 空槽分序放置+转向匹配要求（风车要求转向，全链联动后校验））**；**题库封闭 20 题（4 章×5，§3 全表=每题一空槽布局）**；**数学先验（验算 ✓）**：每题唯一正确候选（槽位几何唯一匹配尺寸——干扰候选尺寸不合槽）；链上转向=位置奇偶交替（驱动轮右转=0 号位，k 号位转向=k%2 交替——verify 可独立复算全链转向）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+847)）**；ch 每关 5 题（5 槽=整台机器成形，关末风车全速转动演出）；星级=miss 口径；教学：watch=幽灵手指（观察句→看手柄转向→点正确齿轮→咬合转动）→点中；turn=你来装一装（帮/独）；seed 847

## §1 stamp 规律画画（5-6 段·艺术/逻辑）

**〔v3 改造定版 2026-09-13（难度批 r1）——本节以下为现行契约，§1 后半 v2 题表（AB/ABB 相位轮换 20 题）已作废（保留备查）〕**

**v3 玩法（ABC 起步+双属性+找错体检）**：
- **ch1（ABC 三周期相位轮换）**：FSH/SHO/HOF 三周期组合，seq 长度差承载相位（6-9 位示范段，blanks=1）
- **ch2（双同块 AABB/ABCC）**：FFSS/HHOO/FHOO/OOFF/SHOO 型——「同」也是规律信息
- **ch3（双属性双周期=核心升级）**：图案=形状×颜色双属性（池 8：R/Y/B/G 四色 × T 三角/C 圆/S 方，交叉取 8）。规律=颜色周期[3]与形状周期[6]各自独立错位（LCM=6 不塌缩），续盖位须同时满足两线索；印章盘 4 枚固定结构={真值, 单色对(同色异形), 单形对(同形异色), 双异 extra}——干扰恰满足单属性，逼双线索验证
- **ch4（找错体检式）**：花边 13 格已盖满含 1 枚错章（badIdx seeded∈[6,10]，真值取值域不含 GH 保公平锚），孩子先 tapCell 点出错章（'found'+suspect 标记+盘弹出）再从盘选正确章修对（'fixed'）；点非错章→'wrong'+spm_fix_wrong 链
- **去语音泄题**：规律直读句全废（v1「红花星星红花星星」类）；题面=任务框架句 keyless：spm_task_next'看看花边的规律，盖下一个'(3264ms)/spm_task_dual'颜色和形状都有自己的规律哦'(3384)/spm_task_fix'花边里有一枚盖错啦，找出来'(3504)
- v3 钩子：`ST = { get currentLevel, get quiz(){ kind('next'|'fix'), unit(单维'ABC' 型|双维 {colors:[...], shapes:[...]}), seq[], blank, picks[], answer(从 unit 双周期独立推导), step, miss, say(任务框架句), blanks(恒1), scene, badIdx(fix 型错章位；next 型恒 -1) }, tapStamp(i), tapCell(j), start(flat), autoSolve() }`
- v3 语音 9 句（实长 2026-09-13 重合成后 ffprobe 实测）：spm_tut_watch'看！按规律盖花边'(3192)/spm_tut_turn'你来盖一盖'(1752)/spm_hint'找找颜色的规律，再看看形状'(**3600**)/spm_right'花边真漂亮'(2016)/spm_wrong'再看看规律哦'(2016)/spm_task_next(3264)/spm_task_dual(3384)/spm_task_fix(3504)/spm_fix_wrong'这枚是对的哦，再看看哪枚不合规律'(**4152**)
- v3 窗常量（实长回更 2026-09-13）：**WRONG_CHAIN_WIN=6066**（=spm_wrong 2016+150+spm_hint 3600+300）/ **FIX_WRONG_WIN=4452**（=spm_fix_wrong 4152+300）/ STAMP_WIN=2316（=right+300）/ SHAKE_MS=1100（≤2166 b37 R3）/ FOUND_WIN=1200（找错标记+盘弹出）/ 题面任务句窗=estMs(句长)+300+ENTER_MS 400（家族 T 动态，estMs 口径上界，实测 clip 短于 estMs ~1.7-2.1s——节奏 backlog 观察项）
- v3 题表 20 题全表（真值源=game-data.js CHAPTERS v3；verify SPEC_ROWS 独立硬编码对拍）：ch1 #0-4 ABC（FSHFSH→F/FSHFSHS→S/SHOSHO→S/SHOSHOSH→O/HOFHOFHOF→H）；ch2 #5-9 AABB·ABCC（FFSSFFSS→F/HHOOHHOO→H/FHOOFHOOH→H/OOFFOOFF→O/SHOOSHOOSH→O）；ch3 #10-14 双属性（色 RYB·形 TCSCST→RT/色 BYR·形 SCTTSC→BS/色 BRY·形 STCTCS→BS/色 RYB·形 CSTTCS→RC/色 GRY·形 CTCHCS→GC，各 12 位示范段→第 12 位）；ch4 #15-19 fix 型（badIdx seeded）
- 先验验算：40 关（静态 20+生成 20）引擎沙箱 vs python 镜像 0 mismatch；不变量全过（周期子串/≥2 周期/双同块/池封闭/形状不塌缩/badIdx≠真值/前缀 6 互异/无泄题连读串）


**玩法**：看看花边的规律，盖上下一个印章。
- 教学：watch=幽灵手指看演示（规律句→点正确章→盖印浮现）→点中（演示题=ch1 AB·红花星星 首位同款——thanks 先例）；turn=你来盖一盖帮/独；`__stDemoR`
- 钩子：`ST = { get currentLevel, get quiz(){ unit(本题周期单元'AB'|'AAB'|'ABB'), seq[](示范段图案 id 序列——已盖真值), blank(当前空位序号), picks[](印章盘图案 id 1-3 枚), answer(正确章下标——verify 独立推导), step(全关题号 0-4), miss, say(题面规律句——keyless 非队列链), blanks(本题续盖位数), scene(载体场景档) }, tapStamp(i), start(flat), autoSolve() }`——tapStamp 返回：i=answer→'stamped'/末题 'done'；干扰章→'wrong'；演出期 null（真时钟锁）【探针实证 2026-09-12 含真实点击 ✓】
- 题库 20 题全表（图案 id：F=红花/S=黄星/H=粉心/O=蓝圆点；§0.91 周期封闭）——**v2 定版（agent 交付重推导+主线裁决接受 2026-09-12：原表 8 处笔误——⑥⑧⑨非 AB 周期子串（HH 相邻不可能）/③④⑤相位轮换须靠 seq 长度差实现（同长同相位不可分）/⑬⑮⑰⑳杂空格；主线回写以实现 game-data.js 为真值源）**：
  - ch1（AB·红花星星）：①FSFS__→F ②SFSF__→S ③FSFSF__→S ④SFSFS__→F ⑤FSFSFSFS__→F（**相位轮换=seq 长度差承载（4/5/8 位）——同对子不同末位相位=不同题**）
  - ch2（AB·变对）：⑥HOHOH__→O ⑦OHOHO__→H ⑧HOHO__→H ⑨OHOH__→O ⑩HOHOHOH__→O
  - ch3（AAB 两同一异）：⑪FFSFFS__→F ⑫FSFFSF__→F,S（blanks=2，末格 S 判定）⑬SSFSSF__→S ⑭SFSSFS__→S,F（blanks=2，末格 F 判定）⑮FSFFSFFS__→F
  - ch4（ABB 一异两同+混合）：⑯FSSFSS__→F ⑰SFFSFFS__→F ⑱HOOHOO__→H ⑲OHOHOH__→O（AB 回归复习）⑳FFSFFSFF__→S（AAB 回归）
  - **上表 `__`=本题续盖位（blanks 字段：ch1-2 恒 1、ch3-4 含 2 格题——末格为判定格）；每题印章盘=正确章 1+干扰 1-2（盘序实现自由打乱，answer=正确章在盘内下标）**
- 语音：spm_tut_watch'看！按规律盖花边'/spm_tut_turn'你来盖一盖'/spm_hint'看看前面的花边'/spm_right'花边真漂亮'/spm_wrong'再看看规律哦'（**前缀=spm_ 已核无占用 ✓ 2026-09-12；初选 st_ 撞 stack 全套 7 键（st_tut_watch 等 5 键同名）当场改 spm_——首查误查 pt_ 非 st_ 的教训**）；规律句=题面 keyless TTS（封闭句：「红花星星红花星星」「盖一个一样的」等 §1 句表实现定——say 非队列链，N 不适用承 b37 明示）；确认链=right 单 clip；错链=spm_wrong+150+spm_hint+300（实长表 §4 定）
- SEL/渲染：印章≥96×96 触摸目标；图案 SVG data-anim（盖印=印章砸下+图案弹现）；**盖上的图案永久留格（创作载体——关末围巾成品展示演出）**；5-6 岁印章数≤3
- **防同质化声明（审查项）**：vs 规律侦探=识别→生成（Bloom 升级）+载体创作+印章具身操作；vs 对称贴贴画=镜像变换→平移周期——三重差异

## §2 libr 分类归档小图书（6-7 段·信息素养/常识）

**玩法**：小图书室的书乱了，帮它回家。
- 教学：watch=幽灵手指看演示（卡出→听提示→点正确格→书立起）→点中；turn=你来放一放帮/独；`__lbDemoR`
- 钩子：`LB = { get currentLevel, get quiz(){ card(当前卡 id), label(卡名——SVG 图卡语义), shelf[](书架格主题 id 2-4——**格序 seeded 按关随机排列，answer=shelf.indexOf(主题)**), hint(提示维度：'none'普通|'farm'|'eat'|'pet'|'wear' 冲突维度——**v2 定版枚举，原文'use'等泛写作废**), answer(正确格下标——verify 独立推导), step(全关题号 0-4), miss, say(题面提示句——keyless 非队列链) }, tapShelf(i), start(flat), autoSolve() }`——tapShelf 返回：i=answer→'shelved'/末题 'done'；错格→'wrong'；演出期 null【探针实证 2026-09-12 含真实点击 ✓】
- 主题与图卡池（封闭，SVG 图卡=名称+图形双通道）：动物（小猫/小狗/奶牛/小鸡/金鱼/大象/兔子/小鸟 8 张）、食物（苹果/胡萝卜/面包/鸡蛋/牛奶/香蕉/米饭/蛋糕 8 张）、衣物（外套/鞋子/帽子/裙子/手套/围巾/袜子/毛衣 8 张）、交通（小汽车/公交车/自行车/飞机/轮船/火车/救护车/消防车 8 张）
- 题库 20 题全表（每题一卡；冲突卡=双属卡带维度提示——§0.92 机制）：
  - ch1（两格：动物/食物）：①小猫→动物 ②苹果→食物 ③奶牛→动物 ④面包→食物 ⑤小鸡→动物
  - ch2（两格：动物/食物）：⑥金鱼（card id `goldfish`）→动物 ⑦香蕉→食物 ⑧大象→动物 ⑨牛奶→食物 ⑩兔子→动物
  - ch3（四格：+衣物/交通）：⑪外套→衣物 ⑫小汽车→交通 ⑬裙子→衣物 ⑭飞机→交通 ⑮**奶牛（冲突：动物/农场——提示「它住在哪里」→动物）**
  - ch4（四格：+冲突卡入题）：⑯**鸡蛋（冲突：食物/动物产物——提示「我们能吃它」→食物）** ⑰手套→衣物 ⑱**兔子（冲突：动物/宠物——提示「它是毛茸茸的朋友」→动物）** ⑲轮船→交通 ⑳**围巾（冲突：衣物/礼物——提示「天冷戴在脖子上」→衣物）**
  - **冲突卡维度提示=keyless TTS 提示句锚定唯一格（§0.92 先验：双属中提示定一）；普通卡唯一归属（主题互斥）**
- 语音：lb_tut_watch'看！把书放回家'/lb_tut_turn'你来放一放'/lb_hint'它住哪一格呢'/lb_right'放对啦'/lb_wrong'再想一想哦'（**前缀=lb_ 已核无占用 ✓**）；提示句=题面 keyless TTS（普通「它住哪一格」/冲突卡维度句——say 非队列链）；确认链=right 单 clip；错链=lb_wrong+150+lb_hint+300；**方向级反馈=错时重读维度提示（不亮正确格本体——冲突卡须靠维度推理）**
- 渲染：书架格=主题标签牌（小图标+主题色）；卡片飞入动画+书立起（格内已归卡可视化堆叠——进度可见）；**卡面=图形为主+名称小字（6-7 岁识字辅助非依赖——TTS 双通道）**
- **防同质化声明（审查项）**：vs 形状分家=感知属性→语义主题（知识调用层级）+冲突卡（分类标准裁决=信息素养核心）+归档载体叙事——三重差异

## §3 gear 齿轮转起来（7-8 段·科学/工程）

**〔v3 改造定版 2026-09-13（难度批 r3）——本节以下 v3 块为现行契约；后半 v2 玩法（needSize S/M/L 尺寸匹配 3 选 1 自认证/need 恒 cw 备案/「先猜后试」非判定层）已作废（保留备查）。改造动因=审计红旗：68-82s/关过易+判定=indexOf(needSize) 尺寸匹配可一眼瞟+奇偶律只在题面文字不在判定+齿轮科学概念全是背景板〕**

**v3 玩法（双答制+齿数制+三题型）**：
- **双答制（delta 1 转向预判入判定）**：每题两段判定——阶段1 预判答（题面按题型问「末端轮往哪边转/哪个转得快/转得动吗」，预判行按钮组 answerbar）→ 答对 'ok' 进阶段2（picks.dim 解除，pindir 方向钉钉住）；阶段2 选齿数（放置框架保留）。两段全对才推进；阶段1 错='wrong'+miss+专用错链（不泄答案）；阶段1 未答对点齿轮吞 null（顺序守卫——engTapGear guard `!q._dirOk → null`）
- **齿数制 5 档（delta 5 候选去恒等）**：TEETH={t8,t10,t12,t14,t16}（直径=齿数×6.6px：53/66/79/92/106——相邻差 13.2px）；齿轮统一色 GEAR_FILL（防颜色编码绕过数齿通道）；候选=need+NEIGHBOR 邻档池 {t8:[t10,t12], t10:[t8,t12], t12:[t10,t14], t14:[t12,t16], t16:[t12,t14]}（|齿数差|∈{2,4}——逼数齿/比邻轮，禁一眼瞟），seeded 打散（每题 2 draws）→ answer=indexOf(need) 唯一
- **三题型判定律（delta 2/3/4——verify specDirAnsOf 与 python GR 独立重列，禁调引擎）**：
  - dir（转向预判）：dirAns = blank%2==0?'cw':'ccw'（驱动轮 0 号恒 cw，相邻反向交替——奇偶律真判定）
  - speed（传动比·ch3，大轮带小轮）：dirAns = dteeth===need?'same':'small'（啮合角速度∝1/齿数——齿少者恒快；'big'=misconception 干扰恒非真值）；可视化=同窗转速动画 --dur=齿数×TOOTH_MS（70ms）——D 槽/空槽 duration 比=齿数比（verify 断言）
  - conflict（双驱动冲突·ch4）：jam = (blank%2)!==((n-1-blank)%2)（双驱两端均 cw，两路奇偶冲突=锁死「转不动」——代数等价 iff n 偶）；选项组 {cw,ccw,jam}，DIR_LABELS：jam'转不动'/small'小轮快'/same'一样快'/big'大轮快'
- **章梯度**：ch1=dir 入门（链 3-4，题面'看一看手柄往哪转'8 字窗 3660）/ch2=dir 长链（链 3-6 变化承载奇偶深算，'猜猜这个轮子往哪边转'10 字窗 4350）/ch3=speed 两轮直驱恒 D_W（'哪个齿轮转得快'7 字窗 3315）/ch4=conflict 混排+dir 回归（'这个轮子转得动吗'8 字窗 3660）——4 章×5 题=20 题封闭
- **布局记法 v3**：'D'=驱动轮（0 号恒 cw；speed 章齿数=dteeth 表定，他章恒 t12）/'W'=风车链尾/'B'=右手柄第二驱动链尾（conflict 专用恒 cw 齿数恒 t12）/'x'=固定轮（fixes 表给齿数档）/'_'=判定空槽（每题恰 1，非首尾）；链长 3-6（六槽 portrait 收窄 slot 100px+#wall overflow-x:auto——页面级 overflowX 恒 0）
- **题库 20 题全表（v3——真值源 game-data.js SPEC_TABLE；verify specTable/python GR_SPEC 双独立对拍；行号=章池索引）**：
  - ch1（dir 入门）：①D_W b1 t10 ②Dx_W b2 t12{x1:t10} ③D_W b1 t14 ④Dx_W b2 t8{x1:t16} ⑤D_W b1 t12
  - ch2（dir 长链）：⑥Dx_W b2 t10{x1:t14} ⑦D_xxW b1 t16{x2:t8,x3:t12} ⑧Dxxx_W b4 t14{x1:t12,x2:t8,x3:t16}（六槽）⑨D_W b1 t12 ⑩Dxx_W b3 t8{x1:t12,x2:t16}
  - ch3（speed，记法 need←dteeth）：⑪t8←t16（small）⑫t16←t8（small）⑬t12←t12（same）⑭t10←t16（small）⑮t10←t10（same）
  - ch4（conflict 混排）：⑯Dxx_W b3 t12{x1:t8,x2:t14}（dir 回归·n5→ccw）⑰D_xB b1 t10{x2:t14}（n4 偶→jam）⑱Dxx_B b3 t8{x1:t12,x2:t16}（n5 奇→ccw）⑲Dxxx_B b4 t16{x1:t10,x2:t8,x3:t14}（n6 偶→jam）⑳Dx_W b2 t10{x1:t16}（dir 回归→cw）
  - **分布先验（spec_check.py 验算 ✓）**：dirAns 分布 cw5/ccw8/jam2/small3/same2；ch2 链长集 {3,4,5,6}；need 5 档全覆盖；conflict n 偶 2 题（jam）奇 1 题（不 jam）——真值分歧型
- **钩子 v3**：`GR = { get currentLevel{flat,ch,dch,lv,n,step,done,won,miss,stars}, get quiz{kind('dir'|'speed'|'conflict'), layout(记法原串), slots[]({i,fixed,gear(档id|'D'|'W'|'B'|null),teeth(数|null),dir('cw'|'ccw'|'jam'|null),type('D'|'W'|'B'|'fix'|'blank'),meshed}), blank, picks[](3), answer, need(档id), dteeth, dirAns, jam, phase(1|2), obs, step, miss}, tapDir(d), tapGear(i), start(flat), autoSolve()(两段 taps=题数×2), reread(), get tutorial }`（真实页同暴露——b29 坑⑥）；tapDir：d=dirAns→'ok'（phase→2）/干扰→'wrong'/豁免窗内错答吞 false/演出期·阶段2·已答 null；tapGear：对非末题→'meshed'/末题→'done'/干扰→'wrong'/阶段1 未答 null/豁免窗内错点吞 false/演出期·越界·已答 null
- **语音 7 句（v3 +2，ffprobe 实测 2026-09-13）**：gr_tut_watch'看！齿轮咬齿轮'(3024)/gr_tut_turn'你来装一装'(1776)/gr_hint'看看旁边的齿轮'(2328)/gr_right'风车转起来啦'(2088)/gr_wrong'齿轮还没咬上哦'(2184)/**gr_dir_wrong'不对哦，隔一个反一次'(2760)/gr_speed_wrong'数一数两个齿轮的齿'(2664)**（新增 2 键已核 manifest 无占用；gen_clips.py batch38 gear 段登记）；题面句=章档 keyless say（ch1-4 句见章梯度——家族 T 窗=estMs(字数)+300）；确认链=['gr_right'] 单 clip；错链两型：尺寸=[gr_wrong,gr_hint]、转向=[gr_dir_wrong,gr_hint]、快慢=[gr_speed_wrong,gr_hint]
- **窗常量 v3（实长回更）**：三链豁免窗 WRONG_CHAIN_WIN=4962（=2184+150+2328+300）/DIR_CHAIN_WIN=5538（=2760+150+2328+300，v3 最长链）/SPEED_CHAIN_WIN=5442（=2664+150+2328+300）——真时钟不随 SPEED 提速；三首错锁（b37 R3=clip+150 顶格，禁叠 +140 尾窗——b38 R1 总窗口径）WRONG_LOCK_1=2334/DIR_LOCK_1=2910/SPEED_LOCK_1=2814；WRONG_LOCK_2=1000（miss≥2 防重入）；判对演出 MESH_MS=1100+CHAIN_MS=1500（2600≥right+300=2388）；DIR_OK_MS=500（阶段1 答对钉住窗，+140 演出尾）；FULL_WIN=2400（关末全速≥right+300）；TOOTH_MS=70（转速周期=齿数×70ms）；教学延窗 watch 3324/turn 2076
- **教学 v3（两步演示分账 12324ms ≤16000 单步演示款口径）**：watch 3324+题面句窗 3660+ghost①移入 800+press 320+tapDir'ok' DIR_OK_MS 500+ghost②移入 800+press 320+demo 演出 1100+1500——ghost 先指预判按钮、再指正确齿轮（双答两步分流）；turn 单题先答预判再放对→独
- **渲染 v3（渲染判定一致 r2 M1）**：旋转方向视觉=getComputedStyle animationDirection 与 data-dir 一致（ccw=reverse——verify DOM 断言）；转速=--dur 齿数×TOOTH_MS；jam 演出=全链 .jammed 微抖（无 .spin）+放对后 B 手柄 .unhands 灰化+关末拆柄全速（ch4 无 W 风车收尾变体）；阶段1 视觉=picks.dim+answerbar 按钮组（dir2/speed3/conflict3）；错反馈方向级=高亮相邻已固定齿轮 litNeighbors（不泄答案）
- **承 v2 不变项**：星级 miss 口径（0=3★/1-2=2★/≥3=1★ 永不 0 星）；救援双锚（14s 方向级 litNeighbors/30s 答案级 breathe——phase 感知：phase1=正确预判按钮/phase2=正确齿轮）；seed 847；生成关 dch=ri(rnd,1,4) 域全档成立型（mulberry32(flat*7919+847) 首随机数先取+档池 seeded 无放回抽 5+每题 picks 打散 2 draws）；家族契约 A-O 全承（E 教学特例 sv.gear.tutSeen/C 存档键 kidsgame_gear）

**玩法**：齿轮咬齿轮，风车转起来。
- 教学：watch=幽灵手指看演示（观察句→点正确齿轮→咬合+全链转）→点中；turn=你来装一装帮/独；`__grDemoR`
- 钩子：`GR = { get currentLevel, get quiz(){ slots[](槽位序列：{i 位置号, fixed 布尔, gear(已放齿轮尺寸 id|null), dir(该位转向 'cw'|'ccw'|null——固定轮/已咬合轮真值), type(槽型), meshed(该轮已咬合布尔)}), blank(当前空槽位置号), picks[](候选齿轮尺寸 id 2-3), answer(正确候选下标), need(风车要求转向 'cw'|null——**v2 备案：恒 'cw' 数学必然**), step(全关题号 0-4), miss }, tapGear(i)(i=候选下标), start(flat), autoSolve(), reread()(观察句重读) }`——tapGear 返回：i=answer→'meshed'/末题 'done'；干扰→'wrong'；演出期 null【探针实证 2026-09-12 含真实点击 ✓（W 位 2 号 dir='cw' 转向律实证）】
- 转向律（§0.93 数学锚——verify 独立复算依据）：**驱动轮 0 号位恒 'cw'（手柄右转）；k 号位转向=k%2==0?'cw':'ccw'（相邻反向交替）**；全链咬合=判定槽开口尺寸=needSize（表定），picks 恒 S/M/L 各一枚 → 唯一正确候选=picks.indexOf(needSize)，干扰=偏大/偏小不合槽；**need 恒 'cw' 数学必然备案（agent 论证主线接受）：本批全部布局池风车轮 W 恒落偶数位（D_W→W 在 2；D__MW/D__LW/D__SW→W 在 4；DS__W/DM__W→W 在 4），k%2 转向律下 W 位恒 cw——ch4 need 字段在题值上恒 'cw' 非偷懒，若后续扩布局池出现奇位 W 须真校验**
- 题库 20 题全表（**v2 定版布局串记法：串字符即槽序列——'D_W'=三槽(D/空/W)，'D__MW'=五槽(D/空/空/M/W)；原文 'D_M_W'/'D__M_W' 尾 '_' 系记法笔误（5/6 字符与「三槽/五槽」注释矛盾）——agent 按注释语义定版，主线裁决接受；每题 fields：layout/blank 判定槽/needSize 唯一正确尺寸/bunny 兔子补齐槽/bunnySize 补齐尺寸（演出层恒≠needSize 视觉可辨）**）：
  - ch1（三槽直链·1 空槽·转向观察）：①D_W→判 1 放 M ②D_W→放 L ③D_W→放 S ④D_W→放 L ⑤D_W→放 M（**候选恒 S/M/L 各一枚——needSize 唯一匹配**）
  - ch2（三槽直链·预判深问）：⑥D_W→放 S ⑦D_W→放 M ⑧D_W→放 L ⑨D_W→放 S ⑩D_W→放 M（needSize 池轮换；预判「这个轮子往哪边转」问句承载）
  - ch3（五槽链·2 空槽=1 判定+1 兔子补齐）：⑪D__MW→判 2 放 M（兔 1 补 S）⑫DS__W→判 3 放 L（兔 2 补 M）⑬D__LW→判 2 放 M（兔 1 补 L）⑭DM__W→判 3 放 S（兔 2 补 L）⑮D__SW→判 2 放 L（兔 1 补 M）
  - ch4（五槽+need 入题）：⑯D__MW 判 2 放 M ⑰DS__W 判 3 放 L ⑱D__LW 判 2 放 M ⑲DM__W 判 3 放 S ⑳D__SW 判 2 放 L（均 need='cw'——数学必然见转向律备案）
  - **每关 5 题=5 个放置决策（STATIC_LEVELS=20 静态关+关内 rotate 取题——thanks 先例；关末整台机器全链联动+风车全速演出；ch3-4 的第二空槽由小兔子补齐齿轮（演出层非判定——孩子每题只决策判定槽一个）**
- 语音：gr_tut_watch'看！齿轮咬齿轮'/gr_tut_turn'你来装一装'/gr_hint'看看旁边的齿轮'/gr_right'风车转起来啦'/gr_wrong'齿轮还没咬上哦'（**前缀=gr_ 已核无占用 ✓**）；观察句=题面 keyless TTS（「看看手柄往哪转」「猜猜这个轮子往哪边转」——§3 句表实现定，say 非队列链）；确认链=right 单 clip；错链=gr_wrong+150+gr_hint+300；**方向级反馈=错时高亮相邻已咬合齿轮（转向视觉重读——箭头浮现）**
- 渲染：齿轮=SVG 齿圈（尺寸可辨 S/M/L）；**全链联动动画=逐轮延迟起转（转向交替可视化——教学核心）；风车=末端联动**；「先猜后试」：放置前转向箭头虚影预判提示（可点「猜一猜」非判定）——演出层不判定
- **防同质化声明（审查项）**：vs 循环指令=抽象指令序列→物理机械联动（奇偶性具象）+先猜后试探究循环（K 类 AAR 锚）——双重差异

## §4 交付与验收（承 batch15-37 流水线）

语音预合成（gen_clips.py 扩 batch38 块：spm_ 5 条/lb_ 5 条/gr_ 5 条=**15 条**；前缀 spm_/lb_/gr_ 已核无占用 ✓ 2026-09-12（st_ 撞 stack 改 spm_——manifest 曾被覆盖后已全量重建恢复，stack 7 键+mp3 复原验过））→ 3 agent 并行（任务书必带：契约 A-O+I 补逐条+b33 三条硬性+b34-b37 坑带入（**首错锁≤wrong+150/探针含真实点击/J 写法恒 cur.flat<3/build 三款断言对称**）+§0.91-93 先验逐条+钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>（b29 坑⑥）/契约 M 帧内容断言（stamp 图案留格 DOM 断言+libr 书立起 DOM 断言+gear 齿轮咬合 DOM 断言）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact/verify 页先等 title=VERIFY PASS 再驱动/无头测试 --mute-audio+stub 发声/**错链豁免窗对选放行语义（首错锁收窄 b37 R3）**）→ 首单元门禁（gate_common38.py：ST/LB/GR 映射——**三款教学末步：stamp='stamped'/libr='shelved'/gear='meshed'**）→ 探针定钩子语义（**必含一次真实点击——b37 盲区教训**）→ 独立复验（verify_batch38.py T1-T11+T9b）→ 全量回归（verify_final38.py R1-R8；R6 主入口 111→114）→ 两级入口 → 反方审查+分龄试玩（stamp=5 岁半/libr=6 岁半/gear=7 岁半）→ 修复闭环 → 收官（114/120）

**实长表（浏览器 Audio 实测 2026-09-12；等待窗=实长+300 余量；全表 15 条零缺漏 bad=[]，_clipdur38.json 真值源）**：
- **spm_**：tut_watch 3192/tut_turn 1752/hint 2232/**right 2016（判对后窗 ≥2316）**/wrong 2016；确认链=right 单 clip **2316**；**spm 错链=wrong 2016+150+hint 2232+300=4698**；规律句=题面 keyless TTS（窗=estMs 句长+300，句表 §1 实现定；示范段图案名连读 4-6 字 estMs 1980-2670）
- **lb_**：tut_watch 2976/tut_turn 1776/hint 1992/**right 1536（判对后窗 ≥1836）**/wrong 1728；确认链=right 单 clip **1836**；**lb 错链=wrong 1728+150+hint 1992+300=4170**；提示句=题面 keyless（普通「它住哪一格」6 字 estMs 2670/冲突卡维度句 8-10 字 estMs 3360-4050——句表 §2 实现定）
- **gr_**：tut_watch 3024/tut_turn 1776/hint 2328/**right 2088（判对后窗 ≥2388）**/wrong 2184；确认链=right 单 clip **2388**；**gr 错链=wrong 2184+150+hint 2328+300=4962**；观察句=题面 keyless（「看看手柄往哪转」8 字 estMs 3360——句表 §3 实现定）（**v3 r3 后以 §3 v3 块为真值：gr_ 7 条（+dir_wrong 2760/speed_wrong 2664），三链窗 4962/5538/5442+三首错锁 2334/2910/2814**）
- 教学预算验算（三款均单步演示款 ≤16s 名义）：spm ≈3492+规律句 2970+ghost 1120+盖印演出 1000+2316≈10900 ✓；lb ≈3276+提示句 2970+ghost 1120+书立起 1000+1836≈10200 ✓；gr ≈3324+观察句 3660+ghost 1120+咬合联动 1500+2388≈12000 ✓（余量充足——实现后回填实测）
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

**语音清单硬指标**：manifest 15 条合成 ok=15 fail=0；gate G3 注入数 5+5+5+core 3。

**agent 交付偏离裁决记录（2026-09-12，主线逐条裁决全部合理接受，已回写正文 v2 标注）**：stamp 5 条（题表 8 处笔误重推导（答案字母不变）/相位轮换=seq 长度差承载/ch1-2 恒 blanks=1/quiz 增 say+blanks+scene/主线锁周期律非题串）；libr 6 条（hint 枚举定版 farm|eat|pet|wear/card id goldfish/格序 seeded 自由排列 answer=indexOf/quiz 增 say/提示句「它住哪一格呢」6 字定版/方向级反馈=重读维度提示不亮格）；gear 6 条（布局串定版 'D_W'/'D__MW' 系/2 空槽=1 判定+1 兔子补齐演出/need 恒 cw 数学必然备案/needSize+bunnySize 入题表/STATIC_LEVELS+关内 rotate/reread 钩子）。**b38 主线教训：SPEC 先验验算不足（§0 b35 条款执行不力）——题表记法串未逐字符验周期合法性即定稿，agent 侧 8 处笔误全数检出无漏网（12/12 复验佐证），但 SPEC-实现双向漂移成本已发生；下批 SPEC 题表写完须脚本验算（周期串/字符数/相位可分性）再发任务书**。

## §5 反方审查+试玩修复记录（2026-09-12 回填）

**复验**：verify_batch38.py 三款 12/12×3 全绿（stamp 周期律复算 answer=seq[blank%period] 20 关×5 题含双空位连盖/libr 题表对账+冲突卡 hint 维度锚/gear 转向律 k%2 独立复算+槽数域；T4 seeded dch obs 20/20 对账三款全过）。**主线侧修正 4 起（全非产物缺陷）**：①stamp blanks=2 题（ch3 ⑫⑭）驱动只盖一格→「未推进」假 FAIL——修=按 blanks 连盖每盖重读 quiz 对账新 answer；②UNIT_CH 章域写窄漏 ch4 回归题（⑲AB/⑳AAB）；③libr LB_BANK 两笔误（cloth→clothes 实现 id/⑬裙子 skirt 抄成 dress）+T10 正则撞名（题级 hint:'none' 恰 4 字符过长度滤混进章预告统计——枚举黑名单排除）；④R8 exp 误用 seeded 复算——flat6-10 是静态关 dch=flat//5+1 确定性映射（obs 三款同 [2,2,2,2,3] 正是佐证），seeded 只管 flat≥20 生成关。

**两级入口**：主入口行级插 3 卡 111→114（56 段末=stamp/67 段末=libr/78 段末=gear，_patch_main38.py 断言对账过）+batch38/index.html 三卡二级入口。

**反方审查**（REPORT-REVIEW-b38.md）：**0 fatal / 1 major / 3 minor**。
- **R1（major·M1）gear 首错锁越界**：main 锁表达式叠 `+ 140` 尾窗——SPEED=1 实锁 2334+140=**2474** > 上限 wrong+150=2334；三层断言（build 常量/verify winCalc/verify 页 SPEED=0.12 运行时）全盲区（verify 提速天然测不出——此前未被发现的结构原因）。修复：main:291 去 `+ 140`（实锁=2334 顶格合规）+build 补总窗口径负向断言 `锁*SPEED + 140 not in main`+verify winCalc 同步补——防回归三层闭环；**教训入档：锁窗类断言须总窗口径（常量×SPEED+尾窗常数全算），verify 页提速模式测不出真实速度锁值**。**修复复核结论（2026-09-12）**：负向断言有效性实证=对照注入 +140 被 build 当场拦截；行为测量法不可归因（gear 实测 2608/libr 基线 3073 vs 各自已知锁 2334/1240——测得的是「错点→对选可成功」全链时长，含错链语音窗+动画多因素，两款偏差 274/1833 不等无系统模型）——锁值以静态证据链定案：源码代数（`*SPEED` 无尾窗+真实页 SPEED 恒 1）+常量断言+负向断言拦截实证三重。main 另两处 `SPEED + 140`（:178 观察句窗/:316 mesh 联动演出窗）系合法演出尾窗非错锁，M1 条款不适用。
- **R2（m1）注释漂移 4 处**：gear-data ch2 布局池 v1 记法残留（表实现正确）/gear-main need 注释把 ch3 归入有值档（实现 null 与表一致）/stamp 钩子头缺 say+blanks+scene/libr 钩子头缺 say——全部同步修复。
- **R3（m2）SPEC §4 裁决记录「7 字」笔误**：实值『它住哪一格呢』=6 字（实现+build 断言+实长表三方一致，纯文档笔误）——已改 6 字。
- m3 并 m1（need 口径超集无害；need='cw' 备案仅 ch4 生效，扩布局池须重验奇位 W）。
- 已核查通过 14 项（契约 J/I+N/M/防沉迷/降坡/离线/题库 v2 逐题验算/b33 三硬性/b34-b37 坑带入/build 断言对称/verify 字面核对/主线验收层存在）。

**分龄试玩**（REPORT-PLAYER-b38.md）：**三款六步全过 0 阻断**（pageerror 0×3/console error 0×3；教学 18-20s/首关 70.5s/75.2s/79.6s；分龄错率混点 30%/20%/10% 全自恢复）。亮点实测：吞点有 bump 回应不干着急（5.5 岁）、错后维度句重读生效（6.5 岁「它把提示再念一遍我就对了」）、先猜后试 nonJudge 不扣分成立（7.5 岁）、家长门两位数加法实测挡住分龄儿童。backlog 4 条：①stamp flat1 99.5s 双空位+高错率累计等待感（breathe 兜底有效）②libr 维度重读与救援重播偶发同毫秒双触发（单句不叠音非 bug）③gear 观察句每题必播重复度偏高（ch2 起预判行未覆盖）④教学 18-20s 节奏合适维持。

**修复闭环**：_patch_review38.py 7 处（count==1 断言）+node --check 3/3+rebuild 三款（stamp 309399/libr 316687/gear 319742 chars）+全量终跑 R1-R8 8/8（复验×3+回归重跑）。
