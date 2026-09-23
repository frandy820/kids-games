# SPEC-R21-COLORMIX · 颜色魔法难度加深增补（r21，2026-09-20）

依据：AUDIT-56 行33 黄款判定「混色公式5条背完即无敌，因果探索结构好」实测 44s/关；
行95 建议方向「配方反推（给混出的色选配方）、三色组合扩表、深浅两档判定」。
校准：b22 段标称 5-6 岁，宁难勿易（5.5-6.5 幼小衔接）。本文件为 SPEC-BATCH22 §3+§0.51 的
r21 修订版，与其冲突处以本文件为准；§0 共同门禁全部继续适用。

## §R1 改造总纲

保留「点罐入缸自动判定」玩法骨架与教学链（flat0 watch→帮→独、演示调绿特例全不动），
消除「5 条公式背完即全解」：三个新认知维度分章爬升——
**深浅两档判定**（辨目标卡深浅选配方长度：浅X vs X/橙——视觉判别+公式回忆复合）、
**三步组合配方**（浅二级色=二级色配方再加白——组合规划：想完"黄+蓝"还要想到"+白"）、
**配方反推**（给缸中已混出的色选配方罐组——逆向映射：结果→原因，全新作答面）。
现状认知上限=5 条公式正推回忆；改造后须辨深浅、做两步规划、逆向反推，公式不再是
「目标→罐序」一张查找表。

审计三建议采纳方式：
- **配方反推（行95①）**：采纳，落 dch4 全章（含生成关 dch4 腿）。新作答面=配方卡
  （点罐组而非入缸）；干扰设计成「深浅对+换一罐」两族（见 §R4）。
- **三色组合扩表（行95②）**：改造采纳。字面的"比例/重复色三色组合"不做——§0.51
  定版禁比例禁减色，且重复球在集合语义下无判别力（same 不判）。取其认知内核
  「组合深度+1」：扩 3 条无比例传递公式 白+黄+蓝=浅绿 / 白+红+黄=浅橙 / 白+红+蓝=浅紫
  （=「二级色再加白」的自然延伸，规则与"白+原色=浅"同构可迁移），配方长度 2→3 步。
- **深浅两档判定（行95③）**：采纳但不单独成章——纯辨别无作答深度，独立成章维度不足。
  融合两处：dch2 目标域混入浅原色（须辨「浅红=粉」vs「橙=红+黄」这类同暖浅色陷阱对，
  配方完全不同）；dch4 反推干扰固定含深浅对（绿↔浅绿互为干扰，选配方先辨深浅）。

## §R2 难度章型表（章号/CH_LEN=5/STATIC_LEVELS=20/档键 'ch-lv' 全不动）

| 难度章 | 章名 | 型 | jars | 目标域（5 题构成） | 配方深 | 新认知维度 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 魔法初现（教学） | 原色直击 | 红黄蓝 | 原色池采样（flat0 题0 恒 green 特例不动） | 1 步 | 基线（原样保留，教学骨架不动） |
| 2 深浅魔法 | 二级+浅原色 | 红黄蓝白 | **恰 2 二级（橙绿紫）+ 3 浅原色（浅红浅黄浅蓝）**，洗牌 | 1-2 步 | 深浅两档判定（辨卡选配方长度）+公式回忆 |
| 3 三色秘密 | 棕+浅二级 | 红黄蓝白 | **恰 2 棕 + 3 浅二级（浅橙浅绿浅紫）**，洗牌防棕棕相邻 | 2-3 步 | 三步组合配方（二级配方再加白） |
| 4 配方大师 | **配方反推** | 红黄蓝白（卡上罐） | 反推池=[橙绿紫棕浅红浅黄浅蓝浅橙浅绿浅紫] 采样相邻不同 | — | 逆向映射（结果→配方）+干扰辨别 |

- 生成关（flat≥20）按 (ch-1)%4+1 循环取材不变：ch5/9/..=dch1、ch6/10/..=dch2、
  ch7/11/..=dch3、ch8/12/..=dch4（反推）。
- POT_DEPTH=3 不动：三步配方恰占满缸（第 3 罐齐集判对，FIFO 不截断）；残留球场景
  可 FIFO 自愈（[R,Y,B] 残留时点 W 换出 R → [Y,B,W]=浅绿 仍可判对）。
- dch2 恰 2+3 结构性无相邻同目标（二级 2 个互异、浅 3 个互异，跨组 id 必异）；
  dch3 承「恰 2 棕」guard 洗牌+交错兜底范式；dch4 承池采样+重摇范式。

## §R3 混色表扩定（§0.51 r21 修订——三方同步红线）

MIX 表新增 3 条（传递组合律：混出二级色再加白=其浅版）：

| 集合 | 结果 |
| --- | --- |
| {白,黄,蓝} | 浅绿 lightgreen |
| {白,红,黄} | 浅橙 lightorange |
| {白,红,蓝} | 浅紫 lightpurple |

- 色板新增 3 色：lightorange #F7BC8A / lightgreen #A8D8B0 / lightpurple #C4A8E3
  （INK 深描边保对比度，同既有浅色系做法）。
- **mud 域收缩声明**：扩表后缸深 3 内全部可达集合（单色/白+单原色/两原色/三原色/
  白+两原色）均有定义，mud 不再可达。mud 保留在色板（反推干扰配方的语义描述位），
  探索≠错的反馈路径不变（wrong=「？」泡+col_wrong+缸不清空）。原「白+两色以上=mud」
  条款由本节取代；`白+三原色`（4 色集合）缸深 3 不可达，集合口径兜底=mud 不变。
- PAR 新增：浅橙/浅绿/浅紫=2（同棕：任何顺序前两步必非完整三色集，第 3 步才齐）。
- RECIPE 新增：lightorange=[红,黄,白] / lightgreen=[黄,蓝,白] / lightpurple=[红,蓝,白]。
- **三方口径同步**：本节规则必须 SPEC（本文件）/ JS（MIX 表）/ verify_one_colormix.py
  `mix()` / _selftest.py `py_mix()` / game-verify.js `specMix()` 五处同源同步，缺一即
  独立复验红。

## §R4 配方反推机制（dch4）

- **题面**：缸中液体=目标色（pot 恒空——展示「已混出的色」不泄露配方），目标色大卡
  同色双表征照常；语音「这个颜色是怎么调出来的呀」（col_rev_q）。
- **作答面**：罐区渲染 3 张配方卡（.recipick，≥64 触摸目标），每卡=2-3 个小颜料罐
  （jarSvg 缩样）并排；点卡即作答（无提交）。
- **干扰两族**（确定性 seeded 生成，正确卡恰 1）：
  - 深浅对：目标=二级色→干扰=其浅版配方（+[白]）；目标=浅色（浅X）→干扰=其深版配方
    （去[白]）；目标=棕→无深浅对（4 色不可表达），退化双换罐。
  - 换一罐：正确配方随机一位换成不在配方中的罐（红黄蓝白池）。MIX 在可达域内是
    集合→结果的双射，集合异⇒结果异，结构性保证干扰混出≠目标。
- **判定**：engPickRecipe(L,i)——选卡混算 engMix(卡罐组)==目标 → right/done 推进；
  ≠目标=1 试调（tries++/missTotal++，卡 wiggle+col_wrong，**不换题可重选**——探索≠错
  精神延续）；重复点同卡='same' 不判不罚（承 same 语义）。
- **反推 par=1**（收官定夺 0→1，2026-09-20）：engPar 对 mode='reverse' 题计 1——容一次
  探索性错选（6 岁人设实测 2/5 题首错，par=0 下 2★ 常态化 3★ 稀缺；审查 m1+试玩 P2-1
  双证据。认知难度本体在反推维度本身，不在星级卡死；与 ch1 豁免先例/ch2 par=1 同级）；
  星级分档不变（miss≤par 3★ / ≤par+CH_LEN 2★ / else 1★，永不 0 星全款不变）。dch1 恒 3★ 不动。
- **首次反推视觉预告**（每存档一次，sv.colormix.revSeen）：3 卡次第 bounce 一遍
  （视觉预告可点，不指示正确答案——承 r20 数字钮次第高亮范式）+正常读题面。
  无专门教学关（flat15 是中途关，不设 watch 演示替答）；14s 救援=重读题面+目标卡脉冲
  （反推题读 col_rev_q）。
- 正推通道守卫：反推题点罐（CM.tapJar）=false 吞输入+罐排容器 bump；正推题点配方卡
  不存在（罐区不渲染卡）。

## §R5 引擎与钩子（game-core/game-main，向后兼容）

- genLevel：dch2/dch3/dch4 分支按 §R2 域重写；dch1 原样（flat0 题0=green 特例不动）。
  mkRevQuiz 产物：{target, mode:'reverse', picks:[[罐]×3], picked:-1, tries:0, solved:false,
  pot:[], result:target}（result=缸中展示色恒=目标）。
- engPickRecipe(L,i)（新）：仅反推态受理；返回 'same'/'wrong'/'right'/'done'/null 语义
  与 engTapJar 对齐。engTapJar 对反推题返回 null。
- engPar：反推题计 1（见 §R4 收官定夺）；engStars 分档逻辑不动。
- structWhy 扩展（单题函数，检题级域）：dch2 题域（目标∈池+jars 4 罐）/ dch3 题域（目标∈池+
  jars 4 罐）/ dch4 反推结构（mode/picks 恰 3/正确恰 1/干扰 mix≠目标/相邻不同）。
  **关级构成断言（恰 2+3 / 恰 2 棕）不在 structWhy（物理上查不了关级聚合）——在
  game-verify ①dist 聚合单元：brownPerLv（ch3 恒 2 棕）+secPerLv（ch2 恒 2 二级，审查 m2 收官补）**。
- **CM 钩子**（gate G2 教学链断言不能断）：CM.pickRecipe(i)（新，反推作答入口）；
  CM.quiz 增 mode（'mix' 默认/正推字段全保留向后兼容）与 picks（反推时=罐组拷贝），
  反推时 jars=[]；CM.autoSolve 驱动反推题=选正确卡；CM.tapJar 反推题=false。
  window.__cmDemoR 与 flat0 教学链零改动。

## §R6 语音键账（23 既有注入全不变照用；新增 4 键上报主线 gen_clips 中央登记）

| key | text | 用途 |
| --- | --- | --- |
| col_q_lightorange | 调出浅橙色吧 | 浅橙题面（新） |
| col_q_lightgreen | 调出浅绿色吧 | 浅绿题面（新） |
| col_q_lightpurple | 调出浅紫色吧 | 浅紫题面（新） |
| col_rev_q | 这个颜色是怎么调出来的呀 | 反推题面/救援重读（新） |

既有 23 条（col_ 20 + core 3）全照用：题面 col_q_×10（浅红/浅黄/浅蓝题面 T46 已建）、
颜料名 col_paint_×4、教学 col_tut_watch/turn、col_hint/col_right/col_wrong/col_green。
反推答错复用 col_wrong、答对复用 col_right（不新建）。注册前新键由 KIDS.voice.play
(key,text) 文本自愈（core 契约），无害。
build.py clips 断言改子集式：「23 必备键精确在册 + 总数 ≥23」（主线注册 4 新键后 27 亦过，
防注册前后断言漂移——r20 范式）；game-verify ⑪ 同步子集式。

## §R7 存档与迁移

**无档结构变化，无迁移 IIFE 需求**：档键 'ch-lv'（keyOf）、CH_LEN=5、STATIC_LEVELS=20、
日历语义、sv.colormix.tutSeen 全不动。新增运行态子键 sv.colormix.revSeen（首次反推
视觉预告一次性标记）：旧档无此键=falsy=首次反推再触发一次，无害幂等。难度章内容
变化只影响未玩关的生成内容（难度改造目的本身）；已通关记录与新代码无矛盾态
（r20 同款声明）。运行态新字段（mode/picks/picked）每关由 genLevel 重建，不落存档。

## §R8 verify 适配（四层联动清单，grep `== N` 逐处同步）

- **build.py**：`n_clips == 23` → `>= 23`（子集式，§R6）；COL_KEYS 保持 23 必备精确。
- **game-verify.js**：头注⑨ flat12/dch3 漂移顺手修（实为 flat7/dch2）；①直驱分支处理
  反推题（engPickRecipe 按 picks 中 mix==target 索引）；②specMix 加浅二级规则（白+两
  原色=浅二级）；⑨冒烟 B flat7 适配 dch2 新域（4 罐必有非配方罐，逻辑不变）；
  ⑩布局 flat35 量 .jar/.recipick（反推卡 ≥64）；⑪clips `keys.length === 23` →
  `>= 23` 子集式；新增 ⑭反推题单元（选项结构/same/wrong 不换题/pickRecipe 推进/
  tapJar 反推守卫）⑮首次反推视觉预告单元（tease 类在场——verify 页不写档，
  revSeen 一次性写档语义由 _selftest 6b 正常模式种档断言覆盖，审查 m3 收官补）——
  total 53→**55**。
- **_selftest.py**：py_mix 加浅二级规则（三方红线）；新增 MUTE 静音双保险
  （r19 教训：speechSynthesis no-op+Audio.play 派发 ended+种档 sound:false，每页面
  goto 前挂 init_script——含正常模式 pg2）；第 4 部分 CM.start 反推关驱动对账；
  第 5 部分 flat35 量测 selector 加 .recipick；**6b revSeen 种档断言（审查 m3 收官补：
  种 revSeen:true → flat15 反推关 50ms 轮询 1.2s 无 .tease）**。
- **verify_one_colormix.py**：新增 MUTE 块（同上）；C1 章域（ch2 目标域+关级构成聚合
  （Python 侧）/ch3 棕数==2/ch4 反推域：mode+picks 恰 3+正确恰 1+干扰 mix≠目标——
  Python 侧独立复算。jars 4 罐检查由 JS structWhy 覆盖，不在 C1——审查 m2 归属修正）；
  C2 mix() 加浅二级规则（三方红线）；C4 驱动 mode 分支
  （反推=Python 推导正确索引 pickRecipe；PROBE 抽检反推答错不推进）；C7 GEN_HINTS
  关键词映射随新文案更新；best_seq 加浅二级三色。
  **r21 驱动节奏（renderer 稳定性，断言语义不变）**：①PROBE/C4c/FIFO 探测 tap 后留
  120ms（快连会被 busy 占位锁拦 → 误报）；②lv+quiz 合并单次 evaluate 轮询（60ms）；
  ③驱动循环无空转轮询（tap→poll→未推进继续 tap，right 演出窗由 tap 后 80ms 覆盖）——
  实测拆分 getter 高频+wrong 后 2.5s 空转轮询组合会把 headless renderer 搞崩
  （flat7/12/20 三点 Target crashed，页面侧 40 关 autoSolve 单 evaluate 全通+堆恒定
  10MB 证实游戏本体无泄漏，崩因纯在 CDP 交互密度）。
- **gate_common22.py / verify_batch22.py**：colormix 腿语义未变（G2 flat0 教学关 dch1
  无反推），零改动；G3 NCLIPS 传参由主线在注册 4 新键后自行更新 23→27（本文件声明）。

## §R9 验收数字口径（八门禁）

①build 双跑 md5 一致 ②VERIFY 双视口（1280×720 桌面+竖屏）全过 **55/55** ③_selftest
全绿 ④verify_one_colormix 全绿（C0-C7）⑤gate G3 n=23（注册前）/27（注册后，主线传参）
⑥新语音 4 键上报 ⑦本文件 ⑧0 pageerror+0 http。
