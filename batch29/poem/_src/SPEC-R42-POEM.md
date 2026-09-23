# SPEC-R42-POEM — 古诗跟读 r42 难度改造（黄款 · 两段制段一：游戏侧+新语音键集定稿）

对象：`batch29/poem/`（batch29 · 6-7 岁收尾段）。执行日 2026-09-21~22。
上游依据：AUDIT-67 L43/L78（poem 🟡「5 首全是一年级课文已背熟，接下句零挑战」→「库 5→12(半课外)、加乱序接龙与缺字填空双题型」）。
**禁动清单（已遵守）**：`voice/gen_clips.py` 未动（新键注册归主线）；manifest 未写；`design/core.js` 未动。

---

## §R0 目标与不变量

- 目标：诗库 5→12（半课外扩充）、新增 乱序接龙(order) 与 缺字填空(fill) 两题型、ch2+ 混出、生成关四型全现；6-7 岁收尾段宁难勿易。
- 不变量（零改动锚面）：
  - flat0 题0 恒 next/prevLine=0（咏鹅「鹅，鹅，鹅」→「曲项向天歌」——教学演示锚点，specSeqOf `flat===0` 分支）；
  - 前 5 诗 id 序与行文本逐字保留（与 gen_clips.py POEM29_LINES 现值交集对账，build.py 强断言）；
  - 存档 `kidsgame_poem` v1.0 结构与键名不变（levels/daily/settings；新题型不新增存档字段——retries/stars 口径沿用）；
  - mulberry32(flat\*7919+71) 确定性通道、每关 5 题、星级 0/1-2/≥3 错=3/2/1★ 永不 0 星、错点 1000ms 防重入窗。

## §R1 诗库 12 与冲突核对结论

| # | id | 诗 | 行文本 | 来源 |
|---|----|----|--------|------|
| 1-5 | yie/jys/cx/mn/dgjl | 咏鹅/静夜思/春晓/悯农/登鹳雀楼 | （原款逐字保留） | b29 §0.71 |
| 6 | yqesl | 一去二三里 | 一去二三里/烟村四五家/亭台六七座/八九十枝花 | r42 新增 |
| 7 | clg | 敕勒歌 | 敕勒川，阴山下/天似穹庐，笼盖四野/天苍苍，野茫茫/风吹草低见牛羊 | r42 新增 |
| 8 | yhs | 咏华山 | 只有天在上/更无山与齐/举头红日近/回首白云低 | r42 新增 |
| 9 | jsyz | 江上渔者 | 江上往来人/但爱鲈鱼美/君看一叶舟/出没风波里 | r42 新增 |
| 10 | dlyy | 登乐游原 | 向晚意不适/驱车登古原/夕阳无限好/只是近黄昏 | r42 新增 |
| 11 | lc | 鹿柴 | 空山不见人/但闻人语响/返景入深林/复照青苔上 | r42 新增 |
| 12 | xs | 相思 | 红豆生南国/春来发几枝/愿君多采撷/此物最相思 | r42 新增 |

**冲突核对结论（任务书「与 poemfill 库重叠 ≤2」）**：gen_clips.py 在册 poemfill 诗目 30 首（b17 期 10 + r13 期 20——勘误 2026-09-22：原误记 11+19，实查 gen_clips.py「诗库 10→30」r13 改造注记）与任务书例举诗目（咏柳/画/风/古朗月行/梅花——全部在 poemfill r13 增补内）逐一对撞；按 ≤2 上限从严执行，改选与 poemfill **零重叠** 的 7 首（蒙学+二年级课外，6-7 岁可上口）。重叠数 0 ≤ 2 ✓。副作用为正向：新诗=未学过，天然符合「半课外才有挑战」的审计动机。

## §R2 章谱（r42 定稿；b29 段 6-7 岁宁难勿易）

- 关-诗映射：`pid = POEM_IDS[flat % 12]`（前 5 序不变 → flat0-4 锚面=原款首5关逐字节同诗）。
- 静态 20 关 dch = 1+flat//5（不变）；生成关 flat≥20 dch = ri(1,4)（每关随机章参数，先取数保确定性）。
- 章型：
  - dch1 找下一句：全 next，2 候选（真值+1 干扰）——入门二选一（原款锚面）；
  - dch2 填一填：fill ≥2 + next(4 候选) ≥1 混出（0.5 coin + 保底 fill≥2/next≥1）；
  - dch3 排一排：order ≥2 + hear ≥2 混出（0.55/0.45 coin + 保底 order≥2/hear≥2）；
  - dch4 大挑战：四族各 ≥1（`['next','fill','order','hear', 掷]` 洗牌）；
  - 生成关：dch∈1-4 随机，四型全现（40 关聚合见 §R11）。
- 相邻题互异律（kind+行参数）：order 显式豁免（无行参数；同关两 order 乱序谱不同即体验互异）。
- 章末预告 CHAPTERS/GEN_HINTS 全新文案（含「填」「排」「挑战」关键词，verify ⑭ 硬编码对账）。

## §R3 生成规则（specSeqOf/buildQuiz；pycheck Python 逐字段复刻验证）

- next：prevLine∈[0,2]（末行无下一句），answer=prevLine+1；dch1 2 候选（真值+池内 1 干扰双洗牌），dch2+ 4 候选=池全集恒全摆（上行作干扰在场=b29 定版口径）。
- hear：audioLine∈[0,3]，answer=音频行，4 候选=池全集。
- fill：fillLine∈[0,3]，挖空位/真值/干扰取 FILLS 封闭表（§R4）；候选=真值+3 干扰洗牌（4 字卡），answer=真值卡下标。
- order：opts=4 句洗牌**恒非原序**（洗牌碰巧 [0,1,2,3] → 首两位对调兜底，0 rnd 消耗——r39-bis noSort 同构）；逐句即判（r25 M2 单步）：点对当前步句卡='step'（\_prog+1，第 4 步完成推进 right/done）/ 点错='wrong'（miss+1，**进度保留**）。
- 判定轴：`correctIdx(q)` 单步题=q.answer、order=当前步句卡动态下标（救援/教学帮指/autoSolve 共用）。

## §R4 FILLS 挖空封闭表（48 条 = 12 诗 × 4 行）

每行挖 1 实词字（名/动优先，非虚词），干扰 3 个（近形/近义，非句内字，互异）——盲猜命中 1/4 ≤ 1/3 ✓。

```
yie:   [0 鹅|鸡鸭雁] [4 歌|唱鸣叫] [2 浮|游漂沉] [2 拨|划推摇]
jys:   [3 月|日星灯] [4 霜|雪冰露] [2 望|看瞧观] [2 思|想念恋]
cx:    [1 眠|睡梦醒] [2 闻|听见有] [4 声|响音光] [1 落|开飘飞]
mn:    [0 锄|种耕割] [1 滴|流落洒] [4 餐|饭菜碗] [4 苦|甜酸辣]
dgjl:  [4 尽|落沉完] [3 海|湖江天] [1 穷|看望见] [1 上|下进回]
yqesl: [1 去|回来走] [4 家|户舍屋] [2 六|八九十] [3 枝|朵棵片]
clg:   [2 川|河原天] [7 野|山川地] [3 野|草原地] [5 牛|马驴犬]
yhs:   [2 天|日月山] [4 齐|平高远] [0 举|抬擎拿] [4 低|高远近]
jsyz:  [2 往|去过行] [3 鱼|虾蟹龟] [3 叶|艘只条] [0 出|入沉浮]
dlyy:  [1 晚|晨早夜] [2 登|上爬过] [0 夕|朝晨日] [3 黄|红金黑]
lc:    [1 山|林野谷] [4 响|声音歌] [3 深|密暗远] [2 青|绿蓝红]
xs:    [0 红|绿黄黑] [2 发|开长生] [3 采|摘拿收] [4 思|念想恋]
```

（[h 真值|干扰×3]，h=汉位·跳标点 0 基。）

**分布铁律（r39-bis ①）落地**：每诗位次 ≥3 种、全库 48 空位次 ≥6 种、位 0 ≤8（表值 distinct=7/hole0=6）；verify ⑱+pycheck P2-P4 运行时断言（40 关题级：挖空位 ≥5 种、位 0 占比 ≤30%、真值卡位 4 位各 ≥ceil(n/8)、order 恒非原序=0）。
三源对账：game-data FILLS ↔ game-verify SPEC_FILLS ↔ build.py/verify_batch29.py/`_r42_pycheck.py` 独立重列 + 行文本汉位互证（hanAt，零手抄源）。

## §R5 引擎/UI 适配

- game-core.js：specSeqOf 四族分支与保底、buildQuiz fill/order 分支、engTapOpt order 逐句即判、correctIdx 动态轴、structWhy 全重写（fillTruth/fillDisIn/orderSorted/order fullSet）。
- game-main.js：speakQuiz 四型读题链；fillLineHtml（挖空→`<span class="hole">?</span>`）；syncOrderSlots（槽区进度视觉）；uiTapOpt 'step' 分支（700\*SPEED 飞槽锁窗）；错反馈分流（next/order→poe_g_next「再读读上一行，找找接下来那句」——order 每步=找接下来那句，精确贴合 / hear/fill→poe_g_hear「再听一遍这一句」——fill 重听整句即听到挖空字音，**零新增引导键**）；pulseSceneDir 四型方向锚（fill=挖空句/order=槽区）；rescueTick 双豁免守卫；PM.quiz getter 扩 line/hole/prog 字段与 order 动态 answer。
- head.html：.fill-line/.hole/.ord-slots/.oslot(.filled)/.card.gone/fill 字卡大字等新 CSS + 竖屏适配（**卡 min-height 竖屏同律 96px**——首版误降 88 已修，真实竖屏视口 VERIFY 抓出）。

## §R6 verify 适配（59 断言单元全重写）

①40 关审计（四型+混出+引擎直驱 order 逐句）②SPEC 三表独立对账（SPEC_POEMS/SPEC_IDS/SPEC_FILLS 从本 SPEC 文字重列，不引用页面表）③章型聚合 ⑰关-诗映射 flat0-19 全表+三锚（flat5=yqesl/dch2、flat10=lc/dch3、flat15=mn/dch4）④tapOpt 原款锚面 ㉒fill 单元（挖空句 DOM 汉位互证+错链 poe_g_hear）㉓order 单元（乱序帧+step×3+错点进度保留+槽填充）⑨四型读题链 ⑧帧内容 ⑤教学 ≤16s ⑥吞输入 ⑦双冒烟（flat0 taps=5 恒 3★；flat10 1错→2★、taps=Σ(order?4:1) 独立复算）⑩布局双视口×3 flat（卡 ≥96/配画 ≥120/槽 ≥40/对比度/overflowX≤0）⑪clips 过渡态 32 ⑫星级 ⑬契约+I42（orderChainUntil 三处）⑭预告关键词 ⑮estWin ⑯SPEED ⑱分布断言。
修错记录：⑧原「ordFull」判据写反（拿原序比排序序）→ 改判「排序后恰 0123」全集；⑧frames hear 段原假设 flat10 首题=hear（实为 order）→ 改 driveToKind(10,'hear')。

## §R7 build.py 对账链

交集行表对账（旧 5==POEM29_LINES 严格一致；新 7=28 行 TODO 主线注册后同律）→ POEM_IDS 12 序断言 → FILLS 48 条真值汉位互证+干扰律+分布下限 → r42 结构锚（order 分支/'step' 返回/orderSorted/fillTruth/四链常量/orderChainUntil 三处/700\*SPEED）→ verify 侧锚（SPEC_FILLS/fillDisIn/oslot/SPEC_CLG_CHAIN/fillAnsHist/orderSortedN）→ 离线检查 → 教学预算 ≤16000。

## §R8 教学链与时序窗（estMs 口径；新键注册后实测复核 TODO）

- 教学分账（名义，SPEED=1）：watch 3204 + 读题链 NEXT_WIN 6486 + ghost 700 + press 320 + 判对演出 1800+1800 + 收尾 300 = **14610 ≤ 16000**（verify 实测 14958~15142 ✓）。flat0 锚题/演示/判定链零变化——仅读题链窗随全库行 max 上探。
- 新窗常量（estMs = len\*345+600 全字符口径；旧库实/估比 2424/2325≈1.04 外推）：
  - LINE_MAX=3900 ≥ 敕勒歌行1 est 3705×1.04；
  - NEXT_WIN=6486 / HEAR_WIN=6822 / FILL_WIN=7050（链=行音+150+问句+300；FILL 问句按 6 字 est 2670 取整 2700）；
  - ORDER_WIN=18600 ≥ 敕勒歌全诗链估 17355（3705+4×150+(3015+3705+3015+3015)+300）——**order 链 18.6s > 14s 方向级救援间隔 → orderChainUntil 链豁免窗**（r40 readChainUntil 同构，家族 I 扩展；rescueTick 双守卫+startLevel 重置）；
  - WRONG_CHAIN_WIN=8400 不变（≥2232+150+3720+300=6402）。
- **【TODO 实测复核·主线注册后】**：poe_q_fill/poe_q_order/新 7 诗 28 行音 clip 实长替换 est 口径（低估区：敕勒歌行1/行2 est 3705 为全库最坏；若实测 >3900 需上探 LINE_MAX 与 ORDER_WIN）。

## §R9 新语音键集定稿（30 键；文案与 game-data 一字一致）

通用 2 键：
| 键 | 文案 | estMs | 用途 |
|----|------|-------|------|
| poe_q_fill | 缺了哪个字呀 | 2670 | fill 读题链尾 [行音, poe_q_fill] |
| poe_q_order | 听一听，排出这首诗 | 3705 | order 读题链首 [poe_q_order, 4 行音] |

行音 28 键（晓晓，同旧 5 诗行音制式）：`poe_line_{yqesl,clg,yhs,jsyz,dlyy,lc,xs}_{0..3}` ×7 诗。

- 键链拼接纯函数直调断言（r37 M1）：verify ⑨ stub 对账四型链字面（next=['poe_line_yie_0','poe_q_next'] / hear=[行音,'poe_q_hear'] / fill=[行音,'poe_q_fill'] / order=['poe_q_order',四行音]）✓。
- 计数四层联动：manifest 现值 **5291（poe_ 29）→ 注册后 5321**；本 30 键在 manifest 零占用（已核）；build.py ⑪+game-verify ⑪ 过渡态断言 `n_clips==32`（poe 29+core 3）+ 双 TODO 注记（主线注册后 32→62，断言同步改）。
- 过渡态行为（r32 werden 先例）：新键未注册 → play/queue console.warn（非 pageerror），视觉/交互/判定不受影响；六门禁全在此过渡态跑绿。

## §R10 六门禁数字（2026-09-22）

| 门禁 | 结果 |
|------|------|
| ① build.py 双跑幂等 | md5 `424d8fff212b283b9b5b40b262887fcb` ×2 一致，781832 chars（改造前基线 bd7ea716…/720257） |
| ② VERIFY 双视口双跑 | 1280×800 与 800×1180 各独立完整跑：**VERIFY PASS 59/59 ×2**，layoutOk=True，pageerror 0 |
| ③ _selftest.py | verify 复跑 59/59 + flat0-19 autoSolve 全过 + fill/order 真实驱动（step,step,step,right；slotHist 1,2,3）+ 真实页教学三段（demo=right/tut=help→solo/存档 v1.0/tutSeen）|
| ④ verify_batch29.py poem 腿（12/12） | T1 59/59 / T2 存档 v1.0 / T3 静态 20 关全题对账+驱动 / T4 生成关 dch∈1-4 全现 / T5 确定性 / T6 返回值族 / T7 双错防重入 / T8 星级三档 / T9(T9b) 契约 A·K / T10 预告实算 / T11 契约 I N=8400≥6402（先例 r24：批次验证器随 SPEC 就地更新） |
| ⑤ 谱投影对照 | 见 §R11（基线=SPEC-BATCH29 §0.71 权威推导；post=引擎实测 40 关） |
| ⑥ _r42_pycheck.py | P1 Python 复刻 40 关**逐字段**==引擎实测（mulberry32 位模式级）+ P2-P7 分布/章谱/锚面/确定性 ALL GREEN |

## §R11 谱投影 baseline/post

基线（旧引擎，SPEC-BATCH29 §0.71 权威原文——旧 index.html 已覆写且项目非 git，题级旧 rng 序不可恢复，基线取设计层定值）：
- 诗库 5，flat%5 轮换，每诗见全四档；题型 2 族——ch1 next 2 候选 / ch2 next 4 候选 / ch3 hear / ch4 next+hear 混（seeded）；
- 题型占比 100% ∈ {next, hear}；AUDIT-67 实测：已背熟零挑战，会话均长 ≈18.2s。

post（新引擎实测 40 关，pycheck 逐字段验证后导出）：
- 诗库 12，flat%12 轮换（静态 20 关=12 诗全见 + 前 8 诗二次出场于更高难档）；
- 题型 4 族聚合（200 题）：next 74（37%）/ fill 33（16.5%）/ order 46（23%）/ hear 47（23.5%）；
- 生成关 20 关 dch 分布 [1×4 / 2×1 / 3×9 / 4×6]，四型全现；
- 关-诗映射表与逐关 n/f/o/h 计数：见 `_r42_pycheck.py` 可复算（gen_level 纯函数）。
- 锚面实证：flat0=yie/dch1（题0 next/prevLine0）与旧款一致；flat1-4=jys/cx/mn/dgjl 诗序一致（难度档位移由 5→12 轮换自然重排：旧 flat5=yie/dch2 → 新 flat5=yqesl/dch2）。

## §R12 风险与未验证项

1. **新 30 键 clip 实长未实测**（注册归主线）：LINE_MAX/ORDER_WIN 为 est 口径外推，§R8 TODO 标注复核点；最坏风险=敕勒歌行音实测 >3900 → 需上探两窗（纯常量改，verify ⑮ 自动拦截）。
2. 新 7 诗行表与 gen_clips.py 对账目前仅覆盖旧 5（交集对账）；新 7 待主线注册 POEM29_LINES 扩容后同律对账（build.py TODO 注记，断言自动生效）。
3. 旧引擎题级谱不可复原（非 git+源码覆写）——基线以 SPEC-BATCH29 原文为真值源，谱对照在「诗库×章型×占比」设计层完成，题级序列对照不适用（已声明）。
4. 过渡态 32 clips 交付：新题型题面在真实页有声音前，fill 挖空字音/ order 全诗朗读不可听（视觉路径完整）——主线注册后自动补全，无需游戏侧重动。

## §R13 r42 修复轮终态（2026-09-22，审查 M1+m3 收口）

- **修复来源**：REPORT-REVIEW-r42 M1（互异重掷击穿混出保底——`s=mk()` 跨族重掷，dch3 掷 order 55%/dch2 fill↔next 互变，且旧注释与 mk 实现矛盾）。主线读码核验成立后修。
- **M1 修复=族内重掷**：`specSeqOf` 重掷段改 `reroll(t)`——保 kind 只重掷行参数（hear→audioLine ri(0,3) / fill→fillLine ri(0,3) / next→prevLine ri(0,2)），保底计数恒不动；`_r42_pycheck.py` 同步复刻 + 新增 **P5b 逐关混出保底 flat0-59**（dch2 fill≥2+next≥1 / dch3 order≥2+hear≥2，含生成关——补审查覆盖缺口）。
- **m3 verify 增强（主线加固，非审查项）**：⑱ 分布断言扩三型——next/hear 答案卡位（4 卡桶 a4N=78 hist{20,18,20,20} / 2 卡桶 a2N=45 hist{32,13}）+ order 首步正确卡位（ofN=46 hist{8,17,8,13}），下界统一 ceil(n/8) 半值口径（r39-bis 铁律，防恒位不假红）；㉓ order 单元补错链断言 `[poe_wrong, poe_g_next]`（wrongChain=true 实证）。
- **文档销账**：⑪/VOICE/窗常量注释过渡态→终态（62 clips 全注入、est 复核完成：clg_1 实测 3096<3740、ORDER_WIN 实测口径 14292≤18600——**§R12 第 1 条销账**）；build.py 新 7 诗对账断言已生效（**§R12 第 2 条销账**）；§R1 诗库计数勘误 11+19→10+20（实查 gen_clips.py「诗库 10→30」）。
- **谱面变化声明**：族内重掷消耗 rnd 数与旧 mk() 不同 → 全部生成关/部分静态关题级序列变化（确定性通道与关-诗/章型映射不变）；flat0 锚面不变（P6）。
- **终态数字（修复后全链重门禁 2026-09-22）**：
  | 门禁 | 结果 |
  |------|------|
  | ① build.py 双跑幂等 | md5 `03061c01fcfa7224312829c4ba9e589b` ×2 一致，**1266685 chars**（§R10 段二注册基线 424d8fff…/781832 已被修复轮取代） |
  | ② VERIFY 双视口 | **59/59 ×2**（1280×800+800×1180），pageerror 0，⑱/㉓ 新断言实跑非空 |
  | ③ _selftest.py | 全过（REAL fill/order drive+教学三段+存档 v1.0） |
  | ④ verify_batch29.py poem 腿 | **12/12** |
  | ⑤ gate_common29.py poem PM | **3/3**（G1/G2/G3） |
  | ⑥ _r42_pycheck.py | **ALL GREEN**（P1 逐字段+P2-P7+**P5b**） |
