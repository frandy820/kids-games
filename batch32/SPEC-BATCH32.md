# SPEC-BATCH32 · 扩容批 2（五感侦探 / 兔子机器人学跳舞 / 找证据）契约 v1（2026-09-11；§6 r11 增补 2026-09-14）

对象：120 款扩容第 2 批（每段各 1 款）。目录 `batch32/senses|robotdance|evidence/`。
结构照 batch1-31：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch31/animalmenu/_src/（图卡点选+两族题型+平铺 quiz 同构——senses 同构）、batch10/simon/_src/（序列演示→回忆同构——robotdance 演示相位参照）、batch16/read/_src/（文字题面+图卡——evidence 参照）、batch23/share/_src/（6-7 点选+图主文辅）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-72 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b31 定版，一项违反=审查 Major 起步）：A. 启动 dayEnd 的 nextHint 传 `lim-1`（winFlow 传 `nextHint(null)`）；B. 救援钟双锚：14s 方向级独立节流锚 lastDir（不得重置 lastAct）+30s 答案级 ≥20s 独立节流；C. 预置存档键 `kidsgame_<game>` 必带 `v:'1.0'`；D. 吞输入轻叮必配容器 bump；E. 修复行为收窄先查教学特例；F. 章末 hint=预告下一章（hint[i]↔CHAPTERS[i+1]），生成关 nextHint 实算 `genLevel(f+1).dch-1` 禁 (ci+1)%4，生成关 dch=seeded `ri(rnd,1,4)` 随机（禁循环取材）；G. queue 拼播链后窗=链总实长+300；H. 判对/奖励窗按实测 clip 时长+300；TTS 拼句窗=estMs 全字符口径 `len*345+600`+build 静态断言「窗≥estMs」；I. 错反馈链豁免窗 wrongChainUntil（仅链起播时设；救援 interval 早退守卫，startLevel 重置 `lastWrongVoice=0; wrongChainUntil=0`，build 静态断言）；**I 补（b31 定版）：错链豁免窗错点吞、对选放行、窗后二错照计 miss——guard 挂 uiTapOpt 入口 `wrongChainUntil && Date.now()<wrongChainUntil && i!==q.answer`（错点 pop+bump 吞不计 miss；对选立即放行；防重入必须真时钟窗，禁 locked×SPEED 缩水窗）**；J. 错反馈语义句全程保留（flat≥3 只 10s 节流禁切通用 clip）+节流锚 startLevel 重置；K. rescueTick 面板在场守卫 `if (document.querySelector('.k-dayend,.k-chapterend,.k-resttip,.k-celebrate,.k-panel')) return;`——救援 tick 必须命名函数 rescueTick()；L. TTS 数字/量词映射表覆盖封闭集全量值，verify 全量值输出断言禁 undefined；M. 变换演出族 verify 必带帧内容断言；N. 拼播链 keyless TTS 段必居链尾（core.js queue 弃尾语义；verify keylessLast 断言+build 静态断言双落）；O. 款内自建 button 带显式 color 类（core 有 button{color:inherit} 兜底，禁依赖兜底）〕**

76. **senses 五感侦探真值**（5-6 段，常识/科学·感官）：**感官封闭 5**（eye 眼睛/ear 耳朵/nose 鼻子/hand 小手/mouth 嘴巴——感官名音 5，感官小人 SVG 5：特征=眼/耳/鼻/手/嘴特写+对应动作线）；**物品封闭 10（每感官恰 2 物，主感官唯一明确）**：eye→rainbow 彩虹/star 星星闪闪；ear→bell 闹钟响响/birdsong 小鸟唱歌；nose→flower 花儿香香/cookie 饼干香香；hand→softtoy 毛绒软软/ice 冰块凉凉；mouth→lemon 柠檬酸酸/candy 糖果甜甜（物品场景 SVG 10：图内带感官线索——钟+声波线/花+香气曲线+鼻子凑近/冰块+冷气线+手指触碰/柠檬+咬一口+酸表情等，禁歧义图：视觉信息不得为唯一线索的 ear/nose/hand/mouth 物不得画成「只能看」的静态物）；**题型两族**——**findsense**（出示物品场景大图+物品名音 →「用什么呢」感官卡点选）与 **findthing**（出示感官小人图+感官名音 →「什么用它呀」物品卡点选，ch3+ 才出）；**候选数学先验**：findsense 候选感官互异含真值⊆感官 5（ch1 2/ch2 3/ch3+ 4）；findthing 候选物品互异含真值，**干扰不含真值同感官的另一物**（防双真值——每感官 2 物，若 2 物同在场则两选都对=违约；verify 断言同感官对至多 1 物在场），ch3 4 候选；章：ch1 findsense 2 候选/ch2 findsense 3/ch3 两族混出均 4/ch4 生成混合 seeded `mulberry32(flat*7919+421)`（本批常量 sen）；每关 5 题；星级=miss 口径（0=3★/1-2=2★/≥3=1★）；错反馈：findsense→「再想一想，用什么呢」（方向级=物品图再 pulse）；findthing→「再想想什么用它」（方向级=感官图再 pulse）；miss≥2=正确卡 breathe（答案级，家族梯度）；判对确认=right clip+感官/物品名音拼播（名音在 keyless 段前——契约 N）；卡面零文字（5-6 岁不识字可玩）

77. **robotdance 兔子机器人学跳舞真值**（6-7 段，计算思维·序列记忆）：**动作封闭 5**（jump 跳一跳/spin 转一圈/clap 拍拍手/stomp 跺跺脚/wave 挥挥手——动作名音 5+兔子机器人动作 SVG/动画 5：jump=兔整体上下位移动画/spin=rotate 动画/clap=双手开合/stomp=单脚下踩+尘土/wave=单臂摆动）；**玩法=看→拼（按序点选重建）**：①演示相位——兔子机器人逐动作播（动画+名音，每动作 ~1.2s，段间 150ms），播完「你来拼一拼」；②重建相位——序列槽 3-5 个（左→右）+动作块候选区（**含未用干扰动作**：ch1 无干扰/ch2+ 干扰 1-2 个）；儿童**按序点选动作块**：点对（=当前空槽应填动作）→填入槽+块 pop 消失+该动作短动画重放（200ms 微缩版）；点错（干扰块或顺序错位块）→wrong；③全部填对→机器人按拼好的完整跳一遍（每动作动画+名音）+确认链 right；**数学先验**：序列动作**无重复**（5 动作池步数 3-5，distinct 恒可行）；步数：ch1 3/ch2 4/ch3 5/ch4 生成 3-5 seeded `mulberry32(flat*7919+823)`；**干扰数定版 v2（2026-09-11 复裁）=min(池5−步数, 章上限 DCH_CAP{ch1:0, ch2:1, ch3:2, ch4:2})——blocks=ch1 3/ch2 5/ch3 5/ch4 恒 5。v1「恒=池5−步数」系对原文的过度修正（原文「干扰⊆未用动作」是子集关系非恒等：ch1=0 干扰是原文明示的教学章起步设计，非违约；原文唯一硬伤=ch3「干扰1-2」在 5 步用尽池时无解——cap 截断后 ch3=min(0,2)=0 恰为数学唯一解）。复验按 min 公式断言**；教学演示（2 动作舞）豁免干扰公式（教学简单优先）；每关 5 题（5 段舞）；错反馈：首错=「再想一想，下一步是哪个」（方向级=槽区高亮当前槽）+演示重播按钮（replay 句）；miss≥2=正确动作块 breathe（答案级——此时块尚未点过）；**已点对的槽不回退**（错只计 miss 不清槽——重摆不从零，b18 定案）；判对确认=完整舞动画+right+末动作名音；**序列题 verify 必带帧内容断言（契约 M）：填槽过程逐槽断言槽内动作 id+最终序列==真值序列**；星级=miss 口径；卡=动作图+小字名（图主文辅）

78. **evidence 找证据真值**（7-8 段，信息素养·证据意识）：**结论封闭 8**（每条配真证据 2-3+干扰 2-3，证据=图卡+短标签小字。**交付修正 2026-09-11：SPEC 原每条只给 1-2 干扰（findexact 需 3），agent 补 15 个干扰 id 入池——池层保 weak≥1+none≥1，「tree弯」拉丁化 treebend；复验前必核补入干扰的弱相关/无关分类语义**）：①rainwet 刚下过雨→真=puddle 地上有水洼/umbrella2 路上好多人打伞/wetground 地面湿湿；干扰=cloudy 天上有云（弱相关）/wetdog 小狗淋湿（可能自己洗澡）；②snowplay 下过雪→真=snowman 雪人立在门口/icicle 屋檐挂冰柱；干扰=coldboy 小朋友穿外套（弱相关）；③birthday 今天有人过生日→真=cake 桌上有大蛋糕/gift 手里拿礼物盒/candles 插蜡烛的蛋糕；干扰=balloon 房间里有气球（弱相关）；④cooked 妈妈刚做过饭→真=steam 锅还在冒热气/smell 香味飘满厨房/dishes 碗还没洗；干扰=fridge 冰箱门开着（无关）；⑤doghere 小狗来过→真=paw 印子/狗爪印/doghair 沙发上狗毛/bonebone 地上有啃过的骨头；干扰=ball 地上有球（无关）；⑥windbig 刮过大风→真=treebend 小树吹弯了/leaves 落叶铺了一地/hatfly 帽子被吹跑挂在树上；干扰=cloudy2 天上有乌云（弱相关）；⑦paintday 刚画过画→真=painthand 手上有颜料/paintjar 颜料罐开着没盖/paper 桌上摆着画好的画；干扰=brush 洗干净的笔挂起来（弱相关）；⑧nightowl 昨晚很晚还有人醒着→真=lamp 深夜台灯亮着/cup 桌上有喝了一半的热牛奶；干扰=clock 钟指向很晚（钟面本身不证明有人）；**题型两族**——**findexact**（出示结论卡（文字+语音）→「哪张能证明它呀」证据卡点选，单真值：候选恰 1 真证据+3 干扰）与 **findall**（ch3+：结论配 2 张真证据——**点对第 1 张标记 lit 不推进，点对第 2 张完成**；点错=wrong；候选=2 真+2 干扰）；**干扰类型显式标注**（弱相关 vs 无关——弱相关=「常常一起出现但不足以证明」，无关=「和结论没关系」；两类都要入池且 verify 按类断言分布：每关至少 1 弱相关干扰在场）；**候选数学先验**：findexact 真值恰 1（同结论其他真证据不得入候选——防双真值，verify 断言）；findall 真值恰 2（该结论真证据恰 2 入候选）；候选互异⊆该结论证据池；章：ch1 findexact/ch2 findexact（干扰含弱相关+无关混合）/ch3 两族混出/ch4 生成混合 seeded `mulberry32(flat*7919+1031)`；每关 5 题；错反馈：首错=「再看看这张图，能证明吗」（方向级=结论卡再 pulse）；miss≥2=正确证据卡 breathe（答案级）；判对确认=right clip（findexact）/right 单段（findall，两卡 lit 动画承载）；7-8 段文字承载：结论句完整文字+证据卡图+短标签

## §1 senses 五感侦探（5-6 段·感官常识）【r11 难度改造 v2 已重构为四族题型——本节及 §0.76 的两族/候选数/章型描述以 §6 为准（钩子字段与语音键 §6 有增补）】

**玩法**：物品/感官大图+图卡点选（图卡 SVG 零文字）。
- 教学：watch=幽灵手指看闹钟响图→点耳朵卡（播「闹钟响响」+「用什么呢」→点中）「用什么呢」→帮/独；`__seDemoR`
- 钩子：`SE = { get currentLevel, get quiz(){ kind('findsense'|'findthing'), ask(物品或感官 id), opts[](图卡 {anim}), answer, step, miss }, tapOpt(i), start(flat), autoSolve() }`——tapOpt 返回：对 'right'/末题 'done'/错 'wrong'/越界 null
- 语音：sen_tut_watch'看！用什么呢'/sen_tut_turn'你来点一点'/sen_hint'再想一想'/sen_right'点对啦，真棒'/sen_wrong'再想一想'/sen_q1'用什么呢'/sen_q2'什么用它呀'（**前缀=sen_ 已核 manifest 无占用**；名音 sen_n_<id>×15=晓晓读中文名（眼睛/耳朵/鼻子/小手/嘴巴/彩虹/星星闪闪/闹钟响响/小鸟唱歌/花儿香香/饼干香香/毛绒软软/冰块凉凉/柠檬酸酸/糖果甜甜）；确认句=right+名音拼播，名音在 keyless 段前）

## §2 robotdance 兔子机器人学跳舞（6-7 段·序列记忆）

**玩法**：看舞→按序点选重建；序列槽+动作块候选区（含干扰块）。
- 教学：watch=机器人跳 2 动作舞（跳一跳、拍拍手）逐动作播→幽灵手指按序点两块填槽→「跳对啦」；turn=你来拼（3 步舞）帮/独；`__rdDemoR`
- 钩子：`RD = { get currentLevel, get quiz(){ steps[](动作 id 序列真值), blocks[](候选块 {anim} 含干扰), filled[](已填槽动作 id 或 null), step(当前应填下标), miss, phase('watch'|'build'|'dance') }, tapBlock(i), start(flat), autoSolve(), replay() }`——tapBlock 返回：对（该块=当前步动作）'fill'/末槽填完 'done'/错 'wrong'/越界 null；replay=重播演示（build 相位可用）
- 语音：rbd_tut_watch'看！机器人跳舞啦'/rbd_tut_turn'你来拼一拼'/rbd_hint'再想一想，下一步'/rbd_right'跳对啦，真棒'/rbd_wrong'再想一想'/rbd_q'按顺序点一点'/rbd_replay'再看一遍舞'（**前缀=rbd_ 已核无占用**；名音 rbd_n_<id>×5=晓晓读（跳一跳/转一圈/拍拍手/跺跺脚/挥挥手）；演示链=动作名音逐段+150ms 间隙；确认链=完整舞名音逐段+right 在尾——**right clip 段在名音段后=链尾非 keyless，keyless 恒尾不适用此链（无 keyless 段）**）
- **契约 M 帧内容断言**：verify 逐槽断言 filled==真值前缀；点错断言槽不变

## §3 evidence 找证据（7-8 段·证据意识）

**玩法**：结论卡+证据图卡点选（findexact 单真值/findall 双真值）。
- 教学：watch=幽灵手指看「刚下过雨」结论→点水洼卡「哪张能证明它呀」→点中；turn=你来当侦探帮/独；`__evDemoR`
- 钩子：`EV = { get currentLevel, get quiz(){ kind('findexact'|'findall'), concl(结论 id), opts[](证据卡 {img,label}), answer(单真值下标) 或 answers(双真值下标集), found(findall 已点对集合), step, miss }, tapOpt(i), start(flat), autoSolve() }`——tapOpt 返回：findexact 对 'right'/末题 'done'/错 'wrong'；findall 第 1 真值 'lit'/第 2 真值 'done'/错 'wrong'/越界 null
- 语音：evi_tut_watch'看！找一找证据'/evi_tut_turn'你来当侦探'/evi_hint'再看看想一想'/evi_right'找对啦，真聪明'/evi_wrong'再看看这张图'/evi_q1'哪张能证明它呀'/evi_q2'找出能证明它的两张图'（**前缀=evi_ 已核无占用**；结论句 evi_c_<id>×8=晓晓读（刚下过雨/下过雪/今天有人过生日/妈妈刚做过饭/小狗来过/刮过大风/刚画过画/昨晚很晚还有人醒着）；findall 确认链=right 单段+两卡 lit 动画；证据标签不读名音（7-8 识字+卡面小字）——**证据标签若入 TTS 拼句须封闭表全覆盖（契约 L）**）

## §4 交付与验收（承 batch15-31 流水线）

语音预合成（gen_clips.py 扩 batch32 块：sen_ 22 条（通用 7+名音×15）/rbd_ 12 条（通用 7+名音×5）/evi_ 15 条（通用 7+结论句×8）=**49 条**；前缀 sen_/rbd_/evi_ 已核 manifest 无占用）→ 3 agent 并行（任务书必带：契约 A-O 逐条+I 补+§0.76-78 数学先验逐条+钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>（b29 坑⑥）/契约 M 帧内容断言（robotdance）/findall 双真值数学先验+同真值防双断言（senses findthing 同感官对/evidence findexact 同结论真证据）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact/verify 页先等 title=VERIFY PASS 再驱动）→ 首单元门禁（gate_common32.py：SE/RD/EV 钩子映射，clips 数按 22/12/15+core 3 断言）→ 探针定钩子语义 → 独立复验（verify_batch32.py 单文件三款 T1-T11+T9b；数学先验 python 侧独立复算）→ 全量回归（verify_final32.py R1-R8；R6 主入口 93→96）→ 两级入口（batch32/index.html 三卡+主入口每段插 1 卡+href 可达）→ 反方审查（视觉/UE/UI+儿童发展心理学双视角专项：界面/趣味/可玩性/防沉迷四维）+试玩（senses=5.5 岁口径/robotdance=6 岁半/evidence=7 岁半，剧本必含家长面板设多玩数）→ 修复闭环 → 收官（96/120）

**实长表（浏览器 Audio 实测，2026-09-11；等待窗=实长+300 余量；全表 49 条零缺漏 bad=[]）**：
- **sen_**：tut_watch 2592/tut_turn 1824/hint 1656/**right 2256（判对后窗 ≥2556）**/wrong 1656/q1 1560/q2 1824；名音 sen_n_* **max 1872**（15 条——确认句=right+150+名音+300 ≥4578）
- **rbd_**：tut_watch 3072/tut_turn 1824/hint 2544/**right 2280**/wrong 1656/q 2088/replay 1896；名音 rbd_n_* **max 1584**（5 条——演示链=逐段名音+150 间隙，单段 ≤1734，3-5 步演示相位 ≤8670+300；确认链=完整舞逐名音+right 尾段：5 步最长 5×(1584+150)+2280+300=11050；**rbd 错链=wrong 1656+150+hint 2544+300=4650**）
- **evi_**：tut_watch 2928/tut_turn 1920/hint 2016/**right 2472（判对后窗 ≥2772）**/wrong 2112/q1 2232/q2 3120；结论句 evi_c_* **max 2832**（8 条——题面链=结论句+150+q1 2232+300 ≥5514；**evi 错链=wrong 2112+150+TTS「能证明吗」estMs(4)=1980+300=4542**）
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）：sen 错链语义句「再想一想，用什么呢」9 字=3705/「再想想什么用它」7 字=3015
- **findall 确认链定版（回填修正）**：=right clip 单段（两张真证据卡 lit 动画承载确认；**证据标签不读名音**——7-8 识字+卡面小字，§0.78「第 2 真证据名音」表述作废）

**语音清单硬指标**：manifest 49 条合成 ok=49 fail=0（实测 ✅ 36.1s）；gate G3 注入数 22/12/15。

## §5 反方审查+试玩修复记录（收官回填 2026-09-11）

**审查**（REPORT-REVIEW-b32.md，静态层最大深度三源对账）：senses PASS（0/0/0）/evidence PASS（0/0/1）/robotdance NEEDS-FIX（F-1 干扰数违 v1 定版+M-1 页内 verify 同源镜像+m-1 幻影注释）。
- **F-1 主线复裁反转**：采纳实现 min(池5-步数, DCH_CAP{ch1:0,ch2:1,ch3:2,ch4:2}) 为**定版 v2**（§0.77 已改写）——v1「恒=池-步数」是对原文「干扰⊆未用动作」**子集关系**的过度修正（ch1=0 干扰是原文明示教学章起步设计非违约；原文唯一硬伤=ch3「干扰1-2」无解，cap 截断后恰为唯一解）。第三起 SPEC 数学先验相容性案（b29 坑③→b32 v1→b32 v2）；教训=契约 owner 修 SPEC 须全章枚举验算+先辨子集/恒等关系词。M-1 随 v2 消解（SPEC_CAP 表值与 v2 真值一致）；m-1 幻影注释三处已改 v2 引用+rebuild。
- m-2（evidence curtain/scarfman 弱相关两可）：两可即保留 weak，收案。

**试玩**（REPORT-PLAYER-b32.md，5.5/6.5/7.5 岁三款全通关）：教学链自明（watch→help→solo）/真实点选各 2 关（含故意错点）/autoSolve 各 7 关全 3★/家长面板走真实 UI（👪+两位数加法门+多玩 2 关→日限 6→8→flat6 实测可通）/防沉迷 dayEnd 收口+重开即收口/EV findall 双真值双点通过（首真 lit 不推进+次真推进）/**pageerror 三款全 0**。
- 15 条儿童意见（每款 5 条，均实测现象推导）：RD P2（题间 13.5s 干等三款之最+replay 7.6s）/SEN·EVI P3。
- **修复裁决：本批零代码修复**——演出窗/星级 miss 口径/错链窗均为家族契约定版（非 bug）；RD 干等与确认舞=仪式感设计权衡、EV 同结论连题=seeded 确定性自然结果，改动均触发全链时序重验（4650/11050/7900 窗重算），性价比不成立。全部入家族 backlog。
- 脚本侧坑 3 条（非游戏缺陷）：①教学幽灵手 breathe 挡真实点击 stability 检查（force 点击规避）；②引擎 step 即时推进 vs UI 演出窗换题（验收驱动须对齐演出窗）；③SEN 错后 1000ms 演出窗对选也锁（locked 门在前）vs RD 错后立即可点——两风格并存，跨款验收勿用同一假设。

**复验**：三款 12/12×3（robotdance 修正链=verify 侧 4 起：T1 超时 75s/干扰断言 v2 min 公式/T6-T8 wait_build+wrong_once_js restart 参数/T6 r1 格式参数数——均非实现 bug；f5q0 wrong 系旧断言提前退出状态残留假象，v2 断言下不复现）。

## §6 senses r11 难度改造 v2（2026-09-14；审计红旗 #32：物品→感官 1:1 匹配=3-4 岁知识、实测 35-39s/关、与 babylove 同构）

**三固定 delta（AUDIT-56.md L82，缺一=改造不成立）**：① **multi 多感官合成**——多感官物（如爆米花=看+听+闻）5 感官卡**全选恰 3**（漏选/多选都错，勾选+提交制）；② **anti 通感抑制排除**——「哪个不是用 S 的呀」反向排除（抑制式判断）；③ **comp 感官失能代偿推理**——「捂住了 S，还能用什么呀」（失能代偿）。改造后每关认知建模 ≥40s（5-6 岁口径，认知步主体非演出窗）。

**多感官物封闭 5（每物恰 3 感官，r11 新表；不入 find 族单感官池）**：popcorn 爆米花=eye+ear+nose / watermelon 西瓜=eye+ear+mouth / kitten 小猫咪=eye+ear+hand / soup 热汤=eye+nose+mouth / drum 小鼓=eye+ear+hand。感官覆盖 eye×5/ear×4/nose×2/mouth×2/hand×2——每感官「2 单感官物+含 S 多感官物」恒 ≥3（anti 相关三选下界）。多感官物 SVG 5 幅带齐 3 感官线索（声波弧/香气波浪/触摸手等，禁「只能看」）。

**题型四族（章型位序 CH_FAMILY 定版，每章 5 题族序固定，q0 恒单选题型——教学锚/驱动器兼容）**：
- **find=findsense/findthing**（承 v1 两族，候选恒 4（ch1 也升 4）；findthing 防双真值：同感官对至多 1 物在场）；
- **multi**（dch1 q1/q3/q4 起步）：候选=感官 5 全集（互异 5 卡），answers=该物感官集下标**恰 3**，answer=-1（判定步在 tapSubmit）；勾选 .held+绿勾徽章零惩罚，空选不判（false 不计 miss），漏选/多选=wrong **清空重选**+miss；
- **anti**（dch2 主场）：ask=感官 S；4 物品卡=「相关恰 3」=S 的 2 单感官物+1 含 S 多感官物，「不相关恰 1」=answer（防双真值：判相关须掌握多感官物感官集——抑制式靶心）；题面=打叉（否决圈红圈+斜杠）感官小人；
- **comp**（dch3 引入 q2/dch4 q0+q3）：ask=多感官物 m，blocked=其感官之一（seeded 洗牌取[0]，truth=[1]）；4 感官卡=真值 A+**被捂 S（诱惑恒在场恰 1）**+感官集外恰 2（5-3=2 恒填满）；**另一剩余感官 B 禁在场（防双真值——恰 1 可用真值）**；题面=物品大图+捂住徽章（感官小人小图+否决圈）。

**章型 CH_FAMILY**：dch1 [find,multi,find,multi,multi]（find 复习+multi 入门）/ dch2 [anti,multi,anti,find,anti] / dch3 [anti,multi,comp,multi,anti] / dch4 [comp,multi,anti,comp,find]（四族混出）。章名 1 五感侦探出发/2 找不一样的小侦探/3 捂住眼睛想一想/4 五感大挑战；章末预告 hint 承家族 F（hint[i]↔预告 i+1 章内容：1'接下来，要找一个不一样的哦'/2'捂住一个感官，还能用什么呀'/3'什么都混在一起，大挑战'/4'新一轮五感大挑战'）；生成关 GEN_HINTS=['选感官，还要找全哦','找一个不一样的哦','捂住一个，想一想哦','五感大集合，来挑战']。种子承 sen=421；flat0 q0 锚定 findsense/bell 不变；相邻题（族:题键）互异。

**r11 认知建模（时长门禁常量，verify+verify_one 双侧独立断言）**：MODELED_MS={find 4500, anti 7500, multi 15000, comp 9000}，MODELED_FLOOR=40000——章和 dch1 54000/dch2 42000/dch3 54000/dch4 45000，40 关逐关 Σ≥40000（Python 独立表复算）。

**钩子增补（SE）**：quiz 增 multi 字段 `answers[]`（真值下标升序 3）/`picked[]`（已勾下标）、comp 字段 `blocked`（被捂感官 id）；增 `tapSubmit()`（multi 判定步：'right'/'done'/'wrong'/false 非 multi 或被拦）；tapOpt 增返回 'pick'/'unpick'（multi 勾选，零惩罚）；autoSolve 的 taps=判定步口径（单选 1 步/题、multi=提交 1 步——每关恒 5）。

**语音（sen_ 33 条=通用 7+r11 新 6+名音 20（感官 5+物品 10+多感官物 5）；既有 22 键一字不改；clips 注入 36 条含 core 3）**：新句 6 键——sen_q3'都用什么呢，找全哦'（2664）/sen_q_not'哪个不是用'（1776）/sen_q_not2'的呀'（1248）/sen_q_cov1'捂住了'（1512）/sen_q_cov2'还能用什么呀'（1992）/sen_mw'没有找全哦'（1824，multi 错链头）；名音新 5=sen_n_popcorn/watermelon/kitten/soup/drum（max 1560=kitten）。错链尾语义句（keyless 恒尾）：multi'再想一想，都用了哪里呀'（11 字 4395）/anti'再想一想，哪个不是用<S>的呀'（14 字 5430，感官名恒 2 字）/comp'再想一想，捂住了还能用什么'（13 字 5085）。

**窗计算（r11 定版，全链实长实测口径）**：单选判对窗 1600+3000=4600 ≥ right2256+150+名音max1872+300=4578；**multi 判对窗 1600+5800=7400** ≥ right+3×(150+感官名音max1440)+300=7326；**错链豁免窗 9500**（四族共用单常量）≥ 最长 anti 链 1656+150+1440+150+estMs(14)5430+300=9126（multi 8379/comp 8781/findsense 7833/findthing 6711）；**契约 I 补 r11 口径：multi 勾选是中性动作不吞（豁免窗守卫移挂 uiSubmit——窗内提交吞 pop+bump），单选题守卫仍挂 uiTapOpt**。开题链全 clip 无 keyless：multi=名音+q3 / anti=qNot+感官名+qNot2 / comp=名音+qCov1+被捂名+qCov2（max 6954）。

**验收增补（六门禁全绿 2026-09-14）**：① build.py 重建（36 clips 断言+四族窗静态断言+estMs 定版字面四处同步）；② senses/_src/_selftest.py 新建（verify 复跑+真实页冒烟+flat0-19 autoSolve 全 5 判定步）；③ ?verify=1 双 viewport VERIFY PASS 59/59 ×2（零 pageerror）；④ batch32/verify_one_senses.py 新建 10/10（W1 章约束/W1b 覆盖/W1c 认知建模 Python 独立复算/W2-W8）；⑤ verify_batch32.py senses 段重写（q_senses 四族+multi tapSubmit 驱动+章型位序断言+WRONG_WAIT 9500+T11 下界 9126+T10 剥注释匹配）12/12；verify_final32.py R4 senses 键清单 18 键+R8 ch3_ok={anti,multi,comp}；⑥ 新 clip mp3 11 条全 ≥7488B+manifest senses 25→36（增量=新键数 11）。verify_voice.py 补 senses 登记（此前未登记=空转缺口，dressup r10 同款补法；robotdance/evidence 登记缺口仍在——非本改造范围）。§0.76/§1 的 v1 两族描述以本节为准。

**⑥b 全量回归收官（2026-09-15）**：`python verify_final32.py robotdance` → **7/7 PASS**（R1 senses 12/12+R2 evidence 12/12+R4-R8 全绿；R8 senses 真实路径 dch=[2,2,2,2,3]+f10 四族+写档 2-1..3-0 全对）。**robotdance 为唯一跳过款（环境阻塞，非 senses 改造引入）**：渲染进程原生偶崩（崩点漂移：外驱 f3q1/页内 selftest +55s；JS 堆 10MB 恒定+RSS 105-122MB 稳定+无 2004/1000 事件=非资源耗尽；--disable-gpu 无效；同时刻 evidence 12/12 全绿=页面专属而非机器级；其文件自 09-11 16:40 未动且重建后 18:23 试玩曾全绿）——疑 4 天未重启桌面会话下 GPU 驱动/渲染态劣化触发动画最重款偶崩；建议重启窗口后单跑 `python verify_batch32.py robotdance` 复核。verify_final32.py 两处加固（断言语义零改动）：R1-R3 subprocess 20min 硬超时（修 renderer 死→evaluate 永挂→脚本永挂缺陷）+argv 跳过款参数（跳过须登记）；R6 主入口定值 96→下界 ≥96（r11 并行批合法扩容至 120 卡，b32 三卡=3 不变）。

## §-r17-evidence 难度改造 v2（2026-09-17；AUDIT-78 黄款：8 结论封闭池 4 选 1 扫视即答、实测关约 20s）

本节为 evidence 的现行真值源；与 §0.78/§3/§4 冲突处以本节为准（v1 两族描述作废）。改造四 delta：结论池 8→20、证据推理三档（能证明/有关不能证明/无关——本款核心教育跳变）、findall 三真值多选+反问「哪张不能证明」、同关去重。

### 1. 结论封闭 20（每条：真证据恰 3（全局互异，真场景不得跨结论复用）+ 干扰恰 5（weak 2+none 3；干扰场景可跨结论复用，档位按（结论,场景）逐条判定——如冰箱门开着=cooked 的 none、drankmilk 的 weak；weak=有关但不能证明（常伴随但不足以证明），none=无关））

旧 8 条（真证据补足 3，干扰 3→5）：
①rainwet 刚下过雨：真=puddle 地上有水洼/umbrella2 路上好多人打伞/wetground 地面湿湿；weak=cloudy 天上有云/wetdog 小狗淋湿；none=flowerbed 花坛开着花/toycar 玩具车放地上/tvon 电视放着动画片
②snowplay 下过雪：真=snowman 雪人立在门口/icicle 屋檐挂冰柱/snowground 地上盖着厚雪；weak=coldboy 小朋友穿外套/mittens 手套搭在暖气边；none=toycar/birdfly 天上有小鸟飞/calendar 墙上挂着日历
③birthday 今天有人过生日：真=cake 桌上有大蛋糕/gift 手里拿礼物盒/candles 插蜡烛的蛋糕；weak=balloon 房间里有气球/snackplate 果盘摆着水果；none=tvon/storybook 桌上摆着书/plant 窗台摆着绿植
④cooked 妈妈刚做过饭：真=steam 锅还在冒热气/smell 香味飘满厨房/dishes 碗还没洗；weak=apron 围裙挂在钩上/basket 菜篮装满蔬菜；none=fridge 冰箱门开着/calendar/flowerpot 花盆摆着
⑤doghere 小狗来过：真=paw 地上有狗爪印/doghair 沙发上有狗毛/bonebone 地上有啃过的骨头；weak=leash 门口挂着牵狗绳/dogbowl 地上摆着狗粮碗；none=ball 地上有球/catsleep 小猫在睡觉/bench 公园长椅空着
⑥windbig 刮过大风：真=treebend 小树吹弯了/leaves 落叶铺了一地/hatfly 帽子被吹跑挂在树上；weak=cloudy2 天上有乌云/scarfman 有人围着围巾；none=flowerpot/trafficlight 路口的红绿灯/stone 草地上有大石头
⑦paintday 刚画过画：真=painthand 手上有颜料/paintjar 颜料罐开着没盖/paper 桌上摆着画好的画；weak=brush 洗干净的笔挂起来/watercup 桌上放着水杯；none=storybook/plant/catsleep
⑧nightowl 昨晚很晚还有人醒着：真=lamp 深夜台灯亮着/cup 桌上有喝了一半的热牛奶/nightnoodles 深夜泡面还冒着热气；weak=clock 钟指向很晚/curtain 窗帘拉着；none=plant/snail 叶子上停着蜗牛/bench

新 12 条：
⑨washhands 刚洗过手：真=wettowel 毛巾湿湿还在滴水/sinkdrops 洗手池边一滩水/soapbub 洗手台上还留着肥皂泡；weak=sleeves 袖子卷得高高的/towelneat 毛巾挂得整整齐齐；none=tvon/flowerbed/trafficlight
⑩ateorange 刚吃过橘子：真=peelings 桌上堆着橘子皮/halforange 盘子里有剥了一半的橘子/trashpeel 垃圾桶里露出橘子皮；weak=orangeplate 桌上摆着一盘橘子/napkins 纸巾抽出来好几张；none=ball/bench/calendar
⑪haircut 刚剪过头发：真=hairfloor 地上落了一层碎头发/haircollar 肩上还粘着小碎发/broomhair 扫帚边扫拢一堆碎发；weak=scissors 剪刀摆在小台上/barberchair 理发转椅摆在镜子前；none=tvon/plant/stone
⑫waterplant 刚浇过花：真=drops 叶片上挂着小水珠/traywater 花盆托盘渗出了水/soilwet 盆土颜色深深发亮；weak=wateringcan 喷壶立在花盆边/blooming 花开得正艳；none=toycar/storybook/trafficlight
⑬mopped 刚拖过地：真=wetshine 地面亮亮的反着光/mopdrip 拖把头湿湿靠在墙边/watertrail 地上一道没干的水痕；weak=dooropen 房门敞开通着风/slippers 拖鞋整整齐齐摆成排；none=birdfly/flowerpot/snail
⑭brushed 刚刷过牙：真=brushwet 牙刷毛湿湿的/pasteopen 牙膏帽还没盖上/cupdrain 漱口杯倒扣着控水；weak=toothlay 牙刷牙膏插在杯子里/mirrorspots 镜子上溅了小水点；none=ball/calendar/bench
⑮fedfish 刚喂过鱼：真=feedcan 鱼食罐开着没盖/feedfloat 水面漂着几粒鱼食/feedspill 鱼缸边撒了几粒鱼食；weak=fishup 小鱼都游到水面上/tanklight 鱼缸的小灯亮着；none=flowerbed/storybook/stone
⑯playedblocks 刚搭过积木：真=blocksout 积木摊了一地/towerhalf 桌上立着搭一半的积木塔/sortbox 积木箱的盖子开着；weak=blockbox 积木箱摆在墙边/playmat 游戏垫铺在地上；none=tvon/snail/trafficlight
⑰drankmilk 刚喝过牛奶：真=milkring 杯壁挂着一圈奶渍/milkdrop 桌上滴了两滴牛奶/milkhalf 插着吸管喝了一半的牛奶盒；weak=fridge 冰箱门开着/milkcup 桌上摆着小杯子；none=birdfly/catsleep/plant
⑱wrotehomework 刚写过作业：真=notebookopen 作业本摊开没合上/eraserdust 桌角堆着橡皮屑/pencilrest 铅笔搁在作业本上；weak=bagopen 书包拉链敞开着/pencilcase 文具盒开着盖；none=bench/stone/snail
⑲fixedbike 刚修过自行车：真=greasehand 指缝里黑黑的油泥/toolslay 螺丝扳手摊在垫布上/chainoff 链条拆下搭在车架上；weak=toolbox 工具箱开着盖/pump 打气筒立在旁边；none=birdfly/flowerbed/calendar
⑳playedsandbox 刚玩过沙子：真=sandcastle 沙坑里立着新堆的沙堡/bucket 沙坑里插着小桶和铲子/sandshoes 鞋边上撒着沙粒；weak=toybox 沙滩玩具箱开着盖/dustypants 裤脚上蹭了土；none=tvon/trafficlight/plant

### 2. 题型三族与判分契约
- findexact（ch1/ch2 单选）：候选 4=恰 1 真+3 干扰（防双真值：同结论其他真证据不得入候选）。ch1 二分：干扰=该结论 none 全 3（只考「能证明/无关」二分，weak 不在场）；ch2 三档：干扰 3=seeded 取自 dstr 5 且 weak≥1 与 none≥1（核心教育跳变章：区分「有关但不能证明」）。tap 真=right/末题 done；tap 干扰=wrong（miss+1 可重点）。
- findall（ch3 三真值多选）：候选 4=真值 3 全在场+干扰 1（seeded 取自 dstr 5，weak/none 皆可）。answers=3 真值下标升序；tapOpt=pick/unpick（勾选零惩罚，勾选不是判定步）；tapSubmit 判定：picked 集合==answers 集合→right/末题 done；**漏选/多选=wrong（miss+1）且已选对位保留（picked=picked∩answers，错选位清除），可续选补齐再提交，全选齐=right**（契约 F17 判分定版）；空选不判（false 不计 miss）。
- reverse（ch4 反问逆向）：候选 4=真值 3+非真 1（seeded 取自 dstr 5，weak/none 皆「不能证明」）；answer=非真卡下标；tap 非真=right；tap 真=wrong（普通 miss 流——抑制式判断：靶心从「找证据」翻转为「找非证据」）。
- 屏显问句：findexact=哪张能证明它呀？（evi_q1）/ findall=找出能证明它的三张图（evi_q2 文本迁移重合成）/ reverse=哪张不能证明它呀？（evi_q3 新键）。

### 3. 章型/生成关/同关去重/键基迁移
- CH_LEN 5→8（每关 8 题=每章 8 关），STATIC_LEVELS 20→32；dch1=[findexact×8 二分]/dch2=[findexact×8 三档]/dch3=[findall×8]/dch4=三族 seeded 混出且各≥1（在场保证：缺族换入重复槽）；生成关 flat≥32 每关 dch=seeded ri(1,4)（SPEC 显式：seeded 随机，同 flat 恒同值；种子仍 mulberry32(flat*7919+1031)）。flat0 题0 锚=rainwet findexact puddle（教学锚不变）。
- 同关去重：每关 8 题结论互异（20 池洗牌取 8）+卡集合签名（结论 id+opts 的 img 升序串）关内互异（verify 逐关断言）。干扰场景跨结论复用属设计意图（同场景在不同结论下档位不同——三档判断按结论语境），不构成关内重复。
- 键基迁移 IIFE（CH_LEN 5→8，r16 范式）：矛盾态 lv['C-0'] 在而 lv['(C-1)-5'] 缺（C=2..4）=v1 基档一次性整档重置；脏键守卫仅判格式非法与关号越界（关号<0 或>7）；章号上界放开（生成关章号≥5 合法，禁 >N 硬界）；执行点先于 KIDS.init 读档。

### 4. 时长模型（r17 认知建模，estMs 四方同步：data 定义/verify 独立定义/build est_ms+字面断言/_selftest est_ms+运行时对账）
- estMs=s.length*345+600（b25 定版全字符口径，四处字面一致）。
- 每题 dur=max(voiceWin, DECIDE_MS[kind])+CONFIRM_MS；voiceWin(q)=DUR_CONCL[q.concl]+150+DUR_Q[kind]+300（queue 段间 150/落定 300）；CONFIRM_MS=2900（判对演出窗 1600+1300 实码，确认链 evi_right 2472+300=2772 罩满）；OPEN_MS=900（开题渲染落定）。
- DECIDE_MS（7-8 岁单题认知推算）：findexact 8000（读结论+4 卡逐卡证明性判别约 1.5s/卡+确认——ch2 三档须额外区分 weak 语义）/ findall 11500（4 卡逐一判别+集合管理「还差哪张」+勾选提交，三真值全找全，漏选重选计入）/ reverse 9000（抑制反转：找「不能证明」靶心翻转+逐卡检查约 2s/卡）。
- 语音窗恒≤DECIDE（max findexact 5514<8000 / findall 2832+150+q2+300<11500 / reverse 2832+150+q3+300<9000——verify 逐题断言，语音从不撑时长）。
- modeled(flat)=OPEN_MS+Σ每题 dur；**全 40 关 modeled 最低值=88100（ch1/ch2 全 findexact 关，flat0-15 同值：900+8*(8000+2900)），verify+_selftest 双钉精确断言 88100@flat0（禁约数）**；全关≥LEVEL_MIN_MS 40000。

### 5. 语音与窗（增补；§4 旧 evi_q2=3120 失效）
- evi_q2 文本迁移：「找出能证明它的两张图」→「找出能证明它的三张图」（既有键删 mp3 强制重合成，键数不变）；新键 evi_q3=哪张不能证明它呀；evi_c_ 新 12 条（⑨-⑳结论句）。evidence clips=evi 28+core 3=31 注入。
- 错链豁免窗 4542 不变（evi_wrong 2112+150+estMs(4)=1980+300，仅链起播时设，startLevel 重置）；契约 I r17 补：findall 勾选是中性动作不吞（豁免窗守卫挂 uiSubmit——窗内提交吞 pop+bump），findexact/reverse 守卫仍挂 uiTapOpt 错点吞/对选放行。
- 救援双锚独立不变：14s 方向级（题面链重播+结论卡 pulse，lastDir 独立节流）/30s 答案级（正确卡 breathe；findall=下一个未勾真值卡逐张步进，reverse=answer 单卡）。
- 开题链：findexact=[evi_c_id, evi_q1] / findall=[evi_c_id, evi_q2] / reverse=[evi_c_id, evi_q3]（全 clip 无 keyless，契约 N 天然合规）。
- 实测时长表（合成后回填 §-r17 表）：evi_q2/evi_q3/evi_c_ 新 12 条见 verify SPEC_DUR（±60ms 辨别器全表）。

### 6. 钩子与帧（契约 M/r17 增补）
- EV.quiz 增 picked[]（findall 已勾下标）；tapSubmit()（findall 判定步：'right'/'done'/'wrong'/false=非 findall·被拦·空选/null=非法）；tapOpt 返回值增 'pick'/'unpick'（findall 勾选零惩罚）；autoSolve taps=判定步口径（每题恒 1——findall 先勾满再提交，勾选不计步）。
- 新增暴露 get bank()（EV_BANK 深拷贝，含三档 type）/get conclPool()（20 结论 id）——verify 独立对账素材（verify 侧 SPEC_BANK 独立硬编码，禁复用页面对象推导断言）。
- UI：#btn-submit（findall 在场才显示；armed=picked>0/ready=picked==3 呼吸，照 senses r11）；帧内容断言承 v1（data-concl/data-img/g[data-img]/标签逐字/q-text 逐字）。
- 竖屏三件套：@media(orientation:portrait) 与 body.port 类逐行等值（/*PORT-CLS*/ 标记段，build 逐行全等断言）。

### 7. 验收门禁（r17）
① build.py 幂等 ② ?verify=1 双 viewport VERIFY PASS ③ _src/_selftest.py 新建（声音纪律三层 INIT_SND/STUB_SND/种档 sound:false；真实点击 flat0/末章关/生成关+首错零惩罚+教学链+救援钟+双 viewport+P1b 真竖屏+完全离线+0 pageerror）④ 共享面（verify_batch32/verify_final32/gate_common32）跑一遍记录（旧口径 FAIL 属预期禁改）⑤ 三关真实点击 ⑥ 语音键对账（新键 13=evi_q3+evi_c_×12+evi_q2 重合成；manifest 幂等 skip）⑦ 教学 watch→帮→独+救援+sayW 三态判别 ⑧ 本节。
