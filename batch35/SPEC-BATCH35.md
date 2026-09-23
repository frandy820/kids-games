# SPEC-BATCH35 · 扩容批 5（轮流浇花 / 凑十小铺 / 错题小医生）契约 v1（2026-09-12）

对象：120 款扩容第 5 批（每段各 1 款）。目录 `batch35/turntake|maketen|errdoc/`。
结构照 batch1-34：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch23/share/_src/（轮流结构+分享语义——turntake 参照）、batch33/position/_src/（点格+breathe+演出窗——turntake/maketen 参照）、batch31/chartread/_src/（数值判定+题面链+播音锁——maketen 参照）、batch34/hidecup/_src/（点选判定+错链豁免窗+verify origLS 模式——maketen/errdoc 参照）、batch20/memduel/_src/（封闭题库 QZ_BANK+静态表双录——errdoc 参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-84 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b34 定版，一项违反=审查 Major 起步）：A-O+I 补全承 SPEC-BATCH33.md §0 括注原文（A 启动 dayEnd nextHint(lim-1)/winFlow null；B 救援钟双锚；C 预置存档 v:'1.0'；D 吞输入轻叮配 bump；E 修复收窄先查教学特例；F 章末 hint=预告下一章+生成关 nextHint 实算 genLevel(f+1).dch-1；G 拼播链后窗=链总实长+300；H 判对窗=clip+300；TTS 窗=estMs(len*345+600)+300；I+I补 错链豁免窗 wrongChainUntil 真时钟+guard 条件式（错点吞/对选放行/窗后二错照计 miss）+startLevel 重置；J 错反馈语义句 flat≥3 只 10s 节流；K rescueTick 面板守卫；L TTS 数字映射表覆盖封闭集全量值；M 帧内容断言三层；N keyless TTS 段恒链尾；O 自建 button 显式 color）。b33 三条硬性全承（钩子表 step 语义显式/生成关 dch 策略显式声明/build.py core 注入幂等）。**〔§5 审查 M1 裁决（2026-09-12）：家族「教学 watch ≤16s」条款按单步演示款立；三步完整演示款（spot→fix→why 型，本批 errdoc）备案款型分支 ≤22s（名义分账 19726/三步=每步 6.6s 比单步款更紧凑）——后续三步演示款承此分支〕****b34 坑带入三条：①miss 计数在 core 判定层的款，防重入 guard 必须在判定前拦+预判口径与 core 判定严格同构；②verify 页写档测试必须 origLS 保存+测后恢复（防毁真实玩家档）；③SPEC 先验写前验算数学可满足性（第四起：c=2 域「至少一杯不同」不可满足——本批三款先验均已验算，见 §0.85-87 括注）**〕

85. **turntake 轮流浇花真值**（5-6 段，社交情感/反应·轮替规则；调研 #128 原标 6-7，**本批降坡 5-6 实态**（EXPANSION 排期表 5-6 段）——降坡三件：抢点不罚（社交学习低挫败，b34 datacollect 撤回不罚先例）/回合演出 2s 慢速/轮到指示恒在（ch1-2 加箭头）：**玩法=花圃轮流浇水**：花圃 3 盆花，每回合恰一盆口渴（花耷拉+水滴气泡），顶部双头像指示轮到谁（孩子头像亮=轮到你/兔子头像亮=轮到小兔子，ch1-2 另有大箭头指向该头像）；**孩子回合=点口渴的花→浇水动画+right+花开；点不口渴的花=wrong+miss「这盆不渴哦，找找耷拉的那盆」（方向级=口渴花 pulse 一轮）**；miss≥2=口渴花 breathe（答案级）；**兔子回合=兔子自动走位浇水（演出 2s，此期孩子点击任何花=抢点→'wait' 温和提醒「该小兔子浇啦，等等它」+不罚不计 miss（每兔子回合最多提醒 1 次，重复抢点只 bump 轻叮家族 D）**；**回合序列 turnSeq 数学先验（封闭域验算）**：每关孩子回合恒 5（=5 题），兔子回合 4-6；ch1-2=严格交替 [K,R]*4+[K] 起 K（K,R,K,R,K,R,K,R,K 共 9 项=5K+4R——§5 审查 m1 记法修正）；ch3-4=不规则（seeded 打乱，约束：首=K、连续同方≤2、末段不接 3 连 R——**「连续同方≤2」在 5K+6R=11 回合域可满足（验算：交替基架 K?RK?RK?RK?RK?R?，R 插空位每空≤1 额外→连 2 可达、连 3 禁）**）；花位分配：口渴花下标 seeded 互异（同花可再渴但相邻两回合不同花——「相邻回合不同花」在 3 花域可满足）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+419)，域全档成立型）**；ch 每关 5 题（孩子回合数）；星级=miss 口径（miss=孩子回合点不口渴花；抢点不计）；教学：watch=幽灵手指演示（看你浇一盆→等兔子浇一盆）→点中；turn=你来浇一浇（2 盆找口渴）帮/独

86. **maketen 凑十小铺真值**（6-7 段，数感·凑十；调研 #48）：**玩法=伙伴卡配对收银**：柜台中央一张「伙伴卡」数字 a，下方卡池 4-5 张数字卡，**题面顶部显示本凑目标 target（10/15/20 大字）**，孩子点一张 x：**a+x=target→收进店里（钱币叮当+柜台货架 +1）+right+TTS 全算式「X 加 Y 等于 Z」；≠target→wrong+方向级数感反馈（和>target=「多了一点，换张小一点的」/和<target=「少了一点，换张大一点的」）——两级文案按和值分派（mt_wrong_more/mt_wrong_less）**；miss≥2=正确卡 breathe（答案级）；**数学先验（封闭域验算）**：补数封闭——凑 10：a∈1-9 x=10-a（对集 (1,9)(2,8)(3,7)(4,6)(5,5)）；凑 15：a∈6-9 x=15-a∈6-9；凑 20：a∈11-18 x=20-a∈2-9；**卡池互异+含补数⇒唯一解（补数由 a 唯一确定，池互异禁双同值）——验证锚：answer=quiz.pool 中唯一满足 a+x=target 的下标**；章型：ch1 凑 10（a∈2-8 偶偏，池 4 张）；ch2 凑 10（a∈1-9 全域，池 5 张，干扰优先邻近数 a±1 的补数邻域）；ch3 凑 15（a∈6-9，池 4）；ch4 混合（每题 target∈{10,15,20} seeded，池 5，**孩子须先看题面 target 再凑——三目标切换=本款认知坡度主体**）；**干扰池构造先验：池=补数+干扰（干扰取补数±1/±2 邻近值优先，域 1-9（凑 15/20 时干扰同域扩展 2-18），互异，禁取 a 本身（自己配自己=0 概念混淆））〔§5 裁决补明（2026-09-12 复验实锚，第五起先验张力）：「禁取 a 本身」本意=**禁 a 作干扰位**；凑 10 自配对 a=5 时补数=a，「池含补数」⇒池必含 5——两约束在该点不相容。落地：a≠补数（2a≠target）时干扰禁取 a 原文有效；a=补数（仅凑 10 且 a=5，凑 15/20 奇/域排无自配）时池含补数（=a 值）**恰一张**合法（5+5=10 doubles 是凑十核心知识点保留）——verify 断言按此分款〕；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+523)）**；ch 每关 5 题；星级=miss 口径；确认链=right+TTS 算式（数字映射表 **1-20 全量 20 值契约 L**——NUMCN 表，2=两/1-20 常规）；教学：watch=幽灵手指看凑（3+7=10 收银）→点中；turn=你来凑一凑（2+□=10 池 3 张）帮/独

87. **errdoc 错题小医生真值**（7-8 段，元认知/逻辑·错例诊断；调研 #195）：**玩法=错题病历三步诊**：呈现一张「生病」的题卡（完整算式含错误部位，如「13-5=9」），孩子当小医生：**步1 找病灶=点三个部位之一（左数/运算符/右数·答案——四部位？定版三部位：题面数 a（左）、运算符 op（中）、答案 r（右）；b 不设独立部位**）——点中出错部位='spot'+部位高亮红圈+「找到啦」；点正常部位=wrong+miss（方向级：「再检查检查，哪个地方不对劲」）；**步2 开药=选正确答案（3 张药卡数字选 1，含正确值 fix+两个干扰（fix±1/±10 邻近））**——选对='fix'+痊愈动画（病历卡打勾✓+小兔子康复跳）+right 链；选错=wrong+miss（方向级）；**步3 归因（轻环节不计 miss）=痊愈后弹三选「当时为什么错呀」：没看清/算错啦/点太快——任何选择都接受+对应药方文案（tt：「下次看得再仔细一点」/「再算一遍检查一下」/「慢一点点，不着急」）——元认知自评无真值，非惩罚设计**；**错例题库封闭 20 题（4 章×5，SPEC §3 全表静态列出，生成端人工核定）+三错型**：errType='ans'（答案算错：算式对、答案错——病灶=答案部位）/='num'（数字抄错：如 13 抄成 31，答案恰按抄错数算对——病灶=左数部位，**构造要点：shown.a=抄错值且 shown.r=按抄错值算出的正确结果，孩子须发现「数不对」而非「答案错」**）/='op'（符号看错：+看成 -，答案按错符号算对——病灶=运算符部位）；**章型：ch1=ans 型（20 内加减）；ch2=ans 型（表内乘法）；ch3=num 型（20 内加减）；ch4=混合三型（seeded）**；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+631)）**；ch 每关 5 题；星级=miss 口径（步1+步2 各计）；教学：watch=幽灵手指看病（13-5=9→点答案 9→找到→选药 8→痊愈）→完整走；turn=你来看一看（7+6=12→点答案）帮/独

## §1 turntake 轮流浇花（5-6 段·社交情感）

**〔v2 改造定版 2026-09-13（难度批 r1）——本节以下为现行契约，上方 19-22 行 v1 描述已作废（保留备查）〕**

**v2 玩法（渴度比较+排序+兔子纠错）**：花圃 3 盆花各有渴度 thirst∈{1,2,3}（1=花头稍低土微干/2=花头低垂叶弯/3=花头垂地土裂纹+枯色——姿态+土色双通道）。ch1-2 判定=点「最渴的」（thirst 最大盆唯一）；ch3-4 判定=按最渴→最不渴顺序依次浇 3 步（一题=一个排序）；兔子回合实质化：兔子有时浇错（seeded ~1/3，实测 30%），浇错时孩子点正确盆帮它纠正（纠错回合=right 推进）；兔子演出窗 2s→1.2s。
- **章型**：ch1 档差大 {1,1,3} 型；ch2 细微档 {2,2,3} 型；ch3-4 三盆互异可排序（相邻回合 argmax 互异防背板）；ch4 生成关 seeded（dch_reseed 家族）
- v2 钩子：`TT = { get currentLevel, get quiz(){ turn('k'|'r'), thirsty[](3 盆渴度数组), target(当前应点盆下标——ch1-2=argmax/ch3-4=剩余未浇中最渴), step(全关题号), miss, turnIdx, rabbitWrong(bool 兔子本回合浇错) }, tapFlower(i), start(flat), autoSolve() }`——tapFlower 返回：i=target→'right'/关末回合 'done'（排序中间步与题末步均 'right'，保 autoSolve/星级/winFlow 家族兼容）；i≠target 且 turn='k'→'wrong'；turn='r'→'wait'；演出期 null。旧 thirsty 单下标字段已删（breaking）
- v2 语音 9 句：tt_tut_watch'看！给最渴的花浇水'(3384ms)/tt_tut_turn'你来浇一浇'(1776)/tt_hint'找找最渴的那盆'(2280)/tt_right'浇对啦，花开咯'(2472)/tt_wrong'这盆不渴哦'(1752)/tt_wait'该小兔子浇啦，等等它'(2976)/tt_order_hint'按最渴到最不渴的顺序浇'(2928)/tt_order_wrong'先浇更渴的那盆'(2328)/tt_rabbit_wrong'小兔子浇错啦，帮帮它'(3048)——实长 2026-09-13 重合成后 ffprobe 实测；错链豁免窗 5217=wrong 1752+150+estMs(7 字)=3015+300（estMs 保守口径 ≥两实链 4182/4230 成立）；排序中间步 1400ms 短确认无 clip 不入链
- v1 题面句「找找耷拉的那盆」与旧钩子已废；v1 描述（2026-09-12 原版）：3 盆 1 盆耷拉找耷拉盆、thirsty=单下标、兔子纯等待 2s

## §2 maketen 凑十小铺（6-7 段·数感）

**玩法**：看目标→伙伴卡配对→收银。
- 教学：watch=幽灵手指看凑（target=10，3+7 收银）→点中；turn=你来凑一凑帮/独；`__mtDemoR`
- 钩子：`MT = { get currentLevel, get quiz(){ target(10|15|20), a(伙伴卡数), pool[](卡池 {v} 恒全摆 4-5 张互异), answer(池中补数下标——verify 独立推导：唯一满足 a+v=target 的 i), step(**全关题号**), miss }, tapCard(i), start(flat), autoSolve() }`——tapCard 返回：i=answer→'right'/末题 'done'；错→'wrong'（两级方向文案由实现按 a+pool[i].v 与 target 大小分派——mt_wrong_more/mt_wrong_less，钩子不区分）；收银演出期 null
- 语音：mt_tut_watch'看！两张卡凑一凑'/mt_tut_turn'你来凑一凑'/mt_hint'想一想，还差几'/mt_right'凑对啦，收银咯'/mt_wrong_more'多了一点，换张小一点的'/mt_wrong_less'少了一点，换张大一点的'（**前缀=mt_ 已核无占用 ✓**）；钱币叮当=Web Audio 合成；**确认链=right+TTS 全算式「X加Y等于Z」（keyless 尾=契约 N；数字映射 NUMCN 1-20 全量 20 值契约 L——含 1-10 与 11-20，「+」读「加」「=」读「等于」）**；错链两级：more=[mt_wrong_more, mt_hint]/less=[mt_wrong_less, mt_hint]

## §3 errdoc 错题小医生（7-8 段·元认知）

**玩法**：找病灶→开药→归因，三步诊。
- 教学：watch=幽灵手指看病（完整三步：点答案病灶→选药→归因选一条）→走完；turn=你来看一看（步 1 起帮）帮/独；`__edDemoR`
- 钩子：`ED = { get currentLevel, get quiz(){ shown{a,op,b,r}（呈现的四元算式——含错误部位真值）, errType('ans'|'num'|'op'), fix(正确答案值), phase('spot'|'fix'|'why'), step(**全关题号**), miss }, tapPart(i)(步1：0=左数/1=运算符/2=答案), tapFix(i)(步2：药卡 i), tapWhy(i)(步3：归因 0/1/2 不计 miss), start(flat), autoSolve() }`——tapPart 返回：中病灶→'spot'（入步2）；正常部位→'wrong'；演出期 null。tapFix 返回：对→'fix'（入步3）；错→'wrong'。tapWhy 返回：恒 'why_done'（任何选择都过+药方文案，非惩罚）——末题步3 完→'done'
- 语音：ed_tut_watch'看！小医生看病啦'/ed_tut_turn'你来看一看'/ed_hint'再检查检查，哪里不对劲'/ed_right'治好啦，真棒'/ed_wrong'再想一想'/ed_spot'找到啦，就是这里'（**前缀=ed_ 已核无占用 ✓——doc_ 改 ed_ 因 D 开头 clip 前缀易与 datacollect dc_ 混读，实查 ed_ 亦无占用**）；药方三条=ed_rx_careful'下次看得再仔细一点'/ed_rx_calc'再算一遍检查一下'/ed_rx_slow'慢一点点，不着急'；**题库设计使 fix 恒 ≤20（乘法章取 fix≤20 域），NUMCN 表 0-20 共 21 值契约 L 全量**；题面恒静态 DOM 文字（不 TTS）；**确认链=[ed_right(clip), {key:null,text:'X加Y等于Z'（正确原式全读）}(TTS keyless 尾)]——契约 N，estMs 按全字符**；步1 中病灶链=[ed_spot(clip), {key:null,text:提示句}(TTS 尾——num 型'这里应该是十三'/op 型'这里应该是加'/ans 型短句'答案不对哦')？**定版：ans 型 spot 后无 TTS 提示（不泄 fix，孩子自己算）——spot 链=ans 型 [ed_spot] 单 clip/num·op 型 [ed_spot, TTS 提示句] 双段**

## §4 交付与验收（承 batch15-34 流水线）

语音预合成（gen_clips.py 扩 batch35 块：tt_ 6 条（tut_watch/tut_turn/hint/right/wrong/wait）/mt_ 6 条（tut_watch/tut_turn/hint/right/wrong_more/wrong_less）/ed_ 8 条（tut_watch/tut_turn/hint/right/wrong/spot/rx_careful/rx_calc/rx_slow=**9 条**）=**21 条**；前缀 tt_/mt_/ed_ 已核 manifest 无占用 ✓ 2026-09-12 实查）→ 3 agent 并行（任务书必带：契约 A-O+I 补逐条+b33 三条硬性+b34 三条带入+§0.85-87 数学先验逐条+钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>（b29 坑⑥）/契约 M 帧内容断言（turntake 口渴花 DOM 类断言+maketen 卡池收银后 gone 断言+errdoc 部位高亮/药卡选中断言）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact/verify 页先等 title=VERIFY PASS 再驱动/无头测试 --mute-audio+stub 发声/演出窗驱动须等可交互（turntake 兔子回合 tapFlower='wait' 非 null——回合驱动须等 turn='k'）/**turntake verify 驱动回合等待+抢点语义（'wait' 不罚=false 轻吞）**）→ 首单元门禁（gate_common35.py：TT/MT/ED 钩子映射——**turntake 教学末步=孩子回合点中 'right'；errdoc 教学末步=三步走完 'why_done' 或末步钩子定版**）→ 探针定钩子语义 → 独立复验（verify_batch35.py T1-T11+T9b）→ 全量回归（verify_final35.py R1-R8；R6 主入口 102→105）→ 两级入口 → 反方审查+分龄试玩（turntake=5.5 岁/maketen=6 岁半/errdoc=7 岁半）→ 修复闭环 → 收官（105/120）

**实长表（浏览器 Audio 实测 2026-09-12；等待窗=实长+300 余量；全表 21 条零缺漏 bad=[]）**：
- **tt_**：tut_watch 3000/tut_turn 1776/hint 2232/**right 2472（判对后窗 ≥2772）**/wrong 1752/wait 2976；确认链=right 单 clip **2772**；**tt 错链=wrong 1752+150+hint 2232+300=4434**；抢点链=tt_wait 单发不拼播（窗 2976+300=3276，不与错链互斥——抢点不罚不计 miss 不设错链豁免窗，仅演出 bump 轻吞）
- **mt_**：tut_watch 3264/tut_turn 1776/hint 2496/**right 2472**/wrong_more 3024/wrong_less 3072；确认链=right 2472+150+TTS 算式（max 8 字 estMs 3360）+300=**6282**；**mt 错链两条取 max：more=3024+150+2496+300=5970 / less=3072+150+2496+300=6018 → 错链豁免窗 ≥6018**（T11 取 max）
- **ed_**：tut_watch 3216/tut_turn 1680/hint 3168/**right 2232**/wrong 1656/spot 2496/rx_careful 2664/rx_calc 2400/rx_slow 2664；确认链=right 2232+150+TTS 全式（max 8 字「十五加四等于十九」estMs 3360）+300=**6042**（SPEC 首版误算 7 字 5697——审查 m2 修正；实窗 CONFIRM_WIN=6100 双罩）；spot 双段链（num 型提示 7 字）=2496+150+3015+300=**5961**；**ed 错链=wrong 1656+150+hint 3168+300=5274**（spot/fix 两步同链同窗）；rx 药方单发窗 2664+300=2964
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

**语音清单硬指标**：manifest 21 条合成 ok=21 fail=0；gate G3 注入数 6+6+9+core 3。

**errdoc 题库 20 题全表（生成端真值源，verify 双录对账；fix 章内互异已验算 ✓）**：
- ch1（ans 型·20 内加减，fix 集 8/13/7/18/9 互异 ✓）：①13-5=9→fix 8；②7+6=12→fix 13；③15-8=8→fix 7；④9+9=17→fix 18；⑤16-7=10→fix 9
- ch2（ans 型·表内乘法 fix≤20，fix 集 12/14/16/15/9 互异 ✓）：①3×4=14→fix 12；②2×7=12→fix 14；③4×4=18→fix 16；④5×3=16→fix 15；⑤3×3=8→fix 9
- ch3（num 型·数字抄错：shown=按抄错数算对的完整式，fix=按原题算；fix 集 8/19/7/18/4 互异 ✓）：①原 13-5=8→shown 31-5=26→fix 8；②原 15+4=19→shown 51+4=55→fix 19；③原 16-9=7→shown 61-9=52→fix 7；④原 12+6=18→shown 21+6=27→fix 18；⑤原 13-9=4→shown 31-9=22→fix 4
- ch4（混合三型·seeded 构造）：每题三型 seeded 取一+确定性公式构造（ans 型=20 内加减新式；num 型=十几抄反 ab→ba 答案按 ba 算；op 型=+/-互换答案按错符算）——同 flat 同题；op 型示例：原 9+6=15→shown 9-6=3（病灶=op，fix=15）
- **题库真值锚：ch1-3 静态 15 题全表（上文核定）；ch4 构造规则=确定性公式，verify 独立复算 fix**
- **步1 病灶提示机制（num/op 型认知断点补）**：步1 点中病灶后，病灶旁浮出正确值提示——num 型提示「这里应该是 13」（正确原数）/op 型提示「这里应该是 +」（正确符号）/ans 型无提示（本就该自己算）——步2 药卡=按正确原式算的 fix（孩子按提示复算），认知链闭合

**maketen NUMCN 映射表（契约 L 全量）**：1-20 共 20 值（1 一/2 两/3-10 常规/11-20 十一..二十）；errdoc NUMCN 0-20 共 21 值（含 0 零——op 型 9-6=3 无 0；含 0 备全）。

## §5 反方审查+试玩修复记录（2026-09-12 收官回填）

**反方审查（core-adversarial-reviewer 静态层）：fatal 0 / major 1 / minor 6，报告=REPORT-REVIEW-b35.md**
- **M1（major）errdoc 教学 watch 预算 22s vs 家族「watch ≤16s」**——裁决=②款型分支备案：16s 条款按单步演示款立，errdoc 为家族唯一三步完整演示款（spot→fix→why，名义分账 19726/三步=每步 6.6s 比单步款更紧凑），SPEC §0 括注备案「三步完整演示款 ≤22s」，后续同型款承此分支。
- m1（SPEC §0.85「[K,R]*5」记法笔误）→ 已修：记法改 `[K,R]*4+[K]`（实现三处本就锚定括注枚举正确）。
- m2（§4 ed 确认链 7 字 5697 误算）→ 已修：回填 8 字口径「十五加四等于十九」estMs 3360→确认链 6042（实现 CONFIRM_WIN=6100 本就按 8 字，双罩成立）。
- m3（'wait' 与演出期 null 优先级未声明）→ 已修：§1 注明「'wait' 判定先于演出期 null」（行为自洽，SPEC 补声明）。
- m4（errdoc main.js:424 注释分账笔误 19746）→ 已修：改 19726（build 断言本就正确，纯注释）。
- m5（turntake verify 缺 hint 双录+nextHint 数值断言——mt/ed 均有）→ 已修：⑨ 补 srcHint（CHAPTERS/GEN_HINTS 独立硬编码双录+nextHint 4/9/14/19 数值断言+24/29/34/39 GEN_HINTS 实算）。
- m6（turntake verify 缺竖屏 simView 双档——mt/ed 均有）→ 已修：① 补 simView（flat 0/10/15 × 1280×800/800×1180：花 ≥96×96+场景/轮到条在场+花钮 color 对底对比度 ≥3+无横向溢出；教学已过后 startLevel 不重播直查稳态）。
- 已核查通过 8 项清单+残余风险归运行时（见报告）。

**分龄试玩（独立 headless，报告=REPORT-PLAYER-b35.md）：三款六步全过，pageerror 0×3，阻断项无**
- TT 5.5 岁：抢点/miss 严格分离实证（'wait' miss=0+同回合再点 false）+ch3 不规则引擎复核 krkrkrrkrk+轮到指示 0 条 side≠turn+restTip 13 分钟自然触发。
- MT 6.5 岁：两级方向文案各真一次（more/less）+末题采样伪象经引擎层稳态复核推翻（非缺陷）+真通关 flat10 5/5 target=15 唯一解双复核。
- ED 7.5 岁：三步诊全链+ED.pills 三态+ans 型无提示泡不泄 fix+fix 与题库逐题一致+restTip 真实链路自然触发。
- 三条 P3 主线裁决全入 backlog 零代码修复：①TT dayEnd 预告半章超前=家族 A 固有形态（措辞候选）；②TT ch3 首次兔子连浇无一次性解释（文案候选）；③MT 两级方向反馈仅语音通道（视觉方向记号候选）。

**复验链（verify_batch35.py T1-T11+T9b）：12/12 ×3 全绿**（含三起 verify 侧修正——均为 verify 断言缺陷非实现缺陷：
①maketen T3「池含 a 本身」六 FAIL=第五起先验张力（a=5 自配对），修=分款断言（§0.86 裁决括注：2a≠target 禁/2a==target 恰一张）；
②errdoc T3 题库双态（数值型+'×' vs 字符串+'*'），修=_n() int 归一+OP_SETS 映射+ED.pills getter 暴露（SPEC 钩子表缺口补）；
③turntake T3「thirsty=0 越域」=Python `0 or -1` falsy 坑，修=isinstance 判定）

**全量回归（verify_final35.py）：R1-R8 8/8 PASS**（m4-m6 修复 rebuild 后全量重跑——产物已变未用 SKIP_R13；R8 三款 dch=[2,2,2,2,3]+ch3 题型+写档 2-1..3-0 全对；turntake CH3MAP 修正=静态形状 turns 非 quizzes，b30 坑②重演）

**收官：105/120**（主入口 105 卡+batch35 入口 3 卡+三款子页；2026-09-12）
