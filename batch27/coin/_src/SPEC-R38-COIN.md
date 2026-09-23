# SPEC-R38-COIN — coin 硬币认钱 难度加深（AUDIT-67 段序 12 🟡 会话 819s）

对象：batch27/coin/（r38 Executor 版，谱刷新声明见 §R8）
基线：md5 c98638f8（VERIFY 56/56 双视口 0 pageerror；谱=coin54/bill67/combo46(仅3面)/sameval33）

---

## R0 目标与验收铁律

**审计原文**：「认面额偏易；组合仅封闭 3 组两枚封顶，组合域过窄」；建议「组合域开放式(3-4枚、多解)、加找零/比价、ch4最少几枚策略题」。

**三维度消化判断**（宁难勿易，b27 段标称 6-7 岁幼小衔接）：

| 建议 | 裁决 | 论证 |
| --- | --- | --- |
| 组合域开放式 3-4 枚 | **承接（核心）** | 基线 46 道 combo 仅 3 个固定答案+固定'1角'干扰——2-3 题后可背答案，是「组合域过窄」实锤。改为算法生成 2-4 枚硬币多重集（角值求和），答案域 22 个不同和值、干扰按 ±1/±5/±10 角近值生成，逐题心算不可背 |
| 多解 | **降维承接** | 同一和值可由不同多重集到达（如 10 角=5+5=10、20 角=10+10=5×4 界内）——开放生成天然含「多解」教学；但**候选内多正确答案**（一题两个对卡）会破坏单答案点选判定族与 engTapOpt 契约，不做（r25 M2：判定层保持单步点选） |
| 找零 | **承接（两档）** | 元级（付 5 元买 3/4 元物→找 2/1 元，5 以内减法=幼小衔接正段）入 ch2 应用层；角级（付 1 元买 3-9 角物→找 1-7 角，跨元角位值=10 以内减法+进率应用）入 ch4 深水区 |
| 比价 | **不承接（降维）** | 比大小已有专款（batch6 compare、b36 quickcmp）覆盖，coin 段核心=人民币认知+角元进率；比价不练进率、练序数——边际价值低于找零，且同屏两价签候选与现有 4 卡布局冲突。登记为不采纳项 |
| ch4 最少几枚策略题 | **承接** | 贪心最少枚（1 元>5 角>1 角典型币系，贪心=最优）：候选=1/2/3/4 枚封闭四卡，答案=目标面额贪心分解——真策略题（构造而非辨认），入 ch4 混合 |
| 认面额偏易 | **承接（反向题）** | ch1 加 rev 反向题（文字→钱币图，卡去文字标签防识字泄漏）：「哪个是一元硬币」候选=3 硬币图+1 元纸币图（同值异类陷阱）——银白近对+硬币纸币类辨析双负荷；ch2 纸币 fwd 加数字同近对币文干扰（1元纸币题混'1角'、5元题混'5角'） |

**验收铁律**：build 双跑幂等 md5 / ?verify=1 全绿 / _selftest 全绿 / verify_one 适配版归档 _src/（禁整替主线）/ 谱 baseline-post 对照+锚面保留清单 / 判定层恒单步点选（无多步状态机新增面）/ 新句逐条朗读检查无叠字无语病（词族互查）/ 键文案拼接与在册词族零叠字。

---

## R1 设计总纲

七题型（kind 族；前四=基线继承，后三+r 为 r38 新增）：

| kind | 题面 | 候选 4 卡 | 答案 | 章 |
| --- | --- | --- | --- | --- |
| coin | 钱币大图 130px | 3 硬币面额文字+1 纸币面额文字（5元/10元/20元） | 面额文字 | ch1/ch4 |
| bill | 纸币大图 170px | 纸币面额文字（answer+2 纸币+1 币文近对：yuan1p↔'1角'/yuan5↔'5角'/yuan10·yuan20↔第 4 纸币文） | 面额文字 | ch2/ch4 |
| **rev**（新） | 目标面额大字牌（如'1元'） | 3 硬币图+1元纸币图（钱币卡**去 m-label**，防识字泄漏） | face 钱币图 | ch1/ch4 |
| sameval | 钱币大图 | 答案同值对方+jiao1+2 随机干扰（钱币图带标签） | 同值对方 | ch3/ch4 |
| **combo**（开放化） | 2-4 枚硬币并排（大→小） | 和值文字+3 近值文字（±1/±5/±10） | sumText | ch3/ch4 |
| **chg**（新） | 物品图+价签+付出的纸币 | 找零额文字+3 近值文字（±1/±2/±5/±10，≥1 个 |Δ|≤2） | 找零额文字 | ch2(元级)/ch4(角级) |
| **min**（新） | 目标面额大字牌 | '1枚/2枚/3枚/4枚'封闭四卡 | 贪心最少枚数 | ch4 |

- 章配置（CH_LEN=5、STATIC_LEVELS=20、flat≥20 生成关 dch=ri(1,4) 均不变）：
  - **ch1 认硬币**：题式=[coin,rev,coin,rev,coin]，硬币轮换 COIN3[(s0+qi)%3]；flat0 题0 恒 coin/yuan1（教学演示锚，**保留**）。
  - **ch2 纸币和买东西**：3 bill（BILL4 轮换取 3）+2 chg 元级（绘本 3 元/积木 4 元各一，付 5 元）。
  - **ch3 一样多和数一数**：2 sameval（yuan1/yuan1p 双向各一）+3 combo（关内多重集互异、和值互异、≥1 题 3-4 枚、含 1 题遗留封闭组合三选一）。
  - **ch4 算钱大挑战**：3 难题（sameval/combo/chg/min，≥1 ∈ {chg,min}）+2 易题（coin/bill/rev），洗牌序。
- 判定层：engTapOpt 单步点选原样（新 kind 全部=「点 1 张卡判对错」，无多步状态机）；星级/防重入/救援双锚/错反馈链结构全部继承。
- 相邻题 face 互异（跨题型查，face 口径：钱币 id / chg=物品 id / min='m'+角值 / combo='k'+角值降序串，遗留多重集=遗留 id）。

## R2 难度谱（钩子契约）

CO.quiz 扩展字段（向后兼容：kind/face/opts/answer/step/miss 原样）：
- combo：`coins`（钱币 id 数组，展示序大→小）
- chg：`item`（物品 id）、`price`（角）、`pay`（'yuan1p'|'yuan5'）
- min：`target`（角值）
- rev：`face`=硬币 id

## R3 生成律

- 种子=mulberry32(flat*7919+13)（不变）；生成关先取 dch=ri(1,4) 再生成题序（b25 坑④）。
- combo 开放：枚数 n=ri(2,4)；逐枚从 COIN3 掷（重掷 ≤8 次满足：关内多重集互异+和值互异+深水约束）；coins 按角值降序展示。遗留三组（[10,5]/[5,5]/[10,10]）命中时 face=遗留 id（走册内整句 clip 快径），否则 face='k'+角值串。
- chg：物品表 ITEMS（6 项，价签固定）：soda 汽水 6 角/candy 棒棒糖 8 角/sticker 贴纸 9 角/balloon 气球 3 角（付 1 元=10 角）；book 绘本 3 元(30)/blocks 积木 4 元(40)（付 5 元=50 角）。找零=pay−price。ch2 用 book/blocks，ch4 用 4 角级物品。
- min：目标 target ∈ {1..40 角} 剔贪心>4 枚值共 16 个 {9,14,18,19,23,24,27,28,29,32,33,34,36,37,38,39}（实现=for 1..40 if greedy(v)≤4 收录，域 24 值——r38 M3 勘正：原文 7 值剔除集为笔误，与自述规则「贪心>4 剔出」矛盾）；greedy(v)=⌊v/10⌋+⌊v%10/5⌋+v%5；关内多题 min 答案互异。
- 干扰生成（combo/chg 通用）：近值池 {a−10,a−5,a−1,a+1,a+5,a+10}（chg 再含 ±2）∩ 有效(>0)；恰取 3=钉 1 个小 |Δ|（combo ≤5/chg ≤2，近对必在）+2 补位（大 |Δ| 优先、不足回补小 |Δ|——pool 恒 ≥3：combo 域最小 a=2 池 4 个、chg 域最小 a=1 池 4 个，均核），全互异且 ≠答案（r34 ⑲ 属性断言；r38 自测坑：小 a 时池多数落 smallMax 内，纯「大 Δ 补位」会不足 3）。
- 文字域：sumText(v)=阿拉伯数字+元/角（'4角'/'1元5角'/'2元6角'，与 T8 及遗留组合口径一致）；textJiao 改为解析式（弃封闭 8 表）。

## R4 UI/语音/时序

- 场景：rev/min=大字牌 .tag-card；chg=.chg-wrap（物品 SVG+价签+付出纸币 150px）；combo 2/3/4 枚硬币 100/88/78px。卡排：rev=钱币图卡（无标签 .bare）；chg/min/combo=文字卡。
- **语音段链**（T46 在册键直接接 + 新键 39 条，见 §R6；全部走 KIDS.voice.queue 段链或单键 play，段间 150ms）：
  - coin/bill 读题=coi_q（册内）；rev 读题=coi_q_r1/r5/r10（新，整句）；sameval=coi_q2（册内）；combo 遗留=coi_say_c_*（册内整句快径）、开放=[coi_n1|coi_n5|coi_n10]×枚数+coi_q_sum；chg=[coi_it_<item>, coi_q_pay1|coi_q_pay5, coi_q_chg]；min=[coi_q_min0, …目标值段, coi_q_min1]。
  - 确认句（判对）：coin/bill/rev=coi_cf_<face>（册内）；sameval=coi_cf_sv_1/2（册内）；combo 遗留=coi_cf_c_*（册内）；combo 开放=[coi_v_gt, …值段]；chg=[coi_cf_chg, …值段]；min=coi_cf_min1..4（新单键）。
  - 值段词族：coi_v_y1..y4（一元/两元/三元/四元）+coi_v_j1..j8（一角..八角，j2=两角）；枚数段 coi_n1/n5/n10（一枚一角/一枚五角/一枚一元）。
  - 错反馈链 [coi_wrong, 引导键] 不变：combo/chg=comboHi/comboLo（复用）；min=coi_g_minhi/minlo（新）；rev 近对错=silver/color/kind（coi_g_kind 新：题面要硬币点了纸币→「要找圆圆的硬币哦」）。
- **时序窗（实长口径，r35 M-1 双核）**：在册 30 条 clip 浏览器实测（r38-clip-ms-baseline.json）：确认句最长 coi_cf_sv_1/2=3408、题面最长 coi_say_c_yj_j=4320、引导最长 coi_g_silver=4104（estMs(15字)=5775 上界罩住）。
  - 判对演出窗 **1800+3600=5400 不变**：新确认链全部 ≤5100——[v_gt,v_y,v_j] chainEst=estMs(3)+estMs(2)+estMs(2)+2×150=4515（estMs(n)=n×345+600 全字符口径，段级求和+150×段隙=链上界，册内键用实测值取 max）；[coi_cf_chg,v_j]≈2730；coi_cf_min*≤estMs(5)=2325；遗留整句≤3408+300=3708。
  - 错链豁免 wrongChainUntil=9200 不变：2568+150+max(引导实长 4104, estMs(silver15)=5775)+300=8793 ≤ 9200 ✓（新引导 ≤8字 estMs=3360 不破界）。
  - 读题不锁输入；combo 4 枚读题链 chainEst≈1980×4+2670+4×150=11090（救援 14s 节流窗内自然播完）。
  - **§R6 键未注册期（本交付态）**：queue 缺 clip=整句静默放弃（core 语义），游戏可玩、断言走 __lastQueue 键序——主线注册后即有声；判对窗仍 5400（确认链段级 estMs 上界已罩）。
- 救援双锚 14s/30s、面板遮挡守卫、错点防重入 1000ms、吞输入 bump、三件门——全部继承不动。

## R5 三方适配

- game-verify.js：SPEC 表独立重列扩（ITEMS/MIN 贪心/值段词族/和值独立复算 sumText）；40 关全量审计+七 kind 结构断言+近对必在（combo |Δ|≤5、chg |Δ|≤2、rev 四币全在场）+ch 构成律+键链纯函数直调断言（r37 M1）+clips 33 条断言（过渡态）。
- verify_one 适配版= _src/verify_one_coin_r38.py（T1-T11 新谱口径；主线收编参考，禁整替主线 verify_batch27.py 前先对齐）。
- _selftest.py= _src/_selftest.py（新建，emo 范式）：verify 复跑/Python 独立封闭集审计/钩子语义/键链直调/双视口四 kind 冒烟/真实页主流程+写档/语音链 spy/重入矩阵（r30）/MUTE 双保险（r19）。
- build.py：新断言（七 kind 在场/GUIDE 11 键/新确认链 estMs 界/clips 33 过渡态+注册后 72 注释）。

## R6 新语音键 TODO 清单（39 条，主线注册；本交付不注册）

gen_clips.py coin 段追加块（T46 直排；MONEY 提取 assert==7 与 COMBOS 段提取不受影响——新表无 `n:'…',kind:'…',jiao:` 与 `say:'…',confirm:'…'` 模式，且置于 COMBO_IDS 之后）：

| 键 | 文案 | 用途 | 拼接示例 |
| --- | --- | --- | --- |
| coi_n1 | 一枚一角 | combo 枚数段 | [coi_n10,coi_n5,coi_n1,coi_q_sum]（1元+5角+1角题） |
| coi_n5 | 一枚五角 | 同上 | 同上 |
| coi_n10 | 一枚一元 | 同上 | 同上 |
| coi_q_sum | 一共是多少钱 | combo 开放读题尾段 | 同上 |
| coi_v_gt | 一共是 | combo 开放确认首段 | [coi_v_gt,coi_v_y1,coi_v_j6]（和 16 角） |
| coi_v_y1 | 一元 | 值段 | 同上 |
| coi_v_y2 | 两元 | 值段 | [coi_v_gt,coi_v_y2]（和 20 角） |
| coi_v_y3 | 三元 | 值段 | min 题 [coi_q_min0,coi_v_y3,coi_q_min1] |
| coi_v_y4 | 四元 | 值段 | [coi_v_gt,coi_v_y4]（和 40 角） |
| coi_v_j1 | 一角 | 值段 | [coi_cf_chg,coi_v_j1]（找 1 角） |
| coi_v_j2 | 两角 | 值段 | 同上类 |
| coi_v_j3 | 三角 | 值段 | 同上类 |
| coi_v_j4 | 四角 | 值段 | [coi_cf_chg,coi_v_j4]（汽水 6 角找零） |
| coi_v_j5 | 五角 | 值段 | [coi_v_gt,coi_v_y1,coi_v_j5]（和 15 角） |
| coi_v_j6 | 六角 | 值段 | 同上类 |
| coi_v_j7 | 七角 | 值段 | [coi_cf_chg,coi_v_j7]（气球 3 角找零） |
| coi_v_j8 | 八角 | 值段 | 值域补全（和 8 角） |
| coi_q_r1 | 哪个是一角硬币 | rev 读题（整句） | 单键 |
| coi_q_r5 | 哪个是五角硬币 | 同上 | 单键 |
| coi_q_r10 | 哪个是一元硬币 | 同上 | 单键 |
| coi_it_soda | 汽水，六角 | chg 物品段 | [coi_it_soda,coi_q_pay1,coi_q_chg] |
| coi_it_candy | 棒棒糖，八角 | 同上 | 同上 |
| coi_it_sticker | 贴纸，九角 | 同上 | 同上 |
| coi_it_balloon | 气球，三角 | 同上 | 同上 |
| coi_it_book | 绘本，三元 | 同上（元级） | [coi_it_book,coi_q_pay5,coi_q_chg] |
| coi_it_blocks | 积木，四元 | 同上（元级） | 同上 |
| coi_q_pay1 | 付了一元 | chg 读题中段 | 见上 |
| coi_q_pay5 | 付了五元 | 同上 | 见上 |
| coi_q_chg | 应该找回多少钱 | chg 读题尾段 | 见上 |
| coi_cf_chg | 找回 | chg 确认首段 | [coi_cf_chg,coi_v_j4] |
| coi_q_min0 | 要付 | min 读题首段 | [coi_q_min0,coi_v_y1,coi_v_j5,coi_q_min1]（1元5角） |
| coi_q_min1 | 最少用几枚硬币 | min 读题尾段 | 见上 |
| coi_cf_min1 | 一枚就够了 | min 确认（答案 1 枚） | 单键 |
| coi_cf_min2 | 两枚就够了 | min 确认（2 枚） | 单键 |
| coi_cf_min3 | 三枚就够了 | min 确认（3 枚） | 单键 |
| coi_cf_min4 | 四枚，正好用完 | min 确认（4 枚） | 单键 |
| coi_g_minhi | 硬币不用那么多哦 | min 错引导（点多了） | [coi_wrong,coi_g_minhi] |
| coi_g_minlo | 还不够哦，再想一想 | min 错引导（点少了） | [coi_wrong,coi_g_minlo] |
| coi_g_kind | 要找圆圆的硬币哦 | rev 错引导（点纸币） | [coi_wrong,coi_g_kind] |

叠字互查（r34 M1 词族面）：段间拼接逐条朗读检查——'一共是'+'一元'='一共是一元'✓；'要付'+'五角'+'最少用几枚硬币'✓；'付了一元'+'应该找回多少钱'✓；'找回'+'四角'✓；'汽水，六角'+'付了一元'✓；枚数段连读'一枚一元一枚五角'与遗留整句同构✓；无「X号」「是是」型叠字。

**注册后联动**（主线）：manifest 5243→5282（+39；全库键数为**时点快照**，随后续轮次注册增长——r38 审查时点 5291（含 r39 notebird 9 键），2026-09-23 实测 5517；coin 段 69 键稳定不受影响，r38 M4 勘正）；inject 后 clips 33→72 条（coi 69+core 3）；build.py `n_clips == 33`→`72`、verify ⑨ `keys.length === 33`→`72`、filter 24→32（^(coi_cf_|coi_say_|coi_g_) 或 coi_q2：+coi_cf_chg/coi_cf_min1-4 共 5+coi_g_kind/minhi/minlo 共 3=8；已对 manifest 实测核：39 键零碰撞零重复）。COI_CLIP_MS 表回填 39 行实测（r37-bis 段二范式）后 verify ⑪-style 对账。

## R7 计数断言四层联动面（r18/r34）

grep 全款 `== N` 类计数清单（改动面）：
1. build.py：`n_clips == 33`（→主线 72）；GUIDE `len(gtexts) == 8`→**11**（+kind/minhi/minlo）；新增：七 kind 构造在场断言。
2. game-verify.js：⑨ `keys.length === 33`+filter `=== 24`（过渡态；主线→72/32）；ch3 聚合断言改新律（2 sameval+3 combo）；新增 kind 覆盖计数（40 关内七 kind 全现）。
3. _selftest/verify_one：独立表计数（ITEMS=6、v 词族 12、贪心域 24 值、和值域 22）。
4. head/渲染：无计数。

## R8 基线与验收

- 基线：md5 c98638f8；VERIFY 56/56；谱 r38-baseline.json（coin54/bill67/combo46 仅 3 面/sameval33）；clip 实长表 r38-clip-ms-baseline.json（30 条全测）。
- **谱刷新声明（r28/r32）**：本轮为**全域谱刷新**——flat0-19 静态四章构成律全部更新（ch1 加 rev、ch2 加 chg 元级、ch3 combo 开放化、ch4 加 chg 角级+min），生成关同律；flat0 题0=coin/yuan1 教学锚**逐字节保留**；遗留三组合仍恒在 ch3 轮换（coi_say_c_*/coi_cf_c_* 在册键持续使用）；sameval 双向每关各一保留。
- 锚面保留清单：flat0q0 coin/yuan1；coi_tut_watch/turn 教学链结构；救援双锚数值（14s/30s）；wrongChainUntil=9200；判对窗 5400；错点防重入 1000ms；星级 0/1-2/≥3→3/2/1。
- 验收：build 双跑幂等 md5 + ?verify=1 全绿 + _selftest 全绿 + verify_one_coin_r38 全绿 + 谱 post 投影对照（新 kind 计数+构成律+锚面核验）。
- **验收实测（r38 交付态）**：md5 e038bf222724c80bc9cabd57a4427782（双跑一致，858292 chars）；VERIFY 57/57+layoutOk；_selftest 31/31；verify_one 11/11；谱 post（40 关 200 题）：coin31/bill43/rev21/sameval27/combo38/chg30/min10，combo 面 3→20，flat0q0=coin/yuan1 保留，opts≠4 计 0，dch1-4 全现。
- **终态 md5 回写（r38 M5 勘正；主线注册 39 键 72 clips 后维护轮 2026-09-23）**：注册后终版 f9be3cae（72 clips）→M8 兜底+M1-M7 勘正轮终版 **6b41ccfb6872036994ecd1883a533882**（1436228 chars，双跑幂等；VERIFY 57/57×2 视口 0 pageerror/_selftest 31/31/verify_one 11/11×2/gate 3/3 G3 n=72/谱 40 关逐字节零变化——min 互异兜底零触发）。
- 风险与未验证项：新键 39 条未注册（过渡态静默——主线注册后需回填 COI_CLIP_MS 实测+复跑全门禁，r37-bis 段二范式）；新句真机童声听感未验（文案已逐条朗读检查）；min 4 枚题答案卡'4枚'与 3 枚组合的辨别难度未真机观察。

## R9 教训回应

- r37 键设计先核实现：段链走 KIDS.voice.queue（core L95-110 已核：段间 150ms、缺 clip 整句放弃不炸）；键构造函数 quizPartsOf/confirmPartsOf/guideKeyFor 入 _selftest+verify 纯函数直调断言（期望链从本 SPEC §R6 推导硬编码）。
- r35 M-1 时序实长：30 条在册 clip 浏览器实测+estMs 段级上界双核（§R4）；禁只用估算。
- r31 断言判别力：verify/_selftest 期望值全部从 SPEC 表独立重列推导（贪心/和值/找零均独立复算），非实现镜像。
- r30 重入矩阵：_selftest 窗内二击 false+窗后重选 right 两腿；locked/demo 吞输入门=verify ⑫；救援让路=契约 I 源码断言+build 静态断言。
- r34 M1 叠字：§R6 表逐条拼接互查；F1 门族：新 kind 无新门（三件门继承）。
- r19 测试静音：_selftest MUTE init+正常模式腿种档三关闭。
- r33 flat 区间：CH_LEN=5/STATIC=20 真值口径（flat0-19 静态、≥20 生成）。
- r25 M2：判定层单步点选，无多步状态机新增面。
