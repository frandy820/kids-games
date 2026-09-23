# SPEC-BATCH36 · 扩容批 6（安慰选择 / 快速比大小 / 井字棋小冠军）契约 v1（2026-09-12）

对象：120 款扩容第 6 批（每段各 1 款）。目录 `batch36/comfort|quickcmp|tictac/`。
结构照 batch1-35：`_src/{head.html,game-data.js,game-core.js,game-main.js,game-verify.js,build.py}`，产物单文件 `index.html`。
参照实现（开发前先读，禁整读 core.js——grep 行号+Read ≤120 行段）：batch23/share/_src/（社交情感情景款+演出反馈——comfort 参照）、batch33/soundcount/_src/（感知比较款+两选判定+非文字题面语音——quickcmp 强参照）、batch31/chartread/_src/（数值判定+播音锁——quickcmp 参照）、batch19 五子棋 gomoku4（对战款终局快照/字串分流先例——tictac 参照；其坑直接入任务书）、batch34/hidecup/_src/（点选判定+错链豁免窗——comfort 参照）。

## §0 共同门禁（§0.1-0.48 全承 batch21 原文，一项不满足=不收；49-84 适用项）

1-48 条照 SPEC-BATCH21.md §0 逐条适用（仅适用项）。**〔家族契约带入（b22-b35 定版，一项违反=审查 Major 起步）：A-O+I 补全承 SPEC-BATCH33.md §0 括注原文（A 启动 dayEnd nextHint(lim-1)/winFlow null；B 救援钟双锚；C 预置存档 v:'1.0'；D 吞输入轻叮配 bump；E 修复收窄先查教学特例；F 章末 hint=预告下一章+生成关 nextHint 实算 genLevel(f+1).dch-1；G 拼播链后窗=链总实长+300；H 判对窗=clip+300；TTS 窗=estMs(len*345+600)+300；I+I补 错链豁免窗 wrongChainUntil 真时钟+guard 条件式（错点吞/对选放行/窗后二错照计 miss）+startLevel 重置——**本批 tictac 显式豁免**（策略款无对错点击：非法格拒绝 bump 家族 D，miss 恒 0 无错链——SPEC 备案）；J 错反馈语义句 flat≥3 只 10s 节流；K rescueTick 面板守卫；L TTS 数字映射表覆盖封闭集全量值（**本批 quickcmp 圆点数不 TTS——L 天然满足**；tictac 棋盘格不 TTS）；M 帧内容断言三层；N keyless TTS 段恒链尾（**comfort 情景句=题面 say 非队列链，N 仅约束 queue 链——SPEC 明示防误伤**）；O 自建 button 显式 color）。b33 三条硬性全承（钩子表 step 语义显式/生成关 dch 策略显式声明/build.py core 注入幂等）。**b35 M1 裁决带入：三步完整演示款教学 watch ≤22s 款型分支（单步演示款仍 ≤16s）**。b34-b35 坑带入：miss 在 core 判定层的款 guard 须判定前拦+预判与 core 严格同构/verify 页写档 origLS 保护/SPEC 先验写前验算数学可满足性（第六起防：**约束互斥检测**——b35 a=5 自配对教训，两约束交域在特殊点是否塌缩须写前验）/钩子表列全 verify 需独立推导的派生池字段（b35 ED.pills 缺口）〕**

88. **comfort 安慰选择真值**（5-6 段，社交情感·共情行为；调研 #129 原标 6-7，**本批降坡 5-6 实态**（EXPANSION 排期 5-6 段+风险节降坡条款）：降坡三件=ch1-2 两选 1 好 1 坏（原「4 选 1 含微妙项」的 3 选仅在 ch3-4 且**仍保持好/坏类别可分——5-6 岁不做模糊道德陷阱**）+题面=情景演出+keyless TTS 情景句（零文字依赖，b31 anm 5-6 段先例）+反馈带情景演出（选对=朋友破涕为笑+花开/星星））：**玩法=情景卡选做法**：舞台上呈现小动物朋友伤心的情景（角色 SVG 演出+眼泪/耷拉姿态），keyless TTS 播情景句（封闭 20 句入 §1 题库表），下方 2-3 张做法卡（图+短词）：**选好卡=朋友破涕为笑动画+right+co_right；选坏卡=wrong+miss+「这样朋友会更难过哦」（SEL 铁律：温和不羞辱——坏反馈文案恒指向行为后果不自攻击）**；miss≥2 好卡 breathe（答案级）；**题库封闭 20 题（4 章×5，§1 全表静态列出）：ch1=安危基础（递/扶/帮 vs 笑/跑/抢）；ch2=共情进阶（陪/抱/宽慰 vs 催/嘲/忽略）；ch3=3 选 1 好 2 坏（两坏不同类别）；ch4=混合复习+新情景**；**语义先验（验算 ✓）**：每题恰一张好卡（唯一解锚=好卡下标 verify 独立推导）+坏卡与好卡行为类别可分（安危/共情 vs 嘲笑/忽略/妨碍——无外观相近陷阱）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+757)，域全档成立型）**；ch 每关 5 题；星级=miss 口径（选坏计）；教学：watch=幽灵手指演示（情景→点好卡→朋友笑）→点中；turn=你来试一试（帮/独）；seed 757

89. **quickcmp 快速比大小真值**（6-7 段，数感·感数近似比较；调研 #58）：**玩法=闪现圆点比多少**：屏幕左右两组圆点阵**闪现**（ch1-2 1200ms/ch3-4 900ms）后消失，问句 qc_ask+三按钮（左边多/一样多/右边多——ch1 两按钮禁一样多），点对侧=right+TTS 数字（左 N 个右 M 个，多的是 N——NUMCN 1-10 契约 L 全量）；点错=wrong+miss+方向级（多的一侧 pulse 一轮）；miss≥2=多的一侧 breathe（答案级；「一样多」题=两侧同时 breathe）；**数学先验（封闭域验算 ✓）**：ch1 n1,n2∈1-5 差 ≥1 禁相等（subitizing 域）；ch2 加等数题（n1==n2∈2-5 混 60/40）；ch3 n∈5-10 差 ≥2 且 min/max≤0.8（(6,8)(7,9)(8,10) 比例 .75/.778/.8 全达标 ✓——Weber 可辨）；ch4 全域混合+等数；**渲染先验（防面积混淆作弊）**：圆点**等大**（同半径）+随机散布不重叠（网格抖动定位）+左右区域对称——禁「数量多者总亮面积小」反向布局；**闪现后无限时压力**（反应款不抢快——闪现是感知窗非答题窗，超时零惩罚）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+887)）**；ch 每关 5 题；星级=miss 口径；确认链=right+TTS 复述句「左边六个右边八个」（keyless 尾契约 N；数字映射 NUMCN 1-10 全量 10 值——「2=两」口径承家族）；教学：watch=幽灵手指看比较（闪现→点多侧）→点中；turn=你来比一比（帮/独）；seed 887

90. **tictac 井字棋小冠军真值**（7-8 段，策略/逻辑·对抗推理；调研 #172；**EXPANSION 风险决策带入：AI 用会犯错→完美坡度，禁一步到位 minimax 完美 AI 挫败 7-8 岁**）：**玩法=3×3 井字棋 vs 兔子**：孩子恒执 X 先手（挫败兜底——先手最优至少平局），点空格落子→兔子 O 应手（演出 800ms）；三连=胜局（连线的三格高亮+胜利演出）；棋满无三连=平局；**兔子 AI 四档**：ch1=random（seeded 合法格随机——会犯错）；ch2=block-only（先堵孩子下一步成三连的格，否则 seeded 随机——会挡不会杀）；ch3=smart（优先自己一步杀→再堵孩子一步杀→否则 20% 漏率 seeded 走随机→中心/空角启发）；ch4=perfect（**minimax 全展开永不输**——孩子全程最优=平局可达，孩子走错=兔子赢；**教育口径：平局=和高手打平也是好结果，tk_draw 文案正向；负局=tk_lose 温和+永不 0★**）；**数学先验（验算 ✓）**：井字棋先手最优=至少平（minimax 真值）；ch4「永不输」verify 锚=独立 minimax 复算对账（python 移植回应函数，对 N≥20 个随机合法局面断言实现与复算同格——b34 独立复算范式）；**关制=每关 3 局**（胜=1 分/平=0.5/负=0；3★≥2.5、2★≥1.5、1★=完成——**完成即星永不 0★**）；**miss 恒 0（策略款 SPEC 备案：无对错点击——点已占格=拒绝 bump 家族 D 不响 wrong；契约 I 错链豁免不适用）**；**钩子 tapCell(i) 返回：空格='moved'（含兔子应手后返回）/已占=false（bump）/局终快照=window.__tt2Final {result:'win'|'draw'|'lose', line}(b19 坑②定版：**终局返回字串分流，不自动重开**——引擎关内自动起下一局，钩子返局终字串）；**生成关 dch 策略=seeded 随机 `ri(rnd,1,4)`（mulberry32(flat*7919+911)）**；每局兔子随机档 RNG 与 dch RNG 分流（局内决策不消耗 dch 种子——同 flat 同 dch 但局序随机独立）；教学：watch=幽灵手指演示一局半（连三获胜+平局口径）→走完；turn=你来下一局（帮/独）；seed 911

## §1 comfort 安慰选择（5-6 段·社交情感）

**玩法**：朋友伤心了，选让朋友开心的做法。
- 教学：watch=幽灵手指看演示（情景→点好卡→朋友破涕为笑）→点中；turn=你来试一试帮/独；`__coDemoR`
- 钩子：`CO = { get currentLevel, get quiz(){ scene(情景 id 0-19), say(情景句 keyless 文本——题面真值), cards[](做法卡 {good 布尔, label} 恒全摆 2-3 张), answer(好卡下标——verify 独立推导：cards 中唯一 good===true 的 i), step(全关题号——b33 坑①明示), miss }, tapCard(i), start(flat), autoSolve() }`——tapCard 返回：i=answer→'right'/末题 'done'；坏卡→'wrong'；演出期 null
- 题库 20 题全表（情景句=题面 keyless TTS 真值源，verify 双录对账；好卡 label 与坏卡 label 类别可分）：
  - ch1（安危基础·2 选）：①冰淇淋掉了「小熊的冰淇淋掉地上了，它好难过」→好[递自己的]坏[笑话它]；②摔跤「小兔摔了一跤，膝盖疼疼」→好[扶起来]坏[跑开玩]；③积木塌「小猫的积木塔塌掉了」→好[一起搭]坏[抢走积木]；④风筝挂树「小狗的风筝挂在树上了」→好[帮着够]坏[说它笨]；⑤水洒了「小羊的水杯打翻了」→好[拿纸巾]坏[踩水洼笑]
  - ch2（共情进阶·2 选）：⑥想妈妈「小猴想妈妈了，眼泪汪汪」→好[陪它等]坏[催别哭]；⑦怕打雷「小熊害怕打雷声」→好[抱抱它]坏[叫它胆小鬼]；⑧比赛输了「小兔跑步比赛输了」→好[说没关系]坏[嘲笑它]；⑨找玩具「小猫的小汽车不见了」→好[帮着找]坏[不管它]；⑩画坏了「小狗把画画坏了」→好[夸它努力]坏[撕掉画]
  - ch3（3 选 1 好 2 坏·两坏异类）：⑪复现①+坏[笑话它][跑开玩]；⑫复现⑥+坏[催别哭][叫它胆小鬼]；⑬新「小鸡的气球飞走了」好[再送一个]坏[说活该][自己玩去]；⑭复现⑧+坏[嘲笑它][不看它]；⑮新「小猪午睡被吵醒了」好[轻声说话]坏[大声吵][关灯吓它]
  - ch4（混合复习+新）：⑯新「小鹿的新鞋踩脏了」好[帮它擦]坏[踩一脚][笑话它]；⑰复现⑨+坏[不管它][藏起来偷笑]；⑱新「小松鼠的拼图少一块」好[一起找]坏[说算了][推乱拼图]；⑲复现⑦+坏[叫它胆小鬼][关灯吓它]；⑳新「小马摔破了膝盖哭」好[找老师帮]坏[说娇气][跑开玩]
- 语音：co_tut_watch'看！朋友伤心了'/co_tut_turn'你来试一试'/co_hint'想想怎样朋友会开心'/co_right'朋友开心啦，真好'/co_wrong'这样朋友会更难过哦'（**前缀=co_ 已核 manifest 无占用 ✓ 2026-09-12 实查**）；情景句=题面 keyless TTS（say 非队列链——N 不适用，SPEC 明示）；确认链=right 单 clip；错链=co_wrong 1752+150+co_hint+300（实长表 §4 定）
- SEL 纪律：坏反馈恒指向行为后果（「朋友会更难过」）禁人身评价；无「告状/惩罚」选项入好卡集；5-6 岁选项 label ≤4 字配图

## §2 quickcmp 快速比大小（6-7 段·数感）

**玩法**：圆点闪一闪，哪边多？
- 教学：watch=幽灵手指看比较（闪现→点多侧→对）→点中；turn=你来比一比帮/独；`__qcDemoR`
- 钩子：`QC = { get currentLevel, get quiz(){ nL(左圆点数), nR(右), flash(闪现档 ms 1200|900), same(等数题布尔=nL===nR——verify 独立复算), options(本题按钮集 2|3——ch1 两选禁 same), step(全关题号), miss }, flashNow()(重放闪现——重看通道 6s 节流承 b31 chr 先例), tapSide(s)(s='L'|'R'|'S'), start(flat), autoSolve() }`——tapSide 返回：s 对（nL>nR 且 L/相等且 S/nR>nL 且 R）→'right'/末题 'done'；错→'wrong'；闪现窗内→null（吞待闪毕）
- 语音：qc_tut_watch'看！圆点闪一闪'/qc_tut_turn'你来比一比'/qc_ask'哪边的圆点多'/qc_hint'数一数，比一比'/qc_right'比对啦，真棒'/qc_wrong'再仔细看看哦'（**前缀=qc_ 已核无占用 ✓**）；确认链=right+TTS 复述「左边X个右边Y个」（keyless 尾契约 N；NUMCN 1-10 全量——「2=两」）；错链=qc_wrong+150+qc_hint+300；闪现窗=TTS qc_ask 后 1200|900+300 消隐（闪现期输入吞 null）
- 渲染铁律：圆点等大+网格抖动不重叠+左右区对称；重看通道 flashNow 6s 节流（节流内仍重置 lastAct 保救援锚——b31 坑④先例）

## §3 tictac 井字棋小冠军（7-8 段·策略）

**玩法**：三个连一线，你就是小冠军。
- 教学：watch=幽灵手指看一局（连三获胜+平局也棒）→走完；turn=你来下一局帮/独；`__tkDemoR`
- 钩子：`TK = { get currentLevel, get quiz(){ board(9 格 'X'|'O'|'' 当前局棋盘), turn('k' 恒——孩子执子方，兔子应手非回合制钩子), round(关内局号 1-3), score(本关得分累进 0-3 步进 0.5), step(全关局号=flat*3+round-1——b33 坑①语义：本款 step=局粒度), miss(恒 0——策略款备案) }, tapCell(i)(i=0-8), start(flat), autoSolve(), get final()`——tapCell 返回：空格落子+兔子应手后='moved'（中局）/局终='win'|'draw'|'lose'（b19 坑②：不自动重开，引擎 proceed 起下一局或通关）；已占=false（bump 家族 D）；演示期 null。`final()` 返回末局终局快照 {result, line(胜线三格下标或 null)}——verify 用，替代 window 快照（钩子表派生池字段 b35 坑③预置）
- 语音：tk_tut_watch'看！三个连一线'/tk_tut_turn'你来下一局'/tk_hint'想办法连成三个'/tk_right'赢啦，小冠军'/tk_draw'平局啦，打得真棒'/tk_lose'兔子赢啦，再来一局'（**前缀=tk_ 已核无占用 ✓——tc_/cs_ 被占实测**）；胜局链=right 单 clip；平局=draw 单发；负局=lose 单发（三条独立不拼播）；**无 wrong 无错链（契约 I 豁免备案）**；非法格=bump 轻叮不配音
- AI 四档实现锚：ch4 perfect=minimax（9 格 ≤3^9 状态全展开，无启发式）；ch3 漏率 20% seeded（`rnd()<0.2` 走随机分支）；局内 RNG=独立 mulberry32(flat*7919+911+round*77)（与 dch RNG 分流——同 flat 同 dch 局序独立）；**verify 独立 minimax python/JS 复算对账 ≥20 局面同格（含先手角/边/中三开局）**

## §4 交付与验收（承 batch15-35 流水线）

语音预合成（gen_clips.py 扩 batch36 块：co_ 5 条（tut_watch/tut_turn/hint/right/wrong）/qc_ 6 条（tut_watch/tut_turn/ask/hint/right/wrong）/tk_ 6 条（tut_watch/tut_turn/hint/right/draw/lose）=**17 条**；前缀 co_/qc_/tk_ 已核 manifest 无占用 ✓ 2026-09-12 实查）→ 3 agent 并行（任务书必带：契约 A-O+I 补逐条+b33 三条硬性+b34 三条+b35 坑三条带入（自配对约束互斥检测/派生池字段列全/全域最长串核字数）+§0.88-90 先验逐条+钩子参数语义表/tapX 返回值语义/verify 独立硬编码表要求/真实页钩子暴露 window.<HOOK>（b29 坑⑥）/契约 M 帧内容断言（comfort 朋友破涕为笑 DOM 类断言+quickcmp 圆点数 DOM circle 计数断言+tictac 落子 DOM 类断言）/内存纪律单 page 串行/禁 analyze_image/禁写 .last_artifact/verify 页先等 title=VERIFY PASS 再驱动/无头测试 --mute-audio+stub 发声/**tictac 终局字串分流+final() 快照（b19 坑②③）**/**quickcmp 闪现窗吞输入 null 驱动须等闪毕**）→ 首单元门禁（gate_common36.py：CO/QC/TK 映射——**comfort/quickcmp 教学末步='right'；tictac 教学末步='done'（整局演示走完）**）→ 探针定钩子语义 → 独立复验（verify_batch36.py T1-T11+T9b）→ 全量回归（verify_final36.py R1-R8；R6 主入口 105→108）→ 两级入口 → 反方审查+分龄试玩（comfort=5.5 岁/quickcmp=6 岁半/tictac=7 岁半）→ 修复闭环 → 收官（108/120）

**实长表（浏览器 Audio 实测 2026-09-12；等待窗=实长+300 余量；全表 17 条零缺漏 bad=[]）**：
- **co_**：tut_watch 2880/tut_turn 1824/hint 2904/**right 2640（判对后窗 ≥2940）**/wrong 2544；确认链=right 单 clip **2940**；**co 错链=wrong 2544+150+hint 2904+300=5898**；情景句 keyless TTS=题面 say（窗=estMs 句长+300，句表 §1 封闭）
- **qc_**：tut_watch 3072/tut_turn 1848/ask 2088/hint 2496/**right 2256**/wrong 1992；确认链=right 2256+150+TTS 复述（max 8 字 estMs 3360）+300=**6066**；**qc 错链=wrong 1992+150+2496+300=4938**；闪现窗=qc_ask 2088+300 后闪 1200|900+300 消隐（闪现期输入吞 null）
- **tk_**：tut_watch 2952/tut_turn 1752/hint 2400/right 2304/draw 2544/lose 2712；**胜局窗=2304+300=2604/平局=2544+300=2844/负局=2712+300=3012（三链独立单发不拼播）**；**无错链（策略款契约 I 豁免备案）**；演示局预算 ≤16s（一局 4-6 手快速演出——verify 实测折算校准，超限再按款型分支裁决）
- TTS 拼句窗=estMs(全字符 n×345+600)+300（家族 T，标点计入）

**语音清单硬指标**：manifest 17 条合成 ok=17 fail=0；gate G3 注入数 5+6+6+core 3。

**quickcmp NUMCN 映射表（契约 L 全量）**：1-10 共 10 值（1 一/2 两/3-10 常规）；tictac/comfort 无数字 TTS（L 天然满足）。

## §5 反方审查+试玩修复记录（收官回填 2026-09-12）

**反方静态审查**（REPORT-REVIEW-b36.md）：fatal 0 / major 1 / minor 6，12 项清单核查通过（契约 N 逐款/quickcmp 闪现门序/tictac miss 恒 0/题库 20 题零偏差/数学先验验算/minimax 人工验算/局 RNG 分流/miss-guard 同构/豁免窗三方对账/verify 期望独立性/教学预算/build 健壮）。

- **M1（家族性缺陷，已修）**：三款 verify ⑨「源码级断言」恒真——build 将 verify 并入 script[2]（data+engine+main+verify 合并），verify 的 `src.indexOf('...')>=0` 肯定断言检索字面串写在 verify 自身→自匹配恒真（实锤：tictac `2604 * SPEED` 字面 main 无仅有 `WIN_MS = 2604`）。**修复=build 布局 verify 分离第 4 个 script 块**（script[2]=纯 data+engine+main，verify 源码断言恢复判别力，三款同构）；**衍生=原恒真断言须对齐 main 真实字面**（tictac 窗常量族改 `WIN_MS = 2604` 等具名常量断言+`800 * SPEED`/`3300 * SPEED`；comfort 14 字面+quickcmp 17 字面批量 grep 核对真源）。**存量批 b31-35 同构回溯登记 backlog**（缓解：build 时对 main 单独文件同批断言有真判别力+数值/行为型断言不受影响，故非 fatal）。
- **m1（已修）**：tictac 教学「帮 5s 重演示」死分支删（教学期 demo 门早退致 idle 分支永不可达）+注释头改写；helpRedemo 声明/reset 保留标注已死防引用。
- **m2（已修）**：tictac dirAnchor 无可成三连格时 else 分支改泛化提示（`board[4]===''?4:[0,2,6,8] 首空`——中心/角，不泄 engBestX 答案级内容）。
- **m3（已修 ×2）**：comfort/quickcmp sayW 节流条件 `cur.flat >= 0 && cur.flat < 3`→`cur.flat < 3`——教学迷你关 flat=-1 错反馈原被 10s 节流吞，契约 J 教学期每错必播。
- **m4（已修 ×3）**：三款 verify ⑫ realPath 加 try/finally——异常路径 origLS 也恢复+沙盒 stub 重挂（⑪ 原有防护，⑫ 裸跑）。
- **m5（备案，本节即备案）**：(a) §0.90 残留 window.__tt2Final 为笔误，真值=§3 final()（实现 window.TK.final）；(b) §1「label ≤4 字」vs 表内两条 5 字——data.js 注释已备案真值优先；(c) tictac currentLevel.step（完成局数）与 quiz.step（flat*3+round-1）同名异义——钩子文档已注明。
- **m6（备案不修）**：tictac winFlow 恒播 tk_right——完成即星家族哲学（通关值得庆祝，1★ 也是星），与「负局温和」口径张力由 lose 局内文案托住。

**分龄试玩**（REPORT-PLAYER-b36.md）：三款全 PASS 零阻断——comfort 65/65（5.5 岁）+quickcmp 53/53（6.5 岁）+tictac 54/54（7.5 岁），pageerror 0×3/console_err 0×3，P1/P2 无。三条 P3 全入 backlog（comfort 题干 15px 亲子共读可放大/quickcmp 换题圆点残影 1-2 拍可先清面板/tictac ch4 三连败可加鼓励语音）。方法学沉淀：驱动侧单位错误自曝（WIN 毫秒 vs idle 秒）/CDP page.click 取消路径永久楔死→结果增量落盘+分段续跑/契约微片页内自锚定探针/Audio 构造器包装捕获语音链。

**修复后复绿链（产物已变未用 SKIP_R13）**：node --check 6/6（main×3+verify×3）→ 三款 rebuild（comfort 334033/quickcmp 316280/tictac 338849 chars，estMs 断言全过）→ 自测 **12/12×3** → **R1-R8 全量重跑 8/8**（R1-R3 三款 12/12/R4 clips/R5 家长门 v1.0/R6 主入口 108 卡+b36inMain=3/R7 href/R8 真实路径三款 dch=[2,2,2,2,3]+写档 rec 2-1..3-0）。

**复验链四起 verify 侧修正**（非实现缺陷）：①comfort T3 初版锁实现取材序→改 say 反查 SPEC 全表域约束对账（b15 同源陷阱预阻）+复现句前后池同句异卡集按卡数区分；②comfort T7 直点落在 15 字情景句 say 窗内被吞→等 5.9s 过窗；③tictac T11 误用 T10 已关 ctx→新开 ctx11；④tictac T6/T7 fresh 关棋盘全空找不到已占格→驱动先落一子（探针实证 tapCell resolve 时兔已应手）。tictac T8 负局构造改 ch4 perfect 兔（ch2 必堵兔乱走未必输）。quickcmp 一次过。

**batch36 交付三款：comfort 安慰选择(5-6 社交情感)/quickcmp 快速比大小(6-7 数感)/tictac 井字棋小冠军(7-8 策略)——批次收官 108/120。**

## §6 comfort r11 难度改造（2026-09-14；**本节为 comfort 真值现行版，§1 题库表/钩子卡模型作历史存档**）

**审计红款 #36**（AUDIT-56 行 48）：v1 好坏二分选卡且 SPEC 自述「不做模糊陷阱」=天花板被设计压死（估 35-45s/关）。r11 三 delta（AUDIT 行 84 建议逐条）：

1. **好卡排序（binary→best-of）**：卡模型 `{good:bool}`→`{tier:'best'|'gray'|'bad'}`；ch1-2 择优二选 `[best,gray]`——两个都是好选择，问的是「**此刻最合适**」（情境适配度比较）。**反启发式设计（防位置/口头禅学习）**：同 label 跨情景 tier 翻转——抱抱它 gray@题0/best@题6/gray@题8/gray@题16、说没关系 gray@题2/best@题7/gray@题15、夸它努力 best@题9/gray@题17、找老师帮 best@题1/题19 伴 gray 扶它起来——「永远抱抱/永远讲道理」策略必失分，须读情景线索。
2. **灰色中间选项（梯度干扰）**：ch3-4 梯度三选 `[best,gray,bad]`——干扰从「坏选择」升「**有点用但不是最好**」；bad 淘汰后真正的认知负荷在 best vs gray 比较。
3. **后果预测（选择-后果因果链）**：选完播后续情景——**best**→朋友破涕为笑（容器类 sad→happy：弯眼+咧嘴+跳两下+撒星星）+`#outcome[data-out=best]` 问题解决小动画（太阳+星，CELE_WIN 窗内）+`co_right`；**gray**→朋友「半好」态 `meh`（平眉睁眼小平笑，不哭了但还没开心）+`#outcome[data-out=gray]` 部分缓解（半云后小太阳+小雨滴）+灰链 `[co_gray]`（单 clip 豁免窗 GRAY_WIN 真时钟）+miss+1——SEL 温和：指向「还有更好的办法」不否定已选行为；**bad**→sadder 更难过一拍+错链 `[co_wrong,co_hint]`（v1 沿用，5898 真时钟）。三层后果 DOM 锚（容器类+`#outcome` data-out+组 `g[data-anim=out-best|out-gray]`）=verify 帧断言依据。

**题库 20 题现行全表**（tier 三档；情景句=题面 keyless TTS 真值源；best 恒唯一=answer 独立推导锚）：
- ch1 择优入门·best2（0-4 此刻实物需求）：①冰淇淋「小熊的冰淇淋掉了，好想吃」best[递自己的]gray[抱抱它]；②摔跤「小兔摔了一跤，膝盖流血了」best[找老师帮]gray[扶它起来]；③积木「小猫的积木塔塌了，好想搭好」best[一起搭]gray[说没关系]；④风筝「小狗的风筝挂树上了，够不到」best[找大人帮]gray[换样玩]；⑤水杯「小羊的水杯打翻了」best[拿纸巾]gray[等水干]（教学演示题=⑤8 字控预算）
- ch2 择优进阶·best2（5-9 情感↔行动翻转）：⑥想妈妈「小猴想妈妈了，眼泪汪汪」best[陪它等]gray[给块糖]；⑦打雷「小熊害怕打雷声，躲起来了」best[抱抱它]gray[陪它玩]；⑧输了「小兔跑步输了，好难过」best[说没关系]gray[再跑一次]；⑨找车「小猫的小汽车不见了」best[一起找]gray[抱抱它]；⑩画坏「小狗把画画坏了，想哭」best[夸它努力]gray[陪它再画]
- ch3 梯度三选·grad3（10-14）：⑪=①+bad[笑话它]；⑫=⑥+bad[催别哭]；⑬气球「小鸡的气球飞走了」best[再送一个]gray[陪它玩]bad[说活该]；⑭=⑧+bad[嘲笑它]；⑮午睡「小猪午睡被吵醒了」best[轻声说话]gray[拍拍它]bad[大声吵]
- ch4 梯度混合·grad3（15-19）：⑯鞋「小鹿的新鞋踩脏了」best[帮它擦]gray[说没关系]bad[踩一脚]；⑰=⑨改 best[帮着找]gray[抱抱它]bad[藏起来偷笑]；⑱拼图「小松鼠的拼图少一块」best[一起找]gray[夸它努力]bad[推乱拼图]；⑲=⑦短句「小熊害怕打雷声」best[抱抱它]gray[陪它玩]bad[关灯吓它]；⑳膝盖「小马摔破了膝盖，流血了」best[找老师帮]gray[扶它起来]bad[说娇气]
- 复现句规则：同 say 异卡集按卡数区分（①/⑪、⑥/⑫、⑧/⑭、⑨/⑰；⑦长句 ch2 版 vs ⑲短句 ch4 版不同串）；say 长度铁律 best2 ≤13 字/grad3 ≤12 字（时长模型语音窗不撑时长前提；r11 审查 m-2 勘正：题库 ⑪ 实为 12 全字符含逗号，≤11 为过时口径）；生成关池域 dch≤2→题 0-9/dch≥3→题 10-19（引擎取材不变）

**钩子现行版**：`CO.quiz = { scene, kind('best2'|'grad3'), say, cards[{tier,label}], answer(=cards 中唯一 tier==='best' 的 i), step, miss }`；tapCard 返回：best 非末题 'right'/末题 'done'/**gray·bad 同口径 'wrong'**（miss 计；反馈分流在 UI 层）/豁免窗内非 best 吞 false/演出期 null/越界 null。

**语音（co_ 5→7；既有 5 键文本一字不改）**：新增 co_pick'都很好，哪个现在最好'（best2 题题面句播完串播的**择优方向锚**——不指认：锚文本与全部卡 label 无子串交集，verify/verify_one 双端断言）/co_gray'这样有点用，还有更好的办法'（灰色次优反馈）；兔子按钮/空白点提示按题型分流（best2=co_pick/grad3=co_hint）。

**窗口现行版（§4 实长表增补 2 条）**：co_pick **2952**（2026-09-14 实测）→择优锚窗 PICK_WIN=**3252**（=2952+300 精确，best2 题题面后串播）；co_gray **3240**→灰链豁免窗 GRAY_WIN=**3540**（=3240+300 精确，真时钟）；坏链 5898/确认窗 2940 沿 v1；教学 watch 预算=3180+(400+3360+300+3252)+800+320+2940=**14552 ≤16000**（单步演示款——r11 锚+7312 后仍达标）。

**r11 时长模型（门禁硬断言；estMs 家族定版 n×345+600 四处同步：data/main 注释/verify 独立副本/build 字面）**：每题=max(voiceWin,DECIDE)+ADV；voiceWin=ENTER 400+estMs(say)+300+(best2 加 PICK_WIN 3252)；DECIDE_MS={best2:10000,grad3:11000}（认知决策时长——情境线索定位+候选适配评估+择优比较）；ADV=CELE_WIN 2940（判对推进窗=后果演出窗）。验算：全 20 题 voiceWin 恒 ≤DECIDE（**语音窗从不撑时长**：best2 最长 13 字 9037<10000/grad3 最长 11 字 5095<11000）；40 关 modeled 最低=best2 章 5×12940=**64700 ≥ LEVEL_MIN_MS 40000**（grad3 章 69700）。verify ⑭+verify_one W5 双端独立复算（V_DECIDE/V_ADV/V_MIN/V_PICK/V_ENTER 重列禁引引擎常量）+与源模型 levelDurMs 逐关对账。

**verify 增量（game-verify.js 11→14 单元）**：新增 ⑤grayPath（wrong+miss+meh+outcome gray+灰链单 clip+豁免窗吞/放行）/⑭duration（40 关时长门禁）+扩 ①（clips 10 实长辨别+answer 独立推导+锚不泄+FX_MEH/outcome SVG 定义）/②（锚 co_pick 教学期在场+watch ≤16000）/③⑦（tier 题库双录+kind 域）/④（三表情组+后果气泡帧断言）/⑥（gray·bad 分流）/⑩（PICK_WIN/GRAY_WIN 精确式+契约 F 字面哨兵+nextHint 章末逐点 [4,9,14,19]+off-by-one 哨兵+生成关 [24,29,34,39] 实算——dressup r10 范式）。**verify_one_comfort.py 新建**（W0 双视口 14/14/W1 40 关 tier 章约束 Python 封闭表/W2 灰路径/W3 后果三档 DOM/W4 nextHint 哨兵族/W5 时长独立复算/W6 钩子+锚不泄+autoSolve）。

**批门禁增改**：build.py（CO_KEYS 7/n_clips 10/PICK_WIN·GRAY_WIN·DECIDE_MS·levelDurMs·LEVEL_MIN_MS 字面/renderOutcome·dirVoice·#outcome 素材/教学预算含锚 14552）；_selftest.py（14 单元/clips 10/co 7）；verify_batch36.py CO_BANK→tier 表（q_comfort 按 tier 对账，T11 下界 5898 沿用）；verify_final36.py R4 KEYS+co_pick/co_gray；gate_common36.py comfort=10；batch1/verify_voice.py 补登 comfort（core 3+co 7——原漏登空转缺口，同 dressup r10 补法）。

## §-r18-tictac 难度改造（2026-09-18；AUDIT-78 黄款：3×3 解游戏天花板低、估 30-60s/关）

**本节为 tictac 真值现行版；§0.90/§3 的四档对战描述以本节为准**（教学链/对战四档/局 RNG 分流/星级分值制全部沿用，钩子表按下文扩展）。r18 三 delta（AUDIT 行 88 建议逐条）+两条门禁升级：

1. **残局谜题关（棋局阅读维度）**：ch5 残局小侦探（flat 24-29，6 关×5 题=30 题）三类残局题——**win1 一步制胜**（X 到手，恰一格可立即成三连）/ **block1 必堵**（兔子恰一格可成三连，X 无己方杀，须堵住）/ **fork 双威胁**（双方均无一步杀，恰一格落子后同时造出 ≥2 条己方成三连威胁线）。点对=落子演出+right；点错=wrong+**计 miss**（分题型口径见 §5）。
2. **变体规则章（规则迁移维度）**：ch6 大棋盘三连（flat 30-35）=**4×4 棋盘得 3 连**（24 条胜线，先手优势放大，AI=确定性 depth-4 minimax）；ch7 三子滚动（flat 36-41）=**限子数变体**（每方场上最多 3 子=「6 子摆满后」，落新子时己方最旧子先移出再落子+胜负判定；总手数 ≥36 无胜负判平局收束）。两变体每关 3 局、胜 1/平 0.5/负 0 计分制与 classic 一致。
3. **负局 AI 复盘（元认知维度）**：classic 对战局（ch1-4，flat≥0）负局后 AI 复盘指出关键失误步——对整局手序做 minimax 回溯：**首个「局面前最优值非负、实际落子后转入必败」的 X 手**=关键失误（井字棋先手最优≥平局⇒任何负局必存在失误步——数学先验）；复盘层显示失误步局面（红=实际格，绿=更优格 breathe）+tk_review 语音，窗 REVIEW_MS=4512，tap 可提前关闭。变体章与教学迷你局不复盘（v44/vroll 无全谱真值，教学不施加元认知负荷）。
4. **AI 强档全谱重验（门禁升级）**：perfect 档「永不输」升级为**全盘谱遍历断言**——空盘起 X 全策略分支 × O 恒走 engPerfectPick 的整棵博弈树 DFS，断言任何叶局无 X 胜（verify 单元⑰运行时实证+selftest 独立 minimax 全谱对账同格；旧 ≥20 局面子集复算不再是闭合证据，仍保留为档位一致性 U6）。
5. **DECIDE_MS 认知时长模型（门禁升级）**：见 §4 时长模型——modeled 数字 verify+selftest 双钉精确一致禁约数。

**§1 关卡结构（r18 定版）**：`CH_LEN=6`（5→6，**键基变更→启动迁移 IIFE**，§6）、`N_CHAPTERS=7`、`STATIC_LEVELS=42`、对战关 `ROUNDS=3`、残局关 `PUZZLES=5`。章表：ch1 兔子随便下（dch1）/ch2 兔子会防守（dch2）/ch3 聪明兔登场（dch3）/ch4 冠军大挑战（dch4+复盘）/**ch5 残局小侦探（puzzle）**/**ch6 大棋盘三连（v44）**/**ch7 三子滚动（vroll）**；`KIND_OF_CH={1-4:'battle',5:'puzzle',6:'v44',7:'vroll'}`；生成关 flat≥42 恒 `kind='battle'`、dch=ri(1,4)（mulberry32(flat*7919+911)——生成关预告 GEN_HINTS[dch-1] 四档不变，家族 F）。章末预告 hint[i]↔CHAPTERS[i+1]（7 章域 ci<7，gen 关实算）。星级**分题型**：battle/v44/vroll=分值制（≥2.5=3★/≥1.5=2★/完成=1★）；puzzle=miss 制（0=3★/1-2=2★/≥3=1★）——`engStars(L)` 按.kind 分流，永不 0★。

**§2 残局题库（30 题封闭，确定性生成）**：题面种子=mulberry32(flat*7919+911+7777+qi*131)（与 dch 流/局 RNG 流三重分流）；每题由种子洗牌构造 kX=kO=k 的合法局面（X 到手、无既有三连），**题库数学先验（写前验算 ✓）**：
- **win1 谓词**：|winPoints(X)|==1 ∧ |winPoints(O)|==0 ⇒ 唯一答案=该格；
- **block1 谓词**：|winPoints(O)|==1 ∧ |winPoints(X)|==0 ⇒ 唯一答案=该格（X 自己的一步杀缺席防答案歧义）；
- **fork 谓词**：|winPoints(X)|==0 ∧ |winPoints(O)|==0 ∧ 恰一格 c 使落 X 后 winPoints(X)≥2 ⇒ 唯一答案=c（无一步杀在先 ⇒ c 落子不可能直接成三连，威胁恒为开放双线）。
- 题型日程：lv0=win1(k=2)/lv1=win1(k=3)/lv2=block1(k=2)/lv3=fork(k=2)/lv4=win1+block1 混(k=3，qi 取模轮换)/lv5=三型混(k=3)。4000 次尝试内必中（先验：k=2 随机局面 win1 谓词命中率实测 >2%，fork >0.3%）；失败兜底=每型一手造静态题（PUZ_FALLBACK 三题均人工验算唯一解）。verify ⑬对全部 30 题**独立复算谓词+答案**并断言确定性（同 flat 两次 JSON 一致）。

**§3 变体规则判定器（与 classic 差异全枚举）**：
- **v44 胜负判定器**：胜线集 LINES16=**24 条**（横 8=4 行×2 窗、竖 8=4 列×2 窗、↘对角 4={0,5,10},{5,10,15},{1,6,11},{4,9,14}、↗对角 4={3,6,9},{6,9,12},{2,5,8},{7,10,13}）——classic 8 条全枚举差异：①线数 8→24；②同色 3 连即胜（窗口滑动，4 格行含 2 个 3 连窗）；③棋满 16 格无三连=平局（classic 9 格同口径）。AI=`engV44(b,me)` 确定性：①己方一步杀（升序首格）→②堵对方一步杀→③depth-4 minimax（eval=Σ线 2+1空 ±50/1+2空 ±5，胜=±(1000-depth)，升序严格更优平分取最小下标——零 rng 消耗，同局面恒同应手）。
- **vroll 限子判定器**（classic 差异）：①每方场上 ≤3 子（ROLL_CAP_PIECES=3）：落子时己方已满 3 ⇒ **先移出己方最旧子（FIFO 队列 xq/oq）再落子**，移出与落子原子完成；②胜负判定在「移出+落子」完成后 whole-board 扫描（己方余 3 子恰成线=胜；移子可为己方让路=滚动杀）；③对方一步杀=模拟**对方含自身移子**的落子成线集合；④棋满不可能（双方 3+3=6<9），平局唯一来源=总手数 ROLL_MOVE_CAP=36 收束；⑤X 先手、兔子 O 应手 800ms 演出沿家族。AI=`engRollPick(g,me)` 确定性：①己方含移子一步杀→②堵对方一步杀格（占位即堵，升序）→③启发（中心+3/角+1/落后己方威胁数×2，升序严格更优）。

**§4 时长模型 r18（modeled 双钉）**：`DECIDE_MS={battle:7000,puzzle:12000,v44:8000,vroll:8000}`（认知决策时长：battle=单手选点、puzzle=残局阅读+谓词验证、v44=16 格扫描、vroll=移子后果预演）；名义量 NOMINAL：battle 4 X 手/3 兔应手、v44 与 vroll 6 X 手/6 兔应手/局；`modeled(flat)=ROUNDS*(moves*DECIDE_MS[kind]+rabbit*800+2820)`，puzzle=`PUZZLES*(3000+DECIDE_MS.puzzle+2604)`。**精确值（禁约数）**：battle=99660、puzzle=**88020（全 42 静态关最低）**、v44=vroll=166860；生成关=battle 值；全关 ≥LEVEL_MIN_MS 40000 ✓。verify ⑱+selftest 双端独立复算（V_DECIDE/V_NOM/V_MODELED 重列禁引引擎常量）。

**§5 miss 分题型口径（契约 I 并存定案）**：**对战关（battle/v44/vroll）恒 miss=0**——无对错点击，点已占格=拒绝 bump 家族 D 不响 wrong，契约 I 豁免备案（§0.90 原文）不变；**残局关（puzzle）答错计 miss**——空格点错=wrong 链 [tk_wrong]+miss+1，契约 I 全量适用：错链豁免窗 `WRONG_CHAIN_WIN=2448+300=2748`（窗内错点吞 false+pop+bump 不计、对选放行；窗后二错照计 miss）、guard 挂判定前、startLevel/换题重置、救援 interval 让路（`if (Date.now() < wrongChainUntil) return;`）；契约 J 语义句 10s 节流（节流内错点 miss 照计、链不重播不设窗）。miss≥2=答案格 breathe（答案级线索）。点已占格仍=拒绝 bump 不计 miss（非判定格）。

**§6 键基迁移 IIFE（CH_LEN 5→6，r17 范式）**：启动先于 KIDS.init 执行：读 localStorage('kidsgame_tictac')，脏键=键格式非法或关号 >CH_LEN-1（章号上界放开容纳生成关 ch≥8）→重置；矛盾态=存在 c∈[2,7] 使 lv[c+'-0'] 在而 lv[(c-1)+'-5'] 缺（旧基 5 关/章不可能在新基合法出现）→一次性重置。合法新基档（含 ch≥8 生成关键）保留。

**§7 语音与窗口（§4 实长表增补 7 条，2026-09-18 浏览器 Audio 实测）**：tk_puz_win 2904/tk_puz_block 2952/tk_puz_fork 2856/tk_wrong 2448/tk_review 2712/tk_v44 2856/tk_vroll 3336（既有 6 键一字不改沿用）；clips 注入 13+core 3=**16 条**。窗口：残局判对=WIN_MS 2604（right 2304+300 沿用）；**WRONG_CHAIN_WIN=2748**（tk_wrong 2448+300）；**REVIEW_MS=4512**（tk_review 2712+300+1500 看板余量）；变体章开题句播（tk_v44/tk_vroll 每关首局一次，不阻塞输入）；残局题面句=每题按型播 tk_puz_*（不阻塞）。estMs 家族 T 四方同步（data 定义/main 禁重复声明/verify 动态/selftest lambda——本款全 clip 无 keyless 段，estMs 供窗口口径对账）。

**§8 钩子表（r18 扩展；battle 语义不变）**：`TK.quiz` 分题型：battle/v44={kind,board(9|16),turn:'k',round,score,step=flat*3+round-1,miss:0}；vroll 同+v44 字段外加 {xq,oq(己/对方落子 FIFO 队列),moves}；puzzle={kind:'puzzle',ptype('win1'|'block1'|'fork'),board(9),answer(唯一答案格),round=题号 1-5,step=flat*5+题号-1,miss(本关累计)}。`TK.currentLevel`={flat,ch,dch,lv,**kind**,round,n(3|5),score,step,done,won,miss(battle 恒 0/puzzle 累计),stars,results}。`tapCell(i)` 返回：battle 沿用（'moved'/'win'/'draw'/'lose'/false/null）；puzzle：答案='right'/末题 'done'/错='wrong'/已占格或窗内错点=false/反馈窗=null；v44/vroll=battle 同构字串。新增 `TK.review`={moveNo(X 手序 1 起),missCell,bestCell,boardBefore(9)}或 null（末次负局复盘快照——verify 独立 minimax 回溯对账）。autoSolve 按型分流（puzzle=逐题 answer；v44=engV44(X)；vroll=engRollPick(X)）。

**§9 verify 增量（12→20 单元）**：新增 ⑬puzzle（30 题独立复算+驱动 miss/豁免窗/答案级）/⑭v44（24 线双录+参考 AI 独立复算逐手对账+合法性+两次全驱一致）/⑮vroll（参考引擎独立复算含移子/FIFO/收束+oldest DOM 标记）/⑯review（负局复盘=独立 minimax 回溯首误步对账+胜平局无复盘）/⑰fullSpectrum（X 全策略×O perfect 全树 DFS 无 X 胜+独立 minimax 全 O 位同格，节点 ≥1500）/⑱modeled（§4 精确值钉死）；升级 ①（clips 16+四型布局双视口）/③（flat0-23）/④（四型帧断言）/⑦（双星级制）/⑧（flat42-61）/⑨（契约源码族 A(r17 双 lim-1)/I(r18)/J/MIG/PORT-CLS）/⑩（puzzle 链）/⑫（kind 域）。_selftest.py 新建（verify 20/20+真实点击链四型+教学链+双视口+竖屏通道等价+迁移三例+全谱实证+救援双锚+modeled 双钉）。
