# SPEC-R40-CODER — coder 指令小兔 难度加深（r40，AUDIT-67 段序 14 🟡）

> Executor 自拟（账本制：主线独立复验为准）。基线 md5 `02d98230df8ec03f8b06e8bb7c6938dd`（build 双跑幂等），
> 谱基线 `r40-baseline.json`（40 关：run 143 / path 57，g 全 3，path seq 全 2，opts 全 3）。

## §R0 目标与验收铁律

- 审计（A67 段序 14，实测 31.6-46s）：「ch1 单步点一下即到=5 关空转，3×3 封顶小；ch3 path 预测是真内容」。
- 主轴（派单书）：**path 预测（指令序列→预判终点）扩容**——网格 3×3→更大 / 指令序列加长 / 多步化 + **ch1 空转消除**。
- 三维度消化判断（Executor 裁量，宁难勿易，b28 段 6-7 岁幼小衔接）：
  1. **网格扩容**：ch3 起草地 3×3→**4×4**（承接）。ch1/2 保 3×3（起步坡：新段首两章在小网格固化「指令→走格」机制，ch3 网格与预测双升）。
  2. **run 步数阶梯拉满**：dist 阶梯 **2/3/4/5**（ch1-4，原 1/2/3/∈{2,3}）——ch1 空转消除（dist1 仅存 flat0 题0 教学锚点）；audit 建议域 4-6 中的 4-5 落地（6=卡池 7 张触发布局与认知双上限，裁量不做）。
  3. **path 指令序列加长**：seq 2→**3 步**（ch3 lv2 起；ch3 lv0-1 保 seq2 为预测题型引入坡；ch4 恒 seq3）。心理模拟深度 +50%（2 步中间态 1 个→3 步中间态 2 个，且含「回折步」陷阱态），候选 3→**4 格**（seq3 时；答案+末段中间格+首段中间格+随机第 4 格——「少走一步/两步」双陷阱在场）。
  4. **不做**（论证）：「重复 2 次循环指令卡」——b18 coder2（大童批）已是循环指令专款，6-7 岁段引入循环语义=机制越级+需全新键族；「多路径择优逆向题」——非派单主轴（预测=正向），登记为下轮候选。主轴四项已足额消化「宁难勿易」。
- 验收：build 双跑幂等 md5 + ?verify=1 双视口全绿（56/56）+ 谱 baseline/post 对照（§R8）+ 锚面保留清单（§R7）。
- **零新语音键**：seq3 读题链 = 在册 7 键重排复用（cod_ps_zai 复用两次），T46 在册键直接接（§R6）。

## §R1 判定层边界论证（r25 M2 纪律）

engTapCard 为**单步原子判定**：每次点卡独立评估 moved/right/false/wrong，无跨步批量判定、无中间态判定依赖。
run 题 dist 加长只是**原子判定序列变长**（1→5 次），不引入新的中间态判定层；path 预测仍是单次点选单判定
（seq3 只加长被模拟的指令序列，不改判定结构）。故 r25 M2「判定层单步铁律」边界不受侵蚀——扩容全部落在
「序列长度」与「空间规模」两维，判定层结构零改动（engTapCard 仅 inGrid 参数化）。

## §R2 难度谱定稿（CH_LEN=5 / STATIC_LEVELS=20 / 星级口径 0=3★,1-2=2★,≥3=1★ 不动）

| 章 | 名（原） | 网格 g | run dist | run 石头 | 干扰（奇数位+1 卡） | path 混出 | path seq | path 石头 |
|----|----------|--------|----------|----------|--------------------|-----------|----------|-----------|
| dch1 | 走两步（走一步） | 3 | **2** | 0 | 无 | 无 | — | — |
| dch2 | 走三步（走两步） | 3 | **3** | 0 | 无 | 无 | — | — |
| dch3 | 猜一猜 | **4** | **4** | 恒 1 | 有 | 每关 ≥2（全翻 1 保混合） | **lv0-1=2，lv2-4=3** | 恒 1 |
| dch4 | 大挑战 | **4** | **5** | 1-2 | 有 | 同 dch3 | **恒 3** | 0-2 |

- lv = flat % 5（静态与生成关同式；生成关 dch3 lv0-1 亦 seq2 引入坡）。
- 卡池数学先验（§0.67 原样）：池=一条存活最短路指令多重集 ±1 干扰（DFS 复验可达）；石头不挡死全部最短路；
  起终点不相邻（dist≥2 天然满足；flat0 题0 教学锚点 dist=1 唯一例外）。
- path seq3 生成约束：d2 ≠ opposite(d1)（保证中间格2 ≠ 起点——「少走一步」陷阱格恒合法在场）；
  d3 不限（d3=−d2 时落点=中间格1=回折陷阱，候选去重后补第 4 格）；落点 ≠ 起点、各中间格界内非石。
- path 候选：seq2 → 3 格（原样：答案+中间格+随机）；seq3 → **4 格**（答案+中间格2+中间格1 去重+随机补足）；
  全部互异、非起点、非石头。structWhy 强断言「末段中间格在场」（midMiss）。
- 章末预告（家族 F，verify ⑬ C7 关键词联动更新）：CH1 hint「小兔子要走三步啦」（预告 ch2）/
  CH2 hint「格子要变大啦，还要动脑猜一猜」（预告 ch3 4×4+预测）/ CH3、CH4 hint 原样；
  GEN_HINTS：dch1「两步两步走，想好再点」/ dch2「三步三步走，想好顺序再点」/ dch3「四格大棋盘，猜猜走到哪」/
  dch4「大集合，想好每一步再点」（原样）。

## §R3 生成律（确定性通道不动：mulberry32(flat*7919+31)，生成关 burn 一掷修正保持）

- specSeqOf(dch, rnd, **lv**)：dch1 dist2 / dch2 dist3 / dch3 run dist4+石1 / dch4 run dist5+石 ri(1,2)
  （dch4 原 ri(2,3) 取数删除——rnd 流消耗变化=谱更新预期内；dch1/2 分支零 rnd 消耗，锚面不动）。
- path 掷币混出律原样（每关 ≥2、全 path 翻 1）；seq 由 (dch,lv) 表决定（§R2）。
- buildQuiz 全程 g 参数化：cellsOf(g)（CELLS3/CELLS4 封闭表）、inGrid(p,g)；run 兜底 goalMap 扩 {2:(1,1),
  3:(1,2), 4:(2,2), 5:(3,2)}；path 兜底 g 感化（4×4 离路石）。
- 每题 q.g ∈ {3,4} 落盘（L.g 同源）；CD.quiz 暴露 g（verify 对账「渲染即引擎」）。

## §R4 UI/语音/时序面

- **渲染 g 化**：renderScene 双层循环 r/c<g；格索引 k=r*g+c（reachFx/pathFx/miniGridHtml 同式）；
  placeBun cw=(gw−7·(g−1))/g；head 增 `.grid.g4`（桌面 316×316 格 73.75 / 竖屏 312×312 格 72.75，均 ≥72 触摸地板）
  与 `.grid.g4 .bun` 68px（竖屏 66px——审查 m1 勘正：格内不越界，<格 72.75-73.75）；path 候选 mini 网格 m4（74×74 四列，r31 判别力：mini 与真网格同构）。
- **卡排防溢出**：#board 加 flex-wrap:wrap+row-gap（安全网）；run 池 ≥5 张（dch3 池 4-5（奇数位 5，审查 m2 勘正）/ dch4 池 5-6）时
  board 挂 `.many` 类——卡紧凑档 80×106（6×80+5×14=550 ≤640 单行不换行，1280×800 纵向栈 ≤650 预算实证）。
- **语音链（零新键）**：seq3 读题 = 9 段链 [cod_ps_go, cod_ps_n_3, cod_ps_bu, cod_d_X, cod_ps_zai,
  cod_d_Y, cod_ps_zai, cod_d_Z, cod_ps_tail]（cod_ps_zai 复用两次）；pathSpeak/pathKeys 重写为变长构造
  （seq2 输出与原 7 段链**逐段一致**——回归零漂移）。文案拼接=游戏内字符串（r34 M1：verify 直调断言
  texts.join===pathSpeak）。其余语音窗全不动（确认 ≤2832≤5400 / 错链 8718≤8800 / 撞石 2580≤3700）。
- **新时序面（唯一一个）**：seq3 读题 9 段链实测长 = Σ段 12936 + 150×8 = **14136ms > 14000 方向级救援间隔**
  → 新增 `readChainUntil` 豁免守卫（家族 I 同构）：speakQuiz 起 seq3 链时 readChainUntil=now+**14600**
  （≥14136+300），rescueTick 顶守卫让路，startLevel 重置 0。救援**延迟不饿死**：链播完（≤14.6s）后 1s 轮询
  即触发方向级（r24 M1 可达性保持；r31 口径 14s 门不变，此为链豁免让路的家族 I 既有语义扩展）。
  seq2 链 11244+1000 ≤14000 原判定保持，不挂守卫。
- 教学/救援/吞输入/星级/防重入全部原样（§R7 锚面清单）。

## §R5 verify/_selftest/verify_one 三方适配（断言从本 SPEC 推导，r31 判别力）

- verify ① 40 关审计：structWhy 签名不变（内部 g 化+flat0q0 锚点豁免新 dist 规则）；引擎直驱循环上限 20 不变。
- verify ② SPEC 独立表：SPEC_SEQ(dch,lv) 封闭表 + dist 阶梯 2/3/4/5 独立推导 + g 规则（dch≥3 → 4）+
  path opts=seq+1、末段中间格在场、候选互异非起非石；锚点（flat0k0）独立豁免分支。
- verify ③ 卡池先验：specSolve/specReach/specShortest/specTap/cloneQ 全 g 参数化（sq.g）。
- verify ④ tapCard 单元：initOk（锚面）/moved（flat5 dist3 首步）/wrong+复位/撞石 false/path 错反馈 2 段链
  （cod_wrong+cod_g_path；审查 m4 勘正——7 段链是 ② 读题链直调的口径，flat10 lv0）——全部 g 化后原口径保持。
- verify **新增 ④b seq3 深化单元**：flat12（ch3 lv2）首个 path——seq3/opts4 结构断言 + pathKeys 直调 9 段链
  期望表（SPEC 推导）+ texts.join===pathSpeak + UI 点错 wrong/点对 right 推进。total 55→**56**。
- verify ⑦ flat0 autoSolve taps 5→**9**（锚 1+dist2×4 题×2）；⑧ flat10 miss→2★ 口径不动；
  ⑨ 聚合扩容：dist 阶梯逐章断言 / g 逐章断言 / seq（flat10-11 全 2，flat12-14 全 3）/ dch4 dist 全 5；
  ⑬ C7 关键词按 §R2 新表；⑮ 增 read3=14136+300≤14600 断言；⑯ 增 readChainUntil 三处源级断言
  （speakQuiz 设窗/rescueTick 守卫/startLevel 重置）。
- verify_one 适配版归档 `_src/verify_one_coder_r40.py`（谱审计+钩子驱动+r40 规则，**13 项**（T0-T12，
  T0=页内自检复跑门）；**禁整替主线版**——主线 verify_batch28.py coder 段的 3×3 界内与 ch1 池规则需
  主线同步适配，本件为参照实现）。
- _selftest：本款 _src 无存量（r40 前未建），以 ?verify=1 双视口 + verify_one 双跑为等效门禁（§R8 声明）。

## §R6 新语音键 TODO 清单

**零新键**。seq3 读题链全部由在册 24 cod_ 键复用构造（cod_ps_zai ×2 复用为核心技巧）；确认/引导/豁免句
键族原样。manifest 5243 不动、gen_clips.py 不动（红线遵守）。若后续主线将 seq 上探 4 步，需注册
`cod_ps_n_4`（'四'）——**挂账候选，本轮不做**（未注册键入链=整链静默中止，core queue 缺 clip 即弃句）。

## §R7 锚面保留清单（r24 救援锚/教学锚，逐项核验）

| 锚面 | 保留口径 |
|------|----------|
| flat0 题0 教学演示锚点 | start(1,1)→goal(0,1)、3×3、dist=1、池=[up] 单卡、无石（structWhy anchor 分支原样；新 dist 规则显式豁免该题） |
| 教学时序链 | watch 3504→tap@3900→turn 1848→读题延 2200（教学预算 10120≤16000 build 静态账原样） |
| run 读题 | cod_q 2400「帮小兔子走到萝卜」（题面句/aria 原样） |
| path 读题 seq2 | 7 段链逐段与 r39 版一致（变长构造的 seq2 输出=旧链，回归断言） |
| 错反馈/撞石/确认链 | 8800/3700/5400 三窗与句族原样 |
| 救援双锚 | lastAct 30s 答案级 / lastDir 14s 方向级 + K 面板守卫 + I 链豁免（新增 readChainUntil 同族并列） |
| 存档 | kidsgame_coder / sv.coder.tutSeen / levels 'ch-lv' 键全不动（内容换血键不迁） |
| CH_LEN=5 / STATIC_LEVELS=20 / 星级 3-2-1 | 原样 |

## §R8 基线与验收（Executor 自测门禁数字；谱投影 _r40_extract.py 口径）——终态实测

- 基线（改造前）：build 双跑 md5 `02d98230df8ec03f8b06e8bb7c6938dd`；?verify=1 55/55 ×（1280×800 /
  800×1180）0 pageerror；谱 r40-baseline.json（run 143/path 57，g{3:200}，seq{2:57}，opts{3:57}）。
- 终态（改造后）：build 双跑幂等 md5 **`9aa59e9b035159e3673a7ef98962033f`**（618625 chars，注释勘正后终值）；
  ?verify=1 **VERIFY PASS 56/56** ×2 视口 0 pageerror（含新增 ④b seq3 单元）；
  verify_one_coder_r40.py **13/13 × 双跑**（T0-T12，pageerror=0）；
  谱 r40-post.json：run 143/path 57 不变，g {3:95, 4:105}（静态 ch1/2=50 题 3×3 + ch3/4=50 题 4×4 +
  生成关按 dch 分档），path seq {2:7, 3:50}、opts {3:7, 4:50}（seq2=静态 ch3 lv0-1+生成 dch3 lv0-1），
  run dist 迁移 {1:35,2:71,3:37}→{1:1, 2:34, 3:60, 4:25, 5:23}（dist1 仅存锚点），40/40 关谱刷新；
  逐章实测：ch1 dist{1锚,2} 池{1锚,2} g3 / ch2 dist3 池3 g3 / ch3 dist4 池4-5 恒石1 g4 path seq{2,3}
  opts{3,4}（13 path）/ ch4 dist5 池5-6 石1-2 g4 path 全 seq3 opts4（13 path）；
  锚面：flat0q0 (1,1)→(0,1) 池[up] 无石 3×3 保留（T6+页内 ④⑤）；真页 boot 冒烟：教学链真实走完
  （tut=help、锚题在场、9 格 1 卡、0 pageerror）。

## §R9 r23-r39 教训逐项回应（关键七条）

- r25 M2 判定层单步：§R1 论证（扩容不触判定结构）。
- r31 判别力：mini 网格 m4 与真网格同构；SPEC_SEQ 独立封闭表推导（禁抄实现的 (dch,lv) 三元式）。
- r33 flat 区间：静态 0-19 / 生成 ≥20 分治口径不动；g/seq 由 dch+lv 决定与 flat 区间正交。
- r30 重入 / r19 静音：错点 1000ms 防重入、MUTE 注入复验路径原样（_mainline_verify_r40.py）。
- r34 M1 朗读检查：pathKeys texts.join === pathSpeak 直调断言（seq2/seq3 双例）。
- r34 计数四层：clips 27 三层计数（build/verify ⑪/注入）零联动（零新键）；新增 `== 5`/`== 9` 类计数
  断言已 grep 清点（见 build.py 注释块）。
- r35 M-1 时序实长口径：seq3 链 14136 = Σmp3 实测 + 150×8 段距（非 estMs 外推）；14600 窗 ≥14136+300。
- r37 键构造先核实现：queue 缺 clip 弃整句的 core 实现已核对（§R6 论证依据）；pathKeys 直调期望链从本
  SPEC 推导（verify ④b），禁抄实现拼接结果。

## R10 修复轮记录（2026-09-22，试玩 B1+审查 M1/m1-m4 处置）

- **B1（blocker，已修）**：engTapCard 撞石吞卡分支（return 'false'）先于卡尽检查——末卡撞石吞尽=池尽死锁（不记 miss 不复位，救援无解：correctIdx 语义下答案级永不来，run 死锁态 pulse 仅视觉）；死锁面=flat10-19 静态 9/24 run 题含死锁序（37.5%，最高 40%），真机 7 次（flat10.s2/flat19.s3 六连）。**修复**：吞卡后补池尽检查——吞尽与「移动后卡尽」同构 wrong 复位（miss+1+小兔回起点+池全恢复）；game-verify specTap 模拟器同步（独立模拟器镜像 SPEC 语义非实现）。修复版 md5 **d5dd884f**（642322B）全回归：VERIFY 56/56×2 / verify_batch28 12/12×2 / gate 3/3 / **死锁全量重扫归零**（38 run 题 0 死锁序，deadlock_scan.py 语义同步后）。
- **M1（major，披露处置）**：seq3 静止态救援——审查推演答案级典型 ~44s（两次读链窗叠加）；**试玩实测 N1=30.1s**（方向级 15.1s 后第二次方向级被答案级跳过——重读再设窗把方向级 2 推过 30s 线答案级先到）。§R4 原论证只覆盖方向级=域缺口，§R7「双锚保留」在 seq3 态的实义=方向级 15.1s/答案级 ~30s（不幸运 tick 相位最坏 ~44s 窗叠加）。行为优化候选（答案级 breathe 不受 readChainUntil 拦）挂账下轮与救援/窗家族统一评估。
- **m1/m2/m4 已勘正**（§R4 bun 68px 竖屏 66px；§R4 dch3 池 4-5；§R5 ④ 错反馈 2 段链口径）。
- **2026-09-23 m 批收口 m3/m5/m6/m8**：m3 head.html:185 竖屏 many 档注释 78→76px；m5 game-main
  确认句收尾窗注释 estMs 估算口径→clip 实长上界 2832（cod_demo）；m6 game-verify ⑬ genOk 与
  verify_batch28 T10 恒真断言（与 nextHint 实现同表达式）改 SPEC 章表关键词对账（dch1-4→两步/三步/
  猜/集合，实算下一关 dch）——m6 属断言改造非纯注释，但为 verify 面非游戏行为面；m8 game-core
  兜底 path 注明固定 seq2/opts3 与 spec.seqN 脱钩+structWhy 拒绝=fail-loud 非静默。
  维护版 md5 **7575cffc09f6e962743e337427db2f9e**（643053B）全回归：VERIFY 56/56×2 /
  verify_batch28 12/12×2（T10 新判据绿）/verify_one 13/13/gate 3/3（G3 n=27）/谱零变化
  （r40-post 重提取 run143/path57/g{3:95,4:105}/seq{2:7,3:50} 一致）。
- **挂账下轮**：m3（head.html 注释 78→76）/m5（game-main estMs 残留注释）/m6（verify⑬ genOk 恒真存量）/m8（path 兜底 fail-loud 注释）——均进 build 拼接，为注释/存量断言出第四版本不值；m7/m9（归档工具预检/逃生门/MUTE 路径）归档件无下游消费；S1（run dist5 moved 不重置 lastAct→答案级 30s 过早剧透，救援/窗家族）+S2（多卡 minGap 7-17px 误触风险：107 题 0 实证误触、CSS gap 14px 与实测 7px 差异根因未明=布局测量口径待核，UI 布局族）。
- **真机观察项**：N2（right 后 5.4s 演出窗吞点无反馈）/N3（seq3 第 4 候选补足格 0 吸引（n=6），双陷阱有效）。
